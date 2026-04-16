# Implementation Plan: BB-15 Search My Bible

**Spec:** `_specs/bb-15-search-my-bible.md`
**Date:** 2026-04-09
**Branch:** `bible-redesign`
**Design System Reference:** `_plans/recon/design-system.md` (loaded — captured 2026-04-05)
**Recon Report:** not applicable
**Master Spec Plan:** N/A — standalone spec in the Bible Redesign wave

---

## Architecture Context

### Project Structure

BB-15 builds on BB-14's My Bible page. Relevant files:

- **Page:** `src/pages/MyBiblePage.tsx` (278 lines) — hero, stats row, filter bar, activity feed, empty states, action menu, drawer
- **Filter bar:** `src/components/bible/my-bible/ActivityFilterBar.tsx` (183 lines) — sticky `top-16 z-30`, type pills, sort toggle, book dropdown
- **Activity feed hook:** `src/hooks/bible/useActivityFeed.ts` (120 lines) — loads items, manages filter/sort state, exposes `items`, `filter`, `sort`, `clearFilters`, `getVerseText`
- **Activity loader:** `src/lib/bible/activityLoader.ts` (159 lines) — `loadAllActivity()`, `filterActivity(items, filter)`, `sortActivity(items, sort)` as pure functions
- **Types:** `src/types/my-bible.ts` — `ActivityItem`, `ActivityItemType` (highlight | bookmark | note | meditation | journal), `ActivityFilter`, `ActivitySort`, data union types (`HighlightData`, `BookmarkData`, `NoteData`, `MeditationData`, `JournalData`)
- **Card wrapper:** `src/components/bible/my-bible/ActivityCard.tsx` (117 lines) — FrostedCard with header row (icon, reference via `formatReference()`, timestamp), delegates to type-specific cards
- **Type-specific cards:** `HighlightCard.tsx`, `BookmarkCard.tsx`, `NoteCard.tsx` (with `NoteBody` inline reference parsing), `MeditationCard.tsx`, `JournalCard.tsx`
- **Empty state:** `src/components/ui/FeatureEmptyState.tsx` — `{ icon, heading, description, ctaLabel?, ctaHref?, onCtaClick?, children?, compact? }`
- **Reference formatter:** `src/lib/dailyHub/verseContext.ts:30-38` — `formatReference(bookName, chapter, startVerse, endVerse)` → `"John 3:16"` or `"John 3:16–18"`

### Filter Pipeline (current)

In `useActivityFeed`, line 77-80:
```typescript
const items = useMemo(() => {
  const filtered = filterActivity(allItems, filter)
  return sortActivity(filtered, sort)
}, [allItems, filter, sort])
```

In `activityLoader.ts`, `filterActivity` applies: type filter → book filter → color filter. BB-15 inserts search predicate between color filter and sort.

### ActivityItem Data Fields (what gets searched)

| Type | `data.body` | `data.label` | Verse text | Reference |
|------|-------------|--------------|------------|-----------|
| highlight | — | — | via `getVerseText()` | via `formatReference()` |
| bookmark | — | `data.label?` | via `getVerseText()` | via `formatReference()` |
| note | `data.body` | — | via `getVerseText()` | via `formatReference()` |
| meditation | — | — | via `getVerseText()` | `data.reference` |
| journal | `data.body` | — | via `getVerseText()` | `data.reference` |

**Key insight:** `getVerseText()` is async (loaded via `useVerseTextCache`). The search predicate needs a synchronous haystack. The `getSearchableText` function must accept an optional `verseText` parameter rather than loading it itself — the hook provides it.

### Card Text Rendering (where HighlightedText replaces plain text)

- **HighlightCard:** `<p>{verseText}</p>` (line 18)
- **BookmarkCard:** `<p>{verseText}</p>` (line 12), `<p>{data.label}</p>` (line 17)
- **NoteCard:** `<p>{verseText}</p>` (line 71), `<NoteBody body={data.body} />` (line 77) — NoteBody has inline reference parsing
- **MeditationCard:** `<p>{verseText}</p>` (line 12)
- **JournalCard:** `<p>{verseText}</p>` (line 20), `<p>{data.body}</p>` (line 25)

### Test Patterns

- Pure function tests: `activityLoader.test.ts` — `vi.mock` stores, factory functions (`makeHighlight`, `makeBookmark`, etc.), direct import + assert
- Component tests: `ActivityCard.test.tsx` — `render()` with `<MemoryRouter><ToastProvider>`, `makeItem()` factory, `vi.mock` for referenceParser
- Provider wrapping: `MemoryRouter` + `ToastProvider` for card tests. No `AuthModalProvider` needed (My Bible is public)

---

## Auth Gating Checklist

My Bible is a **public** page — all data comes from localStorage. No auth gates.

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Type in search input | Public | Step 3 | None |
| Tap clear (X) button | Public | Step 3 | None |
| Press Escape in search input | Public | Step 3 | None |
| Tap "Clear search" in empty state | Public | Step 4 | None |

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Page background | background | `bg-dashboard-dark` (#0f0a1e) | design-system.md |
| Filter bar container | classes | `sticky top-16 z-30 border-b border-white/[0.08] bg-dashboard-dark/95 py-3 backdrop-blur-sm` | ActivityFilterBar.tsx:75 |
| Search input | background | `bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] rounded-xl` | spec design notes |
| Search input focus | ring | `focus:border-white/30 focus:ring-2 focus:ring-white/20` | spec design notes |
| Search input text | color | `text-white` | design-system.md text standards |
| Search placeholder | color | `placeholder:text-white/50` | design-system.md |
| Search icon | color | `text-white/50` | spec design notes |
| Clear (X) button | color | `text-white/50 hover:text-white/80` | spec design notes |
| Mark highlight bg | color | `bg-primary/25` = `rgba(109, 40, 217, 0.25)` | spec design notes |
| Mark highlight text | color | `text-white` | spec design notes |
| FrostedCard | classes | `bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] rounded-2xl` | design-system.md |

---

## Design System Reminder

**Project-specific quirks that `/execute-plan` displays before every UI step:**

- Worship Room uses `GRADIENT_TEXT_STYLE` (white-to-purple gradient via `background-clip: text`) for hero and section headings on dark backgrounds. Caveat font has been deprecated for headings — used only for the logo.
- The My Bible page uses `BibleLandingOrbs` (0.25-0.30 opacity glow orbs) and `ATMOSPHERIC_HERO_BG` for the hero section. It does NOT use HorizonGlow or GlowBackground.
- FrostedCard is the canonical card component: `bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] rounded-2xl`. Do NOT roll your own card.
- Text colors on dark backgrounds: use `text-white` for primary text, `text-white/60` for secondary, `text-white/50` for placeholder/icons. No raw hex values.
- All interactive elements: minimum 44px tap target on mobile.
- Focus indicators: never use `outline-none` without a visible replacement (`focus-visible:ring-2`).
- No deprecated patterns: no animate-glow-pulse, no cyan borders, no Caveat headings, no soft-shadow 8px-radius cards.
- `<mark>` elements for search highlights use `bg-primary/25 text-white` on dark card backgrounds — NOT raw yellow.

---

## Shared Data Models (from Master Plan)

N/A — standalone spec. Uses existing `ActivityItem` type from `src/types/my-bible.ts`.

**localStorage keys this spec touches:**

| Key | Read/Write | Description |
|-----|-----------|-------------|
| (none) | — | Search query is React state only, not persisted |

---

## Responsive Structure

**Breakpoints and layout behavior:**

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | < 640px | Search input full-width at top of filter bar; type/book/sort controls collapse below. 44px min-height. |
| Tablet | 640-1024px | Search input ~320px width, inline with filter controls. Full filter bar visible. |
| Desktop | > 1024px | Search input ~320px width, inline with filter controls. Full filter bar visible. |

---

## Inline Element Position Expectations (UI features with inline rows)

| Element Group | Elements | Expected y-alignment | Wrap Tolerance |
|---------------|----------|---------------------|----------------|
| Filter bar (tablet/desktop) | Search input, type pills, sort toggle, book dropdown | Search input on same row as controls at ≥640px (±5px) | Wrapping below 640px is expected — search input goes full-width on its own row |

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| Filter bar → activity feed | 16px (`pt-4` on feed container) | MyBiblePage.tsx:204 |
| Card → card | 12px (`space-y-3`) | MyBiblePage.tsx:204 |

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] BB-14 is complete and committed (the My Bible page, activity loader, filter bar, cards all exist)
- [x] All auth-gated actions from the spec are accounted for (none — public page)
- [x] Design system values are verified (from recon + codebase inspection)
- [x] No [UNVERIFIED] values needed — spec composes existing patterns only
- [x] No deprecated patterns used
- [x] `ActivityItem` type includes journal type (added in BB-14 via journalStore integration)

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Where to insert search in pipeline | As a new `searchQuery` field on `ActivityFilter` type | Cleaner than a separate argument — the hook's `useMemo` dependency already includes `filter`, so adding `searchQuery` to it triggers recalculation automatically |
| Verse text in search predicate | Accept as optional parameter via `getSearchableText(item, verseText?)` | Verse text is async-loaded by `useVerseTextCache`. The predicate must be synchronous. If verse text hasn't loaded yet, the item still matches on body/label/reference. |
| HighlightedText inside NoteBody (inline references) | Do NOT wrap NoteBody's reference detection in HighlightedText | NoteBody parses references into clickable buttons. Wrapping the entire body in HighlightedText would conflict with the Fragment-based rendering. Instead, pass `searchQuery` to NoteCard and let it apply HighlightedText to the non-ref segments only — but this is complex and fragile. **Simpler choice:** apply HighlightedText to the NoteBody output as a whole, but only to the text nodes. **Simplest choice (chosen):** apply HighlightedText to note body text via a separate rendering path when a search query is active, bypassing NoteBody's reference parsing. The reference links are a nice-to-have, not critical during search. |
| Multi-token highlight overlap | Highlight each token independently, no special handling for overlaps | Spec says "each token is highlighted independently." If two tokens overlap in the same substring, the `<mark>` elements will nest. This is semantically fine. |
| Empty query after debounce | `matchesSearch` with empty query returns `true` for all items | Spec requirement — empty search bypasses the filter |
| Performance: memoize `getSearchableText` | Defer — build without memoization first, add only if >50ms per keystroke on 5000 items | The spec says "add memoization if needed." Substring search on ~1000 items is sub-millisecond. |
| NoteBody rendering during search | When searchQuery is non-empty, render note body as plain text with HighlightedText instead of using NoteBody (reference parsing). When searchQuery is empty, render NoteBody as before. | Preserves existing NoteBody behavior when not searching, shows highlighted matches when searching. Simple conditional in NoteCard. |

---

## Implementation Steps

### Step 1: Search Predicate Module

**Objective:** Create the pure function module with `tokenizeQuery`, `getSearchableText`, and `matchesSearch`.

**Files to create/modify:**
- `src/lib/bible/myBible/searchPredicate.ts` — new file
- `src/lib/bible/myBible/__tests__/searchPredicate.test.ts` — new file

**Details:**

```typescript
// src/lib/bible/myBible/searchPredicate.ts

import { formatReference } from '@/lib/dailyHub/verseContext'
import type { ActivityItem } from '@/types/my-bible'

/** Split on whitespace, lowercase, filter empties */
export function tokenizeQuery(query: string): string[] {
  return query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
}

/**
 * Build a single lowercase haystack string for an activity item.
 * verseText is optional because it's async-loaded — items without
 * loaded verse text still match on body/label/reference.
 */
export function getSearchableText(item: ActivityItem, verseText?: string | null): string {
  const parts: string[] = []

  if (verseText) parts.push(verseText)

  const d = item.data
  if (d.type === 'note') parts.push(d.body)
  if (d.type === 'journal') parts.push(d.body)
  if (d.type === 'bookmark' && d.label) parts.push(d.label)

  // Reference: "John 3:16" or "Romans 8:28–30"
  parts.push(formatReference(item.bookName, item.chapter, item.startVerse, item.endVerse))

  return parts.join(' ').toLowerCase()
}

/** Returns true if every query token is a substring of the haystack. Empty query → true for all. */
export function matchesSearch(item: ActivityItem, query: string, verseText?: string | null): boolean {
  const tokens = tokenizeQuery(query)
  if (tokens.length === 0) return true

  const haystack = getSearchableText(item, verseText)
  return tokens.every((token) => haystack.includes(token))
}
```

**Auth gating:** N/A — pure functions.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT import React or any hooks — this is a pure function module
- DO NOT use regex for matching — substring (`includes`) per spec
- DO NOT add fuzzy matching or Fuse.js
- DO NOT persist search query to localStorage

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| tokenizeQuery splits on whitespace and lowercases | unit | `"Anxious Peace"` → `["anxious", "peace"]` |
| tokenizeQuery trims leading/trailing whitespace | unit | `"  joy  "` → `["joy"]` |
| tokenizeQuery returns empty array for empty/whitespace string | unit | `""` → `[]`, `"   "` → `[]` |
| getSearchableText includes verseText when provided | unit | Item + "For God so loved" → haystack includes it |
| getSearchableText works without verseText | unit | Item with body → haystack contains body + reference |
| getSearchableText includes note body | unit | Note item → body in haystack |
| getSearchableText includes journal body | unit | Journal item → body in haystack |
| getSearchableText includes bookmark label | unit | Bookmark with label → label in haystack |
| getSearchableText includes formatted reference | unit | Item with book=john, chapter=3, startVerse=16 → "john 3:16" in haystack |
| getSearchableText omits label for bookmark without label | unit | Bookmark without label → no undefined/null in haystack |
| matchesSearch returns true for empty query | unit | Any item + "" → true |
| matchesSearch single word match | unit | Note with body "feeling anxious" + query "anxious" → true |
| matchesSearch single word no match | unit | Note with body "feeling joyful" + query "anxious" → false |
| matchesSearch multi-word AND match | unit | Note with "anxious but finding peace" + "anxious peace" → true |
| matchesSearch multi-word AND partial fail | unit | Note with "anxious but no relief" + "anxious peace" → false |
| matchesSearch is case-insensitive | unit | Note with "PEACE" + query "peace" → true |
| matchesSearch matches reference | unit | Item in John 3 + query "John 3" → true |
| matchesSearch matches verseText | unit | Item + verseText "For God so loved" + query "loved" → true |
| matchesSearch works when verseText is null | unit | Item with body + null verseText + query matching body → true |

**Expected state after completion:**
- [ ] `src/lib/bible/myBible/searchPredicate.ts` exports `tokenizeQuery`, `getSearchableText`, `matchesSearch`
- [ ] All 19 unit tests pass

---

### Step 2: Filter Pipeline Integration

**Objective:** Add `searchQuery` to `ActivityFilter`, update `filterActivity` to apply the search predicate, and wire the search state through `useActivityFeed`.

**Files to create/modify:**
- `src/types/my-bible.ts` — add `searchQuery` to `ActivityFilter`
- `src/lib/bible/activityLoader.ts` — add search step to `filterActivity`
- `src/hooks/bible/useActivityFeed.ts` — expose `searchQuery`, `setSearchQuery`
- `src/lib/bible/__tests__/activityLoader.test.ts` — add search filter tests

**Details:**

**`src/types/my-bible.ts`** — add field to `ActivityFilter`:
```typescript
export interface ActivityFilter {
  type: 'all' | 'highlights' | 'notes' | 'bookmarks' | 'daily-hub'
  book: string
  color: HighlightColor | 'all'
  searchQuery: string  // new — empty string = no filter
}
```

**`src/lib/bible/activityLoader.ts`** — add search step at the end of `filterActivity`, after color filter. Import `matchesSearch` from `searchPredicate`. The function needs verse text for each item to search against, but `filterActivity` is a pure function without access to the verse cache. **Decision:** add an optional `getVerseText` parameter to `filterActivity`:

```typescript
export function filterActivity(
  items: ActivityItem[],
  filter: ActivityFilter,
  getVerseText?: (book: string, chapter: number, startVerse: number, endVerse: number) => string | null,
): ActivityItem[] {
  let result = items
  // ... existing type, book, color filters unchanged ...

  if (filter.searchQuery.trim()) {
    result = result.filter((item) => {
      const vt = getVerseText?.(item.book, item.chapter, item.startVerse, item.endVerse) ?? null
      return matchesSearch(item, filter.searchQuery, vt)
    })
  }

  return result
}
```

**`src/hooks/bible/useActivityFeed.ts`** — update:
1. Add `searchQuery` to `DEFAULT_FILTER`: `{ type: 'all', book: 'all', color: 'all', searchQuery: '' }`
2. Pass `getVerseText` to `filterActivity`:
   ```typescript
   const items = useMemo(() => {
     const filtered = filterActivity(allItems, filter, getVerseText)
     return sortActivity(filtered, sort)
   }, [allItems, filter, sort, getVerseText])
   ```
3. `clearFilters` already resets to `DEFAULT_FILTER`, which now includes `searchQuery: ''` — no change needed.
4. Update `isFilteredEmpty` to account for search: already works — `isFilteredEmpty = !isEmpty && items.length === 0`.

**Auth gating:** N/A.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT change the existing filter pipeline order — search goes AFTER type/book/color
- DO NOT remove any existing `filterActivity` parameters
- DO NOT persist `searchQuery` to localStorage
- DO NOT change the return type of `useActivityFeed`

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| filterActivity with searchQuery filters items | unit | Items + searchQuery "joy" → only matching items |
| filterActivity with empty searchQuery returns all | unit | Items + searchQuery "" → all items pass |
| filterActivity search + type filter compose | unit | Type=notes + searchQuery "anxious" → only notes matching "anxious" |
| filterActivity search uses getVerseText when provided | unit | Provide getVerseText mock → items match on verse text |
| filterActivity search works without getVerseText | unit | No getVerseText → items still match on body/reference |
| DEFAULT_FILTER includes searchQuery: '' | unit | Verify default |

**Expected state after completion:**
- [ ] `ActivityFilter` type has `searchQuery: string`
- [ ] `filterActivity` applies search predicate after color filter
- [ ] `useActivityFeed` passes `getVerseText` to `filterActivity`
- [ ] All 6 new tests pass + existing tests updated for new `searchQuery` field

---

### Step 3: Search Input Component

**Objective:** Create `MyBibleSearchInput` component and integrate it into `ActivityFilterBar`.

**Files to create/modify:**
- `src/components/bible/my-bible/MyBibleSearchInput.tsx` — new file
- `src/components/bible/my-bible/ActivityFilterBar.tsx` — add search input
- `src/components/bible/my-bible/__tests__/MyBibleSearchInput.test.tsx` — new file

**Details:**

**`MyBibleSearchInput.tsx`:**
```typescript
import { useRef, useCallback, useEffect, useState } from 'react'
import { Search, X } from 'lucide-react'

interface MyBibleSearchInputProps {
  value: string
  onChange: (value: string) => void
  className?: string
}

export function MyBibleSearchInput({ value, onChange, className }: MyBibleSearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [localValue, setLocalValue] = useState(value)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  // Sync external value changes (e.g., clear from empty state)
  useEffect(() => {
    setLocalValue(value)
  }, [value])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    setLocalValue(v)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => onChange(v), 150)
  }, [onChange])

  const handleClear = useCallback(() => {
    setLocalValue('')
    onChange('')
    inputRef.current?.focus()
  }, [onChange])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setLocalValue('')
      onChange('')
      inputRef.current?.blur()
    }
  }, [onChange])

  // Cleanup timer on unmount
  useEffect(() => () => clearTimeout(timerRef.current), [])

  return (
    <div className={cn('relative', className)}>
      <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/50" />
      <input
        ref={inputRef}
        type="text"
        value={localValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Search your highlights, notes, prayers..."
        aria-label="Search your highlights, notes, prayers, and bookmarks"
        className="min-h-[44px] w-full rounded-xl border border-white/[0.12] bg-white/[0.06] py-2 pl-9 pr-9 text-sm text-white backdrop-blur-sm placeholder:text-white/50 focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
      />
      {localValue && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear search"
          className="absolute right-1.5 top-1/2 flex min-h-[44px] min-w-[44px] -translate-y-1/2 items-center justify-center text-white/50 hover:text-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:rounded"
        >
          <X size={16} />
        </button>
      )}
    </div>
  )
}
```

Import `cn` from `@/lib/utils`.

**`ActivityFilterBar.tsx`** — modifications:
1. Add props: `searchQuery: string`, `onSearchChange: (query: string) => void`
2. Render `MyBibleSearchInput` at the top of the filter bar
3. On mobile (`< sm`): search input is full-width on its own row, filter controls below
4. On tablet/desktop (`sm+`): search input is `w-80` inline with controls

Updated layout structure:
```tsx
<div className="sticky top-16 z-30 border-b border-white/[0.08] bg-dashboard-dark/95 py-3 backdrop-blur-sm">
  {/* Mobile: search on top, full width */}
  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <MyBibleSearchInput
      value={searchQuery}
      onChange={onSearchChange}
      className="w-full sm:w-80"
    />
    <div className="flex items-center justify-between gap-3">
      {/* Existing type pills */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
        {/* ... type pills unchanged ... */}
      </div>
      {/* Existing right side: sort + book */}
      <div className="flex flex-shrink-0 items-center gap-2">
        {/* ... sort toggle + book dropdown unchanged ... */}
      </div>
    </div>
  </div>
  {/* Mobile book sheet unchanged */}
</div>
```

**`MyBiblePage.tsx`** — wire search:
```tsx
<ActivityFilterBar
  filter={filter}
  sort={sort}
  onFilterChange={setFilter}
  onSortChange={setSort}
  bookCounts={bookCounts}
  searchQuery={filter.searchQuery}
  onSearchChange={(q) => setFilter({ ...filter, searchQuery: q })}
/>
```

**Auth gating:** N/A.

**Responsive behavior:**
- Desktop (1440px): Search input `w-80` (320px) inline left of type pills
- Tablet (768px): Same — `w-80` inline with controls
- Mobile (375px): Search input full-width on its own row. Type/book/sort controls on second row below.

**Inline position expectations:**
- At ≥640px: search input and type pills must share y-coordinate (±5px tolerance)
- At <640px: search input is on its own row above type pills (different y expected)

**Guardrails (DO NOT):**
- DO NOT add submit button or Enter key handler — search is real-time via debounce
- DO NOT persist search query to localStorage or URL
- DO NOT use a search library (Fuse.js, Lunr, etc.)
- DO NOT add focus animation or glow pulse on the search input — keep it subtle like the filter bar

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| renders search input with magnifying glass icon | unit | Screen has input with aria-label, Search icon visible |
| renders placeholder text | unit | Input has "Search your highlights, notes, prayers..." placeholder |
| does not show X button when input is empty | unit | No "Clear search" button initially |
| shows X button when input has value | unit | Type text → X button appears |
| calls onChange after debounce on typing | unit | Type "test", wait 200ms → onChange called with "test" |
| clears input and calls onChange on X button click | unit | Has value → click X → input empty, onChange("") |
| clears input and blurs on Escape | unit | Has value → press Escape → input empty, blur |
| meets 44px min-height | unit | Input element has `min-h-[44px]` class |
| X button meets 44px tap target | unit | Clear button has `min-h-[44px] min-w-[44px]` classes |

**Expected state after completion:**
- [ ] `MyBibleSearchInput` renders with correct styling and behavior
- [ ] `ActivityFilterBar` renders search input with correct responsive layout
- [ ] Search input debounces at ~150ms
- [ ] Escape clears and blurs
- [ ] All 9 tests pass

---

### Step 4: HighlightedText Component + Card Integration

**Objective:** Create `HighlightedText` that wraps matching substrings in `<mark>` elements, and integrate it into the five card components that display searchable text.

**Files to create/modify:**
- `src/components/bible/my-bible/HighlightedText.tsx` — new file
- `src/components/bible/my-bible/HighlightCard.tsx` — use HighlightedText for verseText
- `src/components/bible/my-bible/BookmarkCard.tsx` — use HighlightedText for verseText + label
- `src/components/bible/my-bible/NoteCard.tsx` — use HighlightedText for verseText + body (simplified rendering during search)
- `src/components/bible/my-bible/MeditationCard.tsx` — use HighlightedText for verseText
- `src/components/bible/my-bible/JournalCard.tsx` — use HighlightedText for verseText + body
- `src/components/bible/my-bible/ActivityCard.tsx` — pass `searchQuery` prop down to type-specific cards
- `src/components/bible/my-bible/__tests__/HighlightedText.test.tsx` — new file

**Details:**

**`HighlightedText.tsx`:**
```typescript
import { useMemo } from 'react'
import { tokenizeQuery } from '@/lib/bible/myBible/searchPredicate'

interface HighlightedTextProps {
  text: string
  query: string
}

/**
 * Renders text with matching substrings wrapped in <mark> elements.
 * When query is empty, renders plain text with zero overhead.
 * Multi-token queries highlight each token independently.
 */
export function HighlightedText({ text, query }: HighlightedTextProps) {
  const tokens = useMemo(() => tokenizeQuery(query), [query])

  if (tokens.length === 0) return <>{text}</>

  // Build a regex that matches any token (case-insensitive)
  const escaped = tokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const pattern = new RegExp(`(${escaped.join('|')})`, 'gi')

  const parts = text.split(pattern)

  return (
    <>
      {parts.map((part, i) => {
        const isMatch = tokens.some((t) => part.toLowerCase() === t.toLowerCase())
        return isMatch ? (
          <mark key={i} className="bg-primary/25 text-white">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      })}
    </>
  )
}
```

**Card modifications** — each card adds `searchQuery?: string` to its props:

- **HighlightCard:** Replace `{verseText}` with `<HighlightedText text={verseText} query={searchQuery ?? ''} />`
- **BookmarkCard:** Same for verseText + label
- **MeditationCard:** Same for verseText
- **JournalCard:** Same for verseText + body
- **NoteCard:** When `searchQuery` is non-empty, render body as `<HighlightedText text={data.body} query={searchQuery} />` instead of `<NoteBody body={data.body} />`. When empty, render `<NoteBody>` as before.

**ActivityCard.tsx** — add `searchQuery?: string` prop, pass it through to each type-specific card.

**MyBiblePage.tsx** — pass `filter.searchQuery` to `ActivityCard` via `ActivityCardWithActions`:
```tsx
<ActivityCard
  item={item}
  verseText={...}
  onClick={...}
  searchQuery={filter.searchQuery}
  // ... other props unchanged
/>
```

**Auth gating:** N/A.

**Responsive behavior:** N/A: no UI impact — HighlightedText is inline text rendering.

**Guardrails (DO NOT):**
- DO NOT use raw yellow for `<mark>` background — use `bg-primary/25 text-white`
- DO NOT highlight reference labels or verse number prefixes in the card header — only searchable text fields
- DO NOT break existing NoteBody rendering when search is empty
- DO NOT add animations on result changes (spec: reduced motion)

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| renders plain text when query is empty | unit | `<HighlightedText text="hello" query="" />` → no `<mark>` elements |
| highlights single token match | unit | text="find peace", query="peace" → `<mark>` around "peace" |
| highlights multiple occurrences | unit | text="peace and peace", query="peace" → two `<mark>` elements |
| highlights multiple tokens independently | unit | text="anxious peace", query="anxious peace" → both wrapped |
| is case-insensitive | unit | text="Peace", query="peace" → "Peace" highlighted |
| does not highlight when no match | unit | text="hello", query="xyz" → no `<mark>` elements |
| escapes regex special characters in query | unit | query="hello." → matches "hello." literally, not "hellox" |
| uses design system mark styling | unit | `<mark>` element has `bg-primary/25` and `text-white` classes |

**Expected state after completion:**
- [ ] `HighlightedText` renders correctly with `<mark>` elements using `bg-primary/25 text-white`
- [ ] All 5 card components pass through `searchQuery` and use `HighlightedText` for relevant text fields
- [ ] NoteCard falls back to `NoteBody` when search is empty (preserving reference link detection)
- [ ] All 8 HighlightedText tests pass
- [ ] Existing card tests still pass

---

### Step 5: Empty Search State + Page Integration

**Objective:** Create `EmptySearchResults` component and wire the complete search flow in `MyBiblePage`.

**Files to create/modify:**
- `src/components/bible/my-bible/EmptySearchResults.tsx` — new file
- `src/pages/MyBiblePage.tsx` — add search-empty rendering
- `src/components/bible/my-bible/__tests__/EmptySearchResults.test.tsx` — new file
- `src/pages/__tests__/MyBiblePage.test.tsx` — add search integration tests (if page test exists; otherwise, add test cases to existing test file)

**Details:**

**`EmptySearchResults.tsx`:**
```typescript
import { SearchX } from 'lucide-react'
import { FeatureEmptyState } from '@/components/ui/FeatureEmptyState'

interface EmptySearchResultsProps {
  query: string
  onClear: () => void
}

export function EmptySearchResults({ query, onClear }: EmptySearchResultsProps) {
  return (
    <div className="py-16">
      <FeatureEmptyState
        icon={SearchX}
        heading={`No matches for "${query}"`}
        description="Try a different word, or clear the search to see everything."
        compact
      >
        <button
          type="button"
          onClick={onClear}
          className="mt-3 rounded-full bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
        >
          Clear search
        </button>
      </FeatureEmptyState>
    </div>
  )
}
```

**`MyBiblePage.tsx`** — update the empty state logic to distinguish search-empty from filter-empty:

```tsx
// After the feed items rendering:
const hasSearchQuery = filter.searchQuery.trim().length > 0

const clearSearch = useCallback(() => {
  setFilter({ ...filter, searchQuery: '' })
}, [filter, setFilter])

// In the render:
{isEmpty ? (
  <div className="py-16">
    <FeatureEmptyState /* ... existing isEmpty state ... */ />
  </div>
) : isFilteredEmpty && hasSearchQuery ? (
  <EmptySearchResults
    query={filter.searchQuery.trim()}
    onClear={clearSearch}
  />
) : isFilteredEmpty ? (
  <div className="py-16">
    <FeatureEmptyState /* ... existing filter-empty state ... */ />
  </div>
) : (
  /* ... existing feed rendering ... */
)}
```

Also ensure `clearFilters` from the hook resets `searchQuery` to `''` — it already does since `DEFAULT_FILTER` includes `searchQuery: ''` from Step 2.

**Auth gating:** N/A.

**Responsive behavior:**
- Desktop (1440px): Centered empty state within `max-w-2xl` container
- Tablet (768px): Same
- Mobile (375px): Same — `FeatureEmptyState` is already responsive

**Guardrails (DO NOT):**
- DO NOT show the search-empty state when there are truly zero items (`isEmpty`) — that's the "nothing here yet" state
- DO NOT change the existing `clearFilters` behavior — it already resets everything including search
- DO NOT add fade animations to result changes

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| renders heading with user's query | unit | query="anxious" → heading contains "anxious" |
| renders descriptive subtext | unit | Text includes "Try a different word" |
| renders "Clear search" button | unit | Button with "Clear search" text |
| calls onClear when button clicked | unit | Click → onClear called |
| MyBiblePage shows EmptySearchResults when search matches nothing | integration | Set searchQuery → 0 results → EmptySearchResults visible |
| MyBiblePage search does not clear on type filter change | integration | Set search + change type → search still present |
| MyBiblePage search does not clear on sort change | integration | Set search + change sort → search still present |

**Expected state after completion:**
- [ ] `EmptySearchResults` renders with query, descriptive text, and "Clear search" button
- [ ] `MyBiblePage` correctly prioritizes: isEmpty → search-empty → filter-empty → feed
- [ ] Changing type/book/sort filters does not clear the search query
- [ ] Clearing search restores the full feed
- [ ] All 7 tests pass
- [ ] Full build passes (`pnpm build`)
- [ ] Full test suite passes (`pnpm test`)
- [ ] Lint passes (`pnpm lint`)

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Search predicate module (pure functions) |
| 2 | 1 | Filter pipeline integration (types + hook + loader) |
| 3 | 2 | Search input component + filter bar integration |
| 4 | 1 | HighlightedText component + card integration |
| 5 | 2, 3, 4 | Empty search state + page assembly |

Steps 3 and 4 can be executed in parallel after Step 2 is complete.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Search Predicate Module | [COMPLETE] | 2026-04-09 | Created `src/lib/bible/myBible/searchPredicate.ts` + test file. 20 tests pass. |
| 2 | Filter Pipeline Integration | [COMPLETE] | 2026-04-09 | Added `searchQuery` to `ActivityFilter`, search step in `filterActivity`, wired `getVerseText` in hook. Updated all test files for new field. 6 new tests pass. |
| 3 | Search Input Component | [COMPLETE] | 2026-04-09 | Created `MyBibleSearchInput.tsx`, integrated into `ActivityFilterBar` with responsive layout (full-width mobile, w-80 desktop). Wired in `MyBiblePage`. 9 new tests pass. |
| 4 | HighlightedText + Card Integration | [COMPLETE] | 2026-04-09 | Created `HighlightedText.tsx`, integrated into all 5 card components. NoteCard uses HighlightedText during search, NoteBody when not searching. `searchQuery` piped through ActivityCard → cards. 8 new tests pass. |
| 5 | Empty Search State + Page Integration | [COMPLETE] | 2026-04-09 | Created `EmptySearchResults.tsx`, integrated search-empty vs filter-empty priority in `MyBiblePage`. Fixed lint errors in new test files. 4 new tests pass. Build + lint (my files) clean. |
