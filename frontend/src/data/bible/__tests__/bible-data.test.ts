import { describe, expect, it } from 'vitest'

import { BIBLE_BOOKS, BIBLE_CATEGORIES, BOOKS_WITH_FULL_TEXT, CATEGORY_LABELS } from '@/constants/bible'
import { getBibleGatewayUrl, getBookBySlug, getBooksByCategory, getBooksByTestament } from '@/data/bible'
import type { BibleCategory } from '@/types/bible'

describe('BIBLE_BOOKS', () => {
  it('has 66 entries', () => {
    expect(BIBLE_BOOKS).toHaveLength(66)
  })

  it('OT has 39 books', () => {
    const ot = BIBLE_BOOKS.filter((b) => b.testament === 'old')
    expect(ot).toHaveLength(39)
  })

  it('NT has 27 books', () => {
    const nt = BIBLE_BOOKS.filter((b) => b.testament === 'new')
    expect(nt).toHaveLength(27)
  })

  it('all 66 full-text books have hasFullText: true', () => {
    const fullTextBooks = BIBLE_BOOKS.filter((b) => b.hasFullText)
    expect(fullTextBooks).toHaveLength(66)
    for (const book of fullTextBooks) {
      expect(BOOKS_WITH_FULL_TEXT.has(book.slug)).toBe(true)
    }
  })

  it('all slugs are URL-safe (lowercase, hyphens, digits only)', () => {
    for (const book of BIBLE_BOOKS) {
      expect(book.slug).toMatch(/^[a-z0-9-]+$/)
    }
  })

  it('all slugs are unique', () => {
    const slugs = BIBLE_BOOKS.map((b) => b.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('every book has a valid category', () => {
    const validCategories = BIBLE_CATEGORIES.map((c) => c.key)
    for (const book of BIBLE_BOOKS) {
      expect(validCategories).toContain(book.category)
    }
  })

  it('every book has at least 1 chapter', () => {
    for (const book of BIBLE_BOOKS) {
      expect(book.chapters).toBeGreaterThanOrEqual(1)
    }
  })

  it('category groupings are complete (every category has books)', () => {
    for (const cat of BIBLE_CATEGORIES) {
      const books = BIBLE_BOOKS.filter((b) => b.category === cat.key)
      expect(books.length).toBeGreaterThan(0)
    }
  })
})

describe('BIBLE_CATEGORIES', () => {
  it('has 10 categories', () => {
    expect(BIBLE_CATEGORIES).toHaveLength(10)
  })

  it('5 OT categories and 5 NT categories', () => {
    const ot = BIBLE_CATEGORIES.filter((c) => c.testament === 'old')
    const nt = BIBLE_CATEGORIES.filter((c) => c.testament === 'new')
    expect(ot).toHaveLength(5)
    expect(nt).toHaveLength(5)
  })
})

describe('CATEGORY_LABELS', () => {
  it('has a label for every category', () => {
    for (const cat of BIBLE_CATEGORIES) {
      expect(CATEGORY_LABELS[cat.key as BibleCategory]).toBeDefined()
    }
  })
})

describe('getBookBySlug', () => {
  it('returns correct book for valid slug', () => {
    const genesis = getBookBySlug('genesis')
    expect(genesis).toBeDefined()
    expect(genesis?.name).toBe('Genesis')
    expect(genesis?.chapters).toBe(50)
  })

  it('returns undefined for invalid slug', () => {
    expect(getBookBySlug('not-a-book')).toBeUndefined()
  })

  it('finds books with numeric prefixes', () => {
    const book = getBookBySlug('1-corinthians')
    expect(book).toBeDefined()
    expect(book?.name).toBe('1 Corinthians')
  })
})

describe('getBooksByTestament', () => {
  it('returns 39 OT books', () => {
    expect(getBooksByTestament('old')).toHaveLength(39)
  })

  it('returns 27 NT books', () => {
    expect(getBooksByTestament('new')).toHaveLength(27)
  })
})

describe('getBooksByCategory', () => {
  it('returns correct books for pentateuch', () => {
    const books = getBooksByCategory('pentateuch')
    expect(books).toHaveLength(5)
    expect(books[0].name).toBe('Genesis')
  })

  it('returns correct books for gospels', () => {
    const books = getBooksByCategory('gospels')
    expect(books).toHaveLength(4)
    expect(books.map((b) => b.name)).toEqual(['Matthew', 'Mark', 'Luke', 'John'])
  })
})

describe('getBibleGatewayUrl', () => {
  it('formats URL correctly for simple book name', () => {
    const url = getBibleGatewayUrl('Genesis', 1)
    expect(url).toBe('https://www.biblegateway.com/passage/?search=Genesis+1&version=WEB')
  })

  it('encodes spaces in book names', () => {
    const url = getBibleGatewayUrl('1 Corinthians', 13)
    expect(url).toBe(
      'https://www.biblegateway.com/passage/?search=1%20Corinthians+13&version=WEB',
    )
  })

  it('handles Song of Solomon', () => {
    const url = getBibleGatewayUrl('Song of Solomon', 2)
    expect(url).toContain('Song%20of%20Solomon')
    expect(url).toContain('version=WEB')
  })
})
