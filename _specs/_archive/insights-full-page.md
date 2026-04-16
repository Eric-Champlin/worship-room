# Feature: Insights Full Page

**Master Plan Reference:** `dashboard-growth-spec-plan-v2.md`
- Shared data models: See "localStorage Key Summary" section — this spec reads `wr_mood_entries` (owned by Spec 1)
- Cross-spec dependencies: Spec 1 (Mood Check-In) creates the mood data this page visualizes; Spec 3 (Mood Insights Dashboard Widget) creates the `useMoodChartData(days)` hook this page reuses with larger ranges; Spec 2 (Dashboard Shell) provides the `AuthProvider` context and route switching logic
- Shared constants: Mood colors from Spec 1 / `09-design-system.md` Mood Color Palette; `MoodEntry` type from Spec 1; `useMoodChartData(days)` hook from Spec 3

---

## Overview

The Insights Full Page is a dedicated mood analytics page at `/insights` that gives logged-in users a rich, reflective view of their emotional journey over time. While the dashboard widget (Spec 3) shows a quick 7-day snapshot, this page invites users to explore patterns across weeks and months — helping them recognize how God has been moving in their lives, even during difficult seasons.

The page presents five distinct visualization sections on a single scrolling page: a GitHub-style calendar heatmap, an expanded mood trend line chart, AI-generated insight cards, activity correlation placeholders, and scripture connection placeholders. A sticky time range selector lets users zoom between 30 days and their full history.

This page serves the app's mission by transforming raw mood data into meaningful reflections — not clinical analytics, but a gentle narrative of growth, patterns, and spiritual connection. The tone is warm and encouraging: "Look how far you've come," not "Your metrics are trending down."

---

## User Stories

- As a **logged-in user**, I want to see my mood history on a calendar heatmap so that I can visually recognize patterns in how I've been feeling over time.
- As a **logged-in user**, I want to view a line chart of my mood trend over 30, 90, 180, or 365 days so that I can see the bigger picture of my emotional journey.
- As a **logged-in user**, I want to toggle a 7-day moving average line so that I can smooth out daily fluctuations and see underlying trends.
- As a **logged-in user**, I want to see AI insight cards that highlight patterns and correlations so that I feel guided in my reflection.
- As a **logged-in user**, I want to switch between time ranges (30d, 90d, 180d, 1y, All) and have all visualizations update accordingly.
- As a **logged-in user** who is new, I want to see encouraging empty states that motivate me to keep checking in.

---

## Requirements

### Page Structure

- **Route**: `/insights` — protected route (requires authentication)
- **Theme**: Dark, matching the dashboard (dark purple gradient background, frosted glass cards)
- **Layout**: Single scrolling page with no tabs
- **Entry points**: Dashboard mood chart "See More" link (Spec 3) + navbar avatar dropdown "Mood Insights" item (Spec 2)
- **Back navigation**: A subtle back link or breadcrumb at the top to return to the dashboard

### Page Header

- Dark gradient background matching the dashboard hero
- Page title: "Mood Insights" in the established heading style (warm, encouraging)
- Subtitle: A brief encouraging line such as "Reflect on your journey" in muted white text

### Time Range Controls

- Sticky pill-style toggle below the page header — remains visible while scrolling
- Five options: **30d** (default) | **90d** | **180d** | **1y** | **All**
- Selected pill: filled purple (`bg-purple-600 text-white`), unselected: outlined (`border border-white/20 text-white/60`)
- Changing the selected range re-renders all five sections below with the new time window
- `role="radiogroup"` with `role="radio"` per pill, `aria-checked` on the active pill
- Keyboard navigable: arrow keys to move between pills, Enter/Space to select
- Sticky behavior: sticks to the top of the viewport when scrolled past, with a slight dark backdrop to separate from content below

### Section 1: Calendar Heatmap

- **Implementation**: Custom CSS Grid (no external library) — 7 rows (Mon through Sun), columns = weeks in the selected range
- **Square size**: 12px on mobile (`w-3 h-3`), 16px on desktop (`w-4 h-4`), with 4px gap (`gap-1`)
- **Square colors**: Each square is colored by the mood value for that day using the mood color palette:
  - Struggling (1): `#D97706`
  - Heavy (2): `#C2703E`
  - Okay (3): `#8B7FA8`
  - Good (4): `#2DD4BF`
  - Thriving (5): `#34D399`
  - No check-in: `rgba(255, 255, 255, 0.05)` (nearly invisible, dark empty square)
- **Square shape**: Slightly rounded (`rounded-sm`)
- **Day labels**: Monday, Wednesday, Friday labels on the left side of the grid (abbreviated: Mon, Wed, Fri)
- **Month labels**: Month abbreviations (Jan, Feb, Mar...) positioned above the corresponding week columns
- **Tooltip on hover/tap**: Shows the date (e.g., "Mon, Mar 10"), mood label (e.g., "Good"), and a preview of the optional text if present (first ~50 characters, truncated with ellipsis)
- **Tooltip styling**: Same dark tooltip as the dashboard chart — dark background (`bg-hero-mid` / `#1E0B3E`), white text, `border border-white/15`, rounded corners
- **Horizontal scrolling**: For larger time ranges (180d, 1y, All), the heatmap container becomes horizontally scrollable (`overflow-x-auto`) on mobile. Desktop can also scroll if the grid exceeds viewport width. Fade edges on the scroll container to hint at more content.
- **Default (30d)**: Roughly 4-5 columns of 7 — fits on screen without scrolling
- **Section title**: "Your Mood Calendar" or similar, in card header style
- **Container**: Frosted glass card matching the dashboard card pattern

### Section 2: Mood Trend Line Chart

- **Reuses `useMoodChartData(days)`** from Spec 3 with the currently selected time range (30, 90, 180, 365, or total entry count for "All")
- **Chart type**: Recharts `<LineChart>` with `<ResponsiveContainer>` — same as the dashboard widget but larger
- **Chart height**: ~280px on desktop, ~220px on mobile
- **Line style**: Smooth monotone curve (`type="monotone"`), stroke `#8B5CF6`, stroke width 2px
- **Data point dots**: Mood-colored dots (same palette as heatmap), radius ~4px at rest, ~6px on hover
- **X-axis**: Date labels — for 30d show every ~5 days, for 90d+ show monthly markers. Axis text `rgba(255, 255, 255, 0.5)`, 11-12px
- **Y-axis**: Mood levels 1-5 with mood name labels (Struggling, Heavy, Okay, Good, Thriving). Axis text `rgba(255, 255, 255, 0.5)`
- **Grid lines**: `rgba(255, 255, 255, 0.05)` — barely visible
- **Missing days**: Gaps in the line (`connectNulls={false}`)
- **Tooltip**: Same dark tooltip pattern — date + mood label + optional text excerpt
- **7-day moving average toggle**: A small toggle button or switch in the section header ("Show trend line" or "7-day average"). When enabled, overlays a second line using a smoothed 7-day rolling average in a softer color (e.g., `rgba(139, 92, 246, 0.4)` — semi-transparent primary-lt). Dashed stroke style to distinguish from the raw data line. Moving average line connects through null gaps (interpolated).
- **Container**: Frosted glass card
- **Section title**: "Mood Over Time" or similar

### Section 3: AI Insight Cards

- **Layout**: 2-column grid on desktop (> 1024px), single column stacked on mobile/tablet
- **Card count**: 3-4 cards visible at a time
- **Card types** (all hardcoded mock content — no real computation):
  1. **Trend Summary**: Icon + "Your mood has improved 15% over the last 2 weeks. You're on an upward trajectory — keep going!"
  2. **Activity Correlation**: Icon + "You tend to feel better on days you journal. Consider making it a daily practice."
  3. **Scripture Connection**: Icon + "You found peace in Psalms — it was featured on 4 of your best days. The Psalms seem to speak to your heart."
  4. **Weekly Summary**: Icon + "This week: 5 check-ins, average mood: Good. You showed up consistently — that matters."
- **Card rotation**: Different cards shown on different days. Use `dayOfYear % totalVariants` to rotate which set of mock content is displayed. Have 2-3 variants per card type so the page feels fresh on return visits.
- **Card styling**: Frosted glass cards (`bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 md:p-6`), matching dashboard cards
- **Icons**: Use Lucide React icons for each type (e.g., TrendingUp for trend, BookOpen for scripture, Activity for correlation, Calendar for weekly)
- **Text tone**: Always encouraging and warm, never clinical
- **Small disclaimer**: Below the card grid, in muted text: "Insights are illustrative examples. Personalized AI insights coming soon."

### Section 4: Activity Correlations (Placeholder)

- **Visualization**: Recharts `<BarChart>` with mock data
- **Mock data**: Two comparison bars — "Mood on days you journaled" vs. "Mood on days you didn't" (and same for prayer). All values hardcoded.
- **Bar colors**: Use a soft teal for "with activity" bars and a muted gray-purple for "without activity" bars
- **Container**: Frosted glass card
- **Section title**: "Activity & Mood" or similar
- **Disclaimer**: Small muted text: "Based on example data. Real correlations coming soon."

### Section 5: Scripture Connections (Placeholder)

- **Format**: Simple list within a frosted glass card
- **Mock data**: 3-4 scripture references with mood context:
  - "Psalm 34:18 — Appeared on 3 of your Good days"
  - "Psalm 46:10 — Your most common verse during Okay moods"
  - "Psalm 107:1 — Featured on your Thriving days"
  - "Psalm 55:22 — A comfort during Heavy moments"
- **Each item**: Scripture reference in serif font (Lora), context text in sans-serif (Inter), mood color accent dot next to each
- **Container**: Frosted glass card
- **Section title**: "Scriptures That Spoke to You" or similar
- **Disclaimer**: Small muted text: "Based on example data. Personalized connections coming soon."

### Data Layer

- All real data sourced from `wr_mood_entries` in localStorage
- Time range filtering uses the `useMoodChartData(days)` hook from Spec 3 for the line chart
- Calendar heatmap reads directly from `wr_mood_entries` and filters by the selected time range
- "All" range uses the total number of days between the earliest entry and today
- If `wr_mood_entries` is missing or corrupted, all sections show their empty states gracefully

---

## AI Safety Considerations

- **Crisis detection needed?**: No — this page is display-only; it reads existing mood data but does not accept new user input
- **User input involved?**: No — all content is read-only visualization of the user's own data
- **AI-generated content?**: The AI insight cards contain hardcoded mock text (not real AI output). When real AI insights are implemented (Spec 15), they will require the standard content safety checks. For now, the mock text is pre-written and safe.
- **Sensitive data display**: Mood data and optional text entries are private. This page is auth-gated. The optional text previews in tooltips show the user's own words — no moderation needed for self-view.

---

## Auth & Persistence

### Auth Gating

This entire page is auth-gated. Logged-out users cannot access `/insights`.

| Element | Logged-out behavior | Logged-in behavior |
|---------|--------------------|--------------------|
| `/insights` route | Redirect to landing page (or show auth modal) | Render the full insights page |
| Time range pills | Not visible | Interactive, changes data range |
| Calendar heatmap | Not visible | Renders mood data from localStorage |
| Line chart | Not visible | Renders mood trend with optional moving average |
| AI insight cards | Not visible | Shows rotating mock insight content |
| Activity correlations | Not visible | Shows mock bar chart |
| Scripture connections | Not visible | Shows mock scripture list |
| Heatmap/chart tooltips | Not visible | Appear on hover/tap |
| Moving average toggle | Not visible | Toggles the trend overlay line |

### Persistence

- **Route type**: Protected
- **Data source**: `wr_mood_entries` in localStorage (read-only; this page does not write data)
- **No new localStorage keys** introduced by this spec
- **No backend API calls** — all data is frontend-only (Phase 2.75 pattern)
- **Zero persistence for this page's state**: Selected time range and moving average toggle state are not persisted — they reset to defaults (30d, toggle off) on each visit

---

## UX & Design Notes

### Visual Design

- **Page background**: Dark gradient matching the dashboard — `bg-hero-dark` to `bg-hero-mid` or similar dark purple gradient
- **All section cards**: Frosted glass pattern from `09-design-system.md` — `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 md:p-6`
- **Section spacing**: Generous vertical spacing between cards (`space-y-6` or `gap-6`) for a calm, breathable layout
- **Typography**: Section titles in `text-white font-semibold text-lg md:text-xl`, body text in `text-white/70` or `text-white/60`, disclaimers in `text-white/40 text-xs`
- **Overall feel**: This page should feel like a reflective journal — warm, personal, and unhurried. Not a clinical analytics dashboard.

### Design System Recon References

- **Dashboard card pattern**: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 md:p-6` from `09-design-system.md`
- **Mood color palette**: Struggling `#D97706`, Heavy `#C2703E`, Okay `#8B7FA8`, Good `#2DD4BF`, Thriving `#34D399`
- **Primary Light**: `#8B5CF6` for chart line stroke
- **Dark tooltip pattern**: `bg-hero-mid border border-white/15 rounded-lg px-3 py-2 text-sm text-white` — same pattern as Spec 3's chart tooltip and navbar dropdown panels
- **Hero/header gradient**: `from-hero-dark to-hero-mid` gradient from the dashboard shell
- **New patterns**:
  - Custom CSS Grid calendar heatmap (no library) — **new pattern**, not in existing design system recon
  - Sticky time range pill bar — **new pattern**
  - 7-day moving average overlay line — **new pattern**
  - Mock AI insight card layout (2-col grid with icon + text) — **new pattern**
  - Horizontal scroll container with fade edges — **new pattern**

### Animations

- **Page entrance**: Gentle fade-in (opacity 0 to 1, 400ms) for the entire page content
- **Section stagger**: Each section fades in with a slight stagger (100ms delay between sections) for a cascading reveal effect
- **Heatmap square hover**: Subtle brightness increase on hover (no scale)
- **Chart dot hover**: Dot expands from ~4px to ~6px radius (150ms transition)
- **Time range pill selection**: Background fill transitions smoothly (150ms)
- **`prefers-reduced-motion`**: All animations become instant. No stagger, no transitions. Content renders immediately.

### Responsive Behavior

#### Mobile (< 640px)
- Single column layout — all sections stack vertically
- Page header: smaller title size, subtitle may wrap to 2 lines
- Time range pills: horizontal scrollable row if they don't fit; alternatively, smaller text and tighter padding to fit all 5 pills in one row
- Heatmap: 12px squares (`w-3 h-3`), horizontally scrollable for ranges > 30d. Fade edges on scroll container.
- Line chart: ~220px height, simplified x-axis labels (fewer ticks)
- AI insight cards: Single column, stacked
- Activity correlations bar chart: Full width, may use horizontal bars instead of vertical for better mobile readability
- Scripture connections: Full width list
- Touch targets: All interactive elements (pills, heatmap squares, chart dots) have at least 44px tap zones
- Tooltips: Appear above the element to avoid thumb occlusion

#### Tablet (640px-1024px)
- Single column layout for most sections
- AI insight cards: May use 2-column grid if space allows
- Heatmap: 16px squares, may still need horizontal scroll for 180d+
- Line chart: ~250px height
- Full axis labels visible

#### Desktop (> 1024px)
- Max content width: `max-w-5xl` or `max-w-6xl` centered
- AI insight cards: 2-column grid
- Heatmap: 16px squares, fits most ranges without scrolling (30d-90d). 180d+ may still scroll.
- Line chart: ~280px height with full axis labels
- Tooltips appear near the hovered element

---

## Edge Cases

- **Zero mood entries**: All sections show empty states. Heatmap shows all `bg-white/5` squares. Line chart shows the ghosted example (same pattern as Spec 3's empty state). AI cards show a single encouragement: "Start checking in to see your insights grow." No bar chart or scripture list rendered — just an encouraging message.
- **Only 1-3 entries**: Heatmap shows mostly empty squares with a few colored ones. Line chart renders those few dots with gaps. AI cards still show mock content. Correlation/scripture sections show mock data regardless of real entry count.
- **Corrupted localStorage**: All sections gracefully fall back to empty states. No errors thrown.
- **"All" range with 1 entry**: Heatmap shows a single colored square in a small grid. Line chart shows a single dot.
- **"All" range with 365 entries**: Full year heatmap (52 columns), horizontally scrollable on mobile. Line chart renders all points.
- **Time range switch**: All sections re-render with the new range. No loading spinner needed (localStorage reads are instant).
- **Rapid time range switching**: Debounce or immediate render — localStorage reads are synchronous so no race conditions.
- **Window resize**: Recharts `<ResponsiveContainer>` handles chart reflow. Heatmap grid reflows via CSS.
- **Timezone**: All date comparisons use `getLocalDateString()` from `utils/date.ts` for consistency.
- **Missing `useMoodChartData` hook**: This spec depends on Spec 3 delivering this hook. If building out of order, the hook must be created first.

---

## Out of Scope

- **Real AI-generated insights** — Spec 15 (this spec uses hardcoded mock content only)
- **Monthly report page** (`/insights/monthly`) — Spec 15
- **Backend API persistence** — Phase 3 (all data from localStorage)
- **Real activity correlation computation** — Future (this spec shows mock data only)
- **Real scripture correlation computation** — Future (mock data only)
- **Data export** (CSV, PDF) — Future enhancement
- **Sharing insights** (social sharing of mood data) — Not planned (mood data is always private)
- **Dark mode toggle** — Phase 4 (dashboard is always dark)
- **Streak/points integration on this page** — Handled by other specs; this page focuses on mood data
- **Interactive heatmap filtering** (click a square to filter other sections) — Future enhancement
- **Print styling** — Not required for MVP
- **Real-time updates across tabs** — Not required; page reads localStorage on mount

---

## Acceptance Criteria

### Route & Auth
- [ ] `/insights` is a protected route — unauthenticated users are redirected to the landing page (or see auth modal)
- [ ] The page is accessible from the dashboard mood chart "See More" link
- [ ] The page is accessible from the navbar avatar dropdown "Mood Insights" item

### Page Structure
- [ ] Page uses a dark gradient background matching the dashboard theme (`hero-dark` to `hero-mid`)
- [ ] Page title "Mood Insights" renders in the page header area with warm, encouraging subtitle text
- [ ] Page is a single scrolling page with no tabs
- [ ] All five sections render in order: heatmap, line chart, AI insights, activity correlations, scripture connections
- [ ] Vertical spacing between sections is generous and consistent (`gap-6` or `space-y-6`)

### Time Range Controls
- [ ] Five pill-style toggle buttons render below the page header: 30d, 90d, 180d, 1y, All
- [ ] 30d is selected by default
- [ ] Selected pill uses filled purple style (`bg-purple-600 text-white`), unselected pills use outlined style (`border border-white/20 text-white/60`)
- [ ] Clicking a different pill updates all five sections with the new time range
- [ ] Pills use `role="radiogroup"` with `role="radio"` per pill and `aria-checked` on the active pill
- [ ] Pills are keyboard navigable (arrow keys to move, Enter/Space to select)
- [ ] Pills stick to the top of the viewport when scrolled past the header

### Calendar Heatmap
- [ ] Heatmap renders as a custom CSS Grid with 7 rows (Mon-Sun) and columns = weeks in selected range
- [ ] Each square is colored by the mood value using the mood color palette (Struggling=#D97706, Heavy=#C2703E, Okay=#8B7FA8, Good=#2DD4BF, Thriving=#34D399)
- [ ] Days with no check-in render as nearly invisible squares (`rgba(255, 255, 255, 0.05)`)
- [ ] Squares are 12px on mobile, 16px on desktop, with 4px gaps
- [ ] Day labels (Mon, Wed, Fri) appear on the left side of the grid
- [ ] Month labels appear above the corresponding week columns
- [ ] Hovering (desktop) or tapping (mobile) a square shows a tooltip with date, mood label, and text preview
- [ ] Tooltip uses dark theme styling (`bg-hero-mid`, white text, `border-white/15`)
- [ ] For ranges > 30d on mobile, the heatmap container scrolls horizontally with fade edges
- [ ] Heatmap square has `aria-label` with date and mood info (e.g., "March 10: Good")

### Line Chart
- [ ] Chart reuses `useMoodChartData(days)` hook from Spec 3 with the selected time range
- [ ] Chart uses Recharts `<LineChart>` with `<ResponsiveContainer>`
- [ ] Chart height is ~280px on desktop, ~220px on mobile
- [ ] Line uses smooth monotone curve with stroke `#8B5CF6` and width 2px
- [ ] Data point dots use mood-specific colors from the palette
- [ ] Missing days show as gaps in the line (`connectNulls={false}`)
- [ ] X-axis shows date labels appropriate to the range (every ~5 days for 30d, monthly for 90d+)
- [ ] Y-axis shows mood levels 1-5 with mood name labels
- [ ] Axis text uses `rgba(255, 255, 255, 0.5)` at 11-12px
- [ ] Grid lines use `rgba(255, 255, 255, 0.05)`
- [ ] Tooltip on dot hover/tap shows date + mood label in dark themed tooltip
- [ ] A toggle button for "7-day moving average" exists in the section header
- [ ] When toggled on, a semi-transparent dashed line (`rgba(139, 92, 246, 0.4)`) overlays the chart showing the rolling 7-day average
- [ ] Moving average line connects through null gaps (interpolated)

### AI Insight Cards
- [ ] Cards render in a 2-column grid on desktop (> 1024px), single column on mobile/tablet
- [ ] 3-4 mock insight cards are visible, each with an icon, title/category, and encouraging text
- [ ] Card types include: trend summary, activity correlation, scripture connection, weekly summary
- [ ] Cards use the frosted glass style (`bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`)
- [ ] Card content rotates based on the current day (`dayOfYear % totalVariants`)
- [ ] A small disclaimer renders below the cards: "Insights are illustrative examples. Personalized AI insights coming soon."
- [ ] Text tone is always warm and encouraging, never clinical

### Activity Correlations
- [ ] A Recharts `<BarChart>` renders with mock comparison data (journaling vs. no journaling, prayer vs. no prayer)
- [ ] Bar colors use soft teal for "with activity" and muted gray-purple for "without activity"
- [ ] Container is a frosted glass card with section title
- [ ] Small disclaimer: "Based on example data. Real correlations coming soon."

### Scripture Connections
- [ ] A list of 3-4 mock scripture references renders with mood context
- [ ] Scripture references use serif font (Lora), context text uses sans-serif (Inter)
- [ ] Each item has a mood color accent dot
- [ ] Container is a frosted glass card with section title
- [ ] Small disclaimer: "Based on example data. Personalized connections coming soon."

### Empty States
- [ ] When no mood entries exist, all sections show appropriate empty states
- [ ] Heatmap shows all empty squares (`bg-white/5`)
- [ ] Line chart shows a ghosted example chart at ~15% opacity with overlay text
- [ ] AI insight cards show a single encouraging message about starting check-ins
- [ ] Activity correlations and scripture connections show encouraging placeholder messages

### Accessibility
- [ ] Chart container has `aria-label` describing the content
- [ ] Heatmap squares each have `aria-label` with date and mood (e.g., "March 10: Good" or "March 10: No check-in")
- [ ] Time range pills use `role="radiogroup"` / `role="radio"` with `aria-checked`
- [ ] Hidden `sr-only` text summaries provide trend info for screen readers
- [ ] `prefers-reduced-motion`: all animations are instant, no stagger, no transitions
- [ ] All interactive elements have at least 44px touch targets on mobile
- [ ] Focus is visible on all interactive elements (pills, toggle, heatmap squares)

### Responsive Layout
- [ ] Mobile (< 640px): Single column, all sections stacked, heatmap scrolls horizontally for large ranges, chart height ~220px, touch targets >= 44px
- [ ] Tablet (640-1024px): Single column with optional 2-col insight cards, chart height ~250px
- [ ] Desktop (> 1024px): Max content width constrained (`max-w-5xl` or similar), 2-col insight cards, chart height ~280px, full axis labels

### Visual Design
- [ ] All section cards use the frosted glass pattern (`bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`)
- [ ] Chart line color (`#8B5CF6`) matches the primary-lt token
- [ ] Mood dot/square colors match the Mood Color Palette from `09-design-system.md`
- [ ] Page feels calm and reflective — not a jarring data dashboard
- [ ] Tooltips across all sections use consistent dark theme styling
