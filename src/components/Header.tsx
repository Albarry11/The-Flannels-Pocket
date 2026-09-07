import React from 'react';
import type { Song } from '../types';
import { Search, ChevronLeft, ChevronRight, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

interface HeaderProps {
  currentSong: Song | null;
  activeSoloNames: string[];
  onClearAllSolos: () => void;
  isNavOpen?: boolean;
  onToggleNav?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeSoloNames,
  onClearAllSolos,
  isNavOpen = true,
  onToggleNav,
}) => {
  return (
    <header className="aero-window-header w-full px-3 sm:px-6 py-2 transition-all sticky top-0 z-40 flex items-center justify-between gap-3 shadow-xs">
      {/* 1. Left: Sidebar Toggle, Navigation Circles, Brand Title (Point 3 & 4) */}
      <div className="flex items-center gap-3 sm:gap-4">
        {onToggleNav && (
          <button
            onClick={onToggleNav}
            className="p-1.5 rounded-full bg-white/80 hover:bg-white text-sky-900 border border-sky-200 shadow-xs transition active:scale-95"
            title={isNavOpen ? 'Sembunyikan Sidebar' : 'Tampilkan Sidebar'}
          >
            {isNavOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
          </button>
        )}

        {/* Windows Aero Back / Forward Navigation Circles (like image_f35097.png) */}
        <div className="hidden sm:flex items-center gap-1">
          <button
            className="w-7 h-7 rounded-full bg-white/70 hover:bg-white text-sky-900 border border-white/90 shadow-xs flex items-center justify-center transition active:scale-95"
            title="Kembali"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            className="w-7 h-7 rounded-full bg-white/70 hover:bg-white text-sky-900 border border-white/90 shadow-xs flex items-center justify-center transition active:scale-95"
            title="Maju"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Clean Brand Typography (Point 3: The Flannels pocket, no capsule on pocket, no logo, no emote) */}
        <div className="flex items-baseline select-none">
          <span className="text-xl sm:text-2xl font-black text-[#0c233c] tracking-tight">
            The Flannels
          </span>
          <span className="text-xs sm:text-sm font-bold text-sky-600 lowercase ml-1.5">
            pocket
          </span>
        </div>

        {/* Aero Glass Search Pill (like image_f35097.png) */}
        <div className="hidden lg:flex items-center gap-2 bg-white/70 hover:bg-white/90 border border-sky-200/80 rounded-full px-3.5 py-1 text-xs text-sky-800 shadow-xs transition w-56">
          <Search className="w-3.5 h-3.5 text-sky-500" />
          <span className="text-slate-400 font-medium">Cari lagu cover...</span>
        </div>
      </div>

      {/* 2. Right: Active Solo Alert Badge & Windows Vista Aero Window Controls (Point 1 & 4) */}
      <div className="flex items-center gap-3">
        {activeSoloNames.length > 0 && (
          <div className="flex items-center gap-2 bg-amber-100/95 border border-amber-400/80 px-3 py-0.5 rounded-full text-xs shadow-xs">
            <span className="text-amber-950 font-extrabold text-[11px]">
              Solo Aktif: {activeSoloNames.join(', ')}
            </span>
            <button
              onClick={onClearAllSolos}
              className="text-[10px] bg-amber-500 hover:bg-amber-400 text-black px-2 py-0.2 rounded-full font-black transition shadow-xs"
            >
              Clear
            </button>
          </div>
        )}

        {/* Windows Vista / 7 Aero Window Buttons (Minimize, Maximize, Close) */}
        <div className="flex items-center gap-1">
          <button
            className="w-7 h-5 rounded-md vista-win-btn flex items-center justify-center text-[10px] text-slate-700 font-bold transition"
            title="Minimize"
          >
            _
          </button>
          <button
            className="w-7 h-5 rounded-md vista-win-btn flex items-center justify-center text-[10px] text-slate-700 font-bold transition"
            title="Maximize"
          >
            □
          </button>
          <button
            className="w-8 h-5 rounded-md vista-close-btn flex items-center justify-center text-[10px] text-white font-black transition"
            title="Tutup"
          >
            ✕
          </button>
        </div>
      </div>
    </header>
  );
};
