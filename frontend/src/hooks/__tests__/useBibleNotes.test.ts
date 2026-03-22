import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { BIBLE_NOTES_KEY, MAX_NOTES } from '@/constants/bible'

import { useBibleNotes } from '../useBibleNotes'

const mockAuth = {
  isAuthenticated: false,
  user: null,
  login: vi.fn(),
  logout: vi.fn(),
}

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockAuth,
}))

// Mock crypto.randomUUID for deterministic IDs
let uuidCounter = 0
vi.stubGlobal('crypto', {
  randomUUID: () => `test-uuid-${++uuidCounter}`,
})

describe('useBibleNotes', () => {
  beforeEach(() => {
    localStorage.clear()
    mockAuth.isAuthenticated = false
    uuidCounter = 0
  })

  it('returns empty notes when no data in localStorage', () => {
    const { result } = renderHook(() => useBibleNotes())
    expect(result.current.getAllNotes()).toEqual([])
  })

  it('creates note with UUID and stores in localStorage', () => {
    mockAuth.isAuthenticated = true
    const { result } = renderHook(() => useBibleNotes())

    let success = false
    act(() => {
      success = result.current.saveNote('genesis', 1, 1, 'My first note')
    })

    expect(success).toBe(true)
    const note = result.current.getNoteForVerse('genesis', 1, 1)
    expect(note).toBeDefined()
    expect(note!.id).toBe('test-uuid-1')
    expect(note!.text).toBe('My first note')
    expect(note!.book).toBe('genesis')
    expect(note!.chapter).toBe(1)
    expect(note!.verseNumber).toBe(1)
    expect(note!.createdAt).toBeTruthy()
    expect(note!.updatedAt).toBeTruthy()

    const stored = JSON.parse(localStorage.getItem(BIBLE_NOTES_KEY)!)
    expect(stored).toHaveLength(1)
  })

  it('updates text and updatedAt for existing verse note', () => {
    mockAuth.isAuthenticated = true
    const { result } = renderHook(() => useBibleNotes())

    act(() => {
      result.current.saveNote('genesis', 1, 1, 'Original note')
    })

    const original = result.current.getNoteForVerse('genesis', 1, 1)!
    const originalCreatedAt = original.createdAt

    // Small delay to ensure different timestamp
    act(() => {
      result.current.saveNote('genesis', 1, 1, 'Updated note')
    })

    const updated = result.current.getNoteForVerse('genesis', 1, 1)!
    expect(updated.text).toBe('Updated note')
    expect(updated.id).toBe(original.id) // Same ID
    expect(updated.createdAt).toBe(originalCreatedAt) // createdAt unchanged
    expect(result.current.getAllNotes()).toHaveLength(1) // No duplicate
  })

  it('returns false and does not add when max 200 limit reached', () => {
    mockAuth.isAuthenticated = true

    // Seed 200 notes
    const notes = Array.from({ length: MAX_NOTES }, (_, i) => ({
      id: `note-${i}`,
      book: 'genesis',
      chapter: Math.floor(i / 30) + 1,
      verseNumber: (i % 30) + 1,
      text: `Note ${i}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }))
    localStorage.setItem(BIBLE_NOTES_KEY, JSON.stringify(notes))

    const { result } = renderHook(() => useBibleNotes())
    expect(result.current.getAllNotes()).toHaveLength(MAX_NOTES)

    let success = true
    act(() => {
      success = result.current.saveNote('john', 1, 1, 'One more note')
    })

    expect(success).toBe(false)
    expect(result.current.getAllNotes()).toHaveLength(MAX_NOTES)
    expect(result.current.getNoteForVerse('john', 1, 1)).toBeUndefined()
  })

  it('allows editing existing note even at max limit', () => {
    mockAuth.isAuthenticated = true

    // Seed 200 notes with a known verse
    const notes = Array.from({ length: MAX_NOTES }, (_, i) => ({
      id: `note-${i}`,
      book: i === 0 ? 'john' : 'genesis',
      chapter: i === 0 ? 3 : Math.floor(i / 30) + 1,
      verseNumber: i === 0 ? 16 : (i % 30) + 1,
      text: `Note ${i}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }))
    localStorage.setItem(BIBLE_NOTES_KEY, JSON.stringify(notes))

    const { result } = renderHook(() => useBibleNotes())

    let success = false
    act(() => {
      success = result.current.saveNote('john', 3, 16, 'Edited note at limit')
    })

    expect(success).toBe(true)
    expect(result.current.getNoteForVerse('john', 3, 16)?.text).toBe('Edited note at limit')
    expect(result.current.getAllNotes()).toHaveLength(MAX_NOTES)
  })

  it('removes note from localStorage on delete', () => {
    mockAuth.isAuthenticated = true
    const { result } = renderHook(() => useBibleNotes())

    act(() => {
      result.current.saveNote('genesis', 1, 1, 'To be deleted')
    })

    const note = result.current.getNoteForVerse('genesis', 1, 1)!
    act(() => {
      result.current.deleteNote(note.id)
    })

    expect(result.current.getNoteForVerse('genesis', 1, 1)).toBeUndefined()
    expect(result.current.getAllNotes()).toHaveLength(0)

    const stored = JSON.parse(localStorage.getItem(BIBLE_NOTES_KEY)!)
    expect(stored).toHaveLength(0)
  })

  it('no-ops when not authenticated (saveNote)', () => {
    const { result } = renderHook(() => useBibleNotes())

    let success = false
    act(() => {
      success = result.current.saveNote('genesis', 1, 1, 'Test')
    })

    expect(success).toBe(false)
    expect(result.current.getAllNotes()).toHaveLength(0)
    expect(localStorage.getItem(BIBLE_NOTES_KEY)).toBeNull()
  })

  it('no-ops when not authenticated (deleteNote)', () => {
    // Seed a note
    localStorage.setItem(
      BIBLE_NOTES_KEY,
      JSON.stringify([
        {
          id: 'note-1',
          book: 'genesis',
          chapter: 1,
          verseNumber: 1,
          text: 'Seeded note',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]),
    )
    const { result } = renderHook(() => useBibleNotes())

    act(() => {
      result.current.deleteNote('note-1')
    })

    expect(result.current.getAllNotes()).toHaveLength(1)
  })

  it('returns empty array on corrupted JSON', () => {
    localStorage.setItem(BIBLE_NOTES_KEY, 'not valid json!!!')
    const { result } = renderHook(() => useBibleNotes())
    expect(result.current.getAllNotes()).toEqual([])
  })

  it('returns empty array on non-array JSON', () => {
    localStorage.setItem(BIBLE_NOTES_KEY, '{"foo": "bar"}')
    const { result } = renderHook(() => useBibleNotes())
    expect(result.current.getAllNotes()).toEqual([])
  })

  it('getNotesForChapter filters correctly', () => {
    mockAuth.isAuthenticated = true
    const { result } = renderHook(() => useBibleNotes())

    act(() => {
      result.current.saveNote('genesis', 1, 1, 'Note A')
      result.current.saveNote('genesis', 1, 5, 'Note B')
      result.current.saveNote('genesis', 2, 1, 'Note C')
      result.current.saveNote('john', 3, 16, 'Note D')
    })

    expect(result.current.getNotesForChapter('genesis', 1)).toHaveLength(2)
    expect(result.current.getNotesForChapter('genesis', 2)).toHaveLength(1)
    expect(result.current.getNotesForChapter('john', 3)).toHaveLength(1)
    expect(result.current.getNotesForChapter('exodus', 1)).toHaveLength(0)
  })

  it('persists across hook re-mounts', () => {
    mockAuth.isAuthenticated = true
    const { result, unmount } = renderHook(() => useBibleNotes())

    act(() => {
      result.current.saveNote('john', 3, 16, 'Persistent note')
    })
    unmount()

    const { result: r2 } = renderHook(() => useBibleNotes())
    expect(r2.current.getNoteForVerse('john', 3, 16)?.text).toBe('Persistent note')
  })
})
