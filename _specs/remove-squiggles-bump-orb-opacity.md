# Remove Squiggles from Pray/Journal/Meditate + Bump Orb Opacity

**Master Plan Reference:** N/A — standalone visual cleanup

---

## Overview

The `BackgroundSquiggle` decorative SVG was originally the Daily Hub's visual signature, but in practice it reads as noise — distracting brain-static that competes with content rather than supporting it. With the GlowBackground orbs now providing atmospheric depth, the squiggle is redundant. Removing it cleans up all three tabs and lets the purple glow carry the mood. The orb opacity defaults in `GLOW_CONFIG` are bumped to match the 0.25-0.50 design system range so the defaults are aligned with the live-rendered values.

## User Story

As a user visiting the Daily Hub, I want the Pray, Journal, and Meditate tabs to feel clean and focused so that the content is the star with purple atmosphere in the background.

## Requirements

### Functional Requirements

1. Remove `BackgroundSquiggle` component usage and `SQUIGGLE_MASK_STYLE` import from `PrayTabContent.tsx`, `JournalTabContent.tsx`, and `MeditateTabContent.tsx`
2. Flatten the nested `<div className="relative">` wrapper pairs that existed to stack content above the squiggle — GlowBackground's internal `z-10` handles stacking
3. Bump `GLOW_CONFIG` default opacity values in `GlowBackground.tsx`: center 0.15 -> 0.25, left 0.12 -> 0.22, right 0.12 -> 0.22, split primary 0.14 -> 0.24, split secondary 0.08 -> 0.18
4. No functional changes to any tab — visuals only
5. The `BackgroundSquiggle.tsx` component file is NOT deleted (still used by `AskPage.tsx`)

### Non-Functional Requirements

- Performance: No measurable change (removing DOM nodes is a net win)
- Accessibility: No changes to accessibility behavior

## Auth Gating

N/A — This is a visual-only change. No interactive elements are added or modified. Existing auth gating on all three tabs is unchanged.

## Responsive Behavior

| Breakpoint | Impact |
|-----------|--------|
| Mobile (< 640px) | Squiggle removal simplifies DOM; glow orbs continue to scale via existing responsive size classes (300px mobile, 500-600px desktop) |
| Tablet (640-1024px) | No change |
| Desktop (> 1024px) | No change |

No responsive regressions expected. The squiggle was purely decorative and the `relative` wrappers didn't affect layout. Content containers (`mx-auto max-w-2xl px-4 py-10 sm:py-14`) remain unchanged.

## AI Safety Considerations

N/A — This feature does not involve AI-generated content or free-text user input. No crisis detection required.

## Auth & Persistence

N/A — No data persistence changes. No localStorage keys added or modified.

## Completion & Navigation

N/A — No changes to Daily Hub completion tracking or navigation.

## Design Notes

- **GlowBackground** (from `components/homepage/GlowBackground.tsx`) handles all atmospheric depth via glow orbs. Variants: `center` (Pray, Journal, Devotional), `split` (Meditate), `left` (SongPickSection).
- The design system recon (`_plans/recon/design-system.md`, captured 2026-04-05) documents that **every live call site passes `glowOpacity={0.30}`**, overriding the `GLOW_CONFIG` defaults. The default opacity bump (Change 4) aligns the code defaults with the design system's 0.25-0.50 range but does NOT change what users see today — all rendered orbs remain at 0.30 via the prop override. This is still worth doing: it makes the defaults sensible for any future call site that omits the prop.
- After removal, the three tabs match the Devotional tab pattern: `GlowBackground` wrapping content directly with no squiggle layer (Devotional never had squiggles — see `09-design-system.md` component inventory).
- **FrostedCard**, **SectionHeading**, and **GRADIENT_TEXT_STYLE** patterns are unaffected.

## Out of Scope

- Deleting `BackgroundSquiggle.tsx` component file (still used by `AskPage.tsx`)
- Changing the `glowOpacity={0.30}` prop passed by call sites — that's a separate visual tuning decision
- Removing squiggle from `AskPage.tsx` (separate scope)
- Any functional changes to tab behavior, completion tracking, or data persistence

## Acceptance Criteria

- [ ] `BackgroundSquiggle` and `SQUIGGLE_MASK_STYLE` imports removed from `PrayTabContent.tsx`
- [ ] `BackgroundSquiggle` and `SQUIGGLE_MASK_STYLE` imports removed from `JournalTabContent.tsx`
- [ ] `BackgroundSquiggle` and `SQUIGGLE_MASK_STYLE` imports removed from `MeditateTabContent.tsx`
- [ ] Squiggle decorative div (the `aria-hidden` div with `opacity-[0.12]` and `SQUIGGLE_MASK_STYLE`) removed from all three tab files
- [ ] Nested `<div className="relative">` wrapper pairs removed from all three tab files (content flattened under the `mx-auto max-w-2xl` container)
- [ ] `GLOW_CONFIG` opacities bumped: center 0.15 -> 0.25, left 0.12 -> 0.22, right 0.12 -> 0.22, split primary 0.14 -> 0.24, split secondary 0.08 -> 0.18
- [ ] Grep confirms zero `BackgroundSquiggle` or `SQUIGGLE_MASK_STYLE` references in the three tab files
- [ ] `BackgroundSquiggle.tsx` component file still exists (not deleted)
- [ ] No content regressions on any Daily Hub tab (Pray, Journal, Meditate, Devotional)
- [ ] All existing tests pass
- [ ] Visual verification: Pray tab at 1440px shows no squiggle pattern, purple glow orb visible, content renders cleanly
- [ ] Visual verification: Journal tab at 1440px shows same clean appearance
- [ ] Visual verification: Meditate tab at 1440px shows split-variant glow orbs, no squiggle, cards render cleanly
- [ ] Visual verification: Mobile 375px on all three tabs shows glow orbs scale correctly and content is readable
