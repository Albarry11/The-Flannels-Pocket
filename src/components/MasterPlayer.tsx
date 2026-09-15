import React, { useState, useEffect } from 'react';
import {
  Gauge,
  Music2,
  Radio,
  Settings2,
  Music,
  Disc,
  Loader2,
  RotateCcw,
  Sparkles,
  VolumeX,
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

  // Determine WMP volume icon level
  const volIconClass =
    masterVolume === 0
      ? 'muted'
      : masterVolume > 0.66
      ? 'high'
      : masterVolume > 0.33
      ? 'mid'
      : 'low';

  return (
    <div className="wmp-dock-bar relative flex-shrink-0 w-full z-30 px-2 sm:px-4 py-1.5 transition-all select-none">
      {/* Advanced Metronome Popover Panel */}
      {showAdvancedMetronome && (
        <div className="absolute bottom-20 left-3 right-3 sm:left-1/2 sm:-translate-x-1/2 sm:w-96 rounded-2xl bg-white/95 backdrop-blur-3xl border border-sky-300 p-4 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 text-xs text-[#0f2942]">
          <div className="flex items-center justify-between border-b border-sky-100 pb-2 mb-3">
            <span className="font-extrabold text-sky-900 flex items-center gap-1.5">
              <Settings2 className="w-4 h-4 text-sky-600" />
              <span>Pengaturan Advance Metronome (WMP DSP)</span>
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
                  className="w-full accent-sky-600 cursor-pointer"
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

      {/* WMP 11 Precision Timeline Scrubber Bar on Top Edge */}
      <div className="relative w-full flex items-center group -mt-1 mb-1">
        <div className="w-full h-1.5 bg-[#8bb4dc]/40 rounded-full overflow-hidden relative cursor-pointer border border-white/80 shadow-inner">
          {loopRegion.enabled && (
            <div
              className="absolute top-0 bottom-0 bg-amber-400/80 border-x-2 border-amber-500 z-10"
              style={{
                left: `${loopStartPercent}%`,
                width: `${Math.max(0, loopEndPercent - loopStartPercent)}%`,
              }}
            />
          )}
          <div
            className="h-full bg-gradient-to-r from-[#2995dc] via-[#1170b8] to-[#044c8c] rounded-full transition-all duration-75 relative"
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

      {/* ================= 3-ZONE BALANCED DOCK WITH DEAD-CENTER PLAY BUTTON ================= */}
      <div className="max-w-7xl mx-auto grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4 min-h-[52px]">
        
        {/* ZONE 1 (Left 1fr): WMP 11 Now Playing Track Plate */}
        <div className="flex items-center gap-2.5 min-w-0 justify-self-start">
          {currentSong ? (
            <>
              {/* WMP Album Art with Metallic Beveled Frame */}
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg overflow-hidden shadow-[0_2px_8px_rgba(0,40,90,0.25)] border border-white/90 flex-shrink-0 bg-sky-100 relative group">
                {currentSong.artworkUrl ? (
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
                <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-white/40 to-transparent pointer-events-none" />
              </div>

              {/* Title, Artist, & Badges */}
              <div className="min-w-0 flex-1">
                <h4 className="text-xs sm:text-sm font-black text-[#002963] truncate tracking-tight leading-tight">
                  {currentSong.title}
                </h4>
                <p className="text-[10px] sm:text-xs text-sky-800 font-bold truncate">
                  {currentSong.artist}
                </p>
                <div className="flex items-center gap-1 mt-0.5 text-[9px] font-mono">
                  <span className="px-1.5 py-0.2 rounded-md bg-white/80 border border-sky-300/80 text-sky-900 font-black shadow-2xs">
                    {currentSong.bpm} BPM
                  </span>
                  <span className="px-1.5 py-0.2 rounded-md bg-amber-100/90 border border-amber-300 text-amber-950 font-black shadow-2xs">
                    {currentSong.originalKey}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="text-[11px] text-slate-500 font-semibold italic truncate">Belum ada lagu yang dimuat</div>
          )}
        </div>

        {/* ZONE 2 (Center auto): Symmetrical WMP 11 Transport Capsule Pod */}
        <div className="flex flex-col items-center justify-center justify-self-center">
          <div className="wmp-control-pod">
            <div className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 w-full">
              {/* Shuffle / A-B Loop Left Button */}
              <button
                onClick={onToggleLoop}
                className={`wmp-btn-shuffle ${loopRegion.enabled ? 'active' : ''}`}
                title={loopRegion.enabled ? 'Loop A-B Aktif (Klik untuk Matikan)' : 'Aktifkan Loop A-B'}
                aria-label="Loop A-B"
              />

              {/* Stop Button */}
              <button
                onClick={onStop}
                className="wmp-btn-stop"
                title="Stop"
                aria-label="Stop Pemutaran"
              />

              {/* Previous Track / Seek -10s Button */}
              <button
                onClick={() => onSeek(Math.max(0, currentTime - 10))}
                className="wmp-btn-prev"
                title="Mundur 10 Detik"
                aria-label="Mundur 10 Detik"
              />

              {/* Play / Pause Blue Aero Orb Button (Dead Center) */}
              <div className="relative flex items-center justify-center flex-shrink-0">
                {isAudioLoading ? (
                  <div className="w-[42px] h-[43px] rounded-full bg-sky-600 flex items-center justify-center text-white shadow-md">
                    <Loader2 className="w-5 h-5 animate-spin" />
                  </div>
                ) : (
                  <button
                    onClick={isPlaying ? onPause : onPlay}
                    className={`wmp-btn-playpause ${isPlaying ? 'pause' : 'play'}`}
                    title={isPlaying ? 'Pause' : 'Play'}
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                  />
                )}
              </div>

              {/* Next Track / Seek +10s Button */}
              <button
                onClick={() => onSeek(Math.min(duration, currentTime + 10))}
                className="wmp-btn-next"
                title="Maju 10 Detik"
                aria-label="Maju 10 Detik"
              />

              {/* Repeat Button */}
              <button
                onClick={onToggleLoop}
                className={`wmp-btn-repeat ${loopRegion.enabled ? 'active' : ''}`}
                title="Repeat Lagu"
                aria-label="Repeat Lagu"
              />
            </div>
          </div>

          {/* Symmetrical Time Indicator under Pod */}
          <div className="text-[11px] font-mono text-[#002963] font-black pt-0.5 min-h-[14px] flex items-center justify-center tracking-wider">
            {isAudioLoading ? (
              <span className="text-sky-700 font-extrabold animate-pulse">
                {audioLoadingText || 'Mengunduh audio stem dari cloud...'}
              </span>
            ) : (
              <span>
                {formatSecondsToTime(currentTime)} / {formatSecondsToTime(duration)}
              </span>
            )}
          </div>
        </div>

        {/* ZONE 3 (Right 1fr): Unified DSP, Enhancements & Volume Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 justify-self-end">
          {/* A-B Markers Pill */}
          <div className="hidden xl:flex items-center gap-0.5 bg-white/80 px-1.5 py-0.5 rounded-full border border-sky-300/80 shadow-2xs text-[10px] font-mono font-black text-sky-950">
            <button
              onClick={onSetLoopStart}
              className="px-1.5 py-0.2 hover:bg-sky-200 rounded"
              title="Tandai Titik Awal (A)"
            >
              A
            </button>
            <button
              onClick={onSetLoopEnd}
              className="px-1.5 py-0.2 hover:bg-sky-200 rounded"
              title="Tandai Titik Akhir (B)"
            >
              B
            </button>
            {loopRegion.enabled && (
              <button
                onClick={onClearLoop}
                className="px-1 text-rose-600 hover:font-black"
                title="Hapus loop A-B"
              >
                ✕
              </button>
            )}
          </div>

          {/* Metronome DSP Pod */}
          <div className="flex items-center gap-1 bg-white/85 px-2 py-0.5 rounded-full border border-sky-300/80 shadow-2xs text-xs">
            <button
              onClick={onToggleMetronomeClick}
              className={`flex items-center gap-1 px-1.5 py-0.2 rounded-full font-bold transition text-[10px] ${
                metronomeClickActive
                  ? 'bg-amber-400 text-black shadow-xs'
                  : 'text-sky-950 hover:text-sky-700'
              }`}
              title="Toggle Metronome Click"
            >
              <Radio className="w-3 h-3 text-amber-600" />
              <span className="font-mono text-[10px]">{metronomeBpm}</span>
            </button>
            <div className="hidden sm:flex items-center gap-0.5 font-mono text-sky-950 font-bold border-l border-sky-300/80 pl-1">
              <button
                onClick={() => onMetronomeBpmChange(metronomeBpm - 1)}
                className="w-4 h-4 rounded-full bg-sky-100 hover:bg-sky-200 text-sky-900 flex items-center justify-center text-[9px] font-bold"
                title="Kurang 1 BPM"
              >
                -
              </button>
              <button
                onClick={() => onMetronomeBpmChange(metronomeBpm + 1)}
                className="w-4 h-4 rounded-full bg-sky-100 hover:bg-sky-200 text-sky-900 flex items-center justify-center text-[9px] font-bold"
                title="Tambah 1 BPM"
              >
                +
              </button>
            </div>
            <button
              onClick={() => setShowAdvancedMetronome(!showAdvancedMetronome)}
              className="p-0.5 text-slate-500 hover:text-sky-700"
              title="Pengaturan Birama & Suara"
            >
              <Settings2 className="w-3 h-3" />
            </button>
          </div>

          {/* Pitch Shifter DSP Pod */}
          <div className="hidden lg:flex items-center gap-1 bg-white/85 px-2 py-0.5 rounded-full border border-sky-300/80 shadow-2xs text-xs">
            <Music2 className="w-3 h-3 text-pink-600" />
            <button
              onClick={() => onPitchChange(pitchSemitones - 1)}
              className="w-4 h-4 rounded-full bg-sky-100 hover:bg-sky-200 text-sky-900 font-bold flex items-center justify-center text-[9px]"
              title="Turunkan nada"
            >
              -
            </button>
            <span className="font-mono font-black text-[#002963] text-[10px] min-w-[1.2rem] text-center">
              {pitchSemitones > 0 ? `+${pitchSemitones}` : pitchSemitones}
            </span>
            <button
              onClick={() => onPitchChange(pitchSemitones + 1)}
              className="w-4 h-4 rounded-full bg-sky-100 hover:bg-sky-200 text-sky-900 font-bold flex items-center justify-center text-[9px]"
              title="Naikkan nada"
            >
              +
            </button>
            {currentKeyTransposed && (
              <span className="text-[9px] font-mono text-amber-950 font-black bg-amber-100 px-1.5 py-0.2 rounded-md border border-amber-300">
                {currentKeyTransposed}
              </span>
            )}
            {pitchSemitones !== 0 && (
              <button
                onClick={() => onPitchChange(0)}
                className="text-[8px] bg-amber-200 hover:bg-amber-300 text-amber-950 px-1 rounded-full font-bold ml-0.5"
                title="Reset nada"
              >
                <RotateCcw className="w-2 h-2" />
              </button>
            )}
          </div>

          {/* Play Speed Capsule */}
          <div className="hidden md:flex items-center gap-1 bg-white/85 px-2 py-0.5 rounded-full border border-sky-300/80 shadow-2xs text-xs">
            <Gauge className="w-3 h-3 text-sky-600" />
            <select
              value={speed}
              onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
              className="bg-transparent text-sky-950 text-[10px] sm:text-xs font-mono font-bold focus:outline-none cursor-pointer"
              aria-label="Pilih kecepatan playback"
            >
              <option value={0.75}>0.75x</option>
              <option value={1.0}>1.0x</option>
              <option value={1.25}>1.25x</option>
            </select>
          </div>

          {/* WMP 11 SRS WOW / Clear Sound Badge */}
          {onToggleReplayGain && (
            <button
              onClick={onToggleReplayGain}
              className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[10px] sm:text-xs font-black transition-all active:scale-95 shadow-sm relative overflow-hidden group flex-shrink-0 ${
                replayGainEnabled
                  ? 'bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 text-slate-950 border-cyan-200 shadow-[0_0_10px_rgba(6,182,212,0.4)]'
                  : 'bg-white/85 hover:bg-white text-slate-700 border-sky-300/80'
              }`}
              title={`Clear Sound (Normalisasi ReplayGain -14 LUFS) [Offset: ${replayGainDb > 0 ? '+' : ''}${replayGainDb} dB]`}
              aria-label="Aktifkan Clear Sound ReplayGain"
            >
              <Sparkles className={`w-3 h-3 ${replayGainEnabled ? 'text-slate-950 animate-pulse' : 'text-slate-500'}`} />
              <span className="tracking-tight hidden sm:inline">Clear</span>
              {replayGainEnabled && replayGainDb !== 0 && (
                <span className="text-[9px] font-mono font-black bg-black/20 text-slate-900 px-1 py-0.2 rounded-full">
                  {replayGainDb > 0 ? `+${replayGainDb}` : replayGainDb}dB
                </span>
              )}
            </button>
          )}

          {/* WMP 11 Volume Fader & Mute */}
          <div className="flex items-center gap-1 bg-white/85 px-2 py-0.5 rounded-full border border-sky-300/80 shadow-2xs flex-shrink-0">
            <button
              onClick={() => onMasterVolumeChange(masterVolume === 0 ? 0.9 : 0)}
              className={`wmp-btn-vol ${volIconClass}`}
              title={masterVolume === 0 ? 'Unmute Volume' : 'Mute Volume'}
              aria-label={masterVolume === 0 ? 'Unmute Volume' : 'Mute Volume'}
            />
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={masterVolume}
              onChange={(e) => onMasterVolumeChange(parseFloat(e.target.value))}
              className="w-14 sm:w-18 h-1.5 cursor-pointer accent-[#1170b8]"
              title={`Master Volume: ${Math.round(masterVolume * 100)}%`}
              aria-label="Volume audio master"
            />
            <span className="text-[10px] font-mono text-[#002963] font-black w-6 text-right">
              {Math.round(masterVolume * 100)}%
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};
