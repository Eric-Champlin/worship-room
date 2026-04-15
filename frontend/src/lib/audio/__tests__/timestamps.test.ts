/**
 * BB-44 — timestamps module tests (binary search + in-memory cache)
 */
import { afterEach, describe, expect, it } from 'vitest'
import type { VerseTimestamp } from '@/types/bible-audio'
import {
  findCurrentVerse,
  getCachedTimestamps,
  setCachedTimestamps,
  clearTimestampCache,
} from '@/lib/audio/timestamps'

describe('BB-44 timestamps module', () => {
  afterEach(() => {
    clearTimestampCache()
  })

  describe('findCurrentVerse', () => {
    it('returns null for empty array', () => {
      expect(findCurrentVerse([], 5)).toBeNull()
    })

    it('returns null when time is before first verse', () => {
      const ts: VerseTimestamp[] = [
        { verse: 1, timestamp: 3.64 },
        { verse: 2, timestamp: 10.48 },
      ]
      expect(findCurrentVerse(ts, 2.0)).toBeNull()
    })

    it('returns verse 1 on exact match of first verse', () => {
      const ts: VerseTimestamp[] = [
        { verse: 1, timestamp: 3.64 },
        { verse: 2, timestamp: 10.48 },
      ]
      expect(findCurrentVerse(ts, 3.64)).toBe(1)
    })

    it('returns the earlier verse when time is between two verses', () => {
      const ts: VerseTimestamp[] = [
        { verse: 1, timestamp: 3.64 },
        { verse: 2, timestamp: 10.48 },
        { verse: 3, timestamp: 18.2 },
      ]
      expect(findCurrentVerse(ts, 7.0)).toBe(1)
      expect(findCurrentVerse(ts, 15.0)).toBe(2)
    })

    it('returns that verse on exact boundary', () => {
      const ts: VerseTimestamp[] = [
        { verse: 1, timestamp: 3.64 },
        { verse: 2, timestamp: 10.48 },
        { verse: 3, timestamp: 18.2 },
      ]
      expect(findCurrentVerse(ts, 10.48)).toBe(2)
    })

    it('returns last verse when time is past all timestamps', () => {
      const ts: VerseTimestamp[] = [
        { verse: 1, timestamp: 3.64 },
        { verse: 2, timestamp: 10.48 },
        { verse: 3, timestamp: 18.2 },
      ]
      expect(findCurrentVerse(ts, 999)).toBe(3)
    })

    it('handles single-entry array', () => {
      const ts: VerseTimestamp[] = [{ verse: 1, timestamp: 0.5 }]
      expect(findCurrentVerse(ts, 0.3)).toBeNull()
      expect(findCurrentVerse(ts, 0.5)).toBe(1)
      expect(findCurrentVerse(ts, 5.0)).toBe(1)
    })

    it('handles closely spaced timestamps (<500ms)', () => {
      const ts: VerseTimestamp[] = [
        { verse: 1, timestamp: 10.0 },
        { verse: 2, timestamp: 10.3 },
        { verse: 3, timestamp: 10.5 },
      ]
      expect(findCurrentVerse(ts, 10.1)).toBe(1)
      expect(findCurrentVerse(ts, 10.35)).toBe(2)
      expect(findCurrentVerse(ts, 10.5)).toBe(3)
    })
  })

  describe('in-memory cache', () => {
    it('returns undefined for uncached key', () => {
      expect(getCachedTimestamps('fs', 'JHN', 3)).toBeUndefined()
    })

    it('set/get cycle works', () => {
      const ts: VerseTimestamp[] = [
        { verse: 1, timestamp: 3.64 },
        { verse: 2, timestamp: 10.48 },
      ]
      setCachedTimestamps('fs', 'JHN', 3, ts)
      expect(getCachedTimestamps('fs', 'JHN', 3)).toEqual(ts)
    })

    it('different keys are isolated', () => {
      const ts1: VerseTimestamp[] = [{ verse: 1, timestamp: 1.0 }]
      const ts2: VerseTimestamp[] = [{ verse: 1, timestamp: 2.0 }]
      setCachedTimestamps('fs', 'JHN', 3, ts1)
      setCachedTimestamps('fs', 'JHN', 4, ts2)
      expect(getCachedTimestamps('fs', 'JHN', 3)).toEqual(ts1)
      expect(getCachedTimestamps('fs', 'JHN', 4)).toEqual(ts2)
    })

    it('clearTimestampCache removes all entries', () => {
      setCachedTimestamps('fs', 'JHN', 3, [{ verse: 1, timestamp: 1.0 }])
      clearTimestampCache()
      expect(getCachedTimestamps('fs', 'JHN', 3)).toBeUndefined()
    })
  })
})
