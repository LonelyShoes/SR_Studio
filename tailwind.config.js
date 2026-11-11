/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      screens: {
        xs: '480px',
      },
      // Token di bawah ini sudah lama dipakai di markup (mis. `ml-8.5`, `shadow-xs`,
      // `animate-fadeIn`) tetapi belum pernah didefinisikan, sehingga tidak menghasilkan CSS.
      spacing: {
        0.2: '0.05rem',
        0.8: '0.2rem',
        4.5: '1.125rem',
        8.5: '2.125rem',
        15: '3.75rem',
      },
      colors: {
        blueprint: {
          50: '#F0F5FA',
          100: '#E4EDF2',
          200: '#C2D7E4',
          300: '#94BBD0',
          400: '#5894B5',
          500: '#2E739B',
          600: '#1E4B6B',
          700: '#183D57',
          800: '#10324A',
          900: '#0B2233',
          950: '#071521',
        },
        terracotta: {
          50: '#FDF6F3',
          100: '#F7E9E2',
          200: '#F0D1C4',
          300: '#E2AB96',
          400: '#CF7B5C',
          500: '#B5451B',
          600: '#A63B13',
          700: '#8A2E0D',
          800: '#70270F',
          900: '#5C2210',
          950: '#3B150A',
        },
        paper: {
          50: '#FCFDFC',
          100: '#F7F9F7',
          200: '#F3F5F3',
          300: '#EAEDEA',
          400: '#D6DCD8',
          500: '#B8C2BC',
          600: '#8B9491',
          700: '#5B6663',
          800: '#2E3836',
          900: '#1C2B2E',
          950: '#111B1D',
        },
        slate: {
          850: '#172033',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', '"Plus Jakarta Sans"', 'sans-serif'],
        sans: ['"Inter"', '"IBM Plex Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"IBM Plex Mono"', 'monospace'],
        heading: ['"Oswald"', '"Space Grotesk"', 'sans-serif'],
      },
      backgroundImage: {
        'blueprint-grid':
          'linear-gradient(to right, rgba(28, 43, 46, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(28, 43, 46, 0.05) 1px, transparent 1px)',
        'dot-grid': 'radial-gradient(rgba(28, 43, 46, 0.08) 1px, transparent 1px)',
      },
      boxShadow: {
        '2xs': '0 1px rgb(0 0 0 / 0.05)',
        xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        blueprint: '0 4px 20px -2px rgba(16, 50, 74, 0.12), 0 2px 6px -1px rgba(16, 50, 74, 0.08)',
        'blueprint-lg': '0 12px 32px -4px rgba(16, 50, 74, 0.16), 0 4px 12px -2px rgba(16, 50, 74, 0.08)',
        'glow-primary': '0 0 20px -3px rgba(30, 75, 107, 0.35)',
      },
      backdropBlur: {
        xs: '2px',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        scaleUp: {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 160ms ease-out both',
        scaleUp: 'scaleUp 180ms cubic-bezier(0.16, 1, 0.3, 1) both',
        slideUp: 'slideUp 220ms cubic-bezier(0.16, 1, 0.3, 1) both',
      },
    },
  },
  plugins: [],
};
