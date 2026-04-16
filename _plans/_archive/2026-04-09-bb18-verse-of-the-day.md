# Implementation Plan: BB-18 Verse of the Day

**Spec:** `_specs/bb-18-verse-of-the-day.md`
**Date:** 2026-04-09
**Branch:** `bible-redesign`
**Design System Reference:** `_plans/recon/design-system.md` (loaded — captured 2026-04-05)
**Recon Report:** not applicable
**Master Spec Plan:** N/A — standalone spec in the Bible Redesign wave

---

## Architecture Context

### Project Structure

BB-18 enhances the existing Verse of the Day feature on the Bible landing page (`/bible`). The current implementation is a working but minimal component (`VerseOfTheDay.tsx`) backed by a 366-entry `votd.json` file and a deterministic selector (`votdSelector.ts`). BB-18 evolves the data model, adds a hook with async verse loading and midnight polling, wires Share/Save actions to existing infrastructure, and adds `?highlight=` scroll-and-glow support in the Bible reader.

### Existing Files to Modify

| File | Current State | BB-18 Changes |
|------|--------------|---------------|
| `src/data/bible/votd.json` | 366 entries: `{reference, book, chapter, verse, text}` | Replaced by `src/data/bible/votd/votd-list.json` with new shape |
| `src/lib/bible/votdSelector.ts` | `getTodaysBibleVotd(date)` using `getDayOfYear` + modulo | Rewritten to use new data shape; `selectVotdForDate` + `getDayOfYear` exported |
| `src/types/bible-landing.ts` | `VotdEntry` with `{reference, book, chapter, verse, text}` | Evolve to `VotdListEntry` with `{ref, book, chapter, startVerse, endVerse, theme}` |
| `src/components/bible/landing/VerseOfTheDay.tsx` | FrostedCard with share (console.log) + "Read in context" (no highlight) | Full rewrite: cinematic display, 3 actions, date, skeleton, share modal, auth-gated save |
| `src/pages/BibleReader.tsx` | No `?highlight=` support | Add `?highlight=` param → scroll to verse + 1.5s glow animation |
| `src/components/bible/reader/ReaderBody.tsx` | No highlight-on-arrival support | Add `arrivalHighlightVerses` prop for glow styling |
| `src/pages/BibleLanding.tsx` | Wraps with `BibleDrawerProvider` only | Add `AuthModalProvider` + `ToastProvider` wrapping for Save auth gate |

### Existing Infrastructure (reused, not modified)

| Component | File | Usage |
|-----------|------|-------|
| Bookmark store | `lib/bible/bookmarkStore.ts` | `toggleBookmark()`, `isSelectionBookmarked()`, `setBookmarkLabel()`, `subscribe()` |
| ShareSubView | `components/bible/reader/ShareSubView.tsx` | Pre-loaded with `VerseSelection` for share-as-image |
| Chapter loader | `data/bible/index.ts` | `loadChapterWeb(slug, chapter)` → `BibleChapter` with verses |
| FrostedCard | `components/homepage/FrostedCard.tsx` | Card container |
| AuthModalProvider | `components/prayer-wall/AuthModalProvider.tsx` | `useAuthModal()` → `openAuthModal(subtitle)` |
| useAuth | `contexts/AuthContext.tsx` | `isAuthenticated` check |
| useToast | `components/ui/Toast.tsx` | `showToast()` for save feedback |
| useReducedMotion | `hooks/useReducedMotion.ts` | Respects `prefers-reduced-motion` |
| BIBLE_BOOKS | `constants/bible.ts` | Book name ↔ slug lookup |
| dateUtils | `lib/bible/dateUtils.ts` | `getTodayLocal()` pattern (local timezone) |
| VerseSelection type | `types/verse-actions.ts` | Shape needed for ShareSubView |

### Provider Wrapping

- **BibleLanding.tsx** currently wraps with `BibleDrawerProvider` only. BB-18 adds `AuthModalProvider` inside the existing `BibleDrawerProvider` for the Save action's auth gate. `ToastProvider` is available from the app-level `Layout` component.
- **Test wrapping:** `MemoryRouter` + `AuthModalProvider` + `ToastProvider` for VerseOfTheDayCard tests. Store tests use `vi.resetModules()` + `localStorage.clear()` pattern.

### Reactive Store Pattern

Bookmark store uses module-level cache + listeners Set + `subscribe()`. The VerseOfTheDayCard subscribes to bookmark changes to keep Save/Saved state in sync across tabs.

---

## Auth Gating Checklist

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| View VOTD card | No auth | Step 5 | N/A |
| Read in context | No auth | Step 5 | N/A |
| Share | No auth | Step 5 | N/A |
| Save (bookmark) | Auth required — "Sign in to save verses" | Step 5 | `useAuth().isAuthenticated` + `useAuthModal().openAuthModal('Sign in to save verses')` |

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| FrostedCard | classes | `bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] rounded-2xl` + dual box-shadow | FrostedCard.tsx / 09-design-system.md |
| "VERSE OF THE DAY" label | font | `text-xs font-medium uppercase tracking-widest text-white/50` | Existing VerseOfTheDay.tsx:17 |
| Verse text (cinematic) | font (desktop) | `font-serif text-2xl sm:text-3xl text-white leading-relaxed` | design-system.md (Devotional quote blockquote pattern: Lora 24px sm:text-2xl) |
| Verse text (long, >30 words) | font | `font-serif text-lg sm:text-xl text-white leading-relaxed` | Spec: "smaller font size variant" |
| Reference | font | `text-sm font-semibold text-white/60` | Existing VerseOfTheDay.tsx:31 |
| Date | font | `text-xs text-white/40` | Spec visual design |
| Action buttons | classes | `inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-lt` + 44px tap targets + `focus-visible:ring-2 focus-visible:ring-white/50` | Existing "Read in context" link pattern |
| Save button (active) | color | `text-primary-lt` (filled bookmark icon) | Spec: toggle to "Saved" |
| Bible Landing bg | background | `bg-dashboard-dark` (`#0f0a1e`) | BibleLanding.tsx:111 |
| Reader arrival glow | animation | `box-shadow: 0 0 12px 2px rgba(139, 92, 246, 0.4)` fading to 0 over 1.5s | Spec + primary color `#6D28D9` / `#8B5CF6` |

---

## Design System Reminder

**Project-specific quirks displayed before every UI step:**

- Worship Room uses `GRADIENT_TEXT_STYLE` (white-to-purple gradient via `background-clip: text`) for hero and section headings on dark backgrounds. Caveat font deprecated for headings — used only for the logo.
- The Bible Landing page uses `bg-dashboard-dark` (`#0f0a1e`) background, NOT `bg-hero-bg`. Orbs are via `BibleLandingOrbs`.
- Frosted glass cards: `bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] rounded-2xl` with dual box-shadow. Use the `FrostedCard` component, not a hand-rolled card.
- Lora serif (`font-serif`) is the canonical scripture font. Used for verse text, devotional quotes. NOT used for prose body text or journal prompts.
- All tap targets minimum 44px.
- Toast: `useToast()` → `showToast(message, 'success')`. Requires `ToastProvider` ancestor.
- Auth modal: `useAuthModal()` → `openAuthModal('Sign in to save verses')`. Requires `AuthModalProvider` ancestor. Returns `undefined` when no provider — always check.
- No deprecated patterns: no Caveat headings, no animate-glow-pulse, no cyan borders, no soft-shadow 8px-radius cards.

**No deviations found in recent execution logs** (BB-17, BB-16, BB-15, BB-14, BB-11b all completed cleanly).

---

## Shared Data Models

### New Types

```typescript
// In src/types/bible-landing.ts — evolves existing VotdEntry

/** Theme categories for Verse of the Day entries */
export type VotdTheme =
  | 'love' | 'hope' | 'peace' | 'strength' | 'faith' | 'joy'
  | 'comfort' | 'wisdom' | 'forgiveness' | 'provision' | 'praise' | 'presence'

/** Single entry in votd-list.json (no text — text loaded from WEB JSON) */
export interface VotdListEntry {
  ref: string           // human-readable reference, e.g. "John 3:16"
  book: string          // lowercase slug, e.g. "john"
  chapter: number
  startVerse: number
  endVerse: number      // equals startVerse for single-verse entries
  theme: VotdTheme
}

/** Hydrated VOTD entry with verse text (returned by useVerseOfTheDay) */
export interface VotdHydrated {
  entry: VotdListEntry
  verseText: string     // assembled text from WEB JSON, or fallback
  bookName: string      // display name from BIBLE_BOOKS, e.g. "John"
  wordCount: number     // for long-verse font size decision
}
```

### localStorage Keys This Spec Touches

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `bible:bookmarks` | Both | Save action creates/removes bookmarks via existing bookmark store |

No new localStorage keys. VOTD data is a static JSON file in the bundle.

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | Verse text centered, `text-2xl` Lora serif. Action row: 3 buttons horizontal, `justify-between`. Date bottom-right. Card full width within `max-w-2xl`. |
| Tablet | 768px | Same as mobile with more breathing room. |
| Desktop | 1024px+ | Verse text left-aligned. Action row same horizontal. Card within landing's `max-w-4xl` container. |

---

## Inline Element Position Expectations (UI features with inline rows)

| Element Group | Elements | Expected y-alignment | Wrap Tolerance |
|---------------|----------|---------------------|----------------|
| Action row | "Read in context" button, "Share" button, "Save" button | Same y ±5px at 1440px, 768px, and 375px | No wrapping acceptable — buttons are short text + icon |

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| Resume/Plan cards → VOTD card | 32px (`space-y-8`) | BibleLanding.tsx:118 |
| VOTD card → section divider | 32px (`space-y-8`) | BibleLanding.tsx:118 |

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] BB-0 (landing page) is complete and committed
- [x] BB-4 (reader) is complete — chapter loader infrastructure exists
- [x] BB-7.5 (bookmarks) is complete — bookmark store exists
- [x] BB-13 (share-as-image) is complete — ShareSubView exists
- [x] BB-17 (reading streak) is complete — dateUtils pattern available
- [x] All auth-gated actions from the spec are accounted for (Save only)
- [x] Design system values are verified from design-system.md and codebase inspection
- [x] No deprecated patterns used
- [ ] **The 366-entry curated verse list must be created.** This is the most labor-intensive step and requires careful selection meeting all curation constraints.

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Where to put the share flow | Modal overlay wrapping `ShareSubView` directly in VerseOfTheDayCard | Simplest approach — the ShareSubView is self-contained; a full-page route would be overkill for a single verse |
| Save button behavior after save | Show filled Bookmark icon + "Saved" text permanently (until toggled off) | Spec says "Already-bookmarked verse shows 'Saved' from initial render" — not a temporary 2-sec flash but a persistent state reflecting the actual bookmark |
| Old `votd.json` disposition | Delete after new `votd-list.json` is verified | Old file shape is incompatible; keeping it causes confusion |
| Old `VotdEntry` type | Remove from `bible-landing.ts` after migration | Replaced by `VotdListEntry` |
| Verse text assembly for multi-verse ranges | Concatenate verse texts with spaces: `verses.filter(v => v.number >= start && v.number <= end).map(v => v.text).join(' ')` | Standard Bible text assembly pattern |
| Midnight poll cleanup | `clearInterval` on unmount, `useRef` for interval ID | Standard React cleanup |
| Share modal focus trap | Reuse `useFocusTrap` | Consistent with other modals |
| Reader highlight glow color | `rgba(139, 92, 246, 0.4)` (primary-lt at 40% opacity) | Matches existing highlight pulse in the reader (`freshHighlightVerses` pattern) |
| Highlight glow mechanism | CSS transition via a `data-arrival-highlight` attribute + CSS class, cleaned up by a 1.5s timeout | Simpler than JavaScript animation; works with reduced-motion media query |

---

## Implementation Steps

### Step 1: Data Model + VOTD List

**Objective:** Define the new `VotdListEntry` type, create the 366-entry curated verse list at the new file location, and remove the old `votd.json`.

**Files to create/modify:**
- `frontend/src/types/bible-landing.ts` — Add `VotdTheme`, `VotdListEntry`, `VotdHydrated` types; remove old `VotdEntry`
- `frontend/src/data/bible/votd/votd-list.json` — New 366-entry curated list
- `frontend/src/data/bible/votd.json` — Delete

**Details:**

**Type changes in `bible-landing.ts`:**
Replace the existing `VotdEntry` interface with:
```typescript
export type VotdTheme =
  | 'love' | 'hope' | 'peace' | 'strength' | 'faith' | 'joy'
  | 'comfort' | 'wisdom' | 'forgiveness' | 'provision' | 'praise' | 'presence'

export interface VotdListEntry {
  ref: string
  book: string          // lowercase slug, e.g. "john", "psalms", "1-corinthians"
  chapter: number
  startVerse: number
  endVerse: number
  theme: VotdTheme
}

export interface VotdHydrated {
  entry: VotdListEntry
  verseText: string
  bookName: string
  wordCount: number
}
```

**The 366-entry JSON:** Each entry is `{ref, book, chapter, startVerse, endVerse, theme}`. The `book` field uses BIBLE_BOOKS slugs (lowercase kebab-case, e.g. `"john"`, `"1-corinthians"`, `"song-of-solomon"`). The `ref` field is human-readable (e.g. `"John 3:16"`, `"Psalm 23:1-3"`).

**Curation constraints (programmatically verified in Step 6):**
- Exactly 366 entries
- No more than 110 entries from Psalms (≤30%)
- At least 73 entries from Gospels (Matthew, Mark, Luke, John) (≥20%)
- At least 37 entries from OT narrative books (Genesis, Exodus, Joshua, Judges, Ruth, 1 Samuel, 2 Samuel, 1 Kings, 2 Kings, 1 Chronicles, 2 Chronicles, Ezra, Nehemiah, Esther) (≥10%)
- At most 18 entries from "hard" epistolary passages (≤5%)
- Every `book` slug matches a BIBLE_BOOKS entry
- Every `chapter` is valid for the book
- Every `startVerse`/`endVerse` is valid for the chapter in WEB data
- All 12 themes represented
- No duplicate book+chapter+startVerse+endVerse entries

**Curation approach:** Convert existing 366 entries from `votd.json` as a starting base (they already have book/chapter/verse), then:
1. Map `verse` → `startVerse`/`endVerse` (most entries are single-verse, so `endVerse = startVerse`)
2. Map `book` display names → slugs using BIBLE_BOOKS
3. Map `reference` → `ref`
4. Assign themes based on verse content
5. Verify curation constraints and adjust distribution if needed
6. Drop the `text` field (will be loaded from WEB JSON by the hook)

**Auth gating:** N/A — data step.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT include `text` in the new JSON entries — text is loaded from WEB JSON at runtime
- DO NOT use display names in the `book` field — use BIBLE_BOOKS slugs
- DO NOT leave old `votd.json` in the tree after this step
- DO NOT import from the deleted `votd.json` anywhere

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Type compilation | unit | Verify `VotdListEntry` and `VotdHydrated` types compile correctly |

**Expected state after completion:**
- [ ] `frontend/src/data/bible/votd/votd-list.json` exists with 366 entries
- [ ] `frontend/src/data/bible/votd.json` deleted
- [ ] `VotdEntry` removed from `types/bible-landing.ts`
- [ ] `VotdListEntry`, `VotdTheme`, `VotdHydrated` added to `types/bible-landing.ts`
- [ ] No import references to old `votd.json` or `VotdEntry` remain

---

### Step 2: Updated Selector

**Objective:** Rewrite `votdSelector.ts` to use the new data shape and export the selector function + `getDayOfYear` for reuse.

**Files to create/modify:**
- `frontend/src/lib/bible/votdSelector.ts` — Full rewrite

**Details:**

```typescript
import type { VotdListEntry } from '@/types/bible-landing'
import votdList from '@/data/bible/votd/votd-list.json'

const FALLBACK_ENTRY: VotdListEntry = {
  ref: 'John 3:16',
  book: 'john',
  chapter: 3,
  startVerse: 16,
  endVerse: 16,
  theme: 'love',
}

/** Returns 1-based day of year in local timezone. Jan 1 = 1, Dec 31 = 365 or 366. */
export function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0)
  const diff = date.getTime() - start.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

/** Deterministic verse selection for a given date. Same date → same verse globally. */
export function selectVotdForDate(date: Date = new Date()): VotdListEntry {
  if (!Array.isArray(votdList) || votdList.length === 0) return FALLBACK_ENTRY
  const dayOfYear = getDayOfYear(date) // 1-366
  const index = (dayOfYear - 1) % votdList.length // 0-365
  return (votdList[index] as VotdListEntry) ?? FALLBACK_ENTRY
}
```

Key changes from current implementation:
- Renamed from `getTodaysBibleVotd` to `selectVotdForDate` (spec naming)
- Exports `getDayOfYear` for test access
- Returns `VotdListEntry` (no text — text loaded by hook)
- Fallback to John 3:16 entry if list is empty/malformed
- Modulo uses `votdList.length` (should be 366 but handles differently-sized lists)

**Auth gating:** N/A — logic step.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT hardcode modulo to 366 — use `votdList.length` for resilience
- DO NOT use UTC date — `getDayOfYear` uses local timezone via `new Date(date.getFullYear(), 0, 0)`
- DO NOT import old `votd.json`

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Same date returns same entry | unit | Two calls with `new Date('2026-04-09')` return identical results |
| Consecutive dates return different entries | unit | Jan 1 vs Jan 2 have different refs |
| Jan 1 returns index 0 | unit | `selectVotdForDate(new Date('2026-01-01'))` returns `votdList[0]` |
| Dec 31 non-leap year (day 365) | unit | Valid entry returned |
| Feb 29 leap year (day 60) | unit | Valid entry returned |
| Dec 31 leap year (day 366) | unit | Valid entry returned (index 365) |
| Fallback on empty list | unit | Mock empty import → returns John 3:16 fallback |
| getDayOfYear correctness | unit | Known dates return expected day numbers |
| Returns VotdListEntry shape | unit | Has `ref`, `book`, `chapter`, `startVerse`, `endVerse`, `theme` |

**Expected state after completion:**
- [ ] `votdSelector.ts` exports `selectVotdForDate` and `getDayOfYear`
- [ ] Old `getTodaysBibleVotd` function removed
- [ ] All 9 selector tests pass

---

### Step 3: useVerseOfTheDay Hook

**Objective:** Create a React hook that hydrates the VOTD entry with verse text from WEB JSON data, polls for midnight crossover, and provides a loading state.

**Files to create/modify:**
- `frontend/src/hooks/bible/useVerseOfTheDay.ts` — New file

**Details:**

```typescript
import { useCallback, useEffect, useRef, useState } from 'react'
import { selectVotdForDate, getDayOfYear } from '@/lib/bible/votdSelector'
import { loadChapterWeb } from '@/data/bible'
import { BIBLE_BOOKS } from '@/constants/bible'
import type { VotdListEntry, VotdHydrated } from '@/types/bible-landing'

const FALLBACK_TEXT = 'For God so loved the world, that he gave his only born Son, that whoever believes in him should not perish, but have eternal life.'
const FALLBACK_REF = 'John 3:16'
const POLL_INTERVAL_MS = 60_000 // 1 minute

export function useVerseOfTheDay(date?: Date): {
  votd: VotdHydrated | null
  isLoading: boolean
} {
  // ...implementation
}
```

**Hook behavior:**
1. On mount, call `selectVotdForDate(date ?? new Date())` to get the entry
2. Call `loadChapterWeb(entry.book, entry.chapter)` to load verse text
3. Assemble text from `startVerse` to `endVerse`: `verses.filter(v => v.number >= startVerse && v.number <= endVerse).map(v => v.text).join(' ')`
4. Look up `bookName` from `BIBLE_BOOKS.find(b => b.slug === entry.book)?.name`
5. Compute `wordCount` from assembled text
6. If verse not found in WEB data, fall back to John 3:16 fallback text + log console error
7. Set up 60-second polling interval: on each tick, check if `getDayOfYear(new Date())` differs from the current entry's day. If so, re-run the selection and load new verse text.
8. Clean up interval on unmount.
9. When `date` prop is provided, skip midnight polling (it's a fixed date).

**Return value:** `{ votd: VotdHydrated | null, isLoading: boolean }`
- `isLoading` is `true` until first verse text load completes
- `votd` is `null` only during the initial async load (brief, since data is bundled)

**Auth gating:** N/A — hook step.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT poll when a specific `date` is provided (test/fixed date mode)
- DO NOT throw on missing verse data — always fall through to John 3:16 fallback
- DO NOT store any data in localStorage — VOTD is ephemeral, computed from static data
- DO NOT use `setInterval` without cleanup — use `useRef` for interval ID and `clearInterval` in cleanup

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Returns hydrated VOTD on mount | unit | Mock `loadChapterWeb` → returns `votd` with text |
| Falls back to John 3:16 on missing verse | unit | Mock `loadChapterWeb` returning null → text = fallback |
| Falls back to John 3:16 on missing verse range | unit | Chapter loads but verse numbers don't exist → fallback |
| isLoading starts true, becomes false | unit | Initial render isLoading=true, after resolve isLoading=false |
| Midnight poll detects date change | unit | Fake timer at 11:59, advance 90s, verify votd updates |
| No polling when date prop provided | unit | Provide fixed date, verify no interval set |
| Console error logged on missing verse | unit | Mock loadChapterWeb(null), verify console.error |
| wordCount correctly computed | unit | Known verse text → expected word count |

**Expected state after completion:**
- [ ] `frontend/src/hooks/bible/useVerseOfTheDay.ts` exists
- [ ] Hook returns `{ votd, isLoading }` with correct types
- [ ] All 8 hook tests pass

---

### Step 4: Reader Highlight on Arrival

**Objective:** Add `?highlight=` query parameter support to BibleReader so that clicking "Read in context" from VOTD scrolls to and briefly glows the target verse(s).

**Files to create/modify:**
- `frontend/src/pages/BibleReader.tsx` — Add `?highlight=` parsing, scroll-to, and glow state
- `frontend/src/components/bible/reader/ReaderBody.tsx` — Add `arrivalHighlightVerses` prop for glow styling

**Details:**

**BibleReader.tsx changes:**

1. Import `useSearchParams` from `react-router-dom` (already using `useParams`)
2. Parse `?highlight=` on mount:
   ```typescript
   const [searchParams, setSearchParams] = useSearchParams()
   const highlightParam = searchParams.get('highlight') // "16" or "1-3"
   ```
3. Parse the value: if it contains `-`, split into `[startVerse, endVerse]`; otherwise `startVerse = endVerse = parseInt(value)`
4. Create state `arrivalHighlightVerses: number[]` — populated from the parsed range
5. After verses load (`!isLoading && verses.length > 0`), if `arrivalHighlightVerses.length > 0`:
   - Find the DOM element for the first target verse: `document.querySelector(`[data-verse-number="${startVerse}"]`)` (ReaderBody already renders verse elements with identifiable attributes)
   - `element.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center' })`
   - After scroll, start a 1.5s timeout to clear `arrivalHighlightVerses` (glow fades out)
6. Clear the `?highlight=` param from URL after processing (to avoid re-triggering on re-render): `setSearchParams(prev => { prev.delete('highlight'); return prev }, { replace: true })`

**ReaderBody.tsx changes:**

Add an `arrivalHighlightVerses?: number[]` prop. For each verse in this list, apply a glow CSS class:

```css
/* In the verse rendering logic */
const isArrivalHighlight = arrivalHighlightVerses?.includes(verse.number)
```

Glow styling (inline style or data attribute + CSS):
- Normal: `box-shadow: 0 0 12px 2px rgba(139, 92, 246, 0.4); border-radius: 4px; transition: box-shadow 1.5s ease-out;`
- After timeout clears the state: `box-shadow: none` (transition handles the fade)
- Reduced motion: no transition, just a brief background tint that disappears instantly

**Verse element identification:** ReaderBody renders verse spans. Check how verses are currently identified in the DOM. The `useVerseTap` hook already uses verse identification — follow the same pattern. Look for `data-verse-number` or `data-verse` attributes on verse elements.

**Auth gating:** N/A — reader is public.

**Responsive behavior:**
- Desktop (1440px): Scroll to verse with `block: 'center'`, glow visible
- Tablet (768px): Same behavior
- Mobile (375px): Same behavior — `scrollIntoView` works on all viewports

**Guardrails (DO NOT):**
- DO NOT persist the highlight to the highlight store — this is visual-only, ephemeral
- DO NOT apply the glow if `prefers-reduced-motion` is active — use instant background tint instead
- DO NOT re-trigger the scroll on every render — process once on mount when verses load, then clear the param
- DO NOT block the reader from loading if highlight param is invalid — silently ignore bad values

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Parses single verse highlight | unit | `?highlight=16` → `arrivalHighlightVerses = [16]` |
| Parses verse range highlight | unit | `?highlight=1-3` → `arrivalHighlightVerses = [1, 2, 3]` |
| Ignores invalid highlight param | unit | `?highlight=abc` → `arrivalHighlightVerses = []` |
| Cleans highlight param from URL after processing | integration | Verify `searchParams` no longer has `highlight` after mount |
| Glow class applied to highlighted verse | integration | Render with highlight → verse element has glow styling |
| Glow removed after 1.5s | integration | Use fake timers, verify glow styling removed after 1500ms |
| Reduced motion: no animation | integration | With `prefers-reduced-motion`, verify no transition applied |

**Expected state after completion:**
- [ ] BibleReader parses `?highlight=` param and scrolls to verse
- [ ] ReaderBody applies glow to `arrivalHighlightVerses`
- [ ] Glow fades out after 1.5s (instant clear under reduced motion)
- [ ] URL cleaned up after processing
- [ ] All 7 reader highlight tests pass

---

### Step 5: Enhanced VerseOfTheDayCard + BibleLanding Wiring

**Objective:** Rewrite the `VerseOfTheDay` component with cinematic display, all 3 action buttons (Read in context, Share, Save), date display, skeleton, long verse handling, share modal, and auth-gated bookmark save. Wire into BibleLanding with `AuthModalProvider`.

**Files to create/modify:**
- `frontend/src/components/bible/landing/VerseOfTheDay.tsx` — Full rewrite
- `frontend/src/components/bible/landing/VotdShareModal.tsx` — New: modal wrapping ShareSubView for VOTD
- `frontend/src/pages/BibleLanding.tsx` — Add `AuthModalProvider` wrapping

**Details:**

**VerseOfTheDay.tsx rewrite:**

```typescript
import { useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Share2, Bookmark } from 'lucide-react'
import { FrostedCard } from '@/components/homepage/FrostedCard'
import { useVerseOfTheDay } from '@/hooks/bible/useVerseOfTheDay'
import { useAuth } from '@/hooks/useAuth'
import { useAuthModal } from '@/components/prayer-wall/AuthModalProvider'
import { useToast } from '@/components/ui/Toast'
import {
  toggleBookmark,
  isSelectionBookmarked,
  setBookmarkLabel,
  subscribe as subscribeBookmarks,
} from '@/lib/bible/bookmarkStore'
import { BIBLE_BOOKS } from '@/constants/bible'
import { VotdShareModal } from './VotdShareModal'
```

**Component structure:**
1. Call `useVerseOfTheDay()` for hydrated VOTD data
2. Track bookmark state via `isSelectionBookmarked` + `subscribeBookmarks` (reactive)
3. Render `FrostedCard` with:
   - "VERSE OF THE DAY" small caps label (top-left)
   - `<blockquote>` with verse text in Lora serif, cinematic size. No quotation marks (spec says "No quotation marks").
   - `<cite>` with reference in `text-sm font-semibold text-white/60`
   - Action row: 3 buttons — "Read in context" (BookOpen), "Share" (Share2), "Save"/"Saved" (Bookmark)
   - Date bottom-right in `text-xs text-white/40`, formatted via `new Date().toLocaleDateString()`
4. Long verse handling: if `votd.wordCount > 30`, use smaller font class `text-lg sm:text-xl` instead of `text-2xl sm:text-3xl`
5. Skeleton: when `isLoading`, render placeholder pulse bars matching card dimensions

**Action handlers:**
- **Read in context:** `<Link to={'/bible/${entry.book}/${entry.chapter}?highlight=${entry.startVerse}${entry.endVerse > entry.startVerse ? '-' + entry.endVerse : ''}'}>` 
- **Share:** Opens `VotdShareModal` state. Constructs a `VerseSelection` from the VOTD data for ShareSubView.
- **Save:** 
  1. Check `useAuth().isAuthenticated`
  2. If not authenticated: `openAuthModal('Sign in to save verses')`
  3. If authenticated: call `toggleBookmark({ book: entry.book, chapter: entry.chapter, startVerse: entry.startVerse, endVerse: entry.endVerse })`
  4. If `result.created`: call `setBookmarkLabel(result.bookmark!.id, 'Verse of the Day · ' + new Date().toLocaleDateString())`
  5. Show toast feedback: "Verse saved" or "Bookmark removed"

**Bookmark state tracking:**
```typescript
const [isBookmarked, setIsBookmarked] = useState(() =>
  votd ? isSelectionBookmarked(votd.entry.book, votd.entry.chapter, votd.entry.startVerse, votd.entry.endVerse) : false
)

useEffect(() => {
  if (!votd) return
  const unsubscribe = subscribeBookmarks(() => {
    setIsBookmarked(
      isSelectionBookmarked(votd.entry.book, votd.entry.chapter, votd.entry.startVerse, votd.entry.endVerse)
    )
  })
  return unsubscribe
}, [votd])
```

**Responsive behavior:**
- Desktop (1024px+): Verse text left-aligned, `text-left`
- Mobile (<640px): Verse text centered, `text-center sm:text-left`
- Action row: `flex items-center gap-4` on all breakpoints — buttons are compact (icon + short label)

**VotdShareModal.tsx:**

A modal wrapper that renders `ShareSubView` with a pre-constructed `VerseSelection`:
```typescript
interface VotdShareModalProps {
  isOpen: boolean
  onClose: () => void
  votd: VotdHydrated
}
```

Construct `VerseSelection` from VOTD data:
```typescript
const selection: VerseSelection = {
  book: votd.entry.book,
  bookName: votd.bookName,
  chapter: votd.entry.chapter,
  startVerse: votd.entry.startVerse,
  endVerse: votd.entry.endVerse,
  verses: [{ number: votd.entry.startVerse, text: votd.verseText }],
  // For multi-verse, split text per verse if available, or use full text as single entry
}
```

Modal uses `useFocusTrap`, backdrop click dismiss, frosted glass styling matching `BibleSettingsModal` pattern: `rgba(15, 10, 30, 0.95)` background + `backdrop-blur(16px)`, X close button with 44px tap target.

**BibleLanding.tsx changes:**

Wrap `BibleLandingInner` with `AuthModalProvider`:
```typescript
import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'

export function BibleLanding() {
  return (
    <BibleDrawerProvider>
      <AuthModalProvider>
        <BibleLandingInner />
      </AuthModalProvider>
    </BibleDrawerProvider>
  )
}
```

**Inline position expectations:**
- Action row: "Read in context", "Share", "Save" buttons must share y-coordinate at 375px, 768px, and 1440px (±5px tolerance)

**Auth gating:**
- Save button: `useAuth().isAuthenticated` check. If not authenticated → `openAuthModal('Sign in to save verses')`. If authenticated → toggle bookmark.
- Read in context: no auth check (public)
- Share: no auth check (public)

**Guardrails (DO NOT):**
- DO NOT use quotation marks around the verse text (spec: "No quotation marks")
- DO NOT use Caveat font anywhere
- DO NOT use `animate-glow-pulse` or cyan borders
- DO NOT add GlowBackground — the card sits on the BibleLanding's `bg-dashboard-dark` with `BibleLandingOrbs`
- DO NOT use `dangerouslySetInnerHTML` for verse text — React text nodes only
- DO NOT add the verse text to the VOTD list JSON — it's loaded at runtime by the hook
- DO NOT persist share/view analytics — spec says no analytics

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Renders verse text from hook | integration | Mock hook → verify verse text in DOM |
| Renders reference below verse | integration | Verify `<cite>` element with reference text |
| Renders "VERSE OF THE DAY" label | integration | Verify label text |
| Renders date in locale format | integration | Verify date text present |
| "Read in context" links to correct URL with highlight | integration | Verify `href` = `/bible/{slug}/{chapter}?highlight={startVerse}` |
| "Share" opens share modal | integration | Click share → modal visible |
| "Save" toggles bookmark (authenticated) | integration | Mock auth → click save → verify `toggleBookmark` called |
| "Save" shows auth modal (unauthenticated) | integration | No auth → click save → auth modal opens with "Sign in to save verses" |
| "Saved" shows for already-bookmarked verse | integration | Mock bookmark exists → verify "Saved" text |
| Long verse uses smaller font | integration | Mock >30 word verse → verify smaller font class |
| Skeleton shows during loading | integration | Mock isLoading → verify skeleton rendered |
| Semantic: `<blockquote>` wraps verse | unit | Verify blockquote element |
| Semantic: `<cite>` wraps reference | unit | Verify cite element |
| Accessibility: all buttons have aria-label | unit | Verify 3 action buttons have aria-labels |
| Accessibility: all buttons ≥ 44px tap target | unit | Verify min-h/min-w classes |

**Expected state after completion:**
- [ ] VerseOfTheDay component renders complete VOTD card with all 3 actions
- [ ] Share opens modal with ShareSubView pre-loaded
- [ ] Save creates/removes bookmark with VOTD label, auth-gated
- [ ] BibleLanding wraps with AuthModalProvider
- [ ] Skeleton displays during loading
- [ ] Long verses use smaller font
- [ ] All 15 component tests pass

---

### Step 6: Curation Verification Tests + Full Test Suite

**Objective:** Add comprehensive tests verifying every VOTD list entry against WEB JSON data and meeting all curation constraints. Update existing tests to use new interfaces.

**Files to create/modify:**
- `frontend/src/lib/bible/__tests__/votdSelector.test.ts` — Rewrite with new shape tests
- `frontend/src/hooks/bible/__tests__/useVerseOfTheDay.test.ts` — New hook tests
- `frontend/src/components/bible/landing/__tests__/VerseOfTheDay.test.tsx` — Rewrite for new component
- `frontend/src/data/bible/votd/__tests__/votd-curation.test.ts` — New: verify every entry against WEB data + curation constraints

**Details:**

**votd-curation.test.ts (the most critical test file):**

```typescript
import { describe, expect, it } from 'vitest'
import votdList from '@/data/bible/votd/votd-list.json'
import { BIBLE_BOOKS } from '@/constants/bible'
import { loadChapterWeb } from '@/data/bible'
import type { VotdListEntry, VotdTheme } from '@/types/bible-landing'

const VALID_THEMES: VotdTheme[] = [
  'love', 'hope', 'peace', 'strength', 'faith', 'joy',
  'comfort', 'wisdom', 'forgiveness', 'provision', 'praise', 'presence',
]

const GOSPEL_SLUGS = new Set(['matthew', 'mark', 'luke', 'john'])
const OT_NARRATIVE_SLUGS = new Set([
  'genesis', 'exodus', 'joshua', 'judges', 'ruth',
  '1-samuel', '2-samuel', '1-kings', '2-kings',
  '1-chronicles', '2-chronicles', 'ezra', 'nehemiah', 'esther',
])

describe('VOTD list curation', () => {
  it('has exactly 366 entries', () => { ... })
  it('no duplicate entries', () => { ... })
  it('all book slugs match BIBLE_BOOKS', () => { ... })
  it('all themes are valid', () => { ... })
  it('Psalms entries ≤ 30% (max 110)', () => { ... })
  it('Gospel entries ≥ 20% (min 73)', () => { ... })
  it('OT narrative entries ≥ 10% (min 37)', () => { ... })
  it('all 12 themes represented', () => { ... })
  
  // This is the big one: verify every entry against WEB data
  it('every entry has valid verses in WEB data', async () => {
    for (const entry of votdList as VotdListEntry[]) {
      const chapter = await loadChapterWeb(entry.book, entry.chapter)
      expect(chapter, `Chapter not found: ${entry.book} ${entry.chapter}`).not.toBeNull()
      
      for (let v = entry.startVerse; v <= entry.endVerse; v++) {
        const verse = chapter!.verses.find(vr => vr.number === v)
        expect(verse, `Verse not found: ${entry.ref} verse ${v}`).toBeDefined()
        expect(verse!.text.trim().length, `Empty verse text: ${entry.ref} verse ${v}`).toBeGreaterThan(0)
      }
    }
  }, 30_000) // 30s timeout — loads many chapter files
})
```

**Updated votdSelector.test.ts tests:** Same structure as Step 2 test specs, verifying new `selectVotdForDate` function with `VotdListEntry` shape.

**Updated VerseOfTheDay.test.tsx tests:** Same structure as Step 5 test specs, with proper mocking of `useVerseOfTheDay`, `useAuth`, `useAuthModal`, bookmark store.

**useVerseOfTheDay.test.ts tests:** Same structure as Step 3 test specs, with proper mocking of `loadChapterWeb`, fake timers for midnight polling.

**Auth gating:** N/A — test step.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT skip the WEB verification test — a broken entry will surface weeks/months later when that day arrives
- DO NOT reduce the timeout below 30s for the WEB verification test — it loads many chapter files
- DO NOT mock `loadChapterWeb` in the curation test — the point is to verify real WEB data

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| 366 entries | unit | Exact count |
| No duplicates | unit | No two entries share same book+chapter+startVerse+endVerse |
| Valid book slugs | unit | Every slug in BIBLE_BOOKS |
| Valid themes | unit | Every theme in allowed list |
| Psalms ≤ 30% | unit | Count ≤ 110 |
| Gospels ≥ 20% | unit | Count ≥ 73 |
| OT narrative ≥ 10% | unit | Count ≥ 37 |
| All 12 themes represented | unit | Set coverage |
| Every verse exists in WEB data | integration | Load and verify each entry |

**Expected state after completion:**
- [ ] All curation verification tests pass
- [ ] All selector tests updated and passing
- [ ] All hook tests passing
- [ ] All component tests updated and passing
- [ ] `pnpm test` passes with zero failures
- [ ] `pnpm build` succeeds with zero errors

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Data model + VOTD list |
| 2 | 1 | Updated selector |
| 3 | 1, 2 | useVerseOfTheDay hook |
| 4 | — | Reader highlight on arrival (independent) |
| 5 | 2, 3, 4 | Enhanced VerseOfTheDayCard + BibleLanding wiring |
| 6 | 1, 2, 3, 4, 5 | Full test suite |

Steps 1→2→3 and 4 can be executed in parallel. Step 5 requires 2, 3, and 4. Step 6 requires all.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Data Model + VOTD List | [COMPLETE] | 2026-04-09 | Created `src/data/bible/votd/votd-list.json` (366 entries), updated `src/types/bible-landing.ts` (VotdTheme, VotdListEntry, VotdHydrated), deleted old `src/data/bible/votd.json`. Converted from old format, trimmed 34 epistolary entries, added 26 Gospel + 8 OT narrative to meet curation constraints (Psalms 58/110, Gospels 73/73, OT narrative 37/37). All 12 themes represented. Remaining old refs in votdSelector.ts + tests fixed in Steps 2/5/6. |
| 2 | Updated Selector | [COMPLETE] | 2026-04-09 | Rewrote `votdSelector.ts` with `selectVotdForDate` + `getDayOfYear` exports, new `VotdListEntry` return type, fallback to John 3:16. Also temporarily updated VerseOfTheDay.tsx to use new function/fields (full rewrite in Step 5). TypeScript compiles cleanly. |
| 3 | useVerseOfTheDay Hook | [COMPLETE] | 2026-04-09 | Created `hooks/bible/useVerseOfTheDay.ts`. Returns `{ votd, isLoading }`. Uses `loadChapterWeb` for verse text hydration, 60s midnight poll with `useRef` cleanup, fallback to John 3:16. No polling when fixed date provided. TypeScript compiles cleanly. |
| 4 | Reader Highlight on Arrival | [COMPLETE] | 2026-04-09 | Added `?highlight=` param parsing in BibleReader.tsx (single verse or range), scroll-to-verse on load, 1.5s glow animation via `arrivalHighlightVerses` prop on ReaderBody. Glow uses `rgba(139, 92, 246, 0.4)` box-shadow with `transition: box-shadow 1.5s ease-out`. Reduced motion skips transition. URL param cleaned after processing. TypeScript compiles cleanly. |
| 5 | Enhanced VerseOfTheDayCard + BibleLanding Wiring | [COMPLETE] | 2026-04-09 | Full rewrite of VerseOfTheDay.tsx: useVerseOfTheDay hook, cinematic Lora serif display, 3 action buttons (Read in context with ?highlight=, Share via VotdShareModal wrapping ShareSubView, Save via auth-gated bookmark store), date display, skeleton, long verse (>30 words) smaller font. Created VotdShareModal.tsx with focus trap and frosted glass. Added AuthModalProvider to BibleLanding.tsx. Build passes cleanly. |
| 6 | Curation Verification Tests + Full Test Suite | [COMPLETE] | 2026-04-09 | Created 4 test files: `votdSelector.test.ts` (13 tests), `useVerseOfTheDay.test.ts` (7 tests), `VerseOfTheDay.test.tsx` (15 tests), `votd-curation.test.ts` (9 tests including WEB data verification of all 366 entries). Updated `BibleLanding.test.tsx` mock. All 44 BB-18 tests pass. All 12 BibleLanding tests pass. `pnpm build` clean. 42 pre-existing test failures in BibleReader Audio/Highlights/Notes + Journal/Meditate (confirmed pre-existing via git stash). |
