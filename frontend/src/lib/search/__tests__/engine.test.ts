import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  loadSearchIndex,
  searchBible,
  isIndexLoaded,
  loadVerseTexts,
  applyProximityBonus,
  _resetIndexCache,
} from '../engine'
import type { SearchIndex, SearchResult } from '../types'

// Mini index for testing
const MINI_INDEX: SearchIndex = {
  version: 1,
  generatedAt: '2026-04-13T00:00:00Z',
  totalVerses: 5,
  tokens: {
    god: [
      ['genesis', 1, 1],
      ['john', 3, 16],
      ['john', 3, 17],
      ['revelation', 22, 21],
    ],
    love: [
      ['john', 3, 16],
      ['1-john', 4, 8],
    ],
    world: [
      ['genesis', 1, 1],
      ['john', 3, 16],
      ['john', 3, 17],
    ],
    hope: [
      ['romans', 8, 24],
      ['romans', 8, 25],
    ],
    faith: [
      ['hebrews', 11, 1],
    ],
    eternal: [
      ['john', 3, 16],
    ],
    life: [
      ['john', 3, 16],
      ['genesis', 1, 1],
    ],
    create: [
      ['genesis', 1, 1],
    ],
  },
}

// Build a long token list for pagination testing
function buildLargeIndex(): SearchIndex {
  const refs: [string, number, number][] = []
  for (let i = 1; i <= 120; i++) {
    refs.push(['psalms', Math.ceil(i / 10), (i % 10) + 1])
  }
  return {
    version: 1,
    generatedAt: '2026-04-13T00:00:00Z',
    totalVerses: 120,
    tokens: { peace: refs },
  }
}

// Mock fetch for index loading
const mockFetch = vi.fn()

beforeEach(() => {
  _resetIndexCache()
  vi.stubGlobal('fetch', mockFetch)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('loadSearchIndex', () => {
  it('fetches and caches the index', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(MINI_INDEX),
    })

    const idx = await loadSearchIndex()
    expect(idx.version).toBe(1)
    expect(idx.totalVerses).toBe(5)
    expect(mockFetch).toHaveBeenCalledTimes(1)

    // Second call uses cache — no additional fetch
    const idx2 = await loadSearchIndex()
    expect(idx2).toBe(idx)
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('throws on fetch failure', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 })
    await expect(loadSearchIndex()).rejects.toThrow('Failed to load search index: 404')
  })
})

describe('isIndexLoaded', () => {
  it('returns false before loading', () => {
    expect(isIndexLoaded()).toBe(false)
  })

  it('returns true after loading', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(MINI_INDEX),
    })
    await loadSearchIndex()
    expect(isIndexLoaded()).toBe(true)
  })
})

describe('searchBible', () => {
  beforeEach(async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(MINI_INDEX),
    })
    await loadSearchIndex()
  })

  it('returns empty for empty query', () => {
    const { results, total } = searchBible('')
    expect(results).toEqual([])
    expect(total).toBe(0)
  })

  it('returns empty for stopwords-only query', () => {
    const { results } = searchBible('the and is')
    expect(results).toEqual([])
  })

  it('returns results for single-token query', () => {
    const { results, total } = searchBible('love')
    expect(total).toBe(2)
    expect(results).toHaveLength(2)
    expect(results[0].bookSlug).toBe('john')
    expect(results[1].bookSlug).toBe('1-john')
  })

  it('AND-matches multi-word query', () => {
    // "love world" → only john 3:16 has both tokens
    const { results, total } = searchBible('love world')
    expect(total).toBe(1)
    expect(results[0].bookSlug).toBe('john')
    expect(results[0].chapter).toBe(3)
    expect(results[0].verse).toBe(16)
  })

  it('returns empty when one AND token has no matches', () => {
    const { results } = searchBible('love xyznotfound')
    expect(results).toEqual([])
  })

  it('scores base correctly (1 per matched token)', () => {
    const { results } = searchBible('god love world')
    // Only john 3:16 has all three
    expect(results).toHaveLength(1)
    expect(results[0].score).toBe(3) // 3 tokens
  })

  it('applies recency bonus', () => {
    // Both "love" results: john and 1-john
    const { results: noRecency } = searchBible('love')
    const { results: withRecency } = searchBible('love', { recentBooks: ['1-john'] })

    const johnNoRecency = noRecency.find((r) => r.bookSlug === '1-john')
    const johnWithRecency = withRecency.find((r) => r.bookSlug === '1-john')

    expect(johnWithRecency!.score).toBe(johnNoRecency!.score + 1)
  })

  it('uses canonical book order as tiebreaker', () => {
    // "god world" → genesis 1:1 and john 3:16, john 3:17 — all have same base score
    const { results } = searchBible('god world')
    expect(results[0].bookSlug).toBe('genesis')
    expect(results[1].bookSlug).toBe('john')
  })

  it('paginates results', async () => {
    _resetIndexCache()
    const largeIndex = buildLargeIndex()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(largeIndex),
    })
    await loadSearchIndex()

    const page0 = searchBible('peace', { pageSize: 50, page: 0 })
    expect(page0.total).toBe(120)
    expect(page0.results).toHaveLength(50)

    const page1 = searchBible('peace', { pageSize: 50, page: 1 })
    expect(page1.results).toHaveLength(50)

    const page2 = searchBible('peace', { pageSize: 50, page: 2 })
    expect(page2.results).toHaveLength(20)
  })

  it('returns matchedTokens for highlighting', () => {
    const { results } = searchBible('god love')
    expect(results[0].matchedTokens).toEqual(['god', 'love'])
  })

  it('handles token not in index', () => {
    const { results } = searchBible('xyznotfound')
    expect(results).toEqual([])
  })

  it('returns empty when index not loaded', () => {
    _resetIndexCache()
    const { results } = searchBible('love')
    expect(results).toEqual([])
  })
})

describe('applyProximityBonus', () => {
  it('adds +2 when tokens are within 5 positions', () => {
    const results: SearchResult[] = [
      {
        bookSlug: 'john', bookName: 'John', chapter: 3, verse: 16,
        text: 'For God so loved the world that he gave his only born Son',
        score: 2, matchedTokens: ['god', 'world'],
      },
    ]
    applyProximityBonus(results, ['god', 'world'])
    // "god" at pos ~1, "world" at pos ~5 → span ~4 ≤ 5 → +2
    expect(results[0].score).toBeGreaterThanOrEqual(3.5) // 2 + 2 - 0.5 (length penalty since > 56 chars)
  })

  it('does not add proximity bonus for single-token queries', () => {
    const results: SearchResult[] = [
      {
        bookSlug: 'john', bookName: 'John', chapter: 3, verse: 16,
        text: 'For God so loved the world',
        score: 1, matchedTokens: ['god'],
      },
    ]
    applyProximityBonus(results, ['god'])
    expect(results[0].score).toBe(1) // No proximity bonus, no length penalty (text < 200 chars)
  })

  it('applies length penalty for single-token queries on long verses', () => {
    const longText = 'For God so loved the world ' + 'a '.repeat(100)
    const results: SearchResult[] = [
      {
        bookSlug: 'john', bookName: 'John', chapter: 3, verse: 16,
        text: longText,
        score: 1, matchedTokens: ['god'],
      },
    ]
    applyProximityBonus(results, ['god'])
    expect(results[0].score).toBe(0.5) // 1 - 0.5 length penalty, no proximity bonus
  })

  it('applies length penalty for long verses', () => {
    const longText = 'For God so loved the world ' + 'a '.repeat(100)
    const results: SearchResult[] = [
      {
        bookSlug: 'john', bookName: 'John', chapter: 3, verse: 16,
        text: longText,
        score: 2, matchedTokens: ['god', 'world'],
      },
    ]
    applyProximityBonus(results, ['god', 'world'])
    // Should have -0.5 length penalty (text > 200 chars)
    expect(results[0].score).toBe(2 + 2 - 0.5) // base + proximity - penalty
  })
})

describe('loadVerseTexts', () => {
  it('loads verse text from Bible data', async () => {
    const refs: [string, number, number][] = [
      ['john', 3, 16],
      ['john', 3, 17],
    ]

    const textMap = await loadVerseTexts(refs)
    // Should return actual WEB Bible text
    expect(textMap.get('john:3:16')).toContain('God so loved the world')
    expect(textMap.get('john:3:17')).toBeDefined()
    expect(textMap.size).toBe(2)
  })

  it('handles refs from different books', async () => {
    const refs: [string, number, number][] = [
      ['genesis', 1, 1],
      ['john', 3, 16],
    ]

    const textMap = await loadVerseTexts(refs)
    expect(textMap.get('genesis:1:1')).toContain('beginning')
    expect(textMap.get('john:3:16')).toContain('loved')
  })
})
