# BB-49: Bible Reference-Aware Search

**Master Plan Reference:** N/A — standalone enhancement to BB-42 full-text search, shipped alongside the `bible-ux-polish` wave.

**Status:** Draft
**Date:** 2026-04-16
**Branch:** `bible-ux-polish` (staying on the same branch as BB-47 and BB-48)
**Depends on:** None (independent of BB-47 and BB-48 — can be executed in parallel)
**Depended on by:** None

---

## Overview

BB-42 shipped full-text scripture search with a client-side inverted index that handles word-level queries well ("love", "faith", "forgiveness"). It fails completely on Bible reference queries: typing "John 3:16" or "John 3" returns no results because the index tokenizes words, not reference patterns.

This is a significant perceived-quality gap. A Bible search box that doesn't understand references feels broken. This spec adds a reference detector that runs before the inverted index query, navigating the user directly to the target chapter (and optionally a target verse) when the query parses as a valid reference, and falling through to full-text search otherwise.

The feature is a quiet UX upgrade — no new page, no new data storage, no auth gate. It makes the Bible search box behave the way every user already expects it to behave.

## User Story

As a **logged-out or logged-in visitor** typing into the Bible search box, I want to be taken directly to a chapter (or verse) when I type a reference like "John 3:16" or "1 John 4:8", and I want word searches like "love" or "courage" to keep working exactly as they do today, so that **the search box does the right thing regardless of what I type**.

## Requirements

### Functional Requirements

#### Reference detection

1. **Pre-search hook.** Before the existing BB-42 inverted index query runs, the search input handler calls a pure `parseReference(query)` function. If the function returns a `ParsedReference`, the handler navigates directly to the target route and skips rendering search results. If it returns `null`, the handler falls through to the existing full-text search flow unchanged.
2. **Reference grammar.** A Bible reference is:
   - `[BookName] [Chapter]` — e.g., "John 3"
   - `[BookName] [Chapter]:[Verse]` — e.g., "John 3:16"
   - `[BookName] [Chapter]:[VerseStart]-[VerseEnd]` — e.g., "John 3:16-18" (navigation targets `VerseStart`; `VerseEnd` is informational in v1)
3. **BookName matching must handle all of:**
   - Full names: "Genesis", "Exodus", "John", "Revelation"
   - Numbered books: "1 John", "2 Chronicles", "1 Corinthians"
   - Common abbreviations: "Gen", "Ex", "Jn", "Rev", "1 Jn", "2 Chr", "1 Cor"
   - Case-insensitive: "john 3:16", "JOHN 3:16", "John 3:16" all resolve identically
   - No-space numbered books: "1John", "2Chr", "1Jn" (users often skip the space)
   - Common misspellings for high-traffic books: "Revelations" → Revelation, "Psalm" and "Psalms" both → Psalms
4. **Canonical slug mapping.** The book alias table maps every recognized input string to the canonical URL slug used by the BibleReader route (`/bible/:book/:chapter`). Known canonical slugs include `genesis`, `exodus`, `john`, `1-john`, `2-chronicles`, `1-corinthians`, `psalms`, `revelation`, etc. The existing BibleReader route consumes these slugs — the new parser must emit them exactly so navigation works without mapping shims on the receiving end.
5. **Chapter validation.** The alias table carries a `chapters: number` value per book. If the parsed chapter is less than 1 or greater than `chapters`, the parser returns `null` and the query falls through to full-text search. Example: "John 99" → `null` → full-text search runs.
6. **Verse validation is deferred to v1.** If a user types "John 3:999", the parser still returns a valid `ParsedReference` with `verse: 999`, navigation lands on `/bible/john/3?verse=999`, and the BibleReader's existing verse-scroll effect silently no-ops because the verse element does not exist. Adding per-chapter verse counts is explicitly out of scope; it requires a dataset we do not yet have aggregated for the parser module.

#### Navigation behavior

7. **Direct navigation, not a results page.** When the parser returns a `ParsedReference`, the search handler calls `navigate(url)` from React Router and does NOT render search results or transition through an intermediate state. The navigation happens on the same event that would have fired the search query.
   - "John 3" → `/bible/john/3`
   - "John 3:16" → `/bible/john/3?verse=16`
   - "1 John 4:8" → `/bible/1-john/4?verse=8`
   - "John 3:16-18" → `/bible/john/3?verse=16` (range end is informational; navigation targets the start verse)
8. **React Router navigation.** Use the `useNavigate()` hook. Do NOT use `window.location.href` or `<a href>` redirects — those would cause a full page reload and break the SPA scroll-to-top contract from BB-47.
9. **No intermediate UI.** No loading spinner, no "navigating to..." flash, no search results page that immediately redirects. The user presses Enter on a reference query and lands on the chapter.
10. **Scroll-to-top compatibility.** Navigation from the search handler follows the BB-47 `ScrollToTop` behavior: the pathname changes, ScrollToTop resets window scroll to 0, then the BibleReader's own verse-anchor effect scrolls to the target verse (when `?verse=` is present). No conflict because these effects run in sequence, not in parallel.

#### Fallback to full-text search

11. **Unchanged BB-42 behavior for non-references.** Word queries ("love", "courage", "anxiety") continue to produce the existing full-text search results page. The inverted index, tokenization, stemming, highlighting, pagination, and empty state are all untouched.
12. **Ambiguity resolved toward reference detection.** "John 3" is treated as a reference (book + chapter). "John" alone (no chapter number) is NOT a reference — it falls through to full-text search and returns verses containing the word "John". "John 3:16" is a reference.
13. **Whitespace and punctuation tolerance.** The parser trims leading/trailing whitespace, collapses internal runs of whitespace to a single space, and accepts both `:` and ` ` between chapter and verse (e.g., "John 3 16" should parse — treat as "John 3:16"). It does NOT need to accept commas or semicolons in v1.

#### Search box UI hints

14. **Placeholder text update.** The Bible search input placeholder changes to `Search verses or go to a passage (e.g., John 3:16)`. This tells users the reference path exists without requiring them to discover it by accident. The existing placeholder text (whatever it currently says) is replaced.
15. **Inline recognized-reference hint (OPTIONAL for v1).** Consider showing a subtle inline hint below the search input when the current query parses as a valid reference: "Press Enter to go to John 3:16". If this adds meaningful implementation complexity (e.g., debouncing, layout shift), skip it for v1 and rely on the placeholder. Decide during `/plan` — this is a judgment call.

### Non-Functional Requirements

- **Performance:** Reference parsing is synchronous string matching against a static map. Target sub-1ms per call on typical hardware. No measurable impact on search latency.
- **Bundle:** The book alias table adds roughly 2-3 KB uncompressed to the search module (200-ish string entries). The BB-42 index itself is ~1-2 MB gzipped and lazy-loaded, so the parser's footprint is negligible in context. No new dependencies.
- **Accessibility:** No new interactive elements. Placeholder text change must maintain the existing `placeholder:text-white/50` contrast minimum per `.claude/rules/09-design-system.md` § "Text Opacity Standards". The navigation fires on Enter (existing behavior), which is already keyboard-accessible.
- **Testing:** Comprehensive unit tests for `parseReference` covering every path in "Acceptance Criteria" below. Integration test verifying search box → parser → navigate → BibleReader handoff using React Testing Library + MemoryRouter (or equivalent). All existing BB-42 tests must continue to pass unchanged — this is a pre-hook, not a replacement.

## Auth Gating

**Zero auth changes.** The Bible section remains unauthenticated per `.claude/rules/02-security.md` § "Bible Wave Auth Posture". Reference navigation is a client-side URL parse + SPA route change; no backend, no user data, no modal.

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|---------------------|--------------------|--------------------|
| Type "John 3:16" in Bible search box and press Enter | Navigates to `/bible/john/3?verse=16` | Same | N/A |
| Type "love" in Bible search box and press Enter | Existing BB-42 search results render | Same | N/A |
| Type "John 99" (invalid chapter) | Falls through to full-text search | Same | N/A |

## Responsive Behavior

The change is functionally invisible at the layout level — the Bible search input is the same element it is today, with the same placeholder slot. The only responsive concern is the placeholder text length on mobile: `Search verses or go to a passage (e.g., John 3:16)` is 50 characters, which will truncate on narrow viewports. This is acceptable because:

- The placeholder's job is to hint at the feature, not to render in full
- Mobile users who can't see the full placeholder will still discover the behavior on first attempt (the feature works; the hint is a bonus)

| Breakpoint | Behavior |
|-----------|----------|
| Mobile (< 640px) | Same search input as today. Placeholder may truncate mid-sentence — acceptable. |
| Tablet (640–1024px) | Placeholder fits in full. |
| Desktop (> 1024px) | Placeholder fits in full. |

Navigation from reference detection is breakpoint-independent.

## AI Safety Considerations

N/A — this spec adds a client-side string parser and a React Router navigation call. It does not touch AI-generated content, user free-text input (the search box is a single-line query field, not a journaling surface), or crisis-adjacent surfaces. The BB-42 full-text search path already exists and is unmodified by this spec.

Note: Crisis keyword detection is NOT added to the Bible search input. Search queries are not journaled or saved, and the input is designed for short word-or-reference queries. Adding crisis detection here would introduce UX friction without a meaningful safety win — users in crisis type into the Pray or Journal textareas, both of which already have crisis banners per `.claude/rules/01-ai-safety.md`.

## Auth & Persistence

- **Logged-out users:** No persistence changes. The search query is held in the existing `useBibleSearch` hook state (already ephemeral). The parser is pure.
- **Logged-in users:** Same as logged-out — this spec does not touch any user data.
- **localStorage usage:** No new keys. No keys removed. No keys touched.
- **Route type:** All changes affect public routes.

## Completion & Navigation

N/A — standalone search enhancement. No Daily Hub completion tracking, no cross-feature CTAs, no activity logging.

## Design Notes

- **No visual design changes beyond the placeholder text.** Do not restyle the search input, do not add a new inline hint banner in v1 (unless the optional Requirement 15 is approved during `/plan`), do not introduce a new empty state or results-page variant.
- **Placeholder typography:** The Bible search input's existing placeholder styling applies. Per `.claude/rules/09-design-system.md` § "Text Opacity Standards", placeholder text must meet `placeholder:text-white/50` minimum for WCAG AA 3:1 contrast on dark backgrounds.
- **New patterns introduced:** None. The parser module and alias table are new code but introduce no new visual patterns, no new components, and no new design tokens. Acceptance criteria will verify the existing search input's layout is unchanged.
- **File locations (non-binding — `/plan` decides):** The parser likely lives alongside the existing BB-42 search module at `frontend/src/lib/search/`. A new file (e.g., `reference-parser.ts`) plus a companion alias table (e.g., `book-aliases.ts`) is the natural shape, but the plan should confirm against the current module layout.

## Out of Scope

- **Per-chapter verse count validation.** "John 3:999" parses successfully and navigates to `/bible/john/3?verse=999`; the BibleReader silently no-ops the scroll. Full verse-count validation requires a 1,189-row dataset (one row per chapter) and would double the parser's data footprint for marginal UX gain.
- **Multi-reference queries.** "John 3:16; Romans 8:28" is not supported in v1. The parser matches a single reference or returns `null`.
- **Cross-book ranges.** "Matthew 28 - Mark 1" is not supported.
- **Partial-verse suggestions / autocomplete.** As the user types "Joh", the search box does NOT show "Did you mean John?" suggestions. This is a future-enhancement idea, deliberately deferred.
- **Typo correction beyond the hardcoded alias list.** "Genisis" (missing E) does NOT resolve. Only the misspellings explicitly baked into the alias table (e.g., "Revelations" → Revelation) are handled.
- **Search history / recent references.** No new storage.
- **Changes to BB-42 inverted index, tokenization, result rendering, or index generation pipeline.** The full-text search path is untouched.
- **Changes to the BibleReader's verse-scroll behavior.** The existing `?verse=N` deep link contract is assumed working and is not modified.
- **Backend / Phase 3 work.** Pure client-side.
- **Optional inline "Press Enter to go to [Book Chapter]" hint below the search box.** Included as a v1 possibility (Requirement 15) but `/plan` may defer it based on implementation complexity; if deferred, document the deferral in the acceptance criteria.

## Acceptance Criteria

### Parser behavior — unit tests

- [ ] `parseReference('John 3:16')` returns `{ book: 'john', chapter: 3, verse: 16 }`.
- [ ] `parseReference('John 3')` returns `{ book: 'john', chapter: 3 }` (no `verse` field or `verse: undefined`).
- [ ] `parseReference('1 John 4:8')` returns `{ book: '1-john', chapter: 4, verse: 8 }`.
- [ ] `parseReference('Gen 1')` returns `{ book: 'genesis', chapter: 1 }`.
- [ ] `parseReference('Psalm 23')` and `parseReference('Psalms 23')` both return `{ book: 'psalms', chapter: 23 }`.
- [ ] `parseReference('john 3:16')` (lowercase) returns `{ book: 'john', chapter: 3, verse: 16 }`.
- [ ] `parseReference('JOHN 3:16')` (uppercase) returns `{ book: 'john', chapter: 3, verse: 16 }`.
- [ ] `parseReference('1John 4')` (no space after numeric prefix) returns `{ book: '1-john', chapter: 4 }`.
- [ ] `parseReference('1 Jn 4:8')` returns `{ book: '1-john', chapter: 4, verse: 8 }`.
- [ ] `parseReference('2 Chr 7:14')` returns `{ book: '2-chronicles', chapter: 7, verse: 14 }`.
- [ ] `parseReference('Rev 22')` returns `{ book: 'revelation', chapter: 22 }`.
- [ ] `parseReference('Revelations 22')` (common misspelling) returns `{ book: 'revelation', chapter: 22 }`.
- [ ] `parseReference('John 3:16-18')` returns `{ book: 'john', chapter: 3, verse: 16, verseEnd: 18 }`.
- [ ] `parseReference('John 99')` returns `null` (invalid chapter — John has 21 chapters).
- [ ] `parseReference('John 0')` returns `null` (chapter must be ≥ 1).
- [ ] `parseReference('NotABook 3')` returns `null`.
- [ ] `parseReference('love')` returns `null` (no chapter number — not a reference).
- [ ] `parseReference('John')` returns `null` (no chapter number — not a reference).
- [ ] `parseReference('')` returns `null`.
- [ ] `parseReference('   John 3:16   ')` returns `{ book: 'john', chapter: 3, verse: 16 }` (whitespace trimmed).
- [ ] `parseReference('John   3   :   16')` returns `{ book: 'john', chapter: 3, verse: 16 }` (internal whitespace tolerated — this is the "collapse whitespace" requirement; `/plan` may simplify by only collapsing around delimiters if that's cleaner).
- [ ] The alias table covers all 66 books by full name AND at least one common abbreviation per book. Test iterates all 66 canonical slugs and asserts both full name and one abbreviation resolve correctly.

### Navigation behavior — integration tests

- [ ] Typing "John 3:16" in the Bible search box and pressing Enter calls `navigate('/bible/john/3?verse=16')`.
- [ ] Typing "John 3" and pressing Enter calls `navigate('/bible/john/3')`.
- [ ] Typing "1 John 4:8" and pressing Enter calls `navigate('/bible/1-john/4?verse=8')`.
- [ ] Typing "1John 4" (no space) and pressing Enter calls `navigate('/bible/1-john/4')`.
- [ ] Typing "John 99" and pressing Enter does NOT navigate — instead triggers the existing BB-42 full-text search flow.
- [ ] Typing "love" and pressing Enter does NOT navigate — instead triggers the existing BB-42 full-text search flow.
- [ ] Navigation uses React Router's `useNavigate()` — verified by spying on the navigate function, not by asserting `window.location.href`.
- [ ] After navigating to `/bible/john/3?verse=16`, the BibleReader mounts and the existing BB-38 verse-scroll contract scrolls to verse 16 (integration test with the real BibleReader, not mocked).

### UI / placeholder

- [ ] The Bible search input placeholder reads `Search verses or go to a passage (e.g., John 3:16)` (exact string).
- [ ] The placeholder meets `placeholder:text-white/50` opacity (WCAG AA 3:1 on hero-dark).

### BB-42 regression

- [ ] All existing BB-42 full-text search tests continue to pass unchanged. No files under the existing search test directory are modified except to add new test files; existing test files are not edited.
- [ ] Typing "love" still renders the full-text results UI with highlighted tokens, pagination, and empty-state handling identical to before this spec.

### Build and types

- [ ] `pnpm lint` passes.
- [ ] `pnpm test` passes (new tests + all existing tests).
- [ ] `pnpm build` passes.
- [ ] `parseReference` has an explicit TypeScript return type (`ParsedReference | null`) and the `ParsedReference` interface is exported.

### Optional — inline hint (Requirement 15)

- [ ] **If implemented:** When the current query parses as a valid reference, an inline hint appears below the search input reading "Press Enter to go to [Book Chapter[:Verse]]". The hint disappears when the query no longer parses.
- [ ] **If deferred:** The spec's Out of Scope section explicitly notes the deferral, and no partial implementation is merged.
