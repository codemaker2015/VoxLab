import React, { useRef, useState, useEffect } from 'react';

const BAR_W = 3;
const BAR_GAP = 2;
const WAVEFORM_H = 22;
// Repeating height pattern (0–1 scale)
const PATTERN = [0.4,0.65,0.5,0.85,0.7,0.45,0.95,0.55,0.3,0.75,0.6,0.45,0.5,0.8,0.7,0.35,0.6,0.85,0.4,0.7,
                 0.5,0.4,0.75,0.85,0.5,0.3,0.65,0.85,0.7,0.4,0.6,0.95,0.5,0.7,0.45,0.8,0.6,0.35,0.7,0.5];

function getBarRatio(i) { return PATTERN[i % PATTERN.length]; }

function formatTime(s) {
  if (!isFinite(s) || s < 0) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60).toString().padStart(2, '0');
  return `${m}:${sec}`;
}

export default function AudioPlayer({ src }) {
  const audioRef   = useRef(null);
  const waveRef    = useRef(null);
  const rafRef     = useRef(null);

  const [isPlaying,   setIsPlaying]   = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration,    setDuration]    = useState(0);
  const [numBars,     setNumBars]     = useState(50);

  // Measure waveform container to compute exact bar count
  useEffect(() => {
    const el = waveRef.current;
    if (!el) return;
    const calc = (w) => setNumBars(Math.max(8, Math.floor((w + BAR_GAP) / (BAR_W + BAR_GAP))));
    const obs = new ResizeObserver(([e]) => calc(e.contentRect.width));
    obs.observe(el);
    calc(el.getBoundingClientRect().width);
    return () => obs.disconnect();
  }, []);

  // Audio metadata + ended
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onMeta = () => setDuration(audio.duration || 0);
    const onEnd  = () => { setIsPlaying(false); setCurrentTime(0); cancelAnimationFrame(rafRef.current); };
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('ended', onEnd);
    return () => {
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('ended', onEnd);
    };
  }, [src]);

  // RAF loop for smooth 60fps progress while playing
  useEffect(() => {
    if (!isPlaying) { cancelAnimationFrame(rafRef.current); return; }
    const tick = () => {
      if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) { audio.pause(); setIsPlaying(false); }
    else { audio.play().catch(() => {}); setIsPlaying(true); }
  };

  const handleSeek = (e) => {
    if (!audioRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const t = ratio * duration;
    audioRef.current.currentTime = t;
    setCurrentTime(t);
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = src;
    a.download = 'response.wav';
    a.click();
  };

  const progress = duration > 0 ? currentTime / duration : 0;

  return (
    <div className="flex items-center gap-2.5 bg-slate-800 rounded-xl px-3 py-2 mt-2.5 select-none min-w-0">
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Play / Pause */}
      <button
        onClick={togglePlay}
        className="w-7 h-7 rounded-full bg-indigo-500 hover:bg-indigo-400 active:scale-95 flex items-center justify-center text-white shrink-0 transition-all"
      >
        <span className="material-symbols-outlined text-[15px]">
          {isPlaying ? 'pause' : 'play_arrow'}
        </span>
      </button>

      {/* Waveform — fixed-pixel bars via SVG, numBars fills container exactly */}
      <div
        ref={waveRef}
        className="flex-1 min-w-0 cursor-pointer"
        style={{ height: WAVEFORM_H }}
        onClick={handleSeek}
        title="Click to seek"
      >
        <svg
          width="100%"
          height={WAVEFORM_H}
          // No viewBox: coordinate space = rendered pixels → bars stay 3 px wide
        >
          {Array.from({ length: numBars }, (_, i) => {
            const ratio = getBarRatio(i);
            const barH  = Math.max(2, ratio * (WAVEFORM_H - 4));
            const x     = i * (BAR_W + BAR_GAP);
            const y     = (WAVEFORM_H - barH) / 2;
            const filled = i / numBars < progress;
            return (
              <rect
                key={i}
                x={x}
                y={y}
                width={BAR_W}
                height={barH}
                rx="1"
                fill={filled ? '#34d399' : '#475569'}
              />
            );
          })}
        </svg>
      </div>

      {/* Time */}
      <span className="font-mono text-[11px] text-slate-400 shrink-0 tabular-nums">
        {formatTime(currentTime)} / {formatTime(duration)}
      </span>

      {/* Download */}
      <button
        onClick={handleDownload}
        className="w-6 h-6 rounded-lg hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-200 shrink-0 transition-colors"
        title="Download audio"
      >
        <span className="material-symbols-outlined text-[15px]">download</span>
      </button>
    </div>
  );
}
