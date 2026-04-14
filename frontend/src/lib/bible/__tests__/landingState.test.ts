import { describe, expect, it, beforeEach, vi } from 'vitest'
import { getLastRead, getActivePlans, getBibleStreak } from '../landingState'
import { _resetForTesting as resetStreakStore } from '../streakStore'

describe('landingState', () => {
  beforeEach(() => {
    localStorage.clear()
    resetStreakStore()
    vi.resetModules()
  })

  describe('getLastRead', () => {
    it('returns null when key missing', () => {
      expect(getLastRead()).toBeNull()
    })

    it('parses valid data', () => {
      const data = { book: 'John', chapter: 3, verse: 16, timestamp: Date.now() }
      localStorage.setItem('wr_bible_last_read', JSON.stringify(data))
      expect(getLastRead()).toEqual(data)
    })

    it('returns null for malformed JSON', () => {
      localStorage.setItem('wr_bible_last_read', '{bad json')
      expect(getLastRead()).toBeNull()
    })

    it('returns null for missing required fields', () => {
      localStorage.setItem('wr_bible_last_read', JSON.stringify({ verse: 1 }))
      expect(getLastRead()).toBeNull()
    })
  })

  describe('getActivePlans', () => {
    it('returns empty array when key missing', () => {
      expect(getActivePlans()).toEqual([])
    })

    it('parses valid array', () => {
      const plans = [
        {
          planId: 'plan-1',
          currentDay: 3,
          totalDays: 14,
          planName: 'Gospel of John',
          todayReading: 'John 3:1-21',
          startedAt: Date.now(),
        },
      ]
      localStorage.setItem('wr_bible_active_plans', JSON.stringify(plans))
      expect(getActivePlans()).toEqual(plans)
    })

    it('returns empty array for non-array JSON', () => {
      localStorage.setItem('wr_bible_active_plans', '"hello"')
      expect(getActivePlans()).toEqual([])
    })
  })

  describe('getBibleStreak', () => {
    it('returns null when no streak data', () => {
      expect(getBibleStreak()).toBeNull()
    })

    it('returns BibleStreak shape from store', () => {
      localStorage.setItem(
        'bible:streak',
        JSON.stringify({
          currentStreak: 7,
          longestStreak: 7,
          lastReadDate: '2026-04-07',
          streakStartDate: '2026-04-01',
          graceDaysAvailable: 1,
          graceDaysUsedThisWeek: 0,
          lastGraceUsedDate: null,
          weekResetDate: '2026-04-06',
          milestones: [3, 7],
          totalDaysRead: 7,
        }),
      )
      expect(getBibleStreak()).toEqual({ count: 7, lastReadDate: '2026-04-07' })
    })

    it('returns null when currentStreak is 0', () => {
      localStorage.setItem(
        'bible:streak',
        JSON.stringify({
          currentStreak: 0,
          longestStreak: 5,
          lastReadDate: '2026-04-05',
          streakStartDate: '',
          graceDaysAvailable: 1,
          graceDaysUsedThisWeek: 0,
          lastGraceUsedDate: null,
          weekResetDate: '',
          milestones: [3],
          totalDaysRead: 5,
        }),
      )
      expect(getBibleStreak()).toBeNull()
    })
  })
})
