# Feature: Empty States & Polish

**Master Plan Reference:** `dashboard-growth-spec-plan-v2.md`
- Shared data models: See "localStorage Key Summary" section — this spec reads ALL dashboard localStorage keys (`wr_mood_entries`, `wr_daily_activities`, `wr_faith_points`, `wr_streak`, `wr_badges`, `wr_friends`, `wr_notifications`, `wr_dashboard_collapsed`)
- Cross-spec dependencies: This is Spec 16 — the final polish layer that touches every widget from Specs 1-15. It does not introduce new data models; it adds empty states, transition animations, and micro-interactions to existing components.
- Shared constants: Mood colors from `09-design-system.md`, `LEVEL_THRESHOLDS` from Spec 5, `ACTIVITY_POINTS` from Spec 5, badge definitions from Spec 7

---

## Overview

Empty States & Polish is the finishing layer for the entire Dashboard & Growth feature. It adds three categories of work: (1) beautiful empty states for every widget and page so new users feel welcomed rather than confronted by blank screens, (2) orchestrated transition animations that make the mood check-in to dashboard flow feel alive and celebratory, and (3) micro-interactions and visual polish that unify the entire dashboard experience.

This feature embodies the app's "gentle gamification" philosophy — empty states frame the beginning as exciting, not empty. Messages like "Every journey begins with a single step" and "Your collection is just beginning" celebrate the user's decision to start rather than highlighting what they haven't done yet. The transition animations make the daily check-in feel meaningful — watching your streak count roll up and your mood dot appear on the chart provides tangible, satisfying feedback.

All animations respect `prefers-reduced-motion` — every animated element renders instantly when the user's system preference requests reduced motion.

---

## User Stories

- As a **logged-in user on day 1**, I want to see welcoming empty states with ghosted previews and encouraging messages so that I understand what each widget will show and feel excited to begin.
- As a **logged-in user completing a mood check-in**, I want to see a smooth, orchestrated transition from the check-in screen through the encouragement verse to the dashboard so that the experience feels seamless and rewarding.
- As a **logged-in user**, I want to see my streak count roll up, my mood dot appear on the chart, and my activity checklist update in real time so that my actions feel consequential.
- As a **logged-in user with no friends**, I want to see a friendly illustration and invite CTA on the friends page so that I feel encouraged to connect rather than alone.
- As a **logged-in user on `/insights` with fewer than 7 days of data**, I want to see partial data with an encouraging message so that I know trends are coming.
- As a **logged-in user with all notifications read**, I want to see a cheerful "All caught up!" state so I feel accomplished.
- As a **user who prefers reduced motion**, I want all animations to render instantly so the interface respects my accessibility needs.

---

## Requirements

### Part 1: Empty States

Every dashboard widget and growth page must have a thoughtfully designed empty state that follows the principle: **show what the future looks like + one clear CTA**. Empty states should feel warm and inviting, never clinical or error-like.

#### 1.1 Mood Chart (Dashboard Widget — Spec 3)

- **Visual**: A ghosted example line chart rendered at 15% opacity, showing a gentle upward trend with 7 mock data points using mood-colored dots
- **Message**: "Your mood journey starts today" in `text-white/60` below the ghosted chart
- **CTA**: A button or link that triggers the mood check-in flow. Text: "Check in now" styled as a subtle primary-color text link
- **Trigger condition**: User has zero mood entries in `wr_mood_entries`

#### 1.2 Streak Counter (Dashboard — Spec 6)

- **Day 1 state**: Display "1" with a fire emoji and the message "Every journey begins with a single step" in warm, encouraging text below the streak number
- **Day 0 state** (streak broken): Display "0" with the message "A new streak starts today" — never "You lost your streak" or anything punitive
- **No animation for streak = 0**: The roll-up counter animation only runs when streak > 0

#### 1.3 Faith Points (Dashboard — Spec 6)

- **New user state**: Display "0 Faith Points" with the Seedling level label and icon
- **Progress bar**: Full-width bar from 0 to the next level threshold (100 for Sprout), currently showing 0% filled
- **Message**: No additional message — the zero + Seedling label + empty progress bar is clear and inviting. The level name and icon communicate "you're at the beginning of something"

#### 1.4 Badges (Dashboard — Spec 8)

- **Visual**: A grid of badge silhouettes (locked state) using a muted gray/dark outline at ~20% opacity. The "Welcome" badge should glow with a subtle golden shimmer animation to draw attention as the first badge the user can earn
- **Message**: "Your collection is just beginning" in `text-white/60`
- **Trigger condition**: No earned badges in `wr_badges` (or only the Welcome badge if it's auto-awarded on signup)
- **Welcome badge**: If the Welcome badge is already earned on signup, it renders in full color while all others remain silhouettes

#### 1.5 Activity Checklist (Dashboard — Spec 6)

- **Visual**: All 6 activity items displayed with empty/unchecked circles
- **Message**: "A new day, a new opportunity to grow" displayed subtly above or below the checklist in `text-white/50 text-sm`
- **This state occurs naturally every day at midnight reset** — it's both a "new user" state and a "new day" state

#### 1.6 Friends & Leaderboard (Dashboard Widget & `/friends` page — Specs 9-10)

**Dashboard friends preview widget** (when no friends):
- **Visual**: A simple CSS illustration of 3 connected circles (abstract "people" in a network) using thin `border-white/20` strokes
- **Message**: "Faith grows stronger together" in `text-white/60`
- **CTA**: "Invite a friend" button/link that navigates to `/friends`

**Dashboard leaderboard widget** (when no friends):
- **Visual**: "You vs. Yesterday" self-comparison card showing today's points vs. yesterday's points
- **Message**: "Add friends to see how you're growing together" in `text-white/50 text-sm`
- **CTA**: "Find friends" link to `/friends`
- **Logic**: When the user has no friends, the leaderboard widget transforms into a personal comparison: "Today: [X] pts" vs "Yesterday: [Y] pts" with a directional arrow (up/down/same)

**`/friends` page — Friends tab** (no friends):
- **Visual**: A larger CSS illustration of connected dots/circles forming a gentle network pattern, abstract and warm (3-5 circles connected by thin lines)
- **Message**: "Invite someone to grow together" as the heading
- **CTA**: The invite/search form is prominently displayed below the illustration, not hidden behind a button. The search input and "Send Invite" action should be immediately visible

**`/friends` page — Leaderboard tab** (no friends):
- **Visual**: Same "You vs. Yesterday" personal comparison as the dashboard widget, but full-width
- **Message**: "Your friends will appear here. In the meantime, compete with yourself!" in `text-white/50`

#### 1.7 `/insights` Page with Insufficient Data

- **< 7 days of mood data**: Show whatever data exists (partial chart, partial heatmap) plus a banner message: "After 7 days, you'll see trends emerge" in a frosted glass callout card at the top of the page
- **0 days of data**: Show the ghosted chart pattern (same as dashboard mood chart empty state) with message: "Start checking in to unlock your mood insights"
- **AI insight cards**: Show regardless of data amount — they're hardcoded mock content and always relevant as encouragement
- **The banner disappears once the user has >= 7 days of data**

#### 1.8 Notifications Panel (Empty — Spec 12)

- **Visual**: No illustration needed — the panel is small
- **Message**: "All caught up!" with a party popper emoji in `text-white/60` centered in the panel
- **This is the only empty state in the spec that uses an emoji** — the celebration fits the context
- **Trigger condition**: All notifications marked as read, or no notifications at all

### Part 2: Dashboard Transition Animations

The mood check-in to dashboard transition is the most important animation sequence in the app. It should feel like a narrative: acknowledge the user's feelings, offer encouragement, then reveal the dashboard with their progress updating in real time.

#### 2.1 Check-In to Dashboard Sequence

The full orchestrated sequence after the user selects a mood and confirms:

1. **Check-in fade out** (300ms ease-out): The entire check-in screen fades to opacity 0
2. **Verse fade in** (300ms ease-in, starts at 300ms): An encouraging scripture verse matched to the selected mood fades in, centered on a dark background. The verse text uses `font-serif text-xl md:text-2xl text-white/90` with the reference below in `text-white/50`
3. **Verse hold** (3000ms): The verse remains visible for 3 seconds for the user to absorb it
4. **Verse fade out** (300ms ease-out, starts at 3600ms): The verse fades to opacity 0
5. **Dashboard fade in** (400ms ease-in, starts at 3900ms): The full dashboard renders and fades in from opacity 0 to 1

#### 2.2 Simultaneous Dashboard Entry Animations

Starting simultaneously with step 5 (dashboard fade in), the following animations play:

- **Streak counter roll-up** (800ms, cubic-bezier easing): The streak number counts up from 0 to its current value. If streak is 1 (first check-in), it counts from 0 to 1 with a subtle 1.0 to 1.1 to 1.0 scale bump (300ms) at the end
- **Mood dot fade onto chart** (400ms, 200ms delay after dashboard appears): If the mood chart is visible, the new mood dot animates in: scale from 0 to 1 + opacity 0 to 1. The dot appears at the correct position on the chart for today
- **Activity "Logged mood" check animation** (200ms): The mood check-in activity item in the checklist transitions from unchecked to checked with a circle-fill + checkmark-draw animation
- **Points count-up** (600ms, eased): The faith points number counts up from its previous total to the new total (previous + points earned from check-in)

#### 2.3 Skip/Quick Path

- If the user has already checked in today and refreshes the page, the dashboard loads directly with no transition sequence — all values display immediately at their current state
- If the user skips the check-in ("Not right now"), the dashboard loads immediately with a standard 400ms fade-in, no orchestrated sequence
- If the user completed the check-in in a previous session and returns, the dashboard loads normally

### Part 3: Micro-Interactions

Subtle animations that make the dashboard feel responsive and alive. Each one is small but their cumulative effect creates a polished experience.

#### 3.1 Card Collapse/Expand (Dashboard Cards)

- **Animation**: `max-height` transition over 300ms with `ease-in-out` timing
- **Behavior**: When a user clicks the collapse toggle on a dashboard card, the card body smoothly collapses to height 0 (header remains visible)
- **No layout shift**: The card's outer container maintains its position in the grid — collapsing one card should not cause adjacent cards to jump. Use `overflow-hidden` on the collapsible content area
- **Chevron rotation**: The collapse icon rotates 180 degrees over the same 300ms duration

#### 3.2 Card Hover Glow

- **Animation**: Border color transitions from `border-white/10` to `border-white/20` over 150ms
- **Behavior**: Subtle brightening of the frosted glass card border on hover, giving a gentle "lift" feel
- **No background change**: The frosted glass background (`bg-white/5`) does not change on hover — only the border brightens
- **Touch devices**: This hover effect is desktop-only (use `@media (hover: hover)` or Tailwind's `hover:` which handles this)

#### 3.3 Activity Check Animation (SVG)

- **Unchecked state**: An empty circle outline (stroke only, `stroke-white/30`)
- **Checked animation sequence** (total ~400ms):
  1. Circle fill: `fill-opacity` transitions from 0 to 1 with the activity's accent color (200ms)
  2. Checkmark draw: SVG `stroke-dasharray` animation — the checkmark "draws itself" from start to end (200ms, starts at 100ms overlap)
- **Colors**: Each of the 6 activities can use a subtle variation or a single accent color (primary purple `#6D28D9`)

#### 3.4 Leaderboard Rank Slide

- **Animation**: When a friend's rank changes position (e.g., from #3 to #2), the row slides up or down to its new position over 300ms
- **Implementation**: CSS `transform: translateY()` transition on leaderboard rows, triggered when rank order changes
- **Edge case**: On initial render, no animation — items appear in their final positions instantly

#### 3.5 Encouragement Button Morph

- **Sequence**: User clicks encouragement button on a friend's card:
  1. Button text fades out (100ms)
  2. Checkmark icon fades in (100ms) with a brief green color flash
  3. After 1500ms, checkmark fades out and original button text returns (200ms)
- **Disabled state**: During the morph, the button is non-interactive (prevent double-sends)
- **Cooldown visual**: If the user has already sent an encouragement to this friend recently, the button shows "Sent" in muted text instead of the morph animation

#### 3.6 Progress Ring Arc Fill

- **Animation**: The SVG progress ring (used on activity checklist completion percentage and potentially faith level progress) fills its arc smoothly using `stroke-dashoffset` transition over 600ms
- **Behavior**: On dashboard load, the ring starts empty and fills to the correct percentage
- **Color**: The filled portion uses primary purple; the unfilled portion uses `stroke-white/10`

#### 3.7 Points Count-Up (Standalone)

- **Animation**: When faith points update (not just during the check-in transition but also when recording activities like journaling, praying, etc.), the points number counts up from old value to new value over 600ms with easing
- **Implementation**: A reusable `AnimatedCounter` component that interpolates between values using `requestAnimationFrame`
- **Format**: Numbers display with comma formatting during the animation (e.g., 1,234 smoothly increases to 1,259)

### Part 4: `prefers-reduced-motion` Compliance

**Every single animation in this spec (and the entire dashboard) must respect `prefers-reduced-motion: reduce`.** When the user's OS-level setting requests reduced motion:

- **Counter roll-ups** (streak, points): Instant — display final value immediately, no counting animation
- **Fade transitions** (check-in to verse to dashboard): Instant — content appears immediately with no opacity transition
- **SVG animations** (check animation, progress ring fill): Instant — elements appear in their final state with no drawing/filling animation
- **Card collapse/expand**: Instant — card snaps to collapsed/expanded state with no height transition
- **Card hover glow**: Disabled — no border color transition
- **Confetti/particles** (from Spec 8 celebrations): Completely disabled — no particle rendering
- **Streak bump scale**: Disabled — no scale animation
- **Leaderboard rank slide**: Instant — rows appear in final position
- **Encouragement button morph**: Instant — button shows checkmark immediately, returns after the 1500ms delay (delay is not a motion concern)
- **Mood dot chart entry**: Instant — dot appears at full size and opacity immediately

**Implementation approach**: Use a `useReducedMotion()` hook that reads `window.matchMedia('(prefers-reduced-motion: reduce)')`. All animation components check this hook and set duration to 0 when true. For CSS transitions, use the `motion-safe:` and `motion-reduce:` Tailwind variants.

### Part 5: Visual Polish Checklist

A systematic audit pass across all dashboard and growth pages to ensure visual consistency.

#### 5.1 Border Radius Consistency

- All dashboard cards use `rounded-2xl` (16px)
- All buttons use `rounded-lg` (8px) for primary CTAs, `rounded-full` for pill/chip buttons
- All input fields use `rounded-lg` (8px)
- No `rounded-xl` (12px) on the dashboard — that's the light-theme card style from Prayer Wall/Daily Hub

#### 5.2 Frosted Glass Consistency

- All dashboard cards: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`
- These exact values must be used across every card — mood chart, streak, points, badges, activity checklist, friends preview, quick actions
- Deviations (like a highlighted/featured card) should use `bg-white/8 border-white/15` at most, never `bg-white/10` or higher (too bright)

#### 5.3 Mood Color Consistency

- The 5 mood colors (`#D97706`, `#C2703E`, `#8B7FA8`, `#2DD4BF`, `#34D399`) must be identical in: check-in orbs, mood chart dots, mood chart line segments, heatmap squares, insight page charts, monthly report heatmap, any mood-related data visualization
- No approximations — all must reference the same constant values

#### 5.4 Typography Hierarchy

The dashboard has a clear text hierarchy on dark backgrounds:
- **Hero greeting**: `font-serif text-2xl md:text-3xl text-white/90` (dashboard hero)
- **Card titles**: `text-white font-semibold text-base md:text-lg` (widget headers)
- **Card body values** (large numbers): `text-white text-2xl md:text-3xl font-bold` (streak, points)
- **Card body text**: `text-white/70 text-sm md:text-base` (descriptions, labels)
- **Metadata/timestamps**: `text-white/50 text-xs` (dates, disclaimers)
- **Muted/placeholder**: `text-white/40 text-xs` (empty state hints)

#### 5.5 Touch Targets

- **Minimum 44px** on all interactive elements on mobile: buttons, links, toggle switches, collapse arrows, notification bell, avatar, navigation arrows, activity checklist items, friend action buttons
- **Verification method**: Every button/link/interactive element should have explicit `min-h-[44px] min-w-[44px]` or padding that achieves 44px
- **Special attention**: Collapse chevrons on cards, month navigation arrows on insights/monthly report, notification dismiss buttons

#### 5.6 Focus Indicators

- **All interactive elements on dark backgrounds**: `focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:outline-none`
- **Focus ring offset**: `focus-visible:ring-offset-2 focus-visible:ring-offset-transparent` to prevent ring from overlapping content
- **Consistent across**: Buttons, links, card collapse toggles, tab navigation, form inputs, the mood orbs, activity checklist items

#### 5.7 Loading Skeletons

- **When to show**: Any component that reads from localStorage and has a brief processing delay (chart rendering, badge grid computation)
- **Skeleton style**: Pulsing `bg-white/10` rectangles matching the shape of the content they replace
- **Duration**: Skeletons should display for a maximum of 200ms — localStorage reads are fast, so skeletons may flash briefly or not appear at all. They're a safety net, not a regular occurrence.
- **Shape matching**: Chart skeleton = rectangular block matching chart dimensions. Badge skeleton = grid of circles. Stat skeleton = rectangular blocks matching number + label layout.

#### 5.8 WCAG AA Contrast

- **Text on dark backgrounds**: All text must meet WCAG AA contrast ratio (4.5:1 for normal text, 3:1 for large text)
- **Audit targets**: `text-white/70` on `bg-white/5` over `hero-dark` background, `text-white/50` on same, `text-white/40` on same
- **Potential issues**: `text-white/40` (rgba(255,255,255,0.4)) on a very dark background may fail AA for normal-sized text — if so, bump to `text-white/50` for any text smaller than 18px
- **Mood colors on dark backgrounds**: Verify that `#D97706` (Struggling amber), `#C2703E` (Heavy copper), `#8B7FA8` (Okay gray-purple) all pass AA contrast when used as text or dots on the dark dashboard background

#### 5.9 Scrollbar Styling

- **Notification panel, milestone feed, and any scrollable containers on the dashboard**: Use thin, dark-themed scrollbars
- **CSS**: `scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.15) transparent;` for Firefox. Webkit: `::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 3px; }`
- **Apply globally**: A utility class (e.g., `dark-scrollbar`) that can be applied to any scrollable dark-themed container

#### 5.10 No Layout Shift on Collapse

- **Requirement**: When a dashboard card is collapsed or expanded, no other cards or page elements should shift position unexpectedly
- **Implementation**: Cards should use `overflow-hidden` with `max-height` transitions. The card's footprint in the grid remains the same — only the card's internal content area changes height
- **Exception**: If the dashboard uses a single-column layout (mobile), cards below a collapsing card will naturally shift up. This is acceptable and expected — the "no layout shift" rule applies to adjacent cards in a multi-column grid

---

## AI Safety Considerations

- **Crisis detection needed?**: No — this spec adds no user text input. It only adds visual states and animations to existing components.
- **User input involved?**: No — all empty state content is hardcoded. The friend invite form (Spec 9) already has its own input handling.
- **AI-generated content?**: No — all empty state messages are hardcoded strings written in this spec.

---

## Auth & Persistence

### Auth Gating

This spec modifies components that are already auth-gated by their parent specs. No new routes or auth gates are introduced.

| Element | Logged-out behavior | Logged-in behavior |
|---------|--------------------|--------------------|
| Dashboard empty states | Not visible — logged-out users see the landing page | Rendered inside dashboard widgets when data is empty |
| Check-in transition animations | Not visible — check-in is auth-gated (Spec 1) | Full orchestrated sequence plays after mood selection |
| Micro-interactions (card hover, collapse, etc.) | Not applicable — dashboard is auth-gated | Active on all dashboard interactions |
| `/insights` insufficient data banner | Not visible — `/insights` is auth-gated | Shows when user has < 7 days of mood data |
| `/friends` empty states | Not visible — `/friends` is auth-gated | Shows when friend list is empty |
| Notification empty state | Not visible — bell is auth-gated | Shows when all notifications are read |
| "You vs. Yesterday" leaderboard fallback | Not visible | Shows when user has no friends |
| Activity checklist empty state | Not visible | Shows at start of each new day (all unchecked) |
| Badge silhouette grid | Not visible | Shows when no badges earned (or only Welcome badge) |

### Persistence

- **Route type**: No new routes — this spec modifies existing protected pages
- **No new localStorage keys introduced**
- **Data sources** (all read-only): `wr_mood_entries`, `wr_daily_activities`, `wr_faith_points`, `wr_streak`, `wr_badges`, `wr_friends`, `wr_notifications`, `wr_dashboard_collapsed`
- **Empty state conditions are computed from existing data** — e.g., mood chart shows empty state when `wr_mood_entries` is empty or missing

---

## UX & Design Notes

### Visual Design

- **Empty state tone**: Warm, inviting, hopeful. Every empty state frames the absence of data as the exciting beginning of a journey, never as an error or incomplete state.
- **Color palette**: Empty state text uses `text-white/60` for primary messages, `text-white/40` for secondary hints. CTAs use `text-primary` or `bg-primary` depending on emphasis.
- **Ghosted previews**: Charts and grids shown at 15% opacity to preview what the widget will look like with data. Use `opacity-15` on the chart container, rendered with mock data points.
- **Badge silhouettes**: Locked badges render as outlines using `opacity-20` with the badge shape visible but details obscured. The Welcome badge (if earned) renders at full opacity with a `animate-golden-glow` shimmer.
- **CSS illustrations** (friends empty state): Simple geometric shapes using `border` and `rounded-full` — circles connected by thin lines. No SVG illustrations or images needed. Colors: `border-white/20` for circles, `bg-white/10` for connecting lines.

### Design System Recon References

- **Frosted glass card**: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 md:p-6` from `09-design-system.md`
- **Mood colors**: Struggling `#D97706`, Heavy `#C2703E`, Okay `#8B7FA8`, Good `#2DD4BF`, Thriving `#34D399`
- **Golden glow animation**: `animate-golden-glow` (2s infinite) from existing animation set
- **Primary button**: `bg-primary text-white font-semibold py-3 px-8 rounded-lg`
- **Focus ring**: `focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:outline-none`
- **Dark tooltip pattern**: `bg-hero-mid border border-white/15 rounded-lg px-3 py-2 text-sm text-white`

### New Patterns (will be marked [UNVERIFIED] during planning)

1. **Ghosted chart preview** — full chart rendered at 15% opacity with mock data as a background for empty states
2. **CSS circle network illustration** — abstract connected circles for friends empty state
3. **AnimatedCounter component** — `requestAnimationFrame`-based number interpolation with comma formatting
4. **SVG checkmark draw animation** — `stroke-dasharray` / `stroke-dashoffset` for activity check-in
5. **Orchestrated multi-step transition** — sequential fade/hold/fade sequence managed by a state machine or timeout chain
6. **Dark scrollbar utility class** — thin, semi-transparent scrollbar styling for dark containers
7. **Loading skeleton on dark background** — pulsing `bg-white/10` rectangles

### Responsive Behavior

#### Mobile (< 640px)

- Empty state messages stack below their ghosted previews
- Dashboard cards are single-column — collapse/expand causes natural vertical reflow (acceptable)
- CSS circle illustration for friends scales down proportionally
- "You vs. Yesterday" comparison renders as a compact single card
- All CTAs in empty states are full-width buttons on mobile
- Touch targets: 44px minimum enforced on all interactive elements
- Transition animations play at the same durations (no mobile-specific speed changes)

#### Tablet (640px-1024px)

- Dashboard may use 2-column grid — collapse/expand must not cause layout shift in adjacent column
- Empty states render centered within their card containers
- Friends illustration renders at medium size
- "You vs. Yesterday" card renders at standard card width

#### Desktop (> 1024px)

- Dashboard uses 2-column grid layout
- Empty states centered within each card
- Card hover glow active (desktop-only via `@media (hover: hover)`)
- Friends illustration renders at full size within the friends preview widget
- Transition animations identical to mobile/tablet

---

## Edge Cases

- **localStorage cleared mid-session**: All widgets should gracefully fall back to empty states without throwing errors. Defensive `try/catch` around all localStorage reads.
- **Multiple tabs open**: If the user completes check-in in one tab, the other tab should show the dashboard on next interaction (not re-trigger the transition). Use the `wr_mood_entries` timestamp check that already exists from Spec 1.
- **Very fast page navigation**: If the user navigates away during the check-in transition sequence, the transition should be cancellable — no orphaned timeouts or state leaks. Use cleanup functions in `useEffect`.
- **Partial data states**: Some widgets may have data while others don't (e.g., user has mood entries but no friends). Each widget independently checks its own data and shows empty state or populated state.
- **Streak reset at midnight**: The activity checklist empty state should appear correctly after midnight even if the user hasn't refreshed the page. The daily reset logic from Spec 5 handles this.
- **Welcome badge auto-award**: If the Welcome badge is auto-awarded on signup (Spec 7), the badge grid should show 1 colored badge + all others as silhouettes, not the fully-empty state.
- **Reduced motion + transition sequence**: With `prefers-reduced-motion`, the check-in to dashboard transition should still show the verse (for content value) but with no animation — check-in disappears instantly, verse appears instantly, holds for 3 seconds, then dashboard appears instantly.
- **Browser resize during animation**: All animations should use relative units or be viewport-independent so resizing mid-animation doesn't break layout.
- **Screen reader experience during transitions**: The verse should be announced to screen readers. The dashboard load should not trigger a flood of live region announcements. Use `aria-live="polite"` for the verse and `aria-live="off"` during the rapid-fire dashboard entry animations.

---

## Out of Scope

- **New data models or localStorage keys** — this spec modifies existing components only
- **Backend API integration** — Phase 3 (all data from localStorage)
- **Real AI-generated empty state content** — all messages are hardcoded
- **Onboarding walkthrough/tutorial overlay** — future feature (Spec 66 in CLAUDE.md), not part of empty states
- **Dark mode toggle** — Phase 4 (dashboard is always dark)
- **Lottie or SVG animated illustrations** for empty states — keep it simple with CSS shapes and opacity tricks
- **Sound effects** for animations — no audio feedback for micro-interactions
- **Complex particle systems** — confetti is handled by Spec 8 celebrations, this spec only ensures it respects reduced motion
- **Customizable animation speeds** — fixed durations as specified
- **Empty states for non-dashboard pages** (Prayer Wall, Daily Hub, Music) — those pages have their own empty states from their respective specs

---

## Acceptance Criteria

### Empty States

- [ ] Mood chart (dashboard widget) shows a ghosted example chart at 15% opacity when `wr_mood_entries` is empty, with message "Your mood journey starts today" and a "Check in now" CTA
- [ ] Streak counter shows "1" + "Every journey begins with a single step" on the user's first day, and "0" + "A new streak starts today" on streak reset (never punitive language)
- [ ] Faith points widget shows "0 Faith Points", Seedling level label, and empty progress bar for new users
- [ ] Badge grid shows locked silhouettes at ~20% opacity. If Welcome badge is earned, it renders in full color with `animate-golden-glow`. Message: "Your collection is just beginning"
- [ ] Activity checklist shows all 6 items unchecked with message "A new day, a new opportunity to grow" at the start of each day
- [ ] Dashboard friends preview shows CSS circle network illustration + "Faith grows stronger together" + "Invite a friend" CTA when user has no friends
- [ ] Dashboard leaderboard widget shows "You vs. Yesterday" self-comparison (today's pts vs yesterday's pts) when user has no friends
- [ ] `/friends` page Friends tab shows larger CSS circle network + "Invite someone to grow together" heading + prominently displayed search/invite form when friend list is empty
- [ ] `/friends` page Leaderboard tab shows full-width "You vs. Yesterday" comparison + "Your friends will appear here. In the meantime, compete with yourself!" when no friends
- [ ] `/insights` page shows a frosted glass banner "After 7 days, you'll see trends emerge" when user has < 7 days of mood data. Banner disappears at >= 7 days
- [ ] `/insights` page with 0 days of data shows ghosted chart + "Start checking in to unlock your mood insights"
- [ ] Notification panel shows "All caught up!" with party popper emoji when all notifications are read or no notifications exist

### Dashboard Transition Animations

- [ ] After mood check-in confirmation: check-in fades out (300ms), verse fades in (300ms), verse holds (3s), verse fades out (300ms), dashboard fades in (400ms) — total sequence ~4.3s
- [ ] The encouragement verse matches the selected mood and uses `font-serif` typography with mood-appropriate styling
- [ ] Simultaneous with dashboard fade-in: streak counter rolls up over 800ms, mood dot fades onto chart (400ms, 200ms delay), activity "Logged mood" item checks with animation (200ms), points count up (600ms)
- [ ] First-time streak (0 to 1): subtle 1.0 to 1.1 to 1.0 scale bump (300ms) after counter reaches 1
- [ ] If user skips check-in ("Not right now"), dashboard loads with standard 400ms fade-in, no orchestrated sequence
- [ ] If user already checked in today and returns/refreshes, dashboard loads immediately with no transition — all values at current state
- [ ] The verse during transition is announced to screen readers via `aria-live="polite"`

### Micro-Interactions

- [ ] Dashboard card collapse/expand uses `max-height` transition over 300ms with `ease-in-out`. No layout shift in multi-column grid (desktop)
- [ ] Collapse chevron rotates 180 degrees synchronized with the 300ms collapse animation
- [ ] Dashboard cards show subtle border brightness increase (`border-white/10` to `border-white/20`) on hover over 150ms. Desktop only (`@media (hover: hover)`)
- [ ] Activity check animation: circle fills with accent color (200ms) + checkmark draws via `stroke-dasharray` (200ms, overlapping start)
- [ ] Leaderboard rank changes animate with `translateY` slide over 300ms. No animation on initial render
- [ ] Encouragement button morphs: text fades out (100ms) -> checkmark + green flash fades in (100ms) -> holds 1500ms -> returns to original. Button disabled during morph
- [ ] Progress ring arc fills smoothly via `stroke-dashoffset` transition over 600ms
- [ ] Points count-up on any activity (not just check-in) animates from old to new value over 600ms with comma formatting throughout

### `prefers-reduced-motion` Compliance

- [ ] With `prefers-reduced-motion: reduce`: counter roll-ups display final value instantly (no counting)
- [ ] With `prefers-reduced-motion: reduce`: all fade transitions are instant (0ms duration)
- [ ] With `prefers-reduced-motion: reduce`: SVG check/ring animations display final state instantly
- [ ] With `prefers-reduced-motion: reduce`: card collapse/expand snaps to final state (no height transition)
- [ ] With `prefers-reduced-motion: reduce`: card hover glow disabled
- [ ] With `prefers-reduced-motion: reduce`: confetti/particles from Spec 8 celebrations are completely disabled
- [ ] With `prefers-reduced-motion: reduce`: leaderboard rank changes appear in final position immediately
- [ ] With `prefers-reduced-motion: reduce`: check-in to dashboard transition still shows the verse (for content) but with instant opacity changes. The 3s hold remains.
- [ ] A `useReducedMotion()` hook (or equivalent) reads `window.matchMedia('(prefers-reduced-motion: reduce)')` and is used by all animated components

### Visual Polish

- [ ] All dashboard cards use exactly `rounded-2xl` (no `rounded-xl` or `rounded-lg` on cards)
- [ ] All dashboard cards use exactly `bg-white/5 backdrop-blur-sm border border-white/10` (consistent frosted glass)
- [ ] Mood colors are identical across: check-in orbs, mood chart dots, mood chart line, heatmap squares, insights charts, monthly report heatmap (all reference the same constants)
- [ ] Typography hierarchy is consistent: card titles `text-white font-semibold`, body values `text-white text-2xl+ font-bold`, body text `text-white/70`, metadata `text-white/50 text-xs`
- [ ] All interactive elements on mobile have >= 44px touch targets (buttons, links, collapse toggles, nav arrows, bell, avatar, checklist items)
- [ ] All interactive elements on dark backgrounds show `focus-visible:ring-2 focus-visible:ring-purple-400` focus indicator
- [ ] Loading skeletons (pulsing `bg-white/10` blocks) appear for chart rendering and badge grid computation as a safety net
- [ ] WCAG AA contrast verified: if `text-white/40` fails AA at normal text size (< 18px), it's bumped to `text-white/50`
- [ ] Scrollable containers (notification panel, milestone feed) use thin dark scrollbars (`scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.15) transparent`)
- [ ] No layout shift when dashboard cards collapse/expand in multi-column grid layout (desktop)

### Accessibility

- [ ] All empty state messages are accessible to screen readers (not hidden with `aria-hidden`)
- [ ] The encouragement verse in the check-in transition uses `aria-live="polite"` to announce to screen readers
- [ ] During rapid-fire dashboard entry animations, no excessive live region announcements
- [ ] All ghosted/preview elements (15% opacity charts, badge silhouettes) have `aria-hidden="true"` since they're decorative
- [ ] CSS circle illustrations have `aria-hidden="true"` with the text message carrying the meaning
- [ ] Focus order across dashboard widgets follows logical reading order (left-to-right, top-to-bottom)

### Responsive Layout

- [ ] Mobile (< 640px): Empty state CTAs are full-width buttons. Single-column card layout with natural reflow on collapse. 44px touch targets enforced.
- [ ] Tablet (640-1024px): 2-column grid with no layout shift on collapse. Empty states centered within cards.
- [ ] Desktop (> 1024px): 2-column grid. Card hover glow active. Transition animations identical across all breakpoints.
