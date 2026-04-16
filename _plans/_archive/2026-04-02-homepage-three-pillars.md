# Implementation Plan: Homepage Three Pillars Section

**Spec:** `_specs/hp-4-homepage-three-pillars.md`
**Date:** 2026-04-02
**Branch:** `homepage-redesign`
**Design System Reference:** `_plans/recon/design-system.md` (loaded)
**Recon Report:** not applicable
**Master Spec Plan:** not applicable (standalone homepage redesign section, builds on HP-1 foundation components)

---

## Architecture Context

### Project Structure

- Homepage components live in `frontend/src/components/homepage/`
- Landing page is `frontend/src/pages/Home.tsx` — renders `HeroSection`, `FeatureShowcase`, `StatsBar`, then placeholder comments for HP-4 through HP-7
- Barrel export at `frontend/src/components/homepage/index.ts` — must add `PillarSection`

### Existing Foundation Components (from HP-1)

- **`GlowBackground`** (`components/homepage/GlowBackground.tsx`) — wraps content in `bg-hero-bg` (#08051A) with animated radial glow orbs. Accepts `variant: 'center' | 'left' | 'right' | 'split' | 'none'`. Orbs are positioned based on variant. Has `className` prop.
- **`SectionHeading`** (`components/homepage/SectionHeading.tsx`) — `<h2>` with `GRADIENT_TEXT_STYLE` (white-to-purple gradient text via `linear-gradient(223deg, #FFFFFF 0%, #8B5CF6 100%)`). Optional `tagline` in `text-white/60`. `align` prop (center default).
- **`FrostedCard`** (`components/homepage/FrostedCard.tsx`) — `bg-white/[0.05] backdrop-blur-sm border border-white/[0.08] rounded-2xl p-6`. NOT used for accordion items per spec.

### Scroll Reveal Pattern

- **`useScrollReveal`** (`hooks/useScrollReveal.ts`) — Returns `{ ref, isVisible }`. Uses IntersectionObserver. Respects `prefers-reduced-motion` (returns `isVisible: true` immediately).
- **`staggerDelay`** (`hooks/useScrollReveal.ts`) — Returns `{ transitionDelay: '${initialDelay + index * baseDelay}ms' }`.
- **CSS classes** (`index.css`): `.scroll-reveal` = `opacity: 0; transform: translateY(12px); transition: opacity 600ms ease-out, transform 600ms ease-out`. `.scroll-reveal.is-visible` = `opacity: 1; transform: translateY(0)`. `prefers-reduced-motion` disables all transitions.

### Gradient Text

- **`GRADIENT_TEXT_STYLE`** (`constants/gradients.tsx`) — `CSSProperties` object: `color: 'white', backgroundImage: WHITE_PURPLE_GRADIENT, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text'`.
- **`WHITE_PURPLE_GRADIENT`** = `'linear-gradient(223deg, #FFFFFF 0%, #8B5CF6 100%)'`

### Test Patterns

- Tests in `components/homepage/__tests__/` — use `@testing-library/react` + `vitest`
- Mock `useScrollReveal` with `vi.mock('@/hooks/useScrollReveal', () => ({ useScrollReveal: () => ({ ref: { current: null }, isVisible: true }), staggerDelay: (i: number, base = 100) => ({ transitionDelay: '${i * base}ms' }) }))`
- Test patterns: render checks, `screen.getByRole('heading')`, `container.querySelector('.class')`, `screen.getByText()`, `screen.getAllByTestId()` for glow orbs
- `userEvent` for click interactions

### Icons

- Lucide React icons used throughout: `import { Heart, TrendingUp, Users } from 'lucide-react'`

---

## Auth Gating Checklist

**No auth gating required.** This is a public landing page section. All content is informational/decorative. No user actions require login.

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| View section | Fully visible | N/A | None (public) |
| Expand/collapse | Works normally | N/A | None (public) |
| Click previews | Decorative only | N/A | None (public) |

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Section bg | background | `bg-hero-bg` (#08051A) | GlowBackground.tsx |
| Section heading | style | `GRADIENT_TEXT_STYLE` (white→purple gradient text) | gradients.tsx |
| Section heading | font-size | `text-3xl sm:text-4xl lg:text-5xl font-bold` | SectionHeading.tsx |
| Tagline | color | `text-white/60` | SectionHeading.tsx |
| Pillar title | font | `text-2xl sm:text-3xl font-bold text-white` | spec |
| Pillar subtitle | color | `text-white/50 text-sm sm:text-base` | spec |
| Accordion item border | border | `border-b border-white/[0.06]` | spec |
| Expanded left accent | border | `border-l-2` in accent color | spec |
| Feature name (collapsed) | color | `text-white/70 text-base sm:text-lg font-medium` | spec |
| Feature name (expanded) | color | `text-white font-semibold` | spec |
| Description text | color | `text-white/60 text-sm leading-relaxed` | spec |
| Chevron | size | `w-5 h-5 text-white/30` | spec |
| Chevron hover | color | `text-white/50` | spec |
| Glow orb gradient | background | `radial-gradient(circle, rgba(139, 92, 246, 0.06) 0%, transparent 70%)` | GlowBackground.tsx |
| Mood colors | hex values | Struggling=#D97706, Heavy=#C2703E, Okay=#8B7FA8, Good=#2DD4BF, Thriving=#34D399 | 09-design-system.md |
| Container | width | `max-w-5xl mx-auto px-4 sm:px-6` | spec |

---

## Design System Reminder

**Project-specific quirks that `/execute-plan` displays before every UI step:**

- Worship Room uses `GRADIENT_TEXT_STYLE` from `constants/gradients.tsx` for gradient text headings — NOT plain white text
- `SectionHeading` component already handles gradient text styling — use it directly
- `GlowBackground` uses `bg-hero-bg` (#08051A) class — NOT `bg-hero-dark` (#0D0620)
- Glow orb radial gradient is subtle: `rgba(139, 92, 246, 0.06)` — 6% opacity, not a bright glow
- `scroll-reveal` CSS class handles the reveal animation — component just needs to toggle `is-visible` class
- `staggerDelay` returns `transitionDelay` as inline style — combine with `scroll-reveal` class
- Caveat font class is `font-script` (NOT `font-caveat`)
- Mood color palette: Struggling=#D97706, Heavy=#C2703E, Okay=#8B7FA8, Good=#2DD4BF, Thriving=#34D399
- Accordion `max-height` transition spec: `transition-[max-height] duration-300 ease-out`
- `prefers-reduced-motion` is handled automatically by `useScrollReveal` and CSS classes — accordion needs explicit handling for `max-height` transitions
- All accordion trigger elements must be `<button>` for accessibility (spec requirement)

---

## Shared Data Models (from Master Plan)

Not applicable — standalone section with no shared data models.

**localStorage keys this spec touches:** None.

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | < 640px | Single column. Pillar headers stack. Expanded content: description above, preview below (centered). `px-4`. `py-20`. `space-y-20`. |
| Tablet | 640-1024px | Single column, wider container. Expanded content: description left, preview right (`flex gap-6`). `px-6`. `py-28`. `space-y-28`. |
| Desktop | > 1024px | Same as tablet, more generous spacing. Two-column expanded content. `max-w-5xl` container. |

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| StatsBar → PillarSection | `py-20 sm:py-28` on PillarSection | spec (section wrapper) |
| Section heading → first pillar | `mt-14 sm:mt-18` | spec |
| Pillar → pillar | `space-y-20 sm:space-y-28` | spec |
| PillarSection → next section (HP-5 placeholder) | Natural flow | Home.tsx |

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] `homepage-redesign` branch is checked out
- [x] HP-1 foundation components exist (`GlowBackground`, `SectionHeading`, `useScrollReveal`, `staggerDelay`)
- [x] HP-2 (`FeatureShowcase`) and HP-3 (`StatsBar`) are committed and working
- [x] `{/* HP-4: PillarSection */}` placeholder exists in `Home.tsx` line 62
- [x] All auth-gated actions from the spec are accounted for (none — public section)
- [x] Design system values verified from codebase inspection and design-system.md
- [ ] All [UNVERIFIED] values are flagged with verification methods (see below)
- [x] No prior specs in sequence need to be completed first

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Accordion state scope | Per-pillar independent state | Spec says "only one item per pillar expanded at a time" — expanding in one pillar doesn't affect others |
| Default expanded items | First item per pillar (Devotionals, Reading Plans, Prayer Wall) | Spec explicitly requires this |
| Preview extraction threshold | Keep previews inline in `PillarAccordionItem.tsx` initially | Spec says "If the file gets too large, extract to PillarPreviews.tsx" — 14 small previews (~5-15 lines each) will fit comfortably in a switch |
| `sm:mt-18` (Tailwind) | Use `sm:mt-[4.5rem]` | Tailwind doesn't have `mt-18` as a default class — need arbitrary value |
| Chevron rotation approach | `transform rotate-180` with `transition-transform duration-200` | Spec specifies this explicitly |
| Reduced motion for accordion | `max-height` transition set to `0ms` via `motion-reduce:transition-none` | Spec: "if reduced motion, instant show/hide" |

---

## Implementation Steps

### Step 1: Create pillar data file

**Objective:** Define all pillar content (titles, subtitles, icons, accent colors, features with descriptions and preview keys) as a typed data structure.

**Files to create/modify:**
- `frontend/src/components/homepage/pillar-data.ts` — new file with data + types

**Details:**

Define interfaces and data:

```typescript
import type { LucideIcon } from 'lucide-react'
import { Heart, TrendingUp, Users } from 'lucide-react'

export type PillarAccent = 'purple' | 'emerald' | 'amber'
export type GlowVariant = 'left' | 'right' | 'center'

export interface PillarFeature {
  name: string
  description: string
  previewKey: string
}

export interface Pillar {
  id: string
  title: string
  subtitle: string
  icon: LucideIcon
  accent: PillarAccent
  glowVariant: GlowVariant
  features: PillarFeature[]
}

export const ACCENT_CLASSES: Record<PillarAccent, { text: string; bg: string; border: string }> = {
  purple: { text: 'text-purple-400', bg: 'bg-purple-500/20', border: 'border-purple-500/30' },
  emerald: { text: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/30' },
  amber: { text: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-500/30' },
}

export const PILLARS: Pillar[] = [/* healing, growth, community with all features */]
```

All 14 features across 3 pillars with exact description text from the spec. Preview keys: `devotional`, `ai-prayer`, `journaling`, `meditation`, `mood-checkin`, `evening-reflection`, `reading-plans`, `seasonal-challenges`, `growth-garden`, `badges-points`, `insights`, `prayer-wall`, `friends-encouragement`, `local-support`.

**Auth gating:** N/A

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT import React or any JSX — this is a pure data file
- DO NOT include preview rendering logic here — that belongs in the accordion item component
- DO NOT deviate from the spec's exact description text

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| PILLARS has 3 entries | unit | `expect(PILLARS).toHaveLength(3)` |
| Healing has 6 features | unit | `expect(PILLARS[0].features).toHaveLength(6)` |
| Growth has 5 features | unit | `expect(PILLARS[1].features).toHaveLength(5)` |
| Community has 3 features | unit | `expect(PILLARS[2].features).toHaveLength(3)` |
| ACCENT_CLASSES has all 3 accents | unit | Verify purple, emerald, amber keys exist |

**Expected state after completion:**
- [x] `pillar-data.ts` exports `PILLARS`, `ACCENT_CLASSES`, and all type interfaces
- [x] All 14 features have name, description, and previewKey
- [x] Tests pass

---

### Step 2: Create PillarAccordionItem component

**Objective:** Build the individual accordion row with collapsed/expanded states and inline compact previews.

**Files to create/modify:**
- `frontend/src/components/homepage/PillarAccordionItem.tsx` — new component

**Details:**

Props:
```typescript
interface PillarAccordionItemProps {
  feature: PillarFeature
  accent: PillarAccent
  isExpanded: boolean
  onToggle: () => void
  index: number
  isVisible: boolean
}
```

Structure:
- Outer `<div>` with `border-b border-white/[0.06]`
- Trigger: `<button>` element, full-width, `flex items-center py-4 w-full cursor-pointer` group
- Left: small accent dot — `<span>` with `w-2 h-2 rounded-full` + `ACCENT_CLASSES[accent].bg`. When expanded: slightly larger or ring glow — use `w-2.5 h-2.5` + ring: `ring-2 ring-${accent}/20`
- Center: feature name `<span>` in `text-white/70 text-base sm:text-lg font-medium flex-1 text-left`. When expanded: `text-white font-semibold`
- Right: `ChevronDown` icon `w-5 h-5 text-white/30 transition-transform duration-200`. When expanded: `rotate-180`. Hover: `group-hover:text-white/50`
- Hover on name: `group-hover:text-white/90`
- Content panel: `<div>` with `overflow-hidden transition-[max-height] duration-300 ease-out motion-reduce:transition-none`. Collapsed: `max-height: 0`. Expanded: `max-height: 500px`.
- Content inner: `border-l-2 ${ACCENT_CLASSES[accent].border} pl-4 pt-3 pb-6`
- Layout: On `sm+`: `flex gap-6` (description left, preview right). On mobile: description stacks above preview (centered).
- Description: `<p>` in `text-white/60 text-sm leading-relaxed max-w-xl`
- Preview: rendered via `renderPreview(previewKey, accent)` function — a switch returning the correct compact preview JSX
- Accessibility: button has `aria-expanded={isExpanded}`. Content panel has `aria-hidden={!isExpanded}` and `id` for `aria-controls`.
- Scroll reveal: outer div uses `scroll-reveal` class + `is-visible` based on `isVisible` prop + stagger via `staggerDelay(index, 80, 200)` inline style

**Compact previews (inline JSX, ~5-15 lines each):**
1. `devotional` — small card with italic Caveat quote, verse ref, faint book icon
2. `ai-prayer` — 3-4 lines: first 2 `text-white/80`, remaining `text-white/20` (karaoke miniature)
3. `journaling` — 3 faint horizontal lines + subtle pencil icon
4. `meditation` — 2×3 grid of 6 tiny circles (B,S,G,A,P,E) in `text-white/40`, "B" highlighted
5. `mood-checkin` — 5 mood-colored dots (#D97706, #C2703E, #8B7FA8, #2DD4BF, #34D399), middle highlighted
6. `evening-reflection` — crescent moon + 2-3 stars SVG
7. `reading-plans` — progress bar ~60% fill (green gradient) + "Day 5 of 21" text
8. `seasonal-challenges` — calendar icon with checkmark
9. `growth-garden` — simplified plant/tree SVG
10. `badges-points` — 3 badge circles (filled, half, empty)
11. `insights` — tiny 3-4 point upward line chart SVG
12. `prayer-wall` — 2 overlapping circles + heart icon
13. `friends-encouragement` — notification pill: "Sarah is thinking of you"
14. `local-support` — map pin with cross

**Auth gating:** N/A

**Responsive behavior:**
- Desktop (1024px+): Description left, preview right via `flex gap-6`
- Tablet (640px-1024px): Same flex layout
- Mobile (< 640px): `flex-col items-center` — description full-width above, preview centered below

**Guardrails (DO NOT):**
- DO NOT use `<div>` for the accordion trigger — MUST be `<button>` for accessibility
- DO NOT add click handlers to compact previews — they are decorative only
- DO NOT use `dangerouslySetInnerHTML` for any content
- DO NOT import heavy libraries for SVG illustrations — use inline JSX SVGs
- DO NOT forget `aria-expanded` and `aria-hidden` attributes

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| renders feature name | unit | `screen.getByText('Devotionals')` |
| trigger is a button element | unit | `screen.getByRole('button')` |
| collapsed: aria-expanded="false" | unit | check button attribute |
| expanded: aria-expanded="true" | unit | render with isExpanded=true |
| expanded: content panel visible (aria-hidden="false") | unit | check panel attribute |
| collapsed: content panel hidden (aria-hidden="true") | unit | check panel attribute |
| expanded: description text renders | unit | `screen.getByText(/description text/)` |
| expanded: chevron has rotate-180 class | unit | check icon container class |
| expanded: name uses font-semibold | unit | check span class |
| expanded: left border accent visible | unit | check border-l-2 class |
| calls onToggle when clicked | unit | `userEvent.click(button)`, verify mock called |
| scroll-reveal class applied | unit | check outer div class |
| stagger delay style applied | unit | check transitionDelay style |
| renders devotional preview when expanded with previewKey="devotional" | unit | verify Caveat quote text renders |
| renders mood dots for mood-checkin preview | unit | verify 5 dots render |

**Expected state after completion:**
- [x] `PillarAccordionItem.tsx` handles collapsed/expanded states with smooth transitions
- [x] All 14 compact previews render correctly via switch on previewKey
- [x] Accessibility: button triggers with aria-expanded/aria-hidden
- [x] Tests pass

---

### Step 3: Create PillarBlock component

**Objective:** Build the pillar wrapper that manages accordion state and renders the header + accordion items.

**Files to create/modify:**
- `frontend/src/components/homepage/PillarBlock.tsx` — new component

**Details:**

Props:
```typescript
interface PillarBlockProps {
  pillar: Pillar
  isVisible: boolean
}
```

Structure:
- Uses `useState<number>(0)` for expanded index (default: first item = index 0)
- Header row: `<div className="flex items-center gap-3">` with:
  - `<pillar.icon>` in `ACCENT_CLASSES[accent].text` + `w-8 h-8 sm:w-10 sm:h-10`
  - `<h3>` in `text-2xl sm:text-3xl font-bold text-white` with title
- Subtitle: `<p>` in `text-white/50 text-sm sm:text-base mt-1` below the header row
- Header wrapped in `scroll-reveal` + `is-visible` based on `isVisible`, with `staggerDelay(0)`
- Accordion list: map over `pillar.features`, rendering `PillarAccordionItem` for each
  - `isExpanded={expandedIndex === i}`
  - `onToggle` sets expandedIndex to `i` if not expanded, or `-1` to collapse (but spec says first is default — collapsing the currently expanded item could set to -1, allowing all collapsed state)
  - Actually, re-reading spec: "Only one item per pillar expanded at a time (clicking a new item closes the current one)." Clicking the same item should collapse it (toggle behavior). So: `onToggle={() => setExpandedIndex(prev => prev === i ? -1 : i)}`
- Each accordion item gets `index={i}` for stagger delay + `isVisible` from parent

**Auth gating:** N/A

**Responsive behavior:**
- Desktop (1024px+): Pillar header and items display in natural flow
- Tablet (640px): Same layout, slightly smaller icon
- Mobile (< 640px): Same single-column layout, icon `w-8 h-8`

**Guardrails (DO NOT):**
- DO NOT wrap accordion items in a `<ul>/<li>` unless the spec requires it (it doesn't)
- DO NOT add navigation links — this is informational only
- DO NOT manage glow background here — PillarSection handles GlowBackground wrapping

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| renders pillar title | unit | `screen.getByRole('heading', { name: 'Healing' })` |
| renders pillar subtitle | unit | `screen.getByText('Daily practices for your inner life')` |
| renders correct Lucide icon | unit | verify icon renders (by test-id or svg presence) |
| renders all features | unit | verify all feature names render |
| first item expanded by default | unit | first item has aria-expanded="true" |
| clicking second item expands it and collapses first | integration | `userEvent.click`, verify state change |
| clicking expanded item collapses it | integration | click same item, verify aria-expanded="false" |

**Expected state after completion:**
- [x] `PillarBlock.tsx` manages single-expanded accordion state per pillar
- [x] Header renders icon, title, subtitle correctly
- [x] Tests pass

---

### Step 4: Create PillarSection component

**Objective:** Build the main section wrapper that renders the heading and all three pillar blocks with individual GlowBackgrounds and scroll reveal.

**Files to create/modify:**
- `frontend/src/components/homepage/PillarSection.tsx` — new component

**Details:**

Structure:
```tsx
export function PillarSection() {
  return (
    <section aria-label="Feature pillars">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
        <SectionHeading
          heading="Everything You Need to Heal, Grow, and Connect"
          tagline="Three pillars. One journey. Your pace."
        />
        <div className="mt-14 sm:mt-[4.5rem] space-y-20 sm:space-y-28">
          {PILLARS.map((pillar) => (
            <PillarWithGlow key={pillar.id} pillar={pillar} />
          ))}
        </div>
      </div>
    </section>
  )
}
```

`PillarWithGlow` — internal sub-component that wraps each pillar in `GlowBackground` with the correct variant and manages its own scroll reveal:

```tsx
function PillarWithGlow({ pillar }: { pillar: Pillar }) {
  const { ref, isVisible } = useScrollReveal()
  return (
    <GlowBackground variant={pillar.glowVariant}>
      <div ref={ref as React.RefObject<HTMLDivElement>}>
        <PillarBlock pillar={pillar} isVisible={isVisible} />
      </div>
    </GlowBackground>
  )
}
```

Each pillar block uses its own `useScrollReveal` instance so they reveal independently on scroll.

**Auth gating:** N/A

**Responsive behavior:**
- Desktop (1024px+): `max-w-5xl` container centered, `py-28`, `space-y-28`, `mt-[4.5rem]`
- Tablet (640px): Same container, same spacing values at sm breakpoint
- Mobile (< 640px): Full-width `px-4`, `py-20`, `space-y-20`, `mt-14`

**Guardrails (DO NOT):**
- DO NOT add a background color to the outer section — `GlowBackground` handles bg per pillar
- DO NOT use a single `useScrollReveal` for all pillars — each must reveal independently
- DO NOT change `SectionHeading` props — heading and tagline text are from spec

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| renders section heading | unit | `screen.getByRole('heading', { name: /everything you need/i })` |
| renders tagline | unit | `screen.getByText(/three pillars.*one journey/i)` |
| renders 3 pillar blocks | unit | verify 3 headings: Healing, Growth, Community |
| renders 3 GlowBackground wrappers | unit | verify 3 `bg-hero-bg` containers |
| section has aria-label | unit | `screen.getByRole('region', { name: /feature pillars/i })` |
| all 14 feature names render | integration | verify all feature name strings are in the document |

**Expected state after completion:**
- [x] `PillarSection.tsx` renders heading + 3 pillar blocks with glow backgrounds
- [x] Each pillar reveals independently on scroll
- [x] Tests pass

---

### Step 5: Integrate PillarSection into Home.tsx and update barrel export

**Objective:** Wire PillarSection into the landing page at the correct position and export from barrel.

**Files to create/modify:**
- `frontend/src/pages/Home.tsx` — replace `{/* HP-4: PillarSection */}` comment with `<PillarSection />`
- `frontend/src/components/homepage/index.ts` — add `PillarSection` export

**Details:**

In `Home.tsx`:
- Add import: `import { FeatureShowcase, StatsBar, PillarSection } from '@/components/homepage'`
- Replace `{/* HP-4: PillarSection */}` with `<PillarSection />`
- The section sits between `<StatsBar />` and `{/* HP-5: DifferentiatorSection */}`

In `index.ts`:
- Add: `export { PillarSection } from './PillarSection'`

**Auth gating:** N/A

**Responsive behavior:** N/A: no UI impact (wiring only)

**Guardrails (DO NOT):**
- DO NOT remove other placeholder comments (HP-5, HP-6, HP-7)
- DO NOT modify any other components in Home.tsx
- DO NOT change the import path to anything other than the barrel export

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| PillarSection renders in Home page | integration | Render `<Home />` (mocked) and verify "Everything You Need" heading exists |

Note: The primary Home.tsx integration test is lightweight — the component-level tests in Steps 1-4 provide the depth coverage.

**Expected state after completion:**
- [x] `PillarSection` renders on the landing page below StatsBar
- [x] Barrel export updated
- [x] Build passes with 0 errors
- [x] All existing tests still pass

---

### Step 6: Tests for all components

**Objective:** Write comprehensive tests for all new components, following existing homepage test patterns.

**Files to create/modify:**
- `frontend/src/components/homepage/__tests__/pillar-data.test.ts` — data validation tests
- `frontend/src/components/homepage/__tests__/PillarAccordionItem.test.tsx` — accordion item tests
- `frontend/src/components/homepage/__tests__/PillarBlock.test.tsx` — pillar block tests
- `frontend/src/components/homepage/__tests__/PillarSection.test.tsx` — section integration tests

**Details:**

Follow existing test patterns from `StatsBar.test.tsx` and `FeatureShowcase.test.tsx`:
- Mock `useScrollReveal` with `vi.mock` to return `isVisible: true`
- Use `@testing-library/react` for rendering
- Use `userEvent` for click interactions
- Use `screen.getByRole`, `screen.getByText`, `container.querySelector` for assertions

**pillar-data.test.ts** (5 tests):
- PILLARS length is 3
- Healing has 6 features, Growth has 5, Community has 3
- All features have non-empty name, description, previewKey
- ACCENT_CLASSES has purple, emerald, amber keys
- Each pillar has correct glowVariant (left, right, center)

**PillarAccordionItem.test.tsx** (15 tests):
- Renders feature name
- Trigger is a `<button>` element
- Collapsed: aria-expanded="false", content aria-hidden="true"
- Expanded: aria-expanded="true", content aria-hidden="false"
- Expanded: description text visible
- Expanded: chevron has rotate-180
- Expanded: name uses font-semibold
- Expanded: left border accent border-l-2 class
- Calls onToggle on click
- scroll-reveal class applied
- staggerDelay style applied
- Renders devotional preview with Caveat text when previewKey="devotional"
- Renders mood dots for previewKey="mood-checkin"
- Collapsed: max-height is 0px inline style
- Expanded: max-height is 500px inline style

**PillarBlock.test.tsx** (7 tests):
- Renders pillar title as heading
- Renders subtitle text
- Renders icon (verify SVG element or test-id)
- Renders all feature names
- First item expanded by default (first button aria-expanded="true")
- Clicking second item expands it, collapses first
- Clicking expanded item collapses it (aria-expanded="false")

**PillarSection.test.tsx** (6 tests):
- Renders section heading "Everything You Need to Heal, Grow, and Connect"
- Renders tagline "Three pillars. One journey. Your pace."
- Renders all 3 pillar headings (Healing, Growth, Community)
- Renders GlowBackground wrappers (3 × bg-hero-bg)
- Section has aria-label="Feature pillars"
- All 14 feature names are in the document

**Auth gating:** N/A

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT skip mocking `useScrollReveal` — tests will fail due to IntersectionObserver
- DO NOT test CSS animations directly — test class application instead
- DO NOT test every single compact preview in detail — test representative samples (devotional, mood dots)

**Expected state after completion:**
- [x] All new test files pass
- [x] All existing tests still pass
- [x] Build passes with 0 errors and 0 warnings
- [x] ~33 new tests total

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Pillar data file (types + content) |
| 2 | 1 | PillarAccordionItem (uses pillar data types) |
| 3 | 1, 2 | PillarBlock (uses data + accordion item) |
| 4 | 1, 2, 3 | PillarSection (uses all components) |
| 5 | 4 | Integration into Home.tsx |
| 6 | 1, 2, 3, 4 | All tests (can run after components exist) |

Note: Steps 5 and 6 can be done in parallel since they touch different files.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Pillar data file | [COMPLETE] | 2026-04-02 | Created `pillar-data.ts` with types, ACCENT_CLASSES (added `ring` field), and all 14 features across 3 pillars |
| 2 | PillarAccordionItem component | [COMPLETE] | 2026-04-02 | Created `PillarAccordionItem.tsx` with all 14 compact previews, accordion behavior, a11y attributes |
| 3 | PillarBlock component | [COMPLETE] | 2026-04-02 | Created `PillarBlock.tsx` with single-expanded accordion state, header with icon/title/subtitle |
| 4 | PillarSection component | [COMPLETE] | 2026-04-02 | Created `PillarSection.tsx` with SectionHeading, 3 PillarWithGlow wrappers, independent scroll reveal |
| 5 | Home.tsx integration + barrel export | [COMPLETE] | 2026-04-02 | Replaced HP-4 placeholder with `<PillarSection />`, updated barrel export and import |
| 6 | Tests for all components | [COMPLETE] | 2026-04-02 | 4 test files, 37 new tests (7+15+7+6+2 extra). 484 files / 5429 tests all passing |
