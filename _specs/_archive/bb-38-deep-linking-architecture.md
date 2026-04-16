# BB-38: Deep Linking Architecture

**Branch:** `bible-redesign` (stay on current branch — no new branch, no merge)

**Master Plan Reference:** N/A — infrastructure spec in the Bible-redesign wave. Sequenced after BB-32 and directly enables BB-40 (SEO + Open Graph cards), BB-39 (PWA offline caching), and BB-41 (web push notifications).

**Depends on:**

- BB-4 (reader view core) — the reader already renders chapters and supports verse selection via React state
- BB-6 (verse action sheet) — the sheet already mounts sub-views for verse actions
- BB-9 (cross-references), BB-30 (Explain), BB-31 (Reflect) — sub-views that must become deep-linkable
- BB-10 through BB-12 (Daily Hub tabs) — tabs already exist and currently derive tab state from `?tab=` query param
- BB-15 (Search My Bible) — existing search UI that needs its query to become URL-addressable
- BB-21 + BB-21.5 (reading plans + plan browser) — plan day routing exists; verse parameter is additive
- BB-32 (shipped) — AI caching layer that cold-loaded sub-view URLs will hit on initial mount

**Hands off to:**

- BB-40 (SEO + Open Graph) — will reference BB-38's URL formats as the canonical surface for share cards
- BB-39 (PWA + offline) — will use BB-38's URL patterns for service worker precaching
- BB-41 (web push notifications) — will deep-link into specific app states via BB-38 URLs
- A future personal-layer deep-linking spec (notes by ID, journal entries by date, memorize deck cards) — Tier 3, explicitly deferred

---

## Overview

BB-38 makes every meaningful piece of Worship Room's navigable app state addressable via URL. After it ships, a user can copy any URL from their address bar, share it with a friend, bookmark it, or hit refresh, and return to the exact same app state — chapter, verse selection, open sub-view, Daily Hub tab, search query, or My Bible section.

This is foundational infrastructure, not a user-facing feature. Normal usage feels unchanged, but the URLs become rich and stable. A friend sending another friend `/bible/philippians/4?verse=6-7&action=reflect` is sending not just the verse but the contemplative invitation to reflect on it — the kind of sharing that the app's contemplative positioning can finally deliver on. Every downstream distribution and discoverability spec (BB-40 SEO, BB-41 push, BB-39 offline) depends on this work landing first.

## User Story

As a **logged-out or logged-in visitor**, I want the URL in my browser's address bar to always reflect what I'm currently looking at in the app, so that I can bookmark, share, refresh, or use browser back/forward to return to specific experiences — a particular verse, a contemplative sub-view, a Daily Hub tab, a search result — without losing my place.

## Why this matters and what BB-38 explicitly does NOT cover

BB-38 makes content state portable via URL. It does **not** encode personal state, authentication state, or transient UI state. The distinction matters because the same URL must behave consistently regardless of who opens it or when.

**What BB-38 covers (content state):**

- Which book/chapter/verse the user is reading
- Which sub-view of the verse action sheet is open (explain, reflect, cross-refs, note, highlight, bookmark, share, memorize)
- Which Daily Hub tab is active (devotional/pray/journal/meditate)
- Which reading plan day is being viewed, plus optional in-day verse highlight
- Which search query produced a results page
- Which My Bible section is active (highlights/bookmarks/notes)

**What BB-38 explicitly does NOT cover:**

- **Personal data references.** Note IDs, journal entry dates, memorize deck card IDs. A shared `/notes/abc123` URL has no meaning on the recipient's device because notes are local. Deferred to a future personal-layer spec.
- **Authentication state.** URLs must not branch on login status. Content visibility is gated by component logic, not URL.
- **Focus mode toggle.** `/bible/john/3` is the same URL whether focus mode is on or off.
- **Ambient audio state.** URL doesn't change when audio plays/pauses or when the AudioDrawer opens.
- **Verse action sheet open/closed (without a sub-view).** The sheet is intermediate UI on the way to a sub-view; the URL only addresses the destination sub-view, not the sheet itself.
- **Pixel-perfect scroll restoration.** The verse parameter is the scroll anchor; sub-verse scroll position is not encoded.

## Architecture — URL state as source of truth

The core architectural shift: URLs become the canonical source of truth for navigable app state. React state mirrors the URL, not the other way around.

**The pattern, applied consistently:**

1. **Read on mount.** Components read URL parameters via React Router's `useSearchParams` and `useParams` and initialize their state accordingly. If parameters are missing or invalid, the component uses its default state — no error, no redirect, no URL rewrite on mount.
2. **Write on change.** User-initiated state changes call `setSearchParams` or `navigate` to reflect the new state in the URL. This pushes a new history entry so browser back/forward navigation works.
3. **Fall back gracefully.** Invalid parameters (verse number out of range, unknown action name, unknown tab name) are silently ignored — the component loads its default state and the URL is silently corrected on the next user action.
4. **Drop irrelevant parameters.** When the user navigates between sections, URL parameters that are no longer relevant are dropped. Verse selection doesn't survive navigation to the Daily Hub.

**Current state of the codebase (reconciliation notes for the plan phase):**

- **Daily Hub tab state is already URL-derived.** `DailyHub.tsx` reads `?tab=` on every render rather than storing tab state in `useState`. BB-38 formalizes this pattern and confirms that `?tab=devotional|pray|journal|meditate` is the canonical format. No work needed beyond confirming alignment.
- **The Bible reader already consumes `?highlight=N` / `?highlight=N-M` as a scroll/glow trigger**, then deletes the parameter via `setSearchParams(..., { replace: true })`. This is a one-shot scroll target, not persistent selection state. The name `highlight` is semantically overloaded in the Bible reader: it can mean (a) the personal-layer highlight color picker from BB-7, (b) the one-shot scroll-to-verse arrival glow effect, or (c) the new persistent selection state BB-38 is introducing. **BB-38 resolves the conflict by renaming the existing one-shot parameter from `?highlight=` to `?scroll-to=`, and introducing `?verse=` as the new persistent selection parameter.** The two parameters coexist with distinct semantics:
  - `?verse=N` / `?verse=N-M` — **persistent selection state.** Stays in the URL as long as the verse is selected. Written on user tap, cleared on deselect. The source of truth for selection.
  - `?scroll-to=N` / `?scroll-to=N-M` — **one-shot scroll target with arrival glow.** Consumed on mount, applies scroll-into-view + arrival pulse, then deleted via `setSearchParams(..., { replace: true })`. Used by external entry points (Verse of the Day, Ask page verse cards, Bible Plan Day "read in context") that want to land the user at a specific verse with attention pulled there, without leaving that verse in a persistently-selected state.
  - These serve different use cases and should not be merged. A user tapping into a chapter from VOTD wants the verse glowed, not selected for an action. A user tapping a verse in the reader wants it selected and addressable.
  - **The rename is part of BB-38's scope, not a follow-up.** Scope is bounded: 3 writer sites (`BiblePlanDay.tsx`, `VerseCardActions.tsx`, `VerseOfTheDay.tsx`), 1 reader consumer site (`BibleReader.tsx`), and 2 test assertion updates (`BiblePlanDay.test.tsx`, `VerseOfTheDay.test.tsx`). All enumerated under "Files to modify" below.
  - **Backward compatibility for legacy URLs:** Any user with a bookmarked `?highlight=` URL from before BB-38 should still land on the right verse. The reader's consumer code reads `?scroll-to=` as primary but also accepts `?highlight=` as a legacy alias (reads the value, applies the scroll/glow, deletes both params). This makes the rename purely additive from an external contract standpoint. The legacy alias is documented as deprecated in `_plans/recon/bb38-url-formats.md` and is intentionally minimal scope — just the read path, nothing writes `?highlight=` after BB-38 ships.
- **`verseActionRegistry.ts` enumerates these actions:** `highlight`, `note`, `bookmark`, `share`, `pray`, `journal`, `meditate`, `cross-refs`, `explain`, `reflect`, `memorize`, `copy`, `copy-with-ref`. The subset that has `hasSubView: true` and is therefore deep-linkable into a mounted sub-view: `highlight`, `note`, `share`, `cross-refs`, `explain`, `reflect`, `memorize`. `bookmark` toggles without a sub-view and should not be deep-linkable via `action=` (a deep link to "open a toggle" is meaningless). `pray`, `journal`, `meditate` navigate away from the reader and should not be deep-linkable via `action=` (they produce a Daily Hub URL, not a reader state). `copy` and `copy-with-ref` are side-effect actions with no sub-view. **The final list of deep-linkable action values is therefore: `explain`, `reflect`, `cross-refs`, `note`, `highlight`, `share`, `memorize`.** The plan phase should confirm this subset against the registry and update `validateAction` accordingly. (The inbound spec text listed `bookmark` as deep-linkable; BB-38 excludes it because it has no sub-view to mount.)

## URL formats

### Bible reader

| URL | Behavior |
|---|---|
| `/bible/john/3` | Existing. Chapter view, no verse selected, no sub-view. |
| `/bible/john/3?verse=16` | Chapter loads, verse 16 is marked as the active selection and scrolled into view. Action sheet does NOT auto-open. |
| `/bible/john/3?verse=16-18` | Chapter loads, verse range 16–18 is marked as the active selection. First verse scrolls into view. Action sheet does NOT auto-open. |
| `/bible/john/3?verse=16&action=explain` | Chapter loads, verse 16 is selected, verse action sheet opens, Explain sub-view mounts immediately. |
| `/bible/john/3?verse=16-18&action=reflect` | Chapter loads, range 16–18 is selected, sheet opens, Reflect sub-view mounts. |

**Notes:**

- `verse=16,18,20` (non-contiguous) is NOT supported — the reader doesn't support non-contiguous selection today. Treated as invalid.
- `verse=16` without a chapter path (e.g. `/bible?verse=16`) is ignored.
- Valid `action` values: `explain`, `reflect`, `cross-refs`, `note`, `highlight`, `share`, `memorize` (see reconciliation note above — `bookmark`, `pray`, `journal`, `meditate`, `copy`, `copy-with-ref` are excluded).

### Reading plans

| URL | Behavior |
|---|---|
| `/plans/anxiety` | Existing. Plan overview. |
| `/plans/anxiety/day-7` | Existing. Day 7 of the anxiety plan. |
| `/plans/anxiety/day-7?verse=4` | New. Day 7 loads with verse 4 of its passage highlighted. Same semantics as the reader `?verse=` parameter. |

### Daily Hub

| URL | Behavior |
|---|---|
| `/daily` | Existing. Devotional tab (default). |
| `/daily?tab=pray` | Existing. Pray tab active. |
| `/daily?tab=journal` | Existing. Journal tab active. |
| `/daily?tab=meditate` | Existing. Meditate tab active. |

Already implemented before BB-38. BB-38 confirms the format and ensures the reconciliation note above (tab state derived from URL) holds under the new pattern.

### Search

| URL | Behavior |
|---|---|
| `/bible/search` | Search page with empty query and empty results state. |
| `/bible/search?q=love` | Search page with "love" pre-filled in the input and search results displayed. |

The plan phase should verify whether search supports translation filtering. If yes, add `?translation=web` as a secondary parameter. If no (WEB is hard-coded), the `q` parameter is sufficient.

### My Bible

| URL | Behavior |
|---|---|
| `/my-bible` | Default view. |
| `/my-bible?view=SECTION` | Section active. Valid values to be confirmed against the existing `MyBiblePage` during plan recon — likely `highlights`, `bookmarks`, `notes`. |

The plan phase should read the existing `MyBiblePage` implementation and confirm the valid section values. Plan phase also decides whether to use `?view=` (query param) or `/my-bible/highlights` (path segment) based on which pattern the existing page already uses.

## Edge cases

| Case | Behavior |
|---|---|
| `?verse=999` in a chapter with 36 verses | Chapter loads with no selection. Parameter silently dropped on next user action. No error, no crash. |
| `/bible/john/99` (chapter out of range) | "Chapter not found" empty state with link back to John overview. Severe enough for a visible error because the user clearly intended something specific. |
| `/bible/notabook/3` (book doesn't exist) | "Book not found" empty state with link to Bible landing. |
| `?verse=16&action=invalidaction` | Chapter loads, verse 16 selected, action sheet does NOT open. Invalid action parameter silently ignored. |
| `?action=explain` without `?verse=` | Action parameter ignored. The sheet requires a verse to operate on. |
| `?verse=33-100` in a chapter with 36 verses (range extends beyond chapter) | Invalid. Parameter dropped, chapter loads with no selection. |
| `?verse=999&action=explain` (invalid verse + action) | Both parameters dropped. Chapter loads with no selection and no sheet. |
| **Cold load `/bible/philippians/4?verse=6-7&action=reflect`** | Chapter loads → verse range validated → action validated → sheet opens → Reflect sub-view mounts → `useReflectOnPassage` fires → hits BB-32 cache (or fires Gemini request). This is the highest-risk flow. Must be integration tested. |
| Browser back after opening a sub-view | `/bible/john/3` → `?verse=16` → `?verse=16&action=explain` → back → `?verse=16` (sheet closes, selection persists) → back → `/bible/john/3` (selection clears) → back → previous page. Requires push-history semantics on each user-initiated state change. |
| Browser refresh mid-interaction | Page reloads, URL parameters re-parsed, same state restored. With BB-32's cache in place, AI sub-views return instantly on refresh. |
| Navigation from reader to Daily Hub while verse is selected | Verse parameter dropped (not relevant to Daily Hub). Returning to `/bible/john/3` later shows no selection. Correct — verse selection is per-visit, not persistent. |
| Sharing a URL between users with different personal data | User A with a highlight on verse 16 shares `/bible/john/3?verse=16`. User B opens the URL, sees John 3 with verse 16 selected but does NOT see User A's highlight. Correct — content state transfers, personal state does not. |

## URL update semantics — push vs replace

| State change | History semantics | Rationale |
|---|---|---|
| User taps a verse to select it | `navigate(url)` (push) | User action, should be back-navigable |
| User extends selection to a range | `navigate(url)` (push) | User action |
| User opens a sub-view from the action sheet | `navigate(url)` (push) | User action — back button should close the sheet |
| User closes the action sheet | `navigate(url)` (push) | Symmetric with opening — consistent back-button model |
| User deselects a verse | `navigate(url)` (push) | User action |
| User switches Daily Hub tab | `navigate(url)` (push) | User action, tab switching should be back-navigable (matches existing behavior) |
| User submits a search query | `navigate(url)` (push) | New query is a distinct state |
| Invalid parameter dropped on load | `navigate(url, { replace: true })` | Automatic correction, not part of user's interaction history |
| Default parameter applied on load | `navigate(url, { replace: true })` | Automatic, not a user action |
| Tab-switch cleanup (e.g., clearing `verseRef` when leaving meditate tab per Spec Z) | `navigate(url, { replace: true })` | Automatic side-effect of leaving a tab |

Default: **push for user-initiated changes, replace for automatic corrections.** The plan phase must audit every call site and apply this table consistently.

## Requirements

### Functional Requirements

1. Provide custom URL hooks in `frontend/src/hooks/url/` that wrap React Router primitives and expose typed, validated state getters/setters for verse selection, verse action sub-view, Daily Hub tab, and search query.
2. Provide pure parsing/validation functions in `frontend/src/lib/url/` (`parseVerseParam`, `validateAction`) that are testable in isolation.
3. Wire the Bible reader to read `?verse=` on mount, update it when the user selects/deselects a verse, and reconcile with the existing `?highlight=` pattern (rename, alias, or co-exist — plan phase decides).
4. Wire the verse action sheet to mount a sub-view from `?action=` on mount and update `?action=` when the user opens or closes a sub-view.
5. Wire the search page to read/write `?q=` and persist the query across refresh.
6. Wire the reading plan day view to consume `?verse=` for in-day verse highlighting.
7. Wire My Bible to read its section parameter on mount. Format (`?view=` query or `/my-bible/SECTION` path segment) follows whichever pattern the existing page already uses.
8. Confirm that `/daily?tab=` already behaves per the new pattern (should be a no-op based on recon).
9. Handle all edge cases from the table above without crashing, showing blank states, or forcing unnecessary redirects.
10. Preserve backward compatibility — no existing URL pattern is removed, renamed, or restricted in a breaking way. Existing bookmarks must all continue working.

### Non-Functional Requirements

- **Cold-load performance:** A cold load of `/bible/philippians/4?verse=6-7&action=reflect` must fire the Reflect hook within ~1 second of chapter render. Cached results return instantly; uncached results begin their Gemini request immediately.
- **No race conditions:** Multiple pieces of state initializing from URL on mount must resolve in the correct order (chapter → verse selection → action sheet → sub-view mount → hook fire). The integration test is the authoritative check.
- **Zero new dependencies:** BB-38 uses React Router primitives already installed (`react-router-dom@^6.22.0`). No new packages.
- **Accessibility:** URL changes must not cause focus loss in ways that disorient screen reader users. When the action sheet auto-opens from URL on cold load, focus is placed on the sheet's close button per the existing pattern.
- **Test coverage:** Unit tests for the URL hooks and parsing functions use `MemoryRouter`. Integration tests for the cold-load flow exercise the full chain from URL parsing to hook firing.

## Auth Gating

**BB-38 adds zero auth gates.** URL state is content state, not personal state. A logged-out visitor opening any BB-38 deep link sees the same content a logged-in user would see. Features the deep link targets may themselves be auth-gated (e.g., a note sub-view that requires login to save), but the URL itself never branches on authentication status.

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|---|---|---|---|
| Cold-load `/bible/john/3?verse=16` | Chapter loads, verse 16 selected. Normal reader experience. | Same. | N/A |
| Cold-load `/bible/john/3?verse=16&action=explain` | Chapter loads, verse selected, Explain sub-view mounts and fires the Gemini request (BB-30 is not auth-gated). | Same. | N/A |
| Cold-load `/bible/john/3?verse=16&action=reflect` | Same as Explain — BB-31 is not auth-gated. | Same. | N/A |
| Cold-load `/bible/john/3?verse=16&action=note` | Chapter loads, note sub-view mounts showing existing note (or empty). Attempting to **save** a note while logged out hits the existing auth gate inherited from the note feature. | Can read and write notes per existing behavior. | Existing note auth-modal message (unchanged by BB-38) |
| Cold-load `/bible/john/3?verse=16&action=highlight` | Chapter loads, highlight picker opens. Highlighting a verse while logged out follows the existing auth behavior (BB-38 does not change it). | Same. | Existing highlight behavior (unchanged) |
| Cold-load `/daily?tab=pray` | Daily Hub opens on Pray tab. Existing behavior — confirmed working for logged-out users per `10-ux-flows.md`. | Same. | N/A |
| Cold-load `/bible/search?q=love` | Search page opens with query pre-filled. Search is not auth-gated. | Same. | N/A |
| Cold-load `/my-bible?view=highlights` | My Bible opens on highlights section. Personal data may be empty for logged-out users. | Same URL; user's own highlights display. | N/A (per-feature auth gates are unchanged) |

The important invariant: **BB-38 does not introduce any new auth modal triggers.** Any auth gate that exists today on a feature continues to exist unchanged. BB-38 just makes sure the URL can reach the right place before the gate fires.

## Responsive Behavior

| Breakpoint | Behavior |
|---|---|
| Mobile (< 640px) | URL-driven state restoration works identically. Verse selection scroll-into-view respects mobile reader chrome. Action sheet mounts as a mobile bottom sheet with the sub-view auto-mounted. |
| Tablet (640–1024px) | Same. Sheet sizing matches tablet layout. |
| Desktop (> 1024px) | Same. Sheet sizing matches desktop layout. |

BB-38 introduces **no new visual UI**. It is pure state plumbing. Responsive behavior is entirely inherited from the existing reader, action sheet, Daily Hub, search, plan, and My Bible components. The only responsive concern is that scroll-into-view for `?verse=N` on cold load must account for the sticky reader chrome / tab bar heights — the plan phase should verify the existing scroll-to-verse code already handles this (it does for `?highlight=`, so the same logic should apply).

## AI Safety Considerations

N/A — BB-38 does not change AI prompts, introduce new AI surfaces, or affect crisis detection. It does touch AI sub-views (Explain, Reflect) in the sense that their mounting can now be triggered by a URL, but the safety guardrails in BB-30 and BB-31 fire identically whether the sub-view was opened by a tap or by a cold load.

One subtle interaction worth calling out for the plan phase: **a cold-load deep link to an AI sub-view fires the Gemini request before the user has seen the UI.** With BB-32's cache, identical repeated loads hit the cache instantly. For uncached first-time cold loads, the user sees the sub-view's loading state followed by the AI output and disclaimer — exactly as they would after tapping the action button manually. The AI disclaimer is mounted by the sub-view component itself, so it is present on cold load the same way it is present on interactive mount. No new safety work required.

## Auth & Persistence

- **Logged-out users:** URL parameters are parsed and applied to component state exactly as they are for logged-in users. Zero persistence writes. Per the Demo Mode Data Policy in `02-security.md`, no data is stored for logged-out users — BB-38 is read-only from a persistence standpoint.
- **Logged-in users:** URL parameters drive component state. Any persistence that existed before BB-38 (highlights, notes, bookmarks, reading progress) continues to function identically — BB-38 does not touch write paths.
- **localStorage usage:** **None.** BB-38 does not introduce any new `wr_*` or `bible:` keys. The URL is the source of truth; nothing about BB-38 needs to persist to localStorage. Existing keys (e.g., `wr_bible_last_read`, `bible:bookmarks`) are unchanged.

## Completion & Navigation

N/A — BB-38 is infrastructure and does not participate in Daily Hub completion tracking. It does not add, remove, or modify any `markPrayComplete`, `markJournalComplete`, `markMeditateComplete`, or `markDevotionalComplete` calls.

## Design Notes

- **No new UI.** BB-38 ships zero pixels of new design. The visible behavior comes from existing components that BB-38 rewires to URL-derived state.
- **Reuse existing React Router primitives.** `useParams`, `useSearchParams`, `useNavigate`, `useLocation` are the only routing APIs in scope. No new routing library.
- **Scroll-into-view on cold load.** The existing `?highlight=` scroll-into-view pattern in `BibleReader.tsx` (lines 294-338) is the reference implementation — the plan phase should extend or replace it with `?verse=`-aware logic while preserving the same scroll-offset accounting for sticky chrome.
- **No new visual patterns.** `09-design-system.md` does not need updates for BB-38. The design system recon at `_plans/recon/design-system.md` does not need to be re-run.
- **Deep-link-specific loading states are NOT in scope.** If a cold load takes 300ms to fetch the chapter before it can apply the `?verse=` parameter, the user sees the existing `BibleReaderSkeleton` during that window. No new "restoring your state" UI.

## Out of Scope

- **Personal-layer deep linking.** Note IDs, journal entry dates, memorize deck card IDs, prayer list item IDs. Deferred to a future spec with different privacy/cross-device concerns.
- **Non-contiguous verse selections** (`?verse=16,18,20`). The reader doesn't support them today. Treated as invalid.
- **Cross-chapter verse ranges** (`?verse=3:33-4:2`). Chapter boundaries are path-level, not query-level.
- **Translation switching via URL** (`?translation=esv`). WEB is the only translation today.
- **Authentication or login-status URL parameters.** URLs must not branch on login status.
- **Focus mode, ambient audio, drawer state, modal state** — all transient UI state stays in React.
- **Scroll position beyond verse-level.** Pixel-perfect scroll restoration is out of scope.
- **Open Graph tags.** Metadata generation per URL is BB-40.
- **Service worker precaching** of deep-linked URLs. That's BB-39.
- **Push notification deep-link targeting.** That's BB-41.
- **Backend URL generation or canonicalization.** BB-38 is 100% client-side.
- **Server-side rendering of deep-linked URLs.** The app remains SPA-only in this spec.

## Acceptance Criteria

**URL → state (cold-load flows):**

- [ ] Navigating cold to `/bible/john/3?verse=16` loads John 3 and marks verse 16 as the active selection with the existing scroll-into-view + arrival-glow behavior.
- [ ] Navigating cold to `/bible/john/3?verse=16-18` loads John 3 and marks verses 16–18 as the active selection.
- [ ] Navigating cold to `/bible/john/3?verse=16&action=explain` loads the chapter, selects verse 16, opens the verse action sheet, and mounts the Explain sub-view. The Explain sub-view fires its hook immediately.
- [ ] The action sheet auto-opens from URL on the following actions: `explain`, `reflect`, `cross-refs`, `note`, `highlight`, `share`, `memorize`. (Not `bookmark`, `pray`, `journal`, `meditate`, `copy`, `copy-with-ref` — see reconciliation note in Architecture section.)
- [ ] Navigating cold to `/bible/philippians/4?verse=6-7&action=reflect` correctly initializes chapter → verse range → sheet → Reflect sub-view → `useReflectOnPassage` hook fire, in that order, with no race conditions.
- [ ] A cold-loaded AI sub-view URL benefits from BB-32's cache — if the same URL was loaded before within the cache TTL, the sub-view content returns instantly on second cold load.
- [ ] Navigating cold to `/daily?tab=pray` opens the Daily Hub on the Pray tab (already working — BB-38 verifies).
- [ ] Navigating cold to `/daily?tab=devotional`, `/daily?tab=journal`, `/daily?tab=meditate` all work identically.
- [ ] Navigating cold to `/bible/search?q=love` opens the search page with "love" pre-filled and results displayed.
- [ ] Navigating cold to `/plans/<slug>/day-N?verse=V` loads day N of the plan with verse V highlighted within the day's passage.
- [ ] Navigating cold to `/my-bible?view=<section>` (or `/my-bible/<section>` depending on the reconciled format) opens My Bible with the correct section active.

**State → URL (interactive writes):**

- [ ] Tapping a verse in the reader updates the URL to include `?verse=N` and pushes a new history entry.
- [ ] Extending a selection to a range updates the URL to `?verse=N-M`.
- [ ] Opening a sub-view from the action sheet updates the URL to include `&action=ACTION` and pushes a new history entry.
- [ ] Closing the action sheet removes the `action` parameter but keeps the `verse` parameter and pushes a new history entry.
- [ ] Deselecting a verse removes the `verse` parameter from the URL.
- [ ] Switching Daily Hub tabs updates `?tab=` and pushes a new history entry (existing behavior — verified).
- [ ] Submitting a search query updates `?q=` and pushes a new history entry.

**Browser navigation:**

- [ ] Browser back button from `/bible/john/3?verse=16&action=explain` navigates to `/bible/john/3?verse=16` (action closes, selection persists).
- [ ] Browser back again from `/bible/john/3?verse=16` navigates to `/bible/john/3` (selection clears).
- [ ] Browser back again navigates to the previous page (whatever the user was on before the reader).
- [ ] Browser forward button restores the most recent forward state.
- [ ] Browser refresh on any BB-38 deep-linked URL restores the same exact state.

**Edge cases (silent fallbacks):**

- [ ] `?verse=999` in a chapter with fewer than 999 verses: chapter loads with no selection, no error, no crash.
- [ ] `?verse=33-100` in a chapter with fewer than 100 verses: chapter loads with no selection.
- [ ] `?verse=16&action=notarealaction`: chapter loads, verse selected, action sheet does NOT open. Action parameter ignored.
- [ ] `?action=explain` without `?verse=`: action parameter ignored.
- [ ] Unknown `?tab=` value on Daily Hub: falls back to the default tab silently.
- [ ] Unknown `?view=` value on My Bible: falls back to the default section silently.

**Severe fallbacks (visible error states):**

- [ ] `/bible/john/99` (chapter out of range) shows the existing "Chapter not found" empty state with a link back to the John overview.
- [ ] `/bible/notabook/3` (book doesn't exist) shows the existing "Book not found" empty state with a link to the Bible landing.

**`?highlight=` → `?scroll-to=` rename:**

- [ ] `/bible/john/3?scroll-to=16` loads John 3, scrolls verse 16 into view, applies the arrival-glow effect, and then removes the `scroll-to` parameter from the URL via `setSearchParams(..., { replace: true })` — preserving the existing one-shot behavior.
- [ ] `/bible/john/3?scroll-to=16-18` applies the scroll-and-glow behavior to the range 16–18.
- [ ] `/bible/john/3?highlight=16` (legacy alias) behaves identically to `?scroll-to=16` — the reader consumes the value, applies the effect, and deletes the parameter. Legacy bookmarks continue to work.
- [ ] `/bible/john/3?scroll-to=16&verse=16` cold-loads with verse 16 persistently selected AND the arrival-glow effect applied. The two parameters can coexist on a single URL — `verse` is persistent, `scroll-to` is one-shot. After mount, the URL becomes `/bible/john/3?verse=16` (scroll-to deleted, verse retained).
- [ ] `BiblePlanDay.tsx`, `VerseCardActions.tsx`, and `VerseOfTheDay.tsx` all produce `?scroll-to=` URLs, not `?highlight=` URLs, after BB-38 ships.
- [ ] Updated test assertions in `BiblePlanDay.test.tsx` and `VerseOfTheDay.test.tsx` verify the `?scroll-to=` format.
- [ ] No source file writes `?highlight=` to a URL after BB-38 ships (verified by grep over the final diff — the only remaining reference should be the legacy-alias read path in `BibleReader.tsx`).

**Invariants:**

- [ ] Existing URLs (`/bible/john/3`, `/daily`, `/plans/<slug>`, `/my-bible`) behave identically before and after BB-38.
- [ ] Legacy `?highlight=` URLs continue to work via the alias read path in `BibleReader.tsx`.
- [ ] URLs are stable across page refreshes (refreshing a URL produces the same state).
- [ ] URLs are stable across users (User A's URL gives User B the same content state, but not User A's personal data).
- [ ] URL parameters not relevant to the current page are dropped on navigation (verse parameter from the reader does not leak into `/daily`).
- [ ] Personal data (highlights, bookmarks, notes, journal entries) is NOT encoded in URLs.
- [ ] Authentication state is NOT encoded in URLs.
- [ ] Focus mode state is NOT encoded in URLs.
- [ ] Ambient audio playback state is NOT encoded in URLs.
- [ ] BB-38 introduces zero new auth modal triggers — all auth gates on targeted features remain unchanged.
- [ ] BB-38 introduces zero new localStorage keys.
- [ ] BB-38 introduces zero new dependencies (no `package.json` changes).

**Testing:**

- [ ] `frontend/src/lib/url/parseVerseParam.ts` is unit tested with at least: single verse, range, invalid (non-numeric, range reversed, zero/negative), non-contiguous rejected.
- [ ] `frontend/src/lib/url/validateAction.ts` is unit tested with at least: every valid deep-linkable action, invalid action name, empty string, undefined.
- [ ] `useVerseSelection`, `useActionSheetState`, `useDailyHubTab`, `useSearchQuery` custom hooks are unit tested with React Testing Library + `MemoryRouter` to verify URL ↔ state synchronization in both directions.
- [ ] `BibleReader.deeplink.test.tsx` integration test covers at least three cold-load cases: (a) verse-only, (b) verse + action (Explain or Reflect, to exercise the AI hook fire), (c) plan-day + verse.
- [ ] The integration test also exercises browser back/forward via the test router to verify push/replace semantics.
- [ ] All pre-existing failing tests are NOT touched.
- [ ] All existing tests for `BibleReader`, `VerseActionSheet`, `DailyHub`, `MyBiblePage`, search, and plan components continue to pass after the modifications.

**Documentation:**

- [ ] `_plans/recon/bb38-url-formats.md` documents every BB-38 URL format as a reference for BB-40 (SEO) and BB-39 (PWA caching). The table covers path segments, query parameters, valid values, invalid-case fallbacks, and push/replace history semantics.

## Files to create (indicative — plan phase will finalize)

- `frontend/src/hooks/url/useVerseSelection.ts` — custom hook for reading/writing `?verse=`
- `frontend/src/hooks/url/useActionSheetState.ts` — custom hook for `?action=`
- `frontend/src/hooks/url/useDailyHubTab.ts` — custom hook for `?tab=` (may replace or wrap existing logic — plan phase reconciles)
- `frontend/src/hooks/url/useSearchQuery.ts` — custom hook for `?q=`
- `frontend/src/hooks/url/__tests__/` — one test file per hook
- `frontend/src/lib/url/parseVerseParam.ts` — pure parser
- `frontend/src/lib/url/validateAction.ts` — pure validator against the registry's deep-linkable subset
- `frontend/src/lib/url/__tests__/` — one test file per pure function
- `frontend/src/pages/__tests__/BibleReader.deeplink.test.tsx` — cold-load integration test (note: `BibleReader` lives in `frontend/src/pages/`, not `frontend/src/components/bible/reader/`)
- `_plans/recon/bb38-url-formats.md` — URL format reference

## Files to modify (indicative — plan phase will finalize)

**Bible reader (core of the spec):**

- `frontend/src/pages/BibleReader.tsx` — consume `?verse=` as persistent selection state, update it on user tap/deselect, read `?scroll-to=` (and legacy `?highlight=`) on mount for one-shot arrival-glow behavior. The existing `?highlight=` consumer code at lines 285, 298–309 is the reference implementation — rename the local variables, rename the parameter read, and keep the scroll + arrival-glow effect identical.
- `frontend/src/components/bible/reader/VerseActionSheet.tsx` — read/write `?action=`, auto-mount the sub-view matching the action parameter on cold load
- `frontend/src/components/bible/reader/ReaderBody.tsx` — comment at line 31 references `?highlight=`; update the comment to describe the new `?scroll-to=` behavior (no functional change)
- `frontend/src/lib/bible/verseActionRegistry.ts` — no functional change; `validateAction` reads from it

**`?highlight=` → `?scroll-to=` rename (writer sites):**

- `frontend/src/pages/BiblePlanDay.tsx` line 146 — change `?highlight=${passage.startVerse}` to `?scroll-to=${passage.startVerse}` in the "read in context" link
- `frontend/src/components/ask/VerseCardActions.tsx` line 47 — change `?highlight=${parsedRef.verseStart}` to `?scroll-to=${parsedRef.verseStart}` in the navigate call
- `frontend/src/components/bible/landing/VerseOfTheDay.tsx` line 145 — change `?highlight=${highlightParam}` to `?scroll-to=${highlightParam}` and rename the local variable `highlightParam` to `scrollToParam` for clarity

**Rename test assertions:**

- `frontend/src/pages/__tests__/BiblePlanDay.test.tsx` line 118 — update expected href from `/bible/psalms/23?highlight=1` to `/bible/psalms/23?scroll-to=1`
- `frontend/src/components/bible/landing/__tests__/VerseOfTheDay.test.tsx` line 116 — update expected href from `/bible/psalms/23?highlight=1` to `/bible/psalms/23?scroll-to=1`

**Other BB-38 wiring:**

- `frontend/src/pages/DailyHub.tsx` (or wherever Daily Hub lives) — confirm the tab-from-URL pattern matches the new hook contract; no behavior change expected (plan phase verifies via read of the existing code)
- `frontend/src/pages/MyBiblePage.tsx` — read `?view=` (or path segment) on mount. Plan phase reads the file and decides the format.
- `frontend/src/pages/BiblePlanDay.tsx` or `frontend/src/pages/BiblePlanDetail.tsx` (plan phase picks the right file) — read `?verse=` and pass to the passage renderer so the targeted verse inside the plan day's passage is highlighted
- The search page component (location to be confirmed — `BibleSearchMode.tsx` or a dedicated search page at a route the plan phase will identify) — read/write `?q=`
- The route configuration file (plan phase locates it) — no new routes, verify search parameters preserve correctly through route transitions

**Scope guard:** The rename touches exactly 4 source files (3 writer + 1 reader) and 2 test files. This was verified via grep before planning began. If the plan phase discovers additional `?highlight=` call sites that were missed by the initial grep, pause and report to the user before proceeding — the scope promise was "6 touch points, under 10," and discovery of more sites may indicate the rename is larger than assumed.

## Notes for execution

- **The cold-load flow is the highest-risk part of the spec.** The plan phase must call out the cold-load integration test as Step 1 of testing and verify it passes for verse-only, verse + action, and plan-day + verse cases before any other work is considered done.
- **Browser back/forward semantics are the second-highest risk.** The push-vs-replace table in the Architecture section is the source of truth. The plan phase must audit every `navigate` and `setSearchParams` call site against that table.
- **Existing URLs must keep working.** Zero breakage is a hard invariant. If the plan phase discovers any existing URL pattern that would break under the new system, it must preserve the old pattern as an alias or reconcile it additively.
- **Daily Hub `?tab=` is already URL-derived.** Per `10-ux-flows.md`, the Daily Hub reads `?tab=` on every render. BB-38 formalizes this pattern. If the existing implementation already matches the BB-38 hook contract, wiring `useDailyHubTab()` is just a refactor, not a rewrite.
- **The existing `?highlight=` one-shot scroll param is a legacy pattern** that predates BB-38's persistent selection model. Plan phase decides whether to rename `highlight` → `verse`, keep `highlight` as a short-lived alias that writes to `verse`, or keep them as two independent parameters serving slightly different purposes (persistent selection vs one-shot scroll glow). The cleanest long-term path is rename + alias, but the plan phase owns the final call.
- **`bookmark` is NOT deep-linkable** as an `action=` value even though it appears in the registry. It has `hasSubView: false` — it toggles without mounting a sub-view — and a "deep link to open a toggle" has no useful semantics. The inbound spec text listed `bookmark` in the action set; BB-38 corrects this based on the registry reconnaissance. Plan phase confirms.
- **`pray`, `journal`, `meditate` are also NOT deep-linkable as `action=`.** They navigate away from the reader to the Daily Hub via `buildDailyHubVerseUrl` and should not be resurrectable as a reader state. The Daily Hub side already has its own deep-link surface via `?tab=` and the `verseRef`/`verseText`/`verseTheme` parameters from Spec Z.
- **`copy` and `copy-with-ref` are side-effect actions** with no persistent state or sub-view. Not deep-linkable.
- **Personal data deep linking is a future spec.** Resist the temptation to slip in note IDs, journal entry dates, or memorize deck card IDs. Privacy and cross-device concerns require a separate spec.
- **BB-40 (Open Graph cards) and BB-39 (PWA offline caching) depend on BB-38's URL formats being finalized.** Any URL format BB-38 establishes becomes a contract that downstream specs will depend on. Format stability is a hard requirement.
- **No prompt testing in this spec.** BB-38 doesn't change AI prompts. No BB-30/31/32 behavior changes.

## Pre-execution checklist (for CC, before `/execute-plan`)

Before CC runs `/execute-plan`, confirm these items:

1. **BB-32 is shipped and committed.** Verified — the AI caching layer at `frontend/src/lib/ai/cache.ts` exists and the most recent commit on `bible-redesign` is `063ca2d ai-caching-and-rate-limiting`.
2. **Worship Room uses React Router.** Verified — `frontend/package.json` declares `react-router-dom@^6.22.0`.
3. **Daily Hub tab implementation uses URL query params.** Verified via `10-ux-flows.md`: "Tab state is derived from the URL `?tab=` query param on every render (not stored in `useState`)." The plan phase should still read `DailyHub.tsx` to confirm the hook contract matches.
4. **`verseActionRegistry.ts` enumerates the actions.** Verified — registry contains: highlight, note, bookmark, share, pray, journal, meditate, cross-refs, explain, reflect, memorize, copy, copy-with-ref. **Deep-linkable subset (BB-38 scope):** `explain`, `reflect`, `cross-refs`, `note`, `highlight`, `share`, `memorize`.
5. **No existing URL routes are removed, renamed, or restricted.** BB-38 is purely additive. Plan phase verifies during route-file reconciliation.
6. **Stay on `bible-redesign` branch.** Verified — BB-38 commits directly to `bible-redesign`, no new branch, no merge.
7. **The cold-load deep-link integration test is mandatory** and must verify at least three cases: verse-only, verse + action, plan-day + verse. This is a process commitment, not a precondition.

No user action is required before `/execute-plan` can run.
