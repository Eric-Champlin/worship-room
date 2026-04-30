# Forums Wave: Spec 3.12 — Phase 3 Cutover

**Master Plan Reference:** `_forums_master_plan/round3-master-plan.md` → Spec 3.12 (lines 4048–4070)
**ID:** `round3-phase03-spec12-phase3-cutover`
**Branch:** `forums-wave-continued` (per user's branch-discipline override — no new branch created; user manages all git operations manually)
**Date:** 2026-04-30

---

## Affected Frontend Routes

This spec is the Phase 3 cutover. Every Prayer Wall route is exercised end-to-end and accessibility-scanned.

- `/prayer-wall`
- `/prayer-wall/:id`
- `/prayer-wall/dashboard`
- `/prayer-wall/user/:id`

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

**xHigh.** Master plan body says M/High. The cutover spec carries the highest stakes per token of code: a misfire turns Prayer Wall blank for every user. But the patterns are well-trodden — Spec 1.10 (Phase 1 cutover) and Spec 2.5.5 (Phase 2.5 cutover) shipped this exact shape with established Playwright fixtures, checklist templates, and CLAUDE.md update conventions.

The novel surface here is the **consumer rewires that 3.10 and 3.11 deferred**. See MPD-2 below — this is where the spec's real work lives, not in flipping the env flag (which is two lines).

xHigh + comprehensive brief + the cutover-checklist as an explicit artifact outperforms MAX + thin brief. MAX would be over-spending on a pattern-application spec.

## Master Plan Divergence

Three deliberate divergences from the master plan body's text (lines 4048-4070 of `_forums_master_plan/round3-master-plan.md`):

**MPD-1: Two flag flips, not one.** Master plan body says "Flip `VITE_USE_BACKEND_PRAYER_WALL` to `true`." Recon confirms this is the only Prayer-Wall-specific flag. **However**, the existing `VITE_USE_BACKEND_MUTES` flag is still `false` per `frontend/.env.example` (Spec 2.5.7 shipped without flipping its default). Phase 3's Prayer Wall consumes mutes infrastructure (Spec 3.4 mute-aware feed filtering); flipping the Prayer Wall flag without also flipping the mutes flag means the read-swap layer reads from the backend but the mute filter pulls from localStorage. That's a half-cutover.

Resolution: **flip BOTH flags in this spec.** `VITE_USE_BACKEND_PRAYER_WALL=true` AND `VITE_USE_BACKEND_MUTES=true`. The mutes flip is small (mutes have shipped + tested for weeks; the backend rows are populated; the read path is identical to friends/social which already cut over).

**Recon at brief-write time (2026-04-30):** confirmed both flags are still `false` in `frontend/.env.example` (lines 44 and 50). Both flips are in scope. If recon at plan time shows either was already flipped via a prior cleanup, drop that flip from the spec. The Master Plan Divergence still belongs in the spec body so the planner explicitly checks.

**MPD-2: Page consumer rewires are in 3.12 scope, NOT deferred.** The master plan body's "Approach" treats this spec as flag-flip + Playwright test. Recon reveals a critical gap: **the three Prayer Wall page components still import directly from `@/mocks/prayer-wall-mock-data`** and have NEVER been rewired to consume `prayer-wall-api`:

- `frontend/src/pages/PrayerWall.tsx:27` imports `getMockPrayers, getMockComments`
- `frontend/src/pages/PrayerWallDashboard.tsx:27` imports `getMockPrayers, getMockAllComments, getMockComments`
- `frontend/src/pages/PrayerDetail.tsx:23` imports `getMockPrayers`

Spec 3.10 shipped `prayer-wall-api.ts` (the API client). Spec 3.11 shipped reactive-store hydration. **Neither spec rewired the page-level data fetching.** Flipping the env flag with these consumers unchanged means: reactions hydrate from backend, but the page renders mock prayer cards from `getMockPrayers()` — the user sees the same 8 mock prayers they always saw, with their backend-real reactions overlaid. Visible UX is unchanged. Cutover does nothing observable.

Resolution: **the consumer rewires land in 3.12 as the heart of this spec.** Pattern: each page checks `isBackendPrayerWallEnabled()` inline; flag-on uses `prayerWallApi.listPosts/getPostById/listAuthorPosts/listComments`; flag-off uses the existing `getMockPrayers/getMockComments/getMockAllComments` calls. Per MPD-3, flag-off path is preserved verbatim — this is a cutover, not a removal. Mock data stays for tests.

This makes 3.12 substantially larger than the master plan body suggests. Per `_plans/post-1.10-followups.md` the gap may already be tracked there (recon to confirm at plan time).

**MPD-3: Mock data preserved, NOT removed.** Master plan body implies mock data goes away after cutover. Recon: tests across the codebase mock `getMockPrayers` and `getMockComments` for component-level tests. Removing the mock module breaks those tests. Resolution: keep `frontend/src/mocks/prayer-wall-mock-data.ts` as-is. The flag-off branch in each page consumer continues to work for tests; production path always takes flag-on. A future spec can deprecate the mock module once test coverage migrates to MSW-only mocking.

This also means Spec 3.12 acceptance criterion "Flag default `true` in `.env.example` and Vite config" is fully addressed by the env flip; there's no Vite config change needed (`vite.config.ts` has no Prayer-Wall-specific config; the env vars are read at runtime).

## Recon Ground Truth (2026-04-30)

All facts verified on the active machine (`/Users/eric.champlin/worship-room/`):

**R1 — `prayer-wall-api.ts` is shipped (Spec 3.10).** All 17 functions defined: `listPosts`, `getPostById`, `listAuthorPosts`, `listComments`, `getMyReactions`, `listMyBookmarks`, `getTodaysQuotd`, `createPost`, `updatePost`, `deletePost`, `toggleReaction`, `removeReaction`, `addBookmark`, `removeBookmark`, `createComment`, `updateComment`, `deleteComment`. MSW-backed tests cover them. Module-lifetime read cache in place per Spec 3.10 D7.

**R2 — `reactionsStore.ts` has backend hydration (Spec 3.11).** `init(userId)` exists. Optimistic updates with rollback on error. Pending-mutation guard. `wr:auth-invalidated` listener clears cache on logout. The store is ready; the page consumers are not.

**R3 — `isBackendPrayerWallEnabled()` is shipped** at `frontend/src/lib/env.ts`. Strict equality `=== 'true'`, fail-closed. Default `false` until this spec flips it.

**R4 — Three page components consume mocks directly:**

- `PrayerWall.tsx` (line 27): `import { getMockPrayers, getMockComments } from '@/mocks/prayer-wall-mock-data'`. The page reads `const allPrayers = useMemo(() => getMockPrayers(), [])` (line 53) and uses `getMockComments` for comment counts.
- `PrayerWallDashboard.tsx` (line 27): imports `getMockPrayers, getMockAllComments, getMockComments`. Dashboard tabs (prayers, comments, bookmarks, reactions, settings) all derive from mock data.
- `PrayerDetail.tsx` (line 23): imports `getMockPrayers`. Single-post view does `allPrayers.find((p) => p.id === id)`.

**R5 — Test mocking for `getMockPrayers`** is widespread in component tests:

- `frontend/src/pages/__tests__/PrayerWall.test.tsx` (multiple `getMockPrayers` mock call sites)
- `frontend/src/components/prayer-wall/__tests__/PrayCeremony.test.tsx`
- (and more — recon at plan time)

These tests use the FLAG-OFF path (default false) so they continue to mock `getMockPrayers` and skip the API path entirely. Flag-on tests use MSW handlers (the pattern Spec 3.10 established for `prayer-wall-api.test.ts`). **Existing test files' mock-setup logic is NOT changed by this spec.** Their mock setup continues to work because the flag-off branch is preserved per MPD-3. New flag-on test cases ARE added to these files (see Test specifications) but the existing flag-off cases stay untouched.

**R6 — Spec 1.10 Phase 1 cutover Playwright pattern.** `frontend/e2e/phase01-auth-roundtrip.spec.ts` is the canonical end-of-phase E2E test. Two-mode: local-dev (default, against `localhost:8080` backend) and prod-mode (set `PLAYWRIGHT_BASE_URL`). Real backend, no mocks. Uses dev-seed user (`DEV_SEED_EMAIL`, `DEV_SEED_PASSWORD`) plus a freshly-registered user.

The Phase 3 equivalent is `frontend/e2e/phase03-prayer-wall-roundtrip.spec.ts`. Same shape: register a user (or sign in as dev-seed), post a prayer, react to it, comment, verify the post appears in the feed and the dashboard, log out, log back in, verify state persists. Cross-device test is documented but performed manually (Playwright can't easily simulate two physical devices).

**R7 — `VITE_USE_BACKEND_MUTES=false`** in `.env.example` (line 44, verified 2026-04-30). This is the half-cutover risk per MPD-1. The flag has been false since Spec 2.5.7 shipped. **Confirmed still false at brief-write time;** the mutes flip is in scope.

**R8 — `frontend/.env.local` exists** (gitignored). Eric's local dev environment may have already-flipped values. The spec cares about `.env.example` since that's what propagates to other devs (Eric's personal laptop, future contributors). Production env vars in Railway are separate per Spec 2.5.5 D4 ("Vite env vars are baked at build time — must add both flag vars to Railway frontend service env vars for prod to actually flip").

**R9 — Cutover checklist precedent.** `_plans/forums/phase01-cutover-checklist.md`, `_plans/forums/phase02-cutover-checklist.md`, `_plans/forums/phase02-5-cutover-checklist.md` all exist (verified 2026-04-30). Format: numbered list of pre-flip verifications, the flip itself, post-flip smoke tests, rollback procedure. Spec 3.12 produces `phase03-cutover-checklist.md` matching that format.

**R10 — `CLAUDE.md` "Foundation" section** at line ~78 mentions "Authentication (real JWT — Spring Security + BCrypt — shipped in Forums Wave Phase 1 Specs 1.4 + 1.5 + 1.9..." and the "Reactive Store Pattern" decision at line ~80 mentions `usePrayerReactions` as a Pattern A hook. Both should remain. The CLAUDE.md update for this spec adds Phase 3 to the Foundation paragraph: "...Prayer Wall (real backend — shipped in Forums Wave Phase 3 Specs 3.1–3.12)." Recon at plan time for the exact wording precedent (Phase 2 cutover shipped a similar sentence).

**R11 — Universal Rule 17 axe-core scan.** Master plan AC item: "axe-core automated scan on routes /prayer-wall, /prayer-wall/:id, /prayer-wall/dashboard, /prayer-wall/user/:id; zero new violations." The Spec 1.10 Playwright test runs `runAxeScan` on each authenticated route via `import { runAxeScan } from './fixtures'`. Spec 3.12's Playwright test mirrors this, running scans on the four Prayer Wall routes after authenticated content renders. Per master plan AC item 8: evidence committed to `_cutover-evidence/phase3-a11y-smoke.json` (axe-core report) plus a brief markdown note recording keyboard and VoiceOver outcomes.

**R12 — `useAuthModal`, `useToast`, `useAuth`** patterns are shipped. The page consumer rewires use these hooks for error handling, mirroring the Spec 3.10 mapping in `apiErrors.ts` (`mapApiErrorToToast`, `AnonymousWriteAttemptError → openAuthModal`).

**R13 — Pagination.** `prayer-wall-api.listPosts` returns `PostListResult` with `pagination: { page, limit, total, hasMore }`. Current `PrayerWall.tsx` paginates client-side via `allPrayers.slice(0, PRAYERS_PER_PAGE)` with a `Show more` button incrementing the slice. Backend pagination is server-side: each "Show more" issues a new API call with `page=N+1`. Page consumer rewire converts the slice-based pagination to an additive-fetch model — see D5.

**R14 — Loading states.** Today the page renders prayers immediately because `getMockPrayers()` is synchronous. With backend, the page must show a loading state during the initial fetch. `frontend/src/components/skeletons/` has skeleton primitives — verified 2026-04-30: a page-level `PrayerWallSkeleton.tsx` exists; **no per-card skeleton is currently shipped.** The skeleton primitives `SkeletonBlock`, `SkeletonCard`, `SkeletonText`, `SkeletonCircle` and `index.ts` exports are available for composing a card-shaped skeleton if needed. Plan-time recon should confirm whether to (a) reuse `PrayerWallSkeleton` page-shell or (b) compose 3-5 stacked card skeletons via the primitives. See D6.

**R15 — Error states.** A page-level fetch failure needs a friendly error UI. Existing pattern: `FeatureEmptyState` with retry button. Apply to the listPosts fetch failure case.

**R16 — Empty states.** Pre-existing empty states (no prayers in category, no friends-only posts) are written for the synchronous mock-data branch. They continue to work for the API branch — `prayerWallApi.listPosts` returning `posts: []` triggers the same empty-state render.

**R17 — `OfflineNotice` component** at `frontend/src/components/pwa/OfflineNotice.tsx` is the canonical offline indicator. Per Spec 3.10 D7, when the network is down and read cache misses, page consumers should fall through to `OfflineNotice` rendering. Recon at plan time to confirm the offline-detection hook (`useOnlineStatus`) is wired to this UX flow.

**R18 — `dev-seed` user has the email `dev@worshiproom.com`** with password `WorshipRoomDev2026!` (Spec 1.8, public per `phase01-auth-roundtrip.spec.ts:13-15`). This user is reused for the Phase 3 cutover Playwright test.

## Phase 3 Execution Reality Addendum gates — applicability

| #  | Convention                                       | Applies to 3.12?                                                                                                                                                                                                                                                                          |
| -- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1  | EditWindowExpired returns 409                    | **APPLIES** — Playwright test verifies the 409 path: edit a post, wait 5+ min via clock fixture (or skip), attempt edit → expect 409 toast                                                                                                                                                |
| 2  | L1-cache trap                                    | N/A — frontend                                                                                                                                                                                                                                                                            |
| 3  | `@Modifying` flags                               | N/A — frontend                                                                                                                                                                                                                                                                            |
| 4  | SecurityConfig method-specific rule ordering     | N/A — backend already shipped per Spec 3.5/3.6/3.7/3.8                                                                                                                                                                                                                                    |
| 5  | Caffeine-bounded bucket pattern                  | N/A — frontend                                                                                                                                                                                                                                                                            |
| 6  | Domain-scoped `@RestControllerAdvice`            | N/A — frontend                                                                                                                                                                                                                                                                            |
| 7  | `CrisisAlertService` unified entry               | **APPLIES** — Playwright test should verify a crisis-flagged post is filtered from feed (recon at plan time: is there a way to seed a crisis-flagged post via dev-only endpoint? If not, the test verifies the negative case via mock-only and documents the gap)                         |
| 8  | Schema realities — do NOT recreate               | N/A — no schema changes                                                                                                                                                                                                                                                                    |
| 9  | INTERCESSION ActivityType                        | N/A                                                                                                                                                                                                                                                                                       |
| 10 | `wr_prayer_reactions` shape                      | **APPLIES** — Playwright test verifies the localStorage shape after hydration (Phase 3 Addendum #10)                                                                                                                                                                                       |
| 11 | Liquibase filename convention                    | N/A                                                                                                                                                                                                                                                                                       |
| 12 | BB-45 cross-mount subscription test              | **APPLIES INDIRECTLY** — Spec 3.11 added the explicit test; 3.12 verifies it still passes after consumer rewires                                                                                                                                                                          |

## Decisions and divergences (12 items)

**D1 — Two flag flips: Prayer Wall + Mutes.**

```diff
# In frontend/.env.example:
- VITE_USE_BACKEND_PRAYER_WALL=false
+ VITE_USE_BACKEND_PRAYER_WALL=true

- VITE_USE_BACKEND_MUTES=false
+ VITE_USE_BACKEND_MUTES=true
```

Comments updated to reflect the cutover date and source spec (3.12). Mutes comment notes "activated by Spec 3.12 cutover after a smoke test confirmed mute → backend row appears via psql; unmute → row deleted." Prayer Wall comment notes "activated by Spec 3.12 cutover; read-swap means localStorage is no longer written for Prayer Wall data."

**Confirmed at brief-write time:** both flags remain `false` in `.env.example`; both flips are in scope.

**D2 — Page consumer rewires (the heart of the spec).**

Three pages get the same shape of edit:

```typescript
// PATTERN — applies to PrayerWall.tsx, PrayerWallDashboard.tsx, PrayerDetail.tsx

// Add at top of file:
import { isBackendPrayerWallEnabled } from '@/lib/env'
import * as prayerWallApi from '@/services/api/prayer-wall-api'

// Replace synchronous mock reads with branched fetch:
const [prayers, setPrayers] = useState<PrayerRequest[] | null>(null)
const [isLoading, setIsLoading] = useState(true)
const [fetchError, setFetchError] = useState<Error | null>(null)

useEffect(() => {
  let cancelled = false

  async function loadPrayers() {
    setIsLoading(true)
    setFetchError(null)

    if (!isBackendPrayerWallEnabled()) {
      // Flag off: synchronous mock path — preserve existing behavior
      const allPrayers = getMockPrayers()
      if (!cancelled) {
        setPrayers(allPrayers.slice(0, PRAYERS_PER_PAGE))
        setIsLoading(false)
      }
      return
    }

    try {
      const result = await prayerWallApi.listPosts({
        page: 1,
        limit: PRAYERS_PER_PAGE,
        category: selectedCategory || undefined,
        // ... other params from existing UI state ...
      })
      if (!cancelled) {
        setPrayers(result.posts)
        setHasMore(result.pagination.hasMore)
        setIsLoading(false)
      }
    } catch (err) {
      if (!cancelled && err instanceof Error) {
        setFetchError(err)
        setIsLoading(false)
      }
    }
  }

  loadPrayers()
  return () => { cancelled = true }
}, [selectedCategory, /* other dependencies */])
```

Replicate for `PrayerWallDashboard.tsx` (5 tabs each fetch from a different endpoint) and `PrayerDetail.tsx` (single-post fetch).

**D3 — Comment fetching: lazy.**

Today, `PrayerWall.tsx` shows comment counts inline on each prayer card via `getMockComments(prayerId).length`. With backend, fetching all comments for all visible prayers is wasteful. Resolution:

- **Comment count comes from the post DTO itself** — backend `PostDto` includes a `commentCount` field (recon to confirm at plan time; if absent, fall back to lazy-on-expand)
- **Full comment list fetches on Comments-section-expand** — when the user clicks the comments toggle on a prayer card, the page fires `prayerWallApi.listComments(prayerId, {page: 1, limit: 50})`. Cache the result so re-expanding doesn't re-fetch.

Per Spec 3.10's `commentCount` field on the mapper output, this should be straightforward.

**D4 — Write paths: post creation, edit, delete, comment creation.**

The `InlineComposer` (post creation), `CommentsSection` (comment creation), and edit/delete UIs all need rewires. Pattern:

```typescript
// In InlineComposer.tsx — was:
function handleSubmit(content) {
  const newPrayer = { id: crypto.randomUUID(), userId: user.id, content, /* ... */ }
  setPrayers((prev) => [newPrayer, ...prev])  // optimistic local-only
  // ... mock-data update ...
}

// Becomes:
async function handleSubmit(content) {
  if (!isBackendPrayerWallEnabled()) {
    // Flag-off: existing local-only path
    const newPrayer = { id: crypto.randomUUID(), userId: user.id, content, /* ... */ }
    setPrayers((prev) => [newPrayer, ...prev])
    return
  }

  setIsSubmitting(true)
  try {
    const idempotencyKey = crypto.randomUUID()
    const created = await prayerWallApi.createPost({
      content,
      postType: 'prayer_request',
      category: selectedCategory,
      // ... other fields ...
    }, idempotencyKey)
    onPostCreated(created)  // parent prepends to feed
  } catch (err) {
    if (err instanceof AnonymousWriteAttemptError) {
      openAuthModal()
    } else if (err instanceof ApiError) {
      const toast = mapApiErrorToToast(err)
      showToast(toast.message)
    }
  } finally {
    setIsSubmitting(false)
  }
}
```

Same shape for comment creation, post edit, post delete, comment edit, comment delete.

**D5 — Pagination model: server-side, additive.**

Current "Show more" button increments a slice index. With backend, "Show more" issues `prayerWallApi.listPosts({page: nextPage, limit: 20})` and APPENDS the result to the existing list. State machine:

- `page: number` — current loaded page (starts at 1)
- `posts: PrayerRequest[]` — accumulated posts
- `hasMore: boolean` — from the API response's `pagination.hasMore`
- `isLoadingMore: boolean` — loading state for the additive fetch

When `hasMore` is false, hide the Show more button. Mirrors the existing UX, just sourced from the API's `hasMore` field instead of the slice math. **No new "page X of Y" UI** — the additive-fetch model preserves the current single "Show more" affordance.

**D6 — Loading and error UI for initial fetch.**

While the initial `listPosts` is in-flight, render a loading state. Options:

- (a) Render `FeatureEmptyState` with "Loading prayers..." text
- (b) Render skeleton cards (3-5 placeholder PrayerCard skeletons)
- (c) Render the existing layout but with a spinner where prayer cards would go

**Recommend (b)** composed from the existing `SkeletonCard` / `SkeletonBlock` / `SkeletonText` primitives in `frontend/src/components/skeletons/`. A per-card skeleton component does not currently exist (verified 2026-04-30); plan-time recon decides whether to (1) reuse the existing page-level `PrayerWallSkeleton.tsx` for initial load, or (2) compose 3-5 stacked card skeletons inline. If neither is convenient, fall back to (a) — simpler, matches existing FeatureEmptyState aesthetic.

For initial-fetch failures: render `FeatureEmptyState` with brand-voice copy plus a retry button that re-runs the fetch. The retry-toast copy lives in `apiErrors.ts` per W14 — do NOT introduce a new copy string at the page layer.

**D7 — Cutover Playwright test (`phase03-prayer-wall-roundtrip.spec.ts`).**

Mirrors `phase01-auth-roundtrip.spec.ts` shape. Scenarios:

1. **Sign in as dev-seed user.** Backend already has dev-seed user; sign in via AuthModal.
2. **Post a prayer.** Open `/prayer-wall`, click InlineComposer, fill content, submit. Verify the post appears at the top of the feed.
3. **React to a prayer.** Click Pray icon on a prayer; verify icon flips to active state. Reload page; verify state persists (backend hydration).
4. **Bookmark a prayer.** Click bookmark; verify icon flips. Navigate to dashboard's Bookmarks tab; verify the prayer appears.
5. **Comment on a prayer.** Click prayer to open detail page; submit a comment; verify comment appears in the thread.
6. **Reload, verify persistence.** Reload all the above states; nothing should regress.
7. **Sign out, sign back in.** Same state should persist across sessions (backend is source of truth).
8. **Axe-core scan on 4 routes.** `/prayer-wall`, `/prayer-wall/:id`, `/prayer-wall/dashboard`, `/prayer-wall/user/:id`. Zero new violations. Evidence committed to `_cutover-evidence/phase3-a11y-smoke.json`.
9. **Rate-limit verification.** Submit 11 prayers rapidly (the `posts.rate-limit.max-per-hour` is 10 per Spec 3.5); verify the 11th gets a 429 toast.
10. **Crisis-flagged content filtering.** Documented as a manual verification step IF no dev-only API exists to flag a post (recon at plan time).

Two-mode: local-dev default; prod-mode via `PLAYWRIGHT_BASE_URL` env var.

**D8 — Manual cross-device smoke test (Eric's responsibility).**

Documented in the cutover checklist. Steps:

1. On laptop: log in, post a prayer "Cross-device test from laptop $(timestamp)"
2. On phone: log in (same account), refresh `/prayer-wall`, verify the post appears
3. On phone: tap Pray on the post, verify icon flips
4. On laptop: refresh, verify Pray state persists
5. On phone: comment on the post
6. On laptop: refresh, verify comment appears

**D9 — Cutover checklist file at `_plans/forums/phase03-cutover-checklist.md`.**

Format mirrors `phase01-cutover-checklist.md` and `phase02-5-cutover-checklist.md`:

1. Pre-flip verifications (manual + automated)
2. The flip itself (the two `.env.example` edits)
3. Backend smoke verifications (psql queries)
4. Frontend smoke verifications (Playwright + manual cross-device)
5. Rollback procedure (revert flag flip; restart frontend dev server)
6. Production deployment notes (Railway env vars must also be set)
7. Sign-off checkbox: "Phase 3 complete — Prayer Wall is now backend-real"

Each section has explicit checkboxes. The checklist is a living artifact of the cutover event.

**D10 — CLAUDE.md update.**

Add Phase 3 to the Foundation paragraph. Today (line ~78):

> Authentication (real JWT — Spring Security + BCrypt — shipped in Forums Wave Phase 1 Specs 1.4 + 1.5 + 1.9; legacy `wr_auth_simulated` mock kept for transitional test seeding), React Router, Landing Page, Dashboard with visual garden, ...

Becomes:

> Authentication (real JWT — Spring Security + BCrypt — shipped in Forums Wave Phase 1 Specs 1.4 + 1.5 + 1.9; legacy `wr_auth_simulated` mock kept for transitional test seeding), **Prayer Wall (real backend — shipped in Forums Wave Phase 3 Specs 3.1–3.12; localStorage seed data preserved for tests via flag-off branch)**, React Router, Landing Page, Dashboard with visual garden, ...

Recon at plan time for the exact insertion point and any phrasing precedent from the Phase 2 cutover.

**D11 — Mock data NOT removed.**

Per MPD-3, `frontend/src/mocks/prayer-wall-mock-data.ts` stays. The flag-off branch in each consumer continues to call `getMockPrayers()`, `getMockComments()`, `getMockAllComments()`. Tests continue to mock these. The followup file gets an entry: "Spec X.Y: deprecate `prayer-wall-mock-data.ts` and migrate component tests to MSW — when test discipline allows."

**D12 — Test count target ~12 tests + 1 Playwright suite.**

Master plan AC says ≥1 Playwright test passes end-to-end. Brief argues:

- ~12 vitest tests covering the new branched-consumer behavior in the three pages (flag-on path, flag-off path, error path, loading path for each)
- 1 Playwright suite (10 scenarios per D7) covering the full cutover smoke

The vitest tests exercise the consumer-rewire decision tree; the Playwright test exercises the full HTTP path against a real backend.

## Watch-fors (18 items)

1. **`isBackendPrayerWallEnabled()` is checked at every page-data-fetch entry point.** Don't cache the result at module load — always read fresh. Hot-reload during dev would otherwise leave stale flag state.

2. **Consumer rewires preserve flag-off behavior verbatim.** Every existing test that uses `getMockPrayers` mocks must continue to pass. The flag-off branch is not aspirational — it's the regression contract.

3. **Initial fetch failure does NOT show a blank page.** Render `FeatureEmptyState` with retry, not `null`. Users on flaky networks must see a recovery path.

4. **`AnonymousWriteAttemptError` → `openAuthModal`** in every write-path catch block. Mirrors Spec 3.10 D8 and 3.11 toggle handlers. Don't toast for this case.

5. **Idempotency-Key on post creation.** Generate `crypto.randomUUID()` per submit attempt. If the user retries the SAME content (e.g., network blip), reuse the key (deduplicates on backend per Spec 3.5). Generate a NEW key only if they edited the content.

6. **Pagination state lives at page level, not component.** The `page`/`hasMore`/`isLoadingMore` state is in the page component, not in a child. The "Show more" button is an event up to the page.

7. **Dashboard tabs each have independent fetch state.** The Prayers tab fetches from `listAuthorPosts(myUsername)`; the Bookmarks tab from `listMyBookmarks`; the Reactions tab from `getMyReactions`. Each tab has its own `isLoading`/`error`/`data` triplet. Don't share state across tabs.

8. **PrayerDetail.tsx 404 handling.** If `getPostById(id)` returns 404, render the existing "Post not found" UI. Don't crash. Apply the existing error-handling shape.

9. **Comment fetch caching.** When user expands comments on a prayer, fetch once; don't re-fetch on collapse-and-re-expand. Cache by `prayerId` in a `Map<string, PrayerComment[]>`. Invalidate when a new comment is created.

10. **Cross-tab consistency NOT in scope.** If user has two tabs open and posts in tab A, tab B doesn't auto-update. Spec 3.10 noted this as an out-of-scope followup. 3.12 inherits the limitation. Document in the cutover checklist.

11. **Empty-feed UX.** When `listPosts` returns `posts: []` (no prayers in selected category), the existing `FeatureEmptyState` continues to work. Do NOT add a backend-specific empty UI.

12. **Loading state respects initial-vs-additive.** First fetch on page load → page-level loading skeleton. "Show more" → button-level spinner, existing posts stay rendered.

13. **`useOnlineStatus` integration.** When `useOnlineStatus()` reports offline, the page should render `OfflineNotice` instead of fetching. Skip the fetch entirely; show cached state from a previous successful fetch (from the prayer-wall-api module-lifetime cache).

14. **Toast taxonomy from Spec 3.10's `mapApiErrorToToast`.** Every write-path error catches `ApiError`, calls the mapper, displays via `showToast(message)`. NO custom toast strings in the page consumers — all copy lives in `apiErrors.ts`.

15. **Universal Rule 17 axe-core run is part of the Playwright test, not a separate manual step.** Built into the suite via `runAxeScan(page)` calls after each authenticated route renders.

16. **The cutover checklist is NOT gitignored.** It's a real artifact at `_plans/forums/phase03-cutover-checklist.md` that gets committed. Eric checks off items as they complete; the file is the historical record.

17. **`.env.example` change does NOT auto-propagate to running dev servers.** Eric must manually update his `.env.local` (or set the var in shell) and restart Vite for the flag to take effect locally. Document in the checklist.

18. **Production Railway deployment requires manual env var add.** `.env.example` is for code-shipped defaults; Railway has its own env-var configuration. The checklist explicitly says: "Add `VITE_USE_BACKEND_PRAYER_WALL=true` and `VITE_USE_BACKEND_MUTES=true` to Railway frontend service env vars before promoting." Without this, prod stays on the old default.

## Test specifications (target ~12 vitest tests + 1 Playwright suite)

**Page consumer rewire tests (~12):**

`PrayerWall.test.tsx` extensions (~5):

- Flag-off: page calls `getMockPrayers`, no API call, regression check
- Flag-on success: page calls `prayerWallApi.listPosts`, renders returned posts
- Flag-on error: page calls `prayerWallApi.listPosts`, error → FeatureEmptyState with retry
- Flag-on loading: skeleton renders during initial fetch
- Flag-on pagination: "Show more" calls `listPosts({page: 2})`, appends to existing posts

`PrayerDetail.test.tsx` extensions (~3):

- Flag-off: page reads from `getMockPrayers`
- Flag-on success: page calls `getPostById(id)`
- Flag-on 404: renders "Post not found"

`PrayerWallDashboard.test.tsx` extensions (~4):

- Prayers tab: flag-on calls `listAuthorPosts(myUsername)`
- Bookmarks tab: flag-on calls `listMyBookmarks`
- Reactions tab: flag-on calls `getMyReactions` (note: backend gap per Spec 3.10 watch-for #21; tab may render N/A in flag-on mode for now)
- Comments tab: flag-on N/A — backend endpoint doesn't exist (per Spec 3.10 watch-for #20)

**Playwright suite — `frontend/e2e/phase03-prayer-wall-roundtrip.spec.ts` (~10 scenarios per D7):**

- Sign in as dev-seed
- Post a prayer
- React to a prayer
- Bookmark a prayer
- Comment on a prayer
- Reload — verify persistence
- Sign out / sign in — verify cross-session persistence
- Axe-core scan on 4 routes — zero new violations
- Rate-limit verification (post 11 prayers rapidly → 11th 429s)
- Crisis-flag filtering (manual or via mock based on backend dev-tooling availability)

## Files to create

- `frontend/e2e/phase03-prayer-wall-roundtrip.spec.ts`
- `_plans/forums/phase03-cutover-checklist.md`

## Files to modify

- `frontend/.env.example` — 2 flag flips
- `frontend/src/pages/PrayerWall.tsx` — consumer rewire per D2/D3/D5
- `frontend/src/pages/PrayerDetail.tsx` — consumer rewire (single-post fetch)
- `frontend/src/pages/PrayerWallDashboard.tsx` — consumer rewire (5 tabs)
- `frontend/src/components/prayer-wall/InlineComposer.tsx` — write-path rewire per D4
- `frontend/src/components/prayer-wall/CommentsSection.tsx` — comment-write rewire per D4
- `frontend/src/components/prayer-wall/QotdComposer.tsx` — QOTD-tagged post creation rewire
- `frontend/src/components/prayer-wall/SaveToPrayersForm.tsx` — bookmark write rewire (if not already through reactionsStore)
- `frontend/src/pages/__tests__/PrayerWall.test.tsx` — add flag-on/error/loading tests
- `frontend/src/pages/__tests__/PrayerDetail.test.tsx` — add flag-on tests
- `frontend/src/pages/__tests__/PrayerWallDashboard.test.tsx` — add flag-on tab tests
- `CLAUDE.md` — Foundation paragraph update per D10

## Files explicitly NOT modified

- `frontend/src/mocks/prayer-wall-mock-data.ts` — preserved per MPD-3 (tests still mock from here)
- `frontend/src/services/api/prayer-wall-api.ts` — shipped in Spec 3.10
- `frontend/src/lib/prayer-wall/postMappers.ts` — shipped in Spec 3.10
- `frontend/src/lib/prayer-wall/reactionsStore.ts` — backend hydration shipped in Spec 3.11
- `frontend/src/hooks/usePrayerReactions.ts` — shipped in Spec 3.11 (no consumer rewire needed)
- `frontend/src/lib/env.ts` — `isBackendPrayerWallEnabled()` shipped in Spec 3.10
- `frontend/src/components/prayer-wall/InteractionBar.tsx` — consumes `usePrayerReactions` which already has backend wiring; no changes needed
- Any backend file — pure frontend cutover
- Any new component creation — page rewires use existing skeletons/empty-states/toasts
- Any test fixture creation — Playwright test reuses `phase01` fixtures (`DEV_SEED_EMAIL`, `seedSkipDashboardGates`, `runAxeScan`)

## Acceptance criteria

Master plan body's 8 AC items + brief additions:

- [ ] `VITE_USE_BACKEND_PRAYER_WALL=true` in `.env.example`
- [ ] `VITE_USE_BACKEND_MUTES=true` in `.env.example` (if not already; recon at plan time)
- [ ] All three Prayer Wall page components branch on `isBackendPrayerWallEnabled()` for data fetching
- [ ] All Prayer Wall write components (InlineComposer, CommentsSection, QotdComposer, SaveToPrayersForm if applicable) branch on `isBackendPrayerWallEnabled()` for writes
- [ ] Flag-off path preserves existing mock-data behavior verbatim (regression check)
- [ ] Flag-on initial fetch shows loading state (skeleton or FeatureEmptyState-loading)
- [ ] Flag-on fetch failure shows FeatureEmptyState with retry button
- [ ] Flag-on pagination uses backend `pagination.hasMore` for Show more visibility
- [ ] All write-path errors run through `mapApiErrorToToast` from Spec 3.10 (no custom strings)
- [ ] `AnonymousWriteAttemptError` opens AuthModal in every write path (no toast)
- [ ] `frontend/e2e/phase03-prayer-wall-roundtrip.spec.ts` exists with 10 scenarios per D7
- [ ] Playwright test passes against local backend (`localhost:8080`)
- [ ] Axe-core scan on 4 Prayer Wall routes shows zero new violations (Universal Rule 17)
- [ ] Axe-core evidence committed to `_cutover-evidence/phase3-a11y-smoke.json` plus a brief markdown note on keyboard and VoiceOver outcomes (master plan AC item 8)
- [ ] `_plans/forums/phase03-cutover-checklist.md` exists, mirrors phase02-5 format
- [ ] Cross-device manual smoke test documented in checklist; Eric performs and signs off
- [ ] Reactions persist across devices (master plan AC)
- [ ] Comments persist across devices (master plan AC)
- [ ] Bookmarks persist across devices (master plan AC)
- [ ] CLAUDE.md Foundation paragraph updated to mention Phase 3 cutover
- [ ] At least 12 new vitest tests cover the consumer-rewire decision tree
- [ ] All new toast strings (if any beyond `apiErrors.ts`) pass pastor's-wife test
- [ ] Followup entry: deprecate `prayer-wall-mock-data.ts` after test migration to MSW (filed in `_plans/post-1.10-followups.md`)

## Out of scope (deferred to other specs)

- Removal of `prayer-wall-mock-data.ts` (followup; test migration first)
- Cross-tab synchronization via storage events (Spec 16.x territory)
- Offline write queue (Spec 16.2)
- IndexedDB read cache (Spec 16.1b)
- "My comments" dashboard tab backend endpoint (gap noted in Spec 3.10 watch-for #20)
- "My reacted-posts" paginated endpoint for the Reactions dashboard tab (Spec 3.10 watch-for #21)
- Threaded comment replies (Phase 4.4)
- Real-time presence indicators (Phase 6.11b)
- Phase 4 Post Type Foundation (next phase, separate spec)

## Brand voice / Universal Rules quick reference (3.12-relevant)

- Rule 6: All new code has tests; the Playwright test is part of this
- Rule 11: Brand voice — no new toast strings (all copy comes from `apiErrors.ts` via `mapApiErrorToToast`)
- Rule 12: Anti-pressure copy — preserved from Spec 3.10's toast taxonomy
- Rule 16: Respect existing patterns — Spec 1.10 / 2.5.5 cutover-spec shape, `phase01-auth-roundtrip.spec.ts` Playwright shape, cutover-checklist format
- Rule 17: Per-phase accessibility smoke test — axe-core on 4 Prayer Wall routes is part of the Playwright test; evidence to `_cutover-evidence/phase3-a11y-smoke.json`

## Tier rationale

xHigh, not MAX. The dimensions:

1. **No novel patterns** — Spec 1.10 and 2.5.5 established the cutover-spec shape. Spec 3.10 established the consumer-rewire pattern (the api module + flag-gate at call site). 3.12 applies these patterns to the Prayer Wall pages.
2. **No cross-author leakage surface** — the mapper (Spec 3.10) is the load-bearing artifact; 3.12 just consumes its output via the api module.
3. **No privilege escalation surface** — auth gating is server-side and shipped (Spec 3.5/3.6/3.7/3.8 SecurityConfig rules); frontend AnonymousWriteAttemptError is a UX nicety.
4. **High visibility on bugs** — a misfire here turns the Prayer Wall blank or shows mock data overlaid with backend reactions. But the failure modes are recoverable: the rollback procedure (revert env flag) works in seconds. No data loss, no security breach.
5. **The brief carries 18 watch-fors + 12-test target + 12 explicit decisions** — structured reasoning sufficient for xHigh thinking.

MAX would be over-spending. The cutover spec is high-stakes-but-pattern-applied; comprehensive briefing handles the stakes, MAX-tier reasoning isn't needed.

## Recommended planner instruction

When invoking `/plan-forums spec-3-12`, run the Plan Tightening Audit with extra scrutiny on:

- Lens 4 (consumer rewire completeness) — verify all three pages AND all four write components are listed; recon may surface additional consumers
- Lens 7 (Pattern A clarification per Phase 3 Addendum #12) — `usePrayerReactions` consumers should NOT need rewires (the hook's return shape is unchanged per Spec 3.11 D2)
- Lens 9 (toast copy) — verify NO new toast strings are introduced; all error UX flows through `mapApiErrorToToast`
- Lens 14 (D5 pagination model) — verify the additive-fetch state machine matches the existing UX (no new "page X of Y" UI)
- Lens 17 (D7 Playwright scenarios) — verify all 10 scenarios are in the test file, not deferred
- Lens 18 (D9 cutover checklist) — verify the checklist file exists and mirrors `phase02-5-cutover-checklist.md` structure

---

## Master plan body (Spec 3.12 — for traceability)

> ### Spec 3.12 — Phase 3 Cutover
>
> - **ID:** `round3-phase03-spec12-phase3-cutover`
> - **Size:** M
> - **Risk:** High
> - **Prerequisites:** 3.11
> - **Goal:** Flip `VITE_USE_BACKEND_PRAYER_WALL` to `true`. End-to-end Playwright test of Prayer Wall against the backend. Cross-device sync verification.
>
> **Approach:** Default the flag on. Playwright test: register a user, post a prayer, react to it, comment on it, bookmark it, navigate to the dashboard, verify everything is present, log out, log back in, verify everything still present. Manual cross-device test: post on Eric's laptop, refresh on his phone, verify the post is there. Update CLAUDE.md and `_plans/forums-wave/phase03-cutover-checklist.md`.
>
> **Acceptance criteria:**
>
> - [ ] Flag default `true` in `.env.example` and Vite config
> - [ ] Playwright test passes end-to-end
> - [ ] Cross-device manual test passes (post on laptop → see on phone)
> - [ ] Reactions persist across devices
> - [ ] Comments persist across devices
> - [ ] Bookmarks persist across devices
> - [ ] CLAUDE.md updated
> - [ ] Cutover checklist completed
> - [ ] Universal Rule 17 per-phase accessibility smoke test passes: axe-core automated scan on routes and components introduced or modified in this phase returns zero CRITICAL violations; keyboard-only navigation walkthrough of this phase's primary user flows completes without dead-ends; VoiceOver spot-check on the 2-3 most complex interactions introduced in this phase completes without blocking issues; evidence committed to `_cutover-evidence/phase3-a11y-smoke.json` (axe-core report) plus a brief markdown note recording keyboard and VoiceOver outcomes
>
> **Out-of-band notes for Eric:** This is the moment Prayer Wall becomes a real social product. Every action you take now lives on a server and syncs across devices. The next phases (post type expansion, hero features, integrations) build on this foundation but the foundation itself is now stable.

**Reconciliation note:** the master plan body's path `_plans/forums-wave/phase03-cutover-checklist.md` is at-rest text from earlier wave naming; the actual on-disk path used by Specs 1.10 and 2.5.5 is `_plans/forums/`. This spec writes to `_plans/forums/phase03-cutover-checklist.md` to match the shipped pattern. See R9.
