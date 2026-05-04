import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { CONFETTI_COLORS } from '@/constants/dashboard/badge-icons'
import { Z } from '@/constants/z-index'

interface GettingStartedCelebrationProps {
  onDismiss: () => void
}

function generateConfetti(count: number) {
  return Array.from({ length: count }, (_, i) => {
    const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length]
    const left = Math.random() * 100
    const duration = 2 + Math.random() * 2
    const delay = Math.random() * 1.5
    const size = 6 + Math.random() * 4
    const isCircle = i % 2 === 0

    return (
      <span
        key={i}
        className="pointer-events-none absolute top-0 animate-confetti-fall motion-reduce:hidden"
        style={
          {
            '--confetti-duration': `${duration}s`,
            left: `${left}%`,
            width: size,
            height: size,
            borderRadius: isCircle ? '50%' : '2px',
            backgroundColor: color,
            animationDelay: `${delay}s`,
          } as React.CSSProperties
        }
        aria-hidden="true"
      />
    )
  })
}

export function GettingStartedCelebration({ onDismiss }: GettingStartedCelebrationProps) {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const focusTrapRef = useFocusTrap(true, onDismiss)
  const prefersReducedMotion = useReducedMotion()

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640
  const confettiCount = isMobile ? 15 : 30

  // Auto-focus "Let's Go" button
  useEffect(() => {
    buttonRef.current?.focus()
  }, [])

  // Scroll lock
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  return createPortal(
    <div
      ref={focusTrapRef}
      role="dialog"
      aria-labelledby="getting-started-celebration-title"
      aria-modal="true"
    >
      <div className={`fixed inset-0 z-[${Z.OVERLAY}] bg-black/70 backdrop-blur-md`}>
        {!prefersReducedMotion && generateConfetti(confettiCount)}

        <div className="flex min-h-screen flex-col items-center justify-center px-4 sm:px-8">
          <h2
            id="getting-started-celebration-title"
            className="text-center bg-gradient-to-br from-violet-300 to-violet-200 bg-clip-text text-transparent text-3xl font-bold sm:text-4xl md:text-5xl"
          >
            You're all set! Welcome to Worship Room.
          </h2>

          <p className="mt-4 max-w-md text-center text-base text-white/70 sm:text-lg">
            You've explored everything Worship Room has to offer. Your journey starts now.
          </p>

          <button
            ref={buttonRef}
            onClick={onDismiss}
            className="mt-8 rounded-lg bg-primary px-8 py-3 font-semibold text-white transition-colors hover:bg-primary-lt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 motion-reduce:transition-none"
          >
            Let's Go
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
