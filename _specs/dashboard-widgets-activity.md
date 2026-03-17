# Feature: Dashboard Widgets and Activity Integration

**Master Plan Reference:** `dashboard-growth-spec-plan-v2.md`
- Shared data models: See "localStorage Key Summary" section — this spec consumes `wr_daily_activities`, `wr_faith_points`, `wr_streak` (owned by Spec 5), and `wr_badges` (owned by Spec 7)
- Cross-spec dependencies: Spec 5 (Streak & Faith Points Engine) provides the `useFaithPoints` hook and `recordActivity()` function this spec integrates; Spec 1 (Mood Check-In) provides `wr_mood_entries`; Spec 2 (Dashboard Shell) provides the card grid layout and placeholder cards this spec replaces; Spec 7 (Badges) provides badge definitions consumed by the recent badges display
- Shared constants: Activity point weights, multiplier tiers, level thresholds, and level icon mappings defined here are consumed by Specs 7-8, 10, 14
- Shared utilities: `getLocalDateString()` from Spec 1's `utils/date.ts`; `useFaithPoints()` from Spec 5

---

## Overview

This spec delivers the two primary gamification widgets on the dashboard — the **Streak & Faith Points card** and the **Today's Activity Checklist card** — and wires the `recordActivity()` function into the five existing feature components so that real user engagement flows into the gamification engine.

The Streak & Faith Points card replaces the placeholder card from Spec 2, showing the user's current streak with a flame icon, their longest streak, total faith points with level name and icon, a progress bar toward the next level, and their three most recently earned badges. The Activity Checklist card shows an SVG progress ring with X/6 activities completed, a list of all six activities with completion status and point values, and a motivational multiplier preview.

Together, these widgets make the invisible engine from Spec 5 visible and tangible, turning daily engagement into a satisfying visual feedback loop. The activity integration ensures that using existing features (praying, journaling, meditating, listening, engaging on the Prayer Wall) automatically feeds into the gamification system without requiring users to take any extra steps.

---

## User Stories

- As a **logged-in user**, I want to see my streak count prominently on the dashboard so that I feel motivated to maintain daily consistency.
- As a **logged-in user**, I want to see my faith points, level, and progress toward the next level so that I can track my growth journey at a glance.
- As a **logged-in user**, I want to see which activities I've completed today and which remain so that I know what I can still do to grow.
- As a **logged-in user**, I want my activities to be tracked automatically when I use features like Pray, Journal, and Meditate so that I don't have to manually log anything.
- As a **logged-in user**, I want to see my current multiplier bonus and how close I am to the next tier so that I'm encouraged to try one more activity.
- As a **logged-in user**, I want to see my recently earned badges on the dashboard so that I'm reminded of milestones I've achieved.

---

## Requirements

### Streak & Faith Points Card

This card replaces the "Coming in Spec 6" placeholder in the right column of the dashboard widget grid.

#### Top Section: Streak Display
- Large streak number displayed prominently with a flame icon (Lucide `Flame` icon, not an emoji) and the label "day streak" (or "days streak" if > 1)
- When streak is 0: display "Start your streak today" in warm, encouraging tone instead of the number
- Below the streak number, smaller text: "Longest: X days" showing the all-time longest streak
- The streak number should feel like the hero of the card — largest text, most visual weight

#### Middle Section: Faith Points & Level
- Faith points total displayed as a number (e.g., "247 Faith Points")
- Current level name adjacent to or below the points (e.g., "Sprout")
- Level icon using temporary Lucide icons:

| Level | Name | Lucide Icon |
|-------|------|-------------|
| 1 | Seedling | `Sprout` |
| 2 | Sprout | `Leaf` |
| 3 | Blooming | `Flower2` |
| 4 | Flourishing | `TreePine` |
| 5 | Oak | `Trees` |
| 6 | Lighthouse | `Landmark` |

- Progress bar showing progress toward the next level, with label text (e.g., "247 / 500 to Blooming")
- Progress bar should use a gradient fill from `primary` to `primary-lt` or a solid `primary` fill
- At max level (Lighthouse): progress bar is full, label reads "Lighthouse — Max Level"

#### Bottom Section: Multiplier & Recent Badges
- If today's multiplier is greater than 1x: display a multiplier badge (e.g., "1.5x bonus today!") in an accent color
- If multiplier is 1x (0-1 activities): no multiplier badge shown
- Display the 3 most recently earned badges as small icons/thumbnails
- If user has no badges yet: show nothing in the badge area (no empty state text needed — the card has enough content from streak/points)
- Badge icons are placeholders for now (colored circles with the badge's first letter or a generic star icon) — Spec 7/8 defines the full badge visual system

### Today's Activity Checklist Card

This card lives in the left column of the dashboard widget grid.

#### Progress Ring
- Circular SVG progress ring showing X/6 activities completed
- Ring should be approximately 56-64px diameter
- Unfilled portion: `stroke` in `white/10` or similar muted color
- Filled portion: gradient or solid in `primary` color, animated on change
- Center text: "X/6" in the middle of the ring
- Progress ring is positioned to the left of the activity list on desktop, above the list on mobile

#### Activity List
- 6 items listed vertically, one for each trackable activity:

| Activity | Display Name | Point Value |
|----------|-------------|-------------|
| mood | Log your mood | +5 pts |
| pray | Pray | +10 pts |
| listen | Listen to worship | +10 pts |
| prayerWall | Pray for someone | +15 pts |
| meditate | Meditate | +20 pts |
| journal | Journal | +25 pts |

- **Completed activity**: Green check icon (Lucide `Check` or `CircleCheck`) + activity name + "+X pts" in accent/success color
- **Incomplete activity**: Empty circle icon (Lucide `Circle`) + activity name + "+X pts" in muted text color
- Activities listed in order from lowest to highest point value (mood first, journal last)

#### Multiplier Preview
- Below the activity list, a motivational line showing how close the user is to the next multiplier tier:
  - 0 activities: "Complete 2 activities for 1.25x bonus!"
  - 1 activity: "Complete 1 more for 1.25x bonus!"
  - 2-3 activities: "Complete X more for 1.5x bonus!" (where X = 4 - completed)
  - 4-5 activities: "Complete X more for 2x Full Worship Day!" (where X = 6 - completed)
  - 6 activities: "Full Worship Day! 2x points earned!" in celebration accent color
- Multiplier preview text should feel encouraging, not demanding

#### Real-Time Updates
- The checklist updates in real-time via the `useFaithPoints` hook's reactive state
- When a user navigates to Pray, generates a prayer, then returns to the dashboard, the "Pray" activity should show as completed without a page reload
- The progress ring animates when the count changes

### Existing Component Integration

Add `recordActivity()` calls to five existing components. Each integration is minimal — import the hook and call the function at the right moment.

#### 1. Pray Tab (`PrayTabContent`)
- **Trigger**: When a prayer is successfully generated (mock prayer generation completes)
- **Call**: `recordActivity('pray')`
- **Timing**: After the prayer text renders, not on button click (prevents counting failed generations)

#### 2. Journal Tab (`JournalTabContent`)
- **Trigger**: When a journal entry is successfully saved
- **Call**: `recordActivity('journal')`
- **Timing**: After the save confirmation, alongside the existing save-success feedback

#### 3. Meditation Pages (all 6 sub-pages)
- **Trigger**: When a meditation is completed (via the existing `CompletionScreen` or equivalent completion handler)
- **Call**: `recordActivity('meditate')`
- **Timing**: On the completion event, not on page load

#### 4. AudioProvider (Listen Tracking)
- **Trigger**: After 30 continuous seconds of audio playback
- **Call**: `recordActivity('listen')`
- **Timing**: A timer starts when playback begins, resets if paused before 30 seconds, and fires `recordActivity('listen')` once 30 seconds of continuous playback is reached. Only fires once per day.
- **Implementation notes**: Timer polls every ~5 seconds (not every frame). Timer resets on pause (not cumulative). Daily flag resets naturally via the idempotent `recordActivity()` behavior (already recorded = no-op).

#### 5. Prayer Wall (Reactions/Comments)
- **Trigger**: When a user reacts to or comments on a prayer request
- **Call**: `recordActivity('prayerWall')`
- **Timing**: After the reaction/comment is successfully recorded (even though it's mock data in Phase 2)

### Auth Guard

- `recordActivity()` no-ops when the user is not authenticated (checked via `isAuthenticated` from auth context inside the `useFaithPoints` hook)
- The five existing components do NOT need their own auth checks for `recordActivity()` — the hook handles it internally
- This means calling `recordActivity()` from a logged-out component is safe — it silently does nothing

---

## AI Safety Considerations

- **Crisis detection needed?**: No — this spec has no user text input. Crisis detection is handled by the existing components (Pray tab, Journal tab, Mood check-in) that this spec integrates with.
- **User input involved?**: No — all data comes from system events (activity completion triggers), not user text.
- **AI-generated content?**: No — all text is static labels and calculated values.

---

## Auth & Persistence

### Logged-out users (demo mode):
- **Cannot see the dashboard** — logged-out users see the landing page at `/`
- `recordActivity()` no-ops when not authenticated — zero data written
- Logged-out users can still use Pray, Journal, Meditate, listen to audio, and read the Prayer Wall — their activities just aren't tracked

### Logged-in users:
- Dashboard widgets display data from `wr_daily_activities`, `wr_faith_points`, `wr_streak` (managed by `useFaithPoints` hook from Spec 5)
- Activity completion in any feature component triggers `recordActivity()` which updates localStorage and re-renders the dashboard widgets
- `logout()` preserves all `wr_*` data — user retains progress

### Route type:
- Dashboard widgets render inside the dashboard at `/` (auth-gated by Spec 2's route switching)
- No new routes introduced

### Auth gating per interactive element:

| Element | Logged-out behavior | Logged-in behavior |
|---------|--------------------|--------------------|
| Streak & Faith Points card | Not visible (landing page shown) | Displays streak, points, level, progress, badges |
| Activity Checklist card | Not visible (landing page shown) | Displays 6 activities with completion status |
| `recordActivity('pray')` in Pray tab | No-op (hook guards) | Records pray activity, updates points/streak |
| `recordActivity('journal')` in Journal tab | No-op (hook guards) | Records journal activity |
| `recordActivity('meditate')` in Meditation pages | No-op (hook guards) | Records meditate activity |
| `recordActivity('listen')` in AudioProvider | No-op (timer may run but recordActivity no-ops) | Records listen activity after 30s continuous playback |
| `recordActivity('prayerWall')` in Prayer Wall | No-op (hook guards) | Records prayerWall activity |

---

## UX & Design Notes

### Visual Design

Both cards use the **Dashboard Card Pattern** from the design system:
- `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`
- Padding: `p-4 md:p-6`
- Collapsible via the existing `DashboardCard` component from Spec 2

#### Streak & Faith Points Card
- **Streak number**: Large, bold text (`text-3xl md:text-4xl font-bold text-white`) with a flame icon in amber/orange (`text-amber-400` or `text-orange-400`) adjacent
- **"day streak" label**: Smaller text (`text-sm text-white/60`) below or beside the number
- **Longest streak**: `text-xs text-white/40`
- **Faith points number**: `text-lg font-semibold text-white`
- **Level name + icon**: Adjacent to faith points. Icon uses Lucide component at 20-24px. Level name in `text-sm text-white/70`
- **Progress bar**: Height ~6-8px, `rounded-full`, background `bg-white/10`, fill `bg-primary`, animated width transition
- **Progress label**: `text-xs text-white/40` below the bar (e.g., "247 / 500 to Blooming")
- **Multiplier badge**: Small pill/tag with background accent color (`bg-primary/20 text-primary-lt` or `bg-amber-500/20 text-amber-300`), `rounded-full`, `text-xs font-medium`
- **Recent badges**: 3 small circles (24-28px) with subtle borders, positioned in a horizontal row

#### Activity Checklist Card
- **Progress ring**: SVG circle with `stroke-linecap="round"`, smooth animated transition on `stroke-dashoffset`
- **Center text**: `text-sm font-semibold text-white` (e.g., "3/6")
- **Activity rows**: Flex items with icon + name + points. Spacing: `gap-2` between rows
- **Completed row**: Check icon in `text-success` (#27AE60), name in `text-white`, points in `text-success`
- **Incomplete row**: Circle icon in `text-white/20`, name in `text-white/50`, points in `text-white/30`
- **Multiplier preview**: `text-sm text-white/60` with the multiplier value highlighted in accent color

### Animations

- **Progress ring fill**: Animated via CSS transition on `stroke-dashoffset` (500ms ease-out)
- **Activity completion**: When an activity flips from incomplete to complete, brief scale animation on the check icon (pop in)
- **Multiplier badge appear**: Fade + slight scale when multiplier crosses a tier boundary
- **`prefers-reduced-motion`**: All animations disabled, transitions instant

### Responsive Behavior

#### Mobile (< 640px)
- Both cards span full width (single column layout per Spec 2)
- Streak & Faith Points card: streak number, points, and level stack vertically. Progress bar full width.
- Activity Checklist: Progress ring sits above the activity list (centered). Activity list below as vertical stack.
- Multiplier preview below the activity list
- Touch targets: All interactive elements (if any clickable badges) meet 44px minimum

#### Tablet (640px–1024px)
- Cards may display in the 2-column grid depending on Spec 2's tablet breakpoint
- Streak card: Same layout as mobile but with slightly more horizontal space
- Checklist: Progress ring to the left of the activity list in a horizontal layout

#### Desktop (> 1024px)
- Streak & Faith Points card: Right column (~40% width per Spec 2 grid)
- Activity Checklist: Left column (~60% width per Spec 2 grid)
- Checklist: Progress ring to the left, activity list to the right, horizontal layout
- Both cards use `p-6` padding

---

## Edge Cases

- **Zero streak, zero points, no badges**: All three sections render with graceful empty states — "Start your streak today", "0 Faith Points", "Seedling" level with empty progress bar, no badge icons. The card should still feel welcoming, not barren.
- **Max level (Lighthouse, 10,000+ points)**: Progress bar full, label reads "Lighthouse — Max Level". Points still accumulate and display.
- **All 6 activities complete**: Checklist shows all green checks, ring is full (6/6), multiplier preview shows celebration message ("Full Worship Day! 2x points earned!"). Multiplier badge on streak card shows "2x".
- **Activity completed then navigate back**: React state updates via `useFaithPoints` hook should reflect the change when the user navigates back to the dashboard. No stale data.
- **Rapid activity completion**: If a user completes 3 activities in quick succession (e.g., pray + meditate + journal), each `recordActivity()` call is independent and idempotent. The multiplier recalculates correctly after each.
- **AudioProvider 30-second timer**: If the user pauses at 25 seconds and resumes, the timer resets to 0. Only 30 continuous seconds count. If the user navigates away (AudioProvider persists globally), the timer continues as long as audio is playing.
- **Prayer Wall reactions in quick succession**: Multiple reactions on the same or different prayer requests within one session — `recordActivity('prayerWall')` is idempotent, so only the first call per day has effect.
- **Dashboard card collapsed state**: Both cards respect the collapsible behavior from Spec 2's `DashboardCard`. Collapsed state persists via `wr_dashboard_collapsed`. When collapsed, the card title and a summary (e.g., "3/6 activities") remain visible.

---

## Out of Scope

- **Badge definitions, unlock logic, and badge visual system** — Spec 7 (this spec shows the 3 most recent badges as simple placeholder icons; full badge rendering comes in Spec 7/8)
- **Celebrations, toasts, and level-up animations** — Spec 8
- **Streak reset messaging** ("Every day is a new beginning") — Spec 8
- **Badge collection grid / full badge page** — Spec 8
- **Friends preview widget and leaderboard** — Specs 9-10
- **The `useFaithPoints` hook implementation itself** — Spec 5 (this spec consumes it)
- **Point calculation logic, multiplier computation, streak update logic** — Spec 5 (this spec calls `recordActivity()` and reads the computed values)
- **Real Lucide → custom SVG icon swap** — Phase 4
- **Backend API persistence for activity data** — Phase 3
- **Real authentication** — Phase 3 (uses simulated auth from Spec 2)
- **Activity editing, deletion, or manual logging** — not in MVP
- **Notifications for activity reminders** — Spec 12
- **Weekly activity summary or history view** — Spec 15

---

## Acceptance Criteria

### Streak & Faith Points Card
- [ ] Card renders in the right column of the dashboard widget grid, replacing any placeholder
- [ ] Card uses the Dashboard Card Pattern (`bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`)
- [ ] Large streak number displays prominently with Lucide `Flame` icon in amber/orange
- [ ] "day streak" / "days streak" label appears beside or below the streak number (singular/plural correct)
- [ ] When streak is 0: "Start your streak today" displays instead of a number
- [ ] Longest streak displays as "Longest: X days" in smaller, muted text
- [ ] Faith points total displays as a number with label (e.g., "247 Faith Points")
- [ ] Current level name displays adjacent to points (e.g., "Sprout")
- [ ] Correct Lucide icon renders for each level: Seedling=Sprout, Sprout=Leaf, Blooming=Flower2, Flourishing=TreePine, Oak=Trees, Lighthouse=Landmark
- [ ] Progress bar shows correct percentage toward next level, with label text (e.g., "247 / 500 to Blooming")
- [ ] Progress bar fill uses `bg-primary` or a primary gradient
- [ ] At Lighthouse (max level): progress bar is full, label reads "Lighthouse — Max Level"
- [ ] Multiplier badge appears when today's multiplier is > 1x (e.g., "1.5x bonus today!")
- [ ] No multiplier badge shown when multiplier is 1x
- [ ] 3 most recently earned badges display as small icons in a horizontal row
- [ ] No badge area shown when user has no earned badges

### Activity Checklist Card
- [ ] Card renders in the left column of the dashboard widget grid
- [ ] Card uses the Dashboard Card Pattern
- [ ] SVG progress ring displays X/6 in the center, with filled arc proportional to completed activities
- [ ] Ring unfilled portion uses muted color (`white/10` or similar), filled portion uses primary color
- [ ] Ring fill animates smoothly when count changes (CSS transition on stroke-dashoffset)
- [ ] All 6 activities listed: mood, pray, listen, prayerWall, meditate, journal (ordered lowest to highest points)
- [ ] Each activity shows its display name and "+X pts" point value
- [ ] Completed activities show green check icon, name in white, points in success/accent color
- [ ] Incomplete activities show empty circle icon, name in muted, points in muted
- [ ] Multiplier preview text shows correct message for each activity count tier (0, 1, 2-3, 4-5, 6)
- [ ] At 6/6 activities: multiplier preview reads "Full Worship Day! 2x points earned!" in celebration style

### Real-Time Reactivity
- [ ] Completing an activity in another feature (Pray, Journal, etc.) and returning to dashboard shows the updated checklist without page reload
- [ ] Streak card updates in real-time when a new activity is recorded
- [ ] Progress ring animates to new value when an activity completes

### Pray Tab Integration
- [ ] `recordActivity('pray')` is called when a prayer is successfully generated on the Pray tab
- [ ] Call fires after prayer text renders, not on button click
- [ ] Calling `recordActivity('pray')` a second time on the same day has no additional effect

### Journal Tab Integration
- [ ] `recordActivity('journal')` is called when a journal entry is successfully saved
- [ ] Call fires after save confirmation

### Meditation Integration
- [ ] `recordActivity('meditate')` is called when a meditation is completed on any of the 6 meditation sub-pages
- [ ] Call fires on the completion event, not on page load

### AudioProvider Listen Integration
- [ ] A 30-second continuous playback timer starts when audio playback begins
- [ ] Timer resets if playback pauses before 30 seconds (not cumulative)
- [ ] `recordActivity('listen')` fires after 30 continuous seconds of playback
- [ ] Listen activity fires at most once per day (idempotent via hook)
- [ ] Timer polls at ~5-second intervals (not every frame)

### Prayer Wall Integration
- [ ] `recordActivity('prayerWall')` is called when a user reacts to or comments on a prayer request
- [ ] Call fires after the reaction/comment is recorded
- [ ] Multiple reactions on the same day do not re-trigger (idempotent)

### Auth Guard
- [ ] `recordActivity()` no-ops when user is not authenticated (verified for all 5 integration points)
- [ ] Dashboard widgets are not visible to logged-out users (landing page shows instead)
- [ ] No localStorage writes occur for unauthenticated users via any `recordActivity()` call

### Responsive Layout
- [ ] Mobile (< 640px): Both cards span full width, content stacks vertically. Progress ring above activity list.
- [ ] Tablet (640–1024px): Cards fit within Spec 2's grid. Checklist progress ring beside activity list.
- [ ] Desktop (> 1024px): Streak card in right column (~40%), Checklist in left column (~60%). Checklist has horizontal ring + list layout.

### Visual Design
- [ ] Streak number is the largest text element in the streak card (`text-3xl md:text-4xl`)
- [ ] Flame icon renders in amber/orange color, visually distinct from text
- [ ] Progress bar height is 6-8px with rounded caps
- [ ] Activity list has clear visual distinction between completed (green check, bright text) and incomplete (empty circle, muted text) items
- [ ] SVG progress ring stroke has rounded line caps (`stroke-linecap="round"`)

### Accessibility
- [ ] Streak card content is readable by screen readers (streak count, level, points announced in logical order)
- [ ] Progress ring has an `aria-label` describing the completion state (e.g., "3 of 6 daily activities completed")
- [ ] Progress bar has `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, and `aria-valuemax`
- [ ] Activity completion state is communicated via `aria-label` on each row (e.g., "Pray — completed, 10 points earned" or "Journal — not yet completed, 25 points available")
- [ ] `prefers-reduced-motion`: All animations disabled (ring fill, check icon pop-in, multiplier badge fade)

### Edge Cases
- [ ] Zero streak, zero points, Seedling level: card renders gracefully with "Start your streak today" and empty progress bar
- [ ] Lighthouse level (10,000+ pts): full progress bar, "Lighthouse — Max Level" label
- [ ] All 6/6 complete: full ring, all green checks, celebration multiplier message, 2x multiplier badge
- [ ] Collapsed card state persists across page reloads via `wr_dashboard_collapsed`
