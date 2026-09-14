import React from 'react';
import { Smartphone, RotateCw } from 'lucide-react';

export const LandscapeGuard: React.FC = () => {
  return (
    <div className="fixed inset-0 z-[99999] hidden portrait:flex flex-col items-center justify-center p-6 text-center select-none bg-gradient-to-b from-[#0b2b48] via-[#07192b] to-[#040e19] text-white overflow-hidden">
      {/* Authentic Frutiger Aero glowing backdrop aura */}
      <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-cyan-400/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-blue-500/25 blur-3xl pointer-events-none" />

      {/* Glossy Vista Aero Dialog Container */}
      <div className="relative max-w-sm w-full rounded-3xl p-6 bg-white/10 backdrop-blur-2xl border border-white/30 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col items-center gap-4">
        <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent pointer-events-none rounded-t-3xl" />

        {/* Animated Phone Rotation Graphic */}
        <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-tr from-sky-400 to-blue-600 p-1 flex items-center justify-center shadow-[0_0_30px_rgba(14,165,233,0.6)] border border-white/40">
          <div className="absolute top-1 inset-x-2 h-7 bg-white/40 rounded-xl blur-[1px]" />
          <div className="relative flex items-center justify-center">
            <Smartphone className="w-10 h-10 text-white animate-bounce" />
            <RotateCw className="w-6 h-6 text-cyan-200 absolute -bottom-1 -right-1 animate-spin" style={{ animationDuration: '4s' }} />
          </div>
        </div>

        <div className="space-y-1.5 z-10">
          <span className="inline-block text-[10px] font-mono font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-cyan-400/25 border border-cyan-300/40 text-cyan-200">
            Orientasi Layar
          </span>
          <h2 className="text-lg font-black tracking-tight text-white drop-shadow-sm">
            Putar ke Mode Landscape
          </h2>
          <p className="text-xs text-sky-200/90 leading-relaxed font-medium">
            The Flannels Pocket Studio dirancang untuk performa panggung dan mixing horizontal. Silakan putar HP kamu ke posisi miring / landscape untuk melanjutkan.
          </p>
        </div>

        {/* Vista Pill Notice */}
        <div className="w-full pt-1">
          <div className="w-full py-2 px-3 rounded-xl bg-white/5 border border-white/15 text-[11px] font-mono text-cyan-300 flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span>Kunci rotasi (Auto-Rotate) harus aktif</span>
          </div>
        </div>
      </div>
    </div>
  );
};
