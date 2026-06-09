/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy:    { DEFAULT: '#0D1B2A', mid: '#162436', light: '#1F3349', border: '#2A4360' },
        gold:    { DEFAULT: '#C9A84C', light: '#F0D98A', dim: '#7A6228' },
        surface: { DEFAULT: '#142033', 2: '#1A2D44', 3: '#213650' },
      },
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        display: ['Sora', 'Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
