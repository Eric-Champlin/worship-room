# Phase 4 Cutover Checklist — Forums Wave

**Phase complete:** 2026-05-10 (date 4.8 merged — Eric fills final value if different)
**Branch:** forums-wave-continued (long-lived working branch)
**Cutover spec:** 4.8 — Room Selector and Phase 4 Cutover

---

## 1. Phase summary

Phase 4 transformed Prayer Wall from a single-mode prayer-request feed into a five-room community
space. Users now create posts in five distinct types (Prayer Request, Testimony, Question,
Discussion, Encouragement), filter the feed by both post type (room) and topical category
(existing), and the per-type chrome / interaction patterns / composer affordances are coherent
across all five. The phase added the unified `posts` schema (4.1), per-type composer chrome
(4.2–4.6), image upload for testimonies and questions (4.6b), the ComposerChooser (4.7), the
Ways-to-Help mini-feature on prayer requests (4.7b), and finally the RoomSelector + dual-filter
URL state + the Phase 4 cutover deliverables in 4.8. Phase 4 is purely frontend on top of the
schema/spec laid down in Phase 3 — Phase 4 added zero new feature flags, kept all existing
localStorage keys, and the existing flag-off mock-data path continues to work for tests.

---

## 2. Per-spec status

| Spec  | ID                                            | Name                                       | Status | Merge date | Notes                                          |
| ----- | --------------------------------------------- | ------------------------------------------ | ------ | ---------- | ---------------------------------------------- |
| 4.1   | round3-phase04-spec01-post-type-foundation    | Post Type Foundation                       | ✅     | YYYY-MM-DD | POST_TYPES constant + backend PostType enum sync |
| 4.2   | round3-phase04-spec02-prayer-request-polish   | Prayer Request Polish                      | ✅     | YYYY-MM-DD |                                                |
| 4.3   | round3-phase04-spec03-testimony-post-type     | Testimony Post Type                        | ✅     | YYYY-MM-DD | Amber/Sparkles/5000-char composer              |
| 4.4   | round3-phase04-spec04-question-post-type      | Question Post Type                         | ✅     | YYYY-MM-DD | Resolved badge + atomic-resolve flow           |
| 4.5   | round3-phase04-spec05-devotional-discussion   | Devotional Discussion Post Type            | ✅     | YYYY-MM-DD | Scripture reference field                     |
| 4.6   | round3-phase04-spec06-encouragement           | Encouragement Post Type                    | ✅     | YYYY-MM-DD | 24h expiry, 280-char limit, no comments        |
| 4.6b  | round3-phase04-spec06b-image-upload           | Image Upload for Testimonies & Questions   | ✅     | YYYY-MM-DD | Three renditions, PII strip, alt text required |
| 4.7   | round3-phase04-spec07-composer-chooser        | Composer Chooser                           | ✅     | YYYY-MM-DD | Modal entry for all 5 types                    |
| 4.7b  | round3-phase04-spec07b-ways-to-help-mvp       | Ways to Help MVP                           | ✅     | YYYY-MM-DD | 5-tag enum on prayer_request                   |
| 4.8   | round3-phase04-spec08-room-selector-cutover   | Room Selector and Phase 4 Cutover          | ✅     | 2026-05-10 | RoomSelector + this checklist                  |

(Eric verifies and fills in actual merge dates from `_forums_master_plan/spec-tracker.md` and
PR / branch history during the cutover review pass.)

---

## 3. Feature flag state

**Zero new feature flags introduced during Phase 4.** This is a deliberate non-event:

- The `?debug-post-type` query-param shim used during 4.1–4.6 development was removed in Spec 4.7
  when ComposerChooser shipped as the production entry point.
- No `VITE_USE_*` flags introduced for any Phase 4 spec; the Phase 3 `VITE_USE_BACKEND_PRAYER_WALL`
  flag is already `true` (Spec 3.12 cutover) and is unchanged by Phase 4.
- 4.8 ships RoomSelector ON BY DEFAULT — no `VITE_USE_ROOM_SELECTOR` toggle (W15).

**No flag cleanup required for Phase 4.**

---

## 4. Post-Phase-4 production state

Prayer Wall now ships:

- Five distinct post types: Prayer Request, Testimony, Question, Discussion, Encouragement.
- Per-type chrome: rose / amber / cyan / violet / white wash on cards.
- Per-type icons (Lucide): HandHelping / Sparkles / HelpCircle / MessagesSquare / Heart.
- Per-type reaction labels in InteractionBar (e.g., 'Heart' for Encouragement, 'Amen' for
  Testimony — wired in 4.3–4.6).
- ComposerChooser as the production entry point for all 5 types (4.7).
- WaysToHelpPicker on prayer_request composer with 5-tag enum
  (Meals, Rides, Errands, Visits, Just prayer please) (4.7b).
- Image uploads with proxied storage, three renditions, PII stripping, alt text required
  (testimony + question only) (4.6b).
- Encouragement type with 24-hour expiry, 280-char limit, no comments, no anonymous (4.6).
- Discussion type with scripture reference field with debounced WEB chapter loading (4.5).
- Question type with resolved badge and atomic-resolve flow (4.4).
- Testimony type with amber/Sparkles/5000-char composer (4.3).
- RoomSelector at top of feed, filtering by `?postType=` URL param (4.8).
- CategoryFilterBar nested below RoomSelector, both sticky together (4.8).
- QOTD card visible above the sticky filter block in any filter state (4.8).
- Both filters compose: `?postType=X&category=Y` filters the feed by intersect (4.8).
- All four URL combinations are bookmarkable: no filter / postType only / category only /
  combined.

The Prayer Wall page surface is end-to-end multi-room as of 2026-05-10.

---

## 5. Open follow-ups for Phase 5 awareness

Phase 5 (Prayer Wall Visual Migration) starts with Spec 5.0 (Architecture Context Refresh —
documentation-only orientation prelude) and includes 5.1, 5.3, 5.4, 5.5. Items deferred from
Phase 4 to Phase 5:

- **FrostedCard migration** — Phase 5 Spec 5.1 migrates Prayer Wall card chrome to
  `<FrostedCard>` (`bg-white/[0.07] border-white/[0.12] rounded-3xl`).
  PrayerCard / RoomSelector / CategoryFilterBar all use rolls-own chrome today.
- **2-line gradient hero heading treatment** — Phase 5 Spec 5.3 lifts PrayerWallHero to the
  canonical 2-line `SectionHeading` pattern.
- **Animation token migration** — Phase 5 Spec 5.4 migrates any hardcoded ms values within
  Prayer Wall to `frontend/src/constants/animation.ts` tokens. RoomSelector uses
  `duration-fast` (already a token); CategoryFilterBar likewise. Mid-priority but
  tracked for completeness.
- **Per-room counts on RoomSelector pills** — D7 deferred this. If Phase 5 user research
  suggests counts help, add as a separate spec; would need a backend count endpoint or
  client-side aggregation per `?category=` style.
- **Push-state vs replace-state for filter changes** — current behavior uses
  `setSearchParams(...,{ replace: true })` matching pre-4.8 semantics. Browser back exits
  PrayerWall rather than walking through filter states. Future spec could flip to
  push-state if a "back to previous filter" UX is desired.
- **Per-type pill accent constants** — accent classes are inline in `RoomSelector.tsx` (D-Edge
  "Per-type accent colors"). Lift to `constants/post-type-pill-accents.ts` if a second consumer
  emerges (e.g., a chip in the BB-46 echo stack or a mood-aware recommendation card).
- **MEDIUM/MINOR axe-core findings** — none observed in this cutover, so nothing to defer.
  Future remediation lives in Phase 5 visual migration cycle if any are surfaced by future
  changes.
- **`handleSelectCategory` migration to functional callback form** — landed in 4.8 to honor
  D4 (filter independence). Surface in `/code-review` Out-of-Band Notes as wider than 4.8's
  stated scope but required for filter independence.
- **BackgroundCanvas sticky-safety fix** — landed in 4.8 verification follow-up
  (NOT in the original 4.8 scope, but caught and fixed during `/verify-with-playwright`).
  `frontend/src/components/ui/BackgroundCanvas.tsx` now uses `overflow-x-clip` instead of
  `overflow-hidden`. The pre-existing regression was introduced by Spec 14 (Cinematic Hero
  Rollout, 2026-05-07): `overflow-hidden` on `BackgroundCanvas` created a scroll container
  that trapped descendants with `position: sticky` — they scrolled with body instead of
  clamping at viewport top. Affected the sticky tab bar on `/daily`, the sticky filter bar
  on `/grow`, and (once 4.8 mounted into it) the dual-filter sticky wrapper on `/prayer-wall`.
  Fix: switched `BackgroundCanvas` root to `overflow-x-clip` (`clip` does NOT create a scroll
  container per CSS Overflow Module Level 3). Also removed the redundant `overflow-x-hidden`
  pass-through on PrayerWall. Three other tests asserting the old shape updated to the new
  contract. Regression locked in by `frontend/e2e/sticky-regression.spec.ts` (5 tests covering
  `/prayer-wall`, `/daily`, `/grow`, the computed `overflow-x: clip` on the canvas root, and a
  no-horizontal-scrollbar check at desktop width). Design-system doc updated at
  `.claude/rules/09-design-system.md` § "BackgroundCanvas Atmospheric Layer" with the new
  sticky-safety rule and a deprecated-pattern table entry.

Phase 5 inherits a clean Phase 4 baseline: 5 post types in production, dual-filter URL state,
axe-core CRITICAL = 0, and a working site-wide sticky-on-BackgroundCanvas contract.

---

## 6. Universal Rule 17 axe-core test status

- **Test file:** `frontend/e2e/accessibility.spec.ts` (NEW in 4.8)
- **Capture script:** `_cutover-evidence/capture-axe-evidence-phase4.mjs` (NEW in 4.8)
- **Routes scanned:**
  1. `/prayer-wall`
  2. `/prayer-wall?postType=testimony`
  3. `/prayer-wall?postType=encouragement&category=mental-health`
- **Status:** ✅ Zero violations of any impact level on all three routes as of 2026-05-10.
- **CI integration:** `frontend/e2e/accessibility.spec.ts` runs in the existing Playwright
  suite invoked by `pnpm exec playwright test`. Failure on CRITICAL blocks merge.
- **Evidence files:**
  - `_cutover-evidence/phase4-a11y-smoke.json` (axe-core full output for the three routes)
  - `_cutover-evidence/phase4-a11y-notes.md` (keyboard walkthrough + VoiceOver spot-check + anti-pressure copy verification)

---

## 7. Sign-off

- [ ] All Phase 4 specs ✅ (verified above) — Eric flips 4.8 ⬜→✅ as the FINAL step.
- [ ] axe-core smoke test passes on all listed routes.
- [ ] Cross-device manual test: post on laptop, see on phone, all 5 types render correctly.
- [ ] No feature flags requiring cleanup.
- [ ] No technical debt items unaddressed (any future MEDIUM/MINOR a11y items are tracked to Phase 5).
- [ ] Phase 5 unblocked.

Phase 4 closed: 2026-05-10
