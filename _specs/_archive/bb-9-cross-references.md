# BB-9: Cross-References

**Master Plan Reference:** N/A — standalone feature within the Bible redesign wave
**Branch:** `bible-redesign`
**Depends on:** BB-4 (verse spans + WEB data), BB-6 (action sheet + registry + sub-view push API), BB-8 (optional — reference parser can be imported for display)
**Hands off to:** BB-14 (My Bible can surface "most visited cross-references"), BB-38 (deep linking enables verse-anchor scrolling on cross-ref navigation)

---

## Overview

When a user reads Romans 5:1 and taps Cross-references, they should find themselves face-to-face with Isaiah 53:5 — a prophecy written 700 years before Paul's letter. Cross-references are what turn the Bible from a linear text into a web of interconnected revelation. This spec makes the Cross-references action in the verse action sheet fully functional: a sub-view showing related verses from the Treasury of Scripture Knowledge (TSK), each with a preview of the verse text, sorted by connection strength, and tappable to navigate to the referenced passage.

This is the first spec in the Bible redesign wave that is purely read-only — no store, no persistence, no user-created data. All the work is in sourcing good cross-reference data, rendering it beautifully, and making the navigation feel like *discovery*, not a concordance dump.

## User Stories

As a **logged-in user** reading the Bible, I want to see cross-references for a verse so that I can discover related passages and understand how scripture connects across books and centuries.

As a **logged-out visitor** reading the Bible, I want to tap Cross-references and browse related verses so that I can explore the interconnected web of scripture without creating an account.

As a **logged-in user** selecting multiple verses (e.g., John 3:16–18), I want to see the combined cross-references grouped by source verse so that I can explore connections for my entire selection in one view.

## Requirements

### Cross-Reference Data Source

1. Cross-references come from the **Treasury of Scripture Knowledge (TSK)** — a public-domain dataset compiled in the 1830s with 500,000+ cross-references across all 66 books
2. Data is sharded into 66 per-book JSON files at `src/data/bible/cross-references/{bookSlug}.json` — one file per source book, containing all cross-references *from* that book
3. Each per-book file uses the shape: `{ "{chapter}.{verse}": [{ "ref": "{bookSlug}.{chapter}.{verse}", "rank": number }] }`
4. Key format uses dot-separated `{bookSlug}.{chapter}.{verse}` matching the book slug convention from BB-2
5. Rank indicates connection strength: 1 = strongest (direct citation or near-quotation), higher numbers = progressively looser connections
6. **Data prerequisite:** the plan phase must verify `src/data/bible/cross-references/` exists with all 66 book files before writing any code. If missing, halt with: *"Cross-reference data not found at `src/data/bible/cross-references/`. Run the cross-reference setup task before proceeding."*

### Loader Module (Read-Only)

7. A loader module at `src/lib/bible/crossRefs/loader.ts` provides: `loadCrossRefsForBook(bookSlug)` (async, returns CrossRefMap), `getCrossRefsForVerse(map, chapter, verse)` (sync, returns CrossRef[]), `getCrossRefCountForVerse(map, chapter, verse)` (sync, returns number)
8. `loadCrossRefsForBook` uses dynamic import (`import()`) for Vite code-splitting — each book's JSON loads only when needed
9. An in-memory `Map<bookSlug, CrossRefMap>` cache in module scope stores loaded books for the session. No localStorage persistence. Cache clears on full page reload
10. If a book file fails to load (missing, corrupt), return an empty map without crashing
11. Each CrossRef entry includes a `parsed` field (`{ book, chapter, verse }`) pre-parsed from the ref string for display and navigation

### Count Badge on Action Sheet

12. The Cross-references row in the action sheet shows a count badge indicating how many cross-references exist for the selected verse(s)
13. Count > 0: badge shows the number (e.g., "12")
14. Count = 0: badge is hidden; the row remains tappable (opens the empty state)
15. Count > 99: badge shows "99+"
16. Count loading (book not yet cached): badge shows a small pulsing dot animation
17. **Preloading:** the reader page preloads cross-refs for the current book on mount, in parallel with the chapter text, so the badge count is available instantly when the action sheet opens

### Multi-Verse Selection Badge

18. For a range selection (e.g., John 3:16–18), the badge count is the **union** of cross-references across all verses in the range, deduplicated by destination reference
19. If verses 16, 17, and 18 have 10, 4, and 6 cross-refs respectively with 2 overlapping destinations, the badge shows 18 (not 20)

### Cross-References Sub-View

20. Tapping the Cross-references row pushes a sub-view (replacing the existing `CrossRefsStub` from BB-6) with the following layout:

**Header:**
21. Back button (left) pops to action sheet root
22. Title: "Cross-references"
23. Subtitle: source verse reference (e.g., "for John 3:16" or "for John 3:16–18")
24. Close button (X, right) closes the entire action sheet

**Context strip:**
25. Preview of the source verse text, truncated to two lines, muted, non-interactive

**Sort toggle:**
26. Segmented control with two options: "Strongest first" (default) and "Canonical order"
27. "Strongest first" sorts by rank ascending (rank 1 at top)
28. "Canonical order" sorts by book order in the Bible, then chapter, then verse
29. Sort selection is per-session (stored in a ref), not persisted to localStorage

**Cross-reference list:**
30. Each row shows: reference label (e.g., "Romans 5:8") as the primary text, verse text preview below, rank indicator as a subtle dot/bar in the right margin (opacity scales with rank — rank 1 = full opacity, higher ranks progressively lighter), and a right chevron
31. Each row is a full-width tap target (minimum 44px height)
32. Verse text previews load lazily — skeletons render immediately, real text populates as each destination book's chapter data loads in parallel

**Multi-verse grouping:**
33. For multi-verse selections, the list groups rows by source verse with small subheaders (e.g., "From 3:16:", "From 3:17:")
34. Ungrouped sort modes (strongest first / canonical) flatten everything into one list without subheaders

**Empty state:**
35. For verses with no cross-references: heading "No cross-references for this verse." with subtext "Not every verse has direct connections in the Treasury of Scripture Knowledge." and a muted icon
36. The empty state should feel like a quiet acknowledgment, not an error

**Footer:**
37. Small caption: "Cross-references from Treasury of Scripture Knowledge · Public Domain"

### Preview Text Loading

38. When the sub-view opens, immediately render all rows with the reference label and a skeleton loader for the verse text
39. Group cross-references by destination book and load each book's chapter data in parallel
40. As each book loads, populate verse text for its rows — skeletons fade out, real text fades in
41. Books already loaded by the reader (e.g., the current book) use cached data instantly

### Navigation on Tap

42. Tapping a cross-reference row navigates to the referenced chapter: `/bible/{book}/{chapter}`
43. Navigation is handled by a single `navigateToReference` helper at `src/lib/bible/crossRefs/navigation.ts` — structured as a single seam for BB-38 to upgrade later (BB-38 will add `#v{verse}` anchoring)
44. On navigation: the action sheet closes, focus mode resumes if applicable
45. The reader scrolls to the top of the new chapter (BB-38 will override this to scroll-to-verse)

### Sort Helpers

46. Sort utilities at `src/lib/bible/crossRefs/sort.ts` provide: `sortByStrength(refs)` (rank ascending, stable within equal ranks) and `sortByCanonicalOrder(refs)` (Bible book order → chapter → verse)
47. Canonical order uses the existing `BIBLE_BOOKS` constant from `constants/bible.ts` for book ordering

## Auth Gating

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| View cross-reference count badge | Visible | Visible | N/A |
| Tap Cross-references row | Opens the sub-view | Opens the sub-view | N/A |
| Browse cross-reference list | Full access, all rows visible | Full access | N/A |
| Sort cross-references | Works | Works | N/A |
| Tap a cross-reference to navigate | Navigates to the chapter | Navigates to the chapter | N/A |

**No auth gate on any cross-reference action.** Cross-references are read-only, sourced from public-domain data, and involve no user-generated content or persistence. The Bible reader at `/bible/:book/:chapter` is a public route. Both logged-in and logged-out users have identical experiences. This matches the pattern established by BB-7 (highlights), BB-7.5 (bookmarks), and BB-8 (notes).

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | Sub-view fills action sheet width. Sort toggle is full-width segmented control. Cross-ref rows stack reference label above verse preview. Skeleton loaders match row height. Touch targets 44px minimum. Footer caption wraps if needed |
| Tablet (640–1024px) | Same as mobile — the action sheet is a fixed-width bottom sheet on all screen sizes |
| Desktop (> 1024px) | Same layout within the action sheet. Hover states on cross-ref rows (subtle background highlight). Sort toggle stays compact |

The action sheet itself handles responsive width/height — the cross-references sub-view fills whatever space the sheet provides. No breakpoint-specific layout changes needed beyond standard text reflow.

## AI Safety Considerations

N/A — This feature does not involve AI-generated content or free-text user input. Cross-references are sourced from a static, public-domain dataset (Treasury of Scripture Knowledge). No crisis detection required.

## Auth & Persistence

- **Logged-out users:** Full access to cross-references. No data persistence — cross-references are read-only from static JSON files
- **Logged-in users:** Same experience as logged-out. No user data is written
- **localStorage usage:** None. The in-memory cache exists only for the duration of the browser session. Sort preference is stored in a React ref (per-session only)
- **Route type:** Public (the Bible reader is a public route)

## Completion & Navigation

N/A — the Bible reader is not part of the Daily Hub tabbed experience. Cross-reference browsing does not signal to the Daily Hub completion tracking system. Cross-reference navigation triggers standard React Router navigation to `/bible/{book}/{chapter}`.

## Design Notes

- **Tone:** Discovery, not research. The cross-reference list should feel like finding a trail of connected passages — not like consulting a concordance. Reference labels should be prominent, verse previews should give enough context to decide whether to follow the thread
- **Theme tokens:** The sub-view inherits the reader's theme (midnight, parchment, sepia) via the action sheet's existing theme-scoped styling. No new CSS custom properties needed — reuse the reader's existing text, background, and border tokens
- **Rank indicator:** A subtle visual element (small dot or thin vertical bar) in the right margin of each row. Rank 1 renders at full opacity; higher ranks render at progressively lower opacity (e.g., rank 2 at 0.6, rank 3 at 0.4, rank 4+ at 0.2). This communicates connection strength without adding cognitive overhead
- **Skeleton loading:** Verse text skeleton loaders should match the approximate height of one line of verse text. Use the same skeleton animation pattern as existing Bible reader loading states
- **FrostedCard:** Not used inside the sub-view — rows use the action sheet's existing list styling with theme-scoped separators
- **Sort toggle:** Small segmented control using the reader's theme-scoped active/inactive colors. Not the Daily Hub's white-pill style — it should feel native to the reader chrome
- **Empty state:** Muted icon (e.g., a link/chain icon at reduced opacity), warm copy, no heavy illustration. The empty state should feel like "this verse is a quiet one in the concordance" — not like something is broken
- **Zero raw hex values** — all colors use design system tokens or Tailwind theme classes
- **Reduced motion:** Skeleton fade-in and sub-view push/pop transitions respect `prefers-reduced-motion`. With reduced motion, skeletons swap instantly (no fade), sub-view appears without slide animation

## Out of Scope

- **User-added cross-references** — read-only TSK data only
- **Commentary or explanations** — no "how is this connected?" text; BB-30 AI explain may offer this later
- **Topical tags or themes** — flat reference list only
- **Sharing cross-reference lists** — share is per-verse (existing), not per-list
- **Searching within cross-references** — the list is short enough to scan; full scripture search is BB-42
- **Tracking visited cross-references** — no persistence of which refs the user has followed
- **Filtering by rank/strength** — sort is sufficient
- **Multiple data sources** — TSK only (no Scofield, Jamieson-Fausset-Brown, etc.)
- **Verse-anchor scrolling on navigation** — BB-38 will add `#v{verse}` deep linking; BB-9 navigates to the chapter only
- **Store in the write sense** — no persistence, no subscribe, no user modification
- **Backend/API work** — all data is static JSON, no server interaction (Phase 3+ concern)

## Acceptance Criteria

- [ ] Cross-references row in action sheet shows count badge for verses with cross-references
- [ ] Badge shows "99+" when count exceeds 99
- [ ] Badge shows a loading pulse animation when the book's cross-refs haven't loaded yet
- [ ] Badge is hidden when no cross-references exist for the verse
- [ ] Tapping the row pushes the Cross-references sub-view with the correct source verse reference in the header
- [ ] Context strip shows the source verse text preview, truncated to two lines
- [ ] Cross-reference rows render with skeleton loaders while verse preview text loads
- [ ] Skeletons are replaced with real verse text as each destination book loads
- [ ] Default sort is "Strongest first" (rank 1 at top)
- [ ] Tapping "Canonical order" re-sorts by book order, then chapter, then verse
- [ ] Each row shows reference label, verse text preview, rank indicator, and right chevron
- [ ] Tapping a row navigates to the referenced chapter (`/bible/{book}/{chapter}`) and closes the sheet
- [ ] Multi-verse selections show a deduplicated count badge summing cross-refs from all verses in the range
- [ ] Multi-verse sub-view groups rows by source verse with small subheaders ("From 3:16:", etc.)
- [ ] Empty state renders with warm copy for verses with no cross-references
- [ ] Book cross-ref files load asynchronously via dynamic import and cache in memory
- [ ] Subsequent action sheet opens within the same session use the cached map instantly (no re-fetch)
- [ ] Reader page preloads cross-refs for the current book in parallel with chapter text on mount
- [ ] `navigateToReference` helper is structured as a single function (single seam for BB-38 upgrade)
- [ ] Footer shows "Cross-references from Treasury of Scripture Knowledge · Public Domain"
- [ ] All tap targets are at least 44px
- [ ] Reduced motion is respected on skeleton fade-in and sub-view transitions
- [ ] Zero raw hex values — all colors use design system tokens
- [ ] Sort tests cover: strongest-first with mixed ranks, canonical order across book boundaries, stable sort within equal ranks
- [ ] Loader tests cover: successful load, cached reuse, missing book returns empty map without crashing
- [ ] Plan phase halts with clear error if `src/data/bible/cross-references/` directory doesn't exist or is incomplete (fewer than 66 files)
- [ ] Rank indicator visual correctly scales opacity by rank (rank 1 = full, higher = lighter)
- [ ] Sort toggle remembers selection within the session but does not persist to localStorage
- [ ] Cross-ref data for current book is preloaded so first action sheet open has the count instantly (no loading state on badge)
