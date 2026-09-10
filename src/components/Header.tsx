import React, { useState, useRef } from 'react';
import type { Song } from '../types';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Video,
  VideoOff,
  Shield,
  ShieldCheck,
  Music,
  Loader2,
  Plus,
} from 'lucide-react';
import { searchMusicSuggestions } from '../services/musicSearch';

interface HeaderProps {
  currentSong: Song | null;
  activeSoloNames: string[];
  onClearAllSolos: () => void;
  isNavOpen?: boolean;
  onToggleNav?: () => void;
  isVideoActive?: boolean;
  onToggleVideo?: () => void;
  isAdmin?: boolean;
  onToggleAdmin?: () => void;
  onSelectSuggestion?: (title: string, artist: string, album?: string, artwork?: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeSoloNames,
  onClearAllSolos,
  isNavOpen = true,
  onToggleNav,
  isVideoActive = true,
  onToggleVideo,
  isAdmin = false,
  onToggleAdmin,
  onSelectSuggestion,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = (val: string) => {
    setSearchQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (val.trim().length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setShowDropdown(true);
    debounceRef.current = setTimeout(async () => {
      const results = await searchMusicSuggestions(val);
      setSuggestions(results);
      setIsSearching(false);
    }, 300);
  };

  const handlePick = (item: any) => {
    onSelectSuggestion?.(item.title, item.artist, item.album, item.artworkUrl);
    setShowDropdown(false);
    setSearchQuery('');
  };

  return (
    <header className="aero-window-header w-full px-3 sm:px-6 py-2 transition-all sticky top-0 z-40 flex items-center justify-between gap-3 shadow-xs">
      {/* 1. Left: Sidebar Toggle, Navigation Circles, Brand Title, Search Bar */}
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

        {/* Windows Aero Back / Forward Navigation Circles */}
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

        {/* Clean Brand Typography */}
        <h1 className="flex items-baseline select-none m-0 text-inherit font-normal">
          <span className="text-xl sm:text-2xl font-black text-[#0c233c] tracking-tight">
            The Flannels
          </span>
          <span className="text-xs sm:text-sm font-bold text-sky-600 lowercase ml-1.5">
            pocket
          </span>
        </h1>

        {/* Interactive Aero Glass Search Bar with Auto-Suggestions */}
        <div className="hidden lg:block relative">
          <div className="flex items-center gap-2 bg-white/70 hover:bg-white/90 focus-within:bg-white border border-sky-200/80 rounded-full px-3.5 py-1 text-xs text-sky-800 shadow-xs transition w-64 focus-within:w-72">
            <Search className="w-3.5 h-3.5 text-sky-500 flex-shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
              placeholder="aku penggiat lagu..."
              className="w-full bg-transparent text-xs font-semibold focus:outline-none placeholder:text-slate-400"
            />
            {isSearching && <Loader2 className="w-3 h-3 text-sky-500 animate-spin flex-shrink-0" />}
          </div>

          {/* Search Results Dropdown */}
          {showDropdown && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-white/95 backdrop-blur-2xl border border-sky-300 rounded-2xl shadow-2xl overflow-hidden z-50 max-h-60 overflow-y-auto">
              <div className="p-1.5 text-[9px] font-bold uppercase text-slate-400 border-b border-sky-100">
                Pilih Lagu untuk Request:
              </div>
              {suggestions.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => handlePick(item)}
                  className="flex items-center justify-between gap-2 p-2 hover:bg-sky-50 cursor-pointer border-b border-sky-50 last:border-0 text-left group"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {item.artworkUrl ? (
                      <img src={item.artworkUrl} alt={item.title} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-sky-100 flex items-center justify-center text-sky-600 flex-shrink-0">
                        <Music className="w-4 h-4" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-bold text-[#0f2942] truncate block">{item.title}</span>
                      <span className="text-[10px] text-slate-500 truncate block">{item.artist} {item.album ? `• ${item.album}` : ''}</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePick(item);
                    }}
                    className="w-7 h-7 rounded-full bg-gradient-to-b from-sky-400 to-blue-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition active:scale-95 flex-shrink-0"
                    title="Request lagu ini"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 2. Right: Admin Badge, Video Toggle, Solo Alert Badge & Vista Window Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Admin Mode Badge / Toggle */}
        {onToggleAdmin && isAdmin && (
          <button
            onClick={onToggleAdmin}
            className={`px-3 py-1 rounded-full text-[11px] font-black border transition flex items-center gap-1.5 shadow-xs active:scale-95 ${
              isAdmin
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                : 'bg-white/80 hover:bg-white text-slate-700 border-sky-200'
            }`}
            title={isAdmin ? 'Mode Admin Aktif (Klik untuk Keluar)' : 'Masuk Mode Admin (Albarry)'}
          >
            {isAdmin ? <ShieldCheck className="w-3.5 h-3.5 text-white" /> : <Shield className="w-3.5 h-3.5 text-slate-400" />}
            <span>{isAdmin ? 'Admin Studio' : 'Admin'}</span>
          </button>
        )}

        {/* Artistic Frutiger Aero Video Background Toggle */}
        {onToggleVideo && (
          <button
            onClick={onToggleVideo}
            className={`px-3 py-1 rounded-full text-[10px] font-black border transition-all flex items-center gap-1.5 shadow-xs relative overflow-hidden active:scale-95 ${
              isVideoActive
                ? 'bg-gradient-to-b from-cyan-400 via-sky-500 to-blue-600 text-white border-cyan-200 shadow-[0_0_12px_rgba(14,165,233,0.5)]'
                : 'bg-white/50 hover:bg-white/80 text-slate-700 border-sky-200/90'
            }`}
            title={isVideoActive ? 'Matikan video background (hemat GPU/baterai)' : 'Nyalakan video background Aero'}
          >
            <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-white/60 to-transparent pointer-events-none" />
            {isVideoActive ? <Video className="w-3.5 h-3.5 text-cyan-100" /> : <VideoOff className="w-3.5 h-3.5 text-slate-500" />}
            <span className="hidden sm:inline font-extrabold">{isVideoActive ? 'Aero Video: ON' : 'Aero Video: OFF'}</span>
          </button>
        )}

        {/* Solo Active Alert */}
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
            onClick={() => window.dispatchEvent(new CustomEvent('flannels-window-control', { detail: 'minimize' }))}
            className="w-7 h-5 rounded-md vista-win-btn flex items-center justify-center text-[10px] text-slate-700 font-bold transition"
            title="Minimize jendela"
            aria-label="Minimize jendela aplikasi"
          >
            _
          </button>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('flannels-window-control', { detail: 'maximize' }))}
            className="w-7 h-5 rounded-md vista-win-btn flex items-center justify-center text-[10px] text-slate-700 font-bold transition"
            title="Maximize jendela"
            aria-label="Maximize jendela aplikasi"
          >
            □
          </button>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('flannels-window-control', { detail: 'close' }))}
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
