import React from 'react';
import type { Song } from '../types';
import { Music, Activity, FileText, Folder, Radio, RotateCcw } from 'lucide-react';

interface HeaderProps {
  currentSong: Song | null;
  metronomeActive: boolean;
  onToggleMetronome: () => void;
  onOpenAnalyzer: () => void;
  onOpenLyrics: () => void;
  onOpenFileManager: () => void;
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
  onResetAllStems,
  onSoloVocalOnly,
  onSoloRhythmSection,
}) => {
  return (
    <header className="border-b border-flannel-border bg-flannel-card/90 backdrop-blur-md sticky top-0 z-40 px-4 py-3 sm:px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Left: Brand & Song Info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Music className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                  Band Rehearsal DAW
                </span>
                <span className="text-xs text-slate-400 hidden sm:inline">The Flannels Pocket</span>
              </div>
              <h1 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                {currentSong ? currentSong.title : 'No Song Loaded'}
                {currentSong && (
                  <span className="text-xs font-normal text-slate-400">
                    by {currentSong.artist}
                  </span>
                )}
              </h1>
            </div>
          </div>

          {/* Song Badges on Mobile */}
          {currentSong && (
            <div className="flex items-center gap-1.5 md:hidden">
              <span className="px-2 py-1 text-xs font-mono font-semibold bg-flannel-panel border border-flannel-border rounded text-indigo-300">
                {currentSong.bpm} BPM
              </span>
              <span className="px-2 py-1 text-xs font-mono font-semibold bg-flannel-panel border border-flannel-border rounded text-amber-300">
                {currentSong.originalKey}
              </span>
            </div>
          )}
        </div>

        {/* Center: Band Role Quick Shortcuts */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none text-xs">
          <span className="text-slate-500 font-medium text-[11px] uppercase tracking-wider mr-1 hidden lg:inline">
            Quick Kulik:
          </span>
          <button
            onClick={onSoloVocalOnly}
            title="Solo vokal untuk latihan bernyanyi"
            className="px-2.5 py-1.5 rounded-lg bg-flannel-vocal/10 text-flannel-vocal border border-flannel-vocal/30 hover:bg-flannel-vocal/20 transition flex items-center gap-1.5 whitespace-nowrap font-medium"
          >
            🎤 Vokal Solo
          </button>
          <button
            onClick={onSoloRhythmSection}
            title="Solo Bass + Drums untuk latihan ritme section"
            className="px-2.5 py-1.5 rounded-lg bg-flannel-bass/10 text-flannel-bass border border-flannel-bass/30 hover:bg-flannel-bass/20 transition flex items-center gap-1.5 whitespace-nowrap font-medium"
          >
            🥁 Bass + Drums
          </button>
          <button
            onClick={onResetAllStems}
            title="Reset semua mute dan solo"
            className="px-2 py-1.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 transition flex items-center gap-1 whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Unmute All
          </button>
        </div>

        {/* Right: Feature Modals Trigger */}
        <div className="flex items-center gap-2 justify-end">
          {/* Metronome Toggle */}
          <button
            onClick={onToggleMetronome}
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition shadow-sm ${
              metronomeActive
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 animate-pulse'
                : 'bg-flannel-panel text-slate-300 border-flannel-border hover:border-slate-600'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Metronome</span>
          </button>

          {/* Audio Analyzer (SpotiFLAC features) */}
          <button
            onClick={onOpenAnalyzer}
            className="px-3 py-1.5 rounded-lg bg-flannel-panel border border-flannel-border text-slate-200 hover:text-indigo-300 hover:border-indigo-500/50 text-xs font-medium flex items-center gap-1.5 transition"
            title="Penganalisis Kualitas Audio, BPM, Key, & ReplayGain"
          >
            <Activity className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Penganalisis</span>
          </button>

          {/* Lyrics & Chords */}
          <button
            onClick={onOpenLyrics}
            className="px-3 py-1.5 rounded-lg bg-flannel-panel border border-flannel-border text-slate-200 hover:text-pink-300 hover:border-pink-500/50 text-xs font-medium flex items-center gap-1.5 transition"
            title="Manajer Lirik & Chord Sheet"
          >
            <FileText className="w-3.5 h-3.5 text-pink-400" />
            <span className="hidden sm:inline">Lirik & Chord</span>
          </button>

          {/* File & Song Manager */}
          <button
            onClick={onOpenFileManager}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-md shadow-indigo-600/20"
            title="Manajer Lagu & Unggah Stem FLAC"
          >
            <Folder className="w-3.5 h-3.5" />
            <span>Lagu</span>
          </button>
        </div>
      </div>
    </header>
  );
};
