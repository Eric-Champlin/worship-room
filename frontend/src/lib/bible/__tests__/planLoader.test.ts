import { describe, expect, it } from 'vitest'

import anxiousPlanData from '@/data/bible/plans/when-youre-anxious.json'
import firstKingsBook from '@/data/bible/books/json/1-kings.json'
import firstSamuelBook from '@/data/bible/books/json/1-samuel.json'
import isaiahBook from '@/data/bible/books/json/isaiah.json'
import lamentationsBook from '@/data/bible/books/json/lamentations.json'
import lukeBook from '@/data/bible/books/json/luke.json'
import manifestData from '@/data/bible/plans/manifest.json'
import markBook from '@/data/bible/books/json/mark.json'
import matthewBook from '@/data/bible/books/json/matthew.json'
import johnPlanData from '@/data/bible/plans/john-story-of-jesus.json'
import philippiansBook from '@/data/bible/books/json/philippians.json'
import planData from '@/data/bible/plans/psalms-30-days.json'
import psalmsBook from '@/data/bible/books/json/psalms.json'
import secondCorinthiansBook from '@/data/bible/books/json/2-corinthians.json'
import type { PlanTheme } from '@/types/bible-plans'

import { loadManifest, loadPlan } from '../planLoader'

const VALID_THEMES: PlanTheme[] = ['comfort', 'foundation', 'emotional', 'sleep', 'wisdom', 'prayer']

type BookChapter = { chapter: number; verses: Array<{ number: number; text: string }> }

const BOOK_LOOKUP: Record<string, BookChapter[]> = {
  psalms: psalmsBook as BookChapter[],
  '1-kings': firstKingsBook as BookChapter[],
  matthew: matthewBook as BookChapter[],
  '1-samuel': firstSamuelBook as BookChapter[],
  mark: markBook as BookChapter[],
  philippians: philippiansBook as BookChapter[],
  isaiah: isaiahBook as BookChapter[],
  luke: lukeBook as BookChapter[],
  '2-corinthians': secondCorinthiansBook as BookChapter[],
  lamentations: lamentationsBook as BookChapter[],
}

describe('loadManifest', () => {
  it('returns array containing all three plan entries', () => {
    const result = loadManifest()
    expect(Array.isArray(result)).toBe(true)
    expect(result).toHaveLength(3)
    expect(result.find((p) => p.slug === 'psalms-30-days')).toBeDefined()
    expect(result.find((p) => p.slug === 'john-story-of-jesus')).toBeDefined()
    expect(result.find((p) => p.slug === 'when-youre-anxious')).toBeDefined()
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

  it('loads when-youre-anxious without error', async () => {
    const result = await loadPlan('when-youre-anxious')
    expect(result.error).toBeNull()
    expect(result.plan).not.toBeNull()
    expect(result.plan!.slug).toBe('when-youre-anxious')
    expect(result.plan!.duration).toBe(14)
    expect(result.plan!.days).toHaveLength(14)
    expect(result.plan!.title).toBe("When You're Anxious")
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

describe('when-youre-anxious plan validation', () => {
  const CANONICAL_PASSAGES: Array<{
    day: number
    book: string
    chapter: number
    startVerse?: number
    endVerse?: number
  }> = [
    { day: 1, book: 'psalms', chapter: 139, startVerse: 1, endVerse: 12 },
    { day: 2, book: '1-kings', chapter: 19, startVerse: 1, endVerse: 13 },
    { day: 3, book: 'matthew', chapter: 6, startVerse: 25, endVerse: 34 },
    { day: 4, book: '1-samuel', chapter: 1, startVerse: 1, endVerse: 20 },
    { day: 5, book: 'psalms', chapter: 13 },
    { day: 6, book: 'mark', chapter: 4, startVerse: 35, endVerse: 41 },
    { day: 7, book: 'philippians', chapter: 4, startVerse: 4, endVerse: 9 },
    { day: 8, book: 'psalms', chapter: 46 },
    { day: 9, book: 'matthew', chapter: 26, startVerse: 36, endVerse: 46 },
    { day: 10, book: 'isaiah', chapter: 43, startVerse: 1, endVerse: 5 },
    { day: 11, book: 'luke', chapter: 8, startVerse: 40, endVerse: 48 },
    { day: 12, book: 'psalms', chapter: 131 },
    { day: 13, book: '2-corinthians', chapter: 12, startVerse: 7, endVerse: 10 },
    { day: 14, book: 'lamentations', chapter: 3, startVerse: 19, endVerse: 26 },
  ]

  const FULL_CHAPTER_DAYS = new Set([5, 8, 12])

  it('has correct metadata', () => {
    expect(anxiousPlanData.slug).toBe('when-youre-anxious')
    expect(anxiousPlanData.title).toBe("When You're Anxious")
    expect(anxiousPlanData.shortTitle).toBe('Anxious')
    expect(anxiousPlanData.duration).toBe(14)
    expect(anxiousPlanData.theme).toBe('emotional')
    expect(anxiousPlanData.curator).toBe('Worship Room')
    expect(anxiousPlanData.estimatedMinutesPerDay).toBe(7)
    expect(anxiousPlanData.coverGradient).toBe('from-emerald-600/30 to-hero-dark')
  })

  it('has all 14 days with continuous numbering', () => {
    expect(anxiousPlanData.days).toHaveLength(14)
    const dayNumbers = anxiousPlanData.days.map((d) => d.day)
    const expected = Array.from({ length: 14 }, (_, i) => i + 1)
    expect(dayNumbers).toEqual(expected)
  })

  it('every day has required fields', () => {
    for (const day of anxiousPlanData.days) {
      expect(day.title).toBeTruthy()
      expect(day.passages.length).toBeGreaterThanOrEqual(1)
      expect(day.devotional).toBeTruthy()
      expect(day.reflectionPrompts).toBeDefined()
      expect(day.reflectionPrompts!.length).toBe(1)
    }
  })

  it('all passages match the canonical 14-day structure', () => {
    for (const expected of CANONICAL_PASSAGES) {
      const day = anxiousPlanData.days.find((d) => d.day === expected.day)
      expect(day).toBeDefined()
      expect(day!.passages).toHaveLength(1)
      const passage = day!.passages[0] as {
        book: string
        chapter: number
        startVerse?: number
        endVerse?: number
      }
      expect(passage.book).toBe(expected.book)
      expect(passage.chapter).toBe(expected.chapter)
      if (FULL_CHAPTER_DAYS.has(expected.day)) {
        expect(passage).not.toHaveProperty('startVerse')
        expect(passage).not.toHaveProperty('endVerse')
      } else {
        expect(typeof passage.startVerse).toBe('number')
        expect(typeof passage.endVerse).toBe('number')
        expect(passage.startVerse).toBe(expected.startVerse)
        expect(passage.endVerse).toBe(expected.endVerse)
      }
    }
  })

  it('verse ranges are valid (endVerse >= startVerse)', () => {
    for (const day of anxiousPlanData.days) {
      for (const passage of day.passages) {
        const p = passage as { startVerse?: number; endVerse?: number }
        if (p.startVerse !== undefined && p.endVerse !== undefined) {
          expect(p.endVerse).toBeGreaterThanOrEqual(p.startVerse)
        }
      }
    }
  })

  it('verse ranges fit within actual WEB chapter verse counts', () => {
    for (const day of anxiousPlanData.days) {
      for (const passage of day.passages) {
        const p = passage as {
          book: string
          chapter: number
          startVerse?: number
          endVerse?: number
        }
        if (p.endVerse === undefined) continue
        const book = BOOK_LOOKUP[p.book]
        expect(book).toBeDefined()
        const chapter = book.find((c) => c.chapter === p.chapter)
        expect(chapter).toBeDefined()
        expect(p.endVerse).toBeLessThanOrEqual(chapter!.verses.length)
      }
    }
  })

  it('devotional word counts are in range (100-200)', () => {
    for (const day of anxiousPlanData.days) {
      const wordCount = day.devotional!.split(/\s+/).filter((w) => w.length > 0).length
      expect(wordCount).toBeGreaterThanOrEqual(100)
      expect(wordCount).toBeLessThanOrEqual(200)
    }
  })

  it('total devotional word count is in range (1400-2800)', () => {
    const total = anxiousPlanData.days.reduce((sum, day) => {
      return sum + day.devotional!.split(/\s+/).filter((w) => w.length > 0).length
    }, 0)
    expect(total).toBeGreaterThanOrEqual(1400)
    expect(total).toBeLessThanOrEqual(2800)
  })

  it('reflection prompts are in character range (30-140)', () => {
    for (const day of anxiousPlanData.days) {
      for (const prompt of day.reflectionPrompts!) {
        expect(prompt.length).toBeGreaterThanOrEqual(30)
        expect(prompt.length).toBeLessThanOrEqual(140)
      }
    }
  })

  it('no duplicate reflection prompts', () => {
    const allPrompts = anxiousPlanData.days.flatMap((d) => d.reflectionPrompts!)
    const unique = new Set(allPrompts)
    expect(unique.size).toBe(allPrompts.length)
  })

  it('day 5 reflection prompt matches canonical text', () => {
    const day5 = anxiousPlanData.days.find((d) => d.day === 5)
    expect(day5!.reflectionPrompts![0]).toBe(
      "What would it look like to be that honest with God about what you're feeling?",
    )
  })

  it('day 14 reflection prompt matches canonical text', () => {
    const day14 = anxiousPlanData.days.find((d) => d.day === 14)
    expect(day14!.reflectionPrompts![0]).toBe(
      "What's one verse from these 14 days you want to remember on a hard day?",
    )
  })

  it('description is 180-240 words', () => {
    const wordCount = anxiousPlanData.description.split(/\s+/).filter((w) => w.length > 0).length
    expect(wordCount).toBeGreaterThanOrEqual(180)
    expect(wordCount).toBeLessThanOrEqual(240)
  })

  it('description contains "scripture used as a club" phrase', () => {
    expect(anxiousPlanData.description.toLowerCase()).toContain('scripture used as a club')
  })

  it('description names at least 4 of the anxious biblical figures', () => {
    const figures = ['Hannah', 'Elijah', 'disciples', 'David', 'Gethsemane']
    const matches = figures.filter((f) => anxiousPlanData.description.includes(f))
    expect(matches.length).toBeGreaterThanOrEqual(4)
  })

  it('description contains honest-expectation language', () => {
    const desc = anxiousPlanData.description.toLowerCase()
    const hasHonestLanguage =
      desc.includes("won't fix") ||
      desc.includes('will not fix') ||
      desc.includes('nothing in fourteen days')
    expect(hasHonestLanguage).toBe(true)
  })

  it('no devotional or description contains forbidden phrases', () => {
    const forbidden = [
      'if you have enough faith',
      'if you trusted enough',
      'if your faith were stronger',
      'if you had more faith',
      'god will heal you',
      'jeremiah 29:11',
      'plans to prosper you',
      'god wants to speak to you',
      'open your heart',
      'let god in',
      'just trust',
      'just pray more',
      'the devil is attacking you',
      'anxiety disorder',
      'generalized anxiety',
      'are you feeling better',
    ]
    const allText = [
      anxiousPlanData.description,
      ...anxiousPlanData.days.map((d) => d.devotional!),
    ]
    for (const text of allText) {
      const lower = text.toLowerCase()
      for (const phrase of forbidden) {
        expect(lower).not.toContain(phrase)
      }
    }
  })

  it('theme is a valid PlanTheme value', () => {
    expect(VALID_THEMES).toContain(anxiousPlanData.theme)
  })

  it('manifest metadata matches plan metadata (no drift)', () => {
    const manifestEntry = manifestData.find((m) => m.slug === 'when-youre-anxious')
    expect(manifestEntry).toBeDefined()

    const { days: _days, ...planMeta } = anxiousPlanData
    for (const [key, value] of Object.entries(planMeta)) {
      expect((manifestEntry as Record<string, unknown>)[key]).toEqual(value)
    }
    expect(manifestEntry).not.toHaveProperty('days')
  })

  it('day 9 devotional acknowledges Jesus distress and non-deliverance', () => {
    const day9 = anxiousPlanData.days.find((d) => d.day === 9)!
    const lower = day9.devotional!.toLowerCase()
    expect(lower).toContain('jesus')
    const distressWords = ['distress', 'agony', 'anguish']
    expect(distressWords.some((w) => lower.includes(w))).toBe(true)
    const notDeliveredWords = ['not removed', 'not delivered', 'not taken']
    expect(notDeliveredWords.some((w) => lower.includes(w))).toBe(true)
  })

  it('day 14 devotional does not promise being "done" with anxiety', () => {
    const day14 = anxiousPlanData.days.find((d) => d.day === 14)!
    const lower = day14.devotional!.toLowerCase()
    const forbiddenClosing = ['conquered', 'no longer anxious', "you're done", 'you are done', 'fixed']
    for (const word of forbiddenClosing) {
      expect(lower).not.toContain(word)
    }
  })

  it('no passage anywhere references Jeremiah', () => {
    for (const day of anxiousPlanData.days) {
      for (const passage of day.passages) {
        expect(passage.book).not.toBe('jeremiah')
      }
    }
  })
})
