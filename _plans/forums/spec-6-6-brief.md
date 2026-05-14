# Brief: Spec 6.6 — Answered Wall

**Master plan reference:** `_forums_master_plan/round3-master-plan.md` (Spec 6.6 stub) — ID `round3-phase06-spec06-answered-wall`

**Spec ID:** `round3-phase06-spec06-answered-wall`

**Phase:** 6 (Slow Sanctuary / Quiet Engagement Loop)

**Size:** L (Large)

**Risk:** Medium (master plan); brief concurs — most infrastructure exists; the careful piece is the DB CHECK-constraint migration

**Tier:** **xHigh** (low-end) — DB migration on a permanent-MD5 CHECK constraint; new public-facing surface; brand-defining emotional weight (Answered Wall is a testimony surface). Not MAX: no crisis/privacy/AI stakes, and the data model + mark-as-answered flow already exist, which materially reduces risk.

**Prerequisites:**
- 6.5 (Intercessor Timeline) — must merge first per master plan; 6.6's AnsweredCard extends PrayerCard where 6.5's IntercessorTimeline mounts
- 6.1 (Prayer Receipt) — ✅ (post_reactions infrastructure)
- Existing Post infrastructure (verified via R1-R3): `posts` table has `answered_text` + `answered_at` columns; `PostService` has mark-as-answered logic; `PostSpecifications` has answered-related query specs
- Existing post_reactions infrastructure (verified via R4)

**Pipeline:** This brief → `/spec-forums spec-6-6-brief.md` → `/plan-forums spec-6-6.md` → execute → review.

**Execution sequencing — IMPORTANT:** 6.6's prerequisite is 6.5. However, the **Prayer Wall Redesign side quest** is also post-6.5, and 6.6 modifies Prayer Wall navigation to surface the Answered tab — exactly the surface the redesign restructures. **Brief recommends the redesign side quest executes BEFORE 6.6** so 6.6 adds its navigation entry into the final layout rather than the old one (which would force the redesign to relocate it — scope creep on an already-large side quest). Recommended order: `6.5 → Prayer Wall Redesign → 6.6 → 6.7`. This brief can be authored at any time; the sequencing decision is made at execute time. See Section 16.

6.6 should NOT execute concurrently with any in-flight Phase 6 spec or the redesign side quest (all touch PrayerWall.tsx / PrayerCard.tsx / routing).

---

## 1. Branch Discipline

Branch: `forums-wave-continued`. Eric handles all git operations manually. Claude Code NEVER commits, pushes, branches, merges, rebases, or alters git state at any phase. Violation of W1 is grounds to halt execute.

At execute-start, CC verifies via `git status` (read-only) that working tree is clean except for any pending 6.6 work. `git stash` for diagnostic baseline-compare is permitted only if it brackets within the same turn (per the standing exception).

---

## 2. Tier — xHigh (low-end)

xHigh tier is justified by three factors, with one mitigating factor that keeps it at the low end of xHigh rather than mid-range.

**DB migration on a permanent-MD5 CHECK constraint.**
The `post_reactions` table CHECK constraint currently restricts `reaction_type` to `('praying','candle')`. 6.6 needs a Liquibase ALTER changeset to widen it to include `'praising'` (for the "Praising with you" reaction on answered prayers). The original table changeset (`2026-04-27-016-create-post-reactions-table.xml`) explicitly anticipated this — its comment documents that a future ALTER would add `'praising'` and `'celebrate'`. But CHECK-constraint changes are append-only: once the changeset runs, its MD5 is permanent in DATABASECHANGELOG, and a malformed constraint change is painful to correct. This is the single most careful piece of 6.6.

**New public-facing surface.**
The Answered Wall is a new page at `/prayer-wall/answered` that any user can browse. New routes + new navigation entries + a new page component all carry the usual "new surface" risk: broken routing, navigation that doesn't reflect the new destination, layout that doesn't match the rest of the app.

**Brand-defining emotional weight.**
The Answered Wall is a testimony surface — it shows answered prayers, which are among the most emotionally significant content in the app. The tone of this page (copy, visual hierarchy, the "Praising with you" reaction) carries real weight. A page that feels like a metrics dashboard ("47 prayers answered this month!") instead of a quiet record of God's faithfulness would be a brand failure. This is the same anti-metrics discipline as the rest of Phase 6.

**Mitigating factor (why low-end xHigh, not mid-range):**
The data model already exists. `posts` has `answered_text` + `answered_at` columns. `PostService` already has mark-as-answered logic in its create + update + feed-query paths. `PostSpecifications` already has answered-related query specs. 6.6 does NOT have to build the mechanism by which a prayer becomes "answered" — only the new READ surface that displays answered prayers, plus the one new reaction type. This materially reduces risk compared to a from-scratch feature.

**Practical execution implication:** xHigh tier means CC uses Opus 4.7 thinking `xhigh` for all phases. Eric reviews:
- The Liquibase ALTER changeset (CHECK-constraint widening; verify it's append-only-safe, verify the MD5 implications are understood, verify rollback strategy)
- The "Praising with you" reaction wired through the existing reaction infrastructure (verify it reuses the 6.1 pattern, not a parallel path)
- The AnsweredWall page routing + navigation entry
- AnsweredCard component (verify it extends PrayerCard cleanly, doesn't fork it)
- All copy on the Answered Wall (brand voice; no metrics framing)
- Manual verification: mark a test prayer answered, confirm it appears on the Answered Wall, react with "Praising with you"

---

## 3. Visual & Integration Verification

### Frontend (Playwright)

**Answered Wall route + page:**
- Navigate to `/prayer-wall/answered`; verify the AnsweredWall page renders
- Page heading + subhead render per Copy Deck (Section 7 D-Copy)
- Feed shows only posts where `answered_at IS NOT NULL`, sorted `answered_at DESC`
- Each card is an AnsweredCard showing: original post content + the answer text (`answered_text`) prominently surfaced + relative timestamp of when it was answered
- Empty state: when no answered prayers exist yet, a calm non-promotional empty message renders (Copy Deck)
- Posts that are NOT answered do not appear here
- Pagination / infinite scroll matches the existing Prayer Wall feed pattern (plan-recon R6 confirms which)

**Navigation entry:**
- The Prayer Wall navigation surfaces an "Answered" entry/tab/link that routes to `/prayer-wall/answered`
- Active state: when on the Answered Wall, the nav entry shows active styling
- From the Answered Wall, the user can navigate back to the main Prayer Wall feed
- (Sequencing note: if the Prayer Wall Redesign side quest has executed first, this entry lives in the redesigned left sidebar nav. If not, it lives in the pre-redesign navigation. Plan-recon R5 determines which layout is current at execute time.)

**AnsweredCard:**
- Extends PrayerCard (small extension per master plan) — NOT a fork
- Shows the answer text in a visually distinct treatment (the answer is the emotional payload; it should be clearly differentiated from the original prayer text)
- Original prayer content still visible (the answer makes sense only in the context of the original request)
- Author attribution respects the post's existing visibility/anonymity settings (anonymous posts stay anonymous on the Answered Wall)
- 6.5's IntercessorTimeline still renders inside the card (AnsweredCard extends PrayerCard, so the timeline comes along)
- 6.1's Prayer Receipt affordance behavior is preserved (whatever PrayerCard does, AnsweredCard inherits)

**"Praising with you" reaction:**
- AnsweredCard shows a "Praising with you" reaction affordance (the answered-prayer analog of the "Praying for you" reaction)
- Tapping it records a `'praising'` reaction in `post_reactions`
- Tapping again removes it (toggle behavior, consistent with existing reactions per the post_reactions table design — reactions toggle via DELETE on un-react)
- Reaction count updates optimistically, then re-syncs with server
- The reaction is keyboard-accessible and screen-reader labeled

**Reduced motion:**
- Any expand/transition animations on the Answered Wall respect `prefers-reduced-motion: reduce`

**Accessibility:**
- Answered Wall page has a proper page `<h1>` (the heading from Copy Deck)
- The "Answered" nav entry has appropriate active-state `aria-current`
- AnsweredCard answer-text region is semantically distinct (e.g., a labeled region) so screen readers convey "this is the answer"
- "Praising with you" reaction button has descriptive `aria-label` + `aria-pressed` reflecting reaction state
- Color contrast on the answer-text treatment meets WCAG AA at light + dark themes

### Backend (Integration tests with Testcontainers)

**Liquibase ALTER changeset:**
- After migration runs, `post_reactions.reaction_type` CHECK constraint accepts `'praising'`
- After migration runs, the constraint still accepts `'praying'` and `'candle'` (no regression)
- Inserting a `'praising'` reaction succeeds
- Inserting an invalid reaction type (e.g., `'xyz'`) still fails the constraint
- Migration is idempotent / safe per Liquibase rules (Gate-1)

**Answered Wall feed endpoint:**
- The endpoint (plan-recon R6 determines: new endpoint vs. existing feed endpoint with an `answered` filter param) returns only posts with `answered_at IS NOT NULL`
- Sorted `answered_at DESC`
- Respects post visibility (private/friends-only answered prayers are filtered per existing visibility rules — same as the main feed)
- Soft-deleted posts excluded
- Moderation-hidden posts excluded
- Pagination works

**"Praising with you" reaction endpoint:**
- Reuses the existing reaction endpoint pattern (plan-recon R4 confirms the existing endpoint shape)
- POST a `'praising'` reaction on an answered post: succeeds
- POST a `'praising'` reaction on a NON-answered post: plan-recon R7 decides whether this is allowed (recommend: allowed at the DB level but the UI only surfaces the affordance on answered posts — keeps the constraint simple; OR explicitly rejected server-side for semantic cleanliness; brief leans toward the simpler DB-permissive option, documented in D-PraisingScope)
- Un-react (DELETE) removes the reaction
- Reaction count denormalization updates correctly (if `post_reactions` has a denormalized counter pattern like the other reactions — plan-recon R4 confirms)

### Manual verification by Eric after execute

- Mark a test prayer as answered (via whatever the existing mark-as-answered flow is); verify it appears on `/prayer-wall/answered`
- Verify the answer text is prominently and distinctly displayed on the AnsweredCard
- Verify a non-answered prayer does NOT appear on the Answered Wall
- Tap "Praising with you" on an answered prayer; verify the reaction records; tap again; verify it toggles off
- Verify an anonymous answered prayer shows anonymous attribution on the Answered Wall
- Navigate between the main Prayer Wall and the Answered Wall; verify nav active states
- Read the Answered Wall heading, subhead, and empty-state copy aloud; verify the tone is reverent testimony, NOT a metrics dashboard
- Verify 6.5's intercessor timeline still renders on AnsweredCards
- Check the Liquibase changelog: verify the ALTER changeset ran cleanly and the new MD5 is recorded

## 4. Master Plan Divergences (MPDs)

Deliberate divergences from the stub. Plan/execute MUST honor the brief, not the stub. 6.6 diverges modestly — the stub is fairly thin and the main additions are the DB-migration discipline and the sequencing decision.

**MPD-1: Liquibase ALTER changeset for the `'praising'` reaction type is explicit scope.**
The stub's acceptance criteria mention "'Praising with you' reaction works" but don't call out that this requires a DB migration. Brief makes it explicit: 6.6 includes a Liquibase ALTER changeset widening the `post_reactions.reaction_type` CHECK constraint from `('praying','candle')` to `('praying','candle','praising')`.

Brief does NOT add `'celebrate'` even though the original table comment anticipated both `'praising'` and `'celebrate'`. `'celebrate'` has no consumer in 6.6 — adding an enum value with no feature behind it is speculative schema. If a future spec needs `'celebrate'`, it adds it then. 6.6 adds only what it uses.

**MPD-2: Sequencing recommendation — redesign side quest before 6.6.**
The stub says "Prerequisites: 6.5" and "Files to modify: Prayer Wall navigation." The stub predates the Prayer Wall Redesign side quest. Brief adds the explicit recommendation that the redesign executes before 6.6 (see header + Section 16). This is a sequencing divergence, not a scope divergence — 6.6's content is unchanged either way; only the navigation-integration target differs.

**MPD-3: AnsweredCard EXTENDS PrayerCard; it does not fork it.**
The stub says AnsweredCard is "a small extension of PrayerCard." Brief hardens this into a decision (D-CardExtension): AnsweredCard must compose or wrap PrayerCard, or PrayerCard must take an optional `answered` prop / variant. AnsweredCard must NOT be a copy-pasted divergent component. If it forks, every future PrayerCard change (and there have been many across the wave) has to be mirrored. Plan-recon R8 determines the cleanest extension mechanism.

**MPD-4: "Praising with you" reaction reuses the existing reaction infrastructure.**
The stub doesn't specify implementation. Brief locks: the `'praising'` reaction is wired through the SAME endpoint, service, and frontend pattern as the existing `'praying'` and `'candle'` reactions. No parallel reaction system. Plan-recon R4 reads the existing reaction implementation; execute mirrors it. The only net-new pieces are: the enum value (DB + any backend constant/enum), the UI affordance on AnsweredCard, and the copy.

**MPD-5: The Answered Wall is anti-metrics (HARD, consistent with Phase 6).**
The stub says "brand voice review passes" but doesn't elaborate. Brief makes the anti-metrics commitment explicit and gates it (Gate-G-NO-METRICS):
- NO "N prayers answered" counters anywhere on the page
- NO "answered this week/month" timeframe stats
- NO leaderboard of "most answered" or "most prayed-for" posts
- NO streak or achievement framing around answered prayers
- NO "trending answered prayers"
- The page is a chronological record, sorted `answered_at DESC`. That is the only ordering. No "top," no "popular," no algorithmic ranking.

The emotional value of the Answered Wall is testimony, not tally. A count turns faithfulness into a scoreboard.

**MPD-6: Relative timestamps for `answered_at` display.**
The stub says "sorted by `answered_at DESC`" but doesn't specify display format. Brief locks: the answered-timestamp shown on each AnsweredCard uses relative format consistent with the rest of the app ("answered 3 days ago," "answered last month"). Consistent with 6.5's D-TimestampFormat reasoning. The sort is on the real `answered_at DESC`; the display is relative.

**MPD-7: Empty state is reverent, not promotional.**
The stub doesn't address the empty state. Brief locks (D-Copy): when no answered prayers exist, the page shows a calm, hopeful, non-CTA message. NOT "Be the first to mark a prayer answered!" The empty state acknowledges the page is waiting to be filled, in the app's voice.

---

## 5. Recon Ground Truth

Verified on disk during brief recon (R1-R4) or flagged for plan-time recon (R5-R10).

**R1 — VERIFIED: `posts` table has answered columns.**
`Post.java` (lines ~56-60) has:
- `private String answeredText;` → maps to `answered_text` column
- `private OffsetDateTime answeredAt;` → maps to `answered_at` column

The `posts` table changeset (`2026-04-27-014-create-posts-table.xml`) includes answer-related columns (the changeset comment references "optional context (challenge, answer...)"). The columns exist. 6.6 does not create them.

**R2 — VERIFIED: `PostService` has mark-as-answered logic.**
`PostService.java` has substantial `answered`-related logic across multiple code paths:
- The create-post path (~lines 289-297) handles answered fields
- The update-post path (~lines 394-511) has answered-edit logic
- The feed-query path (~lines 127-171) references ANSWERED handling in the specification chain

Implication: the mechanism by which a prayer gets marked answered ALREADY EXISTS. 6.6 does not build it. Plan-recon R9 reads these paths in full to understand exactly how a prayer becomes answered (so the Answered Wall's filter logic matches the actual data semantics).

**R3 — VERIFIED: `PostSpecifications` has answered-related specs.**
The feed-query path in `PostService` chains `PostSpecifications` predicates and references ANSWERED handling. There is likely an existing spec predicate for answered/not-answered filtering. Plan-recon R6 reads `PostSpecifications.java` to confirm whether a reusable `byAnswered()` (or similar) predicate exists — if so, the Answered Wall feed reuses it.

**R4 — VERIFIED: `post_reactions` table + CHECK constraint.**
`post_reactions` table (`2026-04-27-016-create-post-reactions-table.xml`):
- Composite PK on `(post_id, user_id, reaction_type)` — gives free dedup (one row per reaction-type per user per post)
- CHECK constraint currently restricts `reaction_type` to `('praying','candle')`
- NO soft-delete columns — reactions toggle via DELETE on un-react, by design
- The changeset comment EXPLICITLY documents: a future ALTER changeset is expected to add `'praising'` and `'celebrate'`, and tightening the constraint now "prevents any read endpoint from encountering a value it doesn't know how to render"

This is the clearest possible green light for 6.6's ALTER changeset — the original author anticipated it exactly.

**R5 — PLAN-RECON-REQUIRED: Current Prayer Wall navigation structure.**
Plan determines, at execute time, whether the Prayer Wall Redesign side quest has executed:
- If YES: the navigation is the redesigned left-sidebar nav; the "Answered" entry is added there
- If NO: the navigation is the pre-redesign structure; the "Answered" entry is added there
Plan reads the current PrayerWall.tsx + navigation components and picks the integration point. The brief recommends the redesign goes first (MPD-2) but the plan must handle whichever reality exists.

**R6 — PLAN-RECON-REQUIRED: Answered Wall feed endpoint approach.**
Plan reads the existing feed endpoint (`GET /api/v1/posts` and its `PostService.getPosts`-style method) and decides:
- (a) Add an `answered=true` query parameter to the existing feed endpoint, OR
- (b) Create a dedicated `GET /api/v1/posts/answered` endpoint
Recommend (a) if the existing endpoint's specification-chain pattern makes it clean to add one more predicate (it likely does, given `PostSpecifications` is already a composable chain). (b) only if the existing endpoint is overloaded. Plan picks based on what it reads. Document as a Plan-Time decision.

**R7 — PLAN-RECON-REQUIRED: `'praising'` reaction on non-answered posts.**
Plan decides whether the backend should reject a `'praising'` reaction on a post that isn't answered:
- DB-permissive (recommend): the CHECK constraint allows `'praising'` on any post; the UI only surfaces the affordance on answered posts; no server-side post-state validation. Simplest, fewest moving parts.
- Server-enforced: the reaction endpoint rejects `'praising'` on a post where `answered_at IS NULL`. Semantically cleaner but adds a validation path + an error case + a test.
Brief leans DB-permissive (D-PraisingScope). Plan confirms and documents.

**R8 — PLAN-RECON-REQUIRED: AnsweredCard extension mechanism.**
Plan reads `PrayerCard.tsx` and picks the cleanest extension:
- (a) PrayerCard takes an optional `variant="answered"` or `answered` prop that changes its rendering
- (b) AnsweredCard wraps PrayerCard and adds the answer-text treatment around/within it
- (c) PrayerCard extracts a shared inner component that both PrayerCard and AnsweredCard compose
Recommend (a) if PrayerCard is already prop-driven and adding a variant is clean; (b) if PrayerCard is large and a wrapper is less invasive. NOT a fork (MPD-3). Plan picks based on PrayerCard's current shape and documents.

**R9 — PLAN-RECON-REQUIRED: Exact mark-as-answered data semantics.**
Plan reads the `PostService` answered-handling paths (R2) in full to confirm:
- Is `answered_at` set only when a post is explicitly marked answered, or does it have other triggers?
- Can `answered_at` be UN-set (a prayer un-marked as answered)? If so, the Answered Wall must handle posts disappearing from it.
- Is there an `is_answered` boolean separate from `answered_at`, or is `answered_at IS NOT NULL` the canonical "is answered" check?
The Answered Wall's filter MUST match the canonical semantic. Plan documents the finding.

**R10 — PLAN-RECON-REQUIRED: Backend reaction-type enum / constant.**
Plan checks whether the backend has a Java enum or constant set for reaction types (parallel to the DB CHECK constraint). If `'praying'` and `'candle'` are represented as a Java enum (e.g., `ReactionType`), 6.6 adds `'praising'` there too. The DB constraint and the Java enum must stay in sync. Plan reads the reaction code (R4) and identifies all the places `'praying'`/`'candle'` are enumerated so `'praising'` is added to ALL of them.

---

## 6. Gates — Applicability

| Gate | Applicability | Notes |
|------|---------------|-------|
| Gate-1 (Liquibase rules) | **Applies (HARD).** | The ALTER changeset for the CHECK constraint. Append-only; permanent MD5; idempotent; rollback strategy documented. This is the most careful gate for 6.6. |
| Gate-2 (OpenAPI updates) | **Applies.** | Document the Answered Wall feed (new endpoint OR new query param per R6) + the `'praising'` reaction value. |
| Gate-3 (Copy Deck) | **Applies (HARD).** | Page heading, subhead, empty state, "Praising with you" reaction label, answered-timestamp format. See Gate-G-COPY. |
| Gate-4 (Tests mandatory) | **Applies.** | Master plan minimum is 8; brief targets ~16-18 (DB migration + new surface + new reaction warrant more). |
| Gate-5 (Accessibility) | **Applies (HARD).** | Page h1, nav aria-current, answer-text semantic region, reaction button aria-pressed. See Gate-G-A11Y. |
| Gate-6 (Performance) | **Applies.** | Answered Wall feed query must stay within the existing feed-query latency budget. |
| Gate-7 (Rate limiting) | **Applies.** | The `'praising'` reaction rides the existing reaction endpoint's rate limit (no new limit needed if R4 confirms reactions are already limited). The Answered Wall feed rides the existing feed-endpoint rate limit. |
| Gate-8 (Respect existing patterns) | **Applies (HARD).** | Reuse PostSpecifications chain, existing reaction infra, existing feed pattern, PrayerCard. No parallel systems. |
| Gate-9 (Plain text only) | **Applies.** | Answer text rendered as plain text (it's user content; sanitized per existing post-content handling). |
| Gate-10 (Crisis detection supersession) | **N/A.** | No new user-content-creation surface (answering happens via the existing flow; 6.6 only reads). |

**New gates specific to 6.6:**

**Gate-G-MIGRATION-SAFETY (HARD).**
The Liquibase ALTER changeset must:
- Be append-only (a new changeset file or a new changeSet block; NEVER edit the original `2026-04-27-016` changeset — its MD5 is permanent)
- Widen the CHECK constraint, not replace it destructively (drop-and-recreate is acceptable if that's the only way to alter a CHECK in the target DB, but it must be done within a single changeset that leaves the constraint in a known-good state)
- Be verified idempotent / safe to run against a populated `post_reactions` table
- Include a rollback directive or a documented rollback rationale per the project's Liquibase rules
- Preserve `'praying'` and `'candle'` (regression test asserts both still pass the constraint)

Code review hard-blocks any edit to a previously-run changeset file. Code review hard-blocks a CHECK-constraint change that doesn't have a corresponding test asserting both old + new values.

**Gate-G-NO-METRICS (HARD).**
Per MPD-5. The Answered Wall surfaces NO counts, tallies, leaderboards, streaks, timeframe stats, or algorithmic ranking. The ONLY ordering is `answered_at DESC`. Code review hard-blocks any count display, any "top/popular/trending" affordance, any achievement framing on the Answered Wall.

The per-post reaction count (e.g., how many people are "Praising with you" on a given card) is permitted — that's a per-post reaction affordance consistent with the existing `'praying'`/`'candle'` counts, NOT a page-level metric. The distinction: per-card reaction counts = OK (existing pattern); page-level answered-prayer tallies = blocked.

**Gate-G-CARD-NO-FORK (HARD).**
Per MPD-3. AnsweredCard must extend/compose/wrap PrayerCard, never fork it. Code review hard-blocks an AnsweredCard that duplicates PrayerCard's internals. Plan-recon R8 picks the mechanism; review verifies the mechanism is non-forking.

**Gate-G-REACTION-REUSE (HARD).**
Per MPD-4. The `'praising'` reaction goes through the existing reaction endpoint + service + frontend pattern. Code review hard-blocks a parallel reaction code path. The net-new pieces are limited to: the DB enum value, any backend reaction-type enum/constant addition, the UI affordance, and the copy.

**Gate-G-COPY (HARD).**
All Answered Wall copy authored in Section 7 D-Copy. Eric reviews + approves before execute. The Answered Wall is an emotionally significant surface; copy is brand-critical.

**Gate-G-A11Y (HARD).**
MUST cover:
- Answered Wall page has a single semantic `<h1>` (the Copy Deck heading)
- The "Answered" navigation entry has `aria-current="page"` when active
- AnsweredCard's answer-text region is a semantically labeled region (screen reader conveys "the answer" distinctly from "the original prayer")
- "Praising with you" reaction button: descriptive `aria-label`, `aria-pressed` reflecting state
- Color contrast on the answer-text visual treatment meets WCAG AA at light + dark themes
- Keyboard navigation: the reaction is reachable + togglable by keyboard
- Reduced-motion: any Answered Wall transitions are instant under `prefers-reduced-motion`
- Axe-core passes zero violations on the Answered Wall (populated + empty states)

---

## 7. Decisions Catalog

12 design decisions for plan + execute.

**D-Scope: 6.6 is a new READ surface + one new reaction type.**
6.6 does NOT build the mark-as-answered mechanism (it exists — R2). 6.6 builds: the AnsweredWall page, the AnsweredCard, the Liquibase ALTER changeset, the `'praising'` reaction wiring, the route, and the navigation entry. That is the whole spec.

**D-Migration: One append-only Liquibase ALTER changeset.**
A new changeset (new file following the existing changelog naming convention, or a new changeSet block in the appropriate changelog) widens the `post_reactions.reaction_type` CHECK constraint to `('praying','candle','praising')`. NEVER edit `2026-04-27-016`. Includes rollback per project Liquibase rules. Adds ONLY `'praising'` — not `'celebrate'` (MPD-1).

**D-ReactionEnumSync: DB constraint + backend enum stay in sync.**
If plan-recon R10 finds a backend `ReactionType` enum (or constant set), `'praising'` is added there too, in the same spec. The DB CHECK constraint and the backend enumeration must never diverge. Plan identifies every enumeration site; execute updates all of them.

**D-FeedApproach: Decided at plan time (R6); brief leans toward a query parameter.**
Brief's lean: add `answered=true` to the existing feed endpoint rather than a dedicated endpoint, IF the existing `PostSpecifications` chain makes it clean (it likely does). Plan confirms via R6 and documents the choice as a Plan-Time decision. Either way, the Answered Wall feed reuses the existing feed query infrastructure — no parallel query path.

**D-AnsweredFilter: `answered_at IS NOT NULL` is the canonical filter, pending R9 confirmation.**
The Answered Wall shows posts where `answered_at IS NOT NULL`, sorted `answered_at DESC`. Plan-recon R9 confirms this matches the canonical "is answered" semantic (vs. a separate `is_answered` boolean). If R9 finds the semantic is different, the brief defers to the actual data semantic and the plan documents the divergence.

**D-CardExtension: AnsweredCard extends PrayerCard (mechanism per R8).**
Non-forking. Plan-recon R8 picks: prop-variant on PrayerCard, wrapper around PrayerCard, or shared-inner-component. Review enforces non-fork (Gate-G-CARD-NO-FORK).

**D-AnswerTextTreatment: The answer text is visually distinct and is the emotional focal point.**
On an AnsweredCard, the answer text (`answered_text`) gets a visually differentiated treatment from the original prayer content — the answer is the payload. The original prayer content remains visible (context). Plan-recon R8 + the frontend-design skill inform the exact treatment. The treatment must read as "here is how this prayer was answered," reverently — not as a callout box or a marketing highlight.

**D-PraisingScope: DB-permissive; UI-gated.**
The `'praising'` reaction is allowed by the DB CHECK constraint on any post. The backend does NOT validate that the post is answered before accepting a `'praising'` reaction (no server-side post-state check). The UI only surfaces the "Praising with you" affordance on AnsweredCards. Rationale: fewest moving parts, no extra validation/error path, and a `'praising'` reaction on a non-answered post is harmless if it ever occurs. Plan-recon R7 confirms; if R7 surfaces a strong reason for server enforcement, plan documents the divergence.

**D-ReactionToggle: `'praising'` toggles via DELETE, consistent with existing reactions.**
The `post_reactions` table has no soft-delete columns by design — reactions toggle by row DELETE on un-react. `'praising'` follows the identical pattern. Tap to react (INSERT), tap again to un-react (DELETE). No new toggle semantics.

**D-TimestampDisplay: Relative format for `answered_at`.**
The answered-timestamp on each AnsweredCard renders relative ("answered 3 days ago"). The feed SORT uses the real `answered_at DESC`. Consistent with 6.5's D-TimestampFormat. (MPD-6)

**D-Copy: Authored inline.** (Gate-G-COPY)

*Page heading (h1):* **"Answered"**

*Page subhead:* **"Prayers the community has watched God move in."**

*Empty state:* **"No answered prayers yet. When someone marks a prayer answered, their testimony will live here."**

*"Praising with you" reaction label:* **"Praising with you"** (button text / aria-label: "Praising with you" / when active, aria-label: "You're praising with this answered prayer. Tap to remove.")

*Answer-text region label (for screen readers, and optionally a small visible label):* **"How this was answered"**

*Answered-timestamp prefix:* **"answered "** + relative time (e.g., "answered 3 days ago"). Lowercase "answered" — it reads as a quiet annotation, not a headline.

Note: the subhead says "watched God move in" — explicitly testimony-framed, Christian voice, consistent with the app. If Eric wants a softer or different framing, this is the line to adjust at copy review.

**D-VisibilityRespect: The Answered Wall respects existing post visibility + anonymity.**
The Answered Wall feed applies the SAME visibility filtering as the main Prayer Wall feed. A private answered prayer is visible only to its author. A friends-only answered prayer is visible only to friends (when the friend system ships). An anonymous answered prayer shows anonymous attribution. 6.6 does NOT introduce any new visibility semantics — it reuses the existing feed visibility logic. This is part of D-FeedApproach (reusing the existing feed query gets visibility filtering for free).

---

## 8. Watch-fors

~28 items.

### DB migration (Gate-G-MIGRATION-SAFETY)
- W1 (CC-no-git): Claude Code never runs git operations at any phase.
- W2: NEVER edit `2026-04-27-016-create-post-reactions-table.xml` or any previously-run changeset. The ALTER is a NEW changeset.
- W3: The ALTER widens the CHECK constraint to `('praying','candle','praising')` — `'praying'` and `'candle'` must survive. Regression test asserts both.
- W4: Adds ONLY `'praising'`. Does NOT add `'celebrate'` (no consumer; speculative schema).
- W5: The changeset is idempotent / safe against a populated `post_reactions` table.
- W6: Rollback directive or documented rollback rationale included per project Liquibase rules.
- W7: If the target DB requires drop-and-recreate to alter a CHECK constraint, the drop + recreate happen in ONE changeset that leaves the constraint in a known-good state — never a half-applied state.
- W8: The new changeset follows the existing changelog file-naming + ID conventions exactly.

### Reaction enum sync (D-ReactionEnumSync)
- W9: If a backend `ReactionType` enum or constant set exists, `'praising'` is added there in the SAME spec. DB constraint and backend enum must not diverge.
- W10: Plan-recon R10 must find ALL enumeration sites for reaction types (DB constraint, backend enum, any frontend type/union, any validation list). `'praising'` is added to every one.
- W11: Any switch/match statements over reaction types (rendering logic, icon mapping, etc.) get a `'praising'` case. A non-exhaustive match that silently drops `'praising'` is a bug.

### Reaction reuse (Gate-G-REACTION-REUSE)
- W12: `'praising'` goes through the existing reaction endpoint, service, and frontend pattern. NO parallel reaction code path.
- W13: `'praising'` toggles via DELETE on un-react, identical to `'praying'`/`'candle'`. No new toggle semantics.
- W14: If the existing reactions have a denormalized counter pattern on `posts` (like `praying_count`), determine whether `'praising'` needs its own counter column. Plan-recon R4 confirms. If a counter is needed, that's an ADDITIONAL Liquibase column-add changeset — flag it explicitly; don't let it be a surprise.
- W15: The existing reaction rate limit covers `'praising'` automatically (it's the same endpoint). Verify — don't assume.

### Card extension (Gate-G-CARD-NO-FORK)
- W16: AnsweredCard extends/composes/wraps PrayerCard. It does NOT duplicate PrayerCard's internals.
- W17: 6.5's IntercessorTimeline still renders inside AnsweredCard (it comes along via the PrayerCard extension). Verify it's not accidentally dropped.
- W18: 6.1's Prayer Receipt affordance still works on AnsweredCard (inherited from PrayerCard).
- W19: The answer-text treatment is ADDED to the card; it does not replace or hide the original prayer content.

### Anti-metrics (Gate-G-NO-METRICS)
- W20: NO page-level count of answered prayers anywhere on the Answered Wall.
- W21: NO timeframe stats ("answered this month"), NO leaderboard, NO "most prayed-for," NO trending.
- W22: The ONLY ordering is `answered_at DESC`. No "sort by popular," no algorithmic ranking.
- W23: Per-card reaction counts ARE allowed (existing pattern, per-post, not page-level). Don't over-correct and strip the per-card reaction count.

### Feed + visibility
- W24: The Answered Wall feed reuses the existing feed query infrastructure (PostSpecifications chain). No parallel query.
- W25: Visibility filtering is inherited from the existing feed query — private/friends-only/anonymous answered prayers are handled exactly as on the main feed. Verify anonymous answered prayers show anonymous attribution.
- W26: Soft-deleted and moderation-hidden posts are excluded (inherited from the existing feed query — verify).
- W27: The Answered Wall filter (`answered_at IS NOT NULL`, pending R9) matches the canonical "is answered" semantic. If R9 finds a separate `is_answered` boolean, use that instead.

### Brand voice / copy / a11y
- W28: All copy passes Eric's review. The subhead's "watched God move in" framing is explicitly Christian-testimony voice — confirm Eric is happy with it at copy review.
- W29: The answer-text region is semantically labeled for screen readers ("How this was answered").
- W30: The Answered Wall page has exactly one `<h1>`.

---

## 9. Test Specifications

~17 tests total (master plan minimum is 8; the DB migration + new surface + new reaction warrant more).

### Backend — Liquibase migration (~4)
- After the ALTER changeset runs, inserting a `post_reactions` row with `reaction_type = 'praising'` succeeds.
- After the ALTER changeset runs, inserting `reaction_type = 'praying'` still succeeds (regression).
- After the ALTER changeset runs, inserting `reaction_type = 'candle'` still succeeds (regression).
- After the ALTER changeset runs, inserting an invalid `reaction_type = 'xyz'` still fails the CHECK constraint.

### Backend — Answered Wall feed (~5)
- The Answered Wall feed returns only posts with `answered_at IS NOT NULL`.
- The feed is sorted `answered_at DESC`.
- A non-answered post does NOT appear in the Answered Wall feed.
- The feed respects post visibility: a private answered prayer is not returned to a non-author viewer; an anonymous answered prayer is returned with anonymous attribution.
- Soft-deleted / moderation-hidden answered posts are excluded.

### Backend — `'praising'` reaction (~3)
- POST a `'praising'` reaction on an answered post: succeeds; the row exists in `post_reactions`.
- DELETE (un-react) a `'praising'` reaction: the row is removed.
- POST a duplicate `'praising'` reaction (same user, same post): handled per the existing reaction-dedup behavior (composite PK prevents a second row — verify the endpoint handles this gracefully, consistent with `'praying'`).

### Frontend — AnsweredWall page (~3)
- AnsweredWall renders at `/prayer-wall/answered`; shows AnsweredCards for answered posts.
- Empty state renders the Copy Deck message when the feed is empty.
- Each AnsweredCard shows the answer text in its distinct region, plus the original prayer content, plus the relative answered-timestamp.

### Frontend — AnsweredCard + reaction (~2)
- AnsweredCard renders the "Praising with you" affordance; tapping it records a reaction (optimistic update); tapping again toggles it off.
- AnsweredCard still renders 6.5's IntercessorTimeline (regression — confirms the PrayerCard extension didn't drop it).

### Accessibility (~1, multi-assert)
- Axe-core scan on the Answered Wall (populated + empty states): zero violations. Asserts: single `<h1>`, answer-text region is labeled, "Praising with you" button has `aria-label` + `aria-pressed`, nav entry has `aria-current` when active.

### Playwright E2E (~1)
- **Happy path:** Navigate to the Answered Wall via the navigation entry; verify the page loads; verify an answered prayer's card shows the answer text; tap "Praising with you"; verify the reaction state changes; navigate back to the main Prayer Wall; verify nav active states throughout.

---

## 10. Files

### To CREATE

**Backend:**
- A new Liquibase changeset file (following the existing `db/changelog/` naming convention, e.g., `2026-05-XX-001-add-praising-reaction-type.xml`) — the ALTER widening the `post_reactions.reaction_type` CHECK constraint
- Backend test for the migration (in the appropriate Liquibase/integration test location)
- Backend integration test for the Answered Wall feed + the `'praising'` reaction (likely extends an existing PostController / reaction integration test class, or a new test class — plan picks per existing test organization)

**Frontend:**
- `frontend/src/pages/AnsweredWall.tsx` — the Answered Wall page
- `frontend/src/pages/__tests__/AnsweredWall.test.tsx` — page tests
- `frontend/src/components/prayer-wall/AnsweredCard.tsx` — the PrayerCard extension (mechanism per R8)
- `frontend/src/components/prayer-wall/__tests__/AnsweredCard.test.tsx` — card + reaction tests
- `frontend/src/constants/answered-wall-copy.ts` — the Copy Deck strings (heading, subhead, empty state, reaction label, answer-region label) per D-Copy
- `frontend/e2e/answered-wall.spec.ts` — Playwright E2E

### To MODIFY

**Backend:**
- The feed endpoint + `PostService` feed method — add the `answered` filter (query param per D-FeedApproach lean; R6 confirms). If `PostSpecifications` already has an answered predicate (R3/R6), reuse it; otherwise add one.
- The reaction-type backend enum / constant (if one exists per R10) — add `'praising'`
- Any reaction-type validation list or switch/match (per R10/W11) — add `'praising'`
- `backend/.../openapi.yaml` (or equivalent) — document the answered feed filter + the `'praising'` reaction value

**Frontend:**
- The router — add the `/prayer-wall/answered` route
- The Prayer Wall navigation component (per R5 — redesigned left sidebar nav if the redesign shipped first, else pre-redesign nav) — add the "Answered" entry
- `PrayerCard.tsx` — ONLY if R8 picks the prop-variant extension mechanism (option a). If R8 picks wrapper (option b), PrayerCard is untouched. If R8 picks shared-inner-component (option c), PrayerCard is refactored to extract the shared component.
- The frontend reaction-type TypeScript type/union (if one exists per R10) — add `'praising'`
- The frontend posts-API service — add the answered-feed fetch (or the `answered` param on the existing feed fetch)
- `.claude/rules/` — no new localStorage keys (the Answered Wall is fully server-driven); no rules file change expected unless plan-recon finds otherwise

### Possibly to CREATE (flag explicitly if R4 confirms needed)
- An ADDITIONAL Liquibase column-add changeset for a `praising_count` denormalized counter on `posts` — ONLY if R4 confirms the existing reactions use a per-type denormalized counter pattern and `'praising'` needs to match it. W14 — do not let this be a surprise; if needed, it's called out in the plan explicitly.

### NOT to modify (explicit non-targets)
- `2026-04-27-016-create-post-reactions-table.xml` or ANY previously-run changeset — PERMANENT MD5; the ALTER is a new changeset (W2)
- `2026-04-27-014-create-posts-table.xml` — the `answered_*` columns already exist; not touched
- The mark-as-answered flow in `PostService` (create/update paths) — 6.6 READS answered posts; it does not change how a post becomes answered (D-Scope)
- `Post.java` answered fields — already exist (R1); not touched
- The existing reaction endpoint/service core logic — `'praising'` flows through it unchanged; only the enum/constant set is extended (Gate-G-REACTION-REUSE)
- 6.5's `IntercessorTimeline.tsx`, 6.4's Watch components, 6.1's Prayer Receipt components — all inherited via the PrayerCard extension; not modified
- The main Prayer Wall feed behavior — adding an `answered` filter param must not change default (non-answered-filtered) feed behavior

### To DELETE
None. 6.6 is purely additive.

---

## 11. Acceptance Criteria

**Functional (from master plan + brief):**
- A. Answered Wall route works (`/prayer-wall/answered`)
- B. Feed sorted by `answered_at DESC`
- C. Each AnsweredCard shows the answer text in a visually distinct region
- D. Each AnsweredCard shows the original prayer content (context) + relative answered-timestamp
- E. "Praising with you" reaction works (tap to react, tap to un-react)
- F. The "Answered" navigation entry routes correctly and shows active state
- G. Empty state renders per Copy Deck when no answered prayers exist
- H. Brand voice review passes
- I. ~17 tests covering migration, feed, reaction, page, card, a11y, E2E

**DB migration (Gate-G-MIGRATION-SAFETY, HARD):**
- J. A new append-only Liquibase changeset widens the CHECK constraint to `('praying','candle','praising')`
- K. No previously-run changeset is edited
- L. `'praying'` and `'candle'` still pass the constraint (regression tests)
- M. Invalid reaction types still fail the constraint
- N. Rollback directive / rationale included
- O. Only `'praising'` is added — not `'celebrate'`

**Reaction reuse + sync (Gate-G-REACTION-REUSE, D-ReactionEnumSync):**
- P. `'praising'` flows through the existing reaction endpoint/service/frontend pattern — no parallel path
- Q. `'praising'` is added to every reaction-type enumeration site (DB constraint, backend enum, frontend type, validation lists, switch/match statements)
- R. `'praising'` toggles via DELETE, consistent with existing reactions

**Card extension (Gate-G-CARD-NO-FORK):**
- S. AnsweredCard extends/composes/wraps PrayerCard — not a fork
- T. 6.5's IntercessorTimeline still renders inside AnsweredCard
- U. 6.1's Prayer Receipt affordance still works on AnsweredCard

**Anti-metrics (Gate-G-NO-METRICS, HARD):**
- V. NO page-level answered-prayer count, tally, leaderboard, timeframe stat, streak, or trending on the Answered Wall
- W. The only ordering is `answered_at DESC`
- X. Per-card reaction counts are preserved (existing pattern — not over-corrected away)

**Feed + visibility:**
- Y. The Answered Wall feed reuses the existing feed query infrastructure
- Z. Visibility + anonymity are inherited from the existing feed query (private/friends-only/anonymous handled correctly)
- AA. Soft-deleted / moderation-hidden posts excluded
- BB. Adding the `answered` filter does not change default main-feed behavior

**Accessibility (Gate-G-A11Y, HARD):**
- CC. Single `<h1>` on the page; nav entry has `aria-current`; answer-text region is semantically labeled; reaction button has `aria-label` + `aria-pressed`
- DD. WCAG AA contrast on the answer-text treatment at light + dark themes
- EE. Keyboard navigable; reduced-motion honored
- FF. Axe-core zero violations (populated + empty states)

**Brand voice (Gate-G-COPY):**
- GG. All copy is Eric-approved before execute

---

## 12. Out of Scope

### Deferred (future spec may add)
- The `'celebrate'` reaction type (anticipated by the original table comment but has no consumer in 6.6)
- 6.7's Shareable Testimony Cards — the next spec; 6.6's Answered Wall is its prerequisite surface, but image generation is entirely 6.7's scope
- Any "mark as answered" UX changes — the existing flow is reused as-is; if it needs improvement that's a separate spec
- Filtering / searching within the Answered Wall (by topic, by date range, by author) — v1 is a single chronological feed
- Answered-prayer notifications ("a prayer you prayed for was answered") — separate concern, separate spec
- An "answered" filter on the main Prayer Wall feed as a user-facing toggle — 6.6 adds the backend filter capability and a dedicated page; surfacing it as an inline main-feed toggle is a different UX decision
- Author-side prompts encouraging users to mark prayers answered — separate engagement concern

### Never (anti-features)
- Page-level answered-prayer counts / tallies / leaderboards / streaks / trending (Gate-G-NO-METRICS)
- Algorithmic ranking of answered prayers ("most inspiring," "most prayed-for")
- Achievement / gamification framing around getting prayers answered
- A parallel reaction system for `'praising'` (Gate-G-REACTION-REUSE)
- Forking PrayerCard (Gate-G-CARD-NO-FORK)
- Editing previously-run Liquibase changesets (Gate-G-MIGRATION-SAFETY)

### Different concerns (out of scope entirely)
- The mechanism by which a prayer is marked answered (exists in `PostService` — R2)
- 6.5's Intercessor Timeline (inherited via PrayerCard extension; not modified)
- 6.4's Watch (orthogonal)
- The Prayer Wall Redesign side quest (separate; 6.6 recommends it executes first but does not depend on its internals)

---

## 13. Tier Rationale (closing)

**Why xHigh:** a Liquibase migration on a permanent-MD5 CHECK constraint (the careful piece); a new public-facing surface (page + route + nav); brand-defining emotional weight (the Answered Wall is a testimony surface where tone failure is brand failure).

**Why low-end xHigh, not mid-range:** the data model already exists (`answered_*` columns), the mark-as-answered flow already exists (`PostService`), the query infrastructure already exists (`PostSpecifications` chain), and the reaction infrastructure already exists (6.1's `post_reactions` system). 6.6 assembles existing pieces into a new surface plus one well-anticipated enum value. The risk surface is real but narrow.

**Why not MAX:** no crisis adjacency, no privacy stakes beyond the existing (inherited) visibility model, no AI integration, no safety-critical paths.

**Practical execution implication:**
- spec-from-brief: Opus 4.7 thinking xhigh
- plan-from-spec: xhigh — R5-R10 plan-recon must be thorough; the migration approach (R6/R7) and the reaction-enum sync (R10) and the card-extension mechanism (R8) are all load-bearing
- execute: xhigh throughout, with extra discipline on the Liquibase changeset (Gate-G-MIGRATION-SAFETY) and the reaction-enum sync (every enumeration site)
- review: xhigh focus on the migration changeset (append-only, regression tests, rollback), the no-fork verification on AnsweredCard, the anti-metrics audit, the copy review

---

## 14. Recommended Planner Instruction

```
Plan execution for Spec 6.6 per
/Users/eric.champlin/worship-room/_plans/forums/spec-6-6-brief.md.

Tier: xHigh. Use Opus 4.7 thinking depth xhigh throughout.

Honor all 7 MPDs, 12 decisions, ~30 watch-fors, ~17 tests, and 6 new gates
(Gate-G-MIGRATION-SAFETY, Gate-G-NO-METRICS, Gate-G-CARD-NO-FORK,
Gate-G-REACTION-REUSE, Gate-G-COPY, Gate-G-A11Y).

CRITICAL: Gate-G-MIGRATION-SAFETY is the load-bearing gate. The Liquibase
ALTER changeset widening the post_reactions CHECK constraint must be
append-only (NEVER edit changeset 2026-04-27-016 — its MD5 is permanent),
must preserve 'praying' and 'candle', must add ONLY 'praising' (not
'celebrate'), and must include a rollback directive. Regression tests
assert all three valid values + one invalid value.

Required plan-time recon (R5-R10):
- R5: determine whether the Prayer Wall Redesign side quest has executed;
  pick the navigation integration point accordingly
- R6: read the existing feed endpoint + PostSpecifications; decide query-
  param vs. dedicated endpoint (brief leans query-param); document as a
  Plan-Time decision
- R7: decide DB-permissive vs. server-enforced 'praising'-on-non-answered
  (brief leans DB-permissive)
- R8: read PrayerCard.tsx; pick the non-forking extension mechanism
- R9: read the PostService answered-handling paths in full; confirm the
  canonical 'is answered' semantic (answered_at IS NOT NULL vs. a separate
  boolean); confirm whether answered_at can be un-set
- R10: find EVERY reaction-type enumeration site (DB constraint, backend
  enum/constant, frontend type/union, validation lists, switch/match
  statements); 'praising' is added to all of them

Also confirm (W14): whether the existing reactions use a per-type
denormalized counter on posts. If yes, 'praising' needs a matching counter
column — that's an ADDITIONAL Liquibase changeset; call it out explicitly
in the plan, do not let it be a surprise at execute time.

SEQUENCING: brief recommends the Prayer Wall Redesign side quest executes
BEFORE 6.6. The plan can be authored at any time, but execute should wait
for 6.5 to merge (hard prereq) and ideally for the redesign to merge
(recommended). The plan must handle whichever navigation layout is current
at execute time (R5).

Plan-time divergences from brief: document in a Plan-Time Divergences
section. Migration-related or visibility-related divergences require Eric's
explicit chat sign-off before execute.

ALL copy in Section 7 D-Copy is BRIEF-LEVEL CONTENT. Generate plan
referencing verbatim. The subhead's Christian-testimony framing is
intentional — flag it for Eric at copy review.

Per W1, you do not run any git operations at any phase.
```

---

## 15. Verification Handoff (Post-Execute)

After CC finishes execute and produces the per-step Execution Log:

**Eric's verification checklist:**

1. Review the Liquibase changeset FIRST. Verify:
   - It is a NEW changeset file, not an edit to `2026-04-27-016`
   - It widens the CHECK constraint to `('praying','candle','praising')`
   - It includes a rollback directive or documented rationale
   - It adds ONLY `'praising'` (no `'celebrate'`)
   - The migration regression tests exist and assert all three valid values + one invalid

2. Review the reaction-enum sync. Verify `'praising'` was added to EVERY enumeration site the plan identified (DB constraint, backend enum, frontend type, validation lists, switch/match). A missed site is a latent bug.

3. Review AnsweredCard. Verify it extends/wraps/composes PrayerCard — NOT a fork. Diff it mentally against PrayerCard; if you see duplicated internals, halt.

4. Run the backend test suite. Verify the migration tests + feed tests + reaction tests pass. Verify no regression in existing reaction/feed tests.

5. Apply the migration to a local DB. Verify it runs cleanly and the new MD5 is recorded in DATABASECHANGELOG.

6. In the browser: mark a test prayer as answered (via the existing flow). Navigate to `/prayer-wall/answered`. Verify it appears.

7. Verify the AnsweredCard shows the answer text in a distinct, reverent treatment — not a marketing callout box. Verify the original prayer content is still visible. Verify the relative answered-timestamp reads as a quiet annotation ("answered 3 days ago").

8. Verify a non-answered prayer does NOT appear on the Answered Wall.

9. Tap "Praising with you." Verify it records. Tap again. Verify it toggles off. Verify the per-card reaction count behaves like the existing `'praying'` count.

10. Verify an anonymous answered prayer shows anonymous attribution on the Answered Wall.

11. Verify 6.5's IntercessorTimeline still renders on AnsweredCards. Verify 6.1's Prayer Receipt affordance still works.

12. Navigate between the main Prayer Wall and the Answered Wall via the navigation entry. Verify active states. Verify the main feed's default behavior is unchanged (adding the `answered` filter param didn't alter the default feed).

13. Anti-metrics audit: scan the entire Answered Wall page. Verify there is NO page-level count, tally, leaderboard, timeframe stat, streak, or trending. The only ordering is chronological.

14. Read the heading, subhead, empty-state copy, and reaction label aloud. Verify the tone is reverent testimony. Specifically decide if you're happy with the subhead's "watched God move in" framing — this is the line most worth a second look.

15. Run axe-core on the Answered Wall (populated + empty). Verify zero violations. Keyboard-navigate the page; verify the reaction is reachable and togglable.

16. Visual judgment (the xHigh-tier call only Eric can make): does the Answered Wall feel like a sacred record of testimony, or like a feature page? If the latter, identify the specific elements (answer-text treatment, spacing, copy, density) for revision before merge.

**If all clean:** Eric commits, pushes, opens MR, merges to master. Tracker updates: 6.6 flips ⬜ → ✅.

**If the migration or anti-metrics or tone feels wrong:** Halt merge. Discuss in chat. The migration especially — a bad CHECK-constraint changeset is painful to walk back once its MD5 is permanent.

---

## 16. Prerequisites Confirmed

- **6.5 (Intercessor Timeline):** must merge first (hard prereq) — AnsweredCard extends PrayerCard where IntercessorTimeline mounts
- **6.1 (Prayer Receipt):** ✅ — provides the `post_reactions` infrastructure the `'praising'` reaction reuses
- **`posts` table answered columns:** ✅ verified via R1 (`answered_text`, `answered_at`)
- **`PostService` mark-as-answered flow:** ✅ verified via R2
- **`PostSpecifications` answered specs:** ✅ verified via R3
- **`post_reactions` table + CHECK constraint:** ✅ verified via R4 (the original changeset explicitly anticipates the `'praising'` ALTER)
- **PrayerCard.tsx:** ✅ exists (extension target)

**Sequencing (see header + MPD-2):**
Brief recommends: `6.5 → Prayer Wall Redesign → 6.6 → 6.7`.
- 6.5 is a HARD prerequisite — 6.6 cannot execute until 6.5 merges.
- The Prayer Wall Redesign side quest is a RECOMMENDED-first (not hard) prerequisite — if it merges before 6.6, the "Answered" nav entry is added cleanly into the redesigned left-sidebar nav. If 6.6 goes first, the redesign inherits the responsibility of relocating the Answered entry (scope creep on the side quest). Eric makes the final call at execute time; plan-recon R5 handles whichever reality exists.
- 6.6 must NOT execute concurrently with any in-flight Phase 6 spec or the redesign (all touch PrayerWall.tsx / PrayerCard.tsx / routing).

After 6.5 merges (and ideally the redesign):
- Rebase/merge `forums-wave-continued` onto master
- Eric reviews + approves all copy in Section 7 D-Copy (especially the subhead framing)
- Run `/spec-forums spec-6-6-brief.md` → generates spec file
- Run `/plan-forums spec-6-6.md` → generates plan file (with R5-R10 plan-recon)
- Eric reviews plan + verifies the migration approach + reaction-enum-sync completeness + card-extension mechanism
- Run `/execute-plan-forums YYYY-MM-DD-spec-6-6.md` → executes
- Eric reviews code via the 16-item verification checklist above
- Eric commits + pushes + MRs + merges
- Tracker: 6.6 ⬜ → ✅

**Post-merge:** the Answered Wall ships. 6.7 (Shareable Testimony Cards) — the last spec in the Phase 6 wave — has its prerequisite surface in place.

---

## End of Brief
