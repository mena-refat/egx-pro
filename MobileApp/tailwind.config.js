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
          DEFAULT: '#10b981',
          dark: '#059669',
          light: '#34d399',
        },
        surface: {
          primary: '#0a0a0f',
          secondary: '#111118',
          card: '#16161f',
          border: 'rgba(255,255,255,0.07)',
        },
      },
      fontFamily: {
        sans: ['Cairo_400Regular', 'System'],
        'sans-medium': ['Cairo_500Medium', 'System'],
        'sans-bold': ['Cairo_700Bold', 'System'],
      },
    },
  },
};

