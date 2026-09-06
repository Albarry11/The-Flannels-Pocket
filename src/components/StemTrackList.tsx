import React, { useEffect, useRef } from 'react';
import type { StemTrack, StemRole } from '../types';
import { Mic, Guitar, Music, Disc, VolumeX, Volume2, Sliders } from 'lucide-react';

interface StemTrackListProps {
  stems: StemTrack[];
  currentTime: number;
  duration: number;
  stemLevels: Record<string, number>;
  onVolumeChange: (stemId: string, volume: number) => void;
  onPanChange: (stemId: string, pan: number) => void;
  onToggleMute: (stemId: string) => void;
  onToggleSolo: (stemId: string) => void;
  onSeek: (time: number) => void;
}

const ROLE_CONFIG: Record<
  StemRole,
  { label: string; personil: string; color: string; bgBadge: string; icon: React.ReactNode }
> = {
  vocal: {
    label: 'Vocal',
    personil: 'Vokalis',
    color: '#f43f5e',
    bgBadge: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    icon: <Mic className="w-4 h-4" />,
  },
  lead: {
    label: 'Lead Guitar',
    personil: 'Gitaris Lead',
    color: '#f59e0b',
    bgBadge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    icon: <Guitar className="w-4 h-4" />,
  },
  rhythm: {
    label: 'Rhythm Guitar',
    personil: 'Gitaris Rhythm',
    color: '#10b981',
    bgBadge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    icon: <Music className="w-4 h-4" />,
  },
  bass: {
    label: 'Bass',
    personil: 'Bassist',
    color: '#06b6d4',
    bgBadge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    icon: <Disc className="w-4 h-4" />,
  },
  drums: {
    label: 'Drums',
    personil: 'Drummer',
    color: '#8b5cf6',
    bgBadge: 'bg-violet-500/20 text-violet-300 border-violet-500/40',
    icon: <Sliders className="w-4 h-4" />,
  },
  other: {
    label: 'Other / Master',
    personil: 'Backing',
    color: '#64748b',
    bgBadge: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
    icon: <Volume2 className="w-4 h-4" />,
  },
};

export const StemTrackList: React.FC<StemTrackListProps> = ({
  stems,
  currentTime,
  duration,
  stemLevels,
  onVolumeChange,
  onPanChange,
  onToggleMute,
  onToggleSolo,
  onSeek,
}) => {
  const anySoloActive = stems.some((s) => s.solo);

  return (
    <div className="flex flex-col gap-3 max-w-7xl mx-auto px-3 sm:px-6 py-4">
      {/* Title Bar */}
      <div className="flex items-center justify-between text-xs text-cyan-300/70 uppercase tracking-wider font-semibold border-b border-cyan-500/20 pb-2">
        <span className="flex items-center gap-2 text-white">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          Stem Tracks & Multi-Solo Mixer ({stems.length} Stems)
        </span>
        <span className="hidden sm:inline text-slate-400">
          M = Mute • S = Solo • Sentuh bar untuk membedah instrumen
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {stems.map((stem) => {
          const roleInfo = ROLE_CONFIG[stem.role] || ROLE_CONFIG.other;
          const level = stemLevels[stem.id] || 0;
          const isSilenced = stem.muted || (anySoloActive && !stem.solo);

          return (
            <div
              key={stem.id}
              className={`rounded-2xl p-3 sm:p-4 transition-all flex flex-col gap-2.5 shadow-lg border relative overflow-hidden ${
                stem.solo
                  ? 'bg-gradient-to-r from-amber-950/40 via-[#0e1b2f] to-[#0a1424] border-amber-400/80 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                  : stem.muted
                  ? 'bg-[#080d18]/60 border-rose-500/30 opacity-60'
                  : isSilenced
                  ? 'bg-[#070e1b]/70 border-cyan-500/15 opacity-40'
                  : 'bg-gradient-to-r from-[#0c182c]/85 via-[#091426]/90 to-[#070e1c] border-cyan-500/25 hover:border-cyan-400/50'
              }`}
            >
              {/* Glossy top edge highlight (Aero style) */}
              <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

              {/* Row 1: Header (Role info & Ergonomic M/S Buttons) */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shadow-inner relative overflow-hidden"
                    style={{
                      backgroundColor: `${roleInfo.color}25`,
                      color: roleInfo.color,
                      border: `1px solid ${roleInfo.color}50`,
                    }}
                  >
                    <div className="absolute inset-x-0 top-0 h-1/2 bg-white/20 pointer-events-none" />
                    {roleInfo.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-bold text-white tracking-tight">
                        {stem.name}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${roleInfo.bgBadge}`}
                      >
                        {roleInfo.personil}
                      </span>
                      {stem.solo && (
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-amber-500 text-black animate-pulse shadow-sm">
                          SOLO ON
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 block font-mono">
                      {stem.muted ? 'Muted' : isSilenced ? 'Disenyapkan oleh Solo' : 'Aktif'}
                    </span>
                  </div>
                </div>

                {/* Touch-Friendly Ergonomic Mute & Solo Buttons (44px target) */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onToggleMute(stem.id)}
                    className={`min-w-[44px] min-h-[44px] px-3 rounded-xl font-bold text-xs flex items-center justify-center transition shadow ${
                      stem.muted
                        ? 'bg-gradient-to-b from-rose-500 to-rose-700 text-white shadow-[0_0_12px_rgba(244,63,94,0.6)] border border-rose-300'
                        : 'bg-slate-800/90 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700 active:scale-95'
                    }`}
                    title={stem.muted ? 'Unmute track' : 'Mute track'}
                  >
                    M
                  </button>
                  <button
                    onClick={() => onToggleSolo(stem.id)}
                    className={`min-w-[44px] min-h-[44px] px-3 rounded-xl font-extrabold text-xs flex items-center justify-center transition shadow ${
                      stem.solo
                        ? 'bg-gradient-to-b from-amber-400 to-amber-600 text-black shadow-[0_0_16px_rgba(245,158,11,0.8)] border border-amber-200'
                        : 'bg-slate-800/90 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700 active:scale-95'
                    }`}
                    title={stem.solo ? 'Matikan Solo' : 'Solo Track Ini'}
                  >
                    S
                  </button>
                </div>
              </div>

              {/* Row 2: Full Width Interactive Waveform Canvas */}
              <div className="w-full relative">
                <StemWaveform
                  audioBuffer={stem.audioBuffer}
                  color={roleInfo.color}
                  currentTime={currentTime}
                  duration={duration}
                  onSeek={onSeek}
                  isSilenced={isSilenced}
                />
              </div>

              {/* Row 3: Mixer Controls (Pan, Volume Fader, VU Meter) */}
              <div className="flex items-center justify-between gap-3 pt-1 border-t border-cyan-500/10">
                {/* Pan Fader */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono text-cyan-300/70 uppercase">Pan:</span>
                  <input
                    type="range"
                    min="-1"
                    max="1"
                    step="0.05"
                    value={stem.pan}
                    onChange={(e) => onPanChange(stem.id, parseFloat(e.target.value))}
                    className="w-20 sm:w-24 h-2 accent-cyan-400"
                    title={`Pan: ${stem.pan === 0 ? 'Center' : stem.pan < 0 ? `L${Math.round(Math.abs(stem.pan)*100)}` : `R${Math.round(stem.pan*100)}`}`}
                  />
                  <span className="text-[10px] font-mono text-slate-300 min-w-[2.2rem]">
                    {stem.pan === 0 ? 'C' : stem.pan < 0 ? `L${Math.round(Math.abs(stem.pan) * 100)}` : `R${Math.round(stem.pan * 100)}`}
                  </span>
                </div>

                {/* Volume Fader & LED VU Meter */}
                <div className="flex items-center gap-2 ml-auto">
                  <span className="text-slate-400 text-xs">
                    {stem.volume === 0 ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-cyan-400" />}
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={stem.volume}
                    onChange={(e) => onVolumeChange(stem.id, parseFloat(e.target.value))}
                    className="w-24 sm:w-36 h-2.5 accent-cyan-400 cursor-pointer"
                    title={`Volume: ${Math.round(stem.volume * 100)}%`}
                  />
                  <span className="text-[11px] font-mono text-cyan-300 w-9 text-right font-bold">
                    {Math.round(stem.volume * 100)}%
                  </span>

                  {/* 12-Segment Retro Peak LED VU Meter */}
                  <div className="w-3 h-8 bg-[#040812] rounded overflow-hidden flex flex-col-reverse p-0.5 border border-cyan-500/30 shadow-inner">
                    <div
                      className="w-full rounded transition-all duration-75"
                      style={{
                        height: `${Math.min(100, Math.round(level * 100))}%`,
                        backgroundColor: level > 0.85 ? '#ef4444' : level > 0.6 ? '#f59e0b' : '#06b6d4',
                        boxShadow: level > 0.1 ? `0 0 6px ${level > 0.85 ? '#ef4444' : '#06b6d4'}` : 'none',
                      }}
                    />
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

interface StemWaveformProps {
  audioBuffer?: AudioBuffer;
  color: string;
  currentTime: number;
  duration: number;
  isSilenced: boolean;
  onSeek: (time: number) => void;
}

const StemWaveform: React.FC<StemWaveformProps> = ({
  audioBuffer,
  color,
  currentTime,
  duration,
  isSilenced,
  onSeek,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = rect.width;
    const height = 48;

    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    if (!audioBuffer) {
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();
      ctx.restore();
      return;
    }

    const data = audioBuffer.getChannelData(0);
    const step = Math.ceil(data.length / width);
    const amp = height / 2;

    const progressRatio = duration > 0 ? currentTime / duration : 0;
    const playheadX = progressRatio * width;

    // Draw waveform bars
    for (let i = 0; i < width; i += 2) {
      let min = 1.0;
      let max = -1.0;
      for (let j = 0; j < step; j++) {
        const datum = data[i * step + j] || 0;
        if (datum < min) min = datum;
        if (datum > max) max = datum;
      }

      const barHeight = Math.max(2, (max - min) * amp * 0.9);
      const y = (height - barHeight) / 2;

      if (i <= playheadX) {
        ctx.fillStyle = isSilenced ? '#475569' : color;
      } else {
        ctx.fillStyle = isSilenced ? '#1e293b' : `${color}40`;
      }
      ctx.fillRect(i, y, 1.5, barHeight);
    }

    // Draw Playhead
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 4;
    ctx.fillRect(playheadX - 1, 0, 2, height);

    ctx.restore();
  }, [audioBuffer, color, currentTime, duration, isSilenced]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || duration <= 0) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const targetTime = (clickX / rect.width) * duration;
    onSeek(targetTime);
  };

  return (
    <canvas
      ref={canvasRef}
      onClick={handleClick}
      className="w-full h-12 bg-[#050b16]/70 rounded-xl cursor-pointer border border-cyan-500/15 hover:border-cyan-400/40 transition block"
      title="Klik untuk melompat ke bagian lagu ini"
    />
  );
};
