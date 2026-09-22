import React, { useEffect, useRef } from 'react';
import type { StemTrack, StemRole } from '../types';
import { globalAudioEngine } from '../services/audioEngine';
import { Mic, Guitar, Disc, Sliders, Music, RotateCcw, Sparkles } from 'lucide-react';

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
  onCycleEqPreset?: (stemId: string) => void;
  getEqPresetLabel?: (stemId: string) => string;
}

const ROLE_CONFIG: Record<
  StemRole,
  { label: string; personil: string; color: string; borderAccent: string; icon: React.ReactNode; tapeLabel: string }
> = {
  vocal: {
    label: 'Vocal',
    personil: 'Vokalis',
    color: '#f43f5e',
    borderAccent: 'border-rose-400',
    icon: <Mic className="w-3.5 h-3.5 text-rose-400" />,
    tapeLabel: 'CH 1 • VOCAL',
  },
  guitar: {
    label: 'Guitar',
    personil: 'Gitaris',
    color: '#f59e0b',
    borderAccent: 'border-amber-400',
    icon: <Guitar className="w-3.5 h-3.5 text-amber-400" />,
    tapeLabel: 'CH 2 • GUITAR',
  },
  lead: {
    label: 'Lead',
    personil: 'Lead Guitar',
    color: '#f59e0b',
    borderAccent: 'border-amber-400',
    icon: <Guitar className="w-3.5 h-3.5 text-amber-400" />,
    tapeLabel: 'CH 2A • LEAD',
  },
  rhythm: {
    label: 'Rhythm',
    personil: 'Rhythm Guitar',
    color: '#10b981',
    borderAccent: 'border-emerald-400',
    icon: <Music className="w-3.5 h-3.5 text-emerald-400" />,
    tapeLabel: 'CH 2B • RHYTHM',
  },
  bass: {
    label: 'Bass',
    personil: 'Bassist',
    color: '#06b6d4',
    borderAccent: 'border-cyan-400',
    icon: <Disc className="w-3.5 h-3.5 text-cyan-400" />,
    tapeLabel: 'CH 3 • BASS',
  },
  drums: {
    label: 'Drums',
    personil: 'Drummer',
    color: '#8b5cf6',
    borderAccent: 'border-indigo-400',
    icon: <Sliders className="w-3.5 h-3.5 text-indigo-400" />,
    tapeLabel: 'CH 4 • DRUMS',
  },
  piano: {
    label: 'Keys',
    personil: 'Keyboard / Piano',
    color: '#3b82f6',
    borderAccent: 'border-blue-400',
    icon: <Music className="w-3.5 h-3.5 text-blue-400" />,
    tapeLabel: 'CH 5 • KEYS',
  },
  other: {
    label: 'Backing',
    personil: 'Synths / Other',
    color: '#64748b',
    borderAccent: 'border-slate-400',
    icon: <Music className="w-3.5 h-3.5 text-slate-400" />,
    tapeLabel: 'CH 6 • TRACK',
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
}) => {
  const anySoloActive = stems.some((s) => s.solo);
  // Pure 4-stem band mix: Vocal, Guitar, Bass, Drums only (exclude any 'other' stem)
  const visibleStems = stems.filter((s) => s.role !== 'other');
  const meterRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const mobileMeterRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const visibleStemIds = visibleStems.map((s) => s.id).join('|');

  // Direct DOM VU Meter Animation with 0 transition lag
  useEffect(() => {
    let animId: number;
    const stemIds = visibleStemIds.split('|');

    const updateMeters = () => {
      const isPlaying = globalAudioEngine.getIsPlaying();
      stemIds.forEach((stemId) => {
        const level = isPlaying ? globalAudioEngine.getStemLevel(stemId) : 0;
        const heightPct = Math.min(100, Math.round(level * 100));
        const bg = level > 0.85 ? '#ef4444' : level > 0.6 ? '#f59e0b' : '#10b981';
        const shadow = level > 0.1 ? `0 0 6px ${bg}` : 'none';

        const el = meterRefs.current[stemId];
        if (el) {
          el.style.height = `${heightPct}%`;
          el.style.backgroundColor = bg;
          el.style.boxShadow = shadow;
        }

        const mEl = mobileMeterRefs.current[stemId];
        if (mEl) {
          mEl.style.height = `${heightPct}%`;
          mEl.style.backgroundColor = bg;
          mEl.style.boxShadow = shadow;
        }
      });
      animId = requestAnimationFrame(updateMeters);
    };

    animId = requestAnimationFrame(updateMeters);
    return () => cancelAnimationFrame(animId);
  }, [visibleStemIds]);

  return (
    <div className="flex flex-col gap-1.5 flex-1 h-full min-h-0 max-w-6xl mx-auto w-full select-none pb-0.5">
      {/* Top Bar: Compact Sleek Frutiger Aero Quick Access Bar */}
      <div className="flex items-center justify-between px-2.5 sm:px-3 py-1 rounded-xl bg-white/35 border border-white/75 backdrop-blur-2xl saturate-[190%] shadow-xs gap-1.5 flex-shrink-0">
        <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar py-0.2">
          <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-sky-950 flex items-center gap-1 flex-shrink-0">
            <Sparkles className="w-3 h-3 text-cyan-600" />
            <span>Quick:</span>
          </span>

          <button
            onClick={onSoloVocalOnly}
            className="px-2 sm:px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black text-rose-950 bg-gradient-to-b from-rose-200/80 via-rose-300/75 to-rose-400/85 backdrop-blur-md border border-rose-200/90 shadow-2xs hover:brightness-105 active:scale-95 transition flex-shrink-0"
          >
            🎤 Vokal
          </button>
          <button
            onClick={onSoloGuitarOnly}
            className="px-2 sm:px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black text-amber-950 bg-gradient-to-b from-amber-200/80 via-amber-300/75 to-amber-400/85 backdrop-blur-md border border-amber-200/90 shadow-2xs hover:brightness-105 active:scale-95 transition flex-shrink-0"
          >
            🎸 Gitar
          </button>
          <button
            onClick={onSoloRhythmSection}
            className="px-2 sm:px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black text-cyan-950 bg-gradient-to-b from-cyan-200/80 via-sky-300/75 to-cyan-400/85 backdrop-blur-md border border-cyan-200/90 shadow-2xs hover:brightness-105 active:scale-95 transition flex-shrink-0"
          >
            🥁 Bass+Drum
          </button>
          <button
            onClick={onResetAllStems}
            className="px-2 sm:px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black text-slate-800 bg-gradient-to-b from-white/80 via-white/60 to-slate-200/75 backdrop-blur-md border border-white/90 shadow-2xs hover:brightness-105 active:scale-95 transition flex items-center gap-1 flex-shrink-0"
          >
            <RotateCcw className="w-2.5 h-2.5 text-slate-600" />
            <span>Unmute</span>
          </button>
        </div>

        <div className="hidden lg:flex items-center gap-1.5 flex-shrink-0">
          <span className="text-[9px] font-mono font-bold text-sky-900 px-1.5 py-0.2 rounded bg-white/60 backdrop-blur-md border border-sky-200/80">
            SSL 4000 E • 4 Discrete Stems
          </span>
        </div>
      </div>

      {/* ================= DESKTOP / TABLET DAW CONSOLE STRIP (sm:grid) ================= */}
      {/* Displays stems extending all the way down to bottom dock without clipping */}
      <div
        className={`hidden sm:grid gap-2 sm:gap-3 flex-1 h-full min-h-0 ${
          visibleStems.length <= 4 ? 'grid-cols-4' : 'grid-cols-5'
        }`}
      >
        {visibleStems.map((stem) => {
          const roleInfo = ROLE_CONFIG[stem.role] || ROLE_CONFIG.guitar;
          const isSilenced = stem.muted || (anySoloActive && !stem.solo);

          return (
            <div
              key={stem.id}
              className={`rounded-2xl p-2.5 transition-all flex flex-col justify-between items-center border relative shadow-xl overflow-hidden h-full backdrop-blur-2xl saturate-[190%] ${
                stem.solo
                  ? 'bg-gradient-to-b from-[#24354a]/55 via-[#18283a]/45 to-[#0c1824]/50 border-amber-400/90 shadow-[0_0_24px_rgba(245,158,11,0.25),inset_0_1.5px_0_rgba(255,255,255,0.5)] ring-2 ring-amber-400/50'
                  : stem.muted
                  ? 'bg-gradient-to-b from-[#141b24]/35 via-[#0e141c]/30 to-[#080d13]/35 border-rose-500/35 opacity-70 shadow-[inset_0_1.5px_0_rgba(255,255,255,0.2)]'
                  : isSilenced
                  ? 'bg-gradient-to-b from-[#121922]/30 via-[#0d131a]/25 to-[#070b10]/30 border-slate-700/35 opacity-50 shadow-[inset_0_1.5px_0_rgba(255,255,255,0.15)]'
                  : 'bg-gradient-to-b from-[#1b2b3d]/45 via-[#121f2d]/38 to-[#091522]/48 border-sky-400/40 hover:border-sky-300/70 shadow-[0_8px_32px_rgba(0,0,0,0.2),inset_0_1.5px_0_rgba(255,255,255,0.35)]'
              }`}
            >
              {/* Corner Metallic Screws */}
              <div className="absolute top-1.5 left-1.5 w-1.5 h-1.5 rounded-full bg-gradient-to-br from-slate-400 to-slate-700 border border-slate-900 shadow-inner pointer-events-none" />
              <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-gradient-to-br from-slate-400 to-slate-700 border border-slate-900 shadow-inner pointer-events-none" />
              <div className="absolute bottom-1.5 left-1.5 w-1.5 h-1.5 rounded-full bg-gradient-to-br from-slate-400 to-slate-700 border border-slate-900 shadow-inner pointer-events-none" />
              <div className="absolute bottom-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-gradient-to-br from-slate-400 to-slate-700 border border-slate-900 shadow-inner pointer-events-none" />

              {/* Specular Highlight */}
              <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/50 to-transparent pointer-events-none" />

              {/* 1. Header: Colored Console Channel Badge & LED Dot */}
              <div className="flex flex-col items-center gap-0.5 w-full text-center flex-shrink-0 pt-0.5">
                <div
                  className="w-full py-0.5 px-1.5 rounded-lg flex items-center justify-between shadow-inner border"
                  style={{
                    backgroundColor: `${roleInfo.color}15`,
                    borderColor: `${roleInfo.color}40`,
                  }}
                >
                  <div className="flex items-center gap-1">
                    {roleInfo.icon}
                    <span className="text-[11px] font-black tracking-tight text-white uppercase">
                      {roleInfo.label}
                    </span>
                  </div>
                  <div
                    className="w-1.5 h-1.5 rounded-full animate-pulse shadow-sm"
                    style={{
                      backgroundColor: isSilenced ? '#64748b' : roleInfo.color,
                      boxShadow: isSilenced ? 'none' : `0 0 6px ${roleInfo.color}`,
                    }}
                  />
                </div>
              </div>

              {/* 2. Hardware Console Mute & Solo Push Buttons */}
              <div className="flex items-center gap-1.5 w-full justify-center my-1 flex-shrink-0">
                <button
                  onClick={() => onToggleMute(stem.id)}
                  className={`flex-1 py-1 rounded-md text-[10px] font-black border transition-all shadow-xs flex items-center justify-center active:scale-95 ${
                    stem.muted
                      ? 'bg-gradient-to-b from-rose-500 to-red-600 text-white border-rose-300 shadow-[0_0_10px_rgba(244,63,94,0.6)]'
                      : 'bg-gradient-to-b from-slate-800 to-slate-900 text-slate-400 border-slate-700 hover:border-rose-400 hover:text-white'
                  }`}
                  title={stem.muted ? 'Nyalakan Stem (Unmute)' : 'Matikan Suara Stem (Mute)'}
                >
                  MUTE
                </button>
                <button
                  onClick={() => onToggleSolo(stem.id)}
                  className={`flex-1 py-1 rounded-md text-[10px] font-black border transition-all shadow-xs flex items-center justify-center active:scale-95 ${
                    stem.solo
                      ? 'bg-gradient-to-b from-amber-400 to-yellow-500 text-slate-950 border-amber-200 shadow-[0_0_12px_rgba(251,191,36,0.7)]'
                      : 'bg-gradient-to-b from-slate-800 to-slate-900 text-slate-400 border-slate-700 hover:border-amber-400 hover:text-white'
                  }`}
                  title={stem.solo ? 'Matikan Solo' : 'Solo Track'}
                >
                  SOLO
                </button>
              </div>

              {/* 3. Stereo Pan Slider */}
              <div className="flex flex-col items-center w-full px-1 mb-1 flex-shrink-0">
                <div className="flex justify-between w-full text-[8px] font-mono text-slate-400 font-bold mb-0.5">
                  <span>L</span>
                  <span className="text-cyan-400">
                    {stem.pan === 0
                      ? 'PAN C'
                      : stem.pan < 0
                      ? `L${Math.round(Math.abs(stem.pan) * 50)}`
                      : `R${Math.round(stem.pan * 50)}`}
                  </span>
                  <span>R</span>
                </div>
                <input
                  type="range"
                  min="-1"
                  max="1"
                  step="0.05"
                  defaultValue={stem.pan}
                  onInput={(e) => {
                    const val = parseFloat((e.target as HTMLInputElement).value);
                    globalAudioEngine.setStemPan(stem.id, val);
                  }}
                  onChange={(e) => onPanChange(stem.id, parseFloat(e.target.value))}
                  className="w-full h-1 accent-cyan-400 cursor-pointer"
                  title={`Pan: ${stem.pan}`}
                />
              </div>

              {/* 4. Center: Rotary Potentiometer (Compact / Mobile Landscape) & Long-Throw Fader (Tall Desktop) */}
              <div className="flex items-center justify-center gap-2 flex-1 w-full my-0.5 relative py-0.5 overflow-hidden">
                {/* Hardware Rotary Potentiometer Dial (Mobile Landscape & Compact Heights) */}
                <div className="flex xl:hidden flex-col items-center justify-center relative my-0.5">
                  <div className="flex items-center gap-2">
                    {/* Rotary Potentiometer Dial */}
                    <div className="relative w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center">
                      <svg className="w-14 h-14 sm:w-16 sm:h-16 -rotate-90 pointer-events-none" viewBox="0 0 48 48">
                        <circle
                          cx="24"
                          cy="24"
                          r="19"
                          className="stroke-slate-800/80 fill-none"
                          strokeWidth="3.5"
                          strokeDasharray="89.5 120"
                          strokeLinecap="round"
                        />
                        <circle
                          cx="24"
                          cy="24"
                          r="19"
                          className="stroke-cyan-400 fill-none transition-all duration-75"
                          strokeWidth="3.5"
                          strokeDasharray={`${stem.volume * 89.5} 120`}
                          strokeLinecap="round"
                        />
                      </svg>

                      {/* Rotary Dial Knob with Needle Notch */}
                      <div
                        className="absolute w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gradient-to-b from-slate-700 via-slate-800 to-slate-950 border border-slate-600 shadow-[0_2px_8px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.3)] flex items-center justify-center pointer-events-none transition-transform duration-75"
                        style={{ transform: `rotate(${(stem.volume * 270) - 135}deg)` }}
                      >
                        <div className="absolute top-1 w-1 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />
                      </div>

                      {/* Clear Center Percentage Display */}
                      <span className="absolute font-mono font-black text-[11px] sm:text-xs text-white pointer-events-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                        {Math.round(stem.volume * 100)}%
                      </span>

                      {/* Interactive Slider Overlay */}
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={stem.volume}
                        onInput={(e) => {
                          const val = parseFloat((e.target as HTMLInputElement).value);
                          globalAudioEngine.setStemVolume(stem.id, val);
                        }}
                        onChange={(e) => onVolumeChange(stem.id, parseFloat(e.target.value))}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full touch-none z-10"
                        title={`Volume: ${Math.round(stem.volume * 100)}%`}
                        aria-label={`Volume: ${Math.round(stem.volume * 100)}%`}
                      />
                    </div>

                    {/* Vertical Mini LED VU Meter */}
                    <div className="w-2 h-14 bg-[#04080e] rounded-full overflow-hidden flex flex-col-reverse p-0.5 border border-slate-700 shadow-inner flex-shrink-0">
                      <div
                        ref={(el) => {
                          mobileMeterRefs.current[stem.id] = el;
                        }}
                        className="w-full rounded-full"
                        style={{
                          height: '0%',
                          backgroundColor: '#10b981',
                          transition: 'none',
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Long-Throw Vertical Fader (Large Screens with Plenty of Height) */}
                <div className="hidden xl:flex items-center justify-center gap-2 flex-1 w-full h-full min-h-[140px] max-h-[220px]">
                  {/* dB Scale */}
                  <div className="flex flex-col justify-between h-36 sm:h-44 text-[8px] font-mono text-slate-400 select-none text-right pr-0.5 font-bold flex-shrink-0">
                    <span className="text-rose-400">+6</span>
                    <span>0</span>
                    <span>-6</span>
                    <span>-18</span>
                    <span>-∞</span>
                  </div>

                  {/* Vertical Slider Track with Metallic Bevel */}
                  <div className="h-36 sm:h-44 w-8 flex items-center justify-center relative bg-black/60 rounded-full px-1 border border-slate-700/80 shadow-inner">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      defaultValue={stem.volume}
                      onInput={(e) => {
                        const val = parseFloat((e.target as HTMLInputElement).value);
                        globalAudioEngine.setStemVolume(stem.id, val);
                      }}
                      onChange={(e) => onVolumeChange(stem.id, parseFloat(e.target.value))}
                      className="w-36 sm:w-44 h-3 -rotate-90 origin-center cursor-pointer accent-sky-400"
                      title={`Volume: ${Math.round(stem.volume * 100)}%`}
                    />
                  </div>

                  {/* Vertical LED VU Meter */}
                  <div className="w-2.5 h-36 sm:h-44 bg-[#04080e] rounded-full overflow-hidden flex flex-col-reverse p-0.5 border border-slate-700 shadow-inner flex-shrink-0">
                    <div
                      ref={(el) => {
                        meterRefs.current[stem.id] = el;
                      }}
                      className="w-full rounded-full"
                      style={{
                        height: '0%',
                        backgroundColor: '#10b981',
                        transition: 'none',
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ================= UNIVERSAL MOBILE 2x2 ERGONOMIC MIXER CARDS (sm:hidden) ================= */}
      {/* Built from ground up for touch screen ergonomics, thumb reach, and high readability */}
      <div className="grid sm:hidden grid-cols-2 gap-2 flex-1 min-h-0 overflow-y-auto pr-0.5 pb-2">
        {visibleStems.map((stem) => {
          const roleInfo = ROLE_CONFIG[stem.role] || ROLE_CONFIG.guitar;
          const isSilenced = stem.muted || (anySoloActive && !stem.solo);

          return (
            <div
              key={`m-${stem.id}`}
              className={`rounded-2xl p-2 transition-all flex flex-col justify-between border relative shadow-lg overflow-hidden backdrop-blur-2xl saturate-[190%] ${
                stem.solo
                  ? 'bg-gradient-to-b from-[#24354a]/55 via-[#18283a]/45 to-[#0c1824]/50 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.25),inset_0_1.5px_0_rgba(255,255,255,0.5)] ring-1 ring-amber-400'
                  : stem.muted
                  ? 'bg-gradient-to-b from-[#141b24]/35 via-[#0e141c]/30 to-[#080d13]/35 border-rose-500/35 opacity-70'
                  : isSilenced
                  ? 'bg-gradient-to-b from-[#121922]/30 via-[#0d131a]/25 to-[#070b10]/30 border-slate-700/35 opacity-50'
                  : 'bg-gradient-to-b from-[#1b2b3d]/45 via-[#121f2d]/38 to-[#091522]/48 border-sky-400/40 shadow-md'
              }`}
            >
              {/* Metallic corner dots */}
              <div className="absolute top-1 left-1 w-1 h-1 rounded-full bg-slate-500 pointer-events-none" />
              <div className="absolute top-1 right-1 w-1 h-1 rounded-full bg-slate-500 pointer-events-none" />

              {/* 1. Header: Icon + Name + LED */}
              <div className="flex items-center justify-between gap-1 w-full pb-1 border-b border-white/10">
                <div className="flex items-center gap-1 min-w-0">
                  {roleInfo.icon}
                  <span className="text-[11px] font-black text-white uppercase tracking-tight truncate">
                    {roleInfo.label}
                  </span>
                </div>
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0 animate-pulse"
                  style={{
                    backgroundColor: isSilenced ? '#64748b' : roleInfo.color,
                    boxShadow: isSilenced ? 'none' : `0 0 6px ${roleInfo.color}`,
                  }}
                />
              </div>

              {/* 2. Hardware Mute & Solo Push Buttons (Touch friendly 30px height) */}
              <div className="grid grid-cols-2 gap-1 my-1 w-full">
                <button
                  onClick={() => onToggleMute(stem.id)}
                  className={`h-7 rounded-lg text-[10px] font-black border transition active:scale-90 flex items-center justify-center shadow-xs ${
                    stem.muted
                      ? 'bg-gradient-to-b from-rose-500 to-red-600 text-white border-rose-300 shadow-[0_0_8px_rgba(244,63,94,0.6)]'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  MUTE
                </button>
                <button
                  onClick={() => onToggleSolo(stem.id)}
                  className={`h-7 rounded-lg text-[10px] font-black border transition active:scale-90 flex items-center justify-center shadow-xs ${
                    stem.solo
                      ? 'bg-gradient-to-b from-amber-400 to-yellow-500 text-slate-950 border-amber-200 shadow-[0_0_10px_rgba(251,191,36,0.7)]'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  SOLO
                </button>
              </div>

              {/* 3. Center: Volume Slider with Live Vertical VU Meter */}
              <div className="flex items-center gap-2 w-full py-0.5">
                {/* Vertical LED VU Meter for this channel */}
                <div className="w-2 h-14 bg-[#04080e] rounded-full overflow-hidden flex flex-col-reverse p-0.5 border border-slate-700 shadow-inner flex-shrink-0">
                  <div
                    ref={(el) => {
                      mobileMeterRefs.current[stem.id] = el;
                    }}
                    className="w-full rounded-full"
                    style={{
                      height: '0%',
                      backgroundColor: '#10b981',
                      transition: 'none',
                    }}
                  />
                </div>

                {/* Slider + Values */}
                <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                  <div className="flex justify-between items-center text-[10px] font-mono font-bold text-slate-300">
                    <span className="text-slate-400">VOL</span>
                    <span className="text-cyan-300 font-extrabold">{Math.round(stem.volume * 100)}%</span>
                  </div>
                  {/* Ergonomic Touch Slider with large touch target */}
                  <div className="relative w-full h-7 flex items-center">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={stem.volume}
                      onInput={(e) => {
                        const val = parseFloat((e.target as HTMLInputElement).value);
                        globalAudioEngine.setStemVolume(stem.id, val);
                      }}
                      onChange={(e) => onVolumeChange(stem.id, parseFloat(e.target.value))}
                      className="w-full h-3.5 bg-slate-900/80 rounded-lg accent-cyan-400 cursor-pointer touch-none shadow-inner border border-slate-700/60"
                      aria-label={`Volume stem ${roleInfo.label}`}
                    />
                  </div>
                  {/* Pan Slider mini */}
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <span className="text-[9px] font-mono text-slate-400 font-bold">PAN</span>
                    <div className="relative flex-1 h-5 flex items-center">
                      <input
                        type="range"
                        min="-1"
                        max="1"
                        step="0.05"
                        value={stem.pan}
                        onInput={(e) => {
                          const val = parseFloat((e.target as HTMLInputElement).value);
                          globalAudioEngine.setStemPan(stem.id, val);
                        }}
                        onChange={(e) => onPanChange(stem.id, parseFloat(e.target.value))}
                        className="w-full h-2.5 bg-slate-900/80 rounded-md accent-sky-400 cursor-pointer touch-none shadow-inner border border-slate-700/60"
                        aria-label={`Pan stem ${roleInfo.label}`}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
