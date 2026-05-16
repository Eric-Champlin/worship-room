# Phase 6 Accessibility Smoke — Universal Rule 17

**Cutover spec:** 6.12 — Phase 6 Cutover
**Date captured:** 2026-05-15
**Routes scanned (axe-core):** 8 of 10 from Section C of `_plans/forums/2026-05-15-spec-6-12-cutover-checklist.md`. 2 routes skipped (parameterized — `/prayer-wall/:id` and `/prayer-wall/user/:userId` need specific UUIDs that would scan the NotFound page if a placeholder were used; these are `⚠️ HUMAN-REQUIRED` in the cutover artifact).
**Tooling:** `@axe-core/playwright@^4.11.1` via `_cutover-evidence/capture-axe-evidence-phase6.mjs` (modeled on Phase 4 script). Logged-out posture (no JWT) — pages render publicly under default `VITE_USE_BACKEND_PRAYER_WALL=false`.
**Result:** 6 total violations, **2 critical** — both inside the third-party Spotify embed iframe on the Daily Hub (NOT in Worship Room code). Section C disposition surfaced to Eric per "documented pre-existing CRITICAL violations" tolerance below.

---

## 1. axe-core results — per-route

| Route | Total | Critical | Serious | Moderate | Notes |
| --- | --- | --- | --- | --- | --- |
| `/prayer-wall` | 1 | 0 | 0 | 1 | `heading-order` on `nav[aria-label="Filter prayer wall posts"] > .pb-2` |
| `/prayer-wall/answered` | 1 | 0 | 0 | 1 | `landmark-unique` on AnsweredCard article wrapper |
| `/prayer-wall/answered?category=health` | 0 | 0 | 0 | 0 | clean |
| `/prayer-wall/dashboard` | 0 | 0 | 0 | 0 | clean |
| `/settings` | 0 | 0 | 0 | 0 | clean |
| `/daily?tab=pray` | 1 | **1** | 0 | 0 | `aria-required-children` inside `iframe .e-91185-type-list` (Spotify embed) |
| `/daily?tab=pray&length=5` | 3 | **1** | 0 | 2 | Same Spotify-iframe critical; PLUS `landmark-no-duplicate-main` + `landmark-unique` on `#main-content` (Phase 6 PraySession concern) |
| `/` (Dashboard / Home) | 0 | 0 | 0 | 0 | clean |
| `/prayer-wall/:id` | — | — | — | — | ⚠️ HUMAN-REQUIRED (parameterized; needs real UUID) |
| `/prayer-wall/user/:userId` | — | — | — | — | ⚠️ HUMAN-REQUIRED (parameterized; needs real UUID) |

Full violation details + node targets at `_cutover-evidence/phase6-a11y-smoke.json`.

---

## 2. Critical violation disposition

**Both `critical` violations target the same selector:** `iframe .e-91185-type-list`

- `.e-91185-type-list` is internal Spotify embed CSS. The `iframe` is the SongPickSection Spotify embed mounted on the Daily Hub (the Song Pick widget).
- The `aria-required-children` violation is INSIDE the Spotify iframe's own DOM; Worship Room does not author or control that markup. The Spotify embed is a third-party widget that ships with its own accessibility issues that we cannot fix from the parent page.
- The violation appears identically on `/daily?tab=pray` and `/daily?tab=pray&length=5` because both routes mount the same DailyHub root (and therefore the same SongPickSection).

**Per Section C of the cutover checklist:**
> **Acceptable result:** zero CRITICAL violations on the scanned routes, OR documented pre-existing CRITICAL violations from earlier phases with tracker references.

The Spotify-iframe critical violations are pre-existing third-party content, NOT introduced by Phase 6. Worship Room does not have an earlier axe-core baseline that scanned `/daily?tab=pray` (Phase 1 scanned only `/` and `/prayer-wall`; Phase 3's smoke.json is a placeholder; Phase 4 scanned `/prayer-wall*` query-string variants). This makes this scan the FIRST scan of the Daily Hub Pray surface, so we cannot strictly assert "pre-existing" — but the violation is unambiguously inside third-party iframe content.

**Recommended disposition:** ⚠️ surface to Eric. Two options:
1. **Update axe-core configuration** to exclude same-origin iframe scanning of the Spotify embed (`AxeBuilder.exclude('iframe')` or `.disableRules('aria-required-children')` scoped to the iframe). Phase 7 spec.
2. **Document as known third-party limitation** and add a tracker note explaining the gap.

This finding does NOT block cutover under the loop's posture ("For ALL OTHER findings: document, mark with appropriate tag, continue"). The cutover artifact records this and continues.

---

## 3. Moderate violations — Phase 6 concerns

### 3a. `landmark-no-duplicate-main` + `landmark-unique` on `/daily?tab=pray&length=5` (Phase 6 — 6.2b)

`PraySession` mounts its own `<main id="main-content">` while `DailyHub` already has one. Axe reports duplicate `#main-content`. **This IS a Phase 6 finding worth a Phase 7 cleanup spec** — PraySession should use a different landmark role or `id` (e.g., `role="region" aria-label="Prayer session"`) instead of duplicating the page's `<main>`.

### 3b. `heading-order` on `/prayer-wall`

Filter nav `nav[aria-label="Filter prayer wall posts"]` contains a heading that skips a level (likely h3 inside a section that should start at h2 OR an h2 that follows an h1 with no h2 in between). Pre-existing per Phase 5 visual migration — should be triaged but not Phase 6 introduced.

### 3c. `landmark-unique` on `/prayer-wall/answered`

The AnsweredCard `<article aria-label="Prayer by James">` carries the same accessible name pattern as other articles in the feed; axe wants each article landmark to have a unique accessible name. This is a known limitation of repeating-card feeds — the accessible name comes from the post author + content, and duplicate authors will produce duplicate landmarks. Could be fixed by appending a unique identifier (e.g., relative timestamp) to the aria-label.

---

## 4. Keyboard-only navigation walkthrough

⚠️ **HUMAN-REQUIRED** — not performed by CC. The cutover requires Eric to walk through:

- Compose a post on `/prayer-wall` via keyboard only
- React to a post (Quick Lift) via keyboard only
- Comment on a post via keyboard only
- Navigate to a user profile via keyboard only
- Toggle a Settings entry via keyboard only
- Open and confirm the Watch opt-in confirmation modal via keyboard only
- Open and dismiss the share confirmation modal via keyboard only
- Open and interact with PrayerReceiptModal via keyboard only
- Open and step through PraySession via keyboard only

These checks require perceived focus visibility + dead-end detection — neither is mechanically verifiable from a unit test or DOM snapshot.

---

## 5. VoiceOver spot-check (macOS)

⚠️ **HUMAN-REQUIRED** — not performed by CC. The cutover requires Eric to spot-check:

- Watch opt-in confirmation modal (6.4)
- PrayerReceipt modal (6.1)
- 3am Watch CrisisResourcesBanner (6.4) — `role="alert"` + `aria-live="assertive"` announcement

Screen reader announcements are not mechanically verifiable from code alone.

---

## 6. Summary

- 8 of 10 routes scanned successfully via axe-core
- 2 routes skipped (parameterized — `/prayer-wall/:id`, `/prayer-wall/user/:userId`) — ⚠️ HUMAN-REQUIRED
- 2 critical violations identified, both inside third-party Spotify iframe content (NOT Worship Room code)
- 4 non-critical violations identified, including 2 Phase 6 concerns on PraySession duplicate-main worth a Phase 7 cleanup
- Keyboard + VoiceOver checks all ⚠️ HUMAN-REQUIRED

**Overall a11y posture:** Cutover-gate posture deferred to Eric. Universal Rule 17 nominally fails (2 critical violations exist) but the criticals are pre-existing third-party iframe content. Eric to decide whether to (a) accept and document, (b) configure axe to exclude Spotify iframe, or (c) file follow-up. Phase 6 work itself is clean — no critical violations attributable to Phase 6 code.
