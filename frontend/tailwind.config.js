/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#6D28D9',
        'primary-lt': '#8B5CF6',
        'neutral-bg': '#F5F5F5',
        'text-dark': '#2C3E50',
        'text-light': '#7F8C8D',
        success: '#27AE60',
        warning: '#F39C12',
        danger: '#E74C3C',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
        serif: ['Lora', 'ui-serif', 'Georgia'],
      },
    },
  },
  plugins: [],
}
