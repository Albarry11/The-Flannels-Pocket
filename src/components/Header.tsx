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
    <header className="border-b border-sky-300/30 bg-white/20 backdrop-blur-md px-4 py-3 sm:px-6 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        
        {/* Left: Clean Brand Title (Point 4: The Flannels pocket, no logo, no emote) */}
        <div className="flex items-center gap-3">
          <div className="flex items-baseline">
            <span className="text-xl sm:text-2xl font-black text-[#0f2942] tracking-tight">
              The Flannels
            </span>
            <span className="text-xs sm:text-sm font-extrabold text-sky-700 lowercase ml-1.5 px-2 py-0.5 rounded-full bg-sky-200/60 border border-sky-300/70 shadow-xs">
              pocket
            </span>
          </div>

          {/* Current Loaded Song Title & Artist */}
          {currentSong && (
            <div className="hidden sm:flex items-center gap-2 border-l border-sky-300/40 pl-3">
              <span className="text-sm font-extrabold text-[#0f2942] tracking-tight truncate max-w-xs">
                {currentSong.title}
              </span>
              <span className="text-xs text-sky-800 font-medium">
                by {currentSong.artist}
              </span>
            </div>
          )}
        </div>

        {/* Right: Active Solo Alert or Song Badges */}
        <div className="flex items-center gap-2">
          {activeSoloNames.length > 0 ? (
            <div className="flex items-center gap-2 bg-amber-300/40 border border-amber-500/60 px-3 py-1 rounded-full text-xs shadow-xs">
              <span className="text-amber-950 font-extrabold">
                Solo Aktif: {activeSoloNames.join(', ')}
              </span>
              <button
                onClick={onClearAllSolos}
                className="text-[10px] bg-amber-500 hover:bg-amber-400 text-black px-2 py-0.5 rounded-full font-black transition shadow-xs"
              >
                Clear
              </button>
            </div>
          ) : currentSong ? (
            <div className="flex items-center gap-1.5 font-mono text-xs">
              <span className="px-2.5 py-1 rounded-full bg-white/70 border border-sky-300/60 text-sky-900 font-bold shadow-xs">
                {currentSong.bpm} BPM
              </span>
              <span className="px-2.5 py-1 rounded-full bg-amber-100/80 border border-amber-300/70 text-amber-900 font-bold shadow-xs">
                {currentSong.originalKey}
              </span>
              <span className="px-2.5 py-1 rounded-full bg-emerald-100/80 border border-emerald-300/70 text-emerald-900 font-bold hidden md:inline shadow-xs">
                {currentSong.stems.length} Stems
              </span>
            </div>
          ) : null}
        </div>

      </div>
    </header>
  );
};
