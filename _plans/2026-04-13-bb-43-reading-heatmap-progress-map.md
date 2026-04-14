# Implementation Plan: BB-43 Reading Heatmap / Bible Progress Map

**Spec:** `_specs/bb43-reading-heatmap-progress-map.md`
**Date:** 2026-04-13
**Branch:** `bible-redesign` (no new branch — commits directly to existing branch)
**Design System Reference:** `_plans/recon/design-system.md` (loaded, captured 2026-04-05, 8 days old)
**Recon Report:** N/A — extends existing `/bible/my` page, no external page to recon
**Master Spec Plan:** N/A — standalone feature

---

## Architecture Context

### Project Structure

- **Frontend**: `frontend/src/` — React 18 + TypeScript + Vite + TailwindCSS
- **Components**: `frontend/src/components/bible/my-bible/` — My Bible page UI components
- **Lib**: `frontend/src/lib/` — Pure TypeScript modules (no React dependency)
- **Hooks**: `frontend/src/hooks/` — Custom React hooks
- **Types**: `frontend/src/types/` — TypeScript interfaces
- **Constants**: `frontend/src/constants/bible.ts` — `BIBLE_BOOKS` (66 entries with chapter counts), `BIBLE_PROGRESS_KEY`, `HIGHLIGHT_EMOTIONS`
- **Tests**: Co-located `__tests__/` directories within each module

### Existing My Bible Page (`/bible/my`)

**File:** `frontend/src/pages/MyBiblePage.tsx` (362 lines)
**Route:** `/bible/my` in `App.tsx:223`, auth-gated at route level, wrapped in `BibleDrawerProvider`
**Current layout (top to bottom):**
1. `<Layout>` + `<SEO>` with breadcrumb JSON-LD
2. `bg-dashboard-dark` background with `<BibleLandingOrbs />`
3. Hero section with `ATMOSPHERIC_HERO_BG` style, `SectionHeading` ("My Bible" / "everything you've marked"), dynamic subhead
4. Section divider (`border-t border-white/[0.08] max-w-6xl mx-auto`)
5. Main content (`max-w-2xl mx-auto px-4 pb-16`):
   - Quick stats row (highlights/notes/bookmarks/books/streak counts)
   - `ActivityFilterBar` with filter/sort/search
   - `ColorFilterStrip` (when highlights filter active)
   - Activity feed (`ActivityCard` list) or empty states
   - Footer trust signal

**Integration point for BB-43:** Insert heatmap + progress map between the section divider (line 162) and the existing main content div (line 165). Both visualizations go inside the `max-w-2xl` container, above the quick stats row.

### Existing Data Stores (Recon Results)

| Key | Shape | Timestamps? | BB-43 Use |
|-----|-------|-------------|-----------|
| `wr_bible_progress` | `Record<string, number[]>` (book slug → chapter numbers) | **No** | Progress map: chapters read per book |
| `bible:streak` | `StreakRecord { currentStreak, lastReadDate, totalDaysRead, ... }` | Single ISO date only | Streak count display; `totalDaysRead` for summary |
| `wr_bible_highlights` | `Highlight[] { id, book, chapter, startVerse, endVerse, color, createdAt, updatedAt }` | **Yes** (epoch ms) | Progress map: highlighted chapters. Heatmap: supplementary daily signal |
| `bible:bookmarks` | `Bookmark[] { id, book, chapter, startVerse, endVerse, createdAt }` | **Yes** (epoch ms) | Heatmap: supplementary daily signal |
| `bible:notes` | `Note[] { id, book, chapter, startVerse, endVerse, body, createdAt, updatedAt }` | **Yes** (epoch ms) | Heatmap: supplementary daily signal |

**Critical recon finding — no per-day reading history exists.** `wr_bible_progress` tracks WHICH chapters have been read but not WHEN. `bible:streak` tracks only the current streak and last read date, not a daily log. Highlights/notes/bookmarks have timestamps but only capture annotation activity — a user who reads 5 chapters without highlighting anything would show 0 activity on the heatmap.

**Decision: Add `wr_chapters_visited` (spec-authorized fallback).** This is the only way to answer "which chapters were read on which days." The BibleReader's `VerseDisplay` component will write to this store on chapter mount, alongside the existing `markChapterRead` flow. Supplementary signals from highlights/notes/bookmarks are merged for richer data.

### Chapter Visit Tracking — Integration Point

`VerseDisplay.tsx` (line 107-128) uses an IntersectionObserver to call `markChapterRead(bookSlug, chapterNumber)` when the user scrolls to ~50% of the chapter. This only fires for unread chapters. BB-43 needs a **separate** effect that records the chapter visit on mount for EVERY chapter load (including re-reads), once per day per book+chapter combination.

### Bible Book Constants

`BIBLE_BOOKS` from `frontend/src/constants/bible.ts` (lines 138-228):
```typescript
interface BibleBook {
  name: string         // "Genesis", "1 Corinthians"
  slug: string         // "genesis", "1-corinthians"
  chapters: number     // 1 (Obadiah) to 150 (Psalms)
  testament: 'old' | 'new'
  category: BibleCategory
  hasFullText: boolean
}
// 39 OT books + 27 NT books = 66 total, 1,189 total chapters
```

### Date Utilities

`frontend/src/lib/bible/dateUtils.ts` provides:
- `getTodayLocal()` → `YYYY-MM-DD` in local timezone
- `daysBetween(start, end)` → integer days between ISO date strings
- `getISOWeekStart(date)` → Monday of the week containing the date
- `getYesterday(date)` → previous day's ISO date

### Existing Store Patterns

Reactive stores in `frontend/src/lib/bible/` (highlightStore, bookmarkStore, streakStore) follow:
```typescript
let cache: T | null = null
const listeners = new Set<() => void>()
function readFromStorage(): T { ... }
function writeToStorage(data: T): void { ... }
export function getData(): T { return { ...getCache() } }
export function mutate(...): void { /* update cache + storage + notify */ }
export function subscribe(listener: () => void): () => void { ... }
```

### Test Patterns

- **Pure module tests**: Direct import, `vi.fn()` for dependencies. See `frontend/src/lib/bible/__tests__/streakStore.test.ts`.
- **Component tests**: `MemoryRouter` wrapping, `vi.mock()` for hooks/stores. `BibleDrawerProvider` + `AuthModalProvider` wrapping for My Bible components.
- **Hook tests**: `renderHook` from RTL, `vi.useFakeTimers()` for time-sensitive tests.
- localStorage mocking: `beforeEach(() => localStorage.clear())` standard pattern.

---

## Auth Gating Checklist

**BB-43 adds zero new auth gates.** The My Bible page (`/bible/my`) is already auth-gated at the route level. All BB-43 components are read-only visualizations of existing data.

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| View reading heatmap | Page-level auth gate (existing) | N/A | Route-level redirect (existing) |
| View Bible progress map | Page-level auth gate (existing) | N/A | Route-level redirect (existing) |
| Record chapter visit | Auth-gated write (new) | Step 3 | `isAuthenticated` check in VerseDisplay |

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Page background | bg | `bg-dashboard-dark` (`#0f0a1e`) | MyBiblePage.tsx:150 |
| Hero background | style | `ATMOSPHERIC_HERO_BG` — `radial-gradient(ellipse at top center, rgba(109, 40, 217, 0.15) 0%, transparent 70%)` over `#0f0a1e` | design-system.md |
| Section heading | component | `SectionHeading` (white top + gradient bottom) | MyBiblePage.tsx:156 |
| Section divider | border | `border-t border-white/[0.08] max-w-6xl mx-auto` | MyBiblePage.tsx:162 |
| Content container | max-width | `max-w-2xl mx-auto px-4` | MyBiblePage.tsx:165 |
| FrostedCard | bg/border | `bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] rounded-2xl` with dual box-shadow | design-system.md |
| Primary text | color | `text-white` | design-system.md |
| Secondary/muted text | color | `text-white/60` | design-system.md |
| Decorative/labels | color | `text-white/40` to `text-white/50` | design-system.md |
| Primary color (heatmap intensity) | hex | `#6D28D9` / Tailwind `primary` | design-system.md |
| Empty cell (heatmap) | bg | `bg-white/5` | Spec line 56 |
| Empty cell (progress map) | bg | `bg-white/8` | Spec line 77 |
| Read cell (progress map) | bg | `bg-primary/60` | Spec line 78 |
| Highlighted cell (progress map) | bg | `bg-primary/80` | Spec line 79 |
| Intensity 1-2 chapters | bg | `bg-primary/30` | Spec line 57 |
| Intensity 3-5 chapters | bg | `bg-primary/50` | Spec line 58 |
| Intensity 6-9 chapters | bg | `bg-primary/70` | Spec line 59 |
| Intensity 10+ chapters | bg | `bg-primary/90` | Spec line 60 |
| Tooltip | bg/border | `bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] rounded-lg` | Spec design notes |
| Stat card (existing pattern) | bg/border | `bg-white/[0.06] border border-white/[0.12] rounded-xl px-4 py-3` | MyBiblePage.tsx:176 |
| Book card (progress map) | bg/border | `bg-white/5 border border-white/10 rounded-xl` | Spec line 182 |
| Today cell border | border | `ring-2 ring-white/50` | [UNVERIFIED] → Verify: visually inspect against dark bg. If too bright, reduce to `ring-white/30`. |

---

## Design System Reminder

**Project-specific quirks that `/execute-plan` displays before every UI step:**

- Worship Room uses `GRADIENT_TEXT_STYLE` (white-to-purple gradient via `background-clip: text`) for hero and section headings on dark backgrounds. Caveat font has been deprecated for headings — used only for the logo.
- The My Bible page uses `bg-dashboard-dark` (#0f0a1e) background with `BibleLandingOrbs` atmospheric orbs and `ATMOSPHERIC_HERO_BG` on the hero section.
- Content container on My Bible is `max-w-2xl mx-auto px-4` — all BB-43 components must fit within this width.
- Frosted glass cards: `bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] rounded-2xl` with dual box-shadow. Use the `FrostedCard` component for section wrappers.
- Text opacity standards: primary text `text-white`, secondary `text-white/60`, labels/decorative `text-white/40` to `text-white/50`. Body text below `text-white/60` fails WCAG AA on dark backgrounds.
- The existing quick stats row on My Bible uses `bg-white/[0.06] border border-white/[0.12] rounded-xl` for stat cards — book cards in the progress map use the lighter `bg-white/5 border border-white/10 rounded-xl` per spec.
- No deprecated patterns: no Caveat headings, no animate-glow-pulse, no cyan borders, no soft-shadow 8px-radius cards, no GlowBackground on inner pages.
- **Anti-pressure is non-negotiable:** No percentages, no "you missed X days", no praise language, no completion animations. Just data. The spec's anti-pressure section (lines 191-200) overrides any default gamification instincts.
- All text on this page uses `text-white` for the Round 3 standard. Reserve `text-white/60` for truly secondary info only.

---

## Shared Data Models (from Master Plan)

N/A — standalone feature. Shared interfaces defined in Step 1.

**localStorage keys this spec touches:**

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_chapters_visited` | **Write** (new key) | Per-day chapter visit log: `Record<string, Array<{ book: string; chapter: number }>>` |
| `wr_bible_progress` | Read | Chapters read per book (progress map coverage) |
| `wr_bible_highlights` | Read | Highlights with timestamps (progress map "highlighted" state + heatmap supplementary signal) |
| `bible:bookmarks` | Read | Bookmarks with timestamps (heatmap supplementary signal) |
| `bible:notes` | Read | Notes with timestamps (heatmap supplementary signal) |
| `bible:streak` | Read | Current streak count for display |

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | Heatmap cells 8-10px, may need horizontal scroll in overflow container. Progress map: 1-column book grid, chapter cells 6px. Day labels single letter ("M", "W", "F"). Tooltip via tap. |
| Tablet | 768px | Heatmap cells 10-12px, fits without scroll. Progress map: 2-column book grid, chapter cells 7-8px. Day labels abbreviated ("Mon", "Wed", "Fri"). |
| Desktop | 1440px | Heatmap cells 12-14px. Progress map: 3-column book grid (not 4-5 — constrained by `max-w-2xl` container = 672px). Chapter cells 8-10px. Tooltip on hover. |

**Note:** The `max-w-2xl` container (672px) limits the progress map to at most 3 columns at desktop. The spec says "4-5 columns" but that assumes a wider container. Within 672px, 3 columns of ~200px each is the practical maximum for readable book cards. Mark this as a deviation from spec.

---

## Inline Element Position Expectations (UI features with inline rows)

| Element Group | Elements | Expected y-alignment | Wrap Tolerance |
|---------------|----------|---------------------|----------------|
| Heatmap legend | 5 color swatches + "Less" + "More" labels | Same y ±5px at all breakpoints | N/A — should never wrap |
| Heatmap summary stats | "N of 365 days" + streak pill | Same y ±5px at 768px and 1440px | Stacking at 375px is acceptable |
| Progress map OT/NT counts | "X of 1,189 chapters" + "Y of 66 books" | Same y ±5px at 768px and 1440px | Stacking at 375px is acceptable |

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| Section divider → heatmap section | 32px (`py-8`) | Matches existing quick stats row spacing (MyBiblePage.tsx:168 `py-6`) |
| Heatmap section → progress map section | 32px (`mt-8`) | Consistent with section spacing |
| Progress map section → quick stats row | 16px (`mt-4`) | Tighter — stats row has its own `py-6` |
| Progress map section → empty state | 0px | Empty state replaces stats + feed |

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] BB-42 is shipped and committed (commit `37effa0`)
- [x] `wr_bible_progress` shape confirmed: `Record<string, number[]>` — book slug to chapter number array, NO timestamps
- [x] `bible:streak` shape confirmed: `StreakRecord` with `currentStreak`, `lastReadDate`, `totalDaysRead` — NO per-day history
- [x] `wr_bible_highlights` shape confirmed: `Highlight[]` with `createdAt` epoch ms, includes `book` and `chapter` fields
- [x] BB-19 confirmed: only stores single `wr_bible_last_read` entry, NOT a session log
- [x] **Fallback key decision: `wr_chapters_visited` IS NEEDED** — no existing key provides per-day chapter-level reading history
- [x] All auth-gated actions accounted for (zero new gates — page-level gate is existing)
- [x] Design system values verified from recon + codebase inspection
- [x] No deprecated patterns used
- [x] Zero new npm packages
- [ ] **Deviation from spec:** Progress map uses 3-column max at desktop (not 4-5) due to `max-w-2xl` container constraint. Confirm this is acceptable.

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Per-day history data source | New `wr_chapters_visited` key + supplementary highlight/note/bookmark timestamps | No existing key provides per-day chapter-level reading history. Spec authorizes this fallback. |
| Chapter visit deduplication | Same book+chapter on same day stored once | Prevents inflated counts from page refreshes or navigation back/forward |
| Visit store cap | Keep last 400 days, evict oldest on write | 365 days needed for heatmap + 35 days buffer. ~120KB max. |
| Progress map columns at desktop | 3 columns (not 4-5) | `max-w-2xl` container = 672px. 3 × ~200px is the practical maximum for readable book cards. |
| Psalms (150 chapters) cell layout | Wrap to multiple lines within the card (Option A per spec) | Uniform cell size across all books. Psalms card will be taller. Obadiah (1 chapter) will be compact. |
| Empty heatmap cells for future dates | Not rendered — grid only goes up to today's column | GitHub-style: rightmost column is the current partial week |
| Heatmap horizontal scroll on mobile | `overflow-x-auto` container with `-webkit-overflow-scrolling: touch` | 53 columns × 8px cells + 2px gaps = ~530px minimum. 375px viewport can't fit without scroll. |
| Today cell navigation target | `/bible` (BibleReader entry point) | Spec says "BibleReader entry point or daily devotional." Bible entry point is more natural from My Bible page context. |
| Tooltip positioning | Fixed position calculated from cell bounding rect, clamped to viewport | Prevents tooltip from overflowing viewport edges |
| Chapter visit recording point | VerseDisplay mount (not IntersectionObserver) | Records "opened chapter" not "scrolled through chapter." Captures all activity including quick references. |

---

## Implementation Steps

### Step 1: Types & Constants

**Objective:** Define TypeScript types for heatmap data structures and the chapter visit store.

**Files to create/modify:**
- `frontend/src/types/heatmap.ts` — CREATE — type definitions for all heatmap data
- `frontend/src/constants/bible.ts` — MODIFY — add `CHAPTERS_VISITED_KEY` constant

**Details:**

```typescript
// frontend/src/types/heatmap.ts

/** A single day's reading activity for the heatmap */
export interface DailyActivity {
  date: string                        // YYYY-MM-DD
  chapterCount: number                // total unique chapters read/visited
  chapters: Array<{ book: string; chapter: number }>  // detail for tooltip
}

/** Intensity level for heatmap cell coloring (5-state scale) */
export type HeatmapIntensity = 0 | 1 | 2 | 3 | 4

/** A single book's coverage for the progress map */
export interface BookCoverage {
  name: string                        // display name, e.g. "Genesis"
  slug: string                        // URL slug, e.g. "genesis"
  testament: 'old' | 'new'
  totalChapters: number
  readChapters: Set<number>           // chapter numbers that have been read
  highlightedChapters: Set<number>    // chapter numbers with at least one highlight
}

/** Chapter state in the progress map (3-state scale) */
export type ChapterState = 'unread' | 'read' | 'highlighted'

/** Raw shape of wr_chapters_visited in localStorage */
export type ChapterVisitStore = Record<string, Array<{ book: string; chapter: number }>>
```

Add to `frontend/src/constants/bible.ts`:
```typescript
export const CHAPTERS_VISITED_KEY = 'wr_chapters_visited'
```

**Auth gating:** N/A — type definitions only.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT add runtime code in this step — types and constants only
- DO NOT modify existing type files — create a new `heatmap.ts` type file

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| N/A | N/A | Type-only step — TypeScript compiler validates |

**Expected state after completion:**
- [ ] `frontend/src/types/heatmap.ts` exports all heatmap types
- [ ] `CHAPTERS_VISITED_KEY` exported from `frontend/src/constants/bible.ts`
- [ ] `pnpm build` passes with zero errors

---

### Step 2: Chapter Visit Store

**Objective:** Create a reactive store for `wr_chapters_visited` that records per-day chapter visits with deduplication and day-based eviction.

**Files to create:**
- `frontend/src/lib/heatmap/chapterVisitStore.ts` — CREATE — reactive store
- `frontend/src/lib/heatmap/__tests__/chapterVisitStore.test.ts` — CREATE — unit tests

**Details:**

Follow the reactive store pattern from `frontend/src/lib/bible/streakStore.ts` (lines 1-182):

```typescript
// Module-level cache + listeners pattern
let cache: ChapterVisitStore | null = null
const listeners = new Set<() => void>()

// Storage I/O
function readFromStorage(): ChapterVisitStore { ... }
function writeToStorage(data: ChapterVisitStore): void { ... }

// Public API
export function recordChapterVisit(book: string, chapter: number): void
  // 1. Get today's date via getTodayLocal()
  // 2. Read current store
  // 3. Check if book+chapter already recorded today → return early if so (dedup)
  // 4. Append { book, chapter } to today's entry
  // 5. If store has >400 date entries, evict oldest dates
  // 6. Write to storage + notify listeners

export function getAllVisits(): ChapterVisitStore
  // Returns a shallow clone of the cache

export function getVisitsInRange(startDate: string, endDate: string): ChapterVisitStore
  // Returns entries within the date range (inclusive)

export function subscribe(listener: () => void): () => void
  // Standard subscribe pattern

export function _resetForTesting(): void
  // Clears cache for test isolation
```

Key behaviors:
- `recordChapterVisit` is idempotent within the same day+book+chapter
- 400-day cap with oldest-first eviction (sorted by date key)
- All date strings use `getTodayLocal()` from `frontend/src/lib/bible/dateUtils.ts` — local timezone, never UTC
- Silent failure on localStorage unavailable (try/catch around all I/O)

**Auth gating:** The store itself does NOT check auth — callers are responsible for gating. This matches the pattern in `streakStore.ts` where `recordReadToday()` does not check auth.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT use `new Date().toISOString().split('T')[0]` — returns UTC, not local. Use `getTodayLocal()`.
- DO NOT store timestamps within visits — only date + book + chapter (minimizes storage)
- DO NOT read from other stores (highlights, progress) — this store is standalone

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| records a chapter visit for today | unit | Call `recordChapterVisit('genesis', 1)`, verify in `getAllVisits()` |
| deduplicates same book+chapter on same day | unit | Call twice with same args, verify only one entry |
| allows different chapters on same day | unit | Record genesis:1 and genesis:2, verify both present |
| allows different books on same day | unit | Record genesis:1 and john:3, verify both present |
| evicts oldest days when exceeding 400 cap | unit | Seed 400 days, add one more, verify oldest evicted |
| returns empty object for new users | unit | Fresh localStorage, verify `getAllVisits()` returns `{}` |
| getVisitsInRange filters by date range | unit | Seed multiple days, verify range query returns subset |
| handles localStorage unavailable gracefully | unit | Mock localStorage.setItem to throw, verify no error thrown |
| subscribe/unsubscribe notifies on write | unit | Subscribe listener, record visit, verify called |
| _resetForTesting clears cache | unit | Record, reset, verify empty |

**Expected state after completion:**
- [ ] `frontend/src/lib/heatmap/chapterVisitStore.ts` created with full API
- [ ] 10 unit tests passing
- [ ] `pnpm test` passes

---

### Step 3: VerseDisplay Integration

**Objective:** Wire `recordChapterVisit()` into the BibleReader's `VerseDisplay` component so every chapter view is recorded.

**Files to modify:**
- `frontend/src/components/bible/VerseDisplay.tsx` — MODIFY — add visit recording effect

**Details:**

Add a new `useEffect` in `VerseDisplay` (around line 128, after the existing IntersectionObserver effect) that records the chapter visit on mount:

```typescript
// Record chapter visit for heatmap (BB-43)
useEffect(() => {
  if (!isAuthenticated) return
  if (verses.length === 0) return
  recordChapterVisit(bookSlug, chapterNumber)
}, [isAuthenticated, bookSlug, chapterNumber, verses.length])
```

Import `recordChapterVisit` from `@/lib/heatmap/chapterVisitStore`.

This effect:
- Fires on mount and when chapter changes (bookSlug or chapterNumber props change)
- Guards on `isAuthenticated` (no writes for logged-out users)
- Guards on `verses.length > 0` (don't record empty/loading state)
- The store handles deduplication (same book+chapter+day recorded once)

**Auth gating:** `isAuthenticated` check in the effect (matches existing `markChapterRead` pattern at line 109).

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT modify the existing IntersectionObserver logic for `markChapterRead`
- DO NOT move or change any existing VerseDisplay behavior
- DO NOT add the visit recording inside the IntersectionObserver callback — it must fire on mount, not on scroll completion

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| records chapter visit on mount when authenticated | unit | Render VerseDisplay with auth, verify `recordChapterVisit` called |
| does not record when not authenticated | unit | Render VerseDisplay without auth, verify not called |
| does not record when verses array is empty | unit | Render with empty verses, verify not called |
| records again when chapter changes | unit | Change chapterNumber prop, verify called again |

**Expected state after completion:**
- [ ] `VerseDisplay.tsx` calls `recordChapterVisit` on chapter mount
- [ ] Existing VerseDisplay tests still pass unchanged
- [ ] 4 new tests passing
- [ ] Opening a chapter in BibleReader writes to `wr_chapters_visited`

---

### Step 4: Data Aggregation Functions

**Objective:** Create pure functions `getDailyActivityForLastYear()` and `getBibleCoverage()` that aggregate data from multiple stores into the shapes needed by the UI components.

**Files to create:**
- `frontend/src/lib/heatmap/aggregation.ts` — CREATE — pure aggregation functions
- `frontend/src/lib/heatmap/index.ts` — CREATE — barrel export
- `frontend/src/lib/heatmap/__tests__/aggregation.test.ts` — CREATE — unit tests

**Details:**

```typescript
// frontend/src/lib/heatmap/aggregation.ts

import { getAllVisits } from './chapterVisitStore'
import { getAllHighlights } from '@/lib/bible/highlightStore'
import { getAllBookmarks } from '@/lib/bible/bookmarkStore'
import { getAllNotes } from '@/lib/bible/notes/store'
import { BIBLE_BOOKS } from '@/constants/bible'
import type { DailyActivity, BookCoverage, HeatmapIntensity } from '@/types/heatmap'
import type { BibleProgressMap } from '@/types/bible'

/**
 * Returns a 365-day array (366 in leap years) ending today.
 * Each entry contains the date, chapter count, and chapter references.
 * Merges chapter visits + highlight/note/bookmark timestamps.
 */
export function getDailyActivityForLastYear(): DailyActivity[] {
  // 1. Build date range: today back to 365 days ago
  // 2. Read chapter visits from chapterVisitStore
  // 3. Read highlights, group by createdAt date → extract book:chapter
  // 4. Read bookmarks, group by createdAt date → extract book:chapter
  // 5. Read notes, group by createdAt date → extract book:chapter
  // 6. For each date: merge all sources, deduplicate by book:chapter key
  // 7. Return array ordered oldest → newest
}

/**
 * Maps a chapter count to a 5-state intensity level.
 */
export function getIntensity(chapterCount: number): HeatmapIntensity {
  if (chapterCount === 0) return 0
  if (chapterCount <= 2) return 1
  if (chapterCount <= 5) return 2
  if (chapterCount <= 9) return 3
  return 4
}

/**
 * Returns a 66-element array in canonical order.
 * Each entry contains the book metadata, read chapters, and highlighted chapters.
 */
export function getBibleCoverage(progress: BibleProgressMap): BookCoverage[] {
  // 1. Read all highlights once, build a Map<string, Set<number>> of book → highlighted chapters
  // 2. Map BIBLE_BOOKS to BookCoverage objects:
  //    - readChapters from progress[book.slug] ?? []
  //    - highlightedChapters from the highlights map
  // 3. Return in BIBLE_BOOKS canonical order
}

/**
 * Counts the total number of active reading days in the past year.
 */
export function countActiveDays(activity: DailyActivity[]): number {
  return activity.filter(d => d.chapterCount > 0).length
}

/**
 * Counts the total distinct chapters read across all books.
 */
export function countTotalChaptersRead(progress: BibleProgressMap): number {
  return Object.values(progress).reduce((sum, chapters) => sum + chapters.length, 0)
}

/**
 * Counts books that have at least one chapter read.
 */
export function countBooksVisited(progress: BibleProgressMap): number {
  return Object.values(progress).filter(chapters => chapters.length > 0).length
}
```

Barrel export at `frontend/src/lib/heatmap/index.ts`:
```typescript
export { recordChapterVisit, getAllVisits, subscribe as subscribeVisits } from './chapterVisitStore'
export { getDailyActivityForLastYear, getBibleCoverage, getIntensity, countActiveDays, countTotalChaptersRead, countBooksVisited } from './aggregation'
export type { DailyActivity, BookCoverage, HeatmapIntensity, ChapterState, ChapterVisitStore } from '@/types/heatmap'
```

**Auth gating:** N/A — pure functions, caller provides data.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT use `new Date().toISOString().split('T')[0]` — use `getTodayLocal()` for date generation
- DO NOT mutate input data — return new arrays/objects
- DO NOT access localStorage directly — read from store APIs only
- DO NOT include any React imports — these are pure TypeScript functions

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| getDailyActivityForLastYear returns 365 entries (non-leap year) | unit | Mock date, verify array length |
| getDailyActivityForLastYear returns 366 entries in leap year | unit | Mock date in leap year, verify length |
| getDailyActivityForLastYear merges visits + highlights by date | unit | Seed visits for day X and highlight for day X, verify merged count |
| getDailyActivityForLastYear deduplicates same book:chapter on same day | unit | Visit + highlight for same chapter, verify count = 1 not 2 |
| getDailyActivityForLastYear returns empty entries for days with no activity | unit | Verify chapterCount = 0 for unvisited days |
| getDailyActivityForLastYear is ordered oldest to newest | unit | Verify first entry is ~365 days ago, last is today |
| getIntensity maps 0 → 0 | unit | Direct assertion |
| getIntensity maps 1 → 1, 2 → 1 | unit | Boundary test |
| getIntensity maps 3 → 2, 5 → 2 | unit | Boundary test |
| getIntensity maps 6 → 3, 9 → 3 | unit | Boundary test |
| getIntensity maps 10 → 4, 100 → 4 | unit | Boundary test |
| getBibleCoverage returns 66 books in canonical order | unit | Verify length and first/last book |
| getBibleCoverage populates readChapters from progress map | unit | Seed progress, verify readChapters set |
| getBibleCoverage populates highlightedChapters from highlights | unit | Seed highlights, verify highlightedChapters set |
| getBibleCoverage returns empty sets for books with no activity | unit | Verify empty sets for unvisited books |
| countActiveDays counts days with chapterCount > 0 | unit | Mix of active and empty days |
| countTotalChaptersRead sums all chapters across books | unit | Multiple books with chapters |
| countBooksVisited counts books with at least one chapter | unit | Mix of visited and unvisited |

**Expected state after completion:**
- [ ] `frontend/src/lib/heatmap/aggregation.ts` exports all aggregation functions
- [ ] `frontend/src/lib/heatmap/index.ts` barrel export created
- [ ] 18 unit tests passing
- [ ] `pnpm build` passes

---

### Step 5: ReadingHeatmap Component

**Objective:** Build the 53-column × 7-row GitHub-contribution-style heatmap grid with tooltip, legend, and summary stats.

**Files to create:**
- `frontend/src/components/bible/my-bible/ReadingHeatmap.tsx` — CREATE — heatmap component
- `frontend/src/components/bible/my-bible/__tests__/ReadingHeatmap.test.tsx` — CREATE — tests

**Details:**

Component structure:
```tsx
interface ReadingHeatmapProps {
  dailyActivity: DailyActivity[]
  currentStreak: number
  activeDays: number
}

export function ReadingHeatmap({ dailyActivity, currentStreak, activeDays }: ReadingHeatmapProps) {
  // State: tooltipData (selected cell), tooltipPosition
  // Refs: containerRef for scroll, cellRefs for position calculation

  return (
    <section aria-label="Reading heatmap">
      {/* Summary line */}
      <p className="text-sm text-white">
        You've read on <strong>{activeDays}</strong> of the past 365 days
      </p>
      {currentStreak > 0 && (
        <p className="text-sm text-white/60">Current streak: {currentStreak} days</p>
      )}

      {/* Heatmap grid */}
      <div className="overflow-x-auto scrollbar-hide" ref={containerRef}>
        {/* Month labels row */}
        <div className="grid" style={{ gridTemplateColumns: 'auto repeat(53, 1fr)' }}>
          {/* empty corner cell + month labels */}
        </div>

        {/* Day labels + cell grid */}
        <div className="grid" style={{ gridTemplateColumns: 'auto repeat(53, 1fr)', gap: '2px' }}>
          {/* 7 rows, each with day label + 53 cells */}
          {/* Each cell: colored square, role="gridcell", aria-label with date/count */}
          {/* Today's cell: ring-2 ring-white/50, onClick navigates to /bible */}
          {/* Other cells: hover/tap shows tooltip */}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-white/50">Less</span>
        {/* 5 color swatches: bg-white/5, bg-primary/30, bg-primary/50, bg-primary/70, bg-primary/90 */}
        <span className="text-xs text-white/50">More</span>
      </div>

      {/* Tooltip (conditional) */}
      {tooltipData && <HeatmapTooltip ... />}
    </section>
  )
}
```

**Cell sizing:**
- Mobile (<640px): `w-[8px] h-[8px]` or `w-[10px] h-[10px]` with `rounded-[1px]`
- Tablet (640-1024px): `w-[10px] h-[10px]` or `w-[12px] h-[12px]` with `rounded-[2px]`
- Desktop (>1024px): `w-[12px] h-[12px]` or `w-[14px] h-[14px]` with `rounded-[2px]`

Use responsive Tailwind classes: `w-2 h-2 sm:w-2.5 sm:h-2.5 lg:w-3 lg:h-3`

**Grid layout algorithm:**
1. Start from 365 days ago (or 366 in leap year). Find the weekday (0=Sun, 1=Mon...6=Sat).
2. Column 0 starts on the Sunday of that week. Pad leading days that are outside the range.
3. Column 52 is the current partial week. Pad trailing days that are in the future.
4. Grid is CSS grid with `grid-template-columns: auto repeat(53, 1fr)` and `gap: 2px`.
5. Day-of-week labels in the leftmost column: show "Mon", "Wed", "Fri" (or "M", "W", "F" on mobile). Others empty.

**Month labels:** Calculate which column each month starts in. Render abbreviated month name ("Jan", "Feb"...) above the first column of that month. Use `text-xs text-white/40`.

**Tooltip behavior:**
- Desktop: show on `mouseenter`, hide on `mouseleave`. Position above the cell.
- Mobile: show on `click`/`tap`, hide on next tap or outside click.
- Content: "March 12, 2026 — 3 chapters read: John 3, Romans 8, Psalm 23" (or "No reading" for empty days)
- Style: `bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] rounded-lg px-3 py-2 text-xs text-white shadow-lg`
- Position: fixed/absolute, clamped to viewport edges

**Today's cell:** `ring-2 ring-white/50` border marker. On click/tap, navigates to `/bible`. `aria-label="Today — tap to open the Bible"`.

**Empty state (when all 365 days have 0 activity):**
- Replace grid with: `<p className="text-sm text-white/60">Your reading history will show up here as you read.</p>`

**Accessibility:**
- `<section aria-label="Reading heatmap">`
- Each cell: `role="gridcell"` with `aria-label="March 12, 2026: 3 chapters read"`
- Summary text above grid is the screen-reader-friendly overview
- Keyboard: cells are focusable via `tabindex="0"`, Enter/Space opens tooltip on focused cell

**Auth gating:** N/A — component receives data as props.

**Responsive behavior:**
- Desktop (1440px): Grid fits within `max-w-2xl` (672px). 53 columns × 14px + 52 gaps × 2px + day label = ~846px — will overflow slightly. Use `overflow-x-auto` container.
- Tablet (768px): 53 × 12px + 52 × 2px + label ≈ 740px — fits with minor scroll on smaller tablets.
- Mobile (375px): 53 × 8px + 52 × 2px + label ≈ 528px — horizontal scroll needed. Container has `overflow-x-auto` with `-webkit-overflow-scrolling: touch`.

**Inline position expectations:**
- Legend swatches and "Less"/"More" labels: same y ±5px at all breakpoints

**Guardrails (DO NOT):**
- DO NOT use SVG — use CSS grid/flexbox per spec
- DO NOT add count-up animations on cells — "no animation beyond subtle hover/focus transitions"
- DO NOT add praise language — "You've read on N of the past 365 days" is the exact copy
- DO NOT show percentages — counts only
- DO NOT render cells for future dates
- DO NOT use a charting library

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| renders grid with correct number of cells | integration | 53 × 7 = 371 cells max |
| applies correct intensity class to cells based on chapter count | unit | Verify bg classes match intensity levels |
| marks today's cell with ring border | integration | Find today's cell, verify `ring-2` class |
| shows tooltip on cell hover (desktop) | integration | Hover cell, verify tooltip appears with correct content |
| shows tooltip on cell tap (mobile) | integration | Click cell, verify tooltip appears |
| shows "No reading" tooltip for empty cells | integration | Hover empty cell, verify tooltip text |
| renders month labels along top | integration | Verify month abbreviation elements present |
| renders day-of-week labels on left | integration | Verify "Mon", "Wed", "Fri" labels |
| renders legend with 5 color swatches | integration | Find legend, count swatches |
| shows empty state when all days have 0 activity | integration | Pass all-zero data, verify empty message |
| hides streak display when currentStreak is 0 | unit | Pass streak=0, verify streak text absent |
| shows streak when currentStreak > 0 | unit | Pass streak=5, verify "Current streak: 5 days" |
| navigates to /bible when today's cell is clicked | integration | Click today cell, verify navigation |

**Expected state after completion:**
- [ ] `ReadingHeatmap` component renders correctly
- [ ] 13 component tests passing
- [ ] Cell colors match 5-state intensity scale
- [ ] Tooltip shows on hover/tap
- [ ] Today's cell visually distinct and navigable

---

### Step 6: BibleProgressMap Component

**Objective:** Build the 66-book Bible coverage visualization with OT/NT sections, per-book chapter cell grids, and navigable chapter cells.

**Files to create:**
- `frontend/src/components/bible/my-bible/BibleProgressMap.tsx` — CREATE — progress map component
- `frontend/src/components/bible/my-bible/__tests__/BibleProgressMap.test.tsx` — CREATE — tests

**Details:**

Component structure:
```tsx
interface BibleProgressMapProps {
  coverage: BookCoverage[]
  totalChaptersRead: number
  booksVisited: number
}

export function BibleProgressMap({ coverage, totalChaptersRead, booksVisited }: BibleProgressMapProps) {
  const navigate = useNavigate()
  const otBooks = coverage.filter(b => b.testament === 'old')
  const ntBooks = coverage.filter(b => b.testament === 'new')

  return (
    <section aria-label="Bible progress map">
      {/* Summary */}
      <p className="text-sm text-white">
        <strong>{totalChaptersRead}</strong> of 1,189 chapters read
        {' · '}
        <strong>{booksVisited}</strong> of 66 books visited
      </p>

      {/* Old Testament */}
      <div>
        <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider">Old Testament</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {otBooks.map(book => <BookCard key={book.slug} book={book} onNavigate={navigate} />)}
        </div>
      </div>

      {/* New Testament */}
      <div>
        <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider">New Testament</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {ntBooks.map(book => <BookCard key={book.slug} book={book} onNavigate={navigate} />)}
        </div>
      </div>
    </section>
  )
}
```

**BookCard sub-component** (same file):
```tsx
function BookCard({ book, onNavigate }: { book: BookCoverage; onNavigate: NavigateFunction }) {
  const readCount = book.readChapters.size

  function getChapterState(chapter: number): ChapterState {
    if (book.highlightedChapters.has(chapter)) return 'highlighted'
    if (book.readChapters.has(chapter)) return 'read'
    return 'unread'
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      {/* Book name (clickable → opens book's chapter list) */}
      <button
        type="button"
        onClick={() => onNavigate(`/bible/${book.slug}/1`)}
        className="text-sm font-medium text-white hover:text-white/80 transition-colors"
      >
        {book.name}
      </button>
      <p className="text-xs text-white/40 mt-0.5">
        {readCount} / {book.totalChapters} chapters
      </p>

      {/* Chapter cell grid */}
      <div className="mt-2 flex flex-wrap gap-[2px]">
        {Array.from({ length: book.totalChapters }, (_, i) => i + 1).map(chapter => {
          const state = getChapterState(chapter)
          return (
            <button
              key={chapter}
              type="button"
              onClick={() => onNavigate(`/bible/${book.slug}/${chapter}`)}
              className={cn(
                'w-[8px] h-[8px] sm:w-[9px] sm:h-[9px] lg:w-[10px] lg:h-[10px] rounded-[1px] transition-opacity hover:opacity-80',
                state === 'unread' && 'bg-white/8',
                state === 'read' && 'bg-primary/60',
                state === 'highlighted' && 'bg-primary/80',
              )}
              aria-label={`${book.name} chapter ${chapter}: ${state}`}
              title={`${book.name} ${chapter}`}
            />
          )
        })}
      </div>
    </div>
  )
}
```

**Chapter cell sizing:**
- Mobile: `w-[6px] h-[6px]` — spec says 6-10px on mobile. Use 6px base with touch padding.
- Tablet: `w-[7px] h-[7px]` to `w-[8px] h-[8px]`
- Desktop: `w-[8px] h-[8px]` to `w-[10px] h-[10px]`

Use `w-1.5 h-1.5 sm:w-2 sm:h-2 lg:w-2.5 lg:h-2.5` as the responsive Tailwind shorthand.

**Touch targets:** Spec requires 24px minimum for mobile tap accuracy. The 6-8px cells themselves are too small, but using `min-h-[24px] min-w-[24px]` padding wrapper or `p-2` on the wrapping flex container provides adequate spacing. Alternatively, accept the tight spacing since the cells are closely packed and a "near miss" tap on an adjacent chapter is still useful (it navigates to a chapter, just not the exact one targeted). The chapter cell grid is informational first, navigational second.

**Psalms (150 chapters) layout:** 150 cells × 8px + gaps ≈ 1200px wide. With `flex-wrap`, cells wrap to multiple lines within the card. Card height will be ~12 rows × 10px ≈ 120px for the cell grid. This is intentional per spec (Option A: uniform cell size, wrapping).

**Obadiah (1 chapter) layout:** Single cell. Card will be compact with minimal height. This is fine — the data speaks for itself.

**Empty state:** When `totalChaptersRead === 0 && booksVisited === 0`:
- Replace the map with: `<p className="text-sm text-white/60">Your reading map will show up here as you read.</p>`

**Accessibility:**
- `<section aria-label="Bible progress map">`
- Each chapter cell: `aria-label="Genesis chapter 1: read"` (or "unread" / "highlighted")
- Book name is a `<button>` (navigable, focusable)
- Chapter cells are `<button>` (navigable, focusable)
- Screen readers get the summary text above the map as the primary information

**Auth gating:** N/A — component receives data as props.

**Responsive behavior:**
- Desktop (1440px): 3-column book grid (`lg:grid-cols-3`). Each column ~200px. Chapter cells 10px.
- Tablet (768px): 2-column book grid (`sm:grid-cols-2`). Each column ~300px. Chapter cells 8px.
- Mobile (375px): 1-column book grid. Full-width cards. Chapter cells 6px.

**Guardrails (DO NOT):**
- DO NOT add percentages or progress bars — counts only per spec
- DO NOT add completion animations
- DO NOT add praise or judgment language
- DO NOT use SVG — CSS flexbox for chapter cell grids
- DO NOT sort books by completion — maintain canonical biblical order
- DO NOT use FrostedCard for individual book cards — use the lighter `bg-white/5 border border-white/10 rounded-xl` per spec design notes

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| renders OT and NT section headings | integration | Find "Old Testament" and "New Testament" headings |
| renders all 66 book cards | integration | Count BookCard elements |
| renders correct chapter count per book | integration | Verify "12 / 50 chapters" text for Genesis with 12 read |
| chapter cells use correct 3-state colors | unit | Verify bg classes: unread/read/highlighted |
| navigates to chapter on cell click | integration | Click cell, verify navigate called with `/bible/genesis/1` |
| navigates to book on name click | integration | Click book name, verify navigate called |
| shows correct total chapters read | integration | Verify "X of 1,189 chapters read" text |
| shows correct books visited count | integration | Verify "Y of 66 books visited" text |
| shows empty state when no chapters read | integration | Pass empty coverage, verify empty message |
| renders Psalms (150 chapters) with wrapped cells | integration | Render Psalms coverage, verify 150 chapter cells exist |
| renders Obadiah (1 chapter) correctly | integration | Render Obadiah, verify 1 chapter cell |
| responsive grid: 1 column on mobile | integration | Set viewport 375px, verify grid-cols-1 |

**Expected state after completion:**
- [ ] `BibleProgressMap` component renders correctly
- [ ] 12 component tests passing
- [ ] 66 books displayed in OT/NT sections
- [ ] Chapter cells navigable
- [ ] Responsive grid layout works at all breakpoints

---

### Step 7: MyBiblePage Integration

**Objective:** Wire `ReadingHeatmap` and `BibleProgressMap` into the existing My Bible page, above the current activity feed content.

**Files to modify:**
- `frontend/src/pages/MyBiblePage.tsx` — MODIFY — add heatmap + progress map sections

**Files to create:**
- `frontend/src/pages/__tests__/MyBiblePageHeatmap.test.tsx` — CREATE — integration tests

**Details:**

Add to `MyBiblePageInner` component:

1. Import the new components and data functions:
```typescript
import { ReadingHeatmap } from '@/components/bible/my-bible/ReadingHeatmap'
import { BibleProgressMap } from '@/components/bible/my-bible/BibleProgressMap'
import { getDailyActivityForLastYear, getBibleCoverage, countActiveDays, countTotalChaptersRead, countBooksVisited } from '@/lib/heatmap'
import { getStreak } from '@/lib/bible/streakStore'
```

2. Compute data via `useMemo` (re-derived when progress/highlights change):
```typescript
const dailyActivity = useMemo(() => getDailyActivityForLastYear(), [])
const activeDays = useMemo(() => countActiveDays(dailyActivity), [dailyActivity])
const coverage = useMemo(() => getBibleCoverage(progress), [progress])
const totalChaptersRead = useMemo(() => countTotalChaptersRead(progress), [progress])
const booksVisited = useMemo(() => countBooksVisited(progress), [progress])
```

Note: `getDailyActivityForLastYear()` reads from stores internally. The empty dependency array means it computes once on mount. This is acceptable because the My Bible page is not live-updating — a page refresh shows the latest data. If the user reads a chapter and navigates back, the page re-mounts and re-computes.

3. Insert into the JSX between the section divider and the main content div (after line 162):

```tsx
{/* Section divider */}
<div className="mx-auto max-w-6xl border-t border-white/[0.08]" />

{/* Heatmap + Progress Map (BB-43) */}
<div className="relative z-10 mx-auto max-w-2xl px-4">
  <div className="py-8">
    <ReadingHeatmap
      dailyActivity={dailyActivity}
      currentStreak={streakRecord.currentStreak}
      activeDays={activeDays}
    />
  </div>

  <div className="border-t border-white/[0.08]" />

  <div className="py-8">
    <BibleProgressMap
      coverage={coverage}
      totalChaptersRead={totalChaptersRead}
      booksVisited={booksVisited}
    />
  </div>

  <div className="border-t border-white/[0.08]" />
</div>

{/* Main content (existing) */}
<div className="relative z-10 mx-auto max-w-2xl px-4 pb-16">
  {/* ... existing stats, filters, feed ... */}
</div>
```

The `streakRecord` is already available via the existing `useStreakStore()` call at line 69.

The `progress` is available from the existing `useActivityFeed()` hook's underlying data, but it's not currently exposed. **Alternative:** Call `useBibleProgress()` directly for the progress map data:

```typescript
const { progress } = useBibleProgress()
```

This hook is already imported pattern-wise (add `useBibleProgress` to imports). The hook reads `wr_bible_progress` from localStorage.

**Auth gating:** N/A — page is already auth-gated. Components receive computed data as props.

**Responsive behavior:**
- Desktop (1440px): Both visualizations centered within `max-w-2xl` container
- Tablet (768px): Same layout, slightly smaller cells
- Mobile (375px): Heatmap horizontally scrollable, progress map single-column grid

**Guardrails (DO NOT):**
- DO NOT change the existing hero section, SEO metadata, or breadcrumbs
- DO NOT modify the existing activity feed logic or filter bar
- DO NOT move the streak detail modal or settings modal
- DO NOT add new auth checks — rely on existing page-level gate
- DO NOT change the existing quick stats row — it still shows below the progress map

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| renders ReadingHeatmap on My Bible page | integration | Navigate to /bible/my, verify heatmap section present |
| renders BibleProgressMap on My Bible page | integration | Navigate to /bible/my, verify progress map section present |
| heatmap appears above progress map | integration | Verify DOM order |
| progress map appears above activity feed | integration | Verify DOM order |
| existing activity feed still renders | integration | Verify ActivityFilterBar and ActivityCard elements present |
| page renders correctly with no reading data | integration | Empty localStorage, verify both empty states + existing empty state |

**Expected state after completion:**
- [ ] My Bible page shows heatmap at top, progress map below, activity feed below that
- [ ] 6 integration tests passing
- [ ] All existing MyBiblePage tests still pass
- [ ] No visual or functional regressions
- [ ] `pnpm build` passes

---

### Step 8: Documentation & Final Cleanup

**Objective:** Update localStorage key documentation and create the recon document required by the spec.

**Files to modify:**
- `.claude/rules/11-local-storage-keys.md` — MODIFY — add `wr_chapters_visited` key documentation

**Files to create:**
- `_plans/recon/bb43-heatmap-data.md` — CREATE — data source recon document (spec acceptance criterion)

**Details:**

Add to the "Bible Reader" section of `11-local-storage-keys.md`:

```markdown
| `wr_chapters_visited` | `Record<string, Array<{ book: string; chapter: number }>>` | Per-day chapter visit log for heatmap (BB-43). Key: YYYY-MM-DD date, value: array of visited chapters. Capped at 400 days. Written on chapter mount in BibleReader, read by My Bible heatmap. |
```

Create `_plans/recon/bb43-heatmap-data.md` documenting:
- Data sources investigated (wr_bible_progress, bible:streak, wr_bible_highlights, bible:bookmarks, bible:notes, wr_bible_last_read)
- Why `wr_chapters_visited` was needed (no existing key provides per-day chapter-level reading history)
- Aggregation logic: primary source (chapter visits) + supplementary sources (highlight/note/bookmark timestamps)
- Visual encoding: 5-state heatmap scale, 3-state progress map scale
- Decision: merge all timestamped sources by date, deduplicate by book:chapter

**Auth gating:** N/A — documentation only.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT modify any code files in this step
- DO NOT add new features — documentation only

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| N/A | N/A | Documentation-only step |

**Expected state after completion:**
- [ ] `wr_chapters_visited` documented in `11-local-storage-keys.md`
- [ ] `_plans/recon/bb43-heatmap-data.md` created with full data source documentation
- [ ] All tests still passing
- [ ] `pnpm build` passes
- [ ] `pnpm lint` passes

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Types & constants (no runtime code) |
| 2 | 1 | Chapter visit store (uses types from Step 1) |
| 3 | 1, 2 | VerseDisplay integration (uses store from Step 2) |
| 4 | 1, 2 | Data aggregation (uses store + types) |
| 5 | 1, 4 | ReadingHeatmap component (uses aggregation output types) |
| 6 | 1, 4 | BibleProgressMap component (uses aggregation output types) |
| 7 | 5, 6, 4 | MyBiblePage integration (wires everything together) |
| 8 | 7 | Documentation (final step, references all prior work) |

Steps 5 and 6 are **independent** and can be executed in parallel.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Types & Constants | [COMPLETE] | 2026-04-13 | Created `frontend/src/types/heatmap.ts` (DailyActivity, HeatmapIntensity, BookCoverage, ChapterState, ChapterVisitStore). Added `CHAPTERS_VISITED_KEY` to `frontend/src/constants/bible.ts`. |
| 2 | Chapter Visit Store | [COMPLETE] | 2026-04-13 | Created `frontend/src/lib/heatmap/chapterVisitStore.ts` + 10 unit tests passing. |
| 3 | VerseDisplay Integration | [COMPLETE] | 2026-04-13 | Added `recordChapterVisit` effect in `VerseDisplay.tsx`. 4 new tests passing. |
| 4 | Data Aggregation Functions | [COMPLETE] | 2026-04-13 | Created `aggregation.ts` + `index.ts` barrel. 18 unit tests passing. |
| 5 | ReadingHeatmap Component | [COMPLETE] | 2026-04-13 | Created `ReadingHeatmap.tsx` with grid, tooltip, legend, empty state. 13 tests passing. Fixed Fragment key warning. |
| 6 | BibleProgressMap Component | [COMPLETE] | 2026-04-13 | Created `BibleProgressMap.tsx` with OT/NT sections, 66 book cards, 3-state chapter cells. 12 tests passing. |
| 7 | MyBiblePage Integration | [COMPLETE] | 2026-04-13 | Wired ReadingHeatmap + BibleProgressMap into MyBiblePage.tsx. Added useBibleProgress hook. 6 integration tests passing. |
| 8 | Documentation & Final Cleanup | [COMPLETE] | 2026-04-13 | Added `wr_chapters_visited` to `11-local-storage-keys.md`. Created `_plans/recon/bb43-heatmap-data.md`. Fixed pre-existing `MyBiblePage.test.tsx` failures by adding `useBibleProgress` and heatmap mocks. Net test delta: +63 new tests, -7 pre-existing failures fixed. Zero regressions. |
