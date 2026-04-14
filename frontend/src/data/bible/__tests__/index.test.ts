import { describe, it, expect, vi, beforeEach } from 'vitest'
import { loadChapterWeb, getAdjacentChapter } from '../index'

// --- loadChapterWeb tests ---

describe('loadChapterWeb', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns correct data for john/3', async () => {
    const result = await loadChapterWeb('john', 3)
    expect(result).not.toBeNull()
    expect(result!.bookSlug).toBe('john')
    expect(result!.chapter).toBe(3)
    expect(result!.verses.length).toBe(36)
    expect(result!.paragraphs).toEqual([])
  })

  it('filters blank verses', async () => {
    // Luke 17:36 is a known WEB blank verse
    const result = await loadChapterWeb('luke', 17)
    expect(result).not.toBeNull()
    // All returned verses should have non-empty text
    for (const verse of result!.verses) {
      expect(verse.text.trim()).not.toBe('')
    }
    // If verse 36 exists in the raw data with empty text, it should be filtered
    const hasBlankVerse36 = result!.verses.some(
      (v) => v.number === 36 && v.text.trim() === '',
    )
    expect(hasBlankVerse36).toBe(false)
  })

  it('returns null for invalid book', async () => {
    const result = await loadChapterWeb('notabook', 1)
    expect(result).toBeNull()
  })

  it('returns null for invalid chapter', async () => {
    const result = await loadChapterWeb('john', 99)
    expect(result).toBeNull()
  })
})

// --- getAdjacentChapter tests ---

describe('getAdjacentChapter', () => {
  it('cross-book forward: matthew/28 next → mark/1', () => {
    const result = getAdjacentChapter('matthew', 28, 'next')
    expect(result).toEqual({
      bookSlug: 'mark',
      bookName: 'Mark',
      chapter: 1,
    })
  })

  it('cross-book backward: mark/1 prev → matthew/28', () => {
    const result = getAdjacentChapter('mark', 1, 'prev')
    expect(result).toEqual({
      bookSlug: 'matthew',
      bookName: 'Matthew',
      chapter: 28,
    })
  })

  it('genesis/1 prev is null', () => {
    const result = getAdjacentChapter('genesis', 1, 'prev')
    expect(result).toBeNull()
  })

  it('revelation/22 next is null', () => {
    const result = getAdjacentChapter('revelation', 22, 'next')
    expect(result).toBeNull()
  })

  it('same-book next: john/3 → john/4', () => {
    const result = getAdjacentChapter('john', 3, 'next')
    expect(result).toEqual({
      bookSlug: 'john',
      bookName: 'John',
      chapter: 4,
    })
  })

  it('same-book prev: john/3 → john/2', () => {
    const result = getAdjacentChapter('john', 3, 'prev')
    expect(result).toEqual({
      bookSlug: 'john',
      bookName: 'John',
      chapter: 2,
    })
  })

  it('returns null for invalid book slug', () => {
    const result = getAdjacentChapter('notabook', 1, 'next')
    expect(result).toBeNull()
  })
})
