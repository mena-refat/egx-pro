/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#8b5cf6',
          dark:    '#7c3aed',
          light:   '#a78bfa',
        },
        app: {
          bg:     '#0d1117',
          card:   '#161b22',
          hover:  '#1c2128',
          border: '#30363d',
        },
      },
    },
  },
  plugins: [],
};
