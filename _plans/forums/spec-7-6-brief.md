# Forums Wave: Spec 7.6 — Friends Pin to Top of Feed

**Master Plan Reference:** `_forums_master_plan/round3-master-plan.md` Spec 7.6 stub (master plan lines 6468–6490). Size L, Risk Medium, prerequisites 7.5. Five-AC checklist (up to 3 friend posts pin to top, "From a friend" chip on each, no-friends users see regular feed, no duplication below, ≥12 tests). Goal: *"When the user has friends, recent posts from those friends pin to the top of the Prayer Wall feed."*

**Brief Source:** This brief, authored 2026-05-16 against the live master plan stub + live code recon.

**Branch:** `forums-wave-continued`. CC never alters git state; Eric handles all commits manually.

**Date:** 2026-05-16.

**Spec ID:** `round3-phase07-spec06-friends-pin-to-top`

**Phase:** 7 (Cross-Feature Integration) — the sixth spec.

**Size:** L

**Risk:** Medium — backend feed query enhancement is the meat. The work modifies the main Prayer Wall feed path (`PostService.listPosts` or equivalent — see recon), introduces a per-viewer ordering hint, adds a chip to PrayerCard, and adds a DTO field. Risk is bounded because: (a) `friend_relationships` table + entity + repository all exist since Phase 2.5.x; (b) 7.4's `FriendPrayersService.java` JUST shipped a friend-id lookup pattern that 7.6 can reuse; (c) `PostVisibility` enum (`FRIENDS`/`PUBLIC`/`PRIVATE`) and `PostSpecifications.visibleTo(viewerId)` predicate ALREADY exist and are wired into the existing query path; (d) PrayerCard has multiple existing chip patterns to mirror (`ScriptureChip`, `CategoryBadge`, `QotdBadge`). The genuine new work is the feed-ordering logic that hoists friend posts to position 0-2 in the result set without duplicating them in the chronological remainder.

**Tier:** Standard.

---

## Affected Frontend Routes

- `/prayer-wall` (the main feed where friend posts pin)
- `/prayer-wall/dashboard` (the dashboard view — see R6 for whether the pin behavior applies here too)
- `/prayer-wall/user/:id` (PrayerWallProfile — see R6)
- `/prayer-wall/answered` (the answered-wall feed mode — see R6; default NO pinning here)

The pin behavior is feed-driven, NOT route-driven. It fires anywhere the main Prayer Wall feed query is consumed. PrayerCard renders the chip wherever it's rendered when `isFromFriend === true`.

---

## Affected Backend Surfaces

- `backend/src/main/java/com/worshiproom/post/PostService.java` (feed query enhancement — likely the `listPosts(viewerId, page, limit, category, ...)` method visible at line 120)
- `backend/src/main/java/com/worshiproom/post/dto/PostResponse.java` (add `isFromFriend` field)
- `backend/src/main/java/com/worshiproom/post/PostMapper.java` (compute `isFromFriend` during DTO mapping — plan-recon verifies the exact location)
- `backend/src/main/java/com/worshiproom/post/FriendPrayersService.java` (reuse existing friend-id lookup from 7.4 — see R3)
- `backend/src/main/java/com/worshiproom/post/PostRepository.java` (potentially a new query method for friend-posts-last-24h or similar)

---

## STAY ON BRANCH

Same as Phase 6, 7.1–7.5 — stay on `forums-wave-continued`. No git mutation commands at any phase. Read-only git inspection is permitted.

---

## Spec-time Recon Summary (verified on disk 2026-05-16)

| Item | Status | Evidence |
|---|---|---|
| `PostVisibility` enum already has PRIVATE / FRIENDS / PUBLIC | ✅ | `PostService.java:725-729` — switch statement covering all three values. **This answers 7.4's R2 question retroactively: visibility is ACTIVE in the codebase.** |
| `PostSpecifications.visibleTo(viewerId)` is the existing visibility predicate | ✅ | `PostService.java:170` — `Specification<Post> spec = PostSpecifications.visibleTo(viewerId).and(...)`. Documented at `PostSpecifications.java:40-53` |
| `friend_relationships` table + entity + repository ship since Phase 2.5.x | ✅ | `2026-04-27-009-create-friend-relationships-table.xml`, `FriendRelationship.java`, `FriendRelationshipRepository.java` (per 7.4 recon) |
| `FriendPrayersService.java` exists from 7.4 (just shipped) | ✅ | `backend/src/main/java/com/worshiproom/post/FriendPrayersService.java` — created by 7.4 to support "From your friends today" Daily Hub section. Contains friend-id lookup logic that 7.6 can reuse — see R3 |
| `PostService.listPosts(viewerId, ...)` is the main feed query | ✅ | `PostService.java:120` — `public listPosts(@Nullable UUID viewerId, int page, int limit, @Nullable String category, ...)`. This is where 7.6 injects friend-pin ordering |
| PrayerCard already renders chips/badges (`ScriptureChip`, `CategoryBadge`, `QotdBadge`) | ✅ | `PrayerCard.tsx:17-19,271-275` — multiple chip components imported and conditionally rendered. **The "From a friend" chip mirrors this exact pattern** |
| `request.visibility()` field is on `CreatePostRequest` and gets persisted | ✅ | `PostService.java:311-313` — `post.setVisibility(PostVisibility.fromValue(request.visibility()))`. So posts ALREADY have visibility set; 7.6's friend-pin query just needs to filter by visibility consistency |
| `AnsweredFeedCache` exists, with cache eviction patterns | ✅ | `PostService.java:82` (private field), `:396` (`@CacheEvict(value = "answered-feed", allEntries = true)` on updatePost). Pattern reusable for friend-pin caching if needed |
| Existing rate limiting pattern via `PostsRateLimitException` → 429 | ✅ | `PostService.java:657` — `resolveRateLimitService.checkAndConsume(currentUserId)`. Existing rate-limit infrastructure can be applied to friend-pin if needed |
| 7.4's FriendPrayersService uses Quick Lift session exclusion | ✅ (claim) | Per 7.4's design, the service joins `posts` + `friend_relationships` + `quick_lift_sessions` to find friend posts the viewer hasn't engaged with. 7.6 may NOT want Quick Lift exclusion — see R4 |

**Recon override:** Three things differ from the stub:
1. The stub says "When the user has friends, recent posts from those friends pin to the top." It doesn't define **what counts as "recent"** — plan-recon picks a time window. Likely "last 24h" mirroring 7.4, but worth confirming.
2. The stub says "no duplication below in the chronological feed." This requires the friend posts that get pinned to be EXCLUDED from the rest of the chronological query, NOT just appended at position 0-2. Plan-recon picks the implementation strategy.
3. The stub mentions PrayerCard chip but doesn't specify whether the chip is visual-only or interactive (e.g., clicking jumps to friend's profile). Plan-recon decides — default leans visual-only.

---

## Major Plan Decisions (MPD) — baked into this brief

**MPD-1.** Pin policy:
- The viewer must be authenticated AND have at least 1 active friend
- Up to 3 friend posts pin to the top of the feed
- Friend posts are ordered by `created_at DESC` (most recent first) within the pinned set
- Pinned posts are EXCLUDED from the chronological remainder (no duplication per AC-4)
- Pin time window: **last 24 hours** (mirrors 7.4's `friend-prayers-today` window for consistency)
- If the viewer has fewer than 3 eligible friend posts in the window, pin only those available (could be 0, 1, 2, or 3)

**MPD-2.** Visibility + moderation respected per existing `PostSpecifications.visibleTo(viewerId)`:
- `posts.is_deleted = FALSE`
- `posts.moderation_status IN ('approved', 'flagged')`
- `posts.visibility` honors the existing PUBLIC / FRIENDS / PRIVATE rules
- The friend-pin query composes with the existing predicate, NOT replacing it

**MPD-3.** Frontend chip is visual-only:
- New component `<FromFriendChip />` rendered conditionally on `prayer.isFromFriend === true`
- Visual treatment: subtle pill-style chip, matches the existing `CategoryBadge` / `QotdBadge` visual rhythm (NOT prominent, NOT engagement-bait)
- Copy: *"From a friend"* (per stub AC literal)
- NO link, NO hover state beyond standard tooltip if any, NO badge count
- Per anti-pressure: this is informational ("you know this person"), NOT a CTA

**MPD-4.** Friend posts do NOT receive a different layout or visual treatment beyond the chip. Same PrayerCard, same width, same interaction surface. The chip is the ONLY differentiator.

**MPD-5.** Anonymous-author-respect:
- If a friend's post is anonymous (per Spec 4.6), the card still shows the chip "From a friend" but the author name is "Someone" or equivalent
- This is a real edge case: the viewer can infer SOMEONE in their friend group posted, but not which friend
- Plan-recon decides whether this is acceptable or whether the chip should be suppressed on anonymous friend posts — see R5

**MPD-6.** Quick Lift / engagement exclusion is NOT applied (unlike 7.4):
- 7.4 excludes posts the viewer has Quick Lifted (because the Daily Hub surface is for "act on these")
- 7.6 does NOT exclude — pinning is presence-based ("your friends are sharing"), not action-based
- A friend's post stays pinned even if you've Quick Lifted it (it's still "from a friend")
- Plan-recon confirms this is desired UX — see R4

**MPD-7.** Performance:
- The friend-pin query runs as part of the existing `listPosts` flow
- Two-query strategy is acceptable: (1) fetch top-3 friend posts in last 24h, (2) fetch chronological remainder EXCLUDING those post IDs
- Plan-recon confirms whether a single SQL with `UNION ALL` + `ROW_NUMBER()` is preferable (likely faster but harder to maintain)
- Caching: friend-pin results are per-viewer, so the existing `AnsweredFeedCache` pattern doesn't transfer directly. Consider a 30-60s per-viewer cache key if performance becomes a concern; otherwise no cache.

**MPD-8.** No new backend endpoint:
- 7.6 enhances the EXISTING feed endpoint (whatever route `PostController` exposes for the main Prayer Wall feed)
- No new `/api/v1/users/me/pinned-friends` style endpoint
- The feed response now includes `isFromFriend` per post

---

## Plan-Recon Gating Questions (R1–R8)

**R1 — Recent window (load-bearing).** Three options:
- (a) **Last 24 hours** (default per MPD-1, mirrors 7.4)
- (b) **Last 7 days** (broader; lets less-active friends still get surfaced)
- (c) **Last 48 hours** (compromise)

**Default per MPD-1: (a) 24h.** Consistent with 7.4's `friend-prayers-today` window. Plan-recon confirms.

**R2 — Authenticated unauthenticated users.** Three observations:
- The stub says "When the user has friends" — implicitly assumes authentication
- Unauthenticated users have NO friend relationships at all, so the friend-pin query returns empty regardless
- AC-3 says "Users with no friends see the regular chronological feed (no special treatment)" — implicitly covers unauthenticated too (no friends → no pins → regular feed)

**Default:** Unauthenticated users see the regular chronological feed. No special UI. Plan-recon confirms.

**R3 — Reuse of `FriendPrayersService` (just shipped from 7.4) vs. new service.** Three options:
- (a) **Reuse 7.4's `FriendPrayersService`.** Add a new method like `getFriendPostsForFeed(viewerId, since, limit)` that returns the top-3 posts. 7.6 calls it from `PostService.listPosts`.
- (b) **New `FriendFeedService.java`.** Separate concerns. 7.4 is "Daily Hub micro-surface"; 7.6 is "feed pinning"; they're related but distinct.
- (c) **Add the method directly to `PostService.java`.** Simplest, but bloats PostService.

**Default: (a) Reuse `FriendPrayersService`.** Plan-recon should review `FriendPrayersService` to identify which methods to reuse and which to add. If the existing methods are tightly coupled to "exclude posts the viewer has Quick Lifted" semantics (per 7.4's MPD-1), the new method may need to opt out of that — see R4.

**R4 — Quick Lift / engagement exclusion semantics.** Per MPD-6 default, 7.6 does NOT exclude posts the viewer has Quick Lifted. But:
- (a) **No exclusion** (default). A friend's post stays pinned even if you've Quick Lifted it.
- (b) **Exclude after Quick Lift.** Match 7.4's pattern. Reduces top-of-feed clutter for engaged users.
- (c) **Exclude after any engagement** (Quick Lift, comment, candle, intercessor signup). Most aggressive.

**Default: (a) No exclusion.** Pinning is presence-based, not engagement-based. A friend continues to appear at the top until they're outside the time window. Plan-recon confirms with Eric — this is genuinely a UX decision.

**R5 — Anonymous friend posts (load-bearing for privacy).** When a friend posts anonymously:
- (a) **Chip shows + author shows "Someone".** The viewer knows a friend posted but not which one. Privacy partially preserved.
- (b) **Chip is suppressed on anonymous friend posts.** The post is pinned but no chip. Privacy fully preserved.
- (c) **Anonymous friend posts are NOT pinned at all.** Privacy strongest; but defeats the purpose of pinning.

**Default: (a) Chip shows + author shows "Someone".** The viewer sees "From a friend" + "Someone said: ..." which is mildly ambiguous but respects both signals (a friend posted; identity is anonymous). Plan-recon may surface for design review — Eric should know this edge case before execute.

**R6 — Which feed routes get the pin behavior?**
- (a) **Main Prayer Wall feed only.** Conservative.
- (b) **Main feed + Dashboard.** Wider.
- (c) **All Prayer Wall surfaces.** Broadest.

**Default: (a) Main feed only.** The Profile feed shows ONE user's posts only, so pinning doesn't apply. The Dashboard feed view may be a different aggregation. The Answered Wall has its own ordering rules per 6.6b. Plan-recon confirms by reading each route's feed query and determining whether the pin behavior makes sense or violates the route's existing contract.

**R7 — Self-posts pinning.** The viewer's OWN posts — should they pin to the top because the viewer is implicitly "friends with themself"?
- (a) **No.** Self-posts are not pinned. The friend-pin query joins `friend_relationships` which excludes self-rows (CHECK constraint user_id != friend_user_id per the Liquibase changeset).
- (b) **Yes.** Self-posts are pinned for the author's own viewing convenience.

**Default: (a) No self-pinning.** Cleanest semantics. Plan-recon confirms.

**R8 — Performance + caching strategy.**
- Two-query vs. UNION ALL — plan-recon picks. Default: two-query for maintainability.
- Per-viewer caching with 30-60s TTL: warranted only if response time exceeds 200ms baseline. Plan-recon measures.
- AnsweredFeedCache pattern doesn't transfer (it's anonymous-cacheable; friend-pin is per-viewer).
- Idle-load polling: not applicable. Feed refresh is on-demand via existing pagination.

**Default: Two-query, no caching initially. Add caching if perf measurements indicate.**

---

## Section 1 — As-Designed Behavior

### 1.1 Authenticated user with friends loads `/prayer-wall`

User navigates. Frontend calls existing feed endpoint (likely `GET /api/v1/posts` or similar). Backend `PostService.listPosts(viewerId, page=1, limit=20, ...)` runs.

The enhanced flow:
1. Compute `friendIds` for the viewer (reuse `FriendPrayersService` per R3)
2. If `friendIds` is empty → skip to step 5
3. Query: top-3 posts from `friendIds` in last 24h, respecting visibility/moderation
4. Query: chronological remainder (existing query) EXCLUDING the post IDs from step 3, returning (limit - friendPostCount) results
5. Concatenate: friend posts first, then chronological remainder
6. Map to DTOs with `isFromFriend = true` for the friend-set, `false` for the rest

### 1.2 Authenticated user with no friends loads `/prayer-wall`

Same flow, but step 2 skips. Pure chronological feed. AC-3: "Users with no friends see the regular chronological feed."

### 1.3 Unauthenticated user loads `/prayer-wall`

`viewerId` is null. Friend-id lookup is skipped (no friend_relationships rows for null viewer). Pure chronological feed. Same as 1.2.

### 1.4 PrayerCard renders the chip

For each post in the feed response, if `prayer.isFromFriend === true`, render `<FromFriendChip />` in the badge row alongside any existing `CategoryBadge` / `QotdBadge` / etc. Visual treatment per MPD-3.

### 1.5 Anonymous friend post

If a pinned post has `isAnonymous = true`, the author display shows "Someone" per Spec 4.6, AND the `FromFriendChip` still shows per MPD-5 + R5 default.

### 1.6 Pagination

The friend-pin behavior applies ONLY to page 1. Subsequent pages (page 2+) are pure chronological with no friend pinning (the friend posts have already appeared on page 1; pages 2+ are the chronological remainder continuation).

This requires the API to know whether the request is for page 1 or later. Plan-recon picks: either (a) only inject pins when `page === 1`, or (b) include `friendPostsAppearedOnPage1` metadata so pagination logic is explicit.

### 1.7 No-duplication contract

A friend's post that's pinned at position 0-2 does NOT also appear later in the same response or on subsequent pages' chronological remainder. The exclusion is by post ID, baked into the chronological query.

---

## Section 2 — Gates

- **Gate-G-MAX-THREE-PINS.** Maximum 3 friend posts pin. Test inserts 5 friend posts in 24h, asserts only top 3 by `created_at DESC` are pinned.
- **Gate-G-NO-DUPLICATION.** Pinned posts are excluded from the chronological remainder. Test creates 3 friend posts + 10 non-friend posts, asserts the friend posts appear at positions 0-2 and NOT elsewhere in the response.
- **Gate-G-EMPTY-FRIENDS-NO-PINS.** Users with no friends get the regular chronological feed unchanged. Test asserts the response shape matches pre-7.6 behavior for empty-friends users.
- **Gate-G-UNAUTHENTICATED-NO-PINS.** Unauthenticated requests bypass the friend-pin flow. Test asserts no errors and no unexpected fields.
- **Gate-G-VISIBILITY-RESPECTED.** Private friend posts are excluded. Friends-only posts are included for friends. Test covers each visibility tier.
- **Gate-G-MODERATION-RESPECTED.** Posts with `moderation_status = 'hidden'` or `'removed'` are excluded. Hidden moderation status applies to friend posts too.
- **Gate-G-24-HOUR-WINDOW.** Friend posts older than 24h are NOT pinned but ARE eligible for the chronological remainder. Test creates a friend post at 25h ago, asserts it appears in chronological position, not pinned.
- **Gate-G-NO-SELF-PINNING.** The viewer's own posts are NOT pinned even though the viewer might consider themselves their own friend. Test asserts.
- **Gate-G-ANONYMOUS-CHIP-RESPECTED.** Anonymous friend posts show the chip but display author as "Someone." Test asserts both UI elements present.
- **Gate-G-CHIP-VISUAL-ONLY.** The `FromFriendChip` is NOT a link, NOT a button, NOT interactive beyond standard ARIA. Test asserts no `role="button"`, no `href`, no `onClick`.
- **Gate-G-PAGE-1-ONLY-PINNING.** Page 2+ has no friend pinning. Test fetches page 1 (pins appear) and page 2 (no pins, chronological only).
- **Gate-G-ACTIVE-RELATIONSHIPS-ONLY.** Friend relationships with `status = 'blocked'` are excluded. Test toggles status and asserts the post is no longer pinned.
- **Gate-G-NO-NEW-ENDPOINT.** No new HTTP endpoint introduced. The existing feed endpoint returns the enhanced response. Verified by checking PostController diff.
- **Gate-G-NO-QUICK-LIFT-EXCLUSION.** Per MPD-6 + R4 default, friend posts the viewer has Quick Lifted are STILL pinned. Test creates a friend post, viewer Quick Lifts it, viewer re-loads feed, asserts the post is still in position 0.
- **Gate-G-CHIP-ON-OWN-FEED-VIEWS.** PrayerCard's chip render condition is purely `prayer.isFromFriend === true`, regardless of which Prayer Wall surface rendered it. Test asserts the chip shows on PrayerWall main feed, Dashboard (if R6 applies), Profile (probably not relevant since profile is one author's own posts), etc.

---

## Section 3 — Tests

Stub minimum is 12. Realistic count is 16-22. Sketch:

**Backend — PostService.listPosts enhancement (6–8 tests):**
- 3-pin max (Gate-G-MAX-THREE-PINS)
- No-duplication (Gate-G-NO-DUPLICATION)
- Empty-friends → pure chronological (Gate-G-EMPTY-FRIENDS-NO-PINS)
- Unauthenticated → pure chronological (Gate-G-UNAUTHENTICATED-NO-PINS)
- Visibility tier respected for friend-only and private posts (Gate-G-VISIBILITY-RESPECTED)
- Moderation respected (Gate-G-MODERATION-RESPECTED)
- 24h window (Gate-G-24-HOUR-WINDOW)
- Self-posts not pinned (Gate-G-NO-SELF-PINNING)

**Backend — Friend-id lookup integration with FriendPrayersService (2–3 tests):**
- New method (or reused method) returns correct friend IDs for active relationships
- Blocked relationships excluded (Gate-G-ACTIVE-RELATIONSHIPS-ONLY)
- Returns empty list when no active friends

**Backend — DTO mapping (1–2 tests):**
- `isFromFriend = true` for posts in the pinned set
- `isFromFriend = false` for posts in the chronological remainder
- `PostMapper.toDto` correctly populates the field for both authenticated and unauthenticated viewers

**Frontend — PrayerCard chip rendering (2–3 tests):**
- Chip renders when `prayer.isFromFriend === true` (Gate-G-CHIP-VISUAL-ONLY)
- Chip does NOT render when `prayer.isFromFriend === false`
- Chip is positioned correctly in the badge row alongside other chips
- Anonymous friend post still shows chip (Gate-G-ANONYMOUS-CHIP-RESPECTED)

**Frontend — PrayerWall integration (2–3 tests):**
- Authenticated user with friends sees pinned posts at top of feed
- Authenticated user without friends sees no pinning
- Unauthenticated user sees no pinning
- Page 2 loaded explicitly: no chip on the chronologically-ordered remainder (Gate-G-PAGE-1-ONLY-PINNING)

**Optional integration / e2e (2 tests):**
- End-to-end: log in, add a friend, friend posts, refresh feed, see pin at position 0 with chip
- Quick Lift a pinned friend post, refresh feed, post still pinned per MPD-6 + Gate-G-NO-QUICK-LIFT-EXCLUSION

Total: ~16–22 tests. Comfortably above the 12 minimum.

---

## Section 4 — Anti-Pressure + Privacy Decisions

- The pin is informational, not engagement-bait. Chip is muted, non-interactive, doesn't say "Pray now!" or imply urgency.
- Maximum 3 pins. No "you have 47 friends with new posts" counter. Bounded scope.
- The chip's copy "From a friend" respects the viewer's relationship knowledge but does NOT name the friend. The post's author display + anonymous toggle remain authoritative; the chip doesn't override.
- Friend pinning does NOT trigger notifications. The surface is opt-in by virtue of opening the feed.
- Per Gate-G-MH-OMISSION HARD (from 7.5 context): Mental Health prayers from friends pin normally. The "From a friend" chip is not weighted differently for Mental Health vs. other categories. Pinning is presence-based.
- Crisis-flagged posts from friends pin per default visibility predicates. The crisis-resources banner UI applies to friend posts the same as any other.
- Per anti-pressure: pinning is NOT a "leaderboard of who's praying." A user with very active friends sees more pins; a user with quieter friends sees fewer. The surface respects the user's actual social graph, not a curated leaderboard.
- No analytics on "friend post pins clicked." Same anti-pressure ethos as 7.4 + 7.5.
- The chip is a *cue*, not a *call*. It tells the viewer "you know this person"; it doesn't demand interaction.

---

## Section 5 — Deferred / Out of Scope

- **Friend post sorting beyond chronological.** No "best friend" weighting, no engagement-score sorting. Most recent first within the pinned set.
- **Friend mute mechanism.** A future spec could add "don't pin Bob's posts" via the existing `user_mutes` table. 7.6 ignores mutes for pinning (or honors them — plan-recon decides).
- **Pin on Answered Wall or Dashboard.** Per R6 default, main feed only.
- **Pin on category-filtered feed.** If the user filters by `?category=health`, should pins still apply? Plan-recon should consider; default is YES, pins are friend-based regardless of category filter.
- **Pin metadata in API response (which friend, when posted, etc).** Just `isFromFriend: true/false` per AC. No `friendId`, no `pinReason` etc.
- **Real-time pin updates.** If a friend posts while the viewer is on the feed, the new pin doesn't auto-appear. Refresh required. Future spec could add SSE or polling.
- **"You have 5 friends with new posts" indicator.** Out of scope. The surface is the post itself, not a counter.
- **Friend group / circle support.** Out of scope. Single friend-relationships graph.
- **Pin priority ordering across multiple friends.** All pinned friend posts at positions 0-2 are equal-status. Most-recent timestamp orders within the pin set, but no relationship-weighted ordering.
- **`useNotifications` mock-data flake, Bible data layer consolidation, framework majors, X-RateLimit-* standardization, presence WARN log noise, composer draft preservation on counselor-page navigation.** All still parked.
- **7.7 (Privacy Tiers) coordination.** 7.6 assumes visibility is active (per recon). If 7.7 changes the predicate, 7.6 may need an update. Plan-recon confirms 7.7 doesn't change the existing predicate's semantics.

---

## Pipeline Notes

- **`/playwright-recon` (optional):** Capture current Prayer Wall feed at desktop/mobile to set baseline. The friend-pin behavior changes the feed's visual rhythm at position 0-2.
- **`/spec-forums`:** Produces the actual spec file at `_specs/forums/spec-7-6.md` from this brief.
- **`/plan-forums`:** Resolves R1–R8. R3 (reuse FriendPrayersService vs new service) and R4 (Quick Lift exclusion semantics) are the most load-bearing. R5 (anonymous friend posts) is a privacy edge case worth confirming with Eric.
- **`/execute-plan-forums`:** Modify PostService.listPosts, add isFromFriend to PostResponse, create FromFriendChip component, integrate into PrayerCard. Pre-execution uncommitted-files check.
- **`/code-review`:** Standard pass. Specifically check Gate-G-NO-DUPLICATION, Gate-G-VISIBILITY-RESPECTED, Gate-G-NO-NEW-ENDPOINT, Gate-G-CHIP-VISUAL-ONLY.
- **`/verify-with-playwright`:** Visual verification of pins appearing on /prayer-wall, chip rendering, no chip on chronological remainder.
- **Eric commits manually** when satisfied.

---

## See Also

- `_forums_master_plan/round3-master-plan.md` Spec 7.6 stub (master plan lines 6468–6490)
- `backend/src/main/java/com/worshiproom/post/PostService.java:120` — the feed query method to enhance
- `backend/src/main/java/com/worshiproom/post/PostService.java:170,725-729` — existing visibility predicate + PostVisibility enum
- `backend/src/main/java/com/worshiproom/post/FriendPrayersService.java` — **reuse target** from 7.4 (just shipped)
- `backend/src/main/java/com/worshiproom/post/PostSpecifications.java:40-53` — visibility predicate JavaDoc (now confirmed active)
- `backend/src/main/java/com/worshiproom/post/dto/PostResponse.java` — DTO to extend with `isFromFriend`
- `backend/src/main/java/com/worshiproom/post/PostMapper.java` — likely DTO mapping location (plan-recon verifies)
- `frontend/src/components/prayer-wall/PrayerCard.tsx:17-19,271-275` — existing chip/badge patterns to mirror
- `frontend/src/components/prayer-wall/CategoryBadge.tsx`, `QotdBadge.tsx` — chip pattern examples
- `_plans/forums/spec-7-4-brief.md` — sibling brief; 7.4 introduced `FriendPrayersService` which 7.6 reuses
- `_plans/forums/spec-7-1-brief.md`, `_plans/forums/spec-7-2-brief.md`, `_plans/forums/spec-7-3-brief.md`, `_plans/forums/spec-7-5-brief.md` — sibling briefs
- Spec 7.7 — Privacy Tiers (cross-reference; 7.6 assumes visibility is active)
- Spec 6.6b — Mental Health omission (applies to chip display of Mental Health friend posts)
- Spec 4.6 — anonymous-author affordances (Gate-G-ANONYMOUS-CHIP-RESPECTED relies on this)
- Spec 2.5.x — friend relationships shipping wave (the table 7.6 depends on)
