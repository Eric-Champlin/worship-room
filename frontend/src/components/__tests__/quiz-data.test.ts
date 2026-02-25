import { describe, it, expect } from 'vitest'
import {
  QUIZ_QUESTIONS,
  QUIZ_DESTINATIONS,
  FEATURE_KEYS,
  calculateResult,
} from '@/components/quiz-data'

describe('Quiz Data Constants', () => {
  it('QUIZ_QUESTIONS has exactly 5 questions', () => {
    expect(QUIZ_QUESTIONS).toHaveLength(5)
  })

  it('each question has exactly 4 options', () => {
    for (const q of QUIZ_QUESTIONS) {
      expect(q.options).toHaveLength(4)
    }
  })

  it('QUIZ_DESTINATIONS has exactly 7 entries', () => {
    expect(QUIZ_DESTINATIONS).toHaveLength(7)
  })

  it('each destination has required fields', () => {
    for (const d of QUIZ_DESTINATIONS) {
      expect(d.key).toBeTruthy()
      expect(d.name).toBeTruthy()
      expect(d.route).toBeTruthy()
      expect(d.ctaLabel).toBeTruthy()
      expect(d.description.length).toBeGreaterThan(0)
      expect(d.verse.length).toBeGreaterThan(0)
      expect(d.verseReference.length).toBeGreaterThan(0)
    }
  })

  it('FEATURE_KEYS starts with pray for tiebreaker', () => {
    expect(FEATURE_KEYS[0]).toBe('pray')
  })
})

describe('calculateResult', () => {
  it('returns Pray when first options are selected for all questions', () => {
    // [0,0,0,0,0]: pray=2+2+3+1+0=8
    const result = calculateResult([0, 0, 0, 0, 0])
    expect(result.key).toBe('pray')
  })

  it('returns Journal when journal-heavy answers are selected', () => {
    // [1,2,1,0,0]: journal=1+2+3+1+1=8
    const result = calculateResult([1, 2, 1, 0, 0])
    expect(result.key).toBe('journal')
  })

  it('returns Music when music-heavy answers are selected', () => {
    // [2,0,3,1,1]: music=2+1+3+1+1=8
    const result = calculateResult([2, 0, 3, 1, 1])
    expect(result.key).toBe('music')
  })

  it('returns Meditate when meditate-heavy answers are selected', () => {
    // [1,1,2,2,2]: meditate=2+2+3+0+1=8
    const result = calculateResult([1, 1, 2, 2, 2])
    expect(result.key).toBe('meditate')
  })

  it('returns Prayer Wall when prayerWall-heavy answers are selected', () => {
    // [3,3,0,3,0]: prayerWall=0+2+0+1+2=5, pray=1+0+3+0+0=4
    const result = calculateResult([3, 3, 0, 3, 0])
    expect(result.key).toBe('prayerWall')
  })

  it('returns Sleep & Rest with partial answers', () => {
    // Only Q4 opt 2 gives sleepRest points (sleepRest=2, music=1)
    const result = calculateResult([null, null, null, 2, null])
    expect(result.key).toBe('sleepRest')
  })

  it('returns Pray on tiebreaker when pray ties with another feature', () => {
    // [1,1,0,1,2]: pray=0+0+3+1+1=5, meditate=2+2+0+0+1=5 → tie → pray wins
    const result = calculateResult([1, 1, 0, 1, 2])
    expect(result.key).toBe('pray')
  })

  it('returns Pray when all answers are null (all scores zero, tiebreaker)', () => {
    const result = calculateResult([null, null, null, null, null])
    expect(result.key).toBe('pray')
  })

  it('handles partial answers and returns a valid destination', () => {
    const result = calculateResult([0, null, 2, null, 3])
    expect(QUIZ_DESTINATIONS).toContainEqual(result)
  })

  it('returns a destination that exists in QUIZ_DESTINATIONS', () => {
    const result = calculateResult([2, 3, 1, 0, 1])
    expect(QUIZ_DESTINATIONS.find((d) => d.key === result.key)).toBeDefined()
  })
})
