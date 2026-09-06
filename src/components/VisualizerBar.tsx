import React, { useEffect, useRef, useState } from 'react';
import { globalAudioEngine } from '../services/audioEngine';
import { Activity, Radio, BarChart3 } from 'lucide-react';

export type VisualizerMode = 'aero-bars' | 'oscilloscope' | 'frequency-cutoff';

interface VisualizerBarProps {
  height?: number;
  className?: string;
  showControls?: boolean;
}

export const VisualizerBar: React.FC<VisualizerBarProps> = ({
  height = 54,
  className = '',
  showControls = true,
}) => {
  const [mode, setMode] = useState<VisualizerMode>('aero-bars');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);

  // Peak hold array for retro spectrum bars
  const peakHoldRef = useRef<{ val: number; speed: number }[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isSubscribed = true;

    const render = () => {
      if (!isSubscribed) return;

      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const width = rect.width;
      const h = height;

      if (canvas.width !== width * dpr || canvas.height !== h * dpr) {
        canvas.width = width * dpr;
        canvas.height = h * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, h);

      // Deep Aero Glass background
      const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, 'rgba(4, 12, 28, 0.85)');
      bgGrad.addColorStop(0.5, 'rgba(10, 26, 56, 0.7)');
      bgGrad.addColorStop(1, 'rgba(4, 12, 28, 0.9)');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, h);

      // Top specular glass highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.fillRect(0, 0, width, 1);

      const isPlaying = globalAudioEngine.getIsPlaying();

      if (mode === 'aero-bars') {
        // MODE 1: Windows Media Player / Winamp Retro Aero Spectrum
        const spectrum = globalAudioEngine.getMasterSpectrum();
        const barCount = Math.min(48, Math.floor(width / 7));
        const barWidth = (width - barCount * 2) / barCount;

        // Initialize peak hold
        if (peakHoldRef.current.length !== barCount) {
          peakHoldRef.current = Array.from({ length: barCount }, () => ({ val: 0, speed: 0 }));
        }

        for (let i = 0; i < barCount; i++) {
          // Logarithmic bin sampling
          const binIdx = Math.floor(Math.pow(i / barCount, 1.8) * Math.min(spectrum.length, 512));
          let rawVal = isPlaying && spectrum.length > 0 ? spectrum[binIdx] || 0 : 0;

          // Idle subtle pulse if paused
          if (!isPlaying) {
            rawVal = 0;
          }

          const percent = Math.min(1, Math.max(0.04, rawVal / 255));
          const barH = percent * (h - 8);
          const x = i * (barWidth + 2) + 2;
          const y = h - 4 - barH;

          // Update peak hold
          const peak = peakHoldRef.current[i];
          if (barH >= peak.val) {
            peak.val = barH;
            peak.speed = 0.2;
          } else {
            peak.val = Math.max(0, peak.val - peak.speed);
            peak.speed += 0.08; // gravity
          }

          // Bar gradient (Turquoise to Cyan to Neon Amber/Pink at peak)
          const barGrad = ctx.createLinearGradient(0, h, 0, y);
          barGrad.addColorStop(0, '#06b6d4');   // Cyan
          barGrad.addColorStop(0.65, '#38bdf8'); // Sky blue
          barGrad.addColorStop(0.88, '#f59e0b'); // Amber
          barGrad.addColorStop(1, '#f43f5e');   // Rose / Peak

          ctx.fillStyle = barGrad;
          ctx.fillRect(x, y, Math.max(2, barWidth), barH);

          // Top highlight dot on active bar
          ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
          ctx.fillRect(x, y, Math.max(2, barWidth), 1);

          // Falling peak hold cap
          if (peak.val > 2) {
            const peakY = h - 4 - peak.val;
            ctx.fillStyle = '#f8fafc';
            ctx.shadowColor = '#38bdf8';
            ctx.shadowBlur = 4;
            ctx.fillRect(x, Math.max(2, peakY), Math.max(2, barWidth), 1.5);
            ctx.shadowBlur = 0;
          }
        }
      } else if (mode === 'oscilloscope') {
        // MODE 2: Retro CRT Phosphor Oscilloscope
        const wave = globalAudioEngine.getMasterWaveform();
        ctx.strokeStyle = '#00f2fe';
        ctx.shadowColor = '#00c6ff';
        ctx.shadowBlur = 6;
        ctx.lineWidth = 1.8;
        ctx.beginPath();

        const sliceWidth = width / (wave.length > 0 ? wave.length : 1);
        let x = 0;

        for (let i = 0; i < wave.length; i++) {
          const v = isPlaying && wave.length > 0 ? (wave[i] - 128) / 128.0 : 0;
          const y = h / 2 + v * (h * 0.42);

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          x += sliceWidth;
        }

        ctx.stroke();
        ctx.shadowBlur = 0;
      } else if (mode === 'frequency-cutoff') {
        // MODE 3: SpotiFLAC Spectral Cutoff Visualizer
        const spectrum = globalAudioEngine.getMasterSpectrum();
        const nyquist = 22050;

        // Draw frequency guides
        const markers = [
          { f: 1000, label: '1k' },
          { f: 10000, label: '10k' },
          { f: 16000, label: '16k (MP3)', color: '#f43f5e' },
          { f: 18500, label: '18.5k', color: '#f59e0b' },
          { f: 20000, label: '20k (FLAC)', color: '#10b981' },
        ];

        markers.forEach((m) => {
          const markX = (Math.log10(m.f / 20) / Math.log10(nyquist / 20)) * width;
          if (markX >= 0 && markX <= width) {
            ctx.strokeStyle = m.color ? `${m.color}50` : 'rgba(255, 255, 255, 0.1)';
            ctx.beginPath();
            ctx.moveTo(markX, 0);
            ctx.lineTo(markX, h);
            ctx.stroke();

            ctx.fillStyle = m.color || 'rgba(255, 255, 255, 0.4)';
            ctx.font = '8px monospace';
            ctx.fillText(m.label, markX + 2, 10);
          }
        });

        // Continuous curve
        ctx.beginPath();
        const binCount = spectrum.length || 512;
        ctx.moveTo(0, h);

        for (let i = 0; i < binCount; i++) {
          const raw = isPlaying && spectrum.length > 0 ? spectrum[i] : 0;
          const freq = (i / binCount) * nyquist;
          const px = (Math.log10(Math.max(20, freq) / 20) / Math.log10(nyquist / 20)) * width;
          const py = h - (raw / 255) * (h - 6);
          ctx.lineTo(px, py);
        }

        ctx.lineTo(width, h);
        const curveGrad = ctx.createLinearGradient(0, 0, width, 0);
        curveGrad.addColorStop(0, '#06b6d4');
        curveGrad.addColorStop(0.7, '#10b981');
        curveGrad.addColorStop(0.85, '#f59e0b');
        curveGrad.addColorStop(1, '#f43f5e');

        ctx.fillStyle = 'rgba(6, 182, 212, 0.2)';
        ctx.fill();
        ctx.strokeStyle = curveGrad;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      ctx.restore();
      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      isSubscribed = false;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [mode, height]);

  return (
    <div className={`relative overflow-hidden rounded-xl border border-cyan-500/30 shadow-inner bg-[#040c1c] ${className}`}>
      <canvas
        ref={canvasRef}
        className="w-full block"
        style={{ height: `${height}px` }}
        title="Retro Aero Frutiger Live Visualizer"
      />

      {showControls && (
        <div className="absolute top-1.5 right-2 flex items-center gap-1 z-10 bg-black/40 backdrop-blur-md px-1.5 py-0.5 rounded-lg border border-cyan-500/20">
          <button
            onClick={() => setMode('aero-bars')}
            className={`p-1 rounded text-[10px] transition ${
              mode === 'aero-bars'
                ? 'bg-cyan-500/30 text-cyan-300 font-bold border border-cyan-400/40'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Aero Peak Spectrum"
          >
            <BarChart3 className="w-3 h-3" />
          </button>
          <button
            onClick={() => setMode('oscilloscope')}
            className={`p-1 rounded text-[10px] transition ${
              mode === 'oscilloscope'
                ? 'bg-cyan-500/30 text-cyan-300 font-bold border border-cyan-400/40'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Retro Oscilloscope CRT"
          >
            <Radio className="w-3 h-3" />
          </button>
          <button
            onClick={() => setMode('frequency-cutoff')}
            className={`p-1 rounded text-[10px] transition ${
              mode === 'frequency-cutoff'
                ? 'bg-cyan-500/30 text-cyan-300 font-bold border border-cyan-400/40'
                : 'text-slate-400 hover:text-white'
            }`}
            title="SpotiFLAC Cutoff Spectrum"
          >
            <Activity className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
};
