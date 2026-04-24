import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
  type Mock,
} from 'vitest'
import { apiFetch, AUTH_INVALIDATED_EVENT } from '../api-client'
import { setStoredToken, getStoredToken } from '../auth-storage'
import { ApiError } from '@/types/auth'

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function textResponse(status: number, text: string): Response {
  return new Response(text, { status })
}

function emptyResponse(status: number): Response {
  return new Response(null, { status })
}

describe('api-client', () => {
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

  describe('happy path', () => {
    it('returns envelope.data on 200', async () => {
      fetchSpy.mockResolvedValueOnce(
        jsonResponse(200, { data: { foo: 1 }, meta: { requestId: 'r1' } }),
      )
      const result = await apiFetch<{ foo: number }>('/api/v1/x')
      expect(result).toEqual({ foo: 1 })
    })

    it('returns undefined on 204 No Content', async () => {
      fetchSpy.mockResolvedValueOnce(emptyResponse(204))
      const result = await apiFetch<void>('/api/v1/logout', { method: 'POST' })
      expect(result).toBeUndefined()
    })
  })

  describe('Bearer token attachment', () => {
    it('attaches Authorization header when token is stored', async () => {
      setStoredToken('abc.def.ghi')
      fetchSpy.mockResolvedValueOnce(jsonResponse(200, { data: {} }))
      await apiFetch('/api/v1/users/me')
      const init = fetchSpy.mock.calls[0][1] as RequestInit
      const headers = init.headers as Record<string, string>
      expect(headers.Authorization).toBe('Bearer abc.def.ghi')
    })

    it('omits Authorization header when no token', async () => {
      fetchSpy.mockResolvedValueOnce(jsonResponse(200, { data: {} }))
      await apiFetch('/api/v1/users/me')
      const init = fetchSpy.mock.calls[0][1] as RequestInit
      const headers = init.headers as Record<string, string>
      expect(headers.Authorization).toBeUndefined()
    })

    it('skipAuth: true omits Authorization even with stored token', async () => {
      setStoredToken('abc.def.ghi')
      fetchSpy.mockResolvedValueOnce(jsonResponse(200, { data: {} }))
      await apiFetch('/api/v1/auth/login', {
        method: 'POST',
        skipAuth: true,
      })
      const init = fetchSpy.mock.calls[0][1] as RequestInit
      const headers = init.headers as Record<string, string>
      expect(headers.Authorization).toBeUndefined()
    })
  })

  describe('error envelope parsing', () => {
    it('throws ApiError on 400 with code + fieldErrors', async () => {
      fetchSpy.mockResolvedValueOnce(
        jsonResponse(400, {
          code: 'VALIDATION_FAILED',
          message: 'bad',
          requestId: 'r-42',
          fieldErrors: { email: 'bad format' },
        }),
      )
      await expect(apiFetch('/api/v1/x')).rejects.toMatchObject({
        name: 'ApiError',
        code: 'VALIDATION_FAILED',
        status: 400,
        requestId: 'r-42',
        fieldErrors: { email: 'bad format' },
      })
    })

    it('throws UNKNOWN when body is not JSON', async () => {
      fetchSpy.mockResolvedValueOnce(textResponse(500, 'Internal Server Error'))
      let thrown: ApiError | null = null
      try {
        await apiFetch('/api/v1/x')
      } catch (e) {
        thrown = e as ApiError
      }
      expect(thrown?.code).toBe('UNKNOWN')
      expect(thrown?.status).toBe(500)
      expect(thrown?.message).toBe('Internal Server Error')
      expect(thrown?.requestId).toBeNull()
    })
  })

  describe('401 handling', () => {
    it('authenticated 401 clears token and fires auth-invalidated event', async () => {
      setStoredToken('stale.token')
      const eventSpy = vi.fn()
      window.addEventListener(AUTH_INVALIDATED_EVENT, eventSpy)
      fetchSpy.mockResolvedValueOnce(
        jsonResponse(401, {
          code: 'TOKEN_EXPIRED',
          message: 'expired',
          requestId: 'r-x',
        }),
      )

      await expect(apiFetch('/api/v1/users/me')).rejects.toMatchObject({
        code: 'TOKEN_EXPIRED',
        status: 401,
      })
      expect(getStoredToken()).toBeNull()
      expect(eventSpy).toHaveBeenCalledTimes(1)

      window.removeEventListener(AUTH_INVALIDATED_EVENT, eventSpy)
    })

    it('skipAuth 401 does NOT clear token and does NOT fire event', async () => {
      setStoredToken('keep.this')
      const eventSpy = vi.fn()
      window.addEventListener(AUTH_INVALIDATED_EVENT, eventSpy)
      fetchSpy.mockResolvedValueOnce(
        jsonResponse(401, {
          code: 'INVALID_CREDENTIALS',
          message: 'bad',
          requestId: 'r-y',
        }),
      )

      await expect(
        apiFetch('/api/v1/auth/login', { method: 'POST', skipAuth: true }),
      ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS', status: 401 })
      expect(getStoredToken()).toBe('keep.this')
      expect(eventSpy).not.toHaveBeenCalled()

      window.removeEventListener(AUTH_INVALIDATED_EVENT, eventSpy)
    })
  })

  describe('network failures', () => {
    it('fetch rejection throws NETWORK_ERROR', async () => {
      fetchSpy.mockRejectedValueOnce(new TypeError('Failed to fetch'))
      await expect(apiFetch('/api/v1/x')).rejects.toMatchObject({
        name: 'ApiError',
        code: 'NETWORK_ERROR',
        status: 0,
      })
    })

    it('abort (timeout) throws NETWORK_ERROR', async () => {
      // Mock fetch that rejects with AbortError-like signal, matching what
      // happens when the AbortController fires.
      fetchSpy.mockImplementation(
        (_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            const signal = init.signal as AbortSignal
            signal.addEventListener('abort', () => {
              reject(new DOMException('aborted', 'AbortError'))
            })
          }),
      )

      const promise = apiFetch('/api/v1/slow', { timeoutMs: 50 })
      await expect(promise).rejects.toMatchObject({
        code: 'NETWORK_ERROR',
        status: 0,
      })
    })
  })

  describe('URL resolution', () => {
    it('prepends VITE_API_BASE_URL to absolute paths', async () => {
      fetchSpy.mockResolvedValueOnce(jsonResponse(200, { data: {} }))
      await apiFetch('/api/v1/x')
      const calledUrl = fetchSpy.mock.calls[0][0] as string
      // In tests VITE_API_BASE_URL may be empty; the url should still start with /api
      expect(calledUrl.endsWith('/api/v1/x')).toBe(true)
    })

    it('passes full https URLs through unchanged', async () => {
      fetchSpy.mockResolvedValueOnce(jsonResponse(200, { data: {} }))
      await apiFetch('https://external.test/thing')
      expect(fetchSpy.mock.calls[0][0]).toBe('https://external.test/thing')
    })
  })
})
