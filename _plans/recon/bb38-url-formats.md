# BB-38 URL Format Reference

**Spec:** `_specs/bb-38-deep-linking-architecture.md`
**Plan:** `_plans/2026-04-11-bb-38-deep-linking-architecture.md`
**Date:** 2026-04-11
**Purpose:** Canonical URL contract for BB-39 (PWA precaching) and BB-40 (SEO / Open Graph cards) to consume.

---

## Summary

BB-38 establishes the following URL parameters as the source of truth for navigable app state in Worship Room's Bible reader, Daily Hub, Bible search, My Bible, and reading plan day views. All parameters are additive — no existing URL pattern is removed or renamed in a breaking way. Legacy `?highlight=` URLs continue to work via a read-only alias on the reader.

## Parameter Inventory

| Parameter | Route(s) | Values | History Semantics | Notes |
|-----------|----------|--------|------------------|-------|
| `verse` | `/bible/:book/:chapter`, `/bible/plans/:slug/day/:n` | `N`, `N-M` (1 ≤ N ≤ M, integers) | Push on user tap; nothing on cold-load | Persistent selection state. Invalid values dropped silently. |
| `action` | `/bible/:book/:chapter` | `explain`, `reflect`, `cross-refs`, `note`, `highlight`, `share`, `memorize` | Push on sub-view open; push on sub-view close | Auto-mounts sub-view on cold load when present. Requires `verse`. Invalid values silently ignored. |
| `tab` | `/daily` | `devotional`, `pray`, `journal`, `meditate` | Push on tab switch | Default: `devotional`. Invalid values fall back silently. |
| `q` | `/bible?mode=search` | Any URL-encoded string | Push on debounced query settle (250ms) | Empty string removes the parameter. |
| `mode` | `/bible` | `search` | Push on mode switch; omitted for `books` | Dropping `mode` reverts to the default `books` view and also drops `q`. |
| `view` | `/bible/my` | `all`, `highlights`, `notes`, `bookmarks`, `daily-hub` | Push on filter change | Default: `all`. The default value is omitted from the URL. |
| `scroll-to` | `/bible/:book/:chapter` | `N`, `N-M` | Replace (one-shot — deleted after consumption) | One-shot scroll target with arrival glow. Legacy alias: `highlight` (read-only, same behavior). |

## Full URL Format Grammar

### Bible reader

- `/bible/<book>/<chapter>` — chapter view
- `/bible/<book>/<chapter>?verse=N` — verse N persistently selected (sheet closed on cold load)
- `/bible/<book>/<chapter>?verse=N-M` — verse range N–M persistently selected
- `/bible/<book>/<chapter>?verse=N&action=<ACTION>` — verse selected, sheet open, sub-view mounted
- `/bible/<book>/<chapter>?scroll-to=N` — cold-load with one-shot scroll + arrival glow (param auto-deleted after consumption)
- `/bible/<book>/<chapter>?verse=N&scroll-to=N` — persistent verse selection AND one-shot arrival glow; after cold-load consumption the URL becomes `?verse=N`

**Valid action values:** `explain`, `reflect`, `cross-refs`, `note`, `highlight`, `share`, `memorize`

**Excluded from `action=`** (and why):
- `bookmark` — `hasSubView: false` (toggles without a sub-view); deep-linking a toggle has no semantics
- `pray`, `journal`, `meditate` — navigate away from the reader to `/daily`; deep-linking them would produce a Daily Hub URL, not a reader state
- `copy`, `copy-with-ref` — side-effect actions with no sub-view

### Reading plans

- `/bible/plans` — plan browser
- `/bible/plans/<slug>` — plan overview
- `/bible/plans/<slug>/day/<N>` — plan day
- `/bible/plans/<slug>/day/<N>?verse=V` — plan day with verse V forwarded through to the "Read this passage" reader link

The plan day's passage card renders a link that composes `?scroll-to=<passage.startVerse>` with any `?verse=V` inherited from the plan day URL. The user clicks through to the reader, where `?scroll-to` triggers the one-shot arrival glow and `?verse` establishes persistent selection.

### Daily Hub

- `/daily` — default tab (devotional)
- `/daily?tab=devotional` — Devotional tab (explicit)
- `/daily?tab=pray` — Pray tab
- `/daily?tab=journal` — Journal tab
- `/daily?tab=meditate` — Meditate tab

Tab state was URL-derived before BB-38; the hook `useDailyHubTab()` formalizes the pattern. Tab switching replaces all other search params (including cross-feature context params like `context`, `prompt`, `verseRef`, `verseText`, `verseTheme`) — this behavior was pre-existing and is preserved.

### Bible search

- `/bible` — default (books-first Bible landing page)
- `/bible?mode=search` — search mode, empty query
- `/bible?mode=search&q=<query>` — search mode with query
- `/bible/search` — **legacy path**, redirects to `/bible?mode=search`
- `/bible/search?q=<query>` — **legacy path**, redirects to `/bible?mode=search&q=<query>`

Search is architecturally a sub-mode of `/bible` via `BibleSearchMode`, not a dedicated page. BB-38 reconciled the spec's `/bible/search` URL to a redirect component (`BibleSearchRedirect`) that forwards the `q` parameter onto the canonical `/bible?mode=search&q=<query>` form.

**Consumer note (post-verification fix):** The `/bible` route was originally served by `BibleBrowser.tsx`, which BB-38 wired with `useSearchQuery` + a `?mode=` reader. A Bible redesign that shipped in parallel replaced `/bible`'s target with `BibleLanding.tsx`, silently orphaning the BB-38 search deep-link wiring. The post-verification fix deleted `BibleBrowser.tsx` and moved the `?mode=search` consumer into `BibleLanding.tsx`. The search panel renders in place of the landing content when `mode === 'search'`, with an inline "Back to Bible" exit link that clears both `mode` and `q` from the URL. Empty query (`q === ''`) keeps `mode=search` active — matches segmented-control semantics; the user exits via the inline link, the global nav, or browser back.

### My Bible

- `/bible/my` — default view (all)
- `/bible/my?view=highlights` — highlights section
- `/bible/my?view=notes` — notes section
- `/bible/my?view=bookmarks` — bookmarks section
- `/bible/my?view=daily-hub` — Daily Hub meditations section

(Note: the live route is `/bible/my`, not `/my-bible` as initially documented in the spec. Verified during Step 8 recon.)

## Invariants (contract for BB-39 / BB-40)

1. **Content state only.** None of these parameters encode personal data (note IDs, journal dates, highlights, bookmarks), authentication state, focus mode, ambient audio, or drawer state.
2. **Stable across users.** User A's URL gives User B the same content state. Personal annotations stay local.
3. **Stable across refreshes.** Refreshing any URL restores the same state.
4. **Backward compatible.** All pre-BB-38 URLs continue to work. Legacy `?highlight=` is a read-only alias on the reader.
5. **No new localStorage.** BB-38 introduces zero new `wr_*` or `bible:` keys.
6. **No new auth gates.** Cold-loading any BB-38 URL does not introduce new auth modal triggers. Cold-loading an auth-gated sub-view (e.g., `?action=note`) still hits the existing gate on save.
7. **URLs are SPA-only.** BB-38 is 100% client-side. No server-side rendering of deep-linked URLs.

## Consumers

### BB-39 (PWA offline reading)

The service worker's precaching strategy should treat `/bible/:book/:chapter` as the cacheable unit. URL parameters hydrate client-side on the cached shell:

- `verse`, `action`, `scroll-to` → handled by the React app on the cached chapter shell
- Daily Hub tab content → cached per tab (individual API responses or JSON blobs)
- Plan day pages → cacheable per `/bible/plans/:slug/day/:n` path

The service worker does NOT need to know about URL parameters for cache lookups — the underlying path is the cache key.

### BB-40 (SEO + Open Graph)

Use URL patterns as canonical OG URLs. Map each URL shape to an OG card taxonomy:

- `/bible/<book>/<chapter>` → "Read {Book Name} {chapter} on Worship Room"
- `/bible/<book>/<chapter>?verse=N` → "{Book Name} {chapter}:{N} — contemplative reading"
- `/bible/<book>/<chapter>?verse=N&action=explain` → "{Book Name} {chapter}:{N} — explained"
- `/bible/<book>/<chapter>?verse=N&action=reflect` → "{Book Name} {chapter}:{N} — reflect on this"
- `/daily?tab=pray` → "Pray with Worship Room"
- `/daily?tab=devotional` → "Today's devotional on Worship Room"
- `/bible/plans/<slug>/day/<N>` → "{Plan Title} — Day {N}"
- `/bible?mode=search&q=<query>` → "Search results for \"{query}\" on Worship Room"

The exact OG card taxonomy is BB-40's concern. BB-38 guarantees the URL shapes are stable and unambiguous.

## Legacy aliases

| Legacy parameter | New parameter | Status |
|------------------|---------------|--------|
| `?highlight=N` / `?highlight=N-M` | `?scroll-to=N` / `?scroll-to=N-M` | **Read-only alias.** `BibleReader.tsx` reads both parameters (`scroll-to` first, falling back to `highlight`) when applying the one-shot arrival glow. Every writer site in the codebase has been updated to produce `?scroll-to=` after BB-38. External URLs with `?highlight=` continue to work indefinitely. |

## Writer inventory (post-BB-38)

As of BB-38 completion, the following writer sites produce the deep-link URLs:

| Writer | URL parameter(s) written | File |
|--------|-------------------------|------|
| `BiblePlanDay` "Read this passage" link | `scroll-to`, `verse` (if present on plan day URL) | `frontend/src/pages/BiblePlanDay.tsx:156` |
| `VerseCardActions` (AskPage) navigate | `scroll-to` | `frontend/src/components/ask/VerseCardActions.tsx:48` |
| `VerseOfTheDay` "Read in context" link | `scroll-to` | `frontend/src/components/bible/landing/VerseOfTheDay.tsx:147` |
| `BibleReader` interactive verse tap | `verse` | `frontend/src/pages/BibleReader.tsx` (via `useVerseSelection.setVerse`) |
| `VerseActionSheet` action click | `action` | `frontend/src/components/bible/reader/VerseActionSheet.tsx` (via `onOpenAction` prop) |
| `DailyHub` tab switch | `tab` | `frontend/src/pages/DailyHub.tsx` (via `useDailyHubTab.setTab`) |
| `BibleLanding` "Back to Bible" exit link | clears `mode` + `q` | `frontend/src/pages/BibleLanding.tsx` (via local `exitSearchMode` callback) |
| `BibleSearchMode` query input | `q` | `frontend/src/components/bible/BibleSearchMode.tsx` (via `BibleLanding` → `useSearchQuery.setQuery` through controlled-mode props) |
| `MyBiblePage` stat card click + filter bar | `view` | `frontend/src/pages/MyBiblePage.tsx` (via `useMyBibleView.setView`) |
| `BibleSearchRedirect` legacy path redirect | forwards `q` to `mode=search&q=<value>` | `frontend/src/components/BibleSearchRedirect.tsx` |

No source file writes `?highlight=` after BB-38. The only remaining `highlight` reference in writer-direction code is the local variable rename in `VerseOfTheDay.tsx` (now `scrollToParam`). The reader still reads the legacy parameter for backward compatibility.
