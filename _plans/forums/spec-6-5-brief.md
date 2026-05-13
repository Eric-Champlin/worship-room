# Brief: Spec 6.5 — Intercessor Timeline

**Master plan reference:** `_forums_master_plan/round3-master-plan.md` (Spec 6.5 stub) — ID `round3-phase06-spec05-intercessor-timeline`

**Spec ID:** `round3-phase06-spec05-intercessor-timeline`

**Phase:** 6 (Slow Sanctuary / Quiet Engagement Loop)

**Size:** L (Large)

**Risk:** Medium (master plan); brief concurs

**Prerequisites:**
- 6.4 (3am Watch v1) — must merge first per master plan; 6.5 lives inside PrayerCard which 6.4 doesn't modify, but 6.4 introduces Watch-related styling/render decisions that intersect with PrayerCard during Watch hours
- 6.3 (Night Mode) ✅ (intercessor timeline should respect Night Mode CSS variables)
- 6.2/6.2b ✅ (orthogonal)
- 6.1 (Prayer Receipt) ✅ — ESSENTIAL prerequisite for the data model + privacy patterns; 6.5 reuses the underlying `post_reactions` data with a different privacy posture
- Existing Post + PostReactions infrastructure (verified via R1, R2)
- Existing DisplayNameResolver (verified via R3)

**Tier:** **xHigh** (public-facing privacy surface; brand voice critical; backend + frontend changes; performance considerations; reuses 6.1 patterns with materially different privacy posture)

**Pipeline:** This brief → `/spec-forums spec-6-5-brief.md` → `/plan-forums spec-6-5.md` → execute → review.

**Execution sequencing:** Execute AFTER 6.4 merges. No conflict with 1.5g. Safe order: 6.1 → 1.5g → 6.2 → 6.2b → 6.3 → 6.4 → 6.5 OR with 1.5g elsewhere in the chain. 6.5 should NOT execute concurrently with 6.4 (both touch PrayerCard render path).

---

## 1. Branch Discipline

Branch: `forums-wave-continued`. Eric handles all git operations manually. Claude Code NEVER commits, pushes, branches, merges, rebases, or alters git state at any phase. Violation of W1 is grounds to halt execute.

At execute-start, CC verifies via `git status` (read-only) that working tree is clean except for any pending 6.5 work.

---

## 2. Tier — xHigh

6.5 is **xHigh** tier. The bump from M-tier specs is justified by:

**Public-facing privacy surface.**
Unlike 6.1's Prayer Receipt (visible only to post AUTHOR), the Intercessor Timeline is visible to EVERY viewer of the post. The privacy posture is fundamentally different: anonymous reactors must remain anonymous to all viewers, not just to the author. Subtle implementation bugs here can deanonymize users in a public surface, with no recourse.

Examples of harm vectors this brief explicitly designs against:
- Server response leaking `user_id` for anonymous reactions → frontend could correlate across multiple posts to identify the anonymous reactor
- Exact-second timestamps on anonymous entries → attacker knowing victim's online pattern can deanonymize by timing correlation
- DisplayNameResolver returning real name when DisplayNamePreference was ANONYMOUS → violates user's chosen preference
- Ordering by "engagement score" or "prayer frequency" → reveals patterns that anonymous users explicitly chose not to reveal
- Showing intercessor list for friends-only posts to non-friends → violates post visibility

**Brand voice on a high-frequency surface.**
Every prayer card now has an intercessor timeline. The visual treatment + microcopy + interaction pattern compounds across the user's entire feed experience. "No leaderboard framing" (per master plan) is not just a preference — it's a load-bearing brand commitment. If the timeline feels like Twitter likes, the entire Prayer Wall becomes engagement-coded.

**Performance on a hot path.**
Feed-load latency is already a watched metric. Adding intercessor data to every card (even just first 2-3 names) requires care: an additional JOIN or subquery on a 20-post feed query, multiplied by every Prayer Wall load, scales with active users. Plan-recon must validate the query plan stays within budget.

**Reuses 6.1 patterns with materially different posture.**
The Prayer Receipt code from 6.1 reads the same `post_reactions` table and the same DisplayNameResolver. 6.5's IntercessorService is a parallel reader with a DIFFERENT privacy posture (public vs. author-private). Easy to accidentally copy the wrong filter logic. Brief explicitly contrasts the two postures in D-PrivacyContrast.

**Direct prerequisite for 6.6 (Answered Wall).**
6.6 builds on intercessor data to surface "who prayed for this answered prayer." If 6.5's data model is wrong (privacy posture, sort order, response shape), 6.6 either re-architects or inherits bugs.

**Practical execution implication:** xHigh tier means CC uses Opus 4.7 thinking `xhigh` for ALL phases. Eric reviews:
- Server response shape (verify NO user_id field for anonymous reactions)
- DisplayNameResolver integration (verify ANONYMOUS preference is honored)
- Privacy filter logic in IntercessorService (compare to PrayerReceiptService)
- Frontend timeline component (verify no leaderboard affordances; visual feel matches brand)
- All Watch-fors in Section 8, especially the deanonymization-risk items
- Manual privacy verification (create anonymous reaction; verify it shows as Anonymous; verify dev tools network response has no user_id)

---

## 3. Visual & Integration Verification

### Frontend (Playwright)

**Summary line on every public prayer card:**
- Load Prayer Wall feed; for each rendered prayer card, verify a soft-type intercessor summary line appears below the post content
- Summary line format: e.g., "3 praying — Sarah, Anonymous, and 1 other" OR (if 0 reactions) "No one has prayed for this yet" OR (if 1 reaction) "Sarah is praying"
- Soft-type styling: small font, muted color, italic per brand voice (Lora italic)
- Tap on summary line → expands inline to full timeline (up to 50 entries)
- Tap again → collapses back to summary

**Expanded timeline:**
- Shows up to 50 recent intercessors
- Each entry: display name (or "Anonymous") + relative timestamp (e.g., "3 hours ago")
- Sorted by reaction timestamp DESC (most recent first); deterministic tie-break by reaction id
- If more than 50 reactions exist, last entry says "and N others" where N is `total_reactions - 50`
- No avatars, no badges, no "Faithful Watcher" indicators, no streak counters — names and timestamps ONLY
- Smooth height transition on expand/collapse (respects reduced-motion)

**Anonymous handling:**
- Reaction recorded with `display_preference: ANONYMOUS` → timeline entry shows "Anonymous"
- Multiple anonymous reactions → each shows as separate "Anonymous" entry with its own timestamp (per D-NoAggregation)
- Browser dev tools network tab on the GET intercessors response: verify NO `user_id` field present on entries marked `is_anonymous: true`
- Anonymous entries are visually identical to named entries (same font, same color, same timestamp style) — NOT styled differently to draw attention

**Post visibility respect:**
- Public post: timeline visible to any viewer
- Friends-only post (when friend system ships): timeline visible ONLY to friends of the author; non-friends see NO timeline at all (not even the summary line)
- Private post: timeline visible ONLY to author; everyone else sees NO timeline
- For v1 (friend system not in Java yet), friends-only post handling is a server-stub: returns 403 or hides the timeline entirely; plan-recon decides graceful handling

**Empty state:**
- Post with 0 reactions → summary line says "No one has prayed for this yet" in muted text (NOT a prompt to react; not a CTA; just an honest statement)
- Tap on empty state does NOT expand anything (nothing to expand)
- After user adds first reaction → summary line updates to "You're praying" (or display name) within next render cycle

**Live updates:**
- User opens a post, sees "3 praying"; another user reacts; original user refreshes → summary updates to "4 praying"
- No WebSocket / live-push updates in v1 (intercessor data is fetched on feed load + after own reaction)
- After user adds own reaction, optimistic update inserts their name at top of timeline; on server confirmation, re-sync replaces optimistic entry with server data

**Reduced motion:**
- Expand/collapse animation: smooth height transition in standard motion; instant in reduced motion
- No fade-in / fade-out on individual entries; whole timeline appears at once

**Night Mode integration:**
- During Night Mode (6.3): intercessor timeline uses Night Mode CSS variables (warm muted tones; same names but in night palette)
- During Watch hours (6.4): no special behavior on intercessor timeline; Watch is about feed re-sort + crisis resources, not about timeline rendering

**Accessibility:**
- Summary line has `aria-expanded` attribute toggling false/true; `aria-controls` pointing to expanded timeline section id
- Tap target meets 44x44px minimum
- Expanded timeline is `role="list"` with each entry `role="listitem"`
- Each entry's accessible name: display name + relative time (e.g., "Sarah, 3 hours ago")
- Anonymous entries have accessible name: "Anonymous, 3 hours ago" (no special distinguishing markup)
- Color contrast on muted-soft text meets WCAG AA at light + dark + night palettes
- Keyboard navigation: Tab focuses summary line; Enter/Space toggles expand/collapse

### Backend (Integration tests with Testcontainers)

**New endpoint: `GET /api/v1/posts/{postId}/intercessors`:**
- Authenticated user, public post: returns 200 with array of up to 50 intercessor entries; each entry has `{ displayName, isAnonymous, reactedAt }`
- Anonymous entries have NO `userId` field in response (Gate-G-ANONYMOUS-PRIVACY)
- Sorted by `reactedAt DESC`, tie-broken by `reactionId ASC` (deterministic)
- Unauthenticated request: returns 401 (existing auth filter applies)
- Non-existent postId: returns 404
- Friends-only post, viewer is friend: returns 200 with full list
- Friends-only post, viewer is NOT friend: returns 403 (or 404 to avoid leaking existence; plan-recon picks per existing post-visibility patterns)
- Private post, viewer is NOT author: returns 403 (or 404; plan-recon)
- Private post, viewer IS author: returns 200

**Existing feed endpoint (`GET /api/v1/posts`) enhancement:**
- Response now includes per-post `intercessorSummary` field: `{ count: N, firstThree: [{displayName, isAnonymous}, ...] }` for inline summary rendering
- For posts with 0 reactions: `intercessorSummary: { count: 0, firstThree: [] }`
- Anonymous entries in `firstThree` also have NO `userId` field
- Feed query latency budget unchanged (p99 ≤ 200ms); plan-recon validates EXPLAIN ANALYZE

### Manual verification by Eric after execute

- Create a test post; have a second test user react with `display_preference: ANONYMOUS`; verify the timeline shows "Anonymous"
- Open dev tools → Network → GET /api/v1/posts/{id}/intercessors response: verify response JSON has NO `user_id` field on the anonymous entry
- Have a third test user react with `display_preference: PUBLIC_NAME`; verify timeline shows display name
- Have a fourth test user react with `display_preference: ANONYMOUS`; verify timeline shows TWO "Anonymous" entries with different timestamps (per D-NoAggregation)
- Verify summary line format updates correctly: "2 praying… Sarah, Anonymous" → "3 praying… Sarah, Anonymous, Anonymous"
- Tap summary line; verify smooth expand; verify all 3 entries listed with relative timestamps
- Tap again; verify smooth collapse
- Refresh page; verify timeline data is fresh from server (not stale optimistic state)
- Read summary line aloud for several posts of varying counts; verify it never feels like a leaderboard or popularity metric — it should read as a guestbook line
- Visit the same post during Night Mode (after 9pm): verify timeline renders in night palette, NOT day palette
- Tab key navigates to summary line; Enter expands; Esc/Enter collapses
- Run axe-core scan on Prayer Wall with expanded timeline: zero violations

## 4. Master Plan Divergences (MPDs)

Deliberate divergences from the master plan stub. Plan/execute MUST honor the brief, not the stub.

**MPD-1: Public privacy posture explicitly contrasted with 6.1's author-only posture.**
Stub describes the timeline as showing names + timestamps without distinguishing the privacy model from 6.1's Prayer Receipt. Brief locks down: 6.5's IntercessorService is a PARALLEL reader to PrayerReceiptService, NOT a wrapper. They share the same underlying `post_reactions` data but apply DIFFERENT privacy filters:

| Concern | 6.1 PrayerReceiptService | 6.5 IntercessorService |
|---|---|---|
| Viewer | Post author only | Any authorized viewer |
| Anonymous handling | Author still sees "Anonymous" (per 6.1 D-Anonymity) | Same: viewer sees "Anonymous" |
| user_id in response | NEVER for anonymous | NEVER for anonymous |
| Visible to non-author? | NO | YES (per post visibility) |
| Triggered by | Post owner viewing receipts | Any viewer rendering a card |
| Rate limit | Existing 6.1 receipt-read | NEW intercessor-read rate limit |

D-PrivacyContrast in Section 7 codifies this. Code review checks the two services are NOT mistakenly merged into a single reader with a viewer-type flag (the privacy logic should be cleanly separated even if data fetching is shared).

**MPD-2: Relative timestamps everywhere; no absolute times exposed.**
Stub says "Timestamps in relative format." Brief locks the EXACT format and rationale:
- `<1 minute ago` → "just now"
- `1-59 minutes ago` → "3 min ago"
- `1-23 hours ago` → "3 hours ago"
- `1-7 days ago` → "3 days ago"
- `8-30 days ago` → "2 weeks ago"
- `31+ days ago` → "in [Month YYYY]" (absolute month, no day, no time)

Rationale: relative timestamps provide natural privacy protection. Absolute timestamps ("at 3:42am on Nov 15") combined with knowledge of a victim's online patterns enable deanonymization. Relative format gives users useful recency info without exposing exact-second timing.

Applies to ALL entries (named and anonymous). Brief considered asymmetric granularity (coarser for anonymous, finer for named) but rejected it: visual inconsistency draws attention to anonymous entries, which is the opposite of the privacy goal.

Known limitation: relative timestamps are still imperfect protection. A motivated attacker who knows victim's online schedule can correlate "3 hours ago" with a window of plausible reaction times. Brief documents as W-TimingDeanon; if this becomes a real concern, a future hardening spec can add hour-granularity rounding for anonymous entries ("earlier today") at the cost of UX richness.

**MPD-3: No aggregation of consecutive anonymous reactions.**
Master plan implies individual entries ("display names or Anonymous"). Brief locks: each anonymous reaction is a SEPARATE entry with its own timestamp. Five anonymous reactions → five "Anonymous" entries with five timestamps.

Rationale considered: aggregating to "5 anonymous reactions" loses timing info (better privacy) but loses the "someone is here, recently" presence signal that matters for the post author + brand voice. Brief picks individual entries.

W-TimingDeanon documents the residual risk. If user feedback shows this is a real concern, a future spec can change behavior.

**MPD-4: Lazy-load on tap-expand; summary inlined in feed query.**
Stub says "GET /api/v1/posts/{id}/intercessors" — implies per-post endpoint. Brief adds: the existing feed endpoint also returns a per-post `intercessorSummary` field with count + first 3 names, so the summary line renders immediately without an extra request. The full 50-entry list is loaded via the dedicated endpoint on tap-expand.

This trades feed payload size (one small JSON object per post) for eliminating N+1 requests on Prayer Wall load. EXPLAIN ANALYZE in plan-recon validates the additional subquery stays within feed query budget.

**MPD-5: No streak/badge/score indicators in timeline entries.**
Stub says "No comparison or leaderboard framing." Brief extends this to a HARD gate (Gate-G-NO-LEADERBOARD) and lists explicitly forbidden affordances:
- NO Faithful Watcher badge icon next to names
- NO streak count ("Sarah, 12-day streak")
- NO "prayed N times this week" indicators
- NO sort order based on prayer frequency or engagement score
- NO visual emphasis on "top intercessors"
- NO "thank you for praying" buttons or interactive affordances

Entries are read-only chronological listings. Names, relative timestamps. Nothing else.

**MPD-6: Empty state is non-promotional.**
Stub doesn't address empty state. Brief locks: "No one has prayed for this yet" in muted soft-type. NOT a call to action. NOT "Be the first to pray!" NOT "Tap to pray." Just an honest, neutral statement.

Users who want to react do so via the existing InteractionBar (which is a separate component). The intercessor timeline is reflective, not generative — it reports who has prayed, not who SHOULD pray.

**MPD-7: Visibility respects post visibility (HARD).**
Stub doesn't address. Brief locks: intercessor timeline visibility is gated on the SAME visibility rules as the post itself:
- Public post: timeline visible to anyone authorized to see the post
- Friends-only post: timeline visible to friends of author only (when friend-system Java ships)
- Private post: timeline visible to author only

For v1 (friend-system Java not yet built per Spec 6.4 recon), friends-only posts have a server-stub: returns 403 to non-author non-friend viewers, OR hides the timeline entirely. Plan-recon (R5) picks the behavior; recommended is to hide entirely (the timeline doesn't render at all) so the empty state doesn't accidentally reveal the existence of reactions.

**MPD-8: 50-entry cap with "and N others" affordance.**
Stub says "up to 50 recent reactions." Brief locks: 50 max in the expanded view. If `total_count > 50`, last visible entry says "and N others" where N = `total_count - 50`. No pagination affordance. No "see all" link.

Rationale: 50 is enough for the social-presence signal ("many people are praying") without becoming a deanonymization surface (a long list of reactions creates more opportunities for timing correlation). Adding pagination would push us toward an engagement-coded "complete reaction list" UX, which violates brand voice.

If a post has 47 reactions, the timeline shows all 47 with NO "and others" affordance. If 51+, shows 50 + "and N others."

**MPD-9: Reuse DisplayNameResolver from `user/` package.**
Stub doesn't address name resolution mechanism. Brief locks: IntercessorService delegates display name resolution to the existing `DisplayNameResolver` (verified via R3). The resolver already respects `DisplayNamePreference.ANONYMOUS`. 6.5 does NOT create parallel name-resolution logic.

Integration test: verify that when a user has `display_preference: ANONYMOUS` set on their account-wide settings, ALL their reactions (regardless of per-reaction setting) show as Anonymous in the timeline. The per-reaction setting wins ONLY if the user's account-level allows it.

Plan-recon (R6) verifies the DisplayNameResolver public API signature matches what IntercessorService needs (likely `resolveName(userId, reaction.displayPreference)`).

**MPD-10: New rate limit for intercessor-read endpoint.**
Stub doesn't address rate limiting. Brief locks: new `IntercessorReadRateLimitService` mirrors the pattern of `PrayerReceiptReadRateLimitService` from 6.1. Budget: 60 requests per minute per user (per IP fallback for unauthenticated, though endpoint requires auth so this is defense-in-depth).

Rationale: the endpoint is invoked on every tap-to-expand. Without rate limiting, a malicious user could rapidly poll an enemy's posts to capture timing data for deanonymization attacks.

---

## 5. Recon Ground Truth

Verified on disk during brief recon (R1-R4) or flagged for plan-time recon (R5-R10).

**R1 — Post + PostReactions infrastructure: VERIFIED.**
Directory `backend/src/main/java/com/worshiproom/post/` contains rich Post infrastructure (~50 files from 6.4 recon). Key:
- `PostController.java`, `PostService.java`, `PostRepository.java`, `PostSpecifications.java`
- `PrayerReceiptService.java`, `PrayerReceiptController.java` (6.1; reads `post_reactions`)
- `PrayerReceiptReadRateLimitService.java` (6.1; pattern for IntercessorReadRateLimit)
- `PostMapper.java` (DTO mapping; pattern for IntercessorResponse mapping)

Liquibase changesets confirm `post_reactions` table exists (`2026-04-27-016-create-post-reactions-table.xml`). Schema includes `user_id`, `post_id`, `reaction_type`, `created_at`, `is_anonymous` (or similar; plan-recon verifies exact column names).

**R2 — PostReactions table: EXISTS.**
Liquibase: `backend/src/main/resources/db/changelog/2026-04-27-016-create-post-reactions-table.xml`. Brief assumes columns include `id, user_id, post_id, reaction_type, is_anonymous, created_at` (or equivalent naming). Plan-recon (R7) verifies exact schema.

**R3 — DisplayNameResolver: VERIFIED.**
File: `backend/src/main/java/com/worshiproom/user/DisplayNameResolver.java`.
Also: `DisplayNamePreference.java`, `DisplayNamePreferenceConverter.java` — confirms preference enum + JPA converter exist.

IntercessorService imports and delegates to this resolver. Plan-recon (R6) reads the resolver's public API to confirm signature.

**R4 — PrayerCard.tsx: EXISTS.**
File: `frontend/src/components/prayer-wall/PrayerCard.tsx`. 6.5 modifies this to insert `<IntercessorTimeline />` below post content.

**R5 — PLAN-RECON-REQUIRED: post_reactions table exact schema.**
Plan reads the Liquibase changeset to confirm column names. Specifically:
- Is the anonymous indicator a column on `post_reactions` (per-reaction) or solely on `users.display_name_preference` (per-user)?
- Is there a separate `display_preference` column on `post_reactions` overriding user-level setting?
- What is the exact `created_at` precision (millisecond/second)?

**R6 — PLAN-RECON-REQUIRED: DisplayNameResolver public API.**
Plan reads `DisplayNameResolver.java` to confirm:
- Method signature (e.g., `resolveName(UUID userId)` vs `resolveName(UUID userId, DisplayNamePreference perReactionPref)`)
- Whether it handles the ANONYMOUS case internally (returning "Anonymous" string) or returns null/empty for the caller to substitute
- Whether it's a Spring bean (injected via @Autowired) or a static utility

**R7 — PLAN-RECON-REQUIRED: PrayerReceiptService implementation.**
Plan reads `PrayerReceiptService.java` to:
- Understand the existing privacy logic (so IntercessorService can mirror it CORRECTLY)
- Identify any shared helper methods to extract (e.g., `mapReactionToDto` with privacy filtering)
- Verify the response DTO pattern (so IntercessorResponse mirrors it)

**R8 — PLAN-RECON-REQUIRED: PostVisibility enforcement helper.**
Plan finds the existing helper (likely in `PostService` or a `PostVisibility*` class) that determines whether a viewer is authorized to see a given post. IntercessorService reuses this helper before fetching reactions.

If no centralized helper exists, plan picks: (a) extract one in this spec (preferable; future specs benefit) OR (b) inline the check in IntercessorService (smaller scope, future refactor).

**R9 — PLAN-RECON-REQUIRED: Feed query structure for adding intercessorSummary.**
Plan reads the existing feed query (in PostService or via PostSpecifications) and decides how to add the `intercessorSummary` field. Options:
- (a) JPQL subquery in the main feed query
- (b) PostMapper post-processing step that does a follow-up query for the page of post IDs
- (c) New `PostWithSummaryDto` projection

Latency budget: feed query p99 must remain ≤ 200ms. Plan picks based on EXPLAIN ANALYZE results.

**R10 — PLAN-RECON-REQUIRED: Existing rate-limit pattern (6.1 PrayerReceiptReadRateLimitService).**
Plan reads `PrayerReceiptReadRateLimitService.java` + `PrayerReceiptReadRateLimitConfig.java` to mirror the pattern for the new `IntercessorReadRateLimitService`. Same bucket4j/Caffeine approach.

---

## 6. Phase 3 Execution Reality Addendum Gates — Applicability

| Gate | Applicability | Notes |
|------|---------------|-------|
| Gate-1 (Liquibase rules) | **N/A.** | No DB changes (post_reactions table already exists per R2). |
| Gate-2 (OpenAPI updates) | **Applies.** | Document new `GET /api/v1/posts/{id}/intercessors` endpoint; document feed response shape change for `intercessorSummary` field. |
| Gate-3 (Copy Deck) | **Applies (HARD).** | Empty state copy, summary line formats, expand/collapse aria labels in Copy Deck. See Gate-G-COPY. |
| Gate-4 (Tests mandatory) | **Applies.** | ~22-25 tests for this spec (more than typical because of privacy stakes). |
| Gate-5 (Accessibility) | **Applies (HARD).** | aria-expanded, role=list, keyboard navigation, contrast on muted text. See Gate-G-A11Y. |
| Gate-6 (Performance) | **Applies (HARD).** | Feed query latency budget p99 ≤ 200ms must hold. See Gate-G-PERFORMANCE. |
| Gate-7 (Rate limiting on ALL endpoints) | **Applies.** | New `IntercessorReadRateLimitService` (60 req/min/user). |
| Gate-8 (Respect existing patterns) | **Applies (HARD).** | Reuse DisplayNameResolver, PrayerReceiptReadRateLimit pattern, PostMapper DTO pattern, existing visibility helper (if any). |
| Gate-9 (Plain text only) | **Applies.** | Names rendered as plain text. No markdown, no rich text, no embedded scripture or icons. |
| Gate-10 (Crisis detection supersession) | **N/A.** | No user-content surface created here. |

**New gates specific to 6.5 (all HARD; code-review hard-blocks violations):**

**Gate-G-ANONYMOUS-PRIVACY (HARD).**
Server response NEVER includes `user_id` field for reactions where `display_preference: ANONYMOUS`. Frontend NEVER attempts name resolution for entries marked `isAnonymous: true`.

Integration tests:
- Anonymous reaction → GET intercessors response JSON has `{ displayName: "Anonymous", isAnonymous: true, reactedAt: "..." }` and NO `userId` field
- Schema-level test: assert response DTO type has NO optional `userId` field exposed even at type level
- Code review hard-blocks any IntercessorResponse DTO that includes `userId` field, even nullable

**Gate-G-NO-LEADERBOARD (HARD).**
NO sort order based on intercessor frequency, engagement score, badge count, or any "ranking." NO badge/streak/count indicators on individual entries. Code review hard-blocks any code that:
- Sorts intercessors by anything other than `reactedAt DESC` (with stable tie-breaker on `reactionId ASC`)
- Adds a numeric "prayed N times" indicator next to names
- Renders Faithful Watcher (6.2) badges or any badge icons in the timeline
- Adds clickable affordances to thank/acknowledge specific intercessors

**Gate-G-VISIBILITY-RESPECTS-POST (HARD).**
Intercessor timeline visibility follows the SAME rules as the post itself. Friends-only posts don't expose intercessors to non-friends. Private posts don't expose intercessors to non-author.

Integration tests:
- Public post: anyone authenticated can fetch intercessors (200)
- Friends-only post + viewer is friend: 200
- Friends-only post + viewer is NOT friend: 403 (or 404 per plan-recon decision)
- Private post + viewer is author: 200
- Private post + viewer is NOT author: 403 (or 404)
- Soft-deleted/moderation-hidden post: 404 (don't leak existence)

Server-side enforcement is the SOURCE OF TRUTH. Frontend hiding (e.g., not rendering the timeline component for friends-only posts to non-friends) is defense-in-depth.

**Gate-G-PERFORMANCE (HARD).**
Feed query latency budget unchanged. P99 ≤ 200ms post-6.5. Plan-recon (R9) runs EXPLAIN ANALYZE on the proposed feed query with `intercessorSummary` subquery; if latency regresses, plan picks alternative approach (e.g., post-processing batch query instead of inline subquery).

Integration test: load 1000 posts each with 50+ reactions; run feed query under load; assert p99 ≤ 200ms.

**Gate-G-COPY (HARD).**
All user-facing strings in this spec authored in Section 7 D-Copy below. Eric reviews + approves before execute. Copy categories:
- Summary line formats (4 cases: 0 reactions, 1 reaction, 2-3 reactions, 4+ reactions)
- Empty state text
- Expand/collapse aria labels
- "and N others" affordance text

**Gate-G-A11Y (HARD).**
MUST cover:
- Summary line has `aria-expanded`, `aria-controls`, accessible name combining count + sample names
- Tap target meets 44x44px minimum
- Expanded timeline is `role="list"` with each entry `role="listitem"`
- Anonymous entries render with the SAME markup as named entries (no special class/aria-label that draws screen reader attention)
- Color contrast on muted soft-type meets WCAG AA at light + dark + night palettes
- Keyboard: Tab focuses summary line; Enter/Space toggles expand; Escape collapses when expanded
- Reduced-motion: expand/collapse transitions are instant
- Axe-core scan passes zero violations in collapsed AND expanded states

---

## 7. Decisions Catalog

The 13 design decisions baked into the brief that plan and execute must honor.

**D-PrivacyContrast: 6.5 is a parallel reader to 6.1, NOT a wrapper.** (MPD-1)

6.5 creates a NEW service `IntercessorService` distinct from `PrayerReceiptService`. They share underlying data (`post_reactions`) and share helpers (DisplayNameResolver, visibility helper) but have DIFFERENT privacy postures and SEPARATE controllers:

- 6.1 PrayerReceiptController: `GET /api/v1/posts/{id}/prayer-receipts` (author only)
- 6.5 IntercessorController: `GET /api/v1/posts/{id}/intercessors` (any authorized viewer)

The Java services are NOT merged into a single reader with a viewer-type parameter. Keeping them separate makes the privacy logic auditable: anyone reading IntercessorService.java can verify the privacy filters without untangling viewer-type conditionals.

They MAY share a private helper that does the actual `post_reactions` query, but the privacy filtering (especially the anonymous handling) lives in each service distinctly.

**D-TimestampFormat: Relative throughout.** (MPD-2)

```typescript
function relativeTime(reactedAt: Date, now: Date): string {
  const diffMs = now.getTime() - reactedAt.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHour < 24) return `${diffHour} hour${diffHour === 1 ? '' : 's'} ago`;
  if (diffDay < 8) return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`;
  if (diffDay < 31) return `${Math.floor(diffDay / 7)} week${Math.floor(diffDay / 7) === 1 ? '' : 's'} ago`;
  return formatMonthYear(reactedAt);  // "in November 2025"
}
```

Applies to ALL entries. Brief considered showing exact times to post AUTHORS (since they have a legitimate need to know who's praying when) but rejected: the timeline is a public surface, and showing different timestamps to different viewers introduces complexity and potential leak vectors. Authors who need finer info can use the 6.1 Prayer Receipt feature.

**D-NoAggregation: Each anonymous reaction is a separate entry.** (MPD-3)

Multiple anonymous reactions render as separate "Anonymous" entries with their own timestamps. NOT aggregated as "5 anonymous reactions." Brief accepts the timing-correlation risk (W-TimingDeanon) in exchange for the presence-signal value.

**D-Mechanism: Lazy-load + inline summary.** (MPD-4)

- Feed query returns `intercessorSummary: { count, firstThree: [...] }` per post (inline; no extra request)
- Tap-to-expand fetches full 50-entry list via `GET /api/v1/posts/{id}/intercessors`
- Tap-to-collapse re-uses cached frontend state (no re-fetch within session)
- After user adds own reaction: optimistic update inserts at top; on next feed refresh, server data replaces optimistic state

**D-NoLeaderboard: Chronological DESC only.** (MPD-5 / Gate-G-NO-LEADERBOARD)

Sort: `reactedAt DESC, reactionId ASC` (stable tiebreaker). No other sort options. No filtering by "top intercessors" or "my friends." No engagement-coded affordances.

**D-Visibility: Respects post visibility rules.** (MPD-7 / Gate-G-VISIBILITY-RESPECTS-POST)

IntercessorService checks post visibility BEFORE fetching reactions. Same helper used by PostService for `GET /api/v1/posts/{id}` visibility checks.

For v1 (friend-system Java not built), friends-only posts: hide the timeline component entirely on frontend; server returns 404 on intercessor endpoint to avoid leaking that reactions exist.

When friend system Java ships, the visibility helper is updated and 6.5's behavior "just works" via the shared helper.

**D-Cap: 50 entries max + "and N others".** (MPD-8)

Server enforces cap: query has `LIMIT 50`. Response includes `totalCount` separately so frontend can render "and N others" affordance.

No pagination. Master plan rationale: this is a guestbook, not a directory.

**D-NameResolution: Reuse DisplayNameResolver.** (MPD-9)

IntercessorService calls `displayNameResolver.resolveName(userId, perReactionPreference)`. The resolver returns either the user's chosen display name OR the string `"Anonymous"`. IntercessorService does NOT inspect user records directly for display name fields.

If the resolver returns `"Anonymous"`, the IntercessorResponse DTO sets `isAnonymous: true` and OMITS the `userId` field entirely (Gate-G-ANONYMOUS-PRIVACY).

**D-RateLimit: 60 reads per minute per user.** (MPD-10)

`IntercessorReadRateLimitService` mirrors 6.1's `PrayerReceiptReadRateLimitService`. Bucket: 60 tokens, refill 60/min. Per-user. Exceeding returns 429 with code `INTERCESSOR_READ_RATE_LIMITED`.

The feed endpoint's `intercessorSummary` field is NOT separately rate-limited (it rides on the feed endpoint's existing rate limit).

**D-Copy: Authored inline.** (Gate-G-COPY)

*Summary line formats:*
- 0 reactions: **"No one has prayed for this yet"** (no expand affordance)
- 1 reaction (named): **"Sarah is praying"** (no expand affordance; the one name fits)
- 1 reaction (anonymous): **"Someone is praying anonymously"** (no expand affordance)
- 2 reactions: **"Sarah and Anonymous are praying"**
- 3 reactions: **"Sarah, Anonymous, and Mark are praying"**
- 4-50 reactions: **"Sarah, Anonymous, Mark, and N others are praying"** (where N = total - 3; tap to expand)
- 50+ reactions: same format, last expanded entry shows "and M others" where M = total - 50

*Expanded timeline:*
- Entry format: `[Display name or "Anonymous"] · [relative time]`
- Trailing "and M others" entry (when total > 50): muted soft-type, NOT a link, NOT interactive

*Accessibility labels:*
- Summary line collapsed: aria-label = "3 people praying. Sarah, Anonymous, and Mark. Tap to expand list"
- Summary line expanded: aria-label = "3 people praying. Tap to collapse list"

**D-EmptyState: Non-promotional, neutral.** (MPD-6)

"No one has prayed for this yet" — stated as fact, not invitation. No CTA. No emoji. No icon. Muted soft-type.

**D-OptimisticUpdate: Insert at top; replace on server confirm.**

When user adds their own reaction via InteractionBar:
1. Optimistic update: insert `{ displayName: <resolved>, isAnonymous: <chosen>, reactedAt: now }` at top of cached timeline
2. On server confirmation of the reaction creation: refresh intercessor data; replace optimistic entry with authoritative server data
3. On server failure: roll back optimistic entry; show toast

**D-NightModeRespect: Uses existing CSS variables.**

IntercessorTimeline reads from existing CSS custom properties (e.g., `--text-muted`, `--text-soft`). Night Mode (6.3) overrides these via `[data-night-mode='on']` selector. No special Night Mode code in IntercessorTimeline; it inherits.

**D-NoLiveUpdates: Refresh-on-action only.**

No WebSocket / SSE / polling for intercessor updates in v1. The timeline updates when:
- User loads/refreshes the feed (full data)
- User taps to expand (fetches authoritative 50-entry list)
- User adds their own reaction (optimistic insert)

Future spec might add live updates if user feedback shows this matters.

---

## 8. Watch-fors

Organized by theme. ~32 items.

### Privacy-critical (Gate-G-ANONYMOUS-PRIVACY)
- W1 (CC-no-git): Claude Code never runs git operations at any phase.
- W2: Server response NEVER includes `user_id` for anonymous reactions. NOT nullable. NOT optional. The field simply isn't there in the DTO.
- W3: Frontend NEVER attempts to look up names for entries with `isAnonymous: true`. NO fallback path. NO "display name fallback" logic.
- W4: DisplayNameResolver's ANONYMOUS handling is canonical. IntercessorService does NOT bypass it via direct user table queries.
- W5: Per-reaction `is_anonymous` flag (if it exists per R5) overrides default. If user account-level is PUBLIC_NAME but reaction-level is ANONYMOUS, the reaction is anonymous.
- W6: Logging: IntercessorService MUST NOT log resolved-to-Anonymous reactions at DEBUG or above with the user_id present. If a reaction resolves to Anonymous, log only `{ postId, reactedAt }` without user identifier.
- W7 (W-TimingDeanon): Brief acknowledges that relative timestamps + non-aggregated entries leave a temporal correlation surface. Documented limitation. Future hardening spec may add coarser granularity for anonymous entries.

### Visibility / authorization (Gate-G-VISIBILITY-RESPECTS-POST)
- W8: Server-side authorization check happens BEFORE fetching reactions. Failed check returns 403/404 WITHOUT executing the reactions query.
- W9: Soft-deleted or moderation-hidden posts return 404 on intercessor endpoint. Don't leak existence by returning 403 (which would imply "exists but you can't see it").
- W10: For v1 (friend system Java not yet built), friends-only posts on the intercessor endpoint: returns 404 to non-author non-friend viewers. Frontend hides the timeline UI entirely for these posts.
- W11: The frontend does NOT trust client-side post visibility data. It calls the intercessor endpoint and respects the server's 200/403/404 response.

### Brand voice / no leaderboard (Gate-G-NO-LEADERBOARD)
- W12: Sort order is ALWAYS `reactedAt DESC, reactionId ASC`. No exceptions. No flag to enable different sort.
- W13: NO badge icons, streak indicators, or numeric "prayed N times" decorations on entries.
- W14: Entry rendering is read-only: tap on a name does NOTHING (no profile navigation, no "thank" action, no DM).
- W15: NO visual emphasis on "top intercessors" or recent vs. early. All entries render with identical styling.
- W16: Summary line copy never includes ranking language. NOT "3 people are praying for you most." NOT "Top intercessors." Just the names and count.

### Performance (Gate-G-PERFORMANCE)
- W17: Feed query latency p99 ≤ 200ms post-6.5. Plan-recon runs EXPLAIN ANALYZE; if regression, plan re-architects.
- W18: `intercessorSummary` subquery uses appropriate indexes. Likely index on `(post_id, created_at DESC)` for the 50-entry lookup. Plan-recon (R9) verifies indexes exist.
- W19: Feed payload size: `intercessorSummary` adds ~150-300 bytes per post on average (3 names + count). 20-post feed = ~3-6KB additional. Acceptable; document in plan.
- W20: Tap-to-expand request: completes within 100ms p99 for typical posts (≤50 reactions).
- W21: Optimistic update on user reaction: completes in same frame as the InteractionBar response. No flicker.

### Reuse / patterns (Gate-8)
- W22: DisplayNameResolver is the ONLY name resolution path. Code review hard-blocks direct user table queries from IntercessorService.
- W23: Rate-limit pattern mirrors 6.1 PrayerReceiptReadRateLimitService exactly (bucket4j config, exception types, error codes).
- W24: DTO mapping pattern mirrors PostMapper / existing PrayerReceiptResponse pattern.
- W25: Visibility check uses existing helper if available (plan-recon R8); does NOT inline visibility logic.

### Accessibility (Gate-G-A11Y)
- W26: Summary line has `aria-expanded`, `aria-controls`, and a stable element id for the controlled region.
- W27: Anonymous entries use SAME markup as named entries (no special class, no `aria-describedby` drawing attention to anonymity).
- W28: Color contrast on muted soft-type meets WCAG AA at all theme palettes (light, dark, night).
- W29: Keyboard focus management: Tab to summary line; Enter/Space expands; Escape collapses when expanded; focus stays on summary line through expand/collapse.
- W30: Reduced-motion preference: expand/collapse is instant, no height animation.

### Operations
- W31: New analytics: NONE. Do NOT add events for "intercessor timeline expanded" or "intercessor entry clicked." The surface is anti-metrics by design.
- W32: Aggregate request counts for the new endpoint (server logs) are fine for capacity planning.

---

## 9. Test Specifications

~24 tests total. Heavy on privacy assertions and integration tests.

### Backend unit tests (~3)
- `IntercessorResponse` DTO: builder/constructor does NOT permit setting `userId` field when `isAnonymous: true`. Schema-level enforcement (e.g., the field is not present in the class for anonymous variant; or the builder throws on the combination).
- `IntercessorService.formatRelativeTime()` (or wherever relative-time logic lives) handles all time buckets (just now / min / hour / day / week / month).
- `IntercessorService.resolveEntry()` calls DisplayNameResolver; for ANONYMOUS preference, returns entry with `isAnonymous: true` and NO `userId`.

### Backend integration tests — endpoint (~10)
- `GET /api/v1/posts/{id}/intercessors` from authenticated user, public post: returns 200 with array of entries sorted reactedAt DESC.
- Endpoint with 0 reactions: returns 200 with empty array (`[]`), `totalCount: 0`.
- Endpoint with 50 reactions: returns 200 with 50 entries, `totalCount: 50`.
- Endpoint with 75 reactions: returns 200 with 50 entries (most recent), `totalCount: 75`.
- Anonymous reaction in response: `{ displayName: "Anonymous", isAnonymous: true, reactedAt: "..." }`, NO `userId` field present in JSON.
- Mixed reactions: 3 named + 2 anonymous; response has 5 entries; anonymous entries have NO userId.
- Public post: any authenticated user can fetch (200).
- Friends-only post (v1 stub: friend system not built): returns 404 to non-author non-friend (graceful degradation; does NOT crash).
- Private post, viewer is NOT author: returns 403 (or 404 per plan-recon).
- Private post, viewer IS author: returns 200.
- Non-existent postId: returns 404.
- Unauthenticated: returns 401.
- Rate limit: 61st request within 60s window: returns 429 with code `INTERCESSOR_READ_RATE_LIMITED`.
- Soft-deleted post: returns 404.

### Backend integration tests — feed endpoint enhancement (~3)
- `GET /api/v1/posts` now returns per-post `intercessorSummary` field with `{ count, firstThree }`.
- Feed response with mixed reactions: anonymous entries in `firstThree` have NO `userId`.
- Feed query latency: EXPLAIN ANALYZE + benchmark with 1000 posts (each with 0-50 reactions) shows p99 ≤ 200ms.

### Frontend unit tests (~3)
- `relativeTime()` utility: returns correct strings for all time buckets (parametric test).
- `formatSummaryLine(count, firstThree)`: returns correct strings for 0, 1 named, 1 anonymous, 2, 3, 4+ cases per D-Copy.
- `<IntercessorTimeline>` renders entries with display name + relative time; anonymous entries render as "Anonymous" with no distinguishing styling.

### Frontend integration tests (~3)
- Feed loads; PrayerCard renders summary line based on `intercessorSummary` data; tap-to-expand fetches full list and renders entries.
- Expanded timeline; user adds own reaction via InteractionBar; optimistic entry inserts at top; on confirm, replaced with server data.
- Friends-only post (frontend stub): timeline component does not render at all.

### Playwright E2E (~2)
- **Happy path:** Login, navigate to Prayer Wall, click any post with reactions; verify summary line shows; click to expand; verify entries listed with relative times; click to collapse; verify smooth transition.
- **Anonymity verification:** Login as Alice; navigate to a post where Bob reacted anonymously; expand timeline; verify Bob's entry shows as "Anonymous"; open dev tools → Network tab → verify response JSON has NO `userId` for that entry.

### Accessibility test (~1)
- Axe-core scan on Prayer Wall with intercessor timeline collapsed and expanded: zero violations at desktop + tablet + mobile.

---

## 10. Files

### To CREATE

**Backend:**
- `backend/src/main/java/com/worshiproom/post/IntercessorController.java` — REST controller; `GET /api/v1/posts/{id}/intercessors`
- `backend/src/main/java/com/worshiproom/post/IntercessorService.java` — service per D-PrivacyContrast
- `backend/src/main/java/com/worshiproom/post/dto/IntercessorResponse.java` — DTO; for anonymous entries, field structure must NOT include `userId` (Gate-G-ANONYMOUS-PRIVACY)
- `backend/src/main/java/com/worshiproom/post/dto/IntercessorSummary.java` — DTO for the inline feed-response field `{ count, firstThree }`
- `backend/src/main/java/com/worshiproom/post/IntercessorReadRateLimitService.java` — rate limit service; mirrors PrayerReceiptReadRateLimitService
- `backend/src/main/java/com/worshiproom/post/IntercessorReadRateLimitConfig.java` — bucket4j config
- `backend/src/main/java/com/worshiproom/post/IntercessorReadRateLimitException.java` — 429 exception class
- Test files mirroring each (under `backend/src/test/java/.../post/`)

**Frontend:**
- `frontend/src/components/prayer-wall/IntercessorTimeline.tsx` — the timeline component
- `frontend/src/components/prayer-wall/__tests__/IntercessorTimeline.test.tsx` — unit + integration tests
- `frontend/src/hooks/useIntercessors.ts` — hook for tap-to-expand fetch + optimistic update; returns `{ entries, totalCount, loading, error, expand, collapse }`
- `frontend/src/hooks/__tests__/useIntercessors.test.ts` — hook tests
- `frontend/src/lib/relative-time.ts` — pure relative-time formatter per D-TimestampFormat
- `frontend/src/lib/__tests__/relative-time.test.ts` — unit tests
- `frontend/src/lib/intercessor-summary.ts` — pure summary-line formatter per D-Copy
- `frontend/src/lib/__tests__/intercessor-summary.test.ts` — unit tests
- `frontend/src/types/intercessor.ts` — TypeScript types; anonymous variant has NO `userId` field
- `frontend/tests/e2e/intercessor-timeline.spec.ts` — Playwright suite

### To MODIFY

**Backend:**
- `backend/src/main/java/com/worshiproom/post/PostController.java` — wire the new `IntercessorController` (likely just import; new controller is its own bean) OR add the endpoint as a method on PostController (plan-recon picks per existing controller-per-concern pattern; recommend separate IntercessorController for separation of concerns)
- `backend/src/main/java/com/worshiproom/post/PostService.java` — feed query result enrichment to include `intercessorSummary` per post; plan-recon (R9) picks specific mechanism
- `backend/src/main/java/com/worshiproom/post/PostMapper.java` — if applicable, extend DTO mapping to include `intercessorSummary`
- `backend/src/main/resources/openapi.yaml` — document new endpoint + feed response shape change

**Frontend:**
- `frontend/src/components/prayer-wall/PrayerCard.tsx` — import + render `<IntercessorTimeline />` below post content; pass postId + initial `intercessorSummary` from feed data
- `frontend/src/components/prayer-wall/InteractionBar.tsx` — on successful reaction, call `useIntercessors().optimisticInsert(myEntry)` for immediate timeline update (plan-recon R-? confirms the InteractionBar pattern)
- `frontend/src/types/post.ts` (or similar) — extend `Post` type to include optional `intercessorSummary` field
- `frontend/src/services/posts-api.ts` (or similar) — add `fetchIntercessors(postId)` function

### NOT to modify (explicit non-targets)
- `PrayerReceiptService.java` — 6.1's service is untouched; 6.5 is a parallel reader per D-PrivacyContrast
- `PrayerReceiptController.java` — not modified; 6.5's IntercessorController is separate
- `DisplayNameResolver.java` — reused as-is via injection; not modified
- `post_reactions` table schema — read-only; no DB changes
- 6.1's Prayer Receipt code paths — orthogonal
- 6.2's Quick Lift code — orthogonal (it CREATES reactions; we just READ them differently)
- 6.3's Night Mode code — IntercessorTimeline INHERITS CSS via existing variables; does NOT add Night-Mode-specific code
- 6.4's Watch code — orthogonal (Watch is feed re-sort; timeline is per-card render)
- Faithful Watcher badge logic (6.2) — NOT integrated into timeline (Gate-G-NO-LEADERBOARD)

### To DELETE
None. 6.5 is purely additive.

---

## 11. Acceptance Criteria

**Functional (from master plan + brief):**
- A. Summary line visible on every public prayer card below the content
- B. Summary line copy follows D-Copy formats for 0/1/2/3/4+ reaction cases
- C. Tap on summary line expands inline to up to 50 entries
- D. Tap again collapses
- E. Entries show display name (or "Anonymous") + relative timestamp per D-TimestampFormat
- F. Anonymous reactors are not deanonymized in the response or rendered output
- G. 50-entry cap enforced server-side; "and N others" affordance when total > 50
- H. NO comparison, leaderboard, badge, or streak framing anywhere (Gate-G-NO-LEADERBOARD)
- I. Brand voice review passes
- J. ~24 tests covering all privacy, performance, and brand-voice invariants

**Privacy invariants (HARD):**
- K. Server response NEVER includes `user_id` for anonymous entries (Gate-G-ANONYMOUS-PRIVACY)
- L. Frontend NEVER attempts name resolution for entries with `isAnonymous: true`
- M. DisplayNameResolver is the canonical name-resolution path; no parallel paths
- N. Logging: anonymous reactions are NOT logged with `user_id` at DEBUG or above

**Visibility (HARD):**
- O. Friends-only posts: timeline hidden for non-friends (Gate-G-VISIBILITY-RESPECTS-POST)
- P. Private posts: timeline visible only to author
- Q. Soft-deleted/hidden posts: 404 on intercessor endpoint (don't leak existence)

**Performance (HARD):**
- R. Feed query p99 ≤ 200ms (Gate-G-PERFORMANCE)
- S. Tap-to-expand request p99 ≤ 100ms

**Rate limiting:**
- T. 60 requests per minute per user on intercessor endpoint; 61st returns 429

**Brand voice:**
- U. All copy passes Gate-G-COPY audit (Eric-approved)
- V. Empty state is non-promotional ("No one has prayed for this yet")
- W. Entries are read-only; no clickable affordances on names

**Accessibility:**
- X. Summary line has aria-expanded, aria-controls, descriptive accessible name
- Y. Expanded timeline is role="list"; entries role="listitem"
- Z. Anonymous entries use SAME markup as named entries
- AA. Keyboard navigation works (Tab/Enter/Escape)
- BB. Reduced-motion accommodation: instant transitions
- CC. Axe-core passes zero violations in both collapsed and expanded states

---

## 12. Out of Scope

Explicitly NOT in 6.5. Some are deferred (future spec might add); some are anti-features (never).

### Deferred / future spec candidates
- Live WebSocket/SSE updates as new reactions come in (v1 is refresh-on-action only)
- Pagination beyond the 50-entry cap (v1 caps at 50; future spec could add "see all" for posts with hundreds of reactions, with careful design)
- Author-only view variant with finer timestamps (current design: same view for everyone)
- Profile click-through from entry names (intentionally not interactive)
- Notification when someone you know prays for a post you're following
- Search/filter within the expanded timeline
- "My intercessions" timeline on user profile pages
- Internationalized relative-time strings (v1 is en-US only; future i18n spec)
- Coarser timestamps for anonymous entries specifically (v1 uses same granularity for all; W-TimingDeanon documents limitation)
- Aggregating consecutive anonymous reactions ("5 anonymous reactions") — v1 explicitly does NOT aggregate per D-NoAggregation

### Anti-features (never)
- Sort orders based on intercessor frequency, badge counts, or engagement (Gate-G-NO-LEADERBOARD)
- "Top intercessors" lists
- Faithful Watcher badge indicators in timeline entries
- "Thank intercessor" buttons or any per-entry interaction
- Streak counters or "prayed N times this week" decorations
- DM/contact affordances from intercessor names
- Public profiles for users who reacted (separate concern; if it exists, intercessor entries are NOT links to it)
- Algorithmic re-ranking of "most relevant" intercessors
- Analytics on timeline expand/collapse behavior
- Notifications nudging users to "thank your intercessors"

### Different concerns (out of scope entirely)
- 6.1 Prayer Receipt feature (author-only view) — separate spec, separate service
- Trust level visibility / verification badges — different system
- Friend relationships (Phase 2.5.1 tables only; Java unbuilt) — 6.5 stubs friend-aware paths; future spec wires actual friend lookup
- Crisis classification visibility — separate concern (6.4)
- Reaction creation / removal flow — InteractionBar's responsibility; 6.5 only reads
- Author's response to intercessors ("thank you, prayer warriors!") — different feature category

---

## 13. Tier Rationale (closing)

**Why xHigh not High:** Public-facing privacy surface where anonymous reactors must remain anonymous across all viewers; brand voice on a high-frequency surface (every prayer card); backend + frontend changes; performance budget on the hot feed-load path; direct prerequisite for 6.6 (Answered Wall).

**Why xHigh not MAX:** No crisis adjacency; no real-time wellbeing stakes; no AI integration prohibitions; multi-layer enforcement is appropriate but not unprecedented (6.1 established similar patterns).

**Practical execution implication:**
- spec-from-brief: Opus 4.7 thinking xhigh
- plan-from-spec: Opus 4.7 thinking xhigh (R5-R10 plan-recon must be thorough; D-PrivacyContrast comparison with 6.1 is load-bearing)
- execute: xhigh throughout, with extra discipline on the IntercessorService privacy logic (compare to PrayerReceiptService line-by-line)
- review: xhigh focus on Gate-G-ANONYMOUS-PRIVACY tests, server response shapes, brand-voice audit on copy, performance EXPLAIN ANALYZE results

---

## 14. Recommended Planner Instruction

```
Plan execution for Spec 6.5 per
/Users/eric.champlin/worship-room/_plans/forums/spec-6-5-brief.md.

Tier: xHigh. Use Opus 4.7 thinking depth xhigh throughout.

Honor all 10 MPDs, 13 decisions, ~32 watch-fors, ~24 tests, and 6 new gates
(Gate-G-ANONYMOUS-PRIVACY, Gate-G-NO-LEADERBOARD, Gate-G-VISIBILITY-RESPECTS-POST,
Gate-G-PERFORMANCE, Gate-G-COPY, Gate-G-A11Y).

CRITICAL: D-PrivacyContrast in Section 7 is the load-bearing design decision.
IntercessorService is a PARALLEL reader to 6.1's PrayerReceiptService, not a
wrapper. Privacy logic lives in each service distinctly. Plan-recon MUST read
PrayerReceiptService.java end-to-end and document the comparison.

Required plan-time recon (R5-R10):
- R5: read post_reactions Liquibase changeset; confirm column names
- R6: read DisplayNameResolver.java; confirm public API signature
- R7: read PrayerReceiptService.java end-to-end; document its privacy logic
  for IntercessorService to mirror correctly
- R8: find or extract a PostVisibility helper for authorization checks
- R9: read existing feed query; pick mechanism for intercessorSummary inline;
  run EXPLAIN ANALYZE; if regression, re-architect
- R10: read PrayerReceiptReadRateLimitService for the bucket4j pattern

Plan-time divergences from brief: document in a Plan-Time Divergences section.
Justifiable divergences welcome; surface them. Privacy-related divergences
require Eric's explicit chat sign-off before execute.

Do NOT plan for execution while Spec 6.4 is running. 6.4 must merge first.
The plan can be authored at any time.

ALL user-facing copy in Section 7 D-Copy is BRIEF-LEVEL CONTENT. Generate plan
referencing verbatim. CC during execute may light-edit (within 2 words per
string) for layout fit but MUST NOT replace wholesale.

Per W1, you do not run any git operations at any phase.
```

---

## 15. Verification Handoff (Post-Execute)

After CC finishes execute and produces the per-step Execution Log:

**Eric's verification checklist:**

1. Review code diff section by section. Pay special attention to:
   - `IntercessorService.java` (privacy logic; compare side-by-side with `PrayerReceiptService.java` to verify the difference is intentional)
   - `IntercessorResponse.java` (DTO; verify `userId` is NOT a field when `isAnonymous: true`)
   - `IntercessorTimeline.tsx` (no leaderboard affordances; entries read-only)
   - Server-side authorization check before reaction fetch
   - Rate limit service mirrors 6.1 PrayerReceiptReadRateLimitService pattern

2. Create test posts as multiple test users; have some react with `display_preference: ANONYMOUS` and some with `display_preference: PUBLIC_NAME`.

3. Open Prayer Wall; verify each card shows a soft-type summary line in the correct format per D-Copy.

4. Read summary line copy for several posts of varying reaction counts. Verify:
   - 0 reactions: "No one has prayed for this yet"
   - 1 named: "Sarah is praying"
   - 1 anonymous: "Someone is praying anonymously"
   - Multi-reaction formats match D-Copy exactly
   - Never feels like a leaderboard or popularity metric

5. Tap a summary line; verify smooth expand to full timeline; verify entries are sorted reactedAt DESC; verify relative timestamps match D-TimestampFormat tiers.

6. Open dev tools → Network tab → verify GET intercessors response JSON has NO `userId` field on anonymous entries.

7. Tap same line; verify smooth collapse.

8. Add own reaction via InteractionBar; verify optimistic entry inserts at top of timeline; verify on refresh, server data confirms the entry.

9. Try friends-only post (if friend system Java is stubbed): verify timeline component does NOT render at all for non-friend viewers.

10. Try private post (you're not author): verify timeline does NOT render; intercessor endpoint returns 403 or 404.

11. Performance: load a feed page with many posts each having reactions; verify feed load latency is comparable to pre-6.5 (network tab shows the feed response time).

12. Rate limit: rapid-fire 61 tap-to-expand requests within a minute; verify 61st returns 429.

13. Night Mode: at 11pm, verify intercessor timeline uses Night Mode palette (warm muted) on a card with reactions.

14. Accessibility:
    - Tab through Prayer Wall; verify summary line is keyboard-focusable
    - Enter to expand; Tab through entries; Escape to collapse; focus returns to summary line
    - Run axe-core scan: zero violations in both states
    - Try screen reader (VoiceOver/NVDA): verify entries announce as "Sarah, 3 hours ago" / "Anonymous, 5 hours ago"

15. Brand voice judgment (the xHigh-tier call only Eric can make): does the timeline read as a quiet guestbook of presence, or does it slip toward feeling like a Twitter likes panel? If the latter, identify specific elements (sort order, copy, styling, density) for revision.

**If all clean:** Eric commits, pushes, opens MR, merges to master. Tracker updates: 6.5 flips ⬜ → ✅.

**If privacy-relevant element feels wrong:** Halt merge. Discuss in chat. Do NOT merge a privacy-adjacent feature on "good enough."

---

## 16. Prerequisites Confirmed

- **6.4 (3am Watch v1):** must merge first per master plan; 6.5 lives inside PrayerCard which 6.4 doesn't modify but visually intersects with during Watch hours
- **6.3 (Night Mode):** ✅ (intercessor timeline inherits Night Mode CSS variables)
- **6.2/6.2b:** ✅ (orthogonal)
- **6.1 (Prayer Receipt):** ✅ — ESSENTIAL prerequisite for data model + privacy patterns + DisplayNameResolver integration + rate limit pattern
- **post_reactions table:** ✅ verified via R2
- **PrayerCard.tsx:** ✅ verified via R4
- **DisplayNameResolver:** ✅ verified via R3
- **PostController + PostService + PostRepository:** ✅ verified via R1

**Execution sequencing:**
Safest order: 6.1 → 1.5g → 6.2 → 6.2b → 6.3 → 6.4 → 6.5 OR with 1.5g elsewhere. 6.5 cannot execute concurrently with 6.4 (both touch PrayerCard render path).

After 6.4 merges to master:
- Rebase/merge `forums-wave-continued` onto master
- Eric reviews + approves all copy in Section 7 D-Copy
- Run `/spec-forums spec-6-5-brief.md` → generates spec file
- Run `/plan-forums spec-6-5.md` → generates plan file (with R5-R10 plan-recon; includes side-by-side comparison with 6.1 PrayerReceiptService)
- Eric reviews plan + verifies privacy logic matches D-PrivacyContrast
- Run `/execute-plan-forums YYYY-MM-DD-spec-6-5.md` → executes
- Eric reviews code via the 15-item verification checklist above
- Eric commits + pushes + MRs + merges

---

## End of Brief
