# Implementation Plan: Bible Landing Composition

**Spec:** `_specs/bible-landing-composition.md`
**Date:** 2026-04-07
**Branch:** `claude/feature/bible-landing-composition`
**Design System Reference:** `_plans/recon/design-system.md` (loaded — captured 2026-04-05, fresh)
**Recon Report:** not applicable
**Master Spec Plan:** N/A — first spec in the Bible Redesign wave

---

## Architecture Context

This feature replaces the current `/bible` page (`BibleBrowser.tsx`, 84 lines) with a composed landing page that surfaces resume reading, today's plan, verse of the day, and quick actions. All data is read-only from localStorage — BB-0 reads but never writes to the new `wr_bible_*` keys (write logic is in downstream specs).

**Existing files to understand:**

1. **`frontend/src/pages/BibleBrowser.tsx`** (84 lines) — current page using `Layout`, `ATMOSPHERIC_HERO_BG`, `GRADIENT_TEXT_STYLE`, `SegmentedControl`, `BibleBooksMode`, `BibleSearchMode`, `HighlightsNotesSection`. Uses broken `font-script` on "Bible" in heading. Replaced by `BibleLanding` at `/bible` route.
2. **`frontend/src/components/skeletons/BibleBrowserSkeleton.tsx`** (32 lines) — current skeleton with OT/NT book list placeholders. Replaced with a new landing-shaped skeleton.
3. **`frontend/src/App.tsx`** (lines 63-64, 180-181) — lazy import of `BibleBrowser` and route at `/bible`. Also `/bible/:book/:chapter` → `BibleReader`.
4. **`frontend/src/components/Layout.tsx`** (38 lines) — wrapper with `<Navbar>` + `<main>` + `<SiteFooter>`. Optional `hero` and `dark` props. BibleBrowser renders without `hero` prop (inline hero section with ATMOSPHERIC_HERO_BG padding).
5. **`frontend/src/components/PageHero.tsx`** (58 lines) — exports `ATMOSPHERIC_HERO_BG` constant (`backgroundColor: '#0f0a1e', backgroundImage: 'radial-gradient(ellipse at top center, rgba(109, 40, 217, 0.15) 0%, transparent 70%)'`). Uses `GRADIENT_TEXT_STYLE` on heading.
6. **`frontend/src/components/homepage/FrostedCard.tsx`** (39 lines) — `bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] rounded-2xl p-6` with hover elevation when `onClick` is provided. Supports `as` prop for semantic elements.
7. **`frontend/src/constants/gradients.tsx`** — `GRADIENT_TEXT_STYLE` CSSProperties object, `WHITE_PURPLE_GRADIENT`, `renderWithScriptAccent()`.
8. **`frontend/src/constants/bible.ts`** (206 lines) — `BIBLE_BOOKS` array with 66 entries: `{ name, slug, chapters, testament, category, hasFullText }`. Book names: "Genesis", "Psalms", "John", etc. Slugs are lowercase.
9. **`frontend/src/lib/time.ts`** — `timeAgo(isoDate: string)` returns relative time like "5 minutes ago", "2 days ago". Takes ISO date string.
10. **`frontend/src/components/homepage/SectionHeading.tsx`** — 2-line heading: `topLine` (white, smaller) + `bottomLine` (gradient, larger). Backward-compatible `heading` prop for single-line. Used by homepage sections.

**Directory conventions:**

- Page components: `src/pages/`
- Feature-specific components: `src/components/bible/` (25 existing files)
- Shared UI components: `src/components/homepage/` (FrostedCard, SectionHeading, etc.)
- Data files: `src/data/bible/` (existing: `books/json/` with 66 book JSONs)
- Utility modules: `src/lib/` (22 existing files)
- Types: `src/types/`
- Tests: `__tests__/` adjacent to source files
- Skeletons: `src/components/skeletons/`

**Test patterns (from `HighlightsNotesSection.test.tsx` + `DailyHub.test.tsx`):**

- Import `{ render, screen, fireEvent }` from `@testing-library/react`
- Import `{ MemoryRouter }` from `react-router-dom`
- Import `{ describe, expect, it, vi, beforeEach }` from `vitest`
- Mock `useNavigate` via `vi.mock('react-router-dom', ...)`
- Wrap in `<MemoryRouter>` for routing components
- Use `screen.getByText()`, `screen.queryByText()`, `screen.getByRole()`
- Page-level tests may need `ToastProvider`, `AuthModalProvider` wrapping
- `localStorage.clear()` in `beforeEach`

---

## Auth Gating Checklist

**No auth gating required.** The entire Bible landing page is public — no actions require login. All content renders identically for logged-in and logged-out users.

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| All page content | Public — no auth gates | N/A | N/A |

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Page background | background | `bg-dashboard-dark` (#0f0a1e) | design-system.md |
| Hero background | background | `ATMOSPHERIC_HERO_BG` — `radial-gradient(ellipse at top center, rgba(109, 40, 217, 0.15) 0%, transparent 70%)` over `#0f0a1e` | PageHero.tsx line 10 |
| Hero H1 | font | Inter 48px bold (lg:text-5xl), 30px (text-3xl) mobile | design-system.md Variant 3 |
| Hero H1 | color | `GRADIENT_TEXT_STYLE` — `linear-gradient(223deg, #FFFFFF 0%, #8B5CF6 100%)` via `background-clip: text` | design-system.md |
| Hero subtitle | font | Inter 16px (text-base sm:text-lg), 400 weight | design-system.md |
| Hero subtitle | color | `text-white/60` | design-system.md |
| Hero padding | padding | `pt-32 pb-8 sm:pt-36 sm:pb-12 lg:pt-40` px-4 | design-system.md PageHero |
| FrostedCard | background | `bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] rounded-2xl p-6` | FrostedCard.tsx |
| FrostedCard | shadow | `shadow-[0_0_25px_rgba(139,92,246,0.06),0_4px_20px_rgba(0,0,0,0.3)]` | FrostedCard.tsx |
| FrostedCard hover | bg + border | `hover:bg-white/[0.09] hover:border-white/[0.18]` | FrostedCard.tsx |
| Streak chip | style | `bg-white/[0.06] border border-white/[0.12] rounded-full px-3 py-1.5` | spec |
| Primary text | color | `text-white` | design-system.md |
| Muted text | color | `text-white/60` | design-system.md |
| Footer note | color | `text-white/50` | spec |
| Search input | style | `bg-white/[0.06] border border-white/[0.12] rounded-xl` | spec |
| Progress bar track | background | `bg-white/[0.08]` | spec |
| Progress bar fill | background | `bg-primary` (#6D28D9) | spec |
| Content container | max-width | `max-w-4xl` for card pairs, `max-w-2xl` for VOTD + search | spec |
| Section dividers | border | Not used — this is an inner page, not homepage | design-system.md |

---

## Design System Reminder

**Project-specific quirks that `/execute-plan` displays before every UI step:**

- Worship Room uses `GRADIENT_TEXT_STYLE` (white-to-purple gradient via `background-clip: text`) for hero and section headings on dark backgrounds. Caveat font has been deprecated for headings — used only for the logo.
- Inner pages using `PageHero` or `ATMOSPHERIC_HERO_BG` use `bg-dashboard-dark` (#0f0a1e) as the page background — NOT `bg-hero-bg` (#08051A). The Daily Hub uses `bg-hero-bg`, but all other inner pages use `bg-dashboard-dark`.
- FrostedCard is the canonical card component — do NOT use hand-rolled cards with soft shadows and 8px radius (deprecated). Use `FrostedCard` with `onClick` prop for interactive cards (enables hover elevation).
- The `font-script` (Caveat) accent on "Bible" in the current hero is DEPRECATED. The new hero uses plain Inter text with `GRADIENT_TEXT_STYLE` — no script accent.
- White pill CTA Pattern 1 (inline, smaller): `inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-primary hover:bg-gray-100`. For any inline CTA buttons on cards.
- `timeAgo()` from `@/lib/time` takes an ISO date string. The `wr_bible_last_read.timestamp` is epoch ms — convert with `new Date(timestamp).toISOString()` before passing to `timeAgo()`.
- All inner pages follow the same Layout pattern: `<Layout>` wrapping a `<div className="min-h-screen bg-dashboard-dark">` with an inline hero section. The hero is NOT passed as Layout's `hero` prop — it's rendered inside children.
- Frosted glass cards: `bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] rounded-2xl` with dual box-shadow. Use the `FrostedCard` component, not a hand-rolled card.

---

## Shared Data Models

### TypeScript Interfaces (new, created in Step 1)

```typescript
// src/types/bible-landing.ts

/** Stored in wr_bible_last_read by BB-4 (Reader spec) */
export interface LastRead {
  book: string      // BIBLE_BOOKS name, e.g. "John"
  chapter: number   // 1-indexed
  verse: number     // 1-indexed, last viewed verse
  timestamp: number // epoch ms (Date.now())
}

/** Stored in wr_bible_active_plans by BB-21 (Plans spec) */
export interface ActivePlan {
  planId: string
  currentDay: number
  totalDays: number
  planName: string
  todayReading: string  // e.g. "John 3:1-21"
  startedAt: number     // epoch ms
}

/** Stored in wr_bible_streak by BB-17 (Streak spec) */
export interface BibleStreak {
  count: number
  lastReadDate: string  // ISO date string, e.g. "2026-04-07"
}

/** Single entry in votd.json */
export interface VotdEntry {
  reference: string  // e.g. "Psalm 23:1"
  book: string       // BIBLE_BOOKS name, e.g. "Psalms"
  chapter: number
  verse: number
  text: string       // WEB translation text
}
```

### localStorage Keys This Spec Touches

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_bible_last_read` | Read only | Resume Reading card data (written by BB-4) |
| `wr_bible_active_plans` | Read only | Today's Plan card data (written by BB-21) |
| `wr_bible_streak` | Read only | Reading streak chip data (written by BB-17) |

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | < 640px | Quick actions stack vertically (1 column). All cards full width. Search input full width. Hero text `text-3xl`. Resume Reading + Today's Plan stack in single column. |
| Tablet | 640-1024px | Quick actions 3-column row. Resume Reading + Today's Plan side by side when both present. Hero text `text-4xl`. |
| Desktop | > 1024px | Quick actions 3-column row. Resume Reading + Today's Plan side by side in `max-w-4xl`. Hero text `text-5xl`. VOTD + search use `max-w-2xl`. |

---

## Inline Element Position Expectations (UI features with inline rows)

| Element Group | Elements | Expected y-alignment | Wrap Tolerance |
|---------------|----------|---------------------|----------------|
| Quick actions row | Browse Books card, My Bible card, Reading Plans card | Same y ±5px at 1440px and 768px | Stack vertically below 640px |
| Resume + Plan cards | ResumeReadingCard, TodaysPlanCard | Same y ±5px at 768px and 1440px | Stack vertically below 640px |

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| Hero → streak chip / first card section | 32px (`space-y-8`) | codebase inspection — inner pages use `pb-8` on hero |
| Card section → VOTD | 32px (`space-y-8`) | consistent vertical spacing |
| VOTD → Quick actions | 32px (`space-y-8`) | consistent vertical spacing |
| Quick actions → Search | 32px (`space-y-8`) | consistent vertical spacing |
| Search → Footer note | 24px (`mt-6`) | smaller gap to footer-level element |
| Footer note → SiteFooter | 64px (`pb-16`) | existing inner page bottom padding pattern |

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] Branch `claude/feature/bible-landing-composition` exists and is checked out
- [ ] `pnpm install` has been run and dependencies are current
- [ ] The existing BibleBrowser.tsx renders without errors at `/bible` (baseline)
- [ ] No other specs modify the `/bible` route simultaneously
- [ ] The VOTD seed file (366 entries) will be fully populated — spec acceptance criteria requires "at least 366 entries" even though Out of Scope says "starter set." This plan generates all 366.
- [ ] Design system values are verified from recon + codebase inspection
- [ ] No deprecated patterns used (Caveat headings, soft-shadow cards, animate-glow-pulse)
- [ ] Recon report loaded if available — not applicable for this spec (no external recon)

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| "Browse Books" quick action destination | Navigates to `/bible/browse` which renders `BibleBooksMode` inside `Layout` | Spec says "opens existing book browser" — BibleBooksMode is functional, so the route renders real content rather than a stub "coming soon" message. Follows the same navigation pattern as My Bible and Reading Plans. |
| Relative timestamp format | Uses existing `timeAgo()` from `@/lib/time` | Spec examples ("5 minutes ago", "Yesterday") are illustrative. `timeAgo()` returns "1 day ago" not "Yesterday" — acceptable variance. |
| Multiple active plans display | Show plan with earliest incomplete `currentDay`; "+N more" chip links to `/bible/plans` | Spec requirement. Sort by `currentDay / totalDays` ascending (least progress first). |
| VOTD deterministic selector | Day-of-year modulo 366 | Spec requirement. Dec 31 in non-leap years = day 365 → index 365 (last entry). Leap year Feb 29 = day 60. |
| SSR/hydration safety | All localStorage reads wrapped in `typeof window !== 'undefined'` check. First render returns null/empty, `useEffect` hydrates on mount. | Spec NFR: "No layout shift on hydration." Using `useState` + `useEffect` pattern. |
| BibleBrowser.tsx disposition | File kept but no longer routed. Not deleted — may be referenced by future specs. | Spec says components inside it (BibleBooksMode, BibleSearchMode) are reused. The page file becomes dead code but removing it is outside BB-0 scope. |
| Streak chip hidden when count is 0 OR key missing | Both cases hide the chip entirely | Spec requirement: "Hidden when streak is 0." Missing key = no streak = hide. |
| VOTD share icon | Console log stub: `console.log('Share VOTD:', reference)` | Spec: "BB-0 stubs the share icon with a console log." BB-13 builds real sharing. |
| Streak chip click | Console log stub: `console.log('Streak chip clicked')` | Spec: "BB-17 builds the streak detail modal." |

---

## Implementation Steps

### Step 1: TypeScript Types + Landing State Reader

**Objective:** Create the shared type interfaces and SSR-safe localStorage reader module that all landing components depend on.

**Files to create:**
- `frontend/src/types/bible-landing.ts` — `LastRead`, `ActivePlan`, `BibleStreak`, `VotdEntry` interfaces
- `frontend/src/lib/bible/landingState.ts` — `getLastRead()`, `getActivePlans()`, `getBibleStreak()` functions
- `frontend/src/lib/bible/__tests__/landingState.test.ts` — unit tests

**Details:**

`bible-landing.ts` — Export the 4 interfaces exactly as defined in the Shared Data Models section above.

`landingState.ts` — SSR-safe localStorage readers:

```typescript
import type { LastRead, ActivePlan, BibleStreak } from '@/types/bible-landing'

export function getLastRead(): LastRead | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem('wr_bible_last_read')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    // Validate required fields
    if (!parsed.book || !parsed.chapter || !parsed.timestamp) return null
    return parsed as LastRead
  } catch {
    return null
  }
}

export function getActivePlans(): ActivePlan[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem('wr_bible_active_plans')
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function getBibleStreak(): BibleStreak | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem('wr_bible_streak')
    if (!raw) return null
    return JSON.parse(raw) as BibleStreak
  } catch {
    return null
  }
}
```

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- Do NOT write to localStorage — BB-0 is read-only
- Do NOT throw on malformed JSON — return null/empty gracefully
- Do NOT import from components — this is a pure data module

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `getLastRead returns null when key missing` | unit | Verify null return with empty localStorage |
| `getLastRead parses valid data` | unit | Set valid JSON, verify parsed object |
| `getLastRead returns null for malformed JSON` | unit | Set invalid string, verify null return |
| `getLastRead returns null for missing required fields` | unit | Set JSON missing `book`, verify null |
| `getActivePlans returns empty array when key missing` | unit | Verify [] return |
| `getActivePlans parses valid array` | unit | Set valid array JSON, verify parsed |
| `getActivePlans returns empty array for non-array JSON` | unit | Set `"hello"`, verify [] |
| `getBibleStreak returns null when key missing` | unit | Verify null return |
| `getBibleStreak parses valid data` | unit | Set valid JSON, verify parsed |

**Expected state after completion:**
- [ ] `bible-landing.ts` exports 4 interfaces
- [ ] `landingState.ts` exports 3 functions, all SSR-safe
- [ ] 9 tests pass

---

### Step 2: VOTD Seed File + Selector Utility

**Objective:** Create the 366-entry VOTD JSON seed file and the deterministic per-date selector utility.

**Files to create:**
- `frontend/src/data/bible/votd.json` — 366 curated WEB verse entries
- `frontend/src/lib/bible/votdSelector.ts` — `getTodaysBibleVotd(date?)` function
- `frontend/src/lib/bible/__tests__/votdSelector.test.ts` — unit tests

**Details:**

`votd.json` — Array of 366 objects, one per day-of-year (index 0-365). Each entry:

```json
{
  "reference": "Psalm 23:1",
  "book": "Psalms",
  "chapter": 23,
  "verse": 1,
  "text": "The LORD is my shepherd; I shall not want."
}
```

The `book` field must match `BIBLE_BOOKS[n].name` exactly from `constants/bible.ts`. All verse text is WEB (World English Bible) translation. Curate a balanced mix across Old and New Testaments, covering themes of peace, hope, comfort, strength, praise, trust, wisdom, and love. No duplicate verses.

`votdSelector.ts`:

```typescript
import type { VotdEntry } from '@/types/bible-landing'
import votdData from '@/data/bible/votd.json'

function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0)
  const diff = date.getTime() - start.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

export function getTodaysBibleVotd(date: Date = new Date()): VotdEntry {
  const dayOfYear = getDayOfYear(date) // 1-366
  const index = (dayOfYear - 1) % 366  // 0-365
  return votdData[index] as VotdEntry
}
```

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- Do NOT use Math.random() — must be deterministic per date
- Do NOT reference the existing `verse-of-the-day.ts` system — these are independent datasets
- Do NOT include verses from non-WEB translations
- Do NOT use book names that don't match `BIBLE_BOOKS` exactly (e.g., use "Psalms" not "Psalm")

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `returns same verse for same date` | unit | Call twice with same Date, verify identical result |
| `returns different verse for different dates` | unit | Call with Jan 1 vs Jan 2, verify different results |
| `handles Dec 31 non-leap year` | unit | Pass Dec 31 2025, verify valid entry returned |
| `handles Feb 29 leap year` | unit | Pass Feb 29 2024, verify valid entry returned |
| `returns valid VotdEntry shape` | unit | Verify result has reference, book, chapter, verse, text |
| `votd.json has 366 entries` | unit | Import JSON, verify length === 366 |
| `all book names match BIBLE_BOOKS` | unit | Import JSON + BIBLE_BOOKS, verify every entry.book is in BIBLE_BOOKS names |

**Expected state after completion:**
- [ ] `votd.json` contains exactly 366 entries with valid WEB verse text
- [ ] `getTodaysBibleVotd()` returns deterministic results
- [ ] 7 tests pass

---

### Step 3: BibleHero Component

**Objective:** Create the hero section with two-line heading treatment and subhead, following the Atmospheric PageHero pattern (Variant 3).

**Files to create:**
- `frontend/src/components/bible/landing/BibleHero.tsx`
- `frontend/src/components/bible/landing/__tests__/BibleHero.test.tsx`

**Details:**

Follow the existing `PageHero` Variant 3 pattern (from `PageHero.tsx` and design-system.md) but with a two-line heading. Do NOT use `PageHero` component directly — the two-line treatment requires custom markup (the PageHero component renders a single `h1`).

```tsx
import { ATMOSPHERIC_HERO_BG } from '@/components/PageHero'
import { GRADIENT_TEXT_STYLE } from '@/constants/gradients'

export function BibleHero() {
  return (
    <section
      aria-labelledby="bible-hero-heading"
      className="relative flex w-full flex-col items-center px-4 pt-32 pb-8 text-center antialiased sm:pt-36 sm:pb-12 lg:pt-40"
      style={ATMOSPHERIC_HERO_BG}
    >
      <h1
        id="bible-hero-heading"
        className="px-1 sm:px-2 text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl"
        style={GRADIENT_TEXT_STYLE}
      >
        <span className="block">The Word of God</span>
        <span className="block mt-1">Open to You</span>
      </h1>
      <p className="mx-auto mt-4 max-w-lg text-base text-white/60 sm:text-lg">
        No account needed. Free forever. The World English Bible, always here for you.
      </p>
    </section>
  )
}
```

**Responsive behavior:**
- Desktop (1440px): `text-5xl` heading (48px), `text-lg` subhead, `pt-40`
- Tablet (768px): `text-4xl` heading (36px), `text-lg` subhead, `pt-36`
- Mobile (375px): `text-3xl` heading (30px), `text-base` subhead, `pt-32`

**Guardrails (DO NOT):**
- Do NOT use `font-script` (Caveat) on any text — deprecated for headings
- Do NOT use `renderWithScriptAccent()` — no script accent
- Do NOT add a CTA button in the hero — the cards below are the CTAs (spec requirement)
- Do NOT use `font-serif italic` for the subtitle — use Inter (per inner page subtitle pattern being plain text, not Lora italic)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `renders heading text` | unit | Verify "The Word of God" and "Open to You" visible |
| `renders subhead text` | unit | Verify subhead about no-account promise |
| `has correct aria-labelledby` | unit | Verify `id="bible-hero-heading"` and `aria-labelledby` match |
| `does not use font-script` | unit | Query for `.font-script` class — should not exist |

**Expected state after completion:**
- [ ] BibleHero renders the two-line heading with gradient text
- [ ] Subhead renders with `text-white/60`
- [ ] No Caveat font usage
- [ ] 4 tests pass

---

### Step 4: StreakChip Component

**Objective:** Create the reading streak pill that shows count + flame icon, hidden when count is 0 or data missing.

**Files to create:**
- `frontend/src/components/bible/landing/StreakChip.tsx`
- `frontend/src/components/bible/landing/__tests__/StreakChip.test.tsx`

**Details:**

```tsx
import { Flame } from 'lucide-react'
import type { BibleStreak } from '@/types/bible-landing'

interface StreakChipProps {
  streak: BibleStreak | null
  onClick?: () => void
}

export function StreakChip({ streak, onClick }: StreakChipProps) {
  if (!streak || streak.count <= 0) return null

  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] border border-white/[0.12] px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-white/[0.09] min-h-[44px]"
    >
      <Flame className="h-4 w-4 text-orange-400" aria-hidden="true" />
      <span>{streak.count} day streak</span>
    </button>
  )
}
```

**Responsive behavior:**
- All breakpoints: same size, centered below hero

**Guardrails (DO NOT):**
- Do NOT render anything when streak is null, undefined, or count <= 0
- Do NOT use emoji for the flame — use Lucide `Flame` icon with `aria-hidden="true"`
- Do NOT implement the streak detail modal — BB-17 builds that. Just log to console on click.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `renders streak count` | unit | Pass `{ count: 5, lastReadDate: '...' }`, verify "5 day streak" |
| `renders flame icon` | unit | Verify Flame icon present |
| `hidden when streak is null` | unit | Pass null, verify nothing rendered |
| `hidden when count is 0` | unit | Pass `{ count: 0 }`, verify nothing rendered |
| `calls onClick when clicked` | unit | Pass mock onClick, click button, verify called |
| `has minimum 44px tap target` | unit | Verify `min-h-[44px]` class present |

**Expected state after completion:**
- [ ] StreakChip renders with flame icon and count
- [ ] Hidden when data missing or count is 0
- [ ] 6 tests pass

---

### Step 5: ResumeReadingCard Component

**Objective:** Create the "Pick up where you left off" card that shows when `wr_bible_last_read` exists, plus the "Start your first reading" empty state card.

**Files to create:**
- `frontend/src/components/bible/landing/ResumeReadingCard.tsx`
- `frontend/src/components/bible/landing/__tests__/ResumeReadingCard.test.tsx`

**Details:**

The component receives `lastRead` as a prop (read from `landingState.ts` by the parent page). When `lastRead` is null, render the first-run "Start your first reading" card.

```tsx
import { BookOpen } from 'lucide-react'
import { Link } from 'react-router-dom'
import { FrostedCard } from '@/components/homepage/FrostedCard'
import { timeAgo } from '@/lib/time'
import type { LastRead } from '@/types/bible-landing'

interface ResumeReadingCardProps {
  lastRead: LastRead | null
}
```

**When `lastRead` exists:** FrostedCard (as `<article>`) wrapping a Link to `/bible/${book.slug}/${lastRead.chapter}`. Show:
- Label: "Pick up where you left off" in `text-sm text-white/60`
- Book + chapter: e.g. "John 3" in `text-xl font-bold text-white`
- Relative timestamp via `timeAgo(new Date(lastRead.timestamp).toISOString())`

The Link should be the full card tap target (wrap the FrostedCard content in an `<a>`). Look up the book slug from `BIBLE_BOOKS` by matching `lastRead.book` to `BIBLE_BOOKS[n].name`.

**When `lastRead` is null (first-run):** FrostedCard with BookOpen icon + "Start your first reading" heading + "Open the Bible and begin anywhere" description + link to `/bible/browse`.

**Responsive behavior:**
- Desktop/Tablet: renders as one of two side-by-side cards in a flex container (parent controls layout)
- Mobile: full width, stacked

**Guardrails (DO NOT):**
- Do NOT write to `wr_bible_last_read` — read-only in BB-0
- Do NOT use `useNavigate` for the card link — use `<Link>` for accessibility and SSR
- Do NOT hardcode book slugs — look up from `BIBLE_BOOKS` constant

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `renders resume state with book and chapter` | unit | Pass lastRead `{ book: "John", chapter: 3, verse: 16, timestamp: Date.now() }`, verify "John 3" and "Pick up where you left off" |
| `links to correct chapter route` | unit | Verify href is `/bible/john/3` |
| `shows relative timestamp` | unit | Pass timestamp 5 min ago, verify "5 minutes ago" |
| `renders first-run state when lastRead is null` | unit | Pass null, verify "Start your first reading" |
| `first-run links to /bible/browse` | unit | Pass null, verify link href |

**Expected state after completion:**
- [ ] Card shows resume state with book, chapter, timestamp
- [ ] Card shows first-run state when data missing
- [ ] Both states link to correct routes
- [ ] 5 tests pass

---

### Step 6: TodaysPlanCard Component

**Objective:** Create the active reading plan card with progress bar, plus the "Try a reading plan" empty state card.

**Files to create:**
- `frontend/src/components/bible/landing/TodaysPlanCard.tsx`
- `frontend/src/components/bible/landing/__tests__/TodaysPlanCard.test.tsx`

**Details:**

Receives `plans` as a prop (from `landingState.ts`). When array is empty, render the "Try a reading plan" first-run card.

**When plans exist:** Show the plan with the earliest incomplete day (sort by `currentDay / totalDays` ascending, take first). FrostedCard with:
- Plan name in `text-lg font-bold text-white`
- "Day X of Y" in `text-sm text-white/60`
- Today's reading reference in `text-white`
- Progress bar: `role="progressbar"` with `aria-valuenow={currentDay}`, `aria-valuemin={1}`, `aria-valuemax={totalDays}`. Track: `bg-white/[0.08] h-1.5 rounded-full`. Fill: `bg-primary rounded-full` with width `${(currentDay / totalDays) * 100}%`.
- Link to `/reading-plans/${planId}` (existing route) for the tapped card
- When `plans.length > 1`: small "+N more" pill linking to `/bible/plans`

**When plans is empty (first-run):** FrostedCard with ListChecks icon + "Try a reading plan" heading + "Choose from 10 guided plans" description + link to `/bible/plans`.

**Responsive behavior:**
- Same as ResumeReadingCard — controlled by parent flex container

**Guardrails (DO NOT):**
- Do NOT write to `wr_bible_active_plans`
- Do NOT forget `role="progressbar"` with ARIA attributes — spec NFR requires this
- Do NOT use `<div>` for the progress bar container without the proper role

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `renders plan name and day progress` | unit | Pass 1 plan, verify name and "Day 3 of 14" |
| `renders progress bar with correct ARIA` | unit | Verify `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax` |
| `renders today's reading reference` | unit | Pass plan with `todayReading: "John 3:1-21"`, verify visible |
| `links to plan detail route` | unit | Verify href to `/reading-plans/planId` |
| `shows +N more chip when multiple plans` | unit | Pass 3 plans, verify "+2 more" chip visible |
| `+N more chip links to /bible/plans` | unit | Verify chip href |
| `renders first-run state when no plans` | unit | Pass [], verify "Try a reading plan" |
| `first-run links to /bible/plans` | unit | Verify link href |

**Expected state after completion:**
- [ ] Plan card renders with name, progress, today's reading, progress bar
- [ ] Multiple plans show "+N more" chip
- [ ] First-run state renders when array empty
- [ ] Progress bar has correct ARIA
- [ ] 8 tests pass

---

### Step 7: VerseOfTheDay Component

**Objective:** Create the always-visible VOTD card with verse text, reference, share stub, and "Read in context" link.

**Files to create:**
- `frontend/src/components/bible/landing/VerseOfTheDay.tsx`
- `frontend/src/components/bible/landing/__tests__/VerseOfTheDay.test.tsx`

**Details:**

Uses `getTodaysBibleVotd()` from Step 2 to get today's verse. Renders a FrostedCard with:
- Small label: "Verse of the Day" in `text-xs font-medium uppercase tracking-widest text-white/50`
- Verse text in `font-serif italic text-lg text-white/80 leading-relaxed` (Lora — this IS scripture display, not prose)
- Reference in `text-sm font-semibold text-white/60`
- Share icon button (Lucide `Share2`): `onClick` logs `console.log('Share VOTD:', entry.reference)` — stub for BB-13
- "Read in context" link: navigates to `/bible/${book.slug}/${entry.chapter}`. Look up slug from `BIBLE_BOOKS`.

```tsx
import { Share2, BookOpen } from 'lucide-react'
import { Link } from 'react-router-dom'
import { FrostedCard } from '@/components/homepage/FrostedCard'
import { getTodaysBibleVotd } from '@/lib/bible/votdSelector'
import { BIBLE_BOOKS } from '@/constants/bible'
```

**Responsive behavior:**
- Desktop: `max-w-2xl mx-auto` for comfortable reading line length
- Tablet/Mobile: full width with `px-4` side padding (from parent container)

**Guardrails (DO NOT):**
- Do NOT implement real sharing — console.log stub only (BB-13)
- Do NOT use `text-white` for verse text — use `text-white/80` to match Lora scripture display pattern
- Do NOT make the VOTD conditional — it always renders (spec requirement)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `renders verse text` | unit | Mock votdSelector, verify verse text visible |
| `renders verse reference` | unit | Verify reference like "Psalm 23:1" visible |
| `renders "Verse of the Day" label` | unit | Verify label text |
| `"Read in context" links to correct chapter` | unit | Verify href matches `/bible/{slug}/{chapter}` |
| `share icon logs to console on click` | unit | Spy on console.log, click share, verify called |
| `share button has min 44px tap target` | unit | Verify `min-h-[44px]` or equivalent sizing |

**Expected state after completion:**
- [ ] VOTD always renders with today's verse
- [ ] "Read in context" links to the correct Bible chapter
- [ ] Share icon logs to console (stub)
- [ ] 6 tests pass

---

### Step 8: QuickActionsRow + BibleSearchEntry

**Objective:** Create the 3-card quick actions row and the full-width search input.

**Files to create:**
- `frontend/src/components/bible/landing/QuickActionsRow.tsx`
- `frontend/src/components/bible/landing/BibleSearchEntry.tsx`
- `frontend/src/components/bible/landing/__tests__/QuickActionsRow.test.tsx`
- `frontend/src/components/bible/landing/__tests__/BibleSearchEntry.test.tsx`

**Details:**

**QuickActionsRow:** Three equal `FrostedCard` cards with `onClick` handlers (enabling hover elevation), each with a Lucide icon, label, and one-line description:

1. **Browse Books** — `BookOpen` icon, "Browse Books", "Explore all 66 books". Navigates to `/bible/browse`.
2. **My Bible** — `Bookmark` icon, "My Bible", "Highlights, notes & bookmarks". Navigates to `/bible/my`.
3. **Reading Plans** — `ListChecks` icon, "Reading Plans", "Guided daily reading". Navigates to `/bible/plans`.

Layout: 3-column grid on tablet+ (`grid grid-cols-1 sm:grid-cols-3 gap-4`), stacking vertically on mobile. Each card: FrostedCard with `onClick={() => navigate(route)}` for hover effects, plus an inner `<Link>` for accessibility.

**BibleSearchEntry:** Full-width input with `Search` icon:

```tsx
import { Search } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export function BibleSearchEntry() {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = query.trim()
    if (!trimmed) return  // empty input does nothing
    navigate(`/bible/search?q=${encodeURIComponent(trimmed)}`)
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto w-full max-w-2xl">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search the Bible — verses, words, phrases"
          aria-label="Search the Bible"
          className="w-full rounded-xl bg-white/[0.06] border border-white/[0.12] py-3.5 pl-12 pr-4 text-white placeholder:text-white/40 focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-white/20 min-h-[44px]"
        />
      </div>
    </form>
  )
}
```

**Responsive behavior:**
- Desktop: Quick actions 3-column row. Search input `max-w-2xl mx-auto`.
- Tablet: Quick actions 3-column row.
- Mobile: Quick actions stack vertically (1 column). Search full width.

**Inline position expectations:**
- Quick action cards must share y-coordinate at 768px and 1440px (±5px tolerance)

**Guardrails (DO NOT):**
- Do NOT navigate on empty search input submission — spec requirement
- Do NOT forget `aria-label` on the search input — spec NFR
- Do NOT use `<button>` for quick action cards if they're navigation — use `onClick` on FrostedCard + inner content for click handling, but ensure the card is keyboard accessible
- Do NOT use `encodeURI` — use `encodeURIComponent` for query strings

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `renders three quick action cards` | unit | Verify "Browse Books", "My Bible", "Reading Plans" visible |
| `Browse Books navigates to /bible/browse` | unit | Click card, verify navigate called with `/bible/browse` |
| `My Bible navigates to /bible/my` | unit | Click card, verify navigate called |
| `Reading Plans navigates to /bible/plans` | unit | Click card, verify navigate called |
| `cards have minimum 44px tap targets` | unit | Verify `min-h-[44px]` on each card |
| `search submits query to /bible/search` | unit | Type "love", submit form, verify navigate with `?q=love` |
| `search does nothing on empty submit` | unit | Submit empty, verify navigate NOT called |
| `search input has aria-label` | unit | Verify `aria-label="Search the Bible"` |

**Expected state after completion:**
- [ ] 3 quick action cards render with icons, labels, descriptions
- [ ] Each card navigates to correct route on click
- [ ] Search submits to `/bible/search?q=...` on Enter
- [ ] Empty search submission does nothing
- [ ] 8 tests pass

---

### Step 9: BibleLanding Page Composition

**Objective:** Create the BibleLanding page that composes all landing components, with SSR-safe localStorage hydration.

**Files to create:**
- `frontend/src/pages/BibleLanding.tsx`

**Details:**

The page reads localStorage via `landingState.ts` on mount (SSR-safe pattern: initialize state as null/empty, hydrate via `useEffect`), then passes data to child components.

```tsx
import { useState, useEffect } from 'react'
import { Layout } from '@/components/Layout'
import { SEO, SITE_URL } from '@/components/SEO'
import { BibleHero } from '@/components/bible/landing/BibleHero'
import { StreakChip } from '@/components/bible/landing/StreakChip'
import { ResumeReadingCard } from '@/components/bible/landing/ResumeReadingCard'
import { TodaysPlanCard } from '@/components/bible/landing/TodaysPlanCard'
import { VerseOfTheDay } from '@/components/bible/landing/VerseOfTheDay'
import { QuickActionsRow } from '@/components/bible/landing/QuickActionsRow'
import { BibleSearchEntry } from '@/components/bible/landing/BibleSearchEntry'
import { getLastRead, getActivePlans, getBibleStreak } from '@/lib/bible/landingState'

export function BibleLanding() {
  const [lastRead, setLastRead] = useState<LastRead | null>(null)
  const [plans, setPlans] = useState<ActivePlan[]>([])
  const [streak, setStreak] = useState<BibleStreak | null>(null)

  useEffect(() => {
    setLastRead(getLastRead())
    setPlans(getActivePlans())
    setStreak(getBibleStreak())
  }, [])

  return (
    <Layout>
      <SEO title="Read the Bible (WEB)" description="..." jsonLd={bibleBreadcrumbs} />
      <div className="min-h-screen bg-dashboard-dark">
        <BibleHero />

        <div className="mx-auto max-w-4xl space-y-8 px-4 pb-16">
          {/* Streak chip */}
          <div className="flex justify-center">
            <StreakChip streak={streak} onClick={() => console.log('Streak chip clicked')} />
          </div>

          {/* Resume Reading + Today's Plan — side by side on tablet+ */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ResumeReadingCard lastRead={lastRead} />
            <TodaysPlanCard plans={plans} />
          </div>

          {/* Verse of the Day */}
          <VerseOfTheDay />

          {/* Quick Actions */}
          <QuickActionsRow />

          {/* Search */}
          <BibleSearchEntry />

          {/* Footer note */}
          <p className="text-center text-sm text-white/50">
            World English Bible (WEB) — Public Domain — No account, ever.
          </p>
        </div>
      </div>
    </Layout>
  )
}
```

Preserve the existing SEO (`<SEO>` component) and JSON-LD breadcrumbs from the current BibleBrowser.

**Responsive behavior:**
- Desktop (1440px): `max-w-4xl` content container. Resume + Plan side-by-side. VOTD + search `max-w-2xl` (handled by child components).
- Tablet (768px): `max-w-4xl`. Resume + Plan side-by-side via `sm:grid-cols-2`.
- Mobile (375px): Everything stacks. Single column.

**Guardrails (DO NOT):**
- Do NOT read localStorage directly in the component — use `landingState.ts` functions
- Do NOT read localStorage during render (SSR unsafe) — use `useEffect` for hydration
- Do NOT add GlowBackground to this page — it's an inner page using `ATMOSPHERIC_HERO_BG` only
- Do NOT add HorizonGlow — that's Daily Hub only

**Test specifications:** (Page-level tests in Step 11)

**Expected state after completion:**
- [ ] BibleLanding page composes all child components
- [ ] localStorage data hydrates on mount without layout shift
- [ ] Footer note visible
- [ ] SSR-safe — first render shows empty/first-run states

---

### Step 10: Route Wiring + Stub Routes + Browse Page

**Objective:** Update App.tsx routing, create stub pages for `/bible/my`, `/bible/plans`, `/bible/search`, and the functional `/bible/browse` page.

**Files to modify:**
- `frontend/src/App.tsx` — update lazy import and add new routes

**Files to create:**
- `frontend/src/pages/BibleBrowse.tsx` — wraps `BibleBooksMode` in Layout
- `frontend/src/pages/BibleStub.tsx` — shared stub component for coming-soon pages

**Details:**

**App.tsx changes:**

1. Change the lazy import from `BibleBrowser` to `BibleLanding`:
```tsx
const BibleLanding = lazy(() => import('./pages/BibleLanding').then((m) => ({ default: m.BibleLanding })))
```

2. Add lazy imports for new route components:
```tsx
const BibleBrowse = lazy(() => import('./pages/BibleBrowse').then((m) => ({ default: m.BibleBrowse })))
const BibleStub = lazy(() => import('./pages/BibleStub').then((m) => ({ default: m.BibleStub })))
```

3. Update routes:
```tsx
<Route path="/bible" element={<Suspense fallback={<BibleLandingSkeleton />}><BibleLanding /></Suspense>} />
<Route path="/bible/browse" element={<Suspense fallback={<BibleBrowserSkeleton />}><BibleBrowse /></Suspense>} />
<Route path="/bible/my" element={<Suspense fallback={<RouteLoadingFallback />}><BibleStub page="my" /></Suspense>} />
<Route path="/bible/plans" element={<Suspense fallback={<RouteLoadingFallback />}><BibleStub page="plans" /></Suspense>} />
<Route path="/bible/search" element={<Suspense fallback={<RouteLoadingFallback />}><BibleStub page="search" /></Suspense>} />
{/* Keep existing: */}
<Route path="/bible/:book/:chapter" element={<BibleReader />} />
```

**BibleBrowse.tsx** — functional page wrapping `BibleBooksMode`:
```tsx
import { Layout } from '@/components/Layout'
import { BibleBooksMode } from '@/components/bible/BibleBooksMode'
import { ATMOSPHERIC_HERO_BG } from '@/components/PageHero'
import { GRADIENT_TEXT_STYLE } from '@/constants/gradients'
import { SEO } from '@/components/SEO'

export function BibleBrowse() {
  return (
    <Layout>
      <SEO title="Browse Books — Bible (WEB)" description="Browse all 66 books of the World English Bible." />
      <div className="min-h-screen bg-dashboard-dark">
        <section
          className="relative flex w-full flex-col items-center px-4 pt-32 pb-8 text-center antialiased sm:pt-36 sm:pb-12 lg:pt-40"
          style={ATMOSPHERIC_HERO_BG}
        >
          <h1 className="text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl" style={GRADIENT_TEXT_STYLE}>
            Browse Books
          </h1>
        </section>
        <div className="mx-auto max-w-5xl px-4 pb-16 lg:px-8">
          <BibleBooksMode />
        </div>
      </div>
    </Layout>
  )
}
```

**BibleStub.tsx** — shared stub for coming-soon pages:
```tsx
import { Layout } from '@/components/Layout'
import { ATMOSPHERIC_HERO_BG } from '@/components/PageHero'
import { GRADIENT_TEXT_STYLE } from '@/constants/gradients'
import { SEO } from '@/components/SEO'

const STUB_CONFIG = {
  my: { title: 'My Bible', message: 'My Bible — coming in BB-14', description: 'Your personal highlights, notes, and bookmarks.' },
  plans: { title: 'Reading Plans', message: 'Plans browser — coming in BB-21.5', description: 'Guided daily reading plans.' },
  search: { title: 'Bible Search', message: 'Search — coming in BB-42', description: 'Search the Bible by verses, words, and phrases.' },
} as const

interface BibleStubProps {
  page: keyof typeof STUB_CONFIG
}

export function BibleStub({ page }: BibleStubProps) {
  const config = STUB_CONFIG[page]
  return (
    <Layout>
      <SEO title={`${config.title} — Bible (WEB)`} description={config.description} />
      <div className="min-h-screen bg-dashboard-dark">
        <section
          className="relative flex w-full flex-col items-center px-4 pt-32 pb-8 text-center antialiased sm:pt-36 sm:pb-12 lg:pt-40"
          style={ATMOSPHERIC_HERO_BG}
        >
          <h1 className="text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl" style={GRADIENT_TEXT_STYLE}>
            {config.title}
          </h1>
        </section>
        <div className="flex min-h-[40vh] items-center justify-center px-4">
          <p className="text-lg text-white/50">{config.message}</p>
        </div>
      </div>
    </Layout>
  )
}
```

**Responsive behavior:**
- All stub routes: centered message on atmospheric dark background, responsive hero sizing

**Guardrails (DO NOT):**
- Do NOT delete `BibleBrowser.tsx` — it may be referenced by other code; leaving it as dead code is fine for BB-0
- Do NOT change the `/bible/:book/:chapter` route — BibleReader remains unchanged
- Do NOT forget to place `/bible/browse`, `/bible/my`, etc. BEFORE `/bible/:book/:chapter` in the route list to avoid route parameter collision
- Do NOT use `BibleStub` for `/bible/browse` — that page renders real content

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `BibleStub renders stub message for "my"` | unit | Render with `page="my"`, verify "My Bible — coming in BB-14" |
| `BibleStub renders stub message for "plans"` | unit | Render with `page="plans"`, verify message |
| `BibleStub renders stub message for "search"` | unit | Render with `page="search"`, verify message |
| `BibleBrowse renders BibleBooksMode` | unit | Verify BibleBooksMode content is rendered |

**Expected state after completion:**
- [ ] `/bible` renders BibleLanding (not BibleBrowser)
- [ ] `/bible/browse` renders BibleBooksMode in Layout
- [ ] `/bible/my`, `/bible/plans`, `/bible/search` render stub messages
- [ ] `/bible/:book/:chapter` still works (BibleReader unchanged)
- [ ] 4 tests pass

---

### Step 11: BibleLandingSkeleton

**Objective:** Replace the current BibleBrowserSkeleton with a landing-shaped skeleton that matches the new page layout.

**Files to modify:**
- `frontend/src/components/skeletons/BibleBrowserSkeleton.tsx` — rewrite to match new landing layout

**Details:**

Rename the component to `BibleLandingSkeleton` (update the export and the import in `App.tsx`). The skeleton should approximate the visual shape of the landing page:

```tsx
import { SkeletonBlock } from './SkeletonBlock'

export function BibleLandingSkeleton() {
  return (
    <div aria-busy="true" className="min-h-screen bg-dashboard-dark">
      <span className="sr-only">Loading Bible</span>
      {/* Hero placeholder */}
      <div className="flex flex-col items-center px-4 pt-32 pb-8 sm:pt-36 sm:pb-12 lg:pt-40">
        <SkeletonBlock height={48} width="280px" className="mb-2" />
        <SkeletonBlock height={48} width="220px" className="mb-4" />
        <SkeletonBlock height={20} width="360px" />
      </div>
      {/* Cards area */}
      <div className="mx-auto max-w-4xl space-y-8 px-4 pb-16">
        {/* Resume + Plan cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SkeletonBlock height={120} className="rounded-2xl" />
          <SkeletonBlock height={120} className="rounded-2xl" />
        </div>
        {/* VOTD */}
        <div className="mx-auto max-w-2xl">
          <SkeletonBlock height={160} className="rounded-2xl" />
        </div>
        {/* Quick actions */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SkeletonBlock height={100} className="rounded-2xl" />
          <SkeletonBlock height={100} className="rounded-2xl" />
          <SkeletonBlock height={100} className="rounded-2xl" />
        </div>
        {/* Search */}
        <div className="mx-auto max-w-2xl">
          <SkeletonBlock height={48} className="rounded-xl" />
        </div>
      </div>
    </div>
  )
}
```

Also update the import in `App.tsx` from `BibleBrowserSkeleton` to `BibleLandingSkeleton`.

**Responsive behavior:**
- Mobile: single column cards, full width blocks
- Tablet+: 2-column resume+plan, 3-column quick actions

**Guardrails (DO NOT):**
- Do NOT keep the old OT/NT book list skeleton shape — it doesn't match the new page

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `renders with aria-busy` | unit | Verify `aria-busy="true"` attribute |
| `renders sr-only loading text` | unit | Verify "Loading Bible" screen reader text |

**Expected state after completion:**
- [ ] Skeleton matches new landing page shape
- [ ] App.tsx uses updated skeleton name
- [ ] 2 tests pass

---

### Step 12: Page-Level Integration Tests

**Objective:** Write integration tests for the BibleLanding page composition covering all acceptance criteria.

**Files to create:**
- `frontend/src/pages/__tests__/BibleLanding.test.tsx`

**Details:**

Integration tests that render the full BibleLanding page and verify composition, conditional rendering, and navigation.

**Mock setup:**
- Mock `useNavigate` from react-router-dom
- Mock `getTodaysBibleVotd` to return a fixed verse
- Use `localStorage` directly to set/clear `wr_bible_*` keys

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `renders landing page without errors` | integration | Render in MemoryRouter, verify no crash |
| `empty state: shows first-run cards` | integration | Clear localStorage, verify "Start your first reading" and "Try a reading plan" cards, no streak chip |
| `resume state: shows Resume Reading card` | integration | Set `wr_bible_last_read` in localStorage, re-render, verify book + chapter visible |
| `plan state: shows Today's Plan card` | integration | Set `wr_bible_active_plans`, verify plan name + progress bar |
| `streak chip visible when count > 0` | integration | Set `wr_bible_streak` with count: 5, verify "5 day streak" |
| `streak chip hidden when count is 0` | integration | Set `wr_bible_streak` with count: 0, verify chip not rendered |
| `VOTD always renders` | integration | Verify verse text and reference from mocked votdSelector |
| `search submits to /bible/search` | integration | Type query, submit form, verify navigate called |
| `quick actions render all 3 cards` | integration | Verify "Browse Books", "My Bible", "Reading Plans" |
| `footer note visible` | integration | Verify "World English Bible (WEB)" text |
| `hero uses gradient text, no font-script` | integration | Verify heading visible, no `.font-script` class |
| `progress bar has correct ARIA attributes` | integration | Set plan data, verify `role="progressbar"` with aria-valuenow |

**Expected state after completion:**
- [ ] 12 integration tests pass
- [ ] All acceptance criteria from spec are covered by tests

---

### Step 13: Full Suite Verification

**Objective:** Run full test suite, TypeScript compilation, and lint to verify no regressions.

**Files to modify:** None

**Details:**

Run in sequence:
1. `pnpm test` — verify all tests pass (existing + new)
2. `pnpm build` — verify TypeScript compiles and production build succeeds
3. `pnpm lint` — verify no lint errors introduced

Check specifically:
- No import errors (BibleBrowser → BibleLanding transition)
- No routing conflicts (new routes don't shadow existing ones)
- No TypeScript errors from new type definitions
- Old BibleBrowser tests still pass (the file exists, just not routed)

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- Do NOT modify any existing tests to make them pass — if old tests fail, investigate the root cause
- Do NOT ignore pre-existing failures — document them as pre-existing in the execution log

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Full suite | verification | All tests pass (new + existing), build succeeds, lint clean |

**Expected state after completion:**
- [ ] All new tests pass (~60 new tests)
- [ ] No regressions in existing tests
- [ ] TypeScript compiles cleanly
- [ ] Lint passes
- [ ] `/bible` renders the new landing page in the dev server

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | TypeScript types + landingState.ts reader |
| 2 | 1 | VOTD seed file + votdSelector utility |
| 3 | — | BibleHero component (no data deps) |
| 4 | 1 | StreakChip component (uses BibleStreak type) |
| 5 | 1 | ResumeReadingCard (uses LastRead type) |
| 6 | 1 | TodaysPlanCard (uses ActivePlan type) |
| 7 | 2 | VerseOfTheDay (uses votdSelector) |
| 8 | — | QuickActionsRow + BibleSearchEntry (pure UI) |
| 9 | 1-8 | BibleLanding page composition |
| 10 | 9 | Route wiring + stub routes |
| 11 | 9 | BibleLandingSkeleton |
| 12 | 9-11 | Page-level integration tests |
| 13 | 1-12 | Full suite verification |

**Parallelizable:** Steps 3, 4, 5, 6, 8 can run in parallel (no cross-dependencies). Step 7 depends only on Step 2.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | TypeScript types + landingState reader | [COMPLETE] | 2026-04-07 | Created `types/bible-landing.ts` (4 interfaces), `lib/bible/landingState.ts` (3 SSR-safe readers), 9 tests pass |
| 2 | VOTD seed file + votdSelector | [COMPLETE] | 2026-04-07 | Created `data/bible/votd.json` (366 entries, 58/66 books, balanced OT/NT), `lib/bible/votdSelector.ts`, 7 tests pass |
| 3 | BibleHero component | [COMPLETE] | 2026-04-07 | Created `BibleHero.tsx` + 4 tests pass |
| 4 | StreakChip component | [COMPLETE] | 2026-04-07 | Created `StreakChip.tsx` + 6 tests pass |
| 5 | ResumeReadingCard component | [COMPLETE] | 2026-04-07 | Created `ResumeReadingCard.tsx` + 5 tests pass |
| 6 | TodaysPlanCard component | [COMPLETE] | 2026-04-07 | Created `TodaysPlanCard.tsx` + 8 tests pass |
| 7 | VerseOfTheDay component | [COMPLETE] | 2026-04-07 | Created `VerseOfTheDay.tsx` + 6 tests pass |
| 8 | QuickActionsRow + BibleSearchEntry | [COMPLETE] | 2026-04-07 | Created `QuickActionsRow.tsx` + `BibleSearchEntry.tsx` + 8 tests pass |
| 9 | BibleLanding page composition | [COMPLETE] | 2026-04-07 | Created `BibleLanding.tsx` with SSR-safe hydration, SEO + breadcrumbs, all child components composed. TypeScript compiles cleanly. |
| 10 | Route wiring + stub routes | [COMPLETE] | 2026-04-07 | Updated App.tsx: BibleLanding at /bible, BibleBrowse at /bible/browse, BibleStub at /bible/my + /plans + /search. Created BibleBrowse.tsx + BibleStub.tsx. 4 tests pass. Needed AuthProvider wrapping in test. |
| 11 | BibleLandingSkeleton | [COMPLETE] | 2026-04-07 | Rewrote BibleBrowserSkeleton.tsx to BibleLandingSkeleton (landing-shaped). Kept BibleBrowserSkeleton as re-export. Updated skeletons/index.ts + App.tsx. 2 tests pass + existing generic tests pass. |
| 12 | Page-level integration tests | [COMPLETE] | 2026-04-07 | Created `BibleLanding.test.tsx` with 12 integration tests. Fixed font-script assertion to scope to hero section (Navbar uses font-script for logo). All pass. |
| 13 | Full suite verification | [COMPLETE] | 2026-04-07 | 5708 tests pass (61 new), build succeeds (0 errors), lint clean. Fixed unused BibleBrowserSkeleton import in test file. |
