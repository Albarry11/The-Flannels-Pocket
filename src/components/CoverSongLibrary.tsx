import React, { useState, useRef } from 'react';
import type { Song, StemRole } from '../types';
import { createSongFromFiles, deleteSongFromStorage } from '../services/storage';
import { createProceduralDemoSong } from '../services/proceduralSongs';
import { Folder, Upload, Plus, Trash2, CheckCircle2, Music2, Loader2, Play, FileDown } from 'lucide-react';
import { formatSecondsToTime } from '../services/lyricsManager';
import { exportSongPackage } from '../services/cloudDatabase';

interface CoverSongLibraryProps {
  songs: Song[];
  currentSongId: string | null;
  onSelectSong: (song: Song) => void;
  onRefreshSongs: () => Promise<void>;
}

export const CoverSongLibrary: React.FC<CoverSongLibraryProps> = ({
  songs,
  currentSongId,
  onSelectSong,
  onRefreshSongs,
}) => {
  const [view, setView] = useState<'list' | 'upload'>('list');
  const [newTitle, setNewTitle] = useState('');
  const [newArtist, setNewArtist] = useState('The Flannels');
  const [stemUploads, setStemUploads] = useState<{ role: StemRole; name: string; file: File }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Auto-detect song title & artist from filename
    if (files.length === 1 && !newTitle) {
      const nameWithoutExt = files[0].name.replace(/\.[^/.]+$/, '');
      if (nameWithoutExt.includes('-')) {
        const parts = nameWithoutExt.split('-');
        setNewArtist(parts[0].trim());
        setNewTitle(parts.slice(1).join('-').trim());
      } else {
        setNewTitle(nameWithoutExt);
      }
    }

    const detected: { role: StemRole; name: string; file: File }[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const lower = file.name.toLowerCase();

      let role: StemRole = 'other';
      let name = file.name.replace(/\.[^/.]+$/, '');

      if (lower.includes('vocal') || lower.includes('vox')) {
        role = 'vocal';
        name = 'Vocal';
      } else if (lower.includes('lead') || lower.includes('solo')) {
        role = 'lead';
        name = 'Lead Guitar';
      } else if (lower.includes('rhythm') || lower.includes('guitar')) {
        role = 'rhythm';
        name = 'Rhythm Guitar';
      } else if (lower.includes('bass')) {
        role = 'bass';
        name = 'Bass Guitar';
      } else if (lower.includes('drum') || lower.includes('beat')) {
        role = 'drums';
        name = 'Drums';
      }

      detected.push({ role, name, file });
    }

    setStemUploads((prev) => [...prev, ...detected]);
  };

  const handleProcessUpload = async () => {
    if (stemUploads.length === 0) {
      alert('Pilih file audio terlebih dahulu.');
      return;
    }

    try {
      setIsProcessing(true);
      setProcessingStatus('Mempersiapkan audio...');

      const song = await createSongFromFiles(
        newTitle || 'Cover Song Baru',
        newArtist || 'The Flannels',
        stemUploads,
        {
          onProgress: (status) => setProcessingStatus(status),
        }
      );

      await onRefreshSongs();
      onSelectSong(song);
      setIsProcessing(false);
      setView('list');
      setStemUploads([]);
      setNewTitle('');
    } catch (err) {
      console.error(err);
      alert('Gagal memproses audio. Pastikan format didukung (FLAC, WAV, MP3).');
      setIsProcessing(false);
    }
  };

  const handleDelete = async (songId: string) => {
    if (confirm('Hapus lagu cover ini dari library?')) {
      await deleteSongFromStorage(songId);
      await onRefreshSongs();
    }
  };

  const handleExportBackup = async () => {
    const blob = await exportSongPackage();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `The-Flannels-Library-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleLoadDemo = async () => {
    setIsProcessing(true);
    setProcessingStatus('Membuat audio stem demo studio The Flannels...');
    const demo = await createProceduralDemoSong(
      'Midnight Groove (Rock/Funk)',
      'The Flannels',
      115,
      'Em',
      24
    );
    await onRefreshSongs();
    onSelectSong(demo);
    setIsProcessing(false);
  };

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto w-full bg-[#080f1e]/80 rounded-3xl border border-cyan-500/25 p-4 sm:p-6 shadow-2xl backdrop-blur-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3 mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
            <Folder className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-extrabold text-white tracking-tight">
              Library Lagu Cover The Flannels
            </h2>
            <p className="text-xs text-cyan-300/80">
              Penyimpanan Tersentralisasi • AI Stem Separation Terintegrasi
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {songs.length > 0 && (
            <button
              onClick={handleExportBackup}
              className="px-3 py-1.5 rounded-xl bg-[#060c18] border border-cyan-500/25 text-slate-300 hover:text-white text-xs font-semibold transition flex items-center gap-1.5"
              title="Ekspor paket library JSON"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ekspor</span>
            </button>
          )}

          <button
            onClick={() => setView(view === 'list' ? 'upload' : 'list')}
            className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-cyan-500/20"
          >
            {view === 'list' ? (
              <>
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Lagu</span>
              </>
            ) : (
              <span>Lihat Library</span>
            )}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto pr-1">
        {view === 'list' ? (
          songs.length === 0 ? (
            /* Empty State */
            <div className="text-center py-20 px-4 rounded-2xl bg-[#050b16] border border-cyan-500/20 space-y-4 max-w-lg mx-auto">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
                <Music2 className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Library Lagu Masih Kosong</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Unggah file lagu audio (MP3/FLAC). AI akan langsung memisahkan vokal, gitar, bass, dan drum secara otomatis!
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 pt-2">
                <button
                  onClick={() => setView('upload')}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-bold shadow-md shadow-cyan-500/20"
                >
                  ➕ Unggah Lagu Cover
                </button>
                <button
                  onClick={handleLoadDemo}
                  disabled={isProcessing}
                  className="px-4 py-2 rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/40 text-xs font-bold"
                >
                  ✨ Coba Demo Track Studio
                </button>
              </div>
            </div>
          ) : (
            /* Song Cards Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {songs.map((song) => {
                const isSelected = song.id === currentSongId;

                return (
                  <div
                    key={song.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 shadow-md relative overflow-hidden ${
                      isSelected
                        ? 'bg-gradient-to-r from-[#0c2242] to-[#08152b] border-cyan-400 shadow-[0_0_16px_rgba(6,182,212,0.25)]'
                        : 'bg-[#050b16] border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-base font-extrabold text-white tracking-tight truncate">
                          {song.title}
                        </h4>
                        {isSelected && (
                          <span className="text-[10px] bg-cyan-500 text-black px-2 py-0.5 rounded-full font-black">
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-cyan-300/80 font-medium">
                        by {song.artist}
                      </span>

                      <div className="flex items-center gap-2 mt-2.5 flex-wrap text-xs font-mono">
                        <span className="px-2 py-0.5 rounded bg-[#091526] border border-cyan-500/30 text-cyan-300 font-bold">
                          {song.bpm} BPM
                        </span>
                        <span className="px-2 py-0.5 rounded bg-[#091526] border border-amber-500/30 text-amber-300 font-bold">
                          {song.originalKey}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-[#091526] border border-slate-700 text-slate-400">
                          {formatSecondsToTime(song.duration)}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-[#091526] border border-indigo-500/30 text-indigo-300 font-bold">
                          {song.stems.length} Stems
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-800/80 pt-2.5 mt-1">
                      <button
                        onClick={() => onSelectSong(song)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-cyan-500 text-black font-extrabold'
                            : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                        }`}
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>{isSelected ? 'Dimuat di Mixer' : 'Pilih Lagu'}</span>
                      </button>

                      <button
                        onClick={() => handleDelete(song.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                        title="Hapus lagu"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          /* Upload View with Automatic AI Stem Separation */
          <div className="space-y-4 max-w-xl mx-auto">
            <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 text-xs text-slate-300 space-y-1">
              <span className="font-bold text-cyan-300 block text-sm">
                🤖 AI Stem Separator & Auto-Research
              </span>
              <p>
                Kamu cukup mengunggah <strong>1 file lagu utuh</strong> (MP3/FLAC/WAV). Sistem AI akan otomatis memisahkan vokal, lead guitar, rhythm, bass, dan drum, serta meriset BPM & Key resmi lagu ini!
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-300 font-bold block mb-1">Judul Lagu</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Contoh: Dan"
                  className="w-full bg-[#050b16] border border-cyan-500/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
              </div>
              <div>
                <label className="text-xs text-slate-300 font-bold block mb-1">Artis / Band</label>
                <input
                  type="text"
                  value={newArtist}
                  onChange={(e) => setNewArtist(e.target.value)}
                  placeholder="Sheila On 7"
                  className="w-full bg-[#050b16] border border-cyan-500/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            {/* Dropzone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-cyan-500/40 hover:border-cyan-400 rounded-2xl p-6 text-center cursor-pointer bg-[#050b16] transition flex flex-col items-center justify-center gap-2 group"
            >
              <Upload className="w-8 h-8 text-cyan-400 group-hover:scale-110 transition" />
              <p className="text-xs font-bold text-white">
                Pilih File Audio Lagu (FLAC, WAV, MP3)
              </p>
              <p className="text-[11px] text-slate-400">
                1 file lagu utuh untuk AI split otomatis, atau multi-stem jika sudah terpisah.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="audio/*,.flac,.wav,.mp3,.ogg,.m4a"
                onChange={handleFilesSelected}
                className="hidden"
              />
            </div>

            {/* File List */}
            {stemUploads.length > 0 && (
              <div className="p-3 rounded-xl bg-[#050b16] border border-slate-800 space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase">
                  File Terpilih ({stemUploads.length}):
                </span>
                {stemUploads.map((s, idx) => (
                  <div key={idx} className="text-xs text-cyan-300 font-mono flex justify-between">
                    <span>{s.file.name}</span>
                    <span className="text-slate-400 font-sans">
                      {stemUploads.length === 1 ? 'AI 5-Stem Split' : s.role}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Submit Button */}
            <button
              onClick={handleProcessUpload}
              disabled={isProcessing || stemUploads.length === 0}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 text-white text-xs font-extrabold transition flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{processingStatus || 'Memproses Lagu...'}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Mulai Pisahkan Stem & Simpan ke Library</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
