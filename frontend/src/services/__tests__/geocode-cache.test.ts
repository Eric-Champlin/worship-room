import { beforeEach, describe, expect, it } from 'vitest'
import { geocodeCache } from '../geocode-cache'

beforeEach(() => {
  geocodeCache.clear()
})

describe('geocodeCache', () => {
  it('returns undefined for a cache miss', () => {
    expect(geocodeCache.get('unseen')).toBeUndefined()
  })

  it('returns coords for a cached hit', () => {
    geocodeCache.set('nashville tn', { lat: 36.16, lng: -86.78 })
    expect(geocodeCache.get('nashville tn')).toEqual({ lat: 36.16, lng: -86.78 })
  })

  it('caches negative results as null (distinct from undefined miss)', () => {
    geocodeCache.set('asdfghjkl', null)
    expect(geocodeCache.get('asdfghjkl')).toBeNull()
    expect(geocodeCache.get('never-set')).toBeUndefined()
  })

  it('normalizes keys case-insensitively', () => {
    geocodeCache.set('Nashville TN', { lat: 36.16, lng: -86.78 })
    expect(geocodeCache.get('nashville tn')).toEqual({ lat: 36.16, lng: -86.78 })
    expect(geocodeCache.get('NASHVILLE TN')).toEqual({ lat: 36.16, lng: -86.78 })
  })

  it('trims whitespace on keys', () => {
    geocodeCache.set('  Columbia  ', { lat: 35.61, lng: -87.03 })
    expect(geocodeCache.get('Columbia')).toEqual({ lat: 35.61, lng: -87.03 })
    expect(geocodeCache.get('columbia')).toEqual({ lat: 35.61, lng: -87.03 })
  })

  it('evicts oldest entry when inserting beyond 50-entry cap', () => {
    for (let i = 0; i < 50; i++) {
      geocodeCache.set(`query-${i}`, { lat: i, lng: i })
    }
    // All 50 should be present
    expect(geocodeCache.get('query-0')).toEqual({ lat: 0, lng: 0 })
    expect(geocodeCache.get('query-49')).toEqual({ lat: 49, lng: 49 })

    // Reset so the `get('query-0')` above doesn't shift recency ordering for
    // this assertion.
    geocodeCache.clear()
    for (let i = 0; i < 50; i++) {
      geocodeCache.set(`query-${i}`, { lat: i, lng: i })
    }
    // Now insert #51 — oldest (query-0) must evict
    geocodeCache.set('query-50', { lat: 50, lng: 50 })
    expect(geocodeCache.get('query-0')).toBeUndefined()
    expect(geocodeCache.get('query-50')).toEqual({ lat: 50, lng: 50 })
    expect(geocodeCache.get('query-49')).toEqual({ lat: 49, lng: 49 })
  })

  it('refreshes LRU recency on get — recently-read entries survive eviction', () => {
    for (let i = 0; i < 50; i++) {
      geocodeCache.set(`query-${i}`, { lat: i, lng: i })
    }
    // Touch query-0 so it becomes the most-recently-used entry
    geocodeCache.get('query-0')
    // Insert #51; query-0 should survive and query-1 should evict
    geocodeCache.set('query-50', { lat: 50, lng: 50 })
    expect(geocodeCache.get('query-0')).toEqual({ lat: 0, lng: 0 })
    expect(geocodeCache.get('query-1')).toBeUndefined()
  })
})
