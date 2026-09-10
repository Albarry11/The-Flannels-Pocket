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

  // Auto-suggestion inside modal form
  const [modalSuggestions, setModalSuggestions] = useState<MusicSuggestion[]>([]);
  const [isModalSearching, setIsModalSearching] = useState(false);
  const modalSearchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clientId = getClientId();

  const refreshRequests = async () => {
    setIsLoading(true);
    const data = await fetchSongRequests();
    setRequests(data);
    setIsLoading(false);
  };

  useEffect(() => {
    refreshRequests();
    const handleRefresh = () => refreshRequests();
    window.addEventListener('flannels-request-added', handleRefresh);
    return () => window.removeEventListener('flannels-request-added', handleRefresh);
  }, []);

  const handleModalTitleChange = (val: string) => {
    setReqTitle(val);
    if (modalSearchDebounceRef.current) clearTimeout(modalSearchDebounceRef.current);

    if (val.trim().length < 2) {
      setModalSuggestions([]);
      setIsModalSearching(false);
      return;
    }

    setIsModalSearching(true);
    modalSearchDebounceRef.current = setTimeout(async () => {
      const results = await searchMusicSuggestions(val);
      setModalSuggestions(results);
      setIsModalSearching(false);
    }, 300);
  };

  const handleSelectModalSuggestion = (s: MusicSuggestion) => {
    setReqTitle(s.title);
    setReqArtist(s.artist);
    setReqAlbum(s.album || '');
    setReqArtwork(s.artworkUrl);
    setReqPreviewUrl(s.previewUrl);
    setModalSuggestions([]);
  };

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
    <div className="flex flex-col h-full max-w-6xl mx-auto w-full aero-glass rounded-3xl p-4 sm:p-6 shadow-xl relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-sky-200/60 pb-3 mb-3 flex-wrap gap-2 flex-shrink-0">
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
      <div className="relative mb-3 flex-shrink-0">
        <div className="flex items-center gap-2 bg-white/90 border border-sky-300/80 rounded-2xl px-4 py-2 shadow-xs focus-within:ring-2 focus-within:ring-sky-400">
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

      {/* Leaderboard List (Horizontal Cards Rail) */}
      <div className="flex-1 min-h-0 flex flex-row overflow-x-auto overflow-y-hidden gap-4 py-2 px-1 items-stretch scrollbar-thin">
        {isLoading ? (
          <div className="w-full flex flex-col items-center justify-center text-sky-800 space-y-2">
            <Loader2 className="w-8 h-8 text-sky-500 animate-spin mx-auto" />
            <p className="text-xs font-semibold">Memuat antrian request...</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="w-full flex flex-col items-center justify-center p-8 rounded-3xl bg-white/80 border border-sky-200/80 space-y-3 max-w-md mx-auto text-center my-auto">
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
                className={`w-[290px] sm:w-[320px] flex-shrink-0 p-4 rounded-3xl border transition-all flex flex-col justify-between shadow-sm relative overflow-hidden h-full ${
                  isFulfilled
                    ? 'bg-emerald-50/85 border-emerald-300 opacity-90'
                    : 'bg-white/90 border-sky-200/90 hover:bg-white hover:border-sky-300'
                }`}
              >
                {/* Top Section */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span className="font-mono font-black text-xs text-slate-500 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200">
                      #{index + 1}
                    </span>
                    {isFulfilled ? (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Siap
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-600" /> Antrian
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-xs border border-white bg-sky-100 flex-shrink-0">
                      {req.artworkUrl ? (
                        <img src={req.artworkUrl} alt={req.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-sky-600">
                          <Music className="w-6 h-6" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-extrabold text-[#0f2942] truncate tracking-tight" title={req.title}>
                        {req.title}
                      </h4>
                      <p className="text-xs text-sky-800 font-semibold truncate" title={req.artist}>
                        {req.artist}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">
                        {req.album || 'Single'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 p-2 rounded-2xl bg-sky-50/70 border border-sky-100 text-[11px] text-slate-600 space-y-0.5">
                    <div className="font-bold text-sky-950 text-[11px] truncate">
                      Oleh: {req.requesterName}
                    </div>
                    {req.notes && (
                      <p className="italic text-slate-500 text-[10px] truncate" title={req.notes}>
                        "{req.notes}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Bottom Action Section */}
                <div className="pt-2.5 border-t border-sky-100 flex items-center justify-between gap-2 mt-2">
                  <button
                    onClick={() => handleUpvote(req.id)}
                    disabled={isFulfilled}
                    className={`px-3 py-1.5 rounded-2xl flex items-center gap-1.5 transition border active:scale-95 ${
                      hasUpvoted
                        ? 'bg-gradient-to-r from-orange-400 to-rose-500 text-white border-orange-300 shadow-md shadow-orange-500/30 font-black'
                        : 'bg-white text-slate-700 hover:text-orange-600 border-sky-200 hover:bg-orange-50 font-bold'
                    }`}
                    title={hasUpvoted ? 'Batalkan Upvote' : 'Vote lagu ini agar cepat dikulik'}
                  >
                    <Flame className={`w-3.5 h-3.5 ${hasUpvoted ? 'fill-current' : ''}`} />
                    <span className="text-xs font-mono">{req.upvotes} Vote</span>
                  </button>

                  {isAdmin && (
                    <div className="flex items-center gap-1">
                      {!isFulfilled && (
                        <button
                          onClick={() => onFulfillRequest(req)}
                          className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-white text-[11px] font-extrabold shadow-xs hover:opacity-95"
                          title="Input stem studio untuk lagu ini"
                        >
                          Input Stem
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(req.id)}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
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
              {/* Song Title with Live Auto-Suggestions */}
              <div className="relative">
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Judul Lagu</label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    required
                    value={reqTitle}
                    onChange={(e) => handleModalTitleChange(e.target.value)}
                    placeholder="Ketik judul lagu (ada auto-saran)..."
                    className="w-full bg-sky-50/70 border border-sky-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-sky-500 pr-8"
                  />
                  {isModalSearching && (
                    <Loader2 className="w-3.5 h-3.5 text-sky-500 animate-spin absolute right-2.5" />
                  )}
                </div>

                {/* Modal Suggestions Dropdown */}
                {modalSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white/95 backdrop-blur-2xl border border-sky-300 rounded-2xl shadow-2xl overflow-hidden z-50 max-h-48 overflow-y-auto">
                    <div className="p-1.5 text-[9px] font-bold uppercase text-slate-400 border-b border-sky-100">
                      Pilih lagu untuk auto-fill:
                    </div>
                    {modalSuggestions.map((item, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleSelectModalSuggestion(item)}
                        className="flex items-center gap-2.5 p-2 hover:bg-sky-50 cursor-pointer border-b border-sky-50 last:border-0 text-left transition"
                      >
                        {item.artworkUrl ? (
                          <img src={item.artworkUrl} alt={item.title} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-sky-100 flex items-center justify-center text-sky-600 flex-shrink-0">
                            <Music className="w-4 h-4" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-bold text-[#0f2942] truncate block">{item.title}</span>
                          <span className="text-[10px] text-slate-500 truncate block">{item.artist} {item.album ? `• ${item.album}` : ''}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Penyanyi / Artis</label>
                <div className="flex items-center gap-2">
                  {reqArtwork && (
                    <img src={reqArtwork} alt="" className="w-8 h-8 rounded-lg object-cover border border-sky-200 flex-shrink-0" />
                  )}
                  <input
                    type="text"
                    required
                    value={reqArtist}
                    onChange={(e) => setReqArtist(e.target.value)}
                    placeholder="Contoh: Sheila On 7"
                    className="w-full bg-sky-50/70 border border-sky-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-sky-500"
                  />
                </div>
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
