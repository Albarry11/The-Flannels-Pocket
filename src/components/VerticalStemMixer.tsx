import React from 'react';
import type { StemTrack, StemRole } from '../types';
import { Mic, Guitar, Music, Disc, Sliders, Volume2, RotateCcw } from 'lucide-react';

interface VerticalStemMixerProps {
  stems: StemTrack[];
  stemLevels: Record<string, number>;
  onVolumeChange: (stemId: string, volume: number) => void;
  onPanChange: (stemId: string, pan: number) => void;
  onToggleMute: (stemId: string) => void;
  onToggleSolo: (stemId: string) => void;
  onSoloVocalOnly: () => void;
  onSoloRhythmSection: () => void;
  onResetAllStems: () => void;
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
    label: 'Master',
    personil: 'Backing',
    color: '#64748b',
    borderAccent: 'border-slate-400',
    icon: <Volume2 className="w-4 h-4 text-slate-600" />,
  },
};

export const VerticalStemMixer: React.FC<VerticalStemMixerProps> = ({
  stems,
  stemLevels,
  onVolumeChange,
  onPanChange,
  onToggleMute,
  onToggleSolo,
  onSoloVocalOnly,
  onSoloRhythmSection,
  onResetAllStems,
}) => {
  const anySoloActive = stems.some((s) => s.solo);

  return (
    <div className="flex flex-col gap-3 h-full max-w-5xl mx-auto w-full">
      {/* Top Bar: Quick Access Shortcuts (Point 6) */}
      <div className="flex items-center justify-between px-4 py-2.5 rounded-full bg-white/75 border border-sky-200/80 backdrop-blur-md shadow-xs flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-black uppercase tracking-wider text-sky-900">
            Quick Access:
          </span>
          <button
            onClick={onSoloVocalOnly}
            className="px-3.5 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-300 hover:bg-rose-200 text-xs font-bold transition active:scale-95 shadow-2xs"
          >
            🎤 Vokal Solo
          </button>
          <button
            onClick={onSoloRhythmSection}
            className="px-3.5 py-1 rounded-full bg-sky-100 text-sky-800 border border-sky-300 hover:bg-sky-200 text-xs font-bold transition active:scale-95 shadow-2xs"
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
          5-Channel Vertical Console Mixer (No Scroll)
        </span>
      </div>

      {/* 5 Vertical Channel Strips Grid (Aero Glass Style) */}
      <div className="grid grid-cols-5 gap-2.5 sm:gap-4 flex-1 min-h-[400px] max-h-[540px]">
        {stems.map((stem) => {
          const roleInfo = ROLE_CONFIG[stem.role] || ROLE_CONFIG.other;
          const level = stemLevels[stem.id] || 0;
          const isSilenced = stem.muted || (anySoloActive && !stem.solo);

          return (
            <div
              key={stem.id}
              className={`rounded-3xl p-3 transition-all flex flex-col justify-between items-center border relative shadow-md overflow-hidden ${
                stem.solo
                  ? 'bg-gradient-to-b from-amber-100/90 to-amber-50/95 border-amber-400 shadow-[0_8px_24px_rgba(245,158,11,0.25)] ring-2 ring-amber-400/60'
                  : stem.muted
                  ? 'bg-rose-50/60 border-rose-200 opacity-60'
                  : isSilenced
                  ? 'bg-white/40 border-sky-100 opacity-40'
                  : 'bg-white/75 hover:bg-white/90 border-white/80 shadow-[0_8px_20px_rgba(2,132,199,0.08)]'
              }`}
            >
              {/* Specular top highlight */}
              <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-white to-transparent pointer-events-none" />

              {/* 1. Header: Icon & Channel Name */}
              <div className="flex flex-col items-center gap-1 w-full text-center">
                <div
                  className="w-9 h-9 rounded-2xl flex items-center justify-center shadow-xs relative overflow-hidden bg-sky-100/80 border border-sky-300/60"
                >
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
              <div className="flex items-center gap-1.5 my-1.5 w-full justify-center">
                <button
                  onClick={() => onToggleMute(stem.id)}
                  className={`flex-1 min-h-[38px] max-w-[48px] rounded-2xl font-black text-xs transition shadow flex items-center justify-center active:scale-90 ${
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
                  className={`flex-1 min-h-[38px] max-w-[48px] rounded-2xl font-black text-xs transition shadow flex items-center justify-center active:scale-90 ${
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
              <div className="flex flex-col items-center w-full px-1 mb-2">
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
                  className="w-full h-1.5"
                  title={`Pan: ${stem.pan}`}
                />
              </div>

              {/* 4. Center: Vertical Fader + LED VU Meter */}
              <div className="flex items-center justify-center gap-2 flex-1 w-full my-1 relative py-1">
                {/* dB Scale Markings */}
                <div className="flex flex-col justify-between h-36 text-[8px] font-mono text-sky-800 select-none text-right pr-0.5 font-bold">
                  <span>+6</span>
                  <span>0</span>
                  <span>-6</span>
                  <span>-18</span>
                  <span>-∞</span>
                </div>

                {/* Vertical Slider Track */}
                <div className="h-36 flex items-center justify-center relative">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={stem.volume}
                    onChange={(e) => onVolumeChange(stem.id, parseFloat(e.target.value))}
                    className="w-36 h-3 -rotate-90 origin-center cursor-pointer"
                    title={`Volume: ${Math.round(stem.volume * 100)}%`}
                  />
                </div>

                {/* Vertical LED VU Meter */}
                <div className="w-2.5 h-36 bg-sky-950/80 rounded-full overflow-hidden flex flex-col-reverse p-0.5 border border-sky-300 shadow-inner">
                  <div
                    className="w-full rounded-full transition-all duration-75"
                    style={{
                      height: `${Math.min(100, Math.round(level * 100))}%`,
                      backgroundColor: level > 0.85 ? '#ef4444' : level > 0.6 ? '#f59e0b' : '#10b981',
                      boxShadow: level > 0.1 ? `0 0 8px ${level > 0.85 ? '#ef4444' : '#10b981'}` : 'none',
                    }}
                  />
                </div>
              </div>

              {/* 5. Bottom: Volume readout & Status */}
              <div className="w-full text-center pt-2 border-t border-sky-100">
                <span className="text-xs font-mono font-black text-[#0f2942] block">
                  {Math.round(stem.volume * 100)}%
                </span>
                <span className="text-[9px] font-mono font-extrabold text-sky-700 truncate block">
                  {stem.muted ? 'MUTED' : isSilenced ? 'SILENCED' : 'ON'}
                </span>
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
};
