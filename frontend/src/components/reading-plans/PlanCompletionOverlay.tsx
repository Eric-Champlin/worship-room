import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { X } from 'lucide-react'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { CONFETTI_COLORS } from '@/constants/dashboard/badge-icons'
import { findMatchingChallenge } from '@/lib/plan-challenge-matcher'
import { getParticipantCount } from '@/constants/challenges'
import type { PlanTheme } from '@/types/reading-plans'

interface PlanCompletionOverlayProps {
  planTitle: string
  totalDays: number
  onDismiss: () => void
  onBrowsePlans: () => void
  planTheme?: PlanTheme
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

export function PlanCompletionOverlay({
  planTitle,
  totalDays,
  onDismiss,
  onBrowsePlans,
  planTheme,
}: PlanCompletionOverlayProps) {
  const suggestion = planTheme ? findMatchingChallenge(planTheme) : null
  const containerRef = useFocusTrap(true, onDismiss)

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const confettiCount = prefersReducedMotion
    ? 0
    : typeof window !== 'undefined' && window.innerWidth < 640
      ? 15
      : 30

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="plan-completion-title"
      ref={containerRef}
    >
      {/* Confetti */}
      {confettiCount > 0 && generateConfetti(confettiCount)}

      {/* Content card */}
      <div className="relative mx-4 max-w-md rounded-2xl border border-white/15 bg-hero-mid/90 p-8 sm:p-10">
        {/* Close button */}
        <button
          type="button"
          onClick={onDismiss}
          className="absolute top-4 right-4 text-white/50 transition-colors hover:text-white"
          aria-label="Close"
        >
          <X size={20} />
        </button>

        <div className="text-center">
          <h2
            id="plan-completion-title"
            className="font-script text-4xl text-white sm:text-5xl"
          >
            Plan Complete!
          </h2>

          <p className="mt-4 text-xl font-bold text-white">{planTitle}</p>

          <p className="mt-2 text-white/60">
            {totalDays} days completed
          </p>

          <blockquote className="mt-6 font-serif text-base italic leading-relaxed text-white/80">
            I have fought the good fight, I have finished the race, I have kept
            the faith.
          </blockquote>
          <p className="mt-2 text-sm text-white/60">— 2 Timothy 4:7 WEB</p>

          {suggestion ? (
            <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.08] p-4 text-left">
              <p className="font-semibold text-white">Continue your journey!</p>
              <p className="mt-1 text-sm text-white/70">
                {suggestion.challenge.title}{' '}
                {suggestion.isActive
                  ? 'is happening now'
                  : `starts ${suggestion.startDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`}
                .
              </p>
              <p className="text-sm text-white/50">
                {getParticipantCount(suggestion.challenge.id, suggestion.isActive ? 1 : 0)} people are participating.
              </p>
              <Link
                to="/grow?tab=challenges"
                onClick={onDismiss}
                className="mt-2 inline-block text-sm text-primary-lt transition-colors hover:text-primary hover:underline"
              >
                Join Challenge →
              </Link>
            </div>
          ) : (
            <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.08] p-4 text-left">
              <p className="font-semibold text-white">Looking for your next journey?</p>
              <Link
                to="/grow?tab=challenges"
                onClick={onDismiss}
                className="mt-2 inline-block text-sm text-primary-lt transition-colors hover:text-primary hover:underline"
              >
                Browse challenges →
              </Link>
            </div>
          )}

          <button
            type="button"
            onClick={onBrowsePlans}
            className="mt-8 w-full rounded-lg bg-primary px-6 py-3 font-semibold text-white transition-colors hover:bg-primary/90 sm:w-auto"
          >
            Browse more plans
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
