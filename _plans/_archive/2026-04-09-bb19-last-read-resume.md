# Implementation Plan: BB-19 Last-Read Resume

**Spec:** `_specs/bb-19-last-read-resume.md`
**Date:** 2026-04-09
**Branch:** `bible-redesign`
**Design System Reference:** `_plans/recon/design-system.md` (loaded — captured 2026-04-05)
**Recon Report:** not applicable
**Master Spec Plan:** N/A — standalone spec in the Bible Redesign wave

---

## Architecture Context

### Project Structure

BB-19 replaces the current flat layout of the Bible landing page (`/bible`) — where the ResumeReadingCard and VerseOfTheDay always render side by side — with a priority-based hero system. The hero slot conditionally renders based on recency of reading. It also introduces a shared `useTimeTick` hook that consolidates three separate `setInterval`s (streak, VOTD, last-read) into one, and a new `formatRelativeReadTime` utility with Bible-reader-specific time thresholds.

### Existing Files to Modify

| File | Current State | BB-19 Changes |
|------|--------------|---------------|
| `src/pages/BibleLanding.tsx` | Flat layout: hero, streak chip, 2-col grid (ResumeReadingCard + TodaysPlanCard), VerseOfTheDay, quick actions, search. Reads `getLastRead()` on mount via `useEffect`. | Replace the 2-col grid + VOTD sections with a new `BibleHeroSlot` that composes resume card, VOTD, and lapsed link based on priority state. Wire `useLastRead` hook. |
| `src/components/bible/landing/ResumeReadingCard.tsx` | Basic card with "Pick up where you left off", book + chapter, `timeAgo()` label, single link. No first-line preview, no "next chapter" link. | Full rewrite: large display heading, first-line preview (~80 chars), relative time label via `formatRelativeReadTime`, "Continue" white pill button, "Or read the next chapter" secondary link. Warm accent border. |
| `src/components/bible/landing/VerseOfTheDay.tsx` | Full VOTD card with share, read-in-context, save actions. Wraps in `mx-auto max-w-2xl`. | No structural changes to the card itself. Container width changes handled by the parent `BibleHeroSlot`. |
| `src/hooks/bible/useVerseOfTheDay.ts` | Runs its own 60s `setInterval` for midnight polling. | Refactor to consume `useTimeTick` instead of managing its own interval. |
| `src/hooks/bible/useStreakStore.ts` | Runs its own 60s `setInterval` for at-risk checking. | Refactor to consume `useTimeTick` instead of managing its own interval. |
| `src/lib/bible/landingState.ts` | `getLastRead()` reads + validates `wr_bible_last_read`. | No changes — consumed by the new `useLastRead` hook. |

### New Files

| File | Purpose |
|------|---------|
| `src/hooks/bible/useTimeTick.ts` | Shared 60-second time tick with Page Visibility API pause/resume |
| `src/hooks/bible/useLastRead.ts` | Derives active/lapsed/first-time reader state from `wr_bible_last_read` + time tick |
| `src/lib/bible/timeFormat.ts` | `formatRelativeReadTime(timestamp, now?)` pure utility |
| `src/components/bible/landing/BibleHeroSlot.tsx` | Composes resume card, VOTD card, and lapsed link based on priority state |
| `src/hooks/bible/__tests__/useTimeTick.test.ts` | Tests for the shared time tick |
| `src/hooks/bible/__tests__/useLastRead.test.ts` | Tests for the last-read hook |
| `src/lib/bible/__tests__/timeFormat.test.ts` | Tests for `formatRelativeReadTime` |
| `src/components/bible/landing/__tests__/BibleHeroSlot.test.tsx` | Tests for the hero slot composition |

### Existing Infrastructure (reused, not modified)

| Component | File | Usage |
|-----------|------|-------|
| `getLastRead()` | `src/lib/bible/landingState.ts` | Reads + validates `wr_bible_last_read` |
| `loadChapterWeb()` | `src/data/bible/index.ts` | Loads chapter JSON for first-line preview |
| `getAdjacentChapter()` | `src/data/bible/index.ts` | Checks if next chapter exists for "next chapter" link |
| `BIBLE_BOOKS` | `src/constants/bible.ts` | Book name ↔ slug lookup |
| `FrostedCard` | `src/components/homepage/FrostedCard.tsx` | Card container |
| `VerseOfTheDay` | `src/components/bible/landing/VerseOfTheDay.tsx` | Existing VOTD card (reused as-is) |
| `TodaysPlanCard` | `src/components/bible/landing/TodaysPlanCard.tsx` | Remains in the layout, but repositioned |

### Provider Wrapping for Tests

- `BibleHeroSlot.test.tsx`: `MemoryRouter` + `AuthModalProvider` + `ToastProvider` (VerseOfTheDay uses auth modal for Save)
- `useLastRead.test.ts`: `renderHook` with mocked `loadChapterWeb` and `localStorage`
- `useTimeTick.test.ts`: `renderHook` with fake timers and `document.visibilityState` stubs
- `timeFormat.test.ts`: Pure function tests, no wrappers needed

### Test Patterns

- Hook tests: `renderHook` + `waitFor` + `vi.useFakeTimers` (see `useVerseOfTheDay.test.ts` lines 1-202)
- Component tests: `render` with `MemoryRouter` wrapper (see `ResumeReadingCard.test.tsx` lines 1-78)
- Store/utility tests: `localStorage.clear()` in `beforeEach`, `vi.resetModules()` for module cache (see `landingState.test.ts` lines 1-103)

---

## Auth Gating Checklist

**No new auth gates.** The resume card reads from localStorage which exists for all users. The VOTD Save action is already auth-gated in `VerseOfTheDay.tsx`. No changes needed.

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| View resume card | No auth | Step 4 | N/A |
| Tap "Continue" | No auth | Step 4 | N/A |
| Tap "next chapter" | No auth | Step 4 | N/A |
| VOTD Save | Already gated | N/A (existing) | useAuth + useAuthModal (existing) |
| Tap lapsed-reader link | No auth | Step 5 | N/A |

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| FrostedCard | classes | `bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] rounded-2xl p-6` + dual box-shadow | FrostedCard.tsx:30-33 |
| Resume card accent border | border | `border-l-4 border-l-primary/60` (Tier 2 scripture callout style) | 09-design-system.md / Spec design notes |
| "CONTINUE READING" label | font | `text-xs font-medium uppercase tracking-widest text-white/60` | Spec design notes |
| Book + chapter heading | font | `text-2xl sm:text-3xl font-bold text-white` | Spec requirement #7 |
| First-line preview | font | `text-white/70 text-sm sm:text-base` with truncation | Spec design notes |
| Time label | font | `text-white/50 text-xs sm:text-sm` | Spec design notes |
| "Continue" button | classes | White pill CTA Pattern 1 (inline, smaller): `inline-flex items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-hero-bg shadow-[0_0_15px_rgba(255,255,255,0.15)] hover:shadow-[0_0_20px_rgba(255,255,255,0.25)] transition-all duration-200 min-h-[44px]` | 09-design-system.md § White Pill CTA Patterns |
| "Or read the next chapter" link | font | `text-sm text-primary-lt hover:text-primary transition-colors min-h-[44px] inline-flex items-center` | Spec design notes |
| Lapsed-reader link | font | `text-sm text-white/50` with book/chapter in `text-white/70` | Spec requirement #15 |
| Bible Landing bg | background | `bg-dashboard-dark` (`#0f0a1e`) | BibleLanding.tsx:112 |

---

## Design System Reminder

**Project-specific quirks displayed before every UI step:**

- Worship Room uses `GRADIENT_TEXT_STYLE` (white-to-purple gradient via `background-clip: text`) for hero and section headings on dark backgrounds. Caveat font deprecated for headings — used only for the logo.
- The Bible Landing page uses `bg-dashboard-dark` (`#0f0a1e`) background, NOT `bg-hero-bg`. Orbs are via `BibleLandingOrbs`.
- Frosted glass cards: `bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] rounded-2xl` with dual box-shadow. Use the `FrostedCard` component, not a hand-rolled card.
- Lora serif (`font-serif`) is the canonical scripture font. Used for verse text. NOT used for prose body text.
- All tap targets minimum 44px.
- White pill CTA Pattern 1 (inline, smaller) for cross-feature CTAs inside cards.
- No deprecated patterns: no Caveat headings, no animate-glow-pulse, no cyan borders, no soft-shadow 8px-radius cards.
- The resume card uses `FrostedCard` with an added warm accent border (`border-l-4 border-l-primary/60`) matching the Tier 2 scripture callout border treatment from the devotional.

**No deviations found in recent execution logs** (BB-18, BB-17, BB-16, BB-15 all completed cleanly).

---

## Shared Data Models

### localStorage keys this spec touches

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_bible_last_read` | Read | `{ book: string, chapter: number, verse: number, timestamp: number }` — written by BB-4 reader |

### Types consumed

```typescript
// From src/types/bible-landing.ts (existing)
export interface LastRead {
  book: string       // BIBLE_BOOKS name, e.g. "John"
  chapter: number    // 1-indexed
  verse: number      // 1-indexed, last viewed verse
  timestamp: number  // epoch ms (Date.now())
}
```

### New types (created in this spec)

```typescript
// src/hooks/bible/useTimeTick.ts — return value
interface TimeTick {
  now: Date
  today: string       // YYYY-MM-DD local
  currentMinute: number // for consumer re-render triggers
}

// src/hooks/bible/useLastRead.ts — return value
interface LastReadState {
  book: string | null
  chapter: number | null
  timestamp: number | null
  isActiveReader: boolean
  isLapsedReader: boolean
  isFirstTimeReader: boolean
  relativeTime: string
  firstLineOfChapter: string | null
  slug: string | null         // book slug for URL
  nextChapter: { bookSlug: string; bookName: string; chapter: number } | null
}
```

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | Single column. Active: resume card full width → secondary VOTD below. Lapsed: VOTD full width → lapsed link below. "Continue" + "next chapter" stacked vertically. |
| Tablet | 768px | Same stacked layout with more padding. |
| Desktop | 1440px | Same stacked layout (hero is always single-column). "Continue" + "next chapter" inline. |

---

## Inline Element Position Expectations

| Element Group | Elements | Expected y-alignment | Wrap Tolerance |
|---------------|----------|---------------------|----------------|
| Resume card CTA row (desktop) | "Continue" button, "Or read the next chapter" link | Same y ±5px at 1440px and 768px | Stacked on <640px is acceptable |

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| BibleHero → section divider | 0 (hero `pb-8 sm:pb-12`) | BibleLanding.tsx:117 |
| Section divider → streak chip | `space-y-8` (32px) | BibleLanding.tsx:119 |
| Streak chip → hero slot | `space-y-8` (32px) | BibleLanding.tsx:119 |
| Hero slot → TodaysPlanCard | `space-y-8` (32px) | Continuation of existing spacing |
| TodaysPlanCard → section divider → QuickActions | `space-y-8` (32px) | BibleLanding.tsx:143-146 |

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] BB-4 (reader writes `wr_bible_last_read`) is committed on `bible-redesign`
- [x] BB-17 (streakStore + dateUtils + useStreakStore with 1-minute interval) is committed
- [x] BB-18 (VOTD card + useVerseOfTheDay with 1-minute midnight poll) is committed
- [x] No new auth-gated actions — existing VOTD Save gate is unchanged
- [x] Design system values verified from FrostedCard.tsx, design-system.md recon, and 09-design-system.md
- [x] No [UNVERIFIED] values — all values sourced from existing codebase
- [x] No deprecated patterns used
- [x] All spec acceptance criteria mapped to implementation steps

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| 24-hour threshold is timestamp-based, not date-based | `Date.now() - timestamp < 86_400_000` | Spec requirement #4: reading at 11:59 PM and returning at 12:01 AM = 2 minutes, still active |
| First-line preview truncation | Truncate at ~80 characters with ellipsis via CSS `line-clamp-1` + JS substring fallback | Spec requirement #8: "~80 characters, truncated with ellipsis" |
| "Next chapter" across book boundaries | Use `getAdjacentChapter(slug, chapter, 'next')` which already handles cross-book navigation | Existing utility returns null for Revelation's last chapter |
| TodaysPlanCard position | Rendered below the hero slot as its own section (no longer in 2-col grid with resume card) | The 2-col grid made sense when resume and plan were peer cards; now resume is promoted to hero, plan stays secondary |
| SSR safety | `useTimeTick` and `useLastRead` check `typeof window === 'undefined'` and return safe defaults | Spec non-functional requirement |
| `useTimeTick` granularity | 60-second tick, pauses on hidden tab, immediate tick on visibility change | Spec requirement #19-21 |
| `useTimeTick` refactor scope | Only refactor `useStreakStore` and `useVerseOfTheDay` to consume `useTimeTick` — do NOT refactor any other hooks | Spec only mentions these two consumers |

---

## Implementation Steps

### Step 1: `formatRelativeReadTime` utility + tests

**Objective:** Create the pure time formatting function with deterministic testing.

**Files to create:**
- `frontend/src/lib/bible/timeFormat.ts` — `formatRelativeReadTime(timestamp, now?)`
- `frontend/src/lib/bible/__tests__/timeFormat.test.ts` — Exhaustive threshold boundary tests

**Details:**

`formatRelativeReadTime(timestamp: number, now?: number): string`

Thresholds (from spec requirement #17):
- `diff < 3_600_000` (< 1 hour): "Just now"
- `1-6 hours`: "X hours ago" (use `Math.floor(diff / 3_600_000)`)
- `6-18 hours, same calendar day`: "Earlier today"
- `same calendar day, 18+ hours`: "This morning"
- `yesterday (calendar day)`: "Yesterday"
- `2-6 days`: "X days ago"
- `7-13 days`: "1 week ago"
- `14-27 days`: "X weeks ago" (`Math.floor(days / 7)`)
- `28-59 days`: "1 month ago"
- `60-364 days`: "X months ago" (`Math.floor(days / 30)`)
- `365+ days`: "Over a year ago"

The "same calendar day" and "yesterday" checks use local timezone (construct `Date` objects and compare `getFullYear()`, `getMonth()`, `getDate()`). The `now` parameter defaults to `Date.now()` but is injectable for testing.

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT use the existing `timeAgo()` from `src/lib/time.ts` — it uses different thresholds and lacks "Earlier today" / "This morning" / "Over a year ago"
- DO NOT import any React — this is a pure utility

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| returns "Just now" for 0ms ago | unit | `formatRelativeReadTime(now, now)` → "Just now" |
| returns "Just now" for 59 minutes ago | unit | Edge of the < 1h threshold |
| returns "1 hours ago" for 60 minutes | unit | First hour bucket |
| returns "5 hours ago" for 5h | unit | Mid-range hours |
| returns "Earlier today" for 8h same day | unit | Same calendar day, 6-18h window |
| returns "This morning" for 20h same day | unit | Same calendar day, 18+ hours |
| returns "Yesterday" for previous calendar day | unit | Calendar day check, not 24h |
| returns "2 days ago" for 2 days | unit | Start of day-range |
| returns "6 days ago" for 6 days | unit | End of day-range |
| returns "1 week ago" for 7 days | unit | Week threshold start |
| returns "1 week ago" for 13 days | unit | Week threshold end |
| returns "2 weeks ago" for 14 days | unit | Multi-week start |
| returns "3 weeks ago" for 27 days | unit | Multi-week end |
| returns "1 month ago" for 28 days | unit | Month threshold start |
| returns "2 months ago" for 60 days | unit | Multi-month |
| returns "Over a year ago" for 365 days | unit | Year boundary |
| accepts optional now parameter | unit | Deterministic test with fixed timestamps |

**Expected state after completion:**
- [ ] `formatRelativeReadTime` exported from `src/lib/bible/timeFormat.ts`
- [ ] All 17 threshold boundary tests pass
- [ ] No imports of React or other hooks

---

### Step 2: `useTimeTick` shared hook + tests

**Objective:** Create one shared 60-second interval that all time-dependent hooks consume, with Page Visibility API pause/resume.

**Files to create:**
- `frontend/src/hooks/bible/useTimeTick.ts` — shared time tick hook
- `frontend/src/hooks/bible/__tests__/useTimeTick.test.ts` — tests

**Details:**

```typescript
// Return type
interface TimeTick {
  now: Date
  today: string        // getTodayLocal() format: YYYY-MM-DD
  currentMinute: number // incrementing counter for re-render trigger
}

export function useTimeTick(): TimeTick
```

Implementation:
1. `useState` for `{ now, today, currentMinute }`, initialized with current values
2. Single `setInterval(60_000)` that updates all three fields
3. Page Visibility API: `document.addEventListener('visibilitychange', handler)`. When `document.visibilityState === 'hidden'`, clear the interval. When `'visible'`, immediately update state (tick now) and restart the interval.
4. SSR guard: if `typeof window === 'undefined'`, return static initial values and skip interval/visibility setup.
5. Cleanup on unmount: clear interval, remove visibilitychange listener.

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT use `requestAnimationFrame` — this is a 60-second tick, not animation
- DO NOT expose a way to change the tick rate — it's fixed at 60 seconds per spec
- DO NOT add any dependencies on streak, VOTD, or last-read data — this hook is pure time

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| returns initial tick values | unit | `now`, `today`, `currentMinute` are populated on first render |
| updates on 60-second interval | unit | `vi.advanceTimersByTime(61_000)` → `currentMinute` increments |
| pauses when page hidden | unit | Set `document.visibilityState = 'hidden'`, fire event → interval stops |
| resumes immediately when page visible | unit | Set back to `'visible'`, fire event → state updates immediately (no 60s wait) |
| restarts interval on visibility resume | unit | After resume, 60s later → another tick fires |
| cleans up on unmount | unit | Unmount → `clearInterval` called, visibility listener removed |

**Expected state after completion:**
- [ ] `useTimeTick` exported from `src/hooks/bible/useTimeTick.ts`
- [ ] All 6 tests pass
- [ ] No `setInterval` calls inside this hook except the single shared one

---

### Step 3: Refactor `useStreakStore` and `useVerseOfTheDay` to consume `useTimeTick`

**Objective:** Remove the two separate `setInterval`s from `useStreakStore` and `useVerseOfTheDay`, replacing them with `useTimeTick` consumption. One shared interval total.

**Files to modify:**
- `frontend/src/hooks/bible/useStreakStore.ts` — remove `setInterval`, consume `useTimeTick`
- `frontend/src/hooks/bible/useVerseOfTheDay.ts` — remove `setInterval`, consume `useTimeTick`

**Files to update (tests):**
- `frontend/src/hooks/bible/__tests__/useVerseOfTheDay.test.ts` — update midnight poll test
- (No separate `useStreakStore.test.ts` exists — streak store tests are in `streakStore.test.ts` which tests the store module, not the hook)

**Details:**

**useStreakStore refactor:**

Current: lines 30-35 run `setInterval(checkAtRisk, 60_000)` and clear on unmount.

After: 
```typescript
import { useTimeTick } from './useTimeTick'

export function useStreakStore() {
  const { currentMinute } = useTimeTick()
  // ... existing subscribe logic ...
  
  // Replace setInterval with useEffect keyed on currentMinute
  useEffect(() => {
    checkAtRisk()
  }, [checkAtRisk, currentMinute])
  
  // Remove the interval useEffect entirely
}
```

**useVerseOfTheDay refactor:**

Current: lines 107-125 run `setInterval(POLL_INTERVAL_MS)` checking if day-of-year changed.

After:
```typescript
import { useTimeTick } from './useTimeTick'

export function useVerseOfTheDay(date?: Date) {
  const { today } = useTimeTick()
  
  // Replace the polling interval with a useEffect keyed on `today`
  useEffect(() => {
    if (date) return // Skip for fixed dates
    const now = new Date()
    const todayDay = getDayOfYear(now)
    if (todayDay !== currentDayRef.current) {
      setIsLoading(true)
      loadVotd(now)
    }
  }, [date, loadVotd, today])
  
  // Remove intervalRef, remove the setInterval/clearInterval useEffect
}
```

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT change the external API of either hook — same return types, same parameters
- DO NOT change the `useVerseOfTheDay(date)` override behavior — fixed dates still skip polling
- DO NOT remove the store `subscribe` pattern in `useStreakStore` — that listens for store mutations, not time

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| useVerseOfTheDay midnight poll still works | unit | Update existing test to work with `useTimeTick` mock instead of raw `setInterval` |
| useVerseOfTheDay no polling with fixed date | unit | Existing test should still pass |
| useStreakStore at-risk recalculates on tick | unit | New test: verify at-risk updates when `currentMinute` changes |

**Expected state after completion:**
- [ ] Zero `setInterval` calls in `useStreakStore.ts`
- [ ] Zero `setInterval` calls in `useVerseOfTheDay.ts`
- [ ] `intervalRef` removed from `useVerseOfTheDay.ts`
- [ ] Existing `useVerseOfTheDay` tests updated and passing
- [ ] All existing streak behavior unchanged
- [ ] `pnpm test` passes with no regressions

---

### Step 4: `useLastRead` hook + tests

**Objective:** Create the hook that derives active/lapsed/first-time reader state from `wr_bible_last_read` and the shared time tick.

**Files to create:**
- `frontend/src/hooks/bible/useLastRead.ts`
- `frontend/src/hooks/bible/__tests__/useLastRead.test.ts`

**Details:**

```typescript
import { useState, useEffect } from 'react'
import { useTimeTick } from './useTimeTick'
import { getLastRead } from '@/lib/bible/landingState'
import { formatRelativeReadTime } from '@/lib/bible/timeFormat'
import { loadChapterWeb } from '@/data/bible'
import { getAdjacentChapter } from '@/data/bible'
import { BIBLE_BOOKS } from '@/constants/bible'

const TWENTY_FOUR_HOURS = 86_400_000

interface LastReadState {
  book: string | null
  chapter: number | null
  timestamp: number | null
  isActiveReader: boolean
  isLapsedReader: boolean
  isFirstTimeReader: boolean
  relativeTime: string
  firstLineOfChapter: string | null
  slug: string | null
  nextChapter: { bookSlug: string; bookName: string; chapter: number } | null
}

export function useLastRead(): LastReadState
```

Logic:
1. Call `getLastRead()` on mount to read `wr_bible_last_read` from localStorage.
2. Consume `useTimeTick()` to get `{ now }`.
3. Derive reader state:
   - `isFirstTimeReader`: `lastRead === null`
   - `isActiveReader`: `lastRead !== null && (now.getTime() - lastRead.timestamp < TWENTY_FOUR_HOURS)`
   - `isLapsedReader`: `lastRead !== null && !isActiveReader`
4. Compute `relativeTime` via `formatRelativeReadTime(lastRead.timestamp, now.getTime())`.
5. Look up book slug from `BIBLE_BOOKS`.
6. Compute `nextChapter` via `getAdjacentChapter(slug, chapter, 'next')`.
7. Load first line of chapter via `loadChapterWeb(slug, chapter)` — async, stored in state. Extract `verses[0].text`, truncate to ~80 characters with ellipsis if longer.
8. Re-derive reader state and relative time on every `currentMinute` change (from `useTimeTick`).
9. Re-read `getLastRead()` on every `currentMinute` change (picks up fresh writes from the reader without needing a `storage` event listener).

SSR guard: If `typeof window === 'undefined'`, return first-time-reader defaults.

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT write to `wr_bible_last_read` — this hook is read-only
- DO NOT add a `storage` event listener — spec says that's future BB-39 scope
- DO NOT cache the chapter text across re-renders if the chapter changes — reload it

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| returns isFirstTimeReader when no localStorage | unit | Empty localStorage → `{ isFirstTimeReader: true, isActiveReader: false, isLapsedReader: false }` |
| returns isFirstTimeReader for malformed data | unit | `localStorage.setItem('wr_bible_last_read', '{bad}')` → first-time |
| returns isFirstTimeReader for missing fields | unit | `{ verse: 1 }` only → first-time |
| returns isActiveReader within 24h | unit | `timestamp = Date.now() - 3_600_000` (1h ago) → active |
| returns isLapsedReader after 24h | unit | `timestamp = Date.now() - 90_000_000` (25h ago) → lapsed |
| transitions from active to lapsed on tick | unit | Start at 23h 58m, advance 3 minutes → state changes |
| computes relativeTime correctly | unit | Verify the `relativeTime` string matches `formatRelativeReadTime` output |
| loads first line of chapter | unit | Mock `loadChapterWeb` → verify `firstLineOfChapter` is set |
| truncates first line at ~80 chars with ellipsis | unit | Chapter with long first verse → truncated |
| computes nextChapter when available | unit | John 3 → `{ bookSlug: 'john', bookName: 'John', chapter: 4 }` |
| nextChapter is null for last chapter of book | unit | Revelation 22 → null |
| re-reads localStorage on tick | unit | Update localStorage mid-test, advance tick → new data picked up |

**Expected state after completion:**
- [ ] `useLastRead` exported from `src/hooks/bible/useLastRead.ts`
- [ ] All 12 tests pass
- [ ] Hook re-derives state on every time tick

---

### Step 5: Rewrite `ResumeReadingCard` component + tests

**Objective:** Transform the existing basic card into the full resume card with large display heading, first-line preview, relative time, "Continue" button, and "next chapter" link.

**Files to modify:**
- `frontend/src/components/bible/landing/ResumeReadingCard.tsx` — full rewrite
- `frontend/src/components/bible/landing/__tests__/ResumeReadingCard.test.tsx` — rewrite tests

**Details:**

The component receives data from the parent (via `useLastRead`), not from its own hook. This keeps it presentational and testable.

```typescript
interface ResumeReadingCardProps {
  book: string
  chapter: number
  slug: string
  relativeTime: string
  firstLine: string | null
  nextChapter: { bookSlug: string; bookName: string; chapter: number } | null
}
```

Rendering:
```
<FrostedCard as="article" className="border-l-4 border-l-primary/60 shadow-[0_0_35px_rgba(139,92,246,0.12),0_4px_25px_rgba(0,0,0,0.35)]">
  <p className="text-xs font-medium uppercase tracking-widest text-white/60">
    Continue reading
  </p>
  <h3 className="mt-2 text-2xl sm:text-3xl font-bold text-white">
    {book} {chapter}
  </h3>
  {firstLine && (
    <p className="mt-2 text-sm sm:text-base text-white/70 line-clamp-1">
      {firstLine}
    </p>
  )}
  <p className="mt-1 text-xs sm:text-sm text-white/50">
    Read {relativeTime.toLowerCase()}
  </p>
  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
    <Link
      to={`/bible/${slug}/${chapter}`}
      className="inline-flex items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-hero-bg shadow-[0_0_15px_rgba(255,255,255,0.15)] hover:shadow-[0_0_20px_rgba(255,255,255,0.25)] transition-all duration-200 min-h-[44px]"
      aria-label={`Continue reading ${book} chapter ${chapter}`}
    >
      Continue
    </Link>
    {nextChapter && (
      <Link
        to={`/bible/${nextChapter.bookSlug}/${nextChapter.chapter}`}
        className="text-sm text-primary-lt hover:text-primary transition-colors min-h-[44px] inline-flex items-center"
      >
        Or read the next chapter
      </Link>
    )}
  </div>
</FrostedCard>
```

**Responsive behavior:**
- Desktop (1440px): "Continue" button and "next chapter" link inline via `sm:flex-row sm:items-center sm:gap-4`
- Tablet (768px): Same inline layout
- Mobile (375px): Stacked via `flex-col gap-3`

**Inline position expectations:**
- "Continue" button and "Or read the next chapter" link share y-coordinate at 768px and 1440px (±5px tolerance). Stacked on <640px.

**Guardrails (DO NOT):**
- DO NOT import `useLastRead` or `useTimeTick` — this component is presentational, receiving props
- DO NOT render the "first-run" empty state here — that case is handled by `BibleHeroSlot` (first-time reader shows VOTD, no resume card)
- DO NOT use `timeAgo()` from `src/lib/time.ts` — use the `relativeTime` prop which comes from `formatRelativeReadTime`
- DO NOT use `animate-glow-pulse` or cyan borders

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| renders book name and chapter | unit | "John 3" visible |
| renders first-line preview | unit | First line text visible, truncated |
| renders relative time label | unit | "Read 3 hours ago" visible |
| Continue link navigates to correct URL | unit | `/bible/john/3` |
| "next chapter" link visible when nextChapter provided | unit | "Or read the next chapter" visible, correct href |
| "next chapter" link hidden when nextChapter is null | unit | Not in DOM |
| has accent border | unit | `border-l-primary/60` in class |
| "Continue" button has 44px min height | unit | `min-h-[44px]` in class |
| has appropriate aria-label | unit | `aria-label` on Continue link |
| focus-visible ring on links | unit | `focus-visible:ring-2` or similar |

**Expected state after completion:**
- [ ] `ResumeReadingCard` renders all spec elements (heading, first-line, time, continue, next chapter)
- [ ] Warm accent border visible
- [ ] All 10 tests pass
- [ ] Mobile stacking works via flex-col/flex-row

---

### Step 6: `BibleHeroSlot` composition component + tests

**Objective:** Create the component that decides what renders in the hero area based on reader state (active → resume card primary + VOTD secondary; lapsed → VOTD primary + resume link; first-time → VOTD primary only).

**Files to create:**
- `frontend/src/components/bible/landing/BibleHeroSlot.tsx`
- `frontend/src/components/bible/landing/__tests__/BibleHeroSlot.test.tsx`

**Details:**

```typescript
import { useLastRead } from '@/hooks/bible/useLastRead'
import { ResumeReadingCard } from './ResumeReadingCard'
import { VerseOfTheDay } from './VerseOfTheDay'

export function BibleHeroSlot()
```

Rendering logic:

**Active reader (`isActiveReader`):**
```
<div className="space-y-6">
  <ResumeReadingCard
    book={...} chapter={...} slug={...}
    relativeTime={...} firstLine={...} nextChapter={...}
  />
  {/* Secondary VOTD — no max-w-2xl wrapper, inherits parent width */}
  <VerseOfTheDay />
</div>
```

**Lapsed reader (`isLapsedReader`):**
```
<div className="space-y-4">
  <VerseOfTheDay />
  <Link
    to={`/bible/${slug}/${chapter}`}
    className="block text-center text-sm min-h-[44px] inline-flex items-center justify-center"
  >
    <span className="text-white/50">Last read: </span>
    <span className="text-white/70 font-medium">{book} {chapter}</span>
    <span className="text-white/50"> · {relativeTime}</span>
  </Link>
</div>
```

**First-time reader (`isFirstTimeReader`):**
```
<VerseOfTheDay />
```

Note: The current `VerseOfTheDay` wraps itself in `mx-auto max-w-2xl`. In the active-reader state, the VerseOfTheDay card is visually "secondary" — it renders at the same width below the resume card (the parent container `max-w-4xl` constrains both). No need to change the VerseOfTheDay component itself.

**Responsive behavior:**
- Desktop (1440px): Active: resume card fills parent width (`max-w-4xl`), VOTD below. Lapsed: VOTD fills, link below.
- Tablet (768px): Same stacked layout.
- Mobile (375px): Same stacked layout, all elements full-width.

**Guardrails (DO NOT):**
- DO NOT render the `TodaysPlanCard` inside the hero slot — it stays in the parent layout
- DO NOT add animation to the state transition (spec requirement #18: "No animation")
- DO NOT add any configuration prop to let the user choose hero priority — the 24-hour rule is automatic (spec requirement #5)

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| renders resume card when active reader | integration | Mock `useLastRead` to return active state → ResumeReadingCard visible |
| renders VOTD below resume card when active | integration | Both resume card and VOTD visible in DOM order |
| renders VOTD as primary when lapsed reader | integration | Mock lapsed → VOTD visible, no resume card |
| renders lapsed-reader link when lapsed | integration | "Last read: John 3" link visible |
| lapsed link navigates to correct URL | integration | Link href is `/bible/john/3` |
| renders VOTD only for first-time reader | integration | No resume card, no lapsed link |
| no resume affordance for first-time reader | integration | Assert resume card and lapsed link NOT in DOM |
| lapsed link has 44px tap target | unit | `min-h-[44px]` in class |

**Expected state after completion:**
- [ ] `BibleHeroSlot` correctly renders all three states
- [ ] All 8 tests pass
- [ ] No animation on state transitions

---

### Step 7: Wire `BibleHeroSlot` into `BibleLanding` page + update page tests

**Objective:** Replace the current flat layout (2-col grid of ResumeReadingCard + TodaysPlanCard, then VerseOfTheDay) with the new `BibleHeroSlot`, keeping `TodaysPlanCard` as a standalone section below.

**Files to modify:**
- `frontend/src/pages/BibleLanding.tsx`

**Details:**

Current layout order (lines 119-150):
```
StreakChip
Grid: [ResumeReadingCard, TodaysPlanCard]
VerseOfTheDay
Section divider
QuickActionsRow
BibleSearchEntry
Footer note
```

New layout order:
```
StreakChip
BibleHeroSlot          ← replaces the grid + standalone VOTD
TodaysPlanCard         ← standalone, full-width (no grid)
Section divider
QuickActionsRow
BibleSearchEntry
Footer note
```

Changes:
1. Remove the `useState` for `lastRead` and the `useEffect` that calls `getLastRead()` — `useLastRead` inside `BibleHeroSlot` handles this.
2. Remove the `getLastRead` import.
3. Remove the 2-col grid `div` wrapping `ResumeReadingCard` and `TodaysPlanCard`.
4. Add `<BibleHeroSlot />` in place of the grid and the `<VerseOfTheDay />`.
5. Keep `<TodaysPlanCard plans={plans} />` as a standalone section below the hero slot.
6. Keep all other sections unchanged (streak chip, quick actions, search, footer).

**Responsive behavior:**
- Desktop (1440px): Hero slot full-width within `max-w-4xl`, TodaysPlanCard below as full-width card.
- Tablet (768px): Same.
- Mobile (375px): Same stacked layout.

**Guardrails (DO NOT):**
- DO NOT remove the `AuthModalProvider` — VerseOfTheDay needs it for the Save action
- DO NOT remove the streak chip, quick actions, search, or footer sections
- DO NOT change the `BibleHero` component — it's the static heading, separate from the dynamic hero slot
- DO NOT remove the `useEffect` for `plans` — `TodaysPlanCard` still needs it

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| BibleLanding renders BibleHeroSlot | integration | Smoke test: page renders without error |
| TodaysPlanCard still renders | integration | Plans section still present |

Note: Most behavior is tested in `BibleHeroSlot.test.tsx` and `ResumeReadingCard.test.tsx`. The page-level test just verifies composition.

**Expected state after completion:**
- [ ] `BibleLanding` renders `BibleHeroSlot` instead of the old grid + VOTD
- [ ] `TodaysPlanCard` renders below the hero slot
- [ ] All existing `BibleLanding` tests updated and passing
- [ ] `pnpm test` passes with no regressions
- [ ] `pnpm build` succeeds with zero errors

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | `formatRelativeReadTime` pure utility + tests |
| 2 | — | `useTimeTick` shared hook + tests |
| 3 | 2 | Refactor `useStreakStore` + `useVerseOfTheDay` to consume `useTimeTick` |
| 4 | 1, 2 | `useLastRead` hook (consumes `useTimeTick` + `formatRelativeReadTime`) + tests |
| 5 | — | Rewrite `ResumeReadingCard` presentational component + tests |
| 6 | 4, 5 | `BibleHeroSlot` composition (consumes `useLastRead` + `ResumeReadingCard`) + tests |
| 7 | 6 | Wire `BibleHeroSlot` into `BibleLanding` page |

Steps 1, 2, and 5 can be executed in parallel. Step 3 depends on 2. Step 4 depends on 1 and 2. Step 6 depends on 4 and 5. Step 7 depends on 6.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | `formatRelativeReadTime` utility + tests | [COMPLETE] | 2026-04-09 | Created `src/lib/bible/timeFormat.ts` + `src/lib/bible/__tests__/timeFormat.test.ts` (17 tests pass) |
| 2 | `useTimeTick` shared hook + tests | [COMPLETE] | 2026-04-09 | Created `src/hooks/bible/useTimeTick.ts` + `src/hooks/bible/__tests__/useTimeTick.test.ts` (6 tests pass) |
| 3 | Refactor streak + VOTD to consume `useTimeTick` | [COMPLETE] | 2026-04-09 | Removed `setInterval` from both hooks, consuming `useTimeTick` instead. Updated VOTD test for midnight poll (uses `currentMinute` trigger) and no-polling assertion (stable date ref). Added `vi.useRealTimers()` to `afterEach`. 8 VOTD tests pass. |
| 4 | `useLastRead` hook + tests | [COMPLETE] | 2026-04-09 | Created `src/hooks/bible/useLastRead.ts` + `__tests__/useLastRead.test.ts` (12 tests pass). Fake timers scoped per-test to avoid blocking `waitFor` in async tests. |
| 5 | Rewrite `ResumeReadingCard` + tests | [COMPLETE] | 2026-04-09 | Rewrote `ResumeReadingCard.tsx` as presentational component with new props interface + `__tests__/ResumeReadingCard.test.tsx` (10 tests pass) |
| 6 | `BibleHeroSlot` composition + tests | [COMPLETE] | 2026-04-09 | Created `BibleHeroSlot.tsx` + `__tests__/BibleHeroSlot.test.tsx` (8 tests pass). Mocked `useLastRead`, `VerseOfTheDay`, and `ResumeReadingCard` for focused composition tests. |
| 7 | Wire into `BibleLanding` page | [COMPLETE] | 2026-04-09 | Replaced 2-col grid + standalone VOTD with `BibleHeroSlot`. Removed `lastRead` state and `getLastRead` import. TodaysPlanCard standalone below hero slot. Updated BibleLanding tests (14 pass, 2 new composition tests). Build: 0 errors. All 75 BB-19 tests pass. |
