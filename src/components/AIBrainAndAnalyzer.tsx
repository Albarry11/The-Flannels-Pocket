import React, { useState, useEffect } from 'react';
import type { Song, AICoachingReport } from '../types';
import {
  fetchAIBrainAnalysis,
  askAIBandProducer,
  researchSongBpmAndKeyWithAI,
} from '../services/aiBrain';
import {
  Brain,
  MessageSquare,
  ShieldCheck,
  Disc,
  Sparkles,
  Send,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Music,
  Search,
  Mic,
  Guitar,
  Sliders,
} from 'lucide-react';

interface AIBrainAndAnalyzerProps {
  currentSong: Song | null;
  replayGainEnabled: boolean;
  onToggleReplayGain: () => void;
  onUpdateSongInfo?: (bpm: number, key: string) => void;
}

export const AIBrainAndAnalyzer: React.FC<AIBrainAndAnalyzerProps> = ({
  currentSong,
  replayGainEnabled,
  onToggleReplayGain,
  onUpdateSongInfo,
}) => {
  const [activeTab, setActiveTab] = useState<'coaching' | 'chat' | 'quality' | 'research'>('coaching');
  const [coaching, setCoaching] = useState<AICoachingReport | null>(null);
  const [isLoadingCoaching, setIsLoadingCoaching] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');

  // Interactive chat
  const [chatMessages, setChatMessages] = useState<{ sender: 'user' | 'ai'; text: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

  // AI Research
  const [isResearching, setIsResearching] = useState(false);
  const [researchResult, setResearchResult] = useState<{ bpm: number; key: string; timeSignature: string; notes: string } | null>(null);

  useEffect(() => {
    if (currentSong) {
      setIsLoadingCoaching(true);
      fetchAIBrainAnalysis(currentSong, setProgressMsg)
        .then((report) => setCoaching(report))
        .catch((err) => console.warn('AI analysis error:', err))
        .finally(() => setIsLoadingCoaching(false));
    }
  }, [currentSong]);

  const handleSendChat = async (presetText?: string) => {
    const textToSend = presetText || chatInput.trim();
    if (!textToSend || !currentSong || isChatLoading) return;
    if (!presetText) setChatInput('');

    setChatMessages((prev) => [...prev, { sender: 'user', text: textToSend }]);
    setIsChatLoading(true);

    try {
      const reply = await askAIBandProducer(textToSend, currentSong);
      setChatMessages((prev) => [...prev, { sender: 'ai', text: reply }]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setChatMessages((prev) => [
        ...prev,
        { sender: 'ai', text: `Gagal menghubungi AI: ${msg}` },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleRunAIResearch = async () => {
    if (!currentSong) return;
    setIsResearching(true);
    const res = await researchSongBpmAndKeyWithAI(currentSong.title, currentSong.artist);
    if (res) {
      setResearchResult(res);
      onUpdateSongInfo?.(res.bpm, res.key);
    }
    setIsResearching(false);
  };

  const roleIcons = {
    Vocal: <Mic className="w-4 h-4 text-rose-400" />,
    Lead: <Guitar className="w-4 h-4 text-amber-400" />,
    Rhythm: <Music className="w-4 h-4 text-emerald-400" />,
    Bass: <Disc className="w-4 h-4 text-cyan-400" />,
    Drums: <Sliders className="w-4 h-4 text-violet-400" />,
  };

  const quality = currentSong?.qualityAnalysis;
  const replay = currentSong?.replayGain;

  if (!currentSong) {
    return (
      <div className="p-12 text-center text-slate-500 max-w-xl mx-auto">
        <Brain className="w-12 h-12 text-cyan-500/50 mx-auto mb-3" />
        <h3 className="text-base font-bold text-white">Belum Ada Lagu yang Dipilih</h3>
        <p className="text-xs text-slate-400 mt-1">
          Pilih atau unggah lagu di Library untuk membuka analisis aransemen musik dan inspeksi kualitas audio.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-w-6xl mx-auto w-full bg-[#080f1e]/80 rounded-3xl border border-cyan-500/25 p-4 sm:p-6 shadow-2xl backdrop-blur-xl">
      {/* Top Tab Navigation */}
      <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3 mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-extrabold text-white tracking-tight">
              AI Music Brain & Audio Analyzer
            </h2>
            <p className="text-[11px] text-cyan-300/80">
              Produser Musik 9router • SpotiFLAC Lossless & ReplayGain
            </p>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex bg-[#050b16] p-1 rounded-xl border border-cyan-500/20 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('coaching')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
              activeTab === 'coaching'
                ? 'bg-cyan-500 text-black font-extrabold shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Kulik Personil</span>
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
              activeTab === 'chat'
                ? 'bg-cyan-500 text-black font-extrabold shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Tanya AI</span>
          </button>
          <button
            onClick={() => setActiveTab('quality')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
              activeTab === 'quality'
                ? 'bg-cyan-500 text-black font-extrabold shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Kualitas Audio</span>
          </button>
          <button
            onClick={() => setActiveTab('research')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
              activeTab === 'research'
                ? 'bg-cyan-500 text-black font-extrabold shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Riset BPM & Key</span>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto pr-1">
        
        {/* TAB 1: KULIK PERSONIL */}
        {activeTab === 'coaching' && (
          <div className="space-y-4">
            {isLoadingCoaching ? (
              <div className="text-center py-16 space-y-3">
                <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mx-auto" />
                <p className="text-xs text-slate-300">{progressMsg || 'Membedah aransemen lagu...'}</p>
              </div>
            ) : coaching ? (
              <>
                {/* Summary Banner */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/40 via-cyan-950/30 to-[#071324] border border-cyan-500/30 text-xs text-slate-200 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-cyan-300 text-sm">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    <span>{coaching.songTitle} - Karakter & Harmoni</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">{coaching.musicalSummary}</p>
                  <div className="p-2.5 rounded-xl bg-[#040814] border border-cyan-500/20 text-[11px] text-amber-300">
                    💡 <strong>Panduan Nada Dasar:</strong> {coaching.keyAdvice}
                  </div>
                </div>

                {/* Personil Breakdown Grid */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                    Panduan Kulik Khusus Personil The Flannels
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {coaching.personilGuides.map((guide, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-2xl bg-[#060c18] border border-cyan-500/20 flex flex-col justify-between gap-2 shadow-sm"
                      >
                        <div>
                          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
                            <div className="flex items-center gap-2">
                              {roleIcons[guide.personil] || <Music className="w-4 h-4" />}
                              <span className="text-sm font-bold text-white">
                                {guide.personil}
                              </span>
                            </div>
                            <span className="text-[10px] font-semibold text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded-full border border-cyan-400/30">
                              {guide.focus}
                            </span>
                          </div>
                          <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
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
                  <div className="p-3.5 rounded-2xl bg-[#060c18] border border-cyan-500/20 text-xs space-y-2">
                    <span className="font-bold text-white block">📋 Tahapan Latihan Studio</span>
                    <ol className="space-y-1 list-decimal list-inside text-slate-300">
                      {coaching.rehearsalPlan.map((step, sIdx) => (
                        <li key={sIdx} className="leading-snug">{step}</li>
                      ))}
                    </ol>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#060c18] border border-cyan-500/20 text-xs space-y-2">
                    <span className="font-bold text-cyan-300 block">🩺 Mix Doctor</span>
                    <p className="text-slate-300 leading-relaxed">{coaching.mixDoctorNotes}</p>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        )}

        {/* TAB 2: TANYA AI PRODUCER */}
        {activeTab === 'chat' && (
          <div className="flex flex-col h-[460px]">
            {/* Quick Suggestion Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2 scrollbar-none text-xs">
              <span className="text-[10px] font-bold uppercase text-slate-500 whitespace-nowrap">Tanya Cepat:</span>
              <button
                onClick={() => handleSendChat("Bagaimana cara membagi riff lead guitar dan rhythm di part reff lagu ini?")}
                className="px-2.5 py-1 rounded-lg bg-[#060c18] border border-cyan-500/20 text-slate-300 hover:text-white whitespace-nowrap"
              >
                🎸 Pembagian Riff Gitar
              </button>
              <button
                onClick={() => handleSendChat("Apa pola drum dan ketukan kick/snare yang paling cocok di lagu ini?")}
                className="px-2.5 py-1 rounded-lg bg-[#060c18] border border-cyan-500/20 text-slate-300 hover:text-white whitespace-nowrap"
              >
                🥁 Pola Ketukan Drum
              </button>
              <button
                onClick={() => handleSendChat("Jika vokalis pria membawakan lagu ini, nada dasar apa yang paling pas?")}
                className="px-2.5 py-1 rounded-lg bg-[#060c18] border border-cyan-500/20 text-slate-300 hover:text-white whitespace-nowrap"
              >
                🎤 Rekomendasi Pitch Vokal
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto space-y-3 p-3 rounded-2xl bg-[#050b16] border border-cyan-500/20 mb-3">
              {chatMessages.length === 0 ? (
                <div className="text-center py-20 text-slate-400 space-y-2">
                  <MessageSquare className="w-8 h-8 text-cyan-500/60 mx-auto" />
                  <p className="text-xs max-w-sm mx-auto">
                    AI Music Producer terhubung ke <code>localhost:20128</code>. Tanyakan apa pun seputar
                    kunci gitar, solo, tempo, aransemen, dan dinamika panggung!
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
                          ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-tr-none'
                          : 'bg-[#0d1729] text-slate-200 border border-cyan-500/20 rounded-tl-none'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))
              )}
              {isChatLoading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl p-3 bg-[#0d1729] border border-cyan-500/20 text-xs text-cyan-300 flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>AI Producer sedang membedah jawaban...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Chat Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                placeholder="Tanyakan chord, fill drum, atau solo guitar..."
                className="flex-1 bg-[#050b16] border border-cyan-500/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
              />
              <button
                onClick={() => handleSendChat()}
                disabled={isChatLoading || !chatInput.trim()}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 text-white text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Kirim</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: KUALITAS AUDIO & REPLAYGAIN */}
        {activeTab === 'quality' && (
          <div className="space-y-4">
            {/* Lossless Classification Banner */}
            <div
              className={`p-4 rounded-2xl border flex items-start gap-3.5 ${
                quality?.isLossless
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              }`}
            >
              {quality?.isLossless ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-amber-400 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-white">
                    {quality?.classification || 'Lossless FLAC Master'}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/40 border border-white/10 uppercase font-bold text-cyan-300">
                    {quality?.cutoffFrequency ? `Cutoff: ${quality.cutoffFrequency} Hz` : 'Full Bandwidth'}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  {quality?.notes ||
                    'Audio mempertahankan fidelitas frekuensi tinggi penuh (>20kHz) tanpa kompresi psikoakustik lossy.'}
                </p>
              </div>
            </div>

            {/* Technical Specs Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-[#050b16] p-3 rounded-xl border border-cyan-500/20">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                  Sample Rate
                </span>
                <span className="text-base font-mono font-bold text-white">
                  {quality ? `${(quality.sampleRate / 1000).toFixed(1)} kHz` : '44.1 kHz'}
                </span>
              </div>
              <div className="bg-[#050b16] p-3 rounded-xl border border-cyan-500/20">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                  Bit Depth
                </span>
                <span className="text-base font-mono font-bold text-white">
                  {quality ? `${quality.bitDepthEstimate}-bit Float` : '16-bit / 24-bit'}
                </span>
              </div>
              <div className="bg-[#050b16] p-3 rounded-xl border border-cyan-500/20">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                  Dynamic Range
                </span>
                <span className="text-base font-mono font-bold text-cyan-300">
                  {quality ? `DR ${quality.dynamicRangeScore}` : 'DR 12'}
                </span>
              </div>
              <div className="bg-[#050b16] p-3 rounded-xl border border-cyan-500/20">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                  Channels
                </span>
                <span className="text-base font-mono font-bold text-white">
                  {quality?.channels === 1 ? 'Mono' : 'Stereo 2.0'}
                </span>
              </div>
            </div>

            {/* ReplayGain Section */}
            <div className="bg-[#050b16] p-4 rounded-2xl border border-cyan-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">
                    Normalisasi Kelantangan ReplayGain (ITU-R BS.1770)
                  </h4>
                  <p className="text-xs text-slate-400">
                    Menyamakan kenyaringan audio ke standar studio -14 LUFS
                  </p>
                </div>
                <button
                  onClick={onToggleReplayGain}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    replayGainEnabled
                      ? 'bg-emerald-500 text-black font-extrabold shadow-lg shadow-emerald-500/20'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{replayGainEnabled ? 'Aktif' : 'Nonaktif'}</span>
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-1">
                <div className="bg-[#081122] p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase block">Integrated Loudness</span>
                  <span className="text-base font-mono font-bold text-white">
                    {replay ? `${replay.integratedLufs} LUFS` : '-14.2 LUFS'}
                  </span>
                </div>
                <div className="bg-[#081122] p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase block">True Peak</span>
                  <span className="text-base font-mono font-bold text-white">
                    {replay ? `${replay.truePeakDb} dBTP` : '-0.5 dBTP'}
                  </span>
                </div>
                <div className="bg-[#081122] p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase block">Gain Offset</span>
                  <span className="text-base font-mono font-bold text-emerald-400">
                    {replay
                      ? `${replay.recommendedGainDb > 0 ? '+' : ''}${replay.recommendedGainDb} dB`
                      : '+0.2 dB'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: RISET BPM & KEY VIA AI */}
        {activeTab === 'research' && (
          <div className="space-y-4 max-w-xl mx-auto py-2">
            <div className="p-4 rounded-2xl bg-[#050b16] border border-cyan-500/25 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">
                    Riset Otomatis Tempo & Tangga Nada
                  </h4>
                  <p className="text-xs text-slate-400">
                    Menghubungi AI untuk mencari data BPM, Key, dan birama resmi lagu "{currentSong.title}"
                  </p>
                </div>
                <button
                  onClick={handleRunAIResearch}
                  disabled={isResearching}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-cyan-500/20 disabled:opacity-50"
                >
                  {isResearching ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Mencari...</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-3.5 h-3.5" />
                      <span>Riset via AI</span>
                    </>
                  )}
                </button>
              </div>

              {researchResult && (
                <div className="p-4 rounded-xl bg-[#081224] border border-cyan-500/30 space-y-3 mt-3">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2.5 rounded-lg bg-black/40 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block uppercase">Tempo Resmi</span>
                      <span className="text-2xl font-mono font-extrabold text-amber-400">
                        {researchResult.bpm}
                      </span>
                      <span className="text-[10px] text-slate-500 block">BPM</span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-black/40 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block uppercase">Tangga Nada</span>
                      <span className="text-2xl font-mono font-extrabold text-cyan-400">
                        {researchResult.key}
                      </span>
                      <span className="text-[10px] text-slate-500 block">Original Key</span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-black/40 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block uppercase">Birama</span>
                      <span className="text-2xl font-mono font-extrabold text-white">
                        {researchResult.timeSignature}
                      </span>
                      <span className="text-[10px] text-slate-500 block">Time Sig</span>
                    </div>
                  </div>

                  {researchResult.notes && (
                    <p className="text-xs text-slate-300 italic border-t border-slate-800 pt-2">
                      💡 {researchResult.notes}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
