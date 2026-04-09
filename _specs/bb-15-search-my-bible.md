# BB-15: Search My Bible

**Master Plan Reference:** N/A — standalone spec in the Bible Redesign wave. Builds on BB-14 (My Bible page + activity loader + filter bar).

**Depends on:** BB-14 (My Bible page + activity loader + filter bar), BB-10b (prayer persistence), BB-11b (journal persistence)
**Hands off to:** BB-16 (export & import), BB-42 (full scripture search — different surface)

---

## Overview

Users accumulate highlights, bookmarks, notes, verse-attached prayers, journal entries, and meditation records across dozens of chapters. BB-14 unified them into a single filterable feed. But filtering by type or book still requires the user to know _where_ they marked something. Search closes the last gap: "I know I wrote a note about anxiety somewhere, but I can't remember which verse." The user types a query, the feed narrows in real time to items whose text matches, and highlighted substrings show exactly where the match lives. This is the "find my stuff" feature — not full-text scripture search (that's BB-42).

## User Stories

- As a **logged-in user**, I want to search across all my highlights, notes, bookmarks, prayers, journals, and meditations by keyword so that I can find something I wrote weeks ago without remembering the exact book or chapter.
- As a **logged-out visitor**, I want the same search capability over my locally-stored items so that the "no account ever" promise extends to discovery, not just storage.

## Context

BB-14 did the architectural heavy lifting: the `ActivityItem` envelope type, the cross-store activity loader, the filter pipeline (`useActivityFeed`), the six card components, the filter bar, and the empty states. BB-15 adds one input, one pure-function predicate, one text-highlighting helper, and one new empty state. The codebase change is small because the pipeline was designed to be extensible.

**What this is NOT:** BB-42 is full-text search across all 66 books of the WEB Bible. BB-15 only searches what the user has marked. The two are intentionally separate — "find my stuff" vs. "find that verse" are different tasks with different result types.

## Requirements

### Functional Requirements

#### 1. Search Input

A new `MyBibleSearchInput` component mounted inside the existing `ActivityFilterBar` from BB-14.

**Visual:**
- Standard search input with a magnifying glass icon on the left (use Lucide `Search` icon)
- Placeholder: "Search your highlights, notes, prayers..."
- Width: full-width on mobile, ~320px on desktop
- Same dark cinematic styling as the rest of the My Bible page — frosted card background, subtle border, focus ring on focus
- A small X clear button on the right when the input has a value (use Lucide `X` icon)
- Minimum height 44px for mobile tap target compliance

**Behavior:**
- Real-time filtering as the user types (no submit button, no Enter required)
- Debounce input by ~150ms so each keystroke doesn't trigger a re-filter
- Empty input shows the full activity feed (search filter is bypassed)
- Search is case-insensitive
- Matches are substring-based, not fuzzy
- Trailing/leading whitespace in the query is trimmed
- Multiple words are AND-matched: "anxious peace" matches items containing both "anxious" AND "peace" anywhere in the searched fields, in any order

**Sticky positioning:**
- The search input lives inside the existing sticky filter bar from BB-14, so it stays visible as the user scrolls
- On mobile where the filter bar collapses, the search input stays visible as the primary element; type/book/sort controls collapse beneath it

#### 2. Search Predicate

A pure function module at `src/lib/bible/myBible/searchPredicate.ts` with three exported functions:

- `tokenizeQuery(query: string): string[]` — splits on whitespace, lowercases, filters empties
- `getSearchableText(item: ActivityItem): string` — returns a single lowercase string concatenating: verse text, optional body (note/prayer/journal), optional label (bookmark), and formatted reference. This is the haystack for that item.
- `matchesSearch(item: ActivityItem, query: string): boolean` — returns `true` if every token from `tokenizeQuery` is found as a substring in `getSearchableText`. Empty query returns `true` for all items.

**What gets searched per type:**

| Type | Searched fields |
|---|---|
| Highlight | verse text + formatted reference |
| Bookmark | verse text + optional label + formatted reference |
| Note | verse text + note body + formatted reference |
| Prayer | verse text + prayer body + formatted reference |
| Journal | verse text + journal body + formatted reference |
| Meditation | verse text + formatted reference (no body) |

**Reference matching:** Typing "John 3" or "Romans 8:28" matches items whose formatted reference contains that string. This is part of the predicate, not a separate mode.

#### 3. Filter Pipeline Integration

BB-14's `useActivityFeed` hook runs: load -> type filter -> book filter -> color filter -> sort. BB-15 inserts the search predicate between color filter and sort:

1. Load all items from stores
2. Apply type filter
3. Apply book filter
4. Apply color filter (highlights only)
5. **Apply search predicate** (new)
6. Sort

The `searchQuery` parameter is either added to the `ActivityFilters` type or as a separate argument — whichever fits BB-14's existing shape.

#### 4. Match Highlighting

A `HighlightedText` component renders matching substrings with a subtle accent background via `<mark>` elements.

**Rendering rules:**
- Used inside card components for verse text, note bodies, prayer bodies, journal bodies, and bookmark labels
- Verse number prefixes and reference labels are NOT highlighted — only the searchable text
- Highlighting is cosmetic only — does not affect filter logic
- For multi-token queries, each token is highlighted independently
- `<mark>` elements use a design system token for background (not raw yellow — yellow on dark theme looks bad). Use a subtle purple/violet accent (e.g., `bg-primary/30` or similar from the palette) that reads well on the dark card backgrounds.
- When the search input is empty, `HighlightedText` renders plain text with no `<mark>` elements (zero overhead when not searching)

**Expanded card behavior:** If the predicate matches but the visible substring is in a collapsed body (truncated to 4 lines), the highlighted match appears when the user clicks "Show more."

#### 5. Search-Empty State

A new `EmptySearchResults` component for zero-match search results, distinct from BB-14's filter-empty state:

- Heading: "No matches for "[query]""
- Subtext: "Try a different word, or clear the search to see everything."
- Button: "Clear search" that empties the search input

This replaces the activity feed when search yields zero results. The copy is generic enough to cover the case where search + type/book filters together produce zero results.

### Non-Functional Requirements

- **Performance:** Activity feed re-renders within 50ms per keystroke for ~1000 items. For ~5000 items, re-renders within 50ms (add `getSearchableText` memoization if needed — precompute haystack per item, cache, reuse).
- **Accessibility:** Search input has `aria-label="Search your highlights, notes, prayers, and bookmarks"`. Clear button has `aria-label="Clear search"`. Empty results state uses semantic HTML (heading, paragraph, button). Lighthouse accessibility score >= 95.
- **Reduced motion:** No fade animations on result changes.

## Auth Gating

My Bible is a **public** page. Search operates entirely on localStorage data. No auth gates.

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| Type in search input | Filters activity feed in real time | Filters activity feed in real time | N/A |
| Tap clear (X) button | Clears search, restores full feed | Clears search, restores full feed | N/A |
| Press Escape in search input | Clears input and blurs field | Clears input and blurs field | N/A |
| Tap "Clear search" in empty state | Clears search, restores full feed | Clears search, restores full feed | N/A |

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | Search input full-width at the top of the filter bar, always visible. Type/book/sort controls collapse below the search input as secondary controls. Search input height minimum 44px. Clear (X) button minimum 44px tap target. |
| Tablet (640-1024px) | Search input ~320px width, positioned inline with filter controls. Full filter bar visible. |
| Desktop (> 1024px) | Search input ~320px width, positioned inline with filter controls. Full filter bar visible. |

Additional responsive notes:
- Search input is the primary visible element on mobile; other filters are secondary
- Filter bar remains sticky on all breakpoints (inherited from BB-14)
- All tap targets minimum 44px on all breakpoints
- Page fully usable on 375px viewport width

## AI Safety Considerations

N/A — This feature does not involve AI-generated content or free-text user input. Search queries are used only for client-side filtering of previously saved items. No crisis detection required.

## Auth & Persistence

- **Logged-out users:** Full search works. All data comes from localStorage. Zero database writes.
- **Logged-in users:** Same behavior — localStorage-based. In Phase 3, localStorage keys will sync to backend API.
- **Route type:** Public
- **localStorage keys:** No new keys. Search query is React state only, not persisted to localStorage. A reload clears the search. This matches BB-14's guardrail of not persisting filter state.

## Completion & Navigation

N/A — standalone page, not part of the Daily Hub tabbed experience. No completion tracking.

## Design Notes

- **Search input styling:** Frosted glass treatment matching filter bar — `bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] rounded-xl` with focus ring `focus:border-white/30 focus:ring-2 focus:ring-white/20`. Magnifying glass icon and placeholder text in `text-white/50`.
- **Clear button:** `text-white/50 hover:text-white/80`, positioned right-aligned inside the input, 44px tap target
- **Highlight mark styling:** `<mark>` elements use a subtle purple accent background from the design system (e.g., `bg-primary/25` or `rgba(109, 40, 217, 0.25)`) with `text-white` foreground so highlighted text remains readable on dark card backgrounds. NOT raw yellow.
- **Empty search state:** Uses the existing `FeatureEmptyState` component pattern with warm copy and Lucide `SearchX` or `Search` icon
- **Text colors:** All text uses design tokens; zero raw hex values
- **Design system recon:** `_plans/recon/design-system.md` available for exact CSS values on FrostedCard, atmospheric hero, gradient text
- **No new visual patterns introduced** — this spec composes existing patterns (FrostedCard, filter bar, empty state, design system tokens)

## Out of Scope

- **Full scripture search** — BB-42 owns searching the full WEB Bible
- **Fuzzy matching or typo tolerance** — substring only; users searching their own writing know the words they used
- **Search history** — no "recent searches" dropdown
- **Saved searches** — no "save this query" button
- **Sort by relevance** — search is a filter, not a ranker; items still sort by recent or canonical order per the existing sort toggle
- **Keyboard shortcut to focus search** (e.g., `/`) — would conflict with future features and isn't worth the discoverability cost
- **URL state for search** — query is component state only, doesn't persist across reloads or appear in the URL
- **Analytics on search queries** — not tracking per the wave's privacy stance
- **"Did you mean..." suggestions** — would require fuzzy matching
- **Autocomplete dropdown** — the input is a plain text field
- **Regex support** — no power-user query syntax
- **New sub-views or modals** — search is inline on the My Bible page

## Acceptance Criteria

- [ ] The My Bible page renders a search input inside the filter bar
- [ ] The search input has a magnifying glass icon on the left, placeholder text "Search your highlights, notes, prayers...", and a clear (X) button when populated
- [ ] Typing in the search input filters the activity feed in real time after a ~150ms debounce
- [ ] The search is case-insensitive
- [ ] Multi-word queries AND-match: "anxious peace" only matches items containing both words
- [ ] Search matches against verse text for all six card types (highlight, bookmark, note, prayer, journal, meditation)
- [ ] Search matches against note bodies, prayer bodies, journal bodies, and bookmark labels for the relevant card types
- [ ] Search matches against formatted references (e.g., typing "John 3" finds items in John chapter 3)
- [ ] Matching substrings in card bodies and verse text are visually highlighted via `<mark>` elements in the `HighlightedText` component
- [ ] Highlighted text uses a design system token for the accent background, not raw yellow or raw hex
- [ ] Multi-token queries highlight each token independently (e.g., "anxious peace" highlights both words wherever they appear)
- [ ] Tapping the clear (X) button empties the input and restores the full activity feed
- [ ] Pressing Escape in the search input clears the input and blurs the field
- [ ] An empty search input shows the full activity feed (search filter is bypassed)
- [ ] A search query with zero matches shows the `EmptySearchResults` empty state with the user's query in the heading and a "Clear search" button
- [ ] Search works in combination with the existing type, book, and color filters (filters compose, not override)
- [ ] Tapping type filter pills (e.g., switching to Notes) does not clear the search query
- [ ] Switching the sort toggle does not clear the search query
- [ ] Reloading the page clears the search query (no localStorage persistence)
- [ ] The search input is sticky to the top of the viewport along with the rest of the filter bar
- [ ] On mobile (< 640px), the search input is the primary visible element of the filter bar; type/book/sort controls collapse below it
- [ ] `searchPredicate.ts` unit tests cover: empty query (all items pass), single word match, multi-word AND match, case insensitivity, whitespace trimming, reference match ("John 3"), no match, match in note body, match in verse text, match in bookmark label
- [ ] Activity feed re-renders within 50ms per keystroke for ~1000 items
- [ ] Activity feed re-renders within 50ms per keystroke for ~5000 items (with optional memoization if needed)
- [ ] Lighthouse accessibility score >= 95 on the My Bible page with the search input present
- [ ] Search input has `aria-label="Search your highlights, notes, prayers, and bookmarks"`
- [ ] Clear button has `aria-label="Clear search"`
- [ ] Empty results state has appropriate semantic HTML (heading, paragraph, button)
- [ ] Reduced motion respected — no fade animations on result changes
- [ ] Zero raw hex values in any new component
- [ ] Search input and clear button meet the 44px minimum tap target on mobile
- [ ] Existing card layouts (all six types) are not broken by the addition of `HighlightedText` rendering

## Notes for /plan Execution

- **This spec should feel small.** BB-14 did the architecture. BB-15 is one input, one predicate, one helper component, and one new empty state. If the plan produces more than ~6 new files, audit for scope creep.
- **The `HighlightedText` component touches every card.** Be careful not to break existing card layouts. Treat it as a drop-in replacement for relevant text rendering, not a refactor.
- **150ms debounce is the right number.** Faster (50ms) causes flashing. Slower (300ms) feels laggy.
- **Don't add a search library.** No Fuse.js, no Lunr. Substring matching on ~1000 items is sub-millisecond. Fuzzy matching introduces false positives that hurt more than they help.
- **Test with realistic data.** Seed test environments with notes containing common words ("anxious", "peace", "joy", "Lord", "God") and confirm search returns expected matches across multiple card types.
- **The "search within filter" combination is the trickiest UX case.** User filters to Notes, searches "Romans", gets no results. The empty state copy ("Try a different word, or clear the search to see everything") covers this gracefully.
