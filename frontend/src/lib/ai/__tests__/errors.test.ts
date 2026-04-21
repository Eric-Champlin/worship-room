import { describe, expect, it } from 'vitest'
import * as errorsModule from '../errors'
import {
  GeminiApiError,
  GeminiNetworkError,
  GeminiSafetyBlockError,
  GeminiTimeoutError,
  RateLimitError,
} from '../errors'

const ERROR_CLASSES = [
  { name: 'GeminiNetworkError', Ctor: GeminiNetworkError },
  { name: 'GeminiApiError', Ctor: GeminiApiError },
  { name: 'GeminiSafetyBlockError', Ctor: GeminiSafetyBlockError },
  { name: 'GeminiTimeoutError', Ctor: GeminiTimeoutError },
] as const

describe('Gemini typed error classes', () => {
  describe.each(ERROR_CLASSES)('$name', ({ name, Ctor }) => {
    it(`has name === '${name}'`, () => {
      expect(new Ctor().name).toBe(name)
    })

    it('instantiates with a non-empty default message', () => {
      expect(new Ctor().message.length).toBeGreaterThan(0)
    })

    it('accepts a custom message', () => {
      expect(new Ctor('custom message').message).toBe('custom message')
    })

    it('preserves the original error as `cause`', () => {
      const original = new Error('root cause')
      const err = new Ctor('wrapped', { cause: original })
      expect(err.cause).toBe(original)
    })

    it('is instanceof Error', () => {
      expect(new Ctor()).toBeInstanceOf(Error)
    })
  })
})

describe('RateLimitError (BB-32)', () => {
  it('is an instance of RateLimitError and Error', () => {
    const err = new RateLimitError(8)
    expect(err).toBeInstanceOf(RateLimitError)
    expect(err).toBeInstanceOf(Error)
  })

  it('exposes retryAfterSeconds as a field', () => {
    expect(new RateLimitError(8).retryAfterSeconds).toBe(8)
    expect(new RateLimitError(1).retryAfterSeconds).toBe(1)
    expect(new RateLimitError(60).retryAfterSeconds).toBe(60)
  })

  it('message includes the seconds in the standard format', () => {
    expect(new RateLimitError(8).message).toBe(
      'Too many requests. Try again in 8 seconds.',
    )
  })

  it("name === 'RateLimitError'", () => {
    expect(new RateLimitError(5).name).toBe('RateLimitError')
  })

  it('preserves cause when constructed with {cause: original}', () => {
    const original = new Error('root cause')
    const err = new RateLimitError(3, { cause: original })
    expect(err.cause).toBe(original)
  })

  /**
   * Regression guard: the error module exports exactly 5 classes post-Spec-2
   * (4 pre-existing Gemini* + RateLimitError). The key-missing error class
   * was deleted in Spec 2 — the frontend no longer owns the API key.
   */
  it('errors module exports exactly 5 error classes', () => {
    const errorExports = Object.keys(errorsModule).filter((k) =>
      k.endsWith('Error'),
    )
    expect(errorExports.sort()).toEqual(
      [
        'GeminiApiError',
        'GeminiNetworkError',
        'GeminiSafetyBlockError',
        'GeminiTimeoutError',
        'RateLimitError',
      ].sort(),
    )
  })
})
