import React from 'react';
import type { Song } from '../types';
import { Music, Disc3, ShieldCheck } from 'lucide-react';

interface AudioLoadingModalProps {
  isOpen: boolean;
  song: Song | null;
  percent: number;
  text: string;
  detail?: string;
}

export const AudioLoadingModal: React.FC<AudioLoadingModalProps> = ({
  isOpen,
  song,
  percent,
  text,
  detail,
}) => {
  if (!isOpen || !song) return null;

  const clampedPercent = Math.max(0, Math.min(100, Math.round(percent)));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150 select-none">
      <div className="w-full max-w-md rounded-3xl bg-[#071626]/95 backdrop-blur-3xl border border-sky-400/40 p-6 shadow-[0_20px_60px_rgba(2,132,199,0.35)] text-white relative overflow-hidden">
        {/* Top Dome Specular Glass Gloss */}
        <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-white/15 to-transparent rounded-t-3xl pointer-events-none" />
        <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-400/80 to-transparent pointer-events-none" />

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center text-center space-y-4">
          {/* Cover Art with Spinning Vinyl Accent */}
          <div className="relative w-24 h-24 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/40 bg-sky-950 flex-shrink-0 group">
            {song.artworkUrl ? (
              <img
                src={song.artworkUrl}
                alt={song.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-cyan-400">
                <Music className="w-10 h-10" />
              </div>
            )}
            <div className="absolute inset-0 bg-sky-900/30 flex items-center justify-center">
              <Disc3 className="w-10 h-10 text-cyan-300 animate-spin" style={{ animationDuration: '4s' }} />
            </div>
          </div>

          {/* Song Info */}
          <div className="space-y-1 max-w-full">
            <h3 className="text-base sm:text-lg font-black text-white tracking-tight truncate px-2">
              {song.title}
            </h3>
            <p className="text-xs text-sky-200 font-medium truncate px-2">
              by {song.artist} {song.album ? `• ${song.album}` : ''}
            </p>
          </div>

          {/* Large Percentage Badge */}
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-4xl sm:text-5xl font-black font-mono tracking-tighter bg-gradient-to-b from-white via-cyan-200 to-sky-400 bg-clip-text text-transparent">
              {clampedPercent}
            </span>
            <span className="text-lg font-black font-mono text-cyan-400">%</span>
          </div>

          {/* Glossy Progress Bar Container */}
          <div className="w-full space-y-2">
            <div className="w-full h-3.5 bg-black/50 rounded-full border border-sky-400/50 p-0.5 relative overflow-hidden shadow-inner">
              {/* Animated Progress Fill */}
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400 transition-all duration-200 relative overflow-hidden shadow-[0_0_12px_rgba(6,182,212,0.6)]"
                style={{ width: `${clampedPercent}%` }}
              >
                {/* Upper Glass Specular Highlight */}
                <div className="absolute top-0 inset-x-0 h-1/2 bg-white/50 rounded-t-full pointer-events-none" />
              </div>
            </div>

            {/* Dynamic Status & Byte Details */}
            <div className="flex items-center justify-between text-[11px] font-mono font-bold text-sky-100 px-1">
              <span className="truncate max-w-[220px] sm:max-w-[260px] text-left">
                {text || 'Menyiapkan berkas audio...'}
              </span>
              <span className="text-cyan-300 flex-shrink-0 text-right">
                {detail || `${song.stems.length} Stems`}
              </span>
            </div>
          </div>

          {/* Reassurance Notice */}
          <div className="w-full p-2.5 rounded-2xl bg-sky-950/60 border border-sky-400/20 flex items-start gap-2 text-[10px] text-sky-200/90 text-left font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <p className="leading-snug">
              Berkas studio diunduh sekali dan disimpan ke penyimpanan lokal perangkat. Pemutaran selanjutnya otomatis instan 0 detik tanpa kuota!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
