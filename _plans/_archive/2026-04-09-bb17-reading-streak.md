# Implementation Plan: BB-17 Reading Streak

**Spec:** `_specs/bb-17-reading-streak.md`
**Date:** 2026-04-09
**Branch:** `bible-redesign`
**Design System Reference:** `_plans/recon/design-system.md` (loaded — captured 2026-04-05)
**Recon Report:** not applicable
**Master Spec Plan:** N/A — standalone spec in the Bible Redesign wave

---

## Architecture Context

### Project Structure

BB-17 adds a reading streak system to the Bible redesign. All data is localStorage-only — no backend.

**Existing reactive stores (BB-7 pattern: module-level cache + listeners Set + subscribe + getters + mutations):**

| Store | File | localStorage Key | Has `subscribe` |
|-------|------|-----------------|-----------------|
| Highlights | `src/lib/bible/highlightStore.ts` | `wr_bible_highlights` | yes |
| Bookmarks | `src/lib/bible/bookmarkStore.ts` | `bible:bookmarks` | yes |
| Notes | `src/lib/bible/notes/store.ts` | `bible:notes` | yes |
| Journals | `src/lib/bible/journalStore.ts` | `bible:journalEntries` | yes |

**Pattern to follow:** `highlightStore.ts` lines 1-10 (module-level cache + listeners), lines 88-111 (readFromStorage/writeToStorage with SSR guard), lines 126-137 (getCache/notifyListeners), lines 335-340 (subscribe).

**Existing streak infrastructure (stubs to replace):**

| Component | File | Current State |
|-----------|------|--------------|
| StreakChip | `src/components/bible/landing/StreakChip.tsx` | Renders flame + count, accepts `BibleStreak` prop (`{ count, lastReadDate }`), hidden when count=0 |
| Landing state | `src/lib/bible/landingState.ts:28-37` | `getBibleStreak()` reads from `wr_bible_streak` (old key) |
| BibleLanding page | `src/pages/BibleLanding.tsx:36-79` | Calls `getBibleStreak()` on mount, passes to StreakChip, onClick is `console.log` stub |
| MyBiblePage | `src/pages/MyBiblePage.tsx:161-167` | Shows `totalCounts.streak` from `useActivityFeed` hook |
| useActivityFeed | `src/hooks/bible/useActivityFeed.ts:46-48` | Reads `getBibleStreak().count` into totalCounts |
| BibleReader | `src/pages/BibleReader.tsx:277-299` | Read-tracking stub with `// TODO BB-17` — writes `wr_bible_last_read` and `wr_bible_progress` |
| BibleStreak type | `src/types/bible-landing.ts:19-23` | Simple `{ count, lastReadDate }` shape |

**Modal pattern to follow:** `BibleSettingsModal.tsx` — uses `useFocusTrap(isOpen, handleClose)`, backdrop click dismiss, `role="dialog"` + `aria-modal="true"`, frosted glass `rgba(15, 10, 30, 0.95)` + `backdrop-blur(16px)`, X close button with 44px tap target.

**Toast:** `useToast()` from `@/components/ui/Toast` — `showToast(message, 'success')`. Available anywhere inside `ToastProvider`.

**Constants file:** `src/constants/bible.ts` — stores all `bible:*` key constants. New keys should be added here.

**Test patterns:** Store tests use `vi.resetModules()` + dynamic `await import()` per test to get fresh module-level cache (`highlightStore.test.ts:4-8`). `localStorage.clear()` in `beforeEach`. Component tests use `render()` from RTL.

### Provider Wrapping for Tests

- StreakChip tests: none needed (pure presentational)
- Modal tests: `ToastProvider` wrapper for `useToast`
- Landing/MyBible page tests: full Router + provider wrapping (existing test files show the pattern)

---

## Auth Gating Checklist

**No auth gating.** The streak system is entirely device-local. All actions work identically for logged-in and logged-out users. This follows the Bible redesign wave's principle: no account required for any Bible feature.

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| View streak chip | No auth | Step 4 | N/A |
| Tap streak chip (open modal) | No auth | Step 4/5 | N/A |
| View My Bible streak stat | No auth | Step 6 | N/A |
| Read a chapter (triggers recordReadToday) | No auth | Step 7 | N/A |
| View streak reset welcome | No auth | Step 5 | N/A |

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Modal backdrop | background | `rgba(15, 10, 30, 0.95)` with `backdrop-filter: blur(16px)` | BibleSettingsModal.tsx:164 |
| Modal outer overlay | background | `bg-black/50` | BibleSettingsModal.tsx:159 |
| Modal panel border | border | `border border-white/[0.12]` | BibleSettingsModal.tsx:163 |
| Modal max-width | max-width | `max-w-lg` (32rem / 512px) → spec says 480px, use `max-w-[480px]` | Spec requirement |
| Close button | sizing | `h-11 w-11` (44px), `rounded-full`, `text-white/60 hover:bg-white/5 hover:text-white` | BibleSettingsModal.tsx:174-175 |
| FrostedCard | classes | `bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] rounded-2xl` + dual box-shadow | 09-design-system.md |
| Flame icon (normal) | color | `text-orange-400` | StreakChip.tsx:22 |
| Flame icon (at-risk) | color | `text-warning` (`#F39C12`) | Spec: "warmer, more attention-grabbing tone" |
| StreakChip pill | classes | `bg-white/[0.06] border border-white/[0.12] rounded-full px-3 py-1.5 text-sm font-semibold text-white min-h-[44px]` | StreakChip.tsx:20-21 |
| Primary text | color | `text-white` | design-system.md |
| Secondary text | color | `text-white/60` | design-system.md |
| Gradient text | style | `GRADIENT_TEXT_STYLE`: `linear-gradient(223deg, #FFFFFF 0%, #8B5CF6 100%)` via `background-clip: text` | design-system.md |
| Grace indicator (available) | color | `text-success` (`#27AE60`) | Spec: "green indicator" |
| Grace indicator (used) | color | `text-white/40` | Spec: "muted indicator" |
| Mini-grid read day | color | `bg-primary` (`#6D28D9`) | Spec |
| Mini-grid empty day | border | `border border-white/20` | Spec |
| Mini-grid grace day | border | `ring-2 ring-warning` with `bg-primary` fill | Spec: "ringed" |

---

## Design System Reminder

**Project-specific quirks displayed before every UI step:**

- Worship Room uses `GRADIENT_TEXT_STYLE` (white-to-purple gradient via `background-clip: text`) for hero and section headings on dark backgrounds. Caveat font deprecated for headings — used only for the logo.
- The Bible Landing page uses `bg-dashboard-dark` (`#0f0a1e`) background, NOT `bg-hero-bg`. Orbs are via `BibleLandingOrbs`.
- Frosted glass cards: `bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] rounded-2xl` with dual box-shadow. Use the `FrostedCard` component, not a hand-rolled card.
- Modal pattern: `rgba(15, 10, 30, 0.95)` background + `backdrop-blur(16px)`, `useFocusTrap`, backdrop click + Escape + X button close, `role="dialog"` + `aria-modal="true"`, max-height 90vh overflow-y-auto.
- Mood colors: Struggling=#D97706, Heavy=#C2703E, Okay=#8B7FA8, Good=#2DD4BF, Thriving=#34D399.
- All tap targets minimum 44px.
- Toast: `useToast()` → `showToast(message, 'success')`. Requires `ToastProvider` ancestor.
- No deprecated patterns: no Caveat headings, no animate-glow-pulse, no cyan borders, no soft-shadow 8px-radius cards.

**No deviations found in recent execution logs** (BB-16, BB-15, BB-14, BB-11b all completed cleanly).

---

## Shared Data Models

### New Types

```typescript
// src/types/bible-streak.ts

export type StreakRecord = {
  currentStreak: number
  longestStreak: number
  lastReadDate: string             // ISO date "YYYY-MM-DD"
  streakStartDate: string          // ISO date the current streak began
  graceDaysAvailable: number       // 0 to 1
  graceDaysUsedThisWeek: number    // 0 to 1
  lastGraceUsedDate: string | null // ISO date when grace was last used
  weekResetDate: string            // ISO Monday of current grace-reset week
  milestones: number[]             // streak counts the user has hit
  totalDaysRead: number            // lifetime distinct days with reads
}

export type StreakDelta = 'same-day' | 'extended' | 'used-grace' | 'reset' | 'first-read'

export type StreakUpdateResult = {
  previousStreak: number
  newStreak: number
  delta: StreakDelta
  milestoneReached: number | null
  graceDaysRemaining: number
  isFirstReadEver: boolean
}

export const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100, 365] as const
```

### localStorage Keys This Spec Touches

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `bible:streak` | Both | Full `StreakRecord` — new key replacing `wr_bible_streak` |
| `bible:streakResetAcknowledged` | Both | `{ date: string }` — reset welcome screen dismissal |
| `wr_bible_streak` | Read (migration) | Old simple `{ count, lastReadDate }` — read once for migration, then unused |
| `wr_bible_last_read` | Read (unchanged) | BibleReader still writes this independently |
| `wr_bible_progress` | Read (unchanged) | BibleReader still writes this independently |

### Constants to Add

```typescript
// In src/constants/bible.ts
export const BIBLE_STREAK_KEY = 'bible:streak'
export const BIBLE_STREAK_RESET_ACK_KEY = 'bible:streakResetAcknowledged'
```

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | StreakChip inline in landing hero. Modal full-width with 16px side padding + bottom-sheet style (rounded top only). Stats row stacks vertically. 7-day grid squares 32px. |
| Tablet | 768px | Same as mobile. Modal centered max-w-[480px]. Stats row horizontal. |
| Desktop | 1440px | StreakChip in landing hero. Modal centered max-w-[480px]. Stats row horizontal. 7-day grid squares 40px. |

---

## Inline Element Position Expectations

| Element Group | Elements | Expected y-alignment | Wrap Tolerance |
|---------------|----------|---------------------|----------------|
| Stats row (modal) | Current streak, Longest ever, Total days | Same y at 768px+ | Stacks vertically below 640px |
| 7-day mini-grid | 7 day squares | Same y at all breakpoints | Never wraps (fixed 7 items) |

---

## Vertical Rhythm

N/A — BB-17 adds components to existing pages (landing, My Bible) and a modal overlay. No new full-page sections.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] BB-0 (landing chip stub), BB-4 (reader tracking stub), BB-14 (My Bible), BB-16 (export/import) are committed
- [x] No auth gating required — all actions are device-local
- [x] Design system values from BibleSettingsModal (modal pattern) and design-system.md (color tokens)
- [x] All [UNVERIFIED] values flagged with verification methods
- [x] No deprecated patterns used
- [x] `bible:streak` key does NOT conflict with any existing key
- [ ] `wr_bible_streak` migration path: old key → new key on first read, old key left in place (not deleted — other code may still read it during transition)

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Grace day cap | 1 per ISO week | Spec says "cap at 1 for now" — keep simple |
| Day boundary | Local midnight (user's device timezone) | Spec decision: simpler than Duolingo's 4 AM rule; scripture reading is often a morning practice |
| Multiple chapters same day | Idempotent — one streak day per calendar day | `recordReadToday()` returns `delta: 'same-day'` on subsequent calls |
| Browser tab across midnight | Chapter loads at 11:55 PM records that day; new chapter at 12:05 AM records next day | Spec: "slightly generous and intentional" |
| Time zone travel | Accepted edge case; grace day covers skip case | Spec: "travel is rare enough that fixing adds complexity for marginal benefit" |
| localStorage cleared | Streak is gone; BB-16 export does NOT include streak | Spec: "streaks are tied to a device's lived experience, not transferable data" |
| At-risk check interval | 1-minute interval when page visible + mount + store subscribe | Spec: sub-millisecond cost (string comparison + localStorage read) |
| Migration from `wr_bible_streak` | On first `getStreak()` call, if `bible:streak` is empty but `wr_bible_streak` exists, create a partial StreakRecord from old data | Preserves existing streak count across the transition |
| `streakStartDate` on grace use | Does NOT update (grace preserves the streak, including its start date) | Spec: "`streakStartDate` updates on extension and reset, not on grace use" |
| Milestone toast position | Top of screen, auto-dismiss 4s | Spec: "small, positioned at top of screen, no confetti" — use `showToast` |
| Streak reset welcome screen | Full-screen overlay, not a modal inside the landing page | Shows once per reset via `bible:streakResetAcknowledged` |

---

## Implementation Steps

### Step 1: Date Utilities

**Objective:** Create `dateUtils.ts` with pure date functions that the streak store depends on.

**Files to create:**
- `frontend/src/lib/bible/dateUtils.ts` — date utility functions
- `frontend/src/lib/bible/__tests__/dateUtils.test.ts` — tests

**Details:**

```typescript
// dateUtils.ts
export function getTodayLocal(): string
// Returns YYYY-MM-DD in user's local timezone using Intl.DateTimeFormat or manual Date methods

export function daysBetween(startDate: string, endDate: string): number
// Parse both as dates, return Math.round((end - start) / 86400000)
// daysBetween('2026-04-09', '2026-04-09') === 0
// daysBetween('2026-04-09', '2026-04-10') === 1

export function getISOWeekStart(date: string): string
// Return the Monday of the ISO week containing the given date
// Monday = day 1 in ISO weeks

export function getYesterday(date: string): string
// Return the date one day before the given date
```

Implementation notes:
- Use `new Date(date + 'T00:00:00')` for parsing to avoid UTC vs local issues
- `getTodayLocal()` uses `new Date()` and formats manually with local year/month/day getters
- All functions are pure (no side effects, no localStorage)

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- Do NOT use `Date.parse()` — it has inconsistent timezone handling across browsers
- Do NOT use UTC methods for local-timezone operations
- Do NOT import any external date libraries (no date-fns, no dayjs)

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| getTodayLocal returns ISO format | unit | Matches `/^\d{4}-\d{2}-\d{2}$/` pattern |
| daysBetween same day | unit | Returns 0 |
| daysBetween 1 day | unit | Returns 1 |
| daysBetween multi-day | unit | Returns correct count |
| daysBetween year boundary | unit | `daysBetween('2025-12-31', '2026-01-01') === 1` |
| getISOWeekStart returns Monday | unit | For a Wednesday input, returns previous Monday |
| getISOWeekStart already Monday | unit | Returns same date |
| getISOWeekStart Sunday | unit | Returns previous Monday |
| getISOWeekStart year boundary | unit | Week crossing year boundary returns correct Monday |
| getYesterday basic | unit | `getYesterday('2026-04-09') === '2026-04-08'` |
| getYesterday month boundary | unit | `getYesterday('2026-04-01') === '2026-03-31'` |
| getYesterday year boundary | unit | `getYesterday('2026-01-01') === '2025-12-31'` |

**Expected state after completion:**
- [ ] `dateUtils.ts` exists with 4 exported functions
- [ ] All 12+ tests pass
- [ ] Functions are pure — no side effects

---

### Step 2: Streak Store

**Objective:** Create the reactive streak store following the BB-7 pattern, with `recordReadToday()` as the core mutation.

**Files to create:**
- `frontend/src/lib/bible/streakStore.ts` — reactive store
- `frontend/src/lib/bible/__tests__/streakStore.test.ts` — tests
- `frontend/src/types/bible-streak.ts` — types

**Files to modify:**
- `frontend/src/constants/bible.ts` — add `BIBLE_STREAK_KEY` and `BIBLE_STREAK_RESET_ACK_KEY` constants

**Details:**

Follow the BB-7 pattern from `highlightStore.ts`:

```typescript
// Module-level state
let cache: StreakRecord | null = null
const listeners = new Set<() => void>()

// Storage I/O
const STORAGE_KEY = BIBLE_STREAK_KEY // 'bible:streak'

function readFromStorage(): StreakRecord { ... }  // SSR-safe: returns DEFAULT_STREAK if window undefined
function writeToStorage(data: StreakRecord): void { ... }  // SSR-safe: no-op if window undefined
function getCache(): StreakRecord { ... }
function notifyListeners(): void { ... }

// Default state
const DEFAULT_STREAK: StreakRecord = {
  currentStreak: 0,
  longestStreak: 0,
  lastReadDate: '',
  streakStartDate: '',
  graceDaysAvailable: 1,
  graceDaysUsedThisWeek: 0,
  lastGraceUsedDate: null,
  weekResetDate: '', // set on first actual use via getISOWeekStart(getTodayLocal())
  milestones: [],
  totalDaysRead: 0,
}

// Read API
export function getStreak(): StreakRecord { ... }

// Write API
export function recordReadToday(): StreakUpdateResult { ... }

// Subscription
export function subscribe(listener: () => void): () => void { ... }

// Test helper
export function _resetForTesting(): void { cache = null }
```

**`recordReadToday()` logic flow:**

1. `const today = getTodayLocal()`
2. Get current streak via `getCache()`
3. Reset week-grace if `weekResetDate` is in a previous ISO week: compare `getISOWeekStart(today) !== record.weekResetDate`
4. Compare `today` to `lastReadDate`:
   - **Case A** (`today === lastReadDate`): return `{ delta: 'same-day', ... }`
   - **Case B** (`lastReadDate === ''`): first read ever — set streak=1, streakStartDate=today, totalDaysRead=1
   - **Case C** (`daysBetween(lastReadDate, today) === 1`): consecutive — increment streak, totalDaysRead
   - **Case D** (`daysBetween(lastReadDate, today) === 2`): 2-day gap
     - Grace available (`graceDaysUsedThisWeek === 0` AND `graceDaysAvailable >= 1`): use grace, increment streak, totalDaysRead, set `lastGraceUsedDate`
     - No grace: reset to 1
   - **Case E** (`daysBetween(lastReadDate, today) >= 3`): reset to 1
5. Update `longestStreak = Math.max(longestStreak, currentStreak)`
6. Milestone check: if `currentStreak` in `[3, 7, 14, 30, 60, 100, 365]` and not in `milestones`, push it
7. `writeToStorage()` + `notifyListeners()`

**Migration from `wr_bible_streak`:**

In `readFromStorage()`, if `bible:streak` is empty but `wr_bible_streak` has data:
```typescript
const oldRaw = localStorage.getItem('wr_bible_streak')
if (oldRaw) {
  const old = JSON.parse(oldRaw) as { count: number; lastReadDate: string }
  // Build a partial StreakRecord from old data
  const migrated: StreakRecord = {
    ...DEFAULT_STREAK,
    currentStreak: old.count,
    longestStreak: old.count,
    lastReadDate: old.lastReadDate,
    streakStartDate: '', // unknown — accept data loss
    totalDaysRead: old.count, // best estimate
  }
  writeToStorage(migrated)
  return migrated
}
```

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- Do NOT read/write localStorage during module initialization (SSR-safe)
- Do NOT use `Date.now()` for day comparison — always use `getTodayLocal()` for the date string
- Do NOT delete `wr_bible_streak` during migration — other code may still reference it briefly
- Do NOT make `recordReadToday()` async — it's synchronous localStorage

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| getStreak returns default when empty | unit | All fields match DEFAULT_STREAK |
| SSR-safe: getStreak returns default on server | unit | Mock `typeof window === 'undefined'` |
| recordReadToday first read ever | unit | streak=1, delta='first-read', totalDaysRead=1 |
| recordReadToday same day idempotent | unit | Call twice, streak stays 1, delta='same-day' |
| recordReadToday consecutive day | unit | streak increments, delta='extended' |
| recordReadToday 2-day gap with grace | unit | grace used, streak increments, delta='used-grace', graceDaysUsedThisWeek=1 |
| recordReadToday 2-day gap without grace | unit | streak resets to 1, delta='reset' |
| recordReadToday 3+ day gap always resets | unit | Even with grace available, resets |
| longestStreak survives reset | unit | Build to 10, gap 3 days, longestStreak=10, currentStreak=1 |
| graceDaysUsedThisWeek resets on ISO week boundary | unit | Use grace Monday, advance to next Monday, grace available again |
| milestone detection 3 days | unit | streak=3 → milestoneReached=3 |
| milestone detection 7 days | unit | streak=7 → milestoneReached=7 |
| milestone deduplication | unit | Same milestone not added twice |
| streakStartDate updates on extension not grace | unit | Grace use preserves streakStartDate; reset changes it |
| totalDaysRead accumulates across resets | unit | Read 5 days, reset, read 3 days → totalDaysRead=8 |
| migration from wr_bible_streak | unit | Old key read, StreakRecord created with correct count/lastReadDate |
| subscribe notifies on recordReadToday | unit | Listener called after mutation |
| week boundary year boundary | unit | ISO week spanning year boundary resets correctly |
| recordReadToday returns isFirstReadEver correctly | unit | true only when lastReadDate was '' |

**Expected state after completion:**
- [ ] `streakStore.ts` exists following BB-7 reactive pattern
- [ ] `bible-streak.ts` types file created
- [ ] Constants added to `bible.ts`
- [ ] All 18+ tests pass
- [ ] `recordReadToday()` is idempotent within a day

---

### Step 3: useStreakStore Hook

**Objective:** Create a React hook that subscribes to the streak store for reactive UI updates, and provides the at-risk check.

**Files to create:**
- `frontend/src/hooks/bible/useStreakStore.ts` — React subscription hook

**Details:**

```typescript
import { useCallback, useEffect, useRef, useState } from 'react'
import { getStreak, subscribe } from '@/lib/bible/streakStore'
import { getTodayLocal, getYesterday } from '@/lib/bible/dateUtils'
import type { StreakRecord } from '@/types/bible-streak'

export function useStreakStore() {
  const [streak, setStreak] = useState<StreakRecord>(getStreak)

  // Subscribe to store changes
  useEffect(() => {
    const unsubscribe = subscribe(() => setStreak(getStreak()))
    return unsubscribe
  }, [])

  // At-risk: streak > 0, lastReadDate is yesterday, local time past 6 PM
  const [atRisk, setAtRisk] = useState(false)

  const checkAtRisk = useCallback(() => {
    const s = getStreak()
    if (s.currentStreak <= 0 || !s.lastReadDate) {
      setAtRisk(false)
      return
    }
    const today = getTodayLocal()
    const yesterday = getYesterday(today)
    const now = new Date()
    const isPast6PM = now.getHours() >= 18
    setAtRisk(s.lastReadDate === yesterday && isPast6PM)
  }, [])

  // Check on mount, on store change, and on 1-minute interval
  useEffect(() => {
    checkAtRisk()
    const interval = setInterval(checkAtRisk, 60_000)
    return () => clearInterval(interval)
  }, [checkAtRisk, streak]) // re-check when streak changes

  return { streak, atRisk }
}
```

No tests for this hook in isolation — it's a thin subscription wrapper. Tested indirectly via component integration tests in Steps 4-5.

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- Do NOT duplicate streak logic in the hook — delegate to the store
- Do NOT use `setInterval` with less than 60s — the spec says 1-minute cadence

**Expected state after completion:**
- [ ] `useStreakStore.ts` exists with `streak` state and `atRisk` boolean
- [ ] Subscribes to store and updates on changes

---

### Step 4: StreakChip Replacement + Landing Page Wiring

**Objective:** Replace the StreakChip stub with a real component wired to the streak store, add at-risk visual state, milestone celebration, and open the streak detail modal on click.

**Files to modify:**
- `frontend/src/components/bible/landing/StreakChip.tsx` — rewrite with store subscription
- `frontend/src/pages/BibleLanding.tsx` — wire real streak data from hook, pass modal open handler
- `frontend/src/components/bible/landing/__tests__/StreakChip.test.tsx` — rewrite tests
- `frontend/src/pages/__tests__/BibleLanding.test.tsx` — update mock streak data

**Files to modify (landing state cleanup):**
- `frontend/src/lib/bible/landingState.ts` — update `getBibleStreak()` to read from new store
- `frontend/src/lib/bible/__tests__/landingState.test.ts` — update tests

**Details:**

**StreakChip rewrite:**

```typescript
interface StreakChipProps {
  streak: StreakRecord
  atRisk: boolean
  pendingMilestone: number | null  // non-null when a milestone was just crossed
  onMilestoneDismissed: () => void
  onClick: () => void
}
```

- Hidden when `streak.currentStreak <= 0` (return null)
- Flame icon: `text-orange-400` normally, `text-warning` when `atRisk`
- Glow: `shadow-[0_0_20px_rgba(139,92,246,0.30)]` for streak > 7, `shadow-[0_0_12px_rgba(139,92,246,0.15)]` for streak <= 7
- At-risk tooltip: `title="Read today to keep your streak"` when atRisk
- Milestone pulse: when `pendingMilestone` is non-null, add `animate-pulse` class (removed when `prefers-reduced-motion: reduce` — use `motion-reduce:animate-none`). After 4s, call `onMilestoneDismissed()`.
- Text: `"{count} day streak"`
- `aria-label="Reading streak: {count} days. Tap for details."` for screen readers

**BibleLanding wiring:**

Replace the manual `useState` + `getBibleStreak()` pattern with `useStreakStore()`:

```typescript
const { streak, atRisk } = useStreakStore()
const [modalOpen, setModalOpen] = useState(false)
const [pendingMilestone, setPendingMilestone] = useState<number | null>(null)

// Check for milestone on mount and store change
useEffect(() => {
  const lastMilestone = streak.milestones[streak.milestones.length - 1]
  // Show milestone if it matches current streak and hasn't been displayed yet
  // Track displayed milestones in a ref to avoid re-showing on re-renders
  ...
}, [streak])
```

Pass to StreakChip:
```tsx
<StreakChip
  streak={streak}
  atRisk={atRisk}
  pendingMilestone={pendingMilestone}
  onMilestoneDismissed={() => setPendingMilestone(null)}
  onClick={() => setModalOpen(true)}
/>
```

**Milestone toast:** When `pendingMilestone` becomes non-null, call `showToast('{N} day streak!', 'success')`. The toast auto-dismisses. This means `BibleLandingInner` needs to be inside a `ToastProvider` (check if it already is — if not, wrap at the BibleLanding export level).

**Update `landingState.ts:getBibleStreak()`:** Read from `getStreak()` in streakStore and return the old `BibleStreak` shape for backward compatibility with `useActivityFeed`:
```typescript
export function getBibleStreak(): BibleStreak | null {
  const record = getStreak()
  if (record.currentStreak <= 0) return null
  return { count: record.currentStreak, lastReadDate: record.lastReadDate }
}
```

**Responsive behavior:**
- Desktop (1440px): Streak chip centered in landing `space-y-8` section, 44px tall pill
- Tablet (768px): Same layout
- Mobile (375px): Same layout — chip is inline-flex so it shrinks to content

**Guardrails (DO NOT):**
- Do NOT remove the `console.log` stub in BibleLanding until the modal is wired (Step 5)
- Do NOT show "0 day streak" — hide the chip entirely when streak is 0
- Do NOT use confetti or full-screen animation for milestones — only a toast + brief pulse

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| StreakChip hidden when currentStreak is 0 | unit | Returns null |
| StreakChip renders count and flame | unit | Text "{N} day streak" + SVG present |
| StreakChip flame color normal | unit | `text-orange-400` class when not at risk |
| StreakChip flame color at-risk | unit | `text-warning` class when atRisk=true |
| StreakChip has min-h-[44px] | unit | Tap target requirement |
| StreakChip click calls onClick | unit | fireEvent.click → handler called |
| StreakChip at-risk title attribute | unit | Has `title="Read today to keep your streak"` |
| StreakChip milestone pulse class | unit | Has `animate-pulse` when pendingMilestone is non-null |
| StreakChip milestone pulse respects reduced motion | unit | Has `motion-reduce:animate-none` |
| BibleLanding renders streak chip when streak > 0 | integration | Mock store with count=5, chip visible |
| BibleLanding hides streak chip when streak = 0 | integration | Default store, no chip rendered |

**Expected state after completion:**
- [ ] StreakChip wired to real store data
- [ ] At-risk visual state works (flame color change + tooltip)
- [ ] Milestone pulse + toast fires once per milestone
- [ ] Clicking chip triggers onClick handler
- [ ] All 11 tests pass

---

### Step 5: Streak Detail Modal + Streak Reset Welcome

**Objective:** Create the streak detail modal and the streak reset welcome screen.

**Files to create:**
- `frontend/src/components/bible/streak/StreakDetailModal.tsx` — detail modal
- `frontend/src/components/bible/streak/StreakResetWelcome.tsx` — reset welcome overlay
- `frontend/src/components/bible/streak/MiniGrid.tsx` — 7-day activity mini-grid
- `frontend/src/components/bible/streak/__tests__/StreakDetailModal.test.tsx` — modal tests
- `frontend/src/components/bible/streak/__tests__/StreakResetWelcome.test.tsx` — reset tests
- `frontend/src/components/bible/streak/__tests__/MiniGrid.test.tsx` — grid tests

**Files to modify:**
- `frontend/src/pages/BibleLanding.tsx` — mount modal + reset welcome, pass state

**Details:**

**StreakDetailModal:**

Follow `BibleSettingsModal.tsx` modal pattern exactly:

```typescript
interface StreakDetailModalProps {
  isOpen: boolean
  onClose: () => void
  streak: StreakRecord
  atRisk: boolean
}
```

Modal structure (top to bottom):
1. **Header:** "Reading streak" + X close button (44px tap target)
2. **Big streak number:** `text-5xl font-bold text-white` with Flame icon alongside. Use gradient text on the number via `GRADIENT_TEXT_STYLE`.
3. **Dynamic subtitle:**
   - Streak active: "You've read {X} days in a row."
   - Grace used today (streak.lastGraceUsedDate === getTodayLocal()): "You used your grace day. Your streak is safe."
   - At risk: "Read today to keep your streak alive."
   - Streak just broken (currentStreak <= 1 and longestStreak > 1): "Fresh start. You've got this."
4. **Stats row:** Three stat items in a flex row (sm:flex-row, flex-col on mobile):
   - Current streak (large): `text-3xl font-bold text-white`
   - Longest ever (medium): `text-xl font-semibold text-white/80`
   - Total days read (medium): `text-xl font-semibold text-white/80`
5. **Grace day status:**
   - Available: green dot (`bg-success rounded-full w-2 h-2`) + "Grace day available"
   - Used: muted dot (`bg-white/30 rounded-full w-2 h-2`) + "Grace day used (resets {dayOfWeek})" where dayOfWeek is the next Monday
   - Caption: "Miss one day a week without losing your streak." in `text-sm text-white/40`
6. **7-day mini-grid:** `<MiniGrid streak={streak} />` component (see below)
7. **Footer caption:** "Streaks help, but they aren't the point. Read because it matters, not because of the count." in `text-xs text-white/40 text-center`

Modal visual: `rgba(15, 10, 30, 0.95)` + `backdrop-blur(16px)`, `border border-white/[0.12]`, `sm:max-w-[480px] sm:rounded-2xl`, `max-h-[90vh] overflow-y-auto`.

**MiniGrid:**

```typescript
interface MiniGridProps {
  streak: StreakRecord
}
```

Renders 7 squares for the last 7 days (today → 6 days ago, left to right = oldest to newest). Each square:
- **Read day** (has progress in `wr_bible_progress` or `lastReadDate` matches): filled `bg-primary rounded-lg` 
- **Grace day** (date === `lastGraceUsedDate`): filled `bg-primary rounded-lg ring-2 ring-warning`
- **Empty day**: `border border-white/20 rounded-lg` with transparent fill

Day labels (M, T, W, T, F, S, S) below each square in `text-xs text-white/40`.

Square sizes: `w-8 h-8 sm:w-10 sm:h-10` (32px mobile, 40px desktop).

To determine if a day was a "read" day: use `getTodayLocal()`, walk back 7 days via `getYesterday()`, and check if each date === `streak.lastReadDate` or falls within the streak window. More precisely: a day is "read" if `daysBetween(day, streak.lastReadDate) < streak.currentStreak` and `day >= streak.streakStartDate`. For days before the streak start or in a gap, mark empty.

Simplification: since we don't have per-day-read history in the streak store (only the streak count and last read date), we infer: the last `currentStreak` days ending at `lastReadDate` were all read days (accounting for one grace day gap if `lastGraceUsedDate` is within the streak window).

**StreakResetWelcome:**

```typescript
interface StreakResetWelcomeProps {
  previousStreak: number
  onContinue: () => void
}
```

Full-screen overlay (z-50, fixed inset-0, dark background):
- "Welcome back." in `text-3xl font-bold text-white`
- Subtitle with previous streak info
- "Today is day 1 of whatever comes next." in `text-lg text-white/80`
- "Continue" button: white pill CTA Pattern 2 (`bg-white text-hero-bg px-8 py-3 rounded-full font-semibold min-h-[44px]`)

Tracked via `bible:streakResetAcknowledged` localStorage key:
```typescript
const ackRaw = localStorage.getItem(BIBLE_STREAK_RESET_ACK_KEY)
const ack = ackRaw ? JSON.parse(ackRaw) : null
// Show if: delta was 'reset' and ack?.date !== today
```

**BibleLanding integration:**

```tsx
// In BibleLandingInner:
const [modalOpen, setModalOpen] = useState(false)
const [showReset, setShowReset] = useState(false)
const previousStreakRef = useRef(0)

// After recordReadToday result comes in from reader integration (via store subscribe):
// If delta === 'reset' and no ack for today, show reset welcome
// On Continue: write ack + setShowReset(false)

{showReset && (
  <StreakResetWelcome
    previousStreak={previousStreakRef.current}
    onContinue={handleResetAcknowledged}
  />
)}
{modalOpen && (
  <StreakDetailModal
    isOpen={modalOpen}
    onClose={() => setModalOpen(false)}
    streak={streak}
    atRisk={atRisk}
  />
)}
```

Note: The reset welcome is triggered when the user navigates to the landing page after a reset happened in the reader. The landing page checks on mount: if streak.currentStreak === 1 and streak.longestStreak > 1 and no ack for today's date, show it.

**Responsive behavior:**
- Desktop (1440px): Modal centered, max-w-[480px], stats row horizontal, 40px grid squares
- Tablet (768px): Modal centered, max-w-[480px], stats row horizontal
- Mobile (375px): Modal full-width (bottom-sheet style: `items-end sm:items-center`), stats stack vertically, 32px grid squares

**Guardrails (DO NOT):**
- Do NOT add confetti, full-screen animations, or heavy visual effects
- Do NOT make the footer caption preachy — the spec wording is intentionally gentle
- Do NOT show the reset welcome screen on the very first visit (only after a genuine streak reset)
- Do NOT use `FrostedCard` for the modal panel itself — use the direct glass pattern from BibleSettingsModal (the panel IS the card)

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| StreakDetailModal renders title and close button | unit | "Reading streak" heading + X button present |
| StreakDetailModal shows big streak number | unit | streak.currentStreak displayed large |
| StreakDetailModal subtitle active streak | unit | "You've read X days in a row." |
| StreakDetailModal subtitle grace used | unit | Shows grace message when lastGraceUsedDate is today |
| StreakDetailModal subtitle at-risk | unit | "Read today to keep your streak alive." |
| StreakDetailModal stats row | unit | Current, Longest, Total all rendered |
| StreakDetailModal grace available indicator | unit | Green dot + "Grace day available" text |
| StreakDetailModal grace used indicator | unit | Muted dot + "Grace day used (resets Monday)" |
| StreakDetailModal footer caption | unit | Gentle message text present |
| StreakDetailModal closes on backdrop click | unit | onClose called |
| StreakDetailModal closes on Escape | unit | useFocusTrap handles Escape → onClose |
| StreakDetailModal closes on X button | unit | Click X → onClose called |
| StreakDetailModal role="dialog" | unit | Has correct ARIA attributes |
| MiniGrid renders 7 squares | unit | 7 squares present in DOM |
| MiniGrid marks read days with bg-primary | unit | Correct squares have primary fill |
| MiniGrid marks grace day with ring-warning | unit | Grace day square has ring |
| MiniGrid marks empty days with border | unit | Unread squares have border only |
| MiniGrid day labels present | unit | 7 day-of-week labels rendered |
| StreakResetWelcome renders heading | unit | "Welcome back." text present |
| StreakResetWelcome shows previous streak | unit | Subtitle mentions streak count |
| StreakResetWelcome Continue button | unit | Button click calls onContinue |
| StreakResetWelcome min tap target | unit | Continue button has min-h-[44px] |

**Expected state after completion:**
- [ ] StreakDetailModal opens/closes with correct content
- [ ] MiniGrid renders 7 days correctly
- [ ] StreakResetWelcome shows once per reset
- [ ] Modal accessible (focus trap, Escape, ARIA)
- [ ] All 22 tests pass

---

### Step 6: My Bible Quick Stats Integration

**Objective:** Wire the My Bible streak stat card to live store data and make it tappable to open the streak detail modal.

**Files to modify:**
- `frontend/src/pages/MyBiblePage.tsx` — make streak stat tappable, add modal
- `frontend/src/hooks/bible/useActivityFeed.ts` — update streak source to use store

**Details:**

In `useActivityFeed.ts`, the `computeTotalCounts` function already calls `getBibleStreak()` from `landingState.ts`. Since Step 4 updated `getBibleStreak()` to read from the new store, this already works. However, we should also subscribe to the streak store so `totalCounts.streak` updates reactively:

```typescript
// In useActivityFeed's useEffect:
import { subscribe as subscribeStreak } from '@/lib/bible/streakStore'

useEffect(() => {
  const unsubs = [
    subscribeHighlights(reload),
    subscribeBookmarks(reload),
    subscribeNotes(reload),
    subscribeStreak(reload), // NEW — react to streak changes
  ]
  return () => unsubs.forEach((fn) => fn())
}, [])
```

In `MyBiblePage.tsx`, make the streak stat card a `<button>` (it's currently a `<div>`) and add the StreakDetailModal:

```tsx
const [streakModalOpen, setStreakModalOpen] = useState(false)
const { streak: streakRecord, atRisk } = useStreakStore()

// In the stats row, replace the streak div with:
{totalCounts.streak > 0 && (
  <button
    type="button"
    onClick={() => setStreakModalOpen(true)}
    className="flex min-w-[100px] flex-shrink-0 snap-start flex-col items-center gap-1 rounded-xl border border-white/[0.12] bg-white/[0.06] px-4 py-3 backdrop-blur-sm transition-colors hover:bg-white/[0.09] min-h-[44px]"
    aria-label={`Reading streak: ${totalCounts.streak} days. Tap for details.`}
  >
    <Flame size={16} className="text-white/40" />
    <span className="text-xl font-bold text-white">{totalCounts.streak}</span>
    <span className="text-xs text-white/50">Streak</span>
  </button>
)}

// Mount modal:
{streakModalOpen && (
  <StreakDetailModal
    isOpen={streakModalOpen}
    onClose={() => setStreakModalOpen(false)}
    streak={streakRecord}
    atRisk={atRisk}
  />
)}
```

**Responsive behavior:**
- Desktop (1440px): Stat card in horizontal scroll row, same sizing as other stat cards
- Tablet (768px): Same
- Mobile (375px): Same — horizontal scroll with snap

**Guardrails (DO NOT):**
- Do NOT change the visual appearance of the stat card itself (keep consistent with other stat cards)
- Do NOT add the streak store subscription if `useActivityFeed` is not already subscribing to other stores (it is — lines 64-71)

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| My Bible streak stat tappable | integration | Streak card is a button element |
| My Bible streak stat opens modal | integration | Click streak → modal appears |
| My Bible streak stat has aria-label | unit | Accessible label with count |
| useActivityFeed subscribes to streak store | unit | Listener added on mount, removed on unmount |

**Expected state after completion:**
- [ ] My Bible streak stat is a tappable button
- [ ] Tapping opens StreakDetailModal
- [ ] Streak count updates reactively via store subscription
- [ ] All 4 tests pass

---

### Step 7: BibleReader Integration

**Objective:** Add `recordReadToday()` call to the BibleReader's existing read-tracking effect.

**Files to modify:**
- `frontend/src/pages/BibleReader.tsx` — add streak recording after existing progress tracking
- `frontend/src/pages/__tests__/BibleReader.test.tsx` — add streak recording test

**Details:**

In `BibleReader.tsx` around line 279-299 (the read-tracking `useEffect`), after the existing `wr_bible_last_read` and `wr_bible_progress` writes, add:

```typescript
import { recordReadToday } from '@/lib/bible/streakStore'

// Inside the existing useEffect after the wr_bible_progress write:
recordReadToday()
```

The `// TODO BB-17` comment on line 279 is the marker. Remove the comment and add the import + call.

**Important:** `recordReadToday()` is idempotent within a day. Multiple chapter navigations on the same day produce no streak change after the first. The reader doesn't need to inspect the result — it just reports "the user read a chapter."

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- Do NOT change the existing `wr_bible_last_read` or `wr_bible_progress` logic
- Do NOT inspect or react to the `StreakUpdateResult` in the reader — the reader is a fire-and-forget reporter
- Do NOT gate this behind auth — streak tracking works for all users

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| BibleReader calls recordReadToday on chapter load | integration | Mock `recordReadToday`, verify it's called once after render |
| BibleReader does not call recordReadToday on load error | integration | With load error, `recordReadToday` not called |

**Expected state after completion:**
- [ ] `recordReadToday()` called on every chapter load
- [ ] TODO comment removed
- [ ] Existing read-tracking behavior unchanged
- [ ] 2 tests pass

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Date utility functions |
| 2 | 1 | Streak store (uses dateUtils) |
| 3 | 2 | useStreakStore React hook (wraps store) |
| 4 | 2, 3 | StreakChip rewrite + landing wiring |
| 5 | 2, 3, 4 | Streak detail modal + reset welcome |
| 6 | 2, 3, 5 | My Bible stats integration |
| 7 | 2 | BibleReader integration |

Steps 6 and 7 are independent of each other (both depend on 2/3 but not on each other). They can be executed in either order.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Date Utilities | [COMPLETE] | 2026-04-09 | Created `dateUtils.ts` with 4 pure functions + 12 tests passing |
| 2 | Streak Store | [COMPLETE] | 2026-04-09 | Created `streakStore.ts`, `bible-streak.ts` types, added constants to `bible.ts`. 19 tests passing. |
| 3 | useStreakStore Hook | [COMPLETE] | 2026-04-09 | Created `useStreakStore.ts` with streak state + atRisk boolean. Build passes. |
| 4 | StreakChip + Landing Wiring | [COMPLETE] | 2026-04-09 | Rewrote StreakChip with StreakRecord props, updated BibleLanding to useStreakStore, updated landingState.ts to delegate to store, updated all tests. 31 tests passing. modalOpen state added (consumed in Step 5). |
| 5 | Streak Detail Modal + Reset Welcome | [COMPLETE] | 2026-04-09 | Created StreakDetailModal, StreakResetWelcome, MiniGrid components + mounted in BibleLanding. 24 component tests + 12 BibleLanding tests passing. |
| 6 | My Bible Quick Stats Integration | [COMPLETE] | 2026-04-09 | Made streak stat card a tappable button, mounted StreakDetailModal in MyBiblePage, added streak store subscription to useActivityFeed. 13 existing tests pass. |
| 7 | BibleReader Integration | [COMPLETE] | 2026-04-09 | Added `recordReadToday()` call to BibleReader read-tracking effect, removed TODO comment, added 2 tests. 19 BibleReader tests passing. |
