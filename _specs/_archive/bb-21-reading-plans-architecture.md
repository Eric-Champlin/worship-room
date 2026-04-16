# BB-21: Reading Plans Architecture + Completion Celebration

**Branch:** `bible-redesign` (no new branch — all work commits directly here)
**Depends on:** BB-4 (reader — plans navigate into the reader), BB-7 (highlights — reactive store pattern reused), BB-13 (share as image — completion share flow), BB-16 (export/import — schema bump needed), BB-17 (streak + dateUtils — plans use the same date logic), BB-18 (VOTD — plans compete for hero slot), BB-19 (last-read + `BibleHeroSlot` — plans introduce a third hero priority tier)
**Hands off to:** BB-21.5 (plan browser UI), BB-22 through BB-25 (four concrete plans), BB-41 (push notifications)
**Design system recon:** `_plans/recon/design-system.md` (captured 2026-04-05)

---

## Overview

A reading plan gives a user a structured relationship with scripture — not just "read this chapter" but "read this chapter as day 4 of a 30-day journey through the Psalms." For emotionally vulnerable users seeking comfort, a plan provides direction without decision fatigue. It says "here's where to go next" in a season when everything else feels uncertain. BB-21 builds the entire plan infrastructure: data types, progress store, loaders, hooks, detail pages, reader integration, completion celebration, and export/import support. It ships zero plan content — that comes in BB-22 through BB-25.

## User Stories

- As a **logged-in user**, I want to start a reading plan and see my next day's reading each time I return to the Bible landing so that I can build a consistent reading habit.
- As a **user mid-plan**, I want to mark each day complete on my own terms so that finishing a day feels like a meaningful ritual, not an automated checkbox.
- As a **user who finished a plan**, I want a quiet moment of acknowledgment so that the app recognizes what I accomplished without gamifying it.
- As a **user who missed several days**, I want my plan to stay exactly where I left off so that I never feel "behind" or punished for taking a break.

## Requirements

### Functional Requirements

#### Plan Data Shape

1. Plans are defined as static JSON files at `frontend/src/data/bible/plans/{slug}.json` containing a `Plan` object with: `slug`, `title`, `shortTitle`, `description`, `theme` (union type: `'comfort' | 'foundation' | 'emotional' | 'sleep' | 'wisdom' | 'prayer'`), `duration`, `estimatedMinutesPerDay`, `curator`, `coverGradient`, and `days` array
2. Each `PlanDay` has: `day` (1-indexed), `title`, `passages` array, optional `devotional` string, optional `reflectionPrompts` string array
3. Each `PlanPassage` has: `book` (lowercase slug), `chapter`, optional `startVerse`, optional `endVerse`, optional `label`
4. A manifest file at `frontend/src/data/bible/plans/manifest.json` contains an array of plan metadata (all fields except `days`) for fast loading in the browser
5. BB-21 ships the manifest as an empty array — no plan content until BB-22

#### Plan Loader

6. `planLoader.ts` accepts a slug, lazily loads the corresponding JSON file, validates required fields, and returns a typed `Plan` object or an error state
7. A plan JSON with missing required fields causes the loader to return `{ plan: null, error: string }` — it does not throw
8. `manifest.json` loader returns `PlanMetadata[]` — the manifest shape minus the `days` array

#### Progress Store

9. `plansStore.ts` persists to localStorage at key `bible:plans` following the BB-7 reactive pattern (subscribe, getState, mutate, notify)
10. Store shape: `{ activePlanSlug: string | null, plans: Record<string, PlanProgress> }`
11. `PlanProgress` shape: `{ slug, startedAt (ISO date), currentDay, completedDays (number[]), completedAt (ISO date | null), pausedAt (ISO date | null), resumeFromDay (number | null), reflection (string | null) }`
12. SSR-safe: returns default state (`{ activePlanSlug: null, plans: {} }`) when `window` is undefined

#### Plan Lifecycle — Starting

13. Starting a plan sets `activePlanSlug`, creates a `PlanProgress` record with `startedAt: today`, `currentDay: 1`, empty `completedDays`, all nullable fields null
14. Starting a plan while another is active pauses the previous plan (sets `pausedAt: today`) and makes the new plan active
15. Switching plans shows a confirmation dialog: "Switching from [current plan] — your progress will be saved"
16. Starting a plan the user has previously completed resets progress (`startedAt: today`, empty `completedDays`, `completedAt: null`) while preserving the plan's entry in the `plans` record so the completion count is derivable from history

#### Plan Lifecycle — Day Completion

17. Marking a day complete adds the day number to `completedDays` (deduplicated — array acts as a set) and recalculates `currentDay` to the lowest uncompleted day
18. Marking a day complete twice is idempotent — no duplicate entries, no side effects
19. Day completion is **manual only** — reading the referenced chapter in the reader does NOT auto-complete the day
20. A user can complete any day (not just `currentDay`) — non-linear progression is allowed
21. When all days are in `completedDays`, `completedAt` is set to today's ISO date, `activePlanSlug` is cleared, and the completion celebration fires

#### Plan Lifecycle — Pausing & Resuming

22. Pausing a plan sets `pausedAt: today` but does not clear `activePlanSlug` or any progress
23. Resuming a paused plan clears `pausedAt` and keeps it (or restores it) as the active plan
24. Resuming plan A while plan B is active pauses plan B and activates plan A

#### Plan Lifecycle — Missed Days

25. Plans do not auto-advance based on calendar time. `currentDay` only changes when the user completes a day
26. If a user completes day 5 without completing day 4, `currentDay` remains at 4 — the user is gently nudged to go back but not forced

#### Landing Page Integration — Hero Priority

27. `BibleHeroSlot.tsx` gains a third priority tier. The new priority order:
    | State | Hero Content |
    |---|---|
    | Active plan (any) | Active plan banner |
    | No active plan + active reader (within 24h) | Resume card (BB-19) |
    | No active plan + lapsed/first-time reader | VOTD card (BB-18) |
28. When the active plan banner is in the hero, the VOTD and resume cards render in secondary positions below (same as BB-19's existing demotion pattern)

#### Active Plan Banner (Landing)

29. `ActivePlanBanner.tsx` shows: "You're on a plan" caption, plan title in large display font, "Day X of Y" with thin progress bar, today's reading preview (day title + primary passage reference), "Continue today's reading" button navigating to the plan day page, "View plan" secondary link navigating to the plan detail page

#### Plan Detail Page

30. Route: `/bible/plans/:slug` — new lazy-loaded route in `App.tsx`
31. Three states:
    - **Preview** (never started): hero with cover gradient, title, description, theme, duration, curator, "About X minutes per day" label, collapsible day list, "Start this plan" CTA
    - **In progress**: progress bar, day list with completion status indicators (empty circle = not done, filled circle = completed, ring outline = completed out-of-order), highlighted current day, "Continue from day X" primary CTA, "Pause plan" secondary CTA
    - **Completed**: "Completed" badge on hero, all days filled, reflection text if present, "Start again" CTA with confirmation

#### Plan Day Page

32. Route: `/bible/plans/:slug/day/:dayNumber` — new lazy-loaded route
33. Contents: plan title (tappable back link), "Day X of Y" indicator, day title, devotional text (plain text, rendered as `<p>` elements split on double newlines — no HTML, no markdown), passage cards, reflection prompts, and mark complete button
34. Each passage card shows the reference, optional label, and a "Read this passage" button navigating to `/bible/{book}/{chapter}?highlight={startVerse}`
35. Reflection prompts link to the journal tab with the prompt pre-filled as context (navigates to `/daily?tab=journal` with query params matching the BB-11 pattern)
36. "I read this. Mark day complete." button — sticky on mobile, becomes "Day complete" after completion
37. Day navigation arrows: "← Day X" and "Day X →" for previewing/revisiting adjacent days

#### Reader Integration

38. `ActivePlanReaderBanner.tsx` shows inside the reader when the currently loaded chapter matches a passage in the active plan's current day
39. Banner content: "Day X of [Plan Title]", "You're reading today's passage", and "Mark day complete" button (only if the current day is not yet completed)
40. The banner does NOT show for chapters matching other days' passages — only the current day
41. The mark complete button on the reader banner produces the same effect as the one on the plan day page

#### Completion Celebration

42. `PlanCompletionCelebration.tsx` — full-screen overlay triggered exactly once when the final day is completed
43. Content: "You finished [Plan Title]" heading, plan description subtitle, stats (days completed, date range, passage count), optional reflection textarea ("What did you take from this plan?"), "Continue" primary action (closes overlay, returns to plan detail in completed state), "Share your completion" secondary action (uses BB-13 share flow)
44. Reflection text saved to `reflection` field in the plan progress record
45. Celebration does NOT fire on subsequent views of a completed plan — those show the quiet completed state on the detail page
46. No confetti, no particle effects, no sound effects, no badges, no streak bonuses, no social pressure to share

#### Export/Import Integration (BB-16)

47. Export schema version bumps from 1 to 2
48. `BibleExportV2` type adds `plans?: PlansStoreState` to the data payload
49. `buildExport()` includes plan progress data when present
50. `applyReplace()` and `applyMerge()` handle the `plans` field:
    - Replace: overwrites the entire `bible:plans` localStorage key
    - Merge: for each plan in the import, keeps the version with more completed days (or the newer `completedAt` if both are completed)
51. Import validator accepts both v1 (no `plans` field) and v2 (with `plans` field) — v1 imports skip plan data silently
52. `ImportResult` type gains a `plans` field with `MergeResult` stats

#### Hooks

53. `useActivePlan()` returns: `{ activePlan: Plan | null, progress: PlanProgress | null, currentDay: PlanDay | null, isOnPlanPassage: (book, chapter) => boolean, markDayComplete: (dayNumber) => PlanCompletionResult, pausePlan: () => void, switchPlan: (slug) => Promise<void> }`
54. `usePlan(slug)` returns: `{ plan: Plan | null, progress: PlanProgress | null, isLoading: boolean, isError: boolean }`
55. `usePlansManifest()` returns: `{ plans: PlanMetadata[], isLoading: boolean }`

#### Landing Page Data Bridge

56. The existing `wr_bible_active_plans` localStorage key (read by BB-0's `TodaysPlanCard`) should be written by the plansStore whenever `activePlanSlug` changes — this bridges the new `bible:plans` store to the existing landing card that expects the `ActivePlan[]` shape
57. When `activePlanSlug` is null, write an empty array to `wr_bible_active_plans`
58. When `activePlanSlug` is set, write a single-element array with the active plan's data mapped to the `ActivePlan` interface shape

### Non-Functional Requirements

- **Performance**: Plan JSON loaded lazily on demand (not bundled in main chunk). Manifest loaded synchronously (tiny file)
- **Accessibility**: Lighthouse score ≥ 95 on plan detail and day pages. All tap targets ≥ 44px. Day completion status uses appropriate ARIA (e.g., day list items with `aria-current` for current day, completion indicators with screen reader text). Progress bar uses `role="progressbar"` with `aria-valuenow`/`aria-valuemax`. Reduced motion respected on all animations
- **Security**: Devotional text rendered as plain text only — no `dangerouslySetInnerHTML`, no markdown parsing. User reflection text treated as untrusted input — escaped on render

## Auth Gating

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| View plan detail page | Can view all plan metadata and day list | Full access | N/A |
| Start a plan | Auth modal shown | Starts the plan | "Sign in to start a reading plan" |
| Mark day complete | Auth modal shown | Marks day complete | "Sign in to track your progress" |
| Pause/resume plan | Auth modal shown | Pauses/resumes | "Sign in to manage your reading plan" |
| Write completion reflection | Auth modal shown | Saves reflection | "Sign in to save your reflection" |
| View plan day page | Can view content (passages, devotional text) | Full access | N/A |
| Read passage from plan | Can read (navigates to Bible reader, which is public) | Same | N/A |
| Share completion | N/A (only reachable after completing a plan, which requires auth) | Opens BB-13 share flow | N/A |

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | Plan detail: single column, day list collapsible. Plan day: full-width passage cards stacked. Mark complete button sticky at bottom. Day nav arrows full-width row |
| Tablet (640-1024px) | Plan detail: single column wider margins. Plan day: passage cards in 2-column grid if ≥2 passages. Mark complete button inline |
| Desktop (> 1024px) | Plan detail: hero full-width, day list in scrollable sidebar or full-width list. Plan day: passage cards in 2-column grid, mark complete button inline with day nav arrows |

Active plan banner (landing): full-width on all breakpoints, matching the existing `ResumeReadingCard` responsive pattern.

Reader banner: full-width bar at top of reader viewport, same treatment as the existing reader chrome. Dismissible via X button after the user has acknowledged it.

## AI Safety Considerations

N/A — This feature does not involve AI-generated content or free-text user input. The optional reflection textarea at plan completion captures user text, but it is private (stored only in localStorage, never shared with AI or displayed publicly). No crisis detection required.

## Auth & Persistence

- **Logged-out users:** Can view plan detail pages and plan day pages (read-only). Cannot start, complete, pause, or resume plans. All interactive actions show auth modal
- **Logged-in users:** Full plan lifecycle. Progress persisted to `bible:plans` localStorage key. Bridge data written to `wr_bible_active_plans` for the existing landing card
- **localStorage keys:**
  - `bible:plans` — `PlansStoreState` (new, documented in spec)
  - `wr_bible_active_plans` — `ActivePlan[]` (existing, written by BB-21 as a bridge to the BB-0 landing card)

## Design Notes

- Plan detail hero uses the plan's `coverGradient` as background — gradients should use existing design system tokens (e.g., `from-primary/30 to-hero-dark`)
- Plan detail page and plan day page use the existing `FrostedCard` component for passage cards and reflection sections
- Day completion status indicators: empty circle (`border-2 border-white/30`), filled circle (`bg-primary border-2 border-primary`), ring for out-of-order completion (`border-2 border-primary bg-transparent`)
- Progress bars use the same thin style as `TodaysPlanCard` (`h-1.5 rounded-full bg-white/[0.08]` track, `bg-primary` fill)
- Active plan banner on the landing uses the existing `FrostedCard` with a warm accent (e.g., `border-l-4 border-l-primary/60`) to distinguish from VOTD
- Reader banner matches the existing reader chrome color palette — dark frosted glass, not a separate visual treatment
- Completion celebration overlay uses a dimmed version of the plan's cover gradient as background, with the same text opacity standards as the rest of the dark theme
- Typography: plan titles use Inter semibold (same as headings), devotional text uses the Daily Hub body text standard (`text-white leading-[1.75] text-[17px] sm:text-lg max-w-2xl`), passage references use Inter medium
- All colors reference Tailwind tokens or design system values — zero raw hex values

## Out of Scope

- **No actual plan content** — BB-22 through BB-25 add the first four plans
- **No plan browser/discovery UI** — BB-21.5
- **No audio plans** — BB-26/27
- **No plan categories, tags, filters, or search** — BB-21.5
- **No plan sharing** ("check out this plan") — future
- **No multi-user plans** — no accounts
- **No push notification reminders** — BB-41
- **No plan customization** ("make my own plan") — future
- **No automatic time-based progression** — manual only
- **No penalties for missing days**
- **No backend storage** — localStorage only
- **No SSR for plan pages** — BB-40
- **No "plan mode" that changes reader beyond the banner**
- **No "suggested next plan" after completion**
- **No deep linking to a specific passage within a plan day**
- **No reader lockdown** ("you must read today's passage first")
- **No confetti, badges, achievements, sound effects, or gamification in the celebration**

## Critical Edge Cases

1. **Corrupt/missing plan JSON**: Show error state on detail page ("This plan couldn't be loaded. Try again later."), log to console, do not throw
2. **Plan updated while user is mid-plan**: Progress record references slug + day numbers only, not content. Content updates flow through automatically. Structural changes (adding/removing days) require a new slug
3. **User completes day 30 of 30, then plan updated to 35 days**: `completedAt` already set — user's record shows "completed." They can start the new version if they want
4. **Two devices with different progress**: No sync — BB-16 export/import is the manual bridge
5. **Pause plan A, start plan B, resume plan A**: A becomes active, B becomes paused. Only one active at a time
6. **Mark day complete twice**: Idempotent — `completedDays` deduplicated on insert
7. **Complete final day before earlier days**: `completedAt` remains null. Celebration fires only when ALL days are in `completedDays`
8. **Empty manifest (BB-21 initial state)**: Loader returns empty array, no errors
9. **`activePlanSlug` references a plan whose JSON no longer exists**: Show error state, clear `activePlanSlug` to prevent perpetual error

## Acceptance Criteria

- [ ] `planTypes.ts` defines `Plan`, `PlanDay`, `PlanPassage`, `PlanProgress`, `PlansStoreState`, `PlanMetadata`, `PlanTheme`, and `PlanCompletionResult` types
- [ ] `manifest.json` exists at `frontend/src/data/bible/plans/manifest.json` as `[]`
- [ ] Manifest loader returns `PlanMetadata[]` from the manifest file
- [ ] Plan loader accepts a slug, validates the shape, returns `{ plan, error }` — never throws
- [ ] Plans store persists to `bible:plans` localStorage key
- [ ] Store state matches documented shape: `{ activePlanSlug, plans }`
- [ ] Starting a plan sets `activePlanSlug`, creates progress with `startedAt: today`, `currentDay: 1`, empty `completedDays`
- [ ] Starting a plan while another is active pauses the previous plan (`pausedAt: today`)
- [ ] Switching plans shows a confirmation dialog with the documented copy
- [ ] Marking a day complete adds to `completedDays` (deduplicated) and recalculates `currentDay`
- [ ] Marking a day complete twice is idempotent
- [ ] Marking the final day complete sets `completedAt`, clears `activePlanSlug`, fires celebration
- [ ] Celebration fires exactly once per completion, not on revisiting a completed plan
- [ ] Pausing sets `pausedAt` without clearing progress
- [ ] Resuming clears `pausedAt` and restores as active plan
- [ ] Re-starting a completed plan resets progress while preserving the plans record entry
- [ ] Active plan banner renders on the landing when `activePlanSlug` is not null
- [ ] `BibleHeroSlot` priority: active plan > active reader > VOTD
- [ ] Plan detail page has three states: preview, in progress, completed
- [ ] Plan day page renders day title, devotional, passages, reflection prompts, mark complete button
- [ ] Reader banner shows when loaded chapter matches current day's passages
- [ ] Reader banner does NOT show for chapters matching other days' passages
- [ ] Reader banner mark complete button works the same as the plan day page button
- [ ] Day completion status indicators: empty circle, filled circle, ring for out-of-order
- [ ] Tapping a day on detail page navigates to `/bible/plans/:slug/day/:day`
- [ ] Tapping a passage card navigates to `/bible/:book/:chapter?highlight=:startVerse`
- [ ] Reflection prompt journal link navigates to `/daily?tab=journal` with pre-filled context
- [ ] `useActivePlan` hook returns documented shape and helpers
- [ ] `usePlan(slug)` loads a specific plan lazily with loading/error states
- [ ] `usePlansManifest` returns manifest array with loading state
- [ ] Completion celebration shows heading, subtitle, stats, reflection textarea, Continue + Share actions
- [ ] Reflection text saves to `reflection` in the progress record
- [ ] Share action opens BB-13 share flow with plan completion image
- [ ] Export schema bumped from 1 to 2 with `plans` in data payload
- [ ] Import applier handles both v1 (no plans) and v2 (with plans) exports
- [ ] Replace mode overwrites `bible:plans` entirely
- [ ] Merge mode keeps the version with more completed days per plan
- [ ] Corrupt plan file shows error state on detail page
- [ ] All tap targets ≥ 44px
- [ ] `role="progressbar"` with `aria-valuenow`/`aria-valuemax` on progress bars
- [ ] Reduced motion respected on all animations
- [ ] Zero raw hex values — all colors use Tailwind tokens
- [ ] Plans store follows BB-7 reactive pattern (subscribe, getState, mutate)
- [ ] SSR-safe (returns defaults when `window` is undefined)
- [ ] Plan progression is idempotent
- [ ] Plan data validated at load time — missing fields cause error state, not runtime crash
- [ ] Empty manifest returns `[]` with no errors
- [ ] Logged-out users can view plan detail and day pages but cannot start/complete/pause
- [ ] Auth modal shows for each gated action with the documented message
- [ ] `wr_bible_active_plans` bridge key written by plansStore on `activePlanSlug` changes
