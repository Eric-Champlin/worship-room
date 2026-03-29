import { describe, it, expect } from 'vitest'
import {
  VERSE_OF_THE_DAY_POOL,
  getTodaysVerse,
  type VerseOfTheDay,
} from '../verse-of-the-day'

// References that already exist elsewhere in the codebase — must not appear in pool
const EXISTING_CODEBASE_REFERENCES = [
  // DAILY_VERSES (30)
  'Philippians 4:6-7', 'Jeremiah 29:11', 'Psalm 147:3', 'Matthew 11:28-30',
  'Psalm 107:1', 'Isaiah 40:31', 'Proverbs 3:5-6', 'Psalm 34:18',
  'Nehemiah 8:10', 'Colossians 3:13', 'Isaiah 26:3', 'Romans 15:13',
  'Isaiah 53:5', '1 Peter 5:7', '1 Thessalonians 5:18', 'Philippians 4:13',
  'Psalm 56:3-4', 'Revelation 21:4', 'Psalm 16:11', 'Ephesians 4:32',
  'John 14:27', 'Romans 8:28', 'James 5:15', 'Psalm 94:19',
  'Psalm 100:4', 'Deuteronomy 31:6', 'Psalm 37:5', 'Psalm 73:26',
  'Romans 12:12', 'Matthew 6:14',
  // BREATHING_VERSES (20)
  'Psalm 46:10', 'Psalm 23:2-3', 'Matthew 11:28', 'Psalm 4:8',
  'Psalm 62:1', 'Isaiah 41:10', 'Psalm 91:1-2', 'Psalm 119:165',
  'Philippians 4:7', 'Psalm 55:22', 'Numbers 6:24-26', 'Psalm 27:1',
  'Psalm 46:1', 'Psalm 29:11', 'Romans 8:26', 'Psalm 131:2', 'Exodus 14:14',
  // SOAKING_VERSES (20)
  'Psalm 139:13-14', '1 John 3:1', 'Romans 8:38-39', 'Ephesians 2:10',
  'Zephaniah 3:17', 'Isaiah 43:1', 'Lamentations 3:22-23', '2 Corinthians 5:17',
  'Psalm 139:7-10', 'Isaiah 40:28-29', 'Psalm 103:11-12', 'Ephesians 3:17-19',
  'Psalm 121:1-2', 'Galatians 2:20', 'Psalm 19:14', 'Deuteronomy 7:9',
  'Isaiah 49:15-16', 'Joshua 1:9',
  // GRATITUDE_VERSES (4)
  'Colossians 3:15', 'Psalm 136:1',
  // ACTS_STEPS (4)
  'Psalm 145:3', '1 John 1:9', 'Philippians 4:6',
  // MOOD CHECK-IN (5)
  'Psalm 118:24',
]

const VALID_THEMES: VerseOfTheDay['theme'][] = [
  'hope', 'comfort', 'strength', 'praise', 'trust', 'peace',
]

describe('VERSE_OF_THE_DAY_POOL', () => {
  it('has exactly 70 entries', () => {
    expect(VERSE_OF_THE_DAY_POOL).toHaveLength(70)
  })

  it('each entry has text, reference, and theme', () => {
    for (const verse of VERSE_OF_THE_DAY_POOL) {
      expect(verse.text).toBeTruthy()
      expect(typeof verse.text).toBe('string')
      expect(verse.reference).toBeTruthy()
      expect(typeof verse.reference).toBe('string')
      expect(VALID_THEMES).toContain(verse.theme)
    }
  })

  it('new verses (after first 30) have at least 5 per theme', () => {
    const newVerses = VERSE_OF_THE_DAY_POOL.slice(30)
    expect(newVerses).toHaveLength(40)

    const counts: Record<string, number> = {}
    for (const verse of newVerses) {
      counts[verse.theme] = (counts[verse.theme] || 0) + 1
    }

    for (const theme of VALID_THEMES) {
      expect(counts[theme]).toBeGreaterThanOrEqual(5)
    }
  })

  it('has no duplicate references within the pool', () => {
    const references = VERSE_OF_THE_DAY_POOL.map((v) => v.reference)
    const uniqueRefs = new Set(references)
    expect(uniqueRefs.size).toBe(references.length)
  })

  it('new verses (after first 30) do not collide with existing codebase references', () => {
    const newVerses = VERSE_OF_THE_DAY_POOL.slice(30)
    const existingSet = new Set(EXISTING_CODEBASE_REFERENCES)

    for (const verse of newVerses) {
      expect(existingSet.has(verse.reference)).toBe(false)
    }
  })
})

describe('getTodaysVerse', () => {
  it('returns the same verse for the same date', () => {
    const date = new Date(2026, 2, 20) // March 20, 2026
    const verse1 = getTodaysVerse(date)
    const verse2 = getTodaysVerse(date)
    expect(verse1).toBe(verse2)
  })

  it('returns different verses for adjacent days', () => {
    const day1 = new Date(2026, 2, 20)
    const day2 = new Date(2026, 2, 21)
    const verse1 = getTodaysVerse(day1)
    const verse2 = getTodaysVerse(day2)
    expect(verse1).not.toBe(verse2)
  })

  it('wraps correctly for day 365', () => {
    const dec31 = new Date(2026, 11, 31) // Dec 31, 2026 (non-leap year)
    const verse = getTodaysVerse(dec31)
    expect(verse).toBeDefined()
    expect(verse.text).toBeTruthy()
    expect(verse.reference).toBeTruthy()
  })

  it('wraps correctly for day 366 (leap year)', () => {
    const dec31leap = new Date(2028, 11, 31) // Dec 31, 2028 (leap year)
    const verse = getTodaysVerse(dec31leap)
    expect(verse).toBeDefined()
    expect(verse.text).toBeTruthy()
    expect(verse.reference).toBeTruthy()
  })

  it('uses local date, not UTC', () => {
    // Create a date at 11:30 PM local time — should use the local day
    const lateNight = new Date(2026, 2, 20, 23, 30, 0)
    const verse = getTodaysVerse(lateNight)

    // Create a date at 12:30 AM next day — should use the next local day
    const earlyMorning = new Date(2026, 2, 21, 0, 30, 0)
    const nextVerse = getTodaysVerse(earlyMorning)

    // They should be different because they are different local days
    expect(verse).not.toBe(nextVerse)
  })

  it('defaults to current date when no argument provided', () => {
    const verse = getTodaysVerse()
    expect(verse).toBeDefined()
    expect(VALID_THEMES).toContain(verse.theme)
  })
})

describe('seasonal verse tagging', () => {
  it('pool still has exactly 70 entries', () => {
    expect(VERSE_OF_THE_DAY_POOL).toHaveLength(70)
  })

  it('30 verses have a season field', () => {
    const tagged = VERSE_OF_THE_DAY_POOL.filter((v) => v.season)
    expect(tagged).toHaveLength(30)
  })

  it('distribution: 5 advent, 15 lent, 4 easter, 3 christmas, 2 holy-week, 1 pentecost', () => {
    const counts = new Map<string, number>()
    VERSE_OF_THE_DAY_POOL.forEach((v) => {
      if (v.season) {
        counts.set(v.season, (counts.get(v.season) || 0) + 1)
      }
    })
    expect(counts.get('advent')).toBe(5)
    expect(counts.get('lent')).toBe(15)
    expect(counts.get('easter')).toBe(4)
    expect(counts.get('christmas')).toBe(3)
    expect(counts.get('holy-week')).toBe(2)
    expect(counts.get('pentecost')).toBe(1)
  })

  it('getTodaysVerse returns seasonal verse during Lent', () => {
    // March 1, 2026 is in Lent (Ash Wed = Feb 18, Palm Sunday = March 29)
    const lentDate = new Date(2026, 2, 1)
    const verse = getTodaysVerse(lentDate)
    expect(verse.season).toBe('lent')
  })

  it('getTodaysVerse returns verse during Ordinary Time (no seasonal filter)', () => {
    // July 15, 2026 is Ordinary Time
    const ordinaryDate = new Date(2026, 6, 15)
    const verse = getTodaysVerse(ordinaryDate)
    expect(verse).toBeDefined()
    expect(verse.text).toBeTruthy()
  })

  it('seasonal verses cycle within season', () => {
    // Two different Lent days should potentially give different verses
    const day1 = new Date(2026, 2, 1)
    const day2 = new Date(2026, 2, 2)
    const verse1 = getTodaysVerse(day1)
    const verse2 = getTodaysVerse(day2)
    expect(verse1.season).toBe('lent')
    expect(verse2.season).toBe('lent')
    // With 5 lent verses, adjacent days should differ
    expect(verse1.reference).not.toBe(verse2.reference)
  })
})
