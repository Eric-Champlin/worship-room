# Forums Wave: Spec 7.1 — Bible to Prayer Wall Bridge

**Master Plan Reference:** `_forums_master_plan/round3-master-plan.md` → Spec 7.1 stub (tracker row 93). Size L, Risk Medium, prerequisites "Phase 6 complete." Eight-AC checklist covering Bible-side menu entry, navigation, composer pre-fill, post-type chooser, scripture chip linking back to Bible, round-trip across all post types, brand voice review, and ≥12 tests.

**Brief Source:** This brief, authored 2026-05-16 against the live master plan stub + live code recon.

**Branch:** `forums-wave-continued` (per W1 — Phase 7 opens on the same branch Phase 6 closed on; CC never alters git state; Eric handles all commits manually).

**Date:** 2026-05-16.

**Spec ID:** `round3-phase07-spec01-bible-to-prayer-wall`

**Phase:** 7 (Cross-Feature Integration) — the first spec.

**Size:** L

**Risk:** Medium — the spec touches two large surfaces (Bible reader + Prayer Wall composer) plus introduces a new cross-feature URL contract. Risk is bounded because the relevant frontend composer signature already accepts the scripture pair for all post types per the recon below; the work is wiring + UX, not new contracts. The genuinely new piece is the post-type chooser UX (see R3 below).

**Tier:** Standard — engineering work, normal pipeline (spec → plan → execute → review → verify).

---

## Affected Frontend Routes

- `/bible/:bookSlug/:chapter` (Bible reader — new verse action entry mounted by `VerseActionSheet` via `verseActionRegistry`)
- `/prayer-wall` (composer auto-opens with pre-filled scripture via new `?scripture=` query param + `?compose=<postType>` query param — see R5 for exact URL contract)
- `/prayer-wall/:id` (PrayerCard already renders the scripture chip with "Read X in the Bible" link per recon — round-trip terminus, no UI changes)
- `/prayer-wall/dashboard`, `/prayer-wall/user/:id`, `/prayer-wall/answered` (any route that renders PrayerCard inherits the existing scripture chip — verify each via test)

`/bible` (Bible landing) is NOT in scope — the action lives at verse selection level, not landing.

---

## STAY ON BRANCH

Same as Phase 6 — stay on `forums-wave-continued`. No `git checkout`, `git branch`, `git commit`, `git push`, `git stash`, `git reset`, `git rebase`, `git merge`, `gh pr create`, or any other git-state-mutating command at any phase (spec, plan, execute, review). Eric handles git manually. Read-only git inspection (`git status`, `git diff`, `git log`, `git show`, `git blame`) is permitted.

---

## Spec-time Recon Summary (verified on disk 2026-05-16)

Every claim below cites live code. Plan-recon re-confirms at execute time.

| Item | Status | Evidence |
|---|---|---|
| `ScriptureReferenceInput` component already exists as a full component (not a field) | ✅ | `frontend/src/components/prayer-wall/ScriptureReferenceInput.tsx:23-25` — state machine `'empty' \| 'invalid' \| 'chapter-only' \| 'looking-up' \| 'valid'`; validates via `parseReference` (from `@/lib/search/reference-parser`) + `loadChapterWeb` (from `@/data/bible`) |
| `InlineComposer` submit-handler signature already accepts `scriptureReference?` + `scriptureText?` for ALL post types | ✅ | `frontend/src/components/prayer-wall/InlineComposer.tsx:179-180` — type signature on the submit-handler callback. Code comment at line 176–178 explicitly says *"for postType === 'discussion' in 4.5; future post types may opt in."* |
| `showScriptureReferenceField` is a per-post-type COPY config flag, not a global toggle | ✅ | `InlineComposer.tsx:48` — `showScriptureReferenceField?: boolean` on `ComposerCopy` type. Renders the `<ScriptureReferenceInput>` block conditionally at `InlineComposer.tsx:512-518` |
| `discussion` is currently the ONLY post type with `showScriptureReferenceField: true` | ✅ | `InlineComposer.tsx:129` (`discussion` block). `prayer_request` (:76-90), `testimony` (:91-104), `question` (:105-…), `encouragement` (:132-146) — none set the flag. Code comment at line 46 reads: *"Currently set only on `discussion`."* |
| `scriptureResetKey` remount pattern handles aria-hidden/inert lifecycle | ✅ | `InlineComposer.tsx:240-247` — explanatory comment block; bumping `scriptureResetKey` on success/cancel discards stale child instance |
| `PrayerCard` already renders the scripture chip with "Read X in the Bible" link | ✅ | `frontend/src/components/prayer-wall/PrayerCard.tsx:271-275` (conditional render on `prayer.scriptureReference`). Confirmed by test at `__tests__/PrayerCard.test.tsx:375-379` — `screen.getByRole('link', { name: /Read Romans 8:28 in the Bible/ })` |
| Verse action infrastructure is `VerseActionSheet.tsx` + `verseActionRegistry.ts` (NOT `VerseActionMenu`) | ✅ | `frontend/src/components/bible/reader/VerseActionSheet.tsx:9-15` imports registry types from `@/lib/bible/verseActionRegistry`. The stub said "VerseActionMenu (or equivalent)" — the equivalent is `VerseActionSheet` |
| `verseActionRegistry` has 14 registered handlers, including an EXISTING `pray` action | ✅ | `frontend/src/lib/bible/verseActionRegistry.ts` — `highlight` (:112), `note` (:183), `bookmark` (:214), `share` (:283), **`pray` (:298-301)**, `journal` (:313), `meditate` (:328), `crossRefs` (:343), `explain` (:356), `reflect` (:368), `ask` (:380), `memorize` (:395), `copy` (:443), `copyWithRef` (:459). The existing `pray` action's label is `'Pray about this'` with sublabel `'Open in Daily Hub · Pray'` — it routes to Daily Hub, NOT Prayer Wall composer |
| `PrayerWall.tsx` already uses `useSearchParams` for query-param-driven UI | ✅ | `frontend/src/pages/PrayerWall.tsx:5` (import), `:162-165` (`searchParams.get('category')` + `searchParams.get('postType')` for category filter + post-type filter) |
| `/prayer-wall/compose` route does NOT exist | ⚠️ | The stub references `/prayer-wall/compose?scripture=...&postType=...`. Grep across `frontend/src` returns ZERO matches for `path="/prayer-wall/compose`. The composer renders inline on `/prayer-wall` (existing route). The URL contract in the stub needs to be reconciled to what actually exists — see R5 |

**Recon override:** Three stub claims are wrong; the brief reconciles them rather than perpetuating them. See R1, R3, R5 below.

---

## Major Plan Decisions (MPD) — baked into this brief

**MPD-1.** Render the field for ALL FIVE post types (`prayer_request`, `testimony`, `question`, `discussion`, `encouragement`). The composer signature already accepts the pair for all types (recon row 2). The only change is flipping `showScriptureReferenceField: true` in each non-discussion `composerCopyByType` entry at `InlineComposer.tsx:76-146`.

**MPD-2.** Render `<ScriptureReferenceInput>` IDENTICALLY across all five types. Same component, same validation, same `scriptureResetKey` lifecycle. No per-type variant. The pre-fill mechanism (new `prefilledScripture?: string` prop on `InlineComposer`) is also identical across types — it's passed straight to `ScriptureReferenceInput`'s initial `rawInput`. This avoids per-type drift and keeps the field's behavioral contract single-sourced.

**MPD-3.** Add a NEW verse action handler `prayWithPassage` distinct from the existing `pray` handler. Do NOT modify or repurpose the existing `pray` action. The existing action ships a Daily Hub workflow (sublabel `'Open in Daily Hub · Pray'`) that users may already know. Naming and sublabel for the new action must differentiate clearly — see R3.

**MPD-4.** The Prayer Wall query-param contract is `/prayer-wall?compose=<postType>&scripture=<reference>` where `<postType>` is one of the five canonical types and `<reference>` is the URL-encoded scripture reference (e.g., `John+14%3A1-3` or `John+14:1-3`). NO new `/prayer-wall/compose` sub-route. Reuse the existing `useSearchParams` mechanism in `PrayerWall.tsx:162`. See R5.

**MPD-5.** Round-trip is already shipped on the read side per the recon (`PrayerCard.tsx:271-275`). The brief asserts the round-trip works *because* the existing chip already exists. No new chip code; the spec verifies via test that scripture pre-filled from a Bible action surfaces correctly on the resulting PrayerCard across all five post types and that the chip's "Read X in the Bible" link navigates back to the originating chapter.

**MPD-6.** Backend: no schema changes assumed. The `posts.scripture_reference` and `posts.scripture_text` columns shipped in Phase 4.5 with the discussion field, and `PostService` already persists the pair regardless of post type. Plan-recon R4 verifies this.

---

## Plan-Recon Gating Questions (R1–R8)

These are load-bearing. Plan-recon MUST resolve each before execute. Phase 6 established the pattern: an R-gate that returns NO at plan-recon time either reframes the spec or defers it (cf. 6.10 deferral to Phase 8, 6.11 collapse to audit+coverage).

**R1 — Existing `pray` action coexistence.** Does the existing `pray` handler at `verseActionRegistry.ts:298-301` stay unchanged, with the new `prayWithPassage` handler added alongside it? Or does the existing `pray` action get repurposed? **Default per MPD-3:** ADD a new handler, do NOT modify the existing one. Plan-recon confirms by reading both handlers and verifying the existing `pray` action's destination (Daily Hub) is still desired UX. If Eric's intent has shifted (i.e., "replace the Daily Hub destination with Prayer Wall"), plan-recon surfaces and Eric decides.

**R2 — Naming and sublabel differentiation for the new action.** Two adjacent actions in the same sheet with similar labels ("Pray about this" / "Pray with this passage") risk confusion. Plan-recon picks the differentiating language. Initial brief proposal: existing stays `'Pray about this'` / `'Open in Daily Hub · Pray'`; new is `'Pray with this passage'` / `'Open Prayer Wall composer'`. Plan-recon may iterate. The sublabel is the disambiguator — keep it explicit.

**R3 — Post-type chooser placement (load-bearing UX decision).** Two options:
- (a) **Bible-side submenu.** The `prayWithPassage` action expands a submenu inside `VerseActionSheet` with five post-type options. User taps a type → navigation fires with `?compose=<type>&scripture=<ref>`. Uses `hasSubView` pattern already established by other verse actions (see `verseActionRegistry.ts:42-46` — `hasSubView: true` mounts a sub-view inside the sheet).
- (b) **Prayer Wall-side picker.** The action navigates with only `?scripture=<ref>` (no post type). `PrayerWall.tsx` detects the missing `compose` param, shows a post-type picker modal/popover, user picks, composer opens pre-filled.

**Default per the stub language ("or whichever post type the user picks from a quick chooser"):** (a) Bible-side submenu. It keeps the decision local to the action and avoids two-step navigation. Plan-recon confirms by reading existing `hasSubView` implementations (see `crossRefs`, `explain`, `reflect` for examples) and proposing a sketch. If the submenu approach has technical friction with `VerseActionSheet`'s deep-link allowlist (`DEEP_LINKABLE_ACTIONS` per `VerseActionSheet.tsx:20`), plan-recon surfaces and Eric picks.

**R4 — Backend `CreatePostRequest` schema confirmation.** The brief assumes `posts.scripture_reference` and `posts.scripture_text` ship for all post types from Phase 4.5. Plan-recon verifies by reading:
- `backend/src/main/java/com/worshiproom/post/CreatePostRequest.java` (or equivalent DTO) — confirm `scriptureReference` + `scriptureText` are fields, not filtered by post type
- `backend/src/main/java/com/worshiproom/post/PostService.java` — confirm `createPost` writes both columns regardless of `postType`
- The most recent Liquibase changeset that added the scripture columns — confirm no `@CheckConstraint` restricts them to `post_type = 'discussion'`

If any of those checks return NO (e.g., a CHECK constraint restricts to discussion), the spec grows a backend column-constraint-relaxation step. Plan-recon catches it.

**R5 — URL contract reconciliation.** The stub said `/prayer-wall/compose?scripture=...&postType=...`. The route does NOT exist (recon row 10). The brief's MPD-4 reconciles to `/prayer-wall?compose=<postType>&scripture=<reference>`. Plan-recon confirms the chosen contract is implementable with current `useSearchParams` + the InlineComposer auto-open mechanism. Specifically: how does `PrayerWall.tsx` currently open the InlineComposer? Is it state-driven (a `composeOpen` boolean), event-driven (button click handler), or both? Plan-recon reads the existing trigger and decides whether the new query-param effect (a) toggles the existing state mechanism or (b) needs a new path. The brief assumes (a) — a `useEffect` that reads `searchParams.get('compose')` on mount and toggles existing state.

**R6 — Reference encoding edge cases.** Scripture references can include colons (`John 14:1`), dashes (`John 14:1-3`), and spaces (`Song of Solomon 2:1`). Plan-recon verifies:
- The `parseReference` function (`@/lib/search/reference-parser`) handles URL-decoded input cleanly (e.g., `John+14:1-3` decodes to `John 14:1-3` and parses)
- `ScriptureReferenceInput` accepts the decoded value as `initialRawInput` and reaches the `'valid'` state automatically on mount (vs. requiring user input)
- The verse action's navigation URL uses standard `encodeURIComponent` on the reference string, not custom encoding

If `parseReference` rejects edge-case references the plan-recon catches, the brief grows a one-line fix to `parseReference` or the URL contract changes (e.g., separate `book`, `chapter`, `verseStart`, `verseEnd` query params instead of a single `scripture` string).

**R7 — Anonymous-author + crisis-flag interaction with pre-fill.** The composer's anonymous toggle, category fieldset, and crisis detector run on submit regardless of pre-fill. Plan-recon confirms:
- Pre-fill does NOT bypass any anti-pressure or safety gate
- The pre-filled scripture reference does NOT contribute to crisis detection (`PostService.PostCrisisDetector` should ignore the `scripture_text` field per the Spec 4.5 + 6.6b-deferred-2 detection contract — verify by reading `PostService.java` lines 545–575)
- The Watch crisis-suppression composer-placeholder swap (6.4) still applies if Watch is active when the user navigates from Bible → Prayer Wall

If crisis detection currently includes `scripture_text`, the spec MUST exclude pre-filled scripture from contributing to a false crisis flag (a Psalm 22 reference legitimately quotes "forsaken" — see Universal Rule 13).

**R8 — Composer drafts (6.9) interaction with pre-fill.** What happens when a user has a saved composer draft for a given post type and then navigates from Bible with a different scripture pre-fill?
- Option (a): Restore prompt suppressed; pre-fill wins (new context).
- Option (b): Restore prompt shown as usual; user picks; if they restore the draft and the draft has a different scripture, the pre-fill is ignored.
- Option (c): Restore prompt shown with a third button "Restore draft with new scripture" — merges the draft text with the new pre-filled reference.

**Default per Phase 6's W1 dirty-flag pattern:** (b) — the draft restore flow is owned by `useComposerDraft`; pre-fill is a separate concern that loses to a user's saved-in-progress work. Plan-recon confirms and adjusts if Eric picks (a) or (c).

---

## Section 1 — As-Designed Behavior

### 1.1 Bible-side entry (R3)

From any verse on `/bible/:bookSlug/:chapter`, long-press (or tap, depending on platform) opens `VerseActionSheet`. The sheet displays the new `prayWithPassage` action alongside the existing 14 actions, positioned per the registry order plan-recon decides (initial brief proposal: between `pray` and `journal`, since the three actions form a related cluster).

Tapping `prayWithPassage` mounts a sub-view (`hasSubView: true`) showing the five post-type options:
- Prayer request
- Testimony
- Question
- Discussion
- Encouragement

Labels match the existing composer copy headers from `InlineComposer.tsx:76-146` (e.g., `'Share a Prayer Request'`, `'Share a testimony'`, etc., shortened for the picker).

User picks a type → `routerNavigate` fires with `/prayer-wall?compose=<postType>&scripture=<encoded-reference>`. Sheet closes. Bible reader unmounts.

### 1.2 Prayer Wall-side receipt (R5)

`PrayerWall.tsx` mounts. The existing `useSearchParams` read at line 162 gets two new readers:
- `searchParams.get('compose')` — the post type to open
- `searchParams.get('scripture')` — the URL-decoded reference

A new `useEffect` on mount:
1. Validates `compose` is one of the five canonical post types. If invalid, no-op (page renders normally, no error toast — per Gate-G-DEEP-LINK-GRACEFUL from 6.2b).
2. Validates `scripture` parses cleanly via `parseReference`. If invalid, opens the composer for the requested type with NO pre-fill (graceful), surfaces a quiet toast `'Couldn't load that reference — you can type it in.'`
3. Both valid: opens the InlineComposer for the requested type with `prefilledScripture` prop set to the decoded reference string.

### 1.3 Composer pre-fill (R8)

`InlineComposer` accepts a new optional prop `prefilledScripture?: string`. On mount:
1. If `prefilledScripture` is set AND no composer draft exists for this post type, pass `prefilledScripture` as `initialRawInput` to `<ScriptureReferenceInput>`. The input auto-validates and reaches the `'valid'` state (if the reference resolves) or `'invalid'`/`'chapter-only'` (graceful fallback).
2. If `prefilledScripture` is set AND a composer draft exists for this post type, defer to the existing `<RestoreDraftPrompt>` flow (per R8 default).
3. If `prefilledScripture` is NOT set, behave exactly as today.

The URL is replaced (`?compose=...&scripture=...` cleared) immediately after the composer opens, so reloading the page doesn't re-trigger the auto-open and so the user's pre-fill doesn't get re-applied if they cancel and recompose.

### 1.4 Submit + scripture chip

User writes content, optionally edits the pre-filled scripture (the field is editable post-pre-fill — user can remove or change it), submits.

`InlineComposer`'s existing submit handler ships `{scriptureReference, scriptureText}` in the call signature it already supports. `PostService` writes both columns. Per recon row 6, `PrayerCard` already renders the chip with the "Read X in the Bible" link. The chip's `href` resolves to `/bible/<bookSlug>/<chapter>?highlight=<verseStart>-<verseEnd>` (or whatever the existing chip implementation uses — plan-recon verifies the exact href shape).

### 1.5 Round-trip

From the Prayer Wall card, user taps the scripture chip → navigates back to `/bible/<bookSlug>/<chapter>` with the verse highlighted. The Bible reader's existing `?highlight=` mechanism handles the highlight (Spec 4.5 already wired this on the Discussion path; the brief verifies the same path works from the four newly-enabled types).

---

## Section 2 — Gates

- **Gate-G-EXISTING-PRAY-UNCHANGED.** The existing `pray` action at `verseActionRegistry.ts:298` is NOT modified. Its destination, label, sublabel, icon, and ordering remain. A regression test asserts this.
- **Gate-G-FIVE-TYPES-IDENTICAL-FIELD.** All five post types render `<ScriptureReferenceInput>` identically (per MPD-2). A test iterates the five types and asserts the field renders with consistent ARIA label `/Scripture reference \(optional\)/i` per `InlineComposer.test.tsx:645`.
- **Gate-G-DEEP-LINK-GRACEFUL.** Invalid `?compose=` or invalid `?scripture=` does NOT toast-error or render an empty composer. The page renders normally; invalid scripture surfaces only the quiet fallback toast per 1.2.
- **Gate-G-DRAFT-WINS.** Pre-fill DOES NOT override a saved draft (per R8 default). The `<RestoreDraftPrompt>` flow runs first; if user picks "Start fresh," the pre-fill applies; if "Restore draft," the pre-fill is discarded.
- **Gate-G-URL-CLEARED-ON-OPEN.** The composer-open effect immediately clears `?compose=` and `?scripture=` from the URL (via `setSearchParams({}, { replace: true })`) so the auto-open is not idempotent across reloads and so back-navigation doesn't re-trigger.
- **Gate-G-NO-PRAYER-SCRIPTURE-CRISIS-FALSE-POSITIVE.** Pre-filled `scripture_text` does NOT contribute to `PostCrisisDetector` input (per R7). The detection contract scans `content` (and `answered_text` per 6.6b-deferred-2). It MUST NOT scan `scripture_text` — a quoted lament should never crisis-flag a post.
- **Gate-G-WATCH-RESPECTED.** If Watch (6.4) is active when the user lands on `/prayer-wall?compose=...`, the Watch composer placeholder swap and CrisisResourcesBanner still apply. Pre-fill does NOT bypass Watch UX.
- **Gate-G-A11Y.** Bible-side: the new submenu is keyboard-reachable, focus-trapped per `useFocusTrap` (already used by `VerseActionSheet.tsx:5`), and the back arrow restores focus to the `prayWithPassage` button. Prayer Wall-side: the auto-opened composer's first focusable element receives focus after navigation, and screen readers announce the composer mount (use existing `announceText` pattern if present, or a `role="status"` live region for the cross-feature transition).
- **Gate-G-RTL-ROUND-TRIP-ALL-TYPES.** Tests verify scripture chip surfaces on PrayerCards across all five types AND the chip's link navigates back to the Bible correctly (read-side verification — the chip is already shipped, but the test set must explicitly cover the four newly-enabled types).
- **Gate-G-BRAND-VOICE.** Copy review for: (a) the new action label + sublabel (R2), (b) the post-type submenu labels, (c) the invalid-scripture fallback toast text, (d) any new microcopy. The Anti-Pressure Design Decisions block from prior specs applies — no "start praying" pressure, no "share with the community" if the user is private-mode.

---

## Section 3 — Tests

Minimum 12 per the stub. Realistic count is higher; a sketch:

**Bible-side (4–6 tests):**
- `verseActionRegistry.test.ts` — `prayWithPassage` is registered, has correct label/sublabel/icon, `hasSubView` is true if R3 picks option (a)
- `VerseActionSheet.test.tsx` — tapping `prayWithPassage` opens submenu; submenu shows five post-type options; existing `pray` action unchanged (regression)
- `VerseActionSheet.test.tsx` — picking a post type fires navigation with correct URL shape
- (If R3 picks option (b)) test for Prayer-Wall-side picker rendering

**Prayer Wall-side (4–5 tests):**
- `PrayerWall.test.tsx` — valid `?compose=<type>&scripture=<ref>` opens composer for that type with pre-fill
- `PrayerWall.test.tsx` — invalid `?compose=` no-ops gracefully
- `PrayerWall.test.tsx` — invalid `?scripture=` opens composer with no pre-fill + quiet fallback toast
- `PrayerWall.test.tsx` — URL is cleared after composer opens (`?compose=` + `?scripture=` removed from `location.search`)
- `PrayerWall.test.tsx` — saved draft for that post type wins over pre-fill (Gate-G-DRAFT-WINS)

**InlineComposer + ScriptureReferenceInput (3–4 tests):**
- `InlineComposer.test.tsx` — `prefilledScripture` prop sets `ScriptureReferenceInput` initial state to the reference
- `InlineComposer.test.tsx` — all five post types now render `<ScriptureReferenceInput>` (Gate-G-FIVE-TYPES-IDENTICAL-FIELD; iterate the five types)
- `InlineComposer.test.tsx` — pre-fill survives a category-error blocked submit and is still present after the user corrects the category
- `InlineComposer.test.tsx` — anonymous-toggle, crisis-detection, and ways-to-help-picker behavior unchanged for the four newly-enabled types (regression)

**Backend (1–2 tests):**
- `PostServiceTest.java` (or wherever the scripture pair write path is tested) — verify all five post types accept and persist `scripture_reference` + `scripture_text` (R4 confirms the backend already does this; tests assert the contract)
- `PostCrisisDetectorTest.java` — confirm `scripture_text` is NOT part of `detectionInput` (Gate-G-NO-PRAYER-SCRIPTURE-CRISIS-FALSE-POSITIVE)

**Round-trip (1–2 tests):**
- `PrayerCard.test.tsx` — chip surfaces on all five post types (extend the existing `DISCUSSION_WITH_SCRIPTURE` test fixture pattern to all five)
- E2E or integration: user clicks chip on a `prayer_request` PrayerCard — navigates back to Bible with correct verse highlighted

Total: ~14–20 tests. Comfortably above the 12 minimum.

---

## Section 4 — Anti-Pressure + Privacy Decisions

- The action label is `'Pray with this passage'` — a verb form that suggests companionship, not performance.
- The submenu's post-type labels do NOT include emoji or urgency cues. Match the existing composer header convention.
- Pre-filled scripture is EDITABLE. The user can remove it (clear the field) before submit. The field is not required for any post type — same as today on Discussion.
- The fallback toast for invalid scripture is gentle: `'Couldn't load that reference — you can type it in.'` No error icon, no red color, no "Try again" CTA.
- Pre-fill does NOT automatically set the post to public. The anonymous toggle's default (per the existing Spec 4.5 / 4.6 logic) governs.
- If the user navigates from Bible to Prayer Wall during Watch hours (6.4 active), the Watch composer placeholder still applies. The pre-fill coexists with Watch UX — the placeholder is the *prompt copy*, the pre-fill is the *scripture field*; they don't conflict.

---

## Section 5 — Deferred / Out of Scope

- **Daily Hub Pray destination reconciliation.** The existing `pray` action routes to Daily Hub. Whether to ever consolidate the two paths (`prayWithPassage` → Prayer Wall composer vs. `pray` → Daily Hub Pray) is a Phase 7+ UX decision, NOT 7.1's territory. The brief explicitly leaves both actions coexisting per MPD-3.
- **Music ↔ Prayer Wall bridge.** Phase 7's broader cross-feature arc may include a similar bridge from Music (e.g., "Pray with this song"). Out of scope here.
- **Daily Hub ↔ Prayer Wall bridge.** Same. Future spec.
- **Cross-route Celebrate + Praising (6.6b-deferred-4).** Phase 6 leftover. Still parked.
- **6.6b-deferred-1 (CommentInput placeholder), -3 (anonymous-author affordances).** Still parked.
- **`useNotifications` mock-data flake.** Still parked (S3 from the pre-Phase-7 audit).
- **Bible data layer consolidation (`books/json/` removal).** Still parked (S1 from the pre-Phase-7 audit).
- **Framework majors (React 19, Vite 8, Tailwind 4, TS 6).** Still parked. Dedicated future spec.
- **Phase 3 `X-RateLimit-*` standardization.** Still parked (tracker line 180).

---

## Pipeline Notes

- **`/playwright-recon` (optional):** Worth running BEFORE `/spec-forums` to capture current Bible reader + VerseActionSheet + Prayer Wall composer screenshots as the visual baseline. The new submenu (if R3 picks option (a)) is a new visual surface; recon-time captures help verify it later. If skipped, plan-recon stands in as the recon gate.
- **`/spec-forums`:** Produces the actual spec file at `_specs/forums/spec-7-1.md` from this brief.
- **`/plan-forums`:** Resolves R1–R8. Any gate that returns NO surfaces to Eric; the brief is reframed or the spec is deferred. Plan output at `_plans/forums/2026-05-16-spec-7-1.md` (or whatever date the plan lands).
- **`/execute-plan-forums`:** Implements per the resolved plan. Pre-execution uncommitted-files check (the safety net added after the March 2026 incident). Eric reviews the execute output BEFORE running `/code-review`.
- **`/code-review`:** Standard pass.
- **`/verify-with-playwright`:** Visual verification of the new submenu (Bible side) + the auto-open composer (Prayer Wall side) + the round-trip chip (read side, but worth re-verifying across all five types).
- **Eric commits manually** when satisfied.

---

## See Also

- `_forums_master_plan/round3-master-plan.md` Spec 7.1 stub (tracker row 93)
- `frontend/src/components/prayer-wall/InlineComposer.tsx` — the composer being extended
- `frontend/src/components/prayer-wall/ScriptureReferenceInput.tsx` — the field component being pre-filled
- `frontend/src/components/prayer-wall/PrayerCard.tsx:271-275` — the existing scripture chip (round-trip terminus)
- `frontend/src/components/bible/reader/VerseActionSheet.tsx` — the verse action sheet being extended
- `frontend/src/lib/bible/verseActionRegistry.ts` — the action registry being extended; existing `pray` handler at `:298`
- `frontend/src/pages/PrayerWall.tsx:162` — the existing `useSearchParams` reader being extended
- `frontend/src/lib/search/reference-parser.ts` — reference parsing used by `ScriptureReferenceInput`
- `_plans/forums/spec-6-12-cutover-checklist.md` — the Phase 6 cutover that closed the prior wave
- Universal Rule 13 (master plan ~line 750) — crisis-flag suppression contract that R7 confirms
- Universal Rule 17 (master plan line 823) — per-phase a11y smoke contract (Phase 7's eventual cutover applies)
