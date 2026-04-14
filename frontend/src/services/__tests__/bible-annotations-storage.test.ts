import { describe, it, expect, beforeEach } from 'vitest'
import {
  getRecentBibleAnnotations,
  formatVerseReference,
  getBookDisplayName,
} from '../bible-annotations-storage'
import { replaceAllHighlights } from '@/lib/bible/highlightStore'
import { replaceAllNotes } from '@/lib/bible/notes/store'
import type { Highlight, Note } from '@/types/bible'

function makeHighlight(overrides: Partial<Highlight> = {}): Highlight {
  return {
    id: crypto.randomUUID(),
    book: 'john',
    chapter: 3,
    startVerse: 16,
    endVerse: 16,
    color: 'peace',
    createdAt: new Date('2026-03-01T10:00:00.000Z').getTime(),
    updatedAt: new Date('2026-03-01T10:00:00.000Z').getTime(),
    ...overrides,
  }
}

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: 'note-1',
    book: 'psalms',
    chapter: 23,
    startVerse: 1,
    endVerse: 1,
    body: 'The Lord is my shepherd',
    createdAt: new Date('2026-03-02T10:00:00.000Z').getTime(),
    updatedAt: new Date('2026-03-02T10:00:00.000Z').getTime(),
    ...overrides,
  }
}

beforeEach(() => {
  localStorage.clear()
  // Reset store caches by replacing with empty arrays
  replaceAllHighlights([])
  replaceAllNotes([])
})

describe('getRecentBibleAnnotations', () => {
  it('returns empty array when no data', () => {
    expect(getRecentBibleAnnotations()).toEqual([])
  })

  it('combines and sorts highlights and notes by createdAt', () => {
    const highlights = [
      makeHighlight({ createdAt: new Date('2026-03-01T10:00:00.000Z').getTime(), updatedAt: new Date('2026-03-01T10:00:00.000Z').getTime() }),
      makeHighlight({ book: 'genesis', chapter: 1, startVerse: 1, endVerse: 1, createdAt: new Date('2026-03-05T10:00:00.000Z').getTime(), updatedAt: new Date('2026-03-05T10:00:00.000Z').getTime() }),
    ]
    const notes = [
      makeNote({ createdAt: new Date('2026-03-03T10:00:00.000Z').getTime(), updatedAt: new Date('2026-03-03T10:00:00.000Z').getTime() }),
    ]
    replaceAllHighlights(highlights)
    replaceAllNotes(notes)

    const result = getRecentBibleAnnotations(3)
    expect(result).toHaveLength(3)
    // Most recent first: genesis highlight (Mar 5), note (Mar 3), john highlight (Mar 1)
    expect(result[0].type).toBe('highlight')
    expect(result[0].book).toBe('genesis')
    expect(result[1].type).toBe('note')
    expect(result[2].type).toBe('highlight')
    expect(result[2].book).toBe('john')
  })

  it('limits to requested count', () => {
    const highlights = Array.from({ length: 5 }, (_, i) =>
      makeHighlight({
        id: `hl-${i}`,
        startVerse: i + 1,
        endVerse: i + 1,
        createdAt: new Date(`2026-03-0${i + 1}T10:00:00.000Z`).getTime(),
        updatedAt: new Date(`2026-03-0${i + 1}T10:00:00.000Z`).getTime(),
      }),
    )
    const notes = Array.from({ length: 3 }, (_, i) =>
      makeNote({
        id: `note-${i}`,
        startVerse: i + 1,
        endVerse: i + 1,
        createdAt: new Date(`2026-03-0${i + 6}T10:00:00.000Z`).getTime(),
        updatedAt: new Date(`2026-03-0${i + 6}T10:00:00.000Z`).getTime(),
      }),
    )
    replaceAllHighlights(highlights)
    replaceAllNotes(notes)

    const result = getRecentBibleAnnotations(3)
    expect(result).toHaveLength(3)
  })
})

describe('formatVerseReference', () => {
  it('produces correct string', () => {
    expect(formatVerseReference('john', 3, 16)).toBe('John 3:16')
  })
})

describe('getBookDisplayName', () => {
  it('falls back to slug for unknown books', () => {
    expect(getBookDisplayName('unknown-book')).toBe('unknown-book')
  })

  it('returns display name for known book', () => {
    expect(getBookDisplayName('genesis')).toBe('Genesis')
  })
})
