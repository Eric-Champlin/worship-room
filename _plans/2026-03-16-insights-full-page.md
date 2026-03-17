# Implementation Plan: Insights Full Page

**Spec:** `_specs/insights-full-page.md`
**Date:** 2026-03-16
**Branch:** `claude/feature/insights-full-page`
**Design System Reference:** `_plans/recon/design-system.md` (loaded)
**Recon Report:** not applicable (no external recon for this page)
**Master Spec Plan:** `dashboard-growth-spec-plan-v2.md` (loaded)

---

## Architecture Context

### Existing Files & Patterns

- **Current stub page**: `frontend/src/pages/Insights.tsx` — simple "Coming Soon" stub using `Layout` wrapper. Will be fully replaced.
- **Route**: Already registered in `App.tsx` line 94: `<Route path="/insights" element={<Insights />} />`. No route-level auth guard — page checks auth internally (same pattern as `Dashboard.tsx`).
- **Auth context**: `frontend/src/contexts/AuthContext.tsx` — `useAuth()` returns `{ isAuthenticated, user, login, logout }`. Dashboard pattern: `if (!user) return null`.
- **Dashboard page**: `frontend/src/pages/Dashboard.tsx` — dark theme (`min-h-screen bg-[#0f0a1e]`), `<Navbar transparent />`, skip-to-content, `<SiteFooter>`.
- **DashboardCard**: `frontend/src/components/dashboard/DashboardCard.tsx` — frosted glass card wrapper (`bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 md:p-6`). Supports `title`, `icon`, `action`, `collapsible`.
- **MoodChart**: `frontend/src/components/dashboard/MoodChart.tsx` — Recharts LineChart with custom dots, dark tooltip, empty state with ghosted chart. Uses `useMoodChartData(7)`.
- **useMoodChartData hook**: `frontend/src/hooks/useMoodChartData.ts` — takes `days` param, returns `MoodChartDataPoint[]` with `date`, `dayLabel`, `mood`, `moodLabel`, `color`. Ordered chronologically (oldest first). Uses `getLocalDateString()` for dates. Reactive via localStorage read.
- **Mood storage**: `frontend/src/services/mood-storage.ts` — `getMoodEntries()` returns `MoodEntry[]` from `wr_mood_entries` localStorage.
- **MoodEntry type**: `frontend/src/types/dashboard.ts` — `{ id, date, mood (1-5), moodLabel, text?, timestamp, verseSeen }`.
- **Mood colors**: `frontend/src/constants/dashboard/mood.ts` — `MOOD_COLORS: Record<MoodValue, string>` mapping 1-5 to hex colors. Also exports `MOOD_OPTIONS` with labels.
- **Date utils**: `frontend/src/utils/date.ts` — `getLocalDateString()`, `getYesterdayDateString()`, `getCurrentWeekStart()`.
- **DashboardWidgetGrid**: `frontend/src/components/dashboard/DashboardWidgetGrid.tsx` — MoodChart card has `action={{ label: 'See More', to: '/insights' }}` (entry point to insights page).
- **Navbar**: `frontend/src/components/Navbar.tsx` — avatar dropdown includes `{ label: 'Mood Insights', to: '/insights' }` (entry point).
- **Recharts**: v3.8.0 installed. Components used: `ResponsiveContainer`, `LineChart`, `CartesianGrid`, `XAxis`, `YAxis`, `Line`, `Tooltip`, `BarChart`, `Bar`.
- **Provider stack** (App.tsx): `QueryClientProvider > BrowserRouter > AuthProvider > ToastProvider > AuthModalProvider > AudioProvider > Routes`.
- **Lucide React**: Icon library used throughout.

### Test Patterns

- Tests in `__tests__/` subdirectory next to component files
- `ResizeObserver` mock required for Recharts components
- `localStorage.clear()` in `beforeEach`, `vi.restoreAllMocks()` in `afterEach`
- Factory functions for test data (`makeMoodEntry()`, `daysAgo()`, `seedEntries()`)
- Components wrapped in `<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>`
- Auth mocking: mock `@/hooks/useAuth` with `vi.mock()`

### Cross-Spec Dependencies

- **Spec 1** (Mood Check-In): Creates `MoodEntry` type, `wr_mood_entries` localStorage key, `mood-storage.ts` service, `utils/date.ts` — all built and committed.
- **Spec 2** (Dashboard Shell): Provides `AuthProvider`, route switching, navbar logged-in state — all built and committed.
- **Spec 3** (Mood Insights Dashboard Widget): Creates `useMoodChartData(days)` hook, `MoodChart` component, "See More" link to `/insights` — all built and committed.

---

## Auth Gating Checklist

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Access `/insights` route | Entire page is auth-gated | Step 1 | `useAuth()` — if `!isAuthenticated`, redirect to landing page via `<Navigate to="/" />` |
| View calendar heatmap | Only for logged-in users | Step 2 | Page-level auth gate (Step 1) |
| View line chart | Only for logged-in users | Step 3 | Page-level auth gate (Step 1) |
| Interact with time range pills | Only for logged-in users | Step 2 | Page-level auth gate (Step 1) |
| Toggle moving average | Only for logged-in users | Step 3 | Page-level auth gate (Step 1) |
| View AI insight cards | Only for logged-in users | Step 4 | Page-level auth gate (Step 1) |
| View activity correlations | Only for logged-in users | Step 5 | Page-level auth gate (Step 1) |
| View scripture connections | Only for logged-in users | Step 5 | Page-level auth gate (Step 1) |

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Page background | background-color | `#0f0a1e` | Dashboard.tsx line 45 |
| Page header gradient | background | `bg-gradient-to-b from-[#1a0533] to-[#0f0a1e]` | DashboardHero.tsx line 20 |
| Frosted glass card | classes | `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 md:p-6` | DashboardCard.tsx line 71 |
| Card title | classes | `text-base font-semibold text-white md:text-lg` | DashboardCard.tsx line 84 |
| Chart line stroke | color | `#8B5CF6` (primary-lt) | MoodChart.tsx line 205 |
| Chart grid lines | stroke | `rgba(255, 255, 255, 0.05)` | MoodChart.tsx line 184 |
| Chart axis text | fill, size | `rgba(255, 255, 255, 0.5)`, 12px | MoodChart.tsx lines 188-189 |
| Dark tooltip | classes | `rounded-lg border border-white/15 bg-[#1E0B3E] px-3 py-2 text-sm text-white shadow-lg` | MoodChart.tsx line 80 |
| Mood colors | 1-5 | `#D97706`, `#C2703E`, `#8B7FA8`, `#2DD4BF`, `#34D399` | mood.ts MOOD_COLORS |
| Empty square | color | `rgba(255, 255, 255, 0.05)` | Spec requirement |
| Active pill | classes | `bg-purple-600 text-white` | Spec requirement |
| Inactive pill | classes | `border border-white/20 text-white/60` | Spec requirement |
| Body font | family | Inter (`font-sans`) | design-system.md |
| Scripture font | family | Lora (`font-serif`) | design-system.md |
| Disclaimer text | classes | `text-white/40 text-xs` | Spec requirement |

---

## Design System Reminder

- Worship Room uses Caveat for script/highlighted headings, not Lora
- Dashboard uses all-dark theme: `bg-[#0f0a1e]` page background, `from-[#1a0533] to-[#0f0a1e]` hero gradient
- Dashboard frosted glass cards: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 md:p-6`
- Mood colors: Struggling=`#D97706`, Heavy=`#C2703E`, Okay=`#8B7FA8`, Good=`#2DD4BF`, Thriving=`#34D399`
- Dark tooltips: `bg-[#1E0B3E] border border-white/15 rounded-lg px-3 py-2 text-sm text-white`
- Chart line: `#8B5CF6` stroke, 2px width, `type="monotone"`
- Date handling: Always use `getLocalDateString()` from `utils/date.ts` — NEVER `.toISOString()`
- Navbar: `<Navbar transparent />` on dark pages (absolute positioning over hero)
- All interactive elements: min 44px touch targets on mobile

---

## Shared Data Models (from Master Plan)

```typescript
// frontend/src/types/dashboard.ts (already built)
export type MoodValue = 1 | 2 | 3 | 4 | 5;
export type MoodLabel = 'Struggling' | 'Heavy' | 'Okay' | 'Good' | 'Thriving';

export interface MoodEntry {
  id: string;
  date: string;           // YYYY-MM-DD local date
  mood: MoodValue;
  moodLabel: MoodLabel;
  text?: string;
  timestamp: number;
  verseSeen: string;
}

// frontend/src/hooks/useMoodChartData.ts (already built)
export interface MoodChartDataPoint {
  date: string;
  dayLabel: string;
  mood: number | null;
  moodLabel: MoodLabel | null;
  color: string | null;
}
```

**localStorage keys this spec touches:**
| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_mood_entries` | Read | Daily mood entries — source of all real data on this page |
| `wr_auth_simulated` | Read (via AuthProvider) | Auth check for page access |

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | < 640px | Single column, heatmap 12px squares + horizontal scroll for >30d, chart 220px tall, insight cards stacked, time pills may need tighter padding |
| Tablet | 640px-1024px | Single column, heatmap 16px squares, chart 250px, insight cards 2-col possible |
| Desktop | > 1024px | `max-w-5xl` centered container, heatmap 16px squares, chart 280px, insight cards 2-col grid |

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| Page header → time range pills | 0px (pills directly below header) | Spec: sticky pills below header |
| Time range pills → first card | 24px (`space-y-6`) | Spec: `space-y-6` or `gap-6` |
| Card → Card | 24px (`space-y-6`) | Spec: generous spacing between sections |
| Last card → footer | 48px+ (standard) | Dashboard pattern |

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] Spec 1 (Mood Check-In) is complete and committed — `MoodEntry` type, `wr_mood_entries`, `mood-storage.ts`, `utils/date.ts` available
- [x] Spec 2 (Dashboard Shell) is complete and committed — `AuthProvider`, route switching, navbar logged-in state available
- [x] Spec 3 (Mood Insights Dashboard Widget) is complete and committed — `useMoodChartData(days)` hook, `MoodChart` component available
- [x] All auth-gated actions from the spec are accounted for in the plan (single page-level gate)
- [x] Design system values are verified (from `_plans/recon/design-system.md` and codebase files)
- [ ] No [UNVERIFIED] values flagged (see below for heatmap and sticky pills)
- [x] Recharts v3.8.0 installed (BarChart available for activity correlations)
- [x] Branch `claude/feature/insights-full-page` exists

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Auth gate method | `useAuth()` + `<Navigate to="/" />` | Same pattern as Dashboard — redirect to landing page, not auth modal (this is a full page, not an action) |
| "All" time range | Calculate days from earliest entry to today | Spec: "total number of days between the earliest entry and today" |
| Heatmap library | Custom CSS Grid (no library) | Spec mandates custom CSS Grid for calendar heatmap |
| Moving average toggle state | Not persisted | Spec: "reset to defaults (30d, toggle off) on each visit" |
| Time range state | Not persisted | Spec: "reset to defaults on each visit" |
| Tooltip implementation | Heatmap: custom div on hover state; Chart: Recharts Tooltip | Heatmap needs custom tooltip since it's CSS Grid, not Recharts |
| Stagger animation | CSS animation-delay on each section | Spec: 100ms delay between sections, `prefers-reduced-motion` → instant |
| Empty state: correlations/scripture | Show encouraging message, no chart/list | Spec: "No bar chart or scripture list rendered — just an encouraging message" |
| Page does NOT use `<Layout>` wrapper | Dark full-page like Dashboard | Dashboard pattern uses `<Navbar>` + `<SiteFooter>` directly, not `<Layout>` (which adds light bg) |

---

## Implementation Steps

### Step 1: Page Shell, Auth Gate, Time Range State

**Objective:** Replace the stub `Insights` page with the auth-gated dark-themed page shell including header, back navigation, and time range pill selector with sticky behavior.

**Files to create/modify:**
- `frontend/src/pages/Insights.tsx` — Full rewrite of existing stub
- `frontend/src/pages/__tests__/Insights.test.tsx` — New test file

**Details:**

The Insights page follows the Dashboard pattern — dark background, `<Navbar transparent />`, no `<Layout>` wrapper.

Page structure:
```tsx
function Insights() {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) return <Navigate to="/" replace />

  const [range, setRange] = useState<TimeRange>('30d')
  // ... render page
}
```

**Page header:**
- Background: `bg-gradient-to-b from-[#1a0533] to-[#0f0a1e] pt-24 pb-6 md:pt-28 md:pb-8` (matching DashboardHero.tsx line 20)
- Title: "Mood Insights" — `font-serif text-2xl text-white/90 md:text-3xl` (matching DashboardHero greeting style)
- Subtitle: "Reflect on your journey" — `text-white/60 text-sm md:text-base mt-1`
- Back link: `← Dashboard` — `text-white/50 hover:text-white/70 text-sm` linking to `/`

**Time range pills:**
- Five options: `30d`, `90d`, `180d`, `1y`, `All`
- Define `type TimeRange = '30d' | '90d' | '180d' | '1y' | 'all'`
- `getRangeDays(range, entries)` utility: `30d→30`, `90d→90`, `180d→180`, `1y→365`, `all→ days from earliest entry to today`
- Pill bar: `role="radiogroup"`, each pill `role="radio"` with `aria-checked`
- Selected: `bg-purple-600 text-white rounded-full px-4 py-2 text-sm font-medium`
- Unselected: `border border-white/20 text-white/60 rounded-full px-4 py-2 text-sm font-medium hover:text-white/80`
- Sticky behavior: Use Intersection Observer on a sentinel element above the pills. When sentinel scrolls out, pills get `fixed top-0` with `bg-[#0f0a1e]/90 backdrop-blur-sm border-b border-white/10 z-40` backdrop
- Keyboard: arrow keys navigate pills, Enter/Space selects
- Layout: `flex gap-2 justify-center`

**Content area:**
- `max-w-5xl mx-auto px-4 sm:px-6`
- `space-y-6 pb-12` between sections
- Dark background: `min-h-screen bg-[#0f0a1e]`

**Page entrance animation:**
- Wrap content sections in a div with `animate-fade-in motion-reduce:animate-none`
- Each section gets `style={{ animationDelay: '${index * 100}ms' }}` for stagger
- Need `opacity-0 animate-[fade-in_400ms_ease-out_forwards]` or use existing `animate-fade-in`

**Auth gating:**
- `useAuth()` check at top of component
- If `!isAuthenticated`, return `<Navigate to="/" replace />`

**Responsive behavior:**
- Desktop (>1024px): `max-w-5xl` centered, pills in a row
- Tablet (640-1024px): Same layout, slightly narrower
- Mobile (<640px): Full width with `px-4`, pills may need `text-xs` and `px-3 py-1.5` to fit all 5

**Guardrails (DO NOT):**
- DO NOT use `<Layout>` wrapper (it adds light background)
- DO NOT persist time range or any page state to localStorage
- DO NOT add any new localStorage keys
- DO NOT write to `wr_mood_entries` (this page is read-only)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| redirects to `/` when not authenticated | integration | Mock `useAuth` to return `{ isAuthenticated: false }`, verify `Navigate` renders |
| renders page title when authenticated | integration | Mock `useAuth` to return authenticated state, verify "Mood Insights" text |
| renders all 5 time range pills | integration | Verify 30d, 90d, 180d, 1y, All pills present |
| 30d is selected by default | integration | Verify 30d pill has `aria-checked="true"` |
| clicking a pill updates selection | integration | Click 90d, verify `aria-checked` switches |
| pills use radiogroup role | unit | Verify `role="radiogroup"` on container, `role="radio"` on each pill |
| keyboard navigation between pills | integration | Arrow key moves focus, Enter selects |
| back link navigates to dashboard | integration | Verify link with `href="/"` text "Dashboard" |
| renders subtitle text | integration | Verify "Reflect on your journey" present |

**Expected state after completion:**
- [ ] `/insights` redirects logged-out users to `/`
- [ ] Authenticated users see dark page with header, time range pills, and empty content area
- [ ] Time range pills are interactive with proper ARIA
- [ ] Sticky behavior works when scrolling
- [ ] Tests pass

---

### Step 2: Calendar Heatmap Section

**Objective:** Build the custom CSS Grid calendar heatmap that visualizes mood entries by day, with day/month labels, tooltips, and horizontal scrolling for large ranges.

**Files to create/modify:**
- `frontend/src/components/insights/CalendarHeatmap.tsx` — New component
- `frontend/src/components/insights/__tests__/CalendarHeatmap.test.tsx` — New test file
- `frontend/src/pages/Insights.tsx` — Import and render CalendarHeatmap

**Details:**

**Data preparation:**
- Read entries from `getMoodEntries()` (from `mood-storage.ts`)
- Build a `Map<string, MoodEntry>` keyed by date string
- Calculate date range: from `(today - rangeDays)` to `today`
- Generate grid data: for each day in range, determine mood value (or null) and day-of-week

**Grid structure:**
- CSS Grid: 7 rows (Mon=0 through Sun=6), columns = number of weeks in range
- `grid-template-rows: repeat(7, 1fr)` with `grid-auto-flow: column`
- Square size: `w-3 h-3` mobile (<640px), `w-4 h-4` desktop, with `gap-1`
- Each square: `rounded-sm` with background color from mood value or `rgba(255, 255, 255, 0.05)` for no data

**Square colors (from MOOD_COLORS):**
- Struggling (1): `#D97706`
- Heavy (2): `#C2703E`
- Okay (3): `#8B7FA8`
- Good (4): `#2DD4BF`
- Thriving (5): `#34D399`
- No check-in: `bg-white/5`

**Day labels:**
- Left side: Mon, Wed, Fri (rows 0, 2, 4 of the grid)
- `text-xs text-white/40` — positioned as the first column or absolutely positioned

**Month labels:**
- Above the grid, aligned to the first week column of each month
- `text-xs text-white/40`
- Calculate which column each month starts in

**Tooltip:**
- Controlled via React state: `hoveredDate: string | null`
- On hover (`onMouseEnter`) / tap (on mobile, use `onClick` to toggle)
- Show: date ("Mon, Mar 10"), mood label ("Good"), text preview (first ~50 chars + ellipsis)
- Styling: `bg-[#1E0B3E] border border-white/15 rounded-lg px-3 py-2 text-sm text-white shadow-lg`
- Position: absolute, above the hovered square (calculate via ref or use CSS positioning)

**Horizontal scroll for large ranges:**
- Container: `overflow-x-auto` when grid width exceeds container
- Fade edges: CSS mask-image with `linear-gradient(to right, transparent, black 40px, black calc(100% - 40px), transparent)` on the scroll container
- 30d (4-5 weeks): fits without scroll
- 90d (13 weeks): may need scroll on mobile
- 180d+ (26+ weeks): definitely scrolls on mobile, may scroll on desktop

**Accessibility:**
- Each square: `aria-label="March 10: Good"` or `"March 10: No check-in"`
- Container: `role="img"` with `aria-label="Mood calendar heatmap for the last {range}"`
- `sr-only` summary: "X days with check-ins out of Y days"

**Empty state:**
- All squares render as `bg-white/5`
- No special overlay needed (grid of empty squares IS the empty state for heatmap)

**Responsive behavior:**
- Desktop (>1024px): 16px squares, most ranges fit without scroll
- Tablet (640-1024px): 16px squares, may scroll for 180d+
- Mobile (<640px): 12px squares, scrolls for ranges > 30d

**Container:**
- Frosted glass card: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 md:p-6`
- Section title: "Your Mood Calendar" — `text-base font-semibold text-white md:text-lg` with Lucide `CalendarDays` icon

**Guardrails (DO NOT):**
- DO NOT use any external heatmap library (cal-heatmap, etc.)
- DO NOT use `<canvas>` — use CSS Grid with `<div>` elements
- DO NOT use `.toISOString()` for date calculations

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| renders correct number of squares for 30d range | unit | 30 days → grid squares present |
| squares colored by mood value | unit | Seed entries, verify background color matches MOOD_COLORS |
| empty days use transparent bg | unit | Days without entries have `bg-white/5` class |
| day labels show Mon, Wed, Fri | unit | Verify 3 day labels present |
| month labels appear | unit | Verify month abbreviations rendered |
| aria-label on each square | unit | Each square has `aria-label` with date and mood |
| sr-only summary text | unit | "X days with check-ins out of Y days" present |
| renders empty state (all transparent squares) when no data | unit | With no entries, all squares are `bg-white/5` |
| tooltip shows on hover/click | integration | Mouse enter on square → tooltip visible with date + mood |
| horizontal scroll enabled for large ranges | unit | For 180d range, container has `overflow-x-auto` |

**Expected state after completion:**
- [ ] Heatmap renders inside frosted glass card on the insights page
- [ ] Squares colored correctly by mood, empty days nearly invisible
- [ ] Day and month labels positioned correctly
- [ ] Tooltips work on hover (desktop) and tap (mobile)
- [ ] Horizontal scrolling works for large ranges
- [ ] Tests pass

---

### Step 3: Mood Trend Line Chart with Moving Average Toggle

**Objective:** Build the expanded line chart section reusing `useMoodChartData(days)` with the selected time range, plus a 7-day moving average toggle.

**Files to create/modify:**
- `frontend/src/components/insights/MoodTrendChart.tsx` — New component
- `frontend/src/components/insights/__tests__/MoodTrendChart.test.tsx` — New test file
- `frontend/src/pages/Insights.tsx` — Import and render MoodTrendChart

**Details:**

**Data:**
- Reuse `useMoodChartData(rangeDays)` with the current time range
- For X-axis formatting: 30d → show every ~5 days, 90d+ → show monthly markers
- Define `formatXAxisTick(dateStr, rangeDays)` to return appropriate label

**Chart:**
- Recharts `<LineChart>` inside `<ResponsiveContainer>`
- Chart height: `h-[220px] sm:h-[250px] lg:h-[280px]`
- Line: `type="monotone"` `stroke="#8B5CF6"` `strokeWidth={2}` `connectNulls={false}`
- Custom dot: Same `CustomDot` pattern as MoodChart — 4px radius, mood-colored fill (`r={4}`)
- Active dot: 6px radius + transparent 22px circle for touch target
- X-axis: `dataKey="date"` with custom `tickFormatter`, `tick={{ fill: 'rgba(255, 255, 255, 0.5)', fontSize: 11 }}`, `axisLine={false}`, `tickLine={false}`
- X-axis interval: Calculate based on range — `Math.floor(rangeDays / 6)` ticks visible
- Y-axis: domain `[1, 5]`, ticks `[1, 2, 3, 4, 5]`, `tickFormatter` returns mood labels, `tick={{ fill: 'rgba(255, 255, 255, 0.5)', fontSize: 12 }}`, `width={80}`, hide on mobile
- Grid: `stroke="rgba(255, 255, 255, 0.05)"`
- Tooltip: Same dark tooltip pattern — show date (full format: "Mon, Mar 10"), mood label, and optional text excerpt (first ~50 chars)

**7-day moving average toggle:**
- State: `const [showAverage, setShowAverage] = useState(false)`
- Toggle button in section header: "7-day average" with a small switch/toggle
- Toggle styling: Small pill button — when off: `text-white/50 border border-white/15 px-3 py-1 rounded-full text-xs`; when on: `bg-purple-600/30 text-white border border-purple-500/30 px-3 py-1 rounded-full text-xs`
- Moving average calculation: For each data point, average the mood values of the 7 days ending at that date. Skip nulls in the window but still compute if at least 1 value exists. If all 7 are null, point is null.
- Moving average line: Second `<Line>` in the chart — `stroke="rgba(139, 92, 246, 0.4)"`, `strokeWidth={2}`, `strokeDasharray="6 3"`, `connectNulls={true}` (interpolated through gaps), `dot={false}`

**Empty state:**
- Same ghosted example pattern as `MoodChart` empty state
- 15% opacity chart with example data, centered overlay text: "Start checking in to see your mood trend"
- Reuse `EMPTY_STATE_DATA` pattern from MoodChart.tsx (but expand to ~14 points for wider chart)

**Accessibility:**
- Container: `role="img"` with `aria-label="Your mood trend over the last {rangeDays} days"`
- `sr-only` summary: "X check-ins over {rangeDays} days. Average mood: {label}."
- Toggle button: `aria-pressed` state

**Container:**
- Frosted glass card, section title: "Mood Over Time" with Lucide `TrendingUp` icon
- Toggle button in header area (right side, next to collapsible chevron area)

**Responsive behavior:**
- Desktop: 280px chart, full Y-axis labels, ~6 X-axis ticks
- Tablet: 250px chart, full Y-axis labels
- Mobile: 220px chart, Y-axis hidden, fewer X-axis ticks

**Guardrails (DO NOT):**
- DO NOT create a new hook for moving average — compute inline in the component or extract to a pure function in the same file
- DO NOT connect the raw data line through nulls (`connectNulls={false}` for raw data)
- DO NOT animate the chart (`isAnimationActive={false}` — consistent with existing MoodChart)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| renders chart when mood data exists | integration | Seed entries, verify `role="img"` container |
| chart height responsive | unit | Verify height classes `h-[220px] sm:h-[250px] lg:h-[280px]` |
| renders empty state when no data | unit | No entries → ghosted chart + overlay text |
| sr-only summary includes check-in count | unit | Verify screen reader text |
| moving average toggle is off by default | unit | Verify `aria-pressed="false"` |
| toggling moving average on renders second line | integration | Click toggle, verify two `<Line>` elements |
| moving average calculation handles nulls | unit | Pure function test with sparse data |
| y-axis hidden on mobile | integration | Mock mobile matchMedia, verify YAxis hide |
| x-axis shows appropriate tick count for range | unit | 30d → ~6 ticks, 90d → fewer ticks |
| tooltip shows date and mood label | unit | Verify tooltip component rendering |

**Expected state after completion:**
- [ ] Line chart renders in frosted glass card with mood-colored dots
- [ ] Moving average toggle shows/hides dashed overlay line
- [ ] Chart reuses `useMoodChartData(rangeDays)` hook
- [ ] Empty state shows ghosted example
- [ ] Tests pass

---

### Step 4: AI Insight Cards

**Objective:** Build the 2-column grid of rotating mock AI insight cards with icon, text, and daily rotation logic.

**Files to create/modify:**
- `frontend/src/components/insights/InsightCards.tsx` — New component
- `frontend/src/components/insights/__tests__/InsightCards.test.tsx` — New test file
- `frontend/src/pages/Insights.tsx` — Import and render InsightCards

**Details:**

**Mock content variants (2-3 per type, rotated by day):**

```typescript
const INSIGHT_VARIANTS = {
  trend: [
    { icon: TrendingUp, title: 'Trend Summary', text: 'Your mood has improved 15% over the last 2 weeks. You\'re on an upward trajectory — keep going!' },
    { icon: TrendingUp, title: 'Trend Summary', text: 'You\'ve been consistent in checking in this month. Showing up is half the battle — well done.' },
    { icon: TrendingUp, title: 'Trend Summary', text: 'Your best days tend to cluster together. Momentum is real — one good day often leads to another.' },
  ],
  correlation: [
    { icon: Activity, title: 'Activity Insight', text: 'You tend to feel better on days you journal. Consider making it a daily practice.' },
    { icon: Activity, title: 'Activity Insight', text: 'Prayer seems to lift your mood. On days you pray, your average mood is one level higher.' },
    { icon: Activity, title: 'Activity Insight', text: 'Meditation and mood go hand in hand for you. Your calmest days often follow a meditation session.' },
  ],
  scripture: [
    { icon: BookOpen, title: 'Scripture Connection', text: 'You found peace in Psalms — it was featured on 4 of your best days. The Psalms seem to speak to your heart.' },
    { icon: BookOpen, title: 'Scripture Connection', text: 'The verses you\'ve seen during Good days share a theme of gratitude. There might be something in that.' },
    { icon: BookOpen, title: 'Scripture Connection', text: 'You responded well to verses about rest and stillness. Sometimes the quietest words carry the most peace.' },
  ],
  weekly: [
    { icon: Calendar, title: 'Weekly Summary', text: 'This week: 5 check-ins, average mood: Good. You showed up consistently — that matters.' },
    { icon: Calendar, title: 'Weekly Summary', text: 'You checked in every day this week. That kind of faithfulness builds something beautiful over time.' },
    { icon: Calendar, title: 'Weekly Summary', text: '4 out of 7 days this week were Good or Thriving. The light is breaking through.' },
  ],
}
```

**Rotation logic:**
- `dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000)`
- Select variant index per type: `dayOfYear % variants.length`
- Show 4 cards (one of each type), rotated daily

**Card styling:**
- `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 md:p-6`
- Icon: Lucide icon in `text-white/60`, 20px (`h-5 w-5`)
- Title: `text-sm font-medium text-white/50 uppercase tracking-wide`
- Text: `text-white/80 text-sm md:text-base mt-2 leading-relaxed`

**Layout:**
- 2-column grid on desktop (>1024px): `grid grid-cols-1 lg:grid-cols-2 gap-4`
- Single column on mobile/tablet

**Disclaimer:**
- Below the card grid: "Insights are illustrative examples. Personalized AI insights coming soon."
- `text-white/40 text-xs text-center mt-4`

**Empty state (no mood entries):**
- Single card spanning full width: "Start checking in to see your insights grow. Each day you share how you're feeling, we'll have more to reflect on together."
- Centered text, encouraging icon (Lightbulb or Sparkles)

**Container:**
- Frosted glass wrapper card NOT needed — the individual insight cards serve as the cards
- Section title: "Insights" with Lucide `Lightbulb` icon — rendered as a heading above the grid, not inside a card
- Title styling: Same as other section titles `flex items-center gap-2 text-base font-semibold text-white md:text-lg mb-4`

**Responsive behavior:**
- Desktop: 2-column grid
- Tablet/Mobile: Single column

**Guardrails (DO NOT):**
- DO NOT make any API calls — all content is hardcoded mock data
- DO NOT use Math.random() for rotation (would change on re-render) — use deterministic dayOfYear
- DO NOT make the text tone clinical or analytical — keep it warm and encouraging

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| renders 4 insight cards with data | unit | Seed mood entries, verify 4 cards render |
| each card has icon, title, and text | unit | All 4 cards have the expected elements |
| rotation changes with different days | unit | Mock Date.now() for two different days, verify different text |
| shows empty state when no entries | unit | No data → single encouraging message |
| disclaimer text present | unit | "Insights are illustrative examples…" visible |
| 2-column grid on desktop class | unit | Verify `lg:grid-cols-2` class present |
| text tone is always encouraging | unit | None of the hardcoded texts contain clinical/negative language |

**Expected state after completion:**
- [ ] 4 insight cards render in grid layout with daily rotation
- [ ] Empty state shows encouraging message
- [ ] Disclaimer visible below cards
- [ ] Tests pass

---

### Step 5: Activity Correlations & Scripture Connections (Placeholders)

**Objective:** Build the mock activity correlation bar chart and scripture connections list as placeholder sections.

**Files to create/modify:**
- `frontend/src/components/insights/ActivityCorrelations.tsx` — New component
- `frontend/src/components/insights/ScriptureConnections.tsx` — New component
- `frontend/src/components/insights/__tests__/ActivityCorrelations.test.tsx` — New test file
- `frontend/src/components/insights/__tests__/ScriptureConnections.test.tsx` — New test file
- `frontend/src/pages/Insights.tsx` — Import and render both components

**Details:**

**Activity Correlations:**
- Recharts `<BarChart>` with `<ResponsiveContainer>`
- Mock data (hardcoded):
  ```typescript
  const MOCK_CORRELATION_DATA = [
    { activity: 'Journaling', withActivity: 4.2, withoutActivity: 3.1 },
    { activity: 'Prayer', withActivity: 4.0, withoutActivity: 3.3 },
    { activity: 'Meditation', withActivity: 4.4, withoutActivity: 3.0 },
  ]
  ```
- Two bars per group: "With activity" in soft teal (`#2DD4BF`), "Without" in muted gray-purple (`#6B6185`)
- Chart height: `h-[200px] sm:h-[240px]`
- Y-axis: domain `[1, 5]`, same mood labels
- X-axis: activity names
- Legend: Simple inline legend above chart — teal dot + "Days with activity", gray dot + "Days without"
- Tooltip: Dark themed, shows activity + both values
- Container: Frosted glass card, title "Activity & Mood" with Lucide `BarChart3` icon
- Disclaimer: "Based on example data. Real correlations coming soon." `text-white/40 text-xs mt-3`

**Empty state (no entries):**
- No chart rendered — single encouraging message: "Check in for a few days to start seeing how your activities connect with your mood."

**Scripture Connections:**
- Simple list within frosted glass card
- Mock data:
  ```typescript
  const MOCK_SCRIPTURE_CONNECTIONS = [
    { reference: 'Psalm 34:18', context: 'Appeared on 3 of your Good days', moodValue: 4 },
    { reference: 'Psalm 46:10', context: 'Your most common verse during Okay moods', moodValue: 3 },
    { reference: 'Psalm 107:1', context: 'Featured on your Thriving days', moodValue: 5 },
    { reference: 'Psalm 55:22', context: 'A comfort during Heavy moments', moodValue: 2 },
  ]
  ```
- Each item: mood color dot (`w-2 h-2 rounded-full` with mood color) + scripture reference in `font-serif text-white` + context in `font-sans text-white/60 text-sm`
- Items: `space-y-4`, each item `flex items-start gap-3`
- Container: Frosted glass card, title "Scriptures That Spoke to You" with Lucide `BookOpen` icon
- Disclaimer: "Based on example data. Personalized connections coming soon." `text-white/40 text-xs mt-3`

**Empty state (no entries):**
- No list rendered — encouraging message: "As you check in and read scripture, we'll start connecting the dots between what you read and how you feel."

**Both components receive `hasData: boolean` prop (derived from mood entries having data).**

**Responsive behavior:**
- Desktop: Both sections full width within `max-w-5xl`
- Mobile: Full width, bar chart may use horizontal bars for better readability (or keep vertical with smaller font)

**Guardrails (DO NOT):**
- DO NOT compute real correlations — all data is hardcoded mock
- DO NOT use Recharts PieChart or other chart types — spec says BarChart
- DO NOT make scripture references linkable (no routes for individual verses in this spec)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| ActivityCorrelations renders bar chart with data | unit | hasData=true, verify chart container present |
| ActivityCorrelations shows empty state | unit | hasData=false, verify encouraging message |
| ActivityCorrelations disclaimer visible | unit | "Based on example data..." text present |
| ScriptureConnections renders list items | unit | hasData=true, verify 4 scripture items |
| ScriptureConnections uses serif font for references | unit | Verify `font-serif` class on reference text |
| ScriptureConnections shows mood color dots | unit | Verify colored dots with correct colors |
| ScriptureConnections shows empty state | unit | hasData=false, verify encouraging message |
| ScriptureConnections disclaimer visible | unit | "Based on example data..." text present |

**Expected state after completion:**
- [ ] Activity correlation bar chart renders with mock data
- [ ] Scripture connections list renders with mock data and mood-colored dots
- [ ] Both sections have disclaimers and empty states
- [ ] Tests pass

---

### Step 6: Page Integration, Animations & Final Polish

**Objective:** Wire all 5 sections together in the Insights page, add stagger animations, `prefers-reduced-motion` support, and ensure responsive behavior works end-to-end.

**Files to create/modify:**
- `frontend/src/pages/Insights.tsx` — Final integration of all sections
- `frontend/src/pages/__tests__/Insights.test.tsx` — Expand tests for full page integration

**Details:**

**Section order (all receive `rangeDays` prop):**
1. CalendarHeatmap
2. MoodTrendChart
3. InsightCards
4. ActivityCorrelations
5. ScriptureConnections

**Data flow:**
```tsx
const entries = getMoodEntries()
const hasData = entries.length > 0
const rangeDays = getRangeDays(range, entries)

// Pass rangeDays to heatmap and chart
// Pass hasData to insight cards, correlations, scripture connections
```

**Stagger animation:**
- Each section wrapper gets: `opacity-0 animate-[fadeInUp_400ms_ease-out_forwards]`
- Delay: section index × 100ms via `style={{ animationDelay: '${index * 100}ms' }}`
- Define `@keyframes fadeInUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }` in tailwind config or as inline style
- `prefers-reduced-motion`: wrap in `motion-safe:` prefix or check `window.matchMedia('(prefers-reduced-motion: reduce)')` and skip animation classes

**Heatmap square hover animation:**
- `hover:brightness-125` on each square (no scale)
- `motion-reduce:hover:brightness-100`

**Time range pill selection animation:**
- `transition-colors duration-150 motion-reduce:transition-none`

**Full page `prefers-reduced-motion`:**
- No stagger delays
- No fade-in animations — content renders immediately
- No transitions on pills, squares, or chart dots
- Test: verify no `animate-` classes when reduced motion is preferred

**Final responsive checks:**
- Mobile scroll behavior on heatmap
- Time pills fit on small screens
- Charts resize via ResponsiveContainer
- Touch targets on all interactive elements (pills, heatmap squares, toggle) ≥ 44px

**Guardrails (DO NOT):**
- DO NOT add any features not in the spec
- DO NOT add loading spinners (localStorage reads are synchronous)
- DO NOT add real-time localStorage event listeners (page reads on mount, time range change recalculates)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| all 5 sections render in correct order | integration | Verify section order: heatmap, chart, insights, correlations, scripture |
| time range change updates all sections | integration | Click 90d, verify all sections re-render with new range |
| reduced motion: no animation classes | integration | Mock matchMedia for reduced motion, verify no stagger delays |
| all sections show empty states when no data | integration | No mood entries → all sections in empty state |
| page scrolls smoothly with all sections | integration | Render full page, verify no overflow issues |
| DevAuthToggle visible in dev mode | integration | Verify dev toggle renders when `import.meta.env.DEV` |

**Expected state after completion:**
- [ ] All 5 sections render in order within frosted glass cards
- [ ] Time range changes update all visualizations
- [ ] Stagger animation on page load
- [ ] `prefers-reduced-motion` honored
- [ ] All tests pass (Step 1-6)
- [ ] Page is fully functional and matches spec

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Page shell, auth gate, time range pills |
| 2 | 1 | Calendar heatmap section |
| 3 | 1 | Mood trend line chart with moving average |
| 4 | 1 | AI insight cards |
| 5 | 1 | Activity correlations & scripture connections |
| 6 | 1, 2, 3, 4, 5 | Integration, animations, final polish |

Steps 2, 3, 4, 5 are independent of each other and only depend on Step 1.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Page shell, auth, time range | [COMPLETE] | 2026-03-16 | Rewrote `Insights.tsx` with auth gate, dark theme, header, back link, time range pills (radiogroup + keyboard nav), sticky pills via IntersectionObserver. 9 tests pass. |
| 2 | Calendar heatmap | [COMPLETE] | 2026-03-16 | Created `CalendarHeatmap.tsx` with CSS Grid, mood-colored squares, day/month labels, tooltip on hover, horizontal scroll for large ranges, sr-only summary. 10 tests pass. |
| 3 | Line chart + moving average | [COMPLETE] | 2026-03-16 | Created `MoodTrendChart.tsx` with Recharts LineChart, mood-colored dots, 7-day moving average toggle, empty state, responsive sizing, dark tooltip. Exported `computeMovingAverage` for testing. 9 tests pass. |
| 4 | AI insight cards | [COMPLETE] | 2026-03-16 | Created `InsightCards.tsx` with 4 daily-rotating mock insight cards (trend, correlation, scripture, weekly), empty state, disclaimer, 2-col grid. 7 tests pass. |
| 5 | Correlations + scripture | [COMPLETE] | 2026-03-16 | Created `ActivityCorrelations.tsx` (BarChart with mock data, legend, disclaimer, empty state) and `ScriptureConnections.tsx` (list with mood-colored dots, serif references, disclaimer, empty state). 10 tests pass. |
| 6 | Integration + animations | [COMPLETE] | 2026-03-16 | Wired all 5 sections with `AnimatedSection` wrapper (stagger 100ms per section), `motion-reduce:animate-none` + `motion-reduce:opacity-100`. Full page integration tests added (13 total in Insights.test.tsx). 49 tests pass across 6 files. Visual verification at desktop/mobile/empty state. |
