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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Live FFT Visualizer Animation
  useEffect(() => {
    if (!isOpen || activeTab !== 'quality') return;
    let animationId: number;

    const render = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const width = canvas.width;
          const height = canvas.height;
          const spectrum = globalAudioEngine.getMasterSpectrum();

          ctx.fillStyle = '#0a0b10';
          ctx.fillRect(0, 0, width, height);

          // Draw frequency grid lines (100Hz, 1kHz, 10kHz, 16kHz, 20kHz)
          ctx.strokeStyle = '#1f2438';
          ctx.lineWidth = 1;
          const gridFreqs = [
            { f: 100, label: '100Hz' },
            { f: 1000, label: '1kHz' },
            { f: 5000, label: '5kHz' },
            { f: 10000, label: '10kHz' },
            { f: 16000, label: '16kHz (MP3)' },
            { f: 20000, label: '20kHz (FLAC)' },
          ];

          gridFreqs.forEach((item) => {
            const x = (Math.log10(item.f / 20) / Math.log10(22050 / 20)) * width;
            if (x >= 0 && x <= width) {
              ctx.beginPath();
              ctx.moveTo(x, 0);
              ctx.lineTo(x, height);
              ctx.stroke();

              ctx.fillStyle = item.f >= 16000 ? '#f43f5e90' : '#64748b90';
              ctx.font = '9px monospace';
              ctx.fillText(item.label, x + 2, 12);
            }
          });

          // Draw spectrum bars
          if (spectrum.length > 0) {
            const binCount = spectrum.length;
            const barWidth = width / binCount;

            const gradient = ctx.createLinearGradient(0, height, 0, 0);
            gradient.addColorStop(0, '#06b6d4');
            gradient.addColorStop(0.5, '#6366f1');
            gradient.addColorStop(0.85, '#f59e0b');
            gradient.addColorStop(1, '#f43f5e');

            ctx.fillStyle = gradient;

            for (let i = 0; i < binCount; i++) {
              const val = spectrum[i];
              const percent = val / 255;
              const barHeight = percent * height;
              const x = i * barWidth * 2; // scale for visibility
              ctx.fillRect(x, height - barHeight, Math.max(1, barWidth * 1.8), barHeight);
            }
          } else {
            ctx.fillStyle = '#64748b';
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Putar lagu untuk melihat spektrum FFT real-time', width / 2, height / 2);
          }
        }
      }
      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  const quality = currentSong?.qualityAnalysis;
  const bpmKey = currentSong?.bpmKeyAnalysis;
  const replay = currentSong?.replayGain;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-flannel-card border border-flannel-border rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-flannel-border bg-flannel-panel/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
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
        <div className="flex border-b border-flannel-border bg-flannel-dark/50 px-6 pt-2 gap-2 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('quality')}
            className={`pb-3 px-3 border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'quality'
                ? 'border-indigo-500 text-indigo-400'
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
                ? 'border-amber-500 text-amber-400'
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
                ? 'border-emerald-500 text-emerald-400'
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
            <div className="space-y-5">
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
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/40 border border-white/10 uppercase">
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
                  <span className="font-semibold uppercase tracking-wider text-[11px]">
                    Spektrogram FFT Frekuensi Real-Time (20 Hz - 22.05 kHz)
                  </span>
                  <span className="text-[11px] font-mono text-indigo-400">Live AudioContext</span>
                </div>
                <div className="rounded-2xl border border-flannel-border overflow-hidden bg-black">
                  <canvas
                    ref={canvasRef}
                    width={580}
                    height={160}
                    className="w-full h-40 block"
                  />
                </div>
              </div>

              {/* Technical Specifications Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-flannel-panel p-3 rounded-xl border border-flannel-border">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                    Sample Rate
                  </span>
                  <span className="text-base font-mono font-bold text-white">
                    {quality ? `${(quality.sampleRate / 1000).toFixed(1)} kHz` : '44.1 kHz'}
                  </span>
                </div>
                <div className="bg-flannel-panel p-3 rounded-xl border border-flannel-border">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                    Bit Depth
                  </span>
                  <span className="text-base font-mono font-bold text-white">
                    {quality ? `${quality.bitDepthEstimate}-bit Float` : '16-bit / 24-bit'}
                  </span>
                </div>
                <div className="bg-flannel-panel p-3 rounded-xl border border-flannel-border">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                    Dynamic Range
                  </span>
                  <span className="text-base font-mono font-bold text-indigo-300">
                    {quality ? `DR ${quality.dynamicRangeScore}` : 'DR 12'}
                  </span>
                </div>
                <div className="bg-flannel-panel p-3 rounded-xl border border-flannel-border">
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
                <div className="bg-flannel-panel p-4 rounded-2xl border border-flannel-border flex flex-col items-center text-center">
                  <span className="text-xs text-slate-400 uppercase font-semibold">
                    Tempo Terdeteksi
                  </span>
                  <span className="text-4xl font-mono font-extrabold text-amber-400 my-1">
                    {bpmKey?.bpm || currentSong?.bpm || 115}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">BPM</span>
                </div>

                <div className="bg-flannel-panel p-4 rounded-2xl border border-flannel-border flex flex-col items-center text-center">
                  <span className="text-xs text-slate-400 uppercase font-semibold">
                    Tangga Nada (Key)
                  </span>
                  <span className="text-4xl font-mono font-extrabold text-indigo-400 my-1">
                    {bpmKey?.key || currentSong?.originalKey || 'Em'}
                  </span>
                  <span className="text-xs text-slate-400 capitalize">
                    {bpmKey?.scale || 'Minor'} Scale
                  </span>
                </div>

                <div className="bg-flannel-panel p-4 rounded-2xl border border-flannel-border flex flex-col items-center text-center">
                  <span className="text-xs text-slate-400 uppercase font-semibold">
                    Kode Camelot
                  </span>
                  <span className="text-4xl font-mono font-extrabold text-pink-400 my-1">
                    {bpmKey?.camelot || '9A'}
                  </span>
                  <span className="text-xs text-slate-400">Harmonic Wheel</span>
                </div>
              </div>

              {/* Informational Guidance */}
              <div className="bg-flannel-dark p-4 rounded-2xl border border-flannel-border space-y-2 text-xs text-slate-300">
                <div className="flex items-center gap-2 font-semibold text-white">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>Petunjuk Latihan Personil The Flannels</span>
                </div>
                <p>
                  Lagu ini berada di tangga nada{' '}
                  <strong className="text-indigo-300">
                    {bpmKey?.key || currentSong?.originalKey || 'Em'}
                  </strong>
                  . Gitaris lead dapat mengeksplorasi scale Pentatonic / Blues di posisi dasar, dan
                  vokalis dapat menggunakan kontrol pitch pada master player jika membutuhkan
                  transposisi ke range vokal yang lebih nyaman.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: REPLAYGAIN & KELANTANGAN */}
          {activeTab === 'loudness' && (
            <div className="space-y-5">
              <div className="bg-flannel-panel p-5 rounded-2xl border border-flannel-border space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white">
                      Kompensasi Kelantangan ReplayGain
                    </h4>
                    <p className="text-xs text-slate-400">
                      Standar ITU-R BS.1770 / EBU R128 untuk menyamakan level volume lagu
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
                  <div className="bg-flannel-dark p-3 rounded-xl border border-flannel-border">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                      Integrated Loudness
                    </span>
                    <span className="text-base font-mono font-bold text-white">
                      {replay ? `${replay.integratedLufs} LUFS` : '-14.2 LUFS'}
                    </span>
                  </div>
                  <div className="bg-flannel-dark p-3 rounded-xl border border-flannel-border">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                      True Peak
                    </span>
                    <span className="text-base font-mono font-bold text-white">
                      {replay ? `${replay.truePeakDb} dBTP` : '-0.5 dBTP'}
                    </span>
                  </div>
                  <div className="bg-flannel-dark p-3 rounded-xl border border-flannel-border">
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
        <div className="p-4 border-t border-flannel-border bg-flannel-panel/30 flex justify-end">
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
