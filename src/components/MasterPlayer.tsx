import React from 'react';
import { Play, Pause, Square, Volume2, VolumeX, Repeat, Gauge, Music2, ShieldCheck, Timer, Radio, Plus, Minus } from 'lucide-react';
import { formatSecondsToTime, transposeChord } from '../services/lyricsManager';
import type { LoopRegion, Song } from '../types';

interface MasterPlayerProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  speed: number;
  pitchSemitones: number;
  masterVolume: number;
  loopRegion: LoopRegion;
  replayGainEnabled: boolean;
  currentSong: Song | null;
  countInActive: boolean;
  countInBeat: number;
  metronomeClickActive: boolean;
  metronomeBpm: number;
  onPlay: () => void;
  onPlayWithCountIn: () => void;
  onPause: () => void;
  onStop: () => void;
  onSeek: (time: number) => void;
  onSpeedChange: (speed: number) => void;
  onPitchChange: (semitones: number) => void;
  onMasterVolumeChange: (vol: number) => void;
  onToggleLoop: () => void;
  onSetLoopStart: () => void;
  onSetLoopEnd: () => void;
  onClearLoop: () => void;
  onToggleReplayGain: () => void;
  onToggleMetronomeClick: () => void;
  onMetronomeBpmChange: (bpm: number) => void;
}

export const MasterPlayer: React.FC<MasterPlayerProps> = ({
  isPlaying,
  currentTime,
  duration,
  speed,
  pitchSemitones,
  masterVolume,
  loopRegion,
  replayGainEnabled,
  currentSong,
  countInActive,
  countInBeat,
  metronomeClickActive,
  metronomeBpm,
  onPlay,
  onPlayWithCountIn,
  onPause,
  onStop,
  onSeek,
  onSpeedChange,
  onPitchChange,
  onMasterVolumeChange,
  onToggleLoop,
  onSetLoopStart,
  onSetLoopEnd,
  onClearLoop,
  onToggleReplayGain,
  onToggleMetronomeClick,
  onMetronomeBpmChange,
}) => {
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const loopStartPercent = duration > 0 ? (loopRegion.start / duration) * 100 : 0;
  const loopEndPercent = duration > 0 ? (loopRegion.end / duration) * 100 : 100;

  const currentKeyTransposed = currentSong
    ? transposeChord(currentSong.originalKey, pitchSemitones)
    : '';

  const replayGainDb = currentSong?.replayGain?.recommendedGainDb ?? 0;

  return (
    <div className="fixed bottom-3 inset-x-2 sm:inset-x-6 md:inset-x-8 max-w-7xl mx-auto rounded-3xl sm:rounded-full bg-[#030914]/85 backdrop-blur-3xl border border-white/20 shadow-[0_16px_50px_rgba(0,0,0,0.8)] p-2.5 sm:p-3.5 z-40">
      {/* Top Specular Glass Highlight */}
      <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none rounded-t-full" />

      <div className="flex flex-col gap-2">
        {/* Seekbar and Timeline */}
        <div className="flex flex-col gap-0.5 px-2">
          <div className="relative w-full flex items-center group">
            {/* Glass Track Background */}
            <div className="w-full h-2 bg-[#061224] rounded-full overflow-hidden relative cursor-pointer border border-cyan-500/20 shadow-inner">
              {/* Loop Region Highlight */}
              {loopRegion.enabled && (
                <div
                  className="absolute top-0 bottom-0 bg-amber-400/40 border-x-2 border-amber-400/80 z-10"
                  style={{
                    left: `${loopStartPercent}%`,
                    width: `${Math.max(0, loopEndPercent - loopStartPercent)}%`,
                  }}
                />
              )}
              {/* Progress Fill with Futuristic Aero Cyan Gradient */}
              <div
                className="h-full bg-gradient-to-r from-cyan-400 via-sky-500 to-blue-500 rounded-full transition-all duration-75 relative"
                style={{ width: `${progressPercent}%` }}
              >
                <div className="absolute right-0 top-0 bottom-0 w-2 bg-white rounded-full shadow-[0_0_10px_#38bdf8]" />
              </div>
            </div>

            {/* Scrub Range Input */}
            <input
              type="range"
              min="0"
              max={duration || 100}
              step="0.05"
              value={currentTime}
              onChange={(e) => onSeek(parseFloat(e.target.value))}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              title="Scrub timeline"
            />
          </div>

          <div className="flex justify-between items-center text-[11px] font-mono text-cyan-300/80 px-1 pt-0.5">
            <span className="font-bold text-white">{formatSecondsToTime(currentTime)}</span>
            <div className="flex items-center gap-3">
              {loopRegion.enabled && (
                <span className="text-amber-300 text-[10px] font-sans font-semibold">
                  A-B: [{formatSecondsToTime(loopRegion.start)} - {formatSecondsToTime(loopRegion.end)}]
                </span>
              )}
              <span className="text-slate-400">{formatSecondsToTime(duration)}</span>
            </div>
          </div>
        </div>

        {/* Controls Row: Bunder-Bunder Glassy Pills (iOS & Pure Frutiger Aero Style) */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          
          {/* Left Transport: Stop, Glass Orb Play, Count-In, Loop */}
          <div className="flex items-center gap-2">
            {/* Stop Circular Button */}
            <button
              onClick={onStop}
              className="w-10 h-10 rounded-full bg-[#081528]/90 text-slate-300 hover:text-white hover:bg-slate-800 border border-white/15 transition shadow flex items-center justify-center active:scale-90"
              title="Stop"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
            </button>

            {/* Futuristic Glass Orb Play/Pause Button */}
            <button
              onClick={isPlaying ? onPause : onPlay}
              disabled={countInActive}
              className="w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-gradient-to-b from-cyan-400 via-blue-600 to-indigo-800 text-white flex items-center justify-center hover:scale-105 active:scale-90 transition shadow-[0_0_24px_rgba(6,182,212,0.6)] border-2 border-cyan-200/50 relative overflow-hidden flex-shrink-0"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-white/40 to-transparent rounded-t-full pointer-events-none" />
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-current relative z-10" />
              ) : (
                <Play className="w-5 h-5 fill-current ml-0.5 relative z-10" />
              )}
            </button>

            {/* 1-Bar Count-In Capsule */}
            <button
              onClick={onPlayWithCountIn}
              disabled={isPlaying || countInActive}
              className={`px-3 py-2 rounded-full text-xs font-bold transition flex items-center gap-1.5 border shadow active:scale-95 ${
                countInActive
                  ? 'bg-amber-500 text-black border-amber-300 animate-bounce'
                  : 'bg-[#081528]/90 text-cyan-300 border-white/15 hover:bg-cyan-950/50 hover:text-white'
              }`}
              title="Hitungan masuk 4 ketukan sebelum audio mulai"
            >
              <Timer className="w-3.5 h-3.5 text-amber-400" />
              <span>{countInActive ? `Count: ${countInBeat}` : 'Count-In (4)'}</span>
            </button>

            {/* A-B Loop Capsule */}
            <div className="flex items-center gap-1 bg-[#081528]/90 p-1 rounded-full border border-white/15 text-xs shadow">
              <button
                onClick={onSetLoopStart}
                className="px-2 py-0.5 rounded-full bg-[#10233e] hover:bg-slate-700 text-slate-200 font-mono font-bold"
                title="Titik A"
              >
                A
              </button>
              <button
                onClick={onSetLoopEnd}
                className="px-2 py-0.5 rounded-full bg-[#10233e] hover:bg-slate-700 text-slate-200 font-mono font-bold"
                title="Titik B"
              >
                B
              </button>
              <button
                onClick={onToggleLoop}
                className={`p-1 rounded-full transition ${
                  loopRegion.enabled
                    ? 'bg-amber-500 text-black shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Looping A-B"
              >
                <Repeat className="w-3.5 h-3.5" />
              </button>
              {loopRegion.enabled && (
                <button
                  onClick={onClearLoop}
                  className="px-1.5 py-0.5 text-[10px] text-slate-400 hover:text-rose-400 rounded-full"
                  title="Hapus loop"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Center-Right: Metronome Capsule Widget (Point 2) */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-[#081528]/90 px-3 py-1.5 rounded-full border border-white/15 shadow text-xs">
              <button
                onClick={onToggleMetronomeClick}
                className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full font-bold transition ${
                  metronomeClickActive
                    ? 'bg-amber-500 text-black shadow-[0_0_12px_rgba(245,158,11,0.6)]'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="Nyalakan/Matikan Metronome Click Track yang tersinkron"
              >
                <Radio className="w-3.5 h-3.5 text-amber-400" />
                <span>Metronome</span>
              </button>

              <div className="flex items-center gap-1 font-mono text-cyan-300 font-bold border-l border-white/15 pl-2">
                <button
                  onClick={() => onMetronomeBpmChange(metronomeBpm - 1)}
                  className="w-5 h-5 rounded-full bg-[#10233e] hover:bg-slate-700 text-slate-200 flex items-center justify-center text-[11px]"
                  title="Kurangi 1 BPM"
                >
                  <Minus className="w-2.5 h-2.5" />
                </button>
                <span className="min-w-[2.8rem] text-center text-white">{metronomeBpm}</span>
                <button
                  onClick={() => onMetronomeBpmChange(metronomeBpm + 1)}
                  className="w-5 h-5 rounded-full bg-[#10233e] hover:bg-slate-700 text-slate-200 flex items-center justify-center text-[11px]"
                  title="Tambah 1 BPM"
                >
                  <Plus className="w-2.5 h-2.5" />
                </button>
              </div>
            </div>

            {/* Speed Capsule */}
            <div className="flex items-center gap-1.5 bg-[#081528]/90 px-3 py-1.5 rounded-full border border-white/15 shadow text-xs">
              <Gauge className="w-3.5 h-3.5 text-cyan-400" />
              <select
                value={speed}
                onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
                className="bg-transparent text-cyan-200 text-xs font-mono focus:outline-none cursor-pointer"
              >
                <option value={0.5} className="bg-[#081528]">0.50x</option>
                <option value={0.75} className="bg-[#081528]">0.75x</option>
                <option value={0.9} className="bg-[#081528]">0.90x</option>
                <option value={1.0} className="bg-[#081528]">1.00x</option>
                <option value={1.1} className="bg-[#081528]">1.10x</option>
                <option value={1.25} className="bg-[#081528]">1.25x</option>
                <option value={1.5} className="bg-[#081528]">1.50x</option>
              </select>
            </div>

            {/* Key / Pitch Capsule */}
            <div className="flex items-center gap-1.5 bg-[#081528]/90 px-3 py-1.5 rounded-full border border-white/15 shadow text-xs">
              <Music2 className="w-3.5 h-3.5 text-pink-400" />
              <button
                onClick={() => onPitchChange(pitchSemitones - 1)}
                className="w-5 h-5 rounded-full bg-[#10233e] hover:bg-slate-700 text-slate-200 font-bold flex items-center justify-center text-[11px]"
                title="Turun 1 semitone"
              >
                -
              </button>
              <span className="font-mono font-bold text-white min-w-[1.8rem] text-center">
                {pitchSemitones > 0 ? `+${pitchSemitones}` : pitchSemitones}
              </span>
              <button
                onClick={() => onPitchChange(pitchSemitones + 1)}
                className="w-5 h-5 rounded-full bg-[#10233e] hover:bg-slate-700 text-slate-200 font-bold flex items-center justify-center text-[11px]"
                title="Naik 1 semitone"
              >
                +
              </button>
              {currentKeyTransposed && (
                <span className="text-[10px] font-mono text-amber-300 font-bold bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30">
                  {currentKeyTransposed}
                </span>
              )}
            </div>

            {/* ReplayGain Capsule */}
            <button
              onClick={onToggleReplayGain}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full border text-xs font-semibold transition active:scale-95 shadow ${
                replayGainEnabled
                  ? 'bg-emerald-500 text-black border-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                  : 'bg-[#081528]/90 text-slate-300 border-white/15 hover:border-cyan-400/40'
              }`}
              title="Normalisasi kenyaringan suara ReplayGain (-14 LUFS)"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>RG</span>
              {replayGainEnabled && replayGainDb !== 0 && (
                <span className="text-[10px] font-mono font-bold">
                  ({replayGainDb > 0 ? `+${replayGainDb}` : replayGainDb}dB)
                </span>
              )}
            </button>

            {/* Volume Capsule */}
            <div className="flex items-center gap-2 bg-[#081528]/90 px-3 py-1.5 rounded-full border border-white/15 shadow">
              <button
                onClick={() => onMasterVolumeChange(masterVolume === 0 ? 1.0 : 0)}
                className="text-cyan-400 hover:text-white transition"
              >
                {masterVolume === 0 ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={masterVolume}
                onChange={(e) => onMasterVolumeChange(parseFloat(e.target.value))}
                className="w-16 sm:w-20 h-2 accent-cyan-400 cursor-pointer"
                title="Master Volume"
              />
              <span className="text-[10px] font-mono text-cyan-300 w-7 text-right">
                {Math.round(masterVolume * 100)}%
              </span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
