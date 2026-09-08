import React, { useState } from 'react';
import type { Song, StemTrack } from '../types';
import { deleteSongFromStorage } from '../services/storage';
import {
  Folder,
  Plus,
  Trash2,
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
}) => {
  const [expandedFolderId, setExpandedFolderId] = useState<string | null>(null);

  const handleDownloadStem = (stem: StemTrack, songTitle: string) => {
    if (!stem.blob) return;
    const url = URL.createObjectURL(stem.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${songTitle.replace(/[\\/:*?"<>|]/g, '_')}_${stem.fileName || `${stem.role}.wav`}`;
    a.click();
    URL.revokeObjectURL(url);
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

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto w-full aero-glass rounded-3xl p-4 sm:p-6 shadow-xl relative">
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
            <p className="text-xs text-sky-800 font-medium">
              Koleksi Master & Stem Diskrit • 100% Studio Rehearsal Quality
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

          {/* Admin Upload Trigger or Member Request Shortcut */}
          {isAdmin ? (
            <button
              onClick={onOpenAdminUpload}
              className="px-4 py-1.5 rounded-full bg-gradient-to-r from-sky-500 to-blue-600 hover:opacity-95 text-white text-xs font-black transition flex items-center gap-1.5 shadow-md shadow-sky-500/20 active:scale-95"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Input Stem Baru</span>
            </button>
          ) : (
            <button
              onClick={onNavigateToRequests}
              className="px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 hover:opacity-95 text-white text-xs font-black transition flex items-center gap-1.5 shadow-md shadow-orange-500/20 active:scale-95"
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Request Lagu</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Song List with generous bottom padding */}
      <div className="flex-1 overflow-y-auto pr-1 pb-24">
        {songs.length === 0 ? (
          /* Empty State */
          <div className="text-center py-16 px-6 sm:px-8 rounded-3xl bg-[#08182b]/90 backdrop-blur-3xl border border-sky-400/30 space-y-4 max-w-lg mx-auto shadow-2xl text-white">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 text-white flex items-center justify-center shadow-lg shadow-sky-500/30 border border-white/30">
              <Music2 className="w-8 h-8" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-black text-white tracking-tight">Library Belum Ada Lagu</h3>
              <p className="text-xs text-slate-300 leading-relaxed font-medium">
                Pilih lagu yang ingin kamu kulik bersama The Flannels lewat menu Antrian Request, atau masuk sebagai Admin untuk menginput berkas stem studio.
              </p>
            </div>
            <div className="flex flex-col items-center justify-center gap-2.5 pt-2">
              <button
                onClick={onNavigateToRequests}
                className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 hover:opacity-95 text-white text-xs font-black shadow-lg shadow-orange-500/30 active:scale-95 transition flex items-center justify-center gap-1.5 border border-white/30"
              >
                <Flame className="w-4 h-4" />
                <span>Buka Antrian Request Lagu</span>
              </button>

              {!isAdmin ? (
                <button
                  onClick={onUnlockAdmin}
                  className="text-xs text-sky-300/80 hover:text-white underline font-semibold transition py-1 flex items-center gap-1"
                >
                  <Lock className="w-3 h-3" />
                  <span>Mode Admin (Albarry)</span>
                </button>
              ) : (
                <button
                  onClick={onOpenAdminUpload}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-gradient-to-r from-sky-500 to-blue-600 hover:opacity-95 text-white text-xs font-black shadow-lg shadow-sky-500/30 active:scale-95 transition flex items-center justify-center gap-1.5 border border-white/30"
                >
                  <Plus className="w-4 h-4" />
                  <span>Input Stem Studio Sekarang</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Song Cards Grid with Album Artwork & Stem Folders */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {songs.map((song) => {
              const isSelected = song.id === currentSongId;
              const artwork = song.artworkUrl || '';

              return (
                <div
                  key={song.id}
                  className={`p-4 rounded-3xl border transition-all flex flex-col justify-between gap-3 shadow-sm relative overflow-hidden ${
                    isSelected
                      ? 'bg-gradient-to-r from-sky-100/95 to-blue-100/90 border-sky-400 shadow-[0_8px_24px_rgba(2,132,199,0.2)] ring-2 ring-sky-400/50'
                      : 'bg-white/85 border-sky-200/80 hover:border-sky-300 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    {/* Cover Art */}
                    <div className="relative flex-shrink-0 w-18 h-18 sm:w-20 sm:h-20 rounded-2xl overflow-hidden shadow-md border border-white bg-sky-100">
                      {artwork ? (
                        <img src={artwork} alt={song.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-sky-600">
                          <Music2 className="w-7 h-7" />
                        </div>
                      )}
                      {isSelected && (
                        <div className="absolute inset-0 bg-sky-500/20 flex items-center justify-center">
                          <span className="text-[9px] bg-sky-600 text-white px-2 py-0.5 rounded-full font-black shadow-xs">
                            ACTIVE
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-base font-extrabold text-[#0f2942] tracking-tight truncate">
                        {song.title}
                      </h4>
                      <span className="text-xs text-sky-800 font-medium block truncate">
                        by {song.artist} {song.album ? `• ${song.album}` : ''}
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
                    </div>
                  </div>

                  {/* Discrete Folder Badge */}
                  <div className="pt-2 border-t border-sky-100">
                    <button
                      onClick={() => setExpandedFolderId(expandedFolderId === song.id ? null : song.id)}
                      className="w-full flex items-center justify-between text-[11px] font-mono text-sky-900 bg-sky-50/90 hover:bg-sky-100/90 px-3 py-1.5 rounded-2xl border border-sky-200 transition"
                      title="Lihat berkas fisik stem di dalam folder ini"
                    >
                      <span className="truncate flex items-center gap-1">
                        <Folder className="w-3.5 h-3.5 text-sky-600" />
                        <span>{song.folderName || `Songs/${song.title}/`}</span>
                      </span>
                      <span className="flex items-center gap-1 text-[10px] text-sky-700 font-sans font-bold flex-shrink-0">
                        <span>{song.stems.length} Stem Diskrit</span>
                        {expandedFolderId === song.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </span>
                    </button>

                    {/* Expandable list of discrete files */}
                    {expandedFolderId === song.id && (
                      <div className="mt-1.5 p-2 rounded-2xl bg-white/95 border border-sky-200 space-y-1 text-[10px] font-mono animate-in fade-in duration-100">
                        <div className="flex items-center justify-between text-slate-500 pb-1 border-b border-sky-100 text-[9px] uppercase font-bold">
                          <span>Berkas Stem Diskrit:</span>
                          <span>Audio Rehearsal Bersih</span>
                        </div>
                        {song.stems.map((stem) => (
                          <div key={stem.id} className="flex items-center justify-between py-1 hover:bg-sky-50 px-2 rounded-lg">
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

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-sky-100">
                    <button
                      onClick={() => onSelectSong(song)}
                      className={`px-4 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1 shadow-xs ${
                        isSelected
                          ? 'bg-sky-600 text-white font-black'
                          : 'bg-sky-100 text-sky-900 hover:bg-sky-200'
                      }`}
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>{isSelected ? 'Dimuat di Mixer' : 'Pilih Lagu'}</span>
                    </button>

                    {isAdmin && (
                      <button
                        onClick={() => handleDelete(song.id)}
                        className="p-1.5 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                        title="Hapus lagu dari studio"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
