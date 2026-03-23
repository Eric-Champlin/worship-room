import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'

interface ChallengeCompletionOverlayProps {
  challengeTitle: string
  themeColor: string
  daysCompleted: number
  totalPointsEarned: number
  badgeName: string
  onDismiss: () => void
}

function useReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/** CSS confetti particle */
function Confetti({ color, delay, left }: { color: string; delay: number; left: number }) {
  return (
    <div
      className="absolute top-0 h-2 w-2 rounded-full"
      style={{
        backgroundColor: color,
        left: `${left}%`,
        animation: `confetti-fall 2.5s ${delay}s ease-in forwards`,
        opacity: 0,
      }}
      aria-hidden="true"
    />
  )
}

export function ChallengeCompletionOverlay({
  challengeTitle,
  themeColor,
  daysCompleted,
  totalPointsEarned,
  badgeName,
  onDismiss,
}: ChallengeCompletionOverlayProps) {
  const navigate = useNavigate()
  const overlayRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const reducedMotion = useReducedMotion()
  const [showDismiss, setShowDismiss] = useState(reducedMotion)

  // Auto-dismiss after 8 seconds
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(), 8000)
    return () => clearTimeout(timer)
  }, [onDismiss])

  // Show dismiss button after 2s (or immediately for reduced motion)
  useEffect(() => {
    if (reducedMotion) return
    const timer = setTimeout(() => setShowDismiss(true), 2000)
    return () => clearTimeout(timer)
  }, [reducedMotion])

  // Focus trap + keyboard
  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onDismiss()
        return
      }
      if (e.key === 'Tab' && overlayRef.current) {
        const focusable = overlayRef.current.querySelectorAll<HTMLElement>(
          'button, [href], [tabindex]:not([tabindex="-1"])',
        )
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault()
            last?.focus()
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault()
            first?.focus()
          }
        }
      }
    }

    // Lock scroll
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = prev
      previousFocusRef.current?.focus()
    }
  }, [onDismiss])

  // Generate confetti particles
  const confettiColors = useMemo(
    () => [themeColor, '#FFD700', '#FFFFFF'],
    [themeColor],
  )
  const isMobile =
    typeof window !== 'undefined' && window.innerWidth < 640
  const confettiCount = isMobile ? 12 : 24

  const handleBrowseMore = useCallback(() => {
    onDismiss()
    navigate('/challenges')
  }, [onDismiss, navigate])

  const handleShare = useCallback(() => {
    // eslint-disable-next-line no-console
    console.log('Share challenge achievement:', { challengeTitle, badgeName })
  }, [challengeTitle, badgeName])

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onDismiss}
      role="dialog"
      aria-modal="true"
      aria-label={`${challengeTitle} challenge complete`}
    >
      <div
        className="relative mx-4 max-w-md px-6 py-8 text-center sm:px-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Confetti */}
        {!reducedMotion && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
            {Array.from({ length: confettiCount }).map((_, i) => (
              <Confetti
                key={i}
                color={confettiColors[i % confettiColors.length]}
                delay={Math.random() * 1.5}
                left={Math.random() * 100}
              />
            ))}
          </div>
        )}

        {/* Challenge title */}
        <h2
          className="font-script text-4xl sm:text-5xl"
          style={{ color: themeColor }}
        >
          {challengeTitle}
        </h2>

        {/* Heading */}
        <p className="mt-3 text-2xl font-bold text-white sm:text-3xl">
          Challenge Complete!
        </p>

        {/* Stats */}
        <p className="mt-3 text-lg text-white/70">
          {daysCompleted} days of faithful commitment
        </p>
        <p className="mt-1 text-lg text-white/70">
          +{totalPointsEarned} faith points
        </p>

        {/* Badge */}
        <div className="mt-4 flex flex-col items-center gap-2">
          <div
            className="h-12 w-12 rounded-full"
            style={{ backgroundColor: themeColor, opacity: 0.7 }}
            aria-hidden="true"
          />
          <span className="font-medium text-white">{badgeName}</span>
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={handleShare}
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-white/30 px-6 py-3 text-sm text-white/80 transition-colors hover:bg-white/10"
          >
            Share Your Achievement
          </button>
          <button
            type="button"
            onClick={handleBrowseMore}
            className="text-sm text-white/60 underline transition-colors hover:text-white/80"
          >
            Browse more challenges
          </button>
        </div>

        {/* Dismiss */}
        {showDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="mt-4 text-xs text-white/40 transition-colors hover:text-white/60"
          >
            Tap anywhere to dismiss
          </button>
        )}
      </div>
    </div>,
    document.body,
  )
}
