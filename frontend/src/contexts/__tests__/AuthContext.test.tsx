import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { AuthProvider, useAuth } from '../AuthContext'
import type { ReactNode } from 'react'

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>
}

beforeEach(() => {
  localStorage.clear()
})

describe('AuthContext', () => {
  it('default state is logged out', () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.user).toBeNull()
  })

  it('login sets auth state', () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    act(() => {
      result.current.login('Eric')
    })

    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.user?.name).toBe('Eric')
    expect(result.current.user?.id).toBeTruthy()
  })

  it('login persists to localStorage', () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    act(() => {
      result.current.login('Eric')
    })

    expect(localStorage.getItem('wr_auth_simulated')).toBe('true')
    expect(localStorage.getItem('wr_user_name')).toBe('Eric')
    expect(localStorage.getItem('wr_user_id')).toBeTruthy()
  })

  it('logout clears auth state', () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    act(() => {
      result.current.login('Eric')
    })
    expect(result.current.isAuthenticated).toBe(true)

    act(() => {
      result.current.logout()
    })
    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.user).toBeNull()
  })

  it('logout preserves other wr_ keys', () => {
    localStorage.setItem('wr_mood_entries', '[]')
    localStorage.setItem('wr_dashboard_collapsed', '{}')

    const { result } = renderHook(() => useAuth(), { wrapper })

    act(() => {
      result.current.login('Eric')
    })
    act(() => {
      result.current.logout()
    })

    expect(localStorage.getItem('wr_mood_entries')).toBe('[]')
    expect(localStorage.getItem('wr_dashboard_collapsed')).toBe('{}')
    expect(localStorage.getItem('wr_auth_simulated')).toBeNull()
    expect(localStorage.getItem('wr_user_name')).toBeNull()
  })

  it('restores from localStorage on mount', () => {
    localStorage.setItem('wr_auth_simulated', 'true')
    localStorage.setItem('wr_user_name', 'Sarah')
    localStorage.setItem('wr_user_id', 'test-uuid-123')

    const { result } = renderHook(() => useAuth(), { wrapper })

    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.user?.name).toBe('Sarah')
    expect(result.current.user?.id).toBe('test-uuid-123')
  })

  it('generates stable user id', () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    act(() => {
      result.current.login('Eric')
    })
    const firstId = result.current.user?.id

    act(() => {
      result.current.logout()
    })
    act(() => {
      result.current.login('Eric')
    })
    const secondId = result.current.user?.id

    expect(firstId).toBeTruthy()
    expect(firstId).toBe(secondId)
  })

  it('cross-tab sync via storage event', () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    expect(result.current.isAuthenticated).toBe(false)

    // Simulate another tab logging in
    localStorage.setItem('wr_auth_simulated', 'true')
    localStorage.setItem('wr_user_name', 'Other Tab')
    localStorage.setItem('wr_user_id', 'other-tab-id')

    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'wr_auth_simulated',
          newValue: 'true',
        }),
      )
    })

    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.user?.name).toBe('Other Tab')
  })
})
