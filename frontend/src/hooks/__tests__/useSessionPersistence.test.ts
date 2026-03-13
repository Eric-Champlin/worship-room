import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useSessionPersistence } from '../useSessionPersistence'
import { storageService } from '@/services/storage-service'
import type { SessionState } from '@/types/storage'

// ── Mocks ────────────────────────────────────────────────────────────

let mockIsLoggedIn = false

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: null, isLoggedIn: mockIsLoggedIn }),
}))

// ── Test data ────────────────────────────────────────────────────────

const VALID_STATE: SessionState = {
  activeSounds: [
    { soundId: 'gentle-rain', volume: 0.7 },
    { soundId: 'fireplace', volume: 0.5 },
  ],
  foregroundContentId: null,
  foregroundPosition: 0,
  masterVolume: 0.8,
  savedAt: new Date().toISOString(),
}

const EXPIRED_STATE: SessionState = {
  ...VALID_STATE,
  savedAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
}

// ── Tests ────────────────────────────────────────────────────────────

describe('useSessionPersistence', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    mockIsLoggedIn = false
  })

  it('hasValidSession is false when no session', () => {
    mockIsLoggedIn = true
    const { result } = renderHook(() => useSessionPersistence())
    expect(result.current.hasValidSession).toBe(false)
    expect(result.current.sessionState).toBeNull()
  })

  it('hasValidSession is false when session > 24h old', () => {
    mockIsLoggedIn = true
    storageService.saveSessionState(EXPIRED_STATE)

    const { result } = renderHook(() => useSessionPersistence())
    expect(result.current.hasValidSession).toBe(false)
  })

  it('auto-clears expired session on mount', () => {
    mockIsLoggedIn = true
    storageService.saveSessionState(EXPIRED_STATE)

    renderHook(() => useSessionPersistence())

    // localStorage should have been cleared by storageService.getSessionState()
    expect(localStorage.getItem('wr_session_state')).toBeNull()
  })

  it('loads valid session on mount when logged in', () => {
    mockIsLoggedIn = true
    storageService.saveSessionState(VALID_STATE)

    const { result } = renderHook(() => useSessionPersistence())
    expect(result.current.hasValidSession).toBe(true)
    expect(result.current.sessionState).toEqual(VALID_STATE)
  })

  it('returns null session when logged out', () => {
    storageService.saveSessionState(VALID_STATE)
    mockIsLoggedIn = false

    const { result } = renderHook(() => useSessionPersistence())
    expect(result.current.hasValidSession).toBe(false)
    expect(result.current.sessionState).toBeNull()
  })

  it('saveSession persists state', () => {
    mockIsLoggedIn = true
    const { result } = renderHook(() => useSessionPersistence())

    act(() => {
      result.current.saveSession(VALID_STATE)
    })

    expect(result.current.hasValidSession).toBe(true)
    expect(storageService.getSessionState()).toEqual(VALID_STATE)
  })

  it('clearSession removes state', () => {
    mockIsLoggedIn = true
    storageService.saveSessionState(VALID_STATE)

    const { result } = renderHook(() => useSessionPersistence())
    expect(result.current.hasValidSession).toBe(true)

    act(() => {
      result.current.clearSession()
    })

    expect(result.current.hasValidSession).toBe(false)
    expect(result.current.sessionState).toBeNull()
    expect(storageService.getSessionState()).toBeNull()
  })
})
