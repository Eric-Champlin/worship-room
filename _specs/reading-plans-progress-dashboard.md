# Feature: Reading Plans Progress Tracking & Dashboard Widget

**Spec sequence:** This is Spec 2 of a 3-spec reading plans sequence, building on Spec 1 (`reading-plans-browser.md`) which delivers the `/reading-plans` browser page, `/reading-plans/:planId` detail view, day content rendering, day locking/completion via Intersection Observer, and the `wr_reading_plan_progress` localStorage data model. Spec 3 will add AI-powered plan recommendations and personalized plan generation.

**Master Plan Reference:** Consumes data models and integration points from the Dashboard & Growth specs (Phase 2.75):
- Shared data models: `wr_reading_plan_progress` (owned by Spec 1/reading-plans-browser), `wr_daily_activities` and `wr_faith_points` and `wr_streak` (owned by Streak & Faith Points Engine spec), `wr_badges` (owned by Badge Definitions spec), `wr_mood_entries` (owned by Mood Check-In spec), `wr_devotional_reads` and devotional theme-to-mood mapping (owned by Devotional specs)
- Cross-spec dependencies: Spec 1 (Reading Plans Browser) provides the reading plan data model, day completion mechanism (Intersection Observer), `wr_reading_plan_progress` key, and all page routes. Dashboard Shell spec provides `DashboardCard`, dashboard grid layout, `AuthProvider`. Streak & Faith Points Engine spec provides `useFaithPoints()`, `recordActivity()`, `ACTIVITY_POINTS`. Badge Definitions spec provides badge definitions array, `checkForNewBadges()`, `wr_badges` activity counters. Dashboard Widgets & Activity Integration spec provides the Activity Checklist widget, its item list, and SVG progress ring. Mood Recommendations spec provides the recommendation card system and `DashboardPhase` flow. Devotional Dashboard Integration spec provides the theme-to-mood mapping pattern and devotional widget placement pattern. Insights Full Page spec provides the activity correlations section pattern.
- Shared constants: `ACTIVITY_POINTS` from `constants/dashboard/activity-points.ts`, `MOOD_COLORS` from `constants/dashboard/mood-colors.ts`, badge definitions from `constants/dashboard/badges.ts`, level thresholds from `constants/dashboard/levels.ts`

---

## Overview

The reading plans browser page (Spec 1) lets users discover, start, and read through multi-day scripture plans. But completing a day's reading currently ends with a quiet content boundary — no celebration, no points, no connection to the rest of the app. This spec transforms reading plan completion into a fully integrated part of Worship Room's gentle gamification ecosystem and daily rhythm.

Three features work together to weave reading plans into the fabric of the app. First, **enhanced progress tracking with gamification integration** turns each day's completion into a satisfying micro-celebration with faith points, streak credit, and badge progress — giving users the same positive feedback loop they experience when praying, journaling, or meditating. Second, a **dashboard widget** keeps the user's active reading plan visible on their home screen with a progress bar, current day preview, and quick link to continue reading. Third, **cross-feature connections** surface reading plans contextually — on the devotional page when themes align, in mood-based recommendations when a plan is active, and in insights analytics alongside other spiritual activities.

Together, these integrations elevate reading plans from a standalone page into a connected thread woven through the daily experience — encouraging consistent engagement without pressure, celebrating completion without guilt over gaps.

---

## User Stories

- As a **logged-in user** who just finished a day's reading, I want to see a satisfying completion moment with points earned so that I feel rewarded for investing in my spiritual growth.
- As a **logged-in user** who completed the final day of a plan, I want a full-screen celebration with a meaningful verse so that the moment feels like a real milestone in my faith journey.
- As a **logged-in user** who completes reading plans, I want to earn badges for finishing plans so that I have something to show for my sustained commitment.
- As a **logged-in user** with an active plan, I want to see my progress on the dashboard so that I'm reminded to continue reading without navigating away from home.
- As a **logged-in user** without a plan, I want to see suggested plans on the dashboard so that I can discover content that matches my emotional state.
- As a **logged-in user** reading today's devotional, I want to see a related reading plan suggestion so that I can go deeper on topics that resonate with me.
- As a **logged-in user** checking my insights, I want to see how reading plan completion correlates with my mood so that I can understand how structured scripture reading affects my wellbeing.
- As a **logged-in user** who just checked in with my mood, I want "Continue your reading plan" to appear as a recommendation so that I'm gently nudged toward my active plan.

---

## Requirements

### Feature 1: Enhanced Progress Tracking with Gamification Integration

#### Day Completion Celebration (Inline)

1. **When the Intersection Observer fires** at the bottom of a day's content (the existing completion mechanism from Spec 1), and the day is newly completed (not a re-read), display an inline celebration at the bottom of the day content. This celebration appears below the action step section, within the same scrollable content area.

2. **Inline celebration content:**
   - A green checkmark animation: SVG circle with a checkmark path that draws itself using `stroke-dasharray` and `stroke-dashoffset` animation over 500ms. The circle is `text-success` color (#27AE60), approximately 48px diameter.
   - Text: "Day X Complete" in bold white text (`text-lg font-bold text-white`), where X is the day number just completed.
   - Faith points earned: "+15 pts" displayed in `text-primary-lt` (#8B5CF6) next to or below the "Day X Complete" text. This reflects the 15 faith points awarded for the `readingPlan` activity.
   - "Continue to Day X+1" button: Primary CTA style (`bg-primary text-white font-semibold py-3 px-6 rounded-lg`), with a right arrow. Clicking advances to the next day's content within the same plan detail view.
   - If this is the last day of the plan, omit the "Continue" button — the plan completion overlay handles the next step.

3. **The celebration fades in** over 300ms (`animate-fade-in` or equivalent) after the Intersection Observer fires, creating a gentle reveal rather than a jarring pop-in.

4. **Respect `prefers-reduced-motion`**: If the user prefers reduced motion, show the checkmark and text immediately without the draw animation and without the fade-in.

#### Plan Completion Overlay (Full-Screen)

5. **When a user completes the final day** of a reading plan (the last day's Intersection Observer fires), after the inline celebration displays for 1.5 seconds, show a full-screen celebration overlay. The overlay covers the entire viewport with a semi-transparent dark backdrop.

6. **Plan completion overlay content:**
   - "Plan Complete!" in Caveat script font (`font-script`), large size (`text-4xl sm:text-5xl`), white text, centered
   - Plan title below in Inter bold (`text-xl font-bold text-white`)
   - "X days completed" in muted white text (`text-white/60`)
   - A perseverance verse in Lora italic (`font-serif italic text-white/80`): "I have fought the good fight, I have finished the race, I have kept the faith." with attribution "-- 2 Timothy 4:7 WEB" in smaller muted text
   - Confetti animation: colorful particles falling from the top of the screen, using the same confetti pattern as the existing `CelebrationOverlay.tsx` component. Duration: 3 seconds.
   - "Browse more plans" button: Primary CTA style, links to `/reading-plans`
   - A close/dismiss button (X icon in the top-right corner) that dismisses the overlay and returns to the completed plan page

7. **Overlay styling:** Background `bg-black/70 backdrop-blur-sm`, content centered vertically and horizontally in a frosted glass card (`bg-hero-mid/90 border border-white/15 rounded-2xl p-8 max-w-md mx-auto`). Focus is trapped within the overlay (reuse `useFocusTrap` hook).

8. **Respect `prefers-reduced-motion`**: If reduced motion is preferred, skip the confetti animation and show all content immediately without transitions. The overlay still appears, just without animated particles.

#### Faith Points Integration

9. **Add `readingPlan` as a new trackable activity** in the faith points system. Point value: **15**. This slots between `prayerWall` (15) and `meditate` (20) in the activity point hierarchy.

10. **When a day is completed**, call `recordActivity('readingPlan')` from the existing `useFaithPoints` hook. This:
    - Records the activity in `wr_daily_activities` for today
    - Awards 15 base points (adjusted by the daily multiplier)
    - Updates the user's total faith points, level, and streak in the respective localStorage keys
    - Triggers `checkForNewBadges()` to evaluate badge unlock conditions

11. **The `readingPlan` activity is a boolean per day** — completing multiple days of reading within the same calendar day only earns points once (same pattern as all other activities).

#### Badge Integration

12. **Add 3 new reading plan badges** to the badge definitions:

| ID | Name | Trigger | Celebration Tier |
|----|------|---------|-----------------|
| `first_plan` | First Plan | Complete any reading plan (1 plan `completedAt` is non-null) | toast-confetti |
| `plans_3` | Dedicated Reader | Complete 3 reading plans | toast-confetti |
| `plans_10` | Scripture Scholar | Complete all 10 reading plans | full-screen |

13. **Badge unlock detection**: After a plan is completed (all days finished and `completedAt` is set), check the count of completed plans in `wr_reading_plan_progress` (entries where `completedAt` is non-null). Compare against badge thresholds. This check runs inside the existing `checkForNewBadges()` flow.

14. **The `Scripture Scholar` badge uses the `full-screen` celebration tier** because completing all 10 plans represents extraordinary commitment. The overlay should include a verse: "Your word is a lamp to my feet, and a light for my path." -- Psalm 119:105 WEB.

#### Streak & Activity Checklist Integration

15. **Add "Complete a reading" as a 7th item** on the Activity Checklist dashboard widget. This item:
    - Display name: "Complete a reading"
    - Point value: 15
    - Icon: Lucide `BookOpen`
    - **Conditional visibility**: This item only appears on the checklist when the user has at least one active (in-progress, non-completed) plan in `wr_reading_plan_progress`. If the user has never started a plan, or all plans are completed/paused with none active, the checklist remains at 6 items.
    - When the item is visible, the progress ring denominator updates from 6 to 7 (e.g., "3/7" instead of "3/6"). The progress ring percentage scales accordingly.

16. **Completing a day's reading counts toward the daily streak.** The `readingPlan` activity is tracked in `wr_daily_activities` alongside the existing 6 activities. Any activity completion (including `readingPlan`) on a given day counts as an active day for streak purposes, using the existing streak logic.

17. **The daily multiplier tiers remain the same thresholds** (0-1: 1x, 2-3: 1.25x, 4-5: 1.5x, 6+: 2x), but with 7 possible activities instead of 6, the "Full Worship Day" badge trigger should update to require all 7 activities when the reading plan item is visible, or all 6 when it is not. The 2x multiplier triggers at 6+ activities regardless.

### Feature 2: Dashboard Widget

#### Widget Placement & Structure

18. **New "Reading Plan" widget card** in the dashboard widget grid. Positioned after the "Today's Devotional" widget in grid order. Lives in the left column of the 2-column desktop layout.

19. **Uses the standard `DashboardCard` component** with collapsible behavior. Card title: "Reading Plan" with a Lucide `BookOpen` icon. Collapsible like all dashboard cards.

#### Active Plan State

20. **When the user has an active (in-progress) plan**, the widget shows:
    - **Plan title** in bold white text (`text-base font-semibold text-white`)
    - **Progress bar**: thin horizontal bar (`h-2 rounded-full bg-white/10`), filled portion in `bg-primary`, matching the plan detail hero progress bar from Spec 1. Label below: "Day X of Y (Z%)" in `text-sm text-white/50`
    - **Current day title**: the title of the next uncompleted day (e.g., "Day 3: Letting Go of Control") in `text-sm text-white/70`
    - **"Continue reading" link**: `text-sm text-primary-lt hover:text-primary font-medium`, with a right arrow. Links to `/reading-plans/:planId`. When clicked, the plan detail page should auto-scroll to the current day's content.
    - **Reading streak stat**: "X day reading streak" in small muted text (`text-xs text-white/40`), showing the consecutive days the user has completed a reading plan day. This is a separate counter from the main app streak — it counts consecutive calendar days where the `readingPlan` activity was recorded in `wr_daily_activities`. If 0, this line is hidden.

21. **Progress bar accessibility**: The progress bar has `role="progressbar"` with `aria-valuenow` (completed days count), `aria-valuemin="0"`, `aria-valuemax` (total plan days), and `aria-label="Reading plan progress"`.

#### No Active Plan — Discovery State

22. **When the user has no active plan** (never started one, or all are completed/paused), show a compact discovery state:
    - Heading: "Start a reading plan" in `text-base font-semibold text-white`
    - **2-3 suggested plan mini-cards**: Show plans whose themes match the user's most common mood from the past 7 days. Use the same theme-to-mood mapping pattern established in the Devotional Dashboard Integration spec:

| Plan Theme | Relevant Moods |
|------------|---------------|
| anxiety | 1 (Struggling), 2 (Heavy) |
| grief | 1 (Struggling), 2 (Heavy) |
| gratitude | 4 (Good), 5 (Thriving) |
| identity | 2 (Heavy), 3 (Okay) |
| forgiveness | 1 (Struggling), 2 (Heavy) |
| trust | 1 (Struggling), 2 (Heavy) |
| hope | 1 (Struggling), 2 (Heavy) |
| healing | 1 (Struggling), 2 (Heavy) |
| purpose | 3 (Okay), 4 (Good) |
| relationships | 4 (Good), 5 (Thriving) |

    - Each mini-card: plan cover emoji + title in a single row, clickable, links to `/reading-plans/:planId`. Styled as `bg-white/5 rounded-lg p-3 hover:bg-white/10 transition-colors cursor-pointer`.
    - If no mood data exists (new user), show the first 3 beginner plans as defaults.
    - **"Browse all plans" link**: `text-sm text-primary-lt hover:text-primary font-medium` with right arrow, links to `/reading-plans`.

#### Plan Completed — Celebration State

23. **When the user's most recently completed plan has no newer active plan**, show:
    - Green checkmark icon + "You completed [Plan Title]!" in `text-base font-semibold text-white`
    - The plan's cover emoji displayed prominently
    - "Start another plan" CTA link in `text-sm text-primary-lt hover:text-primary font-medium`, linking to `/reading-plans`
    - This state persists until the user starts a new plan, at which point it transitions to the active plan state.

#### Widget Styling

24. **Standard frosted glass dashboard card**: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`, padding `p-4 md:p-6`. Same as all other dashboard cards.

### Feature 3: Cross-Feature Connections

#### Devotional Page — Related Reading Plan Callout

25. **On the `/devotional` page**, add a "Related Reading Plan" callout at the bottom of the devotional content (below the reflection question card, above the footer). This callout appears only when today's devotional theme matches a reading plan's theme.

26. **Matching logic**: Compare today's devotional entry's `theme` field against the 10 reading plans' `theme` fields. If there is an exact match (e.g., devotional theme "trust" matches the plan "Learning to Trust God" with theme "trust"), show the callout.

27. **Callout content:**
    - Label: "Go Deeper" in muted uppercase text (`text-xs uppercase tracking-wider text-white/40`)
    - Plan title in bold white text
    - Plan duration: "7-day plan" (or "14-day" / "21-day") in `text-sm text-white/50`
    - "Start this plan" link in primary-lt if the user hasn't started it, "Continue this plan" if already in progress, or "Completed" badge if finished
    - Styled as a frosted glass callout: `bg-white/5 border border-white/10 rounded-xl p-5 mt-8`

28. **Do not show the callout** if the user has already completed the matching plan (no need to suggest what's already done) or if no plan theme matches today's devotional.

#### Insights Page — Activity Correlation

29. **On the `/insights` page**, add reading plan completion to the activity correlations section. This follows the same pattern as existing correlations for journal, meditation, and other activities.

30. **Correlation display**: "On days you completed a reading plan, your mood averaged X.X" where X.X is the average mood value (1-5) for days where the `readingPlan` activity was recorded in `wr_daily_activities`. Compare against the user's overall mood average. Display with the BookOpen icon and the same correlation card styling used by other activities.

31. **Only show this correlation** when the user has at least 3 days with both a mood entry and a `readingPlan` activity. Below that threshold, there's insufficient data for a meaningful correlation.

#### Mood-to-Content Recommendations

32. **After the mood check-in**, when the mood-to-content recommendation cards render, if the user has an active reading plan (in-progress, not completed), insert a "Continue your reading plan" recommendation card. This card:
    - Icon: Lucide `BookOpen` in the mood's accent color
    - Title: "Continue Your Reading Plan"
    - Description: Current day title from the active plan (e.g., "Day 3: Letting Go of Control")
    - Target route: `/reading-plans/:planId` (for the active plan)
    - Left border accent: mood-colored 4px border, same as other recommendation cards
    - Position: After any devotional recommendation card (if present), before the standard 3 suggestions. Maximum total cards remains manageable (up to 5: devotional + reading plan + 3 standard).

33. **Do not show this recommendation** if the user has already completed a reading plan day today (checked via `wr_daily_activities` for the `readingPlan` activity on today's date). If they've already read today, don't nag them to read again.

---

## Auth & Persistence

### Auth Gating Per Interactive Element

| Element | Logged-out behavior | Logged-in behavior |
|---------|--------------------|--------------------|
| Day completion inline celebration | Not shown (completion tracking doesn't fire for logged-out users per Spec 1) | Shown with checkmark animation, points, and continue button |
| Plan completion overlay | Not shown | Full-screen celebration with confetti and verse |
| Faith points recording | Not applicable | `recordActivity('readingPlan')` called on day completion |
| Badge unlock | Not applicable | Checked on plan completion |
| Activity Checklist reading item | Not shown (entire dashboard is auth-gated) | Shown when user has an active plan |
| Dashboard widget | Not shown (entire dashboard is auth-gated) | Shown in dashboard grid with appropriate state |
| Devotional related plan callout | Auth modal on "Start this plan" link: "Sign in to start this reading plan" | Full interaction |
| Insights correlation | Not shown (`/insights` is auth-gated) | Shown when sufficient data exists |
| Mood recommendation card | Not shown (mood check-in is auth-gated) | Shown when user has active plan and hasn't read today |

### Persistence

- **No new localStorage keys introduced.** This spec writes to existing keys:
  - `wr_reading_plan_progress` (owned by Spec 1) — read to determine plan state
  - `wr_daily_activities` (owned by Streak & Faith Points Engine) — written via `recordActivity('readingPlan')`
  - `wr_faith_points` (owned by Streak & Faith Points Engine) — updated via `recordActivity()`
  - `wr_streak` (owned by Streak & Faith Points Engine) — updated via `recordActivity()`
  - `wr_badges` (owned by Badge Definitions) — updated via `checkForNewBadges()`
- **Logged-out users**: Zero persistence. No celebration, no points, no badge checks. Matches Spec 1's logged-out behavior.

---

## AI Safety Considerations

- **Crisis detection needed?**: No. This feature displays curated, hardcoded content and gamification feedback — no user text input, no AI-generated content.
- **User input involved?**: No. All interactions are button clicks and scroll-based completion detection.
- **AI-generated content?**: No. All celebration text, badge names, verses, and widget content are pre-authored.
- **Theological boundaries**: The perseverance verse (2 Timothy 4:7) and Psalm 119:105 are direct scripture quotes, not interpretive claims. Badge names use aspirational but non-authoritative framing ("Dedicated Reader" not "God's Scholar").

---

## UX & Design Notes

### Emotional Tone

Day completion should feel like a small, genuine moment of encouragement — "you showed up today and that matters." The inline celebration is brief and warm, not flashy. Plan completion should feel like finishing a meaningful journey — the full-screen overlay creates space for the moment to land. The dashboard widget should feel like a gentle nudge to keep going, never a guilt trip about falling behind.

### Visual Design — Inline Completion Celebration

- **Container**: Centered within the `max-w-2xl` content column, with `py-8` vertical padding above and below. Separated from the action step section by a `border-t border-white/10` divider.
- **Checkmark animation**: SVG with `stroke-dasharray` equal to the path length, animating `stroke-dashoffset` from full to 0 over 500ms with `ease-out` timing. Green (#27AE60) stroke, 3px width, on a transparent background.
- **Layout**: Checkmark centered, "Day X Complete" and "+15 pts" below the checkmark in a horizontal row (or stacked on mobile), "Continue" button below, all center-aligned.
- **Fade-in**: Entire celebration block fades in with `opacity 0 -> 1` and `translateY 10px -> 0` over 300ms.

### Visual Design — Plan Completion Overlay

- **Backdrop**: `fixed inset-0 bg-black/70 backdrop-blur-sm z-50`
- **Content card**: `bg-hero-mid/90 border border-white/15 rounded-2xl p-8 sm:p-10 max-w-md mx-auto`, centered vertically with flexbox
- **Confetti**: Reuse the confetti pattern from `CelebrationOverlay.tsx`. Particles in primary, primary-lt, success, and warning colors. Falls from top, fades out after 3s.
- **Typography**: "Plan Complete!" in `font-script text-4xl sm:text-5xl text-white`, plan title in `text-xl font-bold text-white mt-4`, verse in `font-serif italic text-white/80 text-base mt-6 leading-relaxed`, verse attribution in `text-white/40 text-sm mt-2`
- **Close button**: `absolute top-4 right-4`, X icon in `text-white/50 hover:text-white`

### Visual Design — Dashboard Widget

- **Active state layout**: Title + progress bar + current day + link + optional streak stat stacked vertically with `space-y-3`
- **Progress bar**: Same visual spec as Spec 1's plan detail hero progress bar (`h-2 rounded-full bg-white/10`, filled: `bg-primary`, animated width transition `transition-all duration-500`)
- **Discovery state mini-cards**: Horizontal row on desktop (up to 3), stacked on mobile. Each card is a compact row: emoji + title.
- **Completed state**: Checkmark icon in success green next to the completion message. Emoji displayed at `text-2xl`.

### Visual Design — Devotional Callout

- Matches the action step callout card from the reading plan detail page: `bg-white/5 border border-white/10 rounded-xl p-5`
- "Go Deeper" label acts as the section heading. Positioned with `mt-8` below the reflection question card.
- The CTA link uses the same primary-lt pattern as other devotional page links.

### Design System Recon References

- **Dashboard card pattern**: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`
- **Frosted glass callout**: Same as dashboard card but `rounded-xl` for smaller callouts
- **Primary CTA button**: `bg-primary text-white font-semibold py-3 px-6 rounded-lg`
- **Primary-lt link**: `text-primary-lt hover:text-primary font-medium`
- **Success color for checkmarks**: `#27AE60` (`text-success`)
- **Confetti overlay**: Existing `CelebrationOverlay.tsx` pattern
- **Progress bar**: Spec 1's linear progress pattern (`h-2 rounded-full`)

### New Visual Patterns

1. **Animated SVG checkmark**: A green checkmark that draws itself using stroke-dasharray animation. New animation pattern for Worship Room (existing celebrations use confetti and toasts, not self-drawing icons).
2. **Reading streak mini-stat**: A small inline streak counter within a widget card, distinct from the main streak card. New sub-pattern of the dashboard card.
3. **Mood-matched plan suggestions**: Mini-cards within a dashboard widget that surface content based on recent mood history. Extends the mood-to-content recommendation pattern from individual suggestions to inline widget suggestions.

---

## Responsive Behavior

### Mobile (< 640px)

- **Inline celebration**: Checkmark, text, and button stack vertically. Full-width "Continue" button. "+15 pts" wraps below "Day X Complete" if needed.
- **Plan completion overlay**: Content card takes full width minus 16px margins (`mx-4`). "Plan Complete!" at `text-4xl`. Verse text at comfortable reading size. Button full-width.
- **Dashboard widget (active)**: Full-width card. Progress bar full-width. All text stacks vertically.
- **Dashboard widget (discovery)**: Suggested plan mini-cards stack vertically (one per row).
- **Devotional callout**: Full-width with `px-4` padding. Text stacks vertically.
- **Activity checklist**: 7th item appears in the existing vertical list. Progress ring shows "X/7" when applicable.
- **Touch targets**: All buttons and links meet 44px minimum touch target.

### Tablet (640px - 1024px)

- **Inline celebration**: Checkmark centered, text and button in a comfortable centered layout. "Continue" button auto-width.
- **Plan completion overlay**: Content card at `max-w-md`, centered.
- **Dashboard widget**: Same as desktop within the dashboard grid.
- **Devotional callout**: Comfortable width within the `max-w-2xl` content column.

### Desktop (> 1024px)

- **Inline celebration**: Centered within `max-w-2xl` content column. Checkmark, "Day X Complete" and "+15 pts" in a horizontal row. "Continue" button below, centered.
- **Plan completion overlay**: Content card at `max-w-md`, centered vertically and horizontally.
- **Dashboard widget**: Within the left column of the 2-column dashboard grid. Same width as other left-column cards.
- **Devotional callout**: Within `max-w-2xl` devotional content column, comfortable padding.
- **Insights correlation**: Full-width within the correlations section, matching other correlation cards.

---

## Edge Cases

- **Completing multiple days in one session**: If a user reads Day 3, completes it, clicks "Continue to Day 4," reads Day 4, and completes it — each day gets its own inline celebration. Faith points only award once per day (the `readingPlan` activity is boolean per date), so the second day's "+15 pts" would not appear if both completions happen on the same calendar day.
- **Completing the last day mid-scroll**: The inline celebration appears first, then after 1.5 seconds the plan completion overlay appears on top. The user can dismiss the overlay to see the inline celebration underneath.
- **No mood data for widget suggestions**: If the user has no mood entries, the discovery widget falls back to showing the first 3 beginner plans (same as users without mood history).
- **All 10 plans completed**: The discovery state won't show suggestions (nothing left to suggest). Show a brief "You've completed all plans!" message with a soft achievement tone. No CTA needed — there's nothing else to start.
- **Paused plans**: A paused plan is not "active" — it does not appear in the dashboard widget's active state, does not add the 7th checklist item, and does not generate a mood recommendation. Only the single most-recently-started in-progress plan is considered active.
- **Reading plan activity on a day with no plan progress**: This shouldn't happen since `recordActivity('readingPlan')` is only called when a day is completed. But if it does (e.g., data corruption), the activity still counts for streak/multiplier purposes.
- **Devotional callout with multiple theme matches**: If somehow multiple plans match (shouldn't happen with distinct themes, but defensively), show only the first matching unstarted/in-progress plan. Ignore completed plans.
- **Widget state transitions**: When a plan is completed, the widget should transition from active to completed state on the next dashboard render. When a new plan is started, it transitions from discovery/completed to active state.

---

## Out of Scope

- **Backend API**: Entirely frontend. No API endpoints. No database storage. Backend persistence is Phase 3+.
- **AI-generated plan recommendations**: AI-powered plan suggestions are Spec 3.
- **Social sharing of plan progress**: Sharing completion milestones, recommending plans to friends — Spec 3.
- **Reading reminders/notifications**: No push notifications or daily reminders for plan progress — deferred.
- **Audio narration of plan content**: No TTS Read Aloud button for plan day content — may be added in a future spec.
- **Custom badge artwork**: Badge icons remain placeholder (colored circles with letter or star) — full badge art system is a future design effort.
- **Leaderboard integration**: Reading plan points contribute to the user's total faith points (which appear on leaderboards), but no separate reading plan leaderboard.
- **Landing page teaser**: No reading plans promotional content on the landing page.
- **Multiple simultaneous active plans**: The single active plan rule from Spec 1 remains. This spec does not change that constraint.

---

## Acceptance Criteria

### Day Completion Inline Celebration

- [ ] When a new day is completed (Intersection Observer fires for the current uncompleted day), an inline celebration appears below the day content
- [ ] Celebration shows a green checkmark SVG that draws itself over 500ms using stroke-dasharray animation
- [ ] Checkmark SVG is approximately 48px diameter in success green (#27AE60)
- [ ] "Day X Complete" text appears in bold white (`text-lg font-bold text-white`)
- [ ] "+15 pts" appears in primary-lt color (`text-primary-lt`)
- [ ] "Continue to Day X+1" button appears in primary CTA style, links to the next day's content
- [ ] On the final day of a plan, the "Continue" button is not shown
- [ ] Celebration fades in over 300ms with opacity and translateY animation
- [ ] `prefers-reduced-motion` disables the checkmark draw animation and fade-in (content appears immediately)
- [ ] Re-reading an already-completed day does not trigger the celebration

### Plan Completion Overlay

- [ ] After the final day's inline celebration displays for 1.5 seconds, a full-screen overlay appears
- [ ] Overlay has dark semi-transparent backdrop (`bg-black/70 backdrop-blur-sm`)
- [ ] "Plan Complete!" in Caveat script font (`font-script`), `text-4xl sm:text-5xl`, white
- [ ] Plan title displayed in Inter bold, `text-xl`, white
- [ ] "X days completed" shown in `text-white/60`
- [ ] Perseverance verse displayed: "I have fought the good fight..." -- 2 Timothy 4:7 WEB, in Lora italic
- [ ] Confetti animation plays for 3 seconds using the existing celebration confetti pattern
- [ ] "Browse more plans" button links to `/reading-plans`
- [ ] Close/dismiss button (X icon) in top-right corner dismisses the overlay
- [ ] Focus is trapped within the overlay (using `useFocusTrap`)
- [ ] Escape key dismisses the overlay
- [ ] `prefers-reduced-motion` disables confetti (overlay still appears with static content)

### Faith Points Integration

- [ ] `readingPlan` activity added to the activity tracking system with a point value of 15
- [ ] `recordActivity('readingPlan')` is called when a day is newly completed
- [ ] The activity records once per calendar day regardless of how many days are completed
- [ ] Faith points, streak, and multiplier update correctly when the activity is recorded

### Badge Integration

- [ ] `first_plan` badge: awarded when any plan's `completedAt` becomes non-null, celebration tier: toast-confetti
- [ ] `plans_3` badge: awarded when 3 plans have `completedAt` non-null, celebration tier: toast-confetti
- [ ] `plans_10` badge: awarded when all 10 plans have `completedAt` non-null, celebration tier: full-screen
- [ ] `plans_10` full-screen overlay includes verse: "Your word is a lamp to my feet..." -- Psalm 119:105 WEB
- [ ] Badge checks run after plan completion as part of the existing `checkForNewBadges()` flow

### Activity Checklist Integration

- [ ] "Complete a reading" appears as the 7th checklist item when the user has an active (in-progress) plan
- [ ] The item shows the BookOpen icon, "Complete a reading" label, and "15 pts" value
- [ ] The progress ring denominator changes from 6 to 7 when the item is visible (e.g., "3/7")
- [ ] The item is checked/completed when `readingPlan` activity is recorded for today
- [ ] The item does not appear when the user has no active plan (never started, or all completed/paused)
- [ ] When the item appears or disappears, the progress ring updates smoothly

### Dashboard Widget — Active Plan State

- [ ] Widget appears in the dashboard grid after the "Today's Devotional" widget
- [ ] Uses standard `DashboardCard` with "Reading Plan" title and BookOpen icon
- [ ] Shows plan title in bold white text
- [ ] Shows progress bar with filled portion proportional to completed days
- [ ] Progress bar has `role="progressbar"` with correct `aria-valuenow`, `aria-valuemin`, `aria-valuemax`
- [ ] Shows "Day X of Y (Z%)" label below the progress bar
- [ ] Shows current day title in muted white text
- [ ] Shows "Continue reading" link that navigates to `/reading-plans/:planId`
- [ ] Clicking "Continue reading" auto-scrolls to the current day on the plan detail page
- [ ] Shows "X day reading streak" when the user has consecutive days of reading plan completion
- [ ] Hides the reading streak stat when the streak is 0

### Dashboard Widget — Discovery State

- [ ] When the user has no active plan, shows "Start a reading plan" heading
- [ ] Shows 2-3 suggested plan mini-cards based on the user's most common mood from the past 7 days
- [ ] Each mini-card shows the plan's cover emoji and title
- [ ] Mini-cards are clickable and link to `/reading-plans/:planId`
- [ ] Shows "Browse all plans" link to `/reading-plans`
- [ ] Falls back to the first 3 beginner plans when no mood data exists

### Dashboard Widget — Completed State

- [ ] When the most recent plan is completed with no active plan, shows "You completed [Plan Title]!"
- [ ] Shows green checkmark icon and plan cover emoji
- [ ] Shows "Start another plan" CTA linking to `/reading-plans`

### Devotional Page — Related Plan Callout

- [ ] Callout appears at the bottom of the devotional content when today's theme matches a plan's theme
- [ ] "Go Deeper" label in muted uppercase text
- [ ] Shows matching plan's title and duration
- [ ] Shows "Start this plan" for unstarted plans, "Continue this plan" for in-progress, or "Completed" for finished
- [ ] Logged-out users clicking "Start this plan" see auth modal: "Sign in to start this reading plan"
- [ ] Callout does not appear when no plan theme matches or when the matching plan is completed
- [ ] Styled as a frosted glass callout (`bg-white/5 border border-white/10 rounded-xl p-5 mt-8`)

### Insights Page — Activity Correlation

- [ ] Reading plan completion appears in the activity correlations section with BookOpen icon
- [ ] Shows "On days you completed a reading plan, your mood averaged X.X"
- [ ] Only appears when the user has at least 3 days with both mood data and readingPlan activity
- [ ] Styling matches existing activity correlation cards

### Mood Recommendations — Active Plan Card

- [ ] When the user has an active plan and hasn't completed a reading today, "Continue Your Reading Plan" appears as a recommendation card
- [ ] Card shows BookOpen icon, "Continue Your Reading Plan" title, and current day title as description
- [ ] Card links to `/reading-plans/:planId` for the active plan
- [ ] Card does not appear when the user has already completed a readingPlan activity today
- [ ] Card does not appear when the user has no active plan
- [ ] Card is positioned after any devotional recommendation, before the standard 3 suggestions

### Responsive Layout

- [ ] Mobile (< 640px): Inline celebration stacks vertically, full-width continue button, overlay card full-width with mx-4, widget mini-cards stack vertically
- [ ] Tablet (640-1024px): Comfortable centered layout, overlay at max-w-md
- [ ] Desktop (> 1024px): Inline celebration centered in max-w-2xl, overlay at max-w-md, widget within dashboard left column
- [ ] All interactive elements meet 44px minimum touch target on mobile

### Accessibility

- [ ] Plan completion overlay traps focus and is dismissible with Escape
- [ ] Progress bars have `role="progressbar"` with proper ARIA attributes
- [ ] All buttons and links have descriptive `aria-label` attributes where the visual label is insufficient
- [ ] Checkmark animation respects `prefers-reduced-motion`
- [ ] Confetti animation respects `prefers-reduced-motion`
- [ ] Dashboard widget is keyboard-navigable (links, collapsible card behavior)
- [ ] Color contrast meets WCAG AA for all text on dark backgrounds

### Visual Verification

- [ ] Inline celebration checkmark is visibly green and animates smoothly on supported browsers
- [ ] Plan completion overlay is centered, with frosted glass card visually matching existing overlay patterns
- [ ] Dashboard widget progress bar matches the Spec 1 plan detail hero progress bar visually
- [ ] Dashboard widget styling matches other dashboard cards (same padding, border, backdrop-blur)
- [ ] Devotional callout matches the action step card styling from the plan detail page
- [ ] Insights correlation card matches existing correlation card styling

### No Regressions

- [ ] Existing 6 activity types still work correctly with their original point values
- [ ] Existing badge definitions are unmodified (only 3 new badges added)
- [ ] Activity Checklist shows 6 items for users without an active plan (unchanged)
- [ ] Mood recommendation system still shows its standard 3 cards when no reading plan is active
- [ ] Devotional page layout is unchanged when no plan theme matches
- [ ] Insights page correlations section works correctly for users with no reading plan data
- [ ] Dashboard widget grid layout accommodates the new widget without breaking existing widget positions
- [ ] Existing `wr_reading_plan_progress` data from Spec 1 is fully compatible (no schema changes)
