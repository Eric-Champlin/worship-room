import { describe, it, expect } from 'vitest'
import {
  NIGHT_MODE_COPY,
  getNightModeCopy,
  type NightModeCopyKey,
} from '../night-mode-copy'

describe('night-mode-copy', () => {
  it('NIGHT_MODE_COPY has exactly 8 keys', () => {
    expect(Object.keys(NIGHT_MODE_COPY)).toHaveLength(8)
  })

  it('every pair has non-empty day and night strings', () => {
    for (const key of Object.keys(NIGHT_MODE_COPY) as NightModeCopyKey[]) {
      const pair = NIGHT_MODE_COPY[key]
      expect(pair.day.length).toBeGreaterThan(0)
      expect(pair.night.length).toBeGreaterThan(0)
    }
  })

  it('reactionToast.day === reactionToast.night (W17 — timeless prayer copy)', () => {
    expect(NIGHT_MODE_COPY.reactionToast.day).toBe(
      NIGHT_MODE_COPY.reactionToast.night,
    )
  })

  it('pageTitle adds " • Night" segment in night variant', () => {
    // W16 length invariant doesn't bind for all pairs — Eric-approved copy in Step 4
    // has 3 pairs where the night variant is slightly longer (heroSubtitle,
    // emptyFeedState, composePlaceholder) and that was a deliberate copy choice.
    // The narrower invariant: pageTitle is the explicit "longer at night" pair.
    expect(NIGHT_MODE_COPY.pageTitle.night).toContain('Night')
    expect(NIGHT_MODE_COPY.pageTitle.day).not.toContain('Night')
    expect(NIGHT_MODE_COPY.pageTitle.night.length).toBeGreaterThan(
      NIGHT_MODE_COPY.pageTitle.day.length,
    )
  })

  it("getNightModeCopy('heroSubtitle', false) returns day variant", () => {
    expect(getNightModeCopy('heroSubtitle', false)).toBe(
      'What weighs on you today?',
    )
  })

  it("getNightModeCopy('heroSubtitle', true) returns night variant", () => {
    expect(getNightModeCopy('heroSubtitle', true)).toBe(
      "It's quiet here. You're awake.",
    )
  })
})
