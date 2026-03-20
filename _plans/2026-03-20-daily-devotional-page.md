# Implementation Plan: Daily Devotional Page

**Spec:** `_specs/daily-devotional-page.md`
**Date:** 2026-03-20
**Branch:** `claude/feature/daily-devotional-page`
**Design System Reference:** `_plans/recon/design-system.md` (loaded — captured 2026-03-06)
**Recon Report:** not applicable (no external recon for this feature)
**Master Spec Plan:** not applicable (Phase 2.9 has no centralized master plan)

---

## Architecture Context

### Project Structure

- **Pages:** `frontend/src/pages/` — one file per route (e.g., `DailyHub.tsx`, `Home.tsx`)
- **Components:** `frontend/src/components/` — organized by feature subdirectories (`daily/`, `prayer-wall/`, `dashboard/`, `ui/`)
- **Types:** `frontend/src/types/` — TypeScript interfaces per feature domain
- **Constants/Data:** `frontend/src/constants/` for small datasets with helper functions (e.g., `verse-of-the-day.ts`), `frontend/src/data/` for larger datasets (e.g., `music/scenes.ts`)
- **Hooks:** `frontend/src/hooks/` — custom hooks
- **Tests:** Co-located `__tests__/` directories next to source files

### Existing Patterns to Follow

- **Day-of-year rotation:** `frontend/src/constants/verse-of-the-day.ts` — `getTodaysVerse(date)` uses `dayOfYear % poolLength` with UTC date arithmetic to avoid DST issues. The devotional must use the same pattern.
- **PageHero:** `frontend/src/components/PageHero.tsx` — accepts `{ title, subtitle?, showDivider?, children? }`. Styled with gradient background, Caveat font title. For the devotional, we will NOT use PageHero directly — the hero needs custom date navigation arrows and a completion badge, so we build a custom hero section that matches the visual pattern but adds devotional-specific elements.
- **Navbar links:** `frontend/src/components/Navbar.tsx` — `NAV_LINKS` array at top of file. Adding a new link at index 1 auto-renders in both desktop nav and mobile drawer. Active state uses `NavLink` with underline animation.
- **Landing page:** `frontend/src/pages/Home.tsx` — sections render in order: `HeroSection`, `JourneySection`, `TodaysVerseSection`, `GrowthTeasersSection`, `StartingPointQuiz`, `SiteFooter`. Insert new section between `TodaysVerseSection` and `GrowthTeasersSection`.
- **Auth gating:** `useAuth()` from `@/hooks/useAuth` returns `{ isAuthenticated, user }`. `useAuthModal()` from `@/components/prayer-wall/AuthModalProvider` returns `{ openAuthModal(subtitle?, view?) }`. Pattern: check `isAuthenticated`, if false call `openAuthModal('Sign in to ...')`.
- **Toast:** `useToast()` from `@/components/ui/Toast` — `showToast('Link copied!', 'success')`.
- **ReadAloudButton:** `frontend/src/components/daily/ReadAloudButton.tsx` — accepts `{ text, className?, onWordIndexChange? }`. Uses `useReadAloud()` hook with browser Speech Synthesis API.
- **Provider wrapping in tests:** `MemoryRouter` (with `future` flags), `ToastProvider`, `AuthModalProvider`. Mock `useAuth` with `vi.mock`.
- **Route registration:** `frontend/src/App.tsx` — routes defined inside `<Routes>` with standard `<Route path="" element={} />` pattern. Provider nesting: `QueryClientProvider > BrowserRouter > AuthProvider > ToastProvider > AuthModalProvider > AudioProvider > Routes`.

### Database Tables

None. This feature is entirely frontend. No backend endpoints. No database changes.

### Auth Gating

- `useAuth()` + `useAuthModal()` pattern from existing codebase
- The devotional page is a public route — viewing, sharing, read aloud, day browsing all work without login
- Only "Journal about this" and reading completion tracking require authentication

---

## Auth Gating Checklist

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| View devotional | Public, no auth | Step 4-5 | No check needed |
| Browse days (arrows/swipe) | Public, no auth | Step 6 | No check needed |
| "Share today's devotional" | Public, no auth | Step 7 | No check needed |
| "Read aloud" | Public, no auth | Step 7 | No check needed |
| "Journal about this" | Auth-gated — logged-out sees auth modal | Step 7 | `useAuth()` + `useAuthModal()` — "Sign in to journal about this devotional" |
| Reading completion tracking | Logged-in only, no-op for logged-out | Step 8 | `useAuth().isAuthenticated` guard before localStorage write |
| Completion checkmark display | Logged-in only | Step 8 | `useAuth().isAuthenticated` guard before reading localStorage |

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Page background (all-dark) | background | `#0D0620` (`bg-hero-dark`) | design-system.md — footer/hero-dark token |
| Hero gradient (dark variant) | background | [UNVERIFIED] `radial-gradient(100% 80% at 50% 0%, #3B0764 0%, transparent 60%), linear-gradient(#0D0620 0%, #1E0B3E 30%, #4A1D96 55%, #0D0620 100%)` | Modified from inner page hero gradient — end color changed from `#F5F5F5` to `#0D0620` |
| Hero title | font | Caveat 72px/72px bold white → mobile 48px | design-system.md — Hero H1 |
| Hero subtitle (date) | font | Inter 18-20px 400 `text-white/85` | design-system.md — Hero subtitle |
| Devotional title (h2) | font | Inter 28px bold white (`text-2xl sm:text-3xl font-bold text-white`) | Spec req 11 |
| Quote text | font | Lora italic `text-xl sm:text-2xl text-white leading-relaxed` | Spec — Visual Design Quote |
| Quote attribution | font | Inter `text-sm text-white/50 mt-3` | Spec |
| Decorative quotes | font | `text-5xl text-white/20 font-serif` | Spec — large `"` characters |
| Passage reference label | font | `text-xs uppercase tracking-widest text-white/40 font-medium mb-4` | Spec |
| Passage verse text | font | Lora italic `text-base sm:text-lg text-white/90 leading-relaxed` | Spec |
| Passage verse numbers | font | `text-white/30 text-xs font-sans mr-1 align-super` | Spec |
| Reflection body | font | Inter `text-base text-white/80 leading-relaxed` | Spec |
| Prayer label | font | `text-xs uppercase tracking-widest text-white/40 font-medium mb-4` | Spec |
| Prayer text | font | Lora italic `text-base text-white/80 leading-relaxed` | Spec |
| Question card | background | `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6` | design-system.md — dashboard card pattern |
| Question prefix | font | `text-sm text-white/40` | Spec |
| Question text | font | `text-lg text-white font-medium mt-2` | Spec |
| Section divider | border | `border-t border-white/10` | Spec |
| Action buttons | style | `bg-white/10 text-white border border-white/20 rounded-lg px-4 py-3 hover:bg-white/15 transition-colors text-sm font-medium` | Spec — Visual Design Action Buttons |
| Nav arrows | style | `text-white/40 hover:text-white/70 transition-colors` — disabled: `text-white/15 cursor-not-allowed` | Spec |
| Teaser CTA | style | `bg-white/10 text-white font-medium py-3 px-8 rounded-lg border border-white/30 hover:bg-white/15` | design-system.md — Hero Outline CTA |
| Content column | width | `max-w-2xl mx-auto px-4 sm:px-6` | design-system.md — Daily Hub tab content width |

**[UNVERIFIED] Hero gradient (dark variant):** The all-dark hero gradient is a new pattern (no existing page uses dark-to-dark).
→ To verify: Run `/verify-with-playwright` and visually confirm the gradient looks contemplative and cohesive.
→ If wrong: Adjust the gradient stops — the key is that the hero fades into the same dark background as the content area, not to #F5F5F5.

---

## Design System Reminder

**Project-specific quirks that `/execute-plan` displays before every UI step:**

- Worship Room uses **Caveat** (`font-script`) for hero H1 titles and highlighted script words, not Lora
- **Lora** (`font-serif`) is for scripture/quotes only — never for headings
- **Inter** (`font-sans`) is for body text, UI elements, and section headings (H2/H3)
- Hero gradients use the radial + linear double-gradient pattern with `#3B0764` as the radial center
- Dashboard/dark-theme cards use `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`
- Action buttons on dark backgrounds use outline style: `bg-white/10 border border-white/20`
- All tab content uses `max-w-2xl` container width
- Frosted glass cards use `p-6` padding (or `p-4` on mobile)
- Touch targets must be minimum 44px on mobile
- `prefers-reduced-motion` must be respected for any animations
- Labels/section headers on dark bg use `text-xs uppercase tracking-widest text-white/40 font-medium`

---

## Shared Data Models (from Master Plan)

Not applicable — no master plan for Phase 2.9.

**New types this spec introduces:**

```typescript
// frontend/src/types/devotional.ts

export interface DevotionalQuote {
  text: string
  attribution: string
}

export interface DevotionalVerse {
  number: number
  text: string
}

export interface DevotionalPassage {
  reference: string
  verses: DevotionalVerse[]
}

export type DevotionalTheme =
  | 'trust'
  | 'gratitude'
  | 'forgiveness'
  | 'identity'
  | 'anxiety-and-peace'
  | 'faithfulness'
  | 'purpose'
  | 'hope'
  | 'healing'
  | 'community'

export interface Devotional {
  id: string
  dayIndex: number
  title: string
  theme: DevotionalTheme
  quote: DevotionalQuote
  passage: DevotionalPassage
  reflection: string[]
  prayer: string
  reflectionQuestion: string
}
```

**localStorage keys this spec touches:**

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_devotional_reads` | Read + Write | Array of `YYYY-MM-DD` date strings, capped at 365. Written when logged-in user scrolls to bottom of today's devotional. |

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | < 640px | Full-width content with `px-4`, stacked action buttons, swipe navigation enabled, quote `text-xl`, decorative marks scaled down, reflection question card `p-4` |
| Tablet | 640-1024px | `max-w-2xl` centered, horizontal action buttons, swipe navigation enabled, quote `text-2xl` |
| Desktop | > 1024px | `max-w-2xl mx-auto` centered, horizontal action buttons, arrow-only navigation (no swipe), generous section padding `py-10` |

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| Hero → devotional title | `py-8 sm:py-10` | Spec section spacing |
| Devotional title → quote section | `py-8 sm:py-10` with `border-t border-white/10` divider | Spec |
| Quote → passage | `py-8 sm:py-10` with divider | Spec |
| Passage → reflection | `py-8 sm:py-10` with divider | Spec |
| Reflection → prayer | `py-8 sm:py-10` with divider | Spec |
| Prayer → question card | `py-8 sm:py-10` with divider | Spec |
| Question card → action buttons | `mt-8 sm:mt-10` | Spec |
| Action buttons → footer | `pb-16 sm:pb-20` | Codebase inspection — standard bottom padding before footer |

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] Branch `claude/feature/daily-devotional-page` exists and is checked out
- [ ] Frontend dev server runs successfully (`pnpm dev`)
- [ ] All existing tests pass (`pnpm test`)
- [ ] All auth-gated actions from the spec are accounted for in the plan (2 actions: journal button + completion tracking)
- [ ] Design system values are verified from design-system.md reference (captured 2026-03-06)
- [ ] [UNVERIFIED] dark hero gradient flagged with verification method
- [ ] The 30 devotional entries will use WEB (World English Bible) translation — public domain, no licensing
- [ ] No swipe gesture handling exists in the codebase — this will be a new `useSwipe` hook
- [ ] Spec 17 (dashboard integration, mood-based personalization) is out of scope for this plan

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Hero component reuse | Build custom hero section, don't extend PageHero | The devotional hero needs date navigation arrows and completion badge — PageHero doesn't support these. Match visual pattern manually. |
| All-dark page background | Use `bg-hero-dark` (#0D0620) for entire page, modified hero gradient ending in #0D0620 instead of #F5F5F5 | Spec requirement: "contemplative experience" — all dark, no light sections |
| Swipe gesture implementation | New `useSwipe` hook with touch events | No existing swipe handling in codebase. Keep it simple: touchStart/touchEnd delta detection. |
| Devotional data file location | `frontend/src/data/devotionals.ts` | Large dataset (30 entries × ~15 fields each). Follows pattern of `data/music/` for larger content files. Types stay in `types/devotional.ts`. |
| Rotation function location | Same file as data (`data/devotionals.ts`) | Follows `constants/verse-of-the-day.ts` pattern where data + helper live together. |
| Share link semantics | Relative day offset (`?day=-3`), not absolute date | Spec requirement: "3 days ago is relative to the viewer's current date." Simpler implementation, but shared links show different content on different days. |
| Read aloud content order | Quote → passage (no verse numbers) → reflection → prayer → question | Spec edge cases section |
| Completion on past days | Does NOT trigger | Spec: "only today's devotional (day=0) triggers completion" |
| Decorative quotation marks | Styled `"` and `"` characters in large font, not images | Spec explicitly says "styled characters, not images" |

---

## Implementation Steps

### Step 1: Types & Rotation Utility

**Objective:** Define the Devotional TypeScript interfaces and the deterministic day-of-year rotation function.

**Files to create:**
- `frontend/src/types/devotional.ts` — All devotional types
- `frontend/src/data/devotionals.ts` — Empty pool array + `getTodaysDevotional()` function (pool filled in Step 2)

**Details:**

**`types/devotional.ts`** — Define interfaces as shown in the Shared Data Models section above.

**`data/devotionals.ts`** — Export:
```typescript
import type { Devotional } from '@/types/devotional'

export const DEVOTIONAL_POOL: Devotional[] = []  // Filled in Step 2

export function getTodaysDevotional(date: Date = new Date(), dayOffset: number = 0): Devotional {
  const adjustedDate = new Date(date)
  adjustedDate.setDate(adjustedDate.getDate() + dayOffset)
  const year = adjustedDate.getFullYear()
  const dayOfYear = Math.floor(
    (Date.UTC(year, adjustedDate.getMonth(), adjustedDate.getDate()) - Date.UTC(year, 0, 0)) /
      (1000 * 60 * 60 * 24),
  )
  return DEVOTIONAL_POOL[dayOfYear % DEVOTIONAL_POOL.length]
}

export function formatDevotionalDate(date: Date = new Date(), dayOffset: number = 0): string {
  const adjustedDate = new Date(date)
  adjustedDate.setDate(adjustedDate.getDate() + dayOffset)
  return adjustedDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
```

Follow the UTC day-of-year arithmetic from `constants/verse-of-the-day.ts` lines 3-8 exactly.

**Guardrails (DO NOT):**
- DO NOT use `new Date().toISOString().split('T')[0]` — it returns UTC, not local time
- DO NOT use randomness — rotation must be deterministic
- DO NOT import from `mocks/` — this is production data, not mock data

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `getTodaysDevotional returns correct devotional for known date` | unit | Given a fixed date, verify the correct dayIndex devotional is returned |
| `getTodaysDevotional with dayOffset navigates correctly` | unit | dayOffset=-3 returns the devotional from 3 days ago |
| `getTodaysDevotional wraps via modulo` | unit | Day 366 wraps correctly (366 % 30 = 6) |
| `formatDevotionalDate formats correctly` | unit | Returns "Friday, March 20, 2026" format |
| `formatDevotionalDate with offset` | unit | dayOffset=-1 returns yesterday's date |
| `All devotionals have unique dayIndex 0-29` | unit | Validate pool integrity |
| `All devotionals have required fields` | unit | Every entry has id, title, theme, quote, passage, reflection, prayer, reflectionQuestion |
| `Theme distribution: 3 per theme` | unit | Verify 10 themes × 3 = 30 |
| `No consecutive dayIndex values share a theme` | unit | dayIndex N and N+1 always differ in theme |

**Expected state after completion:**
- [ ] Types compile without errors
- [ ] `getTodaysDevotional()` returns a valid (empty pool will fail — that's expected until Step 2)
- [ ] `formatDevotionalDate()` returns properly formatted date strings

---

### Step 2: Devotional Content Data (30 Entries)

**Objective:** Write 30 hardcoded devotional entries covering 10 themes (3 per theme), all using WEB translation Bible passages.

**Files to modify:**
- `frontend/src/data/devotionals.ts` — Populate `DEVOTIONAL_POOL` array

**Details:**

Populate the `DEVOTIONAL_POOL` array with 30 entries. Each entry:
- `id`: `"devotional-01"` through `"devotional-30"`
- `dayIndex`: 0-29, with theme interleaving (day 0: trust, day 1: gratitude, day 2: forgiveness, ..., day 9: community, day 10: trust, day 11: gratitude, ...)
- `title`: Descriptive, warm title (e.g., "Finding Peace in the Storm", "The Gift of Letting Go")
- `theme`: One of the 10 themes
- `quote`: Object with `text` (1-2 sentences) and `attribution`. Mix of classic Christian writers (C.S. Lewis, Corrie ten Boom, A.W. Tozer, Dietrich Bonhoeffer, George Müller, Elisabeth Elliot, Charles Spurgeon, Oswald Chambers) and "Unknown"/"Traditional" attributions
- `passage`: Object with `reference` (e.g., "Psalm 46:1-3") and `verses` array of `{ number, text }`. All WEB translation. 2-6 verses per passage.
- `reflection`: Array of 3-5 paragraph strings. Warm second-person ("you") voice. Non-denominational. Never preachy. Connect scripture to daily life.
- `prayer`: Single paragraph. Closing prayer in warm, encouraging tone.
- `reflectionQuestion`: String starting with "Something to think about today: ..."

**Theme distribution pattern (interleaved so no consecutive repeats):**
```
Index 0-9:   trust, gratitude, forgiveness, identity, anxiety-and-peace, faithfulness, purpose, hope, healing, community
Index 10-19: trust, gratitude, forgiveness, identity, anxiety-and-peace, faithfulness, purpose, hope, healing, community
Index 20-29: trust, gratitude, forgiveness, identity, anxiety-and-peace, faithfulness, purpose, hope, healing, community
```

**Bible passages to use (WEB translation) — distribute across themes:**
- trust: Proverbs 3:5-6, Psalm 46:1-3, Isaiah 41:10
- gratitude: Psalm 100:1-5, 1 Thessalonians 5:16-18, Psalm 107:1-3
- forgiveness: Ephesians 4:31-32, Colossians 3:12-14, Psalm 103:8-12
- identity: Ephesians 2:10, Psalm 139:13-16, 2 Corinthians 5:17
- anxiety-and-peace: Philippians 4:6-7, Isaiah 26:3-4, Matthew 6:25-27
- faithfulness: Lamentations 3:22-24, Psalm 36:5-7, Deuteronomy 7:9
- purpose: Jeremiah 29:11-13, Romans 8:28, Ephesians 3:20-21
- hope: Romans 15:13, Psalm 42:11, Isaiah 40:31
- healing: Psalm 147:3, Jeremiah 17:14, Psalm 34:17-18
- community: Ecclesiastes 4:9-12, Galatians 6:2, Hebrews 10:24-25

**Guardrails (DO NOT):**
- DO NOT use any translation other than WEB (World English Bible)
- DO NOT write theological claims as divine authority — use "Scripture encourages us..." language
- DO NOT include living controversial figures in quote attributions
- DO NOT make reflections preachy or judgmental
- DO NOT include medical, psychological, or life-decision advice in reflections
- DO NOT make reflection paragraphs shorter than 2 sentences or longer than 5 sentences each

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `DEVOTIONAL_POOL has exactly 30 entries` | unit | `expect(DEVOTIONAL_POOL).toHaveLength(30)` |
| `Each entry has valid theme from allowed set` | unit | Check against the 10 allowed themes |
| `Each passage has 2-6 verses` | unit | Validate verse count |
| `Each reflection has 3-5 paragraphs` | unit | Validate paragraph count |
| `Each reflectionQuestion starts with "Something to think about today:"` | unit | String prefix check |
| `dayIndex values are 0-29 with no gaps or duplicates` | unit | Set size check |

**Expected state after completion:**
- [ ] All 30 devotionals populated with full content
- [ ] All Step 1 tests pass (pool integrity, theme distribution, no consecutive theme repeats)
- [ ] Step 2 tests pass (content validation)

---

### Step 3: Route Registration & Page Shell

**Objective:** Register the `/devotional` route and create a minimal page shell that renders the correct devotional for the current day.

**Files to create:**
- `frontend/src/pages/DevotionalPage.tsx` — Page component shell

**Files to modify:**
- `frontend/src/App.tsx` — Add route

**Details:**

**`App.tsx`** — Add route alongside other public routes:
```typescript
<Route path="/devotional" element={<DevotionalPage />} />
```
Place it near the `/daily` route for organizational consistency.

**`DevotionalPage.tsx`** — Minimal shell:
```typescript
import { useSearchParams } from 'react-router-dom'
import { getTodaysDevotional, formatDevotionalDate } from '@/data/devotionals'

export default function DevotionalPage() {
  const [searchParams] = useSearchParams()
  const dayOffset = Math.max(-7, Math.min(0, Number(searchParams.get('day')) || 0))
  const devotional = getTodaysDevotional(new Date(), dayOffset)
  const dateStr = formatDevotionalDate(new Date(), dayOffset)

  return (
    <div className="min-h-screen bg-hero-dark">
      {/* Hero section - Step 4 */}
      {/* Content sections - Step 5 */}
      {/* Action buttons - Step 7 */}
    </div>
  )
}
```

Key: The page root has `min-h-screen bg-hero-dark` for the all-dark background. The `dayOffset` is clamped between -7 and 0.

**Guardrails (DO NOT):**
- DO NOT use the `Layout` wrapper differently — the page should work within the existing `Layout` component (Navbar + content + Footer)
- DO NOT add any auth checks on route level — this is a public route
- DO NOT add lazy loading for this route unless requested (keep it simple)

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `Route /devotional renders DevotionalPage` | integration | Navigate to `/devotional`, verify page renders |
| `dayOffset clamped to [-7, 0]` | unit | `?day=-10` becomes -7, `?day=5` becomes 0 |
| `Default (no param) shows today's devotional` | integration | Renders today's devotional title |

**Expected state after completion:**
- [ ] `/devotional` route accessible in browser
- [ ] Page renders with dark background
- [ ] Correct devotional computed from URL params
- [ ] No console errors

---

### Step 4: Hero Section with Date & Navigation Arrows

**Objective:** Build the custom hero section with "Daily Devotional" title, formatted date with left/right navigation arrows, and completion badge.

**Files to modify:**
- `frontend/src/pages/DevotionalPage.tsx` — Add hero section

**Details:**

Build the hero section directly in `DevotionalPage.tsx` (not a separate component — it's page-specific).

**Hero structure:**
```jsx
<section
  className="relative flex w-full flex-col items-center px-4 pt-32 pb-10 text-center antialiased sm:pt-36 sm:pb-14"
  style={{
    backgroundImage:
      'radial-gradient(100% 80% at 50% 0%, #3B0764 0%, transparent 60%), linear-gradient(#0D0620 0%, #1E0B3E 30%, #4A1D96 55%, #0D0620 100%)',
    backgroundSize: '100% 100%',
  }}
>
  <h1 className="font-script text-5xl font-bold text-white sm:text-6xl lg:text-7xl">
    Daily Devotional
  </h1>
  {/* Date row with arrows */}
  <div className="mt-4 flex items-center gap-3">
    <button
      onClick={() => navigateDay(-1)}
      disabled={dayOffset <= -7}
      className={cn(
        'rounded-full p-2 transition-colors',
        dayOffset <= -7
          ? 'cursor-not-allowed text-white/15'
          : 'text-white/40 hover:text-white/70',
      )}
      aria-label="Previous day's devotional"
      aria-disabled={dayOffset <= -7}
    >
      <ChevronLeft size={24} />
    </button>
    <div className="flex items-center gap-2">
      <span className="text-lg text-white/85 sm:text-xl">{dateStr}</span>
      {/* Completion badge — Step 8 */}
    </div>
    <button
      onClick={() => navigateDay(1)}
      disabled={dayOffset >= 0}
      className={cn(
        'rounded-full p-2 transition-colors',
        dayOffset >= 0
          ? 'cursor-not-allowed text-white/15'
          : 'text-white/40 hover:text-white/70',
      )}
      aria-label="Next day's devotional"
      aria-disabled={dayOffset >= 0}
    >
      <ChevronRight size={24} />
    </button>
  </div>
</section>
```

**`navigateDay` function:**
```typescript
const [searchParams, setSearchParams] = useSearchParams()

const navigateDay = useCallback(
  (direction: -1 | 1) => {
    const newOffset = dayOffset + direction
    if (newOffset >= -7 && newOffset <= 0) {
      if (newOffset === 0) {
        setSearchParams({}, { replace: true })
      } else {
        setSearchParams({ day: String(newOffset) }, { replace: true })
      }
    }
  },
  [dayOffset, setSearchParams],
)
```

When navigating to today (offset 0), remove the `day` param entirely for a clean URL.

Arrow buttons must have 44px minimum touch target — the `p-2` padding on a 24px icon gives 40px, so use `min-w-[44px] min-h-[44px]` to ensure compliance.

**Responsive behavior:**
- Desktop (>1024px): Title + date row centered, generous padding
- Tablet (640-1024px): Same layout, slightly reduced padding
- Mobile (<640px): Same layout, `pt-32 pb-10`, arrows stay flanking the date

**Guardrails (DO NOT):**
- DO NOT use the `PageHero` component — it doesn't support the date navigation pattern
- DO NOT add keyboard navigation for arrows here — standard button focus handles it
- DO NOT forget `aria-label` on arrow buttons
- DO NOT allow navigation past day -7 or past day 0

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `Hero renders "Daily Devotional" heading` | integration | `getByRole('heading', { name: 'Daily Devotional', level: 1 })` |
| `Hero displays formatted date` | integration | Date text is visible |
| `Left arrow navigates to previous day` | integration | Click left arrow, URL updates to `?day=-1` |
| `Right arrow disabled when on today` | integration | Right arrow has `aria-disabled="true"` |
| `Left arrow disabled at day -7` | integration | Render with `?day=-7`, left arrow disabled |
| `Arrow buttons have accessible labels` | unit | Both have `aria-label` |
| `Arrow buttons meet 44px touch target` | unit | Check min-w/min-h or computed size |

**Expected state after completion:**
- [ ] Hero renders with gradient background
- [ ] Date is formatted correctly
- [ ] Navigation arrows work and respect bounds
- [ ] Arrows have proper accessibility attributes

---

### Step 5: Content Sections (Quote, Passage, Reflection, Prayer, Question)

**Objective:** Build all five devotional content sections with proper typography, dividers, and the frosted glass callout card.

**Files to modify:**
- `frontend/src/pages/DevotionalPage.tsx` — Add content sections below hero

**Details:**

All content renders inside a `max-w-2xl mx-auto px-4 sm:px-6` container below the hero. Each section is separated by `border-t border-white/10` dividers with `py-8 sm:py-10` spacing.

**Devotional title (above all sections):**
```jsx
<h2 className="pt-8 text-center text-2xl font-bold text-white sm:pt-10 sm:text-3xl">
  {devotional.title}
</h2>
```

**Quote section:**
```jsx
<div className="border-t border-white/10 py-8 sm:py-10">
  <div className="relative">
    <span className="font-serif text-5xl leading-none text-white/20" aria-hidden="true">"</span>
    <blockquote className="mt-2 font-serif text-xl italic leading-relaxed text-white sm:text-2xl">
      {devotional.quote.text}
    </blockquote>
    <p className="mt-3 text-sm text-white/50">— {devotional.quote.attribution}</p>
  </div>
</div>
```

**Passage section:**
```jsx
<div className="border-t border-white/10 py-8 sm:py-10">
  <p className="mb-4 text-xs font-medium uppercase tracking-widest text-white/40">
    {devotional.passage.reference}
  </p>
  <p className="font-serif text-base italic leading-relaxed text-white/90 sm:text-lg">
    {devotional.passage.verses.map((verse) => (
      <span key={verse.number}>
        <sup className="mr-1 align-super font-sans text-xs text-white/30">{verse.number}</sup>
        {verse.text}{' '}
      </span>
    ))}
  </p>
</div>
```

Verses flow as inline text with superscript verse numbers (not one per line).

**Reflection section:**
```jsx
<div className="border-t border-white/10 py-8 sm:py-10">
  <div className="space-y-4 text-base leading-relaxed text-white/80">
    {devotional.reflection.map((paragraph, i) => (
      <p key={i}>{paragraph}</p>
    ))}
  </div>
</div>
```

No heading above the reflection section — divider + paragraph format is self-explanatory.

**Prayer section:**
```jsx
<div className="border-t border-white/10 py-8 sm:py-10">
  <p className="mb-4 text-xs font-medium uppercase tracking-widest text-white/40">
    Closing Prayer
  </p>
  <p className="font-serif text-base italic leading-relaxed text-white/80">
    {devotional.prayer}
  </p>
</div>
```

**Reflection question section:**
```jsx
<div className="border-t border-white/10 py-8 sm:py-10" ref={questionRef}>
  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm sm:p-6">
    <p className="text-sm text-white/40">Something to think about today:</p>
    <p className="mt-2 text-lg font-medium text-white">
      {devotional.reflectionQuestion.replace('Something to think about today: ', '')}
    </p>
  </div>
</div>
```

The `questionRef` is an Intersection Observer target for reading completion (Step 8). Add it now as a ref, wire it up later.

**Responsive behavior:**
- Desktop (>1024px): `max-w-2xl` centered, quote `text-2xl`, generous `py-10`
- Tablet (640-1024px): Same as desktop
- Mobile (<640px): Full-width `px-4`, quote `text-xl`, question card `p-4`, `py-8`

**Guardrails (DO NOT):**
- DO NOT use `dangerouslySetInnerHTML` for any devotional content
- DO NOT add headings (h3/h4) above sections that the spec doesn't call for (only "Closing Prayer" label)
- DO NOT add decorative closing quote mark — spec only shows opening `"`
- DO NOT render verse numbers as spoken text in screen readers — the `<sup>` is fine as-is, screen readers will read the number
- DO NOT truncate reflection paragraphs — all content should render fully

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `Renders devotional title as h2` | integration | `getByRole('heading', { level: 2 })` contains devotional title |
| `Quote section shows quote text and attribution` | integration | Quote text and "— Attribution" visible |
| `Decorative quotation mark is aria-hidden` | unit | The `"` has `aria-hidden="true"` |
| `Passage shows reference as label` | integration | Reference text visible in uppercase label |
| `Passage renders inline verses with superscript numbers` | integration | Verse numbers and text visible |
| `Reflection renders all paragraphs` | integration | Count rendered `<p>` elements matches reflection array length |
| `Prayer section has "Closing Prayer" label` | integration | Label text visible |
| `Reflection question card has frosted glass styling` | unit | Card element has correct classes |
| `Question prefix and actual question displayed separately` | integration | "Something to think about today:" in muted, question in white |
| `Content column has max-w-2xl` | unit | Container has correct class |
| `Section dividers present` | unit | `border-t border-white/10` elements between sections |

**Expected state after completion:**
- [ ] All 5 content sections render correctly
- [ ] Typography matches spec (Lora for quote/passage/prayer, Inter for reflection/question)
- [ ] Dividers between sections
- [ ] Content column centered at `max-w-2xl`
- [ ] Dark background maintained throughout

---

### Step 6: Day Browsing (URL State + Swipe Gesture)

**Objective:** Add mobile swipe navigation and keyboard shortcuts for browsing between days. Consolidate all day navigation logic.

**Files to create:**
- `frontend/src/hooks/useSwipe.ts` — Touch swipe detection hook

**Files to modify:**
- `frontend/src/pages/DevotionalPage.tsx` — Integrate swipe navigation

**Details:**

**`useSwipe.ts`** — Simple touch gesture hook:
```typescript
import { useRef, useCallback } from 'react'

interface UseSwipeOptions {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  threshold?: number  // minimum px delta to trigger (default 50)
}

export function useSwipe({ onSwipeLeft, onSwipeRight, threshold = 50 }: UseSwipeOptions) {
  const touchStartX = useRef<number | null>(null)

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }, [])

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartX.current === null) return
      const deltaX = e.changedTouches[0].clientX - touchStartX.current
      touchStartX.current = null
      if (Math.abs(deltaX) < threshold) return
      if (deltaX > 0) onSwipeRight?.()
      else onSwipeLeft?.()
    },
    [onSwipeLeft, onSwipeRight, threshold],
  )

  return { onTouchStart, onTouchEnd }
}
```

**Integrate in `DevotionalPage.tsx`:**
```typescript
const swipeHandlers = useSwipe({
  onSwipeLeft: () => navigateDay(1),   // Swipe left = go forward (next day)
  onSwipeRight: () => navigateDay(-1), // Swipe right = go back (previous day)
})

// Apply to the content wrapper:
<div className="min-h-screen bg-hero-dark" {...swipeHandlers}>
```

Swipe left to go forward (next day), swipe right to go back (previous day) — matches spec req 13.

**Responsive behavior:**
- Desktop (>1024px): Swipe handlers attach but effectively no-op (no touch events on desktop)
- Tablet (640-1024px): Swipe enabled
- Mobile (<640px): Swipe enabled

**Guardrails (DO NOT):**
- DO NOT prevent default scroll behavior — the swipe hook only fires on horizontal gestures above threshold
- DO NOT use `preventDefault()` on touch events — this would break scrolling
- DO NOT add visual swipe indicators (no drag animation) — keep it simple
- DO NOT interfere with screen reader navigation — touch handlers are passive

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `useSwipe calls onSwipeLeft on left swipe` | unit | Simulate touchStart + touchEnd with negative delta |
| `useSwipe calls onSwipeRight on right swipe` | unit | Simulate touchStart + touchEnd with positive delta |
| `useSwipe ignores swipes below threshold` | unit | Delta of 30px with threshold 50 does not trigger |
| `Swipe left on devotional page navigates to next day` | integration | Simulate swipe, verify URL updates |
| `Swipe right navigates to previous day` | integration | Same |
| `Swipe does not navigate past day 0 or day -7` | integration | At bounds, swipe is no-op |

**Expected state after completion:**
- [ ] Swipe navigation works on mobile/tablet
- [ ] Day navigation bounded to [-7, 0]
- [ ] URL updates on swipe
- [ ] Scrolling not broken by touch handlers

---

### Step 7: Action Buttons (Journal, Share, Read Aloud)

**Objective:** Add the three action buttons below the reflection question card with proper auth gating for "Journal about this."

**Files to modify:**
- `frontend/src/pages/DevotionalPage.tsx` — Add action buttons section

**Details:**

**Action buttons section** (below the question card, inside the `max-w-2xl` container):
```jsx
<div className="mt-8 flex flex-col gap-3 sm:mt-10 sm:flex-row sm:justify-center">
  <button
    onClick={handleJournalClick}
    className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-white/15"
  >
    <BookOpen size={18} />
    Journal about this
  </button>
  <button
    onClick={handleShareClick}
    className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-white/15"
  >
    <Share2 size={18} />
    Share today's devotional
  </button>
  <ReadAloudButton
    text={buildReadAloudText(devotional)}
    className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-white/15"
  />
</div>
```

**`handleJournalClick`** — Auth-gated:
```typescript
const { isAuthenticated } = useAuth()
const authModal = useAuthModal()
const navigate = useNavigate()

const handleJournalClick = useCallback(() => {
  if (!isAuthenticated) {
    authModal?.openAuthModal('Sign in to journal about this devotional')
    return
  }
  navigate(`/daily?tab=journal&context=devotional&theme=${devotional.theme}`)
}, [isAuthenticated, authModal, navigate, devotional.theme])
```

**`handleShareClick`** — Copies URL to clipboard:
```typescript
const { showToast } = useToast()

const handleShareClick = useCallback(async () => {
  try {
    await navigator.clipboard.writeText(window.location.href)
    showToast('Link copied!', 'success')
  } catch {
    showToast('Could not copy link', 'error')
  }
}, [showToast])
```

**`buildReadAloudText`** — Concatenates devotional content for TTS:
```typescript
function buildReadAloudText(devotional: Devotional): string {
  const quoteText = devotional.quote.text
  const passageText = devotional.passage.verses.map((v) => v.text).join(' ')
  const reflectionText = devotional.reflection.join(' ')
  const prayerText = devotional.prayer
  const questionText = devotional.reflectionQuestion
  return `${quoteText} ${passageText} ${reflectionText} ${prayerText} ${questionText}`
}
```

Note: Passage text excludes verse numbers (spec: "without verse numbers spoken").

**ReadAloudButton integration:** The existing `ReadAloudButton` component accepts a `text` prop and a `className` prop. However, the default styling may not match the dark-background outline buttons. Check if `ReadAloudButton` accepts a `className` prop that overrides its default styling. If not, we may need to wrap it or use the `useReadAloud` hook directly.

**Based on reconnaissance:** `ReadAloudButton` accepts `{ text, className?, onWordIndexChange? }`. The `className` is applied to the button wrapper. We may need to override the default icon button styling. If the component's internal styling conflicts, use `useReadAloud()` hook directly and build a custom button:
```tsx
const readAloud = useReadAloud()
<button
  onClick={() => {
    if (readAloud.state === 'idle') readAloud.play(buildReadAloudText(devotional))
    else if (readAloud.state === 'playing') readAloud.pause()
    else readAloud.resume()
  }}
  className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-white/15"
>
  <Volume2 size={18} />
  {readAloud.state === 'idle' ? 'Read aloud' : readAloud.state === 'playing' ? 'Pause' : 'Resume'}
</button>
```

**Responsive behavior:**
- Desktop (>1024px): `flex-row justify-center gap-3` — horizontal row
- Mobile (<640px): `flex-col gap-3` — stacked vertically, full-width buttons

**Auth gating:**
- "Journal about this": `isAuthenticated` check → auth modal for logged-out → navigate for logged-in
- "Share": No auth required
- "Read aloud": No auth required

**Guardrails (DO NOT):**
- DO NOT use `window.open()` for sharing — clipboard copy only
- DO NOT navigate to journal without auth check
- DO NOT include verse numbers in TTS text
- DO NOT add a "Save" button — not in this spec (favoriting is out of scope)

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `"Journal about this" shows auth modal when logged out` | integration | Mock useAuth as logged out, click button, verify auth modal opens with correct message |
| `"Journal about this" navigates to journal when logged in` | integration | Mock useAuth as logged in, click button, verify navigation to `/daily?tab=journal&context=devotional&theme=...` |
| `"Share" copies URL to clipboard` | integration | Click share, verify clipboard write + toast |
| `"Read aloud" starts TTS` | integration | Click read aloud, verify useReadAloud.play called with correct text |
| `Read aloud text excludes verse numbers` | unit | `buildReadAloudText` output does not contain verse numbers |
| `Buttons display horizontally on desktop` | unit | Container has flex-row class at sm breakpoint |
| `Buttons display stacked on mobile` | unit | Container has flex-col as default |
| `All buttons have Lucide icons` | unit | Each button renders appropriate icon |
| `All buttons meet 44px touch target` | unit | py-3 gives adequate height |

**Expected state after completion:**
- [ ] Three action buttons render below question card
- [ ] Journal button auth-gated correctly
- [ ] Share button copies URL and shows toast
- [ ] Read aloud starts TTS with correct content
- [ ] Responsive layout (horizontal desktop, stacked mobile)

---

### Step 8: Reading Completion Tracking

**Objective:** Track when logged-in users scroll to the bottom of today's devotional using Intersection Observer, write to localStorage, and display a completion badge in the hero.

**Files to modify:**
- `frontend/src/pages/DevotionalPage.tsx` — Add Intersection Observer + completion badge

**Details:**

**Intersection Observer on the reflection question section:**
```typescript
const questionRef = useRef<HTMLDivElement>(null)  // Already added in Step 5
const [isCompleted, setIsCompleted] = useState(false)
const { isAuthenticated } = useAuth()

// Check existing completion state on mount
useEffect(() => {
  if (!isAuthenticated) return
  const reads = JSON.parse(localStorage.getItem('wr_devotional_reads') || '[]') as string[]
  const todayStr = getLocalDateString()  // from existing date utils or inline
  setIsCompleted(reads.includes(todayStr))
}, [isAuthenticated])

// Intersection Observer — only for today's devotional
useEffect(() => {
  if (!isAuthenticated || dayOffset !== 0 || isCompleted) return
  const observer = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        markDevotionalComplete()
        observer.disconnect()
      }
    },
    { threshold: 0.5 },
  )
  if (questionRef.current) observer.observe(questionRef.current)
  return () => observer.disconnect()
}, [isAuthenticated, dayOffset, isCompleted])
```

**`markDevotionalComplete` function:**
```typescript
function markDevotionalComplete() {
  const todayStr = new Date().toLocaleDateString('en-CA')  // YYYY-MM-DD format
  const reads = JSON.parse(localStorage.getItem('wr_devotional_reads') || '[]') as string[]
  if (reads.includes(todayStr)) return  // Prevent duplicates
  reads.push(todayStr)
  // FIFO trim at 365 entries
  while (reads.length > 365) reads.shift()
  localStorage.setItem('wr_devotional_reads', JSON.stringify(reads))
  setIsCompleted(true)
}
```

Use `new Date().toLocaleDateString('en-CA')` which returns `YYYY-MM-DD` in local time. This avoids the UTC pitfall of `toISOString().split('T')[0]`.

**Completion badge in hero** (next to the date text, inside the date row from Step 4):
```jsx
{isCompleted && dayOffset === 0 && (
  <span className="ml-2 inline-flex items-center gap-1 text-sm text-white/50">
    <Check size={14} />
    Completed
  </span>
)}
```

Only shown for today's devotional (dayOffset === 0), only for logged-in users who have completed it.

**Auth gating:**
- Logged-out users: `isCompleted` stays false, observer never attaches, no localStorage access
- Logged-in users: Observer attaches for today only, completion tracked

**Guardrails (DO NOT):**
- DO NOT write to localStorage for logged-out users — zero persistence
- DO NOT trigger completion for past days (dayOffset !== 0)
- DO NOT write duplicate date entries
- DO NOT read localStorage for logged-out users (performance optimization + privacy)
- DO NOT use `new Date().toISOString().split('T')[0]` — UTC pitfall

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `Logged-in: Intersection Observer marks today complete` | integration | Simulate IntersectionObserver callback, verify localStorage write |
| `Logged-out: No Intersection Observer attached` | integration | Mock logged out, verify no observer created |
| `Completion only fires for today (dayOffset=0)` | integration | Render with `?day=-1`, scroll to bottom, verify no localStorage write |
| `Duplicate prevention` | unit | Call markDevotionalComplete twice, verify only 1 entry in array |
| `FIFO trim at 365` | unit | Pre-fill with 365 entries, add one more, verify oldest removed |
| `Completion badge shows after reading` | integration | Trigger completion, verify "Completed" text + check icon appears |
| `Completion badge not shown for past days` | integration | Render with `?day=-1`, verify no completion badge |
| `Completion badge not shown for logged-out` | integration | Mock logged out, verify no badge |
| `Completion persists across reloads` | integration | Set localStorage, render page, verify badge shows immediately |

**Expected state after completion:**
- [ ] Intersection Observer tracks scroll to question section
- [ ] Completion written to localStorage (logged-in, today only)
- [ ] Completion badge displays in hero
- [ ] No localStorage activity for logged-out users
- [ ] FIFO trim at 365 entries

---

### Step 9: Navbar Integration

**Objective:** Add "Daily Devotional" as a new top-level nav link between "Daily Hub" and "Prayer Wall" with a sparkle icon.

**Files to modify:**
- `frontend/src/components/Navbar.tsx` — Add link to NAV_LINKS array + icon treatment

**Details:**

**Desktop nav:** Add to `NAV_LINKS` array at index 1:
```typescript
const NAV_LINKS = [
  { label: 'Daily Hub', to: '/daily' },
  { label: 'Daily Devotional', to: '/devotional', icon: Sparkles },
  { label: 'Prayer Wall', to: '/prayer-wall' },
  { label: 'Music', to: '/music' },
] as const
```

Import `Sparkles` from `lucide-react`.

In the desktop nav link rendering, add icon support:
```jsx
{link.icon && <link.icon size={14} className="mr-1 inline-block" />}
{link.label}
```

The icon should be small (14px) and subtle — it's a "new feature" indicator, not a primary visual element. Style it the same color as the link text (`text-white/90` or inheriting current color).

**Mobile drawer:** The `NAV_LINKS.map()` in the mobile drawer (MobileDrawer) should auto-pick up the new link since it iterates the same array. Verify the icon renders in mobile too:
```jsx
{link.icon && <link.icon size={16} className="mr-2 inline-block" />}
{link.label}
```

**Active state:** The existing `NavLink` component with `getNavLinkClass` handles active state via React Router's `isActive` prop. The `/devotional` path will match when the URL is `/devotional` or `/devotional?day=*` (query params don't affect path matching).

**If `NAV_LINKS` doesn't support an `icon` field**, extend the type:
```typescript
const NAV_LINKS: ReadonlyArray<{ label: string; to: string; icon?: LucideIcon }> = [...]
```

Or use a type assertion. Check the existing type declaration and extend minimally.

**Guardrails (DO NOT):**
- DO NOT change the order of existing nav links — only insert the new one
- DO NOT change the styling of existing nav links
- DO NOT add a dropdown to "Daily Devotional" — it's a direct link
- DO NOT change the mobile drawer's overall layout or styling

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `Desktop nav shows "Daily Devotional" between Daily Hub and Prayer Wall` | integration | Render Navbar, verify link order |
| `"Daily Devotional" link has sparkle icon` | integration | Verify Sparkles icon renders |
| `"Daily Devotional" links to /devotional` | integration | Verify href |
| `Active state on /devotional` | integration | Render with route /devotional, verify active class |
| `Mobile drawer includes "Daily Devotional"` | integration | Open drawer, verify link present |
| `Existing nav links unchanged` | integration | Daily Hub, Prayer Wall, Music still render correctly |

**Expected state after completion:**
- [ ] "Daily Devotional" appears in desktop nav with sparkle icon
- [ ] "Daily Devotional" appears in mobile drawer
- [ ] Active state works on `/devotional`
- [ ] No regressions to existing nav links

---

### Step 10: Landing Page Teaser Section

**Objective:** Add a devotional teaser section on the landing page between TodaysVerseSection and GrowthTeasersSection.

**Files to create:**
- `frontend/src/components/DevotionalTeaser.tsx` — Teaser section component

**Files to modify:**
- `frontend/src/pages/Home.tsx` — Insert teaser section

**Details:**

**`DevotionalTeaser.tsx`:**
```jsx
import { Link } from 'react-router-dom'
import { getTodaysDevotional } from '@/data/devotionals'

export function DevotionalTeaser() {
  const devotional = getTodaysDevotional()

  return (
    <section className="bg-hero-dark px-4 py-16 text-center sm:py-20">
      <div className="mx-auto max-w-3xl">
        <p className="mb-2 text-xs font-medium uppercase tracking-widest text-white/40">
          Daily Devotional
        </p>
        <h2 className="mb-3 font-serif text-2xl text-white sm:text-3xl">
          Start Each Morning with God
        </h2>
        <p className="mb-6 text-base text-white/50">
          Today: {devotional.title}
        </p>
        <Link
          to="/devotional"
          className="inline-block rounded-lg border border-white/30 bg-white/10 px-8 py-3 font-medium text-white transition-colors hover:bg-white/15"
        >
          Read Today's Devotional
        </Link>
      </div>
    </section>
  )
}
```

**Key styling decisions:**
- Background: `bg-hero-dark` (#0D0620) — matches Growth Teasers dark aesthetic
- Heading: `font-serif` (Lora) per spec — `text-2xl sm:text-3xl text-white`
- CTA button: Hero Outline CTA style from design system recon
- Padding: `py-16 sm:py-20` per spec
- Content centered with `max-w-3xl mx-auto`

**`Home.tsx`** — Insert between `TodaysVerseSection` and `GrowthTeasersSection`:
```jsx
<JourneySection />
<TodaysVerseSection />
<DevotionalTeaser />
<GrowthTeasersSection />
```

**Responsive behavior:**
- Desktop (>1024px): Centered with `max-w-3xl`, `text-3xl` heading
- Tablet (640-1024px): Same layout
- Mobile (<640px): Full-width, `text-2xl` heading, adequate `py-16` padding

**Guardrails (DO NOT):**
- DO NOT modify JourneySection, TodaysVerseSection, or GrowthTeasersSection
- DO NOT add any interactive features to the teaser (no auth gating, no share, etc.)
- DO NOT add animations — keep it static and clean
- DO NOT use Caveat for the heading — spec says "large serif (Lora) or heading font", and the context is a warm contemplative feel, so Lora (`font-serif`) is correct here

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `Teaser renders on landing page` | integration | Render Home, verify "Daily Devotional" label visible |
| `Teaser shows "Start Each Morning with God" heading` | integration | getByRole heading |
| `Teaser shows today's devotional title` | integration | "Today: [title]" text visible |
| `CTA links to /devotional` | integration | Link href is `/devotional` |
| `Teaser positioned between TodaysVerseSection and GrowthTeasersSection` | integration | Verify DOM order |
| `Teaser has dark background` | unit | Section has `bg-hero-dark` class |
| `Landing page existing sections unaffected` | integration | Journey, Growth Teasers, Quiz, Footer all still render |

**Expected state after completion:**
- [ ] Teaser section visible on landing page
- [ ] Positioned correctly in section order
- [ ] Shows today's devotional title
- [ ] CTA links to `/devotional`
- [ ] Dark background matches Growth Teasers

---

### Step 11: Comprehensive Tests

**Objective:** Write the full test suite covering the devotional page, navbar changes, and landing page teaser. Consolidate any tests not yet written in prior steps.

**Files to create:**
- `frontend/src/pages/__tests__/DevotionalPage.test.tsx` — Page component tests
- `frontend/src/data/__tests__/devotionals.test.ts` — Data validation + rotation utility tests
- `frontend/src/hooks/__tests__/useSwipe.test.ts` — Swipe hook tests

**Files to modify (if tests exist):**
- `frontend/src/components/__tests__/Navbar.test.tsx` — Add tests for new nav link
- `frontend/src/pages/__tests__/Home.test.tsx` — Add tests for teaser section

**Details:**

**`devotionals.test.ts`** — Data integrity and rotation:
- Pool has 30 entries with unique dayIndex 0-29
- All themes represented 3 times each
- No consecutive dayIndex values share a theme
- All passages have 2-6 verses
- All reflections have 3-5 paragraphs
- All reflectionQuestions start with "Something to think about today:"
- `getTodaysDevotional` returns correct devotional for known dates
- `getTodaysDevotional` with dayOffset works correctly
- `formatDevotionalDate` returns correct format
- Modulo wrap works (day 366 % 30 = 6)

**`DevotionalPage.test.tsx`** — Full page integration tests:

Provider wrapper:
```typescript
function renderPage(initialEntry = '/devotional') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ToastProvider>
        <AuthModalProvider>
          <DevotionalPage />
        </AuthModalProvider>
      </ToastProvider>
    </MemoryRouter>,
  )
}
```

Test categories:
1. **Rendering** — Hero, title, all 5 content sections, action buttons
2. **Day navigation** — Arrow buttons work, bounds respected, URL updates, disabled states
3. **Auth gating** — Journal button (logged out → modal, logged in → navigate)
4. **Sharing** — Clipboard write + toast
5. **Completion tracking** — Observer fires for today, not for past days, not for logged-out, localStorage write, badge display
6. **Accessibility** — Heading hierarchy, aria-labels, aria-disabled, touch targets
7. **Responsive** — Button layout changes (flex-col mobile, flex-row desktop)

**`useSwipe.test.ts`** — Hook tests:
- Fires onSwipeLeft for left swipe
- Fires onSwipeRight for right swipe
- Ignores swipes below threshold
- Handles missing callbacks gracefully

**Navbar tests** — Add to existing test file:
- "Daily Devotional" link present in nav
- Link order: Daily Hub → Daily Devotional → Prayer Wall → Music
- Sparkle icon renders

**Home tests** — Add to existing test file:
- DevotionalTeaser renders
- Shows today's devotional title
- CTA links to `/devotional`
- Section order preserved

**Guardrails (DO NOT):**
- DO NOT skip mocking `useAuth` — tests must cover both logged-in and logged-out states
- DO NOT test implementation details (CSS classes) when behavior tests are possible
- DO NOT forget to clear localStorage in `beforeEach`
- DO NOT import mock data from the actual data file in test assertions — use snapshot or specific known values

**Expected state after completion:**
- [ ] All tests pass (`pnpm test`)
- [ ] No regressions in existing test suites
- [ ] Coverage: all auth gates, navigation bounds, completion tracking, responsive layout
- [ ] `pnpm test -- --run` exits cleanly

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Types & rotation utility |
| 2 | 1 | Devotional content data (30 entries) |
| 3 | 1 | Route registration & page shell |
| 4 | 3 | Hero section with date navigation |
| 5 | 3, 4 | Content sections (quote, passage, reflection, prayer, question) |
| 6 | 4 | Day browsing (swipe gesture + URL state) |
| 7 | 5 | Action buttons (journal auth gate, share, read aloud) |
| 8 | 5, 7 | Reading completion tracking |
| 9 | — | Navbar integration (independent) |
| 10 | 2 | Landing page teaser (needs devotional data) |
| 11 | 1-10 | Comprehensive tests |

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Types & rotation utility | [COMPLETE] | 2026-03-20 | Created `types/devotional.ts` (all interfaces/types) and `data/devotionals.ts` (empty pool + getTodaysDevotional + formatDevotionalDate). Follows verse-of-the-day UTC arithmetic pattern exactly. |
| 2 | Devotional content data | [COMPLETE] | 2026-03-20 | Populated 30 entries in DEVOTIONAL_POOL: 10 themes x 3, dayIndex 0-29, interleaved themes (no consecutive repeats), all WEB translation passages. |
| 3 | Route registration & page shell | [COMPLETE] | 2026-03-20 | Created `pages/DevotionalPage.tsx` (default export, Layout-wrapped, dayOffset clamped [-7,0]). Route `/devotional` added to App.tsx after `/daily`. |
| 4 | Hero section with date navigation | [COMPLETE] | 2026-03-20 | Hero built in DevotionalPage.tsx with gradient bg, Caveat h1, date row with ChevronLeft/Right arrows (44px touch targets), navigateDay with bounds [-7,0], clean URL for day=0. |
| 5 | Content sections | [COMPLETE] | 2026-03-20 | All 5 sections: quote (Lora italic + decorative `"`), passage (inline verses + sup numbers), reflection (Inter paragraphs), prayer (Closing Prayer label + Lora italic), question card (frosted glass bg-white/5). max-w-2xl container, border-t dividers. questionRef added for Step 8. |
| 6 | Day browsing (swipe + URL) | [COMPLETE] | 2026-03-20 | Created `hooks/useSwipe.ts` (touch gesture hook, 50px threshold). Integrated into DevotionalPage wrapper div. Swipe left=next day, right=prev day. No preventDefault, no scroll interference. |
| 7 | Action buttons | [COMPLETE] | 2026-03-20 | 3 action buttons: Journal (auth-gated via useAuthModal), Share (clipboard + toast), Read Aloud (useReadAloud hook directly, custom dark-theme button with play/pause/resume states). buildReadAloudText helper excludes verse numbers. Responsive flex-col mobile / flex-row desktop. |
| 8 | Reading completion tracking | [COMPLETE] | 2026-03-20 | IntersectionObserver on questionRef (threshold 0.5), writes to `wr_devotional_reads` localStorage (YYYY-MM-DD via en-CA locale). Auth-gated (no localStorage for logged-out). Only fires for dayOffset=0. FIFO trim at 365. Completion badge (Check icon + "Completed") in hero next to date. |
| 9 | Navbar integration | [COMPLETE] | 2026-03-20 | Added "Daily Devotional" with Sparkles icon at index 1 (between Daily Hub and Prayer Wall). Extended NAV_LINKS type to support optional `icon` field. Icon renders in both desktop nav (14px) and mobile drawer (16px). |
| 10 | Landing page teaser | [COMPLETE] | 2026-03-20 | Created `components/DevotionalTeaser.tsx` (dark bg, Lora heading, today's title, CTA link). Inserted in Home.tsx between TodaysVerseSection and GrowthTeasersSection. |
| 11 | Comprehensive tests | [COMPLETE] | 2026-03-20 | Created: `data/__tests__/devotionals.test.ts` (17 tests), `hooks/__tests__/useSwipe.test.ts` (4 tests), `pages/__tests__/DevotionalPage.test.tsx` (24 tests). Modified: `components/__tests__/Navbar.test.tsx` (+5 tests), `pages/__tests__/Home.test.tsx` (+4 tests, fixed footer/provider wrapping). All 105 tests pass. 2 pre-existing dashboard test failures unchanged. |
