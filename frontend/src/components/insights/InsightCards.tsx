import { useMemo } from 'react'
import { Lightbulb, Sparkles, Sunrise } from 'lucide-react'
import {
  getDayOfYear,
  getInsightCardsForDay,
} from '@/constants/dashboard/ai-insights'
import { getMoodEntries } from '@/services/mood-storage'
import type { MoodEntry } from '@/types/dashboard'

interface InsightCardsProps {
  hasData: boolean
}

interface MoodChangeInsight {
  message: string
  icon: typeof Sunrise
}

function computeMoodChangeInsight(entries: MoodEntry[]): MoodChangeInsight | null {
  // Group entries by date, separating morning and evening
  const dayMap = new Map<string, { morning?: number; evening?: number }>()
  for (const e of entries) {
    const existing = dayMap.get(e.date) ?? {}
    if (e.timeOfDay === 'evening') {
      existing.evening = e.mood
    } else {
      existing.morning = e.mood
    }
    dayMap.set(e.date, existing)
  }

  // Filter for days with both morning and evening
  const dualDays = Array.from(dayMap.values()).filter(
    (d) => d.morning !== undefined && d.evening !== undefined,
  )

  if (dualDays.length < 5) return null

  const totalDiff = dualDays.reduce((sum, d) => sum + (d.evening! - d.morning!), 0)
  const avgDiff = totalDiff / dualDays.length

  if (avgDiff > 0.3) {
    return {
      message: "Your mood tends to improve by evening — your daily practices are making a difference!",
      icon: Sunrise,
    }
  } else if (avgDiff < -0.3) {
    return {
      message: "Your mood tends to dip by evening — consider adding a restful practice to your afternoon routine.",
      icon: Sunrise,
    }
  } else {
    return {
      message: "Your mood stays steady throughout the day — a sign of emotional resilience.",
      icon: Sunrise,
    }
  }
}

export function InsightCards({ hasData }: InsightCardsProps) {
  const insights = useMemo(() => {
    const day = getDayOfYear()
    return getInsightCardsForDay(day, 4, 0)
  }, [])

  const moodChangeInsight = useMemo(() => {
    const entries = getMoodEntries()
    return computeMoodChangeInsight(entries)
  }, [])

  if (!hasData) {
    return (
      <section aria-labelledby="insights-title">
        <div className="mb-4 flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-white/60" aria-hidden="true" />
          <h2
            id="insights-title"
            className="text-base font-semibold text-white md:text-lg"
          >
            Insights
          </h2>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center backdrop-blur-sm">
          <Sparkles
            className="mx-auto mb-3 h-8 w-8 text-white/30"
            aria-hidden="true"
          />
          <p className="text-sm text-white/60 leading-relaxed md:text-base">
            Start checking in to see your insights grow. Each day you share how
            you&apos;re feeling, we&apos;ll have more to reflect on together.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section aria-labelledby="insights-title">
      <div className="mb-4 flex items-center gap-2">
        <Lightbulb className="h-5 w-5 text-white/60" aria-hidden="true" />
        <h2
          id="insights-title"
          className="text-base font-semibold text-white md:text-lg"
        >
          Insights
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {insights.map((insight) => {
          const Icon = insight.icon
          return (
            <div
              key={insight.id}
              className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm md:p-6"
            >
              <div className="mb-2 flex items-center gap-2">
                <Icon
                  className="h-5 w-5 text-white/60"
                  aria-hidden="true"
                />
                <span className="text-xs uppercase tracking-wider text-white/60">
                  {insight.categoryLabel}
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-white/80 md:text-base">
                {insight.text}
              </p>
            </div>
          )
        })}
        {moodChangeInsight && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm md:p-6">
            <div className="mb-2 flex items-center gap-2">
              <moodChangeInsight.icon
                className="h-5 w-5 text-white/60"
                aria-hidden="true"
              />
              <span className="text-xs uppercase tracking-wider text-white/60">
                Morning vs Evening
              </span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-white/80 md:text-base">
              {moodChangeInsight.message}
            </p>
          </div>
        )}
      </div>

      <p className="mt-4 text-center text-xs text-white/60">
        Insights are illustrative examples. Personalized AI insights coming
        soon.
      </p>
    </section>
  )
}
