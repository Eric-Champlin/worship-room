import { beforeEach, describe, it, expect, vi } from 'vitest'
import { getMockReactions } from '@/mocks/prayer-wall-mock-data'
import {
  getReactions,
  getReaction,
  getSnapshot,
  togglePraying,
  toggleBookmark,
  toggleCandle,
  subscribe,
  _resetForTesting,
} from '../reactionsStore'

const STORAGE_KEY = 'wr_prayer_reactions'

beforeEach(() => {
  localStorage.clear()
  _resetForTesting()
  vi.restoreAllMocks()
})

describe('seeding', () => {
  it('returns seeded cache on first load with empty storage', () => {
    const result = getReactions()
    expect(result).toEqual(getMockReactions())
  })

  it('writes the seed back to localStorage on first load', () => {
    getReactions()
    const stored = localStorage.getItem(STORAGE_KEY)
    expect(stored).not.toBeNull()
    const parsed = JSON.parse(stored!)
    expect(parsed).toEqual(getMockReactions())
  })

  it('returns persisted data on second load (cache miss, storage hit)', () => {
    togglePraying('prayer-1')
    const beforeReset = getReaction('prayer-1')!.isPraying
    _resetForTesting() // clear in-memory cache only, NOT localStorage
    const after = getReaction('prayer-1')!.isPraying
    expect(after).toBe(beforeReset)
  })
})

describe('togglePraying', () => {
  it('flips isPraying from false → true, returns false, writes to localStorage', () => {
    const returned = togglePraying('new-prayer-x')
    expect(returned).toBe(false)
    expect(getReaction('new-prayer-x')?.isPraying).toBe(true)
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
    expect(stored['new-prayer-x'].isPraying).toBe(true)
  })

  it('flips isPraying true → false → true, returning previous value each time', () => {
    togglePraying('new-prayer-y') // false → true, returns false
    const second = togglePraying('new-prayer-y') // true → false, returns true
    expect(second).toBe(true)
    const third = togglePraying('new-prayer-y') // false → true, returns false
    expect(third).toBe(false)
    expect(getReaction('new-prayer-y')?.isPraying).toBe(true)
  })

  it('preserves isBookmarked when toggling praying', () => {
    // Mock seeds prayer-1 with isBookmarked: true. Toggle praying off.
    togglePraying('prayer-1') // true → false
    const reaction = getReaction('prayer-1')!
    expect(reaction.isPraying).toBe(false)
    expect(reaction.isBookmarked).toBe(true) // preserved from seed
  })
})

describe('toggleBookmark', () => {
  it('flips isBookmarked symmetrically and preserves isPraying', () => {
    // Mock seeds prayer-3 with { isPraying: true, isBookmarked: false }
    toggleBookmark('prayer-3')
    const reaction = getReaction('prayer-3')!
    expect(reaction.isBookmarked).toBe(true)
    expect(reaction.isPraying).toBe(true) // preserved from seed
  })
})

describe('subscribe', () => {
  it('invokes the listener when the cache mutates via togglePraying', () => {
    const listener = vi.fn()
    subscribe(listener)
    togglePraying('prayer-1')
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('returns an unsubscribe function that stops notifications', () => {
    const listener = vi.fn()
    const unsubscribe = subscribe(listener)
    unsubscribe()
    togglePraying('prayer-1')
    expect(listener).not.toHaveBeenCalled()
  })
})

describe('getSnapshot reference stability', () => {
  it('returns the SAME reference across successive calls when nothing changed', () => {
    const first = getSnapshot()
    const second = getSnapshot()
    expect(second).toBe(first) // strict identity — infinite-loop guard for useSyncExternalStore
  })

  it('returns a DIFFERENT reference after a mutation', () => {
    const before = getSnapshot()
    togglePraying('prayer-1')
    const after = getSnapshot()
    expect(after).not.toBe(before)
  })
})

describe('resilience', () => {
  it('falls back to mock seed without throwing when localStorage JSON is corrupt', () => {
    localStorage.setItem(STORAGE_KEY, 'not valid json {')
    _resetForTesting()
    expect(() => getReactions()).not.toThrow()
    expect(getReactions()).toEqual(getMockReactions())
  })

  it('does not crash togglePraying when localStorage.setItem throws (quota exceeded)', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError')
    })
    expect(() => togglePraying('new-prayer-z')).not.toThrow()
    // In-memory cache still updated
    expect(getReaction('new-prayer-z')?.isPraying).toBe(true)
  })

  it('returns undefined for unknown prayer IDs via getReaction', () => {
    expect(getReaction('nonexistent-prayer-id')).toBeUndefined()
  })
})

describe('Spec 3.7 — toggleCandle and shape migration', () => {
  it('toggleCandle flips only isCandle, preserving isPraying and isBookmarked', () => {
    togglePraying('new-prayer-c1')   // isPraying: true
    toggleBookmark('new-prayer-c1')  // isBookmarked: true
    const before = getReaction('new-prayer-c1')!
    expect(before.isPraying).toBe(true)
    expect(before.isBookmarked).toBe(true)
    expect(before.isCandle).toBe(false)

    const wasCandle = toggleCandle('new-prayer-c1')
    expect(wasCandle).toBe(false)
    const after = getReaction('new-prayer-c1')!
    expect(after.isPraying).toBe(true)
    expect(after.isBookmarked).toBe(true)
    expect(after.isCandle).toBe(true)

    // Toggle again — should return previous (true), flip back to false.
    expect(toggleCandle('new-prayer-c1')).toBe(true)
    expect(getReaction('new-prayer-c1')!.isCandle).toBe(false)
  })

  it('togglePraying does not affect isCandle', () => {
    toggleCandle('new-prayer-c2')
    expect(getReaction('new-prayer-c2')!.isCandle).toBe(true)
    togglePraying('new-prayer-c2')
    expect(getReaction('new-prayer-c2')!.isCandle).toBe(true) // still true
  })

  it('toggleBookmark does not affect isCandle', () => {
    toggleCandle('new-prayer-c3')
    expect(getReaction('new-prayer-c3')!.isCandle).toBe(true)
    toggleBookmark('new-prayer-c3')
    expect(getReaction('new-prayer-c3')!.isCandle).toBe(true) // still true
  })

  it('hydrate from old-shape (3-field) localStorage default-fills isCandle to false', () => {
    // Pre-seed localStorage with old-shape data — no isCandle field.
    const oldShape = {
      'prayer-1': { prayerId: 'prayer-1', isPraying: true, isBookmarked: false },
      'prayer-2': { prayerId: 'prayer-2', isPraying: false, isBookmarked: true },
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(oldShape))
    _resetForTesting()

    // First read triggers hydration + migration.
    const snap = getReactions()

    expect(snap['prayer-1']).toEqual({
      prayerId: 'prayer-1',
      isPraying: true,
      isBookmarked: false,
      isCandle: false,
    })
    expect(snap['prayer-2']).toEqual({
      prayerId: 'prayer-2',
      isPraying: false,
      isBookmarked: true,
      isCandle: false,
    })

    // localStorage was rewritten with the new shape — both entries now have isCandle.
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    expect(stored['prayer-1'].isCandle).toBe(false)
    expect(stored['prayer-2'].isCandle).toBe(false)
  })

  it('hydration on already-migrated data does not re-write storage', () => {
    // Pre-seed with new-shape data.
    const newShape = {
      'prayer-1': { prayerId: 'prayer-1', isPraying: true, isBookmarked: false, isCandle: true },
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newShape))
    _resetForTesting()

    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')
    getReactions()
    // The migration branch is the only path that calls writeToStorage from inside readFromStorage.
    // (The mock seed branch also writes, but only when localStorage is empty.)
    expect(setItemSpy).not.toHaveBeenCalled()
  })

  it('mock seed includes isCandle field on every entry', () => {
    // localStorage is empty — seedFromMock runs.
    const snap = getReactions()
    expect(Object.keys(snap).length).toBeGreaterThan(0)
    for (const reaction of Object.values(snap)) {
      expect(typeof reaction.isCandle).toBe('boolean')
    }
  })
})
