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
  init,
  configure,
  _resetForTesting,
} from '../reactionsStore'
import { ApiError } from '@/types/auth'
import { AnonymousWriteAttemptError } from '../apiErrors'
import * as prayerWallApi from '@/services/api/prayer-wall-api'
import * as env from '@/lib/env'
import type { PrayerRequest } from '@/types/prayer-wall'

/**
 * Build a minimally-typed PrayerRequest for hydration test fixtures. The
 * hydration commit only reads `post.id` (Watch-for #12); other fields are
 * irrelevant. The cast keeps test fixtures terse without sprinkling `as
 * never` escape hatches throughout the file.
 */
function makeMockPost(id: string): PrayerRequest {
  return { id } as unknown as PrayerRequest
}

vi.mock('@/services/api/prayer-wall-api')
vi.mock('@/lib/env', async (importOriginal) => {
  const actual = (await importOriginal()) as typeof env
  return { ...actual, isBackendPrayerWallEnabled: vi.fn(() => false) }
})

const STORAGE_KEY = 'wr_prayer_reactions'

beforeEach(() => {
  localStorage.clear()
  _resetForTesting()
  vi.restoreAllMocks()
  // vi.mock() module mocks aren't reset by restoreAllMocks (which only
  // restores spies). Clear call history explicitly so per-test assertions
  // like toHaveBeenCalledTimes(1) aren't contaminated by prior tests.
  vi.clearAllMocks()
  vi.mocked(env.isBackendPrayerWallEnabled).mockReturnValue(false)
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

  it('hydrate from old-shape (3-field) localStorage default-fills isCandle AND isPraising AND isCelebrating to false', () => {
    // Pre-seed localStorage with old-shape data — none of isCandle, isPraising,
    // or isCelebrating present. Spec 6.6b extended the migration to fill all
    // three missing fields.
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
      isPraising: false,
      isCelebrating: false,
    })
    expect(snap['prayer-2']).toEqual({
      prayerId: 'prayer-2',
      isPraying: false,
      isBookmarked: true,
      isCandle: false,
      isPraising: false,
      isCelebrating: false,
    })

    // localStorage was rewritten with the new shape — every entry has all 6 fields.
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    expect(stored['prayer-1'].isCandle).toBe(false)
    expect(stored['prayer-1'].isPraising).toBe(false)
    expect(stored['prayer-1'].isCelebrating).toBe(false)
    expect(stored['prayer-2'].isCandle).toBe(false)
    expect(stored['prayer-2'].isPraising).toBe(false)
    expect(stored['prayer-2'].isCelebrating).toBe(false)
  })

  it('hydrate from 4-field localStorage (post-Spec-3.7, pre-6.6) default-fills isPraising AND isCelebrating to false', () => {
    // Spec 6.6 — second-wave migration: data that ran the 3.7 migration once
    // has isCandle but not isPraising. Spec 6.6b extended to also fill
    // isCelebrating.
    const fourFieldShape = {
      'prayer-1': { prayerId: 'prayer-1', isPraying: true, isBookmarked: false, isCandle: true },
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fourFieldShape))
    _resetForTesting()

    const snap = getReactions()

    expect(snap['prayer-1']).toEqual({
      prayerId: 'prayer-1',
      isPraying: true,
      isBookmarked: false,
      isCandle: true,
      isPraising: false,
      isCelebrating: false,
    })

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    expect(stored['prayer-1'].isPraising).toBe(false)
    expect(stored['prayer-1'].isCelebrating).toBe(false)
  })

  it('hydrate from 5-field localStorage (post-6.6, pre-6.6b) default-fills isCelebrating to false', () => {
    // Spec 6.6b — third-wave migration: data that ran the 6.6 migration once
    // has isCandle + isPraising but not isCelebrating. Default-fill
    // isCelebrating to false.
    const fiveFieldShape = {
      'prayer-1': {
        prayerId: 'prayer-1',
        isPraying: true,
        isBookmarked: false,
        isCandle: true,
        isPraising: false,
      },
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fiveFieldShape))
    _resetForTesting()

    const snap = getReactions()

    expect(snap['prayer-1']).toEqual({
      prayerId: 'prayer-1',
      isPraying: true,
      isBookmarked: false,
      isCandle: true,
      isPraising: false,
      isCelebrating: false,
    })

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    expect(stored['prayer-1'].isCelebrating).toBe(false)
  })

  it('hydration on already-migrated data does not re-write storage', () => {
    // Pre-seed with new-shape (post-6.6b, 6-field) data.
    const newShape = {
      'prayer-1': {
        prayerId: 'prayer-1',
        isPraying: true,
        isBookmarked: false,
        isCandle: true,
        isPraising: false,
        isCelebrating: false,
      },
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

// --- Spec 3.11: backend integration -------------------------------------

describe('init() — hydration', () => {
  it('flag off: no API calls made; cache stays at localStorage seed', async () => {
    vi.mocked(env.isBackendPrayerWallEnabled).mockReturnValue(false)

    await init('user-1')

    expect(prayerWallApi.getMyReactions).not.toHaveBeenCalled()
    expect(prayerWallApi.listMyBookmarks).not.toHaveBeenCalled()
    // Existing mock seed remains (legacy behavior).
    expect(getReactions()).toEqual(getMockReactions())
  })

  it('flag on, both succeed: cache populated from merged response', async () => {
    vi.mocked(env.isBackendPrayerWallEnabled).mockReturnValue(true)
    vi.mocked(prayerWallApi.getMyReactions).mockResolvedValue({
      'prayer-A': {
        prayerId: 'prayer-A',
        isPraying: true,
        isBookmarked: false,
        isCandle: false,
      },
    })
    vi.mocked(prayerWallApi.listMyBookmarks).mockResolvedValue({
      posts: [
        // Force isBookmarked: true on prayer-B (no reactions hit) and override
        // prayer-A's isBookmarked from false → true.
        makeMockPost('prayer-A'),
        makeMockPost('prayer-B'),
      ],
      pagination: { page: 1, limit: 100, total: 2, hasMore: false },
    })

    await init('user-1')

    expect(getReaction('prayer-A')).toEqual({
      prayerId: 'prayer-A',
      isPraying: true,
      isBookmarked: true,
      isCandle: false,
      isPraising: false,
      isCelebrating: false,
    })
    expect(getReaction('prayer-B')).toEqual({
      prayerId: 'prayer-B',
      isPraying: false,
      isBookmarked: true,
      isCandle: false,
      isPraising: false,
      isCelebrating: false,
    })
  })

  it('flag on, getMyReactions fails 500: bookmarks-only cache; reactions toast fires', async () => {
    vi.mocked(env.isBackendPrayerWallEnabled).mockReturnValue(true)
    vi.mocked(prayerWallApi.getMyReactions).mockRejectedValue(
      new ApiError('SERVER_ERROR', 500, 'oops', null),
    )
    vi.mocked(prayerWallApi.listMyBookmarks).mockResolvedValue({
      posts: [makeMockPost('prayer-B')],
      pagination: { page: 1, limit: 100, total: 1, hasMore: false },
    })
    const showToast = vi.fn()
    configure({ showToast, openAuthModal: vi.fn() })

    await init('user-1')

    expect(getReaction('prayer-B')).toEqual({
      prayerId: 'prayer-B',
      isPraying: false,
      isBookmarked: true,
      isCandle: false,
      isPraising: false,
      isCelebrating: false,
    })
    expect(showToast).toHaveBeenCalledWith(
      expect.stringContaining("couldn't refresh your reactions"),
    )
  })

  it('flag on, listMyBookmarks fails 500: reactions-only cache; bookmarks toast fires', async () => {
    vi.mocked(env.isBackendPrayerWallEnabled).mockReturnValue(true)
    vi.mocked(prayerWallApi.getMyReactions).mockResolvedValue({
      'prayer-A': {
        prayerId: 'prayer-A',
        isPraying: true,
        isBookmarked: false,
        isCandle: false,
      },
    })
    vi.mocked(prayerWallApi.listMyBookmarks).mockRejectedValue(
      new ApiError('SERVER_ERROR', 500, 'oops', null),
    )
    const showToast = vi.fn()
    configure({ showToast, openAuthModal: vi.fn() })

    await init('user-1')

    expect(getReaction('prayer-A')!.isPraying).toBe(true)
    expect(showToast).toHaveBeenCalledWith(
      expect.stringContaining("couldn't refresh your bookmarks"),
    )
  })

  it('flag on, both fail: cache unchanged; hydration toasts fire for both concerns', async () => {
    // Pre-seed with mock data so we can verify cache is not replaced.
    getReactions()
    const before = JSON.stringify(getSnapshot())

    vi.mocked(env.isBackendPrayerWallEnabled).mockReturnValue(true)
    vi.mocked(prayerWallApi.getMyReactions).mockRejectedValue(
      new ApiError('NETWORK_ERROR', 0, 'no network', null),
    )
    vi.mocked(prayerWallApi.listMyBookmarks).mockRejectedValue(
      new ApiError('NETWORK_ERROR', 0, 'no network', null),
    )
    const showToast = vi.fn()
    configure({ showToast, openAuthModal: vi.fn() })

    await init('user-1')

    expect(JSON.stringify(getSnapshot())).toBe(before)
    expect(showToast).toHaveBeenCalledTimes(2)
  })

  it('init(null) when flag is on: cache clears to {}; localStorage NOT cleared', async () => {
    vi.mocked(env.isBackendPrayerWallEnabled).mockReturnValue(true)
    // Pre-seed localStorage with mock data and prime the cache.
    getReactions()
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull()

    await init(null)

    expect(getSnapshot()).toEqual({})
    // localStorage preserved per MPD-3.
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull()
  })

  it('user-switch: hydrating with a different userId clears cache before re-hydrating', async () => {
    vi.mocked(env.isBackendPrayerWallEnabled).mockReturnValue(true)
    vi.mocked(prayerWallApi.getMyReactions).mockResolvedValue({
      'prayer-X': {
        prayerId: 'prayer-X',
        isPraying: true,
        isBookmarked: false,
        isCandle: false,
      },
    })
    vi.mocked(prayerWallApi.listMyBookmarks).mockResolvedValue({
      posts: [],
      pagination: { page: 1, limit: 100, total: 0, hasMore: false },
    })
    const listener = vi.fn()
    subscribe(listener)

    await init('user-A')
    expect(getReaction('prayer-X')!.isPraying).toBe(true)
    const callsAfterFirst = listener.mock.calls.length

    // Mock User B's reactions don't include prayer-X → user-switch should
    // clear cache before merging User B's data.
    vi.mocked(prayerWallApi.getMyReactions).mockResolvedValue({
      'prayer-Y': {
        prayerId: 'prayer-Y',
        isPraying: true,
        isBookmarked: false,
        isCandle: false,
      },
    })

    await init('user-B')

    expect(getReaction('prayer-X')).toBeUndefined()
    expect(getReaction('prayer-Y')!.isPraying).toBe(true)
    // listener fires at least twice for the second init: once for clear,
    // once for hydration commit.
    expect(listener.mock.calls.length).toBeGreaterThanOrEqual(callsAfterFirst + 2)
  })

  it('wr:auth-invalidated event triggers init(null)', async () => {
    vi.mocked(env.isBackendPrayerWallEnabled).mockReturnValue(true)
    vi.mocked(prayerWallApi.getMyReactions).mockResolvedValue({
      'prayer-X': {
        prayerId: 'prayer-X',
        isPraying: true,
        isBookmarked: false,
        isCandle: false,
      },
    })
    vi.mocked(prayerWallApi.listMyBookmarks).mockResolvedValue({
      posts: [],
      pagination: { page: 1, limit: 100, total: 0, hasMore: false },
    })

    await init('user-A')
    expect(getReaction('prayer-X')!.isPraying).toBe(true)

    window.dispatchEvent(new CustomEvent('wr:auth-invalidated'))
    // init(null) is async (returns Promise<void>), but its synchronous body
    // runs immediately. The cache clear is part of the synchronous prefix.
    await Promise.resolve()

    expect(getSnapshot()).toEqual({})
  })

  it('flag on, success: writes merged result to localStorage', async () => {
    vi.mocked(env.isBackendPrayerWallEnabled).mockReturnValue(true)
    vi.mocked(prayerWallApi.getMyReactions).mockResolvedValue({
      'prayer-A': {
        prayerId: 'prayer-A',
        isPraying: true,
        isBookmarked: false,
        isCandle: false,
      },
    })
    vi.mocked(prayerWallApi.listMyBookmarks).mockResolvedValue({
      posts: [],
      pagination: { page: 1, limit: 100, total: 0, hasMore: false },
    })

    await init('user-1')

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    expect(stored['prayer-A']).toBeDefined()
    expect(stored['prayer-A'].isPraying).toBe(true)
  })

  it('empty hydration response: cache becomes {} (no error)', async () => {
    vi.mocked(env.isBackendPrayerWallEnabled).mockReturnValue(true)
    vi.mocked(prayerWallApi.getMyReactions).mockResolvedValue({})
    vi.mocked(prayerWallApi.listMyBookmarks).mockResolvedValue({
      posts: [],
      pagination: { page: 1, limit: 100, total: 0, hasMore: false },
    })

    await init('user-1')

    expect(getSnapshot()).toEqual({})
  })
})

describe('togglePraying — flag on', () => {
  beforeEach(() => {
    vi.mocked(env.isBackendPrayerWallEnabled).mockReturnValue(true)
  })

  it('success: optimistic flip notifies; API confirms; no rollback', async () => {
    // Mock seed for prayer-1 has isPraying: true. Flip to false.
    vi.mocked(prayerWallApi.toggleReaction).mockResolvedValue({
      state: 'removed',
      prayingCount: 0,
      candleCount: 0,
    })

    const wasPraying = togglePraying('prayer-1')
    expect(wasPraying).toBe(true) // synchronous return — still wired
    expect(getReaction('prayer-1')!.isPraying).toBe(false) // optimistic flip

    await vi.waitFor(() => {
      expect(prayerWallApi.toggleReaction).toHaveBeenCalledWith(
        'prayer-1',
        'praying',
      )
    })

    // Server agreed → no forceState fired. Final state matches optimistic.
    expect(getReaction('prayer-1')!.isPraying).toBe(false)
  })

  it('ApiError(500): optimistic flip → rollback → toast (in that order)', async () => {
    const apiError = new ApiError('SERVER_ERROR', 500, 'oops', null)
    vi.mocked(prayerWallApi.toggleReaction).mockRejectedValue(apiError)
    const showToast = vi.fn()
    const openAuthModal = vi.fn()
    configure({ showToast, openAuthModal })

    // Track which intermediate isPraying values listeners see.
    const seen: boolean[] = []
    subscribe(() => {
      seen.push(getReaction('prayer-1')?.isPraying ?? false)
    })

    // Mock seed prayer-1: isPraying: true. Toggle flips to false (optimistic).
    togglePraying('prayer-1')
    expect(getReaction('prayer-1')!.isPraying).toBe(false)

    await vi.waitFor(() => {
      expect(showToast).toHaveBeenCalled()
    })

    // Rollback restored the original true; final state matches.
    expect(getReaction('prayer-1')!.isPraying).toBe(true)
    expect(seen).toEqual([false, true])
    expect(showToast).toHaveBeenCalledWith(
      expect.stringContaining('Something went wrong'),
    )
    expect(openAuthModal).not.toHaveBeenCalled()
  })

  it('AnonymousWriteAttemptError: rollback + openAuthModal (no toast)', async () => {
    vi.mocked(prayerWallApi.toggleReaction).mockRejectedValue(
      new AnonymousWriteAttemptError('toggleReaction'),
    )
    const showToast = vi.fn()
    const openAuthModal = vi.fn()
    configure({ showToast, openAuthModal })

    togglePraying('prayer-1')
    expect(getReaction('prayer-1')!.isPraying).toBe(false) // optimistic

    await vi.waitFor(() => {
      expect(openAuthModal).toHaveBeenCalled()
    })

    expect(getReaction('prayer-1')!.isPraying).toBe(true) // rolled back
    expect(showToast).not.toHaveBeenCalled() // Watch-for #9
  })

  it('double-tap: second tap no-ops while first is pending; first then resolves', async () => {
    let resolveFirst: (value: {
      state: 'added' | 'removed'
      prayingCount: number
      candleCount: number
    }) => void = () => {}
    vi.mocked(prayerWallApi.toggleReaction).mockImplementationOnce(
      () =>
        new Promise((res) => {
          resolveFirst = res
        }),
    )

    // First tap — optimistic flip true → false; pending mutation locks key.
    togglePraying('prayer-1')
    expect(getReaction('prayer-1')!.isPraying).toBe(false)

    // Second tap — should no-op (rollback the optimistic flip back to false,
    // i.e. flip-then-flip = no net change).
    togglePraying('prayer-1')
    expect(getReaction('prayer-1')!.isPraying).toBe(false) // same as first tap

    // Only one API call observed during the pending window.
    expect(prayerWallApi.toggleReaction).toHaveBeenCalledTimes(1)

    // Resolve the first call.
    resolveFirst({ state: 'removed', prayingCount: 0, candleCount: 0 })
    await vi.waitFor(() => {
      expect(getReaction('prayer-1')!.isPraying).toBe(false)
    })
  })

  it('server-state disagreement: forceState corrects the cache; listeners re-render', async () => {
    // Mock seed prayer-1: isPraying: true. User toggles → optimistic
    // predicts false. Server reports state=added (i.e. isPraying still true,
    // disagreement!). forceState should bring cache back to true.
    vi.mocked(prayerWallApi.toggleReaction).mockResolvedValue({
      state: 'added',
      prayingCount: 1,
      candleCount: 0,
    })

    togglePraying('prayer-1')
    expect(getReaction('prayer-1')!.isPraying).toBe(false) // optimistic

    await vi.waitFor(() => {
      expect(getReaction('prayer-1')!.isPraying).toBe(true)
    })
  })
})

describe('toggleBookmark — flag on', () => {
  beforeEach(() => {
    vi.mocked(env.isBackendPrayerWallEnabled).mockReturnValue(true)
  })

  it('was-bookmarked → calls removeBookmark, success', async () => {
    // Mock seed prayer-1 has isBookmarked: true.
    vi.mocked(prayerWallApi.removeBookmark).mockResolvedValue(undefined)

    toggleBookmark('prayer-1')
    expect(getReaction('prayer-1')!.isBookmarked).toBe(false) // optimistic

    await vi.waitFor(() => {
      expect(prayerWallApi.removeBookmark).toHaveBeenCalledWith('prayer-1')
    })
    expect(prayerWallApi.addBookmark).not.toHaveBeenCalled()
  })

  it('was-not-bookmarked → calls addBookmark, success', async () => {
    // Mock seed prayer-3 has isBookmarked: false.
    vi.mocked(prayerWallApi.addBookmark).mockResolvedValue({ created: true })

    toggleBookmark('prayer-3')
    expect(getReaction('prayer-3')!.isBookmarked).toBe(true) // optimistic

    await vi.waitFor(() => {
      expect(prayerWallApi.addBookmark).toHaveBeenCalledWith('prayer-3')
    })
    expect(prayerWallApi.removeBookmark).not.toHaveBeenCalled()
  })
})

describe('cross-mount subscription (Phase 3 Addendum #12)', () => {
  it('two subscribers both receive notify() on toggle (BB-45 anti-pattern guard)', () => {
    const a = vi.fn()
    const b = vi.fn()
    subscribe(a)
    subscribe(b)

    togglePraying('prayer-1')

    expect(a).toHaveBeenCalledTimes(1)
    expect(b).toHaveBeenCalledTimes(1)
  })
})

// --- Spec 3.11 review follow-ups ----------------------------------------
//
// These tests close gaps identified in the post-implementation code review
// (see _plans/forums/2026-04-30-spec-3-11.md § Execution Log post-review notes).

describe('togglePraying — pending-mutation guard ordering', () => {
  beforeEach(() => {
    vi.mocked(env.isBackendPrayerWallEnabled).mockReturnValue(true)
  })

  it('no-op double-tap fires only ONE notify() (no flip-then-rollback thrash)', () => {
    // Pending guard must run BEFORE the optimistic flip so a coalesced
    // double-tap doesn't notify listeners twice (flip + rollback). Locks
    // in Medium #1 from the Spec 3.11 review.
    let resolveFirst: (value: {
      state: 'added' | 'removed'
      prayingCount: number
      candleCount: number
    }) => void = () => {}
    vi.mocked(prayerWallApi.toggleReaction).mockImplementationOnce(
      () =>
        new Promise((res) => {
          resolveFirst = res
        }),
    )

    const listener = vi.fn()
    subscribe(listener)

    // First tap — exactly one notify() from the optimistic flip.
    togglePraying('prayer-1')
    expect(listener).toHaveBeenCalledTimes(1)

    // Second tap during the pending window — must be a complete no-op:
    // no flip, no rollback, no notify.
    togglePraying('prayer-1')
    expect(listener).toHaveBeenCalledTimes(1)

    // API call count is unchanged — only the first tap reached the network.
    expect(prayerWallApi.toggleReaction).toHaveBeenCalledTimes(1)

    // Drain the in-flight promise to keep the test isolated.
    resolveFirst({ state: 'removed', prayingCount: 0, candleCount: 0 })
  })

  it('no-op double-tap returns the current cached state (matches first-tap optimistic value)', () => {
    let resolveFirst: (value: {
      state: 'added' | 'removed'
      prayingCount: number
      candleCount: number
    }) => void = () => {}
    vi.mocked(prayerWallApi.toggleReaction).mockImplementationOnce(
      () =>
        new Promise((res) => {
          resolveFirst = res
        }),
    )

    // Mock seed prayer-1: isPraying=true. First tap flips to false and
    // returns the previous value `true`.
    expect(togglePraying('prayer-1')).toBe(true)

    // Second tap — pending, returns current cached state (false).
    expect(togglePraying('prayer-1')).toBe(false)

    resolveFirst({ state: 'removed', prayingCount: 0, candleCount: 0 })
  })
})

describe('init() — concurrent-init supersession', () => {
  beforeEach(() => {
    vi.mocked(env.isBackendPrayerWallEnabled).mockReturnValue(true)
  })

  it('a newer init() supersedes an older one whose promises resolve later', async () => {
    // Locks in Medium #2 from the Spec 3.11 review. Without the generation
    // counter, User-A's late-resolving promise would overwrite User-B's data.
    let resolveAReactions: (value: Record<string, PrayerReaction>) => void =
      () => {}
    let resolveABookmarks: (value: {
      posts: PrayerRequest[]
      pagination: { page: number; limit: number; total: number; hasMore: boolean }
    }) => void = () => {}

    // First init: deliberately deferred. Reactions/bookmarks both pending.
    vi.mocked(prayerWallApi.getMyReactions).mockImplementationOnce(
      () =>
        new Promise((res) => {
          resolveAReactions = res
        }),
    )
    vi.mocked(prayerWallApi.listMyBookmarks).mockImplementationOnce(
      () =>
        new Promise((res) => {
          resolveABookmarks = res
        }),
    )

    // Second init: resolves immediately with User-B's data.
    vi.mocked(prayerWallApi.getMyReactions).mockImplementationOnce(() =>
      Promise.resolve({
        'prayer-B': {
          prayerId: 'prayer-B',
          isPraying: true,
          isBookmarked: false,
          isCandle: false,
        },
      }),
    )
    vi.mocked(prayerWallApi.listMyBookmarks).mockImplementationOnce(() =>
      Promise.resolve({
        posts: [],
        pagination: { page: 1, limit: 100, total: 0, hasMore: false },
      }),
    )

    // Fire both inits in close succession. init('user-A') awaits its
    // (still pending) API calls; init('user-B') resolves and commits.
    void init('user-A')
    await init('user-B')

    expect(getReaction('prayer-B')!.isPraying).toBe(true)

    // NOW resolve User-A's promises. Without the supersession guard, this
    // would commit User-A's data over User-B's. With the guard, the late
    // commit is dropped.
    resolveAReactions({
      'prayer-A': {
        prayerId: 'prayer-A',
        isPraying: true,
        isBookmarked: false,
        isCandle: false,
      },
    })
    resolveABookmarks({
      posts: [],
      pagination: { page: 1, limit: 100, total: 0, hasMore: false },
    })
    // Drain microtasks so the late-commit attempt runs.
    await Promise.resolve()
    await Promise.resolve()

    // User-A's data must NOT be in the cache.
    expect(getReaction('prayer-A')).toBeUndefined()
    // User-B's data is still intact.
    expect(getReaction('prayer-B')!.isPraying).toBe(true)
  })
})

describe('init() — hydration-vs-mutation race (deferHydrationCommit)', () => {
  beforeEach(() => {
    vi.mocked(env.isBackendPrayerWallEnabled).mockReturnValue(true)
  })

  it('mutation pending when hydration resolves: commit is deferred until the mutation settles', async () => {
    // Locks in Watch-for #14 / spec D14 / Major #1 from the review.
    // Without the defer, User clicks Pray → optimistic flip → hydration
    // (which arrived first from the network) overwrites the optimistic flip.
    let resolveToggle: (value: {
      state: 'added' | 'removed'
      prayingCount: number
      candleCount: number
    }) => void = () => {}
    vi.mocked(prayerWallApi.toggleReaction).mockImplementationOnce(
      () =>
        new Promise((res) => {
          resolveToggle = res
        }),
    )
    vi.mocked(prayerWallApi.getMyReactions).mockResolvedValue({
      'prayer-X': {
        prayerId: 'prayer-X',
        isPraying: true,
        isBookmarked: false,
        isCandle: false,
      },
    })
    vi.mocked(prayerWallApi.listMyBookmarks).mockResolvedValue({
      posts: [],
      pagination: { page: 1, limit: 100, total: 0, hasMore: false },
    })

    // Start a mutation — pendingMutations.add('prayer-1:praying'). Synchronous.
    togglePraying('prayer-1')

    // Fire init while the mutation is pending. allSettled resolves both API
    // calls, but commit is deferred because pendingMutations.size > 0.
    await init('user-A')

    // prayer-X is NOT yet in the cache — hydration was deferred.
    expect(getReaction('prayer-X')).toBeUndefined()

    // Resolve the mutation. pendingMutations drains. Within ~100ms the
    // deferred commit fires.
    resolveToggle({ state: 'removed', prayingCount: 0, candleCount: 0 })

    await vi.waitFor(
      () => {
        expect(getReaction('prayer-X')).toBeDefined()
      },
      { timeout: 1000, interval: 25 },
    )

    expect(getReaction('prayer-X')!.isPraying).toBe(true)
  })

  it('deferral cap (>50 attempts ≈ 5s) surfaces a hydration toast instead of silently dropping', async () => {
    // Locks in Medium #3 from the review. Without the cap-toast, a never-
    // settling mutation strands hydration with no user feedback.
    vi.useFakeTimers()
    try {
      vi.mocked(prayerWallApi.toggleReaction).mockImplementationOnce(
        () => new Promise(() => {}), // never resolves
      )
      vi.mocked(prayerWallApi.getMyReactions).mockResolvedValue({})
      vi.mocked(prayerWallApi.listMyBookmarks).mockResolvedValue({
        posts: [],
        pagination: { page: 1, limit: 100, total: 0, hasMore: false },
      })
      const showToast = vi.fn()
      configure({ showToast, openAuthModal: vi.fn() })

      // Pin the mutation that will never resolve.
      togglePraying('prayer-stuck')

      // Drive init() to completion under fake timers. The synchronous body
      // up to `await Promise.allSettled` runs immediately; the await resumes
      // after we flush microtasks via vi.advanceTimersByTimeAsync(0).
      const initPromise = init('user-A')
      await vi.advanceTimersByTimeAsync(0)
      await initPromise

      // Advance past the 5-second cap (51 * 100ms = 5.1s).
      await vi.advanceTimersByTimeAsync(5_100)

      expect(showToast).toHaveBeenCalledWith(
        expect.stringContaining("couldn't refresh"),
      )
    } finally {
      vi.useRealTimers()
    }
  })
})
