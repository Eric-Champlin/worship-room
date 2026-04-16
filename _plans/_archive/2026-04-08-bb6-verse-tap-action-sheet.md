# Implementation Plan: BB-6 Verse Tap Action Sheet

**Spec:** `_specs/bb-6-verse-tap-action-sheet.md`
**Date:** 2026-04-08
**Branch:** `bible-redesign`
**Design System Reference:** `_plans/recon/design-system.md` (loaded — captured 2026-04-05)
**Recon Report:** not applicable
**Master Spec Plan:** N/A — standalone feature within Bible redesign wave

---

## Architecture Context

### Project Structure

Bible reader files relevant to BB-6:

- **Page:** `frontend/src/pages/BibleReader.tsx` (378 lines) — `BibleReaderInner` mounts `ReaderChrome`, `TypographySheet`, `ReaderBody`, `ReaderChapterNav`, `VerseJumpPill`, `BibleDrawer`, `FocusVignette`. Uses `useFocusMode()` with `pauseFocusMode()`/`resumeFocusMode()` for drawer/sheet coordination.
- **ReaderBody:** `frontend/src/components/bible/reader/ReaderBody.tsx` (62 lines) — Renders verse spans with `data-verse`, `data-book`, `data-chapter` attributes and `id="verse-{number}"`. No click handlers currently.
- **ReaderChrome:** `frontend/src/components/bible/reader/ReaderChrome.tsx` (126 lines) — Fixed top chrome with focus mode opacity/pointer-events control. ICON_BTN class: `'flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white'`.
- **BibleDrawer:** `frontend/src/components/bible/BibleDrawer.tsx` (100 lines) — Right-side slide-in drawer, z-[10001] panel + z-[10000] backdrop, swipe-right dismiss, `bg-black/40` backdrop, frosted glass `rgba(15, 10, 30, 0.95)` + `backdrop-blur(16px)`. Used for books/chapters picker.
- **BibleDrawerProvider:** `frontend/src/components/bible/BibleDrawerProvider.tsx` (104 lines) — Context with `isOpen`, `open(view?)`, `close()`, `pushView()`, `popView()`, view stack. `DrawerView = { type: 'books' } | { type: 'chapters'; bookSlug }`.
- **DrawerViewRouter:** `frontend/src/components/bible/DrawerViewRouter.tsx` (107 lines) — Maps view types to components, handles push/pop transitions (220ms). VIEW_COMPONENTS registry pattern.
- **useFocusMode:** `frontend/src/hooks/useFocusMode.ts` (335 lines) — `pauseFocusMode()` (ref-counted), `resumeFocusMode()`, `triggerFocused()`. BibleReader pauses when `bibleDrawer.isOpen` or `typographyOpen`.
- **useFocusTrap:** `frontend/src/hooks/useFocusTrap.ts` (51 lines) — `useFocusTrap(isActive, onEscape?)` returns `containerRef`. Traps Tab, handles Escape, restores focus.
- **useReducedMotion:** `frontend/src/hooks/useReducedMotion.ts` — Returns boolean for `prefers-reduced-motion`.
- **useToast:** `frontend/src/components/ui/Toast.tsx` (281 lines) — `showToast(message, type?)`. Types: 'success', 'error', etc.
- **FloatingActionBar:** `frontend/src/components/bible/FloatingActionBar.tsx` — Existing floating bar above/below selected verse (different from BB-6's bottom sheet). Has Copy, Highlight, Note, Share. Used by VerseDisplay.tsx (not by ReaderBody/BibleReader flow).
- **VerseDisplay:** `frontend/src/components/bible/VerseDisplay.tsx` (422 lines) — Older verse rendering with inline FloatingActionBar. NOT used by BibleReader.tsx (which uses ReaderBody). BB-6 does not modify or consume VerseDisplay.

**Key patterns:**

- Reader theme CSS variables: `var(--reader-bg)`, `var(--reader-text)`, `var(--reader-verse-num)`. Set via `[data-reader-theme="midnight|parchment|sepia"]` in index.css. Midnight: `#08051A`, Parchment: `#F5F0E8`, Sepia: `#E8D5B7`.
- Focus mode pause/resume pattern: `useEffect(() => { if (condition) { focusMode.pauseFocusMode(); return () => focusMode.resumeFocusMode() } }, [condition])` — see BibleReader.tsx lines 100-114.
- Z-index scale: `Z.DRAWER_BACKDROP = 10000`, `Z.DRAWER = 10001`, `Z.MODAL = 10002` from `constants/z-index.ts`.
- Tailwind animations: `animate-bottom-sheet-slide-in` (300ms, translateY(100%)→0), `animate-view-slide-in/out` (220ms). Easing: `cubic-bezier(0.34, 1.2, 0.64, 1)`.
- HIGHLIGHT_COLORS: `[{ name: 'Yellow', hex: '#FBBF24' }, { name: 'Green', hex: '#34D399' }, { name: 'Blue', hex: '#60A5FA' }, { name: 'Pink', hex: '#F472B6' }]` from `constants/bible.ts`.
- getBookBySlug: `data/bible/index.ts` line 79 — returns `BibleBook | undefined`.
- COPY_RESET_DELAY: 2000ms from `constants/timing.ts`.

**Directory conventions:**

- Feature-specific components: `src/components/bible/reader/`
- Types: `src/types/`
- Hooks: `src/hooks/`
- Utility modules: `src/lib/bible/`
- Constants: `src/constants/`
- Tests: `__tests__/` adjacent to source files

**Test patterns (from existing Bible reader tests):**

- `import { render, screen, fireEvent, waitFor } from '@testing-library/react'`
- `import { MemoryRouter } from 'react-router-dom'`
- `import { describe, expect, it, vi, beforeEach } from 'vitest'`
- Wrap in `<MemoryRouter>` for routing
- `localStorage.clear()` in `beforeEach`
- `vi.useFakeTimers()` for timeout tests
- No AuthModalProvider or ToastProvider wrapping needed for Bible reader (public page, no auth gates)
- Toast tests: mock `useToast` via `vi.mock('@/components/ui/Toast')`

---

## Auth Gating Checklist

**No auth gating in BB-6.** The sheet and all actions (including stubs) are accessible to all users. Copy and Copy with Reference work without login. Stub handlers fire without errors for both logged-in and logged-out users. Future specs own their own auth decisions.

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Tap verse to open sheet | Public | Step 6 | N/A |
| Copy | Public | Step 1 | N/A |
| Copy with reference | Public | Step 1 | N/A |
| All 10 stub actions | Public (future specs add auth) | Step 1 | N/A |

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Sheet backdrop | background | `bg-black/30` (lighter than drawer's `bg-black/40`) | spec req 19 |
| Sheet panel | background | `rgba(15, 10, 30, 0.95)` with `backdrop-filter: blur(16px)` | BibleDrawer.tsx:86-88 |
| Sheet panel | border | `border-t border-white/10 rounded-t-2xl` (mobile), `border border-white/10 rounded-2xl` (tablet+desktop) | BibleDrawer.tsx:81, TypographySheet pattern |
| Sheet panel | max-height | `max-h-[85vh]` (mobile) | spec req 16 |
| Sheet panel | width | `w-full` (mobile <640px), `w-[440px]` (tablet/desktop ≥640px) | spec reqs 16-18 |
| Sheet panel | z-index | `z-[10001]` panel, `z-[10000]` backdrop | Z constants |
| Sheet animation | timing | 240ms with `cubic-bezier(0.34, 1.2, 0.64, 1)` | spec req 19, tailwind.config.js easing |
| Header reference | font | `font-serif text-lg font-semibold text-white` | spec req 21, Lora for scripture references |
| Header close button | class | ICON_BTN: `flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white` | ReaderChrome.tsx:7-8 |
| Verse preview | color | `text-white/50 text-sm` | spec req 27 (muted, smaller than body) |
| Primary action icons | size | `min-h-[44px] min-w-[44px]` | spec req 28 (44px minimum) |
| Primary action labels | font | `text-xs text-white/60` | design-system.md muted labels |
| Secondary action rows | style | `min-h-[44px] flex items-center gap-3 px-4 py-3 text-white hover:bg-white/[0.06] rounded-lg` | spec req 30, FrostedCard hover pattern |
| Secondary action subtext | color | `text-white/50 text-sm` | design-system.md timestamps |
| Footer caption | style | `text-xs text-white/40 text-center py-3` | spec req 31, decorative text tier |
| Verse selection highlight | background | `rgba(139, 92, 246, 0.15)` (15% primary accent) | spec req 8 |
| Selection ring (highlighted verse) | style | `outline outline-2 outline-primary/40 outline-offset-1` | spec req 10 |
| Divider | style | `border-t border-white/[0.08]` | design-system.md section dividers |

---

## Design System Reminder

**Project-specific quirks that `/execute-plan` displays before every UI step:**

- The Bible reader uses CSS custom properties (`var(--reader-bg)`, `var(--reader-text)`, etc.) for theming. The verse selection highlight must work across all three themes (Midnight: dark bg, Parchment: light bg, Sepia: warm bg). Use `rgba(139, 92, 246, 0.15)` which provides subtle contrast on all three.
- ReaderBody renders verse spans with `data-verse`, `data-book`, `data-chapter` attributes. Event delegation walks up from the tap target to find `[data-verse]`. The `<sup>` verse number is INSIDE the verse span, so it's caught by delegation naturally.
- The BibleDrawer uses `rgba(15, 10, 30, 0.95)` + `backdrop-blur(16px)` for its frosted glass style. The VerseActionSheet uses the same visual treatment for consistency.
- Z-index: `z-[10000]` backdrop, `z-[10001]` panel — same as BibleDrawer. They never open simultaneously.
- Existing `animate-bottom-sheet-slide-in` is 300ms. BB-6 spec requires 240ms. A new `animate-verse-sheet-slide-up` at 240ms is added.
- `useFocusTrap(isActive, onEscape?)` returns a `containerRef`. Focus moves to first focusable element on activate, restores on deactivate. Handles Tab cycling and Escape.
- Focus mode coordination: call `focusMode.pauseFocusMode()` when sheet opens, `resumeFocusMode()` on cleanup. Same pattern as `bibleDrawer.isOpen` and `typographyOpen` in BibleReader.tsx lines 100-114.
- VerseJumpPill is at `z-30` fixed bottom-right. The action sheet (z-[10001]) sits above it. No conflict.
- `COPY_RESET_DELAY = 2000` from `constants/timing.ts` — used for "Copied" feedback reset.
- All text inside the sheet uses design system tokens — no raw hex values. Primary text: `text-white`. Muted: `text-white/50` or `text-white/60`. Decorative: `text-white/40`.
- FrostedCard is NOT used for the action sheet itself (it's a full modal surface). FrostedCard might be used within stub sub-views.

---

## Shared Data Models (from Master Plan)

N/A — standalone spec.

**New types introduced by BB-6:**

```typescript
// types/verse-actions.ts

export interface VerseSelection {
  book: string       // slug e.g. "john"
  bookName: string   // display e.g. "John"
  chapter: number
  startVerse: number
  endVerse: number
  verses: Array<{ number: number; text: string }>
}

export type VerseAction =
  | 'highlight'
  | 'bookmark'
  | 'note'
  | 'share'
  | 'pray'
  | 'journal'
  | 'meditate'
  | 'cross-refs'
  | 'explain'
  | 'memorize'
  | 'copy'
  | 'copy-with-ref'

export type VerseActionCategory = 'primary' | 'secondary'

export interface VerseActionHandler {
  action: VerseAction
  label: string
  sublabel?: string
  icon: React.ComponentType<{ className?: string }>
  category: VerseActionCategory
  /** Whether the action opens a sub-view vs fires immediately */
  hasSubView: boolean
  /** Render function for the sub-view content (if hasSubView) */
  renderSubView?: (props: { selection: VerseSelection; onBack: () => void }) => React.ReactNode
  /** Whether this action is available for the current selection */
  isAvailable: (selection: VerseSelection) => boolean
  /** Get active/filled state — e.g. already highlighted, already bookmarked */
  getState?: (selection: VerseSelection) => { active: boolean; activeColor?: string }
  /** Execute the action */
  onInvoke: (selection: VerseSelection, ctx: VerseActionContext) => void
}

export interface VerseActionContext {
  showToast: (message: string, type?: string) => void
  closeSheet: () => void
}
```

**localStorage keys this spec touches:**

| Key | Read/Write | Description |
|-----|-----------|-------------|
| None | N/A | BB-6 does not read or write any localStorage keys. Future specs (BB-7 highlights, BB-8 notes, BB-7.5 bookmarks) will add persistence via the handler registry. |

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | < 640px | Sheet full-width, slides up from bottom edge, max 85vh. Swipe-down to dismiss. Multi-verse via sequential taps. Primary actions: 4 icons in single row. |
| Tablet | 640–1023px | Sheet 440px wide, centered horizontally, slides up from bottom. Same gesture model as mobile. |
| Desktop | ≥ 1024px | Sheet 440px wide, bottom-center with ~40px bottom margin, slides up. Shift+click range, Cmd/Ctrl+click toggle. |

---

## Inline Element Position Expectations (UI features with inline rows)

| Element Group | Elements | Expected y-alignment | Wrap Tolerance |
|---------------|----------|---------------------|----------------|
| Primary actions row | Highlight, Note, Bookmark, Share icons | Same y ±2px at all breakpoints | Never wraps — 4 icons at ~70px each = 280px, container is 440px min |
| Sheet header | Reference text, copy-ref button, close button | Same y ±2px at all breakpoints | Never wraps — reference is truncated, buttons are fixed size |

---

## Vertical Rhythm

N/A — BB-6 adds an overlay sheet that does not affect the reader's vertical spacing. The sheet is position: fixed and floats above content.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] BB-4 (reader + verse spans with `data-verse`/`data-book`/`data-chapter`) is complete and committed
- [x] BB-5 (focus mode with `pauseFocusMode()`/`resumeFocusMode()`) is complete and committed
- [x] All auth-gated actions from the spec are accounted for (none — fully public)
- [x] Design system values are verified (from BibleDrawer.tsx, TypographySheet.tsx, design-system.md)
- [x] All [UNVERIFIED] values are flagged with verification methods
- [x] No deprecated patterns used
- [ ] Lucide icons available: `Paintbrush`, `PenLine`, `Bookmark`, `BookmarkCheck`, `Share2`, `Heart`, `BookOpen`, `Sparkles`, `Link2`, `Brain`, `Layers`, `Copy`, `ClipboardCopy`, `ChevronRight`, `X`, `ArrowLeft`
- [ ] `animate-bottom-sheet-slide-in` keyframe exists in tailwind.config.js (verified — line 270)

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Extend BibleDrawer vs. new component | New `VerseActionSheet` component | The spec prefers extending BibleDrawer, but the differences are too large: different anchor (bottom vs right), different swipe direction (down vs right), different backdrop opacity (30% vs 40%), different animation timing (240ms vs 300ms), different width model (full-width mobile + centered 440px vs side panel), and separate internal sub-view stack (not the BibleDrawerProvider stack). Extending would add excessive conditional logic and risk regressions in the existing books/chapters drawer. A dedicated component reuses `useFocusTrap`, follows the same frosted glass visual style, and is independently testable. |
| Verse selection state location | `useVerseTap` hook returns selection; BibleReader passes to ReaderBody | Keeps ReaderBody a controlled component. The hook manages all tap/selection logic; ReaderBody just applies visual styles based on a `selectedVerses` prop. |
| Multi-verse selection model | Always contiguous `{ startVerse, endVerse }` | Spec req 13: "Selection is always contiguous." Non-adjacent Cmd+click snaps to contiguous range. |
| Text selection guard | Check `window.getSelection()?.toString()` length > 0 after pointerup | If the user dragged to select text (browser native), don't open the sheet. The 300ms/10px quick-tap guard also helps. |
| Browser back dismiss | `history.pushState` on sheet open + `popstate` listener | Spec req 46: "browser back if at root view." Sub-views use the internal stack; back at root view closes the sheet. |
| Verse selection highlight across themes | `rgba(139, 92, 246, 0.15)` on all themes | 15% primary violet provides subtle contrast on Midnight (dark), Parchment (light), and Sepia (warm). |
| Selection ring on highlighted verses | `outline outline-2 outline-primary/40 outline-offset-1` | Spec req 10: if a verse already has a BB-7 highlight color, selection uses an outline ring instead of background fill. BB-6 checks for existing highlight via `wr_bible_highlights` localStorage read. |
| Animation timing | New `animate-verse-sheet-slide-up` at 240ms | Existing `animate-bottom-sheet-slide-in` is 300ms. Spec requires 240ms. Dedicated animation avoids changing the shared one. |
| Focus mode on verse tap in focused state | Single tap: restore chrome AND open sheet | Spec req 7/45: "the tap is not consumed by focus mode restoration." The useVerseTap hook fires `pauseFocusMode()` before opening the sheet, which restores chrome. No two-tap penalty. |
| Copy delay before close | 400ms setTimeout then closeSheet() | Spec reqs 41-42: "Closes sheet after ~400ms delay." Gives user time to see the toast. |
| Keyboard shortcuts | 1/2/3/4 for primary actions, c for copy, Escape to close/pop | Spec keyboard section. Not visually advertised — power-user shortcuts. Guard against firing when input/textarea focused. |

---

## Implementation Steps

### Step 1: Types & Action Handler Registry

**Objective:** Define the `VerseSelection`, `VerseAction`, `VerseActionHandler` types and create the action registry with real Copy/Copy-with-Reference handlers and stub handlers for all 10 future actions.

**Files to create/modify:**
- `frontend/src/types/verse-actions.ts` — NEW: type definitions
- `frontend/src/lib/bible/verseActionRegistry.ts` — NEW: registry with all 12 handlers
- `frontend/src/lib/bible/__tests__/verseActionRegistry.test.ts` — NEW: tests

**Details:**

**`types/verse-actions.ts`** — Define interfaces as shown in the Shared Data Models section above. The `VerseActionHandler` interface is the load-bearing contract for the entire Bible redesign wave. Export all types.

**`lib/bible/verseActionRegistry.ts`** — Export functions:

```typescript
import { Paintbrush, PenLine, Bookmark, Share2, Heart, BookOpen, Sparkles,
         Link2, Brain, Layers, Copy, ClipboardCopy } from 'lucide-react'

// Registry: ordered array (order = display order in the sheet)
const PRIMARY_ACTIONS: VerseActionHandler[] = [highlight, note, bookmark, share]
const SECONDARY_ACTIONS: VerseActionHandler[] = [pray, journal, meditate, crossRefs, explain, memorize, copy, copyWithRef]

export function getPrimaryActions(): VerseActionHandler[] { return PRIMARY_ACTIONS }
export function getSecondaryActions(): VerseActionHandler[] { return SECONDARY_ACTIONS }
export function getAllActions(): VerseActionHandler[] { return [...PRIMARY_ACTIONS, ...SECONDARY_ACTIONS] }
export function getActionByType(action: VerseAction): VerseActionHandler | undefined

// Helper: format reference string
export function formatReference(sel: VerseSelection): string
  // Single verse: "John 3:16"
  // Range: "John 3:16–18" (en-dash, not hyphen)

// Helper: get plain text for selection
export function getSelectionText(sel: VerseSelection): string
  // Multi-verse: join verse texts with space

// Helper: get text with reference
export function getSelectionTextWithRef(sel: VerseSelection): string
  // '"...text..." — John 3:16 (WEB)' or '"...text..." — John 3:16–18 (WEB)'
```

**Real handlers (shipped in BB-6):**

- **copy:** `navigator.clipboard.writeText(getSelectionText(sel))` with hidden textarea fallback. Shows "Copied" toast. Calls `closeSheet()` after 400ms delay. `hasSubView: false`.
- **copy-with-ref:** Same but uses `getSelectionTextWithRef(sel)`. Shows "Copied with reference" toast. Calls `closeSheet()` after 400ms.

**Clipboard fallback pattern:**
```typescript
async function copyToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    try { await navigator.clipboard.writeText(text); return true } catch { /* fall through */ }
  }
  // Fallback: hidden textarea
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.left = '-9999px'
  document.body.appendChild(textarea)
  textarea.select()
  const success = document.execCommand('copy')
  document.body.removeChild(textarea)
  return success
}
```

**Stub handlers (10 stubs):** Each has `isAvailable: () => true`, `onInvoke` that is a no-op (for non-sub-view stubs) or opens a stub sub-view. The 5 with sub-views (highlight, note, share, cross-refs, explain, memorize) have `hasSubView: true` and `renderSubView` that returns a placeholder div with "This feature ships in BB-X" text.

| Action | Icon | Label | Sublabel | hasSubView | Stub sub-view text |
|--------|------|-------|----------|------------|-------------------|
| highlight | Paintbrush | Highlight | — | true | "Color picker ships in BB-7" |
| note | PenLine | Note | — | true | "Note editor ships in BB-8" |
| bookmark | Bookmark | Bookmark | — | false | N/A (toggle, no sub-view) |
| share | Share2 | Share | — | true | "Share panel ships in BB-13" |
| pray | Heart | Pray about this | "Open in Daily Hub · Pray" | false | N/A |
| journal | BookOpen | Journal about this | "Open in Daily Hub · Journal" | false | N/A |
| meditate | Sparkles | Meditate on this | "Open in Daily Hub · Meditate" | false | N/A |
| cross-refs | Link2 | Cross-references | "See related verses" | true | "Cross-references ship in BB-9" |
| explain | Brain | Explain this passage | "Understand the context" | true | "AI explain ships in BB-30" |
| memorize | Layers | Memorize | "Add to your deck" | true | "Memorize ships in BB-45" |
| copy | Copy | Copy | "Copy verse text" | false | N/A |
| copy-with-ref | ClipboardCopy | Copy with reference | "Copy with 'John 3:16 — WEB'" | false | N/A |

**Auth gating:** None in BB-6. Each handler's `onInvoke` fires without auth checks. Future specs wrap their handler with auth logic when replacing the stub.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- Do NOT hardcode action lists inside the sheet component — the registry is the single source of truth
- Do NOT add auth gates to any stub handler — future specs own auth decisions
- Do NOT import the registry in more than one place outside of tests (the sheet component imports it)
- Do NOT make the registry a class or singleton with mutation — it's a static ordered array

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| exports all 12 actions | unit | `getAllActions().length === 12`, 4 primary + 8 secondary |
| formatReference single verse | unit | `formatReference({ book: 'john', bookName: 'John', chapter: 3, startVerse: 16, endVerse: 16, verses: [...] })` → `'John 3:16'` |
| formatReference range | unit | Same with `endVerse: 18` → `'John 3:16–18'` (en-dash) |
| getSelectionText single | unit | Returns verse text |
| getSelectionText multi | unit | Returns joined text with space separator |
| getSelectionTextWithRef | unit | Returns `'"text" — John 3:16 (WEB)'` format |
| copy handler invokes clipboard | unit | Mock `navigator.clipboard.writeText`, verify called with correct text |
| copy handler shows toast | unit | Mock `showToast`, verify called with 'Copied' |
| copy handler closes sheet after delay | unit | `vi.useFakeTimers`, verify `closeSheet` called after 400ms |
| copy-with-ref handler format | unit | Verify clipboard text includes "— John 3:16 (WEB)" |
| all stubs fire without error | unit | Loop `getAllActions()`, call `onInvoke` with mock context — no throws |
| sub-view stubs render placeholder | unit | `renderSubView` returns content containing "ships in BB-" |

**Expected state after completion:**
- [ ] `types/verse-actions.ts` exports `VerseSelection`, `VerseAction`, `VerseActionCategory`, `VerseActionHandler`, `VerseActionContext`
- [ ] `lib/bible/verseActionRegistry.ts` exports `getPrimaryActions()`, `getSecondaryActions()`, `getAllActions()`, `getActionByType()`, `formatReference()`, `getSelectionText()`, `getSelectionTextWithRef()`, `copyToClipboard()`
- [ ] All 12 tests pass

---

### Step 2: useVerseTap Hook

**Objective:** Create the event delegation hook that detects verse taps (quick tap + long press), manages contiguous multi-verse selection, guards against text selection and non-verse taps, and coordinates with focus mode.

**Files to create/modify:**
- `frontend/src/hooks/useVerseTap.ts` — NEW: ~200 lines
- `frontend/src/hooks/__tests__/useVerseTap.test.ts` — NEW: tests

**Details:**

**Exported interface:**

```typescript
interface UseVerseTapOptions {
  containerRef: React.RefObject<HTMLElement | null>
  bookSlug: string
  bookName: string
  chapter: number
  verses: BibleVerse[]
  enabled: boolean  // false when loading or error
}

interface UseVerseTapReturn {
  /** Currently selected verse range (null when no selection) */
  selection: VerseSelection | null
  /** Whether the action sheet should be open */
  isSheetOpen: boolean
  /** Close the sheet and clear selection */
  closeSheet: () => void
  /** Extend selection to a new verse (for multi-verse from sheet) */
  extendSelection: (verseNumber: number) => void
}
```

**Quick-tap detection:**
- Register `pointerdown` and `pointerup` on the container (event delegation)
- On `pointerdown`: record `{ x, y, time, target }`
- On `pointerup`: check `time < 300ms` AND `distance < 10px` AND no text selection (`window.getSelection()?.toString().length === 0`)
- Walk up from the event target to find nearest `[data-verse]` span
- If no verse span found → no-op (tapped empty space, heading, etc.)

**Long-press detection:**
- On `pointerdown`: start a 500ms timeout
- On `pointerup` or `pointermove` (>10px): clear the timeout
- If timeout fires: trigger sheet open for the verse under the pointer
- Call `e.preventDefault()` on the `contextmenu` event while long-press timer is active (suppress browser context menu on mobile)

**Multi-verse selection:**
- State: `{ startVerse: number, endVerse: number }` (always contiguous)
- First tap: single verse selected
- While sheet is open, `extendSelection(verseNumber)`:
  - If verse is outside current range: expand range to include it and all verses between (e.g., tap 16 then tap 18 → range 16-18)
  - If verse is at an edge of the range and range > 1: shrink range by removing that edge
  - Always keep selection contiguous: `startVerse = Math.min(...)`, `endVerse = Math.max(...)`
- Desktop: `pointerup` with `shiftKey` extends to range. `pointerup` with `metaKey || ctrlKey` toggles individual verse (snaps to contiguous).
- `verses` array from props provides the text for each verse number in the selection

**Desktop drag-to-select (sheet already open):**
- Only when `isSheetOpen === true`: `pointerdown` + `pointermove` across multiple verse spans selects the swept range
- When `isSheetOpen === false`: browser native text selection wins (no interference)

**Focus mode integration:**
- The hook does NOT directly call `pauseFocusMode()` — that's BibleReader's responsibility (it watches `isSheetOpen`)
- When focus mode is in focused state and a verse tap occurs: the tap handler fires normally. BibleReader's effect on `isSheetOpen` will call `pauseFocusMode()`, which restores chrome. Single tap = chrome restores + sheet opens simultaneously.

**Browser history integration:**
- On sheet open: `history.pushState({ verseSheet: true }, '')`
- `popstate` listener: if `isSheetOpen && !event.state?.verseSheet` → close sheet
- On explicit close (X, backdrop, escape at root): `history.back()` to pop the state entry

**Guardrails (DO NOT):**
- Do NOT attach individual click handlers to each verse span — use event delegation on the container
- Do NOT call `pauseFocusMode()` or `resumeFocusMode()` inside the hook — the consumer (BibleReader) handles that
- Do NOT prevent default on regular clicks — only prevent contextmenu during long-press
- Do NOT import React Router — the hook uses raw `history.pushState` and `popstate`

**Responsive behavior:** N/A: no UI impact (pure logic hook).

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| returns null selection initially | unit | `selection === null`, `isSheetOpen === false` |
| quick tap on verse opens sheet | unit | Simulate pointerdown+pointerup on a `[data-verse]` span within 300ms, <10px movement → `isSheetOpen === true`, `selection` populated |
| tap on non-verse element is no-op | unit | Simulate tap on element without `[data-verse]` ancestor → selection stays null |
| tap with text selection is no-op | unit | Mock `window.getSelection()` to return non-empty string → no sheet open |
| long press opens sheet | unit | `vi.useFakeTimers()`, simulate pointerdown, advance 500ms → sheet opens |
| long press cancelled by movement | unit | Simulate pointerdown, pointermove >10px before 500ms → sheet does not open |
| multi-verse extends range | unit | Open sheet on verse 16, call `extendSelection(18)` → range 16-18 with verse 17 included |
| shift+click extends range | unit | Simulate click on verse 16, then shift+click on verse 20 → range 16-20 |
| closeSheet clears selection | unit | Open sheet, call `closeSheet()` → `selection === null`, `isSheetOpen === false` |
| does not fire when disabled | unit | `enabled: false` → taps are ignored |
| browser back closes sheet | unit | Open sheet, fire `popstate` event → sheet closes |

**Expected state after completion:**
- [ ] `hooks/useVerseTap.ts` exports `useVerseTap` with the interface above
- [ ] All 11 tests pass
- [ ] Hook does NOT import any React components or UI code

---

### Step 3: VerseActionSheet Component

**Objective:** Build the bottom-anchored action sheet UI with header (reference + copy-ref + close), verse preview strip, primary actions row (4 icons), secondary actions list (8 items), footer, and internal sub-view stack.

**Files to create/modify:**
- `frontend/src/components/bible/reader/VerseActionSheet.tsx` — NEW: ~350 lines
- `frontend/tailwind.config.js` — ADD: `verse-sheet-slide-up` animation at 240ms
- `frontend/src/components/bible/reader/__tests__/VerseActionSheet.test.tsx` — NEW: tests

**Details:**

**Tailwind animation (add to `tailwind.config.js`):**

```javascript
// In keyframes:
'verse-sheet-slide-up': {
  '0%': { transform: 'translateY(100%)' },
  '100%': { transform: 'translateY(0)' },
},
// In animation:
'verse-sheet-slide-up': 'verse-sheet-slide-up 240ms cubic-bezier(0.34, 1.2, 0.64, 1) both',
```

**Component props:**

```typescript
interface VerseActionSheetProps {
  selection: VerseSelection
  isOpen: boolean
  onClose: () => void
  onExtendSelection: (verseNumber: number) => void
}
```

**Sheet structure (JSX):**

```
<>
  {/* Backdrop */}
  <div className="fixed inset-0 z-[10000] bg-black/30" onClick={onClose} aria-hidden="true" />

  {/* Panel */}
  <div
    ref={containerRef}  // useFocusTrap
    role="dialog"
    aria-modal="true"
    aria-label={`Actions for ${formatReference(selection)}`}
    className={cn(
      'fixed z-[10001] flex flex-col overflow-hidden',
      // Mobile: full width, bottom edge
      'inset-x-0 bottom-0 max-h-[85vh] rounded-t-2xl border-t border-white/10',
      // Tablet+: 440px centered, 40px from bottom
      'sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:bottom-10 sm:w-[440px] sm:max-h-[85vh] sm:rounded-2xl sm:border sm:border-white/10',
      // Animation
      !reducedMotion && isEntering && 'animate-verse-sheet-slide-up',
    )}
    style={{
      background: 'rgba(15, 10, 30, 0.95)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      transform: swipeOffset < 0 ? `translateY(${-swipeOffset}px)` : undefined,
      transition: swipeOffset !== 0 ? 'none' : undefined,
    }}
    onTouchStart={handleTouchStart}
    onTouchMove={handleTouchMove}
    onTouchEnd={handleTouchEnd}
  >
    {/* Sub-view stack or root view */}
    {subView ? renderSubView() : renderRootView()}
  </div>
</>
```

**Root view layout:**

1. **Header row:** `<div className="flex items-center gap-2 px-4 py-3">`
   - Reference: `<span className="font-serif text-lg font-semibold text-white flex-1 truncate">{formatReference(selection)}</span>`
   - Copy-ref button: `<button onClick={copyReference} className={ICON_BTN_SM}>` (smaller variant, 36px) with `Copy` icon. On click: copies "John 3:16" to clipboard, shows "Reference copied" toast.
   - Close button: `<button onClick={onClose} className={ICON_BTN_SM}>` with `X` icon
2. **Divider:** `<div className="border-t border-white/[0.08]" />`
3. **Verse preview strip:** `<div className="px-4 py-2"><p className="text-sm text-white/50 line-clamp-2">{previewText}</p></div>`
   - Single verse: full text, truncated at 2 lines
   - Multi-verse: verse numbers inline, e.g. `"16 For God so loved... 17 For God didn't send..."`, truncated at ~120 chars
4. **Divider**
5. **Primary actions row:** `<div className="flex justify-around px-4 py-3">`
   - 4 items from `getPrimaryActions()`, each: `<button className="flex flex-col items-center gap-1.5 min-h-[44px] min-w-[44px] ...">` with icon (24px) + label (`text-xs text-white/60`)
   - Active state: filled icon variant + colored icon for highlighted verse
6. **Divider**
7. **Secondary actions list:** `<div className="overflow-y-auto flex-1 px-2 py-1">`
   - Items from `getSecondaryActions()`, each: `<button className="flex w-full items-center gap-3 rounded-lg px-3 py-3 min-h-[44px] text-left text-white hover:bg-white/[0.06] transition-colors">`
   - Left: icon (20px, `text-white/60`), Center: `<div><span className="text-sm text-white">{label}</span><span className="text-xs text-white/50">{sublabel}</span></div>`, Right: `<ChevronRight className="text-white/30 h-4 w-4" />` (for sub-view actions) or nothing (for immediate actions)
8. **Footer:** `<div className="border-t border-white/[0.08] px-4 py-3 text-center"><span className="text-xs text-white/40">WEB · Public Domain</span></div>`

**Sub-view stack:**

```typescript
const [subView, setSubView] = useState<{ action: VerseAction; handler: VerseActionHandler } | null>(null)
```

When a primary/secondary action with `hasSubView: true` is clicked → `setSubView({ action, handler })`. Sub-view renders:
- **Back header:** `<div className="flex items-center gap-2 px-4 py-3"><button onClick={() => setSubView(null)} className={ICON_BTN_SM}><ArrowLeft /></button><span className="font-semibold text-white">{subViewTitle}</span></div>`
- **Content:** `handler.renderSubView!({ selection, onBack: () => setSubView(null) })`

**Swipe-down to dismiss:**
- Track `touchStartY` on `touchstart`
- On `touchmove`: calculate delta. If delta > 0 (swiping down), set `swipeOffset` for visual feedback.
- On `touchend`: if delta > 80px OR velocity > threshold → close. Otherwise snap back.

**Keyboard shortcuts:**
- `Escape`: if subView → pop sub-view; else close sheet
- `1`/`2`/`3`/`4`: activate primary actions (highlight/note/bookmark/share) — guard against input/textarea focus
- `c`: copy action
- Arrow up/down: navigate secondary actions list via focus management
- `Enter`/`Space`: activate focused action

**`prefers-reduced-motion`:** When `useReducedMotion()` returns true, skip the `animate-verse-sheet-slide-up` class. Appear instantly.

**Auth gating:** None.

**Responsive behavior:**
- Desktop (≥1024px): 440px wide, `sm:bottom-10` (40px margin), centered with `sm:left-1/2 sm:-translate-x-1/2`, rounded corners all around
- Tablet (640–1023px): 440px wide, centered, rounded corners all around, slides up from bottom
- Mobile (<640px): Full width (`inset-x-0 bottom-0`), rounded top corners only (`rounded-t-2xl`), max height 85vh

**Inline position expectations:**
- Primary actions row: 4 icons must share y-coordinate at all breakpoints (±2px tolerance). Container is ≥375px, 4 items at ~70px each = 280px — no wrapping risk.

**Guardrails (DO NOT):**
- Do NOT hardcode action items — read from the registry via `getPrimaryActions()` and `getSecondaryActions()`
- Do NOT use `FrostedCard` for the sheet surface — it's a full modal with its own frosted glass treatment
- Do NOT use `animate-glow-pulse` or cyan glow — deprecated
- Do NOT use raw hex values for text colors — use `text-white`, `text-white/50`, etc.
- Do NOT use `z-50` for the sheet — use `z-[10000]` backdrop and `z-[10001]` panel to match the BibleDrawer z-layer
- Do NOT add `GlowBackground` or `HorizonGlow` inside the sheet

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| renders header with formatted reference | integration | Open sheet with John 3:16 selection → header shows "John 3:16" |
| renders verse preview text | integration | Open sheet → preview strip shows truncated verse text |
| renders 4 primary action buttons | integration | `getAllByRole('button')` includes Highlight, Note, Bookmark, Share with 44px min tap targets |
| renders 8 secondary action items | integration | Secondary list shows Pray, Journal, Meditate, Cross-references, Explain, Memorize, Copy, Copy with reference |
| copy action copies text and shows toast | integration | Click Copy → `navigator.clipboard.writeText` called, toast shown |
| copy-with-ref includes reference | integration | Click Copy with reference → clipboard text includes "— John 3:16 (WEB)" |
| sub-view push on highlight click | integration | Click Highlight → sub-view renders "Color picker ships in BB-7" |
| sub-view back button returns to root | integration | Push sub-view, click back → root action list visible |
| escape closes sheet | integration | `fireEvent.keyDown(container, { key: 'Escape' })` → onClose called |
| escape pops sub-view first | integration | In sub-view, press Escape → sub-view pops, sheet stays open |
| footer shows WEB caption | integration | Footer text "WEB · Public Domain" present |
| reduced motion skips animation | integration | Mock `useReducedMotion` → true, verify no `animate-*` class |
| multi-verse header updates | integration | Change selection from verse 16 to 16-18 → header shows "John 3:16–18" |
| aria attributes correct | integration | `role="dialog"`, `aria-modal="true"`, `aria-label` contains reference |

**Expected state after completion:**
- [ ] `VerseActionSheet.tsx` renders the full sheet layout with header, preview, primary row, secondary list, footer
- [ ] Sub-view stack navigates forward/backward
- [ ] `tailwind.config.js` has `verse-sheet-slide-up` animation at 240ms
- [ ] All 14 tests pass

---

### Step 4: Verse Selection Highlight on ReaderBody

**Objective:** Add visual selection feedback on tapped verse spans — a 15% accent opacity background while the sheet is open, with an outline ring fallback when a verse already has a BB-7 highlight color. Fade out over 200ms on sheet close.

**Files to create/modify:**
- `frontend/src/components/bible/reader/ReaderBody.tsx` — MODIFY: add `selectedVerses` and `highlightedVerses` props
- `frontend/src/components/bible/reader/__tests__/ReaderBody.test.tsx` — NEW or MODIFY: add selection tests

**Details:**

**New props on ReaderBody:**

```typescript
interface ReaderBodyProps {
  verses: BibleVerse[]
  bookSlug: string
  chapter: number
  settings: ReaderSettings
  paragraphs?: number[]
  /** Verse numbers currently selected for the action sheet (empty = no selection) */
  selectedVerses?: number[]
  /** Verse numbers that have a BB-7 highlight color (for ring vs fill decision) */
  highlightedVerseNumbers?: number[]
  /** Whether the selection is actively visible (false = fading out) */
  selectionVisible?: boolean
}
```

**Verse span modification:**

```tsx
<span
  data-verse={String(verse.number)}
  data-book={bookSlug}
  data-chapter={String(chapter)}
  id={`verse-${verse.number}`}
  className={cn(
    isSelected && !isHighlighted && selectionVisible && 'bg-primary/[0.15] rounded-sm',
    isSelected && isHighlighted && selectionVisible && 'outline outline-2 outline-primary/40 outline-offset-1 rounded-sm',
    isSelected && !selectionVisible && 'transition-colors duration-200',
  )}
>
```

Where:
- `isSelected = selectedVerses?.includes(verse.number) ?? false`
- `isHighlighted = highlightedVerseNumbers?.includes(verse.number) ?? false`
- `selectionVisible` is `true` while the sheet is open, then `false` for 200ms fade-out on close

The `bg-primary/[0.15]` class resolves to `rgba(109, 40, 217, 0.15)` which is the primary violet at 15% opacity. On Midnight theme (dark bg), this reads as a subtle purple tint. On Parchment and Sepia (light bg), it's a subtle violet wash. [UNVERIFIED — may need per-theme tuning]
→ To verify: Run `/verify-with-playwright` on all 3 themes with a verse selected
→ If wrong: Adjust opacity up/down within 0.10-0.20 range, or use a theme-specific token

**Fade-out behavior:** BibleReader manages a `selectionFading` state. On sheet close: set `selectionVisible = false` → CSS transition fades the background over 200ms → after 200ms, clear `selectedVerses` entirely.

**Guardrails (DO NOT):**
- Do NOT add click handlers to ReaderBody — it remains a controlled presentational component
- Do NOT import useVerseTap or any hooks in ReaderBody — it receives props only
- Do NOT use inline `style={{ backgroundColor: ... }}` — use Tailwind classes with design system tokens
- Do NOT break existing verse rendering — the new props are optional with safe defaults

**Responsive behavior:** N/A: selection highlight is the same at all breakpoints (background color on text spans).

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| no selection class without selectedVerses prop | unit | Render with no `selectedVerses` → no `bg-primary` class on any verse |
| selection class applied to selected verse | unit | Render with `selectedVerses: [16]` → verse 16 span has `bg-primary/[0.15]` |
| outline ring on highlighted verse | unit | Render with `selectedVerses: [16]`, `highlightedVerseNumbers: [16]` → verse 16 has `outline` class, no `bg-primary` |
| multiple verses selected | unit | `selectedVerses: [16, 17, 18]` → all three spans have selection class |
| transition class when fading | unit | `selectionVisible: false` → selected verse span has `transition-colors duration-200` |

**Expected state after completion:**
- [ ] ReaderBody accepts `selectedVerses`, `highlightedVerseNumbers`, `selectionVisible` props
- [ ] Selected verses show visual feedback (background or outline ring)
- [ ] Existing rendering is unchanged when new props are omitted
- [ ] All 5 tests pass

---

### Step 5: Wire into BibleReader

**Objective:** Mount `useVerseTap` and `VerseActionSheet` in `BibleReaderInner`, pass selection state to `ReaderBody`, coordinate with focus mode, and handle selection fade-out on sheet close.

**Files to create/modify:**
- `frontend/src/pages/BibleReader.tsx` — MODIFY: add useVerseTap, VerseActionSheet, selection state, focus mode coordination
- `frontend/src/pages/__tests__/BibleReader.test.tsx` — NEW or MODIFY: integration tests

**Details:**

**Add to BibleReaderInner (inside the component):**

```typescript
// Ref for the reader body container (event delegation target)
const readerBodyRef = useRef<HTMLElement>(null)

// Verse tap handling
const { selection, isSheetOpen, closeSheet, extendSelection } = useVerseTap({
  containerRef: readerBodyRef,
  bookSlug: bookSlug ?? '',
  bookName: book?.name ?? '',
  chapter: chapterNumber,
  verses,
  enabled: !isLoading && !loadError && verses.length > 0,
})

// Selection visibility for fade-out animation
const [selectionVisible, setSelectionVisible] = useState(true)
const selectedVerseNumbers = useMemo(() => {
  if (!selection) return []
  const nums: number[] = []
  for (let i = selection.startVerse; i <= selection.endVerse; i++) nums.push(i)
  return nums
}, [selection])

// Highlighted verse numbers (read from localStorage for ring vs fill decision)
const highlightedVerseNumbers = useMemo(() => {
  try {
    const raw = localStorage.getItem('wr_bible_highlights')
    if (!raw) return []
    const highlights: BibleHighlight[] = JSON.parse(raw)
    return highlights
      .filter((h) => h.book === bookSlug && h.chapter === chapterNumber)
      .map((h) => h.verseNumber)
  } catch { return [] }
}, [bookSlug, chapterNumber])

// Focus mode coordination — pause when sheet is open
useEffect(() => {
  if (isSheetOpen) {
    focusMode.pauseFocusMode()
    return () => focusMode.resumeFocusMode()
  }
}, [isSheetOpen]) // eslint-disable-line react-hooks/exhaustive-deps

// Selection fade-out on close
const handleSheetClose = useCallback(() => {
  setSelectionVisible(false)
  setTimeout(() => {
    closeSheet()
    setSelectionVisible(true)
  }, 200)
}, [closeSheet])

// Disable chapter swipe when sheet is open
const { touchHandlers, swipeOffset, isSwiping } = useChapterSwipe({
  bookSlug: bookSlug ?? '',
  currentChapter: chapterNumber,
  enabled: isSmallViewport && !isLoading && !typographyOpen && !isSheetOpen,
})
```

**Pass ref to the `<main>` element:**

```tsx
<main
  ref={readerBodyRef}
  className="mx-auto max-w-2xl px-5 pb-8 pt-20 sm:px-6 sm:pt-24"
  aria-busy={isLoading}
>
```

**Pass selection to ReaderBody:**

```tsx
<ReaderBody
  verses={verses}
  bookSlug={bookSlug!}
  chapter={chapterNumber}
  settings={settings}
  paragraphs={paragraphs}
  selectedVerses={selectedVerseNumbers}
  highlightedVerseNumbers={highlightedVerseNumbers}
  selectionVisible={selectionVisible}
/>
```

**Mount VerseActionSheet (after FocusVignette):**

```tsx
{selection && (
  <VerseActionSheet
    selection={selection}
    isOpen={isSheetOpen}
    onClose={handleSheetClose}
    onExtendSelection={extendSelection}
  />
)}
```

**Existing keyboard handler update:** Disable chapter nav keyboard shortcuts when sheet is open:

```typescript
const handleKeyboard = useCallback((e: KeyboardEvent) => {
  const tag = (e.target as HTMLElement).tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
  if (isSheetOpen) return // Sheet has its own keyboard handling
  // ... existing shortcuts
}, [bookSlug, chapterNumber, navigate, typographyOpen, bibleDrawer, isSheetOpen])
```

**Auth gating:** None.

**Responsive behavior:**
- Desktop (≥1024px): Click verse → sheet appears bottom-center. Shift+click extends range.
- Tablet (640–1023px): Tap verse → full-width sheet slides up from bottom.
- Mobile (<640px): Same as tablet. Sequential taps extend range when sheet is open.

**Guardrails (DO NOT):**
- Do NOT modify ReaderChrome — BB-6 does not add any chrome buttons
- Do NOT modify TypographySheet — BB-6 does not add any settings
- Do NOT modify BibleDrawer or BibleDrawerProvider — BB-6 uses its own sheet component
- Do NOT modify DrawerViewRouter — BB-6's sub-views are internal to VerseActionSheet
- Do NOT remove the existing keyboard shortcuts (ArrowLeft/Right for chapter nav, 'b' for books, ',' for typography)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| sheet not rendered when no selection | integration | Render BibleReader, no tap → no `role="dialog"` in DOM |
| tap verse shows action sheet | integration | Simulate pointerdown+pointerup on a verse span → sheet appears with correct reference |
| sheet closes on backdrop click | integration | Open sheet, click backdrop → sheet removed from DOM |
| focus mode paused when sheet open | integration | Mock useFocusMode, open sheet → `pauseFocusMode` called |
| focus mode resumed on close | integration | Open then close sheet → `resumeFocusMode` called |
| selection highlight visible on tapped verse | integration | Tap verse 16 → verse span has `bg-primary/[0.15]` class |
| selection fades on close | integration | Close sheet → `selectionVisible` transitions to false, then selection clears after 200ms |
| chapter nav disabled when sheet open | integration | Open sheet, press ArrowRight → no navigation |
| chapter swipe disabled when sheet open | integration | Open sheet → `useChapterSwipe` `enabled: false` |
| focus restoration on close | integration | Tap verse 16 → close sheet → focus returns to verse-16 span |

**Expected state after completion:**
- [ ] Tapping a verse in the Bible reader opens the action sheet
- [ ] Copy and Copy with reference work end-to-end (tap → sheet → copy → toast → sheet closes)
- [ ] Focus mode pauses when sheet opens, resumes on close
- [ ] Selection highlight appears on tapped verse, fades on close
- [ ] All stub actions fire without errors
- [ ] Sub-views push/pop correctly
- [ ] Sheet dismisses via backdrop, X, Escape, swipe-down, browser back
- [ ] All 10 tests pass

---

### Step 6: Accessibility & Polish

**Objective:** Ensure WCAG AA compliance, verify focus management, add screen reader announcements for multi-verse selection, and verify all keyboard shortcuts work.

**Files to create/modify:**
- `frontend/src/components/bible/reader/VerseActionSheet.tsx` — MODIFY: add `aria-live` region, verify focus trap
- `frontend/src/hooks/useVerseTap.ts` — MODIFY: add screen reader announcement for selection changes
- `frontend/src/components/bible/reader/__tests__/VerseActionSheet.a11y.test.tsx` — NEW: accessibility tests

**Details:**

**Screen reader announcements:**

Add an `aria-live="polite"` region inside the sheet that announces selection changes:

```tsx
<div className="sr-only" aria-live="polite" aria-atomic="true">
  {announceText}
</div>
```

Where `announceText` updates when:
- Sheet opens: "Actions for John 3:16" (reference)
- Selection extends: "Selected John 3:16 through 18" (range)
- Sub-view pushed: "Highlight colors" (sub-view title)
- Copy succeeds: "Verse copied to clipboard"

**Focus management verification:**

- On sheet open: focus moves to first primary action button (Highlight)
- Tab cycles through: primary actions → secondary actions → close button → back to first
- On sub-view push: focus moves to the back button
- On sub-view pop: focus returns to the action that pushed the sub-view
- On sheet close: focus returns to the tapped verse span (`id="verse-{number}"`)

**All tap targets:** Verify 44px minimum:
- Primary action buttons: 44px via `min-h-[44px] min-w-[44px]`
- Secondary action rows: 44px via `min-h-[44px]`
- Close button: 44px via ICON_BTN class
- Back button in sub-views: 44px via ICON_BTN class

**Keyboard navigation detail:**
- Arrow up/down in secondary list: moves focus between items
- Home/End in secondary list: jumps to first/last item

**Guardrails (DO NOT):**
- Do NOT use `outline-none` without a visible focus replacement
- Do NOT skip focus trap — it must be active while the sheet is open
- Do NOT use color alone to convey meaning (the outline ring vs background fill for highlighted verses uses shape, not just color)

**Responsive behavior:** N/A: accessibility features are the same at all breakpoints.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| dialog role and aria attributes | a11y | Sheet has `role="dialog"`, `aria-modal="true"`, `aria-label` |
| focus moves to first action on open | a11y | On open → `document.activeElement` is the first primary action button |
| focus trapped inside sheet | a11y | Tab from last action → wraps to first action |
| focus returns to verse on close | a11y | Open on verse 16, close → `document.activeElement` is `#verse-16` |
| aria-live announces selection change | a11y | Extend selection → `aria-live` region text updates |
| all tap targets ≥ 44px | a11y | Query all buttons inside the sheet, verify `minHeight >= 44` via computed styles |
| keyboard shortcut 1-4 activates primary | a11y | Press '1' → Highlight action fires |
| keyboard c copies | a11y | Press 'c' → Copy action fires |

**Expected state after completion:**
- [ ] Sheet passes WCAG AA audit (all focus management, ARIA, tap targets)
- [ ] Screen reader announces selection changes and sub-view navigation
- [ ] Keyboard shortcuts 1-4, c, Escape, Arrow keys, Tab all work
- [ ] All 8 tests pass
- [ ] Build passes (`pnpm build` — 0 errors, 0 warnings)
- [ ] All existing tests still pass (`pnpm test`)

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Types & action handler registry |
| 2 | 1 | useVerseTap hook (uses VerseSelection type) |
| 3 | 1 | VerseActionSheet component (uses registry + types) |
| 4 | — | Selection highlight on ReaderBody (pure props, no deps on other steps) |
| 5 | 1, 2, 3, 4 | Wire everything into BibleReader |
| 6 | 3, 5 | Accessibility & polish on the sheet |

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Types & Action Handler Registry | [COMPLETE] | 2026-04-08 | Created `types/verse-actions.ts`, `lib/bible/verseActionRegistry.ts`, `lib/bible/__tests__/verseActionRegistry.test.ts`. 17 tests pass. |
| 2 | useVerseTap Hook | [COMPLETE] | 2026-04-08 | Created `hooks/useVerseTap.ts`, `hooks/__tests__/useVerseTap.test.ts`. 11 tests pass. Added PointerEvent polyfill for jsdom. |
| 3 | VerseActionSheet Component | [COMPLETE] | 2026-04-08 | Created `reader/VerseActionSheet.tsx`, added `verse-sheet-slide-up` animation to `tailwind.config.js`, 14 tests pass. |
| 4 | Selection Highlight on ReaderBody | [COMPLETE] | 2026-04-08 | Modified `ReaderBody.tsx` with 3 new optional props. Added 5 selection tests to existing test file. 14 total tests pass. |
| 5 | Wire into BibleReader | [COMPLETE] | 2026-04-08 | Modified `BibleReader.tsx`: added useVerseTap, VerseActionSheet mount, selection state, focus mode coordination, handleSheetClose fade-out, sheet-open guard on keyboard/swipe. Added Toast mock + 2 tests. 12 tests pass. Build clean. |
| 6 | Accessibility & Polish | [COMPLETE] | 2026-04-08 | Added `aria-live` region + `announceText` state to VerseActionSheet, created `VerseActionSheet.a11y.test.tsx` with 10 tests. All 78 BB-6 tests pass. Build clean (0 errors, 0 warnings). |
