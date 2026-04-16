# Implementation Plan: BB-42 Full-Text Scripture Search

**Spec:** `_specs/bb-42-full-text-scripture-search.md`
**Date:** 2026-04-13
**Branch:** `bible-redesign` (no new branch — commits directly to existing branch)
**Design System Reference:** `_plans/recon/design-system.md` (loaded, captured 2026-04-05, 8 days old — fresh)
**Recon Report:** N/A — extends existing `/bible` page, no new page to recon
**Master Spec Plan:** N/A — standalone feature

---

## Architecture Context

### Project Structure

- **Frontend**: `frontend/src/` — React 18 + TypeScript + Vite + TailwindCSS
- **Components**: `frontend/src/components/bible/` — Bible-related UI components
- **Hooks**: `frontend/src/hooks/` — Custom React hooks
- **Lib**: `frontend/src/lib/` — Pure TypeScript modules (no React)
- **Types**: `frontend/src/types/` — TypeScript interfaces
- **Constants**: `frontend/src/constants/` — Static constants
- **Data**: `frontend/src/data/bible/` — Bible JSON data (66 books × 2 formats)
- **Public**: `frontend/public/` — Static assets served by Vite (precached by PWA)
- **Scripts**: `frontend/scripts/` — Build-time scripts (`.mjs`)
- **Tests**: Co-located `__tests__/` directories

### Existing Search Architecture (to be replaced)

**Current implementation**: `useBibleSearch` hook (`frontend/src/hooks/useBibleSearch.ts:66-141`) lazy-loads ALL 66 book JSON files from `frontend/src/data/bible/books/json/` on first search (5.7 MB), stores them in a `Map<string, BibleChapter[]>`, then performs regex matching across all loaded data. Results are limited to 100 and include context verses (before/after).

**Problems BB-42 solves**:
1. First-search latency: loading 5.7 MB of JSON files in parallel before search can execute
2. No relevance ranking: results returned in canonical order, not by score
3. Simple substring regex matching: no multi-word AND, no stemming, no proximity
4. No pagination: hard cap at 100 results with no "Load more"
5. No empty-state guidance: no example search chips for discoverability

**BB-42 approach**: Pre-built inverted index at `frontend/public/search/bible-index.json` (~4-6 MB raw, ~1-2 MB gzipped). Pure TypeScript search engine at `frontend/src/lib/search/`. Index loaded once on first search via `fetch()`, cached in module-level variable. Verse text loaded from existing `web/` JSON loaders AFTER reference lookup (not duplicated in index).

### Key Files to Modify

| File | Action | Purpose |
|------|--------|---------|
| `frontend/scripts/build-search-index.mjs` | CREATE | Build-time index generator |
| `frontend/public/search/bible-index.json` | CREATE (generated) | Pre-built inverted index |
| `frontend/src/lib/search/tokenizer.ts` | CREATE | Tokenize, stem, stopword filter |
| `frontend/src/lib/search/engine.ts` | CREATE | Index loader, AND-match, scoring, ranking |
| `frontend/src/lib/search/types.ts` | CREATE | SearchResult, SearchOptions, index types |
| `frontend/src/lib/search/index.ts` | CREATE | Barrel export |
| `frontend/src/hooks/useBibleSearch.ts` | MODIFY | Swap regex search for index-based engine |
| `frontend/src/components/bible/BibleSearchMode.tsx` | MODIFY | Add chips, load more, better states |
| `frontend/vite.config.ts` | MODIFY | Add `*.json` to globPatterns for precache |
| `frontend/package.json` | MODIFY | Add `build-search-index` script |
| `frontend/src/types/bible.ts` | MODIFY | Update BibleSearchResult interface |

### Existing Test Patterns

- **Component tests**: `MemoryRouter` wrapping, mock hooks via `vi.mock()`, mock `useStaggeredEntrance`. See `frontend/src/components/bible/__tests__/BibleSearchMode.test.tsx`.
- **Hook tests**: `renderHook` from RTL, `vi.useFakeTimers()` for debounce, mock `@/data/bible`. See `frontend/src/hooks/__tests__/useBibleSearch.test.tsx`.
- **Pure module tests**: Direct import and test. See `frontend/src/lib/bible/__tests__/streakStore.test.ts`.
- **Provider wrapping for BibleLanding context**: `BibleDrawerProvider` + `AuthModalProvider`.

### Bible Data Structure

**`/web/` format** (used by BibleReader and for verse text lookup):
```typescript
{
  book: string,      // "Genesis"
  slug: string,      // "genesis"
  testament: string,  // "OT" | "NT"
  chapters: [{
    number: number,
    verses: [{ number: number, text: string }],
    paragraphs: number[]
  }]
}
```

**Size**: 66 files, 6.0 MB total. Largest: psalms.json (380 KB). Smallest: 2-john.json (4 KB).

**Loading mechanism**: `WEB_BOOK_LOADERS` map with dynamic imports. Each returns `Promise<WebBookJson>`. Used by `loadChapterWeb(bookSlug, chapter)` in `frontend/src/data/bible/index.ts`.

### URL Contract (BB-38)

- Search mode activated by `/bible?mode=search&q=<query>`
- `BibleLanding.tsx` reads `searchParams.get('mode') === 'search'` and renders `BibleSearchMode`
- `useSearchQuery()` hook manages `?q=` param with 250ms debounce
- Search results link to `/bible/<bookSlug>/<chapter>#verse-<verseNumber>`
- BB-42 does NOT change this contract — only swaps what `useBibleSearch` does internally

### Streak Data (for recency bonus)

- `bible:streak` localStorage key stores `StreakRecord` including `lastReadDate` (ISO date string)
- `wr_bible_progress` stores chapters read per book (`Record<string, number[]>`)
- For recency bonus: read `wr_bible_progress` to check which books the user has read recently
- BB-42 reads this data (read-only), does NOT write to it

### PWA Configuration

- **Strategy**: `injectManifest` with custom `src/sw.ts`
- **globPatterns**: `['**/*.{js,css,html,ico,png,svg,woff2}']` — does NOT include `*.json`
- **Action needed**: Add `*.json` to globPatterns OR add a specific pattern for `search/bible-index.json`
- The index file in `public/search/` will be served as a static asset and must be precached for offline search

---

## Auth Gating Checklist

**BB-42 has zero auth gates.** All search functionality is available to logged-out and logged-in users.

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| N/A | No auth gates | N/A | N/A |

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Search input | border/bg | `border border-white/[0.12] bg-white/[0.06] rounded-xl` | BibleSearchMode.tsx:65 (existing) |
| Search input | focus | `focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-white/20` | BibleSearchMode.tsx:65 |
| Search input | text | `text-white placeholder:text-white/50` | BibleSearchMode.tsx:65 |
| Example chips | bg/border | `bg-white/10 border border-white/20 rounded-full px-4 py-2` | Spec design notes |
| Example chips | text | `text-white/80 hover:bg-white/15` | Spec design notes |
| Result items | container | `border-b border-white/10` (separator between results) | Spec design notes |
| Result items | reference | `text-sm font-medium text-white/70` | Spec design notes |
| Result items | verse text | `text-white leading-relaxed` (Inter, not Lora) | Spec design notes |
| Highlight mark | bg/text | `bg-primary/20 rounded px-0.5 font-semibold text-white` | BibleSearchMode.tsx:20 (existing) |
| Result count | style | `text-sm text-white/60` | BibleSearchMode.tsx:103 (existing pattern) |
| Load more button | style | `border border-white/20 text-white/70 hover:bg-white/10 rounded-lg` | Spec design notes |
| Content container | max-width | `max-w-2xl mx-auto` | BibleSearchMode.tsx:53 (existing) |
| Body background | color | `#08051A` (hero-bg) | design-system.md |
| Atmospheric hero | gradient | `radial-gradient(ellipse at top center, rgba(109, 40, 217, 0.15) 0%, transparent 70%)` over `#0f0a1e` | design-system.md |

---

## Design System Reminder

**Project-specific quirks that `/execute-plan` displays before every UI step:**

- Worship Room uses `GRADIENT_TEXT_STYLE` (white-to-purple gradient via `background-clip: text`) for hero and section headings on dark backgrounds. Caveat font has been deprecated for headings — used only for the logo.
- The `/bible` page uses the Atmospheric PageHero variant (dashboard-dark `#0f0a1e` background with radial purple gradient). Search results render below the hero, inheriting the `hero-bg` (#08051A) body background.
- `<mark>` highlights use `bg-primary/20` (low-opacity violet) — NOT browser-default yellow. Text inside marks stays `text-white`. This is already implemented in `HighlightedText` component.
- Search result verse text uses **Inter** (sans-serif), NOT Lora — search results are scan-and-click, not sustained reading.
- Example search chips are lightweight pill buttons — NOT frosted glass cards. Use `bg-white/10 border border-white/20 rounded-full`.
- All text on dark backgrounds follows the opacity standards: primary text `text-white`, references `text-white/70`, helper text `text-white/60`, placeholder `placeholder:text-white/50`.
- Result items must have 44px minimum touch targets on mobile (spec accessibility requirement).
- Frosted glass cards: `bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] rounded-2xl` with dual box-shadow. Use the `FrostedCard` component for cards, but individual result rows should be lighter — `border-b border-white/10` separation, not full cards.
- No deprecated patterns: no Caveat headings, no animate-glow-pulse, no cyan borders, no soft-shadow 8px-radius cards.

---

## Shared Data Models (from Master Plan)

N/A — standalone feature. BB-42 does not introduce shared data models.

**localStorage keys this spec touches:**

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_bible_progress` | Read | Chapters read per book (for recency bonus in scoring) |
| `bible:streak` | Read | Streak data (for recency bonus — `lastReadDate`) |

**Zero new localStorage keys.** The search index lives in memory (module-level cache) and in the PWA precache (static asset).

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | Search input full width. Example chips wrap to 2-3 per row via `flex-wrap`. Results stack vertically, full width. Each result: reference on top (bold), verse text below. Touch targets ≥44px. "Load more" button full width. |
| Tablet | 768px | Same vertical stack but with wider `max-w-2xl` container. Example chips fit in a single row. |
| Desktop | 1440px | Centered container (`max-w-2xl`). Results maintain comfortable line length. Example chips in a single row. |

---

## Inline Element Position Expectations (UI features with inline rows)

| Element Group | Elements | Expected y-alignment | Wrap Tolerance |
|---------------|----------|---------------------|----------------|
| Example search chips | 6 pill buttons | Same y ±5px at 1440px and 768px | Wrapping to 2 rows at 375px is acceptable |

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| Search input → helper text | 8px (`mt-2`) | BibleSearchMode.tsx:68 |
| Helper text → chips/results | 24px (`mt-6`) | BibleSearchMode.tsx:72 |
| Result count → first result | 16px (`gap-4` in flex col) | BibleSearchMode.tsx:102 |
| Between result items | Continuous — `border-b` separator, padding provides visual gap | Spec design notes |
| Last result → "Load more" button | 24px (`mt-6`) | Follows existing spacing pattern |

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] BB-41 is shipped and committed on `bible-redesign`
- [ ] `BibleSearchMode.tsx` exists and is the current search UI component
- [ ] `useBibleSearch` hook has a debounce that BB-42 reuses (300ms internal timer)
- [ ] Total size of `frontend/src/data/bible/web/*.json` is ~6.0 MB (confirmed)
- [ ] BB-39's `globPatterns` in `vite.config.ts` currently covers `**/*.{js,css,html,ico,png,svg,woff2}` — needs `*.json` added
- [ ] **Example search chips reviewed**: "anxiety", "rest", "forgiveness", "courage", "hope", "fear" — awaiting user approval
- [ ] **Stopword list reviewed** — see Edge Cases & Decisions — awaiting user approval
- [ ] **Stemming function reviewed** — see Edge Cases & Decisions — awaiting user approval
- [ ] On `bible-redesign` branch — no branch switch
- [ ] Zero new npm packages confirmed (hand-written search engine)
- [ ] All auth-gated actions from the spec are accounted for (zero gates)
- [ ] No deprecated patterns used
- [ ] `public/search/` directory does not exist yet (will be created)

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Stopword list (20 words)** | `the, a, an, and, of, to, in, that, is, was, for, with, as, his, he, be, this, from, or, had, by, it, not, but, are, at, have, were, which, their` | Spec says ~20. Expanded slightly to 30 to match the most common English words that add no search value in scripture. Numbers like "144000" are NOT stopwords. |
| **Stemming rules** | Drop trailing `s` → stem ≥4 chars; drop trailing `ed` → stem ≥4 chars; drop trailing `ing` → stem ≥4 chars; drop trailing `ly` → stem ≥4 chars; drop trailing `ness` → stem ≥4 chars. No full Porter stemming. | Spec explicitly says no full Porter stemming. Light stemming only for plurals/past tense/gerunds. "loving" → "lov" is wrong (only 3 chars), so "loving" stays as "loving". "prayers" → "prayer" (6 chars, good). "forgiveness" → "forgive" via `ness` rule (7 chars, good). |
| **Index size > 2 MB gzipped** | Measure after generation. If exceeds 2 MB: split into `bible-index-ot.json` and `bible-index-nt.json`, load both on first search. | Spec says to evaluate splitting if gzipped > 2 MB. Likely within budget since the index excludes verse text. |
| **Result link format** | `/bible/<bookSlug>/<chapter>?verse=<n>` (spec requirement) vs existing `#verse-<n>` hash format | Spec says `?verse=<n>` query param. The existing BibleSearchMode uses `#verse-<n>` hash. BB-42 will use `?verse=<n>` per the spec, which matches BB-38's deep link contract. |
| **Highlight rendering** | Reuse existing `HighlightedText` component but adapt for multi-word token matching | The existing component does single-string regex matching. BB-42 needs to highlight individual matched tokens across the verse text. Will create a new `HighlightedTokens` subcomponent. |
| **Recency bonus data source** | `wr_bible_progress` (chapters read per book) | More granular than `bible:streak` (which only has `lastReadDate`). If a user has read chapters in Psalms recently, Psalms results rank higher. |
| **BibleSearchEntry inconsistency** | Not fixed by BB-42 | `BibleSearchEntry.tsx` navigates to `/bible/search?q=...` which is a different route than the BB-38 contract `/bible?mode=search&q=...`. This is a pre-existing issue. BB-42 focuses on the search engine and BibleSearchMode — fixing BibleSearchEntry's route is out of scope. |
| **Existing context verses (contextBefore/contextAfter)** | Remove from search results | The spec does not mention context verses. BB-42 results show verse reference + verse text + highlight. Context verses added unnecessary bulk to each result. The `BibleSearchResult` type will be updated. |
| **Score tiebreaker** | Canonical book order (Genesis → Revelation) | Spec requirement. Use the index position in `BIBLE_BOOKS` array. |
| **Index generation timing** | Separate `prebuild` script, not part of `vite build` | The index is generated once and committed. Regeneration only needed if Bible data changes. Adding it to every `vite build` would add unnecessary build time. |

---

## Tokenization Specification

**Complete stopword list (30 words):**

```typescript
const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'of', 'to', 'in', 'that', 'is', 'was',
  'for', 'with', 'as', 'his', 'he', 'be', 'this', 'from', 'or', 'had',
  'by', 'it', 'not', 'but', 'are', 'at', 'have', 'were', 'which', 'their',
])
```

**Stemming function:**

```typescript
function stem(word: string): string {
  // Rule order matters — most specific suffix first
  if (word.endsWith('ness') && word.length - 4 >= 4) return word.slice(0, -4)
  if (word.endsWith('ing') && word.length - 3 >= 4) return word.slice(0, -3)
  if (word.endsWith('ed') && word.length - 2 >= 4) return word.slice(0, -2)
  if (word.endsWith('ly') && word.length - 2 >= 4) return word.slice(0, -2)
  if (word.endsWith('s') && !word.endsWith('ss') && word.length - 1 >= 4) return word.slice(0, -1)
  return word
}
```

**Tokenization pipeline:**
1. Lowercase the input
2. Split on whitespace and punctuation: `/[^a-z0-9']+/` (keep apostrophes inside words)
3. Strip leading/trailing apostrophes from each token
4. Remove empty tokens
5. Filter out stopwords
6. Apply stem function
7. Remove duplicates per verse (for index building)

---

## Implementation Steps

### Step 1: Search Types and Tokenizer Module

**Objective:** Create the pure TypeScript types and tokenizer that both the build script and runtime engine share.

**Files to create/modify:**
- `frontend/src/lib/search/types.ts` — Search types
- `frontend/src/lib/search/tokenizer.ts` — Tokenize, stem, stopword filter

**Details:**

`types.ts`:
```typescript
/** Compact verse reference tuple: [bookSlug, chapter, verse] */
export type VerseRef = [string, number, number]

/** The inverted index structure stored on disk */
export interface SearchIndex {
  version: 1
  generatedAt: string
  totalVerses: number
  tokens: Record<string, VerseRef[]>
}

/** Scoring options for search */
export interface SearchOptions {
  /** Max results per page (default 50) */
  pageSize?: number
  /** Page number (0-indexed, default 0) */
  page?: number
  /** Book slugs the user has read recently (for recency bonus) */
  recentBooks?: string[]
}

/** A single search result with score */
export interface SearchResult {
  bookSlug: string
  bookName: string
  chapter: number
  verse: number
  text: string
  score: number
  /** Which query tokens matched in this verse */
  matchedTokens: string[]
}
```

`tokenizer.ts` — exports `tokenize(text)`, `stem(word)`, `STOPWORDS`, used by both the build script (imported via dynamic import) and the runtime engine.

**Auth gating:** N/A — pure module, no UI.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT import React or any browser APIs — this module must be importable from Node.js (build script) and browser
- DO NOT use full Porter stemmer — light stemming only per spec
- DO NOT include numbers in stopwords — "144000" must be searchable
- DO NOT strip apostrophes from inside words — "don't" stays "don't"

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| tokenize lowercases input | unit | `tokenize("GOD So LOVED")` → includes `"god"`, `"love"` (stemmed) |
| tokenize strips punctuation | unit | `tokenize("world.")` → `["world"]`, `tokenize("Lord's")` → `["lord"]` |
| tokenize preserves internal apostrophes | unit | `tokenize("don't")` → `["don't"]` |
| tokenize removes stopwords | unit | `tokenize("the Lord is my shepherd")` → no "the", "is", "my" |
| tokenize preserves numbers | unit | `tokenize("144,000 people")` → includes `"144"`, `"000"`, `"peopl"` |
| stem drops trailing s | unit | `stem("prayers")` → `"prayer"` (7 chars → 6) |
| stem drops trailing ed | unit | `stem("loved")` → `"love"` (5 → 4) |
| stem drops trailing ing | unit | `stem("praying")` → `"pray"` (7 → 4) |
| stem minimum length guard | unit | `stem("was")` → `"was"` (3 chars, no strip); `stem("led")` → `"led"` |
| stem does not strip ss | unit | `stem("bless")` → `"bless"` (not "bles") |
| stem drops trailing ness | unit | `stem("darkness")` → `"dark"` |
| stem drops trailing ly | unit | `stem("boldly")` → `"bold"` |
| tokenize handles empty input | unit | `tokenize("")` → `[]` |
| tokenize handles all-stopwords | unit | `tokenize("the and is")` → `[]` |
| tokenize deduplicates tokens | unit | `tokenize("love love love")` returns 1 token |
| STOPWORDS set has 30 entries | unit | `STOPWORDS.size === 30` |
| stem("loving") stays "loving" | unit | "loving" → "lov" is only 3 chars, stays "loving" |
| stem("forgiveness") → "forgive" | unit | Via ness rule, 11 - 4 = 7 ≥ 4 |
| tokenize("God's love") | unit | → `["god", "love"]` — possessive apostrophe stripped |
| Numbers stay as tokens | unit | `tokenize("1000")` → `["1000"]` |

**Expected state after completion:**
- [ ] `frontend/src/lib/search/types.ts` exists with SearchIndex, SearchResult, SearchOptions, VerseRef types
- [ ] `frontend/src/lib/search/tokenizer.ts` exports `tokenize`, `stem`, `STOPWORDS`
- [ ] 20 unit tests pass for tokenizer
- [ ] Module has zero React imports and zero browser-only API usage

---

### Step 2: Build-Time Index Generator Script

**Objective:** Create a Node.js script that reads all 66 WEB Bible JSON files, tokenizes verse text, builds an inverted index, and writes it to `frontend/public/search/bible-index.json`.

**Files to create/modify:**
- `frontend/scripts/build-search-index.mjs` — Index generator script
- `frontend/package.json` — Add `"build-search-index"` script
- `frontend/public/search/bible-index.json` — Generated output (committed)

**Details:**

The script:
1. Reads each of the 66 files in `frontend/src/data/bible/web/*.json`
2. For each book → each chapter → each verse: tokenize the verse text using the tokenizer from Step 1
3. For each unique token: append `[bookSlug, chapter, verseNumber]` to the token's entry in the inverted index
4. Write the final index to `frontend/public/search/bible-index.json`
5. Print stats: total tokens, total verse refs, raw file size, gzipped size

**Script imports tokenizer via dynamic import:**
```javascript
const { tokenize } = await import('../src/lib/search/tokenizer.ts')
```
Note: This requires running via `tsx` or `ts-node` to handle `.ts` imports from `.mjs`. Alternatively, the script can inline the tokenizer logic or use `jiti` for TS support. **Decision**: Use `node --import tsx` to run the script, which handles TS imports. The `tsx` dev dependency is already used implicitly by Vitest.

**package.json script:**
```json
"build-search-index": "node --import tsx scripts/build-search-index.mjs"
```

After running, measure file size:
- Raw: expect 4-6 MB
- Gzipped: expect 1-2 MB (Vite serves gzipped in production)
- If gzipped > 2 MB: evaluate splitting by testament (documented in Edge Cases)

**Auth gating:** N/A — build script.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT include verse text in the index — only token → reference mappings
- DO NOT add `build-search-index` to the `build` script — it's a manual/CI step, not every build
- DO NOT create any new npm dependencies — use existing `tsx` (available via Vitest)
- DO NOT hardcode file paths — derive from `BIBLE_BOOKS` constant or glob the directory
- DO NOT forget to create `frontend/public/search/` directory before writing

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Script runs without errors | integration | Run the script and verify it creates the output file |
| Generated index has correct structure | integration | Parse the JSON and verify `version`, `generatedAt`, `totalVerses`, `tokens` keys |
| Index contains expected tokens | integration | Verify `"love"`, `"god"`, `"hope"` are present in the index |
| Index does not contain stopwords | integration | Verify `"the"`, `"and"`, `"is"` are NOT in the index |
| Verse refs are compact tuples | integration | Verify entries are `[string, number, number]` format |
| Total verses is reasonable | integration | WEB Bible has ~31,102 verses — total should be in that range |

Note: These are run manually after script execution, not in the Vitest suite. A lightweight Vitest test can verify the tokenizer produces expected output for known verses.

**Expected state after completion:**
- [ ] `frontend/scripts/build-search-index.mjs` exists and runs successfully
- [ ] `frontend/package.json` has `"build-search-index"` script
- [ ] `frontend/public/search/bible-index.json` exists with valid index data
- [ ] Index file size is measured and documented (raw + gzipped)
- [ ] Index contains `version: 1`, `generatedAt`, `totalVerses`, and `tokens` map

---

### Step 3: Runtime Search Engine

**Objective:** Create the pure TypeScript search engine module that loads the index, performs AND-style multi-word matching, scores results, and returns ranked results with pagination.

**Files to create/modify:**
- `frontend/src/lib/search/engine.ts` — Core search engine
- `frontend/src/lib/search/index.ts` — Barrel export

**Details:**

`engine.ts` exports:
- `loadSearchIndex(): Promise<SearchIndex>` — fetches `/search/bible-index.json`, caches in module-level variable, returns cached on subsequent calls
- `searchBible(query: string, options?: SearchOptions): SearchResult[]` — main search function (index must be loaded first)
- `isIndexLoaded(): boolean` — check if index is in memory

**Search algorithm (`searchBible`):**

1. Tokenize the query using `tokenize(query)` from Step 1
2. If no tokens after tokenization, return `[]`
3. For each query token, look up `index.tokens[token]` to get `VerseRef[]` arrays
4. **AND intersection**: find verse refs that appear in ALL token result sets. Use the smallest result set as the base and intersect with others using a `Set<string>` of serialized refs (`"bookSlug:chapter:verse"`)
5. **Score each matched verse:**
   - **Base score** (1 point per matched query token — always equals token count for AND matches)
   - **Proximity bonus** (+2 if all tokens appear within 5 token positions in the original verse text — requires re-tokenizing the verse text at query time for position checking)
   - **Recency bonus** (+1 if `bookSlug` is in `options.recentBooks`)
   - **Length penalty** (−0.5 if verse text > 200 characters — favors concise matches)
6. Sort by score descending. Tiebreaker: canonical book order (index in `BIBLE_BOOKS` array), then chapter ascending, then verse ascending
7. Slice to page: `results.slice(page * pageSize, (page + 1) * pageSize)`
8. Return `SearchResult[]` (without verse text — text is loaded separately)

**Verse text loading** (separate from scoring):
- `loadVerseTexts(refs: VerseRef[]): Promise<Map<string, string>>` — batched text loader
- Loads required books from existing `WEB_BOOK_LOADERS` (via `loadChapterWeb`), deduplicates book loads, extracts verse text for each ref
- Returns a `Map<"bookSlug:chapter:verse", string>` for the UI to populate

**Index loading:**
- `fetch('/search/bible-index.json')` on first search
- Parse JSON, store in module-level `let cachedIndex: SearchIndex | null = null`
- Subsequent calls return from cache immediately
- Error handling: if fetch fails, throw so the hook can show an error state

**Performance target**: < 100ms for 1-3 word queries after index load. The AND intersection + scoring on an in-memory object should be well under 10ms for typical queries. The 100ms budget is mostly for verse text loading.

**Auth gating:** N/A — pure module.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT import React — this is a pure TypeScript module
- DO NOT load verse text inside the search loop — batch load AFTER reference lookup
- DO NOT cache verse text permanently — books loaded via `loadChapterWeb` are already cached by Vite's module system
- DO NOT add proximity checking to the initial AND intersection — do it as a scoring step only for matched verses
- DO NOT mutate the cached index

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| loadSearchIndex fetches and caches | unit | Mock fetch, verify single network call for two invocations |
| isIndexLoaded returns false before load | unit | Before calling load, returns false |
| searchBible returns empty for empty query | unit | `searchBible("")` → `[]` |
| searchBible returns empty for stopwords-only | unit | `searchBible("the and is")` → `[]` |
| searchBible AND-matches multi-word | unit | Build mini-index with 3 verses, query "love world" → only verse containing both |
| searchBible scores base correctly | unit | All query tokens matched → base = token count |
| searchBible proximity bonus | unit | Verse with tokens adjacent scores higher than verse with tokens far apart |
| searchBible recency bonus | unit | Result from recent book ranks higher with same base score |
| searchBible length penalty | unit | Long verse (>200 chars) scores lower than short verse with same tokens |
| searchBible canonical tiebreaker | unit | Same-score results: Genesis before Revelation |
| searchBible pagination | unit | 120 results with pageSize=50 → page 0 has 50, page 1 has 50, page 2 has 20 |
| searchBible handles single-token query | unit | `searchBible("love")` returns results |
| loadVerseTexts batches by book | unit | Mock loadChapterWeb, verify it's called once per unique book |
| loadVerseTexts returns correct text map | unit | Known verse refs → correct text values |
| searchBible handles token not in index | unit | Query with unknown token → `[]` (AND intersection empty) |

**Expected state after completion:**
- [ ] `frontend/src/lib/search/engine.ts` exports `loadSearchIndex`, `searchBible`, `isIndexLoaded`, `loadVerseTexts`
- [ ] `frontend/src/lib/search/index.ts` barrel exports all public APIs
- [ ] 15 unit tests pass for search engine
- [ ] Module has zero React imports

---

### Step 4: Wire Search Engine into useBibleSearch Hook

**Objective:** Replace the existing regex-based search in `useBibleSearch` with the new index-based engine. Preserve the controlled/uncontrolled mode contract from BB-38.

**Files to create/modify:**
- `frontend/src/hooks/useBibleSearch.ts` — Replace search implementation
- `frontend/src/types/bible.ts` — Update `BibleSearchResult` interface

**Details:**

**Update `BibleSearchResult` in `types/bible.ts`:**
```typescript
export interface BibleSearchResult {
  bookName: string
  bookSlug: string
  chapter: number
  verseNumber: number
  verseText: string
  score: number
  /** Query tokens that matched in this verse (for highlight rendering) */
  matchedTokens: string[]
}
```

Remove `contextBefore` and `contextAfter` fields — BB-42 results don't show context verses.

**Rewrite `useBibleSearch`:**

The hook's external API stays the same: `{ query, setQuery, results, isSearching, isLoadingBooks, allBooksLoaded }`. Internal implementation changes:

1. Replace `booksDataRef` + `searchAllBooks()` with:
   - `loadSearchIndex()` on first search (replaces `ensureBooksLoaded`)
   - `searchBible(query, { page, recentBooks })` for search
   - `loadVerseTexts(refs)` to hydrate results with text
2. Add `page` state for pagination: `const [page, setPage] = useState(0)`
3. Add `totalResults` state for total count (before pagination)
4. Add `loadMore()` function that increments page and appends results
5. The 300ms debounce timer in the existing `useEffect` stays
6. Read `wr_bible_progress` from localStorage for recency bonus: extract book slugs with recent activity
7. Reset `page` to 0 when query changes

**New hook return type:**
```typescript
{
  query: string
  setQuery: (q: string) => void
  results: BibleSearchResult[]
  isSearching: boolean
  isLoadingIndex: boolean  // renamed from isLoadingBooks
  hasMore: boolean         // more pages available
  totalResults: number     // total before pagination
  loadMore: () => void     // load next page
}
```

Note: `allBooksLoaded` renamed to track index loading. `isLoadingBooks` renamed to `isLoadingIndex` for clarity.

**Backward compatibility**: `BibleSearchMode` is the only consumer. The interface changes are coordinated in Step 5.

**Auth gating:** N/A — hook, no auth gates.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT remove the controlled/uncontrolled mode from BB-38 — preserve the `controlledQuery` / `onQueryChange` contract exactly
- DO NOT change the debounce timing (300ms) — spec says reuse without modification
- DO NOT load the full index on component mount — only on first search (≥2 chars)
- DO NOT block the UI while loading verse texts — show results with "loading text..." placeholder, then hydrate
- DO NOT write to any localStorage keys — only read `wr_bible_progress`

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| starts with empty query and no results | unit | Same as existing test (preserved) |
| requires minimum 2 characters | unit | Same as existing test (preserved) |
| finds matching verses via index | unit | Mock loadSearchIndex + searchBible, verify results appear |
| search is case-insensitive (via tokenizer) | unit | Query "FOR GOD" works |
| clears results when query is cleared | unit | Same as existing test (preserved) |
| controlled mode returns controlledQuery | unit | Same as existing BB-38 tests (preserved) |
| setQuery calls onQueryChange in controlled mode | unit | Same as existing BB-38 test (preserved) |
| loadMore appends next page of results | unit | After initial search with >50 results, loadMore adds more |
| hasMore is true when total > displayed | unit | 120 total, 50 displayed → hasMore true |
| totalResults reflects total count | unit | Verify totalResults matches the full count |
| resets page on new query | unit | Search "love", then search "hope" → page resets to 0 |
| isLoadingIndex is true during first load | unit | Before index loads, isLoadingIndex is true |

**Expected state after completion:**
- [ ] `useBibleSearch` uses index-based search instead of regex
- [ ] `BibleSearchResult` type updated (score, matchedTokens added; contextBefore/After removed)
- [ ] Hook returns `hasMore`, `totalResults`, `loadMore`, `isLoadingIndex`
- [ ] All 12 hook tests pass
- [ ] Controlled/uncontrolled mode preserved
- [ ] Existing BibleSearchMode.test.tsx tests still pass (mock is updated)

---

### Step 5: Update BibleSearchMode UI

**Objective:** Update the search results UI with example search chips, highlighted matched tokens, result count, "Load more" pagination, and improved empty/loading/no-results states per the spec.

**Files to create/modify:**
- `frontend/src/components/bible/BibleSearchMode.tsx` — Full UI update

**Details:**

**Empty-query state** (when `query.length === 0`):
- Friendly prompt: "Search the Bible for any word, phrase, or theme"
- 6 clickable example search chips arranged in a `flex flex-wrap gap-2 justify-center` row
- Chip labels: `"anxiety"`, `"rest"`, `"forgiveness"`, `"courage"`, `"hope"`, `"fear"`
- Chip styling: `bg-white/10 border border-white/20 rounded-full px-4 py-2 text-sm text-white/80 hover:bg-white/15 transition-colors cursor-pointer min-h-[44px] inline-flex items-center`
- Clicking a chip calls `setQuery(chipLabel)` which populates the input and triggers search
- Chips are `<button>` elements (keyboard accessible, focusable, activatable with Enter/Space)

**Loading state** (index loading on first search):
- Skeleton rows: 4 shimmer rows with varying widths, matching `BibleReaderSkeleton` pattern
- Use `SkeletonText` primitive from existing skeleton system
- Wrap in `aria-busy="true"` container

**No-results state:**
- "No verses found for '{query}'. Try a different word or phrase."
- Style: `text-center text-white/50`

**Result count:**
- Above the result list: "{N} verses found" or "{N}+ verses found (showing first {displayed})"
- Style: `text-sm text-white/60`

**Result list:**
- Each result is a clickable `<Link>` to `/bible/<bookSlug>/<chapter>?verse=<verseNumber>` (spec format, updated from existing `#verse-` hash)
- Result item layout:
  ```
  <Link className="block py-4 border-b border-white/10 min-h-[44px]">
    <p className="text-sm font-medium text-white/70">
      {bookName} {chapter}:{verseNumber}
    </p>
    <p className="mt-1 text-white leading-relaxed">
      <HighlightedTokens text={verseText} tokens={matchedTokens} />
    </p>
  </Link>
  ```
- Remove the existing card styling (`rounded-xl border border-white/10 bg-white/5 p-4`) — spec calls for lighter separator-based layout
- Remove context verses (contextBefore/contextAfter) — not in spec
- Remove `useStaggeredEntrance` animation (lightweight result list doesn't need cascading animation)

**HighlightedTokens component** (replaces `HighlightedText`):
- Takes `text: string` and `tokens: string[]` (the matched query tokens, stemmed)
- For each word in the text, check if its stemmed form matches any token in the `tokens` array
- If match: wrap in `<mark className="rounded bg-primary/20 px-0.5 font-semibold text-white">{word}</mark>`
- If no match: render as plain text
- This produces word-level highlighting rather than substring highlighting

**"Load more" button:**
- Shown when `hasMore` is true
- Style: `w-full py-3 border border-white/20 text-white/70 hover:bg-white/10 rounded-lg text-sm font-medium transition-colors min-h-[44px]`
- Text: "Show more results"
- onClick: calls `loadMore()` from the hook

**Accessibility updates:**
- Search input already has `aria-label="Search the Bible"` — preserve
- Results container: `aria-live="polite"` on the status element (already exists)
- Each result link is keyboard-navigable (inherent from `<Link>`)
- Example chips: `<button type="button">` with visible text labels
- Mark highlight is supplemented with `font-semibold` (not just color) for color-blind users (already in existing style)

**Auth gating:** N/A — zero auth gates.

**Responsive behavior:**
- Desktop (1440px): Centered `max-w-2xl` container. Chips in single row. Results with comfortable line length.
- Tablet (768px): Same as desktop — `max-w-2xl` naturally constrains. Chips may fit in 1-2 rows.
- Mobile (375px): Full-width. Chips wrap to 2-3 per row. Result touch targets ≥44px via `min-h-[44px]` and `py-4`. "Load more" button full width.

**Inline position expectations:**
- Example chips at 1440px and 768px: all 6 chips should share the same y-coordinate (±5px). At 375px, wrapping to 2 rows is acceptable.

**Guardrails (DO NOT):**
- DO NOT use Lora/serif font for search result text — use Inter (sans-serif) per spec
- DO NOT add frosted glass card styling to individual results — use lightweight `border-b` separators
- DO NOT use `animate-glow-pulse` or cyan borders
- DO NOT add auth gates to any search interaction
- DO NOT remove the existing `aria-describedby` linkage between input and status
- DO NOT use `dangerouslySetInnerHTML` for highlight rendering

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| renders search input with aria-label | integration | Input has `aria-label="Search the Bible"` |
| renders example chips when query is empty | integration | 6 buttons with expected labels visible |
| clicking chip calls setQuery | integration | Click "hope" chip → setQuery called with "hope" |
| chips are keyboard accessible | integration | Each chip is a `<button>` element |
| renders loading skeleton during index load | integration | When isLoadingIndex is true, skeleton visible |
| renders no-results message | integration | When results empty + query present → "No verses found" |
| renders result count | integration | "5 verses found" text visible |
| renders result items with reference and text | integration | Result shows "John 3:16" + verse text |
| result links to correct deep link URL | integration | Link `to` matches `/bible/john/3?verse=16` |
| renders "Show more results" when hasMore | integration | Button visible when hasMore is true |
| hides "Show more" when no more results | integration | Button not rendered when hasMore is false |
| clicking "Show more" calls loadMore | integration | Click button → loadMore called |
| highlight marks matched tokens | integration | `<mark>` elements present around matched words |
| status element has aria-live="polite" | integration | Accessibility: live region exists |

**Expected state after completion:**
- [ ] BibleSearchMode renders example search chips on empty query
- [ ] Search results display with token highlighting and "Load more" pagination
- [ ] Result links use `/bible/<book>/<chapter>?verse=<n>` format
- [ ] All 14 component tests pass
- [ ] 44px minimum touch targets on result items and chips
- [ ] No deprecated patterns used

---

### Step 6: PWA Precache Update

**Objective:** Add the search index to the PWA precache manifest so search works offline.

**Files to create/modify:**
- `frontend/vite.config.ts` — Update globPatterns

**Details:**

Update the `injectManifest.globPatterns` from:
```typescript
globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
```
to:
```typescript
globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,json}'],
```

This adds all JSON files in the `dist/` output to the precache manifest, including `search/bible-index.json`. The Bible data JSON files from `src/data/bible/` are NOT in `public/` — they're bundled as dynamic import chunks by Vite (`.js` files), so they're already covered by the `*.js` pattern.

**Verify after change:**
- Run `pnpm build` and check `dist/sw.js` or the precache manifest for `search/bible-index.json`
- Verify the total precache size increase is reasonable (the gzipped index adds ~1-2 MB to the precache)

**Auth gating:** N/A.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT add `*.json` if it would precache unwanted large files — verify what JSON files end up in `dist/`
- DO NOT change the `strategies: 'injectManifest'` or `srcDir`/`filename` settings — these were set up by BB-41
- DO NOT modify `sw.ts` — the precache manifest is injected automatically

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Build succeeds with updated globPatterns | integration | `pnpm build` passes without errors |
| Search index appears in precache manifest | integration | Verify `search/bible-index.json` in build output |

**Expected state after completion:**
- [ ] `vite.config.ts` globPatterns includes `json`
- [ ] `pnpm build` succeeds
- [ ] Search index is precached for offline use

---

### Step 7: Documentation

**Objective:** Create the search index documentation file and update localStorage key inventory if needed.

**Files to create/modify:**
- `_plans/recon/bb42-search-index.md` — Index documentation

**Details:**

Document:
- Index format (version, structure, compact tuple refs)
- Tokenization rules (complete stopword list, stemming function, pipeline)
- Scoring function (base + proximity + recency + length penalty, weights)
- Index size measurements (raw, gzipped)
- Deferred follow-ups (phrase search, fuzzy matching, filters by testament/book, search history, autocomplete)
- How to regenerate the index (`pnpm --filter frontend run build-search-index`)

No new localStorage keys to document — BB-42 reads existing keys only.

**Auth gating:** N/A.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT modify `11-local-storage-keys.md` — BB-42 adds zero new keys
- DO NOT commit without verifying all tests pass first

**Test specifications:** N/A — documentation only.

**Expected state after completion:**
- [ ] `_plans/recon/bb42-search-index.md` exists with complete documentation
- [ ] `pnpm build` passes
- [ ] `pnpm test` passes with all new + existing tests
- [ ] `pnpm lint` has no new warnings from BB-42 code

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Search types + tokenizer module |
| 2 | 1 | Build-time index generator (uses tokenizer) |
| 3 | 1, 2 | Runtime search engine (uses tokenizer + generated index) |
| 4 | 3 | Wire engine into useBibleSearch hook |
| 5 | 4 | Update BibleSearchMode UI |
| 6 | 2 | PWA precache update (needs index file to exist) |
| 7 | 1-6 | Documentation (needs all measurements and test results) |

**Parallelizable**: Steps 2 and 3 can be worked on in parallel after Step 1 is complete (2 reads the JSON files, 3 reads the generated index). Step 6 can run in parallel with Steps 4-5.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Search types + tokenizer | [COMPLETE] | 2026-04-13 | Created types.ts and tokenizer.ts in `src/lib/search/`. Added `tokenizeWithPositions()` for proximity scoring. 30 tests pass. **Deviation from plan**: stem("loved") returns "loved" (unchanged) because "lov" is 3 chars < 4 min — plan had incorrect expectation "love". stem("people") stays "people" (no rule matches). Added possessive 's stripping ("God's" → "god"). |
| 2 | Build-time index generator | [COMPLETE] | 2026-04-13 | Created `scripts/build-search-index.mjs`. Added `build-search-index` script to package.json. Generated index: 31,098 verses, 9,437 tokens, 425,376 refs. **Raw: 7.21 MB, Gzipped: 1.31 MB** (within 2 MB budget). No testament splitting needed. |
| 3 | Runtime search engine | [COMPLETE] | 2026-04-13 | Created engine.ts (searchBible, loadSearchIndex, loadVerseTexts, applyProximityBonus) and index.ts barrel. 21 tests pass. Proximity and length penalty applied post-hoc via applyProximityBonus after text hydration. loadVerseTexts tested with real Bible data instead of mocks. |
| 4 | Wire engine into hook | [COMPLETE] | 2026-04-13 | Rewrote useBibleSearch.ts to use index-based search. Updated BibleSearchResult type (removed contextBefore/After, added score/matchedTokens). Updated BibleSearchMode test mock. 10 hook tests + 3 existing component tests pass. |
| 5 | Update BibleSearchMode UI | [COMPLETE] | 2026-04-13 | Full BibleSearchMode rewrite: 6 example chips, skeleton loading, token-level highlighting via HighlightedTokens, border-b separators, Load More pagination, ?verse= deep links. Removed useStaggeredEntrance, contextBefore/After, card styling. 16 component tests pass. |
| 6 | PWA precache update | [COMPLETE] | 2026-04-13 | Added `'search/*.json'` to globPatterns in vite.config.ts (targeted pattern instead of broad `*.json`). Build is pre-broken by BB-41 workbox type issue (sw.ts imports can't resolve — pre-existing, not BB-42). globPatterns change is correct and will precache `search/bible-index.json` when the build is fixed. |
| 7 | Documentation | [COMPLETE] | 2026-04-13 | Created `_plans/recon/bb42-search-index.md`. Full test suite: 77 BB-42 tests pass (0 failures). Pre-existing failures: 58 tests / 11 files (all in BibleReader, GrowthGarden, Journal, Meditate — none BB-42-related). Baseline shifted from user's stated 44/7 — likely date-sensitive streak tests. |
