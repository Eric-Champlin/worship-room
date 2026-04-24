import { describe, it, expect } from 'vitest'
import {
  ApiError,
  AuthError,
  AUTH_ERROR_COPY,
  type AuthErrorCode,
} from '../auth'

describe('auth types', () => {
  it('AuthError is an Error instance with typed name', () => {
    const e = new AuthError('INVALID_CREDENTIALS', 'bad creds')
    expect(e).toBeInstanceOf(Error)
    expect(e).toBeInstanceOf(AuthError)
    expect(e.name).toBe('AuthError')
    expect(e.code).toBe('INVALID_CREDENTIALS')
    expect(e.message).toBe('bad creds')
    expect(e.fieldErrors).toBeUndefined()
  })

  it('AuthError carries fieldErrors when provided', () => {
    const e = new AuthError('VALIDATION_FAILED', 'validation', {
      email: 'bad email',
    })
    expect(e.fieldErrors).toEqual({ email: 'bad email' })
  })

  it('ApiError is an Error instance with status + code + requestId', () => {
    const e = new ApiError('UNKNOWN', 500, 'boom', 'req-1')
    expect(e).toBeInstanceOf(Error)
    expect(e).toBeInstanceOf(ApiError)
    expect(e.name).toBe('ApiError')
    expect(e.code).toBe('UNKNOWN')
    expect(e.status).toBe(500)
    expect(e.message).toBe('boom')
    expect(e.requestId).toBe('req-1')
    expect(e.fieldErrors).toBeUndefined()
  })

  it('ApiError fieldErrors optional', () => {
    const e = new ApiError('VALIDATION_FAILED', 400, 'x', 'r', {
      email: 'bad',
    })
    expect(e.fieldErrors).toEqual({ email: 'bad' })
  })

  it('AUTH_ERROR_COPY has every AuthErrorCode mapped to a non-empty string', () => {
    const codes: AuthErrorCode[] = [
      'INVALID_CREDENTIALS',
      'VALIDATION_FAILED',
      'RATE_LIMITED',
      'ACCOUNT_LOCKED',
      'AUTO_LOGIN_FAILED',
      'NETWORK_ERROR',
      'UNKNOWN',
    ]
    expect(Object.keys(AUTH_ERROR_COPY).sort()).toEqual([...codes].sort())
    for (const code of codes) {
      expect(typeof AUTH_ERROR_COPY[code]).toBe('string')
      expect(AUTH_ERROR_COPY[code].length).toBeGreaterThan(10)
    }
  })

  it('error copy is anti-pressure — no exclamation points', () => {
    for (const code of Object.keys(AUTH_ERROR_COPY) as AuthErrorCode[]) {
      expect(AUTH_ERROR_COPY[code]).not.toContain('!')
    }
  })
})
