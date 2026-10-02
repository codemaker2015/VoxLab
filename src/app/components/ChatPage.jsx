import React from 'react';
import ChatTranscript from './ChatTranscript';
import ChatDock from './ChatDock';

export default function ChatPage({
  sessionStatus,
  userText, setUserText, onSendMessage,
  isPTTActive, isPTTUserSpeaking,
  handleTalkButtonDown, handleTalkButtonUp,
  showFunctionCalls,
}) {
  return (
    <div className="pt-14 flex flex-col min-h-screen bg-slate-50">
      <ChatTranscript showFunctionCalls={showFunctionCalls} />

      <ChatDock
        sessionStatus={sessionStatus}
        isPTTActive={isPTTActive}
        isPTTUserSpeaking={isPTTUserSpeaking}
        handleTalkButtonDown={handleTalkButtonDown}
        handleTalkButtonUp={handleTalkButtonUp}
        userText={userText}
        setUserText={setUserText}
        onSendMessage={onSendMessage}
      />
    </div>
  );
}
