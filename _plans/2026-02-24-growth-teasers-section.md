# Implementation Plan: Growth Teasers Section

**Spec:** `_specs/growth-teasers-section.md`
**Date:** 2026-02-24
**Branch:** `claude/feature/growth-teasers-section`

---

## Architecture Context

### Relevant Existing Files

- **`frontend/src/components/JourneySection.tsx`** — The section directly above. Uses `useInView` hook for staggered scroll animations. Its background ends with `#F5F5F5` (via `linear-gradient(to bottom, #EDE9FE 0%, #F5F5F5 15%)`). The Growth Teasers section must visually pick up from this color.
- **`frontend/src/pages/Home.tsx`** — Landing page. Currently renders `<Navbar transparent />`, `<HeroSection />`, `<JourneySection />`, and a `<div id="quiz" />` placeholder. The new component goes between `<JourneySection />` and the quiz placeholder.
- **`frontend/src/hooks/useInView.ts`** — Custom Intersection Observer hook. Returns `[ref, inView]`. Respects `prefers-reduced-motion`. Already used by JourneySection for staggered fade-in. The Growth Teasers section will use the same hook.
- **`frontend/src/lib/utils.ts`** — Exports `cn()` for conditional Tailwind class merging.
- **`frontend/tailwind.config.js`** — Custom colors: `primary` (#6D28D9), `primary-lt` (#8B5CF6), `neutral-bg` (#F5F5F5), `hero-dark` (#0D0620), `success` (#27AE60), `warning` (#F39C12), `danger` (#E74C3C), `glow-cyan` (#00D4FF). Fonts: `sans` (Inter), `serif` (Lora).

### Patterns to Follow

- Components use named exports (`export function GrowthTeasersSection()`)
- Tailwind utility classes for all styling; inline `style={{}}` only for complex gradients and `fontFamily`
- `cn()` from `@/lib/utils` for conditional class merging
- `useInView` hook with `threshold: 0.1` for scroll-triggered animations
- Staggered animation via `transitionDelay: inView ? \`${index * N}ms\` : '0ms'` pattern (see JourneySection lines 198-205)
- Tests use `describe`/`it` blocks with `@testing-library/react`, `MemoryRouter` wrapper, and `vitest`
- Test files in `__tests__/` subdirectory adjacent to source
- Lucide React for icons (`import { IconName } from 'lucide-react'`)

### Design System References

- **Section background**: gradient from `#F5F5F5` → `#0D0620` (hero-dark)
- **Card background**: `#1a1030` with `border: 1px solid #2a2040`
- **Frosted overlay**: `backdrop-filter: blur(4px)`, `background: rgba(13, 6, 32, 0.5)`
- **Heading**: white text, "Growing" in Caveat cursive + Primary violet (#6D28D9)
- **Card icon colors**: Primary violet (#6D28D9), Warning (#F39C12), Glow Cyan (#00D4FF)
- **CTA button**: Primary violet bg, white text, `rounded-full`
- **Reassurance text**: `text-text-light` or equivalent muted color on dark bg (use `text-white/50` since text-light won't contrast on dark)

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] The current branch is `claude/feature/growth-teasers-section`
- [ ] Working directory is clean (no uncommitted changes aside from spec/plan files)
- [ ] `Home.tsx` has `<JourneySection />` followed by `<div id="quiz" />` in `<main>`
- [ ] `useInView` hook exists at `frontend/src/hooks/useInView.ts` and works as documented
- [ ] Lucide React is installed (already used by Navbar for `ChevronDown`, `Menu`, `X`)

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Component structure | Single file `GrowthTeasersSection.tsx` with private sub-components for each card preview | Keeps it self-contained; previews are static and won't be reused elsewhere |
| Gradient transition from JourneySection | Use inline `style` with `linear-gradient(to bottom, #F5F5F5 0%, #0D0620 25%)` on the section | Picks up exactly where JourneySection's background ends |
| Frosted overlay implementation | Absolute-positioned div with `backdrop-blur-sm` + `bg-[rgba(13,6,32,0.5)]` + centered Lock icon | Standard frosted glass pattern; the blur makes content underneath look realistic but locked |
| Heatmap grid rendering | 7x4 CSS grid with hardcoded color values per cell | No logic needed; hardcoded array of 28 color strings |
| Leaderboard blurred names | CSS `blur(3px)` filter on the name text elements | Simulates real usernames that are obscured |
| Reassurance text color | `text-white/50` instead of `text-text-light` | Text Light (#7F8C8D) won't contrast on dark purple; white at 50% opacity reads better |
| Card hover animation | `hover:-translate-y-1 hover:shadow-xl` via Tailwind + `transition-all duration-300` | Simple, consistent hover pattern; no blur reduction on hover (adds complexity without clear benefit) |
| Card stagger timing | 200ms per card (3 cards = 0ms, 200ms, 400ms) | Slower stagger than JourneySection (120ms) since fewer items; gives each card its moment |

---

## Implementation Steps

### Step 1: Create GrowthTeasersSection Component

**Objective:** Build the full `GrowthTeasersSection` component with all 3 preview cards, heading, CTA, and animations.

**Files to create:**
- `frontend/src/components/GrowthTeasersSection.tsx`

**Details:**

The component structure:

```
GrowthTeasersSection (exported)
├── Section heading (h2 with Caveat "Growing" accent)
├── Subheading paragraph
├── Card grid (3 columns desktop, 1 column mobile)
│   ├── MoodInsightsPreview (private)
│   ├── StreaksPreview (private)
│   └── LeaderboardPreview (private)
├── CTA button (Link to /register)
└── Reassurance text
```

**Imports:**
```tsx
import { Link } from 'react-router-dom'
import { BarChart3, Flame, Users, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useInView } from '@/hooks/useInView'
```

**Section wrapper:**
- `<section aria-labelledby="growth-heading">`
- Inline style for background gradient: `linear-gradient(to bottom, #F5F5F5 0%, #0D0620 25%)`
- Padding: `px-4 pt-16 pb-20 sm:px-6 sm:pt-20 sm:pb-24`
- Max width container: `<div className="mx-auto max-w-5xl">`

**Heading:**
- `<h2 id="growth-heading">` with white text, Inter bold
- "Growing" wrapped in `<span>` with Caveat cursive, Primary violet (#6D28D9), slightly larger
- Follow exact pattern from JourneySection heading (lines 170-184)
- Subheading: `<p>` in `text-white/60 text-base sm:text-lg`

**Card grid:**
- Container: `<div className="mt-12 grid grid-cols-1 gap-6 sm:mt-16 sm:grid-cols-3">`
- Use `useInView` on the grid container
- Each card is a `<div>` with stagger delay: `transitionDelay: inView ? \`${index * 200}ms\` : '0ms'`
- Card base classes: `rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl`
- Card inline styles: `background: '#1a1030'`, `borderColor: '#2a2040'`

**Lock overlay (shared pattern for all 3 cards):**
A `FrostedOverlay` private component:
```tsx
function FrostedOverlay() {
  return (
    <div className="absolute inset-0 flex items-center justify-center rounded-t-2xl backdrop-blur-sm" style={{ background: 'rgba(13, 6, 32, 0.5)' }}>
      <Lock className="h-6 w-6 text-white/40" aria-hidden="true" />
    </div>
  )
}
```

**Card 1 — Mood Insights Preview:**
- Preview area: `relative h-[150px] overflow-hidden rounded-t-2xl p-4`
- Heatmap: a 7-column CSS grid (`grid grid-cols-7 gap-1`) with 28 hardcoded colored `<div>` squares (each `h-3 w-3 rounded-sm`). Color array using success (#27AE60), lighter greens (#6BCB77), yellows (#F39C12), reds (#E74C3C), and empty grays (#2a2040).
- Below the grid: an SVG trend line. Simple `<svg>` with viewBox, a single `<path>` for a gentle upward curve in Primary violet with `strokeWidth="2"` and `fill="none"`.
- Frosted overlay on top.

**Card 2 — Streaks & Faith Points Preview:**
- Preview area: same dimensions as Card 1
- Content centered vertically: large "🔥 12 Days" text (`text-2xl font-bold text-white`), then "⭐ 145 pts" (`text-primary-lt text-lg`), then a row of 3 badge circles (`flex gap-2 justify-center`). First two: `h-8 w-8 rounded-full bg-primary flex items-center justify-center` with a small white checkmark. Third: `h-8 w-8 rounded-full bg-[#2a2040]` (locked gray).
- Frosted overlay on top.

**Card 3 — Friends & Leaderboard Preview:**
- Preview area: same dimensions
- Mini table: 4 rows, each a flex row with rank (#1-#4), blurred name, and points.
- Rank: `text-white/60 w-6 text-sm`
- Name: `text-white text-sm` with inline `style={{ filter: 'blur(3px)' }}`
- Points: `text-white/80 text-sm font-medium`
- Row 4 ("You") has a subtle highlight: `bg-white/5 rounded`
- Names: "Sarah M.", "David K.", "Rachel T.", "You"
- Points: 280, 245, 190, 145
- Frosted overlay on top.

**Card info area (below preview, shared structure):**
- Padding: `p-5`
- Icon: Lucide icon component, `h-5 w-5 mb-2`
- Title: `text-white font-semibold text-base`
- Description: `text-white/60 text-sm mt-1`

**CTA section (below cards):**
- Container: `mt-12 text-center sm:mt-16`
- Button: `<Link to="/register">` with classes: `inline-flex items-center rounded-full bg-primary px-8 py-3 text-base font-medium text-white transition-all hover:bg-primary-lt hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2`
- Reassurance: `<p className="mt-4 text-sm text-white/50">It&apos;s free. No credit card. No catch.</p>`

**Guardrails (DO NOT):**
- Do not add any API calls, dynamic data, or JavaScript logic for preview content — all previews are hardcoded static HTML/CSS
- Do not use `dangerouslySetInnerHTML` anywhere
- Do not import or reference any auth state — this section renders for everyone
- Do not add analytics tracking or click tracking
- Do not add any data persistence

**Test specifications:**
Tests are in Step 3.

**Expected state after completion:**
- [ ] Component file exists and exports `GrowthTeasersSection`
- [ ] No TypeScript errors
- [ ] No ESLint errors

---

### Step 2: Add GrowthTeasersSection to Home Page

**Objective:** Wire the new component into the landing page between JourneySection and the quiz placeholder.

**Files to modify:**
- `frontend/src/pages/Home.tsx` — Import and render GrowthTeasersSection

**Details:**

Add import:
```tsx
import { GrowthTeasersSection } from '@/components/GrowthTeasersSection'
```

Add between `<JourneySection />` and the quiz placeholder comment:
```tsx
<GrowthTeasersSection />
```

The resulting `<main>` should be:
```tsx
<main>
  <HeroSection />
  <JourneySection />
  <GrowthTeasersSection />
  {/* Quiz placeholder — will be replaced by StartingPointQuiz component */}
  <div id="quiz" />
</main>
```

**Guardrails (DO NOT):**
- Do not modify any other components
- Do not remove the quiz placeholder div
- Do not change the order of existing components

**Test specifications:**
Tests are in Step 3.

**Expected state after completion:**
- [ ] `Home.tsx` imports and renders `GrowthTeasersSection`
- [ ] The section appears on the landing page between Journey and the quiz placeholder
- [ ] No TypeScript errors

---

### Step 3: Add Tests for GrowthTeasersSection

**Objective:** Add unit tests verifying the component renders correctly with all expected elements.

**Files to create:**
- `frontend/src/components/__tests__/GrowthTeasersSection.test.tsx`

**Details:**

Test structure following the JourneySection test pattern:

```tsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import { GrowthTeasersSection } from '@/components/GrowthTeasersSection'

function renderGrowthTeasers() {
  return render(
    <MemoryRouter>
      <GrowthTeasersSection />
    </MemoryRouter>
  )
}
```

**Tests to implement:**

1. **renders as a named section landmark**
   - `screen.getByRole('region', { name: /see how you're growing/i })`

2. **renders the heading with "Growing" text**
   - `screen.getByRole('heading', { level: 2, name: /see how you're growing/i })`

3. **renders the subheading text**
   - `screen.getByText(/create a free account and unlock your personal dashboard/i)`

4. **renders 3 card titles**
   - `screen.getByText('Mood Insights')`
   - `screen.getByText('Streaks & Faith Points')`
   - `screen.getByText('Friends & Leaderboard')`

5. **renders card descriptions**
   - `screen.getByText(/see how god is meeting you over time/i)`
   - `screen.getByText(/build daily habits and watch your faith grow/i)`
   - `screen.getByText(/grow together and encourage each other/i)`

6. **renders CTA button linking to /register**
   - `const link = screen.getByRole('link', { name: /create a free account/i })`
   - `expect(link).toHaveAttribute('href', '/register')`

7. **renders reassurance text**
   - `screen.getByText(/it's free\. no credit card\. no catch\./i)`

8. **cards have staggered transition delays**
   - Query the 3 card elements and verify `transitionDelay` values are `0ms`, `200ms`, `400ms`

**Guardrails (DO NOT):**
- Do not test visual styling (colors, fonts, gradients) — those are verified visually
- Do not test hover animations — unit tests can't verify CSS transitions
- Do not test Intersection Observer behavior (already tested via useInView pattern)

**Expected state after completion:**
- [ ] All new GrowthTeasersSection tests pass
- [ ] All existing tests still pass
- [ ] `pnpm test` exits cleanly

---

### Step 4: Visual Verification with Playwright

**Objective:** Verify the section renders correctly in the browser — gradient transition, card layout, preview content, CTA, and responsive behavior.

**Files to modify:** None — this is a verification step only.

**Details:**

1. Start the dev server if not already running
2. Navigate to `http://localhost:5173`
3. Scroll down past the Journey Section
4. Verify:
   - Smooth gradient transition from light to dark purple
   - Heading "See How You're Growing" with purple Caveat accent on "Growing"
   - 3 cards visible with preview areas, frosted overlays, lock icons
   - Card 1: colored grid squares visible through blur
   - Card 2: streak/points text visible through blur
   - Card 3: leaderboard rows visible through blur
   - "Create a Free Account" button visible
   - "It's free. No credit card. No catch." text visible
5. Check responsive: resize to mobile width and verify cards stack vertically

**Guardrails (DO NOT):**
- Do not make code changes during this step — only observe and report

**Expected state after completion:**
- [ ] Section is visually correct in the browser
- [ ] Gradient transition is smooth
- [ ] Cards are readable through the frosted blur
- [ ] Responsive layout works on mobile

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Create GrowthTeasersSection component |
| 2 | 1 | Add component to Home page |
| 3 | 1 | Add tests for GrowthTeasersSection |
| 4 | 1, 2 | Visual verification with Playwright |

Steps 2 and 3 both depend on Step 1 but are independent of each other (can run in parallel). Step 4 depends on both 1 and 2 (component must exist and be rendered on the page).

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Create GrowthTeasersSection component | [COMPLETE] | 2026-02-24 | Created `frontend/src/components/GrowthTeasersSection.tsx` with 3 preview cards (MoodInsightsPreview, StreaksPreview, LeaderboardPreview), FrostedOverlay, heading, CTA, stagger animations |
| 2 | Add component to Home page | [COMPLETE] | 2026-02-24 | Modified `frontend/src/pages/Home.tsx` — imported and rendered GrowthTeasersSection between JourneySection and quiz placeholder |
| 3 | Add tests for GrowthTeasersSection | [COMPLETE] | 2026-02-24 | Created `frontend/src/components/__tests__/GrowthTeasersSection.test.tsx` — 8 tests, all 97 tests pass |
| 4 | Visual verification with Playwright | [COMPLETE] | 2026-02-24 | Desktop: gradient, heading, 3 cards, CTA, reassurance all render correctly. Mobile: cards stack vertically. No console errors. |
