import { describe, it, expect, beforeEach } from 'vitest'
import {
  canShowSurprise,
  markSurpriseShown,
  getShownMilestones,
  markMilestoneShown,
  hasRainbowBeenShown,
  markRainbowShown,
  canShowGratitudeCallback,
  markGratitudeCallbackShown,
  hasMidnightVerseBeenShown,
  markMidnightVerseShown,
  getFirstActivityDate,
  getDaysSinceFirstActivity,
} from '../surprise-storage'
import { getLocalDateString } from '@/utils/date'

// ── Test helpers ────────────────────────────────────────────────────
function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return getLocalDateString(d)
}

// ── Tests ───────────────────────────────────────────────────────────
describe('surprise-storage', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  // ── Frequency limiter ─────────────────────────────────────────────
  describe('canShowSurprise', () => {
    it('returns true when no date stored', () => {
      expect(canShowSurprise()).toBe(true)
    })

    it('returns false when today\'s date stored', () => {
      localStorage.setItem('wr_last_surprise_date', getLocalDateString())
      expect(canShowSurprise()).toBe(false)
    })

    it('returns true when yesterday\'s date stored', () => {
      localStorage.setItem('wr_last_surprise_date', daysAgo(1))
      expect(canShowSurprise()).toBe(true)
    })
  })

  describe('markSurpriseShown', () => {
    it('writes today\'s date', () => {
      markSurpriseShown()
      expect(localStorage.getItem('wr_last_surprise_date')).toBe(getLocalDateString())
    })
  })

  // ── Anniversary milestones ────────────────────────────────────────
  describe('getShownMilestones', () => {
    it('returns empty array when no data', () => {
      expect(getShownMilestones()).toEqual([])
    })

    it('returns stored milestones', () => {
      localStorage.setItem('wr_anniversary_milestones_shown', JSON.stringify([7, 30]))
      expect(getShownMilestones()).toEqual([7, 30])
    })
  })

  describe('markMilestoneShown', () => {
    it('appends to array', () => {
      markMilestoneShown(7)
      markMilestoneShown(30)
      expect(getShownMilestones()).toEqual([7, 30])
    })

    it('does not duplicate existing milestone', () => {
      markMilestoneShown(7)
      markMilestoneShown(7)
      expect(getShownMilestones()).toEqual([7])
    })

    it('handles malformed data gracefully', () => {
      localStorage.setItem('wr_anniversary_milestones_shown', 'garbage')
      markMilestoneShown(7)
      expect(getShownMilestones()).toEqual([7])
    })
  })

  // ── Rainbow ───────────────────────────────────────────────────────
  describe('hasRainbowBeenShown', () => {
    it('returns false initially', () => {
      expect(hasRainbowBeenShown()).toBe(false)
    })

    it('returns true after marking', () => {
      markRainbowShown()
      expect(hasRainbowBeenShown()).toBe(true)
    })
  })

  describe('markRainbowShown', () => {
    it('sets flag', () => {
      markRainbowShown()
      expect(localStorage.getItem('wr_surprise_shown_rainbow')).toBe('true')
    })
  })

  // ── Gratitude callback ────────────────────────────────────────────
  describe('canShowGratitudeCallback', () => {
    it('returns true when never shown', () => {
      expect(canShowGratitudeCallback()).toBe(true)
    })

    it('returns false within 7 days', () => {
      localStorage.setItem('wr_gratitude_callback_last_shown', daysAgo(3))
      expect(canShowGratitudeCallback()).toBe(false)
    })

    it('returns true after 7 days', () => {
      localStorage.setItem('wr_gratitude_callback_last_shown', daysAgo(8))
      expect(canShowGratitudeCallback()).toBe(true)
    })

    it('returns false on exactly day 7 (boundary)', () => {
      localStorage.setItem('wr_gratitude_callback_last_shown', daysAgo(6))
      expect(canShowGratitudeCallback()).toBe(false)
    })

    it('returns true on exactly day 7', () => {
      localStorage.setItem('wr_gratitude_callback_last_shown', daysAgo(7))
      expect(canShowGratitudeCallback()).toBe(true)
    })
  })

  describe('markGratitudeCallbackShown', () => {
    it('writes today\'s date', () => {
      markGratitudeCallbackShown()
      expect(localStorage.getItem('wr_gratitude_callback_last_shown')).toBe(getLocalDateString())
    })
  })

  // ── Midnight Verse (sessionStorage) ───────────────────────────────
  describe('hasMidnightVerseBeenShown', () => {
    it('returns false initially', () => {
      expect(hasMidnightVerseBeenShown()).toBe(false)
    })

    it('returns true after marking', () => {
      markMidnightVerseShown()
      expect(hasMidnightVerseBeenShown()).toBe(true)
    })

    it('uses sessionStorage, not localStorage', () => {
      markMidnightVerseShown()
      expect(sessionStorage.getItem('wr_midnight_verse_shown')).toBe('true')
      expect(localStorage.getItem('wr_midnight_verse_shown')).toBeNull()
    })
  })

  // ── Anniversary stat helpers ──────────────────────────────────────
  describe('getFirstActivityDate', () => {
    it('returns null when no data', () => {
      expect(getFirstActivityDate()).toBeNull()
    })

    it('finds earliest mood entry', () => {
      const entries = [
        { id: '1', date: daysAgo(3), mood: 4, moodLabel: 'Good', timestamp: Date.now() },
        { id: '2', date: daysAgo(7), mood: 3, moodLabel: 'Okay', timestamp: Date.now() },
        { id: '3', date: daysAgo(1), mood: 5, moodLabel: 'Thriving', timestamp: Date.now() },
      ]
      localStorage.setItem('wr_mood_entries', JSON.stringify(entries))
      expect(getFirstActivityDate()).toBe(daysAgo(7))
    })

    it('finds earliest activity entry', () => {
      const activities = {
        [daysAgo(5)]: { mood: true },
        [daysAgo(10)]: { pray: true },
        [daysAgo(2)]: { journal: true },
      }
      localStorage.setItem('wr_daily_activities', JSON.stringify(activities))
      expect(getFirstActivityDate()).toBe(daysAgo(10))
    })

    it('compares across mood and activity data', () => {
      const entries = [{ id: '1', date: daysAgo(5), mood: 4, moodLabel: 'Good', timestamp: Date.now() }]
      const activities = { [daysAgo(12)]: { mood: true } }
      localStorage.setItem('wr_mood_entries', JSON.stringify(entries))
      localStorage.setItem('wr_daily_activities', JSON.stringify(activities))
      expect(getFirstActivityDate()).toBe(daysAgo(12))
    })

    it('handles malformed mood data', () => {
      localStorage.setItem('wr_mood_entries', 'not json')
      expect(getFirstActivityDate()).toBeNull()
    })
  })

  describe('getDaysSinceFirstActivity', () => {
    it('returns null when no data', () => {
      expect(getDaysSinceFirstActivity()).toBeNull()
    })

    it('calculates correctly for 7 days', () => {
      const entries = [{ id: '1', date: daysAgo(7), mood: 4, moodLabel: 'Good', timestamp: Date.now() }]
      localStorage.setItem('wr_mood_entries', JSON.stringify(entries))
      expect(getDaysSinceFirstActivity()).toBe(7)
    })

    it('returns 0 for first activity today', () => {
      const entries = [{ id: '1', date: getLocalDateString(), mood: 4, moodLabel: 'Good', timestamp: Date.now() }]
      localStorage.setItem('wr_mood_entries', JSON.stringify(entries))
      expect(getDaysSinceFirstActivity()).toBe(0)
    })
  })
})
