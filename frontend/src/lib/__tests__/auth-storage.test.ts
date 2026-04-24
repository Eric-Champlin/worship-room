import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  getStoredToken,
  setStoredToken,
  clearStoredToken,
  clearStoredLegacyAuth,
  LEGACY_KEYS,
} from '../auth-storage'

describe('auth-storage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getStoredToken', () => {
    it('returns null when unset', () => {
      expect(getStoredToken()).toBeNull()
    })

    it('returns null when empty string', () => {
      localStorage.setItem('wr_jwt_token', '')
      expect(getStoredToken()).toBeNull()
    })

    it('returns null when localStorage throws', () => {
      const spy = vi
        .spyOn(Storage.prototype, 'getItem')
        .mockImplementation(() => {
          throw new Error('disabled')
        })
      expect(getStoredToken()).toBeNull()
      spy.mockRestore()
    })
  })

  describe('setStoredToken + getStoredToken round-trip', () => {
    it('set then get returns the token', () => {
      setStoredToken('eyJhbGciOiJIUzI1NiJ9.abc.def')
      expect(getStoredToken()).toBe('eyJhbGciOiJIUzI1NiJ9.abc.def')
    })

    it('set is a no-op when localStorage throws', () => {
      const spy = vi
        .spyOn(Storage.prototype, 'setItem')
        .mockImplementation(() => {
          throw new Error('quota')
        })
      expect(() => setStoredToken('x')).not.toThrow()
      spy.mockRestore()
    })
  })

  describe('clearStoredToken', () => {
    it('removes the token only, leaving legacy keys untouched', () => {
      setStoredToken('t')
      localStorage.setItem(LEGACY_KEYS.simulated, 'true')
      localStorage.setItem(LEGACY_KEYS.userName, 'Eric')
      localStorage.setItem(LEGACY_KEYS.userId, 'uuid-123')

      clearStoredToken()

      expect(getStoredToken()).toBeNull()
      expect(localStorage.getItem(LEGACY_KEYS.simulated)).toBe('true')
      expect(localStorage.getItem(LEGACY_KEYS.userName)).toBe('Eric')
      expect(localStorage.getItem(LEGACY_KEYS.userId)).toBe('uuid-123')
    })
  })

  describe('clearStoredLegacyAuth', () => {
    it('clears wr_auth_simulated and wr_user_name but preserves wr_user_id', () => {
      localStorage.setItem(LEGACY_KEYS.simulated, 'true')
      localStorage.setItem(LEGACY_KEYS.userName, 'Eric')
      localStorage.setItem(LEGACY_KEYS.userId, 'uuid-abc')
      setStoredToken('jwt-token')

      clearStoredLegacyAuth()

      expect(localStorage.getItem(LEGACY_KEYS.simulated)).toBeNull()
      expect(localStorage.getItem(LEGACY_KEYS.userName)).toBeNull()
      expect(localStorage.getItem(LEGACY_KEYS.userId)).toBe('uuid-abc')
      // JWT token is NOT cleared by this helper (caller is responsible)
      expect(getStoredToken()).toBe('jwt-token')
    })

    it('is a no-op when localStorage throws', () => {
      const spy = vi
        .spyOn(Storage.prototype, 'removeItem')
        .mockImplementation(() => {
          throw new Error('disabled')
        })
      expect(() => clearStoredLegacyAuth()).not.toThrow()
      spy.mockRestore()
    })
  })

  describe('LEGACY_KEYS constants', () => {
    it('exposes the three legacy key names', () => {
      expect(LEGACY_KEYS.simulated).toBe('wr_auth_simulated')
      expect(LEGACY_KEYS.userName).toBe('wr_user_name')
      expect(LEGACY_KEYS.userId).toBe('wr_user_id')
    })
  })
})
