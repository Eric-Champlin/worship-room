import { describe, expect, it } from 'vitest'

import { BIBLE_BOOKS } from '@/constants/bible'

import { parseReference } from '../reference-parser'

describe('parseReference — book + chapter + verse grammar', () => {
  it('parses "John 3:16" as book+chapter+verse', () => {
    expect(parseReference('John 3:16')).toEqual({
      book: 'john',
      chapter: 3,
      verse: 16,
    })
  })

  it('parses "John 3" as book+chapter (no verse)', () => {
    const result = parseReference('John 3')
    expect(result).toEqual({ book: 'john', chapter: 3 })
    expect(result?.verse).toBeUndefined()
  })

  it('parses "1 John 4:8" with numbered book and verse', () => {
    expect(parseReference('1 John 4:8')).toEqual({
      book: '1-john',
      chapter: 4,
      verse: 8,
    })
  })

  it('parses "Gen 1" via abbreviation', () => {
    expect(parseReference('Gen 1')).toEqual({
      book: 'genesis',
      chapter: 1,
    })
  })

  it('parses "Psalm 23" to slug psalms', () => {
    expect(parseReference('Psalm 23')).toEqual({
      book: 'psalms',
      chapter: 23,
    })
  })

  it('parses "Psalms 23" to slug psalms', () => {
    expect(parseReference('Psalms 23')).toEqual({
      book: 'psalms',
      chapter: 23,
    })
  })
})

describe('parseReference — case insensitivity', () => {
  it('parses "john 3:16" (lowercase)', () => {
    expect(parseReference('john 3:16')).toEqual({
      book: 'john',
      chapter: 3,
      verse: 16,
    })
  })

  it('parses "JOHN 3:16" (uppercase)', () => {
    expect(parseReference('JOHN 3:16')).toEqual({
      book: 'john',
      chapter: 3,
      verse: 16,
    })
  })

  it('parses "jOhN 3:16" (mixed case)', () => {
    expect(parseReference('jOhN 3:16')).toEqual({
      book: 'john',
      chapter: 3,
      verse: 16,
    })
  })
})

describe('parseReference — numbered books', () => {
  it('parses "1John 4" without space', () => {
    expect(parseReference('1John 4')).toEqual({
      book: '1-john',
      chapter: 4,
    })
  })

  it('parses "1 Jn 4:8" abbreviated with space', () => {
    expect(parseReference('1 Jn 4:8')).toEqual({
      book: '1-john',
      chapter: 4,
      verse: 8,
    })
  })

  it('parses "2 Chr 7:14" two-digit book and chapter', () => {
    expect(parseReference('2 Chr 7:14')).toEqual({
      book: '2-chronicles',
      chapter: 7,
      verse: 14,
    })
  })

  it('parses "2chr 7:14" without space between prefix and abbreviation', () => {
    expect(parseReference('2chr 7:14')).toEqual({
      book: '2-chronicles',
      chapter: 7,
      verse: 14,
    })
  })
})

describe('parseReference — Revelation and misspellings', () => {
  it('parses "Rev 22"', () => {
    expect(parseReference('Rev 22')).toEqual({
      book: 'revelation',
      chapter: 22,
    })
  })

  it('parses the common misspelling "Revelations 22"', () => {
    expect(parseReference('Revelations 22')).toEqual({
      book: 'revelation',
      chapter: 22,
    })
  })
})

describe('parseReference — verse ranges', () => {
  it('parses "John 3:16-18" with verseEnd', () => {
    expect(parseReference('John 3:16-18')).toEqual({
      book: 'john',
      chapter: 3,
      verse: 16,
      verseEnd: 18,
    })
  })
})

describe('parseReference — invalid inputs return null', () => {
  it('returns null for chapter out of range ("John 99" — John has 21 chapters)', () => {
    expect(parseReference('John 99')).toBeNull()
  })

  it('returns null for chapter 0', () => {
    expect(parseReference('John 0')).toBeNull()
  })

  it('returns null for unknown book', () => {
    expect(parseReference('NotABook 3')).toBeNull()
  })

  it('returns null for single word with no chapter', () => {
    expect(parseReference('love')).toBeNull()
  })

  it('returns null for book name alone ("John")', () => {
    expect(parseReference('John')).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(parseReference('')).toBeNull()
  })

  it('returns null for whitespace-only input', () => {
    expect(parseReference('   ')).toBeNull()
  })

  it('returns null for trailing garbage after a valid-looking reference', () => {
    expect(parseReference('John 3:16 hello')).toBeNull()
  })

  it('returns null for non-string input', () => {
    expect(parseReference(null as unknown as string)).toBeNull()
    expect(parseReference(undefined as unknown as string)).toBeNull()
    expect(parseReference(42 as unknown as string)).toBeNull()
  })
})

describe('parseReference — whitespace handling', () => {
  it('trims leading and trailing whitespace', () => {
    expect(parseReference('   John 3:16   ')).toEqual({
      book: 'john',
      chapter: 3,
      verse: 16,
    })
  })

  it('collapses internal whitespace ("John   3   :   16")', () => {
    expect(parseReference('John   3   :   16')).toEqual({
      book: 'john',
      chapter: 3,
      verse: 16,
    })
  })

  it('accepts whitespace as chapter→verse delimiter ("John 3 16")', () => {
    expect(parseReference('John 3 16')).toEqual({
      book: 'john',
      chapter: 3,
      verse: 16,
    })
  })
})

describe('parseReference — verse validation deferred', () => {
  it('returns a valid reference for out-of-bounds verse ("John 3:999")', () => {
    // Per Spec Requirement 6, verse count validation is explicit out-of-scope.
    // Navigation lands on the chapter; BibleReader silently no-ops the scroll.
    expect(parseReference('John 3:999')).toEqual({
      book: 'john',
      chapter: 3,
      verse: 999,
    })
  })
})

describe('parseReference — all 66 books resolve by full name', () => {
  it.each(BIBLE_BOOKS.map((book) => [book.name, book.slug]))(
    'resolves "%s" → slug "%s" chapter 1',
    (name, slug) => {
      const result = parseReference(`${name} 1`)
      expect(result).not.toBeNull()
      expect(result?.book).toBe(slug)
      expect(result?.chapter).toBe(1)
    },
  )
})

describe('parseReference — all 66 books resolve by lowercase full name', () => {
  it.each(BIBLE_BOOKS.map((book) => [book.name, book.slug]))(
    'resolves "%s" (lowercased) → slug "%s"',
    (name, slug) => {
      const result = parseReference(`${name.toLowerCase()} 1`)
      expect(result?.book).toBe(slug)
    },
  )
})

describe('parseReference — at least one abbreviation per book', () => {
  // Abbreviation coverage per book. One representative short form per slug.
  const ABBREVIATIONS: Record<string, string> = {
    genesis: 'Gen',
    exodus: 'Ex',
    leviticus: 'Lev',
    numbers: 'Num',
    deuteronomy: 'Deut',
    joshua: 'Josh',
    judges: 'Judg',
    ruth: 'Rut',
    '1-samuel': '1 Sam',
    '2-samuel': '2 Sam',
    '1-kings': '1 Kgs',
    '2-kings': '2 Kgs',
    '1-chronicles': '1 Chr',
    '2-chronicles': '2 Chr',
    ezra: 'Ezr',
    nehemiah: 'Neh',
    esther: 'Esth',
    job: 'Jb',
    psalms: 'Ps',
    proverbs: 'Prov',
    ecclesiastes: 'Eccl',
    'song-of-solomon': 'Song',
    isaiah: 'Isa',
    jeremiah: 'Jer',
    lamentations: 'Lam',
    ezekiel: 'Ezek',
    daniel: 'Dan',
    hosea: 'Hos',
    joel: 'Jl',
    amos: 'Am',
    obadiah: 'Obad',
    jonah: 'Jon',
    micah: 'Mic',
    nahum: 'Nah',
    habakkuk: 'Hab',
    zephaniah: 'Zeph',
    haggai: 'Hag',
    zechariah: 'Zech',
    malachi: 'Mal',
    matthew: 'Matt',
    mark: 'Mk',
    luke: 'Lk',
    john: 'Jn',
    acts: 'Ac',
    romans: 'Rom',
    '1-corinthians': '1 Cor',
    '2-corinthians': '2 Cor',
    galatians: 'Gal',
    ephesians: 'Eph',
    philippians: 'Phil',
    colossians: 'Col',
    '1-thessalonians': '1 Thess',
    '2-thessalonians': '2 Thess',
    '1-timothy': '1 Tim',
    '2-timothy': '2 Tim',
    titus: 'Tit',
    philemon: 'Phlm',
    hebrews: 'Heb',
    james: 'Jas',
    '1-peter': '1 Pet',
    '2-peter': '2 Pet',
    '1-john': '1 Jn',
    '2-john': '2 Jn',
    '3-john': '3 Jn',
    jude: 'Jud',
    revelation: 'Rev',
  }

  it.each(BIBLE_BOOKS.map((book) => [book.slug, ABBREVIATIONS[book.slug]!]))(
    'resolves abbreviation "%s" → slug "%s" (chapter 1)',
    (slug, abbrev) => {
      expect(abbrev, `no abbreviation configured for slug "${slug}"`).toBeDefined()
      const result = parseReference(`${abbrev} 1`)
      expect(result).not.toBeNull()
      expect(result?.book).toBe(slug)
    },
  )
})
