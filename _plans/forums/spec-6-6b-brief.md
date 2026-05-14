# Brief: Spec 6.6b — Answered Wall Drift Remediation

**Master plan reference:** `_forums_master_plan/round3-master-plan.md` (Spec 6.6 stub, live version, lines ~5625-5720) — ID `round3-phase06-spec06-answered-wall`

**Spec ID:** `round3-phase06-spec06b-answered-wall-drift-remediation`

**Phase:** 6 (Slow Sanctuary / Quiet Engagement Loop) — follow-up remediation spec

**Size:** L (Large)

**Risk:** Medium-High — a second DB CHECK-constraint migration on `post_reactions` (which has already been migrated once and carries a shipped behavior-fix), reaction-system changes, and the load-bearing anti-pressure copy of the Answered Wall

**Tier:** **xHigh** — a second permanent-MD5 Liquibase CHECK-constraint migration that must interact safely with 6.6's shipped `'candle'`→INTERCESSION fix; new reaction type wired through the full stack; the single most load-bearing copy line in the spec ("Gratitude, not comparison."); a deliberate anti-pressure design decision (Mental Health filter omission) that must be preserved with its rationale intact, not silently dropped again.

**Prerequisites:**
- 6.6 (Answered Wall) — ✅ SHIPPED and merged. 6.6b is a *correction layer on top of shipped 6.6*, not an independent feature. Everything 6.6b does presupposes 6.6's `/prayer-wall/answered` route, `AnsweredWall.tsx`, `AnsweredCard.tsx`, the `'praising'` reaction, and the `answered_at DESC` feed already exist.
- 6.1 (Prayer Receipt) — ✅ (`post_reactions` infrastructure)
- 5.6 (Redis cache) — required for the caching gap (MPD-5); plan-recon R6 confirms availability

**Pipeline:** This brief → `/spec-forums spec-6-6b-brief.md` → `/plan-forums spec-6-6b.md` → execute → review.

---

## 0. Why This Spec Exists — Read First

6.6b is not a feature spec. It is a **drift-remediation spec.** It exists because the original 6.6 brief was authored from a stale pristine-baseline copy of the master plan stub, and the live 6.6 stub had materially more scope than the brief captured. 6.6 executed and merged faithfully against the (incomplete) brief. A 2026-05-14 brief-drift audit caught the gap. The decision (Eric, 2026-05-14) was: keep shipped 6.6, write 6.6b to close the gaps. See the remediation note in `_forums_master_plan/spec-tracker.md` for the full context.

6.6b closes **exactly four gap areas**, plus their attendant smaller items. It adds NOTHING beyond what the live 6.6 stub already mandates. Every MPD in Section 4 is framed as "the live stub requires X; shipped 6.6 does not have X; 6.6b adds X" — these are *corrections*, not new ideas. If something is not in the live 6.6 stub, it is not in 6.6b.

The four gap areas:
1. **Hero copy** — shipped 6.6 has the wrong subhead and is missing the intro paragraph.
2. **`'celebrate'` reaction** — shipped 6.6 added only `'praising'`; the stub also requires `'celebrate'`.
3. **Category filter chips** — shipped 6.6 has none; the stub requires them, including a deliberate Mental Health omission.
4. **Answered-text lifecycle** — shipped 6.6 assumes `answered_text` is always present; the stub requires optional text, post-hoc edit, and un-mark.

Plus carried smaller items: Redis caching, expired-but-answered inclusion, deleted-author exclusion, the `<h2>` subhead landmark, "Celebrate" reduced-motion fallback.

---

## 1. Branch Discipline

Branch: `forums-wave-continued`. Eric handles all git operations manually. Claude Code NEVER commits, pushes, branches, merges, rebases, or alters git state at any phase. Violation is grounds to halt execute.

At execute-start, CC verifies via `git status` (read-only) that the working tree is clean except for any pending 6.6b work. `git stash` for diagnostic baseline-compare is permitted only if it brackets within the same turn.

**Out-of-band sign-off recording:** any plan-time divergence requiring Eric's sign-off is recorded in the plan's Execution Log when received, not retroactively.

---

## 2. Tier — xHigh

Four factors put 6.6b at xHigh.

**A second permanent-MD5 CHECK-constraint migration, on a table that already carries a shipped behavior-fix.**
6.6 shipped a Liquibase ALTER widening `post_reactions.reaction_type` from `('praying','candle')` to `('praying','candle','praising')`. 6.6b needs a SECOND ALTER to add `'celebrate'`. That is fine — it is the same append-only pattern — but it is the highest-stakes part of 6.6b for two reasons. First, like the first migration, its MD5 is permanent once it runs. Second, 6.6's execution also shipped a *behavior fix* in the same subsystem: `'candle'` reactions no longer fire the INTERCESSION activity event (a corrected Spec 3.7 drift, locked by regression tests). 6.6b's new reaction work must not disturb that fix. The `'celebrate'` reaction, like `'praising'`, must NOT fire INTERCESSION — and the existing `toggleCandle_addPath_doesNotFireIntercession` regression test must still pass untouched.

**A new reaction type wired through the full stack.**
`'celebrate'` is not just a DB value. It is: a CHECK-constraint widening, a backend enum/constant addition at every enumeration site, a frontend type-union addition, a new `CelebrateReaction.tsx` component with its own palette and animation, the Light-a-Candle→Celebrate swap on answered posts, separate count rendering, and — per 6.6's shipped pattern — possibly a denormalized `celebrate_count` column. Every one of those sites is a place the wiring can be incompletely applied.

**The single most load-bearing copy line in the spec.**
The live stub's out-of-band notes flag the hero subhead as the most important copy in 6.6. Shipped 6.6 got it wrong ("Prayers the community has watched God move in." instead of "Gratitude, not comparison."). Fixing it is small in code and large in intent — the whole anti-pressure posture of the Answered Wall rests on that line.

**A deliberate anti-pressure design decision that was silently dropped once already.**
The category filter chips deliberately OMIT a Mental Health chip, and the live stub devotes a full "Why no Mental Health filter" rationale section to it. Shipped 6.6 has no category filters at all, so the omission — and its rationale — was lost. 6.6b must reintroduce the chips WITH the omission AND carry the rationale forward into the code/comments so it cannot be "helpfully" re-added by a future contributor who doesn't know why it's absent.

**Practical execution implication:** xHigh means Opus 4.7 thinking `xhigh` for all phases. Eric reviews: the second Liquibase migration (append-only, MD5 implications, interaction with 6.6's candle-fix); the `'celebrate'` reaction wired through every enumeration site; the hero copy fix; the category filter chips + the preserved Mental Health rationale; the answered-text edit/un-mark flow; and a manual pass on the actual Answered Wall.

---

## 3. Visual & Integration Verification

### Frontend (Playwright + manual)

**Hero copy (gap 1):**
- The Answered Wall hero subhead reads exactly **"Gratitude, not comparison."** — NOT the shipped "Prayers the community has watched God move in."
- The subhead is Lora italic, rendered as an `<h2>` within the `<main>` landmark
- The "Answered" heading remains in Fraunces (shipped 6.6 already has this; verify it is unchanged)
- The short intro paragraph is present below the hero: "These are prayer requests whose authors chose to share an update…" (full text in D-Copy)
- The intro paragraph reads as calm context, not a CTA

**`'celebrate'` reaction (gap 2):**
- On an answered post, the reaction formerly shown as "Light a Candle" is shown as **"Celebrate"** with a warm sunrise palette and an animation distinct from Light-a-Candle's
- The "Praising with you" reaction (shipped in 6.6) is unchanged and still present
- Reaction counts render separately: "12 praising with you · 3 celebrating" (exact format in D-Copy)
- Tapping "Celebrate" records a `'celebrate'` reaction; tapping again removes it (toggle, consistent with all existing reactions)
- `'celebrate'` is only surfaced on answered posts — it is the answered-post replacement for Light-a-Candle, not a new reaction on regular posts
- The "Celebrate" animation respects `prefers-reduced-motion` (falls back to a single static state, no animation)
- WCAG AA contrast on the warm sunrise palette holds on both Night Mode and regular backgrounds

**Category filter chips (gap 3):**
- The Answered Wall shows filter chips: **"All" (default), "Health", "Family", "Work", "Grief", "Gratitude"**
- There is **NO "Mental Health" chip** — this omission is deliberate (see D-MentalHealthOmission and Gate-G-MH-OMISSION)
- Selecting a chip narrows the feed; the URL reflects it via `?category=health` (etc.)
- "All" is the default and clears any category filter
- Chips are keyboard-reachable and announce state ("Health, unselected" / "Health, selected")
- Chip selection state survives within the session as expected for a feed filter

**Answered-text lifecycle (gap 4):**
- An answered post with NO `answered_text` renders cleanly with the missing-text fallback copy — it does not look broken or empty (shipped 6.6 assumed text is always present)
- On the author's OWN answered post, a "Share an update" affordance lets them add `answered_text` if it is absent, or edit it if present
- The author can **un-mark** a post as answered (sets `is_answered=false`, `answered_at=NULL`); the post leaves the Answered Wall
- A non-author viewer never sees "Share an update" or the un-mark affordance
- Editing `answered_text` has no time-window restriction (unlike post-content editing)

**Feed correctness (carried items):**
- The feed INCLUDES answered posts that have expired (an expired Prayer Request that was answered still appears — Testimonies never expire, Prayer Requests do)
- The feed EXCLUDES answered posts whose author has deleted the post or gone through account deletion
- Default sort remains `answered_at DESC` (shipped 6.6 has this; verify unchanged)
- Pagination remains `?page=N&limit=20`, max `limit=50`

**Auth gating (carried items):**
- Logged-out users can VIEW the Answered Wall and read posts, but cannot react or comment (existing AuthModal pattern)
- Logged-in users get full interaction plus the "Add update" path to mark their own prayers answered from this page
- Anonymous-posted prayers still show "Anonymous" on the Answered Wall

### Backend (Integration tests with Testcontainers)

**Second Liquibase migration:**
- After the new ALTER changeset runs, `post_reactions.reaction_type` accepts `'celebrate'`
- It still accepts `'praying'`, `'candle'`, AND `'praising'` (no regression on the first migration's values)
- An invalid reaction type still fails the constraint
- The new changeset is append-only — the first migration's changeset (the `'praising'` one) and `2026-04-27-016` are NEVER edited
- The migration is idempotent / safe against a populated `post_reactions` table

**`'celebrate'` does NOT fire INTERCESSION:**
- Adding a `'celebrate'` reaction does NOT create an INTERCESSION activity event (consistent with the shipped `'praising'` and the corrected `'candle'` behavior)
- 6.6's shipped regression tests — `toggleCandle_addPath_doesNotFireIntercession`, `togglePraising_addPath_doesNotFireIntercession`, and `togglePraying_addPath_firesIntercessionActivity` — ALL still pass, untouched
- A new test asserts `toggleCelebrate_addPath_doesNotFireIntercession`

**Answered feed endpoint:**
- `?category=health` (etc.) narrows results correctly; absent/`all` returns the unfiltered answered feed
- Expired-but-answered posts are included; deleted-author posts are excluded
- `is_answered` transitions (the un-mark flow) correctly add/remove posts from the feed
- Redis cache (per MPD-5) keyed `(category?, page)` with TTL 2min; invalidated on any `is_answered` transition and on content edit of an answered post

### Manual verification by Eric after execute

- Load `/prayer-wall/answered`; confirm the hero subhead reads "Gratitude, not comparison." and the intro paragraph is present
- React with "Celebrate" on an answered post; confirm warm sunrise palette + distinct animation; confirm the count shows "… celebrating"; toggle it off
- Confirm "Praising with you" still works (6.6 regression)
- Confirm the category chips are present, that there is NO Mental Health chip, and that filtering works + updates the URL
- On your own answered post: confirm "Share an update" lets you add/edit answer text; confirm you can un-mark as answered and the post leaves the wall
- Find or create an answered post with no answer text; confirm the fallback copy renders cleanly
- Confirm an expired-but-answered Prayer Request still appears
- Reduced-motion: enable it, confirm the Celebrate animation falls back to static
- Read the hero subhead, intro paragraph, and all new copy aloud against D-Copy
- Apply the new migration to a local DB; confirm it runs clean and the new MD5 is recorded; confirm 6.6's candle-fix tests still pass

## 4. Master Plan Divergences (MPDs)

Unlike a normal brief, 6.6b's MPDs are not divergences *from* the master plan — they are corrections that bring shipped 6.6 *into line with* the live master plan stub. Each is framed: **live stub requires X · shipped 6.6 lacks X · 6.6b adds X.** Plan/execute honor the brief.

**MPD-1: Hero subhead corrected to "Gratitude, not comparison." + intro paragraph added.**
*Live stub requires:* hero subhead in Lora italic reading "Gratitude, not comparison." (the out-of-band notes flag this as the most important copy in the spec), plus a short intro paragraph below the hero.
*Shipped 6.6 has:* the subhead "Prayers the community has watched God move in." and no intro paragraph. (This was authored copy in the original 6.6 brief's D-Copy — it was the brief's invention, not the stub's.)
*6.6b adds:* replace the subhead string with "Gratitude, not comparison."; confirm it is Lora italic and an `<h2>` inside `<main>` (Section 3); add the intro paragraph (full text in D-Copy). This is a copy + markup correction, low code volume, high intent.

**MPD-2: `'celebrate'` reaction type added (the Light-a-Candle→Celebrate swap on answered posts).**
*Live stub requires:* on answered posts, "Light a Candle" is replaced by "Celebrate" — a new `reaction_type` value `'celebrate'`, warm sunrise palette, an animation distinct from Light-a-Candle's, separate count rendering ("12 praising with you · 3 celebrating").
*Shipped 6.6 has:* only `'praising'` was added. The original 6.6 brief's MPD-1 explicitly EXCLUDED `'celebrate'` as "speculative schema" — that exclusion was a mistake caused by the stale baseline, which did not yet have `'celebrate'`. The live stub has always wanted it.
*6.6b adds:* a second Liquibase ALTER changeset widening the CHECK constraint to add `'celebrate'`; `'celebrate'` at every backend enumeration site and the frontend type union; `CelebrateReaction.tsx`; the Light-a-Candle→Celebrate label/icon/animation swap on answered posts; separate count rendering. See D-CelebrateReaction, D-Migration2, Gate-G-MIGRATION2-SAFETY, Gate-G-CELEBRATE-NO-INTERCESSION.

*Critical interaction:* 6.6's execution shipped a behavior fix — `'candle'` no longer fires the INTERCESSION activity event — locked by regression tests. `'celebrate'` MUST follow the `'praising'` precedent: it does NOT fire INTERCESSION. 6.6b adds `toggleCelebrate_addPath_doesNotFireIntercession` and leaves all of 6.6's INTERCESSION regression tests untouched and passing.

**MPD-3: Category filter chips added — WITH the deliberate Mental Health omission.**
*Live stub requires:* optional filter chips "All" (default), "Health", "Family", "Work", "Grief", "Gratitude"; a `?category=` query param; chips keyboard-reachable and state-announcing. The stub also contains a full "Why no Mental Health filter" rationale section — the omission of a Mental Health chip is a deliberate, load-bearing anti-pressure decision.
*Shipped 6.6 has:* no category filter affordance at all. The chips were dropped, and with them the Mental Health omission and its rationale.
*6.6b adds:* `AnsweredCategoryFilter.tsx` with exactly the five named chips + "All"; the `?category=` query param on the feed endpoint; keyboard + state-announcing behavior. AND — critically — 6.6b carries the "Why no Mental Health filter" rationale forward as an inline code comment on `AnsweredCategoryFilter.tsx` and in the spec, so a future contributor cannot "helpfully" add the missing chip without encountering the reason. See D-MentalHealthOmission, Gate-G-MH-OMISSION.

**MPD-4: Answered-text lifecycle — optional text, post-hoc edit, un-mark.**
*Live stub requires:* `answered_text` is OPTIONAL (a post can be answered with no praise/update text); the author can later add or edit `answered_text` via a "Share an update" action on their own answered post; the author can UN-MARK a post as answered (`is_answered=false`, `answered_at=NULL`); a missing-text fallback rendering.
*Shipped 6.6 has:* the original brief's D-AnswerTextTreatment assumed `answered_text` is always present. There is no optional-text handling, no "Share an update" edit affordance, no un-mark flow, no missing-text fallback copy.
*6.6b adds:* missing-text fallback rendering on `AnsweredCard` (Section 7 D-Copy); a "Share an update" affordance on the author's own answered post that adds or edits `answered_text` with no time-window restriction; an un-mark-as-answered action; the corresponding endpoint support. Plan-recon R3 confirms how much of the underlying mark-as-answered flow (`MarkAsAnsweredForm`, Spec 3.5) already supports optional text vs. needs extension. See D-AnsweredLifecycle.

**MPD-5: Redis caching for the answered feed.**
*Live stub requires:* the answered feed response cached in Redis (per 5.6), keyed `(category?, page)`, TTL 2 minutes; invalidated on any `is_answered` transition (true→false or false→true) and on content edit of an answered post; logged-in requests not cached per-user.
*Shipped 6.6 has:* no caching layer. The original brief's Gate-7 said the existing feed-endpoint rate limit "covers it" — that conflated rate limiting with caching; they are different concerns.
*6.6b adds:* the Redis cache layer with the specified key shape, TTL, and invalidation triggers. Plan-recon R6 confirms 5.6's Redis infrastructure is available and reads the existing cache patterns so 6.6b mirrors them. See D-Caching.

**MPD-6: Carried smaller corrections.**
Three smaller items the live stub specifies that shipped 6.6 did not capture, folded in here rather than each getting its own MPD:
1. **Expired-but-answered inclusion.** The feed INCLUDES answered posts that have expired (Prayer Requests expire; Testimonies do not). Shipped 6.6 never addressed expiry interaction.
2. **Deleted-author exclusion.** The feed EXCLUDES answered posts whose author deleted the post or went through account deletion. Shipped 6.6 never addressed this.
3. **`<h2>` subhead landmark.** The hero subhead must be an `<h2>` within the `<main>` landmark. Folded into MPD-1's markup correction.

---

## 5. Recon Ground Truth

6.6b's recon is unusual: most of it is reading **shipped 6.6 code** to know exactly what is already there, so 6.6b extends rather than duplicates. R1-R2 are brief-level confirmations; R3-R8 are plan-time recon.

**R1 — VERIFIED (from the brief-drift audit): shipped 6.6's reaction state.**
Shipped 6.6 added `'praising'` only. The first Liquibase ALTER widened `post_reactions.reaction_type` to `('praying','candle','praising')`. 6.6 also shipped the `'candle'`→INTERCESSION behavior fix with regression tests (`toggleCandle_addPath_doesNotFireIntercession`, `togglePraising_addPath_doesNotFireIntercession`, `togglePraying_addPath_firesIntercessionActivity`). 6.6b's second migration adds `'celebrate'` on top of this; plan-recon R4 reads the exact shipped migration file + the reaction enumeration sites.

**R2 — VERIFIED (from the brief-drift audit): shipped 6.6's surface.**
Shipped 6.6 has `/prayer-wall/answered`, `AnsweredWall.tsx`, `AnsweredCard.tsx` (extends PrayerCard, non-fork), the `answered_at DESC` feed, the "Praising with you" label swap, the "Answered" navbar link, OpenAPI docs for the endpoint, and the wrong hero subhead. Shipped 6.6 does NOT have: `'celebrate'`, category filters, the answered-text edit/un-mark flow, Redis caching, the intro paragraph, expired/deleted-author handling. Plan-recon R3/R5 read the shipped components in full.

**R3 — PLAN-RECON-REQUIRED: the shipped mark-as-answered + answered-text flow.**
Plan reads `MarkAsAnsweredForm` (Spec 3.5) and the shipped 6.6 answered-text rendering to determine: does `answered_text` already support being optional/absent at the DB and API level, or only at the form level? Is there an existing edit path, or only create? Is there any un-mark capability anywhere? This determines how much of MPD-4 is net-new vs. wiring-up-existing. Document findings as a Plan-Time note.

**R4 — PLAN-RECON-REQUIRED: every reaction-type enumeration site (re-confirm against shipped code).**
The original 6.6 work identified the enumeration sites for adding `'praising'`. Plan re-greps the shipped codebase for ALL reaction-type enumeration sites — the CHECK constraint, backend enum/constant(s), frontend type union, validation regexes, any switch/match over reaction types, any denormalized counter columns (`praying_count`, `candle_count`, and whether a `praising_count` was added — if so, `celebrate_count` likely follows the same pattern). `'celebrate'` must be added to every one. A missed site is a latent bug. Document the full list.

**R5 — PLAN-RECON-REQUIRED: shipped `AnsweredWall.tsx` hero structure + how AnsweredCard composes.**
Plan reads shipped `AnsweredWall.tsx` to find the exact hero subhead string + element to replace (MPD-1), where the intro paragraph should mount, and where `AnsweredCategoryFilter` should mount (MPD-3). Plan reads shipped `AnsweredCard.tsx` to find where the missing-text fallback and the "Share an update" / un-mark affordances attach, and how the reaction bar is composed so the Light-a-Candle→Celebrate swap is surgical.

**R6 — PLAN-RECON-REQUIRED: Redis cache infrastructure (5.6) + existing cache patterns.**
Plan confirms 5.6's Redis cache is available and reads how other cached feeds/endpoints in the codebase structure their cache keys, TTLs, and invalidation hooks, so 6.6b's answered-feed cache mirrors the established pattern rather than inventing one. If 5.6 is somehow not available, plan STOPS and surfaces — caching is MPD-5 scope and cannot be silently dropped.

**R7 — PLAN-RECON-REQUIRED: how categories are stored on posts.**
The `?category=` filter (MPD-3) needs a post category field. Plan reads how post category/topic is represented (the help_tags from Spec 4.7b? a dedicated category column? something else?) and how the existing main Prayer Wall feed filters by it, so the answered feed's `?category=` reuses the same mechanism. The five chips (Health/Family/Work/Grief/Gratitude) must map to real stored values.

**R8 — PLAN-RECON-REQUIRED: the second migration's relationship to the first.**
Plan reads the shipped first ALTER changeset (the `'praising'` one) to confirm: its exact file name and changeset id, whether it used a drop-and-recreate or an in-place constraint alter, and therefore what shape the second `'celebrate'` ALTER should take to be consistent. The second migration must be a NEW changeset file, append-only, never editing the first one or `2026-04-27-016`. Document the chosen approach.

---

## 6. Gates — Applicability

| Gate | Applicability | Notes |
|------|---------------|-------|
| Gate-1 (Liquibase rules) | **Applies (HARD).** | The second ALTER changeset for `'celebrate'`. Append-only; permanent MD5; idempotent; never edits the first migration or `2026-04-27-016`. See Gate-G-MIGRATION2-SAFETY. |
| Gate-2 (OpenAPI updates) | **Applies.** | Document the `?category=` param, the un-mark endpoint, the answered-text edit endpoint, and the `'celebrate'` reaction value. |
| Gate-3 (Copy Deck) | **Applies (HARD).** | Hero subhead (the load-bearing line), intro paragraph, missing-text fallback, separate-count format, chip labels, "Share an update" copy. See Gate-G-COPY. |
| Gate-4 (Tests mandatory) | **Applies.** | The live stub says "at least 24 tests" for 6.6 overall; shipped 6.6 came in at ~17. 6.6b targets ~22-26 NEW tests to close that gap across the four areas. |
| Gate-5 (Accessibility) | **Applies (HARD).** | `<h2>` subhead landmark, keyboard-reachable + state-announcing chips, reduced-motion Celebrate fallback, answered-variant accessible name. See Gate-G-A11Y. |
| Gate-6 (Performance) | **Applies.** | The Redis cache (MPD-5) is itself a performance gate; the answered feed query with `?category=` must stay within budget. |
| Gate-7 (Rate limiting) | **Applies.** | `'celebrate'` rides the existing reaction endpoint's rate limit (same as `'praising'`/`'candle'`). The un-mark + answered-text-edit endpoints need rate-limit consideration — plan-recon confirms against existing author-action limits. |
| Gate-8 (Respect existing patterns) | **Applies (HARD).** | 6.6b extends shipped 6.6; it does not duplicate or rebuild. Reuse the shipped reaction infra, the shipped `AnsweredCard` composition, the existing category-storage mechanism, the existing Redis cache patterns. See Gate-G-EXTEND-NOT-DUPLICATE. |
| Gate-9 (Plain text only) | **Applies.** | `answered_text` and the intro paragraph are plain text; existing sanitization applies. |
| Gate-10 (Crisis detection supersession) | **Conditional.** | The answered-text edit path is a user-content-write surface. If crisis detection runs on `answered_text` at create time today (plan-recon R3), the edit path MUST run it too. If `answered_text` is not crisis-scanned, document why. |

**New gates specific to 6.6b:**

**Gate-G-MIGRATION2-SAFETY (HARD).**
The second Liquibase ALTER changeset (adding `'celebrate'`) must: be a NEW changeset file, append-only; NEVER edit the first `'praising'` ALTER changeset or `2026-04-27-016`; widen the CHECK constraint to `('praying','candle','praising','celebrate')` preserving all three existing values; be idempotent / safe against a populated `post_reactions` table; include a rollback directive or documented rationale; follow the same constraint-alter approach the first migration used (plan-recon R8 confirms). Code review hard-blocks any edit to a previously-run changeset and any constraint change without a test asserting all four valid values pass + one invalid value fails.

**Gate-G-CELEBRATE-NO-INTERCESSION (HARD).**
`'celebrate'` reactions MUST NOT fire the INTERCESSION activity event, consistent with the shipped `'praising'` precedent and the corrected `'candle'` behavior. 6.6's three shipped INTERCESSION regression tests (`toggleCandle_addPath_doesNotFireIntercession`, `togglePraising_addPath_doesNotFireIntercession`, `togglePraying_addPath_firesIntercessionActivity`) MUST still pass with ZERO modification to their assertions. 6.6b adds `toggleCelebrate_addPath_doesNotFireIntercession`. Code review hard-blocks if any 6.6 INTERCESSION test was modified, or if `'celebrate'` is wired into the INTERCESSION-firing path.

**Gate-G-MH-OMISSION (HARD).**
The category filter chips MUST NOT include a "Mental Health" chip. This omission is a deliberate, load-bearing anti-pressure decision (the live stub's "Why no Mental Health filter" rationale). 6.6b MUST carry that rationale forward as an inline code comment on `AnsweredCategoryFilter.tsx` (and in the spec) so the omission is self-documenting. Code review hard-blocks the addition of a Mental Health chip and hard-blocks shipping `AnsweredCategoryFilter.tsx` without the rationale comment. The chip set is exactly: All, Health, Family, Work, Grief, Gratitude.

**Gate-G-EXTEND-NOT-DUPLICATE (HARD).**
6.6b is a correction layer on shipped 6.6. It MUST extend the shipped components, not rebuild or fork them. No second `AnsweredWall`, no parallel answered-feed hook, no duplicated reaction pipeline. The hero copy fix is a string + markup change to the shipped hero, not a new hero component. Code review hard-blocks any duplication of a shipped 6.6 surface.

**Gate-G-6.6-REGRESSION-SAFE (HARD).**
Everything shipped 6.6 already does must still work after 6.6b: the `'praising'` reaction, the `answered_at DESC` feed, `AnsweredCard`'s PrayerCard extension, the "Answered" navbar link, the "Praising with you" label swap, anonymous attribution. Shipped 6.6's test suite must still pass with zero assertion modifications. If a 6.6 test breaks, the 6.6b change is wrong, not the test.

**Gate-G-COPY (HARD).**
All copy in Section 7 D-Copy is Eric-approved before execute. The hero subhead especially — it is the single most load-bearing line in the spec, and shipped 6.6 already got it wrong once.

**Gate-G-A11Y (HARD).**
MUST cover: the hero subhead is an `<h2>` within `<main>`; category chips are keyboard-reachable and announce selected/unselected state; the "Celebrate" animation respects `prefers-reduced-motion` with a static fallback; the answered-variant accessible name includes "answered"; WCAG AA contrast on the warm sunrise Celebrate palette on Night Mode + regular backgrounds; axe-core zero violations on the Answered Wall after 6.6b.

---

## 7. Decisions Catalog

12 decisions for plan + execute.

**D-Scope: 6.6b is a four-gap correction layer on shipped 6.6.**
6.6b adds: the hero copy fix, the `'celebrate'` reaction, the category filter chips, the answered-text lifecycle, and the carried smaller items (caching, expired/deleted handling, `<h2>` landmark). It adds nothing outside the live 6.6 stub. It does not rebuild shipped 6.6.

**D-Migration2: one new append-only Liquibase ALTER changeset for `'celebrate'`.**
A new changeset file (following the changelog naming convention, after the first `'praising'` ALTER) widens `post_reactions.reaction_type` to `('praying','candle','praising','celebrate')`. Same constraint-alter approach as the first migration (R8 confirms drop-and-recreate vs. in-place). Never edits the first migration or `2026-04-27-016`. Includes rollback. Adds ONLY `'celebrate'`.

**D-CelebrateReaction: `CelebrateReaction.tsx`, warm sunrise palette, distinct animation, answered-posts-only.**
`'celebrate'` is the answered-post replacement for Light-a-Candle. New `CelebrateReaction.tsx` component, warm sunrise palette (gold + coral family, distinct from Light-a-Candle's amber), an animation distinct from Light-a-Candle's, with a `prefers-reduced-motion` static fallback. Surfaced ONLY on answered posts. Wired through the existing reaction endpoint/service/toggle pattern — no parallel reaction system. Plan-recon R4 ensures `'celebrate'` lands at every enumeration site (and a `celebrate_count` denormalized column if the shipped pattern used per-type counters). Counts render separately from `'praising'` per D-Copy.

**D-CelebrateNoIntercession: `'celebrate'` does not fire INTERCESSION.**
Consistent with `'praising'` and the corrected `'candle'`. Implementation of Gate-G-CELEBRATE-NO-INTERCESSION. A new regression test locks it; the three shipped 6.6 INTERCESSION tests stay untouched.

**D-HeroCopyFix: replace the subhead string, add the intro paragraph, fix the landmark.**
The shipped subhead string is replaced with "Gratitude, not comparison." (Lora italic, `<h2>` within `<main>`). The intro paragraph is added below the hero. This is a surgical change to the shipped hero in `AnsweredWall.tsx` — not a new hero component (Gate-G-EXTEND-NOT-DUPLICATE).

**D-CategoryFilter: `AnsweredCategoryFilter.tsx`, six chips, `?category=` param, reuse existing category storage.**
Chips: All (default), Health, Family, Work, Grief, Gratitude. No Mental Health chip (D-MentalHealthOmission). The `?category=` query param reuses whatever category/topic storage + filtering mechanism the main Prayer Wall feed already uses (plan-recon R7) — 6.6b does not invent a new category system. Chips are keyboard-reachable and announce state.

**D-MentalHealthOmission: the Mental Health chip is deliberately omitted, and the reason ships with the code.**
The live stub's rationale (paraphrased): mental-health prayers being "answered" is genuinely complicated theological/clinical territory, and a Mental Health filter chip on a celebration surface risks implying a tidy resolution narrative that does not serve people in that territory. 6.6b reproduces the stub's full rationale as an inline comment on `AnsweredCategoryFilter.tsx` so the omission is self-documenting and cannot be casually "fixed" by a future contributor. The exact rationale text to embed is in D-Copy. Implementation of Gate-G-MH-OMISSION.

**D-AnsweredLifecycle: optional text, post-hoc edit, un-mark — extending the shipped flow.**
`answered_text` is optional. `AnsweredCard` renders a missing-text fallback (D-Copy) when it is absent. The author's own answered post gets a "Share an update" affordance that adds or edits `answered_text` with no time-window restriction. The author can un-mark a post as answered (`is_answered=false`, `answered_at=NULL`), which removes it from the wall. Plan-recon R3 determines how much already exists in `MarkAsAnsweredForm` / the shipped flow vs. is net-new; 6.6b extends, does not duplicate.

**D-Caching: Redis cache for the answered feed, keyed `(category?, page)`, TTL 2 min.**
The answered feed response is cached in Redis (per 5.6), keyed by `(category?, page)`, TTL 2 minutes. Invalidated on any `is_answered` transition and on content edit of an answered post. Logged-in requests are not cached per-user. 6.6b mirrors the existing cache patterns in the codebase (plan-recon R6) rather than inventing a new one.

**D-FeedCorrectness: expired-but-answered included, deleted-author excluded.**
The answered feed includes answered posts that have expired (Prayer Requests expire; Testimonies do not — an expired-but-answered Prayer Request still belongs on the wall). It excludes answered posts whose author deleted the post or went through account deletion. These are filter-predicate corrections to the shipped answered feed query.

**D-NoNewAntiPatterns: 6.6b carries forward 6.6's anti-pressure posture.**
The live stub's anti-pressure design list still governs: no "most-celebrated" sort, no community-wide answered-prayer counts, no push notifications on new answered posts, no "suggested prayers" next to answered posts, no aggregate metrics. 6.6b adds nothing that violates these, and the new category filter must not introduce a count-per-category or "trending category" affordance.

**D-Copy: Authored inline.** (Gate-G-COPY)

*Hero heading (unchanged from shipped 6.6, Fraunces):* **"Answered"**

*Hero subhead (Lora italic, `<h2>` within `<main>`) — REPLACES the shipped subhead:* **"Gratitude, not comparison."**

*Intro paragraph (below the hero):* **"These are prayer requests whose authors chose to share an update. Many prayers go unanswered, or are answered quietly, or are still being waited on. This page is not the whole story — it is just the part some people felt moved to share."**

*Missing-answer-text fallback (on an AnsweredCard with no `answered_text`):* **"This prayer was marked answered. The author hasn't shared an update."**

*Separate reaction count format:* **"{n} praising with you · {n} celebrating"** (the · separator; singular/plural handled — "1 praising with you", "1 celebrating")

*"Celebrate" reaction label:* **"Celebrate"**

*"Share an update" affordance (author's own answered post):* button label **"Share an update"**; if editing existing text, **"Edit your update"**

*Un-mark affordance (author's own answered post):* **"Un-mark as answered"**; confirmation: **"Remove this from the Answered Wall? You can mark it answered again anytime."**

*Category chip labels:* **"All" · "Health" · "Family" · "Work" · "Grief" · "Gratitude"**

*"Why no Mental Health filter" rationale — to embed verbatim as an inline comment on `AnsweredCategoryFilter.tsx`:* **"There is intentionally no 'Mental Health' category chip. Mental-health prayers being 'answered' is genuinely complicated theological and clinical territory — healing is rarely linear, and a filter chip on a celebration surface risks implying a tidy resolution narrative that does not serve people living in that territory. This omission is a deliberate anti-pressure design decision from the Spec 6.6 master plan, carried forward by Spec 6.6b. Do not add a Mental Health chip without revisiting that rationale."**

Note: the intro paragraph and the MH rationale are written here at brief level; if Eric wants to adjust tone, copy review is the moment. The subhead "Gratitude, not comparison." is taken directly from the live master plan stub and should not be changed — it is the load-bearing line.

---

## 8. Watch-Fors

Organized by gap area + cross-cutting concerns. ~28 items.

### Migration safety (gap 2 infrastructure)

**W1.** Do NOT edit the first `'praising'` ALTER changeset. The `'celebrate'` widening is a brand-new changeset file. Editing a run changeset breaks its MD5.
**W2.** Do NOT edit `2026-04-27-016` (the original `post_reactions` table changeset). Append-only.
**W3.** The new CHECK constraint must list ALL FOUR values: `('praying','candle','praising','celebrate')`. Dropping any of the three existing values silently breaks existing reaction rows.
**W4.** Match the constraint-alter approach the first migration used (drop-and-recreate vs. in-place). Plan-recon R8 confirms. An inconsistent approach is a review flag.
**W5.** The migration must be safe against a populated `post_reactions` table — prod isn't deployed yet, but the mock seed has rows. Test the migration against seeded data.
**W6.** Include a rollback directive, or document explicitly why none (consistent with how the first ALTER handled rollback).

### `'celebrate'` reaction wiring (gap 2)

**W7.** `'celebrate'` must be added at EVERY reaction-type enumeration site found in plan-recon R4 — CHECK constraint, backend enum/constant(s), frontend type union, validation, switch/match statements, denormalized counter columns. A missed site is a latent bug that may not surface until runtime.
**W8.** If the shipped per-type counter pattern exists (`praising_count` etc.), `'celebrate'` needs `celebrate_count` following the same pattern — and that's another column-add in the same migration or a sibling changeset. Plan-recon R4 determines this.
**W9.** `'celebrate'` MUST NOT fire INTERCESSION. Trace the reaction-toggle path; confirm `'celebrate'` follows the `'praising'` branch, not the `'praying'` branch.
**W10.** Do NOT modify 6.6's shipped INTERCESSION regression tests. They must pass untouched. If one breaks, the 6.6b wiring is wrong.
**W11.** `'celebrate'` is surfaced ONLY on answered posts. It must not appear as a reaction option on regular (non-answered) Prayer Wall posts. The Light-a-Candle→Celebrate swap is answered-post-scoped.
**W12.** `CelebrateReaction.tsx` is a distinct component from the Light-a-Candle reaction component — distinct palette, distinct animation. Do not parameterize one component to do both unless plan-recon shows that's the shipped pattern.
**W13.** The "Celebrate" animation needs a `prefers-reduced-motion` static fallback. Do not ship an animation with no reduced-motion path.
**W14.** Reaction counts render SEPARATELY ("12 praising with you · 3 celebrating"), not summed. Confirm the count component handles the two answered-post reaction types as distinct tallies.

### Hero copy (gap 1)

**W15.** The subhead string is replaced, not appended to. The shipped "Prayers the community has watched God move in." must be GONE, replaced by exactly "Gratitude, not comparison."
**W16.** The subhead must be an `<h2>` within the `<main>` landmark. Plan-recon R5 confirms the shipped element; if shipped 6.6 used a non-h2, that's also corrected here.
**W17.** The intro paragraph is NET-NEW — shipped 6.6 has none. Confirm it mounts below the hero, reads as calm context, and is not styled as a CTA.
**W18.** Do not build a new hero component. This is a surgical string + markup edit to the shipped `AnsweredWall.tsx` hero (Gate-G-EXTEND-NOT-DUPLICATE).

### Category filter chips (gap 3)

**W19.** The chip set is EXACTLY: All, Health, Family, Work, Grief, Gratitude. Not more, not fewer. NO Mental Health chip.
**W20.** The "Why no Mental Health filter" rationale comment MUST ship on `AnsweredCategoryFilter.tsx`. A future contributor seeing five topical chips will be tempted to "complete the set" — the comment is the guardrail. Shipping the component without the comment fails Gate-G-MH-OMISSION.
**W21.** `?category=` must reuse the existing post-category storage + filtering mechanism (plan-recon R7). Do NOT invent a new category taxonomy or column. The five chips map to existing stored category values.
**W22.** If the existing category storage doesn't cleanly map to the five chip labels (e.g., categories are free-form tags, or named differently), STOP and surface — do not force a mapping or silently rename.
**W23.** Chips are keyboard-reachable and announce selected/unselected state. A chip row that's mouse-only fails Gate-G-A11Y.
**W24.** No count-per-category, no "trending category," no "most answered in Health" — the chips filter, they don't rank or quantify (D-NoNewAntiPatterns).

### Answered-text lifecycle (gap 4)

**W25.** `answered_text` being optional may already be true at the DB level (the column is nullable) but NOT handled at the render level. Plan-recon R3 determines the real gap. The missing-text fallback copy must render for any answered post lacking text.
**W26.** "Share an update" and "Un-mark as answered" appear ONLY on the author's OWN answered post. A non-author must never see these affordances. This is an authz check, not just a UI conditional — the endpoints must enforce it too.
**W27.** Un-marking sets `is_answered=false` AND `answered_at=NULL`. Both. Leaving a stale `answered_at` will corrupt the `answered_at DESC` sort and the feed filter.
**W28.** Editing `answered_text` has NO time-window restriction (unlike post-content editing, which may have one). Don't accidentally inherit a content-edit time gate.
**W29.** If `answered_text` is crisis-scanned at creation (plan-recon R3 / Gate-10), the edit path must scan too. A user could mark answered with benign text, then edit in crisis content.
**W30.** The un-mark flow must invalidate the Redis cache (it's an `is_answered` transition). See W32.

### Caching + feed correctness (MPD-5, MPD-6)

**W31.** The Redis cache key is `(category?, page)` — the category is part of the key. A cache that ignores `?category=` will serve wrong results across filters.
**W32.** Cache invalidation fires on: any `is_answered` transition (mark AND un-mark), and content edit of an answered post. Missing the un-mark invalidation leaves un-marked posts visible on the wall for up to the TTL.
**W33.** Logged-in requests are NOT cached per-user. Confirm the cache layer is bypassed or shared-only for authenticated requests, per the live stub.
**W34.** Expired-but-answered posts are INCLUDED. The answered feed query must not inherit a generic `expires_at > NOW()` predicate from the main feed. An answered Prayer Request that expired still belongs on the wall.
**W35.** Deleted-author posts are EXCLUDED. Confirm whether "deleted author" means soft-delete, hard-delete, or both, and that the exclusion predicate matches (plan-recon may need to check the shipped Spec 6.6 / account-deletion semantics).

### Cross-cutting / regression

**W36.** Everything shipped 6.6 does must still work — `'praising'`, the `answered_at DESC` feed, `AnsweredCard`'s non-fork extension of PrayerCard, the navbar link, anonymous attribution. Run the full shipped 6.6 test suite; zero assertion changes (Gate-G-6.6-REGRESSION-SAFE).
**W37.** 6.6b touches `post_reactions`, `InteractionBar` / the reaction bar, `AnsweredWall.tsx`, `AnsweredCard.tsx`, and the answered feed endpoint. The Prayer Wall Redesign side quest also touches PrayerWall/PrayerCard/InteractionBar. These must not execute concurrently — sequence them.
**W38.** Do not "improve" anything in shipped 6.6 while in these files. 6.6b closes the four documented gaps and the carried items — nothing else. Out-of-scope improvements get noted, not made.

---

## 9. Test Specifications

The live 6.6 stub mandates "at least 24 tests" for 6.6; shipped 6.6 came in ~17. 6.6b targets **~24 new tests** to close that gap and cover the four gap areas. Frontend: Vitest + RTL. Backend: JUnit + Testcontainers. E2E: Playwright.

### Migration + `'celebrate'` backend (7)

**T1.** Migration: after the new changeset runs, `post_reactions.reaction_type` accepts `'celebrate'`.
**T2.** Migration: `'praying'`, `'candle'`, `'praising'` all still accepted (no regression on prior values).
**T3.** Migration: an invalid reaction type still fails the CHECK constraint.
**T4.** Migration: runs clean against a populated/seeded `post_reactions` table.
**T5.** `toggleCelebrate_addPath_doesNotFireIntercession` — adding a `'celebrate'` reaction creates no INTERCESSION activity event.
**T6.** `toggleCelebrate_removePath` — toggling `'celebrate'` off removes the reaction row (consistent with other reactions' toggle semantics).
**T7.** Regression: 6.6's three shipped INTERCESSION tests (`toggleCandle_...`, `togglePraising_...`, `togglePraying_...`) still pass — included here as an explicit run-and-assert, not modified.

### Category filter (5)

**T8.** Backend: `?category=health` narrows the answered feed to posts with that category; other categories excluded.
**T9.** Backend: absent `?category=` (or `all`) returns the unfiltered answered feed.
**T10.** Frontend: `AnsweredCategoryFilter` renders exactly six chips (All, Health, Family, Work, Grief, Gratitude) — and asserts NO "Mental Health" chip is present.
**T11.** Frontend: selecting a chip updates the URL `?category=` param and triggers a filtered fetch; "All" clears it.
**T12.** Frontend (a11y): chips are keyboard-focusable and expose selected/unselected state to assistive tech.

### Answered-text lifecycle (6)

**T13.** Frontend: an `AnsweredCard` with no `answered_text` renders the missing-text fallback copy, not an empty or broken region.
**T14.** Frontend: "Share an update" and "Un-mark as answered" appear on the author's own answered post.
**T15.** Frontend: neither affordance appears for a non-author viewer.
**T16.** Backend: the answered-text edit endpoint rejects a non-author (authz), accepts the author.
**T17.** Backend: un-mark sets `is_answered=false` AND `answered_at=NULL`, and the post leaves the answered feed.
**T18.** Backend: editing `answered_text` succeeds with no time-window restriction (e.g. on a post answered well in the past).

### Hero copy + feed correctness (4)

**T19.** Frontend: the Answered Wall hero subhead renders exactly "Gratitude, not comparison." as an `<h2>` within `<main>`; the shipped wrong string is absent.
**T20.** Frontend: the intro paragraph renders below the hero.
**T21.** Backend: an expired-but-answered Prayer Request appears in the answered feed.
**T22.** Backend: an answered post whose author has been deleted is excluded from the answered feed.

### Caching (2)

**T23.** Backend: the answered feed response is cached in Redis keyed by `(category?, page)`; a second identical request hits the cache; different `?category=` values are cached separately.
**T24.** Backend: cache is invalidated on an `is_answered` transition (both mark and un-mark) and on content edit of an answered post.

### Plus: E2E (folded into the above counts where noted, or additional)

**T-E2E-1.** Playwright: navigate to `/prayer-wall/answered`, confirm hero subhead text, select a category chip, react with "Celebrate" on an answered post, confirm the count reflects it.
**T-E2E-2.** Playwright: as a logged-out user, confirm the feed is viewable but reaction/comment trigger the AuthModal.

---

## 10. Files

All paths relative to repo root. Plan-recon confirms exact paths against shipped 6.6.

### Create

**Frontend:**
- `frontend/src/components/prayer-wall/AnsweredCategoryFilter.tsx` — the six-chip filter row; carries the "Why no Mental Health filter" rationale as an inline comment (Gate-G-MH-OMISSION)
- `frontend/src/components/prayer-wall/CelebrateReaction.tsx` — the `'celebrate'` reaction component; warm sunrise palette; distinct animation with reduced-motion fallback
- `__tests__/` files for each new component (colocated per the repo's test convention — plan-recon confirms `__tests__/` placement)

**Backend:**
- A new Liquibase changeset file widening the `post_reactions.reaction_type` CHECK constraint to add `'celebrate'` — naming follows the changelog convention, dated, sequenced AFTER the first `'praising'` ALTER (plan-recon R8 confirms exact name + approach)
- New integration test(s) for the migration, the `'celebrate'` reaction behavior, the category filter, the answered-text lifecycle, and caching (per Section 9)

### Modify

**Frontend:**
- `frontend/src/pages/AnsweredWall.tsx` — hero subhead string + markup (`<h2>` in `<main>`); add the intro paragraph; mount `AnsweredCategoryFilter`
- `frontend/src/components/prayer-wall/AnsweredCard.tsx` — missing-text fallback rendering; "Share an update" + "Un-mark as answered" affordances on the author's own post; the Light-a-Candle→Celebrate swap in the reaction bar
- `frontend/src/constants/answered-wall-copy.ts` — add the new copy strings (subhead replacement, intro paragraph, fallback, count format, chip labels, affordance labels)
- The frontend reaction `reaction_type` type union — add `'celebrate'`
- `frontend/src/hooks/useAnsweredFeed.ts` (or the shipped equivalent) — `?category=` param support
- The reaction bar / `InteractionBar` answered-post path — surface `'celebrate'` in place of Light-a-Candle on answered posts (plan-recon R5 confirms the shipped composition point)

**Backend:**
- The answered feed controller/service (shipped 6.6's `AnsweredFeedController` / `AnsweredFeedService` or whatever shipped — plan-recon R2/R5 confirms) — `?category=` filtering; expired-but-answered inclusion; deleted-author exclusion; Redis caching with `(category?, page)` key + invalidation
- The reaction enum/constant site(s) — add `'celebrate'` (every site from plan-recon R4)
- The post/answered-text service — answered-text edit support; un-mark-as-answered support; authz enforcement on both
- OpenAPI spec — document `?category=`, the un-mark endpoint, the answered-text edit endpoint, the `'celebrate'` reaction value
- If a per-type counter column pattern exists: a `celebrate_count` column (in the new changeset or a sibling) — plan-recon R4 determines

### Do NOT modify

- The first `'praising'` ALTER changeset — append-only, MD5 permanence (W1)
- `2026-04-27-016` (the original `post_reactions` table changeset) (W2)
- 6.6's shipped test assertions — especially the three INTERCESSION regression tests (Gate-G-CELEBRATE-NO-INTERCESSION, Gate-G-6.6-REGRESSION-SAFE)
- Shipped 6.6 surfaces beyond the four gap areas — no rebuilding `AnsweredWall`/`AnsweredCard`, only extending (Gate-G-EXTEND-NOT-DUPLICATE)
- `PrayerCard.tsx` core — unless plan-recon shows the Light-a-Candle→Celebrate swap genuinely requires a touch there; if so, it's surgical and gated by Gate-G-6.6-REGRESSION-SAFE

### Delete

- Nothing.

---

## 11. Acceptance Criteria

6.6b is done when:

**Gap 1 — Hero copy:**
- [ ] A. The Answered Wall hero subhead reads exactly "Gratitude, not comparison."
- [ ] B. The subhead is Lora italic, an `<h2>` within the `<main>` landmark
- [ ] C. The intro paragraph is present below the hero
- [ ] D. The shipped wrong subhead string no longer appears anywhere

**Gap 2 — `'celebrate'` reaction:**
- [ ] E. A new append-only Liquibase changeset widens `reaction_type` to `('praying','candle','praising','celebrate')`; the first migration and `2026-04-27-016` are untouched
- [ ] F. `'celebrate'` is wired at every enumeration site (plan-recon R4 list)
- [ ] G. On answered posts, "Celebrate" replaces "Light a Candle" with a warm sunrise palette + distinct animation + reduced-motion fallback
- [ ] H. `'celebrate'` does NOT appear on non-answered posts
- [ ] I. Reaction counts render separately ("{n} praising with you · {n} celebrating")
- [ ] J. `'celebrate'` does NOT fire INTERCESSION; the new regression test passes; 6.6's three INTERCESSION tests pass untouched

**Gap 3 — Category filter:**
- [ ] K. `AnsweredCategoryFilter` renders exactly: All, Health, Family, Work, Grief, Gratitude — NO Mental Health chip
- [ ] L. The "Why no Mental Health filter" rationale ships as an inline comment on `AnsweredCategoryFilter.tsx`
- [ ] M. `?category=` narrows the feed using the existing category storage mechanism; "All" clears it; the URL reflects state
- [ ] N. Chips are keyboard-reachable and announce state

**Gap 4 — Answered-text lifecycle:**
- [ ] O. An answered post with no `answered_text` renders the missing-text fallback cleanly
- [ ] P. The author's own answered post has working "Share an update" (add/edit) and "Un-mark as answered" affordances; non-authors see neither; endpoints enforce authz
- [ ] Q. Un-mark sets `is_answered=false` AND `answered_at=NULL` and removes the post from the wall
- [ ] R. Editing `answered_text` has no time-window restriction

**Carried items:**
- [ ] S. The answered feed includes expired-but-answered posts and excludes deleted-author posts
- [ ] T. The answered feed is Redis-cached keyed `(category?, page)`, TTL 2min, invalidated on `is_answered` transition + answered-post content edit; logged-in requests not per-user cached

**Cross-cutting:**
- [ ] U. ~24 new tests added per Section 9; all pass
- [ ] V. Shipped 6.6's full test suite passes with zero assertion modifications
- [ ] W. axe-core: zero violations on the Answered Wall after 6.6b
- [ ] X. All new copy matches D-Copy exactly and was Eric-approved before execute
- [ ] Y. Backend lint + typecheck + tests pass; frontend lint + typecheck + tests pass
- [ ] Z. No shipped 6.6 surface was duplicated or rebuilt

---

## 12. Out of Scope

- Anything not in the live 6.6 master plan stub. 6.6b is a drift-correction layer, not a feature-expansion opportunity.
- The original 6.6 brief's over-reach items that were *useful additions* and already shipped (Gate-G-MIGRATION-SAFETY discipline, D-PraisingScope, D-ReactionEnumSync, the denormalized-counter prophylactic) — those stay as shipped; 6.6b does not revisit them.
- The Prayer Wall Redesign side quest — separate brief, must not execute concurrently with 6.6b (W37).
- Any change to the main (non-answered) Prayer Wall feed.
- `'celebrate'` on non-answered posts.
- A Mental Health category chip (deliberately omitted — Gate-G-MH-OMISSION).
- Category counts, ranking, or "trending" affordances.
- Comments-on-answered-posts copy/placeholder changes — the live stub mentions a softer commenter guidance + "Say a word of celebration..." placeholder; if shipped 6.6 already handled comments, leave as-is; if it did NOT and the live stub requires it, that is a *fifth gap* — flag it to Eric at plan-recon rather than silently absorbing or silently dropping it. (This brief scopes the four confirmed gap areas; the comment-copy item was not in the four and is called out here explicitly so it is not lost.)

---

## 13. Tier Rationale (Closing)

xHigh because: a second permanent-MD5 CHECK-constraint migration on a table that already carries a shipped behavior-fix; a new reaction type that must be wired through every enumeration site without disturbing the shipped `'candle'`→INTERCESSION correction; the single most load-bearing copy line in the spec; and a deliberate anti-pressure design decision (the Mental Health omission) that was silently dropped once already and must this time ship *with its rationale embedded in the code*. The failure modes are subtle — a missed enumeration site, a migration that doesn't match the first one's approach, `'celebrate'` accidentally wired into the INTERCESSION path, or the MH rationale comment quietly not making it in — and each would pass a casual review. xHigh thinking for all phases; Eric reviews the migration, the enumeration coverage, the copy, the MH rationale, the answered-text authz, and does a manual pass on the wall.

---

## 14. Recommended Planner Instruction

> Plan Spec 6.6b from `spec-6-6b-brief.md`. This is a drift-remediation spec: it brings shipped 6.6 into line with the LIVE 6.6 master plan stub by closing four gap areas (hero copy, `'celebrate'` reaction, category filter chips, answered-text lifecycle) plus carried items (caching, expired/deleted feed correctness, `<h2>` landmark). Everything 6.6b does already exists in the live stub — add nothing beyond it.
>
> Run plan-recon R3-R8 against SHIPPED 6.6 code before planning: the mark-as-answered/answered-text flow, every reaction-type enumeration site, `AnsweredWall.tsx`/`AnsweredCard.tsx` structure, Redis cache patterns, post-category storage, and the first `'praising'` migration's exact shape. 6.6b EXTENDS shipped 6.6 — it does not rebuild or fork it.
>
> Honor all HARD gates: Gate-G-MIGRATION2-SAFETY (append-only second changeset), Gate-G-CELEBRATE-NO-INTERCESSION (the three shipped 6.6 INTERCESSION tests pass untouched), Gate-G-MH-OMISSION (no Mental Health chip; rationale ships as a code comment), Gate-G-EXTEND-NOT-DUPLICATE, Gate-G-6.6-REGRESSION-SAFE, Gate-G-COPY, Gate-G-A11Y.
>
> If plan-recon reveals a fifth gap (e.g. the comment-copy item in Section 12), STOP and surface to Eric — do not silently absorb or drop it. If the existing post-category storage does not cleanly map to the five chip labels (W22), STOP and surface. Standard discipline: no git operations.

---

## 15. Verification Handoff Checklist

For `/verify-with-playwright` after execute:

- [ ] Hero subhead reads "Gratitude, not comparison." — `<h2>` in `<main>`; intro paragraph present below it
- [ ] "Celebrate" reaction on an answered post: warm sunrise palette, distinct animation, toggles on/off, count shows "… celebrating"
- [ ] Reduced-motion on: Celebrate animation falls back to static
- [ ] "Praising with you" still works (6.6 regression)
- [ ] Category chips present: All/Health/Family/Work/Grief/Gratitude — confirm NO Mental Health chip; filtering works + updates URL; chips keyboard-reachable
- [ ] Author's own answered post: "Share an update" adds/edits text; "Un-mark as answered" removes it from the wall
- [ ] Non-author viewer sees neither affordance
- [ ] An answered post with no text shows the fallback copy cleanly
- [ ] An expired-but-answered Prayer Request still appears on the wall
- [ ] Inline element positional verification: the category filter row, the Celebrate reaction in the bar, and the intro paragraph each sit where the brief specifies relative to the shipped hero/card structure
- [ ] axe-core: zero violations on `/prayer-wall/answered`
- [ ] Logged-out: feed viewable; reaction/comment triggers AuthModal
- [ ] Residue check before handoff: grep for `gradle`, `gradlew`, `npm`, WR-personal-stack terms — none present

---

## 16. Prerequisites Confirmed

- [x] 6.6 (Answered Wall) shipped and merged — 6.6b is a correction layer on top of it
- [x] 6.1 (Prayer Receipt) — `post_reactions` infrastructure in place
- [x] The live 6.6 master plan stub read in full (lines ~5625-5720) — this brief is authored against the LIVE stub, not the pristine-baseline backup
- [x] The brief-drift audit (2026-05-14) findings for 6.6 incorporated — the four gap areas + carried items are exactly the audit's MISSING/DIVERGENT set
- [x] `spec-tracker.md` remediation note logged; 6.5 master-plan stub amended (Path B) — 6.6b is the 6.6 half of the same remediation
- [ ] 5.6 Redis cache availability — confirmed at plan-recon R6 (if unavailable, plan STOPS and surfaces)

---

## End of Brief
