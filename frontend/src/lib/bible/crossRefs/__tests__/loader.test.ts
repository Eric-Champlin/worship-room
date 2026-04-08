import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CrossRefBookJson } from '@/types/bible'

// Dynamic import so we get a fresh module per test via vi.resetModules()
async function loadModule() {
  const mod = await import('../loader')
  return mod
}

function makeCrossRefBookJson(
  slug: string,
  entries: Record<string, Array<{ ref: string; rank: number }>>,
): CrossRefBookJson {
  return {
    book: slug.charAt(0).toUpperCase() + slug.slice(1),
    slug,
    entries,
  }
}

// Mock the dynamic imports for cross-reference JSON files
const mockJsonData = new Map<string, CrossRefBookJson>()

vi.mock('@/data/bible/cross-references/john.json', () => ({
  default: (() => mockJsonData.get('john'))(),
}))

// We need to mock the dynamic import pattern used by the loader.
// The loader uses: import(`@/data/bible/cross-references/${slug}.json`)
// We'll mock this at the module level using vi.mock with a factory.

// Clear and re-setup mocks before each test
beforeEach(() => {
  mockJsonData.clear()
})

describe('loader', () => {
  beforeEach(() => {
    vi.resetModules()
    mockJsonData.clear()
  })

  describe('parseRef', () => {
    it('parses "romans.5.8" to { book: "romans", chapter: 5, verse: 8 }', async () => {
      const { parseRef } = await loadModule()
      expect(parseRef('romans.5.8')).toEqual({ book: 'romans', chapter: 5, verse: 8 })
    })

    it('parses slugs with hyphens "1-corinthians.13.4" correctly', async () => {
      const { parseRef } = await loadModule()
      expect(parseRef('1-corinthians.13.4')).toEqual({
        book: '1-corinthians',
        chapter: 13,
        verse: 4,
      })
    })
  })

  describe('loadCrossRefsForBook', () => {
    it('loads and parses JSON, returns a CrossRefMap with parsed entries', async () => {
      const testData = makeCrossRefBookJson('john', {
        '3.16': [
          { ref: 'romans.5.8', rank: 1 },
          { ref: 'john.11.25', rank: 2 },
        ],
      })

      // We need to mock the dynamic import at the Vite level
      vi.doMock('@/data/bible/cross-references/john.json', () => ({
        default: testData,
      }))

      const { loadCrossRefsForBook } = await loadModule()
      const map = await loadCrossRefsForBook('john')

      expect(map.size).toBe(1)
      const refs = map.get('3.16')!
      expect(refs).toHaveLength(2)
      expect(refs[0]).toEqual({
        ref: 'romans.5.8',
        rank: 1,
        parsed: { book: 'romans', chapter: 5, verse: 8 },
      })
      expect(refs[1]).toEqual({
        ref: 'john.11.25',
        rank: 2,
        parsed: { book: 'john', chapter: 11, verse: 25 },
      })
    })

    it('returns cached map on second call (verify import called once)', async () => {
      const testData = makeCrossRefBookJson('john', {
        '1.1': [{ ref: 'genesis.1.1', rank: 1 }],
      })

      vi.doMock('@/data/bible/cross-references/john.json', () => ({
        default: testData,
      }))

      const { loadCrossRefsForBook } = await loadModule()
      const map1 = await loadCrossRefsForBook('john')
      const map2 = await loadCrossRefsForBook('john')

      expect(map1).toBe(map2) // same reference = cached
    })

    it('returns empty map for missing/corrupt book file (no crash)', async () => {
      vi.doMock('@/data/bible/cross-references/john.json', () => {
        throw new Error('File not found')
      })

      const { loadCrossRefsForBook } = await loadModule()
      const map = await loadCrossRefsForBook('nonexistent-book')

      expect(map.size).toBe(0)
    })

    it('deduplicates concurrent calls for the same book', async () => {
      let resolveImport: ((value: { default: CrossRefBookJson }) => void) | null = null
      const importPromise = new Promise<{ default: CrossRefBookJson }>((resolve) => {
        resolveImport = resolve
      })

      vi.doMock('@/data/bible/cross-references/john.json', () => importPromise)

      const { loadCrossRefsForBook } = await loadModule()

      // Start two concurrent loads
      const promise1 = loadCrossRefsForBook('john')
      const promise2 = loadCrossRefsForBook('john')

      // Resolve the import
      resolveImport!({
        default: makeCrossRefBookJson('john', {
          '1.1': [{ ref: 'genesis.1.1', rank: 1 }],
        }),
      })

      const [map1, map2] = await Promise.all([promise1, promise2])
      expect(map1).toBe(map2) // same promise, same result
    })
  })

  describe('getCrossRefsForVerse', () => {
    it('returns refs for an existing key', async () => {
      const testData = makeCrossRefBookJson('john', {
        '3.16': [{ ref: 'romans.5.8', rank: 1 }],
      })

      vi.doMock('@/data/bible/cross-references/john.json', () => ({
        default: testData,
      }))

      const { loadCrossRefsForBook, getCrossRefsForVerse } = await loadModule()
      const map = await loadCrossRefsForBook('john')
      const refs = getCrossRefsForVerse(map, 3, 16)

      expect(refs).toHaveLength(1)
      expect(refs[0].ref).toBe('romans.5.8')
    })

    it('returns empty array for missing verse key', async () => {
      const testData = makeCrossRefBookJson('john', {
        '3.16': [{ ref: 'romans.5.8', rank: 1 }],
      })

      vi.doMock('@/data/bible/cross-references/john.json', () => ({
        default: testData,
      }))

      const { loadCrossRefsForBook, getCrossRefsForVerse } = await loadModule()
      const map = await loadCrossRefsForBook('john')
      const refs = getCrossRefsForVerse(map, 1, 99)

      expect(refs).toEqual([])
    })
  })

  describe('getCrossRefCountForVerse', () => {
    it('returns correct count', async () => {
      const testData = makeCrossRefBookJson('john', {
        '3.16': [
          { ref: 'romans.5.8', rank: 1 },
          { ref: 'john.11.25', rank: 2 },
          { ref: 'genesis.22.2', rank: 3 },
        ],
      })

      vi.doMock('@/data/bible/cross-references/john.json', () => ({
        default: testData,
      }))

      const { loadCrossRefsForBook, getCrossRefCountForVerse } = await loadModule()
      const map = await loadCrossRefsForBook('john')

      expect(getCrossRefCountForVerse(map, 3, 16)).toBe(3)
    })

    it('returns 0 for missing verse', async () => {
      const testData = makeCrossRefBookJson('john', {})

      vi.doMock('@/data/bible/cross-references/john.json', () => ({
        default: testData,
      }))

      const { loadCrossRefsForBook, getCrossRefCountForVerse } = await loadModule()
      const map = await loadCrossRefsForBook('john')

      expect(getCrossRefCountForVerse(map, 99, 99)).toBe(0)
    })
  })

  describe('isBookCached', () => {
    it('returns false before load, true after load', async () => {
      const testData = makeCrossRefBookJson('john', {
        '1.1': [{ ref: 'genesis.1.1', rank: 1 }],
      })

      vi.doMock('@/data/bible/cross-references/john.json', () => ({
        default: testData,
      }))

      const { loadCrossRefsForBook, isBookCached } = await loadModule()

      expect(isBookCached('john')).toBe(false)
      await loadCrossRefsForBook('john')
      expect(isBookCached('john')).toBe(true)
    })
  })

  describe('getDeduplicatedCrossRefCount', () => {
    it('deduplicates across multiple verses in a range', async () => {
      const testData = makeCrossRefBookJson('john', {
        '3.16': [
          { ref: 'romans.5.8', rank: 1 },
          { ref: 'genesis.22.2', rank: 2 },
        ],
        '3.17': [
          { ref: 'john.10.10', rank: 1 },
          { ref: 'romans.8.32', rank: 2 },
        ],
      })

      vi.doMock('@/data/bible/cross-references/john.json', () => ({
        default: testData,
      }))

      const { loadCrossRefsForBook, getDeduplicatedCrossRefCount } = await loadModule()
      const map = await loadCrossRefsForBook('john')

      // 4 unique refs across 2 verses
      expect(getDeduplicatedCrossRefCount(map, 3, 16, 17)).toBe(4)
    })

    it('handles overlapping refs correctly (count = union size)', async () => {
      const testData = makeCrossRefBookJson('john', {
        '3.16': [
          { ref: 'romans.5.8', rank: 1 },
          { ref: 'genesis.22.2', rank: 2 },
        ],
        '3.17': [
          { ref: 'romans.5.8', rank: 1 }, // duplicate
          { ref: 'john.10.10', rank: 2 },
        ],
      })

      vi.doMock('@/data/bible/cross-references/john.json', () => ({
        default: testData,
      }))

      const { loadCrossRefsForBook, getDeduplicatedCrossRefCount } = await loadModule()
      const map = await loadCrossRefsForBook('john')

      // 3 unique refs (romans.5.8 deduplicated)
      expect(getDeduplicatedCrossRefCount(map, 3, 16, 17)).toBe(3)
    })
  })

  describe('_resetCacheForTesting', () => {
    it('clears the in-memory cache', async () => {
      const testData = makeCrossRefBookJson('john', {
        '1.1': [{ ref: 'genesis.1.1', rank: 1 }],
      })

      vi.doMock('@/data/bible/cross-references/john.json', () => ({
        default: testData,
      }))

      const { loadCrossRefsForBook, isBookCached, _resetCacheForTesting } = await loadModule()

      await loadCrossRefsForBook('john')
      expect(isBookCached('john')).toBe(true)

      _resetCacheForTesting()
      expect(isBookCached('john')).toBe(false)
    })
  })
})
