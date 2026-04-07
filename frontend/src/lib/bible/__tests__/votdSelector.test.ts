import { describe, expect, it } from 'vitest'
import { getTodaysBibleVotd } from '../votdSelector'
import votdData from '@/data/bible/votd.json'
import { BIBLE_BOOKS } from '@/constants/bible'

describe('votdSelector', () => {
  it('returns same verse for same date', () => {
    const date = new Date('2026-04-07')
    const result1 = getTodaysBibleVotd(date)
    const result2 = getTodaysBibleVotd(date)
    expect(result1).toEqual(result2)
  })

  it('returns different verse for different dates', () => {
    const jan1 = getTodaysBibleVotd(new Date('2026-01-01'))
    const jan2 = getTodaysBibleVotd(new Date('2026-01-02'))
    expect(jan1.reference).not.toBe(jan2.reference)
  })

  it('handles Dec 31 non-leap year', () => {
    const result = getTodaysBibleVotd(new Date('2025-12-31'))
    expect(result).toBeDefined()
    expect(result.reference).toBeTruthy()
    expect(result.text).toBeTruthy()
  })

  it('handles Feb 29 leap year', () => {
    const result = getTodaysBibleVotd(new Date('2024-02-29'))
    expect(result).toBeDefined()
    expect(result.reference).toBeTruthy()
    expect(result.text).toBeTruthy()
  })

  it('returns valid VotdEntry shape', () => {
    const result = getTodaysBibleVotd(new Date('2026-06-15'))
    expect(result).toHaveProperty('reference')
    expect(result).toHaveProperty('book')
    expect(result).toHaveProperty('chapter')
    expect(result).toHaveProperty('verse')
    expect(result).toHaveProperty('text')
    expect(typeof result.reference).toBe('string')
    expect(typeof result.book).toBe('string')
    expect(typeof result.chapter).toBe('number')
    expect(typeof result.verse).toBe('number')
    expect(typeof result.text).toBe('string')
  })

  it('votd.json has 366 entries', () => {
    expect(votdData).toHaveLength(366)
  })

  it('all book names match BIBLE_BOOKS', () => {
    const validNames = new Set(BIBLE_BOOKS.map((b) => b.name))
    for (const entry of votdData) {
      expect(validNames.has(entry.book)).toBe(true)
    }
  })
})
