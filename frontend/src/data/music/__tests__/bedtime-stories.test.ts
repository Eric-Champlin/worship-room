import { describe, expect, it } from 'vitest'
import { BEDTIME_STORIES, BEDTIME_STORY_BY_ID } from '../bedtime-stories'

describe('Bedtime Stories Data', () => {
  it('has 12 stories with all required fields', () => {
    expect(BEDTIME_STORIES).toHaveLength(12)
    for (const story of BEDTIME_STORIES) {
      expect(story.id).toBeTruthy()
      expect(story.title).toBeTruthy()
      expect(story.description).toBeTruthy()
      expect(story.audioFilename).toBeTruthy()
      expect(story.durationSeconds).toBeGreaterThan(0)
      expect(['male', 'female']).toContain(story.voiceId)
      expect(['short', 'medium', 'long']).toContain(story.lengthCategory)
      expect(story.tags.length).toBeGreaterThan(0)
    }
  })

  it('voice alternates male/female', () => {
    const voices = BEDTIME_STORIES.map((s) => s.voiceId)
    for (let i = 1; i < voices.length; i++) {
      expect(voices[i]).not.toBe(voices[i - 1])
    }
  })

  it('length categories match duration ranges', () => {
    for (const story of BEDTIME_STORIES) {
      const minutes = story.durationSeconds / 60
      if (story.lengthCategory === 'short') {
        expect(minutes).toBeLessThan(15)
      } else if (story.lengthCategory === 'medium') {
        expect(minutes).toBeGreaterThanOrEqual(15)
        expect(minutes).toBeLessThanOrEqual(25)
      } else {
        expect(minutes).toBeGreaterThan(25)
      }
    }
  })

  it('BEDTIME_STORY_BY_ID Map contains all 12 stories', () => {
    expect(BEDTIME_STORY_BY_ID.size).toBe(12)
    for (const story of BEDTIME_STORIES) {
      expect(BEDTIME_STORY_BY_ID.get(story.id)).toBe(story)
    }
  })

  it('all descriptions are non-empty strings', () => {
    for (const story of BEDTIME_STORIES) {
      expect(typeof story.description).toBe('string')
      expect(story.description.trim().length).toBeGreaterThan(10)
    }
  })

  it('all audioFilename values are unique', () => {
    const filenames = BEDTIME_STORIES.map((s) => s.audioFilename)
    const uniqueFilenames = new Set(filenames)
    expect(uniqueFilenames.size).toBe(12)
  })

  it('all audioFilename values follow expected pattern', () => {
    for (const story of BEDTIME_STORIES) {
      expect(story.audioFilename).toMatch(/^stories\/[\w-]+\.mp3$/)
    }
  })
})
