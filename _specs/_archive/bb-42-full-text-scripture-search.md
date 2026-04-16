# BB-42: Full-Text Scripture Search

**Master Plan Reference:** N/A — standalone feature on `bible-redesign` branch

**Branch:** `bible-redesign` (no new branch — all work commits directly here)

**Depends on:**
- BB-41 (Web Push Notifications — shipped)
- BB-40 (SEO + canonical URLs — shipped — provides `/bible?mode=search&q=<query>` URL contract)
- BB-39 (PWA + offline reading — shipped — BB-42's index must be precached)
- BB-38 (Deep linking — provides search URL contract and verse deep-link format)
- BB-0 through BB-21+ (WEB Bible JSON data files)
- Existing `BibleSearchMode.tsx` component (wired into BibleLanding by BB-38)

**Hands off to:**
- BB-43 (Reading heatmap) — independent
- Future spec: search filters by testament, book, or topic
- Future spec: search history and saved searches

---

## Overview

Search is the third entry point into scripture for most Bible readers, after "open to the chapter I want" and "follow a reading plan." A user looking for verses about anxiety, hope, forgiveness, or any other topic types those words into a search box and expects relevant results instantly. Without search, the only way to find topical verses is to already know the references — exactly the friction that keeps users from staying in Worship Room and sends them to Google or YouVersion instead.

BB-42 adds full-text search across the entire World English Bible. Search runs entirely client-side against a pre-built inverted index, works offline, returns results in under 100ms for typical queries, ranks results by relevance, supports multi-word AND matching, and links each result directly to the verse via BB-38's deep link format.

## User Story

As a **logged-out visitor or logged-in user**, I want to **search the Bible for any word, phrase, or theme** so that **I can find relevant scripture for whatever I'm going through without needing to know the reference already**.

## Requirements

### Functional Requirements

#### Build-Time Index Generator

1. A script at `frontend/scripts/build-search-index.mjs` reads all 66 WEB Bible JSON files from `frontend/src/data/bible/web/`, tokenizes the verse text, builds an inverted index, and writes it to `frontend/public/search/bible-index.json`
2. The script is wired to `package.json` so it runs as part of the build (or as a prerequisite step) and can also be run manually
3. The generated index is committed to `frontend/public/search/` and added to BB-39's PWA precache manifest so search works offline

**Tokenization rules:**

- Lowercase all tokens
- Strip punctuation except apostrophes inside words ("don't" stays "don't", "world." becomes "world")
- Skip stopwords: "the", "a", "and", "of", "to", "in", "that", "is", "was", "for", "with", "as", "his", "he", "be", "this", "from", "or", "had", "by" (approximately 20 words)
- Apply light stemming: drop trailing "s" for plurals, drop trailing "ed"/"ing" for past tense/gerunds — but ONLY when the resulting stem is at least 4 characters. No full Porter stemming (over-stems common Bible words like "loving" to "lov")
- Keep numbers as tokens ("144,000" stays searchable)

**Index structure:**

- Inverted index: JSON object mapping each token to an array of verse references
- Each verse reference is a compact tuple `[bookSlug, chapter, verse]`
- The index does NOT include verse text — text comes from the existing precached WEB Bible JSON files at query time
- Estimated size: 4-6 MB raw, 1-2 MB gzipped. If gzipped size exceeds 2 MB, the plan phase evaluates splitting by testament.

#### Runtime Search Engine

4. A new pure module at `frontend/src/lib/search/` (no React dependencies) exports `searchBible(query, options)` returning `SearchResult[]`
5. The search engine implements AND-style multi-word matching: all query tokens must appear in the same verse
6. The scoring function ranks results using:
   - **Base score:** number of query tokens that appear in the verse
   - **Proximity bonus:** all query tokens appear close together (within 5 token positions)
   - **Recency bonus:** verse is in a book the user has read recently (from BB-17 streak data via `wr_bible_streak`)
   - **Length penalty:** very long verses get a small penalty to favor concise matches
7. Results are sorted by score descending, with canonical book order as the tiebreaker
8. Default page size is 50 results, with "Load more" pagination for broad queries
9. The index is loaded once on first search and cached in memory for the session
10. The verse text for result display is loaded from the existing precached WEB Bible JSON files in a single batched pass AFTER reference lookup (not inside the search loop)

#### UI Layer (BibleSearchMode)

11. `BibleSearchMode.tsx` is updated to render actual search results from the new engine instead of mock/placeholder data
12. **Loading state:** spinner or skeleton rows while the index loads on first search or while a search is in flight
13. **Empty-query state:** friendly prompt ("Search the Bible for any word, phrase, or theme") with 4-6 clickable example search chips. Suggestions aligned with Worship Room's emotional-healing positioning: "anxiety", "rest", "forgiveness", "courage", "hope", "fear"
14. **No-results state:** "No verses found for '{query}'. Try a different word or phrase."
15. **Result list:** each result shows verse reference (book name, chapter:verse), verse text with matched tokens highlighted, and is clickable
16. **Result count:** above the result list, display "{N} verses found"
17. **Highlight rendering:** matched tokens wrapped in `<mark>` tags with subtle styling from the design system (no obnoxious yellow — use a low-opacity purple or white highlight appropriate for dark theme)
18. Each result links to `/bible/<book>/<chapter>?verse=<n>` per BB-38's deep link contract
19. "Load more" button appends the next 50 results when total exceeds 50

#### URL Contract

20. Cold-loading `/bible?mode=search&q=love` pre-populates the search input and runs the search automatically (BB-38's existing contract — no changes)
21. The `useBibleSearch` hook's 250ms debounce is reused without modification — BB-42 only swaps the search implementation it calls

### Non-Functional Requirements

- **Performance:** under 100ms for typical 1-3 word queries after first-search index load; index loads in under 500ms on first search on a mid-range mobile device
- **Offline:** full search experience works offline after the first visit (index precached by BB-39's service worker)
- **Accessibility:** search input has proper `aria-label`, results are in an `aria-live="polite"` region, each result is keyboard-navigable, `<mark>` highlight is supplemented with visual styling (not just color) for color-blind users, 44px minimum touch targets for result items on mobile
- **Bundle:** zero new npm dependencies — the search engine is hand-written. The plan phase confirms this is feasible; if not, the plan proposes a small library for review before proceeding.

## Auth Gating

**Search has zero auth gates.** All users — logged-in and logged-out — can search freely.

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| Type in search input | Works | Works | N/A |
| View search results | Works | Works | N/A |
| Click a search result (navigate to verse) | Navigates to `/bible/<book>/<chapter>?verse=<n>` | Same | N/A |
| Click example search chip | Populates input and runs search | Same | N/A |
| Click "Load more" | Loads next page of results | Same | N/A |

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | Search input full width. Example chips wrap to 2-3 per row. Results stack vertically, full width. Each result: reference on top (bold), verse text below. Touch targets at least 44px tall. "Load more" button full width. |
| Tablet (640-1024px) | Same vertical stack as mobile but with wider max-width container. Example chips fit in a single row. |
| Desktop (> 1024px) | Centered container (`max-w-2xl` or matching existing BibleSearchMode width). Results maintain comfortable line length. Example chips in a single row. |

Result items should have visible separation (border-bottom or spacing) so they don't blur together. The verse reference should be visually distinct from the verse text (smaller, different weight or opacity).

## AI Safety Considerations

N/A — This feature does not involve AI-generated content or free-text user input sent to an AI model. The search input queries a static pre-built index. No crisis detection required.

## Auth & Persistence

- **Logged-out users:** Full search functionality. Zero data persistence — no search history, no analytics.
- **Logged-in users:** Same as logged-out. The recency bonus reads from `wr_bible_streak` (existing key, read-only — BB-42 does not write to it).
- **localStorage usage:** Zero new keys. The search index lives in memory (session cache) and in the service worker precache (static asset). BB-42 reads `wr_bible_streak` for the recency bonus but does not create or write any new keys.
- **Route type:** Public (no auth required)

## Completion & Navigation

N/A — Search is a standalone utility on `/bible`, not part of the Daily Hub tabbed experience. No completion tracking.

## Design Notes

- **Background:** `BibleSearchMode` sits within the existing `/bible` page which uses the atmospheric hero pattern (`PageHero` with `dashboard-dark` background + radial purple gradient). Search results render below the hero, inheriting the `hero-bg` (#08051A) body background.
- **Text colors:** Results use `text-white` for verse text and `text-white/70` for the verse reference, matching the inner-page text opacity standards from the design system.
- **Highlight marks:** `<mark>` tags should use a subtle background like `bg-primary/20` (low-opacity violet) rather than browser-default yellow, maintaining dark theme immersion. Text inside marks stays `text-white`.
- **Example search chips:** Styled as pill buttons matching existing chip patterns — `bg-white/10 border border-white/20 rounded-full px-4 py-2 text-white/80 hover:bg-white/15` or similar. Not frosted glass cards — these are lightweight quick-action pills.
- **Result items:** Each result is a tappable row/card. Use subtle border-bottom (`border-white/10`) to separate results. Verse reference in `text-sm font-medium text-white/70`, verse text in `text-white leading-relaxed`.
- **Loading skeleton:** Match existing skeleton patterns (3-4 shimmer rows with varying widths).
- **"Load more" button:** Styled as a secondary/ghost button matching existing patterns — `border border-white/20 text-white/70 hover:bg-white/10 rounded-lg`.
- **Typography:** Verse text in search results uses Inter (sans-serif), not Lora — search results are scan-and-click, not sustained reading.
- **Design system recon:** Reference `_plans/recon/design-system.md` for exact PageHero gradient, atmospheric background, and text opacity values on the `/bible` page.

## Out of Scope

- **Phrase search** (quoted exact phrases like `"God so loved the world"`). Multi-word AND search is the initial scope.
- **Fuzzy matching** or typo tolerance. Exact token match only.
- **Regex search.**
- **Filters by testament, book, or genre.** Future spec.
- **Search history or saved searches.** Future spec.
- **Suggestions or autocomplete.** Future spec.
- **Cross-reference search** (BB-0 cross-reference data). Verse text only.
- **Commentary search.** No commentary content exists yet.
- **Multilingual search.** WEB English only.
- **Backend or API calls.** Pure client-side.
- **Analytics on search queries.** Future spec if needed.
- **Search inside reading plans, devotionals, or AI-generated content.** Verse text only.
- **Changes to the `useBibleSearch` hook's debounce behavior** — BB-42 only swaps the search implementation.
- **Changes to the BB-38 search URL contract** — `/bible?mode=search&q=<query>` stays as-is.
- **New npm dependencies.** The search engine is hand-written (plan phase confirms feasibility).

## Notes for Plan Phase

These are consequential decisions the plan phase must address and pause for review:

1. **Exact stopword list and stemming function.** The plan phase must propose the complete stopword list and the exact stemming function before generating the index. Once shipped, changing these means rebuilding the index.
2. **Index size measurement.** After generating the index, measure raw and gzipped size. If gzipped exceeds 2 MB, propose splitting by testament.
3. **Batch-load pattern.** The search engine must look up references first (fast index intersection), then load verse text in a single batched pass. Do NOT load text inside the search loop.
4. **Example search chips.** The plan phase proposes the exact chip labels and pauses for review. Default candidates: "anxiety", "rest", "forgiveness", "courage", "hope", "fear".
5. **Index placement.** Index goes in `frontend/public/search/` (not `src/data/`) so vite-plugin-pwa precaches it as a static asset. Confirm BB-39's `globPatterns` covers this path.
6. **Pure module architecture.** The search engine at `frontend/src/lib/search/` must have zero React imports. The hook layer (`useBibleSearch`) is the React boundary.
7. **Documentation.** A file at `_plans/recon/bb42-search-index.md` documenting the index format, tokenization rules, scoring function, size measurements, and deferred follow-ups.

## Pre-Execution Checklist

Before `/execute-plan`, verify:

1. BB-41 is shipped and committed on `bible-redesign`
2. `BibleSearchMode.tsx` exists and is the current search UI component
3. The `useBibleSearch` hook has a 250ms debounce that BB-42 reuses
4. Total size of `frontend/src/data/bible/web/*.json` is measured
5. BB-39's `globPatterns` in `vite.config.ts` is confirmed to cover `public/search/`
6. Example search chips are reviewed and approved
7. Exact stopword list and stemming function are reviewed and approved
8. On `bible-redesign` branch — no branch switch
9. Zero new npm packages confirmed feasible

## Acceptance Criteria

- [ ] Build script at `frontend/scripts/build-search-index.mjs` generates the search index from all 66 WEB Bible JSON files
- [ ] Script is wired to `package.json` and runs as part of the build
- [ ] Generated index at `frontend/public/search/bible-index.json` uses compact tuple format `[bookSlug, chapter, verse]`
- [ ] Index uses documented tokenization: lowercase, punctuation stripping (apostrophes preserved), stopword removal, light stemming (min 4-char result)
- [ ] Index gzipped size is documented; under 2 MB gzipped
- [ ] Index path is added to BB-39's PWA precache manifest (`globPatterns` in vite.config.ts)
- [ ] New module at `frontend/src/lib/search/` exports `searchBible(query, options)` returning `SearchResult[]`
- [ ] Search engine has zero React imports — pure TypeScript module
- [ ] Search implements AND-style multi-word matching (all tokens must appear in verse)
- [ ] Scoring uses base score + proximity bonus + recency bonus + length penalty
- [ ] Results sorted by score descending, canonical book order as tiebreaker
- [ ] Default 50 results with "Load more" pagination for additional results
- [ ] Verse text loaded from existing precached WEB JSON files (not duplicated in index)
- [ ] Index loaded once on first search and cached in memory for the session
- [ ] `BibleSearchMode.tsx` renders loading state (spinner/skeleton) during index load and search
- [ ] Empty-query state shows prompt text and 4-6 clickable example search chips
- [ ] No-results state shows "No verses found for '{query}'. Try a different word or phrase."
- [ ] Result list shows verse reference + verse text with highlighted matched tokens
- [ ] Result count displayed above list: "{N} verses found"
- [ ] Each result is clickable and navigates to `/bible/<book>/<chapter>?verse=<n>`
- [ ] `<mark>` highlight uses dark-theme-appropriate styling (low-opacity purple background, not yellow)
- [ ] Cold-loading `/bible?mode=search&q=love` runs the search automatically and renders results
- [ ] Search performance under 100ms for 1-3 word queries (after index load)
- [ ] Index loads in under 500ms on first search
- [ ] Full search works offline after first visit (index precached)
- [ ] All BB-30 through BB-41 tests continue to pass unchanged
- [ ] At least 20 unit tests for tokenization, stemming, and stopword handling
- [ ] At least 15 unit tests for search matching, scoring, and ranking
- [ ] At least 10 component tests for `BibleSearchMode` result rendering, empty states, and click handling
- [ ] Integration test: cold-loading `/bible?mode=search&q=<query>` runs search and renders results
- [ ] No TypeScript errors, no new lint warnings
- [ ] Zero new auth gates, zero new localStorage keys
- [ ] Documentation at `_plans/recon/bb42-search-index.md` covers index format, tokenization, scoring, size, and deferred follow-ups
- [ ] On mobile (375px), results display full-width with 44px minimum touch targets
- [ ] Search input has `aria-label`, results in `aria-live="polite"` region, results keyboard-navigable
- [ ] Example search chips are keyboard-accessible (focusable, activatable with Enter/Space)
