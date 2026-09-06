import React from 'react';
import { Play, Pause, Square, Volume2, VolumeX, Repeat, Gauge, Music2, ShieldCheck } from 'lucide-react';
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
  onPlay: () => void;
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
  onPlay,
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
    <div className="bg-flannel-card border-t border-flannel-border p-4 sm:p-5 sticky bottom-0 z-30 shadow-2xl">
      <div className="max-w-7xl mx-auto flex flex-col gap-4">
        
        {/* Seekbar and Timeline */}
        <div className="flex flex-col gap-1.5">
          <div className="relative w-full flex items-center group">
            {/* Custom Track Background */}
            <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden relative cursor-pointer">
              {/* Loop Region Highlight */}
              {loopRegion.enabled && (
                <div
                  className="absolute top-0 bottom-0 bg-amber-500/30 border-x border-amber-400/70"
                  style={{
                    left: `${loopStartPercent}%`,
                    width: `${Math.max(0, loopEndPercent - loopStartPercent)}%`,
                  }}
                />
              )}
              {/* Progress fill */}
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-pink-500 rounded-full transition-all duration-75"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Real HTML Range input overlaid for smooth scrubbing */}
            <input
              type="range"
              min="0"
              max={duration || 100}
              step="0.05"
              value={currentTime}
              onChange={(e) => onSeek(parseFloat(e.target.value))}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              title="Geser timeline"
            />
          </div>

          <div className="flex justify-between items-center text-xs font-mono text-slate-400">
            <span>{formatSecondsToTime(currentTime)}</span>
            <div className="flex items-center gap-3">
              {loopRegion.enabled && (
                <span className="text-amber-400 text-[11px] font-sans">
                  Loop: [{formatSecondsToTime(loopRegion.start)} - {formatSecondsToTime(loopRegion.end)}]
                </span>
              )}
              <span>{formatSecondsToTime(duration)}</span>
            </div>
          </div>
        </div>

        {/* Main Controls Row */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          
          {/* Left: Playback Transport Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={onStop}
              className="p-2.5 rounded-xl bg-flannel-panel text-slate-400 hover:text-white hover:bg-slate-700 transition"
              title="Stop"
            >
              <Square className="w-4 h-4" />
            </button>
            <button
              onClick={isPlaying ? onPause : onPlay}
              className="w-12 h-12 rounded-2xl bg-gradient-to-r from-indigo-500 to-pink-500 text-white flex items-center justify-center hover:opacity-90 active:scale-95 transition shadow-lg shadow-indigo-500/25"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-0.5" />}
            </button>

            {/* A-B Looper Controls for Rehearsing Solo/Part */}
            <div className="flex items-center gap-1 bg-flannel-panel p-1 rounded-xl border border-flannel-border text-xs">
              <button
                onClick={onSetLoopStart}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono font-bold"
                title="Tandai Titik A (Awal Loop)"
              >
                A
              </button>
              <button
                onClick={onSetLoopEnd}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono font-bold"
                title="Tandai Titik B (Akhir Loop)"
              >
                B
              </button>
              <button
                onClick={onToggleLoop}
                className={`p-1.5 rounded transition ${
                  loopRegion.enabled
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Nyalakan/Matikan Loop A-B"
              >
                <Repeat className="w-3.5 h-3.5" />
              </button>
              {loopRegion.enabled && (
                <button
                  onClick={onClearLoop}
                  className="px-1.5 py-0.5 text-[10px] text-slate-400 hover:text-red-400"
                  title="Hapus loop"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Center: Tempo Speed & Pitch Transpose for Kulik */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Speed / Tempo Multiplier */}
            <div className="flex items-center gap-1.5 bg-flannel-panel px-3 py-1.5 rounded-xl border border-flannel-border text-xs">
              <Gauge className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-slate-400 text-[11px] uppercase">Speed:</span>
              <select
                value={speed}
                onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
                className="bg-slate-800 text-slate-200 text-xs rounded px-1.5 py-0.5 border border-slate-700 font-mono focus:outline-none focus:border-indigo-500"
              >
                <option value={0.5}>0.50x (Slow)</option>
                <option value={0.75}>0.75x</option>
                <option value={0.9}>0.90x</option>
                <option value={1.0}>1.00x (Normal)</option>
                <option value={1.1}>1.10x</option>
                <option value={1.25}>1.25x</option>
                <option value={1.5}>1.50x (Fast)</option>
              </select>
            </div>

            {/* Pitch Transposition in Semitones */}
            <div className="flex items-center gap-1.5 bg-flannel-panel px-3 py-1.5 rounded-xl border border-flannel-border text-xs">
              <Music2 className="w-3.5 h-3.5 text-pink-400" />
              <span className="text-slate-400 text-[11px] uppercase">Key:</span>
              <button
                onClick={() => onPitchChange(pitchSemitones - 1)}
                className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold flex items-center justify-center border border-slate-700"
                title="Turunkan 1 semitone (-b)"
              >
                -
              </button>
              <span className="font-mono font-bold text-slate-200 min-w-[2.2rem] text-center">
                {pitchSemitones > 0 ? `+${pitchSemitones}` : pitchSemitones}
              </span>
              <button
                onClick={() => onPitchChange(pitchSemitones + 1)}
                className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold flex items-center justify-center border border-slate-700"
                title="Naikkan 1 semitone (#)"
              >
                +
              </button>
              {pitchSemitones !== 0 && (
                <button
                  onClick={() => onPitchChange(0)}
                  className="text-[10px] text-slate-400 hover:text-white underline ml-1"
                >
                  Reset
                </button>
              )}
              {currentKeyTransposed && (
                <span className="text-[11px] font-mono text-amber-300 font-semibold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 ml-1">
                  {currentKeyTransposed}
                </span>
              )}
            </div>

            {/* ReplayGain Toggle */}
            <button
              onClick={onToggleReplayGain}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition ${
                replayGainEnabled
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-flannel-panel text-slate-400 border-flannel-border hover:border-slate-600'
              }`}
              title="Normalisasi loudness ReplayGain (standar -14 LUFS)"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>ReplayGain</span>
              {replayGainEnabled && replayGainDb !== 0 && (
                <span className="text-[10px] font-mono">
                  ({replayGainDb > 0 ? `+${replayGainDb}` : replayGainDb}dB)
                </span>
              )}
            </button>
          </div>

          {/* Right: Master Volume */}
          <div className="flex items-center gap-2 min-w-[140px]">
            <button
              onClick={() => onMasterVolumeChange(masterVolume === 0 ? 1.0 : 0)}
              className="text-slate-400 hover:text-white"
            >
              {masterVolume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={masterVolume}
              onChange={(e) => onMasterVolumeChange(parseFloat(e.target.value))}
              className="w-24 sm:w-28 h-1.5"
              title="Master Volume"
            />
            <span className="text-[11px] font-mono text-slate-400 w-8">
              {Math.round(masterVolume * 100)}%
            </span>
          </div>

        </div>
      </div>
    </div>
  );
};
