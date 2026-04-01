import { describe, it, expect } from 'vitest'

import {
  READING_PLAN_METADATA,
  getReadingPlanMeta,
  loadReadingPlan,
  getReadingPlanDay,
} from '../index'

describe('Reading Plans Metadata', () => {
  it('contains 10 reading plans', () => {
    expect(READING_PLAN_METADATA).toHaveLength(10)
  })

  it('has 5 seven-day plans, 3 fourteen-day plans, and 2 twenty-one-day plans', () => {
    const sevenDay = READING_PLAN_METADATA.filter((p) => p.durationDays === 7)
    const fourteenDay = READING_PLAN_METADATA.filter((p) => p.durationDays === 14)
    const twentyOneDay = READING_PLAN_METADATA.filter((p) => p.durationDays === 21)
    expect(sevenDay).toHaveLength(5)
    expect(fourteenDay).toHaveLength(3)
    expect(twentyOneDay).toHaveLength(2)
  })

  it('has 5 beginner plans and 5 intermediate plans', () => {
    const beginner = READING_PLAN_METADATA.filter((p) => p.difficulty === 'beginner')
    const intermediate = READING_PLAN_METADATA.filter(
      (p) => p.difficulty === 'intermediate',
    )
    expect(beginner).toHaveLength(5)
    expect(intermediate).toHaveLength(5)
  })

  it('has unique IDs for all plans', () => {
    const ids = READING_PLAN_METADATA.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('has unique cover emojis for all plans', () => {
    const emojis = READING_PLAN_METADATA.map((p) => p.coverEmoji)
    expect(new Set(emojis).size).toBe(emojis.length)
  })

  it('all plans have required metadata fields', () => {
    for (const plan of READING_PLAN_METADATA) {
      expect(plan.id).toBeTruthy()
      expect(plan.title).toBeTruthy()
      expect(plan.description).toBeTruthy()
      expect(plan.theme).toBeTruthy()
      expect(plan.coverEmoji).toBeTruthy()
      expect(plan.durationDays).toBeGreaterThan(0)
    }
  })
})

describe('getReadingPlanMeta', () => {
  it('returns correct plan metadata for valid ID', () => {
    const plan = getReadingPlanMeta('finding-peace-in-anxiety')
    expect(plan).toBeDefined()
    expect(plan?.title).toBe('Finding Peace in Anxiety')
  })

  it('returns undefined for invalid ID', () => {
    expect(getReadingPlanMeta('nonexistent')).toBeUndefined()
  })
})

describe('loadReadingPlan', () => {
  it('loads full plan with days for valid ID', async () => {
    const plan = await loadReadingPlan('finding-peace-in-anxiety')
    expect(plan).toBeDefined()
    expect(plan?.title).toBe('Finding Peace in Anxiety')
    expect(plan?.days).toHaveLength(7)
  })

  it('returns undefined for invalid ID', async () => {
    const plan = await loadReadingPlan('nonexistent')
    expect(plan).toBeUndefined()
  })

  it('each loaded plan has the correct number of days matching durationDays', async () => {
    for (const meta of READING_PLAN_METADATA) {
      const plan = await loadReadingPlan(meta.id)
      expect(plan).toBeDefined()
      expect(plan?.days).toHaveLength(meta.durationDays)
    }
  })

  it('each day has correct dayNumber sequence', async () => {
    const plan = await loadReadingPlan('finding-peace-in-anxiety')
    expect(plan).toBeDefined()
    plan?.days.forEach((day, i) => {
      expect(day.dayNumber).toBe(i + 1)
    })
  })

  it('all passages have 2-6 verses', async () => {
    const plan = await loadReadingPlan('finding-peace-in-anxiety')
    expect(plan).toBeDefined()
    for (const day of plan!.days) {
      expect(day.passage.verses.length).toBeGreaterThanOrEqual(2)
      expect(day.passage.verses.length).toBeLessThanOrEqual(6)
    }
  })
})

describe('getReadingPlanDay', () => {
  it('returns correct day content from a loaded plan', async () => {
    const plan = await loadReadingPlan('finding-peace-in-anxiety')
    expect(plan).toBeDefined()
    const day = getReadingPlanDay(plan!, 1)
    expect(day).toBeDefined()
    expect(day?.dayNumber).toBe(1)
    expect(day?.title).toBeTruthy()
  })

  it('returns undefined for invalid day number', async () => {
    const plan = await loadReadingPlan('finding-peace-in-anxiety')
    expect(plan).toBeDefined()
    expect(getReadingPlanDay(plan!, 99)).toBeUndefined()
  })
})
