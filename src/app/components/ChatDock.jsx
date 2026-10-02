import React, { useRef, useEffect } from 'react';

export default function ChatDock({
  sessionStatus,
  isPTTActive, isPTTUserSpeaking,
  handleTalkButtonDown, handleTalkButtonUp,
  userText, setUserText, onSendMessage,
}) {
  const isConnected = sessionStatus === 'CONNECTED';
  const inputRef = useRef(null);

  useEffect(() => {
    if (isConnected && inputRef.current) inputRef.current.focus();
  }, [isConnected]);

  return (
    <footer className="sticky bottom-0 left-0 w-full bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-xl p-3 sm:p-4 z-40">
      <div className="max-w-5xl mx-auto">
        <div className="relative flex items-center bg-slate-50 rounded-2xl border border-slate-200 p-1.5 shadow-inner focus-within:border-indigo-400 focus-within:bg-white transition-all">
          {/* Mic activity indicator */}
          <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-indigo-600 shrink-0 ml-0.5">
            <span className="material-symbols-outlined text-[20px]">graphic_eq</span>
          </div>

          {/* Text input */}
          <input
            ref={inputRef}
            type="text"
            value={userText}
            onChange={(e) => setUserText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && isConnected) { e.preventDefault(); onSendMessage(); } }}
            disabled={!isConnected}
            placeholder={isConnected ? 'Type a message...' : 'Connect to start chatting...'}
            className="flex-1 bg-transparent border-0 px-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0 disabled:text-slate-400"
          />

          {/* PTT mic button — only visible in Push-to-Talk mode */}
          {isPTTActive && (
            <button
              onMouseDown={handleTalkButtonDown}
              onMouseUp={handleTalkButtonUp}
              onTouchStart={handleTalkButtonDown}
              onTouchEnd={handleTalkButtonUp}
              disabled={!isConnected}
              title="Push to Talk (hold)"
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all shadow-xs shrink-0 disabled:opacity-40 mr-1
                ${isPTTUserSpeaking
                  ? 'bg-emerald-500 text-white scale-95'
                  : 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'}`}
            >
              <span className="material-symbols-outlined text-[18px]">mic</span>
            </button>
          )}

          {/* Send button */}
          <button
            onClick={onSendMessage}
            disabled={!isConnected || !userText.trim()}
            className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 active:scale-95 transition-all shadow-xs shrink-0 mr-0.5 disabled:opacity-40"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_upward</span>
          </button>
        </div>
      </div>
    </footer>
  );
}
