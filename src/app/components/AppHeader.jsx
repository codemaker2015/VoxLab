import React from 'react';
import { useTranscript } from '@/app/contexts/TranscriptContext';

export default function AppHeader({ sessionStatus, activePage, setActivePage, downloadRecording, onToggleConnection, agentSetKey, selectedAgentName }) {
  const isConnected = sessionStatus === 'CONNECTED';
  const isConnecting = sessionStatus === 'CONNECTING';
  const { transcriptItems } = useTranscript();

  const handleCopyTranscript = async () => {
    const texts = transcriptItems
      .filter(i => i.type === 'MESSAGE' && !i.isHidden)
      .map(i => `${i.role === 'user' ? 'User' : 'Assistant'}: ${i.title}`)
      .join('\n\n');
    await navigator.clipboard.writeText(texts).catch(() => {});
  };

  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-white/90 backdrop-blur-md border-b border-slate-200">
      <div className="h-14 w-full px-4 sm:px-6 flex items-center justify-between gap-3">

        {/* Left: Icon + stacked title/subtitle + status badge + session info */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <img src="/icon.svg" alt="VoxLab" className="w-8 h-8 shrink-0 rounded-xl" />
          <div className="flex flex-col leading-none select-none">
            <span className="font-headline text-sm text-slate-900 tracking-tight font-bold whitespace-nowrap">VoxLab</span>
            <span className="font-mono text-[10px] text-slate-400 whitespace-nowrap mt-0.5">Realtime Voice Agent Studio</span>
          </div>
          <div className="h-4 w-px bg-slate-200 hidden sm:block shrink-0" />

          {/* Clickable status badge */}
          <button
            onClick={onToggleConnection}
            disabled={isConnecting}
            title={isConnected ? 'Click to disconnect' : 'Click to connect'}
            className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border font-mono text-[10px] font-semibold uppercase tracking-wider transition-all cursor-pointer disabled:cursor-not-allowed shrink-0
              ${isConnected
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700'
                : isConnecting
                ? 'bg-amber-50 border-amber-200 text-amber-700'
                : 'bg-slate-100 border-slate-200 text-slate-500 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700'}`}
          >
            {isConnected && (
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600" />
              </span>
            )}
            {isConnecting && <span className="relative flex h-2 w-2 shrink-0"><span className="animate-pulse inline-flex rounded-full h-2 w-2 bg-amber-500" /></span>}
            {!isConnected && !isConnecting && <span className="inline-flex rounded-full h-2 w-2 bg-slate-400 shrink-0" />}
            <span>{isConnected ? 'Connected' : isConnecting ? 'Connecting...' : 'Disconnected'}</span>
          </button>

          {/* Session path — shown when connected */}
          {isConnected && agentSetKey && (
            <div className="hidden lg:flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg min-w-0">
              <span className="material-symbols-outlined text-indigo-600 text-[15px] shrink-0">spatial_audio_off</span>
              <span className="font-mono text-[11px] text-slate-700 truncate">
                session://<span className="text-indigo-600 font-semibold">{agentSetKey}</span>/<span className="text-teal-700 font-medium">{selectedAgentName || '...'}</span>
              </span>
            </div>
          )}

        </div>

        {/* Center: Tab nav */}
        <nav className="flex items-center p-0.5 rounded-lg bg-slate-100 border border-slate-200/80 shrink-0">
          <button
            onClick={() => setActivePage('chat')}
            className={`px-3 py-1 rounded-md font-medium text-xs sm:text-sm transition-all ${activePage === 'chat' ? 'bg-white text-slate-900 shadow-xs border border-slate-200 font-semibold' : 'text-slate-600 hover:text-slate-900'}`}
          >Chat</button>
          <button
            onClick={() => setActivePage('settings')}
            className={`px-3 py-1 rounded-md font-medium text-xs sm:text-sm transition-all ${activePage === 'settings' ? 'bg-white text-slate-900 shadow-xs border border-slate-200 font-semibold' : 'text-slate-600 hover:text-slate-900'}`}
          >Settings</button>
        </nav>

        {/* Right: Copy + Download */}
        <div className="hidden md:flex items-center gap-1 shrink-0">
          <button
            onClick={handleCopyTranscript}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-xs transition-all font-mono text-xs"
          >
            <span className="material-symbols-outlined text-[15px] text-slate-500">content_copy</span>
            <span>Copy</span>
          </button>
          <button
            onClick={downloadRecording}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-xs transition-all font-mono text-xs"
          >
            <span className="material-symbols-outlined text-[15px] text-slate-500">file_download_done</span>
            <span>Audio</span>
          </button>
        </div>

      </div>
    </header>
  );
}
