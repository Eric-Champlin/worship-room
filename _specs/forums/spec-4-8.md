# Forums Wave: Spec 4.8 — Room Selector and Phase 4 Cutover

**Master Plan Reference:** `_forums_master_plan/round3-master-plan.md` → Spec 4.8 (lines ~4522–4557)
**Source Brief:** `_plans/forums/spec-4-8-brief.md` (authored 2026-05-09 — **brief is binding; brief wins over master plan body where they diverge**)
**Branch:** `forums-wave-continued` (long-lived working branch — Eric handles all git operations manually; CC must NOT run any git mutations)
**Date:** 2026-05-10

---

## Affected Frontend Routes

- `/prayer-wall`
- `/prayer-wall?postType=testimony`
- `/prayer-wall?postType=encouragement&category=mental-health`
- `/prayer-wall?category=health`
- `/prayer-wall?postType=testimony&category=health`

(All visual scenarios target `/prayer-wall` with various combinations of `?postType=` and `?category=` query params. No new routes are added; existing route gains URL state for postType filtering.)

---

## Metadata

- **ID:** `round3-phase04-spec08-room-selector-cutover`
- **Phase:** 4 (Forums Wave — final spec; this is the Phase 4 Cutover)
- **Size:** L
- **Risk:** Medium
- **Tier:** High (per brief Section 2 — layout reorder + dual-filter URL state + sticky behavior + cutover deliverables make this above Standard)
- **Prerequisites:** Master plan body lists 4.7 only, but **brief is binding**: ALL of Phase 4 (4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.6b, 4.7, 4.7b) must be ✅ in `spec-tracker.md`. 4.8 is the Phase 4 cutover — anything still in flight delays the cutover. Per `spec-tracker.md` 2026-05-10, **4.7b is still ⬜**; verify before executing the plan.

---

## Goal

Ship two coupled deliverables:

1. **RoomSelector feature.** A new top-level filter component on `/prayer-wall` that filters the feed by `postType`. Six pills in canonical order: All, Prayer Requests, Testimonies, Questions, Discussions, Encouragements. URL state via `?postType=` independent of `?category=`. Layout reorder: QOTD card moves above the sticky filter block; the new RoomSelector nests inside the sticky filter block above the existing CategoryFilterBar.

2. **Phase 4 cutover deliverables.**
   - `_plans/forums/phase04-cutover-checklist.md` — real document, not stub. Lists every Phase 4 spec (4.1–4.8) with merge dates, feature flag state, post-Phase-4 production state, open follow-ups for Phase 5 awareness, axe-core test status.
   - **Universal Rule 17 axe-core accessibility smoke test** — automated `@axe-core/playwright` scan on three routes returns zero violations. Test integrated into CI Playwright run. No `test.skip` / `test.only`.

After 4.8 ships and the cutover checklist is filled in, **Phase 4 is COMPLETE** and Phase 5 (Prayer Wall Visual Migration) is unblocked.

---

## Approach

**4.8 is purely frontend** (recon confirmed `PostSpecifications.byPostType()` exists at `backend/src/main/java/com/worshiproom/post/PostSpecifications.java:129` and `PostController.list()` already accepts `?postType=` query param at line 83 — backend filter is wired through; no backend changes needed).

### RoomSelector component

- New file: `frontend/src/components/prayer-wall/RoomSelector.tsx`
- Mirror `CategoryFilterBar.tsx`'s pattern (pill markup, ARIA, responsive behavior, keyboard nav). The plan recon reads `CategoryFilterBar.tsx` and copies the pill shape — do not deviate.
- 6 pills built from `POST_TYPES` (`frontend/src/constants/post-types.ts`) using `pluralLabel`, plus a hardcoded 'All' pill at index 0:
  ```tsx
  const rooms = [
    { id: null, label: 'All', accentClass: '' },
    ...POST_TYPES.map(t => ({ id: t.id, label: t.pluralLabel, accentClass: getAccentClassForPostType(t.id) })),
  ]
  ```
- Per-type accent colors on pills mirror PrayerCard chrome (rose / amber / cyan / violet / white). Plan recon adjusts color values to existing PrayerCard conventions (per brief D3).
- Each pill: `<button>` with `aria-selected={isActive}`, min-h/min-w 44px, focus-visible, no counts (per D7 — no count plumbing).
- Container: `role='tablist'` (or matching CategoryFilterBar's pattern — verify R3) with `aria-label='Filter by post type'`.
- No counts shown on pills in 4.8 (D7).

### URL state — `?postType=` independent of `?category=`

```typescript
const handleSelectPostType = (postType: PostType | null) => {
  setSearchParams(prev => {
    if (postType === null) {
      prev.delete('postType')
    } else {
      prev.set('postType', postType)
    }
    return prev
  })
}
```

**Both filters are independent:**
- Selecting a room sets `?postType=<value>`; does NOT touch `?category=`.
- Selecting a category sets `?category=<value>`; does NOT touch `?postType=`.
- Both can be active simultaneously. (D4 / W3 — never make them mutually exclusive.)

**'All' pill = absent param**, NOT explicit `?postType=all` (D6 — matches existing `?category=` convention, cleaner URLs).

**Defensive handling for invalid `?postType=` values** (W5): default to 'All' active, do NOT render an unknown pill. Validate against `POST_TYPES`.

### Layout reorder (per MPD-3 / D9 — mechanical JSX move)

**Before** (current `frontend/src/pages/PrayerWall.tsx`):
1. `PrayerWallHero`
2. Composer flow (InlineComposer / ComposerChooser entry)
3. CategoryFilterBar (sticky, lines ~791–802)
4. QOTD card (lines ~853–860)
5. Feed

**After** (4.8):
1. `PrayerWallHero`
2. Composer flow
3. **QOTD card** (moved up; was below filters)
4. **Sticky filter wrapper** containing:
   - `<RoomSelector>` (new, on top)
   - `<CategoryFilterBar>` (existing, nested below — props unchanged per W9)
5. Feed

```tsx
{/* QOTD Card — above filters, visible in any filter state */}
<div className="mb-4">
  <QuestionOfTheDay
    responseCount={qotdResponseCount}
    isComposerOpen={qotdComposerOpen}
    onToggleComposer={handleToggleQotdComposer}
    onScrollToResponses={handleScrollToQotdResponses}
  />
</div>

{/* Filter Bar — RoomSelector + CategoryFilterBar, both sticky together */}
<div
  className={cn(
    'sticky top-0 z-30 transition-shadow motion-reduce:transition-none',
    isFilterSticky && 'shadow-md'
  )}
>
  <RoomSelector
    activePostType={activePostType}
    onSelectPostType={handleSelectPostType}
  />
  <CategoryFilterBar
    activeCategory={activeCategory}
    onSelectCategory={handleSelectCategory}
    categoryCounts={categoryCounts}
    showCounts={activeCategory !== null}
  />
</div>
```

**Single sticky wrapper, not two independent stickies** (D5 / W7 — independent stickies on mobile cause overlap and scroll-jitter). Existing `isFilterSticky` observer continues to work without changes (W6 / R12 — wrapper position unchanged, just taller).

### Filter persistence in API call

Plan recon identifies the list call (likely `frontend/src/services/prayer-wall-api.ts` or a hook). Add `postType` to the filter args type and thread through to URL params. React Query queryKey includes both filters so cache stays per-(postType, category) combination (D10 / W11 — no eager pre-fetching of all 6 rooms).

### Empty-state copy adapts to filter state (D11)

- No filters: 'This space is for you' (existing copy)
- Only postType: 'No {pluralLabel} yet' (e.g., 'No Testimonies yet')
- Only category: 'No prayers in {category} yet' (existing copy)
- Both: 'No {pluralLabel} in {category} yet' (e.g., 'No Testimonies in Health yet')

`onCtaClick` continues to open the chooser (W16 — do NOT pre-select chooser based on active room per W13).

### Cutover deliverables

**`_plans/forums/phase04-cutover-checklist.md`** — generated from `spec-tracker.md` and PR/merge history. Six sections per brief Section 16 template:
1. Phase summary (one paragraph: what Phase 4 accomplished)
2. Per-spec status table (4.1–4.8 with IDs, names, status, merge date, PR/branch)
3. Feature flag state (most likely: zero new flags introduced; `?debug-post-type` shim was removed in 4.7)
4. Post-Phase-4 production state (5 distinct post types, per-type chrome, ComposerChooser, WaysToHelpPicker, image uploads, RoomSelector, dual-filter compose, etc.)
5. Open follow-ups for Phase 5 awareness (FrostedCard migration deferred to Spec 5.1, 2-line headings to Spec 5.3, animation tokens to Spec 5.4, etc.)
6. Universal Rule 17 axe-core test status (file path, routes scanned, status, CI integration)

Do NOT ship as a stub (W19).

**Universal Rule 17 axe-core test** — `@axe-core/playwright@^4.11.1` is **already in `frontend/package.json`** (recon corrects brief R8 — package is installed but no test file uses it yet). 4.8 establishes the test pattern.

- Test file location: `frontend/e2e/accessibility.spec.ts` (recon corrects brief — Playwright e2e tests live at `frontend/e2e/`, not `frontend/tests/playwright/`; verify `frontend/playwright.config.ts` `testDir` setting at plan time)
- Three test cases, one per route:
  - `/prayer-wall` (default state)
  - `/prayer-wall?postType=testimony` (filtered view)
  - `/prayer-wall?postType=encouragement&category=mental-health` (combined filter)
- Each test uses `AxeBuilder` to scan the page and asserts zero violations
- Runs in CI alongside other Playwright tests (no `test.skip` / `test.only`)

If pre-existing accessibility violations exist on these routes from earlier specs, they get fixed as part of 4.8 (W23 — the cutover gate requires the test to pass).

---

## Files to create

**Frontend:**
- `frontend/src/components/prayer-wall/RoomSelector.tsx` — new filter component
- `frontend/src/components/prayer-wall/__tests__/RoomSelector.test.tsx` — ~10 unit tests
- `frontend/e2e/room-selector.spec.ts` — ~4 Playwright E2E tests (verify the directory convention against `playwright.config.ts` at plan time)
- `frontend/e2e/accessibility.spec.ts` — ~3 axe-core smoke tests
- `frontend/src/constants/post-type-pill-accents.ts` (OPTIONAL — only if D3 implementation lifts accents to a dedicated constants file; otherwise inline in RoomSelector.tsx)

**Operational:**
- `_plans/forums/phase04-cutover-checklist.md` — Phase 4 cutover deliverable (per brief Section 16 template; **path is `_plans/forums/`, NOT `_plans/forums-wave/`** per MPD-2)

## Files to modify

**Frontend:**
- `frontend/src/pages/PrayerWall.tsx` — major:
  - Add `RoomSelector` import
  - Add `activePostType` state derived from `searchParams.get('postType')` with defensive validation against `POST_TYPES`
  - Add `handleSelectPostType` callback (independent of `handleSelectCategory`; preserves other params)
  - Move QOTD JSX block from below the filter bar to above it (D9)
  - Add `<RoomSelector>` inside the existing sticky filter wrapper, ABOVE `<CategoryFilterBar>`
  - Update list call / queryKey to include `postType` filter
  - Update empty-state heading copy to adapt to combined filters (D11)
- `frontend/src/services/prayer-wall-api.ts` (or wherever the list call lives — verify path during plan) — add `postType` to filter args type and thread through to URL params
- `frontend/src/pages/__tests__/PrayerWall.test.tsx` — add ~9 tests
- `frontend/src/components/prayer-wall/__tests__/CategoryFilterBar.test.tsx` — add 0–2 regression tests (verify props unchanged, still works when nested below RoomSelector)

**Operational:**
- `_forums_master_plan/spec-tracker.md` — Eric flips 4.8 row from ⬜ to ✅ AFTER successful merge AND cutover checklist is filled in (CC does not flip the tracker; see brief AC).

## Files NOT to modify (W2 / W9 / W13 / W16 / W21)

- `frontend/src/components/prayer-wall/CategoryFilterBar.tsx` — props and behavior unchanged (W9)
- `frontend/src/components/prayer-wall/QuestionOfTheDay.tsx` — component unchanged; only its parent wrapper position changes
- `frontend/src/components/prayer-wall/ComposerChooser.tsx` — unchanged; chooser does NOT pre-select based on active room (W13 — consumption ≠ creation context)
- `frontend/src/components/prayer-wall/InlineComposer.tsx` — unchanged
- `frontend/src/components/prayer-wall/PrayerCard.tsx` — unchanged
- `frontend/src/components/prayer-wall/InteractionBar.tsx` — unchanged
- All backend files — unchanged (recon confirmed `PostSpecifications.byPostType()` and `PostController.list()` already accept `?postType=`)

## Files to delete

(none)

---

## Database changes

**None.** Pure frontend spec; no Liquibase changesets.

---

## API changes

**None.** Backend already supports `GET /api/v1/posts?postType={enum}` via `PostController.list()` (`backend/src/main/java/com/worshiproom/post/PostController.java:83`) composed with `byPostType` Specification (`PostSpecifications.java:129`). Filter composes with existing `?category=` filter.

---

## Copy Deck

The RoomSelector pill labels are the entire visible copy. Brand voice favors plain plurals, no decoration (per brief Section 13).

| Surface | Copy |
| ------- | ---- |
| Pill 1 (anchor, no postType) | `All` |
| Pill 2 (`postType=prayer_request`) | `Prayer Requests` (from `POST_TYPES.find(t => t.id === 'prayer_request').pluralLabel`) |
| Pill 3 (`postType=testimony`) | `Testimonies` (from `pluralLabel`) |
| Pill 4 (`postType=question`) | `Questions` (from `pluralLabel`) |
| Pill 5 (`postType=discussion`) | `Discussions` (from `pluralLabel`) |
| Pill 6 (`postType=encouragement`) | `Encouragements` (from `pluralLabel`) |
| Container `aria-label` | `Filter by post type` |
| Empty: no filters | `This space is for you` (existing) |
| Empty: postType only | `No {pluralLabel} yet` (e.g., `No Testimonies yet`) |
| Empty: category only | `No prayers in {category} yet` (existing) |
| Empty: both | `No {pluralLabel} in {category} yet` (e.g., `No Testimonies in Health yet`) |

The 'All' pill is intentionally plain — single word, anchor position, no pressure. Don't expand to 'Show All' / 'Everything' / 'View All Posts'.

## Anti-Pressure Copy Checklist

- [ ] No exclamation marks on pill labels
- [ ] No urgency words ('now', 'today', 'don't miss')
- [ ] No comparison or counts ('Trending: Testimonies (47 today!)')
- [ ] No marketing voice ('✨ New room: Encouragements!')
- [ ] No instructional or pressure copy ('Pick a room!', 'Browse our Rooms!')
- [ ] No gamification ('Most active room', 'Hot in Discussions')
- [ ] No dev jargon in user-facing copy ('Filter by: Post Type' is acceptable only as ARIA; visible labels are plain plurals)
- [ ] Empty states are calm facts, not nudges ('No Testimonies yet' — no `Be the first!` CTA)

## Anti-Pressure Design Decisions

- **Selecting a room is a filter, not a context for creation.** ComposerChooser opens fresh every time and presents all 5 types — selecting 'Testimonies' room does NOT pre-select Testimony in the chooser (W13). Consumption intent ≠ creation intent.
- **Both filters are independent and additive, not exclusive.** Users may compose any combination without the system steering them (D4).
- **No counts on pills** (D7) — no implicit comparison between rooms.
- **'All' is the default and the URL is clean for it** (D6 / no `?postType=all` value) — the unfiltered state is honored as primary.

---

## Acceptance criteria

**Functional behavior — RoomSelector:**

- [ ] 6 pills render in canonical order: All, Prayer Requests, Testimonies, Questions, Discussions, Encouragements
- [ ] Each pill has correct per-type accent color (matches PrayerCard chrome)
- [ ] 'All' pill is active by default (URL has no `?postType=` param)
- [ ] Each pill meets 44x44 minimum touch target
- [ ] Active pill has clear visual distinction
- [ ] Each pill is a `<button>` with `aria-selected` reflecting state
- [ ] Tab cycles through pills
- [ ] Enter / Space activates focused pill
- [ ] Pills wrap or scroll horizontally on narrow mobile (responsive)
- [ ] Pills fit on one row on desktop

**URL state behavior:**

- [ ] Selecting a non-All room sets `?postType=<value>` in URL
- [ ] Selecting 'All' removes `?postType=` from URL
- [ ] Selecting `?postType=` does NOT affect `?category=` (independent params — D4 / W3)
- [ ] Selecting `?category=` does NOT affect `?postType=` (independent params)
- [ ] Both params can be active simultaneously: `?postType=X&category=Y`
- [ ] Initial render reads `?postType=` from URL and activates correct pill
- [ ] Invalid `?postType=` value defaults to 'All' active (defensive — W5)
- [ ] Browser back / forward restores filter state correctly (W10)

**Layout:**

- [ ] QOTD card renders ABOVE the sticky filter bar (MPD-3 / D9 / W8)
- [ ] RoomSelector renders inside the sticky filter bar wrapper, ABOVE CategoryFilterBar
- [ ] CategoryFilterBar renders inside the same sticky wrapper, BELOW RoomSelector
- [ ] Both filters are sticky together as a single block (D5 / W7)
- [ ] When scrolling: shadow appears below the entire sticky block
- [ ] When scrolling: QOTD scrolls naturally (not sticky)

**Filter behavior:**

- [ ] Selecting 'Testimonies' filters feed to only testimony posts
- [ ] Selecting 'All' shows all post types
- [ ] Combined filter (postType + category) intersects correctly
- [ ] API call includes both filter params when both active
- [ ] React Query caches per (postType, category) combination (W11 — no eager prefetch)
- [ ] Empty-state heading adapts to filter state per D11

**Accessibility:**

- [ ] RoomSelector wrapper has `role='tablist'` (or matches existing CategoryFilterBar pattern — verify R3 at plan time)
- [ ] Container has `aria-label='Filter by post type'`
- [ ] Active pill announced as 'tab, selected' or equivalent
- [ ] Reduced-motion preference respected (`motion-reduce:transition-none` continues)
- [ ] Focus visible on every pill

**Universal Rule 17 axe-core test:**

- [ ] axe-core scan on `/prayer-wall` returns zero violations
- [ ] axe-core scan on `/prayer-wall?postType=testimony` returns zero violations
- [ ] axe-core scan on `/prayer-wall?postType=encouragement&category=mental-health` returns zero violations
- [ ] Test runs in CI alongside other Playwright tests
- [ ] No `test.skip` or `test.only` directives (W18)

**Cutover checklist:**

- [ ] File created at `_plans/forums/phase04-cutover-checklist.md` (NOT `_plans/forums-wave/` — MPD-2)
- [ ] All Phase 4 specs (4.1–4.8) listed with merge dates
- [ ] Feature flag state documented (most likely: zero new flags)
- [ ] Post-Phase-4 production state described
- [ ] Open follow-ups listed for Phase 5 awareness
- [ ] Universal Rule 17 axe-core test status documented
- [ ] Not a stub (W19)

**No regressions:**

- [ ] Composer entry flow (4.7 chooser → type-specific composer) still works
- [ ] QOTD composer still works (separate flow)
- [ ] CategoryFilterBar behavior unchanged — props, ARIA, keyboard nav (regression test passes — W9)
- [ ] Bookmark, reaction, comment flows unchanged
- [ ] Per-type chrome renders correctly under filtered views
- [ ] All 5 post types createable from any filter view (selecting a room does NOT gate composer types)
- [ ] Existing PrayerWall tests pass without modification

**Brand voice:**

- [ ] All pill labels pass pastor's wife test (Section 13 anti-patterns)
- [ ] No exclamation, no urgency, no comparison, no jargon
- [ ] No gamification copy ('Trending: Testimonies') or pressure ('Pick a room!')

**Visual verification:**

- [ ] All 12 scenarios in brief Section 3 pass
- [ ] Mobile sticky behavior verified (no jitter, no offset issues with keyboard — W7)
- [ ] Desktop one-row pill layout verified

**Operational:**

- [ ] Eric flips `_forums_master_plan/spec-tracker.md` 4.8 row from ⬜ to ✅ as the final step (only AFTER cutover checklist is filled in). CC does NOT flip the tracker.

---

## Testing notes

Target ~28 unit tests + ~7 Playwright scenarios. Master plan AC requires ≥16; the surface justifies more given the cutover deliverable.

### Frontend unit tests

**`frontend/src/components/prayer-wall/__tests__/RoomSelector.test.tsx`** — NEW, ~10 tests:

- Renders all 6 pills in canonical order
- Default state: 'All' pill is active
- Each pill has correct accent color
- Each pill has min-h-[44px] / min-w-[44px] (touch target)
- Each pill is a `<button>` with `aria-selected` reflecting state
- Tapping a pill calls `onSelectPostType` with the correct value
- Tapping 'All' pill calls `onSelectPostType` with `null`
- Tab key cycles focus through pills
- Enter / Space activates focused pill
- Active pill has visual distinction (filled background or strong border)

**`frontend/src/pages/__tests__/PrayerWall.test.tsx`** — UPDATE, add ~9 tests:

- RoomSelector renders above CategoryFilterBar in DOM order
- QOTD card renders ABOVE the filter bar wrapper (layout reorder)
- Selecting 'Testimonies' updates URL to `?postType=testimony`
- Selecting 'All' removes `?postType=` from URL (preserves any `?category=`)
- Initial render with `?postType=encouragement` URL: Encouragements pill active
- Initial render with `?postType=invalid` URL: All pill active (defensive — W5)
- Both filters active: `?postType=testimony&category=health` activates both UIs
- API call payload includes postType and category when both active
- Empty-state heading adapts to combined filter ('No Testimonies in Health yet')

**`frontend/src/components/prayer-wall/__tests__/CategoryFilterBar.test.tsx`** — UPDATE, 0–2 regression tests as needed:

- CategoryFilterBar's API unchanged (props regression test)
- CategoryFilterBar still works when nested below RoomSelector

### Frontend Playwright tests

**`frontend/e2e/room-selector.spec.ts`** — NEW, ~4 tests:

- E2E: select Testimonies room, verify URL, verify only testimonies in feed
- E2E: select Testimonies + Health filter, verify combined filter behavior
- Browser back/forward navigation restores filter state correctly
- Sticky behavior on mobile viewport: both filters remain visible when feed scrolls

**`frontend/e2e/accessibility.spec.ts`** — NEW, ~3 axe-core tests:

- axe-core scan on `/prayer-wall` returns zero violations
- axe-core scan on `/prayer-wall?postType=testimony` returns zero violations
- axe-core scan on `/prayer-wall?postType=encouragement&category=mental-health` returns zero violations

### Backend tests

**None expected.** Recon confirmed `PostSpecifications.byPostType()` and `PostController.list()` already wire `?postType=` through. If plan-time recon discovers a gap, scope grows by ~3 backend tests (`PostControllerIntegrationTest.list_with_postType_filters_returns_only_that_type`, `PostSpecificationsTest.byPostType_filters_correctly`, `PostSpecificationsTest.byPostType_composes_with_byCategory`) — most likely state: zero backend tests added.

### Test count

- RoomSelector.test.tsx: ~10 new
- PrayerWall.test.tsx: ~9 added
- CategoryFilterBar.test.tsx: 0–2 added (regression)
- room-selector.spec.ts: ~4 Playwright
- accessibility.spec.ts: ~3 Playwright (axe-core)
- Backend (defensive only): 0 expected

Total: **~28 tests + ~7 Playwright scenarios** (master plan AC ≥16).

---

## Notes for plan phase recon

Re-verify on disk before starting (brief recon was authored 2026-05-09):

1. **`frontend/src/pages/PrayerWall.tsx`** — confirm CategoryFilterBar at line 791-802, QOTD at line 853-860, ComposerChooser imported at line 16. Lines may have shifted; the brief's line numbers are approximate.
2. **`frontend/src/components/prayer-wall/CategoryFilterBar.tsx`** — read existing pattern (pill markup, accessibility role, responsive behavior, keyboard navigation). RoomSelector mirrors this exactly.
3. **`frontend/src/constants/post-types.ts`** — confirm `POST_TYPES` has `pluralLabel` field on all 5 types (R7).
4. **Backend `?postType=` filter** — VERIFIED at brief-write time and re-confirmed during this recon: `PostSpecifications.byPostType()` exists at line 129; `PostController.list()` accepts `@RequestParam(required = false) String postType` at line 83. Pure frontend spec — no backend changes expected.
5. **Existing axe-core integration** — `@axe-core/playwright@^4.11.1` is **already installed** in `frontend/package.json` (corrects brief R8 which said "no existing axe-core integration"). However, no test file uses it yet; 4.8 establishes the test pattern.
6. **`_forums_master_plan/spec-tracker.md`** — verify all Phase 4 specs are ✅ with merge dates (for cutover checklist generation). **As of 2026-05-10 recon: 4.7b is still ⬜.** If still ⬜ at execution time, ship 4.7b first.
7. **PrayerWall.tsx `isFilterSticky` observer** — identify source (IntersectionObserver or scroll listener); verify it continues to work with the expanded sticky wrapper. Most likely: no observer changes needed (R12 / W6).
8. **URL state pattern for `?category=`** — read existing `setSearchParams` approach to confirm it preserves other params. 4.8's `?postType=` mirrors exactly (R11).
9. **List API call location** — identify where PrayerWall.tsx calls the list endpoint (likely `frontend/src/services/prayer-wall-api.ts` or a hook). 4.8 adds `postType` to filter args.
10. **Playwright test directory convention** — verified at recon time: e2e specs live at `frontend/e2e/` (not `frontend/tests/playwright/` as brief suggested). Confirm `frontend/playwright.config.ts` `testDir` setting at plan time before placing the new test files.
11. **Universal Rule 17** — search `CLAUDE.md`, `.claude/rules/`, and `_forums_master_plan/round3-master-plan.md` for "Universal Rule 17" or "Rule 17" or "axe-core" to understand the standard. Brief asserts this is a project-wide standard with the test integration not yet in place — verify and fill in details.
12. **Pre-existing axe violations on `/prayer-wall` routes** — surface during /code-review. If any exist, fix as part of 4.8 (W23 — the cutover gate requires zero violations).

---

## Out of scope

Explicit deferrals (per brief Section 12):

- Per-room counts on RoomSelector pills (D7 — future spec)
- Sort order toggle (Newest / Most Active / Most Reacted) (W4)
- Date range filter (W4)
- Author filter (W4)
- Reaction count threshold (W4)
- Search input (W4)
- Pre-selecting chooser based on active room (W13 — consumption ≠ creation)
- Per-room analytics events (W12)
- Feature flag for RoomSelector (W15 — ship on by default, no toggle)
- Removing CategoryFilterBar (W2 — both filters coexist)
- Welcomer Room or other metaphor extensions (W20)
- Refactoring PrayerWall.tsx beyond layout reorder (W21)
- Pre-fetching all 6 room views (W11)
- Adding new feature flags (W15)
- Visual migration to FrostedCard / Phase 5 patterns (deferred to Phase 5)
- Per-room hero images or banners (future polish)
- Saved filter combinations (future feature)
- Filter chips showing active filter state (existing pill UIs are sufficient)
- A11y tree announcement when filter changes beyond what `aria-selected` provides (future enhancement)
- Backend changes (none needed; `?postType=` already wired)

---

## Out-of-band notes for Eric

- **4.8 is BOTH the RoomSelector feature AND the Phase 4 Cutover** (MPD-1). Don't ship one without the other. After 4.8 merges and the cutover checklist is filled in, **Phase 4 is COMPLETE** and Phase 5 (starting with Spec 5.0 Architecture Context Refresh) is unblocked.
- **Cutover checklist path is `_plans/forums/`, NOT `_plans/forums-wave/`** (MPD-2 — master plan body has the wrong path).
- **Layout reorder is NOT optional** (MPD-3 / D9 / W8): QOTD moves above the sticky filter block. If RoomSelector ships in the right place but QOTD wasn't moved, the visual hierarchy is wrong.
- **`?postType=` and `?category=` are independent and can both be active** (D4 / W3). Never make them mutually exclusive.
- **'All' pill = absent `?postType=` param**, NOT explicit `?postType=all` value (D6).
- **Single sticky wrapper** containing both filters, not two independent stickies (D5 / W7 — sticky-jitter on mobile).
- **CategoryFilterBar's API stays unchanged** (W9). 4.8 only changes its parent wrapper position.
- **Universal Rule 17 axe-core test is a hard gate** (MPD-4 / W18 / W23). Zero violations on all three listed routes. No `test.skip`. If pre-existing violations surface, fix them as part of 4.8.
- **`@axe-core/playwright` is already installed** (recon corrected brief R8). 4.8 writes the test files; no `package.json` update needed unless the version needs bumping.
- **Spec 4.7b is still ⬜ in `spec-tracker.md` at recon time (2026-05-10).** Per brief: ship 4.7b first if it's still ⬜ at execution time. If user wants to proceed anyway, surface this as a warning — the cutover checklist depends on all Phase 4 prereqs being ✅.
- **CC must NOT run any git operations** in any phase (recon, plan, execute, verify, review). Eric handles all git manually. Only read-only inspection allowed (`git status`, `git diff`, `git log --oneline`, `git blame`, `git show <sha>`).
- **Eric flips spec-tracker.md** from ⬜ to ✅ as the final step, AFTER merge AND cutover checklist filled in. CC does not flip the tracker.
- **Override moments — bump to MAX during /plan or /execute** if any of: RoomSelector ships without QOTD moved up; `?postType=` and `?category=` shipped as mutually exclusive; CategoryFilterBar removed instead of nested; cutover checklist shipped as stub; axe-core test failed and CC tries to disable instead of fix; brand voice drifts to gamification or pressure.
- **All 23 watch-fors in the brief Section 8 must be addressed.** The plan should reference each by number where applicable.

---

## See also

- **Brief:** `_plans/forums/spec-4-8-brief.md` — binding source of truth for divergences from the master plan body
- **Master plan:** `_forums_master_plan/round3-master-plan.md` → Spec 4.8 (lines ~4522–4557)
- **Tracker:** `_forums_master_plan/spec-tracker.md` → row 72
- **Phase 3 cutover precedent:** `_plans/forums/phase03-cutover-checklist.md` (use as a structural reference for the Phase 4 checklist)
- **Phase 4 prior specs:** `_specs/forums/spec-4-1.md` through `spec-4-7b.md`
- **Next step after merge:** Phase 5 Spec 5.0 (Architecture Context Refresh — documentation-only orientation prelude)
