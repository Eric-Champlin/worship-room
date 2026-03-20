# Feature: Daily Devotional Dashboard Integration and Mood Personalization

**Master Plan Reference:** This is Spec 17 of Phase 2.9 — the second of a 2-spec devotional sequence. Spec 16 (`daily-devotional-page.md`) builds the `/devotional` page and content model.
- Shared data models: Consumes devotional content array from Spec 16's constants file (30 devotional entries with `id`, `dayIndex`, `title`, `theme`, `quote`, `passage`, `reflection`, `prayer`, `reflectionQuestion`). Consumes `wr_devotional_reads` localStorage key (array of date strings) from Spec 16. Consumes `wr_daily_activities` and `wr_mood_entries` from the Dashboard & Growth specs. Consumes mood-to-content recommendation mapping from Spec 5 (Mood Recommendations).
- Cross-spec dependencies: Spec 16 (Daily Devotional Page) provides the devotional data model, `wr_devotional_reads`, and the `/devotional` route. Spec 2 (Dashboard Shell) provides `DashboardCard`, dashboard grid layout, `AuthProvider`, `DashboardHero`. Spec 5 (Mood Recommendations) provides the recommendation card system and `DashboardPhase` flow. Spec 6 (Dashboard Widgets & Activity Integration) provides `useFaithPoints` and `recordActivity()`. Spec 15 (Verse of the Day Share Card) provides the dashboard "Verse of the Day" widget that this widget is positioned after. Spec 4 (Getting Started Checklist) provides the checklist card that the weekly banner appears below.
- Shared constants: Mood values (1-5: Struggling, Heavy, Okay, Good, Thriving) from `constants/dashboard/mood.ts`. Devotional themes from Spec 16. Activity point weights from `constants/dashboard/activity-points.ts`.

---

## Overview

The daily devotional page (Spec 16) established Worship Room's most common daily content format — a structured morning devotional with quote, passage, reflection, prayer, and question. This spec connects that devotional experience to the rest of the app through three integrations that make the devotional a living part of the dashboard and the mood-based personalization system.

First, a **dashboard widget** gives logged-in users a daily at-a-glance preview of today's devotional, showing whether they've read it and providing a direct link to the full experience. Second, **mood-based personalization** surfaces today's devotional as a recommendation card after the mood check-in when the devotional's theme matches the user's current emotional state — guiding someone who selected "Struggling" toward a devotional about trust or anxiety-and-peace, rather than a generic list of activities. Third, a **weekly "God Moments" summary banner** provides a warm retrospective of the past week's spiritual engagement — devotionals read, activities completed, and mood trajectory — creating a weekly rhythm of reflection and gratitude.

Together, these integrations transform the devotional from an isolated page into a connected thread woven through the daily experience.

---

## User Stories

- As a **logged-in user**, I want to see today's devotional title and a preview on my dashboard so that I'm reminded to read it without having to navigate to a separate page.
- As a **logged-in user** who has already read today's devotional, I want the dashboard widget to show a completion indicator so that I feel a sense of daily rhythm and accomplishment.
- As a **logged-in user** who just completed the mood check-in, I want to see the daily devotional recommended to me when its theme matches how I'm feeling so that scripture meets me exactly where I am emotionally.
- As a **logged-in user** returning on Monday (or the first visit of the week), I want to see a brief summary of my week with God so that I can reflect on my spiritual engagement and feel encouraged about my journey.
- As a **logged-in user** who is new to the app, I do not want to see the weekly summary until I have enough activity history to make it meaningful.

---

## Requirements

### Feature 1: Dashboard "Today's Devotional" Widget

#### Widget Placement

1. **New "Today's Devotional" widget card** in the dashboard widget grid, positioned after the Verse of the Day widget in grid order. The widget lives in the left column of the 2-column desktop layout (same column as Mood Chart and Verse of the Day).

2. **Uses the standard `DashboardCard` component** with collapsible behavior. Card title: "Today's Devotional" with a book icon (Lucide `BookOpen`). Collapsible like all dashboard cards.

#### Widget Content — Unread State

3. **Devotional title** in bold white text (`text-base font-semibold text-white`), displayed as the first line of content.

4. **Theme tag** displayed as a small pill next to or below the title: `bg-white/10 rounded-full text-xs px-2.5 py-0.5 text-white/60`. Shows the devotional's theme name in title case (e.g., "Anxiety and Peace", "Gratitude", "Trust").

5. **2-line preview** of the reflection's first paragraph, truncated with ellipsis (`line-clamp-2 text-sm text-white/60 leading-relaxed`). This gives the user a taste of the reflection without revealing the full content.

6. **CTA link**: "Read today's devotional" with a right arrow character, styled in `text-sm text-primary-lt hover:text-primary font-medium`. Links to `/devotional`.

#### Widget Content — Read State

7. **Completion detection**: Check `wr_devotional_reads` localStorage key (owned by Spec 16) for today's date string. If today's date is present, the user has read today's devotional.

8. **Green checkmark** (Lucide `Check` icon, `text-success`) displayed inline next to the devotional title to indicate completion.

9. **CTA link changes** to "Read again" with softer styling: `text-sm text-white/50 hover:text-white/70 font-medium` instead of the primary-lt color.

10. **All other content** (title, theme tag, preview) remains the same in both states — only the checkmark and link styling differ.

#### Widget Styling

11. **Standard frosted glass dashboard card**: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`, padding `p-4 md:p-6`.

### Feature 2: Mood-Based Devotional Personalization

#### Theme-to-Mood Mapping

12. **Add a `moodRelevance` mapping** to the devotional data. Each of the 10 devotional themes maps to 1-2 mood values (1-5) where it is most thematically relevant:

| Theme | Relevant Moods | Rationale |
|-------|---------------|-----------|
| trust | 1 (Struggling), 2 (Heavy) | Trust is needed most when life feels hardest |
| gratitude | 4 (Good), 5 (Thriving) | Gratitude flows naturally from positive states |
| forgiveness | 1 (Struggling), 2 (Heavy) | Forgiveness is healing when carrying weight |
| identity | 2 (Heavy), 3 (Okay) | Identity questions emerge in uncertain states |
| anxiety-and-peace | 1 (Struggling), 2 (Heavy) | Peace is the antidote to anxiety |
| faithfulness | 3 (Okay), 4 (Good) | Recognizing God's faithfulness in steady moments |
| purpose | 3 (Okay), 4 (Good) | Purpose-seeking in neutral-to-positive states |
| hope | 1 (Struggling), 2 (Heavy) | Hope is most needed in the darkest times |
| healing | 1 (Struggling), 2 (Heavy) | Healing speaks directly to pain |
| community | 4 (Good), 5 (Thriving) | Pouring into community when feeling strong |

13. **This mapping is a static constant** stored alongside the devotional data. It does not modify the devotional entries themselves — it's a separate lookup object keyed by theme.

#### Integration with Mood-to-Content Recommendations

14. **After the mood check-in**, when the mood-to-content recommendation cards render (Spec 5's `'recommendations'` phase), check whether today's devotional's theme maps to the user's selected mood value.

15. **If the theme matches**: Insert "Read today's devotional" as the **first** recommendation card (before the existing 3 suggestions), pushing the list to 4 cards total. The devotional card has:
    - Icon: Lucide `BookOpen` in the mood's accent color
    - Title: "Read Today's Devotional"
    - Description: Today's devotional title (e.g., "Finding Peace in the Storm")
    - Target route: `/devotional`
    - Left border accent: same mood-colored 4px border as other recommendation cards

16. **If the theme does not match**: Do not include the devotional in the recommendations. Show the existing 3 recommendation cards unchanged. Do not force a devotional recommendation when the content isn't relevant to the user's emotional state.

17. **If the user has already read today's devotional** (checked via `wr_devotional_reads`): Do not show the devotional recommendation even if the theme matches. The user has already read it — don't suggest something they've completed.

### Feature 3: Weekly "God Moments" Summary Banner

#### Display Conditions

18. **Show the banner when ALL of the following are true**:
    - User is authenticated
    - It is Monday (local time) OR this is the user's first dashboard visit of the current week (store `wr_weekly_summary_last_shown` with the current week's Monday date string — if no entry for this week, show the banner)
    - The banner has not been dismissed for this week (`wr_weekly_summary_dismissed` does not contain this week's Monday date string)
    - The user has at least 3 days of activity data in the past 14 days (check `wr_daily_activities` for entries from the last 14 days — count distinct dates with at least one activity recorded). This prevents showing an empty or misleading summary to brand new users.

19. **Do not show** the banner to users who have been active for fewer than 3 days in the past 2 weeks. They don't have enough data for a meaningful summary.

#### Banner Placement

20. **Position**: Below the `DashboardHero`, above the dashboard widget grid. If the Getting Started Checklist (Spec 4) is visible, the banner appears between the DashboardHero and the Getting Started Checklist. If the Getting Started Checklist is not visible, the banner appears between the DashboardHero and the first row of widgets.

#### Banner Content

21. **Heading**: "Your Week with God" in `font-semibold text-lg text-white`.

22. **Three stats** displayed in a horizontal row on desktop, stacked vertically or in a compact grid on mobile:

**Stat 1: Devotionals Read**
- Count of dates in `wr_devotional_reads` that fall within the past 7 days
- Display: "[X] of 7 devotionals" with a Lucide `BookOpen` icon
- If 7/7: accent color (success green) to celebrate consistency

**Stat 2: Total Activities**
- Count of total activities completed across the past 7 days (sum of all `true` values in `wr_daily_activities` for each day in the past 7 days — includes pray, journal, meditate, listen, prayerWall, mood)
- Display: "[X] activities this week" with a Lucide `CheckCircle` icon

**Stat 3: Mood Trend**
- Compare the average mood value for this past week (last 7 days) with the average mood value for the week before that (days 8-14 ago)
- Three possible states:
  - **Improving**: This week's average > last week's average (difference > 0.2). Display: "Improving" with a Lucide `TrendingUp` icon in success green
  - **Steady**: Averages are within 0.2 of each other (|difference| <= 0.2). Display: "Steady" with a Lucide `Minus` icon in `text-white/60`
  - **Needs Grace**: This week's average < last week's average (difference < -0.2). Display: "Needs grace" with a Lucide `Heart` icon in a warm amber/orange color. The phrasing "Needs grace" is intentionally compassionate — never "declining" or "worse"
- If insufficient mood data for comparison (fewer than 2 entries in either week): Display "Keep checking in" with a Lucide `TrendingUp` icon in `text-white/40` — encouraging without making a false comparison

#### Banner Styling

23. **Distinct frosted glass style** to stand out from regular dashboard cards: `bg-primary/10 border border-primary/20 rounded-2xl`. This gives the banner a subtle purple tint that distinguishes it from the neutral frosted glass cards.

24. **Padding**: `p-4 md:p-6`.

25. **Dismiss button**: An "X" close button (Lucide `X`) in the top-right corner. `text-white/40 hover:text-white/60`. Clicking it:
    - Stores this week's Monday date string in `wr_weekly_summary_dismissed` in localStorage
    - Hides the banner with a fade-out animation (300ms)
    - The banner will not reappear until the following Monday

#### Banner Dismissal Persistence

26. **`wr_weekly_summary_dismissed`**: A single date string in localStorage representing the Monday date of the most recently dismissed week. When the current week's Monday matches this value, the banner is hidden. When a new week starts (new Monday date), the old dismissal is no longer relevant, so the banner can reappear.

---

## Auth & Persistence

### Logged-out users (demo mode):
- **Never see any of these features.** The dashboard widget, mood recommendations, and weekly banner are all part of the authenticated dashboard experience. Logged-out users see the landing page at `/`.
- Zero data persistence. Zero cookies. Zero tracking.

### Logged-in users:
- **Dashboard widget**: Reads `wr_devotional_reads` (owned by Spec 16) and today's devotional data (computed from date). No new localStorage writes.
- **Mood recommendations**: Reads the mood value from React state (passed from check-in) and today's devotional theme (computed from date). Reads `wr_devotional_reads` to check if already read. No new localStorage writes.
- **Weekly banner**: Reads `wr_devotional_reads`, `wr_daily_activities`, and `wr_mood_entries`. Writes to `wr_weekly_summary_dismissed` (single date string) when dismissed.

### New localStorage Keys

| Key | Type | Description |
|-----|------|-------------|
| `wr_weekly_summary_dismissed` | string (date, `YYYY-MM-DD`) | Monday date of the most recently dismissed weekly summary. Prevents re-showing the banner for the same week. |

### Route type:
- No new routes. All three features are rendered within the existing dashboard at `/`.

### Auth gating per interactive element:

| Element | Logged-out behavior | Logged-in behavior |
|---------|--------------------|--------------------|
| Dashboard "Today's Devotional" widget | Not visible (dashboard is auth-gated) | Renders with title, theme pill, preview, and CTA link |
| Widget "Read today's devotional" link | Not visible | Links to `/devotional` |
| Widget completion checkmark | Not visible | Shows green check if today's devotional is read |
| Devotional in mood recommendations | Not visible (mood check-in is auth-gated) | Appears as first card when theme matches mood and devotional is unread |
| Weekly "God Moments" banner | Not visible (dashboard is auth-gated) | Shows on Monday/first weekly visit when conditions are met |
| Banner dismiss button | Not visible | Hides banner for the rest of the week |
| Banner stat links (if any) | Not visible | Display only — no links (stats are informational) |

---

## AI Safety Considerations

- **Crisis detection needed?**: No. These features display curated content and computed statistics — no user text input, no AI-generated content.
- **User input involved?**: No. All interactions are navigation clicks, dismissals, and viewing computed data.
- **AI-generated content?**: No. All text is hardcoded or computed from localStorage data.
- **Mood sensitivity note**: The weekly banner's "Needs grace" label is intentionally compassionate and non-clinical. It must never use language like "declining," "worsening," or "getting worse." The Heart icon reinforces warmth rather than alarm. A downward mood trend is framed as a call for self-compassion, not a failure indicator.

---

## UX & Design Notes

### Emotional Tone

The dashboard widget should feel like a gentle daily invitation — "there's something beautiful waiting for you today." The completion checkmark should feel like a quiet, satisfied nod, not a gamified achievement. The weekly banner should feel like a moment of gratitude and reflection — "look at what God did through your week" — not a performance report.

### Visual Design — Dashboard Widget

- **Standard frosted glass card**: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`, padding `p-4 md:p-6`
- **Title row**: Devotional title in `text-base font-semibold text-white`, with optional green checkmark (`text-success`, Lucide `Check`, 16px) inline when read
- **Theme pill**: `bg-white/10 rounded-full text-xs px-2.5 py-0.5 text-white/60` — subtle, informational
- **Preview text**: `text-sm text-white/60 leading-relaxed line-clamp-2` — truncated at 2 lines
- **CTA link (unread)**: `text-sm text-primary-lt hover:text-primary font-medium` with right arrow
- **CTA link (read)**: `text-sm text-white/50 hover:text-white/70 font-medium` — softer, less urgent
- **Card header**: "Today's Devotional" with Lucide `BookOpen` icon in `text-white/60`

### Visual Design — Mood Recommendation Card

- **Same card pattern** as existing recommendation cards from Spec 5: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl` with 4px mood-colored left border
- **Icon**: Lucide `BookOpen` at 24px in the mood's accent color
- **Title**: "Read Today's Devotional" in `font-semibold text-white text-base`
- **Description**: Today's devotional title (e.g., "Finding Peace in the Storm") in `text-sm text-white/60`
- **Position**: First card in the recommendation list (index 0), pushing existing cards to positions 2-4

### Visual Design — Weekly Banner

- **Background**: `bg-primary/10 border border-primary/20 rounded-2xl` — distinct from standard cards with a subtle purple tint
- **Heading**: "Your Week with God" in `font-semibold text-lg text-white`
- **Stats row**: 3 stats in a horizontal flex row on desktop, with dividers (`border-r border-white/10`) between them. Each stat has an icon (24px), a primary number/label, and a secondary descriptor.
- **Stat icons**: `text-white/60` by default; success green for 7/7 devotionals and "Improving"; warm amber for "Needs grace"; muted for "Steady"
- **Dismiss X**: `text-white/40 hover:text-white/60`, positioned top-right, 44px touch target
- **The banner should feel lighter and more celebratory than the data-heavy dashboard cards** — it's a moment of pause, not another data widget

### Design System Recon References

- **Dashboard card pattern**: Design system recon "Dashboard Card Pattern" — `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`
- **Recommendation card pattern**: Spec 5 — `bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl` with mood-colored left border
- **Mood accent colors**: Struggling=#D97706, Heavy=#C2703E, Okay=#8B7FA8, Good=#2DD4BF, Thriving=#34D399

### New Visual Patterns

1. **Weekly summary banner** (`bg-primary/10 border-primary/20 rounded-2xl`): A new card variant with a tinted background for emphasis. This is a **new pattern** — plan should mark the exact `bg-primary/10` rendering as `[UNVERIFIED]` until visually verified against the dark dashboard background.
2. **Stat row with dividers**: Horizontal stat display with `border-r border-white/10` dividers. New layout pattern for the dashboard.

---

## Responsive Behavior

### Mobile (< 640px)

- **Dashboard widget**: Full-width card in single-column stack. Title, theme pill, preview, and CTA link all stack vertically. Same content, no truncation differences beyond the existing 2-line clamp.
- **Mood recommendation**: Devotional card appears at top of the stacked vertical card list (same as other recommendation cards on mobile). Full width with `gap-3`.
- **Weekly banner**: Full-width. Stats stack vertically instead of horizontal row — each stat takes its own line with icon + text on the same line. No dividers between stats on mobile (dividers are desktop-only). Dismiss X in top-right corner. `p-4` padding.

### Tablet (640px - 1024px)

- **Dashboard widget**: Appears in the 2-column grid at its designated position (left column, after Verse of the Day).
- **Mood recommendation**: Devotional card appears at top of the stacked vertical card list. Content max-width ~600px centered.
- **Weekly banner**: Full-width spanning both columns. Stats in a horizontal row with dividers, same as desktop.

### Desktop (> 1024px)

- **Dashboard widget**: Left column of the 2-column dashboard grid, after Verse of the Day widget. `p-6` padding.
- **Mood recommendation**: Devotional card appears as the first card in the horizontal row (now 4 cards total if shown). Each card flexes equally.
- **Weekly banner**: Full-width spanning both columns. Stats in a horizontal row with dividers between them. `p-6` padding. Dismiss X at top-right.

---

## Edge Cases

- **Devotional feature not yet built (Spec 16 not implemented)**: If the devotional data or `wr_devotional_reads` key doesn't exist, the dashboard widget should gracefully handle this — either don't render, or show a fallback message. However, since this spec depends on Spec 16, the plan should ensure Spec 16 is implemented first.
- **User reads devotional mid-session**: The widget should update in real-time when the user navigates to `/devotional`, reads it (Intersection Observer fires), and returns to the dashboard. Use a `storage` event listener or re-read `wr_devotional_reads` on dashboard focus/mount.
- **Mood check-in skipped**: If the user skips mood check-in, the recommendations phase is skipped entirely (per Spec 5), so the devotional recommendation never renders. This is correct behavior.
- **All 10 themes mapped to at least one mood**: The mapping covers all 10 themes and all 5 mood values, but some moods have more matching themes than others. Struggling/Heavy have the most matches (trust, forgiveness, anxiety-and-peace, hope, healing). Good/Thriving have fewer (gratitude, community, faithfulness, purpose). This reflects the app's emotional healing focus.
- **Weekly banner on non-Monday first visit**: If the user's first visit of the week is on a Wednesday, the banner still shows (using `wr_weekly_summary_last_shown` to detect first weekly visit, not just Monday).
- **Week boundary**: "This week" is defined as Monday through Sunday. The Monday date string is computed from the current local date by finding the most recent Monday (or today if it's Monday).
- **Insufficient data for mood trend**: If fewer than 2 mood entries exist in either the current or previous week, the mood trend stat shows "Keep checking in" instead of a potentially misleading comparison.
- **Dismissal persists only for current week**: `wr_weekly_summary_dismissed` stores a single Monday date string, not an array. When a new week starts, the old Monday is no longer relevant, and the banner can reappear.
- **Recommendation card count increases to 4**: When the devotional recommendation is inserted, the recommendation screen shows 4 cards instead of 3. On desktop, this means 4 cards in a horizontal row. The layout should gracefully accommodate 3 or 4 cards without visual breakage. On mobile, cards stack vertically, so 4 cards just means one more card in the stack.
- **Devotional already read AND theme matches**: No recommendation shown. Completion takes priority over relevance.
- **Day boundary at midnight**: Widget and banner data is computed based on local date. Crossing midnight on the dashboard does NOT auto-update — data refreshes on next page load/navigation (same as all other date-based features).

---

## Out of Scope

- **Backend API**: Entirely frontend. No API endpoints. No database storage. All data from localStorage or computed from date.
- **Devotional activity tracking (faith points)**: Recording devotional reading as a trackable activity in `useFaithPoints` (e.g., `recordActivity('devotional')`) could be a future enhancement but is not part of this spec. The devotional completion is tracked via `wr_devotional_reads` (Spec 16) but does not feed into the gamification engine.
- **Weekly banner links to detailed insights**: The banner stats are display-only. Linking "3 of 7 devotionals" to a devotional history page or "12 activities" to the insights page could be a future enhancement.
- **Weekly email digest**: No email notification with the weekly summary. Post-MVP feature.
- **Customizable weekly banner content**: Users cannot choose which stats to show. Fixed 3-stat layout.
- **Historical weekly summaries**: No "see past weeks" feature. Only the current week's summary is available.
- **New routes**: No new pages or routes. This adds widgets and banners to the existing dashboard and integrates with the existing mood-to-content recommendation system.
- **Modifications to existing recommendation card count/layout**: The existing 3-card recommendation system (Spec 5) is extended to optionally show 4 cards when the devotional is relevant. The existing 3 cards are unchanged.
- **Push notifications for devotionals**: No notifications to remind users to read the daily devotional. Post-MVP feature.

---

## Acceptance Criteria

### Dashboard Widget — Display

- [ ] "Today's Devotional" widget card appears in the dashboard grid after the Verse of the Day widget
- [ ] Card uses frosted glass style: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`
- [ ] Card header shows "Today's Devotional" title with Lucide `BookOpen` icon
- [ ] Card is collapsible (matching existing `DashboardCard` behavior)
- [ ] Devotional title displays in bold white text (`text-base font-semibold text-white`)
- [ ] Theme tag pill displays next to or below the title (`bg-white/10 rounded-full text-xs text-white/60`)
- [ ] Theme names display in title case (e.g., "Anxiety and Peace", not "anxiety-and-peace")
- [ ] 2-line preview of the reflection's first paragraph is shown, truncated with ellipsis
- [ ] Widget only visible on the dashboard (which is auth-gated)

### Dashboard Widget — Unread State

- [ ] CTA link reads "Read today's devotional" with a right arrow, styled in `text-primary-lt`
- [ ] CTA link navigates to `/devotional`
- [ ] No checkmark icon is shown

### Dashboard Widget — Read State

- [ ] Green checkmark (Lucide `Check`, `text-success`) appears inline next to the devotional title
- [ ] CTA link reads "Read again" styled in `text-white/50` (softer than primary-lt)
- [ ] CTA link still navigates to `/devotional`
- [ ] Read state is detected by checking `wr_devotional_reads` for today's date string
- [ ] Widget updates when the user reads the devotional and returns to the dashboard (re-reads localStorage on mount/focus)

### Dashboard Widget — Data

- [ ] Today's devotional is computed using the same deterministic rotation as the `/devotional` page (`dayOfYear % 30`)
- [ ] Widget content matches what is shown on the `/devotional` page for the same day

### Mood-Based Personalization — Theme Mapping

- [ ] A static `THEME_TO_MOOD` mapping exists with all 10 themes mapped to 1-2 mood values
- [ ] The mapping covers: trust (1,2), gratitude (4,5), forgiveness (1,2), identity (2,3), anxiety-and-peace (1,2), faithfulness (3,4), purpose (3,4), hope (1,2), healing (1,2), community (4,5)
- [ ] The mapping is a separate constant, not embedded in the devotional data entries

### Mood-Based Personalization — Recommendation Card

- [ ] When the user's selected mood matches today's devotional theme, a devotional recommendation card appears as the first card in the recommendations phase
- [ ] Devotional card uses Lucide `BookOpen` icon at 24px in the mood's accent color
- [ ] Card title is "Read Today's Devotional"
- [ ] Card description is today's devotional title (e.g., "Finding Peace in the Storm")
- [ ] Card links to `/devotional`
- [ ] Card has the same frosted glass + mood-colored left border as other recommendation cards
- [ ] When the devotional card is shown, the recommendation screen displays 4 cards total (1 devotional + 3 existing)
- [ ] When the devotional theme does NOT match the mood, only the existing 3 recommendation cards appear
- [ ] When today's devotional has already been read (`wr_devotional_reads` contains today), the devotional card is NOT shown even if theme matches
- [ ] The recommendation cards layout gracefully handles both 3 and 4 cards on all breakpoints

### Weekly Banner — Display Conditions

- [ ] Banner shows when: user is authenticated AND it's Monday or the first dashboard visit of the week AND the banner has not been dismissed for this week AND the user has 3+ days of activity in the past 14 days
- [ ] Banner does NOT show for users with fewer than 3 days of activity in the past 14 days
- [ ] Banner does NOT show if `wr_weekly_summary_dismissed` contains this week's Monday date string
- [ ] "This week's Monday" is computed as the most recent Monday (or today if Monday) in local time

### Weekly Banner — Content

- [ ] Heading reads "Your Week with God" in `font-semibold text-lg text-white`
- [ ] Stat 1 shows devotionals read in the past 7 days as "X of 7 devotionals" with Lucide `BookOpen` icon
- [ ] If 7/7 devotionals, the stat uses success green accent
- [ ] Stat 2 shows total activities completed in the past 7 days with Lucide `CheckCircle` icon
- [ ] Stat 3 shows mood trend comparison (this week vs last week averages, 0.2 threshold)
- [ ] "Improving" shown with Lucide `TrendingUp` in success green when this week's average > last week's by more than 0.2
- [ ] "Steady" shown with Lucide `Minus` in `text-white/60` when averages are within 0.2
- [ ] "Needs grace" shown with Lucide `Heart` in warm amber when this week's average < last week's by more than 0.2
- [ ] "Keep checking in" shown when insufficient mood data for comparison (fewer than 2 entries in either week)

### Weekly Banner — Styling

- [ ] Banner uses `bg-primary/10 border border-primary/20 rounded-2xl` (distinct from standard frosted glass cards)
- [ ] Banner padding is `p-4 md:p-6`
- [ ] Dismiss X button is in the top-right corner with `text-white/40 hover:text-white/60`
- [ ] Dismiss X meets 44px minimum touch target

### Weekly Banner — Dismissal

- [ ] Clicking dismiss X stores this week's Monday date string in `wr_weekly_summary_dismissed`
- [ ] Banner hides with a fade-out animation (300ms)
- [ ] Banner does not reappear for the rest of the week after dismissal
- [ ] When a new week starts, the old dismissal is no longer relevant — the banner can reappear

### Weekly Banner — Placement

- [ ] Banner appears below the DashboardHero and above the widget grid
- [ ] If the Getting Started Checklist is visible, the banner appears between the DashboardHero and the Getting Started Checklist
- [ ] Banner spans the full width of the dashboard on all breakpoints

### Responsive Layout

- [ ] Mobile (< 640px): Dashboard widget full-width in single-column stack; Weekly banner stats stack vertically; Recommendation cards stack vertically (4 cards if devotional shown)
- [ ] Tablet (640-1024px): Dashboard widget in 2-column grid; Weekly banner full-width with horizontal stats; Recommendation cards stack vertically
- [ ] Desktop (> 1024px): Dashboard widget in left column after Verse of the Day; Weekly banner full-width spanning both columns with horizontal stats; Recommendation cards in horizontal row (3 or 4 cards)
- [ ] All interactive elements meet 44px minimum touch target

### Accessibility

- [ ] Dashboard widget uses standard `DashboardCard` accessibility (section with aria-labelledby, collapsible with aria-expanded)
- [ ] Widget CTA link is keyboard-accessible with visible focus indicator
- [ ] Green checkmark has appropriate aria-label (e.g., "Completed") for screen readers
- [ ] Recommendation card for devotional is keyboard-navigable and has a clear accessible name
- [ ] Weekly banner dismiss button has aria-label (e.g., "Dismiss weekly summary")
- [ ] Banner stats are readable by screen readers (icon labels are not sufficient — text descriptions must be present)
- [ ] Mood trend icons have aria-labels (e.g., "Mood trend: improving")
- [ ] `prefers-reduced-motion`: banner dismiss fade-out and any entrance animations are disabled

### Visual Verification

- [ ] Dashboard widget matches other frosted glass dashboard cards in border, backdrop-blur, and padding
- [ ] Theme pill is subtle and doesn't compete with the title
- [ ] Green checkmark is visible but not overpowering (16px, inline with title)
- [ ] Weekly banner's `bg-primary/10` tint is visually distinguishable from standard `bg-white/5` cards on the dark dashboard background
- [ ] Banner stat dividers are subtle (`border-white/10`) and don't dominate the layout
- [ ] Mood recommendation card with `BookOpen` icon is visually consistent with other recommendation cards

### No Regressions

- [ ] Existing dashboard widgets (Mood Chart, Activity Checklist, Streak & Points, Friends Preview, Quick Actions, Verse of the Day) are unchanged
- [ ] Existing mood-to-content recommendation cards (3 cards per mood) are unchanged when devotional is not relevant
- [ ] The `/devotional` page (Spec 16) is unaffected
- [ ] Existing `wr_devotional_reads` localStorage key behavior (Spec 16) is unchanged — only read, never written to by this spec
- [ ] Existing `wr_daily_activities` and `wr_mood_entries` are unchanged — only read, never written to by this spec
- [ ] No existing localStorage keys are modified
- [ ] No existing routes are modified
