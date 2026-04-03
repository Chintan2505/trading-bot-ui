/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        terminal: {
          bg: '#0b0e11',
          card: '#141821',
          border: '#1e2433',
          hover: '#1a2035',
          accent: '#2b3549',
        },
        bull: {
          DEFAULT: '#0ecb81',
          light: '#0ecb8133',
        },
        bear: {
          DEFAULT: '#f6465d',
          light: '#f6465d33',
        },
        gold: '#f0b90b',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(14, 203, 129, 0.2)' },
          '100%': { boxShadow: '0 0 20px rgba(14, 203, 129, 0.4)' },
        }
      }
    },
  },
  plugins: [],
}
