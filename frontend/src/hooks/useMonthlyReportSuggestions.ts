import type { MonthlyReportData } from '@/hooks/useMonthlyReportData'
import { getMeditationMinutesForRange } from '@/services/meditation-storage'
import { getGratitudeEntries } from '@/services/gratitude-storage'
import { getLocalDateString } from '@/utils/date'

export interface MonthSuggestion {
  id: string
  text: string
  icon: 'Heart' | 'Brain' | 'PenLine' | 'Sparkles' | 'BookOpen' | 'TrendingUp'
  ctas: Array<{ text: string; link: string }>
  topActivities?: Array<{ name: string; count: number }>
}

const ACTIVITY_DISPLAY_NAMES: Record<string, string> = {
  pray: 'Prayer',
  journal: 'Journaling',
  meditate: 'Meditation',
  listen: 'Listening',
  prayerWall: 'Prayer Wall',
}

export function getMonthlyReportSuggestions(data: MonthlyReportData): MonthSuggestion[] {
  const firstDay = new Date(data.year, data.month, 1)
  const lastDay = new Date(data.year, data.month + 1, 0)
  const firstDayStr = getLocalDateString(firstDay)
  const lastDayStr = getLocalDateString(lastDay)

  const suggestions: MonthSuggestion[] = []

  // Priority 1: Mood declined
  if (data.moodTrendPct < 0) {
    suggestions.push({
      id: 'mood-decline',
      text: "This month was tough. You're not alone.",
      icon: 'Heart',
      ctas: [
        { text: 'Talk to God about it >', link: '/daily?tab=pray' },
        { text: 'Find a counselor >', link: '/local-support/counselors' },
      ],
    })
  }

  // Priority 2: Low meditation (< 4 times)
  if (suggestions.length < 3) {
    const meditationSessions = getMeditationMinutesForRange(firstDayStr, lastDayStr)
    if (meditationSessions.length < 4) {
      suggestions.push({
        id: 'low-meditation',
        text: 'Try meditating more — even 2 minutes helps',
        icon: 'Brain',
        ctas: [{ text: 'Start a meditation >', link: '/daily?tab=meditate' }],
      })
    }
  }

  // Priority 3: Low journaling (< 4 times)
  if (suggestions.length < 3 && (data.activityCounts.journal ?? 0) < 4) {
    suggestions.push({
      id: 'low-journaling',
      text: 'Writing helps process emotions — try journaling this week',
      icon: 'PenLine',
      ctas: [{ text: 'Open journal >', link: '/daily?tab=journal' }],
    })
  }

  // Priority 4: No gratitude entries
  if (suggestions.length < 3) {
    const gratitudeEntries = getGratitudeEntries()
    const monthGratitude = gratitudeEntries.filter(
      (e) => e.date >= firstDayStr && e.date <= lastDayStr,
    )
    if (monthGratitude.length === 0) {
      suggestions.push({
        id: 'no-gratitude',
        text: "Try gratitude — it's linked to better mood",
        icon: 'Sparkles',
        ctas: [{ text: 'Start today >', link: '/#gratitude' }],
      })
    }
  }

  // Priority 5: Completed a reading plan
  if (suggestions.length < 3) {
    try {
      const raw = localStorage.getItem('wr_reading_plan_progress')
      if (raw) {
        const progress = JSON.parse(raw) as Record<string, { completedAt?: string }>
        const completedThisMonth = Object.entries(progress).find(([, p]) => {
          if (!p.completedAt) return false
          return p.completedAt >= firstDayStr && p.completedAt <= lastDayStr
        })
        if (completedThisMonth) {
          suggestions.push({
            id: 'plan-completed',
            text: 'You finished a reading plan! Ready for another?',
            icon: 'BookOpen',
            ctas: [{ text: 'Browse plans >', link: '/grow?tab=plans' }],
          })
        }
      }
    } catch {
      /* ignore parse errors */
    }
  }

  // Priority 6: Mood improved
  if (suggestions.length < 3 && data.moodTrendPct > 0) {
    const activityEntries = Object.entries(data.activityCounts)
      .filter(([key]) => key !== 'mood')
      .map(([key, count]) => ({
        name: ACTIVITY_DISPLAY_NAMES[key] ?? key,
        count,
      }))
      .filter((a) => a.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)

    suggestions.push({
      id: 'mood-improved',
      text: "Your mood improved this month! Here's what worked:",
      icon: 'TrendingUp',
      ctas: [],
      topActivities: activityEntries,
    })
  }

  return suggestions.slice(0, 3)
}
