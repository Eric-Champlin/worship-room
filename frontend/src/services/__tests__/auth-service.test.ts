import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
  type Mock,
} from 'vitest'
import {
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
} from '../auth-service'
import { getStoredToken, setStoredToken } from '@/lib/auth-storage'

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function emptyResponse(status: number): Response {
  return new Response(null, { status })
}

describe('auth-service', () => {
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

  describe('registerUser', () => {
    it('posts to /api/v1/auth/register with the request body and skipAuth', async () => {
      fetchSpy.mockResolvedValueOnce(
        jsonResponse(200, {
          data: { registered: true },
          meta: { requestId: 'r-1' },
        }),
      )
      await registerUser({
        email: 'new@example.com',
        password: 'long-enough-password',
        firstName: 'New',
        lastName: 'User',
        timezone: 'America/Chicago',
      })
      expect(fetchSpy).toHaveBeenCalledOnce()
      const [url, init] = fetchSpy.mock.calls[0]
      expect(url).toMatch(/\/api\/v1\/auth\/register$/)
      expect(init.method).toBe('POST')
      const body = JSON.parse(init.body as string)
      expect(body).toMatchObject({
        email: 'new@example.com',
        password: 'long-enough-password',
        firstName: 'New',
        lastName: 'User',
        timezone: 'America/Chicago',
      })
      // skipAuth: no Authorization header
      expect(
        (init.headers as Record<string, string>).Authorization,
      ).toBeUndefined()
    })

    it('resolves to void on 200', async () => {
      fetchSpy.mockResolvedValueOnce(
        jsonResponse(200, { data: { registered: true }, meta: {} }),
      )
      const result = await registerUser({
        email: 'x@y.z',
        password: 'password1234',
        firstName: 'X',
        lastName: 'Y',
      })
      expect(result).toBeUndefined()
    })

    it('omits timezone from body when undefined', async () => {
      fetchSpy.mockResolvedValueOnce(
        jsonResponse(200, { data: { registered: true }, meta: {} }),
      )
      await registerUser({
        email: 'x@y.z',
        password: 'password1234',
        firstName: 'X',
        lastName: 'Y',
        timezone: undefined,
      })
      const init = fetchSpy.mock.calls[0][1] as RequestInit
      const body = JSON.parse(init.body as string) as Record<string, unknown>
      expect('timezone' in body).toBe(false)
    })
  })

  describe('loginUser', () => {
    it('stores JWT and returns mapped AuthUser on 200', async () => {
      fetchSpy.mockResolvedValueOnce(
        jsonResponse(200, {
          data: {
            token: 'jwt.header.payload',
            user: {
              id: 'uuid-abc',
              email: 'sarah@example.com',
              displayName: 'Sarah',
              firstName: 'Sarah',
              lastName: 'Smith',
              isAdmin: false,
              timezone: 'America/New_York',
            },
          },
          meta: { requestId: 'r-login' },
        }),
      )
      const user = await loginUser({
        email: 'sarah@example.com',
        password: 'long-enough-password',
      })
      expect(getStoredToken()).toBe('jwt.header.payload')
      expect(user).toEqual({
        id: 'uuid-abc',
        name: 'Sarah', // alias for displayName
        displayName: 'Sarah',
        email: 'sarah@example.com',
        firstName: 'Sarah',
        lastName: 'Smith',
        isAdmin: false,
        timezone: 'America/New_York',
        isEmailVerified: false, // hardcoded on summary; /users/me corrects it
        // Spec 1.10f — same transient pattern as isEmailVerified.
        termsVersion: null,
        privacyVersion: null,
      })
    })

    it('propagates ApiError on 401 without setting token', async () => {
      fetchSpy.mockResolvedValueOnce(
        jsonResponse(401, {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password.',
          requestId: 'r-x',
        }),
      )
      await expect(
        loginUser({ email: 'x@y.z', password: 'wrong-pass' }),
      ).rejects.toMatchObject({
        name: 'ApiError',
        code: 'INVALID_CREDENTIALS',
        status: 401,
      })
      expect(getStoredToken()).toBeNull()
    })
  })

  describe('logoutUser', () => {
    it('calls POST /logout and clears stored token on 204', async () => {
      setStoredToken('existing.token')
      fetchSpy.mockResolvedValueOnce(emptyResponse(204))
      await logoutUser()
      expect(fetchSpy).toHaveBeenCalledOnce()
      const [url, init] = fetchSpy.mock.calls[0]
      expect(url).toMatch(/\/api\/v1\/auth\/logout$/)
      expect(init.method).toBe('POST')
      expect(getStoredToken()).toBeNull()
    })

    it('clears token even when backend rejects', async () => {
      setStoredToken('stale.token')
      fetchSpy.mockRejectedValueOnce(new TypeError('Network gone'))
      await logoutUser()
      expect(getStoredToken()).toBeNull()
    })
  })

  describe('getCurrentUser', () => {
    it('returns full AuthUser from /users/me envelope', async () => {
      setStoredToken('a.b.c')
      fetchSpy.mockResolvedValueOnce(
        jsonResponse(200, {
          data: {
            id: 'uuid-me',
            email: 'me@example.com',
            displayName: 'Me',
            firstName: 'Me',
            lastName: 'User',
            displayNamePreference: 'first_only',
            customDisplayName: null,
            avatarUrl: null,
            bio: null,
            favoriteVerseReference: null,
            favoriteVerseText: null,
            timezone: 'UTC',
            isAdmin: false,
            isEmailVerified: true,
            joinedAt: '2026-04-01T00:00:00Z',
          },
          meta: { requestId: 'r-me' },
        }),
      )
      const user = await getCurrentUser()
      expect(user.id).toBe('uuid-me')
      expect(user.name).toBe('Me')
      expect(user.displayName).toBe('Me')
      expect(user.isEmailVerified).toBe(true)
      // Bearer header sent
      const headers = fetchSpy.mock.calls[0][1].headers as Record<string, string>
      expect(headers.Authorization).toBe('Bearer a.b.c')
    })

    it('propagates ApiError on 401', async () => {
      setStoredToken('stale')
      fetchSpy.mockResolvedValueOnce(
        jsonResponse(401, {
          code: 'TOKEN_EXPIRED',
          message: 'expired',
          requestId: 'r-e',
        }),
      )
      await expect(getCurrentUser()).rejects.toMatchObject({
        name: 'ApiError',
        code: 'TOKEN_EXPIRED',
        status: 401,
      })
      // apiFetch's 401 handler clears the token as a side effect
      expect(getStoredToken()).toBeNull()
    })
  })
})
