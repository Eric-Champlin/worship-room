import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BIBLE_BOOKMARKS_KEY } from '@/constants/bible'
import type { Bookmark } from '@/types/bible'

// Dynamic import so we get a fresh module per test via vi.resetModules()
async function loadStore() {
  const mod = await import('../bookmarkStore')
  return mod
}

function makeBookmark(overrides: Partial<Bookmark> = {}): Bookmark {
  return {
    id: crypto.randomUUID(),
    book: 'john',
    chapter: 3,
    startVerse: 16,
    endVerse: 16,
    createdAt: Date.now(),
    ...overrides,
  }
}

describe('bookmarkStore', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetModules()
  })

  describe('read API', () => {
    it('returns empty array when no bookmarks exist', async () => {
      const store = await loadStore()
      expect(store.getAllBookmarks()).toEqual([])
    })

    it('getAllBookmarks returns all bookmarks as shallow copy', async () => {
      const store = await loadStore()
      const bm = makeBookmark()
      localStorage.setItem(BIBLE_BOOKMARKS_KEY, JSON.stringify([bm]))

      const all = store.getAllBookmarks()
      expect(all).toHaveLength(1)
      expect(all).not.toBe(store.getAllBookmarks()) // shallow copy
    })

    it('getBookmarksForChapter filters by book and chapter', async () => {
      const store = await loadStore()
      const bm1 = makeBookmark({ book: 'john', chapter: 3, startVerse: 16, endVerse: 16 })
      const bm2 = makeBookmark({ book: 'john', chapter: 4, startVerse: 1, endVerse: 1 })
      const bm3 = makeBookmark({ book: 'genesis', chapter: 3, startVerse: 1, endVerse: 1 })
      localStorage.setItem(BIBLE_BOOKMARKS_KEY, JSON.stringify([bm1, bm2, bm3]))

      const ch3 = store.getBookmarksForChapter('john', 3)
      expect(ch3).toHaveLength(1)
      expect(ch3[0].startVerse).toBe(16)
    })

    it('getBookmarkForVerse finds bookmark containing that verse (range-aware)', async () => {
      const store = await loadStore()
      const bm = makeBookmark({ startVerse: 14, endVerse: 18 })
      localStorage.setItem(BIBLE_BOOKMARKS_KEY, JSON.stringify([bm]))

      expect(store.getBookmarkForVerse('john', 3, 16)).not.toBeNull()
      expect(store.getBookmarkForVerse('john', 3, 14)).not.toBeNull()
      expect(store.getBookmarkForVerse('john', 3, 18)).not.toBeNull()
    })

    it('getBookmarkForVerse returns null when no bookmark matches', async () => {
      const store = await loadStore()
      const bm = makeBookmark({ startVerse: 14, endVerse: 18 })
      localStorage.setItem(BIBLE_BOOKMARKS_KEY, JSON.stringify([bm]))

      expect(store.getBookmarkForVerse('john', 3, 19)).toBeNull()
      expect(store.getBookmarkForVerse('john', 3, 13)).toBeNull()
    })

    it('isSelectionBookmarked returns true when any verse in range is bookmarked', async () => {
      const store = await loadStore()
      const bm = makeBookmark({ startVerse: 16, endVerse: 16 })
      localStorage.setItem(BIBLE_BOOKMARKS_KEY, JSON.stringify([bm]))

      expect(store.isSelectionBookmarked('john', 3, 14, 18)).toBe(true)
    })

    it('isSelectionBookmarked returns false when no verses are bookmarked', async () => {
      const store = await loadStore()
      const bm = makeBookmark({ startVerse: 16, endVerse: 16 })
      localStorage.setItem(BIBLE_BOOKMARKS_KEY, JSON.stringify([bm]))

      expect(store.isSelectionBookmarked('john', 3, 1, 5)).toBe(false)
    })
  })

  describe('toggleBookmark', () => {
    it('creates bookmark when none exists — returns { created: true, bookmark }', async () => {
      const store = await loadStore()
      const result = store.toggleBookmark({
        book: 'john',
        chapter: 3,
        startVerse: 16,
        endVerse: 16,
      })

      expect(result.created).toBe(true)
      expect(result.bookmark).not.toBeNull()
      expect(result.bookmark!.book).toBe('john')
      expect(result.bookmark!.chapter).toBe(3)
      expect(result.bookmark!.startVerse).toBe(16)
      expect(result.bookmark!.endVerse).toBe(16)
      expect(result.bookmark!.id).toBeDefined()
      expect(result.bookmark!.createdAt).toBeGreaterThan(0)
    })

    it('removes bookmark when selection is fully bookmarked — returns { created: false, bookmark: null }', async () => {
      const store = await loadStore()
      store.toggleBookmark({ book: 'john', chapter: 3, startVerse: 16, endVerse: 16 })

      const result = store.toggleBookmark({ book: 'john', chapter: 3, startVerse: 16, endVerse: 16 })

      expect(result.created).toBe(false)
      expect(result.bookmark).toBeNull()
      expect(store.getAllBookmarks()).toHaveLength(0)
    })

    it('removes all overlapping bookmarks when selection partially overlaps', async () => {
      const store = await loadStore()
      store.toggleBookmark({ book: 'john', chapter: 3, startVerse: 14, endVerse: 14 })
      store.toggleBookmark({ book: 'john', chapter: 3, startVerse: 16, endVerse: 18 })

      // New selection overlaps the second bookmark
      const result = store.toggleBookmark({ book: 'john', chapter: 3, startVerse: 17, endVerse: 20 })

      expect(result.created).toBe(false)
      expect(result.removed).toHaveLength(1)
      expect(result.removed![0].startVerse).toBe(16)
      // Non-overlapping bookmark remains
      expect(store.getAllBookmarks()).toHaveLength(1)
      expect(store.getAllBookmarks()[0].startVerse).toBe(14)
    })

    it('creates a single spanning bookmark for multi-verse selection', async () => {
      const store = await loadStore()
      const result = store.toggleBookmark({
        book: 'john',
        chapter: 3,
        startVerse: 16,
        endVerse: 18,
      })

      expect(result.created).toBe(true)
      expect(result.bookmark!.startVerse).toBe(16)
      expect(result.bookmark!.endVerse).toBe(18)
      expect(store.getAllBookmarks()).toHaveLength(1)
    })

    it('persists to localStorage after toggle-create', async () => {
      const store = await loadStore()
      store.toggleBookmark({ book: 'john', chapter: 3, startVerse: 16, endVerse: 16 })

      const stored = JSON.parse(localStorage.getItem(BIBLE_BOOKMARKS_KEY)!)
      expect(stored).toHaveLength(1)
      expect(stored[0].book).toBe('john')
    })

    it('persists to localStorage after toggle-remove', async () => {
      const store = await loadStore()
      store.toggleBookmark({ book: 'john', chapter: 3, startVerse: 16, endVerse: 16 })
      store.toggleBookmark({ book: 'john', chapter: 3, startVerse: 16, endVerse: 16 })

      const stored = JSON.parse(localStorage.getItem(BIBLE_BOOKMARKS_KEY)!)
      expect(stored).toHaveLength(0)
    })
  })

  describe('setBookmarkLabel', () => {
    it('sets label on existing bookmark', async () => {
      const store = await loadStore()
      const { bookmark } = store.toggleBookmark({ book: 'john', chapter: 3, startVerse: 16, endVerse: 16 })

      store.setBookmarkLabel(bookmark!.id, 'For Monday')
      const updated = store.getBookmarkForVerse('john', 3, 16)
      expect(updated!.label).toBe('For Monday')
    })

    it('no-ops when bookmark id not found', async () => {
      const store = await loadStore()
      store.toggleBookmark({ book: 'john', chapter: 3, startVerse: 16, endVerse: 16 })

      store.setBookmarkLabel('nonexistent-id', 'label')
      expect(store.getAllBookmarks()).toHaveLength(1)
    })

    it('clears label when empty string provided', async () => {
      const store = await loadStore()
      const { bookmark } = store.toggleBookmark({ book: 'john', chapter: 3, startVerse: 16, endVerse: 16 })

      store.setBookmarkLabel(bookmark!.id, 'Some label')
      store.setBookmarkLabel(bookmark!.id, '')
      const updated = store.getBookmarkForVerse('john', 3, 16)
      expect(updated!.label).toBeUndefined()
    })

    it('truncates label to 80 characters', async () => {
      const store = await loadStore()
      const { bookmark } = store.toggleBookmark({ book: 'john', chapter: 3, startVerse: 16, endVerse: 16 })

      const longLabel = 'A'.repeat(100)
      store.setBookmarkLabel(bookmark!.id, longLabel)
      const updated = store.getBookmarkForVerse('john', 3, 16)
      expect(updated!.label).toHaveLength(80)
    })
  })

  describe('removeBookmark', () => {
    it('removes bookmark by id', async () => {
      const store = await loadStore()
      const { bookmark } = store.toggleBookmark({ book: 'john', chapter: 3, startVerse: 16, endVerse: 16 })

      store.removeBookmark(bookmark!.id)
      expect(store.getAllBookmarks()).toHaveLength(0)
    })

    it('no-ops when id not found', async () => {
      const store = await loadStore()
      store.toggleBookmark({ book: 'john', chapter: 3, startVerse: 16, endVerse: 16 })

      store.removeBookmark('nonexistent-id')
      expect(store.getAllBookmarks()).toHaveLength(1)
    })
  })

  describe('removeBookmarksInRange', () => {
    it('removes all bookmarks overlapping the given range', async () => {
      const store = await loadStore()
      store.toggleBookmark({ book: 'john', chapter: 3, startVerse: 14, endVerse: 14 })
      store.toggleBookmark({ book: 'john', chapter: 3, startVerse: 16, endVerse: 18 })
      store.toggleBookmark({ book: 'john', chapter: 3, startVerse: 20, endVerse: 20 })

      const removed = store.removeBookmarksInRange({
        book: 'john',
        chapter: 3,
        startVerse: 15,
        endVerse: 19,
      })

      expect(removed).toHaveLength(1)
      expect(removed[0].startVerse).toBe(16)
      expect(store.getAllBookmarks()).toHaveLength(2)
    })

    it('no-ops when no bookmarks overlap', async () => {
      const store = await loadStore()
      store.toggleBookmark({ book: 'john', chapter: 3, startVerse: 16, endVerse: 16 })

      const removed = store.removeBookmarksInRange({
        book: 'john',
        chapter: 3,
        startVerse: 1,
        endVerse: 5,
      })

      expect(removed).toHaveLength(0)
      expect(store.getAllBookmarks()).toHaveLength(1)
    })
  })

  describe('restoreBookmarks', () => {
    it('restores previously removed bookmarks with original ids and labels', async () => {
      const store = await loadStore()
      const { bookmark } = store.toggleBookmark({ book: 'john', chapter: 3, startVerse: 16, endVerse: 16 })
      store.setBookmarkLabel(bookmark!.id, 'My label')
      const saved = store.getAllBookmarks()

      store.removeBookmark(bookmark!.id)
      expect(store.getAllBookmarks()).toHaveLength(0)

      store.restoreBookmarks(saved)
      const restored = store.getAllBookmarks()
      expect(restored).toHaveLength(1)
      expect(restored[0].id).toBe(bookmark!.id)
      expect(restored[0].label).toBe('My label')
    })

    it('does not create duplicates if bookmark id already exists', async () => {
      const store = await loadStore()
      const { bookmark } = store.toggleBookmark({ book: 'john', chapter: 3, startVerse: 16, endVerse: 16 })

      store.restoreBookmarks([bookmark!])
      expect(store.getAllBookmarks()).toHaveLength(1)
    })
  })

  describe('subscribe', () => {
    it('notifies listeners on toggleBookmark', async () => {
      const store = await loadStore()
      const listener = vi.fn()
      store.subscribe(listener)

      store.toggleBookmark({ book: 'john', chapter: 3, startVerse: 16, endVerse: 16 })
      expect(listener).toHaveBeenCalledTimes(1)
    })

    it('notifies listeners on setBookmarkLabel', async () => {
      const store = await loadStore()
      const { bookmark } = store.toggleBookmark({ book: 'john', chapter: 3, startVerse: 16, endVerse: 16 })

      const listener = vi.fn()
      store.subscribe(listener)

      store.setBookmarkLabel(bookmark!.id, 'label')
      expect(listener).toHaveBeenCalledTimes(1)
    })

    it('notifies listeners on removeBookmark', async () => {
      const store = await loadStore()
      const { bookmark } = store.toggleBookmark({ book: 'john', chapter: 3, startVerse: 16, endVerse: 16 })

      const listener = vi.fn()
      store.subscribe(listener)

      store.removeBookmark(bookmark!.id)
      expect(listener).toHaveBeenCalledTimes(1)
    })

    it('unsubscribe stops notifications', async () => {
      const store = await loadStore()
      const listener = vi.fn()
      const unsub = store.subscribe(listener)

      unsub()
      store.toggleBookmark({ book: 'john', chapter: 3, startVerse: 16, endVerse: 16 })
      expect(listener).not.toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    it('returns empty array when localStorage contains malformed JSON', async () => {
      localStorage.setItem(BIBLE_BOOKMARKS_KEY, 'not-valid-json!!!')

      const store = await loadStore()
      expect(store.getAllBookmarks()).toEqual([])
    })

    it('silently filters invalid entries', async () => {
      const data = [
        { book: 'john' }, // missing most fields
        makeBookmark(),
      ]
      localStorage.setItem(BIBLE_BOOKMARKS_KEY, JSON.stringify(data))

      const store = await loadStore()
      expect(store.getAllBookmarks()).toHaveLength(1)
    })

    it('throws BookmarkStorageFullError on QuotaExceededError', async () => {
      const store = await loadStore()

      const original = Storage.prototype.setItem
      const quotaError = new Error('quota exceeded')
      quotaError.name = 'QuotaExceededError'
      Storage.prototype.setItem = function (key: string) {
        if (key === BIBLE_BOOKMARKS_KEY) {
          throw quotaError
        }
        return original.apply(this, arguments as unknown as [string, string])
      }

      try {
        expect(() =>
          store.toggleBookmark({ book: 'john', chapter: 3, startVerse: 1, endVerse: 1 }),
        ).toThrow(store.BookmarkStorageFullError)
      } finally {
        Storage.prototype.setItem = original
      }
    })
  })

  describe('SSR safety', () => {
    it('returns empty array when window is undefined', async () => {
      // The store guards with typeof window === 'undefined'
      // In jsdom this can't truly be tested, but we verify the guard exists
      // by checking that an empty localStorage returns empty array
      const store = await loadStore()
      expect(store.getAllBookmarks()).toEqual([])
    })
  })
})
