import { describe, it, expect, beforeEach } from 'vitest'
import {
  getRecentBibleAnnotations,
  formatVerseReference,
  getBookDisplayName,
} from '../bible-annotations-storage'
import type { BibleHighlight, BibleNote } from '@/types/bible'

function makeHighlight(overrides: Partial<BibleHighlight> = {}): BibleHighlight {
  return {
    book: 'john',
    chapter: 3,
    verseNumber: 16,
    color: '#2DD4BF',
    createdAt: '2026-03-01T10:00:00.000Z',
    ...overrides,
  }
}

function makeNote(overrides: Partial<BibleNote> = {}): BibleNote {
  return {
    id: 'note-1',
    book: 'psalms',
    chapter: 23,
    verseNumber: 1,
    text: 'The Lord is my shepherd',
    createdAt: '2026-03-02T10:00:00.000Z',
    updatedAt: '2026-03-02T10:00:00.000Z',
    ...overrides,
  }
}

beforeEach(() => {
  localStorage.clear()
})

describe('getRecentBibleAnnotations', () => {
  it('returns empty array when no data', () => {
    expect(getRecentBibleAnnotations()).toEqual([])
  })

  it('combines and sorts highlights and notes by createdAt', () => {
    const highlights = [
      makeHighlight({ createdAt: '2026-03-01T10:00:00.000Z' }),
      makeHighlight({ book: 'genesis', chapter: 1, verseNumber: 1, createdAt: '2026-03-05T10:00:00.000Z' }),
    ]
    const notes = [
      makeNote({ createdAt: '2026-03-03T10:00:00.000Z' }),
    ]
    localStorage.setItem('wr_bible_highlights', JSON.stringify(highlights))
    localStorage.setItem('wr_bible_notes', JSON.stringify(notes))

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
      makeHighlight({ verseNumber: i + 1, createdAt: `2026-03-0${i + 1}T10:00:00.000Z` }),
    )
    const notes = Array.from({ length: 3 }, (_, i) =>
      makeNote({ id: `note-${i}`, verseNumber: i + 1, createdAt: `2026-03-0${i + 6}T10:00:00.000Z` }),
    )
    localStorage.setItem('wr_bible_highlights', JSON.stringify(highlights))
    localStorage.setItem('wr_bible_notes', JSON.stringify(notes))

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
