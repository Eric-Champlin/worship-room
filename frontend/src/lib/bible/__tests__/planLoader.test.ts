import { describe, expect, it } from 'vitest'

import manifestData from '@/data/bible/plans/manifest.json'
import johnPlanData from '@/data/bible/plans/john-story-of-jesus.json'
import planData from '@/data/bible/plans/psalms-30-days.json'
import type { PlanTheme } from '@/types/bible-plans'

import { loadManifest, loadPlan } from '../planLoader'

const VALID_THEMES: PlanTheme[] = ['comfort', 'foundation', 'emotional', 'sleep', 'wisdom', 'prayer']

describe('loadManifest', () => {
  it('returns array containing both plan entries', () => {
    const result = loadManifest()
    expect(Array.isArray(result)).toBe(true)
    expect(result).toHaveLength(2)
    expect(result.find((p) => p.slug === 'psalms-30-days')).toBeDefined()
    expect(result.find((p) => p.slug === 'john-story-of-jesus')).toBeDefined()
  })
})

describe('loadPlan', () => {
  it('returns error for nonexistent slug', async () => {
    const result = await loadPlan('nonexistent-plan')
    expect(result.plan).toBeNull()
    expect(result.error).toBe('Plan "nonexistent-plan" could not be loaded.')
  })

  it('never throws — always returns result object', async () => {
    const result = await loadPlan('definitely-does-not-exist-xyz')
    expect(result).toHaveProperty('plan')
    expect(result).toHaveProperty('error')
    expect(result.plan).toBeNull()
    expect(typeof result.error).toBe('string')
  })

  it('validates required fields — rejects data missing title', async () => {
    const result = await loadPlan('missing-fields')
    expect(result.plan).toBeNull()
    expect(result.error).toContain('could not be loaded')
  })

  it('loads psalms-30-days without error', async () => {
    const result = await loadPlan('psalms-30-days')
    expect(result.error).toBeNull()
    expect(result.plan).not.toBeNull()
    expect(result.plan!.slug).toBe('psalms-30-days')
    expect(result.plan!.duration).toBe(30)
    expect(result.plan!.days).toHaveLength(30)
    expect(result.plan!.title).toBe('30 Days in the Psalms')
  })

  it('loads john-story-of-jesus without error', async () => {
    const result = await loadPlan('john-story-of-jesus')
    expect(result.error).toBeNull()
    expect(result.plan).not.toBeNull()
    expect(result.plan!.slug).toBe('john-story-of-jesus')
    expect(result.plan!.duration).toBe(21)
    expect(result.plan!.days).toHaveLength(21)
    expect(result.plan!.title).toBe('The Story of Jesus')
  })
})

describe('psalms-30-days plan validation', () => {
  it('has correct metadata', () => {
    expect(planData.slug).toBe('psalms-30-days')
    expect(planData.title).toBe('30 Days in the Psalms')
    expect(planData.shortTitle).toBe('Psalms')
    expect(planData.duration).toBe(30)
    expect(planData.theme).toBe('comfort')
    expect(planData.curator).toBe('Worship Room')
    expect(planData.estimatedMinutesPerDay).toBe(7)
    expect(planData.coverGradient).toBe('from-indigo-500/30 to-hero-dark')
  })

  it('has all 30 days with continuous numbering', () => {
    expect(planData.days).toHaveLength(30)
    const dayNumbers = planData.days.map((d) => d.day)
    const expected = Array.from({ length: 30 }, (_, i) => i + 1)
    expect(dayNumbers).toEqual(expected)
  })

  it('every day has required fields', () => {
    for (const day of planData.days) {
      expect(day.title).toBeTruthy()
      expect(day.passages.length).toBeGreaterThanOrEqual(1)
      expect(day.devotional).toBeTruthy()
      expect(day.reflectionPrompts).toBeDefined()
      expect(day.reflectionPrompts!.length).toBeGreaterThanOrEqual(1)
    }
  })

  it('all passages reference valid Psalms', () => {
    for (const day of planData.days) {
      for (const passage of day.passages) {
        expect(passage.book).toBe('psalms')
        expect(passage.chapter).toBeGreaterThanOrEqual(1)
        expect(passage.chapter).toBeLessThanOrEqual(150)
      }
    }
  })

  it('devotional word counts are in range (100-200)', () => {
    for (const day of planData.days) {
      const wordCount = day.devotional!.split(/\s+/).filter((w) => w.length > 0).length
      expect(wordCount).toBeGreaterThanOrEqual(100)
      expect(wordCount).toBeLessThanOrEqual(200)
    }
  })

  it('reflection prompts are in character range (30-140)', () => {
    for (const day of planData.days) {
      for (const prompt of day.reflectionPrompts!) {
        expect(prompt.length).toBeGreaterThanOrEqual(30)
        expect(prompt.length).toBeLessThanOrEqual(140)
      }
    }
  })

  it('no duplicate reflection prompts', () => {
    const allPrompts = planData.days.flatMap((d) => d.reflectionPrompts!)
    const unique = new Set(allPrompts)
    expect(unique.size).toBe(allPrompts.length)
  })

  it('theme is a valid PlanTheme value', () => {
    expect(VALID_THEMES).toContain(planData.theme)
  })

  it('manifest metadata matches plan metadata (no drift)', () => {
    const manifestEntry = manifestData.find((m) => m.slug === 'psalms-30-days')
    expect(manifestEntry).toBeDefined()

    const { days: _days, ...planMeta } = planData
    for (const [key, value] of Object.entries(planMeta)) {
      expect((manifestEntry as Record<string, unknown>)[key]).toEqual(value)
    }
    expect(manifestEntry).not.toHaveProperty('days')
  })
})

describe('john-story-of-jesus plan validation', () => {
  it('has correct metadata', () => {
    expect(johnPlanData.slug).toBe('john-story-of-jesus')
    expect(johnPlanData.title).toBe('The Story of Jesus')
    expect(johnPlanData.shortTitle).toBe('John')
    expect(johnPlanData.duration).toBe(21)
    expect(johnPlanData.theme).toBe('foundation')
    expect(johnPlanData.curator).toBe('Worship Room')
    expect(johnPlanData.estimatedMinutesPerDay).toBe(10)
    expect(johnPlanData.coverGradient).toBe('from-amber-500/30 to-hero-dark')
  })

  it('has all 21 days with continuous numbering', () => {
    expect(johnPlanData.days).toHaveLength(21)
    const dayNumbers = johnPlanData.days.map((d) => d.day)
    const expected = Array.from({ length: 21 }, (_, i) => i + 1)
    expect(dayNumbers).toEqual(expected)
  })

  it('every day has required fields', () => {
    for (const day of johnPlanData.days) {
      expect(day.title).toBeTruthy()
      expect(day.passages.length).toBeGreaterThanOrEqual(1)
      expect(day.devotional).toBeTruthy()
      expect(day.reflectionPrompts).toBeDefined()
      expect(day.reflectionPrompts!.length).toBeGreaterThanOrEqual(1)
    }
  })

  it('all passages reference John chapters in order', () => {
    for (const day of johnPlanData.days) {
      expect(day.passages).toHaveLength(1)
      expect(day.passages[0].book).toBe('john')
      expect(day.passages[0].chapter).toBe(day.day)
    }
  })

  it('no passage has verse ranges', () => {
    for (const day of johnPlanData.days) {
      for (const passage of day.passages) {
        expect(passage).not.toHaveProperty('startVerse')
        expect(passage).not.toHaveProperty('endVerse')
      }
    }
  })

  it('devotional word counts are in range (100-200)', () => {
    for (const day of johnPlanData.days) {
      const wordCount = day.devotional!.split(/\s+/).filter((w) => w.length > 0).length
      expect(wordCount).toBeGreaterThanOrEqual(100)
      expect(wordCount).toBeLessThanOrEqual(200)
    }
  })

  it('reflection prompts are in character range (30-140)', () => {
    for (const day of johnPlanData.days) {
      for (const prompt of day.reflectionPrompts!) {
        expect(prompt.length).toBeGreaterThanOrEqual(30)
        expect(prompt.length).toBeLessThanOrEqual(140)
      }
    }
  })

  it('no duplicate reflection prompts', () => {
    const allPrompts = johnPlanData.days.flatMap((d) => d.reflectionPrompts!)
    const unique = new Set(allPrompts)
    expect(unique.size).toBe(allPrompts.length)
  })

  it('theme is a valid PlanTheme value', () => {
    expect(VALID_THEMES).toContain(johnPlanData.theme)
  })

  it('manifest metadata matches plan metadata (no drift)', () => {
    const manifestEntry = manifestData.find((m) => m.slug === 'john-story-of-jesus')
    expect(manifestEntry).toBeDefined()

    const { days: _days, ...planMeta } = johnPlanData
    for (const [key, value] of Object.entries(planMeta)) {
      expect((manifestEntry as Record<string, unknown>)[key]).toEqual(value)
    }
    expect(manifestEntry).not.toHaveProperty('days')
  })
})
