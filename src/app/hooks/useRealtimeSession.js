import { useCallback, useRef, useState, useEffect } from 'react';
import { RealtimeSession, RealtimeAgent, OpenAIRealtimeWebRTC } from '@openai/agents/realtime';

import { applyCodecPreferences } from '../lib/codecUtils';
import { convertWebMBlobToWav } from '../lib/audioUtils';
import { useEvent } from '../contexts/EventContext';
import { useHandleSessionHistory } from './useHandleSessionHistory';

export function useRealtimeSession(callbacks = {}) {
  const sessionRef = useRef(null);
  const [status, setStatus] = useState('DISCONNECTED');
  const { logClientEvent } = useEvent();

  const updateStatus = useCallback(
    (s) => {
      setStatus(s);
      callbacks.onConnectionChange?.(s);
      logClientEvent({}, s);
    },
    [callbacks],
  );

  const { logServerEvent } = useEvent();
  const historyHandlers = useHandleSessionHistory().current;

  // captureRef holds the active recording state per bot response:
  // { recorder, chunks[], itemId, timeoutId, stopMonitor }
  const audioElementRef = useRef(null);
  const captureRef = useRef(null);

  // Monitors the bot's WebRTC output for silence.
  // Calls onSilent once 600 ms of continuous silence is detected.
  // Returns a cleanup/cancel function.
  function startSilenceMonitor(onSilent) {
    const audio = audioElementRef.current;
    if (!audio?.srcObject) return () => {};

    let ctx, rafId, silenceStart = null;
    try {
      ctx = new AudioContext();
      ctx.resume().catch(() => {});

      const src      = ctx.createMediaStreamSource(audio.srcObject);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      src.connect(analyser);

      const buf = new Float32Array(analyser.fftSize);

      const check = () => {
        analyser.getFloatTimeDomainData(buf);
        const rms = Math.sqrt(buf.reduce((s, v) => s + v * v, 0) / buf.length);

        if (rms < 0.004) {                             // effectively silent
          silenceStart ??= Date.now();
          if (Date.now() - silenceStart > 600) {       // 600 ms sustained silence
            ctx.close();
            onSilent();
            return;
          }
        } else {
          silenceStart = null;
        }
        rafId = requestAnimationFrame(check);
      };
      rafId = requestAnimationFrame(check);
    } catch (err) {
      console.warn('[SilenceMonitor] AudioContext error:', err);
    }

    return () => {
      cancelAnimationFrame(rafId);
      ctx?.close().catch(() => {});
    };
  }

  // Stops & finalizes the current capture, converts to WAV, and attaches the URL.
  function finalizeCapture() {
    const capture = captureRef.current;
    if (!capture) return;
    captureRef.current = null;

    clearTimeout(capture.timeoutId);
    capture.stopMonitor?.();

    const { recorder, chunks, itemId } = capture;
    if (!itemId || recorder.state === 'inactive') return;

    recorder.onstop = async () => {
      if (chunks.length === 0) return;
      try {
        const blob    = new Blob(chunks, { type: 'audio/webm' });
        const wavBlob = await convertWebMBlobToWav(blob);
        historyHandlers.handleAudioReady(itemId, URL.createObjectURL(wavBlob));
      } catch (err) {
        console.warn('[AudioCapture] Failed to process audio:', err);
      }
    };
    recorder.stop();
  }

  function handleTransportEvent(event) {
    switch (event.type) {
      case "conversation.item.input_audio_transcription.completed":
        historyHandlers.handleTranscriptionCompleted(event);
        break;

      case "response.output_audio_transcript.done":
        historyHandlers.handleTranscriptionCompleted(event);
        break;

      case "response.output_audio_transcript.delta":
        historyHandlers.handleTranscriptionDelta(event);
        break;

      // ── Recording: start ──────────────────────────────────────────────────
      case "response.created": {
        // Finalize any previous response's recording before starting a new one
        finalizeCapture();

        const srcObject = audioElementRef.current?.srcObject;
        if (!srcObject) break;
        try {
          const chunks  = [];
          const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
            ? 'audio/webm;codecs=opus'
            : 'audio/webm';
          const recorder = new MediaRecorder(srcObject, { mimeType });
          // 100 ms timeslice: accumulate chunks continuously during recording
          recorder.ondataavailable = (e) => { if (e.data?.size > 0) chunks.push(e.data); };
          recorder.start(100);
          captureRef.current = { recorder, chunks, itemId: null, timeoutId: null, stopMonitor: null };
        } catch (err) {
          console.warn('[AudioCapture] MediaRecorder start failed:', err);
        }
        break;
      }

      // ── Recording: arm silence detector once API is done sending ─────────
      case "response.done": {
        const outputItem = event.response?.output?.find(
          (o) => o.type === 'message' && o.role === 'assistant',
        );
        const itemId = outputItem?.id;
        if (!itemId || !captureRef.current) break;

        captureRef.current.itemId = itemId;

        // Monitor the output audio for sustained silence →
        // this fires once the bot actually finishes speaking.
        let stopMonitor;
        const fallback = setTimeout(() => {
          stopMonitor?.();
          finalizeCapture();
        }, 30_000); // safety net: 30 s absolute max

        stopMonitor = startSilenceMonitor(() => {
          clearTimeout(fallback);
          // Small 400 ms buffer after silence so we don't clip a trailing syllable
          if (captureRef.current) {
            captureRef.current.timeoutId = setTimeout(finalizeCapture, 400);
          }
        });

        captureRef.current.timeoutId  = fallback;
        captureRef.current.stopMonitor = stopMonitor;
        break;
      }

      default:
        logServerEvent(event);
        break;
    }
  }

  const codecParamRef = useRef(
    (new URLSearchParams(window.location.search).get('codec') ?? 'opus').toLowerCase(),
  );

  const applyCodec = useCallback(
    (pc) => applyCodecPreferences(pc, codecParamRef.current),
    [],
  );

  const handleAgentHandoff = (item) => {
    const history = item.context.history;
    const lastMessage = history[history.length - 1];
    const agentName = lastMessage.name.split("transfer_to_")[1];
    callbacks.onAgentHandoff?.(agentName);
  };

  useEffect(() => {
    if (sessionRef.current) {
      sessionRef.current.on("error", (...args) => {
        logServerEvent({ type: "error", message: args[0] });
      });

      sessionRef.current.on("agent_handoff", handleAgentHandoff);
      sessionRef.current.on("agent_tool_start", historyHandlers.handleAgentToolStart);
      sessionRef.current.on("agent_tool_end", historyHandlers.handleAgentToolEnd);
      sessionRef.current.on("history_updated", historyHandlers.handleHistoryUpdated);
      sessionRef.current.on("history_added", historyHandlers.handleHistoryAdded);
      sessionRef.current.on("guardrail_tripped", historyHandlers.handleGuardrailTripped);
      sessionRef.current.on("transport_event", handleTransportEvent);
    }
  }, [sessionRef.current]);

  const connect = useCallback(
    async ({ getEphemeralKey, initialAgents, audioElement, extraContext, outputGuardrails, language = 'en' }) => {
      if (sessionRef.current) return;

      updateStatus('CONNECTING');

      audioElementRef.current = audioElement;
      const ek       = await getEphemeralKey();
      const rootAgent = initialAgents[0];

      sessionRef.current = new RealtimeSession(rootAgent, {
        transport: new OpenAIRealtimeWebRTC({
          audioElement,
          baseUrl: 'http://localhost:5173/api/realtime?model=gpt-realtime-2.1',
          changePeerConnection: async (pc) => {
            applyCodec(pc);
            return pc;
          },
        }),
        model: 'gpt-realtime-2.1',
        config: {
          inputAudioTranscription: {
            model: 'whisper-1',
            language,
          },
        },
        outputGuardrails: outputGuardrails ?? [],
        context: extraContext ?? {},
      });

      try {
        await sessionRef.current.connect({ apiKey: ek });
        updateStatus('CONNECTED');
      } catch (err) {
        sessionRef.current = null;
        throw err;
      }
    },
    [callbacks, updateStatus],
  );

  const disconnect = useCallback(() => {
    finalizeCapture();
    sessionRef.current?.close();
    sessionRef.current = null;
    updateStatus('DISCONNECTED');
  }, [updateStatus]);

  const assertconnected = () => {
    if (!sessionRef.current) throw new Error('RealtimeSession not connected');
  };

  const interrupt = useCallback(() => {
    sessionRef.current?.interrupt();
  }, []);

  const sendUserText = useCallback((text) => {
    assertconnected();
    sessionRef.current.sendMessage(text);
  }, []);

  const sendEvent = useCallback((ev) => {
    sessionRef.current?.transport.sendEvent(ev);
  }, []);

  const mute = useCallback((m) => {
    sessionRef.current?.mute(m);
  }, []);

  const pushToTalkStart = useCallback(() => {
    if (!sessionRef.current) return;
    sessionRef.current.transport.sendEvent({ type: 'input_audio_buffer.clear' });
  }, []);

  const pushToTalkStop = useCallback(() => {
    if (!sessionRef.current) return;
    sessionRef.current.transport.sendEvent({ type: 'input_audio_buffer.commit' });
    sessionRef.current.transport.sendEvent({ type: 'response.create' });
  }, []);

  return { status, connect, disconnect, sendUserText, sendEvent, mute, pushToTalkStart, pushToTalkStop, interrupt };
}
