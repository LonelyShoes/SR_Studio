/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
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
        }
      },
      fontFamily: {
        display: ['"Space Grotesk"', '"Plus Jakarta Sans"', 'sans-serif'],
        sans: ['"Inter"', '"IBM Plex Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"IBM Plex Mono"', 'monospace'],
        heading: ['"Oswald"', '"Space Grotesk"', 'sans-serif']
      },
      backgroundImage: {
        'blueprint-grid': "linear-gradient(to right, rgba(28, 43, 46, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(28, 43, 46, 0.05) 1px, transparent 1px)",
        'dot-grid': "radial-gradient(rgba(28, 43, 46, 0.08) 1px, transparent 1px)",
      },
      boxShadow: {
        'blueprint': '0 4px 20px -2px rgba(16, 50, 74, 0.12), 0 2px 6px -1px rgba(16, 50, 74, 0.08)',
        'blueprint-lg': '0 12px 32px -4px rgba(16, 50, 74, 0.16), 0 4px 12px -2px rgba(16, 50, 74, 0.08)',
        'glow-primary': '0 0 20px -3px rgba(30, 75, 107, 0.35)',
      }
    },
  },
  plugins: [],
}
