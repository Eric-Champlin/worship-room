import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useWeeklyGodMoments } from '../useWeeklyGodMoments'
import { getLocalDateString, getCurrentWeekStart } from '@/utils/date'
import type { DailyActivities } from '@/types/dashboard'

function makeActivityDay(overrides: Partial<DailyActivities> = {}): DailyActivities {
  return {
    mood: true,
    pray: false,
    listen: false,
    prayerWall: false,
    readingPlan: false,
    gratitude: false,
    meditate: false,
    journal: false,
    reflection: false,
    challenge: false,
    localVisit: false,
    pointsEarned: 5,
    multiplier: 1,
    ...overrides,
  }
}

function dateNDaysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return getLocalDateString(d)
}

function seedActivityDays(count: number, startDaysAgo: number = 0): Record<string, DailyActivities> {
  const log: Record<string, DailyActivities> = {}
  for (let i = startDaysAgo; i < startDaysAgo + count; i++) {
    log[dateNDaysAgo(i)] = makeActivityDay()
  }
  return log
}

function seedMoodEntries(entries: Array<{ daysAgo: number; mood: number }>): void {
  const moodEntries = entries.map((e, i) => {
    const d = new Date()
    d.setDate(d.getDate() - e.daysAgo)
    return {
      id: `mood-${i}`,
      date: getLocalDateString(d),
      mood: e.mood,
      moodLabel: 'Test',
      timestamp: d.getTime(),
      verseSeen: 'Test verse',
    }
  })
  localStorage.setItem('wr_mood_entries', JSON.stringify(moodEntries))
}

beforeEach(() => {
  localStorage.clear()
  vi.useFakeTimers({ shouldAdvanceTime: true })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useWeeklyGodMoments', () => {
  describe('Visibility', () => {
    it('isVisible true when conditions met', () => {
      // 3+ active days in past 14, not dismissed
      localStorage.setItem('wr_daily_activities', JSON.stringify(seedActivityDays(5)))

      const { result } = renderHook(() => useWeeklyGodMoments())
      expect(result.current.isVisible).toBe(true)
    })

    it('isVisible false when dismissed this week', () => {
      localStorage.setItem('wr_daily_activities', JSON.stringify(seedActivityDays(5)))
      localStorage.setItem('wr_weekly_summary_dismissed', getCurrentWeekStart())

      const { result } = renderHook(() => useWeeklyGodMoments())
      expect(result.current.isVisible).toBe(false)
    })

    it('isVisible false when < 3 active days in past 14', () => {
      localStorage.setItem('wr_daily_activities', JSON.stringify(seedActivityDays(2)))

      const { result } = renderHook(() => useWeeklyGodMoments())
      expect(result.current.isVisible).toBe(false)
    })

    it('new week clears previous dismissal', () => {
      localStorage.setItem('wr_daily_activities', JSON.stringify(seedActivityDays(5)))
      // Dismissed on a previous Monday (definitely not this week)
      localStorage.setItem('wr_weekly_summary_dismissed', '2020-01-06')

      const { result } = renderHook(() => useWeeklyGodMoments())
      expect(result.current.isVisible).toBe(true)
    })
  })

  describe('Stats Computation', () => {
    it('counts devotionals read in past 7 days', () => {
      localStorage.setItem('wr_daily_activities', JSON.stringify(seedActivityDays(5)))
      const reads = [dateNDaysAgo(0), dateNDaysAgo(1), dateNDaysAgo(2), dateNDaysAgo(10)]
      localStorage.setItem('wr_devotional_reads', JSON.stringify(reads))

      const { result } = renderHook(() => useWeeklyGodMoments())
      expect(result.current.devotionalsRead).toBe(3)
    })

    it('counts total activities in past 7 days', () => {
      const log: Record<string, DailyActivities> = {}
      log[dateNDaysAgo(0)] = makeActivityDay({ mood: true, pray: true, journal: true })
      log[dateNDaysAgo(1)] = makeActivityDay({ mood: true, meditate: true })
      localStorage.setItem('wr_daily_activities', JSON.stringify(log))

      const { result } = renderHook(() => useWeeklyGodMoments())
      // Day 0: mood+pray+journal=3, Day 1: mood+meditate=2 → total 5
      expect(result.current.totalActivities).toBe(5)
    })
  })

  describe('Mood Trend', () => {
    it('mood trend: improving', () => {
      localStorage.setItem('wr_daily_activities', JSON.stringify(seedActivityDays(5)))
      seedMoodEntries([
        // This week (days 0-6): avg 4.0
        { daysAgo: 0, mood: 4 },
        { daysAgo: 1, mood: 4 },
        { daysAgo: 2, mood: 4 },
        // Last week (days 7-13): avg 3.0
        { daysAgo: 7, mood: 3 },
        { daysAgo: 8, mood: 3 },
        { daysAgo: 9, mood: 3 },
      ])

      const { result } = renderHook(() => useWeeklyGodMoments())
      expect(result.current.moodTrend).toBe('improving')
    })

    it('mood trend: steady', () => {
      localStorage.setItem('wr_daily_activities', JSON.stringify(seedActivityDays(5)))
      seedMoodEntries([
        { daysAgo: 0, mood: 3 },
        { daysAgo: 1, mood: 3 },
        { daysAgo: 7, mood: 3 },
        { daysAgo: 8, mood: 3 },
      ])

      const { result } = renderHook(() => useWeeklyGodMoments())
      expect(result.current.moodTrend).toBe('steady')
    })

    it('mood trend: needs-grace', () => {
      localStorage.setItem('wr_daily_activities', JSON.stringify(seedActivityDays(5)))
      seedMoodEntries([
        { daysAgo: 0, mood: 2 },
        { daysAgo: 1, mood: 2 },
        { daysAgo: 7, mood: 4 },
        { daysAgo: 8, mood: 4 },
      ])

      const { result } = renderHook(() => useWeeklyGodMoments())
      expect(result.current.moodTrend).toBe('needs-grace')
    })

    it('mood trend: insufficient when < 2 entries in one week', () => {
      localStorage.setItem('wr_daily_activities', JSON.stringify(seedActivityDays(5)))
      seedMoodEntries([
        { daysAgo: 0, mood: 3 },
        // Only 1 entry this week, need at least 2
      ])

      const { result } = renderHook(() => useWeeklyGodMoments())
      expect(result.current.moodTrend).toBe('insufficient')
    })
  })

  describe('Dismissal', () => {
    it('dismiss writes current Monday to localStorage', () => {
      localStorage.setItem('wr_daily_activities', JSON.stringify(seedActivityDays(5)))

      const { result } = renderHook(() => useWeeklyGodMoments())
      act(() => {
        result.current.dismiss()
      })

      expect(localStorage.getItem('wr_weekly_summary_dismissed')).toBe(getCurrentWeekStart())
      expect(result.current.isVisible).toBe(false)
    })
  })
})
