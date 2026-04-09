import { useState } from 'react'

import { useAuthModal } from '@/components/prayer-wall/AuthModalProvider'
import { useAuth } from '@/hooks/useAuth'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { saveReflection } from '@/lib/bible/plansStore'
import { renderPlanCompletionCard } from '@/lib/bible/planShareCanvas'

interface PlanCompletionCelebrationProps {
  planTitle: string
  planDescription: string
  daysCompleted: number
  dateRange: string
  passageCount: number
  slug: string
  onClose: () => void
}

export function PlanCompletionCelebration({
  planTitle,
  planDescription,
  daysCompleted,
  dateRange,
  passageCount,
  slug,
  onClose,
}: PlanCompletionCelebrationProps) {
  const containerRef = useFocusTrap(true, onClose)
  const { isAuthenticated } = useAuth()
  const authModal = useAuthModal()
  const [reflectionText, setReflectionText] = useState('')
  const [isSharing, setIsSharing] = useState(false)

  function handleSaveReflection() {
    if (!isAuthenticated) {
      authModal?.openAuthModal('Sign in to save your reflection')
      return
    }
    if (reflectionText.trim()) {
      saveReflection(slug, reflectionText.trim())
    }
    onClose()
  }

  async function handleShare() {
    setIsSharing(true)
    try {
      const blob = await renderPlanCompletionCard({
        planTitle,
        daysCompleted,
        dateRange,
      })
      const filename = `${planTitle}-completion.png`
      if (navigator.share) {
        const file = new File([blob], filename, { type: 'image/png' })
        await navigator.share({ files: [file] })
      } else {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch {
      // Silent — share may be cancelled
    } finally {
      setIsSharing(false)
    }
  }

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`You finished ${planTitle}`}
    >
      <div className="w-full max-w-lg rounded-2xl bg-dashboard-dark p-6 shadow-2xl sm:p-8">
        {/* Heading */}
        <h2 className="text-3xl font-bold text-white">
          You finished {planTitle}
        </h2>

        {/* Subtitle */}
        <p className="mt-2 text-lg text-white/70">{planDescription}</p>

        {/* Stats */}
        <p className="mt-4 text-sm text-white/60">
          {daysCompleted} days completed · {dateRange} · {passageCount} passages read
        </p>

        {/* Reflection textarea */}
        <div className="mt-6">
          <label htmlFor="plan-reflection" className="block text-sm font-medium text-white/60">
            What did you take from this plan?
          </label>
          <textarea
            id="plan-reflection"
            value={reflectionText}
            onChange={(e) => setReflectionText(e.target.value)}
            rows={4}
            maxLength={1000}
            className="mt-2 w-full max-h-[200px] resize-y rounded-xl border border-white/30 bg-white/[0.04] px-4 py-3 text-white placeholder:text-white/50 focus:border-white/60 focus:outline-none focus:ring-2 focus:ring-white/30"
            placeholder="Optional — share your thoughts..."
          />
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <button
            onClick={handleSaveReflection}
            className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-white px-8 py-3.5 text-base font-semibold text-hero-bg shadow-[0_0_30px_rgba(255,255,255,0.20)] transition-all duration-200 hover:bg-white/90 hover:shadow-[0_0_40px_rgba(255,255,255,0.30)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-dashboard-dark"
          >
            Continue
          </button>

          <button
            onClick={handleShare}
            disabled={isSharing}
            className="inline-flex min-h-[44px] items-center justify-center text-sm text-white/60 transition-colors hover:text-white disabled:opacity-50"
          >
            {isSharing ? 'Sharing...' : 'Share your completion'}
          </button>
        </div>
      </div>
    </div>
  )
}
