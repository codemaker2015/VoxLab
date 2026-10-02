import { useRef } from "react";
import { useTranscript } from "@/app/contexts/TranscriptContext";
import { useEvent } from "@/app/contexts/EventContext";

export function useHandleSessionHistory() {
  const { transcriptItems, addTranscriptBreadcrumb, addTranscriptMessage, updateTranscriptMessage, updateTranscriptItem } = useTranscript();
  const { logServerEvent } = useEvent();

  const extractMessageText = (content = []) => {
    if (!Array.isArray(content)) return "";
    return content
      .map((c) => {
        if (!c || typeof c !== "object") return "";
        if (c.type === "input_text") return c.text ?? "";
        if (c.type === "audio" || c.type === "output_audio") return c.transcript ?? "";
        if (c.type === "output_text" || c.type === "text") return c.text ?? "";
        return "";
      })
      .filter(Boolean)
      .join("\n");
  };

  const extractFunctionCallByName = (name, content = []) => {
    if (!Array.isArray(content)) return undefined;
    return content.find((c) => c.type === 'function_call' && c.name === name);
  };

  const maybeParseJson = (val) => {
    if (typeof val === 'string') {
      try { return JSON.parse(val); } catch { return val; }
    }
    return val;
  };

  const extractLastAssistantMessage = (history = []) => {
    if (!Array.isArray(history)) return undefined;
    return history.reverse().find((c) => c.type === 'message' && c.role === 'assistant');
  };

  const extractModeration = (obj) => {
    if ('moderationCategory' in obj) return obj;
    if ('outputInfo' in obj) return extractModeration(obj.outputInfo);
    if ('output' in obj) return extractModeration(obj.output);
    if ('result' in obj) return extractModeration(obj.result);
  };

  const sketchilyDetectGuardrailMessage = (text) => {
    return text.match(/Failure Details: (\{.*?\})/)?.[1];
  };

  function handleAgentToolStart(details, _agent, functionCall) {
    const lastFunctionCall = extractFunctionCallByName(functionCall.name, details?.context?.history);
    addTranscriptBreadcrumb(`function call: ${lastFunctionCall?.name}`, lastFunctionCall?.arguments);
  }

  function handleAgentToolEnd(details, _agent, _functionCall, result) {
    const lastFunctionCall = extractFunctionCallByName(_functionCall.name, details?.context?.history);
    addTranscriptBreadcrumb(`function call result: ${lastFunctionCall?.name}`, maybeParseJson(result));
  }

  function handleHistoryAdded(item) {
    if (!item || item.type !== 'message') return;
    const { itemId, role, content = [] } = item;
    if (itemId && role) {
      const isUser = role === "user";
      let text = extractMessageText(content);
      if (isUser && !text) text = "[Transcribing...]";

      const guardrailMessage = sketchilyDetectGuardrailMessage(text);
      if (guardrailMessage) {
        const failureDetails = JSON.parse(guardrailMessage);
        addTranscriptBreadcrumb('Output Guardrail Active', { details: failureDetails });
      } else {
        addTranscriptMessage(itemId, role, text);
      }
    }
  }

  function handleHistoryUpdated(items) {
    items.forEach((item) => {
      if (!item || item.type !== 'message') return;
      const { itemId, content = [] } = item;
      const text = extractMessageText(content);
      if (text) updateTranscriptMessage(itemId, text, false);
    });
  }

  function handleTranscriptionDelta(item) {
    const itemId = item.item_id;
    const deltaText = item.delta || "";
    if (itemId) updateTranscriptMessage(itemId, deltaText, true);
  }

  function handleTranscriptionCompleted(item) {
    const itemId = item.item_id;
    const finalTranscript = (!item.transcript || item.transcript === "\n") ? "[inaudible]" : item.transcript;
    if (itemId) {
      updateTranscriptMessage(itemId, finalTranscript, false);
      const transcriptItem = transcriptItems.find((i) => i.itemId === itemId);
      updateTranscriptItem(itemId, { status: 'DONE' });
      if (transcriptItem?.guardrailResult?.status === 'IN_PROGRESS') {
        updateTranscriptItem(itemId, { guardrailResult: { status: 'DONE', category: 'NONE', rationale: '' } });
      }
    }
  }

  function handleGuardrailTripped(details, _agent, guardrail) {
    const moderation = extractModeration(guardrail.result.output.outputInfo);
    logServerEvent({ type: 'guardrail_tripped', payload: moderation });

    const lastAssistant = extractLastAssistantMessage(details?.context?.history);
    if (lastAssistant && moderation) {
      updateTranscriptItem(lastAssistant.itemId, {
        guardrailResult: {
          status: 'DONE',
          category: moderation.moderationCategory ?? 'NONE',
          rationale: moderation.moderationRationale ?? '',
          testText: moderation?.testText,
        },
      });
    }
  }

  function handleAudioReady(itemId, audioUrl) {
    if (itemId && audioUrl) {
      updateTranscriptItem(itemId, { audioUrl });
    }
  }

  const handlersRef = useRef({
    handleAgentToolStart,
    handleAgentToolEnd,
    handleHistoryUpdated,
    handleHistoryAdded,
    handleTranscriptionDelta,
    handleTranscriptionCompleted,
    handleGuardrailTripped,
    handleAudioReady,
  });

  return handlersRef;
}
