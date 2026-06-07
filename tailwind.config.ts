import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Brand
        brand: {
          50: '#E8F4FD',
          100: '#C5E3FA',
          200: '#9DD0F6',
          500: '#2563EB',
          600: '#1D4ED8',
          700: '#1E40AF',
          900: '#1E3A5F',
        },
        // Semantic
        positive: {
          light: '#DCFCE7',
          DEFAULT: '#22C55E',
          dark: '#166534',
        },
        negative: {
          light: '#FEE2E2',
          DEFAULT: '#EF4444',
          dark: '#991B1B',
        },
        warning: {
          light: '#FEF3C7',
          DEFAULT: '#F59E0B',
          dark: '#92400E',
        },
        // Data visualisation
        chart: {
          candle: {
            up: '#22C55E',
            down: '#EF4444',
          },
          sma20: '#3B82F6',
          sma50: '#F97316',
          sma200: '#8B5CF6',
          ema12: '#06B6D4',
          ema26: '#EC4899',
          bollinger: {
            fill: '#3B82F620',
            line: '#3B82F6',
          },
          rsi: '#8B5CF6',
          volume: '#94A3B8',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'flash-green': 'flashGreen 300ms ease-out',
        'flash-red': 'flashRed 300ms ease-out',
        'slide-in': 'slideIn 200ms ease-out',
      },
      keyframes: {
        flashGreen: {
          '0%': { backgroundColor: '#DCFCE7' },
          '100%': { backgroundColor: 'transparent' },
        },
        flashRed: {
          '0%': { backgroundColor: '#FEE2E2' },
          '100%': { backgroundColor: 'transparent' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-10px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
