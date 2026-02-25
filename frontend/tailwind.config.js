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
        'hero-mid': '#1E0B3E',
        'hero-deep': '#251248',
        'glow-cyan': '#00D4FF',
        'muted-gray': '#9CA3AF',
        'subtle-gray': '#6B7280',
        'dark-border': '#2a2040',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
        serif: ['Lora', 'ui-serif', 'Georgia'],
        script: ['Caveat', 'cursive'],
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
        'dropdown-in': {
          '0%': { opacity: '0', transform: 'translateY(-4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-from-right': {
          from: { transform: 'translateX(40px)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
        'slide-from-left': {
          from: { transform: 'translateX(-40px)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
      },
      animation: {
        'glow-pulse': 'glow-pulse 2.5s ease-in-out infinite',
        'cursor-blink': 'cursor-blink 1s step-end infinite',
        'dropdown-in': 'dropdown-in 150ms ease-out',
        'slide-from-right': 'slide-from-right 300ms ease-out forwards',
        'slide-from-left': 'slide-from-left 300ms ease-out forwards',
      },
    },
  },
  plugins: [],
}
