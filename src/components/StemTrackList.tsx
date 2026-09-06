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
    bgBadge: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    icon: <Mic className="w-4 h-4" />,
  },
  lead: {
    label: 'Lead Guitar',
    personil: 'Gitaris Lead',
    color: '#f59e0b',
    bgBadge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    icon: <Guitar className="w-4 h-4" />,
  },
  rhythm: {
    label: 'Rhythm Guitar',
    personil: 'Gitaris Rhythm',
    color: '#10b981',
    bgBadge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    icon: <Music className="w-4 h-4" />,
  },
  bass: {
    label: 'Bass',
    personil: 'Bassist',
    color: '#06b6d4',
    bgBadge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    icon: <Disc className="w-4 h-4" />,
  },
  drums: {
    label: 'Drums',
    personil: 'Drummer',
    color: '#8b5cf6',
    bgBadge: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    icon: <Sliders className="w-4 h-4" />,
  },
  other: {
    label: 'Other / Master',
    personil: 'Backing',
    color: '#64748b',
    bgBadge: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
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
    <div className="flex flex-col gap-3 max-w-7xl mx-auto px-4 py-4 sm:px-6">
      <div className="flex items-center justify-between text-xs text-slate-400 uppercase tracking-wider font-semibold border-b border-flannel-border pb-2">
        <span>Stem Tracks & Personil Mix ({stems.length} Stems)</span>
        <span className="hidden sm:inline">M = Mute • S = Solo (Isolasi Bagian Latihan)</span>
      </div>

      <div className="flex flex-col gap-2.5">
        {stems.map((stem) => {
          const roleInfo = ROLE_CONFIG[stem.role] || ROLE_CONFIG.other;
          const level = stemLevels[stem.id] || 0;
          const isSilenced = stem.muted || (anySoloActive && !stem.solo);

          return (
            <div
              key={stem.id}
              className={`bg-flannel-card border rounded-2xl p-3.5 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm hover:border-slate-700 ${
                stem.solo
                  ? 'border-amber-500/60 shadow-amber-500/5 bg-amber-950/10'
                  : isSilenced
                  ? 'opacity-60 border-flannel-border bg-flannel-dark/40'
                  : 'border-flannel-border'
              }`}
            >
              {/* Left: Role Info & Mute/Solo Buttons */}
              <div className="flex items-center justify-between md:justify-start gap-3 min-w-[240px]">
                {/* Icon & Name */}
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shadow-inner"
                    style={{
                      backgroundColor: `${roleInfo.color}20`,
                      color: roleInfo.color,
                      border: `1px solid ${roleInfo.color}40`,
                    }}
                  >
                    {roleInfo.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-white tracking-tight">
                        {stem.name}
                      </span>
                      <span
                        className={`text-[10px] font-medium px-1.5 py-0.2 rounded border ${roleInfo.bgBadge}`}
                      >
                        {roleInfo.personil}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 block">
                      {isSilenced ? (stem.muted ? 'Muted' : 'Silenced by Solo') : 'Active Audio'}
                    </span>
                  </div>
                </div>

                {/* Mute (M) & Solo (S) Buttons */}
                <div className="flex items-center gap-1.5 ml-auto md:ml-4">
                  <button
                    onClick={() => onToggleMute(stem.id)}
                    className={`w-8 h-8 rounded-lg font-bold text-xs flex items-center justify-center transition ${
                      stem.muted
                        ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                    }`}
                    title={stem.muted ? 'Unmute' : 'Mute Track'}
                  >
                    M
                  </button>
                  <button
                    onClick={() => onToggleSolo(stem.id)}
                    className={`w-8 h-8 rounded-lg font-bold text-xs flex items-center justify-center transition ${
                      stem.solo
                        ? 'bg-amber-500 text-black shadow-md shadow-amber-500/30 font-extrabold'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                    }`}
                    title={stem.solo ? 'Matikan Solo' : 'Solo Track Ini'}
                  >
                    S
                  </button>
                </div>
              </div>

              {/* Center: Interactive Waveform Canvas */}
              <div className="flex-1 w-full min-h-[48px] max-h-[56px] relative flex items-center">
                <StemWaveform
                  audioBuffer={stem.audioBuffer}
                  color={roleInfo.color}
                  currentTime={currentTime}
                  duration={duration}
                  onSeek={onSeek}
                  isSilenced={isSilenced}
                />
              </div>

              {/* Right: Controls (Volume Fader, Pan, LED VU Meter) */}
              <div className="flex items-center gap-4 justify-between md:justify-end min-w-[250px]">
                {/* Pan Knob/Slider */}
                <div className="flex flex-col items-center gap-0.5">
                  <div className="flex justify-between w-16 text-[10px] font-mono text-slate-400">
                    <span>L</span>
                    <span>{stem.pan === 0 ? 'C' : stem.pan < 0 ? `${Math.round(Math.abs(stem.pan) * 100)}` : `${Math.round(stem.pan * 100)}`}</span>
                    <span>R</span>
                  </div>
                  <input
                    type="range"
                    min="-1"
                    max="1"
                    step="0.05"
                    value={stem.pan}
                    onChange={(e) => onPanChange(stem.id, parseFloat(e.target.value))}
                    className="w-16 h-1.5"
                    title={`Pan: ${stem.pan}`}
                  />
                </div>

                {/* Volume Slider */}
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-xs">
                    {stem.volume === 0 ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5" />}
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={stem.volume}
                    onChange={(e) => onVolumeChange(stem.id, parseFloat(e.target.value))}
                    className="w-24 sm:w-28 h-1.5"
                    title={`Volume: ${Math.round(stem.volume * 100)}%`}
                  />
                  <span className="text-[11px] font-mono text-slate-300 w-8 text-right">
                    {Math.round(stem.volume * 100)}%
                  </span>
                </div>

                {/* LED VU Meter Bar */}
                <div className="w-2.5 h-9 bg-slate-900 rounded-sm overflow-hidden flex flex-col-reverse p-0.5 border border-slate-800">
                  <div
                    className="w-full rounded-xs transition-all duration-75"
                    style={{
                      height: `${Math.min(100, Math.round(level * 100))}%`,
                      backgroundColor: level > 0.85 ? '#ef4444' : level > 0.6 ? '#f59e0b' : '#10b981',
                      boxShadow: level > 0.1 ? `0 0 4px ${level > 0.8 ? '#ef4444' : '#10b981'}` : 'none',
                    }}
                  />
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

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    if (!audioBuffer) {
      // Draw placeholder dashed line
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();
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
        ctx.fillStyle = isSilenced ? '#64748b' : color;
      } else {
        ctx.fillStyle = isSilenced ? '#1e293b' : `${color}40`;
      }
      ctx.fillRect(i, y, 1.5, barHeight);
    }

    // Draw playhead cursor
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(playheadX - 1, 0, 2, height);
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
      width={600}
      height={48}
      onClick={handleClick}
      className="w-full h-11 bg-flannel-panel/50 rounded-xl cursor-pointer border border-flannel-border/50 hover:border-slate-600 transition"
      title="Klik untuk melompat ke bagian ini"
    />
  );
};
