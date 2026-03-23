import { describe, expect, it } from 'vitest'

import { CHALLENGES, getChallenge } from '../challenges'

describe('challenges data', () => {
  it('has all 5 challenges', () => {
    expect(CHALLENGES).toHaveLength(5)
  })

  it('each challenge has correct duration', () => {
    const expected: Record<string, number> = {
      'pray40-lenten-journey': 40,
      'easter-joy-resurrection-hope': 7,
      'fire-of-pentecost': 21,
      'advent-awaits': 21,
      'new-year-new-heart': 21,
    }
    for (const challenge of CHALLENGES) {
      expect(challenge.durationDays).toBe(expected[challenge.id])
    }
  })

  it('each challenge has matching dailyContent length', () => {
    for (const challenge of CHALLENGES) {
      expect(challenge.dailyContent).toHaveLength(challenge.durationDays)
    }
  })

  it('day numbers are sequential 1-N for each challenge', () => {
    for (const challenge of CHALLENGES) {
      const dayNumbers = challenge.dailyContent.map((d) => d.dayNumber)
      const expected = Array.from({ length: challenge.durationDays }, (_, i) => i + 1)
      expect(dayNumbers).toEqual(expected)
    }
  })

  it('all 6 action types used across challenges (each uses at least 4)', () => {
    const allActionTypes = ['pray', 'journal', 'meditate', 'music', 'gratitude', 'prayerWall']
    for (const challenge of CHALLENGES) {
      const usedTypes = new Set(challenge.dailyContent.map((d) => d.actionType))
      expect(usedTypes.size).toBeGreaterThanOrEqual(4)
      // All types should be valid
      for (const t of usedTypes) {
        expect(allActionTypes).toContain(t)
      }
    }
  })

  it('Lent start date correct for 2026 (Feb 18 — Ash Wednesday)', () => {
    const lent = CHALLENGES.find((c) => c.id === 'pray40-lenten-journey')!
    const start = lent.getStartDate(2026)
    expect(start.getFullYear()).toBe(2026)
    expect(start.getMonth()).toBe(1) // February
    expect(start.getDate()).toBe(18)
  })

  it('Easter start date correct for 2026 (April 5)', () => {
    const easter = CHALLENGES.find((c) => c.id === 'easter-joy-resurrection-hope')!
    const start = easter.getStartDate(2026)
    expect(start.getFullYear()).toBe(2026)
    expect(start.getMonth()).toBe(3) // April
    expect(start.getDate()).toBe(5)
  })

  it('Pentecost start date correct for 2026 (May 24)', () => {
    const pentecost = CHALLENGES.find((c) => c.id === 'fire-of-pentecost')!
    const start = pentecost.getStartDate(2026)
    expect(start.getFullYear()).toBe(2026)
    expect(start.getMonth()).toBe(4) // May
    expect(start.getDate()).toBe(24)
  })

  it('Advent start date correct for 2026 (Nov 29)', () => {
    const advent = CHALLENGES.find((c) => c.id === 'advent-awaits')!
    const start = advent.getStartDate(2026)
    expect(start.getFullYear()).toBe(2026)
    expect(start.getMonth()).toBe(10) // November
    expect(start.getDate()).toBe(29)
  })

  it('New Year start date for any year is January 1', () => {
    const newYear = CHALLENGES.find((c) => c.id === 'new-year-new-heart')!
    for (const year of [2025, 2026, 2027, 2030]) {
      const start = newYear.getStartDate(year)
      expect(start.getMonth()).toBe(0)
      expect(start.getDate()).toBe(1)
    }
  })

  it('start dates correct for 2027', () => {
    const lent = CHALLENGES.find((c) => c.id === 'pray40-lenten-journey')!
    const easter = CHALLENGES.find((c) => c.id === 'easter-joy-resurrection-hope')!
    // 2027 Easter: March 28
    const easterDate = easter.getStartDate(2027)
    expect(easterDate.getMonth()).toBe(2) // March
    expect(easterDate.getDate()).toBe(28)
    // 2027 Lent: March 28 - 46 = Feb 10
    const lentDate = lent.getStartDate(2027)
    expect(lentDate.getMonth()).toBe(1) // February
    expect(lentDate.getDate()).toBe(10)
  })

  it('all scriptures have reference and text', () => {
    for (const challenge of CHALLENGES) {
      for (const day of challenge.dailyContent) {
        expect(day.scripture.reference).toBeTruthy()
        expect(day.scripture.text).toBeTruthy()
      }
    }
  })

  it('all reflections are non-empty', () => {
    for (const challenge of CHALLENGES) {
      for (const day of challenge.dailyContent) {
        expect(day.reflection.length).toBeGreaterThan(0)
      }
    }
  })

  it('all daily actions are non-empty', () => {
    for (const challenge of CHALLENGES) {
      for (const day of challenge.dailyContent) {
        expect(day.dailyAction.length).toBeGreaterThan(0)
      }
    }
  })

  describe('getChallenge', () => {
    it('returns correct challenge by ID', () => {
      const result = getChallenge('pray40-lenten-journey')
      expect(result).toBeDefined()
      expect(result!.title).toBe('Pray40: A Lenten Journey')
    })

    it('returns undefined for invalid ID', () => {
      const result = getChallenge('nonexistent')
      expect(result).toBeUndefined()
    })
  })
})
