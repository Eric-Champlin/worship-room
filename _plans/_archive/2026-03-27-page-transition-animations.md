# Implementation Plan: Page Transition Animations

**Spec:** `_specs/page-transition-animations.md`
**Date:** 2026-03-27
**Branch:** `claude/feature/page-transition-animations`
**Design System Reference:** `_plans/recon/design-system.md` (loaded)
**Recon Report:** not applicable
**Master Spec Plan:** not applicable

---

## Architecture Context

### Project Structure

- **Components:** `frontend/src/components/` — organized by feature (`prayer-wall/`, `daily/`, `dashboard/`, `audio/`, `leaderboard/`, `ui/`)
- **Pages:** `frontend/src/pages/` — one file per route
- **Hooks:** `frontend/src/hooks/` — shared hooks (`useReducedMotion.ts`, `useInView.ts`, `useAuth.ts`, etc.)
- **Tailwind Config:** `frontend/tailwind.config.js` — 27+ custom keyframes, 27+ animation classes
- **App Entry:** `frontend/src/App.tsx` — React Router v6 with `<Suspense>` fallback, no page transitions

### Existing Animation Infrastructure

| Asset | File | Details |
|-------|------|---------|
| Tailwind keyframes | `tailwind.config.js` lines 37-200 | 27+ keyframes including `fade-in`, `widget-enter`, `celebration-spring`, `slide-from-right/bottom/left` |
| `useReducedMotion()` | `hooks/useReducedMotion.ts` | Detects `prefers-reduced-motion: reduce`, live-updates on system change |
| `useInView()` | `hooks/useInView.ts` | IntersectionObserver, returns `[ref, inView]`. Immediately returns `inView=true` when reduced motion is active |
| `motion-safe:` prefix | Throughout codebase | Standard Tailwind variant used on all animation classes |
| Dashboard widget stagger | `components/dashboard/DashboardWidgetGrid.tsx` lines 46-71 | 100ms intervals, `motion-safe:animate-widget-enter` with `animationDelay` |
| Leaderboard row stagger | `components/leaderboard/LeaderboardRow.tsx` line 60 | Already has `motion-safe:opacity-0 motion-safe:animate-fade-in` with staggered delays |
| `celebration-spring` keyframe | `tailwind.config.js` | Already uses `cubic-bezier(0.34, 1.56, 0.64, 1)` — same spring curve needed for modals |

### Current State of Animation Targets

| Target | Current State | What Changes |
|--------|--------------|--------------|
| Route transitions | None — instant page swap via `<Suspense>` | Add `PageTransition` wrapper with fade-out/fade-in |
| Toast entrance | `motion-safe:animate-slide-from-right` (standard), `animate-slide-from-bottom` (celebration) | Replace with spring scale+fade+lift |
| AuthModal | No animation — instant show/hide via `if (!isOpen) return null` | Add spring scale open/close |
| MobileDrawer | `motion-safe:animate-dropdown-in` (150ms fade+slide) | Replace with translateX slide + spring timing |
| AudioDrawer (mobile) | `translateY` swipe with `transition: transform 300ms ease-out` | Add spring timing on open |
| AudioDrawer (desktop) | No explicit animation | Add translateX slide with spring timing |
| DailyHub tabs | Animated underline (200ms transform transition). Content: instant swap via `hidden` attribute | Add content opacity fade on panel reveal |
| GrowPage tabs | Animated underline (200ms, same as DailyHub). Content: instant swap via `hidden` | Add content opacity fade |
| Friends tabs | Pill buttons (no underline). Content: `hidden` + conditional rendering | Add animated underline, add content opacity fade |
| PrayerWallProfile tabs | Static underline (`border-b-2`). Content: conditional rendering | Add animated sliding underline, add content opacity fade |
| PrayerWallDashboard tabs | Static underline (`border-b-2`). Content: conditional rendering | Add animated sliding underline, add content opacity fade |
| Settings tabs | Mobile underline + desktop sidebar. Content: conditional rendering | Add content opacity fade |
| Prayer Wall cards | No stagger — all cards render simultaneously | Add stagger with IntersectionObserver |
| Bible books | No stagger on accordion expansion | Add stagger on testament expand |
| PrayerCard interactions | No animation on card itself (ripple/pulse on icon only) | Add subtle scale pulse on card |
| BibleReader loading | Simple "Loading..." text, instant content swap | Add opacity fade-in on content |

### Tab Implementation Patterns

Tabs across the app use two different approaches that affect how content fade will be implemented:

| Page | Content Method | Underline | Fade Strategy |
|------|---------------|-----------|---------------|
| DailyHub | `hidden` attribute on always-mounted panels | Animated (`translateX`) | CSS transition on opacity when `hidden` removed |
| GrowPage | `hidden` attribute on always-mounted panels | Animated (`translateX`) | CSS transition on opacity when `hidden` removed |
| Friends | `hidden` attribute + conditional rendering | Pill buttons (no underline) | Add animated underline + CSS transition on opacity |
| PrayerWallProfile | Conditional rendering only | Static `border-b-2` | Replace with animated underline + fade via state-driven class |
| PrayerWallDashboard | Conditional rendering only | Static `border-b-2` | Replace with animated underline + fade via state-driven class |
| Settings | Conditional rendering only | Mobile underline, desktop sidebar | Add fade via state-driven class |

### Key Files Touched

**New files (3):**
- `frontend/src/components/ui/PageTransition.tsx`
- `frontend/src/hooks/useStaggeredEntrance.ts`
- `frontend/src/components/ui/__tests__/PageTransition.test.tsx` (+ `useStaggeredEntrance.test.ts`)

**Modified files (~20):**
- `frontend/tailwind.config.js` — new keyframes + animation classes
- `frontend/src/App.tsx` — wrap route outlet with `PageTransition`
- `frontend/src/pages/PrayerWall.tsx` — stagger on prayer cards
- `frontend/src/pages/BibleBrowser.tsx` — stagger on book accordion + search results
- `frontend/src/pages/GrowPage.tsx` — stagger on plan/challenge cards + tab content fade
- `frontend/src/pages/MyPrayers.tsx` — stagger on prayer items
- `frontend/src/pages/Friends.tsx` — stagger on search results + animated underline + content fade
- `frontend/src/pages/PrayerWallProfile.tsx` — animated underline + content fade
- `frontend/src/pages/PrayerWallDashboard.tsx` — animated underline + content fade
- `frontend/src/pages/Settings.tsx` — tab content fade
- `frontend/src/pages/DailyHub.tsx` — tab content fade
- `frontend/src/pages/BibleReader.tsx` — content fade-in on load
- `frontend/src/components/daily/JournalTabContent.tsx` — stagger on saved entries
- `frontend/src/components/prayer-wall/AuthModal.tsx` — spring animation
- `frontend/src/components/prayer-wall/DeletePrayerDialog.tsx` — spring animation
- `frontend/src/components/prayer-wall/ReportDialog.tsx` — spring animation
- `frontend/src/components/prayer-wall/InteractionBar.tsx` — prayer card pulse callback
- `frontend/src/components/prayer-wall/PrayerCard.tsx` — pulse animation on interaction
- `frontend/src/components/MobileDrawer.tsx` — slide + spring timing
- `frontend/src/components/audio/AudioDrawer.tsx` — spring timing
- `frontend/src/components/ui/Toast.tsx` — spring entrance/exit

---

## Auth Gating Checklist

This feature is purely visual enhancement. No new interactive elements are introduced. No auth gates are added or modified.

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| N/A | "Auth behavior of all existing elements remains unchanged" | All steps | No changes to auth gating |

---

## Design System Values (for UI steps)

No new visual patterns beyond motion are introduced. All animations enhance existing components. The only "design values" are timing/easing curves defined in the spec:

| Animation | Duration | Easing | Source |
|-----------|----------|--------|--------|
| Page fade-out | 150ms | ease-out | Spec requirement 1 |
| Page fade-in | 200ms | ease-out | Spec requirement 1 |
| Page lift | translateY 8px → 0 | ease-out | Spec requirement 1 |
| Stagger item | 300ms | ease-out | Spec requirement 2 |
| Stagger item lift | translateY 8px → 0 | ease-out | Spec requirement 2 |
| Modal open | 250ms | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Spec requirement 3 |
| Modal close | 150ms | ease-out | Spec requirement 3 |
| Drawer open | 300ms | `cubic-bezier(0.34, 1.2, 0.64, 1)` | Spec requirement 3 |
| Drawer close | 200ms | ease-in | Spec requirement 3 |
| Backdrop | 200ms | ease | Spec requirement 3 |
| Tab content fade | 200ms | ease-out | Spec requirement 4 |
| Tab underline | 200ms | ease-in-out | Existing DailyHub pattern |
| Toast enter | 300ms | `cubic-bezier(0.34, 1.3, 0.64, 1)` | Spec requirement 5 |
| Toast exit | 200ms | ease-out | Spec requirement 5 |
| Prayer card pulse | 300ms | ease-in-out | Spec requirement 6 |
| Content fade-in | 300ms | ease-out | Spec requirement 7 |

---

## Design System Reminder

**Project-specific quirks that `/execute-plan` displays before every UI step:**

- Worship Room uses `motion-safe:` Tailwind prefix on ALL animation classes — never apply animation without it
- Reduced motion: `useReducedMotion()` hook returns boolean; `useInView()` auto-resolves to `inView=true` when reduced motion active
- Existing spring curve: `celebration-spring` already uses `cubic-bezier(0.34, 1.56, 0.64, 1)` — reuse the same curve for modal spring
- Dashboard widget stagger uses `animate-widget-enter` (400ms ease-out both, 100ms intervals) — do not break this
- Leaderboard rows already have `motion-safe:animate-fade-in` with stagger — verify compatibility, don't double-animate
- Tab underline pattern: `absolute bottom-0 h-0.5 bg-primary transition-transform duration-200 ease-in-out` with `translateX(${activeTabIndex * 100}%)`
- All tabs use `role="tablist"`, `role="tab"`, `role="tabpanel"` ARIA — preserve all ARIA attributes
- MobileDrawer background: `bg-hero-mid border border-white/15` — preserve when adding slide animation
- AudioDrawer has swipe-to-dismiss gesture — spring timing must not conflict with swipe offset logic

---

## Shared Data Models (from Master Plan)

N/A — no master plan. No new data models, no new localStorage keys.

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | < 640px | Single column lists. Drawers: bottom-sheet (translateY) for AudioDrawer, translateX for MobileDrawer. All animation timings identical to desktop. |
| Tablet | 640-1024px | 2-column grids (meditation cards, reading plans). Stagger follows DOM order. Same timings. |
| Desktop | > 1024px | AudioDrawer is side panel (translateX). Multi-column layouts. Same timings. |

No breakpoint-specific timing — animation durations and easing are identical across all screen sizes. The only responsive difference is drawer direction (translateX vs translateY based on device).

---

## Vertical Rhythm

N/A — this feature adds motion to existing elements. No new sections, no spacing changes. All vertical rhythm is unchanged.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] All auth-gated actions from the spec are accounted for (none — purely visual)
- [x] Design system values are verified — all values are timing/easing from the spec itself
- [ ] All [UNVERIFIED] values are flagged with verification methods (see below)
- [ ] `frontend/tailwind.config.js` keyframe section is accessible and has no conflicting names
- [ ] Existing dashboard widget stagger and leaderboard row stagger still work after changes
- [ ] `useReducedMotion` and `useInView` hooks are functional

**[UNVERIFIED] values:**

```
[UNVERIFIED] PageTransition exit/enter timing may need tuning at 150ms/200ms
→ To verify: Run /verify-with-playwright and visually confirm transitions feel snappy but visible
→ If wrong: Adjust durations ±50ms until the transition is perceptible but doesn't feel slow
```

```
[UNVERIFIED] Prayer card pulse at scale(1.005) may be imperceptible on small mobile screens
→ To verify: Test on 375px viewport — should be "felt rather than seen"
→ If wrong: Increase to scale(1.01) if invisible, decrease if too obvious
```

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| CSS-only vs JS animation for PageTransition | CSS transitions with JS class toggling via `useLocation` | Spec mandates no animation libraries. CSS transitions are performant and respect `motion-safe:` |
| PageTransition approach: simultaneous vs sequential | Sequential (fade-out old, then fade-in new) via CSS classes on a wrapper div | Spec says "outgoing fades out, incoming fades in" — sequential prevents layout overlap |
| StaggeredList: component vs hook | Hook (`useStaggeredEntrance`) returning `getStaggerProps(index)` | Hook is more flexible — works with any list pattern (map, conditional, wrapper divs). Component would require children restructuring. |
| Tab content fade for `hidden`-based tabs | CSS transition + `opacity-0` → `opacity-1` class toggle alongside `hidden` removal | Can't animate `hidden` directly. Use a brief `requestAnimationFrame` or transition delay to let the element render before fading in. |
| Tab content fade for conditional-rendering tabs | State-driven class: mount with `opacity-0`, then `useEffect` to add `opacity-1` | Conditional mount doesn't preserve DOM — fade-in on mount via class + `requestAnimationFrame` |
| MobileDrawer: dropdown-in vs translateX slide | Replace `animate-dropdown-in` with translateX slide + spring | Spec requires slide-in from right, not fade+slide-down. This is a visual behavior change. |
| Stagger for items below fold | `useInView` per StaggeredList group, not per item | Per-item IntersectionObserver would create N observers. Group-level observation is sufficient — when the list container enters viewport, start the stagger. |
| Dashboard widget stagger integration | Leave existing `DashboardWidgetGrid` stagger as-is | Spec says "verify still works" — the existing pattern uses `animate-widget-enter` which is separate from the new `stagger-enter`. No benefit to migrating. |
| Leaderboard row stagger | Verify existing `animate-fade-in` stagger works, update delay to 30ms if different | Spec wants 30ms intervals. Check current delay value and adjust if needed. |
| AudioDrawer desktop — add slide animation | Add translateX slide-in with spring timing | Desktop AudioDrawer currently has no open animation. Add one matching the spec. |
| Modal close animation timing | Allow modal to animate out before unmounting | Currently `if (!isOpen) return null` — need to delay unmount by 150ms for close animation |

---

## Implementation Steps

### Step 1: CSS Keyframes & Animation Classes

**Objective:** Add all new keyframe definitions and animation utility classes to the Tailwind config.

**Files to modify:**
- `frontend/tailwind.config.js` — add keyframes and animation entries

**Details:**

Add these keyframes to `theme.extend.keyframes`:

```javascript
// Page transition fade-in with lift
'page-enter': {
  '0%': { opacity: '0', transform: 'translateY(8px)' },
  '100%': { opacity: '1', transform: 'translateY(0)' },
},
// Stagger list item entrance
'stagger-enter': {
  '0%': { opacity: '0', transform: 'translateY(8px)' },
  '100%': { opacity: '1', transform: 'translateY(0)' },
},
// Modal spring open
'modal-spring-in': {
  '0%': { opacity: '0', transform: 'scale(0.95)' },
  '100%': { opacity: '1', transform: 'scale(1)' },
},
// Modal close
'modal-spring-out': {
  '0%': { opacity: '1', transform: 'scale(1)' },
  '100%': { opacity: '0', transform: 'scale(0.98)' },
},
// Toast spring entrance
'toast-spring-in': {
  '0%': { opacity: '0', transform: 'scale(0.8) translateY(8px)' },
  '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
},
// Toast exit
'toast-out': {
  '0%': { opacity: '1', transform: 'scale(1)' },
  '100%': { opacity: '0', transform: 'scale(0.95)' },
},
// Prayer card pulse
'card-pulse': {
  '0%': { transform: 'scale(1)' },
  '50%': { transform: 'scale(1.005)' },
  '100%': { transform: 'scale(1)' },
},
// Content fade-in (skeleton → content)
'content-fade-in': {
  '0%': { opacity: '0' },
  '100%': { opacity: '1' },
},
// Backdrop fade
'backdrop-fade-in': {
  '0%': { opacity: '0' },
  '100%': { opacity: '1' },
},
'backdrop-fade-out': {
  '0%': { opacity: '1' },
  '100%': { opacity: '0' },
},
```

Add these animation classes to `theme.extend.animation`:

```javascript
'page-enter': 'page-enter 200ms ease-out both',
'stagger-enter': 'stagger-enter 300ms ease-out both',
'modal-spring-in': 'modal-spring-in 250ms cubic-bezier(0.34, 1.56, 0.64, 1) both',
'modal-spring-out': 'modal-spring-out 150ms ease-out both',
'toast-spring-in': 'toast-spring-in 300ms cubic-bezier(0.34, 1.3, 0.64, 1) both',
'toast-out': 'toast-out 200ms ease-out both',
'card-pulse': 'card-pulse 300ms ease-in-out',
'content-fade-in': 'content-fade-in 300ms ease-out both',
'backdrop-fade-in': 'backdrop-fade-in 200ms ease both',
'backdrop-fade-out': 'backdrop-fade-out 200ms ease both',
```

**Guardrails (DO NOT):**
- Do NOT modify or rename any existing keyframes or animations
- Do NOT change the existing `celebration-spring`, `widget-enter`, `fade-in`, or `slide-from-*` animations
- Do NOT use animation libraries — CSS-only

**Responsive behavior:** N/A: no UI impact

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Verify tailwind build succeeds | build | Run `pnpm build` — no Tailwind compilation errors |

**Expected state after completion:**
- [ ] All 10 new keyframes defined in tailwind.config.js
- [ ] All 10 new animation classes registered
- [ ] `pnpm build` succeeds without errors
- [ ] Existing animations unaffected

---

### Step 2: PageTransition Component + App.tsx Integration

**Objective:** Create a `PageTransition` wrapper that fades out the old page (150ms) and fades in the new page (200ms) with an 8px upward lift on route change.

**Files to create/modify:**
- `frontend/src/components/ui/PageTransition.tsx` — new component
- `frontend/src/App.tsx` — wrap route content with `PageTransition`

**Details:**

**PageTransition.tsx** — CSS-class-driven transition wrapper:

```typescript
// PageTransition.tsx
// Wraps route content. On route change:
// 1. Apply 'page-exit' class (opacity 1→0 over 150ms)
// 2. After 150ms, swap content, apply 'page-enter' class (opacity 0→1 + translateY 8→0 over 200ms)
// On prefers-reduced-motion: skip all animation, render instantly
```

Implementation approach:
- Use `useLocation()` to detect route changes (compare `location.key`)
- Maintain `phase` state: `'idle' | 'exiting' | 'entering'`
- On route change: set `phase = 'exiting'`, after 150ms timeout set `phase = 'entering'`
- `exiting`: apply `opacity-0 transition-opacity duration-150 ease-out`
- `entering`: apply `motion-safe:animate-page-enter` class
- Use `useReducedMotion()` — if true, skip phases entirely, render instantly
- Wrap `children` (the route content) in a single `<div>` with the transition classes

**App.tsx** — Wrap the `<Routes>` content:

```tsx
// Before: direct <Routes> rendering
// After: wrap with <PageTransition> around the route content area
// PageTransition goes inside <Suspense> but outside individual routes
```

The `PageTransition` component wraps the main content area (after `<Navbar>`, before `<SiteFooter>`). Since `Layout.tsx` wraps the app, `PageTransition` integrates into `Layout.tsx` or around the `<Outlet>` / route content in `App.tsx`.

Check `Layout.tsx` — if it renders `{children}` between Navbar and Footer, the `PageTransition` wraps `{children}` there. If routes are direct in `App.tsx`, wrap there.

**Guardrails (DO NOT):**
- Do NOT use React Transition Group, Framer Motion, or any animation library
- Do NOT animate the Navbar or Footer — only the main content between them
- Do NOT block navigation — the route change happens immediately, only the visual transition is animated
- Do NOT use `useLayoutEffect` for the timeout — use `useEffect` to avoid blocking paint
- Do NOT add memory leaks — clear timeouts on unmount and on rapid re-navigation

**Responsive behavior:**
- Desktop (1440px): Fade + lift plays identically
- Tablet (768px): Same
- Mobile (375px): Same — no responsive differences for page transitions

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Renders children | unit | `PageTransition` renders its children |
| Applies enter animation class on mount | unit | Initial render has `motion-safe:animate-page-enter` |
| Skips animation when reduced motion | unit | Mock `prefers-reduced-motion: reduce`, verify no animation classes applied |
| Handles rapid route changes | unit | Trigger multiple location changes quickly, verify no stale timeouts |

**Expected state after completion:**
- [ ] `PageTransition` component exists at `components/ui/PageTransition.tsx`
- [ ] Navigating between any two routes shows a visible fade transition
- [ ] Back/forward browser navigation shows the transition
- [ ] `prefers-reduced-motion: reduce` causes instant page swap with no animation
- [ ] Navbar and Footer do not animate during transitions

---

### Step 3: useStaggeredEntrance Hook

**Objective:** Create a reusable hook that returns animation props for staggered list item entrances with Intersection Observer gating.

**Files to create:**
- `frontend/src/hooks/useStaggeredEntrance.ts` — new hook

**Details:**

```typescript
interface UseStaggeredEntranceOptions {
  /** Delay between each item in ms */
  staggerDelay: number
  /** Total number of items (for computing max delay) */
  itemCount: number
  /** Whether the list container is in view (from useInView or external state) */
  inView?: boolean
}

interface StaggerProps {
  className: string
  style: React.CSSProperties
}

function useStaggeredEntrance(options: UseStaggeredEntranceOptions): {
  containerRef: React.RefObject<HTMLElement>
  getStaggerProps: (index: number) => StaggerProps
}
```

Implementation:
- Internally uses `useInView()` to observe the container element — items only animate when container scrolls into view
- If `inView` prop is explicitly passed, uses that instead of internal IntersectionObserver (for cases where parent controls visibility)
- `getStaggerProps(index)` returns:
  - When not in view: `{ className: 'opacity-0', style: {} }` — items hidden until container visible
  - When in view: `{ className: 'motion-safe:animate-stagger-enter', style: { animationDelay: '${index * staggerDelay}ms' } }`
  - When reduced motion active (detected via `useReducedMotion()`): `{ className: '', style: {} }` — no classes, instant render
- Returns `containerRef` to attach to the list container element

Follow the pattern in `DashboardWidgetGrid.tsx` lines 46-71 for the stagger delay approach.

**Guardrails (DO NOT):**
- Do NOT create one IntersectionObserver per item — one observer on the container element is sufficient
- Do NOT animate items that are in the viewport on initial page load with a delay — they should animate immediately with stagger
- Do NOT conflict with the existing `useInView` hook — the new hook composes `useInView` internally
- Do NOT add a dependency on any animation library

**Responsive behavior:** N/A: no UI impact — hook returns CSS classes that work at all breakpoints

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Returns opacity-0 when not in view | unit | Before intersection, items have `opacity-0` class |
| Returns stagger-enter class when in view | unit | After intersection, items have `motion-safe:animate-stagger-enter` |
| Correct animation delay per index | unit | Index 0 → 0ms, index 1 → staggerDelay, index 2 → 2*staggerDelay |
| Skips all animation with reduced motion | unit | Mock reduced motion, verify no animation classes or delays |
| containerRef attaches to DOM element | unit | Ref callback is functional |

**Expected state after completion:**
- [ ] `useStaggeredEntrance` hook exists at `hooks/useStaggeredEntrance.ts`
- [ ] Hook returns `containerRef` and `getStaggerProps(index)`
- [ ] Reduced motion causes instant render with no animation

---

### Step 4: Apply Stagger — Prayer Wall + Bible Browser

**Objective:** Add staggered entrance animation to Prayer Wall prayer cards (50ms), Bible book accordion items (30ms), and Bible search results (50ms).

**Files to modify:**
- `frontend/src/pages/PrayerWall.tsx` — stagger on prayer card list (lines ~442-480)
- `frontend/src/pages/BibleBrowser.tsx` — stagger on book accordion expand + search results

**Details:**

**PrayerWall.tsx:**
- Import `useStaggeredEntrance` hook
- In the prayer card list section (`<div className="flex flex-col gap-4">`), call `useStaggeredEntrance({ staggerDelay: 50, itemCount: filteredPrayers.length })`
- Attach `containerRef` to the flex container div
- Apply `getStaggerProps(index)` to each card wrapper div inside the `.map()`
- Merge returned className with existing classes via `cn()`

**BibleBrowser.tsx:**
- For book accordion items: when a testament section expands revealing book items, apply stagger with 30ms delay
- Use `useStaggeredEntrance` with `inView` tied to the expanded state (items always in viewport when accordion opens)
- For search results: apply stagger with 50ms delay on the search results list

**Guardrails (DO NOT):**
- Do NOT change the Prayer Wall pagination behavior — "Load More" items should not re-trigger stagger on existing items
- Do NOT add stagger to QOTD banner or category filter — only prayer cards in the feed
- Do NOT break the existing `ref` on the first QOTD response (`firstQotdResponseRef`) — merge refs if needed using a callback ref

**Responsive behavior:**
- Desktop (1440px): Cards stagger in single column (Prayer Wall) or grid (Bible books)
- Tablet (768px): Same single column for Prayer Wall, 2-column for Bible books
- Mobile (375px): Same — single column, same stagger timing

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Prayer cards have stagger animation props | integration | Render PrayerWall, verify card wrappers have `animate-stagger-enter` class |
| Prayer card stagger delays are sequential | integration | First card: 0ms, second: 50ms, third: 100ms |
| Bible book items stagger on accordion expand | integration | Expand a testament, verify book items have 30ms stagger delays |
| Bible search results stagger | integration | Run a search, verify result items have 50ms stagger delays |
| Stagger disabled with reduced motion | integration | Mock reduced motion, verify no animation classes |

**Expected state after completion:**
- [ ] Prayer Wall cards cascade in with 50ms stagger
- [ ] Bible book accordion items cascade at 30ms on expand
- [ ] Bible search results cascade at 50ms
- [ ] Reduced motion disables all stagger

---

### Step 5: Apply Stagger — Grow Cards + Journal Entries + My Prayers

**Objective:** Add staggered entrance to Reading Plan cards (80ms), Challenge cards (80ms), saved journal entries (50ms), and personal prayer list (50ms).

**Files to modify:**
- `frontend/src/pages/GrowPage.tsx` — stagger on plan cards and challenge cards
- `frontend/src/components/daily/JournalTabContent.tsx` — stagger on saved entries list
- `frontend/src/pages/MyPrayers.tsx` — stagger on prayer items (lines ~207-252)

**Details:**

**GrowPage.tsx:**
- Import `useStaggeredEntrance`
- Apply to Reading Plans tab content — the list/grid of plan cards gets 80ms stagger
- Apply to Challenges tab content — challenge cards get 80ms stagger
- Since both panels are always mounted (via `hidden` attribute), use separate hook instances for each tab

**JournalTabContent.tsx:**
- Find the saved journal entries list rendering
- Apply 50ms stagger to the entries list

**MyPrayers.tsx:**
- Apply to the `<div className="space-y-4" role="list">` container (line ~207)
- Attach `containerRef` to the list container
- Apply `getStaggerProps(index)` to each `<div role="listitem">` wrapper
- Stagger delay: 50ms

**Guardrails (DO NOT):**
- Do NOT stagger the edit form when it replaces a prayer item in MyPrayers — only the list view
- Do NOT break the `role="list"` / `role="listitem"` ARIA pattern on MyPrayers
- Do NOT apply stagger to the "AI Generate a Plan" section in GrowPage — only plan/challenge cards

**Responsive behavior:**
- Desktop: Grid layout for plan/challenge cards — stagger follows DOM order
- Tablet: 2-column grid — stagger goes left-to-right, top-to-bottom
- Mobile: Single column — stagger is vertical

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Reading plan cards stagger at 80ms | integration | Verify plan cards have sequential 80ms delays |
| Challenge cards stagger at 80ms | integration | Verify challenge cards have sequential 80ms delays |
| Journal saved entries stagger at 50ms | integration | Verify entry items have sequential 50ms delays |
| My Prayers items stagger at 50ms | integration | Verify prayer items have sequential 50ms delays |

**Expected state after completion:**
- [ ] Reading Plan and Challenge cards cascade in at 80ms intervals
- [ ] Journal saved entries cascade at 50ms
- [ ] My Prayers items cascade at 50ms
- [ ] All stagger respects reduced motion

---

### Step 6: Apply Stagger — Friends Search + Verify Existing Staggers

**Objective:** Add stagger to friend search results (50ms) and verify that existing leaderboard row stagger (30ms) and dashboard widget stagger (100ms) still work correctly.

**Files to modify:**
- `frontend/src/pages/Friends.tsx` — stagger on search results
- `frontend/src/components/leaderboard/LeaderboardRow.tsx` — verify/adjust stagger delay to 30ms

**Details:**

**Friends.tsx:**
- Find the friend search results rendering
- Apply `useStaggeredEntrance` with 50ms delay to search result items

**LeaderboardRow.tsx (verify):**
- The component already has `motion-safe:opacity-0 motion-safe:animate-fade-in` with stagger (line 60)
- Check the current delay interval — the spec requires 30ms between rows
- If the current delay is different from 30ms, update it
- If it already uses 30ms, leave unchanged

**Dashboard widget stagger (verify only — do NOT modify):**
- Run the app, navigate to dashboard, confirm widgets still stagger in at 100ms intervals
- `DashboardWidgetGrid.tsx` should not be modified — just verified

**Guardrails (DO NOT):**
- Do NOT modify DashboardWidgetGrid.tsx — the existing stagger pattern is independent and should remain as-is
- Do NOT double-animate leaderboard rows — if they already animate, update timing rather than adding new animation
- Do NOT add stagger to the friend list itself (accepted friends) — only search results

**Responsive behavior:**
- Desktop: Search results and leaderboard rows stagger identically
- Mobile: Same timing, single-column layout

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Friend search results stagger at 50ms | integration | Verify search result items have 50ms stagger |
| Leaderboard rows stagger at 30ms | integration | Verify LeaderboardRow has 30ms delay intervals |
| Dashboard widgets still stagger at 100ms | smoke | Navigate to dashboard (authenticated), confirm widget stagger |

**Expected state after completion:**
- [ ] Friend search results cascade at 50ms
- [ ] Leaderboard rows use 30ms stagger intervals
- [ ] Dashboard widget stagger is unaffected (100ms intervals, `animate-widget-enter`)

---

### Step 7: Modal Spring Animations

**Objective:** Add spring scale animation to AuthModal (open: 250ms spring, close: 150ms ease-out) and apply the same pattern to other modal dialogs.

**Files to modify:**
- `frontend/src/components/prayer-wall/AuthModal.tsx` — spring open/close with delayed unmount
- `frontend/src/components/prayer-wall/DeletePrayerDialog.tsx` — same spring pattern
- `frontend/src/components/prayer-wall/ReportDialog.tsx` — same spring pattern

**Details:**

**AuthModal.tsx** (reference implementation — other modals follow this pattern):

Current pattern (line 62): `if (!isOpen) return null` — instant unmount.

New pattern:
1. Track `isOpen` (external prop) AND `isClosing` (internal state)
2. When `isOpen` transitions to `true`: render the modal with `motion-safe:animate-modal-spring-in` on the modal panel, `motion-safe:animate-backdrop-fade-in` on the overlay
3. When `isOpen` transitions to `false`: set `isClosing = true`, apply `motion-safe:animate-modal-spring-out` on the panel, `motion-safe:animate-backdrop-fade-out` on the overlay
4. After 150ms (close animation duration), set `isClosing = false` and return `null`
5. With `prefers-reduced-motion`: skip all animation, instant show/hide as before

Use a `useEffect` watching `isOpen` to handle the close-then-unmount sequence. Clear timeout on unmount to prevent memory leaks.

**Backdrop:** Change overlay from static `bg-black/50` to animated: `motion-safe:animate-backdrop-fade-in` on open, `motion-safe:animate-backdrop-fade-out` on close.

**DeletePrayerDialog.tsx and ReportDialog.tsx:** Apply the same pattern. These likely have similar `if (!isOpen) return null` guards.

**ShareDropdown** is a dropdown, not a modal — leave as-is per existing dropdown animation pattern.

**Guardrails (DO NOT):**
- Do NOT remove the `useFocusTrap()` hook or `document.body.style.overflow = 'hidden'` logic
- Do NOT change the modal's ARIA attributes or keyboard handling
- Do NOT animate on `prefers-reduced-motion` — instant show/hide
- Do NOT break the existing `onClose` callback timing — the parent should not need to know about the animation delay

**Responsive behavior:**
- Desktop (1440px): Modal centered, spring scale plays
- Tablet (768px): Same
- Mobile (375px): Same — modals are typically full-width (`max-w-md mx-4`)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| AuthModal renders with spring-in class when open | unit | Set `isOpen=true`, verify `animate-modal-spring-in` on panel |
| AuthModal renders with spring-out class when closing | unit | Set `isOpen=true` then `false`, verify `animate-modal-spring-out` |
| AuthModal unmounts after close animation | unit | After 150ms timeout, verify modal is unmounted |
| Backdrop fades independently | unit | Verify backdrop has `animate-backdrop-fade-in/out` classes |
| Reduced motion skips animation | unit | Mock reduced motion, verify instant show/hide |
| Focus trap still works with animation | unit | Verify `useFocusTrap` is called during animated open |
| DeletePrayerDialog has spring animation | unit | Verify spring classes on open/close |
| ReportDialog has spring animation | unit | Verify spring classes on open/close |

**Expected state after completion:**
- [ ] AuthModal springs open with subtle overshoot bounce
- [ ] AuthModal closes quickly with slight scale-down
- [ ] Backdrop fades independently from modal
- [ ] DeletePrayerDialog and ReportDialog have same spring animation
- [ ] Reduced motion causes instant show/hide

---

### Step 8: Drawer Spring Animations

**Objective:** Add spring timing to MobileDrawer (translateX slide) and AudioDrawer (spring timing on open, both mobile and desktop variants).

**Files to modify:**
- `frontend/src/components/MobileDrawer.tsx` — replace `animate-dropdown-in` with translateX slide + spring
- `frontend/src/components/audio/AudioDrawer.tsx` — add spring timing to open animation

**Details:**

**MobileDrawer.tsx:**

Current: Uses `motion-safe:animate-dropdown-in` (150ms fade+slide down) with instant unmount when `!isOpen`.

New pattern:
1. Track `isOpen` (prop) AND `isClosing` (internal state) — same pattern as modals in Step 7
2. Backdrop: `bg-black/20` with `motion-safe:animate-backdrop-fade-in` on open, fade-out on close
3. Drawer panel: slide in from right
   - Open: CSS `transform: translateX(100%)` → `translateX(0)` over 300ms with `cubic-bezier(0.34, 1.2, 0.64, 1)` (slight spring overshoot)
   - Close: `translateX(0)` → `translateX(100%)` over 200ms `ease-in`
4. Use CSS transition (not keyframe animation) for the translateX — this allows the drawer to open/close smoothly from any position
5. With `prefers-reduced-motion`: instant show/hide, no slide

CSS classes approach:
- Drawer container: `transition-transform` with duration conditional on open/close state
- Open state: `translate-x-0 duration-300` with spring `[transition-timing-function:cubic-bezier(0.34,1.2,0.64,1)]`
- Close state: `translate-x-full duration-200 ease-in`
- Initial state: `translate-x-full`

**AudioDrawer.tsx:**

Mobile (bottom sheet):
- Currently has `transition: transform 300ms ease-out` for swipe interaction
- Add spring timing on open: when `drawerOpen` becomes true and `swipeOffset === 0`, use `cubic-bezier(0.34, 1.2, 0.64, 1)` instead of `ease-out`
- Close animation: keep 200ms ease-in (matches spec)
- Do NOT change the swipe gesture behavior — `swipeOffset > 0` disables transition for direct finger tracking

Desktop (side panel):
- Currently has no open/close animation
- Add: initial state `translateX(100%)`, open state `translateX(0)` with 300ms spring, close with 200ms ease-in
- Same CSS transition approach as MobileDrawer

**Guardrails (DO NOT):**
- Do NOT break the AudioDrawer's swipe-to-dismiss gesture — the spring timing only applies when `swipeOffset === 0` (not during active swipe)
- Do NOT remove the MobileDrawer's focus trap or keyboard handling
- Do NOT change the MobileDrawer's background color/border styling (`bg-hero-mid border border-white/15`)
- Do NOT add animation to the AudioPill — only the drawer

**Responsive behavior:**
- Desktop: AudioDrawer slides from right (translateX). MobileDrawer not visible on desktop.
- Mobile: MobileDrawer slides from right (translateX). AudioDrawer slides up from bottom (translateY).
- The AudioDrawer's direction is already responsive — preserve the existing `isMobile` / `isDesktop` checks

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| MobileDrawer slides in from right on open | unit | Verify `translate-x-0` class when open |
| MobileDrawer slides out on close | unit | Verify `translate-x-full` after close animation |
| MobileDrawer uses spring timing on open | unit | Verify cubic-bezier spring timing function |
| AudioDrawer mobile uses spring timing on open | unit | Verify spring timing when opening |
| AudioDrawer desktop slides from right | unit | Verify translateX transition on desktop |
| Reduced motion skips all drawer animations | unit | Mock reduced motion, verify instant show/hide |

**Expected state after completion:**
- [ ] MobileDrawer slides in from right with spring overshoot, slides out with ease-in
- [ ] AudioDrawer mobile bottom sheet opens with spring timing
- [ ] AudioDrawer desktop side panel slides in from right with spring timing
- [ ] All drawers respect reduced motion
- [ ] AudioDrawer swipe gesture is unaffected

---

### Step 9: Tab Animated Underlines + Content Fade (Batch 1)

**Objective:** Add animated sliding underline and content fade to Friends, PrayerWallProfile, and PrayerWallDashboard tabs.

**Files to modify:**
- `frontend/src/pages/Friends.tsx` — add animated underline + content fade
- `frontend/src/pages/PrayerWallProfile.tsx` — replace static `border-b-2` with animated underline + content fade
- `frontend/src/pages/PrayerWallDashboard.tsx` — replace static `border-b-2` with animated underline + content fade

**Details:**

**Animated underline pattern** (copy from DailyHub lines 375-383 / GrowPage lines 164-171):
```tsx
<div
  className="absolute bottom-0 h-0.5 bg-primary motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-in-out"
  style={{
    width: `${100 / TABS.length}%`,
    transform: `translateX(${activeTabIndex * 100}%)`,
  }}
  aria-hidden="true"
/>
```

**Friends.tsx:**
- Currently uses pill-style buttons (rounded-full, bg-primary for active)
- Add the animated underline BELOW the existing tab buttons (inside the tablist container)
- Keep the pill button styling but switch active state to text-only differentiation: active tab gets `text-white font-semibold`, inactive gets `text-white/60`
- Remove the solid background from active tab — the underline replaces it as the active indicator
- Add `relative` to the tab bar container for underline positioning
- Tab content: both panels use `hidden` attribute. Add a `motion-safe:animate-content-fade-in` keyframe on the visible panel. Use a `key` prop on the panel based on `activeTab` to re-trigger the animation on tab switch.

Wait — using `hidden` attribute means the element is display:none. We can't animate from display:none to display:block with a CSS transition. Alternative approach: replace `hidden` with `opacity-0 pointer-events-none absolute` for hidden panels and `opacity-100` for visible, with `transition-opacity duration-200`. But this changes layout behavior.

Simpler approach for content fade: When `activeTab` changes, set a `fadingIn` state to `true` with the panel starting at `opacity-0`, then use `requestAnimationFrame` to flip to `opacity-1` with a CSS transition. This creates a one-directional fade-in on tab switch.

For pages using conditional rendering (PrayerWallProfile, PrayerWallDashboard): the content mounts fresh on tab switch. Apply `motion-safe:animate-content-fade-in` class to the tab panel wrapper — the mount triggers the animation automatically.

For pages using `hidden` attribute (Friends): wrap tab panel content in a div with a `key={activeTab}` that has `motion-safe:animate-content-fade-in`. When the key changes (tab switches), React unmounts/remounts the inner div, triggering the animation.

**PrayerWallProfile.tsx:**
- Replace static `border-b-2 border-primary` active tab style with animated underline
- Remove `border-b-2 border-primary` from individual tab button active state
- Add positioned underline element in the tab bar
- Tab content: already conditionally rendered — wrap each panel in a div with `motion-safe:animate-content-fade-in`

**PrayerWallDashboard.tsx:**
- Same approach as PrayerWallProfile — animated underline + content fade on mount
- Has 5 tabs with `overflow-x-auto` for mobile scrolling — ensure underline handles scroll offset correctly
- Since the tab bar scrolls horizontally on mobile, the underline width calculation uses `100 / TAB_COUNT %` and translateX based on `activeTabIndex * 100%`

**Guardrails (DO NOT):**
- Do NOT remove ARIA attributes (`role="tablist"`, `role="tab"`, `role="tabpanel"`, `aria-selected`, etc.)
- Do NOT change tab keyboard navigation (ArrowRight/Left, Home/End)
- Do NOT break the PrayerWallDashboard's horizontal scroll on mobile
- Do NOT change the Friends tab content from `hidden` attribute to conditional rendering — keep the `hidden` approach for state preservation
- Do NOT animate the underline on `prefers-reduced-motion` — use `motion-safe:` prefix on the transition

**Responsive behavior:**
- Desktop (1440px): Underline slides smoothly between tabs
- Tablet (768px): Same behavior
- Mobile (375px): PrayerWallDashboard tabs scroll horizontally — underline moves within the scrolling container

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Friends tabs have animated underline | integration | Verify underline element with transition-transform class exists |
| Friends tab content fades in on switch | integration | Switch tab, verify content has `animate-content-fade-in` |
| PrayerWallProfile underline animates | integration | Switch tab, verify underline translateX updates |
| PrayerWallDashboard underline animates | integration | Switch between 5 tabs, verify underline position |
| Reduced motion disables underline transition + fade | integration | Mock reduced motion, verify no transition classes |

**Expected state after completion:**
- [ ] Friends page has animated sliding underline below tabs
- [ ] PrayerWallProfile has animated sliding underline (replaces static border)
- [ ] PrayerWallDashboard has animated sliding underline (replaces static border)
- [ ] All three pages fade in tab content on switch
- [ ] All animations respect reduced motion

---

### Step 10: Tab Content Fade (Batch 2)

**Objective:** Add content fade to DailyHub, GrowPage, and Settings tab switches.

**Files to modify:**
- `frontend/src/pages/DailyHub.tsx` — content fade on tab panel reveal
- `frontend/src/pages/GrowPage.tsx` — content fade on tab panel reveal
- `frontend/src/pages/Settings.tsx` — content fade on section switch

**Details:**

**DailyHub.tsx:**
- Already has animated underline (lines 375-383) — do NOT change it
- Tab panels use `hidden` attribute on always-mounted content
- Add content fade: wrap each `<div role="tabpanel" ...>` inner content in a container with `key={activeTab}` and `motion-safe:animate-content-fade-in`
- The `key` prop forces React to remount the inner container on tab switch, triggering the fade-in animation
- Alternatively: maintain a `fadeKey` state that increments on tab change and apply `motion-safe:animate-content-fade-in` with that key

**GrowPage.tsx:**
- Already has animated underline (lines 164-171) — do NOT change it
- Tab panels use `hidden` attribute
- Same approach as DailyHub: add `key`-based fade wrapper inside each tab panel

**Settings.tsx:**
- Mobile tabs and desktop sidebar both switch content
- Content uses conditional rendering (`{activeSection === 'X' && ...}`)
- Since content remounts on section switch, apply `motion-safe:animate-content-fade-in` class directly to each `role="tabpanel"` wrapper div
- This works because each section is freshly mounted when selected

For all `hidden`-based tabs: use `motion-safe:` prefix on the `animate-content-fade-in`. When `prefers-reduced-motion` is set, `motion-safe:` prevents the animation from running — content appears instantly.

**Guardrails (DO NOT):**
- Do NOT modify the existing animated underlines in DailyHub or GrowPage
- Do NOT change DailyHub's sticky tab bar behavior or IntersectionObserver sentinel
- Do NOT change Settings' desktop sidebar pattern — only add fade to the content panel
- Do NOT change from `hidden` attribute to conditional rendering in DailyHub/GrowPage — this would break state preservation (e.g., journal draft, meditation progress)
- Do NOT add an underline to Settings tabs — they use sidebar (desktop) and underline (mobile) patterns that are separate concerns

**Responsive behavior:**
- Desktop (1440px): Content fades in identically
- Tablet (768px): Same
- Mobile (375px): Same

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| DailyHub tab content fades on switch | integration | Switch tabs, verify `animate-content-fade-in` on content |
| GrowPage tab content fades on switch | integration | Switch tabs, verify `animate-content-fade-in` on content |
| Settings section content fades on switch | integration | Switch sections, verify `animate-content-fade-in` |
| Reduced motion disables content fade | integration | Mock reduced motion, verify no animation |

**Expected state after completion:**
- [ ] DailyHub content gently fades in on tab switch
- [ ] GrowPage content fades in on tab switch
- [ ] Settings content fades in on section switch
- [ ] Existing underline animations in DailyHub/GrowPage are unchanged
- [ ] All animations respect reduced motion

---

### Step 11: Toast Animation Upgrade

**Objective:** Replace toast entrance/exit animations with spring-based scale+fade+lift.

**Files to modify:**
- `frontend/src/components/ui/Toast.tsx` — replace animation classes

**Details:**

**Standard toasts** (currently `motion-safe:animate-slide-from-right`):
- Replace with: `motion-safe:animate-toast-spring-in` (scale 0.8→1 + opacity 0→1 + translateY 8→0, 300ms spring)
- The toast appears from bottom-right with a slight bounce

**Celebration toasts** (currently `motion-safe:animate-slide-from-bottom` or `motion-safe:animate-slide-from-right`):
- Keep the existing slide direction but replace the timing function with spring: replace `ease-out` timing with `cubic-bezier(0.34, 1.3, 0.64, 1)` for bouncier feel
- If the current animation class is a Tailwind utility, create a new class or override the timing via inline style

**Toast exit** (all types):
- Add exit animation: `motion-safe:animate-toast-out` (scale 1→0.95 + opacity 1→0, 200ms ease-out)
- Currently toasts likely just unmount — add a closing state similar to the modal pattern (set `isExiting` state, wait for animation, then remove)
- If the toast auto-dismiss already has a timeout, trigger the exit animation before removing from the list

**Confetti particles on celebration toasts:** Leave unchanged — they already have their own animation.

**Guardrails (DO NOT):**
- Do NOT change toast auto-dismiss durations (6000ms standard, 4000ms/5000ms celebration)
- Do NOT change the toast positioning (top-right for standard, bottom for celebration)
- Do NOT change confetti particle animation — only the toast container animation
- Do NOT remove `motion-reduce:hidden` from confetti particles

**Responsive behavior:**
- Desktop: Toasts appear top-right (standard) or bottom (celebration) — same animation
- Mobile: Same positioning and animation

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Standard toast uses spring entrance | unit | Show toast, verify `animate-toast-spring-in` class |
| Celebration toast has spring timing | unit | Show celebration toast, verify spring timing function |
| Toast exit animation plays before removal | unit | Dismiss toast, verify `animate-toast-out` class before unmount |
| Reduced motion skips all toast animation | unit | Mock reduced motion, verify instant show/hide |

**Expected state after completion:**
- [ ] Standard toasts enter with scale+fade+lift spring animation
- [ ] Celebration toasts use spring timing for bouncier feel
- [ ] All toasts exit with scale-down + fade
- [ ] Reduced motion causes instant appearance/disappearance

---

### Step 12: Prayer Card Interaction Pulse + Bible Content Fade-In

**Objective:** Add subtle scale pulse to prayer cards on "Pray for this" and bookmark interactions, and add content fade-in to Bible chapter loading.

**Files to modify:**
- `frontend/src/components/prayer-wall/PrayerCard.tsx` — add pulse animation state
- `frontend/src/components/prayer-wall/InteractionBar.tsx` — trigger pulse callback on pray/bookmark
- `frontend/src/pages/BibleReader.tsx` — fade-in on chapter content load

**Details:**

**Prayer Card Pulse:**

PrayerCard.tsx:
- Add a `isPulsing` state (boolean)
- When `isPulsing` is true, apply `motion-safe:animate-card-pulse` class to the card's root element
- After 300ms (animation duration), reset `isPulsing` to false
- Expose an `onPulse` callback or use a ref-based approach for InteractionBar to trigger the pulse

InteractionBar.tsx:
- On "Pray for this" click (line 60, inside `handlePrayClick`): call the pulse trigger on the parent PrayerCard
- On bookmark toggle (line 152): call the same pulse trigger
- On save to prayer list: call the same pulse trigger
- Implementation approach: PrayerCard passes a `triggerPulse` function via React context or callback prop to InteractionBar. Alternatively, PrayerCard wraps InteractionBar children and listens for specific events.

Simplest approach: PrayerCard accepts an `isPulsing` prop or uses a `pulseKey` prop (number that increments to trigger animation). InteractionBar calls a callback `onCardPulse()` which increments the key in the parent (PrayerWall page). The PrayerCard receives the pulseKey and re-triggers animation.

Even simpler: PrayerCard manages its own pulse state, and InteractionBar triggers it via a shared ref or context.

**Bible Content Fade-In:**

BibleReader.tsx:
- Currently: loading state shows "Loading..." text, then verses render instantly (line 571)
- Add: when `isLoading` transitions from `true` to `false` (verses loaded), wrap the verse content in a div with `motion-safe:animate-content-fade-in`
- Track a `contentKey` that changes when chapter changes, so the fade plays each time a new chapter loads
- With `prefers-reduced-motion`: instant render, no fade

**Guardrails (DO NOT):**
- Do NOT change the prayer card hover shadow effect (`lg:hover:shadow-md`)
- Do NOT change the existing pray ripple, icon pulse, or float-text animations in InteractionBar — only ADD the card-level pulse alongside them
- Do NOT change BibleReader's scroll-to-verse or hash-based highlighting behavior
- Do NOT add animation to BibleReader's error/retry state — only the success transition

**Responsive behavior:**
- Desktop (1440px): Card pulse visible at full card width. Bible content fades identically.
- Tablet (768px): Same
- Mobile (375px): Same

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Prayer card pulses on "Pray for this" | integration | Click pray button, verify card gets `animate-card-pulse` class |
| Prayer card pulses on bookmark | integration | Click bookmark, verify pulse |
| Pulse auto-clears after animation | unit | Verify `isPulsing` resets to false after 300ms |
| Bible content fades in on load | integration | Navigate to chapter, verify `animate-content-fade-in` on content |
| Reduced motion skips pulse and fade | integration | Mock reduced motion, verify no animation classes |

**Expected state after completion:**
- [ ] Prayer card subtly pulses when "Pray for this" is tapped
- [ ] Prayer card pulses on bookmark and save-to-prayer-list
- [ ] Bible chapter content fades in when loading completes
- [ ] All animations respect reduced motion

---

### Step 13: Tests

**Objective:** Write comprehensive test suites for the two new shared components/hooks (PageTransition and useStaggeredEntrance) and a cross-cutting reduced-motion verification test.

**Files to create:**
- `frontend/src/components/ui/__tests__/PageTransition.test.tsx`
- `frontend/src/hooks/__tests__/useStaggeredEntrance.test.ts`

**Details:**

**PageTransition.test.tsx:**
- Test that children render
- Test that route change triggers exit/enter animation sequence
- Test that `prefers-reduced-motion: reduce` causes instant render
- Test cleanup of timeouts on rapid navigation
- Test that Navbar/Footer are not included in the transition
- Mock `useLocation` to simulate route changes
- Mock `window.matchMedia` for reduced motion testing

**useStaggeredEntrance.test.ts:**
- Test that `getStaggerProps(0)` returns 0ms delay
- Test that `getStaggerProps(n)` returns `n * staggerDelay` ms delay
- Test that items start with `opacity-0` before intersection
- Test that items get `animate-stagger-enter` class after intersection
- Test that `prefers-reduced-motion: reduce` returns no animation props
- Mock IntersectionObserver

**Cross-cutting reduced-motion check:**
Add a simple test in each test file that verifies all animation classes use the `motion-safe:` prefix or that reduced motion causes no animation. This is already covered by individual step tests but the shared component tests are the canonical verification.

**Guardrails (DO NOT):**
- Do NOT create snapshot tests — they are brittle for animation classes
- Do NOT test specific CSS computed values — test class names and inline styles
- Do NOT import actual CSS files in tests — rely on class name assertions

**Responsive behavior:** N/A: no UI impact — tests run in JSDOM

**Test specifications:**

*PageTransition tests:*
| Test | Type | Description |
|------|------|-------------|
| Renders children content | unit | Children visible in document |
| Applies page-enter animation on mount | unit | Verify animation class on wrapper |
| Triggers exit phase on route change | unit | Change location, verify opacity transition |
| Triggers enter phase after exit completes | unit | After 150ms, verify page-enter class |
| Skips animation with reduced motion | unit | Mock reduced motion, verify no animation classes |
| Cleans up timeout on unmount | unit | Unmount during exit, verify no state update |
| Handles rapid route changes | unit | Multiple location changes, verify final state is correct |

*useStaggeredEntrance tests:*
| Test | Type | Description |
|------|------|-------------|
| Returns opacity-0 before intersection | unit | Before inView, className includes opacity-0 |
| Returns stagger-enter after intersection | unit | After inView, className includes animate-stagger-enter |
| Computes correct delay for each index | unit | Index 3 with 50ms delay → `animationDelay: '150ms'` |
| Returns empty props with reduced motion | unit | Mock reduced motion, no className or style |
| containerRef is a valid ref object | unit | Ref is defined and attachable |

**Expected state after completion:**
- [ ] PageTransition test file passes all tests
- [ ] useStaggeredEntrance test file passes all tests
- [ ] `pnpm test` passes with no regressions
- [ ] All existing tests still pass (no animation-related test breakage)

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | CSS keyframes & animation classes |
| 2 | 1 | PageTransition component + App.tsx |
| 3 | 1 | useStaggeredEntrance hook |
| 4 | 1, 3 | Stagger: Prayer Wall + Bible Browser |
| 5 | 1, 3 | Stagger: Grow + Journal + My Prayers |
| 6 | 1, 3 | Stagger: Friends search + verify existing |
| 7 | 1 | Modal spring animations |
| 8 | 1 | Drawer spring animations |
| 9 | 1 | Tab underlines + content fade (batch 1) |
| 10 | 1 | Tab content fade (batch 2) |
| 11 | 1 | Toast animation upgrade |
| 12 | 1 | Prayer card pulse + Bible content fade |
| 13 | 2, 3 | Tests for shared components |

Steps 2-12 depend on Step 1 (CSS foundations) but are otherwise independent of each other. Steps 4-6 depend on Step 3 (hook). Step 13 depends on Steps 2 and 3.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | CSS Keyframes & Animation Classes | [COMPLETE] | 2026-03-27 | Added 10 keyframes + 10 animation classes to tailwind.config.js. No conflicts with existing animations. Build verified. |
| 2 | PageTransition Component + App.tsx | [COMPLETE] | 2026-03-27 | Created `components/ui/PageTransition.tsx` with phase-based fade-out/fade-in. Wrapped `<Routes>` in App.tsx. Uses `useReducedMotion` for instant swap. |
| 3 | useStaggeredEntrance Hook | [COMPLETE] | 2026-03-27 | Created `hooks/useStaggeredEntrance.ts`. Composes `useInView` + `useReducedMotion`. Returns `containerRef` + `getStaggerProps(index)`. |
| 4 | Stagger: Prayer Wall + Bible Browser | [COMPLETE] | 2026-03-27 | PrayerWall: 50ms stagger on card feed. TestamentAccordion: 30ms stagger on category groups. BibleSearchMode: 50ms stagger on search results. |
| 5 | Stagger: Grow + Journal + My Prayers | [COMPLETE] | 2026-03-27 | ReadingPlans: 80ms stagger on plan grid. Challenges: 80ms stagger across active/upcoming/past sections. JournalTabContent: 50ms on entries. MyPrayers: 50ms on prayer items (edit form excluded). |
| 6 | Stagger: Friends Search + Verify Existing | [COMPLETE] | 2026-03-27 | FriendSearch: 50ms stagger on search results. LeaderboardRow: updated delay from 50ms to 30ms per spec. DashboardWidgetGrid: verified unchanged (100ms). |
| 7 | Modal Spring Animations | [COMPLETE] | 2026-03-27 | AuthModal: spring-in/out with delayed unmount + backdrop fade. DeletePrayerDialog + ReportDialog: same pattern. All use useReducedMotion for instant show/hide. |
| 8 | Drawer Spring Animations | [COMPLETE] | 2026-03-27 | MobileDrawer: converted from dropdown-in to fixed right-panel slide with spring cubic-bezier + close animation. AudioDrawer: spring timing on open via isEntering state, swipe gesture preserved. |
| 9 | Tab Underlines + Content Fade (Batch 1) | [COMPLETE] | 2026-03-27 | Friends: animated underline + text-only active style + content fade. PrayerWallProfile: replaced static border-b-2 with animated underline + content fade via key. PrayerWallDashboard: same pattern with 5 tabs + scroll preserved. |
| 10 | Tab Content Fade (Batch 2) | [COMPLETE] | 2026-03-27 | DailyHub: content-fade-in on all 4 tabpanels. GrowPage: same on both panels. Settings: key-based remount + content-fade-in. Existing underlines untouched. |
| 11 | Toast Animation Upgrade | [COMPLETE] | 2026-03-27 | Standard + celebration toasts: spring entrance (toast-spring-in). Exit animation (toast-out, 200ms) via exitingIds state before DOM removal. Confetti unchanged. |
| 12 | Prayer Card Pulse + Bible Content Fade | [COMPLETE] | 2026-03-27 | PrayerCard: pulse via PulseContext + triggerPulse callback. InteractionBar: triggers pulse on pray/bookmark/save. BibleReader: content-fade-in with chapter key. |
| 13 | Tests | [COMPLETE] | 2026-03-27 | PageTransition.test.tsx (7 tests), useStaggeredEntrance.test.ts (6 tests) — all pass. Fixed Toast/CelebrationQueue/Journal/PrayerWallActivity/PrayCeremony/DevotionalTabContent test timing for exit animation delays and stagger re-render effects. 4625/4625 tests pass. |
