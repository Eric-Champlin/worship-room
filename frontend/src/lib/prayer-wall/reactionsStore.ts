import { getMockReactions } from '@/mocks/prayer-wall-mock-data'
import type { PrayerReaction } from '@/types/prayer-wall'
import * as prayerWallApi from '@/services/api/prayer-wall-api'
import type { PostListResult } from '@/services/api/prayer-wall-api'
import { isBackendPrayerWallEnabled } from '@/lib/env'
import { ApiError } from '@/types/auth'
import {
  AnonymousWriteAttemptError,
  mapApiErrorToToast,
  mapHydrationErrorToToast,
} from './apiErrors'

const STORAGE_KEY = 'wr_prayer_reactions'
const AUTH_INVALIDATED_EVENT = 'wr:auth-invalidated'

let cache: Record<string, PrayerReaction> | null = null
let snapshotCache: Record<string, PrayerReaction> | null = null
const listeners = new Set<() => void>()

// --- Spec 3.11 module-scoped state ---------------------------------------
//
// pendingMutations: Set of `${prayerId}:${concern}` keys (concern ∈ 'praying'
//   | 'bookmark' | 'candle'). Per-prayer + per-concern locks for double-tap
//   coalescing in flag-on mode.
// hydrationGeneration: monotonic counter incremented at every init() entry.
//   Each commit/defer call captures the generation it started under and
//   aborts if a newer init() has superseded it. Prevents the concurrent-
//   init race where User-A's promise resolves AFTER User-B's and would
//   otherwise overwrite User-B's data.
const pendingMutations = new Set<string>()
let lastHydratedUserId: string | null = null
let hydrationGeneration = 0
let toastFn: ((msg: string) => void) | null = null
let openAuthModalFn: ((subtitle?: string) => void) | null = null

/**
 * Loosened guard (Spec 3.7): `isCandle` is treated as optional during
 * the shape transition. Missing `isCandle` is default-filled to `false`
 * in `readFromStorage` and written back, completing a one-way migration
 * for users who upgrade with old-shape (3-field) data in localStorage.
 *
 * After the migration runs once, all stored entries are 4-field. Future
 * reads encounter only 4-field data.
 */
function isValidReaction(value: unknown): value is PrayerReaction {
  if (typeof value !== 'object' || value === null) return false
  const r = value as Record<string, unknown>
  return (
    typeof r.prayerId === 'string' &&
    typeof r.isPraying === 'boolean' &&
    typeof r.isBookmarked === 'boolean'
    // NOTE: isCandle deliberately NOT validated here — old-shape data
    // missing isCandle should pass the guard so we can default-fill.
  )
}

function readFromStorage(): Record<string, PrayerReaction> | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return null
    }
    const result: Record<string, PrayerReaction> = {}
    let migrationOccurred = false
    for (const [key, value] of Object.entries(parsed)) {
      if (!isValidReaction(value)) return null
      const v = value as PrayerReaction & { isCandle?: boolean }
      if (typeof v.isCandle !== 'boolean') {
        // Default-fill old-shape data (Spec 3.7 migration).
        result[key] = { ...v, isCandle: false }
        migrationOccurred = true
      } else {
        result[key] = v
      }
    }
    // Persist the migrated shape so future reads short-circuit the migration branch.
    if (migrationOccurred) {
      writeToStorage(result)
    }
    return result
  } catch {
    return null
  }
}

function writeToStorage(data: Record<string, PrayerReaction>): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // Silent failure — localStorage may be unavailable (private browsing, quota exceeded)
  }
}

function seedFromMock(): Record<string, PrayerReaction> {
  const seed = getMockReactions()
  writeToStorage(seed)
  return seed
}

function getCache(): Record<string, PrayerReaction> {
  if (cache === null) {
    const stored = readFromStorage()
    cache = stored !== null ? stored : seedFromMock()
  }
  return cache
}

function invalidateSnapshot(): void {
  snapshotCache = null
}

function notify(): void {
  invalidateSnapshot()
  for (const listener of listeners) {
    listener()
  }
}

// --- Private optimistic-flip helpers (Spec 3.11) -------------------------
//
// applyXFlip helpers handle the in-memory cache mutation + notify() ONLY.
// They deliberately do NOT call writeToStorage — that responsibility moves to
// the public toggle functions, which can choose to persist (flag-off) or not
// (flag-on read-swap, Watch-for #20). Each helper returns the PREVIOUS value
// of the flipped field so callers (and the public functions) can return the
// historic "wasX" value to React consumers.

function applyPrayingFlip(prayerId: string): boolean {
  const current = getCache()[prayerId]
  const wasPraying = current?.isPraying ?? false
  const next: PrayerReaction = {
    prayerId,
    isPraying: !wasPraying,
    isBookmarked: current?.isBookmarked ?? false,
    isCandle: current?.isCandle ?? false,
  }
  cache = { ...getCache(), [prayerId]: next }
  notify()
  return wasPraying
}

function applyBookmarkFlip(prayerId: string): boolean {
  const current = getCache()[prayerId]
  const wasBookmarked = current?.isBookmarked ?? false
  const next: PrayerReaction = {
    prayerId,
    isPraying: current?.isPraying ?? false,
    isBookmarked: !wasBookmarked,
    isCandle: current?.isCandle ?? false,
  }
  cache = { ...getCache(), [prayerId]: next }
  notify()
  return wasBookmarked
}

function applyCandleFlip(prayerId: string): boolean {
  const current = getCache()[prayerId]
  const wasCandle = current?.isCandle ?? false
  const next: PrayerReaction = {
    prayerId,
    isPraying: current?.isPraying ?? false,
    isBookmarked: current?.isBookmarked ?? false,
    isCandle: !wasCandle,
  }
  cache = { ...getCache(), [prayerId]: next }
  notify()
  return wasCandle
}

/**
 * Server-state-disagreement override (D8). Replaces the cached fields for a
 * single prayer with values supplied by the server, regardless of any
 * optimistic prediction. Notifies listeners so the UI re-renders with the
 * corrected state. Used when a backend toggleReaction response disagrees
 * with the local optimistic flip (e.g., another device toggled state while
 * this client's request was in flight).
 */
function forceState(
  prayerId: string,
  partial: Partial<PrayerReaction>,
): void {
  const current = getCache()[prayerId]
  const next: PrayerReaction = {
    prayerId,
    isPraying: partial.isPraying ?? current?.isPraying ?? false,
    isBookmarked: partial.isBookmarked ?? current?.isBookmarked ?? false,
    isCandle: partial.isCandle ?? current?.isCandle ?? false,
  }
  cache = { ...getCache(), [prayerId]: next }
  notify()
}

function handleToggleError(err: unknown): void {
  // AnonymousWriteAttemptError → AuthModal, no toast (Watch-for #9)
  if (err instanceof AnonymousWriteAttemptError) {
    if (openAuthModalFn) openAuthModalFn('Sign in to react to prayers')
    return
  }
  // ApiError → toast (post-rollback ordering per Watch-for #8)
  if (err instanceof ApiError && toastFn) {
    const descriptor = mapApiErrorToToast(err)
    if (descriptor.message.length > 0) {
      toastFn(descriptor.message)
    }
    return
  }
  // Unknown error class — silent (don't crash; let the rollback speak).
}

// --- Hydration (Spec 3.11 Step 3) ----------------------------------------

/**
 * Hydration entry point. Called from usePrayerReactions on auth state change.
 * Merges getMyReactions + listMyBookmarks into a unified
 * `Record<prayerId, PrayerReaction>`, replaces the in-memory cache, and
 * writes the merged result to localStorage on success.
 *
 * - userId === null → clear in-memory cache; do NOT touch localStorage
 *   (offline cache preservation per MPD-3 / Watch-for #3).
 * - userId !== null AND flag off → no-op; legacy localStorage seed behavior
 *   stays intact.
 * - userId !== null AND flag on → fire both API calls in parallel
 *   (Promise.allSettled). Partial failure is tolerated — the surviving
 *   concern populates the cache and a hydration toast fires for the failed
 *   concern.
 *
 * User-switch detection: if a non-null userId differs from `lastHydratedUserId`,
 * the cache is cleared before re-hydration so User A's reactions never leak
 * into User B's session on the same browser.
 *
 * Concurrent-init guard: every entry bumps `hydrationGeneration`. The commit
 * and defer paths capture the generation they started under and abort if a
 * newer init() has superseded them. This prevents User-A's late-resolving
 * promise from overwriting User-B's data when both inits race.
 *
 * Race guard (Watch-for #14): if any mutation is in-flight when both API
 * calls resolve, the cache replacement is deferred until the pending set
 * drains (5-second cap via `deferHydrationCommit`). Stale data for hundreds
 * of ms is preferable to overwriting the user's optimistic flip.
 */
export async function init(userId: string | null): Promise<void> {
  // Flag-off mode is a complete no-op. The legacy mock-seed-from-localStorage
  // behavior in `getCache()` stays intact for both logged-in and logged-out
  // users (small plan-time deviation from Step 3's literal `userId === null →
  // clear cache` rule, which only made sense under the flag-on assumption).
  if (!isBackendPrayerWallEnabled()) {
    return
  }

  // Bump the generation BEFORE any await so concurrent inits each get a
  // distinct identity. Synchronous-only branches below don't need the
  // stale-check (no await means no superseder can land between).
  const generation = ++hydrationGeneration

  // Logout / no-user (flag on)
  if (userId === null) {
    cache = {}
    snapshotCache = null
    lastHydratedUserId = null
    notify()
    // Note: localStorage is NOT cleared — preserve offline cache per MPD-3.
    return
  }

  // User-switch detection — clear cache fully before re-hydrating.
  if (lastHydratedUserId !== null && lastHydratedUserId !== userId) {
    cache = {}
    snapshotCache = null
    notify()
  }

  // Fire both API calls in parallel; allow partial failure.
  const [reactionsResult, bookmarksResult] = await Promise.allSettled([
    prayerWallApi.getMyReactions(),
    prayerWallApi.listMyBookmarks({ page: 1, limit: 100 }),
  ])

  // Stale-init guard: a newer init() has superseded us. Drop our results.
  if (generation !== hydrationGeneration) return

  // Hydration-vs-mutation race guard (Watch-for #14): defer cache replacement
  // if any mutation is in flight. The simpler alternative — overwrite anyway —
  // would clobber an optimistic flip the user just made.
  if (pendingMutations.size > 0) {
    deferHydrationCommit(reactionsResult, bookmarksResult, userId, generation, 0)
    return
  }

  commitHydration(reactionsResult, bookmarksResult, userId, generation)
}

function commitHydration(
  reactionsResult: PromiseSettledResult<Record<string, PrayerReaction>>,
  bookmarksResult: PromiseSettledResult<PostListResult>,
  userId: string,
  generation: number,
): void {
  // Stale-init guard — abort if a newer init() has superseded this one.
  if (generation !== hydrationGeneration) return

  // Build the merged shape. Reactions FIRST (sets isPraying / isCandle /
  // isBookmarked from server), then bookmarks LAST (overrides isBookmarked:
  // true) per Watch-for #12.
  const merged: Record<string, PrayerReaction> = {}

  if (reactionsResult.status === 'fulfilled') {
    Object.assign(merged, reactionsResult.value)
  } else {
    showHydrationToast(reactionsResult.reason, 'reactions')
  }

  if (bookmarksResult.status === 'fulfilled') {
    for (const post of bookmarksResult.value.posts) {
      const existing = merged[post.id]
      merged[post.id] = {
        prayerId: post.id,
        isPraying: existing?.isPraying ?? false,
        isBookmarked: true,
        isCandle: existing?.isCandle ?? false,
      }
    }
  } else {
    showHydrationToast(bookmarksResult.reason, 'bookmarks')
  }

  // Both failed — keep existing cache, don't replace with empty.
  if (
    reactionsResult.status === 'rejected' &&
    bookmarksResult.status === 'rejected'
  ) {
    return
  }

  cache = merged
  snapshotCache = null
  lastHydratedUserId = userId
  writeToStorage(merged)
  notify()
}

function deferHydrationCommit(
  reactions: PromiseSettledResult<Record<string, PrayerReaction>>,
  bookmarks: PromiseSettledResult<PostListResult>,
  userId: string,
  generation: number,
  attempt: number,
): void {
  // Stale-init guard.
  if (generation !== hydrationGeneration) return

  if (attempt > 50) {
    // 50 * 100ms = 5s cap. Surface the timeout to the user so a stuck
    // mutation doesn't silently strand hydration. The synthetic ApiError
    // routes through the existing hydration-toast taxonomy.
    showHydrationToast(
      new ApiError('NETWORK_ERROR', 0, 'hydration deferred past cap', null),
      'both',
    )
    return
  }
  setTimeout(() => {
    if (generation !== hydrationGeneration) return
    if (pendingMutations.size === 0) {
      commitHydration(reactions, bookmarks, userId, generation)
    } else {
      deferHydrationCommit(reactions, bookmarks, userId, generation, attempt + 1)
    }
  }, 100)
}

function showHydrationToast(
  reason: unknown,
  concern: 'reactions' | 'bookmarks' | 'both',
): void {
  if (!toastFn) return
  if (!(reason instanceof ApiError)) return
  const descriptor = mapHydrationErrorToToast(reason, concern)
  if (descriptor.message.length > 0) {
    toastFn(descriptor.message)
  }
}

// --- Module-load: register wr:auth-invalidated listener exactly once -----
//
// When apiFetch (or apiFetchWithMeta) hits a 401, it dispatches this event
// after clearing the stored token. The store responds by clearing its
// in-memory cache so the next render shows empty state instead of the
// previous user's reactions. Watch-for #11: registration must be at module
// load (not inside any function) — multiple subscriptions would cause
// duplicate init(null) calls.
//
// Test-isolation note: this listener has no teardown affordance and persists
// for the lifetime of the module under test. `_resetForTesting()` clears
// store state but does NOT remove this listener. Any test that dispatches
// `wr:auth-invalidated` will fire `init(null)` and clear the cache as a
// side effect. Tests that aren't exercising auth-invalidation should avoid
// dispatching the event.
if (typeof window !== 'undefined') {
  window.addEventListener(AUTH_INVALIDATED_EVENT, () => {
    void init(null)
  })
}

// --- Public API ---

/** Returns the current reactions record. Referentially stable between mutations (required for useSyncExternalStore). */
export function getSnapshot(): Record<string, PrayerReaction> {
  if (snapshotCache === null) {
    snapshotCache = getCache()
  }
  return snapshotCache
}

/** Alias for getSnapshot — kept for API parity with the spec name. */
export function getReactions(): Record<string, PrayerReaction> {
  return getSnapshot()
}

/** Returns the reaction for a single prayer, or undefined if no record exists. */
export function getReaction(prayerId: string): PrayerReaction | undefined {
  return getCache()[prayerId]
}

/**
 * Toggles isPraying for prayerId. Returns the PREVIOUS isPraying value
 * (true = was praying before the toggle).
 *
 * Synchronous-returning by design (Plan-Time Divergence #1) — consumer code
 * relies on the `wasPraying` value to update count math (`prayingCount +
 * (wasPraying ? -1 : 1)`). A `Promise<boolean>` would coerce to truthy and
 * silently break the count. The flag-on backend call is fire-and-forget.
 */
export function togglePraying(prayerId: string): boolean {
  // Flag-off mode: synchronous flip + persist + return previous value.
  if (!isBackendPrayerWallEnabled()) {
    const wasPraying = applyPrayingFlip(prayerId)
    writeToStorage(getCache())
    return wasPraying
  }

  // Flag-on mode: read-swap, NOT dual-write — no localStorage write here
  // (Watch-for #20). Pending-mutation guard fires BEFORE the optimistic
  // flip so a no-op double-tap doesn't notify listeners twice (flip +
  // rollback). Returns the current cached value, which is the optimistic
  // state from the first tap and matches what the consumer would have
  // observed if the second tap had reached the API.
  const key = `${prayerId}:praying`
  if (pendingMutations.has(key)) {
    return getCache()[prayerId]?.isPraying ?? false
  }

  const wasPraying = applyPrayingFlip(prayerId)
  pendingMutations.add(key)

  // Fire-and-forget the API call. Function remains synchronous for
  // consumers per Plan-Time Divergence #1.
  void prayerWallApi
    .toggleReaction(prayerId, 'praying')
    .then((result) => {
      // D8: server-state-disagreement → forceState
      const serverIsPraying = result.state === 'added'
      const cachedIsPraying = getCache()[prayerId]?.isPraying ?? false
      if (serverIsPraying !== cachedIsPraying) {
        forceState(prayerId, { isPraying: serverIsPraying })
      }
    })
    .catch((err) => {
      applyPrayingFlip(prayerId) // rollback the optimistic flip
      handleToggleError(err)
    })
    .finally(() => {
      pendingMutations.delete(key)
    })

  return wasPraying
}

/** Toggles isBookmarked for prayerId. */
export function toggleBookmark(prayerId: string): void {
  if (!isBackendPrayerWallEnabled()) {
    applyBookmarkFlip(prayerId)
    writeToStorage(getCache())
    return
  }

  // Pending-mutation guard fires BEFORE the optimistic flip so a no-op
  // double-tap doesn't notify listeners twice.
  const key = `${prayerId}:bookmark`
  if (pendingMutations.has(key)) {
    return
  }

  const wasBookmarked = applyBookmarkFlip(prayerId)
  pendingMutations.add(key)

  // Route based on cached state BEFORE the optimistic flip. Both endpoints
  // are idempotent (Spec 3.7 D5), so cache-stale-vs-server is forgiving.
  const apiCall = wasBookmarked
    ? prayerWallApi.removeBookmark(prayerId)
    : prayerWallApi.addBookmark(prayerId).then(() => undefined)

  void apiCall
    .then(() => {
      // No state-disagreement check — backend response doesn't expose a
      // current-state field, and idempotency covers cache-stale-vs-server.
    })
    .catch((err) => {
      applyBookmarkFlip(prayerId) // rollback
      handleToggleError(err)
    })
    .finally(() => {
      pendingMutations.delete(key)
    })
}

/** Toggles isCandle for prayerId. Returns the PREVIOUS isCandle value. Spec 3.7. */
export function toggleCandle(prayerId: string): boolean {
  if (!isBackendPrayerWallEnabled()) {
    const wasCandle = applyCandleFlip(prayerId)
    writeToStorage(getCache())
    return wasCandle
  }

  // Pending-mutation guard fires BEFORE the optimistic flip — see
  // togglePraying for the rationale.
  const key = `${prayerId}:candle`
  if (pendingMutations.has(key)) {
    return getCache()[prayerId]?.isCandle ?? false
  }

  const wasCandle = applyCandleFlip(prayerId)
  pendingMutations.add(key)

  void prayerWallApi
    .toggleReaction(prayerId, 'candle')
    .then((result) => {
      const serverIsCandle = result.state === 'added'
      const cachedIsCandle = getCache()[prayerId]?.isCandle ?? false
      if (serverIsCandle !== cachedIsCandle) {
        forceState(prayerId, { isCandle: serverIsCandle })
      }
    })
    .catch((err) => {
      applyCandleFlip(prayerId) // rollback
      handleToggleError(err)
    })
    .finally(() => {
      pendingMutations.delete(key)
    })

  return wasCandle
}

/**
 * Wires DI handlers from React (toast, auth modal) into the non-React store
 * per D5. Called from the `usePrayerReactions` hook on every render so the
 * store always holds the most-recent references. Null handlers result in
 * silent no-ops at every call site.
 */
export function configure(handlers: {
  showToast: (msg: string) => void
  openAuthModal: (subtitle?: string) => void
}): void {
  toastFn = handlers.showToast
  openAuthModalFn = handlers.openAuthModal
}

/** Subscribe to store changes. Returns an unsubscribe function. */
export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Clears in-memory cache and listeners for test isolation. Does NOT touch localStorage. */
export function _resetForTesting(): void {
  cache = null
  snapshotCache = null
  listeners.clear()
  pendingMutations.clear()
  lastHydratedUserId = null
  hydrationGeneration = 0
  toastFn = null
  openAuthModalFn = null
}
