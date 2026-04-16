# Implementation Plan: BB-9 Cross-References

**Spec:** `_specs/bb-9-cross-references.md`
**Date:** 2026-04-08
**Branch:** `bible-redesign`
**Design System Reference:** `_plans/recon/design-system.md` (loaded — captured 2026-04-05)
**Recon Report:** not applicable
**Master Spec Plan:** N/A — standalone feature within Bible redesign wave

---

## Architecture Context

### Project Structure

Bible reader files relevant to BB-9:

- **Cross-ref loader:** `src/lib/bible/crossRefs/loader.ts` (new)
- **Cross-ref sort:** `src/lib/bible/crossRefs/sort.ts` (new)
- **Cross-ref navigation:** `src/lib/bible/crossRefs/navigation.ts` (new)
- **Cross-ref types:** `src/types/bible.ts` — add `CrossRef`, `CrossRefMap`, `CrossRefBookJson` interfaces
- **Badge interface:** `src/types/verse-actions.ts` — add `renderBadge` to `VerseActionHandler`
- **Data files:** `src/data/bible/cross-references/{bookSlug}.json` — 66 pre-existing JSON files. Shape: `{ book, slug, entries: { "{chapter}.{verse}": [{ ref, rank }] } }`. Ref format: `bookSlug.chapter.verse`. Ranks: 1–4 (1 = strongest).
- **Registry:** `src/lib/bible/verseActionRegistry.ts` — replace cross-refs stub (lines 330-340) with real handler
- **Action sheet:** `src/components/bible/reader/VerseActionSheet.tsx` — add badge rendering to secondary actions, add X close button to sub-view header
- **Reader page:** `src/pages/BibleReader.tsx` — add cross-ref preloading for current book
- **Sub-view component:** `src/components/bible/reader/CrossRefsSubView.tsx` (new)

### Cross-Reference Data Format

Each per-book JSON file:
```json
{
  "book": "John",
  "slug": "john",
  "entries": {
    "1.1": [{ "ref": "john.1.14", "rank": 1 }, { "ref": "revelation.22.13", "rank": 1 }],
    "3.16": [{ "ref": "john.11.25", "rank": 1 }, ...] // 23 refs
  }
}
```

- Keys are `{chapter}.{verse}` (dot-separated)
- Refs are `{bookSlug}.{chapter}.{verse}` (dot-separated, matching `BIBLE_BOOKS` slug convention)
- Ranks are integers 1–4 (1 = strongest, 4 = loosest)
- Some verses have no entry (absent key = no cross-refs)
- Max refs per verse observed: 62 (Genesis 1:1)
- Total refs per book: ~11,800 (John)

### Existing Patterns to Follow

- **Dynamic import pattern** (`data/bible/index.ts` lines 20-25): `BIBLE_BOOKS.map(b => [b.slug, () => import(...)])` creates lazy loaders. Vite caches resolved modules, so subsequent calls return instantly.
- **loadChapterWeb** (`data/bible/index.ts` lines 27-48): Async loader with try/catch → null on error. Used to load verse text for cross-ref previews.
- **Store-like module cache pattern** (`bookmarkStore.ts`): Module-level `cache` variable + `_resetCacheForTesting()` export. Same pattern for cross-ref in-memory cache.
- **Action handler pattern** (`verseActionRegistry.ts` line 330): Cross-refs stub has `action: 'cross-refs'`, `label: 'Cross-references'`, `sublabel: 'See related verses'`, `icon: Link2`, `category: 'secondary'`, `hasSubView: true`, `renderSubView: stubSubView(...)`.
- **Sub-view component pattern** (`NoteEditorSubView.tsx`): Receives `{ selection, onBack, context }` props. `context.showToast()` for feedback. `context.closeSheet()` for dismissal. Renders content below the VerseActionSheet-provided header (back + title).
- **VerseActionSheet sub-view chrome** (lines 292-318): The sheet provides a header with `[← Back] Title` and a divider, then renders the sub-view's content in `<div className="flex-1 overflow-y-auto">`. The sub-view component is responsible for everything below the divider.
- **Secondary action row rendering** (lines 404-430): `icon + label/sublabel + ChevronRight` in a `min-h-[44px]` button. Badge will be inserted between the label div and the chevron.
- **formatReference** (`verseActionRegistry.ts` line 46): Returns "John 3:16" or "John 3:16–18" (en-dash).
- **BibleReader preloading** (lines 92-166): `useState` initialized from store getter + `useEffect` to refresh on chapter change + `useEffect` with `subscribe()`. For cross-refs, we add a fire-and-forget `loadCrossRefsForBook(bookSlug)` call on mount/book change.
- **getBookBySlug** (`data/bible/index.ts` line 79): `BIBLE_BOOKS.find(b => b.slug === slug)` — used to convert slug to display name for cross-ref row labels.

### Test Patterns

- Vitest + `describe/it/expect`
- `vi.resetModules()` + dynamic `import()` for module-level state isolation (loader cache tests)
- Factory helpers for test data
- `@testing-library/react` + `render/screen/fireEvent/waitFor` for component tests
- No provider wrapping needed — Bible reader is a public page, no auth context needed
- Toast mock: `vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ showToast: vi.fn() }) }))`
- Router mock: `vi.mock('react-router-dom', ...)` with `useNavigate` returning `vi.fn()`

---

## Auth Gating Checklist

**No auth gate on any cross-reference action.** Cross-references are read-only from public-domain static JSON. Both logged-in and logged-out users have identical experiences. This matches the pattern from BB-7 (highlights), BB-7.5 (bookmarks), and BB-8 (notes).

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| View cross-ref count badge | Visible for all users | Step 7 | None — public |
| Tap Cross-references row | Opens sub-view for all users | Step 7 | None — public |
| Browse cross-reference list | Full access | Step 6 | None — public |
| Sort cross-references | Works for all users | Step 6 | None — public |
| Tap row to navigate | Navigates for all users | Step 6 | None — public |

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Action sheet bg | background | `rgba(15, 10, 30, 0.95)` + `backdrop-blur(16px)` | VerseActionSheet.tsx:278-279 |
| Secondary action row | min-height | `min-h-[44px]` | VerseActionSheet.tsx:412 |
| Secondary action icon | color | `text-white/60` | VerseActionSheet.tsx:415 |
| Secondary action label | color | `text-sm text-white` | VerseActionSheet.tsx:417 |
| Secondary action sublabel | color | `text-xs text-white/50` | VerseActionSheet.tsx:419 |
| Chevron (secondary) | color | `text-white/30` | VerseActionSheet.tsx:424 |
| Divider | border | `border-t border-white/[0.08]` | VerseActionSheet.tsx:307 |
| Sub-view header title | font | `font-semibold text-white` | VerseActionSheet.tsx:305 |
| Icon button (small) | class | `flex min-h-[36px] min-w-[36px] items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white` | VerseActionSheet.tsx:22-23 |
| Verse preview strip | color | `text-sm text-white/50` | VerseActionSheet.tsx:361 |
| Footer caption | color | `text-xs text-white/40` | VerseActionSheet.tsx:434 |
| Rank dot (rank 1) | opacity | 1.0 | Spec design notes |
| Rank dot (rank 2) | opacity | 0.6 | Spec design notes |
| Rank dot (rank 3) | opacity | 0.4 | Spec design notes |
| Rank dot (rank 4+) | opacity | 0.2 | Spec design notes |
| Badge (count) | style | `text-xs bg-white/[0.12] text-white/70 rounded-full px-1.5 py-0.5 tabular-nums` | Derived from action sheet chrome — [UNVERIFIED] |
| Badge (loading) | style | `h-2 w-2 rounded-full bg-white/40 animate-pulse` | Spec requirement 16 |
| Sort toggle active | style | `bg-white/[0.12] text-white` | Reader chrome — [UNVERIFIED] |
| Sort toggle inactive | style | `text-white/50` | Reader chrome — [UNVERIFIED] |
| Empty state icon | opacity | `text-white/20` | Design system decorative range |
| Empty state heading | color | `text-white` | Inner page text standard |
| Empty state subtext | color | `text-white/50` | Secondary text standard |

**[UNVERIFIED] values:**
- Badge styling: derived from existing action sheet chrome patterns. → To verify: visual inspection during `/verify-with-playwright`. → If wrong: adjust to match existing badge patterns in the app.
- Sort toggle styling: derived from reader's segmented control patterns. → To verify: compare against TypographySheet toggle styling. → If wrong: match TypographySheet's active/inactive treatment.

---

## Design System Reminder

**Project-specific quirks displayed before every UI step:**

- The Bible reader action sheet uses `rgba(15, 10, 30, 0.95)` dark frosted glass, NOT FrostedCard. Sub-view components inherit this background.
- All colors in the cross-refs sub-view use design system tokens or Tailwind theme classes. Zero raw hex values. Use `text-white`, `text-white/50`, `bg-white/[0.06]`, etc.
- The reader has 3 themes (midnight, parchment, sepia) — cross-ref sub-view inherits theme via the action sheet's existing scoping. No new CSS custom properties needed.
- Touch targets: minimum 44px height on all tappable rows (`min-h-[44px]`).
- Reduced motion: skeleton fade-in transitions and sub-view push/pop should respect `prefers-reduced-motion`. With reduced motion, skip transitions.
- The VerseActionSheet sub-view header is provided by the sheet (back + title). The sub-view component renders content below the divider.
- Do NOT use FrostedCard inside the sub-view. Use the action sheet's existing list styling with `border-white/[0.08]` separators.
- Do NOT add GlowBackground or HorizonGlow. The action sheet has its own frosted glass styling.
- `getBookBySlug(slug)` from `data/bible/index.ts` converts slugs to display names.
- `BIBLE_BOOKS` from `constants/bible.ts` provides canonical book ordering for canonical sort.

---

## Shared Data Models (from Master Plan)

N/A — standalone feature. No shared data models from a master plan.

**New types this spec introduces:**

```typescript
// types/bible.ts additions

/** Raw cross-reference entry from JSON data */
export interface CrossRefEntry {
  ref: string     // "bookSlug.chapter.verse" e.g. "romans.5.8"
  rank: number    // 1-4, 1 = strongest
}

/** Parsed cross-reference with resolved book/chapter/verse */
export interface CrossRef {
  ref: string           // original ref string
  rank: number
  parsed: {
    book: string        // slug e.g. "romans"
    chapter: number
    verse: number
  }
  sourceVerse?: number  // which source verse this came from (for multi-verse)
}

/** Map of "{chapter}.{verse}" → CrossRef[] for a single book */
export type CrossRefMap = Map<string, CrossRef[]>

/** Shape of per-book JSON file */
export interface CrossRefBookJson {
  book: string
  slug: string
  entries: Record<string, CrossRefEntry[]>
}
```

```typescript
// types/verse-actions.ts addition

export interface VerseActionHandler {
  // ... existing fields ...
  /** Optional badge to render next to the chevron in secondary actions */
  renderBadge?: (selection: VerseSelection) => React.ReactNode
}
```

**localStorage keys this spec touches:**

| Key | Read/Write | Description |
|-----|-----------|-------------|
| None | — | This spec uses no localStorage. In-memory cache only. |

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | Sub-view fills action sheet width (full-width bottom sheet). Sort toggle is full-width segmented control. Cross-ref rows stack reference label above verse preview. Touch targets 44px min. Footer caption wraps if needed. |
| Tablet | 768px | Same as mobile — action sheet is 440px centered bottom sheet on all screen sizes. |
| Desktop | 1440px | Same layout within the 440px action sheet. Hover states on cross-ref rows (`hover:bg-white/[0.06]`). |

The action sheet itself handles responsive width/height — the cross-references sub-view fills whatever space the sheet provides. No breakpoint-specific layout changes needed.

---

## Inline Element Position Expectations (UI features with inline rows)

| Element Group | Elements | Expected y-alignment | Wrap Tolerance |
|---------------|----------|---------------------|----------------|
| Sort toggle | "Strongest first" button, "Canonical order" button | Same y at all widths | No wrapping — buttons fill container equally |
| Badge + chevron | Count badge, ChevronRight | Same y ±5px | No wrapping — both right-aligned in flex row |

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| Sub-view header → subtitle | 0px (subtitle is first content below divider) | Inline with content |
| Subtitle → context strip | 8px (`py-2` padding) | Matching existing verse preview strip |
| Context strip → sort toggle | 0px (divider between) | Existing divider pattern |
| Sort toggle → first cross-ref row | 0px (divider between) | Existing divider pattern |
| Last cross-ref row → footer | 0px (divider between) | Existing footer pattern |

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] Cross-reference data exists at `src/data/bible/cross-references/` with 66 files
- [x] Data format matches spec: `{ book, slug, entries: { "ch.v": [{ ref, rank }] } }`
- [x] Ranks range 1–4 across all books
- [x] Existing `CrossRefsStub` in registry at line 337 ready to replace
- [ ] All auth-gated actions from the spec are accounted for (none — all public)
- [ ] Design system values are verified (from VerseActionSheet source code)
- [ ] All [UNVERIFIED] values are flagged with verification methods (2 flagged)
- [ ] No deprecated patterns used
- [ ] BB-8 (notes) is complete and committed on this branch

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Multi-verse grouping vs flat list | Always flat (no subheaders) for both sort modes | Spec #34 explicitly states "Ungrouped sort modes (strongest first / canonical) flatten everything into one list without subheaders." Since both available sort modes are defined as ungrouped, grouping from #33 is not triggered. A future "Grouped by verse" sort option could add this. |
| Multi-verse deduplication | Deduplicate by `ref` string across all source verses | Spec #18-19: union of cross-refs, deduplicated by destination ref |
| Multi-verse sourceVerse tracking | Each CrossRef carries `sourceVerse` field | Not displayed in flat sort modes, but preserved for future grouped mode |
| Sort persistence | React `useRef` (per-session only) | Spec #29: sort selection is per-session, not persisted to localStorage |
| Cache invalidation | None — cache persists until full page reload | Spec #9: in-memory Map clears on reload. No stale data concern (static JSON). |
| Missing book JSON | Return empty Map, cache it | Spec #10: fail gracefully without crashing. Caching empty prevents retries. |
| Duplicate in-flight loads | Track loading promises in a Map to prevent duplicate fetches | loadCrossRefsForBook deduplicates concurrent calls for the same book |
| Rank indicator visual | Small circle (6px) with opacity scaling by rank | Spec design notes: rank 1 = full opacity, 2 = 0.6, 3 = 0.4, 4+ = 0.2 |
| Verse text loading for previews | Group by dest book+chapter, load in parallel via loadChapterWeb | Vite caches dynamic imports, so same-book refs share one load |
| Navigation on tap | Navigate to `/bible/{book}/{chapter}` (no verse anchor) | Spec #42-45: BB-38 will add verse anchoring later |
| X close button in sub-view header | Add to VerseActionSheet generically (all sub-views benefit) | Spec #24: close button closes entire sheet. Useful for all sub-views. |

---

## Implementation Steps

### Step 1: Types

**Objective:** Add CrossRef types to `types/bible.ts` and `renderBadge` to `VerseActionHandler` in `types/verse-actions.ts`.

**Files to create/modify:**
- `src/types/bible.ts` — Add `CrossRefEntry`, `CrossRef`, `CrossRefMap`, `CrossRefBookJson` interfaces
- `src/types/verse-actions.ts` — Add optional `renderBadge` to `VerseActionHandler`

**Details:**

Add to `src/types/bible.ts` (after the `Note` interface, before the deprecated `BibleNote`):

```typescript
/** Raw cross-reference entry from JSON data */
export interface CrossRefEntry {
  ref: string     // "bookSlug.chapter.verse" e.g. "romans.5.8"
  rank: number    // 1-4, 1 = strongest
}

/** Parsed cross-reference with resolved book/chapter/verse */
export interface CrossRef {
  ref: string
  rank: number
  parsed: {
    book: string    // slug
    chapter: number
    verse: number
  }
  sourceVerse?: number  // which source verse this came from (multi-verse selections)
}

/** Map of "{chapter}.{verse}" → CrossRef[] for a single book */
export type CrossRefMap = Map<string, CrossRef[]>

/** Shape of per-book cross-reference JSON file */
export interface CrossRefBookJson {
  book: string
  slug: string
  entries: Record<string, CrossRefEntry[]>
}
```

Add to `VerseActionHandler` in `src/types/verse-actions.ts`:

```typescript
/** Optional badge to render next to the chevron in secondary action rows */
renderBadge?: (selection: VerseSelection) => React.ReactNode
```

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- Do NOT remove or modify existing types (BibleVerse, BibleChapter, Highlight, Bookmark, Note, BibleNote)
- Do NOT add `sourceVerse` as required — it is optional (only populated for multi-verse selections)

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| N/A | — | Type-only step — TypeScript compiler validates. No runtime tests. |

**Expected state after completion:**
- [ ] `CrossRef`, `CrossRefEntry`, `CrossRefMap`, `CrossRefBookJson` types exist in `types/bible.ts`
- [ ] `renderBadge` is an optional field on `VerseActionHandler`
- [ ] Build passes (`pnpm build`)
- [ ] Existing tests still pass

---

### Step 2: Loader — TDD Tests

**Objective:** Write failing tests for the cross-reference loader module (red phase).

**Files to create/modify:**
- `src/lib/bible/crossRefs/__tests__/loader.test.ts` — New test file

**Details:**

Follow the test pattern from `src/lib/bible/__tests__/bookmarkStore.test.ts`: use `vi.resetModules()` + dynamic `import()` for fresh module state in each test.

Mock `src/data/bible/cross-references/*.json` dynamic imports using `vi.mock` with a factory that returns test data.

Test cases:

1. `loadCrossRefsForBook` — loads and parses JSON, returns a CrossRefMap with parsed refs
2. `loadCrossRefsForBook` — returns cached map on second call (verify import called once)
3. `loadCrossRefsForBook` — returns empty map for missing/corrupt book file (no crash)
4. `getCrossRefsForVerse` — returns refs for an existing `{chapter}.{verse}` key
5. `getCrossRefsForVerse` — returns empty array for missing verse key
6. `getCrossRefCountForVerse` — returns correct count
7. `getCrossRefCountForVerse` — returns 0 for missing verse
8. `isBookCached` — returns false before load, true after load
9. `getDeduplicatedCrossRefCount` — deduplicates across multiple verses in a range
10. `getDeduplicatedCrossRefCount` — handles overlapping refs correctly (count = union size)
11. `parseRef` — parses "romans.5.8" to `{ book: "romans", chapter: 5, verse: 8 }`
12. `parseRef` — parses slugs with hyphens "1-corinthians.13.4" correctly
13. `_resetCacheForTesting` — clears the in-memory cache

Create a factory helper:
```typescript
function makeCrossRefBookJson(slug: string, entries: Record<string, Array<{ ref: string; rank: number }>>): CrossRefBookJson {
  return { book: slug.charAt(0).toUpperCase() + slug.slice(1), slug, entries }
}
```

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- Do NOT import from the loader module at the top level — use dynamic `import()` inside tests for module isolation
- Do NOT create real JSON files — mock the dynamic imports

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `loadCrossRefsForBook` success | unit | Loads JSON, returns CrossRefMap with parsed entries |
| `loadCrossRefsForBook` cached | unit | Second call returns same map without re-importing |
| `loadCrossRefsForBook` error | unit | Missing book returns empty map gracefully |
| `getCrossRefsForVerse` found | unit | Returns CrossRef[] for existing key |
| `getCrossRefsForVerse` missing | unit | Returns [] for absent key |
| `getCrossRefCountForVerse` | unit | Returns correct count |
| `getDeduplicatedCrossRefCount` | unit | Union count across multi-verse range |
| `getDeduplicatedCrossRefCount` overlap | unit | Deduplicates overlapping destination refs |
| `parseRef` standard | unit | Parses "romans.5.8" |
| `parseRef` hyphenated | unit | Parses "1-corinthians.13.4" |
| `isBookCached` | unit | false before load, true after |
| `_resetCacheForTesting` | unit | Clears cache |
| `loadCrossRefsForBook` dedup concurrent | unit | Concurrent calls share same promise |

**Expected state after completion:**
- [ ] Test file exists with ~13 test cases
- [ ] All tests fail (loader module doesn't exist yet)

---

### Step 3: Loader Implementation

**Objective:** Implement the cross-reference loader module (green phase).

**Files to create/modify:**
- `src/lib/bible/crossRefs/loader.ts` — New module

**Details:**

```typescript
import { BIBLE_BOOKS } from '@/constants/bible'
import type { CrossRef, CrossRefMap, CrossRefBookJson, CrossRefEntry } from '@/types/bible'

// --- Module-level cache ---
const cache = new Map<string, CrossRefMap>()
const inflight = new Map<string, Promise<CrossRefMap>>()

// --- Dynamic import map (same pattern as data/bible/index.ts) ---
const CROSS_REF_LOADERS: Record<string, () => Promise<CrossRefBookJson>> = Object.fromEntries(
  BIBLE_BOOKS.map((b) => [
    b.slug,
    () => import(`@/data/bible/cross-references/${b.slug}.json`).then((m) => m.default as CrossRefBookJson),
  ]),
)

/** Parse a ref string "bookSlug.chapter.verse" into components */
export function parseRef(ref: string): { book: string; chapter: number; verse: number } {
  // Split from the right: last segment = verse, second-to-last = chapter, rest = book slug
  const lastDot = ref.lastIndexOf('.')
  const secondLastDot = ref.lastIndexOf('.', lastDot - 1)
  return {
    book: ref.slice(0, secondLastDot),
    chapter: parseInt(ref.slice(secondLastDot + 1, lastDot), 10),
    verse: parseInt(ref.slice(lastDot + 1), 10),
  }
}

/** Load cross-references for a book. Returns cached map if available. */
export async function loadCrossRefsForBook(bookSlug: string): Promise<CrossRefMap> {
  const cached = cache.get(bookSlug)
  if (cached) return cached

  const existing = inflight.get(bookSlug)
  if (existing) return existing

  const loader = CROSS_REF_LOADERS[bookSlug]
  if (!loader) {
    const empty: CrossRefMap = new Map()
    cache.set(bookSlug, empty)
    return empty
  }

  const promise = loader()
    .then((data) => {
      const map: CrossRefMap = new Map()
      for (const [key, entries] of Object.entries(data.entries)) {
        map.set(
          key,
          entries.map((e) => ({
            ref: e.ref,
            rank: e.rank,
            parsed: parseRef(e.ref),
          })),
        )
      }
      cache.set(bookSlug, map)
      inflight.delete(bookSlug)
      return map
    })
    .catch(() => {
      const empty: CrossRefMap = new Map()
      cache.set(bookSlug, empty)
      inflight.delete(bookSlug)
      return empty
    })

  inflight.set(bookSlug, promise)
  return promise
}

/** Get cross-refs for a specific verse (sync — requires map from loadCrossRefsForBook) */
export function getCrossRefsForVerse(map: CrossRefMap, chapter: number, verse: number): CrossRef[] {
  return map.get(`${chapter}.${verse}`) ?? []
}

/** Get count of cross-refs for a verse (sync) */
export function getCrossRefCountForVerse(map: CrossRefMap, chapter: number, verse: number): number {
  return (map.get(`${chapter}.${verse}`) ?? []).length
}

/** Check if a book's cross-refs are already cached (sync) */
export function isBookCached(bookSlug: string): boolean {
  return cache.has(bookSlug)
}

/** Get cached map for a book (sync, returns null if not cached) */
export function getCachedBook(bookSlug: string): CrossRefMap | null {
  return cache.get(bookSlug) ?? null
}

/**
 * Get deduplicated cross-ref count for a verse range (multi-verse selection).
 * Deduplicates by destination ref string across all verses in the range.
 */
export function getDeduplicatedCrossRefCount(
  map: CrossRefMap,
  chapter: number,
  startVerse: number,
  endVerse: number,
): number {
  if (startVerse === endVerse) {
    return getCrossRefCountForVerse(map, chapter, startVerse)
  }
  const seen = new Set<string>()
  for (let v = startVerse; v <= endVerse; v++) {
    const refs = getCrossRefsForVerse(map, chapter, v)
    for (const ref of refs) {
      seen.add(ref.ref)
    }
  }
  return seen.size
}

/**
 * Collect all cross-refs for a verse range, deduplicated, with sourceVerse tracking.
 * For duplicate destination refs, keeps the entry from the lowest source verse.
 */
export function collectCrossRefsForRange(
  map: CrossRefMap,
  chapter: number,
  startVerse: number,
  endVerse: number,
): CrossRef[] {
  const seen = new Map<string, CrossRef>()
  for (let v = startVerse; v <= endVerse; v++) {
    const refs = getCrossRefsForVerse(map, chapter, v)
    for (const ref of refs) {
      if (!seen.has(ref.ref)) {
        seen.set(ref.ref, { ...ref, sourceVerse: v })
      }
    }
  }
  return Array.from(seen.values())
}

/** Reset cache — test-only */
export function _resetCacheForTesting(): void {
  cache.clear()
  inflight.clear()
}
```

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- Do NOT persist to localStorage — in-memory only per spec
- Do NOT throw on missing/corrupt files — return empty map
- Do NOT load all 66 books eagerly — load on demand via dynamic import

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| All 13 tests from Step 2 | unit | Must all pass (green phase) |

**Expected state after completion:**
- [ ] `src/lib/bible/crossRefs/loader.ts` exists
- [ ] All 13 loader tests pass
- [ ] Build passes

---

### Step 4: Sort — TDD Tests + Implementation

**Objective:** Write sort utility tests and implementation in one step (small scope).

**Files to create/modify:**
- `src/lib/bible/crossRefs/__tests__/sort.test.ts` — New test file
- `src/lib/bible/crossRefs/sort.ts` — New module

**Details:**

**Sort utilities:**

```typescript
import { BIBLE_BOOKS } from '@/constants/bible'
import type { CrossRef } from '@/types/bible'

const BOOK_ORDER = new Map(BIBLE_BOOKS.map((b, i) => [b.slug, i]))

/** Sort by rank ascending (strongest first). Stable within equal ranks. */
export function sortByStrength(refs: CrossRef[]): CrossRef[] {
  return [...refs].sort((a, b) => a.rank - b.rank)
}

/** Sort by canonical Bible order: book order → chapter → verse. */
export function sortByCanonicalOrder(refs: CrossRef[]): CrossRef[] {
  return [...refs].sort((a, b) => {
    const bookDiff = (BOOK_ORDER.get(a.parsed.book) ?? 999) - (BOOK_ORDER.get(b.parsed.book) ?? 999)
    if (bookDiff !== 0) return bookDiff
    const chapterDiff = a.parsed.chapter - b.parsed.chapter
    if (chapterDiff !== 0) return chapterDiff
    return a.parsed.verse - b.parsed.verse
  })
}
```

**Test cases:**

1. `sortByStrength` — rank 1 before rank 2 before rank 3
2. `sortByStrength` — stable within equal ranks (preserves insertion order)
3. `sortByStrength` — empty array returns empty
4. `sortByCanonicalOrder` — Genesis before Exodus before Revelation
5. `sortByCanonicalOrder` — same book: chapter 1 before chapter 2
6. `sortByCanonicalOrder` — same book+chapter: verse 1 before verse 2
7. `sortByCanonicalOrder` — cross-testament ordering (OT before NT)
8. `sortByStrength` — does not mutate original array

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- Do NOT mutate the input array — return a new sorted array (`[...refs].sort(...)`)
- Do NOT import anything from the loader module — sort is pure, no side effects

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| sortByStrength rank ordering | unit | rank 1 → 2 → 3 → 4 |
| sortByStrength stability | unit | Equal ranks preserve insertion order |
| sortByStrength empty | unit | Returns [] |
| sortByCanonicalOrder book order | unit | Genesis < Exodus < Revelation |
| sortByCanonicalOrder chapter order | unit | Same book: ch 1 < ch 2 |
| sortByCanonicalOrder verse order | unit | Same book+chapter: v 1 < v 2 |
| sortByCanonicalOrder cross-testament | unit | OT before NT |
| sortByStrength no mutation | unit | Original array unchanged |

**Expected state after completion:**
- [ ] `src/lib/bible/crossRefs/sort.ts` exists
- [ ] `src/lib/bible/crossRefs/__tests__/sort.test.ts` exists with 8 tests
- [ ] All 8 sort tests pass
- [ ] Build passes

---

### Step 5: Navigation Helper + Tests

**Objective:** Create the `navigateToReference` helper as a single seam for BB-38 upgrade.

**Files to create/modify:**
- `src/lib/bible/crossRefs/navigation.ts` — New module
- `src/lib/bible/crossRefs/__tests__/navigation.test.ts` — New test file

**Details:**

```typescript
/** Build the route path for navigating to a cross-reference.
 *  Single seam for BB-38 to upgrade with #v{verse} anchoring later. */
export function buildCrossRefRoute(bookSlug: string, chapter: number, _verse: number): string {
  // BB-38 will change this to include #v{verse} anchoring
  return `/bible/${bookSlug}/${chapter}`
}
```

The `_verse` parameter is accepted but unused — it exists so BB-38 can add verse-anchor scrolling without changing the function signature.

**Test cases:**

1. `buildCrossRefRoute` — returns `/bible/romans/5` for (romans, 5, 8)
2. `buildCrossRefRoute` — handles hyphenated slugs (`/bible/1-corinthians/13`)
3. `buildCrossRefRoute` — chapter 1 (`/bible/genesis/1`)

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- Do NOT add `#v{verse}` anchoring — that is BB-38 scope
- Do NOT import React Router — this is a pure function returning a string. The calling component uses `useNavigate()`.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| buildCrossRefRoute standard | unit | Returns `/bible/romans/5` |
| buildCrossRefRoute hyphenated | unit | Returns `/bible/1-corinthians/13` |
| buildCrossRefRoute ch 1 | unit | Returns `/bible/genesis/1` |

**Expected state after completion:**
- [ ] `src/lib/bible/crossRefs/navigation.ts` exists
- [ ] 3 navigation tests pass
- [ ] Build passes

---

### Step 6: CrossRefsSubView Component + Tests

**Objective:** Build the full cross-references sub-view component that replaces the stub.

**Files to create/modify:**
- `src/components/bible/reader/CrossRefsSubView.tsx` — New component
- `src/components/bible/reader/__tests__/CrossRefsSubView.test.tsx` — New test file

**Details:**

The component receives `{ selection, onBack, context }` and renders inside the VerseActionSheet's scrollable sub-view area.

**Component structure:**

```tsx
interface CrossRefsSubViewProps {
  selection: VerseSelection
  onBack: () => void
  context?: VerseActionContext
}

export function CrossRefsSubView({ selection, onBack, context }: CrossRefsSubViewProps) {
  // State
  const [crossRefs, setCrossRefs] = useState<CrossRef[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const sortModeRef = useRef<'strength' | 'canonical'>('strength')
  const [sortMode, setSortMode] = useState<'strength' | 'canonical'>('strength')
  const [verseTexts, setVerseTexts] = useState<Map<string, string>>(new Map())
  const navigate = useNavigate()
  const reducedMotion = useReducedMotion()

  // Load cross-refs on mount
  useEffect(() => { ... loadCrossRefsForBook then collectCrossRefsForRange ... }, [selection])

  // Load verse preview texts in parallel by destination book+chapter
  useEffect(() => { ... group by book+chapter, loadChapterWeb in parallel ... }, [crossRefs])

  // Sorted refs
  const sortedRefs = useMemo(() => {
    return sortMode === 'strength'
      ? sortByStrength(crossRefs)
      : sortByCanonicalOrder(crossRefs)
  }, [crossRefs, sortMode])

  // Handle row tap → navigate
  const handleRefTap = useCallback((ref: CrossRef) => {
    const route = buildCrossRefRoute(ref.parsed.book, ref.parsed.chapter, ref.parsed.verse)
    context?.closeSheet()
    navigate(route)
  }, [context, navigate])

  // Render
  return (
    <div>
      {/* Subtitle */}
      <div className="px-4 py-1.5">
        <span className="text-xs text-white/50">
          for {formatReference(selection)}
        </span>
      </div>

      {/* Context strip — source verse text preview, 2 lines max */}
      <div className="px-4 py-2">
        <p className="line-clamp-2 text-sm text-white/40">
          {selection.verses.map(v => v.text).join(' ')}
        </p>
      </div>

      <div className="border-t border-white/[0.08]" />

      {/* Sort toggle (only if refs exist) */}
      {crossRefs.length > 0 && (
        <div className="flex gap-1 px-4 py-2">
          <button onClick={() => setSortMode('strength')}
            className={cn('flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              sortMode === 'strength' ? 'bg-white/[0.12] text-white' : 'text-white/50 hover:text-white/70'
            )}>
            Strongest first
          </button>
          <button onClick={() => setSortMode('canonical')}
            className={cn('flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              sortMode === 'canonical' ? 'bg-white/[0.12] text-white' : 'text-white/50 hover:text-white/70'
            )}>
            Canonical order
          </button>
        </div>
      )}

      <div className="border-t border-white/[0.08]" />

      {/* Loading state */}
      {isLoading && <LoadingSkeleton />}

      {/* Empty state */}
      {!isLoading && crossRefs.length === 0 && <EmptyState />}

      {/* Cross-reference list */}
      {!isLoading && crossRefs.length > 0 && (
        <div className="px-2 py-1">
          {sortedRefs.map((ref) => (
            <CrossRefRow
              key={ref.ref}
              crossRef={ref}
              verseText={verseTexts.get(ref.ref)}
              onTap={handleRefTap}
            />
          ))}
        </div>
      )}

      {/* Footer */}
      {!isLoading && crossRefs.length > 0 && (
        <>
          <div className="border-t border-white/[0.08]" />
          <div className="px-4 py-3 text-center">
            <span className="text-xs text-white/40">
              Cross-references from Treasury of Scripture Knowledge · Public Domain
            </span>
          </div>
        </>
      )}
    </div>
  )
}
```

**CrossRefRow sub-component (inline in same file):**

```tsx
function CrossRefRow({ crossRef, verseText, onTap }: {
  crossRef: CrossRef
  verseText: string | undefined
  onTap: (ref: CrossRef) => void
}) {
  const bookName = getBookBySlug(crossRef.parsed.book)?.name ?? crossRef.parsed.book

  // Rank indicator opacity: rank 1 = 1.0, rank 2 = 0.6, rank 3 = 0.4, rank 4+ = 0.2
  const rankOpacity = crossRef.rank === 1 ? 1 : crossRef.rank === 2 ? 0.6 : crossRef.rank === 3 ? 0.4 : 0.2

  return (
    <button
      onClick={() => onTap(crossRef)}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-3 min-h-[44px] text-left text-white transition-colors hover:bg-white/[0.06]"
    >
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-white">
          {bookName} {crossRef.parsed.chapter}:{crossRef.parsed.verse}
        </span>
        {verseText !== undefined ? (
          <span className="mt-0.5 block text-xs text-white/50 line-clamp-2">
            {verseText}
          </span>
        ) : (
          <span className="mt-1 block h-3 w-3/4 animate-pulse rounded bg-white/[0.08]" />
        )}
      </div>
      {/* Rank indicator */}
      <span
        className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-white"
        style={{ opacity: rankOpacity }}
        aria-hidden="true"
      />
      <ChevronRight className="h-4 w-4 flex-shrink-0 text-white/30" />
    </button>
  )
}
```

**EmptyState sub-component:**

```tsx
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <Link2 className="mb-4 h-10 w-10 text-white/20" />
      <p className="text-sm font-medium text-white">
        No cross-references for this verse.
      </p>
      <p className="mt-1 text-xs text-white/50">
        Not every verse has direct connections in the Treasury of Scripture Knowledge.
      </p>
    </div>
  )
}
```

**Verse text loading logic (inside useEffect):**

```typescript
// Group cross-refs by destination book+chapter
const chapterKeys = new Map<string, CrossRef[]>()
for (const ref of newRefs) {
  const key = `${ref.parsed.book}.${ref.parsed.chapter}`
  const group = chapterKeys.get(key) ?? []
  group.push(ref)
  chapterKeys.set(key, group)
}

// Load each unique chapter in parallel
for (const [key, refs] of chapterKeys) {
  const [bookSlug, chapterStr] = [key.substring(0, key.lastIndexOf('.')), key.substring(key.lastIndexOf('.') + 1)]
  loadChapterWeb(bookSlug, parseInt(chapterStr, 10)).then((chapterData) => {
    if (!chapterData) return
    setVerseTexts((prev) => {
      const next = new Map(prev)
      for (const ref of refs) {
        const verse = chapterData.verses.find((v) => v.number === ref.parsed.verse)
        if (verse) next.set(ref.ref, verse.text)
      }
      return next
    })
  })
}
```

**Reduced motion:** Skeleton → text transitions use `transition-opacity duration-150` that is skipped when `reducedMotion` is true.

**Responsive behavior:**
- Desktop (1440px): Rows fill 440px sheet width. Hover states on rows.
- Tablet (768px): Same as desktop (action sheet is always 440px centered).
- Mobile (375px): Rows fill full sheet width. Touch targets 44px.

**Guardrails (DO NOT):**
- Do NOT use FrostedCard inside the sub-view — use action sheet list styling
- Do NOT add GlowBackground or HorizonGlow
- Do NOT use any raw hex values — use Tailwind `text-white/XX`, `bg-white/[XX]` tokens
- Do NOT persist sort mode to localStorage — use React state only
- Do NOT add `#v{verse}` to navigation — BB-38 scope
- Do NOT render subheaders for multi-verse selections — both sort modes are flat per spec #34

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| renders subtitle with reference | integration | Shows "for John 3:16" |
| renders context strip with verse text | integration | Shows source verse preview |
| renders skeleton loaders while verse texts load | integration | Skeleton elements visible initially |
| replaces skeletons with real text | integration | After loadChapterWeb resolves, text appears |
| renders empty state for verse with no refs | integration | Shows "No cross-references" message |
| sort toggle defaults to "Strongest first" | integration | First button has active styling |
| switching to "Canonical order" re-sorts list | integration | Order changes after click |
| tapping a row calls navigate with correct route | integration | Verifies `/bible/{book}/{chapter}` |
| tapping a row closes the sheet | integration | `context.closeSheet()` called |
| rank indicator opacity matches rank | integration | Rank 1 = opacity 1, rank 4 = opacity 0.2 |
| hides sort toggle when no refs | integration | Sort toggle not rendered for empty state |
| renders footer attribution | integration | "Treasury of Scripture Knowledge · Public Domain" |
| all rows have min 44px height | integration | `min-h-[44px]` class present |
| multi-verse shows deduplicated refs | integration | Overlapping refs counted once |

**Expected state after completion:**
- [ ] `CrossRefsSubView.tsx` exists with `CrossRefRow`, `EmptyState` sub-components
- [ ] 14 component tests pass
- [ ] Build passes
- [ ] Sort toggle, navigation, verse previews all functional

---

### Step 7: Wire Handler + Badge + VerseActionSheet Mods

**Objective:** Replace the cross-refs stub in the registry, add the `CrossRefBadge` component, add badge rendering and X close button to VerseActionSheet.

**Files to create/modify:**
- `src/lib/bible/verseActionRegistry.ts` — Replace stub with real handler + badge
- `src/components/bible/reader/VerseActionSheet.tsx` — Render badges, add X close to sub-view header
- `src/components/bible/reader/CrossRefsSubView.tsx` — Add `CrossRefBadge` export
- `src/lib/bible/__tests__/verseActionRegistry.test.ts` — Update/add tests

**Details:**

**CrossRefBadge component (added to CrossRefsSubView.tsx):**

```tsx
export function CrossRefBadge({ selection }: { selection: VerseSelection }) {
  const [count, setCount] = useState<number | null>(() => {
    const cached = getCachedBook(selection.book)
    if (!cached) return null
    return getDeduplicatedCrossRefCount(cached, selection.chapter, selection.startVerse, selection.endVerse)
  })

  useEffect(() => {
    if (count !== null) return
    let cancelled = false
    loadCrossRefsForBook(selection.book).then((map) => {
      if (cancelled) return
      setCount(getDeduplicatedCrossRefCount(map, selection.chapter, selection.startVerse, selection.endVerse))
    })
    return () => { cancelled = true }
  }, [selection, count])

  // Loading state: pulsing dot
  if (count === null) {
    return <span className="inline-block h-2 w-2 rounded-full bg-white/40 animate-pulse" aria-label="Loading cross-reference count" />
  }

  // Zero: hidden
  if (count === 0) return null

  // Count badge
  return (
    <span className="inline-flex items-center justify-center rounded-full bg-white/[0.12] px-1.5 py-0.5 text-xs tabular-nums text-white/70">
      {count > 99 ? '99+' : count}
    </span>
  )
}
```

**Registry update (verseActionRegistry.ts):**

Replace lines 330-340:
```typescript
import { CrossRefsSubView, CrossRefBadge } from '@/components/bible/reader/CrossRefsSubView'

const crossRefs: VerseActionHandler = {
  action: 'cross-refs',
  label: 'Cross-references',
  sublabel: 'See related verses',
  icon: Link2,
  category: 'secondary',
  hasSubView: true,
  renderSubView: (props) => React.createElement(CrossRefsSubView, props),
  renderBadge: (selection) => React.createElement(CrossRefBadge, { selection }),
  isAvailable: () => true,
  onInvoke: () => {},
}
```

**VerseActionSheet updates:**

1. **Sub-view header — add X close button** (lines 297-306):

Change:
```tsx
<div className="flex items-center gap-2 px-4 py-3">
  <button onClick={handleSubViewBack} className={ICON_BTN_SM} aria-label="Back">
    <ArrowLeft className="h-5 w-5" />
  </button>
  <span className="font-semibold text-white">{subView.handler.label}</span>
</div>
```

To:
```tsx
<div className="flex items-center gap-2 px-4 py-3">
  <button onClick={handleSubViewBack} className={ICON_BTN_SM} aria-label="Back">
    <ArrowLeft className="h-5 w-5" />
  </button>
  <span className="flex-1 font-semibold text-white">{subView.handler.label}</span>
  <button onClick={onClose} className={ICON_BTN_SM} aria-label="Close">
    <X className="h-5 w-5" />
  </button>
</div>
```

2. **Secondary action rows — render badge** (lines 404-430):

After the label `<div>` and before the `ChevronRight`, add:
```tsx
{handler.renderBadge?.(selection)}
{handler.hasSubView && (
  <ChevronRight className="h-4 w-4 flex-shrink-0 text-white/30" />
)}
```

**Responsive behavior:**
- Desktop (1440px): Badge aligns inline with chevron on the right side of the row.
- Tablet (768px): Same — action sheet is 440px wide.
- Mobile (375px): Same layout. Badge + chevron right-aligned.

**Inline position expectations:**
- Badge and ChevronRight share same y-coordinate at all widths (±5px tolerance). Both are in a flex row with `items-center`.

**Guardrails (DO NOT):**
- Do NOT change the `VerseActionHandler` interface structure beyond adding `renderBadge`
- Do NOT remove the existing `stubSubView` helper — other actions still use it (explain, memorize)
- Do NOT add auth checks — cross-refs are public

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| cross-refs handler has hasSubView true | unit | Registry check |
| cross-refs handler has renderBadge defined | unit | Registry check |
| cross-refs handler renderSubView returns CrossRefsSubView | unit | Registry check |
| CrossRefBadge shows count when book is cached | unit | Returns count badge |
| CrossRefBadge shows pulse when loading | unit | Returns pulsing dot |
| CrossRefBadge hidden when count is 0 | unit | Returns null |
| CrossRefBadge shows "99+" for large counts | unit | Count > 99 displays "99+" |
| sub-view header has close button | integration | X button present in sub-view header |
| secondary action row renders badge | integration | Badge node present in row |

**Expected state after completion:**
- [ ] Cross-refs stub replaced with real handler
- [ ] `CrossRefBadge` exported from `CrossRefsSubView.tsx`
- [ ] Badge renders in secondary action rows via `renderBadge`
- [ ] X close button in sub-view header
- [ ] 9 tests pass
- [ ] Build passes

---

### Step 8: BibleReader Preloading

**Objective:** Preload cross-refs for the current book on mount in BibleReader.tsx.

**Files to create/modify:**
- `src/pages/BibleReader.tsx` — Add preload call

**Details:**

Add to BibleReaderInner, after the existing store subscriptions (after line 166):

```typescript
import { loadCrossRefsForBook } from '@/lib/bible/crossRefs/loader'

// Cross-reference preloading (BB-9)
// Fire-and-forget — populates in-memory cache so badge count is instant
useEffect(() => {
  if (bookSlug) {
    void loadCrossRefsForBook(bookSlug)
  }
}, [bookSlug])
```

This effect runs in parallel with the chapter text load (existing `useEffect` for `loadChapterWeb`). When the user taps a verse and opens the action sheet, `isBookCached(bookSlug)` returns `true` and the `CrossRefBadge` shows the count instantly (no loading dot).

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- Do NOT block the chapter text loading — this is fire-and-forget (`void` prefix)
- Do NOT add cross-ref data as a prop to ReaderBody or VerseActionSheet — the badge component loads from the module cache
- Do NOT add error handling — `loadCrossRefsForBook` already handles errors internally

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| preloads cross-refs for current book on mount | integration | Verify `loadCrossRefsForBook` called with bookSlug |
| preloads new book on navigation | integration | Verify called again when bookSlug changes |

**Expected state after completion:**
- [ ] Cross-ref data preloads in parallel with chapter text
- [ ] Badge shows count instantly on first action sheet open (no loading dot)
- [ ] 2 tests pass
- [ ] Build passes

---

### Step 9: Full Integration Verification

**Objective:** Run all tests, verify build, confirm acceptance criteria.

**Files to create/modify:**
- No new files — verification only

**Details:**

1. Run `pnpm test` — all new and existing tests pass
2. Run `pnpm build` — zero errors, zero warnings
3. Run `pnpm lint` — clean on all BB-9 files
4. Manually verify acceptance criteria checklist from spec:
   - Badge count appears on Cross-references row in action sheet
   - Badge shows "99+" for high counts
   - Badge shows loading pulse before preload completes
   - Badge hidden for verses with no refs (e.g., John 1:2)
   - Sub-view opens with correct source reference in subtitle
   - Context strip shows source verse text
   - Skeletons → real text as destination chapters load
   - "Strongest first" default sort, "Canonical order" re-sorts
   - Each row shows reference, preview, rank indicator, chevron
   - Tapping navigates to `/bible/{book}/{chapter}` and closes sheet
   - Multi-verse badge shows deduplicated count
   - Empty state for verses with no refs
   - Footer attribution visible
   - 44px touch targets
   - Reduced motion respected
   - Zero raw hex values

**Responsive behavior:** N/A: verification step

**Guardrails (DO NOT):**
- Do NOT commit until all tests pass
- Do NOT fix unrelated test failures in this step — document them

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Full suite | integration | `pnpm test` passes |

**Expected state after completion:**
- [ ] All BB-9 tests pass (estimated ~50 new tests)
- [ ] Build passes
- [ ] Lint clean on all BB-9 files
- [ ] All acceptance criteria verified

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Types (CrossRef, renderBadge) |
| 2 | 1 | Loader TDD tests (red phase) |
| 3 | 2 | Loader implementation (green phase) |
| 4 | 1 | Sort tests + implementation |
| 5 | 1 | Navigation helper + tests |
| 6 | 3, 4, 5 | CrossRefsSubView component + tests |
| 7 | 6 | Wire handler + badge + VerseActionSheet mods |
| 8 | 3 | BibleReader preloading |
| 9 | 6, 7, 8 | Full integration verification |

**Parallelizable:** Steps 4 and 5 can run in parallel with Step 2/3 (no dependencies between them). Step 8 can run in parallel with Step 7 (both depend on Step 3 but not each other).

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Types | [COMPLETE] | 2026-04-08 | Added CrossRefEntry, CrossRef, CrossRefMap, CrossRefBookJson to types/bible.ts; added renderBadge to VerseActionHandler in types/verse-actions.ts |
| 2 | Loader TDD Tests | [COMPLETE] | 2026-04-08 | Created src/lib/bible/crossRefs/__tests__/loader.test.ts with 13 test cases. All fail as expected (module not found). |
| 3 | Loader Implementation | [COMPLETE] | 2026-04-08 | Created src/lib/bible/crossRefs/loader.ts. All 14 loader tests pass. Build clean. |
| 4 | Sort Tests + Implementation | [COMPLETE] | 2026-04-08 | Created sort.ts + 8 tests. All pass. |
| 5 | Navigation Helper + Tests | [COMPLETE] | 2026-04-08 | Created navigation.ts + 3 tests. All pass. |
| 6 | CrossRefsSubView Component + Tests | [COMPLETE] | 2026-04-08 | Created CrossRefsSubView.tsx with CrossRefRow, EmptyState, CrossRefBadge. 17 tests pass. Removed unused onBack param, sortModeRef, reducedMotion. |
| 7 | Wire Handler + Badge + Sheet Mods | [COMPLETE] | 2026-04-08 | Replaced cross-refs stub with real handler + CrossRefBadge. Added X close to sub-view header. Added badge rendering to secondary rows. Updated stub test exclusion. 51 tests pass. |
| 8 | BibleReader Preloading | [COMPLETE] | 2026-04-08 | Added fire-and-forget preload useEffect to BibleReader.tsx. Added cross-refs loader mocks to all 4 BibleReader test files. 2 new tests pass. 3 other BibleReader test files have pre-existing failures (not BB-9 related). |
| 9 | Full Integration Verification | [COMPLETE] | 2026-04-08 | 110 tests pass across 7 files. Build clean. BB-9 files lint clean. Pre-existing lint errors in other files unchanged. Pre-existing test failures in BibleReaderHighlights/Notes/Audio unchanged. |
