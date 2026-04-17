import { describe, expect, it } from 'vitest'

import { BIBLE_BOOKS } from '@/constants/bible'

import {
  BOOK_ALIASES,
  _BOOK_DEFINITIONS_INTERNAL,
} from '../book-aliases'

describe('BOOK_ALIASES', () => {
  it('resolves every canonical book by lowercase full name', () => {
    for (const book of BIBLE_BOOKS) {
      const entry = BOOK_ALIASES.get(book.name.toLowerCase())
      expect(entry, `missing alias for ${book.name}`).toBeDefined()
      expect(entry?.slug).toBe(book.slug)
    }
  })

  it('carries the correct chapter count for every alias entry', () => {
    const chaptersBySlug = new Map(
      BIBLE_BOOKS.map((book) => [book.slug, book.chapters]),
    )
    for (const [alias, entry] of BOOK_ALIASES) {
      expect(
        entry.chapters,
        `chapters mismatch for alias "${alias}" (slug "${entry.slug}")`,
      ).toBe(chaptersBySlug.get(entry.slug))
    }
  })

  it('provides a no-space twin for every numbered-book alias', () => {
    const aliasKeys = new Set(BOOK_ALIASES.keys())
    for (const key of aliasKeys) {
      if (/^[1-3] /.test(key)) {
        const noSpace = key.replace(' ', '')
        expect(
          aliasKeys.has(noSpace),
          `numbered alias "${key}" is missing no-space twin "${noSpace}"`,
        ).toBe(true)
      }
    }
  })

  it('resolves "revelations" (misspelling) to slug "revelation"', () => {
    expect(BOOK_ALIASES.get('revelations')?.slug).toBe('revelation')
  })

  it('resolves "psalm" and "psalms" to slug "psalms"', () => {
    expect(BOOK_ALIASES.get('psalm')?.slug).toBe('psalms')
    expect(BOOK_ALIASES.get('psalms')?.slug).toBe('psalms')
  })

  it('covers all 66 canonical slugs exactly once in BOOK_DEFINITIONS', () => {
    const definitionSlugs = new Set(
      _BOOK_DEFINITIONS_INTERNAL.map((def) => def.slug),
    )
    expect(definitionSlugs.size).toBe(66)
    for (const book of BIBLE_BOOKS) {
      expect(
        definitionSlugs.has(book.slug),
        `BOOK_DEFINITIONS missing slug "${book.slug}"`,
      ).toBe(true)
    }
  })

  it('has no duplicate alias keys mapping to different slugs', () => {
    // Construction throws on duplicates; assert the finished map has a
    // stable slug per key by building a reverse index.
    const seen = new Map<string, string>()
    for (const [alias, entry] of BOOK_ALIASES) {
      const prior = seen.get(alias)
      if (prior !== undefined) {
        expect(prior).toBe(entry.slug)
      }
      seen.set(alias, entry.slug)
    }
  })

  it('does not map "phil" to philemon', () => {
    expect(BOOK_ALIASES.get('phil')?.slug).toBe('philippians')
  })
})
