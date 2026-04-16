# Implementation Plan: HP-2 Feature Experience Showcase

**Spec:** `_specs/hp-2-feature-experience-showcase.md`
**Date:** 2026-04-02
**Branch:** `homepage-redesign` (shared across HP-1 through HP-7 — do NOT create new branch)
**Design System Reference:** `_plans/recon/design-system.md` (loaded)
**Recon Report:** not applicable (no external recon for this spec)
**Master Spec Plan:** not applicable (standalone homepage redesign section, builds on HP-1 foundation)

---

## Architecture Context

### Project Structure

- Homepage components: `frontend/src/components/homepage/` — created by HP-1 with barrel export `index.ts`
- Hooks: `frontend/src/hooks/` — `useScrollReveal.ts` with `staggerDelay` helper (HP-1)
- Constants: `frontend/src/constants/` — `gradients.tsx` has `GRADIENT_TEXT_STYLE` and `WHITE_PURPLE_GRADIENT`
- CSS utilities: `frontend/src/index.css` — `.scroll-reveal`, `.scroll-reveal-fade`, `.scrollbar-hide`, reduced-motion overrides
- Tailwind config: `frontend/tailwind.config.js` — custom colors, `glow-float` animation
- Tests: Co-located as `__tests__/ComponentName.test.tsx` within component directories

### Key Existing Files (from HP-1)

- **`components/homepage/GlowBackground.tsx`** — Atmospheric background with 5 variants (`center`, `left`, `right`, `split`, `none`). Uses `bg-hero-bg` (`#08051A`). Glow orbs: `radial-gradient(circle, rgba(139, 92, 246, 0.06) 0%, transparent 70%)` for purple, `rgba(255, 255, 255, 0.03)` for white. `animate-glow-float` (20s ease-in-out infinite), gated behind `motion-reduce:animate-none`.
- **`components/homepage/SectionHeading.tsx`** — `<h2>` with `GRADIENT_TEXT_STYLE` gradient text. `text-3xl sm:text-4xl lg:text-5xl font-bold`. Optional tagline: `text-base sm:text-lg text-white/60 mt-3 max-w-2xl`. Supports `align="center"` (default) and `align="left"`.
- **`components/homepage/FrostedCard.tsx`** — Frosted glass card: `bg-white/[0.05] backdrop-blur-sm border border-white/[0.08] rounded-2xl p-6`. Polymorphic `as` prop. Interactive hover state when `onClick` provided.
- **`components/homepage/index.ts`** — Barrel export for `GlowBackground`, `SectionHeading`, `FrostedCard`.
- **`hooks/useScrollReveal.ts`** — Returns `{ ref, isVisible }`. Uses IntersectionObserver with `threshold: 0.1`, `rootMargin: '-50px'`, `triggerOnce: true`. Respects `prefers-reduced-motion` (starts visible). `staggerDelay(index, baseDelay, initialDelay)` returns `{ transitionDelay: '...' }`.
- **`constants/gradients.tsx`** — `GRADIENT_TEXT_STYLE: CSSProperties` = white-to-purple gradient text. `WHITE_PURPLE_GRADIENT = 'linear-gradient(223deg, #FFFFFF 0%, #8B5CF6 100%)'`.
- **`pages/Home.tsx`** — Renders `<HeroSection />`, HP-2 placeholder comment, `<GrowthTeasersSection />`, `<StartingPointQuiz />`, `<SiteFooter />`. Both `HeroSection` and `GlowBackground` use `bg-hero-bg` so they flow seamlessly.
- **`index.css`** — `.scroll-reveal` (opacity + translateY + 600ms transition), `.scroll-reveal.is-visible`, `.scrollbar-hide` (hides scrollbar). Reduced-motion: `.scroll-reveal` gets `opacity: 1; transform: none; transition: none`.

### Test Patterns (from HP-1)

Pure presentation components use simple `render(<Component />)` — no providers needed:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
```

- `screen.getByRole()`, `screen.getByText()` for queries
- `container.firstElementChild` for class inspection
- `screen.getAllByTestId()` for multiple similar elements
- `userEvent.setup()` + `await user.click()` for interactions

### Design System Recon Staleness

⚠️ Design system recon captured 2026-03-06, before HP-1 homepage redesign (2026-04-02). Homepage screenshots no longer reflect current layout. Base color/typography/spacing values remain accurate since they come from `tailwind.config.js` and `index.css`.

---

## Auth Gating Checklist

N/A — This is a public landing page section. All elements are informational or decorative. No actions require authentication.

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| GlowBackground | background-color | `#08051A` (`bg-hero-bg`) | `tailwind.config.js:22` |
| GlowBackground split purple | radial-gradient | `rgba(139, 92, 246, 0.06)` | `GlowBackground.tsx:9` |
| GlowBackground split white | radial-gradient | `rgba(255, 255, 255, 0.03)` | `GlowBackground.tsx:10` |
| SectionHeading h2 | font size | `text-3xl sm:text-4xl lg:text-5xl font-bold` | `SectionHeading.tsx:22` |
| SectionHeading tagline | styles | `text-base sm:text-lg text-white/60 mt-3 max-w-2xl` | `SectionHeading.tsx:28-33` |
| GRADIENT_TEXT_STYLE | backgroundImage | `linear-gradient(223deg, #FFFFFF 0%, #8B5CF6 100%)` | `constants/gradients.tsx:6` |
| FrostedCard | base classes | `bg-white/[0.05] backdrop-blur-sm border border-white/[0.08] rounded-2xl p-6` | `FrostedCard.tsx:21-22` |
| Active tab | styles | `text-white bg-white/[0.1] border-white/[0.15] shadow-[0_0_20px_rgba(139,92,246,0.15)]` | spec |
| Inactive tab | styles | `text-white/50 bg-transparent border border-white/[0.06]` | spec |
| Mockup pill buttons | styles | `bg-white/[0.06] text-white/50 text-xs rounded-full px-3 py-1` | spec |
| Bullet dot | styles | `w-1.5 h-1.5 rounded-full bg-purple-500` | spec |
| Prayer border pulse | from | `rgba(139, 92, 246, 0.1)` | spec |
| Prayer border pulse | to | `rgba(139, 92, 246, 0.25)` | spec |
| Glow cyan | color | `#00D4FF` | `tailwind.config.js` / `design-system.md` |
| Caveat font | class | `font-script` | `design-system.md` |

---

## Design System Reminder

**Project-specific quirks that `/execute-plan` displays before every UI step:**

- Worship Room uses `font-script` (Caveat) for script/highlighted headings, NOT `font-serif` (Lora). Lora is for scripture text only.
- `GRADIENT_TEXT_STYLE` from `constants/gradients.tsx` is the single source of truth for gradient text — do NOT recreate inline.
- `GlowBackground` uses `bg-hero-bg` (`#08051A`) not `bg-hero-dark` (`#0D0620`). These are different colors.
- FrostedCard uses `bg-white/[0.05]` not `bg-white/5` — the bracket syntax is intentional for exact Tailwind values.
- `scroll-reveal` and `scroll-reveal-fade` CSS classes are in `index.css` `@layer utilities`. Combine with `is-visible` class applied conditionally via `useScrollReveal().isVisible`.
- `staggerDelay(index, baseDelay, initialDelay)` returns `{ transitionDelay: '...' }` as a `CSSProperties` object — spread directly onto `style` prop.
- All text on dark backgrounds: primary text `text-white/70`, secondary `text-white/60`, interactive `text-white/50`, decorative `text-white/20` to `text-white/40`.
- Animations gated behind `prefers-reduced-motion`: use `motion-reduce:` prefix for Tailwind classes or `@media (prefers-reduced-motion: reduce)` for CSS keyframes.
- `.scrollbar-hide` class is in `index.css` — use it directly, no need to add custom CSS.

---

## Shared Data Models (from Master Plan)

N/A — This spec uses no shared data models or localStorage keys. All content is hardcoded static text.

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | < 640px | Tab bar: horizontally scrollable, icon-only pills (no labels). Preview panel: single column (text stacked above mockup). Container: `px-4`. Min height: `280px`. |
| Tablet | 640-1024px | Tab bar: icon + label pills, centered row. Preview panel: single column. Container: `px-6`. Min height: `320px`. |
| Desktop | > 1024px | Tab bar: icon + label pills, centered row. Preview panel: two-column `grid-cols-2` (text left / mockup right). Min height: `400px`. |

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| HeroSection → FeatureShowcase | 0px (seamless) | Both use `bg-hero-bg`, no gap. `GlowBackground` wraps the section. |
| SectionHeading → Tab bar | `mt-10` (40px) | [UNVERIFIED] — based on section heading patterns in existing pages. → To verify: visual inspection after implementation. → If wrong: adjust spacing. |
| Tab bar → Preview panel | `mt-8` (32px) | [UNVERIFIED] → To verify: visual inspection. → If wrong: adjust. |
| FeatureShowcase → GrowthTeasersSection | 0px (seamless) | GrowthTeasersSection uses dark purple gradient, flows from `bg-hero-bg`. |

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] HP-1 foundation is committed and all components available (`GlowBackground`, `SectionHeading`, `FrostedCard`, `useScrollReveal`, `staggerDelay`, scroll-reveal CSS classes)
- [x] On `homepage-redesign` branch
- [x] All Lucide icons in the spec exist in `lucide-react` package: `BookOpen`, `Heart`, `Headphones`, `Users`, `Sprout`, `CloudRain`, `Waves`, `TreePine`, `Flame`, `Moon`, `Droplets`
- [x] `scrollbar-hide` CSS class exists in `index.css`
- [x] No auth-gated actions in this spec
- [x] Design system values are verified from codebase inspection
- [x] All [UNVERIFIED] values are flagged with verification methods

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Tab transition implementation | Mount all panels, hide inactive via `opacity-0 pointer-events-none absolute`, animate active with CSS `transition-opacity` | Simpler than mount/unmount, preserves DOM for accessibility, matches spec suggestion of "mount-all-hide-inactive pattern" |
| Mobile tab labels | Hidden below `sm` breakpoint (`hidden sm:inline`) | Spec says "icon-only pills (no labels)" on mobile |
| Prayer border glow animation | New CSS `@keyframes` in `index.css` utilities + reduced-motion override | Consistent with project pattern of CSS animations in `index.css` and reduced-motion block |
| Tab keyboard navigation | Arrow keys change active tab, Enter/Space redundant (auto-select on focus) | Standard WAI-ARIA Tabs pattern with automatic activation for better UX |
| Crossfade timing | 150ms opacity transition on outgoing, 200ms on incoming | Spec requirement. Implemented via CSS `transition-duration` toggled by active state |
| Garden SVG | Simple inline SVG (ground, plant, sun, butterfly) in 4 colors | Spec says "Static, no animations. 3-4 colors (green, purple, gold, white)". Keep simple — not the full 765-line GrowthGarden. |
| Decorative pill buttons in mockups | `<span>` elements, not `<button>` | Spec: "decorative only, no action". Using semantic spans avoids keyboard trap. |

---

## Implementation Steps

### Step 1: Add CSS Keyframes for Prayer Border Pulse

**Objective:** Add the `@keyframes border-pulse-glow` animation to `index.css` with reduced-motion override.

**Files to create/modify:**
- `frontend/src/index.css` — ADD keyframe + reduced-motion override

**Details:**

Add inside the existing `@layer utilities` block (after `.scroll-reveal-fade.is-visible` around line 85):

```css
.border-pulse-glow {
  animation: border-pulse-glow 3s ease-in-out infinite;
}

@keyframes border-pulse-glow {
  0%, 100% { border-color: rgba(139, 92, 246, 0.1); }
  50% { border-color: rgba(139, 92, 246, 0.25); }
}
```

Add inside the existing `@media (prefers-reduced-motion: reduce)` block (around line 130+):

```css
.border-pulse-glow {
  animation: none;
  border-color: rgba(139, 92, 246, 0.15);
}
```

**Auth gating:** N/A

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT modify existing CSS rules — only add new ones
- DO NOT add to `tailwind.config.js` — this is a one-off animation, not a reusable Tailwind utility
- DO NOT remove the `@layer utilities` wrapper — add inside it

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| N/A | — | CSS-only change, verified visually during Step 3 |

**Expected state after completion:**
- [x] `.border-pulse-glow` class animates `border-color` between `rgba(139,92,246,0.1)` and `rgba(139,92,246,0.25)` over 3s
- [x] Animation disabled under `prefers-reduced-motion: reduce` with static `rgba(139,92,246,0.15)` border
- [x] Build passes

---

### Step 2: Create Tab Data Constant and Types

**Objective:** Define the 5 tabs' metadata as a typed constant. This is the single source of truth for tab IDs, labels, icons, titles, descriptions, and highlight bullets.

**Files to create/modify:**
- `frontend/src/constants/feature-showcase.ts` — CREATE

**Details:**

```typescript
import type { LucideIcon } from 'lucide-react'
import { BookOpen, Heart, Headphones, Users, Sprout } from 'lucide-react'

export interface FeatureTab {
  id: string
  label: string
  icon: LucideIcon
  title: string
  description: string
  highlights: string[]
}

export const FEATURE_TABS: FeatureTab[] = [
  {
    id: 'devotional',
    label: 'Daily Devotional',
    icon: BookOpen,
    title: 'Start Each Day with Purpose',
    description:
      'A fresh devotional every morning — an inspiring quote, a scripture passage, and a reflection that ties everything together. Complete your quiet time in just 10 minutes.',
    highlights: [
      '50 devotionals across every season of the church year',
      'Liturgical calendar awareness — content shifts with Advent, Lent, Easter',
      'Journal and pray directly from the devotional',
    ],
  },
  {
    id: 'prayer',
    label: 'AI Prayer',
    icon: Heart,
    title: 'Prayers That Know Your Heart',
    description:
      "Tell us how you're feeling, and we'll generate a personalized prayer just for you — with ambient worship music that plays as the words appear, one by one.",
    highlights: [
      'AI-generated prayers tailored to your exact situation',
      'Karaoke-style text reveal with ambient soundscape',
      'Copy, share, or continue the conversation',
    ],
  },
  {
    id: 'meditation',
    label: 'Meditation & Sound',
    icon: Headphones,
    title: 'Your Sanctuary of Sound',
    description:
      '24 ambient sounds with crossfade mixing, 6 guided meditation types, and a full sleep library — scripture readings, bedtime stories, and rest routines.',
    highlights: [
      'Mix multiple sounds into your perfect atmosphere',
      'Breathing exercises, gratitude reflections, psalm readings',
      'Sleep timer with gentle fade-out',
    ],
  },
  {
    id: 'prayer-wall',
    label: 'Prayer Wall',
    icon: Users,
    title: 'Pray Together, Heal Together',
    description:
      "A community prayer wall where you can share what's on your heart, lift others up in prayer, and feel the warmth of knowing someone is praying for you.",
    highlights: [
      'Share prayer requests and receive community support',
      'Question of the Day sparks meaningful discussions',
      'Grace-based — never performative, always warm',
    ],
  },
  {
    id: 'growth',
    label: 'Your Growth',
    icon: Sprout,
    title: 'Watch Yourself Grow',
    description:
      'Track your spiritual journey with a visual growth garden, reading plans, seasonal challenges, and mood insights that reflect your progress back to you.',
    highlights: [
      '10 reading plans from 7 to 21 days',
      'Seasonal challenges tied to Advent, Lent, Easter, and more',
      'A living garden that grows as you do',
    ],
  },
]
```

**Auth gating:** N/A

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT add any React components to this file — it's data only
- DO NOT import preview components here — that creates circular dependencies
- DO NOT add mockup content (prayer text, names, etc.) — that belongs in preview components

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| FEATURE_TABS has 5 entries | unit | Verify array length and each tab has required fields |
| Each tab has unique id | unit | Verify no duplicate IDs |

**Expected state after completion:**
- [x] `constants/feature-showcase.ts` exports `FEATURE_TABS` array and `FeatureTab` interface
- [x] 5 tabs with correct labels, icons, titles, descriptions, and highlights
- [x] Build passes

---

### Step 3: Create DevotionalPreview and PrayerPreview Components

**Objective:** Build the first two mockup preview components — Tab 1 (devotional card) and Tab 2 (AI prayer with border glow + static karaoke text).

**Files to create/modify:**
- `frontend/src/components/homepage/previews/DevotionalPreview.tsx` — CREATE
- `frontend/src/components/homepage/previews/PrayerPreview.tsx` — CREATE

**Details:**

**`DevotionalPreview.tsx`:**

A dark card that looks like a miniature devotional page.

```tsx
export function DevotionalPreview() {
  return (
    <div className="rounded-xl bg-white/[0.03] p-4 sm:p-5 space-y-3"
         style={{ background: 'linear-gradient(to bottom, rgba(139, 92, 246, 0.03), transparent)' }}>
      {/* Date stamp */}
      <p className="text-white/40 text-xs">April 2, 2026</p>

      {/* Quote in Caveat */}
      <p className="font-script text-white/80 italic text-lg sm:text-xl leading-relaxed">
        "Be still, and know that I am God."
      </p>

      {/* Divider */}
      <div className="border-t border-white/10" />

      {/* Passage reference */}
      <p className="text-white/50 text-sm">Psalm 46:10 (WEB)</p>

      {/* Body snippet */}
      <p className="text-white/60 text-sm leading-relaxed">
        In the chaos of daily life, God invites us to pause. This isn't passive waiting
        — it's an active surrender, a decision to trust that He is in control even when
        everything feels uncertain.
      </p>

      {/* Decorative pill buttons */}
      <div className="flex gap-2 pt-1">
        <span className="bg-white/[0.06] text-white/50 text-xs rounded-full px-3 py-1">
          Journal about this
        </span>
        <span className="bg-white/[0.06] text-white/50 text-xs rounded-full px-3 py-1">
          Pray about this
        </span>
      </div>
    </div>
  )
}
```

**`PrayerPreview.tsx`:**

The most elaborate mockup. Dark card with animated border pulse glow, input area with cyan glow, static karaoke text, and waveform indicator.

```tsx
export function PrayerPreview() {
  return (
    <div className="rounded-xl bg-white/[0.03] p-4 sm:p-5 space-y-3 border border-white/[0.08] border-pulse-glow motion-reduce:border-white/[0.15]">
      {/* Input area with cyan glow */}
      <div className="rounded-lg bg-white/[0.04] px-3 py-2 border"
           style={{ borderColor: 'rgba(0, 212, 255, 0.3)', boxShadow: '0 0 8px rgba(0, 212, 255, 0.1)' }}>
        <p className="text-white/60 text-sm italic">
          I'm feeling anxious about the future...
        </p>
      </div>

      {/* Static karaoke prayer text */}
      <div className="space-y-1 pt-1">
        <p className="text-sm leading-relaxed">
          <span className="text-white/90">Lord, I bring my anxiety before You today. </span>
          <span className="text-white/90">You know the fears that grip my heart </span>
          <span className="text-white/90">about what tomorrow holds. </span>
          <span className="text-white/20">Help me to rest in Your promises </span>
          <span className="text-white/20">and trust that You hold my future </span>
          <span className="text-white/20">in Your loving hands.</span>
        </p>
      </div>

      {/* Ambient waveform indicator */}
      <div className="flex items-end justify-end gap-[3px] pt-1">
        <div className="w-[3px] h-3 bg-purple-500/60 rounded-full" />
        <div className="w-[3px] h-5 bg-purple-500/80 rounded-full" />
        <div className="w-[3px] h-2 bg-purple-500/50 rounded-full" />
      </div>
    </div>
  )
}
```

Key implementation notes:
- `border-pulse-glow` CSS class from Step 1 animates the outer border color
- `motion-reduce:border-white/[0.15]` provides a static fallback border when animation is disabled
- Karaoke text: first 3 phrases at `text-white/90`, last 3 at `text-white/20` — static, no animation
- Waveform: 3 divs with varying heights (12px, 20px, 8px) in purple, bottom-right aligned
- Cyan glow border on input: `rgba(0, 212, 255, 0.3)` border + `0 0 8px rgba(0, 212, 255, 0.1)` box-shadow — matches `glow-cyan` (`#00D4FF`)

**Auth gating:** N/A

**Responsive behavior:**
- Desktop (> 1024px): Full card with comfortable padding (`p-5`)
- Tablet (640-1024px): Same layout, slightly reduced padding (`p-4 sm:p-5`)
- Mobile (< 640px): `p-4`, text scales down naturally

**Guardrails (DO NOT):**
- DO NOT make pill buttons interactive — they are `<span>` elements, not `<button>`
- DO NOT add any actual karaoke animation (word-by-word reveal) — the spec says "static karaoke effect"
- DO NOT use `dangerouslySetInnerHTML` for any text content
- DO NOT import or reference any real data from `data/devotionals.ts` — all content is hardcoded mockup text

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| DevotionalPreview renders date, quote, passage | unit | Verify "April 2, 2026", "Be still, and know that I am God.", "Psalm 46:10 (WEB)" are present |
| DevotionalPreview uses font-script for quote | unit | Verify Caveat class on quote element |
| DevotionalPreview renders pill buttons as spans | unit | Verify "Journal about this" and "Pray about this" exist and are not buttons |
| PrayerPreview renders input text and prayer text | unit | Verify "I'm feeling anxious about the future..." and "Lord, I bring my anxiety" |
| PrayerPreview has border-pulse-glow class | unit | Verify outer div has `border-pulse-glow` class |
| PrayerPreview renders waveform bars | unit | Verify 3 waveform bar elements exist |

**Expected state after completion:**
- [x] `previews/DevotionalPreview.tsx` renders a miniature devotional card
- [x] `previews/PrayerPreview.tsx` renders prayer card with glow border, karaoke text, waveform
- [x] Build passes

---

### Step 4: Create MeditationPreview, PrayerWallPreview, GrowthPreview

**Objective:** Build the remaining three mockup preview components (Tabs 3-5).

**Files to create/modify:**
- `frontend/src/components/homepage/previews/MeditationPreview.tsx` — CREATE
- `frontend/src/components/homepage/previews/PrayerWallPreview.tsx` — CREATE
- `frontend/src/components/homepage/previews/GrowthPreview.tsx` — CREATE

**Details:**

**`MeditationPreview.tsx`:**

2x3 grid of sound tiles, 2 "active", plus volume bars below.

```tsx
import { CloudRain, Waves, TreePine, Flame, Moon, Droplets } from 'lucide-react'

const SOUNDS = [
  { icon: CloudRain, label: 'Rain', active: true },
  { icon: Waves, label: 'Ocean', active: true },
  { icon: TreePine, label: 'Forest', active: false },
  { icon: Flame, label: 'Fireplace', active: false },
  { icon: Moon, label: 'Night', active: false },
  { icon: Droplets, label: 'Stream', active: false },
]
```

- Grid: `grid grid-cols-3 gap-2`
- Each tile: `bg-white/[0.04] rounded-xl p-3 text-center`
- Active tiles: `bg-white/[0.08] border border-purple-500/30` with `text-purple-400` icon
- Inactive tiles: `text-white/40` icon
- Icon: `w-5 h-5 mx-auto mb-1`, label: `text-white/50 text-[11px]`
- Below grid: two horizontal bars representing volume levels — `h-1.5 rounded-full bg-purple-500/40` at different widths (70%, 45%)

**`PrayerWallPreview.tsx`:**

3 stacked mini prayer cards with slight overlap.

```tsx
const PRAYERS = [
  { initials: 'S.M.', name: 'Sarah M.', text: 'Please pray for my family during this difficult season...', count: 12 },
  { initials: 'D.K.', name: 'David K.', text: 'Grateful for a new job opportunity. Praying for wisdom...', count: 8 },
  { initials: 'R.P.', name: 'Rachel P.', text: 'Asking for peace and healing after a recent loss...', count: 15 },
]
```

- Cards: negative margin overlap: second card `mt-[-8px]`, third card `mt-[-8px]`, each with `relative` and increasing `z-index` (z-10, z-20, z-30)
- Each card: `bg-white/[0.04] rounded-lg p-3 border border-white/[0.06]`
- Avatar circle: `w-7 h-7 rounded-full bg-purple-500/20 text-purple-400 text-[10px] font-bold flex items-center justify-center`
- Layout: flex row with avatar, then text column (name + snippet + count)
- Decorative pill: "Pray for someone" below cards

**`GrowthPreview.tsx`:**

Top half: simple inline SVG garden. Bottom half: stat rows.

SVG garden — simple shapes only (ground, plant stem, leaves, sun, butterfly). 4 colors: green (`#34D399`), purple (`#8B5CF6`), gold (`#F59E0B`), white (`#FFFFFF`). Static, no animations. Approximate 200x100 viewBox.

```tsx
export function GrowthPreview() {
  return (
    <div className="rounded-xl bg-white/[0.03] p-4 sm:p-5">
      {/* SVG Garden */}
      <div className="flex justify-center mb-4">
        <svg viewBox="0 0 200 100" className="w-full max-w-[200px] h-auto" aria-hidden="true">
          {/* Ground */}
          <rect x="0" y="85" width="200" height="15" rx="4" fill="#34D399" opacity="0.2" />
          {/* Plant stem */}
          <line x1="100" y1="85" x2="100" y2="40" stroke="#34D399" strokeWidth="2" />
          {/* Leaves */}
          <ellipse cx="90" cy="55" rx="12" ry="6" fill="#34D399" opacity="0.6" transform="rotate(-30 90 55)" />
          <ellipse cx="110" cy="48" rx="12" ry="6" fill="#34D399" opacity="0.5" transform="rotate(25 110 48)" />
          <ellipse cx="95" cy="42" rx="10" ry="5" fill="#34D399" opacity="0.7" transform="rotate(-15 95 42)" />
          {/* Flower */}
          <circle cx="100" cy="35" r="6" fill="#8B5CF6" opacity="0.7" />
          <circle cx="100" cy="35" r="2.5" fill="#F59E0B" />
          {/* Sun */}
          <circle cx="170" cy="20" r="10" fill="#F59E0B" opacity="0.3" />
          {/* Butterfly */}
          <ellipse cx="45" cy="30" rx="5" ry="3" fill="#8B5CF6" opacity="0.4" transform="rotate(-20 45 30)" />
          <ellipse cx="55" cy="30" rx="5" ry="3" fill="#FFFFFF" opacity="0.2" transform="rotate(20 55 30)" />
          <circle cx="50" cy="31" r="1" fill="#FFFFFF" opacity="0.5" />
        </svg>
      </div>

      {/* Stat rows */}
      <div className="space-y-2">
        <p className="text-white/70 text-sm">🔥 14-day streak</p>
        <p className="text-white/50 text-xs">Day 5 of 21 — Knowing Who You Are in Christ</p>
      </div>
    </div>
  )
}
```

Note: The SVG is simple and lightweight — a stylized garden illustration, not a replica of the full `GrowthGarden.tsx` component (765 lines). It serves as a visual teaser only.

**Auth gating:** N/A

**Responsive behavior:**
- Desktop (> 1024px): Full card padding
- Tablet (640-1024px): Same layout
- Mobile (< 640px): Sound mixer grid stays 2x3, prayer cards stack vertically, garden SVG scales down

**Guardrails (DO NOT):**
- DO NOT import from the real `GrowthGarden.tsx` — this is a simple standalone SVG illustration
- DO NOT add click handlers to any elements — all decorative
- DO NOT use the real ambient sound data from `data/music/sound-catalog.ts`
- DO NOT animate the garden SVG — spec says "Static, no animations"

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| MeditationPreview renders 6 sound tiles | unit | Verify 6 tiles with correct labels |
| MeditationPreview marks Rain and Ocean as active | unit | Verify active styling class on first 2 tiles |
| PrayerWallPreview renders 3 prayer cards | unit | Verify Sarah M., David K., Rachel P. |
| PrayerWallPreview renders prayer counts | unit | Verify "12", "8", "15" text |
| GrowthPreview renders SVG garden | unit | Verify SVG element with `aria-hidden="true"` |
| GrowthPreview renders stat rows | unit | Verify "14-day streak" and "Day 5 of 21" |

**Expected state after completion:**
- [x] All 5 preview components exist in `previews/` directory
- [x] Each renders a self-contained mockup card
- [x] Build passes

---

### Step 5: Create FeatureShowcaseTabs Component

**Objective:** Build the tab bar with ARIA tablist pattern, keyboard navigation, responsive layout (icon-only on mobile, icon+label on sm+).

**Files to create/modify:**
- `frontend/src/components/homepage/FeatureShowcaseTabs.tsx` — CREATE

**Details:**

```tsx
import { cn } from '@/lib/utils'
import type { FeatureTab } from '@/constants/feature-showcase'

interface FeatureShowcaseTabsProps {
  tabs: FeatureTab[]
  activeTab: string
  onTabChange: (tabId: string) => void
}
```

**Tab bar container:**
- `role="tablist"`, `aria-label="Feature previews"`
- Desktop/tablet: `flex justify-center gap-2 flex-wrap`
- Mobile: `flex gap-2 overflow-x-auto scrollbar-hide flex-nowrap px-4 sm:px-0 sm:flex-wrap sm:justify-center`

**Individual tabs:**
- `role="tab"`, `aria-selected={isActive}`, `aria-controls={`panel-${tab.id}`}`, `id={`tab-${tab.id}`}`
- `tabIndex={isActive ? 0 : -1}` (roving tabindex)
- `<button>` element
- Classes: `flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition-all duration-200 whitespace-nowrap`
- Active: `text-white bg-white/[0.1] border-white/[0.15] shadow-[0_0_20px_rgba(139,92,246,0.15)]`
- Inactive: `text-white/50 bg-transparent border-white/[0.06] hover:text-white/70 hover:bg-white/[0.05]`
- Icon: `<tab.icon className="w-4 h-4 shrink-0" />`
- Label: `<span className="hidden sm:inline">{tab.label}</span>` (hidden on mobile)
- Mobile icon-only: `aria-label={tab.label}` on the button so screen readers still get the label

**Keyboard navigation:**
- `onKeyDown` handler on the tablist container
- `ArrowRight` / `ArrowLeft`: move to next/previous tab (wrap around)
- Automatic activation: changing focus also activates the tab (simpler UX)
- Use `refs` array to manage focus: `tabRefs.current[nextIndex]?.focus()`

**Implementation pattern for keyboard nav:**
```tsx
const tabRefs = useRef<(HTMLButtonElement | null)[]>([])

function handleKeyDown(e: React.KeyboardEvent) {
  const currentIndex = tabs.findIndex(t => t.id === activeTab)
  let nextIndex = currentIndex

  if (e.key === 'ArrowRight') {
    nextIndex = (currentIndex + 1) % tabs.length
  } else if (e.key === 'ArrowLeft') {
    nextIndex = (currentIndex - 1 + tabs.length) % tabs.length
  } else {
    return
  }

  e.preventDefault()
  onTabChange(tabs[nextIndex].id)
  tabRefs.current[nextIndex]?.focus()
}
```

**Auth gating:** N/A

**Responsive behavior:**
- Desktop (> 1024px): Icon + label pills, centered row with wrap
- Tablet (640-1024px): Icon + label pills, centered row with wrap
- Mobile (< 640px): Icon-only pills, horizontally scrollable, `scrollbar-hide`, `flex-nowrap`

**Guardrails (DO NOT):**
- DO NOT use `<div>` for tabs — use `<button>` for keyboard accessibility
- DO NOT use `role="button"` on anything — native `<button>` already has implicit role
- DO NOT omit `aria-label` on mobile icon-only buttons — screen readers need it
- DO NOT use `onClick` + `onKeyDown` separately for Enter/Space — `<button>` handles this natively
- DO NOT add auto-cycling — spec says "Tabs only change on user click"

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Renders 5 tab buttons with correct labels | unit | Verify 5 tabs in tablist |
| Active tab has aria-selected="true" | unit | Verify first tab is selected by default |
| Clicking tab calls onTabChange | unit | Click second tab, verify callback with "prayer" |
| Arrow keys navigate tabs | unit | Focus tab 1, press ArrowRight, verify tab 2 activated |
| Arrow keys wrap around | unit | Focus last tab, press ArrowRight, verify first tab activated |
| Inactive tabs have tabIndex -1 | unit | Verify roving tabindex pattern |
| Tab labels hidden on mobile (sm:inline) | unit | Verify `hidden sm:inline` class on label spans |
| Active tab has glow shadow class | unit | Verify active tab has `shadow-[0_0_20px_rgba(139,92,246,0.15)]` |

**Expected state after completion:**
- [x] `FeatureShowcaseTabs.tsx` renders accessible tablist with 5 tabs
- [x] Keyboard navigation works (arrow keys, wrapping)
- [x] Responsive: icon-only on mobile, icon+label on sm+
- [x] Build passes

---

### Step 6: Create FeatureShowcasePanel Component

**Objective:** Build the preview panel wrapper with crossfade transition, two-column layout (desktop), and the shared left-column content structure.

**Files to create/modify:**
- `frontend/src/components/homepage/FeatureShowcasePanel.tsx` — CREATE

**Details:**

```tsx
import { cn } from '@/lib/utils'
import { FrostedCard } from './FrostedCard'
import { GRADIENT_TEXT_STYLE } from '@/constants/gradients'
import type { FeatureTab } from '@/constants/feature-showcase'
import { DevotionalPreview } from './previews/DevotionalPreview'
import { PrayerPreview } from './previews/PrayerPreview'
import { MeditationPreview } from './previews/MeditationPreview'
import { PrayerWallPreview } from './previews/PrayerWallPreview'
import { GrowthPreview } from './previews/GrowthPreview'

interface FeatureShowcasePanelProps {
  tabs: FeatureTab[]
  activeTab: string
}

const PREVIEW_MAP: Record<string, React.ComponentType> = {
  devotional: DevotionalPreview,
  prayer: PrayerPreview,
  meditation: MeditationPreview,
  'prayer-wall': PrayerWallPreview,
  growth: GrowthPreview,
}
```

**Panel structure:**

Mount all tab panels, show only the active one via opacity transition.

```tsx
<FrostedCard className="p-0 overflow-hidden min-h-[280px] sm:min-h-[320px] lg:min-h-[400px]">
  {tabs.map((tab) => {
    const isActive = tab.id === activeTab
    const Preview = PREVIEW_MAP[tab.id]
    return (
      <div
        key={tab.id}
        role="tabpanel"
        id={`panel-${tab.id}`}
        aria-labelledby={`tab-${tab.id}`}
        className={cn(
          'transition-opacity duration-200 ease-out',
          isActive
            ? 'opacity-100 relative'
            : 'opacity-0 pointer-events-none absolute inset-0'
        )}
        {...(!isActive && { 'aria-hidden': true, tabIndex: -1 })}
      >
        <div className="p-6 sm:p-8 grid gap-6 lg:gap-8 lg:grid-cols-2 items-center">
          {/* Left column: text content */}
          <div className="space-y-4">
            <h3 className="text-xl sm:text-2xl font-bold" style={GRADIENT_TEXT_STYLE}>
              {tab.title}
            </h3>
            <p className="text-white/60 text-sm sm:text-base leading-relaxed">
              {tab.description}
            </p>
            <ul className="space-y-2">
              {tab.highlights.map((highlight) => (
                <li key={highlight} className="flex items-start gap-2 text-white/50 text-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5 shrink-0" aria-hidden="true" />
                  {highlight}
                </li>
              ))}
            </ul>
          </div>

          {/* Right column: mockup preview */}
          <div>
            {Preview && <Preview />}
          </div>
        </div>
      </div>
    )
  })}
</FrostedCard>
```

**Transition approach:**
- Active panel: `opacity-100 relative` — visible, in normal flow, takes up space
- Inactive panels: `opacity-0 pointer-events-none absolute inset-0` — invisible, overlaid, no interaction
- `transition-opacity duration-200 ease-out` on all panels
- The 150ms out / 200ms in timing from the spec is approximated with a single `duration-200` — the visual effect is equivalent since inactive panels fade while the active one fades in simultaneously
- Under `prefers-reduced-motion`: The scroll-reveal reduced-motion CSS block already handles `transition: none`. For the panel, add `motion-reduce:transition-none` to skip the crossfade.

**Auth gating:** N/A

**Responsive behavior:**
- Desktop (> 1024px): Two-column grid (`lg:grid-cols-2`), text left, mockup right. Min height `400px`.
- Tablet (640-1024px): Single column, text above mockup. Min height `320px`. Padding `p-8`.
- Mobile (< 640px): Single column. Min height `280px`. Padding `p-6`.

**Guardrails (DO NOT):**
- DO NOT mount/unmount panels — use opacity show/hide to preserve DOM and avoid flash
- DO NOT use `dangerouslySetInnerHTML` for any content
- DO NOT use `display: none` — it breaks accessibility (screen readers skip `display:none` elements)
- DO NOT add interactive elements to the left column — it's informational only

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Renders tabpanel for active tab | unit | Verify panel with `role="tabpanel"` for active tab is visible |
| Active panel has title with gradient style | unit | Verify h3 with `GRADIENT_TEXT_STYLE` |
| Active panel renders highlight bullets | unit | Verify 3 bullet items for first tab |
| Inactive panels have aria-hidden | unit | Verify inactive panels have `aria-hidden="true"` |
| Renders correct preview component for each tab | unit | Switch tabs, verify unique mockup content appears |
| FrostedCard wrapper has p-0 override | unit | Verify `p-0` class on outer card |

**Expected state after completion:**
- [x] `FeatureShowcasePanel.tsx` renders all 5 panels with crossfade transition
- [x] Left column shows title (gradient), description, bullet highlights
- [x] Right column renders the corresponding preview component
- [x] Build passes

---

### Step 7: Create FeatureShowcase Section, Update Barrel, Integrate into Home.tsx

**Objective:** Build the main section component that orchestrates GlowBackground, SectionHeading, tabs, and panel with scroll reveal. Wire it into Home.tsx.

**Files to create/modify:**
- `frontend/src/components/homepage/FeatureShowcase.tsx` — CREATE
- `frontend/src/components/homepage/index.ts` — MODIFY (add export)
- `frontend/src/pages/Home.tsx` — MODIFY (add FeatureShowcase between HeroSection and GrowthTeasersSection)

**Details:**

**`FeatureShowcase.tsx`:**

```tsx
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { GlowBackground } from './GlowBackground'
import { SectionHeading } from './SectionHeading'
import { FeatureShowcaseTabs } from './FeatureShowcaseTabs'
import { FeatureShowcasePanel } from './FeatureShowcasePanel'
import { FEATURE_TABS } from '@/constants/feature-showcase'
import { useScrollReveal, staggerDelay } from '@/hooks/useScrollReveal'

export function FeatureShowcase() {
  const [activeTab, setActiveTab] = useState(FEATURE_TABS[0].id)
  const { ref, isVisible } = useScrollReveal()

  return (
    <GlowBackground variant="split">
      <section
        ref={ref as React.RefObject<HTMLElement>}
        aria-label="Feature previews"
        className="py-16 sm:py-20 lg:py-24 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto"
      >
        {/* Heading */}
        <div
          className={cn('scroll-reveal', isVisible && 'is-visible')}
          style={staggerDelay(0, 200)}
        >
          <SectionHeading
            heading="Experience Worship Room"
            tagline="Everything you need for your spiritual journey — in one place."
          />
        </div>

        {/* Tab bar */}
        <div
          className={cn('scroll-reveal mt-10', isVisible && 'is-visible')}
          style={staggerDelay(1, 200)}
        >
          <FeatureShowcaseTabs
            tabs={FEATURE_TABS}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        </div>

        {/* Preview panel */}
        <div
          className={cn('scroll-reveal mt-8', isVisible && 'is-visible')}
          style={staggerDelay(2, 200)}
        >
          <FeatureShowcasePanel
            tabs={FEATURE_TABS}
            activeTab={activeTab}
          />
        </div>
      </section>
    </GlowBackground>
  )
}
```

- Section spacing: `py-16 sm:py-20 lg:py-24` (64/80/96px vertical padding)
- Max width: `max-w-6xl mx-auto` (matches nav max width of 1152px)
- Scroll reveal: heading at 0ms delay, tabs at 200ms, panel at 400ms (via `staggerDelay(0|1|2, 200)`)

**`index.ts` update:**

Add `export { FeatureShowcase } from './FeatureShowcase'` to barrel.

**`Home.tsx` update:**

```tsx
import { FeatureShowcase } from '@/components/homepage'
// ... existing imports

// In JSX, replace the HP-2 placeholder comment:
<HeroSection />
{/* === Homepage Redesign Sections === */}
<FeatureShowcase />
{/* HP-3: StatsBar */}
// ... rest of comments
```

**Auth gating:** N/A

**Responsive behavior:**
- Desktop (> 1024px): `py-24 px-8`, max-w-6xl centered
- Tablet (640-1024px): `py-20 px-6`
- Mobile (< 640px): `py-16 px-4`

**Guardrails (DO NOT):**
- DO NOT remove any other HP placeholder comments — only replace the HP-2 comment
- DO NOT modify `HeroSection.tsx` or `GrowthTeasersSection.tsx`
- DO NOT remove the `useRoutePreload`, `SEO`, or `DevAuthToggle` from Home.tsx
- DO NOT add any new providers or context
- DO NOT change the `bg-neutral-bg` on Home.tsx wrapper div — the seamless flow comes from `GlowBackground`'s own `bg-hero-bg` matching `HeroSection`'s background
- DO NOT pass `ref` to `<section>` without casting — `useScrollReveal` returns `RefObject<HTMLElement | null>`, cast with `as React.RefObject<HTMLElement>`

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| (Covered in Step 9) | — | — |

**Expected state after completion:**
- [x] `FeatureShowcase.tsx` renders the full section with GlowBackground, heading, tabs, panel
- [x] `index.ts` exports all 4 homepage components
- [x] `Home.tsx` renders FeatureShowcase between HeroSection and GrowthTeasersSection
- [x] Seamless visual flow between HeroSection → FeatureShowcase → GrowthTeasersSection
- [x] Build passes

---

### Step 8: Tests for Preview Components

**Objective:** Write unit tests for all 5 preview mockup components.

**Files to create/modify:**
- `frontend/src/components/homepage/__tests__/DevotionalPreview.test.tsx` — CREATE
- `frontend/src/components/homepage/__tests__/PrayerPreview.test.tsx` — CREATE
- `frontend/src/components/homepage/__tests__/MeditationPreview.test.tsx` — CREATE
- `frontend/src/components/homepage/__tests__/PrayerWallPreview.test.tsx` — CREATE
- `frontend/src/components/homepage/__tests__/GrowthPreview.test.tsx` — CREATE

**Details:**

Follow the pattern from `FrostedCard.test.tsx` and `SectionHeading.test.tsx` — simple `render(<Component />)`, no providers needed. All tests use `@testing-library/react` + `vitest`.

**DevotionalPreview tests (3):**
1. Renders date "April 2, 2026"
2. Renders quote with `font-script` class
3. Renders pill buttons as non-interactive spans (query by text, verify no `role="button"`)

**PrayerPreview tests (4):**
1. Renders input text "I'm feeling anxious about the future..."
2. Has `border-pulse-glow` class on outer container
3. Renders visible prayer words at `text-white/90` opacity
4. Renders 3 waveform bar divs

**MeditationPreview tests (3):**
1. Renders 6 sound tile labels (Rain, Ocean, Forest, Fireplace, Night, Stream)
2. Rain and Ocean tiles have active styling (`border-purple-500/30`)
3. Renders 2 volume bars

**PrayerWallPreview tests (3):**
1. Renders 3 names (Sarah M., David K., Rachel P.)
2. Renders prayer counts (12, 8, 15)
3. Renders "Pray for someone" pill

**GrowthPreview tests (2):**
1. Renders SVG with `aria-hidden="true"`
2. Renders stat text "14-day streak" and "Day 5 of 21"

**Auth gating:** N/A

**Responsive behavior:** N/A: no UI impact (tests)

**Guardrails (DO NOT):**
- DO NOT wrap in MemoryRouter or providers — these are pure presentation components
- DO NOT snapshot test — prefer explicit assertions on rendered content
- DO NOT test CSS computed styles — test class names and DOM structure

**Test specifications:**
(Self-referential — this step IS the tests)

**Expected state after completion:**
- [x] 15 tests across 5 test files, all passing
- [x] All preview components have test coverage
- [x] Build passes

---

### Step 9: Tests for FeatureShowcaseTabs, FeatureShowcasePanel, FeatureShowcase, and Home Integration

**Objective:** Write tests for the tab bar, panel, main section, and Home.tsx integration.

**Files to create/modify:**
- `frontend/src/components/homepage/__tests__/FeatureShowcaseTabs.test.tsx` — CREATE
- `frontend/src/components/homepage/__tests__/FeatureShowcasePanel.test.tsx` — CREATE
- `frontend/src/components/homepage/__tests__/FeatureShowcase.test.tsx` — CREATE

**Details:**

**FeatureShowcaseTabs tests (8):**
1. Renders tablist with 5 tabs — `screen.getByRole('tablist')`, verify 5 `role="tab"` buttons
2. First tab has `aria-selected="true"` by default
3. Clicking a tab calls `onTabChange` with correct ID
4. ArrowRight moves to next tab
5. ArrowLeft wraps from first to last tab
6. Active tab has `tabIndex={0}`, inactive have `tabIndex={-1}`
7. Tab labels have `hidden sm:inline` class (hidden on mobile)
8. Active tab has purple glow shadow class

Test setup: Render with props `tabs={FEATURE_TABS}`, `activeTab="devotional"`, `onTabChange={vi.fn()}`.

**FeatureShowcasePanel tests (5):**
1. Renders active tab panel content (title, description)
2. Active panel has `opacity-100` class
3. Inactive panels have `aria-hidden="true"`
4. Renders correct preview component for active tab (e.g., "April 2, 2026" for devotional)
5. Switching `activeTab` prop changes visible content

**FeatureShowcase tests (6):**
1. Renders section heading "Experience Worship Room"
2. Renders tagline text
3. Renders 5 tab buttons
4. Default tab is "Daily Devotional" (first tab)
5. Clicking a tab changes preview content — click "AI Prayer", verify "Prayers That Know Your Heart"
6. Uses GlowBackground wrapper — verify `bg-hero-bg` class exists on ancestor

Wrap in `MemoryRouter` (FeatureShowcase doesn't need it directly, but if any child does through transitive dependency, better safe):

Actually, FeatureShowcase is pure presentation — no router links, no auth. Simple `render(<FeatureShowcase />)` is sufficient. If `useScrollReveal` needs IntersectionObserver, mock it:

```tsx
beforeEach(() => {
  const mockObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }))
  vi.stubGlobal('IntersectionObserver', mockObserver)
})
```

This pattern is used in `useScrollReveal.test.tsx` already. The component test can use it similarly, or just verify the DOM renders correctly (IntersectionObserver won't fire in test, so `isVisible` starts `false` unless reduced-motion is mocked).

For simpler testing, mock `useScrollReveal` to return `isVisible: true`:

```tsx
vi.mock('@/hooks/useScrollReveal', () => ({
  useScrollReveal: () => ({ ref: { current: null }, isVisible: true }),
  staggerDelay: (i: number, base: number) => ({ transitionDelay: `${i * base}ms` }),
}))
```

**Home.tsx integration test update:**

The existing `Home.test.tsx` (from HP-1) verifies HeroSection renders and JourneySection doesn't. Add one assertion:

- `FeatureShowcase renders on homepage` — verify "Experience Worship Room" heading is present

This test needs `MemoryRouter` wrapping (Home uses `useNavigate` via HeroSection). Follow existing pattern from `Home.test.tsx`. Rather than creating a new file, add to the existing `Home.test.tsx`.

So update: `frontend/src/pages/__tests__/Home.test.tsx` — MODIFY (add 1 test)

**Auth gating:** N/A

**Responsive behavior:** N/A: no UI impact (tests)

**Guardrails (DO NOT):**
- DO NOT test CSS animation timing — it's not observable in JSDOM
- DO NOT snapshot test — prefer explicit assertions
- DO NOT import `IntersectionObserver` polyfill — use `vi.stubGlobal` mock
- DO NOT forget to mock `useScrollReveal` for component tests — JSDOM has no real IntersectionObserver

**Test specifications:**
(Self-referential — this step IS the tests)

**Expected state after completion:**
- [x] 19+ tests across 3 new test files + 1 modified test file
- [x] All FeatureShowcase components have test coverage
- [x] Home.tsx integration test verifies FeatureShowcase renders
- [x] All existing tests still pass
- [x] Build passes with 0 errors and 0 warnings

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Add CSS keyframes for border pulse glow |
| 2 | — | Create tab data constant and types |
| 3 | 1 | Create DevotionalPreview + PrayerPreview (PrayerPreview uses `border-pulse-glow`) |
| 4 | — | Create MeditationPreview + PrayerWallPreview + GrowthPreview |
| 5 | 2 | Create FeatureShowcaseTabs (needs `FeatureTab` type) |
| 6 | 2, 3, 4 | Create FeatureShowcasePanel (needs types + all preview components) |
| 7 | 5, 6 | Create FeatureShowcase, update barrel, integrate into Home.tsx |
| 8 | 3, 4 | Tests for preview components |
| 9 | 5, 6, 7 | Tests for tabs, panel, section, Home integration |

**Parallelizable:** Steps 1, 2, 4 can execute in parallel. Steps 3, 5 can execute in parallel (after their deps). Step 8 can start as soon as all previews are built.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Add CSS Keyframes for Border Pulse | [COMPLETE] | 2026-04-02 | `frontend/src/index.css` — added `.border-pulse-glow` + `@keyframes` in `@layer utilities`, reduced-motion override |
| 2 | Create Tab Data Constant | [COMPLETE] | 2026-04-02 | `frontend/src/constants/feature-showcase.ts` — created with `FeatureTab` interface + `FEATURE_TABS` array |
| 3 | Create DevotionalPreview + PrayerPreview | [COMPLETE] | 2026-04-02 | `frontend/src/components/homepage/previews/DevotionalPreview.tsx`, `PrayerPreview.tsx` — created as planned |
| 4 | Create MeditationPreview + PrayerWallPreview + GrowthPreview | [COMPLETE] | 2026-04-02 | `frontend/src/components/homepage/previews/MeditationPreview.tsx`, `PrayerWallPreview.tsx`, `GrowthPreview.tsx` — created as planned |
| 5 | Create FeatureShowcaseTabs | [COMPLETE] | 2026-04-02 | `frontend/src/components/homepage/FeatureShowcaseTabs.tsx` — ARIA tablist, keyboard nav, roving tabindex, responsive icon-only mobile |
| 6 | Create FeatureShowcasePanel | [COMPLETE] | 2026-04-02 | `frontend/src/components/homepage/FeatureShowcasePanel.tsx` — mount-all-hide-inactive, crossfade, two-column layout, `motion-reduce:transition-none` added |
| 7 | Create FeatureShowcase + Barrel + Home Integration | [COMPLETE] | 2026-04-02 | `FeatureShowcase.tsx` created, `index.ts` updated, `Home.tsx` updated — HP-2 comment replaced with `<FeatureShowcase />` |
| 8 | Tests — Preview Components | [COMPLETE] | 2026-04-02 | 5 test files, 15 tests — all passing |
| 9 | Tests — Tabs, Panel, Section, Home Integration | [COMPLETE] | 2026-04-02 | 3 new test files + 1 modified (Home.test.tsx), 19 new tests — all passing. Panel test deviated: used `container.querySelector('#panel-devotional')` instead of `getByRole('tabpanel', { name })` since `aria-labelledby` accessible name wasn't resolved in jsdom |
