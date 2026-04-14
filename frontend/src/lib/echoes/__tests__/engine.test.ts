import { describe, expect, it } from 'vitest'

import type { Highlight } from '@/types/bible'
import type { ChapterVisitStore } from '@/types/heatmap'
import type { MemorizationCard } from '@/types/memorize'

import { getEchoes, getEchoForHomePage } from '../engine'

const MS_PER_DAY = 86_400_000

function daysAgo(days: number): number {
  return Date.now() - days * MS_PER_DAY
}

function makeHighlight(overrides: Partial<Highlight> = {}): Highlight {
  return {
    id: 'hl-1',
    book: 'john',
    chapter: 3,
    startVerse: 16,
    endVerse: 16,
    color: 'joy',
    createdAt: daysAgo(7),
    updatedAt: daysAgo(7),
    ...overrides,
  }
}

function makeCard(overrides: Partial<MemorizationCard> = {}): MemorizationCard {
  return {
    id: 'card-1',
    book: 'psalms',
    bookName: 'Psalms',
    chapter: 23,
    startVerse: 1,
    endVerse: 1,
    verseText: 'The LORD is my shepherd; I shall not want.',
    reference: 'Psalms 23:1',
    createdAt: daysAgo(30),
    lastReviewedAt: null,
    reviewCount: 0,
    ...overrides,
  }
}

function todayLastYear(): string {
  const d = new Date()
  const year = d.getFullYear() - 1
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

describe('getEchoes', () => {
  it('returns empty array for no history', () => {
    expect(getEchoes([], [], {})).toEqual([])
  })

  it('produces echo for highlight at 7 days', () => {
    const highlights = [makeHighlight({ createdAt: daysAgo(7) })]
    const result = getEchoes(highlights, [], {})
    expect(result).toHaveLength(1)
    expect(result[0].kind).toBe('highlighted')
    expect(result[0].relativeLabel).toBe('a week ago')
  })

  it('produces echo for highlight at 8 days (tolerance +1)', () => {
    const highlights = [makeHighlight({ createdAt: daysAgo(8) })]
    const result = getEchoes(highlights, [], {})
    expect(result).toHaveLength(1)
  })

  it('produces nothing for highlight at 10 days', () => {
    const highlights = [makeHighlight({ createdAt: daysAgo(10) })]
    const result = getEchoes(highlights, [], {})
    expect(result).toHaveLength(0)
  })

  it('produces echo for memorized card at 30 days', () => {
    const cards = [makeCard({ createdAt: daysAgo(30) })]
    const result = getEchoes([], cards, {})
    expect(result).toHaveLength(1)
    expect(result[0].kind).toBe('memorized')
    expect(result[0].text).toBe('The LORD is my shepherd; I shall not want.')
  })

  it('produces echo for read-on-this-day matching month/day different year', () => {
    const dateKey = todayLastYear()
    const visits: ChapterVisitStore = {
      [dateKey]: [{ book: 'genesis', chapter: 1 }],
    }
    const result = getEchoes([], [], visits)
    expect(result).toHaveLength(1)
    expect(result[0].kind).toBe('read-on-this-day')
    expect(result[0].relativeLabel).toBe('on this day last year')
  })

  it('rejects read-on-this-day for same year', () => {
    const today = new Date()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    const dateKey = `${today.getFullYear()}-${month}-${day}`
    const visits: ChapterVisitStore = {
      [dateKey]: [{ book: 'genesis', chapter: 1 }],
    }
    const result = getEchoes([], [], visits)
    expect(result).toHaveLength(0)
  })

  it('ranks memorized > highlighted > read-on-this-day for same interval', () => {
    const highlights = [makeHighlight({ book: 'john', createdAt: daysAgo(30) })]
    const cards = [makeCard({ book: 'psalms', createdAt: daysAgo(30) })]
    const dateKey = todayLastYear()
    const visits: ChapterVisitStore = {
      [dateKey]: [{ book: 'genesis', chapter: 1 }],
    }
    const result = getEchoes(highlights, cards, visits)
    expect(result.length).toBeGreaterThanOrEqual(3)
    expect(result[0].kind).toBe('memorized')
    expect(result[1].kind).toBe('highlighted')
    expect(result[2].kind).toBe('read-on-this-day')
  })

  it('applies recency bonus — 7 day echo scores higher than 365 day', () => {
    const hl7 = makeHighlight({ id: 'hl-7', book: 'john', createdAt: daysAgo(7) })
    const hl365 = makeHighlight({ id: 'hl-365', book: 'romans', createdAt: daysAgo(365) })
    const result = getEchoes([hl7, hl365], [], {})
    expect(result).toHaveLength(2)
    expect(result[0].book).toBe('john') // 7-day has higher recency bonus
  })

  it('applies variety penalty — one per book', () => {
    const hl1 = makeHighlight({ id: 'hl-1', book: 'john', chapter: 3, startVerse: 16, endVerse: 16, createdAt: daysAgo(7) })
    const hl2 = makeHighlight({ id: 'hl-2', book: 'john', chapter: 3, startVerse: 17, endVerse: 17, createdAt: daysAgo(14) })
    const result = getEchoes([hl1, hl2], [], {})
    expect(result).toHaveLength(1)
    expect(result[0].book).toBe('john')
  })

  it('applies freshness penalty for seen echoes', () => {
    const hl = makeHighlight({ createdAt: daysAgo(7) })
    const echoId = `echo:highlighted:john:3:16-16`
    const seen = new Set([echoId])
    const resultSeen = getEchoes([hl], [], {}, undefined, seen)
    const resultFresh = getEchoes([hl], [], {})

    expect(resultSeen[0].score).toBeLessThan(resultFresh[0].score)
    expect(resultFresh[0].score - resultSeen[0].score).toBe(50)
  })

  it('formats multi-verse highlight range', () => {
    const hl = makeHighlight({ startVerse: 16, endVerse: 17, createdAt: daysAgo(7) })
    const result = getEchoes([hl], [], {})
    expect(result[0].reference).toBe('John 3:16-17')
  })

  it('filters by options.kinds', () => {
    const highlights = [makeHighlight({ createdAt: daysAgo(7) })]
    const cards = [makeCard({ createdAt: daysAgo(30) })]
    const result = getEchoes(highlights, cards, {}, { kinds: ['memorized'] })
    expect(result).toHaveLength(1)
    expect(result[0].kind).toBe('memorized')
  })

  it('respects options.limit', () => {
    const highlights = [
      makeHighlight({ id: 'hl-1', book: 'john', createdAt: daysAgo(7) }),
      makeHighlight({ id: 'hl-2', book: 'romans', createdAt: daysAgo(14) }),
      makeHighlight({ id: 'hl-3', book: 'genesis', createdAt: daysAgo(30) }),
    ]
    const result = getEchoes(highlights, [], {}, { limit: 2 })
    expect(result).toHaveLength(2)
  })

  it('highlight echoes have empty text', () => {
    const hl = makeHighlight({ createdAt: daysAgo(7) })
    const result = getEchoes([hl], [], {})
    expect(result[0].text).toBe('')
  })

  it('read-on-this-day echoes have startVerse 0 and endVerse 0', () => {
    const dateKey = todayLastYear()
    const visits: ChapterVisitStore = {
      [dateKey]: [{ book: 'genesis', chapter: 1 }],
    }
    const result = getEchoes([], [], visits)
    expect(result[0].startVerse).toBe(0)
    expect(result[0].endVerse).toBe(0)
  })
})

describe('getEchoForHomePage', () => {
  it('returns top echo when candidates exist', () => {
    const cards = [makeCard({ createdAt: daysAgo(30) })]
    const result = getEchoForHomePage([], cards, {})
    expect(result).not.toBeNull()
    expect(result!.kind).toBe('memorized')
  })

  it('returns null for no history', () => {
    expect(getEchoForHomePage([], [], {})).toBeNull()
  })
})
