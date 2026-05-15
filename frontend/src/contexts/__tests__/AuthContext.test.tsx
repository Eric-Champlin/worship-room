import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
  type Mock,
} from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { AuthProvider, useAuth } from '../AuthContext'
import { AUTH_INVALIDATED_EVENT } from '@/lib/api-client'
import type { ReactNode } from 'react'

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function emptyResponse(status: number): Response {
  return new Response(null, { status })
}

const SAMPLE_USER_SUMMARY = {
  id: 'uuid-abc',
  email: 'sarah@example.com',
  displayName: 'Sarah',
  firstName: 'Sarah',
  lastName: 'Smith',
  isAdmin: false,
  timezone: 'America/Chicago',
}

const SAMPLE_USER_RESPONSE = {
  ...SAMPLE_USER_SUMMARY,
  displayNamePreference: 'first_only',
  customDisplayName: null,
  avatarUrl: null,
  bio: null,
  favoriteVerseReference: null,
  favoriteVerseText: null,
  isEmailVerified: true,
  joinedAt: '2026-04-01T00:00:00Z',
}

describe('AuthContext', () => {
  let fetchSpy: Mock

  beforeEach(() => {
    localStorage.clear()
    fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('default state is logged out', () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.isAuthResolving).toBe(false)
    expect(result.current.user).toBeNull()
  })

  describe('legacy-mock fallback', () => {
    it('simulateLegacyAuth sets auth state and writes legacy keys', () => {
      const { result } = renderHook(() => useAuth(), { wrapper })

      act(() => {
        result.current.simulateLegacyAuth('Eric')
      })

      expect(result.current.isAuthenticated).toBe(true)
      expect(result.current.user?.name).toBe('Eric')
      expect(result.current.user?.displayName).toBe('Eric')
      expect(result.current.user?.id).toBeTruthy()
      expect(localStorage.getItem('wr_auth_simulated')).toBe('true')
      expect(localStorage.getItem('wr_user_name')).toBe('Eric')
      expect(localStorage.getItem('wr_user_id')).toBeTruthy()
    })

    it('simulateLegacyAuth reuses existing wr_user_id', () => {
      localStorage.setItem('wr_user_id', 'preexisting-uuid')
      const { result } = renderHook(() => useAuth(), { wrapper })

      act(() => {
        result.current.simulateLegacyAuth('Eric')
      })

      expect(result.current.user?.id).toBe('preexisting-uuid')
    })

    it('restores legacy-mock state from localStorage on mount', () => {
      localStorage.setItem('wr_auth_simulated', 'true')
      localStorage.setItem('wr_user_name', 'Sarah')
      localStorage.setItem('wr_user_id', 'test-uuid-123')

      const { result } = renderHook(() => useAuth(), { wrapper })

      expect(result.current.isAuthenticated).toBe(true)
      expect(result.current.isAuthResolving).toBe(false)
      expect(result.current.user?.name).toBe('Sarah')
      expect(result.current.user?.id).toBe('test-uuid-123')
    })
  })

  describe('logout', () => {
    it('logout clears auth state and preserves unrelated wr_ keys', async () => {
      localStorage.setItem('wr_mood_entries', '[]')
      localStorage.setItem('wr_dashboard_collapsed', '{}')

      const { result } = renderHook(() => useAuth(), { wrapper })

      act(() => {
        result.current.simulateLegacyAuth('Eric')
      })
      expect(result.current.isAuthenticated).toBe(true)

      fetchSpy.mockResolvedValueOnce(emptyResponse(204))
      await act(async () => {
        await result.current.logout()
      })

      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.user).toBeNull()
      expect(localStorage.getItem('wr_auth_simulated')).toBeNull()
      expect(localStorage.getItem('wr_user_name')).toBeNull()
      expect(localStorage.getItem('wr_mood_entries')).toBe('[]')
      expect(localStorage.getItem('wr_dashboard_collapsed')).toBe('{}')
    })

    it('logout clears legacy keys (JWT path)', async () => {
      fetchSpy.mockResolvedValueOnce(
        jsonResponse(200, {
          data: { token: 'jwt-token', user: SAMPLE_USER_SUMMARY },
          meta: {},
        }),
      )
      const { result } = renderHook(() => useAuth(), { wrapper })

      await act(async () => {
        await result.current.login({ email: 'x@y.z', password: 'longpassword1' })
      })
      // Mirror wrote legacy keys
      expect(localStorage.getItem('wr_auth_simulated')).toBe('true')
      expect(localStorage.getItem('wr_user_name')).toBe('Sarah')
      expect(localStorage.getItem('wr_user_id')).toBe('uuid-abc')

      fetchSpy.mockResolvedValueOnce(emptyResponse(204))
      await act(async () => {
        await result.current.logout()
      })

      expect(localStorage.getItem('wr_auth_simulated')).toBeNull()
      expect(localStorage.getItem('wr_user_name')).toBeNull()
      // wr_user_id is preserved per clearStoredLegacyAuth contract
      expect(localStorage.getItem('wr_user_id')).toBe('uuid-abc')
      expect(localStorage.getItem('wr_jwt_token')).toBeNull()
    })

    it('logout calls POST /auth/logout', async () => {
      fetchSpy.mockResolvedValueOnce(
        jsonResponse(200, {
          data: { token: 'jwt-token', user: SAMPLE_USER_SUMMARY },
          meta: {},
        }),
      )
      const { result } = renderHook(() => useAuth(), { wrapper })
      await act(async () => {
        await result.current.login({ email: 'x@y.z', password: 'longpassword1' })
      })

      fetchSpy.mockClear()
      fetchSpy.mockResolvedValueOnce(emptyResponse(204))
      await act(async () => {
        await result.current.logout()
      })

      const logoutCall = fetchSpy.mock.calls.find(([url]) =>
        String(url).includes('/api/v1/auth/logout'),
      )
      expect(logoutCall).toBeTruthy()
      expect(logoutCall?.[1].method).toBe('POST')
    })

    // Spec 6.9 — clear composer drafts on logout. R6 decision: drafts are
    // per-device (no userId tagging); on a shared device, logout is the
    // mechanism that protects account isolation.
    it('T13: logout clears wr_composer_drafts', async () => {
      localStorage.setItem(
        'wr_composer_drafts',
        JSON.stringify({
          prayer_request: { content: 'in progress', updatedAt: Date.now() },
        }),
      )

      const { result } = renderHook(() => useAuth(), { wrapper })
      act(() => {
        result.current.simulateLegacyAuth('Eric')
      })
      expect(result.current.isAuthenticated).toBe(true)

      fetchSpy.mockResolvedValueOnce(emptyResponse(204))
      await act(async () => {
        await result.current.logout()
      })

      expect(localStorage.getItem('wr_composer_drafts')).toBeNull()
    })
  })

  describe('cross-tab sync', () => {
    it('storage event on wr_auth_simulated updates state', () => {
      const { result } = renderHook(() => useAuth(), { wrapper })
      expect(result.current.isAuthenticated).toBe(false)

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

    it('storage event on wr_jwt_token triggers re-hydration', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper })
      expect(result.current.isAuthenticated).toBe(false)

      // Another tab set a token
      localStorage.setItem('wr_jwt_token', 'fresh.jwt.token')
      fetchSpy.mockResolvedValueOnce(
        jsonResponse(200, { data: SAMPLE_USER_RESPONSE, meta: {} }),
      )

      act(() => {
        window.dispatchEvent(
          new StorageEvent('storage', {
            key: 'wr_jwt_token',
            newValue: 'fresh.jwt.token',
          }),
        )
      })

      await waitFor(() => {
        expect(result.current.isAuthResolving).toBe(false)
        expect(result.current.isAuthenticated).toBe(true)
      })
      expect(result.current.user?.displayName).toBe('Sarah')
    })

    it('storage event clearing wr_jwt_token clears state', () => {
      localStorage.setItem('wr_jwt_token', 'stale.token')
      // Start in a fake "hydrating" state by seeding a token before mount
      // Mock the hydration fetch to prevent it firing unexpectedly:
      fetchSpy.mockResolvedValueOnce(
        jsonResponse(200, { data: SAMPLE_USER_RESPONSE, meta: {} }),
      )

      const { result } = renderHook(() => useAuth(), { wrapper })

      // Now simulate another tab clearing the token
      localStorage.removeItem('wr_jwt_token')
      act(() => {
        window.dispatchEvent(
          new StorageEvent('storage', {
            key: 'wr_jwt_token',
            newValue: null,
          }),
        )
      })

      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.isAuthResolving).toBe(false)
    })
  })

  describe('token hydration on boot', () => {
    it('hydrates user from /users/me when token is present', async () => {
      localStorage.setItem('wr_jwt_token', 'boot.token')
      fetchSpy.mockResolvedValueOnce(
        jsonResponse(200, { data: SAMPLE_USER_RESPONSE, meta: {} }),
      )

      const { result } = renderHook(() => useAuth(), { wrapper })

      // Starts in resolving state
      expect(result.current.isAuthResolving).toBe(true)
      expect(result.current.isAuthenticated).toBe(false)

      await waitFor(() => {
        expect(result.current.isAuthResolving).toBe(false)
      })
      expect(result.current.isAuthenticated).toBe(true)
      expect(result.current.user?.email).toBe('sarah@example.com')
      expect(result.current.user?.isEmailVerified).toBe(true)
    })

    it('401 on /users/me clears token and stays logged out', async () => {
      localStorage.setItem('wr_jwt_token', 'stale.token')
      fetchSpy.mockResolvedValueOnce(
        jsonResponse(401, {
          code: 'TOKEN_EXPIRED',
          message: 'expired',
          requestId: 'r-e',
        }),
      )

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.isAuthResolving).toBe(false)
      })
      expect(result.current.isAuthenticated).toBe(false)
      expect(localStorage.getItem('wr_jwt_token')).toBeNull()
    })

    it('boot hydration mirrors to legacy keys on success', async () => {
      localStorage.setItem('wr_jwt_token', 'boot.token')
      fetchSpy.mockResolvedValueOnce(
        jsonResponse(200, { data: SAMPLE_USER_RESPONSE, meta: {} }),
      )

      const { result } = renderHook(() => useAuth(), { wrapper })
      await waitFor(() => {
        expect(result.current.isAuthResolving).toBe(false)
      })

      expect(localStorage.getItem('wr_auth_simulated')).toBe('true')
      expect(localStorage.getItem('wr_user_name')).toBe('Sarah')
      expect(localStorage.getItem('wr_user_id')).toBe('uuid-abc')
    })
  })

  describe('login', () => {
    it('login success updates state and sets token', async () => {
      fetchSpy.mockResolvedValueOnce(
        jsonResponse(200, {
          data: { token: 'new.jwt.here', user: SAMPLE_USER_SUMMARY },
          meta: {},
        }),
      )
      const { result } = renderHook(() => useAuth(), { wrapper })

      await act(async () => {
        await result.current.login({
          email: 'sarah@example.com',
          password: 'long-enough-password',
        })
      })

      expect(result.current.isAuthenticated).toBe(true)
      expect(result.current.user?.name).toBe('Sarah')
      expect(result.current.user?.displayName).toBe('Sarah')
      expect(result.current.user?.name).toBe(result.current.user?.displayName)
      expect(localStorage.getItem('wr_jwt_token')).toBe('new.jwt.here')
    })

    it('login mirrors to legacy keys', async () => {
      fetchSpy.mockResolvedValueOnce(
        jsonResponse(200, {
          data: { token: 'jwt', user: SAMPLE_USER_SUMMARY },
          meta: {},
        }),
      )
      const { result } = renderHook(() => useAuth(), { wrapper })

      await act(async () => {
        await result.current.login({
          email: 'x@y.z',
          password: 'longpassword1',
        })
      })

      expect(localStorage.getItem('wr_auth_simulated')).toBe('true')
      expect(localStorage.getItem('wr_user_name')).toBe('Sarah')
      expect(localStorage.getItem('wr_user_id')).toBe('uuid-abc')
    })

    it('login throws AuthError on 401 with INVALID_CREDENTIALS', async () => {
      fetchSpy.mockResolvedValueOnce(
        jsonResponse(401, {
          code: 'INVALID_CREDENTIALS',
          message: 'bad',
          requestId: 'r',
        }),
      )
      const { result } = renderHook(() => useAuth(), { wrapper })

      let thrown: unknown = null
      await act(async () => {
        try {
          await result.current.login({
            email: 'bad@example.com',
            password: 'wrong-pass-1234',
          })
        } catch (e) {
          thrown = e
        }
      })

      expect(thrown).toBeTruthy()
      expect((thrown as { name: string }).name).toBe('AuthError')
      expect((thrown as { code: string }).code).toBe('INVALID_CREDENTIALS')
      expect(result.current.isAuthenticated).toBe(false)
    })

    it('user.name is always the displayName alias', async () => {
      fetchSpy.mockResolvedValueOnce(
        jsonResponse(200, {
          data: {
            token: 'jwt',
            user: { ...SAMPLE_USER_SUMMARY, displayName: 'Different Name' },
          },
          meta: {},
        }),
      )
      const { result } = renderHook(() => useAuth(), { wrapper })
      await act(async () => {
        await result.current.login({
          email: 'x@y.z',
          password: 'longpassword1',
        })
      })
      expect(result.current.user?.name).toBe('Different Name')
      expect(result.current.user?.displayName).toBe('Different Name')
    })
  })

  describe('register → auto-login', () => {
    it('register chains to auto-login on success', async () => {
      fetchSpy
        .mockResolvedValueOnce(
          jsonResponse(200, {
            data: { registered: true },
            meta: {},
          }),
        )
        .mockResolvedValueOnce(
          jsonResponse(200, {
            data: { token: 'jwt', user: SAMPLE_USER_SUMMARY },
            meta: {},
          }),
        )
      const { result } = renderHook(() => useAuth(), { wrapper })

      await act(async () => {
        await result.current.register({
          email: 'new@example.com',
          password: 'long-enough-password',
          firstName: 'New',
          lastName: 'User',
          timezone: 'UTC',
        })
      })

      expect(result.current.isAuthenticated).toBe(true)
      const calls = fetchSpy.mock.calls.map(([url]) => String(url))
      expect(calls.some((u) => u.endsWith('/api/v1/auth/register'))).toBe(true)
      expect(calls.some((u) => u.endsWith('/api/v1/auth/login'))).toBe(true)
    })

    it('register → auto-login mirrors to legacy keys', async () => {
      fetchSpy
        .mockResolvedValueOnce(
          jsonResponse(200, { data: { registered: true }, meta: {} }),
        )
        .mockResolvedValueOnce(
          jsonResponse(200, {
            data: { token: 'jwt', user: SAMPLE_USER_SUMMARY },
            meta: {},
          }),
        )
      const { result } = renderHook(() => useAuth(), { wrapper })

      await act(async () => {
        await result.current.register({
          email: 'x@y.z',
          password: 'longpassword1',
          firstName: 'X',
          lastName: 'Y',
        })
      })

      expect(localStorage.getItem('wr_auth_simulated')).toBe('true')
      expect(localStorage.getItem('wr_user_name')).toBe('Sarah')
      expect(localStorage.getItem('wr_user_id')).toBe('uuid-abc')
    })

    it('register success + auto-login 401 throws AUTO_LOGIN_FAILED', async () => {
      fetchSpy
        .mockResolvedValueOnce(
          jsonResponse(200, { data: { registered: true }, meta: {} }),
        )
        .mockResolvedValueOnce(
          jsonResponse(401, {
            code: 'INVALID_CREDENTIALS',
            message: 'bad',
            requestId: 'r',
          }),
        )
      const { result } = renderHook(() => useAuth(), { wrapper })

      let thrown: unknown = null
      await act(async () => {
        try {
          await result.current.register({
            email: 'existing@example.com',
            password: 'wrong-pass-1234',
            firstName: 'X',
            lastName: 'Y',
          })
        } catch (e) {
          thrown = e
        }
      })

      expect(thrown).toBeTruthy()
      expect((thrown as { code: string }).code).toBe('AUTO_LOGIN_FAILED')
      expect(result.current.isAuthenticated).toBe(false)
    })

    it('register failure throws without attempting auto-login', async () => {
      fetchSpy.mockResolvedValueOnce(
        jsonResponse(400, {
          code: 'VALIDATION_FAILED',
          message: 'bad input',
          requestId: 'r',
          fieldErrors: { email: 'must be valid' },
        }),
      )
      const { result } = renderHook(() => useAuth(), { wrapper })

      let thrown: unknown = null
      await act(async () => {
        try {
          await result.current.register({
            email: 'bad',
            password: 'longpassword1',
            firstName: 'X',
            lastName: 'Y',
          })
        } catch (e) {
          thrown = e
        }
      })

      expect((thrown as { code: string }).code).toBe('VALIDATION_FAILED')
      expect((thrown as { fieldErrors?: Record<string, string> }).fieldErrors)
        .toEqual({ email: 'must be valid' })
      expect(fetchSpy).toHaveBeenCalledTimes(1) // no auto-login attempt
    })
  })

  describe('AUTH_INVALIDATED_EVENT', () => {
    it('clears state when the event fires', () => {
      const { result } = renderHook(() => useAuth(), { wrapper })

      act(() => {
        result.current.simulateLegacyAuth('Eric')
      })
      expect(result.current.isAuthenticated).toBe(true)

      act(() => {
        window.dispatchEvent(new CustomEvent(AUTH_INVALIDATED_EVENT))
      })

      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.user).toBeNull()
      expect(localStorage.getItem('wr_auth_simulated')).toBeNull()
    })
  })
})
