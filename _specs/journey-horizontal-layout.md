# HP-8b: Journey Section Horizontal Layout + Glow Fix

**Master Plan Reference:** N/A — standalone iteration on existing JourneySection component.

---

## Overview

The "Your Journey to Healing" section guides visitors through Worship Room's seven-step path to emotional and spiritual restoration. This iteration restructures the section from a vertical numbered list into a compact horizontal layout, removes descriptions and squiggles, replaces the Caveat script font with the hero-style gradient font, and fixes the glow background to be actually visible. The result is a cleaner, more scannable section that invites exploration without overwhelming first-time visitors.

## User Story

As a **logged-out visitor**, I want to see Worship Room's seven healing steps displayed as a clean horizontal row with clickable links so that I can quickly understand the journey and jump directly into any step that resonates with me.

## Requirements

### Functional Requirements

1. Display 7 journey steps in a horizontal wrapping row (replaces vertical timeline)
2. Each step shows: numbered circle, white prefix text, gradient keyword text
3. Each step is a clickable link navigating to its feature route
4. Step descriptions (paragraph text) are removed entirely
5. Vertical connecting line between circles is removed
6. `BackgroundSquiggle` is removed from this component
7. Caveat/script font is replaced with `WHITE_PURPLE_GRADIENT` text treatment on keywords
8. Section heading uses `SectionHeading` component (which already applies full gradient to the heading text)
9. Two visible glow orbs provide atmospheric purple light behind the content
10. Scroll reveal with staggered left-to-right appearance

### Step Data

| # | Prefix | Keyword | Route |
|---|--------|---------|-------|
| 1 | Read a | Devotional | `/daily?tab=devotional` |
| 2 | Learn to | Pray | `/daily?tab=pray` |
| 3 | Learn to | Journal | `/daily?tab=journal` |
| 4 | Learn to | Meditate | `/daily?tab=meditate` |
| 5 | Listen to | Music | `/music` |
| 6 | Write on the | Prayer Wall | `/prayer-wall` |
| 7 | Find | Local Support | `/local-support/churches` |

### Non-Functional Requirements

- Performance: No new dependencies, no additional network requests
- Accessibility: All links keyboard accessible with visible focus indicators, 44px minimum touch targets on mobile, `prefers-reduced-motion` respected for scroll reveal animations

## Auth Gating

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| Click any step link | Navigates to route (all 7 routes are public) | Navigates to route | N/A — no auth gate |

All step destinations are publicly accessible routes. No auth gating is needed on this section.

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | Steps wrap into 3 rows (e.g., 3+3+1 or 3+2+2), centered via `justify-center` |
| Tablet (640-1024px) | Steps wrap into 2 rows (4 on top, 3 on bottom), centered |
| Desktop (> 1024px) | All 7 steps in a single horizontal row |

- Each step has a fixed width (`w-[100px]` mobile, `w-[120px]` sm+) to keep items uniform
- Partial rows are centered, not left-aligned
- Gap increases with breakpoint: `gap-6` / `gap-8` / `gap-10`

## AI Safety Considerations

N/A — This section contains no user input, no AI-generated content, and no free-text fields. No crisis detection required.

## Auth & Persistence

- **Logged-out users:** Can view and click all steps (no persistence needed)
- **Logged-in users:** Same behavior (no persistence needed)
- **localStorage usage:** None

## Completion & Navigation

N/A — standalone landing page section.

## Design Notes

### Individual Step Design

Each step is a centered vertical stack inside a `<Link>`:

1. **Numbered circle** — `w-10 h-10 rounded-full`, `bg-purple-500/20`, `border border-purple-400/40`, `text-white text-sm font-semibold`, `shadow-[0_0_20px_rgba(139,92,246,0.25)]`
2. **White prefix text** — `text-white/80 text-sm font-medium leading-tight`
3. **Gradient keyword text** — Apply `WHITE_PURPLE_GRADIENT` via `background-clip: text` and `text-transparent`, `text-lg sm:text-xl font-bold leading-tight`

### Hover States

On hover of any step item:
- Circle glow intensifies: `shadow-[0_0_30px_rgba(139,92,246,0.4)]`
- White text shifts to full `text-white`
- Subtle lift: `translateY(-2px)`
- Transition: `transition-all duration-200`

### Glow Background (Critical Fix)

**Remove** any existing `GlowBackground` wrapper. Implement glow directly with two absolutely positioned radial gradient orbs:

- **Orb 1 (left, upper):** 500px diameter, `rgba(139, 92, 246, 0.15)` center to `transparent` at 70%, `blur(80px)`
- **Orb 2 (right, lower):** 400px diameter, `rgba(139, 92, 246, 0.12)` center to `transparent` at 70%, `blur(80px)`

Key requirement: opacity at `0.12-0.15` (NOT the old `0.03-0.06` which was invisible). The glow must be visually distinguishable from the plain background — a visitor should notice soft purple atmospheric light.

Glow orbs use `pointer-events-none` and sit behind content via z-index layering.

### Section Heading

Use `SectionHeading` component with:
- heading: "Your Journey to Healing"
- tagline: "From prayer to community, every step draws you closer to peace."
- align: `center`

`SectionHeading` already applies `GRADIENT_TEXT_STYLE` to the full heading, so "Healing" naturally gets gradient treatment along with the rest.

### Section Spacing

- Container: `max-w-5xl mx-auto px-4 sm:px-6`
- Vertical padding: `py-20 sm:py-28`
- Gap between heading and steps: `mt-12 sm:mt-16`

### Scroll Reveal

Use `useScrollReveal` with staggered delays:
- Each step: `staggerDelay` with `80ms` between items
- Steps animate from `opacity-0 translateY(8px)` to `opacity-1 translateY(0)`
- Heading reveals first, steps follow 200ms later
- Respects `prefers-reduced-motion`

### BackgroundSquiggle Cleanup

After removing `BackgroundSquiggle` from JourneySection, check if any other component still imports it. If no other consumers remain, delete the file.

## Out of Scope

- Changes to other homepage sections (HeroSection, GrowthTeasersSection, StartingPointQuiz)
- Adding new routes or new step content
- Mobile drawer or navbar changes
- Backend API work (Phase 3+)
- Light mode styling (Phase 4)

## Acceptance Criteria

- [ ] JourneySection displays 7 steps in a horizontal wrapping layout (single row on desktop, wrapping on tablet/mobile)
- [ ] Partial rows are centered via `justify-center` (not left-aligned)
- [ ] All step descriptions (paragraph text) are removed
- [ ] Each step shows: numbered circle (top) -> white prefix text (middle) -> gradient keyword text (bottom)
- [ ] Gradient keyword text uses `WHITE_PURPLE_GRADIENT` via `background-clip: text` (NOT Caveat font)
- [ ] Section heading "Your Journey to Healing" renders with gradient text via `SectionHeading` component
- [ ] Tagline reads "From prayer to community, every step draws you closer to peace."
- [ ] Each step is wrapped in a `<Link>` to its correct feature route
- [ ] All 7 links navigate correctly: `/daily?tab=devotional`, `/daily?tab=pray`, `/daily?tab=journal`, `/daily?tab=meditate`, `/music`, `/prayer-wall`, `/local-support/churches`
- [ ] Hover effect: circle glow intensifies, white text brightens, subtle vertical lift
- [ ] `BackgroundSquiggle` import and usage removed from JourneySection
- [ ] Vertical connecting line between circles removed
- [ ] Two glow orbs are VISIBLE with opacity at `0.12-0.15` (not the old invisible `0.03-0.06`)
- [ ] Glow orbs use `pointer-events-none` and do not block clicks
- [ ] Scroll reveal staggers steps left-to-right with 80ms delay between items
- [ ] All animations respect `prefers-reduced-motion`
- [ ] Container uses `max-w-5xl` for wider horizontal layout
- [ ] Mobile (< 640px): steps wrap into centered rows with `gap-6`
- [ ] Desktop (> 1024px): all 7 steps in a single row with `gap-10`
- [ ] All links are keyboard accessible with visible focus indicators
- [ ] Build passes with 0 errors
- [ ] All existing tests pass (JourneySection tests updated for new layout)
- [ ] Committed on `homepage-redesign` branch
