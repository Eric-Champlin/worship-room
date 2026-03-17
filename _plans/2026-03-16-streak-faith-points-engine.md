# Implementation Plan: Streak & Faith Points Engine

**Spec:** `_specs/streak-faith-points-engine.md`
**Date:** 2026-03-16
**Branch:** `claude/feature/streak-faith-points-engine`
**Design System Reference:** `_plans/recon/design-system.md` (loaded — not needed; this spec has no UI)
**Recon Report:** not applicable (no UI)
**Master Spec Plan:** `dashboard-growth-spec-plan-v2.md` (loaded)

---

## Architecture Context

### Project Structure (relevant files)

```
frontend/src/
├── types/dashboard.ts              — MoodEntry, MoodValue, MoodLabel (extend with new types)
├── utils/date.ts                   — getLocalDateString(), getYesterdayDateString() (consumed)
├── services/mood-storage.ts        — getMoodEntries(), hasCheckedInToday() (pattern reference)
├── contexts/AuthContext.tsx         — AuthProvider, useAuth() (consumed for auth gating)
├── components/audio/AudioProvider.tsx — AudioProvider with enhancedDispatch (modify for listen timer)
├── hooks/useAuth.ts                — Re-exports AuthContext (consumed)
├── hooks/useMoodChartData.ts       — Pattern reference for localStorage-backed hooks
├── constants/dashboard/mood.ts     — Pattern reference for constants files
├── pages/Dashboard.tsx             — Dashboard shell (consumes useFaithPoints in Spec 6)
├── components/dashboard/DashboardHero.tsx — Placeholder streak/level display (Spec 6 wires in)
```

### Patterns to Follow

- **Storage pattern**: Follow `mood-storage.ts` — standalone functions with try/catch for JSON parse, return defaults on error. Separate `STORAGE_KEY` constant per file.
- **Hook pattern**: Follow `useMoodChartData.ts` — `useMemo`/`useCallback` with raw JSON string in dependency array to trigger recalculation.
- **Auth pattern**: Import `useAuth()` from `@/contexts/AuthContext`. Check `isAuthenticated` at the top of `recordActivity()`.
- **Type pattern**: Add to existing `types/dashboard.ts` for shared types.
- **Constant pattern**: Create new files in `constants/dashboard/` — `activity-points.ts` and `levels.ts`.
- **Test pattern**: Follow `mood-storage.test.ts` — `vi.useFakeTimers()` + `vi.setSystemTime()` for date-dependent tests, `localStorage.clear()` in `beforeEach`, factory functions for test data.

### Provider Nesting (relevant for listen timer)

```tsx
<AuthProvider>           ← useAuth() available from here down
  <ToastProvider>
    <AuthModalProvider>
      <AudioProvider>    ← Listen timer hooks into isPlaying state here
        <Routes />
      </AudioProvider>
    </AuthModalProvider>
  </ToastProvider>
</AuthProvider>
```

**Important**: `AudioProvider` is nested inside `AuthProvider`, so the listen timer hook can access `useAuth()`.

### Cross-Spec Dependencies

- **Spec 1 (complete)**: Writes `wr_mood_entries` — this spec reads it for mood activity detection
- **Spec 6 (future)**: Calls `recordActivity()` from existing components, builds dashboard widgets
- **Spec 7 (future)**: Calls `checkForNewBadges()` inside `recordActivity()`
- **Spec 8 (future)**: Consumes level-up events for celebrations

---

## Auth Gating Checklist

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| `recordActivity()` call | No-op when not authenticated | Step 3 | `useAuth().isAuthenticated` check at top of function |
| `useFaithPoints()` return values | Return defaults when not authenticated | Step 3 | Check `isAuthenticated`, return zero/default state |
| Listen 30-second timer | Does not trigger `recordActivity` for logged-out users | Step 4 | `recordActivity` no-ops internally; timer can run harmlessly |
| localStorage writes | Zero writes for logged-out users | Step 3 | Write operations gated behind `isAuthenticated` check |

---

## Design System Values (for UI steps)

Not applicable — this spec is a pure data engine with no UI components.

---

## Design System Reminder

Not applicable — no UI steps.

---

## Shared Data Models (from Master Plan)

```typescript
// ActivityType — the 6 trackable activities
export type ActivityType = 'mood' | 'pray' | 'listen' | 'prayerWall' | 'meditate' | 'journal';

// Daily activity record for a single day
export interface DailyActivities {
  mood: boolean;
  pray: boolean;
  listen: boolean;
  prayerWall: boolean;
  meditate: boolean;
  journal: boolean;
  pointsEarned: number;
  multiplier: number;
}

// Full daily activity log — keyed by YYYY-MM-DD date string
export interface DailyActivityLog {
  [date: string]: DailyActivities;
}

// Lifetime faith points state
export interface FaithPointsData {
  totalPoints: number;
  currentLevel: number;       // 1-6
  currentLevelName: string;
  pointsToNextLevel: number;  // 0 at max level
  lastUpdated: string;        // ISO date string
}

// Streak state
export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;  // YYYY-MM-DD or null if never active
}
```

**localStorage keys this spec owns:**

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_daily_activities` | Both | JSON object keyed by date, each date has 6 activity booleans + cached points/multiplier |
| `wr_faith_points` | Both | Lifetime totals: totalPoints, currentLevel, currentLevelName, pointsToNextLevel, lastUpdated |
| `wr_streak` | Both | currentStreak, longestStreak, lastActiveDate |
| `wr_mood_entries` | Read only | Reads to detect mood activity for today (owned by Spec 1) |

---

## Responsive Structure

Not applicable — no UI. All output is React state consumed by downstream specs.

---

## Vertical Rhythm

Not applicable — no UI.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] Spec 1 (Mood Check-In) is complete — `wr_mood_entries`, `utils/date.ts`, `services/mood-storage.ts` exist
- [x] Spec 2 (Dashboard Shell) is complete — `AuthProvider`, `useAuth()`, Dashboard page exist
- [x] `getLocalDateString()` and `getYesterdayDateString()` are available in `utils/date.ts`
- [x] `AuthContext.tsx` exposes `{ isAuthenticated, user }` via `useAuth()`
- [x] `AudioProvider.tsx` exposes `isPlaying` via `useAudioState()` and has `enhancedDispatch`
- [x] All auth-gated actions from the spec are accounted for in the plan
- [ ] No [UNVERIFIED] values (this spec has no UI — all values are deterministic)

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Mood activity detection | Read `wr_mood_entries` on hook init + allow explicit `recordActivity('mood')` | Both approaches valid per spec; reading mood entries ensures mood is captured even if Spec 6 integration hasn't wired `recordActivity('mood')` yet |
| Listen timer location | Separate `useListenTracker` hook rendered as a child component inside `AudioProvider` | Keeps AudioProvider clean; hook can access both audio state and auth context |
| Level-up event exposure | Return `lastLevelUp` from `useFaithPoints()` containing `{ oldLevel, newLevel }` or `null` | Spec 8 needs this for celebration triggers; simplest interface |
| Atomic writes | Write all 3 localStorage keys in sequence inside try/catch; on error, don't update React state | True atomicity is impossible with localStorage; if one write fails, stale React state is better than partial localStorage state |
| Point recalculation on multiplier change | Recalculate full day's points from scratch, diff against cached `pointsEarned` | Ensures accuracy when multiplier tier changes retroactively affect earlier activities |
| Listen timer — cumulative vs continuous | Continuous (reset on pause) per spec | Spec is explicit: "not cumulative — it must be 30 continuous seconds" |
| `useFaithPoints` as hook vs context | Plain hook (not a context provider) | Spec says "React hook" — no need for a provider since each consumer can independently read from localStorage. Context would be premature abstraction. |

---

## Implementation Steps

### Step 1: Types & Constants

**Objective:** Define the shared TypeScript types and constant definitions for the faith points engine.

**Files to create/modify:**
- `frontend/src/types/dashboard.ts` — Add `ActivityType`, `DailyActivities`, `DailyActivityLog`, `FaithPointsData`, `StreakData`
- `frontend/src/constants/dashboard/activity-points.ts` — Activity point values, multiplier tiers, `ActivityType` type, `ACTIVITY_DISPLAY_NAMES`
- `frontend/src/constants/dashboard/levels.ts` — Level thresholds array, `getLevelForPoints()` utility

**Details:**

Add to `types/dashboard.ts`:
```typescript
export type ActivityType = 'mood' | 'pray' | 'listen' | 'prayerWall' | 'meditate' | 'journal';

export interface DailyActivities {
  mood: boolean;
  pray: boolean;
  listen: boolean;
  prayerWall: boolean;
  meditate: boolean;
  journal: boolean;
  pointsEarned: number;
  multiplier: number;
}

export interface DailyActivityLog {
  [date: string]: DailyActivities;
}

export interface FaithPointsData {
  totalPoints: number;
  currentLevel: number;
  currentLevelName: string;
  pointsToNextLevel: number;
  lastUpdated: string;
}

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
}
```

Create `constants/dashboard/activity-points.ts`:
```typescript
import type { ActivityType } from '@/types/dashboard';

export const ACTIVITY_POINTS: Record<ActivityType, number> = {
  mood: 5,
  pray: 10,
  listen: 10,
  prayerWall: 15,
  meditate: 20,
  journal: 25,
} as const;

export const ACTIVITY_DISPLAY_NAMES: Record<ActivityType, string> = {
  mood: 'Logged mood',
  pray: 'Prayed',
  listen: 'Listened',
  prayerWall: 'Prayer Wall',
  meditate: 'Meditated',
  journal: 'Journaled',
} as const;

export const MULTIPLIER_TIERS = [
  { minActivities: 6, multiplier: 2,    label: 'Full Worship Day' },
  { minActivities: 4, multiplier: 1.5,  label: 'Devoted' },
  { minActivities: 2, multiplier: 1.25, label: 'Growing' },
  { minActivities: 0, multiplier: 1,    label: '' },
] as const;

export const MAX_DAILY_BASE_POINTS = 85;  // 5+10+10+15+20+25
export const MAX_DAILY_POINTS = 170;       // 85 × 2x

export const ALL_ACTIVITY_TYPES: ActivityType[] = [
  'mood', 'pray', 'listen', 'prayerWall', 'meditate', 'journal',
];
```

Create `constants/dashboard/levels.ts`:
```typescript
export interface LevelDefinition {
  level: number;
  name: string;
  threshold: number;
}

export const LEVEL_THRESHOLDS: LevelDefinition[] = [
  { level: 1, name: 'Seedling',     threshold: 0 },
  { level: 2, name: 'Sprout',       threshold: 100 },
  { level: 3, name: 'Blooming',     threshold: 500 },
  { level: 4, name: 'Flourishing',  threshold: 1500 },
  { level: 5, name: 'Oak',          threshold: 4000 },
  { level: 6, name: 'Lighthouse',   threshold: 10000 },
];

export function getLevelForPoints(points: number): {
  level: number;
  name: string;
  pointsToNextLevel: number;
} {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (points >= LEVEL_THRESHOLDS[i].threshold) {
      const nextThreshold = LEVEL_THRESHOLDS[i + 1]?.threshold ?? null;
      return {
        level: LEVEL_THRESHOLDS[i].level,
        name: LEVEL_THRESHOLDS[i].name,
        pointsToNextLevel: nextThreshold !== null ? nextThreshold - points : 0,
      };
    }
  }
  return { level: 1, name: 'Seedling', pointsToNextLevel: 100 };
}
```

**Guardrails (DO NOT):**
- Do NOT create a separate `types/faith-points.ts` — keep all dashboard types in `types/dashboard.ts`
- Do NOT use `enum` — use `as const` objects and union types
- Do NOT hardcode point values anywhere outside `activity-points.ts`

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `getLevelForPoints(0)` returns Seedling | unit | Level at 0 points |
| `getLevelForPoints(99)` returns Seedling, pointsToNextLevel=1 | unit | Just below Sprout threshold |
| `getLevelForPoints(100)` returns Sprout | unit | Exact Sprout threshold |
| `getLevelForPoints(500)` returns Blooming | unit | Exact Blooming threshold |
| `getLevelForPoints(1500)` returns Flourishing | unit | Exact Flourishing threshold |
| `getLevelForPoints(4000)` returns Oak | unit | Exact Oak threshold |
| `getLevelForPoints(10000)` returns Lighthouse, pointsToNextLevel=0 | unit | Max level |
| `getLevelForPoints(15000)` returns Lighthouse, pointsToNextLevel=0 | unit | Beyond max |
| `ACTIVITY_POINTS` has correct values for all 6 types | unit | Constant validation |

**Expected state after completion:**
- [ ] `ActivityType` union type exported from `types/dashboard.ts`
- [ ] All 5 new interfaces/types exported from `types/dashboard.ts`
- [ ] `ACTIVITY_POINTS`, `MULTIPLIER_TIERS`, `ALL_ACTIVITY_TYPES` exported from `constants/dashboard/activity-points.ts`
- [ ] `LEVEL_THRESHOLDS` and `getLevelForPoints()` exported from `constants/dashboard/levels.ts`
- [ ] All tests pass

---

### Step 2: Faith Points Storage Service

**Objective:** Create the storage layer for reading/writing the three localStorage keys with error recovery.

**Files to create:**
- `frontend/src/services/faith-points-storage.ts` — Read/write helpers for `wr_daily_activities`, `wr_faith_points`, `wr_streak`
- `frontend/src/services/__tests__/faith-points-storage.test.ts` — Storage layer tests

**Details:**

Create `services/faith-points-storage.ts` following the pattern from `mood-storage.ts`:

```typescript
import type { DailyActivityLog, DailyActivities, FaithPointsData, StreakData, ActivityType } from '@/types/dashboard';
import { getLocalDateString, getYesterdayDateString } from '@/utils/date';
import { ACTIVITY_POINTS, MULTIPLIER_TIERS } from '@/constants/dashboard/activity-points';
import { getLevelForPoints } from '@/constants/dashboard/levels';

const ACTIVITIES_KEY = 'wr_daily_activities';
const POINTS_KEY = 'wr_faith_points';
const STREAK_KEY = 'wr_streak';
```

Functions to implement:

1. **`getActivityLog(): DailyActivityLog`** — Parse `wr_daily_activities`, return `{}` on error
2. **`getTodayActivities(): DailyActivities`** — Get today's entry or return fresh defaults (all false, 0 points, 1x multiplier)
3. **`getFaithPoints(): FaithPointsData`** — Parse `wr_faith_points`, return defaults on error (0 points, Seedling)
4. **`getStreakData(): StreakData`** — Parse `wr_streak`, return defaults on error (0 streak, null lastActiveDate)
5. **`calculateDailyPoints(activities: DailyActivities): { points: number; multiplier: number }`** — Sum base points for true activities, apply multiplier tier, return `Math.round(basePoints * multiplier)`
6. **`updateStreak(today: string, currentData: StreakData): StreakData`** — Streak logic: first-ever, same-day, consecutive, missed day(s)
7. **`persistAll(activityLog: DailyActivityLog, faithPoints: FaithPointsData, streak: StreakData): boolean`** — Write all 3 keys inside try/catch. Return `false` if any write fails (localStorage unavailable or quota exceeded).

**Key implementation details:**

- `calculateDailyPoints`: Iterate `MULTIPLIER_TIERS` from highest `minActivities` down; first match determines multiplier. Count only boolean activity keys (exclude `pointsEarned` and `multiplier` from the count).
- `updateStreak`: Use `getYesterdayDateString()` for consecutive day check. Returns new `StreakData` without side effects.
- `persistAll`: Writes `JSON.stringify()` for each key. Wrapped in single try/catch — if `localStorage.setItem` throws, return `false`.
- All read functions: `try { JSON.parse(localStorage.getItem(key)) }` with `catch` returning defaults. Also validate parsed shape (e.g., check `typeof parsed === 'object'`).

**Fresh defaults:**
```typescript
export function freshDailyActivities(): DailyActivities {
  return {
    mood: false, pray: false, listen: false,
    prayerWall: false, meditate: false, journal: false,
    pointsEarned: 0, multiplier: 1,
  };
}

export function freshFaithPoints(): FaithPointsData {
  return {
    totalPoints: 0, currentLevel: 1,
    currentLevelName: 'Seedling', pointsToNextLevel: 100,
    lastUpdated: new Date().toISOString(),
  };
}

export function freshStreakData(): StreakData {
  return { currentStreak: 0, longestStreak: 0, lastActiveDate: null };
}
```

**Guardrails (DO NOT):**
- Do NOT use `StorageService` class from `services/storage-service.ts` — that's the Music feature's abstraction. Keep faith points storage as standalone functions (same pattern as `mood-storage.ts`)
- Do NOT write to `wr_mood_entries` — read only
- Do NOT import from AudioProvider or any UI component — this is a pure data layer
- Do NOT use `Date.toISOString().split('T')[0]` for date keys — use `getLocalDateString()`

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `getActivityLog` returns `{}` for missing key | unit | Default on missing |
| `getActivityLog` returns `{}` for corrupted JSON | unit | Error recovery |
| `getActivityLog` returns parsed data for valid JSON | unit | Happy path |
| `getTodayActivities` returns fresh defaults when no data | unit | Default for missing day |
| `getTodayActivities` returns correct entry for today | unit | Happy path with `vi.setSystemTime` |
| `getFaithPoints` returns defaults for missing/corrupted key | unit | Error recovery |
| `getStreakData` returns defaults for missing/corrupted key | unit | Error recovery |
| `calculateDailyPoints` — 0 activities = 0 points, 1x | unit | Empty state |
| `calculateDailyPoints` — 1 activity (mood=5) = 5 points, 1x | unit | Single activity |
| `calculateDailyPoints` — 2 activities = base × 1.25x | unit | Multiplier tier 2 |
| `calculateDailyPoints` — 3 activities = base × 1.25x | unit | Upper boundary tier 2 |
| `calculateDailyPoints` — 4 activities = base × 1.5x | unit | Multiplier tier 3 |
| `calculateDailyPoints` — 5 activities = base × 1.5x | unit | Upper boundary tier 3 |
| `calculateDailyPoints` — 6 activities = 85 × 2x = 170 | unit | Full Worship Day |
| `calculateDailyPoints` — verify rounding (Math.round) | unit | Rounding behavior |
| `updateStreak` — first-ever (null lastActiveDate) | unit | Streak starts at 1 |
| `updateStreak` — same day (lastActiveDate=today) | unit | No change |
| `updateStreak` — consecutive day (lastActiveDate=yesterday) | unit | Increment by 1 |
| `updateStreak` — missed day(s) (lastActiveDate=2 days ago) | unit | Reset to 1 |
| `updateStreak` — multi-day gap (active Monday, return Thursday) | unit | Reset to 1 |
| `updateStreak` — longest streak updates on increment | unit | `max(current, longest)` |
| `updateStreak` — longest streak preserved after reset | unit | Longest survives reset |
| `persistAll` writes all 3 keys | unit | Verify all 3 keys written |
| `persistAll` returns false if localStorage throws | unit | Quota exceeded handling |

**Expected state after completion:**
- [ ] All storage functions exported from `services/faith-points-storage.ts`
- [ ] `calculateDailyPoints` handles all multiplier tiers correctly
- [ ] `updateStreak` handles all streak scenarios
- [ ] Corrupted localStorage recovery for all 3 keys
- [ ] All tests pass

---

### Step 3: `useFaithPoints()` Hook

**Objective:** Create the core React hook that serves as the primary interface for all faith points operations.

**Files to create:**
- `frontend/src/hooks/useFaithPoints.ts` — The main hook
- `frontend/src/hooks/__tests__/useFaithPoints.test.ts` — Hook tests

**Details:**

Create `hooks/useFaithPoints.ts`:

```typescript
import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getLocalDateString } from '@/utils/date';
import { getMoodEntries } from '@/services/mood-storage';
import {
  getActivityLog, getTodayActivities, getFaithPoints,
  getStreakData, calculateDailyPoints, updateStreak,
  persistAll, freshDailyActivities, freshFaithPoints,
  freshStreakData,
} from '@/services/faith-points-storage';
import { ACTIVITY_POINTS } from '@/constants/dashboard/activity-points';
import { getLevelForPoints } from '@/constants/dashboard/levels';
import type { ActivityType } from '@/types/dashboard';
```

**Hook state shape:**
```typescript
interface FaithPointsState {
  totalPoints: number;
  currentLevel: number;
  levelName: string;
  pointsToNextLevel: number;
  todayActivities: Record<ActivityType, boolean>;
  todayPoints: number;
  todayMultiplier: number;
  currentStreak: number;
  longestStreak: number;
}
```

**Initialization logic (`loadState()`):**
1. Read all 3 localStorage keys via storage functions
2. Get today's date via `getLocalDateString()`
3. Read today's activities from the activity log
4. **Mood auto-detect**: Check `wr_mood_entries` for an entry with today's date. If found and `todayActivities.mood` is false, set it to true and recalculate points (but only persist if auth'd).
5. Get faith points and streak data
6. Return composed state object

**`recordActivity(type: ActivityType)` implementation:**
1. **Auth check**: If `!isAuthenticated`, return immediately (no-op)
2. Get today's date string
3. Read current activity log from localStorage
4. Get today's entry (or fresh defaults)
5. **Idempotency check**: If `todayEntry[type]` is already `true`, return (no-op)
6. Set `todayEntry[type] = true`
7. Calculate new daily points via `calculateDailyPoints(todayEntry)`
8. Calculate point difference: `newDailyPoints - todayEntry.pointsEarned`
9. Update `todayEntry.pointsEarned` and `todayEntry.multiplier`
10. Write today's entry back into activity log
11. Read current faith points, add point difference to `totalPoints`
12. Recalculate level via `getLevelForPoints(newTotal)`
13. **Level-up detection**: Compare old level number to new level number
14. Update streak via `updateStreak(today, currentStreakData)`
15. Compose new `FaithPointsData` object
16. Call `persistAll(activityLog, faithPoints, streak)` — if returns false, bail (don't update React state)
17. Update React state via `setState()`
18. Return level-up info if detected (for Spec 8 celebrations — store in a ref or return value)

**Return value:**
```typescript
return {
  totalPoints, currentLevel, levelName, pointsToNextLevel,
  todayActivities: { mood, pray, listen, prayerWall, meditate, journal },
  todayPoints, todayMultiplier,
  currentStreak, longestStreak,
  recordActivity,
};
```

**Default values when not authenticated:**
```typescript
{
  totalPoints: 0, currentLevel: 1, levelName: 'Seedling',
  pointsToNextLevel: 100,
  todayActivities: { mood: false, pray: false, listen: false, prayerWall: false, meditate: false, journal: false },
  todayPoints: 0, todayMultiplier: 1,
  currentStreak: 0, longestStreak: 0,
  recordActivity: () => {}, // no-op
}
```

**Auth gating:**
- When `isAuthenticated` is false: return defaults, `recordActivity` is a no-op function
- When `isAuthenticated` is true: load from localStorage, `recordActivity` performs full logic

**Guardrails (DO NOT):**
- Do NOT create a Context/Provider for this hook — it's a plain hook per spec
- Do NOT dispatch events or use custom events for level-up — just return the data. Spec 8 will decide how to consume it
- Do NOT import any UI components
- Do NOT call `recordActivity` during render — it must only be called in event handlers or effects
- Do NOT read from `wr_mood_entries` inside `recordActivity()` — only on initialization. The mood activity can be set via explicit `recordActivity('mood')` call from Spec 6
- Do NOT use `useEffect` to auto-call `recordActivity` — the hook is passive until called

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Returns default values when not authenticated | unit | Auth guard — all zeros/defaults |
| `recordActivity` is no-op when not authenticated | unit | No localStorage writes |
| Returns loaded values from localStorage when authenticated | unit | Happy path init |
| `recordActivity('pray')` sets pray=true and adds 10 points (1x) | integration | Single activity recording |
| `recordActivity('pray')` second call is a no-op | integration | Idempotency |
| `recordActivity` with 2 activities applies 1.25x multiplier | integration | Multiplier tier change |
| `recordActivity` with 4 activities applies 1.5x multiplier | integration | Tier boundary |
| `recordActivity` with all 6 applies 2x = 170 points | integration | Full Worship Day |
| `recordActivity` updates streak on first activity of the day | integration | Streak increment |
| `recordActivity` detects level-up when crossing threshold | integration | Level-up detection |
| `recordActivity` does not fire level-up when staying same level | integration | No false level-ups |
| Mood auto-detect on init from `wr_mood_entries` | integration | Reads mood entries for today |
| State persists across hook re-mount (page reload simulation) | integration | localStorage persistence |
| Point recalculation correct when multiplier tier changes | integration | Retroactive multiplier |
| All 3 localStorage keys updated after `recordActivity` | integration | Atomic writes |
| Corrupted localStorage handled gracefully on init | integration | Error recovery |
| localStorage unavailable — no crash, returns defaults | integration | Safari private browsing |

**Expected state after completion:**
- [ ] `useFaithPoints()` hook exported from `hooks/useFaithPoints.ts`
- [ ] Returns all 10 properties listed in the spec
- [ ] `recordActivity` is idempotent and auth-gated
- [ ] Mood auto-detection from `wr_mood_entries` works on init
- [ ] Level-up detection works across all thresholds
- [ ] All tests pass

---

### Step 4: Listen Timer Integration

**Objective:** Add 30-second continuous playback tracking to the AudioProvider that triggers `recordActivity('listen')`.

**Files to create/modify:**
- `frontend/src/hooks/useListenTracker.ts` — New hook for 30-second listen timer
- `frontend/src/components/audio/AudioProvider.tsx` — Render `<ListenTracker />` component
- `frontend/src/components/audio/ListenTracker.tsx` — Thin component that renders the hook inside AudioProvider's context tree
- `frontend/src/hooks/__tests__/useListenTracker.test.ts` — Timer tests

**Details:**

**Approach**: Create a `useListenTracker` hook that lives inside a `<ListenTracker />` component rendered within `AudioProvider`'s context tree (same pattern as `<ListeningLogger />` and `<SessionAutoSave />` which are already rendered there). This gives the hook access to both `useAudioState()` (for `isPlaying`) and `useAuth()` (for auth gating).

Create `hooks/useListenTracker.ts`:

```typescript
import { useRef, useEffect } from 'react';
import { useAudioState } from '@/components/audio/AudioProvider';
import { useAuth } from '@/contexts/AuthContext';
import { getLocalDateString } from '@/utils/date';

const LISTEN_THRESHOLD_MS = 30_000; // 30 seconds
const POLL_INTERVAL_MS = 5_000;     // Check every 5 seconds
```

**Logic:**
- `playStartRef = useRef<number | null>(null)` — timestamp when continuous playback started
- `recordedDateRef = useRef<string | null>(null)` — date when listen was last recorded (prevents duplicate daily recording)
- `recordActivityRef = useRef(recordActivity)` — stable ref to avoid stale closures

**useEffect watching `isPlaying`:**
1. If `isPlaying` is true and `recordedDateRef.current !== getLocalDateString()`:
   - Set `playStartRef.current = Date.now()` if not already set
   - Start `setInterval` at `POLL_INTERVAL_MS` (5 seconds)
   - Each poll: check if `Date.now() - playStartRef.current >= LISTEN_THRESHOLD_MS`
   - If 30 seconds reached: call `recordActivity('listen')`, set `recordedDateRef.current = today`, clear interval
2. If `isPlaying` is false:
   - Reset `playStartRef.current = null` (timer resets on pause — NOT cumulative)
   - Clear interval
3. Cleanup: clear interval on unmount

**Daily reset**: On each poll, check if `getLocalDateString()` has changed from `recordedDateRef.current`. If a new day, reset `recordedDateRef.current = null` so the user can earn the listen point again.

**Auth gating**: The `recordActivity` function from `useFaithPoints` already no-ops when not auth'd. The timer itself can run harmlessly — it just won't persist anything.

Create `components/audio/ListenTracker.tsx`:
```typescript
import { useListenTracker } from '@/hooks/useListenTracker';

export function ListenTracker({ recordActivity }: { recordActivity: (type: 'listen') => void }) {
  useListenTracker(recordActivity);
  return null; // Renderless component
}
```

**Modify `AudioProvider.tsx`**: Add `<ListenTracker />` as a sibling of `<ListeningLogger />` and `<SessionAutoSave />` inside the provider tree. The `recordActivity` function will be passed as a prop. Since `useFaithPoints` can't be called inside `AudioProvider` (it would need to be above it in the tree or use a different pattern), the `ListenTracker` receives `recordActivity` as a prop.

**Alternative approach (simpler)**: Instead of passing `recordActivity` as a prop, `ListenTracker` can directly call the storage functions from `faith-points-storage.ts` and write to localStorage without going through the hook. But this breaks the "single source of truth" pattern where the hook manages all state.

**Chosen approach**: `ListenTracker` imports and calls storage functions directly (`getActivityLog`, `calculateDailyPoints`, `persistAll`, etc.) rather than depending on `useFaithPoints` hook. This is because `useFaithPoints` is a hook that can only be used in components that aren't ancestors of `AudioProvider`, and `ListenTracker` runs inside `AudioProvider`. The `useFaithPoints` hook in dashboard components will pick up the change on next read from localStorage (on their next `recordActivity` call or re-mount).

**Guardrails (DO NOT):**
- Do NOT track cumulative playback time — reset to 0 on pause per spec
- Do NOT poll more frequently than every 5 seconds
- Do NOT use `requestAnimationFrame` — use `setInterval`
- Do NOT announce listen activity recording to screen readers (too disruptive)
- Do NOT use `useFaithPoints` hook inside the `ListenTracker` component — it would create circular dependency issues since `ListenTracker` renders inside `AudioProvider`

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Timer starts when `isPlaying` becomes true | unit | Timer initialization |
| Timer resets when `isPlaying` becomes false (pause) | unit | Non-cumulative behavior |
| `recordActivity('listen')` called after 30 continuous seconds | unit | Core functionality (use `vi.advanceTimersByTime`) |
| Listen recorded at most once per day | unit | Daily cap |
| Listen resets on new day (midnight rollover) | unit | Daily reset |
| Timer does not start if already recorded today | unit | Efficiency — no unnecessary interval |
| Timer cleans up on unmount | unit | Interval cleanup |

**Expected state after completion:**
- [ ] `useListenTracker` hook created
- [ ] `ListenTracker` component rendered inside `AudioProvider`
- [ ] 30 continuous seconds of playback triggers listen activity recording
- [ ] Timer resets on pause (not cumulative)
- [ ] Activity recorded at most once per day
- [ ] All tests pass
- [ ] Existing AudioProvider tests still pass

---

### Step 5: Integration Test Suite

**Objective:** End-to-end integration tests that verify the full faith points engine working together.

**Files to create:**
- `frontend/src/__tests__/faith-points-integration.test.ts` — Full integration tests

**Details:**

These tests exercise the complete flow: types → constants → storage → hook → listen timer. They validate the spec's acceptance criteria as end-to-end scenarios.

**Test scenarios:**

1. **Full day simulation**: Start with no data → record all 6 activities one by one → verify multiplier changes at each step → verify final 170 points → verify streak = 1 → verify level = Sprout (if total ≥ 100)

2. **Multi-day streak**: Simulate Day 1, Day 2, Day 3 (consecutive) → verify streak increments to 3. Simulate Day 5 (skipped Day 4) → verify streak resets to 1, longest streak preserved at 3.

3. **Level-up progression**: Start at 0 → record activities across multiple simulated days until reaching Sprout (100), then Blooming (500). Verify level-up detection fires correctly at each transition.

4. **Threshold boundary tests**: Verify exact boundaries: 99 points = Seedling, 100 = Sprout; 499 = Sprout, 500 = Blooming; etc.

5. **Point recalculation accuracy**: Record activity 1 (mood=5, 1x = 5pts total). Record activity 2 (pray=10, 1.25x = Math.round(15 × 1.25) = 19pts total). Point difference from 5 to 19 = 14 added to total. Verify total faith points increased by exactly 14 (not 10 or 12.5).

6. **Idempotency across init**: Record 'pray' → unmount → remount → verify pray is still true, no double-counting.

7. **Corrupted localStorage recovery**: Set invalid JSON in all 3 keys → init hook → verify defaults returned, no crash.

8. **localStorage unavailable**: Mock `localStorage.setItem` to throw → call `recordActivity` → verify no crash, state unchanged.

**Guardrails (DO NOT):**
- Do NOT test UI rendering — this is data-layer only
- Do NOT import React components — use `renderHook` from `@testing-library/react` for hook tests
- Do NOT test listen timer here — that has its own test file in Step 4

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Full 6-activity day = 170 points, 2x multiplier | integration | End-to-end daily max |
| Multi-day streak increments correctly | integration | 3 consecutive days |
| Streak resets after gap | integration | Day 1-3 then Day 5 |
| Level-up from Seedling to Sprout at 100 points | integration | Exact threshold crossing |
| Level-up from Sprout to Blooming at 500 points | integration | Higher threshold |
| Point recalculation on multiplier tier change | integration | 1x→1.25x retroactive |
| Idempotency: reload preserves state, no double-count | integration | Persistence |
| Corrupted localStorage: all 3 keys invalid JSON | integration | Recovery |
| localStorage unavailable: setItem throws | integration | Graceful degradation |
| Max level (Lighthouse): points continue accumulating | integration | 10000+ points |
| Midnight rollover: 11:59pm activity + 12:01am activity = 2 days | integration | Date boundary |

**Expected state after completion:**
- [ ] All acceptance criteria from spec validated through integration tests
- [ ] All edge cases from spec covered
- [ ] All tests pass
- [ ] Zero test failures from earlier steps

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Types & Constants — foundation types and calculation constants |
| 2 | 1 | Storage Service — reads/writes localStorage, uses types and constants |
| 3 | 1, 2 | Core Hook — orchestrates storage, uses types/constants/storage |
| 4 | 2, 3 | Listen Timer — uses storage functions, renders inside AudioProvider |
| 5 | 1, 2, 3, 4 | Integration Tests — validates full engine end-to-end |

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Types & Constants | [COMPLETE] | 2026-03-16 | Added `ActivityType`, `DailyActivities`, `DailyActivityLog`, `FaithPointsData`, `StreakData` to `types/dashboard.ts`. Created `constants/dashboard/activity-points.ts` and `constants/dashboard/levels.ts`. 18 tests passing. |
| 2 | Faith Points Storage Service | [COMPLETE] | 2026-03-16 | Created `services/faith-points-storage.ts` with 7 functions + 3 fresh-defaults helpers. 33 tests passing. Used `vi.spyOn(Storage.prototype, 'setItem')` for localStorage throw test (deviation from plan's direct assignment approach). |
| 3 | `useFaithPoints()` Hook | [COMPLETE] | 2026-03-16 | Created `hooks/useFaithPoints.ts` with full state management, auth gating, mood auto-detect, idempotent recordActivity, level-up detection. 17 tests passing. |
| 4 | Listen Timer Integration | [COMPLETE] | 2026-03-16 | Created `hooks/useListenTracker.ts` (accepts `isAuthenticated` param) and `components/audio/ListenTracker.tsx` (reads auth from localStorage directly to avoid AuthProvider dependency). Deviation: hook takes `isAuthenticated` as param instead of calling `useAuth()` internally — prevents crash when AudioProvider renders without AuthProvider in tests. 7 tests passing. All 235 existing audio tests still pass. |
| 5 | Integration Test Suite | [COMPLETE] | 2026-03-16 | Created `src/__tests__/faith-points-integration.test.ts` with 10 integration tests covering: full day (170pts), multi-day streak, level-up, point recalculation, idempotency, corrupted localStorage, localStorage unavailable, max level, midnight rollover. Full suite: 145 files, 1250 tests, 0 failures. |
