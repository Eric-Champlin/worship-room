import { useMemo } from 'react'
import { useAuth } from '@/hooks/useAuth'
import {
  canShowSurprise,
  getDaysSinceFirstActivity,
  getShownMilestones,
} from '@/services/surprise-storage'

const MILESTONE_DAYS = [7, 30, 90, 365] as const
type MilestoneDay = (typeof MILESTONE_DAYS)[number]

interface AnniversaryStats {
  prayers: number
  journals: number
  meditations: number
  currentStreak: number
  levelName: string
}

interface MilestoneContent {
  heading: string
  closingMessage: string
}

const MILESTONE_CONTENT: Record<MilestoneDay, MilestoneContent> = {
  7: {
    heading: 'One Week with Worship Room',
    closingMessage: 'Keep going — God is growing something beautiful in you.',
  },
  30: {
    heading: 'One Month with Worship Room',
    closingMessage: "A month of showing up. That's not discipline — that's devotion.",
  },
  90: {
    heading: 'Three Months with Worship Room',
    closingMessage: "You've built something rare — a rhythm of faith. Don't stop now.",
  },
  365: {
    heading: 'One Year with Worship Room',
    closingMessage:
      'A full year of walking with God through this room. You are not the same person who first walked in.',
  },
}

function computeStats(): AnniversaryStats {
  let prayers = 0
  let journals = 0
  let meditations = 0
  let currentStreak = 0
  let levelName = 'Seedling'

  try {
    const activityRaw = localStorage.getItem('wr_daily_activities')
    if (activityRaw) {
      const activities = JSON.parse(activityRaw)
      if (activities && typeof activities === 'object' && !Array.isArray(activities)) {
        for (const day of Object.values(activities) as Array<Record<string, boolean>>) {
          if (day.pray) prayers++
          if (day.journal) journals++
        }
      }
    }
  } catch (_e) {
    // ignore malformed data
  }

  try {
    const meditationRaw = localStorage.getItem('wr_meditation_history')
    if (meditationRaw) {
      const parsed = JSON.parse(meditationRaw)
      if (Array.isArray(parsed)) {
        meditations = parsed.length
      }
    }
  } catch (_e) {
    // ignore
  }

  try {
    const streakRaw = localStorage.getItem('wr_streak')
    if (streakRaw) {
      const parsed = JSON.parse(streakRaw)
      if (parsed && typeof parsed.currentStreak === 'number') {
        currentStreak = parsed.currentStreak
      }
    }
  } catch (_e) {
    // ignore
  }

  try {
    const fpRaw = localStorage.getItem('wr_faith_points')
    if (fpRaw) {
      const parsed = JSON.parse(fpRaw)
      if (parsed && typeof parsed.currentLevelName === 'string') {
        levelName = parsed.currentLevelName
      }
    }
  } catch (_e) {
    // ignore
  }

  return { prayers, journals, meditations, currentStreak, levelName }
}

export interface AnniversaryMomentResult {
  show: boolean
  milestone?: MilestoneDay
  heading?: string
  closingMessage?: string
  stats?: Array<{ label: string; value: string }>
}

export function useAnniversaryMoment(): AnniversaryMomentResult {
  const { isAuthenticated } = useAuth()

  return useMemo(() => {
    if (!isAuthenticated) return { show: false }
    if (!canShowSurprise()) return { show: false }

    const daysSince = getDaysSinceFirstActivity()
    if (daysSince === null) return { show: false }

    const milestone = MILESTONE_DAYS.find((d) => d === daysSince)
    if (!milestone) return { show: false }

    const shownMilestones = getShownMilestones()
    if (shownMilestones.includes(milestone)) return { show: false }

    const content = MILESTONE_CONTENT[milestone]
    const raw = computeStats()

    const stats: Array<{ label: string; value: string }> = []
    if (raw.prayers > 0) stats.push({ label: 'Prayers', value: String(raw.prayers) })
    if (raw.journals > 0) stats.push({ label: 'Journal entries', value: String(raw.journals) })
    if (raw.meditations > 0) stats.push({ label: 'Meditations', value: String(raw.meditations) })
    if (raw.currentStreak > 0) stats.push({ label: 'Current streak', value: `${raw.currentStreak} days` })
    if (raw.levelName !== 'Seedling') {
      stats.push({ label: 'Garden growth', value: `Seedling → ${raw.levelName}` })
    }

    return {
      show: true,
      milestone,
      heading: content.heading,
      closingMessage: content.closingMessage,
      stats,
    }
  }, [isAuthenticated])
}
