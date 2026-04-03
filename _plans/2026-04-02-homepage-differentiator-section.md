# Implementation Plan: Homepage Differentiator Section (HP-5)

**Spec:** `_specs/hp-5-homepage-differentiator-section.md`
**Date:** 2026-04-02
**Branch:** `homepage-redesign`
**Design System Reference:** `_plans/recon/design-system.md` (loaded)
**Recon Report:** not applicable
**Master Spec Plan:** not applicable (standalone homepage redesign section, part of HP-1 through HP-7 series)

---

## Architecture Context

### Project Structure

- Homepage components live in `frontend/src/components/homepage/`
- Landing page is `frontend/src/pages/Home.tsx` — renders `HeroSection`, `FeatureShowcase`, `StatsBar`, `PillarSection`, then placeholder comments for HP-5 through HP-7
- Barrel export at `frontend/src/components/homepage/index.ts` — must add `DifferentiatorSection`
- Data files follow `pillar-data.ts` convention: typed array of objects with Lucide icon references

### Existing Foundation Components (from HP-1)

- **`GlowBackground`** (`components/homepage/GlowBackground.tsx`) — wraps content in `bg-hero-bg` (#08051A) with animated radial glow orbs. Accepts `variant: 'center' | 'left' | 'right' | 'split' | 'none'`. Orbs positioned based on variant.
- **`SectionHeading`** (`components/homepage/SectionHeading.tsx`) — `<h2>` with `GRADIENT_TEXT_STYLE` (white-to-purple gradient text via `linear-gradient(223deg, #FFFFFF 0%, #8B5CF6 100%)`). Optional `tagline` in `text-white/60`. `align` prop (center default).
- **`FrostedCard`** (`components/homepage/FrostedCard.tsx`) — `bg-white/[0.05] backdrop-blur-sm border border-white/[0.08] rounded-2xl p-6`. When no `onClick` prop: no hover lift, no cursor pointer. Supports `className` prop.

### Scroll Reveal Pattern

- **`useScrollReveal`** (`hooks/useScrollReveal.ts`) — Returns `{ ref, isVisible }`. Uses IntersectionObserver. Respects `prefers-reduced-motion` (returns `isVisible: true` immediately).
- **`staggerDelay`** (`hooks/useScrollReveal.ts`) — Returns `{ transitionDelay: '${initialDelay + index * baseDelay}ms' }`.
- **CSS classes** (`index.css`): `.scroll-reveal` = `opacity: 0; transform: translateY(12px); transition: 600ms ease-out`. `.scroll-reveal.is-visible` = `opacity: 1; transform: translateY(0)`. `prefers-reduced-motion` disables all transitions.

### Gradient Text

- **`GRADIENT_TEXT_STYLE`** (`constants/gradients.tsx`) — `CSSProperties` object: `color: 'white', backgroundImage: 'linear-gradient(223deg, #FFFFFF 0%, #8B5CF6 100%)'`, `WebkitBackgroundClip: 'text'`, `WebkitTextFillColor: 'transparent'`, `backgroundClip: 'text'`.

### Section Pattern (from PillarSection)

```tsx
<section aria-label="Feature pillars">
  <div className="max-w-5xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
    <SectionHeading heading="..." tagline="..." />
    {/* content */}
  </div>
</section>
```

### Test Patterns

- Tests in `components/homepage/__tests__/` — use `@testing-library/react` + `vitest`
- Mock `useScrollReveal` with:
  ```ts
  vi.mock('@/hooks/useScrollReveal', () => ({
    useScrollReveal: () => ({ ref: { current: null }, isVisible: true }),
    staggerDelay: (i: number, base = 100, initial = 0) => ({
      transitionDelay: `${initial + i * base}ms`,
    }),
  }))
  ```
- Test patterns: `screen.getByRole('heading')`, `screen.getByText()`, `screen.getByRole('region')`, `container.querySelectorAll()` for structural queries

### Icon Availability (Verified)

All 6 Lucide icons exist in the installed `lucide-react` package:
- `ShieldOff` ✅ — `shield-off.js`
- `EyeOff` ✅ — `eye-off.js`
- `CreditCard` ✅ — `credit-card.js` (spec option 1 for Card 3)
- `BadgeDollarSign` ✅ — available (spec option 2 for Card 3)
- `HeartHandshake` ✅ — `heart-handshake.js`
- `Sparkles` ✅ — `sparkles.js`
- `LifeBuoy` ✅ — `life-buoy.js`

---

## Auth Gating Checklist

**This section is purely informational on the public landing page. No auth gating required.**

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| View section | Public, no auth | N/A | N/A |

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Section wrapper | padding | `py-20 sm:py-28` | PillarSection pattern (codebase) |
| Section wrapper | container | `max-w-5xl mx-auto px-4 sm:px-6` | PillarSection pattern (codebase) |
| SectionHeading | gradient text | `linear-gradient(223deg, #FFFFFF 0%, #8B5CF6 100%)` | `constants/gradients.tsx:6` |
| SectionHeading | tagline color | `text-white/60` | `SectionHeading.tsx` |
| FrostedCard | background | `bg-white/[0.05]` | `FrostedCard.tsx` |
| FrostedCard | border | `border border-white/[0.08] rounded-2xl` | `FrostedCard.tsx` |
| FrostedCard | padding | `p-6` | `FrostedCard.tsx` |
| Icon container | size | `w-10 h-10 sm:w-12 sm:h-12` | Spec design notes |
| Icon container | style | `rounded-xl bg-white/[0.06]` | Spec design notes |
| Icon | color | `text-white/80` | Spec design notes |
| Card title | style | `text-white text-base sm:text-lg font-semibold mt-4` | Spec design notes |
| Card description | style | `text-white/55 text-sm leading-relaxed mt-2` | Spec design notes (intentional below AA) |
| Grid (desktop) | layout | `grid-cols-3 gap-6` | Spec (>1024px) |
| Grid (tablet) | layout | `grid-cols-2 gap-6` | Spec (640–1024px) |
| Grid (mobile) | layout | `grid-cols-1 gap-4` | Spec (<640px) |
| Grid spacing | margin | `mt-12 sm:mt-16` | Spec design notes |
| GlowBackground | variant | `"split"` | Spec requirement |

---

## Design System Reminder

**Project-specific quirks that `/execute-plan` displays before every UI step:**

- SectionHeading uses `GRADIENT_TEXT_STYLE` from `constants/gradients.tsx` — white-to-purple gradient via `linear-gradient(223deg, #FFFFFF 0%, #8B5CF6 100%)`, NOT plain white text
- GlowBackground uses `bg-hero-bg` (dark background) — sections wrapped in GlowBackground render on dark, NOT on `bg-neutral-bg`
- FrostedCard without `onClick` has NO hover effects — this is correct behavior for informational cards
- `useScrollReveal` + `staggerDelay` are imported from `@/hooks/useScrollReveal`, not from a separate utility
- CSS classes `scroll-reveal` and `is-visible` are defined in `index.css`, applied with `cn()`
- Spec description text uses `text-white/55` — intentional design choice, NOT an oversight. Do not "fix" to `text-white/60`
- All section wrappers use `max-w-5xl mx-auto px-4 sm:px-6` container pattern
- Grid breakpoints: `grid-cols-1` (default), `sm:grid-cols-2` (640px), `lg:grid-cols-3` (1024px)

---

## Shared Data Models (from Master Plan)

Not applicable — no shared data models. This is a static, informational section.

**localStorage keys this spec touches:** None.

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | < 640px | `grid-cols-1 gap-4` — single column, full-width cards, stacked vertically |
| Tablet | 640px–1024px | `grid-cols-2 gap-6` — 2 columns, 3 rows |
| Desktop | > 1024px | `grid-cols-3 gap-6` — 3 columns, 2 rows, `max-w-5xl` container |

**Custom breakpoints:** None — uses standard Tailwind `sm` (640px) and `lg` (1024px).

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| PillarSection → DifferentiatorSection | 0px (sections have internal `py-20 sm:py-28`) | PillarSection and spec both use `py-20 sm:py-28` |
| SectionHeading → Grid | `mt-12 sm:mt-16` | Spec design notes |
| DifferentiatorSection → GrowthTeasersSection (HP-6) | 0px (next section has its own padding) | Same pattern as adjacent HP sections |

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] HP-4 (Three Pillars) is complete and committed on `homepage-redesign` branch
- [x] All 6 Lucide icons verified to exist in installed `lucide-react`
- [x] `GlowBackground`, `SectionHeading`, `FrostedCard` exist and are exported from `components/homepage/index.ts`
- [x] `useScrollReveal` and `staggerDelay` exist in `hooks/useScrollReveal.ts`
- [x] No auth gating required (pure informational section)
- [x] Design system values are verified from codebase inspection
- [x] No [UNVERIFIED] values — all values sourced from spec or codebase

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Card 3 icon: `CreditCard` vs `BadgeDollarSign` | Use `CreditCard` | Spec lists `CreditCard` first; "honest pricing" is better conveyed by a simple credit card than a dollar badge. Spec says "or `BadgeDollarSign` if it better conveys honest pricing" — CreditCard is the simpler, more universal icon |
| Description opacity `text-white/55` vs WCAG AA `text-white/60` | Use `text-white/55` per spec | Spec explicitly notes this is intentional: "soft atmospheric copy on large cards where readability is maintained by large card size and ample spacing" |
| FrostedCard `as` prop | Omit — default is `div` | Cards are not interactive, no need for `button` or `article` |
| Scroll reveal stagger timing | 100ms between cards, 200ms initial delay | Spec requirement: "staggerDelay(index, 100, 200)" — note this differs from PillarAccordionItem's 80ms |
| Card key prop | Use index | Only 6 static items, never reordered — index is sufficient |

---

## Implementation Steps

### Step 1: Differentiator Data File

**Objective:** Create the typed data file with all 6 card definitions and Lucide icon imports.

**Files to create/modify:**
- `frontend/src/components/homepage/differentiator-data.ts` — new file

**Details:**

Define a `DifferentiatorItem` interface:

```typescript
import type { LucideIcon } from 'lucide-react'

export interface DifferentiatorItem {
  icon: LucideIcon
  title: string
  description: string
}
```

Import icons and export the array:

```typescript
import { ShieldOff, EyeOff, CreditCard, HeartHandshake, Sparkles, LifeBuoy } from 'lucide-react'
```

Array of 6 items with exact copy from spec:
1. ShieldOff — "Your prayer time is sacred" / "No ads. No sponsored content..."
2. EyeOff — "Your prayers stay between you and God" / "We don't sell your data..."
3. CreditCard — "Honest from day one" / "No hidden fees..."
4. HeartHandshake — "We'll never guilt you for missing a day" / "Life happens..."
5. Sparkles — "Prayers that know your heart" / "Tell us how you're feeling..."
6. LifeBuoy — "A safe space when it matters most" / "If you're in crisis..."

**Auth gating:** N/A

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT add any click handlers or interactive behavior to the data
- DO NOT include competitor names anywhere in the copy
- DO NOT add an `id` field — unnecessary for static non-interactive cards

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `differentiator-data exports DIFFERENTIATORS array with 6 items` | unit | Verify array length |
| `each item has icon, title, description` | unit | Verify shape of each item |
| `no competitor names in copy` | unit | Verify none of ["YouVersion", "Pray.com", "Hallow", "Abide", "Glorify"] appear in any title or description |

**Expected state after completion:**
- [x] `differentiator-data.ts` exists with `DifferentiatorItem` interface and `DIFFERENTIATORS` array
- [x] All 6 items have correct icons, titles, and descriptions matching spec
- [x] File exports both the type and the data array

---

### Step 2: DifferentiatorSection Component

**Objective:** Build the main section component with GlowBackground, SectionHeading, responsive grid, FrostedCard usage, and scroll reveal.

**Files to create/modify:**
- `frontend/src/components/homepage/DifferentiatorSection.tsx` — new file

**Details:**

Component structure:

```tsx
import { GlowBackground } from './GlowBackground'
import { SectionHeading } from './SectionHeading'
import { FrostedCard } from './FrostedCard'
import { DIFFERENTIATORS } from './differentiator-data'
import { useScrollReveal, staggerDelay } from '@/hooks/useScrollReveal'
import { cn } from '@/lib/utils'

export function DifferentiatorSection() {
  const { ref, isVisible } = useScrollReveal()

  return (
    <GlowBackground variant="split">
      <section
        ref={ref as React.RefObject<HTMLElement>}
        aria-label="What makes Worship Room different"
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
          {/* Heading with scroll reveal */}
          <div className={cn('scroll-reveal', isVisible && 'is-visible')}>
            <SectionHeading
              heading="Built for Your Heart, Not Our Bottom Line"
              tagline="The things we'll never do matter as much as the things we will."
            />
          </div>

          {/* Card grid with staggered reveal */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mt-12 sm:mt-16">
            {DIFFERENTIATORS.map((item, index) => {
              const Icon = item.icon
              return (
                <div
                  key={index}
                  className={cn('scroll-reveal', isVisible && 'is-visible')}
                  style={staggerDelay(index, 100, 200)}
                >
                  <FrostedCard>
                    {/* Icon container */}
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white/[0.06] flex items-center justify-center">
                      <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white/80" aria-hidden="true" />
                    </div>
                    {/* Title */}
                    <h3 className="text-white text-base sm:text-lg font-semibold mt-4">
                      {item.title}
                    </h3>
                    {/* Description */}
                    <p className="text-white/55 text-sm leading-relaxed mt-2">
                      {item.description}
                    </p>
                  </FrostedCard>
                </div>
              )
            })}
          </div>
        </div>
      </section>
    </GlowBackground>
  )
}
```

Key implementation details:
- `GlowBackground variant="split"` wraps entire section (purple left, white right glow)
- `SectionHeading` handles gradient text and tagline rendering
- FrostedCard receives NO `onClick` — no hover lift, no cursor pointer
- Icons use `aria-hidden="true"` (decorative)
- Stagger: `staggerDelay(index, 100, 200)` — 200ms initial delay + 100ms between each card
- The `ref` from `useScrollReveal` goes on the `<section>` element so all cards trigger from the same intersection point

**Auth gating:** N/A

**Responsive behavior:**
- Desktop (>1024px): `grid-cols-3 gap-6` — 3 columns, 2 rows
- Tablet (640–1024px): `grid-cols-2 gap-6` — 2 columns, 3 rows
- Mobile (<640px): `grid-cols-1 gap-4` — single column, 6 rows

**Guardrails (DO NOT):**
- DO NOT add `onClick` to FrostedCard — cards are informational only
- DO NOT add `cursor-pointer` or hover lift effects
- DO NOT use `text-white/60` for descriptions — spec explicitly uses `text-white/55`
- DO NOT add extra motion beyond scroll reveal (no icon animations, no card hover transforms)
- DO NOT add an `id` to the section (not a scroll target)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `renders section heading with correct text` | unit | `screen.getByRole('heading', { name: /built for your heart/i })` |
| `renders tagline text` | unit | `screen.getByText(/the things we'll never do/i)` |
| `renders all 6 card titles` | unit | Check all 6 titles present via `screen.getByText()` |
| `renders all 6 card descriptions` | unit | Check all 6 descriptions present via `screen.getByText()` |
| `renders 6 FrostedCard wrappers` | unit | `container.querySelectorAll` for frosted card class pattern |
| `icons have aria-hidden` | unit | All SVG icons have `aria-hidden="true"` |
| `section has aria-label` | unit | `screen.getByRole('region', { name: /what makes worship room different/i })` |
| `uses GlowBackground with split variant` | unit | Verify glow background renders (check for `bg-hero-bg` class) |
| `cards use scroll-reveal classes` | unit | Check `scroll-reveal` and `is-visible` classes on card wrappers |
| `cards have stagger delay styles` | unit | Check `transitionDelay` inline style on card wrappers |
| `no competitor names in rendered output` | unit | Assert rendered text does not contain competitor names |

**Expected state after completion:**
- [x] `DifferentiatorSection.tsx` renders 6 cards in a responsive grid
- [x] Uses `GlowBackground variant="split"` and `SectionHeading`
- [x] All icons decorative with `aria-hidden="true"`
- [x] Section has `aria-label` for screen readers
- [x] Scroll reveal with staggered card entrance

---

### Step 3: Home.tsx Integration + Barrel Export

**Objective:** Add `DifferentiatorSection` to the landing page below `PillarSection` and update the barrel export.

**Files to create/modify:**
- `frontend/src/components/homepage/index.ts` — add `DifferentiatorSection` export
- `frontend/src/pages/Home.tsx` — import and render `DifferentiatorSection`

**Details:**

**Barrel export** — add to `index.ts`:
```typescript
export { DifferentiatorSection } from './DifferentiatorSection'
```

**Home.tsx** — replace the HP-5 placeholder comment with the component:

Current:
```tsx
<PillarSection />
{/* HP-5: DifferentiatorSection */}
```

After:
```tsx
<PillarSection />
<DifferentiatorSection />
```

Import `DifferentiatorSection` from `@/components/homepage` alongside existing imports.

**Auth gating:** N/A

**Responsive behavior:** N/A: no UI impact (component handles its own responsiveness)

**Guardrails (DO NOT):**
- DO NOT remove any other sections or placeholder comments (HP-6, HP-7 comments remain)
- DO NOT modify any existing component imports or rendering
- DO NOT add props to `DifferentiatorSection` — it's self-contained

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `Home renders DifferentiatorSection` | integration | Verify DifferentiatorSection heading appears in Home page render |

Note: This test will be added to the DifferentiatorSection test file as a smoke integration test rather than creating a separate Home.test.tsx.

**Expected state after completion:**
- [x] `DifferentiatorSection` appears in barrel export
- [x] `Home.tsx` renders `DifferentiatorSection` below `PillarSection`
- [x] HP-5 placeholder comment removed
- [x] Build passes with 0 errors

---

### Step 4: Tests

**Objective:** Create comprehensive test file for the data file and section component.

**Files to create/modify:**
- `frontend/src/components/homepage/__tests__/DifferentiatorSection.test.tsx` — new file

**Details:**

Follow the existing test pattern from `PillarSection.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { DifferentiatorSection } from '../DifferentiatorSection'
import { DIFFERENTIATORS } from '../differentiator-data'

vi.mock('@/hooks/useScrollReveal', () => ({
  useScrollReveal: () => ({ ref: { current: null }, isVisible: true }),
  staggerDelay: (i: number, base = 100, initial = 0) => ({
    transitionDelay: `${initial + i * base}ms`,
  }),
}))
```

Tests to include:

1. **Data file tests** (imported directly):
   - `DIFFERENTIATORS has 6 items`
   - `each item has icon, title, and description`
   - `no competitor names in any title or description` — check array against `["YouVersion", "Pray.com", "Hallow", "Abide", "Glorify", "Bible app", "prayer app"]`

2. **Component render tests:**
   - `renders section heading "Built for Your Heart, Not Our Bottom Line"` — `getByRole('heading', { name: /built for your heart/i })`
   - `renders tagline` — `getByText(/the things we'll never do/i)`
   - `renders all 6 card titles` — loop through DIFFERENTIATORS, `getByText(item.title)`
   - `renders all 6 card descriptions` — loop through DIFFERENTIATORS, `getByText(item.description)`
   - `section has aria-label` — `getByRole('region', { name: /what makes worship room different/i })`
   - `renders 6 icon containers` — `container.querySelectorAll('.rounded-xl.bg-white\\/\\[0\\.06\\]')` or use test structure to count
   - `all icons have aria-hidden` — query all SVG elements, assert each has `aria-hidden="true"`
   - `uses GlowBackground` — `container.querySelector('.bg-hero-bg')` exists
   - `cards have stagger delay styles` — check first and last card wrapper for `transitionDelay` style
   - `cards have scroll-reveal class` — check card wrappers have `scroll-reveal` and `is-visible` classes
   - `no competitor names in rendered content` — assert textContent of section does not include competitor names

**Auth gating:** N/A

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT test responsive layout (CSS grid behavior) — that's visual testing territory
- DO NOT snapshot test — use targeted assertions
- DO NOT add `MemoryRouter` or auth providers — this component has no routing or auth dependencies

**Test specifications:**
This IS the test step — see details above for the ~14 tests.

**Expected state after completion:**
- [x] Test file created with ~14 tests
- [x] All tests pass
- [x] All existing tests still pass (run `pnpm test` to verify)
- [x] Build passes with 0 errors

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Create differentiator-data.ts with types and data |
| 2 | 1 | Build DifferentiatorSection component using data |
| 3 | 2 | Integrate into Home.tsx + barrel export |
| 4 | 1, 2, 3 | Tests for data and component |

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Differentiator data file | [COMPLETE] | 2026-04-02 | Created `differentiator-data.ts` with `DifferentiatorItem` interface and `DIFFERENTIATORS` array (6 items). Icons: ShieldOff, EyeOff, CreditCard, HeartHandshake, Sparkles, LifeBuoy. |
| 2 | DifferentiatorSection component | [COMPLETE] | 2026-04-02 | Created `DifferentiatorSection.tsx` with GlowBackground variant="split", SectionHeading, responsive grid (1/2/3 cols), FrostedCard cards, scroll reveal with stagger. |
| 3 | Home.tsx integration + barrel export | [COMPLETE] | 2026-04-02 | Added `DifferentiatorSection` to barrel export in `index.ts`. Imported and rendered in `Home.tsx` below `PillarSection`, replacing HP-5 comment. HP-6/HP-7 comments preserved. tsc passes. (Pre-existing `pnpm build` failure due to workbox-window PWA issue, unrelated.) |
| 4 | Tests | [COMPLETE] | 2026-04-02 | Created `DifferentiatorSection.test.tsx` with 14 tests (3 data tests + 11 component tests). All 14 pass. Full suite: 5443 pass / 0 fail. |
