# Implementation Plan: BB-38 — Deep Linking Architecture

**Spec:** `_specs/bb-38-deep-linking-architecture.md`
**Date:** 2026-04-11
**Branch:** `bible-redesign` (stay on current branch — no new branch, no merge)
**Design System Reference:** `_plans/recon/design-system.md` (loaded — BB-38 introduces zero new visual patterns; reference consulted only to confirm no UI changes are in scope)
**Recon Report:** N/A — infrastructure spec, no external recon
**Master Spec Plan:** N/A — standalone infrastructure spec in the Bible-redesign wave

---

## Architecture Context

BB-38 is pure state plumbing. It invents no UI. It rewires existing React state to be derived from and synchronized with URL parameters, so that every meaningful piece of navigable app state becomes addressable via URL. This lets users share, bookmark, refresh, and use browser back/forward to reach specific experiences (verses, contemplative sub-views, Daily Hub tabs, search queries).

### Files this spec touches (verified by recon)

**Core reader state — the heart of the spec:**

- `frontend/src/pages/BibleReader.tsx` (714+ lines) — owns chapter loading, verse selection (via `useVerseTap`), the `VerseActionSheet` mounting, and the existing `?highlight=` one-shot scroll-target handling at lines 284–338. BB-38 replaces the manual `useRef(searchParams.get('highlight'))` pattern with hook-based URL reads, renames the param from `highlight` → `scroll-to` (with legacy `highlight` alias on the read path), and wires a new `?verse=` persistent selection parameter that drives `useVerseTap`.
- `frontend/src/hooks/useVerseTap.ts` (287 lines) — currently owns all selection state via `useState<VerseSelection | null>` and manages sheet open/close via raw `history.pushState({ verseSheet: true })` + `popstate` listener + chapter-change `history.back()` cleanup (lines 78–284). BB-38 refactors this hook to derive the verse-number range from the URL via `useVerseSelection()`, and keeps only the React-owned "sheet open" flag as a small local state (with URL-synchronized lifecycle rules documented in Step 4). **The raw `history.pushState` + `popstate` + `history.back()` dance at lines 98–119, 254–268, 274–284 is removed entirely** — React Router's URL-driven history replaces it.
- `frontend/src/components/bible/reader/VerseActionSheet.tsx` (400+ lines) — currently owns sub-view mount state via `const [subView, setSubView] = useState<{action, handler} | null>(null)` at line 53 and opens a sub-view via `handleActionClick` at line 172. BB-38 replaces this internal state with a prop (`action: VerseAction | null`) and `onActionChange` callback wired to `useActionSheetState()`. The sub-view mount is now derived from URL, not internal `useState`.
- `frontend/src/components/bible/reader/ReaderBody.tsx` line 31 — comment says `?highlight= arrival`. BB-38 updates the comment to reference `?scroll-to=`.

**`?highlight=` → `?scroll-to=` rename (writer sites, enumerated by grep — 6 touch points total):**

- `frontend/src/pages/BiblePlanDay.tsx` line 146 — writes `?highlight=${passage.startVerse}` in the "Read this passage" link. Rename to `?scroll-to=${passage.startVerse}`.
- `frontend/src/components/ask/VerseCardActions.tsx` line 47 — writes `?highlight=${parsedRef.verseStart}` in the AskPage verse card `navigate` call. Rename to `?scroll-to=${parsedRef.verseStart}`.
- `frontend/src/components/bible/landing/VerseOfTheDay.tsx` line 145 (and line 111 local variable `highlightParam`) — writes `?highlight=${highlightParam}` in the VOTD "Read in context" link. Rename the URL write to `?scroll-to=` AND rename the local variable from `highlightParam` to `scrollToParam` for clarity.
- `frontend/src/pages/__tests__/BiblePlanDay.test.tsx` line 118 — `expect(link).toHaveAttribute('href', '/bible/psalms/23?highlight=1')`. Update to `?scroll-to=1`.
- `frontend/src/components/bible/landing/__tests__/VerseOfTheDay.test.tsx` line 116 — `expect(link?.getAttribute('href')).toBe('/bible/psalms/23?highlight=1')`. Update to `?scroll-to=1`.

**Daily Hub, My Bible, search, plan day — BB-38 wiring:**

- `frontend/src/pages/DailyHub.tsx` lines 53–90, 111–141 — already derives `activeTab` from `useSearchParams()` at line 56 (`searchParams.get('tab')`) with validation via `isValidTab()` at line 57. Already writes via `setSearchParams({ tab })` at lines 114, 122, 130, 138. BB-38 extracts this into a new `useDailyHubTab()` hook that returns `{ tab, setTab }`. Behavior is unchanged; this is a mechanical refactor that exposes the pattern as a reusable hook for future consumers and test coverage. The `context`, `prompt`, `verseRef`, `verseText`, `verseTheme` param handling at lines 80–90 is NOT touched — those belong to Spec X / Spec Z.
- `frontend/src/pages/MyBiblePage.tsx` lines 48–115 — currently uses `useActivityFeed()` from `@/hooks/bible/useActivityFeed` which owns a local `useState<ActivityFilter>` (line 59 of that hook). There is **no URL parameter pattern today**. BB-38 adds a URL pattern. The existing stat cards at line 42 already enumerate the section values (`highlights`, `notes`, `bookmarks`) and the filter type extends to `all | highlights | notes | bookmarks | daily-hub` (per `frontend/src/types/my-bible.ts` line 50). BB-38 adds a `useMyBibleView()` hook that reads `?view=<value>` and writes it on filter changes, wired to `setFilter(...)`. Valid view values: `all`, `highlights`, `notes`, `bookmarks`, `daily-hub`. Default: `all`. The URL format is `?view=highlights` (query parameter, not path segment) to match the existing Daily Hub `?tab=` pattern and avoid route restructuring.
- `frontend/src/pages/BibleBrowser.tsx` lines 27–62 — currently owns a local `useState<BibleBrowserMode>('books')` at line 28 and flips between `<BibleBooksMode />` and `<BibleSearchMode />` via a `SegmentedControl`. **There is no dedicated `/bible/search` page** — `/bible/search` in `App.tsx` line 194 is a stub (`<BibleStub page="search" />`). The real search UI lives inside `BibleBrowser` as a sub-mode. BB-38's `/bible/search?q=love` URL is reconciled to use `/bible?mode=search&q=love` (preserves the existing architecture) AND a redirect route change: `/bible/search` now redirects to `/bible?mode=search` with any `q` value forwarded. The redirect handles the spec's `/bible/search?q=love` form; the primary URL format is `/bible?mode=search&q=love`. See Edge Cases & Decisions table for the rationale.
- `frontend/src/components/bible/BibleSearchMode.tsx` lines 33–48 — currently owns query state via `useBibleSearch()` hook which internally has `useState` for `query`. BB-38 rewires the component to accept `query` / `onQueryChange` props from the parent `BibleBrowser`, which in turn sources the query from `useSearchQuery()` reading `?q=` from the URL.
- `frontend/src/hooks/useBibleSearch.ts` — the existing hook owns `query` state internally. BB-38 does NOT touch this hook's internals. Instead, `BibleSearchMode` takes `query` / `setQuery` as props and passes them through OR we add a new `useBibleSearch({ initialQuery, onQueryChange })` option. **Decision: add props to `BibleSearchMode`** (`query`, `onQueryChange`) and have the parent `BibleBrowser` own the query state via `useSearchQuery()`. `BibleSearchMode` passes props through to `useBibleSearch({ query, onQueryChange })`. If `useBibleSearch` doesn't accept controlled mode today, BB-38 adds controlled-mode support to it (new optional `controlled` option). Plan step details this.
- `frontend/src/pages/BiblePlanDay.tsx` — besides the `?highlight=` → `?scroll-to=` rename at line 146, BB-38 adds `?verse=N` support: when the plan day URL has `?verse=N`, the "Read this passage" link appends `?verse=N` to the reader URL (alongside the existing `?scroll-to=` param). This is a minimal interpretation of the spec's `/plans/SLUG/day-N?verse=V` requirement — plan days don't render verse text inline today, so the param flows through to the reader where it becomes the persistent selection. No inline verse rendering is added (out of scope).

**App.tsx route configuration:**

- `frontend/src/App.tsx` line 194 — `<Route path="/bible/search" element={<Suspense ...><BibleStub page="search" /></Suspense>} />`. Replace with a redirect route that forwards `?q=` to `/bible?mode=search&q=<value>`. Use `<Navigate to={...} replace />` wrapped in a small adapter component that reads the incoming `q` from `useSearchParams()` at mount time.

### New files BB-38 creates

**URL hooks (7 files):**

- `frontend/src/hooks/url/useVerseSelection.ts` — reads/writes `?verse=` as `{ start: number, end: number } | null`
- `frontend/src/hooks/url/useActionSheetState.ts` — reads/writes `?action=` as `VerseAction | null` (validated against the deep-linkable subset)
- `frontend/src/hooks/url/useDailyHubTab.ts` — reads/writes `?tab=` for Daily Hub (refactor of existing pattern)
- `frontend/src/hooks/url/useSearchQuery.ts` — reads/writes `?q=` for search
- `frontend/src/hooks/url/useMyBibleView.ts` — reads/writes `?view=` for My Bible
- `frontend/src/hooks/url/__tests__/useVerseSelection.test.ts`
- `frontend/src/hooks/url/__tests__/useActionSheetState.test.ts`
- `frontend/src/hooks/url/__tests__/useDailyHubTab.test.ts`
- `frontend/src/hooks/url/__tests__/useSearchQuery.test.ts`
- `frontend/src/hooks/url/__tests__/useMyBibleView.test.ts`

**Pure URL utilities (2 files + tests):**

- `frontend/src/lib/url/parseVerseParam.ts` — `parseVerseParam(value: string | null): { start: number, end: number } | null`. Pure. Handles `"16"`, `"16-18"`, invalid (NaN, reversed, negative, zero, non-contiguous `"16,18,20"`).
- `frontend/src/lib/url/validateAction.ts` — `validateAction(value: string | null): VerseAction | null`. Pure. Returns the value iff it's in the deep-linkable subset (`explain`, `reflect`, `cross-refs`, `note`, `highlight`, `share`, `memorize`), else `null`.
- `frontend/src/lib/url/__tests__/parseVerseParam.test.ts`
- `frontend/src/lib/url/__tests__/validateAction.test.ts`

**Integration test:**

- `frontend/src/pages/__tests__/BibleReader.deeplink.test.tsx` — integration test for the cold-load deep-link flow. Must cover: (a) `/bible/john/3?verse=16`, (b) `/bible/john/3?verse=16&action=explain`, (c) `/bible/philippians/4?verse=6-7&action=reflect` with BB-32 cache hit mocked, plus browser back/forward verification for the verse → action → close action → close verse → previous page history chain.

**Reference documentation:**

- `_plans/recon/bb38-url-formats.md` — URL format reference for BB-39 (PWA caching) and BB-40 (SEO / OG cards) to consume. Tabulates every BB-38 URL format: path segments, query parameters, valid values, invalid-case fallback, push vs replace history semantics, and legacy aliases.

### Patterns to follow

- **Pure parser + hook wrapper pattern.** Mirror the structure used by `frontend/src/lib/ai/cache.ts` + `frontend/src/hooks/bible/useExplainPassage.ts` from BB-32: framework-agnostic pure modules in `frontend/src/lib/url/`, React-aware hooks in `frontend/src/hooks/url/`. Pure modules are tested in isolation; hooks are tested with `MemoryRouter`.
- **React Router v6 API surface.** `useSearchParams()`, `useParams()`, `useNavigate()`, `useLocation()`. No new router library. React Router v6.22.0 is already installed per `frontend/package.json`.
- **`MemoryRouter` for hook tests.** `frontend/src/components/bible/reader/__tests__/VerseActionSheet.a11y.test.tsx:3,65–67`, `frontend/src/components/bible/reader/__tests__/ShareSubView.test.tsx:3,58–60`, `frontend/src/components/bible/reader/__tests__/ReaderChrome.test.tsx:4,13–35` all use `<MemoryRouter>` as the test wrapper. BB-38's hook tests follow the same pattern with `<MemoryRouter initialEntries={[...]}>` to simulate cold loads.
- **Test mocking via `vi.mock` for hook tests that cross module boundaries.** Follow the `vi.hoisted()` mock pattern from `frontend/src/lib/ai/__tests__/geminiClient.test.ts:5–19` when a hook needs to mock `useNavigate` or similar.
- **Behavior preservation rule (refined — test render-site updates are EXPECTED, not regressions).** The invariant from BB-30/BB-31/BB-32 was about preserving the behavior that tests assert, not about preserving literal file-byte equality. BB-38 adds new props to two components (`VerseActionSheet`, `BibleSearchMode`) and rewrites the internal API surface of one hook (`useVerseTap`). Existing tests for those components and hook MUST have their render-site setup updated to match the new prop contracts, AND `useVerseTap.test.ts` MUST be rewritten to match the new callback-driven API. Test bodies (assertions, click handlers, expectations, user interaction sequences) do NOT change except where the hook's API surface removes a method entirely (`isSheetOpen`, `closeSheet`, `extendSelection`). Enumeration of affected test files, render-site counts, and per-file change policy is in Steps 4, 5, and 7 under the "Test compatibility updates" subsection. Every other existing test in the suite — `BibleReader.test.tsx`, `DailyHub.test.tsx`, `MyBiblePage.test.tsx`, `BibleBrowser.test.tsx`, `BiblePlanDay.test.tsx` (except the two explicit `?scroll-to=` rename assertions), `VerseOfTheDay.test.tsx` (except the one explicit rename assertion), and all other unrelated tests — must continue to pass byte-unchanged. If any test file outside the enumerated list requires modification, pause and report — it indicates a hidden behavior change that BB-38 must not introduce.

### Auth gating patterns (BB-38 introduces zero new gates)

**BB-38 does NOT import `useAuth` or `useAuthModal` in any new file.** The spec is explicit: URL state is content state, not personal state. Every auth gate that exists today on a feature continues to exist unchanged. Cold-loading a URL cannot bypass an auth gate because BB-38 does not touch the gate's firing logic — it only changes how state is restored before the gate fires.

Verified:

- `useVerseSelection.ts` — no auth import
- `useActionSheetState.ts` — no auth import
- `useDailyHubTab.ts` — no auth import (existing DailyHub tab behavior is already auth-free for tab switching)
- `useSearchQuery.ts` — no auth import
- `useMyBibleView.ts` — no auth import
- `parseVerseParam.ts`, `validateAction.ts` — pure functions, no React, no auth

When a cold load mounts an auth-gated sub-view (e.g., the note editor sub-view, which requires login to save a note), the existing auth modal pattern in that sub-view fires unchanged on any write attempt. BB-38 verifies this via the integration test: a cold-load `?verse=16&action=note` mounts the note editor sub-view; attempting to save calls the existing gate.

### Cross-spec data dependencies

**Master plan:** N/A — BB-38 has no master plan.

**BB-38 produces:**

- Public URL format contract, documented in `_plans/recon/bb38-url-formats.md`, consumed by BB-39 (service worker precaching) and BB-40 (Open Graph cards)
- Five exported React hooks (`useVerseSelection`, `useActionSheetState`, `useDailyHubTab`, `useSearchQuery`, `useMyBibleView`) importable by future features
- Two exported pure utilities (`parseVerseParam`, `validateAction`) importable by non-React consumers (e.g., a future service worker)

**BB-38 consumes:**

- BB-32's AI cache via the existing `useExplainPassage` / `useReflectOnPassage` hooks — cold-loaded sub-view URLs benefit automatically without BB-38 touching the cache module. No new imports in BB-38 from `frontend/src/lib/ai/`.
- The existing `verseActionRegistry.ts` — `validateAction` imports `getAllActions()` and checks `hasSubView`. See Step 2.

---

## Auth Gating Checklist

**BB-38 introduces zero new auth gates. Every row below documents that an existing gate continues to fire unchanged, or that no gate applies.**

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Cold-load `/bible/john/3?verse=16` | No gate — content state | Step 4 | None (no auth import) |
| Cold-load `/bible/john/3?verse=16&action=explain` | No gate — BB-30 is not auth-gated | Step 5 | None (BB-30's existing behavior, unchanged by BB-38) |
| Cold-load `/bible/john/3?verse=16&action=reflect` | No gate — BB-31 is not auth-gated | Step 5 | None (BB-31's existing behavior, unchanged by BB-38) |
| Cold-load `/bible/john/3?verse=16&action=note` | Existing note auth gate fires on write attempt | Step 5 | Inherited from `NoteEditorSubView` (no BB-38 change) |
| Cold-load `/bible/john/3?verse=16&action=highlight` | Existing highlight persistence behavior | Step 5 | Inherited from `HighlightColorPicker` (no BB-38 change) |
| Cold-load `/daily?tab=pray` | Works logged-out per 10-ux-flows.md | Step 6 | None — tab switching is not auth-gated |
| Cold-load `/bible?mode=search&q=love` | Search is not auth-gated | Step 7 | None |
| Cold-load `/bible/my-bible?view=highlights` | Personal data visible to logged-in users only; URL itself is not auth-gated | Step 8 | Inherited from `MyBiblePage` (no BB-38 change) |
| Cold-load `/plans/<slug>/day-N?verse=V` | Plans browsable without login | Step 9 | Inherited from `BiblePlanDay` (no BB-38 change) |
| Tap a verse to update URL | No gate | Step 3 | None |
| Open a sub-view to push `?action=` | No gate at the URL-write level; existing sub-view gates fire unchanged | Step 5 | Inherited |
| Switch Daily Hub tab | No gate | Step 6 | None |
| Submit a search query | No gate | Step 7 | None |

**Verification in the integration test (Step 13):** the cold-load test suite includes one case that cold-loads `?verse=16&action=note` as a logged-out user and asserts that (a) the note sub-view mounts, (b) clicking Save fires the existing auth modal from the note feature, (c) BB-38 does not short-circuit or duplicate the gate.

---

## Design System Values (for UI steps)

**N/A. BB-38 introduces zero new UI, zero new visual patterns, zero new colors, zero new fonts, zero new spacing values, zero new components.**

The Design System Reference was consulted only to confirm that no visual patterns are in scope. Nothing in BB-38 requires a CSS value from the design system.

All visible behavior on deep-linked URLs comes from existing components:

- Verse selection glow: existing `ReaderBody.tsx` arrival-highlight effect, triggered via existing `arrivalHighlightVerses` state (unchanged by BB-38 — BB-38 just triggers it from a new parameter name).
- Action sheet mount animation: existing `VerseActionSheet.tsx` slide-in, triggered via existing `isOpen` prop (unchanged).
- Sub-view mount: existing `ExplainSubView`, `ReflectSubView`, `CrossRefsSubView`, `NoteEditorSubView`, `HighlightColorPicker`, `ShareSubView`, `stubSubView('Memorize ships in BB-45')` — all unchanged.
- Daily Hub tab transitions: existing opacity crossfade in `DailyHub.tsx` — unchanged.
- My Bible section filtering: existing `ActivityCard` / `ActivityFilterBar` — unchanged.
- Search results: existing `BibleSearchMode` + `useBibleSearch` — unchanged.
- Plan day passage cards: existing `BiblePlanDay.tsx` + `FrostedCard` — unchanged.

**[UNVERIFIED] values:** None. Zero visual patterns are introduced; zero values need verification.

---

## Design System Reminder

BB-38 is infrastructure. The design system reminder block is minimal but still relevant because BB-38 touches components that must not drift from established patterns:

- **Do NOT introduce any `text-*` color class changes** in any touched component. The reader, action sheet, sub-views, Daily Hub, My Bible, search, and plan day pages are all at their canonical visual state. Rewiring state to URL must not change a single class string except where explicitly specified (e.g., `highlight` → `scrollToParam` local variable rename).
- **Do NOT add loading states, restoring-state overlays, or "please wait" UI** for deep-link state restoration. Cold loads use the existing `BibleReaderSkeleton` route-level Suspense fallback — there is no new "restoring your state" UI. The user sees chapter skeleton → chapter rendered → verse selected → sheet opens → sub-view mounts, exactly as they would from an interactive flow, just without the pointer tap.
- **Do NOT use `history.pushState` directly** in any new code. React Router's `navigate()` and `setSearchParams()` are the only history-pushing APIs in BB-38. The `useVerseTap.ts` refactor REMOVES raw `history.pushState({ verseSheet: true })` and replaces it with URL-driven push semantics. A regression to raw `history.pushState` would break the back-button model.
- **Do NOT use `window.location.assign`, `window.location.href = ...`, or reload-based navigation** anywhere in BB-38. All navigation is via React Router primitives.
- **Do NOT write `?highlight=` in any new code.** The legacy alias is READ-ONLY in `BibleReader.tsx` — BB-38 reads it for backward compatibility but no writer site produces it after BB-38 ships. If a grep over the final diff finds `?highlight=` being written anywhere besides the reader's legacy read path, that's a regression.
- **Do NOT add URL parameters for personal data** (note IDs, journal entry dates, memorize deck card IDs, bookmark IDs). These belong to a future personal-layer deep-linking spec and are explicitly out of scope.
- **Do NOT add URL parameters for authentication state, focus mode, ambient audio state, or drawer state.** These are transient React state.
- **Daily Hub HorizonGlow, FrostedCard tier system, textarea glow pattern, white pill CTAs, sticky FAB pattern, drawer-aware visibility** — all untouched. BB-38 does not render any UI.
- **Deprecated patterns reminder:** do NOT introduce `Caveat` font, `BackgroundSquiggle` on Daily Hub, `GlowBackground` on Daily Hub, `animate-glow-pulse`, cyan textarea borders, italic Lora prompts, soft-shadow 8px-radius cards, or `PageTransition`. BB-38 touches zero visual code, so these are automatic non-concerns, but the reminder is included for completeness.

**Source:** `09-design-system.md` § "Deprecated Patterns" and § "Daily Hub Visual Architecture"; BB-32 Execution Log (previous plan — zero visual drift).

---

## Shared Data Models

**N/A.** BB-38 does not depend on or produce any shared TypeScript interfaces from a master plan.

**Type signatures BB-38 introduces (internal to `frontend/src/lib/url/` and `frontend/src/hooks/url/`):**

```typescript
// frontend/src/lib/url/parseVerseParam.ts
export interface VerseRange {
  start: number
  end: number
}

/**
 * Parses a `verse` query parameter into a structured range.
 * Returns null if the value is missing, malformed, or non-contiguous.
 * Does NOT validate against a chapter's actual verse count — that's the reader's job.
 */
export function parseVerseParam(value: string | null): VerseRange | null

/**
 * Formats a VerseRange back to the query-string representation.
 * { start: 16, end: 16 } → "16"
 * { start: 16, end: 18 } → "16-18"
 */
export function formatVerseRange(range: VerseRange): string
```

```typescript
// frontend/src/lib/url/validateAction.ts
import type { VerseAction } from '@/types/verse-actions'

/**
 * The subset of VerseActions that are deep-linkable via ?action= in BB-38.
 * Excludes: bookmark (no sub-view), pray/journal/meditate (navigate away),
 * copy/copy-with-ref (side-effect actions).
 */
export const DEEP_LINKABLE_ACTIONS: readonly VerseAction[] = [
  'explain',
  'reflect',
  'cross-refs',
  'note',
  'highlight',
  'share',
  'memorize',
] as const

/**
 * Returns the value iff it's a deep-linkable action, else null.
 */
export function validateAction(value: string | null): VerseAction | null
```

```typescript
// frontend/src/hooks/url/useVerseSelection.ts
interface UseVerseSelectionReturn {
  /** Current verse selection from URL, or null. */
  verseRange: VerseRange | null
  /** Push a new verse selection to the URL (history push). */
  setVerse: (start: number, end?: number) => void
  /** Clear the verse selection from the URL (history push). */
  clearVerse: () => void
}

export function useVerseSelection(): UseVerseSelectionReturn
```

```typescript
// frontend/src/hooks/url/useActionSheetState.ts
interface UseActionSheetStateReturn {
  /** Current sub-view action from URL, or null. */
  action: VerseAction | null
  /** Push a new action to the URL (history push). */
  setAction: (action: VerseAction) => void
  /** Clear the action from the URL (history push). */
  clearAction: () => void
}

export function useActionSheetState(): UseActionSheetStateReturn
```

```typescript
// frontend/src/hooks/url/useDailyHubTab.ts
type TabId = 'devotional' | 'pray' | 'journal' | 'meditate'

interface UseDailyHubTabReturn {
  tab: TabId
  setTab: (tab: TabId) => void
}

export function useDailyHubTab(): UseDailyHubTabReturn
```

```typescript
// frontend/src/hooks/url/useSearchQuery.ts
interface UseSearchQueryOptions {
  /** Debounce ms for URL writes (default: 250) */
  debounceMs?: number
}

interface UseSearchQueryReturn {
  query: string
  setQuery: (query: string) => void
}

export function useSearchQuery(options?: UseSearchQueryOptions): UseSearchQueryReturn
```

```typescript
// frontend/src/hooks/url/useMyBibleView.ts
type MyBibleViewId = 'all' | 'highlights' | 'notes' | 'bookmarks' | 'daily-hub'

interface UseMyBibleViewReturn {
  view: MyBibleViewId
  setView: (view: MyBibleViewId) => void
}

export function useMyBibleView(): UseMyBibleViewReturn
```

**localStorage keys this spec touches:**

| Key | Read/Write | Description |
|-----|-----------|-------------|
| _(none)_ | — | **BB-38 introduces zero new localStorage keys and reads/writes zero existing keys.** The URL is the source of truth; nothing BB-38 does needs to persist. Existing keys (`wr_bible_last_read`, `bible:bookmarks`, `bible:notes`, etc.) are untouched. |

---

## Responsive Structure

**N/A — no new UI.** BB-38 is pure state plumbing. Responsive behavior is entirely inherited from the existing reader, action sheet, sub-views, Daily Hub, search, plan, and My Bible components. The integration test should mount the reader at a standard desktop width (1440px, jsdom default) and verify cold-load behavior; mobile/tablet verification is not a BB-38 concern because nothing visible changes at those breakpoints.

| Breakpoint | Width | BB-38 Impact |
|-----------|-------|--------------|
| Mobile | 375px | No change. Scroll-into-view on cold load uses the existing reader logic (which already accounts for mobile sticky chrome). |
| Tablet | 768px | No change. |
| Desktop | 1440px | No change. |

---

## Inline Element Position Expectations

**N/A — no inline-row layouts in this feature.** BB-38 renders zero new UI. No `flex`, no `grid`, no chips, no pills, no button groups are introduced. All existing inline-row layouts (Pray tab chips, Daily Hub tab bar, reader chrome buttons) are untouched.

---

## Vertical Rhythm

**N/A — no UI changes.** BB-38 introduces zero new sections, dividers, or spacing.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] **BB-32 is shipped and committed.** Verified — most recent commit on `bible-redesign` is `063ca2d ai-caching-and-rate-limiting`, the cache module exists at `frontend/src/lib/ai/cache.ts`.
- [x] **React Router v6.22.0 is installed.** Verified via `frontend/package.json`.
- [x] **`verseActionRegistry.ts` enumerates the action set.** Verified: `highlight, note, bookmark, share, pray, journal, meditate, cross-refs, explain, reflect, memorize, copy, copy-with-ref`. BB-38's deep-linkable subset (`explain, reflect, cross-refs, note, highlight, share, memorize`) is a strict subset of actions where `hasSubView: true` AND the sub-view renders in the sheet (excluding `bookmark` toggle + `pray/journal/meditate` navigate-away + `copy/copy-with-ref` side-effect).
- [x] **`?highlight=` has exactly 6 touch points.** Verified by grep: 3 writer sites (`BiblePlanDay.tsx:146`, `VerseCardActions.tsx:47`, `VerseOfTheDay.tsx:145`), 1 reader consumer (`BibleReader.tsx:285,298–309`), 2 test assertions (`BiblePlanDay.test.tsx:118`, `VerseOfTheDay.test.tsx:116`). Plus the comment-only reference at `ReaderBody.tsx:31`. Well under the 10-caller threshold from the user's scope guard.
- [x] **Daily Hub `?tab=` is already URL-derived.** Verified via `DailyHub.tsx:53–57, 111–141` — already uses `useSearchParams()`, `searchParams.get('tab')`, `isValidTab()` validator, and `setSearchParams({ tab })` on switch. BB-38's `useDailyHubTab()` is a mechanical extraction, no behavior change.
- [x] **`/bible/search` route is a stub.** Verified — `App.tsx:194` routes it to `BibleStub page="search"`. The real search UI lives at `/bible` as a sub-mode toggled via `SegmentedControl`. BB-38 reconciles this by using `/bible?mode=search&q=<query>` as the canonical deep-link form and adding a redirect from `/bible/search?q=<query>` to `/bible?mode=search&q=<query>`.
- [x] **MyBiblePage has no URL parameters today.** Verified — no `useSearchParams`, no `useParams` consumption for section filtering. BB-38 adds `?view=` from scratch. The existing `useActivityFeed` hook's `filter.type` is the target.
- [x] **`useVerseTap` currently uses raw `history.pushState` + `popstate` + `history.back()`.** Verified at lines 98–119, 254–268, 274–284. BB-38 removes all three and replaces with URL-driven history. This is the single riskiest change in the plan. Step 4 details it.
- [x] **`VerseActionSheet` owns sub-view state internally via `useState`.** Verified at line 53 (`const [subView, setSubView] = useState<{action, handler} | null>(null)`). BB-38 converts this to prop-driven state.
- [x] **Test files for the refactored components exist and have been audited for impact (Concerns 1, 2, 3 resolution):**
  - `frontend/src/components/bible/reader/__tests__/VerseActionSheet.test.tsx` — **exists**, 16 tests, 16 inline render call sites, `defaultProps` helper at line 83. Step 5 updates this file (test bodies unchanged, render sites use stateful wrapper).
  - `frontend/src/components/bible/reader/__tests__/VerseActionSheet.a11y.test.tsx` — **exists**, 10 tests, 1 render helper at line 63, `defaultProps` at line 56. Step 5 updates `renderSheet` to wrap in stateful wrapper.
  - `frontend/src/components/bible/reader/__tests__/VerseActionSheet.explain.test.tsx` — **exists**, 7 tests, 1 render helper at line 72 (inline JSX). Step 5 swaps inline JSX for stateful wrapper.
  - `frontend/src/components/bible/reader/__tests__/VerseActionSheet.reflect.test.tsx` — **exists**, 10 tests, 1 render helper at line 77 (inline JSX). Step 5 swaps inline JSX for stateful wrapper.
  - `frontend/src/hooks/__tests__/useVerseTap.test.ts` — **exists**, 290 lines, 11 tests. The file asserts on `isSheetOpen` (10+ times), `closeSheet()` (line 253), `extendSelection()` (line 215), and mocks `history.pushState`/`history.back` (lines 97-98). Step 4 **rewrites** this file — 9 tests rewritten for the new callback-driven API, 2 tests removed (behaviors moved to Step 10 integration test), 7 new tests added for the URL-derivation logic. Final test count: 16. Hook-level coverage is preserved and expanded, not lost.
  - `frontend/src/components/bible/__tests__/BibleSearchMode.test.tsx` — **exists**, 3 tests, 1 render helper at line 24, already mocks `useBibleSearch`. Step 7 updates one render-site to pass `query=""` + `onQueryChange={vi.fn()}`. Test bodies unchanged.
  - `frontend/src/hooks/__tests__/useBibleSearch.test.tsx` — **exists**, 7 tests, all use uncontrolled mode. Step 7 does NOT modify existing tests (uncontrolled mode is preserved); adds 4 new controlled-mode tests.
- [x] **Existing tests for all touched components pass at baseline.** Plan assumes the full test suite passes before execution starts. If it does not, the executor must report before proceeding.
- [ ] All auth-gated actions from the spec are accounted for: verified — BB-38 introduces zero new gates, and every row in the Auth Gating Checklist cites the existing gate or "no gate".
- [ ] Design system values are verified: N/A — no visual changes.
- [ ] All [UNVERIFIED] values are flagged: none in this plan.
- [ ] No deprecated patterns used: verified — BB-38 touches zero visual code.

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Where does the search URL live? | Primary: `/bible?mode=search&q=love`. Legacy: `/bible/search?q=love` redirects to primary. | The existing architecture hosts search as a sub-mode of `/bible` via `SegmentedControl`, not a dedicated page. The spec's `/bible/search` URL matches a stub route. Rather than rebuild search as a standalone page (scope creep, risks duplicating `useBibleSearch`), BB-38 keeps search embedded in `/bible` and adds `?mode=search&q=` to that URL. The legacy `/bible/search` path becomes a redirect that forwards `?q=` so existing external links and the spec's form work. |
| My Bible URL format: `?view=` or `/my-bible/<section>`? | `?view=<section>` | Matches the existing Daily Hub `?tab=` pattern (query-parameter, not path segment). Avoids a route-restructure that would ripple into `App.tsx`, `SEO.tsx` canonical URLs, and JSON-LD breadcrumbs. Path-segment routing for `/my-bible/highlights` etc. is a bigger change than query parameters and not worth the cost for a filter-level view. |
| How does `?verse=16&action=explain` coexist with user interaction when sheet close is triggered? | The sheet's "open" state is owned by React (a `useState<boolean>` in `BibleReader.tsx`), derived from URL on mount and synchronized on URL change per the rules in Step 4. The URL does NOT encode sheet open/closed without a sub-view — it only encodes the persistent verse selection and the optional sub-view. | Matches the spec's "What does NOT get URL state" rule that "the verse action sheet's open/closed state without a sub-view" is not URL-addressable. A cold-load `?verse=16` (no action) leaves the sheet closed; a cold-load `?verse=16&action=explain` opens the sheet AND mounts the sub-view. Interactive tap opens the sheet AND pushes `?verse=16`. Close sheet clears `?verse=`. Browser back from `?verse=16&action=explain` to `?verse=16` keeps the sheet open (because React state doesn't auto-close) and unmounts the sub-view. Browser back from `?verse=16` to no-params clears the sheet state (via URL-change effect). |
| Does a cold-load `?verse=16` mount the sheet? | **No.** | Spec says "The action sheet does NOT automatically open — the user still needs to tap the verse to open it." Only `?action=` triggers sheet mount on cold load. |
| Push vs replace on interactive tap of an already-selected verse | Replace (no-op if URL unchanged) | Tapping a cold-loaded `?verse=16` verse is the rare case where the URL doesn't change on tap — React sheet state flips to open, no history entry is pushed. Browser back from the resulting state goes to the previous page, not "close the sheet". Acceptable per the spec's edge case coverage. |
| Push vs replace on chapter load clearing invalid `?verse=999` | Replace (`setSearchParams(..., { replace: true })`) | Automatic correction — not part of the user's interaction history. |
| Push vs replace on cold-load of `/bible/john/3?scroll-to=16` after the reader consumes and deletes it | Replace | Same rule — parameter cleanup is automatic, not user-initiated. |
| Does `?verse=` and `?scroll-to=` coexist? | Yes, intentionally. | `?verse=N` is persistent selection state; `?scroll-to=N` is a one-shot scroll target. A URL `/bible/john/3?verse=16&scroll-to=16` cold-loads with verse 16 selected AND scrolls the viewport to verse 16 with arrival glow, then the reader deletes `?scroll-to=` (keeping `?verse=`). External entry points like VOTD that want BOTH behaviors should write both parameters; entry points that want only the scroll glow (like AskPage verse links) write only `?scroll-to=`. BB-38's rename step only touches the writer sites that previously wrote `?highlight=` — those are converted to `?scroll-to=` (preserving the original one-shot semantic). No writer site is converted to `?verse=`. |
| Which sub-views does `validateAction` accept? | The deep-linkable subset: `explain`, `reflect`, `cross-refs`, `note`, `highlight`, `share`, `memorize`. Excluded: `bookmark` (no sub-view — toggles), `pray`/`journal`/`meditate` (navigate away from reader), `copy`/`copy-with-ref` (side-effect, no sub-view). | Matches `hasSubView: true` in the registry minus the exclusions documented in the spec's reconciliation section. |
| What happens to `?mode=search` when a user starts typing in `BibleSearchMode`? | Writes `?mode=search&q=<query>` to URL with 250ms debounce | Debouncing keeps the URL from pushing a history entry on every keystroke. Each keystroke after debounce settles produces one history entry — so back-navigation through a search session goes through the major query states, not letter-by-letter. |
| What happens when a user switches from search mode to books mode? | `?mode` param is removed; `?q=` is removed | Switching away from search drops the search-specific params, matching the "drop irrelevant parameters on section change" rule. |
| Does `?verse=` work on the plan day page? | Yes — minimally. The plan day page reads `?verse=N` and, if present, appends `?verse=N` to the "Read this passage" reader link so the user lands in the reader with the verse pre-selected. | Plan days don't render verse text inline today (only passage references and navigation links), so there is no in-page highlight to apply. The minimal spec-compliant interpretation is to flow the verse parameter through to the reader. |

---

## Implementation Steps

### Step 1: Create pure URL utilities (`parseVerseParam` and `validateAction`)

**Objective:** Land the two framework-agnostic pure functions first, with full unit test coverage, so every downstream hook and component can import them with confidence. Pure functions have no dependencies on React Router, React, or any module that imports either — they can be tested in isolation with no mocks.

**Files to create:**

- `frontend/src/lib/url/parseVerseParam.ts` — pure parser and formatter
- `frontend/src/lib/url/validateAction.ts` — pure action validator
- `frontend/src/lib/url/__tests__/parseVerseParam.test.ts`
- `frontend/src/lib/url/__tests__/validateAction.test.ts`

**Details:**

`parseVerseParam.ts` exports:

```typescript
export interface VerseRange {
  start: number
  end: number
}

/**
 * Parses the ?verse= query parameter value into a structured range.
 *
 * Valid inputs:
 *   "16"     → { start: 16, end: 16 }
 *   "16-18"  → { start: 16, end: 18 }
 *
 * Invalid inputs return null (caller uses default state):
 *   null        → null (no parameter present)
 *   ""          → null (empty string)
 *   "abc"       → null (non-numeric)
 *   "-5"        → null (negative)
 *   "0"         → null (zero — verses are 1-indexed)
 *   "5-3"       → null (reversed range)
 *   "5-"        → null (trailing dash)
 *   "-5-10"     → null (leading dash)
 *   "16,18,20"  → null (non-contiguous — not supported in BB-38)
 *   "16-"       → null
 *   "16.5"      → null (non-integer)
 *   " 16 "      → null (whitespace)
 *
 * Does NOT validate against a chapter's actual verse count — that's the reader's job.
 */
export function parseVerseParam(value: string | null): VerseRange | null {
  if (value === null || value === '') return null

  // Reject any character that isn't a digit or a single hyphen
  if (!/^[0-9]+(-[0-9]+)?$/.test(value)) return null

  const parts = value.split('-')
  if (parts.length === 1) {
    const n = parseInt(parts[0], 10)
    if (isNaN(n) || n < 1) return null
    return { start: n, end: n }
  }
  if (parts.length === 2) {
    const start = parseInt(parts[0], 10)
    const end = parseInt(parts[1], 10)
    if (isNaN(start) || isNaN(end)) return null
    if (start < 1 || end < 1) return null
    if (end < start) return null
    return { start, end }
  }
  return null
}

/**
 * Formats a VerseRange back to the query-string representation.
 * Single-verse ranges are formatted without a dash: { start: 16, end: 16 } → "16".
 */
export function formatVerseRange(range: VerseRange): string {
  if (range.start === range.end) return String(range.start)
  return `${range.start}-${range.end}`
}
```

`validateAction.ts` exports:

```typescript
import type { VerseAction } from '@/types/verse-actions'
import { getActionByType } from '@/lib/bible/verseActionRegistry'

/**
 * The subset of VerseActions that are deep-linkable via ?action= in BB-38.
 *
 * Excluded actions and why:
 *   - bookmark: toggles without a sub-view (hasSubView: false). Deep-linking "open a toggle" has no semantics.
 *   - pray/journal/meditate: navigate away from the reader to /daily. Deep-linking them would produce a Daily Hub URL, not a reader state.
 *   - copy/copy-with-ref: side-effect actions with no sub-view.
 *
 * The included set is exactly the actions where hasSubView: true AND the sub-view mounts in the sheet.
 */
export const DEEP_LINKABLE_ACTIONS = [
  'explain',
  'reflect',
  'cross-refs',
  'note',
  'highlight',
  'share',
  'memorize',
] as const satisfies readonly VerseAction[]

export type DeepLinkableAction = typeof DEEP_LINKABLE_ACTIONS[number]

/**
 * Returns the value iff it's a deep-linkable action, else null.
 * Also verifies the action exists in the registry and has hasSubView: true
 * (defense-in-depth against future registry drift).
 */
export function validateAction(value: string | null): DeepLinkableAction | null {
  if (value === null || value === '') return null
  if (!(DEEP_LINKABLE_ACTIONS as readonly string[]).includes(value)) return null
  const handler = getActionByType(value as VerseAction)
  if (!handler) return null
  if (!handler.hasSubView) return null
  return value as DeepLinkableAction
}
```

**Auth gating (if applicable):** None. Pure functions, no auth imports.

**Responsive behavior:** N/A: no UI impact.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**

- Do NOT import React, React Router, or any module that imports either. These are framework-agnostic pure functions.
- Do NOT hard-code the deep-linkable action list as strings without the `satisfies readonly VerseAction[]` type assertion — the type check catches drift if `VerseAction` is renamed or removed.
- Do NOT call `getAllActions()` in `validateAction` — it allocates an array on every call. Use `getActionByType` which does a single lookup.
- Do NOT accept whitespace-padded values (`" 16 "` returns null, not `{ start: 16, end: 16 }`). React Router returns exact URL values, not trimmed — if whitespace arrives, it's a malformed URL and should be rejected.
- Do NOT throw on invalid input. Always return null. The caller uses null to mean "no selection / no action".

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `parseVerseParam — null input returns null` | unit | `parseVerseParam(null)` → `null` |
| `parseVerseParam — empty string returns null` | unit | `parseVerseParam('')` → `null` |
| `parseVerseParam — single verse parses` | unit | `parseVerseParam('16')` → `{ start: 16, end: 16 }` |
| `parseVerseParam — single-digit verse` | unit | `parseVerseParam('1')` → `{ start: 1, end: 1 }` |
| `parseVerseParam — valid range parses` | unit | `parseVerseParam('16-18')` → `{ start: 16, end: 18 }` |
| `parseVerseParam — same-start-end range` | unit | `parseVerseParam('5-5')` → `{ start: 5, end: 5 }` |
| `parseVerseParam — reversed range returns null` | unit | `parseVerseParam('5-3')` → `null` |
| `parseVerseParam — non-contiguous comma list returns null` | unit | `parseVerseParam('16,18,20')` → `null` |
| `parseVerseParam — non-numeric returns null` | unit | `parseVerseParam('abc')` → `null` |
| `parseVerseParam — zero returns null` | unit | `parseVerseParam('0')` → `null` |
| `parseVerseParam — negative number returns null` | unit | `parseVerseParam('-5')` → `null` |
| `parseVerseParam — decimal returns null` | unit | `parseVerseParam('16.5')` → `null` |
| `parseVerseParam — whitespace returns null` | unit | `parseVerseParam(' 16 ')` → `null` |
| `parseVerseParam — trailing dash returns null` | unit | `parseVerseParam('16-')` → `null` |
| `parseVerseParam — leading dash returns null` | unit | `parseVerseParam('-5')` → `null` |
| `parseVerseParam — empty range returns null` | unit | `parseVerseParam('-')` → `null` |
| `formatVerseRange — single verse` | unit | `formatVerseRange({ start: 16, end: 16 })` → `'16'` |
| `formatVerseRange — range` | unit | `formatVerseRange({ start: 16, end: 18 })` → `'16-18'` |
| `formatVerseRange → parseVerseParam round-trip` | unit | `parseVerseParam(formatVerseRange({ start: 3, end: 7 }))` → `{ start: 3, end: 7 }` |
| `validateAction — null returns null` | unit | `validateAction(null)` → `null` |
| `validateAction — empty returns null` | unit | `validateAction('')` → `null` |
| `validateAction — each deep-linkable action round-trips` | unit | 7 assertions: `explain`, `reflect`, `cross-refs`, `note`, `highlight`, `share`, `memorize` each return themselves |
| `validateAction — bookmark returns null` | unit | `validateAction('bookmark')` → `null` (exists in registry but `hasSubView: false`) |
| `validateAction — pray/journal/meditate return null` | unit | 3 assertions — all return null (navigate-away actions, not in DEEP_LINKABLE_ACTIONS allowlist) |
| `validateAction — copy/copy-with-ref return null` | unit | 2 assertions — side-effect actions, return null |
| `validateAction — unknown action returns null` | unit | `validateAction('notarealaction')` → `null` |
| `validateAction — case-sensitive` | unit | `validateAction('EXPLAIN')` → `null` (URL params are case-sensitive) |

Expected total: ~26 tests across the two files.

**Expected state after completion:**

- [ ] `parseVerseParam.ts` and `validateAction.ts` exist in `frontend/src/lib/url/`
- [ ] Both files are pure (no React/Router imports)
- [ ] All 26 tests pass
- [ ] `pnpm lint` passes
- [ ] TypeScript strict mode passes with no errors
- [ ] No `frontend/src/lib/url/index.ts` barrel is created — importers reference the specific file paths for tree-shaking

---

### Step 2: Create the URL hooks — `useVerseSelection` and `useActionSheetState`

**Objective:** Land the two primary verse-state hooks with full test coverage. These wrap `useSearchParams` from React Router v6 and expose typed, validated, push-history getters/setters. They are framework-aware but don't touch any specific page component yet.

**Files to create:**

- `frontend/src/hooks/url/useVerseSelection.ts`
- `frontend/src/hooks/url/useActionSheetState.ts`
- `frontend/src/hooks/url/__tests__/useVerseSelection.test.ts`
- `frontend/src/hooks/url/__tests__/useActionSheetState.test.ts`

**Details:**

`useVerseSelection.ts`:

```typescript
import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { parseVerseParam, formatVerseRange, type VerseRange } from '@/lib/url/parseVerseParam'

interface UseVerseSelectionReturn {
  verseRange: VerseRange | null
  setVerse: (start: number, end?: number) => void
  clearVerse: () => void
}

/**
 * Reads and writes the ?verse= query parameter as the source of truth
 * for the Bible reader's persistent verse selection state (BB-38).
 *
 * Reads are validated via parseVerseParam — invalid values return null
 * and are NOT auto-corrected in the URL. The caller decides whether
 * to rewrite on next state change.
 *
 * Writes push a new history entry (navigate push, not replace).
 * Clearing removes the parameter and also pushes.
 */
export function useVerseSelection(): UseVerseSelectionReturn {
  const [searchParams, setSearchParams] = useSearchParams()
  const rawVerse = searchParams.get('verse')
  const verseRange = parseVerseParam(rawVerse)

  const setVerse = useCallback(
    (start: number, end?: number) => {
      const range: VerseRange = { start, end: end ?? start }
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          next.set('verse', formatVerseRange(range))
          return next
        },
        { replace: false }, // push — user action
      )
    },
    [setSearchParams],
  )

  const clearVerse = useCallback(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete('verse')
        // BB-38 rule: when verse is removed, action is also removed
        // (action without verse is meaningless per edge-case rule)
        next.delete('action')
        return next
      },
      { replace: false },
    )
  }, [setSearchParams])

  return { verseRange, setVerse, clearVerse }
}
```

`useActionSheetState.ts`:

```typescript
import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { validateAction, type DeepLinkableAction } from '@/lib/url/validateAction'

interface UseActionSheetStateReturn {
  action: DeepLinkableAction | null
  setAction: (action: DeepLinkableAction) => void
  clearAction: () => void
}

/**
 * Reads and writes the ?action= query parameter for the verse action sheet's
 * sub-view mount state (BB-38).
 *
 * Reads are validated via validateAction — only actions in the deep-linkable
 * subset are returned. Invalid values return null and are NOT auto-corrected.
 *
 * BB-38 rule: action without verse is meaningless. This hook does NOT enforce
 * that rule on read — it's the caller's job to check that a verse range is
 * also present before mounting a sub-view. `BibleReader.tsx` Step 5 implements
 * the rule.
 *
 * Writes push a new history entry. Clearing pushes a new entry that keeps the
 * verse parameter intact (action is removed, verse is retained).
 */
export function useActionSheetState(): UseActionSheetStateReturn {
  const [searchParams, setSearchParams] = useSearchParams()
  const rawAction = searchParams.get('action')
  const action = validateAction(rawAction)

  const setAction = useCallback(
    (a: DeepLinkableAction) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          next.set('action', a)
          return next
        },
        { replace: false },
      )
    },
    [setSearchParams],
  )

  const clearAction = useCallback(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete('action')
        return next
      },
      { replace: false },
    )
  }, [setSearchParams])

  return { action, setAction, clearAction }
}
```

**Auth gating (if applicable):** None.

**Responsive behavior:** N/A: no UI impact.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**

- Do NOT import `useNavigate` — use `setSearchParams` exclusively. `setSearchParams` handles the history push internally via React Router's navigation API.
- Do NOT mutate the `prev` URLSearchParams directly inside the callback — always construct a new `URLSearchParams(prev)` and return that. Mutating the prev object has undefined behavior in React Router v6.
- Do NOT use `{ replace: true }` for user-initiated writes. The default is push (history entry created). Replace is reserved for automatic corrections (Step 4).
- Do NOT auto-correct invalid URL values on read. The hook returns null for invalid values; the consumer decides whether to rewrite.
- Do NOT include the `action` parameter in the `setVerse` writer — `setVerse` only touches `verse`. Including `action` would couple state that the spec says should remain independent (`?verse=16` and `?verse=16&action=explain` are both valid states).
- `clearVerse` DOES delete `action` alongside `verse` because the BB-38 edge-case rule says "action without verse is meaningless." This is the one coupling enforced at the hook level.
- Do NOT accept `end < start` in `setVerse`. If a caller passes end=10, start=20, the resulting range is invalid and will fail `parseVerseParam` validation on round-trip. For BB-38, callers are trusted to pass valid ranges (they come from `useVerseTap` which normalizes min/max). No defensive validation in the setter.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `useVerseSelection — reads ?verse=16 from initial URL` | unit (MemoryRouter) | Mount hook inside `<MemoryRouter initialEntries={['/bible/john/3?verse=16']}>`, assert `verseRange` equals `{ start: 16, end: 16 }` |
| `useVerseSelection — reads ?verse=16-18 range` | unit | Initial entry `?verse=16-18`, assert `{ start: 16, end: 18 }` |
| `useVerseSelection — returns null for no verse param` | unit | Initial entry `/bible/john/3`, assert `verseRange === null` |
| `useVerseSelection — returns null for invalid verse` | unit | Initial entry `?verse=abc`, assert `verseRange === null` |
| `useVerseSelection — setVerse(16) writes ?verse=16 to URL` | unit | Call `setVerse(16)`, assert `searchParams.get('verse')` after next render equals `'16'` |
| `useVerseSelection — setVerse(16, 18) writes ?verse=16-18` | unit | Call `setVerse(16, 18)`, assert `'16-18'` |
| `useVerseSelection — setVerse pushes history entry` | unit | Use a `Routes` wrapper with a history spy; call `setVerse`; assert `history.length` increased by 1 |
| `useVerseSelection — clearVerse removes verse param` | unit | Start with `?verse=16&action=explain`, call `clearVerse`, assert `searchParams.get('verse') === null` |
| `useVerseSelection — clearVerse also removes action param` | unit | Start with `?verse=16&action=explain`, call `clearVerse`, assert `searchParams.get('action') === null` |
| `useVerseSelection — clearVerse preserves unrelated params` | unit | Start with `?verse=16&other=keep`, call `clearVerse`, assert `searchParams.get('other') === 'keep'` |
| `useActionSheetState — reads ?action=explain` | unit | Initial `?action=explain`, assert `action === 'explain'` |
| `useActionSheetState — reads each deep-linkable action` | unit | 7 assertions covering all DEEP_LINKABLE_ACTIONS |
| `useActionSheetState — returns null for bookmark` | unit | Initial `?action=bookmark`, assert `action === null` |
| `useActionSheetState — returns null for unknown action` | unit | Initial `?action=abc`, assert `action === null` |
| `useActionSheetState — setAction writes to URL` | unit | Call `setAction('reflect')`, assert param |
| `useActionSheetState — setAction pushes history` | unit | History length spy |
| `useActionSheetState — clearAction removes only action` | unit | Start with `?verse=16&action=explain`, call `clearAction`, assert `verse` remains and `action` is gone |

Expected total: ~20 tests.

**Expected state after completion:**

- [ ] `useVerseSelection.ts` and `useActionSheetState.ts` exist in `frontend/src/hooks/url/`
- [ ] Both tested with `<MemoryRouter>`
- [ ] All ~20 tests pass
- [ ] TypeScript strict passes
- [ ] `pnpm lint` passes

---

### Step 3: Create `useDailyHubTab`, `useSearchQuery`, `useMyBibleView` hooks

**Objective:** Land the remaining three URL hooks. `useDailyHubTab` is a mechanical extraction of the existing DailyHub pattern. `useSearchQuery` and `useMyBibleView` are new. All three have full test coverage before any consumer is rewired.

**Files to create:**

- `frontend/src/hooks/url/useDailyHubTab.ts`
- `frontend/src/hooks/url/useSearchQuery.ts`
- `frontend/src/hooks/url/useMyBibleView.ts`
- `frontend/src/hooks/url/__tests__/useDailyHubTab.test.ts`
- `frontend/src/hooks/url/__tests__/useSearchQuery.test.ts`
- `frontend/src/hooks/url/__tests__/useMyBibleView.test.ts`

**Details:**

`useDailyHubTab.ts`:

```typescript
import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

export type DailyHubTab = 'devotional' | 'pray' | 'journal' | 'meditate'

const VALID_TABS: readonly DailyHubTab[] = ['devotional', 'pray', 'journal', 'meditate']
const DEFAULT_TAB: DailyHubTab = 'devotional'

function isValidTab(value: string | null): value is DailyHubTab {
  return value !== null && (VALID_TABS as readonly string[]).includes(value)
}

interface UseDailyHubTabReturn {
  tab: DailyHubTab
  setTab: (tab: DailyHubTab) => void
}

/**
 * Reads and writes the ?tab= query parameter for the Daily Hub.
 *
 * Extracted from the existing DailyHub.tsx pattern (unchanged behavior):
 *   - Default tab is 'devotional' when no param is present or value is invalid
 *   - Writes push a history entry
 *   - Writes REPLACE all search params with just { tab } (matches existing
 *     DailyHub.tsx:114 behavior which intentionally clears cross-feature context
 *     params like 'context', 'prompt', 'verseRef', 'verseText', 'verseTheme'
 *     on tab switch)
 */
export function useDailyHubTab(): UseDailyHubTabReturn {
  const [searchParams, setSearchParams] = useSearchParams()
  const raw = searchParams.get('tab')
  const tab: DailyHubTab = isValidTab(raw) ? raw : DEFAULT_TAB

  const setTab = useCallback(
    (nextTab: DailyHubTab) => {
      // Match existing DailyHub behavior: replace entire param dict with just { tab }
      // to clear cross-feature context params on tab switch.
      setSearchParams({ tab: nextTab }, { replace: false })
    },
    [setSearchParams],
  )

  return { tab, setTab }
}
```

`useSearchQuery.ts`:

```typescript
import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

interface UseSearchQueryOptions {
  debounceMs?: number
}

interface UseSearchQueryReturn {
  query: string
  setQuery: (query: string) => void
}

const DEFAULT_DEBOUNCE_MS = 250

/**
 * Reads and writes the ?q= query parameter for Bible search.
 *
 * Debounced writes: keystrokes update React state immediately, but the URL
 * is only updated after {debounceMs}ms of no further keystrokes. This prevents
 * one history entry per letter typed.
 *
 * Reads: return the URL value on initial mount. If the URL value changes
 * externally (browser back), React state follows.
 *
 * Empty string clears the parameter entirely (no ?q= in URL).
 */
export function useSearchQuery(options: UseSearchQueryOptions = {}): UseSearchQueryReturn {
  const { debounceMs = DEFAULT_DEBOUNCE_MS } = options
  const [searchParams, setSearchParams] = useSearchParams()
  const urlQuery = searchParams.get('q') ?? ''

  // React state mirrors URL for uncontrolled consumers
  const [localQuery, setLocalQuery] = useState(urlQuery)
  const lastWrittenRef = useRef(urlQuery)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // External URL changes (browser back/forward) overwrite local state
  useEffect(() => {
    if (urlQuery !== lastWrittenRef.current) {
      setLocalQuery(urlQuery)
      lastWrittenRef.current = urlQuery
    }
  }, [urlQuery])

  const setQuery = useCallback(
    (q: string) => {
      setLocalQuery(q)
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = setTimeout(() => {
        lastWrittenRef.current = q
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev)
            if (q === '') {
              next.delete('q')
            } else {
              next.set('q', q)
            }
            return next
          },
          { replace: false },
        )
      }, debounceMs)
    },
    [debounceMs, setSearchParams],
  )

  // Cleanup pending debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    }
  }, [])

  return { query: localQuery, setQuery }
}
```

`useMyBibleView.ts`:

```typescript
import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

export type MyBibleViewId = 'all' | 'highlights' | 'notes' | 'bookmarks' | 'daily-hub'

const VALID_VIEWS: readonly MyBibleViewId[] = ['all', 'highlights', 'notes', 'bookmarks', 'daily-hub']
const DEFAULT_VIEW: MyBibleViewId = 'all'

function isValidView(value: string | null): value is MyBibleViewId {
  return value !== null && (VALID_VIEWS as readonly string[]).includes(value)
}

interface UseMyBibleViewReturn {
  view: MyBibleViewId
  setView: (view: MyBibleViewId) => void
}

/**
 * Reads and writes the ?view= query parameter for My Bible section filtering.
 */
export function useMyBibleView(): UseMyBibleViewReturn {
  const [searchParams, setSearchParams] = useSearchParams()
  const raw = searchParams.get('view')
  const view: MyBibleViewId = isValidView(raw) ? raw : DEFAULT_VIEW

  const setView = useCallback(
    (nextView: MyBibleViewId) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (nextView === DEFAULT_VIEW) {
            // Omit ?view= for the default value to keep URLs clean
            next.delete('view')
          } else {
            next.set('view', nextView)
          }
          return next
        },
        { replace: false },
      )
    },
    [setSearchParams],
  )

  return { view, setView }
}
```

**Auth gating:** None.

**Responsive behavior:** N/A.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**

- Do NOT debounce `useDailyHubTab.setTab` — tab switching is a discrete user action, not a typing gesture. Each tab switch is one history entry.
- Do NOT debounce `useMyBibleView.setView` — same reason.
- Do debounce `useSearchQuery.setQuery` — typing keystrokes should produce one history entry per "settled" query, not per letter.
- Do NOT use `setSearchParams({ tab: nextTab })` in `useDailyHubTab` as a strict replacement without confirming it matches `DailyHub.tsx:114`. It does. Verified.
- Do NOT skip the `clearTimeout` cleanup in `useSearchQuery`'s unmount effect — leaked timers are a common bug source in hook code.
- Do NOT auto-delete the `?view=` param when setting it to `all` in `useMyBibleView` if the caller explicitly wants the param present. The current implementation always deletes it for the default — this is correct behavior (clean URLs), but must be documented in the hook comment so consumers don't get surprised.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `useDailyHubTab — reads each valid tab from URL` | unit | 4 assertions: `?tab=devotional`, `?tab=pray`, `?tab=journal`, `?tab=meditate` |
| `useDailyHubTab — defaults to devotional for missing param` | unit | No `?tab=`, assert `tab === 'devotional'` |
| `useDailyHubTab — defaults to devotional for invalid value` | unit | `?tab=invalid`, assert default |
| `useDailyHubTab — setTab writes and pushes history` | unit | Call `setTab('pray')`, assert URL and history length |
| `useDailyHubTab — setTab clears other search params` | unit | Start with `?tab=devotional&context=foo`, call `setTab('pray')`, assert `context` is gone (matches existing `DailyHub.tsx:114` behavior) |
| `useSearchQuery — initial URL query hydrates local state` | unit | `?q=love`, assert `query === 'love'` |
| `useSearchQuery — empty initial URL hydrates to empty string` | unit | No `?q=`, assert `query === ''` |
| `useSearchQuery — setQuery updates local state synchronously` | unit | Call `setQuery('test')`, assert `query === 'test'` immediately |
| `useSearchQuery — URL write is debounced` | unit | Use `vi.useFakeTimers()`, call `setQuery('a')` then `setQuery('ab')`, advance timer, assert URL is written once with `ab` |
| `useSearchQuery — empty string clears URL param` | unit | Start with `?q=love`, call `setQuery('')`, advance timer, assert `searchParams.get('q') === null` |
| `useSearchQuery — external URL change updates local state` | unit | Start with `?q=love`, then change URL to `?q=peace` via router navigation, assert local state follows |
| `useSearchQuery — unmount cancels pending debounce` | unit | Call `setQuery('a')`, unmount before timer fires, assert URL not written |
| `useMyBibleView — reads each valid view` | unit | 5 assertions |
| `useMyBibleView — defaults to all for missing param` | unit | |
| `useMyBibleView — defaults to all for invalid value` | unit | |
| `useMyBibleView — setView writes and pushes history` | unit | |
| `useMyBibleView — setView('all') deletes the param` | unit | Start with `?view=highlights`, call `setView('all')`, assert `searchParams.get('view') === null` |

Expected total: ~18 tests.

**Expected state after completion:**

- [ ] All three hooks exist under `frontend/src/hooks/url/`
- [ ] Tests pass
- [ ] TS strict + lint pass

---

### Step 4: Refactor `BibleReader.tsx` to use `useVerseSelection` + introduce `?scroll-to=` alongside `?highlight=` legacy alias

**Objective:** Wire the persistent `?verse=` selection state into `BibleReader.tsx`, rename the existing one-shot scroll-target from `?highlight=` to `?scroll-to=` with a legacy alias on the read path, and establish the React-state sheet-open rules so the action sheet behaves per the spec's edge cases. **This is the single riskiest step in the plan** because it inverts the `useVerseTap` internal state model.

**Files to modify:**

- `frontend/src/pages/BibleReader.tsx` (714+ lines) — add `useVerseSelection`, replace the `?highlight=` consumer block, wire the new `?scroll-to=` (with `?highlight=` legacy read), and thread `verseRange` into `useVerseTap`. The React sheet-open state becomes a derived `useState<boolean>` with URL-synchronized lifecycle (documented below).
- `frontend/src/hooks/useVerseTap.ts` (287 lines) — remove raw `history.pushState` / `popstate` / `history.back()` logic; accept `verseRange` from URL as an external prop and call `setVerse` / `clearVerse` instead of internal `setSelection` / `setIsSheetOpen`.
- `frontend/src/components/bible/reader/ReaderBody.tsx` line 31 — update comment to reference `?scroll-to=`.

**Details:**

**Part A — Refactor `BibleReader.tsx`'s `?highlight=` block (lines 284–338) to become `?scroll-to=` with legacy alias:**

Replace the block at lines 284–338 with:

```typescript
// Scroll to top on chapter change (skip when scroll-to param will handle scrolling)
const scrollToParamRef = useRef<string | null>(
  searchParams.get('scroll-to') ?? searchParams.get('highlight'),
)
useEffect(() => {
  if (scrollToParamRef.current) {
    scrollToParamRef.current = null
    return
  }
  window.scrollTo({ top: 0 })
}, [bookSlug, chapterNumber])

// ?scroll-to= / ?highlight= (legacy) param processing: one-shot scroll + arrival glow
useEffect(() => {
  if (isLoading || loadError || verses.length === 0) return

  // Read scroll-to first, fall back to legacy highlight for backward compatibility
  const scrollToParam = searchParams.get('scroll-to') ?? searchParams.get('highlight')
  if (!scrollToParam) return

  // Parse single verse or range: "16" or "1-3"
  let startVerse: number
  let endVerse: number
  if (scrollToParam.includes('-')) {
    const parts = scrollToParam.split('-')
    startVerse = parseInt(parts[0], 10)
    endVerse = parseInt(parts[1], 10)
  } else {
    startVerse = parseInt(scrollToParam, 10)
    endVerse = startVerse
  }

  // Ignore invalid values — delete BOTH legacy and new param names
  if (isNaN(startVerse) || isNaN(endVerse) || startVerse < 1 || endVerse < startVerse) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete('scroll-to')
        next.delete('highlight')
        return next
      },
      { replace: true },
    )
    return
  }

  // Build the list of verse numbers to highlight
  const verseNums: number[] = []
  for (let v = startVerse; v <= endVerse; v++) verseNums.push(v)
  setArrivalHighlightVerses(verseNums)

  // Scroll to the first verse
  const el = document.querySelector(`[data-verse="${startVerse}"]`)
  if (el) {
    el.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center' })
  }

  // Clear BOTH the scroll-to and legacy highlight params from the URL
  setSearchParams(
    (prev) => {
      const next = new URLSearchParams(prev)
      next.delete('scroll-to')
      next.delete('highlight')
      return next
    },
    { replace: true },
  )

  // Fade out glow after 1.5s
  arrivalHighlightTimerRef.current = setTimeout(() => {
    setArrivalHighlightVerses([])
    arrivalHighlightTimerRef.current = null
  }, 1500)
}, [isLoading, loadError, verses.length, searchParams, setSearchParams, reducedMotion])
```

All existing test assertions on the behavior (scroll-into-view, arrival glow, 1.5s fade) remain unchanged because the effect's behavior is identical — only the parameter name read changes.

**Part B — Add `useVerseSelection` and wire persistent verse state:**

At the top of `BibleReaderInner`, after `const [searchParams, setSearchParams] = useSearchParams()` (line 68), add:

```typescript
import { useVerseSelection } from '@/hooks/url/useVerseSelection'
import { useActionSheetState } from '@/hooks/url/useActionSheetState'
// ... existing imports ...

const { verseRange, setVerse, clearVerse } = useVerseSelection()
const { action, clearAction } = useActionSheetState()
```

**Part C — Refactor `useVerseTap` to accept `verseRange` from URL and call back instead of owning state:**

The hook is refactored to:
1. Accept a new `verseRange: VerseRange | null` prop (URL-derived) — replaces internal `selection` state
2. Accept `onVerseTap: (verseNumber: number) => void` callback — called on tap instead of internal `setSelection`
3. Accept `onExtendSelection: (verseNumber: number) => void` callback — called on multi-tap
4. Remove the internal `selection`, `isSheetOpen`, `historyPushed`, `navigatingRef` state
5. Remove raw `history.pushState({ verseSheet: true })` (line 99)
6. Remove `history.back()` call on close (line 118)
7. Remove the `popstate` listener (lines 254–268)
8. Remove the chapter-change `history.back()` cleanup (lines 274–284)
9. Expose `buildSelection(verseRange, verses)` as a helper that the consumer calls to turn the URL range into a full `VerseSelection` object

**New `useVerseTap.ts` signature:**

```typescript
interface UseVerseTapOptions {
  containerRef: React.RefObject<HTMLElement | null>
  bookSlug: string
  bookName: string
  chapter: number
  verses: BibleVerse[]
  enabled: boolean
  /** URL-derived verse range (null when no selection). BB-38. */
  verseRange: VerseRange | null
  /** Called when the user taps a verse. BB-38 replaces internal setSelection. */
  onVerseTap: (verseNumber: number) => void
  /** Called when the user taps to extend an existing selection. */
  onExtendSelection: (newStart: number, newEnd: number) => void
}

interface UseVerseTapReturn {
  /** Full VerseSelection object derived from verseRange + verses list, or null. */
  selection: VerseSelection | null
}

export function useVerseTap(options: UseVerseTapOptions): UseVerseTapReturn {
  const { containerRef, bookSlug, bookName, chapter, verses, enabled, verseRange, onVerseTap, onExtendSelection } = options

  // Derive the full VerseSelection from the URL range + current verses
  const selection: VerseSelection | null = useMemo(() => {
    if (!verseRange) return null
    return buildSelection(bookSlug, bookName, chapter, verseRange.start, verseRange.end, verses)
  }, [verseRange, bookSlug, bookName, chapter, verses])

  // Pointer event handlers — unchanged except they call onVerseTap/onExtendSelection
  useEffect(() => {
    const container = containerRef.current
    if (!container || !enabled) return

    // ... existing long-press timer, quick-tap detection, etc. ...

    const handlePointerUp = (e: PointerEvent) => {
      // ... existing code to find verse span ...
      const verseNumber = parseVerseNumber(verseSpan)

      if (verseRange) {
        // Sheet already open — extend/modify selection
        // Compute new range based on current verseRange + tapped verseNumber
        // (matches the existing shrink/expand logic in the current extendSelection)
        const newRange = computeExtendedRange(verseRange, verseNumber)
        onExtendSelection(newRange.start, newRange.end)
      } else {
        onVerseTap(verseNumber)
      }
    }

    // ... rest of existing pointer handlers ...
  }, [containerRef, enabled, verseRange, onVerseTap, onExtendSelection])

  // NO popstate listener.
  // NO chapter-change history.back() cleanup.
  // NO manual history.pushState.
  // URL-driven history is managed entirely by setVerse/clearVerse in the consumer.

  return { selection }
}

/**
 * Pure helper: given a current range and a newly-tapped verse, compute the extended range.
 * Mirrors the existing extendSelection shrink/expand logic.
 */
function computeExtendedRange(range: VerseRange, verseNumber: number): VerseRange {
  // If verse is at an edge and range > 1, shrink
  if (range.start !== range.end) {
    if (verseNumber === range.start) return { start: range.start + 1, end: range.end }
    if (verseNumber === range.end) return { start: range.start, end: range.end - 1 }
  }
  // Expand range to include the new verse
  return {
    start: Math.min(range.start, verseNumber),
    end: Math.max(range.end, verseNumber),
  }
}
```

**Part D — React sheet-open state rules in `BibleReader.tsx`:**

Replace the `useVerseTap` call in `BibleReader.tsx` with the new signature, and add a React `useState` for sheet openness:

```typescript
// Sheet-open state is React-owned but URL-synchronized per BB-38 rules.
// RULE 1: On mount, sheetOpen = true IFF URL has a valid action (cold-load sub-view).
// RULE 2: On interactive tap, setSheetOpen(true) AND call setVerse(v).
// RULE 3: When URL loses ?verse=, setSheetOpen(false) (handles browser back to bare chapter).
// RULE 4: On close button, setSheetOpen(false) AND call clearVerse() (which also clears action).
// RULE 5: On sub-view close (back arrow inside the sheet), call clearAction(). Sheet stays open.
const [sheetOpen, setSheetOpen] = useState(() => !!validateAction(searchParams.get('action')))

// Rule 3: URL-change watcher — if verse param goes away, close sheet.
useEffect(() => {
  if (!verseRange) {
    setSheetOpen(false)
  }
}, [verseRange])

// Rule 1 (redux): Cold-load with action also opens sheet. Already covered by useState initializer,
// but if the user navigates between chapters in the same reader session and the new chapter URL
// has ?action=, we need to re-open. Add a watcher:
useEffect(() => {
  if (action) setSheetOpen(true)
}, [action])

// Interactive handlers for useVerseTap:
const handleVerseTap = useCallback(
  (verseNumber: number) => {
    setVerse(verseNumber) // pushes ?verse=N
    setSheetOpen(true)    // Rule 2
  },
  [setVerse],
)

const handleExtendSelection = useCallback(
  (newStart: number, newEnd: number) => {
    setVerse(newStart, newEnd) // pushes ?verse=N-M
    // sheetOpen remains true
  },
  [setVerse],
)

// useVerseTap call:
const { selection } = useVerseTap({
  containerRef: readerBodyRef,
  bookSlug: bookSlug ?? '',
  bookName: book?.name ?? '',
  chapter: chapterNumber,
  verses,
  enabled: !isLoading && !loadError && verses.length > 0,
  verseRange,
  onVerseTap: handleVerseTap,
  onExtendSelection: handleExtendSelection,
})

// Sheet close handler — clears URL verse (and action) and closes sheet
const handleCloseSheet = useCallback(
  (options?: { navigating?: boolean }) => {
    setSheetOpen(false)
    if (!options?.navigating) {
      clearVerse() // Rule 4: pushes URL with no verse/action
    }
    // When navigating (cross-ref click that routes away), the navigate call handles URL change
  },
  [clearVerse],
)
```

**Part E — Wire the sheet-open state to the `<VerseActionSheet>` prop:**

In the JSX where `<VerseActionSheet>` is rendered (locate via grep — approximately lines 620–650), change `isOpen={isSheetOpen}` to `isOpen={sheetOpen}` and `onClose={closeSheet}` to `onClose={handleCloseSheet}`. Selection prop stays — now derived from `useVerseTap`.

**Part F — Update comment in `ReaderBody.tsx` line 31:**

Change:
```typescript
/** Verse numbers glowing from ?highlight= arrival (VOTD "Read in context") */
```

to:
```typescript
/** Verse numbers glowing from ?scroll-to= arrival (VOTD "Read in context" and similar one-shot scroll targets) */
```

**Auth gating:** None. No new `useAuth` imports. Verified.

**Responsive behavior:** N/A: no UI changes. The scroll-into-view logic is unchanged except for the parameter name it reads.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**

- Do NOT delete the `?scroll-to=` parameter via a plain `setSearchParams(next => ...)` without `{ replace: true }`. The one-shot param consumption is an automatic state correction, not a user-initiated change — it must be replace, not push. (This matches the existing behavior at line 315 which uses `{ replace: true }`.)
- Do NOT delete the legacy `?highlight=` param on URLs that happen to have BOTH `?scroll-to=` and `?highlight=`. The reader's consumer reads whichever is present (priority: `scroll-to` first) and deletes both in the cleanup. The one-shot consumer sees them as equivalent.
- Do NOT retain raw `history.pushState({ verseSheet: true })` anywhere — the entire mechanism is replaced by URL-driven history pushed via `setVerse` / `setAction` / `clearVerse` / `clearAction`.
- Do NOT retain the `popstate` listener in `useVerseTap` — React Router's own internal `popstate` handling drives `useSearchParams`, which drives the URL-change effect in `BibleReader.tsx` (Rule 3 above), which drives `setSheetOpen(false)`.
- Do NOT retain the chapter-change `history.back()` call in `useVerseTap` — chapter navigation is a React Router route change; React Router handles the history entry correctly. The reset-on-chapter-change effect can still `setSheetOpen(false)` if desired, but it must NOT call `history.back()`.
- Do NOT call `setSearchParams` inside `useVerseTap` — the hook is now a pure event handler + state derivation. All URL writes go through the callbacks the consumer provides.
- Do NOT couple `sheetOpen` state to `verseRange` as a derived value (`const sheetOpen = !!verseRange`). This breaks the spec's requirement that cold-load `?verse=16` does NOT auto-open the sheet. `sheetOpen` must remain React-owned state with the 5 lifecycle rules.
- Do NOT introduce a loading skeleton specific to deep-link restoration. The existing `BibleReaderSkeleton` route-level Suspense fallback is sufficient.
- Do NOT touch the `?highlight=` comment at line 31 of `ReaderBody.tsx` AND leave any other `highlight` references intact in that file — verify with grep that line 31 is the only reference.

**Test compatibility updates (required — NOT regressions):**

`useVerseTap.test.ts` EXISTS (290 lines, 11 tests). Verified by recon. The file asserts directly on the hook's current API surface which BB-38 rewrites entirely. The rewrite is NOT optional — continuing to test the old API would produce false-positive passing tests against a dead code path.

Current API surface the tests rely on (verified via grep):

- `result.current.selection` — getter, 7+ references across tests
- `result.current.isSheetOpen` — getter, 10+ references (lines 110, 121, 141, 157, 175, 200, 232, 250, 257, 269, 280, 287)
- `result.current.closeSheet()` — method call at line 253
- `result.current.extendSelection(18)` — method call at line 215
- `vi.spyOn(history, 'pushState')` at line 97 and `vi.spyOn(history, 'back')` at line 98 — mocks that become unused after BB-38 removes the raw history API calls

After BB-38, the hook's return type shrinks from `{ selection, isSheetOpen, closeSheet, extendSelection }` to just `{ selection }`. The sheet-open state, close action, and extend action move out of the hook entirely — they live as React state + URL writes in `BibleReader.tsx`.

**Per-test disposition:**

| # | Current test name | Line | Disposition | Notes |
|---|-------------------|------|-------------|-------|
| 1 | `returns null selection initially` | 107 | **Rewrite** | Rewrite to pass `verseRange: null` and assert `result.current.selection === null`. Drop the `isSheetOpen` assertion — that property no longer exists. |
| 2 | `quick tap on verse opens sheet` | 113 | **Rewrite** | Rename to `quick tap on verse calls onVerseTap with verse number`. Pass an `onVerseTap: vi.fn()` in options, simulate tap, assert the spy was called with `16`. Drop `isSheetOpen`/`selection` assertions (those behaviors move to the consumer). |
| 3 | `tap on non-verse element is no-op` | 128 | **Rewrite** | Keep the same pointer simulation; assert that `onVerseTap` was NOT called. Drop `isSheetOpen` assertion. |
| 4 | `tap with text selection is no-op` | 144 | **Rewrite** | Same pattern — assert `onVerseTap` not called. |
| 5 | `long press opens sheet` | 160 | **Rewrite** | Rename to `long press calls onVerseTap`. Assert the spy fires after the long-press delay. |
| 6 | `long press cancelled by movement` | 179 | **Rewrite** | Assert `onVerseTap` NOT called when pointer moves beyond threshold. |
| 7 | `multi-verse extends range` | 203 | **Rewrite** | Rename to `tap on second verse calls onExtendSelection with new range`. Pass `verseRange: { start: 16, end: 16 }`, simulate tap on verse 18, assert `onExtendSelection` spy called with `(16, 18)`. The imperative `result.current.extendSelection(18)` call path is removed (no longer exposed). |
| 8 | `shift+click extends range` | 223 | **Rewrite** | Same pattern — `verseRange` is passed as prop (simulating already-selected state), subsequent tap fires `onExtendSelection`. Drop `isSheetOpen` assertion. |
| 9 | `closeSheet clears selection` | 242 | **Remove** | The `closeSheet()` method no longer exists on the hook — it moves to `handleCloseSheet` in `BibleReader.tsx`. This behavior is tested in Step 10's `BibleReader.deeplink.test.tsx` under "closing the sheet clears verse selection from URL". |
| 10 | `does not fire when disabled` | 260 | **Rewrite** | Keep `enabled: false`, simulate tap, assert `onVerseTap` spy NOT called. |
| 11 | `browser back closes sheet` | 272 | **Remove** | The `popstate` listener is removed from the hook. Browser back is now handled by React Router's URL change, which triggers the `BibleReader.tsx` URL-change effect (Rule 3). This behavior is tested in Step 10's `BibleReader.deeplink.test.tsx` under "browser back from ?verse=16&action=explain removes action, sheet stays open". |

**New tests added (hook-level, to cover the new derivation logic):**

| New test | Description |
|----------|-------------|
| `selection is derived from verseRange prop + verses list` | Pass `verseRange: { start: 16, end: 18 }` + `verses` containing 16/17/18, assert `result.current.selection` has `startVerse: 16`, `endVerse: 18`, `verses.length === 3`. |
| `selection is null when verseRange is null` | Pass `verseRange: null`, assert `result.current.selection === null`. |
| `selection updates when verseRange prop changes` | Rerender with a new `verseRange`, assert `result.current.selection` reflects the new range. |
| `computeExtendedRange pure helper — shrink from start` | Internal helper test: verseRange `{16, 18}` + tap on 16 → `{17, 18}`. |
| `computeExtendedRange pure helper — shrink from end` | verseRange `{16, 18}` + tap on 18 → `{16, 17}`. |
| `computeExtendedRange pure helper — expand up` | verseRange `{16, 16}` + tap on 20 → `{16, 20}`. |
| `computeExtendedRange pure helper — expand down` | verseRange `{16, 16}` + tap on 14 → `{14, 16}`. |

**Mock cleanup:** Remove the `vi.spyOn(history, 'pushState')` and `vi.spyOn(history, 'back')` mocks from `beforeEach` (lines 97-98). They are unused after the rewrite.

**Helper update:** Rename `defaultOptions` to include the new props:

```typescript
function defaultOptions(container: HTMLDivElement, overrides: Partial<UseVerseTapOptions> = {}) {
  return {
    containerRef: { current: container },
    bookSlug: 'john',
    bookName: 'John',
    chapter: 3,
    verses: TEST_VERSES,
    enabled: true,
    verseRange: null,             // BB-38
    onVerseTap: vi.fn(),           // BB-38
    onExtendSelection: vi.fn(),    // BB-38
    ...overrides,
  }
}
```

Individual tests that need to observe callback firings do `const onVerseTap = vi.fn()` locally and pass it via `defaultOptions(container, { onVerseTap })`.

**Total test count after rewrite:** 11 existing → 9 rewritten + 2 removed (9) + 7 new = **16 tests** in `useVerseTap.test.ts`.

**Test specifications (existing + new):**

| Test | Type | Description |
|------|------|-------------|
| Existing `BibleReader.test.tsx` cases | integration | **All existing tests must continue to pass unchanged.** BB-38 does not break any pre-existing reader test. |
| `reads ?verse=16 and selects verse 16 on mount` | integration | Mount `<MemoryRouter initialEntries={['/bible/john/3?verse=16']}>`, assert `data-verse="16"` has the selected styling |
| `reads ?verse=16-18 and selects range` | integration | Same pattern, assert all three verses have selection styling |
| `cold-load ?verse=16 does NOT open the action sheet` | integration | Mount with `?verse=16`, assert action sheet is NOT in the DOM (sheet closed per spec rule) |
| `cold-load ?verse=16&action=explain opens the sheet with Explain sub-view mounted` | integration | Mount, assert sheet is present AND Explain sub-view is mounted AND `useExplainPassage` hook has fired (check for loading state or mocked response) |
| `tap verse 16 writes ?verse=16 to URL AND opens sheet` | integration | Simulate pointer tap on `[data-verse="16"]`, assert `searchParams.get('verse') === '16'` AND sheet is open |
| `close sheet clears ?verse= from URL` | integration | Open sheet via tap, close via X button, assert `searchParams.get('verse') === null` |
| `browser back from ?verse=16&action=explain removes action, sheet stays open, sub-view unmounts` | integration | Simulate back via router, assert sheet present but sub-view gone and URL is `?verse=16` |
| `browser back from ?verse=16 removes verse, sheet closes` | integration | Simulate another back, assert sheet closed and URL clean |
| `invalid ?verse=999 loads chapter with no selection` | integration | Assert no selection styling, no crash |
| `invalid ?verse=abc loads chapter with no selection` | integration | Same |
| `?verse=33-100 (range extends beyond chapter) loads with no selection` | integration | BB-38 treats as invalid; no selection |
| `?action=explain without ?verse= is ignored on mount` | integration | Sheet does NOT open (rule: action without verse is meaningless) |
| `?action=invalidaction loads chapter with verse selected, sheet closed` | integration | verseRange applied; action rejected |
| `legacy ?highlight=16 still triggers one-shot scroll + arrival glow` | integration | Mount with `?highlight=16`, assert verse 16 has arrival-glow class (via the existing arrival highlight mechanism), assert `?highlight=` is deleted after consumption |
| `new ?scroll-to=16 triggers one-shot scroll + arrival glow` | integration | Same behavior as `?highlight=` |
| `?verse=16&scroll-to=16 preserves verse and consumes scroll-to` | integration | After mount, URL is `?verse=16` (scroll-to deleted, verse retained) |
| `chapter change clears sheet state` | integration | Open sheet on John 3, navigate to John 4, sheet is closed, `?verse=` removed |
| `useVerseTap — no raw history.pushState anywhere` | smoke | grep the final diff; assert no `history.pushState` in any file under `frontend/src/hooks/` or `frontend/src/pages/BibleReader.tsx` |

Expected total: 17+ new integration tests in `BibleReader.deeplink.test.tsx` (Step 13 consolidates these), plus existing tests preserved.

**Expected state after completion:**

- [ ] `BibleReader.tsx` consumes `useVerseSelection` + `useActionSheetState`
- [ ] `useVerseTap.ts` is refactored — raw `history.pushState`/`popstate`/`history.back()` all removed; accepts URL-derived `verseRange` and callbacks
- [ ] `?highlight=` and `?scroll-to=` both trigger the same one-shot scroll effect
- [ ] React sheet-open state follows the 5 lifecycle rules
- [ ] `ReaderBody.tsx:31` comment updated
- [ ] All existing `BibleReader.test.tsx`, `useVerseTap.test.ts` (if exists), and related tests pass unchanged
- [ ] New deep-link integration tests pass (consolidated in Step 13)
- [ ] `pnpm lint` + TS strict pass

---

### Step 5: Refactor `VerseActionSheet.tsx` to consume `?action=` from props instead of internal state

**Objective:** Convert the sub-view mount state from internal `useState<{action, handler} | null>` to a prop-driven model. The parent `BibleReader.tsx` sources the action from `useActionSheetState()` and passes it as a prop. Opening a sub-view becomes a prop change driven by URL write.

**Files to modify:**

- `frontend/src/components/bible/reader/VerseActionSheet.tsx`

**Details:**

Add two new optional props to `VerseActionSheetProps`:

```typescript
interface VerseActionSheetProps {
  selection: VerseSelection
  isOpen: boolean
  onClose: (options?: { navigating?: boolean }) => void
  onExtendSelection: (verseNumber: number) => void
  /** URL-derived sub-view action (BB-38). When present, the sheet mounts the matching sub-view. */
  action: VerseAction | null
  /** Called when the user opens a sub-view via an action button tap. Writes ?action= to URL. */
  onOpenAction: (action: VerseAction) => void
  /** Called when the user dismisses a sub-view via back arrow. Removes ?action= from URL. */
  onCloseAction: () => void
}
```

Replace the internal `const [subView, setSubView] = useState<{action, handler} | null>(null)` at line 53 with:

```typescript
// Sub-view state is derived from the `action` prop (BB-38).
// When action is a valid VerseAction with a sub-view handler, the sub-view mounts.
const subViewHandler = useMemo(() => {
  if (!action) return null
  const handler = getActionByType(action)
  if (!handler || !handler.hasSubView) return null
  return handler
}, [action])
```

Replace the `handleActionClick` callback at line 172 with:

```typescript
const handleActionClick = useCallback(
  (handler: VerseActionHandler, triggerButton: HTMLButtonElement | null) => {
    if (handler.hasSubView) {
      subViewTriggerRef.current = triggerButton
      onOpenAction(handler.action) // writes ?action= to URL; sub-view mounts via the `action` prop
      setAnnounceText(handler.label)
    } else {
      handler.onInvoke(selection, {
        showToast: forwardShowToast,
        closeSheet: onClose,
        navigate: (url) => routerNavigate(url),
      })
    }
  },
  [selection, forwardShowToast, onClose, routerNavigate, onOpenAction],
)
```

Replace the `handleSubViewBack` callback at line 189 with:

```typescript
const handleSubViewBack = useCallback(() => {
  onCloseAction() // removes ?action= from URL; sub-view unmounts via the `action` prop
  requestAnimationFrame(() => {
    subViewTriggerRef.current?.focus()
  })
}, [onCloseAction])
```

Replace the `handleEscape` callback at line 92 with:

```typescript
const handleEscape = useCallback(() => {
  if (subViewHandler) {
    onCloseAction()
  } else {
    onClose()
  }
}, [subViewHandler, onCloseAction, onClose])
```

Replace the JSX references to `subView` at lines 295, 308, 315 with references to `subViewHandler`:

```typescript
{subViewHandler ? (
  // ... header with subViewHandler.label ...
  // ... subViewHandler.renderSubView?.(...) ...
) : (
  // ... actions grid ...
)}
```

Similarly the `subView` reference in the `useEffect` dependencies at line 166 becomes `subViewHandler`.

Update `BibleReader.tsx` to pass the new props:

```typescript
<VerseActionSheet
  selection={selection!}
  isOpen={sheetOpen}
  onClose={handleCloseSheet}
  onExtendSelection={handleExtendSelectionForSheet}
  action={action}                // from useActionSheetState
  onOpenAction={setAction}        // from useActionSheetState
  onCloseAction={clearAction}     // from useActionSheetState
/>
```

**Auth gating:** None. The sheet itself doesn't gate; existing sub-views continue to gate their own write paths (note editor, highlight picker save flows).

**Responsive behavior:** N/A: no UI changes. Sheet rendering is unchanged.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**

- Do NOT retain the `useState<{action, handler} | null>` internal state — it must be fully replaced by `useMemo` derivation from the `action` prop. Dual sources of truth would cause desync.
- Do NOT auto-close the sheet when `action` becomes null via prop change. The sheet's `isOpen` is controlled by the parent — only the sub-view panel inside unmounts when action clears. Sheet-level open/close is driven by `sheetOpen` state in the parent (Step 4).
- Do NOT lose the `subViewTriggerRef` focus restore behavior. It's still needed for accessibility.
- Do NOT skip updating the `useEffect` dependency array (line 166) — if `subView` is referenced there, it must become `subViewHandler`.
- Do NOT touch `handleActionClick`'s fall-through `else` branch that calls `handler.onInvoke(...)` for non-sub-view actions (bookmark toggle, pray/journal/meditate navigate-away, copy). That path is unchanged.
- Do NOT add any new auth imports.

**Test compatibility updates (required — NOT regressions):**

Four existing test files render `VerseActionSheet` and must be updated to pass the new props. Three of them also click action buttons to exercise sub-view mounting — clicking now fires `onOpenAction(action)` instead of internally calling `setSubView`, so a plain `vi.fn()` spy won't cause the sub-view to mount. All four files need a **stateful render wrapper** that tracks the `action` prop locally and threads `onOpenAction`/`onCloseAction` into `setState` calls.

**Canonical stateful render wrapper** (to be added to each of the four test files — or extracted into a shared test helper if lint allows):

```typescript
import { useState } from 'react'
import type { VerseAction } from '@/types/verse-actions'

function SheetWithState(props: {
  selection: VerseSelection
  isOpen?: boolean
  initialAction?: VerseAction | null
  onClose?: (options?: { navigating?: boolean }) => void
  onExtendSelection?: (verseNumber: number) => void
}) {
  const [action, setAction] = useState<VerseAction | null>(props.initialAction ?? null)
  return (
    <VerseActionSheet
      selection={props.selection}
      isOpen={props.isOpen ?? true}
      onClose={props.onClose ?? vi.fn()}
      onExtendSelection={props.onExtendSelection ?? vi.fn()}
      action={action}
      onOpenAction={setAction}
      onCloseAction={() => setAction(null)}
    />
  )
}
```

This wrapper preserves the test's ability to click an action button and see the sub-view mount. The internal `useState` mirrors what `BibleReader.tsx` does in production — it's a faithful test double, not a hack.

**Per-file enumeration:**

| File | Existing tests | Render call sites | Change | Test bodies change? |
|------|---------------|-------------------|--------|---------------------|
| `VerseActionSheet.test.tsx` | 16 | 16 inline `render(<VerseActionSheet {...defaultProps} />)` at lines 103, 108, 113, 121, 133, 140, 148, 155, 167, 173, 180, 188, 193, 200, 205, 216 (verified by grep). `defaultProps` defined at line 83. | (a) Update `defaultProps` at line 83 to include `action: null, onOpenAction: vi.fn(), onCloseAction: vi.fn()` as defaults. (b) Convert the 16 inline render calls to use a `renderSheet()` helper that wraps `<VerseActionSheet>` in the stateful `SheetWithState` component. The `defaultProps` helper is consumed by `SheetWithState` for the non-action props. (c) The test at line 200 passes `isOpen={false}` via prop override — the helper must accept that override. | **No.** Assertions, click handlers, and expectations are byte-unchanged. |
| `VerseActionSheet.a11y.test.tsx` | 10 | 1 helper `renderSheet(props = defaultProps)` at line 63, wrapping `<VerseActionSheet>` in `<MemoryRouter>`. Called by 10 tests. | Update `renderSheet` to also wrap in `SheetWithState`. Update `defaultProps` at line 56 to include the three new props as defaults. | **No.** |
| `VerseActionSheet.explain.test.tsx` | 7 | 1 helper `renderSheet(selection = SELECTION)` at line 72, inlines the JSX (no `defaultProps` object). Called by 7 tests. Every test clicks `screen.getByRole('button', { name: /explain this passage/i })` to mount the sub-view. | Replace the helper's inline JSX with `<SheetWithState selection={selection} />`. After the click fires `onOpenAction('explain')`, the wrapper's `useState` updates, `action` prop becomes `'explain'`, and `ExplainSubView` mounts via the new `useMemo` derivation in Step 5's main refactor. Behavior is externally identical to pre-BB-38 — the click still mounts the sub-view. | **No.** |
| `VerseActionSheet.reflect.test.tsx` | 10 | 1 helper `renderSheet(selection = SELECTION)` at line 77, same pattern as explain. Every test clicks `screen.getByRole('button', { name: /reflect on this passage/i })`. | Same as explain — swap inline JSX for `<SheetWithState selection={selection} />`. | **No.** |

**Total: 4 files, 19 render call sites updated (16 inline + 3 helper functions), 43 existing tests preserved (bodies unchanged), zero test removals.**

**Verification approach:** After the rewrite, run each test file in isolation:

```
pnpm test frontend/src/components/bible/reader/__tests__/VerseActionSheet.test.tsx
pnpm test frontend/src/components/bible/reader/__tests__/VerseActionSheet.a11y.test.tsx
pnpm test frontend/src/components/bible/reader/__tests__/VerseActionSheet.explain.test.tsx
pnpm test frontend/src/components/bible/reader/__tests__/VerseActionSheet.reflect.test.tsx
```

Expected: all 43 existing tests pass. If any test FAILS with an assertion error (not a compile/TypeScript error), that's a behavior change — pause and investigate. If any test fails with a TypeScript error about missing `action`/`onOpenAction`/`onCloseAction` props, that means the update missed a render call site — grep for `<VerseActionSheet` to find it.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Existing `VerseActionSheet.test.tsx` cases (16) | unit/integration | **All 16 existing tests must pass after the render-site updates.** Test bodies are byte-unchanged; only the render setup is updated per the table above. |
| Existing `VerseActionSheet.a11y.test.tsx` cases (10) | unit | **All 10 existing accessibility tests must pass after `renderSheet` helper updates.** |
| Existing `VerseActionSheet.explain.test.tsx` cases (7) | unit | **All 7 existing tests must pass after `renderSheet` helper updates.** The click-Explain-button flow now traverses `onOpenAction` → wrapper `setState` → `action` prop → `useMemo` → sub-view mount, producing externally identical behavior. |
| Existing `VerseActionSheet.reflect.test.tsx` cases (10) | unit | **All 10 existing tests must pass after `renderSheet` helper updates.** |
| `mounts Explain sub-view when action='explain' prop is passed` | unit | Render with `action='explain'`, assert `ExplainSubView` is in the DOM |
| `mounts Reflect sub-view when action='reflect'` | unit | |
| `mounts CrossRefs sub-view when action='cross-refs'` | unit | |
| `mounts NoteEditor sub-view when action='note'` | unit | |
| `mounts HighlightColorPicker sub-view when action='highlight'` | unit | |
| `mounts Share sub-view when action='share'` | unit | |
| `mounts Memorize stub sub-view when action='memorize'` | unit | |
| `mounts no sub-view when action=null` | unit | Actions grid visible, no sub-view |
| `mounts no sub-view when action='bookmark' (not deep-linkable)` | unit | Bookmark has no sub-view; prop-based mount must respect `hasSubView: false` |
| `mounts no sub-view when action='pray' (navigate-away action)` | unit | Actions grid visible |
| `tapping an action button with sub-view calls onOpenAction with the action name` | unit | Click Explain button, assert `onOpenAction` spy called with `'explain'` |
| `tapping an action button without sub-view calls handler.onInvoke` | unit | Click Bookmark, assert `onOpenAction` NOT called, internal handler fires |
| `tapping the sub-view back arrow calls onCloseAction` | unit | With action='explain' prop, click back arrow, assert `onCloseAction` called |
| `Escape key pops sub-view via onCloseAction when sub-view is open` | unit | Render with action='explain', press Escape, assert `onCloseAction` called (not `onClose`) |
| `Escape key closes sheet via onClose when no sub-view is open` | unit | Render with action=null, press Escape, assert `onClose` called |

Expected total: 14+ new tests, existing tests preserved.

**Expected state after completion:**

- [ ] `VerseActionSheet.tsx` has prop-driven sub-view state via `useMemo` on `action`
- [ ] Internal `useState` for `subView` is gone
- [ ] `onOpenAction`, `onCloseAction` props are wired up
- [ ] All existing tests pass
- [ ] New tests pass
- [ ] TS strict + lint pass

---

### Step 6: Refactor `DailyHub.tsx` to use `useDailyHubTab` hook

**Objective:** Mechanical extraction — replace the inline `useSearchParams` + `searchParams.get('tab')` + `isValidTab()` pattern with `useDailyHubTab()`. Behavior is identical.

**Files to modify:**

- `frontend/src/pages/DailyHub.tsx`

**Details:**

Add import:

```typescript
import { useDailyHubTab, type DailyHubTab } from '@/hooks/url/useDailyHubTab'
```

Replace lines 55–57:

```typescript
// Before:
const [searchParams, setSearchParams] = useSearchParams()
const rawTab = searchParams.get('tab')
const activeTab: TabId = isValidTab(rawTab) ? rawTab : 'devotional'

// After:
const [searchParams, setSearchParams] = useSearchParams() // KEEP — still needed for context/prompt/verseRef etc.
const { tab: activeTab, setTab } = useDailyHubTab()
```

Replace `setSearchParams({ tab })` calls at lines 114, 122, 130, 138 with `setTab(tab)` / `setTab('pray')` / `setTab('journal')` as appropriate. The existing `setSearchParams({ tab: activeTab }, { replace: true })` at line 88 (cross-feature context cleanup) remains unchanged because it's a replace-not-push operation that clears OTHER params beyond just tab, and is not part of the new hook's contract.

Keep the existing `isValidTab` function if it's defined in `DailyHub.tsx` and delete it (hook handles validation internally). If it's imported from another file, leave that file alone.

**Auth gating:** None.

**Responsive behavior:** N/A: no UI changes.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**

- Do NOT remove the existing `useSearchParams` import — it's still needed for reading/writing `context`, `prompt`, `verseRef`, `verseText`, `verseTheme`. Only the tab-specific reads/writes change.
- Do NOT change the tab-switch cleanup at lines 88 and 114 that clears cross-feature params. The new `setTab` hook writes `{ tab }` (which matches the existing behavior) — but the line 88 `setSearchParams({ tab: activeTab }, { replace: true })` uses `replace: true` whereas `setTab` uses push. Line 88 must remain as `setSearchParams` (not `setTab`) because it's a one-time mount-effect cleanup, not a user-initiated tab switch.
- Do NOT add `setTab` calls inside the `useEffect` at line 83–90 — that effect consumes cross-feature URL params on mount and MUST use `setSearchParams({ tab: activeTab }, { replace: true })` with replace semantics.
- Do NOT touch the `switchTab`, `handleSwitchToJournal`, `handleSwitchToDevotionalJournal`, `handleSwitchToDevotionalPray` callbacks beyond the `setSearchParams` → `setTab` swap. Their other logic (setting `prayContext`) is unchanged.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Existing `DailyHub.test.tsx` tests | integration | **All existing tests pass unchanged.** BB-38 is a mechanical refactor. |
| `/daily?tab=pray cold-loads on Pray tab` | integration | Existing test — verified still passing |
| `switching tab updates URL` | integration | Click Journal tab, assert `searchParams.get('tab') === 'journal'` |
| `switching tab clears cross-feature context params` | integration | Start with `/daily?tab=devotional&context=foo`, switch to Pray, assert `context` is gone |

No new tests needed beyond verifying existing behavior is preserved. The hook itself is tested in Step 3.

**Expected state after completion:**

- [ ] `DailyHub.tsx` imports and uses `useDailyHubTab`
- [ ] `setTab` replaces user-initiated `setSearchParams({ tab })` calls
- [ ] The mount-effect cross-feature cleanup at line 88 is unchanged
- [ ] All existing DailyHub tests pass
- [ ] TS + lint pass

---

### Step 7: Wire `useSearchQuery` into `BibleBrowser` + `BibleSearchMode` + add `?mode=search` support

**Objective:** Make the search query deep-linkable via `/bible?mode=search&q=<query>`. Convert `BibleSearchMode` from an uncontrolled component (owning query state via `useBibleSearch`) to a controlled component that receives `query` and `onQueryChange` as props. The parent `BibleBrowser` owns the query via `useSearchQuery` and the mode via a new URL param `?mode=`. Add a redirect route for the legacy `/bible/search` path.

**Files to modify:**

- `frontend/src/pages/BibleBrowser.tsx` — source `mode` and `query` from URL, pass to `BibleSearchMode`
- `frontend/src/components/bible/BibleSearchMode.tsx` — accept `query` and `onQueryChange` props; pass through to `useBibleSearch`
- `frontend/src/hooks/useBibleSearch.ts` — add optional controlled-mode parameters (`controlledQuery`, `onQueryChange`)
- `frontend/src/App.tsx` line 194 — replace `/bible/search` stub route with a redirect to `/bible?mode=search&q=<value>`

**Details:**

**Part A — `useBibleSearch` controlled-mode support:**

Add optional params:

```typescript
interface UseBibleSearchOptions {
  /** BB-38: controlled query from parent (URL-derived). If provided, the hook becomes controlled. */
  controlledQuery?: string
  /** BB-38: callback when the user changes the query. Fires before the search is triggered. */
  onQueryChange?: (query: string) => void
}

export function useBibleSearch(options: UseBibleSearchOptions = {}) {
  const { controlledQuery, onQueryChange } = options
  const [internalQuery, setInternalQuery] = useState('')

  // Hook becomes controlled if controlledQuery is defined (even if empty string)
  const query = controlledQuery !== undefined ? controlledQuery : internalQuery

  const setQuery = useCallback(
    (q: string) => {
      if (onQueryChange) {
        onQueryChange(q)
      } else {
        setInternalQuery(q)
      }
    },
    [onQueryChange],
  )

  // ... rest of existing useBibleSearch logic (results, isSearching, etc.) depends on `query`
}
```

**Part B — `BibleSearchMode` becomes controlled:**

Add props:

```typescript
interface BibleSearchModeProps {
  query: string
  onQueryChange: (query: string) => void
}

export function BibleSearchMode({ query, onQueryChange }: BibleSearchModeProps) {
  const { results, isSearching, isLoadingBooks } = useBibleSearch({
    controlledQuery: query,
    onQueryChange,
  })

  // ... rest of the component unchanged, but the input element's `value={query}`
  //     and `onChange={(e) => onQueryChange(e.target.value)}`
}
```

**Part C — `BibleBrowser` consumes URL state:**

```typescript
import { useSearchParams } from 'react-router-dom'
import { useSearchQuery } from '@/hooks/url/useSearchQuery'

// Inside BibleBrowser:
const [searchParams, setSearchParams] = useSearchParams()
const urlMode = searchParams.get('mode')
const mode: BibleBrowserMode = urlMode === 'search' ? 'search' : 'books'
const { query, setQuery } = useSearchQuery()

const handleModeChange = useCallback(
  (newMode: BibleBrowserMode) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (newMode === 'search') {
          next.set('mode', 'search')
        } else {
          next.delete('mode')
          next.delete('q')
        }
        return next
      },
      { replace: false },
    )
  },
  [setSearchParams],
)

// Remove the existing useState<BibleBrowserMode>('books') at line 28
```

In the JSX:

```typescript
<SegmentedControl mode={mode} onModeChange={handleModeChange} />
{mode === 'books' ? <BibleBooksMode /> : <BibleSearchMode query={query} onQueryChange={setQuery} />}
```

**Part D — Redirect route in `App.tsx`:**

Replace line 194:

```typescript
// Before:
<Route path="/bible/search" element={<Suspense fallback={<RouteLoadingFallback />}><BibleStub page="search" /></Suspense>} />

// After:
<Route path="/bible/search" element={<BibleSearchRedirect />} />
```

Create a small adapter component at the top of `App.tsx` (or in a new file `frontend/src/components/BibleSearchRedirect.tsx` — plan phase uses the new file for clarity):

```typescript
// frontend/src/components/BibleSearchRedirect.tsx
import { Navigate, useSearchParams } from 'react-router-dom'

/**
 * BB-38: Redirects legacy /bible/search URLs to /bible?mode=search.
 * Forwards the ?q= parameter if present.
 */
export function BibleSearchRedirect() {
  const [searchParams] = useSearchParams()
  const q = searchParams.get('q')
  const target = q ? `/bible?mode=search&q=${encodeURIComponent(q)}` : '/bible?mode=search'
  return <Navigate to={target} replace />
}
```

**Auth gating:** None. Search is not auth-gated.

**Responsive behavior:** N/A: no UI changes.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**

- Do NOT delete the `useBibleSearch` hook's internal state unconditionally — the hook must support BOTH controlled and uncontrolled modes (controlled when `controlledQuery` is provided, uncontrolled otherwise). Uncontrolled mode preserves backward compatibility for any consumer that might use the hook without BB-38's controlled pattern.
- Do NOT use `encodeURIComponent` on the `query` when writing to `setSearchParams` — React Router's `URLSearchParams.set` handles encoding automatically. Double-encoding is a common bug.
- Do NOT debounce `handleModeChange` — mode switching is a discrete click.
- Do NOT drop the `?mode=search` param on every keystroke — only drop it when the user explicitly switches to books mode via `SegmentedControl`.
- Do NOT introduce a dedicated `/bible/search` page. The spec's URL `/bible/search?q=love` is reconciled via the redirect component, not a new page. Building a dedicated search page is out of scope.
- Do NOT use `<Navigate>` without `replace`. The redirect should replace the history entry, not push (so back from `/bible` doesn't land on `/bible/search` and then redirect in a loop).

**Test compatibility updates (required — NOT regressions):**

Two test files are affected by the Step 7 refactor. Enumerated below:

**1. `frontend/src/components/bible/__tests__/BibleSearchMode.test.tsx` — 3 tests, 1 render helper, 1 render call site per helper invocation.**

Verified by recon: the file at lines 1-52 has a single `renderSearch()` helper at line 24 that renders `<BibleSearchMode />` with no props. The file already mocks `useBibleSearch` at module boundary (lines 6-15) — the mock returns `{ query: '', setQuery: vi.fn(), results: [], isSearching: false, isLoadingBooks: false }`. The three tests assert on accessibility attributes (aria-describedby, aria-live, status element id). No test clicks anything or types in the search input.

| Change | Detail |
|--------|--------|
| `renderSearch` helper at line 24 | Update the JSX from `<BibleSearchMode />` to `<BibleSearchMode query="" onQueryChange={vi.fn()} />`. Single-site change. |
| Module-boundary mock at lines 6-15 | No change — the mock already returns a synthetic `query`/`setQuery` pair. The hook's new optional `controlledQuery`/`onQueryChange` options don't affect how the mock is consumed because the test mocks the ENTIRE hook return. |
| Test bodies | **No change.** All 3 assertions are byte-unchanged. |

**2. `frontend/src/hooks/__tests__/useBibleSearch.test.tsx` — 7 tests, uncontrolled-mode usage throughout.**

Verified by recon: lines 1-50 show the test file uses `renderHook(() => useBibleSearch())` at line 40 — no options argument, pure uncontrolled mode. The new `controlledQuery`/`onQueryChange` options are opt-in and default to undefined; when undefined, the hook uses its internal `useState` exactly as today. Uncontrolled mode is the default and is preserved byte-unchanged.

| Change | Detail |
|--------|--------|
| Existing 7 tests | **No changes.** They exercise the uncontrolled code path which BB-38 does not touch. |
| New tests (added in a `describe('useBibleSearch — controlled mode (BB-38)')` block) | 4 new tests: (a) `returns controlledQuery when option is provided`, (b) `setQuery calls onQueryChange instead of internal setState`, (c) `does not update internal state when controlled`, (d) `switches back to uncontrolled when controlledQuery is removed on rerender`. |
| Test bodies of existing tests | **No change.** |

**Total Step 7 test impact: 2 files, 1 render-site update, 4 new tests added, zero existing test-body changes, zero test removals.**

**Verification:**

```
pnpm test frontend/src/components/bible/__tests__/BibleSearchMode.test.tsx
pnpm test frontend/src/hooks/__tests__/useBibleSearch.test.tsx
```

Expected: 3 + 7 existing tests pass + 4 new tests pass = 14 total passing.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Existing `BibleSearchMode.test.tsx` (3) | unit | **All 3 existing tests pass after the single render-site update.** |
| Existing `useBibleSearch.test.tsx` (7) | unit | **All 7 existing tests pass unchanged** — uncontrolled mode is the default and BB-38 preserves it byte-for-byte. |
| `useBibleSearch — controlled mode — returns controlledQuery` | unit | New. `renderHook(() => useBibleSearch({ controlledQuery: 'love', onQueryChange: vi.fn() }))`, assert `result.current.query === 'love'`. |
| `useBibleSearch — controlled mode — setQuery calls onQueryChange` | unit | New. Spy on `onQueryChange`, call `result.current.setQuery('peace')`, assert spy called with `'peace'`. |
| `useBibleSearch — controlled mode — does not update internal state` | unit | New. In controlled mode, verify that subsequent rerenders with updated `controlledQuery` prop do NOT desync from an internal state copy. |
| `useBibleSearch — switches back to uncontrolled` | unit | New. Start controlled, rerender without options, assert the hook reverts to internal state. |
| `BibleBrowser reads ?mode=search from URL` | integration | Mount `<MemoryRouter initialEntries={['/bible?mode=search']}>`, assert search input is visible (books mode hidden) |
| `BibleBrowser reads ?q=love from URL` | integration | Mount with `?mode=search&q=love`, assert input value is 'love' and results are displayed |
| `switching to search mode writes ?mode=search to URL` | integration | Click Search segment, assert URL param |
| `switching back to books mode clears ?mode and ?q` | integration | Start with `?mode=search&q=love`, click Books segment, assert both params gone |
| `typing in search input updates URL with debounce` | integration | Use fake timers, type 'test', advance debounce, assert `?q=test` |
| `BibleSearchRedirect redirects /bible/search to /bible?mode=search` | integration | Navigate to `/bible/search`, assert final URL is `/bible?mode=search` |
| `BibleSearchRedirect forwards ?q= parameter` | integration | Navigate to `/bible/search?q=love`, assert final URL is `/bible?mode=search&q=love` |

Expected: ~7 new tests.

**Expected state after completion:**

- [ ] `BibleBrowser.tsx` reads mode and query from URL
- [ ] `BibleSearchMode.tsx` is controlled via props
- [ ] `useBibleSearch.ts` supports controlled mode
- [ ] `/bible/search` redirect is in place via `BibleSearchRedirect` component
- [ ] Existing tests pass
- [ ] New tests pass

---

### Step 8: Wire `useMyBibleView` into `MyBiblePage`

**Objective:** Add `?view=` URL support to My Bible. The `useActivityFeed` hook's internal `filter.type` state is synchronized with the URL parameter: on mount, read from URL; on filter change, write to URL.

**Files to modify:**

- `frontend/src/pages/MyBiblePage.tsx`

**Details:**

Add imports:

```typescript
import { useMyBibleView } from '@/hooks/url/useMyBibleView'
```

Add the hook call inside `MyBiblePageInner`:

```typescript
const { view, setView } = useMyBibleView()
```

Synchronize URL → filter on mount and when URL changes (browser back):

```typescript
// BB-38: URL ?view= drives the filter type
useEffect(() => {
  setFilter((currentFilter) => {
    if (currentFilter.type === view) return currentFilter // no-op if already aligned
    return { ...currentFilter, type: view }
  })
}, [view, setFilter])
```

Wrap `setFilter` calls in the existing handlers to also update the URL when the type changes:

```typescript
// Existing ActivityFilterBar callback — wrap to write to URL
const handleFilterTypeChange = useCallback(
  (newType: MyBibleViewId) => {
    setView(newType) // writes ?view= to URL
    // The useEffect above then syncs filter state
  },
  [setView],
)
```

Find every location in `MyBiblePage.tsx` (and `ActivityFilterBar.tsx` if needed) that calls `setFilter({ ...filter, type: ... })` and route the type-change portion through `setView`. Other filter changes (`book`, `color`, `searchQuery`) stay on `setFilter` because they are not URL-addressable in BB-38 (out of scope — future spec).

Also update the stat card click handlers at line 42 (`STAT_CARDS` array) — clicking a stat card currently sets the filter type. That click should now call `setView(card.filterType)`.

**Auth gating:** None.

**Responsive behavior:** N/A.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**

- Do NOT remove the internal `filter.type` state from `useActivityFeed`. The hook continues to own local filter state — BB-38 adds a URL ↔ hook sync, not a replacement.
- Do NOT make `book`, `color`, or `searchQuery` URL-addressable. Only `view` (filter type) is in BB-38 scope. The others are out of scope.
- Do NOT add a new hook option to `useActivityFeed` (e.g., `initialType`) — the sync via `useEffect` is clean enough. Touching `useActivityFeed`'s signature would cascade to every consumer.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Existing `MyBiblePage.test.tsx` tests | integration | **All pass unchanged.** |
| `MyBiblePage reads ?view=highlights on mount` | integration | Mount with `?view=highlights`, assert the highlights filter is active (e.g., only highlights shown in the activity feed) |
| `MyBiblePage reads each valid view value` | integration | 5 assertions |
| `clicking the Highlights stat card writes ?view=highlights` | integration | Click card, assert URL param |
| `invalid ?view=invalidvalue falls back to all` | integration | Mount with `?view=invalidvalue`, assert `filter.type === 'all'` and the URL param is NOT auto-corrected (per the BB-38 rule) |
| `setting view to 'all' removes the param` | integration | Start with `?view=highlights`, click the Highlights card again (or a Clear button), assert `searchParams.get('view') === null` |

Expected: ~9 new tests.

**Expected state after completion:**

- [ ] `MyBiblePage.tsx` uses `useMyBibleView`
- [ ] Stat card clicks write to URL
- [ ] URL ↔ filter sync works bidirectionally
- [ ] Tests pass

---

### Step 9: `?highlight=` → `?scroll-to=` rename (writer sites) + `?verse=` support on plan day

**Objective:** Execute the mechanical rename across the three writer sites and the two test assertions. Add `?verse=` flow-through on `BiblePlanDay.tsx`.

**Files to modify:**

- `frontend/src/pages/BiblePlanDay.tsx` — rename `?highlight=` to `?scroll-to=`; add `?verse=` flow-through
- `frontend/src/components/ask/VerseCardActions.tsx` — rename `?highlight=` to `?scroll-to=`
- `frontend/src/components/bible/landing/VerseOfTheDay.tsx` — rename `?highlight=` to `?scroll-to=` and rename the local variable `highlightParam` → `scrollToParam`
- `frontend/src/pages/__tests__/BiblePlanDay.test.tsx` — update test assertion at line 118
- `frontend/src/components/bible/landing/__tests__/VerseOfTheDay.test.tsx` — update test assertion at line 116

**Details:**

**`BiblePlanDay.tsx` line 146:**

```typescript
// Before:
const readerUrl = passage.startVerse
  ? `/bible/${passage.book}/${passage.chapter}?highlight=${passage.startVerse}`
  : `/bible/${passage.book}/${passage.chapter}`

// After:
const planPageSearchParams = useSearchParams()[0]
const planVerseParam = planPageSearchParams.get('verse')

// ... inside the passage loop ...
const readerUrl = (() => {
  const base = `/bible/${passage.book}/${passage.chapter}`
  const params = new URLSearchParams()
  if (passage.startVerse) params.set('scroll-to', String(passage.startVerse))
  // BB-38: if the plan day page was opened with ?verse=N, flow it through to the reader
  //        as persistent selection state
  if (planVerseParam) params.set('verse', planVerseParam)
  const query = params.toString()
  return query ? `${base}?${query}` : base
})()
```

Note: the `planVerseParam` read goes at the top of the component, outside the `.map()` callback. If `BiblePlanDay.tsx` doesn't currently import `useSearchParams`, add the import.

**`VerseCardActions.tsx` line 47:**

```typescript
// Before:
navigate(`/bible/${parsedRef.bookSlug}/${parsedRef.chapter}?highlight=${parsedRef.verseStart}#verse-${parsedRef.verseStart}`)

// After:
navigate(`/bible/${parsedRef.bookSlug}/${parsedRef.chapter}?scroll-to=${parsedRef.verseStart}#verse-${parsedRef.verseStart}`)
```

**`VerseOfTheDay.tsx` lines 111 and 145:**

```typescript
// Line 111 (variable rename):
// Before: const highlightParam = ...
// After:  const scrollToParam = ...

// Line 145 (URL param rename):
// Before: to={`/bible/${entry.book}/${entry.chapter}?highlight=${highlightParam}`}
// After:  to={`/bible/${entry.book}/${entry.chapter}?scroll-to=${scrollToParam}`}
```

**Test assertions:**

```typescript
// BiblePlanDay.test.tsx line 118:
expect(link).toHaveAttribute('href', '/bible/psalms/23?scroll-to=1')

// VerseOfTheDay.test.tsx line 116:
expect(link?.getAttribute('href')).toBe('/bible/psalms/23?scroll-to=1')
```

**Auth gating:** None.

**Responsive behavior:** N/A.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**

- Do NOT leave any `?highlight=` writer string in the codebase after this step. Verify with grep: `Grep pattern "\\?highlight=" glob "**/*.{ts,tsx}"` should return only `BibleReader.tsx`'s legacy read path (the `searchParams.get('highlight')` calls, not any URL string writes).
- Do NOT touch `verseActionRegistry.ts:117` (`const highlight: VerseActionHandler = ...`) — that's the highlight COLOR-picker action name, unrelated to the URL parameter.
- Do NOT touch `WelcomeBack.tsx:23,24,45,64,77` (`highlight:` object property) — unrelated.
- Do NOT touch `ActivityCard.tsx:13` (`highlight: Paintbrush,` icon mapping) — unrelated.
- Do NOT add a new test for the `?verse=` flow-through on `BiblePlanDay` unless the flow actually exists — the flow-through writer logic IS in scope, so add a test.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `BiblePlanDay.test.tsx:118` updated to `?scroll-to=` | unit | Test assertion rewritten |
| `VerseOfTheDay.test.tsx:116` updated to `?scroll-to=` | unit | Test assertion rewritten |
| `BiblePlanDay passage link includes ?verse=N when plan day URL has ?verse=N` | unit | Add a new test: mount `<BiblePlanDay>` with `<MemoryRouter initialEntries={['/plans/psalms/day-1?verse=3']}>`, assert the "Read this passage" link includes `?scroll-to=1&verse=3` (or similar composition) |
| `VerseCardActions.test.tsx (if exists) updated assertion` | unit | If VerseCardActions has a test file, update its href assertion. If not, verify manually. |

Expected: ~3 test changes.

**Expected state after completion:**

- [ ] 3 writer files produce `?scroll-to=` instead of `?highlight=`
- [ ] 2 test assertion updates
- [ ] 1 new test for `BiblePlanDay ?verse=` flow-through
- [ ] Grep confirms no `?highlight=` writer strings remain (only the legacy read path in `BibleReader.tsx`)
- [ ] All existing tests pass

---

### Step 10: Integration test — cold-load deep-link flow

**Objective:** Land the mandatory integration test that exercises the full cold-load chain: URL parsing → chapter render → verse selection → action sheet open → sub-view mount → hook fire. Must cover three cases per the spec's pre-execution checklist.

**Files to create:**

- `frontend/src/pages/__tests__/BibleReader.deeplink.test.tsx`

**Details:**

Test file structure:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

// Mock the AI hooks at module boundary so we don't fire real Gemini requests in tests
vi.mock('@/hooks/bible/useExplainPassage', () => ({
  useExplainPassage: vi.fn(() => ({ state: { kind: 'success', content: 'Mock explanation' } })),
}))
vi.mock('@/hooks/bible/useReflectOnPassage', () => ({
  useReflectOnPassage: vi.fn(() => ({ state: { kind: 'success', content: 'Mock reflection' } })),
}))

// ... import BibleReader + providers ...

function renderDeepLink(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/bible/:book/:chapter" element={<BibleReader />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('BB-38 cold-load deep linking', () => {
  describe('Case 1: verse-only', () => {
    it('cold-loads /bible/john/3?verse=16 with verse 16 selected but no sheet open', async () => {
      renderDeepLink('/bible/john/3?verse=16')
      await waitFor(() => expect(screen.getByTestId('verse-16')).toBeInTheDocument())
      // Verse has arrival-glow or selected class
      expect(screen.getByTestId('verse-16')).toHaveAttribute('data-selected', 'true')
      // Sheet is NOT mounted
      expect(screen.queryByRole('dialog', { name: /verse action/i })).not.toBeInTheDocument()
    })

    it('cold-loads /bible/john/3?verse=16-18 with range selected', async () => {
      renderDeepLink('/bible/john/3?verse=16-18')
      await waitFor(() => {
        expect(screen.getByTestId('verse-16')).toHaveAttribute('data-selected', 'true')
        expect(screen.getByTestId('verse-17')).toHaveAttribute('data-selected', 'true')
        expect(screen.getByTestId('verse-18')).toHaveAttribute('data-selected', 'true')
      })
    })
  })

  describe('Case 2: verse + action', () => {
    it('cold-loads /bible/john/3?verse=16&action=explain with Explain sub-view mounted', async () => {
      renderDeepLink('/bible/john/3?verse=16&action=explain')
      await waitFor(() => {
        expect(screen.getByRole('dialog', { name: /verse action/i })).toBeInTheDocument()
      })
      // Explain sub-view is mounted, mock hook has fired, content is visible
      expect(screen.getByText('Mock explanation')).toBeInTheDocument()
    })

    it('cold-loads /bible/philippians/4?verse=6-7&action=reflect with Reflect sub-view', async () => {
      renderDeepLink('/bible/philippians/4?verse=6-7&action=reflect')
      await waitFor(() => {
        expect(screen.getByText('Mock reflection')).toBeInTheDocument()
      })
    })
  })

  describe('Case 3: browser back/forward', () => {
    it('back from ?verse=16&action=explain removes action, keeps verse, sub-view unmounts, sheet stays open', async () => {
      const user = userEvent.setup()
      renderDeepLink('/bible/john/3?verse=16&action=explain')
      await waitFor(() => expect(screen.getByText('Mock explanation')).toBeInTheDocument())

      // Simulate browser back — click the sub-view back arrow which calls clearAction
      await user.click(screen.getByRole('button', { name: /back/i }))

      await waitFor(() => {
        expect(screen.queryByText('Mock explanation')).not.toBeInTheDocument()
      })
      // Sheet is still open (shows actions grid now)
      expect(screen.getByRole('dialog', { name: /verse action/i })).toBeInTheDocument()
    })

    it('closing the sheet clears verse selection from URL', async () => {
      const user = userEvent.setup()
      renderDeepLink('/bible/john/3?verse=16&action=explain')
      await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())

      // Click the close button (X in the sheet header)
      await user.click(screen.getByRole('button', { name: /close/i }))

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })
      // Verse selection is cleared (verify via data attribute absence)
      expect(screen.getByTestId('verse-16')).not.toHaveAttribute('data-selected', 'true')
    })
  })

  describe('Edge cases', () => {
    it('invalid ?verse=999 loads chapter with no selection', async () => {
      renderDeepLink('/bible/john/3?verse=999')
      await waitFor(() => expect(screen.getByTestId('verse-1')).toBeInTheDocument())
      // No verse has the selected class
      expect(screen.queryByTestId('verse-999')).not.toBeInTheDocument()
      expect(screen.getByTestId('verse-1')).not.toHaveAttribute('data-selected', 'true')
    })

    it('invalid ?action=notreal with valid ?verse= loads verse selected but no sheet', async () => {
      renderDeepLink('/bible/john/3?verse=16&action=notreal')
      await waitFor(() => expect(screen.getByTestId('verse-16')).toHaveAttribute('data-selected', 'true'))
      expect(screen.queryByRole('dialog', { name: /verse action/i })).not.toBeInTheDocument()
    })

    it('?action=explain without ?verse= is ignored (no sheet)', async () => {
      renderDeepLink('/bible/john/3?action=explain')
      await waitFor(() => expect(screen.getByTestId('verse-1')).toBeInTheDocument())
      expect(screen.queryByRole('dialog', { name: /verse action/i })).not.toBeInTheDocument()
    })

    it('legacy ?highlight=16 triggers one-shot scroll + arrival glow', async () => {
      renderDeepLink('/bible/john/3?highlight=16')
      // Arrival highlight class applied (verify via state or class)
      await waitFor(() => expect(screen.getByTestId('verse-16')).toHaveClass('arrival-highlight'))
    })

    it('new ?scroll-to=16 triggers the same one-shot behavior', async () => {
      renderDeepLink('/bible/john/3?scroll-to=16')
      await waitFor(() => expect(screen.getByTestId('verse-16')).toHaveClass('arrival-highlight'))
    })
  })

  describe('Case 4: plan-day + verse', () => {
    it('plan day URL with ?verse= flows through to reader link', async () => {
      // Render BiblePlanDay with /plans/psalms/day-1?verse=3
      // Assert the "Read this passage" link href includes both ?scroll-to= and ?verse=
      // (This is covered in Step 9's plan day test, but duplicated here for integration coverage)
    })
  })
})
```

**Auth gating test:** Add one case that cold-loads `?verse=16&action=note` as a logged-out user and asserts the note sub-view mounts and that attempting to save fires the existing auth modal. This verifies BB-38 does NOT bypass the existing note auth gate.

```typescript
describe('Auth gating invariance', () => {
  it('cold-loading ?action=note while logged out mounts the note editor without bypassing auth', async () => {
    // Mock AuthProvider to return isAuthenticated: false
    // Render with ?verse=16&action=note
    // Assert note editor sub-view is mounted (no auth block at mount time)
    // Assert clicking Save triggers the existing auth modal
  })
})
```

**Guardrails (DO NOT):**

- Do NOT touch any pre-existing tests in `BibleReader.test.tsx` or other reader test files. This is a NEW file that adds coverage without modifying existing assertions.
- Do NOT use real `useExplainPassage` or `useReflectOnPassage` — mock them at module boundary to avoid firing real Gemini requests (tests would hit network and be non-deterministic).
- Do NOT assume the `data-selected` attribute exists today — verify during implementation that the existing `ReaderBody` renders a selection indicator that can be asserted against. If the current implementation uses a class name instead, use class assertions. If it uses no selection indicator at all, Step 4 must add one (check existing code first).
- Do NOT skip the browser back/forward cases — they are the second-highest-risk part of the spec per the "Notes for execution" section.

**Expected total tests in the new file:** 12–15 tests covering the three mandatory cases plus edge cases plus auth gating invariance.

**Expected state after completion:**

- [ ] `BibleReader.deeplink.test.tsx` exists with 12+ tests
- [ ] All three mandatory cases pass (verse-only, verse + action, plan-day + verse)
- [ ] Browser back/forward cases pass
- [ ] Auth gating invariance confirmed
- [ ] Pre-existing tests still pass

---

### Step 11: Write the URL format reference for downstream specs

**Objective:** Create `_plans/recon/bb38-url-formats.md` as a durable reference that BB-39 (PWA caching) and BB-40 (SEO / OG cards) will consume. This is the single source of truth for BB-38's URL contract.

**Files to create:**

- `_plans/recon/bb38-url-formats.md`

**Details:**

Structure the document as:

```markdown
# BB-38 URL Format Reference

**Spec:** `_specs/bb-38-deep-linking-architecture.md`
**Plan:** `_plans/2026-04-11-bb-38-deep-linking-architecture.md`
**Purpose:** Canonical URL contract for BB-39 (PWA precaching) and BB-40 (SEO / Open Graph cards) to consume.

## Summary

BB-38 establishes the following URL parameters as the source of truth for navigable app state. All parameters are additive — no existing URL pattern is removed or renamed in a breaking way.

## Parameter Inventory

| Parameter | Route(s) | Values | History Semantics | Notes |
|-----------|----------|--------|------------------|-------|
| `verse` | `/bible/:book/:chapter`, `/plans/:slug/day-:n` | `N`, `N-M` (1 ≤ N ≤ M, integers) | Push on user tap, replace on invalid correction | Persistent selection state. Invalid values dropped silently. |
| `action` | `/bible/:book/:chapter` | `explain`, `reflect`, `cross-refs`, `note`, `highlight`, `share`, `memorize` | Push on sub-view open, push on sub-view close | Auto-mounts sub-view on cold load. Requires `verse`. Invalid values ignored. |
| `tab` | `/daily` | `devotional`, `pray`, `journal`, `meditate` | Push on tab switch | Default: `devotional`. Invalid values fall back silently. |
| `q` | `/bible?mode=search` | Any URL-encoded string | Push on debounced query settle (250ms) | Empty string removes the parameter. |
| `mode` | `/bible` | `search` | Push on mode switch, omitted for `books` | Dropping `mode` reverts to the default `books` view. |
| `view` | `/my-bible` | `all`, `highlights`, `notes`, `bookmarks`, `daily-hub` | Push on filter change | Default: `all`. The default value is omitted from the URL. |
| `scroll-to` | `/bible/:book/:chapter` | `N`, `N-M` | Replace (one-shot, deleted after consumption) | One-shot scroll target with arrival glow. Legacy alias: `highlight` (read-only, same behavior). |

## Full URL Format Grammar

### Bible reader

- `/bible/<book>/<chapter>` — chapter view
- `/bible/<book>/<chapter>?verse=N` — verse N selected (sheet closed on cold load)
- `/bible/<book>/<chapter>?verse=N-M` — verse range selected
- `/bible/<book>/<chapter>?verse=N&action=ACTION` — verse selected, sheet open, sub-view mounted
- `/bible/<book>/<chapter>?scroll-to=N` — cold-load with one-shot scroll + arrival glow (param auto-deleted)
- `/bible/<book>/<chapter>?verse=N&scroll-to=N` — persistent verse selection AND one-shot glow

### Reading plans

- `/plans/<slug>` — plan overview
- `/plans/<slug>/day-N` — plan day
- `/plans/<slug>/day-N?verse=V` — plan day with verse V passed through to the passage reader link

### Daily Hub

- `/daily` — default tab (devotional)
- `/daily?tab=<tab>` — explicit tab

### Bible search

- `/bible` — default (books mode)
- `/bible?mode=search` — search mode, empty query
- `/bible?mode=search&q=<query>` — search mode with query
- `/bible/search` — legacy path, redirects to `/bible?mode=search`
- `/bible/search?q=<query>` — legacy path, redirects to `/bible?mode=search&q=<query>`

### My Bible

- `/my-bible` — default view (all)
- `/my-bible?view=<section>` — filtered section

## Invariants (contract for BB-39 / BB-40)

1. **Content state only.** None of these parameters encode personal data (note IDs, journal dates, highlights, bookmarks), authentication state, focus mode, ambient audio, or drawer state.
2. **Stable across users.** User A's URL gives User B the same content state.
3. **Stable across refreshes.** Refreshing any URL restores the same state.
4. **Backward compatible.** All pre-BB-38 URLs continue to work.
5. **No new localStorage.** BB-38 introduces zero new `wr_*` or `bible:` keys.
6. **No new auth gates.** Cold-loading any BB-38 URL does not introduce new auth modal triggers.

## Consumers

- **BB-39 (PWA offline reading):** Use the parameter inventory above to determine which deep-linked URLs the service worker should precache. At minimum, precache chapter routes (`/bible/:book/:chapter`) and let URL parameters hydrate client-side.
- **BB-40 (SEO + Open Graph):** Use the URL patterns as canonical OG URLs. For Open Graph card content, map: `/bible/<book>/<chapter>?verse=N` → "{Book Name} {chapter}:{N}" card; `/daily?tab=pray` → "Pray with Worship Room" card; etc. The exact OG card taxonomy is BB-40's concern.

## Legacy aliases

| Legacy parameter | New parameter | Status |
|------------------|---------------|--------|
| `?highlight=` | `?scroll-to=` | **Read-only alias.** The reader at `frontend/src/pages/BibleReader.tsx` reads both `scroll-to` and legacy `highlight` for cold-load one-shot scroll. Every writer in the codebase has been updated to produce `?scroll-to=`. External URLs with `?highlight=` continue to work indefinitely. |
```

**Auth gating:** N/A — documentation.

**Responsive behavior:** N/A.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**

- Do NOT document any URL format that BB-38 doesn't actually implement. Accuracy is the whole point.
- Do NOT document personal-layer deep linking (note IDs, journal dates) even as a future note — that's a separate spec's job.
- Do NOT put this in `_specs/` — it's a derived reference, not a spec.

**Test specifications:** N/A — documentation.

**Expected state after completion:**

- [ ] `_plans/recon/bb38-url-formats.md` exists
- [ ] All 7 parameters documented
- [ ] Legacy alias table present
- [ ] BB-39/BB-40 invariant contract documented

---

### Step 12: Final verification — grep audit + full test run + build

**Objective:** Verify zero regressions, zero deprecated patterns, zero stray `?highlight=` writers, and a passing build.

**Files to modify:** None — this is a verification-only step.

**Details:**

Run the following checks in order:

1. **Grep audit for `?highlight=` writers:**
   ```
   Grep pattern '\\?highlight=' glob '**/*.{ts,tsx}'
   ```
   Expected results: ONLY `frontend/src/pages/BibleReader.tsx` (legacy read path — `searchParams.get('highlight')` calls and comment references). Zero writer strings remain.

2. **Grep audit for raw `history.pushState` / `history.back`:**
   ```
   Grep pattern 'history\\.pushState|history\\.back' glob 'frontend/src/hooks/**/*.{ts,tsx}'
   ```
   Expected results: zero matches in `frontend/src/hooks/useVerseTap.ts`. Other hooks may have legitimate uses that BB-38 does not touch.

3. **Grep audit for deprecated patterns:**
   ```
   Grep pattern 'animate-glow-pulse|BackgroundSquiggle.*Daily|font-serif italic' glob 'frontend/src/**/*.{ts,tsx}'
   ```
   Expected results: zero NEW matches introduced by BB-38. Existing matches (if any remain from pre-BB-38 code) are not BB-38's concern.

4. **Grep audit for `useAuth` / `useAuthModal` in new BB-38 files:**
   ```
   Grep pattern 'useAuth|useAuthModal' path 'frontend/src/hooks/url/' path 'frontend/src/lib/url/'
   ```
   Expected results: zero matches. BB-38 introduces zero auth imports.

5. **Grep audit for missed `VerseActionSheet` render sites:**
   ```
   Grep pattern '<VerseActionSheet' glob 'frontend/src/**/*.{ts,tsx}'
   ```
   Expected results: every match outside of `VerseActionSheet.tsx` itself and the designated test files (`VerseActionSheet.test.tsx`, `VerseActionSheet.a11y.test.tsx`, `VerseActionSheet.explain.test.tsx`, `VerseActionSheet.reflect.test.tsx`) must pass the new props (`action`, `onOpenAction`, `onCloseAction`) OR use the stateful wrapper. TypeScript strict mode will catch any missed render site at compile time (required prop missing), but grep is a faster visual check.

6. **Grep audit for dead `isSheetOpen` / `closeSheet` / `extendSelection` references:**
   ```
   Grep pattern 'isSheetOpen|\.closeSheet\(|\.extendSelection\(' glob 'frontend/src/**/*.{ts,tsx}'
   ```
   Expected results: zero matches in `useVerseTap.ts` (the hook no longer exposes these). Matches in `BibleReader.tsx` are acceptable IF they reference React-owned state (`sheetOpen`, not `isSheetOpen`) and the local `handleCloseSheet`/`handleExtendSelectionForSheet` handlers, not the old hook methods. Matches in `VerseActionSheet.tsx` prop usage are acceptable (the component's own `isOpen` and `onClose` props are unchanged — Step 5 only adds new props, it doesn't rename `isOpen`). Any match in `useVerseTap.test.ts` after the rewrite indicates an incomplete rewrite.

7. **`pnpm test`:** Run the full test suite. Expected: all tests pass, including pre-existing tests and new BB-38 tests.

8. **`pnpm lint`:** Expected: zero errors, zero new warnings.

9. **`pnpm build`:** Expected: clean build, zero errors, zero warnings. Bundle size check: BB-38 should not materially increase bundle size (new hooks are tiny).

10. **TS strict check:** Implicit via `pnpm build`.

**Auth gating:** N/A.

**Responsive behavior:** N/A.

**Guardrails (DO NOT):**

- Do NOT skip any of the grep audits. They catch classes of regression that tests miss (e.g., a stray `?highlight=` writer in a test fixture).
- Do NOT modify any file in this step. If an audit fails, return to the offending step and fix there.
- Do NOT run `pnpm test:watch` — use `pnpm test` for a single-run pass.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Full test suite | integration | All pre-BB-38 tests + new BB-38 tests pass |
| `pnpm lint` | lint | Zero errors |
| `pnpm build` | build | Clean production build |
| Grep audit 1 | manual | No `?highlight=` writers outside the legacy read path |
| Grep audit 2 | manual | No raw `history.pushState` in refactored hooks |
| Grep audit 3 | manual | No new deprecated pattern usages |
| Grep audit 4 | manual | No `useAuth` imports in BB-38 files |
| Grep audit 5 | manual | All `<VerseActionSheet` render sites pass the new props |
| Grep audit 6 | manual | Dead `isSheetOpen`/`closeSheet()`/`extendSelection()` references cleaned up |

**Expected state after completion:**

- [ ] All grep audits clean
- [ ] `pnpm test` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm build` passes
- [ ] TS strict passes
- [ ] Ready for `/verify-with-playwright` and `/code-review`

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Pure URL utilities (parseVerseParam, validateAction) |
| 2 | 1 | useVerseSelection, useActionSheetState (consume pure utilities) |
| 3 | — | useDailyHubTab, useSearchQuery, useMyBibleView (independent) |
| 4 | 2 | BibleReader + useVerseTap refactor (consumes hooks from Step 2) |
| 5 | 2, 4 | VerseActionSheet prop-driven sub-view state (consumes hooks from Step 2, plugs into Step 4's reader) |
| 6 | 3 | DailyHub refactor (consumes useDailyHubTab) |
| 7 | 3 | BibleBrowser + BibleSearchMode + route redirect (consumes useSearchQuery) |
| 8 | 3 | MyBiblePage wiring (consumes useMyBibleView) |
| 9 | — | `?highlight=` → `?scroll-to=` rename (mechanical, independent of hook work) |
| 10 | 4, 5, 9 | Integration test (depends on reader + sheet + rename being complete) |
| 11 | 4, 5, 6, 7, 8, 9 | URL format reference documentation |
| 12 | 1–11 | Final verification (all prior steps) |

**Critical path:** 1 → 2 → 4 → 5 → 10 → 12 (reader flow). Parallel work possible on 3 → 6/7/8, and 9 can run anytime. Step 11 is documentation that gates on implementation being final.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Pure URL utilities (parseVerseParam, validateAction) | [COMPLETE] | 2026-04-11 | Created `frontend/src/lib/url/parseVerseParam.ts`, `validateAction.ts`, and test files. 46 tests pass (26 parseVerseParam + 20 validateAction). Zero lint errors introduced (baseline: 16 errors + 5 warnings, unchanged). |
| 2 | URL hooks: useVerseSelection, useActionSheetState | [COMPLETE] | 2026-04-11 | Created `frontend/src/hooks/url/useVerseSelection.ts`, `useActionSheetState.ts`, and `.test.tsx` files. 31 tests pass (14 verse + 17 action). Tests use `<MemoryRouter>` with a `LocationSpy` pattern to observe URL writes. |
| 3 | URL hooks: useDailyHubTab, useSearchQuery, useMyBibleView | [COMPLETE] | 2026-04-11 | Created 3 hooks + 3 test files. 26 new tests pass (8 + 8 + 10). All 5 URL hook files together: 57 tests pass. Minor test assertion fix for URLSearchParams insertion order in `useMyBibleView.test.tsx`. |
| 4 | BibleReader + useVerseTap refactor to URL-driven state | [COMPLETE] | 2026-04-11 | Refactored `useVerseTap.ts` to callback-driven API (removed raw `history.pushState`/`popstate`/`history.back()`, removed internal `selection`/`isSheetOpen`/`closeSheet`/`extendSelection` state). Added `computeExtendedRange` pure helper. `BibleReader.tsx` now owns `sheetOpen` React state with 5 lifecycle rules, uses `useVerseSelection` + `useActionSheetState` for URL state, and keeps back-compat aliases (`isSheetOpen`, `closeSheet`, `extendSelection`) for downstream call sites. `?highlight=` → `?scroll-to=` reader consumer block rewritten with legacy `highlight` alias. `ReaderBody.tsx:31` comment updated. Rewrote `useVerseTap.test.ts`: 19 tests pass (11 rewritten + 2 removed + 6 new derivation/helper tests + 6 computeExtendedRange pure tests). Existing `BibleReader.test.tsx` 22/22 pass unchanged. `BibleReaderAudio`/`BibleReaderHighlights`/`BibleReaderNotes` baseline failures (23 tests) are pre-existing (verified via `git stash`), unrelated to BB-38. |
| 5 | VerseActionSheet prop-driven sub-view state | [COMPLETE] | 2026-04-11 | Added required `action`, `onOpenAction`, `onCloseAction` props to `VerseActionSheet`. Internal `useState<{action, handler}>` replaced with `useMemo` derivation from the `action` prop. Prop type narrowed to `DeepLinkableAction` (the 7-action subset); `handleActionClick` narrows at runtime for defense-in-depth. `handleSubViewBack` now calls `onCloseAction`. `handleEscape` on sub-view now calls `onCloseAction`. "Reset sub-view when sheet closes" effect removed (URL-derived). Wired the 3 new props through `BibleReader.tsx` from `useActionSheetState`. Updated 4 test files with `SheetWithState` stateful wrapper: 16 + 10 + 7 + 10 = 43 existing tests preserved with byte-unchanged test bodies. All 43 pass. BibleReader.test.tsx 22/22 still pass. Total through Step 5: 187/187 tests pass across Steps 1-5 files. |
| 6 | DailyHub refactor to useDailyHubTab | [COMPLETE] | 2026-04-11 | Replaced inline `useSearchParams().get('tab')` + `isValidTab()` with `useDailyHubTab()` hook. Updated 4 `setSearchParams({ tab })` call sites to `setTab(tab)`. Removed unused `isValidTab()` function. Kept `useSearchParams` import for cross-feature context param cleanup at line 88. `DailyHub.test.tsx` 39/39 pass unchanged. TypeScript clean. |
| 7 | BibleBrowser search URL support + /bible/search redirect | [COMPLETE] | 2026-04-11 | Added controlled-mode support to `useBibleSearch` (optional `controlledQuery` + `onQueryChange` options, internal state preserved as default). Added optional `query`/`onQueryChange` props to `BibleSearchMode`, passed through to `useBibleSearch`. `BibleBrowser` now reads `?mode=search` and `?q=` from URL via `useSearchQuery` + direct `useSearchParams` for mode. Removed local `useState<BibleBrowserMode>`. Created `frontend/src/components/BibleSearchRedirect.tsx` and wired it into `App.tsx` line 194 (replaces the legacy `BibleStub page="search"` stub). Removed unused `BibleStub` import. Updated `BibleSearchMode.test.tsx` render site to pass new props (3 tests pass, bodies unchanged). Added 4 new controlled-mode tests to `useBibleSearch.test.tsx` (7 existing + 4 new = 11 total). All 39 tests pass across affected files. |
| 8 | MyBiblePage wiring with useMyBibleView | [COMPLETE] | 2026-04-11 | Added `useMyBibleView` hook to `MyBiblePage.tsx`. Added sync effect: URL `view` → `filter.type` (handles cold-load and browser back). Intercept filter changes via `handleFilterChange` — when type changes, route through `setView` (URL write); other filter fields pass through. Stat card clicks now call `setView(stat.filterType)` directly. MyBiblePage.test.tsx 13/13 pass unchanged. TypeScript clean. |
| 9 | ?highlight= → ?scroll-to= rename (3 writers + 2 tests + plan-day ?verse= flow-through) | [COMPLETE] | 2026-04-11 | Renamed 3 writer sites: `VerseCardActions.tsx:47`, `VerseOfTheDay.tsx:111+145` (variable + URL), `BiblePlanDay.tsx:146`. Added `?verse=` flow-through to `BiblePlanDay` via `useSearchParams` read + URL composition. Updated 2 test assertions (`BiblePlanDay.test.tsx`, `VerseOfTheDay.test.tsx`). Added new test for plan-day `?verse=` flow-through (BiblePlanDay test file now 14 tests). All 29 tests pass across affected files. |
| 10 | Cold-load deep-link integration test | [COMPLETE] | 2026-04-11 | Created `frontend/src/pages/__tests__/BibleReader.deeplink.test.tsx` with 15 integration tests covering: verse-only (2), verse + action with Explain/Reflect/CrossRefs (3), close behavior via X and Back buttons (2), edge cases — invalid verse/action/bookmark/action-without-verse/legacy-highlight/new-scroll-to (6), plan-day + verse flow-through (1), auth-gating invariance (1). AI hooks mocked at module boundary with correct `{ status, result, ... }` return shape. `plansStore` uses `importOriginal` to preserve `getActivePlanProgress`. `scrollIntoView` stubbed for jsdom. 15/15 pass. |
| 11 | URL format reference documentation | [COMPLETE] | 2026-04-11 | Created `_plans/recon/bb38-url-formats.md` with complete parameter inventory, URL format grammar, invariant contract, BB-39/BB-40 consumer notes, legacy alias table, and writer inventory. Noted discovery during Step 8 that the live My Bible route is `/bible/my` (not `/my-bible`). |
| 12 | Final verification (grep audits + full test run + build) | [COMPLETE] | 2026-04-11 | **All 6 grep audits clean.** Audit 1: `?highlight=` appears only in comments + 1 deliberate legacy-alias test (zero writer sites). Audit 2: `history.pushState`/`history.back()` appears only in comments in `useVerseTap.ts` (zero code references). Audit 3: no new deprecated patterns. Audit 4: zero `useAuth`/`useAuthModal` imports in `frontend/src/hooks/url/` or `frontend/src/lib/url/`. Audit 5: 5 `<VerseActionSheet` render sites — 1 production + 4 tests (all tests use `SheetWithState` wrapper). Audit 6: `isSheetOpen`/`closeSheet`/`extendSelection` method references only in `useVerseTap.ts` doc comment. **Full test suite:** 612 files, **7392 passing**, 46 failing. **Baseline** (bible-redesign HEAD before BB-38): 604 files, **7261 passing**, 46 failing across same 8 files. **Zero new failures introduced**, **131 new passing tests added**. `pnpm build` clean (11.26s, PWA generated, 316 precached entries). `pnpm lint` baseline: 16 errors + 5 warnings, unchanged post-BB-38. TypeScript strict clean. |
| 13 | Verification fix: BibleLanding search deep-link wiring (Finding 1) | [COMPLETE] | 2026-04-11 | `/verify-with-playwright` Flow 5 failed cold-loading `/bible?mode=search&q=love` — BB-38's wiring lived in `BibleBrowser.tsx`, but a Bible redesign had replaced `/bible`'s routing target with `BibleLanding.tsx`, silently orphaning the search deep-link contract. Root cause: `App.tsx:190` routes `/bible` → `BibleLanding`, not `BibleBrowser`. `BibleBrowser.tsx`'s BB-38 modifications were dead code from Step 7 onwards. **Fix:** (a) added `useSearchParams` + `useSearchQuery` to `BibleLanding.tsx`; when `?mode=search` is present, render `BibleSearchMode` with controlled query in place of the landing content, plus an inline "← Back to Bible" exit link that clears `mode`+`q`. Hero, streak chip, drawer, and providers all stay. (b) Deleted orphaned `BibleBrowser.tsx`, `BibleBrowser.test.tsx`, `BibleBrowserHighlightsNotes.test.tsx`. (c) Removed the `BibleBrowser does not render a breadcrumb` test case from `BreadcrumbExcluded.test.tsx`. (d) Updated docstring comments in `BibleSearchRedirect.tsx` and `BibleSearchMode.tsx` to reference `BibleLanding` instead of `BibleBrowser`. (e) Created `frontend/src/pages/__tests__/BibleLanding.deeplink.test.tsx` (7 tests: landing mode default, search mode cold-load, query pre-fill, URL-encoded multi-word query, `?q=` ignored without `?mode=`, typing updates URL, "Back to Bible" clears params). (f) Created `frontend/e2e/bb38-search-deeplink.spec.ts` (3 routing-table-aware e2e tests against live dev server — catches future routing refactors that orphan this contract). (g) Updated `_plans/recon/bb38-url-formats.md` to document the consumer change and writer inventory. **Test delta:** +7 unit tests (BibleLanding.deeplink) +3 e2e tests (bb38-search-deeplink) −20 deleted (BibleBrowser.test.tsx) −6 deleted (BibleBrowserHighlightsNotes.test.tsx) −1 removed (BreadcrumbExcluded.test.tsx BibleBrowser case). **Empty-query behavior:** typing to empty string keeps `mode=search` in the URL (matches segmented-control semantics; user exits via "Back to Bible" link, global nav, or browser back). **Playwright Flow 5/6 re-verification:** both pass after the fix. **Pre-existing failures:** `BibleLanding.test.tsx` has 2 baseline failures (`plan state: shows Today's Plan card`, `progress bar has correct ARIA attributes`) that fail identically on `HEAD^` — unrelated to this fix, flagged as baseline noise. |

### Discovered during verification fix (follow-ups out of scope for BB-38)

These four orphans and one styling issue were surfaced during Step 13's recon but are intentionally out of scope — the user scoped the fix to the search deep-link contract only. Document here so future-me can find them when running BB-37b (integrity audit) or the next visual-cleanup spec.

1. **Orphaned `HighlightsNotesSection.tsx`** (`frontend/src/components/bible/HighlightsNotesSection.tsx`) — zero imports anywhere in `src/` after `BibleBrowser.tsx` deletion. Component is dead code. **Add to BB-37b integrity audit checklist for deletion.**
2. **Orphaned `SegmentedControl.tsx`** (`frontend/src/components/bible/SegmentedControl.tsx`) and its exported `BibleBrowserMode = 'books' | 'search'` type — zero consumers after `BibleBrowser.tsx` deletion. **Add to BB-37b integrity audit checklist for deletion.**
3. **Deprecated cyan glow on `BibleSearchMode.tsx` input** — line 65 uses `border-glow-cyan/30` + `shadow-[...rgba(0,212,255,...)...]` which predates the Bible redesign's white-theme (`bg-white/[0.06] border-white/[0.12]`) treatment. Creates a visual mismatch when BibleSearchMode is mounted inside BibleLanding in search mode. **Add to BB-33 (animations/micro-interactions) or BB-35 (accessibility audit) visual cleanup backlog** — whichever is more appropriate for dark-theme consistency polish.
4. **Pre-existing `BibleLanding.test.tsx` flaky/broken tests** — `plan state: shows Today's Plan card` and `progress bar has correct ARIA attributes` fail on `HEAD^` (verified via `git stash` round-trip). Probable cause: `getActivePlans()` runs inside a `useEffect`, so the plan state is populated after first render, but the tests call `screen.getByRole('progressbar')` synchronously. Needs a `waitFor` or `findByRole`. **Not tracked in any spec** — noting here as the single lead.
