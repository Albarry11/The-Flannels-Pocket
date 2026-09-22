import React, { useState, useEffect, useRef } from 'react';
import type { Song } from '../types';
import { transposeChord } from '../services/lyricsManager';
import { researchLyricsAndChords } from '../services/lyricsResearch';
import type { LyricsResearchResult } from '../services/lyricsResearch';
import {
  Search,
  Sparkles,
  Loader2,
  Check,
  Edit3,
  BookOpen,
  ArrowDown,
  Music,
} from 'lucide-react';

interface LyricsManagerProps {
  currentSong: Song | null;
  currentTime: number;
  pitchSemitones: number;
  onSeek: (time: number) => void;
  onUpdateLyrics: (newLyrics: string) => Promise<void>;
}

export const LyricsManager: React.FC<LyricsManagerProps> = ({
  currentSong,
  currentTime,
  pitchSemitones,
  onUpdateLyrics,
}) => {
  const [viewMode, setViewMode] = useState<'songbook' | 'editor'>('songbook');
  const [lyricsText, setLyricsText] = useState<string>('');
  const [isSearchingAI, setIsSearchingAI] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [researchResult, setResearchResult] = useState<LyricsResearchResult | null>(null);

  // Search input state
  const [searchTitle, setSearchTitle] = useState('');
  const [searchArtist, setSearchArtist] = useState('');

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Sync lyrics when currentSong changes
  useEffect(() => {
    if (currentSong) {
      setLyricsText(currentSong.lyrics || '');
      setSearchTitle(currentSong.title);
      setSearchArtist(currentSong.artist);
    } else {
      setLyricsText('');
      setSearchTitle('');
      setSearchArtist('');
    }
  }, [currentSong]);

  // Smooth auto-scroll based on playback percentage
  useEffect(() => {
    if (autoScroll && viewMode === 'songbook' && scrollContainerRef.current && currentSong?.duration) {
      const progress = Math.min(1, Math.max(0, currentTime / currentSong.duration));
      const container = scrollContainerRef.current;
      const targetScroll = (container.scrollHeight - container.clientHeight) * progress;
      container.scrollTo({ top: targetScroll, behavior: 'smooth' });
    }
  }, [currentTime, autoScroll, viewMode, currentSong?.duration]);

  const handleSearchAI = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const titleToSearch = searchTitle.trim() || currentSong?.title || '';
    const artistToSearch = searchArtist.trim() || currentSong?.artist || '';

    if (!titleToSearch) {
      alert('Masukkan judul lagu yang ingin dicari.');
      return;
    }

    setIsSearchingAI(true);
    try {
      const result = await researchLyricsAndChords(titleToSearch, artistToSearch);
      setResearchResult(result);
      if (result.text && result.text.trim()) {
        setLyricsText(result.text);
        await onUpdateLyrics(result.text);
        setViewMode('songbook');
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
      } else {
        alert('Tidak dapat menemukan chord & lirik untuk lagu ini. Anda bisa menulis atau menempelkannya secara manual.');
      }
    } catch (err) {
      alert('Pencarian lirik gagal: ' + (err instanceof Error ? err.message : err));
    } finally {
      setIsSearchingAI(false);
    }
  };

  const handleManualSave = async () => {
    await onUpdateLyrics(lyricsText);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  // Helper to parse line into chords and lyrics fragments
  const renderChordLine = (line: string, lineIndex: number) => {
    const trimmed = line.trim();
    if (!trimmed) return <div key={lineIndex} className="h-4" />;

    // Check if section header like [Intro], [Verse 1], [Chorus], [Bridge], [Solo]
    const sectionMatch = trimmed.match(/^\[(intro|verse|chorus|reff|pre-chorus|bridge|solo|outro|interlude)[^\]]*\]/i);
    if (sectionMatch) {
      return (
        <div key={lineIndex} className="pt-4 pb-1 flex items-center gap-2">
          <span className="px-3 py-1 rounded-xl bg-gradient-to-r from-sky-600/90 to-blue-700/90 text-white font-mono font-black text-xs uppercase tracking-wider shadow-xs border border-white/20">
            {trimmed.replace(/[\[\]]/g, '')}
          </span>
          <div className="h-px bg-sky-300/40 flex-1" />
        </div>
      );
    }

    // Split line by bracketed chords [C], [D/F#], etc.
    const parts: { isChord: boolean; text: string }[] = [];
    const regex = /\[([A-G][b#]?(?:m|maj|min|dim|aug|sus[24]?|add[9]?|[0-9])*(?:\/[A-G][b#]?)?)\]/g;
    let lastIdx = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(line)) !== null) {
      if (match.index > lastIdx) {
        parts.push({ isChord: false, text: line.slice(lastIdx, match.index) });
      }
      parts.push({ isChord: true, text: match[1] });
      lastIdx = regex.lastIndex;
    }
    if (lastIdx < line.length) {
      parts.push({ isChord: false, text: line.slice(lastIdx) });
    }

    // If no chords found in brackets, check if line is purely space-separated chords (e.g. C   G   Am)
    const pureChordMatch = trimmed.match(/^([A-G][b#]?(?:m|maj|min|dim|aug|sus[24]?|add[9]?|[0-9])*(?:\/[A-G][b#]?)?(\s+|$))+$/);
    if (pureChordMatch) {
      const rawChords = trimmed.split(/\s+/);
      return (
        <div key={lineIndex} className="flex flex-wrap gap-2.5 my-1.5 font-mono text-sm font-black text-amber-700">
          {rawChords.map((c, i) => (
            <span
              key={i}
              className="px-2.5 py-0.5 rounded-lg bg-amber-100/90 text-amber-950 border border-amber-300 shadow-2xs"
            >
              {transposeChord(c, pitchSemitones)}
            </span>
          ))}
        </div>
      );
    }

    // Render interleaved chords and lyrics
    return (
      <div key={lineIndex} className="leading-relaxed text-sm sm:text-base font-semibold text-[#0c243b] py-0.5 flex flex-wrap items-baseline">
        {parts.map((part, pIdx) => {
          if (part.isChord) {
            const transposed = transposeChord(part.text, pitchSemitones);
            return (
              <span
                key={pIdx}
                className="inline-flex items-center px-1.5 py-0.5 mx-1 rounded-md bg-amber-200/90 text-amber-950 font-mono font-black text-xs border border-amber-400/80 shadow-2xs -translate-y-0.5"
                title={`Akord: ${transposed}`}
              >
                {transposed}
              </span>
            );
          }
          return <span key={pIdx}>{part.text}</span>;
        })}
      </div>
    );
  };

  if (!currentSong) {
    return (
      <div className="p-12 text-center text-slate-500 max-w-xl mx-auto aero-glass rounded-3xl">
        <h3 className="text-base font-bold text-[#0f2942]">Belum Ada Lagu Dipilih</h3>
        <p className="text-xs text-sky-800 mt-1">Pilih lagu di menu Library untuk menampilkan atau mengedit chord dan lirik.</p>
      </div>
    );
  }

  const lines = lyricsText.split('\n');

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto w-full aero-glass rounded-xl sm:rounded-2xl p-1.5 sm:p-3 shadow-lg relative min-h-0">
      {/* 1. Header Toolbar - Compact Integrated Segmented Switch & Inline Search */}
      <div className="flex items-center justify-between border-b border-sky-200/50 pb-1.5 mb-1.5 gap-1.5 flex-nowrap">
        {/* Integrated Vista Tab Switcher */}
        <div className="flex items-center p-0.5 rounded-lg sm:rounded-xl bg-white/50 border border-white/70 shadow-2xs backdrop-blur-md flex-shrink-0">
          <button
            onClick={() => setViewMode('songbook')}
            className={`py-1 px-2 sm:px-2.5 rounded-md sm:rounded-lg font-black text-[10px] sm:text-xs transition-all flex items-center gap-1 active:scale-95 ${
              viewMode === 'songbook'
                ? 'bg-gradient-to-b from-sky-400 via-sky-500 to-blue-600 text-white shadow-xs border border-white/60'
                : 'text-sky-950 hover:bg-white/40'
            }`}
          >
            <BookOpen className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span>Songbook</span>
          </button>
          <button
            onClick={() => setViewMode('editor')}
            className={`py-1 px-2 sm:px-2.5 rounded-md sm:rounded-lg font-black text-[10px] sm:text-xs transition-all flex items-center gap-1 active:scale-95 ${
              viewMode === 'editor'
                ? 'bg-gradient-to-b from-sky-400 via-sky-500 to-blue-600 text-white shadow-xs border border-white/60'
                : 'text-sky-950 hover:bg-white/40'
            }`}
          >
            <Edit3 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span>Edit Tab</span>
          </button>
        </div>

        {/* Compact Search & Action Controls */}
        <div className="flex items-center gap-1 sm:gap-1.5 flex-1 min-w-0 justify-end">
          {pitchSemitones !== 0 && (
            <span className="text-[9px] sm:text-[10px] font-mono font-bold bg-amber-100/90 text-amber-900 border border-amber-300 px-1.5 sm:px-2 py-0.5 rounded-md shadow-2xs flex-shrink-0">
              {pitchSemitones > 0 ? `+${pitchSemitones}` : pitchSemitones}
            </span>
          )}

          {viewMode === 'songbook' && (
            <label className="flex items-center gap-1 text-[9px] sm:text-[11px] text-sky-900 font-bold bg-white/80 px-1.5 sm:px-2 py-1 rounded-md sm:rounded-lg border border-sky-200 cursor-pointer select-none shadow-2xs flex-shrink-0">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded text-sky-600 focus:ring-0"
              />
              <ArrowDown className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-sky-600" />
              <span className="hidden md:inline">Auto-Scroll</span>
            </label>
          )}

          {/* Inline AI Search Bar */}
          <form onSubmit={handleSearchAI} className="flex items-center gap-1 flex-1 max-w-sm min-w-0 justify-end">
            <div className="flex items-center gap-1 bg-white/90 border border-sky-300/80 rounded-lg sm:rounded-xl px-1.5 sm:px-2.5 py-0.5 sm:py-1 shadow-xs focus-within:ring-2 focus-within:ring-sky-400 min-w-0 flex-1">
              <Search className="w-3 h-3 text-sky-600 flex-shrink-0" />
              <input
                type="text"
                value={searchTitle}
                onChange={(e) => setSearchTitle(e.target.value)}
                placeholder="Cari chord AI (Judul / Artis)..."
                className="w-full bg-transparent text-[10px] sm:text-xs text-[#0f2942] font-semibold focus:outline-none placeholder:text-slate-400 min-w-0"
              />
            </div>
            <button
              type="submit"
              disabled={isSearchingAI}
              className="px-2 sm:px-2.5 py-1 rounded-lg sm:rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:opacity-95 text-white text-[9px] sm:text-[11px] font-black transition flex items-center gap-1 shadow-xs active:scale-95 disabled:opacity-50 flex-shrink-0"
              title="Cari Chord & Lirik via AI"
            >
              {isSearchingAI ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Sparkles className="w-3 h-3 text-amber-300" />
              )}
              <span className="hidden sm:inline">Cari AI</span>
            </button>
          </form>
        </div>
      </div>

      {researchResult && (
        <div className="mb-3 p-3 rounded-2xl bg-slate-950/90 text-white border border-sky-400/30">
          <div className="flex items-center gap-2 text-xs font-black">
            <Search className="w-3.5 h-3.5 text-sky-300" />
            <span>Hasil sumber untuk {researchResult.query}</span>
          </div>
          {researchResult.sources.length > 0 ? (
            <div className="mt-2 space-y-1">
              {researchResult.sources.map((source) => (
                <a key={source.url} href={source.url} target="_blank" rel="noreferrer" className="block text-[10px] text-sky-200 hover:text-white underline truncate">
                  {source.title || source.url}
                </a>
              ))}
            </div>
          ) : (
            <p className="mt-1 text-[10px] text-amber-200">Provider web 9Router belum tersedia. Tidak ada sumber yang diklaim.</p>
          )}
        </div>
      )}

      {/* Save Success Alert Banner */}
      {saveSuccess && (
        <div className="mb-3 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center gap-1.5 animate-in fade-in duration-100">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>Chord dan lirik berhasil disimpan ke lagu!</span>
        </div>
      )}

      {/* 3. Main Display View */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        {viewMode === 'songbook' ? (
          /* SONGBOOK VIEW */
          <div
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto pr-1.5 p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white/80 border border-sky-200/80 shadow-inner font-sans"
          >
            {lyricsText.trim() ? (
              <div className="max-w-2xl mx-auto space-y-1">
                {lines.map((line, idx) => renderChordLine(line, idx))}
              </div>
            ) : (
              <div className="text-center py-12 sm:py-20 space-y-2.5">
                <Music className="w-10 h-10 text-sky-400 mx-auto" />
                <h3 className="text-sm font-extrabold text-[#0f2942]">Belum Ada Chord & Lirik</h3>
                <p className="text-[11px] sm:text-xs text-slate-600 max-w-sm mx-auto">
                  Cari cepat via bar AI di atas atau beralih ke tab <strong>"Edit Tab"</strong> untuk menempelkan tab.
                </p>
              </div>
            )}
          </div>
        ) : (
          /* EDITOR VIEW */
          <div className="flex-1 flex flex-col gap-2 min-h-0">
            <div className="flex items-center justify-between text-[11px] sm:text-xs text-sky-900 font-bold px-1">
              <span>Editor Tab (Paste chord/lirik):</span>
              <span className="text-[9px] sm:text-[10px] text-slate-500">Format: [C] [G] sebelum lirik</span>
            </div>
            <textarea
              value={lyricsText}
              onChange={(e) => setLyricsText(e.target.value)}
              placeholder={`Contoh:\n[Intro]\n[C] [F] [C] [F]\n\n[Verse 1]\n[C]Dan... bila [F]esok datang kembali\nSeperti se[C]dia kala di mana kau bi[F]sa`}
              className="flex-1 w-full p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl bg-white/90 border border-sky-300 font-mono text-xs sm:text-sm text-[#0c243b] focus:outline-none focus:ring-2 focus:ring-sky-400 shadow-inner resize-none leading-relaxed"
            />
            <div className="flex justify-end gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={handleManualSave}
                className="px-4 sm:px-5 py-1.5 rounded-lg sm:rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:opacity-95 text-white text-xs font-black shadow-xs active:scale-95 transition flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Simpan Tab</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
