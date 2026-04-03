# HP-15: Dramatic GitHub-Quality Glow — Purple Spotlights

**Master Plan Reference:** N/A — standalone homepage visual enhancement

---

## Overview

The homepage should feel like a sanctuary — atmospheric, alive, and immersive. Currently, the glow effects behind homepage sections are barely perceptible (0.03-0.15 opacity). This spec dramatically increases glow intensity to match GitHub's homepage treatment: bright purple spotlights (0.25-0.50 center opacity) positioned directly behind card groups and key sections, with two-stop radial gradients for stronger visual pools.

## User Story

As a visitor landing on the homepage, I want to see dramatic purple atmospheric lighting behind each section so that the page feels cinematic, alive, and emotionally inviting rather than flat.

## Requirements

### Functional Requirements

1. **JourneySection** has 2 glow orbs — one behind steps 1-3 (0.25 center, 500px) and one behind steps 5-7 (0.20 center, 400px), both center-column aligned
2. **StatsBar** has a single horizontal elliptical glow (0.30 center, 700×300px) centered behind the stat numbers
3. **DashboardPreview** has the most dramatic treatment: primary glow (0.40 center, 900×600px) + secondary offset glow (0.25 center, lighter violet, 400px, offset right) — this should match GitHub homepage intensity
4. **DifferentiatorSection** has split left/right glows — left (0.35 center, 600×500px) and right (0.25 center, lighter violet, 500px)
5. **StartingPointQuiz** has a focused glow (0.35 center, 700×500px) centered behind the frosted glass quiz container
6. **FinalCTA** has the strongest glow on the entire page (0.50 center, 800×600px) — the emotional climax
7. All glow orbs use the **two-stop radial gradient** pattern: `radial-gradient(circle, rgba(..., CENTER) 0%, rgba(..., MID) 40%, transparent 70%)` — not single-stop
8. All glow orbs use `pointer-events-none` and sit behind content (z-index layering: glow at z-0, content at z-10)
9. DashboardPreview and FinalCTA use three-stop gradients for even more dramatic falloff (center → 35% → 55% → 70%)

### Non-Functional Requirements

- **Performance (mobile):** Below `md` breakpoint, reduce orb dimensions by 40% and blur by 25%. A 900px orb becomes 540px; 60px blur becomes 45px. Opacity stays the same — smaller size naturally reduces visual footprint.
- **No scroll jank:** If large blurred elements cause scroll issues on mobile, add `will-change: transform` to promote glow orbs to their own compositing layer.
- **Accessibility:** Glow orbs are purely decorative — all must have `aria-hidden="true"`. No impact on screen readers or keyboard navigation.

## Auth Gating

N/A — This is a purely visual enhancement to the landing page. No interactive elements, no user actions, no auth gating needed. All glows are decorative background elements visible to everyone.

## Responsive Behavior

| Breakpoint | Behavior |
|-----------|----------|
| Mobile (< 768px) | Glow orbs scaled down by 40% in dimensions, blur reduced by 25%. Opacity unchanged. |
| Tablet (768-1024px) | Full-size glow orbs (same as desktop) |
| Desktop (> 1024px) | Full-size glow orbs as specified per section |

Implementation approach: Use responsive Tailwind classes on each orb (e.g., `w-[360px] md:w-[600px]`) or a CSS media query with `transform: scale(0.6)`.

## AI Safety Considerations

N/A — This feature does not involve AI-generated content or free-text user input. No crisis detection required.

## Auth & Persistence

N/A — Purely decorative CSS. No data persistence, no localStorage, no user state.

## Completion & Navigation

N/A — Standalone visual enhancement.

## Design Notes

- **Color values:** Primary glow uses `rgba(139, 92, 246, ...)` (matches `primary-lt` / `#8B5CF6`). Secondary/offset glows use lighter violet `rgba(168, 130, 255, ...)`
- **Background context:** Homepage background is `#08051A` (near-black). Current 0.12-0.15 opacity values are invisible against this dark background — the spec's 0.25-0.50 values are calibrated specifically for this contrast ratio
- **Existing component:** `GlowBackground.tsx` currently uses single-stop gradients at 0.08-0.15 opacity with a config-driven variant system. The updated implementation should either overhaul the variant values OR inline custom glows per section for sections needing multi-orb or non-standard sizing (DashboardPreview, DifferentiatorSection, FinalCTA)
- **Blur values:** Current `GlowBackground` uses `blur-[60px] md:blur-[80px]`. New spec values use 60-80px blur per orb — generally consistent, but section-specific
- **`animate-glow-float`:** The existing subtle float animation on orbs should be preserved
- **Reference target:** The DashboardPreview glow intensity should be visually comparable to GitHub's homepage purple spotlight behind their workflow card sections

## Section-by-Section Glow Specifications

### 1. JourneySection

| Orb | Center Opacity | Mid Opacity | Size | Blur | Position |
|-----|---------------|-------------|------|------|----------|
| Upper (steps 1-3) | 0.25 | 0.10 at 40% | 500×500px | 70px | top 15%, center | 
| Lower (steps 5-7) | 0.20 | 0.08 at 40% | 400×400px | 70px | bottom 15%, center |

### 2. StatsBar

| Orb | Center Opacity | Mid Opacity | Size | Blur | Position |
|-----|---------------|-------------|------|------|----------|
| Elliptical | 0.30 | 0.12 at 40% | 700×300px | 60px | centered (50%/50%) |

### 3. DashboardPreview

| Orb | Center Opacity | Gradient Stops | Size | Blur | Position |
|-----|---------------|----------------|------|------|----------|
| Primary | 0.40 | 0.15 at 35%, 0.05 at 55%, transparent 70% | 900×600px | 60px | top 40%, center |
| Secondary | 0.25 (lighter violet) | transparent 70% | 400×400px | 80px | top 30%, right 5% |

### 4. DifferentiatorSection

| Orb | Center Opacity | Mid Opacity | Size | Blur | Position |
|-----|---------------|-------------|------|------|----------|
| Left | 0.35 | 0.12 at 40% | 600×500px | 70px | top 35%, left 15% |
| Right | 0.25 (lighter violet) | 0.08 at 40% | 500×500px | 70px | top 45%, right 15% |

### 5. StartingPointQuiz

| Orb | Center Opacity | Mid Opacity | Size | Blur | Position |
|-----|---------------|-------------|------|------|----------|
| Center | 0.35 | 0.12 at 40% | 700×500px | 60px | top 45%, center |

### 6. FinalCTA

| Orb | Center Opacity | Gradient Stops | Size | Blur | Position |
|-----|---------------|----------------|------|------|----------|
| Primary | 0.50 | 0.20 at 35%, 0.05 at 55%, transparent 70% | 800×600px | 60px | centered (50%/50%) |

## Implementation Approach

The implementer should choose the cleanest approach:

- **Option A:** Update `GlowBackground.tsx` variant values for sections that fit the config system (JourneySection, StatsBar, StartingPointQuiz). Add new variants or extend existing ones for multi-orb/custom-size sections.
- **Option B:** Inline glow orbs directly in section components for sections needing custom multi-orb setups (DashboardPreview, DifferentiatorSection, FinalCTA).
- **Option C:** Add a `custom` variant to `GlowBackground` that accepts children glow orbs via render prop, giving flexibility while keeping the wrapper.

The implementer should choose whichever approach results in the cleanest, most maintainable code.

## Out of Scope

- Hero section glow (hero has its own gradient treatment)
- Animated glow effects beyond the existing `animate-glow-float`
- Color temperature variations per section (all use the same purple family)
- User preference for glow intensity
- Backend changes
- New components (this modifies existing components only)

## Acceptance Criteria

- [ ] JourneySection has 2 clearly visible glow orbs — one behind upper steps, one behind lower steps
- [ ] StatsBar has a horizontal elliptical glow (wider than tall) behind the stat numbers
- [ ] DashboardPreview has a DRAMATIC primary glow (0.40 center opacity) plus a secondary offset glow — this should be the most visually striking glow on the page after FinalCTA
- [ ] DifferentiatorSection has two distinct glow pools — one left-positioned, one right-positioned
- [ ] StartingPointQuiz has a focused glow visible through/behind the frosted glass container
- [ ] FinalCTA has the strongest glow on the entire page (0.50 center opacity) — unmistakably bright
- [ ] Every glow orb uses the two-stop (or three-stop) radial gradient pattern, NOT single-stop
- [ ] All glow orbs have `pointer-events-none` and `aria-hidden="true"`
- [ ] Content sits above glows (z-index layering correct)
- [ ] Mobile (< 768px): glow orb dimensions reduced by ~40%, blur reduced by ~25%
- [ ] No scroll jank on mobile (Chrome DevTools mobile emulation test)
- [ ] Glow intensity on DashboardPreview is visually comparable to GitHub's homepage purple spotlight treatment
- [ ] Build passes with 0 errors
- [ ] All existing tests pass
- [ ] Committed on `homepage-redesign` branch

### Visual Verification Checklist (MANDATORY)

After implementation, each answer must be YES:

1. **JourneySection:** Can I clearly see purple atmospheric light behind the steps?
2. **StatsBar:** Can I see a purple glow shelf behind the stat numbers?
3. **DashboardPreview:** Is there a DRAMATIC purple spotlight behind the card grid?
4. **DifferentiatorSection:** Can I see two distinct glow pools behind the card grid?
5. **StartingPointQuiz:** Is there a visible purple glow behind the frosted glass container?
6. **FinalCTA:** Is this the BRIGHTEST glow on the page — a prominent purple wash?

If any answer is NO, increase center opacity by 0.10 increments until clearly visible.
