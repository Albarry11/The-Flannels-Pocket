import React, { useState, useEffect } from 'react';
import {
  Gauge,
  Music2,
  Radio,
  Settings2,
  Music,
  Disc,
  Loader2,
  RotateCcw,
  Sparkles,
  VolumeX,
  Crosshair,
  Sliders,
  X,
} from 'lucide-react';
import { formatSecondsToTime, transposeChord } from '../services/lyricsManager';
import { globalMetronome } from '../services/metronomeEngine';
import { globalAudioEngine } from '../services/audioEngine';
import type { MetronomeSound } from '../services/metronomeEngine';
import type { LoopRegion, Song } from '../types';

export interface DockOffsets {
  timeDisplay: { x: number; y: number };
  trackInfo: { x: number; y: number };
  speedChip: { x: number; y: number };
  btnRepeat: { x: number; y: number };
  btnStop: { x: number; y: number };
  btnPrev: { x: number; y: number };
  playSocket: { x: number; y: number };
  btnNext: { x: number; y: number };
  volModule: { x: number; y: number };
  pitchPod: { x: number; y: number };
  metronomePod: { x: number; y: number };
  loopPod: { x: number; y: number };
  clearSoundPod: { x: number; y: number };
  mainPod: { x: number; y: number };
  studioBtn: { x: number; y: number };
}

export const DESKTOP_DOCK_OFFSETS: DockOffsets = {
  timeDisplay: { x: 0, y: 0 },
  trackInfo: { x: 0, y: 0 },
  speedChip: { x: -16, y: 0 },
  btnRepeat: { x: -12, y: 0 },
  btnStop: { x: -7, y: -2 },
  btnPrev: { x: 2, y: 0 },
  playSocket: { x: -6, y: 0 },
  btnNext: { x: -14, y: 0 },
  volModule: { x: 6, y: -1 },
  pitchPod: { x: 0, y: 0 },
  metronomePod: { x: 0, y: 0 },
  loopPod: { x: 0, y: 0 },
  clearSoundPod: { x: 0, y: 0 },
  mainPod: { x: 0, y: 0 },
  studioBtn: { x: 0, y: 0 },
};

export const MOBILE_DOCK_OFFSETS: DockOffsets = {
  timeDisplay: { x: 9, y: -10 },
  trackInfo: { x: -30, y: 0 },
  speedChip: { x: -128, y: 18 },
  btnRepeat: { x: -102, y: 0 },
  btnStop: { x: -94, y: 0 },
  btnPrev: { x: -88, y: 0 },
  playSocket: { x: -86, y: 0 },
  btnNext: { x: -84, y: 0 },
  volModule: { x: -71, y: -1 },
  pitchPod: { x: 0, y: 0 },
  metronomePod: { x: 0, y: 0 },
  loopPod: { x: 0, y: 0 },
  clearSoundPod: { x: 0, y: 0 },
  mainPod: { x: 55, y: 0 },
  studioBtn: { x: 25, y: 0 },
};

export const DEFAULT_DOCK_OFFSETS: DockOffsets = DESKTOP_DOCK_OFFSETS;

interface MasterPlayerProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  speed: number;
  pitchSemitones: number;
  masterVolume: number;
  loopRegion: LoopRegion;
  replayGainEnabled?: boolean;
  currentSong: Song | null;
  metronomeClickActive: boolean;
  metronomeBpm: number;
  metronomeBeatsPerBar: number;
  metronomeVolume: number;
  isAudioLoading?: boolean;
  audioLoadingText?: string;
  onMetronomeBeatsChange: (beats: number) => void;
  onMetronomeVolumeChange: (vol: number) => void;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onSeek: (time: number) => void;
  onSpeedChange: (speed: number) => void;
  onPitchChange: (semitones: number) => void;
  onMasterVolumeChange: (vol: number) => void;
  onToggleLoop: () => void;
  onSetLoopStart: () => void;
  onSetLoopEnd: () => void;
  onClearLoop: () => void;
  onToggleReplayGain?: () => void;
  onToggleMetronomeClick: () => void;
  onMetronomeBpmChange: (bpm: number) => void;
  onSetLoopPoint?: (point: 'A' | 'B') => void;
  onToggleClearSound?: () => void;
}

export const MasterPlayer: React.FC<MasterPlayerProps> = ({
  isPlaying,
  currentTime,
  duration,
  speed,
  pitchSemitones,
  masterVolume,
  loopRegion,
  replayGainEnabled = false,
  currentSong,
  metronomeClickActive,
  metronomeBpm,
  metronomeBeatsPerBar,
  metronomeVolume,
  isAudioLoading = false,
  audioLoadingText,
  onMetronomeBeatsChange,
  onMetronomeVolumeChange,
  onPlay,
  onPause,
  onStop,
  onSeek,
  onSpeedChange,
  onPitchChange,
  onMasterVolumeChange,
  onToggleLoop,
  onSetLoopStart,
  onSetLoopEnd,
  onClearLoop,
  onToggleReplayGain,
  onToggleMetronomeClick,
  onMetronomeBpmChange,
  onSetLoopPoint,
  onToggleClearSound,
}) => {
  const [showAdvancedMetronome, setShowAdvancedMetronome] = useState(false);
  const [beatsPerBar, setBeatsPerBar] = useState(4);
  const [sound, setSound] = useState<MetronomeSound>('woodblock');

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const loopStartPercent = duration > 0 ? (loopRegion.start / duration) * 100 : 0;
  const loopEndPercent = duration > 0 ? (loopRegion.end / duration) * 100 : 100;

  const currentKeyTransposed = currentSong
    ? transposeChord(currentSong.originalKey, pitchSemitones)
    : '';

  const replayGainDb = currentSong?.replayGain?.recommendedGainDb ?? 0;

  // Sync local beatsPerBar whenever song changes
  useEffect(() => {
    if (currentSong) {
      const beats = currentSong.timeSignature?.startsWith('6/8')
        ? 6
        : Number(currentSong.timeSignature?.split('/')[0]) || 4;
      setBeatsPerBar(beats);
      globalMetronome.setBeatsPerBar(beats);
      globalAudioEngine.setMetronomeBeatsPerBar(beats);
    }
  }, [currentSong?.id, currentSong?.timeSignature]);

  const handleBeatsChange = (b: number) => {
    setBeatsPerBar(b);
    globalMetronome.setBeatsPerBar(b);
    globalAudioEngine.setMetronomeBeatsPerBar(b);
  };

  const handleSoundChange = (s: MetronomeSound) => {
    setSound(s);
    globalMetronome.setSound(s);
    globalAudioEngine.setMetronomeSound(s);
  };

  const handleTap = () => {
    const calculated = globalMetronome.tapTempo();
    onMetronomeBpmChange(calculated);
  };

  // Determine WMP volume icon level
  const volIconClass =
    masterVolume === 0
      ? 'muted'
      : masterVolume > 0.66
      ? 'high'
      : masterVolume > 0.33
      ? 'mid'
      : 'low';

  // Visual Tuner State (Interactive In-App Live Precision Tuner)
  const [showTuner, setShowTuner] = useState<boolean>(false);
  const [mobileStudioOpen, setMobileStudioOpen] = useState<boolean>(false);
  const [activeTunerTarget, setActiveTunerTarget] = useState<keyof DockOffsets>('timeDisplay');
  const [copiedNotice, setCopiedNotice] = useState<boolean>(false);
  const isDraggingRef = React.useRef(false);
  const dragStartPos = React.useRef({ x: 0, y: 0 });
  const initialOffset = React.useRef({ x: 0, y: 0 });

  const [isMobileScreen, setIsMobileScreen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') return window.innerWidth < 1024;
    return false;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobileScreen(window.innerWidth < 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [offsets, setOffsets] = useState<DockOffsets>(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      return MOBILE_DOCK_OFFSETS;
    }
    return DESKTOP_DOCK_OFFSETS;
  });

  // Automatically adapt baseline offsets when crossing between Mobile (< 1024) and Desktop (>= 1024)
  useEffect(() => {
    if (!showTuner) {
      setOffsets(isMobileScreen ? MOBILE_DOCK_OFFSETS : DESKTOP_DOCK_OFFSETS);
    }
  }, [isMobileScreen, showTuner]);

  const startDragTarget = (target: keyof DockOffsets, e: React.MouseEvent) => {
    if (!showTuner) return;
    e.stopPropagation();
    e.preventDefault();
    setActiveTunerTarget(target);
    isDraggingRef.current = true;
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    initialOffset.current = { ...offsets[target] };

    const onMouseMove = (ev: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const dx = ev.clientX - dragStartPos.current.x;
      const dy = ev.clientY - dragStartPos.current.y;
      setOffsets((prev) => {
        const next = {
          ...prev,
          [target]: {
            x: initialOffset.current.x + dx,
            y: initialOffset.current.y + dy,
          },
        };
        return next;
      });
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const startTouchDragTarget = (target: keyof DockOffsets, e: React.TouchEvent) => {
    if (!showTuner) return;
    e.stopPropagation();
    if (e.touches.length === 0) return;
    const touch = e.touches[0];
    setActiveTunerTarget(target);
    isDraggingRef.current = true;
    dragStartPos.current = { x: touch.clientX, y: touch.clientY };
    initialOffset.current = { ...offsets[target] };

    const onTouchMove = (ev: TouchEvent) => {
      if (!isDraggingRef.current || ev.touches.length === 0) return;
      const moveTouch = ev.touches[0];
      const dx = moveTouch.clientX - dragStartPos.current.x;
      const dy = moveTouch.clientY - dragStartPos.current.y;
      setOffsets((prev) => ({
        ...prev,
        [target]: {
          x: initialOffset.current.x + dx,
          y: initialOffset.current.y + dy,
        },
      }));
    };

    const onTouchEnd = () => {
      isDraggingRef.current = false;
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
    };

    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);
    window.addEventListener('touchcancel', onTouchEnd);
  };

  useEffect(() => {
    if (!showTuner) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        e.preventDefault();
        const step = e.shiftKey ? 5 : 1;
        if (e.key === 'ArrowLeft') handleNudge(-step, 0);
        if (e.key === 'ArrowRight') handleNudge(step, 0);
        if (e.key === 'ArrowUp') handleNudge(0, -step);
        if (e.key === 'ArrowDown') handleNudge(0, step);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showTuner, activeTunerTarget]);

  const getTunerStyle = (target: keyof DockOffsets): React.CSSProperties => {
    const isSelected = showTuner && activeTunerTarget === target;
    return {
      transform: `translate(${offsets[target].x}px, ${offsets[target].y}px)`,
      cursor: showTuner ? 'grab' : undefined,
      outline: isSelected
        ? '2px solid #f59e0b'
        : showTuner
        ? '1.5px dashed rgba(56, 189, 248, 0.5)'
        : undefined,
      outlineOffset: '2px',
      boxShadow: isSelected ? '0 0 10px rgba(245, 158, 11, 0.7)' : undefined,
      transition: isDraggingRef.current ? 'none' : 'transform 75ms',
    };
  };

  const handleNudge = (dx: number, dy: number) => {
    setOffsets((prev) => ({
      ...prev,
      [activeTunerTarget]: {
        x: prev[activeTunerTarget].x + dx,
        y: prev[activeTunerTarget].y + dy,
      },
    }));
  };

  const handleResetTarget = () => {
    const targetDefs = isMobileScreen ? MOBILE_DOCK_OFFSETS : DESKTOP_DOCK_OFFSETS;
    setOffsets((prev) => ({
      ...prev,
      [activeTunerTarget]: { ...targetDefs[activeTunerTarget] },
    }));
  };

  const handleResetAll = () => {
    setOffsets(isMobileScreen ? MOBILE_DOCK_OFFSETS : DESKTOP_DOCK_OFFSETS);
  };

  const handleCopyTuningJson = () => {
    const jsonStr = JSON.stringify(offsets, null, 2);
    navigator.clipboard?.writeText(jsonStr).catch(() => {});
    setCopiedNotice(true);
    setTimeout(() => setCopiedNotice(false), 2500);
  };

  return (
    <div className="wmp-dock-bar relative flex-shrink-0 w-full z-30 px-2 sm:px-4 pt-1 pb-3 sm:pb-2.5 transition-all select-none pb-safe">
      {/* Advanced Metronome Popover Panel */}
      {showAdvancedMetronome && (
        <div className="absolute bottom-20 left-3 right-3 sm:left-1/2 sm:-translate-x-1/2 sm:w-96 rounded-2xl bg-white/95 backdrop-blur-3xl border border-sky-300 p-4 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 text-xs text-[#0f2942]">
          <div className="flex items-center justify-between border-b border-sky-100 pb-2 mb-3">
            <span className="font-extrabold text-sky-900 flex items-center gap-1.5">
              <Settings2 className="w-4 h-4 text-sky-600" />
              <span>Pengaturan Advance Metronome (WMP DSP)</span>
            </span>
            <button
              onClick={() => setShowAdvancedMetronome(false)}
              className="text-slate-400 hover:text-slate-700 font-bold p-1"
            >
              ✕
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-600">Birama: {metronomeBeatsPerBar === 6 ? '6/8' : `${metronomeBeatsPerBar}/4`}</span>
              <div className="flex gap-1">
                {[2, 3, 4, 6].map((ts) => (
                  <button
                    key={ts}
                    onClick={() => {
                      handleBeatsChange(ts);
                      onMetronomeBeatsChange(ts);
                    }}
                    className={`px-2.5 py-1 rounded-full font-mono font-bold text-xs transition ${
                      beatsPerBar === ts
                        ? 'bg-sky-600 text-white shadow-xs'
                        : 'bg-sky-100 text-sky-900 hover:bg-sky-200'
                    }`}
                  >
                    {ts === 6 ? '6/8' : `${ts}/4`}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-600">Pilihan Suara:</span>
              <div className="flex gap-1 flex-wrap justify-end">
                {(['woodblock', 'beep', 'rimshot', 'cowbell'] as MetronomeSound[]).map((snd) => (
                  <button
                    key={snd}
                    onClick={() => handleSoundChange(snd)}
                    className={`px-2 py-1 rounded-full text-[10px] font-bold capitalize transition ${
                      sound === snd
                        ? 'bg-sky-600 text-white shadow-xs'
                        : 'bg-sky-100 text-sky-900 hover:bg-sky-200'
                    }`}
                  >
                    {snd}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <span className="font-semibold text-slate-600">Volume Click:</span>
              <div className="flex items-center gap-2 flex-1 max-w-[220px]">
                <VolumeX className="w-3.5 h-3.5 text-slate-500" />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={metronomeVolume}
                  onChange={(e) => onMetronomeVolumeChange(Number(e.target.value))}
                  className="w-full accent-sky-600 cursor-pointer"
                  aria-label="Volume suara metronom"
                />
                <span className="w-9 text-right font-mono text-[10px]">{Math.round(metronomeVolume * 100)}%</span>
              </div>
            </div>

            <div className="pt-1 flex items-center justify-between">
              <span className="font-semibold text-slate-600">Manual Tap:</span>
              <button
                onClick={handleTap}
                className="px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-black font-extrabold flex items-center gap-1 shadow-sm active:scale-95"
              >
                <Music className="w-3.5 h-3.5" />
                <span>Tap Tempo</span>
              </button>
            </div>

            {/* Loop A-B Section inside DSP Popover */}
            <div className="pt-2 border-t border-sky-100 flex items-center justify-between">
              <span className="font-semibold text-slate-600">Looping A-B:</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={onSetLoopStart}
                  className="px-2.5 py-1 rounded-md bg-sky-100 hover:bg-sky-200 text-sky-950 font-mono font-black text-xs transition"
                >
                  Titik A
                </button>
                <button
                  onClick={onSetLoopEnd}
                  className="px-2.5 py-1 rounded-md bg-sky-100 hover:bg-sky-200 text-sky-950 font-mono font-black text-xs transition"
                >
                  Titik B
                </button>
                {loopRegion.enabled && (
                  <button
                    onClick={onClearLoop}
                    className="px-2 py-1 rounded-md bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold text-xs"
                  >
                    Hapus
                  </button>
                )}
              </div>
            </div>

            {/* Clear Sound / ReplayGain Section inside DSP Popover */}
            {onToggleReplayGain && (
              <div className="pt-2 border-t border-sky-100 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-600 block">Clear Sound (SRS WOW):</span>
                  <span className="text-[10px] text-slate-400">Normalisasi kenyaringan broadcast (-14 LUFS)</span>
                </div>
                <button
                  onClick={onToggleReplayGain}
                  className={`px-3 py-1 rounded-full text-xs font-black transition flex items-center gap-1 shadow-xs ${
                    replayGainEnabled
                      ? 'bg-gradient-to-r from-cyan-400 to-emerald-400 text-slate-950 border border-cyan-300'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <Sparkles className="w-3 h-3" />
                  <span>{replayGainEnabled ? `Aktif (${replayGainDb > 0 ? '+' : ''}${replayGainDb}dB)` : 'Nonaktif'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* In-App Live Tuner HUD (Real-Time Precision Positioning) */}
      {showTuner && (
        <div className="mb-2 p-2.5 bg-[#07192b]/95 backdrop-blur-2xl border-2 border-amber-400/90 rounded-2xl flex items-center justify-between gap-2.5 text-white text-xs flex-wrap z-50 shadow-2xl animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-amber-400 flex items-center gap-1.5 text-xs">
              <Crosshair className="w-4 h-4 text-amber-400 animate-spin-slow" /> Target:
            </span>
            <select
              value={activeTunerTarget}
              onChange={(e) => setActiveTunerTarget(e.target.value as keyof DockOffsets)}
              className="bg-[#0b243e] text-cyan-300 border border-cyan-500 rounded-lg px-2.5 py-1 text-xs font-mono font-black focus:outline-none shadow-inner"
            >
              <option value="timeDisplay">1. Kapsul Durasi</option>
              <option value="trackInfo">2. Info Lagu (Cover/Judul)</option>
              <option value="loopPod">3. Kapsul Loop A-B</option>
              <option value="speedChip">4. Speed Chip (1.0x)</option>
              <option value="btnRepeat">5. Tombol Repeat</option>
              <option value="btnStop">6. Tombol Stop</option>
              <option value="btnPrev">7. Tombol Prev</option>
              <option value="playSocket">8. Tombol Play Orb</option>
              <option value="btnNext">9. Tombol Next</option>
              <option value="volModule">10. Slider Volume Transparan</option>
              <option value="clearSoundPod">11. Kapsul Clear Sound</option>
              <option value="pitchPod">12. Kapsul Pitch Shifter</option>
              <option value="metronomePod">13. Kapsul Metronom</option>
              <option value="mainPod">14. Pod Utama (404px)</option>
              <option value="studioBtn">15. Tombol Studio Mobile</option>
            </select>
          </div>

          {/* Stepper X */}
          <div className="flex items-center gap-1">
            <span className="text-slate-400 font-mono text-[10px] font-bold">X:</span>
            <button onClick={() => handleNudge(-5, 0)} className="px-2 py-0.5 rounded bg-slate-800 hover:bg-cyan-700 font-mono text-[10px] font-bold shadow-xs">-5</button>
            <button onClick={() => handleNudge(-1, 0)} className="px-2 py-0.5 rounded bg-slate-800 hover:bg-cyan-700 font-mono text-[10px] font-bold shadow-xs">-1</button>
            <button onClick={() => handleNudge(1, 0)} className="px-2 py-0.5 rounded bg-slate-800 hover:bg-cyan-700 font-mono text-[10px] font-bold shadow-xs">+1</button>
            <button onClick={() => handleNudge(5, 0)} className="px-2 py-0.5 rounded bg-slate-800 hover:bg-cyan-700 font-mono text-[10px] font-bold shadow-xs">+5</button>
          </div>

          {/* Stepper Y */}
          <div className="flex items-center gap-1">
            <span className="text-slate-400 font-mono text-[10px] font-bold">Y:</span>
            <button onClick={() => handleNudge(0, -3)} className="px-2 py-0.5 rounded bg-slate-800 hover:bg-cyan-700 font-mono text-[10px] font-bold shadow-xs">▲ -3</button>
            <button onClick={() => handleNudge(0, -1)} className="px-2 py-0.5 rounded bg-slate-800 hover:bg-cyan-700 font-mono text-[10px] font-bold shadow-xs">▲ -1</button>
            <button onClick={() => handleNudge(0, 1)} className="px-2 py-0.5 rounded bg-slate-800 hover:bg-cyan-700 font-mono text-[10px] font-bold shadow-xs">▼ +1</button>
            <button onClick={() => handleNudge(0, 3)} className="px-2 py-0.5 rounded bg-slate-800 hover:bg-cyan-700 font-mono text-[10px] font-bold shadow-xs">▼ +3</button>
          </div>

          {/* Readout */}
          <div className="font-mono text-xs text-cyan-200 bg-black/60 px-2.5 py-1 rounded-lg border border-cyan-800 font-black">
            X: {offsets[activeTunerTarget].x > 0 ? `+${offsets[activeTunerTarget].x}` : offsets[activeTunerTarget].x}px | Y: {offsets[activeTunerTarget].y > 0 ? `+${offsets[activeTunerTarget].y}` : offsets[activeTunerTarget].y}px
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleCopyTuningJson}
              className={`px-3 py-1 rounded-lg font-black text-xs transition-all shadow-md ${
                copiedNotice
                  ? 'bg-emerald-400 text-slate-950 font-black scale-105'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              {copiedNotice ? '✓ Tersalin!' : '📋 Salin Koordinat'}
            </button>
            <button
              onClick={handleResetTarget}
              className="px-2 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-[10px] font-bold"
            >
              ↺ Reset
            </button>
            <button
              onClick={handleResetAll}
              className="px-2 py-1 rounded-lg bg-rose-900/80 hover:bg-rose-800 text-rose-200 text-[10px] font-bold"
            >
              Reset Semua
            </button>
            <button
              onClick={() => setShowTuner(false)}
              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs font-bold"
              title="Tutup Panel Tuner"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* WMP 11 Precision Timeline Scrubber Bar on Top Edge */}
      <div className="relative w-full flex items-center group -mt-1 mb-1">
        <div className="w-full h-1.5 bg-[#8bb4dc]/40 rounded-full overflow-hidden relative cursor-pointer border border-white/80 shadow-inner">
          {loopRegion.enabled && (
            <div
              className="absolute top-0 bottom-0 bg-amber-400/80 border-x-2 border-amber-500 z-10"
              style={{
                left: `${loopStartPercent}%`,
                width: `${Math.max(0, loopEndPercent - loopStartPercent)}%`,
              }}
            />
          )}
          <div
            className="h-full bg-gradient-to-r from-[#2995dc] via-[#1170b8] to-[#044c8c] rounded-full transition-all duration-75 relative"
            style={{ width: `${progressPercent}%` }}
          >
            <div className="absolute right-0 top-0 bottom-0 w-2.5 bg-white rounded-full shadow-[0_0_8px_#0284c7]" />
          </div>
        </div>
        <input
          type="range"
          min="0"
          max={duration || 100}
          step="0.05"
          value={currentTime}
          onChange={(e) => onSeek(parseFloat(e.target.value))}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          title="Scrub timeline"
          aria-label="Posisi pemutaran lagu"
        />

        {/* Small Tuner Toggle Trigger button */}
        <button
          onClick={() => setShowTuner(!showTuner)}
          className={`absolute right-1 -top-5 px-1.5 py-0.2 rounded-md font-mono text-[9px] font-bold flex items-center gap-1 transition shadow-2xs ${
            showTuner
              ? 'bg-amber-400 text-black border border-amber-500'
              : 'bg-white/60 hover:bg-white text-slate-600 border border-sky-300/60'
          }`}
          title="Buka Tuner Posisi Presisi Langsung di App"
        >
          <Crosshair className="w-2.5 h-2.5" />
          <span>Tuner</span>
        </button>
      </div>

      {/* ================= 1-ROW SLEEK WMPOTIFY DOCK (100% OFFSETS DRIVEN) ================= */}
      <div className="relative w-full flex items-center justify-between min-h-[52px] px-4 sm:px-8">
        
        {/* SISI KIRI: Track Info + Durasi */}
        <div className="flex items-center gap-1.5 sm:gap-3 max-w-[calc(50vw-235px)] lg:max-w-[calc(50vw-255px)] min-w-0 z-10 scale-[0.85] sm:scale-100 origin-left transition-transform">
          {/* Track Info Plate */}
          <div
            style={getTunerStyle('trackInfo')}
            onMouseDown={(e) => startDragTarget('trackInfo', e)}
            className="flex items-center gap-2 min-w-0 max-w-[130px] sm:max-w-[210px] select-none"
          >
            {currentSong ? (
              <>
                <div className="w-8 h-8 rounded-lg overflow-hidden shadow-xs border border-white/90 flex-shrink-0 bg-sky-100 relative">
                  {currentSong.artworkUrl ? (
                    <img
                      src={currentSong.artworkUrl}
                      alt={currentSong.title}
                      className="w-full h-full object-cover pointer-events-none"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white">
                      <Disc className="w-3.5 h-3.5 animate-spin" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1 pointer-events-none">
                  <h4 className="text-[11px] sm:text-xs font-black text-[#002963] truncate tracking-tight leading-tight">
                    {currentSong.title}
                  </h4>
                  <p className="text-[9px] sm:text-[10px] text-sky-800 font-bold truncate">
                    {currentSong.artist}
                  </p>
                </div>
              </>
            ) : (
              <div className="text-[10px] text-slate-500 font-semibold italic truncate">Belum ada lagu yang dimuat</div>
            )}
          </div>

          {/* Duration Badge */}
          <div
            style={getTunerStyle('timeDisplay')}
            onMouseDown={(e) => startDragTarget('timeDisplay', e)}
            className="wmp-aero-pill px-2.5 py-0.5 text-[9px] sm:text-[10px] font-mono text-[#002963] font-black tracking-wider flex-shrink-0 whitespace-nowrap shadow-2xs select-none"
          >
            {isAudioLoading ? (
              <span className="text-sky-700 font-extrabold animate-pulse">
                {audioLoadingText || 'Memuat...'}
              </span>
            ) : (
              <span>
                {formatSecondsToTime(currentTime)} / {formatSecondsToTime(duration)}
              </span>
            )}
          </div>
        </div>

        {/* TENGAH: 100% DEAD-CENTER POD CLUSTER ([LOOP A-B] + [WMP 11 POD] + [CLEAR SOUND]) */}
        <div
          style={{
            transform: `translate(-50%, -50%) translate(${offsets.mainPod.x}px, ${offsets.mainPod.y}px)`,
          }}
          className="absolute left-1/2 top-1/2 z-20 pointer-events-auto flex items-center gap-1.5 sm:gap-2 transform scale-[0.75] xs:scale-[0.82] sm:scale-90 md:scale-100 origin-center transition-transform"
        >
          {/* Loop A-B Pod (Desktop Only >= 1024px: di mobile masuk ke Side Drawer) */}
          <div
            style={getTunerStyle('loopPod')}
            onMouseDown={(e) => startDragTarget('loopPod', e)}
            className="hidden lg:flex wmp-aero-pill px-2 py-0.5 items-center gap-1 text-xs flex-shrink-0 select-none shadow-xs"
          >
            <span className="text-[9px] font-bold text-sky-700 pointer-events-none">A-B</span>
            <button
              onClick={() => onSetLoopPoint?.('A')}
              className={`wmp-aero-btn px-1.5 py-0.5 rounded text-[9px] font-black ${loopRegion.start !== null ? 'bg-amber-300 border-amber-500 text-black' : ''}`}
              title="Set titik A (mulai loop)"
            >A</button>
            <button
              onClick={() => onSetLoopPoint?.('B')}
              className={`wmp-aero-btn px-1.5 py-0.5 rounded text-[9px] font-black ${loopRegion.end !== null ? 'bg-amber-300 border-amber-500 text-black' : ''}`}
              title="Set titik B (akhir loop)"
            >B</button>
          </div>

          {/* Pod WMP 11 Utama (Compact 404px on Mobile < 1024px / Panjang 484px on Desktop >= 1024px) */}
          <div
            className="wmp-control-pod"
            style={{
              cursor: showTuner ? 'grab' : undefined,
              outline: showTuner && activeTunerTarget === 'mainPod' ? '2px solid #f59e0b' : undefined,
            }}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) {
                startDragTarget('mainPod', e);
              }
            }}
          >
            {/* Sayap Kiri Pod: Speed 1.0x + Repeat + Stop + Prev (Extended to 245px for mobile speed chip) */}
            <div className="w-[245px] lg:w-[221px] h-full flex items-center justify-end gap-1 pr-1 lg:pr-2.5 flex-shrink-0">
              {/* Playback Speed Pill */}
              <div
                style={getTunerStyle('speedChip')}
                onMouseDown={(e) => startDragTarget('speedChip', e)}
                className="flex items-center gap-0.5 bg-white/35 hover:bg-white/55 border border-white/60 rounded-full px-1.5 py-0.5 shadow-2xs mr-0.5 transition backdrop-blur-xs select-none"
              >
                <Gauge className="w-2.5 h-2.5 text-sky-800 pointer-events-none" />
                <select
                  value={speed}
                  onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
                  className="bg-transparent text-[#002963] text-[9px] sm:text-[10px] font-mono font-black focus:outline-none cursor-pointer"
                  aria-label="Pilih kecepatan playback"
                >
                  <option value={0.75}>0.75x</option>
                  <option value={1.0}>1.0x</option>
                  <option value={1.25}>1.25x</option>
                </select>
              </div>

              {/* Repeat Button */}
              <button
                onClick={onToggleLoop}
                style={getTunerStyle('btnRepeat')}
                onMouseDown={(e) => startDragTarget('btnRepeat', e)}
                className={`wmp-btn-repeat ${loopRegion.enabled ? 'active' : ''}`}
                title={loopRegion.enabled ? 'Repeat Aktif' : 'Ulangi Pemutaran'}
                aria-label="Repeat Pemutaran"
              />

              {/* Stop Button */}
              <button
                onClick={onStop}
                style={getTunerStyle('btnStop')}
                onMouseDown={(e) => startDragTarget('btnStop', e)}
                className="wmp-btn-stop"
                title="Stop"
                aria-label="Stop Pemutaran"
              />

              {/* Prev Track Button */}
              <button
                onClick={() => onSeek(Math.max(0, currentTime - 10))}
                style={getTunerStyle('btnPrev')}
                onMouseDown={(e) => startDragTarget('btnPrev', e)}
                className="wmp-btn-prev"
                title="Mundur 10 Detik"
                aria-label="Mundur 10 Detik"
              />
            </div>

            {/* Center Play Orb (42px x 43px) */}
            <div
              style={getTunerStyle('playSocket')}
              onMouseDown={(e) => startDragTarget('playSocket', e)}
              className="w-[42px] h-[43px] flex items-center justify-center flex-shrink-0 z-10"
            >
              {isAudioLoading ? (
                <div className="w-[42px] h-[43px] rounded-full bg-sky-600 flex items-center justify-center text-white shadow-md">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
              ) : (
                <button
                  onClick={isPlaying ? onPause : onPlay}
                  className={`wmp-btn-playpause ${isPlaying ? 'pause' : 'play'}`}
                  title={isPlaying ? 'Pause' : 'Play'}
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                />
              )}
            </div>

            {/* Sayap Kanan Pod: Next + Master Volume Transparan (181px mobile, 221px desktop) */}
            <div className="w-[181px] lg:w-[221px] h-full flex items-center justify-start gap-1 pl-1 lg:pl-2.5 flex-shrink-0">
              {/* Next Track Button */}
              <button
                onClick={() => onSeek(Math.min(duration, currentTime + 10))}
                style={getTunerStyle('btnNext')}
                onMouseDown={(e) => startDragTarget('btnNext', e)}
                className="wmp-btn-next"
                title="Maju 10 Detik"
                aria-label="Maju 10 Detik"
              />

              {/* Volume Slider TRANSPARAN */}
              <div
                style={getTunerStyle('volModule')}
                onMouseDown={(e) => startDragTarget('volModule', e)}
                className="flex items-center gap-1 px-1 py-0.5 bg-transparent border-none shadow-none select-none"
              >
                <button
                  onClick={() => onMasterVolumeChange(masterVolume === 0 ? 0.9 : 0)}
                  className={`wmp-btn-vol ${volIconClass}`}
                  title={masterVolume === 0 ? 'Unmute Volume' : 'Mute Volume'}
                  aria-label={masterVolume === 0 ? 'Unmute Volume' : 'Mute Volume'}
                />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={masterVolume}
                  onChange={(e) => onMasterVolumeChange(parseFloat(e.target.value))}
                  className="wmp-vol-slider w-12 sm:w-14 lg:w-16 cursor-pointer"
                  title={`Master Volume: ${Math.round(masterVolume * 100)}%`}
                  aria-label="Volume audio master"
                />
                <span className="text-[9px] font-mono text-[#002963] font-black w-6 text-right select-none">
                  {Math.round(masterVolume * 100)}%
                </span>
              </div>
            </div>
          </div>

          {/* Clear Sound SRS WOW Pod (Desktop Only >= 1024px: di mobile masuk ke Side Drawer) */}
          <div
            style={getTunerStyle('clearSoundPod')}
            onMouseDown={(e) => startDragTarget('clearSoundPod', e)}
            className="hidden lg:flex wmp-aero-pill px-2 py-0.5 items-center gap-1 text-xs flex-shrink-0 cursor-pointer select-none shadow-xs"
            onClick={onToggleClearSound}
            title="SRS WOW Clear Sound Enhancement"
          >
            <Sparkles className="w-3 h-3 text-amber-500 pointer-events-none" />
            <span className="font-mono font-black text-[9px] sm:text-[10px] text-[#002963] pointer-events-none">Clear</span>
            <span className="text-[8px] font-mono text-emerald-700 font-bold pointer-events-none">+2dB</span>
          </div>
        </div>

        {/* SISI KANAN: Desktop DSP Tools (>= 1024px) | Mobile Studio Trigger Button (< 1024px) */}
        <div className="flex items-center justify-end gap-1.5 sm:gap-2.5 max-w-[calc(50vw-215px)] lg:max-w-[calc(50vw-255px)] min-w-0 ml-auto z-10 scale-[0.85] sm:scale-100 origin-right transition-transform">
          {/* Desktop Only Tools: Pitch Shifter + Metronom (Hanya tampil di Desktop >= 1024px) */}
          <div className="hidden lg:flex items-center gap-2">
            {/* Pitch Shifter DSP Pod */}
            <div
              style={getTunerStyle('pitchPod')}
              onMouseDown={(e) => startDragTarget('pitchPod', e)}
              className="wmp-aero-pill px-2 py-0.5 flex items-center gap-1 text-xs flex-shrink-0 select-none"
            >
              <Music2 className="w-3 h-3 text-pink-600 pointer-events-none" />
              <button
                onClick={() => onPitchChange(pitchSemitones - 1)}
                className="wmp-aero-btn w-4 h-4 rounded-full text-[9px] font-bold"
                title="Turunkan nada"
              >
                -
              </button>
              <span className="font-mono font-black text-[#002963] text-[9px] sm:text-[10px] min-w-[1rem] text-center pointer-events-none">
                {pitchSemitones > 0 ? `+${pitchSemitones}` : pitchSemitones}
              </span>
              <button
                onClick={() => onPitchChange(pitchSemitones + 1)}
                className="wmp-aero-btn w-4 h-4 rounded-full text-[9px] font-bold"
                title="Naikkan nada"
              >
                +
              </button>
              {currentKeyTransposed && (
                <span className="text-[8px] sm:text-[9px] font-mono text-amber-950 font-black bg-amber-100/90 px-1.5 py-0.2 rounded border border-amber-300 shadow-2xs pointer-events-none">
                  {currentKeyTransposed}
                </span>
              )}
              {pitchSemitones !== 0 && (
                <button
                  onClick={() => onPitchChange(0)}
                  className="wmp-aero-btn px-1 py-0.2 rounded-full text-[8px]"
                  title="Reset nada"
                >
                  <RotateCcw className="w-2 h-2" />
                </button>
              )}
            </div>

            {/* Metronome DSP Pod */}
            <div
              style={getTunerStyle('metronomePod')}
              onMouseDown={(e) => startDragTarget('metronomePod', e)}
              className="wmp-aero-pill px-2 py-0.5 flex items-center gap-1 text-xs flex-shrink-0 select-none"
            >
              <button
                onClick={onToggleMetronomeClick}
                className={`wmp-aero-btn px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] gap-1 ${
                  metronomeClickActive
                    ? 'active bg-gradient-to-b from-amber-300 via-amber-400 to-amber-500 border-amber-600 text-black shadow-xs'
                    : ''
                }`}
                title="Toggle Metronome Click"
              >
                <Radio className="w-3 h-3 text-amber-600" />
                <span className="font-mono">{metronomeBpm}</span>
              </button>
              <div className="flex items-center gap-0.5 font-mono text-sky-950 font-bold border-l border-sky-300/80 pl-0.5">
                <button
                  onClick={() => onMetronomeBpmChange(metronomeBpm - 1)}
                  className="wmp-aero-btn w-4 h-4 rounded-full text-[9px] font-bold"
                  title="Kurang 1 BPM"
                >
                  -
                </button>
                <button
                  onClick={() => onMetronomeBpmChange(metronomeBpm + 1)}
                  className="wmp-aero-btn w-4 h-4 rounded-full text-[9px] font-bold"
                  title="Tambah 1 BPM"
                >
                  +
                </button>
              </div>
              <button
                onClick={() => setShowAdvancedMetronome(!showAdvancedMetronome)}
                className="wmp-aero-btn w-4 h-4 rounded-full p-0.5 text-slate-600"
                title="Pengaturan Birama & Suara Metronom"
              >
                <Settings2 className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Mobile Only: Studio Menu Trigger Button (< 1024px) */}
          <button
            onClick={() => {
              if (!showTuner) setMobileStudioOpen(true);
            }}
            onMouseDown={(e) => startDragTarget('studioBtn', e)}
            onTouchStart={(e) => startTouchDragTarget('studioBtn', e)}
            style={getTunerStyle('studioBtn')}
            className="lg:hidden wmp-aero-pill px-3 py-1.5 flex items-center gap-1.5 text-[#002963] font-black text-xs shadow-md relative active:scale-95 transition-all bg-gradient-to-b from-white/95 via-sky-100/90 to-sky-200/90 border border-sky-300"
            title="Buka Alat Studio Mobile (Loop A-B, Pitch, Metronom, Clear Sound)"
          >
            <Sliders className="w-3.5 h-3.5 text-sky-700" />
            <span className="text-[11px] font-black tracking-tight">Studio</span>
            {(metronomeClickActive || pitchSemitones !== 0 || loopRegion.enabled) && (
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 absolute -top-1 -right-1 shadow-[0_0_8px_#f59e0b] border border-white" />
            )}
          </button>
        </div>

      </div>

      {/* Floating DEV Tuner Mode Trigger */}
      <button
        onClick={() => setShowTuner(!showTuner)}
        className={`fixed bottom-20 right-4 z-50 px-3.5 py-1.5 rounded-full font-black text-xs flex items-center gap-2 shadow-2xl transition-all ${
          showTuner
            ? 'bg-amber-400 text-black border-2 border-amber-500 scale-105 shadow-[0_0_15px_#f59e0b]'
            : 'bg-[#07192b]/90 hover:bg-[#0c2b4c] text-cyan-300 border border-cyan-400/60 backdrop-blur-lg hover:scale-105'
        }`}
        title="Buka Alat Geser Posisi Manual (Localhost Tuner)"
      >
        <Crosshair className="w-3.5 h-3.5" />
        <span>{showTuner ? 'Tutup Tuner ✕' : '🎯 Mode Geser'}</span>
      </button>

      {/* ================= MOBILE RIGHT-SIDE STUDIO DRAWER ================= */}
      {mobileStudioOpen && (
        <>
          {/* Backdrop Overlay */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 lg:hidden animate-in fade-in duration-200"
            onClick={() => setMobileStudioOpen(false)}
          />

          {/* Right Drawer Panel (Aero Glass Style) */}
          <div className="fixed inset-y-0 right-0 z-50 w-72 max-w-[85vw] bg-gradient-to-b from-[#ebf5fe]/98 via-[#d6e9fa]/98 to-[#c2def4]/98 backdrop-blur-2xl border-l-2 border-white/90 shadow-[-12px_0_35px_rgba(2,60,120,0.35)] p-4 flex flex-col justify-between text-[#002963] lg:hidden animate-in slide-in-from-right duration-200">
            <div className="space-y-3.5 overflow-y-auto pr-1">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-sky-300/60">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-sky-500 to-blue-700 flex items-center justify-center text-white shadow-xs">
                    <Sliders className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-black text-xs text-[#002963] leading-none">Studio Mobile</h3>
                    <span className="text-[9px] font-bold text-sky-700">The Flannels Pocket</span>
                  </div>
                </div>
                <button
                  onClick={() => setMobileStudioOpen(false)}
                  className="w-7 h-7 rounded-full bg-white/80 hover:bg-white text-slate-700 flex items-center justify-center border border-sky-300 shadow-2xs font-black active:scale-95"
                  title="Tutup Menu"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* 1. Loop A-B Section */}
              <div className="bg-white/70 backdrop-blur-md rounded-xl p-3 border border-white/90 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-sky-950 flex items-center gap-1.5">
                    <span>🔁</span> Loop A-B
                  </span>
                  {loopRegion.enabled && (
                    <span className="text-[9px] font-bold text-amber-900 bg-amber-200 px-2 py-0.5 rounded-full border border-amber-400">
                      Aktif
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  <button
                    onClick={() => onSetLoopPoint?.('A')}
                    className={`py-2 rounded-lg text-xs font-black flex flex-col items-center gap-0.5 border shadow-2xs transition active:scale-95 ${
                      loopRegion.start !== null
                        ? 'bg-amber-300 border-amber-500 text-amber-950 shadow-inner'
                        : 'bg-white/90 hover:bg-white border-sky-300 text-sky-900'
                    }`}
                  >
                    <span className="text-[9px] text-slate-500 font-bold">Mulai</span>
                    <span>Titik A</span>
                  </button>
                  <button
                    onClick={() => onSetLoopPoint?.('B')}
                    className={`py-2 rounded-lg text-xs font-black flex flex-col items-center gap-0.5 border shadow-2xs transition active:scale-95 ${
                      loopRegion.end !== null
                        ? 'bg-amber-300 border-amber-500 text-amber-950 shadow-inner'
                        : 'bg-white/90 hover:bg-white border-sky-300 text-sky-900'
                    }`}
                  >
                    <span className="text-[9px] text-slate-500 font-bold">Akhir</span>
                    <span>Titik B</span>
                  </button>
                  <button
                    onClick={onClearLoop}
                    className="py-2 rounded-lg text-xs font-bold bg-white/70 hover:bg-white border border-slate-300 text-slate-600 flex flex-col items-center gap-0.5 shadow-2xs transition active:scale-95"
                  >
                    <RotateCcw className="w-3 h-3 text-slate-500 mt-0.5" />
                    <span>Reset</span>
                  </button>
                </div>
              </div>

              {/* 2. Pitch Shifter Section */}
              <div className="bg-white/70 backdrop-blur-md rounded-xl p-3 border border-white/90 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-sky-950 flex items-center gap-1.5">
                    <Music2 className="w-3.5 h-3.5 text-pink-600" /> Pitch Shifter
                  </span>
                  {currentKeyTransposed && (
                    <span className="text-[10px] font-mono text-amber-950 font-black bg-amber-200/90 px-2 py-0.5 rounded-md border border-amber-400 shadow-2xs">
                      Key: {currentKeyTransposed}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2 pt-1">
                  <button
                    onClick={() => onPitchChange(pitchSemitones - 1)}
                    className="w-10 h-10 rounded-xl bg-white/90 hover:bg-white border border-sky-300 text-sky-950 text-base font-black flex items-center justify-center shadow-xs active:scale-95"
                  >
                    -
                  </button>
                  <div className="flex-1 text-center font-mono font-black text-xs sm:text-sm text-[#002963]">
                    {pitchSemitones > 0 ? `+${pitchSemitones}` : pitchSemitones} Semitone
                  </div>
                  <button
                    onClick={() => onPitchChange(pitchSemitones + 1)}
                    className="w-10 h-10 rounded-xl bg-white/90 hover:bg-white border border-sky-300 text-sky-950 text-base font-black flex items-center justify-center shadow-xs active:scale-95"
                  >
                    +
                  </button>
                  {pitchSemitones !== 0 && (
                    <button
                      onClick={() => onPitchChange(0)}
                      className="w-8 h-10 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center border border-slate-300 active:scale-95"
                      title="Reset Pitch"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* 3. Metronome Section */}
              <div className="bg-white/70 backdrop-blur-md rounded-xl p-3 border border-white/90 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-sky-950 flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-amber-600" /> Metronom
                  </span>
                  <button
                    onClick={() => setShowAdvancedMetronome(true)}
                    className="text-[10px] text-sky-800 font-extrabold flex items-center gap-0.5 hover:underline"
                  >
                    <Settings2 className="w-3 h-3" />
                    <span>Setelan</span>
                  </button>
                </div>
                <div className="flex items-center justify-between gap-2 pt-1">
                  <button
                    onClick={() => onMetronomeBpmChange(metronomeBpm - 1)}
                    className="w-10 h-10 rounded-xl bg-white/90 hover:bg-white border border-sky-300 text-sky-950 text-base font-black flex items-center justify-center shadow-xs active:scale-95"
                  >
                    -
                  </button>
                  <button
                    onClick={onToggleMetronomeClick}
                    className={`flex-1 h-10 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 border shadow-xs transition active:scale-95 ${
                      metronomeClickActive
                        ? 'bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 border-amber-600 text-black shadow-md'
                        : 'bg-white/90 hover:bg-white border-sky-300 text-sky-950'
                    }`}
                  >
                    <Radio className="w-3.5 h-3.5 text-amber-700" />
                    <span className="font-mono text-sm">{metronomeBpm} BPM</span>
                  </button>
                  <button
                    onClick={() => onMetronomeBpmChange(metronomeBpm + 1)}
                    className="w-10 h-10 rounded-xl bg-white/90 hover:bg-white border border-sky-300 text-sky-950 text-base font-black flex items-center justify-center shadow-xs active:scale-95"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* 4. Clear Sound SRS WOW Section */}
              <div className="bg-white/70 backdrop-blur-md rounded-xl p-3 border border-white/90 shadow-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-400 to-teal-500 flex items-center justify-center text-white shadow-2xs">
                    <Sparkles className="w-4 h-4 text-amber-200" />
                  </div>
                  <div>
                    <span className="text-[11px] font-black text-sky-950 block leading-tight">SRS WOW Clear</span>
                    <span className="text-[9px] font-bold text-teal-700">+2dB Vocal Clarity</span>
                  </div>
                </div>
                <button
                  onClick={onToggleClearSound}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black border shadow-2xs transition active:scale-95 ${
                    replayGainEnabled
                      ? 'bg-gradient-to-r from-cyan-400 to-emerald-400 text-slate-950 border-cyan-300 shadow-md'
                      : 'bg-white/80 text-slate-600 border-slate-300'
                  }`}
                >
                  {replayGainEnabled ? 'Aktif' : 'Off'}
                </button>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="pt-3 border-t border-sky-300/60 text-center">
              <button
                onClick={() => setMobileStudioOpen(false)}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-white text-xs font-black shadow-md active:scale-98"
              >
                Tutup Panel
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
