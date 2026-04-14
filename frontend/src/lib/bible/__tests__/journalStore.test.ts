import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BIBLE_JOURNAL_ENTRIES_KEY } from '@/constants/bible'
import type { JournalEntry } from '@/types/bible'

// Dynamic import so we get a fresh module per test via vi.resetModules()
async function loadStore() {
  const mod = await import('../journalStore')
  return mod
}

function makeJournalEntry(overrides: Partial<JournalEntry> = {}): JournalEntry {
  return {
    id: crypto.randomUUID(),
    body: 'Test entry',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  }
}

describe('journalStore', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetModules()
  })

  describe('read API', () => {
    it('returns empty array when no entries exist', async () => {
      const store = await loadStore()
      expect(store.getAllJournalEntries()).toEqual([])
    })

    it('getAllJournalEntries returns shallow copy', async () => {
      const store = await loadStore()
      const entry = makeJournalEntry()
      localStorage.setItem(BIBLE_JOURNAL_ENTRIES_KEY, JSON.stringify([entry]))

      const all = store.getAllJournalEntries()
      expect(all).toHaveLength(1)
      expect(all).not.toBe(store.getAllJournalEntries())
    })

    it('getJournalEntriesForVerse filters by book/chapter/verse within range', async () => {
      const store = await loadStore()
      const entry = makeJournalEntry({
        verseContext: { book: 'john', chapter: 3, startVerse: 16, endVerse: 18, reference: 'John 3:16–18' },
      })
      localStorage.setItem(BIBLE_JOURNAL_ENTRIES_KEY, JSON.stringify([entry]))

      expect(store.getJournalEntriesForVerse('john', 3, 16)).toHaveLength(1)
      expect(store.getJournalEntriesForVerse('john', 3, 17)).toHaveLength(1)
      expect(store.getJournalEntriesForVerse('john', 3, 18)).toHaveLength(1)
    })

    it('getJournalEntriesForVerse returns empty when no match', async () => {
      const store = await loadStore()
      const entry = makeJournalEntry({
        verseContext: { book: 'john', chapter: 3, startVerse: 16, endVerse: 18, reference: 'John 3:16–18' },
      })
      localStorage.setItem(BIBLE_JOURNAL_ENTRIES_KEY, JSON.stringify([entry]))

      expect(store.getJournalEntriesForVerse('john', 3, 15)).toHaveLength(0)
      expect(store.getJournalEntriesForVerse('john', 3, 19)).toHaveLength(0)
      expect(store.getJournalEntriesForVerse('genesis', 3, 16)).toHaveLength(0)
    })

    it('getJournalEntriesForVerse excludes entries without verseContext', async () => {
      const store = await loadStore()
      const entry = makeJournalEntry() // no verseContext
      localStorage.setItem(BIBLE_JOURNAL_ENTRIES_KEY, JSON.stringify([entry]))

      expect(store.getJournalEntriesForVerse('john', 3, 16)).toHaveLength(0)
    })

    it('getJournalEntryById returns entry when found', async () => {
      const store = await loadStore()
      const entry = makeJournalEntry({ id: 'test-id-1' })
      localStorage.setItem(BIBLE_JOURNAL_ENTRIES_KEY, JSON.stringify([entry]))

      const found = store.getJournalEntryById('test-id-1')
      expect(found).not.toBeNull()
      expect(found!.id).toBe('test-id-1')
    })

    it('getJournalEntryById returns null when not found', async () => {
      const store = await loadStore()
      expect(store.getJournalEntryById('nonexistent')).toBeNull()
    })
  })

  describe('write API', () => {
    it('createJournalEntry persists and returns entry with UUID', async () => {
      const store = await loadStore()
      const entry = store.createJournalEntry('My journal entry')

      expect(entry.id).toBeDefined()
      expect(entry.body).toBe('My journal entry')
      expect(entry.createdAt).toBeGreaterThan(0)

      const stored = JSON.parse(localStorage.getItem(BIBLE_JOURNAL_ENTRIES_KEY)!)
      expect(stored).toHaveLength(1)
      expect(stored[0].body).toBe('My journal entry')
    })

    it('createJournalEntry with verseContext attaches context', async () => {
      const store = await loadStore()
      const vc = { book: 'john', chapter: 3, startVerse: 16, endVerse: 18, reference: 'John 3:16–18' }
      const entry = store.createJournalEntry('Verse reflection', vc)

      expect(entry.verseContext).toEqual(vc)
    })

    it('createJournalEntry without verseContext omits field', async () => {
      const store = await loadStore()
      const entry = store.createJournalEntry('Free write')

      expect(entry.verseContext).toBeUndefined()
    })

    it('createJournalEntry sets createdAt === updatedAt', async () => {
      const store = await loadStore()
      const entry = store.createJournalEntry('Test')

      expect(entry.createdAt).toBe(entry.updatedAt)
    })

    it('updateJournalEntry updates body and updatedAt', async () => {
      const store = await loadStore()
      const entry = store.createJournalEntry('Original')
      const originalUpdatedAt = entry.updatedAt

      // Small delay to ensure different timestamp
      await new Promise((r) => setTimeout(r, 5))
      const updated = store.updateJournalEntry(entry.id, 'Modified')

      expect(updated.body).toBe('Modified')
      expect(updated.updatedAt).toBeGreaterThanOrEqual(originalUpdatedAt)
      expect(updated.createdAt).toBe(entry.createdAt)
    })

    it('deleteJournalEntry removes entry', async () => {
      const store = await loadStore()
      const entry = store.createJournalEntry('To delete')

      store.deleteJournalEntry(entry.id)
      expect(store.getAllJournalEntries()).toHaveLength(0)
    })

    it('deleteJournalEntry no-ops for unknown id', async () => {
      const store = await loadStore()
      store.createJournalEntry('Keep me')

      store.deleteJournalEntry('nonexistent')
      expect(store.getAllJournalEntries()).toHaveLength(1)
    })
  })

  describe('subscription', () => {
    it('subscribe notifies on create', async () => {
      const store = await loadStore()
      const listener = vi.fn()
      store.subscribe(listener)

      store.createJournalEntry('New entry')
      expect(listener).toHaveBeenCalledTimes(1)
    })

    it('subscribe notifies on update', async () => {
      const store = await loadStore()
      const entry = store.createJournalEntry('Original')

      const listener = vi.fn()
      store.subscribe(listener)

      store.updateJournalEntry(entry.id, 'Updated')
      expect(listener).toHaveBeenCalledTimes(1)
    })

    it('subscribe notifies on delete', async () => {
      const store = await loadStore()
      const entry = store.createJournalEntry('To delete')

      const listener = vi.fn()
      store.subscribe(listener)

      store.deleteJournalEntry(entry.id)
      expect(listener).toHaveBeenCalledTimes(1)
    })

    it('unsubscribe stops notifications', async () => {
      const store = await loadStore()
      const listener = vi.fn()
      const unsub = store.subscribe(listener)

      unsub()
      store.createJournalEntry('After unsub')
      expect(listener).not.toHaveBeenCalled()
    })
  })

  describe('SSR safety', () => {
    it('returns empty array when window is undefined', async () => {
      const store = await loadStore()
      expect(store.getAllJournalEntries()).toEqual([])
    })
  })

  describe('defensive parsing', () => {
    it('filters out entries with missing required fields', async () => {
      const data = [
        { id: 'bad', body: 'missing timestamps' },
        makeJournalEntry(),
      ]
      localStorage.setItem(BIBLE_JOURNAL_ENTRIES_KEY, JSON.stringify(data))

      const store = await loadStore()
      expect(store.getAllJournalEntries()).toHaveLength(1)
    })

    it('filters out non-array JSON', async () => {
      localStorage.setItem(BIBLE_JOURNAL_ENTRIES_KEY, JSON.stringify({ not: 'an array' }))

      const store = await loadStore()
      expect(store.getAllJournalEntries()).toEqual([])
    })

    it('handles corrupt JSON gracefully', async () => {
      localStorage.setItem(BIBLE_JOURNAL_ENTRIES_KEY, 'not-valid-json!!!')

      const store = await loadStore()
      expect(store.getAllJournalEntries()).toEqual([])
    })

    it('preserves valid entries alongside invalid ones', async () => {
      const validEntry = makeJournalEntry()
      const data = [
        { id: 123, body: null },
        validEntry,
        { id: 'bad', createdAt: 'not-a-number', updatedAt: 0, body: 'test' },
      ]
      localStorage.setItem(BIBLE_JOURNAL_ENTRIES_KEY, JSON.stringify(data))

      const store = await loadStore()
      const entries = store.getAllJournalEntries()
      expect(entries).toHaveLength(1)
      expect(entries[0].id).toBe(validEntry.id)
    })
  })

  describe('QuotaExceededError', () => {
    it('throws JournalStorageFullError on quota exceeded', async () => {
      const store = await loadStore()

      const original = Storage.prototype.setItem
      const quotaError = new Error('quota exceeded')
      quotaError.name = 'QuotaExceededError'
      Storage.prototype.setItem = function (key: string, ...args: unknown[]) {
        if (key === BIBLE_JOURNAL_ENTRIES_KEY) {
          throw quotaError
        }
        return original.apply(this, [key, ...args] as [string, string])
      }

      try {
        expect(() => store.createJournalEntry('Test')).toThrow(store.JournalStorageFullError)
      } finally {
        Storage.prototype.setItem = original
      }
    })
  })

  describe('cache coherence', () => {
    it('re-import after mutation reflects persisted data', async () => {
      const store1 = await loadStore()
      store1.createJournalEntry('Persisted entry')

      vi.resetModules()
      const store2 = await loadStore()
      const entries = store2.getAllJournalEntries()
      expect(entries).toHaveLength(1)
      expect(entries[0].body).toBe('Persisted entry')
    })
  })

  describe('multi-verse entries', () => {
    it('saves entry with startVerse !== endVerse (e.g. Psalm 23:1-6)', async () => {
      const store = await loadStore()
      const vc = { book: 'psalms', chapter: 23, startVerse: 1, endVerse: 6, reference: 'Psalm 23:1–6' }
      const entry = store.createJournalEntry('The Lord is my shepherd', vc)

      expect(entry.verseContext?.startVerse).toBe(1)
      expect(entry.verseContext?.endVerse).toBe(6)
    })

    it('getJournalEntriesForVerse matches any verse within range', async () => {
      const store = await loadStore()
      const vc = { book: 'psalms', chapter: 23, startVerse: 1, endVerse: 6, reference: 'Psalm 23:1–6' }
      store.createJournalEntry('The Lord is my shepherd', vc)

      for (let v = 1; v <= 6; v++) {
        expect(store.getJournalEntriesForVerse('psalms', 23, v)).toHaveLength(1)
      }
      expect(store.getJournalEntriesForVerse('psalms', 23, 7)).toHaveLength(0)
    })
  })
})
