import { describe, it, expect } from 'vitest'

import { READING_PLANS, getReadingPlan, getReadingPlanDay } from '../index'

describe('Reading Plans Data', () => {
  it('contains 10 reading plans', () => {
    expect(READING_PLANS).toHaveLength(10)
  })

  it('has 5 seven-day plans, 3 fourteen-day plans, and 2 twenty-one-day plans', () => {
    const sevenDay = READING_PLANS.filter((p) => p.durationDays === 7)
    const fourteenDay = READING_PLANS.filter((p) => p.durationDays === 14)
    const twentyOneDay = READING_PLANS.filter((p) => p.durationDays === 21)
    expect(sevenDay).toHaveLength(5)
    expect(fourteenDay).toHaveLength(3)
    expect(twentyOneDay).toHaveLength(2)
  })

  it('has 5 beginner plans and 5 intermediate plans', () => {
    const beginner = READING_PLANS.filter((p) => p.difficulty === 'beginner')
    const intermediate = READING_PLANS.filter(
      (p) => p.difficulty === 'intermediate',
    )
    expect(beginner).toHaveLength(5)
    expect(intermediate).toHaveLength(5)
  })

  it('has unique IDs for all plans', () => {
    const ids = READING_PLANS.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('has unique cover emojis for all plans', () => {
    const emojis = READING_PLANS.map((p) => p.coverEmoji)
    expect(new Set(emojis).size).toBe(emojis.length)
  })

  it('each plan has the correct number of days matching durationDays', () => {
    for (const plan of READING_PLANS) {
      expect(plan.days).toHaveLength(plan.durationDays)
    }
  })

  it('each day has correct dayNumber sequence', () => {
    for (const plan of READING_PLANS) {
      plan.days.forEach((day, i) => {
        expect(day.dayNumber).toBe(i + 1)
      })
    }
  })

  it('all passages have 2-6 verses', () => {
    for (const plan of READING_PLANS) {
      for (const day of plan.days) {
        expect(day.passage.verses.length).toBeGreaterThanOrEqual(2)
        expect(day.passage.verses.length).toBeLessThanOrEqual(6)
      }
    }
  })

  it('all reflections have 2-3 paragraphs', () => {
    for (const plan of READING_PLANS) {
      for (const day of plan.days) {
        expect(day.reflection.length).toBeGreaterThanOrEqual(2)
        expect(day.reflection.length).toBeLessThanOrEqual(3)
      }
    }
  })

  it('no empty prayers or action steps', () => {
    for (const plan of READING_PLANS) {
      for (const day of plan.days) {
        expect(day.prayer.length).toBeGreaterThan(0)
        expect(day.actionStep.length).toBeGreaterThan(0)
      }
    }
  })

  it('all plans have required fields', () => {
    for (const plan of READING_PLANS) {
      expect(plan.id).toBeTruthy()
      expect(plan.title).toBeTruthy()
      expect(plan.description).toBeTruthy()
      expect(plan.theme).toBeTruthy()
      expect(plan.coverEmoji).toBeTruthy()
      expect(plan.days.length).toBeGreaterThan(0)
    }
  })
})

describe('getReadingPlan', () => {
  it('returns correct plan for valid ID', () => {
    const plan = getReadingPlan('finding-peace-in-anxiety')
    expect(plan).toBeDefined()
    expect(plan?.title).toBe('Finding Peace in Anxiety')
  })

  it('returns undefined for invalid ID', () => {
    expect(getReadingPlan('nonexistent')).toBeUndefined()
  })
})

describe('getReadingPlanDay', () => {
  it('returns correct day content', () => {
    const day = getReadingPlanDay('finding-peace-in-anxiety', 1)
    expect(day).toBeDefined()
    expect(day?.dayNumber).toBe(1)
    expect(day?.title).toBeTruthy()
  })

  it('returns undefined for invalid plan', () => {
    expect(getReadingPlanDay('nonexistent', 1)).toBeUndefined()
  })

  it('returns undefined for invalid day number', () => {
    expect(getReadingPlanDay('finding-peace-in-anxiety', 99)).toBeUndefined()
  })
})
