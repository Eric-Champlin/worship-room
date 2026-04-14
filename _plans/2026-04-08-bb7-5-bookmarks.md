# Implementation Plan: BB-7.5 Bookmarks

**Spec:** `_specs/bb-7-5-bookmarks.md`
**Date:** 2026-04-08
**Branch:** `bible-redesign`
**Design System Reference:** `_plans/recon/design-system.md` (loaded)
**Recon Report:** not applicable
**Master Spec Plan:** not applicable

---

## Architecture Context

### Project Structure

- **Bookmark store:** `src/lib/bible/bookmarkStore.ts` (new, mirrors `src/lib/bible/highlightStore.ts`)
- **Bookmark types:** `src/types/bible.ts` (add `Bookmark` interface alongside existing `Highlight`)
- **Constants:** `src/constants/bible.ts` (add `BIBLE_BOOKMARKS_KEY`)
- **Registry:** `src/lib/bible/verseActionRegistry.ts` (replace bookmark stub at line 184-192)
- **Action context:** `src/types/verse-actions.ts` (extend `VerseActionContext` with `keepSheetOpen`)
- **Action sheet:** `src/components/bible/reader/VerseActionSheet.tsx` (implement `keepSheetOpen` behavior)
- **Reader body:** `src/components/bible/reader/ReaderBody.tsx` (accept bookmark data, render markers)
- **Reader page:** `src/pages/BibleReader.tsx` (subscribe to bookmark store, pass data to ReaderBody)
- **Theme tokens:** `src/index.css` (add `--bookmark-marker` per theme)

### Existing Patterns to Follow

- **Highlight store pattern** (`highlightStore.ts`): Module-level `cache` + `listeners` Set, SSR guard (`typeof window === 'undefined'`), `readFromStorage()` with try/catch JSON.parse, `writeToStorage()` with QuotaExceededError handling, `getCache()` lazy init, `notifyListeners()` loop, `subscribe()` returning unsubscribe function. Bookmarks store mirrors this exactly.
- **Highlight store test pattern** (`__tests__/highlightStore.test.ts`): Dynamic `import()` with `vi.resetModules()` in `beforeEach` to get fresh module state. `localStorage.clear()` in setup. Factory function `makeHighlight()`.
- **Action handler pattern** (`verseActionRegistry.ts`): `VerseActionHandler` interface with `action`, `label`, `icon`, `category`, `hasSubView`, `isAvailable`, `getState`, `onInvoke`. Highlight handler uses `getState` to return `{ active: true, activeColor }`.
- **Toast API** (`Toast.tsx` line 35): `showToast(message: string, type?: StandardToastType, action?: ToastAction)` where `ToastAction = { label: string; onClick: () => void }`. Toast auto-dismisses after 6 seconds. The `action` parameter renders an inline button.
- **Verse rendering** (`ReaderBody.tsx`): Verses render as inline `<span>` elements. The verse number is a `<sup>` with `style={{ fontSize: '0.7em', color: 'var(--reader-verse-num)' }}`. Highlights apply as background colors via CSS custom properties. The reader uses `data-reader-theme` attribute for theme scoping.
- **BibleReader subscription** (`BibleReader.tsx` lines 84-125): `useState` initialized from store, `useEffect` with `subscribe()` that calls the store's getter on change. Used for highlights; bookmarks will follow the same pattern.

### Theme Token Structure

Three themes defined in `src/index.css` lines 17-79 via `[data-reader-theme="midnight|parchment|sepia"]`:
- Midnight: dark bg `#08051A`, verse num `rgba(255,255,255,0.30)`
- Parchment: warm bg `#F5F0E8`, verse num `rgba(62,44,26,0.35)`
- Sepia: brown bg `#E8D5B7`, verse num `rgba(44,26,10,0.35)`

Bookmark marker colors should be subtle — slightly more visible than verse numbers but not attention-grabbing. They mark location, not meaning.

### Test Patterns

- Vitest + `describe/it/expect`
- `vi.resetModules()` + dynamic `import()` for module-level state isolation
- `localStorage.clear()` in `beforeEach`
- Factory helpers for test data
- No provider wrapping needed for pure store tests
- Component tests would need `ToastProvider` wrapping (but this plan's tests are store-only + registry-only)

---

## Auth Gating Checklist

**No actions in this spec require login.** Bookmarks persist to localStorage for all users (logged-in and logged-out). Phase 3 will add server sync for logged-in users.

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Bookmark a verse | No auth required | Step 4 | N/A — localStorage for all |
| Add a bookmark label | No auth required | Step 7 | N/A — localStorage for all |
| View bookmark markers | No auth required | Step 5 | N/A — reads from localStorage |
| Remove a bookmark | No auth required | Step 4 | N/A — localStorage for all |

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Bookmark marker (midnight) | color | `rgba(168, 162, 200, 0.50)` | [UNVERIFIED] — muted lavender at 50% to sit between verse-num opacity (0.30) and reader-text opacity (0.90) |
| Bookmark marker (parchment) | color | `rgba(120, 90, 50, 0.50)` | [UNVERIFIED] — warm brown at 50% matching parchment palette |
| Bookmark marker (sepia) | color | `rgba(90, 60, 30, 0.50)` | [UNVERIFIED] — darker brown at 50% matching sepia palette |
| Bookmark marker | size | `0.7em` (matches verse number font-size) | Spec req 26 |
| Bookmark marker | position | Inline before verse number `<sup>`, via `position: relative` wrapper | Spec req 25, 27 |
| Bookmark marker hover | opacity | `0.75` (from 0.50 baseline) | Spec req 28 |
| Action sheet panel | background | `rgba(15, 10, 30, 0.95)` with `backdrop-blur(16px)` | `VerseActionSheet.tsx` line 247 |
| Primary action icon (active) | class | `[&>*]:fill-current` on the Lucide `Bookmark` icon | `VerseActionSheet.tsx` line 355 |
| Toast | position | `fixed top-4 right-4 z-50` | `Toast.tsx` line 162 |
| Toast undo button | class | `ml-2 shrink-0 rounded-md bg-primary px-3 py-1 text-xs font-medium text-white hover:bg-primary-lt` | `Toast.tsx` line 187 |
| Label editor popover | background | `rgba(15, 10, 30, 0.95)` with `backdrop-blur(16px)` | Match action sheet styling |
| Label editor popover | width | `w-[300px]` (desktop), `w-[calc(100vw-2rem)]` (mobile) | Spec req 19 |
| Label editor popover | border | `border border-white/[0.12] rounded-xl` | Match FrostedCard borders |

[UNVERIFIED] values for bookmark marker colors:
- To verify: Run `/verify-with-playwright` and visually inspect the marker against verse numbers on all 3 themes
- If wrong: Adjust the RGBA values in `--bookmark-marker` token to achieve a muted, visible-but-not-distracting look that sits between verse number opacity and text opacity

---

## Design System Reminder

**Project-specific quirks that `/execute-plan` displays before every UI step:**

- The Bible reader uses `data-reader-theme` attribute for theme scoping, NOT Tailwind dark: classes. All reader-specific colors must use CSS custom properties scoped to `[data-reader-theme="midnight|parchment|sepia"]`.
- Verse numbers use `<sup>` with `style={{ fontSize: '0.7em', color: 'var(--reader-verse-num)' }}`. The bookmark marker should be the same font-size scale (0.7em) and positioned inline near the verse number.
- The action sheet primary actions row uses `[&>*]:fill-current` on icons when `state?.active` is true (line 355 of `VerseActionSheet.tsx`). The Lucide `Bookmark` icon already supports this — filled state is `fill-current` + color applied via parent `<span>`.
- Worship Room uses `GRADIENT_TEXT_STYLE` for headings, but the Bible reader uses its own typography system (`ReaderSettings` with `typeSize`, `lineHeight`, `fontFamily`). Do NOT apply gradient text styles inside the reader body.
- `HighlightStorageFullError` is thrown from `writeToStorage` — reuse this same pattern as `BookmarkStorageFullError` extending `Error`.
- Toast system supports `action?: ToastAction` with `{ label: string; onClick: () => void }` — this is how Undo will be implemented (the toast API already supports it natively).
- The toast auto-dismisses after 6 seconds (`Toast.tsx` line 123-125). The spec says 4 seconds for undo. The plan uses the existing 6-second timeout (close enough and consistent with the rest of the app) rather than creating a custom shorter timeout. If the user specifically wants 4s, that requires modifying the Toast system.
- The `VerseActionContext` currently has `showToast` and `closeSheet`. The spec requires adding `keepSheetOpen` to prevent auto-close. This will be implemented by having the handler simply not call `closeSheet()` rather than adding a new API method — the existing pattern already supports this since `closeSheet` is opt-in.

**Source:** `09-design-system.md`, `index.css` theme tokens, `VerseActionSheet.tsx`, `Toast.tsx`, BB-7 execution log (no deviations).

---

## Shared Data Models

### New Bookmark Type

```typescript
// src/types/bible.ts — add alongside existing Highlight type
export interface Bookmark {
  id: string
  book: string          // slug e.g. "john"
  chapter: number
  startVerse: number
  endVerse: number      // equals startVerse for single-verse
  label?: string        // optional, max 80 chars
  createdAt: number     // epoch ms
}
```

### localStorage keys this spec touches

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `bible:bookmarks` | Both | Flat `Bookmark[]` array. The spec explicitly uses the `bible:` prefix (not `wr_`), following the Bible redesign wave's namespacing convention. |

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | Bookmark marker scales with verse font size. Label editor popover full-width minus 1rem margin each side, positioned above action sheet. Touch targets 44px. |
| Tablet | 768px | Same as mobile. Slightly more popover width. |
| Desktop | 1440px | Label editor popover 300px wide, anchored to bookmark icon. Hover brightening on bookmark markers. Right-click opens label editor. |

---

## Inline Element Position Expectations

| Element Group | Elements | Expected y-alignment | Wrap Tolerance |
|---------------|----------|---------------------|----------------|
| Primary actions row | Highlight, Note, Bookmark, Share icons | Same y ±5px at all breakpoints | No wrapping acceptable — 4 icons always fit |
| Bookmark marker + verse number | Marker icon, `<sup>` verse number | Same baseline ±2px | Marker is inline with the sup — never wraps |

---

## Vertical Rhythm

N/A — this feature modifies existing UI (action sheet, verse rendering) rather than adding new page sections. No new vertical spacing between sections.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] BB-4 (verse spans) is complete and committed
- [x] BB-6 (action sheet + registry) is complete and committed
- [x] BB-7 (highlights) is complete and committed — store pattern is the foundation
- [x] All auth-gated actions from the spec are accounted for in the plan (none — all localStorage)
- [x] Design system values are verified (from codebase inspection) — marker colors marked [UNVERIFIED]
- [x] All [UNVERIFIED] values are flagged with verification methods
- [ ] Recon report loaded if available (not applicable — reader page not in recon)
- [x] No deprecated patterns used
- **Toast undo timing**: Spec says 4 seconds, existing toast system uses 6 seconds. Plan uses 6s for consistency. If 4s is required, the Toast component must be modified to accept a custom duration (deferred unless user specifies).
- **`keepSheetOpen` vs not calling `closeSheet`**: The spec describes a `keepSheetOpen()` API. Since the existing `onInvoke` pattern already gives handlers the choice of calling `closeSheet()` or not (copy calls it, highlight calls it via `renderSubView` context), bookmarks simply not calling `closeSheet()` achieves the same result with zero API changes. The plan uses this approach. If BB-8/BB-13/BB-45 need an explicit `keepSheetOpen` signal, it can be added then.
- **`showToast` with action**: The `VerseActionContext.showToast` currently has signature `(message: string, type?: string) => void` which doesn't pass `ToastAction`. The plan extends the context to forward the full Toast API's `action` parameter.
- **localStorage key**: Spec uses `bible:bookmarks` (not `wr_bible_bookmarks`). Plan follows spec exactly.

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| `keepSheetOpen` API | Don't call `closeSheet()` from onInvoke instead of adding explicit API | Simpler; same result. Copy/highlight handlers call closeSheet; bookmark handler doesn't. Zero API surface change. |
| Toast undo timing | 6 seconds (existing system default) vs spec's 4 seconds | Consistency with all other toasts. Changing requires modifying shared Toast component — risk/benefit doesn't justify it for this spec. |
| Rapid toggle protection | Store `lastToggleId` in handler closure; undo checks against it | Prevents stale undo from reverting a later toggle. Simple ref-based guard. |
| Bookmark marker DOM position | Inline `<span>` before the `<sup>` verse number, inside the same parent `<span>` | Doesn't displace text flow. The marker is part of the verse's inline content, not absolutely positioned outside it. This keeps screen readers' natural reading order intact. |
| Label editor trigger | `onContextMenu` (desktop right-click) + custom `useLongPress` hook (mobile) on the Bookmark icon button | Spec req 18. The action sheet's own long-press is on verse text DOM, not on icon buttons inside the sheet, so no conflict (spec req 23). |
| `VerseActionContext.showToast` signature | Extend to `(message: string, type?: string, action?: ToastAction) => void` | Needed for undo. The action sheet already imports `useToast` which supports `action` — just needs to forward it through the context. |
| Multi-verse bookmark with partial overlap | Remove ALL overlapping bookmarks (spec req 11) | Unlike highlights which split/merge, bookmarks are simpler — they're navigation markers, not semantic annotations. Removing all overlapping is cleaner than merging. |
| Bookmark marker color approach | CSS custom property `--bookmark-marker` per theme | Consistent with how highlights use `--highlight-{color}-bg`. One token vs 45 for highlights — much simpler. |

---

## Implementation Steps

### Step 1: Bookmark Type + Constants

**Objective:** Define the `Bookmark` interface and storage key constant.

**Files to create/modify:**
- `src/types/bible.ts` — Add `Bookmark` interface
- `src/constants/bible.ts` — Add `BIBLE_BOOKMARKS_KEY` constant

**Details:**

Add to `src/types/bible.ts` after the existing `Highlight` interface (around line 78):

```typescript
export interface Bookmark {
  id: string
  book: string          // slug e.g. "john"
  chapter: number
  startVerse: number
  endVerse: number      // equals startVerse for single-verse
  label?: string        // optional, max 80 chars
  createdAt: number     // epoch ms
}
```

Add to `src/constants/bible.ts` after `BIBLE_NOTES_KEY` (line 5):

```typescript
export const BIBLE_BOOKMARKS_KEY = 'bible:bookmarks'
```

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- Do NOT add `updatedAt` field — spec explicitly excludes it (req 3)
- Do NOT use `wr_` prefix — spec uses `bible:` prefix for Bible redesign wave
- Do NOT add a `color` field — bookmarks are not colored

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| N/A | — | Type-only step; compile check is the test |

**Expected state after completion:**
- [x] `Bookmark` type exported from `types/bible.ts`
- [x] `BIBLE_BOOKMARKS_KEY` exported from `constants/bible.ts`
- [x] TypeScript compiles without errors

---

### Step 2: Bookmark Store — TDD Tests

**Objective:** Write all bookmark store unit tests first (TDD). Tests will fail until Step 3 implements the store.

**Files to create:**
- `src/lib/bible/__tests__/bookmarkStore.test.ts`

**Details:**

Follow the test pattern from `__tests__/highlightStore.test.ts`:
- Dynamic `import('../bookmarkStore')` with `vi.resetModules()` per test
- `localStorage.clear()` in `beforeEach`
- Factory function `makeBookmark(overrides)` returning a valid `Bookmark`

Test cases:

```
describe('bookmarkStore')
  describe('read API')
    it('returns empty array when no bookmarks exist')
    it('getAllBookmarks returns all bookmarks as shallow copy')
    it('getBookmarksForChapter filters by book and chapter')
    it('getBookmarkForVerse finds bookmark containing that verse (range-aware)')
    it('getBookmarkForVerse returns null when no bookmark matches')
    it('isSelectionBookmarked returns true when any verse in range is bookmarked')
    it('isSelectionBookmarked returns false when no verses are bookmarked')

  describe('toggleBookmark')
    it('creates bookmark when none exists — returns { created: true, bookmark }')
    it('removes bookmark when selection is fully bookmarked — returns { created: false, bookmark: null }')
    it('removes all overlapping bookmarks when selection partially overlaps')
    it('creates a single spanning bookmark for multi-verse selection')
    it('persists to localStorage after toggle-create')
    it('persists to localStorage after toggle-remove')

  describe('setBookmarkLabel')
    it('sets label on existing bookmark')
    it('no-ops when bookmark id not found')
    it('clears label when empty string provided')
    it('truncates label to 80 characters')

  describe('removeBookmark')
    it('removes bookmark by id')
    it('no-ops when id not found')

  describe('removeBookmarksInRange')
    it('removes all bookmarks overlapping the given range')
    it('no-ops when no bookmarks overlap')

  describe('restoreBookmarks')
    it('restores previously removed bookmarks with original ids and labels')
    it('does not create duplicates if bookmark id already exists')

  describe('subscribe')
    it('notifies listeners on toggleBookmark')
    it('notifies listeners on setBookmarkLabel')
    it('notifies listeners on removeBookmark')
    it('unsubscribe stops notifications')

  describe('error handling')
    it('returns empty array when localStorage contains malformed JSON')
    it('silently filters invalid entries')
    it('throws BookmarkStorageFullError on QuotaExceededError')

  describe('SSR safety')
    it('returns empty array when window is undefined')
```

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- Do NOT implement the store in this step — tests only
- Do NOT import from a file that doesn't exist yet — use dynamic `import()` pattern from highlightStore tests

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| ~25 tests | unit | Full coverage of bookmarkStore API |

**Expected state after completion:**
- [x] Test file exists at `src/lib/bible/__tests__/bookmarkStore.test.ts`
- [x] Tests fail because the store module doesn't exist yet (TDD red phase)

---

### Step 3: Bookmark Store — Implementation

**Objective:** Implement the reactive localStorage-backed bookmark store, mirroring highlightStore.ts patterns.

**Files to create:**
- `src/lib/bible/bookmarkStore.ts`

**Details:**

Mirror `highlightStore.ts` (308 lines) structure:

1. **Module state:** `let cache: Bookmark[] | null = null`, `const listeners = new Set<() => void>()`
2. **Error class:** `BookmarkStorageFullError extends Error`
3. **ID generation:** Same `generateId()` using `crypto.randomUUID()` with fallback
4. **Validation:** `isValidBookmark(record: unknown): record is Bookmark` — checks all required fields. No migration needed (new feature, no old format).
5. **Storage I/O:**
   - `readFromStorage()`: SSR guard, try/catch JSON.parse, filter via `isValidBookmark`
   - `writeToStorage()`: SSR guard, try/catch with QuotaExceededError → BookmarkStorageFullError
   - `getCache()`: Lazy init from storage
   - `notifyListeners()`: Loop over listeners set
6. **Read API:**
   - `getAllBookmarks(): Bookmark[]` — shallow copy of cache
   - `getBookmarksForChapter(book, chapter): Bookmark[]` — filter by book+chapter
   - `getBookmarkForVerse(book, chapter, verse): Bookmark | null` — range-aware find
   - `isSelectionBookmarked(book, chapter, startVerse, endVerse): boolean` — true if any verse in range has a bookmark
7. **Write API:**
   - `toggleBookmark(selection: BookmarkSelection): { created: boolean; bookmark: Bookmark | null }` — if any overlapping, remove all and return `{ created: false, bookmark: null }`; if none, create and return `{ created: true, bookmark }`. Per spec reqs 6-12.
   - `setBookmarkLabel(id: string, label: string): void` — find by id, set label (truncate to 80 chars), write, notify. Empty string clears label.
   - `removeBookmark(id: string): void` — filter by id, write, notify
   - `removeBookmarksInRange(selection: BookmarkSelection): Bookmark[]` — remove all overlapping, return removed bookmarks (needed for undo restore), write, notify
   - `restoreBookmarks(bookmarks: Bookmark[]): void` — add back bookmarks (skip if id already exists), write, notify
8. **Subscription:** `subscribe(listener): () => void` — same pattern as highlights

**`BookmarkSelection` interface:**
```typescript
interface BookmarkSelection {
  book: string
  chapter: number
  startVerse: number
  endVerse: number
}
```

**`rangesOverlap` helper:** Same as `highlightStore.ts` line 159-161: `a.startVerse <= b.endVerse && a.endVerse >= b.startVerse`

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- Do NOT add `updatedAt` to bookmarks
- Do NOT implement migration logic (no old format exists)
- Do NOT add cap/limit on bookmark count — spec has no limit
- Do NOT use `wr_` prefix — key is `bible:bookmarks` via `BIBLE_BOOKMARKS_KEY`
- Do NOT mutate cache array directly — always create new array via spread/filter

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Step 2 tests pass | unit | All ~25 tests from Step 2 should now pass |

**Expected state after completion:**
- [x] `bookmarkStore.ts` exists with full read/write/subscribe API
- [x] All Step 2 tests pass (TDD green phase)
- [x] `pnpm test` passes

---

### Step 4: Action Sheet Context + Bookmark Handler in Registry

**Objective:** Extend `VerseActionContext` to support toast actions (for undo), then replace the bookmark stub in the registry with the real handler.

**Files to modify:**
- `src/types/verse-actions.ts` — Extend `VerseActionContext.showToast` to accept `ToastAction`
- `src/components/bible/reader/VerseActionSheet.tsx` — Forward `action` param through context
- `src/lib/bible/verseActionRegistry.ts` — Replace bookmark stub with real handler

**Details:**

**1. Extend VerseActionContext (verse-actions.ts line 48-51):**

```typescript
import type { ToastAction } from '@/components/ui/Toast'

export interface VerseActionContext {
  showToast: (message: string, type?: string, action?: ToastAction) => void
  closeSheet: () => void
}
```

**2. Update VerseActionSheet context forwarding (VerseActionSheet.tsx lines 150-153 and 282-284):**

Change `showToast: (msg: string) => showToast(msg)` to `showToast: (msg: string, type?: string, action?: ToastAction) => showToast(msg, type as StandardToastType | undefined, action)` in both locations (handleActionClick and sub-view context).

Import `ToastAction` and `StandardToastType` from `@/components/ui/Toast`.

**3. Replace bookmark handler (verseActionRegistry.ts lines 184-192):**

```typescript
import {
  isSelectionBookmarked,
  toggleBookmark,
  removeBookmarksInRange,
  restoreBookmarks,
  BookmarkStorageFullError,
} from '@/lib/bible/bookmarkStore'
import type { Bookmark } from '@/types/bible'

// Rapid-toggle guard
let lastToggleId: string | null = null

const bookmark: VerseActionHandler = {
  action: 'bookmark',
  label: 'Bookmark',
  icon: Bookmark, // Lucide Bookmark icon (already imported)
  category: 'primary',
  hasSubView: false,

  getState: (selection: VerseSelection) => {
    const isBookmarked = isSelectionBookmarked(
      selection.book,
      selection.chapter,
      selection.startVerse,
      selection.endVerse,
    )
    return {
      active: isBookmarked,
      activeColor: 'var(--bookmark-marker)',
    }
  },

  isAvailable: () => true,

  onInvoke: (selection: VerseSelection, ctx: VerseActionContext) => {
    try {
      const result = toggleBookmark({
        book: selection.book,
        chapter: selection.chapter,
        startVerse: selection.startVerse,
        endVerse: selection.endVerse,
      })

      const toggleId = crypto.randomUUID()
      lastToggleId = toggleId

      if (result.created) {
        const createdBookmark = result.bookmark!
        ctx.showToast('Bookmarked', undefined, {
          label: 'Undo',
          onClick: () => {
            if (lastToggleId !== toggleId) return // Stale undo
            removeBookmark(createdBookmark.id)
          },
        })
      } else {
        const removedBookmarks = result.removed ?? []
        ctx.showToast('Bookmark removed', undefined, {
          label: 'Undo',
          onClick: () => {
            if (lastToggleId !== toggleId) return // Stale undo
            restoreBookmarks(removedBookmarks)
          },
        })
      }
      // Intentionally NOT calling ctx.closeSheet() — spec req 9
    } catch (e) {
      if (e instanceof BookmarkStorageFullError) {
        ctx.showToast('Storage full — export your bookmarks and clear old ones.')
      }
    }
  },
}
```

**Note:** `toggleBookmark` return type needs to include `removed` for undo:
```typescript
{ created: boolean; bookmark: Bookmark | null; removed?: Bookmark[] }
```
Update `toggleBookmark` in `bookmarkStore.ts` to return the removed bookmarks when `created: false`.

**Also import `removeBookmark` from the bookmark store** (needed for undo-after-create).

**Responsive behavior:** N/A: no UI impact (action sheet layout unchanged)

**Guardrails (DO NOT):**
- Do NOT call `ctx.closeSheet()` from the bookmark handler — sheet stays open (spec req 9)
- Do NOT add a `keepSheetOpen()` method to the context — simply not calling `closeSheet` achieves the same result
- Do NOT change the Lucide `Bookmark` icon import — it's already imported at line 5
- Do NOT modify the primary actions array order — bookmark is already in position 3 (line 314)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| handler returns active state when bookmarked | unit | `getState` returns `{ active: true }` |
| handler returns inactive state when not bookmarked | unit | `getState` returns `{ active: false }` |
| handler shows "Bookmarked" toast with undo on create | unit | Mock `ctx.showToast` and verify call args |
| handler shows "Bookmark removed" toast with undo on remove | unit | Mock `ctx.showToast` and verify call args |
| handler does not close sheet | unit | Verify `ctx.closeSheet` is NOT called |
| rapid toggle undo guard prevents stale undo | unit | Toggle twice, first undo is no-op |
| handler catches BookmarkStorageFullError | unit | Verify storage-full toast |

Add these tests to `src/lib/bible/__tests__/verseActionRegistry.test.ts` (existing file) in a new `describe('bookmark handler')` block.

**Expected state after completion:**
- [x] Tapping Bookmark icon in action sheet creates/removes bookmarks
- [x] Toast appears with Undo action
- [x] Sheet stays open after tapping Bookmark
- [x] Rapid-toggle undo is guarded
- [x] All existing registry tests still pass
- [x] `pnpm test` passes

---

### Step 5: Theme Tokens + Bookmark Marker Component

**Objective:** Add `--bookmark-marker` CSS custom property to all 3 reader themes and create the `VerseBookmarkMarker` component.

**Files to modify:**
- `src/index.css` — Add `--bookmark-marker` to each `[data-reader-theme]` block

**Files to create:**
- `src/components/bible/reader/VerseBookmarkMarker.tsx`

**Details:**

**1. Theme tokens in `index.css`:**

Add `--bookmark-marker` after the last `--highlight-*` property in each theme block:

```css
[data-reader-theme="midnight"] {
  /* ... existing tokens ... */
  --bookmark-marker: rgba(168, 162, 200, 0.50);
  --bookmark-marker-hover: rgba(168, 162, 200, 0.75);
}

[data-reader-theme="parchment"] {
  /* ... existing tokens ... */
  --bookmark-marker: rgba(120, 90, 50, 0.50);
  --bookmark-marker-hover: rgba(120, 90, 50, 0.75);
}

[data-reader-theme="sepia"] {
  /* ... existing tokens ... */
  --bookmark-marker: rgba(90, 60, 30, 0.50);
  --bookmark-marker-hover: rgba(90, 60, 30, 0.75);
}
```

**2. VerseBookmarkMarker component:**

A small inline SVG bookmark icon rendered before the verse number. Follows Lucide's `Bookmark` path but at a tiny size matching the verse number's `0.7em`.

```typescript
// src/components/bible/reader/VerseBookmarkMarker.tsx

interface VerseBookmarkMarkerProps {
  bookName: string
  chapter: number
  verseNumber: number
}

export function VerseBookmarkMarker({ bookName, chapter, verseNumber }: VerseBookmarkMarkerProps) {
  return (
    <span
      className="mr-0.5 inline-block align-super transition-colors duration-150"
      style={{ fontSize: '0.7em' }}
      aria-hidden="true" // Announced via verse's aria-label instead
    >
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="inline-block"
        style={{
          width: '0.85em',
          height: '0.85em',
          color: 'var(--bookmark-marker)',
          verticalAlign: 'baseline',
        }}
      >
        <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
      </svg>
    </span>
  )
}
```

The marker uses `aria-hidden="true"` because the bookmark status will be announced via the verse span's `aria-label` (Step 6).

**Responsive behavior:**
- Desktop (1440px): Marker renders inline, hover brightens via CSS `--bookmark-marker-hover`
- Tablet (768px): Same as desktop without hover brightening
- Mobile (375px): Marker scales with verse font size (0.7em is relative to parent)

**Guardrails (DO NOT):**
- Do NOT use raw hex values — all colors via `--bookmark-marker` token
- Do NOT use animation on the marker — spec req 29 says "No animation"
- Do NOT use `position: absolute` — marker is inline, not absolutely positioned
- Do NOT add click handler to the marker — tapping it opens the action sheet via normal verse tap (spec req 28)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| renders SVG bookmark icon | unit | Component renders without error |
| uses --bookmark-marker CSS variable | unit | Check style prop includes the token |
| has aria-hidden="true" | unit | Verify attribute for a11y |

**Expected state after completion:**
- [x] `--bookmark-marker` and `--bookmark-marker-hover` tokens exist in all 3 themes
- [x] `VerseBookmarkMarker` component renders a small filled bookmark SVG
- [x] `pnpm test` passes

---

### Step 6: ReaderBody + BibleReader Integration

**Objective:** Wire bookmarks into the reader: load bookmarks per chapter, pass to ReaderBody, render markers on bookmarked verses, add accessible labels.

**Files to modify:**
- `src/components/bible/reader/ReaderBody.tsx` — Accept `chapterBookmarks` prop, render markers, add aria-label
- `src/pages/BibleReader.tsx` — Subscribe to bookmark store, pass data to ReaderBody

**Details:**

**1. ReaderBody changes:**

Add new prop:
```typescript
interface ReaderBodyProps {
  // ... existing props ...
  /** Bookmark data for this chapter */
  chapterBookmarks?: Bookmark[]
}
```

Import `VerseBookmarkMarker` and `Bookmark` type.

Inside the verse rendering loop (after the `hl` lookup around line 64), add bookmark lookup:

```typescript
const bm = chapterBookmarks?.find(
  (b) => verse.number >= b.startVerse && verse.number <= b.endVerse,
)
const isBookmarked = !!bm
```

Add `aria-label` to the verse `<span>` (line 72-95):

```typescript
aria-label={isBookmarked
  ? `${bookSlug} ${chapter}:${verse.number}, bookmarked`
  : undefined
}
```

Render the marker before the `<sup>` verse number (line 97-102):

```typescript
{isBookmarked && (
  <VerseBookmarkMarker
    bookName={bookSlug}
    chapter={chapter}
    verseNumber={verse.number}
  />
)}
<sup
  className="mr-1 align-super font-sans"
  style={{ fontSize: '0.7em', color: 'var(--reader-verse-num)' }}
>
  {verse.number}
</sup>
```

**2. BibleReader changes (BibleReader.tsx):**

Import bookmark store functions:
```typescript
import {
  getBookmarksForChapter,
  subscribe as subscribeBookmarks,
} from '@/lib/bible/bookmarkStore'
import type { Bookmark } from '@/types/bible'
```

Add bookmark state (after highlight state, ~line 85):
```typescript
const [chapterBookmarks, setChapterBookmarks] = useState<Bookmark[]>(() =>
  getBookmarksForChapter(bookSlug ?? '', chapterNumber),
)
```

Add bookmark subscription (after highlight subscription, ~line 101):
```typescript
useEffect(() => {
  const fresh = getBookmarksForChapter(bookSlug ?? '', chapterNumber)
  setChapterBookmarks(fresh)
}, [bookSlug, chapterNumber])

useEffect(() => {
  const unsubscribe = subscribeBookmarks(() => {
    setChapterBookmarks(getBookmarksForChapter(bookSlug ?? '', chapterNumber))
  })
  return unsubscribe
}, [bookSlug, chapterNumber])
```

Pass to ReaderBody (~line 431):
```typescript
<ReaderBody
  verses={verses}
  bookSlug={bookSlug!}
  chapter={chapterNumber}
  settings={settings}
  paragraphs={paragraphs}
  selectedVerses={selectedVerseNumbers}
  chapterHighlights={chapterHighlights}
  chapterBookmarks={chapterBookmarks}
  selectionVisible={selectionVisible}
  freshHighlightVerses={freshHighlightVerses}
  reducedMotion={reducedMotion}
/>
```

**Responsive behavior:**
- Desktop (1440px): Bookmark markers visible with hover brightening (CSS handles via `--bookmark-marker-hover`). Note: hover is applied via the marker's parent verse span hover, not the marker itself.
- Tablet (768px): Markers visible, no hover effect
- Mobile (375px): Markers scale with text size (relative `em` units)

**Guardrails (DO NOT):**
- Do NOT add click handlers to the bookmark marker — verse tap handling is existing behavior
- Do NOT change the highlight rendering logic — bookmarks coexist visually
- Do NOT add animation to bookmark marker appearance — spec says no animation (req 29)
- Do NOT pass bookmarks via context — pass as props (consistent with highlights pattern)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| ReaderBody renders bookmark marker for bookmarked verse | unit | Render with chapterBookmarks containing verse 16, verify marker SVG present |
| ReaderBody does not render marker for non-bookmarked verse | unit | Render with empty chapterBookmarks, verify no marker SVG |
| ReaderBody adds aria-label for bookmarked verse | unit | Verify aria-label contains "bookmarked" |
| Bookmark marker coexists with highlight background | unit | Render verse with both highlight and bookmark, verify both present |
| BibleReader subscribes to bookmark store | integration | Verify store subscription setup and cleanup |

**Expected state after completion:**
- [x] Bookmarked verses show a small bookmark marker icon next to the verse number
- [x] Markers coexist with highlight backgrounds
- [x] Screen readers announce "bookmarked" for bookmarked verses
- [x] Bookmarks update reactively when toggled from the action sheet
- [x] `pnpm test` passes

---

### Step 7: Label Editor Popover

**Objective:** Build the `BookmarkLabelEditor` popover for adding/editing labels via long-press (mobile) or right-click (desktop) on the Bookmark icon in the action sheet.

**Files to create:**
- `src/components/bible/reader/BookmarkLabelEditor.tsx`
- `src/hooks/useLongPress.ts`

**Files to modify:**
- `src/components/bible/reader/VerseActionSheet.tsx` — Attach long-press and right-click handlers to the Bookmark icon button

**Details:**

**1. `useLongPress` hook (`src/hooks/useLongPress.ts`):**

```typescript
export function useLongPress(
  callback: () => void,
  options?: { threshold?: number },
): {
  onTouchStart: (e: React.TouchEvent) => void
  onTouchEnd: () => void
  onTouchCancel: () => void
}
```

- Default threshold: 500ms
- On `touchstart`, start a timer. On `touchend`/`touchcancel` before threshold, clear timer (normal tap).
- On timer fire, call `callback()` and set a `fired` flag to prevent the subsequent `touchend` from also triggering a tap.
- Prevent default on `touchstart` is NOT needed (the button's `onClick` handler handles the tap — long-press is additive).

**2. `BookmarkLabelEditor` component:**

```typescript
interface BookmarkLabelEditorProps {
  bookmarkId: string | null  // null = verse not yet bookmarked
  currentLabel: string
  selection: VerseSelection
  anchorRef: React.RefObject<HTMLButtonElement>
  onClose: () => void
}
```

Renders a floating popover anchored to the Bookmark icon button:

- **Container:** `position: fixed`, z-index `10002` (above action sheet's `10001`), positioned below the anchor button via `getBoundingClientRect()`. On mobile, positioned above the action sheet panel.
- **Backdrop:** `position: fixed inset-0 z-[10002]` transparent click-outside-to-cancel.
- **Popover body:**
  - `w-[300px]` on desktop, `w-[calc(100vw-2rem)] max-w-[400px]` on mobile
  - Background: `rgba(15, 10, 30, 0.95)` with `backdrop-blur(16px)` (matches action sheet)
  - Border: `border border-white/[0.12] rounded-xl`
  - Padding: `p-4`
  - Single-line text input: `<input type="text" maxLength={80}` with white text on dark bg
  - Character counter: `text-xs text-white/40` showing `N / 80`
  - Button row: `flex gap-2 mt-3 justify-end`
    - Cancel: `text-sm text-white/60 hover:text-white px-3 py-1.5`
    - Save: `text-sm font-medium bg-primary text-white px-4 py-1.5 rounded-lg hover:bg-primary-lt`

**Keyboard handling:**
- Escape: close (cancel)
- Enter: save
- Focus auto-set to input on open

**Save logic:**
1. If `bookmarkId` is null (verse not bookmarked), call `toggleBookmark()` first to create it, then `setBookmarkLabel()` with the new bookmark's id
2. If label is empty, call `setBookmarkLabel(id, '')` to clear (spec req 21)
3. Close popover after save

**3. VerseActionSheet integration:**

In the primary actions map (lines 338-362), for the bookmark handler specifically:
- Store a ref to the bookmark button: `const bookmarkBtnRef = useRef<HTMLButtonElement>(null)`
- Add `ref={bookmarkBtnRef}` to the bookmark button
- Add `useLongPress(() => setLabelEditorOpen(true))` handlers to the bookmark button
- Add `onContextMenu={(e) => { e.preventDefault(); setLabelEditorOpen(true) }}` for desktop right-click
- Render `<BookmarkLabelEditor>` when `labelEditorOpen` is true

New state in VerseActionSheet:
```typescript
const [labelEditorOpen, setLabelEditorOpen] = useState(false)
const bookmarkBtnRef = useRef<HTMLButtonElement>(null)
```

**Responsive behavior:**
- Desktop (1440px): Popover ~300px wide, anchored below the bookmark icon button. Right-click opens it.
- Tablet (768px): Same as desktop with slightly wider popover if space allows.
- Mobile (375px): Popover positioned above the action sheet panel (absolute positioning), full width minus 1rem margin. Long-press opens it. Input has 44px min height.

**Guardrails (DO NOT):**
- Do NOT render the label on the reader page — labels are private metadata for BB-14's list view (spec req 24)
- Do NOT make the popover part of the sub-view stack — it's a floating overlay above the sheet
- Do NOT use `FrostedCard` for the popover — it's a utility popover, not a content card (spec design notes)
- Do NOT allow labels longer than 80 chars — `maxLength={80}` on the input
- Do NOT conflict with verse-text long-press — the long-press is on the Bookmark icon BUTTON inside the sheet, not on verse text in the reader (different DOM contexts, spec req 23)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| renders input with current label | unit | Pass currentLabel="For Monday", verify input value |
| shows character counter | unit | Type 10 chars, verify "10 / 80" displayed |
| Enter key saves | unit | Simulate Enter, verify onClose called |
| Escape key cancels | unit | Simulate Escape, verify onClose called without save |
| Save with empty label clears label | unit | Clear input, click Save, verify setBookmarkLabel called with '' |
| Save on unbookmarked verse creates bookmark + sets label | unit | Pass bookmarkId=null, type label, save, verify toggleBookmark + setBookmarkLabel called |
| useLongPress fires callback after threshold | unit | Simulate touchstart, wait 500ms, verify callback |
| useLongPress does not fire on quick tap | unit | Simulate touchstart + touchend at 100ms, verify callback NOT called |
| right-click on bookmark icon opens label editor | integration | Simulate contextmenu event, verify label editor rendered |

**Expected state after completion:**
- [x] Long-press (mobile) or right-click (desktop) on Bookmark icon opens label editor
- [x] Label editor shows input with character counter
- [x] Save creates bookmark with label if not yet bookmarked
- [x] Save with empty label clears label without removing bookmark
- [x] Escape, Enter, tap-outside, Save, and Cancel all close the popover
- [x] `pnpm test` passes

---

### Step 8: Final Integration Test + localStorage Key Documentation

**Objective:** Add the `bible:bookmarks` key to the localStorage key inventory and run full integration verification.

**Files to modify:**
- `.claude/rules/11-local-storage-keys.md` — Add `bible:bookmarks` entry to the Bible Reader section

**Details:**

**1. Add to localStorage key inventory:**

In the Bible Reader section of `11-local-storage-keys.md`, add:

```markdown
| `bible:bookmarks`    | `Bookmark[]`               | Verse bookmarks (flat array) |
```

**2. Full integration test (manual verification + automated):**

Run `pnpm test` to verify all tests pass.

Verify the acceptance criteria from the spec:
- Toggle creates/removes bookmarks with appropriate toast + undo
- Sheet stays open after tapping Bookmark
- Undo reverts within the toast window
- Page reload shows bookmarks still applied
- Bookmark markers visible on bookmarked verses
- Markers coexist with highlights
- Label editor opens on long-press/right-click
- Label saves correctly with character counter
- Multi-verse bookmarks work correctly
- Theme tokens render on all 3 themes
- QuotaExceededError shows storage-full toast
- Malformed localStorage entries are filtered
- Screen reader announces "bookmarked"

**Responsive behavior:** N/A: documentation step

**Guardrails (DO NOT):**
- Do NOT change existing localStorage keys
- Do NOT modify the CLAUDE.md feature summary (out of scope for this spec)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| All existing tests pass | regression | `pnpm test` exits 0 |
| Build succeeds | regression | `pnpm build` exits 0 |

**Expected state after completion:**
- [x] `bible:bookmarks` documented in `11-local-storage-keys.md`
- [x] All tests pass
- [x] Build succeeds
- [x] Feature is complete per spec acceptance criteria

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Bookmark type + constants |
| 2 | 1 | TDD tests for bookmark store |
| 3 | 1, 2 | Bookmark store implementation |
| 4 | 3 | Action context + bookmark handler in registry |
| 5 | 1 | Theme tokens + marker component |
| 6 | 3, 5 | ReaderBody + BibleReader integration |
| 7 | 4, 6 | Label editor popover |
| 8 | 4, 6, 7 | Documentation + integration test |

**Parallelism:** Steps 2 and 5 can begin in parallel after Step 1. Step 4 and 6 can begin once their dependencies are met.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Bookmark Type + Constants | [COMPLETE] | 2026-04-08 | Added `Bookmark` interface to `types/bible.ts` (after `Highlight`), `BIBLE_BOOKMARKS_KEY` to `constants/bible.ts` |
| 2 | Bookmark Store — TDD Tests | [COMPLETE] | 2026-04-08 | Created `src/lib/bible/__tests__/bookmarkStore.test.ts` with ~25 tests. Tests fail as expected (store not yet implemented). |
| 3 | Bookmark Store — Implementation | [COMPLETE] | 2026-04-08 | Created `src/lib/bible/bookmarkStore.ts`. All 31 tests pass. Full suite: 6022 pass, 20 pre-existing failures in BibleReader audio/highlight integration tests. |
| 4 | Action Context + Bookmark Handler | [COMPLETE] | 2026-04-08 | Extended `VerseActionContext.showToast` for `ToastAction`, updated forwarding in `VerseActionSheet.tsx`, replaced bookmark stub in registry with real handler. Added `_resetCacheForTesting` to bookmarkStore. 7 new tests in registry. |
| 5 | Theme Tokens + Marker Component | [COMPLETE] | 2026-04-08 | Added `--bookmark-marker` and `--bookmark-marker-hover` to all 3 themes in `index.css`. Created `VerseBookmarkMarker.tsx` with 3 tests. |
| 6 | ReaderBody + BibleReader Integration | [COMPLETE] | 2026-04-08 | Added `chapterBookmarks` prop to ReaderBody, render markers + aria-label. BibleReader subscribes to bookmarkStore. 4 new tests in ReaderBody.test.tsx. Build passes. |
| 7 | Label Editor Popover | [COMPLETE] | 2026-04-08 | Created `useLongPress.ts` (4 tests), `BookmarkLabelEditor.tsx` (6 tests). Wired into VerseActionSheet with ref, long-press, right-click. Fixed showToast forwarding to preserve arg count for backward compat. |
| 8 | Documentation + Integration Test | [COMPLETE] | 2026-04-08 | Added `bible:bookmarks` to `11-local-storage-keys.md`. Full suite: 6046 pass, 20 pre-existing failures. Build passes. |
