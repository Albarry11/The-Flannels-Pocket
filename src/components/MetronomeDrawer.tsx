import React, { useState, useEffect } from 'react';
import { Play, Pause, Volume2, X, Music, Radio } from 'lucide-react';
import { globalMetronome } from '../services/metronomeEngine';
import type { MetronomeSound } from '../services/metronomeEngine';

interface MetronomeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  defaultBpm?: number;
}

export const MetronomeDrawer: React.FC<MetronomeDrawerProps> = ({
  isOpen,
  onClose,
  defaultBpm,
}) => {
  const [bpm, setBpm] = useState<number>(defaultBpm || 115);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [beatsPerBar, setBeatsPerBar] = useState<number>(4);
  const [currentBeat, setCurrentBeat] = useState<number>(0);
  const [isDownbeat, setIsDownbeat] = useState<boolean>(false);
  const [sound, setSound] = useState<MetronomeSound>('woodblock');
  const [volume, setVolume] = useState<number>(0.8);

  useEffect(() => {
    if (defaultBpm) {
      setBpm(defaultBpm);
      globalMetronome.setBpm(defaultBpm);
    }
  }, [defaultBpm]);

  useEffect(() => {
    globalMetronome.onBeat((beat, downbeat) => {
      setCurrentBeat(beat);
      setIsDownbeat(downbeat);
    });
    return () => {
      globalMetronome.stop();
    };
  }, []);

  if (!isOpen) return null;

  const handleTogglePlay = () => {
    const running = globalMetronome.toggle();
    setIsPlaying(running);
  };

  const handleBpmChange = (newBpm: number) => {
    const clamped = Math.max(30, Math.min(260, newBpm));
    setBpm(clamped);
    globalMetronome.setBpm(clamped);
  };

  const handleTap = () => {
    const calculated = globalMetronome.tapTempo();
    setBpm(calculated);
  };

  const handleBeatsPerBarChange = (b: number) => {
    setBeatsPerBar(b);
    globalMetronome.setBeatsPerBar(b);
  };

  const handleSoundChange = (s: MetronomeSound) => {
    setSound(s);
    globalMetronome.setSound(s);
  };

  const handleVolumeChange = (v: number) => {
    setVolume(v);
    globalMetronome.setVolume(v);
  };

  return (
    <div className="fixed inset-x-0 bottom-24 z-50 px-4 pointer-events-none">
      <div className="max-w-md mx-auto bg-flannel-card/95 backdrop-blur-xl border border-amber-500/40 rounded-3xl p-5 shadow-2xl pointer-events-auto shadow-amber-500/10">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-flannel-border pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Radio className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold text-white tracking-tight">Akustik Metronome</h3>
                {isPlaying && isDownbeat && (
                  <span className="text-[9px] bg-amber-400 text-black px-1.5 rounded font-black animate-pulse">
                    BAR
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">Web Audio Precision Clock (No Drift)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Visual Beat Indicator Dots */}
        <div className="flex justify-center items-center gap-3 my-3">
          {Array.from({ length: beatsPerBar }).map((_, idx) => {
            const isActive = isPlaying && currentBeat === idx;
            const isFirst = idx === 0;

            return (
              <div
                key={idx}
                className={`w-5 h-5 rounded-full transition-all duration-75 flex items-center justify-center text-[10px] font-bold ${
                  isActive
                    ? isFirst
                      ? 'bg-amber-400 scale-125 shadow-lg shadow-amber-400/80 text-black'
                      : 'bg-indigo-400 scale-110 shadow-md shadow-indigo-400/50 text-black'
                    : 'bg-slate-800 text-slate-500 border border-slate-700'
                }`}
              >
                {idx + 1}
              </div>
            );
          })}
        </div>

        {/* BPM Display & Steppers */}
        <div className="flex items-center justify-center gap-3 my-4">
          <button
            onClick={() => handleBpmChange(bpm - 5)}
            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-mono font-bold text-slate-300 border border-slate-700"
          >
            -5
          </button>
          <button
            onClick={() => handleBpmChange(bpm - 1)}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-bold text-slate-300 border border-slate-700 flex items-center justify-center"
          >
            -
          </button>

          <div className="flex flex-col items-center min-w-[110px]">
            <span className="text-4xl font-mono font-extrabold text-white tracking-tight">
              {bpm}
            </span>
            <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-widest">
              BPM
            </span>
          </div>

          <button
            onClick={() => handleBpmChange(bpm + 1)}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-bold text-slate-300 border border-slate-700 flex items-center justify-center"
          >
            +
          </button>
          <button
            onClick={() => handleBpmChange(bpm + 5)}
            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-mono font-bold text-slate-300 border border-slate-700"
          >
            +5
          </button>
        </div>

        {/* BPM Slider */}
        <input
          type="range"
          min="40"
          max="240"
          value={bpm}
          onChange={(e) => handleBpmChange(parseInt(e.target.value))}
          className="w-full h-2 mb-4"
        />

        {/* Tap Tempo & Play/Stop */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            onClick={handleTap}
            className="py-3 px-4 rounded-xl bg-flannel-panel hover:bg-slate-800 border border-flannel-border text-slate-200 text-xs font-bold uppercase tracking-wider transition active:scale-95 flex items-center justify-center gap-1.5"
          >
            <Music className="w-3.5 h-3.5 text-amber-400" />
            <span>Tap Tempo</span>
          </button>

          <button
            onClick={handleTogglePlay}
            className={`py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition active:scale-95 flex items-center justify-center gap-1.5 shadow-lg ${
              isPlaying
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
                : 'bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/25'
            }`}
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
            <span>{isPlaying ? 'Stop' : 'Start'}</span>
          </button>
        </div>

        {/* Time Signature & Sound Selection */}
        <div className="space-y-3 pt-3 border-t border-flannel-border text-xs">
          {/* Time Signature */}
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-[11px] uppercase">Birama:</span>
            <div className="flex gap-1">
              {[2, 3, 4, 6].map((ts) => (
                <button
                  key={ts}
                  onClick={() => handleBeatsPerBarChange(ts)}
                  className={`px-2.5 py-1 rounded-lg font-mono font-bold transition ${
                    beatsPerBar === ts
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {ts === 6 ? '6/8' : `${ts}/4`}
                </button>
              ))}
            </div>
          </div>

          {/* Sound Presets */}
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-[11px] uppercase">Suara:</span>
            <div className="flex gap-1">
              {(['woodblock', 'beep', 'rimshot', 'cowbell'] as MetronomeSound[]).map((snd) => (
                <button
                  key={snd}
                  onClick={() => handleSoundChange(snd)}
                  className={`px-2 py-1 rounded-lg text-[11px] capitalize transition ${
                    sound === snd
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-semibold'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {snd}
                </button>
              ))}
            </div>
          </div>

          {/* Volume */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-slate-400 text-[11px] uppercase flex items-center gap-1">
              <Volume2 className="w-3.5 h-3.5" /> Vol:
            </span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className="w-36 h-1.5"
            />
          </div>
        </div>

      </div>
    </div>
  );
};
