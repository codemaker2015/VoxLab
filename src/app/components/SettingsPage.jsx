import React, { useState } from 'react';
import Events from './Events';
import { allAgentSets } from '@/app/agentConfigs';

const LANGUAGES = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'ja', label: 'Japanese', native: '日本語' },
];

export default function SettingsPage({
  agentSetKey, handleAgentChange,
  selectedAgentName, handleSelectedAgentChange, selectedAgentConfigSet,
  isPTTActive, setIsPTTActive,
  isAudioPlaybackEnabled, setIsAudioPlaybackEnabled,
  codec, onCodecChange,
  isEventsPaneExpanded, setIsEventsPaneExpanded,
  sessionStatus, setActivePage,
  showFunctionCalls, setShowFunctionCalls,
  selectedLanguage, setSelectedLanguage,
}) {
  const [activeTab, setActiveTab] = useState('agent');
  const isConnected = sessionStatus === 'CONNECTED';

  const tabs = [
    { id: 'agent', label: 'Agent & Scenarios', icon: 'psychology' },
    { id: 'audio', label: 'Audio & Codec', icon: 'graphic_eq' },
    { id: 'logs', label: 'Logs & Events', icon: 'receipt_long' },
  ];

  return (
    <div className="pt-14 min-h-screen bg-slate-50">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 max-w-5xl mx-auto flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <span className="material-symbols-outlined text-[22px]">tune</span>
            </div>
            <div>
              <p className="font-mono text-[10px] font-semibold text-indigo-600 uppercase tracking-widest">Configuration</p>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">Agent Runtime & Audio Pipeline</h1>
            </div>
          </div>
          <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-mono text-xs font-semibold
            ${isConnected ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-100 border-slate-200 text-slate-500'}`}>
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
            <span>{isConnected ? 'Session Active' : 'No Active Session'}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border transition-all text-xs font-medium whitespace-nowrap
                ${activeTab === tab.id
                  ? 'bg-white border-indigo-200 text-indigo-700 font-semibold shadow-sm'
                  : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300'}`}
            >
              <span className={`material-symbols-outlined text-[18px] ${activeTab === tab.id ? 'text-indigo-600' : 'text-slate-500'}`}>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {activeTab === 'agent' && (
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col gap-5">
            <div className="border-b border-slate-100 pb-4">
              <p className="font-mono text-[10px] font-semibold text-indigo-600 uppercase tracking-wider">Supervision & Policy Matrix</p>
              <h3 className="text-base font-bold text-slate-900 mt-0.5">Agent Routing & Scenario</h3>
              <p className="text-xs text-slate-500 mt-0.5">Select the active scenario and starting agent for your realtime session.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">Routing Scenario</label>
                <div className="relative mt-1">
                  <select
                    value={agentSetKey}
                    onChange={handleAgentChange}
                    className="w-full bg-white text-slate-800 font-medium text-xs py-2 px-3 rounded-lg border border-slate-300 appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all cursor-pointer shadow-xs"
                  >
                    {Object.keys(allAgentSets).map(key => (
                      <option key={key} value={key}>{key}</option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined absolute right-2.5 top-2 text-[18px] text-slate-400 pointer-events-none">expand_more</span>
                </div>
              </div>
              {selectedAgentConfigSet && (
                <div className="flex flex-col gap-1.5 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">Starting Agent</label>
                  <div className="relative mt-1">
                    <select
                      value={selectedAgentName}
                      onChange={handleSelectedAgentChange}
                      className="w-full bg-white text-slate-800 font-medium text-xs py-2 px-3 rounded-lg border border-slate-300 appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all cursor-pointer shadow-xs"
                    >
                      {selectedAgentConfigSet.map(agent => (
                        <option key={agent.name} value={agent.name}>{agent.name}</option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined absolute right-2.5 top-2 text-[18px] text-slate-400 pointer-events-none">expand_more</span>
                  </div>
                </div>
              )}
            </div>
            <div className="border-t border-slate-100 pt-4 mt-1">
              <p className="font-mono text-[10px] font-semibold text-indigo-600 uppercase tracking-wider mb-3">Language</p>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-slate-900">Session Language</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Affects speech transcription and bot response language</p>
                </div>
                <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-xs flex-wrap">
                  {LANGUAGES.map(lang => (
                    <button
                      key={lang.code}
                      onClick={() => setSelectedLanguage(lang.code)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap
                        ${selectedLanguage === lang.code
                          ? 'text-indigo-700 bg-indigo-50 border border-indigo-200 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      {lang.native}
                      {selectedLanguage === lang.code && (
                        <span className="ml-1.5 font-mono text-[10px] text-indigo-500 opacity-80">{lang.label}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4 mt-1">
              <p className="font-mono text-[10px] font-semibold text-indigo-600 uppercase tracking-wider mb-3">Chat Display</p>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-900">Show Agent Activity</p>
                  <p className="font-mono text-[10px] text-slate-500 mt-0.5">Show agent changes and function call breadcrumbs in chat</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={showFunctionCalls}
                    onChange={(e) => setShowFunctionCalls(e.target.checked)}
                  />
                  <div className="w-10 h-5 bg-slate-200 rounded-full peer peer-checked:bg-indigo-600 transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5 after:border after:border-slate-300" />
                </label>
              </div>
            </div>

            <div className="bg-indigo-50/70 border border-indigo-200/80 px-4 py-3 rounded-xl">
              <p className="text-xs text-indigo-900">
                <span className="font-semibold">Note:</span> Changing scenario reconnects the session. The agent will greet you automatically.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'audio' && (
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col gap-5">
            <div className="border-b border-slate-100 pb-4">
              <p className="font-mono text-[10px] font-semibold text-indigo-600 uppercase tracking-wider">Acoustic Pipeline & DSP</p>
              <h3 className="text-base font-bold text-slate-900 mt-0.5">Audio Codec & Input Mode</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">Stream Audio Codec</label>
                <div className="relative mt-1">
                  <select
                    value={codec}
                    onChange={(e) => onCodecChange(e.target.value)}
                    className="w-full bg-white text-slate-800 font-medium text-xs py-2 px-3 rounded-lg border border-slate-300 appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all cursor-pointer shadow-xs"
                  >
                    <option value="opus">Opus (48 kHz) — Ultra Low Bandwidth</option>
                    <option value="pcmu">PCMU (8 kHz) — Legacy Carrier</option>
                    <option value="pcma">PCMA (8 kHz) — Legacy Carrier</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-2.5 top-2 text-[18px] text-slate-400 pointer-events-none">expand_more</span>
                </div>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-900">Audio Playback</p>
                  <p className="font-mono text-[10px] text-slate-500">Auto-stream agent responses</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={isAudioPlaybackEnabled}
                    onChange={(e) => setIsAudioPlaybackEnabled(e.target.checked)}
                  />
                  <div className="w-10 h-5 bg-slate-200 rounded-full peer peer-checked:bg-indigo-600 transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5 after:border after:border-slate-300" />
                </label>
              </div>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-slate-900">Voice Activity Detection (VAD)</p>
                <p className="text-[11px] text-slate-500">Server VAD auto-detects speech. Push-to-Talk requires manual mic trigger.</p>
              </div>
              <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-xs">
                <button
                  onClick={() => setIsPTTActive(false)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${!isPTTActive ? 'text-indigo-700 bg-indigo-50 border border-indigo-200 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                >Server VAD</button>
                <button
                  onClick={() => setIsPTTActive(true)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${isPTTActive ? 'text-indigo-700 bg-indigo-50 border border-indigo-200 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                >Push to Talk</button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <p className="font-mono text-[10px] font-semibold text-indigo-600 uppercase tracking-wider">Diagnostics & Inspector</p>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">Event Logs</h3>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-xs text-slate-600 font-medium">Show logs</span>
                <input
                  type="checkbox"
                  checked={isEventsPaneExpanded}
                  onChange={(e) => setIsEventsPaneExpanded(e.target.checked)}
                  className="w-4 h-4 accent-indigo-600"
                />
              </label>
            </div>
            <div className="max-h-[60vh] overflow-auto">
              <Events isExpanded={isEventsPaneExpanded} />
            </div>
          </div>
        )}

        <div className="flex justify-start">
          <button
            onClick={() => setActivePage('chat')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-xs transition-colors shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            <span>Back to Chat</span>
          </button>
        </div>
      </div>
    </div>
  );
}
