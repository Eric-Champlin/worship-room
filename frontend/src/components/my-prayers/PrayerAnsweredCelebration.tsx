import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Sparkles } from 'lucide-react'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { useSoundEffects } from '@/hooks/useSoundEffects'
import { FAITHFULNESS_SCRIPTURES } from '@/constants/faithfulness-scriptures'
import type { FaithfulnessScripture } from '@/constants/faithfulness-scriptures'
import { Z } from '@/constants/z-index'
import { ANIMATION_DURATIONS, ANIMATION_EASINGS } from '@/constants/animation'

const GOLDEN_COLORS = ['#D97706', '#F59E0B', '#FBBF24']

interface PrayerAnsweredCelebrationProps {
  prayerTitle: string
  testimonyNote?: string
  onDismiss: () => void
  onShareRequest: (scripture: FaithfulnessScripture) => void
}

function generateGoldenSparkles(count: number) {
  return Array.from({ length: count }, (_, i) => {
    const color = GOLDEN_COLORS[i % GOLDEN_COLORS.length]
    const left = Math.random() * 100
    const duration = 3 + Math.random() * 1
    const delay = 0.3 + Math.random() * 1.5
    const size = 3 + Math.random() * 3

    return (
      <span
        key={i}
        className="pointer-events-none absolute top-0 animate-golden-sparkle motion-reduce:hidden"
        style={
          {
            '--sparkle-duration': `${duration}s`,
            left: `${left}%`,
            width: size,
            height: size,
            borderRadius: '50%',
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
  onShareRequest,
}: PrayerAnsweredCelebrationProps) {
  const reducedMotion = useReducedMotion()
  const { playSoundEffect } = useSoundEffects()
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const focusTrapRef = useFocusTrap(true, onDismiss)

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640
  const sparkleCount = isMobile ? 10 : 20

  const [selectedScripture] = useState<FaithfulnessScripture>(
    () => FAITHFULNESS_SCRIPTURES[Math.floor(Math.random() * FAITHFULNESS_SCRIPTURES.length)],
  )

  // Animation sequence step
  const [step, setStep] = useState(reducedMotion ? 6 : 0)

  useEffect(() => {
    if (reducedMotion) return
    const timers = [
      setTimeout(() => setStep(1), 0),
      setTimeout(() => setStep(2), 300),
      setTimeout(() => setStep(3), 500),
      setTimeout(() => setStep(4), 900),
      setTimeout(() => setStep(5), 1400),
      setTimeout(() => setStep(6), 2000),
    ]
    return () => timers.forEach(clearTimeout)
  }, [reducedMotion])

  // Play harp sound at step 2 (300ms)
  useEffect(() => {
    if (step === 2) playSoundEffect('harp')
  }, [step, playSoundEffect])

  // Focus close button when buttons appear
  useEffect(() => {
    if (step >= 6) closeButtonRef.current?.focus()
  }, [step])

  // Scroll lock
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  const fadeStyle = (threshold: number, durationMs = 300): React.CSSProperties =>
    reducedMotion
      ? {}
      : {
          opacity: step >= threshold ? 1 : 0,
          transform: step >= threshold ? 'translateY(0)' : 'translateY(10px)',
          transition: `opacity ${durationMs}ms ${ANIMATION_EASINGS.decelerate}, transform ${durationMs}ms ${ANIMATION_EASINGS.decelerate}`,
        }

  return createPortal(
    <div
      ref={focusTrapRef}
      role="dialog"
      aria-labelledby="prayer-celebration-title"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[${Z.OVERLAY}] backdrop-blur-xl`}
        style={{
          background: 'radial-gradient(ellipse at center, rgba(217, 119, 6, 0.15) 0%, rgba(13, 6, 32, 0.95) 60%)',
          opacity: reducedMotion ? 1 : step >= 1 ? 1 : 0,
          transition: reducedMotion ? undefined : `opacity ${ANIMATION_DURATIONS.base}ms ${ANIMATION_EASINGS.decelerate}`,
        }}
        onClick={onDismiss}
        aria-hidden="true"
      >
        {generateGoldenSparkles(sparkleCount)}
      </div>

      {/* Content */}
      <div
        className={`fixed inset-0 z-[${Z.OVERLAY}] pointer-events-none`}
        aria-live="polite"
      >
        <div className="pointer-events-auto flex min-h-screen flex-col items-center justify-center px-6 sm:px-8">
          <div className="max-w-[500px] text-center">
            {/* Sparkles icon */}
            <div style={fadeStyle(3)}>
              <Sparkles className="mx-auto mb-4 h-8 w-8 text-amber-400" aria-hidden="true" />
            </div>

            {/* Heading */}
            <h2
              id="prayer-celebration-title"
              className="text-2xl font-bold text-white sm:text-3xl"
              style={fadeStyle(3)}
            >
              God Answered Your Prayer
            </h2>

            {/* Prayer topic */}
            <p
              className="mt-4 font-serif text-lg italic text-white/80"
              style={fadeStyle(4)}
            >
              &ldquo;{prayerTitle}&rdquo;
            </p>

            {/* Testimony note */}
            {testimonyNote && (
              <p
                className="mx-auto mt-3 max-w-md text-base text-white/70"
                style={fadeStyle(4)}
              >
                {testimonyNote}
              </p>
            )}

            {/* Scripture */}
            <p
              className="mt-6 font-serif text-base italic text-white/60"
              style={fadeStyle(5, 400)}
            >
              &ldquo;{selectedScripture.text}&rdquo;
            </p>
            <p
              className="mt-1 text-sm text-white/50"
              style={fadeStyle(5, 400)}
            >
              — {selectedScripture.reference}
            </p>

            {/* Buttons */}
            <div
              className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center"
              style={fadeStyle(6)}
            >
              <button
                onClick={() => onShareRequest(selectedScripture)}
                className="min-h-[44px] rounded-xl bg-amber-600 px-6 py-3 font-medium text-white transition-colors hover:bg-amber-500 focus-visible:ring-2 focus-visible:ring-amber-400"
              >
                Share Your Testimony
              </button>
              <button
                ref={closeButtonRef}
                onClick={onDismiss}
                className="min-h-[44px] rounded-lg border border-white/30 px-8 py-3 text-white transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/50"
                aria-label="Close celebration"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
