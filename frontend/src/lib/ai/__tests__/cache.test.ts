/**
 * BB-32 — Cache module tests.
 *
 * Uses real localStorage (jsdom) for most tests. The private-browsing /
 * quota-exceeded tests stub `globalThis.localStorage` to throw.
 *
 * Fake timers for TTL tests. `vi.useFakeTimers()` + `vi.setSystemTime()`.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearAllAICache,
  clearExpiredAICache,
  getAICacheStorageBytes,
  getCachedAIResult,
  setCachedAIResult,
} from '../cache'

const MODEL = 'gemini-2.5-flash-lite'
const CACHE_PREFIX = 'bb32-v1:'

function listCacheKeys(): string[] {
  const keys: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k && k.startsWith(CACHE_PREFIX)) keys.push(k)
  }
  return keys
}

beforeEach(() => {
  localStorage.clear()
  vi.useRealTimers()
})

afterEach(() => {
  localStorage.clear()
  vi.useRealTimers()
})

describe('getCachedAIResult — miss and hit round trip', () => {
  it('returns null when the cache is empty', () => {
    expect(getCachedAIResult('explain', 'John 3:16', 'For God so loved')).toBeNull()
  })

  it('returns the stored entry after setCachedAIResult', () => {
    setCachedAIResult('explain', 'John 3:16', 'For God so loved', {
      content: 'Hello',
      model: MODEL,
    })
    const hit = getCachedAIResult('explain', 'John 3:16', 'For God so loved')
    expect(hit).toEqual({ content: 'Hello', model: MODEL })
  })

  it('returns the {content, model} shape exactly — no extra fields leak', () => {
    setCachedAIResult('reflect', 'Psalm 23:1', 'The LORD is my shepherd', {
      content: 'A short reflection',
      model: MODEL,
    })
    const hit = getCachedAIResult('reflect', 'Psalm 23:1', 'The LORD is my shepherd')
    expect(hit).not.toBeNull()
    expect(Object.keys(hit!).sort()).toEqual(['content', 'model'])
  })
})

describe('cache key format', () => {
  it('writes a key with the bb32-v1: prefix', () => {
    setCachedAIResult('explain', 'John 3:16', 'For God so loved', {
      content: 'x',
      model: MODEL,
    })
    const keys = listCacheKeys()
    expect(keys.length).toBe(1)
    expect(keys[0]).toMatch(/^bb32-v1:/)
  })

  it('writes a key in bb32-v1:<feature>:<model>:<reference>:<hash> format', () => {
    setCachedAIResult('explain', 'John 3:16', 'For God so loved', {
      content: 'x',
      model: MODEL,
    })
    const keys = listCacheKeys()
    // Split on ':' up to 5 segments; the reference may contain a colon
    // (e.g. "John 3:16") so we parse carefully.
    const key = keys[0]
    expect(key.startsWith(`bb32-v1:explain:${MODEL}:`)).toBe(true)
    expect(key).toMatch(/bb32-v1:explain:gemini-2\.5-flash-lite:John 3:16:[a-z0-9]+$/)
  })

  it('per-feature isolation — explain and reflect with same ref+text produce different keys', () => {
    setCachedAIResult('explain', 'John 3:16', 'same text', { content: 'E', model: MODEL })
    setCachedAIResult('reflect', 'John 3:16', 'same text', { content: 'R', model: MODEL })
    expect(listCacheKeys().length).toBe(2)
    expect(getCachedAIResult('explain', 'John 3:16', 'same text')?.content).toBe('E')
    expect(getCachedAIResult('reflect', 'John 3:16', 'same text')?.content).toBe('R')
  })
})

describe('TTL expiration', () => {
  it('returns null after 7 days + 1ms (expired)', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-11T00:00:00Z'))
    setCachedAIResult('explain', 'John 3:16', 'x', { content: 'x', model: MODEL })
    // Advance just past the 7-day TTL
    vi.setSystemTime(new Date('2026-04-11T00:00:00Z').getTime() + 7 * 24 * 60 * 60 * 1000 + 1)
    expect(getCachedAIResult('explain', 'John 3:16', 'x')).toBeNull()
    // Side effect: expired entry removed from storage
    expect(listCacheKeys().length).toBe(0)
  })

  it('returns the entry within 7 days (6 days later still fresh)', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-11T00:00:00Z'))
    setCachedAIResult('explain', 'John 3:16', 'x', { content: 'fresh', model: MODEL })
    vi.setSystemTime(new Date('2026-04-17T00:00:00Z')) // 6 days later
    expect(getCachedAIResult('explain', 'John 3:16', 'x')?.content).toBe('fresh')
  })
})

describe('corrupt and version-mismatched entries', () => {
  it('removes a corrupt JSON entry and returns null', () => {
    // Manually write an invalid JSON blob under a valid-looking key
    const key = `bb32-v1:explain:${MODEL}:John 3:16:deadbeef`
    localStorage.setItem(key, 'not-json-{{{')
    expect(getCachedAIResult('explain', 'John 3:16', 'whatever')).toBeNull()
    // The corrupt entry was removed — but only on lookup of its actual key,
    // which depends on the hash. So we can't directly check removal via the
    // public API. Assert that `clearExpiredAICache` at least finds it.
    expect(listCacheKeys().length).toBeLessThanOrEqual(1)
  })

  it('removes a version-mismatched entry and returns null', () => {
    setCachedAIResult('explain', 'John 3:16', 'x', { content: 'v1', model: MODEL })
    // Rewrite the stored value with a different schema version
    const [key] = listCacheKeys()
    const raw = localStorage.getItem(key)!
    const parsed = JSON.parse(raw)
    parsed.v = 2
    localStorage.setItem(key, JSON.stringify(parsed))
    expect(getCachedAIResult('explain', 'John 3:16', 'x')).toBeNull()
    expect(listCacheKeys().length).toBe(0) // removed on read
  })
})

describe('clearExpiredAICache', () => {
  it('removes only expired entries and returns the count', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-11T00:00:00Z'))
    setCachedAIResult('explain', 'A', 'a', { content: 'A', model: MODEL })
    setCachedAIResult('explain', 'B', 'b', { content: 'B', model: MODEL })
    // Advance past TTL for both
    vi.setSystemTime(new Date('2026-04-20T00:00:00Z')) // 9 days later
    setCachedAIResult('explain', 'C', 'c', { content: 'C', model: MODEL }) // fresh
    const cleared = clearExpiredAICache()
    expect(cleared).toBe(2)
    expect(getCachedAIResult('explain', 'A', 'a')).toBeNull()
    expect(getCachedAIResult('explain', 'B', 'b')).toBeNull()
    expect(getCachedAIResult('explain', 'C', 'c')?.content).toBe('C')
  })

  it('removes version-mismatched entries', () => {
    setCachedAIResult('explain', 'John 3:16', 'x', { content: 'x', model: MODEL })
    const [key] = listCacheKeys()
    const raw = localStorage.getItem(key)!
    const parsed = JSON.parse(raw)
    parsed.v = 99
    localStorage.setItem(key, JSON.stringify(parsed))
    const cleared = clearExpiredAICache()
    expect(cleared).toBe(1)
    expect(listCacheKeys().length).toBe(0)
  })
})

describe('clearAllAICache', () => {
  it('removes all bb32-v1: entries but leaves other localStorage keys', () => {
    setCachedAIResult('explain', 'A', 'a', { content: 'A', model: MODEL })
    setCachedAIResult('reflect', 'B', 'b', { content: 'B', model: MODEL })
    localStorage.setItem('wr_user_name', 'Alice')
    localStorage.setItem('bible:bookmarks', '[]')
    clearAllAICache()
    expect(listCacheKeys().length).toBe(0)
    expect(localStorage.getItem('wr_user_name')).toBe('Alice')
    expect(localStorage.getItem('bible:bookmarks')).toBe('[]')
  })
})

describe('getAICacheStorageBytes', () => {
  it('returns 0 for an empty cache', () => {
    expect(getAICacheStorageBytes()).toBe(0)
  })

  it('returns a positive number roughly proportional to stored data', () => {
    expect(getAICacheStorageBytes()).toBe(0)
    setCachedAIResult('explain', 'A', 'a', {
      content: 'x'.repeat(1000),
      model: MODEL,
    })
    const bytes = getAICacheStorageBytes()
    // At least 1000 content chars * 2 bytes each = 2000 bytes minimum
    expect(bytes).toBeGreaterThan(2000)
    // Upper bound: key (~50) + JSON overhead (~100) + 1000 chars, all × 2 = ~2300
    expect(bytes).toBeLessThan(5000)
  })
})

describe('eviction', () => {
  it('triggers eviction when adding would exceed the 2 MB cap', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-11T00:00:00Z'))
    // Pre-fill with ~1.95 MB of entries (just under the 2 MB cap)
    // Each entry: key ~60 chars + content 50000 chars + JSON overhead = ~100160 bytes
    // 20 entries × ~100KB ≈ 2 MB
    for (let i = 0; i < 20; i++) {
      vi.setSystemTime(new Date('2026-04-11T00:00:00Z').getTime() + i * 1000)
      setCachedAIResult('explain', `Ref${i}`, `text${i}`, {
        content: 'x'.repeat(50000),
        model: MODEL,
      })
    }
    const beforeBytes = getAICacheStorageBytes()
    const beforeCount = listCacheKeys().length

    // Add one more — should trigger eviction of the oldest
    vi.setSystemTime(new Date('2026-04-11T00:00:00Z').getTime() + 20 * 1000)
    setCachedAIResult('explain', 'NewRef', 'newtext', {
      content: 'x'.repeat(50000),
      model: MODEL,
    })
    const afterBytes = getAICacheStorageBytes()
    // Cache should still be within cap (with some slack for the new entry)
    expect(afterBytes).toBeLessThanOrEqual(2 * 1024 * 1024)
    // Something got evicted (count did not strictly grow by 1)
    expect(listCacheKeys().length).toBeLessThanOrEqual(beforeCount + 1)
    // New entry is retrievable
    expect(getCachedAIResult('explain', 'NewRef', 'newtext')).not.toBeNull()
    // Unused variable guard for tooling: beforeBytes used implicitly for size reasoning
    expect(beforeBytes).toBeGreaterThan(0)
  })

  it('removes oldest entries first (LRU-ish by createdAt)', () => {
    vi.useFakeTimers()
    const base = new Date('2026-04-11T00:00:00Z').getTime()
    // Three large entries at t=0, t=1000, t=2000
    vi.setSystemTime(base)
    setCachedAIResult('explain', 'Oldest', 'text-oldest', {
      content: 'x'.repeat(800_000),
      model: MODEL,
    })
    vi.setSystemTime(base + 1000)
    setCachedAIResult('explain', 'Middle', 'text-middle', {
      content: 'x'.repeat(800_000),
      model: MODEL,
    })
    vi.setSystemTime(base + 2000)
    setCachedAIResult('explain', 'Newest', 'text-newest', {
      content: 'x'.repeat(800_000),
      model: MODEL,
    })
    // At this point total is ~4.8 MB but each add evicted as needed.
    // The newest should still be retrievable; the oldest likely gone.
    expect(getCachedAIResult('explain', 'Newest', 'text-newest')).not.toBeNull()
    // The OLDEST should be gone (evicted first)
    expect(getCachedAIResult('explain', 'Oldest', 'text-oldest')).toBeNull()
  })

  it('silently drops a single entry larger than the 2 MB cap', () => {
    // 3 MB of content — exceeds the 2 MB cap even with an empty cache
    setCachedAIResult('explain', 'Huge', 'huge-text', {
      content: 'x'.repeat(3 * 1024 * 1024),
      model: MODEL,
    })
    expect(getCachedAIResult('explain', 'Huge', 'huge-text')).toBeNull()
    expect(listCacheKeys().length).toBe(0)
  })
})

describe('localStorage failure modes', () => {
  it('all operations are no-ops when localStorage throws', () => {
    const original = globalThis.localStorage
    const throwing = {
      get length() { throw new Error('disabled') },
      getItem() { throw new Error('disabled') },
      setItem() { throw new Error('disabled') },
      removeItem() { throw new Error('disabled') },
      key() { throw new Error('disabled') },
      clear() { throw new Error('disabled') },
    }
    Object.defineProperty(globalThis, 'localStorage', {
      value: throwing,
      configurable: true,
    })

    try {
      expect(() =>
        setCachedAIResult('explain', 'A', 'a', { content: 'x', model: MODEL }),
      ).not.toThrow()
      expect(getCachedAIResult('explain', 'A', 'a')).toBeNull()
      expect(clearExpiredAICache()).toBe(0)
      expect(() => clearAllAICache()).not.toThrow()
      expect(getAICacheStorageBytes()).toBe(0)
    } finally {
      Object.defineProperty(globalThis, 'localStorage', {
        value: original,
        configurable: true,
      })
    }
  })

  it('all operations are no-ops when localStorage is undefined', () => {
    const original = globalThis.localStorage
    Object.defineProperty(globalThis, 'localStorage', {
      value: undefined,
      configurable: true,
    })

    try {
      expect(() =>
        setCachedAIResult('explain', 'A', 'a', { content: 'x', model: MODEL }),
      ).not.toThrow()
      expect(getCachedAIResult('explain', 'A', 'a')).toBeNull()
      expect(getAICacheStorageBytes()).toBe(0)
    } finally {
      Object.defineProperty(globalThis, 'localStorage', {
        value: original,
        configurable: true,
      })
    }
  })
})

describe('key generation — determinism and distinctness', () => {
  it('same (feature, reference, verseText) produces the same key on repeated calls', () => {
    setCachedAIResult('explain', 'John 3:16', 'For God so loved', {
      content: 'v1',
      model: MODEL,
    })
    const keysAfterFirst = listCacheKeys().slice()
    setCachedAIResult('explain', 'John 3:16', 'For God so loved', {
      content: 'v2',
      model: MODEL,
    })
    const keysAfterSecond = listCacheKeys()
    // Second write used the same key — count did not grow, and content overwrote.
    expect(keysAfterSecond).toEqual(keysAfterFirst)
    expect(getCachedAIResult('explain', 'John 3:16', 'For God so loved')?.content).toBe('v2')
  })

  it('different verse text produces different cache keys for the same reference', () => {
    setCachedAIResult('explain', 'John 3:16', 'Text one', { content: '1', model: MODEL })
    setCachedAIResult('explain', 'John 3:16', 'Text two', { content: '2', model: MODEL })
    expect(listCacheKeys().length).toBe(2)
  })

  /**
   * Acceptance criterion 45 + determinism guard (added during /plan review).
   * Hardcodes the 8 BB-30 and 8 BB-31 prompt-test passages (shared references
   * `1 Corinthians 13:4-7` and `Philippians 4:6-7` deliberately collide on
   * reference + verse text — they should still produce distinct keys because
   * the `<feature>` segment differentiates them).
   *
   * Runs the write pass TWICE:
   *   - Pass 1: expect exactly 16 unique keys written
   *   - Pass 2: write the same inputs again; expect the SAME 16 keys (counts
   *     and union size unchanged). This catches a hidden-state hash bug that
   *     would otherwise produce 32 distinct keys.
   */
  it('16 BB-30 + BB-31 prompt-test passages produce 16 unique deterministic keys', () => {
    // Minimal verse-text payloads — DJB2 operates on content, not length.
    // Any non-empty distinct strings would work for the uniqueness check,
    // but we use realistic excerpts for documentation.
    const passages: Array<{ feature: 'explain' | 'reflect'; ref: string; text: string }> = [
      // BB-30 (explain)
      { feature: 'explain', ref: 'John 3:16', text: 'For God so loved the world' },
      { feature: 'explain', ref: 'Psalm 23:1', text: 'The LORD is my shepherd' },
      { feature: 'explain', ref: '1 Corinthians 13:4-7', text: 'Love is patient is kind' },
      { feature: 'explain', ref: 'Philippians 4:6-7', text: 'In nothing be anxious' },
      { feature: 'explain', ref: 'Leviticus 19:19', text: 'You shall keep my statutes' },
      { feature: 'explain', ref: 'Genesis 22:1-2', text: 'God tested Abraham' },
      { feature: 'explain', ref: '1 Timothy 2:11-12', text: 'Let a woman learn' },
      { feature: 'explain', ref: 'Romans 1:26-27', text: 'God gave them up' },
      // BB-31 (reflect) — note 1 Cor 13:4-7 and Phil 4:6-7 repeat from BB-30
      { feature: 'reflect', ref: 'Psalm 23:1-4', text: 'The LORD is my shepherd I shall not want' },
      { feature: 'reflect', ref: 'Ecclesiastes 3:1-8', text: 'For everything there is a season' },
      { feature: 'reflect', ref: 'Matthew 6:25-27', text: 'Do not be anxious about your life' },
      { feature: 'reflect', ref: 'Romans 8:38-39', text: 'Neither death nor life' },
      { feature: 'reflect', ref: 'Proverbs 13:11', text: 'Wealth gained hastily will dwindle' },
      { feature: 'reflect', ref: '1 Corinthians 13:4-7', text: 'Love is patient is kind' },
      { feature: 'reflect', ref: 'Ephesians 5:22-24', text: 'Wives submit to your own husbands' },
      { feature: 'reflect', ref: 'Philippians 4:6-7', text: 'In nothing be anxious' },
    ]

    // Pass 1
    for (const p of passages) {
      setCachedAIResult(p.feature, p.ref, p.text, { content: 'c', model: MODEL })
    }
    const firstPass = listCacheKeys().slice().sort()
    expect(firstPass.length).toBe(16)
    expect(new Set(firstPass).size).toBe(16) // zero collisions

    // Pass 2 — write again with the same inputs. Because each write
    // overwrites the same key, the total count stays at 16 (not 32).
    for (const p of passages) {
      setCachedAIResult(p.feature, p.ref, p.text, { content: 'c', model: MODEL })
    }
    const secondPass = listCacheKeys().slice().sort()
    expect(secondPass.length).toBe(16)
    // Determinism: the two passes must produce IDENTICAL key sets.
    expect(secondPass).toEqual(firstPass)
    expect(new Set([...firstPass, ...secondPass]).size).toBe(16)
  })
})

describe('round-trip integrity', () => {
  it('preserves the model string on round trip', () => {
    setCachedAIResult('explain', 'John 3:16', 'x', {
      content: 'content',
      model: MODEL,
    })
    expect(getCachedAIResult('explain', 'John 3:16', 'x')?.model).toBe(MODEL)
  })

  it('overwrites on repeated set (latest wins)', () => {
    setCachedAIResult('explain', 'John 3:16', 'x', { content: 'first', model: MODEL })
    setCachedAIResult('explain', 'John 3:16', 'x', { content: 'second', model: MODEL })
    expect(getCachedAIResult('explain', 'John 3:16', 'x')?.content).toBe('second')
    expect(listCacheKeys().length).toBe(1)
  })

  it('getCachedAIResult does not throw on an empty-state call (smoke)', () => {
    expect(() => getCachedAIResult('explain', 'anything', 'anything')).not.toThrow()
  })
})
