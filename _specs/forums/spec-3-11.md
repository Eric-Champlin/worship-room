# Forums Wave: Spec 3.11 — Reactive Store Backend Adapter

**Master Plan Reference:** `_forums_master_plan/round3-master-plan.md` → Spec 3.11 (lines 4022–4046)
**ID:** `round3-phase03-spec11-reactions-backend-adapter`
**Branch:** `forums-wave-continued` (per user's branch-discipline override — no new branch created; user manages all git operations manually)
**Date:** 2026-04-30

---

## Affected Frontend Routes

The `usePrayerReactions` hook is consumed across the Prayer Wall surface. Although no consumer files are modified (hook return shape unchanged per MPD-2), the runtime behavior on these routes changes when `VITE_USE_BACKEND_PRAYER_WALL=true`:

- `/prayer-wall`
- `/prayer-wall/:id`
- `/prayer-wall/dashboard`
- `/prayer-wall/user/:id`
- `/my-prayers`

---

## Branch discipline (CRITICAL — applies to this and ALL future specs)

CC MUST stay on the branch the user is currently on. Specifically:

- Do NOT call `git checkout -b <new-branch>`
- Do NOT call `git branch <new-branch>`
- Do NOT call `git switch -c <new-branch>`
- Do NOT call any git operation that creates, switches, or deletes branches
- Do NOT call `git commit`, `git push`, `git stash`, or `git reset`

The user manages all git operations manually. CC's only job is to write
files; the user reviews and commits. If CC notices it has somehow ended
up on a different branch than expected, STOP and ask the user before
any further action. This rule overrides any default skill behavior that
might want to auto-create a feature branch named after the spec.

## Tier

**xHigh.** Master plan body says L/Medium. Spec 3.11 is the consumer-side counterpart to Spec 3.10 (which shipped at MAX). The novel surface here is the optimistic-update rollback semantics and the localStorage-as-cache-not-source-of-truth model — but the patterns are well-trodden once you accept the read-swap model 3.10 established. The brief carries the structured reasoning explicitly. xHigh + comprehensive brief outperforms MAX + thin brief for this kind of pattern-application spec.

**Note:** the original 3.10 brief was correctly MAX (cross-author leakage in the mapper, anonymous-write privilege escalation, crisis classifier supersession). 3.11 inherits all those mitigations from 3.10 — the mapper is shipped, the AnonymousWriteAttemptError is shipped, the crisis filter is server-side. This spec's risk profile is "did we wire the consumer correctly without breaking the existing UX" which is xHigh territory.

## Master Plan Divergence

Three deliberate divergences from the master plan body's text (lines 4023-4046 of `_forums_master_plan/round3-master-plan.md`):

**MPD-1: Three writable concerns, not one.** Master plan body talks about "the `usePrayerReactions` reactive store" as if it's a single store with one set of toggles. Recon: the store at `frontend/src/lib/prayer-wall/reactionsStore.ts` exposes THREE separate writable concerns: `togglePraying` (reactions endpoint), `toggleBookmark` (bookmarks endpoint — DIFFERENT backend route), and `toggleCandle` (reactions endpoint with `reactionType=candle`). The hydration `init(userId)` must merge two API calls (`getMyReactions` + `listMyBookmarks`) into the single `Record<prayerId, PrayerReaction>` shape. Document this explicitly so the planner doesn't assume a single endpoint covers everything.

**MPD-2: Hook return shape genuinely unchanged — but only for synchronous toggles.** The master plan body says "Hook return shape unchanged." Recon: today's `togglePraying(prayerId): boolean` and `toggleCandle(prayerId): boolean` return the PREVIOUS value synchronously. With backend writes, the toggle is optimistic-then-confirmed-or-rolled-back. The synchronous return value (the previous state) is still meaningful and accurate at call time — but consumers that want to know "did the backend confirm" need a different signal. This brief preserves the synchronous return AND adds an optional async side-channel via subscription updates (the rollback fires `notify()` again, so subscribed components re-render with rolled-back state). See D4.

**MPD-3: Offline fallback is read-only.** Master plan body says "Offline (network error) falls back to localStorage cache." Recon and Spec 3.10 D7 establish that read-swap mode does NOT dual-write to localStorage during normal operation (offline writes are Spec 16.2's territory). Resolution: when flag is ON and the network is down:

- READS fall back to whatever localStorage last cached from a successful hydration (or empty if never hydrated)
- WRITES fail with a toast; no localStorage write happens
- When network returns, next hydration overwrites the localStorage cache

This is the "in-memory query cache only, no IndexedDB persistence" rule from 3.10's D7 re-applied at the store layer.

## Recon Ground Truth (2026-04-30)

All facts verified on the active machine (`/Users/eric.champlin/worship-room/`):

**R1 — `reactionsStore.ts` is a Pattern A subscription store** at `frontend/src/lib/prayer-wall/reactionsStore.ts`. Public surface:

- `getSnapshot(): Record<string, PrayerReaction>` — referentially stable
- `getReactions()` — alias for getSnapshot
- `getReaction(prayerId): PrayerReaction | undefined`
- `togglePraying(prayerId): boolean` — returns previous isPraying value
- `toggleBookmark(prayerId): void`
- `toggleCandle(prayerId): boolean` — returns previous isCandle value
- `subscribe(listener): () => void` — useSyncExternalStore-compatible
- `_resetForTesting(): void`

The store reads from `localStorage[wr_prayer_reactions]` on first access; if missing, seeds from `getMockReactions()`. Writes update both the in-memory cache and localStorage synchronously.

**R2 — Phase 3 Addendum #10 — `wr_prayer_reactions` shape is canonical.** `Record<string, { prayerId, isPraying, isBookmarked, isCandle }>` with all four fields present after the Spec 3.7 migration. The store's `isValidReaction` guard auto-fills missing `isCandle` to false. **This shape MUST be preserved** through the backend-adapter changes — Spec 3.7's call sites depend on it.

**R3 — `usePrayerReactions` hook** is dead simple at `frontend/src/hooks/usePrayerReactions.ts`. Three lines of meaningful code: `useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)` then return `{ reactions, togglePraying, toggleBookmark, toggleCandle }`. The hook does NOT need changes for Spec 3.11 — all logic stays in the store module. Confirms master plan body's claim "likely no change — store does the work."

**R4 — `prayer-wall-api.ts` is shipped (Spec 3.10)** at `frontend/src/services/api/prayer-wall-api.ts`. Spec 3.11 consumes these functions from the store module:

- `getMyReactions(): Promise<Record<string, ReactionEntry>>` — returns `{ isPraying, isCandle }` keyed by postId
- `listMyBookmarks({page, limit}): Promise<PostListResult>` — returns paginated bookmarked posts
- `toggleReaction(postId, 'praying' | 'candle'): Promise<{state, prayingCount, candleCount}>`
- `removeReaction(postId, 'praying' | 'candle'): Promise<void>` — explicit removal (alternative to toggle)
- `addBookmark(postId): Promise<{created: boolean}>`
- `removeBookmark(postId): Promise<void>`

**R5 — `getMyReactions` returns `{ isPraying, isCandle }` per-postId, NOT bookmarks.** Bookmarks come from `listMyBookmarks` which returns `PostListResult` (paginated). Hydration must merge the two responses into the unified `PrayerReaction` shape: for each postId in either response, build `{ prayerId: postId, isPraying, isBookmarked, isCandle }`.

**R6 — `isBackendPrayerWallEnabled()` is shipped** at `frontend/src/lib/env.ts`. Strict equality to `'true'`, fail-closed default. Comment explicitly says "Used by: Spec 3.11 (consumer hooks)." Spec 3.11 reads this flag inside the store module to branch between localStorage-source-of-truth and backend-source-of-truth modes.

**R7 — `AnonymousWriteAttemptError` is shipped (Spec 3.10)** at `frontend/src/lib/prayer-wall/apiErrors.ts`. Thrown by api functions BEFORE network call when no JWT. Spec 3.11 catches this in the toggle paths and reverts the optimistic update + opens AuthModal.

**R8 — `mapApiErrorToToast` taxonomy is shipped (Spec 3.10)** at `frontend/src/lib/prayer-wall/apiErrors.ts`. Maps `ApiError` → toast copy following the anti-pressure-rule conventions. Spec 3.11 calls this on rollback to render a friendly toast.

**R9 — `useToast` and `useAuthModal` are the shipped notification surfaces.** The store module is NOT React; it can't call hooks. The store needs to either:

- (a) Receive callbacks from the hook on mount: `usePrayerReactions` hook calls a setup function passing `showToast` and `openAuthModal` references
- (b) Use a global event bus: store dispatches custom events; an app-level listener (in `App.tsx` or a provider) handles them

Recommend (a) for simplicity — see D5.

**R10 — `useAuth` provides `isAuthenticated` and `user.id`** at `frontend/src/hooks/useAuth.ts`. The hook is the source-of-truth for "who is the current user." Hydration triggers on userId change (login/logout/user switch).

**R11 — Pattern A subscription is fragile to module reset between tests.** Recon shows `_resetForTesting()` clears in-memory cache + listeners but NOT the global module state itself. Tests that mount/unmount the hook across vitest test cases need to call `_resetForTesting()` in `afterEach`. Existing test file `frontend/src/lib/prayer-wall/__tests__/reactionsStore.test.ts` already does this — Spec 3.11 tests follow the same convention.

**R12 — The "BB-45 cross-mount subscription test" referenced in master plan AC.** Recon: no test file currently has a "BB-45" or "cross-mount" label. The reference is to BB-45 (Verse Memorization Deck), the Phase 0.5 spec that established Pattern A subscriptions. The test the AC refers to is a regression-style test verifying that subscribing to the store from two separate components both receive notifications when the store updates. This is implicitly tested today via the existing reactionsStore.test.ts subscription tests; Spec 3.11 explicitly adds a named "cross-mount subscription" test to lock in the Pattern A invariant per Phase 3 Addendum #12.

**R13 — `wr:auth-invalidated` event is dispatched by `apiFetch` on 401.** AuthContext listens; on receipt it clears auth state. Spec 3.11's hydration-on-login should also listen so it can clear the in-memory backend cache when auth dies (otherwise stale data persists for the next user who logs in on the same browser session).

**R14 — Multiple consumer files** consume `usePrayerReactions`. Recon to enumerate at plan time, but at minimum: `pages/PrayerWall.tsx`, `pages/PrayerDetail.tsx`, `components/prayer-wall/InteractionBar.tsx`, possibly others. **None of these consumers need changes** — the hook return shape is preserved per MPD-2.

**R15 — Pre-existing seed data in localStorage.** Users who used the app pre-Spec-3.11 have `wr_prayer_reactions` populated from `getMockReactions()` (the mock-data seed). When the flag flips on for the first time, hydration overwrites this with backend data. The seed is dropped silently — that's correct for production (mock data was always dev-only), but document the behavior so the cutover spec (3.12) doesn't surprise testers.

## Phase 3 Execution Reality Addendum gates — applicability

| #   | Convention                                       | Applies to 3.11?                                                                                                                                                                                                                          |
| --- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | EditWindowExpired returns 409                    | N/A — frontend spec, no edit-window flow in this scope                                                                                                                                                                                    |
| 2   | L1-cache trap                                    | N/A — frontend                                                                                                                                                                                                                            |
| 3   | `@Modifying` flags                               | N/A — frontend                                                                                                                                                                                                                            |
| 4   | SecurityConfig method-specific rule ordering     | N/A — no backend changes                                                                                                                                                                                                                  |
| 5   | Caffeine-bounded bucket pattern                  | N/A — frontend                                                                                                                                                                                                                            |
| 6   | Domain-scoped `@RestControllerAdvice`            | N/A — frontend                                                                                                                                                                                                                            |
| 7   | `CrisisAlertService` unified entry               | **APPLIES INDIRECTLY** — confirm the bookmark / reaction APIs DO NOT echo crisis flags through the response. Both backend endpoints return safe shapes (verified during Spec 3.10 brief authoring). No new work for 3.11                  |
| 8   | Schema realities — do NOT recreate               | N/A — no DB                                                                                                                                                                                                                               |
| 9   | INTERCESSION ActivityType                        | N/A                                                                                                                                                                                                                                       |
| 10  | `wr_prayer_reactions` shape                      | **APPLIES — CRITICAL** — `Record<string, { prayerId, isPraying, isBookmarked, isCandle }>` MUST be preserved. Hydration mapper outputs exactly this shape. Per R2                                                                          |
| 11  | Liquibase filename convention                    | N/A                                                                                                                                                                                                                                       |
| 12  | BB-45 cross-mount subscription test              | **APPLIES** — explicit named test added per R12                                                                                                                                                                                            |

## Decisions and divergences (12 items)

**D1 — Single-flag branch at the store-write boundary, not an adapter pattern.**

The cleanest implementation is to extend each existing toggle function with a flag check:

```typescript
export async function togglePraying(prayerId: string): Promise<boolean> {
  const wasPraying = optimisticTogglePraying(prayerId)  // existing sync logic

  if (!isBackendPrayerWallEnabled()) {
    return wasPraying  // localStorage-only mode — done
  }

  // Backend mode: call API; rollback on error
  try {
    const result = await prayerWallApi.toggleReaction(prayerId, 'praying')
    // Confirm: if server says state differs from our optimistic update, sync
    if ((result.state === 'added') !== !wasPraying) {
      // Rare race; trust server
      forceState(prayerId, { isPraying: result.state === 'added' })
    }
    return wasPraying
  } catch (err) {
    rollbackPraying(prayerId, wasPraying)
    handleToggleError(err)
    return wasPraying
  }
}
```

NOTE: this changes the function from synchronous to async. **Master plan body says "Hook return shape unchanged."** This is the divergence — async return type IS a shape change for callers awaiting the result. See D4 for the resolution.

**Alternative considered (rejected):** swap the store implementation entirely behind an interface. Forces all consumers to use `await togglePraying(...)` even in flag-off mode. Higher refactor cost, no upside.

**D2 — Hydration on auth state change.**

Add `init(userId: UUID | null)` to the store module. When called:

- If `userId === null` (logout): clear in-memory cache, reset to empty `{}`, do NOT touch localStorage (offline cache preservation per MPD-3)
- If `userId !== null` AND flag on: fire `prayerWallApi.getMyReactions()` and `prayerWallApi.listMyBookmarks({page: 1, limit: 100})` in parallel, merge responses into `Record<prayerId, PrayerReaction>`, replace cache, write to localStorage
- If `userId !== null` AND flag off: no-op (existing localStorage behavior)

The `usePrayerReactions` hook calls `init(user?.id ?? null)` inside a `useEffect` that depends on `user?.id`. This produces hydration on login, clear on logout, re-hydration on user switch.

**Listen for `wr:auth-invalidated`** at the app root (in `App.tsx` or in `usePrayerReactions` itself) and call `init(null)` so backend-cache state doesn't survive a stale-token logout (per R13).

**D3 — Bookmark hydration uses pagination but only first page.**

`listMyBookmarks({page: 1, limit: 100})` returns at most 100 bookmarked posts. If a user has more than 100 bookmarks, the rest are not hydrated into the reactive store. Two options:

- **Option A (recommended):** First page only. The reactive store is for "is this prayer bookmarked, instantly?" — used in the InteractionBar to render the bookmark icon state. A user with >100 bookmarks browsing the feed will see un-toggled bookmark icons on their 101st-bookmarked post; clicking re-bookmark returns 200 (idempotent — Spec 3.7 D5) so no harm done. Optimistic update toggles back to bookmarked locally. Net UX: cosmetic glitch on >100-bookmark accounts which are vanishingly rare for this app's audience.

- **Option B:** Loop pagination until exhausted. Adds 1-N extra API calls at hydration time. For a user with 500 bookmarks that's 5 extra round trips before the dashboard renders — worse perceived performance. Don't optimize for the rare case.

Going with Option A. Document the trade-off in code comments. Followup file gets a note: "If users with >100 bookmarks become common, switch to Option B or build a prefix-fetch loop."

**D4 — Synchronous return value preserved; async confirmation via subscription.**

The toggle function signatures change from `(prayerId: string): boolean` to `(prayerId: string): Promise<boolean>` in flag-on mode. **This is a real breaking change** for consumers that destructure the return value directly. Recon: existing consumers either ignore the return value or use it for very specific control flow.

Two-step resolution:

1. **Preserve the synchronous-return CONTRACT for consumers that don't await.** The Promise resolves with the same value the synchronous version would have returned (the previous state). Consumers that don't `await` get a Promise object instead of a boolean — but they were never reading the return value anyway.

2. **Subscription model handles the rollback case.** If a toggle is rolled back (backend rejected), the store re-runs `notify()`, listeners fire, `useSyncExternalStore` re-renders the component with the rolled-back state. The user sees the icon flip back briefly (~80ms for BCrypt+network round trip).

**Recon at plan time** (Lens 7): grep all consumers of `togglePraying`, `toggleBookmark`, `toggleCandle` to confirm none use the synchronous return value in a way that breaks under async. If any do, fix the consumer in this spec.

**D5 — Toast and AuthModal access via dependency injection on first hook mount.**

The store module is non-React; it can't call `useToast` or `useAuthModal`. Solution:

```typescript
// In reactionsStore.ts:
let toastFn: ((msg: string) => void) | null = null
let openAuthModalFn: (() => void) | null = null

export function configure(handlers: {
  showToast: (msg: string) => void
  openAuthModal: () => void
}): void {
  toastFn = handlers.showToast
  openAuthModalFn = handlers.openAuthModal
}

// In usePrayerReactions hook, on first mount:
const { showToast } = useToast()
const { openAuthModal } = useAuthModal()
useEffect(() => {
  configure({ showToast, openAuthModal })
}, [showToast, openAuthModal])
```

The store calls `toastFn?.(msg)` and `openAuthModalFn?.()` from its error handlers. If the hook hasn't mounted yet (rare — should only happen on initial app boot before any prayer wall component renders), the calls no-op. Document this as expected behavior.

**D6 — Optimistic update applies IMMEDIATELY, before the API call.**

The user taps Pray; the icon flips in the same frame. This is the whole point of optimistic updates — perceived sub-100ms feedback even when the backend is 300ms away. The flow:

1. User clicks Pray
2. Optimistic update: cache changes, notify(), useSyncExternalStore re-renders
3. API call fires
4. On success: confirm (rare server-state-disagrees case → sync to server state)
5. On failure: rollback, notify() again, useSyncExternalStore re-renders to old state, toast fires

The brief intentionally does NOT add a "pending" visual state during the in-flight period — the optimistic flip IS the feedback. A pending spinner would defeat the purpose. If the network is slow enough that rollback is jarring, that's a network problem, not a UX problem.

**D7 — Pending-mutation guard prevents double-tap races.**

A `Set<string>` keyed by `${prayerId}:${concern}` (e.g., `'abc-123:praying'`) tracks in-flight mutations. While a mutation is pending for that (prayerId, concern), additional toggles are no-ops. Released on settle (success or error).

This prevents:

- Double-tap creating two concurrent toggle requests with conflicting expected states
- A rollback from the first request fighting an optimistic update from the second

Pseudocode:

```typescript
const pendingMutations = new Set<string>()

async function togglePraying(prayerId: string): Promise<boolean> {
  const key = `${prayerId}:praying`
  if (pendingMutations.has(key)) return getReaction(prayerId)?.isPraying ?? false
  pendingMutations.add(key)
  try {
    // ... optimistic + api call + rollback ...
  } finally {
    pendingMutations.delete(key)
  }
}
```

**D8 — `forceState` helper for server-disagreement case.**

When the server's `state` field disagrees with our optimistic prediction (e.g., server says `state: 'removed'` but we predicted `'added'` because of a race with another device), trust the server. Add a `forceState(prayerId, partial: Partial<PrayerReaction>)` that bypasses optimistic logic and writes the server-confirmed state. Distinct from `toggleX` which inverts the current cached state.

This case is rare in practice (requires a race with the same user on a different device) but the brief documents the resolution so the planner doesn't invent ad-hoc logic.

**D9 — Toggle bookmark uses POST always; idempotency via Spec 3.7 D5.**

Today's `toggleBookmark` looks at the cached `isBookmarked` and inverts. With backend, a naive translation would be:

- If cached `isBookmarked` is true: call `removeBookmark(prayerId)`
- If cached `isBookmarked` is false: call `addBookmark(prayerId)`

This works EXCEPT during the cache-stale-vs-server window. Spec 3.7 D5 made `addBookmark` idempotent: returns 201 on first add, 200 on duplicate. **Resolution:** trust the cached state for the routing decision (add vs remove). On 200 vs 201 distinction, treat both as success. On 404 (post deleted), rollback + toast "This post is no longer available."

Same logic for `removeBookmark`: 204 always, idempotent (no-op if not bookmarked). No special handling needed.

**D10 — `toggleCandle` mirrors `togglePraying`.**

Same reactionType polymorphism as Spec 3.10 D4: `prayerWallApi.toggleReaction(postId, 'candle')`. Same optimistic + rollback + pending-mutation guard. Same `forceState` for server disagreement.

**D11 — Hydration error handling.**

When `init(userId)` fires both API calls and one or both fail:

- Network error (NETWORK_ERROR): keep existing cache (which may be empty or the last hydration's contents). Toast: "We couldn't refresh your reactions. Try again later." Sentence case + period, no urgency.
- 401: `apiFetch` already dispatched `wr:auth-invalidated`; AuthContext clears auth state; that triggers `init(null)`. No toast — user sees AuthModal next mutation attempt.
- 5xx: same as NETWORK_ERROR. Keep cache. Toast.
- Partial failure (reactions OK, bookmarks fail OR vice versa): merge what we got. Hydrate the successful concern; leave the failing concern's data unchanged. Toast for the failed concern.

Hydration is best-effort. Don't block the app on it.

**D12 — Test count target ~22 tests.**

Master plan AC says ≥12. Brief argues 22 for thorough coverage of the 5 toggle paths × {success, rollback, pending-guard, network-error, anonymous}.

## Watch-fors (20 items)

1. **`isBackendPrayerWallEnabled()` is checked at every toggle entry point and at hydration time.** Don't cache the flag value at module load — the flag could flip between renders if env hot-reloads (rare in prod, common in dev). Always read fresh.

2. **`wr_prayer_reactions` shape preservation (Phase 3 Addendum #10).** Hydration merger MUST output exactly `Record<string, { prayerId, isPraying, isBookmarked, isCandle }>`. Type-check via TypeScript. Existing test fixtures already validate this shape.

3. **`init(null)` doesn't clear localStorage.** Logout shouldn't wipe the offline cache (per MPD-3). The user might log back in later from offline; the previous session's hydrated cache is the best fallback.

4. **`init(userId)` with a different userId than current cache origin.** User A logs out, User B logs in on same browser. Cache from User A is in memory and localStorage. `init(userIdB)` MUST clear and re-hydrate, NOT merge. The store doesn't track "which user's data is this?" today — the userId is implicit in the JWT. Track the last-hydrated userId in a module-scoped variable; if `init(userId)` is called with a different userId, clear cache fully before re-hydrating.

5. **localStorage write happens AFTER successful hydration only.** During an in-flight hydration, do NOT incrementally write to localStorage. Reason: a partial hydration that fails halfway would leave localStorage in an inconsistent state.

6. **Pending-mutation guard releases on settle.** The `finally` block MUST always remove the key. A bug here makes the toggle silently no-op forever after the first error.

7. **`forceState` triggers `notify()`.** Listeners must re-render when the server overrides our optimistic prediction. Easy miss.

8. **Toast firing happens AFTER rollback notify(), not before.** Order matters for the user's perception: see icon flip back, then see toast explain why. Reverse order looks like the toast is unrelated.

9. **AnonymousWriteAttemptError handling.** Catch this specific error type BEFORE generic ApiError handling. Open AuthModal. Do NOT toast (the AuthModal IS the user-facing surface).

10. **`apiFetch`'s `wr:auth-invalidated` event handling.** The store should listen for this event and call `init(null)`. Without this, a stale-token 401 mid-toggle would leave the store with logged-out auth state but populated cache.

11. **Subscribe-once for `wr:auth-invalidated`.** The store module should add the event listener exactly once (at module load). Multiple subscriptions cause duplicate `init(null)` calls.

12. **Hydration merge order: bookmarks LAST.** If both API calls succeed, merge reactions first (sets isPraying/isCandle, leaves isBookmarked false), THEN merge bookmarks (sets isBookmarked true for the bookmarked posts). This is the order that produces correct shape regardless of partial failure.

13. **Empty hydration response handling.** A user with zero reactions and zero bookmarks gets `getMyReactions() → {}` and `listMyBookmarks() → {posts: [], pagination: ...}`. This MUST NOT throw or be mistaken for an error. Empty result is a valid state.

14. **Cache race vs. hydration.** User clicks Pray during in-flight hydration. The optimistic update runs against whatever cache state exists when the click happens; the hydration completes and may overwrite the optimistic state. Resolution: if a mutation is pending when hydration completes, merge the pending-mutation's optimistic state on top of the hydrated state. This is fiddly — recon at plan time and write a specific test.

    Simpler alternative: BLOCK hydration writes if any mutation is pending. The hydration result waits in a holding variable; once mutations settle, hydration is applied. Slightly stale data for a few hundred ms is better than overwriting a user's just-clicked Pray.

15. **`useEffect` cleanup on unmount.** The hook's `useEffect` for hydration should NOT call `init(null)` on cleanup — only on auth-invalidate or actual logout. Otherwise, navigating between Prayer Wall pages (which mounts/unmounts the hook) would clear the cache repeatedly.

16. **`toggleBookmark` API decision: cached state determines route.** Using the cached `isBookmarked` to decide `addBookmark` vs `removeBookmark`. If cache is stale (server says different), the idempotent semantics handle it: both POST and DELETE are idempotent. Worst case: the user toggles bookmark once and the icon doesn't change because the cache was already correct. They re-toggle and it works. Cosmetic, not data-corrupting.

17. **No silent failures.** Every error path either rolls back AND toasts, or opens AuthModal. There is NO "fail silently and hope the user doesn't notice." Each branch is explicit.

18. **`_resetForTesting` clears the new state too.** The new module-scoped variables (`pendingMutations`, `lastHydratedUserId`, `toastFn`, `openAuthModalFn`) all need to be reset. Update `_resetForTesting` accordingly.

19. **localStorage read on flag-flip from off to on.** If a user has stale `wr_prayer_reactions` data from a pre-Spec-3.11 session, and the flag flips on, the in-memory cache will be seeded from that stale localStorage data on first access (before hydration completes). This is acceptable — the stale data is overwritten as soon as `init(userId)` finishes. Document the brief flash of stale state in code comments.

20. **The "Read swap, not dual-write" rule is enforced everywhere.** In flag-on mode, NEVER call localStorage write paths during a toggle. localStorage is only updated on hydration success. This differs from Phase 2/2.5's dual-write where every mutation writes both places. Reviewer should grep for any `writeToStorage` calls inside toggle functions when flag is on — they shouldn't exist.

## Test specifications (target ~22 tests, master plan AC says ≥12)

**`reactionsStore.test.ts` extensions (existing file) — backend integration tests (~16):**

Hydration:

- `init(userId)` with flag off: no API call, cache stays at localStorage seed
- `init(userId)` with flag on, success: cache populated from merged getMyReactions + listMyBookmarks
- `init(userId)` with flag on, getMyReactions fails 500: bookmarks-only cache populated, toast fires
- `init(userId)` with flag on, listMyBookmarks fails 500: reactions-only cache populated, toast fires
- `init(userId)` with flag on, both fail: cache unchanged, toast fires
- `init(null)`: cache clears, no localStorage wipe
- `init(differentUserId)` after prior hydration: cache cleared then re-hydrated
- `wr:auth-invalidated` event triggers `init(null)`

Toggle praying:

- `togglePraying(id)` with flag off: synchronous behavior unchanged
- `togglePraying(id)` with flag on, success: optimistic flip, API confirmed, no rollback
- `togglePraying(id)` with flag on, ApiError(500): optimistic flip, then rollback, then toast
- `togglePraying(id)` with flag on, AnonymousWriteAttemptError: rollback, AuthModal opened, no toast
- `togglePraying(id)` double-tap: second tap no-ops while first is pending
- `togglePraying(id)` with flag on, server state disagrees: forceState fires, listeners re-render

Toggle bookmark:

- `toggleBookmark(id)` with flag on, was-bookmarked → removeBookmark, success
- `toggleBookmark(id)` with flag on, was-not-bookmarked → addBookmark, success

**`reactionsStore.test.ts` cross-mount subscription test (~1):**

- Two subscribers both receive notify() on toggle (Phase 3 Addendum #12)

**`usePrayerReactions.test.ts` integration (~3):**

- Hook mounts, calls `init(user.id)` on first render (with flag on)
- Hook unmounts, does NOT call `init(null)` (cache survives navigation)
- User logs out, `init(null)` fires, hook re-renders with empty state

**`apiErrors.test.ts` extensions (~2):**

- Toast taxonomy includes the rare `AnonymousWriteAttemptError` case (no toast, AuthModal-only)
- Network error during hydration produces "couldn't refresh" copy distinct from "couldn't post" copy

## Files to create

```
(none — all logic lives in existing files)
```

## Files to modify

```
frontend/src/lib/prayer-wall/reactionsStore.ts                    # add init, hydration logic, async toggle implementations, configure helper, pending-mutation guard, forceState
frontend/src/lib/prayer-wall/__tests__/reactionsStore.test.ts     # extend with ~17 new tests
frontend/src/hooks/usePrayerReactions.ts                          # add useEffect for init(user?.id), configure() call on mount
frontend/src/hooks/__tests__/usePrayerReactions.test.ts           # extend with hydration tests (or create if doesn't exist)
frontend/src/lib/prayer-wall/apiErrors.ts                         # extend mapApiErrorToToast with hydration-specific copy if needed
frontend/src/lib/prayer-wall/__tests__/apiErrors.test.ts          # extend test if apiErrors changes
```

## Files explicitly NOT modified

- `frontend/src/services/api/prayer-wall-api.ts` — shipped in Spec 3.10, fully consumed here
- `frontend/src/lib/prayer-wall/postMappers.ts` — shipped in Spec 3.10, no changes needed for reactions/bookmarks
- `frontend/src/types/prayer-wall.ts` — `PrayerReaction` shape unchanged
- `frontend/src/types/api/prayer-wall.ts` — API response types shipped in Spec 3.10
- `frontend/src/pages/PrayerWall.tsx`, `PrayerDetail.tsx`, `PrayerWallDashboard.tsx`, `MyPrayers.tsx` — all consumers; hook return shape unchanged so no consumer changes
- `frontend/src/components/prayer-wall/InteractionBar.tsx` — same
- `frontend/src/lib/env.ts` — `isBackendPrayerWallEnabled()` shipped in Spec 3.10
- Any backend file — this is a pure frontend spec
- Any test mock files — MSW mocks are already in place from Spec 3.10's tests

## Acceptance criteria

Master plan body's 6 AC items + brief additions:

- [ ] Hook return shape unchanged — `{ reactions, togglePraying, toggleBookmark, toggleCandle }`
- [ ] On login (`user.id` becomes non-null with flag on), `init(userId)` fires; cache hydrates from backend
- [ ] On logout (`user.id` becomes null), `init(null)` fires; in-memory cache clears; localStorage preserved
- [ ] On `wr:auth-invalidated` event, `init(null)` fires
- [ ] User-switch (different userId) clears cache fully before re-hydrating
- [ ] Toggling praying with flag on: optimistic flip, calls `prayerWallApi.toggleReaction(id, 'praying')`, rollback on error
- [ ] Toggling candle with flag on: optimistic flip, calls `prayerWallApi.toggleReaction(id, 'candle')`, rollback on error
- [ ] Toggling bookmark with flag on: optimistic flip, calls `addBookmark` or `removeBookmark` based on cached state, rollback on error
- [ ] Backend error rolls back the cache and shows a toast (anti-pressure copy)
- [ ] AnonymousWriteAttemptError opens AuthModal; does NOT show toast
- [ ] Pending-mutation guard prevents double-tap races
- [ ] Server state disagrees with optimistic prediction → `forceState` fires
- [ ] Network error during hydration: cache unchanged, toast fires
- [ ] Partial hydration failure (reactions OK, bookmarks fail or vice versa): merge what succeeded, toast for failed concern
- [ ] Empty backend response (zero reactions, zero bookmarks): cache becomes `{}`, no error
- [ ] Bookmarks pagination: only first page fetched (per D3); document the >100 trade-off
- [ ] BB-45 cross-mount subscription test passes (Phase 3 Addendum #12)
- [ ] `_resetForTesting` clears all new module-scoped state
- [ ] localStorage is NOT written during toggles in flag-on mode (read-swap, not dual-write)
- [ ] localStorage IS written after successful hydration completes (offline-cache-warming)
- [ ] At least 22 tests across hydration, toggles, subscription, error handling
- [ ] All toast copy passes pastor's-wife test (sentence case, period, no exclamation, no urgency)
- [ ] No consumer files modified (hook return shape unchanged)

## Out of scope (deferred to other specs)

- IndexedDB read-cache (Spec 16.1b)
- Offline write queue (Spec 16.2)
- Bookmark pagination loop for >100-bookmark users (followup if usage emerges)
- Cross-tab sync via storage event (deliberate trade-off; users opening two tabs may see stale state until next hydration)
- Pending-state visual indicator (deliberate UX trade-off; optimistic flip IS the feedback per D6)
- Spec 3.12 cutover (flag flip default true, manual smoke test, a11y evidence)

## Brand voice / Universal Rules quick reference (3.11-relevant)

- Rule 6: All new code has tests
- Rule 11: Brand voice — pastor's-wife test on toast strings (rollback toast, hydration-failed toast)
- Rule 12: Anti-pressure copy — sentence case + period, no exclamation, no urgency framing
- Rule 16: Respect existing patterns — Pattern A subscription store, useSyncExternalStore, configure-via-DI for non-React-to-React communication

## Tier rationale

xHigh, not MAX. The dimensions:

1. **No novel patterns** — Spec 3.10 already established the read-swap model, the AnonymousWriteAttemptError pattern, the toast taxonomy, and the API call surface. 3.11 wires consumers to those primitives.
2. **No cross-author leakage surface** — the mapper (Spec 3.10) is the load-bearing artifact for that risk; 3.11 just consumes its output.
3. **No privilege escalation surface** — 3.10's auth gating is server-side (`.authenticated` rules); 3.11's AnonymousWriteAttemptError is a UX nicety, not a security boundary.
4. **No data correctness over time** — store state is ephemeral (cleared on logout, hydrated on login). localStorage is offline cache only. Worst case of a bug: stale state for a few seconds.
5. **Recoverable failure modes** — toggle bug shows wrong icon; user re-toggles; works. Hydration bug shows empty cache; user navigates away and back; re-hydrates.

The brief's 20 watch-fors + 22-test target + 12 explicit decisions provide structured reasoning. xHigh + comprehensive brief outperforms MAX + thin brief for this kind of consumer-wiring spec.

## Recommended planner instruction

When invoking `/plan-forums spec-3-11`, run the Plan Tightening Audit with extra scrutiny on:

- Lens 4 (D2 user-switch detection) — verify the lastHydratedUserId tracking actually fires re-hydration on switch, not silent stale-cache reuse
- Lens 7 (Pattern A clarification per Phase 3 Addendum #12) — explicit cross-mount test added
- Lens 9 (toast copy review) — every new toast string passes pastor's-wife test
- Lens 14 (D14 hydration-vs-mutation race) — recon at plan time and write a specific test for the race
- Lens 15 (no localStorage writes during toggle in flag-on mode) — grep verification
- Lens 17 (D5 configure pattern) — the toastFn/openAuthModalFn null-check on every call site
