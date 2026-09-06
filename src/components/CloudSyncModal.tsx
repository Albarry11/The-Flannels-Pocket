import React, { useState, useRef } from 'react';
import type { Song, CloudDbConfig } from '../types';
import {
  getCloudConfig,
  saveCloudConfig,
  testCloudConnection,
  uploadSongToCloud,
  syncSongsFromCloud,
  exportSongPackage,
} from '../services/cloudDatabase';
import { saveSongToStorage } from '../services/storage';
import { Cloud, Database, Download, Upload, CheckCircle2, AlertCircle, Loader2, X, RefreshCw, FileDown, FileUp } from 'lucide-react';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  songs: Song[];
  onRefreshSongs: () => Promise<void>;
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({
  isOpen,
  onClose,
  songs,
  onRefreshSongs,
}) => {
  const [config, setConfig] = useState<CloudDbConfig>(getCloudConfig());
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState('');
  const [uploadingSongId, setUploadingSongId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleSaveConfig = () => {
    saveCloudConfig(config);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    handleSaveConfig();
    const res = await testCloudConnection(config);
    setTestResult(res);
    setIsTesting(false);
  };

  const handleUploadSong = async (songId: string) => {
    setUploadingSongId(songId);
    setSyncStatus('Mengunggah stem audio ke Supabase Storage...');
    const res = await uploadSongToCloud(songId, (msg) => setSyncStatus(msg));
    alert(res.message);
    setUploadingSongId(null);
    setSyncStatus('');
    await onRefreshSongs();
  };

  const handleSyncFromCloud = async () => {
    setIsSyncing(true);
    setSyncStatus('Menghubungkan ke cloud database...');
    const res = await syncSongsFromCloud((msg) => setSyncStatus(msg));
    alert(res.message);
    setIsSyncing(false);
    setSyncStatus('');
    await onRefreshSongs();
  };

  const handleExportBackup = async () => {
    const blob = await exportSongPackage();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `The-Flannels-Pocket-Backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const text = evt.target?.result as string;
        const parsed = JSON.parse(text);
        if (parsed.songs && Array.isArray(parsed.songs)) {
          for (const s of parsed.songs) {
            await saveSongToStorage(s);
          }
          await onRefreshSongs();
          alert(`Berhasil mengimpor ${parsed.songs.length} lagu!`);
        } else {
          alert('Format berkas backup tidak valid.');
        }
      } catch (err) {
        alert('Gagal membaca file backup.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-[#0b1220] border border-cyan-500/40 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden shadow-cyan-500/10">
        
        {/* Header Aero Glass */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-cyan-500/20 bg-gradient-to-r from-blue-950/60 to-cyan-950/40 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Database Cloud & Sinkronisasi Band
              </h2>
              <p className="text-xs text-slate-400">
                Penyimpanan Gratis Supabase Storage (1GB) & Berbagi Antar Personil
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5 text-xs">
          
          {/* Supabase Settings Card */}
          <div className="p-4 rounded-2xl bg-[#070d17] border border-cyan-500/25 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-sm flex items-center gap-1.5">
                <Cloud className="w-4 h-4 text-cyan-400" />
                <span>Koneksi Supabase Storage (Gratis)</span>
              </span>
              <a
                href="https://supabase.com"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-cyan-400 hover:underline"
              >
                Buat Akun Gratis di Supabase →
              </a>
            </div>

            <p className="text-slate-400 text-[11px]">
              Masukkan URL Project dan Anon Public Key dari dashboard Supabase untuk mengizinkan
              semua personil band The Flannels mengakses dan memutar file stem audio FLAC di HP masing-masing.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Project URL Supabase
                </label>
                <input
                  type="text"
                  value={config.supabaseUrl}
                  onChange={(e) => setConfig({ ...config, supabaseUrl: e.target.value })}
                  placeholder="https://xyzproject.supabase.co"
                  className="w-full bg-[#0d1627] border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Anon / Public Key
                </label>
                <input
                  type="password"
                  value={config.supabaseAnonKey}
                  onChange={(e) => setConfig({ ...config, supabaseAnonKey: e.target.value })}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5c..."
                  className="w-full bg-[#0d1627] border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleTestConnection}
                  disabled={isTesting || !config.supabaseUrl}
                  className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  <span>Tes Koneksi</span>
                </button>
                <button
                  onClick={handleSyncFromCloud}
                  disabled={isSyncing || !config.supabaseUrl}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 font-bold transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSyncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                  <span>Unduh Semua Lagu dari Cloud</span>
                </button>
              </div>
            </div>

            {testResult && (
              <div
                className={`p-3 rounded-xl border flex items-start gap-2 ${
                  testResult.success
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}

            {syncStatus && (
              <div className="p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 text-[11px] flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{syncStatus}</span>
              </div>
            )}
          </div>

          {/* Local Songs Cloud Status */}
          <div className="space-y-2">
            <span className="font-bold text-slate-300 uppercase tracking-wider block text-[11px]">
              Status Sinkronisasi Lagu Lokal ({songs.length})
            </span>
            {songs.length === 0 ? (
              <div className="p-6 rounded-2xl bg-[#070d17] border border-slate-800 text-center text-slate-500">
                Belum ada lagu di library lokal. Unggah lagu baru atau sinkronkan dari cloud.
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {songs.map((song) => (
                  <div
                    key={song.id}
                    className="p-3 rounded-xl bg-[#070d17] border border-slate-800 flex items-center justify-between gap-2"
                  >
                    <div>
                      <span className="font-bold text-white block">{song.title}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {song.stems.length} Stems • {song.bpm} BPM • {song.originalKey}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {song.cloudSynced ? (
                        <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Cloud Synced
                        </span>
                      ) : (
                        <button
                          onClick={() => handleUploadSong(song.id)}
                          disabled={uploadingSongId === song.id || !config.supabaseUrl}
                          className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold transition flex items-center gap-1 disabled:opacity-50"
                        >
                          {uploadingSongId === song.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Upload className="w-3 h-3" />
                          )}
                          <span>Upload ke Cloud</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Offline Backup Share */}
          <div className="p-4 rounded-2xl bg-[#070d17] border border-slate-800 flex items-center justify-between">
            <div>
              <span className="font-bold text-white block">Cadangan Offline (Share Tanpa Cloud)</span>
              <p className="text-[11px] text-slate-400">
                Ekspor file JSON berisi semua lagu & lirik untuk dibagikan langsung ke sesama personil.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleExportBackup}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition flex items-center gap-1.5"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>Ekspor</span>
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition flex items-center gap-1.5"
              >
                <FileUp className="w-3.5 h-3.5" />
                <span>Impor</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImportBackup}
                className="hidden"
              />
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-cyan-500/20 bg-[#070d17] flex justify-end">
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
