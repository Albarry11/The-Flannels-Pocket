/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        flannel: {
          vocal: '#f43f5e',     // rose-500
          lead: '#f59e0b',      // amber-500
          rhythm: '#10b981',    // emerald-500
          bass: '#06b6d4',      // cyan-500
          drums: '#8b5cf6',     // violet-500
          other: '#64748b',     // slate-500
          dark: '#0a0b10',
          card: '#12141c',
          panel: '#181b26',
          border: '#242838',
          accent: '#6366f1',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '1' },
        },
        beatFlash: {
          '0%': { transform: 'scale(1.25)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '0.3' },
        }
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'beat-flash': 'beatFlash 0.15s ease-out forwards',
      }
    },
  },
  plugins: [],
}
