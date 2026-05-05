import { useCallback, useEffect, useRef, useState } from 'react'
import { ANIMATION_DURATIONS, ANIMATION_EASINGS } from '@/constants/animation'
import { createPortal } from 'react-dom'
import { BookCheck, X } from 'lucide-react'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { useSoundEffects } from '@/hooks/useSoundEffects'
import { CONFETTI_COLORS } from '@/constants/dashboard/badge-icons'
import { PLAN_COMPLETION_SCRIPTURES } from '@/constants/reading-plan-completion-scriptures'
import { generatePlanCompletionImage } from '@/lib/plan-completion-canvas'
import { GRADIENT_TEXT_STYLE } from '@/constants/gradients'

interface PlanCompletionOverlayProps {
  planTitle: string
  totalDays: number
  planId: string
  startDate?: string | null
  onDismiss: () => void
  onBrowsePlans: () => void
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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function PlanCompletionOverlay({
  planTitle,
  totalDays,
  planId,
  startDate,
  onDismiss,
  onBrowsePlans,
}: PlanCompletionOverlayProps) {
  const reducedMotion = useReducedMotion()
  const { playSoundEffect } = useSoundEffects()
  const doneButtonRef = useRef<HTMLButtonElement>(null)
  const containerRef = useFocusTrap(true, onDismiss)

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640
  const confettiCount = reducedMotion ? 0 : isMobile ? 15 : 30

  const [scripture] = useState(() =>
    PLAN_COMPLETION_SCRIPTURES[Math.floor(Math.random() * PLAN_COMPLETION_SCRIPTURES.length)],
  )

  // Step-based animation sequence
  const [step, setStep] = useState(reducedMotion ? 7 : 0)

  useEffect(() => {
    if (reducedMotion) return
    const timers = [
      setTimeout(() => setStep(1), 0),
      setTimeout(() => setStep(2), 300),
      setTimeout(() => setStep(3), 500),
      setTimeout(() => setStep(4), 900),
      setTimeout(() => setStep(5), 1200),
      setTimeout(() => setStep(6), 1700),
      setTimeout(() => setStep(7), 2000),
    ]
    return () => timers.forEach(clearTimeout)
  }, [reducedMotion])

  // Play ascending sound when heading appears
  useEffect(() => {
    if (step === 3) playSoundEffect('ascending')
  }, [step, playSoundEffect])

  // Focus Done button when CTAs appear
  useEffect(() => {
    if (step >= 7) doneButtonRef.current?.focus()
  }, [step])

  // Scroll lock
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  // Auto-dismiss after 15 seconds
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(), 15_000)
    return () => clearTimeout(timer)
  }, [onDismiss])

  const fadeStyle = (threshold: number, durationMs: number = ANIMATION_DURATIONS.base): React.CSSProperties =>
    reducedMotion
      ? {}
      : {
          opacity: step >= threshold ? 1 : 0,
          transform: step >= threshold ? 'translateY(0)' : 'translateY(10px)',
          transition: `opacity ${durationMs}ms ${ANIMATION_EASINGS.decelerate}, transform ${durationMs}ms ${ANIMATION_EASINGS.decelerate}`,
        }

  const handleShare = useCallback(async () => {
    try {
      const blob = await generatePlanCompletionImage({
        planTitle,
        totalDays,
        totalPoints: totalDays * 15,
        scripture,
      })
      const file = new File([blob], `reading-plan-complete-${planId}.png`, { type: 'image/png' })
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: `${planTitle} — Plan Complete!`,
          text: `I completed the ${planTitle} reading plan on Worship Room!`,
          files: [file],
        })
      } else {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `reading-plan-complete-${planId}.png`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
    } catch (_e) {
      // User cancelled or share failed — silently ignore
    }
  }, [planTitle, totalDays, scripture, planId])

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="plan-completion-title"
      ref={containerRef}
      style={{
        opacity: reducedMotion ? 1 : step >= 1 ? 1 : 0,
        transition: reducedMotion ? undefined : `opacity ${ANIMATION_DURATIONS.base}ms ${ANIMATION_EASINGS.decelerate}`,
      }}
    >
      {/* Confetti */}
      {step >= 2 && confettiCount > 0 && generateConfetti(confettiCount)}

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
          {/* Icon */}
          <div style={fadeStyle(3)}>
            <BookCheck className="mx-auto mb-3 h-10 w-10 text-primary-lt" aria-hidden="true" />
          </div>

          {/* Heading */}
          <h2
            id="plan-completion-title"
            className="text-4xl font-bold sm:text-5xl"
            style={{ ...fadeStyle(3), ...GRADIENT_TEXT_STYLE }}
          >
            Plan Complete!
          </h2>

          {/* Plan title */}
          <p className="mt-3 text-xl font-bold text-white" style={fadeStyle(4, 200)}>
            {planTitle}
          </p>

          {/* Stats card */}
          <div
            className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4"
            style={fadeStyle(5, 300)}
          >
            <p className="text-lg font-bold text-white">{totalDays} days completed</p>
            {startDate && (
              <p className="mt-1 text-sm text-white/60">
                Started {formatDate(startDate)} — Finished {formatDate(new Date().toISOString())}
              </p>
            )}
            <p className="mt-1 text-sm text-white/60">+{totalDays * 15} faith points earned</p>
          </div>

          {/* Scripture */}
          <blockquote
            className="mt-5 font-serif text-base italic leading-relaxed text-white/80"
            style={fadeStyle(6, 300)}
          >
            {scripture.text}
          </blockquote>
          <p className="mt-2 text-sm text-white/60" style={fadeStyle(6, 300)}>
            — {scripture.reference}
          </p>

          {/* CTA buttons */}
          <div
            className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center"
            style={fadeStyle(7, 200)}
          >
            <button
              type="button"
              onClick={onBrowsePlans}
              className="min-h-[44px] rounded-xl border border-white/10 bg-white/[0.08] px-6 py-3 font-medium text-white transition-colors hover:bg-white/[0.12]"
            >
              Browse Plans
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="min-h-[44px] rounded-xl border border-white/10 bg-white/[0.08] px-6 py-3 font-medium text-white transition-colors hover:bg-white/[0.12]"
            >
              Share
            </button>
            <button
              ref={doneButtonRef}
              type="button"
              onClick={onDismiss}
              className="min-h-[44px] rounded-xl border border-white/10 bg-white/[0.08] px-6 py-3 font-medium text-white transition-colors hover:bg-white/[0.12]"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
