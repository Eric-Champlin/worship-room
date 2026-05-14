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
        'dashboard-dark': '#0f0a1e',
        'dashboard-gradient': '#1a0533',
        'nav-text-dark': '#2B0E4A',
        'nav-hover-light': '#F5F3FF',
        'medal-gold': '#FFD700',
        'medal-silver': '#C0C0C0',
        'medal-bronze': '#CD7F32',
        'spotify-green': '#1DB954',
        'surface-dark': '#1a0f2e',
        'violet-50': '#F5F3FF',
        'violet-100': '#EDE9FE',
        'violet-200': '#DDD6FE',
        'violet-300': '#C4B5FD',
        'violet-400': '#A78BFA',
        'violet-500': '#8B5CF6',
        'violet-600': '#7C3AED',
        'violet-700': '#6D28D9',
        'violet-800': '#5B21B6',
        'violet-900': '#4C1D95',
        'canvas-shoulder': '#0F0A1A',
        'canvas-deep': '#0A0814',
      },
      fontFamily: {
        sans: ['Inter', 'Inter Fallback', 'ui-sans-serif', 'system-ui'],
        serif: ['Lora', 'Lora Fallback', 'ui-serif', 'Georgia', 'serif'],
        script: ['Caveat', 'cursive'],
      },
      transitionDuration: {
        instant: '0ms',
        fast: '150ms',
        base: '250ms',
        slow: '400ms',
        // Parity invariant: these must match ANIMATION_DURATIONS.pulse / .ceremony
        // in frontend/src/constants/animation.ts. If you change one, change both.
        pulse: '300ms',
        ceremony: '600ms',
      },
      transitionTimingFunction: {
        standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
        decelerate: 'cubic-bezier(0, 0, 0.2, 1)',
        accelerate: 'cubic-bezier(0.4, 0, 1, 1)',
        sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
      },
      boxShadow: {
        'frosted-base': '0 4px 16px rgba(0,0,0,0.30)',
        'frosted-hover': '0 6px 24px rgba(0,0,0,0.35)',
        'frosted-accent': '0 0 30px rgba(139,92,246,0.12), 0 4px 20px rgba(0,0,0,0.35)',
        'frosted-accent-hover': '0 0 30px rgba(139,92,246,0.18), 0 6px 24px rgba(0,0,0,0.40)',
        'gradient-button': '0 0 24px rgba(167,139,250,0.35), 0 4px 16px rgba(0,0,0,0.40)',
        'gradient-button-hover': '0 0 32px rgba(167,139,250,0.45), 0 6px 20px rgba(0,0,0,0.40)',
        'subtle-button-hover': '0 0 16px rgba(139,92,246,0.10), 0 4px 12px rgba(0,0,0,0.30)',
      },
      keyframes: {
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
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-out': {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        'widget-enter': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
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
        'slide-from-bottom': {
          from: { transform: 'translateY(40px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        'celebration-spring': {
          '0%': { transform: 'scale(0)', opacity: '0' },
          '60%': { transform: 'scale(1.1)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'confetti-fall': {
          '0%': { transform: 'translateY(-20px) rotate(0deg)', opacity: '1' },
          '80%': { opacity: '1' },
          '100%': { transform: 'translateY(100vh) rotate(720deg)', opacity: '0' },
        },
        'confetti-burst': {
          '0%': { transform: 'translate(0, 0) scale(1)', opacity: '1' },
          '100%': { transform: 'var(--confetti-end)', opacity: '0' },
        },
        'continue-fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'bell-ring': {
          '0%, 100%': { transform: 'rotate(0)' },
          '25%': { transform: 'rotate(10deg)' },
          '50%': { transform: 'rotate(-10deg)' },
          '75%': { transform: 'rotate(5deg)' },
        },
        'streak-bump': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.1)' },
        },
        'pray-icon-pulse': {
          '0%': { transform: 'scale(1)', filter: 'drop-shadow(0 0 0px rgba(109, 40, 217, 0))' },
          '50%': { transform: 'scale(1.3)', filter: 'drop-shadow(0 0 8px rgba(109, 40, 217, 0.6))' },
          '100%': { transform: 'scale(1)', filter: 'drop-shadow(0 0 0px rgba(109, 40, 217, 0))' },
        },
        'pray-ripple': {
          '0%': { transform: 'scale(1)', opacity: '0.3' },
          '100%': { transform: 'scale(2.5)', opacity: '0' },
        },
        'pray-float-text': {
          '0%': { transform: 'translateY(0)', opacity: '1' },
          '100%': { transform: 'translateY(-20px)', opacity: '0' },
        },
        'mic-pulse': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.1)' },
        },
        'garden-leaf-sway': {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
        'garden-butterfly-float': {
          '0%': { transform: 'translate(0, 0)' },
          '25%': { transform: 'translate(8px, -6px)' },
          '50%': { transform: 'translate(16px, 0)' },
          '75%': { transform: 'translate(8px, 6px)' },
          '100%': { transform: 'translate(0, 0)' },
        },
        'garden-water-shimmer': {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
        'garden-glow-pulse': {
          '0%, 100%': { opacity: '0.7' },
          '50%': { opacity: '1' },
        },
        'garden-fade-out': {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        'garden-fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'garden-sparkle-rise': {
          '0%': { opacity: '1', transform: 'translateY(0) translateX(0)' },
          '100%': { opacity: '0', transform: 'translateY(-40px) translateX(var(--drift-x, 0px))' },
        },
        'garden-snow-fall': {
          '0%': { transform: 'translateY(-20px) translateX(0)', opacity: '0' },
          '10%': { opacity: '0.8' },
          '100%': { transform: 'translateY(420px) translateX(10px)', opacity: '0' },
        },
        'garden-star-twinkle': {
          '0%, 100%': { opacity: '0.3' },
          '50%': { opacity: '0.7' },
        },
        'garden-firefly-glow': {
          '0%, 100%': { opacity: '0.2', transform: 'translate(0, 0)' },
          '25%': { opacity: '0.5', transform: 'translate(3px, -2px)' },
          '50%': { opacity: '0.15', transform: 'translate(-2px, 1px)' },
          '75%': { opacity: '0.45', transform: 'translate(1px, 3px)' },
        },
        'garden-flame-flicker': {
          '0%, 100%': { opacity: '0.8', transform: 'scaleY(1) scaleX(1)' },
          '25%': { opacity: '1', transform: 'scaleY(1.05) scaleX(0.95)' },
          '50%': { opacity: '0.7', transform: 'scaleY(0.95) scaleX(1.05)' },
          '75%': { opacity: '0.9', transform: 'scaleY(1.02) scaleX(0.98)' },
        },
        'garden-seasonal-fade': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'garden-element-fade': {
          '0%': { opacity: '0', transform: 'translateY(5px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'logo-pulse': {
          '0%, 100%': { opacity: '0.2' },
          '50%': { opacity: '0.4' },
        },
        'stagger-enter': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'modal-spring-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'modal-spring-out': {
          '0%': { opacity: '1', transform: 'scale(1)' },
          '100%': { opacity: '0', transform: 'scale(0.98)' },
        },
        'toast-spring-in': {
          '0%': { opacity: '0', transform: 'scale(0.8) translateY(8px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        'toast-out': {
          '0%': { opacity: '1', transform: 'scale(1)' },
          '100%': { opacity: '0', transform: 'scale(0.95)' },
        },
        'card-pulse': {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.005)' },
          '100%': { transform: 'scale(1)' },
        },
        'content-fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'backdrop-fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'backdrop-fade-out': {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        'drawer-slide-in': {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'drawer-slide-out': {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(100%)' },
        },
        'bottom-sheet-slide-in': {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        'verse-sheet-slide-up': {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        'view-slide-in': {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'view-slide-out': {
          '0%': { transform: 'translateX(0)', opacity: '1' },
          '100%': { transform: 'translateX(100%)', opacity: '0' },
        },
        'view-slide-back-in': {
          '0%': { transform: 'translateX(-30%)', opacity: '0.5' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'golden-sparkle': {
          '0%': { transform: 'translateY(-10px) scale(0)', opacity: '0' },
          '20%': { opacity: '1', transform: 'translateY(10vh) scale(1)' },
          '80%': { opacity: '0.8' },
          '100%': { transform: 'translateY(100vh) scale(0.5)', opacity: '0' },
        },
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
        'glow-float': {
          '0%, 100%': { transform: 'translateY(0) translateX(-50%)' },
          '50%': { transform: 'translateY(-10px) translateX(-50%)' },
        },
        'highlight-pulse': {
          '0%': { opacity: '0' },
          '30%': { opacity: '1' },
          '60%': { opacity: '1', filter: 'brightness(1.3)' },
          '100%': { opacity: '1', filter: 'brightness(1)' },
        },
        'audio-pulse': {
          '0%, 100%': { opacity: '0' },
          '50%': { opacity: '1' },
        },
        // Spec 6.3 — NightWatchChip breathing-glow (W12: subtle 0.7-1.0 oscillation,
        // never 0.0-1.0 flashing-alert range).
        'night-pulse': {
          '0%, 100%': { opacity: '0.7' },
          '50%': { opacity: '1' },
        },
        // Spec 6.6b — Celebrate reaction sparkle burst. Warm sunrise palette
        // (amber drop-shadow), 600ms decelerate easing per plan ED-8. Distinct
        // from `pray-icon-pulse` (violet, 250ms, no rotate) and from any
        // Light-a-Candle / Praising treatment — rotate + amber shadow are the
        // visual signature. Reduced-motion respected via the global rule in
        // frontend/src/styles/animations.css.
        'celebrate-sparkle': {
          '0%': { transform: 'scale(1) rotate(0deg)', filter: 'drop-shadow(0 0 0px rgba(252, 211, 77, 0))' },
          '50%': { transform: 'scale(1.25) rotate(15deg)', filter: 'drop-shadow(0 0 10px rgba(252, 211, 77, 0.7))' },
          '100%': { transform: 'scale(1) rotate(0deg)', filter: 'drop-shadow(0 0 0px rgba(252, 211, 77, 0))' },
        },
      },
      animation: {
        // --- Utility (keep as-is) ---
        'cursor-blink': 'cursor-blink 1s step-end infinite',
        // --- Standard UI (token durations + canonical easings) ---
        'dropdown-in': 'dropdown-in 150ms cubic-bezier(0, 0, 0.2, 1)',
        'slide-from-right': 'slide-from-right 250ms cubic-bezier(0, 0, 0.2, 1) forwards',
        'slide-from-left': 'slide-from-left 250ms cubic-bezier(0, 0, 0.2, 1) forwards',
        'fade-in': 'fade-in 250ms cubic-bezier(0, 0, 0.2, 1) both',
        'fade-in-up': 'fade-in-up 250ms cubic-bezier(0, 0, 0.2, 1) both',
        'fade-out': 'fade-out 150ms cubic-bezier(0.4, 0, 1, 1) both',
        'scale-in': 'scale-in 250ms cubic-bezier(0, 0, 0.2, 1) both',
        'slide-up': 'slide-up 250ms cubic-bezier(0, 0, 0.2, 1) both',
        'slide-from-bottom': 'slide-from-bottom 250ms cubic-bezier(0, 0, 0.2, 1) forwards',
        'celebration-spring': 'celebration-spring 400ms cubic-bezier(0, 0, 0.2, 1) forwards',
        'continue-fade-in': 'continue-fade-in 400ms cubic-bezier(0.4, 0, 1, 1) forwards',
        'bell-ring': 'bell-ring 250ms cubic-bezier(0.4, 0, 0.2, 1)',
        'streak-bump': 'streak-bump 250ms cubic-bezier(0, 0, 0.2, 1)',
        'pray-icon-pulse': 'pray-icon-pulse 250ms cubic-bezier(0, 0, 0.2, 1) forwards',
        'pray-ripple': 'pray-ripple 400ms cubic-bezier(0, 0, 0.2, 1) forwards',
        'pray-float-text': 'pray-float-text 400ms cubic-bezier(0, 0, 0.2, 1) forwards',
        'widget-enter': 'widget-enter 400ms cubic-bezier(0, 0, 0.2, 1) both',
        'stagger-enter': 'stagger-enter 250ms cubic-bezier(0, 0, 0.2, 1) both',
        'card-pulse': 'card-pulse 250ms cubic-bezier(0.4, 0, 0.2, 1)',
        'content-fade-in': 'content-fade-in 250ms cubic-bezier(0, 0, 0.2, 1) both',
        'tab-fade-in': 'content-fade-in 250ms cubic-bezier(0, 0, 0.2, 1) both',
        'highlight-pulse': 'highlight-pulse 400ms cubic-bezier(0, 0, 0.2, 1) forwards',
        'logo-pulse': 'logo-pulse 2s cubic-bezier(0.4, 0, 0.2, 1) infinite',
        // --- Modal/dialog/drawer (token easings, base duration per Clarification 1) ---
        'modal-spring-in': 'modal-spring-in 250ms cubic-bezier(0, 0, 0.2, 1) both',
        'modal-spring-out': 'modal-spring-out 150ms cubic-bezier(0.4, 0, 1, 1) both',
        'toast-spring-in': 'toast-spring-in 250ms cubic-bezier(0, 0, 0.2, 1) both',
        'toast-out': 'toast-out 150ms cubic-bezier(0.4, 0, 1, 1) both',
        'backdrop-fade-in': 'backdrop-fade-in 250ms cubic-bezier(0, 0, 0.2, 1) both',
        'backdrop-fade-out': 'backdrop-fade-out 150ms cubic-bezier(0.4, 0, 1, 1) both',
        'drawer-slide-in': 'drawer-slide-in 250ms cubic-bezier(0, 0, 0.2, 1) both',
        'drawer-slide-out': 'drawer-slide-out 150ms cubic-bezier(0.4, 0, 1, 1) both',
        'bottom-sheet-slide-in': 'bottom-sheet-slide-in 250ms cubic-bezier(0, 0, 0.2, 1) both',
        'verse-sheet-slide-up': 'verse-sheet-slide-up 250ms cubic-bezier(0, 0, 0.2, 1) both',
        'view-slide-in': 'view-slide-in 250ms cubic-bezier(0, 0, 0.2, 1) both',
        'view-slide-out': 'view-slide-out 150ms cubic-bezier(0.4, 0, 1, 1) both',
        'view-slide-back-in': 'view-slide-back-in 250ms cubic-bezier(0, 0, 0.2, 1) both',
        'slide-from-right-spring': 'slide-from-right 250ms cubic-bezier(0, 0, 0.2, 1) both',
        'slide-from-bottom-spring': 'slide-from-bottom 250ms cubic-bezier(0, 0, 0.2, 1) both',
        // --- Exempt: keep specific durations, migrate easing to standard ---
        'golden-glow': 'golden-glow 2s cubic-bezier(0.4, 0, 0.2, 1) infinite',
        'breathe-expand': 'breathe-expand 4s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        'breathe-contract': 'breathe-contract 8s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        'waveform-bar-1': 'waveform-bar-1 1.2s cubic-bezier(0.4, 0, 0.2, 1) infinite',
        'waveform-bar-2': 'waveform-bar-2 1.0s cubic-bezier(0.4, 0, 0.2, 1) infinite',
        'waveform-bar-3': 'waveform-bar-3 1.4s cubic-bezier(0.4, 0, 0.2, 1) infinite',
        'artwork-drift': 'artwork-drift 20s cubic-bezier(0.4, 0, 0.2, 1) infinite',
        'sound-pulse': 'sound-pulse 3s cubic-bezier(0.4, 0, 0.2, 1) infinite',
        'scene-pulse': 'scene-pulse 4s cubic-bezier(0.4, 0, 0.2, 1) infinite',
        'scene-glow': 'scene-glow 8s cubic-bezier(0.4, 0, 0.2, 1) infinite',
        'mood-pulse': 'mood-pulse 3s cubic-bezier(0.4, 0, 0.2, 1) infinite',
        'mic-pulse': 'mic-pulse 1s cubic-bezier(0.4, 0, 0.2, 1) infinite',
        'audio-pulse': 'audio-pulse 2s cubic-bezier(0.4, 0, 0.2, 1) infinite',
        shimmer: 'shimmer 1.5s cubic-bezier(0.4, 0, 0.2, 1) infinite',
        'glow-float': 'glow-float 20s cubic-bezier(0.4, 0, 0.2, 1) infinite',
        // --- Exempt: celebration/confetti (keep specific) ---
        'confetti-fall': 'confetti-fall var(--confetti-duration, 3s) ease-in forwards',
        'confetti-burst': 'confetti-burst 1.5s cubic-bezier(0, 0, 0.2, 1) forwards',
        'golden-sparkle': 'golden-sparkle var(--sparkle-duration, 3.5s) cubic-bezier(0.4, 0, 0.2, 1) forwards',
        // --- Exempt: garden/SVG ambient ---
        'garden-leaf-sway': 'garden-leaf-sway 4s cubic-bezier(0.4, 0, 0.2, 1) infinite alternate',
        'garden-butterfly-float': 'garden-butterfly-float 6s cubic-bezier(0.4, 0, 0.2, 1) infinite',
        'garden-water-shimmer': 'garden-water-shimmer 3s cubic-bezier(0.4, 0, 0.2, 1) infinite alternate',
        'garden-glow-pulse': 'garden-glow-pulse 2s cubic-bezier(0.4, 0, 0.2, 1) infinite alternate',
        'garden-fade-out': 'garden-fade-out 2s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        'garden-fade-in': 'garden-fade-in 2s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        'garden-sparkle-rise': 'garden-sparkle-rise 1s cubic-bezier(0, 0, 0.2, 1) forwards',
        'garden-snow-fall': 'garden-snow-fall 8s linear infinite',
        'garden-star-twinkle': 'garden-star-twinkle 3.5s cubic-bezier(0.4, 0, 0.2, 1) infinite',
        'garden-firefly-glow': 'garden-firefly-glow 5s cubic-bezier(0.4, 0, 0.2, 1) infinite',
        'garden-flame-flicker': 'garden-flame-flicker 2s cubic-bezier(0.4, 0, 0.2, 1) infinite',
        'garden-seasonal-fade': 'garden-seasonal-fade 1s cubic-bezier(0, 0, 0.2, 1) forwards',
        'garden-element-fade': 'garden-element-fade 400ms cubic-bezier(0, 0, 0.2, 1) forwards',
        // Spec 6.3 — NightWatchChip breathing-glow.
        'night-pulse': 'night-pulse 3s cubic-bezier(0.4, 0, 0.2, 1) infinite',
        // Spec 6.6b — Celebrate reaction sparkle burst (~600ms decelerate per plan ED-8).
        'celebrate-sparkle': 'celebrate-sparkle 600ms cubic-bezier(0, 0, 0.2, 1) forwards',
      },
    },
  },
  plugins: [],
}
