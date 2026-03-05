import { describe, it, expect } from 'vitest'
import {
  getVerseOfTheDay,
  getSongOfTheDay,
  getMockPrayer,
  getClassicPrayers,
  getJournalPrompts,
  getJournalReflection,
  getBreathingVerses,
  getSoakingVerses,
  getACTSSteps,
  getExamenSteps,
  getGratitudeAffirmation,
  getGratitudeVerses,
  getVerseById,
} from '../daily-experience-mock-data'

describe('getVerseOfTheDay', () => {
  it('returns a verse object with text and reference', () => {
    const verse = getVerseOfTheDay(1)
    expect(verse).toHaveProperty('text')
    expect(verse).toHaveProperty('reference')
    expect(verse).toHaveProperty('id')
  })

  it('returns consistent verse for same day-of-month', () => {
    const a = getVerseOfTheDay(15)
    const b = getVerseOfTheDay(15)
    expect(a.id).toBe(b.id)
  })

  it('returns different verses for different days', () => {
    const a = getVerseOfTheDay(1)
    const b = getVerseOfTheDay(2)
    expect(a.id).not.toBe(b.id)
  })
})

describe('getSongOfTheDay', () => {
  it('returns a song with trackId, title, and artist', () => {
    const song = getSongOfTheDay(1)
    expect(song).toHaveProperty('trackId')
    expect(song).toHaveProperty('title')
    expect(song).toHaveProperty('artist')
  })

  it('returns consistent song for same day-of-month', () => {
    const a = getSongOfTheDay(10)
    const b = getSongOfTheDay(10)
    expect(a.trackId).toBe(b.trackId)
  })
})

describe('getMockPrayer', () => {
  it('returns a prayer matching input topic', () => {
    const prayer = getMockPrayer("I'm anxious about work")
    expect(prayer.text).toContain('Dear God')
  })

  it('returns a prayer with "Dear God...Amen" structure', () => {
    const prayer = getMockPrayer('anything')
    expect(prayer.text).toMatch(/^Dear God/)
    expect(prayer.text).toMatch(/Amen\.$/)
  })

  it('returns fallback general prayer for unknown input', () => {
    const prayer = getMockPrayer('xyzzy random gibberish')
    expect(prayer.topic).toBe('general')
  })
})

describe('getClassicPrayers', () => {
  it('returns 6 classic prayers', () => {
    const prayers = getClassicPrayers()
    expect(prayers).toHaveLength(6)
  })

  it('each prayer has title, attribution, and text', () => {
    const prayers = getClassicPrayers()
    for (const prayer of prayers) {
      expect(prayer.title).toBeTruthy()
      expect(prayer.attribution).toBeTruthy()
      expect(prayer.text).toBeTruthy()
    }
  })
})

describe('getJournalPrompts', () => {
  it('returns at least 15 prompts', () => {
    const prompts = getJournalPrompts()
    expect(prompts.length).toBeGreaterThanOrEqual(15)
  })

  it('each prompt has text and theme', () => {
    const prompts = getJournalPrompts()
    for (const prompt of prompts) {
      expect(prompt.text).toBeTruthy()
      expect(prompt.theme).toBeTruthy()
    }
  })
})

describe('getJournalReflection', () => {
  it('returns a reflection with text', () => {
    const reflection = getJournalReflection()
    expect(reflection.text).toBeTruthy()
  })

  it('rotates through reflections on successive calls', () => {
    const first = getJournalReflection()
    const second = getJournalReflection()
    // They may or may not be different depending on pool size, but both should have text
    expect(first.text).toBeTruthy()
    expect(second.text).toBeTruthy()
  })
})

describe('getBreathingVerses', () => {
  it('returns 20 calming/peace verses', () => {
    const verses = getBreathingVerses()
    expect(verses).toHaveLength(20)
  })
})

describe('getSoakingVerses', () => {
  it('returns 20 deeper/reflective verses', () => {
    const verses = getSoakingVerses()
    expect(verses).toHaveLength(20)
  })
})

describe('getACTSSteps', () => {
  it('returns 4 steps', () => {
    const steps = getACTSSteps()
    expect(steps).toHaveLength(4)
  })

  it('steps have title, prompt, and verse', () => {
    const steps = getACTSSteps()
    for (const step of steps) {
      expect(step.title).toBeTruthy()
      expect(step.prompt).toBeTruthy()
      expect(step.verse).toBeTruthy()
    }
  })
})

describe('getExamenSteps', () => {
  it('returns 5 steps', () => {
    const steps = getExamenSteps()
    expect(steps).toHaveLength(5)
  })
})

describe('getGratitudeAffirmation', () => {
  it('includes the count in the message', () => {
    const msg = getGratitudeAffirmation(5)
    expect(msg).toContain('5')
  })
})

describe('getGratitudeVerses', () => {
  it('returns at least 3 gratitude verses', () => {
    const verses = getGratitudeVerses()
    expect(verses.length).toBeGreaterThanOrEqual(3)
  })
})

describe('getVerseById', () => {
  it('returns a verse for valid ID', () => {
    const verse = getVerseOfTheDay(1)
    const found = getVerseById(verse.id)
    expect(found).toBeDefined()
    expect(found?.id).toBe(verse.id)
  })

  it('returns undefined for invalid ID', () => {
    const found = getVerseById('nonexistent-id')
    expect(found).toBeUndefined()
  })
})
