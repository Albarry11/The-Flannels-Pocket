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
    <div className="flex flex-col h-full max-w-5xl mx-auto w-full aero-glass rounded-xl sm:rounded-2xl p-1.5 sm:p-4 shadow-lg min-h-0">
      {/* Top Header Tilikan - Integrated Vista Tab Switcher as Header Title */}
      <div className="flex items-center justify-between border-b border-sky-200/50 pb-1.5 sm:pb-2 mb-1.5 sm:mb-2.5 gap-1.5 min-w-0">
        <div className="flex items-center p-0.5 rounded-lg sm:rounded-xl bg-white/50 border border-white/70 shadow-2xs backdrop-blur-md overflow-x-auto scrollbar-none flex-1 min-w-0">
          <button
            onClick={() => setActiveTab('coaching')}
            className={`py-1 sm:py-1.5 px-2 sm:px-3 rounded-md sm:rounded-lg font-black text-[10px] sm:text-xs transition-all flex items-center gap-1 active:scale-95 whitespace-nowrap flex-shrink-0 ${
              activeTab === 'coaching'
                ? 'bg-gradient-to-b from-sky-400 via-sky-500 to-blue-600 text-white shadow-xs border border-white/60'
                : 'text-sky-950 hover:bg-white/40'
            }`}
          >
            <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
            <span>Kulik Personil</span>
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`py-1 sm:py-1.5 px-2 sm:px-3 rounded-md sm:rounded-lg font-black text-[10px] sm:text-xs transition-all flex items-center gap-1 active:scale-95 whitespace-nowrap flex-shrink-0 ${
              activeTab === 'chat'
                ? 'bg-gradient-to-b from-sky-400 via-sky-500 to-blue-600 text-white shadow-xs border border-white/60'
                : 'text-sky-950 hover:bg-white/40'
            }`}
          >
            <MessageSquare className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
            <span>Tanya Produser</span>
          </button>
          <button
            onClick={() => setActiveTab('quality')}
            className={`py-1 sm:py-1.5 px-2 sm:px-3 rounded-md sm:rounded-lg font-black text-[10px] sm:text-xs transition-all flex items-center gap-1 active:scale-95 whitespace-nowrap flex-shrink-0 ${
              activeTab === 'quality'
                ? 'bg-gradient-to-b from-sky-400 via-sky-500 to-blue-600 text-white shadow-xs border border-white/60'
                : 'text-sky-950 hover:bg-white/40'
            }`}
          >
            <ShieldCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
            <span>Kualitas Audio</span>
          </button>
        </div>

        {/* Tab Actions / Refresh */}
        <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
          {activeTab === 'coaching' && coaching && (
            <button
              onClick={() => runCoachingAnalysis(true)}
              disabled={isLoadingCoaching}
              className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-md sm:rounded-lg bg-white/80 hover:bg-white text-sky-800 border border-sky-300 text-[9px] sm:text-xs font-bold transition flex items-center gap-1 shadow-2xs"
              title="Analisis ulang aransemen via Gemini"
            >
              <RefreshCw className={`w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 ${isLoadingCoaching ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Analisis Ulang</span>
            </button>
          )}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        
        {/* TAB 1: KULIK PERSONIL (Swipe Carousel - No Page Scroll) */}
        {activeTab === 'coaching' && (
          <div className="flex-1 flex flex-col min-h-0 justify-between gap-1.5 sm:gap-2.5 overflow-hidden">
            {isLoadingCoaching ? (
              <div className="flex-1 flex flex-col items-center justify-center space-y-2">
                <Loader2 className="w-7 h-7 text-sky-500 animate-spin" />
                <p className="text-xs text-sky-900 font-semibold">{progressMsg || 'Membedah aransemen lagu...'}</p>
              </div>
            ) : coaching ? (
              <>
                {/* Compact Musical Overview */}
                <div className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-gradient-to-r from-sky-100/90 to-blue-100/70 border border-sky-300/60 shadow-2xs flex items-center justify-between gap-2 flex-shrink-0">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 font-extrabold text-sky-900 text-xs sm:text-sm truncate">
                      <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-600 flex-shrink-0" />
                      <span className="truncate">{coaching.songTitle}</span>
                    </div>
                    <p className="text-[10px] sm:text-xs text-[#0f2942] truncate font-medium mt-0.5 sm:mt-1">
                      💡 {coaching.keyAdvice} • {coaching.musicalSummary}
                    </p>
                  </div>
                  {/* Indicator Dot Pill */}
                  <div className="flex items-center gap-1 bg-white/70 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full border border-sky-200 flex-shrink-0">
                    <span className="text-[10px] sm:text-xs font-bold text-sky-800">
                      {activePersonilIdx + 1}/{coaching.personilGuides.length}
                    </span>
                  </div>
                </div>

                {/* Swipable Personil Cards View */}
                <div
                  className="flex-1 flex flex-col min-h-0 relative touch-pan-y select-none"
                  onTouchStart={(e) => {
                    const touch = e.touches[0];
                    (e.currentTarget as any)._touchStartX = touch.clientX;
                  }}
                  onTouchEnd={(e) => {
                    const startX = (e.currentTarget as any)._touchStartX;
                    if (startX === undefined) return;
                    const endX = e.changedTouches[0].clientX;
                    const diff = startX - endX;
                    if (diff > 40) {
                      setActivePersonilIdx((prev) => Math.min(coaching.personilGuides.length - 1, prev + 1));
                    } else if (diff < -40) {
                      setActivePersonilIdx((prev) => Math.max(0, prev - 1));
                    }
                  }}
                >
                  {coaching.personilGuides.length > 0 && (() => {
                    const guide = coaching.personilGuides[Math.min(activePersonilIdx, coaching.personilGuides.length - 1)];
                    return (
                      <div className="flex-1 rounded-xl sm:rounded-2xl bg-white/90 border border-sky-200 p-2.5 sm:p-4 shadow-xs flex flex-col min-h-0 overflow-hidden">
                        {/* Header Personil */}
                        <div className="flex items-center justify-between border-b border-sky-100 pb-1.5 sm:pb-2.5 flex-shrink-0">
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            {roleIcons[guide.personil] || <Music className="w-4 h-4 sm:w-5 sm:h-5 text-sky-600" />}
                            <span className="text-xs sm:text-base font-extrabold text-[#0f2942]">
                              {guide.personil}
                            </span>
                          </div>
                          <span className="text-[9px] sm:text-xs font-bold text-sky-700 bg-sky-100 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full border border-sky-300/60 truncate max-w-[140px] sm:max-w-none">
                            {guide.focus}
                          </span>
                        </div>

                        {/* Tips List - Scrollable if content overflows */}
                        <div className="flex-1 my-1.5 sm:my-3 overflow-y-auto scrollbar-none pr-0.5 flex flex-col justify-center min-h-0">
                          <ul className="text-[11px] sm:text-sm text-[#1e3a5f] space-y-1 sm:space-y-2 list-disc list-inside font-medium leading-snug">
                            {guide.tips.map((tip, tIdx) => (
                              <li key={tIdx} className="leading-tight sm:leading-normal">{tip}</li>
                            ))}
                          </ul>
                        </div>

                        {/* Chord / Pattern Footer */}
                        <div className="pt-1.5 sm:pt-2.5 border-t border-sky-100 text-[10px] sm:text-xs font-mono text-amber-800 font-bold truncate flex-shrink-0 bg-amber-50/60 -mx-2.5 -mb-2.5 sm:-mx-4 sm:-mb-4 px-2.5 sm:px-4 py-1.5 sm:py-2.5 rounded-b-xl sm:rounded-b-2xl border-t border-amber-200/50">
                          🎵 {guide.keyChordsOrPattern}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Navigation Arrows for Swipe */}
                  <div className="flex items-center justify-between pt-1 sm:pt-2 flex-shrink-0">
                    <button
                      onClick={() => setActivePersonilIdx((prev) => Math.max(0, prev - 1))}
                      disabled={activePersonilIdx === 0}
                      className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-white/80 border border-sky-200 text-sky-800 text-[10px] sm:text-xs font-bold disabled:opacity-40 flex items-center gap-0.5 sm:gap-1 active:scale-95 shadow-2xs"
                    >
                      <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span>Sebelum</span>
                    </button>
                    {/* Role tabs mini carousel */}
                    <div className="flex items-center gap-1.5 overflow-x-auto max-w-[200px] sm:max-w-xs scrollbar-none px-1">
                      {coaching.personilGuides.map((g, idx) => (
                        <button
                          key={idx}
                          onClick={() => setActivePersonilIdx(idx)}
                          className={`h-2 sm:h-2.5 rounded-full transition-all ${
                            activePersonilIdx === idx
                              ? 'w-4 sm:w-6 bg-sky-600'
                              : 'w-2 sm:w-2.5 bg-sky-200 hover:bg-sky-300'
                          }`}
                          title={g.personil}
                        />
                      ))}
                    </div>
                    <button
                      onClick={() => setActivePersonilIdx((prev) => Math.min(coaching.personilGuides.length - 1, prev + 1))}
                      disabled={activePersonilIdx >= coaching.personilGuides.length - 1}
                      className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-white/80 border border-sky-200 text-sky-800 text-[10px] sm:text-xs font-bold disabled:opacity-40 flex items-center gap-0.5 sm:gap-1 active:scale-95 shadow-2xs"
                    >
                      <span>Lanjut</span>
                      <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
                    </button>
                  </div>
                </div>

                {/* Rehearsal & Mix Doctor Mini Strip */}
                <div className="grid grid-cols-2 gap-1.5 sm:gap-3 pt-0.5 sm:pt-1 flex-shrink-0 text-[10px] sm:text-xs">
                  <div className="p-1.5 sm:p-2.5 rounded-lg sm:rounded-xl bg-white/80 border border-sky-200/80 truncate">
                    <span className="font-bold text-[#0f2942] block truncate">📋 Latihan</span>
                    <span className="text-[#1e3a5f] truncate block">{coaching.rehearsalPlan[0] || 'Sinkronisasi intro'}</span>
                  </div>
                  <div className="p-1.5 sm:p-2.5 rounded-lg sm:rounded-xl bg-white/80 border border-sky-200/80 truncate">
                    <span className="font-bold text-sky-800 block truncate">🩺 Mix Doctor</span>
                    <span className="text-[#1e3a5f] truncate block">{coaching.mixDoctorNotes}</span>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        )}

        {/* TAB 2: TANYA PRODUSER (Compact & Non-Scrollable) */}
        {activeTab === 'chat' && (
          <div className="flex-1 flex flex-col min-h-0 justify-between gap-1.5 overflow-hidden">
            {/* Quick Suggestion Chips */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none text-[10px] flex-shrink-0">
              <span className="font-bold uppercase text-sky-800 whitespace-nowrap text-[9px]">Tanya:</span>
              <button
                onClick={() => handleSendChat("Bagaimana pembagian riff gitar lead dan rhythm di lagu ini?")}
                className="px-2 py-0.5 rounded-full bg-white/80 border border-sky-300 text-sky-900 hover:bg-sky-50 font-medium whitespace-nowrap shadow-2xs"
              >
                🎸 Riff
              </button>
              <button
                onClick={() => handleSendChat("Pola ketukan kick drum dan snare yang paling pas untuk part chorus?")}
                className="px-2 py-0.5 rounded-full bg-white/80 border border-sky-300 text-sky-900 hover:bg-sky-50 font-medium whitespace-nowrap shadow-2xs"
              >
                🥁 Drum
              </button>
              <button
                onClick={() => handleSendChat("Bagaimana saran improvisasi solo untuk lagu ini?")}
                className="px-2 py-0.5 rounded-full bg-white/80 border border-sky-300 text-sky-900 hover:bg-sky-50 font-medium whitespace-nowrap shadow-2xs"
              >
                🎼 Solo
              </button>
            </div>

            {/* Compact Latest Chat Answer */}
            <div className="flex-1 rounded-xl sm:rounded-2xl bg-white/70 border border-sky-200/80 p-2.5 sm:p-3 shadow-inner flex flex-col justify-between min-h-0 overflow-hidden">
              {chatMessages.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center text-sky-800 space-y-1">
                  <MessageSquare className="w-6 h-6 text-sky-500" />
                  <p className="text-[11px] font-semibold text-[#0f2942]">AI Music Producer Siap</p>
                  <p className="text-[10px] text-sky-700 max-w-xs">
                    Tanya cepat tentang riff, ketukan drum, chord, atau dinamika panggung lagu ini.
                  </p>
                </div>
              ) : (
                <div className="flex-1 flex flex-col justify-center min-h-0 overflow-hidden space-y-1.5">
                  {/* Latest User Question */}
                  {chatMessages.filter(m => m.sender === 'user').slice(-1).map((m, idx) => (
                    <div key={idx} className="flex justify-end">
                      <span className="bg-sky-600 text-white text-[10px] sm:text-[11px] font-medium px-2.5 py-1 rounded-xl rounded-tr-none truncate max-w-[90%] shadow-2xs">
                        {m.text}
                      </span>
                    </div>
                  ))}
                  {/* Latest AI Answer */}
                  {chatMessages.filter(m => m.sender === 'ai').slice(-1).map((m, idx) => (
                    <div key={idx} className="flex justify-start flex-1 min-h-0 overflow-hidden">
                      <div className="bg-white text-[#0f2942] border border-sky-200 text-[11px] sm:text-xs font-medium p-2.5 rounded-xl rounded-tl-none shadow-xs w-full flex-1 overflow-y-auto leading-relaxed">
                        {m.text}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {isChatLoading && (
                <div className="flex items-center gap-1.5 text-[10px] text-sky-700 font-bold bg-white/90 p-1.5 rounded-lg border border-sky-200 mt-1 flex-shrink-0">
                  <Loader2 className="w-3 h-3 animate-spin text-sky-500" />
                  <span>Produser merumuskan ringkasan...</span>
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
                placeholder="Tanya riff, fill drum, solo..."
                className="flex-1 bg-white/90 border border-sky-300 rounded-lg px-2.5 py-1 text-xs text-[#0f2942] focus:outline-none focus:border-sky-500 shadow-2xs min-w-0"
              />
              <button
                onClick={() => handleSendChat()}
                disabled={isChatLoading || !chatInput.trim()}
                className="px-3 py-1 rounded-lg bg-gradient-to-r from-sky-500 to-blue-600 hover:opacity-95 text-white text-xs font-bold transition flex items-center gap-1 shadow-xs active:scale-95 disabled:opacity-50 flex-shrink-0"
              >
                <Send className="w-3 h-3" />
                <span>Kirim</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: KUALITAS AUDIO & REPLAYGAIN (Compact & Non-Scrollable) */}
        {activeTab === 'quality' && (
          <div className="flex-1 flex flex-col min-h-0 justify-between gap-1.5 sm:gap-3 overflow-hidden">
            {/* Lossless Classification Banner */}
            <div
              className={`p-2 sm:p-3 rounded-xl sm:rounded-2xl border flex items-center justify-between gap-2 shadow-2xs flex-shrink-0 ${
                quality?.isLossless
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                  : 'bg-amber-50 border-amber-300 text-amber-950'
              }`}
            >
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                {quality?.isLossless ? (
                  <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 flex-shrink-0" />
                )}
                <div className="min-w-0">
                  <span className="font-extrabold text-xs sm:text-sm text-[#0f2942] block truncate">
                    {quality?.classification || 'Lossless FLAC Master'}
                  </span>
                  <p className="text-[10px] sm:text-xs text-[#1e3a5f] truncate font-medium">
                    {quality?.cutoffFrequency ? `Cutoff: ${quality.cutoffFrequency} Hz` : 'Full Bandwidth (>20kHz)'}
                  </p>
                </div>
              </div>
              <span className="text-[9px] sm:text-xs font-mono px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-white border border-emerald-300 font-bold text-emerald-700 flex-shrink-0">
                Hi-Res
              </span>
            </div>

            {/* Technical Specs 4-Tile Strip */}
            <div className="grid grid-cols-4 gap-1.5 sm:gap-3 flex-shrink-0">
              <div className="bg-white/80 p-1.5 sm:p-3 rounded-xl sm:rounded-2xl border border-sky-200/70 text-center shadow-2xs">
                <span className="text-[9px] sm:text-xs text-sky-800 uppercase block font-bold">Sample</span>
                <span className="text-xs sm:text-base font-mono font-black text-[#0f2942]">
                  {quality ? `${(quality.sampleRate / 1000).toFixed(1)}k` : '44.1k'}
                </span>
              </div>
              <div className="bg-white/80 p-1.5 sm:p-3 rounded-xl sm:rounded-2xl border border-sky-200/70 text-center shadow-2xs">
                <span className="text-[9px] sm:text-xs text-sky-800 uppercase block font-bold">Bit</span>
                <span className="text-xs sm:text-base font-mono font-black text-[#0f2942]">
                  {quality ? `${quality.bitDepthEstimate}-bit` : '16/24-bit'}
                </span>
              </div>
              <div className="bg-white/80 p-1.5 sm:p-3 rounded-xl sm:rounded-2xl border border-sky-200/70 text-center shadow-2xs">
                <span className="text-[9px] sm:text-xs text-sky-800 uppercase block font-bold">Dynamic</span>
                <span className="text-xs sm:text-base font-mono font-black text-sky-700">
                  {quality ? `DR${quality.dynamicRangeScore}` : 'DR12'}
                </span>
              </div>
              <div className="bg-white/80 p-1.5 sm:p-3 rounded-xl sm:rounded-2xl border border-sky-200/70 text-center shadow-2xs">
                <span className="text-[9px] sm:text-xs text-sky-800 uppercase block font-bold">Channel</span>
                <span className="text-xs sm:text-base font-mono font-black text-[#0f2942]">
                  {quality?.channels === 1 ? 'Mono' : 'Stereo'}
                </span>
              </div>
            </div>

            {/* ReplayGain Compact Card */}
            <div className="bg-white/85 p-2 sm:p-3.5 rounded-xl sm:rounded-2xl border border-sky-200/70 shadow-2xs flex-1 flex flex-col justify-between min-h-0">
              <div className="flex items-center justify-between border-b border-sky-100 pb-1 sm:pb-2 flex-shrink-0">
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
                  className={`px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-extrabold transition flex items-center gap-1 shadow-2xs flex-shrink-0 ${
                    replayGainEnabled
                      ? 'bg-emerald-500 text-white'
                      : 'bg-sky-100 text-sky-800 border border-sky-300'
                  }`}
                >
                  <ShieldCheck className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>{replayGainEnabled ? 'Aktif' : 'Off'}</span>
                </button>
              </div>

              <div className="grid grid-cols-3 gap-1.5 sm:gap-3 pt-1.5 sm:pt-3 flex-1 items-center">
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
