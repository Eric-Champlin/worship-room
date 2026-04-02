# Feature: HP-1 Homepage Redesign — Foundation & Teardown

**Master Plan Reference:** N/A — this is the first spec in a 7-spec homepage redesign series (HP-1 through HP-7). All specs share the `homepage-redesign` branch.

---

## Overview

The Worship Room homepage is the first impression for hurting people seeking spiritual comfort. This spec removes the old `JourneySection` (a numbered step list that felt clinical) and builds the shared design system building blocks that all subsequent homepage sections (HP-2 through HP-7) will use. The new visual language — inspired by GitHub.com's dark aesthetic with glow backgrounds, frosted glass cards, gradient text headings, and scroll-triggered animations — creates a sanctuary-like atmosphere that draws visitors deeper into the healing experience.

This spec creates foundation only — no new visible sections yet, just teardown + infrastructure.

## User Story

As a **logged-out visitor**, I want to see a visually immersive, modern homepage so that I feel drawn into a peaceful sanctuary experience from the moment I arrive.

## Requirements

### Functional Requirements

1. **Remove JourneySection** — Delete `JourneySection.tsx` and remove its import/usage from `Home.tsx`. The "Your Journey to Healing" numbered list is replaced by the Feature Experience Showcase in HP-2.
2. **GlowBackground component** — Reusable atmospheric background with 5 preset glow variants (`center`, `left`, `right`, `split`, `none`). CSS-only glow orbs (radial gradients with blur), no canvas/JS animations. Respects `prefers-reduced-motion`.
3. **SectionHeading component** — Consistent gradient text heading using `WHITE_PURPLE_GRADIENT` from `constants/gradients.tsx`. Optional tagline. Supports `center` and `left` alignment.
4. **FrostedCard component** — Frosted glass card (`bg-white/[0.05]`, `backdrop-blur-sm`, `border-white/[0.08]`). Interactive hover lift when `onClick` is provided. Polymorphic `as` prop (`div`, `button`, `article`).
5. **useScrollReveal hook** — IntersectionObserver-based scroll reveal with `triggerOnce` support (default: true). Respects `prefers-reduced-motion` (starts visible immediately). Separate from existing `useInView` hook.
6. **staggerDelay utility** — Returns inline `transitionDelay` style for staggered animations.
7. **Scroll reveal CSS utilities** — `.scroll-reveal` (translate + fade) and `.scroll-reveal-fade` (fade only) with `.is-visible` state class. Reduced motion: immediately visible.
8. **Barrel export** — `src/components/homepage/index.ts` exports all new components.
9. **BackgroundSquiggle preserved** — Verify `BackgroundSquiggle.tsx` is still used by `StartingPointQuiz` after JourneySection deletion. Keep if so.

### Non-Functional Requirements

- Performance: All glow effects use CSS only (no canvas, no JS animations). Zero runtime overhead.
- Accessibility: All animations respect `prefers-reduced-motion`. FrostedCard with `as="button"` is keyboard accessible. SectionHeading uses semantic `<h2>`.
- Bundle: No new dependencies added. Components use existing Tailwind utilities.

## Auth Gating

N/A — This spec creates infrastructure components and removes a section from the public landing page. No interactive elements require authentication.

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| View homepage | Full access (landing page) | Redirects to Dashboard | N/A |

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | GlowBackground: glow orbs scale down (300-400px). SectionHeading: `text-3xl`. FrostedCard: `p-6` maintained. |
| Tablet (640-1024px) | GlowBackground: glow orbs at medium size (400-500px). SectionHeading: `text-4xl`. |
| Desktop (> 1024px) | GlowBackground: full-size glow orbs (500-600px). SectionHeading: `text-5xl`. |

Components are building blocks — responsive specifics of their usage will be defined in HP-2 through HP-7. The components themselves use responsive Tailwind classes (e.g., `text-3xl sm:text-4xl lg:text-5xl`).

## AI Safety Considerations

N/A — This feature does not involve AI-generated content or free-text user input. No crisis detection required.

## Auth & Persistence

- **Logged-out users:** See the updated homepage (JourneySection removed, gap between Hero and GrowthTeasers). No data persisted.
- **Logged-in users:** See Dashboard instead of homepage (existing behavior, unchanged).
- **localStorage usage:** None.

## Branch Strategy

**CRITICAL:** All HP specs (HP-1 through HP-7) share a single `homepage-redesign` branch. Do NOT create a new branch per spec.

## Part 1: Remove JourneySection

### 1a. Remove from Home.tsx

Remove the `JourneySection` import and usage. Section order after this spec:

```
Navbar
HeroSection
{/* HP-2 through HP-7 sections will be inserted here in future specs */}
GrowthTeasersSection  <- stays for now, HP-6 will evolve it
StartingPointQuiz     <- stays for now, HP-7 will polish it
SiteFooter
```

Visual gap between HeroSection and GrowthTeasersSection is expected — HP-2 fills it.

### 1b. Delete JourneySection.tsx

Delete `src/components/JourneySection.tsx`. Only used by `Home.tsx`.

### 1c. Verify BackgroundSquiggle

`BackgroundSquiggle.tsx` is used by both `JourneySection` and `StartingPointQuiz`. After JourneySection deletion, verify `StartingPointQuiz` still imports it. If yes, keep the file. (Based on recon, StartingPointQuiz uses it — keep it.)

## Part 2: Homepage Component Directory

Create `src/components/homepage/` with barrel export `index.ts`.

## Part 3: GlowBackground Component

**File:** `src/components/homepage/GlowBackground.tsx`

Atmospheric background with CSS glow orbs. Base: `bg-hero-bg` (#08051A).

### Props

```typescript
interface GlowBackgroundProps {
  children: React.ReactNode;
  variant?: 'center' | 'left' | 'right' | 'split' | 'none';
  className?: string;
}
```

### Variant Definitions

- `center`: Single large glow orb centered horizontally, slightly above vertical center. Purple-tinted (`rgba(139, 92, 246, 0.06)`).
- `left`: Glow orb at ~20% from left, ~40% from top. Purple-tinted.
- `right`: Glow orb at ~80% from left, ~40% from top. Purple-tinted.
- `split`: Two glow orbs — ~25% left (purple) + ~75% left (white, `rgba(255, 255, 255, 0.03)`).
- `none`: No glow orbs, just `bg-hero-bg`.

### Implementation Notes

- Outer div: `position: relative`, `overflow: hidden`
- Glow orbs: absolutely positioned `div`s with `border-radius: 50%`, 400-600px, `filter: blur(100px)` or `background: radial-gradient(circle, rgba(...) 0%, transparent 70%)`
- Children: `position: relative; z-index: 1`
- Optional subtle CSS `@keyframes` float (translateY +/-10px over 20s) gated behind `@media (prefers-reduced-motion: no-preference)`

## Part 4: SectionHeading Component

**File:** `src/components/homepage/SectionHeading.tsx`

### Props

```typescript
interface SectionHeadingProps {
  heading: string;
  tagline?: string;
  align?: 'center' | 'left';
  className?: string;
}
```

### Design

- Heading: `text-3xl sm:text-4xl lg:text-5xl font-bold` with `WHITE_PURPLE_GRADIENT` via `background-clip: text` + `text-transparent`. Import gradient from `constants/gradients.tsx`.
- Tagline: `text-base sm:text-lg text-white/60 mt-3 max-w-2xl`. Centered when `align="center"`.
- `align="center"` adds `text-center mx-auto` to wrapper.

## Part 5: FrostedCard Component

**File:** `src/components/homepage/FrostedCard.tsx`

### Props

```typescript
interface FrostedCardProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  as?: 'div' | 'button' | 'article';
}
```

### Design

- Base: `bg-white/[0.05] backdrop-blur-sm border border-white/[0.08] rounded-2xl p-6`
- Interactive (when `onClick`): `cursor-pointer`, hover: `bg-white/[0.08] border-white/[0.12] translateY(-2px)`
- Transition: `transition-all duration-200 ease-out`
- Respects `prefers-reduced-motion`

## Part 6: useScrollReveal Hook

**File:** `src/hooks/useScrollReveal.ts`

### API

```typescript
interface UseScrollRevealOptions {
  threshold?: number;    // Default: 0.1
  rootMargin?: string;   // Default: '-50px'
  triggerOnce?: boolean; // Default: true
}

function useScrollReveal(options?: UseScrollRevealOptions): {
  ref: React.RefObject<HTMLElement>;
  isVisible: boolean;
}
```

### Behavior

- IntersectionObserver-based
- `triggerOnce=true` (default): `isVisible` stays `true` permanently after first intersection
- `prefers-reduced-motion`: `isVisible` starts as `true` immediately
- Does NOT modify or replace existing `useInView` hook

### staggerDelay Utility (exported from same file)

```typescript
export function staggerDelay(
  index: number,
  baseDelay = 100,
  initialDelay = 0
): React.CSSProperties {
  return { transitionDelay: `${initialDelay + index * baseDelay}ms` };
}
```

## Part 7: Homepage CSS Utilities

Add to `src/index.css` (in `@layer utilities`):

```css
@layer utilities {
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
}

@media (prefers-reduced-motion: reduce) {
  .scroll-reveal,
  .scroll-reveal-fade {
    opacity: 1;
    transform: none;
    transition: none;
  }
}
```

## Part 8: Update Home.tsx

After building blocks are created:

1. Remove `JourneySection` import and usage
2. Add placeholder comments:

```tsx
{/* === Homepage Redesign Sections === */}
{/* HP-2: FeatureShowcase */}
{/* HP-3: StatsBar */}
{/* HP-4: PillarSection */}
{/* HP-5: DifferentiatorSection */}
{/* HP-6: DashboardPreview (currently GrowthTeasersSection -- will be evolved) */}
{/* HP-7: Quiz Polish + FinalCTA */}
{/* === End Homepage Redesign === */}
```

## Design Notes

- **Background color**: Uses `bg-hero-bg` (#08051A) — verify this Tailwind token exists in `tailwind.config.js`. The design system recon lists `bg-hero-dark` (#0D0620) as the closest dark background.
- **Gradient text**: Uses `WHITE_PURPLE_GRADIENT` from `constants/gradients.tsx` — `linear-gradient(223deg, #FFFFFF 0%, #8B5CF6 100%)`. Already used by HeroSection, JourneySection, GrowthTeasersSection, TypewriterInput.
- **Dashboard card pattern (reference)**: Existing dashboard uses `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`. FrostedCard uses slightly different values (`bg-white/[0.05]`, `border-white/[0.08]`) — **new pattern** for landing page context.
- **Design system recon**: Referenced for gradient and color values. GlowBackground introduces a **new pattern** not in the current recon (glow orbs) — values should be marked `[UNVERIFIED]` during planning until visually confirmed.

## Out of Scope

- Visible new homepage sections (HP-2 through HP-7 handle these)
- Modifications to Navbar, HeroSection, StartingPointQuiz, GrowthTeasersSection, or SiteFooter
- Backend work (entirely frontend infrastructure)
- Light mode support (Phase 4)
- Real authentication (Phase 3)
- Canvas-based particle effects (CSS-only approach chosen for performance)

## Files Created / Modified

| Action | File |
|--------|------|
| DELETE | `src/components/JourneySection.tsx` |
| MODIFY | `src/pages/Home.tsx` |
| CREATE | `src/components/homepage/index.ts` |
| CREATE | `src/components/homepage/GlowBackground.tsx` |
| CREATE | `src/components/homepage/SectionHeading.tsx` |
| CREATE | `src/components/homepage/FrostedCard.tsx` |
| CREATE | `src/hooks/useScrollReveal.ts` |
| MODIFY | `src/index.css` (scroll-reveal utilities) |
| CREATE | Tests for all new components and hooks |

## Acceptance Criteria

- [ ] `JourneySection.tsx` is deleted from the codebase
- [ ] `Home.tsx` no longer imports or renders `JourneySection`
- [ ] `BackgroundSquiggle.tsx` is preserved (still used by `StartingPointQuiz`)
- [ ] `src/components/homepage/index.ts` exists and barrel-exports `GlowBackground`, `SectionHeading`, `FrostedCard`
- [ ] `GlowBackground` renders children inside a `position: relative` container with `overflow: hidden`
- [ ] `GlowBackground variant="center"` renders a single purple-tinted glow orb centered horizontally
- [ ] `GlowBackground variant="split"` renders two glow orbs (purple left, white right)
- [ ] `GlowBackground variant="none"` renders no glow orbs
- [ ] `GlowBackground` glow orbs have no animation when `prefers-reduced-motion: reduce` is active
- [ ] `SectionHeading` renders heading text with `WHITE_PURPLE_GRADIENT` applied via `background-clip: text`
- [ ] `SectionHeading` renders tagline in `text-white/60` when tagline prop is provided
- [ ] `SectionHeading` does not render tagline element when tagline prop is omitted
- [ ] `SectionHeading align="center"` applies `text-center mx-auto` to wrapper
- [ ] `FrostedCard` renders with `bg-white/[0.05] backdrop-blur-sm border-white/[0.08] rounded-2xl p-6`
- [ ] `FrostedCard` with `onClick` adds `cursor-pointer` and hover lift (`translateY(-2px)`)
- [ ] `FrostedCard` without `onClick` has no interactive hover styles
- [ ] `FrostedCard as="button"` renders a `<button>` element
- [ ] `FrostedCard as="article"` renders an `<article>` element
- [ ] `useScrollReveal` returns `isVisible: false` initially, `true` after intersection
- [ ] `useScrollReveal` with `triggerOnce: true` keeps `isVisible: true` after element leaves viewport
- [ ] `useScrollReveal` with `prefers-reduced-motion: reduce` returns `isVisible: true` immediately
- [ ] `staggerDelay(2, 100, 50)` returns `{ transitionDelay: '250ms' }`
- [ ] `.scroll-reveal` class starts elements at `opacity: 0` and `translateY(12px)`
- [ ] `.scroll-reveal.is-visible` transitions to `opacity: 1` and `translateY(0)` over 600ms
- [ ] `.scroll-reveal` with `prefers-reduced-motion: reduce` shows elements immediately (no transition)
- [ ] `Home.tsx` contains HP-2 through HP-7 placeholder comments between HeroSection and GrowthTeasersSection
- [ ] All new components have passing tests
- [ ] Build passes with 0 errors
- [ ] All existing tests still pass
- [ ] All changes committed on `homepage-redesign` branch
