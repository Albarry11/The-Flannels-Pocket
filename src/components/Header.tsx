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
    <header className="border-b border-cyan-500/20 bg-gradient-to-b from-[#091529]/95 via-[#060e1c]/90 to-[#040813]/95 backdrop-blur-xl px-4 py-2.5 sm:px-6 shadow-xl sticky top-0 z-40">
      {/* Top glass specular highlight */}
      <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent pointer-events-none" />

      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        
        {/* Left: Exact Brand Title without logo or emote (Point 5) */}
        <div className="flex items-center gap-3">
          <div className="flex items-baseline">
            <span className="text-xl sm:text-2xl font-black text-white tracking-tight">
              The Flannel
            </span>
            <span className="text-xs sm:text-sm font-bold text-cyan-400 lowercase ml-1.5 px-1.5 py-0.5 rounded-lg bg-cyan-950/50 border border-cyan-400/30 shadow-sm">
              pocket
            </span>
          </div>

          {/* Current Loaded Song Title & Artist */}
          {currentSong && (
            <div className="hidden sm:flex items-center gap-2 border-l border-cyan-500/25 pl-3">
              <span className="text-sm font-bold text-slate-100 tracking-tight truncate max-w-xs">
                {currentSong.title}
              </span>
              <span className="text-xs text-cyan-300/80 font-normal">
                by {currentSong.artist}
              </span>
            </div>
          )}
        </div>

        {/* Right: Active Solo Alert or Song Badges */}
        <div className="flex items-center gap-2">
          {activeSoloNames.length > 0 ? (
            <div className="flex items-center gap-2 bg-amber-500/15 border border-amber-500/40 px-2.5 py-1 rounded-xl text-xs">
              <span className="text-amber-300 font-bold">
                Solo: {activeSoloNames.join(', ')}
              </span>
              <button
                onClick={onClearAllSolos}
                className="text-[10px] bg-amber-500 hover:bg-amber-400 text-black px-1.5 py-0.5 rounded font-extrabold transition"
              >
                Clear
              </button>
            </div>
          ) : currentSong ? (
            <div className="flex items-center gap-1.5 font-mono text-xs">
              <span className="px-2.5 py-1 rounded-xl bg-[#0b182d] border border-cyan-500/30 text-cyan-300 font-bold">
                {currentSong.bpm} BPM
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-[#0b182d] border border-amber-500/30 text-amber-300 font-bold">
                {currentSong.originalKey}
              </span>
              <span className="px-2 py-1 rounded-xl bg-[#0b182d] border border-slate-700 text-slate-400 hidden md:inline">
                {currentSong.stems.length} Stems
              </span>
            </div>
          ) : null}
        </div>

      </div>
    </header>
  );
};
