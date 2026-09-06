import React, { useState, useRef } from 'react';
import type { Song, StemRole } from '../types';
import { createSongFromFiles, deleteSongFromStorage, saveSongToStorage } from '../services/storage';
import { createProceduralDemoSong } from '../services/proceduralSongs';
import { Folder, Upload, Plus, Trash2, CheckCircle2, Music2, Loader2, Play, FileDown, Image as ImageIcon } from 'lucide-react';
import { formatSecondsToTime } from '../services/lyricsManager';
import { exportSongPackage } from '../services/cloudDatabase';

interface CoverSongLibraryProps {
  songs: Song[];
  currentSongId: string | null;
  onSelectSong: (song: Song) => void;
  onRefreshSongs: () => Promise<void>;
}

/**
 * Generates an artistic Frutiger Aero style album cover artwork for songs without embedded pictures
 */
function generateAeroArtwork(title: string, artist: string): string {
  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 400;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Background Aqua Sky gradient
  const grad = ctx.createLinearGradient(0, 0, 400, 400);
  grad.addColorStop(0, '#38bdf8');
  grad.addColorStop(0.5, '#0284c7');
  grad.addColorStop(1, '#06b6d4');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 400, 400);

  // Liquid glass shine arc
  ctx.beginPath();
  ctx.ellipse(200, 100, 260, 140, -Math.PI / 12, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.fill();

  // Glossy bubble ring
  ctx.beginPath();
  ctx.arc(200, 200, 110, 0, Math.PI * 2);
  ctx.lineWidth = 12;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.stroke();

  // Center vinyl groove
  ctx.beginPath();
  ctx.arc(200, 200, 40, 0, Math.PI * 2);
  ctx.fillStyle = '#0f2942';
  ctx.fill();

  // Typography
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title.slice(0, 22), 200, 340);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillText(artist.slice(0, 24), 200, 368);

  return canvas.toDataURL('image/jpeg', 0.85);
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
  const [customArtwork, setCustomArtwork] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const artworkInputRef = useRef<HTMLInputElement | null>(null);

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

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

  const handleArtworkSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        setCustomArtwork(evt.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProcessUpload = async () => {
    if (stemUploads.length === 0) {
      alert('Pilih file audio terlebih dahulu.');
      return;
    }

    try {
      setIsProcessing(true);
      setProcessingStatus('Mempersiapkan audio...');

      const finalArtwork = customArtwork || generateAeroArtwork(newTitle || 'Cover Song', newArtist || 'The Flannels');

      const song = await createSongFromFiles(
        newTitle || 'Cover Song Baru',
        newArtist || 'The Flannels',
        stemUploads,
        {
          onProgress: (status) => setProcessingStatus(status),
        }
      );

      // Attach artwork to song
      song.artworkUrl = finalArtwork;
      await saveSongToStorage(song);

      await onRefreshSongs();
      onSelectSong(song);
      setIsProcessing(false);
      setView('list');
      setStemUploads([]);
      setNewTitle('');
      setCustomArtwork('');
    } catch (err) {
      console.error(err);
      alert('Gagal memproses audio.');
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
    demo.artworkUrl = generateAeroArtwork('Midnight Groove', 'The Flannels');
    await saveSongToStorage(demo);
    await onRefreshSongs();
    onSelectSong(demo);
    setIsProcessing(false);
  };

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto w-full aero-glass rounded-3xl p-4 sm:p-6 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-sky-200/60 pb-3 mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-sky-500/30 text-white">
            <Folder className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-[#0f2942] tracking-tight">
              Library Lagu Cover The Flannels
            </h2>
            <p className="text-xs text-sky-700 font-medium">
              Koleksi Lagu & Cover Artwork • AI Stem Separator
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {songs.length > 0 && (
            <button
              onClick={handleExportBackup}
              className="px-3.5 py-1.5 rounded-full bg-white/80 border border-sky-200 text-sky-900 hover:bg-sky-50 text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
              title="Ekspor paket library JSON"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ekspor</span>
            </button>
          )}

          <button
            onClick={() => setView(view === 'list' ? 'upload' : 'list')}
            className="px-4 py-1.5 rounded-full bg-gradient-to-r from-sky-500 to-blue-600 hover:opacity-95 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-sky-500/20"
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
            <div className="text-center py-20 px-4 rounded-3xl bg-white/80 border border-sky-200/80 space-y-4 max-w-lg mx-auto shadow-xs">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-sky-100 text-sky-600 flex items-center justify-center border border-sky-300">
                <Music2 className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-[#0f2942]">Library Masih Kosong</h3>
                <p className="text-xs text-[#1e3a5f] mt-1 font-medium">
                  Unggah file lagu cover (MP3/FLAC). AI akan otomatis memisahkan vokal dan instrumen serta membuat gambar album!
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 pt-2">
                <button
                  onClick={() => setView('upload')}
                  className="px-4 py-2 rounded-full bg-gradient-to-r from-sky-500 to-blue-600 text-white text-xs font-bold shadow-md shadow-sky-500/20"
                >
                  ➕ Unggah Lagu Cover
                </button>
                <button
                  onClick={handleLoadDemo}
                  disabled={isProcessing}
                  className="px-4 py-2 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold"
                >
                  ✨ Coba Demo Track
                </button>
              </div>
            </div>
          ) : (
            /* Song Cards Grid with Album Artwork (Point 6) */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {songs.map((song) => {
                const isSelected = song.id === currentSongId;
                const artwork = song.artworkUrl || generateAeroArtwork(song.title, song.artist);

                return (
                  <div
                    key={song.id}
                    className={`p-4 rounded-3xl border transition-all flex items-center gap-4 shadow-sm relative overflow-hidden ${
                      isSelected
                        ? 'bg-gradient-to-r from-sky-100/95 to-blue-100/90 border-sky-400 shadow-[0_8px_24px_rgba(2,132,199,0.2)] ring-2 ring-sky-400/50'
                        : 'bg-white/80 border-sky-200/70 hover:border-sky-300 hover:bg-white'
                    }`}
                  >
                    {/* Song Album Cover Image (Point 6) */}
                    <div className="relative flex-shrink-0 w-20 h-20 sm:w-22 sm:h-22 rounded-2xl overflow-hidden shadow-md border border-white">
                      <img
                        src={artwork}
                        alt={song.title}
                        className="w-full h-full object-cover"
                      />
                      {isSelected && (
                        <div className="absolute inset-0 bg-sky-500/20 flex items-center justify-center">
                          <span className="text-[9px] bg-sky-600 text-white px-2 py-0.5 rounded-full font-black shadow-xs">
                            ACTIVE
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Song Details */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-base font-extrabold text-[#0f2942] tracking-tight truncate">
                        {song.title}
                      </h4>
                      <span className="text-xs text-sky-800 font-medium block truncate">
                        by {song.artist}
                      </span>

                      <div className="flex items-center gap-1.5 mt-2 flex-wrap text-[11px] font-mono">
                        <span className="px-2 py-0.5 rounded-full bg-sky-100 border border-sky-300 text-sky-900 font-bold">
                          {song.bpm} BPM
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 border border-amber-300 text-amber-900 font-bold">
                          {song.originalKey}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 border border-slate-300 text-slate-700">
                          {formatSecondsToTime(song.duration)}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 font-bold">
                          {song.stems.length} Stems
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-2.5 mt-1 border-t border-sky-100">
                        <button
                          onClick={() => onSelectSong(song)}
                          className={`px-3 py-1 rounded-full text-xs font-bold transition flex items-center gap-1 shadow-xs ${
                            isSelected
                              ? 'bg-sky-600 text-white font-extrabold'
                              : 'bg-sky-100 text-sky-900 hover:bg-sky-200'
                          }`}
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>{isSelected ? 'Dimuat' : 'Pilih Lagu'}</span>
                        </button>

                        <button
                          onClick={() => handleDelete(song.id)}
                          className="p-1.5 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          title="Hapus lagu"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          /* Upload View */
          <div className="space-y-4 max-w-xl mx-auto">
            <div className="p-4 rounded-2xl bg-sky-100/90 border border-sky-300 text-xs text-sky-950 space-y-1 shadow-xs">
              <span className="font-extrabold text-sky-900 block text-sm">
                ✨ AI Stem Separator & Album Artwork
              </span>
              <p className="font-medium">
                Cukup unggah <strong>1 file lagu utuh</strong> (MP3/FLAC/WAV). AI akan memisahkan vokal dan instrumen secara multi-stage dan meriset BPM/Key resmi dari Google Gemini!
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[#0f2942] font-bold block mb-1">Judul Lagu</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Contoh: Dan"
                  className="w-full bg-white border border-sky-300 rounded-xl px-3 py-2 text-xs text-[#0f2942] focus:outline-none focus:border-sky-500 shadow-xs"
                />
              </div>
              <div>
                <label className="text-xs text-[#0f2942] font-bold block mb-1">Artis / Band</label>
                <input
                  type="text"
                  value={newArtist}
                  onChange={(e) => setNewArtist(e.target.value)}
                  placeholder="Sheila On 7"
                  className="w-full bg-white border border-sky-300 rounded-xl px-3 py-2 text-xs text-[#0f2942] focus:outline-none focus:border-sky-500 shadow-xs"
                />
              </div>
            </div>

            {/* Custom Artwork Picker */}
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/80 border border-sky-200">
              <div
                onClick={() => artworkInputRef.current?.click()}
                className="w-16 h-16 rounded-xl bg-sky-100 border border-dashed border-sky-400 flex items-center justify-center cursor-pointer overflow-hidden relative group flex-shrink-0"
                title="Pilih gambar cover album kustom"
              >
                {customArtwork ? (
                  <img src={customArtwork} alt="Cover" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-6 h-6 text-sky-500 group-hover:scale-110 transition" />
                )}
              </div>
              <div className="text-xs">
                <span className="font-bold text-[#0f2942] block">Gambar Cover Lagu (Opsional)</span>
                <span className="text-[11px] text-sky-700">
                  {customArtwork ? 'Gambar kustom terpilih' : 'Klik ikon untuk unggah gambar JPG/PNG, atau biarkan AI membuatkan otomatis.'}
                </span>
                <input
                  ref={artworkInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleArtworkSelected}
                  className="hidden"
                />
              </div>
            </div>

            {/* Dropzone Audio */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-sky-400 hover:border-sky-600 rounded-2xl p-6 text-center cursor-pointer bg-white/80 transition flex flex-col items-center justify-center gap-2 group shadow-xs"
            >
              <Upload className="w-8 h-8 text-sky-500 group-hover:scale-110 transition" />
              <p className="text-xs font-bold text-[#0f2942]">
                Pilih File Audio Lagu (FLAC, WAV, MP3)
              </p>
              <p className="text-[11px] text-sky-700">
                1 file audio utuh untuk AI split otomatis, atau multi-stem.
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

            {/* Selected File List */}
            {stemUploads.length > 0 && (
              <div className="p-3 rounded-xl bg-white border border-sky-200 space-y-2 text-xs">
                <span className="text-[11px] font-bold text-sky-900 uppercase">
                  File Terpilih ({stemUploads.length}):
                </span>
                {stemUploads.map((s, idx) => (
                  <div key={idx} className="font-mono text-sky-900 flex justify-between">
                    <span className="truncate">{s.file.name}</span>
                    <span className="text-sky-600 font-sans font-semibold">
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
              className="w-full py-3 rounded-full bg-gradient-to-r from-sky-500 to-blue-600 hover:opacity-95 text-white text-xs font-extrabold transition flex items-center justify-center gap-2 shadow-md shadow-sky-500/20 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{processingStatus || 'Memproses Lagu...'}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Pisahkan Stem & Simpan ke Library</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
