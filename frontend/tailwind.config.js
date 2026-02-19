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
        'hero-dark': '#0D0620',
        'glow-cyan': '#00D4FF',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
        serif: ['Lora', 'ui-serif', 'Georgia'],
      },
      keyframes: {
        'glow-pulse': {
          '0%, 100%': {
            boxShadow:
              '0 0 8px 2px rgba(0, 212, 255, 0.35), 0 0 20px 4px rgba(139, 92, 246, 0.25)',
          },
          '50%': {
            boxShadow:
              '0 0 16px 4px rgba(0, 212, 255, 0.55), 0 0 36px 8px rgba(139, 92, 246, 0.40)',
          },
        },
        'cursor-blink': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
      },
      animation: {
        'glow-pulse': 'glow-pulse 2.5s ease-in-out infinite',
        'cursor-blink': 'cursor-blink 1s step-end infinite',
      },
    },
  },
  plugins: [],
}
