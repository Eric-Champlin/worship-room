import { describe, expect, it } from 'vitest'
import { parseReferences } from '../referenceParser'

describe('referenceParser', () => {
  describe('positive cases', () => {
    it('parses "John 3:16" as single verse', () => {
      const refs = parseReferences('John 3:16')
      expect(refs).toHaveLength(1)
      expect(refs[0]).toMatchObject({
        text: 'John 3:16',
        bookSlug: 'john',
        bookName: 'John',
        chapter: 3,
        startVerse: 16,
        endVerse: undefined,
      })
      expect(refs[0].startIndex).toBe(0)
      expect(refs[0].endIndex).toBe(9)
    })

    it('parses "1 Corinthians 13:4-7" as verse range with hyphen', () => {
      const refs = parseReferences('1 Corinthians 13:4-7')
      expect(refs).toHaveLength(1)
      expect(refs[0]).toMatchObject({
        text: '1 Corinthians 13:4-7',
        bookSlug: '1-corinthians',
        bookName: '1 Corinthians',
        chapter: 13,
        startVerse: 4,
        endVerse: 7,
      })
    })

    it('parses "Rom 8:28" as abbreviation + single verse', () => {
      const refs = parseReferences('Rom 8:28')
      expect(refs).toHaveLength(1)
      expect(refs[0]).toMatchObject({
        bookSlug: 'romans',
        bookName: 'Romans',
        chapter: 8,
        startVerse: 28,
      })
    })

    it('parses "Philippians 4:6–7" as verse range with en-dash', () => {
      const refs = parseReferences('Philippians 4:6–7')
      expect(refs).toHaveLength(1)
      expect(refs[0]).toMatchObject({
        bookSlug: 'philippians',
        chapter: 4,
        startVerse: 6,
        endVerse: 7,
      })
    })

    it('parses "Psalm 23" as chapter-only reference', () => {
      const refs = parseReferences('Psalm 23')
      expect(refs).toHaveLength(1)
      expect(refs[0]).toMatchObject({
        bookSlug: 'psalms',
        bookName: 'Psalms',
        chapter: 23,
        startVerse: undefined,
      })
    })

    it('parses "1 John 4:8" as numbered book', () => {
      const refs = parseReferences('1 John 4:8')
      expect(refs).toHaveLength(1)
      expect(refs[0]).toMatchObject({
        bookSlug: '1-john',
        bookName: '1 John',
        chapter: 4,
        startVerse: 8,
      })
    })

    it('parses "2 Timothy 3:16" as numbered book', () => {
      const refs = parseReferences('2 Timothy 3:16')
      expect(refs).toHaveLength(1)
      expect(refs[0]).toMatchObject({
        bookSlug: '2-timothy',
        bookName: '2 Timothy',
        chapter: 3,
        startVerse: 16,
      })
    })

    it('parses multiple refs in one string', () => {
      const refs = parseReferences('see also Romans 8:28 and Psalm 23')
      expect(refs).toHaveLength(2)
      expect(refs[0].bookSlug).toBe('romans')
      expect(refs[1].bookSlug).toBe('psalms')
    })

    it('parses "Gen 1:1" as short abbreviation', () => {
      const refs = parseReferences('Gen 1:1')
      expect(refs).toHaveLength(1)
      expect(refs[0]).toMatchObject({
        bookSlug: 'genesis',
        bookName: 'Genesis',
        chapter: 1,
        startVerse: 1,
      })
    })
  })

  describe('negative cases', () => {
    it('does not match prose description "Genesis chapter 1 verse 1"', () => {
      // "Genesis" alone without a number pattern is not matched as a reference
      const refs = parseReferences('Genesis chapter 1 verse 1')
      // It may match "Genesis" with the following number, but "chapter" is not a valid pattern
      // The regex needs "BookName number:number" — "Genesis chapter" doesn't have digit right after book
      expect(refs).toHaveLength(0)
    })

    it('does not match time pattern "at 3:16pm"', () => {
      const refs = parseReferences('at 3:16pm')
      expect(refs).toHaveLength(0)
    })

    it('does not match time pattern "at 3:16 p.m."', () => {
      const refs = parseReferences('at 3:16 p.m.')
      expect(refs).toHaveLength(0)
    })

    it('does not match reference split across line break "John\\n3:16"', () => {
      const refs = parseReferences('John\n3:16')
      expect(refs).toHaveLength(0)
    })

    it('does not match bare number "He said 10:30 is too late"', () => {
      const refs = parseReferences('He said 10:30 is too late')
      expect(refs).toHaveLength(0)
    })
  })
})
