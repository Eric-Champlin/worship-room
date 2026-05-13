import { useCallback, useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'

import { useFocusTrap } from '@/hooks/useFocusTrap'
import { useQuickLift } from '@/hooks/useQuickLift'
import { playWindChime } from '@/lib/quickLiftSound'
import { cn } from '@/lib/utils'
import type { QuickLiftCompleteResponse } from '@/types/quickLift'

// Spec 6.2 — 30-second prayer dwell overlay. Server-authoritative timing,
// reduced-motion variant, anti-pressure copy (no countdown numbers, no "%"),
// quiet completion (wind chime + "Thank you" + close).

const QUICK_LIFT_DURATION_MS = 30_000
const RING_RADIUS = 90
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS
const TITLE_ID = 'quick-lift-overlay-title'

/**
 * Screen-reader narration for the progressbar at each milestone (0/25/50/75/100).
 * Anti-pressure copy — no digit-followed-by-second/%/left/remaining, so Gate-G-
 * NO-COUNTDOWN-NUMBERS holds. Distinct strings per milestone so SR users hear
 * progress as aria-live="polite" announces the change, instead of a static
 * "Quick Lift progress" at every checkpoint.
 */
function ariaProgressLabel(milestone: number): string {
  if (milestone >= 100) return 'Quick Lift complete'
  if (milestone >= 75) return 'Nearly through'
  if (milestone >= 50) return 'Halfway through'
  if (milestone >= 25) return 'Settling in'
  return 'Quick Lift starting'
}

interface QuickLiftOverlayProps {
  isOpen: boolean
  postId: string
  postExcerpt: string
  onCancel: () => void
  onComplete: (response: QuickLiftCompleteResponse) => void
}

export function QuickLiftOverlay({
  isOpen,
  postId,
  postExcerpt,
  onCancel,
  onComplete,
}: QuickLiftOverlayProps) {
  const containerRef = useFocusTrap(isOpen, onCancel)
  const { state, start, complete, reset } = useQuickLift(postId)
  const [reducedMotion] = useState(() => {
    if (typeof window === 'undefined') return false
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches
    } catch {
      return false
    }
  })
  const [progressMilestone, setProgressMilestone] = useState(0)
  const completedRef = useRef(false)

  // Start session on open (idempotent — only fires when phase is idle)
  useEffect(() => {
    if (!isOpen) {
      completedRef.current = false
      setProgressMilestone(0)
      reset()
      return
    }
    if (state.phase === 'idle') {
      void start()
    }
  }, [isOpen, state.phase, start, reset])

  // Drive completion at exactly 30 s after server-authoritative serverStartedAt
  useEffect(() => {
    if (state.phase !== 'running' || completedRef.current) return
    const remaining = Math.max(
      0,
      QUICK_LIFT_DURATION_MS - (Date.now() - state.serverStartedAt),
    )
    const timer = window.setTimeout(() => {
      completedRef.current = true
      void complete(state.sessionId)
    }, remaining)
    return () => window.clearTimeout(timer)
  }, [state, complete])

  // SR-only progress checkpoints at 25/50/75/100 %
  useEffect(() => {
    if (state.phase !== 'running') return
    const timers = [0.25, 0.5, 0.75, 1.0].map((frac, i) => {
      const target = frac * QUICK_LIFT_DURATION_MS
      const remaining = Math.max(0, target - (Date.now() - state.serverStartedAt))
      return window.setTimeout(() => {
        setProgressMilestone((i + 1) * 25)
      }, remaining)
    })
    return () => {
      for (const t of timers) window.clearTimeout(t)
    }
  }, [state])

  // On complete: chime + onComplete + auto-close after 2 s
  useEffect(() => {
    if (state.phase !== 'complete') return
    playWindChime()
    onComplete(state.response)
    const t = window.setTimeout(onCancel, 2000)
    return () => window.clearTimeout(t)
  }, [state, onComplete, onCancel])

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onCancel()
    },
    [onCancel],
  )

  if (!isOpen) return null

  const excerpt =
    postExcerpt.length > 80 ? `${postExcerpt.slice(0, 80)}…` : postExcerpt
  const completePhase = state.phase === 'complete'
  const errorPhase = state.phase === 'error'

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={TITLE_ID}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div
        ref={containerRef}
        className="relative w-full max-w-md rounded-3xl border border-violet-400/40 bg-hero-bg p-8 text-white shadow-frosted-accent"
        data-reduced-motion={reducedMotion ? 'true' : 'false'}
      >
        <button
          type="button"
          onClick={onCancel}
          aria-label="Cancel Quick Lift"
          className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full text-white/70 hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60"
          data-testid="quick-lift-overlay-close"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>

        <h2 id={TITLE_ID} className="sr-only">
          Quick Lift in prayer
        </h2>

        {excerpt ? (
          <p className="mb-6 text-sm italic leading-relaxed text-white/70">
            “{excerpt}”
          </p>
        ) : null}

        <div className="mb-6 flex justify-center">
          <svg viewBox="0 0 200 200" className="h-44 w-44" aria-hidden="true">
            <circle
              cx="100"
              cy="100"
              r={RING_RADIUS}
              fill="none"
              stroke="rgba(139,92,246,0.15)"
              strokeWidth="6"
            />
            <circle
              cx="100"
              cy="100"
              r={RING_RADIUS}
              fill="none"
              stroke="rgb(167,139,250)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={RING_CIRCUMFERENCE}
              strokeDashoffset={RING_CIRCUMFERENCE}
              transform="rotate(-90 100 100)"
              className={cn(
                'quick-lift-ring',
                reducedMotion
                  ? 'quick-lift-ring--reduced'
                  : 'quick-lift-ring--smooth',
              )}
            />
          </svg>
        </div>

        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progressMilestone}
          aria-valuetext={ariaProgressLabel(progressMilestone)}
          aria-live="polite"
          className="sr-only"
        >
          {ariaProgressLabel(progressMilestone)}
        </div>

        {completePhase ? (
          <p
            className="text-center text-lg font-medium text-white"
            aria-live="polite"
          >
            Thank you.
          </p>
        ) : (
          <p className="text-center text-sm text-white/60">
            Praying alongside
          </p>
        )}

        {errorPhase && state.phase === 'error' ? (
          <p
            role="alert"
            className="mt-3 rounded-md border border-red-400/30 bg-red-950/30 p-3 text-sm text-red-100"
          >
            {state.message}
          </p>
        ) : null}
      </div>
    </div>
  )
}
