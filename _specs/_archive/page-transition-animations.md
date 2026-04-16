# Feature: Page Transition Animations

**Master Plan Reference:** N/A — standalone visual polish feature

---

## Overview

Worship Room currently swaps pages, lists, and modals with instant mount/unmount transitions that feel clinical rather than warm. This feature adds smooth, layered motion throughout the app — route transitions, staggered list entrances, spring-like modals/drawers, tab content fades, polished toasts, interaction feedback pulses, and skeleton-to-content crossfades. Together these create a cohesive motion language that makes the app feel intentional and alive, supporting the emotional healing mission by ensuring every interaction feels gentle and considered. All animations respect `prefers-reduced-motion` — when that preference is set, zero animation plays.

---

## User Stories

As a **logged-out visitor or logged-in user**, I want page navigation to feel smooth and intentional so that moving through the app feels like a continuous experience rather than a series of abrupt swaps.

As a **logged-out visitor or logged-in user** browsing lists (Prayer Wall, Bible books, reading plans, search results), I want items to cascade in with a staggered entrance so that the content feels alive and my eye is naturally drawn through the layout.

As a **user opening a modal or drawer**, I want the overlay to spring open with a subtle bounce and close quickly so that the interaction feels responsive and polished.

As a **user who prefers reduced motion**, I want all animations disabled entirely — instant rendering with no transitions — so that my accessibility preferences are fully respected.

---

## Requirements

### 1. Route Transition (PageTransition wrapper)

1. When the route changes, the outgoing page fades out (opacity 1 to 0 over 150ms) and the incoming page fades in (opacity 0 to 1 over 200ms) with a gentle upward lift (translateY 8px to 0)
2. Total round-trip is ~350ms — fast enough to feel snappy, present enough to eliminate jarring swaps
3. Implemented as a shared `PageTransition` wrapper component that wraps the route outlet
4. Detects route changes via `useLocation`, applies exit CSS classes, waits for exit duration, then applies enter CSS classes
5. Uses pure CSS transitions — no React Transition Group, no Framer Motion, no animation libraries
6. On `prefers-reduced-motion`, the page renders instantly with no animation (opacity stays 1, no translateY)

### 2. Staggered List Entrances (StaggeredList component or useStaggeredEntrance hook)

A shared component/hook that accepts children and a delay interval. Each child receives an increasing `animation-delay` style and a CSS class for the fade+slide keyframe (`opacity: 0, translateY(8px)` to `opacity: 1, translateY(0)` over 300ms ease-out).

Uses Intersection Observer so items only animate when they scroll into view — items in the viewport on page load animate immediately with their stagger, items below the fold animate when scrolled to. This prevents long lists from animating all at once on load.

**Target lists and their stagger intervals:**

| List | Stagger Delay | Location |
|------|--------------|----------|
| Prayer Wall prayer cards | 50ms | `/prayer-wall` feed |
| Bible book accordion items | 30ms | `/bible` testament section expand |
| Reading Plan cards | 80ms | `/grow?tab=plans` |
| Challenge cards | 80ms | `/grow?tab=challenges` |
| Bible search results | 50ms | `/bible` search results |
| Friend search results | 50ms | `/friends` search |
| Saved journal entries | 50ms | `/daily?tab=journal` saved entries list |
| Personal prayer list items | 50ms | `/my-prayers` list |
| Dashboard widget cards | 100ms | `/` dashboard (already implemented in Spec 9 — verify still works) |
| Leaderboard rows | 30ms | `/friends` leaderboard tab |

On `prefers-reduced-motion`, all items render instantly with no stagger or animation.

### 3. Modal & Drawer Spring Animations

**Modals** (auth modal, avatar picker, delete confirmation, report dialog, share panel):
- Open: `scale(0.95)` to `scale(1)` + opacity 0 to 1 over 250ms with `cubic-bezier(0.34, 1.56, 0.64, 1)` (slight overshoot spring feel)
- Close: `scale(1)` to `scale(0.98)` + opacity 1 to 0 over 150ms `ease-out` (faster close, no overshoot)
- Backdrop fades in/out independently (200ms ease)

**Drawers** (mobile nav drawer, AudioDrawer desktop side panel):
- Slide in: `translateX(100%)` to `translateX(0)` over 300ms `cubic-bezier(0.34, 1.2, 0.64, 1)` (slight overshoot spring)
- Slide out: `translateX(0)` to `translateX(100%)` over 200ms `ease-in`

**Bottom sheets** (AudioDrawer mobile):
- Slide up: `translateY(100%)` to `translateY(0)` over 300ms same spring timing
- Slide down: `translateY(0)` to `translateY(100%)` over 200ms `ease-in`

On `prefers-reduced-motion`, modals and drawers appear/disappear instantly (no scale, no slide, just instant show/hide).

### 4. Tab Content Fade

The Daily Hub already has an animated sliding underline on tab switch. Extend this underline pattern to:

- `/grow` tabs (Reading Plans | Challenges) — already has animated underline, verify behavior
- Friends tabs (Friends | Leaderboard)
- Prayer Wall profile tabs (Prayers | Replies | Reactions)
- Prayer Wall dashboard tabs (5 tabs)
- Settings tabs (mobile top tabs)

**Tab content transition:** When switching tabs, the incoming tab content fades in (opacity 0 to 1 over 200ms). Since tab content is always mounted but CSS-hidden (`hidden` attribute), the fade applies when the hidden state is removed. No translateX slide — just a gentle opacity fade so content doesn't pop in instantly.

On `prefers-reduced-motion`, tab switches are instant (no opacity animation, no underline transition).

### 5. Toast Entrance Animation Upgrade

**Standard toasts** (success, error, warning): Replace current slide-from-right with `scale(0.8)` to `scale(1)` + opacity 0 to 1 + `translateY(8px)` to `translateY(0)` over 300ms `cubic-bezier(0.34, 1.3, 0.64, 1)`. Enter from bottom-right corner with a slight bounce.

**Celebration toasts**: Keep existing slide-from-bottom/right pattern but add the spring timing function for bouncier feel.

**Toast exit** (all types): `scale(1)` to `scale(0.95)` + opacity 1 to 0 over 200ms `ease-out`.

On `prefers-reduced-motion`, toasts appear and disappear instantly.

### 6. Prayer Card Interaction Feedback

When a user taps "Pray for this" (and the ceremony animation plays), the prayer card itself responds with a brief `scale(1)` to `scale(1.005)` to `scale(1)` pulse over 300ms. This makes the card feel like it "received" the prayer.

Same subtle pulse when bookmarking a prayer or saving to prayer list.

On `prefers-reduced-motion`, no card pulse.

### 7. Skeleton-to-Content Transition

When content loads and replaces a skeleton/loading state, the content fades in (opacity 0 to 1 over 300ms) rather than instantly swapping. Applies to:
- Bible chapter content loading (the most visible loading moment currently)
- Any future API-loaded content in Phase 3

On `prefers-reduced-motion`, instant swap.

---

## Auth Gating

This feature is purely visual enhancement — it adds motion to existing UI elements. No new interactive elements are introduced. Auth behavior of all existing elements remains unchanged.

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| Route transitions | Transitions play on all route changes | Same | N/A |
| List stagger | Plays on all visible lists | Same, plus auth-gated lists (dashboard widgets, my-prayers, journal entries) | N/A |
| Modal/drawer spring | Plays on any modal/drawer that opens | Same | N/A |
| Tab content fade | Plays on all tab switches | Same | N/A |
| Toast animation | Plays on all toasts | Same | N/A |
| Prayer card pulse | Plays on "Pray for this" tap (available to logged-out users) | Same | N/A |
| Content fade-in | Plays on Bible chapter load | Same | N/A |

---

## Responsive Behavior

| Breakpoint | Behavior |
|-----------|----------|
| Mobile (< 640px) | All animations play with identical timing values. Drawers use bottom-sheet slide-up instead of side-panel slide. Mobile nav drawer uses translateX slide. Lists stagger in single-column layout. |
| Tablet (640-1024px) | Same animation timing. Lists may be in 2-column grids — stagger follows DOM order (top-to-bottom, left-to-right). |
| Desktop (> 1024px) | Same animation timing. AudioDrawer uses side panel (translateX) instead of bottom sheet (translateY). |

No breakpoint-specific timing adjustments — animation durations and easing curves are identical across all screen sizes. The only responsive difference is the direction of drawer animations (side vs bottom).

---

## AI Safety Considerations

N/A — This feature does not involve AI-generated content or free-text user input. No crisis detection required. All changes are purely visual motion enhancements to existing UI elements.

---

## Auth & Persistence

- **Logged-out users:** All animations play. No data persistence — animations are ephemeral visual effects.
- **Logged-in users:** All animations play. No new data persistence.
- **Route type:** Animations apply to both public and protected routes.
- **New localStorage keys:** None.

---

## Completion & Navigation

N/A — standalone visual polish feature. No completion tracking, no CTAs, no navigation changes.

---

## Design Notes

- **Implementation approach:** All animations use CSS keyframes defined in the Tailwind config or inline styles. No JavaScript-driven animation libraries. New CSS is minimal: 3-4 keyframes (`stagger-enter`, `modal-spring-in`, `modal-spring-out`, `content-fade-in`, `toast-spring-in`) plus timing adjustments on existing animations.
- **Existing animation infrastructure:** The Tailwind config already defines 27+ custom keyframes including `widget-enter`, `fade-in`, `slide-from-right`, `slide-from-bottom`, `celebration-spring`. The new keyframes should follow the same naming convention and registration pattern.
- **Existing hooks:** `useReducedMotion()` hook returns a boolean for the system preference. `useInView()` hook provides Intersection Observer with built-in reduced-motion support. Both should be leveraged rather than reimplemented.
- **Existing toast pattern:** Toast component currently uses `motion-safe:animate-slide-from-right` for standard toasts and `motion-safe:animate-slide-from-bottom` for celebrations. The upgrade replaces these animation classes.
- **Existing modal pattern:** AuthModal currently has no open/close animation — just instant show/hide with a backdrop. The upgrade adds spring scale animation.
- **Existing drawer patterns:** AudioDrawer already has a swipe-to-dismiss gesture with `translateY` animation (300ms ease-out). MobileDrawer in Navbar currently slides in without spring easing. The upgrade adds spring timing curves.
- **Existing tab pattern:** DailyHub and GrowPage both have animated underlines (200ms transform transition). The tab content itself currently has no fade — it swaps instantly via `hidden` attribute.
- **New shared components/hooks:** `PageTransition` (wrapper component), `StaggeredList` (wrapper component or `useStaggeredEntrance` hook). These go in `components/ui/` or `hooks/` directory.
- **Design system recon:** Reference `_plans/recon/design-system.md` for existing gradient, spacing, and component values. No new visual patterns beyond motion are introduced — all animations enhance existing components.
- **Spring timing curves:** The `cubic-bezier(0.34, 1.56, 0.64, 1)` for modals and `cubic-bezier(0.34, 1.2, 0.64, 1)` for drawers are industry-standard CSS spring approximations. The overshoot value (>1 in the second/fourth control point) creates the bounce feel.

---

## Out of Scope

- **No feature behavior changes:** All animations are purely visual enhancement. No user flows, data models, or business logic changes.
- **No new routes or pages.**
- **No new localStorage keys or data persistence.**
- **No backend/API changes.**
- **No JavaScript animation libraries:** No Framer Motion, no React Transition Group, no GSAP. CSS-only approach.
- **No dark mode changes:** Animations are color-agnostic and work with the existing dark theme.
- **Sound effects for transitions:** No audio feedback on page transitions or list entrances (sound effects are a separate feature concern).
- **Dashboard widget stagger reimplementation:** The existing Spec 9 dashboard stagger should be verified but not rewritten — only integrated with the new shared `StaggeredList` if beneficial.
- **Phase 3 API loading states:** The skeleton-to-content fade is applied to the Bible reader now. Broader API loading state transitions will be handled when Phase 3 API wiring is built.

---

## Acceptance Criteria

### Route Transition
- [ ] Navigating between any two routes shows a fade-out (150ms) then fade-in (200ms) with 8px upward lift on the incoming page
- [ ] Total transition time is ~350ms — perceptible but snappy
- [ ] The `PageTransition` wrapper component wraps the route outlet and detects route changes via `useLocation`
- [ ] Back/forward browser navigation also shows the transition
- [ ] With `prefers-reduced-motion: reduce`, pages swap instantly with no fade or translateY

### Staggered List Entrances
- [ ] Prayer Wall feed cards stagger in at 50ms intervals with fade+slide (opacity 0 to 1, translateY 8px to 0, 300ms ease-out)
- [ ] Bible book accordion items stagger at 30ms when a testament section expands
- [ ] Reading Plan cards on `/grow` stagger at 80ms
- [ ] Challenge cards stagger at 80ms
- [ ] Search results (Bible search, friend search) stagger at 50ms
- [ ] Saved journal entries stagger at 50ms
- [ ] Personal prayer list items on `/my-prayers` stagger at 50ms
- [ ] Leaderboard rows stagger at 30ms
- [ ] Dashboard widget stagger (Spec 9, 100ms) still works correctly
- [ ] Items below the fold only animate when scrolled into view (Intersection Observer)
- [ ] Items in the viewport on page load animate immediately with their stagger delays
- [ ] With `prefers-reduced-motion: reduce`, all list items render instantly with no animation or stagger

### Modal & Drawer Spring
- [ ] AuthModal opens with `scale(0.95)` to `scale(1)` + opacity over 250ms with `cubic-bezier(0.34, 1.56, 0.64, 1)` — visible slight overshoot
- [ ] AuthModal closes with `scale(1)` to `scale(0.98)` + opacity over 150ms ease-out — faster close, no bounce
- [ ] Avatar picker, delete confirmation, report dialog, and share panel use the same modal spring animation
- [ ] Backdrop fades in/out independently (200ms ease) — not tied to modal scale timing
- [ ] Mobile nav drawer slides in with translateX + spring timing (300ms, slight overshoot) and slides out (200ms ease-in)
- [ ] AudioDrawer desktop panel slides in/out with translateX + spring/ease-in timing
- [ ] AudioDrawer mobile bottom sheet slides up/down with translateY + spring/ease-in timing
- [ ] With `prefers-reduced-motion: reduce`, all modals and drawers appear/disappear instantly

### Tab Content Fade
- [ ] Friends page tabs (Friends | Leaderboard) have animated sliding underline matching DailyHub pattern
- [ ] Prayer Wall profile tabs have animated sliding underline
- [ ] Prayer Wall dashboard tabs have animated sliding underline
- [ ] Settings mobile tabs have animated sliding underline
- [ ] When switching any tab, the incoming content fades in (opacity 0 to 1 over 200ms)
- [ ] With `prefers-reduced-motion: reduce`, tab switches are instant (no opacity fade, no underline transition)

### Toast Animation
- [ ] Standard toasts enter with scale(0.8) to scale(1) + opacity + translateY(8px to 0) over 300ms with spring cubic-bezier — visible slight bounce
- [ ] Celebration toasts use existing slide pattern with spring timing function for bouncier feel
- [ ] All toasts exit with scale(1) to scale(0.95) + opacity over 200ms ease-out
- [ ] With `prefers-reduced-motion: reduce`, toasts appear and disappear instantly

### Prayer Card Pulse
- [ ] Tapping "Pray for this" causes the prayer card to pulse scale(1) to scale(1.005) to scale(1) over 300ms
- [ ] Bookmarking a prayer triggers the same subtle pulse
- [ ] Saving to prayer list triggers the same subtle pulse
- [ ] With `prefers-reduced-motion: reduce`, no card pulse

### Skeleton-to-Content Fade
- [ ] Bible chapter content fades in (opacity 0 to 1 over 300ms) when loading completes
- [ ] With `prefers-reduced-motion: reduce`, content appears instantly

### Visual Verification
- [ ] Route transitions are perceptible at 1x speed — there is a visible fade between pages, not an instant swap
- [ ] List staggers create a visible cascade effect — items appear one after another, not all at once
- [ ] Modal spring overshoot is subtle — a slight bounce, not a dramatic oscillation
- [ ] Drawer spring overshoot is subtler than modal (1.2 vs 1.56 control point) — barely perceptible bounce
- [ ] Toast spring bounce is noticeable but not distracting
- [ ] Prayer card pulse is very subtle (0.5% scale change) — felt rather than seen
- [ ] All animations feel cohesive — consistent use of spring timing and 200-300ms durations creates a unified motion language
- [ ] With `prefers-reduced-motion: reduce`, the entire app renders with zero animation — confirmed via browser DevTools override
