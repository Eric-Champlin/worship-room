/**
 * BB-44 — read-along preference module tests
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  READ_ALONG_KEY,
  readReadAlong,
  writeReadAlong,
} from '@/lib/audio/read-along'

describe('BB-44 read-along preference module', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  describe('readReadAlong', () => {
    it('returns true when key is absent', () => {
      localStorage.removeItem(READ_ALONG_KEY)
      expect(readReadAlong()).toBe(true)
    })

    it('returns stored true value', () => {
      localStorage.setItem(READ_ALONG_KEY, 'true')
      expect(readReadAlong()).toBe(true)
    })

    it('returns stored false value', () => {
      localStorage.setItem(READ_ALONG_KEY, 'false')
      expect(readReadAlong()).toBe(false)
    })

    it('returns true on non-JSON value (corruption)', () => {
      localStorage.setItem(READ_ALONG_KEY, 'not-json')
      expect(readReadAlong()).toBe(true)
    })

    it('returns true on wrong-type JSON value (number)', () => {
      localStorage.setItem(READ_ALONG_KEY, '42')
      expect(readReadAlong()).toBe(true)
    })

    it('returns true when localStorage.getItem throws', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('storage disabled')
      })
      expect(readReadAlong()).toBe(true)
    })
  })

  describe('writeReadAlong', () => {
    it('round-trips true', () => {
      writeReadAlong(true)
      expect(readReadAlong()).toBe(true)
      expect(localStorage.getItem(READ_ALONG_KEY)).toBe('true')
    })

    it('round-trips false', () => {
      writeReadAlong(false)
      expect(readReadAlong()).toBe(false)
      expect(localStorage.getItem(READ_ALONG_KEY)).toBe('false')
    })

    it('does not throw when localStorage.setItem throws (quota exceeded)', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError')
      })
      expect(() => writeReadAlong(false)).not.toThrow()
    })
  })
})
