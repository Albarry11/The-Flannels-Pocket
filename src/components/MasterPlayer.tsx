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
    <div className="wmp-dock-bar relative flex-shrink-0 w-full z-30 px-2 sm:px-4 pt-1 pb-3 sm:pb-2.5 transition-all select-none pb-safe">
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

      {/* ================= BARIS 1: TRACK INFO (LEFT) & DSP CONTROLS (RIGHT) ================= */}
      <div className="flex items-center justify-between gap-2 w-full max-w-7xl mx-auto mb-1.5 px-2 text-xs flex-wrap sm:flex-nowrap">
        {/* Left: Track Info & Duration Readout */}
        <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
          {/* Track Info Plate */}
          <div className="flex items-center gap-2 min-w-0 max-w-[160px] sm:max-w-[240px]">
            {currentSong ? (
              <>
                <div className="w-8 h-8 rounded-lg overflow-hidden shadow-xs border border-white/90 flex-shrink-0 bg-sky-100 relative">
                  {currentSong.artworkUrl ? (
                    <img
                      src={currentSong.artworkUrl}
                      alt={currentSong.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white">
                      <Disc className="w-3.5 h-3.5 animate-spin" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h4 className="text-[11px] sm:text-xs font-black text-[#002963] truncate tracking-tight leading-tight">
                    {currentSong.title}
                  </h4>
                  <p className="text-[9px] sm:text-[10px] text-sky-800 font-bold truncate">
                    {currentSong.artist}
                  </p>
                </div>
              </>
            ) : (
              <div className="text-[10px] text-slate-500 font-semibold italic truncate">Belum ada lagu yang dimuat</div>
            )}
          </div>

          {/* Duration Badge in Authentic WMP Aero Pill */}
          <div className="wmp-aero-pill px-2.5 py-0.5 text-[9px] sm:text-[10px] font-mono text-[#002963] font-black tracking-wider flex-shrink-0 whitespace-nowrap">
            {isAudioLoading ? (
              <span className="text-sky-700 font-extrabold animate-pulse">
                {audioLoadingText || 'Memuat...'}
              </span>
            ) : (
              <span>
                {formatSecondsToTime(currentTime)} / {formatSecondsToTime(duration)}
              </span>
            )}
          </div>
        </div>

        {/* Right: The 5 DSP Practice Tools (Metronome, Pitch, Speed, Loop, Clear Sound) in WMP Aero Style */}
        <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0 overflow-x-auto scrollbar-none py-0.5">
          {/* Metronome DSP Pod */}
          <div className="wmp-aero-pill px-1.5 sm:px-2 py-0.5 flex items-center gap-1 text-xs flex-shrink-0">
            <button
              onClick={onToggleMetronomeClick}
              className={`wmp-aero-btn px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] gap-1 ${
                metronomeClickActive
                  ? 'active bg-gradient-to-b from-amber-300 via-amber-400 to-amber-500 border-amber-600 text-black shadow-xs'
                  : ''
              }`}
              title="Toggle Metronome Click"
            >
              <Radio className="w-3 h-3 text-amber-600" />
              <span className="font-mono">{metronomeBpm}</span>
            </button>
            <div className="flex items-center gap-0.5 font-mono text-sky-950 font-bold border-l border-sky-300/80 pl-0.5">
              <button
                onClick={() => onMetronomeBpmChange(metronomeBpm - 1)}
                className="wmp-aero-btn w-4 h-4 rounded-full text-[9px] font-bold"
                title="Kurang 1 BPM"
              >
                -
              </button>
              <button
                onClick={() => onMetronomeBpmChange(metronomeBpm + 1)}
                className="wmp-aero-btn w-4 h-4 rounded-full text-[9px] font-bold"
                title="Tambah 1 BPM"
              >
                +
              </button>
            </div>
            <button
              onClick={() => setShowAdvancedMetronome(!showAdvancedMetronome)}
              className="wmp-aero-btn w-4 h-4 rounded-full p-0.5 text-slate-600"
              title="Pengaturan Birama & Suara Metronom"
            >
              <Settings2 className="w-3 h-3" />
            </button>
          </div>

          {/* Pitch Shifter DSP Pod */}
          <div className="wmp-aero-pill px-1.5 sm:px-2 py-0.5 flex items-center gap-1 text-xs flex-shrink-0">
            <Music2 className="w-3 h-3 text-pink-600" />
            <button
              onClick={() => onPitchChange(pitchSemitones - 1)}
              className="wmp-aero-btn w-4 h-4 rounded-full text-[9px] font-bold"
              title="Turunkan nada"
            >
              -
            </button>
            <span className="font-mono font-black text-[#002963] text-[9px] sm:text-[10px] min-w-[1rem] text-center">
              {pitchSemitones > 0 ? `+${pitchSemitones}` : pitchSemitones}
            </span>
            <button
              onClick={() => onPitchChange(pitchSemitones + 1)}
              className="wmp-aero-btn w-4 h-4 rounded-full text-[9px] font-bold"
              title="Naikkan nada"
            >
              +
            </button>
            {currentKeyTransposed && (
              <span className="text-[8px] sm:text-[9px] font-mono text-amber-950 font-black bg-amber-100/90 px-1.5 py-0.2 rounded border border-amber-300 shadow-2xs">
                {currentKeyTransposed}
              </span>
            )}
            {pitchSemitones !== 0 && (
              <button
                onClick={() => onPitchChange(0)}
                className="wmp-aero-btn px-1 py-0.2 rounded-full text-[8px]"
                title="Reset nada"
              >
                <RotateCcw className="w-2 h-2" />
              </button>
            )}
          </div>

          {/* Play Speed Capsule */}
          <div className="wmp-aero-pill px-2 py-0.5 flex items-center gap-1 text-xs flex-shrink-0">
            <Gauge className="w-3 h-3 text-sky-600" />
            <select
              value={speed}
              onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
              className="bg-transparent text-[#002963] text-[9px] sm:text-[10px] font-mono font-bold focus:outline-none cursor-pointer"
              aria-label="Pilih kecepatan playback"
            >
              <option value={0.75}>0.75x</option>
              <option value={1.0}>1.0x</option>
              <option value={1.25}>1.25x</option>
            </select>
          </div>

          {/* A-B Loop Capsule */}
          <div className="wmp-aero-pill px-1.5 py-0.5 flex items-center gap-1 text-xs flex-shrink-0 font-mono text-[9px] font-black text-[#002963]">
            <button
              onClick={onSetLoopStart}
              className="wmp-aero-btn px-1.5 py-0.5 rounded text-[9px]"
              title="Tandai Titik Awal (A)"
            >
              A
            </button>
            <button
              onClick={onSetLoopEnd}
              className="wmp-aero-btn px-1.5 py-0.5 rounded text-[9px]"
              title="Tandai Titik Akhir (B)"
            >
              B
            </button>
            {loopRegion.enabled && (
              <button
                onClick={onClearLoop}
                className="px-0.5 text-rose-600 hover:font-black"
                title="Hapus loop A-B"
              >
                ✕
              </button>
            )}
          </div>

          {/* Clear Sound (WMP SRS WOW Audio Effects) */}
          {onToggleReplayGain && (
            <button
              onClick={onToggleReplayGain}
              className={`wmp-aero-pill px-2.5 py-0.5 flex items-center gap-1 text-[9px] sm:text-[10px] font-black transition-all active:scale-95 shadow-sm relative overflow-hidden group flex-shrink-0 ${
                replayGainEnabled
                  ? 'bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 text-slate-950 border-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.45)]'
                  : 'text-slate-700 hover:text-sky-950'
              }`}
              title={`Clear Sound (SRS WOW / Normalisasi ReplayGain -14 LUFS) [Offset: ${replayGainDb > 0 ? '+' : ''}${replayGainDb} dB]`}
              aria-label="Aktifkan Clear Sound ReplayGain"
            >
              <Sparkles className={`w-3 h-3 ${replayGainEnabled ? 'text-slate-950 animate-pulse' : 'text-slate-500'}`} />
              <span className="tracking-tight">Clear</span>
              {replayGainEnabled && replayGainDb !== 0 && (
                <span className="text-[8px] sm:text-[9px] font-mono font-black bg-black/20 text-slate-900 px-1 py-0.2 rounded-full">
                  {replayGainDb > 0 ? `+${replayGainDb}` : replayGainDb}dB
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* ================= BARIS 2: 100% DEAD-CENTER AUTHENTIC WMP 11 TRANSPORT POD ================= */}
      <div className="w-full flex items-center justify-center py-0.5">
        <div className="wmp-control-pod">
          {/* Left Wing inside Pod - Repeat, Stop, Prev (w-[181px]) */}
          <div className="w-[181px] h-full flex items-center justify-end gap-1.5 pr-1 flex-shrink-0">
            <button
              onClick={onToggleLoop}
              className={`wmp-btn-repeat ${loopRegion.enabled ? 'active' : ''}`}
              title={loopRegion.enabled ? 'Repeat Aktif' : 'Ulangi Pemutaran'}
              aria-label="Repeat Pemutaran"
            />
            <button
              onClick={onStop}
              className="wmp-btn-stop"
              title="Stop"
              aria-label="Stop Pemutaran"
            />
            <button
              onClick={() => onSeek(Math.max(0, currentTime - 10))}
              className="wmp-btn-prev -mr-[1.5px]"
              title="Mundur 10 Detik"
              aria-label="Mundur 10 Detik"
            />
          </div>

          {/* Center Play Orb (w-[42px] h-[43px]) - 100.0% Dead Center in Socket */}
          <div className="w-[42px] h-[43px] flex items-center justify-center flex-shrink-0 z-10">
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

          {/* Right Wing inside Pod - Next & Integrated Master Volume Pill (w-[181px]) */}
          <div className="w-[181px] h-full flex items-center justify-start gap-1.5 pl-1 flex-shrink-0">
            <button
              onClick={() => onSeek(Math.min(duration, currentTime + 10))}
              className="wmp-btn-next -ml-[1.5px]"
              title="Maju 10 Detik"
              aria-label="Maju 10 Detik"
            />

            {/* Integrated Master Volume Pill with Authentic WMP 11 Slider Track & Handle */}
            <div className="flex items-center gap-1.5 bg-white/80 px-2 py-0.5 rounded-full border border-sky-300/80 shadow-2xs">
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
                className="wmp-vol-slider w-14 sm:w-16 cursor-pointer"
                title={`Master Volume: ${Math.round(masterVolume * 100)}%`}
                aria-label="Volume audio master"
              />
              <span className="text-[9px] font-mono text-[#002963] font-black w-5 text-right hidden sm:inline">
                {Math.round(masterVolume * 100)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
