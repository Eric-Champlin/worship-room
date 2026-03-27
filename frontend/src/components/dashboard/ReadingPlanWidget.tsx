import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Check, ChevronRight } from 'lucide-react'
import { useReadingPlanProgress } from '@/hooks/useReadingPlanProgress'
import { READING_PLANS, getReadingPlan } from '@/data/reading-plans'
import { getActivityLog } from '@/services/faith-points-storage'
import { getMoodEntries } from '@/services/mood-storage'
import { getLocalDateString } from '@/utils/date'
import type { MoodValue } from '@/types/dashboard'
import type { PlanTheme } from '@/types/reading-plans'

const PLAN_THEME_TO_MOOD: Record<PlanTheme, MoodValue[]> = {
  anxiety: [1, 2],
  grief: [1, 2],
  gratitude: [4, 5],
  identity: [2, 3],
  forgiveness: [1, 2],
  trust: [1, 2],
  hope: [1, 2],
  healing: [1, 2],
  purpose: [3, 4],
  relationships: [4, 5],
}

function calculateReadingStreak(): number {
  const log = getActivityLog()
  const today = new Date()
  let streak = 0

  for (let i = 0; i < 365; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateStr = getLocalDateString(d)
    const entry = log[dateStr]
    if (entry?.readingPlan) {
      streak++
    } else {
      break
    }
  }
  return streak
}

export function ReadingPlanWidget() {
  const { progress, getActivePlanId, getPlanStatus } = useReadingPlanProgress()

  const activePlanId = getActivePlanId()
  const activePlan = activePlanId ? getReadingPlan(activePlanId) : undefined
  const activeProgress = activePlanId ? progress[activePlanId] : undefined

  // Determine widget state
  const allCompleted = useMemo(() => {
    return READING_PLANS.every((p) => {
      const status = getPlanStatus(p.id)
      return status === 'completed'
    })
  }, [getPlanStatus])

  // Most recently completed plan (for completed state)
  const recentlyCompleted = useMemo(() => {
    if (activePlan) return null
    let latest: { id: string; completedAt: string } | null = null
    for (const [planId, p] of Object.entries(progress)) {
      if (p.completedAt) {
        if (!latest || p.completedAt > latest.completedAt) {
          latest = { id: planId, completedAt: p.completedAt }
        }
      }
    }
    return latest ? getReadingPlan(latest.id) : null
  }, [activePlan, progress])

  // Discovery suggestions based on mood
  const suggestedPlans = useMemo(() => {
    if (activePlan || allCompleted) return []

    const moodEntries = getMoodEntries()
    const last7Days = moodEntries.slice(-7)

    let matchedPlans: typeof READING_PLANS = []

    if (last7Days.length > 0) {
      // Find most common mood
      const counts: Record<number, number> = {}
      for (const e of last7Days) {
        counts[e.mood] = (counts[e.mood] ?? 0) + 1
      }
      const dominantMood = Number(
        Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0],
      ) as MoodValue

      // Filter to matching themes
      const matchingThemes = Object.entries(PLAN_THEME_TO_MOOD)
        .filter(([, moods]) => moods.includes(dominantMood))
        .map(([theme]) => theme as PlanTheme)

      matchedPlans = READING_PLANS.filter((p) => {
        const status = getPlanStatus(p.id)
        return (
          matchingThemes.includes(p.theme) &&
          (status === 'unstarted' || status === 'paused')
        )
      })
    }

    // Fallback: first 3 beginner plans
    if (matchedPlans.length === 0) {
      matchedPlans = READING_PLANS.filter((p) => {
        const status = getPlanStatus(p.id)
        return (
          p.difficulty === 'beginner' &&
          (status === 'unstarted' || status === 'paused')
        )
      })
    }

    return matchedPlans.slice(0, 3)
  }, [activePlan, allCompleted, getPlanStatus])

  // Calculate reading streak (memoized to avoid re-reading localStorage on every render)
  const readingStreak = useMemo(() => {
    if (!activePlan) return 0
    return calculateReadingStreak()
  }, [activePlan, progress])

  // --- Active Plan State ---
  if (activePlan && activeProgress) {
    const completionPercent = Math.round(
      (activeProgress.completedDays.length / activePlan.durationDays) * 100,
    )
    const currentDayContent = activePlan.days.find(
      (d) => d.dayNumber === activeProgress.currentDay,
    )

    return (
      <div className="space-y-3">
        <p className="text-base font-semibold text-white">{activePlan.title}</p>

        <div
          className="h-2 rounded-full bg-white/10"
          role="progressbar"
          aria-valuenow={activeProgress.completedDays.length}
          aria-valuemin={0}
          aria-valuemax={activePlan.durationDays}
          aria-label="Reading plan progress"
        >
          <div
            className="h-2 rounded-full bg-primary transition-all duration-500"
            style={{ width: `${completionPercent}%` }}
          />
        </div>

        <p className="text-sm text-white/50">
          Day {activeProgress.currentDay} of {activePlan.durationDays} ({completionPercent}%)
        </p>

        {currentDayContent && (
          <p className="text-sm text-white/70">{currentDayContent.title}</p>
        )}

        <Link
          to={`/reading-plans/${activePlan.id}`}
          className="inline-flex items-center gap-1 text-sm font-medium text-primary-lt transition-colors hover:text-primary"
        >
          Continue reading
          <ChevronRight size={14} />
        </Link>

        {readingStreak > 0 && (
          <p className="text-xs text-white/40">
            {readingStreak} day reading streak
          </p>
        )}
      </div>
    )
  }

  // --- All Completed State ---
  if (allCompleted) {
    return (
      <div className="flex flex-col items-center gap-2 py-2 text-center">
        <Check className="h-8 w-8 text-success" />
        <p className="text-base font-semibold text-white">
          You&apos;ve completed all plans!
        </p>
        <p className="text-sm text-white/50">
          What an incredible journey through Scripture.
        </p>
      </div>
    )
  }

  // --- Recently Completed State ---
  if (recentlyCompleted) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Check className="h-6 w-6 flex-shrink-0 text-success" />
          <p className="text-base font-semibold text-white">
            You completed {recentlyCompleted.title}!
          </p>
        </div>
        <span className="text-2xl" aria-hidden="true">
          {recentlyCompleted.coverEmoji}
        </span>
        <Link
          to="/grow?tab=plans"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary-lt transition-colors hover:text-primary"
        >
          Start another plan
          <ChevronRight size={14} />
        </Link>
      </div>
    )
  }

  // --- Discovery State ---
  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-white">Start a guided journey</p>
      <p className="mt-1 text-xs text-white/50">
        Reading plans walk you through Scripture day by day.
      </p>

      <div className="space-y-2">
        {suggestedPlans.map((plan) => (
          <Link
            key={plan.id}
            to={`/reading-plans/${plan.id}`}
            className="flex items-center gap-3 rounded-lg bg-white/5 p-3 transition-colors hover:bg-white/10"
          >
            <span className="text-lg" aria-hidden="true">
              {plan.coverEmoji}
            </span>
            <span className="text-sm font-medium text-white">
              {plan.title}
            </span>
          </Link>
        ))}
      </div>

      <Link
        to="/grow?tab=plans"
        className="inline-flex items-center gap-1 text-sm font-medium text-primary-lt transition-colors hover:text-primary"
      >
        Browse all plans
        <ChevronRight size={14} />
      </Link>
    </div>
  )
}
