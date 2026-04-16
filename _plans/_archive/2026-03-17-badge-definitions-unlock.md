# Implementation Plan: Badge Definitions & Unlock Logic

**Spec:** `_specs/badge-definitions-unlock.md`
**Date:** 2026-03-17
**Branch:** `claude/feature/badge-definitions-unlock`
**Design System Reference:** `_plans/recon/design-system.md` (not relevant — no UI in this spec)
**Recon Report:** not applicable (no UI in this spec)
**Master Spec Plan:** `dashboard-growth-spec-plan-v2.md` (loaded)

---

## Architecture Context

**Project structure:**
- Constants: `frontend/src/constants/dashboard/` — existing files: `activity-points.ts`, `levels.ts`, `mood.ts`
- Services: `frontend/src/services/` — storage service layer pattern; existing `faith-points-storage.ts`, `mood-storage.ts`, `storage-service.ts`
- Hooks: `frontend/src/hooks/` — `useFaithPoints.ts` is the core gamification hook that calls `recordActivity()`
- Types: `frontend/src/types/dashboard.ts` — existing `ActivityType`, `DailyActivities`, `FaithPointsData`, `StreakData`
- Tests follow co-located `__tests__/` directory pattern (e.g., `constants/dashboard/__tests__/`, `services/__tests__/`, `hooks/__tests__/`)

**Key integration point — `useFaithPoints.recordActivity()`:**
Located at `frontend/src/hooks/useFaithPoints.ts`. This function:
1. Checks idempotency (if daily boolean already true, returns early)
2. Sets activity boolean to true
3. Recalculates daily points and multiplier
4. Updates faith points total and level
5. Updates streak
6. Persists all 3 localStorage keys
7. Updates React state

Badge integration must happen between steps 4-5 and step 6 (after points/streak/level are calculated, before persist). The badge system adds steps: increment activityCounts, call checkForNewBadges(), update earned/newlyEarned, check Full Worship Day, persist wr_badges alongside the other 3 keys.

**Critical: StreakCard `getRecentBadges()` mismatch:**
At `frontend/src/components/dashboard/StreakCard.tsx`, the existing `getRecentBadges()` reads `wr_badges.earned` as an **array** of `{ name, earnedAt }` objects. The spec requires `earned` to be an **object** keyed by badge ID with `{ earnedAt, count? }`. The corresponding test at `StreakCard.test.tsx` also uses the array format. Both must be updated to match the spec's data model.

**Auth pattern:** `useAuth()` from `@/contexts/AuthContext` (re-exported via `@/hooks/useAuth`). `isAuthenticated` boolean controls all badge gating. `recordActivity()` already no-ops for unauthenticated users.

**localStorage pattern:** Read/write functions with try/catch, defensive parsing returning defaults on corruption. See `faith-points-storage.ts` for the canonical pattern.

**Test patterns:**
- `vitest` with `describe/it/expect/beforeEach/vi`
- `localStorage.clear()` in `beforeEach`
- `vi.useFakeTimers()` and `vi.setSystemTime()` for date-dependent tests
- `renderHook` with `AuthProvider` wrapper for hook tests
- `simulateLogin()` helper that sets `wr_auth_simulated`, `wr_user_name`, `wr_user_id` in localStorage
- Factory functions like `makeActivities()` for test data
- Corrupted JSON and localStorage-unavailable error cases always tested

**Cross-spec dependencies:**
- **Consumes from Spec 5:** `recordActivity()`, `StreakData`, `FaithPointsData`, `DailyActivities`, `ActivityType`, `getActivityLog`, `getFaithPoints`, `getStreakData`, `persistAll`
- **Produces for Spec 8:** `newlyEarned` queue, badge definitions with celebration tiers, level-up verses
- **Produces for Spec 9/11:** Community badge check stubs (friend count, encouragements sent — will be 0 until those specs are built)
- **Produces for Spec 14:** Badge definitions and earned data for profile badge showcase

---

## Auth Gating Checklist

**Every action in the spec that requires login must have an auth check in the plan.**

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Badge initialization (wr_badges creation) | Only for authenticated users | Step 5 | `isAuthenticated` check in useFaithPoints before badge init |
| `checkForNewBadges()` execution | Never called for unauthenticated users | Step 3 | Parent `recordActivity()` already no-ops when `!isAuthenticated` |
| `activityCounts` increment | Never incremented for unauthenticated | Step 3 | Same — inside `recordActivity()` which no-ops |
| `wr_badges` write to localStorage | No key created for logged-out users | Step 3 | `isAuthenticated` check before any persist |
| Badge data reads (for downstream UI) | Returns empty/default state when logged out | Step 2 | `getBadgeData()` returns defaults if key missing |

---

## Design System Values (for UI steps)

Not applicable — this spec is a pure data/logic layer with no UI components. All UI is deferred to Spec 8 (Celebrations & Badge Collection UI).

---

## Design System Reminder

Not applicable — no UI steps in this spec.

---

## Shared Data Models (from Master Plan)

```typescript
// Badge data model (this spec defines and owns)
interface BadgeData {
  earned: {
    [badgeId: string]: {
      earnedAt: string;   // ISO 8601 timestamp
      count?: number;      // Only for repeatable badges (full_worship_day)
    };
  };
  newlyEarned: string[];  // Badge IDs earned but not yet celebrated
  activityCounts: {
    pray: number;
    journal: number;
    meditate: number;
    listen: number;
    prayerWall: number;
    encouragementsSent: number;
    fullWorshipDays: number;
  };
}

// Celebration tier enum (this spec defines, Spec 8 renders)
type CelebrationTier = 'toast' | 'toast-confetti' | 'special-toast' | 'full-screen';

// Badge definition (constant data)
interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  category: 'streak' | 'level' | 'activity' | 'community' | 'special';
  celebrationTier: CelebrationTier;
  repeatable?: boolean;
  verse?: { text: string; reference: string };  // Only level-up badges
}

// Consumed from Spec 5:
type ActivityType = 'mood' | 'pray' | 'listen' | 'prayerWall' | 'meditate' | 'journal';
interface StreakData { currentStreak: number; longestStreak: number; lastActiveDate: string | null; }
interface DailyActivities { mood: boolean; pray: boolean; listen: boolean; prayerWall: boolean; meditate: boolean; journal: boolean; pointsEarned: number; multiplier: number; }
```

**localStorage keys this spec touches:**
| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_badges` | Both | Primary badge data: earned, newlyEarned queue, activityCounts |
| `wr_daily_activities` | Read | Read today's activity booleans (via existing `getActivityLog`) |
| `wr_faith_points` | Read | Read current level (via existing `getFaithPoints`) |
| `wr_streak` | Read | Read current streak (via existing `getStreakData`) |
| `wr_friends` | Read | Read friend count for community badges (0 until Spec 9) |

---

## Responsive Structure

Not applicable — no UI in this spec.

---

## Vertical Rhythm

Not applicable — no UI in this spec.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] Spec 5 (Streak & Faith Points Engine) is complete and committed — `useFaithPoints.ts`, `faith-points-storage.ts`, types, constants are all built
- [x] Spec 6 (Dashboard Widgets + Activity Integration) is complete and committed — `recordActivity()` is wired into existing components
- [ ] All auth-gated actions from the spec are accounted for in the plan
- [ ] The `wr_badges` data model (object-keyed `earned`, not array) is understood — StreakCard's existing `getRecentBadges()` uses the wrong format and must be updated
- [ ] No design system reference needed (no UI steps)
- [ ] The `wr_friends` key does not exist yet (Spec 9) — community badge checks should be implemented but will return 0 friends

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Where to put badge definitions | `constants/dashboard/badges.ts` | Follows existing pattern: `activity-points.ts`, `levels.ts` in same directory |
| Where to put badge storage service | `services/badge-storage.ts` | Follows existing pattern: `faith-points-storage.ts`, `mood-storage.ts` |
| Where to put badge types | `types/dashboard.ts` (extend existing) | All dashboard types in one file per existing convention |
| `activityCounts` increment timing | Only on `false -> true` transition (idempotent) | Spec requires counts match unique activity days, not function call count |
| `full_worship_day` idempotency within same day | Handled by `recordActivity`'s existing early-return on `todayEntry[type]` already true | Prevents double-counting; only the 6th unique activity triggers it |
| `getRecentBadges()` in StreakCard | Update from array format to object format | StreakCard already reads `wr_badges` but with wrong data shape; must align with spec |
| Community badge context (`friendCount`) | Read from `wr_friends` if exists, default to 0 | Future-proof for Spec 9; community badges will silently not fire until friends exist |
| Badge check order | Streak -> Level -> Activity milestones -> Full Worship Day -> Community | Match spec's defined check order; ensures deterministic `newlyEarned` ordering |
| Where badge checks run | Inside `recordActivity()` in `useFaithPoints.ts` | Spec explicitly requires this; badges are detected in real-time as activities occur |
| `full_worship_day` check context timing | Check `todayActivities` AFTER current activity is set to true | Spec edge case: context must reflect updated state, not pre-update |

---

## Implementation Steps

### Step 1: Badge Type Definitions & Constants

**Objective:** Add TypeScript interfaces for badge data to the existing types file and create the badge constants file with all ~35 badge definitions.

**Files to create/modify:**
- `frontend/src/types/dashboard.ts` — Add `BadgeData`, `BadgeEarnedEntry`, `ActivityCounts`, `CelebrationTier`, `BadgeDefinition`, `BadgeCategory` types
- `frontend/src/constants/dashboard/badges.ts` — All badge definitions, level-up verses, streak thresholds, activity milestone thresholds
- `frontend/src/constants/dashboard/__tests__/badges.test.ts` — Tests for badge definitions

**Details:**

Add to `frontend/src/types/dashboard.ts`:
```typescript
export type CelebrationTier = 'toast' | 'toast-confetti' | 'special-toast' | 'full-screen';
export type BadgeCategory = 'streak' | 'level' | 'activity' | 'community' | 'special';

export interface BadgeEarnedEntry {
  earnedAt: string;   // ISO 8601 timestamp
  count?: number;      // Only for repeatable badges (full_worship_day)
}

export interface ActivityCounts {
  pray: number;
  journal: number;
  meditate: number;
  listen: number;
  prayerWall: number;
  encouragementsSent: number;
  fullWorshipDays: number;
}

export interface BadgeData {
  earned: Record<string, BadgeEarnedEntry>;
  newlyEarned: string[];
  activityCounts: ActivityCounts;
}

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  category: BadgeCategory;
  celebrationTier: CelebrationTier;
  repeatable?: boolean;
  verse?: { text: string; reference: string };
}
```

Create `frontend/src/constants/dashboard/badges.ts` with:
- `BADGE_DEFINITIONS: BadgeDefinition[]` — all badge definitions (~28 unique IDs)
- `BADGE_MAP: Record<string, BadgeDefinition>` — lookup by ID
- `LEVEL_UP_VERSES: Record<number, { text: string; reference: string }>` — 6 verses keyed by level number
- `STREAK_THRESHOLDS: number[]` — `[7, 14, 30, 60, 90, 180, 365]`
- `ACTIVITY_MILESTONE_THRESHOLDS` — per-activity-type threshold arrays
- `COMMUNITY_BADGE_THRESHOLDS` — friend and encouragement thresholds
- `FRESH_BADGE_DATA` constant — default empty state
- `FRESH_ACTIVITY_COUNTS` constant — all zeros

Badge definitions must include exact names and descriptions from the spec tables. All IDs must match exactly: `streak_7`, `streak_14`, ..., `streak_365`, `level_1` through `level_6`, `first_prayer`, `prayer_100`, `first_journal`, `journal_50`, `journal_100`, `first_meditate`, `meditate_25`, `first_listen`, `listen_50`, `full_worship_day`, `first_prayerwall`, `first_friend`, `friends_10`, `encourage_10`, `encourage_50`, `welcome`.

**Guardrails (DO NOT):**
- DO NOT create any UI components
- DO NOT duplicate badge IDs (first_prayer/first_journal/first_meditate/first_listen appear in both Activity Milestones and First-Time categories — they are the SAME badges, defined once)
- DO NOT hardcode celebration tier strings inline — use the `CelebrationTier` type
- DO NOT use `as const` on the `BADGE_DEFINITIONS` array itself (use `satisfies` or explicit typing for proper inference)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `all badge definitions have unique IDs` | unit | Verify no duplicate IDs in BADGE_DEFINITIONS |
| `all badge definitions have required fields` | unit | Every entry has id, name, description, category, celebrationTier |
| `streak badges: 7 definitions with correct thresholds` | unit | Match IDs streak_7 through streak_365 |
| `level badges: 6 definitions with verses` | unit | level_1 through level_6, each has verse property |
| `activity milestone badges: 9 definitions` | unit | Correct IDs and celebration tiers |
| `full_worship_day is marked repeatable` | unit | `repeatable: true` |
| `community badges: 4 definitions` | unit | Correct IDs |
| `welcome badge exists with toast tier` | unit | ID 'welcome', tier 'toast' |
| `BADGE_MAP keys match BADGE_DEFINITIONS IDs` | unit | Bidirectional consistency |
| `LEVEL_UP_VERSES has 6 entries` | unit | Keys 1-6, each with text and reference |
| `LEVEL_UP_VERSES contains correct WEB translation text` | unit | Spot-check Ephesians 2:10, Matthew 5:14 |
| `STREAK_THRESHOLDS sorted ascending` | unit | [7, 14, 30, 60, 90, 180, 365] |
| `FRESH_BADGE_DATA has correct shape` | unit | earned: {}, newlyEarned: [], activityCounts all 0 |
| `celebration tiers: streak 7/14/30 = toast, 60/90/180/365 = full-screen` | unit | Verify tier mapping |
| `celebration tiers: activity milestones at count 1 = toast, higher = toast-confetti` | unit | first_prayer=toast, prayer_100=toast-confetti |
| `total unique badge IDs count` | unit | Expect exactly 28 unique IDs |

**Expected state after completion:**
- [ ] `frontend/src/types/dashboard.ts` has all badge-related type exports
- [ ] `frontend/src/constants/dashboard/badges.ts` exports all constants
- [ ] `frontend/src/constants/dashboard/__tests__/badges.test.ts` exists with 16+ tests, all passing
- [ ] No runtime imports — all constants are statically defined

---

### Step 2: Badge Storage Service

**Objective:** Create the `badge-storage.ts` service that manages reading, writing, and initializing `wr_badges` in localStorage, following the exact patterns in `faith-points-storage.ts`.

**Files to create/modify:**
- `frontend/src/services/badge-storage.ts` — All badge localStorage operations
- `frontend/src/services/__tests__/badge-storage.test.ts` — Tests

**Details:**

Functions to implement (follow the defensive read pattern from `faith-points-storage.ts`):

1. `getBadgeData(): BadgeData` — Read and parse `wr_badges`. Return `FRESH_BADGE_DATA` on missing/corrupted data. Defensive checks: verify `earned` is an object (not array, not null), `newlyEarned` is an array, `activityCounts` is an object with all 7 numeric keys. Fill in any missing `activityCounts` fields with 0 (partial corruption recovery).

2. `saveBadgeData(data: BadgeData): boolean` — Write `wr_badges` to localStorage. Return false on failure (quota exceeded, etc.). Follow `persistAll` pattern.

3. `initializeBadgesForNewUser(): BadgeData` — Called when an authenticated user loads the app and `wr_badges` does not exist. Creates default state, awards `welcome` and `level_1` badges (adds to both `earned` and `newlyEarned`), persists, and returns the initialized data.

4. `getOrInitBadgeData(isAuthenticated: boolean): BadgeData` — Entry point: if not authenticated, return `FRESH_BADGE_DATA` (never read localStorage). If authenticated: read `wr_badges`. If missing, call `initializeBadgesForNewUser()`. If exists, return parsed data.

5. `addEarnedBadge(data: BadgeData, badgeId: string): BadgeData` — Pure function. Adds badge to `earned` (with `earnedAt: new Date().toISOString()`) and `newlyEarned`. If badge already in `earned` and NOT repeatable, skip. If `full_worship_day`: increment `count` in `earned` entry (create if first time), always add to `newlyEarned`.

6. `incrementActivityCount(data: BadgeData, type: ActivityType): BadgeData` — Pure function. Maps `ActivityType` to `activityCounts` key (note: `ActivityType` has `mood` which does NOT have an activityCount — only `pray`, `journal`, `meditate`, `listen`, `prayerWall` map; `mood` has no milestone badges). Returns new `BadgeData` with incremented count.

7. `clearNewlyEarned(data: BadgeData): BadgeData` — Pure function used by Spec 8 to drain the celebration queue.

8. `getFriendCount(): number` — Read `wr_friends` if it exists, count mutual friends. Returns 0 until Spec 9 is built. Defensive read with try/catch.

The service must map `ActivityType` to `activityCounts` keys:
- `pray` -> `activityCounts.pray`
- `journal` -> `activityCounts.journal`
- `meditate` -> `activityCounts.meditate`
- `listen` -> `activityCounts.listen`
- `prayerWall` -> `activityCounts.prayerWall`
- `mood` -> no counter (mood has no milestone badges)

**Guardrails (DO NOT):**
- DO NOT create `wr_badges` for unauthenticated users
- DO NOT mutate the `data` parameter in pure functions — always return new objects
- DO NOT use `dangerouslySetInnerHTML` or any HTML rendering (this is a data service)
- DO NOT throw on corrupted data — always return safe defaults
- DO NOT log PII (no user IDs, no names)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `getBadgeData returns FRESH_BADGE_DATA when key missing` | unit | No wr_badges -> defaults |
| `getBadgeData returns FRESH_BADGE_DATA for corrupted JSON` | unit | Invalid JSON -> defaults |
| `getBadgeData returns FRESH_BADGE_DATA for non-object earned` | unit | earned as array -> defaults |
| `getBadgeData fills missing activityCounts fields with 0` | unit | Partial corruption recovery |
| `getBadgeData returns valid parsed data` | unit | Correct round-trip |
| `saveBadgeData writes to localStorage` | unit | Verify JSON.parse of stored value |
| `saveBadgeData returns false on quota exceeded` | unit | Mock setItem to throw |
| `initializeBadgesForNewUser awards welcome and level_1` | unit | Both in earned and newlyEarned |
| `initializeBadgesForNewUser persists to localStorage` | unit | wr_badges key exists after call |
| `getOrInitBadgeData returns defaults for unauthenticated` | unit | No localStorage read |
| `getOrInitBadgeData initializes on first auth` | unit | Missing key -> init with welcome badges |
| `getOrInitBadgeData returns existing data on subsequent auth` | unit | Existing key -> no re-init |
| `addEarnedBadge adds new badge to earned and newlyEarned` | unit | Verify both maps updated |
| `addEarnedBadge skips already-earned non-repeatable badge` | unit | No duplicate in earned or newlyEarned |
| `addEarnedBadge increments count for full_worship_day` | unit | count goes from 1->2, added to newlyEarned again |
| `addEarnedBadge creates full_worship_day with count 1 on first earn` | unit | New entry with count: 1 |
| `addEarnedBadge does not add duplicate to newlyEarned` | unit | Same badge ID not duplicated in queue |
| `incrementActivityCount increments correct counter` | unit | pray -> activityCounts.pray |
| `incrementActivityCount returns same data for mood type` | unit | mood has no counter |
| `clearNewlyEarned empties the array` | unit | newlyEarned becomes [] |
| `getFriendCount returns 0 when wr_friends missing` | unit | No crash, returns 0 |
| `localStorage unavailable: no crash, returns defaults` | unit | Mock getItem to throw SecurityError |

**Expected state after completion:**
- [ ] `frontend/src/services/badge-storage.ts` exports all 8 functions
- [ ] `frontend/src/services/__tests__/badge-storage.test.ts` exists with 22+ tests, all passing
- [ ] All functions are pure (except `saveBadgeData` and `initializeBadgesForNewUser` which have side effects)
- [ ] No dependency on any React component or hook

---

### Step 3: Badge Check Logic & recordActivity Integration

**Objective:** Implement `checkForNewBadges()` and integrate it into `useFaithPoints.recordActivity()`. This is the core engine step — the most critical and complex part of the spec.

**Files to create/modify:**
- `frontend/src/services/badge-engine.ts` — `checkForNewBadges()` pure function
- `frontend/src/services/__tests__/badge-engine.test.ts` — Tests for badge engine
- `frontend/src/hooks/useFaithPoints.ts` — Integrate badge checking into `recordActivity()`
- `frontend/src/hooks/__tests__/useFaithPoints.test.ts` — Additional badge integration tests

**Details:**

**Create `badge-engine.ts`:**

```typescript
interface BadgeCheckContext {
  streak: StreakData;
  level: number;
  previousLevel: number;  // Level BEFORE this activity was recorded
  todayActivities: DailyActivities;  // AFTER current activity set to true
  activityCounts: ActivityCounts;  // AFTER incrementing current activity
  friendCount: number;
  allActivitiesWereTrueBefore: boolean;  // Were all 6 true BEFORE this call?
}

function checkForNewBadges(context: BadgeCheckContext, earned: Record<string, BadgeEarnedEntry>): string[]
```

Check order (per spec):
1. **Streak badges:** For each threshold in `STREAK_THRESHOLDS`, if `context.streak.currentStreak >= threshold` and `streak_${threshold}` not in `earned`, push to result.
2. **Level badges:** If `level_${context.level}` not in `earned`, push. This fires on level-up (new level) AND on initialization if level_1 wasn't awarded yet.
3. **Activity milestones:** Check `activityCounts.pray` against thresholds [1, 100], `activityCounts.journal` against [1, 50, 100], `activityCounts.meditate` against [1, 25], `activityCounts.listen` against [1, 50], `activityCounts.prayerWall` against [1]. Map each threshold to the corresponding badge ID. Only push if not in `earned`.
4. **Full Worship Day:** Check if ALL 6 activity booleans in `todayActivities` are true AND `allActivitiesWereTrueBefore` is false (idempotency — only fire on the 6th activity that completes the day, not on subsequent calls). Push `full_worship_day` (repeatable, so no earned check needed — but the `allActivitiesWereTrueBefore` flag handles same-day idempotency).
5. **Community badges:** Check `friendCount` against [1, 10] for `first_friend`/`friends_10`. Check `activityCounts.encouragementsSent` against [10, 50] for `encourage_10`/`encourage_50`. Only push if not in `earned`.

The function returns an array of badge IDs that were newly earned. It is a pure function — no side effects.

**Modify `useFaithPoints.ts` `recordActivity()`:**

Insert badge logic after the existing streak update and before persist:

```typescript
// --- NEW: Badge integration ---
// 1. Get current badge data
const badgeData = getOrInitBadgeData(true);

// 2. Determine if all activities were true BEFORE this activity was set
// Since recordActivity returns early if todayEntry[type] is already true,
// by this point the current type was previously false and is now true.
// So check: were all OTHER 5 activities already true?
const allActivitiesWereTrueBefore = ALL_ACTIVITY_TYPES
  .filter(t => t !== type)
  .every(t => todayEntry[t]);

// 3. Increment activity count (only for types with counters)
let updatedBadgeData = incrementActivityCount(badgeData, type);

// 4. Check for new badges
const newBadgeIds = checkForNewBadges({
  streak: newStreak,
  level: levelInfo.level,
  previousLevel: currentFaithPoints.currentLevel,
  todayActivities: todayEntry,  // Already has the current activity set to true
  activityCounts: updatedBadgeData.activityCounts,
  friendCount: getFriendCount(),
  allActivitiesWereTrueBefore,
}, updatedBadgeData.earned);

// 5. Award each new badge
for (const badgeId of newBadgeIds) {
  updatedBadgeData = addEarnedBadge(updatedBadgeData, badgeId);
}

// 6. Handle Full Worship Day counter
if (newBadgeIds.includes('full_worship_day')) {
  updatedBadgeData = {
    ...updatedBadgeData,
    activityCounts: {
      ...updatedBadgeData.activityCounts,
      fullWorshipDays: updatedBadgeData.activityCounts.fullWorshipDays + 1,
    },
  };
}

// 7. Persist badge data alongside existing persist
saveBadgeData(updatedBadgeData);
```

**Important: `allActivitiesWereTrueBefore` logic:**
Since `recordActivity` already checks idempotency at the top (returns early if `todayEntry[type]` is already true), by the time we reach badge checking, the current `type` was previously `false` and is now `true`. So `allActivitiesWereTrueBefore` should check: were all OTHER 5 activities already true? If yes, then this is the 6th activity completing the day.

**Guardrails (DO NOT):**
- DO NOT mutate any parameters in `checkForNewBadges` — it is pure
- DO NOT call `checkForNewBadges` outside of `recordActivity` — the spec requires it runs inside `recordActivity`
- DO NOT increment `activityCounts` on idempotent calls (the existing idempotency early-return handles this)
- DO NOT add `mood` to `activityCounts` — mood has no milestone badges
- DO NOT persist badge data separately from the existing persist flow — keep them together

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `checkForNewBadges: streak_7 fires at streak 7` | unit | currentStreak: 7 -> returns ['streak_7'] |
| `checkForNewBadges: streak_7 does NOT fire at streak 6` | unit | currentStreak: 6 -> empty |
| `checkForNewBadges: multiple streak badges fire at streak 30` | unit | Returns streak_7, streak_14, streak_30 if none earned |
| `checkForNewBadges: already-earned streak badge not returned` | unit | streak_7 in earned -> not in result |
| `checkForNewBadges: level badge fires on level-up` | unit | level: 2, level_2 not earned -> returns ['level_2'] |
| `checkForNewBadges: level badge does NOT fire if already earned` | unit | level_2 in earned -> not in result |
| `checkForNewBadges: first_prayer at count 1` | unit | pray count: 1 -> returns ['first_prayer'] |
| `checkForNewBadges: prayer_100 at count 100` | unit | pray count: 100 -> returns ['prayer_100'] |
| `checkForNewBadges: prayer_100 NOT at count 99` | unit | pray count: 99 -> no prayer_100 |
| `checkForNewBadges: journal milestones at 1, 50, 100` | unit | Test each threshold |
| `checkForNewBadges: meditate milestones at 1, 25` | unit | Test each threshold |
| `checkForNewBadges: listen milestones at 1, 50` | unit | Test each threshold |
| `checkForNewBadges: full_worship_day when all 6 true` | unit | All true -> returns ['full_worship_day'] |
| `checkForNewBadges: full_worship_day NOT when only 5 true` | unit | One false -> no full_worship_day |
| `checkForNewBadges: full_worship_day NOT when allActivitiesWereTrueBefore` | unit | Idempotency guard |
| `checkForNewBadges: community badges at friend thresholds` | unit | friendCount: 1 -> first_friend; 10 -> friends_10 |
| `checkForNewBadges: community badges at encouragement thresholds` | unit | encouragementsSent: 10 -> encourage_10 |
| `checkForNewBadges: multiple badges in single call` | unit | 100th journal + full worship day in same call |
| `checkForNewBadges: community badges return empty when counts are 0` | unit | Default state |
| `recordActivity integrates badge checking` | integration | recordActivity('pray') with useFaithPoints -> wr_badges updated |
| `recordActivity awards first_prayer on first pray activity` | integration | wr_badges.earned has first_prayer |
| `recordActivity increments activityCounts.pray` | integration | Verify counter goes from 0 to 1 |
| `recordActivity does NOT increment activityCounts on idempotent call` | integration | Second pray call -> count stays 1 |
| `recordActivity awards full_worship_day on 6th activity` | integration | Complete all 6 -> full_worship_day earned |
| `recordActivity full_worship_day count increments on next day` | integration | Two different days with all 6 -> count: 2 |
| `recordActivity awards streak_7 at streak day 7` | integration | Simulate 7 consecutive days |
| `recordActivity awards level badge on level-up` | integration | Cross 100pt threshold -> level_2 badge |
| `recordActivity creates wr_badges on first call for new auth user` | integration | welcome + level_1 awarded |
| `recordActivity badge data persists across page reload` | integration | Unmount/remount -> badges still in localStorage |

**Expected state after completion:**
- [ ] `frontend/src/services/badge-engine.ts` exports `checkForNewBadges` pure function
- [ ] `frontend/src/services/__tests__/badge-engine.test.ts` has 19+ unit tests, all passing
- [ ] `frontend/src/hooks/useFaithPoints.ts` calls badge logic inside `recordActivity`
- [ ] `frontend/src/hooks/__tests__/useFaithPoints.test.ts` has additional badge integration tests (10+ new tests)
- [ ] All existing `useFaithPoints` tests still pass (no regressions)
- [ ] `wr_badges` is populated after first `recordActivity` call for authenticated user

---

### Step 4: Update StreakCard's getRecentBadges

**Objective:** Fix the StreakCard's `getRecentBadges()` function to read badges from the new object-keyed `earned` format instead of the array format it currently uses. Update corresponding tests.

**Files to create/modify:**
- `frontend/src/components/dashboard/StreakCard.tsx` — Update `getRecentBadges()` function
- `frontend/src/components/dashboard/__tests__/StreakCard.test.tsx` — Update test data format

**Details:**

Current `getRecentBadges()` in `StreakCard.tsx` reads `earned` as an array:
```typescript
const earned = data?.earned ?? []
if (!Array.isArray(earned) || earned.length === 0) return []
```

Must change to read `earned` as an object and look up badge names from `BADGE_MAP`:
```typescript
import { BADGE_MAP } from '@/constants/dashboard/badges';

function getRecentBadges(): { name: string; earnedAt: string }[] {
  try {
    const raw = localStorage.getItem('wr_badges');
    if (!raw) return [];
    const data = JSON.parse(raw);
    const earned = data?.earned;
    if (!earned || typeof earned !== 'object' || Array.isArray(earned)) return [];

    return Object.entries(earned)
      .filter(([, entry]: [string, any]) => entry?.earnedAt)
      .map(([id, entry]: [string, any]) => ({
        name: BADGE_MAP[id]?.name ?? id,
        earnedAt: entry.earnedAt,
      }))
      .sort((a, b) => new Date(b.earnedAt).getTime() - new Date(a.earnedAt).getTime())
      .slice(0, 3);
  } catch {
    return [];
  }
}
```

Update test at `StreakCard.test.tsx` to use object-keyed format:
```typescript
localStorage.setItem(
  'wr_badges',
  JSON.stringify({
    earned: {
      welcome: { earnedAt: '2026-03-15T10:00:00Z' },
      first_prayer: { earnedAt: '2026-03-14T10:00:00Z' },
      streak_7: { earnedAt: '2026-03-13T10:00:00Z' },
      streak_14: { earnedAt: '2026-03-01T10:00:00Z' },
    },
    newlyEarned: [],
    activityCounts: { pray: 0, journal: 0, meditate: 0, listen: 0, prayerWall: 0, encouragementsSent: 0, fullWorshipDays: 0 },
  }),
);
```

**Guardrails (DO NOT):**
- DO NOT change the StreakCard's visual layout or props interface
- DO NOT remove the defensive try/catch
- DO NOT add any badge UI beyond the existing 3-initial circles (that is Spec 8's job)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `recent badges render from localStorage (object format)` | unit | Updated test with object-keyed earned |
| `no badges area when wr_badges is empty or absent` | unit | Existing test, should still pass |
| `corrupted wr_badges shows no badges` | unit | Invalid JSON -> no crash |
| `badge names resolved from BADGE_MAP` | unit | Verify title attribute matches definition name |

**Expected state after completion:**
- [ ] StreakCard reads `wr_badges.earned` as an object
- [ ] StreakCard uses `BADGE_MAP` to resolve badge names
- [ ] All existing StreakCard tests updated and passing
- [ ] No visual regressions in the StreakCard display

---

### Step 5: Badge Initialization on Dashboard Load

**Objective:** Ensure `wr_badges` is initialized (with `welcome` and `level_1` badges) when an authenticated user first loads the dashboard and no badge data exists yet. Expose `newlyEarnedBadges` from the hook for Spec 8.

**Files to create/modify:**
- `frontend/src/hooks/useFaithPoints.ts` — Add badge initialization to `loadState()` and expose `newlyEarnedBadges`
- `frontend/src/hooks/__tests__/useFaithPoints.test.ts` — Badge initialization tests

**Details:**

In `useFaithPoints.ts`, the `loadState()` function runs on hook initialization for authenticated users. Add badge initialization here:

```typescript
function loadState(): FaithPointsState {
  // ... existing code ...

  // Initialize badges if needed (first authenticated session)
  getOrInitBadgeData(true);

  // ... rest of existing code ...
}
```

The `getOrInitBadgeData(true)` call (from Step 2) handles the logic:
- If `wr_badges` exists, it reads and returns it (no-op)
- If `wr_badges` does not exist, it creates it with defaults and awards `welcome` + `level_1` badges

Additionally, the `useFaithPoints` hook needs to expose `newlyEarnedBadges` for Spec 8 to consume:

Update `FaithPointsState` interface:
```typescript
interface FaithPointsState {
  // ... existing fields ...
  newlyEarnedBadges: string[];  // Badge IDs waiting for celebration
}
```

Add `newlyEarnedBadges` to `DEFAULT_STATE` (empty array) and to `loadState()` return value (read from `wr_badges.newlyEarned`).

After `recordActivity` awards badges (Step 3), update React state to include the new `newlyEarnedBadges` array.

Add a `clearNewlyEarnedBadges()` function to the hook's return value — Spec 8 calls this after processing celebrations.

**Guardrails (DO NOT):**
- DO NOT re-initialize badges on every `loadState()` call — `getOrInitBadgeData` handles the "already exists" case
- DO NOT trigger badge celebrations in this spec — that is Spec 8
- DO NOT modify `logout()` in AuthContext — spec requires `wr_badges` to persist across logout

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `first authenticated session initializes wr_badges` | integration | Login -> hook mounts -> wr_badges created |
| `welcome and level_1 in newlyEarnedBadges on first session` | integration | Both badge IDs present |
| `subsequent sessions do not re-initialize` | integration | Second mount -> newlyEarned not duplicated |
| `clearNewlyEarnedBadges empties the array` | integration | Call clear -> newlyEarnedBadges becomes [] |
| `newlyEarnedBadges updated after recordActivity awards badge` | integration | recordActivity('pray') -> first_prayer in newlyEarnedBadges |
| `unauthenticated user: newlyEarnedBadges is empty` | unit | Default state |
| `logout preserves wr_badges` | integration | logout() -> wr_badges still in localStorage |

**Expected state after completion:**
- [ ] `useFaithPoints` hook returns `newlyEarnedBadges` and `clearNewlyEarnedBadges`
- [ ] First authenticated session creates `wr_badges` with welcome + level_1 badges
- [ ] All existing `useFaithPoints` tests pass
- [ ] New badge initialization tests pass

---

### Step 6: Full Integration Test Suite

**Objective:** Create a comprehensive integration test file that validates the entire badge lifecycle: initialization, activity recording, badge earning, Full Worship Day, streak milestones, level-up badges, and persistence.

**Files to create/modify:**
- `frontend/src/__tests__/badge-integration.test.ts` — End-to-end badge lifecycle tests

**Details:**

Follow the pattern in `frontend/src/__tests__/faith-points-integration.test.ts`. Use `renderHook` with `AuthProvider` wrapper, `vi.useFakeTimers()`, and `simulateLogin()`.

Test scenarios:
1. **Welcome flow:** Login -> hook init -> welcome + level_1 in earned + newlyEarned
2. **First activity flow:** recordActivity('pray') -> first_prayer earned, activityCounts.pray = 1
3. **Multiple first activities:** Record all 6 types -> first_prayer, first_journal, first_meditate, first_listen all earned, plus full_worship_day
4. **Activity count precision:** Record pray 100 times across 100 days -> prayer_100 badge earned on exactly the 100th
5. **Streak milestone flow:** Simulate 7 consecutive days -> streak_7 earned on day 7, not day 6
6. **Level-up badge flow:** Start at 95 points, recordActivity('pray') -> 105 points, level 2, level_2 badge earned
7. **Full Worship Day repeatable:** Day 1 all 6 -> count 1; Day 2 all 6 -> count 2
8. **Full Worship Day idempotency:** Complete all 6, then reload and try recordActivity again -> no duplicate full_worship_day
9. **Multiple badges single call:** 100th prayer that also completes all 6 activities -> both badges in newlyEarned
10. **Corrupted data recovery:** Set wr_badges to invalid JSON, trigger recordActivity -> recovers gracefully, fresh defaults
11. **localStorage unavailable:** Mock Storage to throw -> no crash, default state
12. **Badge persistence across reload:** Earn badges, unmount, remount -> badges still in localStorage and loaded correctly
13. **Community badges with 0 friends:** Community checks run but return no badges

**Guardrails (DO NOT):**
- DO NOT mock badge storage functions — test the real storage flow
- DO NOT skip the AuthProvider wrapper — auth gating is critical
- DO NOT test UI rendering here — this is logic-only

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `welcome flow: init badges on first auth` | integration | Full lifecycle |
| `first prayer badge on first pray activity` | integration | Badge + count + newlyEarned |
| `full worship day on completing all 6 activities` | integration | All 6 -> badge + count |
| `full worship day repeatable across days` | integration | Day 1 + Day 2 -> count: 2 |
| `streak_7 on day 7, not day 6` | integration | Simulate daily activities |
| `level_2 badge on crossing 100 points` | integration | 95 + 10 -> level_2 |
| `prayer_100 on exactly 100th prayer` | integration | 99 prays -> no badge; 100th -> badge |
| `multiple badges in single recordActivity call` | integration | Simultaneous triggers |
| `corrupted wr_badges recovery` | integration | Invalid JSON -> fresh start |
| `localStorage unavailable graceful degradation` | integration | No crash |
| `badge persistence across hook remount` | integration | Unmount/remount -> data intact |
| `community badges return empty with 0 friends` | integration | No false positive |
| `activityCounts not incremented on idempotent call` | integration | Same activity twice -> count still 1 |

**Expected state after completion:**
- [ ] `frontend/src/__tests__/badge-integration.test.ts` has 13+ tests, all passing
- [ ] Full badge lifecycle validated from init through multi-day earning
- [ ] All edge cases from spec covered (corrupted data, localStorage unavailable, idempotency)
- [ ] Total test count for this spec: ~75+ tests across all test files

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Badge type definitions and constants (no runtime dependencies) |
| 2 | 1 | Badge storage service (needs types and constants from Step 1) |
| 3 | 1, 2 | Badge check logic + recordActivity integration (needs storage service and constants) |
| 4 | 1, 2 | StreakCard update (needs BADGE_MAP from constants and new data format from storage) |
| 5 | 2, 3 | Badge initialization on dashboard load (needs storage service and integrated recordActivity) |
| 6 | 1, 2, 3, 4, 5 | Full integration tests (validates entire system) |

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Badge Type Definitions & Constants | [COMPLETE] | 2026-03-17 | Added badge types to `types/dashboard.ts`, created `constants/dashboard/badges.ts` (29 unique badge IDs — 7 streak + 6 level + 9 activity + 1 full_worship_day + 5 community/first-time + 1 welcome). 18 tests passing. |
| 2 | Badge Storage Service | [COMPLETE] | 2026-03-17 | Created `services/badge-storage.ts` with 8 functions. 24 tests passing. |
| 3 | Badge Check Logic & recordActivity Integration | [COMPLETE] | 2026-03-17 | Created `services/badge-engine.ts` (19 tests), integrated badge checking into `useFaithPoints.recordActivity()` (10 new integration tests). Fixed plan's `allActivitiesWereTrueBefore` logic — always false due to idempotency guard. Removed unused `ALL_ACTIVITY_TYPES` import. Total: 80 tests passing. |
| 4 | Update StreakCard's getRecentBadges | [COMPLETE] | 2026-03-17 | Updated `getRecentBadges()` to read object-keyed `earned` format, resolve names from `BADGE_MAP`. Added 2 new tests (badge name resolution, corrupted data). 16 tests passing. |
| 5 | Badge Initialization on Dashboard Load | [COMPLETE] | 2026-03-17 | Badge init was already added in Step 3 (loadState calls getOrInitBadgeData). Added 7 new tests: initialization, newlyEarnedBadges, clearNewlyEarnedBadges, auth gating, logout preservation. 34 total useFaithPoints tests passing. |
| 6 | Full Integration Test Suite | [COMPLETE] | 2026-03-17 | Created `__tests__/badge-integration.test.ts` with 13 tests. Fixed `getOrInitBadgeData` to reinitialize on corrupted data. 134 badge tests passing, 1384 total tests passing (0 regressions). |
