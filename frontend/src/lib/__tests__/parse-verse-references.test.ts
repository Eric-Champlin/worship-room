import { describe, it, expect } from 'vitest'
import { parseVerseReferences } from '../parse-verse-references'
import { ASK_RESPONSES } from '@/mocks/ask-mock-data'

describe('parseVerseReferences', () => {
  it('parses "Romans 8:28" correctly', () => {
    const results = parseVerseReferences('As Paul writes in Romans 8:28, God works...')
    expect(results).toHaveLength(1)
    expect(results[0]).toMatchObject({
      raw: 'Romans 8:28',
      book: 'Romans',
      bookSlug: 'romans',
      chapter: 8,
      verseStart: 28,
      verseEnd: undefined,
    })
  })

  it('parses "1 Corinthians 13:4-5" correctly', () => {
    const results = parseVerseReferences('Love is patient (1 Corinthians 13:4-5)')
    expect(results).toHaveLength(1)
    expect(results[0]).toMatchObject({
      raw: '1 Corinthians 13:4-5',
      book: '1 Corinthians',
      bookSlug: '1-corinthians',
      chapter: 13,
      verseStart: 4,
      verseEnd: 5,
    })
  })

  it('parses "Psalm 34:18" with singular alias → slug "psalms"', () => {
    const results = parseVerseReferences('Psalm 34:18 says...')
    expect(results).toHaveLength(1)
    expect(results[0]).toMatchObject({
      raw: 'Psalm 34:18',
      book: 'Psalms',
      bookSlug: 'psalms',
      chapter: 34,
      verseStart: 18,
    })
  })

  it('parses "2 Corinthians 1:3-4" correctly', () => {
    const results = parseVerseReferences('In 2 Corinthians 1:3-4, Paul writes...')
    expect(results).toHaveLength(1)
    expect(results[0]).toMatchObject({
      raw: '2 Corinthians 1:3-4',
      book: '2 Corinthians',
      bookSlug: '2-corinthians',
      chapter: 1,
      verseStart: 3,
      verseEnd: 4,
    })
  })

  it('returns empty array for text with no references', () => {
    const results = parseVerseReferences('This is a plain text with no Bible references.')
    expect(results).toHaveLength(0)
  })

  it('does not match partial words (e.g., "Romans" in "Romanticism")', () => {
    // "Romanticism" doesn't have the pattern BookName + space + chapter:verse
    const results = parseVerseReferences('Romanticism was a movement in art.')
    expect(results).toHaveLength(0)
  })

  it('handles multiple references in one text block', () => {
    const text =
      'Read Romans 8:28 and also Psalm 23:1. Then check out Philippians 4:6-7 for more.'
    const results = parseVerseReferences(text)
    expect(results).toHaveLength(3)
    expect(results[0].raw).toBe('Romans 8:28')
    expect(results[1].raw).toBe('Psalm 23:1')
    expect(results[2].raw).toBe('Philippians 4:6-7')
    // Verify indices are sequential
    expect(results[0].startIndex).toBeLessThan(results[1].startIndex)
    expect(results[1].startIndex).toBeLessThan(results[2].startIndex)
  })

  it('handles "Song of Solomon 1:1" (multi-word book)', () => {
    const results = parseVerseReferences('As in Song of Solomon 1:1, love is...')
    expect(results).toHaveLength(1)
    expect(results[0]).toMatchObject({
      raw: 'Song of Solomon 1:1',
      book: 'Song of Solomon',
      bookSlug: 'song-of-solomon',
      chapter: 1,
      verseStart: 1,
    })
  })

  it('handles "John 11:25-26" (reference from mock data)', () => {
    const results = parseVerseReferences(
      'Jesus said in John 11:25-26, "I am the resurrection"',
    )
    expect(results).toHaveLength(1)
    expect(results[0]).toMatchObject({
      raw: 'John 11:25-26',
      book: 'John',
      bookSlug: 'john',
      chapter: 11,
      verseStart: 25,
      verseEnd: 26,
    })
  })

  it('all references in mock response bank are parseable', () => {
    for (const [id, response] of Object.entries(ASK_RESPONSES)) {
      // Parse from answer text
      const answerRefs = parseVerseReferences(response.answer)

      // Parse from verse reference fields
      for (const verse of response.verses) {
        const verseRefs = parseVerseReferences(verse.reference)
        expect(
          verseRefs.length,
          `Response "${id}", verse "${verse.reference}" should be parseable`,
        ).toBeGreaterThanOrEqual(1)
      }

      // Some responses reference verses inline in answer text
      // We just verify no errors are thrown (coverage, not exhaustive matching)
      expect(answerRefs).toBeDefined()
    }
  })

  it('recognizes all 66 canonical book names', () => {
    const bookNames = [
      'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy',
      'Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel',
      '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles',
      'Ezra', 'Nehemiah', 'Esther', 'Job', 'Psalms', 'Proverbs',
      'Ecclesiastes', 'Song of Solomon', 'Isaiah', 'Jeremiah',
      'Lamentations', 'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos',
      'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk', 'Zephaniah',
      'Haggai', 'Zechariah', 'Malachi',
      'Matthew', 'Mark', 'Luke', 'John', 'Acts',
      'Romans', '1 Corinthians', '2 Corinthians', 'Galatians',
      'Ephesians', 'Philippians', 'Colossians',
      '1 Thessalonians', '2 Thessalonians', '1 Timothy', '2 Timothy',
      'Titus', 'Philemon', 'Hebrews', 'James',
      '1 Peter', '2 Peter', '1 John', '2 John', '3 John',
      'Jude', 'Revelation',
    ]

    for (const name of bookNames) {
      const text = `${name} 1:1`
      const refs = parseVerseReferences(text)
      expect(refs.length, `"${name} 1:1" should parse`).toBe(1)
      expect(refs[0].book).toBe(name)
    }
  })

  it('"Psalm" singular alias maps to "psalms" slug', () => {
    const results = parseVerseReferences('Psalm 23:1')
    expect(results[0].bookSlug).toBe('psalms')
    expect(results[0].book).toBe('Psalms')
  })

  it('returns correct start and end indices', () => {
    const text = 'See Romans 8:28 for more'
    const results = parseVerseReferences(text)
    expect(results).toHaveLength(1)
    expect(text.substring(results[0].startIndex, results[0].endIndex)).toBe('Romans 8:28')
  })

  it('does not match "1 John" when "John" would also match — prefers longer match', () => {
    const results = parseVerseReferences('In 1 John 3:1 we read...')
    expect(results).toHaveLength(1)
    expect(results[0].book).toBe('1 John')
    expect(results[0].bookSlug).toBe('1-john')
  })
})
