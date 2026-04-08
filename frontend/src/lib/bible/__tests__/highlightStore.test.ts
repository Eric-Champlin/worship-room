import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BIBLE_HIGHLIGHTS_KEY } from '@/constants/bible'
import type { Highlight, HighlightColor } from '@/types/bible'

// Dynamic import so we get a fresh module per test via vi.resetModules()
async function loadStore() {
  const mod = await import('../highlightStore')
  return mod
}

function makeHighlight(overrides: Partial<Highlight> = {}): Highlight {
  return {
    id: crypto.randomUUID(),
    book: 'john',
    chapter: 3,
    startVerse: 16,
    endVerse: 16,
    color: 'peace',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  }
}

describe('highlightStore', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetModules()
  })

  describe('getAllHighlights / getHighlightsForChapter / getHighlightForVerse', () => {
    it('returns empty array when no highlights exist', async () => {
      const store = await loadStore()
      expect(store.getAllHighlights()).toEqual([])
    })

    it('getHighlightsForChapter filters by book and chapter', async () => {
      const store = await loadStore()
      store.applyHighlight({ book: 'john', chapter: 3, startVerse: 16, endVerse: 16 }, 'peace')
      store.applyHighlight({ book: 'john', chapter: 4, startVerse: 1, endVerse: 1 }, 'joy')
      store.applyHighlight({ book: 'genesis', chapter: 3, startVerse: 1, endVerse: 1 }, 'promise')

      const ch3 = store.getHighlightsForChapter('john', 3)
      expect(ch3).toHaveLength(1)
      expect(ch3[0].startVerse).toBe(16)
    })

    it('getHighlightForVerse returns highlight containing that verse (range-aware)', async () => {
      const store = await loadStore()
      store.applyHighlight({ book: 'john', chapter: 3, startVerse: 14, endVerse: 18 }, 'joy')

      expect(store.getHighlightForVerse('john', 3, 16)).not.toBeNull()
      expect(store.getHighlightForVerse('john', 3, 16)!.color).toBe('joy')
      expect(store.getHighlightForVerse('john', 3, 19)).toBeNull()
    })
  })

  describe('applyHighlight — new highlights (no overlap)', () => {
    it('creates a single-verse highlight with startVerse === endVerse', async () => {
      const store = await loadStore()
      const hl = store.applyHighlight({ book: 'john', chapter: 3, startVerse: 16, endVerse: 16 }, 'peace')

      expect(hl.startVerse).toBe(16)
      expect(hl.endVerse).toBe(16)
      expect(hl.color).toBe('peace')
      expect(hl.id).toBeDefined()
      expect(hl.createdAt).toBeGreaterThan(0)
      expect(hl.updatedAt).toBeGreaterThan(0)
    })

    it('creates a multi-verse range highlight', async () => {
      const store = await loadStore()
      const hl = store.applyHighlight({ book: 'john', chapter: 3, startVerse: 16, endVerse: 18 }, 'conviction')

      expect(hl.startVerse).toBe(16)
      expect(hl.endVerse).toBe(18)
      expect(store.getAllHighlights()).toHaveLength(1)
    })

    it('highlights in different books do not interfere', async () => {
      const store = await loadStore()
      store.applyHighlight({ book: 'john', chapter: 3, startVerse: 16, endVerse: 16 }, 'peace')
      store.applyHighlight({ book: 'genesis', chapter: 1, startVerse: 1, endVerse: 1 }, 'joy')

      expect(store.getAllHighlights()).toHaveLength(2)
    })
  })

  describe('applyHighlight — same range overwrite', () => {
    it('same range, same color is idempotent (one record)', async () => {
      const store = await loadStore()
      store.applyHighlight({ book: 'john', chapter: 3, startVerse: 16, endVerse: 18 }, 'peace')
      store.applyHighlight({ book: 'john', chapter: 3, startVerse: 16, endVerse: 18 }, 'peace')

      expect(store.getAllHighlights()).toHaveLength(1)
    })

    it('same range, different color updates color and updatedAt', async () => {
      const store = await loadStore()
      const first = store.applyHighlight({ book: 'john', chapter: 3, startVerse: 16, endVerse: 18 }, 'peace')
      const firstUpdatedAt = first.updatedAt

      // Small delay so updatedAt differs
      await new Promise((r) => setTimeout(r, 5))

      const second = store.applyHighlight({ book: 'john', chapter: 3, startVerse: 16, endVerse: 18 }, 'joy')

      expect(store.getAllHighlights()).toHaveLength(1)
      expect(second.color).toBe('joy')
      expect(second.updatedAt).toBeGreaterThanOrEqual(firstUpdatedAt)
    })
  })

  describe('applyHighlight — partial overlap left', () => {
    it('existing 16-18 Peace, new 15-17 Joy → 15-17 Joy + 18 Peace', async () => {
      const store = await loadStore()
      store.applyHighlight({ book: 'john', chapter: 3, startVerse: 16, endVerse: 18 }, 'peace')
      store.applyHighlight({ book: 'john', chapter: 3, startVerse: 15, endVerse: 17 }, 'joy')

      const all = store.getHighlightsForChapter('john', 3)
      expect(all).toHaveLength(2)

      const joyHl = all.find((h) => h.color === 'joy')!
      const peaceHl = all.find((h) => h.color === 'peace')!
      expect(joyHl.startVerse).toBe(15)
      expect(joyHl.endVerse).toBe(17)
      expect(peaceHl.startVerse).toBe(18)
      expect(peaceHl.endVerse).toBe(18)
    })
  })

  describe('applyHighlight — partial overlap right', () => {
    it('existing 16-18 Peace, new 17-19 Joy → 16 Peace + 17-19 Joy', async () => {
      const store = await loadStore()
      store.applyHighlight({ book: 'john', chapter: 3, startVerse: 16, endVerse: 18 }, 'peace')
      store.applyHighlight({ book: 'john', chapter: 3, startVerse: 17, endVerse: 19 }, 'joy')

      const all = store.getHighlightsForChapter('john', 3)
      expect(all).toHaveLength(2)

      const peaceHl = all.find((h) => h.color === 'peace')!
      const joyHl = all.find((h) => h.color === 'joy')!
      expect(peaceHl.startVerse).toBe(16)
      expect(peaceHl.endVerse).toBe(16)
      expect(joyHl.startVerse).toBe(17)
      expect(joyHl.endVerse).toBe(19)
    })
  })

  describe('applyHighlight — engulfing range', () => {
    it('existing 16-18 Peace, new 15-20 Joy → 15-20 Joy (old deleted)', async () => {
      const store = await loadStore()
      store.applyHighlight({ book: 'john', chapter: 3, startVerse: 16, endVerse: 18 }, 'peace')
      store.applyHighlight({ book: 'john', chapter: 3, startVerse: 15, endVerse: 20 }, 'joy')

      const all = store.getHighlightsForChapter('john', 3)
      expect(all).toHaveLength(1)
      expect(all[0].color).toBe('joy')
      expect(all[0].startVerse).toBe(15)
      expect(all[0].endVerse).toBe(20)
    })
  })

  describe('applyHighlight — engulfed range (splits existing)', () => {
    it('existing 15-20 Peace, new 17-18 Joy → 15-16 Peace + 17-18 Joy + 19-20 Peace', async () => {
      const store = await loadStore()
      store.applyHighlight({ book: 'john', chapter: 3, startVerse: 15, endVerse: 20 }, 'peace')
      store.applyHighlight({ book: 'john', chapter: 3, startVerse: 17, endVerse: 18 }, 'joy')

      const all = store.getHighlightsForChapter('john', 3).sort((a, b) => a.startVerse - b.startVerse)
      expect(all).toHaveLength(3)

      expect(all[0].color).toBe('peace')
      expect(all[0].startVerse).toBe(15)
      expect(all[0].endVerse).toBe(16)

      expect(all[1].color).toBe('joy')
      expect(all[1].startVerse).toBe(17)
      expect(all[1].endVerse).toBe(18)

      expect(all[2].color).toBe('peace')
      expect(all[2].startVerse).toBe(19)
      expect(all[2].endVerse).toBe(20)
    })
  })

  describe('applyHighlight — adjacent ranges (no merge)', () => {
    it('adjacent same-color highlights stay separate', async () => {
      const store = await loadStore()
      store.applyHighlight({ book: 'john', chapter: 3, startVerse: 16, endVerse: 16 }, 'peace')
      store.applyHighlight({ book: 'john', chapter: 3, startVerse: 17, endVerse: 17 }, 'peace')

      expect(store.getAllHighlights()).toHaveLength(2)
    })

    it('adjacent different-color highlights stay separate', async () => {
      const store = await loadStore()
      store.applyHighlight({ book: 'john', chapter: 3, startVerse: 16, endVerse: 16 }, 'peace')
      store.applyHighlight({ book: 'john', chapter: 3, startVerse: 17, endVerse: 17 }, 'joy')

      expect(store.getAllHighlights()).toHaveLength(2)
    })
  })

  describe('applyHighlight — multi-split', () => {
    it('new range crossing three existing highlights splits all appropriately', async () => {
      const store = await loadStore()
      store.applyHighlight({ book: 'john', chapter: 3, startVerse: 1, endVerse: 3 }, 'peace')
      store.applyHighlight({ book: 'john', chapter: 3, startVerse: 5, endVerse: 7 }, 'conviction')
      store.applyHighlight({ book: 'john', chapter: 3, startVerse: 9, endVerse: 11 }, 'promise')

      // New range 2-10 Joy should split all three
      store.applyHighlight({ book: 'john', chapter: 3, startVerse: 2, endVerse: 10 }, 'joy')

      const all = store.getHighlightsForChapter('john', 3).sort((a, b) => a.startVerse - b.startVerse)

      // Expected: 1 Peace + 2-10 Joy + 11 Promise
      expect(all).toHaveLength(3)
      expect(all[0]).toMatchObject({ startVerse: 1, endVerse: 1, color: 'peace' })
      expect(all[1]).toMatchObject({ startVerse: 2, endVerse: 10, color: 'joy' })
      expect(all[2]).toMatchObject({ startVerse: 11, endVerse: 11, color: 'promise' })
    })
  })

  describe('removeHighlight', () => {
    it('removes a highlight by id', async () => {
      const store = await loadStore()
      const hl = store.applyHighlight({ book: 'john', chapter: 3, startVerse: 16, endVerse: 16 }, 'peace')
      expect(store.getAllHighlights()).toHaveLength(1)

      store.removeHighlight(hl.id)
      expect(store.getAllHighlights()).toHaveLength(0)
    })

    it('no-ops when id does not exist', async () => {
      const store = await loadStore()
      store.applyHighlight({ book: 'john', chapter: 3, startVerse: 16, endVerse: 16 }, 'peace')

      store.removeHighlight('nonexistent-id')
      expect(store.getAllHighlights()).toHaveLength(1)
    })
  })

  describe('removeHighlightsInRange', () => {
    it('removes all highlights within a selection range', async () => {
      const store = await loadStore()
      store.applyHighlight({ book: 'john', chapter: 3, startVerse: 14, endVerse: 14 }, 'peace')
      store.applyHighlight({ book: 'john', chapter: 3, startVerse: 16, endVerse: 18 }, 'joy')
      store.applyHighlight({ book: 'john', chapter: 3, startVerse: 20, endVerse: 20 }, 'promise')

      store.removeHighlightsInRange({ book: 'john', chapter: 3, startVerse: 15, endVerse: 19 })

      const all = store.getAllHighlights()
      expect(all).toHaveLength(2)
      expect(all.find((h) => h.color === 'joy')).toBeUndefined()
    })
  })

  describe('updateHighlightColor', () => {
    it('updates color by id and sets updatedAt', async () => {
      const store = await loadStore()
      const hl = store.applyHighlight({ book: 'john', chapter: 3, startVerse: 16, endVerse: 16 }, 'peace')

      await new Promise((r) => setTimeout(r, 5))
      store.updateHighlightColor(hl.id, 'conviction')

      const updated = store.getHighlightForVerse('john', 3, 16)
      expect(updated!.color).toBe('conviction')
      expect(updated!.updatedAt).toBeGreaterThanOrEqual(hl.updatedAt)
    })

    it('no-ops for non-existent id', async () => {
      const store = await loadStore()
      store.applyHighlight({ book: 'john', chapter: 3, startVerse: 16, endVerse: 16 }, 'peace')

      store.updateHighlightColor('nonexistent', 'joy')
      expect(store.getHighlightForVerse('john', 3, 16)!.color).toBe('peace')
    })
  })

  describe('subscribe', () => {
    it('listener is called on applyHighlight', async () => {
      const store = await loadStore()
      const listener = vi.fn()
      store.subscribe(listener)

      store.applyHighlight({ book: 'john', chapter: 3, startVerse: 16, endVerse: 16 }, 'peace')
      expect(listener).toHaveBeenCalledTimes(1)
    })

    it('listener is called on removeHighlight', async () => {
      const store = await loadStore()
      const hl = store.applyHighlight({ book: 'john', chapter: 3, startVerse: 16, endVerse: 16 }, 'peace')

      const listener = vi.fn()
      store.subscribe(listener)

      store.removeHighlight(hl.id)
      expect(listener).toHaveBeenCalledTimes(1)
    })

    it('listener is called on updateHighlightColor', async () => {
      const store = await loadStore()
      const hl = store.applyHighlight({ book: 'john', chapter: 3, startVerse: 16, endVerse: 16 }, 'peace')

      const listener = vi.fn()
      store.subscribe(listener)

      store.updateHighlightColor(hl.id, 'joy')
      expect(listener).toHaveBeenCalledTimes(1)
    })

    it('unsubscribe stops notifications', async () => {
      const store = await loadStore()
      const listener = vi.fn()
      const unsub = store.subscribe(listener)

      unsub()
      store.applyHighlight({ book: 'john', chapter: 3, startVerse: 16, endVerse: 16 }, 'peace')
      expect(listener).not.toHaveBeenCalled()
    })

    it('multiple listeners all fire', async () => {
      const store = await loadStore()
      const listener1 = vi.fn()
      const listener2 = vi.fn()
      store.subscribe(listener1)
      store.subscribe(listener2)

      store.applyHighlight({ book: 'john', chapter: 3, startVerse: 16, endVerse: 16 }, 'peace')
      expect(listener1).toHaveBeenCalledTimes(1)
      expect(listener2).toHaveBeenCalledTimes(1)
    })
  })

  describe('migration from old BibleHighlight format', () => {
    it('auto-migrates old per-verse records on first read', async () => {
      const oldData = [
        { book: 'john', chapter: 3, verseNumber: 16, color: '#FBBF24', createdAt: '2024-01-01T00:00:00Z' },
      ]
      localStorage.setItem(BIBLE_HIGHLIGHTS_KEY, JSON.stringify(oldData))

      const store = await loadStore()
      const all = store.getAllHighlights()

      expect(all).toHaveLength(1)
      expect(all[0].startVerse).toBe(16)
      expect(all[0].endVerse).toBe(16)
      expect(all[0].id).toBeDefined()
    })

    it('maps old hex colors to new emotion keys', async () => {
      const oldData = [
        { book: 'john', chapter: 3, verseNumber: 16, color: '#FBBF24', createdAt: '2024-01-01T00:00:00Z' },
        { book: 'john', chapter: 3, verseNumber: 17, color: '#34D399', createdAt: '2024-01-01T00:00:00Z' },
        { book: 'john', chapter: 3, verseNumber: 18, color: '#60A5FA', createdAt: '2024-01-01T00:00:00Z' },
        { book: 'john', chapter: 3, verseNumber: 19, color: '#F472B6', createdAt: '2024-01-01T00:00:00Z' },
      ]
      localStorage.setItem(BIBLE_HIGHLIGHTS_KEY, JSON.stringify(oldData))

      const store = await loadStore()
      const all = store.getAllHighlights().sort((a, b) => a.startVerse - b.startVerse)

      expect(all[0].color).toBe('joy')       // #FBBF24
      expect(all[1].color).toBe('promise')    // #34D399
      expect(all[2].color).toBe('peace')      // #60A5FA
      expect(all[3].color).toBe('struggle')   // #F472B6
    })

    it('converts ISO createdAt to epoch ms', async () => {
      const oldData = [
        { book: 'john', chapter: 3, verseNumber: 16, color: '#FBBF24', createdAt: '2024-06-15T12:30:00Z' },
      ]
      localStorage.setItem(BIBLE_HIGHLIGHTS_KEY, JSON.stringify(oldData))

      const store = await loadStore()
      const hl = store.getAllHighlights()[0]

      expect(hl.createdAt).toBe(new Date('2024-06-15T12:30:00Z').getTime())
      expect(hl.updatedAt).toBe(hl.createdAt)
    })

    it('migrated data is written back to localStorage in new format', async () => {
      const oldData = [
        { book: 'john', chapter: 3, verseNumber: 16, color: '#FBBF24', createdAt: '2024-01-01T00:00:00Z' },
      ]
      localStorage.setItem(BIBLE_HIGHLIGHTS_KEY, JSON.stringify(oldData))

      const store = await loadStore()
      store.getAllHighlights() // trigger read+migration

      const stored = JSON.parse(localStorage.getItem(BIBLE_HIGHLIGHTS_KEY)!)
      expect(stored[0]).toHaveProperty('id')
      expect(stored[0]).toHaveProperty('startVerse')
    })

    it('unmapped hex colors default to joy', async () => {
      const oldData = [
        { book: 'john', chapter: 3, verseNumber: 16, color: '#FF00FF', createdAt: '2024-01-01T00:00:00Z' },
      ]
      localStorage.setItem(BIBLE_HIGHLIGHTS_KEY, JSON.stringify(oldData))

      const store = await loadStore()
      expect(store.getAllHighlights()[0].color).toBe('joy')
    })
  })

  describe('malformed data tolerance', () => {
    it('garbage JSON returns empty array', async () => {
      localStorage.setItem(BIBLE_HIGHLIGHTS_KEY, 'not-valid-json!!!')

      const store = await loadStore()
      expect(store.getAllHighlights()).toEqual([])
    })

    it('null in localStorage returns empty array', async () => {
      // localStorage.getItem returns null by default when key doesn't exist
      const store = await loadStore()
      expect(store.getAllHighlights()).toEqual([])
    })

    it('array with missing fields filters out invalid records', async () => {
      const data = [
        { book: 'john' }, // missing most fields
        { id: crypto.randomUUID(), book: 'john', chapter: 3, startVerse: 16, endVerse: 16, color: 'peace', createdAt: Date.now(), updatedAt: Date.now() },
      ]
      localStorage.setItem(BIBLE_HIGHLIGHTS_KEY, JSON.stringify(data))

      const store = await loadStore()
      expect(store.getAllHighlights()).toHaveLength(1)
    })

    it('non-array JSON returns empty array', async () => {
      localStorage.setItem(BIBLE_HIGHLIGHTS_KEY, JSON.stringify({ foo: 'bar' }))

      const store = await loadStore()
      expect(store.getAllHighlights()).toEqual([])
    })
  })

  describe('QuotaExceededError handling', () => {
    it('throws HighlightStorageFullError on QuotaExceededError', async () => {
      const store = await loadStore()

      // Override Storage.prototype.setItem to throw QuotaExceededError
      const original = Storage.prototype.setItem
      const quotaError = new Error('quota exceeded')
      quotaError.name = 'QuotaExceededError'
      Storage.prototype.setItem = function (key: string) {
        if (key === BIBLE_HIGHLIGHTS_KEY) {
          throw quotaError
        }
        return original.apply(this, arguments as unknown as [string, string])
      }

      try {
        expect(() =>
          store.applyHighlight({ book: 'john', chapter: 3, startVerse: 1, endVerse: 1 }, 'peace'),
        ).toThrow(store.HighlightStorageFullError)
      } finally {
        Storage.prototype.setItem = original
      }
    })
  })
})
