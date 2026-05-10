/spec-forums spec-4-8

# Spec 4.8 — Room Selector and Phase 4 Cutover

**Master plan ID:** `round3-phase04-spec08-room-selector-cutover`
**Size:** L
**Risk:** Medium
**Prerequisites:** 4.7 (Composer Chooser). The master plan body lists this as the only prerequisite, but practically all of Phase 4 (4.1-4.7b) needs to be ✅ because 4.8 is the Phase 4 Cutover — see MPD-1.
**Tier:** High

---

## 1. Branch discipline (CRITICAL)

**You are on a long-lived working branch named `forums-wave-continued`. Stay on it.**

Eric handles all git operations manually. Claude Code MUST NEVER run any of the following commands in this session, in any phase (recon, plan, execute, verify, review):

- `git checkout`
- `git checkout -b`
- `git switch`
- `git switch -c`
- `git branch`
- `git commit`
- `git commit -am`
- `git push`
- `git stash`
- `git stash pop`
- `git reset` (any flag)
- `git rebase`
- `git cherry-pick`
- `git merge`
- `gh pr create`, `gh pr merge`, `glab mr create`, etc.

If Claude Code believes a git operation is needed, surface it as a recommendation and STOP. Eric will execute manually.

The only acceptable git tooling Claude Code may invoke is read-only inspection: `git status`, `git diff`, `git log --oneline`, `git blame`, `git show <sha>`.

**Note:** 4.8 is the Phase 4 finale. After this spec ships and the cutover checklist is filled in, Phase 4 is COMPLETE. The merge of 4.8 should be the final Phase 4 commit before Phase 5 begins. Take care — this is the moment Prayer Wall becomes a multi-room product end-to-end.

---

## 2. Tier — High

This spec ships TWO things: (1) the RoomSelector feature and the layout reorganization that surfaces it, (2) the Phase 4 cutover deliverable (a checklist doc + Universal Rule 17 axe-core test). Most of the work is the RoomSelector; the cutover deliverable is small but load-bearing for the Phase 4 → Phase 5 transition.

**Why High (not Standard):**

- Layout reorganization affects multiple flow concerns: QOTD card moves above the filter bar; CategoryFilterBar nests below the new RoomSelector; both filters become sticky together (D5). Standard tier sometimes ships the new component without the layout reorder.
- Dual-filter URL state (`?postType=` AND `?category=`) is the spec's most subtle UX concern (D4). Both filters can be active simultaneously per AC #5. Standard tier sometimes ships them as mutually exclusive or breaks one when adding the other.
- 'All' pill semantics (D6) has two valid implementations; the brief locks one in (absent param when 'All'). Standard tier sometimes picks the explicit-value approach which adds URL noise.
- Sticky scroll behavior with two stacked filter bars on mobile is non-trivial (W7). Standard tier sometimes ships independent stickies that overlap or scroll-jitter on mobile.
- The Phase 4 cutover checklist is a real deliverable, not just a checkbox. It documents the post-Phase-4 production state and informs Phase 5 architectural decisions. Standard tier ships a stub.
- Universal Rule 17 axe-core accessibility smoke test passes is an objective gate; if it doesn't pass, no merge.
- Brand voice on pill labels and active-state copy is sensitive (Section 13).

**Why not xHigh:**

- All architectural patterns are established (URL searchParams, sticky scroll, pill component shape from CategoryFilterBar)
- Pure frontend (assuming `?postType=` filter already supported by backend — verify per R6)
- No schema changes, no migration, no backend module
- The layout reorder is mechanical (move JSX blocks), not architectural
- The cutover deliverable is a markdown doc, not code
- The brief covers all watch-fors and decisions explicitly

**Override moments — when to bump to MAX:**

- During /plan or /execute, if CC ships RoomSelector without moving QOTD above it (W8 / MPD-4)
- If CC implements `?postType=` and `?category=` as mutually exclusive (W3)
- If CC removes the existing CategoryFilterBar instead of nesting it (W2)
- If CC ships the cutover checklist as a stub or skips the axe-core test
- If brand voice on pill labels drifts to gamification ('Trending: Testimonies') or pressure ('Pick a room!')

---

## 3. Visual verification — REQUIRED

**Run `/verify-with-playwright` after `/code-review` passes.**

Verification surface:

1. **RoomSelector visible at top of feed** at `/prayer-wall`:
   - 6 pills render in canonical order: All, Prayer Requests, Testimonies, Questions, Discussions, Encouragements
   - Each pill has correct accent color (matches per-type chrome from PrayerCard)
   - 'All' pill is active by default (URL has no `?postType=` param)
   - Pills stack horizontally on desktop (one row)
   - Pills wrap or scroll horizontally on narrow mobile (responsive)
   - Each pill meets 44x44 minimum touch target
   - Active pill has clear visual distinction (filled background or strong border)
   - Inactive pills are subtle (low-opacity background)

2. **Filter behavior** — selecting a room:
   - Tapping 'Testimonies' pill activates it, deactivates 'All'
   - URL updates to `/prayer-wall?postType=testimony`
   - Feed re-fetches with the new filter
   - Only testimony posts render in the feed
   - Empty-state CTA copy adapts ('No testimonies yet')
   - Selecting 'All' removes `?postType=` from URL; feed shows all post types

3. **Dual filter** — RoomSelector + CategoryFilterBar simultaneously:
   - User selects 'Testimonies' room AND 'Health' category
   - URL: `/prayer-wall?postType=testimony&category=health`
   - Feed shows only testimonies in the Health category
   - Both filter UIs show their active state simultaneously
   - Empty state for combined filter renders helpful copy ('No Health testimonies yet')

4. **Layout reorder** — from current to new:
   - QOTD card renders ABOVE both filter bars (was below CategoryFilterBar; per MPD-4)
   - RoomSelector renders BELOW QOTD
   - CategoryFilterBar renders BELOW RoomSelector (was above QOTD)
   - Hero, composer entry button stay above QOTD (unchanged)
   - Feed renders below CategoryFilterBar (unchanged position relative to filters)

5. **Sticky scroll behavior**:
   - Mobile: BOTH filter bars (RoomSelector + CategoryFilterBar) are sticky together as a single block
   - Mobile: when scrolling down, both bars stay visible at top of viewport
   - Mobile: shadow appears below the sticky block when scrolled (existing pattern)
   - Desktop: same sticky behavior, less urgent because viewport is taller
   - QOTD does NOT stay sticky (scrolls naturally)

6. **URL state on page load**:
   - `/prayer-wall` (no params): All pill active, no category filter
   - `/prayer-wall?postType=testimony`: Testimonies pill active, no category filter
   - `/prayer-wall?category=health`: All pill active, Health category filter active
   - `/prayer-wall?postType=testimony&category=health`: Testimonies + Health both active
   - `/prayer-wall?postType=invalid_type`: graceful fallback (defaults to All; logs warning OR redirects to clean URL)

7. **Browser back/forward navigation**:
   - Selecting a room pushes a new history entry (back button restores previous filter)
   - Forward button works correctly
   - URL state matches active filter on history navigation

8. **Keyboard accessibility**:
   - Tab cycles through RoomSelector pills, then CategoryFilterBar pills
   - Enter or Space activates focused pill
   - Arrow keys work within each pill group (left/right) per existing CategoryFilterBar pattern (verify R3)
   - Focus visible state on every pill

9. **Screen reader experience**:
   - RoomSelector announced as a 'tablist' or 'navigation' region (per R3 — match existing pattern)
   - Each pill announced with its label and pressed/active state
   - Active pill announced as 'pressed' or 'current'
   - Filter changes don't require a page reload announcement

10. **Phase 4 cutover checklist exists**:
    - File at `_plans/forums/phase04-cutover-checklist.md`
    - All Phase 4 specs (4.1-4.7b) marked ✅ with merge dates
    - Section confirming feature flag state
    - Section listing post-Phase-4 production state
    - Section noting open follow-ups for Phase 5 awareness

11. **Universal Rule 17 axe-core test passes**:
    - Automated axe-core scan on `/prayer-wall` returns no violations
    - Same for `/prayer-wall?postType=testimony` (filtered view)
    - Same for `/prayer-wall?postType=encouragement&category=mental-health` (combined filter)
    - Test surface includes the new RoomSelector and CategoryFilterBar nesting
    - Test integrated into the project's test suite (CI-runnable, not just local)

12. **No regression on existing flows**:
    - Composer entry flow (chooser → type-specific composer) still works (4.7)
    - QOTD composer still works
    - Bookmark, reaction, comment flows unchanged
    - Per-type chrome (rose / cyan / amber / violet / white) renders correctly under filtered views
    - Image upload (testimony/question) still works under postType filter
    - All 5 post types createable from any filter view (selecting a room doesn't gate composer types)

Minimum 12 Playwright scenarios.

<!-- CHUNK_BOUNDARY_1 -->

---

## 4. Master Plan Divergence

The master plan body for 4.8 lives at `_forums_master_plan/round3-master-plan.md` lines ~4522–4557. Several drift items.

### MPD-1 — 4.8 is BOTH a feature spec AND the Phase 4 cutover

The master plan body's title is just 'Spec 4.8' (no descriptive name in the section header) but the ID is `round3-phase04-spec08-room-selector-cutover`. Two distinct deliverables:

1. **RoomSelector feature** — new component, layout reorder, dual-filter URL state, sticky behavior
2. **Phase 4 cutover** — checklist doc + Universal Rule 17 axe-core accessibility smoke test

The master plan body's AC list has BOTH bundled together. Don't ship one without the other.

**Practical implication:** prerequisites are not just 4.7. Phase 4 is only 'complete' when ALL of 4.1–4.7b are ✅ AND 4.8 is ✅. Verify all of them in spec-tracker.md before starting 4.8.

### MPD-2 — Cutover checklist path: `_plans/forums/`, NOT `_plans/forums-wave/`

Master plan body AC says:

> [ ] Phase 4 cutover checklist in `_plans/forums-wave/phase04-cutover-checklist.md`

The project uses `_plans/forums/` (not `_plans/forums-wave/`) for all spec briefs and forum planning docs. Verify by listing the directory.

**Action for the planner:** the cutover checklist goes at `_plans/forums/phase04-cutover-checklist.md` to match existing convention.

### MPD-3 — Layout reorder is implied but not explicit in master plan body

The master plan body AC says:

> - [ ] CategoryFilterBar moves below the room selector
> - [ ] QOTD card remains above the room selector

Recon ground truth (per R1, R2): current PrayerWall.tsx renders CategoryFilterBar at line 791-802, QOTD at line 853-860. CategoryFilterBar is ABOVE QOTD currently.

**Required layout reorder for 4.8:**

Current:
1. PrayerWallHero
2. (composer flow)
3. CategoryFilterBar (sticky)
4. QOTD card
5. Feed

After 4.8:
1. PrayerWallHero
2. (composer flow)
3. QOTD card
4. RoomSelector (sticky, outer)
5. CategoryFilterBar (sticky, nested below RoomSelector)
6. Feed

QOTD moves UP (above all filters). RoomSelector and CategoryFilterBar are both sticky, stacked together.

Note: the comment at line 853 says 'QOTD Card — always visible regardless of filter'. After 4.8, this remains true — QOTD is visible in any filter state because it's positioned ABOVE the filters. (Previously, QOTD scrolled out of view when filters were sticky.)

### MPD-4 — Universal Rule 17 axe-core test — verify pattern existence

Master plan body AC says:

> [ ] Universal Rule 17 per-phase accessibility smoke test passes: axe-core automated scan on routes...

Universal Rule 17 likely refers to a project-wide standard documented in CLAUDE.md or an architecture doc. Plan recon checks:

1. Does CLAUDE.md (root or `_plans/`) reference 'Universal Rule 17' or 'Rule 17' or 'axe-core'?
2. Is there an existing axe-core test setup in the project (e.g., a `vitest-axe` integration, a Playwright `@axe-core/playwright` package)?
3. Was Phase 3 cutover (Spec 3.12) accompanied by an axe-core test? If yes, follow that pattern. If no, 4.8 establishes the pattern.

**Most likely state:** axe-core is referenced as a project standard but the integration isn't yet in place. 4.8 either:
- (a) Adds `@axe-core/playwright` (or similar) and writes the smoke test as part of 4.8, OR
- (b) Skips the axe-core part if it's truly out-of-scope, files a follow-up

If (a), test setup adds ~30 minutes. If (b), the AC item is downgraded to a follow-up filing.

**Recommendation:** go with (a). Phase 4 finale deserves the accessibility gate. The infrastructure work is bounded.

### MPD-5 — ComposerChooser is already imported in PrayerWall.tsx

Recon ground truth (per R5): line 16 of PrayerWall.tsx imports ComposerChooser. This confirms 4.7 has shipped on this clone. Verify spec-tracker.md shows 4.7 ✅.

If 4.7 is still ⬜ in tracker but ComposerChooser is on disk, that suggests the tracker is stale or 4.7 is in flight. Confirm before proceeding.

### MPD-6 — Backend `?postType=` filter — verify existence

Master plan body assumes the backend supports `GET /api/v1/posts?postType=X` filtering. From earlier specs (4.6's `notExpired()` Specification composes alongside `byPostType` per the 4.6 brief R7), the backend filter likely already exists.

**Plan recon verifies** by reading PostService.list() or PostSpecifications.byPostType() (path varies; verify location). If the filter exists, 4.8 is pure frontend. If not, 4.8 grows by ~1 backend method + ~3 backend tests.

**Most likely state:** the filter exists. Earlier specs (Composer Chooser, post type infrastructure) implicitly required it.

<!-- CHUNK_BOUNDARY_2 -->

---

## 5. Recon Ground Truth (2026-05-09)

Verified on disk at `/Users/Eric/worship-room/`.

### R1 — CategoryFilterBar location and structure in PrayerWall.tsx

`frontend/src/pages/PrayerWall.tsx` lines 791-802 (approximate):

```tsx
{/* Filter Bar */}
<div
  className={cn(
    'sticky top-0 z-30 transition-shadow motion-reduce:transition-none',
    isFilterSticky && 'shadow-md'
  )}
>
  <CategoryFilterBar
    activeCategory={activeCategory}
    onSelectCategory={handleSelectCategory}
    categoryCounts={categoryCounts}
    showCounts={activeCategory !== null}
  />
</div>
```

Key observations:

- Wrapper div is `sticky top-0 z-30` with shadow-on-scroll behavior
- `isFilterSticky` state controls the shadow (likely from a scroll observer)
- CategoryFilterBar takes `activeCategory`, `onSelectCategory`, `categoryCounts`, `showCounts` props
- `motion-reduce:transition-none` already respects reduced-motion preference

**4.8 changes this:**

- The sticky wrapper expands to contain BOTH RoomSelector (above) and CategoryFilterBar (below)
- A single sticky block, not two independent stickies (per D5)

### R2 — QOTD card location

`frontend/src/pages/PrayerWall.tsx` lines 853-860 (approximate):

```tsx
{/* QOTD Card — always visible regardless of filter */}
<div className="mb-4">
  <QuestionOfTheDay
    responseCount={qotdResponseCount}
    isComposerOpen={qotdComposerOpen}
    onToggleComposer={handleToggleQotdComposer}
    onScrollToResponses={handleScrollToQotdResponses}
  />
</div>
```

Currently positioned BELOW CategoryFilterBar. Comment says 'always visible regardless of filter' — implying QOTD's purpose is to show across all filter states.

**4.8 moves QOTD UP**, above the new sticky filter block. The comment becomes more literally true: QOTD is always visible because it sits ABOVE the sticky filters that obscure most of the feed when scrolled.

### R3 — CategoryFilterBar component shape

`frontend/src/components/prayer-wall/CategoryFilterBar.tsx` is the existing pattern. Plan recon reads it to understand:

- Pill component shape (likely `<button role='tab' aria-selected>` or similar)
- Active vs inactive styling pattern
- Mobile responsive behavior (horizontal scroll? wrap?)
- ARIA attributes (tablist? navigation?)
- Keyboard navigation (arrow keys? tab?)
- Counts integration (`showCounts` prop suggests optional counter chips)

**4.8's RoomSelector mirrors this pattern** with these differences:

- 6 pills (All + 5 types) vs CategoryFilterBar's variable count
- Per-type accent colors (rose / amber / cyan / violet / white) on pills, not category-based
- No counts (D7 — simpler than CategoryFilterBar's optional counts)
- URL state via `?postType=` (CategoryFilterBar uses `?category=`)

### R4 — URL state handling in PrayerWall.tsx

Grep for `searchParams|useSearchParams` to confirm. From earlier brief context (4.7 brief R3, R4): `searchParams.get('debug-post-type')` was used in a removed shim. The same pattern (`searchParams.get('category')`) likely drives CategoryFilterBar.

**Plan recon verifies:**

- `useSearchParams` hook from `react-router-dom` is in use
- Setting params uses `setSearchParams(prev => ...)` pattern preserving other params
- 4.8 follows this pattern for `?postType=` (preserves `?category=` when toggling postType)

### R5 — ComposerChooser already imported

`frontend/src/pages/PrayerWall.tsx` line 16:

```typescript
import { ComposerChooser } from '@/components/prayer-wall/ComposerChooser'
```

Confirms 4.7 has shipped on this clone. spec-tracker.md should show 4.7 ✅. Verify before proceeding.

### R6 — Backend `?postType=` filter — likely exists

From 4.6 brief recon: PostSpecifications has `byPostType()` method (referenced in 4.6's notExpired() Specification composition). Plan recon verifies by reading:

- `backend/src/main/java/com/worshiproom/post/PostSpecifications.java` (or wherever Specifications live)
- `backend/src/main/java/com/worshiproom/post/PostService.java` `list()` method
- `backend/src/main/java/com/worshiproom/post/PostController.java` GET endpoint

If `?postType=` filter is wired through the chain, 4.8 is pure frontend. If not, scope grows by ~1 backend method + ~3 backend tests. Most likely state: filter exists.

### R7 — POST_TYPES.pluralLabel exists

From prior recon: `frontend/src/constants/post-types.ts` has entries with `id`, `label`, `pluralLabel`, etc. RoomSelector pills use `pluralLabel`:

```typescript
// Expected entries:
{ id: 'prayer_request', label: 'Prayer Request', pluralLabel: 'Prayer Requests', ... }
{ id: 'testimony', label: 'Testimony', pluralLabel: 'Testimonies', ... }
{ id: 'question', label: 'Question', pluralLabel: 'Questions', ... }
{ id: 'discussion', label: 'Discussion', pluralLabel: 'Discussions', ... }
{ id: 'encouragement', label: 'Encouragement', pluralLabel: 'Encouragements', ... }
```

Plan verifies all 5 have `pluralLabel`. The 'All' pill is hardcoded ('All') since it's not a post type.

### R8 — No existing axe-core test setup

Grep `frontend/` for `axe-core|@axe-core|toHaveNoViolations|jest-axe|vitest-axe`. Most likely zero matches — 4.8 establishes the pattern.

**4.8 adds:**

- `@axe-core/playwright` dev dependency
- Playwright test file at `frontend/tests/playwright/accessibility.spec.ts` (path varies; verify convention)
- Smoke test scans `/prayer-wall`, `/prayer-wall?postType=testimony`, `/prayer-wall?postType=encouragement&category=mental-health` for violations
- Test integrated into existing Playwright run command

### R9 — Phase 4 spec list and merge dates (for cutover checklist)

From spec-tracker.md (path: `_forums_master_plan/spec-tracker.md`):

- 4.1 Post Type Foundation — verify ✅ with merge date
- 4.2 Prayer Request Polish — verify ✅
- 4.3 Testimony Post Type — verify ✅
- 4.4 Question Post Type — verify ✅
- 4.5 Devotional Discussion — verify ✅
- 4.6 Encouragement Post Type — verify ✅
- 4.6b Image Upload for Testimonies & Questions — verify ✅
- 4.7 Composer Chooser — verify ✅
- 4.7b Ways to Help MVP — verify ✅
- 4.8 Room Selector + Phase 4 Cutover — ships in this spec

All 9 prior specs must be ✅ before 4.8 starts. Plan recon enumerates them and pulls merge dates for the cutover checklist.

### R10 — No existing 'Room' terminology in code

Grep `frontend/src/` for `Room|room-` (case-sensitive). Most likely zero matches in feature code. 4.8 introduces the term:

- 'Room' in user-facing copy refers to a post-type-filtered view of the wall
- 'RoomSelector' is the filter component
- Internally, 'room' = filtered postType subset

Future features may extend the metaphor (e.g., 'Welcomer Room' for moderator-only post types) but 4.8 stays scoped to the 5 production post types.

### R11 — Existing `?category=` pattern as reference

The `?category=` URL param has been working since Phase 0 / 1 of the Forums Wave. Plan recon reads how it's set/cleared:

```typescript
// Approximate pattern (verify):
const handleSelectCategory = (category: Category | null) => {
  setSearchParams(prev => {
    if (category === null) {
      prev.delete('category')
    } else {
      prev.set('category', category.toLowerCase())
    }
    return prev
  })
}
```

**4.8's `?postType=` mirrors this exactly:**

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

Key: setting one param does NOT affect the other. Both can be active simultaneously.

### R12 — isFilterSticky observer pattern

The `isFilterSticky` boolean (R1) likely comes from an IntersectionObserver or scroll listener. Plan recon identifies the source:

- Look for `useEffect` with `IntersectionObserver` or `addEventListener('scroll')`
- Verify it tracks the sticky element's offset from top

**4.8 may need to update the observer** if the sticky element's structure changes. Most likely: the observer attaches to the same wrapper div, just now containing both RoomSelector and CategoryFilterBar instead of just CategoryFilterBar.

### R13 — PrayerWall.tsx `list` query and filter passing

The `list()` function (or whatever the API call is named in the frontend) takes filter params. Plan recon verifies:

- Where the list call lives (`prayer-wall-api.ts`? a hook?)
- How `category` is currently passed to the API
- 4.8 adds `postType` to the filter args (either as a new param or extending an existing filter object)

Most likely state: a single filter object like `{ category, postType }` passed to the API; 4.8 just adds the field to the type and threads it through.

<!-- CHUNK_BOUNDARY_3 -->

---

## 6. Phase 3 Execution Reality Addendum gates — applicability

4.8 is mostly frontend, with a defensive backend verification (R6). Most of the Phase 3 gates don't apply.

| # | Gate | Applies to 4.8? | Notes |
| - | ---- | --- | ----- |
| 1-13 | All Phase 3 backend gates | N/A or unchanged | 4.8 doesn't add backend write paths; existing gates continue to work |

**New addendum gate introduced by 4.8:**

**Gate 17: Universal Rule 17 axe-core accessibility smoke test.** Per master plan body AC #14. The Phase 4 cutover requires an automated accessibility scan that passes with zero violations on the routes listed in Section 3 #11 above.

---

## 7. Decisions and divergences

### D1 — 6 pills, canonical order, plural labels

RoomSelector renders these pills in this exact order:

1. **All** (hardcoded label, no postType filter)
2. **Prayer Requests** (POST_TYPES.find(t => t.id === 'prayer_request').pluralLabel)
3. **Testimonies** (POST_TYPES.find(t => t.id === 'testimony').pluralLabel)
4. **Questions** (POST_TYPES.find(t => t.id === 'question').pluralLabel)
5. **Discussions** (POST_TYPES.find(t => t.id === 'discussion').pluralLabel)
6. **Encouragements** (POST_TYPES.find(t => t.id === 'encouragement').pluralLabel)

**Why plural labels:** the pills filter the feed; users read them as 'show me [Plural]'. 'Show me Prayer Requests' is more natural than 'Show me Prayer'.

**Why this order:** matches POST_TYPES iteration order (set in 4.1, established convention). 'All' is conceptually outside the post type set, hence its anchor position at the start.

### D2 — Pill labels source from `post-types.ts`

Don't hardcode pill labels in RoomSelector.tsx. Iterate POST_TYPES and use the `pluralLabel` field. Single source of truth: when post-types.ts changes, the RoomSelector adapts automatically.

```tsx
const rooms = [
  { id: null, label: 'All', accentClass: '' },
  ...POST_TYPES.map(t => ({
    id: t.id,
    label: t.pluralLabel,
    accentClass: getAccentClassForPostType(t.id),
  })),
]
```

The `getAccentClassForPostType` helper (D3) handles the per-type color mapping.

### D3 — Per-type accent colors on pills

Each post-type pill uses its corresponding chrome color (matching PrayerCard's per-type wash):

- Prayer Requests: white / neutral accent (no specific color, uses default)
- Testimonies: amber accent
- Questions: cyan accent
- Discussions: violet accent
- Encouragements: rose accent

The 'All' pill uses a neutral / white-ish accent (matches no specific type).

**Implementation:** a helper function or constant lookup:

```typescript
const POST_TYPE_PILL_ACCENTS: Record<PostType | 'all', { activeBg: string, activeText: string, inactiveBorder: string }> = {
  all: { activeBg: 'bg-white/15', activeText: 'text-white', inactiveBorder: 'border-white/20' },
  prayer_request: { activeBg: 'bg-white/15', activeText: 'text-white', inactiveBorder: 'border-white/20' },
  testimony: { activeBg: 'bg-amber-500/20', activeText: 'text-amber-100', inactiveBorder: 'border-amber-300/20' },
  question: { activeBg: 'bg-cyan-500/20', activeText: 'text-cyan-100', inactiveBorder: 'border-cyan-300/20' },
  discussion: { activeBg: 'bg-violet-500/20', activeText: 'text-violet-100', inactiveBorder: 'border-violet-300/20' },
  encouragement: { activeBg: 'bg-rose-500/20', activeText: 'text-rose-100', inactiveBorder: 'border-rose-300/20' },
}
```

Values are illustrative; plan recon adjusts based on existing PrayerCard chrome conventions.

### D4 — URL state: `?postType=` independent of `?category=`

Selecting a room sets `?postType=<value>`. Selecting 'All' deletes the param. The `?category=` param is untouched in either case.

Selecting a category sets `?category=<value>`. Selecting 'All categories' (existing behavior) deletes the param. The `?postType=` param is untouched.

**Both filters compose on the backend:**

```
GET /api/v1/posts                              → all posts
GET /api/v1/posts?postType=testimony           → all testimonies
GET /api/v1/posts?category=health              → all health-category posts
GET /api/v1/posts?postType=testimony&category=health  → health testimonies
```

### D5 — Sticky behavior: both filters together as a single block

A single sticky wrapper contains both RoomSelector and CategoryFilterBar:

```tsx
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

**Why a single sticky:**

- Simpler implementation; no offset coordination between two stickies
- More predictable on mobile (keyboard appearance, viewport changes)
- Existing `isFilterSticky` observer continues to work — the wrapper structure is the same, just contains more children
- One shadow appears below the entire block when scrolled, not per-bar

**Don't:** make RoomSelector and CategoryFilterBar separately sticky. The interaction is hard to debug and breaks scroll-jank optimizations.

### D6 — 'All' pill: no `?postType=` param (NOT explicit 'all' value)

When 'All' is selected, the URL has no `?postType=` parameter. Selecting a specific room ADDS the param. Switching back to 'All' DELETES the param.

**Why absent param vs explicit 'all' value:**

- Matches existing `?category=` convention (no `?category=all` value; absent param means all categories)
- Cleaner URLs for the default state
- No special-case handling on backend (parameter parsing already handles 'absent' correctly)
- Bookmarkable URLs are cleaner

**Implication for RoomSelector active-state logic:**

```tsx
const activePostType: PostType | null = (
  searchParams.get('postType') as PostType | null
) ?? null

// 'All' pill is active when activePostType === null
const isAllActive = activePostType === null

// Each post-type pill is active when activePostType matches
const isTypeActive = (typeId: PostType) => activePostType === typeId
```

### D7 — No counts on RoomSelector pills (in 4.8)

Unlike CategoryFilterBar (which shows per-category counts when filtered), RoomSelector pills do NOT show counts in 4.8.

**Why no counts:**

- Counts require an extra API call or additional response payload
- The 5 post-type counts aren't as useful as category counts (categories help users find their topic; post types are mode-of-engagement, less search-driven)
- Adds complexity for marginal value
- Future spec can add counts if user research suggests they help

If Eric wants counts, edit D7 before pasting; adds ~1 backend method + ~3 tests + plumbing.

### D8 — RoomSelector accessibility: tablist pattern

Match CategoryFilterBar's existing accessibility pattern (R3). Likely:

- Wrapper has `role='tablist'` (or `role='radiogroup'` if mutually-exclusive selection feel preferred)
- Each pill has `role='tab'` with `aria-selected={isActive}`
- Container has `aria-label='Filter by post type'`
- Active pill is announced as 'tab, selected'
- Tab key cycles through pills (browser default)
- Arrow keys (left/right) move between pills (per WAI-ARIA tablist pattern, if existing CategoryFilterBar implements it)

Plan verifies the existing pattern and matches it. Don't deviate.

### D9 — Layout reorder execution

Per MPD-3. The JSX changes:

**Before (current):**

```tsx
<PrayerWallHero>...</PrayerWallHero>
{/* Composer flow */}
<InlineComposer>...</InlineComposer>

{/* Filter Bar (line 791) */}
<div className="sticky top-0 z-30...">
  <CategoryFilterBar />
</div>

{/* QOTD Card (line 853) */}
<div className="mb-4">
  <QuestionOfTheDay />
</div>

{/* Feed */}
<Feed />
```

**After (4.8):**

```tsx
<PrayerWallHero>...</PrayerWallHero>
{/* Composer flow */}
<InlineComposer>...</InlineComposer>

{/* QOTD Card — always visible (moved up) */}
<div className="mb-4">
  <QuestionOfTheDay />
</div>

{/* Filter Bar — RoomSelector + CategoryFilterBar, both sticky together */}
<div className="sticky top-0 z-30...">
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

{/* Feed */}
<Feed />
```

The move is mechanical: cut the QOTD JSX block, paste it above the Filter Bar block, add RoomSelector inside the Filter Bar wrapper.

### D10 — Filter persistence in API call

```typescript
// Approximate — plan verifies actual location
const { data: posts } = useQuery({
  queryKey: ['posts', { activePostType, activeCategory }],
  queryFn: () => prayerWallApi.list({
    postType: activePostType ?? undefined,
    category: activeCategory ?? undefined,
  }),
})
```

QueryKey includes both filters so React Query caches separately per combination. Switching filters fetches fresh data; switching back uses cache.

### D11 — Empty-state copy adapts to combined filters

When feed is empty under filtering:

- No filters: 'This space is for you' (existing copy)
- Only postType: 'No testimonies yet' / 'No questions yet' (using POST_TYPES.pluralLabel)
- Only category: 'No prayers in {category} yet' (existing copy)
- Both filters: 'No {pluralLabel} in {category} yet' (e.g., 'No Testimonies in Health yet')

The pattern: single descriptor when only one filter is active; combined descriptor when both. Plan refines copy during execution.

### D12 — Phase 4 cutover checklist content (per Section 16 template)

The checklist file at `_plans/forums/phase04-cutover-checklist.md` contains:

1. Phase summary (one paragraph: what Phase 4 accomplished)
2. Per-spec checklist (4.1–4.8): name, ID, merge date (or PR link), status
3. Feature flag state (any flags introduced? are they on/off? do they need cleanup?)
4. Post-Phase-4 production state (what does Prayer Wall look like now?)
5. Open follow-ups for Phase 5 awareness (any gotchas, deferred items, technical debt)
6. Universal Rule 17 axe-core test status (passing? on which routes?)

Plan generates this from spec-tracker.md and PR history. Section 16 of this brief has a template.

<!-- CHUNK_BOUNDARY_4 -->

---

## 8. Watch-fors

### W1 — All Phase 4 specs (4.1–4.7b) must be ✅ before 4.8 starts

Verify every Phase 4 row in spec-tracker.md is ✅ before starting. 4.8 is the cutover — anything still in flight delays the cutover.

If 4.7b is still ⬜, ship it first. If any other spec is still ⬜, complete it first.

### W2 — Don't remove CategoryFilterBar; nest it

CategoryFilterBar continues to work. 4.8 doesn't replace it; it adds RoomSelector ABOVE it in the same sticky wrapper.

If CC interprets 'CategoryFilterBar moves below the room selector' as 'CategoryFilterBar gets removed', reject. Both filters coexist.

### W3 — Don't make `?postType=` and `?category=` mutually exclusive

Per D4 / AC #5. Both filters can be active simultaneously. Selecting a room doesn't clear the category. Selecting a category doesn't clear the post type.

If CC writes `setSearchParams` logic that deletes one when setting the other, reject. Each filter manages its own param independently.

### W4 — Don't introduce a third filter dimension

4.8 is RoomSelector + CategoryFilterBar. Nothing else. Don't add:

- Date range filter
- Author filter
- Reaction count threshold
- Sort order toggle
- Search input

These are future features. 4.8 stays scoped to the master plan body's AC list.

### W5 — Don't render `?postType=` invalid values

If the URL has `?postType=banana`, the RoomSelector should:

- Default to 'All' active (treat as if no postType param)
- NOT render an unknown pill
- Optionally: log a console warning OR rewrite the URL to remove the invalid param

If CC tries to render an unknown pill, reject. Defensive: validate against POST_TYPES.

### W6 — Don't break the existing isFilterSticky observer

Per R12. The observer fires when the sticky wrapper's offset crosses a threshold. After 4.8, the wrapper is taller (RoomSelector + CategoryFilterBar) but its position from the top of the page is the same.

If CC changes the observer's target element or threshold, reject unless there's a documented reason. Most likely the observer continues to work without changes.

### W7 — Don't introduce sticky-jitter on mobile

Mobile sticky behavior is fragile. Common bugs:

- Filter bar appears to flicker when scrolling fast (rendering thrash)
- Filter bar offset is wrong when keyboard appears (viewport changes)
- Filter bar covers content under it when navigating from another page (initial scroll position)

Verify on real mobile (or Playwright mobile viewport) during /verify-with-playwright.

### W8 — Don't ship without moving QOTD up

Per MPD-3. The layout reorder is part of the spec, not optional. If CC ships RoomSelector + CategoryFilterBar in the right place but forgets to move QOTD above, the visual hierarchy is wrong (QOTD ends up below the sticky filters and gets occluded on scroll).

Verify QOTD JSX block is now BEFORE the Filter Bar JSX block in PrayerWall.tsx.

### W9 — Don't change CategoryFilterBar's API

CategoryFilterBar's props (`activeCategory`, `onSelectCategory`, `categoryCounts`, `showCounts`) stay exactly as-is. 4.8 doesn't modify CategoryFilterBar's component file beyond its position in PrayerWall.tsx (which doesn't even change — only its parent wrapper does).

If CC modifies CategoryFilterBar's props or behavior, reject. The component is shipped infrastructure.

### W10 — Don't break the URL on history navigation

Back/forward should restore the filter state. React Router's `useSearchParams` handles this automatically; if CC implements a custom URL state management on top, history navigation may break.

Verify in /verify-with-playwright: select Testimonies room → select Health category → hit back button → verify URL and UI restore previous state correctly.

### W11 — Don't pre-fetch all rooms on mount

The queryKey includes both filters; React Query fetches per (postType, category) combination on demand. Don't pre-fetch all 6 room views eagerly — that's 6x the API load on every page mount.

If CC adds `prefetchQuery` calls for every room, reject. Lazy fetching on selection is correct.

### W12 — Don't add room-selection analytics in 4.8

No new analytics events for room selection. If you want to track which rooms users prefer, that's a future spec.

### W13 — Don't change post creation behavior based on selected room

Selecting 'Testimonies' room doesn't pre-select Testimony in the ComposerChooser (4.7). The composer chooser opens fresh every time and presents all 5 types.

**Why:** the room is a FILTER (consumption), not a CONTEXT (creation). A user reading testimonies might want to share an Encouragement; the chooser respects that intent.

If CC adds 'pre-select chooser based on active room', reject. The chooser's job is to invite intentional selection (per 4.7's D12).

### W14 — Don't remove the 'always visible regardless of filter' QOTD comment

Per R2. The comment at line 853 documents intent. Even after the layout reorder, the comment remains true (QOTD above filters means it's visible in any filter state).

The comment can be lightly refreshed ('QOTD Card — above filters, visible in any filter state'), but its intent should be preserved. Plan can edit; don't remove entirely.

### W15 — Don't add new feature flags in 4.8

This is the cutover. Feature flags introduced in earlier Phase 4 specs (if any) should be cleaned up here, not extended. The cutover checklist documents the flag state.

If CC adds `VITE_USE_ROOM_SELECTOR=true` to gate the RoomSelector behind a flag, reject. Ship it on by default, no toggle.

### W16 — Don't break the empty-state CTAs

From 4.7's R3: there are two FeatureEmptyState instances using 'Share something' (after 4.7's relabeling). Their `onCtaClick` opens the chooser. 4.8 doesn't modify these CTAs themselves, but the empty-state HEADING/DESCRIPTION may need updating per D11 to adapt to combined filters.

If CC changes `onCtaClick` (e.g., 'open chooser pre-selected to room'), reject — that's W13.

### W17 — Don't fail axe-core tests by adding inaccessible markup

The new RoomSelector adds visual elements that may introduce accessibility issues:

- Pills without proper aria attributes
- Color contrast on per-type accents (rose / amber / cyan / violet on white-text)
- Missing labels on interactive elements
- Focus traps if any modal pattern accidentally activates

If the axe-core test fails, fix the markup. Don't disable the test or scope it down.

### W18 — Don't bypass axe-core in CI

The Universal Rule 17 axe-core test should run in CI alongside other Playwright tests. Don't add `test.skip` or `test.only` directives. If CC marks the axe-core test as 'todo' or 'pending', reject — it's a hard requirement for the cutover.

### W19 — Don't write the cutover checklist as a stub

The checklist is a real deliverable. It should:

- List every Phase 4 spec by ID and name
- Include merge dates (from spec-tracker.md or PR history)
- Document feature flag state
- Note the post-Phase-4 production reality
- Surface open follow-ups

If CC writes 'Phase 4 complete. See spec-tracker for details.', reject. The checklist is a permanent reference doc.

### W20 — Don't introduce a 'Welcomer Room' or similar metaphor extension

4.8 stays scoped to the 5 production post types. Future specs may extend the 'Room' metaphor (moderator-only rooms, role-gated rooms, geographic rooms), but 4.8 is a flat 5-type filter.

### W21 — Don't reorganize PrayerWall.tsx beyond the QOTD/filter reorder

The layout reorder is bounded: move QOTD above the filter bar, add RoomSelector inside the filter bar wrapper. Don't take the opportunity to refactor PrayerWall.tsx more broadly.

If CC starts extracting components, renaming variables, splitting the file, etc., reject — that's scope creep.

### W22 — Don't break the Phase 5 prerequisite chain

Phase 5 (Visual Migration) starts with Spec 5.0 (Architecture Context Refresh) and includes 5.1, 5.3, 5.4, 5.5. Phase 5 prereq is 'Phase 4 complete'. After 4.8 ships, Phase 5 is unblocked.

If 4.8 changes the visual structure of PrayerWall.tsx in ways that conflict with Phase 5's planned visual migration (e.g., introducing new card-like components that should use FrostedCard), Phase 5 inherits the cleanup.

**Mitigation:** RoomSelector pills are simple `<button>` elements, not cards. They don't introduce new card patterns that Phase 5 would need to migrate.

### W23 — Don't merge 4.8 with any axe-core violations on the listed routes

Section 3 #11 lists three routes: `/prayer-wall`, `/prayer-wall?postType=testimony`, `/prayer-wall?postType=encouragement&category=mental-health`. The axe-core scan must return ZERO violations on all three.

If there are pre-existing violations from earlier specs, fix them as part of 4.8 (since the cutover gate requires the test to pass). This may grow scope; surface the violations during /code-review.

<!-- CHUNK_BOUNDARY_5 -->

---

## 9. Test specifications

Target: ~28 tests. Master plan AC says ≥16; the surface justifies more given the cutover deliverable.

### Frontend tests

**`frontend/src/components/prayer-wall/__tests__/RoomSelector.test.tsx`** (NEW — ~10 tests):

- Renders all 6 pills in canonical order (All, Prayer Requests, Testimonies, Questions, Discussions, Encouragements)
- Default state: 'All' pill is active
- Each pill has correct accent color
- Each pill has min-h-[44px] / min-w-[44px] (touch target)
- Each pill is a `<button>` with aria-selected reflecting state
- Tapping a pill calls onSelectPostType with the correct value
- Tapping 'All' pill calls onSelectPostType with null
- Tab key cycles focus through pills
- Enter / Space activates focused pill
- Active pill has visual distinction (filled background or strong border)

**`frontend/src/pages/__tests__/PrayerWall.test.tsx`** (UPDATE — add ~9 tests):

- RoomSelector renders above CategoryFilterBar in DOM order
- QOTD card renders ABOVE the filter bar wrapper (layout reorder)
- Selecting 'Testimonies' updates URL to `?postType=testimony`
- Selecting 'All' removes `?postType=` from URL (preserves any `?category=`)
- Initial render with `?postType=encouragement` URL: Encouragements pill active
- Initial render with `?postType=invalid` URL: All pill active (defensive)
- Both filters active: `?postType=testimony&category=health` activates both UIs
- API call payload includes postType and category when both active
- Empty-state heading adapts to combined filter ('No Testimonies in Health yet')

**`frontend/src/components/prayer-wall/__tests__/CategoryFilterBar.test.tsx`** (UPDATE — add ~2 tests if needed):

- CategoryFilterBar's API unchanged (regression test)
- CategoryFilterBar still works when nested below RoomSelector

### Frontend Playwright tests

**`frontend/tests/playwright/room-selector.spec.ts`** (NEW — ~4 tests):

- End-to-end: select Testimonies room, verify URL, verify only testimonies in feed
- End-to-end: select Testimonies + Health filter, verify combined filter behavior
- Browser back/forward navigation restores filter state correctly
- Sticky behavior on mobile viewport: both filters remain visible when feed scrolls

**`frontend/tests/playwright/accessibility.spec.ts`** (NEW — ~3 tests):

- axe-core scan on `/prayer-wall` returns zero violations
- axe-core scan on `/prayer-wall?postType=testimony` returns zero violations
- axe-core scan on `/prayer-wall?postType=encouragement&category=mental-health` returns zero violations

### Backend tests (only if R6 reveals filter doesn't exist)

If `?postType=` filter is not yet wired through PostController.list(), add:

- `PostControllerIntegrationTest.list_with_postType_filters_returns_only_that_type` (~1 test)
- `PostSpecificationsTest.byPostType_filters_correctly` (~1 test)
- `PostSpecificationsTest.byPostType_composes_with_byCategory` (~1 test)

Most likely state: filter exists, no backend tests needed.

### Total test budget

- RoomSelector.test.tsx: ~10 new
- PrayerWall.test.tsx: ~9 added
- CategoryFilterBar.test.tsx: ~2 added (regression)
- room-selector.spec.ts: ~4 Playwright
- accessibility.spec.ts: ~3 Playwright (axe-core)
- Backend (defensive): ~3 if filter missing, else 0

**Total: ~28 tests + ~7 Playwright scenarios.** Comfortably exceeds master plan AC of ≥16.

---

## 10. Files to Create / Modify / NOT to Modify / Delete

### Files to Create

**Frontend:**

- `frontend/src/components/prayer-wall/RoomSelector.tsx` — NEW filter component
- `frontend/src/components/prayer-wall/__tests__/RoomSelector.test.tsx` — ~10 tests
- `frontend/tests/playwright/room-selector.spec.ts` — ~4 E2E tests
- `frontend/tests/playwright/accessibility.spec.ts` — ~3 axe-core tests (path varies; verify convention)
- `frontend/src/constants/post-type-pill-accents.ts` (OPTIONAL, depending on D3 implementation — if accents lift to a dedicated constants file)

**Operational:**

- `_plans/forums/phase04-cutover-checklist.md` — NEW Phase 4 cutover deliverable (per Section 16 template)

### Files to Modify

**Frontend:**

- `frontend/src/pages/PrayerWall.tsx` — Major changes:
  - Add `RoomSelector` import
  - Add `activePostType` state derived from `searchParams.get('postType')`
  - Add `handleSelectPostType` callback
  - Move QOTD JSX block above the Filter Bar wrapper (per MPD-3 / D9)
  - Add `<RoomSelector>` inside the Filter Bar wrapper, ABOVE the existing `<CategoryFilterBar>`
  - Update API call (or queryKey / useQuery) to include `postType` filter
  - Update empty-state heading copy to adapt to combined filters (per D11)
- `frontend/src/services/prayer-wall-api.ts` (or wherever the list call lives) — add `postType` to filter args type and thread through to URL params
- `frontend/src/pages/__tests__/PrayerWall.test.tsx` — ~9 tests
- `frontend/src/components/prayer-wall/__tests__/CategoryFilterBar.test.tsx` — 0–2 regression tests
- `frontend/package.json` — add `@axe-core/playwright` to devDependencies (if R8 confirms it's not yet installed)

**Operational:**

- `_forums_master_plan/spec-tracker.md` — flip 4.8 from ⬜ to ✅ AFTER successful merge AND cutover checklist filled in

### Files NOT to Modify

- `frontend/src/components/prayer-wall/CategoryFilterBar.tsx` — props and behavior unchanged (W9)
- `frontend/src/components/prayer-wall/QuestionOfTheDay.tsx` — component unchanged; only its parent wrapper position changes
- `frontend/src/components/prayer-wall/ComposerChooser.tsx` — unchanged (4.7's component; chooser doesn't know about rooms per W13)
- `frontend/src/components/prayer-wall/InlineComposer.tsx` — unchanged
- `frontend/src/components/prayer-wall/PrayerCard.tsx` — unchanged
- `frontend/src/components/prayer-wall/InteractionBar.tsx` — unchanged
- All backend files — unchanged (assuming R6 confirms `?postType=` filter exists)

### Files to Delete

(none)

---

## 11. Acceptance criteria

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
- [ ] Selecting `?postType=` doesn't affect `?category=` (independent params)
- [ ] Selecting `?category=` doesn't affect `?postType=` (independent params)
- [ ] Both params can be active simultaneously: `?postType=X&category=Y`
- [ ] Initial render reads `?postType=` from URL and activates correct pill
- [ ] Invalid `?postType=` value defaults to 'All' active (defensive)
- [ ] Browser back / forward restores filter state correctly

**Layout:**

- [ ] QOTD card renders ABOVE the sticky filter bar
- [ ] RoomSelector renders inside the sticky filter bar wrapper, ABOVE CategoryFilterBar
- [ ] CategoryFilterBar renders inside the same sticky wrapper, BELOW RoomSelector
- [ ] Both filters are sticky together as a single block
- [ ] When scrolling: shadow appears below the entire sticky block
- [ ] When scrolling: QOTD scrolls naturally (not sticky)

**Filter behavior:**

- [ ] Selecting 'Testimonies' filters feed to only testimony posts
- [ ] Selecting 'All' shows all post types
- [ ] Combined filter (postType + category) intersects correctly
- [ ] API call includes both filter params when both active
- [ ] React Query caches per (postType, category) combination
- [ ] Empty-state heading adapts to filter state per D11

**Accessibility:**

- [ ] RoomSelector wrapper has `role='tablist'` (or matches existing CategoryFilterBar pattern)
- [ ] Container has `aria-label='Filter by post type'`
- [ ] Active pill announced as 'tab, selected' or equivalent
- [ ] Reduced-motion preference respected (existing `motion-reduce:transition-none` continues)
- [ ] Focus visible on every pill

**Universal Rule 17 axe-core test:**

- [ ] axe-core scan on `/prayer-wall` returns zero violations
- [ ] axe-core scan on `/prayer-wall?postType=testimony` returns zero violations
- [ ] axe-core scan on `/prayer-wall?postType=encouragement&category=mental-health` returns zero violations
- [ ] Test runs in CI alongside other Playwright tests
- [ ] No `test.skip` or `test.only` directives

**Cutover checklist:**

- [ ] File created at `_plans/forums/phase04-cutover-checklist.md`
- [ ] All Phase 4 specs (4.1–4.8) listed with merge dates
- [ ] Feature flag state documented
- [ ] Post-Phase-4 production state described
- [ ] Open follow-ups listed for Phase 5 awareness
- [ ] Universal Rule 17 axe-core test status documented

**No regressions:**

- [ ] Composer entry flow (4.7 chooser → type-specific composer) still works
- [ ] QOTD composer still works (separate flow)
- [ ] CategoryFilterBar behavior unchanged (regression test passes)
- [ ] Bookmark, reaction, comment flows unchanged
- [ ] Per-type chrome renders correctly under filtered views
- [ ] All 5 post types createable from any filter view
- [ ] Existing PrayerWall tests pass without modification

**Brand voice:**

- [ ] All pill labels pass pastor's wife test
- [ ] No exclamation, no urgency, no comparison, no jargon
- [ ] No gamification copy ('Trending: Testimonies') or pressure ('Pick a room!')

**Visual verification:**

- [ ] All 12 scenarios in Section 3 pass
- [ ] Mobile sticky behavior verified (no jitter, no offset issues with keyboard)
- [ ] Desktop one-row pill layout verified

**Operational:**

- [ ] `_forums_master_plan/spec-tracker.md` 4.8 row flipped from ⬜ to ✅ as the final step (only AFTER cutover checklist is filled in)

---

## 12. Out of scope

Explicit deferrals — do NOT include any of these in 4.8:

- **Per-room counts on RoomSelector pills** — D7; future spec if user research suggests value
- **Sort order toggle** (Newest / Most Active / Most Reacted) — W4
- **Date range filter** — W4
- **Author filter** — W4
- **Search input** — W4
- **Pre-selecting chooser based on active room** — W13; consumption ≠ creation context
- **Per-room analytics events** — W12
- **Feature flag for RoomSelector** — W15; ship on by default
- **Removing CategoryFilterBar** — W2; both filters coexist
- **Welcomer Room or other metaphor extensions** — W20
- **Refactoring PrayerWall.tsx beyond layout reorder** — W21
- **Pre-fetching all 6 room views** — W11
- **Adding new feature flags** — W15
- **Visual migration to FrostedCard / Phase 5 patterns** — deferred to Phase 5; 4.8 ships current visual baseline
- **Per-room hero images or banners** — future polish
- **Per-room composer pre-selection** — W13
- **Saved filter combinations** ('Save this filter as my default') — future feature
- **Filter chips showing active filter state** ('Filtered by: Testimonies, Health [x]') — the existing pill UIs are sufficient
- **A11y tree announcement when filter changes** beyond what `aria-selected` provides — future enhancement

---

## 13. Brand voice quick reference (pastor's wife test)

The RoomSelector is the user's primary navigation across post types. Voice must feel like a calm, neutral way-finder.

**Anti-patterns to flag during /code-review:**

- 'Browse our Rooms!' (cheerleader voice; transactional)
- 'Pick a room to get started' (pressure-coded; presumes obligation)
- 'Trending: Testimonies (47 today!)' (gamification; comparison)
- '✨ New room: Encouragements!' (marketing voice)
- 'Filter by: Post Type' (jargon-leaning; 'Post Type' is dev language)
- 'Show me everything' (vs the simpler 'All')

**Good copy in 4.8:**

- Pill labels (the actual surface): 'All', 'Prayer Requests', 'Testimonies', 'Questions', 'Discussions', 'Encouragements' — plain plurals, no decoration
- Container aria-label: 'Filter by post type' (even though 'post type' is dev-coded, screen reader announcement convention favors clarity)
- Empty-state copy adapts per D11: 'No Testimonies yet' / 'No Health Testimonies yet' — calm fact, not pressure

The pill labels themselves are the entire visible copy for RoomSelector. There's no description, no helper text, no instructional copy. Simplicity is the design.

**The 'All' pill** is intentionally plain. Not 'Show All', not 'Everything', not 'View All Posts'. Just 'All'. Single word, anchor position, no pressure.

---

## 14. Tier rationale

Run at **High**. Justifications:

**Why not Standard:**

- Layout reorder is mechanical but easy to miss (Standard tier sometimes ships RoomSelector without moving QOTD up; per W8 / MPD-3)
- Dual-filter URL state independence is the spec's most subtle UX concern (Standard tier sometimes makes them mutually exclusive; per W3 / D4)
- 'All' pill semantics has two valid implementations; the brief locks one in (Standard tier sometimes picks the explicit-value approach; per D6)
- Sticky scroll behavior with two stacked filter bars on mobile is non-trivial (Standard tier sometimes ships independent stickies; per D5)
- Cutover checklist is a real deliverable (Standard tier ships a stub; per W19)
- Universal Rule 17 axe-core test is an objective gate (Standard tier sometimes skips or scopes down; per W18)
- Brand voice on pill labels is sensitive (Section 13 anti-patterns)

**Why not xHigh:**

- All architectural patterns are established (URL searchParams, sticky scroll, pill component shape from CategoryFilterBar)
- Pure frontend (assuming R6 confirms backend filter)
- No schema, no migration, no novel coordination
- Layout reorder is mechanical (cut/paste JSX blocks)
- Cutover deliverable is a markdown doc
- The brief covers all 23 watch-fors and 12 decisions explicitly

**Override moments — when to bump to MAX:**

- During /plan or /execute, if CC ships RoomSelector without moving QOTD up (MPD-3 / W8)
- If CC implements `?postType=` and `?category=` as mutually exclusive (W3 / D4)
- If CC removes CategoryFilterBar instead of nesting it (W2)
- If CC ships the cutover checklist as a stub (W19)
- If axe-core test fails and CC tries to disable instead of fix (W18)
- If brand voice drifts to gamification / pressure (Section 13)

---

## 15. Recommended planner instruction

Paste this as the body of `/spec-forums spec-4-8`:

```
/spec-forums spec-4-8

Write a spec for Phase 4.8: Room Selector and Phase 4 Cutover. Read /Users/Eric/worship-room/_plans/forums/spec-4-8-brief.md as the source of truth. Treat the brief as binding. Where the master plan body and the brief diverge, the brief wins.

Tier: High.

Branch: stay on `forums-wave-continued`. Do not run any git mutations. Eric handles git manually.

This is the Phase 4 cutover. After 4.8 ships, Phase 4 is COMPLETE.

Prerequisites:
- ALL Phase 4 specs (4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.6b, 4.7, 4.7b) must be ✅ in spec-tracker.md
- If ANY are still ⬜, STOP. Don't proceed.

Recon checklist (re-verify on disk before starting; brief recon was on date 2026-05-09):

1. `frontend/src/pages/PrayerWall.tsx` — confirm CategoryFilterBar at line 791-802, QOTD at line 853-860, ComposerChooser imported at line 16
2. `frontend/src/components/prayer-wall/CategoryFilterBar.tsx` — read existing pattern (pill markup, accessibility, responsive behavior); RoomSelector mirrors this
3. `frontend/src/constants/post-types.ts` — confirm POST_TYPES has `pluralLabel` field on all 5 types
4. Backend `?postType=` filter — verify by reading PostSpecifications.byPostType() (path varies; likely `backend/src/main/java/com/worshiproom/post/PostSpecifications.java`) and PostController.list() to confirm filter is wired through. If not wired, scope grows by 1 backend method + 3 backend tests.
5. Existing axe-core integration — grep `frontend/` for `axe-core|@axe-core|toHaveNoViolations`. If zero matches, 4.8 establishes the pattern with `@axe-core/playwright` integration.
6. spec-tracker.md — verify all Phase 4 specs are ✅ with merge dates (for cutover checklist generation)
7. PrayerWall.tsx isFilterSticky observer — identify source (IntersectionObserver or scroll listener); verify it continues to work with the expanded sticky wrapper
8. URL state pattern — verify `?category=` setSearchParams approach (preserves other params); 4.8's `?postType=` mirrors exactly
9. List API call location — identify where PrayerWall.tsx calls the list endpoint (likely a hook or `prayer-wall-api.ts`); 4.8 adds `postType` to filter args
10. CLAUDE.md or similar — search for 'Universal Rule 17' or 'axe-core' to understand the standard

Spec output structure:

- Title and metadata (size L, risk Medium, prerequisites all of Phase 4, branch forums-wave-continued)
- Goal — Add RoomSelector at top of feed (filtering by postType); reorder layout (QOTD above filters); ship Phase 4 cutover deliverables (checklist + axe-core test)
- Approach — New RoomSelector component (mirrors CategoryFilterBar pattern); single sticky wrapper containing both filters; QOTD moves up; URL state via independent `?postType=` and `?category=` params; cutover checklist documents post-Phase-4 production state; Universal Rule 17 axe-core test passes
- Files to create / modify / NOT to modify (per brief Section 10)
- Acceptance criteria (per brief Section 11)
- Test specifications (per brief Section 9 — ~28 tests + ~7 Playwright)
- Out of scope (per brief Section 12)
- Out-of-band notes for the executor:
  - 4.8 is BOTH RoomSelector feature AND Phase 4 cutover (MPD-1)
  - Cutover checklist path is `_plans/forums/`, not `_plans/forums-wave/` (MPD-2)
  - Layout reorder: QOTD moves above filters (MPD-3, D9, W8)
  - Universal Rule 17 axe-core test passes is a hard gate (MPD-4, W18)
  - Both filters can be active simultaneously; never mutually exclusive (D4, W3)
  - 'All' pill = absent `?postType=` param, NOT explicit 'all' value (D6)
  - Single sticky wrapper containing both filters; not two independent stickies (D5)
  - All 23 watch-fors must be addressed

Critical reminders:

- Use single quotes throughout TypeScript and shell.
- Test convention: `__tests__/` colocated with source files; Playwright tests in `frontend/tests/playwright/`.
- Tracker is source of truth. Eric flips ⬜→✅ after merge AND cutover checklist filled in.
- Eric handles all git operations manually.
- This is the Phase 4 cutover. Don't introduce new feature flags or scope creep.
- After 4.8 ships, Phase 5 (Visual Migration) begins with Spec 5.0 (Architecture Context Refresh).

After writing the spec, run /plan-forums spec-4-8 with the same tier (High).
```

---

## 16. Verification handoff and Phase 4 cutover checklist template

### Verification handoff

After /code-review passes, run:

```
/verify-with-playwright spec-4-8
```

The verifier exercises Section 3's 12 visual scenarios. Verifier writes to `_plans/forums/spec-4-8-verify-report.md`.

If verification flags any of:
- RoomSelector ships but QOTD didn't move up (W8 / MPD-3)
- `?postType=` and `?category=` are mutually exclusive (W3 / D4)
- CategoryFilterBar removed instead of nested (W2)
- Cutover checklist is a stub (W19)
- axe-core test fails on any of the three listed routes (W17, W23)
- Sticky-jitter on mobile (W7)
- Brand voice anti-patterns on pill labels (Section 13)

Abort and bump to MAX. Those are the canonical override moments.

For the cutover specifically, the verifier should:

1. Confirm `_plans/forums/phase04-cutover-checklist.md` exists
2. Confirm checklist content includes all Phase 4 specs with merge dates
3. Confirm axe-core test is integrated into CI Playwright run
4. Confirm spec-tracker.md flip from ⬜ to ✅ has happened (or is queued for Eric to do post-merge)

If any of these are missing, treat as a hard fail.

### Phase 4 Cutover Checklist Template

This is the template for `_plans/forums/phase04-cutover-checklist.md`. Plan generates the actual content from spec-tracker.md and PR history.

```markdown
# Phase 4 Cutover Checklist — Forums Wave

**Phase complete:** YYYY-MM-DD (date 4.8 merged)
**Branch:** forums-wave-continued (long-lived working branch)

## Phase summary

Phase 4 transformed Prayer Wall from a single-mode prayer-request feed into a five-room community space. Users now create posts in five distinct types (Prayer Request, Testimony, Question, Discussion, Encouragement), filter the feed by both post type (room) and topical category (existing), and the per-type chrome / interaction patterns / composer affordances are coherent across all five.

## Per-spec status

| Spec | ID | Name | Status | Merge date | PR / branch |
| ---- | -- | ---- | ------ | ---------- | ----------- |
| 4.1 | round3-phase04-spec01-post-type-foundation | Post Type Foundation | ✅ | YYYY-MM-DD | (link) |
| 4.2 | round3-phase04-spec02-prayer-request-polish | Prayer Request Polish | ✅ | YYYY-MM-DD | (link) |
| 4.3 | round3-phase04-spec03-testimony-post-type | Testimony Post Type | ✅ | YYYY-MM-DD | (link) |
| 4.4 | round3-phase04-spec04-question-post-type | Question Post Type | ✅ | YYYY-MM-DD | (link) |
| 4.5 | round3-phase04-spec05-devotional-discussion | Devotional Discussion | ✅ | YYYY-MM-DD | (link) |
| 4.6 | round3-phase04-spec06-encouragement | Encouragement Post Type | ✅ | YYYY-MM-DD | (link) |
| 4.6b | round3-phase04-spec06b-image-upload | Image Upload for Testimonies & Questions | ✅ | YYYY-MM-DD | (link) |
| 4.7 | round3-phase04-spec07-composer-chooser | Composer Chooser | ✅ | YYYY-MM-DD | (link) |
| 4.7b | round3-phase04-spec07b-ways-to-help-mvp | Ways to Help MVP | ✅ | YYYY-MM-DD | (link) |
| 4.8 | round3-phase04-spec08-room-selector-cutover | Room Selector + Phase 4 Cutover | ✅ | YYYY-MM-DD | (link) |

## Feature flag state

[Enumerate any feature flags introduced during Phase 4. Most likely state: zero new flags. The `?debug-post-type` query param shim was an in-code instrument; it was removed in 4.7. No `VITE_USE_*` flags introduced.]

## Post-Phase-4 production state

Prayer Wall now ships:

- Five distinct post types: Prayer Request, Testimony, Question, Discussion, Encouragement
- Per-type chrome: rose / amber / cyan / violet / white wash on cards
- Per-type icons: HandHelping / Sparkles / HelpCircle / MessagesSquare / Heart
- Per-type reaction labels in InteractionBar (e.g., 'Heart' for Encouragement, 'Amen' for Testimony)
- ComposerChooser as the production entry point for all 5 types (4.7)
- WaysToHelpPicker on prayer_request composer with 5-tag enum (Meals, Rides, Errands, Visits, Just prayer please) (4.7b)
- Image uploads with proxied storage, three renditions, PII stripping, alt text required (testimony + question only) (4.6b)
- Encouragement type with 24-hour expiry, 280-char limit, no comments, no anonymous (4.6)
- Discussion type with scripture reference field with debounced WEB chapter loading (4.5)
- Question type with resolved badge and atomic-resolve flow (4.4)
- Testimony type with amber/Sparkles/5000-char composer (4.3)
- RoomSelector at top of feed, filtering by `?postType=` URL param (4.8)
- CategoryFilterBar nested below RoomSelector, both sticky together (4.8)
- QOTD card visible above filters in any filter state (4.8)
- Both filters compose: `?postType=X&category=Y` filters by both intersect (4.8)

## Open follow-ups for Phase 5 awareness

- All Phase 5 specs gated on Phase 4 complete (this checklist marks the gate as cleared)
- No FrostedCard migration done in Phase 4 — Phase 5 Spec 5.1 handles this
- No 2-line heading treatment applied — Phase 5 Spec 5.3 handles this
- No animation token migration — Phase 5 Spec 5.4 handles this
- BackgroundCanvas was shipped in Spec 14 (out-of-band) — Phase 5 Spec 5.2 is closed
- Deprecated patterns partial-purge in Spec 14 — Phase 5 Spec 5.5 finishes the sweep

## Universal Rule 17 axe-core test status

- Test file: `frontend/tests/playwright/accessibility.spec.ts`
- Routes scanned: `/prayer-wall`, `/prayer-wall?postType=testimony`, `/prayer-wall?postType=encouragement&category=mental-health`
- Status: ✅ zero violations as of YYYY-MM-DD
- Integration: runs in CI alongside other Playwright tests; failure blocks merge

## Sign-off

- [ ] All Phase 4 specs ✅ (verified above)
- [ ] axe-core smoke test passes on all listed routes
- [ ] Cross-device manual test: post on laptop, see on phone, all 5 types render correctly
- [ ] No feature flags requiring cleanup
- [ ] No technical debt items unaddressed
- [ ] Phase 5 unblocked

Phase 4 closed: YYYY-MM-DD
```

---

## Prerequisites confirmed (as of 2026-05-09 brief authorship)

- ✅ 4.1, 4.3, 4.4 shipped per spec-tracker (from prior briefs)
- ⬜ 4.2, 4.5, 4.6, 4.6b, 4.7, 4.7b — ALL must be ✅ before 4.8 starts (4.8 is the Phase 4 cutover)
- ComposerChooser imported in PrayerWall.tsx line 16 confirms 4.7 has shipped on this clone (R5)
- CategoryFilterBar at PrayerWall.tsx lines 791-802 with sticky wrapper is the existing pattern (R1)
- QOTD currently at lines 853-860, BELOW the filter bar (R2). 4.8 moves it ABOVE (MPD-3, D9)
- Backend `?postType=` filter likely exists per R6 (verify in plan recon)
- POST_TYPES has `pluralLabel` field per R7 (4.1 established)
- No existing axe-core integration; 4.8 establishes it (R8, MPD-4)
- The Universal Rule 17 reference is a project-wide standard; verify in plan recon
- The `?category=` URL param pattern is the reference for `?postType=` (R11)
- The isFilterSticky observer continues to work without changes (R12)

**Brief authored:** 2026-05-09, on Eric's personal laptop. Companion to Spec 4.3, 4.4, 4.5, 4.6, 4.6b, 4.7, 4.7b briefs. Final Phase 4 spec — 4.8 ships the RoomSelector feature AND closes Phase 4 with a cutover checklist + Universal Rule 17 axe-core accessibility smoke test. After 4.8 merges and the checklist is filled in, Phase 4 is COMPLETE and Phase 5 (Prayer Wall Visual Migration) is unblocked, starting with Spec 5.0 (Architecture Context Refresh) — a documentation-only orientation prelude that doesn't change code.

The Phase 4 → Phase 5 transition is a natural moment to consider the master plan re-review pass we discussed earlier (~60-90 min Claude Desktop session, targeted patches not rewrite, bump to v3.0). Phase 4 is done; Phase 5's surface is different enough that Phase 4 patches won't immediately re-stale.

**End of brief.**
