import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  parseVerseContextFromUrl,
  formatReference,
  hydrateVerseContext,
} from '../verseContext'
import type { VerseContextPartial } from '@/types/daily-experience'

vi.mock('@/data/bible/index', () => ({
  loadChapterWeb: vi.fn(),
}))

import { loadChapterWeb } from '@/data/bible/index'

const mockLoadChapterWeb = vi.mocked(loadChapterWeb)

function makeParams(entries: Record<string, string>): URLSearchParams {
  return new URLSearchParams(entries)
}

describe('parseVerseContextFromUrl', () => {
  it('parses a valid single verse', () => {
    const params = makeParams({
      verseBook: 'john',
      verseChapter: '3',
      verseStart: '16',
      verseEnd: '16',
      src: 'bible',
    })
    const result = parseVerseContextFromUrl(params)
    expect(result).toEqual({
      book: 'john',
      chapter: 3,
      startVerse: 16,
      endVerse: 16,
      source: 'bible',
    })
  })

  it('parses a valid verse range', () => {
    const params = makeParams({
      verseBook: 'john',
      verseChapter: '3',
      verseStart: '16',
      verseEnd: '18',
      src: 'bible',
    })
    const result = parseVerseContextFromUrl(params)
    expect(result).toEqual({
      book: 'john',
      chapter: 3,
      startVerse: 16,
      endVerse: 18,
      source: 'bible',
    })
  })

  it('returns null for an invalid book slug', () => {
    const params = makeParams({
      verseBook: 'fakebook',
      verseChapter: '1',
      verseStart: '1',
      verseEnd: '1',
      src: 'bible',
    })
    expect(parseVerseContextFromUrl(params)).toBeNull()
  })

  it('returns null for an out-of-range chapter', () => {
    const params = makeParams({
      verseBook: 'john',
      verseChapter: '99',
      verseStart: '1',
      verseEnd: '1',
      src: 'bible',
    })
    expect(parseVerseContextFromUrl(params)).toBeNull()
  })

  it('returns null when verseEnd < verseStart', () => {
    const params = makeParams({
      verseBook: 'john',
      verseChapter: '3',
      verseStart: '18',
      verseEnd: '16',
      src: 'bible',
    })
    expect(parseVerseContextFromUrl(params)).toBeNull()
  })

  it('returns null when verseBook is missing', () => {
    const params = makeParams({
      verseChapter: '3',
      verseStart: '16',
      verseEnd: '16',
      src: 'bible',
    })
    expect(parseVerseContextFromUrl(params)).toBeNull()
  })

  it('returns null for malformed numbers', () => {
    const params = makeParams({
      verseBook: 'john',
      verseChapter: 'abc',
      verseStart: '16',
      verseEnd: '16',
      src: 'bible',
    })
    expect(parseVerseContextFromUrl(params)).toBeNull()
  })

  it('returns null when src is not "bible"', () => {
    const params = makeParams({
      verseBook: 'john',
      verseChapter: '3',
      verseStart: '16',
      verseEnd: '16',
    })
    expect(parseVerseContextFromUrl(params)).toBeNull()
  })

  it('parses a numbered book slug', () => {
    const params = makeParams({
      verseBook: '1-corinthians',
      verseChapter: '13',
      verseStart: '4',
      verseEnd: '4',
      src: 'bible',
    })
    const result = parseVerseContextFromUrl(params)
    expect(result).toEqual({
      book: '1-corinthians',
      chapter: 13,
      startVerse: 4,
      endVerse: 4,
      source: 'bible',
    })
  })

  it('returns null for a negative verse number', () => {
    const params = makeParams({
      verseBook: 'john',
      verseChapter: '3',
      verseStart: '-1',
      verseEnd: '5',
      src: 'bible',
    })
    expect(parseVerseContextFromUrl(params)).toBeNull()
  })
})

describe('formatReference', () => {
  it('formats a single verse reference', () => {
    expect(formatReference('John', 3, 16, 16)).toBe('John 3:16')
  })

  it('formats a verse range with en-dash', () => {
    expect(formatReference('John', 3, 16, 18)).toBe('John 3:16\u201318')
  })

  it('formats a numbered book reference', () => {
    expect(formatReference('1 Corinthians', 13, 4, 4)).toBe('1 Corinthians 13:4')
  })

  it('formats a multi-word book reference', () => {
    expect(formatReference('Song of Solomon', 2, 1, 1)).toBe('Song of Solomon 2:1')
  })
})

describe('hydrateVerseContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns a full context on successful hydration', async () => {
    mockLoadChapterWeb.mockResolvedValue({
      bookSlug: 'john',
      chapter: 3,
      verses: [
        { number: 15, text: 'that whoever believes...' },
        { number: 16, text: 'For God so loved the world...' },
        { number: 17, text: 'For God did not send his Son...' },
      ],
    })

    const partial: VerseContextPartial = {
      book: 'john',
      chapter: 3,
      startVerse: 16,
      endVerse: 16,
      source: 'bible',
    }

    const result = await hydrateVerseContext(partial)
    expect(result).toEqual({
      book: 'john',
      chapter: 3,
      startVerse: 16,
      endVerse: 16,
      source: 'bible',
      verses: [{ number: 16, text: 'For God so loved the world...' }],
      reference: 'John 3:16',
    })
  })

  it('returns null when loadChapterWeb returns null', async () => {
    mockLoadChapterWeb.mockResolvedValue(null)

    const partial: VerseContextPartial = {
      book: 'john',
      chapter: 3,
      startVerse: 16,
      endVerse: 16,
      source: 'bible',
    }

    expect(await hydrateVerseContext(partial)).toBeNull()
  })

  it('returns null when verse numbers are out of range', async () => {
    mockLoadChapterWeb.mockResolvedValue({
      bookSlug: 'john',
      chapter: 3,
      verses: [
        { number: 1, text: 'Now there was a man...' },
        { number: 2, text: 'The same came to him by night...' },
        { number: 3, text: 'Jesus answered...' },
      ],
    })

    const partial: VerseContextPartial = {
      book: 'john',
      chapter: 3,
      startVerse: 25,
      endVerse: 25,
      source: 'bible',
    }

    expect(await hydrateVerseContext(partial)).toBeNull()
  })

  it('returns all verses in a multi-verse range', async () => {
    mockLoadChapterWeb.mockResolvedValue({
      bookSlug: 'john',
      chapter: 3,
      verses: [
        { number: 15, text: 'verse 15 text' },
        { number: 16, text: 'verse 16 text' },
        { number: 17, text: 'verse 17 text' },
        { number: 18, text: 'verse 18 text' },
        { number: 19, text: 'verse 19 text' },
      ],
    })

    const partial: VerseContextPartial = {
      book: 'john',
      chapter: 3,
      startVerse: 16,
      endVerse: 18,
      source: 'bible',
    }

    const result = await hydrateVerseContext(partial)
    expect(result).toEqual({
      book: 'john',
      chapter: 3,
      startVerse: 16,
      endVerse: 18,
      source: 'bible',
      verses: [
        { number: 16, text: 'verse 16 text' },
        { number: 17, text: 'verse 17 text' },
        { number: 18, text: 'verse 18 text' },
      ],
      reference: 'John 3:16\u201318',
    })
  })

  it('returns null for an unknown book slug', async () => {
    const partial: VerseContextPartial = {
      book: 'fakebook',
      chapter: 1,
      startVerse: 1,
      endVerse: 1,
      source: 'bible',
    }

    // loadChapterWeb will return null for an unknown slug
    mockLoadChapterWeb.mockResolvedValue(null)

    expect(await hydrateVerseContext(partial)).toBeNull()
  })
})
