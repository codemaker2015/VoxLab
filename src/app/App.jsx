import React, { useEffect, useRef, useState, useMemo } from "react";
import { v4 as uuidv4 } from "uuid";

import AppHeader from "./components/AppHeader";
import ChatPage from "./components/ChatPage";
import SettingsPage from "./components/SettingsPage";

import { useTranscript } from "@/app/contexts/TranscriptContext";
import { useEvent } from "@/app/contexts/EventContext";
import { useRealtimeSession } from "./hooks/useRealtimeSession";
import { createModerationGuardrail } from "@/app/agentConfigs/guardrails";

import { allAgentSets, defaultAgentSetKey } from "@/app/agentConfigs";
import { customerServiceRetailScenario } from "@/app/agentConfigs/customerServiceRetail";
import { chatSupervisorScenario } from "@/app/agentConfigs/chatSupervisor";
import { customerServiceRetailCompanyName } from "@/app/agentConfigs/customerServiceRetail";
import { chatSupervisorCompanyName } from "@/app/agentConfigs/chatSupervisor";
import { simpleHandoffScenario } from "@/app/agentConfigs/simpleHandoff";

const sdkScenarioMap = {
  simpleHandoff: simpleHandoffScenario,
  customerServiceRetail: customerServiceRetailScenario,
  chatSupervisor: chatSupervisorScenario,
};

import useAudioDownload from "./hooks/useAudioDownload";
import { useHandleSessionHistory } from "./hooks/useHandleSessionHistory";

function App() {
  const searchParams = useMemo(() => new URLSearchParams(window.location.search), []);

  const urlCodec = searchParams.get("codec") || "opus";

  const { addTranscriptMessage, addTranscriptBreadcrumb } = useTranscript();
  const { logClientEvent, logServerEvent } = useEvent();

  const [selectedAgentName, setSelectedAgentName] = useState("");
  const [selectedAgentConfigSet, setSelectedAgentConfigSet] = useState(null);

  const audioElementRef = useRef(null);
  const handoffTriggeredRef = useRef(false);

  const sdkAudioElement = useMemo(() => {
    const el = document.createElement('audio');
    el.autoplay = true;
    el.style.display = 'none';
    document.body.appendChild(el);
    return el;
  }, []);

  useEffect(() => {
    if (sdkAudioElement && !audioElementRef.current) {
      audioElementRef.current = sdkAudioElement;
    }
  }, [sdkAudioElement]);

  const { connect, disconnect, sendUserText, sendEvent, interrupt, mute } = useRealtimeSession({
    onConnectionChange: (s) => setSessionStatus(s),
    onAgentHandoff: (agentName) => {
      handoffTriggeredRef.current = true;
      setSelectedAgentName(agentName);
    },
  });

  const [sessionStatus, setSessionStatus] = useState("DISCONNECTED");
  const [activePage, setActivePage] = useState('chat');
  const [isEventsPaneExpanded, setIsEventsPaneExpanded] = useState(true);
  const [showFunctionCalls, setShowFunctionCalls] = useState(() => {
    const stored = localStorage.getItem('showFunctionCalls');
    return stored ? stored === 'true' : false;
  });
  const [selectedLanguage, setSelectedLanguage] = useState(() => {
    return localStorage.getItem('selectedLanguage') || 'en';
  });
  const [userText, setUserText] = useState("");
  const [isPTTActive, setIsPTTActive] = useState(false);
  const [isPTTUserSpeaking, setIsPTTUserSpeaking] = useState(false);
  const [isAudioPlaybackEnabled, setIsAudioPlaybackEnabled] = useState(() => {
    const stored = localStorage.getItem('audioPlaybackEnabled');
    return stored ? stored === 'true' : true;
  });

  const { startRecording, stopRecording, downloadRecording } = useAudioDownload();

  const sendClientEvent = (eventObj, eventNameSuffix = "") => {
    try {
      sendEvent(eventObj);
      logClientEvent(eventObj, eventNameSuffix);
    } catch (err) {
      console.error('Failed to send via SDK', err);
    }
  };

  useHandleSessionHistory();

  useEffect(() => {
    let finalAgentConfig = searchParams.get("agentConfig");
    if (!finalAgentConfig || !allAgentSets[finalAgentConfig]) {
      finalAgentConfig = defaultAgentSetKey;
      const url = new URL(window.location.toString());
      url.searchParams.set("agentConfig", finalAgentConfig);
      window.location.replace(url.toString());
      return;
    }

    const agents = allAgentSets[finalAgentConfig];
    const agentKeyToUse = agents[0]?.name || "";
    setSelectedAgentName(agentKeyToUse);
    setSelectedAgentConfigSet(agents);
  }, [searchParams]);

  useEffect(() => {
    if (selectedAgentName && sessionStatus === "DISCONNECTED") {
      connectToRealtime();
    }
  }, [selectedAgentName]);

  useEffect(() => {
    if (sessionStatus === "CONNECTED" && selectedAgentConfigSet && selectedAgentName) {
      const currentAgent = selectedAgentConfigSet.find((a) => a.name === selectedAgentName);
      addTranscriptBreadcrumb(`Agent: ${selectedAgentName}`, currentAgent);
      updateSession(!handoffTriggeredRef.current);
      handoffTriggeredRef.current = false;
    }
  }, [selectedAgentConfigSet, selectedAgentName, sessionStatus]);

  useEffect(() => {
    if (sessionStatus === "CONNECTED") {
      updateSession();
    }
  }, [isPTTActive]);

  useEffect(() => {
    if (sessionStatus === "CONNECTED") {
      updateSession();
    }
  }, [selectedLanguage]);

  const fetchEphemeralKey = async () => {
    logClientEvent({ url: "/session" }, "fetch_session_token_request");
    const tokenResponse = await fetch("/api/session");
    const data = await tokenResponse.json();
    logServerEvent(data, "fetch_session_token_response");

    if (!data.client_secret?.value) {
      logClientEvent(data, "error.no_ephemeral_key");
      console.error("No ephemeral key provided by the server");
      setSessionStatus("DISCONNECTED");
      return null;
    }

    return data.client_secret.value;
  };

  const connectToRealtime = async () => {
    const agentSetKey = searchParams.get("agentConfig") || "default";
    if (sdkScenarioMap[agentSetKey]) {
      if (sessionStatus !== "DISCONNECTED") return;
      setSessionStatus("CONNECTING");

      try {
        const EPHEMERAL_KEY = await fetchEphemeralKey();
        if (!EPHEMERAL_KEY) return;

        const reorderedAgents = [...sdkScenarioMap[agentSetKey]];
        const idx = reorderedAgents.findIndex((a) => a.name === selectedAgentName);
        if (idx > 0) {
          const [agent] = reorderedAgents.splice(idx, 1);
          reorderedAgents.unshift(agent);
        }

        const companyName = agentSetKey === 'customerServiceRetail'
          ? customerServiceRetailCompanyName
          : chatSupervisorCompanyName;
        const guardrail = createModerationGuardrail(companyName);

        await connect({
          getEphemeralKey: async () => EPHEMERAL_KEY,
          initialAgents: reorderedAgents,
          audioElement: sdkAudioElement,
          outputGuardrails: [guardrail],
          extraContext: { addTranscriptBreadcrumb },
          language: selectedLanguage,
        });
      } catch (err) {
        console.error("Error connecting via SDK:", err);
        setSessionStatus("DISCONNECTED");
      }
    }
  };

  const disconnectFromRealtime = () => {
    disconnect();
    setSessionStatus("DISCONNECTED");
    setIsPTTUserSpeaking(false);
  };

  const sendSimulatedUserMessage = (text) => {
    const id = uuidv4().slice(0, 32);
    addTranscriptMessage(id, "user", text, true);
    sendClientEvent({
      type: 'conversation.item.create',
      item: { id, type: 'message', role: 'user', content: [{ type: 'input_text', text }] },
    });
    sendClientEvent({ type: 'response.create' }, '(simulated user text message)');
  };

  const LANGUAGE_INSTRUCTIONS = {
    en: 'Always respond in English, regardless of what language the user speaks.',
    ja: 'CRITICAL: You MUST always respond in Japanese (日本語). This applies regardless of what language the user speaks. All your responses must be entirely in Japanese. すべての返答を必ず日本語で行ってください。',
  };

  const updateSession = (shouldTriggerResponse = false) => {
    const turnDetection = isPTTActive
      ? null
      : { type: 'server_vad', threshold: 0.9, prefix_padding_ms: 300, silence_duration_ms: 500, create_response: true };

    const currentAgent = selectedAgentConfigSet?.find((a) => a.name === selectedAgentName);
    const baseInstructions = typeof currentAgent?.instructions === 'string' ? currentAgent.instructions : null;
    const langInstruction = LANGUAGE_INSTRUCTIONS[selectedLanguage] ?? LANGUAGE_INSTRUCTIONS.en;

    const sessionPayload = {
      type: 'realtime',
      audio: { input: { turn_detection: turnDetection } },
      input_audio_transcription: { model: 'whisper-1', language: selectedLanguage },
    };

    if (baseInstructions) {
      sessionPayload.instructions = `${baseInstructions}\n\n${langInstruction}`;
    }

    sendEvent({ type: 'session.update', session: sessionPayload });

    if (shouldTriggerResponse) {
      sendSimulatedUserMessage('hi');
    }
  };

  const handleSendTextMessage = () => {
    if (!userText.trim()) return;
    interrupt();
    try {
      sendUserText(userText.trim());
    } catch (err) {
      console.error('Failed to send via SDK', err);
    }
    setUserText("");
  };

  const handleTalkButtonDown = () => {
    if (sessionStatus !== 'CONNECTED') return;
    interrupt();
    setIsPTTUserSpeaking(true);
    sendClientEvent({ type: 'input_audio_buffer.clear' }, 'clear PTT buffer');
  };

  const handleTalkButtonUp = () => {
    if (sessionStatus !== 'CONNECTED' || !isPTTUserSpeaking) return;
    setIsPTTUserSpeaking(false);
    sendClientEvent({ type: 'input_audio_buffer.commit' }, 'commit PTT');
    sendClientEvent({ type: 'response.create' }, 'trigger response PTT');
  };

  const onToggleConnection = () => {
    if (sessionStatus === "CONNECTED" || sessionStatus === "CONNECTING") {
      disconnectFromRealtime();
      setSessionStatus("DISCONNECTED");
    } else {
      connectToRealtime();
    }
  };

  const handleAgentChange = (e) => {
    const url = new URL(window.location.toString());
    url.searchParams.set("agentConfig", e.target.value);
    window.location.replace(url.toString());
  };

  const handleSelectedAgentChange = (e) => {
    disconnectFromRealtime();
    setSelectedAgentName(e.target.value);
  };

  const handleCodecChange = (newCodec) => {
    const url = new URL(window.location.toString());
    url.searchParams.set("codec", newCodec);
    window.location.replace(url.toString());
  };

  useEffect(() => {
    const storedPTT = localStorage.getItem("pushToTalkUI");
    if (storedPTT) setIsPTTActive(storedPTT === "true");
    const storedLogs = localStorage.getItem("logsExpanded");
    if (storedLogs) setIsEventsPaneExpanded(storedLogs === "true");
    const storedAudio = localStorage.getItem("audioPlaybackEnabled");
    if (storedAudio) setIsAudioPlaybackEnabled(storedAudio === "true");
  }, []);

  useEffect(() => { localStorage.setItem("pushToTalkUI", isPTTActive.toString()); }, [isPTTActive]);
  useEffect(() => { localStorage.setItem("logsExpanded", isEventsPaneExpanded.toString()); }, [isEventsPaneExpanded]);
  useEffect(() => { localStorage.setItem("audioPlaybackEnabled", isAudioPlaybackEnabled.toString()); }, [isAudioPlaybackEnabled]);
  useEffect(() => { localStorage.setItem("showFunctionCalls", showFunctionCalls.toString()); }, [showFunctionCalls]);
  useEffect(() => { localStorage.setItem("selectedLanguage", selectedLanguage); }, [selectedLanguage]);

  useEffect(() => {
    if (audioElementRef.current) {
      if (isAudioPlaybackEnabled) {
        audioElementRef.current.muted = false;
        audioElementRef.current.play().catch((err) => console.warn("Autoplay blocked:", err));
      } else {
        audioElementRef.current.muted = true;
      }
    }
    // NOTE: do NOT call mute() from SDK here — that mutes the microphone input, not the speaker
  }, [isAudioPlaybackEnabled]);

  useEffect(() => {
    if (sessionStatus === "CONNECTED" && audioElementRef.current?.srcObject) {
      startRecording(audioElementRef.current.srcObject);
    }
    return () => { stopRecording(); };
  }, [sessionStatus]);

  const agentSetKey = searchParams.get("agentConfig") || "default";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased flex flex-col">
      <AppHeader
        sessionStatus={sessionStatus}
        activePage={activePage}
        setActivePage={setActivePage}
        downloadRecording={downloadRecording}
        onToggleConnection={onToggleConnection}
        agentSetKey={agentSetKey}
        selectedAgentName={selectedAgentName}
      />
      {activePage === 'chat' ? (
        <ChatPage
          sessionStatus={sessionStatus}
          userText={userText}
          setUserText={setUserText}
          onSendMessage={handleSendTextMessage}
          isPTTActive={isPTTActive}
          isPTTUserSpeaking={isPTTUserSpeaking}
          handleTalkButtonDown={handleTalkButtonDown}
          handleTalkButtonUp={handleTalkButtonUp}
          showFunctionCalls={showFunctionCalls}
        />
      ) : (
        <SettingsPage
          agentSetKey={agentSetKey}
          handleAgentChange={handleAgentChange}
          selectedAgentName={selectedAgentName}
          handleSelectedAgentChange={handleSelectedAgentChange}
          selectedAgentConfigSet={selectedAgentConfigSet}
          isPTTActive={isPTTActive}
          setIsPTTActive={setIsPTTActive}
          isAudioPlaybackEnabled={isAudioPlaybackEnabled}
          setIsAudioPlaybackEnabled={setIsAudioPlaybackEnabled}
          codec={urlCodec}
          onCodecChange={handleCodecChange}
          isEventsPaneExpanded={isEventsPaneExpanded}
          setIsEventsPaneExpanded={setIsEventsPaneExpanded}
          sessionStatus={sessionStatus}
          setActivePage={setActivePage}
          showFunctionCalls={showFunctionCalls}
          setShowFunctionCalls={setShowFunctionCalls}
          selectedLanguage={selectedLanguage}
          setSelectedLanguage={setSelectedLanguage}
        />
      )}
    </div>
  );
}

export default App;
