# Spec: Grow Page & Challenge Detail Facelift

**Scope:** `/grow` (both tabs) and `/challenges/:id` (pre-start, active, past states)
**Outcome:** Visual parity with Daily Hub patterns, resolution of Challenge Community pre-start UX bug, WCAG AA contrast fix on category tags, full-bleed hero on challenge detail.
**Recon sources:** `_plans/recon/daily-hub-recon.json`, `_plans/recon/grow-recon.json`, `_plans/recon/grow-recon-deep.json`, `/tmp/recon-fire-pentecost-data.json`.

---

## Context

Three screenshots surfaced ~15 defects across `/grow` and `/challenges/:id`. Playwright recon on Daily Hub (reference), Grow, and the Fire of Pentecost challenge detail confirmed the root causes and captured the exact tokens needed for parity.

This spec is organized by page, not by screenshot. Each fix references the originating screenshot callout.

## Out of scope

- `font-script` removal from any hero heading **other than** GrowPage and ChallengeDetail. A separate follow-up spec will handle Settings, Insights, MonthlyReport, Friends, GrowthProfile, Routines, and PrayerWallHero as a batch.
- Refactoring the other 7 per-page tab implementations to use the new shared `<Tabs>` primitive. New component is introduced here and used on `/grow` only. Other sites migrate in future specs.
- Hero background system (`ATMOSPHERIC_HERO_BG` + themeColor overlay is the canonical inner-page pattern — preserve as-is).
- Breadcrumb placement (site-wide convention — leave alone).
- Prayer wall linkage (will be revamped separately).

---

## Prerequisites

### Files modified

| Path | Change |
|---|---|
| `frontend/src/pages/GrowPage.tsx` | Hero h1, tabs integration, Create Your Own Plan card, wrappers |
| `frontend/src/pages/ChallengeDetail.tsx` | Hero h1, CommunityFeed guard + state, countdown color logic, layout transparent prop |
| `frontend/src/components/challenges/CommunityFeed.tsx` | State-aware redesign (active / upcoming / past) |
| `frontend/src/components/challenges/ActiveChallengeCard.tsx` | Card equalization, View Details, icon color, tag contrast |
| `frontend/src/components/challenges/ChallengeCard.tsx` (Coming Up card component — verify filename) | Card equalization, icon color, tag contrast |
| `frontend/src/components/ui/Button.tsx` | New `variant="light"` |
| `frontend/src/components/Layout.tsx` | Support `transparentNav` prop |
| `frontend/src/data/challenges.ts` | Reference new category color map (see below) |

### Files created

| Path | Purpose |
|---|---|
| `frontend/src/components/ui/Tabs.tsx` | Shared tabs primitive matching Daily Hub pattern |
| `frontend/src/constants/categoryColors.ts` | Central map for Pentecost / Advent / Lent / etc. colors with WCAG AA compliant foreground |

---

# Part 1: Grow Page (`/grow`)

## 1.1 Hero heading — remove `font-script` accent

**Screenshot:** 1 (callout #1)
**Problem:** "Faith" renders in Caveat cursive via `<span className="font-script">`, clashing with the gradient Inter "Grow in". Design system doc flags Caveat-on-headings as deprecated.

### Change

**File:** `frontend/src/pages/GrowPage.tsx` (line ~96–102)

```tsx
// Before
<h1
  id="grow-heading"
  className="mb-1 px-1 sm:px-2 text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl pb-2"
  style={GRADIENT_TEXT_STYLE}
>
  Grow in <span className="font-script">Faith</span>
</h1>

// After
<h1
  id="grow-heading"
  className="mb-1 px-1 sm:px-2 text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl pb-2"
  style={GRADIENT_TEXT_STYLE}
>
  Grow in Faith
</h1>
```

### Acceptance

- Entire heading renders in Inter, gradient-clipped via `GRADIENT_TEXT_STYLE`.
- No `font-script` class anywhere in `GrowPage.tsx`.
- Visual: "Faith" matches weight, size, and gradient fade of "Grow in".

---

## 1.2 Tabs — replace with shared `<Tabs>` matching Daily Hub

**Screenshot:** 1 (callout #2)
**Problem:** `/grow` tabs use a flat `border-b` wrapper with text-color-only active state. Daily Hub uses a pill container (`bg-white/[0.06]`, `border-white/[0.12]`, `rounded-full`, `p-1`) with filled active tab (`bg-white/[0.12]`, purple halo). The two pages should feel identical.

### Step 1: Create shared component

**New file:** `frontend/src/components/ui/Tabs.tsx`

```tsx
import { type ReactNode } from 'react'
import { clsx } from 'clsx'

export interface TabItem {
  id: string
  label: string
  icon?: ReactNode
}

export interface TabsProps {
  items: TabItem[]
  activeId: string
  onChange: (id: string) => void
  ariaLabel?: string
  className?: string
}

/**
 * Shared pill-style tabs matching Daily Hub pattern.
 * - Pill container: frosted white/[0.06] with 12% border
 * - Active: filled white/[0.12] with purple halo glow
 * - Inactive: text-white/50, hover text-white/80, transparent reserved border (prevents width shift)
 */
export function Tabs({ items, activeId, onChange, ariaLabel, className }: TabsProps) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={clsx(
        'flex w-full rounded-full border border-white/[0.12] bg-white/[0.06] p-1',
        className
      )}
    >
      {items.map((item) => {
        const isActive = item.id === activeId
        return (
          <button
            key={item.id}
            role="tab"
            aria-selected={isActive}
            aria-controls={`panel-${item.id}`}
            id={`tab-${item.id}`}
            onClick={() => onChange(item.id)}
            className={clsx(
              'flex flex-1 items-center justify-center gap-2 rounded-full min-h-[44px]',
              'text-sm font-medium transition-all motion-reduce:transition-none duration-base',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              'focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg',
              'sm:text-base active:scale-[0.98]',
              isActive
                ? 'bg-white/[0.12] border border-white/[0.15] text-white shadow-[0_0_12px_rgba(139,92,246,0.15)]'
                : 'text-white/50 hover:text-white/80 hover:bg-white/[0.04] border border-transparent'
            )}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        )
      })}
    </div>
  )
}
```

### Step 2: Use in GrowPage

Replace the current tab implementation in `GrowPage.tsx` with the new component. Wrap in the same sticky blur pattern Daily Hub uses:

```tsx
import { Tabs } from '@/components/ui/Tabs'
import { BookOpen, Flame } from 'lucide-react'

// Inside GrowPage:
<div className="sticky top-0 z-40 backdrop-blur-md transition-shadow motion-reduce:transition-none">
  <div className="mx-auto flex max-w-xl items-center justify-center px-4 py-3 sm:py-4">
    <Tabs
      ariaLabel="Grow content type"
      activeId={activeTab}
      onChange={setActiveTab}
      items={[
        { id: 'plans', label: 'Reading Plans', icon: <BookOpen className="h-4 w-4" /> },
        { id: 'challenges', label: 'Challenges', icon: <Flame className="h-4 w-4" /> },
      ]}
    />
  </div>
</div>
```

### Acceptance

- Tabs on `/grow` are visually indistinguishable from tabs on `/daily` (same pill container, same active fill + purple halo, same inactive hover behavior).
- Tabs render correctly in both `?tab=plans` and `?tab=challenges` URL states.
- No width shift when switching tabs (reserved transparent border prevents this).
- Keyboard navigation works: Tab focuses the active tab, Enter/Space activates, focus ring renders purple.
- `aria-selected`, `role="tab"`, `role="tablist"` all present.
- Shared `<Tabs>` component is exported from `@/components/ui/Tabs` and does not import anything page-specific.

---

## 1.3 "Create Your Own Plan" card — frosted glass

**Screenshot:** 1 (callout #3)
**Problem:** Uses `bg-primary/[0.08]` + `border-primary/20` + `rounded-xl` with no backdrop-blur — a flat purple-tinted banner that reads as "unfinished" next to the FrostedCards below. Should match the reading plan card treatment.

### Change

**File:** `frontend/src/pages/GrowPage.tsx` (Create Your Own Plan section)

```tsx
// Before
<div className="mb-6 rounded-xl border border-primary/20 bg-primary/[0.08] p-6">
  <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
    {/* ... icon + copy + button ... */}
  </div>
</div>

// After
<div className="mb-6 rounded-2xl border border-white/[0.12] bg-white/[0.06] backdrop-blur-sm p-6 shadow-[0_0_25px_rgba(139,92,246,0.06),0_4px_20px_rgba(0,0,0,0.3)]">
  <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
    {/* ... icon + copy + button — button changes per §1.4 ... */}
  </div>
</div>
```

### Acceptance

- Card uses canonical FrostedCard treatment: `bg-white/[0.06]`, `border-white/[0.12]`, `rounded-2xl`, `backdrop-blur-sm`, dual purple+dark shadow.
- Card no longer appears purple-tinted.
- The inner sparkle icon retains its purple color (the icon is the semantic cue, not the card bg).
- Layout (icon left, copy, button right on sm+) unchanged.

---

## 1.4 Reading plan cards — emoji inline + white pill button

**Screenshot:** 1 (callouts #4 and #5)
**Problem:** Emoji renders as a 36px (`text-4xl`) block above the title with `mb-3`. Should sit inline left of title at matching font size. Primary CTA is `bg-primary rounded-lg` (purple rectangle); should be white pill matching Daily Hub.

### Change

**File:** Reading plan card component (likely inline in `GrowPage.tsx` — locate the mapped `plans` array render)

```tsx
// Before
<a className="block rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm ...">
  <div className="mb-3 text-4xl">{plan.emoji}</div>
  <h3 className="text-lg font-semibold text-white">{plan.title}</h3>
  <p className="mt-1 line-clamp-2 text-sm text-white/70">{plan.description}</p>
  <div className="mt-4 flex flex-wrap gap-2">{/* tags */}</div>
  <button className="mt-4 min-h-[44px] w-full rounded-lg bg-primary px-8 py-3 text-sm font-semibold text-white">
    Start Plan
  </button>
</a>

// After
<a className="flex h-full flex-col rounded-2xl border border-white/[0.12] bg-white/[0.06] p-6 backdrop-blur-sm shadow-[0_0_25px_rgba(139,92,246,0.06),0_4px_20px_rgba(0,0,0,0.3)] transition-[background-color,border-color] duration-base hover:bg-white/[0.08] hover:border-white/20">
  <div className="flex items-center gap-3 mb-2">
    <span className="text-lg leading-none" aria-hidden="true">{plan.emoji}</span>
    <h3 className="text-lg font-semibold text-white">{plan.title}</h3>
  </div>
  <p className="line-clamp-2 text-sm text-white/70">{plan.description}</p>
  <div className="mt-4 flex flex-wrap gap-2">{/* tags — see §1.6 */}</div>
  <Button variant="light" className="mt-auto pt-4">
    Start Plan
  </Button>
</a>
```

### Notes

- `flex flex-col h-full` + `mt-auto` on the button pins it to card bottom, which combined with grid `items-stretch` will equalize card heights without a hard `min-h-[Npx]`.
- Emoji `aria-hidden="true"` because the title already communicates the content — the emoji is decorative.
- Card bg/border/shadow upgraded from `bg-white/5` / `border-white/10` (grow's current light treatment) to canonical FrostedCard tokens matching Daily Hub.
- The `Button` component used here is updated in §3.1 below to add `variant="light"`.

### Acceptance

- Emoji is ~18px (matches `text-lg` title), sits immediately left of title, separated by 12px gap.
- Emoji is inside a `flex items-center gap-3` wrapper with the title — they share a row.
- Card uses white pill button, not purple rectangle.
- All reading plan cards in a row have equal heights.
- Hover state: bg lifts from 6% to 8% white, border lifts from 12% to 20% white.
- The "Start Plan" button is a pill (`rounded-full`) at `min-h-[44px]`, white bg, `text-primary` foreground.

---

## 1.5 Challenge cards — unify templates and behavior

**Screenshot:** 2 (all callouts)
**Problem:** Next Challenge and Coming Up use two different card templates. Next Challenge lacks View Details. Coming Up cards have inconsistent heights (Pray40 is 218px vs siblings' 246px). Category icons are rendered in dark category colors (`#7C3AED`, `#6B21A8`) — invisible on dark card backgrounds. Action buttons are glassmorphic secondary; should match Daily Hub white pill.

### 1.5.1 Unify card templates

Both sections should use the **same card component** with a `variant` prop for emphasis:

- `variant="hero"` — used in Next Challenge. Larger padding (`p-6 sm:p-8`), `rounded-2xl`, 24px title (`text-xl sm:text-2xl`). Description is NOT clamped.
- `variant="grid"` — used in Coming Up. Standard padding (`p-6`), `rounded-xl`, 18px title (`text-lg`). Description is `line-clamp-2`.

Both variants share:

- Same background (`bg-white/[0.06]`), border (`border-white/[0.12]`), backdrop-blur (`backdrop-blur-sm`).
- Same inner anatomy: icon+title row, description, tags, countdown, action buttons.
- Same action buttons: `Remind me` + `View Details` in that order.
- Same `flex flex-col h-full` structure so grid-row siblings equalize heights.

### 1.5.2 Add View Details to Next Challenge

**Screenshot 2, callout:** "Why is there no 'View Details' for the 'Next Challenge' tab?"

Both action buttons appear on every card regardless of section. Link target is `/challenges/:id`.

### 1.5.3 Equalize Coming Up card heights

**Screenshot 2, callout:** "Make all component boxes the same size"
**Recon finding:** Grid uses `grid-cols-2` with default `items-stretch`, but the inner card has no `h-full`, so it collapses to content height inside a stretched wrapper.

**Fix:** Add `h-full` to the card's outermost element AND ensure `flex flex-col` so inner children distribute correctly. With `mt-auto` on the action button row, the descriptions determine card mid-fill and buttons pin to bottom.

```tsx
<article className="flex h-full flex-col rounded-xl border border-white/[0.12] bg-white/[0.06] p-6 backdrop-blur-sm ...">
  <div className="flex items-center gap-3">
    <Icon className="h-5 w-5 shrink-0 text-white/90" aria-hidden="true" />
    <h3 className="text-lg font-bold text-white">{challenge.title}</h3>
    <CategoryTag category={challenge.category} className="ml-auto" />
  </div>
  <p className="mt-3 line-clamp-2 text-sm text-white/70">{challenge.description}</p>
  <div className="mt-3 text-xs text-white/60">
    {challenge.durationDays} days · Starts {formatDate(challenge.startDate)}
  </div>
  <div className="mt-auto flex flex-wrap gap-2 pt-4">
    <Button variant="light" size="sm" onClick={handleRemind}>
      <Bell className="h-4 w-4" /> Remind me
    </Button>
    <Button variant="light" size="sm" asChild>
      <Link to={`/challenges/${challenge.id}`}>View Details</Link>
    </Button>
  </div>
</article>
```

### 1.5.4 Fix icon color

**Screenshot 2, callout:** "You cannot see the black icons to the left of the titles. Make them white instead."

Icons on challenge cards (Flame, Star, Heart, etc.) currently inherit the category color. On dark backgrounds, Advent (#7C3AED), Lent (#6B21A8), and Easter (#92400E) icons become near-invisible.

**Fix:** All challenge card icons use `text-white/90`. The category association is preserved through the category tag, not the icon color.

```tsx
<Icon className="h-5 w-5 shrink-0 text-white/90" aria-hidden="true" />
```

### 1.5.5 Action buttons match Daily Hub

**Screenshot 2, callout:** "Change the style of the liquid glass 'remind me/view details' to match the same style as the white buttons on the 'Daily Hub' section."

Both `Remind me` and `View Details` use `<Button variant="light" size="sm">` (§3.1). White pill, `text-primary` foreground, matching Daily Hub's Pattern 1.

### Acceptance

- Every challenge card in Next Challenge and Coming Up sections has both `Remind me` and `View Details` buttons in consistent order.
- All Coming Up cards in the same grid row render at the exact same pixel height (verify with Playwright: compare `offsetHeight` of first two `article` elements in the grid).
- Challenge card icons render in `text-white/90` — visible on the dark card background.
- Action buttons are white pills matching Daily Hub Pattern 1.
- Next Challenge card is visually more prominent than Coming Up cards (hero variant has larger padding and larger title).

---

## 1.6 Category tag contrast — WCAG AA fix

**Screenshot 2, callout:** "The purple 'Advent' font is also hard to see."
**Recon finding:** 4 of 5 category tag text colors fail WCAG AA at 12px. Lent (2.3:1) and Easter (2.0:1) are severely failing.

### Root cause

Each challenge in `frontend/src/data/challenges.ts` defines its own tag color inline, typically at the `500`/`600`/`700` weight of a Tailwind palette (e.g., `text-violet-700` for Advent, `text-purple-800` for Lent). These are too dark for 12px text on an `rgba(255,255,255,0.06)` card.

### Fix: central color map with compliant foregrounds

**New file:** `frontend/src/constants/categoryColors.ts`

```ts
/**
 * Category color tokens for challenge tags and themed UI elements.
 *
 * Foreground colors are tuned to meet WCAG AA (≥4.5:1) at 12px
 * over a FrostedCard background (rgba(255,255,255,0.06) over #0F0A1E ≈ #1A1628).
 *
 * DO NOT use the raw /500 or /600 Tailwind classes for tag foregrounds — they fail AA.
 */
export type ChallengeCategory =
  | 'pentecost'
  | 'advent'
  | 'lent'
  | 'new-year'
  | 'easter'

export interface CategoryColorTokens {
  /** Tag background — tinted 15% */
  bgClass: string
  /** Tag foreground — lightened for AA */
  fgClass: string
  /** Optional border class */
  borderClass: string
  /** Hex themeColor used by hero overlay (unchanged from prior inline values) */
  themeColor: string
}

export const CATEGORY_COLORS: Record<ChallengeCategory, CategoryColorTokens> = {
  pentecost: {
    bgClass: 'bg-red-500/15',
    fgClass: 'text-red-300',     // 7.1:1 on card bg
    borderClass: 'border-red-400/30',
    themeColor: '#DC2626',
  },
  advent: {
    bgClass: 'bg-violet-500/15',
    fgClass: 'text-violet-300',  // 6.8:1
    borderClass: 'border-violet-400/30',
    themeColor: '#7C3AED',
  },
  lent: {
    bgClass: 'bg-purple-500/15',
    fgClass: 'text-purple-300',  // 7.4:1
    borderClass: 'border-purple-400/30',
    themeColor: '#6B21A8',
  },
  'new-year': {
    bgClass: 'bg-emerald-500/15',
    fgClass: 'text-emerald-300', // 6.9:1
    borderClass: 'border-emerald-400/30',
    themeColor: '#059669',
  },
  easter: {
    bgClass: 'bg-amber-500/15',
    fgClass: 'text-amber-200',   // 8.3:1 (amber needs 200 not 300 on dark)
    borderClass: 'border-amber-400/30',
    themeColor: '#D97706',       // Bumped from #92400E for hero overlay visibility
  },
}
```

### CategoryTag component

**New file (or inline in same file):** `frontend/src/components/challenges/CategoryTag.tsx`

```tsx
import { clsx } from 'clsx'
import { CATEGORY_COLORS, type ChallengeCategory } from '@/constants/categoryColors'

const LABELS: Record<ChallengeCategory, string> = {
  pentecost: 'Pentecost',
  advent: 'Advent',
  lent: 'Lent',
  'new-year': 'New Year',
  easter: 'Easter',
}

export interface CategoryTagProps {
  category: ChallengeCategory
  className?: string
}

export function CategoryTag({ category, className }: CategoryTagProps) {
  const tokens = CATEGORY_COLORS[category]
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        tokens.bgClass,
        tokens.fgClass,
        className
      )}
    >
      {LABELS[category]}
    </span>
  )
}
```

### Data migration

Update `frontend/src/data/challenges.ts` so each challenge has a `category: ChallengeCategory` string field instead of inline color classes. The existing `themeColor` inline value is preserved via the map — challenge records reference `CATEGORY_COLORS[category].themeColor` when building the hero overlay.

### Acceptance

- All 5 category tag colors meet WCAG AA (≥4.5:1) at 12px over card background. Automated check: Lighthouse Accessibility ≥95 on `/grow?tab=challenges`.
- No inline color classes for categories remain in `challenges.ts` — all go through `CATEGORY_COLORS`.
- `<CategoryTag category="advent" />` renders readable violet text on dark background.
- The hero overlay on `/challenges/:id` continues to tint with the correct themeColor (unchanged behavior, just sourced from map instead of inline).

---

# Part 2: Challenge Detail (`/challenges/:id`)

## 2.1 Navbar transparency

**Screenshot 3, callout:** "Look at the NavBar on the other pages and notice that it's liquid glass and transparent... Replicate this with this page."
**Recon finding:** `/daily` and `/grow` render navbar flat transparent (`bg-transparent`, `position: absolute`). `/challenges/:id` wraps in `<Layout>` which defaults to opaque (`bg-hero-dark`). **Note:** The navbar is not "glassmorphic" anywhere — it's flat transparent on /daily and /grow. Matching means making it flat transparent here too.

### Change

**File:** `frontend/src/components/Layout.tsx`

Add a `transparentNav?: boolean` prop that passes `transparent` through to the mounted `<Navbar>`:

```tsx
// Before
export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-hero-bg text-white">
      <Navbar />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  )
}

// After
interface LayoutProps {
  children: ReactNode
  transparentNav?: boolean
}

export function Layout({ children, transparentNav = false }: LayoutProps) {
  return (
    <div className="min-h-screen bg-hero-bg text-white">
      <Navbar transparent={transparentNav} />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  )
}
```

**File:** `frontend/src/pages/ChallengeDetail.tsx`

```tsx
// Change the Layout usage
<Layout transparentNav>
  {/* ... */}
</Layout>
```

### Acceptance

- On `/challenges/:id`, the navbar renders at `position: absolute`, `bg-transparent`, no border, no backdrop-filter applied by default (scroll-triggered blur is handled by Navbar's internal sticky logic).
- Hero atmospheric background extends behind and beneath the navbar with no visible seam.
- No other Layout-wrapped page (verify by grepping for `<Layout` usages) has changed behavior — `transparentNav` defaults to `false`.

---

## 2.2 Hero h1 — remove `font-script` accent

**Screenshot 3, callout:** "Spirit is wrong font"
**Problem:** Same pattern as §1.1 — `<span className="font-script">` on the accent word, rendering Caveat on top of the gradient h1.

### Change

**File:** `frontend/src/pages/ChallengeDetail.tsx` (line ~242–247)

```tsx
// Before
<h1
  className="mt-4 px-1 sm:px-2 text-3xl font-bold sm:text-4xl lg:text-5xl pb-2"
  style={GRADIENT_TEXT_STYLE}
>
  {titlePrefix} <span className="font-script">{titleLastWord}</span>
</h1>

// After
<h1
  className="mt-4 px-1 sm:px-2 text-3xl font-bold sm:text-4xl lg:text-5xl pb-2"
  style={GRADIENT_TEXT_STYLE}
>
  {challenge.title}
</h1>
```

### Also

Remove the `titlePrefix` / `titleLastWord` split logic elsewhere in the file (whatever derives these values — probably a split on last whitespace). The full title renders as a single gradient-clipped string.

### Acceptance

- All challenge detail pages render the title in pure Inter with full gradient fade.
- No `font-script` class in `ChallengeDetail.tsx`.
- Long titles ("Fire of Pentecost: 21 Days of the Spirit") wrap naturally without the split-word visual.

---

## 2.3 Full-bleed hero background

**Screenshot 3, callout:** "The body does not fill the page"
**Problem:** The hero section is inside `<main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">`, so its atmospheric background is constrained to the content column. Page background (`bg-hero-bg` / `#08051A`) shows on left and right margins, producing a "card-within-page" look.

On `/grow` and `/daily`, the hero is full-bleed — its background extends edge-to-edge while content inside is constrained.

### Change

**File:** `frontend/src/pages/ChallengeDetail.tsx`

Move the hero section OUT of `<main>` so it can render full-bleed. The content container inside hero remains constrained. Pattern:

```tsx
// Before (roughly)
<Layout transparentNav>
  <main className="flex-1 mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    <section
      className="relative flex w-full flex-col items-center px-4 pt-32 pb-8 ..."
      style={heroStyle}
    >
      {/* hero content */}
    </section>
    <Breadcrumb {...} />
    <CommunityFeed {...} />
  </main>
</Layout>

// After
<Layout transparentNav>
  {/* Hero is full-bleed */}
  <section
    className="relative flex w-full flex-col items-center px-4 pt-32 pb-8 sm:pt-36 sm:pb-12 lg:pt-40 text-center antialiased"
    style={heroStyle}
  >
    <div className="mx-auto w-full max-w-4xl">
      {/* hero content (icon, h1, description, season/duration, countdown, buttons) */}
    </div>
  </section>

  {/* Post-hero content is constrained */}
  <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
    <Breadcrumb {...} />
    <CommunityFeed {...} />
  </main>
</Layout>
```

### Notes

- `max-w-2xl` on `<main>` matches the existing CommunityFeed inner container — it already narrows there; this just lifts the constraint up to `<main>` level.
- Hero inner container (`mx-auto w-full max-w-4xl`) keeps the text column readable while the atmospheric background extends edge-to-edge.
- This matches the structural pattern used by `GrowPage` and `DailyHub`.

### Acceptance

- Hero atmospheric background (radial red + purple) extends to the full viewport width at all breakpoints.
- Hero content (icon, title, description, buttons) remains centered and width-constrained.
- Breadcrumb and CommunityFeed below the hero remain at `max-w-2xl` (no change from current behavior).
- Page root background (`bg-hero-bg`) is only visible below the hero, not to its left/right.

---

## 2.4 CommunityFeed — state-aware redesign

**Screenshot 3, callouts:** "Is the challenge community people who signed up the challenge?" / "how is this possible if it hasn't started yet?"
**Recon finding:** `CommunityFeed` renders unconditionally at `ChallengeDetail.tsx:436`, producing fabricated activity ("Daniel S. completed Day 1 just now") for a challenge that doesn't start for 37 days. The participant count (line 288) and community goal (line 296) both guard with `{!isFutureChallenge && ...}`; feed does not.

### Solution: three-state component

`CommunityFeed` accepts a `status` prop and renders one of three layouts.

**File:** `frontend/src/components/challenges/CommunityFeed.tsx`

```tsx
import { Users, Bell, Award } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { getActivityItems } from '@/data/challenge-community-feed'

export type ChallengeStatus = 'upcoming' | 'active' | 'completed'

export interface CommunityFeedProps {
  status: ChallengeStatus
  dayNumber: number
  challengeDuration: number
  /** Pre-start: how many people have set a reminder */
  remindersCount?: number
  /** Active: how many are currently participating */
  activeParticipantsCount?: number
  /** Completed: how many finished the challenge */
  completedCount?: number
  /** Pre-start: date the challenge starts (for copy) */
  startDateLabel?: string
  /** Shared: current user has the reminder set */
  hasReminder?: boolean
  onToggleReminder?: () => void
}

export function CommunityFeed(props: CommunityFeedProps) {
  return (
    <section className="border-t border-white/10 py-8 sm:py-10">
      <div className="mx-auto max-w-2xl px-4 sm:px-6">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-white/60" aria-hidden="true" />
          <h3 className="text-lg font-semibold text-white">Challenge Community</h3>
        </div>

        {props.status === 'upcoming' && <UpcomingState {...props} />}
        {props.status === 'active' && <ActiveState {...props} />}
        {props.status === 'completed' && <CompletedState {...props} />}
      </div>
    </section>
  )
}

function UpcomingState({ remindersCount = 0, startDateLabel, hasReminder, onToggleReminder }: CommunityFeedProps) {
  return (
    <div className="mt-4 flex flex-col items-center gap-4 py-4 text-center">
      <div className="flex items-center gap-2 text-sm text-white/70">
        <Bell className="h-4 w-4" aria-hidden="true" />
        <span>
          <strong className="font-semibold text-white">{remindersCount}</strong>
          {' '}
          {remindersCount === 1 ? 'person is' : 'people are'} waiting to start
        </span>
      </div>
      <p className="max-w-sm text-sm text-white/60">
        Community activity will begin when the challenge starts
        {startDateLabel ? ` on ${startDateLabel}` : ''}.
        Set a reminder to join when it begins.
      </p>
      {onToggleReminder && (
        <Button variant="light" size="sm" onClick={onToggleReminder}>
          <Bell className="h-4 w-4" />
          {hasReminder ? 'Reminder set' : 'Remind me'}
        </Button>
      )}
    </div>
  )
}

function ActiveState({ dayNumber, challengeDuration, activeParticipantsCount }: CommunityFeedProps) {
  const items = getActivityItems(dayNumber, challengeDuration, 6)
  return (
    <>
      {typeof activeParticipantsCount === 'number' && (
        <p className="mt-1 text-sm text-white/60">
          {activeParticipantsCount} {activeParticipantsCount === 1 ? 'person' : 'people'} participating
        </p>
      )}
      <ul className="mt-4 divide-y divide-white/5">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-3 py-3">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
              style={{ backgroundColor: item.avatarColor }}
              aria-hidden="true"
            >
              {item.initials}
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-sm font-medium text-white/90">{item.name} </span>
              <span className="text-sm text-white/60">{item.action}</span>
            </div>
            <span className="shrink-0 text-xs text-white/60">{item.timestamp}</span>
          </li>
        ))}
      </ul>
      {/* "Pray for the community" link REMOVED — see §2.5 */}
    </>
  )
}

function CompletedState({ completedCount = 0 }: CommunityFeedProps) {
  return (
    <div className="mt-4 flex flex-col items-center gap-3 py-6 text-center">
      <Award className="h-8 w-8 text-white/70" aria-hidden="true" />
      <p className="text-sm text-white/70">
        <strong className="font-semibold text-white">{completedCount}</strong>
        {' '}
        {completedCount === 1 ? 'person' : 'people'} completed this challenge.
      </p>
    </div>
  )
}
```

### Wire into ChallengeDetail

**File:** `frontend/src/pages/ChallengeDetail.tsx`

Derive status from existing challenge state:

```tsx
const status: ChallengeStatus = isFutureChallenge
  ? 'upcoming'
  : isCompletedChallenge
    ? 'completed'
    : 'active'

// Replace existing CommunityFeed call (line ~436):
{challenge && (
  <CommunityFeed
    status={status}
    dayNumber={selectedDay}
    challengeDuration={challenge.durationDays}
    remindersCount={challenge.remindersCount}
    activeParticipantsCount={challenge.activeParticipantsCount}
    completedCount={challenge.completedCount}
    startDateLabel={formatStartDate(challenge.startDate)}
    hasReminder={hasReminder}
    onToggleReminder={handleToggleReminder}
  />
)}
```

### Mock data

Add to challenge records in `frontend/src/data/challenges.ts`:

- `remindersCount: number` — for pre-start display. Seed with plausible values (3–15).
- `activeParticipantsCount?: number` — for active state.
- `completedCount?: number` — for completed state.

If `isCompletedChallenge` doesn't exist yet as a derived value in `ChallengeDetail.tsx`, add it:

```ts
const isCompletedChallenge = useMemo(() => {
  const endDate = addDays(new Date(challenge.startDate), challenge.durationDays)
  return isAfter(new Date(), endDate)
}, [challenge.startDate, challenge.durationDays])
```

### Acceptance

- Pre-start challenge (37-day future start): CommunityFeed renders "UpcomingState" — no fabricated activity, no "Pray for the community" link. Shows reminder count + CTA.
- Active challenge: existing activity feed renders, now scoped to `ActiveState`.
- Past challenge: renders "CompletedState" with total count — no fabricated "just now" activity.
- `CommunityFeed` refuses to render `ActiveState` content when `status !== 'active'` (defense in depth).
- Mock data updates don't break existing challenge list rendering on `/grow?tab=challenges`.

---

## 2.5 Remove "Pray for the community" CTA

**Screenshot 3, callout:** "Pray for the community makes no sense"

### Change

**File:** `frontend/src/components/challenges/CommunityFeed.tsx`

Delete lines 42–48 (the "Pray for the community" `<a>` block pointing to `/prayer-wall?filter=challenge`). The new state-aware component structure in §2.4 already omits it.

Also grep for the URL `/prayer-wall?filter=challenge` — if it's referenced nowhere else, remove any supporting filter logic on the Prayer Wall side (out of scope for this spec if it lives elsewhere; flag in code review).

### Acceptance

- No "Pray for the community" text or link anywhere in `CommunityFeed.tsx`.
- No `/prayer-wall?filter=challenge` URL constructed from anywhere in the challenge detail render path.

---

## 2.6 Staged urgency for "Starts in N days"

**Not in screenshots, but flagged in prior conversation:**
**Problem:** "Starts in 37 days" renders in `rgb(220, 38, 38)` (danger red). Urgency coloring is inappropriate when the start is over a month away.

### Change

**File:** `frontend/src/pages/ChallengeDetail.tsx` (the countdown text)

Derive the color from days-until-start:

```tsx
function getCountdownColorClass(daysUntilStart: number): string {
  if (daysUntilStart <= 1) return 'text-red-400'     // "Starts today" / "Starts tomorrow"
  if (daysUntilStart <= 7) return 'text-amber-300'   // Within a week
  return 'text-white'                                // Neutral for anything further out
}

// Usage
<p className="text-lg font-semibold text-white">
  Starts in{' '}
  <span className={getCountdownColorClass(daysUntilStart)}>
    {daysUntilStart} {daysUntilStart === 1 ? 'day' : 'days'}
  </span>
</p>
```

### Acceptance

- A challenge starting in 37 days renders "37 days" in white — no red urgency.
- A challenge starting in 5 days renders "5 days" in amber.
- A challenge starting tomorrow renders "1 day" in red.
- "Starts today" / "Starts tomorrow" copy variants remain if they already exist — just swap color logic.

---

# Part 3: Shared infrastructure

## 3.1 `<Button variant="light">`

**File:** `frontend/src/components/ui/Button.tsx`

Add a `light` variant matching Daily Hub Pattern 1 (the inline/secondary white pill):

```tsx
// Inside button variants
const variants = {
  // ... existing variants (primary, secondary, outline, ghost)
  light: 'bg-white text-primary hover:bg-gray-100 transition-colors',
}

// Inside size tokens
const sizes = {
  // ... existing sizes
  sm: 'min-h-[44px] px-6 py-2.5 text-sm font-semibold rounded-full',
  md: 'min-h-[44px] px-6 py-2.5 text-sm font-semibold rounded-full',
  // ensure rounded-full is applied for the pill shape
}
```

Ensure focus ring (`focus-visible:ring-2 focus-visible:ring-primary/70`) and press feedback (`active:scale-[0.98]`) are inherited from the base button classes, not just the variant.

### Acceptance

- `<Button variant="light">Start Plan</Button>` renders a white pill matching Daily Hub "Meditate on this passage" / "Start this plan" buttons.
- Background: `#fff`, foreground: `text-primary` (`#6D28D9`), padding `10px 24px`, font `600/14px`, fully rounded.
- Hover: background becomes `#f3f4f6` (gray-100).
- Focus-visible: purple ring at 2px with offset.
- Works with `asChild` prop for wrapping `<Link>` (verify the Button component supports this — add if missing).

---

## 3.2 Layout prop `transparentNav` — already covered in §2.1

(Reference only — implementation in §2.1.)

---

# Part 4: Out of scope / future work

These are documented here so they aren't forgotten but will not be executed in this spec:

1. **`font-script` removal from other hero headings.** ~15 files use `<span className="font-script">` in heading contexts: Settings, Insights, MonthlyReport, Friends, GrowthProfile, Routines, PrayerWallHero, SharedPrayer, SharedVerse, MilestoneCard, CreatePlanFlow, WorshipPlaylistsTab. Logos and decorative uses (celebration overlays) are intentional and remain.

2. **Tab primitive migration for 7 other sites.** `AudioDrawer`, `BooksDrawerContent`, `BoardSelector`, `ContentPicker`, `AvatarPickerModal`, `LocalSupportPage`, `DrawerTabs` all have their own tab implementations. Migrating to the new `<Tabs>` primitive requires per-site audit (some may need different modes — e.g., scrollable tabs for long lists) and is its own spec.

3. **Reflection-question card style drift.** Design system doc says Tier 2 card is `border-l-4 border-l-primary/60`; actual code uses `border-l-2 border-l-primary`. Reconcile doc vs code in a design-system audit.

4. **Prayer wall filter cleanup.** If `/prayer-wall?filter=challenge` has no other referrers after this spec lands, remove the filter handling from PrayerWall too.

---

# Verification checklist

## Visual regression (Playwright)

Run `/verify-with-playwright` on these routes at 1440px and 375px:

- `/grow?tab=plans`
- `/grow?tab=challenges`
- `/challenges/fire-of-pentecost` (pre-start state)
- `/challenges/<active-challenge-slug>` (active state — seed one in mock data if needed)
- `/challenges/<past-challenge-slug>` (completed state — seed one in mock data if needed)

Tolerance: ±2px per design system convention. No "CLOSE" verdicts.

## Automated accessibility checks

Run Lighthouse Accessibility on `/grow?tab=challenges`. Target ≥95. Specifically verify:

- All 5 category tags pass WCAG AA contrast (≥4.5:1 at 12px).
- Tab `role`/`aria-selected`/`aria-controls` present.
- CommunityFeed state-specific copy is readable by screen reader (empty `aria-hidden` emoji, `aria-label` on icon-only buttons if any).

## Manual checks

- Click each tab on `/grow` — confirm pill + purple halo active state, no width shift, keyboard focus ring.
- Hover every card — confirm background and border lift cleanly.
- Compare `/grow` and `/daily` tabs side-by-side — should be indistinguishable.
- Navigate to a pre-start challenge — confirm no fabricated activity, only reminder CTA + waiting copy.
- Switch to active challenge — confirm activity feed renders.
- Resize to 375px — confirm hero is still full-bleed, cards still equalize, tabs don't overflow.

## Edge cases

- Challenge with exactly 1 reminder: copy reads "1 person is waiting" not "1 people are waiting".
- Challenge starting tomorrow (1 day): countdown renders red "1 day", not red "1 days".
- Challenge with no description (shouldn't happen but defensively): card doesn't collapse height.
- Grid with an odd number of Coming Up cards: last card doesn't stretch wider than siblings.

---

# Acceptance summary

This spec is complete when:

1. ✅ `/grow` hero reads "Grow in Faith" in a single Inter gradient — no Caveat.
2. ✅ `/grow` tabs are visually identical to `/daily` tabs.
3. ✅ "Create Your Own Plan" uses canonical FrostedCard treatment.
4. ✅ Reading plan card emojis are inline left of titles at title font size.
5. ✅ Reading plan card CTAs are white pills.
6. ✅ Next Challenge and Coming Up card heights equalize within their rows.
7. ✅ Both Next Challenge and Coming Up cards have `Remind me` + `View Details`.
8. ✅ Challenge card category icons render in `text-white/90`.
9. ✅ Category tag colors pass WCAG AA.
10. ✅ `/challenges/:id` navbar is flat transparent like `/grow` and `/daily`.
11. ✅ `/challenges/:id` hero is full-bleed.
12. ✅ `/challenges/:id` hero renders in single Inter gradient — no Caveat accent.
13. ✅ Pre-start challenges show reminder-waiting state, not fabricated activity.
14. ✅ "Pray for the community" CTA is removed.
15. ✅ Countdown color scales with urgency (white → amber → red).
16. ✅ `<Button variant="light">` is available as a reusable variant.
17. ✅ Shared `<Tabs>` component is available for future sites to adopt.
18. ✅ Lighthouse Accessibility ≥95 on `/grow?tab=challenges`.

---

## Change summary for `/code-review`

- **Files created:** `Tabs.tsx`, `categoryColors.ts`, `CategoryTag.tsx`
- **Files modified:** `GrowPage.tsx`, `ChallengeDetail.tsx`, `CommunityFeed.tsx`, `ActiveChallengeCard.tsx`, Coming Up challenge card component, `Button.tsx`, `Layout.tsx`, `challenges.ts`
- **Patterns introduced:** `variant="light"` on Button, `transparentNav` prop on Layout, central category color map
- **Patterns retired from these files:** `<span className="font-script">` accent split, purple-tinted "Create Your Own Plan" card, ad-hoc glassmorphic action buttons on challenge cards
- **Known follow-ups:** font-script headings cleanup across other pages, tab primitive migration across 7 other sites
