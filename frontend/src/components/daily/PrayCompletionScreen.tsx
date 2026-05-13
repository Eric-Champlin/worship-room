import { useEffect } from 'react'
import { ANIMATION_DURATIONS, ANIMATION_EASINGS } from '@/constants/animation'
import { AMEN_SCREEN_HOLD_MS } from '@/constants/pray-session-prompts'

interface PrayCompletionScreenProps {
  onComplete: () => void
}

// Amen screen: fades in via the slow (400ms) duration, holds AMEN_SCREEN_HOLD_MS,
// then fires onComplete. Not dismissible, not skippable — anti-pressure D-6.
export function PrayCompletionScreen({ onComplete }: PrayCompletionScreenProps) {
  useEffect(() => {
    const t = setTimeout(onComplete, AMEN_SCREEN_HOLD_MS)
    return () => clearTimeout(t)
  }, [onComplete])

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex h-full w-full items-center justify-center"
      style={{
        transition: `opacity ${ANIMATION_DURATIONS.slow}ms ${ANIMATION_EASINGS.decelerate}`,
      }}
    >
      <p className="font-serif text-5xl text-white sm:text-6xl">Amen.</p>
    </div>
  )
}
