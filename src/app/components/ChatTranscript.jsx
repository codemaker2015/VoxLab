import React, { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { useTranscript } from '@/app/contexts/TranscriptContext';
import { GuardrailChip } from './GuardrailChip';
import AudioPlayer from './AudioPlayer';

export default function ChatTranscript({ showFunctionCalls = false }) {
  const { transcriptItems, toggleTranscriptItemExpand } = useTranscript();
  const containerRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcriptItems]);

  const sorted = [...transcriptItems].sort((a, b) => a.createdAtMs - b.createdAtMs);

  return (
    <div ref={containerRef} className="flex-1 overflow-auto px-4 sm:px-6 py-8 flex flex-col gap-6 max-w-5xl w-full mx-auto pb-4 min-h-0">
      {sorted.map(item => {
        const { itemId, type, role, data, expanded, timestamp, title = '', isHidden, guardrailResult, audioUrl } = item;
        if (isHidden) return null;
        if (type === 'BREADCRUMB' && !showFunctionCalls) return null;

        if (type === 'MESSAGE') {
          const isUser = role === 'user';
          const isBracketed = title.startsWith('[') && title.endsWith(']');
          const displayText = isBracketed ? title.slice(1, -1) : title;

          if (isUser) {
            return (
              <div key={itemId} className="flex flex-col items-end max-w-xl w-full self-end">
                <div className="flex items-center gap-2 mb-1.5 pr-1">
                  <span className="font-mono text-[11px] text-slate-400">{timestamp}</span>
                  <span className="font-mono text-xs text-slate-900 font-bold">User</span>
                  <div className="w-6 h-6 rounded-full bg-slate-900 flex items-center justify-center text-white shadow-xs">
                    <span className="material-symbols-outlined text-[14px]">mic</span>
                  </div>
                </div>
                <div className="bg-indigo-50 border border-indigo-200/90 px-5 py-3.5 rounded-2xl text-slate-900 shadow-xs">
                  <p className={`text-base font-medium ${isBracketed ? 'italic text-slate-400' : ''}`}>{displayText}</p>
                  {guardrailResult && (
                    <div className="mt-2 pt-2 border-t border-indigo-200">
                      <GuardrailChip guardrailResult={guardrailResult} />
                    </div>
                  )}
                </div>
              </div>
            );
          } else {
            return (
              <div key={itemId} className="flex flex-col items-start max-w-2xl w-full">
                <div className="flex items-center gap-2 mb-1.5 pl-1">
                  <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 shadow-xs border border-indigo-200">
                    <span className="material-symbols-outlined text-[14px]">smart_toy</span>
                  </div>
                  <span className="font-mono text-xs text-slate-900 font-bold">Assistant</span>
                  <span className="font-mono text-[11px] text-slate-400">{timestamp}</span>
                </div>
                <div className="w-full bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-200">
                  <div className={`text-base text-slate-800 leading-relaxed ${isBracketed ? 'italic text-slate-400' : ''}`}>
                    <ReactMarkdown>{displayText}</ReactMarkdown>
                  </div>
                  {audioUrl && <AudioPlayer src={audioUrl} />}
                  {guardrailResult && (
                    <div className="mt-3 pt-3 border-t border-slate-200">
                      <GuardrailChip guardrailResult={guardrailResult} />
                    </div>
                  )}
                </div>
              </div>
            );
          }
        }

        if (type === 'BREADCRUMB') {
          return (
            <div key={itemId} className="flex flex-col items-center my-2">
              <div
                className={`flex items-center gap-2 text-xs font-mono text-slate-400 ${data ? 'cursor-pointer hover:text-slate-600' : ''}`}
                onClick={() => data && toggleTranscriptItemExpand(itemId)}
              >
                {data && (
                  <span className={`transform transition-transform ${expanded ? 'rotate-90' : ''}`}>▶</span>
                )}
                <span className="bg-slate-100 border border-slate-200 px-3 py-1 rounded-full">{title}</span>
                <span className="text-[10px]">{timestamp}</span>
              </div>
              {expanded && data && (
                <pre className="mt-2 text-[11px] font-mono text-slate-600 bg-white border border-slate-200 rounded-xl p-3 max-w-lg w-full overflow-auto">
                  {JSON.stringify(data, null, 2)}
                </pre>
              )}
            </div>
          );
        }

        return null;
      })}
      <div ref={bottomRef} />
    </div>
  );
}
