# HP-12: Final Cleanup + Full-Page Review

**Master Plan Reference:** N/A — final housekeeping spec for the homepage redesign series (HP-1 through HP-11).

**Branch Strategy:** Continue on `homepage-redesign`. Do NOT create a new branch.

---

## Overview

This is a housekeeping pass to ensure the homepage redesign codebase is clean before Eric's final review. No new features, no visual changes — just verifying that orphaned files from deleted sections are gone, dead imports are eliminated, spacing is consistent, and all quality gates pass.

## User Story

As a **developer**, I want to clean up all orphaned files, dead imports, and inconsistencies left over from the HP-1 through HP-11 homepage redesign so that the codebase is ready for review and merge.

## Requirements

### Part 1: Delete Orphaned Files

Verify the following files were deleted in earlier HP specs. If any survived, delete them now.

**FeatureShowcase files (should have been deleted in HP-8):**
- `src/components/homepage/FeatureShowcase.tsx`
- `src/components/homepage/FeatureShowcaseTabs.tsx`
- `src/components/homepage/FeatureShowcasePanel.tsx`
- `src/components/homepage/previews/DevotionalPreview.tsx`
- `src/components/homepage/previews/PrayerPreview.tsx`
- `src/components/homepage/previews/MeditationPreview.tsx`
- `src/components/homepage/previews/PrayerWallPreview.tsx`
- `src/components/homepage/previews/GrowthPreview.tsx`
- `src/components/homepage/previews/` (directory itself)

**PillarSection files (should have been deleted in HP-9):**
- `src/components/homepage/PillarSection.tsx`
- `src/components/homepage/PillarBlock.tsx`
- `src/components/homepage/PillarAccordionItem.tsx`
- `src/components/homepage/pillar-data.ts`

**GrowthTeasersSection (should have been deleted in HP-6):**
- `src/components/GrowthTeasersSection.tsx`

**BackgroundSquiggle (conditional):**
- Grep for `BackgroundSquiggle` in `src/`. If zero consumers: delete `src/components/BackgroundSquiggle.tsx`. If still imported (e.g., by StartingPointQuiz): leave it.

### Part 2: Verify No Dead Imports

- Run `pnpm build` — must pass with 0 errors
- Grep for every deleted component name (`FeatureShowcase`, `PillarSection`, `PillarBlock`, `PillarAccordionItem`, `GrowthTeasersSection`, `FeatureShowcaseTabs`, `FeatureShowcasePanel`) in `src/`. Each must return zero hits. Remove any dead imports found.

### Part 3: Clean Up Barrel Export

**File:** `src/components/homepage/index.ts`

Must export only existing components:
- `GlowBackground`
- `SectionHeading`
- `FrostedCard`
- `StatsBar`
- `DashboardPreview`
- `DifferentiatorSection`
- `FinalCTA`

Remove any exports for deleted components.

### Part 4: Delete Orphaned Test Files

Search for test files referencing deleted components. Delete test files that exclusively test deleted components. If a test file tests multiple things, remove only the dead component tests.

### Part 5: Verify Home.tsx Section Order

The render order must be exactly:

```
Navbar (transparent, hideBanner)
HeroSection
JourneySection
StatsBar
DashboardPreview
DifferentiatorSection
StartingPointQuiz
FinalCTA
SiteFooter
```

Additionally:
- Remove any leftover `{/* HP-N: ... */}` placeholder comments
- Remove duplicate or unused imports
- Clean import order (React first, then components)

### Part 6: Spacing Consistency

| Section | Expected padding |
|---------|-----------------|
| HeroSection | Its own padding (don't change) |
| JourneySection | `py-20 sm:py-28` |
| StatsBar | `py-14 sm:py-20` |
| DashboardPreview | `py-20 sm:py-28` |
| DifferentiatorSection | `py-20 sm:py-28` |
| StartingPointQuiz | `py-20 sm:py-28` |
| FinalCTA | `py-20 sm:py-28` |

Verify:
- No double padding between sections
- All sections use `bg-hero-bg` — no visible color seams
- Clean transition from FinalCTA to SiteFooter

### Part 7: Scroll Animation Consistency

- All homepage sections must use `useScrollReveal` (not the old `useInView`)
- All scroll reveals must use `triggerOnce: true` (default)
- No section should re-animate on scroll

### Part 8: Reduced Motion Check

With `prefers-reduced-motion: reduce`:
- All sections immediately visible (no opacity-0 stuck states)
- No counter animations on StatsBar
- No stagger delays
- Quiz transitions instant
- Glow orbs have no float animation
- Page fully functional and readable

### Part 9: Full Quality Gate

- `pnpm test` — all pass, 0 failures
- `pnpm build` — 0 errors
- `pnpm lint` — 0 new errors (pre-existing warnings acceptable)

## AI Safety Considerations

N/A — This spec involves no user input, no AI content, no new features. Pure codebase cleanup.

## Auth Gating

N/A — No interactive elements added or changed. This is a cleanup-only spec.

## Responsive Behavior

N/A — No new UI. Part 6 (spacing consistency) verifies existing responsive padding is correct but does not introduce new responsive behavior.

## Auth & Persistence

N/A — No data, no persistence, no auth changes.

## Design Notes

- Part 6 references the standard section padding pattern: `py-20 sm:py-28` for content sections, `py-14 sm:py-20` for compact visual breathers (StatsBar)
- All sections should sit on `bg-hero-bg` (#0D0620) with no visible seams
- Design system recon at `_plans/recon/design-system.md` can be referenced for exact values if spacing discrepancies are found

## Out of Scope

- No new features or visual changes
- No new components
- No refactoring beyond what's needed for cleanup
- No changes to non-homepage files (unless they have dead imports to deleted homepage components)

## Acceptance Criteria

- [ ] All FeatureShowcase files verified deleted (8 files + previews directory)
- [ ] All PillarSection files verified deleted (4 files)
- [ ] `GrowthTeasersSection.tsx` verified deleted
- [ ] BackgroundSquiggle deleted if no consumers remain (or kept with documented reason)
- [ ] Zero grep hits for `FeatureShowcase` in `src/`
- [ ] Zero grep hits for `PillarSection` in `src/`
- [ ] Zero grep hits for `PillarBlock` in `src/`
- [ ] Zero grep hits for `PillarAccordionItem` in `src/`
- [ ] Zero grep hits for `GrowthTeasersSection` in `src/`
- [ ] Zero grep hits for `FeatureShowcaseTabs` in `src/`
- [ ] Zero grep hits for `FeatureShowcasePanel` in `src/`
- [ ] `src/components/homepage/index.ts` exports only the 7 specified components
- [ ] All orphaned test files deleted or cleaned
- [ ] Home.tsx section order matches spec exactly
- [ ] No `{/* HP-N: ... */}` placeholder comments in Home.tsx
- [ ] No duplicate or unused imports in Home.tsx
- [ ] JourneySection has `py-20 sm:py-28`
- [ ] StatsBar has `py-14 sm:py-20`
- [ ] DashboardPreview has `py-20 sm:py-28`
- [ ] DifferentiatorSection has `py-20 sm:py-28`
- [ ] StartingPointQuiz has `py-20 sm:py-28`
- [ ] FinalCTA has `py-20 sm:py-28`
- [ ] No homepage component imports `useInView`
- [ ] All scroll reveals use `triggerOnce: true`
- [ ] Reduced motion: all sections immediately visible, no stuck opacity-0
- [ ] `pnpm test` passes (0 failures)
- [ ] `pnpm build` passes (0 errors)
- [ ] `pnpm lint` passes (0 new errors)
- [ ] Committed on `homepage-redesign` branch
