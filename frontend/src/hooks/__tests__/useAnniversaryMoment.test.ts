import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useAnniversaryMoment } from '../useAnniversaryMoment'
import { getLocalDateString } from '@/utils/date'

// ── Mocks ───────────────────────────────────────────────────────────
const mockIsAuthenticated = vi.hoisted(() => ({ value: true }))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ isAuthenticated: mockIsAuthenticated.value }),
}))

// ── Test helpers ────────────────────────────────────────────────────
function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return getLocalDateString(d)
}

function setMoodEntries(dates: string[]) {
  const entries = dates.map((date, i) => ({
    id: String(i),
    date,
    mood: 4,
    moodLabel: 'Good',
    timestamp: Date.now(),
    verseSeen: '',
  }))
  localStorage.setItem('wr_mood_entries', JSON.stringify(entries))
}

function setActivities(dates: string[]) {
  const activities: Record<string, Record<string, boolean>> = {}
  for (const date of dates) {
    activities[date] = { mood: true, pray: true, journal: true }
  }
  localStorage.setItem('wr_daily_activities', JSON.stringify(activities))
}

// ── Tests ───────────────────────────────────────────────────────────
describe('useAnniversaryMoment', () => {
  beforeEach(() => {
    localStorage.clear()
    mockIsAuthenticated.value = true
  })

  it('returns show:false when not authenticated', () => {
    mockIsAuthenticated.value = false
    setMoodEntries([daysAgo(7)])
    const { result } = renderHook(() => useAnniversaryMoment())
    expect(result.current.show).toBe(false)
  })

  it('returns show:true at 7-day milestone', () => {
    setMoodEntries([daysAgo(7)])
    const { result } = renderHook(() => useAnniversaryMoment())
    expect(result.current.show).toBe(true)
    expect(result.current.milestone).toBe(7)
    expect(result.current.heading).toBe('One Week with Worship Room')
  })

  it('returns show:true at 30-day milestone', () => {
    setMoodEntries([daysAgo(30)])
    const { result } = renderHook(() => useAnniversaryMoment())
    expect(result.current.show).toBe(true)
    expect(result.current.milestone).toBe(30)
  })

  it('returns show:false at non-milestone day', () => {
    setMoodEntries([daysAgo(5)])
    const { result } = renderHook(() => useAnniversaryMoment())
    expect(result.current.show).toBe(false)
  })

  it('respects already-shown milestones', () => {
    setMoodEntries([daysAgo(7)])
    localStorage.setItem('wr_anniversary_milestones_shown', JSON.stringify([7]))
    const { result } = renderHook(() => useAnniversaryMoment())
    expect(result.current.show).toBe(false)
  })

  it('respects daily frequency limit', () => {
    setMoodEntries([daysAgo(7)])
    localStorage.setItem('wr_last_surprise_date', getLocalDateString())
    const { result } = renderHook(() => useAnniversaryMoment())
    expect(result.current.show).toBe(false)
  })

  it('computes stats correctly', () => {
    setMoodEntries([daysAgo(7)])
    setActivities([daysAgo(7), daysAgo(6), daysAgo(5)])
    localStorage.setItem('wr_meditation_history', JSON.stringify([{ id: '1' }, { id: '2' }]))
    localStorage.setItem('wr_streak', JSON.stringify({ currentStreak: 3 }))

    const { result } = renderHook(() => useAnniversaryMoment())
    expect(result.current.show).toBe(true)
    const labels = result.current.stats!.map((s) => s.label)
    expect(labels).toContain('Prayers')
    expect(labels).toContain('Journal entries')
    expect(labels).toContain('Meditations')
    expect(labels).toContain('Current streak')
  })

  it('omits zero stats', () => {
    setMoodEntries([daysAgo(7)])
    // No meditation data, no streak, etc.
    const { result } = renderHook(() => useAnniversaryMoment())
    expect(result.current.show).toBe(true)
    const labels = result.current.stats!.map((s) => s.label)
    expect(labels).not.toContain('Meditations')
    expect(labels).not.toContain('Current streak')
  })

  it('returns correct closing message for milestone', () => {
    setMoodEntries([daysAgo(30)])
    const { result } = renderHook(() => useAnniversaryMoment())
    expect(result.current.closingMessage).toContain('devotion')
  })

  it('returns show:false with no data', () => {
    const { result } = renderHook(() => useAnniversaryMoment())
    expect(result.current.show).toBe(false)
  })
})
