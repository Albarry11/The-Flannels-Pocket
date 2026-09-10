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
  onCycleEqPreset: (stemId: string) => void;
  getEqPresetLabel: (stemId: string) => string;
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
  onCycleEqPreset,
  getEqPresetLabel,
}) => {
  const anySoloActive = stems.some((s) => s.solo);
  const visibleStems = stems.filter((s) => s.role !== 'other');
  const meterRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const visibleStemIds = visibleStems.map((s) => s.id).join('|');

  // Direct DOM VU Meter Animation (Decoupled from React State with 0 transition lag to prevent GPU crash)
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
            el.style.boxShadow = level > 0.1 ? `0 0 6px ${level > 0.85 ? '#ef4444' : '#10b981'}` : 'none';
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
  }, [visibleStemIds]);

  return (
    <div className="flex flex-col gap-2.5 h-[calc(100vh-230px)] min-h-[390px] max-h-[530px] max-w-5xl mx-auto w-full overflow-hidden select-none">
      {/* Top Bar: Authentic Frutiger Aero Aqua Gel Quick Access Buttons (Item 10) */}
      <div className="flex items-center justify-between px-4 py-2 rounded-2xl bg-white/40 border border-white/60 backdrop-blur-md shadow-[0_4px_16px_rgba(2,132,199,0.1)] flex-wrap gap-2 flex-shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-black uppercase tracking-wider text-sky-950 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-cyan-600" />
            <span>Quick Kulik:</span>
          </span>

          {/* Aqua Gel Pill Buttons */}
          <button
            onClick={onSoloVocalOnly}
            className="px-3 py-1 rounded-full text-xs font-black text-rose-950 bg-gradient-to-b from-rose-200 via-rose-300 to-rose-400 border border-rose-200 shadow-[0_2px_6px_rgba(244,63,94,0.3),inset_0_1px_0_rgba(255,255,255,0.8)] hover:brightness-105 active:translate-y-0.5 transition"
          >
            🎤 Vokal Solo
          </button>
          <button
            onClick={onSoloGuitarOnly}
            className="px-3 py-1 rounded-full text-xs font-black text-amber-950 bg-gradient-to-b from-amber-200 via-amber-300 to-amber-400 border border-amber-200 shadow-[0_2px_6px_rgba(245,158,11,0.3),inset_0_1px_0_rgba(255,255,255,0.8)] hover:brightness-105 active:translate-y-0.5 transition"
          >
            🎸 Gitar Solo
          </button>
          <button
            onClick={onSoloRhythmSection}
            className="px-3 py-1 rounded-full text-xs font-black text-cyan-950 bg-gradient-to-b from-cyan-200 via-sky-300 to-cyan-400 border border-cyan-200 shadow-[0_2px_6px_rgba(6,182,212,0.3),inset_0_1px_0_rgba(255,255,255,0.8)] hover:brightness-105 active:translate-y-0.5 transition"
          >
            🥁 Bass + Drums
          </button>
          <button
            onClick={onResetAllStems}
            className="px-3 py-1 rounded-full text-xs font-black text-slate-800 bg-gradient-to-b from-slate-100 via-white to-slate-200 border border-slate-300 shadow-[0_2px_6px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.9)] hover:brightness-105 active:translate-y-0.5 transition flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3 text-slate-600" />
            <span>Unmute All</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono font-bold text-sky-900 hidden md:inline px-2 py-0.5 rounded-md bg-white/50 border border-sky-200">
            SSL 4000 E-Series Emulation • 4 Discrete Stems
          </span>
        </div>
      </div>

      {/* Realistic DAW Mixing Console Strip Grid (Item 7) */}
      <div
        className={`grid gap-2.5 sm:gap-3.5 flex-1 h-full min-h-0 ${
          visibleStems.length <= 4 ? 'grid-cols-4' : 'grid-cols-5'
        }`}
      >
        {visibleStems.map((stem) => {
          const roleInfo = ROLE_CONFIG[stem.role] || ROLE_CONFIG.guitar;
          const isSilenced = stem.muted || (anySoloActive && !stem.solo);

          return (
            <div
              key={stem.id}
              className={`rounded-2xl p-2.5 transition-all flex flex-col justify-between items-center border relative shadow-xl overflow-hidden ${
                stem.solo
                  ? 'bg-gradient-to-b from-[#18283a] via-[#102030] to-[#0c1824] border-amber-400/90 shadow-[0_0_20px_rgba(245,158,11,0.25)] ring-2 ring-amber-400/50'
                  : stem.muted
                  ? 'bg-gradient-to-b from-[#141b24] via-[#0e141c] to-[#080d13] border-rose-500/40 opacity-70'
                  : isSilenced
                  ? 'bg-gradient-to-b from-[#121922] via-[#0d131a] to-[#070b10] border-slate-700/60 opacity-50'
                  : 'bg-gradient-to-b from-[#1b2b3d] via-[#121f2d] to-[#091522] border-sky-400/40 hover:border-sky-300 shadow-[0_8px_24px_rgba(0,0,0,0.35)]'
              }`}
            >
              {/* Corner Metallic Screws / Rivets */}
              <div className="absolute top-1.5 left-1.5 w-1.5 h-1.5 rounded-full bg-gradient-to-br from-slate-400 to-slate-700 border border-slate-900 shadow-inner pointer-events-none" />
              <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-gradient-to-br from-slate-400 to-slate-700 border border-slate-900 shadow-inner pointer-events-none" />
              <div className="absolute bottom-1.5 left-1.5 w-1.5 h-1.5 rounded-full bg-gradient-to-br from-slate-400 to-slate-700 border border-slate-900 shadow-inner pointer-events-none" />
              <div className="absolute bottom-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-gradient-to-br from-slate-400 to-slate-700 border border-slate-900 shadow-inner pointer-events-none" />

              {/* Console Top Specular Reflection */}
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
                  {/* Signal Active LED Indicator */}
                  <div
                    className="w-1.5 h-1.5 rounded-full animate-pulse shadow-sm"
                    style={{
                      backgroundColor: isSilenced ? '#64748b' : roleInfo.color,
                      boxShadow: isSilenced ? 'none' : `0 0 6px ${roleInfo.color}`,
                    }}
                  />
                </div>
                <span className="text-[9px] text-slate-400 font-semibold truncate max-w-full">
                  {roleInfo.personil}
                </span>
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

              {/* 3. Realistic Rotary Stereo Pan Knob */}
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

              {/* 4. Center: Console Long-Throw Fader + Multi-Segment LED VU Meter */}
              <div className="flex items-center justify-center gap-2 flex-1 w-full my-0.5 relative py-0.5 overflow-hidden">
                {/* dB Scale Markings on Metal Faceplate */}
                <div className="flex flex-col justify-between h-28 text-[7px] font-mono text-slate-400 select-none text-right pr-0.5 font-bold">
                  <span className="text-rose-400">+6</span>
                  <span>0</span>
                  <span>-6</span>
                  <span>-18</span>
                  <span>-∞</span>
                </div>

                {/* Vertical Slider Track with Metallic Bevel */}
                <div className="h-28 flex items-center justify-center relative bg-black/50 rounded-full px-1 border border-slate-700/60 shadow-inner">
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
                    className="w-28 h-3 -rotate-90 origin-center cursor-pointer accent-sky-400"
                    title={`Volume: ${Math.round(stem.volume * 100)}%`}
                  />
                </div>

                {/* Vertical LED VU Meter with 0 transition lag */}
                <div className="w-2.5 h-28 bg-[#04080e] rounded-full overflow-hidden flex flex-col-reverse p-0.5 border border-slate-700 shadow-inner">
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

              {/* 5. Bottom: Realistic Console Channel Tape Label & Tone Preset */}
              <div className="w-full text-center pt-1 border-t border-slate-800 flex-shrink-0 flex flex-col items-center gap-1">
                {/* Console Masking Tape Strip */}
                <div className="w-full bg-[#f6ecd2] border border-amber-300/80 px-1 py-0.5 shadow-sm rounded-xs flex items-center justify-between rotate-[-0.5deg]">
                  <span className="text-[8px] font-mono font-black text-slate-800 tracking-tighter uppercase truncate">
                    {roleInfo.tapeLabel}
                  </span>
                  <span className="text-[9px] font-mono font-black text-slate-950">
                    {Math.round(stem.volume * 100)}%
                  </span>
                </div>

                {/* Tone Preset Pill */}
                <button
                  onClick={() => onCycleEqPreset(stem.id)}
                  className="w-full py-0.5 px-1 rounded-md text-[9px] font-extrabold bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-sky-400/30 transition truncate active:scale-95 shadow-xs flex items-center justify-center gap-1"
                  title="Klik untuk ganti karakter tone EQ (Flat, Vokal Jernih, Gitar Tajam, Bass Tebal, Drum Ringan)"
                  aria-label="Ubah preset EQ stem"
                >
                  <Music className="w-2.5 h-2.5 text-cyan-400 flex-shrink-0" />
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
