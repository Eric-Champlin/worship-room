# Implementation Plan: Streak Repair & Grace Mechanic

**Spec:** `_specs/streak-repair-grace.md`
**Date:** 2026-03-18
**Branch:** `claude/feature/streak-repair-grace`
**Design System Reference:** `_plans/recon/design-system.md` (loaded)
**Recon Report:** not applicable (no new pages/routes — inline StreakCard modification)
**Master Spec Plan:** `dashboard-growth-spec-plan-v2.md` (loaded)

---

## Architecture Context

### Relevant Files & Patterns

**Core files this spec modifies:**
- `frontend/src/services/faith-points-storage.ts` — Owns `wr_streak` reads/writes, `updateStreak()` function, `persistAll()`. **This is where `previousStreak` capture must be added** during streak reset.
- `frontend/src/components/dashboard/StreakCard.tsx` — Renders streak counter, messages, badges. **This is where the repair UI appears.**
- `frontend/src/hooks/useFaithPoints.ts` — Orchestrates `recordActivity()` → streak update → persistence. **Must expose a `repairStreak()` method.**

**Files consumed (read-only):**
- `frontend/src/utils/date.ts` — `getLocalDateString()`, `getCurrentWeekStart()` already exist
- `frontend/src/components/ui/Toast.tsx` — `useToast()` → `showCelebrationToast()` for `celebration-confetti` tier
- `frontend/src/components/dashboard/AnimatedCounter.tsx` — Already used in StreakCard for count-up animation
- `frontend/src/constants/dashboard/levels.ts` — `getLevelForPoints()` for level recalculation after paid repair
- `frontend/src/contexts/AuthContext.tsx` — `useAuth()` → `isAuthenticated` for gating
- `frontend/src/types/dashboard.ts` — `StreakData`, `FaithPointsData` interfaces

**Directory conventions:**
- Storage services: `frontend/src/services/`
- Types: `frontend/src/types/`
- Hooks: `frontend/src/hooks/`
- Components: `frontend/src/components/dashboard/`
- Tests: co-located `__tests__/` directories

**Test patterns:**
- Vitest + React Testing Library
- Tests in `__tests__/*.test.tsx` co-located with source
- Mock localStorage in tests via `vi.spyOn(Storage.prototype, ...)`
- Provider wrapping: `ToastProvider` wraps components that use `useToast()`
- Auth mocking: `vi.mock('@/contexts/AuthContext')` with `useAuth` returning `{ isAuthenticated: true/false, user, login, logout }`
- See `frontend/src/components/dashboard/__tests__/StreakCard.test.tsx` for existing StreakCard test patterns

**Auth gating pattern:**
- `useFaithPoints()` returns `DEFAULT_STATE` and noop functions when `!isAuthenticated`
- StreakCard is only rendered inside the Dashboard, which is only rendered when `isAuthenticated`
- No additional auth checks needed in the UI layer — the entire Dashboard is gated

**Cross-spec dependencies:**
- Spec 5 (`faith-points-storage.ts`, `useFaithPoints.ts`) — owns streak/points logic; this spec extends it
- Spec 6 (`StreakCard.tsx`, `DashboardWidgetGrid.tsx`) — owns StreakCard UI; this spec modifies it
- Spec 8 (`Toast.tsx`, `useCelebrationQueue.ts`) — owns celebration system; this spec reuses `showCelebrationToast` directly (not through badge queue)

---

## Auth Gating Checklist

**Every action in the spec that requires login must have an auth check in the plan.**

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| View grace message | Dashboard only (auth-gated) | Step 3 | Dashboard route gating (existing) |
| Use free repair | Logged-in only | Step 3 | `useFaithPoints` noop pattern (existing) + `repairStreak` auth check |
| Use paid repair (50 pts) | Logged-in only | Step 3 | Same as above |
| Capture previousStreak on reset | Only happens via `recordActivity` which is auth-gated | Step 2 | `recordActivity` auth check (existing) |

All repair state reads/writes happen inside `useFaithPoints` which already returns noop functions and default state when `!isAuthenticated`. Dashboard is never rendered for logged-out users. No additional auth gating needed.

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Grace message | font | Inter 14px italic, `text-white/60` | Spec (matches existing `streakMessage` style in StreakCard.tsx:149-153) |
| "Restore Streak" button | background | `bg-amber-500/20` | Spec (matches multiplier badge at StreakCard.tsx:230) |
| "Restore Streak" button | text color | `text-amber-300` | Spec |
| "Restore Streak" button | hover | `hover:bg-amber-500/30 hover:scale-[1.02]` | Spec |
| "Repair with 50 pts" button | background | `bg-white/10` | Spec (secondary, less prominent) |
| "Repair with 50 pts" button | text color | `text-white/70` | Spec |
| Helper text | font | Inter 12px, `text-white/50` | Matches existing `text-xs text-white/50` in StreakCard.tsx:147,169 |
| Dashboard card | pattern | `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl` | 09-design-system.md |
| Touch target | min height | 44px | 04-frontend-standards.md |

---

## Design System Reminder

**Project-specific quirks displayed before every UI step:**

- Dashboard uses frosted glass cards: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`
- Multiplier badge amber styling: `bg-amber-500/20 text-amber-300` (StreakCard.tsx:230)
- StreakCard messages use `text-sm text-white/60` (StreakCard.tsx:149)
- StreakCard sub-text uses `text-xs text-white/50` (StreakCard.tsx:147)
- AnimatedCounter: `from`, `to`, `duration` props — easeOut quadratic, respects `prefers-reduced-motion`
- Toast celebration-confetti: 5s auto-dismiss, dark frosted glass card, bottom-right desktop / bottom-center mobile, CSS confetti particles, `motion-reduce:hidden`
- Celebration toast is invoked via `showCelebrationToast(title, message, 'celebration-confetti', iconElement)` from `useToast()`

---

## Shared Data Models (from Master Plan)

```typescript
// Existing — from types/dashboard.ts
interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null; // YYYY-MM-DD
}

interface FaithPointsData {
  totalPoints: number;
  currentLevel: number;
  currentLevelName: string;
  pointsToNextLevel: number;
  lastUpdated: string; // ISO string
}

// NEW — introduced by this spec
interface StreakRepairData {
  previousStreak: number | null;      // streak value before most recent reset
  lastFreeRepairDate: string | null;  // YYYY-MM-DD of last free repair
  repairsUsedThisWeek: number;        // count since Monday
  weekStartDate: string;              // YYYY-MM-DD of current Monday
}
```

**localStorage keys this spec touches:**

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_streak` | Both | Read current streak; write restored streak on repair |
| `wr_faith_points` | Both | Read points balance; write deducted points on paid repair |
| `wr_streak_repairs` | Both | NEW key — repair state (previousStreak, weekly tracking) |
| `wr_daily_activities` | Read | Read via `getActivityLog()` in existing flow |

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | < 640px | Repair button full-width, 44px min-h, stacked vertical |
| Tablet | 640-1024px | Button auto-width, stacked layout |
| Desktop | > 1024px | Button auto-width, left-aligned, fits in right-column StreakCard |

No new pages or layout. Repair UI is inline within the existing StreakCard which already has responsive behavior via `DashboardWidgetGrid` (`order-1 lg:order-2 lg:col-span-2`).

---

## Vertical Rhythm

Not applicable — this feature adds content inline within an existing card component. No new sections or page-level spacing.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] Spec 5 (Streak & Faith Points Engine) is complete and committed
- [x] Spec 6 (Dashboard Widgets + Activity Integration) is complete — StreakCard exists
- [x] Spec 8 (Celebrations & Badge UI) is complete — toast-confetti system exists
- [x] `getCurrentWeekStart()` exists in `utils/date.ts`
- [x] All auth-gated actions from the spec are accounted for in the plan
- [x] Design system values are verified (from codebase inspection of StreakCard.tsx and Toast.tsx)
- [ ] No [UNVERIFIED] values in this plan (all values sourced from existing code)
- [x] Prior specs in the sequence are complete and committed

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Where to capture `previousStreak` | In `updateStreak()` function return value — new field added to `StreakData` type? | No — keep `StreakData` unchanged. Instead, create separate `wr_streak_repairs` storage with its own read/write functions, and call `capturePreviousStreak()` from `useFaithPoints.recordActivity()` right before `persistAll()` when streak resets. |
| How to detect streak reset | Compare `currentData.currentStreak` (before) with `newStreak.currentStreak` (after) in `recordActivity()` | `updateStreak()` is pure — it returns new data. The caller (`recordActivity`) can compare before/after to detect a reset. |
| How to trigger repair celebration | Call `showCelebrationToast()` directly from StreakCard, NOT through badge queue | The repair is not a badge — it's a one-off action. Using `showCelebrationToast` directly is simpler and doesn't pollute the badge system. |
| Point deduction effect on levels | Points decrease, level may drop | Spec explicitly states this is acceptable: "spending points is a conscious choice" |
| Where repair logic lives | New `repairStreak()` function in `useFaithPoints` hook | Keeps all faith points/streak mutation logic in one place. StreakCard calls it, hook handles localStorage. |
| Repair state as separate storage vs extending StreakData | Separate `wr_streak_repairs` key | Cleaner separation of concerns. StreakData is used by many consumers; adding repair fields would leak repair details everywhere. |

---

## Implementation Steps

### Step 1: Streak Repair Storage Service

**Objective:** Create the storage layer for the new `wr_streak_repairs` localStorage key with read, write, and weekly-reset logic.

**Files to create/modify:**
- `frontend/src/types/dashboard.ts` — Add `StreakRepairData` interface
- `frontend/src/services/streak-repair-storage.ts` — NEW file: CRUD for repair data

**Details:**

Add to `types/dashboard.ts`:
```typescript
export interface StreakRepairData {
  previousStreak: number | null;
  lastFreeRepairDate: string | null;
  repairsUsedThisWeek: number;
  weekStartDate: string;
}
```

Create `services/streak-repair-storage.ts`:
```typescript
import type { StreakRepairData } from '@/types/dashboard';
import { getLocalDateString, getCurrentWeekStart } from '@/utils/date';

const REPAIRS_KEY = 'wr_streak_repairs';

export function freshRepairData(): StreakRepairData {
  return {
    previousStreak: null,
    lastFreeRepairDate: null,
    repairsUsedThisWeek: 0,
    weekStartDate: getCurrentWeekStart(),
  };
}

export function getRepairData(): StreakRepairData {
  // Reads from localStorage with corrupted-data recovery
  // Performs lazy weekly reset if weekStartDate < current Monday
}

export function saveRepairData(data: StreakRepairData): boolean {
  // Wraps in try/catch, returns false on failure
}

export function capturePreviousStreak(oldStreak: number): void {
  // Only capture when oldStreak > 1
  // Do NOT overwrite if previousStreak already set (preserve higher value)
}

export function isFreeRepairAvailable(): boolean {
  // Free if lastFreeRepairDate is null OR weekStartDate is before current Monday
}

export function clearPreviousStreak(): void {
  // Set previousStreak to null after successful repair
}
```

The `getRepairData()` function must:
1. Parse JSON safely (return `freshRepairData()` on invalid JSON)
2. Check if `weekStartDate < getCurrentWeekStart()` — if so, reset `repairsUsedThisWeek` to 0 and update `weekStartDate`
3. Return the (possibly reset) data

**Guardrails (DO NOT):**
- Do NOT store repair data in `wr_streak` — keep it separate
- Do NOT use `new Date().toISOString().split('T')[0]` — use `getLocalDateString()`
- Do NOT create any UI in this step

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `getRepairData returns fresh data when key missing` | unit | No localStorage entry → returns fresh defaults |
| `getRepairData recovers from corrupted JSON` | unit | Invalid JSON in localStorage → returns fresh defaults, no crash |
| `getRepairData performs lazy weekly reset` | unit | Set `weekStartDate` to a past Monday, call `getRepairData()` → `repairsUsedThisWeek` is 0, `weekStartDate` updated |
| `getRepairData does NOT reset when same week` | unit | Set `weekStartDate` to current Monday → no reset |
| `capturePreviousStreak stores value when > 1` | unit | `capturePreviousStreak(5)` → `previousStreak` is 5 |
| `capturePreviousStreak ignores value <= 1` | unit | `capturePreviousStreak(1)` → `previousStreak` unchanged |
| `capturePreviousStreak does NOT overwrite existing higher value` | unit | `previousStreak` is 10, call `capturePreviousStreak(5)` → still 10 |
| `capturePreviousStreak DOES overwrite existing lower value` | unit | `previousStreak` is 3, call `capturePreviousStreak(8)` → now 8. **Wait — spec says "Do not overwrite if already set."** Re-read: "If previousStreak is already set (from a prior reset that was never repaired), do not overwrite it — preserve the original pre-reset value." So: never overwrite if non-null. Test: `previousStreak` is 3, call `capturePreviousStreak(8)` → still 3. |
| `isFreeRepairAvailable returns true when never used` | unit | `lastFreeRepairDate` null → true |
| `isFreeRepairAvailable returns false after use this week` | unit | Set `lastFreeRepairDate` to today, `weekStartDate` to current Monday → false |
| `isFreeRepairAvailable resets on new week` | unit | Set old `weekStartDate` → true (lazy reset) |
| `saveRepairData handles localStorage failure` | unit | Mock `localStorage.setItem` to throw → returns false |

**Expected state after completion:**
- [ ] `StreakRepairData` type exported from `types/dashboard.ts`
- [ ] `streak-repair-storage.ts` with all CRUD functions and tests passing
- [ ] No UI changes yet

---

### Step 2: Integrate Previous Streak Capture into Streak Reset Flow

**Objective:** When `recordActivity()` detects that `updateStreak()` caused a reset (currentStreak went from > 1 to 1), capture the old streak value via `capturePreviousStreak()`.

**Files to modify:**
- `frontend/src/hooks/useFaithPoints.ts` — Add `capturePreviousStreak` call in `recordActivity()`

**Details:**

In `useFaithPoints.ts`, inside `recordActivity()`, after calling `updateStreak()` (line ~150):

```typescript
// Existing code:
const currentStreakData = getStreakData();
const newStreak = updateStreak(today, currentStreakData);

// NEW: Capture previous streak if reset occurred
if (currentStreakData.currentStreak > 1 && newStreak.currentStreak === 1) {
  capturePreviousStreak(currentStreakData.currentStreak);
}
```

Import `capturePreviousStreak` from `@/services/streak-repair-storage`.

This is a 3-line addition. The logic is:
- `currentStreakData.currentStreak > 1`: user had a meaningful streak
- `newStreak.currentStreak === 1`: the streak just reset (updateStreak returns 1 for missed days)
- → Capture the old value

**Guardrails (DO NOT):**
- Do NOT modify `updateStreak()` itself — it's a pure function, keep it that way
- Do NOT capture when streak is already 0 or 1 (no meaningful streak to save)
- Do NOT capture on first-ever activity (currentStreak was 0 → 1, not a reset)

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `recordActivity captures previousStreak on reset` | integration | Set streak to 5, simulate gap day, call `recordActivity` → `wr_streak_repairs.previousStreak` is 5 |
| `recordActivity does NOT capture on first activity` | integration | Streak is 0, call `recordActivity` → no `previousStreak` set |
| `recordActivity does NOT capture when streak continues` | integration | Streak is 5, yesterday was active, call `recordActivity` → streak is 6, no `previousStreak` capture |

**Expected state after completion:**
- [ ] `previousStreak` is automatically captured when streak resets during any `recordActivity()` call
- [ ] Existing streak behavior is unchanged (still resets to 1 on missed day)
- [ ] All existing useFaithPoints tests still pass

---

### Step 3: Add `repairStreak` Function to useFaithPoints Hook

**Objective:** Expose a `repairStreak(useFreeRepair: boolean)` function from the `useFaithPoints` hook that performs the full repair action (restore streak, optionally deduct points, update repair tracking, trigger celebration).

**Files to modify:**
- `frontend/src/hooks/useFaithPoints.ts` — Add `repairStreak` callback and expose in return value

**Details:**

Add new `repairStreak` callback inside `useFaithPoints`:

```typescript
const repairStreak = useCallback((useFreeRepair: boolean) => {
  if (!isAuthenticated) return;

  const repairData = getRepairData();
  if (repairData.previousStreak === null || repairData.previousStreak <= 1) return;

  const today = getLocalDateString();
  const currentWeekStart = getCurrentWeekStart();

  if (!useFreeRepair) {
    // Paid repair — check points
    const currentFP = getFaithPoints();
    if (currentFP.totalPoints < 50) return;

    // Deduct 50 points
    const newTotal = currentFP.totalPoints - 50;
    const levelInfo = getLevelForPoints(newTotal);
    const newFP: FaithPointsData = {
      totalPoints: newTotal,
      currentLevel: levelInfo.level,
      currentLevelName: levelInfo.name,
      pointsToNextLevel: levelInfo.pointsToNextLevel,
      lastUpdated: new Date().toISOString(),
    };

    // Save faith points
    try {
      localStorage.setItem('wr_faith_points', JSON.stringify(newFP));
    } catch { return; }
  }

  // Restore streak
  const streak = getStreakData();
  const restoredStreak: StreakData = {
    currentStreak: repairData.previousStreak,
    longestStreak: Math.max(streak.longestStreak, repairData.previousStreak),
    lastActiveDate: today,
  };

  try {
    localStorage.setItem('wr_streak', JSON.stringify(restoredStreak));
  } catch { return; }

  // Update repair tracking
  const updatedRepair: StreakRepairData = {
    previousStreak: null, // Clear — repair used
    lastFreeRepairDate: useFreeRepair ? today : repairData.lastFreeRepairDate,
    repairsUsedThisWeek: repairData.repairsUsedThisWeek + 1,
    weekStartDate: currentWeekStart,
  };
  saveRepairData(updatedRepair);

  // Refresh React state
  setState(loadState());
}, [isAuthenticated]);
```

Add to the return value:
```typescript
return { ...state, recordActivity, clearNewlyEarnedBadges, repairStreak };
```

Return `repairStreak: noopRecordActivity` (or a separate noop) when `!isAuthenticated`.

Also add repair state to `FaithPointsState` and `loadState()`:
```typescript
// In FaithPointsState interface:
previousStreak: number | null;
isFreeRepairAvailable: boolean;

// In loadState():
const repairData = getRepairData();
return {
  // ... existing fields
  previousStreak: repairData.previousStreak,
  isFreeRepairAvailable: isFreeRepairAvailableFn(),
};

// In DEFAULT_STATE:
previousStreak: null,
isFreeRepairAvailable: false,
```

**Guardrails (DO NOT):**
- Do NOT let point deduction cause `totalPoints` < 0 (checked before deduction)
- Do NOT fire repair if `previousStreak` is null (button shouldn't show, but defense-in-depth)
- Do NOT use `persistAll()` for the repair — the repair writes to different keys at different times (faith points only for paid repairs). Write each key individually in a try/catch block.
- Do NOT trigger celebration from the hook — let the UI component trigger it after `repairStreak()` returns (keeps hook side-effect-free re: toasts)

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `repairStreak (free) restores streak to previousStreak` | unit | Set previousStreak=10, currentStreak=1, call `repairStreak(true)` → currentStreak=10 |
| `repairStreak (free) sets lastActiveDate to today` | unit | → `lastActiveDate` equals `getLocalDateString()` |
| `repairStreak (free) updates longestStreak if needed` | unit | previousStreak=15, longestStreak=10 → longestStreak=15 |
| `repairStreak (free) clears previousStreak` | unit | → `previousStreak` is null after repair |
| `repairStreak (free) updates free repair tracking` | unit | → `lastFreeRepairDate` set, `repairsUsedThisWeek` incremented |
| `repairStreak (paid) deducts exactly 50 points` | unit | totalPoints=200, call `repairStreak(false)` → totalPoints=150 |
| `repairStreak (paid) recalculates level after deduction` | unit | totalPoints=120 (Sprout), deduct 50 → 70 (Seedling) |
| `repairStreak (paid) does NOT deduct if < 50 points` | unit | totalPoints=30 → no-op, streak unchanged |
| `repairStreak (paid) does NOT touch lastFreeRepairDate` | unit | → `lastFreeRepairDate` unchanged |
| `repairStreak noops when not authenticated` | unit | `isAuthenticated=false` → no state change |
| `repairStreak noops when previousStreak is null` | unit | No pending repair → no state change |
| `repairStreak atomicity — partial write failure` | unit | Mock `localStorage.setItem` to throw on second call → first write happened but state not corrupted (defense) |
| `isFreeRepairAvailable exposed correctly` | unit | Various repair states → correct boolean in returned state |
| `previousStreak exposed correctly in state` | unit | Set previousStreak in storage → appears in hook return |

**Expected state after completion:**
- [ ] `repairStreak(useFreeRepair)` function available from `useFaithPoints()`
- [ ] `previousStreak` and `isFreeRepairAvailable` exposed in hook state
- [ ] All localStorage writes atomic within try/catch
- [ ] All existing tests still pass

---

### Step 4: StreakCard Repair UI

**Objective:** Add inline repair UI to the StreakCard when a streak has been reset and a repair is available. Includes grace message, free/paid repair buttons, helper text, and celebration toast on success.

**Files to modify:**
- `frontend/src/components/dashboard/StreakCard.tsx` — Add repair section
- `frontend/src/components/dashboard/DashboardWidgetGrid.tsx` — Pass new props to StreakCard

**Details:**

**StreakCard.tsx changes:**

Add new props to `StreakCardProps`:
```typescript
interface StreakCardProps {
  // ... existing props
  previousStreak: number | null;
  isFreeRepairAvailable: boolean;
  onRepairStreak: (useFreeRepair: boolean) => void;
}
```

Add repair availability logic inside the component:
```typescript
const canShowRepair = previousStreak !== null && previousStreak > 1 &&
                       currentStreak <= 1 && longestStreak > 1;
const hasPaidOption = !isFreeRepairAvailable && totalPoints >= 50;
```

Replace the existing `streakMessage` display when `canShowRepair` is true. The `getStreakMessage()` function's return for reset cases is replaced by the grace message:

```tsx
{canShowRepair ? (
  <div className="mt-2 space-y-2">
    <p className="text-sm italic text-white/60">
      Everyone misses a day. Grace is built into your journey.
    </p>
    {isFreeRepairAvailable ? (
      <>
        <button
          onClick={handleFreeRepair}
          className="min-h-[44px] w-full rounded-lg bg-amber-500/20 px-4 py-2.5 text-sm font-medium text-amber-300 transition-all hover:bg-amber-500/30 motion-safe:hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-amber-400/50 sm:w-auto"
        >
          Restore Streak
        </button>
        <p className="text-xs text-white/50">1 free repair per week</p>
      </>
    ) : hasPaidOption ? (
      <>
        <button
          onClick={handlePaidRepair}
          className="min-h-[44px] w-full rounded-lg bg-white/10 px-4 py-2.5 text-sm font-medium text-white/70 transition-all hover:bg-white/15 motion-safe:hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-white/30 sm:w-auto"
        >
          Repair with 50 points
        </button>
        <p className="text-xs text-white/50">Free repair resets Monday</p>
      </>
    ) : (
      <p className="text-xs text-white/50">Free repair resets Monday</p>
    )}
  </div>
) : streakMessage ? (
  <p className="mt-1 text-sm text-white/60">{streakMessage}</p>
) : null}
```

**Celebration toast handler:**

```typescript
const { showCelebrationToast } = useToast();

function handleFreeRepair() {
  if (!previousStreak) return;
  const streakValue = previousStreak;
  onRepairStreak(true);
  // Fire celebration after state update
  showCelebrationToast(
    'Streak Restored!',
    `${streakValue}-day streak is back!`,
    'celebration-confetti',
  );
}

function handlePaidRepair() {
  if (!previousStreak) return;
  const streakValue = previousStreak;
  onRepairStreak(false);
  showCelebrationToast(
    'Streak Restored!',
    `${streakValue}-day streak is back!`,
    'celebration-confetti',
  );
}
```

**Important:** Capture `previousStreak` value before calling `onRepairStreak` (which clears it). The local variable `streakValue` preserves it for the toast message.

After repair, the `AnimatedCounter` already in StreakCard will animate from 0/1 to the restored value on re-render (since `animate` prop comes from `justCompletedCheckIn`, we may need a separate local state for repair animation):

```typescript
const [justRepaired, setJustRepaired] = useState(false);

function handleFreeRepair() {
  // ...
  setJustRepaired(true);
  onRepairStreak(true);
  showCelebrationToast(...);
}
```

Then in the streak display, use `animate || justRepaired` to trigger the AnimatedCounter:
```tsx
{(animate || justRepaired) ? (
  <AnimatedCounter from={justRepaired ? (currentStreak <= 1 ? currentStreak : 0) : 0} to={currentStreak} duration={800} />
) : (
  currentStreak
)}
```

Wait — after repair, `currentStreak` will be the restored value (e.g., 10) via the re-render. The `AnimatedCounter` with `from={1} to={10}` creates the satisfying count-up effect. Use `from={1}` since the streak was at 1 before repair.

Better approach: store the pre-repair value in a ref:
```typescript
const preRepairStreakRef = useRef(currentStreak);

function handleRepair(useFree: boolean) {
  preRepairStreakRef.current = currentStreak; // 0 or 1
  setJustRepaired(true);
  onRepairStreak(useFree);
  showCelebrationToast(...);
}
```

Then: `<AnimatedCounter from={preRepairStreakRef.current} to={currentStreak} duration={800} />`

**DashboardWidgetGrid.tsx changes:**

Pass new props to StreakCard:
```tsx
<StreakCard
  // ... existing props
  previousStreak={faithPoints.previousStreak}
  isFreeRepairAvailable={faithPoints.isFreeRepairAvailable}
  onRepairStreak={faithPoints.repairStreak}
/>
```

**Responsive behavior:**
- Mobile (< 640px): Repair button has `w-full` and `min-h-[44px]` for touch targets. Grace message, button, and helper text stack vertically.
- Tablet (640-1024px): `sm:w-auto` removes full-width on button.
- Desktop (> 1024px): Same as tablet — button auto-width, left-aligned.

**Accessibility:**
- Buttons have clear text labels as accessible names ("Restore Streak", "Repair with 50 points")
- Grace message is readable text (not `aria-hidden`)
- Focus indicators: `focus-visible:ring-2` on both buttons
- After repair, the restored streak value updates in the existing `aria-live` context of the StreakCard
- `prefers-reduced-motion`: `motion-safe:hover:scale-[1.02]` — no scale on reduced motion. Toast confetti is `motion-reduce:hidden` (already handled by Toast.tsx).

**Guardrails (DO NOT):**
- Do NOT create a new component — the repair UI is inline within StreakCard
- Do NOT show repair UI for brand-new users (`longestStreak <= 1`)
- Do NOT show repair UI when `previousStreak` is null
- Do NOT use `dangerouslySetInnerHTML`
- Do NOT add new routes or pages

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `shows grace message when repair available` | component | `currentStreak=1, previousStreak=5, longestStreak=5` → grace message visible |
| `shows "Restore Streak" button when free repair available` | component | `isFreeRepairAvailable=true` → button text "Restore Streak" |
| `shows "1 free repair per week" helper for free repair` | component | → helper text visible |
| `shows "Repair with 50 points" when free used and points >= 50` | component | `isFreeRepairAvailable=false, totalPoints=100` → paid button visible |
| `shows "Free repair resets Monday" for paid repair` | component | → helper text visible |
| `shows only message when no repair option (no free, < 50 pts)` | component | `isFreeRepairAvailable=false, totalPoints=30` → no button, "Free repair resets Monday" shown |
| `does NOT show repair UI for new users` | component | `longestStreak=0, previousStreak=null` → standard messaging |
| `does NOT show repair UI when previousStreak is null` | component | `currentStreak=1, previousStreak=null` → standard reset message |
| `does NOT show repair UI when currentStreak > 1` | component | `currentStreak=5, previousStreak=3` → no repair (streak is active) |
| `calls onRepairStreak(true) on free repair click` | component | Click "Restore Streak" → `onRepairStreak` called with `true` |
| `calls onRepairStreak(false) on paid repair click` | component | Click "Repair with 50 points" → `onRepairStreak` called with `false` |
| `buttons are keyboard accessible` | component | Tab to button, Enter to activate |
| `buttons have min 44px touch target` | component | `min-h-[44px]` class present |
| `celebration toast fires on repair` | integration | Click repair → `showCelebrationToast` called with "Streak Restored!" |
| `streak count animates after repair` | component | After repair, `AnimatedCounter` renders with correct from/to |

**Expected state after completion:**
- [ ] StreakCard shows repair UI when streak is reset and previousStreak exists
- [ ] Free repair button, paid repair button, and no-button states all work correctly
- [ ] Celebration toast fires with correct message
- [ ] Streak count animates from old to restored value
- [ ] Responsive on all breakpoints
- [ ] All accessibility requirements met

---

### Step 5: Integration Tests & Edge Cases

**Objective:** End-to-end tests covering the full repair flow: streak reset → capture → repair → celebration → re-render.

**Files to create:**
- `frontend/src/services/__tests__/streak-repair-storage.test.ts` — (created in Step 1)
- `frontend/src/hooks/__tests__/useFaithPoints-repair.test.tsx` — NEW test file for repair-specific hook tests
- `frontend/src/components/dashboard/__tests__/StreakCard-repair.test.tsx` — NEW test file for repair UI tests

**Details:**

Integration-level tests that exercise the full flow:

| Test | Type | Description |
|------|------|-------------|
| `full flow: streak resets → previousStreak captured → free repair → streak restored` | integration | Set streak to 7, simulate gap, record activity (streak resets to 1, previousStreak=7), call repairStreak(true) → streak is 7, previousStreak is null |
| `full flow: paid repair deducts points and restores streak` | integration | previousStreak=10, totalPoints=200, repairStreak(false) → streak=10, totalPoints=150 |
| `multiple resets in one week — free then paid` | integration | Free repair on Monday. Reset again. Paid repair (50pts). Reset again. No button (free used, depends on points). |
| `week rollover resets free repair` | integration | Use free repair on Sunday. Mock Monday. New free repair available. |
| `repair when previousStreak would be new longestStreak` | integration | longestStreak=5, previousStreak=10 (from before a reset that set longest to 5+) → after repair, longestStreak=10 |
| `corrupted wr_streak_repairs — graceful recovery` | integration | Set invalid JSON in localStorage → repair UI not shown, no crash |
| `localStorage unavailable — no crash` | integration | Mock localStorage to throw → repair UI not shown, repair noop |

**Guardrails (DO NOT):**
- Do NOT duplicate tests from Steps 1-4 — these are integration/flow tests only
- Do NOT test celebration toast rendering here (that's Toast.tsx's responsibility)

**Expected state after completion:**
- [ ] All integration tests pass
- [ ] Edge cases (corrupted data, localStorage failure, week rollover) covered
- [ ] Total test count for streak repair feature: ~35-40 tests across 3 test files

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Streak repair storage service + types |
| 2 | 1 | Capture previousStreak in recordActivity |
| 3 | 1, 2 | repairStreak function in useFaithPoints hook |
| 4 | 1, 2, 3 | StreakCard repair UI + celebration |
| 5 | 1, 2, 3, 4 | Integration tests & edge cases |

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Streak Repair Storage Service | [COMPLETE] | 2026-03-18 | Added `StreakRepairData` to `types/dashboard.ts`. Created `services/streak-repair-storage.ts` with `getRepairData`, `saveRepairData`, `capturePreviousStreak`, `isFreeRepairAvailable`, `clearPreviousStreak`. 19 tests in `services/__tests__/streak-repair-storage.test.ts`. |
| 2 | Capture Previous Streak on Reset | [COMPLETE] | 2026-03-18 | Added `capturePreviousStreak` import + 3-line capture in `useFaithPoints.ts` `recordActivity()`. 3 integration tests added to `useFaithPoints.test.ts`. |
| 3 | repairStreak in useFaithPoints | [COMPLETE] | 2026-03-18 | Added `repairStreak(useFreeRepair)` to `useFaithPoints` hook. Added `previousStreak` + `isFreeRepairAvailable` to state. Updated `loadState()`, `DEFAULT_STATE`, unauth return. Fixed TS error in `empty-states.test.tsx`. 16 tests in `useFaithPoints-repair.test.ts`. |
| 4 | StreakCard Repair UI | [COMPLETE] | 2026-03-18 | Added `previousStreak`, `isFreeRepairAvailable`, `onRepairStreak` props to StreakCard. Inline repair UI with grace message, free/paid buttons, helper text. `useToastSafe` for celebration toast. AnimatedCounter for repair animation. DashboardWidgetGrid passes new props. 16 tests in `StreakCard-repair.test.tsx`. Visual verification at 375px + 1440px passed. |
| 5 | Integration Tests & Edge Cases | [COMPLETE] | 2026-03-18 | Added 6 integration tests to `useFaithPoints-repair.test.ts` (full flow, paid repair, week rollover, longestStreak update, corrupted data, localStorage failure). Total: 128 tests across 6 files, all passing. |
