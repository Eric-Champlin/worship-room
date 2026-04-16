# Implementation Plan: HP-11 — Visual Depth Pass (Glows, Borders, Shadows)

**Spec:** `_specs/visual-depth-pass.md`
**Date:** 2026-04-02
**Branch:** `homepage-redesign` (continue on existing branch)
**Design System Reference:** `_plans/recon/design-system.md` (loaded — stale, see below)
**Recon Report:** not applicable
**Master Spec Plan:** not applicable

> Design system recon was captured 2026-03-06, before the HP-1 through HP-10 homepage redesign. All homepage section values in the recon are outdated. Current component source files are the authoritative reference for this plan.

---

## Architecture Context

### Project Structure

- Homepage components: `frontend/src/components/homepage/`
- Target files in `homepage/`: `GlowBackground.tsx`, `FrostedCard.tsx`, `StatsBar.tsx`, `DashboardPreview.tsx`, `DifferentiatorSection.tsx`, `FinalCTA.tsx`
- StartingPointQuiz: `frontend/src/components/StartingPointQuiz.tsx` (standalone, not in `homepage/`)
- Shared constants: `frontend/src/constants/gradients.tsx` — `WHITE_PURPLE_GRADIENT`, `GRADIENT_TEXT_STYLE`
- Hooks: `frontend/src/hooks/useScrollReveal.ts`
- Homepage barrel: `frontend/src/components/homepage/index.ts`
- Home page: `frontend/src/pages/Home.tsx`
- Tailwind config: `frontend/tailwind.config.js`

### Current Component Structure

**GlowBackground** (`GlowBackground.tsx`): Wraps content in `relative overflow-hidden bg-hero-bg` (`#08051A`). Renders glow orbs via `GlowOrbs` sub-component using `data-testid="glow-orb"`. Variants: `center|left|right|split|none`. Current orb styling:
- Constants: `PURPLE_GLOW = radial-gradient(circle, rgba(139, 92, 246, 0.06) 0%, transparent 70%)`, `WHITE_GLOW = radial-gradient(circle, rgba(255, 255, 255, 0.03) 0%, transparent 70%)`
- Sizes: `w-[300px] h-[300px] sm:w-[400px] sm:h-[400px] lg:w-[600px] lg:h-[600px]`
- Animation: `animate-glow-float` + `motion-reduce:animate-none`
- No blur currently applied. No `pointer-events-none`. No `will-change`.

**FrostedCard** (`FrostedCard.tsx`): `bg-white/[0.05]`, `backdrop-blur-sm`, `border border-white/[0.08]`, `rounded-2xl`. Interactive hover: `hover:bg-white/[0.08] hover:border-white/[0.12]`, `hover:-translate-y-0.5`. No box-shadow currently.

**StatsBar** (`StatsBar.tsx`): Section border: `border-y border-white/[0.06]`. Uses `GRADIENT_TEXT_STYLE` from `gradients.tsx` for stat numbers.

**DashboardPreview** (`DashboardPreview.tsx`): No separate `DashboardPreviewCard.tsx` — all 6 cards rendered inline. Lock overlay: `Lock` icon `text-white/40`, text `text-xs text-white/50`. CTA button: `bg-white` + `WHITE_PURPLE_GRADIENT` style, no box-shadow. Preview cards use `FrostedCard`.

**DifferentiatorSection** (`DifferentiatorSection.tsx`): Icon containers: `w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white/[0.06]`. No border on icon containers.

**StartingPointQuiz** (`StartingPointQuiz.tsx`): Quiz content (`quizContent`) is rendered inside a `max-w-[600px]` wrapper with no frosted glass container. SectionHeading is already outside the quiz content area. Result area already has a glow orb: `bg-purple-500/10 rounded-full blur-[80px]` at 300px.

**FinalCTA** (`FinalCTA.tsx`): Uses `GlowBackground variant="center"`. Extra glow orb already present: `rgba(139, 92, 246, 0.10)` at 400px. CTA button: `bg-white` solid, no box-shadow. Trust text: `text-white/30`.

### Existing Test Patterns

Tests use Vitest + React Testing Library. Test files co-located in `__tests__/` directories.
- `GlowBackground.test.tsx`: 8 tests — structure, orb count by variant, z-10 wrapper, bg-hero-bg, className
- `FrostedCard.test.tsx`: 8 tests — children, element types, cursor-pointer, className, onClick
- `StatsBar.test.tsx`: exists
- `DashboardPreview.test.tsx`: exists (29+ tests)
- `DifferentiatorSection.test.tsx`: exists
- `FinalCTA.test.tsx`: exists (10 tests)
- `StartingPointQuiz.test.tsx`: exists (45 tests)

No provider wrapping needed for GlowBackground, FrostedCard, StatsBar, or DifferentiatorSection tests. DashboardPreview and FinalCTA tests wrap with `MemoryRouter` + `AuthModalProvider`.

---

## Auth Gating Checklist

N/A — This spec is purely visual/decorative. No interactive elements added or modified. No auth gating required.

---

## Design System Values (for UI steps)

Values sourced from current component files (more authoritative than stale recon):

| Component | Property | Current Value | New Value | Source |
|-----------|----------|--------------|-----------|--------|
| GlowBackground orb | opacity | 0.06 (purple), 0.03 (white) | 0.12-0.15 (purple), 0.08 (split secondary) | spec |
| GlowBackground orb | blur | none | `blur-[80px] md:blur-[80px]` (60px on mobile) | spec |
| GlowBackground orb | mobile size | 300px | 300px (unchanged) | spec |
| GlowBackground orb | desktop size | 300/400/600px | variant-dependent (see spec table) | spec |
| FrostedCard | border | `white/[0.08]` | `white/[0.12]` | spec |
| FrostedCard | background | `white/[0.05]` | `white/[0.06]` | spec |
| FrostedCard | box-shadow | none | `0 0 25px rgba(139,92,246,0.06), 0 4px 20px rgba(0,0,0,0.3)` | spec |
| FrostedCard | hover border | `white/[0.12]` | `white/[0.18]` | spec |
| FrostedCard | hover bg | `white/[0.08]` | `white/[0.09]` | spec |
| FrostedCard | hover shadow | none | `0 0 35px rgba(139,92,246,0.10), 0 6px 25px rgba(0,0,0,0.35)` | spec |
| StatsBar | border | `white/[0.06]` | `white/[0.10]` | spec |
| DashboardPreview lock icon | color | `text-white/40` | `text-white/40` (already correct) | DashboardPreview.tsx:135 |
| DashboardPreview lock text | color | `text-white/50` | `text-white/50` (already correct) | DashboardPreview.tsx:136 |
| DashboardPreview CTA | shadow | none | `shadow-[0_0_20px_rgba(255,255,255,0.15)]` | spec |
| DifferentiatorSection icon | border | none | `border border-white/[0.06]` | spec |
| DifferentiatorSection icon | background | `bg-white/[0.06]` | `bg-white/[0.08]` | spec |
| StartingPointQuiz container | styles | none (no container) | `bg-white/[0.04]`, `backdrop-blur-sm`, `border border-white/[0.10]`, `rounded-3xl` | spec |
| StartingPointQuiz result glow | opacity | `purple-500/10` (0.10) | `rgba(139,92,246,0.12)` | spec |
| FinalCTA glow orb | opacity | 0.10 | 0.18 | spec |
| FinalCTA CTA button | shadow | none | `shadow-[0_0_30px_rgba(255,255,255,0.20)]` | spec |
| FinalCTA CTA button | hover shadow | none | `shadow-[0_0_40px_rgba(255,255,255,0.30)]` | spec |

---

## Design System Reminder

**Project-specific quirks for `/execute-plan` to display before every UI step:**

- Worship Room uses `bg-hero-bg` (`#08051A`) as the base dark background, not `#0D0620`
- GlowBackground orbs use `animate-glow-float` (20s ease-in-out infinite) + `motion-reduce:animate-none`
- All glow divs must be `aria-hidden="true"` and `pointer-events-none`
- FrostedCard is used by DashboardPreview, DifferentiatorSection, and StartingPointQuiz (result) — changes cascade
- `cn()` utility from `@/lib/utils` for conditional classnames (clsx + tailwind-merge)
- Hover states on FrostedCard are conditional on `isInteractive` (!!onClick) — static cards get no hover
- The `GRADIENT_TEXT_STYLE` uses `WHITE_PURPLE_GRADIENT` with `backgroundClip: 'text'`
- Tailwind arbitrary values: `shadow-[...]` for inline box-shadow, `bg-white/[0.06]` for fractional opacities

---

## Shared Data Models (from Master Plan)

N/A — no shared data models. This is purely visual.

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | Glow orbs: 300px diameter, 60px blur. Quiz container: `p-6`. All shadow/border changes apply identically. |
| Tablet | 768px | Glow orbs: full desktop size. Quiz container: `p-8`. |
| Desktop | 1440px | Glow orbs: variant-specific sizes (500-600px), 80px blur. Quiz container: `p-10`. |

---

## Vertical Rhythm

N/A — no spacing or layout changes in this spec. All changes are visual properties (opacity, blur, shadow, border).

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] All 8 target files exist and match the current state described in Architecture Context
- [x] `DashboardPreviewCard.tsx` does NOT exist — the spec's "Files Modified" row for it maps to changes in `DashboardPreview.tsx` instead
- [x] DashboardPreview lock overlay text is already `text-white/50` and icon is already `text-white/40` — spec changes to these are already in place (confirmed at lines 134-136)
- [x] All visual changes are purely decorative — no auth gating needed
- [x] Design system values verified from current component source files (not stale recon)
- [x] No [UNVERIFIED] values — all values are explicitly specified in the spec

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| DashboardPreviewCard.tsx doesn't exist | Apply DashboardPreview changes to `DashboardPreview.tsx` | Spec lists it as separate file, but all card rendering is inline in DashboardPreview.tsx |
| Lock overlay text already correct | Skip lock overlay text/icon changes | Already `text-white/50` and `text-white/40` respectively — spec values match current state |
| GlowBackground blur approach | Use Tailwind `blur-[60px] md:blur-[80px]` classes | More maintainable than inline styles; consistent with Tailwind usage |
| GlowBackground orb sizing per variant | Replace single `ORB_BASE` with variant-specific sizes | Spec requires different desktop sizes per variant (500px vs 600px) |
| FrostedCard box-shadow on hover | Use `style` prop for base shadow + Tailwind `hover:shadow-[...]` | Tailwind arbitrary shadow values support hover states |
| FrostedCard shadow approach | Use inline `style` for base, Tailwind class for hover | Tailwind's `shadow-[...]` with commas is reliable; use `style` for the base to keep it clean and use a `group-hover` or JS approach for hover. Actually, use inline style for both base and hover via the existing conditional class pattern. |
| FrostedCard shadow implementation | Tailwind arbitrary values for both base and hover | `shadow-[0_0_25px_rgba(139,92,246,0.06),0_4px_20px_rgba(0,0,0,0.3)]` — Tailwind supports comma-separated shadows in arbitrary values using underscores for spaces |
| Quiz container max-width | `max-w-3xl` (768px) wraps the `max-w-[600px]` quiz content | Spec says `max-w-3xl` for container; existing quiz content is `max-w-[600px]` which fits inside |
| GlowBackground pointer-events-none | Add to `ORB_BASE` | Spec requires it; currently missing |
| GlowBackground will-change | Add `will-change-transform` to `ORB_BASE` for mobile performance | Spec requires it for scroll jank prevention |

---

## Implementation Steps

### Step 1: Update GlowBackground Component

**Objective:** Upgrade all 4 glow variants with visible opacity values, responsive blur, mobile-optimized sizes, pointer-events-none, and will-change-transform.

**Files to modify:**
- `frontend/src/components/homepage/GlowBackground.tsx`

**Details:**

1. Replace the `PURPLE_GLOW` and `WHITE_GLOW` constants with per-variant inline style functions. The orbs now need different opacities per variant, so a single constant won't work.

2. Update `ORB_BASE` to add `pointer-events-none will-change-transform blur-[60px] md:blur-[80px]`. Remove the current fixed sizing from `ORB_BASE` since each variant now has different desktop sizes.

3. Implement variant-specific sizing and opacity:

**`center` variant:**
- Single orb: `rgba(139, 92, 246, 0.15)`, `w-[300px] h-[300px] md:w-[600px] md:h-[600px]`

**`left` variant:**
- Single orb: `rgba(139, 92, 246, 0.12)`, `w-[300px] h-[300px] md:w-[500px] md:h-[500px]`

**`right` variant:**
- Single orb: `rgba(139, 92, 246, 0.12)`, `w-[300px] h-[300px] md:w-[500px] md:h-[500px]`

**`split` variant:**
- Primary orb: `rgba(139, 92, 246, 0.14)`, `w-[300px] h-[300px] md:w-[500px] md:h-[500px]`
- Secondary orb: `rgba(168, 130, 255, 0.08)`, `w-[250px] h-[250px] md:w-[400px] md:h-[400px]`

4. Each orb's background uses `radial-gradient(circle, <color> 0%, transparent 70%)` — same pattern as current, just different rgba values.

**Implementation approach:**

Replace the `PURPLE_GLOW` / `WHITE_GLOW` constants with a config object:

```typescript
const GLOW_CONFIG = {
  center: [
    { opacity: 0.15, color: '139, 92, 246', size: 'w-[300px] h-[300px] md:w-[600px] md:h-[600px]', position: 'top-[30%] left-1/2 -translate-x-1/2' },
  ],
  left: [
    { opacity: 0.12, color: '139, 92, 246', size: 'w-[300px] h-[300px] md:w-[500px] md:h-[500px]', position: 'top-[40%] left-[20%] -translate-x-1/2 -translate-y-1/2' },
  ],
  right: [
    { opacity: 0.12, color: '139, 92, 246', size: 'w-[300px] h-[300px] md:w-[500px] md:h-[500px]', position: 'top-[40%] left-[80%] -translate-x-1/2 -translate-y-1/2' },
  ],
  split: [
    { opacity: 0.14, color: '139, 92, 246', size: 'w-[300px] h-[300px] md:w-[500px] md:h-[500px]', position: 'top-[40%] left-[25%] -translate-x-1/2 -translate-y-1/2' },
    { opacity: 0.08, color: '168, 130, 255', size: 'w-[250px] h-[250px] md:w-[400px] md:h-[400px]', position: 'top-[40%] left-[75%] -translate-x-1/2 -translate-y-1/2' },
  ],
} as const
```

Refactor `GlowOrbs` to iterate over config entries instead of branching:

```typescript
function GlowOrbs({ variant }: { variant: 'center' | 'left' | 'right' | 'split' }) {
  const orbs = GLOW_CONFIG[variant]
  return (
    <>
      {orbs.map((orb, i) => (
        <div
          key={i}
          data-testid="glow-orb"
          className={cn(ORB_BASE, orb.size, orb.position)}
          style={{ background: `radial-gradient(circle, rgba(${orb.color}, ${orb.opacity}) 0%, transparent 70%)` }}
          aria-hidden="true"
        />
      ))}
    </>
  )
}
```

Update `ORB_BASE` to:
```typescript
const ORB_BASE = 'absolute rounded-full pointer-events-none will-change-transform blur-[60px] md:blur-[80px] animate-glow-float motion-reduce:animate-none'
```

**Responsive behavior:**
- Desktop (1440px): Full variant-specific sizes (500-600px), 80px blur
- Tablet (768px): Same as desktop (md breakpoint)
- Mobile (375px): All orbs 300px (split secondary 250px), 60px blur

**Guardrails (DO NOT):**
- DO NOT remove `aria-hidden="true"` from orbs
- DO NOT remove `motion-reduce:animate-none`
- DO NOT change the `GlowBackground` outer wrapper structure or its `relative overflow-hidden bg-hero-bg` classes
- DO NOT change the `relative z-10` children wrapper
- DO NOT change the variant prop types or the `none` variant behavior

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| center variant opacity | unit | Center orb style contains `rgba(139, 92, 246, 0.15)` |
| left variant opacity | unit | Left orb style contains `rgba(139, 92, 246, 0.12)` |
| right variant opacity | unit | Right orb style contains `rgba(139, 92, 246, 0.12)` |
| split variant opacities | unit | Split orbs contain `0.14` and `0.08` opacities |
| orbs have pointer-events-none | unit | All orbs have `pointer-events-none` class |
| orbs have will-change-transform | unit | All orbs have `will-change-transform` class |
| orbs have blur | unit | All orbs have `blur-` class |
| existing tests still pass | regression | All 8 existing GlowBackground tests pass unchanged |

**Expected state after completion:**
- [ ] GlowBackground renders visibly brighter orbs (0.12-0.15 vs 0.06)
- [ ] Orbs have blur applied (60px mobile, 80px desktop)
- [ ] Orbs have `pointer-events-none` and `will-change-transform`
- [ ] All 8 existing tests pass
- [ ] 7+ new tests pass
- [ ] Build passes with 0 errors

---

### Step 2: Update FrostedCard Component

**Objective:** Upgrade border, background, add dual box-shadow, and enhance hover state.

**Files to modify:**
- `frontend/src/components/homepage/FrostedCard.tsx`

**Details:**

Update the `cn()` call in FrostedCard:

1. Change `bg-white/[0.05]` → `bg-white/[0.06]`
2. Change `border-white/[0.08]` → `border-white/[0.12]`
3. Add base box-shadow: `shadow-[0_0_25px_rgba(139,92,246,0.06),0_4px_20px_rgba(0,0,0,0.3)]`
4. Change hover bg: `hover:bg-white/[0.08]` → `hover:bg-white/[0.09]`
5. Change hover border: `hover:border-white/[0.12]` → `hover:border-white/[0.18]`
6. Add hover box-shadow: `hover:shadow-[0_0_35px_rgba(139,92,246,0.10),0_6px_25px_rgba(0,0,0,0.35)]`

The `transition-all duration-200 ease-out` already covers box-shadow transitions.

Final className structure:
```typescript
cn(
  'bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] rounded-2xl p-6',
  'shadow-[0_0_25px_rgba(139,92,246,0.06),0_4px_20px_rgba(0,0,0,0.3)]',
  'transition-all duration-200 ease-out',
  isInteractive && [
    'cursor-pointer',
    'hover:bg-white/[0.09] hover:border-white/[0.18]',
    'hover:shadow-[0_0_35px_rgba(139,92,246,0.10),0_6px_25px_rgba(0,0,0,0.35)]',
    'hover:-translate-y-0.5',
    'motion-reduce:hover:translate-y-0',
  ],
  className
)
```

**Responsive behavior:** N/A — FrostedCard changes are not breakpoint-dependent.

**Guardrails (DO NOT):**
- DO NOT change the component's prop interface
- DO NOT change the `as` prop behavior or `isInteractive` logic
- DO NOT remove `backdrop-blur-sm`, `rounded-2xl`, `p-6`
- DO NOT change `hover:-translate-y-0.5` or `motion-reduce:hover:translate-y-0`

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| base border opacity | unit | Contains `border-white/[0.12]` class |
| base background opacity | unit | Contains `bg-white/[0.06]` class |
| base box-shadow | unit | Contains `shadow-[0_0_25px` class |
| hover border (interactive) | unit | Interactive card contains `hover:border-white/[0.18]` |
| hover shadow (interactive) | unit | Interactive card contains `hover:shadow-[0_0_35px` |
| existing tests still pass | regression | All 8 existing FrostedCard tests pass unchanged |

**Expected state after completion:**
- [ ] FrostedCard has visible border, slightly brighter background, and purple glow + drop shadow
- [ ] Hover intensifies glow and shadow (interactive cards only)
- [ ] All 8 existing tests pass
- [ ] 5+ new tests pass
- [ ] Build passes with 0 errors

---

### Step 3: Update StatsBar Border

**Objective:** Upgrade border separator opacity from 0.06 to 0.10.

**Files to modify:**
- `frontend/src/components/homepage/StatsBar.tsx`

**Details:**

Change line 62: `border-y border-white/[0.06]` → `border-y border-white/[0.10]`

**Responsive behavior:** N/A — not breakpoint-dependent.

**Guardrails (DO NOT):**
- DO NOT change the stat values, labels, or grid layout
- DO NOT change the `GRADIENT_TEXT_STYLE` usage
- DO NOT change the `useScrollReveal` or `useAnimatedCounter` usage

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| border opacity | unit | Section element contains `border-white/[0.10]` class |

**Expected state after completion:**
- [ ] StatsBar section borders visibly brighter
- [ ] All existing StatsBar tests pass
- [ ] 1 new test passes
- [ ] Build passes with 0 errors

---

### Step 4: Update DashboardPreview CTA Shadow

**Objective:** Add white glow shadow to the "Get Started" CTA button.

**Files to modify:**
- `frontend/src/components/homepage/DashboardPreview.tsx`

**Details:**

The lock overlay text (`text-white/50`) and icon (`text-white/40`) are already at the spec's target values (confirmed at lines 134-136). No changes needed there.

Add shadow to the CTA button (around line 218):
```
shadow-[0_0_20px_rgba(255,255,255,0.15)]
```

Add it to the button's className, after `transition-all`:
```typescript
cn(
  'inline-flex w-full items-center justify-center rounded-full px-8 py-3 text-base font-semibold text-hero-bg sm:w-auto',
  'shadow-[0_0_20px_rgba(255,255,255,0.15)]',
  'transition-all hover:shadow-lg hover:brightness-110',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2'
)
```

Note: keep existing `hover:shadow-lg` — it will override the base shadow on hover, which is fine since `shadow-lg` is already substantial.

**Responsive behavior:** N/A — not breakpoint-dependent.

**Guardrails (DO NOT):**
- DO NOT change the lock overlay text or icon opacity (already correct)
- DO NOT change card layout, preview content, or header structure
- DO NOT change the `authModal?.openAuthModal` call
- DO NOT modify the `WHITE_PURPLE_GRADIENT` style on the button

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| CTA button glow shadow | unit | CTA button contains `shadow-[0_0_20px` class |

**Expected state after completion:**
- [ ] CTA button has white glow shadow
- [ ] All existing DashboardPreview tests pass
- [ ] 1 new test passes
- [ ] Build passes with 0 errors

---

### Step 5: Update DifferentiatorSection Icon Containers

**Objective:** Add border and brighten background on icon containers.

**Files to modify:**
- `frontend/src/components/homepage/DifferentiatorSection.tsx`

**Details:**

Change icon container (line 35):
```
bg-white/[0.06]
```
→
```
bg-white/[0.08] border border-white/[0.06]
```

Full updated line:
```tsx
<div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white/[0.08] border border-white/[0.06] flex items-center justify-center">
```

**Responsive behavior:** N/A — not breakpoint-dependent.

**Guardrails (DO NOT):**
- DO NOT change the icon size, color, or aria-hidden
- DO NOT change the card layout, text, or FrostedCard usage
- DO NOT change the GlowBackground variant ("split")

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| icon container border | unit | Icon containers have `border-white/[0.06]` class |
| icon container background | unit | Icon containers have `bg-white/[0.08]` class |

**Expected state after completion:**
- [ ] Icon containers have subtle border and slightly brighter background
- [ ] All existing DifferentiatorSection tests pass
- [ ] 2 new tests pass
- [ ] Build passes with 0 errors

---

### Step 6: Wrap StartingPointQuiz in Frosted Glass Container

**Objective:** Wrap quiz UI in a frosted glass container with rounded corners, border, shadow, and glow. SectionHeading stays outside. Update result glow orb opacity.

**Files to modify:**
- `frontend/src/components/StartingPointQuiz.tsx`

**Details:**

In the dark variant (`isDark`) rendering path, add a frosted glass container `<div>` around `{quizContent}`. The container wraps the `max-w-[600px]` div.

Current structure (lines 171-189):
```tsx
<GlowBackground variant="right" className="py-20 sm:py-28">
  <div ref={sectionRef} className="relative mx-auto max-w-5xl px-4 sm:px-6">
    <SectionHeading ... />
    <div className={cn('scroll-reveal', ...)} style={...}>
      <div className="relative mx-auto max-w-[600px]">
        {quizContent}
      </div>
    </div>
  </div>
</GlowBackground>
```

New structure:
```tsx
<GlowBackground variant="right" className="py-20 sm:py-28">
  <div ref={sectionRef} className="relative mx-auto max-w-5xl px-4 sm:px-6">
    <SectionHeading ... />
    <div className={cn('scroll-reveal', ...)} style={...}>
      {/* Frosted glass container */}
      <div className={cn(
        'relative mx-auto max-w-3xl',
        'bg-white/[0.04] backdrop-blur-sm border border-white/[0.10] rounded-3xl',
        'shadow-[0_0_30px_rgba(139,92,246,0.08),0_4px_25px_rgba(0,0,0,0.25)]',
        'p-6 sm:p-8 lg:p-10'
      )}>
        <div className="relative mx-auto max-w-[600px]">
          {quizContent}
        </div>
      </div>
    </div>
  </div>
</GlowBackground>
```

Also update the result glow orb opacity (currently at line 121):
```
bg-purple-500/10
```
→ Use inline style for precise control:
```tsx
style={{ background: 'radial-gradient(circle, rgba(139, 92, 246, 0.12) 0%, transparent 70%)' }}
```
And change from `bg-purple-500/10` class to just `rounded-full blur-[60px]` for the structural classes, with the color handled by inline style.

The existing glow div (around line 120-122):
```tsx
<div
  aria-hidden="true"
  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-purple-500/10 rounded-full blur-[80px]"
/>
```
Change to:
```tsx
<div
  aria-hidden="true"
  className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full blur-[60px]"
  style={{ background: 'radial-gradient(circle, rgba(139, 92, 246, 0.12) 0%, transparent 70%)' }}
/>
```

**Responsive behavior:**
- Desktop (1440px): `p-10`, container `max-w-3xl`
- Tablet (768px): `p-8`
- Mobile (375px): `p-6`

**Guardrails (DO NOT):**
- DO NOT move SectionHeading inside the frosted glass container
- DO NOT change the quiz logic, question flow, or answer handling
- DO NOT change the light variant rendering path
- DO NOT change the `id="quiz"` on the outer section
- DO NOT remove the existing result glow orb — update its opacity/style

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| frosted glass container | unit | Dark variant renders element with `rounded-3xl` and `border-white/[0.10]` |
| SectionHeading outside container | unit | SectionHeading is NOT a descendant of the frosted glass container |
| container max-width | unit | Container has `max-w-3xl` class |
| result glow orb updated | unit | Result glow orb style contains `rgba(139, 92, 246, 0.12)` |

**Expected state after completion:**
- [ ] Quiz UI wrapped in visible frosted glass container
- [ ] SectionHeading remains outside the container
- [ ] Container has rounded-3xl, border, backdrop-blur, shadow
- [ ] Result glow orb at 0.12 opacity
- [ ] All 45 existing StartingPointQuiz tests pass
- [ ] 4+ new tests pass
- [ ] Build passes with 0 errors

---

### Step 7: Update FinalCTA Glow and Button Shadow

**Objective:** Upgrade the extra glow orb to 0.18 opacity (strongest on page). Add white glow shadow to CTA button with hover intensification.

**Files to modify:**
- `frontend/src/components/homepage/FinalCTA.tsx`

**Details:**

1. Update the extra glow orb (line 15-20). Change:
```
rgba(139, 92, 246, 0.10)
```
→
```
rgba(139, 92, 246, 0.18)
```

Also add `pointer-events-none` and `blur-[80px]` to the glow orb div, and change from inline radial-gradient to match the 0.18 opacity. The orb should also be larger to fill the section:
```tsx
<div
  aria-hidden="true"
  className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] md:w-[600px] md:h-[600px] rounded-full blur-[60px] md:blur-[80px]"
  style={{
    background: 'radial-gradient(circle, rgba(139, 92, 246, 0.18) 0%, transparent 70%)',
  }}
/>
```

2. Update the CTA button (line 52-56). Add shadow classes:
```typescript
className="mt-8 rounded-full bg-white px-8 py-3.5 text-base font-semibold text-hero-bg shadow-[0_0_30px_rgba(255,255,255,0.20)] transition-all duration-200 hover:bg-white/90 hover:shadow-[0_0_40px_rgba(255,255,255,0.30)] sm:text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
```

Note: Replace existing `transition-colors` with `transition-all` (already present as `transition-colors duration-200`) to cover shadow transitions.

**Responsive behavior:**
- Desktop (1440px): Glow orb 600px, 80px blur
- Mobile (375px): Glow orb 400px, 60px blur

**Guardrails (DO NOT):**
- DO NOT change the heading text, subtext, or trust line
- DO NOT change the `GRADIENT_TEXT_STYLE` usage
- DO NOT change the `authModal?.openAuthModal` call
- DO NOT remove the GlowBackground wrapper

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| glow orb opacity 0.18 | unit | Glow orb style contains `rgba(139, 92, 246, 0.18)` |
| CTA button base shadow | unit | Button contains `shadow-[0_0_30px` class |
| CTA button hover shadow | unit | Button contains `hover:shadow-[0_0_40px` class |
| glow orb pointer-events-none | unit | Glow orb has `pointer-events-none` class |

**Expected state after completion:**
- [ ] FinalCTA has the strongest glow on the page (0.18)
- [ ] CTA button has prominent white glow with hover intensification
- [ ] All 10 existing FinalCTA tests pass
- [ ] 4+ new tests pass
- [ ] Build passes with 0 errors

---

### Step 8: Run Full Test Suite and Build Verification

**Objective:** Verify all changes work together — tests pass, build succeeds, no TypeScript errors.

**Files to modify:** None (verification step)

**Details:**

1. Run `pnpm tsc --noEmit` — expect 0 errors
2. Run `pnpm test` — expect all tests pass (0 failures)
3. Verify total test count is ~5,470+ (existing 5,447 + ~25 new tests)

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT modify any files in this step
- DO NOT skip test verification

**Test specifications:** N/A (verification step).

**Expected state after completion:**
- [ ] TypeScript: 0 errors
- [ ] All tests pass, 0 failures
- [ ] Build passes with 0 errors
- [ ] Ready for visual verification and commit

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | GlowBackground glow orb upgrades |
| 2 | — | FrostedCard border/bg/shadow upgrades |
| 3 | — | StatsBar border upgrade |
| 4 | — | DashboardPreview CTA shadow |
| 5 | — | DifferentiatorSection icon container border/bg |
| 6 | — | StartingPointQuiz frosted glass container |
| 7 | — | FinalCTA glow + button shadow |
| 8 | 1-7 | Full test suite and build verification |

**Parallelizable:** Steps 1-7 are fully independent (each touches a different file). They can be executed in any order or in parallel. Step 8 must run after all others.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | GlowBackground glow orb upgrades | [COMPLETE] | 2026-04-02 | Replaced PURPLE_GLOW/WHITE_GLOW with GLOW_CONFIG object. Refactored GlowOrbs to iterate config. Added blur, pointer-events-none, will-change-transform. 15 tests pass (8 existing + 7 new). |
| 2 | FrostedCard border/bg/shadow upgrades | [COMPLETE] | 2026-04-02 | Updated bg 0.05→0.06, border 0.08→0.12, added dual box-shadow, hover border 0.18 + hover shadow. 13 tests pass (8 existing + 5 new). |
| 3 | StatsBar border upgrade | [COMPLETE] | 2026-04-02 | Changed border-white/[0.06] → border-white/[0.10]. 8 tests pass (7 existing + 1 new). |
| 4 | DashboardPreview CTA shadow | [COMPLETE] | 2026-04-02 | Added shadow-[0_0_20px_rgba(255,255,255,0.15)] to Get Started button. 30 tests pass (29 existing + 1 new). |
| 5 | DifferentiatorSection icon container | [COMPLETE] | 2026-04-02 | Added border border-white/[0.06], changed bg 0.06→0.08. 17 tests pass (15 existing + 2 new). |
| 6 | StartingPointQuiz frosted glass container | [COMPLETE] | 2026-04-02 | Added frosted glass wrapper (bg-white/[0.04], border-white/[0.10], rounded-3xl, shadow). Updated result glow orb to 0.12 via radial-gradient + blur-[60px]. Updated existing blur-[80px] test → blur-[60px]. 49 tests pass (45 existing + 4 new). |
| 7 | FinalCTA glow + button shadow | [COMPLETE] | 2026-04-02 | Upgraded glow orb to 0.18, added pointer-events-none/blur/responsive sizing. Added button shadow + hover shadow, changed transition-colors → transition-all. 14 tests pass (10 existing + 4 new). |
| 8 | Full test suite and build verification | [COMPLETE] | 2026-04-02 | TypeScript: 0 errors. 5,471 tests pass (24 new). Production build: 0 errors, 93.55 KB gzipped main bundle. |
