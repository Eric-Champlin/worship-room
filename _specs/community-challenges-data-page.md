# Feature: Community Challenges Data Model & Challenge Page

**Spec sequence:** This is Spec 1 of a 3-spec community challenges sequence. Spec 2 will add challenge sharing, social features, and challenge-completion celebrations with faith points integration. Spec 3 will add challenge leaderboards, team challenges, and dashboard integration.

---

## Overview

Time-limited community challenges are the single most effective growth mechanic in the Christian app space. Hallow's Pray40 Lent challenge drove them to #1 in the App Store by creating urgency, community, and viral sharing — all centered on a shared spiritual journey. Worship Room currently has no time-limited community content despite having all the building blocks: liturgical calendar awareness, reading plans, daily devotionals, and activity tracking.

This feature introduces community challenges — seasonal, multi-day spiritual journeys that users join together. Five hardcoded challenges are tied to the liturgical calendar (Lent, Easter, Pentecost, Advent, and New Year), each with daily content containing scripture, reflection, and a concrete action that maps directly to an existing Worship Room activity (pray, journal, meditate, music, gratitude, or prayer wall posting). This creates a natural engagement loop: the challenge gives users a reason to open the app daily, and the daily action drives them into features they might not otherwise explore.

Two new routes — `/challenges` (browser page) and `/challenges/:challengeId` (detail page) — provide the full challenge experience. The browser page highlights the currently active challenge, previews upcoming ones, and archives past seasons. The detail page delivers daily content in the same contemplative, single-column format proven by the Daily Devotional and Reading Plans features.

---

## User Stories

- As a **logged-out visitor**, I want to browse available community challenges so that I can see what seasonal content Worship Room offers before creating an account.
- As a **logged-out visitor**, I want to preview the first day of an active challenge so that I can experience the content quality before signing in.
- As a **logged-in user**, I want to join a community challenge so that I have a structured daily spiritual practice shared with others in the Worship Room community.
- As a **logged-in user**, I want to track my progress through a challenge so that I feel accountability and momentum alongside other participants.
- As a **logged-in user**, I want each day's action to connect me to an existing Worship Room feature so that the challenge deepens my use of the platform.
- As a **logged-in user**, I want to be reminded when an upcoming challenge is about to start so that I don't miss the beginning.
- As a **logged-in user**, I want to browse back through completed days so that I can revisit scripture and reflections that spoke to me.

---

## Requirements

### Challenge Data Model

1. **5 hardcoded seasonal challenges** stored in a dedicated constants/data file (`wr_challenges`). Each challenge has:
   - `id` — slug string (e.g., `"pray40-lenten-journey"`)
   - `title` — human-readable title (e.g., "Pray40: A Lenten Journey")
   - `description` — 2-3 sentences describing the challenge journey
   - `season` — one of: `lent`, `easter`, `pentecost`, `advent`, `newyear`
   - `startDate` — a computed function that returns the start date for a given year, using the existing liturgical calendar from `liturgical-calendar.ts`:
     - **Lent**: Ash Wednesday (computed from Easter via `computeEasterDate`)
     - **Easter**: Easter Sunday (via `computeEasterDate`)
     - **Pentecost**: Pentecost Sunday (Easter + 49 days)
     - **Advent**: 4th Sunday before Christmas (via Advent start computation)
     - **New Year**: January 1
   - `durationDays` — 7, 21, or 40
   - `icon` — Lucide icon name (string reference)
   - `themeColor` — matching the liturgical season color from the existing `LITURGICAL_SEASONS` constants (e.g., Lent uses `#6B21A8`, Advent uses `#7C3AED`)
   - `dailyContent` — array of `DayChallengeContent` objects (one per day)
   - `communityGoal` — string describing a collective target (e.g., "10,000 prayers as a community")

2. **Each `DayChallengeContent` has:**
   - `dayNumber` — integer (1-based)
   - `title` — e.g., "Day 1: Surrender"
   - `scripture` — object with `reference` (e.g., "Matthew 6:16-18") and `text` (WEB translation, full passage text)
   - `reflection` — 1-2 paragraphs connecting the scripture to the day's theme within the challenge
   - `dailyAction` — a specific, concrete task (e.g., "Pray for 5 minutes about what you're surrendering", "Journal about a time God provided", "Listen to a worship song and sit in silence for 2 minutes")
   - `actionType` — one of: `pray`, `journal`, `meditate`, `music`, `gratitude`, `prayerWall` — maps to an existing trackable activity so completion can be auto-detected in Spec 2

3. **The 5 challenges:**

   | # | Title | Season | Duration | Theme |
   |---|-------|--------|----------|-------|
   | 1 | "Pray40: A Lenten Journey" | `lent` | 40 days | Daily prayer and fasting reflections |
   | 2 | "Easter Joy: 7 Days of Resurrection Hope" | `easter` | 7 days | Celebrating the risen Christ |
   | 3 | "Fire of Pentecost: 21 Days of the Spirit" | `pentecost` | 21 days | Exploring the Holy Spirit |
   | 4 | "Advent Awaits: 21 Days to Christmas" | `advent` | 21 days | Preparing hearts for Christmas |
   | 5 | "New Year, New Heart: 21 Days of Renewal" | `newyear` | 21 days | Fresh start, spiritual renewal |

4. **Bible passages must use the WEB translation** (World English Bible, public domain).

5. **Reflection paragraphs** should be warm, encouraging, practical, and non-denominational. Written in second-person ("you") voice — never preachy, never judgmental, always hopeful. They connect the passage to the challenge's daily theme.

6. **Daily actions** should be specific and completable within 5-15 minutes. Each action must clearly map to one of the 6 action types so that Spec 2 can auto-detect completion via the existing activity tracking system.

7. **Action type distribution**: Each challenge should use a variety of action types across its days — not all "pray" or all "journal." The distribution should feel natural to the challenge's theme (e.g., a Lent challenge will lean more toward pray and meditate, while Easter may include more gratitude and music).

### Challenge Browser Page (`/challenges`)

8. **Dark background** matching the inner page style (same hero gradient pattern as Prayer Wall, Reading Plans — fading from dark purple to neutral `#F5F5F5`).

9. **PageHero component** with:
   - Title: "Community Challenges"
   - Subtitle: "Grow together in faith"

10. **Active challenge section** (when a challenge is currently running):
    - Large featured card with prominent visual treatment
    - Challenge title in large heading with the challenge's theme color as an accent
    - Days remaining countdown: "X days remaining" or "Starts today!" or "Last day!"
    - Participant count (mock — see requirement 25)
    - Community goal display (e.g., "Community goal: 10,000 prayers")
    - Primary CTA: "Join Challenge" (primary CTA style) for users who haven't joined, "Continue" for users who have joined, "Completed" badge for users who finished
    - If the user has joined: progress indicator ("Day X of Y")
    - The challenge's Lucide icon displayed prominently
    - Card background uses the challenge's theme color at low opacity (10-15%) for a seasonal feel

11. **No active challenge state**: When no challenge is currently running, show a countdown to the next upcoming challenge:
    - "Next challenge starts in X days" with the next challenge's title
    - Preview of the challenge description
    - "Remind me" button (stores to localStorage)
    - Visually distinct from the active challenge card — more subdued, anticipatory

12. **Upcoming challenges section** (challenges that haven't started yet):
    - Medium-sized cards in a grid (2 columns desktop, single column mobile)
    - Each card shows: challenge icon, title, description (2-line truncation), season tag, duration ("40 days"), start date formatted as "Starts [Month Day]"
    - "Remind me" button on each card
    - Reminder state stored in `wr_challenge_reminders` localStorage key (array of challenge IDs)
    - If user has already set a reminder: button shows "Reminder set" in muted style (non-destructive toggle — clicking again removes the reminder)

13. **Past challenges section** (challenges whose date range has passed):
    - Smaller, muted cards
    - Each card shows: icon, title, season tag, "Completed" badge (if user completed it) or "Missed" badge (if the challenge ran and the user didn't complete it, or didn't join)
    - Clicking a past challenge card navigates to its detail page where the user can browse the content (read-only, no progress tracking)

14. **Section ordering** on the browser page:
    1. Active challenge (or next-challenge countdown if none active)
    2. Upcoming challenges
    3. Past challenges

15. **Empty state**: If for some reason no challenges exist or all logic fails, display: "New challenges are coming soon. Check back during the next season." (This is a safety net — with 5 hardcoded seasonal challenges, there should always be at least upcoming/past challenges to show.)

### Challenge Detail Page (`/challenges/:challengeId`)

16. **Hero section** with:
    - Challenge title in large heading
    - Challenge description
    - Theme color gradient background (challenge's theme color used as the dominant accent, blending with the standard dark purple hero)
    - Progress bar (if user has joined): visual bar showing `completedDays / durationDays` with percentage label
    - Participant count: "X people are on this journey with you"
    - Community goal progress (mock display — e.g., "4,238 of 10,000 prayers")
    - The challenge's Lucide icon

17. **Daily content area** below the hero: single centered column (`max-w-2xl`), matching the Daily Devotional and Reading Plans page layout. Content flows vertically:
    - **Day title**: Large heading (e.g., "Day 1: Surrender")
    - **Scripture section**: Reference label above, verse text in Lora italic, same styling as Daily Devotional passage section
    - **Reflection section**: Inter body text, 1-2 paragraphs, comfortable line height (`leading-relaxed`)
    - **Daily action callout**: Frosted glass card (`bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6`). Contains:
      - Action type icon (Lucide icon matching the action type — e.g., prayer hands for `pray`, pencil for `journal`)
      - "Today's action:" label in muted text
      - Action text in full white
      - "Mark Complete" button (primary CTA) — only for the user's current day
      - Feature link: "Go to Prayer >" / "Go to Journal >" / "Go to Meditation >" etc., linking to the relevant Worship Room feature (e.g., `/daily?tab=pray`, `/daily?tab=journal`, `/daily?tab=meditate`, `/music`)
    - Sections separated by subtle dividers (`border-white/10`)

18. **Day sequencing**: Days are sequential based on when the user joined, not the calendar date. If a user joins on Day 3 of the challenge's calendar window, they start at Day 1 of their personal journey. Their "current day" is calculated as: `daysSinceJoined + 1` (capped at the challenge's `durationDays`).

19. **Day navigation** at the bottom of the content:
    - "Previous Day" / "Next Day" buttons (outline style on dark background, matching Reading Plans)
    - Day selector dropdown showing all days with:
      - Checkmarks on completed days
      - Lock icon on days beyond current progress (locked days)
      - Current day highlighted
    - Same locking pattern as Reading Plans: days beyond current progress are locked and show a brief message when clicked: "Complete today's challenge to unlock the next day."

20. **Day completion**: A day is marked complete when the user clicks the "Mark Complete" button in the daily action callout. Unlike Reading Plans (scroll-based), challenges use an explicit button because the daily action involves doing something outside the page (praying, journaling, etc.). Completion only fires for the user's current day.

21. **Challenge completion**: When all days are completed, show a brief celebration message on the last day's content (e.g., "You've completed [Challenge Title]! What an incredible journey. [Participant count] others completed this challenge with you."). The browser page shows "Completed" badge.

### Progress Tracking

22. **localStorage key**: `wr_challenge_progress` — an object keyed by challenge `id`, with each value containing:
    - `joinedAt` — ISO timestamp of when the user joined
    - `currentDay` — number (1-based, the next day the user should complete)
    - `completedDays` — array of day numbers that have been completed
    - `completedAt` — ISO timestamp or `null` if in progress

23. **Multiple active challenges**: Unlike Reading Plans (single active plan), users can participate in multiple challenges simultaneously (since challenges are time-bound and seasonal, overlap is rare but possible — e.g., a New Year challenge might overlap with Christmas season's tail end). No pause/resume mechanic needed.

24. **Reminder storage**: `wr_challenge_reminders` localStorage key — array of challenge IDs the user wants to be reminded about. (Actual reminder delivery is Phase 3+ — for now, the reminder state is stored and the UI reflects it.)

### Participant Count (Mock)

25. **Deterministic mock participant count**: Since there's no backend, simulate community participation with a deterministic number based on the challenge ID and current day within the challenge calendar:
    - Formula: `base(500) + (calendarDayWithinChallenge * 23) + (challengeId.length * 47)`, capped at 2,000
    - `calendarDayWithinChallenge` = number of days since the challenge's computed start date (not the user's personal day)
    - This gives a believable growing number that's the same for all users on the same day
    - Community goal progress: `Math.min(participantCount * 3, communityGoalNumber)` (simulates collective effort)
    - In Phase 3 with a real backend, these become actual aggregated counts

### Navbar Integration

26. **Add "Challenges" to the navbar** as a new top-level link. Position: after "Reading Plans" and before "Prayer Wall" in the `NAV_LINKS` array. The link goes to `/challenges`.

27. **Desktop navbar**: "Challenges" appears as a text link with a Lucide `Flame` icon (same icon pattern as Daily Devotional's `Sparkles` and Reading Plans' `BookOpen`).

28. **Mobile drawer**: "Challenges" appears in the drawer menu in the same relative position.

29. **Active state**: The link shows the active underline/highlight when on `/challenges` or `/challenges/:challengeId`.

30. **Active season indicator**: During an active challenge season (when a challenge is currently running based on the liturgical calendar), the "Challenges" nav link gains a small pulsing dot indicator (e.g., a 6px circle in the challenge's theme color with a subtle pulse animation) to draw attention. The indicator is purely CSS — no JavaScript polling or timers.

---

## Auth & Persistence

### Auth Gating Per Interactive Element

| Element | Logged-out behavior | Logged-in behavior |
|---------|--------------------|--------------------|
| Browse `/challenges` | Visible, no restrictions. Can browse all challenges, read descriptions, see participant counts. | Same |
| View challenge detail hero | Visible, no restrictions | Same |
| Read day content (Day 1 only) | Visible as preview — full Day 1 content readable without login | Same |
| Read day content (Day 2+) | Auth modal: "Sign in to join this challenge" | Visible if day is unlocked |
| "Join Challenge" button | Auth modal: "Sign in to join this challenge" | Joins challenge, navigates to Day 1 |
| "Continue" button | Auth modal: "Sign in to continue this challenge" | Navigates to current day |
| "Mark Complete" button | Not visible (Day 1 preview doesn't show Mark Complete for logged-out users) | Marks current day complete, advances to next day |
| "Remind me" button | Auth modal: "Sign in to set a reminder" | Toggles reminder in localStorage |
| Day selector dropdown | Auth modal on Day 2+ if challenge not joined | Navigates to selected day (if unlocked) |
| Previous/Next Day buttons | Auth modal on Day 2+ if challenge not joined | Navigates if day is unlocked |
| Feature link ("Go to Prayer >") | Visible, navigates to the feature (feature itself handles its own auth gating) | Same |
| Navbar "Challenges" link | Visible, links to `/challenges` | Same |
| Past challenge browsing | All content readable (read-only, no progress tracking) | Same + shows completion badge if applicable |

### Persistence

- **Logged-out**: Zero persistence. No localStorage writes, no cookies. Day 1 content is viewable as a preview but nothing is tracked.
- **Logged-in**: Two new localStorage keys:
  - `wr_challenge_progress` — object keyed by challengeId with join date, current day, completed days, completion timestamp
  - `wr_challenge_reminders` — array of challenge IDs
- **Route type**: Public (`/challenges`, `/challenges/:challengeId`). No auth required to browse. Auth required to join/track progress/set reminders.

---

## AI Safety Considerations

- **Crisis detection needed?**: No. This feature displays curated, hardcoded content — no user text input, no AI-generated content. The daily action links to existing features (Pray, Journal, etc.) which have their own crisis detection.
- **User input involved?**: No. All content is pre-written and hardcoded. The "Mark Complete" button is a simple toggle, not a text input.
- **AI-generated content?**: No. All challenge content (scripture, reflections, daily actions) is pre-authored and curated.
- **Theological boundaries**: Reflections and daily actions must follow the existing theological boundary rules: never claim divine authority, avoid denominational bias, use encouraging language ("Scripture encourages us..." not "God is telling you..."). See `01-ai-safety.md`.

---

## UX & Design Notes

### Emotional Tone

Community challenges should feel like joining a movement — a collective spiritual journey where you're not alone. The browser page should create excitement and urgency ("Join 1,247 others on this journey"). The detail page should feel identical to the Daily Devotional and Reading Plans — contemplative, unhurried, warm. Progress tracking should feel encouraging ("Day 12 of 40 — you're making incredible progress!"), never guilt-inducing if the user misses a day.

The community aspect is the differentiator from Reading Plans. Participant counts, community goals, and "others are on this journey with you" messaging should be prominent but not overwhelming. The feeling should be: "I'm part of something bigger."

### Visual Design — Browser Page

- **Background**: Inner page hero gradient fading from dark purple to neutral `#F5F5F5` (same as Prayer Wall, Reading Plans, Local Support)
- **Active challenge featured card**: White card with theme color accent. `bg-white rounded-2xl border border-gray-200 shadow-lg p-6 sm:p-8`. The challenge's theme color appears as a top border accent (`border-t-4` in the theme color), the challenge icon area background, and the "Join Challenge" button background.
- **Upcoming challenge cards**: Standard white card pattern (`bg-white rounded-xl border border-gray-200 shadow-sm p-6`). Hover: `shadow-md` transition.
- **Past challenge cards**: Slightly muted — `bg-gray-50 rounded-xl border border-gray-200 p-4`. Reduced padding, smaller text.
- **"Join Challenge" button**: Uses the challenge's theme color as background instead of the standard `bg-primary`. Text white. `font-semibold py-3 px-8 rounded-lg`.
- **"Remind me" button**: Outline style — `border border-gray-300 text-text-dark py-2 px-4 rounded-lg text-sm`. When reminder is set: `bg-gray-100 text-text-light` with a checkmark icon.
- **Participant count**: Displayed with a `Users` Lucide icon. `text-text-light text-sm`.
- **Days remaining**: Bold countdown number. `text-lg font-bold` in the challenge's theme color.
- **Season tags**: Small pills using the challenge's theme color at 15% opacity with theme color text. `rounded-full px-3 py-1 text-xs font-medium`.
- **"Completed" badge**: `bg-success/10 text-success text-sm font-medium rounded-full px-4 py-2` (same as Reading Plans).
- **"Missed" badge**: `bg-gray-100 text-text-light text-sm font-medium rounded-full px-4 py-2`.

### Visual Design — Detail Page

- **Background**: All-dark contemplative style matching Daily Devotional and Reading Plans detail pages (`bg-hero-dark` throughout)
- **Hero gradient**: Standard dark hero with the challenge's theme color blended in. The theme color appears as a subtle radial overlay (e.g., `radial-gradient(circle at 50% 30%, {themeColor}20 0%, transparent 60%)` layered on the standard dark gradient). This gives each challenge a distinct seasonal feel.
- **Content column**: `max-w-2xl mx-auto px-4 sm:px-6` — identical to Daily Devotional and Reading Plans
- **Scripture styling**: Same as Daily Devotional — Lora italic, reference label above, flowing paragraph with verse reference
- **Reflection styling**: Same as Daily Devotional — Inter body text, comfortable line height
- **Daily action callout**: Frosted glass card (`bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6`), same as Reading Plans action step card
- **"Mark Complete" button**: Uses the challenge's theme color as background. Full-width within the callout card.
- **Feature link**: Text link in the theme color with a right arrow. `text-sm font-medium` with hover underline.
- **Progress bar**: Same as Reading Plans — thin horizontal bar (`h-2 rounded-full bg-white/10`), filled portion in the challenge's theme color.
- **Section dividers**: `border-t border-white/10` between sections, `py-8 sm:py-10` spacing
- **Day navigation buttons**: Same as Reading Plans — outline style on dark background (`bg-white/10 text-white border border-white/20 rounded-lg px-4 py-3 hover:bg-white/15`)
- **Day selector dropdown**: Same as Reading Plans — dark dropdown (`bg-hero-mid border border-white/15 rounded-xl shadow-lg`)
- **Participant count in hero**: Displayed with `Users` icon, `text-white/60 text-sm`
- **Community goal in hero**: Small progress bar + text, `text-white/50 text-xs`

### Design System Recon References

- **Inner page hero gradient**: Design system recon "Inner Page Hero" pattern (for browser page)
- **All-dark page**: Same as Daily Devotional, Dashboard, Reading Plans detail (for detail page)
- **White card pattern**: Meditation/Reading Plans card pattern (`bg-white rounded-xl border border-gray-200 shadow-sm`)
- **Frosted glass callout**: Dashboard card pattern (`bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`)
- **Primary CTA button**: `bg-primary text-white font-semibold py-3 px-8 rounded-lg` (adapted with theme color)
- **Outline button**: `bg-white/10 text-white border border-white/20 rounded-lg`
- **Dropdown panel**: Navbar dropdown style (`bg-hero-mid border-white/15`)
- **Progress bar**: Same linear progress pattern as Reading Plans

### New Visual Patterns

1. **Theme-colored featured card**: A white card with a colored top border accent and themed CTA button. The theme color creates seasonal personality — Lent challenges feel purple, Easter feels golden, Pentecost feels red. New card variant.
2. **Active season nav indicator**: A small pulsing dot next to the "Challenges" nav link during active challenge periods. New nav element pattern.
3. **Community goal progress display**: A mini progress bar + text showing collective community progress toward a shared goal. New community-oriented pattern.
4. **Countdown to next challenge**: A centered, anticipatory countdown card showing days until the next challenge starts. New temporal UI pattern.

---

## Responsive Behavior

### Mobile (< 640px)

- **Browser page**: Single-column layout. Active challenge card is full-width. Upcoming and past cards stack vertically. Season tags and metadata pills wrap naturally.
- **Active challenge card**: Icon, title, countdown, participant count, and CTA stack vertically. Full-width "Join Challenge" button.
- **Detail page hero**: Title, description, progress bar, and participant count stack vertically. Reduced padding.
- **Content column**: Full-width with `px-4` side padding.
- **Day navigation buttons**: Stacked vertically, full-width.
- **Day selector dropdown**: Full-width below the navigation buttons.
- **Daily action callout**: Full-width, `p-4`. "Mark Complete" button is full-width. Feature link below the button.
- **Touch targets**: All interactive elements meet 44px minimum touch target.

### Tablet (640px - 1024px)

- **Browser page**: 2-column grid for upcoming/past challenge cards. Active challenge card is full-width (featured).
- **Detail page**: Same as desktop but with slightly reduced padding.
- **Day navigation buttons**: Horizontal row, centered.
- **Day selector dropdown**: Inline with navigation buttons.

### Desktop (> 1024px)

- **Browser page**: Active challenge card full-width with horizontal layout (icon/title on left, countdown/CTA on right). 2-column grid for upcoming cards with `max-w-4xl mx-auto`. Past cards in a more compact 3-column grid.
- **Detail page**: `max-w-2xl mx-auto` content column. Generous hero padding.
- **Day navigation buttons**: Horizontal row, centered, comfortable spacing.
- **Day selector dropdown**: Inline with navigation buttons.

---

## Edge Cases

- **Invalid challenge ID**: `/challenges/nonexistent` shows a "Challenge not found" message with a link back to `/challenges`.
- **Challenge not yet started**: If a user navigates directly to a future challenge's detail page, show the challenge description, start date countdown, and "Remind me" CTA — but no day content. Message: "This challenge starts on [date]. Set a reminder to be notified."
- **Challenge already ended**: If a user navigates to a past challenge detail page, all content is readable (read-only). No "Mark Complete" buttons, no progress tracking. If the user previously participated, their completed days show checkmarks. If they didn't participate, all days are accessible (no locking for past challenges).
- **Joining mid-challenge**: A user can join a challenge at any point during its calendar window. They start at Day 1 of their personal journey regardless of how many calendar days have passed. Their challenge experience is personal — they won't miss content.
- **Challenge calendar window ends before user finishes**: If the challenge's calendar window passes while the user is still progressing through their days, they can continue completing remaining days. The challenge remains "in progress" for them until they finish or choose to abandon it. Content stays accessible.
- **Year boundary**: Advent and New Year challenges span the year boundary. The start date computation must handle this correctly (same patterns already solved in `liturgical-calendar.ts`).
- **Multiple challenges running simultaneously**: Rare but possible (e.g., a New Year challenge overlapping with the tail end of a Christmas-season challenge). Both appear in the "Active" section of the browser page.
- **Re-reading completed days**: Users can freely navigate back to any completed day. No additional tracking fires.
- **Clearing localStorage**: If `wr_challenge_progress` is cleared, all progress is lost. Challenges appear as unjoined on the browser page.
- **Day 1 preview for logged-out users**: Full Day 1 content is readable without the "Mark Complete" button. Attempting to navigate to Day 2 shows the auth modal.
- **Long challenge titles**: Titles may wrap on mobile. Use standard text wrapping — no truncation on titles.
- **Participant count consistency**: The mock formula is deterministic, so all users see the same participant count on the same calendar day.

---

## Acceptance Criteria

### Data Model

- [ ] 5 challenge entries exist in a dedicated constants/data file
- [ ] Each challenge has all required fields: `id`, `title`, `description`, `season`, `startDate` (computed function), `durationDays`, `icon`, `themeColor`, `dailyContent` array, `communityGoal`
- [ ] Each day has all required fields: `dayNumber`, `title`, `scripture` (reference + text), `reflection` (1-2 paragraphs), `dailyAction`, `actionType`
- [ ] All Bible passages use WEB translation
- [ ] Action types are distributed across all 6 types (`pray`, `journal`, `meditate`, `music`, `gratitude`, `prayerWall`) within each challenge
- [ ] Reflection paragraphs are written in warm second-person ("you") voice
- [ ] Daily actions are specific and completable within 5-15 minutes
- [ ] Challenge durations match spec: 40 days (Lent), 7 days (Easter), 21 days (Pentecost, Advent, New Year)
- [ ] Start date functions correctly use the liturgical calendar's `computeEasterDate` and Advent computation for dynamic years

### Start Date Computation

- [ ] Lent challenge starts on Ash Wednesday (Easter minus 46 days) — correct for 2026 (Feb 18), 2027 (Feb 10)
- [ ] Easter challenge starts on Easter Sunday — correct for 2026 (April 5), 2027 (March 28)
- [ ] Pentecost challenge starts on Pentecost Sunday (Easter + 49) — correct for 2026 (May 24), 2027 (May 16)
- [ ] Advent challenge starts on the 4th Sunday before Christmas — correct for 2026 (Nov 29), 2027 (Nov 28)
- [ ] New Year challenge starts on January 1 every year
- [ ] All start date functions work for any year without manual updates

### Browser Page (`/challenges`)

- [ ] Route `/challenges` exists and renders the browser page
- [ ] PageHero displays "Community Challenges" title and "Grow together in faith" subtitle
- [ ] When a challenge is currently active: featured card displays with title, countdown, participant count, community goal, and "Join Challenge" CTA
- [ ] When no challenge is active: countdown to next challenge displays with title preview and "Remind me" button
- [ ] Upcoming challenges display as medium cards with title, description, season tag, duration, start date, and "Remind me" button
- [ ] Past challenges display as smaller muted cards with "Completed" or "Missed" badges
- [ ] Section ordering: Active (or countdown) > Upcoming > Past
- [ ] "Remind me" button toggles reminder state in `wr_challenge_reminders` localStorage
- [ ] Cards link to `/challenges/:challengeId`
- [ ] Desktop: active card full-width, upcoming/past in 2-column grid
- [ ] Mobile: all cards single-column, stacked

### Challenge Detail Page (`/challenges/:challengeId`)

- [ ] Route `/challenges/:challengeId` exists and renders the challenge detail page
- [ ] Hero displays challenge title, description, theme color gradient, progress bar (if joined), participant count
- [ ] Community goal shows mock progress
- [ ] All-dark background throughout the page
- [ ] Day content renders in centered `max-w-2xl` column
- [ ] Day title is displayed prominently
- [ ] Scripture section: reference label, Lora italic text
- [ ] Reflection section: Inter body text, 1-2 paragraphs, comfortable line height
- [ ] Daily action callout: frosted glass card with action type icon, action text, "Mark Complete" button, and feature link
- [ ] Feature link navigates to the correct Worship Room feature for the action type
- [ ] Sections separated by subtle dividers (`border-white/10`)
- [ ] Invalid challenge ID shows "Challenge not found" with link back to `/challenges`
- [ ] Future challenge shows start date countdown and "Remind me" — no day content
- [ ] Past challenge shows all content readable, no "Mark Complete" buttons

### Day Navigation

- [ ] "Previous Day" and "Next Day" buttons at the bottom of day content
- [ ] "Previous Day" is disabled on Day 1
- [ ] "Next Day" navigates to next day or is disabled on last day
- [ ] Day selector dropdown shows all days with day titles
- [ ] Completed days show checkmark icon in dropdown
- [ ] Locked days show Lock icon and grayed text in dropdown
- [ ] Current day is highlighted in the dropdown
- [ ] Clicking a locked day shows "Complete today's challenge to unlock the next day" message
- [ ] Clicking a completed day navigates to that day's content

### Day Sequencing & Completion

- [ ] Days are sequential from the user's join date, not the calendar date
- [ ] User's current day calculated as `daysSinceJoined + 1` (capped at `durationDays`)
- [ ] "Mark Complete" button only appears for the user's current uncompleted day
- [ ] Clicking "Mark Complete" advances `currentDay` and adds to `completedDays`
- [ ] Re-reading completed days does not show "Mark Complete" or trigger additional tracking
- [ ] Challenge completion triggers when all days are completed
- [ ] Completion celebration message appears on the final day

### Progress Tracking

- [ ] `wr_challenge_progress` localStorage key stores progress keyed by challengeId
- [ ] Each challenge progress has: `joinedAt`, `currentDay`, `completedDays`, `completedAt`
- [ ] Joining a challenge creates an entry with `currentDay: 1`, `completedDays: []`, `completedAt: null`
- [ ] Completing a challenge sets `completedAt` to current timestamp
- [ ] Multiple challenges can be tracked simultaneously
- [ ] Progress persists across page reloads

### Participant Count

- [ ] Mock participant count uses deterministic formula: `500 + (calendarDay * 23) + (challengeId.length * 47)`, capped at 2,000
- [ ] Count increases as more calendar days pass within the challenge window
- [ ] All users see the same count on the same calendar day
- [ ] Community goal progress derived from participant count

### Auth Gating

- [ ] Browsing `/challenges` works without login
- [ ] Viewing challenge detail hero works without login
- [ ] Day 1 content is fully readable without login (preview mode, no "Mark Complete")
- [ ] Attempting to access Day 2+ without joining shows auth modal: "Sign in to join this challenge"
- [ ] Clicking "Join Challenge" without login shows auth modal: "Sign in to join this challenge"
- [ ] Clicking "Remind me" without login shows auth modal: "Sign in to set a reminder"
- [ ] "Mark Complete" button does not appear for logged-out users
- [ ] No localStorage writes occur for logged-out users
- [ ] Feature links ("Go to Prayer >") work without login (feature handles its own auth gating)

### Navbar Integration

- [ ] "Challenges" link appears in the desktop navbar after "Reading Plans" with a `Flame` icon
- [ ] "Challenges" appears in the mobile drawer menu in the same position
- [ ] Active state (underline) shows when on `/challenges` or `/challenges/:challengeId`
- [ ] During an active challenge season, a small pulsing dot indicator appears on the nav link
- [ ] The pulsing dot uses the active challenge's theme color
- [ ] The pulsing dot is CSS-only (no JavaScript timers)
- [ ] When no challenge is active, the dot is hidden

### Responsive Layout

- [ ] Mobile (< 640px): Single-column card layout, full-width cards, stacked day navigation buttons, 44px touch targets
- [ ] Tablet (640-1024px): 2-column grid for upcoming/past cards, horizontal day navigation, inline day selector
- [ ] Desktop (> 1024px): Full-width active card, 2-column upcoming grid with `max-w-4xl`, `max-w-2xl` content column on detail page

### Accessibility

- [ ] All text meets WCAG AA color contrast against backgrounds (both light browser page and dark detail page)
- [ ] "Join Challenge" and "Mark Complete" buttons are keyboard-accessible with visible focus indicators
- [ ] Day navigation buttons have descriptive `aria-label` (e.g., "Previous day", "Next day")
- [ ] Day selector dropdown is keyboard-navigable (arrow keys, Enter to select, Escape to close)
- [ ] Locked days in dropdown have `aria-disabled="true"` and descriptive label
- [ ] Progress bar has `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`
- [ ] Participant count is in a semantic element (not just visual styling)
- [ ] All interactive elements meet 44px minimum touch target on mobile
- [ ] `prefers-reduced-motion`: nav pulsing dot animation is disabled (static dot instead)
- [ ] Page has logical heading hierarchy
- [ ] "Remind me" toggle communicates its state to screen readers (`aria-pressed`)

### Visual Verification

- [ ] Browser page hero gradient matches existing inner page heroes (Prayer Wall, Reading Plans)
- [ ] Active challenge card stands out visually from upcoming/past cards
- [ ] Theme colors are applied correctly to each challenge's card, button, and accent elements
- [ ] Detail page dark background is consistent throughout (no light sections)
- [ ] Scripture, reflection, and action callout sections visually match Daily Devotional and Reading Plans pages
- [ ] Progress bar is visually clean and uses the challenge's theme color for the filled portion
- [ ] Day navigation matches Reading Plans day navigation style
- [ ] Nav pulsing dot is subtle and doesn't distract from the main navigation

### No Regressions

- [ ] Existing navbar links and behavior are unchanged (only insertion of new link)
- [ ] Reading Plans pages and functionality are unaffected
- [ ] Daily Devotional page is unaffected
- [ ] Daily Hub (`/daily`) is unaffected
- [ ] Liturgical calendar constants and functions are unchanged (only consumed, not modified)
- [ ] No existing routes are modified
- [ ] No existing localStorage keys are modified

---

## Out of Scope

- **Backend API**: Entirely frontend. No API endpoints. No database storage. Backend persistence is Phase 3+.
- **Real participant counts**: Mock data only. Real-time participation tracking is Phase 3+.
- **Push notifications / email reminders**: The "Remind me" button stores state but does not trigger any notification. Actual delivery is Phase 3+.
- **Faith points / activity checklist integration**: Auto-detecting challenge action completion and awarding faith points is Spec 2.
- **Challenge completion celebrations with confetti**: Rich celebration animations are Spec 2.
- **Social sharing of challenge progress**: Sharing streaks, inviting friends to challenges — Spec 2.
- **Team challenges**: Organized group challenges — Spec 3.
- **Challenge leaderboards**: Rankings within a challenge — Spec 3.
- **Dashboard widget for active challenge**: Challenge progress card on the dashboard — Spec 3.
- **AI-generated challenge content**: All content is hardcoded. AI personalization is future.
- **User-created challenges**: Not in scope. Pre-authored content only.
- **More than 5 challenges**: The initial pool is 5 seasonal challenges. Expansion is a future content effort.
- **Challenge ratings or reviews**: No community feedback on challenges.
- **Streak repair integration**: Missing a challenge day does not affect the main faith streak system.
- **Audio narration of challenge content**: No TTS Read Aloud button in this spec (may be added in Spec 2).
- **Landing page teaser for challenges**: No challenges section on the landing page in this spec.
