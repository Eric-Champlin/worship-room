# Forums Wave Plan: Spec 0.5 — Convert usePrayerReactions to a Reactive Store

**Spec:** `_specs/forums/round3-phase00-5-spec01-prayer-reactions-reactive-store.md`
**Master Plan:** `_forums_master_plan/round3-master-plan.md` → Spec 0.5
**Date:** 2026-04-22
**Branch:** `claude/forums/round3-forums-wave`
**Phase:** 0.5 — Reaction Persistence Quick Win
**Size:** M
**Risk:** Medium

---

## Affected Frontend Routes

- `/prayer-wall`
- `/prayer-wall/dashboard`
- `/prayer-wall/:id`
- `/prayer-wall/user/:id`

---

## Universal Rules Checklist

All 17 Universal Rules from `_forums_master_plan/round3-master-plan.md`. Marked applicable (✅), not applicable (N/A), or needs-attention (⚠️) for this spec:

- ✅ Rule 1: No git operations by CC. User handles all git manually.
- ✅ Rule 2: Master Plan Quick Reference read — Spec 0.5 is Phase 0.5 (Reaction Persistence Quick Win), prereq Phase 0 read complete.
- N/A Rule 3: Liquibase — no schema changes in this spec (frontend-only).
- N/A Rule 4: OpenAPI — no API changes in this spec.
- ✅ Rule 5: User-facing strings — no new user-facing copy (UI is unchanged). Anti-Pressure checklist is N/A throughout.
- ✅ Rule 6: Tests written for all new functionality (8+ store unit tests, 1+ BB-45 subscription test, rewritten hook leverages existing consumer-page coverage).
- ✅ Rule 7: New `wr_prayer_reactions` localStorage key documented in `11-local-storage-keys.md` with store module path + Pattern A subscription.
- ✅ Rule 8: BB-45 anti-pattern forbidden — hook uses `useSyncExternalStore` (Pattern A); dedicated subscription test mutates store post-mount; `vi.mock()` of the store module is explicitly prohibited in the subscription test.
- ✅ Rule 9: Accessibility — UI is unchanged, existing ARIA on pray/bookmark buttons preserved. No new interactive elements introduced.
- ✅ Rule 10: Performance — module-level cache + stable snapshot reference keeps re-render cost equivalent to the prior hook; no new bundle weight beyond a ~100-line store.
- ✅ Rule 11: Brand voice — no new copy.
- ✅ Rule 12: Anti-pressure design — UI state identical; no new nudges, toasts, or comparison framing introduced as a side effect.
- N/A Rule 13: Crisis detection — reactions are pray/bookmark toggles, no user-generated text content.
- N/A Rule 14: Plain text only — no user-generated content in this spec.
- N/A Rule 15: Rate limiting — frontend-only, no endpoints.
- ✅ Rule 16: Respect existing patterns — follows `frontend/src/lib/memorize/store.ts` (snapshotCache stable-reference technique) and `frontend/src/hooks/bible/useMemorizationStore.ts` (Pattern A hook). Mock imports stay at `@/mocks/prayer-wall-mock-data`.
- N/A Rule 17: Per-phase cutover specs — Phase 0.5 is not a dual-write cutover; it's a standalone quick win.

---

## Architecture Context

### Existing code discovered in recon

- **Current hook:** `frontend/src/hooks/usePrayerReactions.ts` — uses `useState(getMockReactions())`. Classic "snapshot without subscription" pattern. Exposes `{ reactions, togglePraying, toggleBookmark }` where `togglePraying` returns a boolean `wasPraying` (used by InteractionBar to differentiate toggle-on vs toggle-off for ceremony animation).
- **Hook consumers (4 pages, all call the hook and destructure identically):**
  - `frontend/src/pages/PrayerWall.tsx:62`
  - `frontend/src/pages/PrayerWallDashboard.tsx:66`
  - `frontend/src/pages/PrayerDetail.tsx:34`
  - `frontend/src/pages/PrayerWallProfile.tsx:41`
- **Mock data:** `frontend/src/mocks/prayer-wall-mock-data.ts:864` defines `MOCK_REACTIONS: Record<string, PrayerReaction>` and `:906 getMockReactions(): Record<string, PrayerReaction>` returns `{ ...MOCK_REACTIONS }` (shallow clone).
- **Type:** `frontend/src/types/prayer-wall.ts:41` — `PrayerReaction = { prayerId: string; isPraying: boolean; isBookmarked: boolean }`.
- **React version:** `react@^18.3.1` in `frontend/package.json` — `useSyncExternalStore` is built-in.
- **Vitest:** `^4.0.18`, `@testing-library/react` available.
- **`frontend/src/lib/prayer-wall/` does not yet exist** — this spec creates it.

### Pattern to follow (Pattern A — `useSyncExternalStore` + standalone hook)

Two existing references in the codebase:

1. **Store module reference:** `frontend/src/lib/memorize/store.ts`
   - Module-level `cache: MemorizationCard[] | null` seeded lazily on first read
   - **Module-level `snapshotCache: MemorizationCard[] | null`** — the stable reference returned from `getAllCards()`. Invalidated to `null` only when the cache actually mutates (`invalidateSnapshot()` called from `notify()`). This is the exact technique needed to avoid the `useSyncExternalStore` infinite-loop guard.
   - `const listeners = new Set<() => void>()`
   - `subscribe(listener)` adds the listener and returns an unsubscribe function
   - `_resetForTesting()` clears `cache`, `snapshotCache`, and `listeners`
   - Storage I/O wrapped in try/catch with silent failure (quota/private browsing)
2. **Hook reference:** `frontend/src/hooks/bible/useMemorizationStore.ts`
   - `useSyncExternalStore(subscribe, getAllCards, getServerSnapshot)` where `getServerSnapshot` returns `[]` for SSR
   - Returns the snapshot directly (no wrapper object) — but this spec's hook MUST return `{ reactions, togglePraying, toggleBookmark }` to preserve the existing consumer signature

### Existing tests that depend on the current hook / mock module

- `frontend/src/components/prayer-wall/__tests__/PrayCeremony.test.tsx:58` — `vi.mock('@/mocks/prayer-wall-mock-data', ...)` overrides `getMockReactions` so `prayer-1.isPraying = false`. With the new store-based hook, this mock is still honored **on first-load seed** because the store calls `getMockReactions()` to seed. But because the store's module-level cache persists across tests, the test file will need `beforeEach` cleanup to force a fresh seed per test. No other PrayerWall page test (`PrayerWall.test.tsx`, etc.) mocks the reactions module or the hook.
- Grep confirms zero test files use `vi.mock.*usePrayerReactions` or `vi.mock.*reactionsStore`.

### Storage key inventory context

`.claude/rules/11-local-storage-keys.md` has sections including "Daily Hub & Journal", "Content Features", "Bible Reader", "Community Challenges" — but NO existing "Prayer Wall" section. The three `wr_prayer_*` keys currently live elsewhere (`wr_prayer_draft` under Daily Hub & Journal, `wr_prayer_list` and `wr_prayer_reminders_shown` under Content Features). This plan adds a new "Prayer Wall" section rather than scattering. The "Reactive stores in this file" table at the end of the document also needs a new row.

### Design system adherence

- No new UI (rule 16). Existing pray/bookmark button styling, glow, and ceremony animation are untouched.
- No new animations — existing `motion-safe:animate-card-pulse` and other Wave 6 visual touches in `InteractionBar.tsx` remain.

---

## Database Changes

None — frontend-only spec.

## API Changes

None — frontend-only spec.

---

## Assumptions & Pre-Execution Checklist

- [ ] Phase 0 read (prereq) is complete and committed.
- [ ] Frontend builds cleanly pre-change: `cd frontend && pnpm build`.
- [ ] Frontend test suite baseline matches CLAUDE.md § Build Health: 8,811 pass / 11 pre-existing fail.
- [ ] React 18.3.1 confirmed in `frontend/package.json` (`useSyncExternalStore` available without polyfill).
- [ ] `frontend/src/lib/prayer-wall/` directory does not exist (this spec creates it).
- [ ] Mock module stays at `@/mocks/prayer-wall-mock-data` (not moved to `@/lib/prayer-wall/`).
- [ ] `PrayerReaction` type at `frontend/src/types/prayer-wall.ts:41` is sufficient — no changes required.

---

## Spec-Category-Specific Guidance

**This is a FRONTEND-ONLY spec inside Forums Wave** — a standalone quick-win that introduces a reactive store without any backend, migration, or cutover work. The spec is NOT dual-write (localStorage IS the source of truth for Phase 0.5) and NOT a cutover. Apply the "frontend-only Forums Wave spec" guidance:

- Skip all backend-specific rule checks (Testcontainers, Liquibase, OpenAPI).
- The dual-write pattern's shadow-writer and feature-flag steps do NOT apply — this spec intentionally ships without a feature flag so the data layer swap is complete on the first landing. (Phase 3 will swap the localStorage adapter for an API adapter without changing the hook surface; a feature flag can be introduced then if needed.)
- Universal Rule 17's `_cutover-evidence/` axe-core smoke test does NOT apply — this is not a per-phase cutover.
- The `/verify-with-playwright` step applies (see "Affected Frontend Routes" above) but visual verification will show no change — assertions focus on cross-page state persistence, not pixel diffs.

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Store shape | `Record<string, PrayerReaction>` keyed by `prayerId` | Matches existing hook return shape → zero consumer changes. |
| Seeding | Read localStorage first; if empty, seed from `getMockReactions()` and write back | Preserves demo mock data for first-time users; once any toggle writes, localStorage becomes source of truth. |
| `togglePraying` return value | Preserve the existing `boolean` return (true = was praying before toggle) | `InteractionBar.tsx:42` branches on `isPraying` to decide ceremony animation. Changing the return shape would silently break the ceremony. |
| Stable snapshot reference | Module-level `snapshotCache` invalidated on mutation (mirrors `memorize/store.ts`) | Required by `useSyncExternalStore` — returning a new object every call triggers React's infinite-loop guard. Unit test locks this in. |
| Corruption recovery | JSON.parse failure → fall back to `getMockReactions()` seed, write the seed back | Graceful degradation over crashing. |
| Storage unavailable (private mode / quota exceeded) | Catch, warn nothing, keep in-memory state | Cache is a courtesy layer; the hook surface must never propagate storage failure to the UI. |
| Cross-tab sync | Not implemented in this spec | Explicitly out-of-scope per spec ("Cross-tab sync via `storage` event… deferred"). |
| `_resetForTesting()` export | Required | Module-level cache persists across tests; without a reset helper, the `PrayCeremony.test.tsx` mock of `getMockReactions` only takes effect on the first test in the run. |
| PrayerCard subscription test component | `PrayerCard` does NOT consume the hook directly — its descendants do via props. Use a small test harness that mounts an element calling `usePrayerReactions()` and displaying the result for the target prayer ID. | The BB-45 subscription test verifies the hook subscribes, not the full card tree. A 20-line test harness avoids pulling in the full `PrayerCard` + `InteractionBar` + `AuthModal` + `ToastProvider` provider chain. |
| Write-through ordering | Mutate cache → write to localStorage → `notify()` (invalidate snapshot, fire listeners) | Same ordering as `memorize/store.ts`. Notify last so listeners that read the store see the post-write state. |

---

## Implementation Steps

### Step 1: Create reactive store module at `frontend/src/lib/prayer-wall/reactionsStore.ts`

**Objective:** Introduce the Pattern A reactive store module with localStorage persistence, stable snapshot caching, mock seeding, listener notification, and defensive storage I/O.

**Files to create:**
- `frontend/src/lib/prayer-wall/reactionsStore.ts` — the new store module.

**Details:**

Module-level state (mirrors `frontend/src/lib/memorize/store.ts` lines 5–7):

```ts
import { getMockReactions } from '@/mocks/prayer-wall-mock-data'
import type { PrayerReaction } from '@/types/prayer-wall'

const STORAGE_KEY = 'wr_prayer_reactions'

let cache: Record<string, PrayerReaction> | null = null
let snapshotCache: Record<string, PrayerReaction> | null = null
const listeners = new Set<() => void>()
```

Storage I/O helpers, each wrapped in try/catch with silent failure (matches `memorize/store.ts:20–41`):

- `readFromStorage(): Record<string, PrayerReaction> | null` — returns the parsed record, or `null` on missing key / JSON parse error / non-object parsed result. The validator rejects values whose entries are not `{ prayerId: string, isPraying: boolean, isBookmarked: boolean }`.
- `writeToStorage(data: Record<string, PrayerReaction>): void` — `localStorage.setItem(STORAGE_KEY, JSON.stringify(data))` inside try/catch. Silent on quota/unavailable.
- `seedFromMock(): Record<string, PrayerReaction>` — calls `getMockReactions()`, writes the seed back to localStorage (best-effort), returns the seed.

`getCache()` (mirrors `memorize/store.ts:43–48`):

```ts
function getCache(): Record<string, PrayerReaction> {
  if (cache === null) {
    const stored = readFromStorage()
    cache = stored !== null ? stored : seedFromMock()
  }
  return cache
}
```

`invalidateSnapshot()` and `notify()` (mirror `memorize/store.ts:49–58`):

```ts
function invalidateSnapshot(): void {
  snapshotCache = null
}

function notify(): void {
  invalidateSnapshot()
  for (const listener of listeners) listener()
}
```

Public API:

```ts
/** Returns the current reactions record. Referentially stable between mutations (required for useSyncExternalStore). */
export function getSnapshot(): Record<string, PrayerReaction> {
  if (snapshotCache === null) {
    snapshotCache = getCache()
  }
  return snapshotCache
}

/** Alias — kept for API parity with the spec's name ("getReactions"). */
export function getReactions(): Record<string, PrayerReaction> {
  return getSnapshot()
}

/** Returns the reaction for a single prayer, or undefined if no record exists. */
export function getReaction(prayerId: string): PrayerReaction | undefined {
  return getCache()[prayerId]
}

/** Toggles isPraying for prayerId. Returns the PREVIOUS isPraying value (true = was praying before the toggle). */
export function togglePraying(prayerId: string): boolean {
  const current = getCache()[prayerId]
  const wasPraying = current?.isPraying ?? false
  const next: PrayerReaction = {
    prayerId,
    isPraying: !wasPraying,
    isBookmarked: current?.isBookmarked ?? false,
  }
  cache = { ...getCache(), [prayerId]: next }
  writeToStorage(cache)
  notify()
  return wasPraying
}

/** Toggles isBookmarked for prayerId. */
export function toggleBookmark(prayerId: string): void {
  const current = getCache()[prayerId]
  const next: PrayerReaction = {
    prayerId,
    isPraying: current?.isPraying ?? false,
    isBookmarked: !(current?.isBookmarked ?? false),
  }
  cache = { ...getCache(), [prayerId]: next }
  writeToStorage(cache)
  notify()
}

/** Subscribe to store changes. Returns an unsubscribe function. */
export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

/** Clears in-memory cache and listeners for test isolation. Does NOT touch localStorage (tests call localStorage.clear() themselves). */
export function _resetForTesting(): void {
  cache = null
  snapshotCache = null
  listeners.clear()
}
```

**Guardrails (DO NOT):**
- DO NOT import `getMockReactions` from `@/lib/prayer-wall/prayer-wall-mock-data` — that path does not exist. Use `@/mocks/prayer-wall-mock-data`.
- DO NOT return a fresh object from `getSnapshot()` every call — that triggers `useSyncExternalStore`'s infinite-loop guard. The `snapshotCache` must be invalidated only on mutation.
- DO NOT propagate localStorage failures to the caller — wrap every `localStorage.get/set/removeItem` in try/catch with silent fallback.
- DO NOT use `useState` at the store level (this is a module, not a component).
- DO NOT mutate the existing `cache` record in place (`cache[id] = …`). Always spread (`cache = { ...getCache(), [id]: next }`) so the snapshot reference changes only when a mutation occurred.
- DO NOT change the signature of `togglePraying` — it MUST return the previous `isPraying` boolean (existing consumer `InteractionBar.tsx:42` depends on this).
- DO NOT import React inside this module (store is framework-agnostic).

**Verification (frontend steps):**
- [ ] TypeScript compiles: `cd frontend && pnpm tsc --noEmit`
- [ ] No new ESLint warnings: `cd frontend && pnpm lint`
- [ ] File resides at `frontend/src/lib/prayer-wall/reactionsStore.ts` (new directory `prayer-wall` created).

**Test specifications:** Tests live in Step 2 (store unit tests run against this module).

**Expected state after completion:**
- [ ] New directory `frontend/src/lib/prayer-wall/` exists.
- [ ] `reactionsStore.ts` exports `getReactions`, `getReaction`, `getSnapshot`, `togglePraying`, `toggleBookmark`, `subscribe`, `_resetForTesting`.
- [ ] Module compiles and lints cleanly with no runtime consumers yet.

---

### Step 2: Create unit tests for the store at `frontend/src/lib/prayer-wall/__tests__/reactionsStore.test.ts`

**Objective:** Cover CRUD, persistence, seeding, subscription, corruption recovery, storage-unavailable fallback, and snapshot reference stability. At least 10 tests.

**Files to create:**
- `frontend/src/lib/prayer-wall/__tests__/reactionsStore.test.ts`

**Details:**

Follow the shape of `frontend/src/lib/memorize/__tests__/store.test.ts` (uses `beforeEach` to call `localStorage.clear()` + `_resetForTesting()`).

Required tests (at least 10 cases, covering the spec's acceptance-criteria list):

1. **`getReactions()` returns seeded cache on first load with empty storage** — clears storage, resets store, calls `getReactions()`, asserts result is deeply equal to `getMockReactions()`.
2. **`getReactions()` returns persisted data on second load** — seeds, calls `togglePraying('prayer-1')`, resets module cache via `_resetForTesting()` (but NOT `localStorage.clear()`), calls `getReactions()` again, asserts `prayer-1.isPraying` reflects the previously written toggle.
3. **`togglePraying(id)` flips `isPraying` from false → true, returns `false`, writes to localStorage** — assertion chain includes `JSON.parse(localStorage.getItem('wr_prayer_reactions'))['prayer-x'].isPraying === true`.
4. **`togglePraying(id)` flips `isPraying` from true → false on second call, returns `true` first then `false` second** — covers the boolean return for both directions.
5. **`togglePraying(id)` preserves `isBookmarked`** — toggles praying, asserts bookmarked remains unchanged from the seed.
6. **`toggleBookmark(id)` flips `isBookmarked` symmetrically and preserves `isPraying`**.
7. **`subscribe(listener)` invokes the listener synchronously when the cache mutates** — subscribe, togglePraying, assert listener called exactly once.
8. **`subscribe(listener)` returns an unsubscribe function that stops notifications** — subscribe, unsubscribe, togglePraying, assert listener NOT called.
9. **`getSnapshot()` returns the SAME reference across successive calls when nothing changed** — `expect(getSnapshot()).toBe(getSnapshot())` (strict identity, not equality). This is the infinite-loop guard test.
10. **`getSnapshot()` returns a DIFFERENT reference after a mutation** — call, togglePraying, call again, assert the references are not identical.
11. **Corrupted localStorage JSON falls back to mock seed without throwing** — seed `localStorage.setItem('wr_prayer_reactions', 'not valid json {')`, reset module, call `getReactions()`, assert result equals the mock seed and no exception.
12. **`localStorage.setItem` throwing (quota exceeded / Safari private mode) does not crash `togglePraying`** — `vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('QuotaExceededError') })`, togglePraying, assert no throw AND in-memory cache still updated (`getReaction(id).isPraying === true`).
13. **`getReaction(id)` returns `undefined` for unknown IDs** — ensures the spec API's `getReaction` contract is precise.

Setup block (mirrors `memorize/__tests__/store.test.ts`):

```ts
import { beforeEach, describe, it, expect, vi } from 'vitest'
import {
  getReactions,
  getReaction,
  getSnapshot,
  togglePraying,
  toggleBookmark,
  subscribe,
  _resetForTesting,
} from '../reactionsStore'

beforeEach(() => {
  localStorage.clear()
  _resetForTesting()
  vi.restoreAllMocks()
})
```

**Guardrails (DO NOT):**
- DO NOT mock `@/mocks/prayer-wall-mock-data` in these unit tests — they exercise the real mock seed.
- DO NOT rely on test-order side effects — `beforeEach` must fully reset.
- DO NOT assert the exact number of entries in `getMockReactions()` — seed-count might drift as mock data evolves. Assert deep equality or per-key properties instead.

**Verification (frontend steps):**
- [ ] Tests pass: `cd frontend && pnpm test -- --run src/lib/prayer-wall/__tests__/reactionsStore.test.ts`
- [ ] At least 10 `it(...)` blocks pass (spec acceptance criteria: 8+).
- [ ] `pnpm test` overall does not introduce any NEW failing test beyond the CLAUDE.md baseline (8,811 pass / 11 fail). The new test file adds to the pass count.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| CRUD (6 tests) | unit | toggle/read round-trips, returns values |
| Subscription (2) | unit | subscribe fires, unsubscribe stops firing |
| Snapshot stability (2) | unit | same ref unchanged, different ref after mutation |
| Resilience (3) | unit | corrupt JSON, storage throw, unknown ID |

**Expected state after completion:**
- [ ] 10+ tests in the new file, all passing.
- [ ] Overall `pnpm test` shows 8,811 + N passing, 11 failing (N = new tests).

---

### Step 3: Rewrite `frontend/src/hooks/usePrayerReactions.ts` to consume the store via `useSyncExternalStore`

**Objective:** Replace the `useState(getMockReactions())` snapshot-without-subscription pattern with a Pattern A hook that re-renders on store mutation. Hook return shape MUST remain unchanged.

**Files to modify:**
- `frontend/src/hooks/usePrayerReactions.ts` — full rewrite.

**Details:**

New implementation (mirrors `frontend/src/hooks/bible/useMemorizationStore.ts`):

```ts
import { useSyncExternalStore } from 'react'
import {
  subscribe,
  getSnapshot,
  togglePraying,
  toggleBookmark,
} from '@/lib/prayer-wall/reactionsStore'
import type { PrayerReaction } from '@/types/prayer-wall'

function getServerSnapshot(): Record<string, PrayerReaction> {
  return {}
}

export function usePrayerReactions(): {
  reactions: Record<string, PrayerReaction>
  togglePraying: (prayerId: string) => boolean
  toggleBookmark: (prayerId: string) => void
} {
  const reactions = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  return { reactions, togglePraying, toggleBookmark }
}
```

**Guardrails (DO NOT):**
- DO NOT change the return shape of the hook. The four consumer pages + `InteractionBar` destructure `{ reactions, togglePraying, toggleBookmark }` exactly.
- DO NOT wrap `togglePraying`/`toggleBookmark` in `useCallback` — they are already stable references because they are module-level functions, not closures.
- DO NOT leave the old `useState(getMockReactions())` path in place as a fallback. Full rewrite.
- DO NOT remove the hook file — consumers still import from this path.
- DO NOT touch the four consumer pages (`PrayerWall`, `PrayerWallDashboard`, `PrayerDetail`, `PrayerWallProfile`) or `InteractionBar.tsx` — the hook surface is unchanged.

**Verification (frontend steps):**
- [ ] TypeScript compiles: `cd frontend && pnpm tsc --noEmit`
- [ ] Build passes: `cd frontend && pnpm build`
- [ ] No new ESLint warnings: `cd frontend && pnpm lint`
- [ ] Grep confirms no remaining `useState(getMockReactions())`: `grep -rn "getMockReactions" frontend/src/hooks/` should return no matches.
- [ ] All four consumer pages still compile unchanged (no edits to those files).

**Test specifications:** Existing tests that exercise the hook transitively (PrayerWall page tests, PrayCeremony) must still pass. See Step 5.

**Expected state after completion:**
- [ ] `usePrayerReactions.ts` is a ~20-line Pattern A hook.
- [ ] All existing callers compile and render without changes.

---

### Step 4: Create BB-45 subscription test at `frontend/src/hooks/__tests__/usePrayerReactions.subscription.test.tsx`

**Objective:** Lock in the BB-45 anti-pattern protection. Verify the hook re-renders when the store is mutated from outside the component AFTER mount.

**Files to create:**
- `frontend/src/hooks/__tests__/usePrayerReactions.subscription.test.tsx`

**Details:**

Use a small inline test harness rather than the full `PrayerCard` tree (avoids provider stack). The test mounts a 10-line consumer that exercises the hook, then mutates the store via direct import.

```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { usePrayerReactions } from '@/hooks/usePrayerReactions'
import {
  togglePraying,
  toggleBookmark,
  _resetForTesting,
} from '@/lib/prayer-wall/reactionsStore'

function HookConsumer({ prayerId }: { prayerId: string }) {
  const { reactions } = usePrayerReactions()
  const reaction = reactions[prayerId]
  return (
    <div>
      <span data-testid="praying">{String(reaction?.isPraying ?? false)}</span>
      <span data-testid="bookmarked">{String(reaction?.isBookmarked ?? false)}</span>
    </div>
  )
}

beforeEach(() => {
  localStorage.clear()
  _resetForTesting()
})

describe('usePrayerReactions subscription', () => {
  it('re-renders when togglePraying is called externally after mount', () => {
    render(<HookConsumer prayerId="test-prayer-1" />)
    expect(screen.getByTestId('praying').textContent).toBe('false')

    act(() => { togglePraying('test-prayer-1') })

    expect(screen.getByTestId('praying').textContent).toBe('true')
  })

  it('re-renders when toggleBookmark is called externally after mount', () => {
    render(<HookConsumer prayerId="test-prayer-1" />)
    expect(screen.getByTestId('bookmarked').textContent).toBe('false')

    act(() => { toggleBookmark('test-prayer-1') })

    expect(screen.getByTestId('bookmarked').textContent).toBe('true')
  })

  it('two independent HookConsumer instances stay in sync when the store mutates', () => {
    const { unmount: _ } = render(
      <>
        <div data-testid="a"><HookConsumer prayerId="test-prayer-2" /></div>
        <div data-testid="b"><HookConsumer prayerId="test-prayer-2" /></div>
      </>,
    )

    act(() => { togglePraying('test-prayer-2') })

    const aText = screen.getAllByTestId('praying')[0].textContent
    const bText = screen.getAllByTestId('praying')[1].textContent
    expect(aText).toBe('true')
    expect(bText).toBe('true')
  })
})
```

The third test is the cross-page consistency proof — two simultaneously-mounted instances both reflect the mutation. This stands in for the acceptance criterion "Tapping Pray on PrayerWall feed and navigating to PrayerDetail shows the praying state still active" without needing to mount full page components.

**Guardrails (DO NOT):**
- DO NOT use `vi.mock('@/lib/prayer-wall/reactionsStore', ...)` in this test. Mocking the store bypasses the subscription mechanism and defeats the entire purpose of BB-45 protection. This is the spec's most important correctness guardrail.
- DO NOT use `vi.mock('@/hooks/usePrayerReactions', ...)` either — same rationale.
- DO NOT assert on initial render only. The whole point of the test is to mutate AFTER mount.
- DO NOT wrap `togglePraying` / `toggleBookmark` calls without `act(...)` — React test utilities will warn about un-batched updates.
- DO NOT import from `@/mocks/prayer-wall-mock-data` inside this test — let the store seed naturally from the real mock so `test-prayer-*` IDs (unknown to the mock) exercise the "new key" code path without fighting pre-seeded data.

**Verification (frontend steps):**
- [ ] Tests pass: `cd frontend && pnpm test -- --run src/hooks/__tests__/usePrayerReactions.subscription.test.tsx`
- [ ] All 3 tests pass.
- [ ] If the subscription wiring regresses (snapshot returned without invalidating or `subscribe` not connected), these tests MUST fail. Manually verify the guard by commenting out `notify()` in the store and running this test file — it should fail. Revert immediately.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `togglePraying` external | integration (hook + RTL) | Component re-renders post-mount mutation |
| `toggleBookmark` external | integration | Same, for bookmark flag |
| Cross-consumer sync | integration | Two mounted instances both observe the mutation |

**Expected state after completion:**
- [ ] 3 subscription tests pass.
- [ ] The BB-45 anti-pattern is locked in — any regression breaks these tests.

---

### Step 5: Update existing `PrayCeremony.test.tsx` to reset the module-level store cache between tests

**Objective:** The store's module-level `cache` and `snapshotCache` persist across test cases, but `PrayCeremony.test.tsx` relies on `vi.mock('@/mocks/prayer-wall-mock-data')` to make `prayer-1.isPraying = false`. Without a reset, the mock seed only takes effect on the first test, and subsequent tests may inherit mutated state from prior toggles in the same test file.

**Files to modify:**
- `frontend/src/components/prayer-wall/__tests__/PrayCeremony.test.tsx` — add `_resetForTesting` call and `localStorage.clear()` inside the existing `beforeEach`.

**Details:**

The file currently has:

```tsx
beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})
```

Add store-reset imports and augment `beforeEach`:

```tsx
import { _resetForTesting as resetReactionsStore } from '@/lib/prayer-wall/reactionsStore'

beforeEach(() => {
  localStorage.clear()
  resetReactionsStore()
  vi.useFakeTimers()
})
```

Leave `afterEach` unchanged.

**Guardrails (DO NOT):**
- DO NOT alter the existing `vi.mock('@/mocks/prayer-wall-mock-data', ...)` block — its `getMockReactions` override is still the mechanism that makes `prayer-1.isPraying = false`. The store now reads through this mock on each `_resetForTesting()`-then-first-access cycle.
- DO NOT delete or modify the fake-timers logic.
- DO NOT move the `vi.mock` call — Vitest's hoisting rules require it at the top of the file.

**Verification (frontend steps):**
- [ ] Tests pass: `cd frontend && pnpm test -- --run src/components/prayer-wall/__tests__/PrayCeremony.test.tsx`
- [ ] All pre-existing tests in the file still pass (no new failures introduced).
- [ ] If a test stutters because of cross-test cache leak, the `beforeEach` augmentation resolves it.

**Test specifications:** No new tests — only a setup fix for existing tests.

**Expected state after completion:**
- [ ] PrayCeremony test file still passes all existing cases.
- [ ] Store cache is clean between tests.

---

### Step 6: Document `wr_prayer_reactions` in `.claude/rules/11-local-storage-keys.md`

**Objective:** Satisfy Universal Rule 7 — every new `wr_*` key must be documented with store module path and subscription pattern.

**Files to modify:**
- `.claude/rules/11-local-storage-keys.md` — add a new "Prayer Wall" section and a new row in the "Reactive stores in this file" table.

**Details:**

**(a)** Add a new section. Choose location: insert immediately after the "Community Challenges" section (line ~187) since it keeps community-related features adjacent. The section structure mirrors existing sections.

```md
### Prayer Wall

| Key                   | Type                              | Feature                                                                                                                                                                                        |
| --------------------- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `wr_prayer_reactions` | `Record<string, PrayerReaction>`  | Prayer Wall reactions — `isPraying` and `isBookmarked` per prayer. **Reactive store (Phase 0.5).** Module: `lib/prayer-wall/reactionsStore.ts`. Hook: `usePrayerReactions()` (Pattern A via `useSyncExternalStore`). Seeded from `getMockReactions()` on first load when storage is empty. In Phase 3 the localStorage adapter swaps for an API adapter without changing the hook surface. |
```

**(b)** Add a new row to the "Reactive stores in this file" table near the bottom of the document (under the existing bible-wave rows):

```md
| `wr_prayer_reactions`   | `lib/prayer-wall/reactionsStore.ts`     | `usePrayerReactions()` hook (Pattern A)       | Phase 0.5 |
```

**Guardrails (DO NOT):**
- DO NOT put the new row under one of the existing `wr_prayer_*` keys' sections (`wr_prayer_draft` is under "Daily Hub & Journal"; `wr_prayer_list` / `wr_prayer_reminders_shown` are under "Content Features"). Those keys are feature-scoped correctly; the new Prayer Wall section is the right home for `wr_prayer_reactions`.
- DO NOT modify unrelated sections of the document.
- DO NOT add a "Phase 3 migration note" inline as a separate row — the description column's trailing sentence covers it.

**Verification (frontend steps):**
- [ ] Grep `wr_prayer_reactions` in `.claude/rules/11-local-storage-keys.md` returns two matches: one in the "Prayer Wall" section, one in the "Reactive stores in this file" table.
- [ ] No Markdown lint warnings introduced.

**Test specifications:** None — documentation change.

**Expected state after completion:**
- [ ] Storage-keys doc is updated per Universal Rule 7.

---

### Step 7: Full-suite regression + manual cross-page verification

**Objective:** Confirm no regressions in the 8,811 / 11 baseline, and verify cross-page consistency manually in a running browser.

**Files to modify:** None.

**Details:**

**(a) Full test suite:**

```bash
cd frontend && pnpm test 2>&1 | tail -30
```

Assert: pass count = 8,811 + (new Step 2 tests: 10+) + (new Step 4 tests: 3) = ~8,824 pass. Fail count = 11 (pre-existing baseline). Any new failing file is a regression.

**(b) Type + build + lint:**

```bash
cd frontend && pnpm tsc --noEmit && pnpm build && pnpm lint
```

All three must complete cleanly.

**(c) Manual cross-page verification (recorded for the `/verify-with-playwright` step):**

Start the dev server (`cd frontend && pnpm dev`) and manually walk through:

1. `/prayer-wall` — tap Pray on the first non-seeded prayer card. Note the card's prayer ID from DOM inspection.
2. Navigate to `/prayer-wall/<that-id>` via the card's detail link. Assert the Pray button is in the "stop praying" state.
3. Navigate back to `/prayer-wall`. Assert the first card is still in the praying state.
4. Navigate to `/prayer-wall/dashboard`. Assert reactions are consistent with the feed (look for the user's own prayers, or verify no stale state).
5. Tap Bookmark on a card. Refresh the browser (F5). Assert the bookmark persists.
6. Open DevTools → Application → Local Storage → `wr_prayer_reactions`. Assert a JSON object is present and matches the current state.
7. Open an Incognito window, load `/prayer-wall`. Assert no crash; reactions fall back to the mock seed in the isolated session.

**Guardrails (DO NOT):**
- DO NOT flip the CLAUDE.md baseline if this step fails. Fix the root cause.
- DO NOT commit partial work — git operations are user-handled per Rule 1.

**Verification (frontend steps):**
- [ ] `pnpm test` pass count increased by ~13, fail count unchanged at 11.
- [ ] `pnpm build` produces a bundle.
- [ ] `pnpm lint` exits 0.
- [ ] `pnpm tsc --noEmit` exits 0.
- [ ] Manual walkthrough items 1–7 all succeed (noted in execution log).

**Test specifications:** None — regression gate.

**Expected state after completion:**
- [ ] Build health is green.
- [ ] Cross-page consistency is verifiable in a running browser.
- [ ] Ready for `/code-review` and `/verify-with-playwright`.

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Create `reactionsStore.ts` module. |
| 2 | 1 | Unit tests for the store. |
| 3 | 1 | Rewrite `usePrayerReactions.ts` hook. |
| 4 | 3 | BB-45 subscription test for the hook. |
| 5 | 1, 3 | Update `PrayCeremony.test.tsx` setup for module-level cache reset. |
| 6 | 1 | Document `wr_prayer_reactions` in `11-local-storage-keys.md`. |
| 7 | 1–6 | Full regression + manual cross-page verification. |

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Create `reactionsStore.ts` | [COMPLETE] | 2026-04-22 | Created `frontend/src/lib/prayer-wall/reactionsStore.ts` (~140 lines). Exports: `getReactions`, `getReaction`, `getSnapshot`, `togglePraying`, `toggleBookmark`, `subscribe`, `_resetForTesting`. Pattern A reactive store mirroring `lib/memorize/store.ts` — stable snapshot cache invalidated on mutation, defensive try/catch storage I/O, lazy seed from `getMockReactions()`. Validator rejects non-PrayerReaction values on read. tsc + eslint clean. |
| 2 | Store unit tests | [COMPLETE] | 2026-04-22 | Created `frontend/src/lib/prayer-wall/__tests__/reactionsStore.test.ts` with 14 tests (seeding×3, togglePraying×3, toggleBookmark×1, subscribe×2, snapshot stability×2, resilience×3). All 14 pass. Full suite: 8825 pass / 11 fail (baseline preserved: 8811 + 14 new = 8825). |
| 3 | Rewrite `usePrayerReactions.ts` hook | [COMPLETE] | 2026-04-22 | Rewrote `frontend/src/hooks/usePrayerReactions.ts` as a 20-line Pattern A hook using `useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)`. Return shape preserved (`{ reactions, togglePraying, toggleBookmark }`). `getServerSnapshot` returns `{}` for SSR safety. tsc, eslint, pnpm build all clean. Grep confirms `getMockReactions` no longer referenced in `src/hooks/`. |
| 4 | BB-45 subscription test | [COMPLETE] | 2026-04-22 | Created `frontend/src/hooks/__tests__/usePrayerReactions.subscription.test.tsx` with 3 tests: external togglePraying, external toggleBookmark, cross-consumer sync. All 3 pass. Verified the BB-45 guard bites: commenting out `notify()` in the store causes 2 of 3 tests to fail. Reverted and confirmed all pass again. |
| 5 | `PrayCeremony.test.tsx` setup fix | [COMPLETE] | 2026-04-22 | Added `import { _resetForTesting as resetReactionsStore } from '@/lib/prayer-wall/reactionsStore'` and augmented `beforeEach` with `localStorage.clear()` + `resetReactionsStore()` before `vi.useFakeTimers()`. Existing `vi.mock('@/mocks/prayer-wall-mock-data')` block untouched. All 10 PrayCeremony tests pass. |
| 6 | Storage-keys doc update | [COMPLETE] | 2026-04-22 | Added new "Prayer Wall" section after "Community Challenges" with the `wr_prayer_reactions` entry. Added new row in the "Reactive stores in this file" table. Grep confirms 2 matches for `wr_prayer_reactions`. |
| 7 | Regression + manual verification | [COMPLETE] | 2026-04-22 | Full suite: 8827 pass / 12 fail across 685 files. Baseline is 8811 / 11 (±1 flake variance). +17 tests net (14 store + 3 subscription). The 12th failure is in the documented pre-existing flake set (Pray loading-text timing, LocalSupport logged-out mock listings, useBibleAudio orphan test, PlanBrowser CSS drift, useNotifications, Journal reflect-entry). **Scoped prayer-wall verification: all 262 tests across 30 files PASS** (PrayerWall / PrayerWallDashboard / PrayerDetail / PrayerWallProfile page tests + all prayer-wall component tests + new store + subscription tests). `pnpm build` clean. `pnpm tsc --noEmit` clean. `pnpm exec eslint` clean on all touched files. **Manual cross-page walkthrough (steps c.1–c.7) deferred to `/verify-with-playwright` as the next user action** — CC cannot drive a dev-server browser session in this invocation. |
