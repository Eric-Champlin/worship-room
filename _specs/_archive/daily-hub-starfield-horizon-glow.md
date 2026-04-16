# Daily Hub StarField + Horizon Glow Aesthetic

**Master Plan Reference:** N/A -- standalone feature

---

## Overview

The Daily Hub is the emotional center of Worship Room -- where users come to pray, journal, meditate, and encounter scripture daily. Right now it feels dark and flat, with per-section GlowBackground orbs creating visible "rectangles" at section boundaries. This spec replaces the per-section approach with a unified, GitHub.com-inspired atmosphere: a single root background with a scattered StarField layer and strategically positioned HorizonGlow spots that bridge section transitions seamlessly. The result transforms the Daily Hub from "dark page with floating purple blobs" into "looking out into space" -- a sanctuary that draws users deeper into worship.

## User Story

As a logged-in user or logged-out visitor, I want the Daily Hub to feel like a continuous, immersive space (not a stack of dark rectangles) so that switching between tabs and scrolling through content feels like moving through a sanctuary rather than navigating between disconnected sections.

## Requirements

### Functional Requirements

1. A StarField component renders ~110 small static white dots scattered across the entire Daily Hub page body, using hardcoded deterministic positions (no re-randomization on render)
2. A HorizonGlow component renders 5 large, soft purple/lavender glow spots positioned at strategic vertical percentages (hero, mid-body, lower body, song pick transitions) to bridge section boundaries
3. Both layers are mounted as direct children of the DailyHub root div, positioned absolutely behind all content (z-0), with content elevated to z-10
4. The DailyHub root div provides a single `bg-hero-bg` background for the entire page, with `relative overflow-hidden` to clip decorative layers at edges
5. All 4 tab content components (Devotional, Pray, Journal, Meditate) have their GlowBackground wrappers removed and replaced with plain divs (transparent backgrounds), allowing the root StarField and HorizonGlow to show through continuously
6. SongPickSection has its GlowBackground wrapper removed and replaced with a plain div
7. The hero section in DailyHub no longer uses a GlowBackground wrapper
8. The existing GlowBackground component (`src/components/homepage/GlowBackground.tsx`) is NOT modified -- homepage and all other pages continue to use it unchanged

### Non-Functional Requirements

- **Performance**: 110 absolutely-positioned divs (stars) + 5 blurred divs (glows) must not cause scroll jank. Target 60fps on the Daily Hub. Stars use deterministic positions to allow React to skip re-renders.
- **Accessibility**: StarField and HorizonGlow are decorative only -- `aria-hidden="true"` and `pointer-events-none`. No impact on accessibility tree. No new axe-core violations.

## Auth Gating

This is a purely visual/decorative change with no interactive elements.

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| View Daily Hub with StarField + HorizonGlow | Stars and glows visible, identical experience | Stars and glows visible, identical experience | N/A |

No auth gating required -- this is background decoration visible to all users.

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | Stars visible at same percentage positions (effectively denser on smaller viewport). Glow spots sized in pixels so they appear proportionally larger -- this is intentional and creates a more immersive atmosphere on mobile. No horizontal overflow due to `overflow-hidden` on root. |
| Tablet (640-1024px) | Stars and glows scale proportionally. No layout changes needed -- decorative layers are percentage-positioned (stars) and pixel-sized with blur (glows). |
| Desktop (> 1024px) | Full intended experience. Stars well-distributed, glows provide atmospheric depth at section transitions. |

Stars use percentage-based positioning (0-100% left/top) so they distribute naturally across all viewport sizes. Glows use pixel dimensions with large blur radii, making them appear softer and more proportional on larger screens. No elements stack, hide, or resize between breakpoints -- this is a background layer, not content.

## AI Safety Considerations

N/A -- This feature does not involve AI-generated content or free-text user input. No crisis detection required.

## Auth & Persistence

- **Logged-out users:** Stars and glows are purely decorative -- no data involved, zero persistence
- **Logged-in users:** Same -- no data involved, zero persistence
- **localStorage usage:** None

## Completion & Navigation

N/A -- This is a visual background layer, not a completable activity. It does not interact with the Daily Hub completion tracking system.

## Design Notes

- **Root background**: `bg-hero-bg` (#08051A) -- the darkest background color from the design system, already used by homepage and Daily Hub sections
- **StarField**: ~110 white dots (`bg-white`) with sizes 1-2px and opacities 0.3-0.55. Deterministic positions using a hardcoded array. No animation, no twinkling. `rounded-full` for circular shape.
- **HorizonGlow**: 5 glow spots using the project's purple palette:
  - Primary purple: `rgb(139, 92, 246)` (matches `primary-lt` #8B5CF6 family)
  - Light lavender: `rgb(186, 156, 255)`
  - Medium lavender: `rgb(168, 130, 255)`
  - Opacities range 0.18-0.25 with blur radii 100-120px
  - Positioned at strategic vertical percentages (5%, 15%, 35%, 60%, 85%) to bridge hero, tab content, and Song Pick transitions
  - Each glow anchored at center via `transform: translate(-50%, -50%)`
- **Layer stack (back to front)**: root `bg-hero-bg` -> StarField (z-0) -> HorizonGlow (z-0) -> Content (z-10)
- **Tab content components** become transparent -- they lose their individual GlowBackground wrappers but keep the same padding/max-width classes (`mx-auto max-w-2xl px-4 py-10 sm:py-14`)
- **BackgroundSquiggle layers** in Pray, Journal, and Meditate tabs are unaffected by this spec -- they sit behind the content within each tab and should continue to render
- **Existing components referenced**: `GlowBackground` (keep for homepage, remove from Daily Hub), `FrostedCard` (unaffected), `SectionHeading` (unaffected), `SongPickSection` (remove GlowBackground wrapper only), `GRADIENT_TEXT_STYLE` (unaffected)
- **New components**: `StarField` and `HorizonGlow` live in `src/components/daily/` to scope them explicitly to the Daily Hub
- The `glowOpacityMultiplier` prop on GlowBackground should be kept in place (not removed) even though Daily Hub no longer uses GlowBackground

## Out of Scope

- Twinkling/animated stars (static only in this spec)
- Applying StarField or HorizonGlow to any page other than Daily Hub
- Modifying GlowBackground.tsx in any way
- Responsive glow size reduction on mobile (pixel-sized glows are acceptable as-is)
- Per-tab readability overlays (if text readability is impacted by the new background, that's a follow-up spec)
- Homepage, Prayer Wall, Music, Bible Reader, or any other page changes
- Backend changes (none needed)

## Acceptance Criteria

- [ ] New file `src/components/daily/StarField.tsx` renders ~110 hardcoded star positions as small white dots
- [ ] New file `src/components/daily/HorizonGlow.tsx` renders 5 glow spots at vertical positions 5%, 15%, 35%, 60%, 85%
- [ ] Both components use `aria-hidden="true"` and `pointer-events-none`
- [ ] DailyHub root div has classes `relative min-h-screen overflow-hidden bg-hero-bg`
- [ ] StarField and HorizonGlow mounted as first children of the DailyHub root div (before all content)
- [ ] Hero section in DailyHub is NOT wrapped in GlowBackground (unwrapped to plain content with `relative z-10`)
- [ ] Tab bar, tab content area, and Song Pick section all have `relative z-10` to sit above background layers
- [ ] DevotionalTabContent no longer uses GlowBackground -- replaced with a plain `<div>` keeping the same padding/max-width
- [ ] PrayTabContent no longer uses GlowBackground -- replaced with a plain `<div>` keeping the same padding/max-width
- [ ] JournalTabContent no longer uses GlowBackground -- replaced with a plain `<div>` keeping the same padding/max-width
- [ ] MeditateTabContent no longer uses GlowBackground -- replaced with a plain `<div>` keeping the same padding/max-width
- [ ] SongPickSection no longer uses GlowBackground -- replaced with a plain `<div>` keeping the same padding/max-width
- [ ] GlowBackground import removed from all 5 files above (DevotionalTabContent, PrayTabContent, JournalTabContent, MeditateTabContent, SongPickSection) plus DailyHub if it was imported there
- [ ] `GlowBackground.tsx` is completely UNTOUCHED (file unchanged, still used by homepage)
- [ ] Homepage (`/`) has NO stars, NO horizon glows -- visually identical to before this change
- [ ] Prayer Wall, Music, Local Support, Bible Reader pages are all visually unchanged
- [ ] StarField visible on Daily Hub at 375px, 768px, and 1440px widths -- dots distributed across the page
- [ ] HorizonGlow visible on Daily Hub at all breakpoints -- purple/lavender soft glows at multiple vertical positions
- [ ] No visible section cutoffs -- stars and glows flow continuously from hero through tab content through Song Pick
- [ ] Content (greeting text, tab bar, tab content, Song Pick embed) remains fully readable above the background layers
- [ ] No horizontal scrollbar caused by stars or glows near edges (`overflow-hidden` clipping works)
- [ ] No new axe-core accessibility violations on the Daily Hub
- [ ] Smooth 60fps scrolling on the Daily Hub (no jank from 110 star divs or 5 blurred glow divs)
