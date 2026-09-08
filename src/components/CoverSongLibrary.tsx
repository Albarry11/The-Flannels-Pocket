import React, { useState, useRef } from 'react';
import type { Song, StemRole, StemTrack } from '../types';
import { createSongFromFiles, deleteSongFromStorage, saveSongToStorage } from '../services/storage';
import { createProceduralDemoSong } from '../services/proceduralSongs';
import { extractEmbeddedArtwork } from '../services/embeddedArtwork';
import { Folder, Upload, Plus, Trash2, CheckCircle2, Music2, Loader2, Play, FileDown, Image as ImageIcon, ShieldCheck, ExternalLink, Download, FileAudio, ChevronDown, ChevronUp, Cpu, RefreshCw, Settings2 } from 'lucide-react';
import { formatSecondsToTime } from '../services/lyricsManager';
import { exportSongPackage } from '../services/cloudDatabase';
import { checkDemucsBackendHealth, getCustomBackendUrl, setCustomBackendUrl } from '../services/stemApi';

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
  const [expandedFolderId, setExpandedFolderId] = useState<string | null>(null);
  const [demucsHealth, setDemucsHealth] = useState<{ online: boolean; device?: string; url?: string }>({ online: false });
  const [customTunnelUrl, setCustomTunnelUrl] = useState<string>(getCustomBackendUrl());
  const [showTunnelConfig, setShowTunnelConfig] = useState(false);

  // Check Demucs GPU Server health
  const refreshDemucsHealth = async () => {
    const health = await checkDemucsBackendHealth();
    setDemucsHealth(health);
  };

  React.useEffect(() => {
    refreshDemucsHealth();
  }, [view]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const artworkInputRef = useRef<HTMLInputElement | null>(null);

  const handleDownloadStem = (stem: StemTrack, songTitle: string) => {
    if (!stem.blob) return;
    const url = URL.createObjectURL(stem.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${songTitle.replace(/[\\/:*?"<>|]/g, '_')}_${stem.fileName || `${stem.role}.wav`}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Smart file metadata & track number parsing (e.g. "07 Swellow - Tak Berdaya" -> Artist: Swellow, Title: Tak Berdaya)
    if (files.length === 1 && !newTitle) {
      let cleanName = files[0].name.replace(/\.[^/.]+$/, '');
      cleanName = cleanName.replace(/^\d+[\s\.\-_]+/, ''); // Strip leading numbers
      if (cleanName.includes('-')) {
        const parts = cleanName.split('-');
        setNewArtist(parts[0].trim());
        setNewTitle(parts.slice(1).join('-').trim());
      } else {
        setNewTitle(cleanName);
      }

      // Point 2: Otomatis ekstrak embedded album art ID3/FLAC dari file persis seperti Windows File Explorer!
      try {
        const embedded = await extractEmbeddedArtwork(files[0]);
        if (embedded) {
          setCustomArtwork(embedded);
        }
      } catch (_) {}
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
      setProcessingStatus('Mempersiapkan audio & mengekstrak cover...');

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
    demo.verifiedSource = 'The Flannels Studio Master Session';
    demo.researchNotes = 'Progresi funk Em7 - Am7 - Bm7, tempo 115 BPM';
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
              Koleksi Lagu & Cover Artwork Otomatis • AI Stem Separator
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

      {/* Main Content with generous bottom padding (Point 5: scale robust & no overlap) */}
      <div className="flex-1 overflow-y-auto pr-1 pb-36">
        {view === 'list' ? (
          songs.length === 0 ? (
            /* Empty State: Dark Translucent Backing & Streamlined Single Primary Action (SiteCritic & Roast Fix) */
            <div className="text-center py-12 px-6 sm:px-8 rounded-3xl bg-[#08182b]/90 backdrop-blur-3xl border border-sky-400/30 space-y-4 max-w-lg mx-auto shadow-2xl text-white">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 text-white flex items-center justify-center shadow-lg shadow-sky-500/30 border border-white/30">
                <Music2 className="w-8 h-8" />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-lg font-black text-white tracking-tight">Library Masih Kosong</h2>
                <p className="text-xs text-slate-300 leading-relaxed font-medium">
                  Unggah file lagu cover (MP3, FLAC, WAV). AI akan memisahkan vokal dan instrumen secara otomatis untuk sesi kulik band The Flannels.
                </p>
              </div>
              <div className="flex flex-col items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setView('upload')}
                  className="w-full sm:w-auto px-7 py-3 rounded-full bg-gradient-to-r from-sky-400 via-sky-500 to-blue-600 hover:opacity-95 text-white text-xs font-extrabold shadow-lg shadow-sky-500/30 active:scale-95 transition flex items-center justify-center gap-2 border border-white/30"
                  aria-label="Unggah file lagu cover sekarang"
                >
                  <Plus className="w-4 h-4" />
                  <span>Unggah Lagu Cover</span>
                </button>
                <button
                  onClick={handleLoadDemo}
                  disabled={isProcessing}
                  className="text-xs text-sky-300/90 hover:text-white underline font-semibold transition py-1"
                  aria-label="Coba dengan demo track studio bawaan"
                >
                  {isProcessing ? '✨ Memproses Demo...' : '✨ Atau coba muat lagu demo studio (Midnight Groove)'}
                </button>
              </div>
            </div>
          ) : (
            /* Song Cards Grid with Album Artwork (Point 2 & 6) */
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
                    {/* Song Album Cover Image from ID3/FLAC or Aero Canvas (Point 2 & 6) */}
                    <div className="relative flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden shadow-md border border-white bg-sky-100">
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

                      {/* Verified Source Attribution Badge with Direct Web Check Link (Point 2) */}
                      {song.verifiedSource && (
                        <div className="flex items-center gap-1.5 text-[10px] text-emerald-800 font-bold mt-1.5 flex-wrap">
                          <span className="flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                            <span>{song.verifiedSource}</span>
                          </span>
                          {song.sourceUrl && (
                            <a
                              href={song.sourceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-sky-700 hover:text-sky-900 underline flex items-center gap-0.5 ml-1"
                              title="Buka web untuk verifikasi silang BPM & Tangga Nada"
                            >
                              <span>Cek Web</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </div>
                      )}

                      {/* Discrete Folder Badge (Point 4) */}
                      <div className="mt-2 pt-2 border-t border-sky-100">
                        <button
                          onClick={() => setExpandedFolderId(expandedFolderId === song.id ? null : song.id)}
                          className="w-full flex items-center justify-between text-[11px] font-mono text-sky-900 bg-sky-50/90 hover:bg-sky-100/90 px-2.5 py-1 rounded-xl border border-sky-200 transition"
                          title="Lihat berkas fisik stem di dalam folder ini"
                        >
                          <span className="truncate flex items-center gap-1">
                            <Folder className="w-3.5 h-3.5 text-sky-600" />
                            <span>{song.folderName || `Songs/${song.title}/`}</span>
                          </span>
                          <span className="flex items-center gap-1 text-[10px] text-sky-700 font-sans font-bold flex-shrink-0">
                            <span>{song.stems.length} Stem WAV</span>
                            {expandedFolderId === song.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </span>
                        </button>

                        {/* Expandable list of discrete files */}
                        {expandedFolderId === song.id && (
                          <div className="mt-1.5 p-2 rounded-xl bg-white/90 border border-sky-200 space-y-1 text-[10px] font-mono animate-in fade-in duration-100">
                            <div className="flex items-center justify-between text-slate-500 pb-1 border-b border-sky-100 text-[9px] uppercase font-bold">
                              <span>Berkas Audio Diskrit:</span>
                              <span>Format: WAV Lossless</span>
                            </div>
                            {song.stems.map((stem) => (
                              <div key={stem.id} className="flex items-center justify-between py-0.5 hover:bg-sky-50 px-1.5 rounded">
                                <span className="flex items-center gap-1.5 text-sky-950 font-bold truncate">
                                  <FileAudio className="w-3 h-3 text-sky-500 flex-shrink-0" />
                                  <span className="truncate">{stem.fileName || `${stem.role}.wav`}</span>
                                </span>
                                {stem.blob && (
                                  <button
                                    onClick={() => handleDownloadStem(stem, song.title)}
                                    className="text-sky-600 hover:text-sky-900 p-0.5 rounded hover:bg-sky-100"
                                    title={`Unduh ${stem.fileName || `${stem.role}.wav`}`}
                                  >
                                    <Download className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-sky-100">
                        <button
                          onClick={() => onSelectSong(song)}
                          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1 shadow-xs ${
                            isSelected
                              ? 'bg-sky-600 text-white font-extrabold'
                              : 'bg-sky-100 text-sky-900 hover:bg-sky-200'
                          }`}
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>{isSelected ? 'Dimuat di Mixer' : 'Pilih Lagu'}</span>
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
          /* Upload View with Robust Scaling & No Overlap (Point 5) */
          <div className="space-y-4 max-w-xl mx-auto pb-10">
            {/* Demucs Neural AI Server Status Banner */}
            <div className={`p-3.5 rounded-2xl border flex flex-col gap-2 text-xs shadow-xs transition ${
              demucsHealth.online
                ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950'
                : 'bg-amber-50/90 border-amber-300 text-amber-950'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${demucsHealth.online ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-amber-500 animate-ping'}`} />
                  <span className="font-extrabold flex items-center gap-1">
                    <Cpu className="w-3.5 h-3.5" />
                    <span>Demucs AI Server: {demucsHealth.online ? `Online (${demucsHealth.device?.toUpperCase() || 'CUDA RTX 2050'})` : 'Offline / Belum Terhubung'}</span>
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={refreshDemucsHealth}
                    className="p-1 rounded-lg bg-white/80 hover:bg-white text-slate-700 transition"
                    title="Cek ulang status server"
                  >
                    <RefreshCw className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => setShowTunnelConfig(!showTunnelConfig)}
                    className="p-1 rounded-lg bg-white/80 hover:bg-white text-slate-700 transition"
                    title="Atur URL Tunnel / Backend"
                  >
                    <Settings2 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {demucsHealth.online ? (
                <p className="text-[11px] text-emerald-800 font-medium">
                  GPU NVIDIA RTX 2050 siap memisahkan vokal, gitar, bass, dan drum murni lossless zero-bleed via model Meta Demucs <code className="font-bold">htdemucs_6s</code>.
                </p>
              ) : (
                <div className="text-[11px] text-amber-900 space-y-1">
                  <p className="font-semibold">
                    Untuk pemisahan AI murni lossless: Buka file <code className="bg-amber-200/80 px-1 py-0.5 rounded font-mono">backend/start_demucs.bat</code> di laptop.
                  </p>
                  <p className="text-[10px] text-slate-600">
                    Sistem The Flannels Pocket tidak lagi menggunakan filter equalizer browser palsu agar kualitas instrumen tetap terjaga murni.
                  </p>
                </div>
              )}

              {/* Collapsible Custom URL / Tunnel Configuration */}
              {showTunnelConfig && (
                <div className="pt-2 mt-1 border-t border-sky-200/60 flex items-center gap-2">
                  <input
                    type="text"
                    value={customTunnelUrl}
                    onChange={(e) => setCustomTunnelUrl(e.target.value)}
                    placeholder="Contoh: https://xyz.trycloudflare.com atau http://localhost:8000"
                    className="flex-1 bg-white border border-sky-300 rounded-xl px-2.5 py-1 text-xs text-[#0f2942] font-mono focus:outline-none"
                  />
                  <button
                    onClick={() => {
                      setCustomBackendUrl(customTunnelUrl);
                      refreshDemucsHealth();
                      setShowTunnelConfig(false);
                    }}
                    className="px-3 py-1 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-xs"
                  >
                    Simpan
                  </button>
                </div>
              )}
            </div>

            <div className="p-4 rounded-2xl bg-sky-100/90 border border-sky-300 text-xs text-sky-950 space-y-1 shadow-xs">
              <span className="font-extrabold text-sky-900 block text-sm">
                ✨ Demucs Neural Audio Separator (Meta htdemucs_6s)
              </span>
              <p className="font-medium">
                Cukup pilih <strong>1 file lagu audio</strong> (MP3/FLAC/WAV). AI akan memisahkan vokal, gitar, bass, dan drum ke 4 berkas WAV fisik terpisah!
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[#0f2942] font-bold block mb-1">Judul Lagu</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Contoh: Tak Berdaya"
                  className="w-full bg-white border border-sky-300 rounded-xl px-3 py-2 text-xs text-[#0f2942] focus:outline-none focus:border-sky-500 shadow-xs"
                />
              </div>
              <div>
                <label className="text-xs text-[#0f2942] font-bold block mb-1">Artis / Band</label>
                <input
                  type="text"
                  value={newArtist}
                  onChange={(e) => setNewArtist(e.target.value)}
                  placeholder="Swellow"
                  className="w-full bg-white border border-sky-300 rounded-xl px-3 py-2 text-xs text-[#0f2942] focus:outline-none focus:border-sky-500 shadow-xs"
                />
              </div>
            </div>

            {/* Artwork Preview Box */}
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
                <span className="font-bold text-[#0f2942] block">
                  {customArtwork ? 'Cover Album Terdeteksi' : 'Gambar Cover Lagu'}
                </span>
                <span className="text-[11px] text-sky-700">
                  {customArtwork
                    ? 'Cover diekstrak dari file lagu atau gambar kustom.'
                    : 'Akan diekstrak otomatis dari metadata ID3/FLAC saat file dipilih.'}
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
                1 file lagu utuh untuk AI split otomatis, atau multi-stem.
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
              <div className="p-3 rounded-2xl bg-white border border-sky-200 space-y-2 text-xs max-h-36 overflow-y-auto">
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

            {/* Submit Button (Always in view, generous spacing) */}
            <div className="pt-2">
              <button
                onClick={handleProcessUpload}
                disabled={isProcessing || stemUploads.length === 0}
                className="w-full py-3.5 rounded-full bg-gradient-to-r from-sky-500 to-blue-600 hover:opacity-95 text-white text-xs font-extrabold transition flex items-center justify-center gap-2 shadow-lg shadow-sky-500/25 disabled:opacity-50 active:scale-98"
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
          </div>
        )}
      </div>
    </div>
  );
};
