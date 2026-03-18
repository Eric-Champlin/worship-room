import { renderHook } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  useMonthlyReportData,
  getDefaultMonth,
  getEarliestMonth,
} from '../useMonthlyReportData'
import type { MoodEntry } from '@/types/dashboard'

// Mock localStorage
const mockStorage: Record<string, string> = {}

beforeEach(() => {
  vi.restoreAllMocks()
  Object.keys(mockStorage).forEach((k) => delete mockStorage[k])
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(
    (key: string) => mockStorage[key] ?? null,
  )
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(
    (key: string, value: string) => {
      mockStorage[key] = value
    },
  )
})

function makeMoodEntry(date: string, mood: 1 | 2 | 3 | 4 | 5 = 4): MoodEntry {
  const labels = { 1: 'Struggling', 2: 'Heavy', 3: 'Okay', 4: 'Good', 5: 'Thriving' } as const
  return {
    id: `entry-${date}`,
    date,
    mood,
    moodLabel: labels[mood],
    timestamp: new Date(date + 'T12:00:00').getTime(),
    verseSeen: 'Psalm 23:1',
  }
}

describe('useMonthlyReportData', () => {
  it('returns mock data when localStorage is empty', () => {
    const { result } = renderHook(() => useMonthlyReportData(1, 2026)) // February 2026
    const data = result.current

    expect(data.monthName).toBe('February')
    expect(data.daysActive).toBe(24)
    expect(data.pointsEarned).toBe(1847)
    expect(data.startLevel).toBe('Sprout')
    expect(data.endLevel).toBe('Blooming')
    expect(data.levelProgressPct).toBe(67)
    expect(data.moodTrendPct).toBe(12)
    expect(data.longestStreak).toBe(7)
    expect(data.badgesEarned).toHaveLength(3)
    expect(data.bestDay).not.toBeNull()
    expect(data.bestDay?.activityCount).toBe(5)
    expect(data.bestDay?.mood).toBe('Thriving')
    expect(data.activityCounts.mood).toBe(24)
    expect(data.activityCounts.pray).toBe(18)
  })

  it('filters mood entries by month', () => {
    const entries: MoodEntry[] = [
      makeMoodEntry('2026-01-15', 3),
      makeMoodEntry('2026-02-10', 4),
      makeMoodEntry('2026-02-20', 5),
      makeMoodEntry('2026-03-05', 4),
    ]
    mockStorage['wr_mood_entries'] = JSON.stringify(entries)

    const { result } = renderHook(() => useMonthlyReportData(1, 2026)) // February
    expect(result.current.moodEntries).toHaveLength(2)
    expect(result.current.moodEntries[0].date).toBe('2026-02-10')
    expect(result.current.moodEntries[1].date).toBe('2026-02-20')
  })

  it('computes daysActive correctly (distinct dates)', () => {
    const entries: MoodEntry[] = [
      makeMoodEntry('2026-02-10', 4),
      { ...makeMoodEntry('2026-02-10', 3), id: 'entry-dup' },
      makeMoodEntry('2026-02-15', 5),
      makeMoodEntry('2026-02-20', 4),
    ]
    mockStorage['wr_mood_entries'] = JSON.stringify(entries)

    const { result } = renderHook(() => useMonthlyReportData(1, 2026))
    expect(result.current.daysActive).toBe(3) // 3 distinct dates
  })

  it('handles partial month (current month)', () => {
    const now = new Date()
    const { result } = renderHook(() =>
      useMonthlyReportData(now.getMonth(), now.getFullYear()),
    )
    // daysInRange should be today's day-of-month
    expect(result.current.daysInRange).toBe(now.getDate())
  })

  it('handles first month (no previous month data → moodTrendPct = 0)', () => {
    const entries: MoodEntry[] = [makeMoodEntry('2026-02-10', 4)]
    mockStorage['wr_mood_entries'] = JSON.stringify(entries)

    const { result } = renderHook(() => useMonthlyReportData(1, 2026))
    expect(result.current.moodTrendPct).toBe(0)
  })

  it('handles corrupted localStorage gracefully', () => {
    mockStorage['wr_mood_entries'] = 'not valid json {{{}'
    mockStorage['wr_daily_activities'] = '{bad'
    mockStorage['wr_faith_points'] = 'null'

    const { result } = renderHook(() => useMonthlyReportData(1, 2026))
    // Should return mock data without crashing
    expect(result.current.daysActive).toBe(24)
    expect(result.current.pointsEarned).toBe(1847)
  })

  it('dateRange format is correct', () => {
    const { result } = renderHook(() => useMonthlyReportData(1, 2026))
    expect(result.current.dateRange).toBe('February 1 - February 28, 2026')
  })
})

describe('getDefaultMonth', () => {
  it('returns current month when day > 5', () => {
    const now = new Date()
    const result = getDefaultMonth()
    if (now.getDate() > 5) {
      expect(result.month).toBe(now.getMonth())
      expect(result.year).toBe(now.getFullYear())
    } else {
      // Day 1-5: returns previous month
      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      expect(result.month).toBe(prev.getMonth())
      expect(result.year).toBe(prev.getFullYear())
    }
  })
})

describe('getEarliestMonth', () => {
  it('returns current month when no entries', () => {
    const now = new Date()
    const result = getEarliestMonth([])
    expect(result.month).toBe(now.getMonth())
    expect(result.year).toBe(now.getFullYear())
  })

  it('returns earliest entry month', () => {
    const entries: MoodEntry[] = [
      makeMoodEntry('2026-03-15', 4),
      makeMoodEntry('2025-11-01', 3),
      makeMoodEntry('2026-01-20', 5),
    ]
    const result = getEarliestMonth(entries)
    expect(result.month).toBe(10) // November = 10
    expect(result.year).toBe(2025)
  })
})
