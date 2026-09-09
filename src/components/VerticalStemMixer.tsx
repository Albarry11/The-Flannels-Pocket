import React, { useEffect, useRef } from 'react';
import type { StemTrack, StemRole } from '../types';
import { globalAudioEngine } from '../services/audioEngine';
import { Mic, Guitar, Disc, Sliders, Music, RotateCcw } from 'lucide-react';

interface VerticalStemMixerProps {
  stems: StemTrack[];
  stemLevels?: Record<string, number>;
  onVolumeChange: (stemId: string, volume: number) => void;
  onPanChange: (stemId: string, pan: number) => void;
  onToggleMute: (stemId: string) => void;
  onToggleSolo: (stemId: string) => void;
  onSoloVocalOnly: () => void;
  onSoloGuitarOnly: () => void;
  onSoloRhythmSection: () => void;
  onResetAllStems: () => void;
  onCycleEqPreset: (stemId: string) => void;
  getEqPresetLabel: (stemId: string) => string;
}

const ROLE_CONFIG: Record<
  StemRole,
  { label: string; personil: string; color: string; borderAccent: string; icon: React.ReactNode }
> = {
  vocal: {
    label: 'Vocal',
    personil: 'Vokalis',
    color: '#f43f5e',
    borderAccent: 'border-rose-400',
    icon: <Mic className="w-4 h-4 text-rose-600" />,
  },
  guitar: {
    label: 'Guitar',
    personil: 'Gitaris',
    color: '#f59e0b',
    borderAccent: 'border-amber-400',
    icon: <Guitar className="w-4 h-4 text-amber-600" />,
  },
  lead: {
    label: 'Lead',
    personil: 'Lead Guitar',
    color: '#f59e0b',
    borderAccent: 'border-amber-400',
    icon: <Guitar className="w-4 h-4 text-amber-600" />,
  },
  rhythm: {
    label: 'Rhythm',
    personil: 'Rhythm Guitar',
    color: '#10b981',
    borderAccent: 'border-emerald-400',
    icon: <Music className="w-4 h-4 text-emerald-600" />,
  },
  bass: {
    label: 'Bass',
    personil: 'Bassist',
    color: '#06b6d4',
    borderAccent: 'border-cyan-400',
    icon: <Disc className="w-4 h-4 text-sky-600" />,
  },
  drums: {
    label: 'Drums',
    personil: 'Drummer',
    color: '#8b5cf6',
    borderAccent: 'border-indigo-400',
    icon: <Sliders className="w-4 h-4 text-indigo-600" />,
  },
  piano: {
    label: 'Keys',
    personil: 'Keyboard / Piano',
    color: '#3b82f6',
    borderAccent: 'border-blue-400',
    icon: <Music className="w-4 h-4 text-blue-600" />,
  },
  other: {
    label: 'Backing',
    personil: 'Synths / Other',
    color: '#64748b',
    borderAccent: 'border-slate-400',
    icon: <Music className="w-4 h-4 text-slate-600" />,
  },
};

export const VerticalStemMixer: React.FC<VerticalStemMixerProps> = ({
  stems,
  onVolumeChange,
  onPanChange,
  onToggleMute,
  onToggleSolo,
  onSoloVocalOnly,
  onSoloGuitarOnly,
  onSoloRhythmSection,
  onResetAllStems,
  onCycleEqPreset,
  getEqPresetLabel,
}) => {
  const anySoloActive = stems.some((s) => s.solo);
  // Show discrete band instruments (filter out 'other' by default unless it's a specific track)
  const visibleStems = stems.filter((s) => s.role !== 'other');
  const meterRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const visibleStemIds = visibleStems.map((s) => s.id).join('|');

  // Direct DOM VU Meter Animation (Decoupled from React State -> 0 Main-Thread Lag & 0 Glitches)
  // Re-run only when the set of visible stem IDs changes, not on every volume/pan tweak
  useEffect(() => {
    let animId: number;
    const stemIds = visibleStemIds.split('|');

    const updateMeters = () => {
      if (globalAudioEngine.getIsPlaying()) {
        stemIds.forEach((stemId) => {
          const el = meterRefs.current[stemId];
          if (el) {
            const level = globalAudioEngine.getStemLevel(stemId);
            const heightPct = Math.min(100, Math.round(level * 100));
            el.style.height = `${heightPct}%`;
            el.style.backgroundColor = level > 0.85 ? '#ef4444' : level > 0.6 ? '#f59e0b' : '#10b981';
            el.style.boxShadow = level > 0.1 ? `0 0 8px ${level > 0.85 ? '#ef4444' : '#10b981'}` : 'none';
          }
        });
      } else {
        stemIds.forEach((stemId) => {
          const el = meterRefs.current[stemId];
          if (el) {
            el.style.height = '0%';
            el.style.boxShadow = 'none';
          }
        });
      }
      animId = requestAnimationFrame(updateMeters);
    };

    animId = requestAnimationFrame(updateMeters);
    return () => cancelAnimationFrame(animId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleStemIds]);

  return (
    <div className="flex flex-col gap-2.5 h-[calc(100vh-230px)] min-h-[380px] max-h-[520px] max-w-5xl mx-auto w-full overflow-hidden select-none">
      {/* Top Bar: Quick Access Shortcuts (Point 6) */}
      <div className="flex items-center justify-between px-4 py-2 rounded-full bg-white/80 border border-sky-200/90 backdrop-blur-md shadow-xs flex-wrap gap-2 flex-shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-black uppercase tracking-wider text-sky-950">
            Quick Access:
          </span>
          <button
            onClick={onSoloVocalOnly}
            className="px-3 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-300 hover:bg-rose-200 text-xs font-bold transition active:scale-95 shadow-2xs"
          >
            🎤 Vokal Solo
          </button>
          <button
            onClick={onSoloGuitarOnly}
            className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200 text-xs font-bold transition active:scale-95 shadow-2xs"
          >
            🎸 Gitar Solo
          </button>
          <button
            onClick={onSoloRhythmSection}
            className="px-3 py-1 rounded-full bg-sky-100 text-sky-800 border border-sky-300 hover:bg-sky-200 text-xs font-bold transition active:scale-95 shadow-2xs"
          >
            🥁 Bass + Drums
          </button>
          <button
            onClick={onResetAllStems}
            className="px-3 py-1 rounded-full bg-white text-slate-700 hover:bg-slate-100 text-xs font-bold transition flex items-center gap-1 border border-slate-300 active:scale-95 shadow-2xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Unmute All</span>
          </button>
        </div>

        <span className="text-[11px] text-sky-800 font-medium hidden md:inline">
          Console Mixer (Satu Baris • Bebas Scroll)
        </span>
      </div>

      {/* Point 5: 1 Single Row Grid (No scrolling) - 4 Core Channels (Vocal | Guitar | Bass | Drums) */}
      <div
        className={`grid gap-3 sm:gap-4 flex-1 h-full min-h-0 ${
          visibleStems.length <= 4 ? 'grid-cols-4' : 'grid-cols-5'
        }`}
      >
        {visibleStems.map((stem) => {
          const roleInfo = ROLE_CONFIG[stem.role] || ROLE_CONFIG.guitar;
          const isSilenced = stem.muted || (anySoloActive && !stem.solo);

          return (
            <div
              key={stem.id}
              className={`rounded-3xl p-3 transition-all flex flex-col justify-between items-center border relative shadow-md overflow-hidden ${
                stem.solo
                  ? 'bg-gradient-to-b from-amber-100/95 to-amber-50/95 border-amber-400 shadow-[0_8px_24px_rgba(245,158,11,0.25)] ring-2 ring-amber-400/60'
                  : stem.muted
                  ? 'bg-rose-50/60 border-rose-200 opacity-60'
                  : isSilenced
                  ? 'bg-white/40 border-sky-100 opacity-40'
                  : 'bg-white/80 hover:bg-white/95 border-white/90 shadow-[0_8px_20px_rgba(2,132,199,0.08)]'
              }`}
            >
              {/* Specular top highlight */}
              <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-white to-transparent pointer-events-none" />

              {/* 1. Header: Icon & Channel Name */}
              <div className="flex flex-col items-center gap-0.5 w-full text-center flex-shrink-0">
                <div className="w-8 h-8 rounded-2xl flex items-center justify-center shadow-xs relative overflow-hidden bg-sky-100/80 border border-sky-300/60">
                  {roleInfo.icon}
                </div>
                <span className="text-xs sm:text-sm font-black text-[#0f2942] truncate max-w-full tracking-tight">
                  {roleInfo.label}
                </span>
                <span className="text-[10px] text-sky-800 font-semibold truncate max-w-full">
                  {roleInfo.personil}
                </span>
              </div>

              {/* 2. Mute (M) & Solo (S) Buttons */}
              <div className="flex items-center gap-1.5 my-1 w-full justify-center flex-shrink-0">
                <button
                  onClick={() => onToggleMute(stem.id)}
                  className={`flex-1 min-h-[34px] max-w-[46px] rounded-2xl font-black text-xs transition shadow flex items-center justify-center active:scale-90 ${
                    stem.muted
                      ? 'bg-gradient-to-b from-rose-500 to-rose-700 text-white shadow-md shadow-rose-500/40 border border-rose-300'
                      : 'bg-white hover:bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                  title={stem.muted ? 'Unmute' : 'Mute Track'}
                >
                  M
                </button>
                <button
                  onClick={() => onToggleSolo(stem.id)}
                  className={`flex-1 min-h-[34px] max-w-[46px] rounded-2xl font-black text-xs transition shadow flex items-center justify-center active:scale-90 ${
                    stem.solo
                      ? 'bg-gradient-to-b from-amber-400 to-amber-600 text-white shadow-md shadow-amber-500/40 border border-amber-200'
                      : 'bg-white hover:bg-amber-50 text-amber-800 border border-amber-200'
                  }`}
                  title={stem.solo ? 'Matikan Solo' : 'Solo Track'}
                >
                  S
                </button>
              </div>

              {/* 3. Stereo Pan Knob / Slider */}
              <div className="flex flex-col items-center w-full px-1 mb-1 flex-shrink-0">
                <div className="flex justify-between w-full text-[9px] font-mono text-sky-800 font-bold">
                  <span>L</span>
                  <span>{stem.pan === 0 ? 'C' : stem.pan < 0 ? `L${Math.round(Math.abs(stem.pan) * 50)}` : `R${Math.round(stem.pan * 50)}`}</span>
                  <span>R</span>
                </div>
                <input
                  type="range"
                  min="-1"
                  max="1"
                  step="0.05"
                  value={stem.pan}
                  onChange={(e) => onPanChange(stem.id, parseFloat(e.target.value))}
                  className="w-full h-1"
                  title={`Pan: ${stem.pan}`}
                />
              </div>

              {/* 4. Center: Vertical Fader + LED VU Meter (Height adjusted to fit screen with 0 scroll) */}
              <div className="flex items-center justify-center gap-2 flex-1 w-full my-0.5 relative py-0.5 overflow-hidden">
                {/* dB Scale Markings */}
                <div className="flex flex-col justify-between h-28 text-[7px] font-mono text-sky-800 select-none text-right pr-0.5 font-bold">
                  <span>+6</span>
                  <span>0</span>
                  <span>-6</span>
                  <span>-18</span>
                  <span>-∞</span>
                </div>

                {/* Vertical Slider Track */}
                <div className="h-28 flex items-center justify-center relative">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={stem.volume}
                    onChange={(e) => onVolumeChange(stem.id, parseFloat(e.target.value))}
                    className="w-28 h-2.5 -rotate-90 origin-center cursor-pointer"
                    title={`Volume: ${Math.round(stem.volume * 100)}%`}
                  />
                </div>

                {/* Vertical LED VU Meter (Direct DOM Ref Animate) */}
                <div className="w-2 h-28 bg-sky-950/80 rounded-full overflow-hidden flex flex-col-reverse p-0.5 border border-sky-300 shadow-inner">
                  <div
                    ref={(el) => {
                      meterRefs.current[stem.id] = el;
                    }}
                    className="w-full rounded-full transition-all duration-75"
                    style={{
                      height: '0%',
                      backgroundColor: '#10b981',
                    }}
                  />
                </div>
              </div>

              {/* 5. Bottom: Volume readout, Status & Tone Preset */}
              <div className="w-full text-center pt-1 border-t border-sky-100 flex-shrink-0 flex flex-col items-center gap-1">
                <div className="flex items-center justify-between w-full px-1">
                  <span className="text-xs font-mono font-black text-[#0f2942]">
                    {Math.round(stem.volume * 100)}%
                  </span>
                  <span className="text-[9px] font-mono font-extrabold text-sky-700 truncate">
                    {stem.muted ? 'MUTED' : isSilenced ? 'SILENCED' : 'ON'}
                  </span>
                </div>
                {/* Tone Preset Pill */}
                <button
                  onClick={() => onCycleEqPreset(stem.id)}
                  className="w-full py-0.5 px-1 rounded-lg text-[9px] font-bold bg-sky-100/90 hover:bg-sky-200 text-sky-950 border border-sky-300 transition truncate active:scale-95 shadow-2xs flex items-center justify-center gap-1"
                  title="Klik untuk ganti karakter tone EQ (Flat, Vokal Jernih, Gitar Tajam, Bass Tebal, Drum Ringan)"
                  aria-label="Ubah preset EQ stem"
                >
                  <Music className="w-2.5 h-2.5 text-sky-600 flex-shrink-0" />
                  <span className="truncate">{getEqPresetLabel(stem.id)}</span>
                </button>
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
};
