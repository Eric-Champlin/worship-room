# Feature: Community Challenges Progress Tracking & Dashboard Widget

**Spec sequence:** This is Spec 2 of a 3-spec community challenges sequence, building on Spec 1 (`community-challenges-data-page.md`) which delivers the `/challenges` browser page, `/challenges/:challengeId` detail page, challenge data model (5 seasonal challenges with daily content), day navigation, progress storage (`wr_challenge_progress`), and participant count mock. Spec 3 will add challenge leaderboards, team challenges, and social sharing of challenge progress.

**Master Plan Reference:** Consumes data models and integration points from the Dashboard & Growth specs (Phase 2.75):
- Shared data models: `wr_challenge_progress` (owned by Spec 1/community-challenges-data-page), `wr_daily_activities` and `wr_faith_points` and `wr_streak` (owned by Streak & Faith Points Engine spec), `wr_badges` (owned by Badge Definitions spec), `wr_settings` (owned by Settings & Privacy spec)
- Cross-spec dependencies: Spec 1 (Community Challenges Data & Page) provides the challenge data model, `wr_challenge_progress` localStorage key, "Mark Complete" button, challenge detail page, and browser page. Streak & Faith Points Engine spec provides `useFaithPoints()`, `recordActivity()`, `ACTIVITY_POINTS`. Badge Definitions spec provides badge definitions array, `checkForNewBadges()`, `wr_badges` activity counters. Dashboard Shell spec provides `DashboardCard`, dashboard grid layout, `AuthProvider`. Dashboard Widgets & Activity Integration spec provides the Activity Checklist widget (SVG progress ring pattern), `recordActivity()` wiring. Celebrations & Badge Collection UI spec provides `CelebrationOverlay` (full-screen celebration pattern), toast-confetti tier, `newlyEarned` queue. Settings & Privacy spec provides `wr_settings.notifications.nudges` toggle.
- Shared constants: `ACTIVITY_POINTS` from `constants/dashboard/activity-points.ts`, badge definitions from `constants/dashboard/badges.ts`, level thresholds from `constants/dashboard/levels.ts`

---

## Overview

The challenge browser and detail pages (Spec 1) let users discover and read through seasonal community challenges — but joining one currently has no teeth. "Mark Complete" records a day in localStorage and that's it. There's no connection to the faith points system, no credit toward the main streak, no badges, no celebration when you finish, and no visibility on the dashboard. This spec transforms challenges from a passive reading experience into a fully integrated part of Worship Room's gentle gamification ecosystem.

Three features work together. First, **enhanced progress tracking with gamification integration** turns each day's completion into a rewarding micro-moment: 20 faith points, streak credit via the daily activity that the challenge action maps to, and auto-detection that recognizes when you've already done the activity elsewhere in the app. Second, a **dashboard widget** keeps the user's active challenge front and center — showing progress, today's action, and a quick link to continue. Third, **challenge completion celebrations** deliver the emotional payoff when a user finishes all days: a full-screen overlay with confetti, the badge earned, and faith points awarded.

The philosophy matches the app's "gentle gamification" mandate: challenges are bonus engagement, not punishment. Missing a challenge day never breaks the main app streak. But completing one gives you credit, points, and recognition. Challenges become the connective tissue between the daily features — a structured reason to pray on Monday, journal on Tuesday, and meditate on Wednesday.

---

## User Stories

- As a **logged-in user** who just marked a challenge day complete, I want to earn faith points and see that activity count toward my daily checklist so that the challenge feels connected to my broader growth journey.
- As a **logged-in user** who already prayed today, I want my challenge day to auto-complete if today's challenge action is "pray" so that I don't have to do the same thing twice.
- As a **logged-in user** who just completed my final challenge day, I want a full-screen celebration with confetti and the badge I earned so that the moment feels like a real milestone.
- As a **logged-in user** with an active challenge, I want to see my progress on the dashboard so that I'm reminded to continue without navigating away from home.
- As a **logged-in user** without an active challenge during a challenge season, I want the dashboard to suggest joining so that I'm aware of the opportunity.
- As a **logged-in user** who hasn't completed today's challenge action by evening, I want a gentle nudge on the dashboard so that I'm reminded without being nagged.
- As a **logged-in user**, I want to earn a unique badge for each challenge I complete so that I have tangible proof of my commitment to each spiritual season.

---

## Requirements

### Feature 1: Enhanced Progress Tracking

#### Progress Data Model Extension

1. **Extend the `wr_challenge_progress` data model** (owned by Spec 1). Each challenge progress entry gains additional fields:
   - `streak` — number: consecutive challenge days completed without a gap (separate from the main app streak)
   - `missedDays` — array of day numbers the user skipped (a day is "missed" when the user's `currentDay` advances past a day they did not complete)
   - `status` — one of: `"active"`, `"completed"`, `"paused"`, `"abandoned"`:
     - `active` — user has joined and is progressing
     - `completed` — all days finished
     - `paused` — user joined a different challenge (see requirement 3)
     - `abandoned` — user explicitly abandoned via UI or the challenge calendar window ended while user was still active with less than half the days completed

2. **Spec 1's existing fields** (`joinedAt`, `currentDay`, `completedDays`, `completedAt`) remain unchanged. The new fields are additive.

#### Single Active Challenge Constraint

3. **A user can only have one active challenge at a time.** Clicking "Join Challenge" on a new challenge while another challenge has `status: "active"` shows a confirmation dialog:
   - Title: "Switch Challenges?"
   - Body: "You're on Day X of [Current Challenge Title]. Joining this challenge will pause your current one. You can resume it later."
   - Primary action: "Join [New Challenge Title]" — sets the current challenge's status to `"paused"` and creates a new progress entry for the new challenge
   - Secondary action: "Keep current challenge" — closes the dialog, no state change
   - The paused challenge retains all progress. The user can return to it and resume from where they left off. Resuming sets status back to `"active"` (and pauses whichever challenge was active, if any).

4. **On the challenge browser page**, paused challenges show a "Resume" button instead of "Join Challenge." The resume button sets status to `"active"` and navigates to the user's current day. If another challenge is active when resuming, the same switch dialog appears.

#### Day Completion with Gamification

5. **When a challenge day is marked complete** (via the "Mark Complete" button), the following happen in sequence:
   a. The day is added to `completedDays` in `wr_challenge_progress` (existing behavior from Spec 1)
   b. `currentDay` advances to the next day (existing behavior)
   c. The challenge streak is recalculated: if the previous day was also completed (or this is Day 1), streak increments; otherwise streak resets to 1
   d. **Faith points**: Call `recordActivity("challenge")` which awards 20 faith points. Add `"challenge"` as a new activity key in the `ACTIVITY_POINTS` constant with value 20.
   e. **Cross-activity credit**: Additionally call `recordActivity(actionType)` where `actionType` is the day's `dailyAction.actionType` (e.g., `"pray"`, `"journal"`). This marks that activity as completed on today's daily activity checklist. If the activity was already completed today, the duplicate call is a no-op (existing behavior of `recordActivity`).
   f. **Badge check**: The `recordActivity` calls trigger `checkForNewBadges()` per existing flow.

6. **"Challenge" as a new trackable activity**: Add `"challenge"` to the activity tracking system:
   - New entry in `ACTIVITY_POINTS`: `challenge: 20`
   - The challenge activity is NOT part of the daily 6-item activity checklist (the checklist remains mood, pray, listen, prayerWall, meditate, journal). Challenge completion feeds points but does not affect the checklist ring or Full Worship Day logic.
   - The challenge activity IS counted toward the daily multiplier calculation (it counts as an additional completed activity for the multiplier tier).

#### Auto-Detection of Completed Activities

7. **Auto-detect challenge day completion** when the user has already performed the day's action type elsewhere in the app. The auto-detection logic:
   - Reads today's `wr_daily_activities` entry
   - Checks if the activity matching the current challenge day's `actionType` is already marked `true`
   - If yes: auto-mark the challenge day as complete and show a toast: "Challenge Day X auto-completed! You already [action verb] today." (e.g., "...already prayed today", "...already journaled today", "...already meditated today")
   - Action type to verb mapping: `pray` → "prayed", `journal` → "journaled", `meditate` → "meditated", `music` → "listened to worship music", `gratitude` → "practiced gratitude", `prayerWall` → "prayed on the Prayer Wall"
   - Auto-completion triggers the same gamification flow as manual completion (requirement 5, steps a-f)
   - Auto-completion does NOT fire if the day has already been completed (prevents double-processing)

8. **Auto-detection trigger points**: The auto-check runs:
   - When the challenge detail page loads (for users with an active challenge viewing their current day)
   - When the dashboard renders (for the dashboard widget, see Feature 2)
   - After any `recordActivity()` call completes (so if the user prays on the Pray tab, then visits the dashboard, the challenge day is auto-completed immediately)

9. **Auto-detection scope**: Only runs for authenticated users with an active challenge (`status: "active"`). Only checks the current uncompleted day. Does not retroactively check past days.

#### Challenge Streak

10. **Challenge streak** tracks consecutive completed days within the challenge (separate from the main app streak):
    - Increments when consecutive days are completed without gaps
    - Resets to 1 when a day is missed and the next day is completed
    - Missing a challenge day does NOT break or affect the main app streak (challenges are bonus engagement)
    - Completing a challenge day DOES count toward the main app streak via the cross-activity credit (requirement 5e)

### Feature 2: Challenge Badges & Completion Celebration

#### New Badges

11. **Add 7 new badges to the badge system** (extending the badge definitions from the Badge Definitions spec):

    **Challenge-Specific Badges (5):**

    | ID | Name | Trigger | Celebration Tier |
    |----|------|---------|-----------------|
    | `challenge_lent` | Lenten Warrior | Complete the "Pray40: A Lenten Journey" challenge | full-screen |
    | `challenge_easter` | Easter Champion | Complete the "Easter Joy" challenge | full-screen |
    | `challenge_pentecost` | Spirit-Filled | Complete the "Fire of Pentecost" challenge | full-screen |
    | `challenge_advent` | Advent Faithful | Complete the "Advent Awaits" challenge | full-screen |
    | `challenge_newyear` | New Year Renewed | Complete the "New Year, New Heart" challenge | full-screen |

    **Meta Badges (2):**

    | ID | Name | Trigger | Celebration Tier |
    |----|------|---------|-----------------|
    | `challenge_first` | Challenge Accepted | Complete any 1 challenge | toast-confetti |
    | `challenge_master` | Challenge Master | Complete all 5 challenges | full-screen |

12. **Badge check integration**: After a challenge's final day is completed, the badge check logic evaluates:
    - The specific challenge badge (based on challenge ID → badge ID mapping)
    - The "Challenge Accepted" meta-badge (if this is the user's first completed challenge)
    - The "Challenge Master" meta-badge (if all 5 challenges now have `status: "completed"`)
    - Add `challengesCompleted` counter to `wr_badges.activityCounts` to track total challenge completions

#### Challenge Completion Celebration

13. **When all days of a challenge are completed**, trigger a full-screen celebration overlay:
    - Same overlay pattern as the level-up celebration from the Celebrations & Badge Collection UI spec
    - Content:
      - Challenge title in Caveat script font (`font-script text-4xl sm:text-5xl text-white`)
      - "Challenge Complete!" heading in Inter bold
      - Total days completed: "X days of faithful commitment"
      - Faith points earned: total accumulated from this challenge (daily 20 pts × days completed + 100 bonus) displayed as "+X faith points"
      - The badge earned: badge icon with name (the challenge-specific badge)
      - Confetti animation (same CSS confetti as existing celebration overlay)
      - "Share Your Achievement" button (outline style — functionality is a placeholder for Spec 3's social sharing)
      - "Browse more challenges" CTA (navigates to `/challenges`)
    - The 100 bonus faith points are awarded as a one-time grant when the challenge completes (separate from the daily 20-point awards)
    - Overlay auto-dismisses after 8 seconds or on user click/tap
    - Respects `prefers-reduced-motion`: static display without confetti or fade animations

14. **Celebration sequencing**: If the final challenge day completion also triggers other celebrations (e.g., a badge toast from "Challenge Accepted" or a level-up from accumulated points), the challenge completion overlay fires first. Other celebrations queue behind it per the existing celebration queue system.

### Feature 3: Dashboard Widget

#### Widget Placement

15. **Add a "Challenge" widget card to the dashboard grid.** Position: after the Activity Checklist card and before the Mood Insights card (or equivalent position — left column, below existing engagement widgets). Uses the standard `DashboardCard` component with collapse/expand behavior.

#### Active Challenge State

16. **When the user has an active challenge** (`status: "active"` in `wr_challenge_progress`), the widget displays:
    - **Header**: Challenge title with the challenge's theme color as an accent (e.g., theme color used for the title text or a small colored dot/bar)
    - **Progress ring**: "Day X of Y" with a circular progress ring using the same SVG ring pattern as the Activity Checklist card. Ring fill uses the challenge's theme color. Ring size approximately 48px diameter.
    - **Today's action**: The current day's daily action text, truncated to 1 line with ellipsis if needed
    - **Challenge streak**: "X day challenge streak" in small text. If streak > 3, add a small flame icon (Lucide `Flame`, 14px) next to the text in the challenge's theme color
    - **"Continue" link**: "Continue →" text link in the challenge's theme color, linking to `/challenges/:challengeId` (opening to the user's current day)
    - The widget updates in real-time when auto-detection completes a challenge day

#### No Active Challenge — Season Active State

17. **When the user has no active challenge but a challenge is currently running** (based on liturgical calendar date computation), the widget displays:
    - **Header**: "Community Challenge"
    - **Challenge promotion**: "Join [Challenge Title]" as the main heading
    - **Description**: Challenge description truncated to 2 lines with ellipsis
    - **Metadata**: Days remaining in the challenge's calendar window + mock participant count (using the deterministic formula from Spec 1)
    - **"Join now" link**: "Join now →" text link in the challenge's theme color, linking to `/challenges/:challengeId`

#### No Active Challenge — No Season Active State

18. **When no challenge is active or available**, the widget displays:
    - **Header**: "Community Challenge"
    - **Countdown**: "Next challenge starts in X days" with the upcoming challenge's title
    - **"Set reminder" button**: Small outline button that toggles the reminder in `wr_challenge_reminders` localStorage (same as the "Remind me" button on the browser page)
    - If no upcoming challenge can be computed (edge case): "New challenges are coming soon"

#### Widget Auto-Refresh

19. **The widget state refreshes** whenever:
    - The dashboard mounts (initial render)
    - Auto-detection fires and completes a challenge day
    - The user returns to the dashboard from the challenge detail page (via React state/context reactivity — not polling)

### Feature 4: Challenge Nudges

20. **Gentle nudge toast** when the user has an active challenge and hasn't completed today's action:
    - **Trigger condition**: Current time is after 6:00 PM local time AND today's challenge day is not yet complete AND the nudge hasn't been shown today
    - **Toast content**: "Don't forget your challenge! Day X: [action summary truncated to ~60 chars]"
    - **Toast action**: "Go" button that navigates to the challenge detail page at the user's current day
    - **Shown on**: Dashboard render (only — not on other pages)
    - **Once per day**: Track via `wr_challenge_nudge_shown` localStorage key storing today's date string (YYYY-MM-DD). If the stored date matches today, suppress the nudge.

21. **Nudge respects notification settings**: Check `wr_settings.notifications.nudges` before showing. If the user has disabled nudge notifications in `/settings`, suppress the challenge nudge entirely.

22. **Nudge is non-intrusive**: Uses the standard toast system (same position and behavior as other toasts). Duration: 6 seconds, auto-dismiss. The user can dismiss manually by clicking the X or swiping.

---

## Auth & Persistence

### Auth Gating Per Interactive Element

All features in this spec are logged-in only. Challenge participation, gamification, the dashboard widget, and nudges all require authentication.

| Element | Logged-out behavior | Logged-in behavior |
|---------|--------------------|--------------------|
| "Join Challenge" with active challenge (switch dialog) | Auth modal: "Sign in to join this challenge" (Spec 1 behavior) | Switch confirmation dialog appears |
| "Mark Complete" gamification integration | Not visible (Spec 1 behavior) | Awards faith points, cross-activity credit, badge checks |
| Auto-detection of completed activities | Does not run | Runs on detail page load, dashboard render, after `recordActivity()` |
| Challenge completion celebration | Not visible | Full-screen overlay triggers |
| Dashboard widget | Not visible (dashboard is auth-gated) | Renders with appropriate state |
| Challenge nudge toast | Not visible | Shows after 6 PM if conditions met |
| "Resume" on paused challenge | Auth modal | Resumes challenge |
| "Share Your Achievement" button | Not visible | Placeholder button (Spec 3) |
| "Set reminder" on dashboard widget | Auth modal (Spec 1 behavior) | Toggles reminder in localStorage |

### Persistence

- **Logged-out**: Zero persistence. No changes to Spec 1's logged-out behavior.
- **Logged-in**: Extends existing localStorage keys:
  - `wr_challenge_progress` — adds `streak`, `missedDays`, `status` fields to each challenge entry
  - `wr_daily_activities` — writes via `recordActivity()` when challenge days are completed
  - `wr_faith_points` — updated via `recordActivity()` and bonus points
  - `wr_badges` — new challenge badges earned, `challengesCompleted` counter
  - `wr_challenge_nudge_shown` — date string for nudge suppression
  - `wr_challenge_reminders` — (existing from Spec 1) used by dashboard widget "Set reminder"
- **New localStorage key**: `wr_challenge_nudge_shown` — string (YYYY-MM-DD)
- **Route type**: No new routes. All changes integrate into existing routes (`/challenges/:challengeId`, dashboard `/`).

---

## AI Safety Considerations

- **Crisis detection needed?**: No. This feature involves no user text input and no AI-generated content. All content is pre-authored (from Spec 1's challenge data model). The daily actions link to existing features which have their own crisis detection.
- **User input involved?**: No. All interactions are button clicks (Mark Complete, Join, Resume, Set Reminder). No text fields.
- **AI-generated content?**: No. All celebration text, toast messages, and widget content are hardcoded templates with dynamic values inserted (challenge title, day number, points earned).
- **Gentle gamification compliance**: Missing a challenge day must never trigger guilt-inducing messaging. No "You missed Day X!" messages. The nudge toast is encouraging ("Don't forget your challenge!"), not accusatory. Challenge streak reset has no special messaging — the streak number simply reflects reality.

---

## UX & Design Notes

### Emotional Tone

Challenge completion should feel like a genuine spiritual milestone — not a game achievement. The celebration overlay should evoke the feeling of finishing a retreat or completing a meaningful devotional journey. The dashboard widget should feel like a gentle daily companion, not a taskmaster.

Auto-detection should feel like a delightful surprise: "The app noticed I already prayed today and gave me credit — that's thoughtful." The nudge should feel like a friend's gentle reminder, not a guilt trip.

### Visual Design — Dashboard Widget

- **Card style**: Standard frosted glass card (`bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 md:p-6`) matching all other dashboard cards
- **Progress ring**: Same SVG ring pattern as Activity Checklist card (~48px diameter). Unfilled stroke: `white/10`. Filled stroke: challenge's theme color. Center text: "Day X" with "of Y" below in smaller muted text
- **Challenge title**: `text-white font-semibold text-sm` with challenge theme color as an accent (e.g., small colored circle or left border accent)
- **Today's action**: `text-white/60 text-sm truncate` (single line with ellipsis)
- **Challenge streak**: `text-white/40 text-xs`. Flame icon in challenge theme color when streak > 3
- **"Continue →" link**: `text-sm font-medium` in challenge theme color with hover underline
- **Join promotion state**: Same card style. Challenge title as main heading in `text-white font-semibold`. Description in `text-white/60 text-sm line-clamp-2`. "Join now →" in challenge theme color.
- **Countdown state**: Muted presentation. "Next challenge starts in X days" in `text-white/60`. Upcoming challenge title in `text-white/80`. "Set reminder" as small outline button (`border border-white/20 text-white/60 text-xs rounded-lg px-3 py-1.5`)

### Visual Design — Completion Celebration

- **Overlay backdrop**: Semi-transparent dark (`bg-black/80 backdrop-blur-sm`) covering full viewport, same as existing level-up overlay
- **Content container**: Centered, `max-w-md`, `p-8`
- **Challenge title**: Caveat script font, challenge theme color, `text-4xl sm:text-5xl`
- **"Challenge Complete!"**: Inter bold, white, `text-2xl sm:text-3xl`
- **Stats**: Days completed and points earned in `text-white/70 text-lg`
- **Badge display**: Badge icon (placeholder — colored circle with badge initial, matching existing badge placeholder pattern) + badge name in `text-white font-medium`
- **Confetti**: Same CSS confetti particle system as existing celebration overlay — 20-30 particles in challenge theme color + gold + white, animating outward from center
- **"Share Your Achievement" button**: Outline style (`border border-white/30 text-white/80 py-3 px-6 rounded-lg`). Placeholder — logs to console in Spec 2, real sharing in Spec 3.
- **"Browse more challenges" CTA**: Text link below in `text-white/60 text-sm underline`, navigates to `/challenges`

### Visual Design — Switch Challenge Dialog

- **Dialog style**: Same as other app dialogs — centered modal with dark backdrop. Frosted glass card (`bg-hero-mid border border-white/15 rounded-2xl p-6`). Title in `text-white font-semibold text-lg`. Body in `text-white/70`. Two buttons: primary (theme color background), secondary (outline).

### Visual Design — Auto-Detection Toast

- **Style**: Standard success toast. Green checkmark icon. Message in white text. Same positioning and animation as other toasts.

### Visual Design — Nudge Toast

- **Style**: Standard informational toast (not success, not error — neutral/warm). Challenge theme color accent (small colored bar on the left edge of the toast card). "Go" button in challenge theme color. Same positioning and animation as other toasts.

### Design System Recon References

- **Dashboard frosted glass card**: Dashboard card pattern (`bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`)
- **SVG progress ring**: Activity Checklist card pattern from Dashboard Widgets spec
- **Full-screen celebration overlay**: Level-up overlay from Celebrations & Badge Collection UI spec
- **Confetti particles**: CSS confetti from Celebrations spec
- **Dialog/modal**: Same pattern as the challenge switch dialog and auth modal
- **Toast system**: Existing toast component with position/animation behavior

### New Visual Patterns

1. **Theme-colored progress ring on dashboard**: The Activity Checklist ring uses `primary` color; the challenge widget ring uses the challenge's dynamic theme color. New variant of an existing pattern.
2. **Auto-detection toast**: A toast triggered by background logic rather than direct user action. Functionally identical to existing toasts, but the trigger pattern is new.
3. **Challenge nudge toast with action button**: A toast with an embedded navigation button ("Go"). The existing toast system may need extension to support an action button callback.

---

## Responsive Behavior

### Mobile (< 640px)

- **Dashboard widget**: Full-width card, single column. Progress ring and challenge info stack vertically (ring on top, text below). "Continue →" link is full-width tappable area. 44px minimum touch targets on all interactive elements.
- **Completion overlay**: Full viewport. Content centered with `px-6` padding. Title and stats stack vertically. Buttons are full-width, stacked.
- **Switch dialog**: Full-width minus margins (`mx-4`). Buttons stack vertically, full-width. Primary button on top.
- **Toasts (auto-detection, nudge)**: Bottom-center, full-width minus margins. "Go" button right-aligned within the toast.

### Tablet (640px - 1024px)

- **Dashboard widget**: Within the dashboard grid flow. Same layout as desktop but may span full width depending on grid column.
- **Completion overlay**: Centered `max-w-md` with generous padding.
- **Switch dialog**: Centered `max-w-sm`.
- **Toasts**: Bottom-right, standard toast width.

### Desktop (> 1024px)

- **Dashboard widget**: Within the dashboard 2-column grid. Progress ring and text side by side (ring left, text right).
- **Completion overlay**: Centered `max-w-md`.
- **Switch dialog**: Centered `max-w-sm`.
- **Toasts**: Bottom-right, standard toast width.

---

## Edge Cases

- **Auto-detection race condition**: If the user marks a day complete via the button AND auto-detection fires simultaneously, the completion check must be idempotent — the day can only be completed once. Guard with a check: if day is already in `completedDays`, skip all gamification steps.
- **Multiple `recordActivity` calls**: A challenge day completion may trigger both `recordActivity("challenge")` and `recordActivity("pray")`. Both calls are independent and idempotent per the existing engine (same activity type on the same day is a no-op for duplicates).
- **Paused challenge resumes mid-progress**: When a user resumes a paused challenge, their `currentDay`, `completedDays`, and `streak` are intact. The challenge streak does NOT reset on pause/resume (the gap is not penalized since it was a deliberate pause, not a missed day).
- **Challenge completed while paused**: If a paused challenge was already completed (`completedAt` is set), resume is a no-op — the browser page shows "Completed" badge, not "Resume."
- **Bonus points on completion**: The 100 bonus faith points are a direct addition to `wr_faith_points.total`, not routed through `recordActivity`. They do not count toward the daily multiplier.
- **Badge already earned**: If a user somehow completes the same challenge twice (e.g., clears progress and replays), the challenge-specific badge is already in `earned` — the badge check skips it silently. The "Challenge Accepted" badge is also already earned. Only `challengesCompleted` counter increments.
- **All 5 challenges already completed when last one finishes**: The "Challenge Master" badge fires immediately alongside the challenge-specific badge. Both are queued in `newlyEarned`. The celebration overlay shows the challenge-specific badge; "Challenge Master" fires as a toast-confetti after the overlay dismisses.
- **Nudge timing**: The 6 PM check uses the browser's local time. If the user's system clock is wrong, the nudge may fire at the wrong time — acceptable for frontend-first implementation.
- **Nudge on dashboard re-render**: The once-per-day guard (`wr_challenge_nudge_shown`) prevents the nudge from firing on every dashboard re-render after 6 PM.
- **Settings not yet initialized**: If `wr_settings` doesn't exist in localStorage (user hasn't visited settings), treat nudge notifications as enabled (default ON per Settings spec).
- **Dashboard widget with no challenges data**: If `wr_challenge_progress` is empty and no challenge is currently active or upcoming, the widget shows "New challenges are coming soon" (same safety net as Spec 1's browser page empty state).
- **Auto-detection on dashboard with no active challenge**: Auto-detection is gated on `status: "active"` — if no challenge has this status, the check exits immediately with no side effects.
- **Clearing localStorage**: If `wr_challenge_progress` is cleared, all progress is lost. Dashboard widget falls through to the "no active challenge" state. Badges already earned remain in `wr_badges` (badges are never revoked).

---

## Acceptance Criteria

### Progress Tracking Extension

- [ ] `wr_challenge_progress` entries include `streak`, `missedDays`, and `status` fields alongside existing fields
- [ ] New challenge join creates entry with `status: "active"`, `streak: 0`, `missedDays: []`
- [ ] Completing a day increments `streak` if consecutive, resets to 1 if gap
- [ ] `status` transitions: `active` → `completed` when all days done, `active` → `paused` when joining another challenge

### Single Active Challenge

- [ ] Joining a new challenge while one is active shows switch confirmation dialog
- [ ] Dialog text includes current challenge name and current day number
- [ ] Confirming switch sets current challenge to `status: "paused"` and creates/activates new challenge
- [ ] Canceling dialog leaves state unchanged
- [ ] Paused challenges show "Resume" button on browser page instead of "Join Challenge"
- [ ] Resuming a paused challenge sets it to `active` (pausing the currently active one if applicable)
- [ ] Resuming navigates to the user's current day, preserving all prior progress

### Gamification Integration

- [ ] "Mark Complete" awards 20 faith points via `recordActivity("challenge")`
- [ ] `"challenge"` activity key exists in `ACTIVITY_POINTS` with value 20
- [ ] Completing a challenge day also calls `recordActivity(actionType)` for the day's action type
- [ ] Cross-activity credit marks the action type as complete on today's daily activity checklist
- [ ] If the action type was already completed today, the duplicate `recordActivity` call is a no-op
- [ ] Challenge activity does NOT appear in the 6-item Activity Checklist widget (checklist remains 6 items)
- [ ] Challenge activity DOES count toward the daily multiplier calculation

### Auto-Detection

- [ ] Auto-detection checks today's `wr_daily_activities` for the current challenge day's `actionType`
- [ ] If activity already completed, challenge day is auto-marked complete with toast: "Challenge Day X auto-completed! You already [verb] today."
- [ ] Auto-detection triggers on challenge detail page load
- [ ] Auto-detection triggers on dashboard render
- [ ] Auto-detection triggers after any `recordActivity()` call
- [ ] Auto-detection only runs for authenticated users with an active challenge
- [ ] Auto-detection only checks the current uncompleted day (not past days)
- [ ] Auto-completed days receive full gamification treatment (points, cross-activity credit, badge checks)
- [ ] Auto-detection is idempotent — already-completed days are skipped

### Challenge Badges

- [ ] 5 challenge-specific badges exist: "Lenten Warrior", "Easter Champion", "Spirit-Filled", "Advent Faithful", "New Year Renewed"
- [ ] 2 meta-badges exist: "Challenge Accepted" (1 challenge), "Challenge Master" (all 5)
- [ ] Challenge-specific badge is awarded when a challenge's final day is completed
- [ ] "Challenge Accepted" is awarded on first challenge completion
- [ ] "Challenge Master" is awarded when all 5 challenges have `status: "completed"`
- [ ] `challengesCompleted` counter in `wr_badges.activityCounts` increments on each challenge completion
- [ ] All challenge badges use the `full-screen` celebration tier except "Challenge Accepted" which uses `toast-confetti`

### Completion Celebration

- [ ] Completing final challenge day triggers a full-screen celebration overlay
- [ ] Overlay displays: challenge title in Caveat script font, "Challenge Complete!" heading, days completed count, faith points earned, badge name/icon, confetti animation
- [ ] 100 bonus faith points are awarded on challenge completion (separate from daily points)
- [ ] "Share Your Achievement" button is present (placeholder functionality)
- [ ] "Browse more challenges" CTA navigates to `/challenges`
- [ ] Overlay auto-dismisses after 8 seconds or on click/tap
- [ ] `prefers-reduced-motion`: no confetti, no fade animations, static display
- [ ] Challenge completion overlay fires before other queued celebrations

### Dashboard Widget

- [ ] Dashboard widget card appears in the dashboard grid for authenticated users
- [ ] Widget uses standard `DashboardCard` component with collapse/expand behavior

#### Active Challenge State
- [ ] Shows challenge title with theme color accent
- [ ] Shows "Day X of Y" with SVG progress ring using challenge theme color
- [ ] Shows today's daily action truncated to 1 line
- [ ] Shows "X day challenge streak" with flame icon when streak > 3
- [ ] "Continue →" link navigates to `/challenges/:challengeId`
- [ ] Widget refreshes when auto-detection completes a day

#### No Active Challenge — Season Active
- [ ] Shows "Join [Challenge Title]" heading
- [ ] Shows challenge description truncated to 2 lines
- [ ] Shows days remaining and mock participant count
- [ ] "Join now →" links to the challenge detail page

#### No Active Challenge — No Season Active
- [ ] Shows "Next challenge starts in X days" with upcoming challenge title
- [ ] "Set reminder" button toggles reminder in localStorage
- [ ] If no upcoming challenge: shows "New challenges are coming soon"

### Challenge Nudges

- [ ] Nudge toast shows after 6 PM local time when active challenge day is incomplete
- [ ] Toast content: "Don't forget your challenge! Day X: [action summary]"
- [ ] Toast has a "Go" button navigating to the challenge detail page
- [ ] Nudge shows only once per day (tracked via `wr_challenge_nudge_shown`)
- [ ] Nudge is suppressed when `wr_settings.notifications.nudges` is `false`
- [ ] Nudge only fires on dashboard render (not other pages)
- [ ] Nudge duration: 6 seconds, auto-dismiss
- [ ] If `wr_settings` doesn't exist, nudge defaults to enabled

### Responsive Layout

- [ ] Mobile (< 640px): Dashboard widget full-width, progress ring stacked above text, buttons full-width, 44px touch targets
- [ ] Tablet (640-1024px): Widget in dashboard grid, overlay centered `max-w-md`
- [ ] Desktop (> 1024px): Widget in 2-column grid with ring and text side by side, overlay centered `max-w-md`
- [ ] Completion overlay is properly centered at all breakpoints
- [ ] Switch dialog is properly centered with appropriate max-width at all breakpoints

### Accessibility

- [ ] Progress ring has `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`
- [ ] Switch confirmation dialog is keyboard-accessible (focus trapped, Enter to confirm, Escape to cancel)
- [ ] "Continue →" and "Join now →" links have descriptive `aria-label` including the challenge title
- [ ] Completion overlay is keyboard-dismissable (Escape or Enter)
- [ ] Completion overlay traps focus while visible
- [ ] Toast notifications are announced to screen readers via `role="status"` or `aria-live="polite"`
- [ ] "Go" button in nudge toast is keyboard-accessible
- [ ] All interactive elements in the widget meet 44px minimum touch target on mobile
- [ ] `prefers-reduced-motion`: completion confetti disabled, progress ring fill is instant (no animation)

### Visual Verification

- [ ] Dashboard widget card matches existing dashboard card style (frosted glass, rounded, same padding)
- [ ] Progress ring matches Activity Checklist ring style (size, stroke width, center text)
- [ ] Completion overlay matches existing level-up celebration overlay style
- [ ] Confetti particles match existing celebration confetti
- [ ] Switch dialog matches existing modal/dialog patterns
- [ ] Theme colors are correctly applied per challenge (Lent purple, Easter gold, Pentecost red, Advent violet, New Year teal)
- [ ] Toasts are positioned consistently with existing toast system

### No Regressions

- [ ] Existing 6-item daily Activity Checklist is unchanged (no 7th item for "challenge")
- [ ] Existing Full Worship Day badge logic is unchanged (still requires all 6 original activities)
- [ ] Existing streak system is unaffected (challenge days don't break or extend main streak directly — only via cross-activity credit)
- [ ] Challenge detail page from Spec 1 continues to function (this spec extends, not replaces)
- [ ] Challenge browser page from Spec 1 continues to function
- [ ] Existing badge definitions are unchanged — only new badges added
- [ ] Existing `recordActivity()` flow is extended, not replaced
- [ ] Existing toast system continues to work for non-challenge toasts
- [ ] Existing dashboard widgets are unaffected in position and behavior

---

## Out of Scope

- **Backend API**: Entirely frontend with localStorage. Backend persistence is Phase 3+.
- **Real participant counts**: Mock data only. Real-time participation tracking is Phase 3+.
- **Social sharing**: The "Share Your Achievement" button is a placeholder. Actual sharing mechanics (social cards, friend feed posts) are Spec 3.
- **Team challenges**: Organized group challenges with shared goals are Spec 3.
- **Challenge leaderboards**: Rankings within a challenge are Spec 3.
- **Push notifications / email reminders**: The nudge is an in-app toast, not a push notification. Real push is Phase 3+.
- **Audio narration**: No TTS Read Aloud for challenge content in this spec.
- **AI-generated challenge content**: All content is hardcoded from Spec 1.
- **User-created challenges**: Not in scope.
- **Challenge ratings or reviews**: No community feedback on challenges.
- **Landing page teaser**: No challenges section on the landing page.
- **Streak repair for challenge streaks**: No grace mechanic for missed challenge days (challenge streaks simply reset — this matches the "bonus engagement, not punishment" philosophy).
- **Missed day notifications**: No notification when a user misses a challenge day. The streak silently adjusts.
- **Challenge abandonment UI**: No explicit "Abandon challenge" button in this spec. A challenge is abandoned only when the calendar window ends with the user having completed less than half the days. Users can always resume a paused challenge.
