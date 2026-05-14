import { describe, it, expect, beforeEach } from 'vitest'
import {
  getVerseDismissals,
  incrementDismissalCount,
  resetDismissalCount,
  markPromptShown,
  VERSE_DISMISSALS_KEY,
} from '../verse-dismissals-storage'

beforeEach(() => {
  localStorage.clear()
})

describe('getVerseDismissals', () => {
  it('returns zeroed shape when key is absent', () => {
    expect(getVerseDismissals()).toEqual({ count: 0, promptShown: false })
  })

  it('returns zeroed shape on corrupt JSON', () => {
    localStorage.setItem(VERSE_DISMISSALS_KEY, '{not-valid-json')
    expect(getVerseDismissals()).toEqual({ count: 0, promptShown: false })
  })

  it('coerces missing/invalid count to 0', () => {
    localStorage.setItem(VERSE_DISMISSALS_KEY, JSON.stringify({ count: 'oops' }))
    expect(getVerseDismissals()).toEqual({ count: 0, promptShown: false })
  })

  it('coerces missing promptShown to false', () => {
    localStorage.setItem(VERSE_DISMISSALS_KEY, JSON.stringify({ count: 2 }))
    expect(getVerseDismissals()).toEqual({ count: 2, promptShown: false })
  })
})

describe('incrementDismissalCount', () => {
  it('starts at 1 from empty state and persists', () => {
    const result = incrementDismissalCount()
    expect(result).toEqual({ count: 1, promptShown: false })
    expect(getVerseDismissals().count).toBe(1)
  })

  it('reaches 3 after three increments', () => {
    incrementDismissalCount()
    incrementDismissalCount()
    const third = incrementDismissalCount()
    expect(third.count).toBe(3)
  })

  it('preserves promptShown across increments', () => {
    markPromptShown()
    const result = incrementDismissalCount()
    expect(result.promptShown).toBe(true)
  })
})

describe('resetDismissalCount', () => {
  it('zeroes count + promptShown after engagement', () => {
    incrementDismissalCount()
    incrementDismissalCount()
    markPromptShown()
    resetDismissalCount()
    expect(getVerseDismissals()).toEqual({ count: 0, promptShown: false })
  })
})

describe('markPromptShown', () => {
  it('sets promptShown without altering count', () => {
    incrementDismissalCount()
    incrementDismissalCount()
    markPromptShown()
    expect(getVerseDismissals()).toEqual({ count: 2, promptShown: true })
  })
})
