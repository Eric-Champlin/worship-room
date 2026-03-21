# Feature: Reading Plans Data Model & Browser Page

**Spec sequence:** This is Spec 1 of a 3-spec reading plans sequence. Spec 2 will add social sharing, bookmarking, and reading reminders. Spec 3 will add AI-powered plan recommendations and personalized plan generation.

---

## Overview

Structured multi-day reading plans are the single most requested feature across competitive Christian wellness apps. YouVersion has thousands of plans, Glorify offers 5-10 day audio courses, and Abide provides thematic journeys. Worship Room currently has zero guided multi-day content — this is the biggest content gap in the platform.

This feature introduces a `/reading-plans` browser page and `/reading-plans/:planId` detail/reading views that guide users through a topic, book of the Bible, or spiritual discipline over 7, 14, or 21 days. The experience provides structure and accountability for spiritual growth, giving users a reason to return daily with a clear next step.

Ten hardcoded reading plans cover themes central to emotional healing: anxiety, grief, gratitude, identity, forgiveness, trust, hope, healing, purpose, and relationships. Each day includes a Bible passage (WEB translation), a devotional reflection, a closing prayer, and a concrete action step — the same contemplative format proven by the Daily Devotional page, extended across a multi-day journey.

---

## User Stories

- As a **logged-out visitor**, I want to browse available reading plans so that I can discover guided spiritual content before committing to an account.
- As a **logged-out visitor**, I want to preview the first day of a plan so that I can experience the content quality before signing in.
- As a **logged-in user**, I want to start a reading plan so that I have a structured daily spiritual practice guiding me through a specific topic.
- As a **logged-in user**, I want to track my progress through a plan so that I feel a sense of accomplishment and momentum.
- As a **logged-in user**, I want to browse back through completed days so that I can revisit passages and reflections that spoke to me.
- As a **logged-in user**, I want to pause and resume plans so that life interruptions don't erase my progress.

---

## Requirements

### Reading Plan Data Model

1. **10 hardcoded reading plans** stored in a dedicated constants/data file. Each plan has:
   - `id` — slug string (e.g., `"finding-peace-in-anxiety"`)
   - `title` — human-readable title (e.g., "Finding Peace in Anxiety")
   - `description` — 2-3 sentences describing the journey
   - `theme` — one of 10 themes: `anxiety`, `grief`, `gratitude`, `identity`, `forgiveness`, `trust`, `hope`, `healing`, `purpose`, `relationships`
   - `durationDays` — 7, 14, or 21
   - `difficulty` — `"beginner"` or `"intermediate"`
   - `coverEmoji` — single emoji representing the theme (used as visual identity)
   - `days` — array of `DayContent` objects

2. **Each DayContent has:**
   - `dayNumber` — integer (1-based)
   - `title` — e.g., "Day 1: When Worry Takes Over"
   - `passage` — object with `reference` (e.g., "Philippians 4:6-7") and `verses` (array of `{ number: number, text: string }`, WEB translation)
   - `reflection` — array of 2-3 paragraph strings, warm second-person voice connecting the passage to the theme
   - `prayer` — single paragraph closing prayer
   - `actionStep` — single concrete action for the day (e.g., "Write down three things you're anxious about and pray over each one")

3. **The 10 plans:**
   1. "Finding Peace in Anxiety" — 7 days, beginner
   2. "Walking Through Grief" — 14 days, intermediate
   3. "The Gratitude Reset" — 7 days, beginner
   4. "Knowing Who You Are in Christ" — 21 days, intermediate
   5. "The Path to Forgiveness" — 14 days, intermediate
   6. "Learning to Trust God" — 7 days, beginner
   7. "Hope When It's Hard" — 7 days, beginner
   8. "Healing from the Inside Out" — 21 days, intermediate
   9. "Discovering Your Purpose" — 14 days, intermediate
   10. "Building Stronger Relationships" — 7 days, beginner

4. **Bible passages must use the WEB translation** (World English Bible, public domain). Each passage includes 2-6 verses with verse numbers.

5. **Reflection paragraphs** should be warm, encouraging, practical, and non-denominational. Written in second-person ("you") voice — never preachy, never judgmental, always hopeful. They connect the passage to the plan's theme and the specific day's sub-topic.

6. **Prayers** should be personal and conversational — addressing God directly, relating to the day's topic.

7. **Action steps** should be specific and doable within a single day — not vague aspirations.

### Browser Page (`/reading-plans`)

8. **Dark background** matching the inner page style (same hero gradient pattern as Daily Hub, Prayer Wall, fading from dark purple to neutral background).

9. **PageHero component** with:
   - Title: "Reading Plans"
   - Subtitle: "Guided journeys through Scripture"

10. **Filter system** below the hero with two rows of filter pills:
    - **Row 1 — Duration**: "All" (default), "7 days", "14 days", "21 days"
    - **Row 2 — Difficulty**: "All" (default), "Beginner", "Intermediate"
    - Both rows work together with AND logic. "All" in either row means no filter on that dimension.
    - Active filter pill is visually distinct (filled/highlighted). Inactive pills use the existing chip/tag pattern.

11. **Plan grid** below the filters:
    - Desktop: 2-column grid
    - Mobile: single-column stack
    - Each card shows:
      - Cover emoji large (approximately `text-4xl`)
      - Title in bold
      - Description truncated to 2 lines (line clamping)
      - Three metadata pills in a row: duration ("7 days"), difficulty ("Beginner"), theme ("Anxiety") — all in `bg-white/10 rounded-full` style
      - Primary action button: "Start Plan" (primary CTA style) for unstarted plans, "Continue" (primary CTA style) for in-progress plans, or "Completed" badge (muted, non-interactive) for finished plans
      - If in progress: a small progress indicator (e.g., "Day 3 of 7") below the button

12. **Empty state**: If filters produce no results, display a friendly message: "No plans match your filters. Try adjusting your selection." with a "Clear filters" button.

### Plan Detail Page (`/reading-plans/:planId`)

13. **Hero section** with:
    - Plan title (large heading)
    - Plan description
    - Duration and difficulty pills
    - Cover emoji
    - Progress bar (if started): visual bar showing `completedDays.length / durationDays` with percentage label

14. **Day content area** below the hero: single centered column (`max-w-2xl`), matching the Daily Devotional page layout. Content flows vertically:
    - **Day title**: Large heading (e.g., "Day 3: Letting Go of Control")
    - **Passage section**: Reference label above, verse text in Lora italic with inline verse numbers in `text-white/30`, same styling as the Daily Devotional passage section
    - **Reflection section**: Inter body text, 2-3 paragraphs, comfortable line height (`leading-relaxed`), same styling as Daily Devotional reflection
    - **Prayer section**: "Closing Prayer" label, Lora italic text, same styling as Daily Devotional prayer
    - **Action step section**: Displayed in a frosted glass callout card (`bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6`). Label: "Today's Action Step" in muted text, action text in full white. Same styling as the Daily Devotional reflection question card.
    - Sections separated by subtle dividers (`border-white/10`)

15. **Day navigation** at the bottom of the content:
    - "Previous Day" / "Next Day" buttons (outline style on dark background)
    - Day selector dropdown showing all days with:
      - Checkmarks on completed days
      - Lock icon on days beyond current progress (locked days)
      - Current day highlighted
    - Keyboard-accessible day selector

16. **Day locking**: Days beyond the current progress are locked. A locked day shows as grayed out with a Lock icon in the day selector. Clicking a locked day shows a brief message: "Complete the current day to unlock this one." The user must complete days in order.

17. **Day completion**: A day is marked complete when the user scrolls to the bottom of the day content (Intersection Observer on the action step section — the last content section). Same pattern as the Daily Devotional reading completion. Completion only fires for the user's current day (the next uncompleted day in sequence), not for re-reading already-completed days.

18. **Plan completion**: When all days are completed, show a brief celebration message on the last day's content (e.g., "You've completed [Plan Title]! What a journey.") and update the plan's status to completed. The plan card on the browser page shows a "Completed" badge.

### Progress Tracking

19. **localStorage key**: `wr_reading_plan_progress` — an object keyed by `planId`, with each value containing:
    - `startedAt` — ISO timestamp
    - `currentDay` — number (1-based, the next day the user should read)
    - `completedDays` — array of day numbers that have been completed
    - `completedAt` — ISO timestamp or `null` if in progress

20. **Single active plan rule**: A user can only have one active (in-progress) plan at a time. Starting a new plan while one is in progress shows a confirmation dialog:
    - "You're currently on Day X of [Plan Title]. Starting a new plan will pause your current progress. You can resume it later."
    - Two buttons: "Pause & Start New" (confirms) and "Keep Current" (cancels)
    - Paused plans retain their full progress. The user can resume any paused plan from the browser page (the card shows "Resume" instead of "Continue").

21. **Active vs. paused distinction**: The most recently started plan is "active." All other in-progress plans are "paused." The browser page sorts active plan first, then paused plans, then unstarted plans, then completed plans — within each filter/sort group.

### Navbar Integration

22. **Add "Reading Plans" to the navbar** as a new top-level link. Position: between "Daily Devotional" and "Prayer Wall" (or between "Daily Hub" and "Prayer Wall" if the navbar ordering needs adjustment for space — use judgment during planning).

23. **Desktop navbar**: "Reading Plans" appears as a text link, same styling as other nav links.

24. **Mobile drawer**: "Reading Plans" appears in the drawer menu in the same relative position.

25. **Active state**: The link shows the active underline/highlight when on `/reading-plans` or `/reading-plans/:planId`.

---

## Auth & Persistence

### Auth Gating Per Interactive Element

| Element | Logged-out behavior | Logged-in behavior |
|---------|--------------------|--------------------|
| Browse `/reading-plans` | Visible, no restrictions. Can browse all plans, use filters, read descriptions. | Same |
| View plan detail hero | Visible, no restrictions | Same |
| Read day content (Day 1 only) | Visible as preview — full Day 1 content readable without login | Same |
| Read day content (Day 2+) | Auth modal: "Sign in to start this reading plan" | Visible if day is unlocked |
| "Start Plan" button | Auth modal: "Sign in to start this reading plan" | Starts plan, navigates to Day 1 |
| "Continue" / "Resume" button | Auth modal: "Sign in to continue this reading plan" | Navigates to current day |
| Day selector dropdown | Auth modal: "Sign in to start this reading plan" (if plan not started) | Navigates to selected day (if unlocked) |
| Previous/Next Day buttons | Auth modal on Day 2+ if plan not started | Navigates if day is unlocked |
| Day completion tracking | Not tracked, no localStorage writes | Intersection Observer fires, day marked complete |
| Plan completion celebration | Not shown | Shown when all days completed |
| Navbar "Reading Plans" link | Visible, links to `/reading-plans` | Same |
| Confirmation dialog (pause plan) | Not applicable (can't start plans) | Shown when starting a new plan while one is active |

### Persistence

- **Logged-out**: Zero persistence. No localStorage writes, no cookies. Day 1 content is viewable as a preview but nothing is tracked.
- **Logged-in**: One new localStorage key: `wr_reading_plan_progress` (object keyed by planId). Written when a plan is started and when days are completed.
- **Route type**: Public (`/reading-plans`, `/reading-plans/:planId`). No auth required to browse. Auth required to start/track progress.

---

## AI Safety Considerations

- **Crisis detection needed?**: No. This feature displays curated, hardcoded content — no user text input, no AI-generated content.
- **User input involved?**: No. All content is pre-written and hardcoded.
- **AI-generated content?**: No. All plan content (passages, reflections, prayers, action steps) is pre-authored and curated.
- **Theological boundaries**: Reflections and prayers must follow the existing theological boundary rules: never claim divine authority, avoid denominational bias, use encouraging language ("Scripture encourages us..." not "God is telling you..."). See `01-ai-safety.md`.

---

## UX & Design Notes

### Emotional Tone

The reading plans experience should feel like embarking on a meaningful journey — structured but not rigid, guided but not prescriptive. The browser page should feel like a curated bookshelf of spiritual journeys. The reading view should feel identical to the Daily Devotional — contemplative, unhurried, warm. Progress tracking should feel encouraging ("Day 3 of 7 — you're almost halfway!"), never guilt-inducing if the user misses a day.

### Visual Design — Browser Page

- **Background**: Inner page hero gradient fading from dark purple to neutral `#F5F5F5` (same as Prayer Wall, Local Support pages)
- **Filter pills**: Use the existing chip/tag pattern from the design system recon (`bg-white border border-gray-200 rounded-full py-2 px-4 text-sm`). Active pill: `bg-primary text-white rounded-full` to match active tab styling.
- **Plan cards**: White card pattern from design system recon (`bg-white rounded-xl border border-gray-200 shadow-sm p-6`). Hover: `shadow-md` transition.
- **Cover emoji**: Displayed at approximately `text-4xl` (36-40px) as the visual anchor of each card
- **Metadata pills**: `bg-gray-100 text-text-dark text-xs rounded-full px-3 py-1` — subtle, informational
- **"Start Plan" button**: Primary CTA style (`bg-primary text-white font-semibold py-3 px-8 rounded-lg`)
- **"Continue" button**: Same as "Start Plan" but with different label
- **"Completed" badge**: `bg-success/10 text-success text-sm font-medium rounded-full px-4 py-2` — non-interactive
- **Progress indicator**: Small text below button: "Day 3 of 7" in `text-text-light text-sm`

### Visual Design — Plan Detail Page

- **Background**: All-dark contemplative style matching the Daily Devotional page (`bg-hero-dark` throughout), not fading to light
- **Hero**: Plan title in large heading, description below, emoji + duration/difficulty pills, progress bar if started
- **Progress bar**: Thin horizontal bar (`h-2 rounded-full bg-white/10`), filled portion in `bg-primary`, percentage label in `text-white/50 text-sm`
- **Content column**: `max-w-2xl mx-auto px-4 sm:px-6` — identical to Daily Devotional
- **Section styling**: Identical to Daily Devotional — passage in Lora italic with verse numbers, reflection in Inter body, prayer in Lora italic, action step in frosted glass callout
- **Section dividers**: `border-t border-white/10` between sections, `py-8 sm:py-10` spacing
- **Day navigation buttons**: Outline style on dark background (`bg-white/10 text-white border border-white/20 rounded-lg px-4 py-3 hover:bg-white/15`), matching Daily Devotional action buttons
- **Day selector dropdown**: Dark dropdown (`bg-hero-mid border border-white/15 rounded-xl shadow-lg`), matching navbar dropdown style. Each day item shows day title, checkmark/lock icon, current day highlighted with `bg-white/10`
- **Locked day styling**: `text-white/30` with Lock icon. Not clickable.

### Visual Design — Confirmation Dialog

- **Overlay**: Semi-transparent dark backdrop (`bg-black/50`)
- **Dialog**: Frosted glass card (`bg-hero-mid border border-white/15 rounded-2xl p-6 max-w-sm mx-auto`)
- **Title**: "Switch Reading Plan?" in Inter bold white
- **Body**: Description text in `text-white/70`
- **Buttons**: "Pause & Start New" in primary CTA style, "Keep Current" in outline style

### Design System Recon References

- **Inner page hero gradient**: Design system recon "Inner Page Hero" pattern (for browser page)
- **All-dark page**: Same as Daily Devotional and Dashboard (for detail page)
- **Card pattern**: Meditation card pattern (`bg-white rounded-xl border border-gray-200 shadow-sm`)
- **Chip/tag pattern**: Pray tab chip pattern (`bg-white border border-gray-200 rounded-full`)
- **Primary CTA button**: `bg-primary text-white font-semibold py-3 px-8 rounded-lg`
- **Hero Outline CTA**: `bg-white/10 text-white font-medium py-3 px-8 rounded-lg border border-white/30`
- **Frosted glass callout**: Dashboard card pattern (`bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`)
- **Dropdown panel**: Navbar dropdown style (`bg-hero-mid border-white/15`)

### New Visual Patterns

1. **Progress bar in hero**: A thin horizontal progress bar in the plan detail hero showing reading plan completion. Similar concept to the activity checklist progress ring but rendered as a linear bar. New linear progress pattern for Worship Room.
2. **Day selector dropdown**: A custom dropdown for navigating between days with completion state indicators (checkmarks, locks). Similar to the navbar dropdowns but with list-item state icons.
3. **Plan card with emoji identity**: Cards using a large emoji as visual identity instead of an image. New card variant.

---

## Responsive Behavior

### Mobile (< 640px)

- **Browser page**: Single-column plan card grid. Filter pills wrap to multiple lines if needed (flex-wrap). Full-width cards with `px-4` side padding.
- **Plan cards**: Emoji, title, description, pills, and button stack vertically within the card.
- **Detail page hero**: Title, description, and progress bar stack vertically. Reduced padding.
- **Content column**: Full-width with `px-4` side padding.
- **Day navigation buttons**: Stacked vertically, full-width.
- **Day selector dropdown**: Full-width below the navigation buttons (not inline).
- **Passage, reflection, prayer, action step**: Same responsive treatment as Daily Devotional mobile (text sizes scale, comfortable reading).
- **Touch targets**: All interactive elements meet 44px minimum touch target.

### Tablet (640px - 1024px)

- **Browser page**: 2-column plan card grid. Filter pills in a single row.
- **Detail page**: Same as desktop but with slightly reduced padding.
- **Day navigation buttons**: Horizontal row, centered.
- **Day selector dropdown**: Inline with navigation buttons.

### Desktop (> 1024px)

- **Browser page**: 2-column plan card grid. `max-w-4xl mx-auto` for the grid area. Filter pills in a single row with comfortable spacing.
- **Detail page**: `max-w-2xl mx-auto` content column. Generous hero padding.
- **Day navigation buttons**: Horizontal row, centered, comfortable spacing.
- **Day selector dropdown**: Inline with navigation buttons.

---

## Edge Cases

- **Invalid plan ID**: `/reading-plans/nonexistent` shows a "Plan not found" message with a link back to `/reading-plans`.
- **Resuming a paused plan**: Card shows "Resume" button. Clicking navigates to the user's `currentDay` within that plan.
- **All days completed mid-session**: When the last day's content is scrolled to the bottom, the completion celebration appears immediately. No need to navigate away and back.
- **Re-reading completed days**: Users can freely navigate back to any completed day. Scrolling to the bottom of an already-completed day does NOT trigger any additional tracking.
- **Multiple completed plans**: A user can complete multiple plans. All completed plans show the "Completed" badge on the browser page.
- **Day 1 preview for logged-out users**: The full Day 1 content is readable. Attempting to navigate to Day 2 (via Next Day button or day selector) shows the auth modal.
- **Starting a plan from Day 1 preview**: If a logged-out user is previewing Day 1 and clicks "Start Plan" or attempts to advance, the auth modal appears. After login, the plan starts and Day 1 is accessible (not auto-completed — the user needs to scroll to the bottom to mark it complete).
- **Clearing localStorage**: If `wr_reading_plan_progress` is cleared, all progress is lost. Plans appear as unstarted on the browser page.
- **Long plan titles**: Titles may wrap on mobile. Use standard text wrapping — no truncation on titles (only descriptions are truncated).

---

## Out of Scope

- **Backend API**: Entirely frontend. No API endpoints. No database storage. Backend persistence is Phase 3+.
- **AI-generated plan content**: All content is hardcoded. AI personalization and plan generation is Spec 3.
- **Social sharing of plans**: Sharing progress, recommending plans to friends — Spec 2.
- **Reading reminders/notifications**: No push notifications or daily reminders for plan progress — Spec 2.
- **Bookmarking/favoriting plans**: Not in this spec. May integrate with existing favorites system.
- **Audio narration**: No pre-recorded audio. No TTS Read Aloud button (may be added in a follow-up spec — not part of the initial reading plans experience).
- **More than 10 plans**: The initial pool is 10. Expansion is a future content effort.
- **Plan search**: No text search across plans. Filters are sufficient for 10 plans.
- **Plan ratings or reviews**: No community feedback on plans.
- **Custom/user-created plans**: Not in scope. Pre-authored content only.
- **Streak/faith points integration**: Recording reading plan completion as a tracked activity is a separate integration concern (similar to how Spec 17 added devotional to dashboard).
- **Landing page teaser**: No reading plans teaser on the landing page in this spec. May be added in Spec 2 or 3.
- **Plan categories/collections**: No grouping of plans beyond the existing theme/duration/difficulty filters.

---

## Acceptance Criteria

### Data Model

- [ ] 10 reading plan entries exist in a dedicated data/constants file
- [ ] Each plan has all required fields: `id`, `title`, `description`, `theme`, `durationDays`, `difficulty`, `coverEmoji`, `days` array
- [ ] Each day has all required fields: `dayNumber`, `title`, `passage` (reference + verses array), `reflection` (2-3 paragraphs), `prayer`, `actionStep`
- [ ] All Bible passages use WEB translation with 2-6 verses each
- [ ] Verse numbers are included in the verses array
- [ ] Reflection paragraphs are written in warm second-person ("you") voice
- [ ] Prayers are personal and conversational
- [ ] Action steps are specific and completable within a single day
- [ ] Plans have correct durations: four 7-day, three 14-day, two 21-day, one additional 7-day (total: five 7-day, three 14-day, two 21-day)
- [ ] Plans have correct difficulties: five beginner, five intermediate
- [ ] Each plan has a distinct `coverEmoji` that relates to its theme

### Browser Page (`/reading-plans`)

- [ ] Route `/reading-plans` exists and renders the browser page
- [ ] PageHero displays "Reading Plans" title and "Guided journeys through Scripture" subtitle
- [ ] Duration filter pills: "All", "7 days", "14 days", "21 days" — default "All"
- [ ] Difficulty filter pills: "All", "Beginner", "Intermediate" — default "All"
- [ ] Both filter rows work together with AND logic
- [ ] Active filter pill is visually distinct from inactive pills
- [ ] Plan cards display in a 2-column grid on desktop, single column on mobile
- [ ] Each card shows: cover emoji, title, description (2-line truncation), duration pill, difficulty pill, theme pill
- [ ] Unstarted plans show "Start Plan" button
- [ ] In-progress plans show "Continue" button with "Day X of Y" progress text
- [ ] Paused plans show "Resume" button
- [ ] Completed plans show "Completed" badge (non-interactive)
- [ ] Empty filter state shows "No plans match your filters" with "Clear filters" button
- [ ] Cards link to `/reading-plans/:planId`

### Plan Detail Page (`/reading-plans/:planId`)

- [ ] Route `/reading-plans/:planId` exists and renders the plan detail page
- [ ] Hero displays plan title, description, duration/difficulty pills, and cover emoji
- [ ] Progress bar shows in hero for started plans (filled portion proportional to completed days)
- [ ] All-dark background throughout the page (not fading to light)
- [ ] Day content renders in centered `max-w-2xl` column
- [ ] Day title is displayed prominently
- [ ] Passage section: reference label, Lora italic verse text, inline verse numbers in `text-white/30`
- [ ] Reflection section: Inter body text, 2-3 paragraphs, comfortable line height
- [ ] Prayer section: "Closing Prayer" label, Lora italic text
- [ ] Action step section: frosted glass callout card with "Today's Action Step" label
- [ ] Sections separated by subtle dividers (`border-white/10`)
- [ ] Invalid plan ID shows "Plan not found" with link back to `/reading-plans`

### Day Navigation

- [ ] "Previous Day" and "Next Day" buttons at the bottom of day content
- [ ] "Previous Day" is disabled on Day 1
- [ ] "Next Day" is disabled on the last day of the plan (or navigates to completion state)
- [ ] Day selector dropdown shows all days with day titles
- [ ] Completed days show checkmark icon in dropdown
- [ ] Locked days show Lock icon and grayed text in dropdown
- [ ] Current day is highlighted in the dropdown
- [ ] Clicking a locked day shows "Complete the current day to unlock this one" message
- [ ] Clicking a completed day navigates to that day's content

### Day Locking & Completion

- [ ] Days beyond `currentDay` are locked and not accessible
- [ ] Day completion fires via Intersection Observer when action step section scrolls into view
- [ ] Completion only fires for the user's current uncompleted day
- [ ] Re-reading completed days does not trigger additional tracking
- [ ] `completedDays` array updates and `currentDay` advances on completion
- [ ] Plan completion triggers when all days are completed
- [ ] Completion celebration message appears on the final day

### Progress Tracking

- [ ] `wr_reading_plan_progress` localStorage key stores progress keyed by planId
- [ ] Each plan progress has: `startedAt`, `currentDay`, `completedDays`, `completedAt`
- [ ] Starting a plan creates an entry with `currentDay: 1`, `completedDays: []`, `completedAt: null`
- [ ] Completing a plan sets `completedAt` to current timestamp
- [ ] Progress persists across page reloads

### Single Active Plan

- [ ] Starting a new plan while one is in progress shows confirmation dialog
- [ ] Dialog shows current plan name and day progress
- [ ] "Pause & Start New" pauses current plan and starts the new one
- [ ] "Keep Current" dismisses dialog without changes
- [ ] Paused plans retain full progress
- [ ] Paused plans can be resumed from the browser page

### Auth Gating

- [ ] Browsing `/reading-plans` works without login
- [ ] Viewing plan detail hero works without login
- [ ] Day 1 content is fully readable without login (preview mode)
- [ ] Attempting to access Day 2+ without login shows auth modal: "Sign in to start this reading plan"
- [ ] Clicking "Start Plan" without login shows auth modal: "Sign in to start this reading plan"
- [ ] Day completion tracking does not fire for logged-out users
- [ ] No localStorage writes occur for logged-out users

### Navbar Integration

- [ ] "Reading Plans" link appears in the desktop navbar
- [ ] "Reading Plans" appears in the mobile drawer menu
- [ ] Active state shows when on `/reading-plans` or `/reading-plans/:planId`
- [ ] Navbar styling is consistent with existing nav links

### Responsive Layout

- [ ] Mobile (< 640px): Single-column plan card grid, full-width cards, stacked day navigation buttons, 44px touch targets
- [ ] Tablet (640-1024px): 2-column plan grid, horizontal day navigation, inline day selector
- [ ] Desktop (> 1024px): 2-column plan grid with `max-w-4xl`, `max-w-2xl` content column, generous hero padding

### Accessibility

- [ ] All text meets WCAG AA color contrast against backgrounds (both light browser page and dark detail page)
- [ ] Filter pills are keyboard-accessible with visible focus indicators
- [ ] Plan cards are keyboard-accessible (can be activated with Enter)
- [ ] Day navigation buttons are keyboard-accessible with descriptive `aria-label`
- [ ] Day selector dropdown is keyboard-navigable (arrow keys, Enter to select, Escape to close)
- [ ] Locked days in dropdown have `aria-disabled="true"` and descriptive label
- [ ] Progress bar has `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`
- [ ] Confirmation dialog traps focus and can be dismissed with Escape
- [ ] All interactive elements meet 44px minimum touch target on mobile
- [ ] `prefers-reduced-motion` respected for any animations
- [ ] Page has logical heading hierarchy

### Visual Verification

- [ ] Browser page hero gradient matches existing inner page heroes (Prayer Wall, Local Support)
- [ ] Plan cards match the existing white card pattern (rounded-xl, border-gray-200, shadow-sm)
- [ ] Filter pills match the existing chip/tag pattern
- [ ] Detail page dark background is consistent throughout (no light sections)
- [ ] Passage, reflection, prayer, and action step sections visually match the Daily Devotional page
- [ ] Action step callout card matches the Daily Devotional reflection question card
- [ ] Day navigation buttons match the Daily Devotional action button style
- [ ] Progress bar is visually clean and proportional
- [ ] Confirmation dialog is centered and visually consistent with existing modals

### No Regressions

- [ ] Existing navbar links and behavior are unchanged (only insertion of new link)
- [ ] Daily Devotional page is unaffected
- [ ] Daily Hub (`/daily`) is unaffected
- [ ] No existing routes are modified
- [ ] No existing localStorage keys are modified
