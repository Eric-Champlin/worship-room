# Implementation Plan: Homepage Dashboard Preview (HP-6)

**Spec:** `_specs/hp-6-dashboard-preview.md`
**Date:** 2026-04-02
**Branch:** `homepage-redesign`
**Design System Reference:** `_plans/recon/design-system.md` (loaded)
**Recon Report:** not applicable
**Master Spec Plan:** not applicable (standalone homepage redesign section, part of HP-1 through HP-7 series)

---

## Architecture Context

### Project Structure

- Homepage components live in `frontend/src/components/homepage/`
- Landing page is `frontend/src/pages/Home.tsx` — renders `HeroSection`, `FeatureShowcase`, `StatsBar`, `PillarSection`, `DifferentiatorSection`, then `GrowthTeasersSection` (to be replaced), then `StartingPointQuiz`
- Barrel export at `frontend/src/components/homepage/index.ts` — must add `DashboardPreview`
- The existing `GrowthTeasersSection.tsx` lives at `frontend/src/components/GrowthTeasersSection.tsx` (243 lines) with tests at `frontend/src/components/__tests__/GrowthTeasersSection.test.tsx` (83 lines)

### Existing Foundation Components (from HP-1)

- **`GlowBackground`** (`components/homepage/GlowBackground.tsx`) — wraps content in `bg-hero-bg` (#08051A) with animated radial glow orbs. Accepts `variant: 'center' | 'left' | 'right' | 'split' | 'none'`. Spec says use `variant="center"`.
- **`SectionHeading`** (`components/homepage/SectionHeading.tsx`) — `<h2>` with `GRADIENT_TEXT_STYLE` (white-to-purple gradient text via `linear-gradient(223deg, #FFFFFF 0%, #8B5CF6 100%)`). Optional `tagline` in `text-white/60`. `align` prop (center default).
- **`FrostedCard`** (`components/homepage/FrostedCard.tsx`) — `bg-white/[0.05] backdrop-blur-sm border border-white/[0.08] rounded-2xl p-6`. When no `onClick` prop: no hover lift, no cursor pointer. Supports `className` and `as` props.

### Scroll Reveal Pattern

- **`useScrollReveal`** (`hooks/useScrollReveal.ts`) — Returns `{ ref, isVisible }`. Uses IntersectionObserver. Respects `prefers-reduced-motion` (returns `isVisible: true` immediately).
- **`staggerDelay`** (`hooks/useScrollReveal.ts`) — Returns `{ transitionDelay: '${initialDelay + index * baseDelay}ms' }`.
- **CSS classes** (`index.css`): `.scroll-reveal` = `opacity: 0; transform: translateY(12px); transition: 600ms ease-out`. `.scroll-reveal.is-visible` = `opacity: 1; transform: translateY(0)`. `prefers-reduced-motion` disables all transitions.

### Gradient Text

- **`GRADIENT_TEXT_STYLE`** (`constants/gradients.tsx`) — `CSSProperties` object: `color: 'white', backgroundImage: 'linear-gradient(223deg, #FFFFFF 0%, #8B5CF6 100%)'`, `WebkitBackgroundClip: 'text'`, `WebkitTextFillColor: 'transparent'`, `backgroundClip: 'text'`.
- **`WHITE_PURPLE_GRADIENT`** (`constants/gradients.tsx`) — `'linear-gradient(223deg, #FFFFFF 0%, #8B5CF6 100%)'` string for CTA buttons.

### Auth Modal Pattern

```typescript
import { useAuthModal } from '@/components/prayer-wall/AuthModalProvider'
const authModal = useAuthModal()
authModal?.openAuthModal(undefined, 'register')
```

### Section Pattern (from DifferentiatorSection / PillarSection)

```tsx
<GlowBackground variant="center">
  <section aria-label="...">
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
      <SectionHeading heading="..." tagline="..." />
      {/* content */}
    </div>
  </section>
</GlowBackground>
```

### Test Patterns

- HP components in `components/homepage/__tests__/` use `@testing-library/react` + `vitest`
- Mock `useScrollReveal`:
  ```ts
  vi.mock('@/hooks/useScrollReveal', () => ({
    useScrollReveal: () => ({ ref: { current: null }, isVisible: true }),
    staggerDelay: (i: number, base = 100, initial = 0) => ({
      transitionDelay: `${initial + i * base}ms`,
    }),
  }))
  ```
- DifferentiatorSection tests: NO `MemoryRouter` or auth providers needed for display-only components
- GrowthTeasersSection tests: DOES wrap with `MemoryRouter`, `ToastProvider`, `AuthModalProvider` because it has auth modal interaction
- Pattern: `screen.getByRole('heading')`, `screen.getByText()`, `screen.getByRole('region')`, `container.querySelectorAll()` for structural queries

### Icon Availability (Verified)

All 7 Lucide icons confirmed available in `lucide-react@^0.356.0`:
- `BarChart3` ✅, `Flame` ✅, `Sprout` ✅, `CheckSquare` ✅, `Users` ✅, `Moon` ✅, `Lock` ✅

---

## Auth Gating Checklist

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Click "Get Started" CTA | Opens auth modal (logged-out only) | Step 3 | `useAuthModal().openAuthModal(undefined, 'register')` |

Note: The 6 preview cards are NOT interactive — no auth gating needed on cards. The entire section is only visible to logged-out users (Home.tsx renders for unauthenticated users).

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Section background | `bg-hero-bg` | `#08051A` | tailwind.config.js:22 |
| SectionHeading gradient | `backgroundImage` | `linear-gradient(223deg, #FFFFFF 0%, #8B5CF6 100%)` | constants/gradients.tsx |
| FrostedCard bg | `background` | `bg-white/[0.05]` | FrostedCard.tsx |
| FrostedCard border | `border` | `border-white/[0.08]` | FrostedCard.tsx |
| FrostedCard border-radius | `border-radius` | `rounded-2xl` | FrostedCard.tsx |
| Card header icon+title text | `color` | `text-white/70` (title), icon per-card color | design-system.md WCAG |
| Card preview content text | `color` | `text-white/60` (secondary) | design-system.md WCAG |
| Lock overlay bg | `backdrop-blur` | `backdrop-blur-[3px]` + `bg-hero-bg/60` | spec: subtle blur |
| Lock overlay text | `color` | `text-white/50` | design-system.md (interactive text) |
| CTA button | `background` | `WHITE_PURPLE_GRADIENT` | constants/gradients.tsx |
| CTA button text | `color` | `text-hero-bg` (`#08051A`) | GrowthTeasersSection pattern |
| CTA button shape | `border-radius` | `rounded-full` | GrowthTeasersSection pattern |
| Section padding | `py` | `py-20 sm:py-28` | spec + PillarSection pattern |
| Container | `max-width` | `max-w-6xl mx-auto px-4 sm:px-6` | spec |
| Heading tagline | `color` | `text-white/60` | SectionHeading.tsx |
| Mood heatmap empty | `bg` | `bg-white/[0.04]` | spec |
| Mood heatmap low | `bg` | `bg-purple-900/40` | spec |
| Mood heatmap medium | `bg` | `bg-purple-600/40` | spec |
| Mood heatmap high | `bg` | `bg-purple-400/50` | spec |
| Mood heatmap peak | `bg` | `bg-purple-300/60` | spec |

---

## Design System Reminder

**Project-specific quirks that `/execute-plan` displays before every UI step:**

- `bg-hero-bg` is `#08051A`, NOT `#0D0620` (`bg-hero-dark`). These are different colors. All homepage sections use `bg-hero-bg`.
- Use `font-script` (Caveat) for script/highlighted headings, NOT `font-serif` (Lora). Lora is for scripture text only.
- `GRADIENT_TEXT_STYLE` is the single source of truth in `constants/gradients.tsx` — never recreate inline.
- FrostedCard uses `bg-white/[0.05]` with bracket syntax, NOT `bg-white/5`. Same for border: `border-white/[0.08]`.
- Text opacity standards: Primary: `text-white/70`, Secondary: `text-white/60`, Interactive: `text-white/50`, Decorative: `text-white/20` to `text-white/40`.
- All animations gated behind `prefers-reduced-motion` using `motion-reduce:` prefix or the CSS media query in `index.css`.
- `SectionHeading` component handles gradient text rendering — use it rather than recreating inline.
- CTA buttons on homepage use `WHITE_PURPLE_GRADIENT` background with `text-hero-bg` (dark text on gradient).
- Card content area is `aria-hidden="true"` since it's decorative preview data.
- No `onClick` on FrostedCard = no hover lift, no cursor-pointer.
- Scroll reveal uses `useScrollReveal` + CSS `.scroll-reveal`/`.is-visible` classes, NOT `useInView` (the older GrowthTeasersSection pattern).

---

## Shared Data Models (from Master Plan)

Not applicable — no shared data models. All preview content is static/hardcoded.

**localStorage keys this spec touches:** None.

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | < 640px | `grid-cols-1 gap-5`, CTA button full-width (`w-full sm:w-auto`), heatmap circles `w-3 h-3` |
| Tablet | 640px–1024px | `grid-cols-2 gap-6`, 3 rows of 2 cards |
| Desktop | > 1024px | `grid-cols-3 gap-6`, 2 rows of 3 cards |

Card heights: `min-h-[140px] sm:min-h-[160px]` for uniform sizing across the grid.

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| DifferentiatorSection → DashboardPreview | 0px (sections butt against each other, both wrapped in GlowBackground with internal py-20/28) | codebase inspection: PillarSection → DifferentiatorSection pattern |
| DashboardPreview → StartingPointQuiz | 0px (same pattern) | codebase inspection |
| Section heading → card grid | `mt-12 sm:mt-16` (48px / 64px) | GrowthTeasersSection pattern |
| Card grid → CTA | `mt-12 sm:mt-16` (48px / 64px) | GrowthTeasersSection pattern |

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] On `homepage-redesign` branch with HP-5 committed
- [ ] `GrowthTeasersSection.tsx` still exists at `frontend/src/components/GrowthTeasersSection.tsx` (243 lines)
- [ ] `GrowthTeasersSection.test.tsx` still exists at `frontend/src/components/__tests__/GrowthTeasersSection.test.tsx`
- [ ] All auth-gated actions from the spec are accounted for in the plan (1 action: CTA button)
- [ ] Design system values are verified from codebase inspection and design-system.md
- [ ] No [UNVERIFIED] values (all values sourced from spec, design-system.md, or codebase)
- [ ] HP-5 (DifferentiatorSection) is complete and committed

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Deterministic heatmap values | Use seed-based approach: `(row * 7 + col * 13 + 42) % 5` mapping to 5 color levels | Spec requires deterministic (no Math.random), produces varied but reproducible pattern |
| Card header outside lock overlay | Card structure: header (icon+title) on top, then relative container for preview content + absolute lock overlay | Spec explicitly requires headers NOT covered by lock overlay |
| Lock overlay blur amount | `backdrop-blur-[3px]` | Spec says "subtle blur" — 3px makes content visible but clearly locked. Standard backdrop-blur-sm is 4px which is close but spec says `[3px]` explicitly |
| Simplified garden SVG | Inline SVG: ground arc, stem, 4 leaves, small sun (< 25 lines) | Spec says 20-30 lines max, NOT the real 765-line GrowthGarden |
| Scroll reveal approach | Use `useScrollReveal` + CSS classes (HP-2+ pattern) | Consistent with FeatureShowcase, PillarSection, DifferentiatorSection. GrowthTeasersSection used older `useInView` pattern. |
| CTA "Get Started" vs "Create a Free Account" | "Get Started" per spec | Spec explicitly says "Get Started" button, different from old GrowthTeasers "Create a Free Account" |
| Friend avatar colors | Purple (`bg-purple-500`), green (`bg-emerald-500`), amber (`bg-amber-500`) | Spec says "purple avatar, green avatar, amber avatar" for the 3 friends |

---

## Implementation Steps

### Step 1: Dashboard Preview Data File

**Objective:** Create the static data for the 6 preview cards — types and card metadata.

**Files to create/modify:**
- `frontend/src/components/homepage/dashboard-preview-data.ts` — new file

**Details:**

Define a `PreviewCard` interface and export a `PREVIEW_CARDS` array:

```typescript
import type { LucideIcon } from 'lucide-react'
import { BarChart3, Flame, Sprout, CheckSquare, Users, Moon } from 'lucide-react'

export interface PreviewCard {
  id: string
  icon: LucideIcon
  title: string
}

export const PREVIEW_CARDS: PreviewCard[] = [
  { id: 'mood', icon: BarChart3, title: 'Mood Insights' },
  { id: 'streak', icon: Flame, title: 'Streak & Faith Points' },
  { id: 'garden', icon: Sprout, title: 'Growth Garden' },
  { id: 'practices', icon: CheckSquare, title: "Today's Practices" },
  { id: 'friends', icon: Users, title: 'Friends' },
  { id: 'evening', icon: Moon, title: 'Evening Reflection' },
]
```

Also export the deterministic heatmap color generator:

```typescript
const HEATMAP_LEVELS = [
  'bg-white/[0.04]',      // empty
  'bg-purple-900/40',     // low
  'bg-purple-600/40',     // medium
  'bg-purple-400/50',     // high
  'bg-purple-300/60',     // peak
] as const

export function getHeatmapColor(row: number, col: number): string {
  return HEATMAP_LEVELS[(row * 7 + col * 13 + 42) % 5]
}
```

And the practices data:

```typescript
export const PRACTICES = [
  { label: 'Mood Check-in', done: true },
  { label: 'Devotional', done: true },
  { label: 'Prayer', done: false },
  { label: 'Journal', done: false },
  { label: 'Meditation', done: false },
]

export const FRIENDS = [
  { name: 'Sarah M.', color: 'bg-purple-500', streak: 12 },
  { name: 'David K.', color: 'bg-emerald-500', streak: 8 },
  { name: 'Maria L.', color: 'bg-amber-500', streak: 5 },
]
```

**Auth gating:** N/A

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT use `Math.random()` anywhere — all values must be deterministic
- DO NOT import from dashboard components or hooks — this is standalone static data
- DO NOT include descriptions on cards — spec only has icon + title in the header

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `PREVIEW_CARDS has 6 items` | unit | Verify array length |
| `each card has id, icon, and title` | unit | Loop through and check properties |
| `getHeatmapColor is deterministic` | unit | Call twice with same args, get same result |
| `getHeatmapColor returns valid class` | unit | All results are in HEATMAP_LEVELS |
| `PRACTICES has 5 items with 2 done` | unit | Verify count and done flags |
| `FRIENDS has 3 items` | unit | Verify array length |

**Expected state after completion:**
- [ ] `dashboard-preview-data.ts` exports `PREVIEW_CARDS`, `getHeatmapColor`, `PRACTICES`, `FRIENDS`
- [ ] All data is static and deterministic
- [ ] TypeScript compiles with no errors

---

### Step 2: DashboardPreview Component — Card Preview Sub-Components

**Objective:** Build the 6 individual card preview content components that render inside each card's content area.

**Files to create/modify:**
- `frontend/src/components/homepage/DashboardPreview.tsx` — new file (preview sub-components defined here, main component in Step 3)

**Details:**

Create 6 internal preview components (not exported — used only by DashboardPreview):

**MoodInsightsPreview:**
```tsx
function MoodInsightsPreview() {
  return (
    <div aria-hidden="true">
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 35 }, (_, i) => {
          const row = Math.floor(i / 7)
          const col = i % 7
          return (
            <div
              key={i}
              className={cn('h-3 w-3 rounded-sm sm:h-4 sm:w-4', getHeatmapColor(row, col))}
            />
          )
        })}
      </div>
      <p className="mt-2 text-xs text-white/40">Last 35 days</p>
    </div>
  )
}
```

5 rows × 7 columns = 35 squares. Uses `getHeatmapColor(row, col)` for deterministic colors. Circles scale: `w-3 h-3` mobile, `sm:w-4 sm:h-4` tablet+.

**StreakPreview:**
```tsx
function StreakPreview() {
  return (
    <div className="flex flex-col items-center gap-2" aria-hidden="true">
      <div className="flex items-baseline gap-2">
        <Flame className="h-6 w-6 text-amber-400" />
        <span className="text-3xl font-bold text-white">14</span>
      </div>
      <p className="text-sm text-white/50">day streak</p>
      <div className="h-2 w-full rounded-full bg-white/[0.08]">
        <div className="h-2 w-[65%] rounded-full bg-purple-500" />
      </div>
      <p className="text-xs text-white/40">Level 3 · 1,240 pts</p>
    </div>
  )
}
```

**GardenPreview:**
Simplified inline SVG — ground curve, stem with 4 leaves, small sun. Under 25 lines.

```tsx
function GardenPreview() {
  return (
    <div className="flex items-center justify-center" aria-hidden="true">
      <svg viewBox="0 0 120 80" className="h-full w-full max-h-[100px]" aria-hidden="true">
        {/* Ground */}
        <ellipse cx="60" cy="75" rx="50" ry="8" fill="rgba(34,197,94,0.15)" />
        {/* Stem */}
        <path d="M60,72 Q58,50 60,30" stroke="rgba(34,197,94,0.6)" strokeWidth="2" fill="none" />
        {/* Leaves */}
        <ellipse cx="52" cy="55" rx="8" ry="4" fill="rgba(34,197,94,0.4)" transform="rotate(-30,52,55)" />
        <ellipse cx="68" cy="48" rx="8" ry="4" fill="rgba(34,197,94,0.5)" transform="rotate(25,68,48)" />
        <ellipse cx="54" cy="40" rx="7" ry="3.5" fill="rgba(34,197,94,0.35)" transform="rotate(-20,54,40)" />
        <ellipse cx="66" cy="33" rx="7" ry="3.5" fill="rgba(34,197,94,0.45)" transform="rotate(15,66,33)" />
        {/* Sun */}
        <circle cx="95" cy="15" r="8" fill="rgba(250,204,21,0.3)" />
        <circle cx="95" cy="15" r="4" fill="rgba(250,204,21,0.5)" />
      </svg>
    </div>
  )
}
```

**PracticesPreview:**
```tsx
function PracticesPreview() {
  return (
    <div className="space-y-1.5" aria-hidden="true">
      {PRACTICES.map((p) => (
        <div key={p.label} className="flex items-center gap-2">
          <div className={cn(
            'flex h-4 w-4 items-center justify-center rounded',
            p.done ? 'bg-emerald-500/60' : 'bg-white/[0.08]'
          )}>
            {p.done && <Check className="h-3 w-3 text-white" />}
          </div>
          <span className={cn('text-xs', p.done ? 'text-white/50 line-through' : 'text-white/60')}>
            {p.label}
          </span>
        </div>
      ))}
      <p className="mt-1 text-xs text-white/40">2 of 5 complete</p>
    </div>
  )
}
```

**FriendsPreview:**
```tsx
function FriendsPreview() {
  return (
    <div className="space-y-2" aria-hidden="true">
      {FRIENDS.map((f) => (
        <div key={f.name} className="flex items-center gap-2">
          <div className={cn('flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white', f.color)}>
            {f.name[0]}
          </div>
          <span className="flex-1 text-xs text-white/60">{f.name}</span>
          <span className="text-[10px] text-white/40">🔥 {f.streak}</span>
        </div>
      ))}
      <p className="mt-1 text-xs text-white/40">3 friends praying with you</p>
    </div>
  )
}
```

**EveningReflectionPreview:**
```tsx
const STEPS = ['Mood', 'Highlights', 'Gratitude', 'Prayer']

function EveningReflectionPreview() {
  return (
    <div aria-hidden="true">
      <div className="flex items-center justify-between gap-1">
        {STEPS.map((step, i) => (
          <div key={step} className="flex flex-col items-center gap-1">
            <div className={cn(
              'h-3 w-3 rounded-full',
              i < 2 ? 'bg-purple-400' : 'bg-white/[0.08]'
            )} />
            <span className="text-[10px] text-white/40">{step}</span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-center text-xs text-white/40">Wind down your day with intention</p>
    </div>
  )
}
```

**Auth gating:** N/A — all preview content is `aria-hidden="true"` and non-interactive

**Responsive behavior:**
- Desktop (>1024px): Cards render in 3-col grid (handled in Step 3). Content renders at full size.
- Tablet (640–1024px): Cards in 2-col grid. Content same.
- Mobile (<640px): Cards stacked single column. Heatmap circles `w-3 h-3` (vs `sm:w-4 sm:h-4`).

**Guardrails (DO NOT):**
- DO NOT make any preview content interactive — no `onClick`, no buttons, no links inside previews
- DO NOT use real dashboard components (GrowthGarden, MoodChart, etc.) — these are simplified static mockups
- DO NOT use `Math.random()` — all content is deterministic
- DO NOT add `role` or `aria-label` to preview elements — they are all `aria-hidden="true"`
- DO NOT use emoji in the garden SVG — use pure SVG shapes

**Test specifications:**
Tests for preview sub-components will be covered in Step 5 as integration tests of the full DashboardPreview component.

**Expected state after completion:**
- [ ] 6 preview sub-components defined in `DashboardPreview.tsx`
- [ ] All previews use `aria-hidden="true"` on root element
- [ ] Heatmap is 5×7 grid (35 squares) with deterministic colors
- [ ] Garden SVG is under 25 lines
- [ ] TypeScript compiles with no errors

---

### Step 3: DashboardPreview Main Component

**Objective:** Build the main `DashboardPreview` section component with responsive grid, lock overlay, section heading, CTA, and scroll reveal.

**Files to create/modify:**
- `frontend/src/components/homepage/DashboardPreview.tsx` — extend the file from Step 2

**Details:**

**Lock overlay component** (internal, not exported):

```tsx
function LockOverlay() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 rounded-xl backdrop-blur-[3px] bg-[#08051A]/60">
      <Lock className="h-4 w-4 text-white/40" aria-hidden="true" />
      <span className="text-xs text-white/50">Create account to unlock</span>
    </div>
  )
}
```

Key detail: Lock overlay has `rounded-xl` (not `rounded-2xl`) because it sits inside the card's content area, not on the card itself.

**Preview content map** — maps card ID to preview component:

```typescript
const PREVIEW_MAP: Record<string, () => JSX.Element> = {
  mood: MoodInsightsPreview,
  streak: StreakPreview,
  garden: GardenPreview,
  practices: PracticesPreview,
  friends: FriendsPreview,
  evening: EveningReflectionPreview,
}
```

**Main DashboardPreview component:**

```tsx
export function DashboardPreview() {
  const authModal = useAuthModal()
  const { ref, isVisible } = useScrollReveal()

  return (
    <GlowBackground variant="center">
      <section aria-label="Dashboard preview">
        <div ref={ref as React.RefObject<HTMLDivElement>} className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          {/* Heading */}
          <div
            className={cn('scroll-reveal', isVisible && 'is-visible')}
            style={staggerDelay(0, 100, 0)}
          >
            <SectionHeading
              heading="See What's Waiting for You"
              tagline="Your personal dashboard — mood tracking, growth insights, and a garden that grows with your faith."
            />
          </div>

          {/* Card Grid */}
          <div className="mt-12 grid grid-cols-1 gap-5 sm:mt-16 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
            {PREVIEW_CARDS.map((card, index) => {
              const Preview = PREVIEW_MAP[card.id]
              const Icon = card.icon
              return (
                <div
                  key={card.id}
                  className={cn('scroll-reveal', isVisible && 'is-visible')}
                  style={staggerDelay(index, 100, 200)}
                >
                  <FrostedCard className="min-h-[140px] sm:min-h-[160px] p-0 overflow-hidden">
                    {/* Header — NOT covered by lock overlay */}
                    <div className="flex items-center gap-2 px-4 pt-4 pb-2">
                      <Icon className="h-4 w-4 text-white/50" aria-hidden="true" />
                      <h3 className="text-sm font-medium text-white/70">{card.title}</h3>
                    </div>
                    {/* Preview content area with lock overlay */}
                    <div className="relative px-4 pb-4">
                      <Preview />
                      <LockOverlay />
                    </div>
                  </FrostedCard>
                </div>
              )
            })}
          </div>

          {/* CTA */}
          <div
            className={cn('scroll-reveal mt-12 text-center sm:mt-16', isVisible && 'is-visible')}
            style={staggerDelay(0, 100, 800)}
          >
            <p className="mb-4 text-base text-white/60">
              All of this is free. All of it is yours.
            </p>
            <button
              type="button"
              onClick={() => authModal?.openAuthModal(undefined, 'register')}
              className={cn(
                'inline-flex w-full items-center justify-center rounded-full px-8 py-3 text-base font-semibold text-hero-bg sm:w-auto',
                'transition-all hover:shadow-lg hover:brightness-110',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2'
              )}
              style={{ background: WHITE_PURPLE_GRADIENT }}
            >
              Get Started
            </button>
          </div>
        </div>
      </section>
    </GlowBackground>
  )
}
```

**Imports needed at top of file:**
```typescript
import { Lock, Check, Flame } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthModal } from '@/components/prayer-wall/AuthModalProvider'
import { useScrollReveal, staggerDelay } from '@/hooks/useScrollReveal'
import { WHITE_PURPLE_GRADIENT } from '@/constants/gradients'
import { GlowBackground } from './GlowBackground'
import { SectionHeading } from './SectionHeading'
import { FrostedCard } from './FrostedCard'
import { PREVIEW_CARDS, getHeatmapColor, PRACTICES, FRIENDS } from './dashboard-preview-data'
```

**Scroll reveal timing:**
- Heading: `staggerDelay(0, 100, 0)` → 0ms
- Cards: `staggerDelay(index, 100, 200)` → 200ms, 300ms, 400ms, 500ms, 600ms, 700ms
- CTA: `staggerDelay(0, 100, 800)` → 800ms (300ms after last card, per spec "300ms after last card")

**FrostedCard override:** `className="min-h-[140px] sm:min-h-[160px] p-0 overflow-hidden"` — overrides default `p-6` padding since each card manages its own internal spacing for the header/content split.

**Auth gating:**
- CTA button calls `authModal?.openAuthModal(undefined, 'register')` on click
- Preview cards: NO auth gating (not interactive)

**Responsive behavior:**
- Desktop (>1024px): `grid-cols-3 gap-6` — 2 rows of 3 cards. CTA `sm:w-auto` (auto-width).
- Tablet (640–1024px): `grid-cols-2 gap-6` — 3 rows of 2 cards.
- Mobile (<640px): `grid-cols-1 gap-5` — 6 stacked cards. CTA `w-full` (full-width).

**Guardrails (DO NOT):**
- DO NOT add `onClick` to FrostedCard — cards are non-interactive display-only
- DO NOT add hover effects to cards
- DO NOT use `useInView` — use `useScrollReveal` for consistency with HP-2+ sections
- DO NOT use `bg-white/5` — use `bg-white/[0.05]` (bracket syntax, per FrostedCard)
- DO NOT put the lock overlay over the card header — only over the preview content area
- DO NOT use `dangerouslySetInnerHTML` anywhere
- DO NOT add font-script/Caveat to any text in this section — SectionHeading handles its own styling

**Test specifications:**
Tests covered in Step 5.

**Expected state after completion:**
- [ ] `DashboardPreview` component renders 6 cards in responsive grid
- [ ] Lock overlay covers content but NOT header on each card
- [ ] CTA button triggers auth modal
- [ ] Scroll reveal with staggered card entrance
- [ ] TypeScript compiles with no errors

---

### Step 4: Home.tsx Integration + Barrel Export + Cleanup

**Objective:** Replace `GrowthTeasersSection` with `DashboardPreview` in Home.tsx, update barrel export, delete old files.

**Files to create/modify:**
- `frontend/src/components/homepage/index.ts` — add `DashboardPreview` export
- `frontend/src/pages/Home.tsx` — replace `GrowthTeasersSection` with `DashboardPreview`
- `frontend/src/components/GrowthTeasersSection.tsx` — DELETE
- `frontend/src/components/__tests__/GrowthTeasersSection.test.tsx` — DELETE

**Details:**

**Step 4a: Verify no other imports of GrowthTeasersSection**

Run a grep for `GrowthTeasersSection` across the codebase. Expected references:
- `components/GrowthTeasersSection.tsx` (the component itself)
- `components/__tests__/GrowthTeasersSection.test.tsx` (its tests)
- `pages/Home.tsx` (the import and render)
- Possibly `09-design-system.md` or plan files (documentation only — do not modify)

If any unexpected source files import it, update them.

**Step 4b: Update barrel export** — add to `frontend/src/components/homepage/index.ts`:
```typescript
export { DashboardPreview } from './DashboardPreview'
```

**Step 4c: Update Home.tsx**

Replace:
```tsx
import { GrowthTeasersSection } from '@/components/GrowthTeasersSection'
```
With:
```tsx
// DashboardPreview is imported via the homepage barrel
```

In the homepage barrel import line, add `DashboardPreview`:
```tsx
import { FeatureShowcase, StatsBar, PillarSection, DifferentiatorSection, DashboardPreview } from '@/components/homepage'
```

Replace in JSX:
```tsx
{/* HP-6: DashboardPreview (currently GrowthTeasersSection -- will be evolved) */}
{/* HP-7: Quiz Polish + FinalCTA */}
{/* === End Homepage Redesign === */}
<GrowthTeasersSection />
```
With:
```tsx
<DashboardPreview />
{/* HP-7: Quiz Polish + FinalCTA */}
{/* === End Homepage Redesign === */}
```

**Step 4d: Delete old files**

- Delete `frontend/src/components/GrowthTeasersSection.tsx`
- Delete `frontend/src/components/__tests__/GrowthTeasersSection.test.tsx`

**Auth gating:** N/A (routing/integration step)

**Responsive behavior:** N/A: no UI impact (component handles its own responsiveness)

**Guardrails (DO NOT):**
- DO NOT remove the HP-7 placeholder comment — it's needed for the next spec
- DO NOT modify any other sections in Home.tsx
- DO NOT modify any existing component imports beyond removing GrowthTeasersSection and adding DashboardPreview
- DO NOT delete documentation references to GrowthTeasersSection in `.claude/rules/` or `_plans/` files

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Build passes | integration | `tsc --noEmit` and `pnpm build` succeed |
| No dangling imports | integration | Grep for `GrowthTeasersSection` in `src/` yields 0 results |

**Expected state after completion:**
- [ ] `GrowthTeasersSection.tsx` deleted
- [ ] `GrowthTeasersSection.test.tsx` deleted
- [ ] `Home.tsx` imports and renders `DashboardPreview` from `@/components/homepage`
- [ ] Barrel export includes `DashboardPreview`
- [ ] No dangling references to `GrowthTeasersSection` in source files
- [ ] Build and TypeScript pass with 0 errors

---

### Step 5: Tests

**Objective:** Create comprehensive test file for the data file and DashboardPreview component.

**Files to create/modify:**
- `frontend/src/components/homepage/__tests__/DashboardPreview.test.tsx` — new file

**Details:**

Follow the test pattern from `DifferentiatorSection.test.tsx`. The DashboardPreview component needs `MemoryRouter`, `ToastProvider`, and `AuthModalProvider` because it uses `useAuthModal()`.

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'
import { DashboardPreview } from '../DashboardPreview'
import { PREVIEW_CARDS, getHeatmapColor, PRACTICES, FRIENDS } from '../dashboard-preview-data'

vi.mock('@/hooks/useScrollReveal', () => ({
  useScrollReveal: () => ({ ref: { current: null }, isVisible: true }),
  staggerDelay: (i: number, base = 100, initial = 0) => ({
    transitionDelay: `${initial + i * base}ms`,
  }),
}))

function renderDashboardPreview() {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ToastProvider>
        <AuthModalProvider>
          <DashboardPreview />
        </AuthModalProvider>
      </ToastProvider>
    </MemoryRouter>
  )
}
```

**Tests to include:**

1. **Data file tests** (imported directly):
   - `PREVIEW_CARDS has 6 items` — verify length
   - `each card has id, icon, and title` — loop and check properties
   - `getHeatmapColor is deterministic` — same inputs produce same outputs across multiple calls
   - `getHeatmapColor returns valid Tailwind classes` — all results start with `bg-`
   - `PRACTICES has 5 items with exactly 2 done` — verify count and `filter(p => p.done).length === 2`
   - `FRIENDS has 3 items with name and color` — verify structure

2. **Component render tests:**
   - `renders section heading "See What's Waiting for You"` — `getByRole('heading', { name: /see what's waiting for you/i })`
   - `renders tagline` — `getByText(/your personal dashboard/i)`
   - `renders all 6 card titles` — loop through `PREVIEW_CARDS`, `getByText(card.title)`
   - `section has aria-label` — `getByRole('region', { name: /dashboard preview/i })`
   - `renders 6 lock overlays with "Create account to unlock"` — `getAllByText(/create account to unlock/i)` has length 6
   - `renders mood heatmap with 35 squares` — `container.querySelectorAll('.rounded-sm')` has length 35
   - `renders "Last 35 days" label` — `getByText(/last 35 days/i)`
   - `renders streak "14"` — `getByText('14')`
   - `renders "day streak" label` — `getByText(/day streak/i)`
   - `renders "Level 3 · 1,240 pts"` — `getByText(/level 3/i)`
   - `renders garden SVG` — `container.querySelector('svg')` within garden card exists
   - `renders 5 practice items` — check all 5 labels present
   - `renders "2 of 5 complete"` — `getByText(/2 of 5 complete/i)`
   - `renders 3 friend names` — check Sarah M., David K., Maria L.
   - `renders "3 friends praying with you"` — `getByText(/3 friends praying with you/i)`
   - `renders evening reflection 4 steps` — check Mood, Highlights, Gratitude, Prayer text
   - `renders "Wind down your day with intention"` — `getByText(/wind down your day/i)`
   - `renders CTA text "All of this is free"` — `getByText(/all of this is free/i)`
   - `renders "Get Started" button` — `getByRole('button', { name: /get started/i })`
   - `Get Started button triggers auth modal` — userEvent.click on Get Started button, verify auth modal opens (check for auth modal content)
   - `uses GlowBackground` — `container.querySelector('.bg-hero-bg')` exists
   - `cards have stagger delay styles` — check `.scroll-reveal` elements for `transitionDelay` values
   - `CTA button is full-width on mobile concept` — verify button has `w-full` class (and `sm:w-auto`)

**Auth gating test:**
- `Get Started button triggers auth modal` — click and verify modal appears

**Responsive behavior:** N/A: no UI impact (CSS grid responsiveness not tested in unit tests)

**Guardrails (DO NOT):**
- DO NOT test responsive layout via CSS grid — that's visual testing territory
- DO NOT snapshot test — use targeted assertions
- DO NOT test FrostedCard internals — that has its own test file
- DO NOT test GlowBackground internals — that has its own test file

**Test specifications:**
This IS the test step — see details above for ~24 tests.

**Expected state after completion:**
- [ ] Test file created with ~24 tests (6 data + 18 component)
- [ ] All tests pass
- [ ] All existing tests still pass (`pnpm test`)
- [ ] Build passes with 0 errors
- [ ] No test references to `GrowthTeasersSection` remain

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Dashboard preview data file (types, card metadata, heatmap, practices, friends) |
| 2 | 1 | Preview sub-components (6 card content renderers) |
| 3 | 1, 2 | Main DashboardPreview component (grid, lock overlay, CTA, scroll reveal) |
| 4 | 3 | Home.tsx integration, barrel export, GrowthTeasersSection cleanup |
| 5 | 1, 2, 3, 4 | Tests for data and component |

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Dashboard preview data file | [COMPLETE] | 2026-04-02 | Created `frontend/src/components/homepage/dashboard-preview-data.ts` with `PREVIEW_CARDS`, `getHeatmapColor`, `PRACTICES`, `FRIENDS` |
| 2 | Preview sub-components | [COMPLETE] | 2026-04-02 | 6 preview sub-components + LockOverlay + PREVIEW_MAP defined in `DashboardPreview.tsx` |
| 3 | Main DashboardPreview component | [COMPLETE] | 2026-04-02 | Main component with grid, scroll reveal, CTA in same file. Steps 2+3 combined since same file. |
| 4 | Home.tsx integration + cleanup | [COMPLETE] | 2026-04-02 | Deleted GrowthTeasersSection + test, updated Home.tsx, barrel exports. Also removed stale barrel in components/index.ts. Pre-existing workbox-window build failure unrelated. |
| 5 | Tests | [COMPLETE] | 2026-04-02 | Created `DashboardPreview.test.tsx` with 29 tests (6 data + 23 component). Fixed Home.test.tsx to reference "dashboard preview" instead of old "see how you're growing". All 5,464 tests pass. |
