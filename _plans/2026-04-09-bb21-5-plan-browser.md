# Implementation Plan: BB-21.5 Plan Browser

**Spec:** `_specs/bb-21-5-plan-browser.md`
**Date:** 2026-04-09
**Branch:** `bible-redesign`
**Design System Reference:** `_plans/recon/design-system.md` (loaded — captured 2026-04-05)
**Recon Report:** not applicable
**Master Spec Plan:** N/A — standalone feature. Depends on BB-21 (completed, all 12 steps done).

---

## Architecture Context

### Project Structure

BB-21.5 builds the discovery surface for reading plans. BB-21 already built the complete plan infrastructure: types (`src/types/bible-plans.ts`), reactive store (`src/lib/bible/plansStore.ts`), loaders (`src/lib/bible/planLoader.ts`), hooks (`src/hooks/bible/usePlan.ts`, `usePlansManifest.ts`, `useActivePlan.ts`), detail page (`src/pages/BiblePlanDetail.tsx`), day page (`src/pages/BiblePlanDay.tsx`), and completion celebration (`src/components/bible/plans/PlanCompletionCelebration.tsx`).

The plan browser replaces the `BibleStub` placeholder at `/bible/plans` with a full browsing experience.

### Key Types (from `src/types/bible-plans.ts`)

```typescript
type PlanTheme = 'comfort' | 'foundation' | 'emotional' | 'sleep' | 'wisdom' | 'prayer'
type PlanMetadata = Omit<Plan, 'days'> // slug, title, shortTitle, description, theme, duration, estimatedMinutesPerDay, curator, coverGradient
interface PlanProgress { slug, startedAt, currentDay, completedDays[], completedAt, pausedAt, resumeFromDay, reflection, celebrationShown }
interface PlansStoreState { activePlanSlug: string | null, plans: Record<string, PlanProgress> }
```

### Existing Patterns

- **Manifest loading:** `loadManifest()` in `planLoader.ts` — synchronous static import from `@/data/bible/plans/manifest.json`, returns `PlanMetadata[]`. Currently returns `[]`.
- **Reactive store:** `plansStore.ts` uses module-level cache + listener set pattern. `subscribe(listener)` returns unsubscribe function. `getPlansState()` returns `{ activePlanSlug, plans }`.
- **Hooks:** `usePlansManifest()` returns `{ plans: PlanMetadata[], isLoading: false }`.
- **Page pattern:** Bible pages use `Layout` wrapper, `SEO` component, `bg-dashboard-dark` background, `ATMOSPHERIC_HERO_BG` style for hero section, `GRADIENT_TEXT_STYLE` for headings. See `BibleStub.tsx` and `BiblePlanDetail.tsx`.
- **Auth gating:** `useAuth()` + `useAuthModal()` from `AuthModalProvider`. The plan browser itself is fully public — no auth gates needed.
- **Route pattern:** Lazy-loaded via `React.lazy()` with named export destructuring in `App.tsx`, wrapped in `<Suspense fallback={<RouteLoadingFallback />}>`.
- **Card patterns:** `FrostedCard` for standard cards, but plan cards use `coverGradient` backgrounds instead (spec explicitly says NOT FrostedCard for browse cards).
- **White pill CTA:** `inline-flex min-h-[44px] items-center justify-center rounded-full bg-white px-8 py-3.5 text-base font-semibold text-hero-bg shadow-[0_0_30px_rgba(255,255,255,0.20)] transition-all duration-200 hover:bg-white/90 hover:shadow-[0_0_40px_rgba(255,255,255,0.30)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-dashboard-dark` — used in `BiblePlanDetail.tsx` for Start/Continue buttons.
- **Back link pattern:** `BiblePlanDetail.tsx` line 102-107 — `<Link to="/bible" className="inline-flex min-h-[44px] items-center text-sm text-white/60 hover:text-white">← Bible</Link>`.
- **Filter state in URL:** React Router `useSearchParams()` for query param management.

### Test Patterns

Bible plan tests use:
- `@testing-library/react` with `render`, `screen`, `fireEvent`, `waitFor`
- `vi.mock` for hooks and store modules at top of file
- `MemoryRouter` for routing (with `initialEntries` for URL params)
- `vi.mock('@/hooks/useAuth')` and `vi.mock('@/components/prayer-wall/AuthModalProvider')` for auth context
- `beforeEach(() => vi.clearAllMocks())`
- Constants extracted as `DEFAULT_PROPS` object

### BibleLanding Entry Points

`BibleLanding.tsx` renders `TodaysPlanCard` which already links to `/bible/plans` in two places:
1. Empty state: "Try a reading plan" → `/bible/plans`
2. Multiple plans: "+N more" pill → `/bible/plans`

The spec requests an additional visible "Browse plans" entry point in the landing content (e.g., in the `QuickActionsRow` or as a standalone link).

### BiblePlanDetail Back Link

Currently `← Bible` linking to `/bible`. Spec requests adding a `← All plans` link to `/bible/plans`.

### PlanCompletionCelebration Actions

Currently has "Continue" and "Share your completion" buttons. Spec requests a "Start another plan" action navigating to `/bible/plans`.

---

## Auth Gating Checklist

**The plan browser is fully public — no auth gates on this page.**

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Browse `/bible/plans` | Public — no auth | N/A | None needed |
| Filter plans | Public — no auth | N/A | None needed |
| Tap browse card | Navigates to detail (detail handles auth) | N/A | None needed |
| Tap Continue on in-progress | Logged-out users see no in-progress cards | N/A | Implicit — no progress data exists |

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Page background | background-color | `bg-dashboard-dark` (`#0f0a1e`) | design-system.md |
| Hero background | background | `radial-gradient(ellipse at top center, rgba(109, 40, 217, 0.15) 0%, transparent 70%)` over `#0f0a1e` | `PageHero.tsx` ATMOSPHERIC_HERO_BG |
| Page heading | style | `GRADIENT_TEXT_STYLE` — `linear-gradient(223deg, #FFFFFF 0%, #8B5CF6 100%)` via `background-clip: text` | `gradients.tsx` |
| Page heading | font | Inter 48px bold (lg:text-5xl), 30px (text-3xl) mobile | design-system.md |
| Section heading | font | Inter 20px semibold (`text-xl font-semibold text-white`) | spec |
| Plan card bg | gradient | `coverGradient` Tailwind class from `PlanMetadata` (e.g., `from-primary/30 to-hero-dark`) | spec |
| Plan card border | border | `border border-white/10 rounded-2xl` | spec |
| Plan card hover | transform | `hover:-translate-y-1 hover:shadow-lg` (reduced-motion: `hover:border-white/20` only) | spec |
| Filter pill (active) | classes | `bg-white/15 text-white border-white/20 rounded-full min-h-[36px] px-4 py-2` | spec |
| Filter pill (inactive) | classes | `bg-transparent text-white/60 border-white/10 hover:text-white/80 rounded-full min-h-[36px] px-4 py-2` | spec |
| Progress bar track | classes | `h-1 bg-white/30 rounded-full` | spec |
| Progress bar fill | classes | `h-full bg-white rounded-full` | spec |
| Completed badge | classes | `bg-white/15 text-white/80 text-xs rounded-full px-2 py-0.5` | spec |
| Empty state text | classes | `text-white/50` muted subtext | spec |
| Plan title | classes | `text-lg font-semibold text-white` | spec |
| Plan subtitle | classes | `text-sm text-white/60` | spec |
| Duration/curator | classes | `text-xs text-white/50` | spec |
| Section divider | classes | `border-t border-white/[0.08] max-w-6xl mx-auto` | design-system.md |
| White pill CTA (empty state) | classes | Pattern 2 — same as in `BiblePlanDetail.tsx` | design-system.md |

---

## Design System Reminder

**Project-specific quirks displayed before every UI step:**

- Worship Room uses `GRADIENT_TEXT_STYLE` (white-to-purple gradient via `background-clip: text`) for hero and section headings on dark backgrounds. Import from `@/constants/gradients`.
- `ATMOSPHERIC_HERO_BG` is imported from `@/components/PageHero` — it's a style object, not a class.
- Plan cards use `coverGradient` Tailwind gradient classes (e.g., `from-primary/30 to-hero-dark`), NOT `FrostedCard`. The gradient IS the card's identity.
- All text uses `text-white` opacity variants — zero raw hex values.
- All tap targets >= 44px (`min-h-[44px]` on interactive elements).
- Bible pages use `bg-dashboard-dark` as the page background, not `bg-hero-bg` (which is used by Daily Hub and homepage).
- Filter pill min height is 36px (not 44px) per spec — but the wrapping `<button>` itself should still be 44px touch target via padding.
- Focus-visible states: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-dashboard-dark` — consistent across all Bible pages.
- `prefers-reduced-motion`: guard transform animations with `motion-safe:` prefix or media query check. Under reduced motion, only use color/border shifts.
- Section headings in the browser are simple `text-xl font-semibold text-white` — NOT SectionHeading component (that's homepage only).
- BB-21 execution log had zero deviations — clean execution.

---

## Shared Data Models (from BB-21)

```typescript
// src/types/bible-plans.ts — existing, not modified
type PlanTheme = 'comfort' | 'foundation' | 'emotional' | 'sleep' | 'wisdom' | 'prayer'
type PlanMetadata = { slug, title, shortTitle, description, theme, duration, estimatedMinutesPerDay, curator, coverGradient }
interface PlanProgress { slug, startedAt, currentDay, completedDays[], completedAt, pausedAt, ... }
interface PlansStoreState { activePlanSlug: string | null, plans: Record<string, PlanProgress> }
```

**localStorage keys this spec reads (no new keys created):**

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `bible:plans` | Read | Plan progress state — determines which section each plan appears in |

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | < 640px | 1-column card grid, filter pills wrap to multiple rows, full-width cards |
| Tablet | 640-1024px | 2-column card grid, filter pills in single row |
| Desktop | 1024-1400px | 3-column card grid |
| Wide desktop | > 1400px | 4-column card grid |

Cards use `aspect-[4/3]` for consistent visual rhythm. Grid gap is `gap-4` (16px).

---

## Inline Element Position Expectations (UI features with inline rows)

| Element Group | Elements | Expected y-alignment | Wrap Tolerance |
|---------------|----------|---------------------|----------------|
| Theme filter pills | All + 6 theme pills | Same y ±5px at 1024px+ | Wrapping at <640px is acceptable |
| Duration filter pills | Any length + 3 duration pills | Same y ±5px at 1024px+ | Wrapping at <640px is acceptable |

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| Hero → filter bar | 32-48px (`py-8 sm:py-12`) | codebase: `BibleLanding.tsx` uses `space-y-8` |
| Filter bar → first section | 32px (`mt-8`) | consistent with BibleLanding |
| Section heading → card grid | 16px (`mt-4`) | standard |
| Section → section | 48px (`mt-12`) | consistent visual breathing room |
| Last section → footer | 64px (`pb-16`) | matches `BibleLanding.tsx` |

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] BB-21 is complete and committed (all 12 steps done per execution log)
- [x] `bible-redesign` branch is the working branch
- [x] All BB-21 types, store, hooks, and loader are available
- [x] All auth-gated actions from the spec are accounted for (none — page is public)
- [x] Design system values verified from design-system.md and codebase inspection
- [x] No [UNVERIFIED] values — all values sourced from spec or design-system.md
- [x] No deprecated patterns used
- [x] Manifest is currently empty `[]` — browser will show empty state until BB-22 adds plans

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Card component structure | Shared `PlanCardBase` layout with three card variants wrapping it | Spec notes "three card variants share substantial layout code" — a shared base reduces duplication |
| Filter pill sizing | Outer `<button>` is `min-h-[44px]` with the visual pill at 36px via padding | Meets 44px touch target while matching spec's 36px visual height |
| URL filter param names | `?theme=comfort&duration=short` | Spec requirement #9. Values: theme = PlanTheme values + "all"; duration = "any" \| "short" (≤7) \| "medium" (8-21) \| "long" (≥22) |
| Invalid URL params | Silent fallthrough to defaults ("all" / "any") | Spec requirement #10 |
| Plan in both completed and active | Appears in In Progress only | Spec edge case #1 — most-relevant-wins rule |
| "Start another plan" in celebration | Navigate to `/bible/plans` | Spec requirement #17 |
| BibleLanding entry point | Add "Browse Plans" to QuickActionsRow | Natural fit alongside existing quick actions (Read, Highlights, Bookmarks) |
| BiblePlanDetail back link | Change `← Bible` to `← All plans` linking to `/bible/plans` | Spec requirement #16. More useful navigation since user is in the plans section. |
| Filter bar overflow on mobile | Wrap to multiple rows | Spec allows wrapping; simpler than horizontal scroll |
| Continue button on in-progress card | Navigates to `/bible/plans/{slug}/day/{currentDay}` | Spec requirement #14 |

---

## Implementation Steps

### Step 1: Pure Filter Logic (`planFilters.ts`)

**Objective:** Create pure functions for filtering plans by theme and duration, and for splitting plans into sections.

**Files to create/modify:**
- `src/lib/bible/plans/planFilters.ts` — CREATE
- `src/lib/bible/plans/__tests__/planFilters.test.ts` — CREATE

**Details:**

Create `src/lib/bible/plans/planFilters.ts`:

```typescript
import type { PlanMetadata, PlanProgress, PlanTheme } from '@/types/bible-plans'

export type DurationFilter = 'any' | 'short' | 'medium' | 'long'

export interface PlanBrowserSections {
  inProgress: Array<{ plan: PlanMetadata; progress: PlanProgress }>
  browse: PlanMetadata[]
  completed: Array<{ plan: PlanMetadata; progress: PlanProgress }>
}

/** Duration filter ranges: short = ≤7 days, medium = 8-21 days, long = ≥22 days */
export function matchesDuration(duration: number, filter: DurationFilter): boolean

/** Parse URL theme param, returning 'all' for invalid values */
export function parseThemeParam(value: string | null): PlanTheme | 'all'

/** Parse URL duration param, returning 'any' for invalid values */
export function parseDurationParam(value: string | null): DurationFilter

/** Filter plans by theme and duration */
export function filterPlans(
  plans: PlanMetadata[],
  theme: PlanTheme | 'all',
  duration: DurationFilter,
): PlanMetadata[]

/** Split plans into three sections based on progress state */
export function splitIntoSections(
  allPlans: PlanMetadata[],
  progressMap: Record<string, PlanProgress>,
): PlanBrowserSections
```

**Split logic for `splitIntoSections`:**
1. For each plan in the manifest, look up its `PlanProgress` in the map by slug
2. If progress exists AND `completedAt` is null (or `pausedAt` is non-null but `completedAt` is null) → **in-progress** (active or paused)
3. If progress exists AND `completedAt` is non-null AND the plan is NOT also active/paused (i.e., no restarted-but-active state) → **completed**
4. Otherwise → **browse**
5. A plan that has both `completedAt` AND has been restarted (new progress record with no `completedAt`) → **in-progress only** (most-relevant-wins)

**Auth gating:** N/A — pure utility functions.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT mutate input arrays — return new arrays
- DO NOT throw on invalid inputs — use default values
- DO NOT import React or any UI libraries
- DO NOT read from localStorage — this is a pure function module

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| filterPlans: no filter returns all plans | unit | theme='all', duration='any' → all plans returned |
| filterPlans: theme only | unit | theme='comfort' → only comfort plans |
| filterPlans: duration only | unit | duration='short' → only plans with duration ≤ 7 |
| filterPlans: both filters | unit | theme='comfort' + duration='medium' → intersection |
| filterPlans: no matches | unit | theme='prayer' on non-prayer plans → empty array |
| filterPlans: empty manifest | unit | No plans → empty array |
| parseThemeParam: valid | unit | 'comfort' → 'comfort' |
| parseThemeParam: invalid | unit | 'badvalue' → 'all' |
| parseThemeParam: null | unit | null → 'all' |
| parseDurationParam: valid | unit | 'short' → 'short' |
| parseDurationParam: invalid | unit | 'badvalue' → 'any' |
| splitIntoSections: empty manifest | unit | No plans → all sections empty |
| splitIntoSections: no progress | unit | All plans in browse |
| splitIntoSections: active plan | unit | Active plan in inProgress, rest in browse |
| splitIntoSections: completed plan | unit | Completed plan in completed, rest in browse |
| splitIntoSections: restarted plan | unit | Restarted plan in inProgress only (not duplicated in completed) |
| matchesDuration: boundary ≤7 | unit | 7 → short, 8 → not short |
| matchesDuration: boundary 8-21 | unit | 8 → medium, 21 → medium, 22 → not medium |
| matchesDuration: boundary ≥22 | unit | 22 → long |

**Expected state after completion:**
- [ ] `planFilters.ts` exports all 5 functions
- [ ] 18 tests pass
- [ ] All functions are pure (no side effects)

---

### Step 2: `usePlanBrowser` Hook

**Objective:** Create the hook that composes manifest, store progress, and URL filter state into the three display sections.

**Files to create/modify:**
- `src/hooks/bible/usePlanBrowser.ts` — CREATE
- `src/hooks/bible/__tests__/usePlanBrowser.test.ts` — CREATE

**Details:**

```typescript
import { usePlansManifest } from './usePlansManifest'
import { useSearchParams } from 'react-router-dom'
import { useState, useEffect, useCallback, useSyncExternalStore } from 'react'
import { subscribe, getPlansState } from '@/lib/bible/plansStore'
import {
  filterPlans,
  splitIntoSections,
  parseThemeParam,
  parseDurationParam,
  type DurationFilter,
  type PlanBrowserSections,
} from '@/lib/bible/plans/planFilters'
import type { PlanTheme } from '@/types/bible-plans'

export interface UsePlanBrowserResult {
  sections: PlanBrowserSections
  filteredBrowse: PlanMetadata[]
  theme: PlanTheme | 'all'
  duration: DurationFilter
  setTheme: (theme: PlanTheme | 'all') => void
  setDuration: (duration: DurationFilter) => void
  clearFilters: () => void
  isEmpty: boolean           // manifest has no plans
  isFilteredEmpty: boolean   // filters exclude all browse plans
  isAllStarted: boolean      // browse section empty because all plans are started/completed
}
```

Key implementation:
- Use `useSyncExternalStore(subscribe, getPlansState)` to reactively track plan progress
- Read filter state from URL via `useSearchParams()` → `parseThemeParam`, `parseDurationParam`
- Write filter state to URL via `setSearchParams` with `replace: false` (so back button works)
- `clearFilters`: removes `theme` and `duration` from search params
- Compute `isAllStarted`: browse section is empty AND filters are at defaults AND manifest is non-empty

**Auth gating:** N/A — hook reads public data only.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT store filter state in localStorage — URL is the single source
- DO NOT use `replace: true` when setting search params — back button must work (spec #9)
- DO NOT use `useState` for filter state — derive from URL

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Returns empty sections when manifest is empty | unit | `isEmpty` is true, all sections empty |
| Splits plans into correct sections | unit | Mock manifest + progress → correct section assignment |
| Applies theme filter to browse section | unit | Set theme param → filtered browse |
| Applies duration filter to browse section | unit | Set duration param → filtered browse |
| Filters do not affect in-progress or completed | unit | In-progress plans visible regardless of filter |
| clearFilters resets to defaults | unit | After clearing, all browse plans visible |
| isFilteredEmpty is true when filters exclude all | unit | Active filter with no matches → true |
| isAllStarted is true when all plans started | unit | All plans in progress → true, browse empty |
| Reacts to plansStore changes | unit | Start a plan → it moves from browse to in-progress |

**Expected state after completion:**
- [ ] `usePlanBrowser.ts` exports hook with correct return shape
- [ ] 9 tests pass
- [ ] Filter state syncs with URL query params

---

### Step 3: Card Components (`PlanBrowseCard`, `PlanInProgressCard`, `PlanCompletedCard`)

**Objective:** Create the three card variants for the plan browser grid.

**Files to create/modify:**
- `src/components/bible/plans/PlanBrowseCard.tsx` — CREATE
- `src/components/bible/plans/PlanInProgressCard.tsx` — CREATE
- `src/components/bible/plans/PlanCompletedCard.tsx` — CREATE
- `src/components/bible/plans/__tests__/PlanBrowseCard.test.tsx` — CREATE
- `src/components/bible/plans/__tests__/PlanInProgressCard.test.tsx` — CREATE
- `src/components/bible/plans/__tests__/PlanCompletedCard.test.tsx` — CREATE

**Details:**

**All three cards share a common outer structure:**
- `<article>` element with `aria-label` for the plan title
- `rounded-2xl overflow-hidden` with `aspect-[4/3]` for consistent grid rhythm
- `relative flex flex-col justify-end p-5` for content positioning at the bottom of the card
- Content sits over the gradient/background with a dark scrim at the bottom for readability: `bg-gradient-to-t from-black/60 via-black/30 to-transparent`

**`PlanBrowseCard`:**
```typescript
interface PlanBrowseCardProps {
  plan: PlanMetadata
}
```
- Background: `bg-gradient-to-br ${plan.coverGradient}` applied to the outer `<article>`
- Content: title (`text-lg font-semibold text-white`), shortTitle (`text-sm text-white/60`), duration label (`text-xs text-white/50`: "7 days · 10 min/day"), curator (`text-xs text-white/50`: "By [curator]")
- Wrapped in `<Link to={/bible/plans/${plan.slug}}>` for navigation
- Hover: `motion-safe:hover:-translate-y-1 hover:shadow-lg hover:border-white/20 transition-all duration-200`
- Border: `border border-white/10`
- Focus-visible: standard Bible pattern (`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-dashboard-dark`)

**`PlanInProgressCard`:**
```typescript
interface PlanInProgressCardProps {
  plan: PlanMetadata
  progress: PlanProgress
}
```
- Same outer structure as browse card but with `coverGradient` background
- Additional: progress bar at bottom of card content area (`h-1 bg-white/30 rounded-full` track, `bg-white rounded-full` fill, width = `completedDays.length / plan.duration * 100%`)
- Current day preview: `text-sm text-white/80` showing "Day {progress.currentDay} of {plan.duration}"
- Explicit "Continue" button: small white pill (Pattern 1 — inline, smaller): `inline-flex min-h-[44px] items-center rounded-full bg-white/15 border border-white/20 px-4 py-2 text-sm font-medium text-white hover:bg-white/25 transition-colors`
- Continue navigates to `/bible/plans/${plan.slug}/day/${progress.currentDay}`
- If `pausedAt` is non-null, show "Paused" label in `text-xs text-white/50`

**`PlanCompletedCard`:**
```typescript
interface PlanCompletedCardProps {
  plan: PlanMetadata
  progress: PlanProgress
}
```
- Same outer structure as browse card with `coverGradient` background
- `opacity-85` on the entire card
- "Completed" badge in top-right corner: `absolute top-3 right-3 bg-white/15 text-white/80 text-xs rounded-full px-2 py-0.5`
- Completion date: `text-xs text-white/50` showing formatted date
- Wrapped in `<Link to={/bible/plans/${plan.slug}}>` for navigation
- Same hover and focus-visible as browse card

**Auth gating:** N/A — cards are presentational, navigation targets handle auth.

**Responsive behavior:**
- All cards use `aspect-[4/3]` so they maintain ratio regardless of column width
- Desktop (1024px+): Cards in 3-column grid → ~320px wide each
- Tablet (640px): Cards in 2-column grid → ~290px wide each
- Mobile (<640px): Cards full-width

**Guardrails (DO NOT):**
- DO NOT use `FrostedCard` for plan cards — the gradient IS the card
- DO NOT add `dangerouslySetInnerHTML`
- DO NOT add inline transform animations without `motion-safe:` prefix
- DO NOT use raw hex colors

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| BrowseCard: renders title and shortTitle | unit | Plan title and shortTitle visible |
| BrowseCard: renders duration and curator | unit | "7 days · 10 min/day" and "By [curator]" visible |
| BrowseCard: links to plan detail | unit | Link href = `/bible/plans/{slug}` |
| BrowseCard: applies coverGradient class | unit | `from-primary/30` class present on article |
| BrowseCard: has accessible article with aria-label | unit | `<article aria-label="[plan title]">` |
| InProgressCard: renders progress bar | unit | Progressbar element with correct aria values |
| InProgressCard: renders current day text | unit | "Day 3 of 21" visible |
| InProgressCard: Continue button links to current day | unit | Link href = `/bible/plans/{slug}/day/3` |
| InProgressCard: shows paused label when paused | unit | `pausedAt` non-null → "Paused" visible |
| CompletedCard: renders completed badge | unit | "Completed" text visible |
| CompletedCard: renders at reduced opacity | unit | `opacity-85` class present |
| CompletedCard: renders completion date | unit | Formatted date visible |
| CompletedCard: links to plan detail | unit | Link href = `/bible/plans/{slug}` |

**Expected state after completion:**
- [ ] 3 card components created
- [ ] 13 tests pass
- [ ] Cards are semantic `<article>` elements with proper accessibility

---

### Step 4: Filter Bar Components (`PlanFilterBar`, `PlanFilterPill`)

**Objective:** Create the filter bar with theme and duration pill rows.

**Files to create/modify:**
- `src/components/bible/plans/PlanFilterPill.tsx` — CREATE
- `src/components/bible/plans/PlanFilterBar.tsx` — CREATE
- `src/components/bible/plans/__tests__/PlanFilterBar.test.tsx` — CREATE

**Details:**

**`PlanFilterPill.tsx`:**
```typescript
interface PlanFilterPillProps {
  label: string
  isActive: boolean
  onClick: () => void
}
```
- `<button>` with `min-h-[44px]` (touch target), visual content is smaller via padding
- Active: `bg-white/15 text-white border border-white/20`
- Inactive: `bg-transparent text-white/60 border border-white/10 hover:text-white/80`
- Common: `rounded-full px-4 py-2 text-sm font-medium transition-colors`
- Focus-visible: standard Bible pattern
- `aria-pressed={isActive}` for toggle semantics

**`PlanFilterBar.tsx`:**
```typescript
interface PlanFilterBarProps {
  theme: PlanTheme | 'all'
  duration: DurationFilter
  onThemeChange: (theme: PlanTheme | 'all') => void
  onDurationChange: (duration: DurationFilter) => void
}
```
- Two rows wrapped in a `<nav aria-label="Plan filters">`
- Theme row: All, Comfort, Foundation, Emotional, Sleep, Wisdom, Prayer (7 pills)
- Duration row: Any length, 7 days or less, 8–21 days, 22+ days (4 pills)
- Each row: `flex flex-wrap gap-2` so pills wrap on mobile
- Row labels: `text-xs font-medium text-white/50 uppercase tracking-wider mb-2` — "Theme" and "Duration"
- Vertical gap between rows: `mt-4`

**Theme pill labels** (display labels for PlanTheme values):
```typescript
const THEME_LABELS: Record<PlanTheme | 'all', string> = {
  all: 'All', comfort: 'Comfort', foundation: 'Foundation',
  emotional: 'Emotional', sleep: 'Sleep', wisdom: 'Wisdom', prayer: 'Prayer'
}
```

**Duration pill labels:**
```typescript
const DURATION_LABELS: Record<DurationFilter, string> = {
  any: 'Any length', short: '7 days or less', medium: '8–21 days', long: '22+ days'
}
```

**Auth gating:** N/A — filter UI is public.

**Responsive behavior:**
- Desktop (1024px+): Both rows fit in a single line
- Mobile (<640px): Pills wrap to multiple rows via `flex-wrap`

**Inline position expectations:**
- Theme pills must share y-coordinate at 1024px+ (±5px tolerance)
- Duration pills must share y-coordinate at 1024px+ (±5px tolerance)
- Wrapping below 640px is acceptable

**Guardrails (DO NOT):**
- DO NOT use horizontal scrolling for pills — wrapping is the chosen approach
- DO NOT persist filter state in localStorage — URL only
- DO NOT make pills smaller than 44px touch target height

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Renders all 7 theme pills | unit | All theme labels visible |
| Renders all 4 duration pills | unit | All duration labels visible |
| Active theme pill has active styling | unit | Active pill has `aria-pressed="true"` |
| Clicking theme pill calls onThemeChange | unit | Click 'Comfort' → onThemeChange('comfort') |
| Clicking duration pill calls onDurationChange | unit | Click '7 days or less' → onDurationChange('short') |
| Pills are keyboard accessible | unit | Focus + Enter triggers click handler |

**Expected state after completion:**
- [ ] `PlanFilterPill.tsx` and `PlanFilterBar.tsx` created
- [ ] 6 tests pass
- [ ] Filter pills have correct `aria-pressed` state

---

### Step 5: Empty States and Section Wrapper

**Objective:** Create the empty state component and section wrapper.

**Files to create/modify:**
- `src/components/bible/plans/PlanBrowserEmptyState.tsx` — CREATE
- `src/components/bible/plans/PlanBrowserSection.tsx` — CREATE
- `src/components/bible/plans/__tests__/PlanBrowserEmptyState.test.tsx` — CREATE

**Details:**

**`PlanBrowserEmptyState.tsx`:**
```typescript
type EmptyVariant = 'no-manifest' | 'filtered-out' | 'all-started'

interface PlanBrowserEmptyStateProps {
  variant: EmptyVariant
  onClearFilters?: () => void
}
```

Three variants:
1. **`no-manifest`:** Icon (BookOpen from lucide), "No plans available yet" heading (`text-xl font-semibold text-white`), "Check back soon — new reading plans are on the way." subtext (`text-white/50`), "Open Bible" white pill CTA (Pattern 2) linking to `/bible`
2. **`filtered-out`:** "No plans match these filters" heading, "Try a different combination or clear your filters." subtext, "Clear filters" white pill CTA calling `onClearFilters`
3. **`all-started`:** Inline note only (no full-page empty state): `text-sm text-white/50` — "You've started every plan. Finish one to unlock restart from the detail page."

Layout: Centered column (`text-center flex flex-col items-center gap-4 py-16`) for variants 1 & 2. Variant 3 is a simple inline `<p>`.

**`PlanBrowserSection.tsx`:**
```typescript
interface PlanBrowserSectionProps {
  title: string
  children: React.ReactNode
  className?: string
}
```
- Section heading: `<h2 className="text-xl font-semibold text-white">{title}</h2>`
- Grid below: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 mt-4`
- Passes `children` into the grid

**Auth gating:** N/A.

**Responsive behavior:**
- Desktop (1024px+): Section heading full-width above grid
- Mobile: Same — heading stretches full width

**Guardrails (DO NOT):**
- DO NOT use `FrostedCard` for the empty state wrapper — plain centered text
- DO NOT use the `FeatureEmptyState` component (it has a different design language)

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| no-manifest: renders heading and CTA | unit | "No plans available yet" visible, "Open Bible" link present |
| filtered-out: renders heading and clear button | unit | "No plans match" visible, clear button present |
| filtered-out: clear button calls onClearFilters | unit | Click → callback fired |
| all-started: renders inline note | unit | "You've started every plan" text visible |

**Expected state after completion:**
- [ ] Both components created
- [ ] 4 tests pass

---

### Step 6: `PlanBrowserPage` (Route-Level Page Component)

**Objective:** Create the main page component that assembles all pieces: hero, filter bar, sections, cards, and empty states.

**Files to create/modify:**
- `src/pages/bible/PlanBrowserPage.tsx` — CREATE (new `pages/bible/` directory)
- `src/pages/bible/__tests__/PlanBrowserPage.test.tsx` — CREATE

**Details:**

Page structure (follows `BibleStub.tsx` pattern for hero, `BibleLanding.tsx` for content area):

```tsx
<Layout>
  <SEO title="Reading Plans — Bible (WEB)" description="Guided daily reading plans..." />
  <div className="min-h-screen bg-dashboard-dark">
    {/* Hero */}
    <section
      className="relative flex w-full flex-col items-center px-4 pt-32 pb-8 text-center antialiased sm:pt-36 sm:pb-12 lg:pt-40"
      style={ATMOSPHERIC_HERO_BG}
    >
      <h1 className="text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl" style={GRADIENT_TEXT_STYLE}>
        Reading Plans
      </h1>
      <p className="mt-3 text-base text-white/60 sm:text-lg">
        Guided daily reading to deepen your walk
      </p>
    </section>

    {/* Content */}
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <PlanFilterBar theme={theme} duration={duration} onThemeChange={setTheme} onDurationChange={setDuration} />

      {/* Empty state: no manifest */}
      {isEmpty && <PlanBrowserEmptyState variant="no-manifest" />}

      {/* In Progress section */}
      {!isEmpty && sections.inProgress.length > 0 && (
        <PlanBrowserSection title="In progress" className="mt-8">
          {sections.inProgress.map(({ plan, progress }) => (
            <PlanInProgressCard key={plan.slug} plan={plan} progress={progress} />
          ))}
        </PlanBrowserSection>
      )}

      {/* Browse Plans section */}
      {!isEmpty && (
        <PlanBrowserSection title="Browse plans" className="mt-12">
          {isAllStarted ? (
            <PlanBrowserEmptyState variant="all-started" />
          ) : isFilteredEmpty ? (
            <PlanBrowserEmptyState variant="filtered-out" onClearFilters={clearFilters} />
          ) : (
            filteredBrowse.map(plan => <PlanBrowseCard key={plan.slug} plan={plan} />)
          )}
        </PlanBrowserSection>
      )}

      {/* Completed section */}
      {!isEmpty && sections.completed.length > 0 && (
        <PlanBrowserSection title="Completed" className="mt-12">
          {sections.completed.map(({ plan, progress }) => (
            <PlanCompletedCard key={plan.slug} plan={plan} progress={progress} />
          ))}
        </PlanBrowserSection>
      )}
    </div>
  </div>
</Layout>
```

The page uses `usePlanBrowser()` to get all state: `{ sections, filteredBrowse, theme, duration, setTheme, setDuration, clearFilters, isEmpty, isFilteredEmpty, isAllStarted }`.

**Auth gating:** None — page is fully public.

**Responsive behavior:**
- Desktop (1440px): `max-w-6xl` container, 3-4 column grids
- Tablet (768px): 2 column grids, filter pills in single row
- Mobile (375px): 1 column, filter pills wrap

**Guardrails (DO NOT):**
- DO NOT add `GlowBackground` or `HorizonGlow` — this is an inner page using `ATMOSPHERIC_HERO_BG`
- DO NOT add auth gating to the page — it's fully public
- DO NOT import or use `FrostedCard` for the cards — they use `coverGradient`
- DO NOT create a loading state — manifest loads synchronously
- DO NOT add pagination — all plans render in grid

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Renders page title "Reading Plans" | integration | h1 with "Reading Plans" visible |
| Renders SEO meta | integration | Document title includes "Reading Plans" |
| Shows empty state when manifest is empty | integration | "No plans available yet" visible |
| Shows filter bar | integration | Theme and duration pills visible |
| Shows In Progress section when plans are active | integration | Mock active plan → "In progress" heading visible |
| Hides In Progress section when no active plans | integration | No active plans → "In progress" heading absent |
| Shows Browse Plans section with cards | integration | Mock manifest → plan cards visible |
| Shows Completed section when plans are done | integration | Mock completed plan → "Completed" heading visible |
| Filtered empty state shows clear button | integration | Apply filter with no matches → "Clear filters" button |
| URL params control initial filter state | integration | Render with `?theme=comfort` → comfort filter active |

**Expected state after completion:**
- [ ] `PlanBrowserPage.tsx` created in `pages/bible/` directory
- [ ] 10 tests pass
- [ ] All three sections render conditionally
- [ ] Filter bar controls are functional

---

### Step 7: Route Wiring + Cross-Feature Navigation Updates

**Objective:** Wire the route in `App.tsx`, update back link in `BiblePlanDetail`, add entry point in `BibleLanding`, and update `PlanCompletionCelebration`.

**Files to create/modify:**
- `src/App.tsx` — MODIFY: replace BibleStub with PlanBrowserPage lazy import
- `src/pages/BiblePlanDetail.tsx` — MODIFY: change back link to `/bible/plans`
- `src/pages/BibleLanding.tsx` — MODIFY: add "Browse Plans" link in quick actions area
- `src/components/bible/plans/PlanCompletionCelebration.tsx` — MODIFY: add "Start another plan" action
- `src/components/bible/landing/QuickActionsRow.tsx` — MODIFY: add "Browse Plans" action (if this component exists and is the right place)

**Details:**

**`App.tsx` changes:**

Replace the lazy import:
```typescript
// Remove:
const BibleStub = lazy(() => import('./pages/BibleStub').then((m) => ({ default: m.BibleStub })))
// Add:
const PlanBrowserPage = lazy(() => import('./pages/bible/PlanBrowserPage').then((m) => ({ default: m.PlanBrowserPage })))
```

Replace the route:
```typescript
// From:
<Route path="/bible/plans" element={<Suspense fallback={<RouteLoadingFallback />}><BibleStub page="plans" /></Suspense>} />
// To:
<Route path="/bible/plans" element={<Suspense fallback={<RouteLoadingFallback />}><PlanBrowserPage /></Suspense>} />
```

**Important:** Keep `BibleStub` import for the `/bible/search` route that still uses it.

**`BiblePlanDetail.tsx` changes:**

Change the back link (line ~102-107):
```typescript
// From:
<Link to="/bible" ...>← Bible</Link>
// To:
<Link to="/bible/plans" ...>← All plans</Link>
```

**`BibleLanding.tsx` changes:**

Add a "Browse plans" link near the `TodaysPlanCard`. The most natural placement is below the TodaysPlanCard, as a secondary text link:
```tsx
{/* After TodaysPlanCard */}
<div className="flex justify-center">
  <Link
    to="/bible/plans"
    className="inline-flex min-h-[44px] items-center text-sm font-medium text-white/60 hover:text-white transition-colors"
  >
    Browse all plans →
  </Link>
</div>
```

**`PlanCompletionCelebration.tsx` changes:**

Add a "Start another plan" link between the Continue button and Share button:
```tsx
<Link
  to="/bible/plans"
  className="inline-flex min-h-[44px] items-center justify-center text-sm text-white/60 transition-colors hover:text-white"
>
  Start another plan
</Link>
```

**Auth gating:** N/A — all changes are navigation links.

**Responsive behavior:**
- Desktop: Links appear inline
- Mobile: Links stack vertically (existing flex-col pattern in these components)

**Guardrails (DO NOT):**
- DO NOT remove the `BibleStub` component entirely — it's still used by `/bible/search`
- DO NOT change the route path — it must remain `/bible/plans`
- DO NOT add auth to the route — the page is public

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| App.tsx: /bible/plans renders PlanBrowserPage | integration | Navigate to `/bible/plans` → page heading visible |
| BiblePlanDetail: back link goes to /bible/plans | integration | "All plans" link with correct href |
| BibleLanding: "Browse all plans" link visible | integration | Link text and href present |
| PlanCompletionCelebration: "Start another plan" link | integration | Link text and href present |

**Expected state after completion:**
- [ ] `/bible/plans` renders `PlanBrowserPage` (not BibleStub)
- [ ] `BiblePlanDetail` links back to `/bible/plans`
- [ ] `BibleLanding` has visible "Browse all plans" entry point
- [ ] `PlanCompletionCelebration` has "Start another plan" action
- [ ] `BibleStub` still used for `/bible/search` only
- [ ] 4 tests pass
- [ ] `pnpm build` passes

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Pure filter logic (no UI, no React) |
| 2 | 1 | usePlanBrowser hook (composes filter logic + store + URL) |
| 3 | — | Card components (presentational, no filter logic) |
| 4 | — | Filter bar components (presentational) |
| 5 | — | Empty states and section wrapper (presentational) |
| 6 | 2, 3, 4, 5 | PlanBrowserPage (assembles all components) |
| 7 | 6 | Route wiring + cross-feature navigation updates |

**Parallelization:** Steps 1, 3, 4, 5 are independent and can be built in any order. Step 2 depends on Step 1. Step 6 depends on 2-5. Step 7 depends on 6.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Pure filter logic | [COMPLETE] | 2026-04-09 | Created `src/lib/bible/plans/planFilters.ts` + `__tests__/planFilters.test.ts`. 21 tests pass. All 5 functions exported. |
| 2 | usePlanBrowser hook | [COMPLETE] | 2026-04-09 | Created `src/hooks/bible/usePlanBrowser.ts` + `__tests__/usePlanBrowser.test.tsx` (.tsx for JSX wrapper). 9 tests pass. |
| 3 | Card components | [COMPLETE] | 2026-04-09 | Created PlanBrowseCard, PlanInProgressCard, PlanCompletedCard + 3 test files. 13 tests pass. |
| 4 | Filter bar components | [COMPLETE] | 2026-04-09 | Created PlanFilterPill, PlanFilterBar + test. 6 tests pass. |
| 5 | Empty states + section wrapper | [COMPLETE] | 2026-04-09 | Created PlanBrowserEmptyState, PlanBrowserSection + test. 4 tests pass. |
| 6 | PlanBrowserPage | [COMPLETE] | 2026-04-09 | Created `pages/bible/PlanBrowserPage.tsx` + test. 10 tests pass. Build clean. Mocked Layout/SEO in tests to avoid provider deps. |
| 7 | Route wiring + cross-feature nav | [COMPLETE] | 2026-04-09 | Wired PlanBrowserPage route in App.tsx, changed BiblePlanDetail back link to `/bible/plans`, added "Browse all plans →" to BibleLanding, added "Start another plan" to PlanCompletionCelebration. Updated PlanCompletionCelebration test with MemoryRouter wrapper. Build clean. 2 pre-existing BibleLanding test failures unrelated. |
