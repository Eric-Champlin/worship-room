import { describe, it, expect, beforeEach, vi } from 'vitest'
import { isOnboardingComplete, setOnboardingComplete } from '../onboarding-storage'

beforeEach(() => {
  localStorage.clear()
})

describe('isOnboardingComplete', () => {
  it('returns false when key not set', () => {
    expect(isOnboardingComplete()).toBe(false)
  })

  it('returns true when key is "true"', () => {
    localStorage.setItem('wr_onboarding_complete', 'true')
    expect(isOnboardingComplete()).toBe(true)
  })

  it('returns false for other values', () => {
    localStorage.setItem('wr_onboarding_complete', 'false')
    expect(isOnboardingComplete()).toBe(false)

    localStorage.setItem('wr_onboarding_complete', '1')
    expect(isOnboardingComplete()).toBe(false)
  })

  it('returns false when localStorage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    expect(isOnboardingComplete()).toBe(false)
    vi.restoreAllMocks()
  })
})

describe('setOnboardingComplete', () => {
  it('sets key to "true"', () => {
    setOnboardingComplete()
    expect(localStorage.getItem('wr_onboarding_complete')).toBe('true')
  })

  it('does not throw when localStorage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    expect(() => setOnboardingComplete()).not.toThrow()
    vi.restoreAllMocks()
  })
})
