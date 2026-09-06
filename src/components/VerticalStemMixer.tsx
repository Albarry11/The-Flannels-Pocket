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
    borderAccent: 'border-rose-500/50',
    icon: <Mic className="w-4 h-4" />,
  },
  lead: {
    label: 'Lead',
    personil: 'Lead Guitar',
    color: '#f59e0b',
    borderAccent: 'border-amber-500/50',
    icon: <Guitar className="w-4 h-4" />,
  },
  rhythm: {
    label: 'Rhythm',
    personil: 'Rhythm Guitar',
    color: '#10b981',
    borderAccent: 'border-emerald-500/50',
    icon: <Music className="w-4 h-4" />,
  },
  bass: {
    label: 'Bass',
    personil: 'Bassist',
    color: '#06b6d4',
    borderAccent: 'border-cyan-500/50',
    icon: <Disc className="w-4 h-4" />,
  },
  drums: {
    label: 'Drums',
    personil: 'Drummer',
    color: '#8b5cf6',
    borderAccent: 'border-violet-500/50',
    icon: <Sliders className="w-4 h-4" />,
  },
  other: {
    label: 'Master',
    personil: 'Backing',
    color: '#64748b',
    borderAccent: 'border-slate-500/50',
    icon: <Volume2 className="w-4 h-4" />,
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
    <div className="flex flex-col gap-3 h-full max-w-7xl mx-auto w-full">
      {/* Top Bar: Quick Access Shortcuts */}
      <div className="flex items-center justify-between px-3 py-2 rounded-2xl bg-[#091526]/80 border border-cyan-500/25 backdrop-blur-md shadow-sm">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-cyan-300">
            Quick Access:
          </span>
          <button
            onClick={onSoloVocalOnly}
            className="px-3 py-1 rounded-xl bg-rose-500/15 text-rose-300 border border-rose-500/40 hover:bg-rose-500/25 text-xs font-bold transition active:scale-95 shadow-sm"
          >
            🎤 Vokal Solo
          </button>
          <button
            onClick={onSoloRhythmSection}
            className="px-3 py-1 rounded-xl bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/25 text-xs font-bold transition active:scale-95 shadow-sm"
          >
            🥁 Bass + Drums
          </button>
          <button
            onClick={onResetAllStems}
            className="px-2.5 py-1 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-medium transition flex items-center gap-1 border border-slate-700 active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Unmute All</span>
          </button>
        </div>

        <span className="text-[11px] text-slate-400 font-mono hidden md:inline">
          5-Channel Vertical Console Mixer (No Scroll)
        </span>
      </div>

      {/* 5 Vertical Channel Strips Grid */}
      <div className="grid grid-cols-5 gap-2 sm:gap-3.5 flex-1 min-h-[380px] max-h-[520px]">
        {stems.map((stem) => {
          const roleInfo = ROLE_CONFIG[stem.role] || ROLE_CONFIG.other;
          const level = stemLevels[stem.id] || 0;
          const isSilenced = stem.muted || (anySoloActive && !stem.solo);

          return (
            <div
              key={stem.id}
              className={`rounded-2xl p-2 sm:p-3 transition-all flex flex-col justify-between items-center border relative shadow-xl overflow-hidden ${
                stem.solo
                  ? 'bg-gradient-to-b from-amber-950/40 via-[#0e1b2e] to-[#081220] border-amber-400 shadow-[0_0_16px_rgba(245,158,11,0.25)]'
                  : stem.muted
                  ? 'bg-[#060b14]/70 border-rose-500/30 opacity-60'
                  : isSilenced
                  ? 'bg-[#050912]/70 border-cyan-500/15 opacity-40'
                  : 'bg-gradient-to-b from-[#0c182c]/85 via-[#081324]/90 to-[#050c18] border-cyan-500/25 hover:border-cyan-400/50'
              }`}
            >
              {/* Specular top highlight */}
              <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

              {/* 1. Header: Icon & Channel Name */}
              <div className="flex flex-col items-center gap-1 w-full text-center">
                <div
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shadow-inner relative overflow-hidden"
                  style={{
                    backgroundColor: `${roleInfo.color}25`,
                    color: roleInfo.color,
                    border: `1px solid ${roleInfo.color}50`,
                  }}
                >
                  <div className="absolute inset-x-0 top-0 h-1/2 bg-white/20 pointer-events-none" />
                  {roleInfo.icon}
                </div>
                <span className="text-xs sm:text-sm font-extrabold text-white truncate max-w-full tracking-tight">
                  {roleInfo.label}
                </span>
                <span className="text-[9px] sm:text-[10px] text-slate-400 truncate max-w-full font-medium">
                  {roleInfo.personil}
                </span>
              </div>

              {/* 2. Mute (M) & Solo (S) Buttons */}
              <div className="flex items-center gap-1 sm:gap-1.5 my-1.5 w-full justify-center">
                <button
                  onClick={() => onToggleMute(stem.id)}
                  className={`flex-1 min-h-[38px] max-w-[48px] rounded-xl font-black text-xs transition shadow flex items-center justify-center active:scale-95 ${
                    stem.muted
                      ? 'bg-gradient-to-b from-rose-500 to-rose-700 text-white shadow-[0_0_12px_rgba(244,63,94,0.7)] border border-rose-300'
                      : 'bg-[#101b2f] text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700'
                  }`}
                  title={stem.muted ? 'Unmute' : 'Mute Track'}
                >
                  M
                </button>
                <button
                  onClick={() => onToggleSolo(stem.id)}
                  className={`flex-1 min-h-[38px] max-w-[48px] rounded-xl font-black text-xs transition shadow flex items-center justify-center active:scale-95 ${
                    stem.solo
                      ? 'bg-gradient-to-b from-amber-400 to-amber-600 text-black shadow-[0_0_16px_rgba(245,158,11,0.8)] border border-amber-200'
                      : 'bg-[#101b2f] text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700'
                  }`}
                  title={stem.solo ? 'Matikan Solo' : 'Solo Track'}
                >
                  S
                </button>
              </div>

              {/* 3. Stereo Pan Knob / Slider */}
              <div className="flex flex-col items-center w-full px-1 mb-2">
                <div className="flex justify-between w-full text-[9px] font-mono text-cyan-300/70">
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
                  className="w-full h-1.5 accent-cyan-400"
                  title={`Pan: ${stem.pan}`}
                />
              </div>

              {/* 4. Center: Vertical Fader + LED VU Meter */}
              <div className="flex items-center justify-center gap-2 flex-1 w-full my-1 relative py-1">
                {/* dB Scale Markings */}
                <div className="flex flex-col justify-between h-36 text-[8px] font-mono text-slate-500 select-none text-right pr-0.5">
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
                    className="w-36 h-3 accent-cyan-400 -rotate-90 origin-center cursor-pointer"
                    title={`Volume: ${Math.round(stem.volume * 100)}%`}
                  />
                </div>

                {/* Vertical LED VU Meter */}
                <div className="w-2.5 h-36 bg-[#040812] rounded-sm overflow-hidden flex flex-col-reverse p-0.5 border border-cyan-500/30 shadow-inner">
                  <div
                    className="w-full rounded-xs transition-all duration-75"
                    style={{
                      height: `${Math.min(100, Math.round(level * 100))}%`,
                      backgroundColor: level > 0.85 ? '#ef4444' : level > 0.6 ? '#f59e0b' : '#06b6d4',
                      boxShadow: level > 0.1 ? `0 0 6px ${level > 0.85 ? '#ef4444' : '#06b6d4'}` : 'none',
                    }}
                  />
                </div>
              </div>

              {/* 5. Bottom: Volume readout & Status */}
              <div className="w-full text-center pt-2 border-t border-cyan-500/15">
                <span className="text-xs font-mono font-bold text-cyan-300 block">
                  {Math.round(stem.volume * 100)}%
                </span>
                <span className="text-[9px] font-mono text-slate-500 truncate block">
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
