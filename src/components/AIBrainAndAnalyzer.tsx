import React, { useState, useEffect } from 'react';
import type { Song, AICoachingReport } from '../types';
import {
  fetchAIBrainAnalysis,
  askAIBandProducer,
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
  Mic,
  Guitar,
  Sliders,
} from 'lucide-react';

interface AIBrainAndAnalyzerProps {
  currentSong: Song | null;
  replayGainEnabled: boolean;
  onToggleReplayGain: () => void;
}

export const AIBrainAndAnalyzer: React.FC<AIBrainAndAnalyzerProps> = ({
  currentSong,
  replayGainEnabled,
  onToggleReplayGain,
}) => {
  const [activeTab, setActiveTab] = useState<'coaching' | 'chat' | 'quality'>('coaching');
  const [coaching, setCoaching] = useState<AICoachingReport | null>(null);
  const [isLoadingCoaching, setIsLoadingCoaching] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');

  // Interactive chat
  const [chatMessages, setChatMessages] = useState<{ sender: 'user' | 'ai'; text: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

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
        { sender: 'ai', text: `Koneksi Tilikan bermasalah: ${msg}` },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const roleIcons = {
    Vocal: <Mic className="w-4 h-4 text-rose-500" />,
    Lead: <Guitar className="w-4 h-4 text-amber-500" />,
    Rhythm: <Music className="w-4 h-4 text-emerald-500" />,
    Bass: <Disc className="w-4 h-4 text-sky-500" />,
    Drums: <Sliders className="w-4 h-4 text-indigo-500" />,
  };

  const quality = currentSong?.qualityAnalysis;
  const replay = currentSong?.replayGain;

  if (!currentSong) {
    return (
      <div className="p-12 text-center text-slate-500 max-w-xl mx-auto aero-glass rounded-3xl">
        <Brain className="w-12 h-12 text-sky-500/60 mx-auto mb-3" />
        <h3 className="text-base font-bold text-[#0f2942]">Belum Ada Lagu yang Dipilih</h3>
        <p className="text-xs text-sky-800/80 mt-1">
          Pilih lagu di menu Library untuk membuka tilikan aransemen dan inspeksi kualitas audio.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto w-full aero-glass rounded-3xl p-4 sm:p-6 shadow-xl">
      {/* Top Header Tilikan (Point 8) */}
      <div className="flex items-center justify-between border-b border-sky-200/60 pb-3 mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-sky-500/30 text-white">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-[#0f2942] tracking-tight">
              Tilikan
            </h2>
            <p className="text-xs text-sky-700 font-medium">
              Analisis Aransemen Band • Kualitas Audio SpotiFLAC
            </p>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex bg-white/80 p-1 rounded-full border border-sky-200/80 text-xs font-bold shadow-xs">
          <button
            onClick={() => setActiveTab('coaching')}
            className={`px-3.5 py-1.5 rounded-full transition flex items-center gap-1.5 ${
              activeTab === 'coaching'
                ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-sm'
                : 'text-sky-900 hover:text-sky-600'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Kulik Personil</span>
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`px-3.5 py-1.5 rounded-full transition flex items-center gap-1.5 ${
              activeTab === 'chat'
                ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-sm'
                : 'text-sky-900 hover:text-sky-600'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Tanya Produser</span>
          </button>
          <button
            onClick={() => setActiveTab('quality')}
            className={`px-3.5 py-1.5 rounded-full transition flex items-center gap-1.5 ${
              activeTab === 'quality'
                ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-sm'
                : 'text-sky-900 hover:text-sky-600'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Kualitas Audio</span>
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
                <Loader2 className="w-8 h-8 text-sky-500 animate-spin mx-auto" />
                <p className="text-xs text-sky-900 font-semibold">{progressMsg || 'Membedah aransemen lagu...'}</p>
              </div>
            ) : coaching ? (
              <>
                {/* Summary Banner */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-sky-100/90 to-blue-100/70 border border-sky-300/60 text-xs space-y-2 shadow-xs">
                  <div className="flex items-center gap-2 font-bold text-sky-900 text-sm">
                    <Sparkles className="w-4 h-4 text-sky-600" />
                    <span>{coaching.songTitle} - Karakter Musik & Harmoni</span>
                  </div>
                  <p className="text-[#0f2942] leading-relaxed font-medium">{coaching.musicalSummary}</p>
                  <div className="p-2.5 rounded-xl bg-white/80 border border-sky-200/80 text-[11px] text-amber-900 font-medium">
                    💡 <strong>Panduan Nada Dasar:</strong> {coaching.keyAdvice}
                  </div>
                </div>

                {/* Personil Breakdown Grid */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-sky-900 uppercase tracking-wider block">
                    Panduan Kulik Khusus Personil The Flannels
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {coaching.personilGuides.map((guide, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-2xl bg-white/80 border border-sky-200/70 flex flex-col justify-between gap-2 shadow-sm"
                      >
                        <div>
                          <div className="flex items-center justify-between border-b border-sky-100 pb-2 mb-2">
                            <div className="flex items-center gap-2">
                              {roleIcons[guide.personil] || <Music className="w-4 h-4" />}
                              <span className="text-sm font-extrabold text-[#0f2942]">
                                {guide.personil}
                              </span>
                            </div>
                            <span className="text-[10px] font-bold text-sky-700 bg-sky-100 px-2.5 py-0.5 rounded-full border border-sky-300/60">
                              {guide.focus}
                            </span>
                          </div>
                          <ul className="text-xs text-[#1e3a5f] space-y-1.5 list-disc list-inside font-medium">
                            {guide.tips.map((tip, tIdx) => (
                              <li key={tIdx} className="leading-snug">{tip}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="pt-2 border-t border-sky-100 text-[11px] font-mono text-amber-800 font-bold">
                          🎵 {guide.keyChordsOrPattern}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Rehearsal Plan & Mix Doctor */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  <div className="p-3.5 rounded-2xl bg-white/80 border border-sky-200/70 text-xs space-y-2 shadow-sm">
                    <span className="font-extrabold text-[#0f2942] block">📋 Tahapan Latihan Studio</span>
                    <ol className="space-y-1 list-decimal list-inside text-[#1e3a5f] font-medium">
                      {coaching.rehearsalPlan.map((step, sIdx) => (
                        <li key={sIdx} className="leading-snug">{step}</li>
                      ))}
                    </ol>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white/80 border border-sky-200/70 text-xs space-y-2 shadow-sm">
                    <span className="font-extrabold text-sky-800 block">🩺 Mix Doctor</span>
                    <p className="text-[#1e3a5f] leading-relaxed font-medium">{coaching.mixDoctorNotes}</p>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        )}

        {/* TAB 2: TANYA PRODUSER */}
        {activeTab === 'chat' && (
          <div className="flex flex-col h-[460px]">
            {/* Quick Suggestion Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2 scrollbar-none text-xs">
              <span className="text-[10px] font-bold uppercase text-sky-800 whitespace-nowrap">Tanya Cepat:</span>
              <button
                onClick={() => handleSendChat("Bagaimana pembagian riff gitar lead dan rhythm di lagu ini?")}
                className="px-3 py-1 rounded-full bg-white/80 border border-sky-300 text-sky-900 hover:bg-sky-50 font-medium whitespace-nowrap shadow-xs"
              >
                🎸 Pembagian Riff Gitar
              </button>
              <button
                onClick={() => handleSendChat("Pola ketukan kick drum dan snare yang paling pas untuk part chorus?")}
                className="px-3 py-1 rounded-full bg-white/80 border border-sky-300 text-sky-900 hover:bg-sky-50 font-medium whitespace-nowrap shadow-xs"
              >
                🥁 Pola Ketukan Drum
              </button>
              <button
                onClick={() => handleSendChat("Bagaimana saran improvisasi solo untuk lagu ini?")}
                className="px-3 py-1 rounded-full bg-white/80 border border-sky-300 text-sky-900 hover:bg-sky-50 font-medium whitespace-nowrap shadow-xs"
              >
                🎼 Improvisasi Solo
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto space-y-3 p-3 rounded-2xl bg-white/60 border border-sky-200/80 mb-3 shadow-inner">
              {chatMessages.length === 0 ? (
                <div className="text-center py-20 text-sky-800 space-y-2">
                  <MessageSquare className="w-8 h-8 text-sky-500 mx-auto" />
                  <p className="text-xs max-w-sm mx-auto font-medium">
                    AI Music Producer siap membantu membedah lagu "{currentSong.title}". Tanyakan chord, melodi solo, atau dinamika panggung!
                  </p>
                </div>
              ) : (
                chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl p-3 text-xs leading-relaxed font-medium shadow-sm ${
                        msg.sender === 'user'
                          ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-tr-none'
                          : 'bg-white text-[#0f2942] border border-sky-200 rounded-tl-none'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))
              )}
              {isChatLoading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl p-3 bg-white border border-sky-200 text-xs text-sky-700 flex items-center gap-2 font-medium">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-500" />
                    <span>AI Producer sedang merumuskan jawaban teliti...</span>
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
                className="flex-1 bg-white/80 border border-sky-300 rounded-full px-4 py-2 text-xs text-[#0f2942] focus:outline-none focus:border-sky-500 shadow-xs"
              />
              <button
                onClick={() => handleSendChat()}
                disabled={isChatLoading || !chatInput.trim()}
                className="px-5 py-2 rounded-full bg-gradient-to-r from-sky-500 to-blue-600 hover:opacity-95 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-sky-500/20 disabled:opacity-50"
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
              className={`p-4 rounded-2xl border flex items-start gap-3.5 shadow-sm ${
                quality?.isLossless
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                  : 'bg-amber-50 border-amber-300 text-amber-950'
              }`}
            >
              {quality?.isLossless ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm text-[#0f2942]">
                    {quality?.classification || 'Lossless FLAC Master'}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white border border-emerald-300 uppercase font-bold text-emerald-700">
                    {quality?.cutoffFrequency ? `Cutoff: ${quality.cutoffFrequency} Hz` : 'Full Bandwidth'}
                  </span>
                </div>
                <p className="text-xs text-[#1e3a5f] mt-1 font-medium">
                  {quality?.notes ||
                    'Audio mempertahankan fidelitas frekuensi tinggi penuh (>20kHz) tanpa kompresi psikoakustik lossy.'}
                </p>
              </div>
            </div>

            {/* Technical Specs Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white/80 p-3 rounded-2xl border border-sky-200/70 shadow-xs">
                <span className="text-[10px] text-sky-800 uppercase tracking-wider block font-bold">
                  Sample Rate
                </span>
                <span className="text-base font-mono font-black text-[#0f2942]">
                  {quality ? `${(quality.sampleRate / 1000).toFixed(1)} kHz` : '44.1 kHz'}
                </span>
              </div>
              <div className="bg-white/80 p-3 rounded-2xl border border-sky-200/70 shadow-xs">
                <span className="text-[10px] text-sky-800 uppercase tracking-wider block font-bold">
                  Bit Depth
                </span>
                <span className="text-base font-mono font-black text-[#0f2942]">
                  {quality ? `${quality.bitDepthEstimate}-bit Float` : '16-bit / 24-bit'}
                </span>
              </div>
              <div className="bg-white/80 p-3 rounded-2xl border border-sky-200/70 shadow-xs">
                <span className="text-[10px] text-sky-800 uppercase tracking-wider block font-bold">
                  Dynamic Range
                </span>
                <span className="text-base font-mono font-black text-sky-700">
                  {quality ? `DR ${quality.dynamicRangeScore}` : 'DR 12'}
                </span>
              </div>
              <div className="bg-white/80 p-3 rounded-2xl border border-sky-200/70 shadow-xs">
                <span className="text-[10px] text-sky-800 uppercase tracking-wider block font-bold">
                  Channels
                </span>
                <span className="text-base font-mono font-black text-[#0f2942]">
                  {quality?.channels === 1 ? 'Mono' : 'Stereo 2.0'}
                </span>
              </div>
            </div>

            {/* ReplayGain Section */}
            <div className="bg-white/80 p-4 rounded-2xl border border-sky-200/70 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-extrabold text-[#0f2942]">
                    Normalisasi Kelantangan ReplayGain (ITU-R BS.1770)
                  </h4>
                  <p className="text-xs text-sky-700">
                    Menyamakan kenyaringan audio ke standar studio -14 LUFS
                  </p>
                </div>
                <button
                  onClick={onToggleReplayGain}
                  className={`px-4 py-2 rounded-full text-xs font-extrabold transition flex items-center gap-1.5 shadow-sm ${
                    replayGainEnabled
                      ? 'bg-emerald-500 text-white shadow-emerald-500/30'
                      : 'bg-sky-100 text-sky-800 hover:bg-sky-200 border border-sky-300'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{replayGainEnabled ? 'Aktif' : 'Nonaktif'}</span>
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-1">
                <div className="bg-sky-50/80 p-3 rounded-xl border border-sky-200">
                  <span className="text-[10px] text-sky-800 uppercase block font-bold">Integrated Loudness</span>
                  <span className="text-base font-mono font-bold text-[#0f2942]">
                    {replay ? `${replay.integratedLufs} LUFS` : '-14.2 LUFS'}
                  </span>
                </div>
                <div className="bg-sky-50/80 p-3 rounded-xl border border-sky-200">
                  <span className="text-[10px] text-sky-800 uppercase block font-bold">True Peak</span>
                  <span className="text-base font-mono font-bold text-[#0f2942]">
                    {replay ? `${replay.truePeakDb} dBTP` : '-0.5 dBTP'}
                  </span>
                </div>
                <div className="bg-sky-50/80 p-3 rounded-xl border border-sky-200">
                  <span className="text-[10px] text-sky-800 uppercase block font-bold">Gain Offset</span>
                  <span className="text-base font-mono font-bold text-emerald-700">
                    {replay
                      ? `${replay.recommendedGainDb > 0 ? '+' : ''}${replay.recommendedGainDb} dB`
                      : '+0.2 dB'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
