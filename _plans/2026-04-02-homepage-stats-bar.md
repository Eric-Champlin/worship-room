# Implementation Plan: Homepage Stats Bar (HP-3)

**Spec:** `_specs/homepage-stats-bar.md`
**Date:** 2026-04-02
**Branch:** `homepage-redesign`
**Design System Reference:** `_plans/recon/design-system.md` (loaded)
**Recon Report:** N/A — no external recon report for this spec
**Master Spec Plan:** N/A — standalone spec (part of homepage-redesign branch sequence)

---

## Architecture Context

### Existing Patterns (from HP-1 and HP-2)

- **Component location:** `frontend/src/components/homepage/` — all HP components live here
- **Barrel export:** `frontend/src/components/homepage/index.ts` — must add `StatsBar` export
- **Test location:** `frontend/src/components/homepage/__tests__/` — test files follow `<ComponentName>.test.tsx` naming
- **Hook location:** `frontend/src/hooks/` — new `useAnimatedCounter.ts` goes here
- **Hook test location:** `frontend/src/hooks/__tests__/` — test files follow `<hookName>.test.ts` naming

### Component Pattern (from HP-2 FeatureShowcase)

```tsx
// Standard HP section structure:
import { GlowBackground } from './GlowBackground'
import { useScrollReveal, staggerDelay } from '@/hooks/useScrollReveal'
import { cn } from '@/lib/utils'

export function SomeSection() {
  const { ref, isVisible } = useScrollReveal()
  return (
    <GlowBackground variant="center">
      <section ref={ref as React.RefObject<HTMLElement>} aria-label="...">
        <div className={cn('scroll-reveal', isVisible && 'is-visible')} style={staggerDelay(0)}>
          {/* content */}
        </div>
      </section>
    </GlowBackground>
  )
}
```

### Scroll Reveal Pattern

- **CSS:** `.scroll-reveal` → `opacity: 0; transform: translateY(12px); transition: 600ms ease-out`
- **Visible:** `.scroll-reveal.is-visible` → `opacity: 1; transform: translateY(0)`
- **Stagger:** `staggerDelay(index, baseDelay, initialDelay)` → `{ transitionDelay: '${initialDelay + index * baseDelay}ms' }`
- **Hook:** `useScrollReveal()` returns `{ ref, isVisible }` — `triggerOnce: true` by default
- **Reduced motion:** `prefers-reduced-motion: reduce` → immediately sets `isVisible = true`, CSS overrides remove transitions

### Gradient Text Pattern

```tsx
import { GRADIENT_TEXT_STYLE } from '@/constants/gradients'
// WHITE_PURPLE_GRADIENT = 'linear-gradient(223deg, #FFFFFF 0%, #8B5CF6 100%)'
// GRADIENT_TEXT_STYLE applies background-clip: text + transparent fill
```

### GlowBackground

- File: `frontend/src/components/homepage/GlowBackground.tsx`
- `variant="center"`: single purple glow orb at `top-[30%] left-1/2`, `radial-gradient(circle, rgba(139, 92, 246, 0.06) 0%, transparent 70%)`
- Wraps children in `relative overflow-hidden bg-hero-bg` — `bg-hero-bg` = `#08051A`

### Home.tsx Integration Point

- File: `frontend/src/pages/Home.tsx`
- Line 61: `{/* HP-3: StatsBar */}` — replace this comment with `<StatsBar />`
- Between `<FeatureShowcase />` (line 60) and `{/* HP-4: PillarSection */}` (line 62)

### Test Pattern (from FeatureShowcase.test.tsx)

- No provider wrapping needed (pure presentational component)
- Mock `useScrollReveal`: `vi.mock('@/hooks/useScrollReveal', () => ({ useScrollReveal: () => ({ ref: { current: null }, isVisible: true }), staggerDelay: (i, base) => ({ transitionDelay: \`${i * base}ms\` }) }))`
- Use `screen.getByRole()`, `screen.getByText()`, `screen.getAllByText()`
- Use `userEvent.setup()` for interactions (not needed here — passive display)
- Check CSS classes via `container.querySelector()`

---

## Auth Gating Checklist

No auth-gated actions in this spec. This is a passive display section visible to all users.

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| View stats bar | No auth required | N/A | N/A |

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Section background | bg class | `bg-hero-bg` (#08051A) | `GlowBackground` component wraps with this |
| Section border | border-y | `border-y border-white/[0.06]` | Spec requirement |
| Section padding | py | `py-14 sm:py-20` | Spec requirement |
| Container | max-width + padding | `max-w-5xl mx-auto px-4 sm:px-6` | Spec requirement |
| Number gradient | style | `GRADIENT_TEXT_STYLE` from `constants/gradients.tsx` | `WHITE_PURPLE_GRADIENT = 'linear-gradient(223deg, #FFFFFF 0%, #8B5CF6 100%)'` |
| Number size | font-size | `text-3xl sm:text-4xl lg:text-5xl` | Spec requirement |
| Number weight | font-weight | `font-bold` | Consistent with `SectionHeading` h2 pattern |
| Label color | text color | `text-white/50` | Spec requirement |
| Label size | font-size | `text-xs sm:text-sm` | Spec requirement |
| Label case | text-transform | `uppercase` | Spec requirement |
| Label tracking | letter-spacing | `tracking-wide` | Spec requirement |
| Label margin | margin-top | `mt-1` | Spec requirement |
| Glow orb | variant | `variant="center"` — single purple orb at 30% top, centered | `GlowBackground.tsx` line 36 |
| Scroll reveal | CSS class | `.scroll-reveal` + `.is-visible` — 600ms ease-out, translateY(12px→0) | `index.css` lines 70-78 |

---

## Design System Reminder

**Project-specific quirks for `/execute-plan` to display before every UI step:**

- Worship Room uses Caveat (`font-script`) for script/highlighted headings, not Lora — but this section has NO headings, only numbers and labels
- `WHITE_PURPLE_GRADIENT` = `linear-gradient(223deg, #FFFFFF 0%, #8B5CF6 100%)` — apply via `GRADIENT_TEXT_STYLE` CSSProperties import
- All dark backgrounds use `bg-hero-bg` (#08051A) for the landing page, not `bg-hero-dark` (#0D0620)
- Text opacity standards: primary text `text-white/70`, secondary `text-white/60`, labels/muted `text-white/50`
- Use `cn()` from `@/lib/utils` for conditional classnames (clsx + tailwind-merge)
- `useScrollReveal` returns `isVisible: true` immediately when `prefers-reduced-motion: reduce` — CSS also removes transitions
- `staggerDelay()` takes `(index, baseDelay = 100, initialDelay = 0)` — returns `{ transitionDelay: '...' }`
- No execution deviations logged in HP-1 or HP-2 plans — patterns are stable

---

## Shared Data Models (from Master Plan)

N/A — no shared data models. Stats are hardcoded constants.

**localStorage keys this spec touches:** None.

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | < 640px | 2-column grid (`grid-cols-2 gap-4`), 3 rows. Numbers: `text-3xl`. Labels: `text-xs`. Padding: `py-14 px-4`. |
| Tablet | 640px–1024px | 3-column grid (`grid-cols-3 gap-6`), 2 rows. Numbers: `text-4xl`. Labels: `text-sm`. Padding: `py-20 px-6`. |
| Desktop | > 1024px | 6-column grid (`grid-cols-6 gap-6`), single row. Numbers: `text-5xl`. Labels: `text-sm`. Padding: `py-20 px-6`. |

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| FeatureShowcase → StatsBar | 0px (seamless) | Both wrapped in `GlowBackground` with `bg-hero-bg`. StatsBar uses `border-y border-white/[0.06]` for visual separation. |
| StatsBar → HP-4 placeholder (currently GrowthTeasersSection) | 0px (seamless) | StatsBar bottom border provides visual separation. |

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] HP-1 foundation committed (`GlowBackground`, `SectionHeading`, `useScrollReveal`, `staggerDelay`, scroll-reveal CSS)
- [ ] HP-2 feature showcase committed (`FeatureShowcase` component)
- [ ] On `homepage-redesign` branch
- [ ] No auth-gated actions in this spec (confirmed — passive display)
- [ ] Design system values verified from codebase inspection and spec
- [ ] All [UNVERIFIED] values flagged with verification methods
- [ ] No recon report needed (no external design to replicate)

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Counter animation library | `requestAnimationFrame` in custom hook (no external deps) | Spec requirement: pure React + rAF, no `setInterval`/`setTimeout` |
| Ease-out curve | `t = 1 - Math.pow(1 - progress, 3)` (cubic ease-out) | Spec requirement: ease-out curve. Cubic provides smooth deceleration. |
| Reduced motion behavior | Display final values immediately, no animation, no stagger | Spec requirement + `prefers-reduced-motion` CSS override already handles visual transitions |
| Counter fires once | `useRef` flag in `useAnimatedCounter` to track if animation has run | Spec: "fires only once — does not replay when scrolling away and back" |
| Numbers during animation | Round to nearest integer via `Math.round()` | Spec: "plain integers, no decimals during animation" |
| Screen reader experience | Final values always present in DOM; animation is purely visual | Counter animates display text but `aria-label` or final text content ensures accessibility |
| Stats data location | Constants array in `StatsBar.tsx` (not a separate constants file) | Only 6 items, used only in this component. No cross-component sharing needed. |
| Section wrapper | `GlowBackground variant="center"` with `border-y` on inner section | Spec: GlowBackground for atmosphere + border separators for framing |

---

## Implementation Steps

### Step 1: Create `useAnimatedCounter` Hook

**Objective:** Build a reusable `requestAnimationFrame`-based counter hook with ease-out curve, configurable duration/delay, and reduced motion support.

**Files to create/modify:**
- `frontend/src/hooks/useAnimatedCounter.ts` — new file

**Details:**

```typescript
interface UseAnimatedCounterOptions {
  target: number        // Final value to count to
  duration?: number     // Animation duration in ms (default: 800)
  delay?: number        // Delay before starting in ms (default: 0)
  enabled?: boolean     // Whether animation should run (default: false)
}

// Returns: current display value (number)
```

Implementation:
- Use `useRef` for rAF ID, start time, and `hasAnimated` flag
- On `enabled` becoming `true` (and `hasAnimated` is false): schedule rAF loop after `delay` ms
- Each frame: calculate `elapsed = timestamp - startTime`, `progress = Math.min(elapsed / duration, 1)`, `easedProgress = 1 - Math.pow(1 - progress, 3)`, `value = Math.round(easedProgress * target)`
- When `progress >= 1`: set final value, set `hasAnimated = true`, stop loop
- Cleanup: cancel rAF on unmount via `cancelAnimationFrame`
- Reduced motion: check `window.matchMedia('(prefers-reduced-motion: reduce)').matches` — if true, return `target` immediately, skip all animation
- `hasAnimated` flag ensures re-enabling does NOT replay animation

**Auth gating:** N/A

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT use `setInterval` or `setTimeout` for the animation loop
- DO NOT re-animate when `enabled` toggles off and back on (one-shot only via `hasAnimated` ref)
- DO NOT use `useEffect` cleanup to reset animation state — the hook is one-shot
- DO NOT add external dependencies

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| returns 0 initially when not enabled | unit | `enabled: false` → value is 0 |
| returns target immediately when reduced motion preferred | unit | Mock `matchMedia` to prefer reduced motion → value equals target immediately |
| returns target value when enabled (after animation completes) | unit | Enable hook, advance timers, verify final value equals target |
| cleans up rAF on unmount | unit | Render, enable, unmount → verify `cancelAnimationFrame` called |
| does not re-animate when enabled toggles off and back on | unit | Enable → animation completes → disable → re-enable → value stays at target (no restart) |
| respects delay before starting animation | unit | `delay: 200` → verify animation hasn't started before delay elapsed |

**Expected state after completion:**
- [ ] `useAnimatedCounter.ts` created at `frontend/src/hooks/useAnimatedCounter.ts`
- [ ] Hook exports a single function `useAnimatedCounter(options)`
- [ ] Returns a number (current display value)
- [ ] Uses `requestAnimationFrame` exclusively (no timers)
- [ ] Reduced motion returns `target` immediately
- [ ] One-shot behavior — `hasAnimated` ref prevents replay

---

### Step 2: Write Tests for `useAnimatedCounter`

**Objective:** Test the counter hook with full coverage of animation, reduced motion, cleanup, and one-shot behavior.

**Files to create/modify:**
- `frontend/src/hooks/__tests__/useAnimatedCounter.test.ts` — new file

**Details:**

Test setup:
- Use `@testing-library/react` `renderHook` and `act`
- Mock `window.matchMedia` to control `prefers-reduced-motion`
- Use `vi.spyOn(window, 'requestAnimationFrame')` and `vi.spyOn(window, 'cancelAnimationFrame')` for verifying rAF usage
- Use `vi.useFakeTimers()` where needed for delay testing
- For rAF-based animation testing: mock `requestAnimationFrame` to call callback synchronously or use a manual frame stepper

Follow the 6 test specs from Step 1's test table. Add:
| Test | Type | Description |
|------|------|-------------|
| returns 0 initially when not enabled | unit | Default state before enabling |
| returns target immediately with reduced motion | unit | Mock `prefers-reduced-motion: reduce` |
| returns target after animation completes | unit | Enable, step through rAF frames, verify final value |
| cleans up rAF on unmount | unit | Spy on `cancelAnimationFrame`, unmount, verify called |
| does not replay animation on re-enable | unit | Complete animation, toggle enabled off/on, verify no restart |
| respects delay parameter | unit | Set delay, verify animation doesn't start until after delay |
| intermediate values are integers (Math.round) | unit | During animation, all returned values are whole numbers |

**Auth gating:** N/A

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT test implementation details (internal ref values) — test observable behavior only
- DO NOT use real timers — use `vi.useFakeTimers()` or manual rAF mocking

**Expected state after completion:**
- [ ] `useAnimatedCounter.test.ts` created with 7 tests
- [ ] All tests pass
- [ ] Hook behavior fully verified: animation, reduced motion, cleanup, one-shot, delay

---

### Step 3: Create `StatsBar` Component

**Objective:** Build the stats bar section with animated counters, scroll reveal, GlowBackground, responsive grid, and border separators.

**Files to create/modify:**
- `frontend/src/components/homepage/StatsBar.tsx` — new file

**Details:**

Component structure:
```tsx
import { GlowBackground } from './GlowBackground'
import { useScrollReveal, staggerDelay } from '@/hooks/useScrollReveal'
import { useAnimatedCounter } from '@/hooks/useAnimatedCounter'
import { GRADIENT_TEXT_STYLE } from '@/constants/gradients'
import { cn } from '@/lib/utils'

const STATS = [
  { value: 50, label: 'Devotionals' },
  { value: 10, label: 'Reading Plans' },
  { value: 24, label: 'Ambient Sounds' },
  { value: 6,  label: 'Meditation Types' },
  { value: 5,  label: 'Seasonal Challenges' },
  { value: 8,  label: 'Worship Playlists' },
] as const

function StatItem({ value, label, index, isVisible }: {
  value: number
  label: string
  index: number
  isVisible: boolean
}) {
  const count = useAnimatedCounter({
    target: value,
    duration: 800,
    delay: index * 80,      // 80ms stagger for counter start
    enabled: isVisible,
  })

  return (
    <div
      className={cn('scroll-reveal text-center', isVisible && 'is-visible')}
      style={staggerDelay(index)}  // 100ms default stagger for fade-in
    >
      <div
        className="text-3xl sm:text-4xl lg:text-5xl font-bold"
        style={GRADIENT_TEXT_STYLE}
        aria-label={`${value} ${label}`}
      >
        {count}
      </div>
      <div className="text-white/50 text-xs sm:text-sm mt-1 tracking-wide uppercase">
        {label}
      </div>
    </div>
  )
}

export function StatsBar() {
  const { ref, isVisible } = useScrollReveal()

  return (
    <GlowBackground variant="center">
      <section
        ref={ref as React.RefObject<HTMLElement>}
        aria-label="Content statistics"
        className="border-y border-white/[0.06]"
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-6">
            {STATS.map((stat, i) => (
              <StatItem
                key={stat.label}
                value={stat.value}
                label={stat.label}
                index={i}
                isVisible={isVisible}
              />
            ))}
          </div>
        </div>
      </section>
    </GlowBackground>
  )
}
```

Key details:
- `StatItem` uses `useAnimatedCounter` with `delay: index * 80` for counter stagger
- `StatItem` uses `staggerDelay(index)` (100ms default) for scroll-reveal fade-in stagger
- Numbers get `GRADIENT_TEXT_STYLE` for white-to-purple gradient text
- `aria-label={`${value} ${label}`}` on the number div ensures screen readers get the final value regardless of animation state
- `border-y border-white/[0.06]` on the `<section>` for subtle separators
- Grid uses Tailwind responsive prefixes: `grid-cols-2 sm:grid-cols-3 lg:grid-cols-6`

**Auth gating:** N/A — passive display, no auth needed

**Responsive behavior:**
- Desktop (>1024px): 6-column single-row grid, `text-5xl` numbers, `text-sm` labels, `gap-6`, `py-20 px-6`
- Tablet (640–1024px): 3-column 2-row grid, `text-4xl` numbers, `text-sm` labels, `gap-6`, `py-20 px-6`
- Mobile (<640px): 2-column 3-row grid, `text-3xl` numbers, `text-xs` labels, `gap-4`, `py-14 px-4`

**Guardrails (DO NOT):**
- DO NOT add a `SectionHeading` — spec says "no heading or tagline — the numbers speak for themselves"
- DO NOT add `+` suffix to numbers — spec: "these are exact content counts, not approximations"
- DO NOT add click handlers or links — spec: "no click/tap interactions on stats"
- DO NOT add tooltips or hover states — spec: out of scope
- DO NOT fetch data dynamically — all stats are hardcoded constants
- DO NOT use `dangerouslySetInnerHTML` — plain text only

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| renders all 6 stat labels | unit | Check for "Devotionals", "Reading Plans", "Ambient Sounds", "Meditation Types", "Seasonal Challenges", "Worship Playlists" |
| renders in GlowBackground with bg-hero-bg | unit | `container.querySelector('.bg-hero-bg')` exists |
| applies border separators | unit | `container.querySelector('.border-y')` exists |
| has aria-label on section | unit | `getByRole('region', { name: /content statistics/i })` |
| stat numbers have aria-label with final values | unit | Check `aria-label` attributes: "50 Devotionals", "10 Reading Plans", etc. |
| applies scroll-reveal classes | unit | Each stat div has `scroll-reveal` class |
| applies stagger delay styles | unit | Each stat has `transitionDelay` style matching index * 100ms |

**Expected state after completion:**
- [ ] `StatsBar.tsx` created at `frontend/src/components/homepage/StatsBar.tsx`
- [ ] Component renders 6 stats with animated counters
- [ ] Wrapped in `GlowBackground variant="center"`
- [ ] Border separators visible
- [ ] Responsive grid works at all 3 breakpoints
- [ ] Screen readers get final values via `aria-label`

---

### Step 4: Write Tests for `StatsBar`

**Objective:** Test the StatsBar component for rendering, accessibility, structure, and responsive classes.

**Files to create/modify:**
- `frontend/src/components/homepage/__tests__/StatsBar.test.tsx` — new file

**Details:**

Test setup:
- Mock `useScrollReveal` (same pattern as `FeatureShowcase.test.tsx`):
  ```typescript
  vi.mock('@/hooks/useScrollReveal', () => ({
    useScrollReveal: () => ({ ref: { current: null }, isVisible: true }),
    staggerDelay: (i: number, base = 100) => ({
      transitionDelay: `${i * (base || 100)}ms`,
    }),
  }))
  ```
- Mock `useAnimatedCounter` to return the target value directly (skip animation):
  ```typescript
  vi.mock('@/hooks/useAnimatedCounter', () => ({
    useAnimatedCounter: ({ target }: { target: number }) => target,
  }))
  ```
- No provider wrapping needed

Follow the 7 test specs from Step 3's test table.

**Auth gating:** N/A

**Responsive behavior:** N/A: no UI impact (test file)

**Guardrails (DO NOT):**
- DO NOT test animation timing in component tests — that's the hook's responsibility
- DO NOT wrap in providers — StatsBar has no context dependencies

**Expected state after completion:**
- [ ] `StatsBar.test.tsx` created with 7 tests
- [ ] All tests pass
- [ ] Mocks match existing HP test patterns

---

### Step 5: Integrate StatsBar into Home.tsx and Export

**Objective:** Add StatsBar to the landing page and barrel export.

**Files to create/modify:**
- `frontend/src/pages/Home.tsx` — add import and render
- `frontend/src/components/homepage/index.ts` — add barrel export

**Details:**

**Home.tsx changes:**

Add import:
```typescript
import { StatsBar } from '@/components/homepage/StatsBar'
```

Replace line 61 (`{/* HP-3: StatsBar */}`) with:
```tsx
<StatsBar />
```

**index.ts changes:**

Add to barrel exports:
```typescript
export { StatsBar } from './StatsBar'
```

**Auth gating:** N/A

**Responsive behavior:**
- Desktop (>1024px): StatsBar appears as full-width section between FeatureShowcase and HP-4 placeholder
- Tablet (768px): Same — full-width section
- Mobile (375px): Same — full-width section

**Guardrails (DO NOT):**
- DO NOT remove other HP placeholder comments (HP-4 through HP-7)
- DO NOT modify any other component
- DO NOT change the Home.tsx import from `'@/components/homepage/StatsBar'` to barrel import (keep direct import consistent with `FeatureShowcase` import pattern on line 3 — but note Home.tsx line 3 imports from `'@/components/homepage'` barrel. Use barrel import to match.)

Correction: Home.tsx line 3 uses `import { FeatureShowcase } from '@/components/homepage'` (barrel). Use the same pattern:
```typescript
import { FeatureShowcase, StatsBar } from '@/components/homepage'
```

This replaces the separate `FeatureShowcase` import on line 3.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Home renders StatsBar section | integration | Render `<Home />` with router, verify "Content statistics" region exists |

Note: Home.tsx likely has an existing test file. If so, add this test there. If not, this can be verified via the build passing and manual/Playwright verification.

**Expected state after completion:**
- [ ] `StatsBar` appears on landing page between FeatureShowcase and GrowthTeasersSection
- [ ] Barrel export updated
- [ ] Build passes with 0 errors
- [ ] All existing tests still pass

---

### Step 6: Verify Build and Tests

**Objective:** Confirm everything compiles and all tests pass.

**Files to create/modify:** None — verification only.

**Details:**

Run:
1. `cd frontend && pnpm build` — verify 0 errors, 0 warnings
2. `cd frontend && pnpm test` — verify all tests pass (including new ones)

Check:
- No TypeScript errors
- No unused imports
- New hook tests pass (7 tests)
- New component tests pass (7 tests)
- All existing tests still pass

**Auth gating:** N/A

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT skip test verification
- DO NOT ignore build warnings

**Expected state after completion:**
- [ ] Build passes with 0 errors
- [ ] All tests pass (existing + 14 new)
- [ ] No regressions

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Create `useAnimatedCounter` hook |
| 2 | 1 | Write hook tests |
| 3 | 1 | Create `StatsBar` component |
| 4 | 3 | Write component tests |
| 5 | 3 | Integrate into Home.tsx + barrel export |
| 6 | 1, 2, 3, 4, 5 | Build and test verification |

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Create `useAnimatedCounter` hook | [COMPLETE] | 2026-04-02 | Created `frontend/src/hooks/useAnimatedCounter.ts`. Used `null` instead of `0` for ref initialization to handle timestamp=0 edge case robustly. |
| 2 | Write hook tests | [COMPLETE] | 2026-04-02 | Created `frontend/src/hooks/__tests__/useAnimatedCounter.test.ts` with 7 tests. Manual rAF mock for frame stepping. |
| 3 | Create `StatsBar` component | [COMPLETE] | 2026-04-02 | Created `frontend/src/components/homepage/StatsBar.tsx`. Matches plan exactly. |
| 4 | Write component tests | [COMPLETE] | 2026-04-02 | Created `frontend/src/components/homepage/__tests__/StatsBar.test.tsx` with 7 tests. All pass. |
| 5 | Integrate into Home.tsx + barrel export | [COMPLETE] | 2026-04-02 | Updated `Home.tsx` (barrel import, replaced HP-3 comment with `<StatsBar />`). Added barrel export in `homepage/index.ts`. |
| 6 | Verify build and tests | [COMPLETE] | 2026-04-02 | TypeScript compiles clean (0 errors). All 14 new tests pass. `pnpm build` has pre-existing workbox-window PWA issue (not from this change). 14 pre-existing GrowthGarden/notification test failures (not from this change). |
