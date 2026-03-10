import { describe, it, expect, beforeEach, vi } from 'vitest'
import { LocalStorageService, StorageQuotaError } from '../storage-service'

// ── Test data ─────────────────────────────────────────────────────────
const SOUND_A = { soundId: 'gentle-rain', volume: 0.7 }
const SOUND_B = { soundId: 'fireplace', volume: 0.5 }
const MIX_NAME = 'Evening Calm'

describe('LocalStorageService', () => {
  let service: LocalStorageService

  beforeEach(() => {
    localStorage.clear()
    service = new LocalStorageService()
    vi.stubGlobal('crypto', {
      randomUUID: vi.fn().mockReturnValue('test-uuid-1234'),
    })
  })

  // ── Favorites ─────────────────────────────────────────────────────
  describe('Favorites', () => {
    it('returns empty array initially', () => {
      expect(service.getFavorites()).toEqual([])
    })

    it('addFavorite persists to localStorage, isFavorite returns true', () => {
      service.setAuthState(true)
      service.addFavorite('scene', 'morning-mist')
      expect(service.isFavorite('scene', 'morning-mist')).toBe(true)

      const favorites = service.getFavorites()
      expect(favorites).toHaveLength(1)
      expect(favorites[0].type).toBe('scene')
      expect(favorites[0].targetId).toBe('morning-mist')
      expect(favorites[0].createdAt).toBeTruthy()
    })

    it('does not add duplicate favorites', () => {
      service.setAuthState(true)
      service.addFavorite('scene', 'morning-mist')
      service.addFavorite('scene', 'morning-mist')
      expect(service.getFavorites()).toHaveLength(1)
    })

    it('removeFavorite removes from localStorage', () => {
      service.setAuthState(true)
      service.addFavorite('scene', 'morning-mist')
      service.addFavorite('sleep_session', 'psalm-23')
      service.removeFavorite('scene', 'morning-mist')

      expect(service.isFavorite('scene', 'morning-mist')).toBe(false)
      expect(service.isFavorite('sleep_session', 'psalm-23')).toBe(true)
      expect(service.getFavorites()).toHaveLength(1)
    })

    it('isFavorite returns false for non-existent favorite', () => {
      expect(service.isFavorite('scene', 'nonexistent')).toBe(false)
    })
  })

  // ── Saved Mixes ──────────────────────────────────────────────────
  describe('Saved Mixes', () => {
    it('returns empty array initially', () => {
      expect(service.getSavedMixes()).toEqual([])
    })

    it('saveMix creates with UUID, persists, returns SavedMix', () => {
      service.setAuthState(true)
      const mix = service.saveMix(MIX_NAME, [SOUND_A, SOUND_B])

      expect(mix.id).toBe('test-uuid-1234')
      expect(mix.name).toBe(MIX_NAME)
      expect(mix.sounds).toEqual([SOUND_A, SOUND_B])
      expect(mix.createdAt).toBeTruthy()
      expect(mix.updatedAt).toBe(mix.createdAt)

      const stored = service.getSavedMixes()
      expect(stored).toHaveLength(1)
      expect(stored[0].id).toBe('test-uuid-1234')
    })

    it('updateMixName updates name and updatedAt', () => {
      service.setAuthState(true)
      const mix = service.saveMix(MIX_NAME, [SOUND_A])

      service.updateMixName(mix.id, 'New Name')
      const updated = service.getSavedMixes()[0]

      expect(updated.name).toBe('New Name')
      expect(typeof updated.updatedAt).toBe('string')
      expect(updated.updatedAt.length).toBeGreaterThan(0)
    })

    it('updateMixName does nothing for non-existent id', () => {
      service.setAuthState(true)
      service.saveMix(MIX_NAME, [SOUND_A])
      service.updateMixName('nonexistent', 'New Name')
      expect(service.getSavedMixes()[0].name).toBe(MIX_NAME)
    })

    it('deleteMix removes from localStorage', () => {
      service.setAuthState(true)
      const mix = service.saveMix(MIX_NAME, [SOUND_A])
      service.deleteMix(mix.id)
      expect(service.getSavedMixes()).toEqual([])
    })

    it('duplicateMix creates copy with " Copy" suffix', () => {
      service.setAuthState(true)
      const original = service.saveMix(MIX_NAME, [SOUND_A, SOUND_B])

      // Second randomUUID call
      vi.mocked(crypto.randomUUID).mockReturnValueOnce('00000000-0000-0000-0000-000000005678' as `${string}-${string}-${string}-${string}-${string}`)

      const copy = service.duplicateMix(original.id)

      expect(copy).not.toBeNull()
      expect(copy!.name).toBe(`${MIX_NAME} Copy`)
      expect(copy!.id).toBe('00000000-0000-0000-0000-000000005678')
      expect(copy!.sounds).toEqual([SOUND_A, SOUND_B])
      expect(service.getSavedMixes()).toHaveLength(2)
    })

    it('duplicateMix returns null for non-existent id', () => {
      service.setAuthState(true)
      expect(service.duplicateMix('nonexistent')).toBeNull()
    })
  })

  // ── Listening History ────────────────────────────────────────────
  describe('Listening History', () => {
    const SESSION_DATA = {
      contentType: 'ambient' as const,
      contentId: 'custom-mix',
      startedAt: '2026-03-09T10:00:00Z',
      durationSeconds: 300,
      completed: true,
    }

    it('returns empty array initially', () => {
      expect(service.getListeningHistory()).toEqual([])
    })

    it('logListeningSession persists session', () => {
      service.setAuthState(true)
      service.logListeningSession(SESSION_DATA)
      const history = service.getListeningHistory()

      expect(history).toHaveLength(1)
      expect(history[0].id).toBe('test-uuid-1234')
      expect(history[0].contentType).toBe('ambient')
      expect(history[0].durationSeconds).toBe(300)
    })

    it('caps at 100 entries, pruning oldest', () => {
      service.setAuthState(true)
      // Pre-populate with 100 entries
      const entries = Array.from({ length: 100 }, (_, i) => ({
        id: `session-${i}`,
        ...SESSION_DATA,
        contentId: `mix-${i}`,
      }))
      localStorage.setItem('wr_listening_history', JSON.stringify(entries))

      service.logListeningSession({ ...SESSION_DATA, contentId: 'new-mix' })
      const history = service.getListeningHistory()

      expect(history).toHaveLength(100)
      // Oldest entry (mix-0) should be pruned
      expect(history[0].contentId).toBe('mix-1')
      // Newest entry should be last
      expect(history[history.length - 1].contentId).toBe('new-mix')
    })

    it('getRecentSessions returns last N sessions', () => {
      service.setAuthState(true)
      service.logListeningSession({ ...SESSION_DATA, contentId: 'mix-1' })

      vi.mocked(crypto.randomUUID).mockReturnValueOnce('00000000-0000-0000-0000-000000000002' as `${string}-${string}-${string}-${string}-${string}`)
      service.logListeningSession({ ...SESSION_DATA, contentId: 'mix-2' })

      vi.mocked(crypto.randomUUID).mockReturnValueOnce('00000000-0000-0000-0000-000000000003' as `${string}-${string}-${string}-${string}-${string}`)
      service.logListeningSession({ ...SESSION_DATA, contentId: 'mix-3' })

      const recent = service.getRecentSessions(2)
      expect(recent).toHaveLength(2)
      expect(recent[0].contentId).toBe('mix-2')
      expect(recent[1].contentId).toBe('mix-3')
    })
  })

  // ── Session State ─────────────────────────────────────────────────
  describe('Session State', () => {
    const STATE: SessionState = {
      activeSounds: [SOUND_A, SOUND_B],
      foregroundContentId: null,
      foregroundPosition: 0,
      masterVolume: 0.8,
      savedAt: new Date().toISOString(),
    }

    it('saveSessionState / getSessionState / clearSessionState round-trip', () => {
      service.setAuthState(true)
      expect(service.getSessionState()).toBeNull()

      service.saveSessionState(STATE)
      const loaded = service.getSessionState()
      expect(loaded).toEqual(STATE)

      service.clearSessionState()
      expect(service.getSessionState()).toBeNull()
    })

    it('getSessionState returns null for expired session (>24h)', () => {
      service.setAuthState(true)
      const expired: SessionState = {
        ...STATE,
        savedAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
      }
      service.saveSessionState(expired)

      expect(service.getSessionState()).toBeNull()
      // Should also be cleared from localStorage
      expect(localStorage.getItem('wr_session_state')).toBeNull()
    })
  })

  // ── Sharing ───────────────────────────────────────────────────────
  describe('Sharing', () => {
    const SOUNDS = [SOUND_A, SOUND_B]

    it('createShareableLink produces valid Base64url', () => {
      const link = service.createShareableLink(SOUNDS)

      expect(link).toContain('/music?tab=ambient&mix=')
      // Should not contain standard base64 chars that aren't URL-safe
      const encoded = link.split('mix=')[1]
      expect(encoded).not.toContain('+')
      expect(encoded).not.toContain('/')
      expect(encoded).not.toContain('=')
    })

    it('decodeSharedMix decodes valid data', () => {
      const link = service.createShareableLink(SOUNDS)
      const encoded = link.split('mix=')[1]
      const decoded = service.decodeSharedMix(encoded)

      expect(decoded).not.toBeNull()
      expect(decoded!.sounds).toHaveLength(2)
      expect(decoded!.sounds[0].id).toBe('gentle-rain')
      expect(decoded!.sounds[0].v).toBe(0.7)
      expect(decoded!.sounds[1].id).toBe('fireplace')
      expect(decoded!.sounds[1].v).toBe(0.5)
    })

    it('decodeSharedMix returns null for invalid data', () => {
      expect(service.decodeSharedMix('not-valid-base64!!!')).toBeNull()
      expect(service.decodeSharedMix('')).toBeNull()
    })

    it('decodeSharedMix returns null for missing sounds array', () => {
      const encoded = btoa(JSON.stringify({ notSounds: [] }))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '')
      expect(service.decodeSharedMix(encoded)).toBeNull()
    })

    it('decodeSharedMix returns null for invalid sound entries', () => {
      const encoded = btoa(JSON.stringify({ sounds: [{ id: 123, v: 'bad' }] }))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '')
      expect(service.decodeSharedMix(encoded)).toBeNull()
    })
  })

  // ── QuotaExceededError ────────────────────────────────────────────
  describe('QuotaExceededError handling', () => {
    it('throws StorageQuotaError when localStorage is full', () => {
      service.setAuthState(true)
      const quotaError = new DOMException('quota exceeded', 'QuotaExceededError')
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw quotaError
      })

      expect(() => service.addFavorite('scene', 'test')).toThrow(
        StorageQuotaError,
      )

      vi.restoreAllMocks()
    })
  })
})

// Import needed for Session State tests
import type { SessionState } from '@/types/storage'
