# Implementation Plan: HP-12 Final Cleanup + Full-Page Review

**Spec:** `_specs/hp-12-final-cleanup.md`
**Date:** 2026-04-02
**Branch:** `homepage-redesign` (continue on existing branch)
**Design System Reference:** `_plans/recon/design-system.md` (loaded — ⚠️ captured 2026-03-06, before homepage redesign series; stale for homepage-specific values but still valid for global tokens)
**Recon Report:** not applicable
**Master Spec Plan:** not applicable

---

## Architecture Context

### Current Codebase State (Verified via Reconnaissance)

The homepage codebase is already in excellent shape. HP-1 through HP-11 completed their cleanup correctly. Key findings:

**Orphaned files — ALL already deleted:**
- `FeatureShowcase.tsx`, `FeatureShowcaseTabs.tsx`, `FeatureShowcasePanel.tsx` — gone
- `previews/` directory — gone
- `PillarSection.tsx`, `PillarBlock.tsx`, `PillarAccordionItem.tsx`, `pillar-data.ts` — gone
- `GrowthTeasersSection.tsx` — gone

**BackgroundSquiggle — 15 active consumers, must NOT be deleted:**
- Used by `PrayTabContent.tsx`, `JournalTabContent.tsx`, `MeditateTabContent.tsx`, `DevotionalTabContent.tsx`, `AskPage.tsx`

**Home.tsx (`frontend/src/pages/Home.tsx`):**
- Imports: all clean, no dead imports
- Section order: matches spec exactly (Hero → Journey → StatsBar → DashboardPreview → Differentiator → Quiz → FinalCTA)
- No `{/* HP-N: ... */}` placeholder comments

**Barrel export (`frontend/src/components/homepage/index.ts`):**
- Exports exactly the 7 required components: `GlowBackground`, `SectionHeading`, `FrostedCard`, `StatsBar`, `DifferentiatorSection`, `DashboardPreview`, `FinalCTA`

**Section padding — all match spec:**
| Section | Current | Spec | Status |
|---------|---------|------|--------|
| JourneySection | `py-20 sm:py-28` | `py-20 sm:py-28` | ✓ |
| StatsBar | `py-14 sm:py-20` | `py-14 sm:py-20` | ✓ |
| DashboardPreview | `py-20 sm:py-28` | `py-20 sm:py-28` | ✓ |
| DifferentiatorSection | `py-20 sm:py-28` | `py-20 sm:py-28` | ✓ |
| StartingPointQuiz | `py-20 sm:py-28` | `py-20 sm:py-28` | ✓ |
| FinalCTA | `py-20 sm:py-28` | `py-20 sm:py-28` | ✓ |

**Background continuity — no seams:**
All sections use `bg-hero-bg` (#08051A) either directly (JourneySection, HeroSection) or via `GlowBackground` wrapper (StatsBar, DashboardPreview, DifferentiatorSection, StartingPointQuiz, FinalCTA). No margin/gap between sections in Home.tsx. The outer `bg-neutral-bg` wrapper is fully covered.

**Scroll animation — all consistent:**
All 6 homepage sections use `useScrollReveal` from `@/hooks/useScrollReveal`. No `useInView` usage found in homepage components. Default `triggerOnce: true` is used everywhere.

**Reduced motion — already handled at 3 levels:**
1. CSS (`index.css:150-155`): `.scroll-reveal` and `.scroll-reveal-fade` get `opacity: 1; transform: none; transition: none;`
2. Hook (`useScrollReveal.ts:16-21`): returns `isVisible: true` immediately when `prefers-reduced-motion: reduce`
3. Components: `useAnimatedCounter` (StatsBar counters) skips animation and shows final value. `GlowBackground` orbs use `motion-reduce:animate-none`.

### Files That Need Changes (3 total)

Only dead references remain to be cleaned:

1. **`frontend/src/constants/gradients.tsx:5`** — Comment mentions `GrowthTeasersSection` (deleted component)
2. **`frontend/src/pages/__tests__/Home.test.tsx:82-87`** — Test references `FeatureShowcase` in description string
3. **`frontend/src/pages/__tests__/Home.test.tsx:89-94`** — Test references `PillarSection` in description string

### Test Patterns

Home.test.tsx wraps in `MemoryRouter` + `ToastProvider` + `AuthModalProvider`. Mocks `useAuth` to return unauthenticated state. Tests use `screen.getByRole` and `screen.queryByRole` / `screen.queryByText` for assertions.

### Homepage component directory

```
frontend/src/components/homepage/
├── DashboardPreview.tsx
├── DifferentiatorSection.tsx
├── FinalCTA.tsx
├── FrostedCard.tsx
├── GlowBackground.tsx
├── SectionHeading.tsx
├── StatsBar.tsx
├── __tests__/ (7 test files)
├── dashboard-preview-data.ts
├── differentiator-data.ts
└── index.ts
```

---

## Auth Gating Checklist

N/A — This is a cleanup-only spec. No interactive elements added or changed.

---

## Design System Values (for UI steps)

N/A — No new UI. Only verifying existing values remain correct.

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| All homepage sections | background | `bg-hero-bg` (#08051A) | `tailwind.config.js:22` |
| Content sections | vertical padding | `py-20 sm:py-28` (80px / 112px) | Each component file |
| StatsBar | vertical padding | `py-14 sm:py-20` (56px / 80px) | `StatsBar.tsx:63` |
| Glow orbs | reduced motion | `motion-reduce:animate-none` | `GlowBackground.tsx:51` |

---

## Design System Reminder

- `bg-hero-bg` is `#08051A` (from tailwind.config.js) — distinct from `bg-hero-dark` (#0D0620)
- All homepage sections use `GlowBackground` wrapper (except JourneySection and HeroSection which apply `bg-hero-bg` directly)
- Scroll reveal CSS classes: `.scroll-reveal` (opacity + translateY) and `.scroll-reveal-fade` (opacity only)
- Reduced motion is handled at CSS level (`.scroll-reveal` forced visible), hook level (`useScrollReveal` returns `isVisible: true`), AND component level (`useAnimatedCounter`, `GlowBackground`)
- Homepage has no `useInView` usage — all sections use `useScrollReveal` exclusively

---

## Shared Data Models (from Master Plan)

N/A — No master spec plan. No data model changes.

---

## Responsive Structure

N/A — No new UI. Existing responsive behavior verified correct during reconnaissance.

---

## Vertical Rhythm

N/A — No spacing changes. All sections verified to match spec padding values.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] All orphaned files already deleted (verified via reconnaissance)
- [x] Barrel export already has exactly 7 components (verified)
- [x] Home.tsx section order already matches spec (verified)
- [x] All padding values already match spec (verified)
- [x] All scroll reveals use `useScrollReveal` with `triggerOnce: true` (verified)
- [x] Reduced motion handling exists at CSS, hook, and component levels (verified)
- [ ] BackgroundSquiggle has active consumers — do NOT delete (15 consumers found)
- [ ] Home.test.tsx removal-verification tests to be deleted (see Edge Cases)

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Home.test.tsx removal-verification tests (lines 82-94) | Delete both tests | These tests verify that `FeatureShowcase` and `PillarSection` are NOT rendered. They served their purpose during HP transition but are now vestigial. The components are fully deleted — they can't accidentally reappear. Keeping them creates false grep hits for deleted component names, which the spec explicitly requires to be zero. |
| BackgroundSquiggle | Keep — do NOT delete | 15 active consumers in Daily Hub tabs and AskPage. Not a homepage-only component despite being in `src/components/`. |
| gradients.tsx comment | Update to remove deleted component name | Comment is documentation only, but spec requires zero grep hits for `GrowthTeasersSection`. |
| `bg-neutral-bg` on Home.tsx outer wrapper | Leave as-is | All sections have their own `bg-hero-bg` background, fully covering the outer wrapper. No seams visible. Changing the outer wrapper background is cosmetic and not in spec. |

---

## Implementation Steps

### Step 1: Clean Dead References

**Objective:** Remove the 3 remaining grep hits for deleted component names so the codebase has zero references to FeatureShowcase, PillarSection, PillarBlock, PillarAccordionItem, GrowthTeasersSection, FeatureShowcaseTabs, or FeatureShowcasePanel.

**Files to modify:**
- `frontend/src/constants/gradients.tsx` — Update comment on line 5
- `frontend/src/pages/__tests__/Home.test.tsx` — Delete 2 removal-verification tests (lines 82-94)

**Details:**

1. **`gradients.tsx:5`** — Change:
   ```
   /** White-to-purple gradient — used on JourneySection, GrowthTeasersSection, StartingPointQuiz, HeroSection, TypewriterInput */
   ```
   To:
   ```
   /** White-to-purple gradient — used on JourneySection, StartingPointQuiz, HeroSection, TypewriterInput */
   ```

2. **`Home.test.tsx`** — Delete the two test cases at lines 82-94:
   ```typescript
   it('does not render FeatureShowcase (replaced by JourneySection)', () => {
     renderHome()
     expect(
       screen.queryByRole('heading', { name: /experience worship room/i })
     ).not.toBeInTheDocument()
   })

   it('does not render PillarSection (removed in HP-8)', () => {
     renderHome()
     expect(
       screen.queryByText(/three pillars/i)
     ).not.toBeInTheDocument()
   })
   ```

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT delete BackgroundSquiggle (has 15 active consumers)
- DO NOT modify any component code — only comments and tests
- DO NOT add new tests — this is a deletion-only step

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Verify remaining Home.test.tsx tests pass | integration | Run `pnpm test frontend/src/pages/__tests__/Home.test.tsx` — all remaining 7 tests pass |

**Expected state after completion:**
- [ ] `grep -r "GrowthTeasersSection" frontend/src/` returns 0 hits
- [ ] `grep -r "FeatureShowcase" frontend/src/` returns 0 hits
- [ ] `grep -r "PillarSection" frontend/src/` returns 0 hits
- [ ] `grep -r "PillarBlock" frontend/src/` returns 0 hits
- [ ] `grep -r "PillarAccordionItem" frontend/src/` returns 0 hits
- [ ] `grep -r "FeatureShowcaseTabs" frontend/src/` returns 0 hits
- [ ] `grep -r "FeatureShowcasePanel" frontend/src/` returns 0 hits
- [ ] Home.test.tsx has 7 tests (down from 9)

---

### Step 2: Full Verification Pass

**Objective:** Run all spec verification checks (Parts 1-8) to confirm the codebase meets every acceptance criterion. Document pass/fail for each.

**Files to create/modify:** None (verification only)

**Details:**

Run the following verification checks in order:

**Part 1 — Orphaned files (verify deleted):**
- Confirm none of these exist: `FeatureShowcase.tsx`, `FeatureShowcaseTabs.tsx`, `FeatureShowcasePanel.tsx`, `previews/`, `PillarSection.tsx`, `PillarBlock.tsx`, `PillarAccordionItem.tsx`, `pillar-data.ts`, `GrowthTeasersSection.tsx`
- Confirm `BackgroundSquiggle.tsx` exists (active component, not orphaned)

**Part 2 — Dead imports (verify zero grep hits):**
- Grep for each deleted component name in `frontend/src/` — expect 0 hits each (cleaned in Step 1)

**Part 3 — Barrel export:**
- Read `frontend/src/components/homepage/index.ts` — confirm exactly 7 exports: GlowBackground, SectionHeading, FrostedCard, StatsBar, DashboardPreview, DifferentiatorSection, FinalCTA

**Part 4 — Orphaned test files:**
- Verify no test files exist exclusively for deleted components (none found during recon)

**Part 5 — Home.tsx section order:**
- Read `frontend/src/pages/Home.tsx` — confirm render order: Navbar (transparent, hideBanner) → HeroSection → JourneySection → StatsBar → DashboardPreview → DifferentiatorSection → StartingPointQuiz → FinalCTA → SiteFooter
- Confirm no `{/* HP-N: ... */}` comments
- Confirm no duplicate/unused imports

**Part 6 — Spacing consistency:**
- Verify each section's padding matches spec values (all confirmed during recon)
- Verify all sections use `bg-hero-bg` (directly or via GlowBackground)

**Part 7 — Scroll animation consistency:**
- Grep for `useInView` in homepage components — expect 0 hits
- Grep for `useScrollReveal` in homepage components — expect hits in all 6 sections
- Verify `triggerOnce: true` is default in `useScrollReveal` hook

**Part 8 — Reduced motion:**
- Verify CSS: `@media (prefers-reduced-motion: reduce)` sets `.scroll-reveal` to `opacity: 1; transform: none; transition: none;`
- Verify hook: `useScrollReveal` returns `isVisible: true` when reduced motion preferred
- Verify `useAnimatedCounter` skips animation when reduced motion preferred
- Verify `GlowBackground` orbs have `motion-reduce:animate-none`

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT make any code changes in this step — verification only
- DO NOT skip any verification check

**Test specifications:**
N/A — This step is verification, not code.

**Expected state after completion:**
- [ ] All 8 spec parts verified with documented results
- [ ] Any unexpected findings flagged for resolution

---

### Step 3: Quality Gates

**Objective:** Run all three quality gates (`pnpm build`, `pnpm test`, `pnpm lint`) and confirm pass.

**Files to create/modify:** None (unless quality gates reveal issues requiring fixes)

**Details:**

Run in this order:
1. `cd frontend && pnpm build` — must pass with 0 errors
2. `cd frontend && pnpm test` — all tests pass, 0 failures
3. `cd frontend && pnpm lint` — 0 new errors (pre-existing warnings acceptable)

If any gate fails:
- Diagnose root cause
- Fix only what's broken (do not refactor surrounding code)
- Re-run the failing gate

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT suppress lint warnings with `// eslint-disable` unless the warning is a false positive
- DO NOT add `@ts-ignore` or `@ts-expect-error`
- DO NOT modify test infrastructure or configuration

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Build passes | build | `pnpm build` exits 0 with no TypeScript or Vite errors |
| All tests pass | unit/integration | `pnpm test` reports 0 failures |
| No new lint errors | lint | `pnpm lint` error count does not increase from baseline (6 errors) |

**Expected state after completion:**
- [ ] `pnpm build` — 0 errors
- [ ] `pnpm test` — all pass, 0 failures
- [ ] `pnpm lint` — no new errors beyond pre-existing baseline

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Clean dead references (comment + tests) |
| 2 | 1 | Full verification pass (all 8 spec parts) |
| 3 | 1 | Quality gates (build, test, lint) |

Steps 2 and 3 both depend on Step 1 but are independent of each other — they can run in parallel after Step 1 completes.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Clean dead references | [COMPLETE] | 2026-04-02 | Removed `GrowthTeasersSection` from gradients.tsx comment. Deleted 2 removal-verification tests from Home.test.tsx (FeatureShowcase + PillarSection). All 7 grep targets return 0 hits. 9 remaining tests pass (plan said 7 but original count was 11, not 9). |
| 2 | Full verification pass | [COMPLETE] | 2026-04-02 | All 8 parts pass: orphaned files gone, 0 grep hits for all 7 deleted names, barrel has 7 exports, no orphaned test files, Home.tsx section order correct, all padding matches spec, all sections use useScrollReveal (0 useInView hits), reduced motion handled at CSS/hook/component levels. |
| 3 | Quality gates | [COMPLETE] | 2026-04-02 | `pnpm build` — 0 errors (7.45s). `pnpm test` — 5,469 tests pass, 0 failures (475 files). `pnpm lint` — 7 errors + 2 warnings (all pre-existing, none from our changes; baseline drift from plan's "6 errors + 32 warnings"). |
