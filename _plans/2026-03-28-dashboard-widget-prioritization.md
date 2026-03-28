# Implementation Plan: Dashboard Widget Prioritization

**Spec:** `_specs/dashboard-widget-prioritization.md`
**Date:** 2026-03-28
**Branch:** `claude/feature/dashboard-widget-prioritization`
**Design System Reference:** `_plans/recon/design-system.md` (loaded)
**Recon Report:** not applicable
**Master Spec Plan:** not applicable — standalone feature

---

## Architecture Context

### Current Dashboard Structure

The Dashboard (`frontend/src/pages/Dashboard.tsx`, 437 lines) manages 5 phases: `onboarding`, `check_in`, `recommendations`, `dashboard_enter`, `dashboard`. Auth-gated via `useAuth()` — returns `null` if `!user`.

The main dashboard render (lines 287–437) has this structure:
1. **DashboardHero** — greeting + garden (lines 308–341), always first, animated with `widget-enter` at 0ms
2. **WeeklyGodMoments** — conditional, animated at 100ms (lines 343–352)
3. **GettingStartedCard** — conditional, animated at dynamic delay (lines 354–369)
4. **EveningReflectionBanner** — conditional, animated at dynamic delay (lines 370–386)
5. **DashboardWidgetGrid** — the widget grid (lines 387–395), receives `staggerStartIndex`

### Current Widget Grid

`DashboardWidgetGrid.tsx` (236 lines) renders widgets in a **fixed CSS order** using `order-N` classes:

| CSS Order | Widget | Component | Card ID | Col Span | Icon |
|-----------|--------|-----------|---------|----------|------|
| order-1 (mobile) / order-3 (desktop) | Streak & Faith Points | `StreakCard` | `streak-points` | `lg:col-span-2` | `Flame` |
| order-2 / order-1 | 7-Day Mood | `MoodChart` | `mood-chart` | `lg:col-span-3` | `TrendingUp` |
| order-3 / order-2 | Verse of the Day | `VerseOfTheDayCard` | `verse-of-the-day` | `lg:col-span-3` | `BookOpen` |
| order-4 | Today's Devotional | `TodaysDevotionalCard` | `todays-devotional` | `lg:col-span-3` | `BookOpen` |
| order-5 | Reading Plan | `ReadingPlanWidget` | `reading-plan` | `lg:col-span-3` | `BookOpen` |
| order-6 | My Prayers | `PrayerListWidget` | `prayer-list` | `lg:col-span-3` | `Heart` |
| order-7 | Recent Highlights | `RecentHighlightsWidget` | `recent-highlights` | `lg:col-span-3` | `Highlighter` |
| order-8 | Today's Gratitude | `GratitudeWidget` | `todays-gratitude` | `lg:col-span-3` | `Heart` (pink) |
| order-9 | Activity Checklist | `ActivityChecklist` | `activity-checklist` | `lg:col-span-3` | `CheckCircle2` |
| order-10 | Challenge | `ChallengeWidget` | `challenge` | `lg:col-span-3` | `Target` |
| order-11 | Friends & Leaderboard | `FriendsPreview` | `friends-preview` | `lg:col-span-2` | `Users` |
| order-12 | Weekly Recap | `WeeklyRecap` | `weekly-recap` | `lg:col-span-5` | `BarChart3` |
| order-13 | Quick Actions | `QuickActions` | `quick-actions` | `lg:col-span-5` | `Rocket` |

Currently, **no conditional rendering based on data state** exists in the grid — all widgets always render (except Weekly Recap which has a conditional wrapper). Widgets like ReadingPlanWidget and ChallengeWidget handle their own empty states internally.

### Key Patterns

- **DashboardCard** (`DashboardCard.tsx`, 111 lines): Frosted glass card `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 md:p-6`. Props: `id`, `title`, `icon?`, `collapsible?`, `defaultCollapsed?`, `action?`, `children`, `className?`, `style?`.
- **Collapse persistence**: `wr_dashboard_collapsed` via `dashboard-collapse-storage.ts` — `{cardId: boolean}` object.
- **Stagger animation**: `getAnimProps()` counter pattern — each widget gets `animationDelay: (staggerStartIndex + cardCounter) * 100` with class `motion-safe:animate-widget-enter`.
- **Widget-enter animation**: 400ms ease-out, 12px translateY + opacity fade-in (tailwind.config.js line 80-83).
- **Focus trap**: `useFocusTrap(isActive, onEscape)` returns a ref — handles Tab wrapping, Escape, and focus restoration.
- **ToggleSwitch**: `components/settings/ToggleSwitch.tsx` — existing toggle with `role="switch"`, `h-6 w-12`, `bg-primary` when checked, `bg-white/20` when unchecked. Props: `checked`, `onChange`, `label`, `description?`, `id`.
- **Settings page**: `Settings.tsx` — sidebar navigation with `SECTIONS` array. Desktop sidebar + mobile tabs. Auth-gated via `Navigate to="/"`.
- **Getting Started visibility**: `useGettingStarted` hook returns `isVisible` (requires `isAuthenticated && isOnboardingComplete() && !dismissed`). `isGettingStartedComplete()` checks `wr_getting_started_complete === 'true'`.
- **Evening reflection**: `isEveningTime()` checks `hours >= 18` (EVENING_HOUR_THRESHOLD = 18). `hasReflectedToday()` checks `wr_evening_reflection === today's date`.

### Widget ID Mapping (Spec → Current Card ID)

The spec defines widget IDs that differ from current `DashboardCard` IDs. This mapping is critical:

| Spec Widget ID | Current Card ID | Notes |
|----------------|-----------------|-------|
| `devotional` | `todays-devotional` | Rename in new system |
| `votd` | `verse-of-the-day` | Rename in new system |
| `activity-checklist` | `activity-checklist` | Match |
| `mood-chart` | `mood-chart` | Match |
| `streak` | `streak-points` | Rename in new system |
| `gratitude` | `todays-gratitude` | Rename in new system |
| `reading-plan` | `reading-plan` | Match |
| `challenge` | `challenge` | Match |
| `quick-actions` | `quick-actions` | Match |
| `prayer-list` | `prayer-list` | Match |
| `recent-highlights` | `recent-highlights` | Match |
| `friends` | `friends-preview` | Rename in new system |
| `weekly-recap` | `weekly-recap` | Match |
| `evening-reflection` | N/A (above grid) | New — move into grid |
| `getting-started` | N/A (above grid) | New — move into grid |

### Test Patterns

- Vitest + React Testing Library
- `describe`/`it`/`expect` from vitest
- `MemoryRouter` wrapping for routing
- `vi.mock` for hook mocking
- `localStorage.clear()` in `beforeEach`
- Provider wrapping: `AuthModalProvider`, `ToastProvider` as needed
- Example: `DashboardWidgetGrid.test.tsx`, `entrance-animation.test.tsx`

---

## Auth Gating Checklist

The entire dashboard is auth-gated. No additional auth modal triggers needed — all actions happen within the already-gated dashboard.

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| View dashboard | Auth-gated (redirects to landing if logged out) | Existing | `useAuth()` — `if (!user) return null` |
| Click "Customize" button | Only visible on auth-gated dashboard | Step 4 | Inherits from dashboard auth gate |
| Toggle widget visibility | Only in customize panel on auth-gated dashboard | Step 4 | Inherits from dashboard auth gate |
| Drag to reorder widgets | Only in customize panel on auth-gated dashboard | Step 4 | Inherits from dashboard auth gate |
| Reset to Default | Only in customize panel or Settings (both auth-gated) | Steps 4, 6 | Inherits from dashboard/settings auth gate |
| Dashboard Layout in Settings | Settings page is auth-gated | Step 6 | `Navigate to="/"` in Settings.tsx |

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Dashboard background | background | `#0f0a1e` (`bg-dashboard-dark`) | tailwind.config.js:23 |
| Dashboard card | background + border | `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl` | DashboardCard.tsx:49 |
| Dashboard card padding | padding | `p-4 md:p-6` | DashboardCard.tsx:49 |
| Customize button | styling | `bg-white/10 text-white/60 hover:bg-white/15 rounded-lg px-3 py-1.5 text-sm` | Spec req 15 |
| Panel container | background | `bg-hero-mid/95 backdrop-blur-xl border border-white/15` | Spec design notes |
| Panel backdrop | background | `bg-black/40` | Spec req |
| Panel list items | background | `bg-white/[0.06] rounded-lg p-3` | Spec design notes |
| Drag handle icon | color | `text-white/30` | Spec req 19 |
| Dragged item | effect | `shadow-lg scale-[1.02]` | Spec req 22 |
| Toggle switch (existing) | track | `h-6 w-12`, `bg-primary` active, `bg-white/20` inactive | ToggleSwitch.tsx:40-44 |
| "Reset to Default" button | styling | `bg-white/10 text-white/60 hover:bg-white/15` | Spec design notes |
| "Done" button | styling | `bg-primary text-white hover:bg-primary/90` | Spec design notes |
| Mobile bottom sheet drag bar | styling | `bg-white/30 rounded-full`, 40px wide, centered | Spec req |
| Widget-enter animation | timing | `400ms ease-out both`, 12px translateY | tailwind.config.js:80-83, 293 |

---

## Design System Reminder

**Project-specific quirks that `/execute-plan` displays before every UI step:**

- Dashboard uses frosted glass cards: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 md:p-6`
- Dashboard background is `bg-dashboard-dark` (#0f0a1e), NOT `bg-hero-dark`
- Mood colors: Struggling=#D97706, Heavy=#C2703E, Okay=#8B7FA8, Good=#2DD4BF, Thriving=#34D399
- Widget-enter animation: 400ms ease-out, translateY(12px), class `motion-safe:animate-widget-enter`
- All animations must respect `prefers-reduced-motion` via `motion-safe:` / `motion-reduce:` or `useReducedMotion()` hook
- Existing ToggleSwitch component at `components/settings/ToggleSwitch.tsx` — reuse, do not create a new toggle
- Caveat font (`font-script`) for decorative headings, NOT Lora
- Lucide React for all icons — import individually, not from barrel
- Grid layout: `grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-5` with `lg:col-span-3` (left), `lg:col-span-2` (right), `lg:col-span-5` (full)
- Hero section + navbar use `transparent` prop — they are NOT part of the widget grid
- `cn()` utility from `@/lib/utils` for conditional classes (clsx + tailwind-merge)

---

## Shared Data Models

### New localStorage Key

```typescript
// wr_dashboard_layout
interface DashboardLayout {
  order: string[]       // Widget IDs in user's preferred order
  hidden: string[]      // Widget IDs the user has hidden
  customized: boolean   // true if user has ever customized
}
```

### Widget Registry (New Constant)

```typescript
// Spec-defined widget IDs
type WidgetId =
  | 'devotional'
  | 'votd'
  | 'activity-checklist'
  | 'mood-chart'
  | 'streak'
  | 'gratitude'
  | 'reading-plan'
  | 'challenge'
  | 'quick-actions'
  | 'prayer-list'
  | 'recent-highlights'
  | 'friends'
  | 'weekly-recap'
  | 'evening-reflection'
  | 'getting-started'

interface WidgetDefinition {
  id: WidgetId
  label: string
  icon: LucideIcon
  colSpan: 'lg:col-span-2' | 'lg:col-span-3' | 'lg:col-span-5'
  fullWidth: boolean     // true for quick-actions, weekly-recap
  alwaysVisible: boolean // false for conditional widgets
}
```

**localStorage keys this spec touches:**

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_dashboard_layout` | Write | New — user's custom widget order + hidden list |
| `wr_getting_started_complete` | Read | Check if Getting Started is dismissed |
| `wr_reading_plan_progress` | Read | Check if any reading plan is active |
| `wr_challenge_progress` | Read | Check if any challenge is in progress |
| `wr_evening_reflection` | Read | Check if evening reflection done today |
| `wr_weekly_summary_dismissed` | Read | Check if weekly recap dismissed |
| `wr_bible_highlights` | Read | Check if any highlights exist |
| `wr_bible_notes` | Read | Check if any notes exist |
| `wr_dashboard_collapsed` | Read/Write | Existing collapse states (unchanged) |

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | < 640px | Single-column widget grid. Customize panel = bottom sheet (slides up, max-height 80vh). Long-press drag. |
| Tablet | 640px–1024px | Two-column grid (`lg:grid-cols-5` kicks in at 1024px, so tablet is still single-column). Panel = side panel (~360px). Click-and-drag. |
| Desktop | > 1024px | Two-column grid (`lg:grid-cols-5` with col-span-3/col-span-2). Panel = side panel (~400px). Click-and-drag. |

**Note:** The existing grid uses `lg:grid-cols-5` which activates at 1024px (Tailwind `lg` breakpoint). Below 1024px, grid is single-column. The spec says "side panel on desktop (>= 640px)" — this means `sm:` breakpoint controls panel type (bottom sheet vs side panel), while `lg:` controls grid columns.

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| Hero → first widget above grid | `pb-4 md:pb-6` (16px / 24px) | Dashboard.tsx:346 (WeeklyGodMoments wrapper) |
| Above-grid widget → next | `pb-4 md:pb-6` (16px / 24px) | Dashboard.tsx:357 (GettingStarted wrapper) |
| Last above-grid → widget grid | Direct adjacency — grid has its own `gap-4 md:gap-6` | DashboardWidgetGrid.tsx:75 |
| Widget → widget (in grid) | `gap-4 md:gap-6` (16px / 24px) | DashboardWidgetGrid.tsx:75 |
| Widget grid → footer | `pb-8` (32px) on grid container | DashboardWidgetGrid.tsx:74 |

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] All auth-gated actions from the spec are accounted for in the plan
- [x] Design system values are verified (from reference and codebase inspection)
- [x] All [UNVERIFIED] values are flagged with verification methods
- [x] Recon report loaded if available (design-system.md loaded)
- [ ] Spec confirmed: `evening-reflection` and `getting-started` move from above-grid fixed positions into the reorderable widget grid for time-of-day ordering
- [ ] Spec confirmed: The "Customize" button placement is in the DashboardHero area (near the greeting)
- [ ] Spec confirmed: Conditional visibility checks (reading plan, challenge, highlights) should completely hide widgets vs. their current behavior of showing empty/discovery states

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Widget IDs vs existing card IDs | Use the spec-defined widget IDs as the canonical IDs in the new ordering system. DashboardCard `id` props used for collapse persistence remain unchanged to preserve existing `wr_dashboard_collapsed` data. | Avoids breaking collapse persistence. The ordering system uses its own ID namespace. |
| Evening Reflection + Getting Started in grid | Move these into the widget ordering system. When Getting Started is visible, it always renders first regardless of time-of-day order (spec req 10). Evening Reflection appears in its time-based position when conditions are met (spec reqs 4, 5, 8). | Spec explicitly includes these in the time-of-day ordering tables and gives them widget IDs. |
| Weekly God Moments | Remains outside the widget grid as a fixed element (spec req 14). | Spec explicitly says "renders between the hero and the widget grid, outside the reorderable grid." |
| Conditional visibility vs empty states | For widgets with conditional visibility (reading-plan, challenge, recent-highlights), the spec says "only renders when" — meaning the widget is completely hidden, not showing an empty/discovery state. The current empty states within those widgets remain for when the widget IS shown but has limited data. | Spec reqs 6-12 use explicit "only renders when" language. The conditional check is whether to include the widget in the ordering at all. |
| `wr_dashboard_layout.order` with new widgets | If a user customizes their layout and a new widget is added later, it appends to the end of their order. If a widget ID in their saved order no longer exists, it is silently dropped. | Future-proofing without complex migration. |
| Drag implementation | Native pointer/touch events, no external library (spec explicitly excludes dnd-kit, react-beautiful-dnd). | Spec out-of-scope section. |
| Panel type breakpoint | Bottom sheet at `< 640px` (mobile), side panel at `>= 640px`. Use `sm:` Tailwind breakpoint or `window.matchMedia('(min-width: 640px)')`. | Spec responsive table. |
| Customize button hidden for new users | Hidden when Getting Started checklist is active AND not yet completed/dismissed. Uses `isGettingStartedComplete()` from storage + session-level dismiss state. | Spec req 16. |
| Full-width widgets in custom order | Quick Actions and Weekly Recap always span full width (`lg:col-span-5`) regardless of position in order. | Spec req 30. |
| Settings navigation to customize panel | Use `useNavigate('/?customize=true')` and check `searchParams` on Dashboard mount. | Spec req 36 says "navigates to dashboard and opens the customization panel." |

---

## Implementation Steps

### Step 1: Widget Ordering Constants & Types

**Objective:** Define the widget registry, time-of-day ordering tables, and DashboardLayout type as standalone constants/types that the rest of the feature consumes.

**Files to create/modify:**
- `frontend/src/constants/dashboard/widget-order.ts` — new file with widget definitions, time-of-day orders, and type exports
- `frontend/src/types/dashboard.ts` — add `DashboardLayout` and `WidgetId` types

**Details:**

Create `widget-order.ts` with:

```typescript
import type { LucideIcon } from 'lucide-react'
import {
  BookOpen, TrendingUp, CheckCircle2, Flame, Heart, Highlighter,
  Target, Rocket, Users, BarChart3, Moon, ListChecks,
} from 'lucide-react'

export type WidgetId =
  | 'devotional' | 'votd' | 'activity-checklist' | 'mood-chart'
  | 'streak' | 'gratitude' | 'reading-plan' | 'challenge'
  | 'quick-actions' | 'prayer-list' | 'recent-highlights' | 'friends'
  | 'weekly-recap' | 'evening-reflection' | 'getting-started'

export interface WidgetDefinition {
  id: WidgetId
  label: string
  icon: LucideIcon
  colSpan: string  // Tailwind class: 'lg:col-span-2' | 'lg:col-span-3' | 'lg:col-span-5'
  fullWidth: boolean
}

export const WIDGET_DEFINITIONS: WidgetDefinition[] = [
  { id: 'devotional', label: 'Devotional', icon: BookOpen, colSpan: 'lg:col-span-3', fullWidth: false },
  { id: 'votd', label: 'Verse of the Day', icon: BookOpen, colSpan: 'lg:col-span-3', fullWidth: false },
  { id: 'activity-checklist', label: 'Activity Checklist', icon: CheckCircle2, colSpan: 'lg:col-span-3', fullWidth: false },
  { id: 'mood-chart', label: 'Mood Chart', icon: TrendingUp, colSpan: 'lg:col-span-3', fullWidth: false },
  { id: 'streak', label: 'Streak & Faith Points', icon: Flame, colSpan: 'lg:col-span-2', fullWidth: false },
  { id: 'gratitude', label: 'Gratitude', icon: Heart, colSpan: 'lg:col-span-3', fullWidth: false },
  { id: 'reading-plan', label: 'Reading Plan', icon: BookOpen, colSpan: 'lg:col-span-3', fullWidth: false },
  { id: 'challenge', label: 'Challenge', icon: Target, colSpan: 'lg:col-span-3', fullWidth: false },
  { id: 'quick-actions', label: 'Quick Actions', icon: Rocket, colSpan: 'lg:col-span-5', fullWidth: true },
  { id: 'prayer-list', label: 'Prayer List', icon: Heart, colSpan: 'lg:col-span-3', fullWidth: false },
  { id: 'recent-highlights', label: 'Recent Highlights', icon: Highlighter, colSpan: 'lg:col-span-3', fullWidth: false },
  { id: 'friends', label: 'Friends Preview', icon: Users, colSpan: 'lg:col-span-2', fullWidth: false },
  { id: 'weekly-recap', label: 'Weekly Recap', icon: BarChart3, colSpan: 'lg:col-span-5', fullWidth: true },
  { id: 'evening-reflection', label: 'Evening Reflection', icon: Moon, colSpan: 'lg:col-span-5', fullWidth: true },
  { id: 'getting-started', label: 'Getting Started', icon: ListChecks, colSpan: 'lg:col-span-5', fullWidth: true },
]

export const WIDGET_MAP: Record<WidgetId, WidgetDefinition> = Object.fromEntries(
  WIDGET_DEFINITIONS.map(w => [w.id, w])
) as Record<WidgetId, WidgetDefinition>

// Time-of-day ordering tables (spec reqs 2-5)
export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night'

export const TIME_OF_DAY_ORDERS: Record<TimeOfDay, WidgetId[]> = {
  morning: [
    'devotional', 'votd', 'activity-checklist', 'mood-chart', 'streak',
    'gratitude', 'reading-plan', 'challenge', 'quick-actions', 'prayer-list',
    'recent-highlights', 'friends', 'weekly-recap',
  ],
  afternoon: [
    'activity-checklist', 'reading-plan', 'challenge', 'prayer-list',
    'quick-actions', 'mood-chart', 'streak', 'gratitude', 'votd',
    'devotional', 'recent-highlights', 'friends',
  ],
  evening: [
    'evening-reflection', 'gratitude', 'activity-checklist', 'mood-chart',
    'prayer-list', 'reading-plan', 'challenge', 'streak', 'votd',
    'recent-highlights', 'friends', 'quick-actions',
  ],
  night: [
    'evening-reflection', 'gratitude', 'votd', 'prayer-list', 'mood-chart',
    'streak', 'quick-actions', 'reading-plan', 'challenge', 'recent-highlights',
    'friends', 'devotional', 'weekly-recap',
  ],
}

export function getTimeOfDay(): TimeOfDay {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 17) return 'afternoon'
  if (hour >= 17 && hour < 22) return 'evening'
  return 'night'
}
```

Add to `types/dashboard.ts`:

```typescript
export interface DashboardLayout {
  order: string[]
  hidden: string[]
  customized: boolean
}
```

**Auth gating:** N/A — constants only.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT import React or any component code — this is a pure data/constants file
- DO NOT use `evening-reflection` or `getting-started` in the afternoon ordering table — they appear via conditional visibility logic, not every time slot
- DO NOT include `getting-started` in any time-of-day order table — spec req 10 says it always renders first when visible, regardless of time ordering

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `getTimeOfDay returns morning for hours 5-11` | unit | Mock Date, verify morning at 5, 8, 11 |
| `getTimeOfDay returns afternoon for hours 12-16` | unit | Verify afternoon at 12, 14, 16 |
| `getTimeOfDay returns evening for hours 17-21` | unit | Verify evening at 17, 19, 21 |
| `getTimeOfDay returns night for hours 22-4` | unit | Verify night at 22, 0, 4 |
| `all TIME_OF_DAY_ORDERS entries are valid WidgetIds` | unit | Cross-reference against WIDGET_DEFINITIONS |
| `WIDGET_MAP has entry for every WIDGET_DEFINITIONS item` | unit | Length and key check |
| `morning order has devotional first` | unit | Verify spec req 2 |
| `evening order has evening-reflection first` | unit | Verify spec req 4 |
| `getting-started is not in any time-of-day order` | unit | Verify it's excluded — handled separately |

**Expected state after completion:**
- [ ] `frontend/src/constants/dashboard/widget-order.ts` exists with all exports
- [ ] `DashboardLayout` type added to `types/dashboard.ts`
- [ ] All 15 widget definitions match spec table (req 25)
- [ ] 4 time-of-day ordering tables match spec (reqs 2-5)
- [ ] Tests pass

---

### Step 2: Dashboard Layout Storage Service & useDashboardLayout Hook

**Objective:** Create the localStorage persistence layer for `wr_dashboard_layout` and a hook that resolves the final widget order by combining time-of-day ordering, conditional visibility, and user customization.

**Files to create/modify:**
- `frontend/src/services/dashboard-layout-storage.ts` — new file for `wr_dashboard_layout` CRUD
- `frontend/src/hooks/useDashboardLayout.ts` — new hook that computes ordered, filtered, visible widgets

**Details:**

`dashboard-layout-storage.ts`:
```typescript
import type { DashboardLayout } from '@/types/dashboard'

const LAYOUT_KEY = 'wr_dashboard_layout'

export function getDashboardLayout(): DashboardLayout | null {
  try {
    const raw = localStorage.getItem(LAYOUT_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function saveDashboardLayout(layout: DashboardLayout): void {
  try {
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout))
  } catch {}
}

export function clearDashboardLayout(): void {
  try {
    localStorage.removeItem(LAYOUT_KEY)
  } catch {}
}
```

`useDashboardLayout.ts` hook:
- Accepts a `visibility` record: `Record<WidgetId, boolean>` — which widgets are conditionally visible
- Reads `wr_dashboard_layout` on mount
- If `customized === false` or no layout: uses `getTimeOfDay()` to select from `TIME_OF_DAY_ORDERS`, prepends `getting-started` if visible
- If `customized === true`: uses user's `order` array, filters out `hidden` widgets
- In both cases, filters out widgets where `visibility[id] === false`
- Returns `{ orderedWidgets: WidgetId[], layout: DashboardLayout | null, isCustomized: boolean, updateOrder, toggleVisibility, resetToDefault }`
- `updateOrder(newOrder: WidgetId[])`: saves new order to localStorage
- `toggleVisibility(id: WidgetId, visible: boolean)`: toggles hidden array
- `resetToDefault()`: calls `clearDashboardLayout()` and resets state

The hook must NOT cause full re-renders of widget content — it only produces an ordered ID list. Widget components themselves are keyed by their ID so React reconciles without remounting.

**Auth gating:** N/A — hook consumed within auth-gated Dashboard.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT import any React component — this is data logic only
- DO NOT recalculate `getTimeOfDay()` on an interval — only on dashboard mount/visit (spec req: "uses current time on each visit, not cached")
- DO NOT include unknown widget IDs from a stale `wr_dashboard_layout` — silently drop them
- DO NOT put `getting-started` in the `hidden` toggle list in the customize panel (it's auto-managed)

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `returns time-based order when no layout saved` | unit | No localStorage → morning order at 8 AM |
| `returns time-based order when customized is false` | unit | Layout exists but `customized: false` |
| `returns user order when customized is true` | unit | Layout with custom order |
| `filters hidden widgets` | unit | Layout with `hidden: ['votd']` → votd not in result |
| `filters conditionally invisible widgets` | unit | `visibility.reading-plan = false` → excluded |
| `getting-started appears first when visible` | unit | Regardless of time of day |
| `getting-started not shown when visibility is false` | unit | Even in user order |
| `unknown widget IDs in saved layout are dropped` | unit | `order: ['nonexistent', 'votd']` → only votd |
| `saveDashboardLayout persists to localStorage` | unit | Round-trip test |
| `clearDashboardLayout removes from localStorage` | unit | Verify removal |
| `resetToDefault clears layout and returns time-based` | unit | State resets |

**Expected state after completion:**
- [ ] Storage service CRUD functions work
- [ ] Hook returns correct ordered widget list for all 4 time-of-day periods
- [ ] Conditional visibility filtering works
- [ ] User customization overrides time-based ordering
- [ ] Tests pass

---

### Step 3: Refactor DashboardWidgetGrid to Use Dynamic Ordering

**Objective:** Replace the fixed CSS `order-N` layout in `DashboardWidgetGrid` with dynamic rendering based on the ordered widget list from `useDashboardLayout`. Move Getting Started and Evening Reflection from above-grid fixed positions into the widget grid.

**Files to create/modify:**
- `frontend/src/components/dashboard/DashboardWidgetGrid.tsx` — major refactor: render widgets dynamically from ordered list
- `frontend/src/pages/Dashboard.tsx` — remove Getting Started and Evening Reflection from above-grid positions; pass visibility data to grid; move their state management

**Details:**

**DashboardWidgetGrid changes:**
- Accept new props: `showGettingStarted`, `gettingStartedProps`, `showEveningBanner`, `eveningBannerProps`, `showWeeklyRecap`, `showRecentHighlights`, `showReadingPlan`, `showChallenge`, `showWeeklyRecapData` (for the conditional visibility signals)
- Build a `visibility` record from these booleans:
  ```typescript
  const visibility: Record<WidgetId, boolean> = {
    'getting-started': showGettingStarted,
    'evening-reflection': showEveningBanner,
    'reading-plan': hasActiveReadingPlan,
    'challenge': hasActiveChallenge,
    'recent-highlights': hasHighlightsOrNotes,
    'weekly-recap': showWeeklyRecap,
    // All others default to true
  }
  ```
- Call `useDashboardLayout(visibility)` to get `orderedWidgets`
- Render widgets by mapping over `orderedWidgets` — use a `switch` or lookup object to render the correct component for each widget ID
- Each widget gets `style={{ order: index }}` for CSS grid ordering
- Stagger animation: `animationDelay: (staggerStartIndex + index) * 100`
- Full-width widgets (`quick-actions`, `weekly-recap`, `evening-reflection`, `getting-started`) get `lg:col-span-5`

**Widget render map** (inside grid component):
```typescript
function renderWidget(id: WidgetId, index: number): ReactNode {
  const def = WIDGET_MAP[id]
  const animProps = animateEntrance ? {
    className: 'motion-safe:animate-widget-enter',
    style: { animationDelay: `${(staggerStartIndex + index) * 100}ms` },
  } : {}

  switch (id) {
    case 'mood-chart':
      return <DashboardCard id="mood-chart" title="7-Day Mood" icon={...} className={cn(def.colSpan, animProps.className)} style={animProps.style}>
        <MoodChart ... />
      </DashboardCard>
    // ... other cases
    case 'getting-started':
      return <div className={cn(def.colSpan, animProps.className)} style={animProps.style}>
        <GettingStartedCard ... />
      </div>
    case 'evening-reflection':
      return <div className={cn(def.colSpan, animProps.className)} style={animProps.style}>
        <EveningReflectionBanner ... />
      </div>
  }
}
```

**Dashboard.tsx changes:**
- Remove the standalone `{showGettingStarted && (...)}` block (lines 354-369)
- Remove the standalone `{showEveningBanner && (...)}` block (lines 370-386)
- Pass Getting Started and Evening Reflection visibility + props to DashboardWidgetGrid
- Compute conditional visibility for reading-plan, challenge, recent-highlights
- Adjust `staggerStartIndex` — now only accounts for Hero and WeeklyGodMoments (Getting Started and Evening Reflection are inside the grid)
- Add `searchParams` check for `?customize=true` (for Settings integration in Step 6)

**Conditional visibility checks** (new logic in Dashboard or grid):
- `reading-plan`: Check `wr_reading_plan_progress` for any plan with started-but-incomplete status
- `challenge`: Check `wr_challenge_progress` for any in-progress entry
- `recent-highlights`: Check `wr_bible_highlights` length > 0 OR `wr_bible_notes` length > 0
- `weekly-recap`: Existing `recapVisible || !recapHasFriends` logic
- `evening-reflection`: Existing `isEveningTime() && !hasReflectedToday() && hasAnyActivityToday()` logic
- `getting-started`: Existing `gettingStarted.isVisible && !gettingStartedCardDismissed` logic

**Auth gating:** N/A — inherits from Dashboard auth gate.

**Responsive behavior:**
- Desktop (1024px+): `lg:grid-cols-5` with col-span assignments per widget definition
- Tablet (640px–1024px): Single-column (grid-cols-1)
- Mobile (< 640px): Single-column (grid-cols-1)

**Guardrails (DO NOT):**
- DO NOT remove the WeeklyGodMoments from its fixed position above the grid — spec req 14
- DO NOT change DashboardCard's `id` prop values — they are used for collapse state persistence in `wr_dashboard_collapsed`
- DO NOT remount widget components on reorder — use stable `key` props based on widget ID
- DO NOT change the existing widget component props or behavior — only change the ordering/rendering wrapper
- DO NOT break the existing stagger animation — maintain the same `getAnimProps()` pattern but with dynamic ordering
- DO NOT change how the GettingStartedCard celebration or EveningReflection overlay works — only move where the trigger banner renders

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `renders widgets in morning order by default at 8 AM` | integration | Mock time, verify first widget is devotional |
| `renders widgets in evening order at 7 PM` | integration | Mock time, verify first widget is evening-reflection (if visible) |
| `hides reading-plan when no active plans` | integration | Mock storage empty, verify widget not rendered |
| `shows reading-plan when active plan exists` | integration | Mock storage with plan, verify rendered |
| `hides recent-highlights when no highlights or notes` | integration | Mock storage empty |
| `getting-started renders first when visible` | integration | Verify it's the first widget |
| `evening-reflection hidden before 5 PM` | integration | Mock time at 2 PM |
| `hidden widgets do not leave blank space` | integration | Verify grid reflows |
| `stagger animation delays are sequential` | integration | Check animationDelay on rendered widgets |
| `preserves existing DashboardCard collapse behavior` | integration | Collapse a card, verify localStorage persists |

**Expected state after completion:**
- [ ] Widgets render in time-of-day order by default
- [ ] Getting Started and Evening Reflection are in the widget grid
- [ ] Conditional visibility works for all 6 conditional widgets
- [ ] Grid reflows without blank spaces
- [ ] Stagger animations still work
- [ ] All existing widget interactions (collapse, actions, callbacks) still function
- [ ] Tests pass

---

### Step 4: Customization Panel Component

**Objective:** Build the CustomizePanel component — a bottom sheet on mobile (< 640px) and side panel on desktop (>= 640px) — with widget list, toggle switches, drag-to-reorder, and action buttons.

**Files to create/modify:**
- `frontend/src/components/dashboard/CustomizePanel.tsx` — new component
- `frontend/src/hooks/useDragReorder.ts` — new hook for pointer/touch drag reorder logic

**Details:**

**CustomizePanel.tsx:**

Props:
```typescript
interface CustomizePanelProps {
  isOpen: boolean
  onClose: () => void
  orderedWidgets: WidgetId[]
  hiddenWidgets: WidgetId[]
  onUpdateOrder: (newOrder: WidgetId[]) => void
  onToggleVisibility: (id: WidgetId, visible: boolean) => void
  onResetToDefault: () => void
}
```

Structure:
1. **Backdrop**: `fixed inset-0 bg-black/40 z-40` — click to close
2. **Panel container**:
   - Mobile (`< sm`): `fixed bottom-0 left-0 right-0 max-h-[80vh] rounded-t-2xl bg-hero-mid/95 backdrop-blur-xl border border-white/15 z-50` with slide-up animation
   - Desktop (`>= sm`): `fixed top-0 right-0 bottom-0 w-[360px] sm:w-[360px] lg:w-[400px] bg-hero-mid/95 backdrop-blur-xl border-l border-white/15 z-50` with slide-from-right animation
3. **Mobile drag bar**: `<div className="mx-auto mt-3 h-1 w-10 rounded-full bg-white/30" />` — decorative only
4. **Header**: "Customize Dashboard" + `X` close button (Lucide `X`)
5. **Scrollable list**: Each widget from `WIDGET_DEFINITIONS` (excluding `getting-started` and `evening-reflection` from user toggle — they are auto-managed). Actually, per the spec, ALL 15 widgets appear in the panel list. The user CAN hide them. Getting Started's visibility is additionally controlled by completion status. Show all 15 widgets.
   - Drag handle: `GripVertical` icon, `text-white/30`
   - Widget icon + name
   - ToggleSwitch (reuse from `components/settings/ToggleSwitch.tsx`)
   - Each item: `bg-white/[0.06] rounded-lg p-3`, `min-h-[44px]`
6. **Drag behavior**:
   - Desktop: mousedown on drag handle → drag
   - Mobile: long-press (300ms) on drag handle → drag
   - Dragged item: `shadow-lg scale-[1.02]` transform
   - Items reorder in real-time as dragged item passes neighbors
7. **Footer buttons**:
   - "Reset to Default": `bg-white/10 text-white/60 hover:bg-white/15 rounded-lg px-4 py-2 text-sm`
   - "Done": `bg-primary text-white hover:bg-primary/90 rounded-lg px-4 py-2 text-sm`
8. **Focus trap**: Use `useFocusTrap(isOpen, onClose)` on the panel container
9. **`role="dialog"` + `aria-label="Customize Dashboard"` + `aria-modal="true"`**

**Keyboard accessibility (spec reqs 309-316):**
- Space on focused widget item: picks it up for reordering
- Arrow Up/Down: moves picked-up item
- Space: drops item
- Escape: cancels reorder (or closes panel if not reordering)
- `aria-live="polite"` region announces: "[Widget] moved to position N of M"

**useDragReorder.ts hook:**
- Manages pointer/touch events for drag-to-reorder within a list
- Returns `{ dragState, handleDragStart, handleDragEnd, listRef }`
- `dragState`: `{ draggingIndex: number | null, overIndex: number | null }`
- Uses `pointermove` for tracking position, calculates over-index from element positions
- Long-press detection for mobile (300ms timeout before drag starts)
- Applies `shadow-lg scale-[1.02]` to dragged item via inline style or class toggle
- Respects `prefers-reduced-motion` — skip transition animations

**Panel animations:**
- Open: Mobile slides up, desktop slides from right (300ms ease)
- Close: Reverse animation
- CSS transitions on `.translate-y-full` / `.translate-x-full` toggling
- `motion-reduce:transition-none`

[UNVERIFIED] Panel slide animations (new pattern not in design system):
→ To verify: Run `/verify-with-playwright` and compare against dark theme aesthetic
→ If wrong: Adjust transition timing or easing

**Auth gating:** N/A — panel only accessible from auth-gated Dashboard.

**Responsive behavior:**
- Desktop (>= 640px): Side panel, right-aligned, `w-[360px] lg:w-[400px]`. Click-and-drag.
- Mobile (< 640px): Bottom sheet, `max-h-[80vh]`, `rounded-t-2xl`. Long-press drag. Drag indicator bar at top.

**Guardrails (DO NOT):**
- DO NOT use any external drag library (dnd-kit, react-beautiful-dnd, etc.) — spec explicitly excludes them
- DO NOT allow dragging outside the drag handle — only the GripVertical icon initiates drag
- DO NOT create a new toggle component — reuse `ToggleSwitch` from `components/settings/ToggleSwitch.tsx`
- DO NOT apply changes on every drag/toggle — update state immediately but persist to localStorage on "Done" or panel close
- DO NOT forget focus trap — panel must trap focus when open
- DO NOT forget `aria-live` announcements for drag reorder
- DO NOT add Getting Started to the reorderable list IF you want to keep it always-first — actually the spec says all 15 widgets are in the panel, so include it, but spec req 10 says it renders first when visible regardless of user order. The user can still hide it via toggle.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `renders as bottom sheet on mobile` | integration | Set viewport < 640px, verify bottom-positioned panel |
| `renders as side panel on desktop` | integration | Set viewport >= 640px, verify right-positioned panel |
| `shows all 15 widgets with names and icons` | integration | Count rendered items |
| `toggling a widget off adds it to hidden list` | integration | Toggle votd off, verify callback |
| `toggling a widget back on removes from hidden` | integration | Toggle back on |
| `dragging reorders the list` | integration | Simulate pointer events on drag handle |
| `dragged item has shadow-lg scale effect` | integration | Check classes during drag |
| `Reset to Default calls onResetToDefault` | integration | Click button, verify callback |
| `Done closes the panel` | integration | Click Done, verify onClose called |
| `focus is trapped in panel` | integration | Tab cycle stays within panel |
| `Escape closes panel` | integration | Press Escape, verify onClose |
| `keyboard reorder: Space picks up, arrows move, Space drops` | integration | Keyboard event sequence |
| `aria-live announces position changes` | integration | Check announcement text |
| `panel has role="dialog" and aria-modal` | unit | Check attributes |
| `backdrop click closes panel` | integration | Click backdrop |

**Expected state after completion:**
- [ ] Panel opens/closes with correct animations
- [ ] All widgets listed with drag handles, icons, names, toggles
- [ ] Drag-to-reorder works on desktop (click-drag) and mobile (long-press)
- [ ] Toggle visibility works
- [ ] Reset to Default works
- [ ] Full keyboard accessibility
- [ ] Focus trap active
- [ ] Tests pass

---

### Step 5: Customize Button & Dashboard Integration

**Objective:** Add the Customize button to the Dashboard, wire up the CustomizePanel, and handle the `?customize=true` query param for Settings integration.

**Files to create/modify:**
- `frontend/src/pages/Dashboard.tsx` — add Customize button, panel state, query param handling
- `frontend/src/components/dashboard/DashboardHero.tsx` — add slot/prop for Customize button placement

**Details:**

**Customize button placement:**
- Rendered near the top of the dashboard, in the hero area or just below it
- Spec says "in the dashboard header area" — place it inside DashboardHero or immediately after it
- Add an optional `headerAction` prop to DashboardHero, or render the button as a sibling in the hero wrapper
- Styling: `<button className="inline-flex items-center gap-1.5 bg-white/10 text-white/60 hover:bg-white/15 rounded-lg px-3 py-1.5 text-sm transition-colors"><SlidersHorizontal className="h-4 w-4" /> Customize</button>`
- **Hidden condition**: `isGettingStartedComplete()` must be true OR Getting Started must be dismissed in current session. Use `!showGettingStarted` as the condition (when Getting Started is not visible, show Customize button).

**Dashboard state additions:**
```typescript
const [customizePanelOpen, setCustomizePanelOpen] = useState(false)
// Check URL param on mount
useEffect(() => {
  const params = new URLSearchParams(window.location.search)
  if (params.get('customize') === 'true') {
    setCustomizePanelOpen(true)
    // Clean up URL
    window.history.replaceState({}, '', '/')
  }
}, [])
```

**Wire up CustomizePanel:**
- Pass `useDashboardLayout` hook's state and callbacks to CustomizePanel
- On panel close or "Done": persist layout to localStorage
- On "Reset to Default": clear layout, close panel

**Grid transition animation (spec req 33):**
- When user reorders via customize panel, widgets should transition smoothly
- Add `transition-all duration-300 ease-in-out motion-reduce:transition-none` to grid items
- Only apply transition class when panel is open or just closed (not on initial load — that uses widget-enter)

**Auth gating:** Inherits from Dashboard auth gate. Button only visible when authenticated.

**Responsive behavior:**
- Desktop (1024px+): Customize button visible in hero area
- Tablet (640px–1024px): Customize button visible
- Mobile (< 640px): Customize button visible, opens bottom sheet

**Guardrails (DO NOT):**
- DO NOT show Customize button when Getting Started checklist is active (spec req 16)
- DO NOT apply CSS transitions on initial dashboard load — only after customization (avoid conflict with widget-enter animation)
- DO NOT modify DashboardHero's core layout — add the button as an additional element
- DO NOT persist to localStorage on every toggle/drag — batch persist on "Done" or panel close

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `Customize button visible when Getting Started complete` | integration | Set `wr_getting_started_complete: 'true'`, verify button renders |
| `Customize button hidden when Getting Started active` | integration | Getting Started visible, verify no button |
| `Customize button opens panel on click` | integration | Click button, verify panel opens |
| `?customize=true opens panel on mount` | integration | Render with search param, verify panel opens |
| `URL cleaned up after opening panel from param` | integration | Verify history.replaceState called |
| `panel close persists layout to localStorage` | integration | Close panel, verify wr_dashboard_layout |
| `Reset to Default clears wr_dashboard_layout` | integration | Click reset, verify localStorage cleared |
| `grid items have transition classes when panel is open` | integration | Verify transition-all on grid items |
| `grid items do NOT have transition classes on initial load` | integration | Verify no transition on mount |

**Expected state after completion:**
- [ ] Customize button visible in dashboard header (when Getting Started not active)
- [ ] Clicking button opens CustomizePanel
- [ ] Panel interactions update widget order on dashboard
- [ ] `?customize=true` query param opens panel
- [ ] Layout persists to localStorage
- [ ] Smooth CSS transitions on reorder
- [ ] Tests pass

---

### Step 6: Settings Page Integration

**Objective:** Add a "Dashboard" section to the Settings page with "Dashboard Layout" navigation and "Reset Dashboard Layout" button.

**Files to create/modify:**
- `frontend/src/pages/Settings.tsx` — add "Dashboard" section to SECTIONS array
- `frontend/src/components/settings/DashboardSection.tsx` — new section component

**Details:**

**Settings.tsx changes:**
- Add `'dashboard'` to the `SettingsSection` type union
- Add `{ id: 'dashboard', label: 'Dashboard' }` to the `SECTIONS` array (place after 'profile', before 'notifications')
- Add rendering case for `activeSection === 'dashboard'` → `<DashboardSection />`

**DashboardSection.tsx:**
```tsx
import { useNavigate } from 'react-router-dom'
import { useToastSafe } from '@/components/ui/Toast'
import { clearDashboardLayout } from '@/services/dashboard-layout-storage'

export function DashboardSection() {
  const navigate = useNavigate()
  const { showToast } = useToastSafe()

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm md:p-6">
      <h2 className="text-base font-semibold text-white md:text-lg mb-6">Dashboard</h2>
      <div className="space-y-4">
        {/* Dashboard Layout — navigates to dashboard with customize panel open */}
        <button
          onClick={() => navigate('/?customize=true')}
          className="w-full text-left flex items-center justify-between rounded-lg bg-white/[0.06] p-4 min-h-[44px] text-sm text-white hover:bg-white/[0.08] transition-colors"
        >
          <span>Dashboard Layout</span>
          <span className="text-white/40">Customize →</span>
        </button>

        {/* Reset Dashboard Layout */}
        <button
          onClick={() => {
            clearDashboardLayout()
            showToast('Dashboard layout reset to default', 'success')
          }}
          className="w-full text-left rounded-lg bg-white/[0.06] p-4 min-h-[44px] text-sm text-white/60 hover:bg-white/[0.08] hover:text-white transition-colors"
        >
          Reset Dashboard Layout
        </button>
      </div>
    </div>
  )
}
```

Follow the exact pattern from `NotificationsSection.tsx` (line 37): `rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm md:p-6`.

**Auth gating:** Settings page is already auth-gated via `Navigate to="/"` on line 32-34 of Settings.tsx.

**Responsive behavior:**
- Desktop (1024px+): Dashboard section appears in sidebar navigation + content area
- Tablet (640px+): Same sidebar pattern
- Mobile (< 640px): Dashboard appears as a tab in the mobile tab bar

**Guardrails (DO NOT):**
- DO NOT change the existing 4 sections — only ADD the new "Dashboard" section
- DO NOT import any dashboard component into Settings — keep it lightweight (just navigation + reset)
- DO NOT use a different card style — match the existing `rounded-2xl border border-white/10 bg-white/5` pattern

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `Dashboard section appears in Settings navigation` | integration | Verify "Dashboard" tab/sidebar item renders |
| `Dashboard Layout button navigates to /?customize=true` | integration | Click, verify navigation |
| `Reset Dashboard Layout clears wr_dashboard_layout` | integration | Click, verify localStorage cleared |
| `Reset Dashboard Layout shows confirmation toast` | integration | Click, verify toast |
| `Dashboard section follows existing card styling` | unit | Check className matches NotificationsSection pattern |

**Expected state after completion:**
- [ ] Settings page has 5 sections: Profile, Dashboard, Notifications, Privacy, Account
- [ ] "Dashboard Layout" navigates to dashboard with customize panel open
- [ ] "Reset Dashboard Layout" clears storage and shows toast
- [ ] Tests pass

---

### Step 7: Accessibility & Reduced Motion Polish

**Objective:** Ensure full keyboard accessibility, ARIA compliance, and reduced motion support across all new components.

**Files to create/modify:**
- `frontend/src/components/dashboard/CustomizePanel.tsx` — add/verify ARIA attributes, keyboard reorder, aria-live
- `frontend/src/hooks/useDragReorder.ts` — add keyboard reorder support

**Details:**

**Keyboard reorder (spec reqs 310-316):**
- Each widget list item is focusable (`tabIndex={0}`)
- When focused, pressing Space enters "reorder mode" for that item
  - Visual indicator: item gets a highlighted border (`border-primary`)
  - `aria-grabbed="true"` on the item
- Arrow Up/Down moves the item in the list
- Space again drops the item
- Escape cancels the reorder (returns item to original position)
- After each move, `aria-live="polite"` region announces: "[Widget name] moved to position [N] of [total]"

**Focus management:**
- Verify `useFocusTrap` correctly traps focus within the panel
- Close button (`X`) should be the first focusable element after the heading
- "Reset to Default" and "Done" buttons have clear accessible names
- Each toggle has `aria-label="Show [Widget name] widget"` (or use the existing ToggleSwitch label pattern)

**Reduced motion:**
- Panel open/close animations: `motion-reduce:transition-none`
- Grid reorder transitions: `motion-reduce:transition-none` (already in Step 5)
- Drag lift effect: `motion-reduce:scale-100` (no scale on reduced motion)
- Widget-enter stagger: existing `motion-safe:animate-widget-enter` already handles this

**Auth gating:** N/A.

**Responsive behavior:** N/A: no UI impact — accessibility is cross-breakpoint.

**Guardrails (DO NOT):**
- DO NOT use `aria-grabbed` if it causes issues — it's deprecated in WAI-ARIA 1.1. Instead use `aria-pressed` or a custom `aria-label` that indicates the state. Actually, use a custom approach: `aria-roledescription="sortable"` on each item, and `aria-label` that includes position.
- DO NOT forget to restore focus to the Customize button when the panel closes
- DO NOT break existing screen reader announcements in other components

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `panel has role="dialog" and aria-modal="true"` | unit | Check attributes |
| `each toggle has accessible label` | unit | Verify aria-label or associated label text |
| `keyboard: Space picks up item for reorder` | integration | Focus item, press Space, verify state |
| `keyboard: Arrow Down moves item down` | integration | In reorder mode, press ArrowDown |
| `keyboard: Arrow Up moves item up` | integration | In reorder mode, press ArrowUp |
| `keyboard: Space drops item` | integration | Press Space again, verify dropped |
| `keyboard: Escape cancels reorder` | integration | Press Escape, verify original position |
| `aria-live announces position changes` | integration | Verify announcement text content |
| `focus restored to Customize button on panel close` | integration | Open panel, close, verify focus |
| `reduced motion: no panel transition` | unit | Set prefers-reduced-motion, verify no transition |

**Expected state after completion:**
- [ ] Full keyboard reorder support
- [ ] All ARIA attributes correct
- [ ] aria-live announcements for drag operations
- [ ] Reduced motion fully respected
- [ ] Focus management correct
- [ ] Tests pass

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Widget ordering constants & types |
| 2 | 1 | Dashboard layout storage & hook |
| 3 | 1, 2 | Refactor grid to dynamic ordering |
| 4 | 1, 2 | Customization panel component |
| 5 | 3, 4 | Customize button & dashboard integration |
| 6 | 2 | Settings page integration |
| 7 | 4 | Accessibility & reduced motion polish |

Steps 3 and 4 can be done in parallel after Steps 1 and 2. Step 6 can be done in parallel with Steps 4 and 5.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Widget ordering constants & types | [COMPLETE] | 2026-03-28 | Created `frontend/src/constants/dashboard/widget-order.ts` (15 widget defs, 4 time-of-day orders, getTimeOfDay). Added `DashboardLayout` to `types/dashboard.ts`. 20 tests pass. |
| 2 | Dashboard layout storage & hook | [COMPLETE] | 2026-03-28 | Created `services/dashboard-layout-storage.ts` and `hooks/useDashboardLayout.ts`. 15 tests pass (4 storage + 11 hook). |
| 3 | Refactor grid to dynamic ordering | [COMPLETE] | 2026-03-28 | Refactored DashboardWidgetGrid to use useDashboardLayout for dynamic ordering. Moved GettingStarted and EveningReflection into grid. Dashboard.tsx passes visibility props. Exported GettingStartedCardProps and EveningReflectionBannerProps interfaces. 8 new tests + 619 existing pass. |
| 4 | Customization panel component | [COMPLETE] | 2026-03-28 | Created `CustomizePanel.tsx` (bottom sheet mobile / side panel desktop) and `useDragReorder.ts` hook. Reused ToggleSwitch, useFocusTrap. Keyboard reorder, aria-live, backdrop, focus trap. 13 tests pass. |
| 5 | Customize button & dashboard integration | [COMPLETE] | 2026-03-28 | Added `headerAction` prop to DashboardHero. Customize button in hero (hidden when Getting Started active). CustomizePanel wired with useDashboardLayout. ?customize=true URL param handled. Focus restored to button on panel close. 632 tests pass. |
| 6 | Settings page integration | [COMPLETE] | 2026-03-28 | Created `DashboardSection.tsx`. Added 'dashboard' to Settings SECTIONS (5 sections now). Dashboard Layout navigates to /?customize=true, Reset clears localStorage + shows toast. 5 new tests + 63 existing pass. |
| 7 | Accessibility & reduced motion polish | [COMPLETE] | 2026-03-28 | All a11y already implemented in Step 4. Added 12 dedicated a11y tests verifying: role=dialog, aria-modal, toggles with labels, keyboard reorder (Space/Arrow/Escape), aria-live announcements, reduced motion classes, sortable items with position labels. 875 total tests pass. |
