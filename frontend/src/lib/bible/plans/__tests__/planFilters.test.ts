import { describe, expect, it } from 'vitest'

import type { PlanMetadata, PlanProgress } from '@/types/bible-plans'

import {
  filterPlans,
  matchesDuration,
  parseDurationParam,
  parseThemeParam,
  splitIntoSections,
} from '../planFilters'

const COMFORT_SHORT: PlanMetadata = {
  slug: 'comfort-short',
  title: 'Comfort Short',
  shortTitle: 'CS',
  description: 'A short comfort plan',
  theme: 'comfort',
  duration: 7,
  estimatedMinutesPerDay: 10,
  curator: 'Test',
  coverGradient: 'from-primary/30 to-hero-dark',
}

const COMFORT_MEDIUM: PlanMetadata = {
  slug: 'comfort-medium',
  title: 'Comfort Medium',
  shortTitle: 'CM',
  description: 'A medium comfort plan',
  theme: 'comfort',
  duration: 14,
  estimatedMinutesPerDay: 10,
  curator: 'Test',
  coverGradient: 'from-primary/30 to-hero-dark',
}

const PRAYER_LONG: PlanMetadata = {
  slug: 'prayer-long',
  title: 'Prayer Long',
  shortTitle: 'PL',
  description: 'A long prayer plan',
  theme: 'prayer',
  duration: 28,
  estimatedMinutesPerDay: 15,
  curator: 'Test',
  coverGradient: 'from-blue-500/30 to-hero-dark',
}

const WISDOM_SHORT: PlanMetadata = {
  slug: 'wisdom-short',
  title: 'Wisdom Short',
  shortTitle: 'WS',
  description: 'A short wisdom plan',
  theme: 'wisdom',
  duration: 5,
  estimatedMinutesPerDay: 10,
  curator: 'Test',
  coverGradient: 'from-yellow-500/30 to-hero-dark',
}

const ALL_PLANS: PlanMetadata[] = [COMFORT_SHORT, COMFORT_MEDIUM, PRAYER_LONG, WISDOM_SHORT]

function makeProgress(slug: string, overrides: Partial<PlanProgress> = {}): PlanProgress {
  return {
    slug,
    startedAt: '2026-01-01',
    currentDay: 1,
    completedDays: [],
    completedAt: null,
    pausedAt: null,
    resumeFromDay: null,
    reflection: null,
    celebrationShown: false,
    ...overrides,
  }
}

describe('matchesDuration', () => {
  it('returns true for any filter', () => {
    expect(matchesDuration(1, 'any')).toBe(true)
    expect(matchesDuration(100, 'any')).toBe(true)
  })

  it('boundary: 7 is short, 8 is not short', () => {
    expect(matchesDuration(7, 'short')).toBe(true)
    expect(matchesDuration(8, 'short')).toBe(false)
  })

  it('boundary: 8 and 21 are medium, 7 and 22 are not', () => {
    expect(matchesDuration(8, 'medium')).toBe(true)
    expect(matchesDuration(21, 'medium')).toBe(true)
    expect(matchesDuration(7, 'medium')).toBe(false)
    expect(matchesDuration(22, 'medium')).toBe(false)
  })

  it('boundary: 22 is long, 21 is not', () => {
    expect(matchesDuration(22, 'long')).toBe(true)
    expect(matchesDuration(21, 'long')).toBe(false)
  })
})

describe('parseThemeParam', () => {
  it('returns valid theme for known value', () => {
    expect(parseThemeParam('comfort')).toBe('comfort')
    expect(parseThemeParam('prayer')).toBe('prayer')
  })

  it('returns all for invalid value', () => {
    expect(parseThemeParam('badvalue')).toBe('all')
  })

  it('returns all for null', () => {
    expect(parseThemeParam(null)).toBe('all')
  })
})

describe('parseDurationParam', () => {
  it('returns valid duration for known value', () => {
    expect(parseDurationParam('short')).toBe('short')
    expect(parseDurationParam('long')).toBe('long')
  })

  it('returns any for invalid value', () => {
    expect(parseDurationParam('badvalue')).toBe('any')
  })
})

describe('filterPlans', () => {
  it('no filter returns all plans', () => {
    const result = filterPlans(ALL_PLANS, 'all', 'any')
    expect(result).toHaveLength(4)
  })

  it('theme only filters by theme', () => {
    const result = filterPlans(ALL_PLANS, 'comfort', 'any')
    expect(result).toHaveLength(2)
    expect(result.every((p) => p.theme === 'comfort')).toBe(true)
  })

  it('duration only filters by duration', () => {
    const result = filterPlans(ALL_PLANS, 'all', 'short')
    expect(result).toHaveLength(2)
    expect(result.every((p) => p.duration <= 7)).toBe(true)
  })

  it('both filters return intersection', () => {
    const result = filterPlans(ALL_PLANS, 'comfort', 'medium')
    expect(result).toHaveLength(1)
    expect(result[0].slug).toBe('comfort-medium')
  })

  it('returns empty when no matches', () => {
    const result = filterPlans(ALL_PLANS, 'foundation', 'any')
    expect(result).toHaveLength(0)
  })

  it('returns empty for empty manifest', () => {
    const result = filterPlans([], 'all', 'any')
    expect(result).toHaveLength(0)
  })
})

describe('splitIntoSections', () => {
  it('returns all empty sections for empty manifest', () => {
    const result = splitIntoSections([], {})
    expect(result.inProgress).toHaveLength(0)
    expect(result.browse).toHaveLength(0)
    expect(result.completed).toHaveLength(0)
  })

  it('all plans in browse when no progress', () => {
    const result = splitIntoSections(ALL_PLANS, {})
    expect(result.browse).toHaveLength(4)
    expect(result.inProgress).toHaveLength(0)
    expect(result.completed).toHaveLength(0)
  })

  it('active plan goes to inProgress', () => {
    const progressMap = {
      'comfort-short': makeProgress('comfort-short', { currentDay: 3, completedDays: [1, 2] }),
    }
    const result = splitIntoSections(ALL_PLANS, progressMap)
    expect(result.inProgress).toHaveLength(1)
    expect(result.inProgress[0].plan.slug).toBe('comfort-short')
    expect(result.browse).toHaveLength(3)
  })

  it('completed plan goes to completed', () => {
    const progressMap = {
      'comfort-short': makeProgress('comfort-short', {
        completedAt: '2026-01-07',
        completedDays: [1, 2, 3, 4, 5, 6, 7],
      }),
    }
    const result = splitIntoSections(ALL_PLANS, progressMap)
    expect(result.completed).toHaveLength(1)
    expect(result.completed[0].plan.slug).toBe('comfort-short')
    expect(result.browse).toHaveLength(3)
  })

  it('restarted plan appears in inProgress only (not duplicated in completed)', () => {
    // A plan that was completed then restarted has a new progress record with completedAt=null
    const progressMap = {
      'comfort-short': makeProgress('comfort-short', {
        currentDay: 1,
        completedDays: [],
        completedAt: null,
      }),
    }
    const result = splitIntoSections(ALL_PLANS, progressMap)
    expect(result.inProgress).toHaveLength(1)
    expect(result.completed).toHaveLength(0)
    expect(result.inProgress[0].plan.slug).toBe('comfort-short')
  })

  it('paused plan (no completedAt) goes to inProgress', () => {
    const progressMap = {
      'comfort-short': makeProgress('comfort-short', {
        pausedAt: '2026-01-05',
        currentDay: 3,
        completedDays: [1, 2],
      }),
    }
    const result = splitIntoSections(ALL_PLANS, progressMap)
    expect(result.inProgress).toHaveLength(1)
    expect(result.inProgress[0].progress.pausedAt).toBe('2026-01-05')
  })
})
