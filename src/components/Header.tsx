import React from 'react';
import type { Song } from '../types';
import { Search, ChevronLeft, ChevronRight, PanelLeftClose, PanelLeftOpen, Video, VideoOff } from 'lucide-react';

interface HeaderProps {
  currentSong: Song | null;
  activeSoloNames: string[];
  onClearAllSolos: () => void;
  isNavOpen?: boolean;
  onToggleNav?: () => void;
  isVideoActive?: boolean;
  onToggleVideo?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeSoloNames,
  onClearAllSolos,
  isNavOpen = true,
  onToggleNav,
  isVideoActive = true,
  onToggleVideo,
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
            aria-label={isNavOpen ? 'Sembunyikan navigasi samping' : 'Tampilkan navigasi samping'}
          >
            {isNavOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
          </button>
        )}

        {/* Windows Aero Back / Forward Navigation Circles (like image_f35097.png) */}
        <div className="hidden sm:flex items-center gap-1">
          <button
            className="w-7 h-7 rounded-full bg-white/70 hover:bg-white text-sky-900 border border-white/90 shadow-xs flex items-center justify-center transition active:scale-95"
            title="Kembali"
            aria-label="Kembali ke halaman sebelumnya"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            className="w-7 h-7 rounded-full bg-white/70 hover:bg-white text-sky-900 border border-white/90 shadow-xs flex items-center justify-center transition active:scale-95"
            title="Maju"
            aria-label="Maju ke halaman berikutnya"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Clean Brand Typography (H1 Landmark for SEO & Accessibility) */}
        <h1 className="flex items-baseline select-none m-0 text-inherit font-normal">
          <span className="text-xl sm:text-2xl font-black text-[#0c233c] tracking-tight">
            The Flannels
          </span>
          <span className="text-xs sm:text-sm font-bold text-sky-600 lowercase ml-1.5">
            pocket
          </span>
        </h1>

        {/* Aero Glass Search Pill (like image_f35097.png) */}
        <div className="hidden lg:flex items-center gap-2 bg-white/70 hover:bg-white/90 border border-sky-200/80 rounded-full px-3.5 py-1 text-xs text-sky-800 shadow-xs transition w-56">
          <Search className="w-3.5 h-3.5 text-sky-500" />
          <span className="text-slate-400 font-medium">Cari lagu cover...</span>
        </div>
      </div>

      {/* 2. Right: Video Toggle, Solo Alert Badge & Windows Vista Aero Window Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {onToggleVideo && (
          <button
            onClick={onToggleVideo}
            className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border transition flex items-center gap-1 shadow-2xs ${
              isVideoActive
                ? 'bg-sky-500/20 text-sky-950 border-sky-400'
                : 'bg-white/60 text-slate-600 border-slate-300'
            }`}
            title={isVideoActive ? 'Matikan video background (hemat GPU/baterai)' : 'Nyalakan video background Aero'}
          >
            {isVideoActive ? <Video className="w-3 h-3 text-sky-600" /> : <VideoOff className="w-3 h-3 text-slate-500" />}
            <span className="hidden sm:inline">{isVideoActive ? 'Aero Video: ON' : 'Aero Video: OFF'}</span>
          </button>
        )}

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
            title="Minimize jendela"
            aria-label="Minimize jendela aplikasi"
          >
            _
          </button>
          <button
            className="w-7 h-5 rounded-md vista-win-btn flex items-center justify-center text-[10px] text-slate-700 font-bold transition"
            title="Maximize jendela"
            aria-label="Maximize jendela aplikasi"
          >
            □
          </button>
          <button
            className="w-8 h-5 rounded-md vista-close-btn flex items-center justify-center text-[10px] text-white font-black transition"
            title="Tutup jendela"
            aria-label="Tutup jendela aplikasi"
          >
            ✕
          </button>
        </div>
      </div>
    </header>
  );
};
