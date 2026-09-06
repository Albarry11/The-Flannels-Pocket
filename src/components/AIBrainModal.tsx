import React, { useState, useEffect } from 'react';
import type { Song, AIBrainConfig, AICoachingReport } from '../types';
import {
  getAIBrainConfig,
  saveAIBrainConfig,
  fetchAIBrainAnalysis,
  askAIBandProducer,
  POPULAR_MUSIC_MODELS,
} from '../services/aiBrain';
import { Sparkles, Brain, MessageSquare, Settings, Send, Loader2, CheckCircle2, X, Mic, Guitar, Music, Disc, Sliders } from 'lucide-react';

interface AIBrainModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSong: Song | null;
}

export const AIBrainModal: React.FC<AIBrainModalProps> = ({
  isOpen,
  onClose,
  currentSong,
}) => {
  const [activeTab, setActiveTab] = useState<'coaching' | 'chat' | 'settings'>('coaching');
  const [config, setConfig] = useState<AIBrainConfig>(getAIBrainConfig());
  const [coaching, setCoaching] = useState<AICoachingReport | null>(null);
  const [isLoadingCoaching, setIsLoadingCoaching] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');

  // Chat state
  const [chatMessages, setChatMessages] = useState<{ sender: 'user' | 'ai'; text: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Settings saved feedback
  const [savedFeedback, setSavedFeedback] = useState(false);

  // Fetch coaching analysis when modal opens or song changes
  useEffect(() => {
    if (isOpen && currentSong) {
      setIsLoadingCoaching(true);
      fetchAIBrainAnalysis(currentSong, setProgressMsg)
        .then((report) => {
          setCoaching(report);
        })
        .catch((err) => {
          console.warn('AI analysis error:', err);
        })
        .finally(() => {
          setIsLoadingCoaching(false);
        });
    }
  }, [isOpen, currentSong]);

  if (!isOpen) return null;

  const handleSaveSettings = () => {
    saveAIBrainConfig(config);
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2000);

    // Refresh coaching with new model/key if song is loaded
    if (currentSong) {
      setIsLoadingCoaching(true);
      fetchAIBrainAnalysis(currentSong, setProgressMsg)
        .then(setCoaching)
        .finally(() => setIsLoadingCoaching(false));
    }
  };

  const handleSendChat = async () => {
    if (!chatInput.trim() || !currentSong || isChatLoading) return;
    const q = chatInput.trim();
    setChatInput('');
    setChatMessages((prev) => [...prev, { sender: 'user', text: q }]);
    setIsChatLoading(true);

    try {
      const reply = await askAIBandProducer(q, currentSong);
      setChatMessages((prev) => [...prev, { sender: 'ai', text: reply }]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setChatMessages((prev) => [
        ...prev,
        { sender: 'ai', text: `Gagal menghubungi 9router: ${msg}` },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const roleIcons = {
    Vocal: <Mic className="w-4 h-4 text-rose-400" />,
    Lead: <Guitar className="w-4 h-4 text-amber-400" />,
    Rhythm: <Music className="w-4 h-4 text-emerald-400" />,
    Bass: <Disc className="w-4 h-4 text-cyan-400" />,
    Drums: <Sliders className="w-4 h-4 text-violet-400" />,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-[#0c1322] border border-cyan-500/40 rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden shadow-cyan-500/10">
        
        {/* Header Aero Glass */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-cyan-500/20 bg-gradient-to-r from-blue-950/60 via-indigo-950/40 to-cyan-950/50 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-400 via-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
              <Brain className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  The Flannels AI Brain (9router Engine)
                </h2>
                <span className="text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 px-2 py-0.5 rounded-full">
                  {config.model.split('/').pop()}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Otak Cerdas Aransemen Band, Teori Musik & Rekomendasi Kulik
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

        {/* Tab Navigation */}
        <div className="flex border-b border-cyan-500/20 bg-[#080e1a] px-6 gap-2 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('coaching')}
            className={`py-3 px-3 border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'coaching'
                ? 'border-cyan-400 text-cyan-300 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Kulik & Aransemen Band</span>
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`py-3 px-3 border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'chat'
                ? 'border-indigo-400 text-indigo-300 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Tanya AI Producer</span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`py-3 px-3 border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'settings'
                ? 'border-purple-400 text-purple-300 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Pengaturan 9router</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          
          {/* TAB 1: COACHING & ARANSEMEN */}
          {activeTab === 'coaching' && (
            <div className="space-y-4">
              {isLoadingCoaching ? (
                <div className="text-center py-16 space-y-3">
                  <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mx-auto" />
                  <p className="text-xs text-slate-300">{progressMsg || 'Menghitung analisis musik...'}</p>
                </div>
              ) : coaching ? (
                <>
                  {/* Summary Banner */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-900/30 to-cyan-900/30 border border-cyan-500/30 text-xs text-slate-200 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-cyan-300 text-sm">
                      <Sparkles className="w-4 h-4 text-cyan-400" />
                      <span>{coaching.songTitle} - Karakter Musik & Dinamika</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed">{coaching.musicalSummary}</p>
                    <div className="p-2.5 rounded-xl bg-black/40 border border-cyan-500/20 text-[11px] text-amber-300">
                      💡 <strong>Saran Tangga Nada:</strong> {coaching.keyAdvice}
                    </div>
                  </div>

                  {/* Personil Breakdown Grid */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                      Panduan Kulik Khusus Personil The Flannels
                    </span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {coaching.personilGuides.map((guide, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-2xl bg-[#0e1626] border border-cyan-500/20 flex flex-col justify-between gap-2 shadow-sm"
                        >
                          <div>
                            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
                              <div className="flex items-center gap-2">
                                {roleIcons[guide.personil] || <Music className="w-4 h-4" />}
                                <span className="text-sm font-bold text-white">
                                  {guide.personil}
                                </span>
                              </div>
                              <span className="text-[10px] font-medium text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded-full border border-cyan-500/30">
                                {guide.focus}
                              </span>
                            </div>
                            <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
                              {guide.tips.map((tip, tIdx) => (
                                <li key={tIdx} className="leading-snug">{tip}</li>
                              ))}
                            </ul>
                          </div>
                          <div className="pt-2 border-t border-slate-800/60 text-[11px] font-mono text-amber-300/90">
                            🎵 {guide.keyChordsOrPattern}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Rehearsal Plan & Mix Doctor */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    <div className="p-3.5 rounded-2xl bg-[#0e1626] border border-cyan-500/20 text-xs space-y-2">
                      <span className="font-bold text-white block">📋 Tahapan Latihan Studio</span>
                      <ol className="space-y-1 list-decimal list-inside text-slate-300">
                        {coaching.rehearsalPlan.map((step, sIdx) => (
                          <li key={sIdx} className="leading-snug">{step}</li>
                        ))}
                      </ol>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-[#0e1626] border border-cyan-500/20 text-xs space-y-2">
                      <span className="font-bold text-cyan-300 block">🩺 Mix Doctor & Inspeksi Spektral</span>
                      <p className="text-slate-300 leading-relaxed">{coaching.mixDoctorNotes}</p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-slate-400">
                  <p>Pilih lagu terlebih dahulu untuk melihat analisis aransemen AI.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: TANYA AI PRODUCER */}
          {activeTab === 'chat' && (
            <div className="flex flex-col h-[420px]">
              <div className="flex-1 overflow-y-auto space-y-3 p-3 rounded-2xl bg-[#080e1a] border border-cyan-500/20 mb-3">
                {chatMessages.length === 0 ? (
                  <div className="text-center py-16 text-slate-400 space-y-2">
                    <MessageSquare className="w-8 h-8 text-cyan-500 mx-auto" />
                    <p className="text-xs">
                      Tanyakan apa saja kepada AI Producer mengenai aransemen, fingering kunci gitar,
                      sound efek, fill-in drum, atau pembagian part vokal untuk lagu ini!
                    </p>
                  </div>
                ) : (
                  chatMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl p-3 text-xs leading-relaxed ${
                          msg.sender === 'user'
                            ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white rounded-tr-none'
                            : 'bg-[#121b2d] text-slate-200 border border-cyan-500/20 rounded-tl-none'
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  ))
                )}
                {isChatLoading && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl p-3 bg-[#121b2d] border border-cyan-500/20 text-xs text-slate-400 flex items-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                      <span>AI Producer sedang membedah pertanyaanmu...</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input Bar */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                  placeholder="Contoh: Apa progresi chord yang bagus untuk part bridge lagu ini?"
                  className="flex-1 bg-[#080e1a] border border-cyan-500/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
                <button
                  onClick={handleSendChat}
                  disabled={isChatLoading || !chatInput.trim()}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-cyan-500/20 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Kirim</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: PENGATURAN 9ROUTER */}
          {activeTab === 'settings' && (
            <div className="space-y-4 max-w-lg mx-auto py-2">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  API Key 9router
                </label>
                <input
                  type="password"
                  value={config.apiKey}
                  onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                  placeholder="9r-xxxxxxxxxxxxxxxxxxxxxxxx"
                  className="w-full bg-[#080e1a] border border-cyan-500/30 rounded-xl px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-400"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Key tersimpan aman di browser (localStorage). Jika kosong, sistem otomatis memakai
                  kalkulasi cerdas algoritma musik lokal.
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Pilih Model Musik Terbaik
                </label>
                <div className="space-y-2">
                  {POPULAR_MUSIC_MODELS.map((m) => (
                    <label
                      key={m.id}
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${
                        config.model === m.id
                          ? 'bg-cyan-950/30 border-cyan-400 text-white'
                          : 'bg-[#080e1a] border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="model"
                          checked={config.model === m.id}
                          onChange={() => setConfig({ ...config, model: m.id })}
                          className="accent-cyan-400"
                        />
                        <span className="text-xs font-medium text-slate-200">{m.name}</span>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/40 text-cyan-300">
                        {m.provider}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  API Endpoint Router
                </label>
                <input
                  type="text"
                  value={config.endpoint}
                  onChange={(e) => setConfig({ ...config, endpoint: e.target.value })}
                  placeholder="https://api.9router.com/v1"
                  className="w-full bg-[#080e1a] border border-cyan-500/30 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="pt-2 flex items-center justify-between">
                {savedFeedback && (
                  <span className="text-xs text-emerald-400 flex items-center gap-1 font-semibold">
                    <CheckCircle2 className="w-4 h-4" /> Pengaturan tersimpan!
                  </span>
                )}
                <button
                  onClick={handleSaveSettings}
                  className="ml-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:opacity-90 text-white text-xs font-bold transition shadow-lg shadow-cyan-500/20"
                >
                  Simpan Pengaturan
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-cyan-500/20 bg-[#080e1a]/80 flex justify-end">
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
