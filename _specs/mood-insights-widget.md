# Feature: Mood Insights Dashboard Widget

**Master Plan Reference:** `dashboard-growth-spec-plan-v2.md`
- Shared data models: See "localStorage Key Summary" section — this spec reads `wr_mood_entries` (owned by Spec 1)
- Cross-spec dependencies: Spec 1 (Mood Check-In) creates the mood data this widget visualizes; Spec 2 (Dashboard Shell) provides the `DashboardCard` container and placeholder this widget replaces; Spec 4 (`/insights` Full Page) reuses the `useMoodChartData` hook created here with larger `days` parameter
- Shared constants: Mood colors from Spec 1 / `09-design-system.md` Mood Color Palette; `MoodEntry` type from Spec 1

---

## Overview

The Mood Insights Dashboard Widget is a 7-day mood line chart that lives inside the "7-Day Mood Chart" `DashboardCard` on the logged-in user's dashboard. It replaces the "Coming in Spec 3" placeholder text delivered by Spec 2.

This widget gives users an at-a-glance visual of their emotional journey over the past week. Each data point is a colored dot representing the mood level for that day, connected by a smooth purple line. Missing days appear as gaps — the chart never interpolates or fakes data, honoring the user's actual experience.

The widget introduces **Recharts** as a new project dependency for React-native charting, and creates a reusable `useMoodChartData(days)` hook that the `/insights` page (Spec 4) will consume with larger time ranges.

This small, focused visualization serves the app's mission by giving users a gentle mirror of their emotional patterns — not to judge, but to encourage reflection and awareness of how God is moving in their lives.

---

## User Stories

- As a **logged-in user**, I want to see a 7-day mood chart on my dashboard so that I can quickly visualize my recent emotional journey.
- As a **logged-in user**, I want each day's dot to reflect my actual mood color so that the chart feels personal and intuitive.
- As a **logged-in user**, I want to tap a dot and see the date and mood label so that I can recall what I was feeling that day.
- As a **logged-in user** who is new, I want to see a gentle empty state with an example chart so that I understand what the widget will show once I start checking in.
- As a **logged-in user**, I want a "See More" link that takes me to a full insights page so that I can explore my mood data in more depth.

---

## Requirements

### New Dependency: Recharts

- Install `recharts` as a project dependency (npm/pnpm)
- Recharts (~45KB gzipped) provides React-native charting components built on D3
- Chosen for its React-idiomatic API and excellent dark theme customization support

### Chart Specifications

- **Chart type**: `<LineChart>` from Recharts with `<ResponsiveContainer>` wrapper for fluid width
- **Data source**: Last 7 calendar days (today and 6 prior days), sourced from `wr_mood_entries` in localStorage via the `useMoodChartData` hook
- **X-axis**: Day labels — abbreviated day names (Mon, Tue, Wed, Thu, Fri, Sat, Sun) corresponding to each of the 7 calendar days
- **Y-axis**: Mood levels 1 through 5, with tick labels showing mood names (Struggling at 1, Heavy at 2, Okay at 3, Good at 4, Thriving at 5)
- **Line style**: Smooth monotone curve (`type="monotone"`), stroke color `#8B5CF6` (primary-lt / lighter violet), stroke width 2px
- **Data point dots**: Each dot is filled with the mood color for that day's mood level:
  - Struggling (1): `#D97706`
  - Heavy (2): `#C2703E`
  - Okay (3): `#8B7FA8`
  - Good (4): `#2DD4BF`
  - Thriving (5): `#34D399`
- **Dot size**: radius ~5px idle, ~7px on hover/active
- **Missing days**: If a day has no check-in, its value is `null`. The line is not drawn through null values (`connectNulls={false}`). The missing day's position on the x-axis is still shown (axis label visible), but no dot renders and the line breaks at that point.
- **Grid lines**: Horizontal and vertical grid lines at `rgba(255, 255, 255, 0.05)` — extremely subtle against the dark card background
- **Axis label styling**: `text-white/50` equivalent (`rgba(255, 255, 255, 0.5)`), font-size 11-12px
- **Chart background**: Transparent (inherits the frosted glass `DashboardCard` background)
- **Chart height**: Approximately 180px to fit comfortably within the `DashboardCard`

### Tooltip

- Appears on dot hover (desktop) and dot tap (mobile)
- Shows: date (formatted as "Mon, Mar 10") and mood label (e.g., "Good")
- Styled for dark theme: dark background (`bg-hero-mid` / `#1E0B3E`), white text, `border border-white/15`, rounded corners, small padding
- Custom tooltip component (not Recharts default styling)
- Only appears when hovering over a data point that has a value (not on null/gap positions)

### "See More" Link

- Uses the `DashboardCard` component's `action` prop: `{ label: "See More", to: "/insights" }`
- Renders as a link in the card header row, navigating to the `/insights` page (Spec 4)
- Until the `/insights` page is built, the link navigates to the existing stub/placeholder at `/insights`

### Empty State

- Triggers when there are zero mood entries in `wr_mood_entries` (or the key doesn't exist)
- Displays a ghosted example chart at ~15% opacity showing 7 faded dots at varied heights (simulating a week of varied moods) with a connecting line — purely decorative, using placeholder data
- Overlay text centered over the ghosted chart: "Your mood journey starts today" in `text-white/50`, `text-sm` or `text-base`, `font-sans`
- The ghosted chart uses the same Recharts components but with all colors reduced to ~15% opacity
- The "See More" link still renders in the card header (navigates to `/insights`)

### `useMoodChartData(days)` Hook

- **Parameters**: `days` (number, default 7) — how many calendar days to cover
- **Returns**: An array of objects, one per calendar day in the range, ordered chronologically (oldest first):
  ```
  {
    date: string        // YYYY-MM-DD
    dayLabel: string    // Abbreviated day name (e.g., "Mon", "Tue")
    mood: number | null // 1-5 or null if no check-in
    moodLabel: string | null // "Struggling" | "Heavy" | "Okay" | "Good" | "Thriving" | null
    color: string | null     // Hex color for the mood, or null
  }
  ```
- **Behavior**:
  - Generates a complete array of the last `days` calendar days (today and `days - 1` prior days)
  - For each day, looks up a matching entry in `wr_mood_entries` by date string
  - Days without a matching entry return `mood: null`, `moodLabel: null`, `color: null`
  - Reads from localStorage on every call (or uses a memoized read with dependency on a storage change signal)
  - Handles missing/corrupted localStorage gracefully (returns all-null array)
- **Reusability**: This hook is explicitly designed for reuse by Spec 4's `/insights` page with `useMoodChartData(30)`, `useMoodChartData(90)`, etc.

---

## AI Safety Considerations

- **Crisis detection needed?**: No — this widget is display-only; it reads mood data but does not accept user input
- **User input involved?**: No — the chart is a read-only visualization
- **AI-generated content?**: No — all content is derived from user's own mood entries in localStorage

---

## Auth & Persistence

### Logged-out users (demo mode):
- Do not see the dashboard or this widget (landing page renders instead)
- Zero data persistence. No interaction with this feature whatsoever.

### Logged-in users:
- See the mood chart widget on their dashboard
- Chart data is read-only from `wr_mood_entries` in localStorage (written by Spec 1's mood check-in)
- No new localStorage keys are introduced by this spec

### Route type:
- Not a separate route. This is a widget rendered within the Dashboard component at `/`
- Dashboard itself is auth-gated (only renders when `isAuthenticated`)

### Auth gating per interactive element:

| Element | Logged-out behavior | Logged-in behavior |
|---------|--------------------|--------------------|
| Mood chart widget | Not visible (landing page shown) | Renders inside DashboardCard |
| Chart dots (hover/tap) | Not visible | Shows tooltip with date + mood label |
| "See More" link | Not visible | Navigates to `/insights` |
| Empty state | Not visible | Shown when no mood entries exist |
| DashboardCard collapse toggle | Not visible | Toggles chart visibility (inherited from DashboardCard) |

---

## UX & Design Notes

### Visual Design

- **Card container**: Uses the existing `DashboardCard` from Spec 2 with frosted glass styling (`bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`)
- **Card title**: "Mood" or "Mood This Week" — displayed in the card header via `DashboardCard` `title` prop with a chart/line-chart icon
- **Chart colors**: Purple line `#8B5CF6` on transparent background with mood-colored dots. This creates a cohesive look where the line ties the data together while the dots provide emotional color coding.
- **Axis text**: `rgba(255, 255, 255, 0.5)` — readable but not competing with the data
- **Grid**: `rgba(255, 255, 255, 0.05)` — barely visible structure lines
- **Tooltip**: Custom dark tooltip matching the dashboard glass aesthetic (`bg-hero-mid`, `border border-white/15`, `rounded-lg`, `px-3 py-2`, `text-sm text-white`)
- **Empty state overlay**: Semi-transparent overlay text on the ghosted chart. The ghosted chart should feel like a preview of what's to come, not broken UI.
- **Overall fit**: The chart should feel like a natural part of the dark, calm dashboard — not a jarring data dashboard element. The purple line and mood-colored dots provide warmth.

### Design System Recon References

- **Card pattern**: Reuses the Dashboard Card Pattern from `09-design-system.md` (`bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 md:p-6`)
- **Mood colors**: Uses the exact Mood Color Palette from `09-design-system.md` (Struggling: `#D97706`, Heavy: `#C2703E`, Okay: `#8B7FA8`, Good: `#2DD4BF`, Thriving: `#34D399`)
- **Primary Light**: `#8B5CF6` from the color system for the chart line stroke
- **Dark panel styling**: Tooltip follows the same `bg-hero-mid border-white/15` pattern as navbar dropdowns documented in the design system recon
- **New pattern**: Custom Recharts dark-themed chart styling (transparent background, ultra-subtle grid, white/50 axis text). This is a **new pattern** not in the existing design system recon — flag as `[UNVERIFIED]` until visually confirmed.

### Animations

- **Chart entrance**: Gentle fade-in when the dashboard loads (inherited from the DashboardCard fade-in, no separate animation needed)
- **Dot hover**: Dot expands from ~5px to ~7px radius on hover (smooth, 150ms). No animation on mobile tap (instant).
- **Tooltip**: Appears immediately on hover/tap, no transition delay
- **`prefers-reduced-motion`**: Dot hover expansion is instant (no transition). Chart renders immediately (no entrance fade).

### Responsive Behavior

#### Mobile (< 640px)
- Chart fills the full width of the `DashboardCard` (minus card padding)
- Chart height: ~160px (slightly shorter to save vertical space on mobile)
- Y-axis labels may use abbreviated mood names if needed (e.g., "Str", "Hvy", "Ok", "Gd", "Thr") or omit y-axis labels entirely if space is too tight — show only gridlines with the colored dots providing context
- X-axis labels: 3-letter day abbreviations (Mon, Tue, etc.)
- Touch targets: Dots should have sufficient tap area (~44px hit zone even though visual dot is smaller) — Recharts `activeDot` with larger radius helps
- Tooltip appears above the dot (not below, to avoid thumb occlusion)

#### Tablet (640px–1024px)
- Same as desktop layout (chart fills card width)
- Chart height: ~180px
- Full y-axis mood labels and x-axis day labels visible

#### Desktop (> 1024px)
- Chart fills the full width of the left-column `DashboardCard` (~60% of the grid)
- Chart height: ~180px
- Full y-axis mood labels and x-axis day labels visible
- Hover tooltips appear near the dot position

---

## Edge Cases

- **Only 1-2 days of data**: Chart renders with dots only for those days; remaining days show as gaps. The x-axis still shows all 7 day labels. The line only connects adjacent non-null points.
- **All 7 days filled**: Full line with all 5 possible mood colors. The ideal state.
- **Same mood every day**: Line is flat (horizontal). All dots are the same color. Still renders correctly.
- **No mood data (empty state)**: Ghosted example chart at 15% opacity with overlay text. No real data rendered.
- **Corrupted `wr_mood_entries`**: `useMoodChartData` returns all-null array; empty state renders.
- **`wr_mood_entries` key missing**: Same as corrupted — empty state renders.
- **Card collapsed**: When the user collapses the DashboardCard, the chart is hidden. On re-expand, the chart re-renders at correct size (Recharts `<ResponsiveContainer>` handles this).
- **Window resize**: `<ResponsiveContainer>` ensures chart reflows to new container width.
- **Very recent check-in**: If the user just completed the mood check-in and the dashboard loaded, the new entry should appear in the chart immediately (read from localStorage on render).
- **Timezone edge**: Day labels must match the user's local timezone (consistent with `getLocalDateString()` from Spec 1's `utils/date.ts`).

---

## Out of Scope

- **Full `/insights` page** — Spec 4 (this spec only builds the dashboard widget and the reusable hook)
- **Calendar heatmap** — Spec 4
- **AI insight cards** — Spec 15
- **Activity correlations** — Spec 4
- **Moving average trend line** — Spec 4
- **Time range controls (30d, 90d, etc.)** — Spec 4
- **Streak/faith points integration** — Spec 5-6
- **Backend API persistence** — Phase 3 (this spec reads from localStorage only)
- **Real-time updates across tabs** — Nice to have but not required; chart reads localStorage on mount/re-render
- **Chart animations/transitions on data change** — Keep it simple; static render on load
- **Dark mode toggle** — Phase 4 (the dashboard is always dark)

---

## Acceptance Criteria

### Chart Rendering
- [ ] Mood chart widget renders inside the existing `DashboardCard` in the "7-Day Mood Chart" position on the dashboard, replacing the "Coming in Spec 3" placeholder
- [ ] Chart uses Recharts `<LineChart>` with `<ResponsiveContainer>` wrapper for fluid width
- [ ] Chart height is approximately 180px on desktop/tablet, ~160px on mobile
- [ ] Line uses `type="monotone"` smooth curve with stroke color `#8B5CF6` and stroke width 2px
- [ ] X-axis shows 7 day labels (Mon, Tue, Wed, Thu, Fri, Sat, Sun) for each calendar day in the range
- [ ] Y-axis shows mood levels 1-5 with mood name labels (Struggling, Heavy, Okay, Good, Thriving)

### Mood-Colored Dots
- [ ] Each data point dot is filled with the correct mood color: Struggling=#D97706, Heavy=#C2703E, Okay=#8B7FA8, Good=#2DD4BF, Thriving=#34D399
- [ ] Dot radius is ~5px at rest, expanding to ~7px on hover/active
- [ ] Days with no mood entry show as gaps — no dot renders and the line breaks (`connectNulls={false}`)

### Dark Theme
- [ ] Chart background is transparent (inherits DashboardCard frosted glass)
- [ ] Grid lines use `rgba(255, 255, 255, 0.05)` — barely visible
- [ ] Axis labels use `rgba(255, 255, 255, 0.5)` color, 11-12px font size
- [ ] Overall chart fits the dark, calm dashboard aesthetic

### Tooltip
- [ ] Hovering (desktop) or tapping (mobile) a data point dot shows a custom tooltip
- [ ] Tooltip displays the date (e.g., "Mon, Mar 10") and mood label (e.g., "Good")
- [ ] Tooltip uses dark theme styling: dark background (`#1E0B3E`), white text, `border border-white/15`, rounded corners
- [ ] Tooltip does not appear when hovering over gap positions (null values)

### "See More" Link
- [ ] `DashboardCard` header shows a "See More" link on the right side
- [ ] "See More" link navigates to `/insights`

### Empty State
- [ ] When no mood entries exist in localStorage, the widget shows a ghosted example chart at ~15% opacity
- [ ] Ghosted chart displays 7 faded dots at varied heights with a connecting line (decorative placeholder data)
- [ ] Overlay text "Your mood journey starts today" is centered over the ghosted chart in `text-white/50`
- [ ] "See More" link still renders in the card header during empty state

### `useMoodChartData` Hook
- [ ] Hook accepts a `days` parameter (default 7)
- [ ] Returns an array of exactly `days` objects, one per calendar day, ordered chronologically (oldest first)
- [ ] Each object contains `date`, `dayLabel`, `mood`, `moodLabel`, and `color` fields
- [ ] Days without a mood entry return `null` for `mood`, `moodLabel`, and `color`
- [ ] Hook reads from `wr_mood_entries` in localStorage
- [ ] Hook handles missing localStorage key gracefully (returns all-null entries)
- [ ] Hook handles corrupted/invalid JSON in localStorage gracefully
- [ ] Hook uses `getLocalDateString()` from `utils/date.ts` for timezone-correct date handling

### Accessibility
- [ ] Chart container has `aria-label` describing the content (e.g., "Your mood over the last 7 days")
- [ ] Hidden `sr-only` text summary provides trend info: "Over the last 7 days, you checked in N times. Average mood: [Label]."
- [ ] `prefers-reduced-motion`: dot hover expansion is instant (no transition)
- [ ] Chart inherits `DashboardCard` accessibility (section + aria-labelledby)

### Responsive Layout
- [ ] Mobile (< 640px): Chart fills card width, height ~160px, x-axis shows 3-letter day abbreviations
- [ ] Mobile: Y-axis labels abbreviated or hidden if space is insufficient (dots provide color context)
- [ ] Mobile: Dot touch targets are at least 44px (via Recharts activeDot with larger radius)
- [ ] Tablet (640-1024px): Full y-axis and x-axis labels visible, chart height ~180px
- [ ] Desktop (> 1024px): Full labels visible, chart fills left-column DashboardCard width, height ~180px

### Visual Design
- [ ] Chart line color (`#8B5CF6`) matches the primary-lt token from the design system
- [ ] Mood dot colors match the Mood Color Palette from `09-design-system.md`
- [ ] Card uses existing `DashboardCard` component with frosted glass styling
- [ ] Widget integrates visually with the dark dashboard theme — no jarring white backgrounds or bright borders

### New Dependency
- [ ] `recharts` is added to `package.json` dependencies
- [ ] No other new dependencies introduced
