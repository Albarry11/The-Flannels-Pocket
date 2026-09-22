import React from 'react';
import type { Song } from '../types';
import { Music, Disc3, ShieldCheck } from 'lucide-react';

interface AudioLoadingModalProps {
  isOpen: boolean;
  song: Song | null;
  percent: number;
  text: string;
  detail?: string;
  onCancel?: () => void;
}

export const AudioLoadingModal: React.FC<AudioLoadingModalProps> = ({
  isOpen,
  song,
  percent,
  text,
  detail,
  onCancel,
}) => {
  if (!isOpen || !song) return null;

  const clampedPercent = Math.max(0, Math.min(100, Math.round(percent)));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-sky-950/35 backdrop-blur-md animate-in fade-in duration-150 select-none">
      <div className="w-full max-w-sm sm:max-w-md rounded-[32px] bg-gradient-to-b from-white/45 via-white/25 to-white/10 backdrop-blur-[45px] saturate-[220%] border border-white/80 p-6 sm:p-7 shadow-[0_30px_70px_rgba(0,35,80,0.35),inset_0_2px_3px_rgba(255,255,255,0.95),inset_0_-1.5px_2px_rgba(255,255,255,0.3)] text-white relative overflow-hidden">
        {/* Top Dome Specular Glass Gloss */}
        <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-white/50 via-white/15 to-transparent rounded-t-[32px] pointer-events-none" />
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-white to-transparent pointer-events-none" />
        <div className="absolute -inset-full bg-gradient-to-tr from-transparent via-white/15 to-transparent rotate-45 pointer-events-none" />

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center text-center space-y-4">
          {/* Cover Art with Spinning Vinyl Accent */}
          <div className="relative w-24 h-24 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/90 bg-sky-950/60 flex-shrink-0 group">
            {song.artworkUrl ? (
              <img
                src={song.artworkUrl}
                alt={song.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-cyan-200">
                <Music className="w-10 h-10" />
              </div>
            )}
            <div className="absolute inset-0 bg-sky-900/30 flex items-center justify-center">
              <Disc3 className="w-10 h-10 text-cyan-200 animate-spin" style={{ animationDuration: '4s' }} />
            </div>
          </div>

          {/* Song Info */}
          <div className="space-y-1 max-w-full">
            <h3 className="text-base sm:text-lg font-black text-white drop-shadow-[0_2px_4px_rgba(0,35,70,0.6)] tracking-tight truncate px-2">
              {song.title}
            </h3>
            <p className="text-xs text-sky-100 drop-shadow-[0_1px_3px_rgba(0,35,70,0.7)] font-medium truncate px-2">
              by {song.artist} {song.album ? `• ${song.album}` : ''}
            </p>
          </div>

          {/* Large Percentage Badge */}
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-4xl sm:text-5xl font-black font-mono tracking-tighter text-white drop-shadow-[0_2px_8px_rgba(0,35,70,0.7)]">
              {clampedPercent}
            </span>
            <span className="text-lg font-black font-mono text-cyan-200 drop-shadow-[0_1px_3px_rgba(0,35,70,0.7)]">%</span>
          </div>

          {/* Glossy Progress Bar Container */}
          <div className="w-full space-y-2">
            <div className="w-full h-4 bg-sky-950/40 backdrop-blur-md rounded-full border border-white/90 p-0.5 relative overflow-hidden shadow-inner">
              {/* Animated Progress Fill */}
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 transition-all duration-300 ease-out relative overflow-hidden shadow-[0_0_14px_rgba(6,182,212,0.8)]"
                style={{ width: `${clampedPercent}%` }}
              >
                {/* Upper Glass Specular Highlight */}
                <div className="absolute top-0 inset-x-0 h-1/2 bg-white/50 rounded-t-full pointer-events-none" />
                {/* Active candy pulse line */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
              </div>
            </div>

            {/* Dynamic Status & Byte Details */}
            <div className="flex items-center justify-between text-[11px] font-mono font-black text-white drop-shadow-[0_1px_2px_rgba(0,25,50,0.8)] px-1">
              <span className="truncate max-w-[220px] sm:max-w-[260px] text-left flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping inline-block flex-shrink-0" />
                <span className="truncate">{text || 'Menyiapkan berkas audio...'}</span>
              </span>
              <span className="text-cyan-200 flex-shrink-0 text-right">
                {detail || `${song.stems.length} Stems`}
              </span>
            </div>
          </div>

          {/* Reassurance Notice */}
          <div className="w-full p-2.5 rounded-2xl bg-sky-950/40 backdrop-blur-sm border border-white/40 flex items-start gap-2 text-[10px] text-sky-100 text-left font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <p className="leading-snug">
              Berkas studio diunduh sekali dan disimpan ke penyimpanan lokal perangkat. Pemutaran selanjutnya otomatis instan 0 detik tanpa kuota!
            </p>
          </div>

          {onCancel && (
            <button
              onClick={onCancel}
              className="text-[11px] font-bold text-sky-200 hover:text-white transition underline active:scale-95 pt-1 drop-shadow-xs"
            >
              Batal & Kembali
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
