import { describe, expect, it } from 'vitest'

import anxiousPlanData from '@/data/bible/plans/when-youre-anxious.json'
import firstKingsBook from '@/data/bible/books/json/1-kings.json'
import firstSamuelBook from '@/data/bible/books/json/1-samuel.json'
import genesisBook from '@/data/bible/books/json/genesis.json'
import isaiahBook from '@/data/bible/books/json/isaiah.json'
import lamentationsBook from '@/data/bible/books/json/lamentations.json'
import lukeBook from '@/data/bible/books/json/luke.json'
import manifestData from '@/data/bible/plans/manifest.json'
import markBook from '@/data/bible/books/json/mark.json'
import matthewBook from '@/data/bible/books/json/matthew.json'
import numbersBook from '@/data/bible/books/json/numbers.json'
import johnPlanData from '@/data/bible/plans/john-story-of-jesus.json'
import philippiansBook from '@/data/bible/books/json/philippians.json'
import planData from '@/data/bible/plans/psalms-30-days.json'
import psalmsBook from '@/data/bible/books/json/psalms.json'
import secondCorinthiansBook from '@/data/bible/books/json/2-corinthians.json'
import sleepPlanData from '@/data/bible/plans/when-you-cant-sleep.json'
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
  genesis: genesisBook as BookChapter[],
  numbers: numbersBook as BookChapter[],
}

describe('loadManifest', () => {
  it('returns array containing all four plan entries', () => {
    const result = loadManifest()
    expect(Array.isArray(result)).toBe(true)
    expect(result).toHaveLength(4)
    expect(result.find((p) => p.slug === 'psalms-30-days')).toBeDefined()
    expect(result.find((p) => p.slug === 'john-story-of-jesus')).toBeDefined()
    expect(result.find((p) => p.slug === 'when-youre-anxious')).toBeDefined()
    expect(result.find((p) => p.slug === 'when-you-cant-sleep')).toBeDefined()
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

  it('loads when-you-cant-sleep without error', async () => {
    const result = await loadPlan('when-you-cant-sleep')
    expect(result.error).toBeNull()
    expect(result.plan).not.toBeNull()
    expect(result.plan!.slug).toBe('when-you-cant-sleep')
    expect(result.plan!.duration).toBe(7)
    expect(result.plan!.days).toHaveLength(7)
    expect(result.plan!.title).toBe("When You Can't Sleep")
  })
})

describe('forbidden phrase scan (all plans)', () => {
  const FORBIDDEN_PHRASES = [
    // --- Base list (inherited from BB-24) ---
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
    // --- BB-25 sleep-specific additions ---
    "you'll sleep when",
    "just let go and you'll fall asleep",
    "the reason you can't sleep is",
    'anxiety is keeping you awake',
    'your phone is the problem',
    'try not to think about it',
    'count your blessings instead of sheep',
    'count sheep',
    'this too shall pass',
    'insomnia',
    'sleep disorder',
    'sleep hygiene',
    'insomnia disorder',
    'if you just',
    'if you would only',
  ]

  const ALL_PLANS = [
    { name: 'psalms-30-days', data: planData },
    { name: 'john-story-of-jesus', data: johnPlanData },
    { name: 'when-youre-anxious', data: anxiousPlanData },
    { name: 'when-you-cant-sleep', data: sleepPlanData },
  ]

  it('no description or devotional in any plan contains a forbidden phrase', () => {
    for (const { name, data } of ALL_PLANS) {
      const allText: Array<{ label: string; text: string }> = [
        { label: `${name} description`, text: data.description },
      ]
      for (const day of data.days) {
        if (day.devotional) {
          allText.push({ label: `${name} day ${day.day} devotional`, text: day.devotional })
        }
      }
      for (const { label, text } of allText) {
        const lower = text.toLowerCase()
        for (const phrase of FORBIDDEN_PHRASES) {
          if (lower.includes(phrase)) {
            throw new Error(`Forbidden phrase "${phrase}" found in ${label}`)
          }
        }
      }
    }
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

describe('when-you-cant-sleep plan validation', () => {
  const CANONICAL_PASSAGES: Array<{
    day: number
    book: string
    chapter: number
    startVerse: number
    endVerse: number
  }> = [
    { day: 1, book: 'psalms', chapter: 4, startVerse: 1, endVerse: 8 },
    { day: 2, book: 'genesis', chapter: 28, startVerse: 10, endVerse: 17 },
    { day: 3, book: '1-kings', chapter: 19, startVerse: 4, endVerse: 8 },
    { day: 4, book: 'mark', chapter: 4, startVerse: 35, endVerse: 41 },
    { day: 5, book: 'psalms', chapter: 63, startVerse: 1, endVerse: 8 },
    { day: 6, book: 'lamentations', chapter: 3, startVerse: 21, endVerse: 26 },
    { day: 7, book: 'numbers', chapter: 6, startVerse: 24, endVerse: 26 },
  ]

  it('has correct metadata', () => {
    expect(sleepPlanData.slug).toBe('when-you-cant-sleep')
    expect(sleepPlanData.title).toBe("When You Can't Sleep")
    expect(sleepPlanData.shortTitle).toBe('Sleep')
    expect(sleepPlanData.duration).toBe(7)
    expect(sleepPlanData.theme).toBe('emotional')
    expect(sleepPlanData.curator).toBe('Worship Room')
    expect(sleepPlanData.estimatedMinutesPerDay).toBe(3)
    expect(sleepPlanData.coverGradient).toBe('from-blue-950/40 to-hero-dark')
  })

  it('has all 7 days with continuous numbering', () => {
    expect(sleepPlanData.days).toHaveLength(7)
    const dayNumbers = sleepPlanData.days.map((d) => d.day)
    const expected = Array.from({ length: 7 }, (_, i) => i + 1)
    expect(dayNumbers).toEqual(expected)
  })

  it('every day has required fields', () => {
    for (const day of sleepPlanData.days) {
      expect(day.title).toBeTruthy()
      expect(day.passages).toHaveLength(1)
      expect(day.devotional).toBeTruthy()
      expect(day.reflectionPrompts).toBeDefined()
      expect(day.reflectionPrompts!.length).toBe(1)
    }
  })

  it('all passages match the canonical 7-day structure', () => {
    for (const expected of CANONICAL_PASSAGES) {
      const day = sleepPlanData.days.find((d) => d.day === expected.day)
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
      expect(typeof passage.startVerse).toBe('number')
      expect(typeof passage.endVerse).toBe('number')
      expect(passage.startVerse).toBe(expected.startVerse)
      expect(passage.endVerse).toBe(expected.endVerse)
    }
  })

  it('every passage uses a verse range (no full chapters)', () => {
    for (const day of sleepPlanData.days) {
      for (const passage of day.passages) {
        const p = passage as { startVerse?: number; endVerse?: number }
        expect(p.startVerse).toBeDefined()
        expect(p.endVerse).toBeDefined()
      }
    }
  })

  it('verse ranges are valid (endVerse >= startVerse)', () => {
    for (const day of sleepPlanData.days) {
      for (const passage of day.passages) {
        const p = passage as { startVerse?: number; endVerse?: number }
        expect(p.endVerse!).toBeGreaterThanOrEqual(p.startVerse!)
      }
    }
  })

  it('every passage is at most 12 verses long', () => {
    for (const day of sleepPlanData.days) {
      for (const passage of day.passages) {
        const p = passage as { startVerse?: number; endVerse?: number }
        expect(p.endVerse! - p.startVerse! + 1).toBeLessThanOrEqual(12)
      }
    }
  })

  it('verse ranges fit within actual WEB chapter verse counts', () => {
    for (const day of sleepPlanData.days) {
      for (const passage of day.passages) {
        const p = passage as {
          book: string
          chapter: number
          startVerse?: number
          endVerse?: number
        }
        const book = BOOK_LOOKUP[p.book]
        expect(book).toBeDefined()
        const chapter = book.find((c) => c.chapter === p.chapter)
        expect(chapter).toBeDefined()
        expect(p.endVerse!).toBeLessThanOrEqual(chapter!.verses.length)
      }
    }
  })

  it('devotional word counts are in range (60-120)', () => {
    for (const day of sleepPlanData.days) {
      const wordCount = day.devotional!.split(/\s+/).filter((w) => w.length > 0).length
      expect(wordCount).toBeGreaterThanOrEqual(60)
      expect(wordCount).toBeLessThanOrEqual(120)
    }
  })

  it('total devotional word count is in range (420-840)', () => {
    const total = sleepPlanData.days.reduce((sum, day) => {
      return sum + day.devotional!.split(/\s+/).filter((w) => w.length > 0).length
    }, 0)
    expect(total).toBeGreaterThanOrEqual(420)
    expect(total).toBeLessThanOrEqual(840)
  })

  it('reflection prompts are at most 80 characters', () => {
    for (const day of sleepPlanData.days) {
      for (const prompt of day.reflectionPrompts!) {
        expect(prompt.length).toBeLessThanOrEqual(80)
      }
    }
  })

  it('all 7 reflection prompts are distinct', () => {
    const allPrompts = sleepPlanData.days.flatMap((d) => d.reflectionPrompts!)
    const unique = new Set(allPrompts)
    expect(unique.size).toBe(allPrompts.length)
  })

  it('day 1 reflection prompt matches canonical text', () => {
    const day1 = sleepPlanData.days.find((d) => d.day === 1)!
    expect(day1.reflectionPrompts![0]).toBe(
      "Read the last verse one more time. Let it be true even if you don't feel it yet.",
    )
  })

  it('day 4 reflection prompt matches canonical text', () => {
    const day4 = sleepPlanData.days.find((d) => d.day === 4)!
    expect(day4.reflectionPrompts![0]).toBe('You are not being shamed for being awake tonight.')
  })

  it('day 7 reflection prompt is exactly "Goodnight."', () => {
    const day7 = sleepPlanData.days.find((d) => d.day === 7)!
    const prompt = day7.reflectionPrompts![0]
    expect(prompt).toBe('Goodnight.')
    expect(prompt.includes('?')).toBe(false)
    expect(prompt.length).toBeLessThanOrEqual(15)
  })

  it('description is 130-180 words', () => {
    const wordCount = sleepPlanData.description.split(/\s+/).filter((w) => w.length > 0).length
    expect(wordCount).toBeGreaterThanOrEqual(130)
    expect(wordCount).toBeLessThanOrEqual(180)
  })

  it('description references phone / late-night reading', () => {
    const desc = sleepPlanData.description.toLowerCase()
    const hasPhoneRef =
      desc.includes('phone') ||
      desc.includes('scrolling') ||
      desc.includes('late') ||
      desc.includes('night')
    expect(hasPhoneRef).toBe(true)
  })

  it('description contains honest-expectation language', () => {
    const desc = sleepPlanData.description.toLowerCase()
    const hasHonestLanguage =
      desc.includes('think hard') ||
      desc.includes('brief on purpose') ||
      desc.includes("shouldn't have to")
    expect(hasHonestLanguage).toBe(true)
  })

  it('description names at least 2 anxious-at-night biblical figures', () => {
    const figures = ['David', 'Jacob', 'Elijah', 'disciples']
    const matches = figures.filter((f) => sleepPlanData.description.includes(f))
    expect(matches.length).toBeGreaterThanOrEqual(2)
  })

  it('description does not promise sleep', () => {
    const desc = sleepPlanData.description.toLowerCase()
    const forbidden = [
      'you will sleep',
      "you'll sleep",
      'help you sleep',
      'sleep better',
      'fall asleep',
    ]
    for (const phrase of forbidden) {
      expect(desc).not.toContain(phrase)
    }
  })

  it('description does not contain "insomnia"', () => {
    expect(sleepPlanData.description.toLowerCase()).not.toContain('insomnia')
  })

  it('description ends with permission language', () => {
    const desc = sleepPlanData.description.toLowerCase()
    const hasPermission =
      desc.includes('plan will wait') ||
      desc.includes('come back') ||
      desc.includes('another night') ||
      desc.includes('the plan will')
    expect(hasPermission).toBe(true)
  })

  it('day 1 devotional contains the "you may not feel it" pattern', () => {
    const day1 = sleepPlanData.days.find((d) => d.day === 1)!
    const lower = day1.devotional!.toLowerCase()
    const hasFeelPattern =
      lower.includes("don't feel") ||
      lower.includes('not feel') ||
      lower.includes("doesn't feel") ||
      lower.includes('may not feel')
    expect(hasFeelPattern).toBe(true)
    const referencesTrueOrReal = lower.includes('true') || lower.includes('real')
    expect(referencesTrueOrReal).toBe(true)
  })

  it('day 4 devotional names disciples + storm/boat + Jesus asleep + "not shamed"', () => {
    const day4 = sleepPlanData.days.find((d) => d.day === 4)!
    const lower = day4.devotional!.toLowerCase()
    expect(lower).toContain('disciples')
    expect(lower.includes('storm') || lower.includes('boat')).toBe(true)
    expect(lower).toContain('asleep')
    const hasNotShamed =
      lower.includes('not shamed') ||
      lower.includes("wasn't shamed") ||
      lower.includes("weren't shamed") ||
      lower.includes("didn't shame")
    expect(hasNotShamed).toBe(true)
  })

  it('day 7 devotional speaks the Aaronic blessing and has no call to action', () => {
    const day7 = sleepPlanData.days.find((d) => d.day === 7)!
    const lower = day7.devotional!.toLowerCase()
    expect(lower).toContain('bless')
    expect(lower).toContain('peace')
    const forbiddenActions = ['journal', 'share', 'recommit', 'write down', 'tell someone', 'post']
    for (const action of forbiddenActions) {
      expect(lower).not.toContain(action)
    }
  })

  it('day 7 devotional ends with permission to put the phone down', () => {
    const day7 = sleepPlanData.days.find((d) => d.day === 7)!
    const lower = day7.devotional!.toLowerCase()
    expect(lower).toContain('phone')
    expect(lower.includes('down') || lower.includes('put')).toBe(true)
  })

  it('theme is a valid PlanTheme value', () => {
    expect(VALID_THEMES).toContain(sleepPlanData.theme)
  })

  it('manifest metadata matches plan metadata (no drift)', () => {
    const manifestEntry = manifestData.find((m) => m.slug === 'when-you-cant-sleep')
    expect(manifestEntry).toBeDefined()

    const { days: _days, ...planMeta } = sleepPlanData
    for (const [key, value] of Object.entries(planMeta)) {
      expect((manifestEntry as Record<string, unknown>)[key]).toEqual(value)
    }
    expect(manifestEntry).not.toHaveProperty('days')
  })

  it('no devotional or description uses clinical sleep terminology', () => {
    const clinical = ['insomnia', 'sleep disorder', 'sleep hygiene', 'insomnia disorder', 'dsm']
    const allText = [
      sleepPlanData.description,
      ...sleepPlanData.days.map((d) => d.devotional!),
    ]
    for (const text of allText) {
      const lower = text.toLowerCase()
      for (const term of clinical) {
        expect(lower).not.toContain(term)
      }
    }
  })

  it('no devotional gives medical advice', () => {
    const medical = [
      'chamomile',
      'melatonin',
      'caffeine',
      'medication',
      'therapist',
      'doctor',
      'diagnosis',
    ]
    for (const day of sleepPlanData.days) {
      const lower = day.devotional!.toLowerCase()
      for (const term of medical) {
        expect(lower).not.toContain(term)
      }
    }
  })

  it('no devotional promises sleep', () => {
    const promises = [
      'you will sleep',
      "you'll sleep",
      'help you sleep',
      'fall asleep',
      'sleep better',
      'sleep peacefully',
    ]
    for (const day of sleepPlanData.days) {
      const lower = day.devotional!.toLowerCase()
      for (const phrase of promises) {
        expect(lower).not.toContain(phrase)
      }
    }
  })

  it('no non-Day-7 devotional tells the user to put the phone down', () => {
    for (const day of sleepPlanData.days) {
      if (day.day === 7) continue
      const lower = day.devotional!.toLowerCase()
      expect(lower).not.toContain('put the phone down')
      expect(lower).not.toContain('put your phone down')
    }
  })

  it('no reflection prompt contains a question mark', () => {
    for (const day of sleepPlanData.days) {
      for (const prompt of day.reflectionPrompts!) {
        expect(prompt.includes('?')).toBe(false)
      }
    }
  })

  it('no reflection prompt asks the user to do anything', () => {
    const forbidden = ['write', 'share', 'journal', 'tell', 'did this', 'are you', 'do you feel']
    for (const day of sleepPlanData.days) {
      for (const prompt of day.reflectionPrompts!) {
        const lower = prompt.toLowerCase()
        for (const phrase of forbidden) {
          expect(lower).not.toContain(phrase)
        }
      }
    }
  })
})
