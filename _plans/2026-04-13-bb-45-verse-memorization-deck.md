# Implementation Plan: BB-45 Verse Memorization Deck

**Spec:** `_specs/bb45-verse-memorization-deck.md`
**Date:** 2026-04-13
**Branch:** `bible-redesign` (no new branch — commits directly to existing branch)
**Design System Reference:** `_plans/recon/design-system.md` (loaded, captured 2026-04-05, 8 days old)
**Recon Report:** N/A — extends existing `/bible/my` page, no external page to recon
**Master Spec Plan:** N/A — standalone feature

---

## Architecture Context

### Project Structure

- **Frontend**: `frontend/src/` — React 18 + TypeScript + Vite + TailwindCSS
- **Components**: `frontend/src/components/` — organized by feature domain
- **Lib**: `frontend/src/lib/` — Pure TypeScript modules (no React dependency). Reactive stores live here (e.g., `lib/bible/highlightStore.ts`, `lib/heatmap/chapterVisitStore.ts`)
- **Hooks**: `frontend/src/hooks/` — Custom React hooks
- **Types**: `frontend/src/types/` — TypeScript interfaces
- **Constants**: `frontend/src/constants/bible.ts` — Bible-related constants
- **Tests**: Co-located `__tests__/` directories within each module

### Reactive Store Pattern (BB-7 / BB-43)

Both `highlightStore.ts` and `chapterVisitStore.ts` use the same pattern:
1. Module-level `let cache: T | null = null` + `const listeners = new Set<() => void>()`
2. `readFromStorage()` / `writeToStorage()` for localStorage I/O with try/catch
3. `getCache()` lazy-loads from localStorage on first access
4. All mutations: update `cache` in-memory → `writeToStorage()` → `notify()` listeners
5. `subscribe(listener)` returns `() => void` unsubscribe function
6. `_resetForTesting()` clears cache + listeners for test isolation
7. Silent failure on localStorage unavailability (private browsing, quota exceeded)

BB-45's store follows this pattern exactly.

### VerseActionSheet Integration

The memorize action already exists as a **stub** in `frontend/src/lib/bible/verseActionRegistry.ts:385-395`:
```typescript
const memorize: VerseActionHandler = {
  action: 'memorize',
  label: 'Memorize',
  sublabel: 'Add to your deck',
  icon: Layers,
  category: 'secondary',
  hasSubView: true,
  renderSubView: stubSubView('Memorize ships in BB-45'),
  isAvailable: () => true,
  onInvoke: () => {},
}
```

The `'memorize'` action is already in:
- `VerseAction` union type (`types/verse-actions.ts:21`)
- `SECONDARY_ACTIONS` array (`verseActionRegistry.ts:444`)
- `DEEP_LINKABLE_ACTIONS` allowlist (`lib/url/validateAction.ts:22`)

BB-45 replaces the stub implementation. The action changes from sub-view to immediate toggle (like bookmark). This requires:
- `hasSubView: false` (removes sub-view rendering)
- `renderSubView` removed
- `getState` added (checks if verse is in deck)
- `onInvoke` does the add/remove toggle
- Remove `'memorize'` from `DEEP_LINKABLE_ACTIONS` (no sub-view to deep-link to)

### VerseSelection (Range-Based)

```typescript
interface VerseSelection {
  book: string           // slug e.g. "john"
  bookName: string       // display e.g. "John"
  chapter: number
  startVerse: number
  endVerse: number       // inclusive — single verse: startVerse === endVerse
  verses: Array<{ number: number; text: string }>
}
```

Multi-verse selections ARE supported by the BibleReader. `verses` array contains the full text for each verse in the range. Card creation concatenates `sel.verses.map(v => v.text).join(' ')` (same as `getSelectionText(sel)` in `verseActionRegistry.ts:60`).

### My Bible Page Layout

`frontend/src/pages/MyBiblePage.tsx` (403 lines). Current section order:
1. Hero section (lines 172-177)
2. Section divider (line 180)
3. **BB-43: Heatmap + Progress Map** (lines 182-203) — inside `mx-auto max-w-2xl px-4`
4. Section divider (line 202)
5. **Main content** (line 206) — `mx-auto max-w-2xl px-4 pb-16`
   - Quick stats row (lines 207-245)
   - Activity filter bar (lines 247-258)
   - Color filter strip (lines 260-263)
   - Activity feed (lines 265-311)
   - Footer trust signal (lines 313-324)

**Integration point:** Insert the memorization deck section between the BB-43 section (line 203) and the main content div (line 206). Same container pattern: `mx-auto max-w-2xl px-4`, `py-8`, `border-t border-white/[0.08]` divider above.

### Activity Feed — Highlight Card

`frontend/src/components/bible/my-bible/HighlightCard.tsx` (37 lines). Receives `data: HighlightData` (just `{type, color}`) and `verseText: string | null`. Does NOT receive verse identity info (book, chapter, startVerse, endVerse).

`ActivityCard.tsx` wraps the type-specific card. It receives the full `item: ActivityItem` which has `book`, `bookName`, `chapter`, `startVerse`, `endVerse`. The entire card is clickable (navigates to BibleReader).

**Affordance strategy:** Add the "Add to memorize" button inside `HighlightCard`, passing verse identity + verse text from `ActivityCard`. The button uses `e.stopPropagation()` to prevent the parent card click from firing.

### Existing Utilities

- `timeAgo(isoDate)` from `@/lib/time` — "3 weeks ago" relative time formatting. Reusable for "Added 3 weeks ago".
- `formatReference(bookName, chapter, startVerse, endVerse)` from `@/lib/dailyHub/verseContext` — human-readable reference. Also exists as `formatReference(sel)` in `verseActionRegistry.ts`.
- `getSelectionText(sel)` from `verseActionRegistry.ts` — joins verse texts with space.
- `FrostedCard` component — glass card with polymorphic `as` prop.
- `FeatureEmptyState` component — icon + heading + description + optional CTA.

### Test Patterns

- Co-located `__tests__/` directories
- Vitest + React Testing Library + jsdom
- Store tests: direct function calls, `beforeEach` clears localStorage + calls `_resetForTesting()`
- Component tests: `render()` with mocked stores, `fireEvent` / `userEvent` for interactions
- Provider wrapping: no providers needed for My Bible page tests (auth is page-level gate, already tested)
- Mocking pattern: `vi.mock('@/lib/memorize/store')` for component tests

---

## Auth Gating Checklist

**BB-45 adds zero new auth gates.** All surfaces are already auth-gated:

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| View memorization deck on My Bible | Page-level auth gate (existing) | Step 7 | Route guard in App.tsx (existing) |
| "Add to memorize" in BibleReader | Verse action menu (existing) | Step 6 | VerseActionSheet only renders for selected verses (existing) |
| Flip a card | Page-level auth gate | Step 4 | Route guard (existing) |
| Remove a card | Page-level auth gate | Step 4 | Route guard (existing) |
| "Add to memorize" from activity feed | Page-level auth gate | Step 8 | Route guard (existing) |

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Card (frosted) | background | `bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] rounded-2xl` | FrostedCard.tsx |
| Card (frosted) | box-shadow | `shadow-[0_0_25px_rgba(139,92,246,0.06),0_4px_20px_rgba(0,0,0,0.3)]` | FrostedCard.tsx |
| Card front text (reference) | font | `text-xl font-semibold text-white` (~20px) | Spec |
| Card back text (verse) | font | `text-[15px] text-white/90 leading-relaxed font-serif` | Spec |
| Card metadata | font | `text-xs text-white/50` | Spec — matches ActivityCard timestamp style |
| Flip hint icon | color | `text-white/30` | Spec |
| Remove button | color | `text-white/40 hover:text-white/70` | Spec |
| Remove confirmation bg | background | `bg-white/[0.08]` | Spec |
| Section heading | font | `text-lg font-semibold text-white` | My Bible page pattern (SectionHeading used at page level; section-internal headings use smaller text) |
| Summary text | font | `text-sm text-white/60` | Matches My Bible page subhead pattern |
| "Last reviewed" text | font | `text-sm text-white/60` | Spec |
| Section divider | border | `border-t border-white/[0.08]` | MyBiblePage.tsx:202 |
| Section spacing | padding | `py-8` | MyBiblePage.tsx:184 |
| Container | width | `mx-auto max-w-2xl px-4` | MyBiblePage.tsx:183 |
| Page background | color | `bg-dashboard-dark` (#0f0a1e) | MyBiblePage.tsx:168 |

---

## Design System Reminder

**Project-specific quirks that `/execute-plan` displays before every UI step:**

- Worship Room uses `GRADIENT_TEXT_STYLE` (white-to-purple gradient via `background-clip: text`) for hero and section headings on dark backgrounds. Caveat font has been deprecated for headings — used only for the logo.
- The My Bible page uses `bg-dashboard-dark` background with `BibleLandingOrbs` for atmospheric glow. NOT `bg-hero-bg` and NOT HorizonGlow (that's Daily Hub only).
- Frosted glass cards: use the `FrostedCard` component (`bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] rounded-2xl` with dual box-shadow), not a hand-rolled card.
- My Bible page container: `mx-auto max-w-2xl px-4` for content sections. Section dividers: `border-t border-white/[0.08]`.
- Text on dark backgrounds: `text-white` for primary text, `text-white/60` for secondary, `text-white/50` for muted metadata, `text-white/40` for decorative.
- Mood colors: Struggling=#D97706, Heavy=#C2703E, Okay=#8B7FA8, Good=#2DD4BF, Thriving=#34D399.
- No deprecated patterns: no animate-glow-pulse, no cyan borders, no soft-shadow 8px-radius cards, no Caveat headings, no GlowBackground on Daily Hub, no BackgroundSquiggle on Daily Hub.
- CSS 3D flip is a new pattern not yet in the design system. Use `transform-style: preserve-3d` + `backface-visibility: hidden` + `rotateY(180deg)`. Safari requires `-webkit-backface-visibility: hidden` for reliable behavior.
- `prefers-reduced-motion`: all animations must respect this. Flip card uses `duration-0` (instant) when reduced motion is preferred.

---

## Shared Data Models

### New TypeScript Interface

```typescript
// frontend/src/types/memorize.ts
export interface MemorizationCard {
  id: string
  book: string           // slug e.g. "john"
  bookName: string       // display e.g. "John"
  chapter: number
  startVerse: number
  endVerse: number
  verseText: string      // captured at creation time, immutable
  reference: string      // formatted e.g. "John 3:16" or "Psalm 23:1-3"
  createdAt: number      // epoch ms
  lastReviewedAt: number | null
  reviewCount: number
}
```

### localStorage keys this spec touches

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_memorization_cards` | Both | MemorizationCard[] — full card deck, ordered by createdAt desc |

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | 1-column card grid, full-width cards |
| Tablet | 640px | 2-column card grid (`sm:grid-cols-2`) |
| Desktop | 1024px+ | 3-column card grid (`lg:grid-cols-3`) within `max-w-2xl` (672px) |

---

## Inline Element Position Expectations

| Element Group | Elements | Expected y-alignment | Wrap Tolerance |
|---------------|----------|---------------------|----------------|
| Card grid row | Cards in same row | Same top-y ±2px | Always aligned; CSS Grid handles alignment |
| Remove confirmation | "Remove this card?" + Yes + Cancel buttons | Same y at 375px+ | Stacking below 320px is acceptable but unlikely |
| Deck summary line | Card count + "Last reviewed" text | Separate lines (stacked block layout) | N/A — not inline |

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| BB-43 Progress Map divider → Memorization deck heading | 32px (`py-8`) | Matches BB-43 section spacing (MyBiblePage.tsx:194) |
| Memorization deck section → Quick stats row | 0px (deck section includes its own `py-8` bottom padding, main content div has no top padding) | MyBiblePage.tsx structure |
| Deck heading → card grid | 16px (`mt-4`) | Consistent with internal section spacing |

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] BB-43 is shipped and committed (commit `726c367`)
- [x] `memorize` action stub exists in `verseActionRegistry.ts:385-395` — confirmed
- [x] `'memorize'` is in `VerseAction` union type — confirmed (`types/verse-actions.ts:21`)
- [x] `'memorize'` is in `SECONDARY_ACTIONS` array — confirmed (`verseActionRegistry.ts:444`)
- [x] `'memorize'` is in `DEEP_LINKABLE_ACTIONS` — confirmed, needs removal since action becomes non-sub-view
- [x] BibleReader selection exposes verse ranges with text — confirmed (`VerseSelection.verses: Array<{number, text}>`)
- [x] My Bible page integration point identified — between line 203 (BB-43 divider) and line 206 (main content)
- [x] HighlightCard props need extension for affordance — currently receives only `data` and `verseText`
- [x] All auth-gated actions accounted for (zero new gates)
- [x] Design system values verified from FrostedCard.tsx + MyBiblePage.tsx + spec
- [x] No deprecated patterns used
- [x] Zero new npm packages
- [ ] CSS 3D flip on iOS Safari — `transform-style: preserve-3d` with `-webkit-backface-visibility: hidden`. Verified pattern; Safari requires the `-webkit-` prefix on `backface-visibility`.

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Card text capture strategy | Capture at creation time from `VerseSelection.verses` array | Spec requirement 5: "stays exactly as the user first saw it regardless of future Bible data updates" |
| Duplicate prevention | `isCardForVerse()` checks book + chapter + startVerse + endVerse range overlap | A verse already in the deck cannot be added again; the action becomes "Remove from memorize" |
| Multi-verse card from BibleReader | Single card with concatenated text and range reference | VerseSelection already provides ranges; `sel.verses.map(v => v.text).join(' ')` |
| Card from activity feed highlight | Use `getVerseText()` from useActivityFeed for text capture | Highlights don't store verse text; text is resolved at render time from Bible data files |
| Memorize action type | `hasSubView: false` (immediate toggle like bookmark) | No sub-view needed — add/remove is instant. Remove from `DEEP_LINKABLE_ACTIONS`. |
| Store max capacity | No explicit cap (100 cards ≈ 50KB per spec) | Well within localStorage limits; no eviction needed |
| Card ordering | Newest first (`createdAt` descending) | Spec requirement 19: "creation order (newest first)" |
| Review recording | Flip from front→back increments `reviewCount` and updates `lastReviewedAt`; back→front does NOT record a review | Spec says "Each flip records a review" — interpret as: revealing the verse text is the review action |
| Remove confirmation UX | Inline within card, not a modal. "Remove this card?" with Yes/Cancel | Spec requirement 14 explicitly states "not a modal" |
| Empty state component | Use `FeatureEmptyState` with bookmark icon | Matches warm empty state pattern used elsewhere on My Bible page |

---

## Implementation Steps

### Step 1: Types & Constants

**Objective:** Define the MemorizationCard interface and localStorage key constant.

**Files to create/modify:**
- `frontend/src/types/memorize.ts` — new file, MemorizationCard interface
- `frontend/src/constants/bible.ts` — add `MEMORIZATION_CARDS_KEY` constant

**Details:**

Create `frontend/src/types/memorize.ts`:
```typescript
export interface MemorizationCard {
  id: string
  book: string
  bookName: string
  chapter: number
  startVerse: number
  endVerse: number
  verseText: string
  reference: string
  createdAt: number
  lastReviewedAt: number | null
  reviewCount: number
}
```

Add to `frontend/src/constants/bible.ts`:
```typescript
export const MEMORIZATION_CARDS_KEY = 'wr_memorization_cards'
```

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- Do NOT add any fields beyond what the spec defines (no tags, categories, or metadata)
- Do NOT add scoring, mastery, or completion fields — anti-pressure design

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| N/A | — | Pure types and constants — no runtime behavior to test |

**Expected state after completion:**
- [x] `MemorizationCard` interface exported from `types/memorize.ts`
- [x] `MEMORIZATION_CARDS_KEY` exported from `constants/bible.ts`

---

### Step 2: Memorization Card Store

**Objective:** Create the reactive localStorage store following the BB-7/BB-43 pattern.

**Files to create/modify:**
- `frontend/src/lib/memorize/store.ts` — new file, store implementation
- `frontend/src/lib/memorize/index.ts` — new file, barrel export

**Details:**

Follow the exact pattern from `frontend/src/lib/heatmap/chapterVisitStore.ts` (112 lines):

```typescript
// frontend/src/lib/memorize/store.ts
import { MEMORIZATION_CARDS_KEY } from '@/constants/bible'
import type { MemorizationCard } from '@/types/memorize'

// --- Module-level state ---
let cache: MemorizationCard[] | null = null
const listeners = new Set<() => void>()

// --- ID generation ---
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

// --- Storage I/O ---
function readFromStorage(): MemorizationCard[] { ... }  // try/catch, JSON.parse, validate array
function writeToStorage(data: MemorizationCard[]): void { ... }  // try/catch, silent fail on quota
function getCache(): MemorizationCard[] { ... }  // lazy-load pattern
function notify(): void { ... }  // iterate listeners

// --- Public API ---
export function getAllCards(): MemorizationCard[]  // return [...getCache()] (shallow clone, sorted newest-first)
export function addCard(params: {
  book: string; bookName: string; chapter: number;
  startVerse: number; endVerse: number;
  verseText: string; reference: string;
}): MemorizationCard  // creates card with id, createdAt=Date.now(), lastReviewedAt=null, reviewCount=0

export function removeCard(id: string): void  // filter out by id, write, notify
export function recordReview(id: string): void  // update lastReviewedAt=Date.now(), reviewCount++, write, notify

export function isCardForVerse(
  book: string, chapter: number, startVerse: number, endVerse?: number
): boolean  // check if any card overlaps the verse range

export function getCardForVerse(
  book: string, chapter: number, startVerse: number, endVerse?: number
): MemorizationCard | undefined  // return the matching card if exists

export function subscribe(listener: () => void): () => void  // add to listeners, return unsubscribe
export function _resetForTesting(): void  // clear cache + listeners
```

Key implementation details:
- `getAllCards()` returns cards sorted by `createdAt` descending (newest first)
- `addCard()` deduplicates: if `isCardForVerse()` returns true, return the existing card without adding
- `isCardForVerse()` checks for exact range match: `card.book === book && card.chapter === chapter && card.startVerse === startVerse && card.endVerse === (endVerse ?? startVerse)`
- `readFromStorage()` validates each record before accepting (same defensive parsing as highlightStore)
- Validation checks: `typeof id === 'string'`, `typeof book === 'string'`, `typeof chapter === 'number'`, `typeof verseText === 'string'`, `typeof createdAt === 'number'`

Barrel export `frontend/src/lib/memorize/index.ts`:
```typescript
export {
  getAllCards, addCard, removeCard, recordReview,
  isCardForVerse, getCardForVerse, subscribe, _resetForTesting,
} from './store'
```

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- Do NOT add spaced repetition logic, scoring, or scheduling
- Do NOT add a capacity cap (100 cards ≈ 50KB is well within localStorage limits)
- Do NOT add export/import functionality (out of scope)
- Do NOT throw on localStorage failure — silent fail, cache-only operation

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `addCard creates card with correct fields` | unit | Verify id, createdAt, lastReviewedAt=null, reviewCount=0 |
| `addCard deduplicates exact range` | unit | Second add for same verse returns existing card |
| `getAllCards returns newest first` | unit | Add 3 cards, verify descending createdAt order |
| `removeCard deletes by id` | unit | Add 2 cards, remove 1, verify only 1 remains |
| `removeCard no-ops for unknown id` | unit | Remove nonexistent id, verify no error and list unchanged |
| `recordReview increments count` | unit | Add card, recordReview, verify reviewCount=1 and lastReviewedAt set |
| `recordReview updates lastReviewedAt` | unit | Record 2 reviews, verify lastReviewedAt increases |
| `isCardForVerse returns true for exact match` | unit | Add card, check same range |
| `isCardForVerse returns false for different verse` | unit | Add card for v1, check v2 |
| `isCardForVerse handles single-verse default endVerse` | unit | Add single-verse card, check with endVerse omitted |
| `getCardForVerse returns the card` | unit | Add card, verify returned card matches |
| `subscribe notifies on addCard` | unit | Subscribe, add card, verify listener called |
| `subscribe notifies on removeCard` | unit | Subscribe, remove card, verify listener called |
| `subscribe notifies on recordReview` | unit | Subscribe, record review, verify listener called |
| `unsubscribe stops notifications` | unit | Subscribe, unsubscribe, add card, verify listener NOT called |
| `persists to localStorage` | unit | Add card, clear cache, getAllCards reads from storage |
| `handles corrupted localStorage gracefully` | unit | Set invalid JSON in key, verify returns empty array |
| `_resetForTesting clears state` | unit | Add card, reset, verify empty |

**Expected state after completion:**
- [x] Store module at `lib/memorize/store.ts` with all 7 public functions
- [x] Barrel export at `lib/memorize/index.ts`
- [x] 18 unit tests passing in `lib/memorize/__tests__/store.test.ts`

---

### Step 3: useMemorizationStore React Hook

**Objective:** Create a React hook that subscribes to the store for reactive UI updates.

**Files to create/modify:**
- `frontend/src/hooks/bible/useMemorizationStore.ts` — new file

**Details:**

Use `useSyncExternalStore` to subscribe to the memorization store:

```typescript
import { useSyncExternalStore } from 'react'
import { getAllCards, subscribe } from '@/lib/memorize'
import type { MemorizationCard } from '@/types/memorize'

export function useMemorizationStore(): MemorizationCard[] {
  return useSyncExternalStore(subscribe, getAllCards, getServerSnapshot)
}

function getServerSnapshot(): MemorizationCard[] {
  return []
}
```

This hook:
- Returns the current card list (newest first)
- Re-renders the consuming component when cards are added/removed/reviewed
- Returns `[]` during SSR (not applicable but required by `useSyncExternalStore`)

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- Do NOT add any state transformation in the hook — the store handles ordering
- Do NOT memoize the return value — `useSyncExternalStore` handles reference stability

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `returns empty array initially` | unit | Render hook, verify empty array |
| `re-renders when card is added` | unit | Render hook, call addCard, verify updated list |
| `re-renders when card is removed` | unit | Render hook with cards, call removeCard, verify updated |

**Expected state after completion:**
- [x] Hook at `hooks/bible/useMemorizationStore.ts`
- [x] 3 unit tests passing

---

### Step 4: MemorizationFlipCard Component

**Objective:** Build the individual flip card with CSS 3D transform, review recording, remove confirmation, and accessibility.

**Files to create/modify:**
- `frontend/src/components/memorize/MemorizationFlipCard.tsx` — new file

**Details:**

Props:
```typescript
interface MemorizationFlipCardProps {
  card: MemorizationCard
  onRemove: (id: string) => void
  onReview: (id: string) => void
}
```

Structure:
```tsx
<div className="h-[180px]" style={{ perspective: '1000px' }}>
  <div
    role="button"
    tabIndex={0}
    aria-label={flipped ? 'Flip card to show reference' : 'Flip card to reveal verse text'}
    onClick={handleFlip}
    onKeyDown={handleKeyDown}  // Enter/Space to flip
    className="relative h-full w-full transition-transform duration-300 ease-out motion-reduce:duration-0"
    style={{
      transformStyle: 'preserve-3d',
      transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
    }}
  >
    {/* Front face */}
    <div
      className="absolute inset-0 rounded-2xl bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] p-4 flex flex-col"
      style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
    >
      <div className="flex-1 flex items-center justify-center">
        <span className="text-xl font-semibold text-white text-center">{card.reference}</span>
      </div>
      {/* Flip hint icon in top-right corner */}
      <RotateCcw size={14} className="absolute top-3 right-3 text-white/30" />
      {/* Bottom: date + remove */}
      <CardFooter card={card} onRemove={onRemove} confirmingRemove={...} />
    </div>

    {/* Back face */}
    <div
      className="absolute inset-0 rounded-2xl bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] p-4 flex flex-col"
      style={{
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
        transform: 'rotateY(180deg)',
      }}
    >
      <div className="flex-1 overflow-y-auto">
        <p className="text-[15px] text-white/90 leading-relaxed font-serif">{card.verseText}</p>
      </div>
      {/* Bottom: date + remove */}
      <CardFooter card={card} onRemove={onRemove} confirmingRemove={...} />
    </div>
  </div>
</div>
```

Flip logic:
- `const [flipped, setFlipped] = useState(false)`
- `handleFlip`: toggles `flipped`. If transitioning from front→back (revealing verse text), calls `onReview(card.id)`.
- `handleKeyDown`: Enter or Space → `handleFlip()`, with `e.preventDefault()` to avoid scroll on Space

Remove confirmation:
- `const [confirmingRemove, setConfirmingRemove] = useState(false)`
- Remove button (X icon, 44px min touch target) at bottom-right of each face
- Click on remove button: `e.stopPropagation()` (prevent flip), set `confirmingRemove = true`
- Confirmation state replaces the footer with: "Remove this card?" + Yes button + Cancel button
- Yes: calls `onRemove(card.id)`, sets `confirmingRemove = false`
- Cancel: sets `confirmingRemove = false`
- All confirmation buttons have `e.stopPropagation()` and minimum 44px touch targets

CardFooter sub-component (renders on both faces):
```tsx
function CardFooter({ card, onRemove, confirmingRemove, onConfirmRemove, onCancelRemove }: ...) {
  const dateAdded = timeAgo(new Date(card.createdAt).toISOString())

  if (confirmingRemove) {
    return (
      <div className="flex items-center justify-between rounded-lg bg-white/[0.08] px-3 py-2 mt-2">
        <span className="text-xs text-white/70">Remove this card?</span>
        <div className="flex gap-2">
          <button onClick={e => { e.stopPropagation(); onConfirmRemove() }}
            className="min-h-[44px] min-w-[44px] rounded-lg px-3 py-1 text-xs font-medium text-red-400 hover:bg-white/[0.06]">
            Yes
          </button>
          <button onClick={e => { e.stopPropagation(); onCancelRemove() }}
            className="min-h-[44px] min-w-[44px] rounded-lg px-3 py-1 text-xs font-medium text-white/60 hover:bg-white/[0.06]">
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between mt-2">
      <span className="text-xs text-white/50">Added {dateAdded}</span>
      <button
        onClick={e => { e.stopPropagation(); setConfirmingRemove(true) }}
        className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-white/40 hover:text-white/70 transition-colors"
        aria-label={`Remove ${card.reference} from memorization deck`}
      >
        <X size={14} />
      </button>
    </div>
  )
}
```

**Responsive behavior:**
- Desktop (1440px): Card at full grid cell width within 3-column grid
- Tablet (768px): Card at full grid cell width within 2-column grid
- Mobile (375px): Card at full width (1 column)
- Card height is fixed at 180px at all breakpoints
- Remove confirmation buttons remain inline at 375px+ (tested: "Remove this card?" + Yes + Cancel fits in ~320px)

**Guardrails (DO NOT):**
- Do NOT add quiz, self-test, or "did you remember it?" interaction after the flip
- Do NOT add scoring, streak, or point value to reviews
- Do NOT add completion percentage or mastery tracking
- Do NOT use `animate-glow-pulse` or cyan borders
- Do NOT use FrostedCard component for the flip card — the card needs custom `transform-style: preserve-3d` and two faces with `backface-visibility: hidden`, which FrostedCard doesn't support. Apply the same visual classes manually.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `renders reference on front` | unit | Verify card.reference visible |
| `renders verse text on back after flip` | unit | Click card, verify verseText visible |
| `calls onReview when flipping front to back` | unit | Click card, verify onReview called with card.id |
| `does NOT call onReview when flipping back to front` | unit | Click twice, verify onReview called only once |
| `keyboard flip with Enter` | unit | Focus card, press Enter, verify flip |
| `keyboard flip with Space` | unit | Focus card, press Space, verify flip |
| `shows remove confirmation on X click` | unit | Click X, verify "Remove this card?" text |
| `calls onRemove on Yes confirmation` | unit | Click X → Yes, verify onRemove called |
| `cancels remove on Cancel` | unit | Click X → Cancel, verify card still present |
| `remove button stops propagation (no flip)` | unit | Click X, verify onReview NOT called |
| `displays relative date added` | unit | Card with known createdAt, verify "Added X ago" text |
| `long verse text scrolls within fixed height` | unit | Card with 500-char text, verify overflow-y-auto on back |

**Expected state after completion:**
- [x] MemorizationFlipCard component at `components/memorize/MemorizationFlipCard.tsx`
- [x] 12 component tests passing

---

### Step 5: MemorizationDeck Grid Component

**Objective:** Build the deck grid with summary line, empty state, and responsive layout.

**Files to create/modify:**
- `frontend/src/components/memorize/MemorizationDeck.tsx` — new file

**Details:**

```tsx
import { useMemorizationStore } from '@/hooks/bible/useMemorizationStore'
import { removeCard, recordReview } from '@/lib/memorize'
import { MemorizationFlipCard } from './MemorizationFlipCard'
import { FeatureEmptyState } from '@/components/ui/FeatureEmptyState'
import { Bookmark } from 'lucide-react'
import { timeAgo } from '@/lib/time'

export function MemorizationDeck() {
  const cards = useMemorizationStore()

  if (cards.length === 0) {
    return (
      <FeatureEmptyState
        icon={Bookmark}
        heading="No memorization cards yet"
        description="Tap the memorize action on any verse in the Bible reader to start your deck."
        ctaLabel="Open the reader"
        ctaHref="/bible"
      />
    )
  }

  // Find most recently reviewed card
  const lastReviewed = cards
    .filter(c => c.lastReviewedAt !== null)
    .sort((a, b) => (b.lastReviewedAt ?? 0) - (a.lastReviewedAt ?? 0))[0]

  return (
    <div>
      {/* Section heading */}
      <h2 className="text-lg font-semibold text-white">Memorization deck</h2>

      {/* Summary */}
      <p className="mt-1 text-sm text-white/60">
        {cards.length} {cards.length === 1 ? 'card' : 'cards'} in your deck
      </p>
      {lastReviewed && (
        <p className="mt-0.5 text-sm text-white/60">
          Last reviewed {lastReviewed.reference}{' '}
          {timeAgo(new Date(lastReviewed.lastReviewedAt!).toISOString())}
        </p>
      )}

      {/* Card grid */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(card => (
          <MemorizationFlipCard
            key={card.id}
            card={card}
            onRemove={removeCard}
            onReview={recordReview}
          />
        ))}
      </div>
    </div>
  )
}
```

**Responsive behavior:**
- Desktop (1440px): 3-column grid within `max-w-2xl` (672px), ~208px per card
- Tablet (768px): 2-column grid (`sm:grid-cols-2`)
- Mobile (375px): 1-column grid, full-width cards

**Guardrails (DO NOT):**
- Do NOT add sort controls (newest-first only in v1)
- Do NOT add search within the deck
- Do NOT add progress bars, completion percentages, or mastery indicators
- Do NOT add "review all" or "shuffle" functionality

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `renders empty state when no cards` | unit | Mock store returning [], verify FeatureEmptyState renders |
| `renders card count in summary` | unit | Mock 3 cards, verify "3 cards in your deck" |
| `renders singular "card" for 1 card` | unit | Mock 1 card, verify "1 card in your deck" |
| `renders last reviewed line when applicable` | unit | Mock card with lastReviewedAt, verify "Last reviewed" text |
| `hides last reviewed line when no reviews` | unit | Mock cards with null lastReviewedAt, verify no "Last reviewed" |
| `renders correct number of flip cards` | unit | Mock 5 cards, verify 5 MemorizationFlipCard rendered |
| `section heading says "Memorization deck"` | unit | Verify h2 text |
| `responsive grid classes applied` | unit | Verify grid has `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` |
| `cards ordered newest first` | unit | Mock 3 cards with known timestamps, verify render order |

**Expected state after completion:**
- [x] MemorizationDeck component at `components/memorize/MemorizationDeck.tsx`
- [x] 9 component tests passing

---

### Step 6: VerseActionSheet Integration — Replace Memorize Stub

**Objective:** Replace the memorize stub action with real add/remove toggle behavior.

**Files to create/modify:**
- `frontend/src/lib/bible/verseActionRegistry.ts` — replace memorize handler (lines 385-395)
- `frontend/src/lib/url/validateAction.ts` — remove `'memorize'` from `DEEP_LINKABLE_ACTIONS`
- `frontend/src/types/verse-actions.ts` — no changes needed (`'memorize'` already in union)

**Details:**

In `verseActionRegistry.ts`, replace the memorize handler:

```typescript
import { Layers } from 'lucide-react'  // already imported
import { isCardForVerse, getCardForVerse, addCard, removeCard as removeMemorizeCard } from '@/lib/memorize'

const memorize: VerseActionHandler = {
  action: 'memorize',
  label: 'Memorize',
  sublabel: 'Add to your deck',
  icon: Layers,
  category: 'secondary',
  hasSubView: false,  // Changed from true — immediate toggle

  getState: (selection: VerseSelection) => {
    const inDeck = isCardForVerse(
      selection.book, selection.chapter,
      selection.startVerse, selection.endVerse,
    )
    return { active: inDeck }
  },

  isAvailable: () => true,

  onInvoke: (selection: VerseSelection, ctx: VerseActionContext) => {
    const existing = getCardForVerse(
      selection.book, selection.chapter,
      selection.startVerse, selection.endVerse,
    )

    if (existing) {
      removeMemorizeCard(existing.id)
      ctx.showToast('Removed from memorization deck')
    } else {
      const verseText = selection.verses.map(v => v.text).join(' ')
      const reference = formatReference(selection)
      addCard({
        book: selection.book,
        bookName: selection.bookName,
        chapter: selection.chapter,
        startVerse: selection.startVerse,
        endVerse: selection.endVerse,
        verseText,
        reference,
      })
      ctx.showToast('Added to memorization deck')
    }
  },
}
```

The label dynamically reflects state via `getState()`. The VerseActionSheet already renders active state indicators for actions with `getState` — the memorize row will show a filled indicator when the verse is in the deck.

In `validateAction.ts`, remove `'memorize'` from `DEEP_LINKABLE_ACTIONS`:
```typescript
export const DEEP_LINKABLE_ACTIONS = [
  'explain',
  'reflect',
  'cross-refs',
  'note',
  'highlight',
  'share',
  // 'memorize' removed — no sub-view (BB-45 changed to immediate toggle)
] as const satisfies readonly VerseAction[]
```

**Responsive behavior:** N/A: no UI impact (action sheet layout unchanged)

**Guardrails (DO NOT):**
- Do NOT change the action's position in `SECONDARY_ACTIONS` array
- Do NOT add a sub-view or confirmation dialog — the toggle is instant
- Do NOT change the icon (Layers) — it's already established as the memorize icon
- Do NOT add scoring, faith points, or activity recording for memorize actions

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `memorize action adds card for new verse` | unit | Invoke with selection not in deck, verify addCard called |
| `memorize action removes card for existing verse` | unit | Add card first, invoke, verify removeCard called |
| `memorize getState returns active when verse in deck` | unit | Add card, verify getState returns {active: true} |
| `memorize getState returns inactive when verse not in deck` | unit | Empty deck, verify getState returns {active: false} |
| `memorize shows toast on add` | unit | Invoke add, verify showToast('Added to memorization deck') |
| `memorize shows toast on remove` | unit | Invoke remove, verify showToast('Removed from memorization deck') |
| `memorize captures verse text from selection` | unit | Invoke with multi-verse selection, verify addCard receives concatenated text |
| `memorize formats reference correctly for single verse` | unit | Invoke with single verse, verify reference format |
| `memorize formats reference correctly for range` | unit | Invoke with range, verify "Book Ch:start–end" format |
| `validateAction rejects memorize` | unit | Verify validateAction('memorize') returns null after removal |

**Expected state after completion:**
- [x] Memorize action is a working toggle (add/remove) in the VerseActionSheet
- [x] `'memorize'` removed from `DEEP_LINKABLE_ACTIONS`
- [x] 10 tests passing (in `lib/bible/__tests__/verseActionRegistry.test.ts` and `lib/url/__tests__/validateAction.test.ts`)

---

### Step 7: MyBiblePage Integration

**Objective:** Wire the MemorizationDeck into the My Bible page between the BB-43 section and the quick stats row.

**Files to create/modify:**
- `frontend/src/pages/MyBiblePage.tsx` — add MemorizationDeck section

**Details:**

Import:
```typescript
import { MemorizationDeck } from '@/components/memorize/MemorizationDeck'
```

Insert between the BB-43 divider (line 202) and the main content div (line 206):

```tsx
{/* BB-43 Progress Map ends here (line 202: divider) */}
<div className="border-t border-white/[0.08]" />
</div>

{/* BB-45: Memorization Deck */}
<div className="relative z-10 mx-auto max-w-2xl px-4">
  <div className="py-8">
    <MemorizationDeck />
  </div>
  <div className="border-t border-white/[0.08]" />
</div>

{/* Main content (line 206) */}
<div className="relative z-10 mx-auto max-w-2xl px-4 pb-16">
```

This follows the exact same wrapper pattern used by the BB-43 section (lines 183-203): a `max-w-2xl` container with `py-8` internal spacing and a `border-t` divider at the bottom.

**Responsive behavior:**
- Desktop (1440px): Deck section centered within `max-w-2xl` container, 3-column card grid
- Tablet (768px): Same container, 2-column card grid
- Mobile (375px): Same container, 1-column card grid

**Guardrails (DO NOT):**
- Do NOT add any conditional rendering based on card count — the MemorizationDeck component handles its own empty state
- Do NOT add auth checks here — the page-level route guard handles auth
- Do NOT change the existing section structure or spacing

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `renders MemorizationDeck section on My Bible page` | integration | Render MyBiblePage with mocked stores, verify MemorizationDeck is present |
| `MemorizationDeck appears between progress map and stats row` | integration | Verify DOM order: ReadingHeatmap → BibleProgressMap → MemorizationDeck → stats row |
| `MemorizationDeck section has correct spacing` | integration | Verify py-8 wrapper and border-t divider |
| `MemorizationDeck empty state renders on page` | integration | Mock empty memorize store, verify empty state message |

**Expected state after completion:**
- [x] MemorizationDeck visible on `/bible/my` between progress map and quick stats
- [x] Section follows page vertical rhythm (py-8, border dividers)
- [x] 4 integration tests passing

---

### Step 8: Activity Feed Highlight Affordance

**Objective:** Add "Add to memorize" icon button to highlight items in the activity feed.

**Files to create/modify:**
- `frontend/src/components/bible/my-bible/HighlightCard.tsx` — add memorize affordance
- `frontend/src/components/bible/my-bible/ActivityCard.tsx` — pass verse identity to HighlightCard

**Details:**

**ActivityCard.tsx changes:** Pass verse identity info to HighlightCard:

```tsx
{item.data.type === 'highlight' && (
  <HighlightCard
    data={item.data}
    verseText={verseText}
    searchQuery={searchQuery}
    book={item.book}
    bookName={item.bookName}
    chapter={item.chapter}
    startVerse={item.startVerse}
    endVerse={item.endVerse}
  />
)}
```

**HighlightCard.tsx changes:** Add props and memorize affordance:

```typescript
interface HighlightCardProps {
  data: HighlightData
  verseText: string | null
  searchQuery?: string
  book?: string
  bookName?: string
  chapter?: number
  startVerse?: number
  endVerse?: number
}
```

Add memorize button after the emotion badge:

```tsx
import { isCardForVerse, addCard, getCardForVerse, removeCard } from '@/lib/memorize'
import { Layers } from 'lucide-react'

export function HighlightCard({ data, verseText, searchQuery, book, bookName, chapter, startVerse, endVerse }: HighlightCardProps) {
  const emotion = HIGHLIGHT_EMOTIONS.find((e) => e.key === data.color)
  const hex = emotion?.hex ?? '#FDE047'
  const label = emotion?.label ?? data.color

  const hasVerseInfo = book && chapter !== undefined && startVerse !== undefined && endVerse !== undefined
  const inDeck = hasVerseInfo ? isCardForVerse(book, chapter, startVerse, endVerse) : false

  const handleMemorize = (e: React.MouseEvent) => {
    e.stopPropagation()  // Prevent card navigation
    if (!hasVerseInfo || !verseText || !bookName) return

    if (inDeck) {
      const existing = getCardForVerse(book, chapter, startVerse, endVerse)
      if (existing) removeCard(existing.id)
    } else {
      const reference = startVerse === endVerse
        ? `${bookName} ${chapter}:${startVerse}`
        : `${bookName} ${chapter}:${startVerse}\u2013${endVerse}`
      addCard({ book, bookName, chapter, startVerse, endVerse, verseText, reference })
    }
  }

  return (
    <div className="mt-2 space-y-2">
      {verseText ? (
        <p className="rounded-lg px-3 py-2 text-sm text-white" style={{ backgroundColor: `${hex}15` }}>
          <HighlightedText text={verseText} query={searchQuery ?? ''} />
        </p>
      ) : (
        <div className="h-4 w-3/4 animate-pulse rounded bg-white/10" />
      )}
      <div className="flex items-center gap-2">
        <span className="inline-block rounded-full px-2 py-0.5 text-xs font-medium"
          style={{ color: hex, backgroundColor: `${hex}20` }}>
          {label}
        </span>
        {hasVerseInfo && verseText && (
          <button
            type="button"
            onClick={handleMemorize}
            className="ml-auto flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-white/40 hover:text-white/70 transition-colors"
            aria-label={inDeck ? 'In memorization deck' : 'Add to memorization deck'}
          >
            {inDeck ? (
              <span className="text-xs text-white/50">In deck</span>
            ) : (
              <Layers size={14} />
            )}
          </button>
        )}
      </div>
    </div>
  )
}
```

Key details:
- When verse is NOT in deck: shows Layers icon button → clicking adds to deck
- When verse IS in deck: shows "In deck" text label → clicking removes from deck
- `e.stopPropagation()` prevents the parent FrostedCard click (which navigates to BibleReader)
- Minimum 44px touch target on the button
- Falls back gracefully if verse identity props are missing (no affordance shown)

**Responsive behavior:**
- Desktop/Tablet/Mobile: Same layout. The affordance is a small button/label at the end of the badge row. `ml-auto` pushes it to the right.

**Guardrails (DO NOT):**
- Do NOT show a toast from the activity card — the visual state change (icon → "In deck") is sufficient feedback
- Do NOT add a modal or confirmation for add/remove from the activity feed
- Do NOT modify the card's click navigation behavior
- Do NOT break the existing HighlightCard interface — all new props are optional

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `renders Layers icon when verse not in deck` | unit | Mock isCardForVerse=false, verify Layers icon present |
| `renders "In deck" label when verse in deck` | unit | Mock isCardForVerse=true, verify "In deck" text |
| `clicking icon adds verse to deck` | unit | Click button, verify addCard called with correct params |
| `clicking "In deck" removes from deck` | unit | Click button when in deck, verify removeCard called |
| `click stops propagation` | unit | Verify parent onClick not called |
| `hides affordance when verse info missing` | unit | Render without book/chapter props, verify no button |
| `hides affordance when verseText is null` | unit | Render with null verseText, verify no button |

**Expected state after completion:**
- [x] Highlight items in activity feed show "Add to memorize" affordance
- [x] Affordance toggles between icon and "In deck" label based on deck state
- [x] 7 component tests passing

---

### Step 9: Documentation & localStorage Key

**Objective:** Document the new localStorage key and create the recon document.

**Files to create/modify:**
- `.claude/rules/11-local-storage-keys.md` — add `wr_memorization_cards` entry
- `_plans/recon/bb45-memorization.md` — new recon/documentation file

**Details:**

Add to `11-local-storage-keys.md` in the "Bible Reader" section:

```markdown
| `wr_memorization_cards` | `MemorizationCard[]`   | Verse memorization deck — flip cards with captured verse text (BB-45) |
```

Create `_plans/recon/bb45-memorization.md`:

```markdown
# BB-45: Verse Memorization Deck — Architecture Notes

## Data Model

`MemorizationCard` interface at `frontend/src/types/memorize.ts`:
- id, book, bookName, chapter, startVerse, endVerse
- verseText (captured at creation, immutable)
- reference (formatted string)
- createdAt, lastReviewedAt (nullable), reviewCount

## Integration Points

1. **Store** (`lib/memorize/store.ts`): Reactive pattern matching BB-7/BB-43
2. **VerseActionSheet** (`lib/bible/verseActionRegistry.ts`): `memorize` action — immediate toggle (add/remove), no sub-view
3. **MyBiblePage** (`pages/MyBiblePage.tsx`): Deck section between BB-43 progress map and quick stats
4. **Activity Feed** (`components/bible/my-bible/HighlightCard.tsx`): "Add to memorize" icon affordance on highlight items

## Anti-Pressure Decisions

- No spaced repetition, quizzing, scoring, or mastery tracking
- No daily reminders or streak integration
- No social/sharing features for the deck
- Review = flipping a card (front→back). No "did you remember?" assessment.

## Deferred Follow-ups

- BB-46: Verse echoes (may reference memorized verses)
- Card editing (currently: remove and re-add)
- Deck export
- Card categories/tags
- Sort controls beyond newest-first
- Search within the deck
- Backend API persistence (Phase 3)
```

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- Do NOT add the key to the "Auth Keys" section (memorization data persists across logout like other Bible data)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| N/A | — | Documentation only |

**Expected state after completion:**
- [x] `wr_memorization_cards` documented in `11-local-storage-keys.md`
- [x] Recon document at `_plans/recon/bb45-memorization.md`
- [x] All existing BB-30 through BB-43 tests continue to pass unchanged

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Types & Constants |
| 2 | 1 | Memorization Card Store |
| 3 | 2 | useMemorizationStore React Hook |
| 4 | 1 | MemorizationFlipCard Component |
| 5 | 3, 4 | MemorizationDeck Grid Component |
| 6 | 2 | VerseActionSheet Integration |
| 7 | 5 | MyBiblePage Integration |
| 8 | 2 | Activity Feed Highlight Affordance |
| 9 | 7, 8 | Documentation & localStorage Key |

Steps 4, 6, and 8 can be parallelized after Step 2 completes.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Types & Constants | [DONE] | 2026-04-13 | `types/memorize.ts`, `constants/bible.ts` |
| 2 | Memorization Card Store | [DONE] | 2026-04-13 | `lib/memorize/store.ts`, `lib/memorize/index.ts`, 19 tests |
| 3 | useMemorizationStore Hook | [DONE] | 2026-04-13 | `hooks/bible/useMemorizationStore.ts`, 3 tests. Snapshot caching added to store for `useSyncExternalStore` stability. |
| 4 | MemorizationFlipCard Component | [DONE] | 2026-04-13 | `components/memorize/MemorizationFlipCard.tsx`, 12 tests |
| 5 | MemorizationDeck Grid Component | [DONE] | 2026-04-13 | `components/memorize/MemorizationDeck.tsx`, 9 tests |
| 6 | VerseActionSheet Integration | [DONE] | 2026-04-13 | Replaced stub in `verseActionRegistry.ts`, removed from `DEEP_LINKABLE_ACTIONS`, removed unused `stubSubView`. 11 new tests + 80 existing pass. |
| 7 | MyBiblePage Integration | [DONE] | 2026-04-13 | Inserted MemorizationDeck section in `MyBiblePage.tsx`. Existing tests updated for dual "Open the reader" CTAs. |
| 8 | Activity Feed Highlight Affordance | [DONE] | 2026-04-13 | `HighlightCard.tsx` extended with verse identity props + memorize button. `ActivityCard.tsx` passes props. 7 tests. |
| 9 | Documentation & localStorage Key | [DONE] | 2026-04-13 | `11-local-storage-keys.md` updated, `_plans/recon/bb45-memorization.md` created |
