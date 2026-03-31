# Implementation Plan: Content Width & Layout Fixes

**Spec:** `_specs/content-width-layout-fixes.md`
**Date:** 2026-03-29
**Branch:** `claude/feature/content-width-layout-fixes`
**Design System Reference:** `_plans/recon/design-system.md` (loaded — captured 2026-03-06)
**Recon Report:** not applicable
**Master Spec Plan:** not applicable

> ⚠️ Design system recon was captured 2026-03-06, before the Round 2 dark theme redesign and inner-page hero redesign (~2026-03-25). Recon does not reflect current dark dashboard or atmospheric hero patterns. Layout and gradient values come from codebase inspection below, not the recon.

---

## Architecture Context

### Caveat Title Cutoff — Root Cause

All hero titles use this pattern:
```
font-script text-3xl font-bold leading-tight bg-gradient-to-r from-white to-primary-lt bg-clip-text text-transparent sm:text-4xl
```

`bg-clip-text` clips the gradient background to the text's CSS layout bounding box. Caveat (the `font-script` font) renders script flourishes that overshoot the layout box — ascenders, descenders, and italic slant extend beyond the bounding rect. Since there's no background beyond the box, those pixels appear invisible/clipped.

**Fix:** Add `px-2` to the `h1`/`h2` elements using this pattern. This expands the layout box horizontally, giving flourishes room to render within the clipped area. On mobile, `px-1` avoids wasting horizontal space.

### Affected Files — Title Cutoff

15 locations use `font-script ... bg-clip-text text-transparent`:

**Shared components (3):**
- `frontend/src/components/PageHero.tsx:35` — used by AskPage, MusicPage, MyPrayers, 6 meditation sub-pages
- `frontend/src/components/prayer-wall/PrayerWallHero.tsx:16`
- `frontend/src/components/local-support/LocalSupportHero.tsx:27`

**Inline heroes (12):**
- `frontend/src/pages/DailyHub.tsx:226`
- `frontend/src/pages/BibleBrowser.tsx:48`
- `frontend/src/pages/GrowPage.tsx:105`
- `frontend/src/pages/RoutinesPage.tsx:120`
- `frontend/src/pages/GrowthProfile.tsx:130`
- `frontend/src/pages/Insights.tsx:204`
- `frontend/src/pages/Friends.tsx:91`
- `frontend/src/pages/ReadingPlanDetail.tsx:159`
- `frontend/src/pages/MonthlyReport.tsx:111`
- `frontend/src/pages/ChallengeDetail.tsx:234`
- `frontend/src/pages/Settings.tsx:64`
- `frontend/src/pages/BibleReader.tsx:198`

### Content Width — Current State

| Component | File | Current Width | Target Width |
|-----------|------|--------------|-------------|
| DevotionalTabContent | `components/daily/DevotionalTabContent.tsx:142` | `max-w-2xl` (672px) | `max-w-4xl` (896px) |
| PrayTabContent | `components/daily/PrayTabContent.tsx:166` | `max-w-2xl` (672px) | Keep (textarea-focused layout) |
| JournalTabContent | `components/daily/JournalTabContent.tsx:216` | `max-w-2xl` (672px) | Keep (textarea-focused layout) |
| MeditateTabContent | `components/daily/MeditateTabContent.tsx:58` | `max-w-2xl` (672px) | Keep (card grid layout) |
| BibleBrowser content | `pages/BibleBrowser.tsx:58` | `max-w-4xl` (896px) | `max-w-5xl` (1024px) |

**Rationale for not widening Pray/Journal/Meditate:** Each tab controls its own container width independently (no shared parent wrapper). Pray and Journal are textarea-focused — wider text areas reduce readability and feel empty. Meditate has a 2-column card grid that works well at 672px. Only Devotional benefits from wider width because it has structured sections (quote card, passage, reflection, prayer, question) that feel cramped at 672px.

### PrayerWall overflow-x-hidden

`PrayerWall.tsx:346` uses `overflow-x-hidden` on the page wrapper. This could contribute to title cutoff by clipping the hero section. After adding `px-2` padding to the title, the overflow clip should no longer be needed for the title. Evaluate whether removing it is safe (check if any other element relies on it, e.g., horizontal scroll from wide prayer cards).

### Test Patterns

Existing component tests use Vitest + React Testing Library. Hero component tests wrap with `MemoryRouter`. No provider wrapping needed for the affected components beyond routing. Test assertions use `getByRole('heading')`, `getByText()`.

---

## Auth Gating Checklist

No auth changes. All modifications are purely visual (CSS class changes). No interactive elements added or modified.

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| N/A — visual-only changes | No auth gating needed | N/A | N/A |

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Hero title | className | `font-script text-3xl font-bold leading-tight bg-gradient-to-r from-white to-primary-lt bg-clip-text text-transparent sm:text-4xl` | `PageHero.tsx:35` |
| Hero section | background | `ATMOSPHERIC_HERO_BG` = `{ backgroundColor: '#0f0a1e', backgroundImage: 'radial-gradient(ellipse at top center, rgba(109, 40, 217, 0.15) 0%, transparent 70%)' }` | `PageHero.tsx:9-13` |
| Tab containers | className | `mx-auto max-w-2xl px-4 py-10 sm:py-14` | `DevotionalTabContent.tsx:142` |
| Bible content | className | `mx-auto max-w-4xl px-4 pb-16` | `BibleBrowser.tsx:58` |

---

## Design System Reminder

**Project-specific quirks for `/execute-plan`:**

- Caveat is `font-script`, used for hero titles — NOT for body text or section headings
- `bg-clip-text text-transparent` is always paired with `bg-gradient-to-r from-white to-primary-lt` for hero titles
- All hero sections use `ATMOSPHERIC_HERO_BG` from `PageHero.tsx` (inline style, not Tailwind class)
- `max-w-2xl` = 672px, `max-w-3xl` = 768px, `max-w-4xl` = 896px, `max-w-5xl` = 1024px
- Dashboard dark background is `bg-dashboard-dark` (#0f0a1e)
- PrayerWall is the only page with `overflow-x-hidden` on the wrapper

---

## Shared Data Models (from Master Plan)

N/A — standalone visual polish spec. No data models, no localStorage changes.

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | Content already full-width with `px-4`. Title padding: `px-1` to conserve space. No container width change visible. |
| Tablet | 768px | Devotional container widens from 672px to 896px (centered). Bible widens from 896px to 1024px. Title padding: `px-2`. |
| Desktop | 1440px | Same as tablet but with more visible side margins. Additional `lg:px-8` on Bible content area. |

---

## Vertical Rhythm

N/A — no vertical spacing changes. All changes are horizontal (container widths and inline padding).

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] All 15 locations with `font-script bg-clip-text text-transparent` are identified
- [x] Each Daily Hub tab controls its own container width independently (no shared parent)
- [x] `max-w-4xl` (896px) keeps body text at ~80-90 characters per line at 16px (readable)
- [x] `max-w-5xl` (1024px) is appropriate for BibleBrowser's structured list layout
- [x] No auth-gated actions in this spec
- [x] No [UNVERIFIED] values — all values from codebase inspection with exact file:line citations
- [ ] PrayerWall `overflow-x-hidden` removal is safe (verified in Step 5)

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Widen only Devotional tab, not Pray/Journal/Meditate | Keep Pray/Journal at `max-w-2xl` | Textarea-focused layouts feel empty when wide. Meditate card grid works at current width. |
| Title padding value | `px-1 sm:px-2` | `px-1` (4px) on mobile conserves scarce horizontal space. `px-2` (8px) on sm+ gives flourishes ample room without visible gaps. |
| PrayerWall `overflow-x-hidden` | Remove it | The `px-2` title fix eliminates the flourish overflow that may have motivated it. No other element in the page requires horizontal overflow clipping. If unexpected horizontal scroll appears, the fix is to add `overflow-x-hidden` back to a narrower scope. |

---

## Implementation Steps

### Step 1: Fix shared hero components — PageHero, PrayerWallHero, LocalSupportHero

**Objective:** Add horizontal padding to the h1 elements in the 3 shared/reusable hero components so Caveat flourishes render within the expanded layout box.

**Files to modify:**
- `frontend/src/components/PageHero.tsx` — h1 at line 35
- `frontend/src/components/prayer-wall/PrayerWallHero.tsx` — h1 at line 16
- `frontend/src/components/local-support/LocalSupportHero.tsx` — h1 at line 27

**Details:**

Add `px-1 sm:px-2` to the className string of each h1 that has `font-script ... bg-clip-text text-transparent`.

PageHero.tsx line 35 — change:
```
'font-script text-3xl font-bold leading-tight bg-gradient-to-r from-white to-primary-lt bg-clip-text text-transparent sm:text-4xl',
```
to:
```
'px-1 sm:px-2 font-script text-3xl font-bold leading-tight bg-gradient-to-r from-white to-primary-lt bg-clip-text text-transparent sm:text-4xl',
```

PrayerWallHero.tsx line 16 — add `px-1 sm:px-2` to the h1 className.

LocalSupportHero.tsx line 27 — add `px-1 sm:px-2` to the h1 className.

**Responsive behavior:**
- Mobile (375px): `px-1` (4px each side) — minimal space consumption
- Tablet (768px): `px-2` (8px each side) — comfortable flourish room
- Desktop (1440px): `px-2` (8px each side) — same as tablet

**Guardrails (DO NOT):**
- DO NOT change font sizes, gradients, colors, or any other className properties
- DO NOT modify the `ATMOSPHERIC_HERO_BG` style object
- DO NOT add `overflow-hidden` or `overflow-x-hidden` to hero sections as an alternative fix
- DO NOT use `px-3` or larger — it creates a visible gap around the title text

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| PageHero renders title with padding | unit | Render `<PageHero title="Test" />`, verify h1 has `px-1` and `sm:px-2` classes |
| PrayerWallHero renders title with padding | unit | Render `<PrayerWallHero />`, verify h1 has `px-1` and `sm:px-2` classes |
| LocalSupportHero renders title with padding | unit | Render `<LocalSupportHero title="Test" ... />`, verify h1 has `px-1` and `sm:px-2` classes |

**Expected state after completion:**
- [x] All 3 shared hero components have `px-1 sm:px-2` on their h1 elements
- [x] Pages using PageHero (AskPage, MusicPage, MyPrayers, 6 meditation sub-pages) inherit the fix automatically
- [x] Pages using PrayerWallHero and LocalSupportHero (3 local support pages) inherit the fix automatically
- [x] ~11 pages fixed via these 3 component changes

---

### Step 2: Fix inline hero titles across all pages

**Objective:** Add `px-1 sm:px-2` padding to every remaining h1 element that uses `font-script bg-clip-text text-transparent` outside of the shared components.

**Files to modify:**
- `frontend/src/pages/DailyHub.tsx` — h1 at line 226
- `frontend/src/pages/BibleBrowser.tsx` — h1 at line 48
- `frontend/src/pages/GrowPage.tsx` — h1 at line 105
- `frontend/src/pages/RoutinesPage.tsx` — h1 at line 120
- `frontend/src/pages/GrowthProfile.tsx` — h1 at line 130
- `frontend/src/pages/Insights.tsx` — h1 at line 204
- `frontend/src/pages/Friends.tsx` — h1 at line 91
- `frontend/src/pages/ReadingPlanDetail.tsx` — h1 at line 159
- `frontend/src/pages/MonthlyReport.tsx` — h1 at line 111
- `frontend/src/pages/ChallengeDetail.tsx` — h1 at line 234
- `frontend/src/pages/Settings.tsx` — h1 at line 64
- `frontend/src/pages/BibleReader.tsx` — h1 at line 198

**Details:**

Same mechanical change as Step 1: add `px-1 sm:px-2` to the className string of each h1.

Example — DailyHub.tsx line 226, change:
```
className="mb-1 font-script text-3xl font-bold leading-tight bg-gradient-to-r from-white to-primary-lt bg-clip-text text-transparent sm:text-4xl"
```
to:
```
className="mb-1 px-1 sm:px-2 font-script text-3xl font-bold leading-tight bg-gradient-to-r from-white to-primary-lt bg-clip-text text-transparent sm:text-4xl"
```

Apply the identical pattern to all 12 files. Insert `px-1 sm:px-2` after any existing margin/position classes (`mb-1`, `mt-4`, etc.) or at the start if none exist.

**Note:** This step touches 12 files, exceeding the ≤3 file guideline. This is acceptable because the change is identical and mechanical in every file (add 3 Tailwind classes to a className string). Each change is a single-line edit.

**Responsive behavior:**
- Mobile (375px): `px-1` (4px) — minimal
- Tablet (768px): `px-2` (8px) — comfortable
- Desktop (1440px): `px-2` (8px) — same

**Guardrails (DO NOT):**
- DO NOT change any other classes on these elements
- DO NOT refactor these into a shared utility class or component — they're already structured intentionally
- DO NOT touch DevotionalTabContent's `font-script text-3xl text-primary` heading — it does NOT use `bg-clip-text` and is unaffected

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| DailyHub hero title has padding | unit | Render DailyHub, verify h1 has `px-1` and `sm:px-2` |
| BibleBrowser hero title has padding | unit | Render BibleBrowser, verify h1 has `px-1` and `sm:px-2` |

**Expected state after completion:**
- [x] All 15 locations with `font-script bg-clip-text text-transparent` have `px-1 sm:px-2`
- [x] Zero clipped Caveat titles at any viewport width
- [x] No horizontal scrollbars introduced

---

### Step 3: Widen DevotionalTabContent container

**Objective:** Change the devotional content container from `max-w-2xl` (672px) to `max-w-4xl` (896px) for a more spacious reading experience.

**Files to modify:**
- `frontend/src/components/daily/DevotionalTabContent.tsx` — line 142

**Details:**

Change line 142:
```
<div className="mx-auto max-w-2xl px-4 py-10 sm:py-14" {...swipeHandlers}>
```
to:
```
<div className="mx-auto max-w-4xl px-4 py-10 sm:py-14" {...swipeHandlers}>
```

**Responsive behavior:**
- Mobile (375px): No change — content is already full-width with `px-4` padding. `max-w-4xl` has no effect.
- Tablet (768px): Content area widens from 672px to 768px (limited by viewport). More content visible.
- Desktop (1440px): Content area widens from 672px to 896px. ~80-90 characters per line at 16px — within readable range.

**Guardrails (DO NOT):**
- DO NOT change PrayTabContent, JournalTabContent, or MeditateTabContent containers — they stay at `max-w-2xl`
- DO NOT change padding (`px-4`) or vertical spacing (`py-10 sm:py-14`)
- DO NOT add `lg:px-8` here — the devotional content has structured sections that benefit from consistent padding

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| DevotionalTabContent uses max-w-4xl | unit | Render DevotionalTabContent, query the outer wrapper div, verify it has `max-w-4xl` class |
| Pray/Journal/Meditate tabs unchanged | unit | Verify PrayTabContent, JournalTabContent, MeditateTabContent still use `max-w-2xl` |

**Expected state after completion:**
- [x] DevotionalTabContent uses `max-w-4xl` (896px)
- [x] Other Daily Hub tabs unchanged at `max-w-2xl` (672px)
- [x] Tab switching still works correctly
- [x] Swipe navigation still works

---

### Step 4: Widen BibleBrowser content container

**Objective:** Change the BibleBrowser content area from `max-w-4xl` (896px) to `max-w-5xl` (1024px) and add desktop padding.

**Files to modify:**
- `frontend/src/pages/BibleBrowser.tsx` — line 58

**Details:**

Change line 58:
```
<div className="mx-auto max-w-4xl px-4 pb-16">
```
to:
```
<div className="mx-auto max-w-5xl px-4 pb-16 lg:px-8">
```

**Responsive behavior:**
- Mobile (375px): No change — content is full-width with `px-4`.
- Tablet (768px): Content area widens from 768px (capped by viewport) to wider. More room for accordion items.
- Desktop (1440px): Content area widens from 896px to 1024px. `lg:px-8` adds 32px padding on each side for visual breathing room.

**Guardrails (DO NOT):**
- DO NOT change the hero section — it remains full-width
- DO NOT change `SegmentedControl` or `BibleBooksMode`/`BibleSearchMode` components
- DO NOT change `HighlightsNotesSection` layout

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| BibleBrowser content uses max-w-5xl | unit | Render BibleBrowser, verify content container has `max-w-5xl` and `lg:px-8` |

**Expected state after completion:**
- [x] BibleBrowser content area uses `max-w-5xl` (1024px)
- [x] Desktop has additional `lg:px-8` padding
- [x] Hero section unchanged (full-width)
- [x] Accordion, search, and highlights/notes sections still functional

---

### Step 5: Remove PrayerWall overflow-x-hidden

**Objective:** Remove `overflow-x-hidden` from the PrayerWall page wrapper now that the title cutoff fix eliminates the need for it.

**Files to modify:**
- `frontend/src/pages/PrayerWall.tsx` — line 346

**Details:**

Change line 346:
```
<div className="flex min-h-screen flex-col overflow-x-hidden bg-dashboard-dark font-sans">
```
to:
```
<div className="flex min-h-screen flex-col bg-dashboard-dark font-sans">
```

**Pre-change verification:** Before removing, grep for any element inside PrayerWall that extends beyond the viewport (e.g., negative margins, wide absolutely-positioned elements, horizontal scrolling containers). If any such element exists, keep `overflow-x-hidden` and note why.

**Responsive behavior:**
- All breakpoints: No visual change expected. The `overflow-x-hidden` was a blunt fix for title clipping. With `px-1 sm:px-2` on the title, the overflow clip is unnecessary.
- If horizontal scrollbar appears at any width after removal, re-add `overflow-x-hidden` to the narrowest possible scope.

**Guardrails (DO NOT):**
- DO NOT add `overflow-hidden` (clips vertical overflow too — breaks sticky elements and dropdowns)
- DO NOT remove other classes from the same element

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| PrayerWall wrapper has no overflow-x-hidden | unit | Render PrayerWall, verify the page wrapper div does not have `overflow-x-hidden` class |

**Expected state after completion:**
- [x] PrayerWall page wrapper no longer has `overflow-x-hidden`
- [x] No horizontal scrollbar at any viewport width
- [x] All Prayer Wall interactions unchanged (posting, commenting, sharing, filtering)

---

### Step 6: Tests and verification

**Objective:** Run existing tests to confirm no regressions, then run a targeted visual check.

**Files to create/modify:**
- No new files — run existing test suite

**Details:**

1. Run `pnpm test` from `frontend/` to verify all ~4,862 existing tests pass
2. Run `pnpm build` to verify no TypeScript or build errors
3. Run `pnpm lint` to verify no new lint errors introduced

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT skip the full test run — even small CSS class changes can break snapshot tests or class-based assertions

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Full test suite | regression | `pnpm test` passes with 0 failures |
| Build check | build | `pnpm build` completes with 0 errors |

**Expected state after completion:**
- [x] All existing tests pass
- [x] Build succeeds
- [x] No new lint errors

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Fix shared hero components (PageHero, PrayerWallHero, LocalSupportHero) |
| 2 | — | Fix inline hero titles across 12 pages |
| 3 | — | Widen DevotionalTabContent container |
| 4 | — | Widen BibleBrowser content container |
| 5 | 1 | Remove PrayerWall overflow-x-hidden (depends on title fix from Step 1) |
| 6 | 1, 2, 3, 4, 5 | Run tests and verify all changes |

Steps 1-4 are independent and can execute in parallel. Step 5 depends on Step 1 (title fix must be in place before removing overflow guard). Step 6 depends on all prior steps.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Fix shared hero components | [COMPLETE] | 2026-03-29 | Added `px-1 sm:px-2` to h1 in PageHero.tsx, PrayerWallHero.tsx, LocalSupportHero.tsx. Created PageHero.test.tsx, added padding tests to PrayerWallHero and LocalSupportHero tests. |
| 2 | Fix inline hero titles | [COMPLETE] | 2026-03-29 | Added `px-1 sm:px-2` to h1 in all 12 page files. Added padding tests to DailyHub.test.tsx and BibleBrowser.test.tsx. All 15 locations confirmed fixed. |
| 3 | Widen DevotionalTabContent | [COMPLETE] | 2026-03-29 | Changed `max-w-2xl` to `max-w-4xl` in DevotionalTabContent.tsx:142. Added container width test. Pray/Journal/Meditate confirmed unchanged at `max-w-2xl`. |
| 4 | Widen BibleBrowser content | [COMPLETE] | 2026-03-29 | Changed `max-w-4xl` to `max-w-5xl` and added `lg:px-8` in BibleBrowser.tsx:58. Added content width test. |
| 5 | Remove PrayerWall overflow-x-hidden | [COMPLETE] | 2026-03-29 | Removed `overflow-x-hidden` from PrayerWall.tsx:346. Pre-verified no negative margins or wide elements. Added test. |
| 6 | Tests and verification | [COMPLETE] | 2026-03-29 | 4,879 tests pass (7 new). Build succeeds. 0 new lint errors/warnings. |
