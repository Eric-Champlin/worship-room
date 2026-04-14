import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  recordChapterVisit,
  getAllVisits,
  getVisitsInRange,
  subscribe,
  _resetForTesting,
} from '../chapterVisitStore'

// Mock getTodayLocal to control the date
vi.mock('@/lib/bible/dateUtils', () => ({
  getTodayLocal: vi.fn(() => '2026-04-13'),
}))

import { getTodayLocal } from '@/lib/bible/dateUtils'

const mockedGetTodayLocal = vi.mocked(getTodayLocal)

beforeEach(() => {
  localStorage.clear()
  _resetForTesting()
  mockedGetTodayLocal.mockReturnValue('2026-04-13')
})

describe('chapterVisitStore', () => {
  it('records a chapter visit for today', () => {
    recordChapterVisit('genesis', 1)

    const visits = getAllVisits()
    expect(visits['2026-04-13']).toEqual([{ book: 'genesis', chapter: 1 }])
  })

  it('deduplicates same book+chapter on same day', () => {
    recordChapterVisit('genesis', 1)
    recordChapterVisit('genesis', 1)

    const visits = getAllVisits()
    expect(visits['2026-04-13']).toHaveLength(1)
  })

  it('allows different chapters on same day', () => {
    recordChapterVisit('genesis', 1)
    recordChapterVisit('genesis', 2)

    const visits = getAllVisits()
    expect(visits['2026-04-13']).toHaveLength(2)
    expect(visits['2026-04-13']).toEqual([
      { book: 'genesis', chapter: 1 },
      { book: 'genesis', chapter: 2 },
    ])
  })

  it('allows different books on same day', () => {
    recordChapterVisit('genesis', 1)
    recordChapterVisit('john', 3)

    const visits = getAllVisits()
    expect(visits['2026-04-13']).toHaveLength(2)
    expect(visits['2026-04-13']).toEqual([
      { book: 'genesis', chapter: 1 },
      { book: 'john', chapter: 3 },
    ])
  })

  it('evicts oldest days when exceeding 400 cap', () => {
    // Seed 400 days of data
    for (let i = 0; i < 400; i++) {
      const dateKey = `2025-${String(Math.floor(i / 28) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`
      mockedGetTodayLocal.mockReturnValue(dateKey)
      recordChapterVisit('genesis', 1)
    }

    // Reset cache so we reload from storage
    _resetForTesting()
    let visits = getAllVisits()
    expect(Object.keys(visits)).toHaveLength(400)

    // Add one more day — should evict the oldest
    mockedGetTodayLocal.mockReturnValue('2026-12-31')
    recordChapterVisit('genesis', 1)

    visits = getAllVisits()
    expect(Object.keys(visits)).toHaveLength(400)
    // The oldest key should have been evicted
    const sortedDates = Object.keys(visits).sort()
    expect(sortedDates[sortedDates.length - 1]).toBe('2026-12-31')
  })

  it('returns empty object for new users', () => {
    const visits = getAllVisits()
    expect(visits).toEqual({})
  })

  it('getVisitsInRange filters by date range', () => {
    // Seed multiple days
    mockedGetTodayLocal.mockReturnValue('2026-04-10')
    recordChapterVisit('genesis', 1)
    mockedGetTodayLocal.mockReturnValue('2026-04-11')
    recordChapterVisit('genesis', 2)
    mockedGetTodayLocal.mockReturnValue('2026-04-12')
    recordChapterVisit('genesis', 3)
    mockedGetTodayLocal.mockReturnValue('2026-04-13')
    recordChapterVisit('genesis', 4)

    const range = getVisitsInRange('2026-04-11', '2026-04-12')
    expect(Object.keys(range)).toHaveLength(2)
    expect(range['2026-04-11']).toBeDefined()
    expect(range['2026-04-12']).toBeDefined()
    expect(range['2026-04-10']).toBeUndefined()
    expect(range['2026-04-13']).toBeUndefined()
  })

  it('handles localStorage unavailable gracefully', () => {
    const originalSetItem = localStorage.setItem
    localStorage.setItem = () => {
      throw new Error('QuotaExceededError')
    }

    // Should not throw
    expect(() => recordChapterVisit('genesis', 1)).not.toThrow()

    localStorage.setItem = originalSetItem
  })

  it('subscribe/unsubscribe notifies on write', () => {
    const listener = vi.fn()
    const unsubscribe = subscribe(listener)

    recordChapterVisit('genesis', 1)
    expect(listener).toHaveBeenCalledTimes(1)

    recordChapterVisit('genesis', 2)
    expect(listener).toHaveBeenCalledTimes(2)

    unsubscribe()

    recordChapterVisit('genesis', 3)
    expect(listener).toHaveBeenCalledTimes(2) // Not called again
  })

  it('_resetForTesting clears cache', () => {
    recordChapterVisit('genesis', 1)
    expect(Object.keys(getAllVisits())).toHaveLength(1)

    _resetForTesting()
    localStorage.clear()

    expect(getAllVisits()).toEqual({})
  })
})
