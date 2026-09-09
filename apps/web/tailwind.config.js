/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Light Theme Surface & Base Tokens (Mapped for seamless compatibility)
        obsidian: {
          base: '#FAFAFA',      // Soft neutral background
          surface1: '#FFFFFF',  // Clean white card surface
          surface2: '#F8FAFC',  // Light hover / subtle elevation
          border: '#E2E8F0',    // Slate 200 clean border
          hover: '#F1F5F9',     // Slate 100 active hover
        },
        nox: {
          bg: '#FAFAFA',
          surface: '#FFFFFF',
          surfaceHover: '#F8FAFC',
          border: '#E2E8F0',
          borderSubtle: '#F1F5F9',
          primary: '#4F46E5',   // Indigo 600
          primaryLight: '#EEF2FF',
          textMain: '#0F172A',  // Slate 900
          textMuted: '#64748B', // Slate 500
          textSubtle: '#94A3B8',// Slate 400
        },
        brand: {
          indigo: '#4F46E5',   // Indigo 600
          violet: '#7C3AED',   // Violet 600
          emerald: '#059669',  // Emerald 600
          amber: '#D97706',    // Amber 600
          rose: '#E11D48',     // Rose 600
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Outfit', 'sans-serif'],
      },
      boxShadow: {
        'nox-card': '0 1px 3px 0 rgb(0 0 0 / 0.04), 0 1px 2px -1px rgb(0 0 0 / 0.03)',
        'nox-hover': '0 10px 25px -5px rgb(0 0 0 / 0.06), 0 8px 10px -6px rgb(0 0 0 / 0.04)',
        'nox-modal': '0 20px 25px -5px rgb(0 0 0 / 0.08), 0 8px 10px -6px rgb(0 0 0 / 0.04)',
      },
    },
  },
  plugins: [],
};
