import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  Square,
  Volume2,
  VolumeX,
  Repeat,
  Gauge,
  Music2,
  Radio,
  Plus,
  Minus,
  Settings2,
  Music,
  Disc,
  Loader2,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { formatSecondsToTime, transposeChord } from '../services/lyricsManager';
import { globalMetronome } from '../services/metronomeEngine';
import { globalAudioEngine } from '../services/audioEngine';
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
  replayGainEnabled?: boolean;
  currentSong: Song | null;
  metronomeClickActive: boolean;
  metronomeBpm: number;
  metronomeBeatsPerBar: number;
  metronomeVolume: number;
  isAudioLoading?: boolean;
  audioLoadingText?: string;
  onMetronomeBeatsChange: (beats: number) => void;
  onMetronomeVolumeChange: (vol: number) => void;
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
  onToggleReplayGain?: () => void;
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
  replayGainEnabled = false,
  currentSong,
  metronomeClickActive,
  metronomeBpm,
  metronomeBeatsPerBar,
  metronomeVolume,
  isAudioLoading = false,
  audioLoadingText,
  onMetronomeBeatsChange,
  onMetronomeVolumeChange,
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
  onToggleMetronomeClick,
  onMetronomeBpmChange,
}) => {
  const [showAdvancedMetronome, setShowAdvancedMetronome] = useState(false);
  const [beatsPerBar, setBeatsPerBar] = useState(4);
  const [sound, setSound] = useState<MetronomeSound>('woodblock');

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const loopStartPercent = duration > 0 ? (loopRegion.start / duration) * 100 : 0;
  const loopEndPercent = duration > 0 ? (loopRegion.end / duration) * 100 : 100;

  const currentKeyTransposed = currentSong
    ? transposeChord(currentSong.originalKey, pitchSemitones)
    : '';

  const replayGainDb = currentSong?.replayGain?.recommendedGainDb ?? 0;

  // Sync local beatsPerBar whenever song changes
  useEffect(() => {
    if (currentSong) {
      const beats = currentSong.timeSignature?.startsWith('6/8')
        ? 6
        : Number(currentSong.timeSignature?.split('/')[0]) || 4;
      setBeatsPerBar(beats);
      globalMetronome.setBeatsPerBar(beats);
      globalAudioEngine.setMetronomeBeatsPerBar(beats);
    }
  }, [currentSong?.id, currentSong?.timeSignature]);

  const handleBeatsChange = (b: number) => {
    setBeatsPerBar(b);
    globalMetronome.setBeatsPerBar(b);
    globalAudioEngine.setMetronomeBeatsPerBar(b);
  };

  const handleSoundChange = (s: MetronomeSound) => {
    setSound(s);
    globalMetronome.setSound(s);
    globalAudioEngine.setMetronomeSound(s);
  };

  const handleTap = () => {
    const calculated = globalMetronome.tapTempo();
    onMetronomeBpmChange(calculated);
  };

  return (
    <div className="relative flex-shrink-0 w-full z-30 bg-white/55 backdrop-blur-2xl border-t border-white/85 shadow-[0_-8px_32px_rgba(2,132,199,0.12)] px-2 sm:px-6 py-1.5 sm:py-2 transition-all">
      {/* Top Specular Liquid Edge Line */}
      <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent pointer-events-none" />

      {/* Advanced Metronome Popover Panel */}
      {showAdvancedMetronome && (
        <div className="absolute bottom-24 left-3 right-3 sm:left-1/2 sm:-translate-x-1/2 sm:w-96 rounded-3xl bg-white/95 backdrop-blur-3xl border border-sky-300 p-4 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 text-xs text-[#0f2942]">
          <div className="flex items-center justify-between border-b border-sky-100 pb-2 mb-3">
            <span className="font-extrabold text-sky-900 flex items-center gap-1.5">
              <Settings2 className="w-4 h-4 text-sky-600" />
              <span>Pengaturan Advance Metronome</span>
            </span>
            <button
              onClick={() => setShowAdvancedMetronome(false)}
              className="text-slate-400 hover:text-slate-700 font-bold p-1"
            >
              ✕
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-600">Birama: {metronomeBeatsPerBar === 6 ? '6/8' : `${metronomeBeatsPerBar}/4`}</span>
              <div className="flex gap-1">
                {[2, 3, 4, 6].map((ts) => (
                  <button
                    key={ts}
                    onClick={() => {
                      handleBeatsChange(ts);
                      onMetronomeBeatsChange(ts);
                    }}
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

            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-600">Pilihan Suara:</span>
              <div className="flex gap-1 flex-wrap justify-end">
                {(['woodblock', 'beep', 'rimshot', 'cowbell'] as MetronomeSound[]).map((snd) => (
                  <button
                    key={snd}
                    onClick={() => handleSoundChange(snd)}
                    className={`px-2 py-1 rounded-full text-[10px] font-bold capitalize transition ${
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

            <div className="flex items-center justify-between gap-3">
              <span className="font-semibold text-slate-600">Volume Click:</span>
              <div className="flex items-center gap-2 flex-1 max-w-[220px]">
                <VolumeX className="w-3.5 h-3.5 text-slate-500" />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={metronomeVolume}
                  onChange={(e) => onMetronomeVolumeChange(Number(e.target.value))}
                  className="w-full accent-sky-600"
                  aria-label="Volume suara metronom"
                />
                <span className="w-9 text-right font-mono text-[10px]">{Math.round(metronomeVolume * 100)}%</span>
              </div>
            </div>

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

      {/* Edge-to-Edge Thin Progress Scrubber Bar on Top Edge */}
      <div className="relative w-full flex items-center group -mt-2 mb-1.5">
        <div className="w-full h-1.5 bg-sky-200/70 rounded-full overflow-hidden relative cursor-pointer border border-white/90">
          {loopRegion.enabled && (
            <div
              className="absolute top-0 bottom-0 bg-amber-400/60 border-x-2 border-amber-500 z-10"
              style={{
                left: `${loopStartPercent}%`,
                width: `${Math.max(0, loopEndPercent - loopStartPercent)}%`,
              }}
            />
          )}
          <div
            className="h-full bg-gradient-to-r from-cyan-400 via-sky-500 to-blue-600 rounded-full transition-all duration-75 relative"
            style={{ width: `${progressPercent}%` }}
          >
            <div className="absolute right-0 top-0 bottom-0 w-2.5 bg-white rounded-full shadow-[0_0_8px_#0284c7]" />
          </div>
        </div>
        <input
          type="range"
          min="0"
          max={duration || 100}
          step="0.05"
          value={currentTime}
          onChange={(e) => onSeek(parseFloat(e.target.value))}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          title="Scrub timeline"
          aria-label="Posisi pemutaran lagu"
        />
      </div>

      {/* ================= DESKTOP 3-COLUMN LAYOUT (md and up) ================= */}
      <div className="hidden md:flex max-w-7xl mx-auto items-center justify-between gap-3">
        {/* LEFT COLUMN: Song Artwork + Title + Artist + Badges */}
        <div className="flex items-center gap-3 min-w-[220px] max-w-[320px] flex-shrink-0">
          {currentSong ? (
            <>
              <div className="w-12 h-12 rounded-xl overflow-hidden shadow-md border border-white flex-shrink-0 bg-sky-100">
                {currentSong.artworkUrl ? (
                  <img
                    src={currentSong.artworkUrl}
                    alt={currentSong.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white">
                    <Disc className="w-6 h-6 animate-spin" />
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-extrabold text-[#0f2942] truncate tracking-tight leading-tight">
                  {currentSong.title}
                </h4>
                <p className="text-xs text-sky-700 font-semibold truncate">
                  by {currentSong.artist}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5 text-[10px] font-mono">
                  <span className="px-1.5 py-0.2 rounded-full bg-sky-100 border border-sky-300 text-sky-900 font-bold">
                    {currentSong.bpm} BPM
                  </span>
                  <span className="px-1.5 py-0.2 rounded-full bg-amber-100 border border-amber-300 text-amber-900 font-bold">
                    {currentSong.originalKey}
                  </span>
                  <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 font-bold">
                    {currentSong.stems.length} Stems
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="text-xs text-slate-500 italic">Belum ada lagu yang dimuat</div>
          )}
        </div>

        {/* CENTER COLUMN: Transport, Loop, Metronome + Key */}
        <div className="flex flex-col items-center justify-center flex-1 max-w-xl">
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Stop */}
            <button
              onClick={onStop}
              className="w-9 h-9 rounded-full bg-white/90 text-slate-700 hover:text-black hover:bg-white border border-sky-200 transition shadow-xs flex items-center justify-center active:scale-90"
              title="Hentikan lagu"
              aria-label="Hentikan pemutaran lagu"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
            </button>

            {/* Play/Pause Spotify Green Glossy Aero Orb Button */}
            <button
              onClick={isPlaying ? onPause : onPlay}
              disabled={isAudioLoading}
              className="w-12 h-12 rounded-full aero-play-orb text-white flex items-center justify-center hover:scale-105 active:scale-90 transition relative overflow-hidden flex-shrink-0"
              title={isPlaying ? 'Pause' : isAudioLoading ? 'Mengunduh audio stem...' : 'Play'}
              aria-label={isPlaying ? 'Jeda pemutaran musik' : 'Mulai putar musik'}
            >
              <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-white/55 to-transparent rounded-t-full pointer-events-none" />
              {isAudioLoading ? (
                <Loader2 className="w-5 h-5 text-white animate-spin relative z-10" />
              ) : isPlaying ? (
                <Pause className="w-5 h-5 fill-current relative z-10" />
              ) : (
                <Play className="w-5 h-5 fill-current ml-0.5 relative z-10" />
              )}
            </button>

            {/* A-B Looper */}
            <div className="flex items-center gap-0.5 bg-white/85 p-0.5 rounded-full border border-sky-200 text-xs shadow-xs">
              <button
                onClick={onSetLoopStart}
                className="px-2 py-0.5 rounded-full bg-sky-100 hover:bg-sky-200 text-sky-900 font-mono font-bold"
                title="Tandai Titik Awal (A)"
                aria-label="Tandai titik awal loop A"
              >
                A
              </button>
              <button
                onClick={onSetLoopEnd}
                className="px-2 py-0.5 rounded-full bg-sky-100 hover:bg-sky-200 text-sky-900 font-mono font-bold"
                title="Tandai Titik Akhir (B)"
                aria-label="Tandai titik akhir loop B"
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
                title="Aktifkan/nonaktifkan Loop A-B"
                aria-label="Aktifkan atau matikan looping A-B"
              >
                <Repeat className="w-3.5 h-3.5" />
              </button>
              {loopRegion.enabled && (
                <button
                  onClick={onClearLoop}
                  className="px-1.5 py-0.5 text-[10px] text-slate-400 hover:text-rose-600 rounded-full"
                  title="Hapus loop"
                  aria-label="Hapus rentang loop"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Metronome & Attached Key Control */}
            <div className="flex items-center gap-1.5 bg-white/90 px-3 py-1 rounded-full border border-sky-200 shadow-xs text-xs">
              <button
                onClick={onToggleMetronomeClick}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full font-bold transition ${
                  metronomeClickActive
                    ? 'bg-amber-400 text-black shadow-xs'
                    : 'text-sky-950 hover:text-sky-600'
                }`}
                title="Metronome Click ON/OFF"
                aria-label="Nyalakan atau matikan suara metronom click"
              >
                <Radio className="w-3.5 h-3.5 text-amber-600" />
                <span>Metronome</span>
              </button>

              <div className="flex items-center gap-1 font-mono text-sky-950 font-bold border-l border-sky-200 pl-1.5">
                <button
                  onClick={() => onMetronomeBpmChange(metronomeBpm - 1)}
                  className="w-5 h-5 rounded-full bg-sky-100 hover:bg-sky-200 text-sky-900 flex items-center justify-center text-[10px]"
                  aria-label="Kurangi tempo 1 BPM"
                >
                  <Minus className="w-2.5 h-2.5" />
                </button>
                <span className="min-w-[2.2rem] text-center text-[#0f2942] font-black">{metronomeBpm}</span>
                <button
                  onClick={() => onMetronomeBpmChange(metronomeBpm + 1)}
                  className="w-5 h-5 rounded-full bg-sky-100 hover:bg-sky-200 text-sky-900 flex items-center justify-center text-[10px]"
                  aria-label="Tambah tempo 1 BPM"
                >
                  <Plus className="w-2.5 h-2.5" />
                </button>
              </div>

              <button
                onClick={() => setShowAdvancedMetronome(!showAdvancedMetronome)}
                className={`p-1 rounded-full transition ${
                  showAdvancedMetronome ? 'bg-sky-200 text-sky-800' : 'text-slate-400 hover:text-sky-600'
                }`}
                title="Advance Metronome (Birama, Suara, Tap Tempo)"
                aria-label="Buka pengaturan advance metronome"
              >
                <Settings2 className="w-3.5 h-3.5" />
              </button>

              {/* Pitch Shift Controls */}
              <div className="flex items-center gap-1 border-l-2 border-sky-300 pl-2 ml-1">
                <Music2 className="w-3.5 h-3.5 text-pink-600" />
                <button
                  onClick={() => onPitchChange(pitchSemitones - 1)}
                  className="w-5 h-5 rounded-full bg-sky-100 hover:bg-sky-200 text-sky-900 font-bold flex items-center justify-center text-[10px]"
                  title="Turunkan 1 semitone"
                  aria-label="Turunkan nada dasar 1 semitone"
                >
                  -
                </button>
                <span className="font-mono font-extrabold text-[#0f2942] min-w-[1.4rem] text-center">
                  {pitchSemitones > 0 ? `+${pitchSemitones}` : pitchSemitones}
                </span>
                <button
                  onClick={() => onPitchChange(pitchSemitones + 1)}
                  className="w-5 h-5 rounded-full bg-sky-100 hover:bg-sky-200 text-sky-900 font-bold flex items-center justify-center text-[10px]"
                  title="Naikkan 1 semitone"
                  aria-label="Naikkan nada dasar 1 semitone"
                >
                  +
                </button>
                {currentKeyTransposed && (
                  <span className="text-[10px] font-mono text-amber-900 font-black bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300 ml-0.5">
                    {currentKeyTransposed}
                  </span>
                )}
                {pitchSemitones !== 0 && (
                  <button
                    onClick={() => onPitchChange(0)}
                    className="px-1.5 py-0.5 rounded-full bg-amber-200/90 hover:bg-amber-300 text-amber-950 font-black text-[9px] flex items-center gap-0.5 border border-amber-400 shadow-2xs transition active:scale-95 ml-0.5"
                    title="Reset pitch ke nada dasar original lagu"
                    aria-label="Reset pitch ke nada dasar original lagu"
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                    <span>Reset</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="text-[10px] font-mono text-sky-900 font-bold pt-0.5 min-h-[16px] flex items-center justify-center">
            {isAudioLoading ? (
              <span className="text-sky-600 font-extrabold animate-pulse">
                {audioLoadingText || 'Mengunduh audio stem dari cloud...'}
              </span>
            ) : (
              <span>
                {formatSecondsToTime(currentTime)} / {formatSecondsToTime(duration)}
              </span>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Speed, Clear Sound (ReplayGain), Volume */}
        <div className="flex items-center gap-2 min-w-[220px] justify-end flex-shrink-0">
          {/* Speed */}
          <div className="flex items-center gap-1 bg-white/80 px-2.5 py-1 rounded-full border border-sky-200 shadow-xs text-xs">
            <Gauge className="w-3.5 h-3.5 text-sky-600" />
            <select
              value={speed}
              onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
              className="bg-transparent text-sky-900 text-xs font-mono font-bold focus:outline-none cursor-pointer"
              aria-label="Pilih kecepatan playback"
            >
              <option value={0.5}>0.5x</option>
              <option value={0.75}>0.75x</option>
              <option value={0.9}>0.9x</option>
              <option value={1.0}>1.0x</option>
              <option value={1.1}>1.1x</option>
              <option value={1.25}>1.25x</option>
              <option value={1.5}>1.5x</option>
            </select>
          </div>

          {/* Artistic Frutiger Aero Clear Sound (ReplayGain) Badge */}
          {onToggleReplayGain && (
            <button
              onClick={onToggleReplayGain}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-black transition-all active:scale-95 shadow-sm relative overflow-hidden group ${
                replayGainEnabled
                  ? 'bg-gradient-to-b from-cyan-300 via-teal-400 to-emerald-500 text-slate-950 border-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.5)]'
                  : 'bg-white/70 hover:bg-white/95 text-slate-700 border-sky-200'
              }`}
              title={`Clear Sound (Normalisasi ReplayGain -14 LUFS) [Offset: ${replayGainDb > 0 ? '+' : ''}${replayGainDb} dB]`}
              aria-label="Aktifkan Clear Sound ReplayGain"
            >
              <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-white/60 to-transparent pointer-events-none" />
              <Sparkles className={`w-3.5 h-3.5 ${replayGainEnabled ? 'text-slate-950 animate-pulse' : 'text-slate-500'}`} />
              <span className="tracking-tight">Clear Sound</span>
              {replayGainEnabled && replayGainDb !== 0 && (
                <span className="text-[10px] font-mono font-black bg-black/20 text-slate-900 px-1.5 py-0.2 rounded-full">
                  {replayGainDb > 0 ? `+${replayGainDb}` : replayGainDb}dB
                </span>
              )}
            </button>
          )}

          {/* Volume */}
          <div className="flex items-center gap-1.5 bg-white/80 px-2.5 py-1 rounded-full border border-sky-200 shadow-xs">
            <button
              onClick={() => onMasterVolumeChange(masterVolume === 0 ? 1.0 : 0)}
              className="text-sky-700 hover:text-sky-900 transition p-0.5"
              aria-label={masterVolume === 0 ? 'Nyalakan volume master' : 'Senyapkan volume master'}
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
              className="w-16 h-1.5 cursor-pointer"
              title="Master Volume"
              aria-label="Volume audio master"
            />
            <span className="text-[10px] font-mono text-sky-900 font-bold w-6 text-right">
              {Math.round(masterVolume * 100)}%
            </span>
          </div>
        </div>
      </div>

      {/* ================= UNIVERSAL MOBILE ERGONOMIC LAYOUT (< md) ================= */}
      <div className="flex md:hidden flex-col gap-1.5 w-full">
        {/* Row 1: Track Info + Play/Pause & Essential Transport */}
        <div className="flex items-center justify-between gap-2">
          {/* Track Thumbnail & Title */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-lg overflow-hidden shadow-sm border border-white flex-shrink-0 bg-sky-100">
              {currentSong?.artworkUrl ? (
                <img
                  src={currentSong.artworkUrl}
                  alt={currentSong.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white">
                  <Disc className="w-5 h-5 animate-spin" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-black text-[#0f2942] truncate leading-tight">
                {currentSong ? currentSong.title : 'Belum Ada Lagu'}
              </h4>
              <p className="text-[10px] text-sky-800 font-semibold truncate">
                {currentSong ? currentSong.artist : 'Pilih dari Library'}
              </p>
              {currentSong && (
                <div className="flex items-center gap-1 mt-0.5 text-[9px] font-mono">
                  <span className="px-1 py-0.2 rounded-full bg-sky-100 border border-sky-300 text-sky-900 font-bold">
                    {currentSong.bpm} BPM
                  </span>
                  <span className="px-1 py-0.2 rounded-full bg-amber-100 border border-amber-300 text-amber-900 font-bold">
                    {currentKeyTransposed || currentSong.originalKey}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right Touch Controls: Stop & Glossy Play/Pause Orb */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={onStop}
              className="w-8 h-8 rounded-full bg-white/90 text-slate-700 hover:text-black border border-sky-200 transition shadow-xs flex items-center justify-center active:scale-90"
              title="Hentikan lagu"
              aria-label="Hentikan pemutaran lagu"
            >
              <Square className="w-3 h-3 fill-current" />
            </button>

            <button
              onClick={isPlaying ? onPause : onPlay}
              disabled={isAudioLoading}
              className="w-11 h-11 rounded-full aero-play-orb text-white flex items-center justify-center active:scale-90 transition relative overflow-hidden shadow-md flex-shrink-0"
              title={isPlaying ? 'Pause' : isAudioLoading ? 'Mengunduh audio...' : 'Play'}
              aria-label={isPlaying ? 'Jeda pemutaran musik' : 'Mulai putar musik'}
            >
              <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-white/60 to-transparent rounded-t-full pointer-events-none" />
              {isAudioLoading ? (
                <Loader2 className="w-5 h-5 text-white animate-spin relative z-10" />
              ) : isPlaying ? (
                <Pause className="w-5 h-5 fill-current relative z-10" />
              ) : (
                <Play className="w-5 h-5 fill-current ml-0.5 relative z-10" />
              )}
            </button>
          </div>
        </div>

        {/* Row 2: Time Readout + Clear Sound Badge + Metronome Quick Stepper */}
        <div className="flex items-center justify-between gap-1.5 text-[10px] pt-0.5 border-t border-sky-200/50">
          <div className="font-mono font-bold text-sky-950 flex-shrink-0">
            {formatSecondsToTime(currentTime)} / {formatSecondsToTime(duration)}
          </div>

          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {/* Mobile Clear Sound Pill */}
            {onToggleReplayGain && (
              <button
                onClick={onToggleReplayGain}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-black transition active:scale-95 shadow-2xs ${
                  replayGainEnabled
                    ? 'bg-gradient-to-b from-cyan-300 to-emerald-400 text-slate-950 border-cyan-200 font-black'
                    : 'bg-white/80 text-slate-700 border-sky-200'
                }`}
                title="Toggle Clear Sound"
              >
                <Sparkles className="w-2.5 h-2.5" />
                <span>Clear Sound</span>
              </button>
            )}

            {/* Mobile Metronome Click & Gear */}
            <button
              onClick={onToggleMetronomeClick}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full font-bold border transition ${
                metronomeClickActive
                  ? 'bg-amber-400 text-black border-amber-300'
                  : 'bg-white/80 text-sky-950 border-sky-200'
              }`}
            >
              <Radio className="w-2.5 h-2.5 text-amber-600" />
              <span>{metronomeBpm}</span>
            </button>

            <button
              onClick={() => setShowAdvancedMetronome(!showAdvancedMetronome)}
              className="p-1 rounded-full bg-white/80 border border-sky-200 text-slate-600"
              title="Metronome Settings"
            >
              <Settings2 className="w-3 h-3" />
            </button>

            {/* Mobile Pitch Stepper */}
            <div className="flex items-center bg-white/80 px-1.5 py-0.5 rounded-full border border-sky-200 font-mono font-bold text-[10px]">
              <button
                onClick={() => onPitchChange(pitchSemitones - 1)}
                className="w-4 h-4 rounded-full bg-sky-100 text-sky-900 flex items-center justify-center font-bold"
              >
                -
              </button>
              <span className="min-w-[1.2rem] text-center">{pitchSemitones > 0 ? `+${pitchSemitones}` : pitchSemitones}</span>
              <button
                onClick={() => onPitchChange(pitchSemitones + 1)}
                className="w-4 h-4 rounded-full bg-sky-100 text-sky-900 flex items-center justify-center font-bold"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
