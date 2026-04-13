import { useEffect, useState } from 'react'
import { ANIMATION_DURATIONS, ANIMATION_EASINGS } from '@/constants/animation'

interface DayCompletionCelebrationProps {
  dayNumber: number
  pointsAwarded: boolean
  isLastDay: boolean
  onContinue: () => void
}

const CHECKMARK_PATH_LENGTH = 24

export function DayCompletionCelebration({
  dayNumber,
  pointsAwarded,
  isLastDay,
  onContinue,
}: DayCompletionCelebrationProps) {
  const [visible, setVisible] = useState(false)
  const [drawCheckmark, setDrawCheckmark] = useState(false)

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  useEffect(() => {
    if (prefersReducedMotion) {
      setVisible(true)
      setDrawCheckmark(true)
      return
    }
    // Trigger fade-in on mount
    const frameId = requestAnimationFrame(() => {
      setVisible(true)
      setDrawCheckmark(true)
    })
    return () => cancelAnimationFrame(frameId)
  }, [prefersReducedMotion])

  return (
    <div
      className="border-t border-white/10 py-8 sm:py-10"
      style={
        prefersReducedMotion
          ? undefined
          : {
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(10px)',
              transition: `opacity ${ANIMATION_DURATIONS.base}ms ${ANIMATION_EASINGS.decelerate}, transform ${ANIMATION_DURATIONS.base}ms ${ANIMATION_EASINGS.decelerate}`,
            }
      }
    >
      <div className="flex flex-col items-center gap-3">
        {/* Animated checkmark */}
        <svg
          width="48"
          height="48"
          viewBox="0 0 48 48"
          aria-hidden="true"
        >
          <circle
            cx="24"
            cy="24"
            r="22"
            fill="none"
            stroke="#27AE60"
            strokeWidth="3"
            opacity="0.3"
          />
          <path
            d="M14 24 L21 31 L34 18"
            fill="none"
            stroke="#27AE60"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={CHECKMARK_PATH_LENGTH}
            strokeDashoffset={
              prefersReducedMotion || drawCheckmark ? 0 : CHECKMARK_PATH_LENGTH
            }
            style={
              prefersReducedMotion
                ? undefined
                : { transition: `stroke-dashoffset ${ANIMATION_DURATIONS.slow}ms ${ANIMATION_EASINGS.decelerate} 200ms` }
            }
          />
        </svg>

        {/* Text */}
        <div className="flex flex-col items-center gap-1 sm:flex-row sm:gap-3">
          <span className="text-lg font-bold text-white">
            Day {dayNumber} Complete
          </span>
          {pointsAwarded && (
            <span className="text-sm font-semibold text-primary-lt">
              +15 pts
            </span>
          )}
        </div>

        {/* Continue button */}
        {!isLastDay && (
          <button
            type="button"
            onClick={onContinue}
            className="mt-3 w-full rounded-lg bg-primary px-6 py-3 font-semibold text-white transition-colors hover:bg-primary/90 sm:w-auto"
          >
            Continue to Day {dayNumber + 1}
          </button>
        )}
      </div>
    </div>
  )
}
