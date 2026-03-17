# Implementation Plan: Mood Insights Dashboard Widget

**Spec:** `_specs/mood-insights-widget.md`
**Date:** 2026-03-16
**Branch:** `claude/feature/mood-insights-widget`
**Design System Reference:** `_plans/recon/design-system.md` (loaded — captured 2026-03-06)
**Recon Report:** not applicable (widget is a new pattern, no external page to recon)
**Master Spec Plan:** `dashboard-growth-spec-plan-v2.md` (loaded — Spec 3 of 16)

---

## Architecture Context

### Relevant Existing Files and Patterns

**Dashboard shell (built in Spec 2):**
- `frontend/src/pages/Dashboard.tsx` — Main dashboard page. Renders `DashboardHero` + `DashboardWidgetGrid`. Auth-gated via `useAuth()`.
- `frontend/src/components/dashboard/DashboardWidgetGrid.tsx` — 5-card grid layout. Mood chart card is `id="mood-chart"` with `<Placeholder text="Coming in Spec 3" />` — this is what we replace.
- `frontend/src/components/dashboard/DashboardCard.tsx` — Reusable frosted glass card. Props: `id`, `title`, `icon`, `collapsible`, `defaultCollapsed`, `action`, `children`, `className`.

**Mood data layer (built in Spec 1):**
- `frontend/src/types/dashboard.ts` — `MoodEntry`, `MoodValue`, `MoodLabel` types
- `frontend/src/constants/dashboard/mood.ts` — `MOOD_COLORS` (Record<MoodValue, string>), `MOOD_OPTIONS` (includes labels, colors, verses), `MAX_MOOD_ENTRIES`
- `frontend/src/services/mood-storage.ts` — `getMoodEntries()`, `hasCheckedInToday()`, `saveMoodEntry()`. Key: `wr_mood_entries`.
- `frontend/src/utils/date.ts` — `getLocalDateString()`, `getYesterdayDateString()`, `getCurrentWeekStart()`

**Auth context:**
- `frontend/src/contexts/AuthContext.tsx` — `AuthProvider`, `useAuth()`. Simulated auth via localStorage (`wr_auth_simulated`, `wr_user_name`).

**Test patterns:**
- Dashboard tests wrap in: `MemoryRouter > ToastProvider > AuthModalProvider > Component`
- Auth mocked via `vi.mock('@/hooks/useAuth', ...)`
- localStorage seeded via `localStorage.setItem('wr_mood_entries', JSON.stringify([...]))`
- `vi.useFakeTimers()` for time-dependent tests
- `fireEvent` and `userEvent` for interactions

**Provider wrapping order (App.tsx):**
```
QueryClientProvider → BrowserRouter → AuthProvider → ToastProvider → AuthModalProvider → AudioProvider → Routes
```

**Component directory convention:** Dashboard components in `frontend/src/components/dashboard/`.
**Hook directory convention:** `frontend/src/hooks/`.

### Cross-Spec Dependencies

- **Consumes from Spec 1:** `MoodEntry` type, `getMoodEntries()` service, `MOOD_COLORS` constant, `getLocalDateString()` utility
- **Consumes from Spec 2:** `DashboardCard` component, `DashboardWidgetGrid` layout, dashboard grid ordering
- **Produces for Spec 4:** `useMoodChartData(days)` hook — Spec 4's `/insights` page will call `useMoodChartData(30)`, `useMoodChartData(90)`, etc.
- **No new localStorage keys** introduced by this spec

---

## Auth Gating Checklist

**The dashboard is already auth-gated at the route level** (`/` renders Dashboard only when `isAuthenticated`). This widget lives inside the dashboard — no additional auth gates needed.

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| View mood chart | Only visible when authenticated (dashboard is auth-gated) | N/A — inherited | Route-level: `isAuthenticated ? <Dashboard /> : <Home />` |
| Hover/tap dot tooltip | Only visible on dashboard | N/A — inherited | Same route-level gate |
| "See More" link | Already on DashboardCard in Spec 2 | N/A — inherited | Same route-level gate |

No new auth gates required. The widget is display-only within an already auth-gated page.

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Dashboard root | background | `bg-[#0f0a1e]` | `pages/Dashboard.tsx` |
| DashboardCard | box model | `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 md:p-6` | `DashboardCard.tsx` |
| Chart line stroke | color | `#8B5CF6` (`primary-lt`) | `09-design-system.md` |
| Mood dot (Struggling) | fill | `#D97706` | `constants/dashboard/mood.ts` |
| Mood dot (Heavy) | fill | `#C2703E` | `constants/dashboard/mood.ts` |
| Mood dot (Okay) | fill | `#8B7FA8` | `constants/dashboard/mood.ts` |
| Mood dot (Good) | fill | `#2DD4BF` | `constants/dashboard/mood.ts` |
| Mood dot (Thriving) | fill | `#34D399` | `constants/dashboard/mood.ts` |
| Grid lines | stroke | `rgba(255, 255, 255, 0.05)` | Spec (new pattern) |
| Axis labels | fill | `rgba(255, 255, 255, 0.5)` | Spec (matches `text-white/50` from footer muted in design-system.md) |
| Axis labels | font-size | `12px` | Spec |
| Tooltip | background | `#1E0B3E` (`hero-mid`) | `design-system.md` |
| Tooltip | border | `border border-white/15` (i.e., `rgba(255, 255, 255, 0.15)`) | Spec, matches navbar dropdown pattern |
| Tooltip | text | `text-white`, `text-sm` | Spec |
| Tooltip | corners | `rounded-lg` | Spec |
| Tooltip | padding | `px-3 py-2` | Spec |
| Empty state text | styling | `text-white/50 text-sm font-sans` | Spec |
| Placeholder content | text style | `text-sm italic text-white/30` | `DashboardWidgetGrid.tsx` line 7 |

---

## Design System Reminder

**Project-specific quirks displayed before every UI step:**

- Dashboard uses frosted glass cards: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`
- Mood colors: Struggling=#D97706, Heavy=#C2703E, Okay=#8B7FA8, Good=#2DD4BF, Thriving=#34D399
- Dashboard root background: `bg-[#0f0a1e]` — chart background must be transparent
- Chart line uses `#8B5CF6` (primary-lt), NOT `#6D28D9` (primary)
- Tooltip styling matches navbar dropdown: `bg-hero-mid` (#1E0B3E), `border-white/15`, white text
- Inter font (`font-sans`) for all UI text — Lora/Caveat not used in dashboard data viz
- `prefers-reduced-motion`: dot hover expansion is instant (no CSS transition)
- Touch targets: minimum 44px (Recharts activeDot with larger radius)
- DashboardCard already provides the "See More" link via `action` prop — do not duplicate

---

## Shared Data Models (from Master Plan)

```typescript
// From types/dashboard.ts (Spec 1, already built)
export type MoodValue = 1 | 2 | 3 | 4 | 5;
export type MoodLabel = 'Struggling' | 'Heavy' | 'Okay' | 'Good' | 'Thriving';

export interface MoodEntry {
  id: string;
  date: string;       // YYYY-MM-DD (local time)
  mood: MoodValue;
  moodLabel: MoodLabel;
  text?: string;
  timestamp: number;
  verseSeen: string;
}
```

**localStorage keys this spec touches:**
| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_mood_entries` | Read | Daily mood entries array (owned by Spec 1) |

No new localStorage keys introduced.

---

## Responsive Structure

**Breakpoints and layout behavior:**

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | < 640px | Single column, chart fills card width, chart height ~160px, y-axis labels abbreviated or hidden |
| Tablet | 640px–1024px | Single column (still stacked), chart height ~180px, full axis labels |
| Desktop | > 1024px | 2-column grid (`lg:grid-cols-5`), mood chart spans `lg:col-span-3` (left column, ~60%), height ~180px |

The chart uses `<ResponsiveContainer width="100%" height={...}>` to fill the DashboardCard content area. The card itself handles responsive padding (`p-4 md:p-6`).

---

## Vertical Rhythm

**Not applicable** — this widget lives inside an existing DashboardCard within the DashboardWidgetGrid. No new sections or inter-section gaps are introduced. The grid gap is already defined: `gap-4 md:gap-6`.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] Spec 1 (Mood Check-In) is complete and committed — provides `MoodEntry`, `getMoodEntries()`, `MOOD_COLORS`, `getLocalDateString()`
- [x] Spec 2 (Dashboard Shell) is complete and committed — provides `DashboardCard`, `DashboardWidgetGrid` with "Coming in Spec 3" placeholder
- [ ] `recharts` is not yet installed — Step 1 will add it
- [x] All auth-gated actions from the spec are accounted for (dashboard is auth-gated at route level, no additional gates needed)
- [x] Design system values are verified (from `_plans/recon/design-system.md` + `constants/dashboard/mood.ts`)
- [x] All [UNVERIFIED] values are flagged with verification methods
- [x] Prior specs in the sequence are complete and committed (Specs 1 & 2)

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Chart height: fixed vs responsive | Fixed per breakpoint (160px mobile, 180px desktop) via Tailwind `h-[160px] sm:h-[180px]` on ResponsiveContainer wrapper | Simpler than dynamic calculation; matches spec exactly |
| Y-axis label format on mobile | Hide y-axis labels entirely below 640px, rely on colored dots for context | Abbreviated labels ("Str", "Hvy") are awkward; the colored dots are self-explanatory per spec |
| Empty state approach | Same Recharts components with 15% opacity + overlay text | Keeps rendering consistent; ghosted chart is purely decorative |
| Null value handling | `connectNulls={false}`, custom dot renderer skips null values | Spec explicitly requires gaps for missing days, not interpolation |
| Tooltip position on mobile | Top of dot (default Recharts behavior works) | Avoids thumb occlusion per spec |
| Custom dot renderer | `renderDot` function that reads mood color from data point | Recharts default dots don't support per-point colors; custom renderer needed |
| Hook re-renders | `useMemo` with dependency on a stringified snapshot of relevant entries | Avoids unnecessary Recharts re-renders while staying fresh on mount |

---

## Implementation Steps

### Step 1: Install Recharts Dependency

**Objective:** Add `recharts` to the project's frontend dependencies.

**Files to create/modify:**
- `frontend/package.json` — New dependency added

**Details:**
Run `pnpm add recharts` in the `frontend/` directory. Verify installation by checking `package.json` includes `recharts` and `pnpm-lock.yaml` is updated.

**Guardrails (DO NOT):**
- Do NOT install any other dependencies (no `d3`, no `victory`, no `chart.js`)
- Do NOT install `@types/recharts` — Recharts ships its own TypeScript types

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| N/A | — | No tests for dependency installation; verified by import in subsequent steps |

**Expected state after completion:**
- [x] `recharts` appears in `frontend/package.json` under `dependencies`
- [x] `pnpm-lock.yaml` updated
- [x] `pnpm install` completes without errors

---

### Step 2: Create `useMoodChartData` Hook

**Objective:** Create a reusable hook that transforms raw `wr_mood_entries` localStorage data into chart-ready data points for any number of days.

**Files to create/modify:**
- `frontend/src/hooks/useMoodChartData.ts` — New file

**Details:**

```typescript
import { useMemo } from 'react';
import { getMoodEntries } from '@/services/mood-storage';
import { MOOD_COLORS } from '@/constants/dashboard/mood';
import { MOOD_OPTIONS } from '@/constants/dashboard/mood';
import { getLocalDateString } from '@/utils/date';
import type { MoodValue, MoodLabel } from '@/types/dashboard';

export interface MoodChartDataPoint {
  date: string;           // YYYY-MM-DD
  dayLabel: string;       // "Mon", "Tue", etc.
  mood: number | null;    // 1-5 or null
  moodLabel: MoodLabel | null;
  color: string | null;   // Hex color or null
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function useMoodChartData(days: number = 7): MoodChartDataPoint[] {
  const entries = getMoodEntries();

  return useMemo(() => {
    // Build a map of date → MoodEntry for O(1) lookup
    const entryMap = new Map(entries.map(e => [e.date, e]));

    const result: MoodChartDataPoint[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = getLocalDateString(d);
      const dayOfWeek = d.getDay();
      const entry = entryMap.get(dateStr);

      result.push({
        date: dateStr,
        dayLabel: DAY_LABELS[dayOfWeek],
        mood: entry ? entry.mood : null,
        moodLabel: entry ? entry.moodLabel : null,
        color: entry ? MOOD_COLORS[entry.mood as MoodValue] : null,
      });
    }

    return result;
  }, [entries, days]);
}
```

Key design decisions:
- Reads from `getMoodEntries()` on every render (localStorage is fast; ensures fresh data after check-in)
- `useMemo` prevents recomputation if entries haven't changed (referential equality on `entries` array)
- Returns chronological order (oldest first) as spec requires
- Days without entries return `null` for mood/moodLabel/color — chart renders gaps
- Uses `getLocalDateString()` for timezone-correct date generation (never UTC)
- `DAY_LABELS` array uses JavaScript's `getDay()` index (0=Sun) for abbreviated day names
- Reusable: Spec 4 will call `useMoodChartData(30)`, `useMoodChartData(90)`, etc.

**Guardrails (DO NOT):**
- Do NOT use `new Date().toISOString().split('T')[0]` — returns UTC, not local time
- Do NOT interpolate or fill in missing days with fake mood values — spec requires honest gaps
- Do NOT introduce new localStorage keys — this hook reads only from `wr_mood_entries`
- Do NOT add a `useEffect` that writes to state — the hook is synchronous read + useMemo

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| returns exactly `days` data points | unit | Default 7 returns 7 items; `useMoodChartData(30)` returns 30 |
| data points ordered chronologically (oldest first) | unit | First item's date is `days-1` days ago, last is today |
| matches mood entries by date string | unit | Seed 3 entries, verify those dates have mood values |
| days without entries return null mood/label/color | unit | Seed 2 entries, verify other 5 dates have null |
| dayLabel matches calendar day name | unit | Verify "Mon", "Tue", etc. correspond to correct dates |
| handles empty localStorage (no key) | unit | Returns 7 items all with null mood |
| handles corrupted localStorage JSON | unit | Set `wr_mood_entries` to invalid JSON, returns all-null |
| handles non-array localStorage value | unit | Set to `"string"` or `{}`, returns all-null |
| uses local timezone (not UTC) | unit | Mock Date to 11pm EST, verify "today" matches local date |
| color matches MOOD_COLORS constant | unit | Seed entry with mood=4, verify color is `#2DD4BF` |

**Expected state after completion:**
- [x] `useMoodChartData` hook exists and is importable
- [x] Returns correct data structure with `date`, `dayLabel`, `mood`, `moodLabel`, `color` fields
- [x] All 10 tests pass

---

### Step 3: Create `MoodChart` Component

**Objective:** Build the 7-day mood line chart component with custom tooltip, mood-colored dots, dark theme styling, and empty state.

**Files to create/modify:**
- `frontend/src/components/dashboard/MoodChart.tsx` — New file

**Details:**

The component is self-contained. It calls `useMoodChartData(7)` internally and renders the chart or empty state.

**Component structure:**
```tsx
export function MoodChart() {
  const data = useMoodChartData(7);
  const hasData = data.some(d => d.mood !== null);

  if (!hasData) {
    return <MoodChartEmptyState />;
  }

  return (
    <div>
      {/* Accessible summary (sr-only) */}
      <p className="sr-only">
        Over the last 7 days, you checked in {checkedInCount} times.
        Average mood: {averageMoodLabel}.
      </p>

      {/* Chart */}
      <div aria-label="Your mood over the last 7 days" role="img" className="h-[160px] sm:h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -15 }}>
            <CartesianGrid stroke="rgba(255, 255, 255, 0.05)" strokeDasharray="" />
            <XAxis
              dataKey="dayLabel"
              tick={{ fill: 'rgba(255, 255, 255, 0.5)', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[1, 5]}
              ticks={[1, 2, 3, 4, 5]}
              tickFormatter={formatMoodLabel}  // "Struggling", "Heavy", etc.
              tick={{ fill: 'rgba(255, 255, 255, 0.5)', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              hide={/* true below sm breakpoint */}
              width={80}
            />
            <Tooltip content={<MoodTooltip />} />
            <Line
              type="monotone"
              dataKey="mood"
              stroke="#8B5CF6"
              strokeWidth={2}
              connectNulls={false}
              dot={<CustomDot />}
              activeDot={<CustomActiveDot />}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
```

**Custom Dot Renderer (`CustomDot`):**
- Reads `color` from the data point payload
- Renders an SVG `<circle>` with `r={5}` and `fill={color}`
- Skips rendering (returns null) when `mood` is null
- Has `className="transition-transform duration-150 motion-reduce:transition-none"` for hover expansion

**Custom Active Dot Renderer (`CustomActiveDot`):**
- Same as CustomDot but with `r={7}` (expanded on hover)
- Adds a subtle glow filter or opacity ring
- Touch target: renders an invisible larger circle (`r={22}`, `fill="transparent"`) behind the visible dot for 44px touch area

**Custom Tooltip (`MoodTooltip`):**
- Only renders when payload exists and mood is not null
- Formats date as "Mon, Mar 10" using the data point's `date` field
- Shows mood label (e.g., "Good")
- Styling: `bg-[#1E0B3E] border border-white/15 rounded-lg px-3 py-2 text-sm text-white shadow-lg`

**Y-axis label formatter:**
```typescript
const MOOD_LABELS: Record<number, string> = {
  1: 'Struggling', 2: 'Heavy', 3: 'Okay', 4: 'Good', 5: 'Thriving'
};
function formatMoodLabel(value: number): string {
  return MOOD_LABELS[value] ?? '';
}
```

**Y-axis responsive behavior:**
- On mobile (< 640px): Hide y-axis labels (`hide` prop on `<YAxis>`) — colored dots provide context
- Detect via a simple state: `const [isMobile, setIsMobile] = useState(window.innerWidth < 640)` with a resize listener, or use the container width from ResponsiveContainer
- On tablet/desktop: Show full mood labels

**Empty State (`MoodChartEmptyState`):**
- Renders a decorative Recharts chart at 15% opacity with fake data: `[3, 4, 2, 5, 3, 4, 5]` (varied heights)
- All elements (line, dots, grid, axes) have `opacity: 0.15` via a wrapping `<div className="opacity-[0.15]">`
- Overlay text centered absolutely: "Your mood journey starts today" in `text-white/50 text-sm font-sans`
- The "See More" link still renders via the parent `DashboardCard`'s `action` prop (not duplicated here)

**Accessible summary:**
- Hidden `<p className="sr-only">` above the chart
- Text: "Over the last 7 days, you checked in N times. Average mood: [Label]."
- Average mood label computed from non-null entries (round to nearest integer, map to label)

**`prefers-reduced-motion`:**
- Dot hover transition: `motion-reduce:transition-none` (instant expansion)
- No chart entrance animation (chart appears immediately; fade-in is from DashboardCard parent)

**Responsive behavior:**
- Desktop (> 1024px): Chart fills left-column DashboardCard (~60% of grid = `lg:col-span-3`), height 180px, full y-axis labels, full x-axis day abbreviations
- Tablet (640-1024px): Chart fills card width (single column), height 180px, full labels
- Mobile (< 640px): Chart fills card width, height 160px, y-axis labels hidden, x-axis 3-letter day abbreviations visible

**Guardrails (DO NOT):**
- Do NOT use `dangerouslySetInnerHTML` — all content is plain text
- Do NOT add animations beyond dot hover expansion — spec says "no chart animations/transitions on data change"
- Do NOT add a separate "See More" link inside MoodChart — the DashboardCard's `action` prop already renders it
- Do NOT interpolate missing days — `connectNulls={false}` is mandatory
- Do NOT use Recharts default tooltip styling — custom `MoodTooltip` component required
- Do NOT hardcode mood colors in the component — import from `MOOD_COLORS` constant

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| renders chart when mood data exists | integration | Seed 3 entries, verify `<LineChart>` renders |
| renders empty state when no mood data | integration | Empty localStorage, verify "Your mood journey starts today" text |
| renders empty state when localStorage key missing | integration | No key set, verify empty state |
| renders empty state when localStorage corrupted | integration | Invalid JSON, verify empty state |
| ghosted chart in empty state has 15% opacity | integration | Verify opacity wrapper element |
| custom dots use correct mood colors | integration | Seed entries with different moods, verify dot fill colors |
| null days render no dots | integration | Seed 3 of 7 days, verify only 3 dots render |
| custom tooltip shows date and mood label | integration | Hover simulation, verify tooltip content format |
| tooltip does not render for null entries | integration | Verify no tooltip on gap positions |
| accessible sr-only summary text present | integration | Verify sr-only element with check-in count and average mood |
| aria-label on chart container | integration | Verify "Your mood over the last 7 days" |
| y-axis shows mood labels on desktop | integration | Set viewport to 1024px+, verify mood name labels |
| responsive: chart height 160px on mobile | integration | Set viewport to 375px, verify height |
| responsive: chart height 180px on tablet/desktop | integration | Set viewport to 768px+, verify height |
| `prefers-reduced-motion` disables dot transitions | unit | Verify `motion-reduce:transition-none` class on dots |

**Expected state after completion:**
- [x] `MoodChart` component exists and renders correctly
- [x] Empty state renders with ghosted chart + overlay text
- [x] Custom tooltip renders with correct styling
- [x] Custom dots use mood-specific colors
- [x] All 15 tests pass

---

### Step 4: Integrate MoodChart into DashboardWidgetGrid

**Objective:** Replace the "Coming in Spec 3" placeholder in the mood chart card with the actual `MoodChart` component.

**Files to create/modify:**
- `frontend/src/components/dashboard/DashboardWidgetGrid.tsx` — Replace placeholder

**Details:**

Change:
```tsx
<DashboardCard
  id="mood-chart"
  title="7-Day Mood"
  icon={<TrendingUp className="h-5 w-5" />}
  action={{ label: 'See More', to: '/insights' }}
  className="order-2 lg:order-1 lg:col-span-3"
>
  <Placeholder text="Coming in Spec 3" />
</DashboardCard>
```

To:
```tsx
<DashboardCard
  id="mood-chart"
  title="7-Day Mood"
  icon={<TrendingUp className="h-5 w-5" />}
  action={{ label: 'See More', to: '/insights' }}
  className="order-2 lg:order-1 lg:col-span-3"
>
  <MoodChart />
</DashboardCard>
```

Add import: `import { MoodChart } from './MoodChart'`

Remove the `Placeholder` function if it is no longer used by any card in this file. (Check: it's still used by Streak, Activity, and Friends cards — keep it.)

**Guardrails (DO NOT):**
- Do NOT change the DashboardCard's `id`, `title`, `icon`, `action`, or `className` props — they are correct as-is
- Do NOT change the grid ordering of any other cards
- Do NOT remove the `Placeholder` function (still used by other cards)
- Do NOT modify `DashboardCard.tsx` — no changes needed there

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| mood chart card no longer shows "Coming in Spec 3" | integration | Render DashboardWidgetGrid, verify placeholder text is gone |
| mood chart card renders MoodChart component | integration | Verify chart or empty state renders inside the mood-chart card |
| "See More" link still present in card header | integration | Verify link to `/insights` |
| other placeholder cards unchanged | integration | Verify "Coming in Spec 6" and "Coming in Spec 9" still render |

**Expected state after completion:**
- [x] "Coming in Spec 3" placeholder is gone
- [x] `MoodChart` component renders inside the mood chart DashboardCard
- [x] All existing dashboard tests still pass
- [x] All 4 new tests pass

---

### Step 5: Update Existing Dashboard Tests

**Objective:** Update any existing tests that assert on the "Coming in Spec 3" placeholder text, and add integration tests that verify the full Dashboard → MoodChart rendering path.

**Files to create/modify:**
- `frontend/src/__tests__/Dashboard.test.tsx` — Update placeholder assertions
- `frontend/src/__tests__/DashboardWidgetGrid.test.tsx` — Update if exists
- `frontend/src/__tests__/MoodChart.test.tsx` — Already created in Step 3 (verify)
- `frontend/src/__tests__/useMoodChartData.test.ts` — Already created in Step 2 (verify)

**Details:**

1. **Find and update any tests asserting `"Coming in Spec 3"`** — these should now assert that the MoodChart renders (e.g., look for the aria-label "Your mood over the last 7 days" or the empty state text "Your mood journey starts today").

2. **Add integration test:** Full Dashboard page with seeded mood data renders the chart inside the mood card.

3. **Add integration test:** Full Dashboard page with empty mood data renders the empty state.

**Guardrails (DO NOT):**
- Do NOT delete existing test coverage — update assertions to match new behavior
- Do NOT change auth mocking patterns — keep using `vi.mock('@/hooks/useAuth', ...)`
- Do NOT add tests for DashboardCard behavior (already covered in Spec 2 tests)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Dashboard renders mood chart with seeded data | integration | Seed mood entries, render Dashboard, verify chart renders |
| Dashboard renders mood chart empty state when no data | integration | Empty localStorage, render Dashboard, verify empty state text |

**Expected state after completion:**
- [x] No test references "Coming in Spec 3" (all updated)
- [x] Full Dashboard integration tests pass with mood chart
- [x] All existing Dashboard tests still pass (no regressions)
- [x] Total test count: ~10 (hook) + ~15 (component) + ~4 (integration) + ~2 (dashboard) = ~31 new/updated tests

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Install recharts dependency |
| 2 | 1 | Create `useMoodChartData` hook (imports recharts types not needed, but dependency must be installed for subsequent steps) |
| 3 | 1, 2 | Create `MoodChart` component (uses recharts components + hook) |
| 4 | 3 | Integrate MoodChart into DashboardWidgetGrid (replaces placeholder) |
| 5 | 3, 4 | Update existing tests and add integration tests |

Note: Steps 2 and 3 could theoretically run in parallel since the hook doesn't import from recharts, but Step 3 depends on Step 2's hook. Steps 4 and 5 are sequential.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Install Recharts Dependency | [COMPLETE] | 2026-03-16 | `recharts@3.8.0` added to frontend/package.json |
| 2 | Create `useMoodChartData` Hook | [COMPLETE] | 2026-03-16 | Created `frontend/src/hooks/useMoodChartData.ts` + `frontend/src/hooks/__tests__/useMoodChartData.test.ts` (10 tests) |
| 3 | Create `MoodChart` Component | [COMPLETE] | 2026-03-16 | Created `frontend/src/components/dashboard/MoodChart.tsx` + `frontend/src/components/dashboard/__tests__/MoodChart.test.tsx` (15 tests). Visual verification deferred to Step 4 integration. |
| 4 | Integrate into DashboardWidgetGrid | [COMPLETE] | 2026-03-16 | Replaced `<Placeholder text="Coming in Spec 3" />` with `<MoodChart />` in `DashboardWidgetGrid.tsx`. Visual verification passed at 1440/768/375px. Existing test `placeholder text shows spec references` expected to fail — updated in Step 5. |
| 5 | Update Existing Tests | [COMPLETE] | 2026-03-16 | Updated `DashboardWidgetGrid.test.tsx` (removed "Coming in Spec 3" assertion, added 4 new tests). Added 2 integration tests to `Dashboard.test.tsx`. Added ResizeObserver mock to Dashboard test files. All 1119 tests pass. |
