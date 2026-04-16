# Implementation Plan: HP-1 Homepage Redesign — Foundation & Teardown

**Spec:** `_specs/homepage-redesign-foundation.md`
**Date:** 2026-04-02
**Branch:** `homepage-redesign` (shared across HP-1 through HP-7 — do NOT create new branch)
**Design System Reference:** `_plans/recon/design-system.md` (loaded)
**Recon Report:** not applicable (HP-1 is infrastructure — no new visible sections to verify)
**Master Spec Plan:** not applicable (HP-1 is the first spec in the series)

---

## Architecture Context

### Project Structure

- Components: `frontend/src/components/` — feature-grouped directories
- Pages: `frontend/src/pages/`
- Hooks: `frontend/src/hooks/`
- Constants: `frontend/src/constants/`
- CSS: `frontend/src/index.css` (global utilities + reduced-motion overrides)
- Tailwind config: `frontend/tailwind.config.js`
- Tests: Co-located as `__tests__/ComponentName.test.tsx` within component directories, or `hooks/__tests__/` for hooks

### Key Existing Files

- **`src/pages/Home.tsx`** (67 lines) — Renders: `<Navbar transparent hideBanner>`, `<HeroSection>`, `<JourneySection>`, `<GrowthTeasersSection>`, `<StartingPointQuiz>`, `<SiteFooter>`. Uses `bg-neutral-bg` wrapper, JSON-LD schema, skip-to-content link, `useRoutePreload`.
- **`src/components/JourneySection.tsx`** (204 lines) — Being deleted. Uses `BackgroundSquiggle`, `useInView`, `WHITE_PURPLE_GRADIENT`. 7-step vertical timeline.
- **`src/components/BackgroundSquiggle.tsx`** — Shared SVG squiggle. Used by 7 files: 4 Daily Hub tabs (`PrayTabContent`, `JournalTabContent`, `MeditateTabContent`, `DevotionalTabContent`), `AskPage`, `StartingPointQuiz`, `JourneySection`. **Must be preserved** after JourneySection deletion.
- **`src/constants/gradients.tsx`** — `WHITE_PURPLE_GRADIENT = 'linear-gradient(223deg, #FFFFFF 0%, #8B5CF6 100%)'`, `GRADIENT_TEXT_STYLE` (CSSProperties), `renderWithScriptAccent()` helper.
- **`src/hooks/useInView.ts`** — Existing IntersectionObserver hook. Returns `[ref, inView]` tuple. Respects `prefers-reduced-motion`. The new `useScrollReveal` is a separate hook (different API, `triggerOnce` default, `isVisible` naming).
- **`src/index.css`** — `@layer utilities` block (lines 43-69) has `.liquid-glass`. Reduced-motion block (lines 71-124) overrides various animations. New scroll-reveal utilities go inside the existing `@layer utilities` block.

### Tailwind Config Tokens

- `hero-bg`: `#08051A` (confirmed in `tailwind.config.js`)
- `hero-dark`: `#0D0620`, `hero-mid`: `#1E0B3E`, `hero-deep`: `#251248`
- `primary`: `#6D28D9`, `primary-lt`: `#8B5CF6`

### Test Patterns (from `HeroSection.test.tsx`, `GrowthTeasersSection.test.tsx`)

```tsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'

function renderComponent() {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ToastProvider>
        <AuthModalProvider>
          <ComponentToTest />
        </AuthModalProvider>
      </ToastProvider>
    </MemoryRouter>
  )
}
```

- Provider wrapping: `MemoryRouter` (with future flags) → `ToastProvider` → `AuthModalProvider`
- Accessibility-first: `screen.getByRole()`, `screen.getByText()`
- Interaction: `userEvent.setup()` + `await user.click()`
- Mocking: `vi.spyOn()` for browser APIs, `vi.mock()` for modules
- New infrastructure components (GlowBackground, SectionHeading, FrostedCard) do NOT need auth/toast providers — they're pure presentation. Simple `render(<Component />)` is sufficient.

---

## Auth Gating Checklist

N/A — This spec creates infrastructure components and removes a section from the public landing page. No interactive elements require authentication.

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| GlowBackground base | background-color | `#08051A` (`bg-hero-bg`) | `tailwind.config.js` |
| GlowBackground glow (purple) | color | `rgba(139, 92, 246, 0.06)` | spec (new pattern) |
| GlowBackground glow (white, split) | color | `rgba(255, 255, 255, 0.03)` | spec (new pattern) |
| GlowBackground glow orb | size | 400-600px, `border-radius: 50%` | spec (new pattern) |
| GlowBackground glow orb | blur | `filter: blur(100px)` or `radial-gradient` | spec (new pattern) |
| SectionHeading gradient | background-image | `linear-gradient(223deg, #FFFFFF 0%, #8B5CF6 100%)` | `constants/gradients.tsx:6` |
| SectionHeading font (desktop) | font | Inter, `text-5xl` (3rem), `font-bold` | spec |
| SectionHeading font (tablet) | font | `text-4xl` (2.25rem) | spec |
| SectionHeading font (mobile) | font | `text-3xl` (1.875rem) | spec |
| SectionHeading tagline | color | `text-white/60`, `text-base sm:text-lg` | spec |
| FrostedCard base | background | `bg-white/[0.05]` | spec |
| FrostedCard base | backdrop-filter | `backdrop-blur-sm` | spec |
| FrostedCard base | border | `border border-white/[0.08]` | spec |
| FrostedCard base | border-radius | `rounded-2xl` | spec |
| FrostedCard base | padding | `p-6` | spec |
| FrostedCard hover | background | `bg-white/[0.08]` | spec |
| FrostedCard hover | border | `border-white/[0.12]` | spec |
| FrostedCard hover | transform | `translateY(-2px)` | spec |
| Dashboard card (reference) | pattern | `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl` | design-system.md |

**Note:** FrostedCard uses slightly different opacity values (`0.05`/`0.08`) from dashboard cards (`5%`/`10%`). This is intentional — landing page context per spec.

---

## Design System Reminder

**Project-specific quirks for `/execute-plan` to display before every UI step:**

- Worship Room uses Caveat (`font-script`) for script/highlighted headings, not Lora
- `WHITE_PURPLE_GRADIENT` = `linear-gradient(223deg, #FFFFFF 0%, #8B5CF6 100%)` — apply via `background-clip: text` + `text-transparent`
- Import `GRADIENT_TEXT_STYLE` from `constants/gradients.tsx` for CSSProperties version
- Dashboard cards use `bg-white/5 border-white/10` — FrostedCard uses `bg-white/[0.05] border-white/[0.08]` (different pattern, per spec)
- All dark backgrounds use `bg-hero-bg` (#08051A) for the landing page, not `bg-hero-dark` (#0D0620)
- Landing page hero gradient fades to lavender `#EDE9FE`, inner page heroes fade to `#F5F5F5`
- Text opacity standards: primary text `text-white/70`, secondary `text-white/60`, placeholder `text-white/50`
- Use `cn()` from `@/lib/utils` for conditional classnames (clsx + tailwind-merge)
- `BackgroundSquiggle` uses `SQUIGGLE_MASK_STYLE` for fade mask — NOT related to this spec
- No recent plan execution logs showed design system deviations — patterns are stable

---

## Shared Data Models (from Master Plan)

N/A — HP-1 is the first spec in the series. No shared models consumed or produced.

**Components produced by this spec (consumed by HP-2 through HP-7):**
- `GlowBackground` — atmospheric section backgrounds
- `SectionHeading` — consistent gradient text headings
- `FrostedCard` — frosted glass cards
- `useScrollReveal` + `staggerDelay` — scroll-triggered animations
- `.scroll-reveal` / `.scroll-reveal-fade` CSS utilities

**localStorage keys this spec touches:** None.

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | < 640px | GlowBackground: glow orbs scale down (300-400px). SectionHeading: `text-3xl`. FrostedCard: `p-6` maintained. |
| Tablet | 640-1024px | GlowBackground: glow orbs at medium size (400-500px). SectionHeading: `text-4xl`. |
| Desktop | > 1024px | GlowBackground: full-size glow orbs (500-600px). SectionHeading: `text-5xl`. |

Components are building blocks — responsive specifics of their usage will be defined in HP-2 through HP-7.

---

## Vertical Rhythm

N/A for this spec — HP-1 removes JourneySection (creating a gap between HeroSection and GrowthTeasersSection) and creates infrastructure components. Vertical rhythm between new sections will be defined in HP-2+.

**Expected gap after HP-1:** HeroSection bottom → GrowthTeasersSection top. This visual gap is intentional and expected — HP-2 fills it.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] On the `homepage-redesign` branch (do NOT create a new branch)
- [x] `bg-hero-bg` (#08051A) exists in `tailwind.config.js`
- [x] `WHITE_PURPLE_GRADIENT` exists in `constants/gradients.tsx`
- [x] `BackgroundSquiggle.tsx` is used by 7 files (4 Daily Hub tabs, AskPage, StartingPointQuiz, JourneySection) — safe to keep after JourneySection deletion
- [x] No existing `src/components/homepage/` directory — creating from scratch
- [x] Existing `useInView` hook in `src/hooks/useInView.ts` — new `useScrollReveal` is separate (different API, `triggerOnce` default)
- [x] `@layer utilities` block in `index.css` at lines 43-69 — new utilities added within this block
- [x] No auth-gated actions in this spec
- [x] No [UNVERIFIED] values that require pixel-level accuracy — GlowBackground is a new pattern defined by spec, visual verification deferred to HP-2+ when first used in visible sections

⚠️ Design system recon may be stale (captured 2026-03-06, before Round 3 enhancements). However, for HP-1 (teardown + infrastructure), the relevant values (hero-bg color, gradient constants, tailwind tokens) have not changed. Low risk for this spec.

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| BackgroundSquiggle after JourneySection deletion | Keep | Used by 7 other files (4 Daily Hub tabs, AskPage, StartingPointQuiz, self) |
| `useScrollReveal` vs modifying `useInView` | Separate hook | Spec requires different API (`isVisible` vs `inView`, `triggerOnce` default). Avoids breaking 7+ existing `useInView` consumers. |
| GlowBackground float animation | CSS `@keyframes` gated behind `prefers-reduced-motion: no-preference` | Spec defines subtle 20s float. Pure CSS, no JS runtime cost. |
| FrostedCard hover styles when no `onClick` | No interactive styles | Spec: "Interactive hover lift when `onClick` is provided." Non-interactive cards are static. |
| FrostedCard `as` prop default | `div` | Spec: `as?: 'div' | 'button' | 'article'`. Default `div` is safest semantic choice. |
| Scroll-reveal reduced-motion approach | Immediately visible (`opacity: 1`, `transform: none`, `transition: none`) | Spec + WCAG: users who prefer reduced motion see content without any animation. |
| JourneySection test file | Delete if exists | Co-located test for deleted component should be removed. |
| GlowBackground glow orb implementation | `radial-gradient` on pseudo-elements (not `filter: blur`) | Radial gradient is more performant (no repainting) and works in all browsers. Spec allows either approach. |

---

## Implementation Steps

### Step 1: Remove JourneySection + Update Home.tsx

**Objective:** Delete JourneySection component and its test, remove from Home.tsx, add HP-2–HP-7 placeholder comments.

**Files to create/modify:**
- `src/components/JourneySection.tsx` — DELETE
- `src/components/__tests__/JourneySection.test.tsx` — DELETE (if exists)
- `src/pages/Home.tsx` — MODIFY (remove import/usage, add placeholder comments)

**Details:**

1. Delete `src/components/JourneySection.tsx` (204 lines).
2. Check if `src/components/__tests__/JourneySection.test.tsx` exists — if so, delete it.
3. In `Home.tsx`:
   - Remove `import { JourneySection } from '@/components/JourneySection'`
   - Remove `<JourneySection />` from JSX
   - Add placeholder comments between `<HeroSection />` and `<GrowthTeasersSection />`:
     ```tsx
     <HeroSection />
     {/* === Homepage Redesign Sections === */}
     {/* HP-2: FeatureShowcase */}
     {/* HP-3: StatsBar */}
     {/* HP-4: PillarSection */}
     {/* HP-5: DifferentiatorSection */}
     {/* HP-6: DashboardPreview (currently GrowthTeasersSection -- will be evolved) */}
     {/* HP-7: Quiz Polish + FinalCTA */}
     {/* === End Homepage Redesign === */}
     <GrowthTeasersSection />
     ```
4. Verify `BackgroundSquiggle.tsx` is NOT deleted — it is used by 6 other files.

**Auth gating:** N/A

**Responsive behavior:** N/A: no UI impact (removing a section, adding comments)

**Guardrails (DO NOT):**
- DO NOT delete `BackgroundSquiggle.tsx` — still used by 4 Daily Hub tabs, AskPage, StartingPointQuiz
- DO NOT modify `HeroSection.tsx`, `GrowthTeasersSection.tsx`, or `StartingPointQuiz.tsx`
- DO NOT remove the `DevAuthToggle` or `SEO` component from Home.tsx
- DO NOT remove the `useRoutePreload` call

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Home renders without JourneySection | integration | Verify `Home` renders HeroSection and GrowthTeasersSection but NOT JourneySection text ("Your Journey to Healing") |
| BackgroundSquiggle still importable | unit | Verify `BackgroundSquiggle` module can be imported (not accidentally deleted) |

**Expected state after completion:**
- [x] `JourneySection.tsx` no longer exists in the codebase
- [x] `Home.tsx` has no reference to JourneySection
- [x] `Home.tsx` has HP-2 through HP-7 placeholder comments
- [x] `BackgroundSquiggle.tsx` still exists and is importable
- [x] Build passes

---

### Step 2: Create GlowBackground Component + Homepage Directory

**Objective:** Create the homepage component directory, barrel export, and GlowBackground atmospheric background component.

**Files to create/modify:**
- `src/components/homepage/GlowBackground.tsx` — CREATE
- `src/components/homepage/index.ts` — CREATE (barrel export)

**Details:**

Create `src/components/homepage/` directory.

**`GlowBackground.tsx`:**

```tsx
import { cn } from '@/lib/utils'

interface GlowBackgroundProps {
  children: React.ReactNode
  variant?: 'center' | 'left' | 'right' | 'split' | 'none'
  className?: string
}

export function GlowBackground({
  children,
  variant = 'center',
  className,
}: GlowBackgroundProps) {
  return (
    <div className={cn('relative overflow-hidden bg-hero-bg', className)}>
      {variant !== 'none' && <GlowOrbs variant={variant} />}
      <div className="relative z-10">{children}</div>
    </div>
  )
}
```

**Glow orb implementation — use absolutely positioned divs with radial gradients:**

- `center`: Single orb. `position: absolute`, `top: 30%`, `left: 50%`, `transform: translateX(-50%)`. Size: `w-[300px] h-[300px] sm:w-[400px] sm:h-[400px] lg:w-[600px] lg:h-[600px]`. Style: `background: radial-gradient(circle, rgba(139, 92, 246, 0.06) 0%, transparent 70%)`. `rounded-full`.
- `left`: Single orb. `top: 40%`, `left: 20%`, `transform: translate(-50%, -50%)`. Same sizing and purple color.
- `right`: Single orb. `top: 40%`, `left: 80%`, `transform: translate(-50%, -50%)`. Same sizing and purple color.
- `split`: Two orbs. First at `left: 25%` (purple `rgba(139, 92, 246, 0.06)`), second at `left: 75%` (white `rgba(255, 255, 255, 0.03)`).
- `none`: No orb divs rendered.

**Float animation (optional, gated):**

Add a subtle CSS `@keyframes glow-float` animation (translateY ±10px over 20s) in a `<style>` JSX block or via Tailwind `animate-` class. Gate behind `@media (prefers-reduced-motion: no-preference)`. If the `prefers-reduced-motion: reduce` is active, no animation class is applied.

Alternatively, use an inline style with `animation` property, wrapped in a check for `window.matchMedia('(prefers-reduced-motion: reduce)').matches`. Prefer the CSS media query approach (cleaner, no JS).

Implementation approach: Define the `@keyframes glow-float` in a `<style>` tag within the component (scoped) or add to `tailwind.config.js` as a custom animation. Prefer `tailwind.config.js` for consistency:

```js
// In tailwind.config.js keyframes:
'glow-float': {
  '0%, 100%': { transform: 'translateY(0) translateX(-50%)' },
  '50%': { transform: 'translateY(-10px) translateX(-50%)' },
}
// In animation:
'glow-float': 'glow-float 20s ease-in-out infinite',
```

Then in the component, glow orb divs get `className="... animate-glow-float motion-reduce:animate-none"`.

**Barrel export (`index.ts`):**

```ts
export { GlowBackground } from './GlowBackground'
```

**Auth gating:** N/A

**Responsive behavior:**
- Desktop (> 1024px): Glow orbs 500-600px (`lg:w-[600px] lg:h-[600px]`)
- Tablet (640-1024px): Glow orbs 400-500px (`sm:w-[400px] sm:h-[400px]`)
- Mobile (< 640px): Glow orbs 300-400px (`w-[300px] h-[300px]`)

**Guardrails (DO NOT):**
- DO NOT use `<canvas>` or JS animations for glow effects — CSS only
- DO NOT add any npm dependencies
- DO NOT use `filter: blur()` on the orb divs — use `radial-gradient` with transparent falloff instead (more performant, no repaint cost)
- DO NOT forget `prefers-reduced-motion` support — glow float animation must be disabled

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| renders children | unit | Verify children are rendered inside the component |
| renders with relative + overflow-hidden | unit | Verify outer div has `position: relative` and `overflow: hidden` |
| variant="center" renders single glow orb | unit | Verify exactly 1 glow orb div is rendered |
| variant="split" renders two glow orbs | unit | Verify exactly 2 glow orb divs are rendered |
| variant="none" renders no glow orbs | unit | Verify 0 glow orb divs are rendered |
| children have z-10 wrapper | unit | Verify children wrapper has `z-10` class for stacking above orbs |
| applies bg-hero-bg | unit | Verify outer div has `bg-hero-bg` class |
| accepts className prop | unit | Verify custom className is applied |

**Expected state after completion:**
- [x] `src/components/homepage/` directory exists
- [x] `GlowBackground.tsx` renders atmospheric backgrounds with 5 variants
- [x] `index.ts` exports `GlowBackground`
- [x] Build passes

---

### Step 3: Create SectionHeading + FrostedCard Components

**Objective:** Create the SectionHeading gradient text heading and FrostedCard frosted glass card components. Update barrel export.

**Files to create/modify:**
- `src/components/homepage/SectionHeading.tsx` — CREATE
- `src/components/homepage/FrostedCard.tsx` — CREATE
- `src/components/homepage/index.ts` — MODIFY (add exports)

**Details:**

**`SectionHeading.tsx`:**

```tsx
import { cn } from '@/lib/utils'
import { GRADIENT_TEXT_STYLE } from '@/constants/gradients'

interface SectionHeadingProps {
  heading: string
  tagline?: string
  align?: 'center' | 'left'
  className?: string
}

export function SectionHeading({
  heading,
  tagline,
  align = 'center',
  className,
}: SectionHeadingProps) {
  const isCenter = align === 'center'

  return (
    <div className={cn(isCenter && 'text-center', className)}>
      <h2
        className="text-3xl sm:text-4xl lg:text-5xl font-bold"
        style={GRADIENT_TEXT_STYLE}
      >
        {heading}
      </h2>
      {tagline && (
        <p
          className={cn(
            'text-base sm:text-lg text-white/60 mt-3 max-w-2xl',
            isCenter && 'mx-auto'
          )}
        >
          {tagline}
        </p>
      )}
    </div>
  )
}
```

Key: Uses `GRADIENT_TEXT_STYLE` from `constants/gradients.tsx` which applies `background-image: WHITE_PURPLE_GRADIENT`, `WebkitBackgroundClip: 'text'`, `WebkitTextFillColor: 'transparent'`, `backgroundClip: 'text'`, `color: 'white'` (fallback).

**`FrostedCard.tsx`:**

```tsx
import { cn } from '@/lib/utils'

interface FrostedCardProps {
  children: React.ReactNode
  onClick?: () => void
  className?: string
  as?: 'div' | 'button' | 'article'
}

export function FrostedCard({
  children,
  onClick,
  className,
  as: Component = 'div',
}: FrostedCardProps) {
  const isInteractive = !!onClick

  return (
    <Component
      onClick={onClick}
      className={cn(
        'bg-white/[0.05] backdrop-blur-sm border border-white/[0.08] rounded-2xl p-6',
        'transition-all duration-200 ease-out',
        isInteractive && [
          'cursor-pointer',
          'hover:bg-white/[0.08] hover:border-white/[0.12]',
          'hover:-translate-y-0.5',
          'motion-reduce:hover:translate-y-0',
        ],
        className
      )}
    >
      {children}
    </Component>
  )
}
```

Key decisions:
- `hover:-translate-y-0.5` gives a 2px lift (Tailwind `0.5` = 0.125rem ≈ 2px)
- `motion-reduce:hover:translate-y-0` disables the lift for reduced motion
- When no `onClick`, no interactive hover classes are applied
- Polymorphic `as` prop defaults to `'div'`

**Update barrel export (`index.ts`):**

```ts
export { GlowBackground } from './GlowBackground'
export { SectionHeading } from './SectionHeading'
export { FrostedCard } from './FrostedCard'
```

**Auth gating:** N/A

**Responsive behavior:**
- SectionHeading: `text-3xl` (mobile) → `text-4xl` (sm) → `text-5xl` (lg)
- SectionHeading tagline: `text-base` (mobile) → `text-lg` (sm)
- FrostedCard: `p-6` at all breakpoints (consistent padding per spec)

**Guardrails (DO NOT):**
- DO NOT use `dangerouslySetInnerHTML` in SectionHeading
- DO NOT add `tabIndex` or `role` to FrostedCard when `as="div"` and no `onClick` — only interactive cards need keyboard semantics, and `as="button"` provides them natively
- DO NOT use `bg-white/5` (dashboard pattern) — use `bg-white/[0.05]` (spec-defined landing page pattern)
- DO NOT add hover styles when no `onClick` is provided — static cards should not lift on hover

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| SectionHeading renders heading with gradient style | unit | Verify `<h2>` has `GRADIENT_TEXT_STYLE` applied |
| SectionHeading renders tagline when provided | unit | Verify tagline `<p>` with `text-white/60` class |
| SectionHeading omits tagline when not provided | unit | Verify no `<p>` element when tagline is undefined |
| SectionHeading align="center" adds centering classes | unit | Verify `text-center` on wrapper, `mx-auto` on tagline |
| SectionHeading align="left" does not add centering | unit | Verify no `text-center` or `mx-auto` classes |
| FrostedCard renders children | unit | Verify children text is rendered |
| FrostedCard renders as div by default | unit | Verify rendered element is `<div>` |
| FrostedCard as="button" renders button element | unit | Verify rendered element is `<button>` |
| FrostedCard as="article" renders article element | unit | Verify rendered element is `<article>` |
| FrostedCard with onClick has cursor-pointer | unit | Verify `cursor-pointer` class is present |
| FrostedCard without onClick lacks interactive hover | unit | Verify no `cursor-pointer` class |
| FrostedCard applies custom className | unit | Verify custom className is merged |

**Expected state after completion:**
- [x] `SectionHeading.tsx` renders gradient text heading with optional tagline
- [x] `FrostedCard.tsx` renders polymorphic frosted glass card with optional interactivity
- [x] Barrel export includes all 3 components
- [x] Build passes

---

### Step 4: Create useScrollReveal Hook + staggerDelay Utility

**Objective:** Create the IntersectionObserver-based scroll reveal hook and stagger delay utility function.

**Files to create/modify:**
- `src/hooks/useScrollReveal.ts` — CREATE

**Details:**

```tsx
import { useEffect, useRef, useState } from 'react'

interface UseScrollRevealOptions {
  threshold?: number    // Default: 0.1
  rootMargin?: string   // Default: '-50px'
  triggerOnce?: boolean // Default: true
}

export function useScrollReveal(options: UseScrollRevealOptions = {}): {
  ref: React.RefObject<HTMLElement | null>
  isVisible: boolean
} {
  const { threshold = 0.1, rootMargin = '-50px', triggerOnce = true } = options

  // Respect prefers-reduced-motion: start visible immediately
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const ref = useRef<HTMLElement | null>(null)
  const [isVisible, setIsVisible] = useState(prefersReducedMotion)

  useEffect(() => {
    if (prefersReducedMotion) return

    const element = ref.current
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          if (triggerOnce) {
            observer.unobserve(element)
          }
        } else if (!triggerOnce) {
          setIsVisible(false)
        }
      },
      { threshold, rootMargin }
    )

    observer.observe(element)

    return () => observer.disconnect()
  }, [threshold, rootMargin, triggerOnce, prefersReducedMotion])

  return { ref, isVisible }
}
```

**`staggerDelay` utility (exported from same file):**

```tsx
import type { CSSProperties } from 'react'

export function staggerDelay(
  index: number,
  baseDelay = 100,
  initialDelay = 0
): CSSProperties {
  return { transitionDelay: `${initialDelay + index * baseDelay}ms` }
}
```

Key differences from existing `useInView`:
- Returns `{ ref, isVisible }` object (not `[ref, inView]` tuple)
- `triggerOnce` defaults to `true` (useInView does not have this)
- Different rootMargin default (`'-50px'` vs `'0px'`)
- `isVisible` naming (vs `inView`)
- Does NOT modify or replace `useInView`

**Auth gating:** N/A

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT modify the existing `useInView` hook — they coexist
- DO NOT import from `useInView` — `useScrollReveal` is fully standalone
- DO NOT use `document.querySelector` or manual DOM manipulation — use React ref
- DO NOT forget the `prefersReducedMotion` check — must start visible immediately when motion is reduced

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| returns isVisible false initially | unit | Verify `isVisible` is `false` before intersection |
| returns isVisible true after intersection | unit | Mock IntersectionObserver, trigger entry — verify `isVisible` becomes `true` |
| triggerOnce=true keeps isVisible after exit | unit | After element intersects and leaves, `isVisible` remains `true` |
| triggerOnce=false resets isVisible on exit | unit | After element leaves viewport, `isVisible` returns to `false` |
| prefers-reduced-motion returns isVisible true immediately | unit | Mock `matchMedia` to return `reduce` — verify `isVisible` starts `true` |
| ref is a valid RefObject | unit | Verify `ref` is a valid React ref object |
| staggerDelay returns correct transitionDelay | unit | `staggerDelay(2, 100, 50)` returns `{ transitionDelay: '250ms' }` |
| staggerDelay with defaults | unit | `staggerDelay(3)` returns `{ transitionDelay: '300ms' }` |
| staggerDelay with index 0 | unit | `staggerDelay(0)` returns `{ transitionDelay: '0ms' }` |

**Expected state after completion:**
- [x] `useScrollReveal` hook exists at `src/hooks/useScrollReveal.ts`
- [x] `staggerDelay` utility exported from same file
- [x] Neither modifies existing `useInView` hook
- [x] Build passes

---

### Step 5: Add Scroll-Reveal CSS Utilities

**Objective:** Add `.scroll-reveal` and `.scroll-reveal-fade` CSS utility classes with reduced-motion support.

**Files to create/modify:**
- `src/index.css` — MODIFY (add to existing `@layer utilities` block + reduced-motion block)

**Details:**

Add inside the existing `@layer utilities { ... }` block (after the `.liquid-glass` rules, before the closing `}`):

```css
  .scroll-reveal {
    opacity: 0;
    transform: translateY(12px);
    transition: opacity 600ms ease-out, transform 600ms ease-out;
  }
  .scroll-reveal.is-visible {
    opacity: 1;
    transform: translateY(0);
  }
  .scroll-reveal-fade {
    opacity: 0;
    transition: opacity 600ms ease-out;
  }
  .scroll-reveal-fade.is-visible {
    opacity: 1;
  }
```

Add a new `@media (prefers-reduced-motion: reduce)` block after the existing one (or append to the existing block at lines 71-124):

```css
  .scroll-reveal,
  .scroll-reveal-fade {
    opacity: 1;
    transform: none;
    transition: none;
  }
```

If appending to the existing reduced-motion block, add before its closing `}`.

**Auth gating:** N/A

**Responsive behavior:** N/A: no UI impact (CSS utility definitions)

**Guardrails (DO NOT):**
- DO NOT remove or modify any existing utility classes (`.liquid-glass`, etc.)
- DO NOT create a separate CSS file — add to the existing `index.css`
- DO NOT use Tailwind `@apply` — these are custom CSS utilities that need to work with the `.is-visible` class toggle pattern
- DO NOT forget the reduced-motion override — users who prefer reduced motion must see content immediately

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| scroll-reveal classes exist in CSS | integration | Build passes and the CSS utilities are in the output bundle (verified by build success) |

**Expected state after completion:**
- [x] `index.css` has `.scroll-reveal` and `.scroll-reveal-fade` utilities in `@layer utilities`
- [x] Reduced-motion overrides show elements immediately
- [x] Existing utilities unchanged
- [x] Build passes

---

### Step 6: Tests for Home.tsx Changes + GlowBackground

**Objective:** Write tests verifying JourneySection removal and GlowBackground behavior.

**Files to create/modify:**
- `src/pages/__tests__/Home.test.tsx` — MODIFY (update existing tests for JourneySection removal) or CREATE if not exists
- `src/components/homepage/__tests__/GlowBackground.test.tsx` — CREATE

**Details:**

**Home.test.tsx updates:**

Follow existing test wrapping pattern (`MemoryRouter` + `ToastProvider` + `AuthModalProvider`). Verify:
1. "Your Journey to Healing" text is NOT present
2. HeroSection content IS present (e.g., "How're You Feeling Today?" or similar hero text)
3. GrowthTeasersSection content IS present
4. StartingPointQuiz content IS present

**GlowBackground.test.tsx:**

Simple render tests — no provider wrapping needed (pure presentation component).

```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { GlowBackground } from '../GlowBackground'
```

Test the 8 cases listed in Step 2's test specifications. Use `data-testid` attributes on glow orb divs (e.g., `data-testid="glow-orb"`) to query them. Alternatively, use container queries to count child divs with specific classes.

**Auth gating:** N/A

**Responsive behavior:** N/A: no UI impact (tests only)

**Guardrails (DO NOT):**
- DO NOT snapshot test — use targeted assertions
- DO NOT test internal implementation details beyond what's specified (e.g., don't assert exact pixel sizes of glow orbs)
- DO NOT delete existing Home.test.tsx tests that still apply — only remove/update JourneySection-specific assertions

**Test specifications:**
(This step IS the test writing step — tests listed in Steps 1 and 2 are implemented here.)

**Expected state after completion:**
- [x] Home.test.tsx confirms JourneySection is removed
- [x] GlowBackground.test.tsx has 8 passing tests
- [x] All tests pass (`pnpm test`)

---

### Step 7: Tests for SectionHeading + FrostedCard + useScrollReveal

**Objective:** Write tests for remaining new components and the hook.

**Files to create/modify:**
- `src/components/homepage/__tests__/SectionHeading.test.tsx` — CREATE
- `src/components/homepage/__tests__/FrostedCard.test.tsx` — CREATE
- `src/hooks/__tests__/useScrollReveal.test.ts` — CREATE

**Details:**

**SectionHeading.test.tsx:**

Simple render tests — no provider wrapping needed. Test the 5 cases from Step 3.

Key assertion: Verify the `<h2>` element has `style` including `backgroundImage` matching `WHITE_PURPLE_GRADIENT`. Use `element.style.backgroundImage` or `toHaveStyle()`.

**FrostedCard.test.tsx:**

Test the 7 cases from Step 3. For polymorphic `as` prop testing:
- `screen.getByRole('button')` for `as="button"`
- `container.querySelector('article')` for `as="article"`
- `container.querySelector('div')` for default

For `onClick` testing:
- Render with `onClick={vi.fn()}`, verify `cursor-pointer` class
- Render without `onClick`, verify no `cursor-pointer` class

**useScrollReveal.test.ts:**

Mock `IntersectionObserver` and `matchMedia`:

```tsx
// Mock IntersectionObserver
const mockObserve = vi.fn()
const mockUnobserve = vi.fn()
const mockDisconnect = vi.fn()

let intersectionCallback: IntersectionObserverCallback

beforeEach(() => {
  vi.stubGlobal('IntersectionObserver', vi.fn((cb) => {
    intersectionCallback = cb
    return { observe: mockObserve, unobserve: mockUnobserve, disconnect: mockDisconnect }
  }))
})
```

For `prefers-reduced-motion` testing:
```tsx
vi.stubGlobal('matchMedia', vi.fn((query: string) => ({
  matches: query === '(prefers-reduced-motion: reduce)',
  media: query,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
})))
```

Test the 9 cases from Step 4. Use `renderHook` from `@testing-library/react` for hook testing.

`staggerDelay` tests are pure function tests — no hooks needed:
```tsx
import { staggerDelay } from '../useScrollReveal'
expect(staggerDelay(2, 100, 50)).toEqual({ transitionDelay: '250ms' })
```

**Auth gating:** N/A

**Responsive behavior:** N/A: no UI impact (tests only)

**Guardrails (DO NOT):**
- DO NOT test CSS class names that Tailwind may purge or rename — test behavior and attributes
- DO NOT use enzyme or shallow rendering — use React Testing Library
- DO NOT forget to clean up mocked globals in `afterEach`

**Test specifications:**
(This step IS the test writing step — tests listed in Steps 3 and 4 are implemented here.)

**Expected state after completion:**
- [x] SectionHeading.test.tsx has 5 passing tests
- [x] FrostedCard.test.tsx has 7 passing tests
- [x] useScrollReveal.test.ts has 9 passing tests (6 hook + 3 staggerDelay)
- [x] All project tests pass (`pnpm test`)
- [x] Build passes with 0 errors

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Remove JourneySection + update Home.tsx |
| 2 | — | Create GlowBackground + homepage directory + barrel |
| 3 | 2 | Create SectionHeading + FrostedCard (needs barrel from Step 2) |
| 4 | — | Create useScrollReveal + staggerDelay |
| 5 | — | Add scroll-reveal CSS utilities |
| 6 | 1, 2 | Tests for Home.tsx changes + GlowBackground |
| 7 | 3, 4 | Tests for SectionHeading + FrostedCard + useScrollReveal |

**Parallelizable:** Steps 1, 2, 4, 5 can execute in parallel. Step 3 waits for 2. Steps 6-7 wait for their dependencies.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Remove JourneySection + Update Home.tsx | [COMPLETE] | 2026-04-02 | Deleted `JourneySection.tsx`, `JourneySection.test.tsx`, removed barrel export from `components/index.ts`. Updated `Home.tsx` with HP-2–HP-7 placeholder comments. |
| 2 | Create GlowBackground + Homepage Directory | [COMPLETE] | 2026-04-02 | Created `components/homepage/` dir, `GlowBackground.tsx` (5 variants with radial-gradient orbs), `index.ts` barrel. Added `glow-float` keyframe + animation to `tailwind.config.js`. |
| 3 | Create SectionHeading + FrostedCard | [COMPLETE] | 2026-04-02 | Created `SectionHeading.tsx` (gradient text, responsive sizing, optional tagline), `FrostedCard.tsx` (polymorphic, conditional interactivity). Updated barrel export. |
| 4 | Create useScrollReveal + staggerDelay | [COMPLETE] | 2026-04-02 | Created `hooks/useScrollReveal.ts` with IntersectionObserver hook + `staggerDelay` utility. Respects prefers-reduced-motion. |
| 5 | Add Scroll-Reveal CSS Utilities | [COMPLETE] | 2026-04-02 | Added `.scroll-reveal` and `.scroll-reveal-fade` to `@layer utilities` in `index.css`. Added reduced-motion overrides to existing media query block. |
| 6 | Tests for Home.tsx + GlowBackground | [COMPLETE] | 2026-04-02 | Updated `Home.test.tsx` (removed JourneySection assertion, added removal verification test). Created `GlowBackground.test.tsx` (8 tests). |
| 7 | Tests for SectionHeading + FrostedCard + useScrollReveal | [COMPLETE] | 2026-04-02 | Created `SectionHeading.test.tsx` (5 tests), `FrostedCard.test.tsx` (8 tests), `useScrollReveal.test.tsx` (9 tests). Used component wrapper for hook tests to provide real DOM ref. |
