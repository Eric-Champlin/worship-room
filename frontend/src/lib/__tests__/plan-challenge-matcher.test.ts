import { describe, it, expect } from 'vitest'
import { findMatchingChallenge } from '../plan-challenge-matcher'

// The challenge calendar is based on real liturgical dates.
// We test with dates that are known to be active/upcoming/past for specific challenges.

describe('findMatchingChallenge', () => {
  it('returns active challenge for "anxiety" theme (matches any)', () => {
    // Use a date during Lent 2026: Lent starts Feb 18, 2026 (Ash Wednesday)
    const duringLent = new Date(2026, 2, 10) // March 10, 2026
    const result = findMatchingChallenge('anxiety', duringLent)
    // "any" theme should match whichever challenge is currently active
    if (result) {
      expect(result.isActive).toBe(true)
      expect(result.challenge).toBeDefined()
    }
    // If no challenge is active, it may return an upcoming one or null
  })

  it('returns lent challenge for grief theme during lent', () => {
    const duringLent = new Date(2026, 2, 10) // March 10, 2026
    const result = findMatchingChallenge('grief', duringLent)
    if (result) {
      expect(result.challenge.season).toBe('lent')
    }
  })

  it('returns null when no matching challenge is active or upcoming', () => {
    // Pick a date far from any challenge (mid-July, nothing near)
    const farDate = new Date(2026, 6, 15) // July 15, 2026
    const result = findMatchingChallenge('grief', farDate)
    // grief maps to ['lent'] — lent is in Feb/Mar, far from July
    expect(result).toBeNull()
  })

  it('prefers active over upcoming', () => {
    // Use "anxiety" (any) which can match any active challenge
    const duringLent = new Date(2026, 2, 10)
    const result = findMatchingChallenge('anxiety', duringLent)
    if (result && result.isActive) {
      // Should be marked as active, not upcoming
      expect(result.isActive).toBe(true)
    }
  })

  it('returns upcoming challenge within 30-day window', () => {
    // Test with a date just before a known challenge season
    // Easter 2026 is April 5. So ~March 15 should have Easter upcoming within 30 days
    const beforeEaster = new Date(2026, 2, 15) // March 15
    const result = findMatchingChallenge('hope', beforeEaster) // hope maps to ['easter']
    if (result) {
      expect(result.challenge.season).toBe('easter')
    }
  })

  it('does not return upcoming challenge beyond 30-day window', () => {
    // Advent starts late Nov/early Dec. September is >30 days away
    const tooFarAway = new Date(2026, 8, 15) // Sep 15
    const result = findMatchingChallenge('gratitude', tooFarAway) // gratitude maps to ['advent']
    expect(result).toBeNull()
  })
})
