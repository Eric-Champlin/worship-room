import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  getDailyActivityForLastYear,
  getIntensity,
  getBibleCoverage,
  countActiveDays,
  countTotalChaptersRead,
  countBooksVisited,
} from '../aggregation'
import { _resetForTesting } from '../chapterVisitStore'

// --- Mocks ---

// Control the date
vi.mock('@/lib/bible/dateUtils', () => ({
  getTodayLocal: vi.fn(() => '2026-04-13'),
}))

import { getTodayLocal } from '@/lib/bible/dateUtils'
const mockedGetTodayLocal = vi.mocked(getTodayLocal)

// Mock chapter visit store
const mockVisits: Record<string, Array<{ book: string; chapter: number }>> = {}
vi.mock('../chapterVisitStore', async () => {
  const actual = await vi.importActual<typeof import('../chapterVisitStore')>('../chapterVisitStore')
  return {
    ...actual,
    getAllVisits: () => ({ ...mockVisits }),
  }
})

// Mock highlight store
const mockHighlights: Array<{ book: string; chapter: number; createdAt: number }> = []
vi.mock('@/lib/bible/highlightStore', () => ({
  getAllHighlights: () => [...mockHighlights],
}))

// Mock bookmark store
const mockBookmarks: Array<{ book: string; chapter: number; createdAt: number }> = []
vi.mock('@/lib/bible/bookmarkStore', () => ({
  getAllBookmarks: () => [...mockBookmarks],
}))

// Mock notes store
const mockNotes: Array<{ book: string; chapter: number; createdAt: number }> = []
vi.mock('@/lib/bible/notes/store', () => ({
  getAllNotes: () => [...mockNotes],
}))

function clearMockData() {
  for (const key of Object.keys(mockVisits)) delete mockVisits[key]
  mockHighlights.length = 0
  mockBookmarks.length = 0
  mockNotes.length = 0
}

/** Convert YYYY-MM-DD to epoch ms at noon local time. */
function dateToEpoch(dateStr: string): number {
  return new Date(dateStr + 'T12:00:00').getTime()
}

beforeEach(() => {
  localStorage.clear()
  _resetForTesting()
  clearMockData()
  mockedGetTodayLocal.mockReturnValue('2026-04-13')
})

describe('getDailyActivityForLastYear', () => {
  it('returns 365 entries (non-leap year)', () => {
    // 2026 is not a leap year
    mockedGetTodayLocal.mockReturnValue('2026-04-13')
    const result = getDailyActivityForLastYear()
    expect(result).toHaveLength(365)
  })

  it('returns 366 entries in leap year', () => {
    // 2028 is a leap year
    mockedGetTodayLocal.mockReturnValue('2028-04-13')
    const result = getDailyActivityForLastYear()
    expect(result).toHaveLength(366)
  })

  it('merges visits + highlights by date', () => {
    const targetDate = '2026-03-15'
    mockVisits[targetDate] = [{ book: 'genesis', chapter: 1 }]
    mockHighlights.push({ book: 'genesis', chapter: 2, createdAt: dateToEpoch(targetDate) })

    const result = getDailyActivityForLastYear()
    const day = result.find((d) => d.date === targetDate)
    expect(day).toBeDefined()
    expect(day!.chapterCount).toBe(2)
    expect(day!.chapters).toEqual(
      expect.arrayContaining([
        { book: 'genesis', chapter: 1 },
        { book: 'genesis', chapter: 2 },
      ]),
    )
  })

  it('deduplicates same book:chapter on same day across sources', () => {
    const targetDate = '2026-03-15'
    mockVisits[targetDate] = [{ book: 'genesis', chapter: 1 }]
    mockHighlights.push({ book: 'genesis', chapter: 1, createdAt: dateToEpoch(targetDate) })

    const result = getDailyActivityForLastYear()
    const day = result.find((d) => d.date === targetDate)
    expect(day!.chapterCount).toBe(1) // deduplicated
  })

  it('returns empty entries for days with no activity', () => {
    const result = getDailyActivityForLastYear()
    const emptyDay = result[0]
    expect(emptyDay.chapterCount).toBe(0)
    expect(emptyDay.chapters).toEqual([])
  })

  it('is ordered oldest to newest', () => {
    const result = getDailyActivityForLastYear()
    expect(result[0].date).toBe('2025-04-14') // 364 days before 2026-04-13
    expect(result[result.length - 1].date).toBe('2026-04-13')
  })
})

describe('getIntensity', () => {
  it('maps 0 → 0', () => {
    expect(getIntensity(0)).toBe(0)
  })

  it('maps 1 → 1, 2 → 1', () => {
    expect(getIntensity(1)).toBe(1)
    expect(getIntensity(2)).toBe(1)
  })

  it('maps 3 → 2, 5 → 2', () => {
    expect(getIntensity(3)).toBe(2)
    expect(getIntensity(5)).toBe(2)
  })

  it('maps 6 → 3, 9 → 3', () => {
    expect(getIntensity(6)).toBe(3)
    expect(getIntensity(9)).toBe(3)
  })

  it('maps 10 → 4, 100 → 4', () => {
    expect(getIntensity(10)).toBe(4)
    expect(getIntensity(100)).toBe(4)
  })
})

describe('getBibleCoverage', () => {
  it('returns 66 books in canonical order', () => {
    const coverage = getBibleCoverage({})
    expect(coverage).toHaveLength(66)
    expect(coverage[0].name).toBe('Genesis')
    expect(coverage[65].name).toBe('Revelation')
  })

  it('populates readChapters from progress map', () => {
    const progress = { genesis: [1, 2, 3] }
    const coverage = getBibleCoverage(progress)
    const genesis = coverage[0]
    expect(genesis.readChapters).toEqual(new Set([1, 2, 3]))
  })

  it('populates highlightedChapters from highlights', () => {
    mockHighlights.push(
      { book: 'genesis', chapter: 5, createdAt: dateToEpoch('2026-03-15') },
      { book: 'genesis', chapter: 10, createdAt: dateToEpoch('2026-03-16') },
    )
    const coverage = getBibleCoverage({})
    const genesis = coverage[0]
    expect(genesis.highlightedChapters).toEqual(new Set([5, 10]))
  })

  it('returns empty sets for books with no activity', () => {
    const coverage = getBibleCoverage({})
    const obadiah = coverage.find((b) => b.slug === 'obadiah')!
    expect(obadiah.readChapters.size).toBe(0)
    expect(obadiah.highlightedChapters.size).toBe(0)
  })
})

describe('countActiveDays', () => {
  it('counts days with chapterCount > 0', () => {
    const activity = [
      { date: '2026-04-10', chapterCount: 0, chapters: [] },
      { date: '2026-04-11', chapterCount: 3, chapters: [{ book: 'genesis', chapter: 1 }] },
      { date: '2026-04-12', chapterCount: 0, chapters: [] },
      { date: '2026-04-13', chapterCount: 1, chapters: [{ book: 'john', chapter: 1 }] },
    ]
    expect(countActiveDays(activity)).toBe(2)
  })
})

describe('countTotalChaptersRead', () => {
  it('sums all chapters across books', () => {
    const progress = { genesis: [1, 2, 3], john: [1, 3], psalms: [23] }
    expect(countTotalChaptersRead(progress)).toBe(6)
  })
})

describe('countBooksVisited', () => {
  it('counts books with at least one chapter', () => {
    const progress = { genesis: [1, 2], john: [], psalms: [23], romans: [] }
    expect(countBooksVisited(progress)).toBe(2)
  })
})
