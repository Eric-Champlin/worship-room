# Feature: Warm Empty States

**Master Plan Reference:** N/A — cross-cutting UX improvement across existing features. Complements `_specs/empty-states-polish.md` (which covers dashboard/growth widgets). This spec covers the remaining 9+ feature areas outside the dashboard.

---

## Overview

A brand-new user's first impression of Worship Room should feel like walking into a warm, candlelit room — not an empty warehouse. This spec replaces blank areas, empty lists, and missing-data screens across all major features with encouraging, on-brand empty states that guide users toward their first action. The audit found 9 of 10 major features lack proper empty states outside the dashboard, creating a cold first impression where users don't know what to do. Every empty state is a gentle invitation to begin something good.

## User Stories

- As a **logged-in user** with no saved journal entries, I want to see a warm message and clear CTA so that I feel invited to write my first entry rather than staring at a blank list.
- As a **logged-in user** browsing an empty Prayer Wall category, I want to see encouragement to be the first to share so that I feel empowered rather than disappointed.
- As a **logged-in user** with no Bible highlights or notes, I want to see a friendly nudge toward reading so that I know what the feature does and where to start.
- As a **logged-in user** with no friends, I want to see a warm invitation to connect so that I feel the community is welcoming rather than empty.
- As a **logged-in user** visiting Insights with no mood data, I want to see an encouraging message and CTA rather than broken or empty charts.
- As a **logged-in user** with no active reading plan, I want to see a clear path to start one so that the feature feels approachable.
- As a **logged-in user** opening the Gratitude widget for the first time, I want a gentle prompt so that I know what to write.
- As a **logged-in user** on the dashboard with no active challenge, I want to know that challenges are seasonal and that the next one is coming.

---

## Requirements

### Shared Empty State Pattern

All empty states follow a consistent visual pattern:

- **Layout**: Centered vertically within its container, `max-w-sm mx-auto py-12`
- **Icon**: Lucide icon, 48px (desktop) / 40px (mobile), `text-white/20`, `aria-hidden="true"`
- **Heading**: `text-lg font-bold text-white/70`
- **Description**: `text-sm text-white/50`, 1-2 sentences max
- **CTA**: Single primary button (`bg-primary text-white rounded-lg`) or text link (`text-primary-lt`)
- **No frosted glass card** around the empty state — it sits directly on the dark background
- **Mobile padding**: `px-6` for horizontal breathing room

### 1. Journal Saved Entries

**Location**: Saved entries area below the journal textarea in `JournalTabContent` when the user has zero `SavedJournalEntry` items.

- **Icon**: `PenLine`
- **Heading**: "Your journal is waiting"
- **Description**: "Every thought you write becomes a conversation with God. Start with whatever's on your heart."
- **CTA**: "Write your first entry" (arrow) — switches focus to the Journal textarea (same tab, scroll up if needed)
- **Trigger**: `savedEntries.length === 0`

### 2. Prayer Wall Feed

**2a. No posts loaded (empty feed)**:
- **Icon**: `Heart`
- **Heading**: "This space is for you"
- **Description**: "Share what's on your heart, or simply pray for others."
- **CTA**: "Share a prayer request" — opens/focuses the inline composer (`InlineComposer`)

**2b. Filtered to empty (category filter active, no results)**:
- **Icon**: `Search`
- **Heading**: "No prayers in [Category Name] yet"
- **Description**: "Be the first to share."
- **CTA**: "Share a prayer request" — opens the composer with that category pre-selected

### 3. Bible Highlights & Notes

**Location**: "My Highlights & Notes" section on `/bible` when both `wr_bible_highlights` and `wr_bible_notes` are empty.

- **Icon**: `Highlighter`
- **Heading**: "Your Bible is ready to mark up"
- **Description**: "Tap any verse while reading to highlight it or add a personal note."
- **CTA**: "Start reading" (arrow) — links to `/bible/john/1` (Gospel of John chapter 1)

### 4. Friends List

**Location**: Friends tab on `/friends` when the friends array is empty (no accepted friends).

- **Icon**: `Users`
- **Heading**: "Faith grows stronger together"
- **Description**: "Invite a friend to join your journey, or find people from the Prayer Wall community."
- **CTA**: "Invite a friend" — triggers the existing invite flow (copy link / email input already on the Friends page)
- **Replaces**: Whatever currently renders when the friends array is empty

### 5. Friends Leaderboard

**Location**: Leaderboard tab on `/friends` when the user has no friends for the friends leaderboard.

- **Icon**: `Trophy`
- **Heading**: "Friendly accountability"
- **Description**: "Add friends to see how you encourage each other. No pressure — just love."
- **CTA**: "Find friends" (arrow) — switches to the Friends tab
- **Note**: The global leaderboard always shows mock data regardless of friend count

### 6. Insights — No Mood Data

**6a. Main empty state** (when `wr_mood_entries` is empty or has < 2 entries):
- **Icon**: `BarChart3`
- **Heading**: "Your story is just beginning"
- **Description**: "Check in with your mood each day, and watch your journey unfold here."
- **CTA**: "Check in now" (arrow) — links to `/` (dashboard, which triggers mood check-in)
- **Replaces**: Any empty/broken chart visualizations

**6b. Inline empty states** for sub-sections (no icon, no CTA — just a gentle sentence):
- **Meditation history** (no sessions in `wr_meditation_history`): *"Meditation trends will appear after your first few sessions."* — `text-white/40 italic text-sm`
- **Gratitude correlations** (no data): *"Gratitude insights will grow as you count your blessings."* — `text-white/40 italic text-sm`
- These render where the chart or correlation card would normally be

### 7. Reading Plan — Dashboard Widget

**Location**: Reading Plans dashboard widget when the user has no active plan (`wr_reading_plan_progress` is empty or all plans show no progress).

- **Icon**: `BookOpen`
- **Heading**: "Start a guided journey"
- **Description**: "Reading plans walk you through Scripture day by day."
- **CTA**: "Browse plans" (arrow) — links to `/grow?tab=plans`

### 8. Reading Plans — All Completed

**Location**: `/grow` page Reading Plans tab when ALL available plans are completed.

- **Icon**: `Star`
- **Heading**: "You've completed every plan!"
- **Description**: "New plans are coming. In the meantime, revisit your favorites or create your own."
- **CTA**: "Create a custom plan" (arrow) — triggers the AI plan creation flow (existing flow on the Grow page)
- **Note**: This state is rare — the tab normally shows 10 available plans. Only triggers when every plan's progress shows 100% completion.

### 9. Gratitude Widget — First-Time Helper

**Location**: Gratitude dashboard widget, above the first input field.

- **Content**: "Count three blessings from today" — `text-white/40 italic text-sm`
- **Trigger**: `wr_gratitude_entries` has length 0 (user has never saved a gratitude entry)
- **Behavior**: After their first save, the helper text never appears again
- **Note**: The widget already shows empty inputs with rotating placeholders. This adds a one-time helper sentence, not a full empty state block.

### 10. Challenge Widget — Dashboard

**Location**: Challenge dashboard widget when no challenge is active and none are currently available.

- **Icon**: `Flame`
- **Heading**: "Challenges bring us together"
- **Description**: "Seasonal challenges happen throughout the year. The next one is coming soon!"
- **Additional**: If an upcoming challenge exists in the data, show "Next: [Challenge Title] starts [relative date]" below the description in `text-white/50 text-sm`

### 11. Dashboard Coordination for New Users

The Getting Started checklist at the top of the dashboard provides the primary action plan for new users. Individual widget empty states provide context within each card. Coordinate so the dashboard doesn't feel like a wall of empty states:

- **Mood chart**: Already has ghosted example chart with "Your mood journey starts today" (from `empty-states-polish.md`). Verify it still looks correct on the dark background.
- **Streak card**: Already has encouraging message at streak 0 (from streak repair spec). Verify correct.
- **Friends preview**: Should show the "Faith grows stronger together" empty state (requirement 4 above, compact version for dashboard widget).
- **Challenge widget**: Uses requirement 10 above.
- **Reading plan widget**: Uses requirement 7 above.

### 12. Prayer List Verification

**Location**: `/my-prayers` when `wr_prayer_list` is empty.

- Already implemented per Spec 18 (Personal Prayer List). Verify it still works correctly:
  - **Icon**: `Heart`
  - **Heading**: "Your prayer list is empty"
  - **Description**: "Start tracking what's on your heart"
  - **CTA**: "Add Prayer" button

---

## Auth Gating

This spec modifies components that are already auth-gated by their parent features. No new routes or auth gates are introduced.

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| Journal saved entries empty state | Not visible — saving requires auth; logged-out users see textarea only with draft auto-save | Empty state appears below textarea when 0 saved entries | N/A |
| Prayer Wall empty feed | Visible — logged-out users can browse the feed | Same empty state; CTA "Share a prayer request" triggers auth modal if logged out | "Sign in to share a prayer request" |
| Prayer Wall filtered empty | Visible — logged-out users can filter | Same empty state; CTA triggers auth modal if logged out | "Sign in to share a prayer request" |
| Bible Highlights & Notes empty | Visible — the highlights section shows for all users | Same empty state with CTA to `/bible/john/1` (no auth needed to read) | N/A |
| Friends list empty | Not visible — `/friends` is auth-gated | Empty state with invite CTA | N/A |
| Friends leaderboard empty | Not visible — `/friends` is auth-gated | Empty state with "Find friends" CTA | N/A |
| Insights no data | Not visible — `/insights` is auth-gated | Empty state with "Check in now" CTA | N/A |
| Reading plan widget empty | Not visible — dashboard is auth-gated | Empty state with "Browse plans" CTA | N/A |
| Reading plans all completed | Visible — `/grow` is public | Same empty state; CTA triggers AI plan flow (may be auth-gated) | "Sign in to create a custom plan" |
| Gratitude helper text | Not visible — dashboard is auth-gated | Helper text above first input when no entries | N/A |
| Challenge widget empty | Not visible — dashboard is auth-gated | Empty state with next challenge info | N/A |
| Prayer list empty | Not visible — `/my-prayers` is auth-gated | Existing empty state (verify) | N/A |

---

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | Icon scales to 40px. Container uses `px-6` horizontal padding. CTAs are full-width buttons. Text stacks naturally. |
| Tablet (640-1024px) | Standard `max-w-sm mx-auto py-12` layout centered within container. |
| Desktop (> 1024px) | Same centered layout. Within dashboard cards, empty states center in the card's content area. |

- Empty states never break out of their parent container
- On mobile, the icon + heading + description + CTA stack vertically with natural spacing
- Dashboard widget empty states adapt to the widget's available height (compact version with less `py` padding if the widget is small)
- Prayer Wall empty state centers in the feed area, respecting the sidebar layout on desktop

---

## AI Safety Considerations

N/A — This feature does not involve AI-generated content or free-text user input. All empty state copy is hardcoded. No crisis detection required.

---

## Auth & Persistence

- **Logged-out users**: Can see empty states on public pages (Prayer Wall feed, Bible highlights, Grow page). No data persistence.
- **Logged-in users**: Empty states appear based on existing localStorage data checks. No new data is written.
- **Route type**: No new routes. Modifies existing public and protected pages.
- **No new localStorage keys introduced**
- **Data sources (all read-only)**: `wr_mood_entries`, `wr_meditation_history`, `wr_gratitude_entries`, `wr_bible_highlights`, `wr_bible_notes`, `wr_prayer_list`, `wr_reading_plan_progress`, `wr_challenge_progress`, `wr_friends`

---

## Completion & Navigation

N/A — standalone UX improvement, not a Daily Hub feature.

---

## Design Notes

- All empty states use the shared pattern: `max-w-sm mx-auto py-12`, Lucide icon at `text-white/20`, heading at `text-white/70`, description at `text-white/50`, primary CTA
- No frosted glass card wrapping — empty states sit directly on the dark background as gentle invitations
- Icons are decorative only (`aria-hidden="true"`) — the heading and description carry all meaning
- CTA buttons use the standard primary button style from the design system (`bg-primary text-white font-semibold py-3 px-8 rounded-lg`) or text link style (`text-primary-lt hover:underline`)
- Inline empty states (meditation history, gratitude correlations) use a lighter touch: `text-white/40 italic text-sm`, no icon, no CTA
- The Gratitude widget helper is a one-time hint, not a full empty state block — `text-white/40 italic text-sm` above the inputs
- Reference existing frosted glass card pattern from `09-design-system.md` for dashboard widget contexts
- Design system recon at `_plans/recon/design-system.md` provides exact gradient and color values for dark backgrounds

### Tone Guidelines

- **Always**: Warm, encouraging, spiritually grounded. Frame emptiness as the beginning of something good.
- **Never**: Clinical, guilt-inducing, "you have no data", "nothing here yet", or anything that makes the user feel behind.
- **Examples of good framing**: "Your journal is waiting", "This space is for you", "Your story is just beginning"
- **Examples of bad framing**: "No entries found", "Empty", "You haven't done anything yet"

---

## Out of Scope

- **Changing any feature behavior, data models, or storage** — only visual empty state rendering
- **Dashboard empty states already covered by `empty-states-polish.md`** (mood chart, streak counter, faith points, badges, activity checklist, notification panel, "You vs. Yesterday" leaderboard) — this spec coordinates with those, not duplicates them
- **Backend API integration** — Phase 3
- **Dark mode toggle** — Phase 4
- **Animated illustrations or Lottie** — keep it simple with Lucide icons
- **Empty states for Music features** — Music has its own browse UI that's always populated
- **Empty states for Meditation sub-pages** — these redirect logged-out users and show content for logged-in users
- **New animations or transitions** — covered by `empty-states-polish.md`

---

## Acceptance Criteria

### Shared Pattern

- [ ] All new empty states use the consistent pattern: `max-w-sm mx-auto py-12`, centered in container
- [ ] All icons are Lucide, 48px on desktop, 40px on mobile (< 640px), with `text-white/20` and `aria-hidden="true"`
- [ ] All headings use `text-lg font-bold text-white/70`
- [ ] All descriptions use `text-sm text-white/50`, 1-2 sentences max
- [ ] All CTAs use standard primary button or `text-primary-lt` link style with clear accessible name
- [ ] No frosted glass card wraps any empty state — they sit on the dark background directly
- [ ] On mobile, empty states use `px-6` padding and icons scale to 40px

### Journal

- [ ] When `savedEntries` is empty, the saved entries area below the journal textarea shows: PenLine icon, "Your journal is waiting", description, and "Write your first entry" CTA
- [ ] The CTA scrolls to / focuses the journal textarea

### Prayer Wall

- [ ] When the Prayer Wall feed has no posts, it shows: Heart icon, "This space is for you", description, and "Share a prayer request" CTA that opens the inline composer
- [ ] When a category filter is active with no results, it shows: Search icon, "No prayers in [Category Name] yet", "Be the first to share.", and "Share a prayer request" CTA that opens composer with that category pre-selected
- [ ] Logged-out users see the empty states but the CTA triggers the auth modal with "Sign in to share a prayer request"

### Bible Highlights & Notes

- [ ] When both `wr_bible_highlights` and `wr_bible_notes` are empty, the My Highlights & Notes section shows: Highlighter icon, "Your Bible is ready to mark up", description, and "Start reading" CTA linking to `/bible/john/1`

### Friends

- [ ] When the friends array is empty on `/friends` Friends tab, it shows: Users icon, "Faith grows stronger together", description, and "Invite a friend" CTA triggering the existing invite flow
- [ ] This replaces whatever previously rendered for an empty friends list

### Leaderboard

- [ ] When the user has no friends, the friends leaderboard tab shows: Trophy icon, "Friendly accountability", description, and "Find friends" CTA switching to Friends tab
- [ ] The global leaderboard continues to show mock data regardless

### Insights

- [ ] When `wr_mood_entries` is empty or has < 2 entries, the main Insights page replaces empty charts with: BarChart3 icon, "Your story is just beginning", description, and "Check in now" CTA linking to `/`
- [ ] Meditation history sub-section with no sessions shows italic text: "Meditation trends will appear after your first few sessions." in `text-white/40`
- [ ] Gratitude correlation sub-section with no data shows italic text: "Gratitude insights will grow as you count your blessings." in `text-white/40`

### Reading Plans

- [ ] Dashboard reading plan widget with no active plan shows: BookOpen icon, "Start a guided journey", description, and "Browse plans" CTA linking to `/grow?tab=plans`
- [ ] `/grow` Reading Plans tab with all plans completed shows: Star icon, "You've completed every plan!", description, and "Create a custom plan" CTA triggering AI plan creation

### Gratitude Widget

- [ ] When `wr_gratitude_entries` has length 0, the text "Count three blessings from today" appears above the first input in `text-white/40 italic`
- [ ] After the user's first gratitude save, the helper text never appears again

### Challenge Widget

- [ ] Dashboard challenge widget with no active/available challenge shows: Flame icon, "Challenges bring us together", description
- [ ] If an upcoming challenge exists, it shows "Next: [Title] starts [relative date]" below the description

### Dashboard Coordination

- [ ] Dashboard mood chart ghosted empty state (from `empty-states-polish.md`) visually correct on dark background
- [ ] Dashboard streak card at 0 shows encouraging message (from streak repair spec)
- [ ] Dashboard friends preview widget shows compact "Faith grows stronger together" empty state when no friends
- [ ] Dashboard does not feel like a wall of empty states — Getting Started checklist provides primary guidance, widget empty states provide per-card context

### Verification (Existing Features)

- [ ] Prayer list empty state on `/my-prayers` still works: Heart icon, "Your prayer list is empty", "Start tracking what's on your heart", "Add Prayer" CTA button

### Accessibility

- [ ] All empty state icons have `aria-hidden="true"` (decorative)
- [ ] All headings and descriptions are readable by screen readers
- [ ] All CTAs have clear accessible names (button text or `aria-label`)
- [ ] Empty states are keyboard-navigable — CTA is focusable and activatable via Enter/Space
- [ ] Focus indicators visible on all CTAs (`focus-visible:ring-2 focus-visible:ring-purple-400`)
