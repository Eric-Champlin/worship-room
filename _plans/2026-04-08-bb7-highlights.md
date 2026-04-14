# Implementation Plan: BB-7 Highlights

**Spec:** `_specs/bb-7-highlights.md`
**Date:** 2026-04-08
**Branch:** `bible-redesign`
**Design System Reference:** `_plans/recon/design-system.md` (loaded — captured 2026-04-05)
**Recon Report:** not applicable
**Master Spec Plan:** N/A — standalone feature within Bible redesign wave

---

## Architecture Context

### Project Structure

Bible reader files relevant to BB-7:

- **Page:** `frontend/src/pages/BibleReader.tsx` (455 lines) — Mounts `ReaderChrome`, `TypographySheet`, `ReaderBody`, `ReaderChapterNav`, `VerseJumpPill`, `BibleDrawer`, `FocusVignette`, `VerseActionSheet`. Currently reads highlights from localStorage via inline `useMemo` (lines 81-92) — this will be replaced with the new store subscription.
- **ReaderBody:** `frontend/src/components/bible/reader/ReaderBody.tsx` (90 lines) — Renders verse spans with `data-verse`, `data-book`, `data-chapter` attributes. Currently receives `highlightedVerseNumbers: number[]` for ring vs fill decision. Will be extended to receive full highlight data for background color rendering.
- **VerseActionSheet:** `frontend/src/components/bible/reader/VerseActionSheet.tsx` (384 lines) — Sub-view system with back button, handler registry. The highlight sub-view currently shows a stub (`"Color picker ships in BB-7"`). Primary action buttons show `handler.icon` at `text-white/70` — no `getState` integration yet.
- **verseActionRegistry.ts:** `frontend/src/lib/bible/verseActionRegistry.ts` (275 lines) — Handler registry. Highlight handler has `hasSubView: true`, stub `renderSubView`, empty `onInvoke`, no `getState`. The `VerseActionHandler` type already supports `getState?: (selection) => { active: boolean; activeColor?: string }`.
- **useBibleHighlights.ts:** `frontend/src/hooks/useBibleHighlights.ts` (127 lines) — Existing hook with per-verse CRUD. **Auth-gated** (`if (!isAuthenticated) return`). Uses `useState` for reactivity. This hook will be **deprecated and replaced** by the new store module. The auth gating conflicts with BB-7 spec (highlights work for ALL users).
- **Types:** `frontend/src/types/bible.ts` — Current `BibleHighlight` has `book, chapter, verseNumber, color, createdAt`. BB-7 replaces this with range-based `Highlight` type (`id, book, chapter, startVerse, endVerse, color, createdAt, updatedAt`).
- **Constants:** `frontend/src/constants/bible.ts` — `HIGHLIGHT_COLORS` (Yellow/Green/Blue/Pink) and `BIBLE_HIGHLIGHTS_KEY = 'wr_bible_highlights'`, `MAX_HIGHLIGHTS = 500`. Colors will be replaced with emotion-mapped palette; MAX_HIGHLIGHTS will be removed (spec says no upper limit).
- **CSS tokens:** `frontend/src/index.css` (lines 16-34) — `[data-reader-theme="midnight|parchment|sepia"]` scoped tokens: `--reader-bg`, `--reader-text`, `--reader-verse-num`, `--reader-divider`. BB-7 adds 45 highlight tokens following this same pattern.
- **VerseSelection type:** `frontend/src/types/verse-actions.ts` — `{ book, bookName, chapter, startVerse, endVerse, verses[] }`. Already supports ranges — no change needed.

### Key Patterns

- **Registry pattern:** Action handlers are declarative objects in `verseActionRegistry.ts`. Sub-views render via `handler.renderSubView({ selection, onBack })`.
- **Sub-view navigation:** `VerseActionSheet` maintains `subView` state. Back button calls `onBack` → `setSubView(null)` + focus restore to trigger button.
- **Reader theme tokens:** `[data-reader-theme]` scoped CSS custom properties in `index.css`. Components consume via `var(--token-name)`.
- **Focus mode coordination:** Sheets/drawers call `focusMode.pauseFocusMode()` on open, `resumeFocusMode()` on close via `useEffect` cleanup.
- **Toast system:** `useToast()` → `showToast(message, type?)` from `components/ui/Toast.tsx`.
- **Test patterns:** `vitest`, `@testing-library/react`, `MemoryRouter` wrapping, `localStorage.clear()` in `beforeEach`, `vi.useFakeTimers()` for animation tests. No AuthModalProvider/ToastProvider wrapping needed for Bible reader (public page).

### Existing Consumers of `wr_bible_highlights`

Files referencing the key (from grep):
- `BibleReader.tsx` — inline useMemo (will be replaced)
- `constants/bible.ts` — key constant (kept)
- `hooks/useBibleHighlights.ts` — old hook (deprecated)
- Test files: `surprise-integration.test.tsx`, `BibleReaderNotes.test.tsx`, `useScriptureEcho.test.ts`, `bible-annotations-storage.test.ts`, `BibleBrowserHighlightsNotes.test.tsx`, `RecentHighlightsWidget.test.tsx`

**Migration strategy:** The new store reads the existing format and auto-migrates to the new range-based format on first access. Old per-verse records become single-verse ranges (`startVerse === endVerse`). Tests that write old-format data will continue to work because the store transparently migrates on read.

---

## Auth Gating Checklist

**No auth gating in BB-7.** All highlight actions are public — both logged-in and logged-out users get identical behavior. The existing `useBibleHighlights` hook's auth gating is **removed** in the new store module.

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Tap Highlight in action sheet | Public | Step 6 | N/A |
| Apply a highlight color | Public | Step 6 | N/A |
| Remove a highlight | Public | Step 6 | N/A |
| Change a highlight color | Public | Step 6 | N/A |

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Color picker swatch | diameter | `56px` mobile, `64px` desktop | spec req 5 |
| Color picker swatch tap target | minimum | `44px` (included in swatch size) | spec req 6 |
| Swatch selected indicator | style | `ring-2 ring-offset-2 ring-offset-[rgba(15,10,30,0.95)]` + filled inner dot | spec req 7 |
| Remove button | visibility | Only when current selection is highlighted | spec req 8 |
| Sheet close delay | timing | `~300ms` after color apply | spec req 9 |
| Highlight background | CSS property | `background-color: var(--highlight-{color}-bg)` | spec req 22 |
| Multi-line highlight | CSS property | `box-decoration-break: clone; -webkit-box-decoration-break: clone` | spec req 23 |
| Selection ring on highlighted verse | color | `outline-color: var(--highlight-{color}-ring)` matching highlight color | spec req 25 |
| Pulse animation | timing | `400ms ease-out` single pulse | spec req 31 |
| Pulse reduced-motion | behavior | Instant paint, no pulse | spec req 32 |
| Sub-view header | style | Same as BB-6 sub-view: `ArrowLeft` back + label, `px-4 py-3` | VerseActionSheet.tsx:267-276 |
| Sheet panel | background | `rgba(15, 10, 30, 0.95)` with `backdrop-filter: blur(16px)` | VerseActionSheet.tsx:247-249 |

### Highlight Color Tokens

| Emotion | Swatch Hex | Tailwind-ish Description |
|---------|-----------|------------------------|
| Peace | `#7DD3FC` | sky-300, soft blue |
| Conviction | `#FB923C` | orange-400, warm amber |
| Joy | `#FDE047` | yellow-300, bright gold |
| Struggle | `#C4B5FD` | violet-300, muted violet |
| Promise | `#6EE7B7` | emerald-300, deep green |

[UNVERIFIED] Background opacity values per theme — derived from spec guidance (15-20% dark, 25-30% light), exact values need visual tuning:

| Theme | Opacity Range | Notes |
|-------|--------------|-------|
| Midnight | 0.15-0.18 | Low opacity on near-black (#08051A) |
| Parchment | 0.20-0.25 | Higher saturation on cream (#F5F0E8) |
| Sepia | 0.22-0.28 | Slightly more than parchment on warm tan (#E8D5B7) |

→ To verify: Run `/verify-with-playwright` across all 3 themes with highlights applied
→ If wrong: Adjust opacity values in index.css tokens until highlights are clearly visible but don't obscure text

---

## Design System Reminder

**Project-specific quirks that `/execute-plan` displays before every UI step:**

- The Bible reader uses `[data-reader-theme]` scoped CSS custom properties in `index.css`. ALL highlight colors must be CSS custom properties — zero raw hex values in component code.
- Reader themes: Midnight (`#08051A` bg, white text), Parchment (`#F5F0E8` bg, `#3E2C1A` text), Sepia (`#E8D5B7` bg, `#2C1A0A` text). Dark theme highlights need lower opacity backgrounds; light theme highlights need more saturation to not look like smudges.
- The `VerseActionSheet` uses `ICON_BTN_SM` class for small buttons: `'flex min-h-[36px] min-w-[36px] items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white'`.
- Focus mode coordination: any sheet/drawer that opens must `pauseFocusMode()` and `resumeFocusMode()` on close. The action sheet already does this (BibleReader.tsx:170-176).
- The sub-view system in VerseActionSheet renders via `subView.handler.renderSubView({ selection, onBack })`. The sub-view area is `<div className="flex-1 overflow-y-auto">`.
- The action sheet panel uses `rgba(15, 10, 30, 0.95)` with `backdrop-blur(16px)` — selected-state ring-offset color must match this for swatch indicators.
- Worship Room uses `GRADIENT_TEXT_STYLE` for hero headings. Caveat font deprecated for headings. FrostedCard for cards. White pill CTA patterns for buttons. Static white textarea glow. None of these apply to the Bible reader's internal chrome, which follows its own theme system.
- `prefers-reduced-motion`: Use `useReducedMotion()` hook (already imported in BibleReader and VerseActionSheet). Pulse animation skipped when true.

---

## Shared Data Models

### New Type: `Highlight`

```typescript
export type HighlightColor = 'peace' | 'conviction' | 'joy' | 'struggle' | 'promise';

export interface Highlight {
  id: string;              // UUID
  book: string;            // slug, e.g. 'john'
  chapter: number;
  startVerse: number;
  endVerse: number;        // equals startVerse for single-verse highlights
  color: HighlightColor;
  createdAt: number;       // epoch ms
  updatedAt: number;       // epoch ms
}
```

### Legacy Type (kept for migration)

```typescript
// Existing BibleHighlight — kept in types/bible.ts for migration compatibility
export interface BibleHighlight {
  book: string;
  chapter: number;
  verseNumber: number;
  color: string;
  createdAt: string;  // ISO 8601
}
```

### localStorage Keys

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_bible_highlights` | Both | Highlight[] array (new range-based format, auto-migrated from old per-verse format) |

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | Color picker: 5 swatches ~56px diameter in single horizontal row, emotion labels below. Remove button at end. Sheet is full-width bottom sheet. |
| Tablet | 768px | Same swatch layout, more spacing between swatches. Sheet is 440px centered. |
| Desktop | 1440px | Swatches ~64px diameter. Sheet is 440px positioned bottom-center of reader. |

---

## Inline Element Position Expectations

| Element Group | Elements | Expected y-alignment | Wrap Tolerance |
|---------------|----------|---------------------|----------------|
| Color picker swatch row | Peace, Conviction, Joy, Struggle, Promise, (Remove if visible) | Same y ±5px at all breakpoints | No wrapping — single row always. `flex-shrink-0` + `gap` ensures fit within 440px sheet. |

---

## Vertical Rhythm

N/A — BB-7 modifies inline verse rendering and the action sheet sub-view. No page-level section spacing changes.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] BB-4 (reader + verse spans) is committed on `bible-redesign`
- [x] BB-6 (verse action sheet + registry) is committed on `bible-redesign`
- [x] `VerseActionHandler.getState` is defined in types (confirmed: `types/verse-actions.ts` line 42)
- [x] `VerseActionHandler.renderSubView` is defined in types (confirmed: `types/verse-actions.ts` lines 35-38)
- [x] All auth-gated actions from the spec are accounted for (none — all public)
- [x] No deprecated patterns used
- [ ] [UNVERIFIED] highlight background opacity values need visual tuning per theme
- [ ] Prior specs in the sequence (BB-4, BB-6) are committed

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Old per-verse data migration | Auto-migrate on first read: `verseNumber` → `startVerse = endVerse = verseNumber`, generate UUID, convert ISO createdAt to epoch ms, set `updatedAt = createdAt` | Zero data loss. Users upgrading see their old highlights immediately. |
| Old color mapping | Map old hex colors to closest emotion: `#FBBF24` → joy, `#34D399` → promise, `#60A5FA` → peace, `#F472B6` → struggle. Unmapped colors → `'joy'` (bright default). | Existing highlights don't become invisible. |
| MAX_HIGHLIGHTS removal | Remove pruning. Rely on `QuotaExceededError` + toast. | Spec says "no upper limit." 1000+ highlights = ~120KB, well within 5MB quota. |
| Adjacent same-color highlights | Do NOT merge. Two adjacent single-verse highlights of the same color stay as separate records. | Spec req 13 explicitly states "Adjacent ranges don't merge even if same color." |
| Cross-tab sync | Not implemented. | Spec marks this as out of scope (stretch goal for BB-16). |
| Auth gating | Removed. All users can highlight. | Spec req: "No auth gate on any highlight action." |
| `subscribe` mechanism | Implement as a simple listener set on the store module, not tied to React. | Spec says this is "load-bearing for BB-14." A standalone subscribe decouples from React's rendering cycle. |
| Sheet close timing after color apply | 300ms delay via `setTimeout` | Spec req 9: user sees the color before dismissal. |
| Filled highlight icon in action sheet | Use `handler.getState()` to check if selection has highlight. If active, render icon filled with `activeColor`. | Spec req 27: "Highlight icon shows filled version in current highlight color." |

---

## Implementation Steps

### Step 1: Data Model, Constants & CSS Tokens

**Objective:** Define the new Highlight type, emotion-mapped color constants, and 45 theme-scoped CSS custom properties.

**Files to create/modify:**
- `frontend/src/types/bible.ts` — Add `Highlight` and `HighlightColor` types. Keep `BibleHighlight` for migration.
- `frontend/src/constants/bible.ts` — Replace `HIGHLIGHT_COLORS` with `HIGHLIGHT_EMOTIONS`. Remove `MAX_HIGHLIGHTS`.
- `frontend/src/index.css` — Add 45 highlight CSS custom properties in each `[data-reader-theme]` block.

**Details:**

**types/bible.ts** — Add after existing `BibleHighlight` interface:

```typescript
export type HighlightColor = 'peace' | 'conviction' | 'joy' | 'struggle' | 'promise';

export interface Highlight {
  id: string;
  book: string;
  chapter: number;
  startVerse: number;
  endVerse: number;
  color: HighlightColor;
  createdAt: number;
  updatedAt: number;
}
```

**constants/bible.ts** — Replace `HIGHLIGHT_COLORS` with:

```typescript
export const HIGHLIGHT_EMOTIONS = [
  { key: 'peace' as const, label: 'Peace', hex: '#7DD3FC' },
  { key: 'conviction' as const, label: 'Conviction', hex: '#FB923C' },
  { key: 'joy' as const, label: 'Joy', hex: '#FDE047' },
  { key: 'struggle' as const, label: 'Struggle', hex: '#C4B5FD' },
  { key: 'promise' as const, label: 'Promise', hex: '#6EE7B7' },
] as const;
```

Remove `MAX_HIGHLIGHTS` export. Keep `BIBLE_HIGHLIGHTS_KEY`. Keep the old `HIGHLIGHT_COLORS` temporarily with a `@deprecated` JSDoc comment — it may be referenced by existing consumers outside the reader (the migration code will map old hex to new emotion keys).

**index.css** — Add under each `[data-reader-theme]` block, 15 tokens per theme (5 colors × 3 variants):

```css
/* Midnight (dark) — backgrounds at 15-18% opacity */
[data-reader-theme="midnight"] {
  /* ...existing tokens... */
  --highlight-peace: #7DD3FC;
  --highlight-peace-bg: rgba(125, 211, 252, 0.15);
  --highlight-peace-ring: rgba(125, 211, 252, 0.40);
  --highlight-conviction: #FB923C;
  --highlight-conviction-bg: rgba(251, 146, 60, 0.18);
  --highlight-conviction-ring: rgba(251, 146, 60, 0.40);
  --highlight-joy: #FDE047;
  --highlight-joy-bg: rgba(253, 224, 71, 0.15);
  --highlight-joy-ring: rgba(253, 224, 71, 0.40);
  --highlight-struggle: #C4B5FD;
  --highlight-struggle-bg: rgba(196, 181, 253, 0.15);
  --highlight-struggle-ring: rgba(196, 181, 253, 0.40);
  --highlight-promise: #6EE7B7;
  --highlight-promise-bg: rgba(110, 231, 183, 0.15);
  --highlight-promise-ring: rgba(110, 231, 183, 0.40);
}

/* Parchment (cream) — backgrounds at 20-25% opacity, distinct hues for cream bg */
[data-reader-theme="parchment"] {
  /* ...existing tokens... */
  --highlight-peace: #3B82F6;
  --highlight-peace-bg: rgba(59, 130, 246, 0.20);
  --highlight-peace-ring: rgba(59, 130, 246, 0.35);
  --highlight-conviction: #EA580C;
  --highlight-conviction-bg: rgba(234, 88, 12, 0.18);
  --highlight-conviction-ring: rgba(234, 88, 12, 0.35);
  --highlight-joy: #CA8A04;
  --highlight-joy-bg: rgba(202, 138, 4, 0.20);
  --highlight-joy-ring: rgba(202, 138, 4, 0.35);
  --highlight-struggle: #7C3AED;
  --highlight-struggle-bg: rgba(124, 58, 237, 0.18);
  --highlight-struggle-ring: rgba(124, 58, 237, 0.35);
  --highlight-promise: #059669;
  --highlight-promise-bg: rgba(5, 150, 105, 0.20);
  --highlight-promise-ring: rgba(5, 150, 105, 0.35);
}

/* Sepia (warm tan) — backgrounds at 22-28% opacity, warmer than parchment */
[data-reader-theme="sepia"] {
  /* ...existing tokens... */
  --highlight-peace: #2563EB;
  --highlight-peace-bg: rgba(37, 99, 235, 0.22);
  --highlight-peace-ring: rgba(37, 99, 235, 0.35);
  --highlight-conviction: #C2410C;
  --highlight-conviction-bg: rgba(194, 65, 12, 0.20);
  --highlight-conviction-ring: rgba(194, 65, 12, 0.35);
  --highlight-joy: #A16207;
  --highlight-joy-bg: rgba(161, 98, 7, 0.22);
  --highlight-joy-ring: rgba(161, 98, 7, 0.35);
  --highlight-struggle: #6D28D9;
  --highlight-struggle-bg: rgba(109, 40, 217, 0.20);
  --highlight-struggle-ring: rgba(109, 40, 217, 0.35);
  --highlight-promise: #047857;
  --highlight-promise-bg: rgba(4, 120, 87, 0.22);
  --highlight-promise-ring: rgba(4, 120, 87, 0.35);
}
```

**Auth gating:** N/A

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- Do NOT delete the old `BibleHighlight` type yet — it's needed for migration and may be referenced by tests
- Do NOT use raw hex values in any component code — all colors via CSS custom properties
- Do NOT add Tailwind custom colors for highlights — they're CSS custom properties consumed via `var()`, not Tailwind classes

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `HighlightColor type exhaustiveness` | unit | Verify all 5 values are valid HighlightColor |
| `HIGHLIGHT_EMOTIONS has 5 entries` | unit | Constant integrity check |
| `Each HIGHLIGHT_EMOTIONS entry has key, label, hex` | unit | Shape validation |

**Expected state after completion:**
- [ ] `Highlight` and `HighlightColor` types exported from `types/bible.ts`
- [ ] `HIGHLIGHT_EMOTIONS` exported from `constants/bible.ts` with 5 entries
- [ ] 45 CSS custom properties added to `index.css` (15 per theme × 3 themes)
- [ ] `MAX_HIGHLIGHTS` removed, `HIGHLIGHT_COLORS` deprecated
- [ ] Build passes with zero errors

---

### Step 2: Highlight Store — Tests First (TDD)

**Objective:** Write comprehensive tests for the highlight store's range math, CRUD operations, subscribe mechanism, migration, and error handling BEFORE implementation.

**Files to create:**
- `frontend/src/lib/bible/__tests__/highlightStore.test.ts`

**Details:**

Tests must cover every overlap topology listed in the spec's "Range Math" section. Structure the test file in these `describe` blocks:

```typescript
describe('highlightStore', () => {
  describe('getAllHighlights / getHighlightsForChapter / getHighlightForVerse', () => {
    // Read operations — empty store returns []
    // getHighlightsForChapter filters by book + chapter
    // getHighlightForVerse returns the highlight containing that verse (range-aware)
  })

  describe('applyHighlight — new highlights (no overlap)', () => {
    // Single verse creates one record with startVerse === endVerse
    // Multi-verse range creates one record
    // Different books don't interfere
    // Record has id, createdAt, updatedAt
  })

  describe('applyHighlight — same range overwrite', () => {
    // Same range, same color → no change (idempotent)
    // Same range, different color → color updated, updatedAt changed, one record
  })

  describe('applyHighlight — partial overlap left', () => {
    // Existing 16-18 Peace, new 15-17 Joy → 15-17 Joy + 18 Peace
  })

  describe('applyHighlight — partial overlap right', () => {
    // Existing 16-18 Peace, new 17-19 Joy → 16 Peace + 17-19 Joy
  })

  describe('applyHighlight — engulfing range', () => {
    // Existing 16-18 Peace, new 15-20 Joy → 15-20 Joy (old record deleted)
  })

  describe('applyHighlight — engulfed range (splits existing)', () => {
    // Existing 15-20 Peace, new 17-18 Joy → 15-16 Peace + 17-18 Joy + 19-20 Peace
  })

  describe('applyHighlight — adjacent ranges (no merge)', () => {
    // Existing 16 Peace + 17 Joy → stay separate
    // Existing 16 Peace, apply 17 Peace → two separate records
  })

  describe('applyHighlight — multi-split', () => {
    // New range crosses three existing highlights → all three split appropriately
  })

  describe('removeHighlight', () => {
    // Remove by id → record deleted
    // Remove non-existent id → no-op
  })

  describe('removeHighlightsInRange', () => {
    // Remove all highlights within a selection range
  })

  describe('updateHighlightColor', () => {
    // Update color by id → color changes, updatedAt updated
    // Update non-existent id → no-op
  })

  describe('subscribe', () => {
    // Listener called on applyHighlight
    // Listener called on removeHighlight
    // Listener called on updateHighlightColor
    // Unsubscribe stops notifications
    // Multiple listeners all fire
  })

  describe('migration from old BibleHighlight format', () => {
    // Old per-verse records auto-migrate on first read
    // Old hex colors map to new emotion keys
    // ISO createdAt converts to epoch ms
    // UUID generated for each migrated record
    // Migrated data persists (written back to localStorage)
  })

  describe('malformed data tolerance', () => {
    // Garbage JSON in localStorage → returns [] silently
    // Null in localStorage → returns []
    // Array with missing fields → invalid records filtered out
    // Non-array JSON → returns []
  })

  describe('QuotaExceededError handling', () => {
    // Write throws QuotaExceededError → store throws identifiable error for UI to catch
  })
})
```

**Target: ~35 tests.** Each covers a specific scenario with explicit setup → act → assert.

**Auth gating:** N/A

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- Do NOT implement the store yet — this step is tests only (TDD: red phase)
- Do NOT mock localStorage — use the real jsdom localStorage (cleared in `beforeEach`)
- Do NOT test React components here — this is pure logic testing

**Test specifications:**
(The test file IS the deliverable for this step)

**Expected state after completion:**
- [ ] `highlightStore.test.ts` created with ~35 tests
- [ ] All tests FAIL (red phase — store module doesn't exist yet)

---

### Step 3: Highlight Store — Implementation

**Objective:** Implement the highlight store module to pass all tests from Step 2.

**Files to create:**
- `frontend/src/lib/bible/highlightStore.ts`

**Details:**

The store is a **module-level singleton** (not a React hook) so that multiple components can subscribe. It wraps `localStorage` with reactive pub-sub.

```typescript
// Module-level state
let cache: Highlight[] | null = null
const listeners = new Set<() => void>()

// --- Read API ---
export function getAllHighlights(): Highlight[]
export function getHighlightsForChapter(book: string, chapter: number): Highlight[]
export function getHighlightForVerse(book: string, chapter: number, verse: number): Highlight | null

// --- Write API ---
export function applyHighlight(
  selection: { book: string; chapter: number; startVerse: number; endVerse: number },
  color: HighlightColor
): Highlight  // Returns the newly created/updated highlight

export function removeHighlight(id: string): void
export function removeHighlightsInRange(
  selection: { book: string; chapter: number; startVerse: number; endVerse: number }
): void
export function updateHighlightColor(id: string, color: HighlightColor): void

// --- Subscription ---
export function subscribe(listener: () => void): () => void

// --- Internal ---
function readFromStorage(): Highlight[]   // With migration + validation
function writeToStorage(data: Highlight[]): void  // With QuotaExceededError handling
function migrateOldFormat(raw: unknown): Highlight[]
function generateId(): string  // crypto.randomUUID() with fallback
function notifyListeners(): void
```

**Range math algorithm for `applyHighlight`:**

1. Filter existing highlights to find overlaps with the new range (same book + chapter, verse ranges intersect)
2. For each overlapping highlight:
   a. If existing range is **entirely within** new range → delete it
   b. If existing range **entirely contains** new range → split into up-to-3 pieces (left remainder, new range, right remainder)
   c. If existing range **overlaps left** → trim existing to non-overlapping portion
   d. If existing range **overlaps right** → trim existing to non-overlapping portion
3. Add the new highlight record
4. Write to storage, notify listeners

**Migration logic (`migrateOldFormat`):**

```typescript
function migrateOldFormat(raw: unknown): Highlight[] {
  if (!Array.isArray(raw)) return []

  const OLD_COLOR_MAP: Record<string, HighlightColor> = {
    '#FBBF24': 'joy',
    '#34D399': 'promise',
    '#60A5FA': 'peace',
    '#F472B6': 'struggle',
  }

  return raw
    .filter(isValidRecord) // Validate required fields exist
    .map(record => {
      // New format detection: has 'id' and 'startVerse'
      if ('id' in record && 'startVerse' in record) return record as Highlight

      // Old format migration
      const old = record as { book: string; chapter: number; verseNumber: number; color: string; createdAt: string }
      const createdMs = new Date(old.createdAt).getTime() || Date.now()
      return {
        id: generateId(),
        book: old.book,
        chapter: old.chapter,
        startVerse: old.verseNumber,
        endVerse: old.verseNumber,
        color: OLD_COLOR_MAP[old.color] ?? 'joy',
        createdAt: createdMs,
        updatedAt: createdMs,
      }
    })
}
```

**QuotaExceededError handling:**

```typescript
function writeToStorage(data: Highlight[]): void {
  try {
    localStorage.setItem(BIBLE_HIGHLIGHTS_KEY, JSON.stringify(data))
  } catch (e) {
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      throw new HighlightStorageFullError()
    }
    // Other errors: silent fail (localStorage unavailable)
  }
}

export class HighlightStorageFullError extends Error {
  constructor() {
    super('Storage full — export your highlights and clear old ones.')
    this.name = 'HighlightStorageFullError'
  }
}
```

**SSR-safety:** All reads return `[]` / `null` if `typeof window === 'undefined'`. All writes are no-ops.

**Auth gating:** None. All operations available to all users.

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- Do NOT use React hooks in this module — it's a plain TypeScript module
- Do NOT add auth checks — spec says NO auth gating
- Do NOT merge adjacent same-color highlights — spec says they stay separate
- Do NOT silently swallow `QuotaExceededError` — throw `HighlightStorageFullError` so UI can show toast
- Do NOT use `Math.random()` for IDs — use `crypto.randomUUID()` with `Date.now().toString(36) + Math.random().toString(36).slice(2)` fallback

**Test specifications:**
(Tests already written in Step 2 — this step makes them pass)

**Expected state after completion:**
- [ ] `highlightStore.ts` created with all exports
- [ ] All ~35 tests from Step 2 pass (green phase)
- [ ] Range math covers all 7 overlap topologies
- [ ] Migration handles old per-verse format transparently
- [ ] Build passes

---

### Step 4: Color Picker Sub-View Component

**Objective:** Build the `HighlightColorPicker` component that renders inside the action sheet's sub-view area.

**Files to create:**
- `frontend/src/components/bible/reader/HighlightColorPicker.tsx`
- `frontend/src/components/bible/reader/__tests__/HighlightColorPicker.test.tsx`

**Details:**

The component receives props from the action sheet's `renderSubView` and the store:

```typescript
interface HighlightColorPickerProps {
  selection: VerseSelection
  onBack: () => void
  onApply: (color: HighlightColor) => void
  onRemove: () => void
  currentColor: HighlightColor | null    // null = no existing highlight
  isMixedSelection: boolean              // true = multi-verse range with mixed colors
}
```

**Layout:**

```
┌──────────────────────────────────────────────┐
│  ← Choose a color                            │  ← Sub-view header (rendered by VerseActionSheet)
├──────────────────────────────────────────────┤
│                                              │
│  [Peace]  [Conv]  [Joy]  [Strug]  [Prom]  (❌)│  ← Swatches + optional Remove
│   Peace  Convic   Joy   Struggle Promise     │  ← Labels
│                                              │
└──────────────────────────────────────────────┘
```

- Swatch row: `flex justify-center items-start gap-3 sm:gap-4 px-4 py-6 sm:py-8`
- Each swatch: `flex flex-col items-center gap-2`
  - Circle: `w-14 h-14 sm:w-16 sm:h-16 rounded-full` filled with `var(--highlight-{color})`
  - Tap target includes label: `min-w-[44px] min-h-[44px]` on the button wrapping circle + label
  - Selected state (when `currentColor === color`): `ring-2 ring-offset-2` with `ring-offset-color` matching sheet bg (`rgb(15, 10, 30)`)
  - Label: `text-xs text-white/60`
- Remove button: Only visible when `currentColor !== null && !isMixedSelection`
  - Renders as a 6th item in the row with an X icon + "Remove" label
  - Same sizing as swatches

**Behavior:**

1. Tap swatch → calls `onApply(color)` immediately
2. Tap Remove → calls `onRemove()` immediately
3. The parent (registry handler) handles closing the sheet after 300ms delay

**Accessibility:**

- Each swatch button: `aria-label="{Emotion} highlight"`, `aria-pressed={currentColor === color}`
- Remove button: `aria-label="Remove highlight"`
- `role="radiogroup"` on the swatch container with `aria-label="Highlight color"`

**Auth gating:** N/A

**Responsive behavior:**
- Desktop (1440px): Swatches 64px diameter (`sm:w-16 sm:h-16`), centered in 440px sheet
- Tablet (768px): Same as desktop (sheet is 440px)
- Mobile (375px): Swatches 56px diameter (`w-14 h-14`), full-width sheet

**Guardrails (DO NOT):**
- Do NOT close the sheet from within this component — the parent handler controls dismissal timing
- Do NOT read/write localStorage from this component — it receives callbacks
- Do NOT use raw hex colors — consume via `var(--highlight-{color})` CSS custom properties
- Do NOT render a Back button — VerseActionSheet renders the sub-view header

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| renders 5 color swatches | unit | All 5 emotion swatches visible with labels |
| swatch tap calls onApply with correct color | unit | Click Peace → `onApply('peace')` |
| shows Remove button when currentColor is set | unit | currentColor='joy' → Remove visible |
| hides Remove button when no highlight | unit | currentColor=null → Remove hidden |
| hides Remove button for mixed selections | unit | isMixedSelection=true → Remove hidden |
| Remove tap calls onRemove | unit | Click Remove → `onRemove()` called |
| shows selected state on current color | unit | currentColor='peace' → Peace has `aria-pressed="true"` |
| no selected state when mixed | unit | isMixedSelection=true → no swatch has `aria-pressed="true"` |
| all swatches have accessible labels | unit | `aria-label` contains emotion name |
| swatch container has radiogroup role | unit | `role="radiogroup"` present |
| swatches meet 44px minimum tap target | unit | Each button has `min-h-[44px] min-w-[44px]` |

**Expected state after completion:**
- [ ] `HighlightColorPicker.tsx` renders 5 swatches + conditional Remove
- [ ] 11 tests pass
- [ ] Component uses CSS custom properties for all colors
- [ ] Build passes

---

### Step 5: Wire Highlight Handler in Registry

**Objective:** Replace the highlight stub in `verseActionRegistry.ts` with a real handler that opens the color picker, applies highlights, and reports state.

**Files to modify:**
- `frontend/src/lib/bible/verseActionRegistry.ts`

**Details:**

Replace the `highlight` handler object (lines 92-101):

```typescript
import { HighlightColorPicker } from '@/components/bible/reader/HighlightColorPicker'
import {
  getHighlightForVerse,
  getHighlightsForChapter,
  applyHighlight,
  removeHighlightsInRange,
  HighlightStorageFullError,
} from '@/lib/bible/highlightStore'
import type { HighlightColor } from '@/types/bible'

const SHEET_CLOSE_DELAY = 300

const highlight: VerseActionHandler = {
  action: 'highlight',
  label: 'Highlight',
  icon: Paintbrush,
  category: 'primary',
  hasSubView: true,

  getState: (selection: VerseSelection) => {
    const hl = getHighlightForVerse(selection.book, selection.chapter, selection.startVerse)
    if (!hl) return { active: false }
    return { active: true, activeColor: `var(--highlight-${hl.color})` }
  },

  renderSubView: (props: { selection: VerseSelection; onBack: () => void }) => {
    // Determine current highlight state for the selection
    const chapterHighlights = getHighlightsForChapter(props.selection.book, props.selection.chapter)
    const selectedVerses = new Set<number>()
    for (let v = props.selection.startVerse; v <= props.selection.endVerse; v++) selectedVerses.add(v)

    // Find highlight colors within selection
    const colorsInSelection = new Set<HighlightColor>()
    for (const hl of chapterHighlights) {
      for (let v = hl.startVerse; v <= hl.endVerse; v++) {
        if (selectedVerses.has(v)) colorsInSelection.add(hl.color)
      }
    }

    const isMixed = colorsInSelection.size > 1
    const currentColor = colorsInSelection.size === 1
      ? [...colorsInSelection][0]
      : null

    return React.createElement(HighlightColorPicker, {
      selection: props.selection,
      onBack: props.onBack,
      currentColor,
      isMixedSelection: isMixed,
      onApply: (color: HighlightColor) => {
        // Apply is called from within the sheet — we need access to context
        // The actual apply + close is handled by onInvoke below
      },
      onRemove: () => {
        // Remove is handled similarly
      },
    })
  },

  isAvailable: () => true,
  onInvoke: () => {},
}
```

**Problem: The sub-view pattern doesn't provide `VerseActionContext`.** The current registry sub-view receives only `{ selection, onBack }` — no `showToast` or `closeSheet`.

**Solution:** Extend the sub-view render props in the `VerseActionHandler` interface to include context. Modify `types/verse-actions.ts`:

```typescript
renderSubView?: (props: {
  selection: VerseSelection
  onBack: () => void
  context: VerseActionContext  // ADD THIS
}) => React.ReactNode
```

Then update `VerseActionSheet.tsx` to pass `context` when rendering sub-views:

```typescript
{subView.handler.renderSubView?.({
  selection,
  onBack: handleSubViewBack,
  context: {
    showToast: (msg: string) => showToast(msg),
    closeSheet: onClose,
  },
})}
```

Now the registry handler can use `context.closeSheet()` and `context.showToast()` inside the sub-view:

```typescript
renderSubView: ({ selection, onBack, context }) => {
  // ...determine currentColor, isMixed...

  return React.createElement(HighlightColorPicker, {
    selection,
    onBack,
    currentColor,
    isMixedSelection: isMixed,
    onApply: (color: HighlightColor) => {
      try {
        applyHighlight(
          { book: selection.book, chapter: selection.chapter, startVerse: selection.startVerse, endVerse: selection.endVerse },
          color
        )
        setTimeout(() => context.closeSheet(), SHEET_CLOSE_DELAY)
      } catch (e) {
        if (e instanceof HighlightStorageFullError) {
          context.showToast('Storage full — export your highlights and clear old ones.', 'error')
        }
      }
    },
    onRemove: () => {
      removeHighlightsInRange({
        book: selection.book,
        chapter: selection.chapter,
        startVerse: selection.startVerse,
        endVerse: selection.endVerse,
      })
      setTimeout(() => context.closeSheet(), SHEET_CLOSE_DELAY)
    },
  })
},
```

**Auth gating:** N/A

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- Do NOT modify other action handlers — only the `highlight` handler changes
- Do NOT break the sub-view rendering pattern for other handlers — the `context` prop is optional in the type (use `?:`) so existing stub sub-views don't need updating
- Do NOT add auth checks — spec says all public

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| highlight handler has hasSubView: true | unit | Registry shape check |
| highlight handler.getState returns active for highlighted verse | unit | Mock localStorage with highlight, verify getState |
| highlight handler.getState returns inactive for unhighlighted verse | unit | Empty localStorage, verify getState |
| renderSubView returns HighlightColorPicker element | unit | Verify createElement call |

**Expected state after completion:**
- [ ] Highlight stub replaced with functional handler
- [ ] `VerseActionHandler.renderSubView` type updated to include optional `context`
- [ ] `VerseActionSheet.tsx` passes `context` to sub-view render
- [ ] Build passes
- [ ] 4 tests pass

---

### Step 6: ReaderBody Highlight Rendering

**Objective:** Modify ReaderBody to render highlight background fills using CSS custom properties, with theme-awareness and `box-decoration-break: clone` for multi-line verses.

**Files to modify:**
- `frontend/src/components/bible/reader/ReaderBody.tsx`
- `frontend/src/components/bible/reader/__tests__/ReaderBody.test.tsx` (add tests)

**Details:**

Change the `ReaderBody` props to accept full highlight data instead of just verse numbers:

```typescript
interface ReaderBodyProps {
  verses: BibleVerse[]
  bookSlug: string
  chapter: number
  settings: ReaderSettings
  paragraphs?: number[]
  selectedVerses?: number[]
  /** Full highlight data for this chapter (for background color + ring color) */
  chapterHighlights?: Highlight[]
  selectionVisible?: boolean
  /** Verse numbers that just received a highlight (for pulse animation) */
  freshHighlightVerses?: number[]
}
```

Remove the old `highlightedVerseNumbers` prop. Replace with `chapterHighlights`.

For each verse span, compute:
1. Is this verse highlighted? → Check if any highlight in `chapterHighlights` contains this verse number
2. What color? → Get the highlight color for this verse
3. Is it selected AND highlighted? → Show ring in highlight color (not default primary)
4. Is it freshly highlighted? → Apply pulse animation class

```typescript
// Inside the verse map:
const highlightForVerse = chapterHighlights?.find(
  (hl) => verse.number >= hl.startVerse && verse.number <= hl.endVerse
)
const isHighlighted = !!highlightForVerse
const isSelected = selectedVerses?.includes(verse.number)
const isFresh = freshHighlightVerses?.includes(verse.number)

// Verse span:
<span
  data-verse={String(verse.number)}
  data-book={bookSlug}
  data-chapter={String(chapter)}
  id={`verse-${verse.number}`}
  className={cn(
    // Highlight background (always visible, not just when selected)
    isHighlighted && 'rounded-sm',
    // Selected + not highlighted → default purple selection bg
    isSelected && !isHighlighted && selectionVisible && 'bg-primary/[0.15] rounded-sm',
    // Selected + highlighted → ring in highlight color (not default primary)
    isSelected && isHighlighted && selectionVisible && 'outline outline-2 outline-offset-1 rounded-sm',
    // Fade-out transition
    isSelected && !selectionVisible && 'transition-colors duration-200',
    // Pulse animation on fresh highlight
    isFresh && !reducedMotion && 'animate-highlight-pulse',
  )}
  style={{
    // Highlight background via CSS custom property
    ...(isHighlighted ? {
      backgroundColor: `var(--highlight-${highlightForVerse!.color}-bg)`,
      WebkitBoxDecorationBreak: 'clone',
      boxDecorationBreak: 'clone' as const,
    } : {}),
    // Selection ring color matches highlight color
    ...(isSelected && isHighlighted && selectionVisible ? {
      outlineColor: `var(--highlight-${highlightForVerse!.color}-ring)`,
    } : {}),
  }}
>
```

**Note:** The `reducedMotion` boolean needs to be passed as a prop or consumed via the hook. Since `ReaderBody` is a presentational component, pass it as a prop: `reducedMotion?: boolean`.

**Auth gating:** N/A

**Responsive behavior:**
- Desktop (1440px): Highlight backgrounds render at full width of verse text
- Tablet (768px): Same
- Mobile (375px): Same, `box-decoration-break: clone` ensures multi-line wrap renders correctly

**Guardrails (DO NOT):**
- Do NOT use inline hex colors — all colors via `var(--highlight-{color}-bg)` and `var(--highlight-{color}-ring)`
- Do NOT add borders to highlights — spec req 22: "No border. Text color unchanged."
- Do NOT change text color on highlighted verses — only background
- Do NOT apply highlight background only when selected — highlights are ALWAYS visible

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| verse with highlight shows background color style | unit | Render with chapterHighlights, check inline style |
| verse without highlight has no background | unit | No chapterHighlights → no backgroundColor |
| highlighted + selected verse shows outline (not bg) | unit | Both selected and highlighted → outline class present |
| highlighted + selected verse ring uses highlight color | unit | outlineColor matches highlight color token |
| selected + not highlighted verse shows default purple bg | unit | bg-primary/[0.15] class present |
| box-decoration-break clone applied to highlighted verse | unit | Check style includes boxDecorationBreak |
| fresh highlight verse gets pulse class | unit | freshHighlightVerses includes verse → animate-highlight-pulse |
| pulse class absent when reduced motion | unit | reducedMotion=true → no animate-highlight-pulse |

**Expected state after completion:**
- [ ] ReaderBody renders highlight backgrounds using CSS custom properties
- [ ] Selection ring color matches highlight color
- [ ] `box-decoration-break: clone` applied for multi-line
- [ ] Fresh highlight pulse animation class applied
- [ ] 8 tests pass
- [ ] Build passes

---

### Step 7: BibleReader Store Integration

**Objective:** Replace the inline `useMemo` localStorage read in BibleReader with the store's reactive subscription, and pass highlight data + callbacks to child components.

**Files to modify:**
- `frontend/src/pages/BibleReader.tsx`

**Details:**

Replace the current `highlightedVerseNumbers` useMemo (lines 81-92) with a store subscription:

```typescript
import {
  getHighlightsForChapter,
  subscribe as subscribeHighlights,
} from '@/lib/bible/highlightStore'
import type { Highlight } from '@/types/bible'

// Inside BibleReaderInner:
const [chapterHighlights, setChapterHighlights] = useState<Highlight[]>(() =>
  getHighlightsForChapter(bookSlug ?? '', chapterNumber)
)

// Re-read when book/chapter changes
useEffect(() => {
  setChapterHighlights(getHighlightsForChapter(bookSlug ?? '', chapterNumber))
}, [bookSlug, chapterNumber])

// Subscribe to store changes (highlights applied/removed from action sheet)
useEffect(() => {
  const unsubscribe = subscribeHighlights(() => {
    setChapterHighlights(getHighlightsForChapter(bookSlug ?? '', chapterNumber))
  })
  return unsubscribe
}, [bookSlug, chapterNumber])

// Track freshly highlighted verses for pulse animation
const [freshHighlightVerses, setFreshHighlightVerses] = useState<number[]>([])
// Clear fresh highlights after animation completes (400ms)
useEffect(() => {
  if (freshHighlightVerses.length === 0) return
  const timer = setTimeout(() => setFreshHighlightVerses([]), 500)
  return () => clearTimeout(timer)
}, [freshHighlightVerses])
```

Update the `<ReaderBody>` props:

```typescript
<ReaderBody
  verses={verses}
  bookSlug={bookSlug!}
  chapter={chapterNumber}
  settings={settings}
  paragraphs={paragraphs}
  selectedVerses={selectedVerseNumbers}
  chapterHighlights={chapterHighlights}
  selectionVisible={selectionVisible}
  freshHighlightVerses={freshHighlightVerses}
  reducedMotion={reducedMotion}
/>
```

The `freshHighlightVerses` is populated by listening to store changes and diffing. When a new highlight is applied (store subscription fires), compute the newly highlighted verse numbers and set them as fresh.

**Auth gating:** N/A

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- Do NOT leave the old `highlightedVerseNumbers` useMemo — fully replace it
- Do NOT add the `useBibleHighlights` hook — use the store module directly
- Do NOT forget to unsubscribe from the store on unmount (the useEffect cleanup handles this)

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| BibleReader passes chapterHighlights to ReaderBody | integration | Verify prop passing with store data |
| BibleReader re-reads highlights on chapter change | integration | Navigate to new chapter → new highlights loaded |
| Store subscription updates UI on highlight change | integration | Apply highlight via store → ReaderBody re-renders |

**Expected state after completion:**
- [ ] BibleReader uses store subscription instead of inline localStorage read
- [ ] `chapterHighlights` passed to ReaderBody (not just verse numbers)
- [ ] Fresh highlight tracking for pulse animation
- [ ] 3 tests pass
- [ ] Build passes

---

### Step 8: Action Sheet Visual Integration

**Objective:** Make the action sheet show filled highlight icons with the current highlight color, and show a color swatch in the verse preview area when the verse is highlighted.

**Files to modify:**
- `frontend/src/components/bible/reader/VerseActionSheet.tsx`

**Details:**

**1. Primary action icon filled state:**

In the primary actions row, check `handler.getState?.(selection)` and conditionally style the icon:

```typescript
{primaryActions.map((handler) => {
  const Icon = handler.icon
  const state = handler.getState?.(selection)
  return (
    <button
      key={handler.action}
      onClick={(e) => handleActionClick(handler, e.currentTarget)}
      className="flex min-h-[44px] min-w-[44px] flex-col items-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors hover:bg-white/[0.06]"
      aria-label={handler.label}
    >
      <Icon
        className={cn('h-6 w-6', state?.active ? '' : 'text-white/70')}
        style={state?.active ? { color: state.activeColor } : undefined}
        fill={state?.active ? 'currentColor' : 'none'}
      />
      <span className="text-xs text-white/60">{handler.label}</span>
    </button>
  )
})}
```

When the highlight handler returns `{ active: true, activeColor: 'var(--highlight-joy)' }`, the Paintbrush icon renders filled in that color.

**2. Verse preview color swatch:**

When the selection's first verse is highlighted, show a small colored dot next to the reference:

```typescript
// In the header row, next to the reference text:
{(() => {
  const hlState = getPrimaryActions().find(h => h.action === 'highlight')?.getState?.(selection)
  if (!hlState?.active) return null
  return (
    <span
      className="inline-block h-3 w-3 rounded-full flex-shrink-0"
      style={{ backgroundColor: hlState.activeColor }}
      aria-hidden="true"
    />
  )
})()}
```

**Auth gating:** N/A

**Responsive behavior:** N/A: visual changes within existing sheet layout

**Guardrails (DO NOT):**
- Do NOT change the sheet's sizing, animation, or interaction patterns — only visual state
- Do NOT break keyboard shortcuts — the `getState` check is read-only
- Do NOT add state to VerseActionSheet for highlight data — `getState` reads from the store on every render

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| primary action icon shows filled when getState returns active | unit | Mock getState → verify fill attribute |
| primary action icon shows outline when getState returns inactive | unit | No getState → default text-white/70 |
| verse preview shows color swatch when highlighted | unit | Highlighted verse → small dot visible |
| verse preview hides swatch when not highlighted | unit | Unhighlighted → no dot |

**Expected state after completion:**
- [ ] Highlight icon filled with current color when verse is highlighted
- [ ] Color swatch dot in verse preview area
- [ ] 4 tests pass
- [ ] Build passes

---

### Step 9: Pulse Animation

**Objective:** Add the highlight pulse keyframe animation and ensure it respects `prefers-reduced-motion`.

**Files to modify:**
- `frontend/tailwind.config.js` — Add keyframes and animation
- `frontend/src/index.css` — Add reduced-motion override

**Details:**

**tailwind.config.js** — Add to the `extend.keyframes` and `extend.animation` objects:

```javascript
keyframes: {
  // ...existing keyframes...
  'highlight-pulse': {
    '0%': { opacity: '0' },
    '30%': { opacity: '1' },
    '60%': { opacity: '1', filter: 'brightness(1.3)' },
    '100%': { opacity: '1', filter: 'brightness(1)' },
  },
},
animation: {
  // ...existing animations...
  'highlight-pulse': 'highlight-pulse 400ms ease-out forwards',
},
```

The animation:
1. 0% → 30%: Background fades in from transparent (~120ms)
2. 30% → 60%: Holds at full opacity with brightness boost (~120ms)
3. 60% → 100%: Brightness settles back to normal (~160ms)
4. `forwards` — ends at final state (opacity 1, brightness 1)

**index.css** — Add reduced-motion override:

```css
@media (prefers-reduced-motion: reduce) {
  .animate-highlight-pulse {
    animation: none !important;
    opacity: 1 !important;
  }
}
```

**Auth gating:** N/A

**Responsive behavior:** N/A: animation is visual only

**Guardrails (DO NOT):**
- Do NOT make the pulse loop — it's a single one-shot animation (`forwards`, no `infinite`)
- Do NOT add a sound effect — spec req 33: "No sound effect"
- Do NOT use `animate-glow-pulse` — that's a deprecated pattern for textareas
- Do NOT make the pulse too aggressive — it's a "gentle brightness pulse" per spec

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| highlight-pulse animation defined in config | unit | Verify tailwind config has the keyframe |
| reduced-motion media query overrides animation | unit | Verify CSS rule exists |

**Expected state after completion:**
- [ ] `animate-highlight-pulse` class available in Tailwind
- [ ] 400ms single pulse: fade in → brightness boost → settle
- [ ] `prefers-reduced-motion: reduce` skips animation entirely
- [ ] Build passes

---

### Step 10: Deprecate Old Hook & Update Existing Consumers

**Objective:** Mark the old `useBibleHighlights` hook as deprecated, update any direct consumers of old `HIGHLIGHT_COLORS`, and verify all existing tests pass with the new data format.

**Files to modify:**
- `frontend/src/hooks/useBibleHighlights.ts` — Add `@deprecated` JSDoc
- `frontend/src/constants/bible.ts` — Ensure old `HIGHLIGHT_COLORS` has `@deprecated` comment

**Details:**

Add `@deprecated` to the hook:

```typescript
/**
 * @deprecated Use the highlight store module (`lib/bible/highlightStore`) instead.
 * This hook has auth-gating that conflicts with BB-7 spec (highlights are public).
 * The store module supports range-based highlights, subscribe/unsubscribe, and auto-migration.
 * Will be removed after BB-14.
 */
export function useBibleHighlights() { ... }
```

Verify existing tests pass:
- Run the full test suite to confirm no regressions
- The migration logic in the store handles old data format, so tests that set up old-format localStorage data should still work when read by components using the new store

**Auth gating:** N/A

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- Do NOT delete the old hook yet — other specs (BB-14, etc.) may reference it during transition
- Do NOT modify existing test files in this step — if they fail, fix the store's migration logic in Step 3
- Do NOT break the build by removing exports that are still imported somewhere

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Full test suite regression check | integration | `pnpm test` passes with 0 failures |

**Expected state after completion:**
- [ ] Old hook marked `@deprecated`
- [ ] Old `HIGHLIGHT_COLORS` marked `@deprecated`
- [ ] All existing tests pass (migration handles old format)
- [ ] Build passes with 0 errors, 0 warnings
- [ ] `pnpm test` passes

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Data model, constants, CSS tokens |
| 2 | 1 | Store tests (TDD red phase) |
| 3 | 1, 2 | Store implementation (TDD green phase) |
| 4 | 1 | Color picker component + tests |
| 5 | 3, 4 | Wire handler in registry (needs store + picker) |
| 6 | 1 | ReaderBody highlight rendering |
| 7 | 3, 6 | BibleReader store subscription |
| 8 | 5, 7 | Action sheet visual integration |
| 9 | — | Pulse animation (independent CSS) |
| 10 | 3, 5, 6, 7, 8 | Deprecate old hook, regression check |

**Parallelizable:** Steps 2 and 4 can run in parallel (both depend only on Step 1). Step 9 can run at any time.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Data Model, Constants & CSS Tokens | [COMPLETE] | 2026-04-08 | Added `Highlight`/`HighlightColor` to `types/bible.ts`, `HIGHLIGHT_EMOTIONS` to `constants/bible.ts`, 45 CSS tokens to `index.css`. `MAX_HIGHLIGHTS` kept with `@deprecated` (still imported by old hook). 3 tests pass. |
| 2 | Highlight Store — Tests First (TDD) | [COMPLETE] | 2026-04-08 | Created `lib/bible/__tests__/highlightStore.test.ts` with 35 tests. All fail (red phase — module doesn't exist). Pre-existing failures in BibleReaderHighlights/Notes/Audio tests unrelated. |
| 3 | Highlight Store — Implementation | [COMPLETE] | 2026-04-08 | Created `lib/bible/highlightStore.ts` with full CRUD, range math (7 topologies), migration, subscribe, QuotaExceeded handling. All 35 tests pass. |
| 4 | Color Picker Sub-View Component | [COMPLETE] | 2026-04-08 | Created `HighlightColorPicker.tsx` with 5 swatches + conditional Remove. 11 tests pass. CSS custom properties for all colors. |
| 5 | Wire Highlight Handler in Registry | [COMPLETE] | 2026-04-08 | Replaced highlight stub with real handler. Updated `renderSubView` type to include optional `context`. Updated VerseActionSheet to pass context. Updated 3 existing tests (2 sheet tests + 1 a11y). 4 new handler tests + 21 total registry tests pass. |
| 6 | ReaderBody Highlight Rendering | [COMPLETE] | 2026-04-08 | Updated `ReaderBody.tsx` to use `chapterHighlights` prop with CSS custom property backgrounds, outline-color ring, box-decoration-break, pulse animation class. Updated 1 existing test + added 7 new tests (21 total pass). Build has expected TS error in BibleReader.tsx (old prop removed) — fixed in Step 7. |
| 7 | BibleReader Store Integration | [COMPLETE] | 2026-04-08 | Replaced inline useMemo with store subscription in `BibleReader.tsx`. Passes `chapterHighlights`, `freshHighlightVerses`, `reducedMotion` to ReaderBody. Fresh highlight pulse tracking with 500ms auto-clear. Build passes clean. Pre-existing BibleReaderHighlights/Notes/Audio test failures remain unchanged. |
| 8 | Action Sheet Visual Integration | [COMPLETE] | 2026-04-08 | Added filled icon state via `getState` with color wrapper span + `[&>*]:fill-current`. Added color swatch dot next to reference. Used `<span>` wrapper to work around Icon type (only accepts className). All 24 sheet tests pass. |
| 9 | Pulse Animation | [COMPLETE] | 2026-04-08 | Added `highlight-pulse` keyframe + animation to tailwind.config.js. Added `prefers-reduced-motion: reduce` override in index.css. 400ms single pulse: fade in → brightness boost → settle. Build passes. |
| 10 | Deprecate Old Hook & Regression Check | [COMPLETE] | 2026-04-08 | Added `@deprecated` JSDoc to `useBibleHighlights.ts`. Full suite: 509 pass, 3 fail (all pre-existing BibleReaderAudio/Highlights/Notes — same 20 failures as before BB-7). Build passes clean. Zero new regressions. |
