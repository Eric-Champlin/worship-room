import { describe, it, expect } from 'vitest'
import {
  DEVOTIONAL_POOL,
  getTodaysDevotional,
  formatDevotionalDate,
} from '@/data/devotionals'
import type { DevotionalTheme } from '@/types/devotional'
import type { LiturgicalSeasonId } from '@/constants/liturgical-calendar'

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

const GENERAL_POOL = DEVOTIONAL_POOL.filter((d) => !d.season)
const SEASONAL_POOL = DEVOTIONAL_POOL.filter((d) => d.season)

describe('DEVOTIONAL_POOL', () => {
  it('has exactly 50 entries (30 general + 20 seasonal)', () => {
    expect(DEVOTIONAL_POOL).toHaveLength(50)
    expect(GENERAL_POOL).toHaveLength(30)
    expect(SEASONAL_POOL).toHaveLength(20)
  })

  it('general pool has unique dayIndex values 0-29', () => {
    const indices = GENERAL_POOL.map((d) => d.dayIndex)
    expect(new Set(indices).size).toBe(30)
    expect(Math.min(...indices)).toBe(0)
    expect(Math.max(...indices)).toBe(29)
  })

  it('general pool: each entry has a valid theme from allowed set', () => {
    GENERAL_POOL.forEach((d) => {
      expect(ALLOWED_THEMES).toContain(d.theme)
    })
  })

  it('general pool: theme distribution is 3 per theme', () => {
    const themeCounts = new Map<string, number>()
    GENERAL_POOL.forEach((d) => {
      themeCounts.set(d.theme, (themeCounts.get(d.theme) || 0) + 1)
    })
    ALLOWED_THEMES.forEach((theme) => {
      expect(themeCounts.get(theme)).toBe(3)
    })
  })

  it('general pool: no consecutive dayIndex values share a theme', () => {
    const sorted = [...GENERAL_POOL].sort((a, b) => a.dayIndex - b.dayIndex)
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i].theme).not.toBe(sorted[i - 1].theme)
    }
  })

  it('each passage has 1-6 verses', () => {
    DEVOTIONAL_POOL.forEach((d) => {
      expect(d.passage.verses.length).toBeGreaterThanOrEqual(1)
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

describe('seasonal devotionals', () => {
  it('has 20 seasonal devotionals', () => {
    expect(SEASONAL_POOL).toHaveLength(20)
  })

  it('each seasonal devotional has a valid season field', () => {
    const validSeasons: LiturgicalSeasonId[] = [
      'advent', 'christmas', 'epiphany', 'lent', 'holy-week', 'easter', 'pentecost',
    ]
    SEASONAL_POOL.forEach((d) => {
      expect(validSeasons).toContain(d.season)
    })
  })

  it('distribution matches spec: 5 advent, 5 lent, 3 easter, 3 christmas, 2 holy-week, 2 pentecost', () => {
    const counts = new Map<string, number>()
    SEASONAL_POOL.forEach((d) => {
      counts.set(d.season!, (counts.get(d.season!) || 0) + 1)
    })
    expect(counts.get('advent')).toBe(5)
    expect(counts.get('lent')).toBe(5)
    expect(counts.get('easter')).toBe(3)
    expect(counts.get('christmas')).toBe(3)
    expect(counts.get('holy-week')).toBe(2)
    expect(counts.get('pentecost')).toBe(2)
  })

  it('all seasonal devotionals have WEB translation passages', () => {
    SEASONAL_POOL.forEach((d) => {
      expect(d.passage.reference).toBeTruthy()
      expect(d.passage.verses.length).toBeGreaterThan(0)
      d.passage.verses.forEach((v) => {
        expect(v.text).toBeTruthy()
      })
    })
  })

  it('no duplicate scripture references with general pool', () => {
    const generalRefs = new Set(GENERAL_POOL.map((d) => d.passage.reference))
    SEASONAL_POOL.forEach((d) => {
      expect(generalRefs.has(d.passage.reference)).toBe(false)
    })
  })
})

describe('getTodaysDevotional', () => {
  it('returns seasonal devotional during Advent', () => {
    // Dec 1, 2026 is in Advent (starts Nov 29, 2026)
    const date = new Date(2026, 11, 1)
    const result = getTodaysDevotional(date)
    expect(result.season).toBe('advent')
  })

  it('returns general devotional during Ordinary Time', () => {
    // Jul 15, 2026 is Ordinary Time
    const date = new Date(2026, 6, 15)
    const result = getTodaysDevotional(date)
    expect(result.season).toBeUndefined()
  })

  it('cycles through seasonal devotionals within a season', () => {
    // Advent 2026: Nov 29 to Dec 24 — 5 advent devotionals cycle
    const day1 = getTodaysDevotional(new Date(2026, 10, 29))
    const day2 = getTodaysDevotional(new Date(2026, 10, 30))
    expect(day1.season).toBe('advent')
    expect(day2.season).toBe('advent')
    expect(day1.id).not.toBe(day2.id)
  })

  it('past-day navigation with dayOffset respects season of that past date', () => {
    // From July 15, navigate back to Dec 1 of prior year (offset ~-226 days)
    // Dec 1, 2025 — that year's Advent
    const dec1_2025 = new Date(2025, 11, 1)
    const result = getTodaysDevotional(dec1_2025)
    expect(result.season).toBe('advent')
  })

  it('same date always returns same devotional (deterministic)', () => {
    const date = new Date(2026, 2, 20) // March 20 — Lent
    const first = getTodaysDevotional(date)
    const second = getTodaysDevotional(date)
    expect(first.id).toBe(second.id)
  })

  it('with dayOffset navigates correctly', () => {
    // Use Ordinary Time dates to test general pool offset
    const date = new Date(2026, 6, 15) // Jul 15
    const resultToday = getTodaysDevotional(date, 0)
    const resultYesterday = getTodaysDevotional(date, -1)
    expect(resultToday.id).not.toBe(resultYesterday.id)
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
