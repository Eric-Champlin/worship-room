# Implementation Plan: AI Insights & Monthly Report

**Spec:** `_specs/ai-insights-monthly-report.md`
**Date:** 2026-03-18
**Branch:** `claude/feature/ai-insights-monthly-report`
**Design System Reference:** `_plans/recon/design-system.md` (loaded)
**Recon Report:** not applicable
**Master Spec Plan:** `dashboard-growth-spec-plan-v2.md` (loaded — Spec 15)

---

## Architecture Context

### Project Structure

- **Pages**: `frontend/src/pages/` — e.g., `Insights.tsx`, `Dashboard.tsx`, `Friends.tsx`
- **Components**: `frontend/src/components/insights/` — `CalendarHeatmap.tsx`, `InsightCards.tsx`, `MoodTrendChart.tsx`, `ActivityCorrelations.tsx`, `ScriptureConnections.tsx`
- **Hooks**: `frontend/src/hooks/` — `useAuth.ts`, `useFaithPoints.ts`, `useFocusTrap.ts`
- **Services**: `frontend/src/services/` — `mood-storage.ts`, `faith-points-storage.ts`, `badge-storage.ts`
- **Constants**: `frontend/src/constants/dashboard/` — `levels.ts`, `mood.ts`, `activity-points.ts`, `badges.ts`
- **Types**: `frontend/src/types/dashboard.ts`
- **Utils**: `frontend/src/utils/date.ts`
- **Mocks**: `frontend/src/mocks/notifications-mock-data.ts`
- **Tests**: Co-located `__tests__/` directories alongside components

### Existing Patterns to Follow

- **Auth gating**: `useAuth()` → `if (!isAuthenticated) return <Navigate to="/" replace />` (see `Insights.tsx:165-167`)
- **Page structure**: `min-h-screen bg-[#0f0a1e]` + `<Navbar transparent />` + header + `<main>` + `<SiteFooter />` + `{import.meta.env.DEV && <DevAuthToggle />}` (see `Insights.tsx:170-244`)
- **AnimatedSection**: Inline component in `Insights.tsx:123-138` — opacity-0 with `animate-fade-in` and staggered `animationDelay`
- **Content width**: `mx-auto max-w-5xl px-4 sm:px-6` (see `Insights.tsx:223`)
- **Section spacing**: `space-y-6` (see `Insights.tsx:223`)
- **Frosted glass card**: `rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm md:p-6` (see `InsightCards.tsx:161`)
- **Section headings**: Icon + `text-base font-semibold text-white md:text-lg` (see `InsightCards.tsx:123`)
- **Back link**: `<Link>` with `<ArrowLeft>` + text in `text-sm text-white/50 hover:text-white/70` (see `Insights.tsx:182-188`)
- **Route registration**: `<Route path="/..." element={<Component />} />` in `App.tsx:94-132`
- **Navbar links**: `AVATAR_MENU_LINKS` array at `Navbar.tsx:309-317`, `MOBILE_DRAWER_EXTRA_LINKS` at `Navbar.tsx:320-327`
- **Notification type system**: `NotificationType` union in `types/dashboard.ts:157-164`, icon mapping in `NotificationItem.tsx:7-15`, mock data in `mocks/notifications-mock-data.ts`
- **Test patterns**: Vitest + RTL, import from `@testing-library/react`, co-located `__tests__/` dirs

### Data Sources (All Read-Only from localStorage)

| Key | Service Function | Returns |
|-----|-----------------|---------|
| `wr_mood_entries` | `getMoodEntries()` from `@/services/mood-storage` | `MoodEntry[]` |
| `wr_daily_activities` | `getActivityLog()` from `@/services/faith-points-storage` | `DailyActivityLog` |
| `wr_faith_points` | `getFaithPoints()` from `@/services/faith-points-storage` | `FaithPointsData` |
| `wr_streak` | `getStreakData()` from `@/services/faith-points-storage` | `StreakData` |
| `wr_badges` | `getBadgeData()` from `@/services/badge-storage` | `BadgeData` |

### Cross-Spec Dependencies

- **Spec 1**: `MoodEntry` type, `getMoodEntries()`, `getLocalDateString()`
- **Spec 2**: `AuthProvider`, route switching (`RootRoute`), `useAuth()`, `DevAuthToggle`
- **Spec 3**: `useMoodChartData(days)` — used by insights, reference pattern
- **Spec 4**: `/insights` page, `CalendarHeatmap`, `InsightCards`, `AnimatedSection` pattern
- **Spec 5**: `getActivityLog()`, `getFaithPoints()`, `getStreakData()`, `getLevelForPoints()`
- **Spec 7**: `getBadgeData()`, `BADGE_MAP` from `@/constants/dashboard/badges`
- **Spec 12**: `NotificationType`, `MOCK_NOTIFICATIONS`, `NotificationItem`, `useNotifications()`

---

## Auth Gating Checklist

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| View `/insights/monthly` | Protected route | Step 3 | `useAuth()` + `<Navigate to="/" replace />` |
| View AI insight cards on `/insights` | Only when authenticated (page is gated) | Step 1 | Existing auth gate on `/insights` page |
| Month navigation arrows | Only when authenticated | Step 3 | Page-level auth gate |
| Share button | Only when authenticated | Step 7 | Page-level auth gate |
| Email preview modal | Only when authenticated | Step 8 | Page-level auth gate |
| "Monthly Report" in avatar dropdown | Only shown for logged-in users | Step 9 | Avatar dropdown only renders when authenticated |
| Monthly report notification | Bell only visible when authenticated | Step 9 | Bell only renders when authenticated |

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Page background | background | `bg-[#0f0a1e]` | `Insights.tsx:170` |
| Header gradient | background | `bg-gradient-to-b from-[#1a0533] to-[#0f0a1e]` | `Insights.tsx:180` |
| Content max width | max-width | `max-w-5xl` | `Insights.tsx:181, 223` |
| Frosted glass card | classes | `rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm md:p-6` | `InsightCards.tsx:161` |
| Section heading | font | `text-base font-semibold text-white md:text-lg` | `InsightCards.tsx:123` |
| Stat large number | font | `text-3xl font-bold text-white md:text-4xl` | [UNVERIFIED] from spec — new pattern |
| Stat subtitle | font | `text-sm text-white/60` | spec + existing `text-white/60` pattern |
| Category label | font | `text-xs uppercase tracking-wider text-white/40` | spec requirement |
| Disclaimer text | font | `text-xs text-white/40` + `text-center` | `InsightCards.tsx:180` |
| Back link | classes | `inline-flex items-center gap-1 text-sm text-white/50 hover:text-white/70` | `Insights.tsx:183` |
| Primary button | classes | `rounded-lg bg-primary px-6 py-3 font-semibold text-white hover:opacity-90` | spec + existing patterns |
| Dark tooltip | classes | `rounded-lg border border-white/15 bg-[#1E0B3E] px-3 py-2 text-sm text-white shadow-lg` | design-system.md |
| Mood colors | hex | Struggling: `#D97706`, Heavy: `#C2703E`, Okay: `#8B7FA8`, Good: `#2DD4BF`, Thriving: `#34D399` | `09-design-system.md` |
| Activity colors | hex | Check-in: `#8B7FA8`, Pray: `#6D28D9`, Journal: `#2DD4BF`, Meditate: `#8B5CF6`, Listen: `#00D4FF`, Prayer Wall: `#F39C12` | spec |
| Fade-in animation | class | `animate-fade-in` (500ms ease-out) | `tailwind.config.js` |
| Section stagger | style | `animationDelay: ${index * 100}ms` | `Insights.tsx:133` |

`[UNVERIFIED]` Stat large number: Best guess `text-3xl md:text-4xl font-bold text-white`
→ To verify: Run `/verify-with-playwright` and compare stat cards against dashboard hero stats
→ If wrong: Adjust to match computed styles from running app

---

## Design System Reminder

- Frosted glass: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 md:p-6`
- Section heading pattern: Lucide icon (h-5 w-5 text-white/60) + text in `text-base font-semibold text-white md:text-lg`
- All animations must respect `prefers-reduced-motion` via `motion-reduce:` prefix or `motion-reduce:animate-none`
- Touch targets minimum 44px (`min-h-[44px] min-w-[44px]`)
- The page is DARK theme (`bg-[#0f0a1e]`). Never use light backgrounds except inside the email preview modal.
- Mood colors: Struggling=`#D97706`, Heavy=`#C2703E`, Okay=`#8B7FA8`, Good=`#2DD4BF`, Thriving=`#34D399`
- Use `cn()` from `@/lib/utils` for conditional classNames
- Dashboard uses Recharts with dark theme: `CartesianGrid stroke="rgba(255,255,255,0.05)"`, axis ticks `fill: 'rgba(255,255,255,0.4)'`
- Category labels use `text-xs uppercase tracking-wider text-white/40` (not `text-white/50`)
- Card key uniqueness: use `id` field (not `title`) when mapping insight cards

---

## Shared Data Models (from Master Plan)

No new shared types introduced. This feature reads from existing types:

```typescript
// From @/types/dashboard
interface MoodEntry { id: string; date: string; mood: MoodValue; moodLabel: MoodLabel; text?: string; timestamp: number; verseSeen: string }
interface DailyActivityLog { [date: string]: DailyActivities }
interface DailyActivities { mood: boolean; pray: boolean; listen: boolean; prayerWall: boolean; meditate: boolean; journal: boolean; pointsEarned: number; multiplier: number }
interface FaithPointsData { totalPoints: number; currentLevel: number; currentLevelName: string; pointsToNextLevel: number; lastUpdated: string }
interface StreakData { currentStreak: number; longestStreak: number; lastActiveDate: string | null }
interface BadgeData { earned: Record<string, BadgeEarnedEntry>; newlyEarned: string[]; activityCounts: ActivityCounts }
```

**New local interface (in `useMonthlyReportData.ts`, not shared):**

```typescript
interface MonthlyReportData {
  month: number            // 0-11
  year: number
  monthName: string        // "February"
  dateRange: string        // "February 1 - February 28, 2026"
  daysActive: number
  daysInRange: number      // total days in month or days elapsed if current month in progress
  pointsEarned: number
  startLevel: string
  endLevel: string
  levelProgressPct: number
  moodTrendPct: number     // positive = improvement, negative = decline
  longestStreak: number
  badgesEarned: string[]   // badge IDs earned during this month
  bestDay: { date: string; formattedDate: string; activityCount: number; mood: string } | null
  activityCounts: Record<string, number> // activity type -> count for the month
  moodEntries: MoodEntry[] // filtered entries for this month (for heatmap)
}
```

**localStorage keys this spec touches:**
| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_mood_entries` | Read | Mood data for heatmap, stats |
| `wr_daily_activities` | Read | Activity counts for bar chart |
| `wr_faith_points` | Read | Total points and level |
| `wr_streak` | Read | Streak data for highlights |
| `wr_badges` | Read | Earned badges for highlights |
| `wr_notifications` | Read (mock seeded) | Monthly report notification |

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | <640px | Single column, stat cards 2x2, highlights stacked, full-width share button, email modal full-screen |
| Tablet | 640-1024px | Single column, stat cards 4-across (2x2 if <768px), highlights 3-across, insight cards 1-2 col |
| Desktop | >1024px | `max-w-5xl` centered, stat cards 4-across, highlights 3-across, insight cards 2-col grid, email modal centered ~600px |

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| Header → first content section | `space-y-6` (24px) | `Insights.tsx:223` |
| Content section → next section | `space-y-6` (24px) | `Insights.tsx:223` |
| Last section → footer | `pb-12` (48px) | `Insights.tsx:223` |
| Header bottom padding | `pb-6 md:pb-8` | `Insights.tsx:180` |

---

## Assumptions & Pre-Execution Checklist

- [x] `/insights` page exists with 5 sections, auth gate, time range pills
- [x] `InsightCards` component has `hasData` prop, 4-type rotation, disclaimer
- [x] `CalendarHeatmap` exists with `rangeDays` prop — NOT month-locked (new component needed)
- [x] `AnimatedSection` is an inline function in `Insights.tsx` (not exported — duplicate or extract)
- [x] `useAuth()` returns `{ isAuthenticated, user, login, logout }` from `AuthContext`
- [x] `useFocusTrap()` exists at `@/hooks/useFocusTrap.ts`
- [x] `useToast()` exists via `ToastProvider` context
- [x] All storage services return safe defaults on empty/corrupt localStorage
- [x] Recharts is already a dependency
- [x] `LEVEL_THRESHOLDS` and `getLevelForPoints()` exist in `@/constants/dashboard/levels.ts`
- [x] `BADGE_MAP` exists in `@/constants/dashboard/badges.ts` for badge name lookup
- [x] `NotificationType` is a union type in `types/dashboard.ts:157-164`
- [x] `NOTIFICATION_ICONS` Record in `NotificationItem.tsx:7-15`
- [x] `MOCK_NOTIFICATIONS` array in `mocks/notifications-mock-data.ts` (12 entries, IDs `notif-1` through `notif-12`)
- [ ] All auth-gated actions from the spec are accounted for in the plan
- [ ] Design system values are verified (from reference or codebase inspection)
- [ ] All [UNVERIFIED] values are flagged with verification methods
- [ ] Prior specs in the sequence are complete and committed

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| No mood entries for month | Show "0 of N" stats, empty heatmap, zero bars, encouraging empty states. AI cards still show (mock, not data-driven). | Spec requirement |
| Partial month (current month) | Denominator = days elapsed so far, not total days | Spec requirement |
| First month ever | Left arrow disabled. Level progress shows starting level at 0%. | Spec requirement |
| Default month selection | Current month if today >= day 6, previous month if day 1-5 | Spec requirement |
| CalendarHeatmap reuse | Create new `MonthHeatmap` component (existing takes `rangeDays` not month/year) | Existing component API mismatch |
| AnimatedSection extraction | Duplicate inline in `MonthlyReport.tsx` (same as `Insights.tsx`) | Small utility, not worth extracting to shared |
| Email preview content | Static mock data, does NOT change with selected month | Spec: "simplified preview" |
| Insight card count on monthly report | 3 cards with offset=5 (different from `/insights` page's 4 cards at offset=0) | Spec: "2-3 cards" with "different rotation offset" |
| `NotificationType` extension | Add `'monthly_report'` to union. Will require updating `NOTIFICATION_ICONS` Record. | Spec: notification for report availability |
| Month names | Use `Intl.DateTimeFormat` for locale-aware month names | Standard JS API, no dependency needed |

---

## Implementation Steps

### Step 1: Enhanced AI Insight Card Content Pool & Rotation Logic

**Objective:** Replace the current 4-category × 3-variant rotation system in `InsightCards.tsx` with a new 11-card content pool across 4 categories, using the spec's exact card text and a `dayOfYear`-based rotation.

**Files to create/modify:**
- `frontend/src/constants/dashboard/ai-insights.ts` — NEW: 11-card pool, rotation function
- `frontend/src/components/insights/InsightCards.tsx` — MODIFY: replace INSIGHT_VARIANTS with new pool
- `frontend/src/components/insights/__tests__/InsightCards.test.tsx` — MODIFY: update tests

**Details:**

1. Create `frontend/src/constants/dashboard/ai-insights.ts`:
   - Define `AIInsightCard` interface: `{ id: string; category: 'trend' | 'correlation' | 'scripture' | 'recommendation'; categoryLabel: string; icon: LucideIcon; text: string }`
   - Define `AI_INSIGHT_CARDS` array with all 11 cards using exact text from spec (4 trend, 3 correlation, 2 scripture, 2 recommendation)
   - Icons: `TrendingUp` for trend, `Activity` for correlation, `BookOpen` for scripture, `Lightbulb` for recommendation
   - Category labels: `'Trend'`, `'Activity'`, `'Scripture'`, `'Recommendation'`
   - Export `getDayOfYear(): number` (move from InsightCards.tsx)
   - Export `getInsightCardsForDay(dayOfYear: number, count: number = 4, offset: number = 0): AIInsightCard[]` — selects `count` consecutive cards starting at `(dayOfYear + offset) % total`, wrapping around

2. Modify `InsightCards.tsx`:
   - Remove `INSIGHT_VARIANTS`, `INSIGHT_TYPES`, `getDayOfYear`, `getInsightsForDay` (all replaced)
   - Import `AI_INSIGHT_CARDS`, `getInsightCardsForDay`, `getDayOfYear` from `@/constants/dashboard/ai-insights`
   - `useMemo` → `getInsightCardsForDay(getDayOfYear(), 4, 0)`
   - Card rendering: show `insight.categoryLabel` in `text-xs uppercase tracking-wider text-white/40` (replacing the current `text-sm font-medium uppercase tracking-wide text-white/50`)
   - Use `insight.id` as the map key (not `insight.title` which can duplicate)
   - Keep empty state, section heading, disclaimer text unchanged
   - Keep `hasData` prop interface unchanged
   - Update exports: export `getDayOfYear` and `getInsightCardsForDay` from the constants file (for testing), and `AI_INSIGHT_CARDS`

3. Update `InsightCards.test.tsx`:
   - Import from `@/constants/dashboard/ai-insights` instead of `../InsightCards`
   - Test that rotation with offset=0 produces 4 cards
   - Test that rotation with offset=5 produces different cards than offset=0
   - Update category label assertions: expect "Trend", "Activity", "Scripture", "Recommendation" (not old titles)
   - Tone check: iterate all 11 cards in `AI_INSIGHT_CARDS` for negative words
   - Keep disclaimer test, empty state test, grid class test

**Responsive behavior:**
- Desktop: `lg:grid-cols-2` grid (unchanged)
- Mobile: single column (unchanged)

**Guardrails:**
- DO NOT change the `InsightCardsProps` interface (`{ hasData: boolean }`)
- DO NOT change the section heading text ("Insights") or the section id (`insights-title`)
- DO NOT remove the empty state behavior
- DO NOT change the card CSS classes (`rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm md:p-6`)
- DO NOT remove the disclaimer text

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| renders 4 insight cards | integration | Verify 4 cards render in grid when `hasData=true` |
| category labels | integration | Verify category labels render (Trend, Activity, Scripture, Recommendation) |
| rotation changes daily | unit | `getInsightCardsForDay(0, 4, 0)` differs from `getInsightCardsForDay(1, 4, 0)` |
| offset produces different cards | unit | `getInsightCardsForDay(N, 4, 0)` differs from `getInsightCardsForDay(N, 3, 5)` |
| empty state | integration | `hasData=false` shows encouraging message |
| disclaimer present | integration | Disclaimer text renders |
| tone check | unit | All 11 cards pass negative word filter |

**Expected state after completion:**
- [x] `/insights` page shows 4 rotating cards from the new 11-card pool
- [x] Cards display category labels in muted uppercase style
- [x] All tests pass

---

### Step 2: Monthly Report Data Utility Hook

**Objective:** Create a custom hook that computes all monthly report statistics from existing localStorage data, with mock data fallback when no real data exists.

**Files to create:**
- `frontend/src/hooks/useMonthlyReportData.ts` — NEW
- `frontend/src/hooks/__tests__/useMonthlyReportData.test.ts` — NEW

**Details:**

1. Create `useMonthlyReportData(month: number, year: number): MonthlyReportData`:
   - Import from existing services: `getMoodEntries`, `getActivityLog`, `getFaithPoints`, `getStreakData`, `getBadgeData`
   - Import `getLevelForPoints` from `@/constants/dashboard/levels`
   - Import `BADGE_MAP` from `@/constants/dashboard/badges`
   - Use `useMemo` to compute all derived values when `month`/`year` change

2. Computations:
   - **Month boundaries**: `firstDay = new Date(year, month, 1)`, `lastDay = new Date(year, month + 1, 0)`. Use `getLocalDateString()` for string comparisons.
   - **daysInRange**: If current month and in progress, use today's day-of-month. Otherwise, total days in month (`lastDay.getDate()`).
   - **moodEntries**: Filter `getMoodEntries()` where `entry.date >= firstDayStr && entry.date <= lastDayStr`
   - **daysActive**: Count distinct `entry.date` values from filtered mood entries
   - **pointsEarned**: Sum `log[date].pointsEarned` from `getActivityLog()` for dates in month. If 0, use mock fallback (1847).
   - **startLevel / endLevel / levelProgressPct**: Use `getLevelForPoints()`. For mock: "Sprout" to "Blooming", 67%.
   - **moodTrendPct**: Compare average mood of this month vs previous month. If no previous month data, use 0. Mock fallback: +12.
   - **longestStreak**: Compute from consecutive dates with mood entries within the month. Sort entries by date, iterate, track max consecutive.
   - **badgesEarned**: Filter `getBadgeData().earned` by `earnedAt` timestamp within month. Map to badge IDs.
   - **bestDay**: Find date with most completed activities AND highest mood. Return `{ date, formattedDate, activityCount, mood }` or null.
   - **activityCounts**: Sum each activity type from activity log dates within month. Keys: `mood`, `pray`, `journal`, `meditate`, `listen`, `prayerWall`.
   - **monthName**: `new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date(year, month))`
   - **dateRange**: `"${monthName} 1 - ${monthName} ${lastDay.getDate()}, ${year}"`

3. Mock data fallback (when no entries exist):
   - daysActive: 24, daysInRange: 31
   - pointsEarned: 1847
   - startLevel: "Sprout", endLevel: "Blooming", levelProgressPct: 67
   - moodTrendPct: 12
   - longestStreak: 7
   - badgesEarned: 3 mock badge IDs
   - bestDay: { date matching month 12th, activityCount: 5, mood: "Thriving" }
   - activityCounts: { mood: 24, pray: 18, journal: 15, meditate: 10, listen: 20, prayerWall: 8 }

4. Export `getDefaultMonth(): { month: number; year: number }`:
   - If today's date <= 5, return previous month/year
   - Otherwise, return current month/year

5. Export `getEarliestMonth(entries: MoodEntry[]): { month: number; year: number }`:
   - Find earliest entry date. If no entries, return current month.

**Auth gating:** None — the hook itself doesn't need auth. The page that uses it is auth-gated.

**Guardrails:**
- DO NOT write to localStorage — this is read-only
- DO NOT import from components — only from services, constants, utils
- Use `getLocalDateString()` from `@/utils/date` for all date string generation (never `toISOString().split('T')[0]`)
- All computations in `useMemo` to avoid recalculating on every render

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| returns mock data when empty | unit | Empty localStorage → mock values (24/31 days, 1847 points, etc.) |
| filters mood entries by month | unit | Seed entries across months, verify only target month returned |
| computes daysActive correctly | unit | 5 entries on 3 distinct dates → daysActive = 3 |
| handles partial month | unit | Current month, today is day 15 → daysInRange = 15 |
| handles first month | unit | No previous month data → moodTrendPct = 0 (or mock fallback) |
| getDefaultMonth logic | unit | Day 1-5 returns previous month; day 6+ returns current month |
| getEarliestMonth | unit | Entries exist → returns earliest month; no entries → current month |
| handles corrupted localStorage | unit | Invalid JSON → returns mock fallback gracefully |

**Expected state after completion:**
- [x] `useMonthlyReportData(month, year)` returns complete stats object
- [x] Mock data fallback works when localStorage is empty
- [x] All tests pass

---

### Step 3: Monthly Report Page Shell & Route

**Objective:** Create the `MonthlyReport` page component with auth gating, header with month navigation, page structure, and route registration.

**Files to create/modify:**
- `frontend/src/pages/MonthlyReport.tsx` — NEW
- `frontend/src/App.tsx` — MODIFY: add route
- `frontend/src/pages/__tests__/MonthlyReport.test.tsx` — NEW (partial — finalized in Step 10)

**Details:**

1. Create `MonthlyReport.tsx`:
   - Auth gate: `const { isAuthenticated } = useAuth(); if (!isAuthenticated) return <Navigate to="/" replace />`
   - Skip-to-content link (same pattern as `Insights.tsx:171-176`)
   - `<Navbar transparent />`
   - Header section: `<header className="bg-gradient-to-b from-[#1a0533] to-[#0f0a1e] pt-24 pb-6 md:pt-28 md:pb-8">`
   - Back link: `<Link to="/insights">` with `<ArrowLeft>` icon + "Mood Insights" text
   - Title: `"Your ${data.monthName} Faith Journey"` in `font-serif text-2xl text-white/90 md:text-3xl`
   - Date range subtitle: `data.dateRange` in `text-sm text-white/60 md:text-base`
   - Month navigation: `<ChevronLeft>` and `<ChevronRight>` buttons flanking the title area
     - Left: `aria-label="Previous month"`, disabled when at earliest month
     - Right: `aria-label="Next month"`, disabled when at current/latest month
     - Both: `min-h-[44px] min-w-[44px]` touch targets, `rounded-full bg-white/10 p-2 text-white/60 hover:bg-white/15 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed`
   - Content area: `<main id="monthly-report-content" className="mx-auto max-w-5xl space-y-6 px-4 pb-12 sm:px-6">`
   - `AnimatedSection` component (duplicate from Insights.tsx inline pattern):
     ```tsx
     function AnimatedSection({ index, children }: { index: number; children: React.ReactNode }) {
       return (
         <div
           className="opacity-0 animate-fade-in motion-reduce:animate-none motion-reduce:opacity-100"
           style={{ animationDelay: `${index * 100}ms` }}
         >
           {children}
         </div>
       )
     }
     ```
   - Page entrance: container `key={`${selectedYear}-${selectedMonth}`}` for crossfade on month change
   - State: `selectedMonth` and `selectedYear` initialized from `getDefaultMonth()`
   - Navigation handlers: `goToPreviousMonth()`, `goToNextMonth()` — update month/year with proper boundary logic (December → January of previous year, etc.)
   - Sections rendered as placeholders initially (Steps 4-8 fill them in): `{/* Section 2: Stats */}`, etc.
   - `<SiteFooter />`
   - `{import.meta.env.DEV && <DevAuthToggle />}`

2. Add route in `App.tsx`:
   - Add `import { MonthlyReport } from './pages/MonthlyReport'` at top
   - Add `<Route path="/insights/monthly" element={<MonthlyReport />} />` after the `/insights` route (line 97)

**Responsive behavior:**
- Desktop: Title + arrows in a row, date range below
- Tablet: Same as desktop
- Mobile: Title may wrap to 2 lines; arrows should remain accessible; date range on separate line

**Guardrails:**
- DO NOT create a layout different from `/insights` — match the structure
- DO NOT add new provider wrappers — use existing providers
- DO NOT add loading spinners — all data is synchronous from localStorage
- DO NOT navigate to future months

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| redirects when not authenticated | integration | Render without auth → redirected to `/` |
| renders page title | integration | Title contains month name |
| renders back link to /insights | integration | Back link present and correct |
| month navigation arrows | integration | Both arrows render with correct aria-labels |
| cannot navigate to future months | integration | Right arrow disabled at current month |
| DevAuthToggle in dev mode | integration | Present when `import.meta.env.DEV` |

**Expected state after completion:**
- [x] `/insights/monthly` route works
- [x] Page renders with header, month navigation, empty content area
- [x] Auth gating redirects unauthenticated users
- [x] Tests pass

---

### Step 4: Stat Cards Section

**Objective:** Build the 4 key stat cards (Days Active, Points Earned, Level Progress, Mood Trend) that display prominently at the top of the monthly report content.

**Files to create:**
- `frontend/src/components/insights/MonthlyStatCards.tsx` — NEW
- `frontend/src/components/insights/__tests__/MonthlyStatCards.test.tsx` — NEW

**Details:**

1. Props interface:
   ```typescript
   interface MonthlyStatCardsProps {
     daysActive: number
     daysInRange: number
     pointsEarned: number
     startLevel: string
     endLevel: string
     levelProgressPct: number
     moodTrendPct: number
   }
   ```

2. Four cards in a grid:
   - Container: `<div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">`
   - Each card: `<div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">`
   - **Days Active**: `Calendar` icon (`h-5 w-5 text-white/50`), value `${daysActive}` in `text-3xl font-bold text-white`, subtitle `of ${daysInRange} days` in `text-sm text-white/60`
   - **Points Earned**: `Star` icon, value `${pointsEarned.toLocaleString()}`, subtitle "Faith Points"
   - **Level Progress**: `TrendingUp` icon, text `${startLevel} → ${endLevel}` in `text-lg font-semibold text-white`, progress bar (`h-1.5 rounded-full` track in `bg-white/10`, fill in `bg-primary` with `width: ${levelProgressPct}%`), subtitle `${levelProgressPct}% progress`
   - **Mood Trend**: `Heart` icon, arrow + `${Math.abs(moodTrendPct)}%`, color: positive → `text-emerald-400`, negative → `text-amber-400`, zero → `text-white/60`. Arrow: `↑` for positive, `↓` for negative, `→` for zero.

3. Count-up animation for stat numbers:
   - Simple `useCountUp(target: number, duration: number = 800)` inline hook
   - Uses `requestAnimationFrame` with easeOutQuart
   - Respects `prefers-reduced-motion` — if set, returns target immediately
   - Only animates on first render (via ref tracking)

4. Wire into `MonthlyReport.tsx`:
   - Import `MonthlyStatCards`
   - Pass data from `useMonthlyReportData` result
   - Wrap in `<AnimatedSection index={0}>`

**Responsive behavior:**
- Mobile (<640px): `grid-cols-2 gap-3` — 2x2 grid
- Desktop (640px+): `grid-cols-4 gap-4` — 4 in a row

**Accessibility:**
- Each card: icon has `aria-hidden="true"`, stat value is plain text
- Mood trend arrow: `<span aria-label="Mood improved by 12 percent">↑ 12%</span>` (or "declined" for negative)
- Progress bar: `role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Level progress"`

**Guardrails:**
- DO NOT use `dangerouslySetInnerHTML`
- DO NOT hardcode stat values — accept all data as props
- DO NOT create a separate file for useCountUp — keep it inline in this component (one-time use)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| renders 4 stat cards | integration | 4 cards in grid |
| Days Active format | integration | Shows "24 of 31" format |
| Points comma-formatted | integration | 1847 → "1,847" |
| Level progress bar | integration | Progress bar with correct width style |
| Mood trend positive green | integration | Positive % → green class |
| Mood trend negative amber | integration | Negative % → amber class |
| Responsive grid classes | integration | `grid-cols-2` and `sm:grid-cols-4` present |
| Progress bar aria | integration | `role="progressbar"` with correct valuenow |

**Expected state after completion:**
- [x] Stat cards render in monthly report
- [x] Numbers animate on first render
- [x] Responsive grid works
- [x] Tests pass

---

### Step 5: Month Heatmap & Activity Bar Chart Sections

**Objective:** Build the month-locked heatmap (Section 3) and activity distribution bar chart (Section 4) for the monthly report.

**Files to create:**
- `frontend/src/components/insights/MonthHeatmap.tsx` — NEW
- `frontend/src/components/insights/ActivityBarChart.tsx` — NEW
- `frontend/src/components/insights/__tests__/MonthHeatmap.test.tsx` — NEW
- `frontend/src/components/insights/__tests__/ActivityBarChart.test.tsx` — NEW

**Details:**

**MonthHeatmap:**
1. Props: `{ month: number; year: number; monthName: string; entries: MoodEntry[] }`
2. Build grid for the specific month:
   - Calculate first day of month, day of week offset, total days
   - Build 7-row × N-column grid (Mon-Sun rows, weeks as columns) matching `CalendarHeatmap` orientation
   - Days outside the month: invisible placeholders (`opacity-0`)
   - Each day cell: `h-3 w-3 sm:h-4 sm:w-4 rounded-sm` (12px mobile, 16px desktop)
   - Color: mood value → `MOOD_COLORS[entry.mood]` hex, no entry → `bg-white/10`
   - Tooltip on hover: date + mood label (same pattern as `CalendarHeatmap` — Tailwind tooltip or title attribute)
3. Container: frosted glass card with title `"Your ${monthName} at a Glance"`
4. Day-of-week labels on left: M, W, F (or Mon, Wed, Fri) in `text-xs text-white/40`
5. Reference `CalendarHeatmap.tsx` for grid rendering pattern but adapt for single-month view

**ActivityBarChart:**
1. Props: `{ activityCounts: Record<string, number> }`
2. Recharts `<BarChart>` with `<ResponsiveContainer width="100%" height={250}>`:
   - Data: `[{ name: 'Check-in', count: N, fill: '#8B7FA8' }, { name: 'Pray', count: N, fill: '#6D28D9' }, ...]`
   - `<CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />`
   - `<XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }} axisLine={false} tickLine={false} />`
   - `<YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }} axisLine={false} tickLine={false} />`
   - `<Tooltip content={<CustomTooltip />} />` — dark tooltip: `bg-[#1E0B3E] border border-white/15 rounded-lg px-3 py-2 text-sm text-white shadow-lg`
   - `<Bar dataKey="count" radius={[6, 6, 0, 0]}>` with `<Cell>` for individual bar colors
3. Container: frosted glass card with title `"Your Top Activities"`
4. `aria-label` on chart container: "Activity chart showing Check-in: N, Pray: N, ..." (text summary)

5. Wire both into `MonthlyReport.tsx`:
   - Wrap in `<AnimatedSection index={1}>` and `<AnimatedSection index={2}>`

**Responsive behavior:**
- Heatmap: full width, horizontally scrollable on mobile if month spans 6 weeks (`overflow-x-auto`)
- Bar chart: full width, `<ResponsiveContainer>` handles resize

**Guardrails:**
- DO NOT import the existing `CalendarHeatmap` component — it takes `rangeDays` not month/year
- DO NOT add new npm dependencies — Recharts is already installed
- Activity bar colors must use exact hex values from spec
- Map activity keys to display names: `mood` → "Check-in", `pray` → "Pray", `journal` → "Journal", `meditate` → "Meditate", `listen` → "Listen", `prayerWall` → "Prayer Wall"

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| MonthHeatmap: renders grid | integration | Grid of day squares renders |
| MonthHeatmap: correct month title | integration | Title contains month name |
| MonthHeatmap: mood colors applied | integration | Squares have correct background colors |
| MonthHeatmap: empty days | integration | Days without entries show muted color |
| ActivityBarChart: renders 6 bars | integration | 6 activity categories present |
| ActivityBarChart: correct labels | integration | All 6 activity names in X-axis |
| ActivityBarChart: aria-label | integration | Container has text summary |
| ActivityBarChart: tooltip renders | integration | Custom tooltip component present |

**Expected state after completion:**
- [x] Month heatmap renders in monthly report
- [x] Activity bar chart renders with correct colors
- [x] Tests pass

---

### Step 6: Highlight Moments Section

**Objective:** Build the 3 highlight cards (Longest Streak, Badges Earned, Best Day) with empty states.

**Files to create:**
- `frontend/src/components/insights/MonthlyHighlights.tsx` — NEW
- `frontend/src/components/insights/__tests__/MonthlyHighlights.test.tsx` — NEW

**Details:**

1. Props:
   ```typescript
   interface MonthlyHighlightsProps {
     longestStreak: number
     badgesEarned: string[]  // badge IDs
     bestDay: { formattedDate: string; activityCount: number; mood: string } | null
   }
   ```

2. Three cards in a row:
   - Container: `<div className="grid grid-cols-1 gap-4 md:grid-cols-3">`
   - Each card: frosted glass pattern
   - **Longest Streak**: `Flame` icon (Lucide) in `text-orange-400`, value `"${longestStreak} days"` in `text-2xl font-bold text-white`, subtitle "Longest streak this month"
     - Empty state (streak === 0): "Every day is a new beginning" in `text-white/60`
   - **Badges Earned**: `Award` icon in `text-purple-400`, value `"${count} ${count === 1 ? 'badge' : 'badges'}"`, mini badge names listed below (from `BADGE_MAP` lookup)
     - Empty state: "No new badges this month — keep going!" in `text-white/60`
   - **Best Day**: `Sparkles` icon in `text-teal-400`, value `"${formattedDate}"`, subtitle `"${activityCount} activities, feeling ${mood}"`
     - Empty state (bestDay === null): "No data yet — start checking in to see your journey!" in `text-white/60`

3. Wire into `MonthlyReport.tsx`:
   - Pass data from `useMonthlyReportData`
   - Wrap in `<AnimatedSection index={3}>`

**Responsive behavior:**
- Mobile: `grid-cols-1` — stacked vertically
- Desktop: `md:grid-cols-3` — 3 in a row

**Accessibility:**
- Each card: `<h3>` for the highlight type (e.g., "Longest Streak"), icon `aria-hidden="true"`

**Guardrails:**
- DO NOT make badge thumbnails clickable — display only
- DO NOT import complex badge rendering components — keep it simple with badge names as text

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| renders 3 highlight cards | integration | 3 cards render |
| streak value displays | integration | "7 days" shown correctly |
| badge count displays | integration | "3 badges" shown correctly |
| best day info displays | integration | Date + activity count + mood shown |
| streak empty state | integration | streak=0 → encouraging message |
| badges empty state | integration | empty array → "keep going" message |
| best day empty state | integration | null → "start checking in" message |
| encouraging tone | integration | No negative/punitive language |

**Expected state after completion:**
- [x] Highlight cards render in monthly report
- [x] Empty states are warm and encouraging
- [x] Tests pass

---

### Step 7: AI Insight Cards on Monthly Report + Share Button

**Objective:** Add 3 rotating AI insight cards (with different offset from `/insights` page) and the "Share Your Month" button with toast.

**Files to create:**
- `frontend/src/components/insights/MonthlyInsightCards.tsx` — NEW
- `frontend/src/components/insights/MonthlyShareButton.tsx` — NEW
- `frontend/src/components/insights/__tests__/MonthlyInsightCards.test.tsx` — NEW
- `frontend/src/components/insights/__tests__/MonthlyShareButton.test.tsx` — NEW

**Details:**

**MonthlyInsightCards:**
1. Reuses `getInsightCardsForDay` from `@/constants/dashboard/ai-insights` with `offset=5` and `count=3`
2. Card rendering: same pattern as updated `InsightCards.tsx` — category label + icon + text in frosted glass cards
3. Grid: `grid grid-cols-1 gap-4 lg:grid-cols-2` (2-col on desktop, single on mobile) — same as `/insights` but with 3 cards instead of 4
4. Section heading: `Lightbulb` icon + "Monthly Insights" in `text-base font-semibold text-white md:text-lg`
5. NO disclaimer text on monthly report version (spec does not mention it here)

**MonthlyShareButton:**
1. `<button>` with `bg-primary text-white font-semibold py-3 px-8 rounded-lg transition-opacity hover:opacity-90`
2. `onClick`: `showToast("Sharing is coming soon! We're working on beautiful shareable cards for your faith journey.", "success")`
3. Import `useToast()` from `@/components/ui/Toast`
4. `aria-label="Share your monthly report"`
5. Container: centered with `text-center`

6. Wire both into `MonthlyReport.tsx`:
   - `MonthlyInsightCards` in `<AnimatedSection index={4}>`
   - `MonthlyShareButton` in `<AnimatedSection index={5}>`

**Responsive behavior:**
- Share button: `w-full sm:w-auto` (full width on mobile, auto width on desktop)

**Guardrails:**
- DO NOT implement actual sharing functionality
- DO NOT change the existing `useToast` API
- Toast message must match spec text exactly

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| renders 3 insight cards | integration | 3 cards in grid |
| uses different offset than /insights | unit | Offset=5 produces different cards than offset=0 |
| share button renders | integration | Button with correct text |
| share button shows toast | integration | Click → toast with spec message |
| share button aria-label | integration | Correct accessible name |

**Expected state after completion:**
- [x] 3 insight cards render on monthly report
- [x] Share button triggers toast
- [x] Tests pass

---

### Step 8: Email Template Preview Modal

**Objective:** Build a modal showing a visual email preview of the monthly report (light theme, static content).

**Files to create:**
- `frontend/src/components/insights/EmailPreviewModal.tsx` — NEW
- `frontend/src/components/insights/__tests__/EmailPreviewModal.test.tsx` — NEW

**Details:**

1. Props: `{ isOpen: boolean; onClose: () => void; monthName: string }`
2. When `!isOpen`, return `null`
3. Backdrop: `<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">` with `onClick={onClose}` (close on backdrop click)
4. Modal container: `<div className="max-h-[85vh] w-full max-w-[600px] overflow-y-auto rounded-2xl bg-gray-100 shadow-xl" onClick={e => e.stopPropagation()}>` (prevent close on content click)
5. Subject line above email: `<p className="mb-2 text-center text-sm text-white/60">"Your ${monthName} Faith Journey — Worship Room"</p>` — rendered OUTSIDE the white container, on the dark backdrop
6. Close button: top-right `<button aria-label="Close email preview">` with `X` icon, `min-h-[44px] min-w-[44px]`

**Email content (LIGHT THEME):**
- White container: `<div className="bg-white rounded-xl mx-4 my-4">`
- Header banner: `<div className="bg-gradient-to-r from-purple-600 to-purple-800 p-6 rounded-t-xl text-center">` with "Your Faith Journey" in `text-xl font-bold text-white`
- 4 stat boxes in 2x2 grid: simple `bg-gray-50 rounded-lg p-3` cards with label + value
  - "Days Active: 24 of 31", "Points Earned: 1,847", "Level: Sprout → Blooming", "Mood Trend: ↑ 12%"
- Heatmap placeholder: `<div className="bg-gray-200 rounded-lg h-24 flex items-center justify-center text-gray-500 text-sm">Your mood calendar</div>`
- 1 highlight: "Your longest streak: 7 days" in a small highlight box
- CTA button: `<div className="bg-purple-600 text-white font-semibold py-3 px-6 rounded-lg text-center mx-auto w-fit">View Full Report</div>` (non-functional)
- Footer: "Worship Room" in `text-gray-400 text-xs text-center` with padding

7. Disclaimer below modal: `<p className="mt-3 text-center text-xs text-white/40">Email reports coming soon. This is a preview of what your monthly email will look like.</p>`

8. Focus management: `useFocusTrap(isOpen, onClose)` from `@/hooks/useFocusTrap`
9. Escape key: handled by `useFocusTrap` (it already handles Escape)

10. Wire into `MonthlyReport.tsx`:
    - State: `const [showEmailPreview, setShowEmailPreview] = useState(false)`
    - "Preview Email" link below the share button: `<button className="mt-2 text-sm text-white/50 underline hover:text-white/70" onClick={() => setShowEmailPreview(true)}>Preview Email</button>`
    - `<EmailPreviewModal isOpen={showEmailPreview} onClose={() => setShowEmailPreview(false)} monthName={data.monthName} />`

**Responsive behavior:**
- Mobile: Modal takes full width with `p-4` padding (effectively full-screen minus 16px margins)
- Desktop: Centered at max 600px width

**Accessibility:**
- `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointing to subject line id
- Focus trapped via `useFocusTrap`
- Escape dismisses
- Close button: `aria-label="Close email preview"`

**Guardrails:**
- DO NOT send any emails
- DO NOT use `dangerouslySetInnerHTML`
- This is static mock content — does NOT change with selected month
- Use the EXISTING `useFocusTrap` hook
- Keep email content simple — this is a preview, not a real email template

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| renders when open | integration | `isOpen=true` → modal visible |
| hidden when closed | integration | `isOpen=false` → nothing rendered |
| close button works | integration | Click close → `onClose` called |
| escape dismisses | integration | Escape key → `onClose` called |
| subject line contains month | integration | Month name in subject text |
| light theme inside | integration | `bg-white` class present in email content |
| disclaimer present | integration | "Email reports coming soon" text |
| CTA button non-functional | integration | "View Full Report" present but no navigation |
| dialog role | integration | `role="dialog"` and `aria-modal="true"` present |

**Expected state after completion:**
- [x] Email preview modal opens/closes
- [x] Light theme email content renders
- [x] Focus is trapped
- [x] Tests pass

---

### Step 9: Navigation Integration (Navbar, Notifications, `/insights` Link)

**Objective:** Add entry points to the monthly report: avatar dropdown link, mobile drawer link, notification, and a button on the `/insights` page.

**Files to modify:**
- `frontend/src/components/Navbar.tsx` — MODIFY: add links to both arrays
- `frontend/src/pages/Insights.tsx` — MODIFY: add "View Monthly Report" link
- `frontend/src/types/dashboard.ts` — MODIFY: extend `NotificationType`
- `frontend/src/components/dashboard/NotificationItem.tsx` — MODIFY: add icon mapping
- `frontend/src/mocks/notifications-mock-data.ts` — MODIFY: add mock notification

**Details:**

**Navbar changes:**
1. In `AVATAR_MENU_LINKS` array (line 309-317), add after the `'Mood Insights'` entry (index 5):
   ```typescript
   { label: 'Monthly Report', to: '/insights/monthly' },
   ```
   New array has 8 items: Dashboard, Friends, My Journal Entries, My Prayer Requests, My Favorites, Mood Insights, **Monthly Report**, Settings

2. In `MOBILE_DRAWER_EXTRA_LINKS` array (line 320-327), add after `'Mood Insights'` entry (index 1):
   ```typescript
   { label: 'Monthly Report', to: '/insights/monthly' },
   ```
   New array has 7 items: Friends, Mood Insights, **Monthly Report**, My Journal Entries, My Prayer Requests, My Favorites, Settings

**Insights page changes:**
1. Add a "View Monthly Report" link at the bottom of `<main>`, after the last `AnimatedSection` (ScriptureConnections at index 4), before closing `</main>`:
   ```tsx
   <AnimatedSection index={5}>
     <div className="pt-2 text-center">
       <Link
         to="/insights/monthly"
         className="inline-block rounded-lg bg-primary px-6 py-3 font-semibold text-white transition-opacity hover:opacity-90"
       >
         View Monthly Report
       </Link>
     </div>
   </AnimatedSection>
   ```
2. Add `Link` to the imports from `react-router-dom` (it's already imported at line 2)

**NotificationType extension:**
1. In `types/dashboard.ts:157-164`, add `'monthly_report'` to the union:
   ```typescript
   export type NotificationType =
     | 'encouragement'
     | 'friend_request'
     | 'milestone'
     | 'friend_milestone'
     | 'nudge'
     | 'weekly_recap'
     | 'level_up'
     | 'monthly_report';
   ```

2. In `NotificationItem.tsx:7-15`, add to `NOTIFICATION_ICONS`:
   ```typescript
   monthly_report: '📋',
   ```

3. In `mocks/notifications-mock-data.ts`, append to `MOCK_NOTIFICATIONS` array:
   ```typescript
   {
     id: 'notif-13',
     type: 'monthly_report',
     message: 'Your February Faith Journey is ready!',
     read: false,
     timestamp: daysAgo(0),
     actionUrl: '/insights/monthly',
   },
   ```

**Guardrails:**
- DO NOT reorganize the entire Navbar — only add entries to existing arrays
- DO NOT change existing notification mock data — only append
- DO NOT change the existing `Link` import in Insights.tsx (already present)
- Maintain the `as const` on the Navbar arrays

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| "View Monthly Report" link on /insights | integration | Link present, points to `/insights/monthly` |
| TypeScript compiles with new NotificationType | compilation | No TS errors |
| notification icon mapping complete | unit | `NOTIFICATION_ICONS['monthly_report']` returns '📋' |
| mock notification present | unit | `MOCK_NOTIFICATIONS` includes `notif-13` with type `monthly_report` |

**Expected state after completion:**
- [x] "Monthly Report" appears in avatar dropdown and mobile drawer
- [x] "View Monthly Report" button on `/insights` page
- [x] Monthly report notification in mock data
- [x] All types compile

---

### Step 10: Final Integration, Edge Cases & Comprehensive Tests

**Objective:** Wire all section components together in `MonthlyReport.tsx`, handle edge cases, add month crossfade transition, and write comprehensive tests.

**Files to modify/create:**
- `frontend/src/pages/MonthlyReport.tsx` — FINALIZE: wire all sections
- `frontend/src/pages/__tests__/MonthlyReport.test.tsx` — FINALIZE: comprehensive tests

**Details:**

1. Finalize `MonthlyReport.tsx` — import and wire all section components:
   ```tsx
   import { MonthlyStatCards } from '@/components/insights/MonthlyStatCards'
   import { MonthHeatmap } from '@/components/insights/MonthHeatmap'
   import { ActivityBarChart } from '@/components/insights/ActivityBarChart'
   import { MonthlyHighlights } from '@/components/insights/MonthlyHighlights'
   import { MonthlyInsightCards } from '@/components/insights/MonthlyInsightCards'
   import { MonthlyShareButton } from '@/components/insights/MonthlyShareButton'
   import { EmailPreviewModal } from '@/components/insights/EmailPreviewModal'
   ```
   - Section 1 (header): Already built in Step 3
   - Section 2: `<AnimatedSection index={0}><MonthlyStatCards ... /></AnimatedSection>`
   - Section 3: `<AnimatedSection index={1}><MonthHeatmap ... /></AnimatedSection>`
   - Section 4: `<AnimatedSection index={2}><ActivityBarChart ... /></AnimatedSection>`
   - Section 5: `<AnimatedSection index={3}><MonthlyHighlights ... /></AnimatedSection>`
   - Section 6: `<AnimatedSection index={4}><MonthlyInsightCards /></AnimatedSection>`
   - Section 7: `<AnimatedSection index={5}>` containing `<MonthlyShareButton />` + "Preview Email" link
   - `<EmailPreviewModal isOpen={showEmailPreview} onClose={...} monthName={data.monthName} />`

2. Month crossfade transition:
   - Use `key={`${selectedYear}-${selectedMonth}`}` on the content `<main>` to trigger remount on month change
   - The `animate-fade-in` class on content container handles the fade-in
   - Add `motion-reduce:transition-none` for reduced motion

3. Comprehensive test suite (`MonthlyReport.test.tsx`):
   - Mock `useAuth` for auth gate tests
   - Mock localStorage for data variation tests
   - Test rendering in `MemoryRouter` with route at `/insights/monthly`

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| auth gate: redirects unauthenticated | integration | Not logged in → redirect to `/` |
| auth gate: renders for authenticated | integration | Logged in → page renders |
| renders all 7 sections | integration | Stat cards, heatmap, bar chart, highlights, insights, share, email preview link all present |
| month navigation: previous month | integration | Click left arrow → title changes to previous month |
| month navigation: next disabled at current | integration | Right arrow disabled at current month |
| month navigation: wraps year boundary | integration | January → December of previous year works |
| share button toast | integration | Click → toast message appears |
| email preview open/close | integration | Click "Preview Email" → modal opens, click close → closes |
| empty localStorage | integration | All sections render with mock data (no crashes) |
| back link to /insights | integration | Link present and correct href |
| reduced motion classes | integration | `motion-reduce:animate-none` present |
| responsive grid classes | integration | Stat cards: `grid-cols-2 sm:grid-cols-4`; highlights: `grid-cols-1 md:grid-cols-3` |
| skip-to-content link | integration | Present with correct href |

**Expected state after completion:**
- [x] Complete monthly report page with all 7 sections
- [x] Month navigation works with proper boundaries
- [x] Email preview modal works
- [x] All sections gracefully handle empty/mock data
- [x] Comprehensive test suite passes

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | AI Insight Card content pool & rotation logic |
| 2 | — | Monthly report data utility hook |
| 3 | 2 | Page shell, route, header, month navigation |
| 4 | 2, 3 | Stat cards section |
| 5 | 2, 3 | Month heatmap & activity bar chart |
| 6 | 2, 3 | Highlight moments section |
| 7 | 1, 3 | AI insight cards on monthly report + share button |
| 8 | 3 | Email template preview modal |
| 9 | 3 | Navigation integration (Navbar, notifications, /insights link) |
| 10 | 3, 4, 5, 6, 7, 8, 9 | Final integration & comprehensive tests |

**Recommended execution order:** 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10

Steps 4-9 can be parallelized after Steps 1-3, but sequential is safer for a single developer.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | AI Insight Card Content Pool | [COMPLETE] | 2026-03-18 | Created `constants/dashboard/ai-insights.ts` (11-card pool, rotation fn). Updated `InsightCards.tsx` (new pool, `id` keys, `text-white/40` category labels). Updated tests (9 passing). |
| 2 | Monthly Report Data Hook | [COMPLETE] | 2026-03-18 | Created `hooks/useMonthlyReportData.ts` (hook + getDefaultMonth + getEarliestMonth). Created tests (10 passing). |
| 3 | Monthly Report Page Shell & Route | [COMPLETE] | 2026-03-18 | Created `pages/MonthlyReport.tsx` with auth gate, header, month nav, placeholders. Added route in `App.tsx`. Tests (8 passing). Removed unused `getStreakData` import. |
| 4 | Stat Cards Section | [COMPLETE] | 2026-03-18 | Created `MonthlyStatCards.tsx` with 4 cards, count-up animation, progress bar, trend colors. Wired into `MonthlyReport.tsx`. Tests (8 passing). |
| 5 | Month Heatmap & Activity Bar Chart | [COMPLETE] | 2026-03-18 | Created `MonthHeatmap.tsx` (month-locked grid, mood colors, tooltips) and `ActivityBarChart.tsx` (Recharts bar chart, 6 activity colors, custom tooltip). Wired into page. Tests (8 passing). |
| 6 | Highlight Moments Section | [COMPLETE] | 2026-03-18 | Created `MonthlyHighlights.tsx` with 3 cards (streak, badges, best day), empty states. Wired into page. Tests (8 passing). |
| 7 | AI Insight Cards + Share Button | [COMPLETE] | 2026-03-18 | Created `MonthlyInsightCards.tsx` (3 cards, offset=5) and `MonthlyShareButton.tsx` (toast on click). Wired into page. Tests (6 passing). |
| 8 | Email Template Preview Modal | [COMPLETE] | 2026-03-18 | Created `EmailPreviewModal.tsx` with light-theme email preview, focus trap, close button, disclaimer. Wired into page with "Preview Email" link. Tests (9 passing). |
| 9 | Navigation Integration | [COMPLETE] | 2026-03-18 | Added "Monthly Report" to AVATAR_MENU_LINKS and MOBILE_DRAWER_EXTRA_LINKS in Navbar. Added "View Monthly Report" button on /insights page. Extended NotificationType with 'monthly_report', added icon mapping, added notif-13 mock. Fixed Insights test (5→6 animated sections). |
| 10 | Final Integration & Tests | [COMPLETE] | 2026-03-18 | All sections wired in MonthlyReport.tsx. Comprehensive test suite (20 tests). Fixed unused vars in test files. All 120 tests pass across 15 test files. |
