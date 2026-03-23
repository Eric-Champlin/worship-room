# Implementation Plan: Liturgical Calendar Awareness

**Spec:** `_specs/liturgical-calendar-awareness.md`
**Date:** 2026-03-22
**Branch:** `claude/feature/liturgical-calendar-awareness`
**Design System Reference:** `_plans/recon/design-system.md` (loaded)
**Recon Report:** not applicable
**Master Spec Plan:** not applicable

---

## Architecture Context

### Project Structure

- **Constants:** `frontend/src/constants/` — named export files with `SCREAMING_SNAKE_CASE` data pools + exported utility functions (e.g., `getTodaysVerse()`, `getTodaysQuestion()`)
- **Hooks:** `frontend/src/hooks/` — custom hooks with `__tests__/` sibling directory
- **Types:** `frontend/src/types/` — TypeScript interfaces
- **Data:** `frontend/src/data/` — larger data files (e.g., `devotionals.ts` with 100 entries + `getTodaysDevotional()`)
- **Components:** `frontend/src/components/` — organized by feature (`dashboard/`, `daily/`, `prayer-wall/`, `ui/`)
- **Pages:** `frontend/src/pages/` — route-level components

### Key Files to Modify

| File | Purpose |
|------|---------|
| `frontend/src/data/devotionals.ts` | Add `season?` field to devotionals, add 20 seasonal devotionals, modify `getTodaysDevotional()` |
| `frontend/src/types/devotional.ts` | Add optional `season` field to `Devotional` interface |
| `frontend/src/constants/verse-of-the-day.ts` | Add `season?` field to `VerseOfTheDay`, tag 20 verses, modify `getTodaysVerse()` |
| `frontend/src/constants/question-of-the-day.ts` | Add 12 seasonal questions, modify `getTodaysQuestion()` |
| `frontend/src/components/dashboard/DashboardHero.tsx` | Add seasonal greeting suffix |
| `frontend/src/pages/Home.tsx` | Add `SeasonalBanner` component |
| `frontend/src/components/Navbar.tsx` | Add seasonal icon next to logo |

### Key Files to Create

| File | Purpose |
|------|---------|
| `frontend/src/constants/liturgical-calendar.ts` | Season definitions, Computus algorithm, `getLiturgicalSeason()` |
| `frontend/src/hooks/useLiturgicalSeason.ts` | Memoized hook wrapping `getLiturgicalSeason()` |
| `frontend/src/components/SeasonalBanner.tsx` | Landing page seasonal banner |
| `frontend/src/constants/__tests__/liturgical-calendar.test.ts` | Calendar algorithm tests |
| `frontend/src/hooks/__tests__/useLiturgicalSeason.test.ts` | Hook tests |
| `frontend/src/components/__tests__/SeasonalBanner.test.tsx` | Banner component tests |

### Existing Patterns

**Selection functions** (`getTodaysVerse`, `getTodaysDevotional`, `getTodaysQuestion`):
- All accept `date: Date = new Date()` parameter
- Use local date components with UTC arithmetic to avoid DST: `Date.UTC(year, month, day) - Date.UTC(year, 0, 0)` / ms-per-day
- Return deterministic result via `dayOfYear % poolLength`

**Test patterns:**
- `import { describe, it, expect } from 'vitest'`
- Pure function tests — no provider wrapping needed for constants
- Component tests wrap in `MemoryRouter` + `ToastProvider` + `AuthProvider` as needed
- Hook tests use `renderHook` from `@testing-library/react`
- `beforeEach(() => { localStorage.clear() })` where relevant

**Dashboard Hero** (`DashboardHero.tsx`):
- `getGreeting()` returns "Good morning"/"Good afternoon"/"Good evening" based on `new Date().getHours()`
- H1: `font-serif text-2xl text-white/90 md:text-3xl`
- Section: `bg-gradient-to-b from-[#1a0533] to-[#0f0a1e] pt-24 pb-6 md:pt-28 md:pb-8`

**Navbar Logo** (`Navbar.tsx` lines 47-60):
- `NavbarLogo` renders `<Link>` with `<span className="font-script text-4xl font-bold">Worship Room</span>`
- Accepts `transparent` boolean for color switching (`text-white` vs `text-primary`)

**Home Page** (`Home.tsx`):
- Structure: `<Navbar transparent />` → `<main>` → `<HeroSection />` → other sections
- Banner insertion point: between `<Navbar transparent />` and `<main>`, or as first child of `<main>` before `<HeroSection />`

---

## Auth Gating Checklist

**This feature introduces no new auth-gated actions.** All seasonal UI is read-only/decorative.

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Dashboard greeting suffix | Only visible when authenticated (dashboard is auth-gated) | Step 5 | Existing auth gate — dashboard only renders for authenticated users |
| Banner dismiss | Available to all users (sessionStorage only) | Step 6 | No auth needed |

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Dashboard Hero section | background | `bg-gradient-to-b from-[#1a0533] to-[#0f0a1e]` | DashboardHero.tsx:90 |
| Dashboard Hero H1 | font | `font-serif text-2xl text-white/90 md:text-3xl` | DashboardHero.tsx:94 |
| Navbar logo | font | `font-script text-4xl font-bold` | Navbar.tsx:52 |
| Navbar logo (transparent) | color | `text-white` | Navbar.tsx:53 |
| Navbar logo (non-transparent) | color | `text-primary` | Navbar.tsx:53 |
| Landing page background | color | `bg-neutral-bg` (#F5F5F5) | Home.tsx:13 |
| Landing page text | color | `text-white` on hero (dark bg) | design-system.md |
| Primary CTA link | color | Varies by season theme color | Spec requirement |

---

## Design System Reminder

- Worship Room uses **Caveat** for script/brand headings (`font-script`), **Lora** for scripture (`font-serif`), **Inter** for body (`font-sans`)
- Dashboard uses frosted glass cards: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`
- Dashboard hero uses `font-serif` (Lora) for the greeting H1, not Caveat
- Navbar on landing page is `transparent` (absolute positioning over hero gradient)
- All Lucide icons are imported from `lucide-react`
- Use `cn()` from `@/lib/utils` for conditional classnames
- Seasonal theme colors per spec: Advent `#7C3AED`, Christmas `#FBBF24`, Epiphany `#FBBF24`, Lent `#6B21A8`, Holy Week `#991B1B`, Easter `#FDE68A`, Pentecost `#DC2626`, Ordinary Time `#059669`

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | < 640px | Banner: icon+message left, X right, CTA wraps below. Greeting suffix wraps to new line. Navbar icon 14px. |
| Tablet | >= 640px | Banner: icon+message+CTA on one line, X far right. Greeting on one line. Navbar icon 16px. |
| Desktop | >= 1024px | Same as tablet with more generous spacing. |

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| Navbar → Seasonal Banner | 0px (banner directly below nav) | Spec: "below the navbar" |
| Seasonal Banner → Hero | 0px (banner above hero, seamless) | Spec: "above the hero section" |

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] Spec requires no new routes — all changes modify existing components and data
- [x] No new localStorage keys — only `sessionStorage` for banner dismiss (`wr_seasonal_banner_dismissed`)
- [x] No AI-generated content — all seasonal content is hardcoded constants
- [x] No crisis detection needed — no user text input added
- [x] All auth-gated actions from the spec are accounted for (none — feature is read-only)
- [x] Design system values are verified (from design-system.md + codebase inspection)
- [ ] `/devotional` route exists for banner CTA link (referenced in spec — verify during execution, fall back to `/daily` if not)
- [x] Recon report loaded if available (design-system.md loaded)

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Advent year boundary | Compute Advent for current year AND handle Christmas/Epiphany from prior year's Advent | Spec: "Advent starts in late November, Christmas extends to January 5, Epiphany is January 6" |
| Season overlap priority | Holy Week > Epiphany > Pentecost > named seasons > Ordinary Time | Spec explicit requirement |
| `dateOverride` parameter | Hook accepts optional `Date` param, passes to `getLiturgicalSeason(date)` | Spec: "for testing purposes" |
| Banner insert position | First child of `<main>` before `<HeroSection />` | Spec: "below the navbar and above the hero section" — since Navbar is transparent/absolute, banner goes in main flow |
| Seasonal QOTD after exhaustion | Fall back to general pool | Spec: "After all 3 seasonal questions have been shown, fall back to the general pool" |
| Devotional seasonal selection | Use day-within-season modulo seasonal-pool-length | Spec: "Cycle through seasonal devotionals within the season" |
| Banner CTA target | `/devotional` (verify route exists; if not, use `/daily`) | Spec says "to `/devotional`" |
| Seasonal verse/devotional past-day | Compute season for the past date, then select seasonal content for that date | Spec: "the devotional shown should match the season that was active on that day" |

---

## Implementation Steps

### Step 1: Liturgical Calendar Constants & Computus Algorithm

**Objective:** Create the core constants file with season definitions, Easter calculation (Computus), and a `getLiturgicalSeason(date)` function.

**Files to create:**
- `frontend/src/constants/liturgical-calendar.ts` — Season definitions + algorithm

**Details:**

Define `LiturgicalSeasonId` type:
```typescript
export type LiturgicalSeasonId =
  | 'advent' | 'christmas' | 'epiphany' | 'lent'
  | 'holy-week' | 'easter' | 'pentecost' | 'ordinary-time'
```

Define `LiturgicalSeason` interface:
```typescript
export interface LiturgicalSeason {
  id: LiturgicalSeasonId
  name: string
  themeColor: string
  icon: string // Lucide icon name
  greeting: string // empty string for Ordinary Time
  suggestedContent: string[]
  themeWord: string // for banner: "a season of [themeWord]"
}
```

Define `LITURGICAL_SEASONS` constant — a `Record<LiturgicalSeasonId, LiturgicalSeason>` with all 8 seasons from the spec table.

Implement `computeEasterDate(year: number): Date` using the Anonymous Gregorian algorithm (Computus). Must be correct for:
- 2026: April 5
- 2027: March 28
- 2028: April 16
- 2029: April 1

Implement `getLiturgicalSeason(date: Date = new Date()): LiturgicalSeasonResult` returning:
```typescript
interface LiturgicalSeasonResult {
  currentSeason: LiturgicalSeason
  seasonName: string
  themeColor: string
  icon: string
  greeting: string
  daysUntilNextSeason: number
  isNamedSeason: boolean
}
```

Season date computation logic (all derived from Easter or fixed dates):
- **Advent start**: Nearest Sunday to November 30 = Sunday closest to Nov 30 (range: Nov 27–Dec 3). Algorithm: Nov 30's day-of-week → adjust to nearest Sunday.
- **Christmas**: Dec 25 through Jan 5 (fixed)
- **Epiphany**: Jan 6 (single day, fixed)
- **Lent**: Ash Wednesday (Easter - 46) through Palm Sunday - 1 (Easter - 8)
- **Holy Week**: Palm Sunday (Easter - 7) through Holy Saturday (Easter - 1)
- **Easter**: Easter Sunday through Pentecost - 1 (Easter + 48)
- **Pentecost**: Easter + 49 (single day)
- **Ordinary Time**: All dates not covered

Priority resolution order: Holy Week > Epiphany > Pentecost > Christmas > Advent > Lent > Easter > Ordinary Time

For `daysUntilNextSeason`: compute the end date of the current season and return the number of days remaining. For Ordinary Time, compute the next named season start.

Year boundary handling: When checking January dates, consider both the current year's Easter-derived seasons AND the prior year's Advent/Christmas/Epiphany.

**Guardrails (DO NOT):**
- DO NOT use `Date.toISOString()` for date comparison (UTC issues)
- DO NOT hardcode Easter dates — must compute algorithmically for any year
- DO NOT use moment.js or date-fns — pure Date arithmetic only (matches existing patterns)
- DO NOT add any side effects, localStorage, or API calls

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `computeEasterDate` returns correct dates for 2026-2029 | unit | Verify April 5 2026, March 28 2027, April 16 2028, April 1 2029 |
| `computeEasterDate` returns a Sunday | unit | Verify `getDay() === 0` for multiple years |
| Advent start is nearest Sunday to Nov 30 | unit | Test 2026 (Nov 29), 2027 (Nov 28), 2028 (Dec 3) |
| Lent dates derived correctly from Easter | unit | Ash Wednesday = Easter - 46, verify for 2026 |
| Holy Week priority over Lent | unit | Test a date in Holy Week, verify `holy-week` not `lent` |
| Epiphany returns correctly for Jan 6 | unit | Single day check |
| Pentecost returns correctly for Easter + 49 | unit | Single day check |
| Christmas spans year boundary | unit | Dec 25 through Jan 5 |
| Ordinary Time for dates outside all seasons | unit | Test mid-July, mid-October |
| `isNamedSeason` false for Ordinary Time | unit | Verify flag |
| `greeting` empty string for Ordinary Time | unit | Verify |
| `daysUntilNextSeason` counts correctly | unit | Test mid-Advent, verify countdown to Christmas |
| Every day of the year maps to exactly one season | unit | Loop through 365 days of a year, verify no gaps/undefined |
| Leap year handling (2028) | unit | Feb 29 exists, all seasons still work |

**Expected state after completion:**
- [ ] `liturgical-calendar.ts` exports `LITURGICAL_SEASONS`, `computeEasterDate`, `getLiturgicalSeason`
- [ ] All 14+ tests pass
- [ ] Algorithm works for any year without manual updates

---

### Step 2: `useLiturgicalSeason` Hook

**Objective:** Create a memoized React hook that wraps `getLiturgicalSeason()` for use in components.

**Files to create:**
- `frontend/src/hooks/useLiturgicalSeason.ts`
- `frontend/src/hooks/__tests__/useLiturgicalSeason.test.ts`

**Details:**

```typescript
import { useMemo } from 'react'
import { getLiturgicalSeason } from '@/constants/liturgical-calendar'
import type { LiturgicalSeasonResult } from '@/constants/liturgical-calendar'

export function useLiturgicalSeason(dateOverride?: Date): LiturgicalSeasonResult {
  return useMemo(() => getLiturgicalSeason(dateOverride), [dateOverride])
}
```

The hook is intentionally simple — all logic lives in the constants file. The `useMemo` ensures no recalculation on re-renders (season doesn't change within a session). The `dateOverride` enables testing without mocking `Date`.

**Guardrails (DO NOT):**
- DO NOT add state, effects, localStorage, or API calls
- DO NOT add context — this is a standalone utility hook
- DO NOT add debouncing or timers — the season doesn't change mid-session

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Returns correct season for a date override | unit | `useLiturgicalSeason(new Date(2026, 11, 25))` → Christmas |
| Returns all expected fields | unit | Verify `currentSeason`, `seasonName`, `themeColor`, `icon`, `greeting`, `daysUntilNextSeason`, `isNamedSeason` |
| `isNamedSeason` false during Ordinary Time | unit | Override to mid-July |
| Memoizes result (same reference for same input) | unit | Render twice, verify same object reference |

**Expected state after completion:**
- [ ] Hook is importable as `import { useLiturgicalSeason } from '@/hooks/useLiturgicalSeason'`
- [ ] All tests pass
- [ ] No side effects

---

### Step 3: Seasonal Devotional Content & Selection Logic

**Objective:** Add an optional `season` field to the Devotional type, add 20 seasonal devotionals to the pool, and modify `getTodaysDevotional()` to prioritize seasonal content during named seasons.

**Files to modify:**
- `frontend/src/types/devotional.ts` — Add optional `season` field
- `frontend/src/data/devotionals.ts` — Add 20 seasonal devotionals, modify selection logic

**Details:**

**Type change** (`types/devotional.ts`):
Add to `Devotional` interface:
```typescript
season?: LiturgicalSeasonId  // Optional — only set for seasonal devotionals
```
Import `LiturgicalSeasonId` from `@/constants/liturgical-calendar`.

**Data addition** (`data/devotionals.ts`):
Add 20 seasonal devotionals to `DEVOTIONAL_POOL` (appended at end). Each follows the exact same `Devotional` structure with the `season` field set. All scripture uses WEB translation. Distribution per spec:
- 5 Advent (themes: hope, waiting, prophecy, preparation, joy of anticipation)
- 5 Lent (themes: repentance, fasting, humility, sacrifice, renewal)
- 3 Easter (themes: resurrection, new life, victory over death)
- 3 Christmas (themes: incarnation, gift of God, peace on earth)
- 2 Holy Week (themes: sacrifice, the cross)
- 2 Pentecost (themes: Holy Spirit, empowerment)

IDs: `devotional-seasonal-advent-01` through `devotional-seasonal-pentecost-02`. `dayIndex` values continue from current pool size (100+).

**Selection logic change** (`getTodaysDevotional`):
Modify `getTodaysDevotional(date, dayOffset)` to:
1. Compute the adjusted date (with dayOffset)
2. Call `getLiturgicalSeason(adjustedDate)` to get current season
3. If `isNamedSeason`:
   a. Filter `DEVOTIONAL_POOL` for entries where `season === currentSeason.id`
   b. If seasonal devotionals exist for this season:
      - Compute day-within-season (days since season start)
      - Return `seasonalPool[dayWithinSeason % seasonalPool.length]`
4. Fall back to original logic: `DEVOTIONAL_POOL[dayOfYear % DEVOTIONAL_POOL.length]` (general pool)

Need a helper: `getSeasonStartDate(seasonId, date)` — returns the start date of the given season for the year of the given date. This can be derived from the liturgical calendar functions.

**Guardrails (DO NOT):**
- DO NOT modify any existing devotional content — only append new ones
- DO NOT change the function signature — keep `(date, dayOffset)` compatible
- DO NOT use scripture references that already exist in the codebase (check against existing references)
- DO NOT use HTML or Markdown in devotional text — plain text only

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Pool has 120 devotionals (100 existing + 20 seasonal) | unit | Length check |
| Each seasonal devotional has valid `season` field | unit | Filter by season, verify field |
| Distribution matches spec (5/5/3/3/2/2) | unit | Count per season |
| `getTodaysDevotional` returns seasonal during Advent | unit | Override date to Dec 1, 2026 |
| `getTodaysDevotional` returns general during Ordinary Time | unit | Override date to Jul 15, 2026 |
| `getTodaysDevotional` cycles seasonal devotionals | unit | Verify different results across Advent days |
| Past-day navigation respects season of that past date | unit | Use dayOffset to navigate to a past seasonal date |
| All seasonal devotionals have WEB translation passages | unit | Verify passage text |
| No duplicate scripture references with existing pool | unit | Cross-reference check |

**Expected state after completion:**
- [ ] `Devotional` type has optional `season` field
- [ ] 20 seasonal devotionals added to pool (total: 120)
- [ ] `getTodaysDevotional` prioritizes seasonal content during named seasons
- [ ] Past-day navigation shows correct seasonal devotional
- [ ] All existing devotional tests still pass

---

### Step 4: Seasonal Verse of the Day Tagging & Selection

**Objective:** Add an optional `season` field to 20 existing verses and modify `getTodaysVerse()` to prioritize seasonal verses during named seasons.

**Files to modify:**
- `frontend/src/constants/verse-of-the-day.ts` — Add `season?` to type, tag 20 verses, modify selection
- `frontend/src/constants/__tests__/verse-of-the-day.test.ts` — Add seasonal tests

**Details:**

**Type change:**
Add to `VerseOfTheDay` interface:
```typescript
season?: LiturgicalSeasonId
```

**Verse tagging:**
Tag 20 of the existing 60 verses with a `season` field. Choose verses whose themes naturally match the season. Distribution per spec:
- 5 tagged `advent` (prophecy, hope, preparation themes)
- 5 tagged `lent` (repentance, reflection, humility themes)
- 4 tagged `easter` (resurrection, new life themes)
- 3 tagged `christmas` (birth, incarnation, joy themes)
- 2 tagged `holy-week` (sacrifice, the cross themes)
- 1 tagged `pentecost` (Holy Spirit theme)

**Selection logic change:**
Modify `getTodaysVerse(date)` to:
1. Call `getLiturgicalSeason(date)` to get current season
2. If `isNamedSeason`:
   a. Filter pool for verses where `season === currentSeason.id`
   b. If seasonal verses exist:
      - Compute day-within-season
      - Return `seasonalVerses[dayWithinSeason % seasonalVerses.length]`
3. Fall back to original: `VERSE_OF_THE_DAY_POOL[dayOfYear % poolLength]`

Share the `getSeasonStartDate` / day-within-season helper from Step 3 (export from liturgical-calendar.ts).

**Guardrails (DO NOT):**
- DO NOT change any verse text or reference — only add the `season` field to existing verses
- DO NOT change the function signature
- DO NOT add new verses — only tag existing ones

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Pool still has exactly 60 entries | unit | No additions |
| 20 verses have a `season` field | unit | Filter count |
| Distribution: 5 advent, 5 lent, 4 easter, 3 christmas, 2 holy-week, 1 pentecost | unit | Count per season |
| `getTodaysVerse` returns seasonal verse during Lent | unit | Override to March 2026 |
| `getTodaysVerse` returns general verse during Ordinary Time | unit | Override to July |
| Seasonal verses cycle within season | unit | Two different Lent days → different verses |
| Existing tests still pass | unit | Backward compatibility |

**Expected state after completion:**
- [ ] 20 verses tagged with `season` field
- [ ] `getTodaysVerse` prioritizes seasonal verses
- [ ] All existing verse tests still pass

---

### Step 5: Dashboard Greeting — Seasonal Suffix

**Objective:** Add a seasonal greeting suffix to the DashboardHero component during named seasons.

**Files to modify:**
- `frontend/src/components/dashboard/DashboardHero.tsx` — Add seasonal suffix to greeting

**Files to create:**
- `frontend/src/components/dashboard/__tests__/DashboardHero-seasonal.test.tsx` — Seasonal greeting tests

**Details:**

Import `useLiturgicalSeason` hook in DashboardHero.

Modify the H1 greeting to include seasonal suffix:
```tsx
const { greeting: seasonalGreeting, themeColor, isNamedSeason } = useLiturgicalSeason()

// In the JSX:
<h1 className="font-serif text-2xl text-white/90 md:text-3xl">
  {greeting},{' '}
  <span className="inline-block max-w-[70vw] truncate align-bottom md:max-w-none">
    {userName}
  </span>
  {isNamedSeason && seasonalGreeting && (
    <span
      className="block text-lg md:inline md:text-2xl"
      style={{ color: themeColor }}
    >
      {' — '}{seasonalGreeting}
    </span>
  )}
</h1>
```

Key points:
- Separator is em dash (` — `)
- Seasonal suffix uses season's `themeColor` as text color via inline `style`
- On mobile (`block` on small screens): wraps to a second line, slightly smaller (`text-lg`)
- On desktop (`md:inline`): stays on the same line as the greeting, same size as greeting minus one step (`md:text-2xl`)
- During Ordinary Time: `isNamedSeason` is false → no suffix rendered

**Responsive behavior:**
- Mobile (< 768px): Suffix wraps to new line via `block`. Smaller text (`text-lg`).
- Desktop (>= 768px): Inline with greeting via `md:inline`. Matches greeting size minus one step.

**Guardrails (DO NOT):**
- DO NOT change the existing greeting logic or layout
- DO NOT add a separate heading element — suffix must be in the same `<h1>` for accessibility
- DO NOT use a Tailwind color class for the seasonal color — use inline `style` since colors are dynamic

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Renders seasonal suffix during named season | integration | Mock hook to return Lent, verify "Blessed Lent" appears |
| Does not render suffix during Ordinary Time | integration | Mock hook to return Ordinary Time, verify no suffix |
| Suffix uses season theme color | integration | Verify `style.color` matches theme color |
| Suffix is inside the h1 element | integration | Verify single `<h1>` contains both greeting and suffix |
| Em dash separator is present | integration | Verify ` — ` text |

**Expected state after completion:**
- [ ] Dashboard greeting shows seasonal suffix during named seasons
- [ ] Suffix uses season's theme color
- [ ] Responsive: wraps on mobile, inline on desktop
- [ ] No change during Ordinary Time

---

### Step 6: Landing Page — Seasonal Banner

**Objective:** Add a dismissible seasonal banner below the navbar on the landing page during named seasons.

**Files to create:**
- `frontend/src/components/SeasonalBanner.tsx` — Banner component
- `frontend/src/components/__tests__/SeasonalBanner.test.tsx` — Banner tests

**Files to modify:**
- `frontend/src/pages/Home.tsx` — Insert `SeasonalBanner` before `HeroSection`

**Details:**

**`SeasonalBanner.tsx`:**

```tsx
import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import { useLiturgicalSeason } from '@/hooks/useLiturgicalSeason'
import { useReducedMotion } from '@/hooks/useReducedMotion'

const DISMISS_KEY = 'wr_seasonal_banner_dismissed'
```

Component logic:
1. Call `useLiturgicalSeason()` to get season data
2. Check `sessionStorage.getItem(DISMISS_KEY)` — if `'true'`, don't render
3. If `!isNamedSeason`, don't render (Ordinary Time)
4. Render banner strip

Banner JSX structure:
```tsx
<div
  className="relative flex w-full items-center justify-center px-4 py-2"
  style={{ backgroundColor: `${themeColor}1A` }}  // 10% opacity via hex alpha
  role="complementary"
  aria-label="Seasonal greeting"
>
  <div className="flex flex-col items-center gap-1 sm:flex-row sm:gap-3">
    <div className="flex items-center gap-2">
      <SeasonIcon className="h-4 w-4" style={{ color: `${themeColor}B3` }} aria-hidden="true" />
      <span className="text-sm text-white/90">
        It's {seasonName} — a season of {themeWord}
      </span>
    </div>
    <a
      href="/devotional"
      className="text-sm font-medium underline underline-offset-2"
      style={{ color: themeColor }}
    >
      Read today's devotional
    </a>
  </div>
  <button
    onClick={handleDismiss}
    className="absolute right-2 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full text-white/60 hover:text-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
    aria-label="Dismiss seasonal banner"
  >
    <X className="h-4 w-4" />
  </button>
</div>
```

Dynamic icon: Look up the Lucide icon by the `icon` string from the season object. Import all Lucide icons and index by name, or use a mapping object from icon name string to component.

Animation:
- Slide down from 0 height on mount (200ms ease-out) — use CSS transition on max-height or a state-driven class
- Dismiss: slide up, then remove from DOM
- `prefers-reduced-motion`: instant render/remove (no slide animation)

Dismiss handler:
```typescript
const handleDismiss = () => {
  sessionStorage.setItem(DISMISS_KEY, 'true')
  setDismissed(true)
}
```

**Home.tsx modification:**
```tsx
import { SeasonalBanner } from '@/components/SeasonalBanner'

// In the JSX, before HeroSection:
<main id="main-content">
  <SeasonalBanner />
  <HeroSection />
  ...
</main>
```

**Responsive behavior:**
- Mobile (< 640px): Icon + message on one line (may wrap). CTA wraps below (`flex-col`). X button absolute right. Min touch target 44px (`h-11 w-11`).
- Tablet/Desktop (>= 640px): Icon + message + CTA on one line (`sm:flex-row`). X at far right.

**Guardrails (DO NOT):**
- DO NOT use `localStorage` — spec requires `sessionStorage` (reappears on new session)
- DO NOT show banner during Ordinary Time
- DO NOT add any interactive elements besides the dismiss button and CTA link
- DO NOT use `dangerouslySetInnerHTML`
- DO NOT import all of lucide-react as a barrel import for the icon lookup — use a small mapping object instead to avoid bundle bloat

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Renders during named season | integration | Mock hook to Lent, verify banner appears |
| Does not render during Ordinary Time | integration | Mock hook to Ordinary Time, verify no banner |
| Shows season name and theme word | integration | Verify "It's Lent — a season of renewal" |
| Shows seasonal icon | integration | Verify icon renders with aria-hidden |
| CTA links to /devotional | integration | Verify href |
| Dismiss button stores to sessionStorage | integration | Click X, verify `sessionStorage.getItem(DISMISS_KEY) === 'true'` |
| Does not render after dismissal | integration | Set sessionStorage, render, verify no banner |
| Dismiss button has aria-label | integration | `aria-label="Dismiss seasonal banner"` |
| Dismiss button has 44px touch target | integration | Check h-11 w-11 classes |
| Banner has role="complementary" | integration | Accessibility check |
| No animation when prefers-reduced-motion | integration | Mock reduced motion, verify no transition |

**Expected state after completion:**
- [ ] Seasonal banner appears on landing page during named seasons
- [ ] Banner dismissible with sessionStorage persistence
- [ ] Responsive layout (stacked mobile, inline tablet/desktop)
- [ ] Accessible (aria-label, touch targets, reduced motion)
- [ ] Does not appear during Ordinary Time

---

### Step 7: Prayer Wall — Seasonal QOTD Prompts

**Objective:** Add 12 season-specific questions to the QOTD system and modify `getTodaysQuestion()` to prioritize seasonal questions during named seasons.

**Files to modify:**
- `frontend/src/constants/question-of-the-day.ts` — Add 12 seasonal questions, modify selection
- `frontend/src/constants/__tests__/question-of-the-day.test.ts` — Add seasonal tests

**Details:**

**Data addition:**
Add 12 new questions with a new `liturgicalSeason` field (separate from the existing `theme` field). Keep `theme: 'seasonal'` for backward compatibility. Add a new optional field:
```typescript
export interface QuestionOfTheDay {
  id: string
  text: string
  theme: 'faith_journey' | 'practical' | 'reflective' | 'encouraging' | 'community' | 'seasonal'
  hint?: string
  liturgicalSeason?: LiturgicalSeasonId  // NEW — links to liturgical calendar
}
```

12 new questions (IDs: `qotd-61` through `qotd-72`):
- 3 Advent: per spec text
- 3 Lenten: per spec text
- 3 Easter: per spec text
- 3 Christmas: per spec text

All with `theme: 'seasonal'` and appropriate `liturgicalSeason` value.

**Selection logic change:**
Modify `getTodaysQuestion(date)` to:
1. Call `getLiturgicalSeason(date)` to get current season
2. If `isNamedSeason`:
   a. Filter pool for questions where `liturgicalSeason === currentSeason.id`
   b. If seasonal questions exist:
      - Compute day-within-season
      - If `dayWithinSeason < seasonalQuestions.length`: return `seasonalQuestions[dayWithinSeason]`
      - Else: fall back to general pool (spec: "After all 3 seasonal questions have been shown, fall back to the general pool")
3. Fall back to original rotation: `pool[dayOfYear % pool.length]`

Note: Unlike verses/devotionals which cycle, QOTD falls back after all seasonal questions are shown (spec: "fall back to the general pool for the remaining days of the season").

**Guardrails (DO NOT):**
- DO NOT remove existing seasonal questions (qotd-51 through qotd-60) — keep them in the general pool
- DO NOT change the existing `theme` field type — add a new `liturgicalSeason` field
- DO NOT break the existing 60-question pool size expectation in tests — update test to expect 72

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Pool has 72 questions (60 existing + 12 new) | unit | Length check |
| 12 new questions have `liturgicalSeason` field | unit | Filter and count |
| Distribution: 3 advent, 3 lent, 3 easter, 3 christmas | unit | Count per season |
| `getTodaysQuestion` returns seasonal during Advent | unit | Override to Dec 1 |
| Falls back to general pool after seasonal exhaustion | unit | Override to day 4+ of a season with 3 questions |
| Returns general during Ordinary Time | unit | Override to July |
| All questions have unique IDs | unit | Existing test, updated for 72 |
| Existing tests still pass | unit | Backward compatibility |

**Expected state after completion:**
- [ ] 12 seasonal questions added (total: 72)
- [ ] `getTodaysQuestion` prioritizes seasonal during named seasons
- [ ] Falls back to general pool after seasonal questions exhausted
- [ ] All existing QOTD tests still pass (updated counts)

---

### Step 8: Navbar — Seasonal Icon

**Objective:** Display a small seasonal Lucide icon next to the "Worship Room" logo during named seasons.

**Files to modify:**
- `frontend/src/components/Navbar.tsx` — Add seasonal icon to `NavbarLogo`

**Files to create:**
- `frontend/src/components/__tests__/Navbar-seasonal.test.tsx` — Seasonal icon tests

**Details:**

Import `useLiturgicalSeason` in the Navbar component (or in the `NavbarLogo` sub-component).

Create a small icon mapping (same one used in SeasonalBanner or shared):
```typescript
import { Star, Gift, Sparkles, Heart, Cross, Sun, Flame, Leaf } from 'lucide-react'

const SEASON_ICON_MAP: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  Star, Gift, Sparkles, Heart, Cross, Sun, Flame, Leaf,
}
```

Modify `NavbarLogo`:
```tsx
function NavbarLogo({ transparent }: { transparent: boolean }) {
  const { icon, themeColor, isNamedSeason } = useLiturgicalSeason()
  const SeasonIcon = isNamedSeason ? SEASON_ICON_MAP[icon] : null

  return (
    <Link to="/" className="flex items-center gap-1.5" aria-label="Worship Room home">
      <span className={cn('font-script text-4xl font-bold', transparent ? 'text-white' : 'text-primary')}>
        Worship Room
      </span>
      {SeasonIcon && (
        <SeasonIcon
          className="h-4 w-4 sm:h-4 sm:w-4"
          style={{ color: `${themeColor}80` }}  // 50% opacity via hex alpha
          aria-hidden="true"
        />
      )}
    </Link>
  )
}
```

Key points:
- Icon size: 16px (`h-4 w-4`) on tablet/desktop, 14px on mobile (`h-3.5 w-3.5`). Actually spec says 14px mobile, 16px standard. Use `h-3.5 w-3.5 sm:h-4 sm:w-4`.
- Color: season's theme color at 50% opacity (hex `80` suffix)
- Gap: `gap-1.5` (6px) between logo text and icon
- `aria-hidden="true"` — purely decorative
- Hidden during Ordinary Time (`isNamedSeason` false → no icon)

**Responsive behavior:**
- Mobile: 14px icon (`h-3.5 w-3.5`), same gap
- Desktop: 16px icon (`h-4 w-4`), same gap
- Visible in both desktop navbar and mobile hamburger drawer if logo appears there

**Guardrails (DO NOT):**
- DO NOT add tooltip or click handler — purely decorative
- DO NOT change the logo styling or layout beyond adding the icon
- DO NOT forget `aria-hidden="true"`

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Renders seasonal icon during named season | integration | Mock hook to Advent, verify Star icon |
| Does not render icon during Ordinary Time | integration | Mock hook to Ordinary Time, verify no icon |
| Icon has aria-hidden="true" | integration | Accessibility check |
| Icon has correct opacity color | integration | Verify inline style |

**Expected state after completion:**
- [ ] Seasonal icon appears next to "Worship Room" logo during named seasons
- [ ] Icon is 14px mobile, 16px desktop, 50% opacity of theme color
- [ ] Purely decorative with `aria-hidden="true"`
- [ ] Hidden during Ordinary Time

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Liturgical calendar constants & Computus algorithm |
| 2 | 1 | `useLiturgicalSeason` hook |
| 3 | 1 | Seasonal devotional content & selection logic |
| 4 | 1 | Seasonal verse of the day tagging & selection |
| 5 | 2 | Dashboard greeting — seasonal suffix |
| 6 | 2 | Landing page — seasonal banner |
| 7 | 1 | Prayer Wall — seasonal QOTD prompts |
| 8 | 2 | Navbar — seasonal icon |

Steps 3, 4, and 7 depend only on Step 1 (constants). Steps 5, 6, and 8 depend on Step 2 (hook). Steps 3/4/7 can be done in parallel. Steps 5/6/8 can be done in parallel after Step 2.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Liturgical Calendar Constants & Computus | [COMPLETE] | 2026-03-22 | Created `liturgical-calendar.ts` with 8 season definitions, Computus algorithm, `getLiturgicalSeason()`, `getSeasonStartDate()`, `getDayWithinSeason()`. 21 tests passing. |
| 2 | `useLiturgicalSeason` Hook | [COMPLETE] | 2026-03-22 | Created `useLiturgicalSeason.ts` hook with `useMemo` wrapping `getLiturgicalSeason()`. 4 tests passing. |
| 3 | Seasonal Devotional Content & Selection | [COMPLETE] | 2026-03-22 | Added `season?` field to Devotional type, 20 seasonal devotionals (5 advent, 5 lent, 3 easter, 3 christmas, 2 holy-week, 2 pentecost), modified `getTodaysDevotional()` to prioritize seasonal content. Fixed fallback to use general-only pool. 24 tests passing. |
| 4 | Seasonal Verse of the Day Tagging | [COMPLETE] | 2026-03-22 | Tagged 20 existing verses with `season` field (5 advent, 5 lent, 4 easter, 3 christmas, 2 holy-week, 1 pentecost). Modified `getTodaysVerse()` to prioritize seasonal verses. 17 tests passing. |
| 5 | Dashboard Greeting — Seasonal Suffix | [COMPLETE] | 2026-03-22 | Added `useLiturgicalSeason` to DashboardHero, seasonal suffix in h1 with theme color, responsive (block mobile, inline desktop). 5 new + 7 existing tests passing. |
| 6 | Landing Page — Seasonal Banner | [COMPLETE] | 2026-03-22 | Created `SeasonalBanner.tsx` with sessionStorage dismiss, icon mapping, reduced-motion support. Added to `Home.tsx`. Fixed Home test for dual "Read Today" links. 11 banner tests + 10 Home tests passing. |
| 7 | Prayer Wall — Seasonal QOTD Prompts | [COMPLETE] | 2026-03-22 | Added `liturgicalSeason?` field to `QuestionOfTheDay`, 12 seasonal questions (3 advent, 3 lent, 3 easter, 3 christmas). Modified `getTodaysQuestion()` with fallback after exhaustion. 17 tests passing. |
| 8 | Navbar — Seasonal Icon | [COMPLETE] | 2026-03-22 | Added `useLiturgicalSeason` + icon mapping to `NavbarLogo`. 14px mobile, 16px desktop, 50% opacity, aria-hidden. 4 new + 50 existing Navbar tests passing. |
