import { describe, it, expect } from 'vitest'
import {
  DEVOTIONAL_POOL,
  getTodaysDevotional,
  formatDevotionalDate,
} from '@/data/devotionals'
import type { DevotionalTheme } from '@/types/devotional'

const ALLOWED_THEMES: DevotionalTheme[] = [
  'trust',
  'gratitude',
  'forgiveness',
  'identity',
  'anxiety-and-peace',
  'faithfulness',
  'purpose',
  'hope',
  'healing',
  'community',
]

describe('DEVOTIONAL_POOL', () => {
  it('has exactly 30 entries', () => {
    expect(DEVOTIONAL_POOL).toHaveLength(30)
  })

  it('has unique dayIndex values 0-29', () => {
    const indices = DEVOTIONAL_POOL.map((d) => d.dayIndex)
    expect(new Set(indices).size).toBe(30)
    expect(Math.min(...indices)).toBe(0)
    expect(Math.max(...indices)).toBe(29)
  })

  it('each entry has a valid theme from allowed set', () => {
    DEVOTIONAL_POOL.forEach((d) => {
      expect(ALLOWED_THEMES).toContain(d.theme)
    })
  })

  it('theme distribution: 3 per theme', () => {
    const themeCounts = new Map<string, number>()
    DEVOTIONAL_POOL.forEach((d) => {
      themeCounts.set(d.theme, (themeCounts.get(d.theme) || 0) + 1)
    })
    ALLOWED_THEMES.forEach((theme) => {
      expect(themeCounts.get(theme)).toBe(3)
    })
  })

  it('no consecutive dayIndex values share a theme', () => {
    const sorted = [...DEVOTIONAL_POOL].sort((a, b) => a.dayIndex - b.dayIndex)
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i].theme).not.toBe(sorted[i - 1].theme)
    }
  })

  it('each passage has 2-6 verses', () => {
    DEVOTIONAL_POOL.forEach((d) => {
      expect(d.passage.verses.length).toBeGreaterThanOrEqual(2)
      expect(d.passage.verses.length).toBeLessThanOrEqual(6)
    })
  })

  it('each reflection has 3-5 paragraphs', () => {
    DEVOTIONAL_POOL.forEach((d) => {
      expect(d.reflection.length).toBeGreaterThanOrEqual(3)
      expect(d.reflection.length).toBeLessThanOrEqual(5)
    })
  })

  it('each reflectionQuestion starts with "Something to think about today:"', () => {
    DEVOTIONAL_POOL.forEach((d) => {
      expect(d.reflectionQuestion).toMatch(/^Something to think about today:/)
    })
  })

  it('all devotionals have required fields', () => {
    DEVOTIONAL_POOL.forEach((d) => {
      expect(d.id).toBeTruthy()
      expect(d.title).toBeTruthy()
      expect(d.theme).toBeTruthy()
      expect(d.quote.text).toBeTruthy()
      expect(d.quote.attribution).toBeTruthy()
      expect(d.passage.reference).toBeTruthy()
      expect(d.passage.verses.length).toBeGreaterThan(0)
      expect(d.reflection.length).toBeGreaterThan(0)
      expect(d.prayer).toBeTruthy()
      expect(d.reflectionQuestion).toBeTruthy()
    })
  })

  it('each passage has a valid reference format', () => {
    DEVOTIONAL_POOL.forEach((d) => {
      expect(d.passage.reference).toMatch(/^[A-Z0-9]/)
    })
  })
})

describe('getTodaysDevotional', () => {
  it('returns correct devotional for a known date', () => {
    const date = new Date(2026, 0, 1) // Jan 1, 2026 = day 1
    const result = getTodaysDevotional(date)
    const expectedIndex = 1 % 30
    expect(result.dayIndex).toBe(expectedIndex)
  })

  it('with dayOffset navigates correctly', () => {
    const date = new Date(2026, 0, 5) // Jan 5 = day 5
    const resultToday = getTodaysDevotional(date, 0)
    const resultYesterday = getTodaysDevotional(date, -1)
    // Day 5 and Day 4 should give different devotionals
    expect(resultToday.dayIndex).not.toBe(resultYesterday.dayIndex)
  })

  it('wraps via modulo correctly', () => {
    // Dec 31, 2026 = day 365 of 2026 → 365 % 30 = 5 → dayIndex 5
    const dec31 = new Date(2026, 11, 31)
    const result = getTodaysDevotional(dec31)
    expect(result.dayIndex).toBe(365 % 30) // 5
  })

  it('same date always returns same devotional (deterministic)', () => {
    const date = new Date(2026, 2, 20) // March 20
    const first = getTodaysDevotional(date)
    const second = getTodaysDevotional(date)
    expect(first.id).toBe(second.id)
  })
})

describe('formatDevotionalDate', () => {
  it('formats correctly for a known date', () => {
    const date = new Date(2026, 2, 20) // March 20, 2026 is a Friday
    const result = formatDevotionalDate(date)
    expect(result).toBe('Friday, March 20, 2026')
  })

  it('with offset returns the adjusted date', () => {
    const date = new Date(2026, 2, 20)
    const result = formatDevotionalDate(date, -1)
    expect(result).toBe('Thursday, March 19, 2026')
  })

  it('defaults to today when no date provided', () => {
    const result = formatDevotionalDate()
    expect(result).toBeTruthy()
    expect(typeof result).toBe('string')
  })
})
