import React, { useState, useEffect, useRef } from 'react';
import type { SongRequest, MusicSuggestion } from '../types';
import {
  fetchSongRequests,
  submitSongRequest,
  toggleUpvoteRequest,
  deleteSongRequest,
  getClientId,
} from '../services/requestQueue';
import { searchMusicSuggestions } from '../services/musicSearch';
import {
  Flame,
  Search,
  Plus,
  CheckCircle2,
  Clock,
  Trash2,
  Loader2,
  Music,
  ChevronRight,
} from 'lucide-react';

interface SongRequestLeaderboardProps {
  isAdmin: boolean;
  onFulfillRequest: (req: SongRequest) => void;
  onSongSelectedFromLibrary?: (title: string, artist: string) => void;
}

export const SongRequestLeaderboard: React.FC<SongRequestLeaderboardProps> = ({
  isAdmin,
  onFulfillRequest,
}) => {
  const [requests, setRequests] = useState<SongRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);

  // Search input & Suggestions
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<MusicSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Form states for new request
  const [reqTitle, setReqTitle] = useState('');
  const [reqArtist, setReqArtist] = useState('');
  const [reqAlbum, setReqAlbum] = useState('');
  const [reqArtwork, setReqArtwork] = useState<string | undefined>(undefined);
  const [reqPreviewUrl, setReqPreviewUrl] = useState<string | undefined>(undefined);
  const [requesterName, setRequesterName] = useState('');
  const [requesterRole] = useState<SongRequest['requesterRole']>('vocal');
  const [reqNotes, setReqNotes] = useState('');

  const clientId = getClientId();

  const refreshRequests = async () => {
    setIsLoading(true);
    const data = await fetchSongRequests();
    setRequests(data);
    setIsLoading(false);
  };

  useEffect(() => {
    refreshRequests();
  }, []);

  // Search bar live suggestions
  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    if (val.trim().length < 2) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchDebounceRef.current = setTimeout(async () => {
      const results = await searchMusicSuggestions(val);
      setSuggestions(results);
      setIsSearching(false);
    }, 300);
  };

  const handleSelectSuggestion = (s: MusicSuggestion) => {
    setReqTitle(s.title);
    setReqArtist(s.artist);
    setReqAlbum(s.album);
    setReqArtwork(s.artworkUrl);
    setReqPreviewUrl(s.previewUrl);
    setSuggestions([]);
    setShowRequestModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqTitle.trim() || !reqArtist.trim()) {
      alert('Judul lagu dan artis wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    try {
      await submitSongRequest(reqTitle, reqArtist, requesterName, requesterRole, {
        album: reqAlbum,
        artworkUrl: reqArtwork,
        previewUrl: reqPreviewUrl,
        notes: reqNotes,
      });

      await refreshRequests();
      setShowRequestModal(false);
      setReqTitle('');
      setReqArtist('');
      setReqAlbum('');
      setReqArtwork(undefined);
      setReqNotes('');
      setSearchQuery('');
    } catch (err) {
      alert('Gagal mengirim request lagu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpvote = async (requestId: string) => {
    const updated = await toggleUpvoteRequest(requestId);
    setRequests(updated);
  };

  const handleDelete = async (requestId: string) => {
    if (confirm('Hapus request ini dari antrian?')) {
      const updated = await deleteSongRequest(requestId);
      setRequests(updated);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto w-full aero-glass rounded-3xl p-4 sm:p-6 shadow-xl relative">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-sky-200/60 pb-3 mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-600 flex items-center justify-center shadow-md shadow-orange-500/30 text-white">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-[#0f2942] tracking-tight">
              Antrian Request Lagu Band
            </h2>
            <p className="text-xs text-sky-800 font-medium">
              Leaderboard Kulik Lagu • Vote & Rekomendasikan Cover Berikutnya
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setReqTitle(searchQuery);
            setReqArtist('');
            setReqAlbum('');
            setReqArtwork(undefined);
            setShowRequestModal(true);
          }}
          className="px-4 py-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 hover:opacity-95 text-white text-xs font-black transition flex items-center gap-1.5 shadow-md shadow-orange-500/20 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Request Lagu Baru</span>
        </button>
      </div>

      {/* Live Auto-Suggestion Search Bar */}
      <div className="relative mb-5">
        <div className="flex items-center gap-2 bg-white/90 border border-sky-300/80 rounded-2xl px-4 py-2.5 shadow-xs focus-within:ring-2 focus-within:ring-sky-400">
          <Search className="w-4 h-4 text-sky-600 flex-shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Cari lagu nasional / internasional (misal: Sheila On 7, Dewa 19, Oasis, Swellow)..."
            className="w-full bg-transparent text-xs text-[#0f2942] font-semibold focus:outline-none placeholder:text-slate-400"
          />
          {isSearching && <Loader2 className="w-4 h-4 text-sky-500 animate-spin flex-shrink-0" />}
        </div>

        {/* Suggestion Dropdown */}
        {suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white/95 backdrop-blur-2xl border border-sky-300 rounded-2xl shadow-2xl overflow-hidden z-50 max-h-72 overflow-y-auto">
            <div className="p-2 text-[10px] font-bold uppercase text-slate-500 border-b border-sky-100 flex justify-between">
              <span>Saran Lagu Terverifikasi (Klik untuk Request)</span>
              <span>{suggestions.length} ditemukan</span>
            </div>
            {suggestions.map((item, idx) => (
              <div
                key={idx}
                onClick={() => handleSelectSuggestion(item)}
                className="flex items-center gap-3 p-2.5 hover:bg-sky-50 cursor-pointer border-b border-sky-50 last:border-0 transition"
              >
                {item.artworkUrl ? (
                  <img
                    src={item.artworkUrl}
                    alt={item.title}
                    className="w-10 h-10 rounded-xl object-cover shadow-xs border border-white flex-shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center text-sky-600 flex-shrink-0">
                    <Music className="w-5 h-5" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-bold text-[#0f2942] truncate block">
                    {item.title}
                  </span>
                  <span className="text-[11px] text-sky-800 truncate block">
                    {item.artist} {item.album ? `• ${item.album}` : ''} {item.releaseYear ? `(${item.releaseYear})` : ''}
                  </span>
                </div>
                <div className="text-sky-600 text-xs font-bold flex items-center gap-1 flex-shrink-0">
                  <span>Pilih</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Leaderboard List */}
      <div className="flex-1 overflow-y-auto pr-1 pb-24 space-y-3">
        {isLoading ? (
          <div className="text-center py-20 text-sky-800 space-y-2">
            <Loader2 className="w-8 h-8 text-sky-500 animate-spin mx-auto" />
            <p className="text-xs font-semibold">Memuat antrian request...</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-20 px-4 rounded-3xl bg-white/80 border border-sky-200/80 space-y-3 max-w-md mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 mx-auto flex items-center justify-center">
              <Flame className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-extrabold text-[#0f2942]">Antrian Masih Kosong</h3>
            <p className="text-xs text-slate-600 font-medium">
              Ketik judul lagu yang ingin kamu kulik bersama The Flannels di kotak pencarian di atas untuk memasukkannya ke antrian!
            </p>
          </div>
        ) : (
          requests.map((req, index) => {
            const hasUpvoted = req.upvotedBy.includes(clientId);
            const isFulfilled = req.status === 'fulfilled';

            return (
              <div
                key={req.id}
                className={`p-3.5 sm:p-4 rounded-3xl border transition-all flex items-center gap-3 sm:gap-4 shadow-sm relative overflow-hidden ${
                  isFulfilled
                    ? 'bg-emerald-50/70 border-emerald-300 opacity-80'
                    : 'bg-white/85 border-sky-200/80 hover:bg-white'
                }`}
              >
                {/* Ranking Number */}
                <div className="w-7 text-center font-black font-mono text-sm sm:text-base text-slate-400">
                  #{index + 1}
                </div>

                {/* Album Art */}
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden shadow-xs border border-white bg-sky-100 flex-shrink-0">
                  {req.artworkUrl ? (
                    <img src={req.artworkUrl} alt={req.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-sky-600">
                      <Music className="w-6 h-6" />
                    </div>
                  )}
                </div>

                {/* Song & Requester Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm sm:text-base font-extrabold text-[#0f2942] truncate tracking-tight">
                      {req.title}
                    </h4>
                    {isFulfilled ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Siap di Studio
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-600" /> Antrian
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-sky-800 font-semibold truncate">
                    {req.artist} {req.album ? `• ${req.album}` : ''}
                  </p>

                  <div className="flex items-center gap-2 mt-1.5 flex-wrap text-[11px] font-medium text-slate-600">
                    <span className="flex items-center gap-1 font-bold text-sky-900">
                      <span>Diajukan oleh: {req.requesterName}</span>
                    </span>
                    {req.notes && (
                      <span className="italic text-slate-500 truncate max-w-xs">
                        "{req.notes}"
                      </span>
                    )}
                  </div>
                </div>

                {/* Right Side: Upvote Button & Admin Fulfill Action */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Upvote Button */}
                  <button
                    onClick={() => handleUpvote(req.id)}
                    disabled={isFulfilled}
                    className={`px-3 py-2 rounded-2xl flex flex-col items-center justify-center gap-0.5 transition border active:scale-90 ${
                      hasUpvoted
                        ? 'bg-gradient-to-b from-orange-400 to-rose-500 text-white border-orange-300 shadow-md shadow-orange-500/30'
                        : 'bg-white/90 text-slate-700 hover:text-orange-600 border-sky-200 hover:bg-orange-50'
                    }`}
                    title={hasUpvoted ? 'Batalkan Upvote' : 'Vote lagu ini agar cepat dikulik'}
                  >
                    <Flame className={`w-4 h-4 ${hasUpvoted ? 'fill-current animate-bounce' : ''}`} />
                    <span className="text-xs font-black font-mono">{req.upvotes}</span>
                  </button>

                  {/* Admin Actions (Input ke Studio) */}
                  {isAdmin && (
                    <div className="flex items-center gap-1 pl-1 border-l border-sky-200">
                      {!isFulfilled && (
                        <button
                          onClick={() => onFulfillRequest(req)}
                          className="px-3 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:opacity-95 text-white text-xs font-extrabold shadow-sm flex items-center gap-1"
                          title="Input stem studio untuk lagu ini"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Input Stem</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(req.id)}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                        title="Hapus request"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* New Request Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl bg-white/95 backdrop-blur-2xl border border-sky-300 p-5 shadow-2xl text-xs text-[#0f2942] space-y-4">
            <div className="flex items-center justify-between border-b border-sky-100 pb-2">
              <span className="font-extrabold text-sm text-[#0f2942] flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-orange-500" />
                <span>Form Request Lagu Cover</span>
              </span>
              <button
                onClick={() => setShowRequestModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Judul Lagu</label>
                <input
                  type="text"
                  required
                  value={reqTitle}
                  onChange={(e) => setReqTitle(e.target.value)}
                  placeholder="Contoh: Dan"
                  className="w-full bg-sky-50/70 border border-sky-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Penyanyi / Artis</label>
                <input
                  type="text"
                  required
                  value={reqArtist}
                  onChange={(e) => setReqArtist(e.target.value)}
                  placeholder="Contoh: Sheila On 7"
                  className="w-full bg-sky-50/70 border border-sky-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Nama Peminta</label>
                <input
                  type="text"
                  required
                  value={requesterName}
                  onChange={(e) => setRequesterName(e.target.value)}
                  placeholder="Nama kamu..."
                  className="w-full bg-sky-50/70 border border-sky-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Catatan Tambahan (Opsional)</label>
                <input
                  type="text"
                  value={reqNotes}
                  onChange={(e) => setReqNotes(e.target.value)}
                  placeholder="Misal: Buat setlist festival musik kampus"
                  className="w-full bg-sky-50/70 border border-sky-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  className="px-4 py-2 rounded-full bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-full bg-gradient-to-r from-orange-500 to-rose-600 text-white font-black shadow-md shadow-orange-500/20 active:scale-95 transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Mengirim...' : 'Kirim Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
