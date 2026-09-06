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

  let activeIndex = -1;
  for (let i = 0; i < parsedLines.length; i++) {
    if (currentTime >= parsedLines[i].time) {
      activeIndex = i;
    } else {
      break;
    }
  }

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

  const handleUpdateLine = (id: string, newText: string, newTimeSec: number) => {
    const updated = parsedLines.map((line) =>
      line.id === id ? { ...line, text: newText, time: newTimeSec } : line
    );
    setParsedLines(updated);
    handleSaveToStorage(updated);
  };

  const handleDeleteLine = (id: string) => {
    const filtered = parsedLines.filter((l) => l.id !== id);
    setParsedLines(filtered);
    handleSaveToStorage(filtered);
  };

  const handleAddLine = () => {
    if (!newLineText.trim()) return;

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
      <div className="p-12 text-center text-slate-500 max-w-xl mx-auto aero-glass rounded-3xl">
        <h3 className="text-base font-bold text-[#0f2942]">Belum Ada Lagu</h3>
        <p className="text-xs text-sky-800 mt-1">Pilih lagu di menu Library untuk menampilkan atau mengedit lirik.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto w-full aero-glass rounded-3xl p-4 sm:p-6 shadow-xl">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-sky-200/60 pb-3 mb-4 flex-wrap gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-black text-[#0f2942] tracking-tight">
              Manajer Lirik & Akord (CRUD)
            </h2>
            {pitchSemitones !== 0 && (
              <span className="text-[10px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full">
                Transpose: {pitchSemitones > 0 ? `+${pitchSemitones}` : pitchSemitones}
              </span>
            )}
          </div>
          <p className="text-xs text-sky-700 font-medium">
            {currentSong.title} by {currentSong.artist} • Sinkron Bar per Bar
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* AI Auto-Generate Button */}
          <button
            onClick={handleAIGenerateLyrics}
            disabled={isGeneratingAI}
            className="px-4 py-1.5 rounded-full bg-gradient-to-r from-sky-500 to-indigo-600 hover:opacity-95 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-sky-500/20 disabled:opacity-50"
            title="Generate lirik dan akord otomatis via Google Gemini"
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
          <div className="flex bg-white/80 p-1 rounded-full border border-sky-200 text-xs font-bold shadow-xs">
            <button
              onClick={() => setMode('view')}
              className={`px-3.5 py-1 rounded-full transition flex items-center gap-1 ${
                mode === 'view' ? 'bg-sky-600 text-white shadow-xs' : 'text-sky-900 hover:text-sky-600'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Live Karaoke</span>
            </button>
            <button
              onClick={() => setMode('crud')}
              className={`px-3.5 py-1 rounded-full transition flex items-center gap-1 ${
                mode === 'crud' ? 'bg-sky-600 text-white shadow-xs' : 'text-sky-900 hover:text-sky-600'
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
            <div className="text-center py-20 text-sky-800 space-y-3">
              <p className="text-sm font-medium">Belum ada lirik tersinkronisasi untuk lagu ini.</p>
              <button
                onClick={handleAIGenerateLyrics}
                className="px-5 py-2 rounded-full bg-gradient-to-r from-sky-500 to-blue-600 text-white text-xs font-bold shadow-md shadow-sky-500/20"
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
                        ? 'bg-sky-100/90 border border-sky-400 scale-105 shadow-md shadow-sky-500/15'
                        : 'opacity-50 hover:opacity-90 hover:bg-white/40'
                    }`}
                  >
                    {/* Chords Row */}
                    {line.chords && line.chords.length > 0 && (
                      <div className="flex justify-center gap-3 text-xs font-mono font-black text-amber-700 mb-1">
                        {line.chords.map((c, cIdx) => (
                          <span
                            key={cIdx}
                            className="px-2 py-0.5 rounded-full bg-amber-100 border border-amber-300"
                          >
                            {transposeChord(c.chord, pitchSemitones)}
                          </span>
                        ))}
                      </div>
                    )}

                    <p
                      className={`text-base sm:text-lg tracking-tight font-black ${
                        isActive ? 'text-[#0f2942]' : 'text-slate-700'
                      }`}
                    >
                      {line.text}
                    </p>

                    <span className="text-[10px] font-mono text-sky-700 font-bold block mt-1">
                      {formatSecondsToTime(line.time)}
                    </span>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          /* CRUD Table Editor */
          <div className="space-y-4">
            {/* Create New Line Bar */}
            <div className="p-3.5 rounded-2xl bg-white/80 border border-sky-200 flex flex-col sm:flex-row items-center gap-2 shadow-xs">
              <input
                type="text"
                value={newLineTime}
                onChange={(e) => setNewLineTime(e.target.value)}
                placeholder="MM:SS"
                className="w-24 bg-sky-50 border border-sky-200 rounded-xl px-2.5 py-1.5 text-xs text-sky-900 font-mono text-center focus:outline-none focus:border-sky-500"
                title="Format Waktu MM:SS"
              />
              <button
                onClick={() => setNewLineTime(formatSecondsToTime(currentTime))}
                className="px-3 py-1.5 rounded-xl bg-sky-100 text-sky-900 hover:bg-sky-200 text-xs border border-sky-300 flex items-center gap-1 font-bold"
                title="Gunakan posisi audio saat ini"
              >
                <Clock className="w-3.5 h-3.5 text-sky-600" />
                <span>Posisi ({formatSecondsToTime(currentTime)})</span>
              </button>
              <input
                type="text"
                value={newLineText}
                onChange={(e) => setNewLineText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddLine()}
                placeholder="Teks lirik [Em] dan akord..."
                className="flex-1 bg-sky-50 border border-sky-200 rounded-xl px-3 py-1.5 text-xs text-[#0f2942] focus:outline-none focus:border-sky-500"
              />
              <button
                onClick={handleAddLine}
                className="px-4 py-1.5 rounded-full bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-xs flex items-center gap-1 transition shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Baris</span>
              </button>
            </div>

            {/* List of Editable Lines */}
            <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
              {parsedLines.map((line) => (
                <div
                  key={line.id}
                  className="flex items-center gap-2 p-2 rounded-xl bg-white/70 border border-sky-200 hover:border-sky-300 shadow-2xs"
                >
                  <span className="w-16 font-mono text-[11px] text-sky-800 text-center font-bold">
                    {formatSecondsToTime(line.time)}
                  </span>
                  <input
                    type="text"
                    value={line.text}
                    onChange={(e) => handleUpdateLine(line.id, e.target.value, line.time)}
                    className="flex-1 bg-transparent text-xs text-[#0f2942] border-b border-transparent hover:border-sky-300 focus:border-sky-500 focus:outline-none px-1 py-0.5 font-bold"
                  />
                  <button
                    onClick={() => onSeek(line.time)}
                    className="p-1.5 text-sky-600 hover:text-sky-900"
                    title="Lompat ke timestamp ini"
                  >
                    <Clock className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteLine(line.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600"
                    title="Hapus baris"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {saveSuccess && (
              <div className="text-center text-xs text-emerald-700 font-bold flex items-center justify-center gap-1">
                <Check className="w-4 h-4" /> Perubahan tersimpan di library!
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
