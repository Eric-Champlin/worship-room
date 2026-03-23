import { describe, expect, it } from 'vitest'

import {
  ACTION_TYPE_ROUTES,
  getCommunityGoalProgress,
  getParticipantCount,
} from '../challenges'

describe('challenges constants', () => {
  describe('getParticipantCount', () => {
    it('returns a deterministic value for the same inputs', () => {
      const result1 = getParticipantCount('pray40-lenten-journey', 10)
      const result2 = getParticipantCount('pray40-lenten-journey', 10)
      expect(result1).toBe(result2)
    })

    it('caps at 2000', () => {
      const result = getParticipantCount('pray40-lenten-journey', 1000)
      expect(result).toBe(2000)
    })

    it('returns a positive number for valid inputs', () => {
      const result = getParticipantCount('test', 1)
      expect(result).toBeGreaterThan(0)
    })
  })

  describe('getCommunityGoalProgress', () => {
    it('caps at goalNumber', () => {
      const result = getCommunityGoalProgress(5000, 10000)
      expect(result).toBe(10000)
    })

    it('returns participantCount * 3 when below goal', () => {
      const result = getCommunityGoalProgress(100, 10000)
      expect(result).toBe(300)
    })
  })

  describe('ACTION_TYPE_ROUTES', () => {
    it('maps all 6 action types to valid routes', () => {
      const expectedKeys = ['pray', 'journal', 'meditate', 'music', 'gratitude', 'prayerWall']
      expect(Object.keys(ACTION_TYPE_ROUTES)).toEqual(expect.arrayContaining(expectedKeys))
      expect(Object.keys(ACTION_TYPE_ROUTES)).toHaveLength(6)
    })

    it('all routes start with /', () => {
      for (const route of Object.values(ACTION_TYPE_ROUTES)) {
        expect(route).toMatch(/^\//)
      }
    })
  })
})
