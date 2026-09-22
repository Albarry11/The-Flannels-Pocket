import React, { useState } from 'react';
import type { Song, StemTrack, StemRole, SongRequest } from '../types';
import { SongRequestLeaderboard } from './SongRequestLeaderboard';
import {
  deleteSongFromStorage,
  updateSongMetadata,
  replaceStemInSong,
  addStemToSong,
  deleteStemFromSong,
} from '../services/storage';
import {
  Folder,
  Plus,
  Trash2,
  Pencil,
  Music2,
  Play,
  FileDown,
  Download,
  FileAudio,
  ChevronDown,
  ChevronUp,
  Lock,
  Flame,
  Upload,
  Check,
  X,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { formatSecondsToTime } from '../services/lyricsManager';
import { exportSongPackage } from '../services/cloudDatabase';

interface CoverSongLibraryProps {
  songs: Song[];
  currentSongId: string | null;
  isAdmin: boolean;
  onSelectSong: (song: Song) => void;
  onRefreshSongs: () => Promise<void>;
  onOpenAdminUpload: () => void;
  onNavigateToRequests: () => void;
  onUnlockAdmin: () => void;
  onFulfillRequest?: (req: SongRequest) => void;
}

export const CoverSongLibrary: React.FC<CoverSongLibraryProps> = ({
  songs,
  currentSongId,
  isAdmin,
  onSelectSong,
  onRefreshSongs,
  onOpenAdminUpload,
  onNavigateToRequests,
  onUnlockAdmin,
  onFulfillRequest,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'songs' | 'requests'>('songs');
  const [expandedFolderId, setExpandedFolderId] = useState<string | null>(null);

  // Stem CRUD Operations State (Admin only)
  const [stemLoadingStatus, setStemLoadingStatus] = useState<string | null>(null);
  const [addingStemSong, setAddingStemSong] = useState<Song | null>(null);
  const [newStemRole, setNewStemRole] = useState<StemRole>('guitar');
  const [newStemName, setNewStemName] = useState<string>('');
  const [newStemFile, setNewStemFile] = useState<File | null>(null);

  const handleReplaceStemFile = async (songId: string, stemId: string, file: File) => {
    try {
      setStemLoadingStatus('Mempersiapkan penggantian berkas stem...');
      const updatedSong = await replaceStemInSong(songId, stemId, file, (msg) => {
        setStemLoadingStatus(msg);
      });
      await onRefreshSongs();
      if (currentSongId === songId) {
        onSelectSong(updatedSong);
      }
      alert('Berkas stem audio berhasil diganti dan disinkronkan!');
    } catch (err: any) {
      console.error(err);
      alert('Gagal menukar berkas stem: ' + (err?.message || err));
    } finally {
      setStemLoadingStatus(null);
    }
  };

  const handleDeleteStem = async (songId: string, stemId: string, stemName: string) => {
    if (!confirm(`Hapus stem "${stemName}" dari lagu ini?`)) return;
    try {
      setStemLoadingStatus('Menghapus berkas stem...');
      const updatedSong = await deleteStemFromSong(songId, stemId, (msg) => {
        setStemLoadingStatus(msg);
      });
      await onRefreshSongs();
      if (currentSongId === songId) {
        onSelectSong(updatedSong);
      }
      alert(`Stem "${stemName}" berhasil dihapus.`);
    } catch (err: any) {
      console.error(err);
      alert('Gagal menghapus stem: ' + (err?.message || err));
    } finally {
      setStemLoadingStatus(null);
    }
  };

  const handleAddStemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addingStemSong || !newStemFile) {
      alert('Pilih berkas audio untuk stem baru.');
      return;
    }

    try {
      setStemLoadingStatus('Menambahkan stem baru ke lagu...');
      const updatedSong = await addStemToSong(
        addingStemSong.id,
        newStemRole,
        newStemName || newStemRole,
        newStemFile,
        (msg) => setStemLoadingStatus(msg)
      );
      await onRefreshSongs();
      if (currentSongId === addingStemSong.id) {
        onSelectSong(updatedSong);
      }
      alert(`Stem "${newStemName || newStemRole}" berhasil ditambahkan ke lagu!`);
      setAddingStemSong(null);
      setNewStemFile(null);
      setNewStemName('');
    } catch (err: any) {
      console.error(err);
      alert('Gagal menambahkan stem: ' + (err?.message || err));
    } finally {
      setStemLoadingStatus(null);
    }
  };

  // Edit Metadata State (Admin only)
  const [editingSong, setEditingSong] = useState<Song | null>(null);
  const [editBpm, setEditBpm] = useState<number>(120);
  const [editKey, setEditKey] = useState<string>('C');

  const handleOpenEdit = (song: Song) => {
    setEditingSong(song);
    setEditBpm(song.bpm);
    setEditKey(song.originalKey);
  };

  const handleSaveEdit = async () => {
    if (!editingSong) return;
    await updateSongMetadata(editingSong.id, {
      bpm: editBpm,
      originalKey: editKey,
    });
    await onRefreshSongs();
    setEditingSong(null);
  };

  const handleDownloadStem = (stem: StemTrack, songTitle: string) => {
    if (stem.blob) {
      const url = URL.createObjectURL(stem.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${songTitle.replace(/[\\/:*?"<>|]/g, '_')}_${stem.fileName || `${stem.role}.wav`}`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (stem.audioUrl) {
      window.open(stem.audioUrl, '_blank');
    }
  };

  const handleDelete = async (songId: string) => {
    if (confirm('Hapus lagu cover ini dari library dan cloud? Berkas audio di Supabase dan seluruh perangkat akan dihapus.')) {
      try {
        await deleteSongFromStorage(songId, true);
        await onRefreshSongs();
      } catch (e: any) {
        alert('Gagal menghapus lagu: ' + (e?.message || e));
      }
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

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto w-full aero-glass rounded-xl sm:rounded-2xl p-1.5 sm:p-3 shadow-lg relative min-h-0 overflow-hidden">
      {/* Header - Compact Integrated Segmented Switch & Actions */}
      <div className="flex items-center justify-between border-b border-sky-200/50 pb-1 sm:pb-1.5 mb-1 sm:mb-2 flex-wrap gap-1.5">
        {/* Integrated Vista Tab Switcher as Header Title */}
        <div className="flex items-center p-0.5 rounded-lg sm:rounded-xl bg-white/50 border border-white/70 shadow-2xs backdrop-blur-md">
          <button
            onClick={() => setActiveSubTab('songs')}
            className={`py-1 px-2 sm:px-2.5 rounded-md sm:rounded-lg font-black text-[10px] sm:text-xs transition-all flex items-center gap-1.5 active:scale-95 ${
              activeSubTab === 'songs'
                ? 'bg-gradient-to-b from-sky-400 via-sky-500 to-blue-600 text-white shadow-xs border border-white/60'
                : 'text-sky-950 hover:bg-white/40'
            }`}
          >
            <Folder className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span>Koleksi Lagu ({songs.length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab('requests')}
            className={`py-1 px-2 sm:px-2.5 rounded-md sm:rounded-lg font-black text-[10px] sm:text-xs transition-all flex items-center gap-1.5 active:scale-95 ${
              activeSubTab === 'requests'
                ? 'bg-gradient-to-b from-sky-400 via-sky-500 to-blue-600 text-white shadow-xs border border-white/60'
                : 'text-sky-950 hover:bg-white/40'
            }`}
          >
            <Flame className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span>Antrian Request</span>
          </button>
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5">
          {songs.length > 0 && activeSubTab === 'songs' && (
            <button
              onClick={handleExportBackup}
              className="px-2 sm:px-2.5 py-1 rounded-md sm:rounded-lg bg-white/80 border border-sky-200 text-sky-900 hover:bg-sky-50 text-[9px] sm:text-[11px] font-bold transition flex items-center gap-1 shadow-2xs"
              title="Ekspor paket library JSON"
            >
              <FileDown className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              <span className="hidden sm:inline">Ekspor</span>
            </button>
          )}

          {/* Admin Upload Trigger or Member Request Shortcut */}
          {isAdmin ? (
            <button
              onClick={onOpenAdminUpload}
              className="px-2.5 sm:px-3 py-1 rounded-md sm:rounded-lg bg-gradient-to-r from-sky-500 to-blue-600 hover:opacity-95 text-white text-[9px] sm:text-[11px] font-black transition flex items-center gap-1 shadow-xs active:scale-95"
            >
              <Upload className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              <span>Input Stem</span>
            </button>
          ) : (
            activeSubTab === 'songs' && (
              <button
                onClick={() => setActiveSubTab('requests')}
                className="px-2.5 sm:px-3 py-1 rounded-md sm:rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 hover:opacity-95 text-white text-[9px] sm:text-[11px] font-black transition flex items-center gap-1 shadow-xs active:scale-95"
              >
                <Flame className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                <span>Request Lagu</span>
              </button>
            )
          )}
        </div>
      </div>

      {activeSubTab === 'requests' ? (
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <SongRequestLeaderboard
            isAdmin={isAdmin}
            onFulfillRequest={(req) => onFulfillRequest?.(req)}
            onSongSelectedFromLibrary={(title) => {
              const matched = songs.find((s) => s.title.toLowerCase().includes(title.toLowerCase()));
              if (matched) {
                onSelectSong(matched);
                setActiveSubTab('songs');
              }
            }}
          />
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden flex flex-col justify-center">
          {/* Main Song List - Responsive List Rows on mobile (<md / <=480px height), Card Rail on desktop */}
          <div className="overflow-y-auto md:overflow-y-hidden max-h-full pb-2 pt-0.5 md:py-auto space-y-1.5 md:space-y-0 md:flex md:overflow-x-auto md:gap-4 items-center scrollbar-thin">
        {songs.length === 0 ? (
          /* Empty State */
          <div className="text-center py-6 px-4 rounded-2xl bg-[#08182b]/90 backdrop-blur-3xl border border-sky-400/30 space-y-2 max-w-md mx-auto shadow-2xl text-white flex-shrink-0 my-auto">
            <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto rounded-xl sm:rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 text-white flex items-center justify-center shadow-lg shadow-sky-500/30 border border-white/30">
              <Music2 className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="space-y-0.5">
              <h3 className="text-sm sm:text-base font-black text-white tracking-tight">Library Belum Ada Lagu</h3>
              <p className="text-[10px] sm:text-xs text-slate-300 leading-relaxed font-medium">
                Pilih lagu yang ingin kamu kulik bersama The Flannels lewat Antrian Request, atau masuk sebagai Admin untuk menginput berkas stem studio.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-1.5 pt-1">
              <button
                onClick={onNavigateToRequests}
                className="w-full sm:w-auto px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 hover:opacity-95 text-white text-[11px] font-black shadow-lg shadow-orange-500/30 active:scale-95 transition flex items-center justify-center gap-1 border border-white/30"
              >
                <Flame className="w-3.5 h-3.5" />
                <span>Buka Antrian Request</span>
              </button>

              {!isAdmin ? (
                <button
                  onClick={onUnlockAdmin}
                  className="text-[11px] text-sky-300/80 hover:text-white underline font-semibold transition py-1 flex items-center gap-1"
                >
                  <Lock className="w-3 h-3" />
                  <span>Mode Admin (Albarry)</span>
                </button>
              ) : (
                <button
                  onClick={onOpenAdminUpload}
                  className="w-full sm:w-auto px-4 py-1.5 rounded-full bg-gradient-to-r from-sky-500 to-blue-600 hover:opacity-95 text-white text-[11px] font-black shadow-lg shadow-sky-500/30 active:scale-95 transition flex items-center justify-center gap-1 border border-white/30"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Input Stem Studio</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          songs.map((song) => {
            const isSelected = song.id === currentSongId;
            const artwork = song.artworkUrl || '';

            return (
              <div
                key={song.id}
                className={`w-full md:w-[340px] flex-shrink-0 p-1.5 md:p-3.5 rounded-xl md:rounded-3xl border transition-all flex flex-col justify-between gap-1 md:gap-2.5 shadow-xs md:shadow-sm relative md:overflow-hidden md:max-h-full ${
                  isSelected
                    ? 'bg-gradient-to-r from-sky-100/95 to-blue-100/90 border-sky-400 shadow-[0_8px_24px_rgba(2,132,199,0.2)] ring-1.5 md:ring-2 ring-sky-400/50'
                    : 'bg-white/85 border-sky-200/80 hover:border-sky-300 hover:bg-white'
                }`}
              >
                  {/* Card Content: Mobile row on <md, Desktop block on md: */}
                  <div className="flex md:flex-row items-center md:items-start justify-between md:justify-start gap-2 md:gap-3.5">
                    <div className="flex items-center gap-2 md:gap-3.5 min-w-0 flex-1">
                      {/* Cover Art */}
                      <div className="relative flex-shrink-0 w-8 h-8 md:w-16 md:h-16 rounded-lg md:rounded-2xl overflow-hidden shadow-xs md:shadow-md border border-white bg-sky-100">
                        {artwork ? (
                          <img src={artwork} alt={song.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-sky-600">
                            <Music2 className="w-4 h-4 md:w-6 md:h-6" />
                          </div>
                        )}
                        {isSelected && (
                          <div className="absolute inset-0 bg-sky-500/20 flex items-center justify-center">
                            <span className="text-[6px] md:text-[9px] bg-sky-600 text-white px-1 md:px-1.5 py-0.2 rounded-full font-black shadow-xs">
                              ACTIVE
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Details */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-[11px] md:text-base font-extrabold text-[#0f2942] tracking-tight truncate leading-tight">
                            {song.title}
                          </h4>
                          <span className="text-[9px] font-mono font-bold text-sky-700 bg-sky-100 px-1 rounded md:hidden flex-shrink-0">
                            {song.bpm} BPM
                          </span>
                        </div>
                        <span className="text-[9px] md:text-xs text-sky-800 font-medium block truncate">
                          by {song.artist} {song.album ? `• ${song.album}` : ''}
                        </span>

                        <div className="hidden md:flex items-center gap-1 mt-1 flex-wrap text-[9px] md:text-[11px] font-mono">
                          <span className="px-1.5 py-0.2 rounded-md bg-sky-100 border border-sky-300 text-sky-900 font-bold">
                            {song.bpm} BPM
                          </span>
                          <span className="px-1.5 py-0.2 rounded-md bg-amber-100 border border-amber-300 text-amber-900 font-bold">
                            {song.originalKey}
                          </span>
                          <span className="px-1.5 py-0.2 rounded-md bg-slate-100 border border-slate-300 text-slate-700">
                            {formatSecondsToTime(song.duration)}
                          </span>
                          <span className="px-1.5 py-0.2 rounded-md bg-emerald-100 border border-emerald-300 text-emerald-800 font-bold">
                            {song.stems.length} Stems
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Mobile Only: Inline Quick Select */}
                    <div className="flex md:hidden items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => onSelectSong(song)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition flex items-center gap-1 shadow-xs active:scale-95 ${
                          isSelected
                            ? 'bg-sky-600 text-white font-black'
                            : 'bg-gradient-to-b from-sky-400 via-sky-500 to-blue-600 text-white hover:opacity-95'
                        }`}
                      >
                        <Play className="w-2.5 h-2.5 fill-current" />
                        <span>{isSelected ? 'Dimuat' : 'Pilih Lagu'}</span>
                      </button>

                      {isAdmin && (
                        <div className="flex items-center">
                          <button
                            onClick={() => handleOpenEdit(song)}
                            className="p-1 rounded-full text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition"
                            title="Edit BPM & Tangga Nada"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDelete(song.id)}
                            className="p-1 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                            title="Hapus lagu"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Discrete Folder Badge (Accordion) */}
                  <div className="pt-1 md:pt-2 border-t border-sky-100">
                    <button
                      onClick={() => setExpandedFolderId(expandedFolderId === song.id ? null : song.id)}
                      className="w-full flex items-center justify-between text-[9px] md:text-[11px] font-mono text-sky-900 bg-sky-50/80 md:bg-sky-50/90 hover:bg-sky-100/90 px-2 md:px-3 py-0.5 md:py-1.5 rounded-lg md:rounded-2xl border border-sky-200 transition"
                      title="Lihat berkas fisik stem di dalam folder ini"
                    >
                      <span className="truncate flex items-center gap-1">
                        <Folder className="w-2.5 h-2.5 md:w-3.5 md:h-3.5 text-sky-600" />
                        <span>{song.folderName || `Songs/${song.title}/`}</span>
                      </span>
                      <span className="flex items-center gap-1 text-[8px] md:text-[10px] text-sky-700 font-sans font-bold flex-shrink-0">
                        <span>{song.stems.length} Stem{song.stems.length > 1 ? ' Diskrit' : ''}</span>
                        {expandedFolderId === song.id ? <ChevronUp className="w-2.5 h-2.5 md:w-3 md:h-3" /> : <ChevronDown className="w-2.5 h-2.5 md:w-3 md:h-3" />}
                      </span>
                    </button>

                    {/* Expandable list of discrete files */}
                    {expandedFolderId === song.id && (
                      <div className="mt-1.5 sm:mt-2 p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-white/95 border border-sky-200 space-y-1.5 sm:space-y-2 text-[9px] sm:text-[10px] font-mono animate-in fade-in duration-100">
                        <div className="flex items-center justify-between text-slate-500 pb-1 sm:pb-1.5 border-b border-sky-100 text-[8px] sm:text-[9px] uppercase font-bold">
                          <span>Berkas Stem Diskrit ({song.stems.length} track):</span>
                          <span>Studio Audio</span>
                        </div>

                        {stemLoadingStatus && (
                          <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-sky-100 border border-sky-300 text-sky-900 font-bold flex items-center gap-1 sm:gap-1.5 text-[9px] sm:text-[10px] animate-pulse">
                            <Loader2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 animate-spin text-sky-600 flex-shrink-0" />
                            <span className="truncate">{stemLoadingStatus}</span>
                          </div>
                        )}

                        <div className="space-y-1">
                          {song.stems.map((stem) => (
                            <div key={stem.id} className="flex items-center justify-between py-1 sm:py-1.5 hover:bg-sky-50/80 px-1.5 sm:px-2 rounded-lg sm:rounded-xl border border-transparent hover:border-sky-200 transition">
                              <div className="flex items-center gap-1 sm:gap-1.5 min-w-0 flex-1 pr-1 sm:pr-2">
                                <FileAudio className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-sky-600 flex-shrink-0" />
                                <span className="px-1 sm:px-1.5 py-0.2 rounded sm:rounded-md bg-sky-100 text-sky-800 text-[8px] sm:text-[9px] font-bold uppercase flex-shrink-0">
                                  {stem.role}
                                </span>
                                <span className="text-sky-950 font-bold truncate">
                                  {stem.name || stem.role}
                                </span>
                                <span className="text-slate-400 text-[9px] truncate hidden lg:inline">
                                  ({stem.fileName || `${stem.role}.wav`})
                                </span>
                              </div>

                              <div className="flex items-center gap-1 flex-shrink-0">
                                <button
                                  onClick={() => handleDownloadStem(stem, song.title)}
                                  className="p-1 rounded sm:rounded-lg text-slate-400 sm:text-sky-700 hover:text-sky-900 hover:bg-sky-100 transition"
                                  title={`Unduh berkas ${stem.fileName || `${stem.role}.wav`}`}
                                >
                                  <Download className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5" />
                                </button>

                                {isAdmin && (
                                  <>
                                    <label
                                      htmlFor={`replace-stem-${song.id}-${stem.id}`}
                                      className="px-1.5 sm:px-2 py-0.2 sm:py-0.5 rounded sm:rounded-lg bg-sky-100 hover:bg-sky-200 text-sky-900 font-bold text-[8px] sm:text-[9px] flex items-center gap-0.5 sm:gap-1 cursor-pointer transition shadow-2xs active:scale-95"
                                      title="Ganti berkas stem ini"
                                    >
                                      <RefreshCw className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-sky-600" />
                                      <span>Tukar</span>
                                      <input
                                        type="file"
                                        id={`replace-stem-${song.id}-${stem.id}`}
                                        accept="audio/*,.wav,.flac,.mp3"
                                        className="hidden"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) {
                                            handleReplaceStemFile(song.id, stem.id, file);
                                            e.target.value = '';
                                          }
                                        }}
                                      />
                                    </label>

                                    {song.stems.length > 1 && (
                                      <button
                                        onClick={() => handleDeleteStem(song.id, stem.id, stem.name || stem.role)}
                                        className="p-0.5 sm:p-1 rounded sm:rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                                        title={`Hapus stem ${stem.name || stem.role}`}
                                      >
                                        <Trash2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        {isAdmin && (
                          <div className="pt-1 border-t border-sky-100">
                            <button
                              onClick={() => {
                                setAddingStemSong(song);
                                setNewStemName('');
                                setNewStemRole('guitar');
                                setNewStemFile(null);
                              }}
                              className="w-full py-1 sm:py-1.5 px-2 sm:px-3 rounded-lg sm:rounded-xl border border-dashed border-sky-300 hover:border-sky-500 hover:bg-sky-100/60 text-sky-800 text-[9px] sm:text-[10px] font-bold flex items-center justify-center gap-1 sm:gap-1.5 transition active:scale-98"
                            >
                              <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-sky-600" />
                              <span>Tambah Stem Baru</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Desktop Action Section: Bottom row (md+ only) */}
                  <div className="hidden md:flex items-center justify-between pt-1.5 sm:pt-2 border-t border-sky-100">
                    <button
                      onClick={() => onSelectSong(song)}
                      className={`px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-bold transition flex items-center gap-1 shadow-xs active:scale-95 ${
                        isSelected
                          ? 'bg-sky-600 text-white font-black'
                          : 'bg-sky-100 text-sky-900 hover:bg-sky-200'
                      }`}
                    >
                      <Play className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-current" />
                      <span>{isSelected ? 'Dimuat di Mixer' : 'Pilih Lagu'}</span>
                    </button>

                    {isAdmin && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(song)}
                          className="p-1 sm:p-1.5 rounded-full text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition"
                          title="Edit BPM & Tangga Nada"
                        >
                          <Pencil className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(song.id)}
                          className="p-1 sm:p-1.5 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          title="Hapus lagu dari studio"
                        >
                          <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
        )}
          </div>
        </div>
      )}

      {/* Edit BPM & Key Modal for Admin */}
      {editingSong && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-100">
          <div className="w-full max-w-sm rounded-3xl bg-white/95 backdrop-blur-2xl border border-sky-300 p-5 shadow-2xl text-[#0f2942] space-y-4">
            <div className="flex items-center justify-between border-b border-sky-100 pb-2">
              <div>
                <h4 className="font-black text-sm text-[#0f2942]">Edit BPM & Tangga Nada</h4>
                <p className="text-[11px] text-slate-500 truncate max-w-[200px]">{editingSong.title} - {editingSong.artist}</p>
              </div>
              <button onClick={() => setEditingSong(null)} className="text-slate-400 hover:text-slate-700 font-bold p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">BPM (Tempo)</label>
                <input
                  type="number"
                  value={editBpm}
                  onChange={(e) => setEditBpm(parseInt(e.target.value, 10) || 0)}
                  className="w-full bg-sky-50/70 border border-sky-200 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Tangga Nada Asli (Key)</label>
                <input
                  type="text"
                  value={editKey}
                  onChange={(e) => setEditKey(e.target.value)}
                  placeholder="Contoh: E, G, Am"
                  className="w-full bg-sky-50/70 border border-sky-200 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:border-sky-500 uppercase"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-sky-100">
              <button
                type="button"
                onClick={() => setEditingSong(null)}
                className="px-4 py-1.5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold hover:bg-slate-200 transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="px-5 py-1.5 rounded-full bg-gradient-to-r from-sky-500 to-blue-600 hover:opacity-95 text-white text-xs font-black shadow-md shadow-sky-500/20 active:scale-95 transition flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Simpan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tambah Stem Baru (Admin) */}
      {addingStemSong && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-100">
          <div className="w-full max-w-sm rounded-3xl bg-white/95 backdrop-blur-2xl border border-sky-300 p-5 shadow-2xl text-[#0f2942] space-y-4">
            <div className="flex items-center justify-between border-b border-sky-100 pb-2">
              <div>
                <h4 className="font-black text-sm text-[#0f2942]">Tambah Stem Baru</h4>
                <p className="text-[11px] text-slate-500 truncate max-w-[220px]">
                  {addingStemSong.title} • {addingStemSong.artist}
                </p>
              </div>
              <button
                onClick={() => {
                  if (!stemLoadingStatus) {
                    setAddingStemSong(null);
                  }
                }}
                className="text-slate-400 hover:text-slate-700 font-bold p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddStemSubmit} className="space-y-3 text-xs">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Nama Stem
                </label>
                <input
                  type="text"
                  required
                  value={newStemName}
                  onChange={(e) => setNewStemName(e.target.value)}
                  placeholder="Contoh: Lead Solo 2, Keyboard"
                  className="w-full bg-sky-50/70 border border-sky-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Peran Instrumen
                </label>
                <select
                  value={newStemRole}
                  onChange={(e) => setNewStemRole(e.target.value as StemRole)}
                  className="w-full bg-sky-50/70 border border-sky-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-sky-500 cursor-pointer"
                >
                  <option value="vocal">Vocal</option>
                  <option value="guitar">Guitar</option>
                  <option value="lead">Lead Guitar</option>
                  <option value="rhythm">Rhythm Guitar</option>
                  <option value="bass">Bass</option>
                  <option value="drums">Drums</option>
                  <option value="piano">Keyboard / Piano</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Berkas Audio (.wav, .flac, .mp3)
                </label>
                <input
                  type="file"
                  required
                  accept="audio/*,.wav,.flac,.mp3"
                  onChange={(e) => setNewStemFile(e.target.files?.[0] || null)}
                  className="w-full bg-sky-50/70 border border-sky-200 rounded-xl p-2 text-[11px] focus:outline-none focus:border-sky-500 cursor-pointer"
                />
                {newStemFile && (
                  <span className="text-[10px] text-emerald-700 font-mono font-bold block mt-1">
                    ✓ {newStemFile.name} ({(newStemFile.size / 1024 / 1024).toFixed(1)} MB)
                  </span>
                )}
              </div>

              {stemLoadingStatus && (
                <div className="p-2 rounded-xl bg-sky-100 text-sky-900 text-[10px] font-bold flex items-center gap-1.5 animate-pulse">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-600" />
                  <span className="truncate">{stemLoadingStatus}</span>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2 border-t border-sky-100">
                <button
                  type="button"
                  disabled={!!stemLoadingStatus}
                  onClick={() => setAddingStemSong(null)}
                  className="px-4 py-1.5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold hover:bg-slate-200 transition disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={!newStemFile || !!stemLoadingStatus}
                  className="px-5 py-1.5 rounded-full bg-gradient-to-r from-sky-500 to-blue-600 hover:opacity-95 text-white text-xs font-black shadow-md shadow-sky-500/20 active:scale-95 transition flex items-center gap-1 disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Simpan Stem</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
