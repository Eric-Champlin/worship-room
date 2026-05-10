# Phase 4 Accessibility Smoke — Universal Rule 17

**Cutover spec:** 4.8 — Room Selector and Phase 4 Cutover
**Date captured:** 2026-05-10
**Routes scanned:** `/prayer-wall`, `/prayer-wall?postType=testimony`, `/prayer-wall?postType=encouragement&category=mental-health`
**Tooling:** `@axe-core/playwright@^4.11.1` via `frontend/e2e/accessibility.spec.ts`; full-detail JSON capture via `_cutover-evidence/capture-axe-evidence-phase4.mjs`
**Result:** Zero CRITICAL violations on all three routes. Zero violations of any impact level.

---

## 1. axe-core results

See `phase4-a11y-smoke.json`. Summary across the three Spec 4.8 routes:

| Route | Total violations | Critical | Serious | Moderate | Minor |
| --- | --- | --- | --- | --- | --- |
| `/prayer-wall` | 0 | 0 | 0 | 0 | 0 |
| `/prayer-wall?postType=testimony` | 0 | 0 | 0 | 0 | 0 |
| `/prayer-wall?postType=encouragement&category=mental-health` | 0 | 0 | 0 | 0 | 0 |

The CI gate at `frontend/e2e/accessibility.spec.ts` asserts `critical = 0` and runs against the dev server in the existing Playwright suite.

---

## 2. Keyboard-only walkthrough

Performed without using the mouse or trackpad.

### Flow 1 — Filter the feed by room

- Tab from the page top → navbar links → "Share something" → QOTD → RoomSelector pills → CategoryFilterBar pills.
- Tab order matches visual order (top-to-bottom).
- Each RoomSelector pill is focusable; Enter/Space activates.
- URL updates after activation; active pill receives the focus ring (`focus-visible:ring-2 ring-primary-lt/70`).

### Flow 2 — Combined filter

- Tab to RoomSelector → activate "Testimonies".
- Tab to CategoryFilterBar → activate "Health".
- Both pills now show `aria-pressed="true"`; URL is `?postType=testimony&category=health`.

### Flow 3 — Switch back to All

- Tab back to the RoomSelector → activate "All".
- URL drops `?postType=`; "Health" remains the active category pill (D4 — independent filters).

### Flow 4 — Compose a post

- Tab to "Share something" CTA → ComposerChooser opens.
- Tab cycles through the 5 type cards; Enter activates a type.
- Composer mounts with the chosen `postType`; focus moves into the textarea.

### Flow 5 — Bookmark / pray for / comment on a card

- Tab through the InteractionBar of a visible PrayerCard.
- Pray, bookmark, save toggle on Enter; comment toggle expands the comments section without focus loss.

No dead-ends, no unfocusable interactive elements, no focus loss after URL changes.

---

## 3. VoiceOver spot-check (macOS)

VoiceOver enabled (Cmd+F5). Spot-checks on the new dual-toolbar interaction.

- **RoomSelector announcement** — Container announced as "Filter by post type, toolbar." Each pill announced as "<label>, button" with the activation state derived from `aria-pressed`. State transitions when activated.
- **CategoryFilterBar coexistence** — Announced as "Filter prayers by category, toolbar." Identical pattern. The two toolbars do not conflict; VO tab between them works as expected.
- **Filter-change announcement** — The `<div className="sr-only" aria-live="polite">` reads "Showing N <postType> in <category>" / "Showing N <postType>" / "Showing N <category> prayers" / "Showing all N prayers" depending on filter state. Polite announcement fires after activation without interrupting input.

No blocking issues observed. RoomSelector and CategoryFilterBar are coherent under VO.

---

## 4. Anti-pressure copy verification

Spec 4.8 introduces three new user-facing strings:

- `"All"` — RoomSelector anchor pill.
- Container `aria-label="Filter by post type"` — RoomSelector toolbar.
- Empty-state heading variants computed in `emptyHeading` (PrayerWall.tsx):
  - `"This space is for you"` (no filters — pre-existing)
  - `"No <PluralLabel> yet"` (room only)
  - `"No prayers in <Category> yet"` (category only — pre-existing copy reused)
  - `"No <PluralLabel> in <Category> yet"` (combined)

Anti-Pressure Copy Checklist:

- [x] No comparison framing
- [x] No urgency markers
- [x] No exclamation points near vulnerability
- [x] No therapy-app jargon
- [x] No streak-as-shame or missed-X framing
- [x] No false scarcity
- [x] Sentence case + period terminator on long-form copy
- [x] Blameless framing

All 8 boxes pass.

---

## 5. Outstanding non-CRITICAL items

None. All three routes scan clean at every impact level.

---

## 6. Summary

- Routes scanned successfully.
- Keyboard walkthrough completed without dead-ends.
- VoiceOver spot-check completed without blocking issues.
- Anti-pressure copy verification passed.
- Evidence committed alongside this notes file.

**Overall a11y posture:** Pass — Universal Rule 17 satisfied for the Phase 4 cutover gate.
