import { describe, expect, it } from 'vitest'
import {
  GeminiApiError,
  GeminiKeyMissingError,
  GeminiNetworkError,
  GeminiSafetyBlockError,
  GeminiTimeoutError,
} from '../errors'

const ERROR_CLASSES = [
  { name: 'GeminiNetworkError', Ctor: GeminiNetworkError },
  { name: 'GeminiApiError', Ctor: GeminiApiError },
  { name: 'GeminiSafetyBlockError', Ctor: GeminiSafetyBlockError },
  { name: 'GeminiTimeoutError', Ctor: GeminiTimeoutError },
  { name: 'GeminiKeyMissingError', Ctor: GeminiKeyMissingError },
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
