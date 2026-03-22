import { describe, it, expect } from 'vitest'
import {
  QUESTION_OF_THE_DAY_POOL,
  QUESTION_THEMES,
  getTodaysQuestion,
  type QuestionOfTheDay,
} from '../question-of-the-day'

const VALID_THEMES: QuestionOfTheDay['theme'][] = [
  'faith_journey', 'practical', 'reflective', 'encouraging', 'community', 'seasonal',
]

describe('QUESTION_OF_THE_DAY_POOL', () => {
  it('has exactly 60 questions', () => {
    expect(QUESTION_OF_THE_DAY_POOL).toHaveLength(60)
  })

  it('has 10 questions per theme', () => {
    const counts: Record<string, number> = {}
    for (const q of QUESTION_OF_THE_DAY_POOL) {
      counts[q.theme] = (counts[q.theme] || 0) + 1
    }
    for (const theme of VALID_THEMES) {
      expect(counts[theme]).toBe(10)
    }
  })

  it('all questions have required fields', () => {
    for (const q of QUESTION_OF_THE_DAY_POOL) {
      expect(q.id).toBeTruthy()
      expect(typeof q.id).toBe('string')
      expect(q.text).toBeTruthy()
      expect(typeof q.text).toBe('string')
      expect(VALID_THEMES).toContain(q.theme)
    }
  })

  it('has unique IDs', () => {
    const ids = QUESTION_OF_THE_DAY_POOL.map((q) => q.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(ids.length)
  })

  it('QUESTION_THEMES contains all 6 themes', () => {
    expect(QUESTION_THEMES).toHaveLength(6)
    for (const theme of VALID_THEMES) {
      expect(QUESTION_THEMES).toContain(theme)
    }
  })
})

describe('getTodaysQuestion', () => {
  it('is deterministic — same date returns same question', () => {
    const date = new Date(2026, 2, 22) // March 22, 2026
    const q1 = getTodaysQuestion(date)
    const q2 = getTodaysQuestion(date)
    expect(q1).toBe(q2)
  })

  it('different days return different questions', () => {
    const day1 = new Date(2026, 2, 22)
    const day2 = new Date(2026, 2, 23)
    const q1 = getTodaysQuestion(day1)
    const q2 = getTodaysQuestion(day2)
    expect(q1).not.toBe(q2)
  })

  it('handles year boundaries — Dec 31', () => {
    const dec31 = new Date(2026, 11, 31)
    const question = getTodaysQuestion(dec31)
    expect(question).toBeDefined()
    expect(question.text).toBeTruthy()
  })

  it('handles year boundaries — Jan 1', () => {
    const jan1 = new Date(2027, 0, 1)
    const question = getTodaysQuestion(jan1)
    expect(question).toBeDefined()
    expect(question.text).toBeTruthy()
  })

  it('uses local date, not UTC', () => {
    // 11:30 PM local time
    const lateNight = new Date(2026, 2, 22, 23, 30, 0)
    const q1 = getTodaysQuestion(lateNight)

    // 12:30 AM next day local time
    const earlyMorning = new Date(2026, 2, 23, 0, 30, 0)
    const q2 = getTodaysQuestion(earlyMorning)

    // Different local days → different questions
    expect(q1).not.toBe(q2)
  })

  it('defaults to current date when no argument provided', () => {
    const question = getTodaysQuestion()
    expect(question).toBeDefined()
    expect(VALID_THEMES).toContain(question.theme)
  })
})
