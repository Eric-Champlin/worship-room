import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BIBLE_STREAK_KEY } from '@/constants/bible'

// Dynamic import so we get a fresh module per test via vi.resetModules()
async function loadStore() {
  const mod = await import('../streakStore')
  return mod
}

async function loadDateUtils() {
  const mod = await import('../dateUtils')
  return mod
}

describe('streakStore', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetModules()
  })

  it('getStreak returns default when empty', async () => {
    const { getStreak } = await loadStore()
    const streak = getStreak()
    expect(streak.currentStreak).toBe(0)
    expect(streak.longestStreak).toBe(0)
    expect(streak.lastReadDate).toBe('')
    expect(streak.streakStartDate).toBe('')
    expect(streak.graceDaysAvailable).toBe(1)
    expect(streak.graceDaysUsedThisWeek).toBe(0)
    expect(streak.lastGraceUsedDate).toBeNull()
    expect(streak.milestones).toEqual([])
    expect(streak.totalDaysRead).toBe(0)
  })

  it('SSR-safe: getStreak returns default on server', async () => {
    const origWindow = globalThis.window
    // @ts-expect-error — simulating SSR
    delete globalThis.window
    try {
      const { getStreak } = await loadStore()
      const streak = getStreak()
      expect(streak.currentStreak).toBe(0)
    } finally {
      globalThis.window = origWindow
    }
  })

  it('recordReadToday first read ever', async () => {
    const { recordReadToday, getStreak } = await loadStore()
    const result = recordReadToday()
    expect(result.delta).toBe('first-read')
    expect(result.isFirstReadEver).toBe(true)
    expect(result.newStreak).toBe(1)
    expect(result.previousStreak).toBe(0)
    const streak = getStreak()
    expect(streak.currentStreak).toBe(1)
    expect(streak.totalDaysRead).toBe(1)
  })

  it('recordReadToday same day idempotent', async () => {
    const { recordReadToday } = await loadStore()
    recordReadToday()
    const result = recordReadToday()
    expect(result.delta).toBe('same-day')
    expect(result.newStreak).toBe(1)
  })

  it('recordReadToday consecutive day', async () => {
    const { getTodayLocal } = await loadDateUtils()

    // Seed streak as if user read yesterday
    const today = getTodayLocal()
    const yesterday = new Date(today + 'T00:00:00')
    yesterday.setDate(yesterday.getDate() - 1)
    const yStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`

    localStorage.setItem(
      BIBLE_STREAK_KEY,
      JSON.stringify({
        currentStreak: 5,
        longestStreak: 5,
        lastReadDate: yStr,
        streakStartDate: '2026-04-01',
        graceDaysAvailable: 1,
        graceDaysUsedThisWeek: 0,
        lastGraceUsedDate: null,
        weekResetDate: '2026-04-06',
        milestones: [3],
        totalDaysRead: 5,
      }),
    )

    const { recordReadToday } = await loadStore()
    const result = recordReadToday()
    expect(result.delta).toBe('extended')
    expect(result.newStreak).toBe(6)
    expect(result.previousStreak).toBe(5)
  })

  it('recordReadToday 2-day gap with grace', async () => {
    const { getTodayLocal } = await loadDateUtils()

    const today = getTodayLocal()
    const twoDaysAgo = new Date(today + 'T00:00:00')
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)
    const tdaStr = `${twoDaysAgo.getFullYear()}-${String(twoDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(twoDaysAgo.getDate()).padStart(2, '0')}`

    localStorage.setItem(
      BIBLE_STREAK_KEY,
      JSON.stringify({
        currentStreak: 5,
        longestStreak: 5,
        lastReadDate: tdaStr,
        streakStartDate: '2026-04-01',
        graceDaysAvailable: 1,
        graceDaysUsedThisWeek: 0,
        lastGraceUsedDate: null,
        weekResetDate: '2026-04-06',
        milestones: [3],
        totalDaysRead: 5,
      }),
    )

    const { recordReadToday, getStreak } = await loadStore()
    const result = recordReadToday()
    expect(result.delta).toBe('used-grace')
    expect(result.newStreak).toBe(6)
    const streak = getStreak()
    expect(streak.graceDaysUsedThisWeek).toBe(1)
    expect(streak.lastGraceUsedDate).toBe(today)
    expect(streak.totalDaysRead).toBe(6)
  })

  it('recordReadToday 2-day gap without grace', async () => {
    const { getTodayLocal } = await loadDateUtils()

    const today = getTodayLocal()
    const twoDaysAgo = new Date(today + 'T00:00:00')
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)
    const tdaStr = `${twoDaysAgo.getFullYear()}-${String(twoDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(twoDaysAgo.getDate()).padStart(2, '0')}`

    localStorage.setItem(
      BIBLE_STREAK_KEY,
      JSON.stringify({
        currentStreak: 5,
        longestStreak: 5,
        lastReadDate: tdaStr,
        streakStartDate: '2026-04-01',
        graceDaysAvailable: 1,
        graceDaysUsedThisWeek: 1, // grace already used
        lastGraceUsedDate: '2026-04-07',
        weekResetDate: '2026-04-06',
        milestones: [3],
        totalDaysRead: 5,
      }),
    )

    const { recordReadToday } = await loadStore()
    const result = recordReadToday()
    expect(result.delta).toBe('reset')
    expect(result.newStreak).toBe(1)
  })

  it('recordReadToday 3+ day gap always resets', async () => {
    const { getTodayLocal } = await loadDateUtils()

    const today = getTodayLocal()
    const threeDaysAgo = new Date(today + 'T00:00:00')
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
    const tdaStr = `${threeDaysAgo.getFullYear()}-${String(threeDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(threeDaysAgo.getDate()).padStart(2, '0')}`

    localStorage.setItem(
      BIBLE_STREAK_KEY,
      JSON.stringify({
        currentStreak: 10,
        longestStreak: 10,
        lastReadDate: tdaStr,
        streakStartDate: '2026-03-30',
        graceDaysAvailable: 1,
        graceDaysUsedThisWeek: 0, // grace available, but 3+ gap => reset anyway
        lastGraceUsedDate: null,
        weekResetDate: '2026-04-06',
        milestones: [3, 7],
        totalDaysRead: 10,
      }),
    )

    const { recordReadToday } = await loadStore()
    const result = recordReadToday()
    expect(result.delta).toBe('reset')
    expect(result.newStreak).toBe(1)
  })

  it('longestStreak survives reset', async () => {
    const { getTodayLocal } = await loadDateUtils()

    const today = getTodayLocal()
    const threeDaysAgo = new Date(today + 'T00:00:00')
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
    const tdaStr = `${threeDaysAgo.getFullYear()}-${String(threeDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(threeDaysAgo.getDate()).padStart(2, '0')}`

    localStorage.setItem(
      BIBLE_STREAK_KEY,
      JSON.stringify({
        currentStreak: 10,
        longestStreak: 10,
        lastReadDate: tdaStr,
        streakStartDate: '2026-03-30',
        graceDaysAvailable: 1,
        graceDaysUsedThisWeek: 0,
        lastGraceUsedDate: null,
        weekResetDate: '2026-04-06',
        milestones: [3, 7],
        totalDaysRead: 10,
      }),
    )

    const { recordReadToday, getStreak } = await loadStore()
    recordReadToday()
    const streak = getStreak()
    expect(streak.currentStreak).toBe(1)
    expect(streak.longestStreak).toBe(10)
  })

  it('graceDaysUsedThisWeek resets on ISO week boundary', async () => {
    // Seed: grace was used, weekResetDate is a previous Monday
    // By using a weekResetDate far enough in the past, the current week's Monday will be different
    localStorage.setItem(
      BIBLE_STREAK_KEY,
      JSON.stringify({
        currentStreak: 0,
        longestStreak: 5,
        lastReadDate: '',
        streakStartDate: '',
        graceDaysAvailable: 1,
        graceDaysUsedThisWeek: 1,
        lastGraceUsedDate: '2026-03-30',
        weekResetDate: '2026-03-23', // old week
        milestones: [],
        totalDaysRead: 5,
      }),
    )

    const { recordReadToday, getStreak } = await loadStore()
    recordReadToday()
    const streak = getStreak()
    // The week should have reset since 2026-03-23 is not the current week
    expect(streak.graceDaysUsedThisWeek).toBe(0)
  })

  it('milestone detection 3 days', async () => {
    const { getTodayLocal } = await loadDateUtils()

    const today = getTodayLocal()
    const yesterday = new Date(today + 'T00:00:00')
    yesterday.setDate(yesterday.getDate() - 1)
    const yStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`

    localStorage.setItem(
      BIBLE_STREAK_KEY,
      JSON.stringify({
        currentStreak: 2,
        longestStreak: 2,
        lastReadDate: yStr,
        streakStartDate: '2026-04-07',
        graceDaysAvailable: 1,
        graceDaysUsedThisWeek: 0,
        lastGraceUsedDate: null,
        weekResetDate: '2026-04-06',
        milestones: [],
        totalDaysRead: 2,
      }),
    )

    const { recordReadToday } = await loadStore()
    const result = recordReadToday()
    expect(result.milestoneReached).toBe(3)
  })

  it('milestone detection 7 days', async () => {
    const { getTodayLocal } = await loadDateUtils()

    const today = getTodayLocal()
    const yesterday = new Date(today + 'T00:00:00')
    yesterday.setDate(yesterday.getDate() - 1)
    const yStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`

    localStorage.setItem(
      BIBLE_STREAK_KEY,
      JSON.stringify({
        currentStreak: 6,
        longestStreak: 6,
        lastReadDate: yStr,
        streakStartDate: '2026-04-03',
        graceDaysAvailable: 1,
        graceDaysUsedThisWeek: 0,
        lastGraceUsedDate: null,
        weekResetDate: '2026-04-06',
        milestones: [3],
        totalDaysRead: 6,
      }),
    )

    const { recordReadToday } = await loadStore()
    const result = recordReadToday()
    expect(result.milestoneReached).toBe(7)
  })

  it('milestone deduplication', async () => {
    const { getTodayLocal } = await loadDateUtils()

    const today = getTodayLocal()
    const yesterday = new Date(today + 'T00:00:00')
    yesterday.setDate(yesterday.getDate() - 1)
    const yStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`

    localStorage.setItem(
      BIBLE_STREAK_KEY,
      JSON.stringify({
        currentStreak: 2,
        longestStreak: 3,
        lastReadDate: yStr,
        streakStartDate: '2026-04-07',
        graceDaysAvailable: 1,
        graceDaysUsedThisWeek: 0,
        lastGraceUsedDate: null,
        weekResetDate: '2026-04-06',
        milestones: [3], // already earned
        totalDaysRead: 2,
      }),
    )

    const { recordReadToday } = await loadStore()
    const result = recordReadToday()
    // streak becomes 3, but milestone 3 already in list
    expect(result.milestoneReached).toBeNull()
  })

  it('streakStartDate updates on extension not grace', async () => {
    const { getTodayLocal } = await loadDateUtils()

    const today = getTodayLocal()
    const twoDaysAgo = new Date(today + 'T00:00:00')
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)
    const tdaStr = `${twoDaysAgo.getFullYear()}-${String(twoDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(twoDaysAgo.getDate()).padStart(2, '0')}`

    localStorage.setItem(
      BIBLE_STREAK_KEY,
      JSON.stringify({
        currentStreak: 5,
        longestStreak: 5,
        lastReadDate: tdaStr,
        streakStartDate: '2026-04-01',
        graceDaysAvailable: 1,
        graceDaysUsedThisWeek: 0,
        lastGraceUsedDate: null,
        weekResetDate: '2026-04-06',
        milestones: [3],
        totalDaysRead: 5,
      }),
    )

    const { recordReadToday, getStreak } = await loadStore()
    const result = recordReadToday()
    expect(result.delta).toBe('used-grace')
    // Grace use preserves streakStartDate
    expect(getStreak().streakStartDate).toBe('2026-04-01')
  })

  it('totalDaysRead accumulates across resets', async () => {
    const { getTodayLocal } = await loadDateUtils()

    const today = getTodayLocal()
    const threeDaysAgo = new Date(today + 'T00:00:00')
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
    const tdaStr = `${threeDaysAgo.getFullYear()}-${String(threeDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(threeDaysAgo.getDate()).padStart(2, '0')}`

    localStorage.setItem(
      BIBLE_STREAK_KEY,
      JSON.stringify({
        currentStreak: 5,
        longestStreak: 5,
        lastReadDate: tdaStr,
        streakStartDate: '2026-04-01',
        graceDaysAvailable: 1,
        graceDaysUsedThisWeek: 0,
        lastGraceUsedDate: null,
        weekResetDate: '2026-04-06',
        milestones: [3],
        totalDaysRead: 5,
      }),
    )

    const { recordReadToday, getStreak } = await loadStore()
    recordReadToday() // resets to 1 but totalDaysRead should be 6
    expect(getStreak().totalDaysRead).toBe(6)
  })

  it('migration from wr_bible_streak', async () => {
    localStorage.setItem(
      'wr_bible_streak',
      JSON.stringify({ count: 12, lastReadDate: '2026-04-08' }),
    )

    const { getStreak } = await loadStore()
    const streak = getStreak()
    expect(streak.currentStreak).toBe(12)
    expect(streak.longestStreak).toBe(12)
    expect(streak.lastReadDate).toBe('2026-04-08')
    expect(streak.totalDaysRead).toBe(12)
    // Verify it was persisted to new key
    expect(localStorage.getItem(BIBLE_STREAK_KEY)).not.toBeNull()
    // Old key preserved
    expect(localStorage.getItem('wr_bible_streak')).not.toBeNull()
  })

  it('subscribe notifies on recordReadToday', async () => {
    const { recordReadToday, subscribe } = await loadStore()
    const listener = vi.fn()
    subscribe(listener)
    recordReadToday()
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('week boundary year boundary', async () => {
    // Seed with weekResetDate in 2025, current call in 2026
    // This verifies the ISO week comparison works across years
    localStorage.setItem(
      BIBLE_STREAK_KEY,
      JSON.stringify({
        currentStreak: 0,
        longestStreak: 0,
        lastReadDate: '',
        streakStartDate: '',
        graceDaysAvailable: 1,
        graceDaysUsedThisWeek: 1,
        lastGraceUsedDate: '2025-12-29',
        weekResetDate: '2025-12-22', // old year's ISO week
        milestones: [],
        totalDaysRead: 0,
      }),
    )

    const { recordReadToday, getStreak } = await loadStore()
    recordReadToday()
    // Grace should have reset since we're in a new ISO week
    expect(getStreak().graceDaysUsedThisWeek).toBe(0)
  })

  it('recordReadToday returns isFirstReadEver correctly', async () => {
    const { recordReadToday } = await loadStore()
    const first = recordReadToday()
    expect(first.isFirstReadEver).toBe(true)
    const second = recordReadToday()
    expect(second.isFirstReadEver).toBe(false)
  })
})
