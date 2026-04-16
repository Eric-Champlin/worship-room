# BB-17: Reading Streak

**Master Plan Reference:** N/A — standalone spec in the Bible Redesign wave. Builds on BB-0 (landing streak chip stub), BB-4 (reader read-tracking stubs), BB-14 (My Bible quick stats). Follows the BB-7 reactive store pattern established by `highlightStore.ts` and `bookmarkStore.ts`.

**Depends on:** BB-0, BB-4, BB-14, BB-16
**Hands off to:** BB-19 (last-read resume can read streak metadata), BB-41 (web push notifications for at-risk streaks), BB-43 (reading heatmap reads from the same readChapters store)

---

## Overview

Worship Room's Bible reader needs a way to notice when users show up — and to gently encourage the habit of daily scripture reading without punishing lapses. BB-17 introduces a reading streak system that tracks which days the user has read scripture, surfaces the streak count in three places (the landing chip, My Bible quick stats, and a new streak detail modal), handles midnight rollovers correctly, and implements **grace days** so users don't get punished for one missed day.

This is the first spec where time becomes a first-class concept. Until now, every persisted artifact was timestamped but the timestamps weren't load-bearing. BB-17 makes "today" mean something: the app actually notices when the user shows up versus when they don't.

The key differentiator: other Bible apps (YouVersion, Duolingo) are rigid about streaks — miss one day and you reset. Duolingo charges money for "streak freezes." Worship Room gives grace days away free because the product values matter more than the engagement metric. A user who reads for 47 days and misses one comes back to "47 days, grace day used" — not "streak: 0." For an emotional healing app, this is the right call.

## User Stories

- As a **Bible reader**, I want to see how many consecutive days I've read scripture so that I can build and maintain a daily reading habit.
- As a **returning reader who missed one day**, I want my streak to survive a single missed day (via grace) so that one busy day doesn't erase weeks of consistent reading.
- As a **returning reader after a longer break**, I want to see my previous streak honored and the new day framed as a fresh start so that I feel welcomed back, not punished.
- As a **curious user**, I want to tap the streak chip to see detail (current streak, longest ever, total days, grace status, recent activity grid) so that I can understand my reading history at a glance.

## Context

### Existing Infrastructure (verified by codebase audit)

| Component | Path | Status |
|-----------|------|--------|
| StreakChip (stub) | `frontend/src/components/bible/landing/StreakChip.tsx` | Renders flame icon + count, accepts `BibleStreak` prop |
| Landing state | `frontend/src/lib/bible/landingState.ts` | `getBibleStreak()` reads from `wr_bible_streak` |
| MyBiblePage quick stats | `frontend/src/pages/MyBiblePage.tsx:161-167` | Displays `totalCounts.streak` with Flame icon |
| BibleReader read tracking | `frontend/src/pages/BibleReader.tsx:277-299` | Stub writes `wr_bible_last_read` + `wr_bible_progress`, has `// TODO BB-17` |
| BB-7 reactive store pattern | `frontend/src/lib/bible/highlightStore.ts` | Module-level cache + listeners Set + subscribe + getters + mutations |

### localStorage Key Mapping

The existing `wr_bible_streak` key (simple `{ count, lastReadDate }` shape from BB-0 stub) will be superseded by a new `bible:streak` key with a richer `StreakRecord` shape, following the `bible:` prefix convention used by BB-7+. The `wr_bible_streak` key becomes unused after BB-17 ships. Additionally, a `bible:streakResetAcknowledged` key tracks the streak reset welcome screen dismissal.

## Requirements

### Functional Requirements

#### 1. Streak Store (`streakStore.ts`)

A new reactive store at `frontend/src/lib/bible/streakStore.ts` following the BB-7 pattern (module-level cache, listeners Set, subscribe/unsubscribe, getters, mutations).

**StreakRecord shape:**

```typescript
type StreakRecord = {
  currentStreak: number;            // current consecutive day count
  longestStreak: number;            // best ever
  lastReadDate: string;             // ISO date "YYYY-MM-DD" of the last day with a read
  streakStartDate: string;          // ISO date the current streak began
  graceDaysAvailable: number;       // 0 to 1 (cap at 1 for now)
  graceDaysUsedThisWeek: number;    // 0 to 1; resets each ISO week
  lastGraceUsedDate: string | null; // ISO date when grace was last used
  weekResetDate: string;            // ISO date when graceDaysUsedThisWeek was last reset
  milestones: number[];             // streak counts the user has hit (for one-time celebrations)
  totalDaysRead: number;            // lifetime count of distinct days with reads
};
```

**localStorage key:** `bible:streak`

**Default state (new users):**
```typescript
{
  currentStreak: 0,
  longestStreak: 0,
  lastReadDate: '',
  streakStartDate: '',
  graceDaysAvailable: 1,
  graceDaysUsedThisWeek: 0,
  lastGraceUsedDate: null,
  weekResetDate: getISOWeekStart(today),
  milestones: [],
  totalDaysRead: 0,
}
```

**SSR-safe:** Server reads return the default state; server writes are no-ops.

#### 2. Date Utilities (`dateUtils.ts`)

A new utility module at `frontend/src/lib/bible/dateUtils.ts` with:

- **`getTodayLocal(): string`** — Returns the current date in the user's local timezone as `YYYY-MM-DD`. Used everywhere "today" is needed. Never compare timestamps directly for day-boundary logic.
- **`daysBetween(startDate: string, endDate: string): number`** — Returns the number of full calendar days between two ISO date strings. `daysBetween('2026-04-09', '2026-04-09') === 0`, `daysBetween('2026-04-09', '2026-04-10') === 1`.
- **`getISOWeekStart(date: string): string`** — Returns the Monday of the ISO week containing the given date, as `YYYY-MM-DD`.
- **`getYesterday(date: string): string`** — Returns the date one day before the given date.

**Day boundary rule:** Local midnight, user's device timezone. This is simpler and less surprising than Duolingo's 4 AM rule. Scripture reading is more often a morning practice. If user research later shows midnight is wrong, this can be revisited.

#### 3. Core Mutation: `recordReadToday()`

The single entry point for the reader to report a chapter was loaded. **Idempotent within a day** — calling it 5 times on the same day produces the same final state as calling it once.

**Returns:**
```typescript
type StreakUpdateResult = {
  previousStreak: number;
  newStreak: number;
  delta: 'same-day' | 'extended' | 'used-grace' | 'reset' | 'first-read';
  milestoneReached: number | null;
  graceDaysRemaining: number;
  isFirstReadEver: boolean;
};
```

**Logic flow:**

1. Get today's date in local timezone as ISO string
2. Reset week-grace counter if `weekResetDate` is in a previous ISO week
3. Compare today to `lastReadDate`:
   - **Case A — same day** (`today === lastReadDate`): no change, return `delta: 'same-day'`
   - **Case B — first read ever** (`lastReadDate === ''`): set streak to 1, return `delta: 'first-read'`
   - **Case C — consecutive day** (1-day gap): increment streak, return `delta: 'extended'`
   - **Case D — 2-day gap** (missed exactly one day):
     - If `graceDaysUsedThisWeek === 0` AND `graceDaysAvailable >= 1`: use grace day, increment streak, return `delta: 'used-grace'`
     - Else: reset streak to 1, return `delta: 'reset'`
   - **Case E — 3+ day gap**: reset streak to 1, return `delta: 'reset'`
4. Milestone check: if `currentStreak` matches a threshold (3, 7, 14, 30, 60, 100, 365) not already in the milestones array, append it and set `milestoneReached`
5. Persist and notify subscribers

**Grace day rules:**
- Grace covers only a single missed day, not a multi-day gap
- Grace regenerates weekly (1 per ISO week), not daily
- Grace day logged with `lastGraceUsedDate` for UI display
- A reset never loses `longestStreak` — it survives forever
- `streakStartDate` updates on extension and reset, not on grace use

#### 4. Landing Streak Chip

Replace the existing StreakChip stub with a real component wired to the streak store.

- Shows flame icon + current streak count when streak > 0
- **Hidden entirely** when streak is 0 (no "0 days")
- Tapping opens the streak detail modal
- **At-risk state:** When streak > 0, lastReadDate is yesterday, and local time is past 6 PM — flame icon shifts to a warmer, more attention-grabbing tone. Tooltip: "Read today to keep your streak."
- **Milestone celebration:** When the user first lands on a page after crossing a milestone (3, 7, 14, 30, 60, 100, 365), the flame pulses gently and a small toast appears for 4 seconds: "{N} day streak!" Milestone gets persisted so it never plays again. Reduced motion: instant brightness change instead of pulse.

**At-risk check cadence:** On landing page mount, on streak store subscribe, and on a 1-minute interval if the page is visible.

#### 5. My Bible Quick Stats Integration

Wire the existing "Day streak" stat card in My Bible quick stats to live streak data from the store. Make it tappable to open the streak detail modal.

#### 6. Streak Detail Modal

A new modal component that opens from either the landing chip or the My Bible stat card. Same modal patterns as BB-16's settings modal (backdrop tap, Escape, X button to close).

**Contents (top to bottom):**

- **Header:** "Reading streak" title, close button (X)
- **Big streak number:** Current streak count in cinematic display font with flame icon
- **Dynamic subtitle:**
  - Streak active: "You've read X days in a row."
  - Used grace today: "You used your grace day. Your streak is safe."
  - At risk: "Read today to keep your streak alive."
  - Streak just broken: "Fresh start. You've got this."
- **Stats row:** Current streak (large), Longest ever (medium), Total days read (medium)
- **Grace day status:**
  - "Grace day available" with green indicator if unused this week
  - "Grace day used (resets [day of week])" with muted indicator if used
  - Caption: "Miss one day a week without losing your streak."
- **7-day mini-grid:** Last 7 days, each square colored if read, hollow if not, ringed if grace was used. Pulled from `readChapters` data via a helper that walks the 7 days.
- **Footer caption:** "Streaks help, but they aren't the point. Read because it matters, not because of the count."

#### 7. Streak Reset Welcome Screen

When a user reads after a break long enough to reset the streak, they see a soft landing screen once:

- **Heading:** "Welcome back."
- **Subtitle:** "You read on [streak start date] and built a [N]-day streak. That counts forever."
- **Mid-section:** "Today is day 1 of whatever comes next."
- **CTA:** "Continue" button closes the screen

Tracked via `bible:streakResetAcknowledged: { date: 'YYYY-MM-DD' }` in localStorage. Shows once per reset, then never again until the next reset.

#### 8. Reader Integration

In the BibleReader component, after the existing read-tracking stub (writes to `wr_bible_last_read` and `wr_bible_progress`), add a call to `recordReadToday()` from the streak store. The reader doesn't need to know about grace, milestones, or at-risk state — it just reports "the user read a chapter."

### Non-Functional Requirements

- **Performance:** The 1-minute at-risk interval check does a string comparison and a localStorage read — sub-millisecond. No over-engineering needed.
- **Accessibility:** Lighthouse score >= 95 with modal open. All tap targets >= 44px. Reduced motion respected on milestone animations.
- **Zero raw hex values** — use design system tokens throughout.

## Auth Gating

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| View streak chip on landing | Visible if streak > 0 (streak is device-local, not account-gated) | Same | N/A |
| Tap streak chip (open modal) | Opens streak detail modal | Same | N/A |
| View My Bible streak stat | Visible in quick stats | Same | N/A |
| Tap My Bible streak stat | Opens streak detail modal | Same | N/A |
| Read a chapter (triggers recordReadToday) | Streak records the read | Same | N/A |
| View streak reset welcome | Shows once after reset | Same | N/A |

**No auth gating.** The streak system is entirely device-local (localStorage). There are no account-gated actions. Both logged-in and logged-out users get the same behavior. This follows the Bible redesign wave's principle that no account is required for any Bible feature.

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | Streak chip renders inline in landing hero. Modal is full-width with 16px padding. 7-day grid squares are 32px. Stats row stacks vertically. |
| Tablet (640-1024px) | Same as mobile with wider modal (max 480px centered). Stats row horizontal. |
| Desktop (> 1024px) | Streak chip in landing hero. Modal centered with max-width 480px. Stats row horizontal. 7-day grid squares 40px. |

The streak detail modal and reset welcome screen are fully usable at 375px width.

## AI Safety Considerations

N/A — This feature does not involve AI-generated content or free-text user input. No crisis detection required.

## Auth & Persistence

- **Logged-out users:** Full streak functionality. All data in localStorage only (device-local). Zero server persistence.
- **Logged-in users:** Same behavior — localStorage only. Future backend persistence in Phase 3+.
- **localStorage keys:**
  - `bible:streak` — `StreakRecord` (the full streak state)
  - `bible:streakResetAcknowledged` — `{ date: string }` (reset welcome screen dismissal)
- **Route type:** Public (no auth required)

## Completion & Navigation

N/A — standalone feature. Not part of the Daily Hub tabbed experience.

## Design Notes

- Reference the existing `StreakChip` stub component pattern for the landing chip
- Streak detail modal follows BB-16's settings modal patterns (backdrop tap, Escape, X)
- Flame icon from Lucide React (already used in existing StreakChip stub)
- Use design system tokens: `hero-bg` for modal backdrop, `primary` for active flame, `warning` for at-risk flame warmth, `success` for grace-available indicator
- FrostedCard-style glass effect for the modal (match existing Bible redesign drawer/modal patterns)
- Big streak number uses the cinematic display font treatment from the landing page
- 7-day mini-grid squares use subtle border (`border-white/20` for empty, filled with `primary` for read days, ringed with `warning` for grace days)
- Milestone toast: small, positioned at top of screen, auto-dismisses after 4 seconds. No confetti, no full-screen takeover. The flame pulse and the count are enough.
- Reset welcome screen: centered, gentle, no alarm colors. "Welcome back" framing, not "you lost your streak."
- `_plans/recon/design-system.md` exists and should be referenced during planning for exact CSS values

### New Visual Patterns

1. **At-risk flame color shift** — subtle warmth change on the streak chip flame icon when at risk (new pattern, no existing precedent)
2. **Milestone celebration toast** — small fixed-position toast with flame pulse animation (new pattern)
3. **7-day mini-grid** — compact day-of-week activity visualization (new pattern, BB-43 will expand to full heatmap)

These should be marked `[UNVERIFIED]` during planning until exact values are confirmed.

## Critical Edge Cases

### Multiple chapters in one day
`recordReadToday()` is idempotent within a day. Reading 5 chapters on Monday counts as one streak day.

### Browser tab open across midnight
The streak records based on when the chapter loads, not when verses are tapped. A chapter loaded at 11:55 PM records that day; navigating to a new chapter at 12:05 AM records the next day — extending the streak. This is slightly generous and intentional.

### Time zone changes (travel)
A user flying from Tokyo to Los Angeles may see the day boundary shift, potentially getting credit for the "same" date twice or skipping a day. Grace day covers the skip case. We accept these edge cases — travel is rare enough that fixing them adds significant complexity for marginal benefit.

### Manual clock changes
Accepted. The streak is a personal motivator, not a competitive ranking.

### localStorage cleared
Streak is gone. BB-16 export does NOT include the streak (intentional — streaks are tied to a device's lived experience, not transferable data). Known limitation, documented.

## Out of Scope

- **No reading heatmap** — BB-43 handles the full month/year view. BB-17 only has a 7-day mini-grid.
- **No streak notifications via web push** — BB-41. The at-risk state is in-app only.
- **No streak in the export file** — BB-16 explicitly excluded streak data.
- **No leaderboards or social comparison** — no accounts, no comparison.
- **No streak freeze purchases** — grace days are free.
- **No streak shields, streak doublers, or other gamification** — minimal by design.
- **No daily reading goal beyond "read at least one chapter"** — a chapter is the unit.
- **No retroactive streak recovery** — once reset, it's reset.
- **No analytics on streak metrics** — not tracking.
- **No backend storage** — localStorage only.
- **No streak goal setting** ("I want to reach 100 days") — could be a future feature.
- **No celebration animations beyond the milestone toast** — restrained by design.
- **No resetting the streak from the UI** — no "delete my streak" button. Intentional to prevent accidental resets.

## Acceptance Criteria

- [ ] Streak store exists at `frontend/src/lib/bible/streakStore.ts` with the documented API following BB-7 reactive pattern (subscribe, getter, mutation)
- [ ] `recordReadToday()` is idempotent within a day — calling it 5 times produces the same final state as calling it once
- [ ] First read ever sets `currentStreak: 1`, `streakStartDate: today`, `totalDaysRead: 1`, returns `delta: 'first-read'`
- [ ] Reading on a consecutive day increments the streak and returns `delta: 'extended'`
- [ ] Reading after a 2-day gap with grace available uses the grace day and returns `delta: 'used-grace'`
- [ ] Reading after a 2-day gap with no grace available resets the streak and returns `delta: 'reset'`
- [ ] Reading after a 3+ day gap always resets, regardless of grace
- [ ] `longestStreak` updates when `currentStreak` exceeds it and persists across resets
- [ ] `graceDaysUsedThisWeek` resets to 0 at the start of each ISO week
- [ ] Crossing a milestone (3, 7, 14, 30, 60, 100, 365) appends to the milestones array exactly once
- [ ] Streak chip on the landing renders the current streak count when > 0
- [ ] Streak chip is hidden when streak is 0
- [ ] Streak chip animates a milestone celebration the first time the user lands after crossing a milestone
- [ ] Streak chip's at-risk state activates when streak > 0, lastReadDate is yesterday, and local time is past 6 PM
- [ ] Tapping the streak chip opens the streak detail modal
- [ ] Streak detail modal shows current streak, longest streak, total days read, grace day status, and 7-day mini-grid
- [ ] 7-day mini-grid correctly renders read days, unread days, and grace-used days
- [ ] At-risk state on the chip updates without page refresh on the next 1-minute interval check
- [ ] Streak reset welcome screen appears once after a reset and never again until the next reset
- [ ] Streak reset welcome screen acknowledges the previous longest streak ("You built a [N]-day streak. That counts forever.")
- [ ] Reader's chapter mount handler calls `recordReadToday()` after the existing read-tracking stub
- [ ] Reading multiple chapters on the same day produces no streak change after the first chapter
- [ ] Store correctly identifies "today" using the user's local timezone, not UTC
- [ ] ISO week boundary detection works correctly across year boundaries
- [ ] My Bible quick stat card for "Day streak" shows the live streak count
- [ ] Tapping the My Bible stat card opens the streak detail modal
- [ ] Streak modal closes on backdrop tap, Escape, and X button
- [ ] Reduced motion respected on milestone celebration animation (instant brightness change instead of pulse)
- [ ] `streakStore.test.ts` covers: first read, same-day idempotence, consecutive extension, grace-eligible 2-day gap, grace-ineligible 2-day gap, 3-day gap reset, milestone detection, milestone deduplication, longest streak preservation across reset, week reset on Monday
- [ ] `dateUtils.test.ts` covers: getTodayLocal returns ISO format, daysBetween correct for same-day/1-day/multi-day/year boundary, getISOWeekStart returns Monday of current week
- [ ] Streak detail modal fully usable on mobile (375px) and desktop
- [ ] Lighthouse accessibility score >= 95 with modal open
- [ ] All tap targets >= 44px
- [ ] Zero raw hex values — design system tokens only
- [ ] Store is SSR-safe — server reads return default state, server writes are no-ops
