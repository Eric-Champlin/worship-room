# Brief: Spec 6.8 — Verse-Finds-You

**Master plan reference:** `_forums_master_plan/round3-master-plan.md` (Spec 6.8 stub, live version, lines ~5887-6131) — ID `round3-phase06-spec08-verse-finds-you`

**Spec ID:** `round3-phase06-spec08-verse-finds-you`

**Phase:** 6 (Engagement Features)

**Size:** L (Large)

**Risk:** HIGH — AI-adjacent feature surfacing scripture in response to a user's emotional/spiritual state. Misapplied scripture in a vulnerability moment causes real harm. Fallback behavior when a dependency is unavailable is safety-critical.

**Tier:** **xHigh** — HIGH-risk by the master plan's own classification; a feature whose failure mode is *landing a wrong verse on a grieving or distressed person*; a runtime-gated dependency on the Phase 10 crisis classifier that must be built-and-tested-now-but-dormant-until-then; a 180-passage curated set that is a human pastoral-discernment deliverable, not a code task; "silent failure" as a load-bearing discipline; and several deliberate pastoral decisions (the "NOT hope" mappings, the fail-closed cooldown) that must ship with their rationale embedded so they cannot be casually "corrected" later.

**Prerequisites:**
- 5.6 (Redis cache) — ✅ required for cooldown enforcement
- 6.1 (Prayer Receipt) — ✅ shares the curated-verse-set pattern; also the source of the `imageGen.ts` / PII-stripping pipeline reused by the optional "Save this" moment
- **The 180-passage curated verse set** — a HUMAN deliverable from Eric, completed and reviewed BEFORE execute. See Section 2 and Gate-G-CURATION-PREREQ. This is not optional and not a CC task.

**Runtime-gated dependencies:**
- 10.5 (crisis detection routing) and 10.6 (automated flagging) — NOT prerequisites in the blocking sense. See Section 0.

**Pipeline:** This brief → `/spec-forums spec-6-8-brief.md` → `/plan-forums spec-6-8.md` → execute → review.

---

## 0. Runtime-Gated Dependency Reality — Read First

6.8 has an unusual dependency shape, and misunderstanding it will cause either a wrongly-blocked spec or a wrongly-shipped one. Read this before anything else.

**What ships in 6.8 (Phase 6): the complete feature.** The curated verse set, the selection engine, all four trigger surfaces, the settings toggle, the cooldown logic, the dismissal flow, the endpoint, the database table — all of it. 6.8 is not a v1-of-2. It ships whole.

**What is runtime-gated: the 48-hour crisis-flag suppression gate.** Step 1 of the selection algorithm is "if the user has triggered crisis-flag detection in the last 48 hours, return null." Reading that crisis flag requires the Phase 10 crisis classifier (10.5 routing + 10.6 automated flagging) to be live. Phase 10 has not shipped.

**The consequence — and it is intended behavior, not a bug:** before 10.5/10.6 land, no crisis flag can ever be read. Per the stub, the surfacing pipeline therefore falls through its safe-failure path and **returns null for all users**. Verse-Finds-You is **functionally dormant** until Phase 10 ships. The stub states this explicitly: "Verse-Finds-You is functionally dormant until then, which is the intended behavior."

**Why this is the right design, and why 6.8 still ships now:**
- The crisis-suppression gate is a SAFETY gate. Shipping the feature *active* without the ability to read crisis flags would mean serving algorithmic scripture to people in acute distress — the exact harm the gate exists to prevent. Dormant-until-safe is correct.
- Building the engine now (against a mockable crisis-flag interface) means that when 10.5/10.6 land, Verse-Finds-You activates with zero additional spec work — the Phase 10 classifier simply starts returning real flags and the already-built, already-tested Step 1 starts doing its job.

**What this means for execute and review — critical:**
1. **The crisis-suppression code path is built and tested NOW.** It is not deferred. 6.8 builds Step 1 against a crisis-flag-read interface that is *mockable/seedable in tests*. The integration tests seed a crisis-flagged user and assert zero surfacing for 48h and resumption at 49h (the stub's testing notes require exactly this). The path is fully exercised in test even though it is inert in production until Phase 10.
2. **The production dormancy is verified, not assumed.** A test asserts that with no crisis-flag source wired (the pre-Phase-10 state), the pipeline returns `verse: null` safely — no 500, no crash, no verse. This is the "falls through its safe-failure path" behavior, and it must be a deliberate, tested code path, not an accident of an unhandled exception.
3. **Nobody at review treats the dormancy as an incomplete feature.** If a reviewer sees "Verse-Finds-You never surfaces a verse in a manual prod-like test," that is CORRECT pre-Phase-10 behavior. The brief, the plan, and the execution log must all state this loudly so it is not mistaken for a defect.
4. **A clear seam.** The crisis-flag read must be a single, well-named, documented interface (e.g. a `CrisisFlagGate` or equivalent — plan-recon R4 determines the exact shape and whether any pre-Phase-10 stub of it already exists). When 10.5/10.6 land, exactly one wiring point changes. The seam is documented in code so the Phase 10 work knows where to connect.

**The brief proceeds on this basis throughout.** Every reference to crisis suppression below assumes: built now, tested now via mock/seed, dormant in production until Phase 10, activates with no further spec work.

---

## 1. Branch Discipline

Branch: `forums-wave-continued`. Eric handles all git operations manually. Claude Code NEVER commits, pushes, branches, merges, rebases, or alters git state at any phase. Violation is grounds to halt execute.

At execute-start, CC verifies via `git status` (read-only) that the working tree is clean except for any pending 6.8 work. `git stash` for diagnostic baseline-compare is permitted only if it brackets within the same turn.

**Out-of-band sign-off recording:** any plan-time divergence requiring Eric's sign-off is recorded in the plan's Execution Log when received, not retroactively.

<!-- CHUNK_BOUNDARY -->

---

## 2. The 180-Passage Curation — A Human Prerequisite, Not a Code Task

This is the single most important section of the brief, and the stub's out-of-band notes are emphatic about it. **The 180-passage curated verse set is Eric's deliverable, completed and reviewed BEFORE execute begins.** CC does not invent, select, or fill in verses. Ever.

**Why this is a hard prerequisite, not execute-time work:**
- Every entry is a potential word landing on a vulnerable person. The stub: "Every bad entry is a potential wound to a vulnerable user."
- The curation requires pastoral discernment — the "pastor's wife test" (would this verse, at this moment, land as grace or as judgment?). That is a human judgment, ideally made in consultation with someone whose pastoral discernment Eric trusts. An LLM cannot make it, and must not be asked to.
- The stub recommends Eric block out **4-6 hours** for the curation. It is "the single highest-leverage piece of work in this spec, and the one most likely to be rushed."

**What CC builds (the machinery around the human deliverable):**
- The JSON *schema* and the file at `backend/src/main/resources/verses/verse-finds-you.json`, structured to hold the 180 entries
- The curation rules documented at the top of the JSON file (so future edits stay disciplined)
- The selection engine that consumes the set
- The validation tests that enforce the set's integrity (180 entries, all WEB, all ≤35 words, all with ≥1 valid tag, no forbidden tags, schema-complete)

**What Eric delivers:**
- The 180 entries themselves — `{ reference, text, translation: 'WEB', tags, excluded_contexts, approximate_length }` each
- Reviewed against the curation rules and the pastor's-wife test
- "Fewer and safer beats more and dicey" — the stub explicitly says to remove any verse Eric is unsure about, even if it means fewer than 180

**Gate-G-CURATION-PREREQ:** execute does not begin until the curated JSON file exists and Eric confirms it is reviewed. If execute reaches the point of needing the file and it is not ready, CC STOPS and surfaces — it does not generate placeholder verses to keep moving. Plan may proceed (planning the machinery doesn't need the final content), but the *execute* phase that builds the validation tests and runs them needs the real file. Plan-recon R1 confirms the file's existence/readiness state and the plan explicitly sequences the curation as a gate before the relevant execute steps.

**Curation rules (documented at the top of `verse-finds-you.json`, verbatim from the stub):**
- Short passages only (max ~35 words; longer passages lose their weight in surfacing UI)
- No "prosperity" passages (no "God will give you the desires of your heart" surfaced as a promise)
- No guilt/shame verses (no "oh ye of little faith" or mustard-seed-as-lecture)
- No judgment verses outside explicit lament context
- Prefer Psalms, Lamentations, Isaiah, Gospels of John and Matthew, Romans 8, Philippians 4, 2 Corinthians — passages explicitly about God's presence in difficulty
- Every entry reviewed against the "pastor's wife test" before inclusion
- Translation locked to WEB (World English Bible)
- The file is version-controlled; changes go through spec review, not hotfixed

**Plan-recon note (from the stub's recon notes):** the planner should recommend Eric consider including carefully-curated Old Testament lament passages (Lamentations 3, Psalm 88) under the `lament` tag — these are among the most comforting passages for acute grief precisely because they don't deny the darkness. This is a curation recommendation surfaced to Eric, not a CC decision.

---

## 3. Tier — xHigh

Five factors put 6.8 at xHigh.

**The master plan classifies it HIGH risk, for the right reason.** This is an AI-adjacent feature that surfaces scripture into vulnerability moments. The failure mode is not a broken layout — it is a guilt-verse landing on someone in grief, or a prosperity-gospel cliche landing on someone in crisis. The harm is real and the harm is to the most vulnerable users on the platform.

**The runtime-gated dependency demands precise handling.** The crisis-suppression gate must be built and tested now but dormant until Phase 10 (Section 0). Getting this wrong in either direction is bad: defer the code path and Phase 10 has to re-open 6.8; ship it active without the flag source and the feature serves scripture to people in acute distress. The seam has to be exactly right.

**"Silent failure" is a load-bearing discipline, not an error-handling afterthought.** The stub is explicit and repeats it: every pipeline failure mode (Redis down, JSON parse error, classifier timeout, tag mismatch) returns `verse: null` — never a 500, never an error message to the user, never a fallback random verse. "A bad verse is worse than no verse." "No verse is always better than wrong verse." Every failure path must be a deliberate, tested return-null, and one of them (Redis-down) must fail CLOSED (deny, not allow).

**Several deliberate pastoral decisions must ship with their rationale embedded.** The Mental Health and Grief categories map to `lament`/`comfort` and deliberately NOT to `hope` — because hope-verses can be cruel in acute depression and too soon for most grievers. The Redis-down cooldown fails closed. These are not arbitrary; they are load-bearing judgments that a future contributor could "helpfully" undo without knowing why. Like the 6.6b Mental Health omission, the rationale ships in the code/JSON comments.

**The curated set is a human prerequisite with a hard gate.** Section 2. The machinery is CC's; the content is Eric's; execute is gated on the content being ready and reviewed.

**Practical execution implication:** xHigh means Opus 4.7 thinking `xhigh` for all phases. Eric reviews: the selection engine's determinism + the fail-closed paths; the crisis-suppression seam and its tests; the JSON schema + validation tests; every trigger surface; the settings toggle default-OFF; the silent-failure paths; and a careful read of all copy. The 180-passage curation is Eric's own prerequisite work, reviewed before execute.

---

## 4. Visual & Integration Verification

### Frontend (Playwright + manual)

**Settings toggle:**
- A "Verse Finds You" toggle exists in a "Gentle extras" section of the settings page
- It defaults **OFF** for all users — new and existing
- The description reads exactly (D-Copy): "Occasionally, after you share a prayer, comment, or spend time reading, a short scripture may appear. Off by default. You can turn it on anytime."
- Enabling is a single tap — NO confirmation modal (unlike 3am Watch)
- Disabling is a single tap — no confirmation

**Verse card (when surfaced):**
- Plain text only — no HTML rendering, no Markdown. An entry containing HTML renders as escaped text, never as DOM (security test territory — see T-SEC-1)
- The card is visually distinguished from posts — it is not a post and must not look like one or be dismissible-as-a-post
- The trigger-specific prefix in Lora italic, then the verse text in the card's primary font
- The verse reference renders in a proper `<cite>` element
- The card has `role="note"` and an accessible name including "scripture"
- A "Dismiss" button with accessible name "Dismiss this verse"
- A "Save" button (the optional shareable-verse moment)
- Reduced-motion: NO fade-in animation — the verse appears instantly
- Screen reader announces the verse politely (`aria-live="polite"`), never assertively
- Color contrast passes WCAG AA in light AND Night Mode

**The three active trigger surfaces:**
- **Post-compose:** after submitting a prayer request, the verse appears below the success toast for ~8 seconds (or until dismissed), with the prefix "The word found you today:". Verse chosen from the post's category-mapped tags.
- **Comment-of-encouragement:** after leaving a supportive comment on someone else's Mental Health / Grief / Health post, a verse may appear in the COMMENTER's own view (never the post author's view), with the prefix "A word as you gave comfort:".
- **Reading-time:** after >5 minutes of *active* Prayer Wall reading in one session (foreground tab + scroll activity, not an idle tab), a verse card may appear mid-scroll, with the prefix "A word as you keep watch:".

**Dismissal + suppression flow:**
- Tapping "Dismiss" hides the verse card immediately
- After a dismissal, no new surfacing happens for the rest of that session (session-level suppression)
- After 3 dismissals in a row without engagement, a one-time inline prompt appears: "Want to turn this off? You can turn it back on anytime in settings." with "Turn off" / "Keep it on" — both clearly labeled
- The 3-in-a-row tracking lives in localStorage (`wr_verse_dismissals`)

**Save-this-verse:**
- "Save" generates a PNG client-side, reusing the 6.7 / `imageGen.ts` pipeline with PII stripping
- Rate-limited to 1 save per verse per user
- No server-side image logging

### Backend (Integration tests with Testcontainers)

**The endpoint:**
- `GET /api/v1/verse-finds-you?trigger=post_compose&context=health` returns `{ data: { verse: { reference, text } | null, cooldown_until: timestamp | null, reason: 'cooldown' | 'crisis_suppression' | 'disabled' | 'no_match' | null } }`
- Auth required — a logged-out request gets 401
- `verse: null` with a `reason` code in EVERY non-surfacing case — never a 500 for an expected non-surfacing condition
- Rate-limited to 10 requests/hour/user — the 11th returns 429

**The selection algorithm (7 steps, deterministic):**
- Step 1: crisis-flag in last 48h → null (built now, tested via seed, dormant in prod until Phase 10 — Section 0)
- Step 2: within 24h cooldown from last surfacing → null
- Step 3: Verse-Finds-You disabled in settings → null
- Step 4: determine context tags from the trigger (post-compose: post's category-mapped tags; comment: parent post's category-mapped tags; reading-time: last-viewed post's category tags)
- Step 5: filter the curated set to entries matching ANY context tag AND NOT matching `excluded_contexts`
- Step 6: select deterministically by `(user_id hash + day-of-year) modulo filtered-set-size`
- Step 7: return the selected verse
- **Determinism:** same `(user_id_hash, day_of_year, context)` always returns the same verse. Two users with the same context on the same day get the same verse. Refreshing within the same day returns the same verse for the same trigger+context.

**Cooldown + suppression:**
- 24h cooldown across ALL trigger types — trigger once, any second trigger within 24h returns null
- 48h crisis suppression is **per-user, not per-post** — a crisis-flagged user is suppressed everywhere, not just on the flagged post
- Crisis suppression: assert zero surfacing for 48h, assert resumption at 49h

**Silent failure (all must be tested, none may 500):**
- JSON parse failure → `{ verse: null, reason: 'no_match' }`, no 500
- Verse selection fails / tag lookup returns nothing → `{ verse: null, reason: 'no_match' }`, no 500
- **Redis down → fails CLOSED**: the cooldown check defaults to DENY (no verse), not allow. This prevents a Redis outage from becoming a cooldown-bypass. Tested by stopping the Redis Testcontainer mid-test.
- Pre-Phase-10 state (no crisis-flag source wired) → pipeline returns `verse: null` safely (Section 0)

**The database table + retention:**
- `verse_surfacing_log` rows are written on surfacing, used only for cooldown + 3-in-a-row detection
- A scheduled job purges rows older than 30 days — integration-tested

### Manual verification by Eric after execute

- Open settings; confirm "Verse Finds You" is in a "Gentle extras" section and defaults OFF
- With it OFF: compose a post, confirm NO verse appears and (per the AC) the UI makes zero verse API calls
- With it ON: compose a Grief-category post; confirm a grief/lament/comfort-tagged verse appears with "The word found you today:" — confirm it is NOT a hope-verse
- Confirm the verse card is visually distinct from a post, has a working Dismiss, and a working Save
- Dismiss a verse; confirm no new surfacing for the rest of the session
- Reduced-motion on: confirm the verse appears instantly, no fade
- Confirm the verse reference is a `<cite>` and a screen reader announces politely
- Note: because Phase 10 has not shipped, in a true prod-like run the feature is DORMANT (Section 0) — manual "does a verse appear" verification is done in the test/seeded environment where the crisis-flag interface is mocked, not against pre-Phase-10 prod behavior
- Read every copy string aloud against D-Copy

<!-- CHUNK_BOUNDARY -->

---

## 5. Master Plan Divergences (MPDs)

6.8 is briefed directly from the LIVE master plan stub (lines ~5887-6131). There are no *divergences* in the drift sense — the MPDs below are points where the brief makes an explicit decision the stub leaves slightly open, or hardens something the stub states once. Plan/execute honor the brief.

**MPD-1: The crisis-suppression gate is built now, against a mockable seam, dormant until Phase 10.**
The stub describes Step 1 (48h crisis suppression) and separately notes the runtime-gated dependency. The brief makes the execution shape explicit (Section 0): build the Step 1 code path and its tests now; route the crisis-flag read through a single named, documented interface; test it via seed/mock; verify the pre-Phase-10 dormancy as a deliberate tested path. Do NOT defer Step 1. Do NOT ship it active without a flag source. Plan-recon R4 determines the exact seam shape.

**MPD-2: Silent failure is a deliberate, individually-tested set of return-null paths — and Redis-down fails CLOSED.**
The stub states silent failure repeatedly but as prose. The brief promotes it to a hard gate (Gate-G-SILENT-FAILURE) with an enumerated, individually-tested failure-path list: JSON parse error, tag-lookup-empty, selection failure, Redis-down, pre-Phase-10 no-flag-source. Every one returns `{ verse: null, reason }` with no 500. Redis-down specifically fails CLOSED — cooldown defaults to DENY. The stub's recon note 6 asks to re-confirm the fail-closed decision; the brief confirms it (D-FailClosed) with the stub's own rationale: a Redis outage must not become a cooldown-bypass.

**MPD-3: The "NOT hope" mappings ship with their rationale embedded in the JSON.**
The stub maps Mental Health → `comfort, lament, presence, rest` (NOT `hope`) and Grief → `lament, presence, comfort` (NOT `hope`), with a parenthetical reason. The brief requires the category-to-tag mapping block in `verse-finds-you.json` to carry the *full rationale as a comment* — not just the mapping — so a future contributor cannot "complete" the mapping by adding `hope` without encountering why it is deliberately absent. Same discipline as the 6.6b Mental Health omission. See Gate-G-NOT-HOPE.

**MPD-4: The curated 180-passage set is a human prerequisite, gated before execute.**
The stub's out-of-band notes treat the curation as Eric's highest-leverage manual work. The brief promotes this to Gate-G-CURATION-PREREQ (Section 2): CC builds the schema, the file structure, the curation-rule header, the selection engine, and the validation tests — but the 180 entries are Eric's deliverable, reviewed before execute. CC never generates placeholder verses.

**MPD-5: No LLM in 6.8 — at all. The classifier is an explicitly deferred future enhancement.**
The stub describes an optional LLM *classifier* enhancement but is explicit it is NOT MVP. The brief draws the line hard: 6.8 contains zero LLM integration. No classifier, no generation, no user post-text leaving the app to any AI service. The selection is curated-set lookup + deterministic rotation only. The LLM classifier is named in Section 12 (Out of Scope) as a known-shape future spec. See Gate-G-NO-LLM.

**MPD-6: User post-text never flows into verse selection.**
The stub: "No user input ever flows into verse selection beyond category tag." The brief hardens this: the only thing that influences selection is the *category tag* derived from a post's existing category field. The user's actual written prayer text, comment text, or bio text is never read by the selection engine and never sent anywhere. This is both a privacy property and an injection-safety property. See Gate-G-NO-TEXT-FLOW.

---

## 6. Recon Ground Truth

R1-R3 are brief-level confirmations; R4-R10 are plan-time recon.

**R1 — PLAN-RECON-REQUIRED: the curated JSON file's readiness state.**
Plan confirms whether `backend/src/main/resources/verses/verse-finds-you.json` exists yet and whether Eric has marked it reviewed. Plan sequences Gate-G-CURATION-PREREQ explicitly: the execute steps that build + run the JSON validation tests come AFTER the file is ready. If the file is not ready at plan time, the plan still plans the machinery, but flags the curation as a blocking prerequisite for the relevant execute steps.

**R2 — PLAN-RECON-REQUIRED: the 6.1 / 6.7 image-generation pipeline for "Save this."**
The "Save this verse" moment reuses the client-side PNG generation + PII-stripping pipeline. 6.7 narrowed this into `frontend/src/lib/prayer-wall/imageGen.ts`. Plan reads the current `imageGen.ts` shape and the 6.7 `TestimonyCardImage` pattern to determine how the verse-save reuses it — a verse PNG is simpler than a testimony card, so this is consume-don't-extend. Confirm the EXIF/metadata-safe posture from 6.7 carries (the 6.7 follow-up added that documentation + test).

**R3 — PLAN-RECON-REQUIRED: how post category is stored and read.**
The selection engine's Step 4 maps a post's *category* to context tags. Plan reads how post category is represented (the same question 6.6b's R7 asked — if 6.6b has executed by now, its findings are ground truth) and how to read it for each of the three triggers: the just-composed post (post-compose), the parent post (comment), the last-viewed post (reading-time). The nine categories in the stub's mapping (`health`, `mental-health`, `family`, `work`, `grief`, `gratitude`, `praise`, `relationships`, `other`) must map to real stored category values.

**R4 — PLAN-RECON-REQUIRED: the crisis-flag read seam.**
Plan determines the exact shape of the crisis-flag-read interface (Section 0, MPD-1). Questions: is there any pre-existing crisis-detection scaffolding in the codebase (from earlier specs, or a Phase 10 stub)? If so, 6.8's Step 1 reads through it. If not, 6.8 defines a single named interface (e.g. `CrisisFlagGate`) with a pre-Phase-10 implementation that always returns "no flag readable" — which is what produces the safe dormancy. Either way: ONE seam, documented in code, so Phase 10 has exactly one wiring point. Plan documents the chosen shape.

**R5 — PLAN-RECON-REQUIRED: Redis cooldown infrastructure (5.6) + the fail-closed implementation.**
Plan confirms 5.6's Redis is available and reads existing Redis usage patterns. Critically, plan determines how to implement fail-CLOSED: when Redis is unreachable, the cooldown check must default to DENY. Plan reads how other Redis-dependent paths in the codebase handle Redis-down and confirms 6.8's path fails closed rather than inheriting a fail-open pattern. If 5.6 is unavailable, plan STOPS and surfaces.

**R6 — PLAN-RECON-REQUIRED: the three trigger insertion points.**
Plan reads `InlineComposer.tsx`, `PrayerWallFeed.tsx`, and `CommentInput.tsx` to find the exact post-submit, scroll-activity, and comment-submit hook points. The reading-time trigger specifically needs a foreground-tab + scroll-activity signal (not idle-tab) — plan determines whether such an activity signal already exists or must be built, and how ">5 minutes active" is measured.

**R7 — PLAN-RECON-REQUIRED: the settings page + the "Gentle extras" section.**
Plan reads the settings page to determine whether a "Gentle extras" section already exists (e.g. from 6.3 Night Mode or another opt-in feature) or must be created, and how the existing settings toggles are structured (the stub references `wr_settings.verseFindsYou.enabled`). The toggle must default OFF for new AND existing users — plan confirms the settings-default mechanism handles existing users correctly.

**R8 — PLAN-RECON-REQUIRED: the Liquibase changeset for `verse_surfacing_log`.**
The stub names the changeset `2026-04-22-003-create-verse-surfacing-log.xml`. Plan confirms the changelog naming/sequencing convention and whether `2026-04-22-003` is still an available slot (other specs in this wave have added changesets — 6.6b added a `post_reactions` ALTER). The table: `(user_id, verse_id, surfaced_at, trigger_type, dismissed_at)`, index on `(user_id, surfaced_at DESC)`, 30-day retention. If the exact filename `2026-04-22-003` collides with an already-shipped changeset, plan picks the correct next name — the table shape is what matters, not the literal filename.

**R9 — PLAN-RECON-REQUIRED: the 30-day retention scheduled job.**
Plan determines whether a scheduled-job mechanism already exists in the backend (Spring `@Scheduled` or similar) that the `verse_surfacing_log` purge can hook into, or whether one must be established. Reads any existing retention/purge jobs for the pattern.

**R10 — PLAN-RECON-REQUIRED: localStorage key conventions.**
The stub adds `wr_settings.verseFindsYou.enabled` and `wr_verse_dismissals` to `.claude/rules/11-local-storage-keys.md`. Plan reads that rules file for the existing key-naming + nesting conventions (6.6b's D-Copy noted `wr_settings.prayerWall.dismissedShareWarning` as a nested example) so 6.8's keys follow the established shape, and confirms `wr_verse_dismissals` holds what the 3-in-a-row prompt needs (dismissal count + last-dismissed timestamp).

<!-- CHUNK_BOUNDARY -->

---

## 7. Gates — Applicability

| Gate | Applicability | Notes |
|------|---------------|-------|
| Gate-1 (Liquibase rules) | **Applies (HARD).** | The `verse_surfacing_log` changeset. Append-only; permanent MD5; idempotent; the index on `(user_id, surfaced_at DESC)` is part of the changeset. |
| Gate-2 (OpenAPI updates) | **Applies.** | Document `GET /api/v1/verse-finds-you` with the trigger + context params and the full response shape including all `reason` codes. |
| Gate-3 (Copy Deck) | **Applies (HARD).** | Three trigger prefixes, settings label + description, dismiss/save labels, the 3-in-a-row prompt + its two buttons. See Gate-G-COPY. |
| Gate-4 (Tests mandatory) | **Applies (HARD).** | The stub mandates "at least 35 tests." See Section 9. |
| Gate-5 (Accessibility) | **Applies (HARD).** | `role="note"`, accessible name including "scripture", `<cite>` for the reference, `aria-live="polite"`, reduced-motion (no fade-in), WCAG AA in light + Night Mode. See Gate-G-A11Y. |
| Gate-6 (Performance) | **Applies.** | The endpoint is rate-limited 10/hr/user. The selection engine is an in-memory curated-set lookup — fast by construction — but the cooldown check hits Redis; confirm it stays within budget. |
| Gate-7 (Rate limiting) | **Applies (HARD).** | 10 endpoint requests/hr/user (11th → 429). Save-this-verse limited to 1/verse/user. Both tested. |
| Gate-8 (Respect existing patterns) | **Applies.** | Reuse 5.6 Redis patterns, the 6.7 `imageGen.ts` pipeline, the existing settings-toggle structure, the existing scheduled-job mechanism. Don't invent parallels. |
| Gate-9 (Plain text only) | **Applies (HARD).** | Verse text and references render as plain text — no HTML, no Markdown, no `dangerouslySetInnerHTML`. Injection-tested. See Gate-G-PLAINTEXT. |
| Gate-10 (Crisis detection supersession) | **Applies (HARD) — this is the spec's defining gate.** | Universal Rule 13: the backend crisis classifier is authoritative; crisis suppresses Verse-Finds-You for 48h. Built now against a mockable seam, dormant until Phase 10 (Section 0). See Gate-G-CRISIS-SEAM. |

**New gates specific to 6.8:**

**Gate-G-CRISIS-SEAM (HARD).**
The 48h crisis-flag suppression (Step 1) is built and tested in 6.8, routed through a single named, documented crisis-flag-read interface. It is NOT deferred. It is NOT shipped active without a flag source. Tests seed a crisis-flagged user and assert zero surfacing for 48h + resumption at 49h. A separate test asserts the pre-Phase-10 state (no flag source wired) returns `verse: null` safely — a deliberate tested path, not an unhandled exception. Code review hard-blocks: Step 1 missing or stubbed-to-noop without the documented seam; the dormancy being an uncaught exception rather than a deliberate return-null; more than one wiring point for the eventual Phase 10 connection.

**Gate-G-SILENT-FAILURE (HARD).**
Every failure mode in the surfacing pipeline returns `{ verse: null, reason }` with NO 500 and NO user-facing error. Enumerated and individually tested: JSON parse error, empty tag lookup, selection failure, Redis-down, pre-Phase-10 no-flag-source. Redis-down fails CLOSED (cooldown → DENY). No fallback random verse, ever. Code review hard-blocks: any pipeline failure that produces a 500; any fail-OPEN path; any "default verse" fallback.

**Gate-G-NO-LLM (HARD).**
6.8 contains zero LLM integration of any kind — no classifier, no generation, no verse selection by a model. The selection is curated-set lookup + deterministic rotation. Code review hard-blocks any LLM/AI-service call introduced anywhere in 6.8's surface.

**Gate-G-NO-TEXT-FLOW (HARD).**
The user's actual written text (prayer body, comment body, bio) never flows into verse selection and never leaves the app to any service. Selection input is the category *tag* derived from a post's existing category field — nothing else. Code review hard-blocks any path where post/comment/bio text reaches the selection engine or an external call.

**Gate-G-NOT-HOPE (HARD).**
The category-to-tag mapping maps `mental-health` → `comfort, lament, presence, rest` and `grief` → `lament, presence, comfort` — deliberately NOT `hope`. The mapping block in `verse-finds-you.json` ships with the full rationale as a comment. Code review hard-blocks: `hope` added to either mapping; the rationale comment missing.

**Gate-G-CURATION-PREREQ (HARD).**
Execute does not build/run the JSON validation tests until the curated 180-passage file exists and Eric confirms it reviewed. CC never generates placeholder verses. Code review hard-blocks any CC-authored verse content.

**Gate-G-DEFAULT-OFF (HARD).**
The "Verse Finds You" settings toggle defaults OFF for all users — new AND existing. An integration test verifies that with the toggle off, the UI makes ZERO verse API calls. Code review hard-blocks a default-on toggle or a default mechanism that misses existing users.

**Gate-G-PLAINTEXT (HARD).**
Verse text and references render as plain text only — no HTML, no Markdown, no `dangerouslySetInnerHTML`. A security test injects HTML in a test verse entry and asserts it renders as escaped text, not DOM. Code review hard-blocks any rich-text rendering path for verse content.

**Gate-G-COPY (HARD).**
All copy in Section 8 D-Copy is Eric-approved before execute. The Anti-Pressure Copy Checklist applies: no comparison, no urgency, no exclamation points near vulnerability, no therapy-app jargon, no streak-as-shame, no false scarcity.

**Gate-G-A11Y (HARD).**
MUST cover: `role="note"` + accessible name including "scripture"; the reference in a `<cite>`; `aria-live="polite"`; reduced-motion disables fade-in (verse appears instantly); WCAG AA contrast in light AND Night Mode; the dismiss button's accessible name; axe-core zero violations on the verse card.

---

## 8. Decisions Catalog

**D-Scope: 6.8 ships the complete feature; the crisis gate is runtime-dormant until Phase 10.**
6.8 ships the curated set machinery, the selection engine, all four trigger surfaces (three active + crisis-adjacency as the never-surface anti-pattern), the settings toggle, cooldown, dismissal flow, endpoint, table. The crisis-suppression gate is built and tested but dormant in production until 10.5/10.6 land (Section 0). 6.8 contains no LLM.

**D-CrisisSeam: one named, documented crisis-flag interface.**
Step 1 reads the crisis flag through a single interface (plan-recon R4 names it and determines whether pre-existing scaffolding exists). Pre-Phase-10, its implementation reports "no flag readable," which produces the safe dormancy. When Phase 10 lands, exactly one wiring point changes. The seam is documented in code with a pointer to Section 0 of this brief.

**D-FailClosed: Redis-down denies surfacing.**
When the Redis cooldown check cannot complete (Redis unreachable), the result is DENY — no verse. Rationale (from the stub, re-confirmed per its recon note 6): a Redis outage must never become a cooldown-bypass that lets the feature over-surface. "No verse" is always the safe direction. This is implemented as a deliberate catch → return-null-with-reason, tested by stopping the Redis Testcontainer mid-test.

**D-SilentFailure: every pipeline error returns null, never 500, never a fallback verse.**
JSON parse error, empty tag-filter result, selection exception, Redis-down, no-flag-source — all return `{ verse: null, reason }`. The `reason` codes: `cooldown`, `crisis_suppression`, `disabled`, `no_match`. No user-facing error message. No "default" or "random" verse on failure. "A bad verse is worse than no verse; no verse is better than wrong verse."

**D-Determinism: selection is deterministic by (user_id hash + day-of-year).**
Step 6 selects via `(user_id hash + day-of-year) modulo filtered-set-size`. Consequences, all intended and all tested: two users with the same context on the same day get the same verse (emergent shared-verse community moments); refreshing within the same day returns the same verse (no refresh-gaming / no slot-machine dopamine loop); the verse rotates daily, not per-visit.

**D-CategoryTagMapping: the nine-category mapping is implemented exactly as the stub specifies, rationale embedded.**
The mapping (`health`, `mental-health`, `family`, `work`, `grief`, `gratitude`, `praise`, `relationships`, `other` → their tag sets) lives in `verse-finds-you.json` and is implemented verbatim. The `mental-health` and `grief` → NOT-`hope` decisions ship with the full rationale as a comment (Gate-G-NOT-HOPE). A test asserts the implemented mapping matches the spec mapping exactly.

**D-ExcludedContexts: a verse can be suppressed for a context even if it matches another tag.**
Step 5 filters to entries matching ANY context tag AND NOT matching `excluded_contexts`. This is the defensive lever: a `hope`-tagged verse that would be wrong at a funeral can carry `excluded_contexts: ['grief']`. Unit-tested directly.

**D-NoLLM: zero LLM in 6.8.**
The LLM classifier described in the stub is an explicitly deferred future enhancement, named in Section 12. 6.8 is curated-set + deterministic selection only. (Gate-G-NO-LLM.)

**D-CurationIsHumanWork: the 180 passages are Eric's reviewed deliverable.**
CC builds the schema, the curation-rule header, the engine, the validation tests. Eric delivers the 180 reviewed entries before execute. Fewer-and-safer beats more-and-dicey. (Gate-G-CURATION-PREREQ.)

**D-DefaultOff: the toggle is OFF for everyone until deliberately enabled.**
New and existing users. No confirmation modal on enable or disable — the stub is explicit that this feature's risk is quieter than 3am Watch's, so a simple one-tap toggle is right; the protection here is default-off + the curation + the cooldowns, not a confirmation gate. (Gate-G-DEFAULT-OFF.)

**D-DismissalFlow: session suppression after one dismissal; gentle off-ramp after three.**
Tapping Dismiss hides the card immediately and suppresses further surfacing for that session. Three dismissals in a row without engagement triggers a one-time inline prompt offering a one-tap off switch. The 3-in-a-row state lives in `wr_verse_dismissals` (localStorage).

**D-SaveReuse6.7: "Save this" reuses the 6.7 image pipeline, consume-not-extend.**
The optional Save-this-verse moment generates a client-side PNG via the existing `imageGen.ts` pipeline with PII stripping. A verse PNG is simpler than a testimony card — this consumes the existing pipeline, does not extend or fork it. Rate-limited 1/verse/user. No server-side image logging.

**D-Copy: Authored inline.** (Gate-G-COPY)

*Post-compose surfacing prefix:* **"The word found you today:"**
*Comment surfacing prefix:* **"A word as you gave comfort:"**
*Reading-time surfacing prefix:* **"A word as you keep watch:"**
*Dismiss button:* **"Dismiss"** (accessible name: **"Dismiss this verse"**)
*Save-this-verse button:* **"Save"**
*Settings toggle label:* **"Verse Finds You"**
*Settings description:* **"Occasionally, after you share a prayer, comment, or spend time reading, a short scripture may appear. Off by default. You can turn it on anytime."**
*3-in-a-row dismissal prompt:* **"Want to turn this off? You can turn it back on anytime in settings."**
*3-in-a-row dismiss primary button:* **"Turn off"**
*3-in-a-row dismiss secondary button:* **"Keep it on"**

*Settings section heading:* **"Gentle extras"** (plan-recon R7 confirms whether this section already exists or is created here)

**Anti-Pressure Copy Checklist** (from the stub, all must hold): (a) no comparison ✓ (b) no urgency ✓ (c) no exclamation points near vulnerability ✓ (d) no therapy-app jargon ✓ (e) no streak-as-shame ✓ (f) no false scarcity ✓

<!-- CHUNK_BOUNDARY -->

---

## 9. Watch-Fors

Organized by concern area. ~30 items.

### Crisis-suppression seam (Gate-10 / the defining gate)

**W1.** Step 1 (48h crisis suppression) is BUILT, not deferred. A plan or execution that skips Step 1 "because Phase 10 isn't ready" is wrong — the path is built now and tested via mock/seed.
**W2.** The crisis-flag read goes through ONE named interface. Not scattered inline checks. Plan-recon R4 names it.
**W3.** The pre-Phase-10 dormancy is a DELIBERATE return-null, not an uncaught exception that happens to suppress. A test asserts the no-flag-source path returns `verse: null` cleanly.
**W4.** Crisis suppression is per-USER, not per-post. A crisis-flagged user gets zero surfacing everywhere for 48h — not just on the flagged post.
**W5.** The seam is documented in code with a pointer to this brief's Section 0, so the Phase 10 work knows exactly where to connect.
**W6.** Do not let the dormancy leak into a confusing UX. Pre-Phase-10, the feature simply never surfaces — no error, no "coming soon," no broken UI. It is silently inert.

### Silent failure (Gate-G-SILENT-FAILURE)

**W7.** EVERY failure path returns `{ verse: null, reason }`. None returns a 500. Enumerate them in code review: JSON parse, empty tag lookup, selection exception, Redis-down, no-flag-source.
**W8.** Redis-down fails CLOSED. The cooldown check, when Redis is unreachable, defaults to DENY. A fail-OPEN here is a cooldown-bypass bug — hard-block.
**W9.** No fallback random verse. Ever. On any failure, the answer is no verse — not "a safe default verse," not "a random one."
**W10.** No user-facing error message on a non-surfacing. The user never learns the pipeline failed; they just don't get a verse, which is indistinguishable from the (common) normal no-surfacing case.
**W11.** The `reason` codes are for the client/debugging, not the user. `cooldown`, `crisis_suppression`, `disabled`, `no_match` — confirm the UI never renders a `reason` to the user.

### The curated set (Gate-G-CURATION-PREREQ)

**W12.** CC NEVER generates verse content. Not even placeholders, not even "example" entries to make tests pass. If the file isn't ready, execute STOPS and surfaces.
**W13.** The validation tests run against the REAL file. They are: 180 entries (or fewer if Eric curated down — the test asserts a sane floor, not exactly 180, since "fewer and safer" is allowed), all WEB translation, all `text` ≤35 words, all entries have ≥1 valid tag, all required fields present, no forbidden/prosperity-adjacent tags.
**W14.** The curation rules live as a comment block at the top of the JSON. They are not just in this brief — they ship in the file so future edits stay disciplined.
**W15.** `excluded_contexts` is real and enforced. A verse tagged `hope` with `excluded_contexts: ['grief']` must NOT surface for a grief context even though grief-context includes hope-adjacent... actually grief does NOT map to hope, but the mechanism must still be tested directly: a verse excluded from a context it would otherwise match is filtered out.

### Category-to-tag mapping (Gate-G-NOT-HOPE)

**W16.** `mental-health` maps to `comfort, lament, presence, rest` — NOT `hope`. `grief` maps to `lament, presence, comfort` — NOT `hope`. A test asserts the implemented mapping equals the spec mapping exactly.
**W17.** The "NOT hope" rationale ships as a comment in the JSON mapping block. A future contributor must encounter WHY before they can "helpfully complete" the mapping.
**W18.** All nine categories are mapped (`health`, `mental-health`, `family`, `work`, `grief`, `gratitude`, `praise`, `relationships`, `other`). A category with no mapping is a latent `no_match`-for-everyone bug.

### Determinism (D-Determinism)

**W19.** Selection is `(user_id hash + day-of-year) mod filtered-set-size`. Same inputs → same verse. Tested directly.
**W20.** Two different users, same context, same day → same verse. This is intended (shared-verse community moments) — do not "fix" it by adding per-user randomness.
**W21.** Refresh within the same day → same verse. No refresh-gaming. If a reviewer sees "refreshing changes the verse," that's a determinism bug.
**W22.** Day-of-year rollover: confirm the selection changes at the day boundary and that the boundary uses a consistent timezone (plan-recon may need to confirm which — likely the same convention other daily-rotation features use).

### Triggers (the three active surfaces)

**W23.** Post-compose surfaces below the success toast, ~8s or until dismissed. Comment surfaces in the COMMENTER's view, never the post author's. Reading-time needs >5min ACTIVE engagement (foreground + scroll), not an idle tab.
**W24.** The comment trigger only fires on supportive comments to Mental Health / Grief / Health posts — not on every comment everywhere.
**W25.** All three triggers share the ONE 24h cooldown. Triggering post-compose then immediately triggering comment within 24h → the second returns null. The cooldown is global across trigger types, not per-type.
**W26.** The reading-time "active engagement" signal must not fire for a backgrounded/idle tab left open for 5 minutes. Plan-recon R6 determines how active-ness is measured.

### Settings, dismissal, save

**W27.** The toggle defaults OFF for EXISTING users too, not just new ones. A migration or default mechanism that only covers new accounts is a bug (Gate-G-DEFAULT-OFF).
**W28.** With the toggle OFF, the UI makes ZERO verse API calls — not "calls that return null." The integration test asserts no call is made at all.
**W29.** 3-in-a-row dismissal tracking lives in `wr_verse_dismissals` (localStorage) and triggers the off-ramp prompt exactly once. "In a row" means without engagement in between — an engaged verse resets the count.
**W30.** Save-this-verse reuses `imageGen.ts` (consume, don't fork), is rate-limited 1/verse/user, and logs nothing server-side. Confirm the 6.7 PII-stripping + EXIF-safe posture carries.

### Cross-cutting

**W31.** Plain text only. The verse text and reference render as escaped text. A security test injects HTML into a test entry and asserts it does not become DOM (Gate-G-PLAINTEXT).
**W32.** User post-text never reaches the selection engine or any external service. The only selection input is the category tag (Gate-G-NO-TEXT-FLOW).
**W33.** Zero LLM in 6.8 (Gate-G-NO-LLM). If any step "would be easier with a quick classifier call," that is the future-enhancement spec, not 6.8.
**W34.** The `verse_surfacing_log` retention job purges >30-day rows and is integration-tested. The table is for cooldown + 3-in-a-row only — not analytics, not "which verses worked" tracking (the stub explicitly forbids engagement-optimization tracking).

---

## 10. Test Specifications

The stub mandates **at least 35 tests** across selection determinism, cooldowns, crisis suppression, category mapping, a11y, injection-safety, and graceful degradation. Backend: JUnit + Testcontainers. Frontend: Vitest + RTL. E2E: Playwright. The list below is ~38.

### Selection engine — determinism & filtering (7)

**T1.** Selection is deterministic: identical `(user_id_hash, day_of_year, context)` returns the same verse across repeated calls.
**T2.** Two different users, same context, same day → same verse.
**T3.** Same user, same context, day boundary crossed → verse changes.
**T4.** Refresh within the same day, same trigger+context → same verse.
**T5.** `excluded_contexts` filters out a verse that would otherwise match a context tag.
**T6.** A context whose filtered set is empty → returns null with `reason: 'no_match'` (no exception).
**T7.** The implemented category-to-tag mapping equals the spec mapping exactly, including `mental-health` and `grief` NOT mapping to `hope`.

### Crisis suppression (5)

**T8.** Seed a crisis-flagged user; attempt post-compose trigger → zero surfacing.
**T9.** Same user, attempt all three triggers within 48h → zero surfacing on all.
**T10.** Crisis suppression resumes at 49h → surfacing works again after the window.
**T11.** Crisis suppression is per-user: a crisis-flagged user is suppressed on posts other than the flagged one.
**T12.** Pre-Phase-10 state (no crisis-flag source wired) → pipeline returns `verse: null` safely, no 500, no exception leak.

### Cooldown (4)

**T13.** Trigger once, attempt a second trigger (any type) within 24h → second returns null with `reason: 'cooldown'`.
**T14.** Cooldown is global across trigger types: post-compose then comment within 24h → comment suppressed.
**T15.** After 24h, surfacing works again.
**T16.** Redis-down: cooldown check fails CLOSED → returns null (no verse), tested by stopping the Redis Testcontainer mid-test.

### Graceful degradation / silent failure (5)

**T17.** JSON parse failure (corrupt the file in-test) → `{ verse: null, reason: 'no_match' }`, no 500.
**T18.** Empty tag lookup → `{ verse: null, reason: 'no_match' }`, no 500.
**T19.** Redis-down → no 500, safe degradation (fail-closed).
**T20.** No failure path returns a fallback/default/random verse.
**T21.** No failure path emits a user-facing error message.

### Endpoint & rate limiting (4)

**T22.** `GET /api/v1/verse-finds-you` requires auth — logged-out → 401.
**T23.** Response shape: `{ data: { verse, cooldown_until, reason } }` with the documented `reason` enum.
**T24.** Rate limit: 10 requests/hour/user; the 11th → 429.
**T25.** Disabled toggle → `{ verse: null, reason: 'disabled' }`.

### Curated JSON validation (5)

**T26.** The file exists and parses; entry count meets the curation floor.
**T27.** Every entry has `reference`, `text`, `translation`, `tags` (non-empty array).
**T28.** Every entry's `translation` is `'WEB'`.
**T29.** Every entry's `text` is ≤35 words.
**T30.** No entry carries a forbidden/prosperity-adjacent tag; every tag is in the known tag enum.

### Frontend — component, a11y, injection (8)

**T31.** With the toggle OFF, the UI makes ZERO verse API calls (integration).
**T32.** Verse card has `role="note"` and an accessible name including "scripture".
**T33.** The verse reference renders inside a `<cite>` element.
**T34.** Reduced-motion: no fade-in; the verse appears instantly.
**T35.** Screen reader path: the card uses `aria-live="polite"`.
**T36.** Color contrast passes WCAG AA in light AND Night Mode.
**T37.** Injection-safety: a test verse entry containing HTML renders as escaped text, not DOM.
**T38.** Dismiss hides the card immediately; after dismissal no new surfacing in the same session; 3-in-a-row dismissal triggers the off-ramp prompt with both buttons labeled.

### Retention + E2E

**T39.** Integration: the `verse_surfacing_log` retention job purges rows older than 30 days.
**T-E2E-1.** Playwright: enable Verse-Finds-You in settings, compose a post, dismiss the verse, verify session-level suppression.
**T-E2E-2.** Playwright: disable Verse-Finds-You, compose a post, verify no verse appears.
**T-SEC-1.** Security: verify the user's post text is not transmitted to any external service (MVP: no LLM at all; assert no outbound classification call exists).

<!-- CHUNK_BOUNDARY -->

---

## 11. Files

All paths relative to repo root. Plan-recon confirms exact paths.

### Create

**Frontend:**
- `frontend/src/components/prayer-wall/VerseFindsYou.tsx` — the verse card component (all three trigger surfaces render it; `role="note"`, `<cite>`, `aria-live`, reduced-motion, Dismiss + Save)
- `frontend/src/hooks/useVerseFindsYou.ts` — the hook that calls the endpoint, holds session-suppression state, manages the `wr_verse_dismissals` 3-in-a-row tracking
- `frontend/src/components/prayer-wall/__tests__/VerseFindsYou.test.tsx` and a test file for the hook

**Backend:**
- `backend/src/main/java/com/worshiproom/verse/VerseFindsYouController.java`
- `backend/src/main/java/com/worshiproom/verse/VerseFindsYouService.java`
- `backend/src/main/java/com/worshiproom/verse/VerseSelectionEngine.java` — the deterministic 7-step selection logic
- `backend/src/main/java/com/worshiproom/verse/dto/VerseFindsYouResponse.java`
- The crisis-flag-read interface (name + shape per plan-recon R4) — with a pre-Phase-10 implementation that reports "no flag readable"
- `backend/src/main/resources/verses/verse-finds-you.json` — **schema + curation-rule header + category-to-tag mapping block created by CC; the 180 entries delivered by Eric** (Gate-G-CURATION-PREREQ)
- A new Liquibase changeset creating `verse_surfacing_log` (the stub names `2026-04-22-003-create-verse-surfacing-log.xml`; plan-recon R8 confirms the correct next changeset name if that slot is taken) — table `(user_id, verse_id, surfaced_at, trigger_type, dismissed_at)`, index on `(user_id, surfaced_at DESC)`
- The 30-day retention scheduled job (or a hook into an existing job mechanism — plan-recon R9)
- `backend/src/test/java/com/worshiproom/verse/VerseSelectionEngineTest.java`
- `backend/src/test/java/com/worshiproom/verse/VerseFindsYouIntegrationTest.java`

### Modify

- `frontend/src/components/prayer-wall/InlineComposer.tsx` — post-compose trigger hook point (plan-recon R6 confirms exact name/location)
- `frontend/src/components/prayer-wall/PrayerWallFeed.tsx` — reading-time trigger (the >5min active-engagement signal)
- `frontend/src/components/prayer-wall/CommentInput.tsx` — comment-of-encouragement trigger hook point
- The settings page — add the "Verse Finds You" toggle in a "Gentle extras" section (plan-recon R7 confirms whether the section exists)
- `.claude/rules/11-local-storage-keys.md` — document `wr_settings.verseFindsYou.enabled` and `wr_verse_dismissals`
- OpenAPI spec — document `GET /api/v1/verse-finds-you`
- The settings type + default mechanism — `verseFindsYou.enabled` defaults false for new AND existing users

### Do NOT modify

- The 6.7 `imageGen.ts` pipeline — 6.8's "Save this" CONSUMES it, does not extend or fork it
- Any crisis-detection code beyond the single 6.8-defined seam interface — 6.8 does not build Phase 10; it builds the seam Phase 10 will connect to
- Shipped Prayer Wall / PrayerCard / feed internals beyond the three named trigger hook points

### Delete

- Nothing.

---

## 12. Acceptance Criteria

6.8 is done when (consolidated from the stub's AC list):

**Toggle & gating:**
- [ ] A. The "Verse Finds You" settings toggle defaults OFF for all users, new and existing
- [ ] B. With the toggle off, verse surfacing NEVER fires — the UI makes zero verse API calls (integration-verified)
- [ ] C. Logged-out users receive no verses — the endpoint requires auth (401 if attempted)

**The three active triggers:**
- [ ] D. Post-compose surfaces a verse when enabled, not in cooldown, no crisis flag, matching verse exists — chosen from the post's category-mapped tags
- [ ] E. Comment-encouragement surfaces on supportive comments to Mental Health / Grief / Health posts, in the commenter's own view only
- [ ] F. Reading-time requires >5min active engagement (foreground tab + scroll activity)

**Cooldown & crisis suppression:**
- [ ] G. 24h cooldown across ALL triggers (trigger once, second trigger within 24h → no surfacing)
- [ ] H. 48h crisis-flag suppression — a crisis-flagged user gets zero surfacing on all triggers; resumes at 49h
- [ ] I. Crisis suppression is per-user, not per-post
- [ ] J. The crisis-suppression path is built and tested now via mock/seed; the pre-Phase-10 dormancy is a deliberate, tested return-null

**The curated set:**
- [ ] K. `verse-finds-you.json` exists with the curated passages (curation floor met), all WEB, all with ≥1 valid tag, all `text` ≤35 words, schema-complete, no forbidden tags
- [ ] L. The category-to-tag mapping matches the spec exactly; `mental-health` and `grief` map to `lament`/`comfort` family, NOT `hope`; the rationale ships as a comment in the JSON
- [ ] M. `excluded_contexts` is enforced in selection

**Determinism:**
- [ ] N. Selection is deterministic by `(user_id_hash, day_of_year, context)`; two users same context same day → same verse; refresh within a day → same verse

**Endpoint & limits:**
- [ ] O. The endpoint returns the documented shape with `reason` codes; `verse: null` in all non-surfacing cases
- [ ] P. Rate limit 10 req/hr/user (11th → 429); Save-this-verse limited to 1/verse/user

**Silent failure:**
- [ ] Q. JSON parse failure, empty tag lookup, selection failure → `{ verse: null }`, no 500
- [ ] R. Redis-down → no 500; cooldown fails CLOSED (deny); tested via Testcontainer stop
- [ ] S. No failure path returns a fallback/random verse or a user-facing error

**Dismissal & save:**
- [ ] T. Dismiss hides the card immediately; session-level suppression after dismissal; 3-in-a-row → off-ramp prompt with both buttons labeled
- [ ] U. Save-this-verse generates a client-side PNG with PII stripping, reusing `imageGen.ts`; no server-side image logging

**Plain text & no LLM:**
- [ ] V. Verse content renders as plain text; injected HTML in a test entry renders escaped, not as DOM
- [ ] W. Zero LLM integration anywhere in 6.8; user post-text never reaches selection or any external service

**Accessibility:**
- [ ] X. Verse card has `role="note"` + accessible name including "scripture"; reference in `<cite>`; `aria-live="polite"`; reduced-motion disables fade-in; WCAG AA in light + Night Mode; axe-core zero violations

**Retention & tests:**
- [ ] Y. The `verse_surfacing_log` retention job purges rows older than 30 days (integration-tested)
- [ ] Z. At least 35 tests across determinism, cooldowns, crisis suppression, category mapping, a11y, injection-safety, graceful degradation — all pass
- [ ] AA. Backend lint + typecheck + tests pass; frontend lint + typecheck + tests pass

---

## 13. Out of Scope

From the stub, verbatim in intent:
- LLM-based verse selection or generation — explicitly deferred; MVP is curated-set only
- LLM-based user-content classification — a known-shape future enhancement spec, out of scope here
- Daily-verse notification — explicitly an anti-pattern for this feature's design intent
- User-curated verse collections ("save verses I love")
- Sharing verses to social with Worship Room branding as a growth loop — would turn the feature into marketing
- Audio/spoken verses
- Multiple translations — WEB only in MVP
- Personalized verse preferences ("I prefer Psalms") — the deterministic daily rotation is the wrong substrate for personalization
- Verse scheduling ("send me a verse every morning") — daily-verse pattern is an anti-pattern for this feature
- Phase 10 itself — 6.8 builds the crisis-flag seam, not the crisis classifier

---

## 14. Tier Rationale (Closing)

xHigh because 6.8 is the master plan's own HIGH-risk classification made concrete: a feature that surfaces scripture into vulnerability moments, where the failure mode is a wrong verse landing on a grieving or distressed person. The hard parts are the runtime-gated crisis seam (built now, dormant until Phase 10, exactly one wiring point), the load-bearing silent-failure discipline (every failure returns null, Redis-down fails closed, no fallback verse ever), the deliberate pastoral decisions that must ship with embedded rationale (the "NOT hope" mappings), and the human-prerequisite curation gate (CC never generates a verse). The subtle failure modes — a fail-open Redis path, a crisis seam that's an uncaught exception instead of a deliberate return-null, `hope` quietly added to the grief mapping, a CC-generated placeholder verse slipping into the set — each would pass a casual review. xHigh thinking for all phases; Eric reviews the selection engine, the crisis seam + its tests, the silent-failure paths, the JSON schema + validation, the copy, and personally owns the 180-passage curation before execute.

---

## 15. Recommended Planner Instruction

> Plan Spec 6.8 from `spec-6-8-brief.md`. This is a HIGH-risk, AI-adjacent feature. Read Section 0 first — the crisis-suppression gate is built and tested NOW against a mockable seam but is runtime-dormant until Phase 10 (10.5/10.6); that dormancy is intended behavior, not an incomplete feature.
>
> Run plan-recon R1-R10 before planning: the curated JSON file's readiness, the 6.7 `imageGen.ts` reuse, post-category storage, the crisis-flag seam shape, the Redis fail-closed implementation, the three trigger insertion points, the settings "Gentle extras" section, the Liquibase changeset naming, the retention-job mechanism, and the localStorage key conventions.
>
> Honor all HARD gates: Gate-G-CRISIS-SEAM, Gate-G-SILENT-FAILURE (Redis-down fails CLOSED), Gate-G-NO-LLM, Gate-G-NO-TEXT-FLOW, Gate-G-NOT-HOPE, Gate-G-CURATION-PREREQ (CC never generates verses), Gate-G-DEFAULT-OFF, Gate-G-PLAINTEXT, Gate-G-COPY, Gate-G-A11Y.
>
> Sequence Gate-G-CURATION-PREREQ explicitly: the execute steps that build and run the JSON validation tests come AFTER Eric's curated 180-passage file is ready and reviewed. Plan the machinery freely; gate the content-dependent execute steps.
>
> If 5.6 Redis is unavailable, STOP and surface. If plan-recon finds the post-category storage doesn't map cleanly to the nine categories, STOP and surface. Standard discipline: no git operations.

---

## 16. Verification Handoff Checklist

For `/verify-with-playwright` after execute:

- [ ] Settings: "Verse Finds You" in a "Gentle extras" section, defaults OFF, one-tap enable/disable, no confirmation modal
- [ ] Toggle OFF → composing a post produces no verse and no verse API call
- [ ] Toggle ON → post-compose on a Grief post surfaces a grief/lament/comfort verse (NOT a hope verse) with "The word found you today:"
- [ ] Verse card: visually distinct from posts, `role="note"`, reference in `<cite>`, working Dismiss + Save
- [ ] Dismiss → card hides immediately; no new surfacing in the same session
- [ ] Reduced-motion on → verse appears instantly, no fade
- [ ] Inline element positional verification: the verse card sits below the success toast (post-compose), in the commenter's view (comment), mid-scroll and post-distinct (reading-time) — each where the brief specifies
- [ ] axe-core: zero violations on the verse card in light + Night Mode
- [ ] Note the Phase 10 dormancy: in a true prod-like environment the feature is inert; "does a verse appear" verification runs in the seeded/mocked environment
- [ ] Residue check before handoff: grep for `gradle`, `gradlew`, `npm`, WR-personal-stack terms — none present

---

## 17. Prerequisites Confirmed

- [x] 5.6 (Redis cache) — required for cooldown; plan-recon R5 confirms availability and the fail-closed pattern
- [x] 6.1 (Prayer Receipt) — curated-verse-set pattern + the `imageGen.ts` pipeline 6.8's "Save this" reuses
- [x] The live 6.8 master plan stub read in full (lines ~5887-6131) — this brief is authored against the LIVE stub, not the pristine-baseline backup
- [ ] **The 180-passage curated verse set** — Eric's deliverable, reviewed before execute (Gate-G-CURATION-PREREQ). NOT yet confirmed complete; this is the gating prerequisite for the content-dependent execute steps.
- [~] 10.5 / 10.6 (crisis detection) — runtime-gated, NOT blocking. 6.8 builds the seam now; the feature is dormant until Phase 10 lands (Section 0).

---

## End of Brief

