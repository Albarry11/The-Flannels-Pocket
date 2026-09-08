import React, { useState, useRef } from 'react';
import type { StemRole, SongRequest, Song } from '../types';
import { createSongFromFiles } from '../services/storage';
import { markRequestFulfilled } from '../services/requestQueue';
import {
  Upload,
  Music,
  Loader2,
  Mic,
  Guitar,
  Disc,
  Sliders,
  Sparkles,
  Search,
  X,
} from 'lucide-react';
import { searchMusicSuggestions } from '../services/musicSearch';

interface AdminStemUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSongCreated: (song: Song) => void;
  initialRequest?: SongRequest | null;
}

export const AdminStemUploadModal: React.FC<AdminStemUploadModalProps> = ({
  isOpen,
  onClose,
  onSongCreated,
  initialRequest,
}) => {
  const [title, setTitle] = useState(initialRequest?.title || '');
  const [artist, setArtist] = useState(initialRequest?.artist || 'The Flannels');
  const [album, setAlbum] = useState(initialRequest?.album || 'Single');
  const [artworkUrl, setArtworkUrl] = useState<string | undefined>(initialRequest?.artworkUrl);
  const [bpmInput, setBpmInput] = useState<string>('');
  const [keyInput, setKeyInput] = useState<string>('');

  // Discrete stem files
  const [vocalFile, setVocalFile] = useState<File | null>(null);
  const [guitarFile, setGuitarFile] = useState<File | null>(null);
  const [bassFile, setBassFile] = useState<File | null>(null);
  const [drumsFile, setDrumsFile] = useState<File | null>(null);
  const [extraFiles, setExtraFiles] = useState<{ role: StemRole; name: string; file: File }[]>([]);

  const [isProcessing, setIsProcessing] = useState(false);
  const [progressStatus, setProgressStatus] = useState('');

  // Search auto-suggest
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    if (initialRequest) {
      setTitle(initialRequest.title);
      setArtist(initialRequest.artist);
      setAlbum(initialRequest.album || 'Single');
      setArtworkUrl(initialRequest.artworkUrl);
    }
  }, [initialRequest]);

  if (!isOpen) return null;

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (val.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    searchDebounceRef.current = setTimeout(async () => {
      const results = await searchMusicSuggestions(val);
      setSuggestions(results);
    }, 300);
  };

  const handleSelectSuggestion = (s: any) => {
    setTitle(s.title);
    setArtist(s.artist);
    setAlbum(s.album);
    setArtworkUrl(s.artworkUrl);
    setSuggestions([]);
    setSearchQuery('');
  };

  const handleBatchStemDrop = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const name = file.name.toLowerCase();

      if (name.includes('vocal') || name.includes('vox')) {
        setVocalFile(file);
      } else if (name.includes('guitar') || name.includes('lead') || name.includes('rhythm')) {
        setGuitarFile(file);
      } else if (name.includes('bass')) {
        setBassFile(file);
      } else if (name.includes('drum') || name.includes('beat')) {
        setDrumsFile(file);
      } else {
        setExtraFiles((prev) => [...prev, { role: 'other', name: file.name.replace(/\.[^/.]+$/, ''), file }]);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const stemFilesList: { role: StemRole; name: string; file: File }[] = [];
    if (vocalFile) stemFilesList.push({ role: 'vocal', name: 'Vocal', file: vocalFile });
    if (guitarFile) stemFilesList.push({ role: 'guitar', name: 'Guitar', file: guitarFile });
    if (bassFile) stemFilesList.push({ role: 'bass', name: 'Bass', file: bassFile });
    if (drumsFile) stemFilesList.push({ role: 'drums', name: 'Drums', file: drumsFile });
    extraFiles.forEach((ef) => stemFilesList.push(ef));

    if (stemFilesList.length === 0) {
      alert('Masukkan minimal 1 berkas stem (Vocal, Guitar, Bass, atau Drums).');
      return;
    }

    try {
      setIsProcessing(true);
      setProgressStatus('Membuat track stem studio dan folder lagu...');

      const parsedBpm = bpmInput ? parseInt(bpmInput, 10) : undefined;
      const cleanKey = keyInput ? keyInput.trim() : undefined;

      const song = await createSongFromFiles(title, artist, stemFilesList, {
        album,
        artworkUrl,
        bpm: parsedBpm && parsedBpm > 0 ? parsedBpm : undefined,
        key: cleanKey || undefined,
        onProgress: (status) => setProgressStatus(status),
      });

      // If this was fulfilling an initial request, mark it fulfilled in the leaderboard
      if (initialRequest) {
        await markRequestFulfilled(initialRequest.id, song.id);
      }

      onSongCreated(song);
      setIsProcessing(false);
      onClose();
    } catch (err) {
      console.error(err);
      alert('Gagal memproses berkas stem: ' + (err instanceof Error ? err.message : err));
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-150 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-3xl bg-white/95 backdrop-blur-2xl border border-sky-300 p-5 sm:p-6 shadow-2xl text-xs text-[#0f2942] space-y-4 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-sky-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white shadow-md shadow-sky-500/30">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-[#0f2942] tracking-tight">
                Studio Input Stem Lagu (Mode Admin)
              </h3>
              <p className="text-[11px] text-sky-800 font-medium">
                Masukkan Berkas Stem Diskrit • 100% Zero-Bleed Audio untuk Band
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 font-bold p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Search & Auto-Fill from Music Database */}
        <div className="relative">
          <div className="flex items-center gap-2 bg-sky-50/90 border border-sky-200 rounded-xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-sky-400">
            <Search className="w-3.5 h-3.5 text-sky-600" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Cari lagu untuk mengisi otomatis judul, artis, & cover (iTunes/Web)..."
              className="w-full bg-transparent text-xs font-semibold focus:outline-none placeholder:text-slate-400"
            />
          </div>

          {suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-sky-300 rounded-2xl shadow-xl z-50 max-h-48 overflow-y-auto">
              {suggestions.map((s, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSelectSuggestion(s)}
                  className="flex items-center gap-2 p-2 hover:bg-sky-50 cursor-pointer border-b border-sky-50 last:border-0"
                >
                  {s.artworkUrl && <img src={s.artworkUrl} alt={s.title} className="w-8 h-8 rounded-lg object-cover" />}
                  <div className="flex-1 min-w-0">
                    <span className="font-bold text-slate-800 block truncate">{s.title}</span>
                    <span className="text-[10px] text-slate-500 block truncate">{s.artist} • {s.album}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-2">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Judul Lagu</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Dan"
                  className="w-full bg-sky-50/70 border border-sky-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Artis / Band</label>
                <input
                  type="text"
                  required
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  placeholder="Contoh: Sheila On 7"
                  className="w-full bg-sky-50/70 border border-sky-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Explicit BPM & Tangga Nada (Key) Controls for Admin */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <label className="text-[11px] font-bold text-sky-900 block mb-1">
                    BPM (Tempo)
                  </label>
                  <input
                    type="number"
                    value={bpmInput}
                    onChange={(e) => setBpmInput(e.target.value)}
                    placeholder="Auto AI jika kosong"
                    className="w-full bg-sky-50/70 border border-sky-200 rounded-xl px-3 py-1.5 text-xs font-mono font-bold focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-sky-900 block mb-1">
                    Tangga Nada (Key)
                  </label>
                  <input
                    type="text"
                    value={keyInput}
                    onChange={(e) => setKeyInput(e.target.value)}
                    placeholder="Auto AI jika kosong (misal: E, G)"
                    className="w-full bg-sky-50/70 border border-sky-200 rounded-xl px-3 py-1.5 text-xs font-mono font-bold focus:outline-none focus:border-sky-500 uppercase"
                  />
                </div>
              </div>
            </div>

            {/* Artwork Preview */}
            <div className="flex flex-col items-center justify-center p-2 rounded-2xl bg-sky-50/70 border border-sky-200 text-center">
              <div className="w-20 h-20 rounded-xl bg-sky-100 overflow-hidden shadow-xs border border-white mb-1.5 flex items-center justify-center">
                {artworkUrl ? (
                  <img src={artworkUrl} alt={title} className="w-full h-full object-cover" />
                ) : (
                  <Music className="w-8 h-8 text-sky-400" />
                )}
              </div>
              <span className="text-[10px] font-bold text-sky-800 truncate max-w-full">
                {album || 'Cover Album'}
              </span>
            </div>
          </div>

          {/* Batch Stem File Dropzone */}
          <div className="border-2 border-dashed border-sky-300 hover:border-sky-500 rounded-2xl p-4 text-center bg-sky-50/40 transition flex flex-col items-center justify-center gap-1.5 cursor-pointer relative">
            <Upload className="w-6 h-6 text-sky-600" />
            <span className="font-extrabold text-xs text-slate-800">
              Pilih Berkas Stem Sekaligus (Vocal.wav, Guitar.wav, Bass.wav, Drums.wav)
            </span>
            <span className="text-[10px] text-slate-500">
              Sistem otomatis mendeteksi nama file dan memetakannya ke masing-masing fader mixer!
            </span>
            <input
              type="file"
              multiple
              accept="audio/*,.wav,.flac,.mp3"
              onChange={handleBatchStemDrop}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
          </div>

          {/* 4 Dedicated Instrument Slots */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {/* Vocal */}
            <div className={`p-2.5 rounded-2xl border flex flex-col justify-between ${vocalFile ? 'bg-rose-50 border-rose-300' : 'bg-white border-slate-200'}`}>
              <div className="flex items-center gap-1.5 mb-1 text-rose-700 font-bold">
                <Mic className="w-3.5 h-3.5" />
                <span>Vocal</span>
              </div>
              <span className="text-[10px] font-mono text-slate-600 truncate block">
                {vocalFile ? vocalFile.name : 'Belum ada file'}
              </span>
              <label className="mt-1.5 text-center py-1 px-2 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 text-[10px] font-extrabold cursor-pointer">
                Pilih File
                <input type="file" accept="audio/*" onChange={(e) => e.target.files?.[0] && setVocalFile(e.target.files[0])} className="hidden" />
              </label>
            </div>

            {/* Guitar */}
            <div className={`p-2.5 rounded-2xl border flex flex-col justify-between ${guitarFile ? 'bg-amber-50 border-amber-300' : 'bg-white border-slate-200'}`}>
              <div className="flex items-center gap-1.5 mb-1 text-amber-700 font-bold">
                <Guitar className="w-3.5 h-3.5" />
                <span>Guitar</span>
              </div>
              <span className="text-[10px] font-mono text-slate-600 truncate block">
                {guitarFile ? guitarFile.name : 'Belum ada file'}
              </span>
              <label className="mt-1.5 text-center py-1 px-2 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-800 text-[10px] font-extrabold cursor-pointer">
                Pilih File
                <input type="file" accept="audio/*" onChange={(e) => e.target.files?.[0] && setGuitarFile(e.target.files[0])} className="hidden" />
              </label>
            </div>

            {/* Bass */}
            <div className={`p-2.5 rounded-2xl border flex flex-col justify-between ${bassFile ? 'bg-sky-50 border-sky-300' : 'bg-white border-slate-200'}`}>
              <div className="flex items-center gap-1.5 mb-1 text-sky-700 font-bold">
                <Disc className="w-3.5 h-3.5" />
                <span>Bass</span>
              </div>
              <span className="text-[10px] font-mono text-slate-600 truncate block">
                {bassFile ? bassFile.name : 'Belum ada file'}
              </span>
              <label className="mt-1.5 text-center py-1 px-2 rounded-lg bg-sky-100 hover:bg-sky-200 text-sky-800 text-[10px] font-extrabold cursor-pointer">
                Pilih File
                <input type="file" accept="audio/*" onChange={(e) => e.target.files?.[0] && setBassFile(e.target.files[0])} className="hidden" />
              </label>
            </div>

            {/* Drums */}
            <div className={`p-2.5 rounded-2xl border flex flex-col justify-between ${drumsFile ? 'bg-indigo-50 border-indigo-300' : 'bg-white border-slate-200'}`}>
              <div className="flex items-center gap-1.5 mb-1 text-indigo-700 font-bold">
                <Sliders className="w-3.5 h-3.5" />
                <span>Drums</span>
              </div>
              <span className="text-[10px] font-mono text-slate-600 truncate block">
                {drumsFile ? drumsFile.name : 'Belum ada file'}
              </span>
              <label className="mt-1.5 text-center py-1 px-2 rounded-lg bg-indigo-100 hover:bg-indigo-200 text-indigo-800 text-[10px] font-extrabold cursor-pointer">
                Pilih File
                <input type="file" accept="audio/*" onChange={(e) => e.target.files?.[0] && setDrumsFile(e.target.files[0])} className="hidden" />
              </label>
            </div>
          </div>

          {/* AI Features Notice */}
          <div className="p-3 rounded-2xl bg-gradient-to-r from-sky-100/90 to-blue-100/80 border border-sky-300/80 text-[11px] text-sky-950 flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-sky-600 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Otomatisasi Kecerdasan Buatan (Google Gemini Flash):</span>
              <span className="text-slate-600">
                Saat disimpan, AI akan otomatis meriset BPM & Key resmi lagu dari web, menelusuri akord lirik tersinkronisasi, dan menyiapkan panduan latihan di menu Tilikan.
              </span>
            </div>
          </div>

          {/* Progress Banner */}
          {isProcessing && (
            <div className="p-3 rounded-2xl bg-sky-600 text-white text-xs font-bold flex items-center gap-2 shadow-md">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{progressStatus || 'Memproses berkas audio...'}</span>
            </div>
          )}

          {/* Actions */}
          <div className="pt-2 flex justify-end gap-2 border-t border-sky-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isProcessing}
              className="px-6 py-2.5 rounded-full bg-gradient-to-r from-sky-500 to-blue-600 hover:opacity-95 text-white font-black shadow-lg shadow-sky-500/25 active:scale-95 transition disabled:opacity-50"
            >
              {isProcessing ? 'Menyimpan ke Studio...' : 'Simpan ke Library & Mixer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
