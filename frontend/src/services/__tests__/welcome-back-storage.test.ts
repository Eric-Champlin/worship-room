import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  getDaysSinceLastActive,
  shouldShowWelcomeBack,
  markWelcomeBackShown,
} from '../welcome-back-storage'

// Mock getLocalDateString to control "today"
vi.mock('@/utils/date', () => ({
  getLocalDateString: vi.fn(() => '2026-03-30'),
}))

describe('welcome-back-storage', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getDaysSinceLastActive', () => {
    it('returns null when no wr_streak data', () => {
      expect(getDaysSinceLastActive()).toBeNull()
    })

    it('returns null when wr_streak is malformed', () => {
      localStorage.setItem('wr_streak', 'not-json')
      expect(getDaysSinceLastActive()).toBeNull()
    })

    it('returns null when lastActiveDate is missing', () => {
      localStorage.setItem('wr_streak', JSON.stringify({ currentStreak: 5 }))
      expect(getDaysSinceLastActive()).toBeNull()
    })

    it('returns 0 when lastActiveDate is today', () => {
      localStorage.setItem(
        'wr_streak',
        JSON.stringify({ lastActiveDate: '2026-03-30' })
      )
      expect(getDaysSinceLastActive()).toBe(0)
    })

    it('returns correct day count for 3 days ago', () => {
      localStorage.setItem(
        'wr_streak',
        JSON.stringify({ lastActiveDate: '2026-03-27' })
      )
      expect(getDaysSinceLastActive()).toBe(3)
    })

    it('returns correct day count for 7 days ago', () => {
      localStorage.setItem(
        'wr_streak',
        JSON.stringify({ lastActiveDate: '2026-03-23' })
      )
      expect(getDaysSinceLastActive()).toBe(7)
    })

    it('returns 0 for future date', () => {
      localStorage.setItem(
        'wr_streak',
        JSON.stringify({ lastActiveDate: '2026-04-01' })
      )
      expect(getDaysSinceLastActive()).toBe(0)
    })
  })

  describe('shouldShowWelcomeBack', () => {
    it('returns false when no data', () => {
      expect(shouldShowWelcomeBack()).toBe(false)
    })

    it('returns false when < 3 days', () => {
      localStorage.setItem(
        'wr_streak',
        JSON.stringify({ lastActiveDate: '2026-03-28' })
      )
      expect(shouldShowWelcomeBack()).toBe(false)
    })

    it('returns true when exactly 3 days (boundary)', () => {
      localStorage.setItem(
        'wr_streak',
        JSON.stringify({ lastActiveDate: '2026-03-27' })
      )
      expect(shouldShowWelcomeBack()).toBe(true)
    })

    it('returns true when >= 3 days', () => {
      localStorage.setItem(
        'wr_streak',
        JSON.stringify({ lastActiveDate: '2026-03-23' })
      )
      expect(shouldShowWelcomeBack()).toBe(true)
    })

    it('returns false when already shown this session', () => {
      localStorage.setItem(
        'wr_streak',
        JSON.stringify({ lastActiveDate: '2026-03-23' })
      )
      sessionStorage.setItem('wr_welcome_back_shown', 'true')
      expect(shouldShowWelcomeBack()).toBe(false)
    })
  })

  describe('markWelcomeBackShown', () => {
    it('sets sessionStorage', () => {
      markWelcomeBackShown()
      expect(sessionStorage.getItem('wr_welcome_back_shown')).toBe('true')
    })
  })
})
