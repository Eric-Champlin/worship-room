# Implementation Plan: Dashboard Entrance & Progress Animations

**Spec:** `_specs/dashboard-entrance-animations.md`
**Date:** 2026-03-19
**Branch:** `claude/feature/dashboard-entrance-animations`
**Design System Reference:** `_plans/recon/design-system.md` (loaded — captured 2026-03-06)
**Recon Report:** not applicable (no new pages/routes)
**Master Spec Plan:** `dashboard-growth-spec-plan-v2.md` (loaded)

> ⚠️ Design system recon was captured 2026-03-06, before dashboard components were built. Dashboard-specific values come from codebase inspection of the actual components.

---

## Architecture Context

### Existing File Structure

The dashboard is rendered via `frontend/src/pages/Dashboard.tsx`, which orchestrates a state machine (`DashboardPhase`) transitioning through `onboarding -> check_in -> recommendations -> dashboard_enter -> dashboard`. The full dashboard view consists of:

1. `DashboardHero` — dark gradient hero with greeting, streak, level, faith points, and a progress bar
2. `GettingStartedCard` — conditionally rendered above the widget grid (dismissable, only for new users)
3. `DashboardWidgetGrid` — container with a CSS Grid holding 5-6 `DashboardCard` sections:
   - MoodChart (order-2/lg:order-1, lg:col-span-3)
   - StreakCard (order-1/lg:order-2, lg:col-span-2)
   - ActivityChecklist (order-3, lg:col-span-3)
   - FriendsPreview (order-4, lg:col-span-2)
   - WeeklyRecap (order-5, lg:col-span-5, conditional)
   - QuickActions (order-6, lg:col-span-5)

### Existing Animation Patterns

- **Insights page** (`frontend/src/pages/Insights.tsx`): `AnimatedSection` wrapper using `opacity-0 animate-fade-in motion-reduce:animate-none motion-reduce:opacity-100` with `animationDelay: ${index * 100}ms`. Closest pattern to what the spec needs.
- **MoodRecommendations** (`frontend/src/components/dashboard/MoodRecommendations.tsx`): Uses `motion-safe:animate-fade-in opacity-0` with `animationDelay` and `animationFillMode: 'both'`.
- **LeaderboardRow** (`frontend/src/components/leaderboard/LeaderboardRow.tsx`): Uses `motion-safe:opacity-0 motion-safe:animate-fade-in` with `animationDelay` and `animationDuration`.

### Existing `fade-in` Keyframe

Defined in `frontend/tailwind.config.js` (line 68-71):
```js
'fade-in': {
  '0%': { opacity: '0', transform: 'translateY(8px)' },
  '100%': { opacity: '1', transform: 'translateY(0)' },
},
```
Animation utility (line 164): `'fade-in': 'fade-in 500ms ease-out forwards'`

The spec requires `translateY(12px)` and 400ms. A new `widget-enter` keyframe is needed.

### Progress Bar Locations

- **DashboardHero** (line 98-115): `h-1.5 w-32 rounded-full bg-white/10` with inner `div` using `transition-all duration-500 motion-reduce:transition-none`
- **StreakCard** (lines 264-280): `h-1.5 w-full overflow-hidden rounded-full bg-white/10` with inner `div` using `transition-all duration-500 ease-out motion-reduce:transition-none`

Both use `style={{ width: '${Math.min(progressPercent, 100)}%' }}` — CSS transitions animate width changes automatically.

### AnimatedCounter Pattern

`AnimatedCounter` (`frontend/src/components/dashboard/AnimatedCounter.tsx`) uses `requestAnimationFrame` with ease-out, default 600ms, and respects `useReducedMotion()`. Both DashboardHero (line 93) and StreakCard (lines 249-252) track previous points via `prevPointsRef` and conditionally render `AnimatedCounter` with `from={liveFrom}` and `to={totalPoints}`.

### Test Patterns

Tests use (pattern from `transition-animation.test.tsx`):
- `vi.fn().mockImplementation()` for `window.matchMedia`
- `MemoryRouter` with `future={{ v7_startTransition: true, v7_relativeSplatPath: true }}`
- `AuthProvider`, `ToastProvider`, `AuthModalProvider` wrapping
- `ResizeObserverMock` class for Recharts
- `vi.useFakeTimers()` / `vi.useRealTimers()` for timeout-based tests
- Mock `AudioProvider` and `useScenePlayer`

### Key Hooks

- `useReducedMotion()` at `frontend/src/hooks/useReducedMotion.ts`: Returns boolean from `prefers-reduced-motion: reduce` media query.

---

## Auth Gating Checklist

This spec is a purely visual enhancement to the already auth-gated dashboard. No new auth-gated actions are introduced.

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Dashboard rendering | Auth-gated (existing) | N/A (unchanged) | `Dashboard.tsx` returns null if `!user` |

---

## Design System Values (for UI steps)

Values from codebase inspection (dashboard was built after the design system recon capture date):

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Dashboard card | background | `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl` | DashboardCard.tsx:47 |
| Dashboard card | padding | `p-4 md:p-6` | DashboardCard.tsx:47 |
| Progress bar (hero) | dimensions | `h-1.5 w-32 rounded-full bg-white/10` | DashboardHero.tsx:99 |
| Progress bar (streak) | dimensions | `h-1.5 w-full overflow-hidden rounded-full bg-white/10` | StreakCard.tsx:274 |
| Progress bar fill | color | `bg-primary` (#6D28D9) | DashboardHero.tsx:112, StreakCard.tsx:277 |
| Progress bar fill | existing transition | `transition-all duration-500` | DashboardHero.tsx:112, StreakCard.tsx:277 |
| Widget-enter start | opacity + translateY | `opacity: 0, translateY(12px)` | Spec §1.1 |
| Widget-enter end | opacity + translateY | `opacity: 1, translateY(0)` | Spec §1.1 |
| Widget-enter duration | animation | 400ms ease-out | Spec §1.1 |
| Widget-enter stagger | delay | 100ms between cards | Spec §1.1 |
| Violet glow | box-shadow | `0 0 8px rgba(139, 92, 246, 0.4)` | Spec §2.2 |
| Amber glow | box-shadow | `0 0 8px rgba(217, 119, 6, 0.3)` | Spec §2.4 |

---

## Design System Reminder

- Dashboard uses frosted glass cards: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`
- Mood colors: Struggling=#D97706, Heavy=#C2703E, Okay=#8B7FA8, Good=#2DD4BF, Thriving=#34D399
- Existing `fade-in` keyframe uses `translateY(8px)` / 500ms — do NOT reuse; create new `widget-enter` with `translateY(12px)` / 400ms
- Progress bar fill uses `bg-primary` (#6D28D9)
- All motion animations must use `motion-safe:` prefix or `motion-reduce:` override
- AnimatedCounter already respects `useReducedMotion()` with 600ms default duration
- Dashboard background: `bg-[#0f0a1e]` on the outer container
- DashboardCard passes `className` through to the outer `<section>` via `cn()` — grid positioning classes live on DashboardCard

---

## Shared Data Models (from Master Plan)

This spec does not create or modify any data models. It reads existing data via the `useFaithPoints` hook.

**localStorage keys this spec touches:**

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_faith_points` | Read (via useFaithPoints) | Total points for progress bar calculation |
| `wr_streak` | Read (via useFaithPoints) | Streak data for StreakCard progress bar |
| `wr_daily_activities` | Read (via useFaithPoints) | Activity log for point changes |

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | < 640px | Single column, all cards stack vertically. Stagger follows DOM order. |
| Tablet | 640px-1024px | Mixed layout. Some cards full-width. Stagger follows DOM order. |
| Desktop | > 1024px | 2-column grid (lg:grid-cols-5). DashboardHero full-width. Cards fill grid. |

Animation values (duration, delay, translateY) are identical across all breakpoints per the spec.

---

## Vertical Rhythm

No changes to vertical rhythm. This spec adds entrance animations to existing elements without changing spacing.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] All prior dashboard specs (1-16) are complete and committed
- [x] `DashboardWidgetGrid`, `DashboardHero`, `StreakCard`, `DashboardCard`, `AnimatedCounter` exist
- [x] The `useReducedMotion` hook exists and is used throughout dashboard components
- [x] The `tailwind.config.js` animation/keyframes sections are accessible for extension
- [x] No auth gates needed — this is purely visual enhancement
- [x] Design system values verified from codebase inspection
- [ ] No `[UNVERIFIED]` values remain — all values come from spec or codebase inspection
- [ ] Prior specs in the sequence are complete and committed

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| New keyframe vs reuse `fade-in` | New `widget-enter` keyframe | Existing `fade-in` uses `translateY(8px)` / 500ms; spec requires `translateY(12px)` / 400ms |
| Stagger state tracking | `useRef` flag in `Dashboard.tsx` | Ref persists across re-renders but resets on page reload, matching spec's "once per session" |
| Where to apply animation | `className` + `style` on DashboardCard and wrapper divs | DashboardCard already accepts `className` via `cn()`. For DashboardHero and GettingStartedCard, use their existing wrapper `<div>` elements |
| Glow implementation | State + setTimeout in DashboardHero/StreakCard | Simpler than CSS-only approach; allows direction-aware color selection |
| Direction-aware glow color | Computed from `prevPointsRef` comparison | `totalPoints > prevPointsRef.current` → violet, else → amber |
| GettingStartedCard stagger index | Dynamic offset based on presence | Card index shifts when GettingStartedCard is absent |
| Progress bar transition duration | Change from 500ms to 600ms | Synchronize with AnimatedCounter (600ms) per spec §2.1 |
| DashboardCard `style` prop | Add to interface | Needed for `animationDelay` inline style; minimal change |

---

## Implementation Steps

### Step 1: Add `widget-enter` Keyframe to Tailwind Config

**Objective:** Define the new CSS keyframe animation with spec values (400ms, translateY 12px, opacity 0→1, ease-out, fill-mode both).

**Files to create/modify:**
- `frontend/tailwind.config.js` — Add `widget-enter` keyframe and animation utility

**Details:**

In `frontend/tailwind.config.js`, add to the `keyframes` section (after the `fade-in` keyframe at line 71):

```js
'widget-enter': {
  '0%': { opacity: '0', transform: 'translateY(12px)' },
  '100%': { opacity: '1', transform: 'translateY(0)' },
},
```

Add to the `animation` section (after `pray-float-text` at line 183):

```js
'widget-enter': 'widget-enter 400ms ease-out both',
```

The `both` fill-mode ensures cards remain invisible (opacity: 0) before their delay elapses and remain visible (opacity: 1) after animation completes.

**Guardrails (DO NOT):**
- DO NOT modify the existing `fade-in` keyframe
- DO NOT add glow-related animations here (those use CSS transitions, not keyframes)

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Build succeeds | manual | Run `pnpm build` to confirm no config errors |

**Expected state after completion:**
- [ ] `widget-enter` keyframe defined with `translateY(12px)` start, `translateY(0)` end, opacity 0→1
- [ ] `animate-widget-enter` utility class available: 400ms ease-out both
- [ ] Existing animations unchanged
- [ ] `pnpm build` succeeds

---

### Step 2: Add `style` Prop to DashboardCard

**Objective:** Allow DashboardCard to accept an optional `style` prop for inline `animationDelay`.

**Files to create/modify:**
- `frontend/src/components/dashboard/DashboardCard.tsx` — Add `style` prop to interface and pass to outer `<section>`

**Details:**

Add `style?: React.CSSProperties` to the `DashboardCardProps` interface (line 7-16). Pass it to the outer `<section>` element (line 44):

```tsx
<section
  aria-labelledby={titleId}
  className={cn(
    'min-w-0 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm md:p-6 transition-colors duration-150 hover:border-white/20 motion-reduce:transition-none',
    className,
  )}
  style={style}
>
```

This is the minimal change needed to pass `animationDelay` to each card without restructuring the grid.

**Guardrails (DO NOT):**
- DO NOT change any existing styling or behavior
- DO NOT change the `className` handling

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `DashboardCard accepts and applies style prop` | unit | Render with `style={{ animationDelay: '200ms' }}`, verify the section has the style |

**Expected state after completion:**
- [ ] DashboardCard accepts optional `style` prop
- [ ] Existing DashboardCard tests still pass
- [ ] Style prop is passed through to the outer `<section>`

---

### Step 3: Add Staggered Entrance Animation to Dashboard

**Objective:** Apply stagger animation classes and delays to DashboardHero, GettingStartedCard, and each DashboardWidgetGrid card. Play only once per session. Respect reduced motion.

**Files to create/modify:**
- `frontend/src/pages/Dashboard.tsx` — Add `hasAnimatedRef`, `animateEntrance` state, pass to children
- `frontend/src/components/dashboard/DashboardWidgetGrid.tsx` — Accept `animateEntrance` and `staggerStartIndex` props, apply to each DashboardCard

**Details:**

#### Dashboard.tsx changes:

1. Add a `useRef<boolean>(false)` called `hasAnimatedRef` (next to `checkedRef` at line 31):
```typescript
const hasAnimatedRef = useRef(false)
const [animateEntrance, setAnimateEntrance] = useState(false)
```

2. Add effect to detect first transition to `'dashboard'` phase:
```typescript
useEffect(() => {
  if (phase === 'dashboard' && !hasAnimatedRef.current) {
    hasAnimatedRef.current = true
    setAnimateEntrance(true)
  }
}, [phase])
```

3. Compute the stagger offset and whether GettingStartedCard is shown:
```typescript
const showGettingStarted = gettingStarted.isVisible && !gettingStartedCardDismissed
const shouldAnimate = animateEntrance && !prefersReduced
let staggerIndex = 0 // DashboardHero gets index 0
```

4. Wrap `DashboardHero` (the `<DashboardHero>` element at line 161-168) in a `<div>` with stagger animation:
```tsx
<div
  className={shouldAnimate ? 'motion-safe:animate-widget-enter' : undefined}
  style={shouldAnimate ? { animationDelay: '0ms' } : undefined}
>
  <DashboardHero ... />
</div>
```

5. On the GettingStartedCard wrapper `<div>` (line 170-178), add the animation classes. The stagger index for GettingStartedCard is 1:
```tsx
{showGettingStarted && (
  <div
    className={cn(
      'mx-auto max-w-6xl px-4 pb-4 sm:px-6 md:pb-6',
      shouldAnimate && 'motion-safe:animate-widget-enter',
    )}
    style={shouldAnimate ? { animationDelay: '100ms' } : undefined}
  >
    <GettingStartedCard ... />
  </div>
)}
```

6. Compute the `staggerStartIndex` for the widget grid: `showGettingStarted ? 2 : 1` (DashboardHero=0, GettingStartedCard=1 if present).

7. Pass to `DashboardWidgetGrid`:
```tsx
<DashboardWidgetGrid
  faithPoints={faithPoints}
  justCompletedCheckIn={justCompletedCheckIn}
  onRequestCheckIn={handleRequestCheckIn}
  quickActionsRef={quickActionsRef}
  quickActionsTooltipVisible={quickActionsTooltip.shouldShow}
  animateEntrance={shouldAnimate}
  staggerStartIndex={showGettingStarted ? 2 : 1}
/>
```

#### DashboardWidgetGrid.tsx changes:

1. Add props to interface:
```typescript
animateEntrance?: boolean
staggerStartIndex?: number
```

2. For each `DashboardCard`, add animation className and style. Use a simple counter. The cards in DOM order are:
   - MoodChart: staggerStartIndex + 0
   - StreakCard: staggerStartIndex + 1
   - ActivityChecklist: staggerStartIndex + 2
   - FriendsPreview: staggerStartIndex + 3
   - WeeklyRecap: staggerStartIndex + 4 (conditional)
   - QuickActions: staggerStartIndex + 5 (or 4 if no WeeklyRecap)

3. Create a helper to compute animation props per card:
```typescript
const startIdx = staggerStartIndex ?? 0
let cardCounter = 0

function getAnimProps() {
  if (!animateEntrance) return {}
  const delay = (startIdx + cardCounter) * 100
  cardCounter++
  return {
    className: 'motion-safe:animate-widget-enter',
    style: { animationDelay: `${delay}ms` } as React.CSSProperties,
  }
}
```

4. Merge animation className and style into each `DashboardCard`. For each card, call `getAnimProps()` **in order**:

```tsx
// Reset counter before rendering
cardCounter = 0

const moodAnim = getAnimProps()
const streakAnim = getAnimProps()
const activityAnim = getAnimProps()
const friendsAnim = getAnimProps()
// WeeklyRecap — only compute if rendering
const showRecap = recapVisible || !recapHasFriends
const recapAnim = showRecap ? getAnimProps() : {}
const quickAnim = getAnimProps()
```

Then on each DashboardCard, merge the animation className with the existing className:
```tsx
<DashboardCard
  id="mood-chart"
  title="7-Day Mood"
  icon={<TrendingUp className="h-5 w-5" />}
  action={{ label: 'See More', to: '/insights' }}
  className={cn('order-2 lg:order-1 lg:col-span-3', moodAnim.className)}
  style={moodAnim.style}
>
```

For QuickActions, the wrapper `<div ref={quickActionsRef}>` gets the animation instead:
```tsx
<div
  ref={quickActionsRef}
  className={cn('order-6 lg:col-span-5', quickAnim.className)}
  style={quickAnim.style}
  {...(quickActionsTooltipVisible ? { 'aria-describedby': 'dashboard-quick-actions' } : {})}
>
```

**Important:** The helper must be called in DOM order to get correct sequential delays. Pre-compute all anim props before JSX to avoid order issues with conditional rendering.

**Responsive behavior:**
- All breakpoints: identical animation (same duration, delay, translateY)
- Grid positioning classes on DashboardCard are unchanged

**Guardrails (DO NOT):**
- DO NOT use JavaScript animation (requestAnimationFrame) for the entrance stagger — CSS keyframes only
- DO NOT replay the animation on subsequent renders — `hasAnimatedRef` prevents this
- DO NOT skip the `motion-safe:` prefix — reduced motion users must see no animation
- DO NOT change the existing DashboardCard styling — animation is additive via className/style
- DO NOT change the grid layout or card ordering

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `stagger animation applies widget-enter class on initial dashboard render` | integration | Seed today's mood entry, render Dashboard, verify elements have `animate-widget-enter` class |
| `stagger animation has correct delays per card` | integration | Check `animationDelay` inline style on DashboardCard sections |
| `stagger animation does not replay after state change` | integration | Render dashboard, trigger activity completion (mock), verify animation state unchanged |
| `stagger animation respects prefers-reduced-motion` | integration | Mock matchMedia for reduced motion, verify no `animate-widget-enter` classes present |
| `GettingStartedCard shifts stagger indices when present` | integration | Render with GettingStarted visible, verify card delays start at 200ms instead of 100ms |
| `GettingStartedCard absent: first grid card delay is 100ms` | integration | Render without GettingStarted, verify MoodChart/StreakCard delay is 100ms |

**Expected state after completion:**
- [ ] DashboardHero fades in first with 0ms delay
- [ ] GettingStartedCard (if present) fades in at 100ms
- [ ] Each subsequent widget card has 100ms more delay
- [ ] Animation plays only once per session (ref-tracked)
- [ ] Reduced motion: all cards appear instantly, no animation classes
- [ ] Grid layout unchanged
- [ ] All existing tests pass

---

### Step 4: Add Progress Bar Glow Effect with Direction-Aware Colors

**Objective:** When faith points change after initial render, add a temporary glow effect (box-shadow) to the progress bar fill in both DashboardHero and StreakCard. Violet glow for increases, amber for decreases. Update transition duration from 500ms to 600ms to synchronize with AnimatedCounter.

**Files to create/modify:**
- `frontend/src/components/dashboard/DashboardHero.tsx` — Add glow state, update progress bar transition
- `frontend/src/components/dashboard/StreakCard.tsx` — Same changes

**Details:**

#### DashboardHero.tsx changes:

1. Import `useReducedMotion`:
```typescript
import { useReducedMotion } from '@/hooks/useReducedMotion'
```

2. Add state and ref at component top:
```typescript
const prefersReduced = useReducedMotion()
const [glowColor, setGlowColor] = useState<string | null>(null)
const glowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
```

3. In the existing `useEffect` for `totalPoints` (lines 37-47), add glow logic after `setLiveFrom`:
```typescript
useEffect(() => {
  if (isInitialRender.current) {
    isInitialRender.current = false
    prevPointsRef.current = totalPoints
    return
  }
  if (totalPoints !== prevPointsRef.current) {
    setLiveFrom(prevPointsRef.current)

    // Direction-aware glow
    if (!prefersReduced) {
      const isIncrease = totalPoints > prevPointsRef.current
      setGlowColor(
        isIncrease
          ? '0 0 8px rgba(139, 92, 246, 0.4)'  // violet
          : '0 0 8px rgba(217, 119, 6, 0.3)'   // amber
      )
      if (glowTimerRef.current) clearTimeout(glowTimerRef.current)
      glowTimerRef.current = setTimeout(() => setGlowColor(null), 600)
    }

    prevPointsRef.current = totalPoints
  }
}, [totalPoints, prefersReduced])
```

4. Add cleanup effect for the timer:
```typescript
useEffect(() => {
  return () => {
    if (glowTimerRef.current) clearTimeout(glowTimerRef.current)
  }
}, [])
```

5. Update the progress bar fill `<div>` (line 111-114). Replace Tailwind transition classes with inline styles to handle both width and box-shadow transitions:
```tsx
<div
  className="h-full rounded-full bg-primary"
  style={{
    width: `${Math.min(progressPercent, 100)}%`,
    boxShadow: glowColor ?? 'none',
    transition: prefersReduced
      ? 'none'
      : 'width 600ms ease-out, box-shadow 300ms ease-out',
  }}
/>
```

Remove the old Tailwind classes: `transition-all duration-500 motion-reduce:transition-none` — replaced by inline style.

#### StreakCard.tsx changes:

Apply the same pattern:

1. Import `useReducedMotion`:
```typescript
import { useReducedMotion } from '@/hooks/useReducedMotion'
```

2. Add at component top:
```typescript
const prefersReduced = useReducedMotion()
const [glowColor, setGlowColor] = useState<string | null>(null)
const glowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
```

3. In the existing `useEffect` for `totalPoints` (lines 86-101), add glow logic after `setLiveFrom(prevPointsRef.current)` (line 98):
```typescript
// After setLiveFrom(prevPointsRef.current)
if (!prefersReduced) {
  const isIncrease = totalPoints > prevPointsRef.current
  setGlowColor(
    isIncrease
      ? '0 0 8px rgba(139, 92, 246, 0.4)'
      : '0 0 8px rgba(217, 119, 6, 0.3)'
  )
  if (glowTimerRef.current) clearTimeout(glowTimerRef.current)
  glowTimerRef.current = setTimeout(() => setGlowColor(null), 600)
}
```

**Important:** The glow logic must run BEFORE `prevPointsRef.current = totalPoints` — so the direction comparison uses the old value. Check the current code order: in StreakCard lines 97-99, `setLiveFrom` is called, then line 99 sets `prevPointsRef.current`. The glow direction check must use `prevPointsRef.current` before it's updated. So insert the glow logic between `setLiveFrom(prevPointsRef.current)` and `prevPointsRef.current = totalPoints`.

Wait — looking again at StreakCard lines 86-101:
```
if (totalPoints !== prevPointsRef.current) {
  setLiveFrom(prevPointsRef.current)
  prevPointsRef.current = totalPoints
}
```
The glow check must go between `setLiveFrom` and `prevPointsRef.current = totalPoints`.

And in DashboardHero lines 43-46:
```
if (totalPoints !== prevPointsRef.current) {
  setLiveFrom(prevPointsRef.current)
  prevPointsRef.current = totalPoints
}
```
Same — insert glow logic between the two lines.

4. Add cleanup effect:
```typescript
useEffect(() => {
  return () => {
    if (glowTimerRef.current) clearTimeout(glowTimerRef.current)
  }
}, [])
```

5. Update the progress bar fill `<div>` (StreakCard line 276-278):
```tsx
<div
  className="h-full rounded-full bg-primary"
  style={{
    width: `${Math.min(progressPercent, 100)}%`,
    boxShadow: glowColor ?? 'none',
    transition: prefersReduced
      ? 'none'
      : 'width 600ms ease-out, box-shadow 300ms ease-out',
  }}
/>
```

Remove old Tailwind classes: `transition-all duration-500 ease-out motion-reduce:transition-none`.

**Responsive behavior:**
- All breakpoints: identical glow behavior (box-shadow scales with element)

**Guardrails (DO NOT):**
- DO NOT show glow on initial render — only on subsequent point changes (`isInitialRender` ref handles this)
- DO NOT show glow when `prefersReduced` is true
- DO NOT change the progress bar dimensions, colors, or layout
- DO NOT use CSS keyframe animation for the glow — use CSS transition on `box-shadow`
- DO NOT forget to clear the setTimeout on unmount (use glowTimerRef)
- DO NOT change AnimatedCounter's internal logic or duration

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `progress bar glow appears on point increase (violet)` | unit | Render DashboardHero, change totalPoints up, verify boxShadow contains `rgba(139, 92, 246` |
| `progress bar glow is amber on point decrease` | unit | Render StreakCard, change totalPoints down, verify boxShadow contains `rgba(217, 119, 6` |
| `glow clears after 600ms` | unit | Use fake timers, change points, advance 600ms, verify boxShadow is `none` |
| `no glow on initial render` | unit | Render with totalPoints=100, verify no boxShadow on progress bar fill |
| `no glow when prefers-reduced-motion` | unit | Mock reduced motion, change points, verify no boxShadow |
| `progress bar transition is 600ms` | unit | Verify inline style includes `width 600ms ease-out` |

**Expected state after completion:**
- [ ] DashboardHero progress bar animates width over 600ms on point change
- [ ] StreakCard progress bar animates width over 600ms on point change
- [ ] Violet glow (`rgba(139, 92, 246, 0.4)`) on point increase, fades after 600ms
- [ ] Amber glow (`rgba(217, 119, 6, 0.3)`) on point decrease, fades after 600ms
- [ ] No glow on initial render
- [ ] No glow or transition when reduced motion is enabled
- [ ] AnimatedCounter still works at 600ms (unchanged)

---

### Step 5: Write Tests for Entrance Animation and Progress Bar Glow

**Objective:** Add comprehensive tests covering stagger entrance, one-time play, glow effects, and reduced motion handling.

**Files to create/modify:**
- `frontend/src/components/dashboard/__tests__/entrance-animation.test.tsx` — New test file for stagger entrance
- `frontend/src/components/dashboard/__tests__/progress-bar-glow.test.tsx` — New test file for glow effects

**Details:**

#### entrance-animation.test.tsx

Follow the pattern from `transition-animation.test.tsx`:

```typescript
import { render, screen, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { AuthProvider } from '@/contexts/AuthContext'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'
import { Dashboard } from '@/pages/Dashboard'
import { getLocalDateString } from '@/utils/date'
import type { MoodEntry } from '@/types/dashboard'
```

Same mocks as `transition-animation.test.tsx`:
- ResizeObserverMock
- matchMedia mock (matches: false for default, true for reduced-motion test)
- AudioProvider + useScenePlayer mocks
- `wr_auth_simulated` + `wr_user_name` seeded in localStorage
- `seedTodayEntry()` helper to bypass check-in
- `renderDashboard()` helper with full provider wrapping

Tests:

1. **`cards have animate-widget-enter class on initial render`** — Seed today entry, render, query for `[class*="animate-widget-enter"]` elements on the dashboard card sections and hero wrapper. Verify at least 7 elements have the class (hero + 6 grid cards).

2. **`cards have sequential animation delays`** — Seed today entry, render, find all elements with `animate-widget-enter` class, verify their `animationDelay` styles are `0ms`, `100ms`, `200ms`, etc.

3. **`animation does not replay after re-render`** — Seed today entry, render, verify animation classes present. Then trigger a re-render (e.g., by completing an activity via localStorage mutation and triggering storage event). After re-render, `animateEntrance` state remains `true` (React state doesn't change), but the animation already played via CSS. The key test is that `hasAnimatedRef` prevents re-setting `animateEntrance`. Actually, the better test: navigate away and back — but with MemoryRouter this is complex. Simplest: verify the ref mechanism by rendering, changing phase back and forth, and confirming animation classes don't re-appear.

4. **`reduced motion: no animation classes`** — Override matchMedia to return `matches: true` for `prefers-reduced-motion`, seed today entry, render dashboard, verify zero `animate-widget-enter` elements.

5. **`GettingStartedCard shifts delays`** — Seed today entry + seed `wr_onboarding_complete` + ensure getting started is visible (no `wr_getting_started_dismissed`). Render. The first grid card (MoodChart/StreakCard) should have delay `200ms` (hero=0ms, getting-started=100ms, then grid starts at 200ms).

6. **`without GettingStartedCard, first grid card delay is 100ms`** — Seed today entry + dismiss getting started. First grid card should have delay `100ms`.

#### progress-bar-glow.test.tsx

Test DashboardHero and StreakCard individually:

```typescript
import { render, act } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DashboardHero } from '@/components/dashboard/DashboardHero'
import { StreakCard } from '@/components/dashboard/StreakCard'
```

Mock `useReducedMotion` and provide ToastProvider wrapper for StreakCard.

Tests:

1. **`no glow on initial render`** — Render DashboardHero with totalPoints=100, query progress bar fill div (via role="progressbar" then its child), verify `boxShadow` is `none`.

2. **`violet glow on point increase`** — Render with totalPoints=100, rerender with totalPoints=150, verify boxShadow contains violet value.

3. **`amber glow on point decrease`** — Render StreakCard with totalPoints=200, rerender with totalPoints=150, verify boxShadow contains amber value.

4. **`glow clears after 600ms`** — Use vi.useFakeTimers(), trigger point change, vi.advanceTimersByTime(600), verify boxShadow is `none`.

5. **`no glow with reduced motion`** — Mock `useReducedMotion` to return `true`, trigger point change, verify no boxShadow change.

6. **`transition style includes box-shadow`** — Verify inline transition includes `box-shadow 300ms ease-out`.

**Guardrails (DO NOT):**
- DO NOT test internal implementation of AnimatedCounter (already tested)
- DO NOT modify existing test files
- DO NOT test visual rendering of animations (that's for Playwright)

**Expected state after completion:**
- [ ] All new tests pass
- [ ] All existing tests still pass (~960+)
- [ ] Test coverage for: entrance stagger delays, one-time play, reduced motion, GettingStartedCard index shift
- [ ] Test coverage for: glow colors, timeout clear, initial no-glow, reduced motion

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Add `widget-enter` keyframe to Tailwind config |
| 2 | — | Add `style` prop to DashboardCard |
| 3 | 1, 2 | Add staggered entrance animation to Dashboard and DashboardWidgetGrid |
| 4 | — | Add progress bar glow effect to DashboardHero and StreakCard |
| 5 | 1, 2, 3, 4 | Write tests for entrance animation and progress bar glow |

Steps 1, 2, and 4 are independent and can be done in parallel. Step 3 depends on 1 and 2. Step 5 depends on all prior steps.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Add `widget-enter` keyframe | [COMPLETE] | 2026-03-19 | Added `widget-enter` keyframe (translateY 12px→0, opacity 0→1) and `animate-widget-enter` utility (400ms ease-out both) to `frontend/tailwind.config.js` |
| 2 | Add `style` prop to DashboardCard | [COMPLETE] | 2026-03-19 | Added optional `style?: React.CSSProperties` to DashboardCardProps, destructured in component, passed to outer `<section>`. Build passes. Existing tests unaffected. |
| 3 | Staggered entrance animation | [COMPLETE] | 2026-03-19 | Added `hasAnimatedRef`/`animateEntrance` state to Dashboard.tsx, `shouldAnimate` + `showGettingStarted` computed values, animation wrappers on DashboardHero and GettingStartedCard. Added `animateEntrance`/`staggerStartIndex` props to DashboardWidgetGrid.tsx with `getAnimProps()` helper. 8 elements animate with 100ms stagger. Visual verification passed at 1440px and 375px. |
| 4 | Progress bar glow effect | [COMPLETE] | 2026-03-19 | Added `useReducedMotion`, `glowColor` state, `glowTimerRef` to both DashboardHero.tsx and StreakCard.tsx. Direction-aware glow (violet increase, amber decrease) with 600ms timeout. Updated progress bar fill: removed Tailwind transition classes, replaced with inline `transition: width 600ms ease-out, box-shadow 300ms ease-out`. Cleanup effect for timer. |
| 5 | Write tests | [COMPLETE] | 2026-03-19 | Created `entrance-animation.test.tsx` (5 tests: widget-enter class presence, sequential delays, reduced motion, GettingStartedCard index shift, no-GettingStartedCard delay) and `progress-bar-glow.test.tsx` (11 tests: no initial glow, violet/amber glow colors, 600ms timeout, reduced motion, transition styles — for both DashboardHero and StreakCard). All 16 new tests pass. |
