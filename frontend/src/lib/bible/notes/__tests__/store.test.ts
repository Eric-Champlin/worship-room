import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BIBLE_NOTES_STORAGE_KEY } from '@/constants/bible'
import type { Note } from '@/types/bible'

// Dynamic import so we get a fresh module per test via vi.resetModules()
async function loadStore() {
  const mod = await import('../store')
  return mod
}

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: crypto.randomUUID(),
    book: 'john',
    chapter: 3,
    startVerse: 16,
    endVerse: 16,
    body: 'God so loved the world.',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  }
}

describe('noteStore', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetModules()
  })

  describe('read API', () => {
    it('getAllNotes returns empty array when no notes exist', async () => {
      const store = await loadStore()
      expect(store.getAllNotes()).toEqual([])
    })

    it('getAllNotes returns all stored notes', async () => {
      const store = await loadStore()
      const n1 = makeNote({ startVerse: 1, endVerse: 1 })
      const n2 = makeNote({ startVerse: 2, endVerse: 2 })
      localStorage.setItem(BIBLE_NOTES_STORAGE_KEY, JSON.stringify([n1, n2]))

      expect(store.getAllNotes()).toHaveLength(2)
    })

    it('getNotesForChapter filters by book and chapter', async () => {
      const store = await loadStore()
      const n1 = makeNote({ book: 'john', chapter: 3, startVerse: 16, endVerse: 16 })
      const n2 = makeNote({ book: 'john', chapter: 4, startVerse: 1, endVerse: 1 })
      const n3 = makeNote({ book: 'genesis', chapter: 3, startVerse: 1, endVerse: 1 })
      localStorage.setItem(BIBLE_NOTES_STORAGE_KEY, JSON.stringify([n1, n2, n3]))

      const ch3 = store.getNotesForChapter('john', 3)
      expect(ch3).toHaveLength(1)
      expect(ch3[0].startVerse).toBe(16)
    })

    it('getNotesForChapter returns empty for non-matching chapter', async () => {
      const store = await loadStore()
      const n1 = makeNote({ book: 'john', chapter: 3 })
      localStorage.setItem(BIBLE_NOTES_STORAGE_KEY, JSON.stringify([n1]))

      expect(store.getNotesForChapter('john', 5)).toEqual([])
    })

    it('getNoteForVerse returns note when verse is inside range', async () => {
      const store = await loadStore()
      const n = makeNote({ startVerse: 14, endVerse: 18 })
      localStorage.setItem(BIBLE_NOTES_STORAGE_KEY, JSON.stringify([n]))

      expect(store.getNoteForVerse('john', 3, 16)).not.toBeNull()
      expect(store.getNoteForVerse('john', 3, 14)).not.toBeNull()
      expect(store.getNoteForVerse('john', 3, 18)).not.toBeNull()
    })

    it('getNoteForVerse returns null when no note covers the verse', async () => {
      const store = await loadStore()
      const n = makeNote({ startVerse: 14, endVerse: 18 })
      localStorage.setItem(BIBLE_NOTES_STORAGE_KEY, JSON.stringify([n]))

      expect(store.getNoteForVerse('john', 3, 19)).toBeNull()
      expect(store.getNoteForVerse('john', 3, 13)).toBeNull()
    })

    it('getNoteForSelection returns note when selection overlaps existing range', async () => {
      const store = await loadStore()
      const n = makeNote({ startVerse: 14, endVerse: 18 })
      localStorage.setItem(BIBLE_NOTES_STORAGE_KEY, JSON.stringify([n]))

      // Partial overlap
      const result = store.getNoteForSelection({
        book: 'john',
        chapter: 3,
        startVerse: 16,
        endVerse: 20,
      })
      expect(result).not.toBeNull()
      expect(result!.id).toBe(n.id)
    })

    it('getNoteForSelection returns null when no overlap', async () => {
      const store = await loadStore()
      const n = makeNote({ startVerse: 14, endVerse: 18 })
      localStorage.setItem(BIBLE_NOTES_STORAGE_KEY, JSON.stringify([n]))

      const result = store.getNoteForSelection({
        book: 'john',
        chapter: 3,
        startVerse: 19,
        endVerse: 22,
      })
      expect(result).toBeNull()
    })
  })

  describe('upsertNote', () => {
    it('creates a new note when no overlap', async () => {
      const store = await loadStore()
      const note = store.upsertNote(
        { book: 'john', chapter: 3, startVerse: 16, endVerse: 16 },
        'Amazing verse',
      )

      expect(note.id).toBeDefined()
      expect(note.book).toBe('john')
      expect(note.chapter).toBe(3)
      expect(note.startVerse).toBe(16)
      expect(note.endVerse).toBe(16)
      expect(note.body).toBe('Amazing verse')
      expect(note.createdAt).toBeGreaterThan(0)
      expect(note.updatedAt).toBe(note.createdAt)
      expect(store.getAllNotes()).toHaveLength(1)
    })

    it('updates existing note when verse overlaps (preserves id, createdAt, bumps updatedAt)', async () => {
      const store = await loadStore()
      const original = store.upsertNote(
        { book: 'john', chapter: 3, startVerse: 14, endVerse: 18 },
        'Original text',
      )

      // Wait a tick to ensure updatedAt differs
      const before = Date.now()
      const updated = store.upsertNote(
        { book: 'john', chapter: 3, startVerse: 16, endVerse: 16 },
        'Updated text',
      )

      expect(updated.id).toBe(original.id)
      expect(updated.createdAt).toBe(original.createdAt)
      expect(updated.updatedAt).toBeGreaterThanOrEqual(before)
      expect(updated.body).toBe('Updated text')
      expect(store.getAllNotes()).toHaveLength(1)
    })

    it('preserves existing range when selection is narrower (does not shrink)', async () => {
      const store = await loadStore()
      store.upsertNote(
        { book: 'john', chapter: 3, startVerse: 14, endVerse: 18 },
        'Wide range note',
      )

      const updated = store.upsertNote(
        { book: 'john', chapter: 3, startVerse: 16, endVerse: 16 },
        'Narrow selection update',
      )

      expect(updated.startVerse).toBe(14)
      expect(updated.endVerse).toBe(18)
    })

    it('returns the created/updated Note', async () => {
      const store = await loadStore()
      const result = store.upsertNote(
        { book: 'john', chapter: 3, startVerse: 16, endVerse: 16 },
        'Test body',
      )
      expect(result).toHaveProperty('id')
      expect(result).toHaveProperty('body', 'Test body')
    })
  })

  describe('updateNoteBody', () => {
    it('updates body and bumps updatedAt', async () => {
      const store = await loadStore()
      const note = store.upsertNote(
        { book: 'john', chapter: 3, startVerse: 16, endVerse: 16 },
        'Original',
      )
      const originalUpdatedAt = note.updatedAt

      store.updateNoteBody(note.id, 'Changed')
      const updated = store.getAllNotes().find((n) => n.id === note.id)!
      expect(updated.body).toBe('Changed')
      expect(updated.updatedAt).toBeGreaterThanOrEqual(originalUpdatedAt)
    })

    it('skips write when body unchanged', async () => {
      const store = await loadStore()
      const note = store.upsertNote(
        { book: 'john', chapter: 3, startVerse: 16, endVerse: 16 },
        'Same',
      )

      const listener = vi.fn()
      store.subscribe(listener)

      store.updateNoteBody(note.id, 'Same')
      expect(listener).not.toHaveBeenCalled()
    })

    it('no-ops for non-existent id', async () => {
      const store = await loadStore()
      store.upsertNote(
        { book: 'john', chapter: 3, startVerse: 16, endVerse: 16 },
        'Test',
      )

      // Should not throw
      store.updateNoteBody('nonexistent-id', 'new body')
      expect(store.getAllNotes()).toHaveLength(1)
    })
  })

  describe('deleteNote + restoreNote', () => {
    it('deleteNote removes note by id', async () => {
      const store = await loadStore()
      const note = store.upsertNote(
        { book: 'john', chapter: 3, startVerse: 16, endVerse: 16 },
        'Test',
      )

      store.deleteNote(note.id)
      expect(store.getAllNotes()).toHaveLength(0)
    })

    it('deleteNote no-ops for non-existent id', async () => {
      const store = await loadStore()
      store.upsertNote(
        { book: 'john', chapter: 3, startVerse: 16, endVerse: 16 },
        'Test',
      )

      store.deleteNote('nonexistent-id')
      expect(store.getAllNotes()).toHaveLength(1)
    })

    it('restoreNote re-inserts with original id and createdAt', async () => {
      const store = await loadStore()
      const note = store.upsertNote(
        { book: 'john', chapter: 3, startVerse: 16, endVerse: 16 },
        'Precious note',
      )
      const savedNote = { ...note }

      store.deleteNote(note.id)
      expect(store.getAllNotes()).toHaveLength(0)

      store.restoreNote(savedNote)
      const restored = store.getAllNotes()
      expect(restored).toHaveLength(1)
      expect(restored[0].id).toBe(savedNote.id)
      expect(restored[0].createdAt).toBe(savedNote.createdAt)
      expect(restored[0].body).toBe('Precious note')
    })

    it('restoreNote does not create duplicates', async () => {
      const store = await loadStore()
      const note = store.upsertNote(
        { book: 'john', chapter: 3, startVerse: 16, endVerse: 16 },
        'Test',
      )

      store.restoreNote(note)
      expect(store.getAllNotes()).toHaveLength(1)
    })
  })

  describe('subscribe', () => {
    it('callback fires on upsertNote', async () => {
      const store = await loadStore()
      const listener = vi.fn()
      store.subscribe(listener)

      store.upsertNote(
        { book: 'john', chapter: 3, startVerse: 16, endVerse: 16 },
        'Test',
      )
      expect(listener).toHaveBeenCalledTimes(1)
    })

    it('callback fires on deleteNote', async () => {
      const store = await loadStore()
      const note = store.upsertNote(
        { book: 'john', chapter: 3, startVerse: 16, endVerse: 16 },
        'Test',
      )

      const listener = vi.fn()
      store.subscribe(listener)

      store.deleteNote(note.id)
      expect(listener).toHaveBeenCalledTimes(1)
    })

    it('callback fires on updateNoteBody when body changed', async () => {
      const store = await loadStore()
      const note = store.upsertNote(
        { book: 'john', chapter: 3, startVerse: 16, endVerse: 16 },
        'Original',
      )

      const listener = vi.fn()
      store.subscribe(listener)

      store.updateNoteBody(note.id, 'Changed')
      expect(listener).toHaveBeenCalledTimes(1)
    })

    it('callback does NOT fire on updateNoteBody when body unchanged', async () => {
      const store = await loadStore()
      const note = store.upsertNote(
        { book: 'john', chapter: 3, startVerse: 16, endVerse: 16 },
        'Same',
      )

      const listener = vi.fn()
      store.subscribe(listener)

      store.updateNoteBody(note.id, 'Same')
      expect(listener).not.toHaveBeenCalled()
    })

    it('unsubscribe removes the listener', async () => {
      const store = await loadStore()
      const listener = vi.fn()
      const unsub = store.subscribe(listener)

      unsub()
      store.upsertNote(
        { book: 'john', chapter: 3, startVerse: 16, endVerse: 16 },
        'Test',
      )
      expect(listener).not.toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    it('QuotaExceededError on write throws NoteStorageFullError', async () => {
      const store = await loadStore()

      const original = Storage.prototype.setItem
      const quotaError = new Error('quota exceeded')
      quotaError.name = 'QuotaExceededError'
      Storage.prototype.setItem = function (key: string, ...rest: [string]) {
        if (key === BIBLE_NOTES_STORAGE_KEY) {
          throw quotaError
        }
        return original.call(this, key, ...rest)
      }

      try {
        expect(() =>
          store.upsertNote(
            { book: 'john', chapter: 3, startVerse: 1, endVerse: 1 },
            'Test',
          ),
        ).toThrow(store.NoteStorageFullError)
      } finally {
        Storage.prototype.setItem = original
      }
    })
  })

  describe('validation', () => {
    it('readFromStorage silently skips invalid records', async () => {
      const data = [
        { book: 'john' }, // missing most fields
        makeNote(),
      ]
      localStorage.setItem(BIBLE_NOTES_STORAGE_KEY, JSON.stringify(data))

      const store = await loadStore()
      expect(store.getAllNotes()).toHaveLength(1)
    })

    it('returns empty array when localStorage contains malformed JSON', async () => {
      localStorage.setItem(BIBLE_NOTES_STORAGE_KEY, 'not-valid-json!!!')

      const store = await loadStore()
      expect(store.getAllNotes()).toEqual([])
    })
  })
})
