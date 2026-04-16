# Implementation Plan: BB-2 Books Picker Drawer

**Spec:** `_specs/bb2-books-picker-drawer.md`
**Date:** 2026-04-07
**Branch:** `claude/feature/bb2-books-picker-drawer`
**Design System Reference:** `_plans/recon/design-system.md` (loaded — captured 2026-04-05, fresh)
**Recon Report:** not applicable
**Master Spec Plan:** N/A — part of Bible Redesign series (BB-0 through BB-21), no master plan document

---

## Architecture Context

### Project Structure

Bible-related files are organized as:
- **Pages:** `frontend/src/pages/BibleLanding.tsx` (BB-0 landing), `BibleBrowse.tsx` (old books browser at `/bible/browse`), `BibleBrowser.tsx` (legacy), `BibleReader.tsx`
- **Components:** `frontend/src/components/bible/` — landing cards in `landing/`, reader components (SegmentedControl, BibleBooksMode, CategoryGroup, BookEntry, etc.)
- **Constants:** `frontend/src/constants/bible.ts` — `BIBLE_BOOKS` (66 books), `BIBLE_CATEGORIES`, `BIBLE_PROGRESS_KEY`, `CATEGORY_LABELS`, `BOOKS_WITH_FULL_TEXT`
- **Types:** `frontend/src/types/bible.ts` — `BibleBook`, `BibleCategory`, `BibleProgressMap`
- **Data:** `frontend/src/data/bible/books/json/` — 66 JSON files, lazy-loaded
- **Z-index:** `frontend/src/constants/z-index.ts` — centralized scale, `Z.DRAWER_BACKDROP=10000`, `Z.DRAWER=10001`

### Existing Patterns to Follow

**AudioDrawer (right-side flyout):** The canonical slide-in drawer in the app. Located at `components/audio/AudioDrawer.tsx`. Key patterns:
- `position: fixed`, right-anchored on desktop (`lg:w-[400px] lg:h-full lg:right-0 lg:top-0`), bottom-sheet on mobile (`h-[70vh]`)
- Background: `rgba(15, 10, 30, 0.95)` with `backdrop-blur(16px)` and `WebkitBackdropFilter: blur(16px)`
- Backdrop: separate `div` with `bg-black/40`, `fixed inset-0`, `lg:hidden` (mobile scrim only — desktop uses click-outside)
- Z-index: `Z.DRAWER_BACKDROP` (10000) for backdrop, `Z.DRAWER` (10001) for panel
- `useFocusTrap()` hook for Escape handling + focus containment
- `useReducedMotion()` hook for animation gating
- Close: X button, click-outside on desktop, swipe gesture on mobile, Escape key
- Entry animation: `animate-bottom-sheet-slide-in` (mobile) / `animate-drawer-slide-in` (desktop)
- Returns `null` when closed (not rendered)

**useFocusTrap():** `hooks/useFocusTrap.ts` — accepts `(isActive, onEscape?)`, returns `containerRef`. Traps Tab cycling, handles Escape, stores/restores `previouslyFocused`.

**useReducedMotion():** `hooks/useReducedMotion.ts` — listens to `prefers-reduced-motion: reduce` media query.

**Scroll lock pattern:** App uses `document.body.style.overflow = 'hidden'` in a `useEffect` cleanup pattern. Used by AuthModal, SharePanel, CelebrationOverlay, etc.

**FrostedCard:** `components/homepage/FrostedCard.tsx` — `bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] rounded-2xl p-6`, dual box-shadow, optional `onClick` hover state. Accepts `as` prop for `div`/`button`/`article`.

**SegmentedControl:** `components/bible/SegmentedControl.tsx` — pill-shaped tab bar with `role="tablist"`, `aria-selected`, 44px min-height. Uses `bg-primary text-white` for active, `text-white/60` for inactive.

**Existing bible constants (`constants/bible.ts`):**
- `BIBLE_BOOKS`: 66 entries with `name`, `slug`, `chapters`, `testament`, `category`, `hasFullText`
- `BIBLE_CATEGORIES`: 10 categories with `key`, `label`, `testament` — labels are "Pentateuch", "Historical", etc.
- `CATEGORY_LABELS`: Record mapping category keys to display strings
- `BIBLE_PROGRESS_KEY = 'wr_bible_progress'`

**Category label reconciliation:** The spec uses "Law" for Pentateuch, "Apocalyptic" for Prophecy, and "History/Acts" for History. The `bookMetadata.ts` will provide drawer-specific display labels per the spec requirements. The underlying `BibleCategory` type keys remain unchanged.

**Bible landing page trigger:** `QuickActionsRow.tsx` has a "Browse Books" card that links to `/bible/browse`. BB-2 changes this to a button that opens the drawer instead of navigating.

**Test patterns:** Bible landing tests use `render` + `screen` from `@testing-library/react`, `MemoryRouter` wrapper, `describe`/`it`/`expect`/`vi` from vitest, `localStorage.clear()` in `beforeEach`.

### Route Setup

`App.tsx` lazy-loads `BibleLanding` at `/bible` and `BibleBrowse` at `/bible/browse`. The drawer will be triggered from the BibleLanding page but implemented as a context-driven component that can be opened from any Bible-section route (including the future reader).

---

## Auth Gating Checklist

**No auth gating required.** The books drawer is entirely public. Reading progress display is data-dependent, not auth-gated.

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Open drawer | Public — no auth gate | N/A | N/A |
| Search books | Public — no auth gate | N/A | N/A |
| Tap a book | Public — no auth gate | N/A | N/A |
| View reading progress | Data-dependent, not gated | N/A | N/A |

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Drawer background | background | `rgba(15, 10, 30, 0.95)` | AudioDrawer.tsx:109 |
| Drawer backdrop-filter | backdrop-filter | `blur(16px)` | AudioDrawer.tsx:110 |
| Backdrop overlay | background | `bg-black/40` | AudioDrawer.tsx:93 |
| Drawer z-index (backdrop) | z-index | `10000` (Z.DRAWER_BACKDROP) | z-index.ts:20 |
| Drawer z-index (panel) | z-index | `10001` (Z.DRAWER) | z-index.ts:22 |
| Book card | background | `bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] rounded-2xl` | FrostedCard.tsx:22 |
| Book card hover | background | `bg-white/[0.09] border-white/[0.18]` + intensified shadow | FrostedCard.tsx:25-29 |
| Book card shadow | box-shadow | `0_0_25px_rgba(139,92,246,0.06),0_4px_20px_rgba(0,0,0,0.3)` | FrostedCard.tsx:23 |
| Search input | background | `bg-white/[0.06] border border-white/[0.12] rounded-xl` | spec:93 |
| Search placeholder | color | `placeholder:text-white/50` | design-system §Text Opacity |
| Category header | style | `text-xs font-semibold tracking-wider text-white/50 uppercase` | spec:103 |
| Category divider | border | `border-t border-white/[0.08]` | spec:104 |
| Tab active | style | `bg-white/[0.15] border-white/[0.15]` | spec:98 |
| Tab inactive | style | `text-white/50 hover:text-white` | spec:99 |
| Close button | size | `h-8 w-8`, icon 18px, `rounded-full`, `hover:bg-white/10` | AudioDrawer.tsx:128-133 |
| Footer caption | style | `text-sm text-white/50` | spec:124 |
| Progress bar fill | color | `bg-primary/60` | spec:111 |
| Progress bar track | color | `bg-white/[0.06]` | spec:111 |
| Entry animation | timing | `300ms` slide-in | AudioDrawer.tsx:82, spec:83 |

---

## Design System Reminder

**Project-specific quirks that `/execute-plan` displays before every UI step:**

- Worship Room uses `GRADIENT_TEXT_STYLE` (white-to-purple gradient via `background-clip: text`) for hero and section headings on dark backgrounds. Caveat font has been deprecated for headings — used only for the logo.
- Frosted glass cards: `bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] rounded-2xl` with dual box-shadow. Use the `FrostedCard` component, not a hand-rolled card.
- The AudioDrawer pattern is the canonical right-side flyout: `rgba(15, 10, 30, 0.95)` + `backdrop-blur(16px)`, `Z.DRAWER`/`Z.DRAWER_BACKDROP` z-indices, `useFocusTrap()`, `useReducedMotion()`, 300ms animation.
- Category headers use muted uppercase treatment: `text-xs font-semibold tracking-wider text-white/50 uppercase` with `border-t border-white/[0.08]` above.
- All interactive elements need ≥44px tap target on mobile.
- `prefers-reduced-motion` must be respected — instant appear/disappear, no slide animation.
- Scroll lock: `document.body.style.overflow = 'hidden'` in useEffect with cleanup that restores the previous value.
- Focus trap: `useFocusTrap(isActive, onEscape)` from `@/hooks/useFocusTrap`.
- Z-index: use `Z` constants from `@/constants/z-index`, not raw numbers.
- No deprecated patterns: no Caveat headings, no animate-glow-pulse, no GlowBackground on drawer, no cyan borders.

---

## Shared Data Models (from Master Plan)

No master plan. The relevant types and localStorage keys:

```typescript
// Existing — from types/bible.ts
export interface BibleBook {
  name: string
  slug: string
  chapters: number
  testament: 'old' | 'new'
  category: BibleCategory
  hasFullText: boolean
}

export type BibleCategory =
  | 'pentateuch' | 'historical' | 'wisdom-poetry' | 'major-prophets' | 'minor-prophets'
  | 'gospels' | 'history' | 'pauline-epistles' | 'general-epistles' | 'prophecy'

export type BibleProgressMap = Record<string, number[]>

// NEW — to be created in bookMetadata.ts
export interface BookMetadata {
  slug: string
  name: string
  testament: 'OT' | 'NT'
  category: BibleCategory
  chapterCount: number
  wordCount: number
  abbreviations: string[]
  /** Drawer display label for the category (e.g., "Law" for pentateuch) */
  drawerCategoryLabel: string
}
```

**localStorage keys this spec touches:**
| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_bible_progress` | Read | Chapter completion per book — BB-2 reads only, BB-17 owns writes |
| `wr_bible_books_tab` | Write + Read | `'OT' \| 'NT'` — persists selected testament tab. **New key.** |

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | < 640px | Drawer is **100vw** (full-width), slides from right. Book cards in **1-column** grid. Swipe-right to close. |
| Tablet | 640px–1023px | Drawer is **420px wide**, anchored right. Book cards in **2-column** grid. |
| Desktop | ≥ 1024px | Drawer is **480px wide**, anchored right. Book cards in **2-column** grid. Bible landing visible behind backdrop. |

---

## Inline Element Position Expectations (UI features with inline rows)

| Element Group | Elements | Expected y-alignment | Wrap Tolerance |
|---------------|----------|---------------------|----------------|
| Drawer sticky header | Title, Close (X) button | Same y ±5px at all breakpoints | N/A — always same row |
| Testament tabs | "Old Testament" pill, "New Testament" pill | Same y ±5px at all breakpoints | N/A — always same row |
| Book card content | Book name, chapter count, reading time | Vertically stacked (different y by design) | N/A — column layout |

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| Drawer header (title + close) → search input | 12px (py-3) | AudioDrawer header pattern |
| Search input → testament tabs | 16px (gap-4) | codebase convention |
| Testament tabs → first category | 16px (gap-4) | codebase convention |
| Category header → first card | 12px (gap-3) | spec convention |
| Card → card (in grid) | 12px (gap-3) | grid gap |
| Last category → footer | 24px (py-6) | spec footer |

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] BB-0 (Bible landing page) is committed on the branch
- [x] BB-1 (dark cinematic foundation) is committed on the branch
- [x] No auth gating required
- [x] All auth-gated actions from the spec are accounted for (none)
- [x] Design system values are verified from AudioDrawer + FrostedCard source code
- [x] Recon report not needed (drawer is new UI, no existing page to compare against)
- [x] No deprecated patterns used
- [ ] **Word count data for 66 books**: The spec requires reading time estimates calculated at 200 wpm. Word counts must be derived from the actual JSON Bible files. Step 1 includes a build-time script to extract these.

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Drawer shell reusability | `BibleDrawer` accepts `children`, not coupled to books content | BB-6 and BB-3 will reuse the same shell |
| Category label mapping | `bookMetadata.ts` maps `pentateuch` → "Law", `prophecy` → "Apocalyptic" per spec | Existing `CATEGORY_LABELS` and `BibleCategory` type keys remain unchanged for backwards compatibility |
| Word count source | Extract from JSON Bible files via build-time script | More accurate than hardcoded guesses |
| Search "fuzzy" matching | Priority-ranked: exact match → prefix → abbreviation → substring. No fuzzy library needed for 66 items. | Fast and predictable for a small dataset |
| Mobile drawer width | `100vw` (not a fixed width) | Spec requirement: full-width on mobile |
| Swipe-right to close (mobile) | Track `touchStart.clientX` on the drawer body, close if swipe delta > 50px rightward | Mirrors AudioDrawer's swipe-down pattern but horizontal |
| Keyboard shortcut `b` | `keydown` listener on `document` gated by `!isInputFocused()` check | Spec: "when not focused on an input/textarea" |
| `Enter` on focused book card | Natural `<button>` behavior, no special handling needed | Book cards are `<button>` elements |
| Backdrop click closes on all breakpoints | Unlike AudioDrawer (desktop-only click-outside), the books drawer has a visible backdrop on all breakpoints | Spec: "backdrop tap" closes drawer. The AudioDrawer only has a scrim on mobile, but the books drawer has a backdrop everywhere. |
| Tab persistence key name | `wr_bible_books_tab` | New key per spec, added to 11-local-storage-keys.md |
| Progress bar rounding | Bottom corners only: `rounded-b-2xl` | Spec: card bottom, matching card radius |

---

## Implementation Steps

### Step 1: Create `bookMetadata.ts` — Single Source of Truth for Book Data

**Objective:** Create the foundational data file that all future Bible specs will import. Includes word counts extracted from the actual JSON Bible files.

**Files to create:**
- `frontend/src/constants/bookMetadata.ts` — 66 book entries with slug, name, testament, category, chapterCount, wordCount, abbreviations, drawerCategoryLabel
- `frontend/src/constants/__tests__/bookMetadata.test.ts` — validation tests

**Details:**

The `BookMetadata` interface extends the existing `BibleBook` data with `wordCount`, `abbreviations`, and `drawerCategoryLabel`. This file does NOT replace `bible.ts` — it imports from and re-exports `BIBLE_BOOKS`, adding the new fields.

```typescript
// constants/bookMetadata.ts
import { BIBLE_BOOKS, BIBLE_CATEGORIES } from './bible'
import type { BibleCategory } from '@/types/bible'

export interface BookMetadata {
  slug: string
  name: string
  testament: 'OT' | 'NT'
  category: BibleCategory
  chapterCount: number
  wordCount: number
  abbreviations: string[]
  drawerCategoryLabel: string
}

/** Maps category keys to drawer display labels per BB-2 spec */
export const DRAWER_CATEGORY_LABELS: Record<BibleCategory, string> = {
  pentateuch: 'Law',
  historical: 'History',
  'wisdom-poetry': 'Wisdom & Poetry',
  'major-prophets': 'Major Prophets',
  'minor-prophets': 'Minor Prophets',
  gospels: 'Gospels',
  history: 'History',
  'pauline-epistles': 'Pauline Epistles',
  'general-epistles': 'General Epistles',
  prophecy: 'Apocalyptic',
}

/** Category display order for Old Testament */
export const OT_CATEGORIES: BibleCategory[] = [
  'pentateuch', 'historical', 'wisdom-poetry', 'major-prophets', 'minor-prophets',
]

/** Category display order for New Testament */
export const NT_CATEGORIES: BibleCategory[] = [
  'gospels', 'history', 'pauline-epistles', 'general-epistles', 'prophecy',
]
```

Word counts: Extract from the actual JSON files by summing all verse text lengths (split by spaces). Use a one-time Node script (`scripts/extract-word-counts.ts`) to produce the counts, then hardcode them in `bookMetadata.ts` (no runtime JSON loading for word counts).

Abbreviations — common short forms per book (e.g., `['gen', 'ge']` for Genesis, `['ps', 'psa', 'psalm']` for Psalms, `['rev', 'apocalypse']` for Revelation, `['1cor', '1co']` for 1 Corinthians, `['song', 'sos', 'canticles']` for Song of Solomon).

Reading time: `Math.ceil(wordCount / 200)` minutes at runtime.

**`formatReadingTime(minutes: number): string`** utility:
- < 60 min → `"~{min} min"`
- ≥ 60 min → `"~{hr} hr {min} min"` (omit minutes part if 0)

**Responsive behavior:** N/A: no UI impact — data-only step.

**Guardrails (DO NOT):**
- Do NOT delete or modify `constants/bible.ts` or `types/bible.ts` — this file supplements, not replaces
- Do NOT import JSON Bible files at runtime for word counts — hardcode them
- Do NOT change the `BibleCategory` type keys

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `exports 66 book entries` | unit | Verify `BOOK_METADATA.length === 66` |
| `OT has 39 books, NT has 27` | unit | Filter by testament, verify counts |
| `every book has wordCount > 0` | unit | Verify no zero or missing word counts |
| `every book has at least 1 abbreviation` | unit | Verify abbreviations array is non-empty |
| `categories match spec groupings` | unit | Verify OT 5 categories (5+12+5+5+12=39 books), NT 5 categories (4+1+13+8+1=27 books) |
| `formatReadingTime handles hours and minutes` | unit | Test edge cases: 0, 30, 60, 90, 200 minutes |
| `drawerCategoryLabel maps correctly` | unit | Spot-check "Law" for pentateuch, "Apocalyptic" for prophecy |

**Expected state after completion:**
- [ ] `bookMetadata.ts` exports `BOOK_METADATA` array with 66 entries
- [ ] Each entry has `slug`, `name`, `testament`, `category`, `chapterCount`, `wordCount`, `abbreviations`, `drawerCategoryLabel`
- [ ] `formatReadingTime()` utility exported
- [ ] `DRAWER_CATEGORY_LABELS`, `OT_CATEGORIES`, `NT_CATEGORIES` exported
- [ ] 7 tests pass

---

### Step 2: Create `BibleDrawerProvider` — Context for Opening/Closing the Drawer

**Objective:** Create a React context that allows any Bible-section component to open/close the books drawer. This is the shared state layer that BB-3, BB-4, and BB-6 will also consume.

**Files to create:**
- `frontend/src/components/bible/BibleDrawerProvider.tsx` — context + provider
- `frontend/src/components/bible/__tests__/BibleDrawerProvider.test.tsx` — tests

**Details:**

```typescript
// BibleDrawerProvider.tsx
import { createContext, useContext, useState, useCallback, useRef } from 'react'

interface BibleDrawerContextValue {
  isOpen: boolean
  open: () => void
  close: () => void
  toggle: () => void
  /** Ref to the element that triggered the drawer open (for focus restore) */
  triggerRef: React.MutableRefObject<HTMLElement | null>
}

const BibleDrawerContext = createContext<BibleDrawerContextValue | null>(null)

export function BibleDrawerProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const triggerRef = useRef<HTMLElement | null>(null)

  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])
  const toggle = useCallback(() => setIsOpen((prev) => !prev), [])

  return (
    <BibleDrawerContext.Provider value={{ isOpen, open, close, toggle, triggerRef }}>
      {children}
    </BibleDrawerContext.Provider>
  )
}

export function useBibleDrawer() {
  const ctx = useContext(BibleDrawerContext)
  if (!ctx) throw new Error('useBibleDrawer must be used within BibleDrawerProvider')
  return ctx
}
```

The provider will be mounted in `BibleLanding.tsx` (wrapping the page content + drawer). In the future (BB-4), it will be lifted to wrap the entire `/bible/*` route subtree.

**Responsive behavior:** N/A: no UI impact — context-only step.

**Guardrails (DO NOT):**
- Do NOT couple this to AudioProvider or AudioDrawer — this is a separate drawer system
- Do NOT add localStorage persistence for `isOpen` — only the testament tab selection persists
- Do NOT make this a global provider in `App.tsx` — scope to Bible section only

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `provides default closed state` | unit | Render child that reads `isOpen`, verify `false` |
| `open() sets isOpen to true` | unit | Call `open()`, verify `isOpen` is `true` |
| `close() sets isOpen to false` | unit | Open then close, verify `false` |
| `toggle() flips isOpen` | unit | Toggle twice, verify state changes |
| `throws when used outside provider` | unit | Render `useBibleDrawer()` without provider, catch error |

**Expected state after completion:**
- [ ] `BibleDrawerProvider` + `useBibleDrawer` hook exported
- [ ] `triggerRef` available for focus restore
- [ ] 5 tests pass

---

### Step 3: Create `BibleDrawer` — Reusable Drawer Shell Component

**Objective:** Build the generic right-side slide-in drawer shell that accepts `children`. This is the visual container — it handles animation, backdrop, focus trap, scroll lock, and close gestures. The books-specific content (Step 4) is injected via children.

**Files to create:**
- `frontend/src/components/bible/BibleDrawer.tsx` — the drawer shell
- `frontend/src/components/bible/__tests__/BibleDrawer.test.tsx` — tests

**Details:**

Follow the AudioDrawer pattern closely:

**Structure:**
```tsx
<>
  {/* Backdrop — visible on ALL breakpoints (unlike AudioDrawer which only shows on mobile) */}
  <div className={`fixed inset-0 z-[${Z.DRAWER_BACKDROP}] bg-black/40`} onClick={close} aria-hidden="true" />
  {/* Panel */}
  <div ref={containerRef} role="dialog" aria-modal="true" aria-label={ariaLabel} className={...}>
    {children}
  </div>
</>
```

**Panel sizing:**
- Mobile (< 640px): `w-full` (100vw), anchored right, full height
- Tablet (640px–1023px): `w-[420px]`, anchored right, full height
- Desktop (≥ 1024px): `w-[480px]`, anchored right, full height

All: `fixed top-0 right-0 bottom-0 h-full flex flex-col overflow-hidden`

**Background:** Inline style `background: 'rgba(15, 10, 30, 0.95)'`, `backdropFilter: 'blur(16px)'`, `WebkitBackdropFilter: 'blur(16px)'`

**Border:** `border-l border-white/10` (left edge only — drawer anchored right)

**Animation:**
- Entry: `translateX(100%)` → `translateX(0)` over 300ms via CSS transition (or a custom `animate-bible-drawer-slide-in` keyframe). Gated by `useReducedMotion()` — when reduced motion, no transform animation (instant appear).
- Exit: The drawer unmounts (returns `null` when `!isOpen`). For smooth exit, use a `closing` state that triggers `translateX(100%)` over 250ms before unmounting. Or keep it simple like AudioDrawer (instant unmount).

**Decision: Simple unmount (no exit animation).** Matches AudioDrawer behavior. Keeps code simpler.

**Scroll lock:** `useEffect` that sets `document.body.style.overflow = 'hidden'` when open, restores on cleanup.

**Focus trap:** `useFocusTrap(isOpen, handleClose)` — returns `containerRef`.

**Swipe-right to close (mobile):**
Track `touchStart.clientX` on the panel, calculate delta on `touchMove`, if rightward delta exceeds 50px on `touchEnd`, call `close()`. Apply `translateX(swipeOffset)` during swipe for visual feedback.

**Keyboard shortcut `b`:** Handled externally (Step 5), not inside the drawer shell.

**Props interface:**
```typescript
interface BibleDrawerProps {
  isOpen: boolean
  onClose: () => void
  ariaLabel: string
  children: React.ReactNode
}
```

The drawer reads `isOpen` and `onClose` from props (not directly from context) so it remains reusable for BB-6. The consuming component (Step 6) bridges between context and props.

**Responsive behavior:**
- Desktop (≥ 1024px): `w-[480px]`, right-anchored, backdrop visible behind
- Tablet (640px–1023px): `w-[420px]`, right-anchored, backdrop visible
- Mobile (< 640px): `w-full` (100vw), right-anchored, swipe-right to close

**Guardrails (DO NOT):**
- Do NOT use AudioProvider state — this drawer is independent
- Do NOT use `GlowBackground` inside the drawer
- Do NOT add exit animation (keep simple unmount like AudioDrawer)
- Do NOT use raw z-index numbers — use `Z.DRAWER_BACKDROP` and `Z.DRAWER`
- Do NOT use `lg:hidden` on the backdrop (unlike AudioDrawer, the books drawer has backdrop on all breakpoints per spec)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `renders nothing when isOpen is false` | unit | Render with `isOpen={false}`, verify null output |
| `renders dialog when isOpen is true` | unit | Render with `isOpen={true}`, verify `role="dialog"` present |
| `has aria-modal and aria-label` | unit | Verify `aria-modal="true"` and custom `aria-label` |
| `renders children` | unit | Pass test content, verify it appears |
| `calls onClose when backdrop clicked` | unit | Click backdrop div, verify `onClose` called |
| `calls onClose on Escape` | integration | Press Escape, verify `onClose` called (via useFocusTrap) |
| `locks body scroll when open` | unit | Render open, verify `document.body.style.overflow === 'hidden'` |
| `restores body scroll on unmount` | unit | Mount open, unmount, verify overflow restored |
| `uses z-index from Z constants` | unit | Verify container className includes `z-[10001]` |
| `applies reduced motion styles` | unit | Mock `prefers-reduced-motion`, verify no transform animation class |

**Expected state after completion:**
- [ ] `BibleDrawer` renders as a right-side slide-in panel with frosted glass background
- [ ] Backdrop, focus trap, scroll lock, Escape, swipe-right all working
- [ ] Width: 100vw (mobile), 420px (tablet), 480px (desktop)
- [ ] Reusable via `children` prop — not coupled to books content
- [ ] 10 tests pass

---

### Step 4: Create `BooksDrawerContent` — The Books-Specific Content

**Objective:** Build the books drawer interior: sticky header (title + close + search), testament tabs, categorized book grid with progress bars, and footer. This component is the `children` of `BibleDrawer`.

**Files to create:**
- `frontend/src/components/bible/BooksDrawerContent.tsx` — the books-specific content
- `frontend/src/components/bible/__tests__/BooksDrawerContent.test.tsx` — tests

**Details:**

**Component structure:**
```
<div className="flex h-full flex-col">
  {/* Sticky Header */}
  <div className="sticky top-0 z-10 shrink-0 px-4 pt-4 pb-3" style={{ background: 'rgba(15, 10, 30, 0.98)' }}>
    <div className="flex items-center justify-between">
      <h2 className="text-lg font-bold text-white">Books of the Bible</h2>
      <button onClick={onClose} aria-label="Close books drawer" className="flex h-8 w-8 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white min-h-[44px] min-w-[44px]">
        <X size={18} />
      </button>
    </div>
    <input type="search" placeholder="Find a book" className="mt-3 w-full rounded-xl bg-white/[0.06] border border-white/[0.12] px-4 py-2.5 text-white placeholder:text-white/50 text-sm focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/30 min-h-[44px]" />
    {/* Testament tabs — hidden when search is active */}
    {!searchQuery && <TestamentTabs />}
  </div>

  {/* Scrollable body */}
  <div className="flex-1 overflow-y-auto px-4 pb-6">
    {searchQuery ? <SearchResults /> : <CategorizedBooks />}
  </div>

  {/* Footer */}
  <div className="shrink-0 border-t border-white/[0.08] px-4 py-3">
    <p className="text-center text-sm text-white/50">66 books · World English Bible</p>
  </div>
</div>
```

**Testament Tabs:**
Segmented control styled like the Daily Hub tab bar's active pill:
- Container: `flex rounded-full border border-white/10 bg-white/[0.06] p-1 mt-3`
- Active: `bg-white/[0.15] shadow-[0_0_12px_rgba(139,92,246,0.20)] rounded-full px-4 py-2 text-sm font-medium text-white min-h-[44px]`
- Inactive: `rounded-full px-4 py-2 text-sm font-medium text-white/50 hover:text-white min-h-[44px]`
- `role="tablist"`, `role="tab"`, `aria-selected`
- Persist selection to `wr_bible_books_tab` localStorage on change; read on mount (default: `'OT'`)

**Categorized Book Grid:**
For each category in the selected testament's ordered list (`OT_CATEGORIES` or `NT_CATEGORIES`):
- Category header: `<h3 className="text-xs font-semibold tracking-wider text-white/50 uppercase pt-4 pb-2">` with `border-t border-white/[0.08]` above (except the first category)
- Book card grid: `<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">`

**Book Card (`BookCard` sub-component):**
- `<button>` element (not a `<div>`) for keyboard accessibility
- FrostedCard-style classes: `bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] rounded-2xl p-4 text-left transition-all duration-200 hover:bg-white/[0.09] hover:border-white/[0.18] hover:shadow-[0_0_35px_rgba(139,92,246,0.10),0_6px_25px_rgba(0,0,0,0.35)] hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 min-h-[44px] w-full`
- Content: book name (`text-base font-semibold text-white`), chapter count (`text-sm text-white/60`), reading time (`text-sm text-white/60`)
- Click: calls `onSelectBook(slug)` which navigates to `/bible/${slug}/1` and closes the drawer
- Progress bar (conditional): thin 2px bar at the absolute bottom of the card. Track: `bg-white/[0.06]`, fill: `bg-primary/60`, rounded with `rounded-b-2xl overflow-hidden`. Width: `(chaptersRead.length / totalChapters) * 100%`.

**Search:**
- Real-time filtering (no debounce needed for 66 items)
- Matching logic in priority order:
  1. Exact name match (case-insensitive)
  2. Name starts with query
  3. Abbreviation matches query (exact or starts-with)
  4. Name contains query as substring
- When search is active: testament tabs and category headers hidden; results in flat list, still using the 2-column grid
- Press Enter: navigate to first result's `/bible/${slug}/1`
- `aria-live="polite"` region announcing result count for screen readers

**Reading progress:** Read `wr_bible_progress` from localStorage. Type: `Record<string, number[]>`. For each book, `progress[slug]?.length || 0` gives chapters read. Show progress bar only when > 0.

**Navigation:** Use `useNavigate()` from react-router-dom. `onSelectBook` calls `navigate(`/bible/${slug}/1`)` and `close()`.

**Responsive behavior:**
- Desktop (1440px): 2-column book card grid inside 480px drawer
- Tablet (768px): 2-column book card grid inside 420px drawer
- Mobile (375px): 1-column full-width cards inside 100vw drawer

**Guardrails (DO NOT):**
- Do NOT use the `FrostedCard` component directly for book cards — book cards need to be `<button>` elements, and FrostedCard's `as="button"` doesn't set `type="button"`. Hand-roll the classes.
- Do NOT use `<a>` or `<Link>` for book cards — use `<button>` with `onClick` that calls `navigate()`
- Do NOT add reading progress write logic — BB-2 only reads `wr_bible_progress`
- Do NOT import JSON Bible files — only read localStorage progress data

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `renders "Books of the Bible" heading` | unit | Verify heading text |
| `renders close button with aria-label` | unit | Verify close button exists and has accessible name |
| `renders search input with placeholder` | unit | Verify input with "Find a book" placeholder |
| `renders OT tab active by default` | unit | Verify "Old Testament" has `aria-selected="true"` |
| `renders 5 OT categories` | unit | Verify Law, History, Wisdom & Poetry, Major Prophets, Minor Prophets headers |
| `renders 39 OT book cards` | unit | Count buttons with book names in OT view |
| `switches to NT tab` | integration | Click "New Testament", verify 5 NT categories + 27 cards |
| `NT renders 27 book cards` | integration | Switch to NT, count buttons |
| `search filters books` | integration | Type "psa" in search, verify Psalms appears |
| `search resolves abbreviation "rev"` | integration | Type "rev", verify Revelation appears |
| `search resolves "1cor"` | integration | Type "1cor", verify 1 Corinthians appears |
| `search hides tabs and category headers` | integration | Type in search, verify tabs and headers gone |
| `clearing search restores categorized view` | integration | Type then clear, verify categories return |
| `Enter navigates to first result` | integration | Type "gene", press Enter, verify navigate called with `/bible/genesis/1` |
| `book card calls onSelectBook` | integration | Click Genesis card, verify callback |
| `shows progress bar when progress data exists` | unit | Set `wr_bible_progress` with genesis data, verify progress bar |
| `hides progress bar when no progress` | unit | Clear localStorage, verify no progress bar |
| `persists tab selection to localStorage` | integration | Switch to NT, verify `wr_bible_books_tab` is `'NT'` |
| `reads persisted tab on mount` | unit | Set `wr_bible_books_tab='NT'`, render, verify NT active |
| `footer shows "66 books · World English Bible"` | unit | Verify footer text |
| `category headers have uppercase muted styling` | unit | Verify category header has `uppercase` and `text-white/50` classes |

**Expected state after completion:**
- [ ] Full books content with OT/NT tabs, category grouping, search, progress bars
- [ ] Search resolves abbreviations (ps, rev, 1cor, song)
- [ ] Tab persists to localStorage
- [ ] Navigation on book selection
- [ ] 21 tests pass

---

### Step 5: Wire Drawer into `BibleLanding.tsx` + Keyboard Shortcuts

**Objective:** Mount the `BibleDrawerProvider` + `BibleDrawer` + `BooksDrawerContent` on the Bible landing page. Change the "Browse Books" quick action from a link to a drawer trigger. Add `b` keyboard shortcut.

**Files to modify:**
- `frontend/src/pages/BibleLanding.tsx` — wrap with provider, mount drawer, add keyboard listener
- `frontend/src/components/bible/landing/QuickActionsRow.tsx` — change "Browse Books" from `<Link>` to `<button>` that opens drawer
- `frontend/src/components/bible/landing/__tests__/QuickActionsRow.test.tsx` — update tests

**Details:**

**BibleLanding.tsx changes:**
```tsx
import { BibleDrawerProvider, useBibleDrawer } from '@/components/bible/BibleDrawerProvider'
import { BibleDrawer } from '@/components/bible/BibleDrawer'
import { BooksDrawerContent } from '@/components/bible/BooksDrawerContent'

function BibleLandingInner() {
  const { isOpen, close, toggle, triggerRef } = useBibleDrawer()

  // Keyboard shortcut: 'b' to toggle drawer
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'b' && !isInputFocused()) {
        e.preventDefault()
        toggle()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [toggle])

  return (
    <Layout>
      {/* ... existing SEO, orbs, hero, content ... */}
      {isOpen && (
        <BibleDrawer isOpen={isOpen} onClose={close} ariaLabel="Books of the Bible">
          <BooksDrawerContent onClose={close} onSelectBook={(slug) => {
            navigate(`/bible/${slug}/1`)
            close()
          }} />
        </BibleDrawer>
      )}
    </Layout>
  )
}

export function BibleLanding() {
  return (
    <BibleDrawerProvider>
      <BibleLandingInner />
    </BibleDrawerProvider>
  )
}
```

**`isInputFocused()` utility:**
```typescript
function isInputFocused(): boolean {
  const tag = document.activeElement?.tagName.toLowerCase()
  return tag === 'input' || tag === 'textarea' || tag === 'select' || document.activeElement?.getAttribute('contenteditable') === 'true'
}
```

**QuickActionsRow.tsx changes:**
Change the "Browse Books" action from a `<Link to="/bible/browse">` to a `<button>` that calls `useBibleDrawer().open()`. The other two actions (My Bible, Reading Plans) remain as links.

```typescript
// Updated ACTIONS — first item is now a drawer trigger, not a route
const ROUTE_ACTIONS = [
  { icon: Bookmark, label: 'My Bible', description: 'Highlights, notes & bookmarks', route: '/bible/my' },
  { icon: ListChecks, label: 'Reading Plans', description: 'Guided daily reading', route: '/bible/plans' },
] as const

// Render: browse button + 2 link cards
```

The "Browse Books" card becomes a `<FrostedCard as="button" onClick={() => { triggerRef.current = buttonRef.current; open() }}>`.

**Responsive behavior:**
- Desktop (1440px): Bible landing visible behind the 480px drawer
- Tablet (768px): Bible landing visible behind the 420px drawer
- Mobile (375px): Drawer covers entire screen

**Guardrails (DO NOT):**
- Do NOT remove the `/bible/browse` route from `App.tsx` — it still exists for direct URL access
- Do NOT add the drawer to `App.tsx` globally — scope to Bible landing for now
- Do NOT add keyboard shortcuts that conflict with browser defaults

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `Browse Books button opens the drawer` | integration | Click "Browse Books", verify drawer dialog appears |
| `Browse Books is now a button, not a link` | unit | Verify "Browse Books" element is `<button>`, not `<a>` |
| `drawer closes and navigates on book select` | integration | Open drawer, click a book, verify drawer closes + navigate called |
| `b key toggles drawer` | integration | Press 'b', verify drawer opens; press 'b' again, verify closes |
| `b key does not toggle when input focused` | integration | Focus search input, press 'b', verify drawer does not close |
| `My Bible and Reading Plans remain as links` | unit | Verify those cards still have `<a>` tags with correct hrefs |

**Expected state after completion:**
- [ ] "Browse Books" opens the drawer instead of navigating to `/bible/browse`
- [ ] `b` keyboard shortcut works
- [ ] Drawer mounts inside BibleLanding with full books content
- [ ] 6 tests pass

---

### Step 6: Add `/` Keyboard Shortcut Inside Drawer + Focus Management

**Objective:** When the drawer is open, pressing `/` focuses the search input. Ensure focus moves to search on open and returns to trigger on close.

**Files to modify:**
- `frontend/src/components/bible/BooksDrawerContent.tsx` — add `/` keydown handler, search input ref
- `frontend/src/components/bible/BibleDrawer.tsx` — ensure focus restore via `triggerRef`

**Details:**

**Focus on open:** The `useFocusTrap` hook already focuses the first focusable element. Since the close button comes before the search input in DOM order, we need to explicitly focus the search input after the drawer opens. Add a `useEffect` that focuses the search input ref when `isOpen` transitions to `true`.

**`/` shortcut:** Inside `BooksDrawerContent`, add a `keydown` listener on the drawer container that catches `/` and focuses the search input (unless already focused on it).

**Focus restore on close:** The `useFocusTrap` hook stores `document.activeElement` on mount and restores it on cleanup. The `triggerRef` from `BibleDrawerProvider` is set before opening so the trigger button receives focus on close.

**Responsive behavior:** N/A: no UI impact — keyboard/focus behavior only.

**Guardrails (DO NOT):**
- Do NOT override the useFocusTrap's built-in focus restore — the hook already handles this
- Do NOT add multiple competing keydown listeners for the same keys

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `search input receives focus on drawer open` | integration | Open drawer, verify search input is focused |
| `/ key focuses search input inside drawer` | integration | Open drawer, focus a book card, press '/', verify search input focused |
| `focus returns to trigger on close` | integration | Record trigger element, open and close drawer, verify trigger refocused |

**Expected state after completion:**
- [ ] Search input auto-focused on open
- [ ] `/` key focuses search from anywhere in the drawer
- [ ] Focus returns to trigger element on close
- [ ] 3 tests pass

---

### Step 7: Update `11-local-storage-keys.md` + Documentation

**Objective:** Document the new `wr_bible_books_tab` localStorage key.

**Files to modify:**
- `.claude/rules/11-local-storage-keys.md` — add new key to Bible Reader section

**Details:**

Add to the "Bible Reader" section:

```markdown
| `wr_bible_books_tab` | `'OT' \| 'NT'` | Books drawer testament tab selection |
```

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- Do NOT modify any other keys or sections
- Do NOT add keys that don't exist yet

**Test specifications:**
None — documentation only.

**Expected state after completion:**
- [ ] `wr_bible_books_tab` documented in localStorage key inventory

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | `bookMetadata.ts` — foundational book data |
| 2 | — | `BibleDrawerProvider` — context layer |
| 3 | — | `BibleDrawer` — reusable drawer shell |
| 4 | 1 | `BooksDrawerContent` — books content (needs bookMetadata) |
| 5 | 2, 3, 4 | Wire into BibleLanding + keyboard shortcuts |
| 6 | 3, 4, 5 | Focus management + `/` shortcut |
| 7 | 4 | Documentation (needs to know the key name) |

Steps 1, 2, 3 can be implemented in parallel.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | bookMetadata.ts | [COMPLETE] | 2026-04-07 | Created `constants/bookMetadata.ts` with 66 entries, word counts from JSON (5 single-chapter books used standard WEB counts due to incomplete JSON), abbreviations, category labels. Created tests (7 pass). |
| 2 | BibleDrawerProvider | [COMPLETE] | 2026-04-07 | Created `BibleDrawerProvider.tsx` + `useBibleDrawer` hook with triggerRef. 5 tests pass. |
| 3 | BibleDrawer shell | [COMPLETE] | 2026-04-07 | Created `BibleDrawer.tsx` — right-side slide-in with backdrop on all breakpoints, scroll lock, focus trap, swipe-right close, 100vw/420px/480px widths. 10 tests pass. |
| 4 | BooksDrawerContent | [COMPLETE] | 2026-04-07 | Created `BooksDrawerContent.tsx` — sticky header, search with abbreviation matching, OT/NT tabs, categorized grid, progress bars, footer. 21 tests pass. |
| 5 | Wire into BibleLanding | [COMPLETE] | 2026-04-07 | Wrapped BibleLanding with BibleDrawerProvider, mounted BibleDrawer+BooksDrawerContent. Changed Browse Books from Link to button triggering drawer. Added 'b' keyboard shortcut. Updated QuickActionsRow tests (6 pass). Visual verified: 480px desktop, 375px mobile, all elements present. |
| 6 | Focus management | [COMPLETE] | 2026-04-07 | Added auto-focus of search on mount (50ms delay to let focus trap init), `/` key handler to refocus search. 3 focus tests added (24 total in BooksDrawerContent). Playwright verified both behaviors. |
| 7 | Documentation | [COMPLETE] | 2026-04-07 | Added `wr_bible_books_tab` to Bible Reader section of `11-local-storage-keys.md`. |
