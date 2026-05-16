# Forums Wave: Spec 7.2 — Prayer Wall to Bible Bridge

**Master Plan Reference:** `_forums_master_plan/round3-master-plan.md` → Spec 7.2 (lines 6388–6401, tracker row 94)
**Spec ID:** `round3-phase07-spec02-prayer-wall-to-bible`
**Phase:** 7 (Cross-Feature Integration) — second spec, immediately follows 7.1
**Branch:** `forums-wave-continued` (no branch switch — Phase 6 / 7.1 discipline)
**Date:** 2026-05-16
**Size:** S
**Risk:** Low
**Prerequisites:** Spec 7.1 ✅ (tracker row 93 — shipped)
**Tier:** Standard

**Brief Source:** `_plans/forums/spec-7-2-brief.md`, authored 2026-05-16 against the live master plan stub plus live code recon.

**Goal:** Scripture chips on prayer cards (from the post type's scripture reference field) link to the Bible reader at that passage, AND the reader auto-scrolls to the verse on arrival. Already partially wired — this spec adds the missing `?scroll-to=` query param to the chip URL (it currently emits `?verse=` only, which is persistent selection but NOT the scroll trigger), and extends test coverage across all 4 Prayer Wall pages and all 5 post types enabled by Spec 7.1.

**Risk rationale:** The chip and its `parseReference`-based URL building already exist at `ScriptureChip.tsx:11-44`. The actual work is: (a) reconcile a real bug where the chip uses `?verse=` but never `?scroll-to=` so the reader doesn't auto-scroll on arrival; (b) extend test coverage across all 4 Prayer Wall routes; (c) verify the round-trip works for the four newly-enabled post types from 7.1.

---

## Affected Frontend Routes

- `/prayer-wall` (PrayerWall.tsx renders PrayerCard which embeds ScriptureChip — chip-side trigger)
- `/prayer-wall/:id` (PrayerDetail.tsx renders PrayerCard — chip-side trigger)
- `/prayer-wall/dashboard` (PrayerWallDashboard.tsx — chip-side trigger)
- `/prayer-wall/user/:id` (PrayerWallProfile.tsx — chip-side trigger)
- `/bible/:bookSlug/:chapter` (BibleReader.tsx — receives `?verse=` AND `?scroll-to=` query params and scrolls)

The `/prayer-wall/answered` route mentioned in some prior thinking is part of PrayerWall.tsx's `view=answered` tab (per the `PrayerWallViewTabs` recon from 7.1), NOT a separate route. The 4 routes above are the canonical 4 the spec stub refers to.

---

## STAY ON BRANCH

Same as Phase 6 and 7.1 — stay on `forums-wave-continued`. No git mutation commands at any phase. Read-only git inspection (`git status`, `git diff`, `git log`, `git show`, `git blame`) is permitted.

---

## Spec-time Recon Summary (verified on disk 2026-05-16)

Every claim below cites live code. Plan-recon re-confirms at execute time.

| Item | Status | Evidence |
|---|---|---|
| `ScriptureChip` is a dedicated component that renders the chip on PrayerCard | ✅ | `frontend/src/components/prayer-wall/ScriptureChip.tsx:11-44` — accepts `reference: string`, parses via `parseReference`, returns either an unlinked `<span>` (chapter-only / unparseable) or a `<Link to={path}>` with aria-label `'Read ${reference} in the Bible'` |
| The chip's URL uses `?verse=<n>` as a query param suffix | ✅ | `ScriptureChip.tsx:29` — `const verseSuffix = parsed.verse !== undefined ? '?verse=${parsed.verse}' : ''`. Builds `/bible/<book>/<chapter><verseSuffix>` on line 30 |
| `?verse=` is the PERSISTENT SELECTION param, not the SCROLL TRIGGER | ⚠️ | `BibleReader.tsx:424-433` — `scrollToParamRef` reads `searchParams.get('scroll-to')`, not `searchParams.get('verse')`. **The scroll-trigger param is `?scroll-to=`, renamed from `?highlight=` per BB-38.** `?verse=` is the persistent selection (which verse is "currently selected" in the reader UI, separate from one-shot scroll behavior) |
| `BiblePlanDay.tsx` is the canonical reference for combining both params | ✅ | `BiblePlanDay.tsx:188-199` — builds reader URL with both `?scroll-to=` (one-shot arrival glow) AND `?verse=` (forwarded persistent selection). Code comment lines 190–192 explicitly distinguish the two purposes |
| `PrayerCard` embeds `ScriptureChip` conditionally on `prayer.scriptureReference` | ✅ | `frontend/src/components/prayer-wall/PrayerCard.tsx:19` (import), `:271-275` (conditional render with `prayer.scriptureReference && (<ScriptureChip reference={prayer.scriptureReference} />)`) |
| Existing chip test verifies the LINK exists but not the SCROLL behavior or per-route coverage | ✅ | `frontend/src/components/prayer-wall/__tests__/ScriptureChip.test.tsx` exists; `__tests__/PrayerCard.test.tsx:375-379` tests the chip surfaces on a Discussion post with `screen.getByRole('link', { name: /Read Romans 8:28 in the Bible/ })`. **No existing test asserts the URL contains `?scroll-to=` or that the reader scrolls on arrival** |
| `BibleReader.tsx` consumes `?scroll-to=` via `useRef` + `useEffect` | ✅ | `BibleReader.tsx:424-433` — `scrollToParamRef.current` captured on mount (so URL changes don't re-trigger). Behavior: scroll to verse with one-shot glow, then param is cleaned via the BB-38 mechanism |
| 7.1 activates `showScriptureReferenceField` for all 5 post types | ✅ (assumed, pending 7.1 cutover) | Per the 7.1 brief MPD-1, all 5 post types will accept the scripture field after 7.1 ships. 7.2 verifies the chip + scroll round-trip works across the 4 newly-enabled types in addition to discussion |
| Stub claims hash anchor `/bible/{book}/{chapter}#verse-{n}` | ⚠️ | The stub AC says `#verse-{n}` (hash fragment). Live code uses `?scroll-to=` (query param). **Stub is wrong about the URL format.** Plan-recon resolves which is canonical — see R1 |
| Stub claims "all 4 Prayer Wall pages" | ✅ | Per the 4 routes named above |

**Recon override:** Two stub claims need reconciliation. The AC for the URL format (`#verse-{n}` hash) doesn't match live code (`?scroll-to=` query). The "already partially wired" language in the goal is *technically* accurate (the chip exists and links), but **the chip is missing the `?scroll-to=` param required to actually trigger reader scroll**. This is the load-bearing R1 finding.

---

## Major Plan Decisions (MPD) — baked into this brief

**MPD-1.** Reconcile the URL format to `?verse=<n>&scroll-to=<n>` (BOTH params, mirroring `BiblePlanDay.tsx:193-199`), NOT the stub's `#verse-{n}` hash. The hash format would require either (a) changing `BibleReader.tsx` to also consume `#verse-{n}` alongside `?scroll-to=` (introducing a second mechanism), or (b) deprecating `?scroll-to=` across the codebase. Neither is in 7.2's bounded scope. The chip should match the existing BibleReader contract.

**MPD-2.** Update `ScriptureChip.tsx` to also set `?scroll-to=<n>` when the reference has a verse number. Single-line change at line 29 (or thereabouts): build the URL with `URLSearchParams` carrying both `verse` and `scroll-to`, same value (the verse number), so the reader auto-scrolls on arrival AND the persistent-selection state reflects the verse the user came from.

**MPD-3.** The chip's existing chapter-only fallback (unlinked `<span>`, recon row 1) is correct behavior and should NOT change. A chip with a chapter-only reference doesn't have a verse to scroll to, so the link is appropriately suppressed.

**MPD-4.** Test coverage extends to ALL 4 Prayer Wall routes. Existing PrayerCard tests only verify chip rendering in isolation; the spec requires per-route verification that the chip surfaces correctly when PrayerCard is mounted in the larger route context (e.g., PrayerWall feed, PrayerDetail single-card view, PrayerWallProfile user's posts, PrayerWallDashboard mosaic view). Add at least one render-and-find test per route confirming the chip's link href has `?verse=<n>&scroll-to=<n>`.

**MPD-5.** Round-trip test verifies the chip's link, when navigated, causes BibleReader to scroll to the target verse. Use the existing test infrastructure pattern from `BibleReader.deeplink.test.tsx:481-491` which already verifies `?scroll-to=` scroll behavior. Add a single integration-style test that clicks a chip on a PrayerCard and asserts the resulting Bible reader view shows the correct verse scrolled into view (or, more lightweight, asserts the URL state matches expectations).

**MPD-6.** No backend changes. The chip is frontend-only. The scripture reference data already exists in `prayer.scriptureReference` per recon row 5.

**MPD-7.** Per-post-type verification. 7.1 will activate the scripture field for all 5 post types; 7.2's tests must cover that the chip surfaces on PrayerCards of ALL 5 types when `scriptureReference` is populated, not just discussion. Extend the existing `DISCUSSION_WITH_SCRIPTURE` fixture pattern to cover prayer_request, testimony, question, and encouragement.

---

## Plan-Recon Gating Questions (R1–R5)

These are load-bearing. Plan-recon MUST resolve each before execute. Same discipline as 7.1.

**R1 — URL format reconciliation (the load-bearing finding).** Three options:
- (a) **Match BibleReader's existing contract (`?verse=<n>&scroll-to=<n>`).** Recommended per MPD-1. Single chip-side change. Bounded scope. Stub AC reframed to match reality.
- (b) **Change BibleReader to also honor `#verse-<n>` hash anchors alongside `?scroll-to=`.** Adds a second mechanism, expands scope. Would be defensible if Eric wants the URL format to be more shareable / standards-compliant (hash anchors are the web-native verse-anchoring pattern), but doubles the BibleReader's deep-link surface.
- (c) **Migrate all of BibleReader from `?scroll-to=` to `#verse-<n>`.** Way out of scope. Touches BB-38 contract, plan-day flow, notification deep links, daily verse, ScriptureSoaking, etc. Should NOT be done in 7.2.

**Default per MPD-1: (a).** Plan-recon confirms by reading `BibleReader.tsx:424-433` and reading `BiblePlanDay.tsx:188-199` to verify the URL contract is stable and that adding `&scroll-to=` to ScriptureChip integrates cleanly with the existing mechanism. If Eric prefers (b) on standards grounds, plan-recon surfaces and the brief expands.

**R2 — Persistent selection vs one-shot scroll semantics.** Setting both `?verse=` and `?scroll-to=` means the chip-click results in: (i) the reader scrolls to the verse (one-shot, glow), AND (ii) the verse is marked as "currently selected" in persistent UI state. Plan-recon confirms:
- Is that the desired UX? Or does Eric want the chip-click to be a one-shot scroll only (set `?scroll-to=` but not `?verse=`)?
- Does the persistent selection persist across reader navigation away and back? Per BB-38 contract, yes — `?verse=` survives until the user explicitly clears it. This may or may not match Eric's intent for "I clicked a chip from Prayer Wall."

Default: set both. Matches `BiblePlanDay.tsx` precedent (treating Bible-via-chip the same as Bible-via-plan-day, both contexts forward both params).

**R3 — Verse range references.** `ScriptureChip` accepts a string like `'Romans 8:28-30'` (verse range). Plan-recon verifies:
- `parseReference` returns `{book, chapter, verse}` where `verse` is the FIRST verse of the range, or returns a range structure `{book, chapter, verseStart, verseEnd}`
- The URL should scroll to the FIRST verse (`verseStart`) and ideally highlight the full range, but the minimum-viable behavior is "scroll to the start." Plan-recon reads `parseReference` and confirms the chip-side URL builder handles ranges correctly.
- If ranges are not yet handled and verse is `undefined` for a range input, the chip falls back to unlinked span (per recon row 1) — that's wrong; a range should still link to the start verse. Plan-recon decides whether the fix is in `parseReference` (return start verse for ranges) or in `ScriptureChip` (handle the range structure explicitly).

**R4 — Mobile viewport behavior.** Per the 6.x specs, mobile viewport has its own layout quirks. Plan-recon confirms:
- Does the chip render correctly on mobile (44px min touch target — note `ScriptureChip.tsx:36` already sets `min-h-[44px]` on the link variant per WCAG, so this is likely fine, but verify)
- Does the scroll behavior on the Bible reader work cleanly on mobile (sticky header offset, etc.) — this is BibleReader's responsibility, not the chip's, but worth a manual QA pass

**R5 — Crisis-flagged prayer handling.** If a PrayerCard is crisis-flagged (per 6.4 / 6.11b mechanisms), should the scripture chip still render and link? Plan-recon confirms:
- The chip rendering condition at `PrayerCard.tsx:271` is currently `prayer.scriptureReference && (...)` — no crisis check
- Should it be suppressed on crisis-flagged cards? Probably NO (the chip is informational, not engagement-bait — leaving it visible is consistent with "we hear you" anti-pressure), but plan-recon surfaces if the answer should be YES

Default: leave the chip render condition unchanged. Crisis-flagged cards retain the chip. The chip is non-coercive (a quiet "Read X in the Bible" link, not a CTA), so the anti-pressure rule doesn't apply.

---

## Section 1 — As-Designed Behavior

### 1.1 Chip render

A `PrayerCard` with `prayer.scriptureReference` set renders `<ScriptureChip reference={prayer.scriptureReference} />`. The chip parses the reference:
- Valid verse-level reference (e.g., `'Romans 8:28'`) → links to `/bible/<book>/<chapter>?verse=<n>&scroll-to=<n>`
- Chapter-only reference (e.g., `'Romans 8'`) → unlinked span (existing behavior, unchanged)
- Unparseable reference → unlinked span (existing behavior, unchanged)
- Range reference (e.g., `'Romans 8:28-30'`) → links to first verse per R3 default

### 1.2 Chip click → navigation

User taps the chip's `<Link>`. React Router navigates to `/bible/<book>/<chapter>?verse=<n>&scroll-to=<n>`. PrayerWall unmounts. BibleReader mounts.

### 1.3 BibleReader auto-scroll

BibleReader's existing mechanism at `BibleReader.tsx:424-433`:
1. Captures `searchParams.get('scroll-to')` into `scrollToParamRef` on mount (ref, not state — so subsequent URL changes don't re-trigger).
2. After chapter content loads, scrolls to the verse, applies one-shot arrival glow.
3. The `?scroll-to=` param is cleaned (per BB-38 contract; specifics in BibleReader); `?verse=` remains as persistent selection.

No changes to BibleReader required.

### 1.4 Round-trip from Bible back to Prayer Wall

Out of scope. 7.2 is one-way (Prayer Wall → Bible). The Bible → Prayer Wall direction is 7.1's `prayWithPassage` action.

### 1.5 Per-post-type verification

After 7.1 ships, a PrayerCard for any of the 5 post types can carry `scriptureReference`. Per MPD-7, tests assert the chip renders correctly across all 5 types.

---

## Section 2 — Gates

- **Gate-G-SCROLL-TO-PRESENT.** Every chip link MUST include `?scroll-to=<n>` when the parsed reference has a verse number. Test asserts the URL contains `scroll-to=` substring.
- **Gate-G-VERSE-AND-SCROLL-TO-MATCH.** When both `?verse=` and `?scroll-to=` are set, they must reference the same verse number. Test asserts equality.
- **Gate-G-CHAPTER-ONLY-UNLINKED.** A chapter-only reference (no verse) renders as an unlinked span. Test verifies the link is absent and only the text + icon appear.
- **Gate-G-EXISTING-PRAYERCARD-TEST-UNCHANGED.** The existing `PrayerCard.test.tsx:375-379` test continues to pass without modification — the chip surfaces correctly on a Discussion post and the link's aria-label matches `/Read Romans 8:28 in the Bible/`.
- **Gate-G-FOUR-PW-ROUTES.** Tests cover the chip surfacing on PrayerCards across all 4 Prayer Wall routes (PrayerWall, PrayerDetail, PrayerWallProfile, PrayerWallDashboard). At minimum: one test per route confirming a PrayerCard with scripture renders the chip with the correct link.
- **Gate-G-FIVE-POST-TYPES.** Tests cover the chip surfacing on all 5 post types (prayer_request, testimony, question, discussion, encouragement) once 7.1 has activated the field across types.
- **Gate-G-CRISIS-CARD-CHIP-VISIBLE.** Crisis-flagged cards still render the chip per R5 default. Test asserts the chip is present on a crisis-flagged DISCUSSION_WITH_SCRIPTURE fixture.
- **Gate-G-RANGE-FALLBACK.** Range references (e.g., `Romans 8:28-30`) link to the first verse per R3 default. Test verifies the URL points to `?verse=28&scroll-to=28` (not undefined, not the whole range).
- **Gate-G-NO-BIBLEREADER-CHANGES.** BibleReader.tsx is NOT modified. The receiving end of the chip already works; 7.2 is chip-side only. A code-review check verifies no diffs land in BibleReader files.

---

## Section 3 — Tests

Stub says minimum 4. Realistic count is higher given the per-route + per-type coverage. Sketch:

**ScriptureChip (3–4 tests, extending existing `ScriptureChip.test.tsx`):**
- New: `chip URL includes ?scroll-to=<n> alongside ?verse=<n>` (Gate-G-SCROLL-TO-PRESENT)
- New: `?verse= and ?scroll-to= reference the same verse number` (Gate-G-VERSE-AND-SCROLL-TO-MATCH)
- New: `range reference links to first verse` (Gate-G-RANGE-FALLBACK)
- Regression: chapter-only fallback unchanged

**Per-route coverage (4 tests, one per Prayer Wall route):**
- `PrayerWall.test.tsx` — render PrayerWall feed with a card carrying scripture; assert chip's link has both params
- `PrayerDetail.test.tsx` — render PrayerDetail page for a prayer with scripture; assert chip's link has both params
- `PrayerWallProfile.test.tsx` — render profile with a user's prayers including one with scripture; assert chip surfaces with both params
- `PrayerWallDashboard.test.tsx` — render dashboard mosaic with a card carrying scripture; assert chip surfaces with both params

**Per-post-type coverage (5 tests OR 1 parameterized test, extending `PrayerCard.test.tsx`):**
- For each of prayer_request, testimony, question, discussion, encouragement: render PrayerCard with the type + `scriptureReference: 'Romans 8:28'`; assert chip surfaces with correct link.
- Parameterized: a single test iterates over the 5 types and asserts each renders the chip.

**Crisis-flag preservation (1 test):**
- Render PrayerCard with crisis flag + scripture; assert chip still visible (Gate-G-CRISIS-CARD-CHIP-VISIBLE)

**Optional integration test (1 test):**
- Render PrayerWall, click a chip, assert React Router navigates to expected `/bible/<book>/<chapter>?verse=<n>&scroll-to=<n>`. Validates the click handler wiring end-to-end on the chip-emitting side.

Total: ~10–14 tests. Comfortably above the 4 minimum and proportional to the per-route + per-type matrix.

---

## Section 4 — Anti-Pressure + Privacy Decisions

- The chip is informational, not promotional. No "Read more" / "Open Bible" CTA copy; the existing label "Read X in the Bible" via aria-label is appropriate. Don't add a tooltip or hover-state copy that pressures the user toward action.
- Crisis-flagged cards retain the chip per R5 default. Scripture is sanctuary, not engagement-bait.
- The chip on PrayerWall (feed view) and on individual PrayerDetail pages should look IDENTICAL. No A/B variation for engagement metrics.
- Per 7.1's privacy decisions, the scripture field on a posted prayer is a property of the post; navigating from chip to Bible does NOT log analytics, does NOT track conversion, does NOT contribute to streaks.

---

## Section 5 — Deferred / Out of Scope

- **Bible → Prayer Wall direction (`prayWithPassage` action).** That's 7.1's territory. Round-trip from Bible already supports forwarding scripture to composer per 7.1.
- **Hash-anchor URL format (`#verse-<n>`).** Stub AC said this; live code uses `?scroll-to=` query. Reconciled per MPD-1. If Eric later wants hash-anchor URLs for shareability, that's a separate spec touching BibleReader's deep-link contract and the BB-38 mechanism.
- **Range highlight (the verse range visually highlighted, not just scrolled to).** The current `?scroll-to=` is a single verse number. Extending to a range (e.g., `?scroll-to=28-30` to highlight 3 verses with the arrival glow) is out of scope. R3's default is "scroll to first verse" — adequate.
- **Multi-passage chips (e.g., chip representing `Romans 8:28; Phil 4:13`).** Not currently supported by `scriptureReference` schema (single reference string). Out of scope.
- **Cross-chapter ranges (`Genesis 1:31 - 2:3`).** Same — out of scope unless `parseReference` already handles it (plan-recon confirms; if not, defer).
- **Music / Daily Hub cross-feature bridges.** 7.3 and beyond.
- **`useNotifications` mock-data flake, Bible data layer consolidation, framework majors, X-RateLimit-* standardization.** All still parked from prior specs.

---

## Pipeline Notes

- **`/playwright-recon` (optional but recommended for this spec):** Capture the chip's current visual treatment on PrayerCard across the 4 Prayer Wall routes BEFORE making changes. The chip itself isn't changing visually — only its URL — but a baseline lets you verify nothing regressed.
- **`/spec-forums`:** Produces this spec file at `_specs/forums/spec-7-2.md` from the brief at `_plans/forums/spec-7-2-brief.md`.
- **`/plan-forums`:** Resolves R1–R5. R1 is load-bearing (URL format reconciliation). Any gate returning NO surfaces to Eric.
- **`/execute-plan-forums`:** Implements per the resolved plan. Most of the work is test coverage; the single material code change is one line in `ScriptureChip.tsx` to add `?scroll-to=`.
- **`/code-review`:** Standard pass. Specifically check: no BibleReader changes (Gate-G-NO-BIBLEREADER-CHANGES).
- **`/verify-with-playwright`:** Visual + functional verification of chip click → reader scroll on at least one route. The four-route coverage is mostly test territory; manual verification of one route confirms the end-to-end works.
- **Eric commits manually** when satisfied.

---

## See Also

- `_forums_master_plan/round3-master-plan.md` Spec 7.2 stub (master plan lines 6388–6401, tracker row 94)
- `_plans/forums/spec-7-2-brief.md` — the source brief this spec was extracted from
- `frontend/src/components/prayer-wall/ScriptureChip.tsx` — the chip component (only material code change here, line 29-30 area)
- `frontend/src/components/prayer-wall/PrayerCard.tsx:19,271-275` — chip mount point on PrayerCard
- `frontend/src/components/prayer-wall/__tests__/ScriptureChip.test.tsx` — existing chip tests to extend
- `frontend/src/components/prayer-wall/__tests__/PrayerCard.test.tsx:375-379` — existing PrayerCard chip test (regression-protected)
- `frontend/src/pages/BibleReader.tsx:424-433` — receiving end of `?scroll-to=` param (NOT modified by this spec)
- `frontend/src/pages/BiblePlanDay.tsx:188-199` — canonical example of building a reader URL with both `?scroll-to=` and `?verse=` (the pattern ScriptureChip should mirror)
- `frontend/src/pages/__tests__/BibleReader.deeplink.test.tsx:466-491` — existing scroll-to tests (pattern to mirror for the optional integration test)
- `frontend/src/lib/search/reference-parser.ts` — `parseReference` returns the verse number used in the chip URL
- `_specs/forums/spec-7-1.md` — sibling spec (7.1 enables the field across all 5 post types; 7.2 verifies the chip works for them)
- `_plans/forums/spec-6-12-cutover-checklist.md` — Phase 6 cutover, prior wave close
- BB-38 — the Bible reader's deep-link contract (referenced in BiblePlanDay.tsx code comments lines 190–192)
