# Implementation Plan: BB-48 — Bible Layout and Navigation Fixes

**Spec:** `_specs/bible-layout-and-nav-fixes.md`
**Date:** 2026-04-16
**Branch:** `bible-ux-polish` (continuation — no new branch)
**Design System Reference:** `_plans/recon/design-system.md` (loaded — captured 2026-04-05)
**Recon Report:** N/A (standalone polish follow-up to BB-47)
**Master Spec Plan:** N/A (standalone polish spec after BB-47)

---

## Architecture Context

### BibleLanding page (`/bible`)

- `frontend/src/pages/BibleLanding.tsx` wraps `BibleLandingInner` in `BibleDrawerProvider` + `AuthModalProvider`.
- Content wrapper at **line 147** uses `mx-auto max-w-4xl space-y-8 px-4 pb-16` — narrower than the section divider above it (line 145 uses `max-w-6xl mx-auto`). This is the narrow "floating column" the spec calls out.
- Root layout chain: `<Layout>` (Navbar + SiteFooter) → `<div className="relative min-h-screen bg-dashboard-dark">` → `<BibleLandingOrbs />` + `<BibleHero />` + section divider + inner max-w-4xl column.
- The landing page has NO Reading Plans grid of its own — Reading Plans live on `/grow?tab=plans` (see below). The Bible browser only surfaces `TodaysPlanCard` (active plan nudge) and `ActivePlanBanner` via `BibleHeroSlot`.

### Reading Plans page (`/grow?tab=plans` → `ReadingPlans.tsx`)

- `frontend/src/pages/ReadingPlans.tsx` (267 lines) is the plans grid.
- **Lines 207-212** render `<FilterBar selectedDuration={...} selectedDifficulty={...} onDurationChange={setSelectedDuration} onDifficultyChange={setSelectedDifficulty} />`.
- `FilterBar` lives at `frontend/src/components/reading-plans/FilterBar.tsx` (duration + difficulty toggle buttons). **Keep file, remove render** per spec §Out of Scope.
- **Lines 223-238** render the grid of `<PlanCard />` components.
- The plans list passed to `<FilterBar>` comes from local `useState` (`selectedDuration`, `selectedDifficulty`), filter predicates, `sortedPlans` derived list. After removing the render, the state + filter logic become dead code — remove it so `sortedPlans` simplifies to the unfiltered list.

### PlanCard component

- `frontend/src/components/reading-plans/PlanCard.tsx` (lines 1–99).
- Root element is `<Link to="/reading-plans/{plan.id}">` — keep as `Link`, swap classes.
- Current classes (line 56): `block rounded-xl border border-white/10 bg-white/[0.06] p-6 backdrop-blur-sm transition-shadow motion-reduce:transition-none lg:hover:shadow-md lg:hover:shadow-black/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt/70`.
- Card renders 3 metadata pills at lines 76-86 (`bg-white/10 px-3 py-1 text-xs text-white/50`). These pills ARE the accent element per spec Design Notes — bump text opacity to `text-white/70`.
- Title at line 72: `text-lg font-bold text-white` → spec requires `font-semibold text-white` (weight 600, not 700).

### ReadingPlanDetail page (`/reading-plans/:planId`)

- `frontend/src/pages/ReadingPlanDetail.tsx` (329 lines).
- **Root wrapper at line 181 is `<Layout>` — which mounts Navbar + SiteFooter.** Recon confirms this route already uses the standard Navbar. No `ReaderChrome` usage in this file.
- Step 4 is an **investigation/verification step**: if the Navbar truly renders correctly (lighthouse / Playwright verify), no fix is needed. If the Navbar is rendered but visually hidden (z-index, overflow, background), find and fix the hider.

### ReadingHeatmap (BB-43, My Bible)

- `frontend/src/components/bible/my-bible/ReadingHeatmap.tsx` (lines 1–387).
- `INTENSITY_CLASSES` at lines 14-20 — 5 tiers, all currently `bg-white/5`/`bg-primary/30/50/70/90`.
- `handleCellInteraction` at lines 164-180 — `navigate('/bible')` on today cell click, **no `{ replace: true }`** ✓.
- Tooltip (`HeatmapTooltip`) at lines 332-387 renders `chapterSummary` as **plain text** (lines 367-373) — chapters are NOT clickable today. Spec acceptance requires "Clicking 'Read verses' (or the equivalent chapter-open link) navigates to `/bible/:book/:chapter`". The plan must convert the plain-text chapter summary to inline `<Link>` elements (no `replace`) so the back-nav behavior described in the spec is actually reachable.
- Legend at lines 304-313 consumes the same `INTENSITY_CLASSES` and will auto-update when the class map is swapped.

### ResumeReadingCard ("Open the reader" button)

- `frontend/src/components/bible/landing/ResumeReadingCard.tsx` (55 lines).
- Rendered by `BibleHeroSlot.tsx` only when `isActiveReader` is true (priority 2) OR with an active plan + reader state (priority 1).
- For first-time readers (priority 4), `BibleHeroSlot` renders only `<VerseOfTheDay />` — ResumeReadingCard is not shown. The Books drawer + `QuickActionsRow` provide reader entry points for new users (Genesis 1 is one click away via the Books drawer).
- **Line 42:** button visible text is `Continue`; spec requires `Continue reading {Book} {Chapter}`.
- Line 40 `aria-label` already reads `Continue reading ${book} chapter ${chapter}` — aria-label can be simplified to `undefined` (drop the redundant `aria-label`) now that the visible text carries the same information.

### FrostedCard component (referenced, not directly used here)

- `frontend/src/components/homepage/FrostedCard.tsx` — class map: `bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] rounded-2xl`. Spec acceptance AC #3 calls for `bg-white/5` (0.05). Plan applies classes inline to PlanCard (not the component wrapper) to match spec acceptance exactly.

### Animation tokens

- `frontend/src/constants/animation.ts` exports `DURATION_BASE` (300ms `transition-all duration-base`), `EASE_STANDARD`, etc. Any new transition in PlanCard must use these tokens (Tailwind: `duration-base`, `motion-reduce:transition-none`).

### Test patterns

- Tests use Vitest + RTL. Integration tests render with `<MemoryRouter>` or through `<App />`.
- Existing test files:
  - `frontend/src/pages/__tests__/ReadingPlans.test.tsx` — will need updates when filters are removed.
  - `frontend/src/components/bible/my-bible/__tests__/ReadingHeatmap.test.tsx` — heatmap color tests must update.
  - `frontend/src/pages/__tests__/BibleLanding.test.tsx` — may reference container width; verify no breakage.
  - `frontend/src/components/bible/landing/__tests__/ResumeReadingCard.test.tsx` — button label assertion must update.
  - `frontend/src/pages/__tests__/ReadingPlanDetail.test.tsx` — add assertion for Navbar presence.
  - `frontend/src/components/reading-plans/__tests__/FilterBar.test.tsx` (if exists) — stays in place; component file kept.

### Auth gating

No auth behavior changes. Every change in this plan is unauthenticated-safe and does not alter any auth gate. Matches spec §Auth Gating.

---

## Auth Gating Checklist

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Browse `/bible` (full-width layout) | No auth change | Step 1 | N/A |
| Open a reading plan card | No auth change | Steps 2, 3 | N/A |
| Click heatmap "Read verses" tooltip chapter | No auth change | Step 6 | N/A |
| Click "Continue reading {Book Chapter}" | No auth change | Step 7 | N/A |

No new or removed auth gates. Spec §Auth Gating confirms zero auth behavior change. Bible-wave auth posture in `02-security.md` is preserved.

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| BibleLanding content column | max-width | `max-w-6xl` (matches section divider at line 145) | `09-design-system.md` § Section Dividers |
| PlanCard container | classes | `block rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition-[background-color,border-color] duration-base motion-reduce:transition-none hover:bg-white/[0.08] hover:border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-dashboard-dark` | spec §Requirements #3 |
| PlanCard title | classes | `text-lg font-semibold text-white` | spec AC #4 |
| PlanCard description | classes | `mt-1 line-clamp-2 text-sm text-white/70` | spec §Requirements #3 |
| PlanCard pill accent | classes | `rounded-full bg-white/10 px-3 py-1 text-xs text-white/70` | spec §Requirements #3 + Design Notes |
| Heatmap tier 0 (empty) | bg | `bg-white/10` | spec §Requirements #6 |
| Heatmap tier 1 (1-2 chapters) | bg | `bg-white/20` | spec §Requirements #6 |
| Heatmap tier 2 (3-5 chapters) | bg | `bg-white/[0.35]` (interpolated — see Edge Cases; updated in Step 8b post-review fix) | derived from spec |
| Heatmap tier 3 (6-10 chapters) | bg | `bg-white/50` (spec "moderate" — updated in Step 8b post-review fix) | spec AC #9 |
| Heatmap tier 4 (11+ chapters) | bg | `bg-white` | spec §Requirements #6 |
| Heatmap tooltip chapter link | classes | `inline-flex min-h-[28px] items-center text-white underline underline-offset-2 hover:text-white/80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/50` | design-system.md § White text + focus ring pattern |
| ResumeReadingCard button text | copy | `Continue reading {book} {chapter}` | spec §Requirements #7 |
| PlanCard transition duration | value | `duration-base` (300ms) | `constants/animation.ts` (BB-33) |

**No [UNVERIFIED] values.** Tier 2 and Tier 3 opacities are interpolated between the spec-specified empty/light/moderate/heavy values because the code has 5 threshold levels; the interpolation is documented in Edge Cases.

---

## Design System Reminder

The executor must respect these project-specific rules. These prevent past deviations:

- **Do NOT introduce a new card component.** PlanCard stays as a `<Link>` with inline classes (not wrapped in `FrostedCard` component). Spec §Out of Scope: "If the existing FrostedCard fits, reuse it; otherwise apply classes inline."
- **Do NOT add BackgroundSquiggle, GlowBackground, or HorizonGlow to the Bible landing.** BibleLanding uses `BibleLandingOrbs` — keep that layer untouched.
- **Do NOT hardcode `200ms` or `transition-all`.** Use `duration-base` (300ms) + `motion-reduce:transition-none` per BB-33.
- **Do NOT use `text-primary-lt` on Reading Plan card pill accents.** Spec uses `text-white/70`. Any primary-colored treatment on these pills is the deprecated "ugly color" the spec is removing.
- **Do NOT replace the standard Navbar with ReaderChrome on any Bible-section route except BibleReader.** `ReaderChrome` is scoped to `/bible/:book/:chapter` only.
- **Do NOT add `{ replace: true }` to any heatmap navigation.** All heatmap chapter links and the today-cell navigate call must preserve history.
- **Do NOT remove the `FilterBar.tsx` component file.** Spec §Out of Scope: keep file for possible reuse when plan count grows.
- **Do NOT change the heatmap activity-tier thresholds.** Spec §Requirements #6: "Activity-tier thresholds MUST match whatever the heatmap currently uses — this is a color-only change, not a threshold change."
- **Do NOT add any new palette color (emerald, etc.)** — spec explicitly rejected Option B.
- **Focus-visible rings are mandatory** on PlanCard and every new heatmap tooltip Link (`focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-dashboard-dark` or the 1px tooltip variant).
- **Match y-alignment discipline:** PlanCard pills sit inline in a `flex flex-wrap` row (line 75). After text-opacity change, verify pills still share y at desktop via `/verify-with-playwright`.

---

## Shared Data Models

No new types. No new localStorage keys. Reads existing:

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_bible_last_read` | Read | Used by `useLastRead()` → ResumeReadingCard to compute book/chapter for the new button label (already wired) |
| `wr_chapters_visited` | Read | Used by heatmap + tooltip (already wired) |

No new reactive stores; no new subscribe patterns; BB-45 anti-pattern is not introduced.

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | BibleLanding fills full viewport (no max-w kicks in yet). Plan cards stack single column (existing `grid-cols-1`). Heatmap cells scale down per existing BB-43 mobile rules. ReadingPlanDetail uses mobile drawer via Navbar. |
| Tablet | 768px | BibleLanding fills up to `max-w-6xl` (effectively full width at 768px — cap is 1152px). Plan cards render 2-column (existing `sm:grid-cols-2`). Heatmap cells at tablet size. |
| Desktop | 1440px | BibleLanding fills up to `max-w-6xl` (1152px) — content centered with background edge-to-edge from `bg-dashboard-dark` on the outer wrapper. Plan cards stay 2-column (no grid breakpoint change in this spec). |

**Custom breakpoints:** none introduced.

---

## Inline Element Position Expectations

| Element Group | Elements | Expected y-alignment | Wrap Tolerance |
|---------------|----------|---------------------|----------------|
| PlanCard pill row | Duration pill, Difficulty pill, Theme pill | Same y ±5px at 1440px and 768px | Wrapping below 400px acceptable (pills go to row 2) |
| Heatmap tooltip chapter row | Chapter Links (up to 5) + "+N more" text | Same y ±5px within tooltip | Wrapping across 2 lines acceptable if tooltip content exceeds tooltip width |
| ResumeReadingCard action row | "Continue reading {book} {chapter}" button + "Or read the next chapter" link | Same y ±5px at sm:+ (640px+). Existing `flex-col sm:flex-row` stacks below 640px | N/A below 640px (intentional) |
| Bible browser content column | Hero, streak chip, hero slot, TodaysPlanCard, QuickActionsRow, BibleSearchEntry | Content centered horizontally with `max-w-6xl` cap | N/A (vertical stack only) |

---

## Vertical Rhythm

Bible browser vertical rhythm is governed by `space-y-8` on the content column (line 147). Widening `max-w-4xl` → `max-w-6xl` does not change vertical spacing. No rhythm values change.

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| BibleHero → section divider | `pt-0` (direct) | `BibleLanding.tsx:142-145` |
| Section divider → content column top | `space-y-8` (32px) handles inner children spacing | `BibleLanding.tsx:147` |
| Content column children (hero slot → TodaysPlan → QuickActions → Search) | Each `space-y-8` (32px) | `BibleLanding.tsx:147` |
| PlanCard top → description | `mb-3` (12px) + `mt-1` | `PlanCard.tsx:72-75` |
| PlanCard description → pill row | `mt-3` (12px) | `PlanCard.tsx:75` |

No gap value changes in this spec.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] Branch `bible-ux-polish` is checked out and BB-47 work is committed (per spec §Depends on).
- [ ] BB-47's `ScrollToTop` component is in place and mounted in `App.tsx`.
- [ ] All auth-gated actions from the spec are accounted for (none — spec changes no auth behavior).
- [ ] Design system values verified from `_plans/recon/design-system.md` (loaded, captured 2026-04-05).
- [ ] No [UNVERIFIED] values remain — all values sourced from spec or design system.
- [ ] No deprecated patterns introduced (no ReaderChrome on non-BibleReader routes, no `animate-glow-pulse`, no GlowBackground on Bible landing, no emerald palette, no `{ replace: true }` on heatmap nav).
- [ ] ReadingPlanDetail `/reading-plans/:planId` is reachable and ReadingPlans `/grow?tab=plans` renders today before changes begin (baseline sanity check).

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Max-width target for BibleLanding | `max-w-6xl` (not `max-w-7xl`) | Matches the section divider at line 145 (`max-w-6xl mx-auto`). Keeps content centered and visually coherent with the existing Bible hero landing pattern. |
| Card background opacity | `bg-white/5` (0.05) — match spec AC exactly | Spec acceptance AC #3 specifies `rgba(255,255,255,0.05)`. FrostedCard component uses `bg-white/[0.06]`. Apply classes inline with spec-specified `bg-white/5` rather than importing FrostedCard. |
| PlanCard accent choice | Existing category pills (all cards use pills — no top border) | Spec §Design Notes: "accent is consistent across cards (all pills or all top borders — not a mix)". Pills already exist; only change is `text-white/50` → `text-white/70` to make them more visible. No top border added. |
| PlanCard transition property | `transition-[background-color,border-color]` (not `transition-all`) | Limits reflow; ensures only hover color changes animate. Matches FrostedCard's targeted approach. Keeps existing `transition-shadow motion-reduce:transition-none` pattern as prior art. |
| PlanCard hover shadow | Removed (`lg:hover:shadow-md lg:hover:shadow-black/20` deleted) | Spec requires `hover:bg-white/[0.08] hover:border-white/20`. Current weak shadow is redundant and not spec-mandated. Removing it simplifies to the spec's canonical hover state. |
| Heatmap tier mapping | Keep 5-level `HeatmapIntensity` type; map to spec's 4 named tiers with interpolated mid-values | Spec §Requirements #6: "thresholds MUST match whatever the heatmap currently uses". Code has 5 thresholds (0, 1-2, 3-5, 6-10, 11+). Interpolate at tier 2/3: `bg-white/40` and `bg-white/60`. Tier 0/1/4 match spec exactly. This preserves thresholds while matching the white-opacity gradient intent. |
| Heatmap tooltip chapter links | Convert plain text to inline `<Link>` elements | Spec AC requires "Clicking the chapter link navigates to `/bible/:book/:chapter`". Current tooltip shows plain-text join; no link exists. The link must be added for AC to be reachable. Consistent with `10-ux-flows.md`: "Tap a chapter reference in the tooltip → navigates to that chapter via BB-38 deep link." |
| Heatmap tooltip fallback for `+N more` | Leave as plain text after the first 5 Links | The "+N more" is a summary marker, not a clickable target. Keeps tooltip compact. |
| Heatmap tooltip z-index | Preserve existing `z-50` | Tooltip already positions above all content. Adding Links inside doesn't change z-index requirements. |
| ReadingPlanDetail Navbar fix | Verification step only (Step 4) | Recon confirms `ReadingPlanDetail.tsx:181` uses `<Layout>` which mounts Navbar. No ReaderChrome. If verification confirms Navbar renders correctly, no code change. If hidden by z-index/overflow/background, Step 4 resolves by removing the hider. |
| ResumeReadingCard button label when no last-read | No button rendered (existing behavior) | For first-time readers, `BibleHeroSlot` priority 4 renders only `<VerseOfTheDay />`. No ResumeReadingCard → no "Open the reader" button shown. Spec alternative: "hide the button". Reader entry points (Books drawer, Quick Actions, BibleSearchEntry) remain available. No new "Start reading Genesis 1" button added. |
| ResumeReadingCard aria-label | Removed (let visible text carry accessible name) | New visible text `Continue reading John 3` is already fully descriptive. Redundant `aria-label` attribute can be dropped. |
| ReadingPlans filter state cleanup | Remove `selectedDuration`/`selectedDifficulty` state and filter predicates | Spec §Out of Scope keeps `FilterBar.tsx` file. But state + filter predicates in `ReadingPlans.tsx` become dead code once render is removed — remove to avoid lint warnings and unused-variable errors. |
| Heatmap legend swatch colors | Auto-update via shared `INTENSITY_CLASSES` map | Legend (lines 304-313) reads the same map; no extra code change needed. |

---

## Implementation Steps

### Step 1: Widen BibleLanding content column to `max-w-6xl` [COMPLETE]

**Objective:** Make the Bible browser fill the available viewport width up to the standard `max-w-6xl` cap, matching the section divider directly above it.

**Files to create/modify:**
- `frontend/src/pages/BibleLanding.tsx` — line 147.

**Details:**

Change line 147 from:

```tsx
<div className="relative z-10 mx-auto max-w-4xl space-y-8 px-4 pb-16">
```

To:

```tsx
<div className="relative z-10 mx-auto max-w-6xl space-y-8 px-4 pb-16">
```

- Only the `max-w-*` class changes. Everything else (`relative z-10 mx-auto space-y-8 px-4 pb-16`) stays.
- Background `bg-dashboard-dark` on the outer `<div>` (line 140) remains edge-to-edge. The widened inner column centers naturally with `mx-auto`.

**Auth gating:** N/A.

**Responsive behavior:**
- Mobile (375px): full viewport (no cap kicks in — cap is 1152px).
- Tablet (768px): full viewport (still below cap).
- Desktop (1440px): content centered at 1152px max-width; dark background fills edges.

**Inline position expectations:** N/A (no inline-row layout change).

**Guardrails (DO NOT):**
- DO NOT change `mx-auto`, `space-y-8`, `px-4`, `pb-16`, or `z-10`.
- DO NOT widen to `max-w-7xl` (spec allows up to 7xl but 6xl matches the divider directly above).
- DO NOT remove `BibleLandingOrbs` or change the outer `min-h-screen bg-dashboard-dark`.
- DO NOT widen any other column on this page.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| BibleLanding content column has `max-w-6xl` | unit | Render BibleLanding; query a distinctive inner element (e.g., TodaysPlanCard) and assert the nearest `div[class*="max-w-"]` ancestor has `max-w-6xl`. |
| Existing BibleLanding tests pass unchanged | regression | Existing `BibleLanding.test.tsx` assertions should pass — only a max-width class changed. |

**Expected state after completion:**
- [ ] `frontend/src/pages/BibleLanding.tsx:147` uses `max-w-6xl`.
- [ ] Tests pass.

---

### Step 2: Remove Reading Plans Theme/Duration filter UI [COMPLETE]

**Objective:** Delete the `<FilterBar>` render from the Reading Plans page, including the now-dead state and filter predicates, while keeping `FilterBar.tsx` component file on disk per spec §Out of Scope.

**Files to create/modify:**
- `frontend/src/pages/ReadingPlans.tsx` — remove `<FilterBar>` render, related state, filter predicates, and any now-unused imports.
- `frontend/src/pages/__tests__/ReadingPlans.test.tsx` — update/remove tests that exercise filter UI.

**Details:**

1. **Remove the render block (lines 207-212):**

   Delete:
   ```tsx
   <FilterBar
     selectedDuration={selectedDuration}
     selectedDifficulty={selectedDifficulty}
     onDurationChange={setSelectedDuration}
     onDifficultyChange={setSelectedDifficulty}
   />
   ```

2. **Remove the state declarations** (search for `useState` with types matching `DurationFilterOption` / `DifficultyFilterOption`):

   ```tsx
   const [selectedDuration, setSelectedDuration] = useState<DurationFilterOption['value']>('all')
   const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyFilterOption['value']>('all')
   ```

   Delete both.

3. **Simplify the filter predicate:** any code shaped like

   ```tsx
   const filteredPlans = plans.filter((plan) => {
     if (selectedDuration !== 'all' && /* ... */) return false
     if (selectedDifficulty !== 'all' && /* ... */) return false
     return true
   })
   ```

   Replace with `const filteredPlans = plans` (or remove the intermediate variable and use `plans` directly if `sortedPlans` derives from `filteredPlans`).

4. **Remove imports:**
   - `import { FilterBar } from '@/components/reading-plans/FilterBar'` (unused after render removal).
   - `import type { DurationFilterOption, DifficultyFilterOption } from '...'` (unused after state removal).
   - Any filter option constants imported solely for the FilterBar.

5. **Keep `frontend/src/components/reading-plans/FilterBar.tsx` unchanged.** Spec §Out of Scope.

6. **Test updates:**
   - Remove tests that exercise the FilterBar (clicking duration/difficulty toggles). Any test that asserts `getByRole('button', { name: /^30 days$/ })` or similar filter-specific labels must be deleted.
   - Keep tests that assert the plan grid renders correctly and plans link to `/reading-plans/:id`.

**Auth gating:** N/A.

**Responsive behavior:**
- Mobile (375px): plans grid renders directly below section heading; no filter bar in DOM.
- Tablet (768px): same — grid renders directly below heading.
- Desktop (1440px): same.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**
- DO NOT delete `FilterBar.tsx`. Spec §Out of Scope.
- DO NOT delete `FILTER_OPTIONS` constants if they're imported elsewhere (verify before removal).
- DO NOT rename `sortedPlans`, `handleStartOrContinue`, `getPlanStatus`, `getProgress`.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| ReadingPlans does NOT render filter UI | integration | Render `<ReadingPlans />`; assert `screen.queryByRole('group', { name: /Filter reading plans/i })` is null. Assert no button with name matching `/Duration|Difficulty/i` labels. |
| ReadingPlans grid renders all plans | integration | Render `<ReadingPlans />`; assert `screen.getAllByRole('link', { name: /.* plan$/i })` or equivalent count matches `PLANS.length`. |
| Existing "open plan" test passes unchanged | regression | Clicking a plan card navigates to `/reading-plans/:id`. |

**Expected state after completion:**
- [ ] `<FilterBar>` no longer rendered anywhere in `ReadingPlans.tsx`.
- [ ] `selectedDuration`/`selectedDifficulty` state removed.
- [ ] `FilterBar.tsx` file still exists on disk, unchanged.
- [ ] No lint warnings about unused imports or variables.
- [ ] Tests pass.

---

### Step 3: Redesign PlanCard to FrostedCard-pattern classes [COMPLETE]

**Objective:** Swap the PlanCard's background/border/hover treatment to the spec-specified FrostedCard pattern. Bump metadata pill text opacity. Change title to `font-semibold`.

**Files to create/modify:**
- `frontend/src/components/reading-plans/PlanCard.tsx`.
- Tests: inline tests in `ReadingPlans.test.tsx` or a dedicated PlanCard test (create if absent).

**Details:**

1. **Swap root `<Link>` className** (line 56):

   From:
   ```tsx
   className="block rounded-xl border border-white/10 bg-white/[0.06] p-6 backdrop-blur-sm transition-shadow motion-reduce:transition-none lg:hover:shadow-md lg:hover:shadow-black/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt/70"
   ```

   To:
   ```tsx
   className="block rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition-[background-color,border-color] duration-base motion-reduce:transition-none hover:bg-white/[0.08] hover:border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-dashboard-dark"
   ```

   Diff summary:
   - `rounded-xl` → `rounded-2xl`
   - `bg-white/[0.06]` → `bg-white/5` (match AC's `rgba(255,255,255,0.05)`)
   - `transition-shadow` → `transition-[background-color,border-color] duration-base` (uses BB-33 token; animates new hover target instead of shadow)
   - Removed: `lg:hover:shadow-md lg:hover:shadow-black/20`
   - Added: `hover:bg-white/[0.08] hover:border-white/20`
   - Focus ring: `focus-visible:ring-primary-lt/70` → `focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-dashboard-dark` (matches FrostedCard + ResumeReadingCard canonical focus treatment)

2. **Update title** (line 72):

   From:
   ```tsx
   <h3 className="text-lg font-bold text-white">{plan.title}</h3>
   ```

   To:
   ```tsx
   <h3 className="text-lg font-semibold text-white">{plan.title}</h3>
   ```

3. **Update description text opacity** (line 75):

   From: `<p className="mt-1 line-clamp-2 text-sm text-white/60">` → To: `<p className="mt-1 line-clamp-2 text-sm text-white/70">`

4. **Update metadata pills** (lines 76-85) — 3 pill spans:

   Each pill changes from:
   ```tsx
   <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/50">
   ```

   To:
   ```tsx
   <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70">
   ```

   (Change `text-white/50` → `text-white/70` on all three pills.)

5. **Leave unchanged:**
   - The `emoji` block (line 58) — `mb-3 text-4xl`.
   - The `isCustom` inline badge (lines 64-68) — keeps `bg-primary/20 text-primary-lt`. This is the "custom plan" visual marker, not the accent element the spec addresses.
   - The `progress.currentDay` line (line 87-90) — keeps `text-white/50` (intentionally faded subtext; the card body pills are the accent, this line is a status note).
   - The `StatusButton` block (line 94-96).

6. **No new imports required.**

**Auth gating:** N/A.

**Responsive behavior:**
- Mobile (375px): single column (grid `grid-cols-1`). Card fills column width. Pills wrap below 400px per existing `flex-wrap`.
- Tablet (768px): 2-column grid. Pills inline in single row per card.
- Desktop (1440px): 2-column grid (no change from existing).

**Inline position expectations:**
- PlanCard pill row (Duration + Difficulty + Theme): same y (±5px) at 1440px and 768px. Wrapping acceptable below 400px.

**Guardrails (DO NOT):**
- DO NOT swap `<Link>` for `<FrostedCard>` wrapper. Spec §Design Notes: "do NOT create a new card component layer when a handful of classes is all the fix needs."
- DO NOT add a `border-t-2` top accent (pills are already the accent — mixing both violates spec's "consistent across cards — not a mix" rule).
- DO NOT change `rounded-full` on pills; only the text opacity changes.
- DO NOT change the `isCustom` badge classes.
- DO NOT hardcode `300ms` — use `duration-base` (from Tailwind config / BB-33).
- DO NOT use `transition-all`. Use `transition-[background-color,border-color]` to keep animations targeted.
- DO NOT remove `focus-visible` ring — spec §Non-Functional requires it.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| PlanCard renders with `rounded-2xl bg-white/5` | unit | Query the card link; assert className contains `rounded-2xl` and `bg-white/5`. |
| PlanCard title uses `font-semibold` | unit | Assert title `<h3>` className contains `font-semibold` and NOT `font-bold`. |
| PlanCard description + pills use `text-white/70` | unit | Assert description `<p>` className contains `text-white/70`; query each pill and assert `text-white/70`. |
| PlanCard focus-visible ring is present | unit | Assert card link className contains `focus-visible:ring-2 focus-visible:ring-white/50`. |
| PlanCard hover state applied (snapshot OR computed class) | unit | Assert card link className contains `hover:bg-white/[0.08]` and `hover:border-white/20`. |
| Existing PlanCard-navigation tests pass | regression | Clicking a card navigates to `/reading-plans/:id`. |

**Expected state after completion:**
- [ ] PlanCard uses new FrostedCard-pattern classes.
- [ ] Title is `font-semibold`, description + pills are `text-white/70`.
- [ ] Hover state present and focus-visible ring present.
- [ ] Tests pass.

---

### Step 4: Verify `/reading-plans/:planId` renders standard Navbar [COMPLETE]

**Objective:** Per spec §Requirements #4, investigate the reading plan detail page. Confirm the standard `Navbar` renders. If Navbar is rendered but hidden, fix the hider. If Navbar is missing, add the standard Layout wrapper.

**Files to create/modify:**
- `frontend/src/pages/ReadingPlanDetail.tsx` — ONLY if a real bug is found during investigation.
- `frontend/src/pages/__tests__/ReadingPlanDetail.test.tsx` — add a new test that asserts Navbar is present.

**Details:**

1. **Investigation protocol** (executor runs `pnpm dev` + browser DevTools OR Playwright snapshot):
   - Navigate to `/reading-plans/30-day-psalms` (or any valid plan ID).
   - Confirm the Navbar renders at the top (logo, "Daily Hub", "Study Bible", "Grow", etc. nav items visible).
   - Confirm `ReaderChrome` is NOT present anywhere in the DOM.
   - Inspect the page's root layout in React DevTools: `<Layout>` → `<Navbar>` chain must be intact.

2. **If Navbar renders correctly** (expected based on recon — `ReadingPlanDetail.tsx:181` wraps everything in `<Layout>`):
   - **No code changes to production files.** The spec acceptance is already met.
   - **Add a regression test** in `ReadingPlanDetail.test.tsx` asserting Navbar presence:
     ```tsx
     test('renders the standard Navbar on reading plan detail', () => {
       render(<ReadingPlanDetail />, { wrapper: TestProviders })
       expect(screen.getByRole('navigation', { name: /Main navigation/i })).toBeInTheDocument()
       expect(screen.getByRole('link', { name: /Study Bible/i })).toBeInTheDocument()
     })
     ```
     (Adapt matcher to whatever role/aria-label the standard Navbar uses — confirm by inspecting `Navbar.tsx` nav element.)

3. **If Navbar is rendered but visually hidden** (unexpected):
   - Inspect z-index: ReadingPlanDetail hero at line 181 uses `min-h-screen bg-dashboard-dark`. Check if any child has `z-50+` covering the Navbar.
   - Inspect overflow: the Navbar uses `sticky top-0 z-30`. Any parent with `overflow-hidden` breaks sticky positioning.
   - Inspect background: Hero gradient (`ATMOSPHERIC_HERO_BG`) may visually obscure the Navbar if layering is wrong.
   - Apply the narrowest possible fix (remove `overflow-hidden`, raise Navbar z-index, adjust padding) and document the finding in the Execution Log.

4. **If Navbar is missing entirely** (very unexpected given recon):
   - Confirm `<Layout>` wraps everything at line 181.
   - If not, wrap the page content in `<Layout>` and remove any alternate chrome.
   - Add `import { Layout } from '@/components/Layout'` if missing.

**Auth gating:** N/A.

**Responsive behavior:**
- Mobile (375px): Navbar renders as mobile drawer trigger (hamburger). No layout change.
- Tablet (768px)+: standard desktop Navbar.

**Inline position expectations:** N/A — Navbar layout is inherited.

**Guardrails (DO NOT):**
- DO NOT wrap ReadingPlanDetail in `ReaderChrome` under any circumstances.
- DO NOT modify `Layout.tsx` or `Navbar.tsx`.
- DO NOT change any routing (`App.tsx` route config is untouched).
- DO NOT add `SiteFooter` separately — `<Layout>` already mounts it.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| ReadingPlanDetail renders Navbar | integration | Render page; assert `getByRole('navigation', { name: ... })` finds the main Navbar. |
| ReadingPlanDetail does NOT use ReaderChrome | integration | Assert `queryByTestId('reader-chrome-top-bar')` or similar Reader-specific element is null. |
| Existing plan detail tests pass | regression | Existing render/interaction tests continue to pass. |

**Expected state after completion:**
- [ ] Standard Navbar confirmed present on `/reading-plans/:planId` (test added).
- [ ] Source code unchanged if investigation confirms Navbar already renders (expected case).
- [ ] If a bug was found, the narrowest fix is applied and documented in the Execution Log.

---

### Step 5: Recolor heatmap intensity tiers to white-with-opacity [COMPLETE]

**Objective:** Replace the purple `bg-primary/N` intensity tiers in the BB-43 reading heatmap with the spec's white-with-opacity gradient. Preserve existing 5-level threshold structure.

**Files to create/modify:**
- `frontend/src/components/bible/my-bible/ReadingHeatmap.tsx` — lines 14-20.
- `frontend/src/components/bible/my-bible/__tests__/ReadingHeatmap.test.tsx` — update color assertions.

**Details:**

Replace the `INTENSITY_CLASSES` map at lines 14-20:

```tsx
const INTENSITY_CLASSES: Record<HeatmapIntensity, string> = {
  0: 'bg-white/5',
  1: 'bg-primary/30',
  2: 'bg-primary/50',
  3: 'bg-primary/70',
  4: 'bg-primary/90',
}
```

With:

```tsx
const INTENSITY_CLASSES: Record<HeatmapIntensity, string> = {
  0: 'bg-white/10',    // empty day
  1: 'bg-white/20',    // 1-2 chapters (light)
  2: 'bg-white/40',    // 3-5 chapters (interpolated)
  3: 'bg-white/60',    // 6-10 chapters (interpolated)
  4: 'bg-white',       // 11+ chapters (heavy)
}
```

- Tier thresholds in `getIntensity(chapterCount)` (in `lib/heatmap.ts`) are unchanged. Spec §Requirements #6: "Activity-tier thresholds MUST match whatever the heatmap currently uses — this is a color-only change."
- Legend swatches (lines 304-313) read the same map and auto-update.
- The `cell.isToday && 'ring-2 ring-white/50'` ring (line 277) is preserved — today marker still shows on top of the new tier color.

**Auth gating:** N/A.

**Responsive behavior:** No responsive change — cell sizes and grid structure unchanged. Colors apply identically at every breakpoint.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**
- DO NOT change `HeatmapIntensity` type.
- DO NOT change `getIntensity()` thresholds.
- DO NOT add any non-white/non-primary palette color (emerald rejected per spec).
- DO NOT remove the `cell.isToday && 'ring-2 ring-white/50'` ring.
- DO NOT change cell sizing or rounded radius classes.
- DO NOT add or remove a tier — keep the 5-level structure so `HeatmapIntensity` stays a `0 | 1 | 2 | 3 | 4` union.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Heatmap tier 0 cell (no activity) has `bg-white/10` | unit | Render heatmap with a date that has no activity; query that cell; assert className contains `bg-white/10` and NOT `bg-primary`. |
| Heatmap tier 1 cell (1-2 chapters) has `bg-white/20` | unit | Seed activity with 1 chapter; query that cell; assert `bg-white/20`. |
| Heatmap tier 4 cell (11+ chapters) has `bg-white` | unit | Seed activity with 15 chapters; query that cell; assert `bg-white`. |
| Heatmap legend swatches use new colors | unit | Assert legend children include `bg-white/10`, `bg-white/20`, `bg-white/40`, `bg-white/60`, `bg-white`. |
| No purple remains on any heatmap cell | unit | Query `document.querySelector('[data-heatmap-cell][class*="bg-primary"]')` returns null. |
| Today ring still present | regression | Render with today's cell containing activity; assert `ring-2 ring-white/50` class present. |

**Expected state after completion:**
- [ ] All 5 tiers use white-based classes.
- [ ] No `bg-primary/*` classes remain in `INTENSITY_CLASSES`.
- [ ] Tier thresholds unchanged.
- [ ] Legend auto-updates.
- [ ] Tests pass.

---

### Step 6: Make heatmap tooltip chapter references clickable Links [COMPLETE]

**Objective:** Convert the plain-text `chapterSummary` in `HeatmapTooltip` to inline `<Link>` elements so "Clicking a chapter reference navigates to `/bible/:book/:chapter`" (spec AC) actually works. Links use standard React Router navigation (NO `{ replace: true }`) so browser back returns to `/bible/my`.

**Files to create/modify:**
- `frontend/src/components/bible/my-bible/ReadingHeatmap.tsx` — `HeatmapTooltip` sub-component (lines 332-387).
- `frontend/src/components/bible/my-bible/__tests__/ReadingHeatmap.test.tsx` — add tests for link navigation + no `replace`.
- `frontend/src/pages/__tests__/MyBiblePageHeatmap.test.tsx` — add back-nav integration test (heatmap link → BibleReader → back → `/bible/my`).

**Details:**

1. **Update imports** at top of `ReadingHeatmap.tsx`:

   Add `Link` from `react-router-dom`:
   ```tsx
   import { Link } from 'react-router-dom'
   ```

   (Verify it's not already imported; the existing file uses `useNavigate`, so `Link` may need to be added.)

2. **Add a helper to derive book slug** from book name (likely already exists in `lib/bible/` or a similar util — executor should search). If no helper exists, use the `formatBookName` logic inversely or import from `data/bible.ts` where `BIBLE_BOOKS` maps books to slugs. Example (adapt to existing API):

   ```tsx
   import { getBookSlug } from '@/data/bible'
   ```

3. **Replace the `chapterSummary` string construction and render** (lines 367-386):

   Current block:
   ```tsx
   const chapterSummary =
     chapterCount === 0
       ? 'No reading'
       : chapters
           .slice(0, 5)
           .map((c) => `${formatBookName(c.book)} ${c.chapter}`)
           .join(', ') + (chapters.length > 5 ? `, +${chapters.length - 5} more` : '')

   return (
     <div
       ref={tooltipRef}
       data-heatmap-tooltip
       className="fixed z-50 rounded-lg border border-white/[0.12] bg-white/[0.06] px-3 py-2 text-xs text-white shadow-lg backdrop-blur-sm"
       style={{ top: position.top, left: position.left }}
       role="tooltip"
     >
       <p className="font-medium">{formatDate(date)}</p>
       <p className="mt-0.5 text-white/60">{chapterSummary}</p>
     </div>
   )
   ```

   Replace with (structure — executor may adjust Link class list to match design-system patterns):

   ```tsx
   const firstFive = chapters.slice(0, 5)
   const remainder = chapters.length > 5 ? chapters.length - 5 : 0

   return (
     <div
       ref={tooltipRef}
       data-heatmap-tooltip
       className="fixed z-50 rounded-lg border border-white/[0.12] bg-white/[0.06] px-3 py-2 text-xs text-white shadow-lg backdrop-blur-sm"
       style={{ top: position.top, left: position.left }}
       role="tooltip"
     >
       <p className="font-medium">{formatDate(date)}</p>
       {chapterCount === 0 ? (
         <p className="mt-0.5 text-white/60">No reading</p>
       ) : (
         <p className="mt-0.5 text-white/60">
           {firstFive.map((c, i) => (
             <span key={`${c.book}-${c.chapter}`}>
               <Link
                 to={`/bible/${getBookSlug(c.book)}/${c.chapter}`}
                 className="text-white underline underline-offset-2 hover:text-white/80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/50"
               >
                 {formatBookName(c.book)} {c.chapter}
               </Link>
               {i < firstFive.length - 1 && ', '}
             </span>
           ))}
           {remainder > 0 && <>, +{remainder} more</>}
         </p>
       )}
     </div>
   )
   ```

   - Each chapter becomes a `<Link>` to `/bible/{slug}/{chapter}` with the canonical `text-white` + underline + focus ring treatment.
   - No `{ replace: true }` anywhere — default React Router navigation preserves history.
   - `+N more` remains plain text (not clickable — it's a summary marker, not a specific chapter).
   - Empty state (`chapterCount === 0`) still renders "No reading" as plain text.

4. **Verify `handleCellInteraction` (lines 164-180) remains unchanged** — `navigate('/bible')` on today cell stays without `{ replace: true }` (spec acceptance already met for today-cell).

5. **If `getBookSlug` helper does not exist in `data/bible.ts`:**
   - Check `lib/bible/` modules for existing book-name-to-slug conversion.
   - If still missing, add a minimal helper inline in `ReadingHeatmap.tsx`:
     ```tsx
     function getBookSlug(book: string): string {
       return book.toLowerCase().replace(/\s+/g, '-').replace(/^\d+-/, (m) => m.replace('-', ''))
     }
     ```
     (Adapt to whatever slug format existing Bible routes use. Executor inspects `pages/BibleReader.tsx` route matching or `data/bible.ts` book constants to confirm format.)

**Auth gating:** N/A.

**Responsive behavior:**
- Mobile (375px): tooltip width clamped by existing viewport-clamp logic (lines 357-361). Links wrap within tooltip if text is long.
- Tablet (768px)+: tooltip positioned above cell, Links inline.

**Inline position expectations:**
- First 5 Links + comma separators + optional "+N more" text share y-coordinate (±5px) within the tooltip. Tooltip height adjusts via `line-clamp`/`white-space` — no explicit wrapping constraint.

**Guardrails (DO NOT):**
- DO NOT add `{ replace: true }` to any `<Link>` in this block.
- DO NOT use `useNavigate()` for the per-chapter links — use `<Link>` so users can Ctrl-click / middle-click to open in a new tab.
- DO NOT change the tooltip positioning logic (useEffect at lines 346-365).
- DO NOT remove the `role="tooltip"` or the `data-heatmap-tooltip` attribute.
- DO NOT change the empty-state "No reading" copy.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Tooltip renders chapter Links for activity | unit | Seed a date with `[{ book: 'john', chapter: 3 }]`; trigger tooltip; assert `getByRole('link', { name: /John 3/i })` with `href="/bible/john/3"`. |
| Tooltip Links do NOT pass `{ replace: true }` | unit | Mock navigate or inspect Link component — assert the Link renders a standard `<a>` element (not using `replace` prop). Alternatively, verify via integration test that history stack grows. |
| Tooltip shows "+N more" when > 5 chapters | unit | Seed 7 chapters; assert first 5 render as Links, "+2 more" renders as plain text. |
| Tooltip shows "No reading" when empty | unit | Seed empty activity; assert plain text "No reading" rendered. |
| Integration: heatmap → BibleReader → browser back → `/bible/my` | Playwright (or RTL with `<MemoryRouter initialEntries={['/bible/my']}>`) | Navigate to `/bible/my`; click a tooltip chapter Link; assert URL is `/bible/:book/:chapter`; simulate browser back; assert URL is `/bible/my` (NOT `/bible`). |
| Tooltip Link focus ring present | unit | Assert Link className contains `focus-visible:ring-1 focus-visible:ring-white/50`. |

**Expected state after completion:**
- [ ] Tooltip chapter references render as `<Link>` elements.
- [ ] No `{ replace: true }` anywhere in the heatmap navigation code.
- [ ] Browser back from BibleReader returns to `/bible/my`.
- [ ] Tests pass.

---

### Step 7: Update ResumeReadingCard button label to include book + chapter [COMPLETE]

**Objective:** Replace the generic "Continue" button text with the explicit `Continue reading {Book} {Chapter}` label. Drop the now-redundant `aria-label`.

**Files to create/modify:**
- `frontend/src/components/bible/landing/ResumeReadingCard.tsx` — line 42.
- `frontend/src/components/bible/landing/__tests__/ResumeReadingCard.test.tsx` — update button-text assertion.

**Details:**

1. **Update the `<Link>` element** (lines 37-43):

   From:
   ```tsx
   <Link
     to={`/bible/${slug}/${chapter}`}
     className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-hero-bg shadow-[0_0_15px_rgba(255,255,255,0.15)] transition-all motion-reduce:transition-none duration-base hover:shadow-[0_0_20px_rgba(255,255,255,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-dashboard-dark"
     aria-label={`Continue reading ${book} chapter ${chapter}`}
   >
     Continue
   </Link>
   ```

   To:
   ```tsx
   <Link
     to={`/bible/${slug}/${chapter}`}
     className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-hero-bg shadow-[0_0_15px_rgba(255,255,255,0.15)] transition-all motion-reduce:transition-none duration-base hover:shadow-[0_0_20px_rgba(255,255,255,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-dashboard-dark"
   >
     Continue reading {book} {chapter}
   </Link>
   ```

   - Visible text becomes `Continue reading {book} {chapter}` (e.g., "Continue reading John 3").
   - `aria-label` is **removed** — the visible text is now fully descriptive, so the aria-label is redundant and must not duplicate content (accessibility best practice).
   - All other classes remain — button is still the homepage-style white pill primary CTA.

2. **Upstream card preserves context:** the card heading above the button already reads `{book} {chapter}` in `text-2xl/3xl` bold (line 29-31), and the uppercase label reads "Continue reading" (line 27). With the button text now echoing the information, there is deliberate redundancy — this is acceptable per the spec's explicit "Continue reading {Book} {Chapter}" requirement on the button itself.

3. **No fallback needed for first-time readers:** `ResumeReadingCard` is only rendered when `isActiveReader && book && chapter && slug` (per `BibleHeroSlot.tsx:42, 58`). First-time readers (priority 4) render `<VerseOfTheDay />` instead — no button, no change. Spec's "Alternative: hide the button" for the no-last-read case is already the current behavior. The Books drawer + `QuickActionsRow` + `BibleSearchEntry` provide reader entry points for new users.

**Auth gating:** N/A.

**Responsive behavior:**
- Mobile (375px): button fills natural width; if text wraps, `text-sm` keeps it compact. Button stacks above "Or read the next chapter" link via `flex-col sm:flex-row`.
- Tablet (640px)+: button inline with "Or read the next chapter" link (same y, existing `sm:items-center`).

**Inline position expectations:**
- Button + "Or read the next chapter" link share y (±5px) at 640px+.
- Button text wrapping: with longer book names like "1 Corinthians", the text "Continue reading 1 Corinthians 16" fits single-line at `text-sm px-5 py-2.5` in typical viewports. If wrapping occurs at very narrow widths (< 360px), button height grows gracefully — no visual break.

**Guardrails (DO NOT):**
- DO NOT add `aria-label` back — let visible text carry the accessible name.
- DO NOT change the button's `className`, `to`, or pill shape.
- DO NOT add new copy ("Pick up where you left off", etc.) — spec specifies the exact label.
- DO NOT add a "Start reading Genesis 1" button for new users — not in scope; Books drawer + Quick Actions already provide entry points.
- DO NOT alter the H3 heading or the uppercase "Continue reading" label elsewhere in the card.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Button renders "Continue reading {book} {chapter}" visible text | unit | Render `<ResumeReadingCard book="John" chapter={3} ... />`; assert `getByRole('link', { name: 'Continue reading John 3' })` returns the Link. |
| Button does NOT have redundant `aria-label` | unit | Query the Link; assert `getAttribute('aria-label')` is null (accessible name derived from text content). |
| Button `to` attribute is `/bible/{slug}/{chapter}` | regression | Assert Link `href` or `to` resolves to `/bible/john/3`. |
| No [replace] prop on Link | regression | Assert the Link renders without `replace` so browser back returns to `/bible`. |
| Card still renders `{book} {chapter}` heading | regression | Existing heading test continues to pass. |

**Expected state after completion:**
- [ ] Button visible text reads `Continue reading {book} {chapter}`.
- [ ] `aria-label` is removed.
- [ ] Link route unchanged.
- [ ] Tests pass.

---

### Step 8: Final verification [COMPLETE]

**Objective:** Run all checks and verify the integrated behavior end-to-end.

**Files to create/modify:** none — verification only.

**Details:**

1. **Static checks:**
   - `pnpm lint` — no new violations.
   - `pnpm test` — all prior tests + new tests pass.
   - `pnpm build` — clean TypeScript + production build.

2. **Manual verification in dev server (`pnpm dev`):**
   - Navigate to `/bible` at desktop 1440px: content column extends to `max-w-6xl` (1152px), background fills edges.
   - Navigate to `/grow?tab=plans`: no Theme/Duration filter controls visible above the plans grid.
   - Inspect a reading plan card visually: `rounded-2xl`, subtle white background, pills readable, hover transition smooth.
   - Click a plan → land on `/reading-plans/:planId`: Navbar visible at top, logo + "Study Bible"/"Grow"/etc. links present. No ReaderChrome.
   - Navigate to `/bible/my`: heatmap cells are white-opacity tiers (no purple).
   - Hover (or tap) a past cell with activity: tooltip shows chapters as **clickable underlined Links**.
   - Click a chapter Link: land on BibleReader at that chapter. Press browser back: return to `/bible/my` (NOT `/bible`).
   - Navigate to `/bible` with `wr_bible_last_read` populated: ResumeReadingCard shows button reading "Continue reading {book} {chapter}".
   - Navigate to `/bible` with `wr_bible_last_read` cleared (new user): ResumeReadingCard does NOT appear — VerseOfTheDay renders instead.

3. **Accessibility verification:**
   - Tab through `/bible` → every interactive element receives a visible focus ring.
   - Tab through `/grow?tab=plans` → every PlanCard is reachable and shows the new `ring-white/50` ring.
   - Tab into the heatmap tooltip → chapter Links receive a visible focus ring.
   - Screen reader: ResumeReadingCard button announces "Continue reading John 3, link" (no duplicate announcement from a redundant aria-label).

4. **Playwright full-page snapshots** (via `/verify-with-playwright`):
   - `/bible` at 375, 768, 1440px.
   - `/grow?tab=plans` at 375, 768, 1440px.
   - `/reading-plans/30-day-psalms` at 1440px (confirm Navbar visible).
   - `/bible/my` at 1440px (confirm white-opacity heatmap tiers).

**Auth gating:** N/A — verify Save / auth-gated actions on `/daily` still trigger modal (regression).

**Responsive behavior:** Verified at 375, 768, 1440px via Playwright.

**Inline position expectations:** Verified via `/verify-with-playwright` Step 6l (PlanCard pills share y at 768px+; ResumeReadingCard button + "next chapter" link share y at 640px+; heatmap tooltip chapter Links share y).

**Guardrails (DO NOT):**
- DO NOT commit until all checks pass.
- DO NOT skip the back-nav Playwright test (it verifies AC #8, the integration test).

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `pnpm test` | suite | All tests pass (frontend + backend). |
| `pnpm lint` | suite | Zero new warnings. |
| `pnpm build` | suite | Clean production build, no TypeScript errors. |
| Lighthouse Accessibility ≥ 95 on `/bible` | Playwright | Per spec §Non-Functional. |
| Lighthouse Accessibility ≥ 95 on `/bible/my` | Playwright | Per spec §Non-Functional. |
| Lighthouse Accessibility ≥ 95 on `/reading-plans/:planId` | Playwright | Per spec §Non-Functional. |

**Expected state after completion:**
- [ ] All 12 spec acceptance criteria verified.
- [ ] `pnpm lint`, `pnpm test`, and `pnpm build` all pass.
- [ ] Lighthouse Accessibility ≥ 95 on `/bible`, `/bible/my`, `/reading-plans/:planId`.
- [ ] Playwright full-page snapshots captured at 3 breakpoints.

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Widen BibleLanding content column |
| 2 | — | Remove Reading Plans Theme/Duration filters |
| 3 | — | Redesign PlanCard classes |
| 4 | — | Verify ReadingPlanDetail Navbar (may be no-op) |
| 5 | — | Recolor heatmap tiers to white-opacity |
| 6 | 5 | Make heatmap tooltip chapters clickable (builds on Step 5's updated component) |
| 7 | — | Update ResumeReadingCard button label |
| 8 | 1-7 | Lint + test + build + manual + Playwright verification |

Steps 1, 2, 3, 4, 5, and 7 are independent of each other. Step 6 reuses `ReadingHeatmap.tsx` edited in Step 5 — best executed immediately after Step 5 to minimize merge overhead but could technically run in either order. Step 8 runs last.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Widen BibleLanding to max-w-6xl | [COMPLETE] | 2026-04-16 | `BibleLanding.tsx:147` changed `max-w-4xl` → `max-w-6xl`. All 14 BibleLanding tests pass. |
| 2 | Remove Reading Plans filters | [COMPLETE] | 2026-04-16 | `ReadingPlans.tsx`: removed FilterBar import, selectedDuration/selectedDifficulty state, filteredPlans predicate, clearFilters callback, `<FilterBar>` render, empty-filter fallback branch. Removed PlanDifficulty type import. Updated tests: removed 6 filter-specific tests + aria-pressed test, added "does not render filter UI" test. FilterBar.tsx file preserved. 9/9 tests pass. |
| 3 | Redesign PlanCard classes | [COMPLETE] | 2026-04-16 | `PlanCard.tsx`: swapped root Link className to FrostedCard-pattern classes (rounded-2xl, bg-white/5, hover:bg-white/[0.08], focus-visible:ring-white/50 + offset). Title `font-bold` → `font-semibold`. Description/pills `text-white/50|60` → `text-white/70`. Created new `PlanCard.test.tsx` with 8 tests, all pass. |
| 4 | Verify ReadingPlanDetail Navbar | [COMPLETE] | 2026-04-16 | Investigation confirmed `ReadingPlanDetail.tsx:181` uses `<Layout>` which mounts Navbar + SiteFooter. No ReaderChrome. No production code changes needed. Added regression test asserting `navigation` with `name=/main navigation/i` present and `name=/reader controls/i` absent. All 21 tests pass. |
| 5 | Heatmap tier colors → white-opacity | [COMPLETE] | 2026-04-16 | `ReadingHeatmap.tsx`: swapped `INTENSITY_CLASSES` from `bg-primary/*` to white-opacity tiers (10/20/40/60/white). Legend auto-updates. Updated heatmap tests to match new classes. Added "no purple primary color" guard test. 14/14 tests pass. |
| 6 | Heatmap tooltip chapters → clickable Links | [COMPLETE] | 2026-04-16 | `ReadingHeatmap.tsx`: added `Link` import, rewrote `HeatmapTooltip` to render first 5 chapters as `<Link>` elements with underline + focus-visible ring, "+N more" stays plain text. No `{ replace: true }`. Added 4 new tooltip tests including history-preservation integration test with `useLocation` probe. 18/18 tests pass. |
| 7 | ResumeReadingCard button label | [COMPLETE] | 2026-04-16 | `ResumeReadingCard.tsx`: changed visible text "Continue" → "Continue reading {book} {chapter}". Removed redundant `aria-label`. Updated 2 tests to match new accessible name and verify aria-label absence. 10/10 tests pass. |
| 8 | Lint + test + build + Playwright verify | [COMPLETE] | 2026-04-16 | `pnpm lint` clean. `pnpm build` passes (SW + PWA build clean). `pnpm test` 8244/8244 tests pass (1 pre-existing broken test file `useBibleAudio.test.ts` — references deleted `useBibleAudio.ts` hook, unrelated to BB-48). Playwright verification captured: `/bible` (375/768/1440), `/grow?tab=plans` (1440), `/reading-plans/finding-peace-in-anxiety` (1440), `/bible/my` (1440). Confirmed: max-w-6xl className applied, filter UI gone, PlanCard computed styles match spec (borderRadius:16px, bg rgba(255,255,255,0.05)), ReadingPlanDetail has Main navigation nav and no ReaderChrome. Screenshots at `playwright-screenshots/bb48-*.png`. |
| 8b | Post-review fixes | [COMPLETE] | 2026-04-16 | Two fixes applied after `/code-review`: (1) `ReadingHeatmap.tsx` — `INTENSITY_CLASSES` retuned to hit spec AC #9 values exactly: tier 0 `bg-white/10`, tier 1 `bg-white/20`, tier 2 `bg-white/[0.35]` (interpolated), tier 3 `bg-white/50` (spec moderate), tier 4 `bg-white` (spec heavy). Five-tier structure preserved per Step 5 guardrails. (2) `ReadingHeatmap.tsx` — added `handleTooltipEnter`/`handleTooltipLeave` callbacks passed into `HeatmapTooltip`, wired to the tooltip `<div>`'s `onMouseEnter`/`onMouseLeave`. Cancels the 200ms cell-leave dismiss timer when the cursor enters the tooltip so users can travel from cell to a chapter Link without the tooltip vanishing. New regression test `tooltip stays open when cursor moves from cell onto tooltip` uses fake timers. Activity-cell filter selectors updated in 5 existing tests. 19/19 heatmap tests pass; full suite 8245/8245. |
