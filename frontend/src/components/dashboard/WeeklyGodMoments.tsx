import { useState, useEffect, useRef } from 'react'
import { BookOpen, CheckCircle, TrendingUp, Minus, Heart, X } from 'lucide-react'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import type { MoodTrend } from '@/hooks/useWeeklyGodMoments'

interface WeeklyGodMomentsProps {
  isVisible: boolean
  devotionalsRead: number
  totalActivities: number
  moodTrend: MoodTrend
  dismiss: () => void
}

const MOOD_TREND_CONFIG: Record<MoodTrend, { icon: typeof TrendingUp; color: string; label: string }> = {
  improving: { icon: TrendingUp, color: 'text-success', label: 'Improving' },
  steady: { icon: Minus, color: 'text-white/60', label: 'Steady' },
  'needs-grace': { icon: Heart, color: 'text-amber-400', label: 'Needs grace' },
  insufficient: { icon: TrendingUp, color: 'text-white/40', label: 'Keep checking in' },
}

export function WeeklyGodMoments({
  isVisible,
  devotionalsRead,
  totalActivities,
  moodTrend,
  dismiss,
}: WeeklyGodMomentsProps) {
  const prefersReduced = useReducedMotion()
  const [fading, setFading] = useState(false)
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current)
    }
  }, [])

  if (!isVisible && !fading) return null

  const handleDismiss = () => {
    if (prefersReduced) {
      dismiss()
      return
    }
    setFading(true)
    fadeTimerRef.current = setTimeout(() => {
      dismiss()
    }, 300)
  }

  const trendConfig = MOOD_TREND_CONFIG[moodTrend]
  const TrendIcon = trendConfig.icon
  const devotionalColor = devotionalsRead >= 7 ? 'text-success' : 'text-white/60'

  return (
    <div
      className="relative rounded-2xl border border-primary/20 bg-primary/10 p-4 transition-opacity duration-300 md:p-6"
      style={{ opacity: fading ? 0 : 1 }}
      role="region"
      aria-label="Your week with God summary"
    >
      <button
        onClick={handleDismiss}
        className="absolute right-3 top-3 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-white/40 hover:text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
        aria-label="Dismiss weekly summary"
      >
        <X className="h-5 w-5" />
      </button>

      <h2 className="mb-4 text-lg font-semibold text-white">Your Week with God</h2>

      <div className="flex flex-col gap-4 sm:flex-row sm:gap-0 sm:divide-x sm:divide-white/10">
        <div className="flex items-center gap-3 sm:pr-6">
          <BookOpen className={`h-6 w-6 shrink-0 ${devotionalColor}`} aria-hidden="true" />
          <div>
            <span className={`text-lg font-semibold ${devotionalColor}`}>{devotionalsRead} of 7</span>
            <p className="text-sm text-white/50">devotionals</p>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:px-6">
          <CheckCircle className="h-6 w-6 shrink-0 text-white/60" aria-hidden="true" />
          <div>
            <span className="text-lg font-semibold text-white/60">{totalActivities}</span>
            <p className="text-sm text-white/50">activities this week</p>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:pl-6">
          <TrendIcon className={`h-6 w-6 shrink-0 ${trendConfig.color}`} aria-hidden="true" />
          <div>
            <span className={`text-lg font-semibold ${trendConfig.color}`}>{trendConfig.label}</span>
            <p className="text-sm text-white/50">mood trend</p>
          </div>
        </div>
      </div>
    </div>
  )
}
