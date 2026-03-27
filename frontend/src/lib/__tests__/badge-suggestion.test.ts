import { describe, it, expect } from 'vitest'
import { getBadgeSuggestion } from '../badge-suggestion'

describe('getBadgeSuggestion', () => {
  it('returns null for level badges', () => {
    expect(getBadgeSuggestion('level_3', 'level')).toBeNull()
  })

  it('returns null for special badges', () => {
    expect(getBadgeSuggestion('full_worship_day', 'special')).toBeNull()
  })

  it('returns reading plan suggestion for streak badges', () => {
    const result = getBadgeSuggestion('streak_7', 'streak')
    expect(result).not.toBeNull()
    expect(result!.link).toBe('/grow?tab=plans')
  })

  it('returns pray suggestion for prayer badges', () => {
    const result = getBadgeSuggestion('first_prayer', 'activity')
    expect(result).not.toBeNull()
    expect(result!.link).toBe('/daily?tab=pray')
  })

  it('returns bible suggestion for journal badges', () => {
    const result = getBadgeSuggestion('journal_50', 'activity')
    expect(result).not.toBeNull()
    expect(result!.link).toBe('/bible')
  })

  it('returns insights suggestion for meditation badges', () => {
    const result = getBadgeSuggestion('meditate_25', 'activity')
    expect(result).not.toBeNull()
    expect(result!.link).toBe('/insights')
  })

  it('returns music suggestion for listen badges', () => {
    const result = getBadgeSuggestion('first_listen', 'activity')
    expect(result).not.toBeNull()
    expect(result!.link).toBe('/music')
  })

  it('returns challenge suggestion for community badges', () => {
    const result = getBadgeSuggestion('first_friend', 'community')
    expect(result).not.toBeNull()
    expect(result!.link).toBe('/grow?tab=challenges')
  })

  it('returns plan suggestion for bible_book badges', () => {
    const result = getBadgeSuggestion('bible_book_5', 'activity')
    expect(result).not.toBeNull()
    expect(result!.link).toBe('/grow?tab=plans')
  })

  it('returns plan suggestion for challenge badges', () => {
    const result = getBadgeSuggestion('challenge_lent', 'challenge')
    expect(result).not.toBeNull()
    expect(result!.link).toBe('/grow?tab=plans')
  })

  it('returns plan suggestion for reading plan badges', () => {
    const result = getBadgeSuggestion('first_plan', 'activity')
    expect(result).not.toBeNull()
    expect(result!.link).toBe('/grow?tab=plans')
  })

  it('returns challenge suggestion for prayer wall badges', () => {
    const result = getBadgeSuggestion('first_prayerwall', 'activity')
    expect(result).not.toBeNull()
    expect(result!.link).toBe('/grow?tab=challenges')
  })
})
