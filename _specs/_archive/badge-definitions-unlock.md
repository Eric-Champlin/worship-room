# Feature: Badge Definitions & Unlock Logic

**Master Plan Reference:** `dashboard-growth-spec-plan-v2.md`
- Shared data models: See "localStorage Key Summary" section — this spec owns `wr_badges`
- Cross-spec dependencies: Spec 5 (Streak & Faith Points Engine) provides `recordActivity()`, streak data, level data, and daily activity state that this spec reads; Spec 6 (Dashboard Widgets + Activity Integration) wires `recordActivity()` into existing components; Spec 8 (Celebrations & Badge Collection UI) consumes the `newlyEarned` queue this spec populates
- Shared constants: Badge IDs, celebration tiers, level-up verses, and activity count thresholds defined here are consumed by Specs 8, 10, 14
- Shared utilities: `getLocalDateString()` from Spec 1's `utils/date.ts` is consumed here

---

## Overview

The Badge Definitions & Unlock Logic is the engine that defines, tracks, and awards all ~35 badges in Worship Room's gentle gamification system. When a user completes an activity, records a streak milestone, levels up, or performs a community action, this engine detects the achievement and queues it for celebration.

This is a pure data/logic layer with **no UI**. It defines every badge (ID, name, trigger condition, celebration tier), maintains running activity counters for milestone tracking, persists earned badges with timestamps, and manages a `newlyEarned` queue that the celebration system (Spec 8) drains to show toasts, confetti, and full-screen overlays.

The engine integrates into the existing `recordActivity()` flow from Spec 5: after points and streaks are updated, `checkForNewBadges()` runs to detect any newly earned badges. This ensures badges are awarded in real-time as users engage with the app, creating immediate positive feedback loops.

Badge philosophy follows "gentle gamification": badges celebrate what users accomplish without highlighting what they haven't. Locked badges are visible (in Spec 8's UI) to provide aspirational goals, but the language is always invitational ("Complete 25 meditations") rather than judgmental. The Welcome badge awarded on signup ensures every user starts with an achievement.

---

## User Stories

- As a **logged-in user**, I want to earn badges when I reach milestones so that I feel recognized for my spiritual journey.
- As a **logged-in user**, I want my activity counts to be tracked automatically so that I can progress toward milestone badges without manual effort.
- As a **logged-in user**, I want to receive a Welcome badge when I create my account so that I feel immediately welcomed into the community.
- As a **logged-in user**, I want streak milestones to be recognized with badges so that my consistency is celebrated.
- As a **logged-in user**, I want level-up moments to feel meaningful, with a scripture verse tied to each growth level.
- As a **logged-in user**, I want a Full Worship Day badge that can be earned repeatedly so that I'm encouraged to engage broadly each day.
- As a **logged-in user**, I want community-oriented badges so that I'm encouraged to support others through friendship and encouragement.

---

## Requirements

### Badge Categories & Definitions

**Streak Milestones (7 badges):**

| ID | Name | Trigger | Celebration Tier |
|----|------|---------|-----------------|
| `streak_7` | First Flame | Current streak reaches 7 days | toast |
| `streak_14` | Steady Flame | Current streak reaches 14 days | toast |
| `streak_30` | Burning Bright | Current streak reaches 30 days | toast |
| `streak_60` | Unwavering | Current streak reaches 60 days | full-screen |
| `streak_90` | Faithful | Current streak reaches 90 days | full-screen |
| `streak_180` | Half-Year Warrior | Current streak reaches 180 days | full-screen |
| `streak_365` | Year of Faith | Current streak reaches 365 days | full-screen |

Streak badges are checked against `currentStreak` from the streak data. Each is earned once — a streak reset and rebuild earns the same badge again only if the user has not already earned it.

**Level-Up Badges (6 badges):**

| ID | Name | Trigger | Celebration Tier | Verse (WEB) |
|----|------|---------|-----------------|--------------|
| `level_1` | Seedling | Reach Level 1 (0 points — awarded on signup) | full-screen | "For we are his workmanship, created in Christ Jesus for good works." — Ephesians 2:10 |
| `level_2` | Sprout | Reach Level 2 (100 points) | full-screen | "I planted, Apollos watered, but God gave the increase." — 1 Corinthians 3:6 |
| `level_3` | Blooming | Reach Level 3 (500 points) | full-screen | "The righteous shall flourish like the palm tree. He will grow like a cedar in Lebanon." — Psalm 92:12 |
| `level_4` | Flourishing | Reach Level 4 (1,500 points) | full-screen | "But the fruit of the Spirit is love, joy, peace, patience, kindness, goodness, faith." — Galatians 5:22 |
| `level_5` | Oak | Reach Level 5 (4,000 points) | full-screen | "He will be like a tree planted by the streams of water, that produces its fruit in its season." — Psalm 1:3 |
| `level_6` | Lighthouse | Reach Level 6 (10,000 points) | full-screen | "You are the light of the world. A city located on a hill can't be hidden." — Matthew 5:14 |

Level badges are earned once. The `level_1` (Seedling) badge is awarded alongside the Welcome badge on account creation since all users start at Level 1.

**Activity Milestones (9 badges):**

| ID | Name | Trigger | Celebration Tier |
|----|------|---------|-----------------|
| `first_prayer` | First Prayer | 1st prayer generated/viewed | toast |
| `prayer_100` | Prayer Warrior | 100th prayer | toast-confetti |
| `first_journal` | First Entry | 1st journal entry saved | toast |
| `journal_50` | Faithful Scribe | 50th journal entry | toast-confetti |
| `journal_100` | Devoted Writer | 100th journal entry | toast-confetti |
| `first_meditate` | First Meditation | 1st meditation completed | toast |
| `meditate_25` | Mindful | 25th meditation | toast-confetti |
| `first_listen` | First Listen | 1st audio session (30s+) | toast |
| `listen_50` | Worship in Song | 50th listen session | toast-confetti |

Activity milestones are checked against running counters in `activityCounts`. Each is earned once. Note: `first_prayer`, `first_journal`, `first_meditate`, and `first_listen` overlap with the first-time badges category — they are the same badges (not duplicates).

**Full Worship Day (1 repeatable badge):**

| ID | Name | Trigger | Celebration Tier |
|----|------|---------|-----------------|
| `full_worship_day` | Full Worship Day | All 6 activities completed in a single day | special-toast |

This is the only repeatable badge. Each time all 6 activities are completed in one day, the badge's `count` increments and the celebration fires again. The `fullWorshipDays` counter in `activityCounts` tracks the total.

**First-Time Badges (6 badges):**

| ID | Name | Trigger | Celebration Tier |
|----|------|---------|-----------------|
| `first_prayer` | First Prayer | 1st prayer | toast |
| `first_journal` | First Entry | 1st journal save | toast |
| `first_meditate` | First Meditation | 1st meditation | toast |
| `first_listen` | First Listen | 1st audio 30s+ | toast |
| `first_prayerwall` | First Prayer Wall | 1st prayer wall post or reaction | toast |
| `first_friend` | First Friend | 1st friend added (mutual) | toast |

Note: `first_prayer`, `first_journal`, `first_meditate`, and `first_listen` are the same badge IDs as listed in Activity Milestones. They are not separate badges — each triggers once when the respective activity count reaches 1.

**Community Badges (4 badges):**

| ID | Name | Trigger | Celebration Tier |
|----|------|---------|-----------------|
| `first_friend` | First Friend | 1st mutual friend added | toast |
| `friends_10` | Inner Circle | 10 mutual friends | toast-confetti |
| `encourage_10` | Encourager | 10 encouragements sent | toast |
| `encourage_50` | Cheerleader | 50 encouragements sent | toast-confetti |

Community badges require data from Spec 9 (friends count) and Spec 11 (encouragements count). Until those specs are built, the badge check logic for community badges should be implemented but will not fire (friend count and encouragement count will be 0).

**Welcome Badge (1 badge):**

| ID | Name | Trigger | Celebration Tier |
|----|------|---------|-----------------|
| `welcome` | Welcome to Worship Room | Account creation (simulated login) | toast |

Awarded immediately when a user first authenticates. If `wr_badges` does not exist when the badge system initializes for an authenticated user, the Welcome badge and `level_1` badge are both awarded automatically.

**Total unique badge IDs: ~35** (exact count depends on deduplication between first-time and activity milestone categories — approximately 28 unique IDs plus the Welcome badge).

### Badge Data Model

The badge system persists to a single localStorage key: `wr_badges`.

**Structure:**
- `earned` — Map of badge ID to earned metadata (timestamp, optional count for repeatable badges)
- `newlyEarned` — Array of badge IDs that have been earned but not yet celebrated. The celebration system (Spec 8) reads this queue, shows the appropriate celebration for each badge, and clears the queue when done.
- `activityCounts` — Running counters for milestone badge triggers. Incremented on every `recordActivity()` call (not per-day like activity booleans — these are lifetime totals). Counters tracked: `pray`, `journal`, `meditate`, `listen`, `prayerWall`, `encouragementsSent`, `fullWorshipDays`.

**Initialization:** When an authenticated user loads the app and `wr_badges` does not exist in localStorage, initialize with:
- `earned`: empty object
- `newlyEarned`: empty array
- `activityCounts`: all zeros
- Then immediately award `welcome` and `level_1` badges (add to both `earned` and `newlyEarned`)

### Badge Check Logic

`checkForNewBadges()` runs inside `recordActivity()` after points, streak, and level have been updated. It receives the current state as context and returns an array of newly earned badge IDs.

**Execution flow within `recordActivity(type)`:**
1. (Existing) Update daily activity boolean
2. (Existing) Recalculate points and multiplier
3. (Existing) Update streak
4. (Existing) Detect level-up
5. **(New)** Increment `activityCounts[type]` (lifetime counter)
6. **(New)** Call `checkForNewBadges()` with current context
7. **(New)** For each returned badge ID: add to `earned` (with timestamp) and `newlyEarned`
8. **(New)** Check Full Worship Day: if all 6 activities are true for today, increment `activityCounts.fullWorshipDays` and add `full_worship_day` to `newlyEarned` (update count in `earned` if already exists)
9. **(New)** Persist `wr_badges` to localStorage

**Context passed to `checkForNewBadges()`:**
- `streak`: current streak data (currentStreak, longestStreak)
- `level`: current level number (1-6)
- `todayActivities`: today's 6 activity booleans
- `activityCounts`: lifetime activity counters (after incrementing in step 5)
- `friendCount`: number of mutual friends (from `wr_friends`, 0 until Spec 9)
- `encouragementsSent`: lifetime count (from `activityCounts`)

**Check order:**
1. Streak badges — check `currentStreak` against thresholds [7, 14, 30, 60, 90, 180, 365]
2. Level badges — check if `level_${level}` is not yet earned
3. Activity milestones — check each counter against its thresholds (1, 25, 50, 100 as applicable)
4. Full Worship Day — check if all 6 `todayActivities` are true
5. Community badges — check `friendCount` and `encouragementsSent` against thresholds

**Deduplication:** Before adding a badge to `newlyEarned`, verify it's not already in `earned` (except `full_worship_day` which is repeatable). This prevents duplicate awards across multiple `recordActivity()` calls in the same session.

### Level-Up Verses

Each faith level has an associated scripture verse (WEB translation) displayed during the full-screen level-up celebration (in Spec 8). These verses are defined as constants in this spec's badge definitions:

| Level | Name | Verse | Reference |
|-------|------|-------|-----------|
| 1 | Seedling | "For we are his workmanship, created in Christ Jesus for good works." | Ephesians 2:10 |
| 2 | Sprout | "I planted, Apollos watered, but God gave the increase." | 1 Corinthians 3:6 |
| 3 | Blooming | "The righteous shall flourish like the palm tree. He will grow like a cedar in Lebanon." | Psalm 92:12 |
| 4 | Flourishing | "But the fruit of the Spirit is love, joy, peace, patience, kindness, goodness, faith." | Galatians 5:22 |
| 5 | Oak | "He will be like a tree planted by the streams of water, that produces its fruit in its season." | Psalm 1:3 |
| 6 | Lighthouse | "You are the light of the world. A city located on a hill can't be hidden." | Matthew 5:14 |

### Celebration Tier Definitions

Each badge has an assigned celebration tier that determines how Spec 8 presents the achievement:

| Tier | Description | Used By |
|------|-------------|---------|
| `toast` | Simple toast notification (4s auto-dismiss) | First-time badges, streak 7/14/30, Welcome, community first actions |
| `toast-confetti` | Toast with CSS confetti particles (5s auto-dismiss) | Activity milestones at higher counts (50th, 100th), community milestones (10 friends, 10/50 encouragements) |
| `special-toast` | Larger toast with emphasis (5s auto-dismiss) | Full Worship Day |
| `full-screen` | Full-screen overlay with animation, verse, and Continue button | Level-up badges, streak 60/90/180/365 |

These tiers are metadata stored with each badge definition — this spec defines them, Spec 8 renders them.

---

## AI Safety Considerations

- **Crisis detection needed?**: No — this spec is a pure data/logic engine with no user-facing text input. Crisis detection is handled by features that accept user text (mood check-in, journal, prayer).
- **User input involved?**: No — all data comes from system events (activity completion, streak updates, level-ups), not user text.
- **AI-generated content?**: No — all badge names, descriptions, and verses are hardcoded constants. No AI involvement.

---

## Auth & Persistence

### Logged-out users (demo mode):
- **Zero data persistence.** Badge checking does not run for unauthenticated users because `recordActivity()` is already a no-op when not authenticated (Spec 5).
- No `wr_badges` key is created in localStorage for logged-out users.
- No cookies, no anonymous IDs, no tracking of any kind.

### Logged-in users:
- Badge data persisted to `wr_badges` in localStorage.
- `wr_badges` is created and initialized (with Welcome + Seedling badges) on first authenticated session.
- Data persists across sessions and page reloads.
- `logout()` (from AuthProvider) does NOT clear `wr_badges` — user retains all badges even after logging out and back in.
- In Phase 3, this data migrates to the backend API.

### Route type:
- No route. This is a data engine consumed by Spec 8 (celebrations/badge UI) and other downstream specs.

### Auth gating per element:

| Element | Logged-out behavior | Logged-in behavior |
|---------|--------------------|--------------------|
| `checkForNewBadges()` | Never called (parent `recordActivity()` no-ops) | Runs after every `recordActivity()` call |
| `wr_badges` initialization | Not created | Created on first authenticated session with Welcome + level_1 badges |
| `activityCounts` increment | Never incremented | Incremented on every `recordActivity()` call |
| `newlyEarned` queue | Never populated | Populated when new badges are earned; drained by Spec 8 |
| Badge data reads (for Spec 8 UI) | Returns empty/default state | Returns real earned badges and counts |

---

## Data Model Summary

### `wr_badges` (localStorage)

Single JSON object containing all badge state:

- **`earned`**: Object keyed by badge ID. Each value contains:
  - `earnedAt`: ISO 8601 timestamp string (when the badge was earned)
  - `count` (optional): Number, only present for repeatable badges (`full_worship_day`). Incremented each time the badge is re-earned.

- **`newlyEarned`**: Array of badge ID strings. Populated when badges are earned, consumed and cleared by Spec 8's celebration queue. Order matters — badges should be added in the order they were earned within a single `recordActivity()` call.

- **`activityCounts`**: Object with lifetime counters:
  - `pray`: number (total prayers generated/viewed across all time)
  - `journal`: number (total journal entries saved across all time)
  - `meditate`: number (total meditations completed across all time)
  - `listen`: number (total listen sessions 30s+ across all time)
  - `prayerWall`: number (total prayer wall posts/reactions across all time)
  - `encouragementsSent`: number (total encouragements sent across all time, populated by Spec 11)
  - `fullWorshipDays`: number (total days with all 6 activities completed)

### Default/empty state:

```
{
  earned: {},
  newlyEarned: [],
  activityCounts: {
    pray: 0,
    journal: 0,
    meditate: 0,
    listen: 0,
    prayerWall: 0,
    encouragementsSent: 0,
    fullWorshipDays: 0
  }
}
```

---

## Edge Cases

- **First authenticated session**: `wr_badges` does not exist. Initialize with defaults, then award `welcome` and `level_1` badges. Both are added to `newlyEarned` for celebration on dashboard load.
- **Corrupted localStorage**: If `wr_badges` contains invalid JSON, treat as empty/default state. Do not crash. Initialize fresh defaults. Previously earned badges are lost (acceptable for localStorage-only MVP; backend persistence in Phase 3 provides durability).
- **Duplicate badge prevention**: Before adding a badge to `earned`, check if it already exists (except `full_worship_day`). Before adding to `newlyEarned`, check if it's already in the queue (prevents duplicates from rapid `recordActivity()` calls).
- **Full Worship Day on 6th activity**: When the 6th activity of the day is recorded, `checkForNewBadges()` detects all 6 are true and awards `full_worship_day`. If the user already earned `full_worship_day` today (theoretically impossible since activities are idempotent per day), do not re-increment the count.
- **Full Worship Day tracking accuracy**: The `full_worship_day` check must run after the current activity is set to true. The context passed to `checkForNewBadges()` must reflect the updated `todayActivities`, not the pre-update state.
- **Level-up badge on initial signup**: Both `welcome` and `level_1` are awarded on first auth. The celebration system (Spec 8) processes these in order: `welcome` toast first, then `level_1` full-screen.
- **Multiple badges in one `recordActivity()` call**: A single activity could trigger multiple badges (e.g., 100th journal entry triggers `journal_100`, and if it's the 6th activity today, also triggers `full_worship_day`). All should be added to `newlyEarned` in a single pass.
- **Community badge context not yet available**: Until Specs 9 and 11 are built, `friendCount` is 0 and `encouragementsSent` is 0. Community badge checks run but never fire. This is the correct behavior — no special handling needed.
- **Activity count vs daily activity boolean**: `activityCounts` are lifetime totals that increment on every `recordActivity()` call where the daily boolean was previously false. If the daily boolean is already true (idempotent no-op), `activityCounts` should NOT increment. This ensures counts match the actual number of unique activity days, not the number of function calls.
- **Streak badge after reset and rebuild**: If a user earned `streak_7`, then their streak resets, then they rebuild to 7+ days, the badge is NOT re-awarded (it's already in `earned`). Streak badges are one-time.
- **localStorage unavailable**: If localStorage is blocked (e.g., Safari private browsing), all badge operations degrade gracefully — no crashes, no badge awards, default empty state returned.

---

## Out of Scope

- **Celebration UI (toasts, confetti, overlays, full-screen celebrations)** — Spec 8
- **Badge collection grid (earned vs locked visual display)** — Spec 8
- **Badge showcase on profile page** — Spec 14
- **Streak reset messaging ("Every day is a new beginning")** — Spec 8
- **Dashboard display of recent badges in streak card** — Spec 8
- **Friends system (friend count for community badges)** — Spec 9
- **Social interactions (encouragement count for community badges)** — Spec 11
- **Backend API persistence** — Phase 3
- **Real authentication** — Phase 3 (this spec uses simulated auth from Spec 2's AuthProvider)
- **Badge images/icons/artwork** — Spec 8 handles visual representation
- **Badge editing, deletion, or admin management** — not in MVP
- **Badge sharing to social media** — not in MVP
- **Custom/user-created badges** — not in MVP
- **Badge expiration or revocation** — not in MVP

---

## Acceptance Criteria

### Badge Definitions
- [ ] All ~35 badge definitions are declared as constants with ID, name, trigger description, and celebration tier
- [ ] 7 streak milestone badges defined with correct streak thresholds: 7, 14, 30, 60, 90, 180, 365
- [ ] 6 level-up badges defined with correct level numbers 1-6 and associated WEB translation verses
- [ ] 9 activity milestone badges defined with correct activity types and count thresholds
- [ ] 1 Full Worship Day badge defined as repeatable with `special-toast` tier
- [ ] 6 first-time badges defined (prayer, journal, meditate, listen, prayer wall, friend) — overlapping IDs with activity milestones where applicable
- [ ] 4 community badges defined (first friend, 10 friends, 10 encouragements, 50 encouragements)
- [ ] 1 Welcome badge defined with `toast` tier
- [ ] Each badge has exactly one celebration tier: `toast`, `toast-confetti`, `special-toast`, or `full-screen`

### Level-Up Verses
- [ ] Seedling verse: Ephesians 2:10 (WEB)
- [ ] Sprout verse: 1 Corinthians 3:6 (WEB)
- [ ] Blooming verse: Psalm 92:12 (WEB)
- [ ] Flourishing verse: Galatians 5:22 (WEB)
- [ ] Oak verse: Psalm 1:3 (WEB)
- [ ] Lighthouse verse: Matthew 5:14 (WEB)

### Badge Data Model (`wr_badges`)
- [ ] `earned` map stores badge ID → `{ earnedAt: ISO string, count?: number }`
- [ ] `newlyEarned` array stores badge IDs awaiting celebration
- [ ] `activityCounts` tracks 7 counters: pray, journal, meditate, listen, prayerWall, encouragementsSent, fullWorshipDays
- [ ] Default state initializes all counters to 0, earned to empty, newlyEarned to empty

### Initialization & Welcome Badge
- [ ] On first authenticated session (no `wr_badges` in localStorage), `wr_badges` is created with default state
- [ ] `welcome` badge is immediately awarded to `earned` with timestamp
- [ ] `level_1` (Seedling) badge is immediately awarded to `earned` with timestamp
- [ ] Both `welcome` and `level_1` are added to `newlyEarned` queue
- [ ] On subsequent sessions (when `wr_badges` exists), no re-initialization occurs

### `checkForNewBadges()` Logic
- [ ] Runs inside `recordActivity()` after points/streak/level update
- [ ] Receives context: streak data, level, today's activities, activity counts, friend count, encouragements sent
- [ ] Returns array of newly earned badge IDs
- [ ] Checks streak badges: awards if `currentStreak >= threshold` and badge not already earned
- [ ] Checks level badges: awards `level_${level}` if not already earned
- [ ] Checks activity milestones: awards at correct count thresholds (1, 25, 50, 100)
- [ ] Checks Full Worship Day: awards if all 6 `todayActivities` are true
- [ ] Checks community badges: awards at friend count thresholds (1, 10) and encouragement thresholds (10, 50)
- [ ] Does not award already-earned badges (except `full_worship_day`)

### Activity Count Tracking
- [ ] `activityCounts[type]` increments by 1 on each `recordActivity()` call where the daily boolean transitions from false to true
- [ ] `activityCounts` does NOT increment on idempotent (duplicate) `recordActivity()` calls
- [ ] `fullWorshipDays` increments when Full Worship Day is detected
- [ ] Counts are lifetime totals (never reset, never decrease)

### Full Worship Day (Repeatable)
- [ ] Detected when all 6 activity booleans are true for today
- [ ] `full_worship_day` in `earned` has a `count` field that increments each time
- [ ] Added to `newlyEarned` every time it's earned (not just the first time)
- [ ] `activityCounts.fullWorshipDays` increments each time
- [ ] Does not double-count within the same day (idempotent — only the 6th activity triggers it, subsequent calls are no-ops)

### Persistence & Auth
- [ ] All badge data persisted to single `wr_badges` localStorage key
- [ ] Badge checks never run for unauthenticated users (`recordActivity()` no-ops prevent this)
- [ ] No `wr_badges` key created for logged-out users
- [ ] `logout()` does NOT clear `wr_badges`
- [ ] Data persists across page reloads

### Error Handling
- [ ] Corrupted `wr_badges` (invalid JSON) treated as default empty state — no crash
- [ ] localStorage unavailable degrades gracefully — no crashes, empty defaults returned
- [ ] Missing fields in partially corrupted `wr_badges` are filled with defaults (defensive reads)

### Test Coverage
- [ ] All ~35 badge definitions exist with correct IDs, names, and celebration tiers
- [ ] Streak badges fire at exactly the right streak values (7, 14, 30, 60, 90, 180, 365)
- [ ] Streak badges do NOT fire below threshold (e.g., streak of 6 does not award `streak_7`)
- [ ] Level badges fire on level-up detection
- [ ] Level badges do NOT fire when level stays the same
- [ ] Activity milestone badges fire at correct counts (1st, 25th, 50th, 100th)
- [ ] Activity milestone badges do NOT fire below threshold
- [ ] Full Worship Day detects all 6 activities complete
- [ ] Full Worship Day does NOT fire with only 5 activities
- [ ] Full Worship Day increments count on repeat earning
- [ ] Welcome badge awarded on first authenticated initialization
- [ ] `level_1` badge awarded on first authenticated initialization
- [ ] `newlyEarned` queue populated correctly with newly awarded badges
- [ ] `newlyEarned` does not contain duplicate entries
- [ ] Repeatable badge (`full_worship_day`) increments `count` in `earned`
- [ ] Non-repeatable badges are not re-awarded
- [ ] `activityCounts` increments on new daily activity (false → true)
- [ ] `activityCounts` does NOT increment on idempotent calls (already true)
- [ ] Community badge checks pass context correctly (returns empty when friendCount is 0)
- [ ] Corrupted `wr_badges` recovery: invalid JSON → fresh defaults, no crash
- [ ] localStorage unavailable: no crash, default empty state
- [ ] Multiple badges in single `recordActivity()` call: all added to `newlyEarned`
