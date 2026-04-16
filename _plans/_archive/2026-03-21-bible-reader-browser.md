# Implementation Plan: Bible Reader — Browser & Reading View

**Spec:** `_specs/bible-reader-browser.md`
**Date:** 2026-03-21
**Branch:** `claude/feature/bible-reader-browser`
**Design System Reference:** `_plans/recon/design-system.md` (loaded)
**Recon Report:** not applicable
**Master Spec Plan:** not applicable (Spec 1 of 3-spec Bible reader sequence)

---

## Architecture Context

### Project Structure

- **Pages:** `frontend/src/pages/` — top-level route components (e.g., `ReadingPlans.tsx`, `ReadingPlanDetail.tsx`)
- **Components:** `frontend/src/components/` — organized by feature (`reading-plans/`, `prayer-wall/`, `daily/`, `audio/`, `ui/`)
- **Data:** `frontend/src/data/` — static data files (e.g., `data/reading-plans/*.ts`, `data/devotionals.ts`)
- **Types:** `frontend/src/types/` — TypeScript interfaces (e.g., `reading-plans.ts`, `prayer-wall.ts`)
- **Constants:** `frontend/src/constants/` — static values (e.g., `reading-plans.ts`, `crisis-resources.ts`)
- **Hooks:** `frontend/src/hooks/` — custom hooks (e.g., `useAuth.ts`, `useReadingPlanProgress.ts`)
- **Utils:** `frontend/src/utils/` and `frontend/src/lib/` — pure utility functions

### Relevant Existing Patterns

**Navbar (`components/Navbar.tsx` lines 12-18):**
```typescript
const NAV_LINKS: ReadonlyArray<{ label: string; to: string; icon?: LucideIcon }> = [
  { label: 'Daily Hub', to: '/daily' },
  { label: 'Daily Devotional', to: '/devotional', icon: Sparkles },
  { label: 'Reading Plans', to: '/reading-plans', icon: BookOpen },
  { label: 'Prayer Wall', to: '/prayer-wall' },
  { label: 'Music', to: '/music' },
]
```
Bible link should be inserted between Daily Hub-related links and Prayer Wall — after "Reading Plans" and before "Prayer Wall". The spec says "between Daily Hub and Prayer Wall (before Reading Plans link)" — but current order is Daily Hub → Daily Devotional → Reading Plans → Prayer Wall → Music. To match the spec intent (Bible is a primary nav item near Daily Hub), place it as: Daily Hub → Bible → Daily Devotional → Reading Plans → Prayer Wall → Music. Or: Daily Hub → Daily Devotional → Reading Plans → Bible → Prayer Wall → Music. **Spec says "between Daily Hub and Prayer Wall"** which means anywhere in that range. Given Bible is a major feature, placing it right after Daily Hub is reasonable. Use `Book` (Lucide) icon.

**PageHero (`components/PageHero.tsx`):**
```typescript
const HERO_BG_STYLE = {
  backgroundImage: 'linear-gradient(to bottom, #0D0620 0%, #0D0620 20%, #6D28D9 60%, #F5F5F5 100%)',
}
// Uses: font-script text-5xl font-bold text-white for h1
// subtitle: font-sans text-base text-white/85 sm:text-lg lg:text-xl
```
Bible reader needs a dark-only variant for the reading view (no fade to #F5F5F5), similar to the `DETAIL_HERO_STYLE` in `ReadingPlanDetail.tsx`:
```typescript
const DETAIL_HERO_STYLE = {
  backgroundImage: 'radial-gradient(100% 80% at 50% 0%, #3B0764 0%, transparent 60%), linear-gradient(#0D0620 0%, #1E0B3E 30%, #4A1D96 55%, #0D0620 100%)',
}
```

**Verse display pattern (`components/reading-plans/DayContent.tsx` lines 23-31):**
```tsx
<div className="font-serif text-base italic leading-relaxed text-white/90 sm:text-lg">
  {verses.map((verse) => (
    <span key={verse.number}>
      <sup className="mr-1 align-super font-sans text-xs not-italic text-white/30">
        {verse.number}
      </sup>
      {verse.text}{' '}
    </span>
  ))}
</div>
```
Bible reader uses similar pattern but with larger text (18px desktop/16px mobile) and 1.8 line-height for sustained reading. Also non-italic (reading plans show passages in italic; Bible reader shows the primary text normally).

**DaySelector dropdown (`components/reading-plans/DaySelector.tsx`):**
Chapter selector dropdown follows same pattern — dark frosted glass, keyboard navigation, ARIA listbox.

**PlanNotFound (`components/reading-plans/PlanNotFound.tsx`):**
Book/chapter not found pages follow this exact pattern — centered message with link back to `/bible`.

**Progress tracking (`hooks/useReadingPlanProgress.ts`):**
```typescript
const READING_PLAN_PROGRESS_KEY = 'wr_reading_plan_progress'
// readProgress() — readJSON with try-catch fallback to {}
// writeProgress() — writeJSON
// Hook: useReadingPlanProgress() with getProgress, completeDay, etc.
// Auth-gated: all writes check isAuthenticated
// IO on sentinel element at end of content for completion detection
```
Bible reader uses same pattern with `wr_bible_progress` key. Simpler model: `Record<string, number[]>` (book slug → array of completed chapter numbers).

**Auth context (`contexts/AuthContext.tsx`):**
```typescript
const { isAuthenticated, user } = useAuth()
// isAuthenticated checks localStorage wr_auth_simulated
// Used to gate writes; reads work for all users
```

**Routes (`App.tsx`):**
All routes defined in flat `<Routes>` block. Bible routes: `/bible` (browser) and `/bible/:book/:chapter` (reading view). Both public routes.

### Test Patterns

- **Test location:** Co-located `__tests__/` directories (e.g., `pages/__tests__/ReadingPlans.test.tsx`)
- **Provider wrapping:** Tests wrap with `BrowserRouter`, `AuthProvider`, `ToastProvider`, `AuthModalProvider` as needed
- **Testing library:** Vitest + React Testing Library + jsdom
- **Naming:** `describe('ComponentName', () => { it('should ...') })`
- **Mock patterns:** `vi.mock()` for hooks, `vi.spyOn()` for modules
- **Auth testing:** Mock `useAuth` to test logged-in vs logged-out behavior

---

## Auth Gating Checklist

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Reading progress tracking (IO on scroll to bottom) | Logged-in only | Step 7 | `useAuth().isAuthenticated` — IO only fires when authenticated |
| Progress indicators on browser page | Visible only for logged-in users | Steps 5, 7 | `useAuth().isAuthenticated` — conditionally render progress UI |
| Chapter completed indicators | Visible only for logged-in users | Step 5 | `useAuth().isAuthenticated` — conditional styling on chapter buttons |

**Note:** Browse, read, search, navigate, and cross-feature CTAs are all fully public — no auth gating needed.

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| PageHero background (browser) | background-image | `linear-gradient(to bottom, #0D0620 0%, #0D0620 20%, #6D28D9 60%, #F5F5F5 100%)` | design-system.md / PageHero.tsx |
| PageHero h1 | font | Caveat (`font-script`), 48px mobile / 60px sm / 72px lg, 700 bold, white | design-system.md |
| PageHero subtitle | font | Inter, 16px base / 18px sm / 20px lg, 400, white/85 | PageHero.tsx |
| Reading view background | background-image | `radial-gradient(100% 80% at 50% 0%, #3B0764 0%, transparent 60%), linear-gradient(#0D0620 0%, #1E0B3E 30%, #4A1D96 55%, #0D0620 100%)` | ReadingPlanDetail.tsx:21-24 |
| Verse text (reading view) | font | Lora (`font-serif`), 16px mobile / 18px desktop, 400, line-height 1.8, `text-white/90` | spec requirement |
| Verse number (reading view) | font | Inter (`font-sans`), 12px (`text-xs`), `text-white/30`, superscript | DayContent.tsx:26 pattern |
| Frosted glass card | background + border | `bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl` | spec + design-system.md |
| Chapter button | min size | `min-h-[44px] min-w-[44px]` | spec requirement (44px touch target) |
| Primary button | background | `bg-primary text-white font-semibold py-3 px-8 rounded-lg` | design-system.md |
| Segmented control (active) | background | `bg-primary text-white` | Journal mode toggle pattern |
| Segmented control (inactive) | background | `transparent text-white/70` | adapted from mode toggle |
| "Coming soon" badge | style | `text-xs text-white/40 bg-white/5 rounded-full px-2 py-0.5` | [UNVERIFIED] → match existing badge patterns |
| Reading view dark bg | background | `#0D0620` (`bg-hero-dark`) | consistent with dark reading context |
| Nav link | style | `{ label: 'Bible', to: '/bible', icon: Book }` | Navbar.tsx pattern |
| Highlight animation | background | `bg-primary/10` fading over 2s | spec requirement |

---

## Design System Reminder

- Worship Room uses **Caveat** (`font-script`) for hero headings and highlighted words, not Lora
- **Lora** (`font-serif`) is for scripture text and journal prompts
- **Inter** (`font-sans`) is for body text, UI elements, and non-scripture headings
- PageHero h1 always uses `font-script` (Caveat), never `font-serif` (Lora)
- The spec says subtitle in "Lora italic" but PageHero uses `font-sans` (Inter) — follow existing PageHero component pattern for consistency, and use `font-serif italic` only for the subtitle text as the spec requests it specifically for this page
- All tabs/content areas share `max-w-2xl` container width for reading content
- Browser pages use `max-w-4xl` for wider grid layouts
- Dark reading backgrounds use `#0D0620` (hero-dark) or the radial gradient pattern
- Frosted glass cards: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl`
- Verse numbers: `text-white/30 text-xs` superscript (muted, non-distracting)
- All interactive elements: 44px min touch target on mobile
- Dropdown panels: `bg-hero-mid border border-white/15 shadow-lg`

---

## Shared Data Models

```typescript
// frontend/src/types/bible.ts

/** Metadata for a single book of the Bible */
export interface BibleBook {
  /** Display name (e.g., "Genesis", "1 Corinthians") */
  name: string
  /** URL-safe slug (e.g., "genesis", "1-corinthians") */
  slug: string
  /** Total number of chapters */
  chapters: number
  /** Which testament */
  testament: 'old' | 'new'
  /** Traditional category grouping */
  category: BibleCategory
  /** Whether full WEB text is available in this build */
  hasFullText: boolean
}

export type BibleCategory =
  | 'pentateuch'
  | 'historical'
  | 'wisdom-poetry'
  | 'major-prophets'
  | 'minor-prophets'
  | 'gospels'
  | 'history'
  | 'pauline-epistles'
  | 'general-epistles'
  | 'prophecy'

export interface BibleVerse {
  number: number
  text: string
}

/** A chapter's complete verse data (loaded on demand) */
export interface BibleChapter {
  bookSlug: string
  chapter: number
  verses: BibleVerse[]
}

/** Search result from Bible text search */
export interface BibleSearchResult {
  bookName: string
  bookSlug: string
  chapter: number
  verseNumber: number
  verseText: string
  /** Verse before the match (if exists) */
  contextBefore?: string
  /** Verse after the match (if exists) */
  contextAfter?: string
}

/** Progress map: book slug → array of completed chapter numbers */
export type BibleProgressMap = Record<string, number[]>
```

**localStorage keys this spec touches:**

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_bible_progress` | Both | JSON object: `BibleProgressMap` — book slug → completed chapter numbers. Auth-gated writes. |

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | Single column, full-width accordion, chapter grid 5-6 columns, reading text 16px, nav buttons stacked |
| Tablet | 768px | Centered `max-w-4xl` browser / `max-w-2xl` reader, chapter grid 8-10 columns, reading text 18px, nav buttons side-by-side |
| Desktop | 1440px | Same centered containers with generous side margins, chapter grid 10-12 columns |

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| PageHero → content area (browser) | 0px (content directly after hero, bg transition handles it) | PageHero component pattern |
| Segmented control → accordion/search content | 24px (`mt-6`) | [UNVERIFIED] → match Daily Hub tab→content spacing |
| Last verse → chapter nav buttons (reading view) | 48px (`mt-12`) | [UNVERIFIED] → match ReadingPlanDetail spacing |
| Chapter nav → cross-feature CTAs | 32px (`mt-8`) | [UNVERIFIED] → reasonable spacing for CTA section |
| Last content → footer | 0px (footer handled by Layout) | Layout.tsx pattern |

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] WEB (World English Bible) text for 20 books is sourced and ready (or will be included inline in data files during implementation)
- [ ] Feature branch `claude/feature/bible-reader-browser` exists and is checked out
- [ ] `Book` icon from `lucide-react` is available (standard Lucide icon)
- [ ] All auth-gated actions from the spec are accounted for in the plan (3 actions: progress tracking, progress indicators, completed indicators)
- [ ] Design system values are verified from recon and codebase inspection
- [ ] [UNVERIFIED] values are flagged with verification methods (4 values flagged)
- [ ] No prior specs in the sequence needed (this is Spec 1)

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Navbar position for "Bible" link | After "Daily Hub", before "Daily Devotional" | Spec says "between Daily Hub and Prayer Wall". Bible is a primary feature (bigger than devotionals/reading plans), so it should be prominent. Position: 2nd in nav. |
| Bible text data file structure | One file per book (lazy-loaded via `import()`) | Code splitting per the spec. Each book file exports its chapter/verse data. Index file exports only metadata. |
| Accordion state persistence | Session-only (React state, not localStorage) | Spec explicitly says "The accordion state is session-only (not persisted)." |
| Search implementation | Client-side search across in-memory loaded text | All 20 books' text lazy-loaded on demand; search loads all 20 and searches. Could be optimized with a pre-built index but premature for MVP. |
| Search loading strategy | Load all 20 books when search mode activates | Ensures full search coverage. Files are code-split so they load in parallel. |
| Chapter completion on books without full text | Not applicable | Cannot scroll to bottom of placeholder — no IO fires. |
| `?book=` query param on browser page | Read on mount to auto-expand the specified book | Spec: "navigates to `/bible` with the query parameter `?book=:bookSlug`" |
| BibleGateway URL format | `https://www.biblegateway.com/passage/?search=BOOK+CHAPTER&version=WEB` | Standard BibleGateway URL pattern for WEB translation |
| Reading view hero subtitle | Use `font-serif italic` for "The Word of God" on browser page only | Spec says subtitle in Lora italic. On reading view, the hero has book+chapter info, no separate subtitle needed. |
| Segmented control styling | Dark frosted glass pill (not the Journal toggle pattern) | Spec says "frosted glass pills" matching existing toggle patterns. The segmented control lives on a dark background, so use dark-mode variant. |

---

## Implementation Steps

### Step 1: Bible Types & Constants

**Objective:** Define TypeScript types, book metadata for all 66 books, and category constants.

**Files to create:**
- `frontend/src/types/bible.ts` — Type definitions
- `frontend/src/constants/bible.ts` — Book metadata array, category labels, localStorage key
- `frontend/src/data/bible/index.ts` — Book metadata re-export + lazy loader functions

**Details:**

Create `types/bible.ts` with the interfaces defined in the Shared Data Models section above.

Create `constants/bible.ts` with:
- `BIBLE_PROGRESS_KEY = 'wr_bible_progress'`
- `BIBLE_BOOKS: BibleBook[]` — all 66 books with name, slug, chapters, testament, category, hasFullText
- `BIBLE_CATEGORIES` — ordered array of `{ key: BibleCategory, label: string, testament: 'old' | 'new' }`
- `CATEGORY_LABELS: Record<BibleCategory, string>` mapping
- `BOOKS_WITH_FULL_TEXT` — set of 20 slugs for quick lookup

The 20 books with full text: genesis, exodus, psalms, proverbs, ecclesiastes, isaiah, jeremiah, lamentations, matthew, mark, luke, john, acts, romans, 1-corinthians, 2-corinthians, galatians, ephesians, philippians, revelation.

Create `data/bible/index.ts` with:
- `getBookBySlug(slug: string): BibleBook | undefined`
- `getBooksByTestament(testament: 'old' | 'new'): BibleBook[]`
- `getBooksByCategory(category: BibleCategory): BibleBook[]`
- `loadChapter(bookSlug: string, chapter: number): Promise<BibleChapter | null>` — uses dynamic `import()` for code splitting
- `loadAllBookText(bookSlug: string): Promise<BibleChapter[]>` — loads entire book for search
- `getBibleGatewayUrl(bookName: string, chapter: number): string` — generates BibleGateway URL

**Guardrails (DO NOT):**
- Do NOT include any verse text in the constants/metadata files — only structural data
- Do NOT import verse text statically — all verse text must be lazy-loaded
- Do NOT use `require()` for dynamic imports — use `import()` for proper code splitting

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `BIBLE_BOOKS has 66 entries` | unit | Verify total book count |
| `OT has 39 books, NT has 27` | unit | Verify testament counts |
| `All 20 full-text books have hasFullText: true` | unit | Verify full-text flags |
| `All slugs are URL-safe` | unit | Verify slug format (lowercase, hyphens) |
| `getBookBySlug returns correct book` | unit | Verify lookup function |
| `getBibleGatewayUrl formats correctly` | unit | Verify URL generation |
| `Category groupings are complete` | unit | Verify every book has a valid category |

**Expected state after completion:**
- [ ] All 66 books defined with correct metadata
- [ ] Types fully specified
- [ ] Dynamic import loader function ready (actual data files not yet created)
- [ ] All unit tests pass

---

### Step 2: Bible Text Data Files (20 Books)

**Objective:** Create WEB translation verse text files for the 20 included books, structured for code splitting.

**Files to create:**
- `frontend/src/data/bible/books/genesis.ts` through `frontend/src/data/bible/books/revelation.ts` — 20 files total

**Details:**

Each file exports an array of `BibleChapter` objects:
```typescript
// frontend/src/data/bible/books/genesis.ts
import type { BibleChapter } from '@/types/bible'

export const genesisChapters: BibleChapter[] = [
  {
    bookSlug: 'genesis',
    chapter: 1,
    verses: [
      { number: 1, text: 'In the beginning, God created the heavens and the earth.' },
      { number: 2, text: 'The earth was formless and empty...' },
      // ... all verses for chapter 1
    ],
  },
  // ... all 50 chapters
]
```

Update `data/bible/index.ts` to wire up dynamic imports:
```typescript
const BOOK_LOADERS: Record<string, () => Promise<{ default: BibleChapter[] } | { [key: string]: BibleChapter[] }>> = {
  genesis: () => import('./books/genesis').then(m => ({ default: m.genesisChapters })),
  exodus: () => import('./books/exodus').then(m => ({ default: m.exodusChapters })),
  // ... 20 entries
}
```

**WEB text source:** The World English Bible is public domain. Text can be sourced from ebible.org or similar WEB sources. Each verse is plain text, no HTML.

**Important:** These files will be large (Psalms alone has 150 chapters, ~2500 verses). This is expected — code splitting ensures they load on demand only.

**Guardrails (DO NOT):**
- Do NOT include HTML or markdown in verse text — plain text only
- Do NOT bundle all 20 files into one — each book is a separate file for code splitting
- Do NOT include verse text for the 46 books without full text
- Do NOT add commentary or notes — only the WEB translation text verbatim

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `Each book file exports chapters matching book's chapter count` | unit | Verify chapter array length matches metadata |
| `Every chapter has at least 1 verse` | unit | Verify no empty chapters |
| `Verse numbers are sequential starting from 1` | unit | Verify verse ordering |
| `loadChapter returns correct chapter data` | unit | Verify dynamic loader |
| `loadChapter returns null for books without text` | unit | Verify fallback |

**Expected state after completion:**
- [ ] 20 data files with complete WEB verse text
- [ ] Dynamic imports wired up in index.ts
- [ ] Code splitting verified (verse text not in main bundle)
- [ ] Tests pass

---

### Step 3: Bible Progress Hook

**Objective:** Create `useBibleProgress` hook for localStorage-based reading progress tracking.

**Files to create:**
- `frontend/src/hooks/useBibleProgress.ts`

**Details:**

Follow the `useReadingPlanProgress` pattern (`hooks/useReadingPlanProgress.ts`):

```typescript
import { useCallback, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { BIBLE_PROGRESS_KEY } from '@/constants/bible'
import type { BibleProgressMap } from '@/types/bible'

function readProgress(): BibleProgressMap {
  try {
    const raw = localStorage.getItem(BIBLE_PROGRESS_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return {}
    return parsed as BibleProgressMap
  } catch {
    return {} // Graceful recovery from corrupted JSON
  }
}

function writeProgress(data: BibleProgressMap): void {
  try {
    localStorage.setItem(BIBLE_PROGRESS_KEY, JSON.stringify(data))
  } catch {
    // Silently fail on quota exceeded
  }
}

export function useBibleProgress() {
  const { isAuthenticated } = useAuth()
  const [progress, setProgress] = useState<BibleProgressMap>(readProgress)

  const markChapterRead = useCallback(
    (bookSlug: string, chapter: number) => {
      if (!isAuthenticated) return // Auth-gated
      const current = readProgress()
      const bookProgress = current[bookSlug] ?? []
      if (bookProgress.includes(chapter)) return // Already read
      const updated = { ...current, [bookSlug]: [...bookProgress, chapter] }
      writeProgress(updated)
      setProgress(updated)
    },
    [isAuthenticated],
  )

  const getBookProgress = useCallback(
    (bookSlug: string): number[] => {
      if (!isAuthenticated) return []
      return progress[bookSlug] ?? []
    },
    [isAuthenticated, progress],
  )

  const isChapterRead = useCallback(
    (bookSlug: string, chapter: number): boolean => {
      if (!isAuthenticated) return false
      return (progress[bookSlug] ?? []).includes(chapter)
    },
    [isAuthenticated, progress],
  )

  return { progress, markChapterRead, getBookProgress, isChapterRead }
}
```

**Guardrails (DO NOT):**
- Do NOT write progress for logged-out users (no-op on `markChapterRead`)
- Do NOT expose progress data for logged-out users (return empty arrays)
- Do NOT throw on corrupted localStorage — gracefully recover to `{}`

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `markChapterRead no-ops when not authenticated` | unit | Verify auth gating |
| `markChapterRead adds chapter to book progress` | unit | Verify write behavior |
| `markChapterRead is idempotent (no duplicates)` | unit | Verify dedup |
| `getBookProgress returns empty array when not authenticated` | unit | Verify auth gating |
| `getBookProgress returns correct chapters` | unit | Verify read behavior |
| `isChapterRead returns false when not authenticated` | unit | Verify auth gating |
| `Corrupted JSON in localStorage recovers to empty object` | unit | Verify error recovery |
| `Progress persists across hook re-mounts` | unit | Verify localStorage persistence |

**Expected state after completion:**
- [ ] Hook created following existing patterns
- [ ] Auth gating on all write operations
- [ ] Graceful error recovery
- [ ] All unit tests pass

---

### Step 4: Navbar Integration

**Objective:** Add "Bible" link to the main navigation bar.

**Files to modify:**
- `frontend/src/components/Navbar.tsx` — Add to NAV_LINKS array

**Details:**

Import `Book` icon from `lucide-react` (already likely used elsewhere, but verify).

Update `NAV_LINKS` array at line ~12:
```typescript
const NAV_LINKS: ReadonlyArray<{ label: string; to: string; icon?: LucideIcon }> = [
  { label: 'Daily Hub', to: '/daily' },
  { label: 'Bible', to: '/bible', icon: Book },        // NEW
  { label: 'Daily Devotional', to: '/devotional', icon: Sparkles },
  { label: 'Reading Plans', to: '/reading-plans', icon: BookOpen },
  { label: 'Prayer Wall', to: '/prayer-wall' },
  { label: 'Music', to: '/music' },
]
```

The mobile drawer (`MobileDrawer`) automatically renders all `NAV_LINKS` entries, so no separate mobile change is needed. Verify this is the case by checking the mobile drawer rendering loop.

**Auth gating:** None — Bible link is always visible.

**Responsive behavior:**
- Desktop: "Bible" appears as a text link (with Book icon) in the nav bar
- Mobile: "Bible" appears in the hamburger drawer in the same position

**Guardrails (DO NOT):**
- Do NOT add a dropdown for Bible — it's a direct link to `/bible`
- Do NOT add Bible to the footer nav columns (it already has plenty of links)
- Do NOT change existing link order beyond inserting the new entry

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `Bible link appears in desktop nav` | integration | Verify link renders |
| `Bible link navigates to /bible` | integration | Verify href |
| `Bible link appears in mobile drawer` | integration | Verify mobile drawer includes it |
| `Bible link appears for both logged-out and logged-in` | integration | Verify no auth gating |

**Expected state after completion:**
- [ ] "Bible" link visible in desktop nav between "Daily Hub" and "Daily Devotional"
- [ ] "Bible" link visible in mobile drawer in same position
- [ ] Link navigates to `/bible`
- [ ] All existing nav tests still pass

---

### Step 5: Bible Browser Page — Books Mode

**Objective:** Create the `/bible` page with the Books accordion browser showing all 66 books organized by testament and category.

**Files to create:**
- `frontend/src/pages/BibleBrowser.tsx` — Main page component
- `frontend/src/components/bible/BibleBooksMode.tsx` — Books mode with accordion
- `frontend/src/components/bible/TestamentAccordion.tsx` — Testament-level accordion section
- `frontend/src/components/bible/CategoryGroup.tsx` — Category sub-group with book list
- `frontend/src/components/bible/BookEntry.tsx` — Individual book with chapter grid
- `frontend/src/components/bible/ChapterGrid.tsx` — Grid of chapter number buttons
- `frontend/src/components/bible/SegmentedControl.tsx` — Books/Search toggle

**Details:**

**BibleBrowser.tsx** — Page wrapper:
```tsx
<Layout>
  <PageHero title="Bible" subtitle="The Word of God" />
  <div className="mx-auto max-w-4xl px-4 pb-16">
    <SegmentedControl mode={mode} onModeChange={setMode} />
    {mode === 'books' ? <BibleBooksMode /> : <BibleSearchMode />}
  </div>
</Layout>
```

For the subtitle "The Word of God", the spec says Lora italic. Override PageHero's subtitle rendering by passing `children` instead:
```tsx
<PageHero title="Bible">
  <p className="mx-auto max-w-xl font-serif text-base italic text-white/85 sm:text-lg lg:text-xl">
    The Word of God
  </p>
</PageHero>
```

**SegmentedControl** — Frosted glass pill toggle:
```tsx
<div className="mx-auto mt-6 flex w-fit rounded-full border border-white/15 bg-white/5 p-1">
  <button className={cn(
    'rounded-full px-6 py-2 text-sm font-medium transition-colors min-h-[44px]',
    mode === 'books' ? 'bg-primary text-white' : 'text-white/70 hover:text-white'
  )}>Books</button>
  <button className={cn(
    'rounded-full px-6 py-2 text-sm font-medium transition-colors min-h-[44px]',
    mode === 'search' ? 'bg-primary text-white' : 'text-white/70 hover:text-white'
  )}>Search</button>
</div>
```

Wait — the SegmentedControl sits in the hero gradient fade zone. Since PageHero has a gradient that fades to #F5F5F5 (light bg), the segmented control would look wrong on the light background. Two options:
1. The content below hero is on a light bg → segmented control needs light-mode styling
2. Make the entire page dark-background

Spec says "Dark background (matching the existing page hero gradient pattern)" for the browser page. The reading view is definitely all-dark. For the browser page, we need the entire page dark, not just the hero. Use a full dark background for the entire BibleBrowser page (no fade to light). Override with a custom background:

```tsx
<Layout>
  <div className="min-h-screen" style={{ background: '#0D0620' }}>
    <PageHero title="Bible">
      <p className="...">The Word of God</p>
    </PageHero>
    <div className="mx-auto max-w-4xl px-4 pb-16">
      <SegmentedControl ... />
      {mode === 'books' ? <BibleBooksMode /> : <BibleSearchMode />}
    </div>
  </div>
</Layout>
```

Actually, looking more carefully at PageHero, it has its own gradient that fades to #F5F5F5. For a fully dark page, we need to NOT use PageHero's default gradient. Instead, use a custom hero section that stays dark throughout. Follow the `ReadingPlanDetail` pattern which uses `DETAIL_HERO_STYLE` for a dark-only hero.

**Revised approach:** Don't use `PageHero` component for the Bible pages. Create a custom hero section within the page that uses the dark-only gradient. This is the same approach used by `ReadingPlanDetail.tsx`.

```tsx
const BIBLE_HERO_STYLE = {
  backgroundImage: 'radial-gradient(100% 80% at 50% 0%, #3B0764 0%, transparent 60%), linear-gradient(#0D0620 0%, #1E0B3E 30%, #4A1D96 55%, #0D0620 100%)',
  backgroundSize: '100% 100%',
}
```

**Accordion behavior:**
- Top level: "Old Testament" and "New Testament" headers — toggle expand/collapse independently
- Within each testament: category sub-groups (e.g., "Pentateuch (5)") — toggle independently
- Within each category: books — only one book expanded at a time within a category
- OT expanded by default on first visit
- URL query param `?book=genesis` auto-expands that book's category and the book itself
- Use `aria-expanded` on accordion headers

**Book entries show:**
- Book name, chapter count (e.g., "50 chapters")
- "Coming soon" badge for books without full text
- For logged-in users with read chapters: mini progress indicator (e.g., "3/50 chapters read" or a thin progress bar)

**Chapter grid (when book is expanded):**
- Grid of numbered buttons, wrapping naturally
- Each button: `min-h-[44px] min-w-[44px]` for touch targets
- Default: `bg-white/5 border border-white/10 rounded-lg text-white/70`
- Hover: `bg-white/10`
- Completed (logged-in): `bg-primary/20 border-primary/30 text-white`
- `aria-label` on each button: "Chapter 3" or "Chapter 3 — read"

**Responsive behavior:**
- Desktop (1440px): `max-w-4xl` centered, chapter grid 10-12 columns (`grid-cols-10 lg:grid-cols-12`)
- Tablet (768px): `max-w-4xl`, chapter grid 8-10 columns (`grid-cols-8 sm:grid-cols-10`)
- Mobile (375px): full-width with `px-4`, chapter grid 5-6 columns (`grid-cols-5 sm:grid-cols-6`)

**Guardrails (DO NOT):**
- Do NOT persist accordion state to localStorage (session-only per spec)
- Do NOT show progress indicators for logged-out users
- Do NOT use PageHero component (need full dark page; build custom dark hero inline)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `Renders 66 books across all categories` | integration | Verify book count |
| `OT has 39 books, NT has 27` | integration | Verify testament grouping |
| `Segmented control defaults to Books mode` | integration | Verify default state |
| `Clicking book expands chapter grid` | integration | Verify accordion |
| `Only one book expanded at a time within category` | integration | Verify accordion behavior |
| `Chapter button navigates to /bible/:slug/:chapter` | integration | Verify navigation |
| `?book= query param auto-expands book` | integration | Verify URL state |
| `Coming soon badge shown for books without full text` | integration | Verify badge |
| `Progress shown for logged-in users with read chapters` | integration | Verify progress |
| `No progress shown for logged-out users` | integration | Verify auth gating |
| `Chapter buttons are 44px minimum` | unit | Verify touch targets |
| `Accordion headers have aria-expanded` | integration | Verify accessibility |

**Expected state after completion:**
- [ ] `/bible` page renders with full dark background
- [ ] All 66 books browseable in accordion
- [ ] Chapter grid shows on book click
- [ ] Navigation to `/bible/:book/:chapter` works
- [ ] Progress indicators work for logged-in users
- [ ] Responsive at all breakpoints
- [ ] All tests pass

---

### Step 6: Bible Browser Page — Search Mode

**Objective:** Add search functionality to the Bible browser page for searching across the 20 books with full text.

**Files to create:**
- `frontend/src/components/bible/BibleSearchMode.tsx` — Search mode UI
- `frontend/src/hooks/useBibleSearch.ts` — Search logic with debounce

**Details:**

**useBibleSearch hook:**
```typescript
export function useBibleSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<BibleSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [allBooksLoaded, setAllBooksLoaded] = useState(false)
  const booksDataRef = useRef<Map<string, BibleChapter[]>>(new Map())

  // Load all 20 books' text on first search activation
  const ensureBooksLoaded = useCallback(async () => { ... })

  // Debounced search (300ms)
  useEffect(() => {
    if (query.length < 2) { setResults([]); return }
    setIsSearching(true)
    const timer = setTimeout(async () => {
      await ensureBooksLoaded()
      const results = searchAllBooks(booksDataRef.current, query)
      setResults(results)
      setIsSearching(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [query])
}
```

Search function: case-insensitive text match. For each match, include the matching verse plus 1 verse before and 1 verse after for context. Escape regex-special characters in the query to prevent errors.

**BibleSearchMode.tsx:**
- Search input with placeholder "Search the Bible..."
- Label for accessibility (visually hidden or visible)
- Note below input: "Searching 20 of 66 books. More books coming soon." in `text-white/40 text-sm`
- Empty state (no query): "Type to search across Scripture" in `text-white/50`
- Minimum 2 chars message: same empty state
- Searching indicator: "Searching..." in `text-white/50`
- No results: "No verses found matching '[query]'. Try different words or check spelling."
- Results list: each result shows:
  - Header: book name, chapter, verse number (e.g., "John 3:16") in `font-semibold text-white`
  - Verse text with search term highlighted (`bg-primary/20 text-white font-semibold rounded px-0.5`)
  - Context verses in `text-white/50`
  - Clickable → navigates to `/bible/:bookSlug/:chapter#verse-:number`

**Responsive behavior:**
- All breakpoints: full-width search input, results as a vertical list
- Mobile: comfortable padding, text wrapping
- Desktop: results in clean list within `max-w-4xl`

**Guardrails (DO NOT):**
- Do NOT search books without full text (46 books are not searchable)
- Do NOT allow regex injection — escape special characters from query
- Do NOT re-load book text on every search — cache in ref after first load
- Do NOT block UI while loading books — show loading indicator

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `Search input renders with placeholder` | integration | Verify input |
| `Search requires minimum 2 characters` | integration | Verify threshold |
| `Search is case-insensitive` | integration | Verify case handling |
| `Search results show book, chapter, verse` | integration | Verify result format |
| `Search term is highlighted in results` | integration | Verify highlighting |
| `Context verses shown before and after match` | integration | Verify context |
| `Clicking result navigates to correct URL with hash` | integration | Verify navigation |
| `No results message shown for unmatched queries` | integration | Verify empty state |
| `Searching indicator shown during debounce` | integration | Verify loading state |
| `Special regex characters in query don't crash` | unit | Verify escaping |

**Expected state after completion:**
- [ ] Search mode functional with debounce
- [ ] Results clickable with navigation to reading view
- [ ] All edge states handled (empty, no results, loading)
- [ ] Tests pass

---

### Step 7: Bible Reading View Page

**Objective:** Create the `/bible/:book/:chapter` reading view with verse display, chapter navigation, progress tracking, and cross-feature CTAs.

**Files to create:**
- `frontend/src/pages/BibleReader.tsx` — Reading view page
- `frontend/src/components/bible/ChapterSelector.tsx` — Chapter dropdown at top
- `frontend/src/components/bible/ChapterNav.tsx` — Previous/Next chapter buttons
- `frontend/src/components/bible/ChapterPlaceholder.tsx` — "Coming soon" placeholder for books without text
- `frontend/src/components/bible/BookNotFound.tsx` — 404 for invalid book slugs

**Details:**

**BibleReader.tsx** — Main reading view:

Full dark background using `DETAIL_HERO_STYLE` pattern (same as `ReadingPlanDetail.tsx`).

```tsx
const READER_BG_STYLE = {
  backgroundImage: 'radial-gradient(100% 80% at 50% 0%, #3B0764 0%, transparent 60%), linear-gradient(#0D0620 0%, #1E0B3E 30%, #4A1D96 55%, #0D0620 100%)',
  backgroundSize: '100% 100%',
}
```

**URL params:** `useParams<{ book: string; chapter: string }>()`. Parse chapter as number. Validate:
- Book slug exists in `BIBLE_BOOKS` → if not, render `BookNotFound`
- Chapter number is 1..book.chapters → if out of range, redirect to chapter 1

**Hero section:**
- Custom dark hero (not PageHero)
- h1: `<Link to={/bible?book=${slug}}>Book Name</Link> Chapter X`
- Book name is a clickable link (styling: `text-white/70 hover:text-white underline`)
- `font-script text-4xl font-bold text-white sm:text-5xl lg:text-6xl`

**Chapter selector dropdown** at top (below hero):
- Compact dropdown: "Chapter X of Y"
- Follow `DaySelector` pattern from reading plans
- Keyboard navigable, ARIA listbox
- Dark frosted glass: `bg-hero-mid border border-white/15`

**Verse display:**
```tsx
<div className="mx-auto max-w-2xl px-4 sm:px-6">
  <div className="py-8 sm:py-12">
    {verses.map((verse) => (
      <span
        key={verse.number}
        id={`verse-${verse.number}`}
        className={cn(
          'transition-colors duration-[2000ms]',
          highlightedVerse === verse.number && 'bg-primary/10 rounded',
        )}
      >
        <sup className="mr-1 align-super font-sans text-xs text-white/30">
          {verse.number}
        </sup>
        <span className="font-serif text-base leading-[1.8] text-white/90 sm:text-lg">
          {verse.text}
        </span>{' '}
      </span>
    ))}
  </div>
</div>
```

**Verse highlighting from URL hash:**
- On mount, check `window.location.hash` for `#verse-N`
- If found, scroll into view with `scrollIntoView({ behavior: 'smooth', block: 'center' })`
- Set `highlightedVerse` state to trigger the `bg-primary/10` background
- After 2 seconds, clear `highlightedVerse` to fade out the highlight
- Respect `prefers-reduced-motion`: if reduced motion preferred, skip the animation but still scroll

**Intersection Observer for chapter completion:**
- Place a sentinel `<div>` at the end of the verse list
- IO with `threshold: 0.5`
- Only fires for authenticated users (`if (!isAuthenticated) return`)
- Only fires if chapter not already read
- Calls `markChapterRead(bookSlug, chapterNumber)`
- Pattern: same as `ReadingPlanDetail.tsx` lines 48-69

**Chapter navigation (bottom):**
- "Previous Chapter" and "Next Chapter" buttons
- Hide "Previous Chapter" on chapter 1
- Hide "Next Chapter" on last chapter
- Use `ChevronLeft` and `ChevronRight` Lucide icons
- Navigate to `/bible/:book/:chapter` with the new chapter number
- Styled as subtle buttons: `border border-white/20 bg-white/10 text-white rounded-lg`

**Cross-feature CTAs (below nav buttons):**
```tsx
<div className="mt-8 flex flex-col items-center gap-3 text-sm">
  <Link to="/daily?tab=pray" className="text-white/50 transition-colors hover:text-white/80">
    Pray about this chapter →
  </Link>
  <Link to="/daily?tab=journal" className="text-white/50 transition-colors hover:text-white/80">
    Journal your thoughts →
  </Link>
</div>
```

**Placeholder for books without full text:**
```tsx
<div className="mx-auto max-w-md text-center py-16 px-4">
  <h2 className="text-xl font-semibold text-white mb-4">Full text coming soon</h2>
  <p className="text-white/60 mb-6">
    We're working on adding the full text of {bookName}. In the meantime, you can read it on BibleGateway.
  </p>
  <a
    href={getBibleGatewayUrl(bookName, chapter)}
    target="_blank"
    rel="noopener noreferrer"
    className="inline-flex min-h-[44px] items-center rounded-lg bg-primary px-8 py-3 font-semibold text-white transition-colors hover:bg-primary-lt"
  >
    Read on BibleGateway
  </a>
</div>
```

**Loading state:** While verse text loads via dynamic import, show a skeleton or "Loading..." state.

**Auth gating:**
- IO for progress tracking: only fires when `isAuthenticated`
- Cross-feature CTAs: not auth-gated (spec says "Full access" for navigate)

**Responsive behavior:**
- Desktop: `max-w-2xl` centered, 18px verse text, chapter nav buttons side by side
- Tablet: same as desktop
- Mobile: full-width with `px-4`, 16px verse text (`text-base`), chapter nav buttons stacked vertically (`flex-col sm:flex-row`)
- Chapter selector: full-width on mobile, auto-width on desktop

**Guardrails (DO NOT):**
- Do NOT render progress UI for logged-out users
- Do NOT use `dangerouslySetInnerHTML` for verse text
- Do NOT fire IO for chapters in books without full text
- Do NOT break Reading Plan patterns — follow DayContent/DaySelector patterns

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `Renders book name and chapter in heading` | integration | Verify hero |
| `Book name links back to /bible?book=slug` | integration | Verify back link |
| `Verses render with superscript numbers` | integration | Verify verse display |
| `Chapter selector shows "Chapter X of Y"` | integration | Verify selector |
| `Previous/Next buttons navigate correctly` | integration | Verify navigation |
| `First chapter hides Previous button` | integration | Verify edge case |
| `Last chapter hides Next button` | integration | Verify edge case |
| `Invalid book slug shows BookNotFound` | integration | Verify 404 |
| `Chapter out of range redirects to chapter 1` | integration | Verify redirect |
| `URL hash #verse-N scrolls to verse` | integration | Verify deep linking |
| `Highlight animation fires on hash navigation` | integration | Verify animation |
| `IO marks chapter read for logged-in users` | integration | Verify progress tracking |
| `IO does not fire for logged-out users` | integration | Verify auth gating |
| `Placeholder shown for books without full text` | integration | Verify fallback |
| `BibleGateway link has correct URL and opens in new tab` | integration | Verify external link |
| `Cross-feature CTAs link to correct Daily Hub tabs` | integration | Verify CTAs |
| `Verse highlight respects prefers-reduced-motion` | integration | Verify a11y |

**Expected state after completion:**
- [ ] Reading view fully functional for all 66 books
- [ ] Verse display, navigation, and progress tracking working
- [ ] Deep linking via URL hash working
- [ ] Placeholder working for 46 books without text
- [ ] All tests pass

---

### Step 8: Routes & App.tsx Integration

**Objective:** Add Bible routes to `App.tsx` and wire up page imports.

**Files to modify:**
- `frontend/src/App.tsx` — Add route definitions and imports

**Details:**

Add imports at top of App.tsx:
```typescript
import { BibleBrowser } from './pages/BibleBrowser'
import { BibleReader } from './pages/BibleReader'
```

Add routes (between reading-plans and /pray redirect):
```tsx
<Route path="/bible" element={<BibleBrowser />} />
<Route path="/bible/:book/:chapter" element={<BibleReader />} />
```

Both routes are public (no auth wrapper needed).

**Guardrails (DO NOT):**
- Do NOT add auth-protected wrappers around these routes (they are public)
- Do NOT lazy-load the page components themselves (only the Bible text data is lazy-loaded)
- Do NOT change any existing routes

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `/bible` route renders BibleBrowser` | integration | Verify routing |
| `/bible/genesis/1` route renders BibleReader | integration | Verify routing |
| `Existing routes still work` | integration | Verify no regressions |

**Expected state after completion:**
- [ ] Both routes accessible
- [ ] No regressions on existing routes
- [ ] Full end-to-end navigation from navbar → browser → reader → back

---

### Step 9: Tests for Data, Hooks, and Utilities

**Objective:** Comprehensive tests for the Bible data model, progress hook, and search functionality.

**Files to create:**
- `frontend/src/data/bible/__tests__/bible-data.test.ts` — Data integrity tests
- `frontend/src/hooks/__tests__/useBibleProgress.test.tsx` — Progress hook tests
- `frontend/src/hooks/__tests__/useBibleSearch.test.tsx` — Search hook tests

**Details:**

**Data integrity tests** — verify all 66 books metadata, category groupings, chapter counts, slug formats, full-text flags.

**Progress hook tests** — all tests from Step 3 specification: auth gating, write behavior, dedup, read behavior, error recovery, persistence.

**Search hook tests** — all tests from Step 6 specification: debounce behavior, case-insensitivity, regex escaping, result format, context verses.

Test utilities:
- Mock `localStorage` with `vi.spyOn(Storage.prototype, 'getItem')` etc.
- Mock `useAuth` with `vi.mock('@/hooks/useAuth')` or `vi.mock('@/contexts/AuthContext')`
- Wrap hooks in `renderHook` with `BrowserRouter` and `AuthProvider`

**Test specifications:** (consolidated from Steps 1-3, 6)

See individual step test specifications above.

**Expected state after completion:**
- [ ] All data integrity tests pass
- [ ] All progress hook tests pass
- [ ] All search tests pass

---

### Step 10: Page-Level Tests

**Objective:** Integration tests for the Bible Browser and Bible Reader pages.

**Files to create:**
- `frontend/src/pages/__tests__/BibleBrowser.test.tsx` — Browser page tests
- `frontend/src/pages/__tests__/BibleReader.test.tsx` — Reader page tests

**Details:**

Provider wrapping for tests:
```tsx
function renderWithProviders(ui: React.ReactElement, options?: { route?: string }) {
  return render(
    <MemoryRouter initialEntries={[options?.route ?? '/bible']}>
      <AuthProvider>
        <ToastProvider>
          <AuthModalProvider>
            {ui}
          </AuthModalProvider>
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>
  )
}
```

**BibleBrowser tests** — all tests from Steps 5-6 specifications: 66 books rendering, testament grouping, segmented control, accordion behavior, search functionality, progress indicators, accessibility.

**BibleReader tests** — all tests from Step 7 specifications: verse display, navigation, progress tracking, deep linking, placeholder, CTAs, accessibility.

Mock the dynamic imports for Bible text data in tests to avoid loading actual WEB text files.

**Expected state after completion:**
- [ ] All browser page tests pass
- [ ] All reader page tests pass
- [ ] No regressions in existing test suite
- [ ] `pnpm test` passes cleanly

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Bible types & constants (metadata for all 66 books) |
| 2 | 1 | Bible text data files (20 books with WEB verse text) |
| 3 | 1 | Bible progress hook (localStorage tracking) |
| 4 | — | Navbar integration (add "Bible" link) |
| 5 | 1, 3 | Bible browser page — Books mode (accordion + chapter grid) |
| 6 | 1, 2 | Bible browser page — Search mode |
| 7 | 1, 2, 3 | Bible reading view page |
| 8 | 5, 6, 7 | App.tsx routes |
| 9 | 1, 2, 3, 6 | Tests for data, hooks, and utilities |
| 10 | 5, 6, 7, 8 | Page-level integration tests |

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Bible Types & Constants | [COMPLETE] | 2026-03-21 | Created `types/bible.ts`, `constants/bible.ts`, `data/bible/index.ts`. 22 unit tests pass. Placeholder book files created for 20 books (empty arrays) to satisfy dynamic import validation. |
| 2 | Bible Text Data Files (20 Books) | [NOT STARTED] | | |
| 3 | Bible Progress Hook | [COMPLETE] | 2026-03-21 | Created `hooks/useBibleProgress.ts` following `useReadingPlanProgress` pattern. 14 tests pass (auth gating, idempotency, error recovery, persistence). |
| 4 | Navbar Integration | [COMPLETE] | 2026-03-21 | Added `Book` icon import, inserted `{ label: 'Bible', to: '/bible', icon: Book }` as 2nd item in NAV_LINKS. Desktop + mobile drawer auto-renders. All existing Navbar tests pass. |
| 5 | Bible Browser Page — Books Mode | [COMPLETE] | 2026-03-21 | Created `BibleBrowser.tsx`, `BibleBooksMode.tsx`, `TestamentAccordion.tsx`, `CategoryGroup.tsx`, `BookEntry.tsx`, `ChapterGrid.tsx`, `SegmentedControl.tsx`. Full dark page with custom hero. 17 integration tests pass. Search mode placeholder in place. |
| 6 | Bible Browser Page — Search Mode | [COMPLETE] | 2026-03-21 | Created `BibleSearchMode.tsx` and `useBibleSearch.ts`. Debounced search, regex escaping, context verses, 100-result cap. 7 search hook tests pass. BibleBrowser integrated with real search mode. |
| 7 | Bible Reading View Page | [COMPLETE] | 2026-03-21 | Created `BibleReader.tsx`, `ChapterSelector.tsx`, `ChapterNav.tsx`, `ChapterPlaceholder.tsx`, `BookNotFound.tsx`. Full dark page, verse display, IO progress tracking, hash deep-linking, reduced-motion support. 13 integration tests pass. |
| 8 | Routes & App.tsx Integration | [COMPLETE] | 2026-03-21 | Added `BibleBrowser` and `BibleReader` imports and routes to App.tsx. Both public routes, no auth wrapper. No regressions (same 2 pre-existing TS errors). |
| 9 | Tests for Data, Hooks, and Utilities | [COMPLETE] | 2026-03-21 | Tests already created inline during Steps 1, 3, 6. Total: 43 tests across 3 files (22 data + 14 progress + 7 search). All pass. |
| 10 | Page-Level Tests | [COMPLETE] | 2026-03-21 | Tests already created inline during Steps 5 and 7. Total: 30 page tests (17 browser + 13 reader). Full suite: 3112/3114 pass (2 pre-existing MyPrayers timeouts, no regressions). |
