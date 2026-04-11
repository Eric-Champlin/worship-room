/**
 * BB-32 — Rate-limit module tests.
 *
 * Uses fake timers for all time-sensitive assertions to avoid flaky
 * wall-clock dependencies. `resetRateLimitForTests()` restores the
 * default full-bucket state between tests.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  RATE_LIMIT_BUCKET_SIZE,
  RATE_LIMIT_REFILL_PER_MINUTE,
  consumeRateLimitToken,
  getRateLimitState,
  resetRateLimitForTests,
} from '../rateLimit'

const EPOCH = new Date('2026-04-11T00:00:00Z').getTime()

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(EPOCH)
  resetRateLimitForTests()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('consumeRateLimitToken — basic budget', () => {
  it('first call returns {allowed: true}', () => {
    expect(consumeRateLimitToken('explain')).toEqual({ allowed: true })
  })

  it('10 consecutive calls all return {allowed: true} (full burst)', () => {
    for (let i = 0; i < 10; i++) {
      expect(consumeRateLimitToken('explain')).toEqual({ allowed: true })
    }
  })

  it('11th consecutive call returns {allowed: false} with retryAfterSeconds ≈ 6', () => {
    for (let i = 0; i < 10; i++) consumeRateLimitToken('explain')
    const decision = consumeRateLimitToken('explain')
    expect(decision.allowed).toBe(false)
    if (!decision.allowed) {
      expect(decision.retryAfterSeconds).toBeGreaterThanOrEqual(1)
      expect(decision.retryAfterSeconds).toBeLessThanOrEqual(6)
    }
  })
})

describe('refill behavior', () => {
  it('after 6 seconds idle, one more token is available', () => {
    for (let i = 0; i < 10; i++) consumeRateLimitToken('explain')
    // Empty bucket — denial
    expect(consumeRateLimitToken('explain').allowed).toBe(false)
    vi.setSystemTime(EPOCH + 6000)
    // One token refilled
    expect(consumeRateLimitToken('explain').allowed).toBe(true)
    // But only one — the next call should deny
    expect(consumeRateLimitToken('explain').allowed).toBe(false)
  })

  it('after 60 seconds idle, the bucket fully refills to 10', () => {
    for (let i = 0; i < 10; i++) consumeRateLimitToken('explain')
    vi.setSystemTime(EPOCH + 60_000)
    // 10 consecutive tokens available again
    for (let i = 0; i < 10; i++) {
      expect(consumeRateLimitToken('explain').allowed).toBe(true)
    }
    expect(consumeRateLimitToken('explain').allowed).toBe(false)
  })
})

describe('per-feature bucket isolation', () => {
  it('draining explain does not affect reflect', () => {
    for (let i = 0; i < 10; i++) consumeRateLimitToken('explain')
    expect(consumeRateLimitToken('explain').allowed).toBe(false)
    // Reflect still full
    expect(getRateLimitState('reflect').tokensRemaining).toBe(10)
    for (let i = 0; i < 10; i++) {
      expect(consumeRateLimitToken('reflect').allowed).toBe(true)
    }
  })

  it('draining reflect does not affect explain', () => {
    for (let i = 0; i < 10; i++) consumeRateLimitToken('reflect')
    expect(consumeRateLimitToken('reflect').allowed).toBe(false)
    expect(getRateLimitState('explain').tokensRemaining).toBe(10)
    expect(consumeRateLimitToken('explain').allowed).toBe(true)
  })
})

describe('getRateLimitState', () => {
  it('returns correct tokensRemaining after partial consumption', () => {
    consumeRateLimitToken('explain')
    consumeRateLimitToken('explain')
    consumeRateLimitToken('explain')
    consumeRateLimitToken('explain')
    expect(getRateLimitState('explain').tokensRemaining).toBe(6)
  })

  it('returns nextRefillInSeconds close to 6 right after a consumption', () => {
    consumeRateLimitToken('explain')
    const state = getRateLimitState('explain')
    expect(state.nextRefillInSeconds).toBeGreaterThanOrEqual(0)
    expect(state.nextRefillInSeconds).toBeLessThanOrEqual(6)
  })

  it('returns tokensRemaining: 10 after a full minute idle', () => {
    for (let i = 0; i < 10; i++) consumeRateLimitToken('explain')
    expect(getRateLimitState('explain').tokensRemaining).toBe(0)
    vi.setSystemTime(EPOCH + 60_000)
    expect(getRateLimitState('explain').tokensRemaining).toBe(10)
  })
})

describe('resetRateLimitForTests', () => {
  it('restores both buckets to full', () => {
    for (let i = 0; i < 10; i++) {
      consumeRateLimitToken('explain')
      consumeRateLimitToken('reflect')
    }
    expect(getRateLimitState('explain').tokensRemaining).toBe(0)
    expect(getRateLimitState('reflect').tokensRemaining).toBe(0)
    resetRateLimitForTests()
    expect(getRateLimitState('explain').tokensRemaining).toBe(10)
    expect(getRateLimitState('reflect').tokensRemaining).toBe(10)
  })
})

describe('exported constants', () => {
  it('RATE_LIMIT_BUCKET_SIZE === 10', () => {
    expect(RATE_LIMIT_BUCKET_SIZE).toBe(10)
  })

  it('RATE_LIMIT_REFILL_PER_MINUTE === 10', () => {
    expect(RATE_LIMIT_REFILL_PER_MINUTE).toBe(10)
  })
})

describe('fractional accumulation preservation', () => {
  it('a sub-6-second call does not reset the refill clock', () => {
    // Drain the bucket
    for (let i = 0; i < 10; i++) consumeRateLimitToken('explain')
    // 1 second later — no tokens to refill yet, call is a denial
    vi.setSystemTime(EPOCH + 1000)
    expect(consumeRateLimitToken('explain').allowed).toBe(false)
    // 5 more seconds — we've now been idle 6 seconds TOTAL since drain.
    // If `lastRefillAt` was reset by the denial at t=1000, this would
    // report "still need to wait" because only 5s have passed since the
    // last "refill attempt". Fractional preservation means it works.
    vi.setSystemTime(EPOCH + 6000)
    expect(consumeRateLimitToken('explain').allowed).toBe(true)
  })
})

describe('clock skew safety', () => {
  it('Date.now going backwards does not crash or add tokens', () => {
    consumeRateLimitToken('explain') // 10 → 9
    // Jump backwards
    vi.setSystemTime(EPOCH - 60_000)
    // Refill is a no-op — tokens still at 9 (not 10)
    expect(getRateLimitState('explain').tokensRemaining).toBe(9)
    // And no crash
    expect(() => consumeRateLimitToken('explain')).not.toThrow()
  })
})

describe('retryAfterSeconds edge cases', () => {
  it('retryAfterSeconds is always at least 1 even when nearly-refilled', () => {
    for (let i = 0; i < 10; i++) consumeRateLimitToken('explain')
    // Advance to just under a full refill interval (e.g., 5999ms)
    vi.setSystemTime(EPOCH + 5999)
    const decision = consumeRateLimitToken('explain')
    expect(decision.allowed).toBe(false)
    if (!decision.allowed) {
      expect(decision.retryAfterSeconds).toBeGreaterThanOrEqual(1)
    }
  })
})

describe('bucket overflow cap', () => {
  it('bucket does not exceed BUCKET_SIZE after long idle', () => {
    consumeRateLimitToken('explain') // 10 → 9
    // Advance 10 minutes — would add 100 tokens if uncapped
    vi.setSystemTime(EPOCH + 10 * 60_000)
    expect(getRateLimitState('explain').tokensRemaining).toBe(10)
  })
})
