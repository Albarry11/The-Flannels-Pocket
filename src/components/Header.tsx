import React from 'react';
import type { Song } from '../types';

interface HeaderProps {
  currentSong: Song | null;
  activeSoloNames: string[];
  onClearAllSolos: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentSong,
  activeSoloNames,
  onClearAllSolos,
}) => {
  return (
    <header className="border-b border-white/70 bg-white/60 backdrop-blur-2xl px-4 py-2.5 sm:px-6 shadow-[0_4px_24px_rgba(2,132,199,0.08)] sticky top-0 z-30">
      {/* Top specular highlight line */}
      <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-white to-transparent pointer-events-none" />

      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        
        {/* Left: Clean Brand Title (Point 4: The Flannels pocket, no logo, no emote) */}
        <div className="flex items-center gap-3">
          <div className="flex items-baseline">
            <span className="text-xl sm:text-2xl font-black text-[#0f2942] tracking-tight">
              The Flannels
            </span>
            <span className="text-xs sm:text-sm font-extrabold text-sky-600 lowercase ml-1.5 px-2 py-0.5 rounded-full bg-sky-100/90 border border-sky-300/60 shadow-sm">
              pocket
            </span>
          </div>

          {/* Current Loaded Song Title & Artist */}
          {currentSong && (
            <div className="hidden sm:flex items-center gap-2 border-l border-sky-300/40 pl-3">
              <span className="text-sm font-bold text-[#0f2942] tracking-tight truncate max-w-xs">
                {currentSong.title}
              </span>
              <span className="text-xs text-sky-700/80 font-medium">
                by {currentSong.artist}
              </span>
            </div>
          )}
        </div>

        {/* Right: Active Solo Alert or Song Badges */}
        <div className="flex items-center gap-2">
          {activeSoloNames.length > 0 ? (
            <div className="flex items-center gap-2 bg-amber-400/20 border border-amber-500/50 px-3 py-1 rounded-full text-xs shadow-sm">
              <span className="text-amber-900 font-extrabold">
                Solo Aktif: {activeSoloNames.join(', ')}
              </span>
              <button
                onClick={onClearAllSolos}
                className="text-[10px] bg-amber-500 hover:bg-amber-400 text-black px-2 py-0.5 rounded-full font-black transition shadow-sm"
              >
                Clear
              </button>
            </div>
          ) : currentSong ? (
            <div className="flex items-center gap-1.5 font-mono text-xs">
              <span className="px-2.5 py-1 rounded-full bg-sky-100/90 border border-sky-300/60 text-sky-800 font-bold shadow-xs">
                {currentSong.bpm} BPM
              </span>
              <span className="px-2.5 py-1 rounded-full bg-amber-100/90 border border-amber-300/60 text-amber-800 font-bold shadow-xs">
                {currentSong.originalKey}
              </span>
              <span className="px-2.5 py-1 rounded-full bg-emerald-100/90 border border-emerald-300/60 text-emerald-800 font-bold hidden md:inline shadow-xs">
                {currentSong.stems.length} Stems
              </span>
            </div>
          ) : null}
        </div>

      </div>
    </header>
  );
};
