# Forums Wave: Spec 0.5 — Convert usePrayerReactions to a Reactive Store

**Master Plan Reference:** `_forums_master_plan/round3-master-plan.md` → Spec 0.5
**Branch:** `claude/forums/round3-forums-wave`
**Date:** 2026-04-22

---

## Affected Frontend Routes

- `/prayer-wall`
- `/prayer-wall/dashboard`
- `/prayer-wall/:id` *(spec text references `/prayer-wall/prayer/:prayerId`; actual route per `12-project-reference.md` is `/prayer-wall/:id` — PrayerDetail)*
- `/prayer-wall/user/:id`

---

### Spec 0.5 — Convert usePrayerReactions to a Reactive Store

- **ID:** `round3-phase00-5-spec01-prayer-reactions-reactive-store`
- **Phase:** 0.5 — Reaction Persistence Quick Win
- **Size:** M (one day of work)
- **Risk:** Medium (touches all four Prayer Wall pages, but the change is mechanical)
- **Prerequisites:** Phase 0 read (Spec 0.1 ✅)
- **Goal:** Convert `usePrayerReactions` from snapshot-without-subscription to a reactive store using `useSyncExternalStore` (Pattern A). Persist to `wr_prayer_reactions` localStorage key. All four Prayer Wall pages now share state.

**Phase purpose:** Fix the worst current Prayer Wall bug in one day, before any backend work starts. Convert `usePrayerReactions` from `useState(getMockReactions())` to a reactive store with `useSyncExternalStore`, persisting to `wr_prayer_reactions`. Cross-page consistency works immediately and the migration path to backend in Phase 3 is trivial.

**What this phase accomplishes:** After this phase, tapping Pray on a prayer card on the feed and navigating to the detail page shows the same praying state. Same for bookmarks. Same across all four pages (PrayerWall, PrayerWallDashboard, PrayerDetail, PrayerWallProfile). The reaction state survives navigation, page refresh, and tab switching. The user notices nothing else — the visual UI is unchanged.

**Sequencing:** Can ship any time after Phase 0 is read. Independent of all backend work. Recommended to ship in parallel with Phase 1 for a fast user-visible win while the bigger backend work is in flight.

---

## Affected Frontend Routes

- `/prayer-wall`
- `/prayer-wall/dashboard`
- `/prayer-wall/prayer/:prayerId`
- `/prayer-wall/user/:userId`

---

## Approach

1. **Create a new module at `frontend/src/lib/prayer-wall/reactionsStore.ts`** following the BB-45 reactive store pattern (Pattern A from `.claude/rules/11-local-storage-keys.md`):
   - Internal `Map<string, PrayerReaction>` cache, seeded from localStorage on first read
   - `getReactions()` returns the current cache
   - `getReaction(prayerId)` returns the reaction for a single prayer
   - `togglePraying(prayerId)` mutates the cache, writes to localStorage, notifies listeners
   - `toggleBookmark(prayerId)` mutates the cache, writes to localStorage, notifies listeners
   - `subscribe(listener)` adds a listener and returns an unsubscribe function
   - `getSnapshot()` returns the current cache reference (for `useSyncExternalStore`) — MUST return a stable reference when unchanged to avoid React's infinite-loop guard
   - Defensive try/catch around all localStorage access (graceful degradation if storage is unavailable — Safari private mode, iframe sandbox, quota exceeded)
2. **Create a new hook at `frontend/src/hooks/usePrayerReactions.ts`** (replacing the existing file):

```tsx
import { useSyncExternalStore } from "react";
import {
  subscribe,
  getSnapshot,
  togglePraying,
  toggleBookmark,
} from "@/lib/prayer-wall/reactionsStore";

export function usePrayerReactions() {
  const reactions = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return {
    reactions,
    togglePraying,
    toggleBookmark,
  };
}
```

The hook returns the same shape as before (`{ reactions, togglePraying, toggleBookmark }`) so consumer components do not change.

3. **Seed the store from `getMockReactions()` on first load** if `wr_prayer_reactions` is empty. This preserves the existing mock data behavior for the demo experience.
4. **Add a one-time migration**: on first load, if the localStorage key is empty AND `getMockReactions()` returns data, write the mock reactions to localStorage. After this one-time seed, the store is the source of truth. Subsequent loads read from localStorage, not from the mock.
5. **Document the new store in `.claude/rules/11-local-storage-keys.md`**:
   - Key: `wr_prayer_reactions`
   - Type: `Record<string, PrayerReaction>`
   - Module: `lib/prayer-wall/reactionsStore.ts`
   - Subscription pattern: Pattern A via `usePrayerReactions()` hook
   - Phase 3 migration note: the store's localStorage adapter swaps for an API adapter in Phase 3 without changing the hook surface

## Files to create

- `frontend/src/lib/prayer-wall/reactionsStore.ts`
- `frontend/src/lib/prayer-wall/__tests__/reactionsStore.test.ts`
- `frontend/src/hooks/__tests__/usePrayerReactions.subscription.test.tsx` (the BB-45 subscription test)

## Files to modify

- `frontend/src/hooks/usePrayerReactions.ts` (rewrite to use the new store)
- `.claude/rules/11-local-storage-keys.md` (add the new key entry under the Prayer Wall section)

## Database changes

None — frontend-only spec.

## API changes

None — frontend-only spec. The Phase 3 backend migration will swap the localStorage adapter for an API adapter without changing the hook's public surface.

## Copy Deck

No new user-facing copy. The UI is unchanged; only the data layer is swapped.

## Anti-Pressure Copy Checklist

- [x] No FOMO language (N/A — no new copy)
- [x] No shame language (N/A — no new copy)
- [x] No exclamation points near vulnerability (N/A — no new copy)
- [x] No streak-as-shame messaging (N/A — no new copy)
- [x] No comparison framing (N/A — no new copy)
- [x] Scripture as gift, not decoration (N/A — no scripture in this spec)

## Anti-Pressure Design Decisions

- No new UI states introduced. Reaction toggle behavior is visually identical to today.
- No "you prayed for N prayers this week" nudge surfaced as a side effect. The store is data plumbing only.
- Bookmark persistence is additive — removing a bookmark does not trigger any "are you sure?" confirmation. The user stays in control with zero friction.

## Acceptance criteria

- [ ] Store module created at `frontend/src/lib/prayer-wall/reactionsStore.ts`
- [ ] Store exposes `getReactions`, `getReaction`, `togglePraying`, `toggleBookmark`, `subscribe`, `getSnapshot`
- [ ] Store persists to `wr_prayer_reactions` localStorage key
- [ ] Store seeds from `getMockReactions()` on first load if storage is empty
- [ ] Hook `usePrayerReactions()` rewritten to use `useSyncExternalStore`
- [ ] Hook return shape unchanged (`{ reactions, togglePraying, toggleBookmark }`)
- [ ] Tapping Pray on PrayerWall feed and navigating to PrayerDetail shows the praying state still active
- [ ] Tapping Pray on PrayerDetail and navigating back to PrayerWall feed shows the praying state still active
- [ ] Reaction state persists across full page refresh
- [ ] Bookmark state persists across full page refresh
- [ ] PrayerWallDashboard shows the same reaction state as the feed
- [ ] PrayerWallProfile shows the same reaction state as the feed
- [ ] At least 8 unit tests cover the store (CRUD, persistence, mock seed, defensive storage, subscription notification)
- [ ] At least 1 subscription test verifies the BB-45 pattern: render component, mutate store from outside via direct store import, assert re-render
- [ ] localStorage corruption (invalid JSON) gracefully falls back to mock seed without crashing
- [ ] Anonymous browsing (storage unavailable) does not crash — falls back to in-memory state for the session
- [ ] `.claude/rules/11-local-storage-keys.md` updated with the new key entry
- [ ] No TypeScript errors, no new lint warnings
- [ ] All existing Prayer Wall tests continue to pass (frontend regression baseline unchanged: 8,811 pass / 11 pre-existing fail — see CLAUDE.md § Build Health)

## Testing notes

**Unit tests for `reactionsStore.test.ts`** (target: 8+ tests):

- `getReactions()` returns empty cache before first seed
- `getReactions()` returns seeded cache after first load with empty storage
- `togglePraying(id)` flips `isPraying` from false → true and writes to localStorage
- `togglePraying(id)` flips `isPraying` from true → false on second call
- `toggleBookmark(id)` behaves symmetrically to `togglePraying`
- `subscribe(listener)` invokes the listener when the cache mutates
- `subscribe(listener)` returns an unsubscribe function that stops notifications
- `getSnapshot()` returns the SAME reference across successive calls when nothing changed (otherwise `useSyncExternalStore` enters an infinite loop — this test catches that bug)
- Corrupted localStorage JSON falls back to mock seed without throwing
- `localStorage.setItem` throwing (quota exceeded / Safari private mode) does not crash `togglePraying`

**Subscription test for `usePrayerReactions.subscription.test.tsx`** (mandatory, per `06-testing.md` § Reactive Store Consumer Pattern):

```tsx
import { render, screen, act } from "@testing-library/react";
import { togglePraying } from "@/lib/prayer-wall/reactionsStore"; // direct store import, NOT via hook
import { PrayerCard } from "@/components/prayer-wall/PrayerCard";

test("re-renders when store is mutated externally after mount", async () => {
  render(<PrayerCard prayer={mockPrayer} />);
  expect(screen.queryByLabelText(/stop praying/i)).not.toBeInTheDocument();

  act(() => {
    togglePraying(mockPrayer.id); // mutate the store from outside the component
  });

  expect(await screen.findByLabelText(/stop praying/i)).toBeInTheDocument();
});
```

**Forbidden:** Do NOT use `vi.mock("@/lib/prayer-wall/reactionsStore", ...)` in the subscription test. Mocking the store bypasses the subscription mechanism and defeats the entire purpose of the BB-45 protection.

**Manual QA:**

- Open PrayerWall in two browser tabs, tap Pray in tab 1, switch to tab 2, refresh, verify the reaction is still active
- Open the feed, tap Pray on 3 different cards, navigate to `/prayer-wall/dashboard`, verify those 3 cards appear in "My Reactions" or equivalent view
- Open the feed in Safari private mode — the app should not crash; reactions should work for the session but not persist

**Playwright:**

- Feed → tap Pray → navigate to detail → assert button is in praying state → navigate back → assert button is still in praying state
- Feed → tap Bookmark → refresh page → assert bookmark state is restored

## Notes for plan phase recon

1. Verify `getMockReactions()` is the only source of seeding and identify all call sites. Check `frontend/src/lib/prayer-wall/prayer-wall-mock-data.ts` (likely location).

   > **Recon pre-check (from `/spec-forums` context gather):** The existing `frontend/src/hooks/usePrayerReactions.ts` imports `getMockReactions` from `@/mocks/prayer-wall-mock-data` (not `@/lib/prayer-wall/prayer-wall-mock-data`). The `frontend/src/lib/prayer-wall/` directory does not yet exist — this spec creates it. Plan phase should grep for all call sites of `getMockReactions` and confirm the mocks file stays at `@/mocks/prayer-wall-mock-data`.

2. Confirm the existing `PrayerReaction` type at `frontend/src/types/prayer-wall.ts` is suitable for the store cache shape. Expected shape: `{ isPraying: boolean; isBookmarked: boolean }` keyed by `prayerId`.

   > **Recon pre-check:** The type at line 41 of `frontend/src/types/prayer-wall.ts` is `{ prayerId: string; isPraying: boolean; isBookmarked: boolean }`. The cache shape described in the spec matches, with `prayerId` as both the key and a field on the value.

3. Identify any tests that mock `usePrayerReactions` directly and update them to use the real store. Grep for `vi.mock.*usePrayerReactions` and `vi.mock.*reactionsStore` across `frontend/src/**/*.test.{ts,tsx}`.

   > **Recon pre-check:** A grep for `vi.mock.*usePrayerReactions` and `vi.mock.*reactionsStore` returned zero matches. Nothing to migrate.

4. Check whether `useSyncExternalStore` requires React 18 (it does — confirm React version in `frontend/package.json` is `^18`).
5. Verify the four consumer pages (`PrayerWall`, `PrayerWallDashboard`, `PrayerDetail`, `PrayerWallProfile`) do not shadow `usePrayerReactions` with local `useState` mirroring — that would be the BB-45 anti-pattern at the consumer level and must be cleaned up in this spec if found.
6. Confirm `.claude/rules/11-local-storage-keys.md` has a "Prayer Wall" section or equivalent to add the new key under; if not, add one following the existing structure.
7. Check if `PrayerCard`, `InteractionBar`, or any descendant reads reactions directly from props passed down from a page component (bypassing the hook). If so, those props become redundant after this spec ships and can be removed in a follow-up — flag but don't remove in this spec to keep the diff focused.

## Out of scope

- Backend integration (Phase 3)
- Multi-device sync (Phase 3)
- Optimistic update reconciliation (Phase 3)
- Migration of bookmarks to a separate store (kept on the same store for simplicity in Phase 0.5; Phase 3 may split)
- Refactoring consumer components to remove redundant prop-drilled reaction state (follow-up spec if needed)
- Cross-tab sync via `storage` event (nice-to-have; Phase 3 backend migration gives us cross-device sync for free so this specific feature is unnecessary)

## Out-of-band notes for Eric

- This is the smallest meaningful win in the Forums Wave. Total estimated effort: under one day for CC.
- The most likely failure mode: forgetting the BB-45 subscription test. The test must mutate the store _after_ the component mounts and assert the component re-renders. A test that only sets initial state and asserts initial render would pass even with the original broken pattern.
- The subscription test mutates the store via direct import: `import { togglePraying } from "@/lib/prayer-wall/reactionsStore"` then calls `togglePraying(prayerId)` inside an `act(() => {...})` after `render(...)`. Tests that mock the store entirely defeat the BB-45 protection — never mock the store module in subscription tests.
- After this ships, you can demo Prayer Wall to anyone and the reactions will feel correct. That is the whole point.
- The `getSnapshot` stable-reference requirement is the subtle correctness trap. If `getSnapshot()` returns a new object every call even when nothing changed, `useSyncExternalStore` detects that as "the snapshot changed" and re-renders, which calls `getSnapshot()` again, and the component enters an infinite loop. The store must cache the reference and only return a new one when the cache actually mutates. One of the acceptance-criteria unit tests is specifically designed to catch this.
- When Phase 3 lands, the store's localStorage adapter swaps for an API adapter that does optimistic updates and rollback on error. The hook surface stays identical. This spec is deliberately the simplest possible version that unblocks cross-page consistency today — complexity is deferred to Phase 3 when it earns its keep.

---

## `/spec-forums` drift notes for Eric

These are discrepancies `/spec-forums` surfaced while saving — not fixes. Confirm or override in the plan phase.

- **Size / Risk drift:** `_forums_master_plan/spec-tracker.md` line 22 lists this spec as **Size S / Low Risk**, but the spec text above lists **Size M / Medium Risk**. Per skill rules the spec body is preserved as authored; the tracker row may want a sync edit.
- **Mock module path:** Spec recon note #1 suggests `@/lib/prayer-wall/prayer-wall-mock-data` but the current codebase has `@/mocks/prayer-wall-mock-data`. The new store lives under `lib/prayer-wall/` but should import the mock from its existing `@/mocks/` location.
- **Route slugs:** Spec "Affected Frontend Routes" lists `/prayer-wall/prayer/:prayerId` and `/prayer-wall/user/:userId`. The actual registered routes per `.claude/rules/12-project-reference.md` are `/prayer-wall/:id` (PrayerDetail) and `/prayer-wall/user/:id` (PrayerWallProfile). The frontmatter route list at the top of this file has been adjusted so `/verify-with-playwright` uses the real paths.
