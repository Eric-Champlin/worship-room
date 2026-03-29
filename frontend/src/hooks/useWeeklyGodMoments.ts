import { useState, useCallback, useMemo } from 'react'
import { getLocalDateString, getCurrentWeekStart } from '@/utils/date'
import { getMoodEntries } from '@/services/mood-storage'
import { getActivityLog } from '@/services/faith-points-storage'
import type { DailyActivities } from '@/types/dashboard'

const DISMISSED_KEY = 'wr_weekly_summary_dismissed'

export type MoodTrend = 'improving' | 'steady' | 'needs-grace' | 'insufficient'

export interface WeeklyGodMomentsData {
  isVisible: boolean
  devotionalsRead: number
  totalActivities: number
  moodTrend: MoodTrend
  dismiss: () => void
}

function getDateNDaysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

function countActiveDays(activityLog: Record<string, DailyActivities>, daysBack: number): number {
  const activeDates = new Set<string>()
  for (let i = 0; i < daysBack; i++) {
    const dateStr = getLocalDateString(getDateNDaysAgo(i))
    const day = activityLog[dateStr]
    if (day) {
      const hasActivity = day.mood || day.pray || day.listen || day.prayerWall || day.meditate || day.journal
      if (hasActivity) activeDates.add(dateStr)
    }
  }
  return activeDates.size
}

function countDevotionalsInPast7Days(reads: string[]): number {
  const readsSet = new Set(reads)
  let count = 0
  for (let i = 0; i < 7; i++) {
    const dateStr = getLocalDateString(getDateNDaysAgo(i))
    if (readsSet.has(dateStr)) count++
  }
  return count
}

function countTotalActivitiesInPast7Days(activityLog: Record<string, DailyActivities>): number {
  let total = 0
  for (let i = 0; i < 7; i++) {
    const dateStr = getLocalDateString(getDateNDaysAgo(i))
    const day = activityLog[dateStr]
    if (day) {
      if (day.mood) total++
      if (day.pray) total++
      if (day.listen) total++
      if (day.prayerWall) total++
      if (day.meditate) total++
      if (day.journal) total++
    }
  }
  return total
}

function computeMoodTrend(): MoodTrend {
  const entries = getMoodEntries()
  const today = new Date()

  const thisWeekMoods: number[] = []
  const lastWeekMoods: number[] = []

  for (const entry of entries) {
    const entryDate = new Date(entry.timestamp)
    const daysAgo = Math.floor((today.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24))
    if (daysAgo >= 0 && daysAgo < 7) {
      thisWeekMoods.push(entry.mood)
    } else if (daysAgo >= 7 && daysAgo < 14) {
      lastWeekMoods.push(entry.mood)
    }
  }

  if (thisWeekMoods.length < 2 || lastWeekMoods.length < 2) {
    return 'insufficient'
  }

  const thisWeekAvg = thisWeekMoods.reduce((a, b) => a + b, 0) / thisWeekMoods.length
  const lastWeekAvg = lastWeekMoods.reduce((a, b) => a + b, 0) / lastWeekMoods.length

  if (thisWeekAvg > lastWeekAvg + 0.2) return 'improving'
  if (thisWeekAvg < lastWeekAvg - 0.2) return 'needs-grace'
  return 'steady'
}

export function useWeeklyGodMoments(): WeeklyGodMomentsData {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISSED_KEY) || ''
    } catch (_e) {
      return ''
    }
  })

  const currentMonday = getCurrentWeekStart()

  const activityLog = getActivityLog()
  const activeDaysIn14 = countActiveDays(activityLog, 14)

  const isDismissedThisWeek = dismissed === currentMonday
  const hasEnoughActivity = activeDaysIn14 >= 3

  const isVisible = !isDismissedThisWeek && hasEnoughActivity

  const devotionalReads = useMemo(() => {
    try {
      const raw = localStorage.getItem('wr_devotional_reads')
      return raw ? (JSON.parse(raw) as string[]) : []
    } catch (_e) {
      return []
    }
  }, [])

  const devotionalsRead = countDevotionalsInPast7Days(devotionalReads)
  const totalActivities = countTotalActivitiesInPast7Days(activityLog)
  const moodTrend = computeMoodTrend()

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(DISMISSED_KEY, currentMonday)
    } catch (_e) {
      // localStorage write failure is non-critical
    }
    setDismissed(currentMonday)
  }, [currentMonday])

  return {
    isVisible,
    devotionalsRead,
    totalActivities,
    moodTrend,
    dismiss,
  }
}
