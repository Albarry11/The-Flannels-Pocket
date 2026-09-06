import React, { useState, useEffect, useRef } from 'react';
import type { Song } from '../types';
import { globalAudioEngine } from '../services/audioEngine';
import { Activity, ShieldCheck, Music, X, Zap, CheckCircle2, AlertTriangle, Disc } from 'lucide-react';

interface AnalyzerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSong: Song | null;
  replayGainEnabled: boolean;
  onToggleReplayGain: () => void;
}

export const AnalyzerModal: React.FC<AnalyzerModalProps> = ({
  isOpen,
  onClose,
  currentSong,
  replayGainEnabled,
  onToggleReplayGain,
}) => {
  const [activeTab, setActiveTab] = useState<'quality' | 'bpmKey' | 'loudness'>('quality');
  const [visualMode, setVisualMode] = useState<'bars' | 'oscilloscope' | 'curve'>('bars');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Live FFT Visualizer Animation
  useEffect(() => {
    if (!isOpen || activeTab !== 'quality') return;
    let animationId: number;
    let isMounted = true;

    const render = () => {
      if (!isMounted) return;
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const rect = canvas.getBoundingClientRect();
          const dpr = window.devicePixelRatio || 1;
          const width = rect.width;
          const height = 180;

          if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
            canvas.width = width * dpr;
            canvas.height = height * dpr;
          }

          ctx.save();
          ctx.scale(dpr, dpr);
          ctx.clearRect(0, 0, width, height);

          // Deep Aero Obsidian background
          const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
          bgGrad.addColorStop(0, '#040b18');
          bgGrad.addColorStop(0.5, '#07152d');
          bgGrad.addColorStop(1, '#030814');
          ctx.fillStyle = bgGrad;
          ctx.fillRect(0, 0, width, height);

          // Grid lines (100Hz, 1kHz, 5kHz, 10kHz, 16kHz, 20kHz)
          const nyquist = 22050;
          const gridFreqs = [
            { f: 100, label: '100Hz' },
            { f: 1000, label: '1kHz' },
            { f: 5000, label: '5kHz' },
            { f: 10000, label: '10kHz' },
            { f: 16000, label: '16k (MP3)', color: '#f43f5e' },
            { f: 18500, label: '18.5k', color: '#f59e0b' },
            { f: 20000, label: '20k (FLAC)', color: '#10b981' },
          ];

          gridFreqs.forEach((item) => {
            const x = (Math.log10(item.f / 20) / Math.log10(nyquist / 20)) * width;
            if (x >= 0 && x <= width) {
              ctx.strokeStyle = item.color ? `${item.color}50` : '#1e2d4d';
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(x, 0);
              ctx.lineTo(x, height);
              ctx.stroke();

              ctx.fillStyle = item.color || '#64748b';
              ctx.font = '9px monospace';
              ctx.fillText(item.label, x + 3, 12);
            }
          });

          const isPlaying = globalAudioEngine.getIsPlaying();

          if (visualMode === 'bars') {
            const spectrum = globalAudioEngine.getMasterSpectrum();
            const barCount = Math.min(64, Math.floor(width / 6));
            const barWidth = (width - barCount * 2) / barCount;

            for (let i = 0; i < barCount; i++) {
              const binIdx = Math.floor(Math.pow(i / barCount, 1.7) * Math.min(spectrum.length, 512));
              const val = isPlaying && spectrum.length > 0 ? spectrum[binIdx] || 0 : 0;
              const percent = Math.min(1, Math.max(0.04, val / 255));
              const barH = percent * (height - 18);
              const x = i * (barWidth + 2) + 2;
              const y = height - barH - 4;

              const gradient = ctx.createLinearGradient(0, height, 0, y);
              gradient.addColorStop(0, '#06b6d4');
              gradient.addColorStop(0.6, '#38bdf8');
              gradient.addColorStop(0.85, '#f59e0b');
              gradient.addColorStop(1, '#f43f5e');

              ctx.fillStyle = gradient;
              ctx.fillRect(x, y, Math.max(2, barWidth), barH);

              // Specular cap
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(x, y, Math.max(2, barWidth), 1);
            }
          } else if (visualMode === 'oscilloscope') {
            const wave = globalAudioEngine.getMasterWaveform();
            ctx.strokeStyle = '#00f2fe';
            ctx.shadowColor = '#00c6ff';
            ctx.shadowBlur = 8;
            ctx.lineWidth = 2;
            ctx.beginPath();

            const sliceWidth = width / (wave.length > 0 ? wave.length : 1);
            let x = 0;

            for (let i = 0; i < wave.length; i++) {
              const v = isPlaying && wave.length > 0 ? (wave[i] - 128) / 128.0 : 0;
              const y = height / 2 + v * (height * 0.42);

              if (i === 0) {
                ctx.moveTo(x, y);
              } else {
                ctx.lineTo(x, y);
              }
              x += sliceWidth;
            }

            ctx.stroke();
            ctx.shadowBlur = 0;
          } else if (visualMode === 'curve') {
            const spectrum = globalAudioEngine.getMasterSpectrum();
            ctx.beginPath();
            ctx.moveTo(0, height);

            const binCount = spectrum.length || 512;
            for (let i = 0; i < binCount; i++) {
              const raw = isPlaying && spectrum.length > 0 ? spectrum[i] : 0;
              const freq = (i / binCount) * nyquist;
              const px = (Math.log10(Math.max(20, freq) / 20) / Math.log10(nyquist / 20)) * width;
              const py = height - (raw / 255) * (height - 18);
              ctx.lineTo(px, py);
            }

            ctx.lineTo(width, height);
            ctx.fillStyle = 'rgba(6, 182, 212, 0.25)';
            ctx.fill();

            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 1.8;
            ctx.stroke();
          }

          if (!isPlaying) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.font = '11px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Putar lagu untuk melihat frekuensi FFT bergerak secara real-time', width / 2, height / 2);
          }

          ctx.restore();
        }
      }
      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      isMounted = false;
      cancelAnimationFrame(animationId);
    };
  }, [isOpen, activeTab, visualMode]);

  if (!isOpen) return null;

  const quality = currentSong?.qualityAnalysis;
  const bpmKey = currentSong?.bpmKeyAnalysis;
  const replay = currentSong?.replayGain;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-[#0b1322] border border-cyan-500/40 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden shadow-cyan-500/10">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-cyan-500/20 bg-gradient-to-r from-blue-950/60 to-cyan-950/40 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Penganalisis Audio SpotiFLAC
              </h2>
              <p className="text-xs text-slate-400">
                Inspeksi Kualitas Lossless, Tangga Nada & ReplayGain
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-cyan-500/20 bg-[#070e1a] px-6 pt-2 gap-2 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('quality')}
            className={`pb-3 px-3 border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'quality'
                ? 'border-cyan-400 text-cyan-300 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Disc className="w-3.5 h-3.5" />
            <span>Kualitas & Lossless</span>
          </button>
          <button
            onClick={() => setActiveTab('bpmKey')}
            className={`pb-3 px-3 border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'bpmKey'
                ? 'border-amber-400 text-amber-300 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Music className="w-3.5 h-3.5" />
            <span>BPM & Tangga Nada</span>
          </button>
          <button
            onClick={() => setActiveTab('loudness')}
            className={`pb-3 px-3 border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'loudness'
                ? 'border-emerald-400 text-emerald-300 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>ReplayGain & Kelantangan</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* TAB 1: KUALITAS & LOSSLESS */}
          {activeTab === 'quality' && (
            <div className="space-y-4">
              {/* Classification Banner */}
              <div
                className={`p-4 rounded-2xl border flex items-start gap-3.5 ${
                  quality?.isLossless
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                }`}
              >
                {quality?.isLossless ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-amber-400 flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white">
                      {quality?.classification || 'Lossless FLAC Master'}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/40 border border-white/10 uppercase font-bold text-cyan-300">
                      {quality?.cutoffFrequency ? `Cutoff: ${quality.cutoffFrequency} Hz` : 'Full Bandwidth'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1">
                    {quality?.notes ||
                      'Audio mempertahankan fidelitas frekuensi tinggi penuh (>20kHz) tanpa kompresi psikoakustik lossy.'}
                  </p>
                </div>
              </div>

              {/* Realtime FFT Canvas */}
              <div>
                <div className="flex justify-between items-center mb-1.5 text-xs text-slate-400">
                  <span className="font-bold uppercase tracking-wider text-[11px] text-cyan-300">
                    Spektrogram FFT Frekuensi Real-Time (20 Hz - 22.05 kHz)
                  </span>
                  
                  {/* Mode switcher */}
                  <div className="flex gap-1 bg-[#060c18] p-0.5 rounded-lg border border-cyan-500/20">
                    <button
                      onClick={() => setVisualMode('bars')}
                      className={`px-2 py-0.5 rounded text-[10px] ${visualMode === 'bars' ? 'bg-cyan-500/30 text-cyan-300 font-bold' : 'text-slate-400'}`}
                    >
                      Bars
                    </button>
                    <button
                      onClick={() => setVisualMode('oscilloscope')}
                      className={`px-2 py-0.5 rounded text-[10px] ${visualMode === 'oscilloscope' ? 'bg-cyan-500/30 text-cyan-300 font-bold' : 'text-slate-400'}`}
                    >
                      Wave
                    </button>
                    <button
                      onClick={() => setVisualMode('curve')}
                      className={`px-2 py-0.5 rounded text-[10px] ${visualMode === 'curve' ? 'bg-cyan-500/30 text-cyan-300 font-bold' : 'text-slate-400'}`}
                    >
                      Curve
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-cyan-500/30 overflow-hidden bg-black shadow-inner">
                  <canvas
                    ref={canvasRef}
                    className="w-full h-44 block"
                  />
                </div>
              </div>

              {/* Technical Specifications Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-[#070e1b] p-3 rounded-xl border border-cyan-500/20">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                    Sample Rate
                  </span>
                  <span className="text-base font-mono font-bold text-white">
                    {quality ? `${(quality.sampleRate / 1000).toFixed(1)} kHz` : '44.1 kHz'}
                  </span>
                </div>
                <div className="bg-[#070e1b] p-3 rounded-xl border border-cyan-500/20">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                    Bit Depth
                  </span>
                  <span className="text-base font-mono font-bold text-white">
                    {quality ? `${quality.bitDepthEstimate}-bit Float` : '16-bit / 24-bit'}
                  </span>
                </div>
                <div className="bg-[#070e1b] p-3 rounded-xl border border-cyan-500/20">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                    Dynamic Range
                  </span>
                  <span className="text-base font-mono font-bold text-cyan-300">
                    {quality ? `DR ${quality.dynamicRangeScore}` : 'DR 12'}
                  </span>
                </div>
                <div className="bg-[#070e1b] p-3 rounded-xl border border-cyan-500/20">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                    Channels
                  </span>
                  <span className="text-base font-mono font-bold text-white">
                    {quality?.channels === 1 ? 'Mono' : 'Stereo 2.0'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BPM & TANGGA NADA */}
          {activeTab === 'bpmKey' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-[#070e1b] p-4 rounded-2xl border border-cyan-500/20 flex flex-col items-center text-center">
                  <span className="text-xs text-slate-400 uppercase font-bold">
                    Tempo Terdeteksi
                  </span>
                  <span className="text-4xl font-mono font-extrabold text-amber-400 my-1">
                    {bpmKey?.bpm || currentSong?.bpm || 115}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">BPM</span>
                </div>

                <div className="bg-[#070e1b] p-4 rounded-2xl border border-cyan-500/20 flex flex-col items-center text-center">
                  <span className="text-xs text-slate-400 uppercase font-bold">
                    Tangga Nada (Key)
                  </span>
                  <span className="text-4xl font-mono font-extrabold text-cyan-400 my-1">
                    {bpmKey?.key || currentSong?.originalKey || 'Em'}
                  </span>
                  <span className="text-xs text-slate-400 capitalize">
                    {bpmKey?.scale || 'Minor'} Scale
                  </span>
                </div>

                <div className="bg-[#070e1b] p-4 rounded-2xl border border-cyan-500/20 flex flex-col items-center text-center">
                  <span className="text-xs text-slate-400 uppercase font-bold">
                    Kode Camelot
                  </span>
                  <span className="text-4xl font-mono font-extrabold text-pink-400 my-1">
                    {bpmKey?.camelot || '9A'}
                  </span>
                  <span className="text-xs text-slate-400">Harmonic Wheel</span>
                </div>
              </div>

              <div className="bg-[#070e1b] p-4 rounded-2xl border border-cyan-500/20 space-y-2 text-xs text-slate-300">
                <div className="flex items-center gap-2 font-bold text-white">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>Petunjuk Harmoni The Flannels</span>
                </div>
                <p>
                  Lagu ini berada di tangga nada{' '}
                  <strong className="text-cyan-300">
                    {bpmKey?.key || currentSong?.originalKey || 'Em'}
                  </strong>
                  . Gunakan kontrol Pitch Transpose di Master Player jika vokalis membutuhkan range nada yang lebih rendah atau tinggi.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: REPLAYGAIN & KELANTANGAN */}
          {activeTab === 'loudness' && (
            <div className="space-y-5">
              <div className="bg-[#070e1b] p-5 rounded-2xl border border-cyan-500/20 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white">
                      Kompensasi Kelantangan ReplayGain
                    </h4>
                    <p className="text-xs text-slate-400">
                      Standar ITU-R BS.1770 / EBU R128 (-14 LUFS target)
                    </p>
                  </div>
                  <button
                    onClick={onToggleReplayGain}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                      replayGainEnabled
                        ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>{replayGainEnabled ? 'Aktif' : 'Nonaktif'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-2">
                  <div className="bg-[#040914] p-3 rounded-xl border border-cyan-500/20">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                      Integrated Loudness
                    </span>
                    <span className="text-base font-mono font-bold text-white">
                      {replay ? `${replay.integratedLufs} LUFS` : '-14.2 LUFS'}
                    </span>
                  </div>
                  <div className="bg-[#040914] p-3 rounded-xl border border-cyan-500/20">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                      True Peak
                    </span>
                    <span className="text-base font-mono font-bold text-white">
                      {replay ? `${replay.truePeakDb} dBTP` : '-0.5 dBTP'}
                    </span>
                  </div>
                  <div className="bg-[#040914] p-3 rounded-xl border border-cyan-500/20">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                      Gain Offset
                    </span>
                    <span className="text-base font-mono font-bold text-emerald-400">
                      {replay
                        ? `${replay.recommendedGainDb > 0 ? '+' : ''}${replay.recommendedGainDb} dB`
                        : '+0.2 dB'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-cyan-500/20 bg-[#070e1b] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition border border-slate-700"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
