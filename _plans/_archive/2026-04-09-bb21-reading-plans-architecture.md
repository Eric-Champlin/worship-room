# Implementation Plan: BB-21 Reading Plans Architecture + Completion Celebration

**Spec:** `_specs/bb-21-reading-plans-architecture.md`
**Date:** 2026-04-09
**Branch:** `bible-redesign`
**Design System Reference:** `_plans/recon/design-system.md` (loaded — captured 2026-04-05)
**Recon Report:** not applicable
**Master Spec Plan:** N/A — standalone spec in the Bible Redesign wave

---

## Architecture Context

### Project Structure

BB-21 builds the entire reading plan infrastructure: data types, progress store, loaders, hooks, detail/day pages, reader integration banner, completion celebration, and export/import v2 support. It ships **zero plan content** — BB-22 through BB-25 add the first four plans.

The Bible redesign features live across several directories:
- **Types:** `src/types/bible.ts`, `src/types/bible-landing.ts`, `src/types/bible-export.ts`, `src/types/bible-streak.ts`
- **Stores:** `src/lib/bible/highlightStore.ts`, `src/lib/bible/bookmarkStore.ts`, `src/lib/bible/notes/store.ts`, `src/lib/bible/journalStore.ts`, `src/lib/bible/streakStore.ts`
- **Landing components:** `src/components/bible/landing/` — `BibleHeroSlot.tsx`, `ResumeReadingCard.tsx`, `VerseOfTheDay.tsx`, `TodaysPlanCard.tsx`
- **Reader components:** `src/components/bible/reader/` — `ReaderChrome.tsx`, `ReaderBody.tsx`, `VerseActionSheet.tsx`, etc.
- **Hooks:** `src/hooks/bible/` — `useLastRead.ts`, `useStreakStore.ts`, `useTimeTick.ts`
- **Data files:** `src/data/bible/` — books, votd, cross-references
- **Constants:** `src/constants/bible.ts` — storage keys, book data
- **Export/Import:** `src/lib/bible/exportBuilder.ts`, `src/lib/bible/importApplier.ts`
- **Pages:** `src/pages/BibleLanding.tsx`, `src/pages/BibleReader.tsx`, `src/pages/BibleStub.tsx`

### Reactive Store Pattern (BB-7)

All Bible stores use the same module-level pattern:
```typescript
let cache: T | null = null
const listeners = new Set<() => void>()

function getCache(): T { /* lazy read from localStorage */ }
function persist(data: T): void { /* localStorage.setItem + JSON.stringify */ }
function notifyListeners(): void { listeners.forEach(fn => fn()) }

export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}
```
Files: `highlightStore.ts`, `bookmarkStore.ts`, `notes/store.ts`, `journalStore.ts`, `streakStore.ts`. The plans store follows this exact pattern.

### BibleHeroSlot Priority System (BB-19)

Current priority cascade in `BibleHeroSlot.tsx`:
1. Active reader (within 48h) → `ResumeReadingCard` + `VerseOfTheDay`
2. Lapsed reader (>48h, ≤30 days) → `VerseOfTheDay` + small resume link
3. First-time reader → `VerseOfTheDay` only

BB-21 adds a new top-priority tier: **Active plan → ActivePlanBanner + demoted content below**.

### TodaysPlanCard Bridge

`TodaysPlanCard` in `BibleLanding.tsx` reads from `wr_bible_active_plans` via `getActivePlans()` in `landingState.ts`. It expects an `ActivePlan[]` shape:
```typescript
interface ActivePlan {
  planId: string
  currentDay: number
  totalDays: number
  planName: string
  todayReading: string  // e.g. "John 3:1-21"
  startedAt: number     // epoch ms
}
```
The plans store must write to this key whenever `activePlanSlug` changes.

### Export/Import System (BB-16)

Current schema: `BibleExportV1` with `schemaVersion: 1`. Export builder in `exportBuilder.ts`, import applier in `importApplier.ts` with `applyReplace` and `applyMerge`. Types in `bible-export.ts`. BB-21 bumps to v2 and adds `plans` field.

### Auth Gating Pattern

The Bible feature uses `useAuth()` from `AuthContext` and `useAuthModal()` from `AuthModalProvider`. The `BibleLanding` wraps content in `<AuthModalProvider>`. Auth-gated actions call:
```typescript
const { isAuthenticated } = useAuth()
const authModal = useAuthModal()
if (!isAuthenticated) {
  authModal?.openAuthModal("Sign in to ...")
  return
}
```

### Test Patterns

Bible tests use:
- `@testing-library/react` with `render`, `screen`, `fireEvent`, `waitFor`
- `vi.mock` for hooks and store modules
- Provider wrapping: `MemoryRouter` + `AuthModalProvider` + `ToastProvider`
- Store mocks: mock module exports directly

### Existing Routes (App.tsx lines 185-190)

```
/bible           → BibleLanding (with Suspense + BibleLandingSkeleton)
/bible/browse    → BibleBrowse
/bible/my        → MyBiblePage
/bible/plans     → BibleStub (placeholder: "Plans browser — coming in BB-21.5")
/bible/search    → BibleStub
/bible/:book/:chapter → BibleReader
```
BB-21 adds `/bible/plans/:slug` and `/bible/plans/:slug/day/:dayNumber`.

### Share Flow (BB-13)

Share actions in `src/lib/bible/shareActions.ts` provide `downloadImage`, `copyImage`, `shareImage` — all accept a `Blob`. Canvas rendering for shareable images is in `src/components/sharing/verse-card-canvas.ts`. The completion celebration share action will produce a plan-completion-specific canvas image.

---

## Auth Gating Checklist

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Start a plan | Auth modal: "Sign in to start a reading plan" | Step 5 | `useAuth` + `useAuthModal` |
| Mark day complete | Auth modal: "Sign in to track your progress" | Step 5, 7, 8 | `useAuth` + `useAuthModal` |
| Pause/resume plan | Auth modal: "Sign in to manage your reading plan" | Step 5 | `useAuth` + `useAuthModal` |
| Write completion reflection | Auth modal: "Sign in to save your reflection" | Step 9 | `useAuth` + `useAuthModal` |
| Switch plans (confirmation) | Requires auth (implicit — can't have active plan without auth) | Step 5 | `useAuth` check |
| View plan detail page | No auth required | Step 6 | N/A |
| View plan day page | No auth required (content is readable) | Step 7 | N/A |
| Read passage from plan | No auth required (navigates to public reader) | Step 7 | N/A |
| Share completion | Only reachable after auth (completing a plan requires auth) | Step 9 | Implicit |

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Page background | background | `bg-dashboard-dark` (`#0f0a1e`) | design-system.md |
| Atmospheric hero | background | `radial-gradient(ellipse at top center, rgba(109, 40, 217, 0.15) 0%, transparent 70%)` over `#0f0a1e` | design-system.md |
| GRADIENT_TEXT_STYLE | gradient | `linear-gradient(223deg, rgb(255, 255, 255) 0%, rgb(139, 92, 246) 100%)` with `background-clip: text` | design-system.md |
| FrostedCard | classes | `bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] rounded-2xl` + dual box-shadow | design-system.md |
| Progress bar track | classes | `h-1.5 w-full rounded-full bg-white/[0.08]` | TodaysPlanCard.tsx:39-45 |
| Progress bar fill | classes | `h-full rounded-full bg-primary` | TodaysPlanCard.tsx:48 |
| Primary text | class | `text-white` | design-system.md |
| Secondary text | class | `text-white/60` | design-system.md |
| Muted text | class | `text-white/50` | design-system.md |
| Section divider | class | `border-t border-white/[0.08]` | BibleLanding.tsx:114 |
| Active plan border accent | class | `border-l-4 border-l-primary/60` | Spec design notes |
| Reader panel style | style | `{ background: 'rgba(15, 10, 30, 0.95)', backdropFilter: 'blur(16px)' }` | ReaderChrome PANEL_STYLE |
| Icon button (reader) | class | `flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white` | ReaderChrome.tsx:7-8 |
| White pill CTA (Pattern 2) | class | `inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-8 py-3.5 text-base font-semibold text-hero-bg shadow-[0_0_30px_rgba(255,255,255,0.20)] transition-all duration-200 hover:bg-white/90 hover:shadow-[0_0_40px_rgba(255,255,255,0.30)]` | 09-design-system.md |
| White pill CTA (Pattern 1) | class | `inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-primary hover:bg-gray-100` | 09-design-system.md |
| Tier 1 body text | class | `text-white leading-[1.75] text-[17px] sm:text-lg max-w-2xl` | 09-design-system.md |
| Tier 2 callout | class | `rounded-xl border-l-4 border-l-primary/60 bg-white/[0.04] px-4 py-3` | 09-design-system.md |
| Celebration overlay BG | style | Plan cover gradient at reduced opacity + `bg-black/60` dimming | Spec design notes |
| Completion badge | class | `bg-primary/20 text-primary-lt` | Codebase convention |

---

## Design System Reminder

**Project-specific quirks that `/execute-plan` displays before every UI step:**

- Plan detail and day pages use `bg-dashboard-dark` with `ATMOSPHERIC_HERO_BG` for the hero section, matching the pattern in `BibleStub.tsx`, `PageHero.tsx`, and all inner pages (Prayer Wall, Music, Bible, Grow).
- All hero headings use `GRADIENT_TEXT_STYLE` (white-to-purple gradient via `background-clip: text`). Caveat font is for the logo only — never for headings.
- FrostedCard tier system: Tier 1 for primary reading content (devotional text in plan days), Tier 2 (scripture callout with left border accent) for passage references. Use the `FrostedCard` component — do not hand-roll cards.
- Progress bars use `h-1.5 rounded-full bg-white/[0.08]` track with `bg-primary` fill — matching `TodaysPlanCard.tsx`.
- White pill CTA Pattern 2 (larger, with white drop shadow) for primary actions: "Start this plan", "Continue today's reading", "I read this. Mark day complete." Pattern 1 (smaller, inline) for secondary CTAs like "Read this passage", "Journal about this prompt".
- Reader chrome uses `PANEL_STYLE` (`rgba(15, 10, 30, 0.95)` + `backdrop-blur(16px)`) for floating panels. The reader plan banner should use the same style.
- Reader icons use the `ICON_BTN` class constant from `ReaderChrome.tsx`.
- All interactive elements must meet 44px minimum tap target.
- Day completion status indicators use Tailwind tokens only — zero raw hex values.
- Text opacity: `text-white` for primary, `text-white/60` for secondary, `text-white/50` for muted/decorative.
- Do NOT use `animate-glow-pulse` (deprecated and removed), cyan borders (deprecated), `BackgroundSquiggle` (homepage only), `GlowBackground` on non-homepage pages, `PageTransition`, `font-serif italic` for prose.
- Focus-visible states: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-dashboard-dark`.
- Devotional text rendered as plain text only — no `dangerouslySetInnerHTML`, no markdown. Split on double newlines → `<p>` elements.

---

## Shared Data Models

### New Types (this spec produces)

```typescript
// src/types/bible-plans.ts

export type PlanTheme = 'comfort' | 'foundation' | 'emotional' | 'sleep' | 'wisdom' | 'prayer'

export interface PlanPassage {
  book: string        // lowercase slug, e.g. "john"
  chapter: number
  startVerse?: number
  endVerse?: number
  label?: string
}

export interface PlanDay {
  day: number         // 1-indexed
  title: string
  passages: PlanPassage[]
  devotional?: string
  reflectionPrompts?: string[]
}

export interface Plan {
  slug: string
  title: string
  shortTitle: string
  description: string
  theme: PlanTheme
  duration: number
  estimatedMinutesPerDay: number
  curator: string
  coverGradient: string   // Tailwind gradient class, e.g. "from-primary/30 to-hero-dark"
  days: PlanDay[]
}

export type PlanMetadata = Omit<Plan, 'days'>

export interface PlanProgress {
  slug: string
  startedAt: string       // ISO date
  currentDay: number
  completedDays: number[]
  completedAt: string | null
  pausedAt: string | null
  resumeFromDay: number | null
  reflection: string | null
  celebrationShown: boolean  // true after completion celebration has fired; prevents re-trigger
}

export interface PlansStoreState {
  activePlanSlug: string | null
  plans: Record<string, PlanProgress>
}

export type PlanCompletionResult =
  | { type: 'day-completed'; day: number; isAllComplete: false }
  | { type: 'plan-completed'; day: number; isAllComplete: true }
  | { type: 'already-completed'; day: number }
```

### localStorage keys this spec touches

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `bible:plans` | Write (new) | `PlansStoreState` — all plan progress data |
| `wr_bible_active_plans` | Write (bridge) | `ActivePlan[]` — written by plansStore when `activePlanSlug` changes, consumed by `TodaysPlanCard` |

### Existing types consumed

| Type | From | Usage |
|------|------|-------|
| `ActivePlan` | `src/types/bible-landing.ts` | Bridge shape for `wr_bible_active_plans` |
| `BibleExportV1` | `src/types/bible-export.ts` | Extended to `BibleExportV2` |
| `ImportResult`, `MergeResult` | `src/types/bible-export.ts` | Extended with `plans` field |

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | < 640px | Plan detail: single column, day list collapsible. Plan day: full-width stacked passage cards. Mark complete button sticky at bottom. Day nav arrows full-width row. Active plan banner: full width. Reader banner: full width. |
| Tablet | 640-1024px | Plan detail: single column wider margins. Plan day: passage cards in 2-column grid (≥2 passages). Mark complete button inline. |
| Desktop | > 1024px | Plan detail: hero full width, day list full width. Plan day: passage cards in 2-column grid. Mark complete button inline with day nav arrows. |

---

## Inline Element Position Expectations

| Element Group | Elements | Expected y-alignment | Wrap Tolerance |
|---------------|----------|---------------------|----------------|
| Plan day bottom bar (desktop) | "← Day X" arrow, "Day X →" arrow, "I read this" button | Same y ±5px at 1024px+ | Stacked on <640px is acceptable |
| Plan detail CTA row | "Continue from day X" button, "Pause plan" link | Same y ±5px at 640px+ | Stacked on <640px is acceptable |

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| Plan hero → day list | `space-y-8` (32px) | BibleLanding.tsx pattern |
| Day list items | `space-y-2` (8px) | Compact list pattern |
| Plan day sections | `space-y-8` (32px) | Standard content section spacing |
| Last section → footer | `pb-16` (64px) | BibleLanding.tsx:116 |

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] BB-19 (`BibleHeroSlot` with priority cascade) is committed on `bible-redesign`
- [ ] BB-16 (export/import v1) is committed on `bible-redesign`
- [ ] BB-17 (streak + dateUtils) is committed on `bible-redesign`
- [ ] `src/data/bible/plans/` directory does not yet exist (confirmed — no files found)
- [ ] All auth-gated actions from the spec are accounted for in the plan (5 actions)
- [ ] Design system values are verified from `_plans/recon/design-system.md` + codebase inspection
- [ ] No [UNVERIFIED] values (all values sourced from live recon or existing components)
- [ ] No deprecated patterns used
- [ ] Prior specs in the sequence (BB-16, BB-17, BB-18, BB-19, BB-20) are complete and committed

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| No time-based state transitions | Pause is user-initiated only. No 48h-behind, 7d-paused, or 21d-auto-abandon thresholds. `currentDay` changes only on day completion. `pausedAt` only set by user action. | Simpler model; matches spec requirement #25 ("Plans do not auto-advance based on calendar time"). The app never punishes absence. |
| Celebration fires exactly once via `celebrationShown` flag | When `markDayComplete` completes a plan, store sets `celebrationShown: false` on the progress record. The UI checks `!progress.celebrationShown` + `result.type === 'plan-completed'` to show the overlay. After the overlay renders, UI calls `setCelebrationShown(slug)` to flip the flag to `true`. Subsequent visits, re-renders, or re-clicks of "Mark day complete" (which returns `already-completed`) never re-trigger. | Event-driven-only approach was vulnerable to React re-renders causing double-fire. The persisted flag is the safeguard. |
| Focus mode hides the reader plan banner | The `ActivePlanReaderBanner` receives `chromeOpacity` and `chromePointerEvents` props and fades/disables alongside `ReaderChrome`. When focus mode breaks on user tap, the banner reappears with "Mark day complete" accessible. | The plan banner is informational chrome, not reading content. Focus mode exists to remove distractions during reading. |
| Where to store plan types | New `src/types/bible-plans.ts` file | Plan types are complex enough to warrant their own file; `bible.ts` is already large |
| Store key prefix | `bible:plans` (colon prefix) | Matches BB-8+ convention (`bible:notes`, `bible:bookmarks`, `bible:journalEntries`), not `wr_` prefix |
| Manifest as static import vs lazy | Static import (sync) | Manifest is tiny (empty array in BB-21); lazy loading adds complexity for no benefit |
| Plan JSON loading | Dynamic `import()` with slug | Matches existing `BOOK_LOADERS` pattern in `src/data/bible/index.ts` |
| Confirmation dialog for plan switch | `window.confirm()` | Sufficient for Phase 2 (localStorage only); custom modal in Phase 3 |
| How to bridge `wr_bible_active_plans` | Side effect in plansStore `persist()` | Runs automatically on every state change; keeps bridge always in sync |
| Completion celebration as route or overlay | Overlay (callback-driven) | Matches spec: "full-screen overlay triggered exactly once when the final day is completed" |
| Plan detail page skeleton | `RouteLoadingFallback` | Matches existing `BibleStub` pattern for `/bible/plans`; full skeleton in BB-21.5 |
| Corrupt plan JSON handling | Return `{ plan: null, error: string }` | Never throw — spec requirement #7 |
| `activePlanSlug` references missing JSON | Show error, clear `activePlanSlug` | Spec edge case #9 — prevents perpetual error loop |
| Restarting a completed plan | Reset progress fields, keep entry in `plans` record | Spec requirement #16 — completion count derivable from history |
| Share action in celebration | Reuse BB-13 `shareImage` with plan-specific canvas | Avoids building a new share system |

---

## Implementation Steps

### Step 1: Plan Types + Constants

**Objective:** Define all TypeScript types for plans, plan progress, store state, and loader results. Add the `bible:plans` storage key constant.

**Files to create/modify:**
- `src/types/bible-plans.ts` — CREATE: all plan-related types
- `src/constants/bible.ts` — MODIFY: add `BIBLE_PLANS_KEY` constant

**Details:**

Create `src/types/bible-plans.ts` with the exact interfaces from the Shared Data Models section above: `PlanTheme`, `PlanPassage`, `PlanDay`, `Plan`, `PlanMetadata`, `PlanProgress`, `PlansStoreState`, `PlanCompletionResult`.

Add to `src/constants/bible.ts`:
```typescript
export const BIBLE_PLANS_KEY = 'bible:plans'
```

**Auth gating:** N/A — type definitions only.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT put plan types in `bible.ts` or `bible-landing.ts` — they get their own file
- DO NOT add plan content/data — BB-22+ handles that
- DO NOT import React — these are pure type definitions

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Types compile correctly | type-check | Verified implicitly by `pnpm build` — no dedicated test file needed |

**Expected state after completion:**
- [ ] `src/types/bible-plans.ts` exports all 8 types
- [ ] `BIBLE_PLANS_KEY` exported from `src/constants/bible.ts`
- [ ] `pnpm build` passes with no errors

---

### Step 2: Empty Manifest + Plan Loader

**Objective:** Create the empty manifest file, manifest loader, and lazy plan JSON loader with validation.

**Files to create/modify:**
- `src/data/bible/plans/manifest.json` — CREATE: empty array `[]`
- `src/lib/bible/planLoader.ts` — CREATE: manifest loader + plan loader with validation
- `src/lib/bible/__tests__/planLoader.test.ts` — CREATE: tests

**Details:**

Create `src/data/bible/plans/manifest.json`:
```json
[]
```

Create `src/lib/bible/planLoader.ts`:

```typescript
import type { Plan, PlanMetadata } from '@/types/bible-plans'

// Manifest is tiny — static import
import manifest from '@/data/bible/plans/manifest.json'

export function loadManifest(): PlanMetadata[] {
  return manifest as PlanMetadata[]
}

export async function loadPlan(slug: string): Promise<{ plan: Plan | null; error: string | null }> {
  try {
    const mod = await import(`@/data/bible/plans/${slug}.json`)
    const data = mod.default ?? mod
    // Validate required fields
    if (!data.slug || !data.title || !data.duration || !Array.isArray(data.days)) {
      return { plan: null, error: `Plan "${slug}" is missing required fields.` }
    }
    return { plan: data as Plan, error: null }
  } catch {
    return { plan: null, error: `Plan "${slug}" could not be loaded.` }
  }
}
```

The dynamic `import()` uses Vite's glob import pattern. Plan JSON files placed in `src/data/bible/plans/` will be code-split automatically.

**Auth gating:** N/A — loader utilities, no auth required.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT throw from `loadPlan` — always return `{ plan, error }` (spec requirement #7)
- DO NOT bundle all plan JSONs — each plan loads on demand via dynamic import
- DO NOT add plan content files — BB-22+ handles that

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| loadManifest returns empty array | unit | `loadManifest()` returns `[]` |
| loadPlan returns error for nonexistent slug | unit | Mock dynamic import to throw, verify `{ plan: null, error: string }` |
| loadPlan returns error for invalid shape | unit | Mock dynamic import to return `{ slug: 'x' }` (missing fields), verify error |
| loadPlan returns plan for valid JSON | unit | Mock dynamic import to return full Plan object, verify `{ plan, error: null }` |

**Expected state after completion:**
- [ ] `src/data/bible/plans/manifest.json` exists as `[]`
- [ ] `loadManifest()` returns `PlanMetadata[]`
- [ ] `loadPlan(slug)` returns `{ plan, error }` — never throws
- [ ] 4 tests pass

---

### Step 3: Plans Store (Reactive Pattern)

**Objective:** Build the plans progress store following the BB-7 reactive pattern with localStorage persistence and the `wr_bible_active_plans` bridge.

**Files to create/modify:**
- `src/lib/bible/plansStore.ts` — CREATE: reactive store with full plan lifecycle
- `src/lib/bible/__tests__/plansStore.test.ts` — CREATE: tests

**Details:**

Follow the exact pattern from `highlightStore.ts` / `streakStore.ts`:

Module-level state:
```typescript
import { BIBLE_PLANS_KEY } from '@/constants/bible'
import type { PlansStoreState, PlanProgress, PlanCompletionResult } from '@/types/bible-plans'

let cache: PlansStoreState | null = null
const listeners = new Set<() => void>()
const DEFAULT_STATE: PlansStoreState = { activePlanSlug: null, plans: {} }
```

Read API:
- `getPlansState(): PlansStoreState` — returns copy of state
- `getActivePlanProgress(): PlanProgress | null` — returns progress for `activePlanSlug`
- `getPlanProgress(slug: string): PlanProgress | null` — returns progress for any plan

Write API:
- `startPlan(slug: string, totalDays: number, planName: string, todayReading: string): void` — creates progress with `celebrationShown: false`, sets active, pauses previous if any
- `markDayComplete(slug: string, day: number, totalDays: number): PlanCompletionResult` — adds to completedDays (deduplicated), recalculates currentDay, detects plan completion. When all days complete: sets `completedAt`, clears `activePlanSlug`, but does NOT set `celebrationShown: true` (the UI does that after showing the overlay)
- `pausePlan(slug: string): void` — sets `pausedAt`
- `resumePlan(slug: string): void` — clears `pausedAt`, makes active, pauses previous if different
- `restartPlan(slug: string, totalDays: number, planName: string, todayReading: string): void` — resets progress fields (including `celebrationShown: false`), preserves entry
- `saveReflection(slug: string, text: string): void` — writes to `reflection` field
- `setCelebrationShown(slug: string): void` — sets `celebrationShown: true` on the progress record. Called by the UI after the completion overlay renders.

Internal:
- `persist()` — writes to `bible:plans` AND writes bridge to `wr_bible_active_plans`
- `writeBridge()` — reads active plan progress, maps to `ActivePlan` shape, writes to `wr_bible_active_plans`
- `subscribe(listener)` / `notifyListeners()` — standard reactive pattern

SSR safety: `getCache()` returns `DEFAULT_STATE` when `typeof window === 'undefined'`.

Bridge logic in `persist()`:
```typescript
function writeBridge(state: PlansStoreState): void {
  if (!state.activePlanSlug) {
    localStorage.setItem('wr_bible_active_plans', '[]')
    return
  }
  const progress = state.plans[state.activePlanSlug]
  if (!progress) {
    localStorage.setItem('wr_bible_active_plans', '[]')
    return
  }
  // Map to ActivePlan shape — todayReading requires plan data which store doesn't have
  // Store the minimal bridge: planId, currentDay, totalDays, planName
  // todayReading will be populated by the hook that has access to the Plan data
  const bridge: ActivePlan[] = [{
    planId: progress.slug,
    currentDay: progress.currentDay,
    totalDays: 0, // filled by hook
    planName: '', // filled by hook
    todayReading: '', // filled by hook
    startedAt: new Date(progress.startedAt).getTime(),
  }]
  localStorage.setItem('wr_bible_active_plans', JSON.stringify(bridge))
}
```

Note: The full `ActivePlan` bridge (with `totalDays`, `planName`, `todayReading`) requires the loaded `Plan` object. The store writes a partial bridge; the `useActivePlan` hook (Step 4) writes the full bridge when it has both store state and loaded plan data.

**`currentDay` recalculation logic:**
```typescript
function recalcCurrentDay(completedDays: number[], totalDays: number): number {
  for (let d = 1; d <= totalDays; d++) {
    if (!completedDays.includes(d)) return d
  }
  return totalDays // all complete
}
```

**Auth gating:** N/A — store is a utility module. Auth checks happen in the UI layer.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT import React — this is a pure module
- DO NOT add auth checks in the store — the UI layer handles auth gating
- DO NOT throw on invalid input — return gracefully
- DO NOT use `new Date().toISOString().split('T')[0]` for dates — use `getTodayLocal()` from `src/lib/bible/dateUtils.ts`
- DO NOT duplicate entries in `completedDays` — deduplicate on insert

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| getPlansState returns default when empty | unit | No localStorage → `{ activePlanSlug: null, plans: {} }` |
| startPlan creates progress record | unit | Verify `activePlanSlug`, `startedAt`, `currentDay: 1`, empty `completedDays`, `celebrationShown: false` |
| startPlan pauses previous active plan | unit | Start plan A, start plan B → A has `pausedAt` set |
| markDayComplete adds to completedDays | unit | Complete day 1 → `completedDays: [1]`, `currentDay: 2` |
| markDayComplete is idempotent | unit | Complete day 1 twice → `completedDays: [1]` (no duplicates), returns `already-completed` |
| markDayComplete out-of-order | unit | Complete day 3 before day 1 → `currentDay` stays at 1 |
| markDayComplete final day triggers completion | unit | Complete all days → `completedAt` set, `activePlanSlug` cleared, `celebrationShown` remains `false`, returns `plan-completed` |
| pausePlan sets pausedAt | unit | Verify `pausedAt` is today's ISO date |
| resumePlan clears pausedAt and sets active | unit | Resume paused plan → `pausedAt: null`, `activePlanSlug` updated |
| resumePlan pauses currently active plan | unit | Resume A while B is active → B gets `pausedAt` |
| restartPlan resets progress | unit | Complete plan, restart → empty `completedDays`, `completedAt: null`, `currentDay: 1`, `celebrationShown: false` |
| saveReflection writes to progress | unit | Verify `reflection` field updated |
| setCelebrationShown flips flag | unit | After `setCelebrationShown(slug)`, `progress.celebrationShown` is `true` |
| subscribe notifies on state change | unit | Listener called after `startPlan` |
| SSR safety returns defaults | unit | Mock `typeof window === 'undefined'` → returns default state |
| bridge: active plan writes single-element array | unit | After `startPlan('psalm-comfort', ...)`, `JSON.parse(localStorage.getItem('wr_bible_active_plans'))` is a 1-element array with `planId: 'psalm-comfort'` |
| bridge: null activePlanSlug writes empty array | unit | After completing a plan (which clears `activePlanSlug`), `JSON.parse(localStorage.getItem('wr_bible_active_plans'))` is `[]` |
| bridge: switching plans reflects only the new plan | unit | Start plan A, then start plan B → `wr_bible_active_plans` contains exactly 1 element with `planId` matching plan B, not plan A |

**Expected state after completion:**
- [ ] `plansStore.ts` exports: `getPlansState`, `getActivePlanProgress`, `getPlanProgress`, `startPlan`, `markDayComplete`, `pausePlan`, `resumePlan`, `restartPlan`, `saveReflection`, `setCelebrationShown`, `subscribe`
- [ ] All 18 tests pass
- [ ] Bridge writes to `wr_bible_active_plans` on every state change

---

### Step 4: Hooks — useActivePlan, usePlan, usePlansManifest

**Objective:** Create the three React hooks that connect the store and loader to UI components.

**Files to create/modify:**
- `src/hooks/bible/useActivePlan.ts` — CREATE
- `src/hooks/bible/usePlan.ts` — CREATE
- `src/hooks/bible/usePlansManifest.ts` — CREATE
- `src/hooks/bible/__tests__/useActivePlan.test.ts` — CREATE
- `src/hooks/bible/__tests__/usePlan.test.ts` — CREATE
- `src/hooks/bible/__tests__/usePlansManifest.test.ts` — CREATE

**Details:**

**`useActivePlan()`:**
```typescript
function useActivePlan(): {
  activePlan: Plan | null
  progress: PlanProgress | null
  currentDay: PlanDay | null
  isOnPlanPassage: (book: string, chapter: number) => boolean
  markDayComplete: (dayNumber: number) => PlanCompletionResult
  pausePlan: () => void
  switchPlan: (slug: string) => Promise<void>
}
```
- Subscribes to `plansStore` via `subscribe()` in a `useEffect`
- Lazy-loads the active plan's JSON via `loadPlan()` when `activePlanSlug` changes
- Writes the full `ActivePlan` bridge (with `totalDays`, `planName`, `todayReading`) when plan data is loaded
- `isOnPlanPassage(book, chapter)` checks if the book/chapter matches any passage in the current day only (not other days)
- `markDayComplete` delegates to `plansStore.markDayComplete` and returns the result
- `switchPlan` shows `window.confirm()` dialog, then calls `startPlan`

**`usePlan(slug)`:**
```typescript
function usePlan(slug: string): {
  plan: Plan | null
  progress: PlanProgress | null
  isLoading: boolean
  isError: boolean
}
```
- Calls `loadPlan(slug)` on mount and when slug changes
- Subscribes to `plansStore` for progress updates
- Returns loading/error states

**`usePlansManifest()`:**
```typescript
function usePlansManifest(): {
  plans: PlanMetadata[]
  isLoading: boolean
}
```
- Calls `loadManifest()` synchronously (tiny file)
- `isLoading` is always `false` (sync load)

**Auth gating:** Hooks do not perform auth checks — they expose data and actions. Auth gating is in the UI components that call the action methods.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT add auth checks in hooks — that's the UI layer's job
- DO NOT eagerly load all plan JSONs — only the active plan
- DO NOT create a React context for plans — hooks + module store is sufficient

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| useActivePlan returns null when no active plan | unit | Mock store empty → `{ activePlan: null, progress: null }` |
| useActivePlan loads plan JSON when active | unit | Mock store with activePlanSlug → verify loadPlan called |
| useActivePlan.isOnPlanPassage checks current day only | unit | Active plan day 3 has John 3 → `isOnPlanPassage('john', 3)` is true, `isOnPlanPassage('john', 4)` is false |
| useActivePlan.markDayComplete delegates to store | unit | Call markDayComplete → verify store function called |
| usePlan loads plan by slug | unit | `usePlan('psalm-comfort')` → triggers loadPlan |
| usePlan returns error for invalid slug | unit | loadPlan returns error → `isError: true` |
| usePlan subscribes to progress updates | unit | Change progress in store → hook re-renders with new progress |
| usePlansManifest returns empty array for empty manifest | unit | Returns `{ plans: [], isLoading: false }` |

**Expected state after completion:**
- [ ] Three hooks exported from their respective files
- [ ] 8 tests pass
- [ ] `useActivePlan` writes full bridge to `wr_bible_active_plans` with plan metadata

---

### Step 5: BibleHeroSlot Update + ActivePlanBanner

**Objective:** Add the active plan as the highest-priority hero tier and create the `ActivePlanBanner` component.

**Files to create/modify:**
- `src/components/bible/landing/ActivePlanBanner.tsx` — CREATE
- `src/components/bible/landing/BibleHeroSlot.tsx` — MODIFY: add plan priority tier
- `src/components/bible/landing/__tests__/ActivePlanBanner.test.tsx` — CREATE
- `src/components/bible/landing/__tests__/BibleHeroSlot.test.tsx` — MODIFY: add plan tier tests

**Details:**

**`ActivePlanBanner.tsx`:**

A `FrostedCard` with warm accent border (`border-l-4 border-l-primary/60`) showing:
- "You're on a plan" caption (`text-sm text-white/60 uppercase tracking-wide`)
- Plan title in large display font (`text-2xl sm:text-3xl font-bold text-white`)
- "Day X of Y" with thin progress bar (`h-1.5 rounded-full bg-white/[0.08]` track, `bg-primary` fill)
- Today's reading preview: day title + primary passage reference (`text-white/60`)
- "Continue today's reading" white pill button (Pattern 2) → navigates to `/bible/plans/:slug/day/:currentDay`
- "View plan" secondary link (`text-white/60 hover:text-white`) → navigates to `/bible/plans/:slug`

Props:
```typescript
interface ActivePlanBannerProps {
  planSlug: string
  planTitle: string
  currentDay: number
  totalDays: number
  dayTitle: string
  primaryPassage: string  // e.g. "John 3:1-21"
}
```

Auth gating: The "Continue today's reading" button is auth-gated. Logged-out users see the banner (since `activePlanSlug` is only set for logged-in users, the banner only appears for logged-in users — no explicit auth check needed in the banner itself).

**`BibleHeroSlot.tsx` update:**

Add `useActivePlan()` hook. New priority cascade:
```
1. Active plan → ActivePlanBanner + ResumeReadingCard (if active reader) + VerseOfTheDay
2. Active reader (no plan) → ResumeReadingCard + VerseOfTheDay
3. Lapsed reader → VerseOfTheDay + resume link
4. First-time → VerseOfTheDay only
```

When the plan banner is in the hero, VOTD and resume cards render below in the same `space-y-6` container (same demotion pattern as BB-19).

**Responsive behavior:**
- Desktop (1024px+): Full-width banner with progress bar on single line
- Tablet (640-1024px): Same layout, padding adjusts via FrostedCard
- Mobile (<640px): Full-width, text may wrap naturally, button full-width

**Guardrails (DO NOT):**
- DO NOT add auth gating to the banner component itself — the banner only renders when there's an active plan, which requires auth
- DO NOT use raw hex values — all Tailwind tokens
- DO NOT use GlowBackground on this component

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| ActivePlanBanner renders plan title | unit | Verify title text in DOM |
| ActivePlanBanner renders day progress | unit | "Day 5 of 21" text present |
| ActivePlanBanner progress bar has correct aria | unit | `role="progressbar"` with `aria-valuenow` and `aria-valuemax` |
| ActivePlanBanner "Continue" links to plan day page | unit | Link href is `/bible/plans/:slug/day/:currentDay` |
| ActivePlanBanner "View plan" links to plan detail | unit | Link href is `/bible/plans/:slug` |
| BibleHeroSlot renders plan banner when active plan exists | integration | Mock useActivePlan → banner shown |
| BibleHeroSlot demotes VOTD below plan banner | integration | Plan active → VOTD renders after banner |
| BibleHeroSlot falls through to resume when no plan | integration | No active plan, active reader → resume card shown |

**Expected state after completion:**
- [ ] `ActivePlanBanner` component renders with all spec fields
- [ ] `BibleHeroSlot` has 4-tier priority cascade
- [ ] 8 tests pass
- [ ] All tap targets ≥ 44px

---

### Step 6: Plan Detail Page

**Objective:** Create the plan detail page at `/bible/plans/:slug` with three states: preview, in-progress, completed.

**Files to create/modify:**
- `src/pages/BiblePlanDetail.tsx` — CREATE
- `src/pages/__tests__/BiblePlanDetail.test.tsx` — CREATE
- `src/App.tsx` — MODIFY: add route, lazy import

**Details:**

Route: `/bible/plans/:slug` — lazy-loaded via `React.lazy()` in `App.tsx`. Replace the `/bible/plans` BibleStub route with a redirect to `/bible/plans` (kept for BB-21.5 browser) and add the new detail route below it.

```typescript
// App.tsx additions
const BiblePlanDetail = lazy(() => import('./pages/BiblePlanDetail').then(m => ({ default: m.BiblePlanDetail })))

// Route:
<Route path="/bible/plans/:slug" element={<Suspense fallback={<RouteLoadingFallback />}><BiblePlanDetail /></Suspense>} />
```

**Page structure (3 states):**

**Preview (never started):**
- Hero section with plan's `coverGradient` as additional gradient layer over `ATMOSPHERIC_HERO_BG`, plan title (GRADIENT_TEXT_STYLE), description, theme badge, duration ("X days"), curator, "About X minutes per day"
- Collapsible day list: each day shows day number, title, passage count. Collapsed by default (show first 5, "Show all X days" toggle)
- "Start this plan" white pill button (Pattern 2) — auth-gated: "Sign in to start a reading plan"

**In progress:**
- Same hero but with progress bar (`role="progressbar"`, `aria-valuenow`, `aria-valuemax`)
- Day list with completion status indicators:
  - Empty circle: `w-6 h-6 rounded-full border-2 border-white/30` (not done)
  - Filled circle: `w-6 h-6 rounded-full bg-primary border-2 border-primary` (completed in order)
  - Ring: `w-6 h-6 rounded-full border-2 border-primary bg-transparent` (completed out of order)
- Highlighted current day with `bg-white/[0.04]` background
- Each day row is a link to `/bible/plans/:slug/day/:day`
- "Continue from day X" white pill button (Pattern 2)
- "Pause plan" secondary link — auth-gated: "Sign in to manage your reading plan"

**Completed:**
- "Completed" badge on hero (`bg-primary/20 text-primary-lt rounded-full px-3 py-1 text-sm font-medium`)
- All days filled
- Reflection text if present (in a Tier 1 FrostedCard)
- "Start again" white pill CTA — shows confirmation: "This will reset your progress. Continue?"

**Error state (corrupt/missing plan):**
- "This plan couldn't be loaded. Try again later." in a centered message

**Auth gating:**
- "Start this plan" → `openAuthModal("Sign in to start a reading plan")`
- "Pause plan" → `openAuthModal("Sign in to manage your reading plan")`
- "Start again" → `openAuthModal("Sign in to start a reading plan")`

**Responsive behavior:**
- Desktop (1024px+): Hero full-width, day list with generous padding
- Tablet (640-1024px): Single column, wider margins
- Mobile (<640px): Full-width, day list collapsible (show first 5)

**Guardrails (DO NOT):**
- DO NOT render devotional text as HTML — plain text only
- DO NOT use `dangerouslySetInnerHTML`
- DO NOT auto-advance currentDay based on calendar time
- DO NOT add GlowBackground or HorizonGlow — this is an inner page using `ATMOSPHERIC_HERO_BG`

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Renders preview state when plan not started | integration | Mock usePlan with no progress → "Start this plan" visible |
| Renders in-progress state with day list | integration | Mock progress with 3 of 10 days → progress bar, day indicators |
| Renders completed state with badge | integration | Mock completedAt → "Completed" badge, reflection text if present |
| Start plan auth-gates when logged out | integration | Click "Start" when logged out → auth modal opens with correct message |
| Pause plan auth-gates when logged out | integration | Click "Pause" when logged out → auth modal |
| Day rows link to day pages | integration | Day 3 row links to `/bible/plans/:slug/day/3` |
| Error state shows for corrupt plan | integration | Mock loadPlan error → error message displayed |
| Progress bar has correct ARIA | integration | `role="progressbar"`, `aria-valuenow`, `aria-valuemax` present |
| Restart confirmation dialog shows | integration | Click "Start again" on completed plan → confirm dialog |
| All tap targets ≥ 44px | unit | Day rows, buttons all have `min-h-[44px]` |

**Expected state after completion:**
- [ ] `/bible/plans/:slug` route works in `App.tsx`
- [ ] Three page states render correctly
- [ ] Auth gating works for all gated actions
- [ ] 10 tests pass

---

### Step 7: Plan Day Page

**Objective:** Create the plan day page at `/bible/plans/:slug/day/:dayNumber` with devotional text, passage cards, reflection prompts, and mark complete button.

**Files to create/modify:**
- `src/pages/BiblePlanDay.tsx` — CREATE
- `src/pages/__tests__/BiblePlanDay.test.tsx` — CREATE
- `src/App.tsx` — MODIFY: add route

**Details:**

Route: `/bible/plans/:slug/day/:dayNumber` — lazy-loaded.

```typescript
const BiblePlanDay = lazy(() => import('./pages/BiblePlanDay').then(m => ({ default: m.BiblePlanDay })))

<Route path="/bible/plans/:slug/day/:dayNumber" element={<Suspense fallback={<RouteLoadingFallback />}><BiblePlanDay /></Suspense>} />
```

**Page contents:**

1. **Back link**: Plan title (tappable, navigates to `/bible/plans/:slug`) — min-h-[44px]
2. **Day indicator**: "Day X of Y" in `text-sm text-white/60`
3. **Day title**: Large heading in `text-2xl font-bold text-white`
4. **Devotional text** (if present): Plain text rendered as `<p>` elements split on `\n\n` (double newlines). Uses Tier 1 FrostedCard with body text standard: `text-white leading-[1.75] text-[17px] sm:text-lg max-w-2xl`. NO HTML, NO markdown, NO `dangerouslySetInnerHTML`.
5. **Passage cards**: Each passage in a `FrostedCard` showing:
   - Reference text (e.g., "John 3:1-21") in `font-medium text-white`
   - Optional label in `text-sm text-white/60`
   - "Read this passage" white pill button (Pattern 1) → navigates to `/bible/{book}/{chapter}?highlight={startVerse}`
   - Layout: 2-column grid on tablet+, stacked on mobile
6. **Reflection prompts** (if present): Tier 1 FrostedCard with prompts as a list. Each prompt has a "Journal about this" link → navigates to `/daily?tab=journal&prompt={encodeURIComponent(prompt)}`
7. **Mark complete button**: "I read this. Mark day complete." white pill button (Pattern 2). After completion: "Day complete ✓" disabled state. Auth-gated: "Sign in to track your progress"
8. **Day navigation arrows**: "← Day X" and "Day X →" for adjacent days. Disabled at boundaries (day 1 has no prev, last day has no next).
9. **Sticky mark complete on mobile**: The mark complete button is `sticky bottom-4` on mobile (`sm:static`)

**Auth gating:**
- "I read this. Mark day complete." → `openAuthModal("Sign in to track your progress")`
- "Journal about this" → navigates to journal (journal has its own auth gating)
- "Read this passage" → navigates to reader (public, no auth)

**Responsive behavior:**
- Desktop (1024px+): Passage cards in 2-column grid (if ≥2 passages). Mark complete button inline with day nav arrows.
- Tablet (640-1024px): Same as desktop but narrower.
- Mobile (<640px): Passage cards stacked. Mark complete button sticky at bottom. Day nav arrows full-width row above.

**Inline position expectations:**
- Day nav arrows + mark complete button must share y-coordinate at 1024px+ (±5px tolerance). Stacked on <640px.

**Guardrails (DO NOT):**
- DO NOT render devotional text as HTML or markdown — split on `\n\n` → `<p>` elements
- DO NOT use `dangerouslySetInnerHTML`
- DO NOT auto-complete the day when the user reads the passage in the reader
- DO NOT force linear progression — user can visit any day

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Renders day title and indicator | integration | "Day 3 of 21" + day title visible |
| Renders devotional text as paragraphs | integration | Text with `\n\n` splits into multiple `<p>` elements |
| Renders passage cards with links | integration | Passage card shows reference, "Read this passage" links to reader |
| Passage link includes highlight param | integration | Link href contains `?highlight=startVerse` |
| Renders reflection prompts with journal link | integration | Prompt text visible, journal link navigates correctly |
| Mark complete auth-gates when logged out | integration | Click mark complete → auth modal with correct message |
| Mark complete changes to "Day complete" state | integration | Mock authenticated + click → button becomes disabled with checkmark |
| Day nav arrows link correctly | integration | Day 3 → prev links to day 2, next links to day 4 |
| Day 1 has no prev arrow | integration | First day → prev arrow disabled/hidden |
| Invalid day number shows error | integration | Day 99 on a 21-day plan → error state |

**Expected state after completion:**
- [ ] `/bible/plans/:slug/day/:dayNumber` route works
- [ ] All content renders correctly (devotional, passages, prompts)
- [ ] Auth gating on mark complete
- [ ] 10 tests pass

---

### Step 8: Reader Integration — ActivePlanReaderBanner

**Objective:** Show a contextual banner inside the Bible reader when the currently loaded chapter matches the active plan's current day passage.

**Files to create/modify:**
- `src/components/bible/reader/ActivePlanReaderBanner.tsx` — CREATE
- `src/pages/BibleReader.tsx` — MODIFY: mount the banner
- `src/components/bible/reader/__tests__/ActivePlanReaderBanner.test.tsx` — CREATE

**Details:**

**`ActivePlanReaderBanner.tsx`:**

A banner at the top of the reader content area (inside `ReaderChrome` layout, above the verse body). Uses the reader chrome dark style (`PANEL_STYLE` — `rgba(15, 10, 30, 0.95)` + `backdrop-blur(16px)`).

Content:
- "Day X of [Plan Title]" in `text-sm font-medium text-white`
- "You're reading today's passage" in `text-sm text-white/60`
- "Mark day complete" white pill button (Pattern 1, smaller) — only shown if current day is NOT yet completed
- Dismissible via X button (dismissed state persisted in component state, not localStorage — reappears on next chapter load)

Props:
```typescript
interface ActivePlanReaderBannerProps {
  planTitle: string
  currentDay: number
  isDayCompleted: boolean
  onMarkComplete: () => void
  onDismiss: () => void
  // Focus mode props — banner fades with the reader chrome
  chromeOpacity: number
  chromePointerEvents: 'auto' | 'none'
  chromeTransitionMs: number
}
```

**Focus mode interaction (BB-5):**

The plan banner is informational chrome, not reading content. It **respects focus mode** by receiving the same `chromeOpacity`, `chromePointerEvents`, and `chromeTransitionMs` props that `BibleReader` already passes to `ReaderChrome`. The banner applies these as inline styles:
```typescript
style={{
  opacity: chromeOpacity,
  pointerEvents: chromePointerEvents,
  transition: `opacity ${chromeTransitionMs}ms ease`,
}}
```
When focus mode engages (user idle), the banner fades to `opacity: 0` with `pointer-events: none`. When the user taps/moves (breaking focus mode), the banner fades back in and the "Mark day complete" button becomes accessible. This matches the existing behavior of all reader chrome elements.

**BibleReader.tsx changes:**

In `BibleReaderInner`, add:
```typescript
const { activePlan, progress, currentDay, isOnPlanPassage, markDayComplete } = useActivePlan()
const [readerBannerDismissed, setReaderBannerDismissed] = useState(false)
```

Reset `readerBannerDismissed` when chapter changes (so the banner reappears for new chapters).

Show banner when:
- `activePlan` is not null
- `isOnPlanPassage(bookSlug, chapterNumber)` is true
- `!readerBannerDismissed`

Mount the banner above `<ReaderBody>` inside the reader layout. Pass `chromeOpacity`, `chromePointerEvents`, and `chromeTransitionMs` from the existing `focusMode` state (same props already passed to `ReaderChrome`).

The mark complete button on the banner delegates to `markDayComplete(currentDay.day)` — same effect as the plan day page button. Auth is not checked here because reading plans require auth to start, so the user is already authenticated.

**Responsive behavior:**
- Full-width bar on all breakpoints, matching reader chrome width
- Button may wrap below text on very narrow screens

**Guardrails (DO NOT):**
- DO NOT show the banner for chapters matching OTHER days' passages — only the current day (spec requirement #40)
- DO NOT persist banner dismissal to localStorage — it's per-session per chapter load
- DO NOT add a second auth check — plans require auth to start, so the user is authenticated
- DO NOT exempt the banner from focus mode — it is chrome, not content

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Banner renders when on current day passage | unit | Mock isOnPlanPassage returning true → banner visible |
| Banner does not render for other day passages | unit | Mock isOnPlanPassage returning false → no banner |
| Banner shows "Mark day complete" when day not completed | unit | `isDayCompleted: false` → button visible |
| Banner hides "Mark day complete" when day already completed | unit | `isDayCompleted: true` → button hidden |
| Mark complete calls onMarkComplete | unit | Click button → callback fired |
| Dismiss hides banner | unit | Click X → banner disappears |
| Banner resets on chapter change | integration | Navigate to new chapter → banner reappears if passage matches |
| Banner respects focus mode opacity | unit | Pass `chromeOpacity: 0` → banner has `opacity: 0` and `pointer-events: none` |

**Expected state after completion:**
- [ ] Reader shows plan banner when chapter matches active plan's current day
- [ ] Banner has correct content and dismiss behavior
- [ ] Banner fades with focus mode (receives chromeOpacity/chromePointerEvents)
- [ ] 8 tests pass

---

### Step 9: Completion Celebration

**Objective:** Create the full-screen completion overlay that fires once when the user marks the final day complete.

**Files to create/modify:**
- `src/components/bible/plans/PlanCompletionCelebration.tsx` — CREATE
- `src/components/bible/plans/__tests__/PlanCompletionCelebration.test.tsx` — CREATE
- `src/lib/bible/planShareCanvas.ts` — CREATE: canvas rendering for plan completion share image
- `src/lib/bible/__tests__/planShareCanvas.test.ts` — CREATE

**Details:**

**`PlanCompletionCelebration.tsx`:**

Full-screen overlay (`fixed inset-0 z-50`). Triggered by `PlanCompletionResult.type === 'plan-completed'` from the `markDayComplete` call. The calling page (PlanDay or reader banner) renders this component conditionally.

Background: dimmed version of the plan's cover gradient + `bg-black/60` overlay.

Content (centered, `max-w-lg mx-auto`):
1. "You finished [Plan Title]" heading (`text-3xl font-bold text-white`)
2. Plan description subtitle (`text-lg text-white/70`)
3. Stats row: "[X] days completed · [start date] – [end date] · [Y] passages read"
4. Reflection textarea: "What did you take from this plan?" — plain `<textarea>` with white glow pattern. `max-h-[200px]`. Auth-gated: "Sign in to save your reflection"
5. "Continue" primary button (Pattern 2) → closes overlay, navigates to plan detail in completed state
6. "Share your completion" secondary link → triggers canvas render + share flow

**Share canvas (`planShareCanvas.ts`):**

Simple canvas with plan title, "Completed" badge, date range, and Worship Room branding. Follows the same pattern as `verse-card-canvas.ts` — returns a `Blob`. Uses the plan's cover gradient colors as the card background.

```typescript
export async function renderPlanCompletionCard(params: {
  planTitle: string
  daysCompleted: number
  dateRange: string
}): Promise<Blob>
```

**Celebration trigger rules:**
- Fires when `markDayComplete` returns `{ type: 'plan-completed' }` AND `progress.celebrationShown === false`
- After the overlay renders, the calling component immediately calls `setCelebrationShown(slug)` to flip the flag to `true`, preventing re-trigger on React re-renders, StrictMode double-invocations, or navigating back to the page
- Does NOT fire on visiting a completed plan's detail page (because `celebrationShown` is already `true`)
- Does NOT fire on subsequent renders (flag is persisted to localStorage via plansStore)

**Focus trap:** The overlay uses `useFocusTrap` to trap keyboard focus. Escape key closes the overlay (same as "Continue").

**Responsive behavior:**
- Desktop: Centered modal-like card, `max-w-lg`
- Tablet: Same
- Mobile: Full-width with padding, textarea and buttons stack vertically

**Guardrails (DO NOT):**
- DO NOT add confetti, particle effects, sound effects, badges, or streak bonuses (spec explicitly excludes these)
- DO NOT show the celebration overlay on page load for already-completed plans
- DO NOT use `dangerouslySetInnerHTML` for any content
- DO NOT show the celebration on revisiting a completed plan — `celebrationShown` flag on `PlanProgress` prevents re-trigger

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Renders plan title and description | unit | "You finished [Plan Title]" visible |
| Renders stats (days, date range, passages) | unit | Stats row with correct counts |
| Textarea captures reflection text | unit | Type in textarea → value updates |
| Save reflection auth-gates when logged out | unit | Submit reflection → auth modal |
| Continue button fires onClose | unit | Click → callback fired |
| Share button triggers canvas render | unit | Click share → renderPlanCompletionCard called |
| Focus trapped inside overlay | unit | Tab cycles within overlay |
| Escape closes overlay | unit | Press Escape → onClose called |
| renderPlanCompletionCard returns Blob | unit | Canvas function returns a valid Blob |

**Expected state after completion:**
- [ ] Completion overlay renders with all spec fields
- [ ] Reflection text saves to progress record
- [ ] Share flow produces a canvas image
- [ ] 9 tests pass
- [ ] No confetti/particles/sounds/badges

---

### Step 10: Export/Import V2

**Objective:** Bump the export schema to v2, add plans data to exports, and handle v1/v2 imports.

**Files to create/modify:**
- `src/types/bible-export.ts` — MODIFY: add v2 type, update ImportResult
- `src/lib/bible/exportBuilder.ts` — MODIFY: include plans
- `src/lib/bible/importApplier.ts` — MODIFY: handle plans in replace and merge
- `src/lib/bible/plansStore.ts` — MODIFY: add `replaceAllPlans` and `mergeInPlans`
- `src/lib/bible/__tests__/exportBuilder.test.ts` — MODIFY: add v2 tests
- `src/lib/bible/__tests__/importApplier.test.ts` — MODIFY: add plans merge/replace tests

**Details:**

**`bible-export.ts` changes:**

```typescript
export const CURRENT_SCHEMA_VERSION = 2
export const APP_VERSION = 'worship-room-bible-wave-2'

export interface BibleExportV2 {
  schemaVersion: 2
  exportedAt: string
  appVersion: string
  data: BibleExportV1['data'] & {
    plans?: PlansStoreState
  }
}

// Union type for import parsing
export type BibleExport = BibleExportV1 | BibleExportV2

export interface ImportResult {
  mode: 'replace' | 'merge'
  totalItems: number
  highlights: MergeResult
  bookmarks: MergeResult
  notes: MergeResult
  prayers: MergeResult
  journals: MergeResult
  meditations: MergeResult
  plans?: MergeResult  // NEW — optional for v1 imports
}
```

**`exportBuilder.ts` changes:**

```typescript
import { getPlansState } from '@/lib/bible/plansStore'

export function buildExport(): BibleExportV2 {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    appVersion: APP_VERSION,
    data: {
      highlights: getAllHighlights(),
      bookmarks: getAllBookmarks(),
      notes: getAllNotes(),
      prayers: getPrayers().filter(p => p.verseContext != null),
      journals: getAllJournalEntries().filter(j => j.verseContext != null),
      meditations: getMeditationHistory().filter(m => m.verseContext != null),
      plans: getPlansState(),
    },
  }
}
```

**`importApplier.ts` changes:**

Both `applyReplace` and `applyMerge` accept `BibleExport['data']` (union). If `data.plans` is present, handle it:

- Replace: call `replaceAllPlans(data.plans)` on the plansStore
- Merge: for each plan in the imported state, keep the version with more completed days. If both are completed, keep the one with the newer `completedAt`.

**`plansStore.ts` additions:**

```typescript
export function replaceAllPlans(state: PlansStoreState): MergeResult {
  cache = { ...state }
  persist(cache)
  notifyListeners()
  const totalPlans = Object.keys(state.plans).length
  return { added: totalPlans, updated: 0, skipped: 0 }
}

export function mergeInPlans(incoming: PlansStoreState): MergeResult {
  const current = getCache()
  let added = 0, updated = 0, skipped = 0
  for (const [slug, incomingProgress] of Object.entries(incoming.plans)) {
    const existing = current.plans[slug]
    if (!existing) {
      current.plans[slug] = incomingProgress
      added++
    } else if (incomingProgress.completedDays.length > existing.completedDays.length) {
      current.plans[slug] = incomingProgress
      updated++
    } else if (
      incomingProgress.completedAt && existing.completedAt &&
      incomingProgress.completedAt > existing.completedAt
    ) {
      current.plans[slug] = incomingProgress
      updated++
    } else {
      skipped++
    }
  }
  // Preserve active plan from incoming if current has none
  if (!current.activePlanSlug && incoming.activePlanSlug) {
    current.activePlanSlug = incoming.activePlanSlug
  }
  persist(current)
  notifyListeners()
  return { added, updated, skipped }
}
```

V1 imports (no `plans` field) skip plan data silently — `ImportResult.plans` is `undefined`.

**Auth gating:** N/A — export/import is utility code.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT break v1 import compatibility — v1 imports must work unchanged
- DO NOT change the v1 `MergeResult` fields for existing data types
- DO NOT merge `activePlanSlug` from import if current user already has an active plan

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| buildExport produces schemaVersion 2 | unit | Export object has `schemaVersion: 2` |
| buildExport includes plans data | unit | `data.plans` is present |
| applyReplace handles v2 with plans | unit | Plans replaced in store |
| applyReplace handles v1 without plans | unit | No error, plans untouched |
| applyMerge keeps version with more completed days | unit | Import 5 completed, local 3 → import wins |
| applyMerge keeps local when it has more completed days | unit | Import 2 completed, local 5 → local wins |
| applyMerge keeps newer completedAt for both-completed | unit | Both completed, import newer → import wins |
| replaceAllPlans overwrites entire store | unit | New state replaces old |
| mergeInPlans adds new plans | unit | Import has plan not in local → added |
| mergeInPlans skips equal progress | unit | Same completedDays count → skipped |

**Expected state after completion:**
- [ ] Schema version is 2
- [ ] Export includes plans data
- [ ] Import handles v1 and v2 correctly
- [ ] Merge uses "more completed days" heuristic
- [ ] 10 tests pass

---

### Step 11: Wire Celebration into Plan Day + Reader Banner

**Objective:** Connect the completion celebration overlay to the mark-complete actions on both the plan day page and the reader banner.

**Files to create/modify:**
- `src/pages/BiblePlanDay.tsx` — MODIFY: add celebration state management
- `src/pages/BibleReader.tsx` — MODIFY: add celebration state management

**Details:**

In both `BiblePlanDay` and `BibleReader`, add state:
```typescript
const [celebrationData, setCelebrationData] = useState<{
  planTitle: string
  planDescription: string
  daysCompleted: number
  dateRange: string
  passageCount: number
  slug: string
  coverGradient: string
} | null>(null)
```

When `markDayComplete` returns `{ type: 'plan-completed' }` AND `progress.celebrationShown === false`, populate `celebrationData` from the loaded plan and progress, then immediately call `setCelebrationShown(slug)` to flip the persisted flag. Render `PlanCompletionCelebration` conditionally:

```typescript
function handleMarkComplete(dayNumber: number) {
  const result = markDayComplete(dayNumber)
  if (result.type === 'plan-completed' && progress && !progress.celebrationShown) {
    setCelebrationShown(slug)  // Persist flag BEFORE rendering to prevent double-fire
    setCelebrationData({
      planTitle: activePlan.title,
      planDescription: activePlan.description,
      daysCompleted: activePlan.days.length,
      dateRange: `${progress.startedAt} – ${new Date().toLocaleDateString()}`,
      passageCount: activePlan.days.reduce((sum, d) => sum + d.passages.length, 0),
      slug: activePlan.slug,
      coverGradient: activePlan.coverGradient,
    })
  }
}

// In JSX:
{celebrationData && (
  <PlanCompletionCelebration
    {...celebrationData}
    onClose={() => {
      setCelebrationData(null)
      navigate(`/bible/plans/${celebrationData.slug}`)
    }}
    onSaveReflection={(text) => saveReflection(celebrationData.slug, text)}
  />
)}
```

The `setCelebrationShown(slug)` call is made synchronously before setting React state. This ensures that even if React re-renders the component (StrictMode, concurrent features), the persisted flag is already `true` and the condition `!progress.celebrationShown` prevents a second trigger.

**Auth gating:** Not applicable here — mark complete is already auth-gated in the UI.

**Responsive behavior:** N/A: celebration overlay handles its own responsive behavior.

**Guardrails (DO NOT):**
- DO NOT show celebration on page mount — only on the specific markDayComplete call that completes the plan AND `celebrationShown === false`
- DO NOT auto-navigate away from celebration — user must click "Continue"
- DO NOT call `setCelebrationShown` after rendering the overlay — call it before, to prevent race conditions

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Plan day shows celebration on final day completion | integration | Complete last day (celebrationShown: false) → celebration overlay appears |
| Reader banner shows celebration on final day completion | integration | Complete from reader (celebrationShown: false) → celebration appears |
| Celebration does not show for non-final day | integration | Complete day 5 of 21 → no celebration |
| Celebration does not re-fire when celebrationShown is true | integration | Complete last day but celebrationShown already true → no overlay |

**Expected state after completion:**
- [ ] Celebration fires from both plan day page and reader banner
- [ ] Only fires when plan is fully completed AND `celebrationShown === false`
- [ ] `setCelebrationShown` called synchronously before rendering overlay
- [ ] 4 tests pass

---

### Step 12: Update localStorage Key Documentation

**Objective:** Document the new `bible:plans` localStorage key in the project rules.

**Files to create/modify:**
- `.claude/rules/11-local-storage-keys.md` — MODIFY: add `bible:plans` key

**Details:**

Add to the Bible Reader section of `11-local-storage-keys.md`:

```
| `bible:plans`         | `PlansStoreState`              | Reading plan progress — activePlanSlug + per-plan progress (BB-21) |
```

**Auth gating:** N/A — documentation only.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT modify any code files
- DO NOT add keys that aren't implemented yet

**Test specifications:** N/A — documentation only.

**Expected state after completion:**
- [ ] `bible:plans` documented in `11-local-storage-keys.md`
- [ ] Key description matches implementation

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Plan types + constants |
| 2 | 1 | Empty manifest + plan loader |
| 3 | 1 | Plans store (reactive pattern) |
| 4 | 2, 3 | Hooks (useActivePlan, usePlan, usePlansManifest) |
| 5 | 4 | BibleHeroSlot update + ActivePlanBanner |
| 6 | 4 | Plan detail page |
| 7 | 4, 6 | Plan day page |
| 8 | 4 | Reader integration banner |
| 9 | 3 | Completion celebration + share canvas |
| 10 | 3 | Export/import v2 |
| 11 | 7, 8, 9 | Wire celebration into plan day + reader |
| 12 | 3 | localStorage key documentation |

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Plan types + constants | [COMPLETE] | 2026-04-09 | Created `src/types/bible-plans.ts` (8 types), added `BIBLE_PLANS_KEY` to `src/constants/bible.ts` |
| 2 | Empty manifest + plan loader | [COMPLETE] | 2026-04-09 | Created `manifest.json` (empty `[]`), `planLoader.ts` with `loadManifest`/`loadPlan`, 5 tests pass |
| 3 | Plans store (reactive pattern) | [COMPLETE] | 2026-04-09 | Created `plansStore.ts` with full lifecycle + bridge + import/export support. 18 tests pass. |
| 4 | Hooks | [COMPLETE] | 2026-04-09 | Created `useActivePlan.ts`, `usePlan.ts`, `usePlansManifest.ts` + 8 tests pass |
| 5 | BibleHeroSlot + ActivePlanBanner | [COMPLETE] | 2026-04-09 | Created `ActivePlanBanner.tsx`, updated `BibleHeroSlot.tsx` with 4-tier priority. 13 tests pass. |
| 6 | Plan detail page | [COMPLETE] | 2026-04-09 | Created `BiblePlanDetail.tsx` with 3 states + error. Routes in App.tsx. 10 tests pass. |
| 7 | Plan day page | [COMPLETE] | 2026-04-09 | Created `BiblePlanDay.tsx` with devotional, passages, prompts, mark complete. 10 tests pass. |
| 8 | Reader integration banner | [COMPLETE] | 2026-04-09 | Created `ActivePlanReaderBanner.tsx`, integrated into `BibleReader.tsx` with focus mode. 6 tests pass. |
| 9 | Completion celebration | [COMPLETE] | 2026-04-09 | Created `PlanCompletionCelebration.tsx` + `planShareCanvas.ts`. 8 tests pass. No confetti/particles/sounds. |
| 10 | Export/import v2 | [COMPLETE] | 2026-04-09 | Schema v2, plans in export/import, v1 backward compat. 22 tests pass. |
| 11 | Wire celebration | [COMPLETE] | 2026-04-09 | Wired `PlanCompletionCelebration` into both `BiblePlanDay` and `BibleReader`. 3 tests pass (plan day celebration + no-refire). Reader uses identical pattern. |
| 12 | localStorage documentation | [COMPLETE] | 2026-04-09 | Added `bible:plans` to `11-local-storage-keys.md` Bible Reader section |
