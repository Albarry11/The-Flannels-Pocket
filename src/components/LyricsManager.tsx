import React, { useState, useEffect, useRef } from 'react';
import type { Song, LrcLine } from '../types';
import { parseLrc, transposeChord, formatSecondsToTime } from '../services/lyricsManager';
import { generateLyricsAndChordsWithAI } from '../services/aiBrain';
import { Eye, Edit3, Plus, Trash2, Check, Clock, Sparkles, Loader2 } from 'lucide-react';

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
  onSeek,
  onUpdateLyrics,
}) => {
  const [mode, setMode] = useState<'view' | 'crud'>('view');
  const [parsedLines, setParsedLines] = useState<LrcLine[]>([]);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // For adding a new line in CRUD mode
  const [newLineTime, setNewLineTime] = useState<string>('00:00.00');
  const [newLineText, setNewLineText] = useState<string>('');

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (currentSong?.lyrics) {
      setParsedLines(parseLrc(currentSong.lyrics));
    } else {
      setParsedLines([]);
    }
  }, [currentSong]);

  // Find active line index
  let activeIndex = -1;
  for (let i = 0; i < parsedLines.length; i++) {
    if (currentTime >= parsedLines[i].time) {
      activeIndex = i;
    } else {
      break;
    }
  }

  // Auto-scroll to active lyric line in view mode
  useEffect(() => {
    if (mode === 'view' && activeIndex >= 0 && scrollContainerRef.current) {
      const activeEl = scrollContainerRef.current.children[activeIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [activeIndex, mode]);

  const compileLrcText = (lines: LrcLine[]): string => {
    return lines
      .map((l) => {
        const timeFormatted = `[${formatSecondsToTime(l.time)}.00]`;
        return `${timeFormatted} ${l.text}`;
      })
      .join('\n');
  };

  const handleSaveToStorage = async (linesToSave: LrcLine[]) => {
    const compiled = compileLrcText(linesToSave);
    await onUpdateLyrics(compiled);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  // CRUD: Update text or timestamp of existing line
  const handleUpdateLine = (id: string, newText: string, newTimeSec: number) => {
    const updated = parsedLines.map((line) =>
      line.id === id ? { ...line, text: newText, time: newTimeSec } : line
    );
    setParsedLines(updated);
    handleSaveToStorage(updated);
  };

  // CRUD: Delete line
  const handleDeleteLine = (id: string) => {
    const filtered = parsedLines.filter((l) => l.id !== id);
    setParsedLines(filtered);
    handleSaveToStorage(filtered);
  };

  // CRUD: Add new line
  const handleAddLine = () => {
    if (!newLineText.trim()) return;

    // Parse time MM:SS.xx
    let timeSec = currentTime;
    const match = newLineTime.match(/^(\d{1,2}):(\d{2})/);
    if (match) {
      timeSec = parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
    }

    const newLine: LrcLine = {
      id: `line-${Date.now()}`,
      time: timeSec,
      text: newLineText.trim(),
    };

    const updated = [...parsedLines, newLine].sort((a, b) => a.time - b.time);
    setParsedLines(updated);
    setNewLineText('');
    setNewLineTime(formatSecondsToTime(currentTime));
    handleSaveToStorage(updated);
  };

  // AI Auto-Generate Lyrics & Chords (Point 10)
  const handleAIGenerateLyrics = async () => {
    if (!currentSong) return;
    setIsGeneratingAI(true);
    try {
      const generatedLrc = await generateLyricsAndChordsWithAI(currentSong.title, currentSong.artist);
      if (generatedLrc) {
        await onUpdateLyrics(generatedLrc);
        setParsedLines(parseLrc(generatedLrc));
        setMode('view');
      } else {
        alert('AI tidak dapat menemukan lirik untuk lagu ini. Coba tulis lirik secara manual.');
      }
    } catch (err) {
      alert('Gagal menghasilkan lirik via AI.');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  if (!currentSong) {
    return (
      <div className="p-12 text-center text-slate-500 max-w-xl mx-auto">
        <h3 className="text-base font-bold text-white">Belum Ada Lagu</h3>
        <p className="text-xs text-slate-400 mt-1">Pilih lagu di menu Library untuk menampilkan atau mengedit lirik.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto w-full bg-[#080f1e]/80 rounded-3xl border border-cyan-500/25 p-4 sm:p-6 shadow-2xl backdrop-blur-xl">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3 mb-4 flex-wrap gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm sm:text-base font-extrabold text-white tracking-tight">
              Manajer Lirik & Akord (CRUD)
            </h2>
            {pitchSemitones !== 0 && (
              <span className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
                Transpose: {pitchSemitones > 0 ? `+${pitchSemitones}` : pitchSemitones}
              </span>
            )}
          </div>
          <p className="text-xs text-cyan-300/80">
            {currentSong.title} by {currentSong.artist} • Sinkron Bar per Bar
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* AI Auto-Generate Button (Point 10) */}
          <button
            onClick={handleAIGenerateLyrics}
            disabled={isGeneratingAI}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-purple-600/20 disabled:opacity-50"
            title="Generate lirik dan akord otomatis via AI 20128"
          >
            {isGeneratingAI ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>AI Menyusun Lirik...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>AI Auto-Lirik & Chord</span>
              </>
            )}
          </button>

          {/* View / CRUD Switcher */}
          <div className="flex bg-[#050b16] p-0.5 rounded-xl border border-cyan-500/20 text-xs">
            <button
              onClick={() => setMode('view')}
              className={`px-3 py-1 rounded-lg transition font-bold flex items-center gap-1 ${
                mode === 'view' ? 'bg-cyan-500 text-black shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Live Karaoke</span>
            </button>
            <button
              onClick={() => setMode('crud')}
              className={`px-3 py-1 rounded-lg transition font-bold flex items-center gap-1 ${
                mode === 'crud' ? 'bg-cyan-500 text-black shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>CRUD Editor</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto pr-1">
        {mode === 'view' ? (
          /* Live Karaoke View */
          parsedLines.length === 0 ? (
            <div className="text-center py-20 text-slate-400 space-y-3">
              <p className="text-sm">Belum ada lirik tersinkronisasi untuk lagu ini.</p>
              <button
                onClick={handleAIGenerateLyrics}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-bold shadow-md shadow-cyan-500/20"
              >
                ✨ Buat Otomatis dengan AI
              </button>
            </div>
          ) : (
            <div
              ref={scrollContainerRef}
              className="flex flex-col gap-4 py-10 text-center max-w-2xl mx-auto"
            >
              {parsedLines.map((line, idx) => {
                const isActive = idx === activeIndex;

                return (
                  <div
                    key={line.id}
                    onClick={() => onSeek(line.time)}
                    className={`cursor-pointer transition-all duration-200 p-3.5 rounded-2xl ${
                      isActive
                        ? 'bg-gradient-to-r from-cyan-950/40 via-blue-950/50 to-cyan-950/40 border border-cyan-400/60 scale-105 shadow-xl shadow-cyan-500/15'
                        : 'opacity-40 hover:opacity-80 hover:bg-[#071020]/40'
                    }`}
                  >
                    {/* Embedded Chords Row with Transposition */}
                    {line.chords && line.chords.length > 0 && (
                      <div className="flex justify-center gap-3 text-xs font-mono font-extrabold text-amber-400 mb-1.5">
                        {line.chords.map((c, cIdx) => (
                          <span
                            key={cIdx}
                            className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40"
                          >
                            {transposeChord(c.chord, pitchSemitones)}
                          </span>
                        ))}
                      </div>
                    )}

                    <p
                      className={`text-base sm:text-lg tracking-tight font-bold ${
                        isActive ? 'text-white' : 'text-slate-300'
                      }`}
                    >
                      {line.text}
                    </p>

                    <span className="text-[10px] font-mono text-cyan-300/60 block mt-1">
                      {formatSecondsToTime(line.time)}
                    </span>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          /* CRUD Table Editor (Create, Read, Update, Delete) */
          <div className="space-y-4">
            {/* Create New Line Bar */}
            <div className="p-3.5 rounded-2xl bg-[#050b16] border border-cyan-500/30 flex flex-col sm:flex-row items-center gap-2">
              <input
                type="text"
                value={newLineTime}
                onChange={(e) => setNewLineTime(e.target.value)}
                placeholder="MM:SS"
                className="w-24 bg-[#081324] border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-cyan-300 font-mono text-center focus:outline-none focus:border-cyan-400"
                title="Format Waktu MM:SS"
              />
              <button
                onClick={() => setNewLineTime(formatSecondsToTime(currentTime))}
                className="px-2 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs border border-slate-700 flex items-center gap-1"
                title="Gunakan posisi audio saat ini"
              >
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span>Current ({formatSecondsToTime(currentTime)})</span>
              </button>
              <input
                type="text"
                value={newLineText}
                onChange={(e) => setNewLineText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddLine()}
                placeholder="Teks lirik [Em] dan akord..."
                className="flex-1 bg-[#081324] border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400"
              />
              <button
                onClick={handleAddLine}
                className="px-4 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs flex items-center gap-1 transition shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Baris</span>
              </button>
            </div>

            {/* List of Editable Lines (Read / Update / Delete) */}
            <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
              {parsedLines.map((line) => (
                <div
                  key={line.id}
                  className="flex items-center gap-2 p-2 rounded-xl bg-[#060c18] border border-slate-800 hover:border-slate-700"
                >
                  <span className="w-16 font-mono text-[11px] text-cyan-400 text-center font-bold">
                    {formatSecondsToTime(line.time)}
                  </span>
                  <input
                    type="text"
                    value={line.text}
                    onChange={(e) => handleUpdateLine(line.id, e.target.value, line.time)}
                    className="flex-1 bg-transparent text-xs text-slate-200 border-b border-transparent hover:border-slate-700 focus:border-cyan-400 focus:outline-none px-1 py-0.5 font-medium"
                  />
                  <button
                    onClick={() => onSeek(line.time)}
                    className="p-1.5 text-slate-400 hover:text-cyan-300"
                    title="Lompat ke timestamp ini"
                  >
                    <Clock className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteLine(line.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-400"
                    title="Hapus baris"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {saveSuccess && (
              <div className="text-center text-xs text-emerald-400 font-semibold flex items-center justify-center gap-1">
                <Check className="w-4 h-4" /> Perubahan tersimpan di database lokal!
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
