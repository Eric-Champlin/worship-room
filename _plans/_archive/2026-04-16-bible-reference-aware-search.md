# Implementation Plan: BB-49 Bible Reference-Aware Search

**Spec:** `_specs/bible-reference-aware-search.md`
**Date:** 2026-04-16
**Branch:** `bible-ux-polish` (continues the wave; BB-47/BB-48 already on this branch)
**Design System Reference:** `_plans/recon/design-system.md` (loaded — captured 2026-04-05)
**Recon Report:** N/A (no new page; pure parser + two existing input wirings)
**Master Spec Plan:** N/A (standalone enhancement to BB-42)

---

## Architecture Context

### What this spec touches

A pure parser module + two thin input handler edits. No new pages, no new providers, no auth changes, no storage keys.

### Existing search architecture (BB-42 + BB-38)

- **Inverted index runtime:** `frontend/src/lib/search/` (`engine.ts`, `tokenizer.ts`, `index.ts`, `types.ts`). Pre-built index lives at `frontend/public/search/bible-index.json`. Loaded on demand via `loadSearchIndex()` and queried via `searchBible(q, opts)`.
- **`useBibleSearch` hook:** `frontend/src/hooks/useBibleSearch.ts`. 300ms debounced `performSearch()` driven by an `useEffect` watching `query`. Supports controlled mode via `controlledQuery` + `onQueryChange`.
- **`useSearchQuery` hook:** `frontend/src/hooks/url/useSearchQuery.ts`. Debounced (250ms) writer that syncs the `?q=` URL parameter with local React state. Source of truth is the URL.
- **Search routes:**
  - `/bible` (`pages/BibleLanding.tsx`) — renders `BibleSearchMode` in place of landing content when `?mode=search` is present in the URL. The search input on the landing column is `BibleSearchEntry`.
  - `/bible/browse` (`pages/BibleBrowse.tsx`) — book grid only, no search input.
  - `/bible/search?q=...` (`components/BibleSearchRedirect.tsx`) — legacy path, `<Navigate replace>` to `/bible?mode=search&q=...`.

### Two search input entry points to wire

1. **`BibleSearchEntry`** (`frontend/src/components/bible/landing/BibleSearchEntry.tsx`) — search input shown on the `/bible` landing page when `?mode=search` is NOT active. Wraps an `<input type="search">` in a `<form>`; submit handler calls `navigate('/bible/search?q=...')`. **The natural hook point is `handleSubmit` (form submit fires on Enter).**
2. **`BibleSearchMode`** (`frontend/src/components/bible/BibleSearchMode.tsx`) — full-page search results component shown when `?mode=search` IS active. The `<input>` is NOT inside a `<form>` — it has `onChange` only, no Enter handling at all. **The hook point is a new `onKeyDown` handler that intercepts Enter.**

Both must call the same parser and navigate the same way when a reference matches; both must fall through to the existing search behavior when the parser returns `null`.

### Bible book data — already canonical

`frontend/src/constants/bible.ts` exports `BIBLE_BOOKS: BibleBook[]` (66 entries) with `name`, `slug`, `chapters`, `testament`, `category`, `hasFullText`. The parser will derive the canonical slug + chapter count from this constant and add the alias dictionary as a separate module so the alias data is co-located with the parser, not the canonical book list.

### Test patterns

- Vitest + RTL + jsdom.
- Pure logic: `frontend/src/lib/search/__tests__/*.test.ts` (e.g., `tokenizer.test.ts`, `engine.test.ts`).
- Component integration: render with `MemoryRouter`, mock `useNavigate` via `vi.mock('react-router-dom', ...)`. Pattern already in use at `BibleSearchEntry.test.tsx` and `BibleSearchMode.test.tsx`.

### Auth gating

**Zero new gates.** Bible features are unauthenticated per `.claude/rules/02-security.md` § "Bible Wave Auth Posture". Reference navigation is a client-side string parse + SPA route change. No backend, no user data, no auth modal trigger.

---

## Auth Gating Checklist

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Type "John 3:16" + Enter in `/bible` search input | No auth gate | Steps 3, 4 | None — public navigation only |
| Type "love" + Enter in `/bible` search input | No auth gate | Steps 3, 4 | None — falls through to existing public search |
| Type any query in BibleSearchMode input | No auth gate | Steps 3, 4 | None — public route |

**No new or removed auth gates.** Spec § Auth Gating confirms zero auth behavior change.

---

## Design System Values (for UI steps)

The only visual change is one placeholder string per input. Both inputs are existing `<input>` elements with established styling — no class changes required.

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| `BibleSearchEntry` input | `placeholder` (current) | `Search the Bible — verses, words, phrases` | `BibleSearchEntry.tsx:27` |
| `BibleSearchEntry` input | `placeholder` (NEW) | `Search verses or go to a passage (e.g., John 3:16)` | Spec Requirement 14 (exact string) |
| `BibleSearchMode` input | `placeholder` (current) | `Search the Bible...` | `BibleSearchMode.tsx:92` |
| `BibleSearchMode` input | `placeholder` (NEW) | `Search verses or go to a passage (e.g., John 3:16)` | Spec Requirement 14 (exact string) |
| Both inputs | `placeholder` color | `placeholder:text-white/50` (unchanged) | `09-design-system.md` § "Text Opacity Standards" — WCAG AA 3:1 floor on dark backgrounds |
| Both inputs | wrapper container | unchanged (`max-w-2xl` etc.) | Existing styles |

No new visual patterns introduced. No deprecated patterns reintroduced.

---

## Design System Reminder

**Project-specific quirks to keep in mind even though this spec is mostly logic:**

- Worship Room uses `text-white/50` minimum for placeholder text on dark backgrounds (WCAG AA 3:1 floor). Do not lower to `text-white/40` or `text-white/30` — those values fail audit. Both target inputs already use `placeholder:text-white/50`; do not modify the class.
- The Bible reader has its own theme variants (`midnight`/`parchment`/`sepia`) but **the search inputs are not inside the reader chrome** — they live on the `bg-dashboard-dark` background of `BibleLanding`. The placeholder color must read against `bg-dashboard-dark`, not against the reader themes. The existing `placeholder:text-white/50` is correct.
- Both inputs already meet 44px minimum touch target (`min-h-[44px]`). Do not change input padding/height.
- Animation tokens: this spec adds no animations. If a future iteration adds the optional inline reference hint (Requirement 15), it must use canonical tokens from `frontend/src/constants/animation.ts` (`fast` / `decelerate`) and respect `prefers-reduced-motion` via the global safety net.
- BibleReader is a documented layout exception (no `Layout`, no `Navbar`). The search inputs in this spec are NOT in the BibleReader — they are in `BibleLanding` which uses the standard `Layout` wrapper. No exception applies here.
- Reactive store anti-pattern (BB-45) does not apply — this spec touches no reactive stores.

---

## Shared Data Models (from Master Plan)

N/A — standalone enhancement, no master plan.

**localStorage keys this spec touches:** None. No new keys, no keys removed, no keys read or written. The `useSearchQuery` hook continues to write `?q=` to the URL but that is URL state, not localStorage.

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | Both inputs render full-width inside `max-w-2xl` centered column. Placeholder text may truncate mid-sentence — acceptable per spec § Responsive Behavior. |
| Tablet | 768px | Placeholder fits in full. |
| Desktop | 1440px | Placeholder fits in full. Input centered in `max-w-2xl`. |

**Custom breakpoints:** None. Spec confirms reference detection navigation is breakpoint-independent.

---

## Inline Element Position Expectations

N/A — no inline-row layouts in this feature. The two inputs each occupy a single row by themselves.

---

## Vertical Rhythm

N/A — no new sections introduced. Existing vertical spacing on `BibleLanding` and `BibleSearchMode` is unchanged.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] Working from the `bible-ux-polish` branch; do NOT branch off main.
- [ ] BB-47 (`ScrollToTop`) is already on this branch — reference navigation depends on its scroll-to-top contract holding so the destination chapter renders at the top with the BB-38 `?verse=` deep-link scroll firing in sequence.
- [ ] All 66 books in `BIBLE_BOOKS` (`frontend/src/constants/bible.ts`) have correct `slug` and `chapters` values. Plan derives both from this single source.
- [ ] `pnpm test` is passing on the current branch baseline before changes are made (so any new test failures are attributable to this work).
- [ ] All auth-gated actions from the spec are accounted for (there are zero — confirmed in checklist above).
- [ ] All [UNVERIFIED] values are flagged with verification methods (there are zero in this plan — both placeholder strings come directly from the spec, all alias data is enumerated from `BIBLE_BOOKS`).
- [ ] No deprecated patterns used. Inputs keep existing styling; no `animate-glow-pulse`, no Caveat, no GlowBackground, no soft-shadow cards introduced.
- [ ] Optional inline hint (Requirement 15) is **deferred** per the judgment call below. Document deferral in spec acceptance criteria when execution completes.

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Inline reference hint (Requirement 15) | **Deferred to a future spec.** Not implemented in v1. | Adds debounced parser invocation on every keystroke + layout shift risk + extra test surface. The new placeholder text already discloses the feature. The spec explicitly permits deferral if complexity is non-trivial. |
| Verse range navigation target | Navigate to start verse only (`?verse=16` for `John 3:16-18`). | Matches Spec Requirement 7. Range end is informational; the `verseEnd` field is set on the parsed object for future use but not used in v1 navigation. |
| Out-of-bounds chapter | Returns `null` → falls through to full-text search. | Spec Requirement 5. "John 99" runs the inverted index instead — the user's typed-in book name will likely surface relevant verses. |
| Out-of-bounds verse | NOT validated in v1. Returns a valid `ParsedReference` with the user's verse number; navigation lands on the chapter and the BibleReader's existing scroll effect silently no-ops. | Spec Requirement 6 — explicit out-of-scope. Verse-count dataset (1,189 rows) doubles parser footprint for marginal UX gain. |
| Whitespace-as-delimiter for verse | "John 3 16" parses as "John 3:16". | Spec Requirement 13. Implemented by accepting `:` OR whitespace as the chapter→verse separator in the regex. |
| Internal whitespace tolerance ("John   3   :   16") | Collapse all runs of whitespace to a single space before parsing. | Spec Acceptance Criteria explicit case. Single global `.replace(/\s+/g, ' ')` after trim handles it cleanly without per-delimiter logic. |
| Numbered books without space ("1John") | Alias table includes both "1 john" and "1john" forms; lookup hits both. | Spec Requirement 3 ("users often skip the space"). Avoids fragile post-hoc string surgery — explicit alias entries are easy to audit. |
| "Psalm" vs "Psalms" | Both map to slug `psalms`. Both included as aliases. | Spec Requirement 3. Common usage; "Psalm" is the singular conventional reference form. |
| "Revelations" → Revelation | Included as a misspelling alias. | Spec Requirement 3 — explicit. Other typos (e.g., "Genisis") are NOT corrected; only the hardcoded list is honored. |
| `useNavigate` vs `window.location.href` | `useNavigate()` from React Router only. | Spec Requirement 8. Full reload would break the BB-47 SPA scroll contract and lose React state. |
| Cancel pending debounced URL write on navigation | Not needed — `navigate()` causes route change which unmounts `BibleSearchMode`/`BibleSearchEntry`; the debounce timer cleanup in `useSearchQuery` runs naturally. | Verified by reading `useSearchQuery.ts` lines 69-73 (`useEffect` cleanup clears the timer). |
| Empty-or-too-short queries | Parser returns `null` for empty string and any input that doesn't match the grammar. Existing fall-through (BibleSearchMode shows placeholder, BibleSearchEntry no-ops on empty submit) is preserved. | Existing behavior must be unchanged per spec § BB-42 regression. |

---

## Implementation Steps

### Step 1: Create the book alias data module

**Objective:** Produce a static, exhaustive alias-to-canonical-slug map covering all 66 books with full names, abbreviations, and the misspellings called out in the spec. No imports from the parser yet.

**Files to create/modify:**
- `frontend/src/lib/search/book-aliases.ts` — NEW. Exports `BookAlias` type and `BOOK_ALIASES` Map.

**Details:**

Define a `BOOK_DEFINITIONS` array of 66 entries, each shaped:

```typescript
interface BookDefinition {
  slug: string         // canonical URL slug, e.g., '1-john'
  chapters: number     // total chapter count for validation
  aliases: string[]    // every accepted input form (case-insensitive at lookup)
}
```

Derive `slug` and `chapters` for each entry from the canonical `BIBLE_BOOKS` constant in `frontend/src/constants/bible.ts` to keep a single source of truth. Manually attach the `aliases` list per book.

**Minimum required aliases per book (compose from):**

- **Full canonical name** (e.g., "Genesis", "1 John", "Song of Solomon")
- **At least one common short form / abbreviation** for every book. Reference the standard SBL / Logos abbreviation conventions:
  - Old Testament: Gen, Ex (or Exod), Lev, Num, Deut, Josh, Judg, Ruth, 1 Sam, 2 Sam, 1 Kgs (or 1 Ki), 2 Kgs (or 2 Ki), 1 Chr, 2 Chr, Ezra, Neh, Esth, Job, Ps (or Pss), Prov, Eccl, Song (or SoS), Isa, Jer, Lam, Ezek, Dan, Hos, Joel, Amos, Obad, Jonah, Mic, Nah, Hab, Zeph, Hag, Zech, Mal
  - New Testament: Matt (or Mt), Mark (or Mk), Luke (or Lk), John (or Jn), Acts, Rom, 1 Cor, 2 Cor, Gal, Eph, Phil, Col, 1 Thess, 2 Thess, 1 Tim, 2 Tim, Titus, Phlm, Heb, Jas, 1 Pet, 2 Pet, 1 Jn, 2 Jn, 3 Jn, Jude, Rev
- **For numbered books, include BOTH forms** with and without space after the leading digit: `'1 John'` AND `'1John'`, `'1 Jn'` AND `'1Jn'`, etc. This satisfies Spec Requirement 3 ("no-space numbered books").
- **Mandatory spec-listed misspellings:**
  - `'Revelations'` → maps to slug `revelation`
  - `'Psalm'` AND `'Psalms'` → both map to slug `psalms`

**Build the lookup map:**

```typescript
export interface BookAlias {
  slug: string
  chapters: number
}

const map = new Map<string, BookAlias>()
for (const def of BOOK_DEFINITIONS) {
  for (const alias of def.aliases) {
    map.set(alias.toLowerCase(), { slug: def.slug, chapters: def.chapters })
  }
}
export const BOOK_ALIASES: ReadonlyMap<string, BookAlias> = map
```

**Cross-check during construction:** Add a top-of-file unit test (or inline `console.assert` removed before commit) that verifies the 66 unique slugs in `BOOK_DEFINITIONS` match the 66 entries in `BIBLE_BOOKS`. This guards against typos and against future divergence.

**Auth gating (if applicable):** N/A — pure data module.

**Responsive behavior:** N/A: no UI impact.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**
- Do NOT duplicate the canonical book list — derive `slug` and `chapters` from `BIBLE_BOOKS` in the source file (e.g., a small build helper or just structured copy with a runtime assert that the two lists match in length).
- Do NOT introduce ICU locale-specific lowercasing or any non-ASCII normalization. Plain `String.prototype.toLowerCase()` is sufficient for English book names.
- Do NOT add abbreviations that conflict with each other (e.g., "Phil" must map only to Philippians, not Philemon — Philemon should use "Phlm" or "Phlmn"). Verify uniqueness of every alias key.
- Do NOT include punctuation in alias keys (no `1 Jn.` with trailing period). The parser does not accept trailing punctuation in v1.
- Do NOT use the `bible:` or `wr_` localStorage prefix here — this module is in-memory only, no persistence.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| All 66 canonical slugs from `BIBLE_BOOKS` exist in `BOOK_ALIASES` (when looked up by full name lowercase) | unit | Iterates `BIBLE_BOOKS`, asserts `BOOK_ALIASES.get(book.name.toLowerCase())?.slug === book.slug` |
| `chapters` count matches `BIBLE_BOOKS.chapters` for every alias entry | unit | Iterates `BOOK_ALIASES`, asserts each `.chapters` equals the chapters for that slug in `BIBLE_BOOKS` |
| Every numbered-book alias has a no-space twin | unit | For every alias starting with `/^[1-3] /`, the same string with the space removed must also exist in the map |
| `'revelations'` resolves to slug `revelation` | unit | Direct lookup |
| `'psalm'` and `'psalms'` both resolve to slug `psalms` | unit | Direct lookups |
| No duplicate alias keys map to different slugs | unit | Build map with collision detection (test asserts every key has exactly one slug) |

**Expected state after completion:**
- [ ] `frontend/src/lib/search/book-aliases.ts` exists, exports `BookAlias` type and `BOOK_ALIASES` map
- [ ] All 66 books represented with full name + ≥1 abbreviation + numbered-book no-space variants where applicable
- [ ] Misspellings ("Revelations", "Psalm") included
- [ ] All unit tests in this step pass

---

### Step 2: Create the `parseReference` parser

**Objective:** Implement a pure synchronous function that parses a query string and returns a `ParsedReference` or `null`. No DOM access, no React, no side effects.

**Files to create/modify:**
- `frontend/src/lib/search/reference-parser.ts` — NEW. Exports `ParsedReference` interface and `parseReference()` function.
- `frontend/src/lib/search/__tests__/reference-parser.test.ts` — NEW. Unit tests covering every Acceptance Criteria parser case.
- `frontend/src/lib/search/index.ts` — MODIFY. Add re-exports for `parseReference` and `ParsedReference`.

**Details:**

```typescript
import { BOOK_ALIASES } from './book-aliases'

export interface ParsedReference {
  book: string         // canonical slug, e.g., 'john', '1-john'
  chapter: number      // ≥ 1 and ≤ book.chapters
  verse?: number       // present when query includes a verse
  verseEnd?: number    // present when query includes a verse range
}

export function parseReference(input: string): ParsedReference | null {
  if (typeof input !== 'string') return null
  const trimmed = input.trim()
  if (!trimmed) return null

  // Collapse all internal whitespace runs to single spaces.
  const normalized = trimmed.replace(/\s+/g, ' ')

  // Grammar:
  //   <book> <chapter>
  //   <book> <chapter>:<verse>
  //   <book> <chapter>:<verse>-<verseEnd>
  //   <book> <chapter> <verse>            (whitespace-as-delimiter, Requirement 13)
  // Internal whitespace around ':' and '-' is tolerated.
  // Book name is captured non-greedy so trailing digits go to chapter.
  const RE = /^(.+?)\s*(\d+)(?:\s*[:\s]\s*(\d+)(?:\s*-\s*(\d+))?)?$/i
  const match = normalized.match(RE)
  if (!match) return null

  const [, rawBook, chapterStr, verseStr, verseEndStr] = match

  // Look up the book by lowercase alias key.
  const bookKey = rawBook.trim().toLowerCase()
  const book = BOOK_ALIASES.get(bookKey)
  if (!book) return null

  const chapter = Number(chapterStr)
  if (!Number.isInteger(chapter) || chapter < 1 || chapter > book.chapters) {
    return null
  }

  const result: ParsedReference = { book: book.slug, chapter }
  if (verseStr !== undefined) {
    const verse = Number(verseStr)
    if (Number.isInteger(verse) && verse >= 1) {
      result.verse = verse
    }
  }
  if (verseEndStr !== undefined) {
    const verseEnd = Number(verseEndStr)
    if (Number.isInteger(verseEnd) && verseEnd >= 1) {
      result.verseEnd = verseEnd
    }
  }
  return result
}
```

**Notes on the regex:**

- The book capture `(.+?)` is non-greedy so the first run of digits goes to the chapter group rather than being absorbed into the name. This handles `"1John 4"`: name candidate `"1John"`, chapter `4`. The lookup then matches alias `"1john"`.
- The chapter→verse separator is `[:\s]` allowing either `:` or whitespace, satisfying Requirement 13 ("John 3 16" → "John 3:16"). Surrounding `\s*` allows internal padding.
- The end-of-string anchor `$` ensures we reject trailing garbage (e.g., `"John 3:16 hello"` returns `null` and falls through to full-text search). This is the correct behavior — non-matching inputs should not pretend to be references.
- Returning `null` for valid book + invalid chapter (Requirement 5) means `"John 99"` falls through to BB-42 search, which is the spec contract.

**Re-exports in `index.ts`:**

Add to `frontend/src/lib/search/index.ts`:
```typescript
export { parseReference } from './reference-parser'
export type { ParsedReference } from './reference-parser'
```

**Auth gating (if applicable):** N/A — pure function.

**Responsive behavior:** N/A: no UI impact.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**
- Do NOT make this function async. It is a synchronous string match against an in-memory map per Spec § Performance.
- Do NOT throw on invalid input. Always return `null` for unparseable strings, never throw — the caller must not need a try/catch.
- Do NOT mutate the input string or the alias map.
- Do NOT call `useNavigate()` or any React API here. This file must be importable from non-React contexts (e.g., a future Node.js script).
- Do NOT add console logging, telemetry, or analytics. The parser is silent.
- Do NOT cache results. Inputs are short, parsing is sub-millisecond, and a cache would balloon memory for unbounded query strings.
- Do NOT validate verse counts (out of scope per Spec Requirement 6). `"John 3:999"` returns a valid `ParsedReference` with `verse: 999`; the BibleReader handles the no-op silently.
- Do NOT alter or replace the BB-42 inverted-index code. This module is a pre-hook; it never touches `engine.ts`, `tokenizer.ts`, or `bible-index.json`.

**Test specifications (every Acceptance Criteria parser case is required):**

| Test | Type | Description |
|------|------|-------------|
| `parseReference('John 3:16')` returns `{ book: 'john', chapter: 3, verse: 16 }` | unit | spec line 142 |
| `parseReference('John 3')` returns `{ book: 'john', chapter: 3 }` (no `verse`) | unit | spec line 143 |
| `parseReference('1 John 4:8')` returns `{ book: '1-john', chapter: 4, verse: 8 }` | unit | spec line 144 |
| `parseReference('Gen 1')` returns `{ book: 'genesis', chapter: 1 }` | unit | spec line 145 |
| `parseReference('Psalm 23')` returns `{ book: 'psalms', chapter: 23 }` | unit | spec line 146 |
| `parseReference('Psalms 23')` returns `{ book: 'psalms', chapter: 23 }` | unit | spec line 146 |
| `parseReference('john 3:16')` (lowercase) returns `{ book: 'john', chapter: 3, verse: 16 }` | unit | spec line 147 |
| `parseReference('JOHN 3:16')` (uppercase) returns `{ book: 'john', chapter: 3, verse: 16 }` | unit | spec line 148 |
| `parseReference('1John 4')` returns `{ book: '1-john', chapter: 4 }` | unit | spec line 149 |
| `parseReference('1 Jn 4:8')` returns `{ book: '1-john', chapter: 4, verse: 8 }` | unit | spec line 150 |
| `parseReference('2 Chr 7:14')` returns `{ book: '2-chronicles', chapter: 7, verse: 14 }` | unit | spec line 151 |
| `parseReference('Rev 22')` returns `{ book: 'revelation', chapter: 22 }` | unit | spec line 152 |
| `parseReference('Revelations 22')` returns `{ book: 'revelation', chapter: 22 }` | unit | spec line 153 |
| `parseReference('John 3:16-18')` returns `{ book: 'john', chapter: 3, verse: 16, verseEnd: 18 }` | unit | spec line 154 |
| `parseReference('John 99')` returns `null` | unit | spec line 155 (John has 21 chapters) |
| `parseReference('John 0')` returns `null` | unit | spec line 156 |
| `parseReference('NotABook 3')` returns `null` | unit | spec line 157 |
| `parseReference('love')` returns `null` | unit | spec line 158 |
| `parseReference('John')` returns `null` | unit | spec line 159 |
| `parseReference('')` returns `null` | unit | spec line 160 |
| `parseReference('   John 3:16   ')` returns `{ book: 'john', chapter: 3, verse: 16 }` | unit | spec line 161 |
| `parseReference('John   3   :   16')` returns `{ book: 'john', chapter: 3, verse: 16 }` | unit | spec line 162 |
| `parseReference('John 3 16')` (whitespace-as-delimiter) returns `{ book: 'john', chapter: 3, verse: 16 }` | unit | Spec Requirement 13 |
| All 66 books resolve from full name lowercase (iterated test) | unit | Spec line 163 — covers all 66 |
| All 66 books resolve from at least one abbreviation (iterated test) | unit | Spec line 163 — every book has ≥1 abbreviation that parses correctly to its slug |
| `parseReference('John 3:16 hello')` (trailing garbage) returns `null` | unit | Defensive — must fall through to full-text search |
| `parseReference('  ')` (whitespace only) returns `null` | unit | Defensive |
| `parseReference('John 3:999')` returns `{ book: 'john', chapter: 3, verse: 999 }` (no verse-bound check) | unit | Spec Requirement 6 — verse validation deferred |

**Expected state after completion:**
- [ ] `parseReference` exported with explicit return type `ParsedReference | null`
- [ ] `ParsedReference` interface exported
- [ ] All ~28+ unit tests pass
- [ ] Re-exports added to `frontend/src/lib/search/index.ts`
- [ ] No imports from React, react-router-dom, or DOM globals
- [ ] `pnpm test` continues to pass for all existing search tests

---

### Step 3: Wire `parseReference` into `BibleSearchEntry` (landing page input)

**Objective:** Intercept form submission. If the query parses as a reference, navigate directly to the chapter URL. Otherwise, preserve the existing `/bible/search?q=...` navigation behavior.

**Files to create/modify:**
- `frontend/src/components/bible/landing/BibleSearchEntry.tsx` — MODIFY. Update `handleSubmit` to call `parseReference` first; update `placeholder` text.
- `frontend/src/components/bible/landing/__tests__/BibleSearchEntry.test.tsx` — MODIFY. Add reference-detection tests; update placeholder assertion if any; preserve existing fall-through tests.

**Details:**

Replace the existing `handleSubmit` and `placeholder` in `BibleSearchEntry.tsx`:

```typescript
import { parseReference } from '@/lib/search'

// inside the component:
function handleSubmit(e: React.FormEvent) {
  e.preventDefault()
  const trimmed = query.trim()
  if (!trimmed) return

  const ref = parseReference(trimmed)
  if (ref) {
    const verseSuffix = ref.verse !== undefined ? `?verse=${ref.verse}` : ''
    navigate(`/bible/${ref.book}/${ref.chapter}${verseSuffix}`)
    return
  }

  // Fall-through: existing BB-42 search behavior
  navigate(`/bible/search?q=${encodeURIComponent(trimmed)}`)
}
```

Change the `placeholder` attribute from `Search the Bible — verses, words, phrases` to `Search verses or go to a passage (e.g., John 3:16)` (exact spec string, Requirement 14).

Leave the `aria-label="Search the Bible"` unchanged — it's a stable accessible name and changing it would silently break any existing screen reader user expectations.

**Auth gating:** None — public route, no auth modal involvement.

**Responsive behavior:**
- Desktop (1440px): unchanged. Input centered in `max-w-2xl`. New placeholder fits.
- Tablet (768px): unchanged. New placeholder fits.
- Mobile (375px): unchanged. Placeholder may truncate mid-sentence per spec § Responsive Behavior — acceptable.

**Inline position expectations:** N/A — input occupies its own row.

**Guardrails (DO NOT):**
- Do NOT remove the existing `/bible/search?q=...` fallback path. It is the BB-42 entry point and the spec requires unchanged BB-42 behavior for non-references (Requirement 11).
- Do NOT switch to `window.location.href` or `<a href>`. Use `useNavigate()` only (Spec Requirement 8).
- Do NOT add `encodeURIComponent` around the reference URL — slugs and chapter/verse numbers are URL-safe. The fall-through path keeps `encodeURIComponent` because user queries may contain spaces or special characters.
- Do NOT add a loading spinner or "navigating to..." flash (Spec Requirement 9).
- Do NOT change the input's existing CSS classes, `aria-label`, `type="search"`, or wrapping `<form>` element.
- Do NOT pre-validate verse numbers in the component — the parser is the single source of validation truth.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Existing test: empty submit does NOT navigate | preserved | No change |
| Existing test: aria-label is "Search the Bible" | preserved | No change |
| Existing test: typing "love" + submit navigates to `/bible/search?q=love` | UPDATED to assert fall-through still works (parser returns null for "love") | Spec § BB-42 regression |
| Typing "John 3:16" + submit navigates to `/bible/john/3?verse=16` | integration | Spec Acceptance line 167 |
| Typing "John 3" + submit navigates to `/bible/john/3` (no `?verse=`) | integration | Spec Acceptance line 168 |
| Typing "1 John 4:8" + submit navigates to `/bible/1-john/4?verse=8` | integration | Spec Acceptance line 169 |
| Typing "1John 4" + submit navigates to `/bible/1-john/4` | integration | Spec Acceptance line 170 |
| Typing "John 99" + submit navigates to `/bible/search?q=John%2099` (fall-through) | integration | Spec Acceptance line 171 |
| `useNavigate` is the navigation mechanism (verified by mock spy) | integration | Spec Acceptance line 173 |
| Placeholder reads `Search verses or go to a passage (e.g., John 3:16)` exactly | integration | Spec Acceptance line 178 |

**Expected state after completion:**
- [ ] `BibleSearchEntry.tsx` placeholder updated to exact spec string
- [ ] `handleSubmit` calls `parseReference` before falling through to existing search route
- [ ] All existing `BibleSearchEntry.test.tsx` tests pass; new reference-detection tests added and pass
- [ ] No CSS or accessibility attribute changes

---

### Step 4: Wire `parseReference` into `BibleSearchMode` (search results page input)

**Objective:** Add Enter-key handling to the `BibleSearchMode` input. If the typed query parses as a reference, navigate directly. Otherwise, do not preventDefault — let the existing debounced search continue (or no-op if it already ran).

**Files to create/modify:**
- `frontend/src/components/bible/BibleSearchMode.tsx` — MODIFY. Add `useNavigate` import, add `onKeyDown` handler, update `placeholder` text.
- `frontend/src/components/bible/__tests__/BibleSearchMode.test.tsx` — MODIFY. Add reference-detection tests; update placeholder assertion if any.

**Details:**

In `BibleSearchMode.tsx`:

```typescript
import { useNavigate } from 'react-router-dom'
import { parseReference } from '@/lib/search'

// inside the component:
const navigate = useNavigate()

function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
  if (e.key !== 'Enter') return
  const trimmed = query.trim()
  if (!trimmed) return

  const ref = parseReference(trimmed)
  if (ref) {
    e.preventDefault()
    const verseSuffix = ref.verse !== undefined ? `?verse=${ref.verse}` : ''
    navigate(`/bible/${ref.book}/${ref.chapter}${verseSuffix}`)
  }
  // If parser returns null, do nothing — existing debounced search continues
  // and the user already sees results from their typing. Pressing Enter on a
  // word query is a no-op; it does not need to clear or navigate.
}
```

Attach `onKeyDown={handleKeyDown}` to the input element.

Change the `placeholder` from `Search the Bible...` to `Search verses or go to a passage (e.g., John 3:16)` (exact spec string).

Leave all existing CSS classes, `aria-label`, `aria-describedby`, and the `<label>` with `htmlFor` intact.

**Note on the debounced URL writer:** When the user types "John 3:16" character-by-character into BibleSearchMode, the `useSearchQuery` hook debounces a write to `?q=John%203%3A16` after 250ms. If the user presses Enter before that fires, our `navigate()` call unmounts the component, which triggers `useSearchQuery`'s cleanup `useEffect` (lines 69-73 in `useSearchQuery.ts`) and clears the pending timer. No race. If the user presses Enter AFTER the URL write fires, the URL contains `?q=John%203%3A16` momentarily, then `navigate()` replaces it cleanly with the chapter URL. Either way, no stale URL state remains.

**Auth gating:** None — public route.

**Responsive behavior:**
- Desktop (1440px): unchanged. Input centered in `max-w-2xl`.
- Tablet (768px): unchanged.
- Mobile (375px): placeholder may truncate per spec § Responsive Behavior — acceptable.

**Inline position expectations:** N/A — input occupies its own row.

**Guardrails (DO NOT):**
- Do NOT change the input's existing CSS classes, `aria-label`, `aria-describedby`, `id`, the `<label htmlFor="bible-search-input">`, or any other accessibility attribute.
- Do NOT call `preventDefault()` when the parser returns `null`. Let the existing typing/debounce flow continue uninterrupted.
- Do NOT call `setQuery('')` after navigating. Clearing the input would interfere with cleanup; the unmount handles state disposal.
- Do NOT add `window.scrollTo` or any scroll behavior here. BB-47's `ScrollToTop` handles the top-reset on the destination route, and the BibleReader's BB-38 verse-anchor effect runs after.
- Do NOT short-circuit the existing debounced search by manipulating the `useBibleSearch` hook's internal state. The fall-through path is "do nothing on Enter" — the existing debounced search has already begun or completed.
- Do NOT remove any chip or example state — the EXAMPLE_CHIPS, empty-query state, status announcement, and pagination logic are all unchanged.
- Do NOT remove the `ErrorBoundary` wrapper — it is the BB-42 search runtime safety net.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Existing tests in `BibleSearchMode.test.tsx` continue to pass unchanged | preserved | Spec § BB-42 regression — no existing test files edited except to ADD new tests |
| Pressing Enter on "John 3:16" calls `navigate('/bible/john/3?verse=16')` | integration | Spec Acceptance line 167 — also asserts in this component's context |
| Pressing Enter on "love" does NOT call `navigate()` | integration | Spec Acceptance line 172 — fall-through to existing search |
| Pressing Enter on empty query does NOT call `navigate()` | integration | Defensive |
| `useNavigate` is the navigation mechanism (verified by mock spy) | integration | Spec Acceptance line 173 |
| Placeholder reads `Search verses or go to a passage (e.g., John 3:16)` exactly | integration | Spec Acceptance line 178 |
| `BibleSearchMode` continues to render result list when query has no reference match | preserved + new | Confirms parser presence does not break list rendering |

**Expected state after completion:**
- [ ] `BibleSearchMode.tsx` placeholder updated to exact spec string
- [ ] `onKeyDown` handler added that calls `parseReference` on Enter
- [ ] All existing `BibleSearchMode.test.tsx` tests pass; new reference-detection tests added and pass
- [ ] No CSS or accessibility attribute changes
- [ ] All BB-42 search tests under `frontend/src/lib/search/__tests__/` continue to pass unchanged (Spec Acceptance line 183)

---

### Step 5: End-to-end integration test — search → parser → navigate → BibleReader handoff

**Objective:** Add a single integration test that proves the full handoff: user types a reference into `BibleSearchEntry`, navigates, and the real `BibleReader` mounts and scrolls to the target verse.

**Files to create/modify:**
- `frontend/src/components/bible/landing/__tests__/BibleSearchEntry.integration.test.tsx` — NEW. Or co-locate in `BibleSearchEntry.test.tsx` if the file size stays reasonable. Decision: NEW file to keep concerns separated and keep existing test file unchanged structurally.

**Details:**

Render the app with both `BibleSearchEntry` and a route that mounts the real `BibleReader` (or a minimal `BibleReader` test double if mounting the real one is too heavyweight):

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { BibleSearchEntry } from '../BibleSearchEntry'
// Use real BibleReader if test setup permits; otherwise a minimal route
// stub that asserts the URL params match.

it('typing "John 3:16" + Enter lands on BibleReader at verse 16', async () => {
  render(
    <MemoryRouter initialEntries={['/bible']}>
      <Routes>
        <Route path="/bible" element={<BibleSearchEntry />} />
        <Route
          path="/bible/:book/:chapter"
          element={<RouteParamsProbe />}
        />
      </Routes>
    </MemoryRouter>
  )
  const input = screen.getByRole('searchbox')
  fireEvent.change(input, { target: { value: 'John 3:16' } })
  fireEvent.submit(input)

  // RouteParamsProbe renders the params + ?verse=...
  await waitFor(() => {
    expect(screen.getByTestId('route-book')).toHaveTextContent('john')
    expect(screen.getByTestId('route-chapter')).toHaveTextContent('3')
    expect(screen.getByTestId('route-verse')).toHaveTextContent('16')
  })
})
```

Where `RouteParamsProbe` is a tiny inline component that reads `useParams()` and `useSearchParams()` and renders them with test IDs. This satisfies Spec Acceptance line 174 ("After navigating to `/bible/john/3?verse=16`, the BibleReader mounts and the existing BB-38 verse-scroll contract scrolls to verse 16") at the URL contract level. **Mounting the full BibleReader** in a test environment requires the audio provider, drawer provider, and other contexts that are not cheap; the URL-contract probe is sufficient to prove the handoff and the spec's requirement is "verified by spying on the navigate function" (line 173) — the BibleReader scroll behavior is already covered by existing `BibleReader.deeplink.test.tsx` tests. If the existing deep-link tests are still green, the BB-38 contract holds.

**Decision:** Use the URL-contract probe rather than mounting full BibleReader. Document this in the test file's leading comment so future maintainers understand the rationale. If a richer end-to-end signal is needed later, a Playwright e2e test is the right vehicle, not Vitest.

**Auth gating:** None.

**Responsive behavior:** N/A: not a visual test.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**
- Do NOT mount the full `BibleReader` in this Vitest test. The required contexts (`AudioProvider`, `BibleDrawerProvider`, `AuthModalProvider`, `useBibleAudioPlayer`, etc.) make the test brittle. Use the URL-contract probe.
- Do NOT mock `parseReference` in this integration test. The whole point is to verify the real parser drives the real navigation.
- Do NOT mock `useNavigate`. Use a real `MemoryRouter` so navigation happens for real.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Typing "John 3:16" + submit navigates to a route that exposes `book=john`, `chapter=3`, `?verse=16` | integration | Spec Acceptance line 174 — handoff contract |
| Typing "love" + submit navigates to `/bible/search?q=love` (existing fall-through) | integration | Spec Acceptance line 172 in landing-page context |

**Expected state after completion:**
- [ ] Integration test asserts URL contract for both reference-detection and fall-through paths
- [ ] Test does NOT mock the parser
- [ ] All tests pass
- [ ] Existing `BibleReader.deeplink.test.tsx` continues to pass (BB-38 contract intact)

---

### Step 6: Pre-commit verification

**Objective:** Confirm full Definition of Done before handoff to `/code-review`.

**Files to create/modify:** None (this is a verification step).

**Details:**

Run all of:

```
pnpm lint
pnpm test
pnpm build
```

Confirm:

- All new tests pass
- All existing tests pass (especially `lib/search/__tests__/`, `components/bible/__tests__/`, `components/bible/landing/__tests__/`, `pages/__tests__/BibleReader.deeplink.test.tsx`)
- TypeScript compilation succeeds (no `any` introduced; `parseReference` has explicit return type)
- No new ESLint warnings
- `pnpm build` produces no new bundle warnings or size regressions (alias table is ~2-3 KB uncompressed, negligible)
- No console errors during test run
- No new localStorage keys (verified by grep on diff for `wr_` and `bible:`)

**Manual smoke check (in dev server):**

1. `pnpm dev`, open `/bible`
2. Type "John 3:16" into the landing search input → press Enter → lands on `/bible/john/3?verse=16` with verse 16 scrolled into view
3. Type "love" into the same input → press Enter → lands on `/bible?mode=search&q=love` showing search results
4. From the search results page, type "1 John 4:8" → press Enter → lands on `/bible/1-john/4?verse=8`
5. From the search results page, type "Genesis" → press Enter → does NOT navigate; existing search results for "Genesis" remain visible
6. Type "John 99" → press Enter → falls through; full-text search runs

**Auth gating:** N/A.

**Responsive behavior:** N/A: verification step.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**
- Do NOT skip the manual smoke check. The integration tests cover the URL contract; only the dev server confirms the user-perceived behavior (no flicker, no double-render, scroll lands correctly).
- Do NOT modify any other files in this verification step. If a test fails, fix the underlying step — do not patch around it here.

**Test specifications:** N/A — execution-only step.

**Expected state after completion:**
- [ ] `pnpm lint` passes
- [ ] `pnpm test` passes (new + existing)
- [ ] `pnpm build` passes
- [ ] Manual smoke check confirms 6 scenarios above behave correctly
- [ ] Spec acceptance criteria checklist is fully checked

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | `book-aliases.ts` data module |
| 2 | 1 | `parseReference` parser (imports BOOK_ALIASES) |
| 3 | 2 | Wire parser into BibleSearchEntry |
| 4 | 2 | Wire parser into BibleSearchMode |
| 5 | 3 | End-to-end integration test (extends BibleSearchEntry tests) |
| 6 | 1, 2, 3, 4, 5 | Pre-commit verification |

Steps 3 and 4 are independent of each other and can be implemented in either order after Step 2 completes.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Create the book alias data module | [COMPLETE] | 2026-04-16 | Created `frontend/src/lib/search/book-aliases.ts` (all 66 books, full names + abbreviations + no-space numbered variants + misspellings "Revelations"/"Psalm"). Added `__tests__/book-aliases.test.ts` (8 tests, all pass). Collision-detected build + runtime guard against slug/BIBLE_BOOKS drift. |
| 2 | Create the `parseReference` parser | [COMPLETE] | 2026-04-16 | Created `frontend/src/lib/search/reference-parser.ts` with `parseReference()` + `ParsedReference` interface. Added re-exports to `frontend/src/lib/search/index.ts`. Test file `reference-parser.test.ts` (227 tests — covers every Acceptance Criteria parser case + parametrized all-66-books coverage for full names and abbreviations). All existing search tests continue to pass (287 total). |
| 3 | Wire `parseReference` into `BibleSearchEntry` | [COMPLETE] | 2026-04-16 | Updated `BibleSearchEntry.tsx` — `handleSubmit` calls `parseReference` first, falls through to `/bible/search?q=...` on null. Placeholder updated to exact spec string. Test file extended: 11 tests (4 preserved/updated + 7 new reference-detection). Playwright live-UI check: placeholder renders exactly, min-height 44px, font-size 16px, color white, "John 3:16"→`/bible/john/3?verse=16`, "love"→`/bible?mode=search&q=love` (via existing `BibleSearchRedirect`). |
| 4 | Wire `parseReference` into `BibleSearchMode` | [COMPLETE] | 2026-04-16 | Added `useNavigate` import + `handleKeyDown` onKeyDown handler + updated placeholder to exact spec string in `BibleSearchMode.tsx`. Test file extended — total 26 tests (19 preserved + 1 placeholder + 7 reference-detection). Playwright live check: placeholder exact, 44px min-height, 16px font, white color; "John 3:16"→`/bible/john/3?verse=16`; "love" does NOT navigate, stays in search-mode and existing BB-42 search produces results. |
| 5 | End-to-end integration test | [COMPLETE] | 2026-04-16 | Created `BibleSearchEntry.integration.test.tsx` — 3 URL-contract tests (MemoryRouter + RouteParamsProbe, no `useNavigate` mock, no parser mock). Verifies: "John 3:16"→URL params `book=john, chapter=3, ?verse=16`; "1 John 4:8"→`book=1-john, chapter=4, ?verse=8`; "love"→`/bible/search?q=love` fall-through. BB-38 deep-link tests (15) still pass unchanged. |
| 6 | Pre-commit verification | [COMPLETE] | 2026-04-16 | `pnpm lint` clean. `pnpm test`: 8499 tests pass; one pre-existing orphan test file (`src/hooks/__tests__/useBibleAudio.test.ts` — imports a hook file that never existed in git history; unrelated to BB-49). `pnpm build`: successful, no new warnings. Fixed `BibleLanding.deeplink.test.tsx` (4 assertions updated to the new placeholder regex; 1 assertion switched from `placeholder` to `role='searchbox'` discriminator because both inputs now share the same placeholder text). Live-server smoke check (5 scenarios) all pass: "John 3:16"→chapter URL with verse; "love"→fall-through; "1 John 4:8"→numbered-book URL; "Genesis"/"John 99"→stay in search mode, no navigation. |
