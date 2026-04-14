import { describe, expect, it } from 'vitest'
import { selectVotdForDate, getDayOfYear } from '../votdSelector'
import votdList from '@/data/bible/votd/votd-list.json'

describe('votdSelector', () => {
  it('same date returns same entry', () => {
    const date = new Date('2026-04-09')
    const result1 = selectVotdForDate(date)
    const result2 = selectVotdForDate(date)
    expect(result1).toEqual(result2)
  })

  it('consecutive dates return different entries', () => {
    const jan1 = selectVotdForDate(new Date('2026-01-01'))
    const jan2 = selectVotdForDate(new Date('2026-01-02'))
    expect(jan1.ref).not.toBe(jan2.ref)
  })

  it('Jan 1 returns index 0', () => {
    const result = selectVotdForDate(new Date(2026, 0, 1))
    expect(result).toEqual(votdList[0])
  })

  it('Dec 31 non-leap year (day 365)', () => {
    const result = selectVotdForDate(new Date(2025, 11, 31))
    expect(result).toBeDefined()
    expect(result.ref).toBeTruthy()
    expect(typeof result.chapter).toBe('number')
  })

  it('Feb 29 leap year (day 60)', () => {
    const result = selectVotdForDate(new Date(2024, 1, 29))
    expect(result).toBeDefined()
    expect(result.ref).toBeTruthy()
  })

  it('Dec 31 leap year (day 366)', () => {
    const result = selectVotdForDate(new Date(2024, 11, 31))
    expect(result).toBeDefined()
    expect(result.ref).toBeTruthy()
    // Day 366 should map to index 365 (last entry)
    expect(result).toEqual(votdList[365])
  })

  it('returns VotdListEntry shape', () => {
    const result = selectVotdForDate(new Date('2026-06-15'))
    expect(result).toHaveProperty('ref')
    expect(result).toHaveProperty('book')
    expect(result).toHaveProperty('chapter')
    expect(result).toHaveProperty('startVerse')
    expect(result).toHaveProperty('endVerse')
    expect(result).toHaveProperty('theme')
    expect(typeof result.ref).toBe('string')
    expect(typeof result.book).toBe('string')
    expect(typeof result.chapter).toBe('number')
    expect(typeof result.startVerse).toBe('number')
    expect(typeof result.endVerse).toBe('number')
    expect(typeof result.theme).toBe('string')
  })

  it('does not include text field', () => {
    const result = selectVotdForDate(new Date('2026-03-15'))
    expect(result).not.toHaveProperty('text')
  })
})

describe('getDayOfYear', () => {
  // Use local-timezone dates to avoid UTC parsing issues
  it('Jan 1 returns 1', () => {
    expect(getDayOfYear(new Date(2026, 0, 1))).toBe(1)
  })

  it('Feb 1 returns 32', () => {
    expect(getDayOfYear(new Date(2026, 1, 1))).toBe(32)
  })

  it('Dec 31 non-leap year returns 365', () => {
    expect(getDayOfYear(new Date(2025, 11, 31))).toBe(365)
  })

  it('Dec 31 leap year returns 366', () => {
    expect(getDayOfYear(new Date(2024, 11, 31))).toBe(366)
  })

  it('Feb 29 leap year returns 60', () => {
    expect(getDayOfYear(new Date(2024, 1, 29))).toBe(60)
  })
})
