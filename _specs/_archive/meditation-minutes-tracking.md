# Feature: Meditation Minutes Tracking & History

**Master Plan Reference:** `dashboard-growth-spec-plan-v2.md`
- Shared data models: See "localStorage Key Summary" section — this spec introduces `wr_meditation_history`
- Cross-spec dependencies: Spec 2 (Dashboard Shell) provides `AuthProvider`, `DashboardHero`, and route switching; Spec 4 (Insights Full Page) provides the `/insights` page, time range pills, and frosted glass card pattern; Spec 5 (Streak & Faith Points Engine) provides `recordActivity('meditate')` which is already called in meditation completion — this spec adds duration tracking alongside it
- Shared constants: Meditation type slugs from `daily-experience.ts`, mood colors from `09-design-system.md`, `getLocalDateString()` from `utils/date.ts`, `getCurrentWeekStart()` for weekly boundary calculations

---

## Overview

Meditation Minutes Tracking brings visibility to a user's meditation practice by recording session durations and surfacing meaningful summaries across the app. Currently, meditation exercises record completion (a boolean flag via `markMeditationComplete` and `recordActivity`), but users have no way to see how much time they've spent meditating — a metric that matters deeply for spiritual practice.

This feature captures actual meditation duration for every completed session and presents it in three places: (1) on each meditation's completion screen as immediate, encouraging feedback, (2) in the Dashboard Hero area as a quick "X min this week" stat, and (3) on the `/insights` page as a dedicated "Meditation History" section with summary stats, a stacked bar chart, and a "Most Practiced" callout.

The tracking celebrates the gift of time spent in meditation — every minute is worth honoring. The tone is always warm: "You meditated for 12 minutes" and "Total this week: 47 minutes" feel like gentle acknowledgments, not performance metrics.

---

## User Stories

- As a **logged-in user**, I want to see how many minutes I meditated this week on my dashboard so that I can celebrate the time I've devoted to spiritual practice.
- As a **logged-in user**, I want to see my meditation duration on the completion screen so that I feel acknowledged for the time I just spent.
- As a **logged-in user**, I want to explore my meditation history on the `/insights` page so that I can see patterns in my practice over time.
- As a **logged-in user**, I want to see which meditation type I practice most so that I can recognize my preferences and perhaps try something new.
- As a **logged-in user**, I want the bar chart on `/insights` to show meditation minutes by type so that I can visualize the breadth of my practice.

---

## Requirements

### Meditation Session Data Model

Each completed meditation session is stored as an entry with:
- **id**: A unique identifier (UUID v4)
- **type**: One of `breathing`, `soaking`, `gratitude`, `acts`, `psalms`, `examen`
- **date**: The local date string (YYYY-MM-DD) when the session was completed
- **durationMinutes**: The duration in whole minutes (rounded to nearest minute, minimum 1)
- **completedAt**: ISO 8601 timestamp of when the session finished

### Duration Capture Rules

**Timed meditations** (Breathing, Soaking):
- Record the actual duration the user selected from the duration picker (e.g., 3 min, 5 min, 10 min)
- The selected duration is the source of truth — no need to measure elapsed time since the exercise runs for exactly the selected duration

**Untimed meditations** (Gratitude, ACTS, Psalms, Examen):
- Track start time via a React ref when the exercise content first mounts (not when the page loads — when the user begins the exercise)
- Calculate duration as the elapsed time from start to when the user reaches the completion screen
- Round to the nearest whole minute with a minimum of 1 minute
- Use `performance.now()` or `Date.now()` for timing — do not persist start time to localStorage

### Storage

- **localStorage key**: `wr_meditation_history`
- **Format**: JSON array of session entries, newest first
- **Max entries**: 365 — when adding a new entry that would exceed 365, remove the oldest entries
- **Storage service pattern**: Pure functions following the same pattern as `mood-storage.ts` and `streak-repair-storage.ts`:
  - `getMeditationHistory()`: Returns typed array, gracefully handles corrupted data (returns empty array)
  - `saveMeditationSession(session)`: Prepends to array, prunes if over 365
  - `getMeditationMinutesForWeek(weekStartDate?)`: Returns total minutes for the current week (Monday-Sunday)
  - `getMeditationMinutesForRange(startDate, endDate)`: Returns entries within a date range
  - `getMostPracticedType(entries)`: Returns the type with the most sessions and its percentage
- All writes are auth-gated — only logged-in users have meditation sessions recorded (meditation exercises already require auth)

### Completion Screen Enhancement

On all six meditation completion screens, display the session duration:
- **Primary line**: "You meditated for X minutes" — displayed prominently above the existing CTAs, in warm serif typography (Lora)
- **Secondary line**: "Total this week: X minutes" — displayed below the primary line in smaller, muted text as encouraging context
- These lines appear between the existing completion verse/affirmation content and the CompletionScreen CTA buttons
- If the weekly total is the same as the session duration (first session of the week), the secondary line reads "Your first meditation this week — great start!"
- Duration always shows as whole minutes (e.g., "You meditated for 1 minute", "You meditated for 12 minutes") — use correct singular/plural

### Dashboard Hero Stat

Add a meditation minutes stat to the DashboardHero area, alongside existing streak and level information:
- **Icon**: A small Lucide icon (Wind or Brain — planner's choice) in `text-white/60`
- **Text**: "X min this week" in `text-sm text-white/60` style, matching the existing streak display aesthetic
- **Weekly boundary**: Resets each Monday at midnight (same week boundary as the streak system — use `getCurrentWeekStart()` from `utils/date.ts`)
- **Zero state**: When no sessions this week, display "0 min this week" (not hidden — keeps the stat visible as a gentle nudge)
- **Placement**: Adjacent to the existing streak flame and level badge, forming a row of three stats

### Insights Page: Meditation History Section

A new section added to the existing `/insights` page, positioned below the existing mood-related sections (after Scripture Connections). This section respects the same time range pills (30d/90d/180d/1y/All) already on the page.

#### Summary Row (3 stat cards)

Three stat cards in a horizontal row:
- **"This Week"**: Total meditation minutes for the current Monday-Sunday period
- **"This Month"**: Total meditation minutes for the current calendar month
- **"All Time"**: Total meditation minutes across all stored history + total session count (e.g., "142 min (38 sessions)")
- **Card style**: Frosted glass matching other insight cards (`bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4`)
- Each card has a small label on top (e.g., "This Week") in `text-white/40 text-xs uppercase tracking-wider`, and the value below in `text-white font-semibold text-xl`

#### Bar Chart (Recharts BarChart)

A stacked bar chart showing daily meditation minutes for the selected time range:
- **Chart type**: Recharts `<BarChart>` with `<ResponsiveContainer>` — stacked bars per meditation type
- **Bar colors by type**:
  - Breathing: `#06B6D4` (cyan-500)
  - Soaking: `#A855F7` (purple-500)
  - Gratitude: `#EC4899` (pink-500)
  - ACTS: `#F59E0B` (amber-500)
  - Psalms: `#22C55E` (green-500)
  - Examen: `#3B82F6` (blue-500)
- **X-axis**: Date labels — frequency varies by range (every ~5 days for 30d, monthly markers for 90d+)
- **Y-axis**: Minutes with appropriate scale
- **Tooltip**: Dark themed (same as mood chart tooltip), showing the date and a breakdown of minutes per meditation type for that day
- **Legend**: Horizontal legend below the chart showing all 6 types with their colors — only types with data in the range are shown
- **Chart height**: ~250px desktop, ~200px mobile
- **Empty state**: When no meditation data exists for the range, show a gentle message: "Start a meditation to see your history here" with a ghosted example chart at ~15% opacity
- **Container**: Frosted glass card with section title "Meditation History"

#### "Most Practiced" Callout

Below the bar chart, a small callout showing:
- Which meditation type the user does most often (within the selected range)
- Percentage of total sessions: e.g., "Breathing is your most practiced meditation (42% of sessions)"
- If tied, show any one of the tied types
- If no data, this callout is hidden
- Style: subtle, within the same frosted glass card — muted text with the type's color accent

### Data Integration

- The meditation history storage service is the single source of truth for all three display surfaces (completion screen, dashboard hero, insights page)
- No data duplication — completion screens and dashboard both call the same storage functions
- Recording a session happens at the same point in code where `markMeditationComplete()` and `recordActivity('meditate')` are already called
- The storage service handles corrupted data gracefully (malformed JSON, missing fields, wrong types) by returning safe defaults

---

## AI Safety Considerations

- **Crisis detection needed?**: No — this feature does not involve user text input. It only records and displays numerical duration data.
- **User input involved?**: No — durations are calculated automatically from timer selection or elapsed time. No freeform text fields introduced.
- **AI-generated content?**: No — all displayed text is static templates with interpolated numbers.

---

## Auth & Persistence

### Auth Gating

This feature is entirely within the logged-in experience. All six meditation exercises already require authentication (redirect to `/daily?tab=meditate` when logged out). The dashboard and `/insights` page are also auth-gated.

| Element | Logged-out behavior | Logged-in behavior |
|---------|--------------------|--------------------|
| Meditation session recording | Not possible — exercises redirect to Daily Hub | Session recorded to `wr_meditation_history` on completion |
| Completion screen duration display | Not visible — exercises are auth-gated | Shows "You meditated for X minutes" + weekly total |
| Dashboard Hero meditation stat | Not visible — dashboard is auth-gated | Shows "X min this week" with icon |
| Insights meditation history section | Not visible — `/insights` is auth-gated | Shows summary cards + bar chart + most practiced |
| `wr_meditation_history` writes | Never — no writes for logged-out users | Written on each meditation completion |

### Persistence

- **Route type**: No new routes — modifications to existing protected pages only
- **New localStorage key**: `wr_meditation_history` (array of session entries, max 365)
- **No backend API calls** — all data is frontend-only (Phase 2.75 pattern)
- **Logout preserves data**: `wr_meditation_history` is NOT cleared on logout (same policy as mood entries, points, badges)
- **No data shared with other users**: Meditation minutes are entirely private, never visible to friends or on leaderboards

---

## UX & Design Notes

### Visual Design

**Completion screen additions:**
- Duration text: `font-serif text-lg text-text-dark` (Lora) — matches the existing verse/affirmation typography on the completion screens
- Weekly total: `text-sm text-text-light` — subtle, encouraging
- Placed between the verse/affirmation content and the CompletionScreen component, with appropriate spacing (`mb-6` or `mb-8`)

**Dashboard Hero stat:**
- Same visual weight as the existing streak flame display — an icon + text pair
- `text-white/60` for both icon and text, `text-sm` size
- Part of a horizontal row of stats (streak, level, meditation minutes)

**Insights section:**
- Follows the established dark theme of the `/insights` page
- Summary cards match existing frosted glass style exactly
- Bar chart uses the same Recharts styling patterns as the mood trend chart (dark axes, dark grid lines, dark tooltip)
- Section title "Meditation History" in `text-white font-semibold text-lg md:text-xl`
- Bar chart legend uses small colored squares + type names in `text-white/60 text-xs`

### Design System Recon References

- **Dashboard card pattern**: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 md:p-6` from `09-design-system.md`
- **Dark tooltip pattern**: `bg-hero-mid border border-white/15 rounded-lg px-3 py-2 text-sm text-white` — same as mood chart tooltip
- **Insights page time range pills**: Reuse the existing pill component/pattern from the insights page — do not create a separate range control
- **Completion screen pattern**: The `CompletionScreen` component uses `animate-fade-in`, `font-lora`, and `text-text-dark` for the title
- **New patterns**:
  - Stacked bar chart with per-type colors — **new pattern** (existing charts are line charts)
  - Three-stat summary row — **new pattern** (similar concept to insight cards but more compact)
  - Dashboard Hero stat group with three inline stats — **new pattern** (current hero has greeting + streak + level, this adds a third stat)

### Animations

- **Duration text on completion**: Gentle fade-in (consistent with existing `animate-fade-in` on CompletionScreen)
- **Bar chart hover**: Bar segment highlights with slight brightness increase
- **Summary card entrance**: Same stagger pattern as other insights sections
- **`prefers-reduced-motion`**: All animations become instant

### Responsive Behavior

#### Mobile (< 640px)
- **Completion screen**: Duration text and weekly total stack naturally in the centered layout, full width
- **Dashboard Hero stat**: The three stats (streak, level, meditation min) wrap or stack vertically if space is tight — maintain readable text sizes
- **Insights summary cards**: Stack vertically (single column), each card full width
- **Insights bar chart**: ~200px height, simplified x-axis labels, horizontally scrollable legend if needed
- **Touch targets**: Legend items and chart bars have adequate touch targets (44px)

#### Tablet (640px-1024px)
- **Completion screen**: Same as mobile, slightly more breathing room
- **Dashboard Hero stat**: Three stats fit in a single horizontal row
- **Insights summary cards**: 3-column grid (all three fit in one row)
- **Insights bar chart**: ~220px height, more x-axis labels visible

#### Desktop (> 1024px)
- **Completion screen**: Same layout as tablet — centered, clean
- **Dashboard Hero stat**: Horizontal row of three stats with generous spacing
- **Insights summary cards**: 3-column grid with `gap-4`
- **Insights bar chart**: ~250px height, full x-axis labels

---

## Edge Cases

- **Zero meditation sessions**: Dashboard shows "0 min this week". Insights section shows empty state with ghosted chart. Completion screen doesn't show weekly total context (or shows "Your first meditation this week — great start!").
- **Very short untimed meditations** (< 30 seconds): Minimum 1 minute recorded. A user who immediately clicks "Done" still gets 1 minute credit.
- **Very long untimed meditations** (e.g., user leaves page open): Duration captured is from mount to completion click. If a user leaves the page open for hours, that's their meditation time — no cap imposed. The bar chart Y-axis scales accordingly.
- **Multiple completions same day, same type**: Each completion is a separate session entry. The bar chart stacks them for that day.
- **Corrupted `wr_meditation_history`**: Storage service returns empty array. All displays fall back to zero/empty states gracefully. No errors thrown.
- **localStorage full**: Session save fails silently. The completion screen still shows the duration (calculated from memory, not read back from storage).
- **365 entry limit**: Oldest entries pruned when adding new ones. Pruning happens at write time.
- **Week boundary during active session**: The session is attributed to the date when it completes (the `date` field), not when it started.
- **Time range "All" with no data**: Summary cards show "0 min" / "0 sessions". Chart shows empty state.
- **Insights page time range interaction**: Changing the time range pills re-renders both the existing mood sections AND the new meditation history section. The meditation section reads the same range value.
- **Session recorded alongside existing tracking**: The meditation session save happens at the same code point as `markMeditationComplete()` and `recordActivity('meditate')` — all three tracking mechanisms fire together.

---

## Out of Scope

- **Backend API persistence** — Phase 3 (all data is localStorage only)
- **Sharing meditation stats with friends** — Meditation data is private; not visible on leaderboards, profiles, or social features
- **Audio meditation tracking** — Sleep & Rest audio content on the Music page is not counted as meditation
- **Meditation goals or targets** — No "meditate 30 min/week" goal-setting feature
- **Meditation reminders or notifications** — Future enhancement
- **Meditation type recommendations** — No "try a new type" suggestions based on history
- **Real-time timer display during untimed meditations** — The user doesn't see a running clock during the exercise
- **Historical data backfill** — Past meditation completions (before this feature) are not retroactively tracked
- **Per-session notes or reflections** — Each session is just a duration record, not a journal
- **Dark mode toggle** — Phase 4 (dashboard and insights are always dark)
- **Export meditation data** (CSV/PDF) — Future enhancement
- **Meditation streaks** (separate from the main streak system) — Not planned

---

## Acceptance Criteria

### Storage Service
- [ ] A `wr_meditation_history` localStorage key stores an array of meditation session entries
- [ ] Each entry contains: `id` (UUID), `type` (one of 6 meditation types), `date` (YYYY-MM-DD), `durationMinutes` (number), `completedAt` (ISO timestamp)
- [ ] `getMeditationHistory()` returns a typed array and gracefully handles corrupted or missing data (returns empty array)
- [ ] `saveMeditationSession()` prepends to the array and prunes entries beyond 365
- [ ] `getMeditationMinutesForWeek()` returns the total minutes for the current Monday-Sunday period
- [ ] Storage functions follow the same pure-function pattern as `mood-storage.ts`
- [ ] All writes are auth-gated (only called within auth-gated meditation exercises)

### Duration Capture — Timed Meditations
- [ ] Breathing exercise records the user-selected duration (e.g., 3, 5, or 10 minutes) as `durationMinutes`
- [ ] Soaking exercise records the user-selected duration as `durationMinutes`
- [ ] Session is saved at the same point where `markMeditationComplete()` and `recordActivity('meditate')` are called

### Duration Capture — Untimed Meditations
- [ ] Gratitude, ACTS, Psalms, and Examen exercises track start time via a React ref when the exercise content mounts
- [ ] Duration is calculated as elapsed time from start to completion, rounded to the nearest whole minute
- [ ] Minimum duration is 1 minute (even if elapsed time is < 30 seconds)
- [ ] Start time is not persisted to localStorage — it lives in a ref only

### Completion Screen
- [ ] All six meditation completion screens display "You meditated for X minutes" above the existing CTAs
- [ ] Duration text uses warm serif typography (Lora) consistent with existing completion screen style
- [ ] Below the duration, "Total this week: X minutes" appears in smaller, muted text
- [ ] If this is the user's first session of the week, the secondary line reads "Your first meditation this week — great start!"
- [ ] Duration displays correct singular/plural ("1 minute" vs "12 minutes")
- [ ] Duration text fades in with the existing completion screen animation

### Dashboard Hero
- [ ] A meditation minutes stat appears in the DashboardHero area alongside streak and level
- [ ] Stat shows a Lucide icon (Wind or Brain) + "X min this week" text
- [ ] Icon and text use `text-white/60` and `text-sm` styling matching the existing streak display
- [ ] Weekly count resets each Monday (same boundary as streak system)
- [ ] When no sessions this week, displays "0 min this week" (visible, not hidden)
- [ ] Stat updates immediately after completing a meditation (without page refresh)

### Insights Page — Summary Cards
- [ ] Three stat cards appear in the Meditation History section: "This Week", "This Month", "All Time"
- [ ] "All Time" card shows both total minutes and session count (e.g., "142 min (38 sessions)")
- [ ] Cards use frosted glass style matching other insight cards (`bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`)
- [ ] Cards are in a 3-column row on desktop/tablet, stacked vertically on mobile
- [ ] Summary values update when the time range pills are changed (though "This Week" and "This Month" are fixed regardless of range)

### Insights Page — Bar Chart
- [ ] A Recharts `<BarChart>` renders daily meditation minutes for the selected time range
- [ ] Bars are stacked by meditation type with distinct colors: Breathing=cyan, Soaking=purple, Gratitude=pink, ACTS=amber, Psalms=green, Examen=blue
- [ ] Chart uses `<ResponsiveContainer>` for responsive sizing
- [ ] Chart height is ~250px desktop, ~200px mobile
- [ ] X-axis shows date labels appropriate to the selected range
- [ ] Tooltip shows the date and per-type minute breakdown on hover/tap
- [ ] Tooltip uses the dark theme pattern (`bg-hero-mid`, white text, `border-white/15`)
- [ ] A horizontal legend below the chart shows type names with colored indicators
- [ ] When no data exists for the range, an empty state shows with ghosted chart and encouraging message
- [ ] Chart respects the same time range pills (30d/90d/180d/1y/All) as the rest of the insights page

### Insights Page — Most Practiced Callout
- [ ] Below the bar chart, a callout shows the most practiced type and its percentage (e.g., "Breathing is your most practiced meditation (42% of sessions)")
- [ ] The type name is accented with its corresponding chart color
- [ ] If no data exists, the callout is hidden
- [ ] The callout updates when the time range changes

### Empty States
- [ ] Dashboard Hero shows "0 min this week" when no sessions exist
- [ ] Insights bar chart shows ghosted example + encouraging message when no sessions exist for the range
- [ ] Insights summary cards show "0 min" values when no sessions exist
- [ ] Most Practiced callout is hidden when no sessions exist
- [ ] Completion screen shows "Your first meditation this week — great start!" for the first session of a new week

### Accessibility
- [ ] Bar chart container has `aria-label` describing the content (e.g., "Meditation minutes by day")
- [ ] Summary stat cards have readable text contrast against the dark background (WCAG AA)
- [ ] Dashboard Hero stat has accessible text (icon has `aria-hidden="true"`, stat text is visible)
- [ ] Completion screen duration text is within the existing accessible content flow
- [ ] All interactive chart elements have at least 44px touch targets on mobile
- [ ] `prefers-reduced-motion`: all animations are instant

### Responsive Layout
- [ ] Mobile (< 640px): Summary cards stack vertically, bar chart is ~200px tall, completion screen duration text wraps naturally
- [ ] Tablet (640-1024px): Summary cards in 3-column row, bar chart ~220px, dashboard hero stats fit in one row
- [ ] Desktop (> 1024px): Summary cards in 3-column row with gap-4, bar chart ~250px, full legend visible

### Visual Design
- [ ] Insights section uses the same frosted glass card pattern as other sections on the page
- [ ] Bar chart colors are visually distinct and harmonious on the dark background
- [ ] Chart styling (axes, grid, tooltip) matches the existing mood trend chart patterns
- [ ] Section title "Meditation History" matches other section title styles on the insights page
- [ ] Overall section feels cohesive with the rest of the insights page — not visually jarring
