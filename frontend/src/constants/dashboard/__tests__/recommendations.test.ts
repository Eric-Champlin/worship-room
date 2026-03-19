import { describe, it, expect } from 'vitest'
import { MOOD_RECOMMENDATIONS } from '../recommendations'
import type { MoodValue } from '@/types/dashboard'

const ALL_MOOD_VALUES: MoodValue[] = [1, 2, 3, 4, 5]

const VALID_ROUTE_PREFIXES = [
  '/daily',
  '/music',
  '/prayer-wall',
  '/meditate/',
  '/friends',
]

describe('MOOD_RECOMMENDATIONS', () => {
  it('has entries for all 5 mood values', () => {
    for (const mood of ALL_MOOD_VALUES) {
      expect(MOOD_RECOMMENDATIONS[mood]).toBeDefined()
      expect(MOOD_RECOMMENDATIONS[mood]).toHaveLength(3)
    }
  })

  it('each recommendation has required fields', () => {
    for (const mood of ALL_MOOD_VALUES) {
      for (const rec of MOOD_RECOMMENDATIONS[mood]) {
        expect(rec.title).toBeTruthy()
        expect(typeof rec.title).toBe('string')
        expect(rec.description).toBeTruthy()
        expect(typeof rec.description).toBe('string')
        expect(rec.icon).toBeTruthy()
        expect(typeof rec.icon).toBe('string')
        expect(rec.route).toBeTruthy()
        expect(typeof rec.route).toBe('string')
      }
    }
  })

  it('all routes are valid app routes', () => {
    for (const mood of ALL_MOOD_VALUES) {
      for (const rec of MOOD_RECOMMENDATIONS[mood]) {
        expect(rec.route.startsWith('/')).toBe(true)
        const matchesKnownRoute = VALID_ROUTE_PREFIXES.some((prefix) =>
          rec.route.startsWith(prefix),
        )
        expect(matchesKnownRoute).toBe(true)
      }
    }
  })

  it('Struggling suggestions match spec', () => {
    const struggling = MOOD_RECOMMENDATIONS[1]
    expect(struggling[0].title).toBe('Talk to God')
    expect(struggling[0].route).toBe('/daily?tab=pray')
    expect(struggling[1].title).toBe('Find Comfort in Scripture')
    expect(struggling[1].route).toBe('/music?tab=sleep')
    expect(struggling[2].title).toBe("You're Not Alone")
    expect(struggling[2].route).toBe('/prayer-wall')
  })

  it('Thriving suggestions match spec', () => {
    const thriving = MOOD_RECOMMENDATIONS[5]
    expect(thriving[0].title).toBe('Celebrate with Worship')
    expect(thriving[0].route).toBe('/music?tab=playlists')
    expect(thriving[1].title).toBe('Share Your Joy')
    expect(thriving[1].route).toBe('/prayer-wall')
    expect(thriving[2].title).toBe('Pour into Others')
    expect(thriving[2].route).toBe('/friends')
  })
})
