# Feature: Dashboard Entrance & Progress Animations

**Master Plan Reference:** `dashboard-growth-spec-plan-v2.md`
- Shared data models: See "localStorage Key Summary" section — this spec reads `wr_faith_points`, `wr_streak`, `wr_daily_activities`, `wr_mood_entries`
- Cross-spec dependencies: This is a visual polish enhancement that touches components from Specs 2 (DashboardHero, DashboardWidgetGrid), 3 (MoodChart), 5 (StreakCard, faith points), 6 (ActivityChecklist), and 16 (GettingStartedCard)
- Shared constants: `LEVEL_THRESHOLDS` from Spec 5, `ACTIVITY_POINTS` from Spec 5

---

## Overview

The Dashboard currently renders all widgets simultaneously when the user transitions from mood check-in to the full dashboard view. This feature adds two layers of visual polish that make the dashboard feel alive and intentional: (1) staggered entrance animations where each widget card fades in and slides up in sequence, creating a cascade effect that draws the user's eye through the layout, and (2) animated progress bar fills on the faith points bar that provide satisfying visual feedback when points are earned or lost.

These animations serve the app's mission of emotional healing by making the daily dashboard arrival feel like a welcoming experience rather than a static data dump. The stagger effect creates a sense of the app "waking up" for the user, while the progress bar animation provides tangible feedback that their spiritual practices are accumulating into growth. Both respect `prefers-reduced-motion` for accessibility.

---

## User Stories

As a **logged-in user arriving at the dashboard** (after mood check-in or on return visit), I want to see the widget cards appear one by one in a gentle cascade so that the dashboard feels alive and intentionally designed rather than a wall of information appearing all at once.

As a **logged-in user earning faith points** from completing an activity, I want to see the progress bar smoothly fill to its new level so that I feel a tangible sense of progress and accomplishment.

As a **logged-in user who repairs a broken streak** (spending faith points), I want to see the progress bar animate backward to reflect the cost so that the trade-off feels real and meaningful.

As a **user who prefers reduced motion**, I want all widgets to appear instantly and all progress changes to apply without animation so that my accessibility preferences are fully respected.

---

## Requirements

### Part 1: Staggered Widget Entrance Animation

#### 1.1 Animation Specification

When the dashboard renders its full widget grid (Phase 3 of the dashboard state machine: `dashboard` phase), each widget card fades in and slides up with a staggered delay:

- **Start state**: Each widget card begins at `opacity: 0` and `translateY(12px)`
- **End state**: Each widget card arrives at `opacity: 1` and `translateY(0)`
- **Duration**: 400ms per card
- **Timing function**: `ease-out`
- **Stagger delay**: 100ms between each card
- **Implementation**: CSS keyframe animation with Tailwind's `motion-safe:` prefix. Each card wrapper receives an inline `style={{ animationDelay: '{N * 100}ms' }}` for its stagger position. The animation uses `animation-fill-mode: both` so cards remain invisible until their delay elapses.

#### 1.2 Stagger Order

Cards animate in visual reading order (top to bottom, left to right):

1. **DashboardHero** — delay: 0ms (first to appear)
2. **GettingStartedCard** (if present) — delay: 100ms (sits above the widget grid when visible)
3. **MoodChart** — delay: 200ms (or 100ms if GettingStartedCard is absent)
4. **StreakCard** — delay: 300ms (or 200ms if GettingStartedCard is absent)
5. **ActivityChecklist** — delay: 400ms (or 300ms if GettingStartedCard is absent)
6. **FriendsPreview** — delay: 500ms (or 400ms if GettingStartedCard is absent)
7. **WeeklyRecap** — delay: 600ms (or 500ms if GettingStartedCard is absent)
8. **QuickActions** — delay: 700ms (or 600ms if GettingStartedCard is absent)

The delay values shift dynamically based on whether GettingStartedCard is rendered. Each card's delay is simply `index * 100ms` where `index` is its position in the rendered order.

#### 1.3 One-Time Play Behavior

The stagger animation plays only on the initial dashboard render within a session — NOT on:
- Re-renders caused by state updates (activity completion, point changes)
- Navigating away from the dashboard and returning (via browser back, navbar links, etc.)
- Tab switches within the app

Track whether the entrance animation has played via a `useRef` flag. Once the animation plays, the flag is set to `true` and subsequent renders skip the animation entirely (all cards render at full opacity with no animation class). The ref resets only on full page reload.

#### 1.4 Existing Pattern Reference

Use the same Intersection Observer + stagger approach already implemented in the landing page's JourneySection component (120ms delay per step in that implementation). The dashboard version uses 100ms delay per card. The existing `useInView()` hook already respects `prefers-reduced-motion` and can be leveraged for the initial visibility trigger.

The existing `fade-in` keyframe in the Tailwind config (500ms, opacity + translateY slide up) is close but uses 500ms duration and a potentially different translateY distance. A new keyframe `widget-enter` should be defined with the exact values: 400ms, translateY from 12px to 0, opacity 0 to 1. Alternatively, if the existing `fade-in` keyframe matches these values closely enough, reuse it and adjust only the duration via the animation utility class.

### Part 2: Faith Points Progress Bar Animation

#### 2.1 Animated Width Transition

When faith points change (new points earned from completing an activity, or points deducted from streak repair), the progress bar's width animates smoothly from its previous percentage to its new percentage:

- **Duration**: 600ms
- **Timing function**: `ease-out`
- **Implementation**: CSS `transition` on the `width` property (`transition-all duration-600 ease-out`). No JavaScript animation — the browser handles the interpolation when the width percentage style value changes.
- **Applies to**: Both the DashboardHero progress bar and the StreakCard progress bar

#### 2.2 Glow Effect During Transition

During the progress bar animation, a subtle glow effect appears:

- **Glow style**: `box-shadow: 0 0 8px rgba(139, 92, 246, 0.4)` — a soft violet glow matching the primary-light color
- **Implementation**: A CSS class (e.g., `progress-glow`) is temporarily added to the progress bar element when the width changes. The class is removed after 600ms via a `setTimeout`, causing the glow to disappear after the transition completes.
- **The glow class includes its own transition**: `transition: box-shadow 300ms ease-out` so the glow fades smoothly rather than disappearing abruptly when the class is removed
- **No glow on initial render**: The glow only activates when points change AFTER the initial render. Use a ref to track whether this is the first render.

#### 2.3 AnimatedCounter Integration in DashboardHero

The DashboardHero already uses the `AnimatedCounter` component for the faith points number display. This spec ensures:

- The `AnimatedCounter` receives the correct `from` (previous points) and `to` (current points) values whenever faith points change from ANY activity — not just mood check-in
- The existing `useRef` pattern in DashboardHero that tracks previous points is working correctly for all point change triggers (activity completion, streak repair, etc.)
- The counter animation duration should be coordinated with the progress bar animation (both ~600ms) so the number and bar reach their new values at approximately the same time

#### 2.4 Direction-Aware Feedback

- **Points increasing** (activity completion): Progress bar fills forward, glow is violet (`rgba(139, 92, 246, 0.4)`)
- **Points decreasing** (streak repair cost): Progress bar shrinks backward, glow is a warm amber (`rgba(217, 119, 6, 0.3)`) to signal a cost — subtle but distinct from the positive glow

### Part 3: Reduced Motion Behavior

All animations in this spec respect `prefers-reduced-motion: reduce`:

- **Stagger entrance**: All widget cards appear instantly at full opacity with no animation, no delay, and no translateY offset. The `motion-safe:` Tailwind prefix ensures the animation class only applies when reduced motion is NOT requested.
- **Progress bar width change**: The width still updates to the new value but transitions instantly (no 600ms animation). Apply the CSS transition only within a `@media (prefers-reduced-motion: no-preference)` context or via Tailwind's `motion-safe:` prefix.
- **Progress bar glow**: No glow effect is shown. The glow class is never added.
- **AnimatedCounter**: The existing component already respects reduced motion (via `useReducedMotion()` hook) and shows the final value instantly.

---

## UX & Design Notes

- **Tone**: The stagger animation should feel gentle and welcoming — like the dashboard unfurling for the user, not a flashy reveal. The 100ms delay keeps it brisk; a longer delay would feel sluggish.
- **Colors**: Progress bar glow uses `primary-lt` (`#8B5CF6` / `rgba(139, 92, 246, 0.4)`) for positive changes and `#D97706` (`rgba(217, 119, 6, 0.3)`) for streak repair cost. These match the existing design system mood and accent colors.
- **Typography**: No typography changes — this is purely motion/animation work.
- **Dashboard Card Pattern**: Frosted glass cards (`bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`) — the animation is applied to the card wrapper, not the card content. The card's visual style is unchanged.

### Responsive Behavior

- **Mobile (< 640px)**: Cards stack in a single column. The stagger order follows the vertical stack order (same sequence as listed above). Animation values are identical — no reduced motion or timing changes for mobile.
- **Tablet (640px-1024px)**: Mixed layout (some cards full-width, some in 2-column grid). Stagger order follows DOM order, which matches visual order top-to-bottom, left-to-right.
- **Desktop (> 1024px)**: 2-column grid layout. DashboardHero spans full width (first). GettingStartedCard spans full width (second, if present). Remaining cards fill the 2-column grid. Stagger order follows DOM order.
- **All breakpoints**: Same animation duration (400ms), same stagger delay (100ms), same translateY (12px). No breakpoint-specific animation adjustments.
- **Progress bar**: The bar's width is percentage-based and already responsive. The animation and glow apply identically at all breakpoints.

---

## AI Safety Considerations

- **Crisis detection needed?**: No — this feature does not involve any user text input
- **User input involved?**: No
- **AI-generated content?**: No

This is a purely visual enhancement with no user input, no AI output, and no content changes.

---

## Auth & Persistence

- **Logged-out (demo mode)**: This feature is invisible to logged-out users. The dashboard is auth-gated; logged-out users see the landing page at `/`. No changes to the logged-out experience.
- **Logged-in**: All animations are purely visual and ephemeral — no data is written or read beyond what the existing dashboard components already access (`wr_faith_points`, `wr_streak`, `wr_daily_activities`)
- **Route type**: Protected (dashboard is auth-gated)
- **New localStorage keys**: None
- **New routes**: None

---

## Acceptance Criteria

### Stagger Entrance Animation

- [ ] On initial dashboard render (after mood check-in or skip), DashboardHero appears first with no delay, followed by each subsequent widget card fading in and sliding up with a 100ms stagger between each
- [ ] Each card animates from `opacity: 0, translateY(12px)` to `opacity: 1, translateY(0)` over 400ms with ease-out timing
- [ ] If GettingStartedCard is present, it animates second (100ms delay) and all subsequent cards shift their delays accordingly
- [ ] If GettingStartedCard is absent, MoodChart animates at 100ms delay (immediately after DashboardHero)
- [ ] The stagger animation plays only once per session — navigating away from the dashboard and returning does NOT replay the animation
- [ ] Re-renders from state changes (activity completion, point updates) do NOT replay the animation
- [ ] With `prefers-reduced-motion: reduce`, all cards appear instantly at full opacity with no animation and no delay
- [ ] Animation uses CSS keyframes and Tailwind's `motion-safe:` prefix — no JavaScript-driven animation (no `requestAnimationFrame` for the entrance)
- [ ] Cards use `animation-fill-mode: both` so they remain invisible until their delay elapses (no flash of content before animation starts)

### Progress Bar Animation

- [ ] When faith points increase (any activity completion), the progress bar width animates from its previous percentage to the new percentage over 600ms with ease-out timing
- [ ] When faith points decrease (streak repair), the progress bar width animates backward from its previous percentage to the new percentage over 600ms with ease-out timing
- [ ] During the forward animation, a soft violet glow (`box-shadow: 0 0 8px rgba(139, 92, 246, 0.4)`) appears on the progress bar and fades after the transition completes
- [ ] During the backward animation (streak repair), the glow is warm amber (`box-shadow: 0 0 8px rgba(217, 119, 6, 0.3)`) instead of violet
- [ ] The glow fades smoothly (not abruptly) when removed — the glow's own box-shadow has a CSS transition
- [ ] No glow appears on the initial render — only on subsequent point changes
- [ ] The progress bar animation applies to BOTH the DashboardHero progress bar and the StreakCard progress bar
- [ ] With `prefers-reduced-motion: reduce`, the progress bar width updates instantly with no transition and no glow

### AnimatedCounter Coordination

- [ ] The DashboardHero faith points counter animates from the previous point total to the new total whenever points change from any activity (not just mood check-in)
- [ ] The counter animation duration (~600ms) is coordinated with the progress bar animation so both reach their final values at approximately the same time
- [ ] With `prefers-reduced-motion: reduce`, the counter shows the final value instantly (existing behavior)

### Visual Verification Criteria

- [ ] The stagger cascade is visually perceptible at 1x speed — cards appear one after another, not all at once
- [ ] The total stagger duration (all cards visible) is under 1 second for a typical 7-card dashboard (hero + 6 widgets = ~600ms total cascade)
- [ ] The 12px translateY slide-up is subtle — cards don't "jump" or bounce, they float gently into place
- [ ] The progress bar glow is subtle and does not create visual noise — it's a soft ambient effect, not a flashy border
- [ ] The direction-aware glow color difference (violet for gain, amber for loss) is distinguishable

---

## Out of Scope

- **New routes**: No new pages or routes
- **New localStorage keys**: No new data persistence
- **Backend changes**: No API work
- **Other widget animations**: This spec covers only entrance stagger and progress bar fill. Individual widget micro-interactions (e.g., activity checklist check animation, badge unlock animation) are handled by their respective specs (Spec 6, Spec 8) or Spec 16 (Empty States & Polish)
- **Dashboard-to-check-in transition animation**: The transition FROM check-in TO dashboard (the `dashboard_enter` phase) is managed by the existing Dashboard state machine. This spec adds the stagger AFTER the dashboard content begins rendering, not the transition between phases.
- **Tab switch animations**: No animation when switching between dashboard and other pages via navbar
- **Scroll-triggered animations**: Cards animate on render, not on scroll into view. The dashboard is not long enough to warrant scroll-triggered effects.
- **Sound effects**: No audio feedback for the entrance or progress animations
