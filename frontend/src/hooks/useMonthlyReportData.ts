import { useMemo } from 'react'
import type { MoodEntry } from '@/types/dashboard'
import { getMoodEntries } from '@/services/mood-storage'
import { getActivityLog, getFaithPoints } from '@/services/faith-points-storage'
import { getBadgeData } from '@/services/badge-storage'
import { getLevelForPoints } from '@/constants/dashboard/levels'
import { getLocalDateString } from '@/utils/date'

export interface MonthlyReportData {
  month: number
  year: number
  monthName: string
  dateRange: string
  daysActive: number
  daysInRange: number
  pointsEarned: number
  startLevel: string
  endLevel: string
  levelProgressPct: number
  moodTrendPct: number
  longestStreak: number
  badgesEarned: string[]
  bestDay: { date: string; formattedDate: string; activityCount: number; mood: string } | null
  activityCounts: Record<string, number>
  moodEntries: MoodEntry[]
}

const MOCK_BADGE_IDS = ['first-light', 'week-one', 'prayer-starter']

const MOOD_LABEL_MAP: Record<number, string> = {
  1: 'Struggling',
  2: 'Heavy',
  3: 'Okay',
  4: 'Good',
  5: 'Thriving',
}

function getMonthName(month: number, year: number): string {
  return new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date(year, month))
}

function isCurrentMonth(month: number, year: number): boolean {
  const now = new Date()
  return now.getMonth() === month && now.getFullYear() === year
}

function computeLongestStreakInMonth(entries: MoodEntry[]): number {
  if (entries.length === 0) return 0
  const dates = [...new Set(entries.map((e) => e.date))].sort()
  let maxStreak = 1
  let currentRun = 1
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1] + 'T12:00:00')
    const curr = new Date(dates[i] + 'T12:00:00')
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays === 1) {
      currentRun++
      maxStreak = Math.max(maxStreak, currentRun)
    } else {
      currentRun = 1
    }
  }
  return maxStreak
}

export function getDefaultMonth(): { month: number; year: number } {
  const now = new Date()
  if (now.getDate() <= 5) {
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    return { month: prev.getMonth(), year: prev.getFullYear() }
  }
  return { month: now.getMonth(), year: now.getFullYear() }
}

export function getEarliestMonth(entries: MoodEntry[]): { month: number; year: number } {
  if (entries.length === 0) {
    const now = new Date()
    return { month: now.getMonth(), year: now.getFullYear() }
  }
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date))
  const earliest = new Date(sorted[0].date + 'T12:00:00')
  return { month: earliest.getMonth(), year: earliest.getFullYear() }
}

export function useMonthlyReportData(month: number, year: number): MonthlyReportData {
  return useMemo(() => {
    const monthName = getMonthName(month, year)
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const firstDayStr = getLocalDateString(firstDay)
    const lastDayStr = getLocalDateString(lastDay)

    const daysInRange = isCurrentMonth(month, year)
      ? new Date().getDate()
      : lastDay.getDate()

    const dateRange = `${monthName} 1 - ${monthName} ${lastDay.getDate()}, ${year}`

    // Mood entries for this month
    const allEntries = getMoodEntries()
    const moodEntries = allEntries.filter(
      (e) => e.date >= firstDayStr && e.date <= lastDayStr,
    )

    const hasRealData = moodEntries.length > 0

    // Days active (distinct dates with entries)
    const daysActive = hasRealData
      ? new Set(moodEntries.map((e) => e.date)).size
      : 24

    // Points earned this month
    const activityLog = getActivityLog()
    let pointsEarned = 0
    const activityCounts: Record<string, number> = {
      mood: 0,
      pray: 0,
      journal: 0,
      meditate: 0,
      listen: 0,
      prayerWall: 0,
    }
    for (const [date, activities] of Object.entries(activityLog)) {
      if (date >= firstDayStr && date <= lastDayStr) {
        pointsEarned += activities.pointsEarned
        if (activities.mood) activityCounts.mood++
        if (activities.pray) activityCounts.pray++
        if (activities.journal) activityCounts.journal++
        if (activities.meditate) activityCounts.meditate++
        if (activities.listen) activityCounts.listen++
        if (activities.prayerWall) activityCounts.prayerWall++
      }
    }

    // Mock fallback for activity counts
    if (!hasRealData) {
      activityCounts.mood = 24
      activityCounts.pray = 18
      activityCounts.journal = 15
      activityCounts.meditate = 10
      activityCounts.listen = 20
      activityCounts.prayerWall = 8
    }

    if (pointsEarned === 0) pointsEarned = hasRealData ? 0 : 1847

    // Level progress
    const faithPoints = getFaithPoints()
    const currentLevel = getLevelForPoints(faithPoints.totalPoints)
    let startLevel: string
    let endLevel: string
    let levelProgressPct: number
    if (hasRealData) {
      // Approximate: use current level info
      startLevel = currentLevel.name
      endLevel = currentLevel.name
      levelProgressPct = currentLevel.pointsToNextLevel > 0
        ? Math.round(
            ((faithPoints.totalPoints - getLevelThresholdForName(currentLevel.name)) /
              (faithPoints.totalPoints + currentLevel.pointsToNextLevel - getLevelThresholdForName(currentLevel.name))) *
              100,
          )
        : 100
    } else {
      startLevel = 'Sprout'
      endLevel = 'Blooming'
      levelProgressPct = 67
    }

    // Mood trend vs previous month
    let moodTrendPct: number
    if (hasRealData) {
      const prevMonthStart = new Date(year, month - 1, 1)
      const prevMonthEnd = new Date(year, month, 0)
      const prevFirstStr = getLocalDateString(prevMonthStart)
      const prevLastStr = getLocalDateString(prevMonthEnd)
      const prevEntries = allEntries.filter(
        (e) => e.date >= prevFirstStr && e.date <= prevLastStr,
      )
      if (prevEntries.length > 0) {
        const currAvg =
          moodEntries.reduce((sum, e) => sum + e.mood, 0) / moodEntries.length
        const prevAvg =
          prevEntries.reduce((sum, e) => sum + e.mood, 0) / prevEntries.length
        moodTrendPct =
          prevAvg > 0
            ? Math.round(((currAvg - prevAvg) / prevAvg) * 100)
            : 0
      } else {
        moodTrendPct = 0
      }
    } else {
      moodTrendPct = 12
    }

    // Longest streak within the month
    const longestStreak = hasRealData
      ? computeLongestStreakInMonth(moodEntries)
      : 7

    // Badges earned this month
    const badgeData = getBadgeData()
    let badgesEarned: string[]
    if (hasRealData) {
      badgesEarned = Object.entries(badgeData.earned)
        .filter(([, entry]) => {
          const earnedDate = new Date(entry.earnedAt)
          return (
            earnedDate.getMonth() === month &&
            earnedDate.getFullYear() === year
          )
        })
        .map(([id]) => id)
    } else {
      badgesEarned = MOCK_BADGE_IDS
    }

    // Best day (most activities + highest mood)
    let bestDay: MonthlyReportData['bestDay'] = null
    if (hasRealData) {
      let bestScore = -1
      for (const [date, activities] of Object.entries(activityLog)) {
        if (date < firstDayStr || date > lastDayStr) continue
        const actCount = [
          activities.mood,
          activities.pray,
          activities.journal,
          activities.meditate,
          activities.listen,
          activities.prayerWall,
        ].filter(Boolean).length
        const dayEntry = moodEntries.find((e) => e.date === date)
        const moodVal = dayEntry?.mood ?? 0
        const score = actCount * 10 + moodVal
        if (score > bestScore) {
          bestScore = score
          const d = new Date(date + 'T12:00:00')
          bestDay = {
            date,
            formattedDate: new Intl.DateTimeFormat('en-US', {
              month: 'long',
              day: 'numeric',
            }).format(d),
            activityCount: actCount,
            mood: dayEntry ? MOOD_LABEL_MAP[dayEntry.mood] ?? 'Okay' : 'Okay',
          }
        }
      }
    } else {
      // Mock best day
      const mockDate = new Date(year, month, 12)
      bestDay = {
        date: getLocalDateString(mockDate),
        formattedDate: new Intl.DateTimeFormat('en-US', {
          month: 'long',
          day: 'numeric',
        }).format(mockDate),
        activityCount: 5,
        mood: 'Thriving',
      }
    }

    return {
      month,
      year,
      monthName,
      dateRange,
      daysActive,
      daysInRange,
      pointsEarned,
      startLevel,
      endLevel,
      levelProgressPct,
      moodTrendPct,
      longestStreak,
      badgesEarned,
      bestDay,
      activityCounts,
      moodEntries,
    }
  }, [month, year])
}

/** Helper to get the threshold for a level name */
function getLevelThresholdForName(name: string): number {
  const thresholds: Record<string, number> = {
    Seedling: 0,
    Sprout: 100,
    Blooming: 500,
    Flourishing: 1500,
    Oak: 4000,
    Lighthouse: 10000,
  }
  return thresholds[name] ?? 0
}
