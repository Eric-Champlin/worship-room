# Implementation Plan: Devotional Dashboard Integration & Mood Personalization

**Spec:** `_specs/devotional-dashboard-integration.md`
**Date:** 2026-03-20
**Branch:** `claude/feature/devotional-dashboard-integration`
**Design System Reference:** `_plans/recon/design-system.md` (loaded)
**Recon Report:** not applicable (no external recon needed — all integration with existing dashboard)
**Master Spec Plan:** `dashboard-growth-spec-plan-v2.md` (loaded — Spec 2 Dashboard Shell, Spec 5 Mood Recommendations)

---

## Architecture Context

### Project Structure (relevant files)

```
frontend/src/
├── pages/
│   ├── Dashboard.tsx                      # Dashboard page with phase system
│   └── DevotionalPage.tsx                 # /devotional page (Spec 16)
├── components/dashboard/
│   ├── DashboardCard.tsx                  # Frosted glass card with collapsible
│   ├── DashboardHero.tsx                  # Hero with greeting/streak/level
│   ├── DashboardWidgetGrid.tsx            # Grid of all dashboard widgets
│   ├── MoodRecommendations.tsx            # Post-check-in recommendation cards
│   ├── VerseOfTheDayCard.tsx              # VOTD widget content
│   ├── GettingStartedCard.tsx             # Checklist card
│   ├── WeeklyRecap.tsx                    # Existing weekly recap (friends-focused)
│   └── __tests__/                         # Test directory
├── data/
│   └── devotionals.ts                     # DEVOTIONAL_POOL (30 entries) + getTodaysDevotional()
├── types/
│   ├── devotional.ts                      # Devotional, DevotionalTheme types
│   └── dashboard.ts                       # MoodValue, MoodEntry, DailyActivities types
├── constants/dashboard/
│   ├── recommendations.ts                 # MOOD_RECOMMENDATIONS (3 per mood)
│   └── mood.ts                            # MOOD_COLORS, MOOD_OPTIONS
├── hooks/
│   ├── useAuth.ts                         # { isAuthenticated, user }
│   ├── useFaithPoints.ts                  # Activity tracking
│   ├── useWeeklyRecap.ts                  # Existing weekly recap hook
│   └── useReducedMotion.ts                # prefers-reduced-motion
├── utils/
│   └── date.ts                            # getLocalDateString(), getCurrentWeekStart()
└── services/
    ├── mood-storage.ts                    # getMoodEntries(), hasCheckedInToday()
    └── faith-points-storage.ts            # getActivityLog()
```

### Key Patterns

- **Dashboard phase system:** `'onboarding' → 'check_in' → 'recommendations' → 'dashboard_enter' → 'dashboard'` in `Dashboard.tsx`
- **DashboardCard component:** Frosted glass (`bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`), collapsible, takes `id`, `title`, `icon`, `action`, `children`, `className`, `style` props
- **Widget grid:** `DashboardWidgetGrid.tsx` renders cards in a `grid grid-cols-1 lg:grid-cols-5` with CSS `order-*` for responsive reordering. Animation stagger via `getAnimProps()` counter
- **Mood recommendations:** `MoodRecommendations.tsx` reads from `MOOD_RECOMMENDATIONS` constant, renders `Link` cards with mood-colored left border, auto-advances after 5s
- **Devotional data:** `getTodaysDevotional()` returns `Devotional` using `dayOfYear % 30`. Reads tracked via `wr_devotional_reads` localStorage key (array of `YYYY-MM-DD` date strings using `toLocaleDateString('en-CA')`)
- **Date utilities:** Always use `getLocalDateString()` from `utils/date.ts` for localStorage date keys. DevotionalPage uses `toLocaleDateString('en-CA')` which produces the same `YYYY-MM-DD` format
- **Test patterns:** MemoryRouter + AuthProvider + ToastProvider wrapping. `vi.mock` for hooks. `localStorage.clear()` in `beforeEach`. `vi.useFakeTimers` for time-dependent tests
- **Auth gating:** `useAuth()` context — dashboard only renders when `user` is non-null. All features in this spec are inherently auth-gated by the dashboard's `if (!user) return null` guard
- **Existing weekly recap:** `useWeeklyRecap.ts` is a friends-focused community recap in a DashboardCard. The new "God Moments" banner is a separate, visually distinct component positioned outside the widget grid

### Grid Layout (Desktop lg:grid-cols-5)

Current widget order and placement:
| Widget | Mobile Order | Desktop Order | Col Span | Desktop Row |
|--------|-------------|---------------|----------|-------------|
| Mood Chart | order-2 | lg:order-1 | 3 | Row 1 left |
| Verse of the Day | order-3 | lg:order-2 | 3 | Row 2 left |
| Streak & Points | order-1 | lg:order-3 | 2 | Row 2 right |
| Activity Checklist | order-4 | order-4 | 3 | Row 3 left |
| Friends Preview | order-5 | order-5 | 2 | Row 3 right |
| Weekly Recap | order-6 | order-6 | 5 | Row 4 full |
| Quick Actions | order-7 | order-7 | 5 | Row 5 full |

New "Today's Devotional" widget will use `order-4 lg:col-span-3` and be placed in DOM before Activity Checklist. CSS order tie-breaking (same `order-4`, DOM order wins) ensures it renders before Activity without renumbering existing widgets.

### Dashboard.tsx Layout (outside widget grid)

```
<DashboardHero />
{/* NEW: Weekly "God Moments" banner goes HERE */}
{showGettingStarted && <GettingStartedCard />}
<DashboardWidgetGrid />
```

The spec says: "If the Getting Started Checklist is visible, the banner appears between the DashboardHero and the Getting Started Checklist." This is exactly the insertion point above.

---

## Auth Gating Checklist

**Every action in the spec that requires login must have an auth check in the plan.**

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| View dashboard widget | Dashboard is auth-gated (logged-out sees landing page) | Step 2 | Inherited — `Dashboard.tsx` line 128: `if (!user) return null` |
| View mood recommendations | Recommendations phase is auth-gated (only after check-in) | Step 3 | Inherited — `MoodRecommendations` only renders in `recommendations` phase |
| View weekly banner | Dashboard is auth-gated | Step 4 | Inherited — banner rendered inside Dashboard component |
| Dismiss weekly banner | Dashboard is auth-gated | Step 4 | Inherited — dismiss button inside auth-gated dashboard |

No new auth gates needed — all features are contained within the already auth-gated Dashboard component.

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Dashboard card | background | `bg-white/5 backdrop-blur-sm` | DashboardCard.tsx:49 |
| Dashboard card | border | `border border-white/10 rounded-2xl` | DashboardCard.tsx:49 |
| Dashboard card | padding | `p-4 md:p-6` | DashboardCard.tsx:49 |
| Dashboard card | hover | `hover:border-white/20` | DashboardCard.tsx:49 |
| Card title | font | `text-base font-semibold text-white md:text-lg` | DashboardCard.tsx:63 |
| Card icon | color | `text-white/60` | DashboardCard.tsx:57 |
| Recommendation card | border/bg | `rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm` | MoodRecommendations.tsx:111 |
| Recommendation card | left border | `borderLeftWidth: 4px, borderLeftColor: moodColor` | MoodRecommendations.tsx:115-116 |
| Recommendation title | font | `text-base font-semibold text-white` | MoodRecommendations.tsx:125 |
| Recommendation desc | font | `text-sm text-white/60` | MoodRecommendations.tsx:126 |
| Mood colors | map | `{1:'#D97706', 2:'#C2703E', 3:'#8B7FA8', 4:'#2DD4BF', 5:'#34D399'}` | mood.ts:57-63 |
| Success green | color | `#27AE60` / `text-success` | 09-design-system.md |
| Primary/10 | background | `bg-primary/10` → `rgba(109,40,217,0.1)` | Tailwind computed |
| Primary/20 | border | `border-primary/20` → `rgba(109,40,217,0.2)` | Tailwind computed |
| CTA link (primary-lt) | color | `text-primary-lt` → `#8B5CF6` | design-system.md |

---

## Design System Reminder

**Project-specific quirks that `/execute-plan` displays before every UI step:**

- Dashboard uses frosted glass cards: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`
- Mood colors: Struggling=#D97706, Heavy=#C2703E, Okay=#8B7FA8, Good=#2DD4BF, Thriving=#34D399
- Card icons always wrapped in `<span className="text-white/60" aria-hidden="true">`
- Dashboard background: `bg-[#0f0a1e]` (near-black purple)
- Widget grid uses CSS `order-*` for responsive reordering — same order value = DOM order wins
- Animation stagger: `getAnimProps()` counter assigns `animationDelay` in 100ms increments
- `DashboardCard` collapses via grid-rows transition (`grid-rows-[0fr]` → `grid-rows-[1fr]`)
- Date strings: always use `getLocalDateString()` from `utils/date.ts` — never `toISOString()`
- Devotional dates: DevotionalPage uses `toLocaleDateString('en-CA')` which is equivalent to `getLocalDateString()`
- All `DashboardCard` ids are kebab-case strings used as localStorage collapse keys

---

## Shared Data Models (from Master Plan & Spec 16)

```typescript
// From types/devotional.ts (Spec 16)
export type DevotionalTheme =
  | 'trust' | 'gratitude' | 'forgiveness' | 'identity'
  | 'anxiety-and-peace' | 'faithfulness' | 'purpose'
  | 'hope' | 'healing' | 'community'

export interface Devotional {
  id: string
  dayIndex: number
  title: string
  theme: DevotionalTheme
  quote: DevotionalQuote
  passage: DevotionalPassage
  reflection: string[]       // Array of paragraphs
  prayer: string
  reflectionQuestion: string
}

// From types/dashboard.ts (Spec 1)
export type MoodValue = 1 | 2 | 3 | 4 | 5

export interface DailyActivities {
  mood: boolean; pray: boolean; listen: boolean
  prayerWall: boolean; meditate: boolean; journal: boolean
  pointsEarned: number; multiplier: number
}

export type DailyActivityLog = Record<string, DailyActivities>

export interface MoodEntry {
  id: string; date: string; mood: MoodValue
  moodLabel: string; text?: string; timestamp: number; verseSeen: string
}
```

**localStorage keys this spec touches:**

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_devotional_reads` | Read | Array of date strings (YYYY-MM-DD). Owned by Spec 16. |
| `wr_daily_activities` | Read | Activity log keyed by date. Owned by Spec 5/6. |
| `wr_mood_entries` | Read | Array of MoodEntry objects. Owned by Spec 1. |
| `wr_weekly_summary_dismissed` | Read/Write | **NEW.** Single date string (YYYY-MM-DD) of last dismissed Monday. |

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | < 640px | Dashboard grid single-column; banner stats stack vertically; recommendation cards stack vertically |
| Tablet | 640-1024px | Dashboard grid 2-column (5-col); banner stats horizontal with dividers; recommendation cards stack vertically |
| Desktop | > 1024px | Dashboard grid 2-column (5-col); banner full-width with horizontal stats; recommendation cards in horizontal row (3 or 4) |

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| DashboardHero → Banner/GettingStarted | `pb-4 md:pb-6` (from container padding) | Dashboard.tsx:191-192 |
| Banner → GettingStarted/WidgetGrid | `pb-4 md:pb-6` (matching existing spacing) | Dashboard.tsx:191-192 |
| Widget card → Widget card | `gap-4 md:gap-6` (from grid) | DashboardWidgetGrid.tsx:63 |

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] Spec 16 (Daily Devotional Page) is implemented and committed — `DevotionalPage.tsx`, `data/devotionals.ts`, `types/devotional.ts` exist
- [x] Dashboard shell (Spec 2) and Mood Recommendations (Spec 5) are implemented
- [x] `wr_devotional_reads` localStorage key is populated by DevotionalPage's Intersection Observer
- [x] `getTodaysDevotional()` function exists in `data/devotionals.ts`
- [x] `getLocalDateString()` and `getCurrentWeekStart()` exist in `utils/date.ts`
- [x] All auth-gated actions from the spec are accounted for in the plan (inherited from dashboard auth gate)
- [x] Design system values are verified from DashboardCard.tsx and MoodRecommendations.tsx source
- [ ] All [UNVERIFIED] values are flagged with verification methods
- [x] Prior specs in the sequence are complete and committed (Spec 16 implemented)

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Widget order value | Use `order-4` (same as Activity), rely on DOM order tie-breaking | Avoids renumbering all existing widgets. DOM position before Activity ensures correct visual order. |
| Theme name formatting | Create `formatThemeName()` utility: replace hyphens with spaces, title-case each word | e.g., `'anxiety-and-peace'` → `'Anxiety and Peace'`. Simple string transform. |
| Date format compatibility | Use `getLocalDateString()` for new code; DevotionalPage's `toLocaleDateString('en-CA')` produces identical output | Both return `YYYY-MM-DD` in local timezone. No conversion needed. |
| Weekly banner vs existing WeeklyRecap | Entirely separate component — different purpose, different styling, different position | Existing WeeklyRecap is friends-focused, inside widget grid. New banner is personal spiritual summary, above widget grid. |
| Mood recommendation card count | Dynamically include devotional card (0 or 1) + existing 3 = 3 or 4 total | Flex layout handles 3 or 4 cards naturally with `lg:flex-1`. |
| Banner placement when both GettingStarted and banner are visible | Banner first, then GettingStarted | Spec: "banner appears between DashboardHero and the Getting Started Checklist" |
| `wr_weekly_summary_dismissed` format | Single string, not array | Spec explicitly states: "A single date string... not an array." Old dismissals become irrelevant when new week starts. |
| Widget re-read on focus | Re-read `wr_devotional_reads` on component mount | DevotionalPage writes to localStorage; dashboard reads on mount. `storage` event listener not needed since same-tab localStorage writes are synchronous. |

---

## Implementation Steps

### Step 1: Theme-to-Mood Mapping & Formatting Utilities

**Objective:** Create the static `THEME_TO_MOOD` mapping constant and a `formatThemeName()` utility function.

**Files to create/modify:**
- `frontend/src/constants/dashboard/devotional-integration.ts` — NEW: theme-to-mood mapping
- `frontend/src/utils/devotional.ts` — NEW: `formatThemeName()` utility

**Details:**

Create `constants/dashboard/devotional-integration.ts`:
```typescript
import type { DevotionalTheme } from '@/types/devotional'
import type { MoodValue } from '@/types/dashboard'

/**
 * Maps devotional themes to the mood values where they are most thematically relevant.
 * Used to determine whether today's devotional should be recommended after mood check-in.
 */
export const THEME_TO_MOOD: Record<DevotionalTheme, MoodValue[]> = {
  trust: [1, 2],
  gratitude: [4, 5],
  forgiveness: [1, 2],
  identity: [2, 3],
  'anxiety-and-peace': [1, 2],
  faithfulness: [3, 4],
  purpose: [3, 4],
  hope: [1, 2],
  healing: [1, 2],
  community: [4, 5],
}
```

Create `utils/devotional.ts`:
```typescript
/**
 * Formats a DevotionalTheme slug into title case for display.
 * e.g., 'anxiety-and-peace' → 'Anxiety and Peace'
 */
export function formatThemeName(theme: string): string {
  return theme
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
```

**Guardrails (DO NOT):**
- Do NOT embed the mapping inside the devotional data entries — it's a separate lookup
- Do NOT modify any existing files in this step

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `THEME_TO_MOOD covers all 10 themes` | unit | Verify every DevotionalTheme key is present |
| `THEME_TO_MOOD maps trust to [1,2]` | unit | Spot-check mapping values per spec table |
| `THEME_TO_MOOD maps gratitude to [4,5]` | unit | Verify positive mood themes |
| `formatThemeName converts hyphens to spaces and title-cases` | unit | `'anxiety-and-peace'` → `'Anxiety and Peace'` |
| `formatThemeName handles single-word themes` | unit | `'trust'` → `'Trust'` |

**Expected state after completion:**
- [x] `THEME_TO_MOOD` constant exists with all 10 themes mapped
- [x] `formatThemeName()` converts theme slugs to display names
- [x] All tests pass

---

### Step 2: Dashboard "Today's Devotional" Widget

**Objective:** Create the `TodaysDevotionalCard` widget component and integrate it into the `DashboardWidgetGrid`.

**Files to create/modify:**
- `frontend/src/components/dashboard/TodaysDevotionalCard.tsx` — NEW: widget content component
- `frontend/src/components/dashboard/DashboardWidgetGrid.tsx` — MODIFY: add new widget card

**Details:**

**`TodaysDevotionalCard.tsx`** — inner content component (rendered inside `DashboardCard`):

```typescript
// Key behavior:
// 1. Get today's devotional via getTodaysDevotional()
// 2. Check wr_devotional_reads for today's date → isRead boolean
// 3. Render: title (+ green check if read), theme pill, 2-line reflection preview, CTA link

// Read state detection:
const todayStr = getLocalDateString()
const reads = JSON.parse(localStorage.getItem('wr_devotional_reads') || '[]') as string[]
const isRead = reads.includes(todayStr)

// Theme pill: formatThemeName(devotional.theme)
// Preview: devotional.reflection[0] (first paragraph), line-clamp-2
// CTA: Link to="/devotional"
```

Styling specs:
- Title: `text-base font-semibold text-white` with inline green checkmark when read (`Check` icon, `h-4 w-4 text-success`)
- Theme pill: `bg-white/10 rounded-full text-xs px-2.5 py-0.5 text-white/60`
- Preview: `text-sm text-white/60 leading-relaxed line-clamp-2 mt-2`
- CTA (unread): `text-sm text-primary-lt hover:text-primary font-medium mt-3 inline-flex items-center gap-1` — "Read today's devotional →"
- CTA (read): `text-sm text-white/50 hover:text-white/70 font-medium mt-3 inline-flex items-center gap-1` — "Read again →"
- Green check: `<Check className="h-4 w-4 text-success inline ml-1.5" />` with `aria-label="Completed"`

**`DashboardWidgetGrid.tsx`** modifications:
1. Import `BookOpen` (already imported), `TodaysDevotionalCard`
2. Add `devotionalAnim` to the animation stagger chain (after `verseAnim`, before `streakAnim`)
3. Add new `DashboardCard` with:
   - `id="todays-devotional"`
   - `title="Today's Devotional"`
   - `icon={<BookOpen className="h-5 w-5" />}`
   - `className={cn('order-4 lg:col-span-3', devotionalAnim.className)}`
   - `style={devotionalAnim.style}`
4. Position in JSX: after the Verse of the Day `DashboardCard`, before the Streak `DashboardCard`

Note: Using `order-4` (same as Activity) + DOM position before Activity ensures correct ordering on all breakpoints without renumbering existing widgets.

**Responsive behavior:**
- Desktop (> 1024px): Left column (`lg:col-span-3`), row below Verse of the Day
- Tablet (640-1024px): Same as desktop in 2-column grid
- Mobile (< 640px): Full-width card in single-column stack, between Verse of the Day and Activity

**Guardrails (DO NOT):**
- Do NOT modify existing widget order values
- Do NOT write to `wr_devotional_reads` — only read
- Do NOT add a `BookOpen` icon import if already imported (it is — check line 1)
- Do NOT add the `action` prop to DashboardCard — the CTA is inside the card content, not the header

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `renders devotional title` | unit | Today's devotional title text is visible |
| `renders theme pill with formatted name` | unit | Theme displayed in title case, correct pill classes |
| `renders 2-line reflection preview` | unit | First paragraph of reflection with line-clamp-2 |
| `renders "Read today's devotional" CTA when unread` | unit | Link text, href="/devotional", primary-lt color |
| `renders green checkmark when read` | unit | Set `wr_devotional_reads` with today, verify Check icon appears |
| `renders "Read again" CTA when read` | unit | Link text changes, softer color classes |
| `checkmark has aria-label "Completed"` | unit | Accessibility for screen readers |
| `CTA link navigates to /devotional` | unit | Link `to` prop is `/devotional` |
| `widget appears in DashboardWidgetGrid` | integration | Render grid, verify "Today's Devotional" card title exists |
| `widget uses DashboardCard with correct id` | integration | Card has `id="todays-devotional"` |

**Expected state after completion:**
- [x] "Today's Devotional" widget appears in dashboard grid after Verse of the Day
- [x] Widget shows unread/read states correctly
- [x] Widget is collapsible via DashboardCard
- [x] All tests pass

---

### Step 3: Mood-Based Devotional Recommendation Card

**Objective:** Integrate today's devotional as a recommendation card in the mood-to-content system when the theme matches the user's mood and the devotional hasn't been read.

**Files to create/modify:**
- `frontend/src/components/dashboard/MoodRecommendations.tsx` — MODIFY: add devotional card logic
- `frontend/src/constants/dashboard/recommendations.ts` — no changes needed (existing recs unchanged)

**Details:**

Modify `MoodRecommendations.tsx`:

1. Import `getTodaysDevotional` from `@/data/devotionals`, `THEME_TO_MOOD` from `@/constants/dashboard/devotional-integration`, `getLocalDateString` from `@/utils/date`

2. Add devotional recommendation logic inside the component (before the JSX):
```typescript
// Check if today's devotional theme matches the user's mood
const devotional = getTodaysDevotional()
const themeMatchesMood = THEME_TO_MOOD[devotional.theme]?.includes(moodValue) ?? false

// Check if user has already read today's devotional
const todayStr = getLocalDateString()
const devotionalReads = JSON.parse(
  localStorage.getItem('wr_devotional_reads') || '[]',
) as string[]
const hasReadToday = devotionalReads.includes(todayStr)

// Build recommendations list: prepend devotional if relevant & unread
const baseRecommendations = MOOD_RECOMMENDATIONS[moodValue]
const showDevotional = themeMatchesMood && !hasReadToday

const devotionalRec: MoodRecommendation = {
  title: 'Read Today\'s Devotional',
  description: devotional.title,
  icon: 'BookOpen',
  route: '/devotional',
}

const allRecommendations = showDevotional
  ? [devotionalRec, ...baseRecommendations]
  : baseRecommendations
```

3. Replace `recommendations` variable with `allRecommendations` in the JSX `map()`.

4. The existing card layout (`flex-col lg:flex-row lg:gap-4` with `lg:flex-1` on each card) already handles 3 or 4 items gracefully — `flex-1` distributes space evenly regardless of count.

**Responsive behavior:**
- Desktop (> 1024px): 3 or 4 cards in horizontal row, each `lg:flex-1`
- Tablet (640-1024px): Cards stack vertically, full width
- Mobile (< 640px): Cards stack vertically with `gap-3`

**Guardrails (DO NOT):**
- Do NOT modify the `MOOD_RECOMMENDATIONS` constant — only prepend at runtime
- Do NOT show devotional recommendation if theme doesn't match mood
- Do NOT show devotional recommendation if already read today
- Do NOT change existing recommendation card styling or behavior
- Do NOT add any new icon imports if BookOpen is already in ICON_MAP (it is)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `shows devotional card when theme matches mood and unread` | unit | Mock today's devotional with theme 'trust', mood 1 → 4 cards rendered |
| `devotional card is first in list` | unit | First card title is "Read Today's Devotional" |
| `devotional card description is devotional title` | unit | Card description matches `getTodaysDevotional().title` |
| `devotional card links to /devotional` | unit | Link `to` is `/devotional` |
| `does NOT show devotional when theme doesn't match mood` | unit | Theme 'gratitude' + mood 1 → only 3 cards |
| `does NOT show devotional when already read` | unit | Set `wr_devotional_reads` with today → only 3 cards |
| `shows 3 existing cards unchanged when no devotional match` | unit | Original recommendations present |
| `handles missing wr_devotional_reads gracefully` | unit | No localStorage key → treats as unread |
| `layout handles 4 cards without breakage` | unit | When devotional shown, all 4 cards render with correct structure |

**Expected state after completion:**
- [x] Devotional recommendation appears as first card when theme matches mood and unread
- [x] Existing 3 recommendation cards unchanged when no match
- [x] 4-card layout renders correctly on all breakpoints
- [x] All tests pass

---

### Step 4: Weekly "God Moments" Summary Banner

**Objective:** Create the `WeeklyGodMoments` banner component and its `useWeeklyGodMoments()` hook, and integrate into the Dashboard layout.

**Files to create/modify:**
- `frontend/src/hooks/useWeeklyGodMoments.ts` — NEW: hook for banner visibility, stats, dismissal
- `frontend/src/components/dashboard/WeeklyGodMoments.tsx` — NEW: banner component
- `frontend/src/pages/Dashboard.tsx` — MODIFY: render banner between hero and checklist/grid

**Details:**

**`useWeeklyGodMoments.ts`** — custom hook:

```typescript
interface WeeklyGodMomentsData {
  isVisible: boolean
  devotionalsRead: number       // count in past 7 days
  totalActivities: number       // sum of all activities past 7 days
  moodTrend: 'improving' | 'steady' | 'needs-grace' | 'insufficient'
  dismiss: () => void
}
```

Visibility logic (ALL must be true):
1. User is authenticated (checked by Dashboard parent — hook can assume true)
2. Banner not dismissed for this week: `wr_weekly_summary_dismissed !== getCurrentWeekStart()`
3. User has ≥ 3 distinct active days in past 14 days (from `wr_daily_activities`)

Computing "this week's Monday": use `getCurrentWeekStart()` from `utils/date.ts`.

Stats computation:
- **Devotionals read**: Count dates in `wr_devotional_reads` that fall within past 7 days
- **Total activities**: Sum all `true` activity values across `wr_daily_activities` for past 7 days (mood + pray + journal + meditate + listen + prayerWall)
- **Mood trend**:
  - Get mood entries from `wr_mood_entries` for this week (last 7 days) and last week (days 8-14)
  - Compute averages
  - If either week has < 2 entries: `'insufficient'`
  - If this week avg > last week avg + 0.2: `'improving'`
  - If this week avg < last week avg - 0.2: `'needs-grace'`
  - Otherwise: `'steady'`

Dismissal: Write `getCurrentWeekStart()` to `wr_weekly_summary_dismissed` in localStorage.

**`WeeklyGodMoments.tsx`** — banner component:

Props: `WeeklyGodMomentsData` (or call `useWeeklyGodMoments()` internally — hook approach is cleaner for testing).

Structure:
```
<div className="relative bg-primary/10 border border-primary/20 rounded-2xl p-4 md:p-6">
  {/* Dismiss X - top right */}
  <button aria-label="Dismiss weekly summary" ...>
    <X className="h-5 w-5" />
  </button>

  {/* Heading */}
  <h2 className="font-semibold text-lg text-white mb-4">Your Week with God</h2>

  {/* Stats row */}
  <div className="flex flex-col gap-4 sm:flex-row sm:gap-0 sm:divide-x sm:divide-white/10">
    {/* Stat 1: Devotionals */}
    {/* Stat 2: Activities */}
    {/* Stat 3: Mood Trend */}
  </div>
</div>
```

Stat 1 (Devotionals):
- Icon: `BookOpen` (24px)
- Text: `"X of 7 devotionals"`
- Accent: `text-success` if 7/7, else `text-white/60`

Stat 2 (Activities):
- Icon: `CheckCircle` (24px)
- Text: `"X activities this week"`
- Color: `text-white/60`

Stat 3 (Mood Trend):
- `'improving'`: `TrendingUp` icon in `text-success`, label "Improving"
- `'steady'`: `Minus` icon in `text-white/60`, label "Steady"
- `'needs-grace'`: `Heart` icon in `text-amber-400`, label "Needs grace"
- `'insufficient'`: `TrendingUp` icon in `text-white/40`, label "Keep checking in"

Dismiss behavior:
- Fade-out animation: `transition-opacity duration-300` + state toggle
- After fade completes (300ms), call `dismiss()` to persist to localStorage
- `prefers-reduced-motion`: skip fade, dismiss immediately

**`Dashboard.tsx`** modifications:

1. Import `WeeklyGodMoments` and `useWeeklyGodMoments`
2. Call `useWeeklyGodMoments()` in Dashboard component
3. Render banner between DashboardHero and GettingStartedCard:

```jsx
{/* After DashboardHero div */}
{godMoments.isVisible && (
  <div
    className={cn(
      'mx-auto max-w-6xl px-4 pb-4 sm:px-6 md:pb-6',
      shouldAnimate && 'motion-safe:animate-widget-enter',
    )}
    style={shouldAnimate ? { animationDelay: '100ms' } : undefined}
  >
    <WeeklyGodMoments {...godMoments} />
  </div>
)}
{showGettingStarted && (
  // existing GettingStartedCard...
  // Adjust stagger: if banner visible, GettingStarted delay shifts to 200ms
)}
```

4. Adjust animation stagger: if banner is visible, shift GettingStartedCard's delay by 100ms to account for the banner taking the 100ms slot. Update `staggerStartIndex` calculation for DashboardWidgetGrid.

**Responsive behavior:**
- Desktop (> 1024px): Full-width, stats in horizontal row with dividers, `p-6`, dismiss X top-right
- Tablet (640-1024px): Same as desktop
- Mobile (< 640px): Full-width, stats stack vertically (no dividers), `p-4`, dismiss X top-right

**[UNVERIFIED] values:**

```
[UNVERIFIED] bg-primary/10 visual appearance on bg-[#0f0a1e] dashboard background
→ To verify: Run /verify-with-playwright and check that the purple tint is visually distinguishable from bg-white/5 cards
→ If wrong: Adjust opacity (try bg-primary/15 or bg-primary/8)
```

```
[UNVERIFIED] text-amber-400 for "Needs grace" icon color
→ To verify: Run /verify-with-playwright and confirm warm amber tone reads well on dark background
→ If wrong: Try text-amber-500 or text-warning (#F39C12)
```

**Guardrails (DO NOT):**
- Do NOT modify existing `WeeklyRecap` component or `useWeeklyRecap` hook — this is separate
- Do NOT show banner for users with < 3 active days in past 14 days
- Do NOT use "declining" or "worse" language — only "Needs grace" with Heart icon
- Do NOT write to `wr_devotional_reads`, `wr_daily_activities`, or `wr_mood_entries` — read only
- Do NOT use `wr_weekly_summary_last_shown` — the spec simplifies to just `wr_weekly_summary_dismissed` (single Monday date). Show banner whenever the dismissed date doesn't match current week's Monday AND other conditions are met
- Do NOT put the banner inside DashboardWidgetGrid — it goes outside, in Dashboard.tsx

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| **Hook: `useWeeklyGodMoments`** | | |
| `isVisible true when conditions met` | unit | 3+ active days, not dismissed, authenticated |
| `isVisible false when dismissed this week` | unit | Set `wr_weekly_summary_dismissed` to current Monday |
| `isVisible false when < 3 active days in past 14` | unit | Seed 2 days of activity → false |
| `counts devotionals read in past 7 days` | unit | Seed `wr_devotional_reads` with mixed dates → correct count |
| `counts total activities in past 7 days` | unit | Seed `wr_daily_activities` → correct sum |
| `mood trend: improving` | unit | This week avg 4.0, last week avg 3.5 → 'improving' |
| `mood trend: steady` | unit | Averages within 0.2 → 'steady' |
| `mood trend: needs-grace` | unit | This week avg 2.0, last week avg 3.0 → 'needs-grace' |
| `mood trend: insufficient` | unit | < 2 entries in one week → 'insufficient' |
| `dismiss writes current Monday to localStorage` | unit | Call dismiss, check `wr_weekly_summary_dismissed` |
| `new week clears previous dismissal` | unit | Old Monday in dismissed, new week → isVisible true |
| **Component: `WeeklyGodMoments`** | | |
| `renders "Your Week with God" heading` | unit | Heading text visible |
| `renders 3 stats` | unit | Devotionals, activities, mood trend all present |
| `7/7 devotionals uses success green` | unit | text-success class applied |
| `"Needs grace" shows Heart icon` | unit | Heart icon rendered with warm color |
| `"Keep checking in" shown for insufficient data` | unit | Correct label and muted icon |
| `dismiss button has aria-label` | unit | "Dismiss weekly summary" |
| `dismiss button hides banner` | unit | Click dismiss → banner disappears |
| `dismiss button meets 44px touch target` | unit | `min-h-[44px] min-w-[44px]` or equivalent |
| **Integration in Dashboard** | | |
| `banner renders between hero and widget grid` | integration | DOM order: hero → banner → grid |
| `banner renders before GettingStartedCard when both visible` | integration | Banner appears first |
| `banner does not render when conditions not met` | integration | No active days → no banner |

**Expected state after completion:**
- [x] Weekly "God Moments" banner appears on dashboard when conditions met
- [x] Banner shows 3 stats: devotionals, activities, mood trend
- [x] Banner is dismissible with fade-out animation
- [x] Banner positioned correctly between hero and checklist/grid
- [x] All tests pass

---

### Step 5: Integration Tests & Edge Cases

**Objective:** Add integration tests covering cross-feature interactions, edge cases, and accessibility compliance.

**Files to create/modify:**
- `frontend/src/components/dashboard/__tests__/TodaysDevotionalCard.test.tsx` — covered in Step 2
- `frontend/src/components/dashboard/__tests__/WeeklyGodMoments.test.tsx` — covered in Step 4
- `frontend/src/components/dashboard/__tests__/MoodRecommendations.test.tsx` — MODIFY: add devotional integration tests
- `frontend/src/components/dashboard/__tests__/devotional-integration.test.tsx` — NEW: cross-feature integration tests

**Details:**

**`devotional-integration.test.tsx`** — integration test file:

```typescript
// Tests that verify cross-feature behavior:
// 1. Dashboard widget + DevotionalPage read completion sync
// 2. Mood recommendation + devotional read state
// 3. Weekly banner stats accuracy
// 4. No regressions to existing widgets
```

Key integration test cases:

| Test | Type | Description |
|------|------|-------------|
| `widget updates when wr_devotional_reads changes` | integration | Set localStorage, remount widget → reflects read state |
| `recommendation card disappears when devotional is read` | integration | Initially shows (theme match), set read, re-render → 3 cards |
| `weekly banner counts correct devotionals across week` | integration | Seed reads for Mon-Fri, check count = 5 |
| `weekly banner mood trend handles empty weeks` | integration | No mood entries → 'insufficient' |
| `existing dashboard widgets unchanged` | integration | Render full grid, verify Mood Chart, Streak, Activity, Friends, Quick Actions all present |
| `existing recommendation cards unchanged when no devotional match` | integration | Mood 1, theme 'gratitude' (no match) → original 3 cards only |
| `accessibility: widget card has section with aria-labelledby` | a11y | DashboardCard renders `<section aria-labelledby>` |
| `accessibility: banner stats readable by screen readers` | a11y | Each stat has text descriptions, not just icons |
| `accessibility: dismiss X has aria-label` | a11y | `aria-label="Dismiss weekly summary"` |
| `accessibility: CTA links are keyboard-accessible` | a11y | Tab to CTA link, Enter navigates |
| `reduced motion: banner dismiss is instant` | a11y | Mock `prefers-reduced-motion: reduce`, dismiss skips fade |

**Guardrails (DO NOT):**
- Do NOT modify existing test files beyond adding new test cases for the devotional integration
- Do NOT remove or weaken any existing test assertions
- Do NOT skip tests — all must pass

**Expected state after completion:**
- [x] Full test coverage for all 3 features
- [x] Cross-feature integration verified
- [x] No regressions to existing dashboard tests
- [x] Accessibility compliance verified
- [x] All tests pass: `pnpm test` clean

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Theme-to-mood mapping constant + formatThemeName utility |
| 2 | 1 | Dashboard "Today's Devotional" widget |
| 3 | 1 | Mood-based devotional recommendation card |
| 4 | — | Weekly "God Moments" summary banner + hook + Dashboard integration |
| 5 | 1, 2, 3, 4 | Integration tests & edge cases |

Steps 2-3 depend on Step 1 but are independent of each other. Step 4 is independent of Steps 1-3. Step 5 depends on all prior steps.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Theme-to-Mood Mapping & Utilities | [COMPLETE] | 2026-03-20 | Created `constants/dashboard/devotional-integration.ts` (THEME_TO_MOOD), `utils/devotional.ts` (formatThemeName with small-word handling), and tests (16 passing) |
| 2 | Dashboard Widget | [COMPLETE] | 2026-03-20 | Created `TodaysDevotionalCard.tsx` (read state from wr_devotional_reads, theme pill, reflection preview, CTA). Integrated into `DashboardWidgetGrid.tsx` with `order-4 lg:col-span-3`, `devotionalAnim` stagger. 9 unit tests + 8 existing grid tests pass. |
| 3 | Mood Recommendation Card | [COMPLETE] | 2026-03-20 | Modified `MoodRecommendations.tsx` to prepend devotional card when theme matches mood and unread. Added mock for getTodaysDevotional in test file, 9 new integration tests (29 total passing). |
| 4 | Weekly "God Moments" Banner | [COMPLETE] | 2026-03-20 | Created `useWeeklyGodMoments.ts` hook (visibility, stats, mood trend, dismissal). Created `WeeklyGodMoments.tsx` banner (3 stats, fade dismiss, responsive). Integrated into `Dashboard.tsx` between hero and getting-started. 23 tests (11 hook + 12 component). Adjusted staggerStartIndex for animation. |
| 5 | Integration Tests & Edge Cases | [COMPLETE] | 2026-03-20 | Created `devotional-integration.test.tsx` (13 cross-feature tests). All 98 tests across 8 test files pass. 9 pre-existing failures in Accessibility.test.tsx and transition-animation.test.tsx confirmed unrelated. |
