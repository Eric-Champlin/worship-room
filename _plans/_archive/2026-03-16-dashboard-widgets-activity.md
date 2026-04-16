# Implementation Plan: Dashboard Widgets & Activity Integration

**Spec:** `_specs/dashboard-widgets-activity.md`
**Date:** 2026-03-16
**Branch:** `claude/feature/dashboard-widgets-activity`
**Design System Reference:** `_plans/recon/design-system.md` (loaded)
**Recon Report:** not applicable (dashboard is new, no external recon)
**Master Spec Plan:** `dashboard-growth-spec-plan-v2.md` (loaded)

---

## Architecture Context

### Relevant Existing Files

**Dashboard shell (Spec 2 — complete):**
- `frontend/src/pages/Dashboard.tsx` — Route-switched page (`/` when authenticated). Renders `MoodCheckIn` → `DashboardHero` → `DashboardWidgetGrid`. No layout wrapping needed.
- `frontend/src/components/dashboard/DashboardWidgetGrid.tsx` — 5-card grid with placeholder text for `streak-points` and `activity-checklist` cards. This file is the primary modification target.
- `frontend/src/components/dashboard/DashboardCard.tsx` — Reusable frosted glass card with collapsible behavior, localStorage persistence (`wr_dashboard_collapsed`). Cards pass `id`, `title`, `icon`, optional `action`, `className`, and `children`.

**Gamification engine (Spec 5 — complete):**
- `frontend/src/hooks/useFaithPoints.ts` — Core hook returning `{ totalPoints, currentLevel, levelName, pointsToNextLevel, todayActivities, todayPoints, todayMultiplier, currentStreak, longestStreak, recordActivity }`. Uses `useState` with `loadState()` on mount. `recordActivity()` is idempotent, auth-gated, updates both localStorage and React state.
- `frontend/src/services/faith-points-storage.ts` — Low-level localStorage operations: `getActivityLog()`, `getFaithPoints()`, `getStreakData()`, `calculateDailyPoints()`, `updateStreak()`, `persistAll()`.
- `frontend/src/hooks/useListenTracker.ts` — 30-second continuous playback timer. Writes to localStorage directly (bypasses `useFaithPoints` React state). Already integrated via `ListenTracker` component inside `AudioProvider`.

**Constants & types:**
- `frontend/src/constants/dashboard/activity-points.ts` — `ACTIVITY_POINTS`, `ACTIVITY_DISPLAY_NAMES` (past tense), `MULTIPLIER_TIERS`, `ALL_ACTIVITY_TYPES`.
- `frontend/src/constants/dashboard/levels.ts` — `LEVEL_THRESHOLDS`, `getLevelForPoints()`.
- `frontend/src/types/dashboard.ts` — `ActivityType`, `DailyActivities`, `DailyActivityLog`, `FaithPointsData`, `StreakData`.

**Integration targets:**
- `frontend/src/components/daily/PrayTabContent.tsx` — Line 107: `markPrayComplete()` inside `setTimeout` callback after `setPrayer(result)`. Add `recordActivity('pray')` here.
- `frontend/src/components/daily/JournalTabContent.tsx` — Line 137: `markJournalComplete()` after save success. Add `recordActivity('journal')` here.
- `frontend/src/pages/meditate/*.tsx` (6 files) — Each calls `markMeditationComplete(type)` in their `handleComplete` function. Add `recordActivity('meditate')` alongside.
- `frontend/src/pages/PrayerWall.tsx` — `handleTogglePraying()` (line 69) and `handleSubmitComment()` (line 83). Add `recordActivity('prayerWall')` in both.
- `frontend/src/hooks/useListenTracker.ts` — Already writes to localStorage. Needs custom event dispatch for real-time dashboard sync.

**Auth context:**
- `frontend/src/contexts/AuthContext.tsx` — `AuthProvider` with `{ isAuthenticated, user, login, logout }`.
- `frontend/src/hooks/useAuth.ts` — Re-export of `useAuth()` from context.

### Directory Conventions

- Components: `frontend/src/components/dashboard/` — Dashboard-specific components
- Hooks: `frontend/src/hooks/` — Custom hooks
- Constants: `frontend/src/constants/dashboard/` — Dashboard constants
- Tests: Colocated in `__tests__/` directories adjacent to source files

### Test Patterns

- **Framework:** Vitest + React Testing Library + jsdom
- **Provider wrapping:** `MemoryRouter` with `future` flags, `AuthProvider` for auth-dependent hooks
- **localStorage:** `localStorage.clear()` in `beforeEach`
- **Fake timers:** `vi.useFakeTimers()` / `vi.setSystemTime()` for date-dependent tests
- **User events:** `userEvent.setup()` for click/interaction tests
- **Assertions:** `screen.getByText()`, `screen.getByRole()`, `toBeInTheDocument()`, `toHaveAttribute()`

---

## Auth Gating Checklist

**Every action in the spec that requires login must have an auth check in the plan.**

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| View dashboard widgets | Auth-gated (dashboard only visible when authenticated) | N/A (Spec 2 handles) | Route switching in `App.tsx` |
| `recordActivity('pray')` | No-ops when not authenticated | Step 4 | `useFaithPoints` hook internal guard |
| `recordActivity('journal')` | No-ops when not authenticated | Step 4 | `useFaithPoints` hook internal guard |
| `recordActivity('meditate')` | No-ops when not authenticated | Step 5 | `useFaithPoints` hook internal guard |
| `recordActivity('listen')` | No-ops when not authenticated | N/A (already implemented) | `useListenTracker` internal guard |
| `recordActivity('prayerWall')` | No-ops when not authenticated | Step 6 | `useFaithPoints` hook internal guard |

All auth gating is handled internally by `useFaithPoints.recordActivity()` (returns early if `!isAuthenticated`) and `useListenTracker` (checks `isAuthenticated` param). The integration components do NOT need their own auth checks.

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Dashboard card | background | `bg-white/5 backdrop-blur-sm` | `09-design-system.md` |
| Dashboard card | border | `border border-white/10 rounded-2xl` | `09-design-system.md` |
| Dashboard card | padding | `p-4 md:p-6` | `09-design-system.md` |
| Streak number | font | `text-3xl md:text-4xl font-bold text-white` | spec |
| Flame icon | color | `text-amber-400` | spec |
| Day streak label | font | `text-sm text-white/60` | spec |
| Longest streak | font | `text-xs text-white/40` | spec |
| Faith points | font | `text-lg font-semibold text-white` | spec |
| Level name + icon | font/size | `text-sm text-white/70`, icon 20px | spec |
| Progress bar bg | fill | `bg-white/10` | spec |
| Progress bar fill | fill | `bg-primary` | spec |
| Progress bar | height | `h-1.5` (~6px) | spec (6-8px) |
| Progress label | font | `text-xs text-white/40` | spec |
| Multiplier badge | style | `bg-amber-500/20 text-amber-300 rounded-full text-xs font-medium px-2.5 py-0.5` | spec |
| Recent badges | size | `h-7 w-7` (28px circles) | spec |
| SVG ring | diameter | 60px (r=24, stroke=6) | spec (56-64px) |
| Ring unfilled | stroke | `rgba(255,255,255,0.1)` | spec |
| Ring filled | stroke | `#6D28D9` (primary) | `09-design-system.md` |
| Ring center text | font | `text-sm font-semibold text-white` | spec |
| Completed row | icon color | `text-success` (#27AE60) | spec / `09-design-system.md` |
| Incomplete row | icon color | `text-white/20` | spec |
| Incomplete row | text color | `text-white/50` (name), `text-white/30` (points) | spec |
| Multiplier preview | font | `text-sm text-white/60` | spec |
| Success color | hex | `#27AE60` | `09-design-system.md` |
| Primary color | hex | `#6D28D9` | `09-design-system.md` |

---

## Design System Reminder

**Project-specific quirks that `/execute-plan` displays before every UI step:**

- Dashboard uses frosted glass cards: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`
- Dashboard background is `bg-[#0f0a1e]` (near-black purple)
- Mood colors: Struggling=#D97706, Heavy=#C2703E, Okay=#8B7FA8, Good=#2DD4BF, Thriving=#34D399
- All text on dashboard is white/white-alpha (dark theme) — NOT text-dark
- Icons use Lucide React (import from `lucide-react`)
- Use `cn()` from `@/lib/utils` for conditional classnames
- Use `@/` path alias for all imports
- `prefers-reduced-motion`: disable all animations via `motion-reduce:` prefix
- Dashboard widget grid: `lg:grid-cols-5` with `lg:col-span-3` (left ~60%) and `lg:col-span-2` (right ~40%)
- Cards are collapsible via `DashboardCard` component — widgets render as children

---

## Shared Data Models (from Master Plan)

```typescript
// From types/dashboard.ts (already exists)
export type ActivityType = 'mood' | 'pray' | 'listen' | 'prayerWall' | 'meditate' | 'journal';

// From useFaithPoints hook (already exists)
interface FaithPointsState {
  totalPoints: number;
  currentLevel: number;       // 1-6
  levelName: string;           // "Seedling" | "Sprout" | etc.
  pointsToNextLevel: number;   // 0 at max level
  todayActivities: Record<ActivityType, boolean>;
  todayPoints: number;
  todayMultiplier: number;     // 1 | 1.25 | 1.5 | 2
  currentStreak: number;
  longestStreak: number;
  recordActivity: (type: ActivityType) => void;
}
```

**localStorage keys this spec touches:**

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_daily_activities` | Read | Activity log keyed by date (via `useFaithPoints`) |
| `wr_faith_points` | Read | Total points, level (via `useFaithPoints`) |
| `wr_streak` | Read | Current/longest streak (via `useFaithPoints`) |
| `wr_badges` | Read | Earned badges for recent badges display (Spec 7, read-only) |
| `wr_dashboard_collapsed` | Read/Write | Widget collapse states (via `DashboardCard`) |

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | < 640px | Single column, both cards full width. Progress ring above activity list (centered). Content stacks vertically within cards. |
| Tablet | 640–1024px | Still single column (grid doesn't switch to 2-col until `lg`). Progress ring to the left of activity list. |
| Desktop | > 1024px | 2-column grid: checklist in left column (`lg:col-span-3`, ~60%), streak card in right column (`lg:col-span-2`, ~40%). Progress ring to the left of activity list. |

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| DashboardHero → widget grid | 0px (hero has bottom padding, grid has top padding via `pb-8`) | `DashboardWidgetGrid.tsx` |
| Widget card → widget card | `gap-4 md:gap-6` (16px mobile, 24px desktop) | `DashboardWidgetGrid.tsx:15` |
| Card header → card content | `pt-3` (12px) | `DashboardCard.tsx:126` |

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] Spec 5 (Streak & Faith Points Engine) is complete and committed — `useFaithPoints`, `faith-points-storage`, `useListenTracker` all exist
- [x] Spec 2 (Dashboard Shell) is complete — `DashboardWidgetGrid` has placeholder cards
- [x] Spec 1 (Mood Check-In) is complete — `wr_mood_entries` is populated on check-in
- [ ] Spec 7 (Badges) is NOT yet built — recent badges display will show placeholder circles reading from `wr_badges` if present, otherwise nothing
- [x] All auth-gated actions from the spec are accounted for in the plan
- [x] Design system values are verified from spec + design-system.md
- [ ] Activity checklist display names differ from `ACTIVITY_DISPLAY_NAMES` — need new constant (see Edge Cases)
- [x] `useListenTracker` writes directly to localStorage — plan includes custom event approach for real-time sync

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Checklist display names | Add `ACTIVITY_CHECKLIST_NAMES` constant to `activity-points.ts` with spec names ("Log your mood", "Pray", etc.) | Existing `ACTIVITY_DISPLAY_NAMES` uses past tense ("Logged mood"), spec uses imperative ("Log your mood"). Keep both for different contexts. |
| Level icons | Map in new constant `LEVEL_ICONS` in `levels.ts` referencing Lucide component names | Keeps icon mapping centralized for reuse by future specs (7, 8, 14) |
| Listen tracker real-time sync | `useListenTracker` dispatches `wr:activity-recorded` custom event; `useFaithPoints` listens and reloads state | The listen tracker writes directly to localStorage (can't use `recordActivity()` since it's in a different component tree). Custom event is minimal and enables real-time dashboard updates when listen activity fires while user is on dashboard. |
| Recent badges display | Read from `wr_badges` localStorage, show last 3 earned badge timestamps. If key doesn't exist (Spec 7 not built yet), show nothing. | Graceful degradation — no crash, no empty state text needed per spec |
| Multiplier badge vs progress ring fill | Progress ring fill: CSS transition on `stroke-dashoffset`. Multiplier badge: conditional render, no animation for initial render. | Spec says ring animates; multiplier badge only animates on tier crossing (deferred to Spec 8 celebrations) |
| `useFaithPoints` as prop vs direct call | Widget components call `useFaithPoints()` hook directly via context lift to `DashboardWidgetGrid` | Avoids prop drilling. The hook is cheap (reads localStorage once on mount). Both widgets need the same data, so call once in grid and pass as props. |

---

## Implementation Steps

### Step 1: Add Checklist Display Names and Level Icons Constants

**Objective:** Add the activity checklist display names (imperative form) and level-to-icon mapping constants used by the widget components.

**Files to create/modify:**
- `frontend/src/constants/dashboard/activity-points.ts` — Add `ACTIVITY_CHECKLIST_NAMES`
- `frontend/src/constants/dashboard/levels.ts` — Add `LEVEL_ICON_NAMES` mapping

**Details:**

Add to `activity-points.ts`:
```typescript
export const ACTIVITY_CHECKLIST_NAMES: Record<ActivityType, string> = {
  mood: 'Log your mood',
  pray: 'Pray',
  listen: 'Listen to worship',
  prayerWall: 'Pray for someone',
  meditate: 'Meditate',
  journal: 'Journal',
} as const;
```

Add to `levels.ts`:
```typescript
// Lucide icon component names for each level (temporary — Spec 7/8 may introduce custom icons)
export const LEVEL_ICON_NAMES: Record<number, string> = {
  1: 'Sprout',       // Seedling level
  2: 'Leaf',         // Sprout level
  3: 'Flower2',      // Blooming level
  4: 'TreePine',     // Flourishing level
  5: 'Trees',        // Oak level
  6: 'Landmark',     // Lighthouse level
} as const;
```

**Guardrails (DO NOT):**
- Do NOT modify existing `ACTIVITY_DISPLAY_NAMES` — it's used elsewhere for past-tense labels
- Do NOT add React component imports to constants files — keep them pure data

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `ACTIVITY_CHECKLIST_NAMES has all 6 activity types` | unit | Verify all `ActivityType` values have entries |
| `LEVEL_ICON_NAMES has all 6 levels` | unit | Verify levels 1-6 have entries |

**Expected state after completion:**
- [x] `ACTIVITY_CHECKLIST_NAMES` exported from `activity-points.ts`
- [x] `LEVEL_ICON_NAMES` exported from `levels.ts`
- [x] No existing exports broken

---

### Step 2: Build StreakCard Component

**Objective:** Create the Streak & Faith Points card widget that displays streak count, faith points, level, progress bar, multiplier badge, and recent badges.

**Files to create/modify:**
- `frontend/src/components/dashboard/StreakCard.tsx` — New component
- `frontend/src/components/dashboard/__tests__/StreakCard.test.tsx` — Tests

**Details:**

**Props interface:**
```typescript
interface StreakCardProps {
  currentStreak: number;
  longestStreak: number;
  totalPoints: number;
  currentLevel: number;
  levelName: string;
  pointsToNextLevel: number;
  todayMultiplier: number;
}
```

**Component structure:**
1. **Top section — Streak display:**
   - When `currentStreak > 0`: Large number (`text-3xl md:text-4xl font-bold text-white`) + Lucide `Flame` icon (`text-amber-400 h-8 w-8 md:h-9 md:w-9`) + "day streak" / "days streak" label (`text-sm text-white/60`)
   - When `currentStreak === 0`: "Start your streak today" in `text-lg text-white/70` with `Flame` icon dimmed (`text-white/30`)
   - "Longest: X days" below in `text-xs text-white/40`

2. **Middle section — Faith Points & Level:**
   - Points: `"{totalPoints} Faith Points"` in `text-lg font-semibold text-white`
   - Level icon: Dynamic Lucide icon based on `LEVEL_ICON_NAMES[currentLevel]` at `h-5 w-5`, colored `text-primary-lt`
   - Level name: `"{levelName}"` in `text-sm text-white/70`
   - Progress bar: `h-1.5 rounded-full` with `bg-white/10` track and `bg-primary` fill. Width calculated as percentage. Animated via `transition-all duration-500 ease-out motion-reduce:transition-none`.
   - Progress label: At max level (pointsToNextLevel === 0): "Lighthouse — Max Level". Otherwise: `"{totalPoints} / {nextThreshold} to {nextLevelName}"` in `text-xs text-white/40`
   - To compute `nextThreshold` and `nextLevelName`, import `LEVEL_THRESHOLDS` and find the next level entry.

3. **Bottom section — Multiplier & Recent Badges:**
   - Multiplier badge: Only shown when `todayMultiplier > 1`. Pill: `bg-amber-500/20 text-amber-300 rounded-full text-xs font-medium px-2.5 py-0.5`. Text: `"{todayMultiplier}x bonus today!"`.
   - Recent badges: Read `wr_badges` from localStorage. If present and has earned badges, show last 3 as `h-7 w-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-xs font-medium text-primary-lt` circles with first letter of badge name. If no badges or key missing: render nothing.

**Accessibility:**
- Progress bar: `role="progressbar"` with `aria-valuenow={totalPoints}`, `aria-valuemin={currentLevelThreshold}`, `aria-valuemax={nextLevelThreshold}`, `aria-label="Faith points progress toward {nextLevelName}"`
- At max level: `aria-valuenow={totalPoints}`, `aria-valuemin={10000}`, `aria-valuemax={10000}`, `aria-label="Maximum level reached — Lighthouse"`
- Streak section: Lucide Flame has `aria-hidden="true"`, streak text is naturally readable

**Responsive behavior:**
- Desktop (1440px): Content flows naturally in the ~40% column
- Tablet (768px): Same layout, slightly less horizontal space
- Mobile (375px): Full width, content stacks vertically naturally

**Guardrails (DO NOT):**
- Do NOT use emoji for flame — use Lucide `Flame` icon
- Do NOT show multiplier badge when multiplier is 1x
- Do NOT show badge section when no badges exist
- Do NOT hard-code level thresholds — import from `levels.ts`

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `renders streak count with flame icon` | unit | Verify streak number and flame icon render |
| `shows "days streak" (plural) when streak > 1` | unit | streak=5 → "days streak" |
| `shows "day streak" (singular) when streak === 1` | unit | streak=1 → "day streak" |
| `shows "Start your streak today" when streak is 0` | unit | No number, encouraging message |
| `displays longest streak` | unit | "Longest: 14 days" visible |
| `displays faith points and level name` | unit | "247 Faith Points" + "Sprout" visible |
| `renders correct level icon for each level` | unit | Test all 6 levels render correct icon |
| `progress bar shows correct percentage` | unit | 247 of 500 → ~49.4% width |
| `max level shows full bar and "Lighthouse — Max Level"` | unit | pointsToNextLevel=0 case |
| `multiplier badge shows when > 1x` | unit | todayMultiplier=1.5 → "1.5x bonus today!" |
| `multiplier badge hidden when 1x` | unit | todayMultiplier=1 → no badge |
| `progress bar has role="progressbar" with ARIA attributes` | unit | Verify aria-valuenow/min/max |
| `recent badges render from localStorage` | unit | Mock wr_badges, verify 3 circles |
| `no badges area when wr_badges is empty or absent` | unit | No crash, no empty text |

**Expected state after completion:**
- [x] `StreakCard` component renders all sections
- [x] All edge cases handled (zero streak, max level, no badges)
- [x] Accessibility attributes present
- [x] All tests passing

---

### Step 3: Build ActivityChecklist Component

**Objective:** Create the Today's Activity Checklist card widget with SVG progress ring, activity list, and multiplier preview.

**Files to create/modify:**
- `frontend/src/components/dashboard/ActivityChecklist.tsx` — New component
- `frontend/src/components/dashboard/__tests__/ActivityChecklist.test.tsx` — Tests

**Details:**

**Props interface:**
```typescript
interface ActivityChecklistProps {
  todayActivities: Record<ActivityType, boolean>;
  todayMultiplier: number;
}
```

**Component structure:**

1. **Progress ring (SVG):**
   - Container: `relative` div
   - SVG: `width="60" height="60" viewBox="0 0 60 60"`
   - Background circle: `cx="30" cy="30" r="24"`, `stroke="rgba(255,255,255,0.1)"`, `stroke-width="6"`, `fill="none"`
   - Progress circle: Same dimensions, `stroke="#6D28D9"` (primary), `stroke-linecap="round"`, `fill="none"`, `transform="rotate(-90 30 30)"` (start from top)
   - `stroke-dasharray` = `2 * π * 24` ≈ `150.796`
   - `stroke-dashoffset` = `dasharray * (1 - completedCount / 6)`
   - Animated: `transition: stroke-dashoffset 500ms ease-out` via inline style. `motion-reduce:` → no transition.
   - Center text: Absolutely positioned `"X/6"` in `text-sm font-semibold text-white`
   - `aria-label="X of 6 daily activities completed"` on the SVG

2. **Activity list:**
   - Ordered from lowest to highest points: mood (5), pray (10), listen (10), prayerWall (15), meditate (20), journal (25)
   - Use `ACTIVITY_CHECKLIST_NAMES` for display names, `ACTIVITY_POINTS` for point values
   - Each row: Flex container with icon + name + "+X pts"
   - **Completed row:** Lucide `CircleCheck` in `text-success h-5 w-5` + name in `text-sm text-white` + `"+X pts"` in `text-xs text-success`
   - **Incomplete row:** Lucide `Circle` in `text-white/20 h-5 w-5` + name in `text-sm text-white/50` + `"+X pts"` in `text-xs text-white/30`
   - Each row: `aria-label` describing state (e.g., "Pray — completed, 10 points earned" or "Pray — not yet completed, 10 points available")
   - Spacing: `space-y-2` between rows

3. **Multiplier preview:**
   - Below the activity list, separated by `mt-3 pt-3 border-t border-white/5`
   - Logic based on completed count:
     - 0: "Complete 2 activities for 1.25x bonus!"
     - 1: "Complete 1 more for 1.25x bonus!"
     - 2: "Complete 2 more for 1.5x bonus!"
     - 3: "Complete 1 more for 1.5x bonus!"
     - 4: "Complete 2 more for 2x Full Worship Day!"
     - 5: "Complete 1 more for 2x Full Worship Day!"
     - 6: "Full Worship Day! 2x points earned!" — in `text-amber-300 font-medium` instead of default `text-white/60`
   - Text: `text-xs text-white/60` (default), celebration text in `text-xs text-amber-300 font-medium`

**Layout:**
- Desktop/Tablet: Progress ring left, activity list right (`flex flex-col sm:flex-row sm:items-start gap-4`)
- Mobile: Progress ring centered above list (`flex flex-col items-center` at base, `sm:flex-row sm:items-start` at sm+)

**Accessibility:**
- SVG progress ring: `role="img"` + `aria-label="X of 6 daily activities completed"`
- Each activity row: `aria-label` with completion state and points
- `prefers-reduced-motion`: Ring animation uses `motion-reduce:transition-none` equivalent (inline style conditional)

**Guardrails (DO NOT):**
- Do NOT use `requestAnimationFrame` for ring animation — CSS transition is sufficient
- Do NOT hard-code activity order — derive from `ACTIVITY_POINTS` sorted by value, or use a static array matching the spec order
- Do NOT show completion animation on mount — only on state changes (CSS transition handles this naturally)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `renders progress ring with correct count` | unit | 3 completed → "3/6" in center |
| `SVG stroke-dashoffset is correct for 0, 3, 6 activities` | unit | Math verification |
| `lists all 6 activities in correct order` | unit | Verify order: mood, pray, listen, prayerWall, meditate, journal |
| `completed activity shows check icon and success color` | unit | CircleCheck icon, text-success class |
| `incomplete activity shows circle icon and muted color` | unit | Circle icon, text-white/50 class |
| `shows correct multiplier preview for each tier` | unit | Test 0, 1, 2, 3, 4, 5, 6 completed counts |
| `6/6 shows celebration multiplier message` | unit | "Full Worship Day! 2x points earned!" |
| `progress ring has aria-label` | unit | "X of 6 daily activities completed" |
| `activity rows have aria-labels describing state` | unit | Verify completed vs incomplete labels |
| `mobile layout: ring above list` | unit | Verify flex-col at base breakpoint (CSS class check) |

**Expected state after completion:**
- [x] `ActivityChecklist` component renders all sections
- [x] Progress ring SVG with animated fill
- [x] All 6 activities listed with correct completion state
- [x] Multiplier preview correct for all tiers
- [x] Accessibility attributes present
- [x] Responsive layout (ring above on mobile, beside on sm+)
- [x] All tests passing

---

### Step 4: Wire recordActivity into Pray Tab and Journal Tab

**Objective:** Add `recordActivity('pray')` to the Pray tab and `recordActivity('journal')` to the Journal tab so that using these features feeds into the gamification engine.

**Files to create/modify:**
- `frontend/src/components/daily/PrayTabContent.tsx` — Add `recordActivity('pray')` call
- `frontend/src/components/daily/JournalTabContent.tsx` — Add `recordActivity('journal')` call
- `frontend/src/components/daily/__tests__/PrayTabContent.test.tsx` — Add integration test
- `frontend/src/components/daily/__tests__/JournalTabContent.test.tsx` — Add integration test

**Details:**

**PrayTabContent.tsx:**
- Import `useFaithPoints` from `@/hooks/useFaithPoints`
- Destructure `{ recordActivity }` from the hook
- In the `handleGenerate` function, inside the `setTimeout` callback (line ~107), add `recordActivity('pray')` after `markPrayComplete()`:
  ```typescript
  setTimeout(() => {
    const result = getMockPrayer(text)
    setPrayer(result)
    setIsLoading(false)
    markPrayComplete()
    recordActivity('pray')  // ← add this
  }, 1500)
  ```
- This fires AFTER the prayer text renders (after `setPrayer`), not on button click

**JournalTabContent.tsx:**
- Import `useFaithPoints` from `@/hooks/useFaithPoints`
- Destructure `{ recordActivity }` from the hook
- In the `handleSaveEntry` function (around line 137), add `recordActivity('journal')` after `markJournalComplete()`:
  ```typescript
  markJournalComplete()
  recordActivity('journal')  // ← add this
  showToast('Entry saved')
  ```
- This fires after save confirmation

**Auth gating:** Both components already check auth for these actions (pray: auth modal on generate, journal: auth modal on save). `recordActivity()` also no-ops when not authenticated. Double-safe.

**Guardrails (DO NOT):**
- Do NOT call `recordActivity` on button click — only after successful completion
- Do NOT add separate auth checks — the hook handles it
- Do NOT modify any other behavior in these components
- Do NOT move the `recordActivity` call outside the setTimeout in PrayTabContent — it must fire after the prayer renders

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `PrayTab: recordActivity('pray') called after prayer generation` | integration | Mock useFaithPoints, verify recordActivity called with 'pray' after generate |
| `PrayTab: recordActivity not called on generate failure (empty text)` | integration | Verify not called when text is empty |
| `JournalTab: recordActivity('journal') called after save` | integration | Mock useFaithPoints, verify recordActivity called with 'journal' after save |

**Expected state after completion:**
- [x] `recordActivity('pray')` fires after prayer generation
- [x] `recordActivity('journal')` fires after journal save
- [x] Tests verify integration
- [x] Existing tests still pass (no behavioral changes)

---

### Step 5: Wire recordActivity into Meditation Pages

**Objective:** Add `recordActivity('meditate')` to all 6 meditation sub-pages so completing a meditation feeds into the gamification engine.

**Files to create/modify:**
- `frontend/src/pages/meditate/BreathingExercise.tsx`
- `frontend/src/pages/meditate/ScriptureSoaking.tsx`
- `frontend/src/pages/meditate/GratitudeReflection.tsx`
- `frontend/src/pages/meditate/ActsPrayerWalk.tsx`
- `frontend/src/pages/meditate/PsalmReading.tsx`
- `frontend/src/pages/meditate/ExamenReflection.tsx`

**Details:**

Each meditation page follows the same pattern. For each file:

1. Import `useFaithPoints` from `@/hooks/useFaithPoints`
2. Inside the inner content component (e.g., `BreathingExerciseContent`), add:
   ```typescript
   const { recordActivity } = useFaithPoints()
   ```
3. In the `handleComplete` function, add `recordActivity('meditate')` alongside the existing `markMeditationComplete(type)` call:
   ```typescript
   const handleComplete = () => {
     markMeditationComplete('breathing')
     recordActivity('meditate')  // ← add this
     setIsComplete(true)
   }
   ```

**Note on BreathingExercise:** The completion call is inside the `handleBegin` callback's animation loop (line ~103). Add `recordActivity('meditate')` right after `markMeditationComplete('breathing')`.

**Auth gating:** All 6 pages already redirect logged-out users to `/daily?tab=meditate` via `<Navigate>`. `recordActivity()` also no-ops when not authenticated. Double-safe.

**Guardrails (DO NOT):**
- Do NOT call `recordActivity` on page load — only on completion
- Do NOT call it in the outer auth-guard component — only in the inner content component where completion logic lives
- Do NOT change the meditation type passed to `markMeditationComplete` — that's a separate tracking system

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `Meditation: recordActivity('meditate') called on completion (one representative page)` | integration | Test with BreathingExercise or ExamenReflection |

**Expected state after completion:**
- [x] All 6 meditation pages call `recordActivity('meditate')` on completion
- [x] Tests verify at least one meditation page integration
- [x] Existing meditation tests still pass

---

### Step 6: Wire recordActivity into Prayer Wall

**Objective:** Add `recordActivity('prayerWall')` to the Prayer Wall page so that praying for someone or commenting feeds into the gamification engine.

**Files to create/modify:**
- `frontend/src/pages/PrayerWall.tsx` — Add `recordActivity('prayerWall')` in reaction and comment handlers
- `frontend/src/pages/PrayerWallDashboard.tsx` — Same integration for the prayer dashboard page

**Details:**

**PrayerWall.tsx:**
1. Import `useFaithPoints` from `@/hooks/useFaithPoints`
2. Destructure `{ recordActivity }` from the hook
3. In `handleTogglePraying` (line ~69), add after the `togglePraying` call:
   ```typescript
   const handleTogglePraying = useCallback(
     (prayerId: string) => {
       const wasPraying = togglePraying(prayerId)
       if (!wasPraying) {
         recordActivity('prayerWall')  // ← only when toggling ON (not un-praying)
       }
       setPrayers(...)
     },
     [togglePraying, recordActivity],
   )
   ```
4. In `handleSubmitComment` (line ~83), add after the comment is recorded:
   ```typescript
   const handleSubmitComment = useCallback(
     (prayerId: string, content: string) => {
       if (!isAuthenticated) return
       // ... existing comment creation logic ...
       recordActivity('prayerWall')  // ← add at end
     },
     [isAuthenticated, user, recordActivity],
   )
   ```

**PrayerWallDashboard.tsx:** Apply the same pattern. The dashboard page has similar `togglePraying` and `handleSubmitComment` handlers.

**Important:** Only trigger `recordActivity('prayerWall')` when toggling pray ON (not when un-praying). This is because un-praying is a removal action, not engagement. The idempotency of `recordActivity` ensures multiple prayers/comments on the same day don't re-trigger.

**Auth gating:** Both pages already use `useAuth()` and gate posting/commenting behind auth. `recordActivity()` also no-ops when not authenticated. Triple-safe.

**Guardrails (DO NOT):**
- Do NOT call `recordActivity` when un-praying (toggling OFF)
- Do NOT call `recordActivity` for bookmark toggles — those aren't in the activity list
- Do NOT modify InteractionBar or CommentsSection components — keep integration at page level
- Do NOT add auth checks — the hook handles it

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `PrayerWall: recordActivity('prayerWall') called when praying for someone` | integration | Mock useFaithPoints, verify called on pray toggle ON |
| `PrayerWall: recordActivity not called when un-praying` | integration | Verify not called on toggle OFF |
| `PrayerWall: recordActivity('prayerWall') called on comment submit` | integration | Verify called after comment |

**Expected state after completion:**
- [x] `recordActivity('prayerWall')` fires on pray-toggle-ON and comment submit
- [x] Does NOT fire on un-pray or bookmark
- [x] Tests verify integration
- [x] Existing Prayer Wall tests still pass

---

### Step 7: Add Custom Event for Listen Tracker Real-Time Sync

**Objective:** Enable real-time dashboard updates when the listen tracker records an activity while the user is on the dashboard, by adding a custom event dispatch from `useListenTracker` and a listener in `useFaithPoints`.

**Files to create/modify:**
- `frontend/src/hooks/useListenTracker.ts` — Dispatch `wr:activity-recorded` custom event after persisting
- `frontend/src/hooks/useFaithPoints.ts` — Listen for `wr:activity-recorded` event and reload state

**Details:**

**useListenTracker.ts:**
In the `recordListenActivity` function, after the successful `persistAll()` call (line ~111), add:
```typescript
persistAll(activityLog, newFaithPoints, newStreak);
// Notify other hooks (e.g., useFaithPoints on dashboard) of the state change
window.dispatchEvent(new CustomEvent('wr:activity-recorded', { detail: { type: 'listen' } }));
```

**useFaithPoints.ts:**
Add a `useEffect` that listens for the custom event and reloads state:
```typescript
useEffect(() => {
  if (!isAuthenticated) return;

  const handleExternalActivity = () => {
    setState(loadState());
  };

  window.addEventListener('wr:activity-recorded', handleExternalActivity);
  return () => window.removeEventListener('wr:activity-recorded', handleExternalActivity);
}, [isAuthenticated]);
```

This ensures that when the listen tracker fires after 30 seconds of continuous playback while the user is viewing the dashboard, the activity checklist and streak card update immediately.

**Guardrails (DO NOT):**
- Do NOT use `localStorage` `storage` event — it only fires in OTHER tabs, not the current one
- Do NOT add polling or setInterval — custom events are event-driven and efficient
- Do NOT change the listen tracker's direct-write approach — it needs to work independently of `useFaithPoints`

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `useListenTracker dispatches wr:activity-recorded event after recording` | unit | Verify event dispatched after persistAll |
| `useFaithPoints reloads state on wr:activity-recorded event` | unit | Dispatch event, verify state updates |

**Expected state after completion:**
- [x] Listen tracker dispatches custom event after recording
- [x] `useFaithPoints` listens for event and reloads state
- [x] Real-time dashboard sync works when audio plays for 30s on dashboard
- [x] Existing tests still pass

---

### Step 8: Integrate Widgets into DashboardWidgetGrid

**Objective:** Replace the placeholder text in the streak-points and activity-checklist cards with the real `StreakCard` and `ActivityChecklist` components, wired to `useFaithPoints` data.

**Files to create/modify:**
- `frontend/src/components/dashboard/DashboardWidgetGrid.tsx` — Replace placeholders with real components
- `frontend/src/components/dashboard/__tests__/DashboardWidgetGrid.test.tsx` — Update/add tests

**Details:**

1. Import `useFaithPoints` from `@/hooks/useFaithPoints`
2. Import `StreakCard` and `ActivityChecklist` from their files
3. Call `useFaithPoints()` once at the top of `DashboardWidgetGrid`
4. Replace `<Placeholder text="Coming in Spec 6" />` in the `streak-points` card with:
   ```tsx
   <StreakCard
     currentStreak={currentStreak}
     longestStreak={longestStreak}
     totalPoints={totalPoints}
     currentLevel={currentLevel}
     levelName={levelName}
     pointsToNextLevel={pointsToNextLevel}
     todayMultiplier={todayMultiplier}
   />
   ```
5. Replace `<Placeholder text="Coming in Spec 6" />` in the `activity-checklist` card with:
   ```tsx
   <ActivityChecklist
     todayActivities={todayActivities}
     todayMultiplier={todayMultiplier}
   />
   ```
6. Remove the `Placeholder` component if no longer used by any card (check friends-preview card still uses it for Spec 9)

**Provider requirements:** `useFaithPoints` calls `useAuth()` which requires `AuthProvider`. The Dashboard page is always rendered inside `AuthProvider` (via `App.tsx`), so no additional wrapping needed.

**Test setup note:** Tests for `DashboardWidgetGrid` must wrap in `AuthProvider` (for `useFaithPoints`) and `MemoryRouter` (for `Link` components). Mock `useFaithPoints` to control the data displayed.

**Guardrails (DO NOT):**
- Do NOT remove the `Placeholder` component if it's still used by the friends-preview card
- Do NOT wrap in extra providers — the existing Dashboard page provides everything needed
- Do NOT add `recordActivity` calls here — that's handled in Steps 4-6

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `renders StreakCard in streak-points card` | integration | Verify streak data renders (not placeholder) |
| `renders ActivityChecklist in activity-checklist card` | integration | Verify activities render (not placeholder) |
| `displays updated data after recordActivity` | integration | Call recordActivity, verify UI updates |
| `friends-preview card still shows placeholder` | regression | Verify Spec 9 placeholder is intact |

**Expected state after completion:**
- [x] Streak & Faith Points card shows real data
- [x] Activity Checklist card shows real data
- [x] Both cards are collapsible via DashboardCard
- [x] Friends preview still shows placeholder
- [x] All tests passing

---

### Step 9: End-to-End Integration Tests

**Objective:** Write integration tests that verify the full flow: user completes an activity → `recordActivity` fires → dashboard widgets update.

**Files to create/modify:**
- `frontend/src/components/dashboard/__tests__/dashboard-widgets-integration.test.tsx` — New integration test file

**Details:**

Test scenarios:
1. **Fresh user state:** All activities incomplete, streak 0, 0 points, Seedling level → verify empty states render correctly
2. **After recording activities:** Call `recordActivity` for 2-3 types → verify checklist updates, streak increments, points update
3. **6/6 complete:** All activities complete → verify full ring, "Full Worship Day! 2x points earned!", 2x multiplier badge
4. **Max level:** Set localStorage to 10000+ points → verify "Lighthouse — Max Level" and full progress bar
5. **Auth guard:** Render without auth → verify DEFAULT_STATE renders (0 everything)

Use mock localStorage with preset data. Use `renderHook` for `useFaithPoints` state verification. Use `render` for component visual verification.

**Test setup:**
```typescript
function renderWidgetGrid() {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <DashboardWidgetGrid />
      </AuthProvider>
    </MemoryRouter>
  )
}
```

**Guardrails (DO NOT):**
- Do NOT test Prayer Wall or Daily Hub integration here — those are tested in Steps 4-6
- Do NOT test listen tracker timing here — that's tested in existing `useListenTracker.test.ts`

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `fresh user: shows 0/6, Start your streak, 0 Faith Points, Seedling` | integration | Full empty state |
| `with 3 activities: shows 3/6, correct multiplier preview` | integration | Partial completion |
| `6/6 complete: shows Full Worship Day message and 2x badge` | integration | Full completion |
| `Lighthouse level: full progress bar, max level label` | integration | Max level edge case |
| `unauthenticated: shows default state` | integration | Auth guard verification |

**Expected state after completion:**
- [x] Integration tests cover all major states
- [x] All tests passing
- [x] Full test suite green

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Add constants (checklist names, level icons) |
| 2 | 1 | Build StreakCard component |
| 3 | 1 | Build ActivityChecklist component |
| 4 | — | Wire recordActivity into Pray + Journal tabs |
| 5 | — | Wire recordActivity into 6 meditation pages |
| 6 | — | Wire recordActivity into Prayer Wall |
| 7 | — | Add custom event for listen tracker sync |
| 8 | 2, 3 | Integrate widgets into DashboardWidgetGrid |
| 9 | 2, 3, 8 | End-to-end integration tests |

Steps 1-7 can be executed in parallel groups:
- **Group A (constants + widgets):** 1 → 2+3 (parallel) → 8
- **Group B (integrations):** 4, 5, 6, 7 (all independent, can be parallel)
- **Final:** 9 (after Group A complete)

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Constants: checklist names + level icons | [COMPLETE] | 2026-03-17 | Added `ACTIVITY_CHECKLIST_NAMES` to `activity-points.ts`, `LEVEL_ICON_NAMES` to `levels.ts`. Tests added to existing test files. |
| 2 | StreakCard component | [COMPLETE] | 2026-03-17 | Created `StreakCard.tsx` + 14 tests. Streak display, faith points, level icons, progress bar, multiplier badge, recent badges from localStorage. |
| 3 | ActivityChecklist component | [COMPLETE] | 2026-03-17 | Created `ActivityChecklist.tsx` + 10 tests. SVG progress ring, 6-item activity list, multiplier preview for all tiers. |
| 4 | Pray + Journal tab integration | [COMPLETE] | 2026-03-17 | Added `recordActivity('pray')` in PrayTabContent setTimeout, `recordActivity('journal')` in JournalTabContent handleSave. 3 integration tests. |
| 5 | Meditation pages integration | [COMPLETE] | 2026-03-17 | Added `recordActivity('meditate')` to all 6 meditation pages. 1 integration test (ExamenReflection). Fixed auth-redirect tests to mock useFaithPoints. |
| 6 | Prayer Wall integration | [COMPLETE] | 2026-03-17 | Added `recordActivity('prayerWall')` to PrayerWall.tsx (toggle ON + comment) and PrayerWallDashboard.tsx. 3 integration tests. Fixed 3 existing PrayerWall test files. |
| 7 | Listen tracker real-time sync | [COMPLETE] | 2026-03-17 | Added `wr:activity-recorded` custom event dispatch in useListenTracker after persistAll. Added event listener in useFaithPoints to reload state. |
| 8 | Widget grid integration | [COMPLETE] | 2026-03-17 | Replaced Spec 6 placeholders with StreakCard + ActivityChecklist in DashboardWidgetGrid. useFaithPoints called once at grid level. Updated grid test + Accessibility test. |
| 9 | End-to-end integration tests | [COMPLETE] | 2026-03-17 | Created `dashboard-widgets-integration.test.tsx` with 5 tests (fresh user, 3 activities, 6/6, Lighthouse, unauthenticated). Fixed 5 additional test files needing useFaithPoints mock. Full suite: 152 files, 1291 tests green. |
