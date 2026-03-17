import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { getBadgeIcon, CONFETTI_COLORS, LEVEL_ENCOURAGEMENT_MESSAGES, STREAK_MILESTONE_MESSAGES } from '@/constants/dashboard/badge-icons'
import type { BadgeDefinition } from '@/types/dashboard'

// --- Props ---

interface CelebrationOverlayProps {
  badge: BadgeDefinition
  onDismiss: () => void
}

// --- Confetti particle generation (full-screen fall) ---

function generateOverlayConfetti(count: number) {
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

// --- Encouragement message lookup ---

function getEncouragementMessage(badge: BadgeDefinition): string {
  // Level badges: level_1 -> 1
  const levelMatch = badge.id.match(/^level_(\d+)$/)
  if (levelMatch) {
    const levelNum = parseInt(levelMatch[1], 10)
    return LEVEL_ENCOURAGEMENT_MESSAGES[levelNum] ?? ''
  }

  // Streak badges: streak_60 -> 60
  const streakMatch = badge.id.match(/^streak_(\d+)$/)
  if (streakMatch) {
    const threshold = parseInt(streakMatch[1], 10)
    return STREAK_MILESTONE_MESSAGES[threshold] ?? ''
  }

  return ''
}

// --- Badge Icon Circle ---

function BadgeIconCircle({ badge }: { badge: BadgeDefinition }) {
  const config = getBadgeIcon(badge.id)
  const IconComponent = config.icon

  return (
    <div
      className={`flex items-center justify-center rounded-full ${config.bgColor} h-20 w-20 sm:h-24 sm:w-24 lg:h-[120px] lg:w-[120px]`}
      style={{ boxShadow: `0 0 40px ${config.glowColor}` }}
    >
      <IconComponent className={`h-10 w-10 sm:h-12 sm:w-12 lg:h-14 lg:w-14 ${config.textColor}`} />
    </div>
  )
}

// --- Component ---

export function CelebrationOverlay({ badge, onDismiss }: CelebrationOverlayProps) {
  const [showContinue, setShowContinue] = useState(false)
  const continueRef = useRef<HTMLButtonElement>(null)
  const focusTrapRef = useFocusTrap(true, onDismiss)

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640
  const confettiCount = isMobile ? 15 : 30

  // Reduced motion check
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // Continue button delay (6s, or immediate with reduced motion)
  useEffect(() => {
    if (prefersReducedMotion) {
      setShowContinue(true)
      return
    }

    const timer = setTimeout(() => {
      setShowContinue(true)
    }, 6000)

    return () => clearTimeout(timer)
  }, [prefersReducedMotion])

  // Auto-focus Continue button when it appears
  useEffect(() => {
    if (showContinue) {
      continueRef.current?.focus()
    }
  }, [showContinue])

  // Scroll lock
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  const encouragement = getEncouragementMessage(badge)

  return createPortal(
    <div
      ref={focusTrapRef}
      role="dialog"
      aria-labelledby="celebration-title"
      aria-modal="true"
    >
      <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-md">
        {/* Confetti particles */}
        {generateOverlayConfetti(confettiCount)}

        <div className="flex min-h-screen flex-col items-center justify-center px-6 sm:px-8">
          {/* Badge/level icon with spring animation */}
          <div className="animate-celebration-spring motion-reduce:animate-none">
            <BadgeIconCircle badge={badge} />
          </div>

          {/* Badge name */}
          <h2
            id="celebration-title"
            className="mt-6 text-center font-serif text-2xl text-white sm:text-3xl md:text-4xl"
          >
            {badge.name}
          </h2>

          {/* Encouragement message */}
          {encouragement && (
            <p className="mt-3 text-center font-serif text-lg italic text-white/80 sm:text-xl">
              {encouragement}
            </p>
          )}

          {/* Scripture verse (level-ups only) */}
          {badge.verse && (
            <div className="mt-6 max-w-md text-center">
              <p className="font-serif text-base italic text-white/70 sm:text-lg">
                &ldquo;{badge.verse.text}&rdquo;
              </p>
              <p className="mt-2 font-sans text-sm text-white/50">
                &mdash; {badge.verse.reference}
              </p>
            </div>
          )}

          {/* Continue button (delayed 6s, immediate with reduced motion) */}
          {showContinue && (
            <button
              ref={continueRef}
              onClick={onDismiss}
              className={`mt-8 animate-continue-fade-in rounded-lg border border-white/30 px-8 py-3 font-sans text-white transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/50 motion-reduce:animate-none ${
                isMobile ? 'w-full py-4' : ''
              }`}
              aria-label="Continue"
            >
              Continue
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
