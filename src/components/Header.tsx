import React from 'react';
import type { Song } from '../types';
import { Music, Activity, FileText, Folder, Radio, RotateCcw, Brain, Cloud } from 'lucide-react';

interface HeaderProps {
  currentSong: Song | null;
  metronomeActive: boolean;
  onToggleMetronome: () => void;
  onOpenAnalyzer: () => void;
  onOpenLyrics: () => void;
  onOpenFileManager: () => void;
  onOpenAIBrain: () => void;
  onOpenCloudSync: () => void;
  onResetAllStems: () => void;
  onSoloVocalOnly: () => void;
  onSoloRhythmSection: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentSong,
  metronomeActive,
  onToggleMetronome,
  onOpenAnalyzer,
  onOpenLyrics,
  onOpenFileManager,
  onOpenAIBrain,
  onOpenCloudSync,
  onResetAllStems,
  onSoloVocalOnly,
  onSoloRhythmSection,
}) => {
  return (
    <header className="border-b border-cyan-500/25 bg-gradient-to-b from-[#0a1529]/95 via-[#071020]/90 to-[#040813]/95 backdrop-blur-xl sticky top-0 z-40 px-3 py-2.5 sm:px-6 shadow-xl">
      {/* Top glass specular highlight */}
      <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent pointer-events-none" />

      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        
        {/* Left: Brand & Song Info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-400 via-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-200/40 relative overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-1/2 bg-white/30 rounded-t-2xl pointer-events-none" />
              <Music className="w-5 h-5 text-white relative z-10" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded-full border border-cyan-400/30 shadow-sm">
                  Frutiger Aero Rehearsal DAW
                </span>
                <span className="text-xs text-slate-400 hidden sm:inline font-medium">The Flannels Pocket</span>
              </div>
              <h1 className="text-base sm:text-lg font-extrabold text-white tracking-tight flex items-center gap-2">
                {currentSong ? currentSong.title : 'Belum Ada Lagu'}
                {currentSong && (
                  <span className="text-xs font-normal text-cyan-300/80">
                    by {currentSong.artist}
                  </span>
                )}
              </h1>
            </div>
          </div>

          {/* Song Badges on Mobile */}
          {currentSong && (
            <div className="flex items-center gap-1.5 md:hidden">
              <span className="px-2 py-0.5 text-xs font-mono font-bold bg-[#0c1a30] border border-cyan-500/40 rounded-lg text-cyan-300">
                {currentSong.bpm} BPM
              </span>
              <span className="px-2 py-0.5 text-xs font-mono font-bold bg-[#0c1a30] border border-amber-500/40 rounded-lg text-amber-300">
                {currentSong.originalKey}
              </span>
            </div>
          )}
        </div>

        {/* Center: Band Role Quick Shortcuts (Seamless - No Playback Restart) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none text-xs">
          <span className="text-cyan-400/70 font-bold text-[11px] uppercase tracking-wider mr-1 hidden lg:inline">
            Quick Kulik:
          </span>
          <button
            onClick={onSoloVocalOnly}
            title="Solo Vokal instan tanpa mematikan lagu"
            className="px-3 py-1.5 rounded-xl bg-rose-500/15 text-rose-300 border border-rose-500/40 hover:bg-rose-500/25 active:scale-95 transition flex items-center gap-1.5 whitespace-nowrap font-bold shadow-sm"
          >
            🎤 Vokal Solo
          </button>
          <button
            onClick={onSoloRhythmSection}
            title="Solo Bass + Drums instan tanpa mematikan lagu"
            className="px-3 py-1.5 rounded-xl bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/25 active:scale-95 transition flex items-center gap-1.5 whitespace-nowrap font-bold shadow-sm"
          >
            🥁 Bass + Drums
          </button>
          <button
            onClick={onResetAllStems}
            title="Buka semua instrumen (Unmute/Unsolo All)"
            className="px-2.5 py-1.5 rounded-xl bg-slate-800/90 text-slate-300 border border-slate-700 hover:bg-slate-700 transition flex items-center gap-1 whitespace-nowrap font-medium"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Semua</span>
          </button>
        </div>

        {/* Right: Feature Modals Trigger */}
        <div className="flex items-center gap-1.5 sm:gap-2 justify-end flex-wrap">
          {/* Metronome Toggle */}
          <button
            onClick={onToggleMetronome}
            className={`px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition shadow-sm ${
              metronomeActive
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                : 'bg-[#0a1529] text-slate-300 border-cyan-500/25 hover:border-cyan-400/50'
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-amber-400" />
            <span>Metronome</span>
          </button>

          {/* AI Brain Button (9router) */}
          <button
            onClick={onOpenAIBrain}
            className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600/30 via-indigo-600/30 to-purple-600/30 border border-cyan-400/50 text-cyan-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition shadow-md shadow-cyan-500/20 active:scale-95"
            title="Otak Cerdas Musik & 9router AI Producer"
          >
            <Brain className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span className="hidden sm:inline">AI Brain</span>
          </button>

          {/* Cloud Sync Button */}
          <button
            onClick={onOpenCloudSync}
            className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#0a1529] border border-cyan-500/25 text-slate-200 hover:text-cyan-300 hover:border-cyan-400/50 text-xs font-bold flex items-center gap-1.5 transition"
            title="Database Cloud Supabase & Sinkronisasi"
          >
            <Cloud className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">Cloud DB</span>
          </button>

          {/* Audio Analyzer (SpotiFLAC) */}
          <button
            onClick={onOpenAnalyzer}
            className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#0a1529] border border-cyan-500/25 text-slate-200 hover:text-cyan-300 hover:border-cyan-400/50 text-xs font-medium flex items-center gap-1.5 transition"
            title="Penganalisis Kualitas Audio & SpotiFLAC Inspector"
          >
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Penganalisis</span>
          </button>

          {/* Lyrics & Chords */}
          <button
            onClick={onOpenLyrics}
            className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#0a1529] border border-cyan-500/25 text-slate-200 hover:text-pink-300 hover:border-pink-500/40 text-xs font-medium flex items-center gap-1.5 transition"
            title="Lirik Sinkron & Akord Transpose"
          >
            <FileText className="w-3.5 h-3.5 text-pink-400" />
            <span className="hidden sm:inline">Lirik</span>
          </button>

          {/* File Manager */}
          <button
            onClick={onOpenFileManager}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 text-white text-xs font-extrabold flex items-center gap-1.5 transition shadow-lg shadow-cyan-500/30 active:scale-95"
            title="Manajer File Lagu"
          >
            <Folder className="w-3.5 h-3.5" />
            <span>Lagu</span>
          </button>
        </div>
      </div>
    </header>
  );
};
