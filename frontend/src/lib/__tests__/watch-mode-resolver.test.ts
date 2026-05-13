import { describe, it, expect } from 'vitest'
import { isWatchHour, resolveWatchModeActive } from '../watch-mode-resolver'

describe('isWatchHour', () => {
  it('returns true for the 6 Watch hours (23, 0, 1, 2, 3, 4)', () => {
    expect(isWatchHour(23)).toBe(true)
    expect(isWatchHour(0)).toBe(true)
    expect(isWatchHour(1)).toBe(true)
    expect(isWatchHour(2)).toBe(true)
    expect(isWatchHour(3)).toBe(true)
    expect(isWatchHour(4)).toBe(true)
  })

  it('returns false for daytime hours (5, 6, 12, 22)', () => {
    expect(isWatchHour(5)).toBe(false)
    expect(isWatchHour(6)).toBe(false)
    expect(isWatchHour(12)).toBe(false)
    expect(isWatchHour(22)).toBe(false)
  })

  it('treats 23 as inclusive start and 5 as exclusive end', () => {
    expect(isWatchHour(23)).toBe(true)
    expect(isWatchHour(5)).toBe(false)
  })

  it('returns false for invalid inputs (negative, fractional, NaN, ≥24)', () => {
    expect(isWatchHour(-1)).toBe(false)
    expect(isWatchHour(24)).toBe(false)
    expect(isWatchHour(25)).toBe(false)
    expect(isWatchHour(3.5)).toBe(false)
    expect(isWatchHour(Number.NaN)).toBe(false)
  })
})

describe('resolveWatchModeActive', () => {
  it("returns false for 'off' preference regardless of hour or night state", () => {
    expect(resolveWatchModeActive('off', 23, true)).toBe(false)
    expect(resolveWatchModeActive('off', 0, true)).toBe(false)
    expect(resolveWatchModeActive('off', 12, false)).toBe(false)
  })

  it("returns true for 'on' during Watch hours, regardless of Night Mode", () => {
    expect(resolveWatchModeActive('on', 23, false)).toBe(true)
    expect(resolveWatchModeActive('on', 2, false)).toBe(true)
    expect(resolveWatchModeActive('on', 4, true)).toBe(true)
  })

  it("returns false for 'on' outside Watch hours", () => {
    expect(resolveWatchModeActive('on', 12, true)).toBe(false)
    expect(resolveWatchModeActive('on', 22, true)).toBe(false)
    expect(resolveWatchModeActive('on', 5, true)).toBe(false)
  })

  it("returns true for 'auto' only when both Watch hours AND Night Mode active", () => {
    expect(resolveWatchModeActive('auto', 23, true)).toBe(true)
    expect(resolveWatchModeActive('auto', 2, true)).toBe(true)
  })

  it("returns false for 'auto' when Watch hours but Night Mode off", () => {
    expect(resolveWatchModeActive('auto', 23, false)).toBe(false)
    expect(resolveWatchModeActive('auto', 3, false)).toBe(false)
  })

  it("returns false for 'auto' when Night Mode on but outside Watch hours", () => {
    expect(resolveWatchModeActive('auto', 12, true)).toBe(false)
    expect(resolveWatchModeActive('auto', 22, true)).toBe(false)
  })
})
