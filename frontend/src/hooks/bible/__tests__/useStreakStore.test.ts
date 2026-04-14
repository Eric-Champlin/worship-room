import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { BIBLE_STREAK_KEY } from '@/constants/bible'
import { _resetForTesting, recordReadToday, subscribe } from '@/lib/bible/streakStore'
import { getTodayLocal } from '@/lib/bible/dateUtils'

// Mock useTimeTick to avoid real timers
vi.mock('@/hooks/bible/useTimeTick', () => ({
  useTimeTick: () => ({ now: new Date(), today: '2026-04-14', currentMinute: 0 }),
}))

import { useStreakStore } from '../useStreakStore'

function seedStreak(overrides: Record<string, unknown> = {}) {
  const base = {
    currentStreak: 0,
    longestStreak: 0,
    lastReadDate: '',
    streakStartDate: '',
    graceDaysAvailable: 1,
    graceDaysUsedThisWeek: 0,
    lastGraceUsedDate: null,
    weekResetDate: '',
    milestones: [],
    totalDaysRead: 0,
    ...overrides,
  }
  localStorage.setItem(BIBLE_STREAK_KEY, JSON.stringify(base))
  _resetForTesting() // flush module cache so next getStreak() reads from storage
}

describe('useStreakStore', () => {
  beforeEach(() => {
    localStorage.clear()
    _resetForTesting()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns default streak on initial render with no data', () => {
    const { result } = renderHook(() => useStreakStore())
    expect(result.current.streak.currentStreak).toBe(0)
    expect(result.current.streak.longestStreak).toBe(0)
    expect(result.current.streak.lastReadDate).toBe('')
    expect(result.current.atRisk).toBe(false)
  })

  it('returns seeded streak on initial render', () => {
    seedStreak({ currentStreak: 7, longestStreak: 10, totalDaysRead: 15 })

    const { result } = renderHook(() => useStreakStore())
    expect(result.current.streak.currentStreak).toBe(7)
    expect(result.current.streak.longestStreak).toBe(10)
    expect(result.current.streak.totalDaysRead).toBe(15)
  })

  it('re-renders when store mutates after mount', () => {
    const { result } = renderHook(() => useStreakStore())
    expect(result.current.streak.currentStreak).toBe(0)

    act(() => {
      recordReadToday()
    })

    expect(result.current.streak.currentStreak).toBe(1)
    expect(result.current.streak.totalDaysRead).toBe(1)
  })

  it('re-renders on consecutive mutations', () => {
    // Seed as if user read yesterday so the next call extends the streak
    const today = getTodayLocal()
    const yesterday = new Date(today + 'T00:00:00')
    yesterday.setDate(yesterday.getDate() - 1)
    const yStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`

    seedStreak({ currentStreak: 3, longestStreak: 3, lastReadDate: yStr, totalDaysRead: 3 })

    const { result } = renderHook(() => useStreakStore())
    expect(result.current.streak.currentStreak).toBe(3)

    act(() => {
      recordReadToday()
    })

    expect(result.current.streak.currentStreak).toBe(4)
  })

  it('unsubscribes on unmount without errors', () => {
    const subscribeSpy = vi.spyOn({ subscribe }, 'subscribe')

    const { result, unmount } = renderHook(() => useStreakStore())
    expect(result.current.streak.currentStreak).toBe(0)

    unmount()

    // Subsequent store mutations should not cause errors
    act(() => {
      recordReadToday()
    })
    // No error thrown — unsubscription is clean
  })

  it('atRisk is false when streak is zero', () => {
    const { result } = renderHook(() => useStreakStore())
    expect(result.current.atRisk).toBe(false)
  })

  it('atRisk is false when lastReadDate is today', () => {
    const today = getTodayLocal()
    seedStreak({ currentStreak: 5, lastReadDate: today })

    const { result } = renderHook(() => useStreakStore())
    expect(result.current.atRisk).toBe(false)
  })

  it('atRisk reflects streak state after mutation', () => {
    const { result } = renderHook(() => useStreakStore())
    expect(result.current.atRisk).toBe(false)

    // Recording a read today means lastReadDate=today, so atRisk should remain false
    act(() => {
      recordReadToday()
    })

    expect(result.current.streak.currentStreak).toBe(1)
    expect(result.current.atRisk).toBe(false)
  })
})
