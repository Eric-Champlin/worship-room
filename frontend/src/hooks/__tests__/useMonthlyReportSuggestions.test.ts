import { describe, it, expect, beforeEach } from 'vitest'
import { getMonthlyReportSuggestions } from '../useMonthlyReportSuggestions'
import type { MonthlyReportData } from '../useMonthlyReportData'

function makeData(overrides: Partial<MonthlyReportData> = {}): MonthlyReportData {
  return {
    month: 2, // March (0-indexed)
    year: 2026,
    monthName: 'March',
    dateRange: 'Mar 1 – Mar 31, 2026',
    daysActive: 20,
    daysInRange: 31,
    pointsEarned: 500,
    startLevel: 'Seedling',
    endLevel: 'Sprout',
    levelProgressPct: 50,
    moodTrendPct: 0,
    longestStreak: 10,
    badgesEarned: [],
    bestDay: null,
    activityCounts: { mood: 20, pray: 10, journal: 8, meditate: 5, listen: 3, prayerWall: 2 },
    moodEntries: [],
    ...overrides,
  }
}

beforeEach(() => {
  localStorage.clear()
})

describe('getMonthlyReportSuggestions', () => {
  it('returns mood decline suggestion when moodTrendPct < 0', () => {
    const data = makeData({ moodTrendPct: -5 })
    const result = getMonthlyReportSuggestions(data)
    expect(result[0].id).toBe('mood-decline')
    expect(result[0].ctas).toHaveLength(2)
  })

  it('returns low meditation suggestion when < 4 sessions', () => {
    // No meditation sessions in localStorage (getMeditationMinutesForRange returns [])
    const data = makeData({ activityCounts: { mood: 20, pray: 10, journal: 8, meditate: 0, listen: 3, prayerWall: 2 } })
    const result = getMonthlyReportSuggestions(data)
    expect(result.some((s) => s.id === 'low-meditation')).toBe(true)
  })

  it('returns low journaling suggestion when < 4 times', () => {
    // Set up 4+ meditation sessions so low-meditation doesn't take the spot
    localStorage.setItem('wr_meditation_history', JSON.stringify([
      { id: '1', type: 'soaking', date: '2026-03-01', minutes: 5 },
      { id: '2', type: 'soaking', date: '2026-03-02', minutes: 5 },
      { id: '3', type: 'soaking', date: '2026-03-03', minutes: 5 },
      { id: '4', type: 'soaking', date: '2026-03-04', minutes: 5 },
    ]))
    const data = makeData({ activityCounts: { mood: 20, pray: 10, journal: 2, meditate: 5, listen: 3, prayerWall: 2 } })
    const result = getMonthlyReportSuggestions(data)
    expect(result.some((s) => s.id === 'low-journaling')).toBe(true)
  })

  it('returns no gratitude suggestion when 0 entries in month', () => {
    // No gratitude entries in localStorage
    localStorage.setItem('wr_meditation_history', JSON.stringify([
      { id: '1', type: 'soaking', date: '2026-03-01', minutes: 5 },
      { id: '2', type: 'soaking', date: '2026-03-02', minutes: 5 },
      { id: '3', type: 'soaking', date: '2026-03-03', minutes: 5 },
      { id: '4', type: 'soaking', date: '2026-03-04', minutes: 5 },
    ]))
    const data = makeData({ activityCounts: { mood: 20, pray: 10, journal: 8, meditate: 5, listen: 3, prayerWall: 2 } })
    const result = getMonthlyReportSuggestions(data)
    expect(result.some((s) => s.id === 'no-gratitude')).toBe(true)
  })

  it('returns reading plan completion suggestion', () => {
    localStorage.setItem('wr_reading_plan_progress', JSON.stringify({
      'plan-1': { completedAt: '2026-03-15' },
    }))
    localStorage.setItem('wr_meditation_history', JSON.stringify([
      { id: '1', type: 'soaking', date: '2026-03-01', minutes: 5 },
      { id: '2', type: 'soaking', date: '2026-03-02', minutes: 5 },
      { id: '3', type: 'soaking', date: '2026-03-03', minutes: 5 },
      { id: '4', type: 'soaking', date: '2026-03-04', minutes: 5 },
    ]))
    localStorage.setItem('wr_gratitude_entries', JSON.stringify([
      { id: 'g1', date: '2026-03-10', items: ['test'], createdAt: '2026-03-10T10:00:00.000Z' },
    ]))
    const data = makeData({ activityCounts: { mood: 20, pray: 10, journal: 8, meditate: 5, listen: 3, prayerWall: 2 } })
    const result = getMonthlyReportSuggestions(data)
    expect(result.some((s) => s.id === 'plan-completed')).toBe(true)
  })

  it('returns mood improved suggestion with top activities', () => {
    localStorage.setItem('wr_meditation_history', JSON.stringify([
      { id: '1', type: 'soaking', date: '2026-03-01', minutes: 5 },
      { id: '2', type: 'soaking', date: '2026-03-02', minutes: 5 },
      { id: '3', type: 'soaking', date: '2026-03-03', minutes: 5 },
      { id: '4', type: 'soaking', date: '2026-03-04', minutes: 5 },
    ]))
    localStorage.setItem('wr_gratitude_entries', JSON.stringify([
      { id: 'g1', date: '2026-03-10', items: ['test'], createdAt: '2026-03-10T10:00:00.000Z' },
    ]))
    const data = makeData({
      moodTrendPct: 10,
      activityCounts: { mood: 20, pray: 15, journal: 8, meditate: 5, listen: 3, prayerWall: 2 },
    })
    const result = getMonthlyReportSuggestions(data)
    const moodImproved = result.find((s) => s.id === 'mood-improved')
    expect(moodImproved).toBeDefined()
    expect(moodImproved!.topActivities!.length).toBeGreaterThan(0)
    expect(moodImproved!.topActivities![0].name).toBe('Prayer')
  })

  it('mood decline always takes first slot', () => {
    const data = makeData({
      moodTrendPct: -10,
      activityCounts: { mood: 20, pray: 1, journal: 1, meditate: 0, listen: 0, prayerWall: 0 },
    })
    const result = getMonthlyReportSuggestions(data)
    expect(result[0].id).toBe('mood-decline')
  })

  it('limits to 3 suggestions maximum', () => {
    const data = makeData({
      moodTrendPct: -5,
      activityCounts: { mood: 20, pray: 1, journal: 1, meditate: 0, listen: 0, prayerWall: 0 },
    })
    const result = getMonthlyReportSuggestions(data)
    expect(result.length).toBeLessThanOrEqual(3)
  })

  it('returns empty array when no conditions match', () => {
    localStorage.setItem('wr_meditation_history', JSON.stringify([
      { id: '1', type: 'soaking', date: '2026-03-01', minutes: 5 },
      { id: '2', type: 'soaking', date: '2026-03-02', minutes: 5 },
      { id: '3', type: 'soaking', date: '2026-03-03', minutes: 5 },
      { id: '4', type: 'soaking', date: '2026-03-04', minutes: 5 },
    ]))
    localStorage.setItem('wr_gratitude_entries', JSON.stringify([
      { id: 'g1', date: '2026-03-10', items: ['test'], createdAt: '2026-03-10T10:00:00.000Z' },
    ]))
    const data = makeData({
      moodTrendPct: 0, // stable — no decline or improve
      activityCounts: { mood: 20, pray: 10, journal: 8, meditate: 5, listen: 3, prayerWall: 2 },
    })
    const result = getMonthlyReportSuggestions(data)
    expect(result).toEqual([])
  })
})
