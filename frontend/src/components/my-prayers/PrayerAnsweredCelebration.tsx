import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { CONFETTI_COLORS } from '@/constants/dashboard/badge-icons'

interface PrayerAnsweredCelebrationProps {
  prayerTitle: string
  testimonyNote?: string
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

export function PrayerAnsweredCelebration({
  prayerTitle,
  testimonyNote,
  onDismiss,
}: PrayerAnsweredCelebrationProps) {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const focusTrapRef = useFocusTrap(true, onDismiss)

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640
  const confettiCount = isMobile ? 15 : 30

  // Auto-focus dismiss button on mount
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
      aria-labelledby="prayer-celebration-title"
      aria-modal="true"
    >
      <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-md">
        {generateConfetti(confettiCount)}

        <div className="flex min-h-screen flex-col items-center justify-center px-6 sm:px-8">
          <h2
            id="prayer-celebration-title"
            className="text-center font-script text-3xl font-bold text-white sm:text-4xl lg:text-5xl"
          >
            Prayer Answered!
          </h2>

          <p className="mt-4 text-center font-sans text-lg text-white/90">
            {prayerTitle}
          </p>

          {testimonyNote && (
            <p className="mx-auto mt-4 max-w-md text-center font-serif text-base italic text-white/70">
              {testimonyNote}
            </p>
          )}

          <button
            ref={buttonRef}
            onClick={onDismiss}
            className={cn(
              'mt-8 rounded-lg border border-white/30 px-8 py-3 font-sans text-white transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/50',
              isMobile && 'w-full py-4',
            )}
            aria-label="Praise God! Dismiss celebration"
          >
            Praise God!
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
