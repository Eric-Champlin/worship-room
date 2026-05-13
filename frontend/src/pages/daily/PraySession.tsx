import { useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { X } from 'lucide-react'
import { usePraySession, type PrayLength } from '@/hooks/usePraySession'
import { PrayCompletionScreen } from '@/components/daily/PrayCompletionScreen'
import { ANIMATION_DURATIONS, ANIMATION_EASINGS } from '@/constants/animation'

interface PraySessionProps {
  length: PrayLength
}

// Spec 6.2b — Full-screen immersive prayer session overlay. Mounts above
// DailyHub when /daily?tab=pray&length={1,5,10}. fixed inset-0 z-50 sits above
// the transparent navbar (z-10), sticky tab bar (z-40), and FAB (z-40).
export function PraySession({ length }: PraySessionProps) {
  const [, setSearchParams] = useSearchParams()
  const endEarlyButtonRef = useRef<HTMLButtonElement>(null)

  const handleSessionEnd = () => {
    // Strip ?length= (keep ?tab=pray); DailyHub will unmount this overlay.
    setSearchParams({ tab: 'pray' }, { replace: true })
  }

  const { phase, currentPrompt, endEarly } = usePraySession({ length })

  // Focus the End-early button on mount so keyboard users can immediately
  // escape if needed (Gate-G-A11Y).
  useEffect(() => {
    endEarlyButtonRef.current?.focus()
  }, [])

  const isAmenPhase = phase === 'amen'
  const promptVisible = phase === 'visible' || phase === 'fading-in' || phase === 'fading-out'
  const promptOpacity = phase === 'visible' ? 1 : 0

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Prayer session"
      className="fixed inset-0 z-50 flex flex-col bg-hero-bg"
    >
      {/* Own skip-link — canonical Navbar skip-link is z-stacked below this overlay. */}
      <a
        href="#pray-session-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-hero-bg"
      >
        Skip to main content
      </a>

      {/* End-early button — top-right, always reachable, no confirmation. */}
      <div
        className="absolute right-4 top-4 z-10"
        style={{
          top: 'max(1rem, env(safe-area-inset-top))',
          right: 'max(1rem, env(safe-area-inset-right))',
        }}
      >
        <Button
          ref={endEarlyButtonRef}
          variant="subtle"
          size="sm"
          onClick={endEarly}
          aria-label="End prayer session early"
          className="min-h-[44px]"
        >
          <X className="h-4 w-4" aria-hidden="true" />
          End early
        </Button>
      </div>

      <main id="pray-session-main" className="flex flex-1 items-center justify-center px-4">
        {!isAmenPhase && (
          <div
            role="status"
            aria-live="polite"
            className="mx-auto max-w-2xl"
            style={{
              opacity: promptOpacity,
              transition: `opacity ${ANIMATION_DURATIONS.meditative}ms ${ANIMATION_EASINGS.decelerate}`,
            }}
          >
            {promptVisible && currentPrompt && (
              <p className="text-center font-serif text-2xl leading-relaxed text-white sm:text-3xl">
                {currentPrompt.text}
              </p>
            )}
          </div>
        )}
        {isAmenPhase && <PrayCompletionScreen onComplete={handleSessionEnd} />}
      </main>
    </div>
  )
}
