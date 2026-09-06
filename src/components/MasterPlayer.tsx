import React, { useState } from 'react';
import {
  Play,
  Pause,
  Square,
  Volume2,
  VolumeX,
  Repeat,
  Gauge,
  Music2,
  ShieldCheck,
  Timer,
  Radio,
  Plus,
  Minus,
  Settings2,
  Music,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { formatSecondsToTime, transposeChord } from '../services/lyricsManager';
import { globalMetronome } from '../services/metronomeEngine';
import type { MetronomeSound } from '../services/metronomeEngine';
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
  const [showAdvancedMetronome, setShowAdvancedMetronome] = useState(false);
  const [showSourceInfo, setShowSourceInfo] = useState(false);

  // Advanced metronome local states
  const [beatsPerBar, setBeatsPerBar] = useState(4);
  const [sound, setSound] = useState<MetronomeSound>('woodblock');

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const loopStartPercent = duration > 0 ? (loopRegion.start / duration) * 100 : 0;
  const loopEndPercent = duration > 0 ? (loopRegion.end / duration) * 100 : 100;

  const currentKeyTransposed = currentSong
    ? transposeChord(currentSong.originalKey, pitchSemitones)
    : '';

  const replayGainDb = currentSong?.replayGain?.recommendedGainDb ?? 0;

  const handleBeatsChange = (b: number) => {
    setBeatsPerBar(b);
    globalMetronome.setBeatsPerBar(b);
  };

  const handleSoundChange = (s: MetronomeSound) => {
    setSound(s);
    globalMetronome.setSound(s);
  };

  const handleTap = () => {
    const calculated = globalMetronome.tapTempo();
    onMetronomeBpmChange(calculated);
  };

  return (
    <div className="fixed bottom-3 inset-x-2 sm:inset-x-6 md:inset-x-8 max-w-7xl mx-auto rounded-3xl sm:rounded-full bg-white/65 backdrop-blur-3xl border border-white/90 shadow-[0_16px_45px_rgba(2,132,199,0.18)] p-2.5 sm:p-3.5 z-40 relative overflow-visible">
      {/* Ripple Water Drops at Corners (Point 6) */}
      <div className="absolute -top-1.5 -left-1.5 w-6 h-6 rounded-full bg-cyan-400/20 blur-xs pointer-events-none" />
      <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-sky-400/20 blur-xs pointer-events-none" />
      <div className="absolute -bottom-1.5 -left-1.5 w-6 h-6 rounded-full bg-blue-400/20 blur-xs pointer-events-none" />
      <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-teal-400/20 blur-xs pointer-events-none" />

      {/* Top Specular Glass Reflection */}
      <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-white to-transparent pointer-events-none rounded-t-full" />

      {/* Advanced Metronome Popover Panel (Point 4) */}
      {showAdvancedMetronome && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-80 sm:w-96 rounded-3xl bg-white/90 backdrop-blur-3xl border border-sky-300 p-4 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 text-xs text-[#0f2942]">
          <div className="flex items-center justify-between border-b border-sky-100 pb-2 mb-3">
            <span className="font-extrabold text-sky-900 flex items-center gap-1.5">
              <Settings2 className="w-4 h-4 text-sky-600" />
              <span>Pengaturan Advance Metronome</span>
            </span>
            <button
              onClick={() => setShowAdvancedMetronome(false)}
              className="text-slate-400 hover:text-slate-700 font-bold"
            >
              ✕
            </button>
          </div>

          <div className="space-y-3">
            {/* Time Signature */}
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-600">Birama:</span>
              <div className="flex gap-1">
                {[2, 3, 4, 6].map((ts) => (
                  <button
                    key={ts}
                    onClick={() => handleBeatsChange(ts)}
                    className={`px-2.5 py-1 rounded-full font-mono font-bold text-xs transition ${
                      beatsPerBar === ts
                        ? 'bg-sky-600 text-white shadow-xs'
                        : 'bg-sky-100 text-sky-900 hover:bg-sky-200'
                    }`}
                  >
                    {ts === 6 ? '6/8' : `${ts}/4`}
                  </button>
                ))}
              </div>
            </div>

            {/* Sound Preset */}
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-600">Pilihan Suara:</span>
              <div className="flex gap-1">
                {(['woodblock', 'beep', 'rimshot', 'cowbell'] as MetronomeSound[]).map((snd) => (
                  <button
                    key={snd}
                    onClick={() => handleSoundChange(snd)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold capitalize transition ${
                      sound === snd
                        ? 'bg-sky-600 text-white shadow-xs'
                        : 'bg-sky-100 text-sky-900 hover:bg-sky-200'
                    }`}
                  >
                    {snd}
                  </button>
                ))}
              </div>
            </div>

            {/* Tap Tempo */}
            <div className="pt-1 flex items-center justify-between">
              <span className="font-semibold text-slate-600">Manual Tap:</span>
              <button
                onClick={handleTap}
                className="px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-black font-extrabold flex items-center gap-1 shadow-sm active:scale-95"
              >
                <Music className="w-3.5 h-3.5" />
                <span>Tap Tempo</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Verified BPM & Key Source Info Tooltip (Point 4) */}
      {showSourceInfo && (
        <div className="absolute bottom-20 right-16 sm:right-28 max-w-xs rounded-2xl bg-white/95 backdrop-blur-2xl border border-sky-300 p-3 shadow-2xl z-50 text-[11px] text-[#0f2942] animate-in fade-in duration-100">
          <div className="flex items-center gap-1.5 text-emerald-700 font-bold mb-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Sumber Terverifikasi</span>
          </div>
          <p className="font-medium text-slate-700">
            <strong>Sumber:</strong> {currentSong?.verifiedSource || 'SongBPM / Tunebat / Master Audio'}
          </p>
          {currentSong?.researchNotes && (
            <p className="mt-1 text-slate-600 text-[10px] italic border-t border-sky-100 pt-1">
              {currentSong.researchNotes}
            </p>
          )}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        {/* Seekbar and Timeline */}
        <div className="flex flex-col gap-0.5 px-2">
          <div className="relative w-full flex items-center group">
            {/* Glass Track Background */}
            <div className="w-full h-2 bg-sky-100/90 rounded-full overflow-hidden relative cursor-pointer border border-sky-200 shadow-inner">
              {/* Loop Region Highlight */}
              {loopRegion.enabled && (
                <div
                  className="absolute top-0 bottom-0 bg-amber-400/45 border-x-2 border-amber-500 z-10"
                  style={{
                    left: `${loopStartPercent}%`,
                    width: `${Math.max(0, loopEndPercent - loopStartPercent)}%`,
                  }}
                />
              )}
              {/* Progress Fill with Cyan to Blue Gradient */}
              <div
                className="h-full bg-gradient-to-r from-sky-400 via-sky-500 to-blue-600 rounded-full transition-all duration-75 relative"
                style={{ width: `${progressPercent}%` }}
              >
                <div className="absolute right-0 top-0 bottom-0 w-2.5 bg-white rounded-full shadow-[0_0_8px_#0284c7]" />
              </div>
            </div>

            {/* Scrub Input */}
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

          <div className="flex justify-between items-center text-[11px] font-mono text-sky-900 font-bold px-1 pt-0.5">
            <span>{formatSecondsToTime(currentTime)}</span>
            <div className="flex items-center gap-3">
              {loopRegion.enabled && (
                <span className="text-amber-800 text-[10px] font-sans font-bold">
                  A-B Loop: [{formatSecondsToTime(loopRegion.start)} - {formatSecondsToTime(loopRegion.end)}]
                </span>
              )}
              <span className="text-slate-500 font-normal">{formatSecondsToTime(duration)}</span>
            </div>
          </div>
        </div>

        {/* Controls Row: Bunder-Bunder Glassy Pills (Point 6) */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          
          {/* Left: Transport Buttons */}
          <div className="flex items-center gap-2">
            {/* Stop Button */}
            <button
              onClick={onStop}
              className="w-10 h-10 rounded-full bg-white/90 text-slate-700 hover:text-black hover:bg-white border border-sky-200 transition shadow-xs flex items-center justify-center active:scale-90"
              title="Stop"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
            </button>

            {/* Glass Orb Play Button */}
            <button
              onClick={isPlaying ? onPause : onPlay}
              disabled={countInActive}
              className="w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-gradient-to-b from-sky-400 via-sky-500 to-blue-600 text-white flex items-center justify-center hover:scale-105 active:scale-90 transition shadow-[0_0_20px_rgba(2,132,199,0.5)] border-2 border-white relative overflow-hidden flex-shrink-0"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-white/50 to-transparent rounded-t-full pointer-events-none" />
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-current relative z-10" />
              ) : (
                <Play className="w-5 h-5 fill-current ml-0.5 relative z-10" />
              )}
            </button>

            {/* Count-In Capsule */}
            <button
              onClick={onPlayWithCountIn}
              disabled={isPlaying || countInActive}
              className={`px-3 py-2 rounded-full text-xs font-bold transition flex items-center gap-1.5 border shadow-xs active:scale-95 ${
                countInActive
                  ? 'bg-amber-400 text-black border-amber-500 animate-bounce'
                  : 'bg-white/80 text-sky-900 border-sky-200 hover:bg-sky-50'
              }`}
              title="Hitungan masuk 4 ketukan"
            >
              <Timer className="w-3.5 h-3.5 text-amber-600" />
              <span>{countInActive ? `Count: ${countInBeat}` : 'Count-In (4)'}</span>
            </button>

            {/* A-B Loop Capsule */}
            <div className="flex items-center gap-1 bg-white/80 p-1 rounded-full border border-sky-200 text-xs shadow-xs">
              <button
                onClick={onSetLoopStart}
                className="px-2 py-0.5 rounded-full bg-sky-100 hover:bg-sky-200 text-sky-900 font-mono font-bold"
                title="Titik A"
              >
                A
              </button>
              <button
                onClick={onSetLoopEnd}
                className="px-2 py-0.5 rounded-full bg-sky-100 hover:bg-sky-200 text-sky-900 font-mono font-bold"
                title="Titik B"
              >
                B
              </button>
              <button
                onClick={onToggleLoop}
                className={`p-1 rounded-full transition ${
                  loopRegion.enabled
                    ? 'bg-amber-400 text-black shadow-xs'
                    : 'text-slate-600 hover:text-black'
                }`}
                title="Looping A-B"
              >
                <Repeat className="w-3.5 h-3.5" />
              </button>
              {loopRegion.enabled && (
                <button
                  onClick={onClearLoop}
                  className="px-1.5 py-0.5 text-[10px] text-slate-400 hover:text-rose-600 rounded-full"
                  title="Hapus loop"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Center-Right: UNIFIED METRONOME & KEY HARMONIC CAPSULE (Point 4: tempelkan kontrol key dengan metronome) */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-white/85 px-3 py-1.5 rounded-full border border-sky-200 shadow-xs text-xs">
              {/* Metronome On/Off Click Button */}
              <button
                onClick={onToggleMetronomeClick}
                className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-bold transition ${
                  metronomeClickActive
                    ? 'bg-amber-400 text-black shadow-sm'
                    : 'text-sky-950 hover:text-sky-600'
                }`}
                title="Nyalakan/Matikan Metronome Click"
              >
                <Radio className="w-3.5 h-3.5 text-amber-600" />
                <span>Metronome</span>
              </button>

              {/* BPM Steppers */}
              <div className="flex items-center gap-1 font-mono text-sky-950 font-bold border-l border-sky-200 pl-2">
                <button
                  onClick={() => onMetronomeBpmChange(metronomeBpm - 1)}
                  className="w-5 h-5 rounded-full bg-sky-100 hover:bg-sky-200 text-sky-900 flex items-center justify-center text-[11px]"
                  title="Kurangi 1 BPM"
                >
                  <Minus className="w-2.5 h-2.5" />
                </button>
                <span className="min-w-[2.5rem] text-center text-[#0f2942]">{metronomeBpm}</span>
                <button
                  onClick={() => onMetronomeBpmChange(metronomeBpm + 1)}
                  className="w-5 h-5 rounded-full bg-sky-100 hover:bg-sky-200 text-sky-900 flex items-center justify-center text-[11px]"
                  title="Tambah 1 BPM"
                >
                  <Plus className="w-2.5 h-2.5" />
                </button>
              </div>

              {/* Advanced Metronome Settings Gear Button (Point 4) */}
              <button
                onClick={() => setShowAdvancedMetronome(!showAdvancedMetronome)}
                className={`p-1 rounded-full transition ${
                  showAdvancedMetronome ? 'bg-sky-200 text-sky-800' : 'text-slate-400 hover:text-sky-600'
                }`}
                title="Pengaturan Advance Metronome (Birama, Suara, Tap Tempo)"
              >
                <Settings2 className="w-3.5 h-3.5" />
              </button>

              {/* ATTACHED KEY CONTROL (Point 4: Menempel Langsung dengan Metronome) */}
              <div className="flex items-center gap-1 border-l-2 border-sky-300 pl-2.5 ml-1">
                <Music2 className="w-3.5 h-3.5 text-pink-600" />
                <button
                  onClick={() => onPitchChange(pitchSemitones - 1)}
                  className="w-5 h-5 rounded-full bg-sky-100 hover:bg-sky-200 text-sky-900 font-bold flex items-center justify-center text-[11px]"
                  title="Turun 1 semitone"
                >
                  -
                </button>
                <span className="font-mono font-extrabold text-[#0f2942] min-w-[1.6rem] text-center">
                  {pitchSemitones > 0 ? `+${pitchSemitones}` : pitchSemitones}
                </span>
                <button
                  onClick={() => onPitchChange(pitchSemitones + 1)}
                  className="w-5 h-5 rounded-full bg-sky-100 hover:bg-sky-200 text-sky-900 font-bold flex items-center justify-center text-[11px]"
                  title="Naik 1 semitone"
                >
                  +
                </button>
                {currentKeyTransposed && (
                  <span className="text-[10px] font-mono text-amber-900 font-black bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300 ml-0.5">
                    {currentKeyTransposed}
                  </span>
                )}
                {/* Verified Source Icon (Point 4) */}
                <button
                  onClick={() => setShowSourceInfo(!showSourceInfo)}
                  className="text-slate-400 hover:text-emerald-600 ml-0.5"
                  title="Bukti Sumber BPM & Key Terverifikasi"
                >
                  <Info className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Speed Capsule */}
            <div className="flex items-center gap-1.5 bg-white/80 px-3 py-1.5 rounded-full border border-sky-200 shadow-xs text-xs">
              <Gauge className="w-3.5 h-3.5 text-sky-600" />
              <select
                value={speed}
                onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
                className="bg-transparent text-sky-900 text-xs font-mono font-bold focus:outline-none cursor-pointer"
              >
                <option value={0.5}>0.50x</option>
                <option value={0.75}>0.75x</option>
                <option value={0.9}>0.90x</option>
                <option value={1.0}>1.00x</option>
                <option value={1.1}>1.10x</option>
                <option value={1.25}>1.25x</option>
                <option value={1.5}>1.50x</option>
              </select>
            </div>

            {/* ReplayGain Capsule */}
            <button
              onClick={onToggleReplayGain}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full border text-xs font-bold transition active:scale-95 shadow-xs ${
                replayGainEnabled
                  ? 'bg-emerald-500 text-white border-emerald-400 shadow-sm'
                  : 'bg-white/80 text-sky-900 border-sky-200 hover:bg-sky-50'
              }`}
              title="Normalisasi kenyaringan ReplayGain (-14 LUFS)"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>RG</span>
              {replayGainEnabled && replayGainDb !== 0 && (
                <span className="text-[10px] font-mono">
                  ({replayGainDb > 0 ? `+${replayGainDb}` : replayGainDb}dB)
                </span>
              )}
            </button>

            {/* Volume Capsule */}
            <div className="flex items-center gap-2 bg-white/80 px-3 py-1.5 rounded-full border border-sky-200 shadow-xs">
              <button
                onClick={() => onMasterVolumeChange(masterVolume === 0 ? 1.0 : 0)}
                className="text-sky-700 hover:text-sky-900 transition"
              >
                {masterVolume === 0 ? <VolumeX className="w-3.5 h-3.5 text-rose-500" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={masterVolume}
                onChange={(e) => onMasterVolumeChange(parseFloat(e.target.value))}
                className="w-16 sm:w-20 h-2 cursor-pointer"
                title="Master Volume"
              />
              <span className="text-[10px] font-mono text-sky-900 font-bold w-7 text-right">
                {Math.round(masterVolume * 100)}%
              </span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
