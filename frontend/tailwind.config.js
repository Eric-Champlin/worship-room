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
        'hero-bg': '#08051A',
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
        'golden-glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(251, 191, 36, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(251, 191, 36, 0.6)' },
        },
        'breathe-expand': {
          '0%': { transform: 'scale(0.6)', opacity: '0.7' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'breathe-contract': {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '100%': { transform: 'scale(0.6)', opacity: '0.7' },
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'waveform-bar-1': {
          '0%, 100%': { height: '4px' },
          '50%': { height: '16px' },
        },
        'waveform-bar-2': {
          '0%, 100%': { height: '8px' },
          '50%': { height: '20px' },
        },
        'waveform-bar-3': {
          '0%, 100%': { height: '6px' },
          '50%': { height: '12px' },
        },
        'artwork-drift': {
          '0%': { backgroundPosition: '50% 50%' },
          '50%': { backgroundPosition: '52% 48%' },
          '100%': { backgroundPosition: '50% 50%' },
        },
        'sound-pulse': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.02)' },
        },
        'scene-pulse': {
          '0%, 100%': { opacity: '0.85' },
          '50%': { opacity: '1' },
        },
        'scene-glow': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.02)' },
        },
        'mood-pulse': {
          '0%, 100%': { opacity: '0.7', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.05)' },
        },
      },
      animation: {
        'glow-pulse': 'glow-pulse 2.5s ease-in-out infinite',
        'cursor-blink': 'cursor-blink 1s step-end infinite',
        'dropdown-in': 'dropdown-in 150ms ease-out',
        'slide-from-right': 'slide-from-right 300ms ease-out forwards',
        'slide-from-left': 'slide-from-left 300ms ease-out forwards',
        'golden-glow': 'golden-glow 2s ease-in-out infinite',
        'breathe-expand': 'breathe-expand 4s ease-in-out forwards',
        'breathe-contract': 'breathe-contract 8s ease-in-out forwards',
        'fade-in': 'fade-in 500ms ease-out forwards',
        'waveform-bar-1': 'waveform-bar-1 1.2s ease-in-out infinite',
        'waveform-bar-2': 'waveform-bar-2 1.0s ease-in-out infinite',
        'waveform-bar-3': 'waveform-bar-3 1.4s ease-in-out infinite',
        'artwork-drift': 'artwork-drift 20s ease-in-out infinite',
        'sound-pulse': 'sound-pulse 3s ease-in-out infinite',
        'scene-pulse': 'scene-pulse 4s ease-in-out infinite',
        'scene-glow': 'scene-glow 8s ease-in-out infinite',
        'mood-pulse': 'mood-pulse 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
