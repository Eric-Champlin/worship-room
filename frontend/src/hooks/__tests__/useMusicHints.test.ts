import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useMusicHints } from '../useMusicHints'

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({ user: null, isLoggedIn: false })),
}))

import { useAuth } from '@/hooks/useAuth'

beforeEach(() => {
  localStorage.clear()
  vi.mocked(useAuth).mockReturnValue({ user: null, isLoggedIn: false })
})

describe('useMusicHints', () => {
  it('shows sound grid hint on first visit', () => {
    const { result } = renderHook(() => useMusicHints())
    expect(result.current.showSoundGridHint).toBe(true)
  })

  it('hides sound grid hint after dismissal', () => {
    const { result } = renderHook(() => useMusicHints())
    act(() => {
      result.current.dismissSoundGridHint()
    })
    expect(result.current.showSoundGridHint).toBe(false)
  })

  it('persists dismissal in localStorage for logged-in users', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'user-1', firstName: 'Test', lastName: 'User', email: 'test@example.com' },
      isLoggedIn: true,
    })

    const { result } = renderHook(() => useMusicHints())
    act(() => {
      result.current.dismissSoundGridHint()
    })

    const stored = localStorage.getItem('music-hints-user-1')
    expect(stored).toBeTruthy()
    expect(JSON.parse(stored!)).toHaveProperty('music-hint-sound-grid', true)
  })

  it('does not persist dismissal for logged-out users (React state only)', () => {
    const { result } = renderHook(() => useMusicHints())
    act(() => {
      result.current.dismissSoundGridHint()
    })

    // State is updated
    expect(result.current.showSoundGridHint).toBe(false)
    // But nothing is written to any storage
    expect(localStorage.getItem('music-hints-anonymous')).toBeNull()
    expect(sessionStorage.getItem('music-hints-anonymous')).toBeNull()
  })

  it('shows pill hint on first visit', () => {
    const { result } = renderHook(() => useMusicHints())
    expect(result.current.showPillHint).toBe(true)
  })

  it('hides pill hint after dismissal', () => {
    const { result } = renderHook(() => useMusicHints())
    act(() => {
      result.current.dismissPillHint()
    })
    expect(result.current.showPillHint).toBe(false)
  })
})
