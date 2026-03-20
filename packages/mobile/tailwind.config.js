/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  presets: [],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#8b5cf6',
          dark:    '#7c3aed',
          light:   '#a78bfa',
        },
        positive: '#22c55e',
        negative: '#ef4444',
        warning:  '#f59e0b',
        info:     '#3b82f6',
      },
    },
  },
  plugins: [],
};
