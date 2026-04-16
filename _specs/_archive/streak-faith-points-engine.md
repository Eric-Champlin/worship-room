# Feature: Streak & Faith Points Engine

**Master Plan Reference:** `dashboard-growth-spec-plan-v2.md`
- Shared data models: See "localStorage Key Summary" section — this spec owns `wr_daily_activities`, `wr_faith_points`, `wr_streak`
- Cross-spec dependencies: Spec 1 (Mood Check-In) writes `wr_mood_entries` which this spec reads to detect mood activity; Spec 6 (Dashboard Widgets + Activity Integration) adds `recordActivity()` calls to existing components and builds the dashboard cards that display this spec's data; Spec 7 (Badges) calls `checkForNewBadges()` inside `recordActivity()`
- Shared constants: Activity point weights, multiplier tiers, level thresholds, and `ActivityType` union type defined here are consumed by Specs 6-8, 10, 14, 15
- Shared utilities: `getLocalDateString()` and `getYesterdayDateString()` from Spec 1's `utils/date.ts` are consumed here

---

## Overview

The Streak & Faith Points Engine is the invisible backbone of Worship Room's gentle gamification system. It tracks six daily spiritual activities, calculates weighted faith points with daily multiplier bonuses, maintains streak counts, and determines the user's current growth level — all without any UI of its own.

This is a pure data engine: a set of data models, calculation functions, localStorage persistence, and a React hook (`useFaithPoints`) that downstream specs use to power dashboard widgets, badge unlock logic, leaderboard rankings, and profile displays. By isolating the engine from UI, every visual layer (Spec 6 widgets, Spec 7-8 badges, Spec 10 leaderboard) draws from a single source of truth.

The engine embodies the "gentle gamification" philosophy: it celebrates the activities a user completes without penalizing what they miss. Streaks reset honestly but messaging is always encouraging (handled in Spec 8). Points accumulate generously through multiplier bonuses that reward breadth of engagement. The highest multiplier ("Full Worship Day") is achievable but never expected.

---

## User Stories

- As a **logged-in user**, I want my daily spiritual activities to be tracked automatically so that I can see my engagement over time without manual effort.
- As a **logged-in user**, I want to earn faith points for each activity I complete so that I feel a sense of progress in my spiritual journey.
- As a **logged-in user**, I want bonus points when I engage in multiple activities in a single day so that I'm encouraged to explore the full breadth of what Worship Room offers.
- As a **logged-in user**, I want to see my current and longest streak so that I can celebrate consistency in my daily practice.
- As a **logged-in user**, I want to progress through faith levels (Seedling → Lighthouse) so that I have milestones to look forward to on my growth journey.
- As a **logged-in user**, I want my listening activity to count after 30 seconds of playback so that casual browsing doesn't count but intentional listening does.

---

## Requirements

### Six Trackable Activities

| Activity Key | Display Name | Trigger | Point Value |
|-------------|-------------|---------|-------------|
| `mood` | Logged mood | Mood check-in completed (Spec 1 writes to `wr_mood_entries`) | 5 |
| `pray` | Prayed | Prayer generated/viewed on Pray tab | 10 |
| `listen` | Listened | 30+ seconds of continuous audio playback | 10 |
| `prayerWall` | Prayer Wall | Prayed for someone (reaction/comment on Prayer Wall) | 15 |
| `meditate` | Meditated | Completed a meditation on any meditation sub-page | 20 |
| `journal` | Journaled | Saved a journal entry on Journal tab | 25 |

Each activity is a boolean per day — completing it multiple times in a day does not earn additional points. The maximum daily base points is 85 (5 + 10 + 10 + 15 + 20 + 25), or 170 with the 2x Full Worship Day multiplier.

### Daily Activity Storage

All daily activity data is stored in a single localStorage key (`wr_daily_activities`) as a JSON object keyed by date string (YYYY-MM-DD). Each date entry contains:
- Boolean flags for each of the 6 activities
- Cached `pointsEarned` (total points including multiplier for that day)
- Cached `multiplier` value for that day

No individual per-activity localStorage keys. This single key is the source of truth for what activities were completed on any given day.

### Point Calculation

Points are calculated per day based on which activities are completed:

1. Sum the base point values for all completed activities
2. Determine the daily multiplier based on the count of completed activities:
   - 0–1 activities: 1x (no bonus)
   - 2–3 activities: 1.25x
   - 4–5 activities: 1.5x
   - All 6 activities: 2x ("Full Worship Day")
3. Final daily points = round(base points × multiplier)

The multiplier rewards breadth of engagement, encouraging users to explore different features rather than repeating the same activity.

### Faith Points Accumulation

Total faith points are the running sum of all daily points earned across the user's lifetime. Stored in a separate localStorage key (`wr_faith_points`) with:
- Total accumulated points
- Current level number and name
- Points remaining to reach the next level
- Last updated timestamp

Points never decrease. There is no point decay, no spending mechanism, and no way to lose accumulated points.

### Level Progression

Six faith levels with fixed point thresholds:

| Level | Name | Points Required | Points to Next |
|-------|------|----------------|----------------|
| 1 | Seedling | 0 | 100 |
| 2 | Sprout | 100 | 400 |
| 3 | Blooming | 500 | 1,000 |
| 4 | Flourishing | 1,500 | 2,500 |
| 5 | Oak | 4,000 | 6,000 |
| 6 | Lighthouse | 10,000 | — (max level) |

Level is determined by total accumulated points. When a user's total points cross a threshold, they level up. Level-up detection compares the old level to the new level after a `recordActivity()` call — if the level changed, a level-up event is queued (consumed by Spec 8 celebrations).

At Lighthouse (max level), `pointsToNextLevel` is 0 or null, and points continue to accumulate for leaderboard ranking purposes.

### Streak Logic

A streak counts consecutive days on which the user completed at least one activity. Stored in a separate localStorage key (`wr_streak`) with:
- Current streak count
- Longest streak ever achieved
- Last active date (YYYY-MM-DD, or null if never active)

**Rules:**
- **First-ever activity**: If `lastActiveDate` is null, set current streak to 1, longest streak to 1
- **Already active today**: If `lastActiveDate` equals today, no change — streak is already counted for today
- **Consecutive day**: If `lastActiveDate` equals yesterday (via `getYesterdayDateString()`), increment current streak by 1
- **Missed day(s)**: If `lastActiveDate` is any date before yesterday, reset current streak to 1
- **Longest streak**: Always updated to `max(currentStreak, longestStreak)` after any change
- **No grace period**: Any gap of one or more days resets the streak to 1. No "forgiveness" days, no "freeze" tokens. The gentle gamification philosophy handles this through encouraging messaging (Spec 8), not through mechanical forgiveness.

### Listen Activity: 30-Second Timer

The "listen" activity requires 30 continuous seconds of audio playback before it counts. This is tracked in the AudioProvider:

- When audio playback starts, begin a 30-second timer
- If playback pauses before 30 seconds, reset the timer (cumulative time is not tracked — it must be 30 continuous seconds)
- Once 30 seconds of continuous playback is reached, call `recordActivity('listen')`
- The listen activity can only be recorded once per day — subsequent playback on the same day does not re-trigger
- The daily flag resets at midnight (new day = new opportunity to earn the listen point)
- Timer polling can check every 5 seconds (not every frame) to minimize overhead

### Core Hook: `useFaithPoints()`

A React hook that serves as the primary interface for all faith points operations. Returns:

| Property | Type | Description |
|----------|------|-------------|
| `totalPoints` | number | Lifetime accumulated faith points |
| `currentLevel` | number | Current level (1-6) |
| `levelName` | string | Current level name (e.g., "Seedling") |
| `pointsToNextLevel` | number | Points remaining to reach next level (0 at max) |
| `todayActivities` | object | Boolean flags for today's 6 activities |
| `todayPoints` | number | Points earned today (with multiplier applied) |
| `todayMultiplier` | number | Today's multiplier (1, 1.25, 1.5, or 2) |
| `currentStreak` | number | Current consecutive day streak |
| `longestStreak` | number | All-time longest streak |
| `recordActivity` | function | `(type: ActivityType) => void` — records an activity for today |

**`recordActivity(type)` behavior:**
1. Check auth — no-op if user is not authenticated (check `isAuthenticated` from auth context)
2. Read today's activities from `wr_daily_activities`
3. If this activity is already true for today, no-op (idempotent)
4. Set the activity boolean to true
5. Recalculate daily points and multiplier
6. Calculate the difference in points (new daily total minus previously cached daily total)
7. Add the point difference to total faith points in `wr_faith_points`
8. Recalculate level based on new total points
9. Detect level-up (compare old level to new level)
10. Update streak via streak logic
11. Persist all three localStorage keys (`wr_daily_activities`, `wr_faith_points`, `wr_streak`)
12. Update React state so consuming components re-render

**Idempotency**: Calling `recordActivity('pray')` twice in the same day has no effect the second time. The activity was already true, so steps 4-12 are skipped.

**Atomicity**: All three localStorage keys are updated together. If any step fails, the partial state should not be persisted (wrap writes in try/catch, write all or none).

### Mood Activity Detection

The mood activity is unique — it's not triggered by a direct `recordActivity('mood')` call. Instead, the engine detects it by reading `wr_mood_entries` (owned by Spec 1). When `useFaithPoints` loads or when state updates, it checks whether `wr_mood_entries` contains an entry for today's date. If so, the mood activity is marked true in `wr_daily_activities`.

Alternatively, Spec 6 can call `recordActivity('mood')` from the mood check-in completion handler. Either approach is valid — the key requirement is that completing the mood check-in results in the mood activity being marked true for today.

---

## AI Safety Considerations

- **Crisis detection needed?**: No — this spec is a data engine with no user-facing text input. Crisis detection is handled by Spec 1 (mood check-in text field) and other input-accepting features.
- **User input involved?**: No — all data comes from system events (activity completion triggers), not user text.
- **AI-generated content?**: No — all calculations are deterministic, no AI involved.

---

## Auth & Persistence

### Logged-out users (demo mode):
- **Zero data persistence**. `recordActivity()` is a no-op when the user is not authenticated.
- Logged-out users can still use all features (pray, journal, meditate, listen, prayer wall) — the activities just aren't tracked or recorded.
- No cookies, no anonymous IDs, no tracking of any kind for logged-out users.

### Logged-in users:
- All activity data persisted to three localStorage keys: `wr_daily_activities`, `wr_faith_points`, `wr_streak`
- Data persists across sessions and page reloads
- `logout()` (from AuthProvider) does NOT clear any `wr_*` data — user retains all progress even after logging out and back in
- In Phase 3, this data migrates to the backend API

### Route type:
- No route. This is a data engine consumed by other specs' components and hooks.

### Auth gating per element:

| Element | Logged-out behavior | Logged-in behavior |
|---------|--------------------|--------------------|
| `recordActivity()` call | No-op (returns immediately) | Records activity, updates points/streak/level |
| `useFaithPoints()` hook | Returns zero/default values for all fields | Returns real calculated values from localStorage |
| Listen 30-second timer | Does not start (or starts but `recordActivity` no-ops) | Tracks playback time, triggers `recordActivity('listen')` at 30s |

---

## Data Model Summary

### `wr_daily_activities` (localStorage)

JSON object keyed by date string. Each entry tracks 6 activity booleans plus cached calculated values.

- Keyed by `YYYY-MM-DD` date strings (local timezone via `getLocalDateString()`)
- Each date contains: `mood`, `pray`, `journal`, `meditate`, `listen`, `prayerWall` (booleans), `pointsEarned` (number), `multiplier` (number)
- Historical entries are retained indefinitely (no pruning — used by Specs 6, 10, 15 for charts and leaderboards)

### `wr_faith_points` (localStorage)

Single JSON object with lifetime totals.

- `totalPoints`: number — lifetime accumulated
- `currentLevel`: number (1-6)
- `currentLevelName`: string
- `pointsToNextLevel`: number (0 at max level)
- `lastUpdated`: string (ISO date)

### `wr_streak` (localStorage)

Single JSON object with streak state.

- `currentStreak`: number
- `longestStreak`: number
- `lastActiveDate`: string | null (YYYY-MM-DD)

---

## Edge Cases

- **First-ever activity**: `wr_streak` doesn't exist yet or `lastActiveDate` is null. Streak starts at 1, longest streak set to 1.
- **Corrupted localStorage**: If any of the three keys contain invalid JSON, treat as empty/default state. Do not crash. Initialize fresh defaults.
- **Same-day duplicate calls**: `recordActivity('pray')` called 5 times on the same day — only the first call has any effect. Subsequent calls are idempotent no-ops.
- **Multi-day gap**: User was active Monday, returns Thursday. Streak resets to 1 on Thursday. Points for Monday are preserved. No retroactive points for missed days.
- **Midnight rollover**: Date calculations use `getLocalDateString()` (local timezone). A user active at 11:59 PM and again at 12:01 AM earns activities on two different days and their streak increments.
- **Multiple browser tabs**: localStorage is shared. Activity recorded in Tab A is visible in Tab B on next read. However, React state within `useFaithPoints()` in Tab B does not auto-update — it reads from localStorage on mount and on `recordActivity()` calls. Cross-tab reactivity is not required for MVP but should not cause data corruption.
- **Level-up detection**: Must compare the level before and after updating total points. If the level number changes, a level-up event occurred. This detection is important for Spec 8 (celebrations) — the hook should expose or queue this event.
- **Max level (Lighthouse)**: At 10,000+ points, user is at Lighthouse. `pointsToNextLevel` is 0. Points continue to accumulate (for leaderboard ranking). No level-up events fire after reaching Lighthouse.
- **Zero activities today**: If a user visits but completes no activities, no `wr_daily_activities` entry is created for today. This is not a streak day.
- **Point recalculation accuracy**: When a second activity is completed, the multiplier may change (e.g., 1x → 1.25x). The point difference must account for the increased multiplier applying retroactively to the first activity's base points. Recalculate the full day's points and diff against the previously cached `pointsEarned`.
- **localStorage unavailable**: If localStorage is blocked (e.g., Safari private browsing), all operations degrade gracefully — `recordActivity()` is a no-op, `useFaithPoints()` returns defaults.

---

## Out of Scope

- **Dashboard widgets displaying streak/points/level** — Spec 6 (this spec builds the engine; Spec 6 builds the UI cards)
- **Activity checklist UI** — Spec 6
- **`recordActivity()` integration calls in existing components** (Pray, Journal, Meditate, AudioProvider, Prayer Wall) — Spec 6 (this spec builds the hook; Spec 6 wires it into existing components)
- **Badge definitions and unlock logic** — Spec 7 (consumes `recordActivity()` to check for badge triggers)
- **Celebrations and level-up animations** — Spec 8 (consumes level-up events from this spec)
- **Streak milestone messaging** ("Your streak was reset" gentle messaging) — Spec 8
- **Friends and leaderboard** — Specs 9-10 (consume total points for ranking)
- **AI insights based on activity patterns** — Spec 15
- **Backend API persistence** — Phase 3 (this spec uses localStorage only)
- **Real authentication** — Phase 3 (this spec uses simulated auth from Spec 2's AuthProvider)
- **Activity editing or deletion** — not in MVP
- **Point decay or spending** — not in MVP
- **Grace periods or streak freezes** — not in MVP (gentle gamification handles resets through messaging, not mechanics)

---

## Acceptance Criteria

### Activity Tracking
- [ ] Six activity types are defined: `mood`, `pray`, `journal`, `meditate`, `listen`, `prayerWall`
- [ ] Each activity is stored as a boolean per day in `wr_daily_activities` keyed by YYYY-MM-DD date string
- [ ] Date keys use local timezone via `getLocalDateString()` (not UTC)
- [ ] Completing an activity multiple times in the same day has no additional effect (idempotent)
- [ ] `wr_daily_activities` historical entries are retained (no pruning)

### Point Calculation
- [ ] Base point values: mood=5, pray=10, listen=10, prayerWall=15, meditate=20, journal=25
- [ ] Maximum daily base points = 85 (all 6 activities)
- [ ] 0-1 activities: 1x multiplier (no bonus)
- [ ] 2-3 activities: 1.25x multiplier
- [ ] 4-5 activities: 1.5x multiplier
- [ ] All 6 activities: 2x multiplier ("Full Worship Day")
- [ ] Daily points = round(base points × multiplier)
- [ ] Maximum daily points = 170 (85 × 2x)
- [ ] When a new activity changes the multiplier tier, total daily points are recalculated correctly (not just the new activity's points added)

### Faith Points Storage
- [ ] `wr_faith_points` stores totalPoints, currentLevel, currentLevelName, pointsToNextLevel, lastUpdated
- [ ] Total points never decrease
- [ ] Total points are the lifetime sum of all daily pointsEarned values

### Level Progression
- [ ] Level 1 (Seedling) at 0 points
- [ ] Level 2 (Sprout) at 100 points
- [ ] Level 3 (Blooming) at 500 points
- [ ] Level 4 (Flourishing) at 1,500 points
- [ ] Level 5 (Oak) at 4,000 points
- [ ] Level 6 (Lighthouse) at 10,000 points
- [ ] Level-up is detected when total points cross a threshold (old level != new level)
- [ ] At Lighthouse (max level), pointsToNextLevel is 0 and points continue to accumulate
- [ ] Level thresholds are exact boundaries (e.g., 100 points = Sprout, 99 = Seedling)

### Streak Logic
- [ ] Streak tracks consecutive days with at least one activity
- [ ] First-ever activity: current streak = 1, longest streak = 1
- [ ] Consecutive day (lastActiveDate = yesterday): current streak increments by 1
- [ ] Missed day(s) (lastActiveDate before yesterday): current streak resets to 1
- [ ] Already active today (lastActiveDate = today): no streak change
- [ ] Longest streak = max(currentStreak, longestStreak) after every update
- [ ] No grace period — any gap resets the streak
- [ ] Multi-day gaps handled correctly (e.g., active Monday, return Thursday → streak = 1)

### `useFaithPoints()` Hook
- [ ] Returns: totalPoints, currentLevel, levelName, pointsToNextLevel, todayActivities, todayPoints, todayMultiplier, currentStreak, longestStreak, recordActivity
- [ ] `recordActivity(type)` is a no-op when user is not authenticated
- [ ] `recordActivity(type)` is idempotent (second call for same activity on same day does nothing)
- [ ] `recordActivity(type)` updates all three localStorage keys (`wr_daily_activities`, `wr_faith_points`, `wr_streak`)
- [ ] Hook returns correct reactive state — consuming components re-render after `recordActivity()` is called
- [ ] All data persists across page reloads (read from localStorage on mount)
- [ ] Returns zero/default values when user is not authenticated

### Listen Timer (AudioProvider Integration)
- [ ] Timer starts when audio playback begins
- [ ] Timer resets when audio playback pauses (not cumulative — must be 30 continuous seconds)
- [ ] `recordActivity('listen')` is called after 30 continuous seconds of playback
- [ ] Listen activity is recorded at most once per day
- [ ] Timer resets daily (new day = new opportunity to earn listen point)
- [ ] Timer polling interval is reasonable (every ~5 seconds, not every frame)

### Auth Gating
- [ ] `recordActivity()` no-ops when `isAuthenticated` is false
- [ ] `useFaithPoints()` returns default/zero values when not authenticated
- [ ] No localStorage writes occur for unauthenticated users

### Error Handling
- [ ] Corrupted `wr_daily_activities` (invalid JSON) is treated as empty object — no crash
- [ ] Corrupted `wr_faith_points` (invalid JSON) is treated as defaults (0 points, Seedling, etc.)
- [ ] Corrupted `wr_streak` (invalid JSON) is treated as defaults (streak 0, no lastActiveDate)
- [ ] localStorage unavailable (Safari private browsing) degrades gracefully — no crashes, no-op behavior

### Test Coverage
- [ ] Point calculation tests for all activity combinations (0 through 6 activities)
- [ ] Multiplier tier boundary tests (1 vs 2 activities, 3 vs 4, 5 vs 6)
- [ ] Streak logic tests: first activity, consecutive day, missed day, multi-day gap, same-day duplicate
- [ ] Level progression tests: correct level at every threshold boundary (0, 99, 100, 499, 500, etc.)
- [ ] Level-up detection tests: detects level change, does not fire at same level
- [ ] `recordActivity` idempotency test: second call returns early with no state change
- [ ] Auth guard test: `recordActivity` is no-op when not authenticated
- [ ] localStorage persistence test: data survives page reload simulation
- [ ] Corrupted localStorage recovery tests for all three keys
