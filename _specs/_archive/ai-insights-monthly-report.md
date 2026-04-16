# Feature: AI Insights & Monthly Report

**Master Plan Reference:** `dashboard-growth-spec-plan-v2.md`
- Shared data models: See "localStorage Key Summary" section — this spec reads `wr_mood_entries` (Spec 1), `wr_faith_points` (Spec 5), `wr_streak` (Spec 5), `wr_badges` (Spec 7), `wr_daily_activities` (Spec 5)
- Cross-spec dependencies: Spec 4 (`/insights` Full Page) created the page structure and AI insight card Section 3 that this spec extends; Spec 3 created `useMoodChartData(days)` hook; Spec 1 provides `MoodEntry` type and mood data; Spec 5 provides streak/points data; Spec 7 provides badge data; Spec 2 provides `AuthProvider` and route switching; Spec 12 (Notifications) provides notification system for monthly report availability
- Shared constants: Mood colors from `09-design-system.md`, `LEVEL_THRESHOLDS` from Spec 5/7, `ACTIVITY_POINTS` from Spec 5

---

## Overview

The AI Insights & Monthly Report feature enriches the mood analytics experience with two major additions: (1) a richer, rotating set of mock AI insight cards on the existing `/insights` page, replacing the basic placeholder cards from Spec 4, and (2) a new monthly report page at `/insights/monthly` that presents a beautiful, shareable summary of the user's faith journey for any given month.

This feature transforms raw data into meaningful, encouraging narratives. Instead of cold analytics, users see warm reflections like "You tend to feel better on days you journal" and "Psalm 34:18 appeared on your Struggling days — and each time, your mood improved the next day." The monthly report celebrates consistency and growth, framing even difficult months as part of a meaningful journey.

All content is hardcoded mock data for the frontend-first build. When real AI integration arrives in Phase 3+, the mock content pool will be replaced by OpenAI-generated insights based on actual user patterns.

---

## User Stories

- As a **logged-in user**, I want to see fresh, rotating AI insight cards on `/insights` so that the page feels alive and gives me new reflections each day I visit.
- As a **logged-in user**, I want to view a monthly faith journey report so that I can celebrate my consistency, see my highlights, and reflect on my growth.
- As a **logged-in user**, I want to see key stats for the month (days active, points earned, level progress, mood trend) so that I feel recognized for showing up.
- As a **logged-in user**, I want to navigate to the monthly report from the insights page, from a notification, and from my avatar dropdown so that it's easy to find.
- As a **logged-in user**, I want to see an email template preview of my monthly report so that I can imagine receiving it in the future.
- As a **logged-in user**, I want a "Share" button on the monthly report that tells me sharing is coming soon, so I know the feature is planned.

---

## Requirements

### Part 1: Enhanced AI Insight Cards on `/insights`

This extends Section 3 (AI Insight Cards) of the existing `/insights` page built in Spec 4. The current implementation has 4 basic mock cards with 2-3 rotation variants per type. This spec replaces that content pool with a richer set of 11 distinct cards across 4 categories, with daily rotation logic showing 3-4 cards per visit.

#### Card Content Pool (11 total)

**Trend Summaries (4 cards):**
1. "Your mood has improved 15% over the last 2 weeks. You're on an upward trajectory — keep going!"
2. "You've been most consistent on Wednesdays and Thursdays. Mid-week seems to be your rhythm."
3. "This is your best week in the last month! Whatever you've been doing, it's working."
4. "Your mood dipped mid-week — but weekends seem to recharge you. Rest is part of the journey."

**Activity Correlations (3 cards):**
5. "On days you journal, your average mood is Good (4.1) vs. Okay (3.2) on days you don't. Journaling seems to make a difference."
6. "Listening to worship music correlates with a 20% mood boost the next day. Music is good medicine."
7. "You tend to pray more on Heavy days — and your mood improves the day after. Prayer is working."

**Scripture Connections (2 cards):**
8. "Psalm 34:18 appeared on 3 of your Struggling days — and each time, your mood improved the next day. God is close to the brokenhearted."
9. "You gravitate toward Psalms when feeling Heavy — they seem to bring peace. The Psalms know your heart."

**Personalized Recommendations (2 cards):**
10. "Try journaling before bed — your best mood days often follow evening journal entries."
11. "You haven't explored the Sleep & Rest tab yet — it might help on Heavy days."

#### Card Icons

Each category uses a distinct Lucide React icon:
- Trend Summaries: `TrendingUp`
- Activity Correlations: `Activity`
- Scripture Connections: `BookOpen`
- Personalized Recommendations: `Lightbulb`

#### Card Rotation Logic

- Each day, select 3-4 cards from the pool using `dayOfYear % totalCards` as the starting index
- Slice 3-4 consecutive cards from that index, wrapping around the array
- The selection changes daily, ensuring return visitors see different content
- On any given day, the 3-4 visible cards should ideally span at least 2 different categories (best effort, not strict — the rotation math handles this naturally since the pool is ordered by category)

#### Card Category Label

Each card displays a small category label above the main text:
- "Trend" / "Activity" / "Scripture" / "Recommendation"
- Styled in muted text (`text-white/40 text-xs uppercase tracking-wider`)

#### Disclaimer

Below the card grid: "Insights are illustrative examples. Personalized AI insights coming soon." in `text-white/40 text-xs`

### Part 2: Monthly Report Page

#### Route & Navigation

- **Route**: `/insights/monthly` — protected route (requires authentication)
- **Default month**: Current month (or previous month if we're in the first 5 days of a new month)
- **Month navigation**: Left/right arrows to browse previous months. Cannot navigate to future months. Earliest navigable month is the month of the user's first mood entry (or current month if no entries).
- **Entry points**:
  1. Link on `/insights` page — a prominent "View Monthly Report" button/link at the bottom of the page or near the AI insights section
  2. Notification — when a new monthly report is "available" (first visit after month ends), a notification appears in the bell panel: "Your [Previous Month] Faith Journey is ready!"
  3. Avatar dropdown — "Monthly Report" item in the user dropdown menu (below "Mood Insights")

#### Page Layout (Single Scrolling Page)

**Section 1: Header**
- Title: "Your [Month Name] Faith Journey" (e.g., "Your February Faith Journey")
- Date range subtitle: "February 1 - February 28, 2026"
- Month navigation arrows (left/right) flanking the title
- Dark gradient background matching the dashboard/insights hero

**Section 2: Key Stats (4 cards in a row)**
- Four stat cards displayed in a horizontal row (2x2 grid on mobile):
  1. **Days Active**: Large number + "of [days in month]" subtitle. Mock: "24 of 31". Icon: `Calendar`
  2. **Points Earned**: Large number with comma formatting. Mock: "1,847". Icon: `Star`
  3. **Level Progress**: Shows level name transition + percentage. Mock: "Sprout -> Blooming 67%". Includes a thin progress bar. Icon: `TrendingUp`
  4. **Mood Trend**: Arrow indicator + percentage change vs. previous month. Mock: "up arrow 12%". Color: green for improvement, amber for decline, gray for flat. Icon: `Heart`
- Card styling: Frosted glass cards, slightly smaller than dashboard cards. Accent color border-top or icon color to distinguish each card.

**Section 3: Month Heatmap**
- Reuses the calendar heatmap component from `/insights` (Spec 4), locked to the selected month
- Shows only the weeks that belong to the displayed month
- Same mood colors, square sizes, tooltips, and day/month labels as the `/insights` heatmap
- Container: Frosted glass card with title "Your [Month] at a Glance"

**Section 4: Top Activities (Bar Chart)**
- Recharts `<BarChart>` showing activity distribution for the month
- Activities on X-axis: Check-in, Pray, Journal, Meditate, Listen, Prayer Wall
- Y-axis: Count of times each activity was performed during the month
- Bar color: Each activity gets a distinct color from the design system:
  - Check-in: `#8B7FA8` (neutral gray-purple)
  - Pray: `#6D28D9` (primary)
  - Journal: `#2DD4BF` (soft teal)
  - Meditate: `#8B5CF6` (primary-lt)
  - Listen: `#00D4FF` (glow-cyan)
  - Prayer Wall: `#F39C12` (warning/amber)
- Mock data: Check-in: 24, Pray: 18, Journal: 15, Meditate: 10, Listen: 20, Prayer Wall: 8
- Container: Frosted glass card with title "Your Top Activities"
- Dark chart theme matching the insights page (dark axes, dark grid lines, dark tooltip)

**Section 5: Highlight Moments**
- 3 highlight cards displayed in a row (stack on mobile):
  1. **Longest Streak**: "Your longest streak this month was [N] days" with streak fire icon. Mock: "7 days"
  2. **Badges Earned**: "You earned [N] new badges" with badge icon and mini badge icons displayed. Mock: "3 badges" with thumbnail icons of earned badges
  3. **Best Day**: "Your best day was [Date] — you completed [N] activities and felt [Mood]". Mock: "February 12 — 5 activities, feeling Thriving"
- Card styling: Frosted glass, same pattern as stat cards but with more visual emphasis (slightly larger icons, celebratory accent colors)

**Section 6: AI Insight Cards**
- 2-3 cards pulled from the same AI insight card content pool (Part 1)
- Uses a different rotation offset than the `/insights` page so the monthly report shows different cards: `(dayOfYear + 5) % totalCards`
- Same card styling and layout as the `/insights` page insight cards

**Section 7: Share Button**
- A prominent button at the bottom: "Share Your Month"
- Clicking it shows a toast: "Sharing is coming soon! We're working on beautiful shareable cards for your faith journey."
- Toast uses the existing toast system
- Button styling: Primary purple button (`bg-primary text-white`), centered

### Part 3: Email Template (Visual Preview Only)

- A React component that renders a visual email preview — NOT a functional email sender
- Accessible via a small "Preview Email" link near the share button on the monthly report page
- Opens in a modal or expands inline
- **Subject line** (displayed above the preview): "Your [Month] Faith Journey — Worship Room"
- **Email content**: Simplified version of the monthly report — header, 4 key stats, a mini heatmap (static image placeholder), 1 highlight, and a CTA button "View Full Report" (non-functional)
- **Styling**: Light background email template (white cards on light gray background) — contrasts with the dark app theme to match standard email conventions
- **Disclaimer below preview**: "Email reports coming soon. This is a preview of what your monthly email will look like."

---

## AI Safety Considerations

- **Crisis detection needed?**: No — this feature is entirely display-only. It reads existing mood data and displays pre-written mock content. No user text input is accepted.
- **User input involved?**: No — all content is read-only visualization and hardcoded mock text.
- **AI-generated content?**: No real AI output. All "AI insight" cards contain pre-written mock text. When real AI insights are implemented (Phase 3+), the standard AI content safety checks from `01-ai-safety.md` must be applied: plain text only, no HTML rendering, content moderation, length limits, encouraging tone.
- **Sensitive data display**: Mood data and optional check-in text are private and auth-gated. The monthly report is visible only to the authenticated user. The "Share" button is stubbed — no mood data can be shared externally yet.

---

## Auth & Persistence

### Auth Gating

Both `/insights` (existing) and `/insights/monthly` (new) are fully auth-gated. Logged-out users cannot access either page.

| Element | Logged-out behavior | Logged-in behavior |
|---------|--------------------|--------------------|
| `/insights` route | Redirect to landing page | Render full insights page with enhanced AI cards |
| `/insights/monthly` route | Redirect to landing page | Render monthly report page |
| AI insight cards on `/insights` | Not visible | Shows 3-4 rotating mock insight cards |
| Monthly report link on `/insights` | Not visible | Clickable link to `/insights/monthly` |
| Month navigation arrows | Not visible | Navigate between months |
| Key stat cards | Not visible | Display mock stats for selected month |
| Month heatmap | Not visible | Renders mood data for selected month |
| Top activities bar chart | Not visible | Renders mock activity distribution |
| Highlight cards | Not visible | Display mock highlight data |
| Share button | Not visible | Shows "Coming soon" toast on click |
| Preview Email link | Not visible | Opens email template preview |
| "Monthly Report" in avatar dropdown | Not visible (avatar dropdown not shown for logged-out) | Clickable, navigates to `/insights/monthly` |
| Monthly report notification | Not visible (bell not shown for logged-out) | Appears in notification panel |

### Persistence

- **Route type**: Protected (both `/insights` and `/insights/monthly`)
- **Data sources** (all read-only from localStorage):
  - `wr_mood_entries` — mood data for heatmap, charts, and stat calculations
  - `wr_faith_points` — total points and level for stat cards
  - `wr_streak` — streak data for highlights
  - `wr_badges` — earned badges for highlights
  - `wr_daily_activities` — activity counts for bar chart
- **No new localStorage keys** introduced by this spec
- **No backend API calls** — all data is frontend-only (Phase 2.75 pattern)
- **Selected month**: Not persisted — defaults to current/previous month on each visit

---

## UX & Design Notes

### Visual Design

- **Page backgrounds**: Dark gradient matching the dashboard and `/insights` page — `from-hero-dark to-hero-mid`
- **All cards**: Frosted glass pattern — `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 md:p-6`
- **Stat cards**: Slightly more compact than standard dashboard cards. Large number in `text-white text-3xl md:text-4xl font-bold`, subtitle in `text-white/60 text-sm`
- **Typography**: Section titles in `text-white font-semibold text-lg md:text-xl`, body text in `text-white/70`, disclaimers in `text-white/40 text-xs`
- **Insight card category labels**: `text-white/40 text-xs uppercase tracking-wider` above the card body text
- **Icons**: Lucide React, rendered in `text-white/50` at rest, colored when contextual (e.g., mood trend arrow uses green/amber)
- **Overall feel**: Celebratory yet peaceful — the monthly report should feel like opening a personal letter about your journey, not reading a performance review

### Design System Recon References

- **Frosted glass card**: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 md:p-6` from `09-design-system.md`
- **Mood colors**: Struggling `#D97706`, Heavy `#C2703E`, Okay `#8B7FA8`, Good `#2DD4BF`, Thriving `#34D399`
- **Dark tooltip pattern**: `bg-hero-mid border border-white/15 rounded-lg px-3 py-2 text-sm text-white`
- **Hero/header gradient**: `from-hero-dark to-hero-mid`
- **Primary button**: `bg-primary text-white` with hover state
- **Activity bar chart colors**: Primary `#6D28D9`, primary-lt `#8B5CF6`, teal `#2DD4BF`, cyan `#00D4FF`, amber `#F39C12`, gray-purple `#8B7FA8`
- **New patterns**:
  - Monthly report stat card row (4 compact cards with large numbers + icons) — **new pattern**
  - Month navigation with left/right arrows — **new pattern**
  - Activity distribution bar chart (6 colored bars) — **new pattern**
  - Highlight moment cards (streak/badges/best day) — **new pattern**
  - Email template preview modal (light theme within dark app) — **new pattern**

### Animations

- **Page entrance**: Gentle fade-in (opacity 0 to 1, 400ms) for page content
- **Section stagger**: Each section fades in with 100ms stagger delay (matches `/insights` page pattern)
- **Month navigation**: Crossfade transition when switching months (content fades out 200ms, new content fades in 200ms)
- **Stat card numbers**: Count-up animation on first render (e.g., 0 to 24, 0 to 1,847) over 800ms with easing — only if `prefers-reduced-motion` is not set
- **Share button toast**: Standard toast animation from existing toast system
- **`prefers-reduced-motion`**: All animations become instant. No stagger, no count-up, no crossfade.

### Responsive Behavior

#### Mobile (< 640px)
- All sections stack vertically in a single column
- **Stat cards**: 2x2 grid (2 columns, 2 rows), each card takes half width
- **Month navigation**: Title on one line with arrows, may wrap date range to second line
- **Heatmap**: Horizontally scrollable if month has 5+ weeks, 12px squares
- **Bar chart**: Full width, may use horizontal bars for better readability
- **Highlight cards**: Stack vertically (1 column)
- **AI insight cards**: Single column
- **Email preview modal**: Full-screen overlay
- **Touch targets**: All interactive elements >= 44px
- **Share button**: Full width

#### Tablet (640px-1024px)
- Single column for most sections
- **Stat cards**: 4-across row (may compress to 2x2 if width < 768px)
- **Highlight cards**: 3-across row
- **AI insight cards**: May use 2-column grid
- **Heatmap**: 16px squares, fits most months without scrolling
- **Bar chart**: Full width with vertical bars

#### Desktop (> 1024px)
- Max content width: `max-w-5xl` centered (matches `/insights` page)
- **Stat cards**: 4-across row with comfortable spacing
- **Highlight cards**: 3-across row
- **AI insight cards**: 2-column grid
- **Heatmap**: 16px squares, fits comfortably
- **Bar chart**: Full width within container
- **Email preview**: Centered modal with max width ~600px (standard email width)

---

## Edge Cases

- **No mood entries for selected month**: Stat cards show "0 of [days]", heatmap shows all empty squares, bar chart shows zero-height bars, highlights show "No data yet — start checking in to see your journey!" message. AI insight cards still show (they're mock content, not data-driven).
- **Partial month (current month in progress)**: "Days active" denominator is days elapsed so far, not total days in month. E.g., if it's March 15 and user checked in 10 times: "10 of 15".
- **First month ever**: No "previous month" arrow available. Level progress shows starting level with 0%.
- **Month with no streak data**: Longest streak highlight shows "0 days" with encouraging message.
- **Month with no badges**: Badge highlight shows "No new badges this month — keep going!" with encouraging message.
- **Navigating to a month before any data**: All sections show empty states with encouragement.
- **Corrupted localStorage**: All sections gracefully fall back to empty states. No errors thrown.
- **Level transition mid-month**: Level progress card shows "Seedling to Sprout 67%" — the starting and ending level for that month.
- **Very long month names**: "September" is the longest — ensure title doesn't overflow on mobile.
- **Email preview content**: Static mock data, does not change with selected month (simplified preview).

---

## Out of Scope

- **Real AI-generated insights** — Phase 3+ (requires OpenAI API integration with content safety checks from `01-ai-safety.md`)
- **Real email sending** — Phase 3+ (requires SMTP configuration per `08-deployment.md`)
- **Push notification for monthly report** — Phase 3+ (notification is in-app only via Spec 12's system)
- **Social sharing of report data** — Future (share button is a stub; mood data is private per privacy rules)
- **PDF export of monthly report** — Future enhancement
- **Comparison between months** (side-by-side) — Future enhancement
- **Real activity correlation computation** — Future (insight cards use hardcoded mock text)
- **Backend API persistence** — Phase 3 (all data from localStorage)
- **Dark mode toggle** — Phase 4 (pages are always dark)
- **Animated heatmap or chart transitions when switching months** — Keep it simple with crossfade
- **Custom date range for monthly report** — Always locked to calendar months

---

## Acceptance Criteria

### Part 1: Enhanced AI Insight Cards on `/insights`

- [ ] The `/insights` page Section 3 (AI Insight Cards) now draws from a pool of 11 distinct cards across 4 categories: trend summaries (4), activity correlations (3), scripture connections (2), personalized recommendations (2)
- [ ] Each card displays a category label above the text in muted uppercase style (`text-white/40 text-xs uppercase tracking-wider`)
- [ ] Each card displays a category-appropriate Lucide React icon (TrendingUp, Activity, BookOpen, Lightbulb)
- [ ] 3-4 cards are visible at a time, selected by daily rotation using `dayOfYear % totalCards` as starting index
- [ ] Visiting on different days shows a different set of cards (rotation changes daily)
- [ ] Cards maintain the frosted glass styling (`bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`)
- [ ] Cards render in 2-column grid on desktop (> 1024px), single column on mobile/tablet
- [ ] Disclaimer text appears below cards: "Insights are illustrative examples. Personalized AI insights coming soon."
- [ ] All card text is warm and encouraging in tone, never clinical

### Part 2: Monthly Report Page

#### Route & Navigation
- [ ] `/insights/monthly` is a protected route — unauthenticated users are redirected to the landing page
- [ ] The page is accessible via a "View Monthly Report" link/button on the `/insights` page
- [ ] The page is accessible via a "Monthly Report" item in the avatar dropdown menu
- [ ] Month navigation arrows allow browsing previous months (cannot navigate to future months)
- [ ] Default month is current month (or previous month if within first 5 days of new month)
- [ ] Earliest navigable month is the month of the user's first mood entry

#### Header
- [ ] Page title reads "Your [Month Name] Faith Journey" with the correct month name
- [ ] Date range subtitle shows the first and last day of the selected month
- [ ] Left/right arrows flank the title for month navigation
- [ ] Dark gradient background matches the dashboard/insights hero

#### Key Stats
- [ ] Four stat cards display in a horizontal row on desktop, 2x2 grid on mobile
- [ ] "Days Active" card shows "N of M" format with Calendar icon. Mock: "24 of 31"
- [ ] "Points Earned" card shows comma-formatted number with Star icon. Mock: "1,847"
- [ ] "Level Progress" card shows level transition + percentage with progress bar and TrendingUp icon. Mock: "Sprout to Blooming 67%"
- [ ] "Mood Trend" card shows directional arrow + percentage with Heart icon. Mock: up 12%. Green for improvement, amber for decline.
- [ ] Stat cards use frosted glass styling

#### Month Heatmap
- [ ] Heatmap reuses the same component/pattern as the `/insights` page heatmap
- [ ] Heatmap is locked to the selected month (shows only weeks belonging to that month)
- [ ] Same mood colors, square sizes (12px mobile, 16px desktop), tooltips, and labels as `/insights`
- [ ] Container title reads "Your [Month] at a Glance"

#### Top Activities Bar Chart
- [ ] Recharts `<BarChart>` renders with 6 activity categories on X-axis
- [ ] Each bar has a distinct color (Check-in: `#8B7FA8`, Pray: `#6D28D9`, Journal: `#2DD4BF`, Meditate: `#8B5CF6`, Listen: `#00D4FF`, Prayer Wall: `#F39C12`)
- [ ] Y-axis shows count values
- [ ] Dark chart theme (dark axes, grid lines, tooltip) matches the insights page
- [ ] Container title reads "Your Top Activities"

#### Highlight Moments
- [ ] Three highlight cards display in a row on desktop, stack on mobile
- [ ] "Longest Streak" card shows streak count with fire icon. Mock: "7 days"
- [ ] "Badges Earned" card shows count + mini badge thumbnails. Mock: "3 badges"
- [ ] "Best Day" card shows date + activity count + mood label. Mock: "February 12 — 5 activities, feeling Thriving"
- [ ] Highlight cards use frosted glass styling

#### AI Insight Cards
- [ ] 2-3 insight cards render on the monthly report, drawn from the same 11-card pool as Part 1
- [ ] Monthly report uses a different rotation offset than `/insights` so different cards appear: `(dayOfYear + 5) % totalCards`

#### Share Button
- [ ] A "Share Your Month" button renders at the bottom of the page
- [ ] Clicking the button shows a toast: "Sharing is coming soon! We're working on beautiful shareable cards for your faith journey."
- [ ] Button uses primary purple styling (`bg-primary text-white`)
- [ ] Toast uses the existing toast system

### Part 3: Email Template Preview
- [ ] A "Preview Email" link appears near the share button on the monthly report
- [ ] Clicking it opens a modal (or inline expansion) showing the email template
- [ ] Email preview shows subject line: "Your [Month] Faith Journey — Worship Room"
- [ ] Email preview renders with light background (white cards on light gray) contrasting the dark app
- [ ] Email preview contains: header, 4 key stats, a heatmap placeholder, 1 highlight, and a "View Full Report" button (non-functional)
- [ ] Disclaimer below preview: "Email reports coming soon. This is a preview of what your monthly email will look like."

### Accessibility
- [ ] All chart containers have `aria-label` describing their content
- [ ] Month navigation arrows have `aria-label` (e.g., "Previous month", "Next month")
- [ ] Stat cards use semantic structure (heading + value)
- [ ] Bar chart has an `aria-label` with a text summary of the data
- [ ] `prefers-reduced-motion`: all animations (fade-in, stagger, count-up, crossfade) become instant
- [ ] All interactive elements have visible focus indicators
- [ ] All interactive elements have >= 44px touch targets on mobile
- [ ] Modal (email preview) traps focus and is dismissible with Escape key

### Responsive Layout
- [ ] Mobile (< 640px): Stat cards in 2x2 grid, highlight cards stacked, single column layout, bar chart full width, share button full width, email preview full-screen modal
- [ ] Tablet (640-1024px): Stat cards 4-across (or 2x2 if narrow), highlight cards 3-across, single/2-col insight cards
- [ ] Desktop (> 1024px): Max content width `max-w-5xl`, stat cards 4-across, highlight cards 3-across, 2-col insight cards, email modal centered at ~600px

### Visual Design
- [ ] Page background uses dark gradient (`from-hero-dark to-hero-mid`)
- [ ] All section cards use frosted glass pattern from design system
- [ ] Mood heatmap colors match the Mood Color Palette exactly
- [ ] Bar chart colors are distinct and match the specified hex values
- [ ] Section spacing is generous and consistent (`gap-6` or `space-y-6`)
- [ ] Page feels celebratory yet peaceful — not a clinical analytics dashboard
