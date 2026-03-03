import { describe, it, expect } from 'vitest'
import { calculateDistanceMiles } from '../geo'

describe('calculateDistanceMiles', () => {
  it('returns 0 for same coordinates', () => {
    expect(calculateDistanceMiles(35.6, -87.0, 35.6, -87.0)).toBe(0)
  })

  it('returns ~45 miles for Columbia to Nashville', () => {
    // Columbia, TN (35.6151, -87.0353) to Nashville, TN (36.1627, -86.7816)
    const distance = calculateDistanceMiles(35.6151, -87.0353, 36.1627, -86.7816)
    expect(distance).toBeGreaterThan(40)
    expect(distance).toBeLessThan(50)
  })

  it('handles negative coordinates', () => {
    const distance = calculateDistanceMiles(-33.8688, 151.2093, -37.8136, 144.9631)
    expect(distance).toBeGreaterThan(0)
    expect(Number.isNaN(distance)).toBe(false)
  })

  it('returns reasonable distance for nearby points', () => {
    // ~1 mile offset
    const distance = calculateDistanceMiles(35.6151, -87.0353, 35.6296, -87.0353)
    expect(distance).toBeGreaterThan(0.5)
    expect(distance).toBeLessThan(2)
  })
})
