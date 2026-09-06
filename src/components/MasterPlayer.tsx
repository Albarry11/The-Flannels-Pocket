import React from 'react';
import { Play, Pause, Square, Volume2, VolumeX, Repeat, Gauge, Music2, ShieldCheck, Timer } from 'lucide-react';
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
}) => {
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const loopStartPercent = duration > 0 ? (loopRegion.start / duration) * 100 : 0;
  const loopEndPercent = duration > 0 ? (loopRegion.end / duration) * 100 : 100;

  const currentKeyTransposed = currentSong
    ? transposeChord(currentSong.originalKey, pitchSemitones)
    : '';

  const replayGainDb = currentSong?.replayGain?.recommendedGainDb ?? 0;

  return (
    <div className="bg-gradient-to-b from-[#091529]/95 via-[#060e1c]/98 to-[#040813] border-t border-cyan-500/25 p-3 sm:p-4 sticky bottom-0 z-30 shadow-2xl backdrop-blur-2xl">
      <div className="max-w-7xl mx-auto flex flex-col gap-2.5">
        
        {/* Seekbar and Timeline */}
        <div className="flex flex-col gap-1">
          <div className="relative w-full flex items-center group">
            {/* Track Background with Glass Styling */}
            <div className="w-full h-2.5 bg-[#050c18] rounded-full overflow-hidden relative cursor-pointer border border-cyan-500/20 shadow-inner">
              {/* Loop Region Highlight */}
              {loopRegion.enabled && (
                <div
                  className="absolute top-0 bottom-0 bg-amber-400/35 border-x-2 border-amber-400/80 z-10"
                  style={{
                    left: `${loopStartPercent}%`,
                    width: `${Math.max(0, loopEndPercent - loopStartPercent)}%`,
                  }}
                />
              )}
              {/* Progress Fill with Cyan-Blue Gradient */}
              <div
                className="h-full bg-gradient-to-r from-cyan-400 via-sky-500 to-indigo-500 rounded-full transition-all duration-75 relative"
                style={{ width: `${progressPercent}%` }}
              >
                <div className="absolute right-0 top-0 bottom-0 w-2 bg-white/80 rounded-full shadow-[0_0_8px_#38bdf8]" />
              </div>
            </div>

            {/* Range Input for Scrubbing */}
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

          <div className="flex justify-between items-center text-xs font-mono text-cyan-300/80 px-1">
            <span className="font-bold text-white">{formatSecondsToTime(currentTime)}</span>
            <div className="flex items-center gap-3">
              {loopRegion.enabled && (
                <span className="text-amber-400 text-[11px] font-sans font-semibold">
                  A-B Loop: [{formatSecondsToTime(loopRegion.start)} - {formatSecondsToTime(loopRegion.end)}]
                </span>
              )}
              <span className="text-slate-400">{formatSecondsToTime(duration)}</span>
            </div>
          </div>
        </div>

        {/* Main Controls Row (Windows Media Player 11/12 Aero Glass Style) */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          
          {/* Left: Transport Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={onStop}
              className="p-2.5 rounded-xl bg-[#091526] text-slate-300 hover:text-white hover:bg-slate-800 border border-cyan-500/20 transition shadow"
              title="Stop Playback"
            >
              <Square className="w-4 h-4 fill-current" />
            </button>

            {/* WMP 11/12 Iconic Glass Orb Play Button */}
            <button
              onClick={isPlaying ? onPause : onPlay}
              disabled={countInActive}
              className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-gradient-to-b from-cyan-400 via-blue-600 to-indigo-800 text-white flex items-center justify-center hover:scale-105 active:scale-95 transition shadow-[0_0_20px_rgba(6,182,212,0.5)] border-2 border-cyan-200/40 relative overflow-hidden"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-white/40 to-transparent rounded-t-full pointer-events-none" />
              {isPlaying ? (
                <Pause className="w-6 h-6 fill-current relative z-10" />
              ) : (
                <Play className="w-6 h-6 fill-current ml-0.5 relative z-10" />
              )}
            </button>

            {/* 1-Bar Count-In Play Button */}
            <button
              onClick={onPlayWithCountIn}
              disabled={isPlaying || countInActive}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border shadow ${
                countInActive
                  ? 'bg-amber-500 text-black border-amber-400 animate-bounce'
                  : 'bg-[#091526] text-cyan-300 border-cyan-500/30 hover:bg-cyan-950/60 hover:text-white'
              }`}
              title="Hitungan masuk 4 ketukan sebelum lagu mulai"
            >
              <Timer className="w-3.5 h-3.5 text-amber-400" />
              <span>{countInActive ? `Count: ${countInBeat}` : 'Count-In (4)'}</span>
            </button>

            {/* A-B Looper Controls */}
            <div className="flex items-center gap-1 bg-[#060c18] p-1 rounded-xl border border-cyan-500/20 text-xs">
              <button
                onClick={onSetLoopStart}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono font-bold"
                title="Tandai Titik A (Awal Loop)"
              >
                A
              </button>
              <button
                onClick={onSetLoopEnd}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono font-bold"
                title="Tandai Titik B (Akhir Loop)"
              >
                B
              </button>
              <button
                onClick={onToggleLoop}
                className={`p-1.5 rounded transition ${
                  loopRegion.enabled
                    ? 'bg-amber-500/30 text-amber-300 border border-amber-500/50'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Nyalakan/Matikan Loop A-B"
              >
                <Repeat className="w-3.5 h-3.5" />
              </button>
              {loopRegion.enabled && (
                <button
                  onClick={onClearLoop}
                  className="px-1.5 py-0.5 text-[10px] text-slate-400 hover:text-rose-400"
                  title="Hapus loop"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Center: Tempo Speed & Pitch Transpose */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Speed Multiplier */}
            <div className="flex items-center gap-1.5 bg-[#060c18] px-2.5 py-1.5 rounded-xl border border-cyan-500/20 text-xs">
              <Gauge className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-slate-400 text-[11px] uppercase">Speed:</span>
              <select
                value={speed}
                onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
                className="bg-[#091526] text-cyan-200 text-xs rounded px-1.5 py-0.5 border border-cyan-500/30 font-mono focus:outline-none"
              >
                <option value={0.5}>0.50x (Slow)</option>
                <option value={0.75}>0.75x</option>
                <option value={0.9}>0.90x</option>
                <option value={1.0}>1.00x</option>
                <option value={1.1}>1.10x</option>
                <option value={1.25}>1.25x</option>
                <option value={1.5}>1.50x (Fast)</option>
              </select>
            </div>

            {/* Pitch Transpose in Semitones */}
            <div className="flex items-center gap-1.5 bg-[#060c18] px-2.5 py-1.5 rounded-xl border border-cyan-500/20 text-xs">
              <Music2 className="w-3.5 h-3.5 text-pink-400" />
              <span className="text-slate-400 text-[11px] uppercase">Key:</span>
              <button
                onClick={() => onPitchChange(pitchSemitones - 1)}
                className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold flex items-center justify-center border border-slate-700"
                title="Turunkan 1 semitone"
              >
                -
              </button>
              <span className="font-mono font-bold text-white min-w-[2rem] text-center">
                {pitchSemitones > 0 ? `+${pitchSemitones}` : pitchSemitones}
              </span>
              <button
                onClick={() => onPitchChange(pitchSemitones + 1)}
                className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold flex items-center justify-center border border-slate-700"
                title="Naikkan 1 semitone"
              >
                +
              </button>
              {currentKeyTransposed && (
                <span className="text-[11px] font-mono text-amber-300 font-semibold bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/30">
                  {currentKeyTransposed}
                </span>
              )}
            </div>

            {/* ReplayGain Toggle */}
            <button
              onClick={onToggleReplayGain}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition ${
                replayGainEnabled
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-[#060c18] text-slate-400 border-cyan-500/20 hover:border-cyan-400/40'
              }`}
              title="Normalisasi loudness ReplayGain (-14 LUFS)"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>RG</span>
              {replayGainEnabled && replayGainDb !== 0 && (
                <span className="text-[10px] font-mono">
                  ({replayGainDb > 0 ? `+${replayGainDb}` : replayGainDb}dB)
                </span>
              )}
            </button>
          </div>

          {/* Right: Master Volume */}
          <div className="flex items-center gap-2 min-w-[130px]">
            <button
              onClick={() => onMasterVolumeChange(masterVolume === 0 ? 1.0 : 0)}
              className="text-cyan-400 hover:text-white transition"
            >
              {masterVolume === 0 ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={masterVolume}
              onChange={(e) => onMasterVolumeChange(parseFloat(e.target.value))}
              className="w-20 sm:w-28 h-2 accent-cyan-400"
              title="Master Volume"
            />
            <span className="text-[11px] font-mono text-cyan-300 w-8">
              {Math.round(masterVolume * 100)}%
            </span>
          </div>

        </div>
      </div>
    </div>
  );
};
