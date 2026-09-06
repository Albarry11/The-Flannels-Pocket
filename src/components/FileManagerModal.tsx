import React, { useState, useRef } from 'react';
import type { Song, StemRole } from '../types';
import { createSongFromFiles, deleteSongFromStorage } from '../services/storage';
import { Folder, Upload, Plus, Trash2, CheckCircle2, Music2, Loader2, X, Sparkles, Cloud, Database } from 'lucide-react';
import { formatSecondsToTime } from '../services/lyricsManager';

interface FileManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  songs: Song[];
  currentSongId: string | null;
  onSelectSong: (song: Song) => void;
  onRefreshSongs: () => Promise<void>;
  onOpenCloudSync: () => void;
  onLoadDemoSong: () => Promise<void>;
}

export const FileManagerModal: React.FC<FileManagerModalProps> = ({
  isOpen,
  onClose,
  songs,
  currentSongId,
  onSelectSong,
  onRefreshSongs,
  onOpenCloudSync,
  onLoadDemoSong,
}) => {
  const [activeView, setActiveView] = useState<'list' | 'upload'>('list');
  const [newTitle, setNewTitle] = useState('');
  const [newArtist, setNewArtist] = useState('The Flannels');
  const [stemUploads, setStemUploads] = useState<{ role: StemRole; name: string; file: File }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const detected: { role: StemRole; name: string; file: File }[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const lower = file.name.toLowerCase();

      let role: StemRole = 'other';
      let name = file.name.replace(/\.[^/.]+$/, '');

      if (lower.includes('vocal') || lower.includes('vox') || lower.includes('sing')) {
        role = 'vocal';
        name = 'Vocal';
      } else if (lower.includes('lead') || lower.includes('solo')) {
        role = 'lead';
        name = 'Lead Guitar';
      } else if (lower.includes('rhythm') || lower.includes('guitar') || lower.includes('gtr')) {
        role = 'rhythm';
        name = 'Rhythm Guitar';
      } else if (lower.includes('bass')) {
        role = 'bass';
        name = 'Bass Guitar';
      } else if (lower.includes('drum') || lower.includes('percussion') || lower.includes('beat')) {
        role = 'drums';
        name = 'Drums';
      }

      detected.push({ role, name, file });
    }

    setStemUploads((prev) => [...prev, ...detected]);
  };

  const handleCreateSong = async () => {
    if (stemUploads.length === 0) {
      alert('Pilih minimal satu file audio (FLAC, WAV, MP3) untuk stem latihan.');
      return;
    }

    try {
      setIsProcessing(true);
      setProcessingStatus('Mendekode audio & menjalankan Penganalisis Kualitas SpotiFLAC multi-window...');
      const song = await createSongFromFiles(
        newTitle || 'Lagu Baru The Flannels',
        newArtist || 'The Flannels',
        stemUploads
      );

      await onRefreshSongs();
      onSelectSong(song);
      setIsProcessing(false);
      setActiveView('list');
      setStemUploads([]);
      setNewTitle('');
      onClose();
    } catch (err) {
      console.error(err);
      alert('Gagal memproses file audio. Pastikan format didukung browser (FLAC, WAV, MP3).');
      setIsProcessing(false);
    }
  };

  const handleDeleteSong = async (songId: string) => {
    if (confirm('Hapus lagu ini dari penyimpanan browser?')) {
      await deleteSongFromStorage(songId);
      await onRefreshSongs();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-[#0b1322] border border-cyan-500/40 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden shadow-cyan-500/10">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-cyan-500/20 bg-gradient-to-r from-blue-950/60 to-cyan-950/40 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
              <Folder className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Manajer File Lagu The Flannels
              </h2>
              <p className="text-xs text-slate-400">
                Penyimpanan Koleksi Lagu & Stem FLAC
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveView(activeView === 'list' ? 'upload' : 'list')}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-cyan-500/20"
            >
              {activeView === 'list' ? (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Lagu Baru</span>
                </>
              ) : (
                <span>Kembali ke Daftar</span>
              )}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {activeView === 'list' ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Koleksi Lagu Rehearsal ({songs.length})
                </span>
                <button
                  onClick={() => {
                    onClose();
                    onOpenCloudSync();
                  }}
                  className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-bold"
                >
                  <Cloud className="w-3.5 h-3.5" />
                  <span>Sinkronisasi Cloud</span>
                </button>
              </div>

              {songs.length === 0 ? (
                <div className="text-center py-12 px-4 rounded-2xl bg-[#070e1b] border border-cyan-500/20 space-y-4">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
                    <Music2 className="w-7 h-7 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Library Lagu Masih Kosong</h3>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      Mulai dengan mengunggah stem lagu band kamu, menghubungkan database cloud Supabase, atau mencoba demo studio bawaan.
                    </p>
                  </div>

                  <div className="flex flex-wrap justify-center gap-2 pt-2">
                    <button
                      onClick={() => setActiveView('upload')}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-cyan-500/20"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Unggah File Stem Baru</span>
                    </button>
                    <button
                      onClick={() => {
                        onClose();
                        onOpenCloudSync();
                      }}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 text-xs font-bold transition flex items-center gap-1.5"
                    >
                      <Database className="w-3.5 h-3.5" />
                      <span>Buka Cloud Database</span>
                    </button>
                    <button
                      onClick={async () => {
                        setIsProcessing(true);
                        setProcessingStatus('Membuat audio stem demo studio The Flannels...');
                        await onLoadDemoSong();
                        setIsProcessing(false);
                      }}
                      disabled={isProcessing}
                      className="px-4 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 text-xs font-bold transition flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>{isProcessing ? 'Memproses Demo...' : 'Muat Demo "Midnight Groove"'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {songs.map((song) => {
                    const isSelected = song.id === currentSongId;

                    return (
                      <div
                        key={song.id}
                        className={`p-4 rounded-2xl border transition flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-cyan-950/30 border-cyan-400/60 shadow-lg shadow-cyan-500/10'
                            : 'bg-[#070e1b] border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div
                          onClick={() => {
                            onSelectSong(song);
                            onClose();
                          }}
                          className="cursor-pointer flex-1"
                        >
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-white tracking-tight">
                              {song.title}
                            </h4>
                            {isSelected && (
                              <span className="text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 px-2 py-0.5 rounded-full font-bold">
                                Sedang Diputar
                              </span>
                            )}
                            {song.cloudSynced && (
                              <span className="text-[10px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded-full font-semibold">
                                Cloud
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 font-mono">
                            <span>{song.artist}</span>
                            <span>•</span>
                            <span className="text-cyan-400">{song.bpm} BPM</span>
                            <span>•</span>
                            <span className="text-amber-400">{song.originalKey}</span>
                            <span>•</span>
                            <span>{formatSecondsToTime(song.duration)}</span>
                            <span>•</span>
                            <span className="text-indigo-400">{song.stems.length} Stems</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              onSelectSong(song);
                              onClose();
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                              isSelected
                                ? 'bg-cyan-500 text-black font-extrabold'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                            }`}
                          >
                            Pilih
                          </button>
                          <button
                            onClick={() => handleDeleteSong(song.id)}
                            className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                            title="Hapus Lagu"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* Upload View */
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300 font-bold block mb-1">
                    Judul Lagu
                  </label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Contoh: Terjebak Nostalgia"
                    className="w-full bg-[#070e1b] border border-cyan-500/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300 font-bold block mb-1">
                    Nama Artis / Band
                  </label>
                  <input
                    type="text"
                    value={newArtist}
                    onChange={(e) => setNewArtist(e.target.value)}
                    placeholder="The Flannels"
                    className="w-full bg-[#070e1b] border border-cyan-500/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              {/* Upload Drop Area */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-cyan-500/30 hover:border-cyan-400 rounded-2xl p-6 text-center cursor-pointer bg-[#070e1b] transition flex flex-col items-center justify-center gap-2 group"
              >
                <Upload className="w-8 h-8 text-cyan-500 group-hover:scale-110 transition" />
                <p className="text-xs font-bold text-slate-200">
                  Klik untuk memilih file audio (FLAC, WAV, MP3, OGG)
                </p>
                <p className="text-[11px] text-slate-400">
                  Dapat memilih sekaligus file stem: Vocal.flac, Lead.wav, Rhythm.wav, Bass.flac, Drums.flac
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

              {/* Selected Stems Mapping */}
              {stemUploads.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                    File Stem Terpilih ({stemUploads.length})
                  </span>
                  <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
                    {stemUploads.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-[#070e1b] border border-cyan-500/20 text-xs gap-3"
                      >
                        <span className="truncate text-slate-300 font-mono flex-1">
                          {item.file.name}
                        </span>
                        <select
                          value={item.role}
                          onChange={(e) => {
                            const newRole = e.target.value as StemRole;
                            setStemUploads((prev) =>
                              prev.map((s, i) => (i === idx ? { ...s, role: newRole } : s))
                            );
                          }}
                          className="bg-slate-800 text-cyan-200 text-xs rounded-lg px-2 py-1 border border-slate-700"
                        >
                          <option value="vocal">Vokal</option>
                          <option value="lead">Lead Guitar</option>
                          <option value="rhythm">Rhythm Guitar</option>
                          <option value="bass">Bass</option>
                          <option value="drums">Drums</option>
                          <option value="other">Lainnya / Full</option>
                        </select>
                        <button
                          onClick={() =>
                            setStemUploads((prev) => prev.filter((_, i) => i !== idx))
                          }
                          className="text-slate-500 hover:text-rose-400 px-1"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  onClick={handleCreateSong}
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
                      <span>Proses dan Simpan ke Library</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-cyan-500/20 bg-[#070e1b] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition border border-slate-700"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
