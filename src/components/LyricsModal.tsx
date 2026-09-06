import React, { useState, useEffect, useRef } from 'react';
import type { Song, LrcLine } from '../types';
import { parseLrc, transposeChord, formatSecondsToTime } from '../services/lyricsManager';
import { FileText, Edit3, Eye, Clock, X, Check, Music2 } from 'lucide-react';

interface LyricsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSong: Song | null;
  currentTime: number;
  pitchSemitones: number;
  onSeek: (time: number) => void;
  onUpdateLyrics: (newLyrics: string) => void;
}

export const LyricsModal: React.FC<LyricsModalProps> = ({
  isOpen,
  onClose,
  currentSong,
  currentTime,
  pitchSemitones,
  onSeek,
  onUpdateLyrics,
}) => {
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [editText, setEditText] = useState<string>('');
  const [parsedLines, setParsedLines] = useState<LrcLine[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (currentSong?.lyrics) {
      setEditText(currentSong.lyrics);
      setParsedLines(parseLrc(currentSong.lyrics));
    } else {
      setEditText('');
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

  if (!isOpen) return null;

  const handleSaveEdit = () => {
    onUpdateLyrics(editText);
    setParsedLines(parseLrc(editText));
    setMode('view');
  };

  const handleInsertTimestamp = () => {
    const timeFormatted = `[${formatSecondsToTime(currentTime)}.00] `;
    setEditText((prev) => `${prev}\n${timeFormatted}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-flannel-card border border-flannel-border rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-flannel-border bg-flannel-panel/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-pink-500/20 text-pink-400 flex items-center justify-center border border-pink-500/30">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Manajer Lirik & Chord Sheet
              </h2>
              <p className="text-xs text-slate-400">
                LRC Sinkronisasi Otomatis & Transposisi Akord Band
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mode Switcher */}
            <div className="flex bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-xs">
              <button
                onClick={() => setMode('view')}
                className={`px-3 py-1 rounded-md transition flex items-center gap-1 font-semibold ${
                  mode === 'view' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Live View</span>
              </button>
              <button
                onClick={() => setMode('edit')}
                className={`px-3 py-1 rounded-md transition flex items-center gap-1 font-semibold ${
                  mode === 'edit' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit LRC</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 bg-flannel-dark/40">
          {mode === 'view' ? (
            parsedLines.length === 0 ? (
              <div className="text-center py-16 text-slate-400 space-y-3">
                <Music2 className="w-10 h-10 mx-auto text-slate-600" />
                <p>Belum ada lirik tersinkronisasi untuk lagu ini.</p>
                <button
                  onClick={() => setMode('edit')}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-500 transition"
                >
                  Tambahkan Lirik / Chord Sekarang
                </button>
              </div>
            ) : (
              <div
                ref={scrollContainerRef}
                className="flex flex-col gap-4 py-8 text-center"
              >
                {parsedLines.map((line, idx) => {
                  const isActive = idx === activeIndex;

                  return (
                    <div
                      key={line.id}
                      onClick={() => onSeek(line.time)}
                      className={`cursor-pointer transition-all duration-200 p-3 rounded-2xl ${
                        isActive
                          ? 'bg-pink-500/15 border border-pink-500/40 scale-105 shadow-lg shadow-pink-500/10'
                          : 'opacity-50 hover:opacity-80 hover:bg-slate-800/40'
                      }`}
                    >
                      {/* Chords row with transposition */}
                      {line.chords && line.chords.length > 0 && (
                        <div className="flex justify-center gap-4 text-xs font-mono font-bold text-amber-400 mb-1">
                          {line.chords.map((c, cIdx) => (
                            <span
                              key={cIdx}
                              className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/30"
                            >
                              {transposeChord(c.chord, pitchSemitones)}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Lyric Text */}
                      <p
                        className={`text-base sm:text-lg font-medium tracking-tight ${
                          isActive ? 'text-white font-bold' : 'text-slate-300'
                        }`}
                      >
                        {line.text}
                      </p>

                      <span className="text-[10px] font-mono text-slate-500 block mt-1">
                        {formatSecondsToTime(line.time)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            /* Edit Mode */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  Format: <code className="text-pink-300">[mm:ss.xx] Lirik [Em] Chord</code>
                </span>
                <button
                  onClick={handleInsertTimestamp}
                  className="px-3 py-1.5 rounded-lg bg-flannel-panel border border-flannel-border text-xs font-semibold text-indigo-300 hover:border-indigo-500/50 flex items-center gap-1.5"
                  title="Sematkan timestamp posisi audio sekarang"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Insert Timestamp ({formatSecondsToTime(currentTime)})</span>
                </button>
              </div>

              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                rows={14}
                className="w-full bg-slate-900 text-slate-200 font-mono text-xs rounded-2xl p-4 border border-flannel-border focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                placeholder="[00:04.00] Bait pertama lirik [Em] [G]&#10;[00:08.50] Reff lagu..."
              />

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setMode('view')}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-indigo-600/20"
                >
                  <Check className="w-4 h-4" />
                  <span>Simpan Perubahan Lirik</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-flannel-border bg-flannel-panel/30 flex justify-between items-center text-xs text-slate-400">
          <span>
            {pitchSemitones !== 0 ? (
              <span className="text-amber-300">
                Akord ditransposisi ({pitchSemitones > 0 ? `+${pitchSemitones}` : pitchSemitones} semitone)
              </span>
            ) : (
              'Akord dalam tangga nada asli'
            )}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
