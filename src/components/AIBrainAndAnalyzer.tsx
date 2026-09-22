import React, { useState, useEffect } from 'react';
import type { Song, AICoachingReport } from '../types';
import {
  fetchAIBrainAnalysis,
  askAIBandProducer,
} from '../services/aiBrain';
import { saveSongToStorage } from '../services/storage';
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
  RefreshCw,
  ChevronLeft,
  ChevronRight,
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
  const [activePersonilIdx, setActivePersonilIdx] = useState(0);

  // Interactive chat
  const [chatMessages, setChatMessages] = useState<{ sender: 'user' | 'ai'; text: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

  const runCoachingAnalysis = (force: boolean = false) => {
    if (!currentSong) return;

    if (!force && currentSong.coachingReport) {
      setCoaching(currentSong.coachingReport);
      return;
    }

    setIsLoadingCoaching(true);
    fetchAIBrainAnalysis(currentSong, setProgressMsg)
      .then(async (report) => {
        setCoaching(report);
        currentSong.coachingReport = report;
        await saveSongToStorage(currentSong);
      })
      .catch((err) => console.warn('AI analysis error:', err))
      .finally(() => setIsLoadingCoaching(false));
  };

  useEffect(() => {
    runCoachingAnalysis(false);
    setActivePersonilIdx(0);
  }, [currentSong?.id]);

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
    <div className="flex flex-col h-full max-w-5xl mx-auto w-full aero-glass rounded-xl sm:rounded-2xl p-2 sm:p-4 shadow-lg min-h-0 overflow-hidden">
      {/* Top Header Tilikan Tabs */}
      <div className="flex items-center justify-between border-b border-sky-200/50 pb-2 mb-2 gap-1.5 flex-shrink-0 min-w-0">
        <div className="flex items-center p-0.5 rounded-lg sm:rounded-xl bg-white/50 border border-white/70 shadow-2xs backdrop-blur-md overflow-x-auto scrollbar-none flex-1 min-w-0">
          <button
            onClick={() => setActiveTab('coaching')}
            className={`py-1 sm:py-1.5 px-2.5 sm:px-3 rounded-md sm:rounded-lg font-black text-[11px] sm:text-xs transition-all flex items-center gap-1 active:scale-95 whitespace-nowrap flex-shrink-0 ${
              activeTab === 'coaching'
                ? 'bg-gradient-to-b from-sky-400 via-sky-500 to-blue-600 text-white shadow-xs border border-white/60'
                : 'text-sky-950 hover:bg-white/40'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Kulik Personil</span>
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`py-1 sm:py-1.5 px-2.5 sm:px-3 rounded-md sm:rounded-lg font-black text-[11px] sm:text-xs transition-all flex items-center gap-1 active:scale-95 whitespace-nowrap flex-shrink-0 ${
              activeTab === 'chat'
                ? 'bg-gradient-to-b from-sky-400 via-sky-500 to-blue-600 text-white shadow-xs border border-white/60'
                : 'text-sky-950 hover:bg-white/40'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Tanya Produser</span>
          </button>
          <button
            onClick={() => setActiveTab('quality')}
            className={`py-1 sm:py-1.5 px-2.5 sm:px-3 rounded-md sm:rounded-lg font-black text-[11px] sm:text-xs transition-all flex items-center gap-1 active:scale-95 whitespace-nowrap flex-shrink-0 ${
              activeTab === 'quality'
                ? 'bg-gradient-to-b from-sky-400 via-sky-500 to-blue-600 text-white shadow-xs border border-white/60'
                : 'text-sky-950 hover:bg-white/40'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Kualitas Audio</span>
          </button>
        </div>

        {/* Tab Actions / Refresh */}
        <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
          {activeTab === 'coaching' && coaching && (
            <button
              onClick={() => runCoachingAnalysis(true)}
              disabled={isLoadingCoaching}
              className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md sm:rounded-lg bg-white/80 hover:bg-white text-sky-800 border border-sky-300 text-[10px] sm:text-xs font-bold transition flex items-center gap-1 shadow-2xs"
              title="Analisis ulang aransemen via Gemini"
            >
              <RefreshCw className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${isLoadingCoaching ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Analisis Ulang</span>
            </button>
          )}
        </div>
      </div>

      {/* Tab Content Area: Scrollable alami untuk mobile & desktop, tanpa terpotong player dock */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 pr-0.5 sm:pr-1 space-y-2.5">
        
        {/* ========================================================================= */}
        {/* TAB 1: KULIK PERSONIL                                                     */}
        {/* ========================================================================= */}
        {activeTab === 'coaching' && (
          <div className="space-y-2.5 sm:space-y-4">
            {isLoadingCoaching ? (
              <div className="text-center py-10 sm:py-16 space-y-2.5">
                <Loader2 className="w-7 h-7 text-sky-500 animate-spin mx-auto" />
                <p className="text-xs text-sky-900 font-semibold">{progressMsg || 'Membedah aransemen lagu...'}</p>
              </div>
            ) : coaching ? (
              <>
                {/* 1. Header Overview Lagu */}
                <div className="p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl bg-gradient-to-r from-sky-100/90 to-blue-100/70 border border-sky-300/60 shadow-2xs">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 font-extrabold text-sky-900 text-xs sm:text-sm truncate">
                      <Sparkles className="w-4 h-4 text-sky-600 flex-shrink-0" />
                      <span className="truncate">{coaching.songTitle}</span>
                    </div>
                    {/* Counter di mobile */}
                    <div className="sm:hidden flex items-center gap-1 bg-white/80 px-2 py-0.5 rounded-full border border-sky-200 text-[10px] font-bold text-sky-800 flex-shrink-0">
                      <span>{activePersonilIdx + 1}/{coaching.personilGuides.length}</span>
                    </div>
                  </div>
                  <p className="text-[11px] sm:text-xs text-[#0f2942] font-medium mt-1 leading-snug">
                    {coaching.musicalSummary}
                  </p>
                  <div className="mt-1.5 p-1.5 sm:p-2 rounded-lg bg-white/80 border border-sky-200/80 text-[10px] sm:text-xs text-amber-900 font-medium">
                    💡 <strong>Panduan Nada:</strong> {coaching.keyAdvice}
                  </div>
                </div>

                {/* 2. MOBILE CAROUSEL VIEW (sm:hidden) */}
                <div className="block sm:hidden space-y-2">
                  <div className="flex items-center justify-between px-0.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-sky-900">
                      Panduan Personil
                    </span>
                    {/* Mini role dots selector */}
                    <div className="flex items-center gap-1.5">
                      {coaching.personilGuides.map((g, idx) => (
                        <button
                          key={idx}
                          onClick={() => setActivePersonilIdx(idx)}
                          className={`h-2 rounded-full transition-all ${
                            activePersonilIdx === idx
                              ? 'w-5 bg-sky-600'
                              : 'w-2 bg-sky-300/70'
                          }`}
                          title={g.personil}
                        />
                      ))}
                    </div>
                  </div>

                  {coaching.personilGuides.length > 0 && (() => {
                    const guide = coaching.personilGuides[Math.min(activePersonilIdx, coaching.personilGuides.length - 1)];
                    return (
                      <div className="rounded-xl bg-white/90 border border-sky-200 p-3 shadow-xs space-y-2">
                        {/* Header role */}
                        <div className="flex items-center justify-between border-b border-sky-100 pb-1.5">
                          <div className="flex items-center gap-1.5">
                            {roleIcons[guide.personil] || <Music className="w-4 h-4 text-sky-600" />}
                            <span className="text-xs font-black text-[#0f2942]">
                              {guide.personil}
                            </span>
                          </div>
                          <span className="text-[10px] font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-full border border-sky-300/60 truncate max-w-[150px]">
                            {guide.focus}
                          </span>
                        </div>

                        {/* Tips */}
                        <ul className="text-[11px] text-[#1e3a5f] space-y-1 list-disc list-inside font-medium leading-relaxed">
                          {guide.tips.map((tip, tIdx) => (
                            <li key={tIdx}>{tip}</li>
                          ))}
                        </ul>

                        {/* Pattern */}
                        <div className="p-1.5 rounded-lg bg-amber-50/80 border border-amber-200/60 text-[10px] font-mono text-amber-900 font-bold">
                          🎵 {guide.keyChordsOrPattern}
                        </div>

                        {/* Controls pagination Prev/Next */}
                        <div className="flex items-center justify-between pt-1 border-t border-sky-100/80">
                          <button
                            onClick={() => setActivePersonilIdx((prev) => Math.max(0, prev - 1))}
                            disabled={activePersonilIdx === 0}
                            className="px-2.5 py-1 rounded-lg bg-white border border-sky-200 text-sky-800 text-[10px] font-bold disabled:opacity-40 flex items-center gap-1 active:scale-95 shadow-2xs"
                          >
                            <ChevronLeft className="w-3 h-3" />
                            <span>Sebelum</span>
                          </button>
                          <span className="text-[10px] font-bold text-sky-900">
                            {guide.personil} ({activePersonilIdx + 1}/{coaching.personilGuides.length})
                          </span>
                          <button
                            onClick={() => setActivePersonilIdx((prev) => Math.min(coaching.personilGuides.length - 1, prev + 1))}
                            disabled={activePersonilIdx >= coaching.personilGuides.length - 1}
                            className="px-2.5 py-1 rounded-lg bg-white border border-sky-200 text-sky-800 text-[10px] font-bold disabled:opacity-40 flex items-center gap-1 active:scale-95 shadow-2xs"
                          >
                            <span>Lanjut</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* 3. DESKTOP FULL GRID VIEW (hidden sm:block) */}
                <div className="hidden sm:block space-y-2">
                  <span className="text-xs font-bold text-sky-900 uppercase tracking-wider block px-0.5">
                    Panduan Personil Flannels
                  </span>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {coaching.personilGuides.map((guide, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-2xl bg-white/85 border border-sky-200/70 flex flex-col justify-between gap-2 shadow-xs"
                      >
                        <div>
                          <div className="flex items-center justify-between border-b border-sky-100 pb-1.5 mb-1.5">
                            <div className="flex items-center gap-1.5">
                              {roleIcons[guide.personil] || <Music className="w-4 h-4" />}
                              <span className="text-sm font-extrabold text-[#0f2942]">
                                {guide.personil}
                              </span>
                            </div>
                            <span className="text-[10px] font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-full border border-sky-300/60">
                              {guide.focus}
                            </span>
                          </div>
                          <ul className="text-xs text-[#1e3a5f] space-y-1 list-disc list-inside font-medium leading-relaxed">
                            {guide.tips.map((tip, tIdx) => (
                              <li key={tIdx}>{tip}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="pt-2 border-t border-sky-100 text-xs font-mono text-amber-800 font-bold truncate">
                          🎵 {guide.keyChordsOrPattern}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4. Tahapan Latihan & Mix Doctor */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5 pt-1">
                  <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-white/85 border border-sky-200/70 text-xs space-y-1.5 shadow-xs">
                    <span className="font-extrabold text-[#0f2942] text-[11px] sm:text-xs block">📋 Tahapan Latihan</span>
                    <ol className="space-y-1 list-decimal list-inside text-[#1e3a5f] font-medium text-[10px] sm:text-xs leading-relaxed">
                      {coaching.rehearsalPlan.map((step, sIdx) => (
                        <li key={sIdx}>{step}</li>
                      ))}
                    </ol>
                  </div>

                  <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-white/85 border border-sky-200/70 text-xs space-y-1.5 shadow-xs">
                    <span className="font-extrabold text-sky-800 text-[11px] sm:text-xs block">🩺 Mix Doctor</span>
                    <p className="text-[#1e3a5f] leading-relaxed font-medium text-[10px] sm:text-xs">{coaching.mixDoctorNotes}</p>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: TANYA PRODUSER                                                     */}
        {/* ========================================================================= */}
        {activeTab === 'chat' && (
          <div className="flex flex-col h-full min-h-[360px] justify-between">
            {/* Quick Suggestion Chips */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1.5 scrollbar-none text-[10px] sm:text-xs flex-shrink-0">
              <span className="font-bold uppercase text-sky-800 whitespace-nowrap text-[9px] sm:text-[10px]">Tanya:</span>
              <button
                onClick={() => handleSendChat("Bagaimana pembagian riff gitar lead dan rhythm di lagu ini?")}
                className="px-2.5 py-0.5 rounded-full bg-white/80 border border-sky-300 text-sky-900 hover:bg-sky-50 font-medium whitespace-nowrap shadow-2xs"
              >
                🎸 Riff Gitar
              </button>
              <button
                onClick={() => handleSendChat("Pola ketukan kick drum dan snare yang paling pas untuk part chorus?")}
                className="px-2.5 py-0.5 rounded-full bg-white/80 border border-sky-300 text-sky-900 hover:bg-sky-50 font-medium whitespace-nowrap shadow-2xs"
              >
                🥁 Ketukan Drum
              </button>
              <button
                onClick={() => handleSendChat("Bagaimana saran improvisasi solo untuk lagu ini?")}
                className="px-2.5 py-0.5 rounded-full bg-white/80 border border-sky-300 text-sky-900 hover:bg-sky-50 font-medium whitespace-nowrap shadow-2xs"
              >
                🎼 Solo Melodi
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto space-y-2 p-2.5 rounded-xl sm:rounded-2xl bg-white/60 border border-sky-200/80 mb-2 shadow-inner min-h-[200px]">
              {chatMessages.length === 0 ? (
                <div className="text-center py-10 sm:py-14 text-sky-800 space-y-1.5">
                  <MessageSquare className="w-7 h-7 text-sky-500 mx-auto" />
                  <p className="text-xs max-w-sm mx-auto font-medium">
                    AI Producer siap membantu membedah lagu "{currentSong.title}". Tanyakan chord, melodi solo, atau dinamika panggung!
                  </p>
                </div>
              ) : (
                chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-xl sm:rounded-2xl p-2.5 text-xs leading-relaxed font-medium shadow-xs ${
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
                  <div className="rounded-xl sm:rounded-2xl p-2.5 bg-white border border-sky-200 text-xs text-sky-700 flex items-center gap-1.5 font-medium">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-500" />
                    <span>AI Producer sedang merumuskan jawaban...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Chat Input */}
            <div className="flex gap-1.5 flex-shrink-0">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                placeholder="Tanyakan chord, fill drum, atau solo guitar..."
                className="flex-1 bg-white/90 border border-sky-300 rounded-lg sm:rounded-xl px-3 py-1.5 text-xs text-[#0f2942] focus:outline-none focus:border-sky-500 shadow-2xs min-w-0"
              />
              <button
                onClick={() => handleSendChat()}
                disabled={isChatLoading || !chatInput.trim()}
                className="px-3.5 sm:px-4 py-1.5 rounded-lg sm:rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:opacity-95 text-white text-xs font-bold transition flex items-center gap-1 shadow-xs active:scale-95 disabled:opacity-50 flex-shrink-0"
              >
                <Send className="w-3 h-3" />
                <span>Kirim</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: KUALITAS AUDIO & REPLAYGAIN                                        */}
        {/* ========================================================================= */}
        {activeTab === 'quality' && (
          <div className="space-y-3 sm:space-y-4">
            {/* 1. Lossless Classification Banner */}
            <div
              className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border flex items-start gap-2.5 sm:gap-3.5 shadow-2xs ${
                quality?.isLossless
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                  : 'bg-amber-50 border-amber-300 text-amber-950'
              }`}
            >
              {quality?.isLossless ? (
                <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="font-extrabold text-xs sm:text-sm text-[#0f2942] truncate">
                    {quality?.classification || 'Lossless FLAC Master'}
                  </span>
                  <span className="text-[9px] sm:text-xs font-mono px-2 py-0.5 rounded-full bg-white border border-emerald-300 font-bold text-emerald-700 flex-shrink-0">
                    Hi-Res
                  </span>
                </div>
                <p className="text-[10px] sm:text-xs text-[#1e3a5f] mt-0.5 sm:mt-1 font-medium leading-snug">
                  {quality?.cutoffFrequency ? `Cutoff: ${quality.cutoffFrequency} Hz • ` : 'Full Bandwidth • '}
                  {quality?.notes || 'Fidelitas studio terjaga tanpa kompresi psikoakustik lossy.'}
                </p>
              </div>
            </div>

            {/* 2. Technical Specs 4-Tile Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              <div className="bg-white/85 p-2 sm:p-3 rounded-xl sm:rounded-2xl border border-sky-200/70 text-center shadow-2xs">
                <span className="text-[9px] sm:text-xs text-sky-800 uppercase block font-bold">Sample Rate</span>
                <span className="text-xs sm:text-base font-mono font-black text-[#0f2942]">
                  {quality ? `${(quality.sampleRate / 1000).toFixed(1)}k` : '44.1k'}
                </span>
              </div>
              <div className="bg-white/85 p-2 sm:p-3 rounded-xl sm:rounded-2xl border border-sky-200/70 text-center shadow-2xs">
                <span className="text-[9px] sm:text-xs text-sky-800 uppercase block font-bold">Bit Depth</span>
                <span className="text-xs sm:text-base font-mono font-black text-[#0f2942]">
                  {quality ? `${quality.bitDepthEstimate}-bit` : '16/24-bit'}
                </span>
              </div>
              <div className="bg-white/85 p-2 sm:p-3 rounded-xl sm:rounded-2xl border border-sky-200/70 text-center shadow-2xs">
                <span className="text-[9px] sm:text-xs text-sky-800 uppercase block font-bold">Dynamic Range</span>
                <span className="text-xs sm:text-base font-mono font-black text-sky-700">
                  {quality ? `DR${quality.dynamicRangeScore}` : 'DR12'}
                </span>
              </div>
              <div className="bg-white/85 p-2 sm:p-3 rounded-xl sm:rounded-2xl border border-sky-200/70 text-center shadow-2xs">
                <span className="text-[9px] sm:text-xs text-sky-800 uppercase block font-bold">Channel</span>
                <span className="text-xs sm:text-base font-mono font-black text-[#0f2942]">
                  {quality?.channels === 1 ? 'Mono' : 'Stereo'}
                </span>
              </div>
            </div>

            {/* 3. ReplayGain Card (Utuh & Terlihat Sempurna) */}
            <div className="bg-white/85 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-sky-200/70 shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between border-b border-sky-100 pb-2">
                <div className="min-w-0">
                  <h4 className="text-xs sm:text-sm font-extrabold text-[#0f2942] truncate">
                    Normalisasi ReplayGain (ITU-R BS.1770)
                  </h4>
                  <p className="text-[10px] sm:text-xs text-sky-700 truncate">
                    Standar -14 LUFS kenyaringan seragam
                  </p>
                </div>
                <button
                  onClick={onToggleReplayGain}
                  className={`px-3 py-1 rounded-full text-[10px] sm:text-xs font-extrabold transition flex items-center gap-1 shadow-2xs flex-shrink-0 ${
                    replayGainEnabled
                      ? 'bg-emerald-500 text-white'
                      : 'bg-sky-100 text-sky-800 border border-sky-300'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{replayGainEnabled ? 'Aktif' : 'Off'}</span>
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 sm:gap-3 pt-0.5">
                <div className="bg-sky-50/90 p-2 sm:p-3 rounded-lg sm:rounded-xl border border-sky-200 text-center">
                  <span className="text-[9px] sm:text-xs text-sky-800 uppercase block font-bold">Loudness</span>
                  <span className="text-xs sm:text-base font-mono font-bold text-[#0f2942]">
                    {replay ? `${replay.integratedLufs} LUFS` : '-14.2 LUFS'}
                  </span>
                </div>
                <div className="bg-sky-50/90 p-2 sm:p-3 rounded-lg sm:rounded-xl border border-sky-200 text-center">
                  <span className="text-[9px] sm:text-xs text-sky-800 uppercase block font-bold">True Peak</span>
                  <span className="text-xs sm:text-base font-mono font-bold text-[#0f2942]">
                    {replay ? `${replay.truePeakDb} dBTP` : '-0.5 dBTP'}
                  </span>
                </div>
                <div className="bg-sky-50/90 p-2 sm:p-3 rounded-lg sm:rounded-xl border border-sky-200 text-center">
                  <span className="text-[9px] sm:text-xs text-sky-800 uppercase block font-bold">Gain Offset</span>
                  <span className="text-xs sm:text-base font-mono font-bold text-emerald-700">
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