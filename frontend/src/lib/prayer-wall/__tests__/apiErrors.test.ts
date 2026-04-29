import { describe, it, expect } from 'vitest'
import { ApiError } from '@/types/auth'
import {
  AnonymousWriteAttemptError,
  PRAYER_WALL_API_ERROR_COPY,
  mapApiErrorToToast,
  parseRetryAfter,
} from '../apiErrors'

describe('AnonymousWriteAttemptError', () => {
  it('carries name "AnonymousWriteAttemptError" for instanceof checks', () => {
    const err = new AnonymousWriteAttemptError('post')
    expect(err.name).toBe('AnonymousWriteAttemptError')
    expect(err).toBeInstanceOf(AnonymousWriteAttemptError)
    expect(err).toBeInstanceOf(Error)
  })

  it('includes the operation name in the message', () => {
    const err = new AnonymousWriteAttemptError('createComment')
    expect(err.message).toContain('createComment')
  })
})

describe('mapApiErrorToToast — error-code-driven specials', () => {
  it('maps EDIT_WINDOW_EXPIRED (status 409) to the distinct edit-window copy', () => {
    const err = new ApiError('EDIT_WINDOW_EXPIRED', 409, 'past window', null)
    expect(mapApiErrorToToast(err)).toEqual({
      message: PRAYER_WALL_API_ERROR_COPY.EDIT_WINDOW_EXPIRED,
      severity: 'warning',
    })
  })

  it('maps IDEMPOTENCY_KEY_MISMATCH (status 422) to the generic-try-again copy', () => {
    const err = new ApiError('IDEMPOTENCY_KEY_MISMATCH', 422, 'mismatch', null)
    expect(mapApiErrorToToast(err)).toMatchObject({
      message: PRAYER_WALL_API_ERROR_COPY.IDEMPOTENCY_KEY_MISMATCH,
      severity: 'error',
    })
  })
})

describe('mapApiErrorToToast — status-code-driven generics', () => {
  it('maps NETWORK_ERROR (status 0) to the offline copy with severity=warning', () => {
    const err = new ApiError('NETWORK_ERROR', 0, 'offline', null)
    expect(mapApiErrorToToast(err)).toEqual({
      message: PRAYER_WALL_API_ERROR_COPY.NETWORK_ERROR,
      severity: 'warning',
    })
  })

  it('maps 429 with retryAfterSeconds=12 to a numeric "12 seconds" message', () => {
    const err = new ApiError('RATE_LIMITED', 429, 'too many', null)
    const result = mapApiErrorToToast(err, 12)
    expect(result.message).toBe('Slow down a moment. You can post again in 12 seconds.')
    expect(result.severity).toBe('warning')
    expect(result.retryAfterSeconds).toBe(12)
  })

  it('maps 429 without retryAfterSeconds to a generic "a few seconds" message', () => {
    const err = new ApiError('RATE_LIMITED', 429, 'too many', null)
    const result = mapApiErrorToToast(err)
    expect(result.message).toContain('Slow down a moment')
    expect(result.message).not.toContain('{seconds}')
    expect(result.severity).toBe('warning')
  })

  it('maps 401 to empty message (apiFetch already triggers AuthModal)', () => {
    const err = new ApiError('UNAUTHORIZED', 401, 'stale', null)
    expect(mapApiErrorToToast(err)).toEqual({ message: '', severity: 'error' })
  })

  it('maps 403 to the forbidden copy', () => {
    const err = new ApiError('FORBIDDEN', 403, 'no perm', null)
    expect(mapApiErrorToToast(err).message).toBe(
      PRAYER_WALL_API_ERROR_COPY.FORBIDDEN,
    )
  })

  it('maps 404 to the not-found copy', () => {
    const err = new ApiError('NOT_FOUND', 404, 'missing', null)
    expect(mapApiErrorToToast(err).message).toBe(
      PRAYER_WALL_API_ERROR_COPY.NOT_FOUND,
    )
  })

  it('maps 400 with a server message to the validation copy with the trailer appended', () => {
    const err = new ApiError(
      'INVALID_INPUT',
      400,
      'content cannot be empty',
      null,
    )
    expect(mapApiErrorToToast(err).message).toBe(
      'Something in your post needs another look. content cannot be empty',
    )
  })

  it('maps 400 with empty server message to the validation copy without the trailer', () => {
    const err = new ApiError('INVALID_INPUT', 400, '', null)
    expect(mapApiErrorToToast(err).message).toBe(
      'Something in your post needs another look.',
    )
  })

  it('maps 500+ to the server-error copy', () => {
    const err = new ApiError('INTERNAL_ERROR', 500, 'oops', null)
    expect(mapApiErrorToToast(err).message).toBe(
      PRAYER_WALL_API_ERROR_COPY.SERVER_ERROR,
    )
  })

  it('falls back to the unknown copy for unmapped status (e.g. 418)', () => {
    const err = new ApiError('TEAPOT', 418, 'no coffee', null)
    expect(mapApiErrorToToast(err).message).toBe(
      PRAYER_WALL_API_ERROR_COPY.UNKNOWN,
    )
  })
})

describe('parseRetryAfter', () => {
  it('returns undefined for null', () => {
    expect(parseRetryAfter(null)).toBeUndefined()
  })

  it('returns undefined for an empty string', () => {
    expect(parseRetryAfter('')).toBeUndefined()
  })

  it('parses an integer-seconds value', () => {
    expect(parseRetryAfter('30')).toBe(30)
  })

  it('returns undefined for a non-integer value (HTTP-date not supported)', () => {
    expect(parseRetryAfter('Wed, 21 Oct 2026 07:28:00 GMT')).toBeUndefined()
  })

  it('returns undefined for a negative value', () => {
    expect(parseRetryAfter('-1')).toBeUndefined()
  })
})
