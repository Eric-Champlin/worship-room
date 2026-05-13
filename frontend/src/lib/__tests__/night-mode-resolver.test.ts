import { describe, it, expect } from 'vitest'
import { isNightHour, resolveNightModeActive } from '../night-mode-resolver'

describe('night-mode-resolver — isNightHour', () => {
  it('returns true for night hours [21..23] ∪ [0..5]', () => {
    const nightHours = [21, 22, 23, 0, 1, 2, 3, 4, 5]
    for (const h of nightHours) {
      expect(isNightHour(h)).toBe(true)
    }
  })

  it('returns false for day hours [6..20]', () => {
    const dayHours = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]
    for (const h of dayHours) {
      expect(isNightHour(h)).toBe(false)
    }
  })

  it('isNightHour(6) === false (exclusive end-of-window)', () => {
    expect(isNightHour(6)).toBe(false)
  })

  it('isNightHour(21) === true (inclusive start-of-window)', () => {
    expect(isNightHour(21)).toBe(true)
  })
})

describe('night-mode-resolver — resolveNightModeActive', () => {
  it('manual "on" overrides day hour', () => {
    expect(resolveNightModeActive('on', 14)).toBe(true)
  })

  it('manual "off" overrides night hour', () => {
    expect(resolveNightModeActive('off', 23)).toBe(false)
  })

  it('"auto" at a night hour returns true', () => {
    expect(resolveNightModeActive('auto', 23)).toBe(true)
  })

  it('"auto" at a day hour returns false', () => {
    expect(resolveNightModeActive('auto', 14)).toBe(false)
  })
})
