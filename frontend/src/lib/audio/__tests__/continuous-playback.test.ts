/**
 * BB-29 — continuous-playback preference module tests
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  CONTINUOUS_PLAYBACK_KEY,
  readContinuousPlayback,
  writeContinuousPlayback,
} from '@/lib/audio/continuous-playback'

describe('BB-29 continuous-playback preference module', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  describe('readContinuousPlayback', () => {
    it('returns true when key is absent', () => {
      localStorage.removeItem(CONTINUOUS_PLAYBACK_KEY)
      expect(readContinuousPlayback()).toBe(true)
    })

    it('returns stored true value', () => {
      localStorage.setItem(CONTINUOUS_PLAYBACK_KEY, 'true')
      expect(readContinuousPlayback()).toBe(true)
    })

    it('returns stored false value', () => {
      localStorage.setItem(CONTINUOUS_PLAYBACK_KEY, 'false')
      expect(readContinuousPlayback()).toBe(false)
    })

    it('returns true on non-JSON value (corruption)', () => {
      localStorage.setItem(CONTINUOUS_PLAYBACK_KEY, 'not-json')
      expect(readContinuousPlayback()).toBe(true)
    })

    it('returns true on wrong-type JSON value (number)', () => {
      localStorage.setItem(CONTINUOUS_PLAYBACK_KEY, '42')
      expect(readContinuousPlayback()).toBe(true)
    })

    it('returns true when localStorage.getItem throws', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('storage disabled')
      })
      expect(readContinuousPlayback()).toBe(true)
    })
  })

  describe('writeContinuousPlayback', () => {
    it('round-trips true', () => {
      writeContinuousPlayback(true)
      expect(readContinuousPlayback()).toBe(true)
      expect(localStorage.getItem(CONTINUOUS_PLAYBACK_KEY)).toBe('true')
    })

    it('round-trips false', () => {
      writeContinuousPlayback(false)
      expect(readContinuousPlayback()).toBe(false)
      expect(localStorage.getItem(CONTINUOUS_PLAYBACK_KEY)).toBe('false')
    })

    it('does not throw when localStorage.setItem throws (quota exceeded)', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError')
      })
      expect(() => writeContinuousPlayback(false)).not.toThrow()
    })
  })
})
