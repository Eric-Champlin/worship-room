# Forums Wave: Spec 3.6 — Comments Write Endpoints

**Master Plan Reference:** `_forums_master_plan/round3-master-plan.md` → Spec 3.6 (body at lines 3785-3808; Phase 3.6 Addendum lines 3806-3808)
**ID:** `round3-phase03-spec06-comments-write-endpoints`
**Branch:** `forums-wave-continued` (long-lived; do NOT create a new branch, do NOT checkout, do NOT commit/push)
**Date:** 2026-04-28

---

## Affected Frontend Routes

N/A — backend-only spec for the new endpoints. The frontend INTERCESSION wiring shipped in this spec touches three constants/types files only (`frontend/src/constants/dashboard/activity-points.ts`, `frontend/src/types/dashboard.ts`, `frontend/src/services/faith-points-storage.ts`) — no UI routes change. The actual user-facing wiring for the new POST/PATCH/DELETE comment endpoints is owned by Spec 3.10 (Frontend Service API Implementations); the dual-write flag flips in Spec 3.12 (Phase 3 Cutover). `/verify-with-playwright` should be SKIPPED for this spec per the Forums Wave Workflow.

---

## STAY ON BRANCH

Same as the rest of the wave. Stay on `forums-wave-continued`. No `git checkout`, `git branch`, `git commit`, `git push`, `git stash`, `git reset`. Eric handles git manually.

---

# Spec 3.6 — Comments Write Endpoints (Brief)

**Spec ID:** `round3-phase03-spec06-comments-write-endpoints`
**Master Plan body:** `_forums_master_plan/round3-master-plan.md` lines 3785-3808 (Spec 3.6) + addendum lines 3806-3808
**Size:** L
**Risk:** **High** — user-generated text, crisis-detection bearing, security-sensitive (parent-post visibility, ownership, auth gating)
**Prerequisites:** Spec 3.5 (Posts Write Endpoints) committed and shipped — `PostCrisisDetector`, `CrisisAlertService`, `CrisisDetectedEvent`, `CrisisDetectedEventListener`, `CrisisResources`, `PostsRateLimitConfig`, `PostsIdempotencyService`, OWASP HTML Sanitizer dependency, SecurityConfig method-specific auth rules, `PostExceptionHandler` rate-limit handler all present.
**Tier policy:** **MAX throughout** (spec → plan → execute → review). Reasoning: same silent-safety-failure surface as Spec 3.5 (crisis detection, content-to-Sentry leak risk, anonymous slip-through, AFTER_COMMIT-vs-async, keyword drift) on a different surface. Pattern-application risk is real even when the underlying patterns are correct.

## Goal

Implement three new endpoints:

- `POST /api/v1/posts/{postId}/comments` — create a comment (or threaded reply) on a parent post.
- `PATCH /api/v1/comments/{id}` — update a comment's content (5-minute edit window, content-only).
- `DELETE /api/v1/comments/{id}` — soft-delete a comment.

All three are author-ownership-gated, JWT-authenticated, rate-limited, crisis-detection-bearing, and OWASP-sanitized. The schema (`post_comments` table, columns including `parent_comment_id` and `crisis_flag`) is already in place from Spec 3.1's changeset 015. The read-side (`GET /api/v1/posts/{id}/comments`) is already shipped from Spec 3.4 — `PostCommentService.listForPost`, `PostCommentMapper`, `CommentDto`, `CommentListResponse`. This spec extends `PostCommentService` with `createComment`, `updateComment`, `deleteComment` and adds a new controller surface.

## Approach

Pattern-match heavily against Spec 3.5 (`PostService` write methods + supporting infrastructure). The architectural shapes are identical:

- **Crisis detection:** `CommentCrisisDetector` mirroring `PostCrisisDetector` exactly (same 12-keyword list, same `detectsCrisis(String)` signature, public class in `com.worshiproom.safety`). Parity test against `PostCrisisDetector` AND the three existing detectors AND the frontend.
- **Rate limiting:** `CommentsRateLimitService` mirroring `PostsRateLimitService` — Caffeine + bucket4j, but bucket strategy is `Refill.intervally(30, Duration.ofHours(1))`. Per-user keying. Bounded cache (10k entries, expireAfterAccess(2h) — slightly longer than the refill window so an active bucket isn't evicted prematurely).
- **Idempotency:** `CommentsIdempotencyService` mirroring `PostsIdempotencyService` — per-(userId, idempotencyKey) cache, body hash via record `hashCode()`, 24h TTL, 422 on body mismatch.
- **Crisis event reuse:** Generalize the existing `CrisisDetectedEvent(UUID postId, UUID authorId)` to `CrisisDetectedEvent(UUID contentId, UUID authorId, ContentType type)` where `ContentType` is a small enum `{POST, COMMENT}`. Listener dedup keys by `contentId` (which can be either a postId or commentId — UUIDs are globally unique so collision-free). This means a user who triggers crisis on both a post AND a comment within 1 hour gets two alerts (one per content), which is correct — they're separate pieces of content. Update `CrisisAlertService.alert(UUID contentId, UUID authorId, ContentType type)` to set the appropriate Sentry tag (`event_type=crisis_keyword_match`, `content_type=post|comment`, `content_id=<UUID>`, `user_id=<UUID>` — never content text). Update Spec 3.5's call site accordingly. Update tests.
- **Activity engine:** Use `ActivityType.INTERCESSION` (NEW — see Divergence 3) with `sourceFeature: "prayer-wall-comment"`.
- **OWASP HTML Sanitizer:** Already on classpath from 3.5. Reuse same `htmlSanitizerPolicy` bean (extract to a shared `@Configuration` class if not already done) — sanitize comment `content` before persist.
- **Edit window:** Configurable via `worshiproom.comments.edit-window-minutes=5` (mirrors `worshiproom.posts.edit-window-minutes`). NO exempt fields (Comments don't have `is_answered` or analogous moderator-meta).
- **Soft-delete pattern:** Same as Posts — `is_deleted=true`, `deleted_at=NOW()`, `updated_at=NOW()`. Content stays. user_id stays. Replies stay (no cascade).
- **Counter and timestamp denormalization:** `posts.comment_count` and `posts.last_activity_at` update transactionally with the comment insert. Use SQL-side update (`UPDATE posts SET comment_count = comment_count + 1, last_activity_at = NOW() WHERE id = ?`) to avoid Java-side lost-update races under concurrent comment creation.
- **Author edit on already-flagged comment:** Same as Posts — content edit re-runs detector; if newly detected, fires event (listener dedups across the 1h window). If previously flagged but new content is clean, flag stays true (only moderator clears, not author).

## Acceptance Criteria

From master plan body (lines 3795-3804):

- [ ] Create comment increments parent post's `comment_count`
- [ ] Create comment updates parent post's `last_activity_at`
- [ ] Crisis detection runs on every comment (create AND content-edit paths)
- [ ] Rate limit enforced (30/hour per user)
- [ ] Threaded replies accepted via `parentCommentId` body field
- [ ] 5-minute edit window from `created_at`
- [ ] Soft delete (sets `is_deleted=true`, `deleted_at=NOW()`, `updated_at=NOW()`)
- [ ] At least 25 integration tests

Add (recon-driven, not in master plan):

- [ ] Anonymous POST/PATCH/DELETE on comments paths return 401 (SecurityConfig method-specific rules added)
- [ ] PATCH on comment older than edit window returns 409 EDIT_WINDOW_EXPIRED with friendly message
- [ ] DELETE is idempotent (second DELETE on already-soft-deleted returns 204)
- [ ] DELETE on a comment not owned by requester (and requester is not admin) returns 404 (privacy parity with Spec 3.5's resolved Option A — actually, **Eric's call: 403 (Spec 3.5 chose this) or 404 (privacy-preserving)? See Divergence 8**)
- [ ] Crisis-flagged comment is STILL CREATED with `crisisResources` block in 201 response (block-on-flag is harmful)
- [ ] Activity engine fires INTERCESSION inside same `@Transactional` boundary as the insert
- [ ] Sentry alert fires AFTER_COMMIT only (no alert on rolled-back inserts), tagged with `content_type=comment`, IDs only
- [ ] `parentCommentId` (when provided) must reference a live comment that belongs to the same parent post — service-layer existence + ownership check, not FK alone
- [ ] Comment creation on a soft-deleted parent post returns 404 (the post is "not found" for write purposes)

## Divergences from Master Plan

These are explicit decisions where the spec departs from a literal reading of the master plan. CC must preserve every one of these through spec → plan → execute. Skipping or "simplifying" any of these is a planning bug.

### D1. Edit window error code is **409**, not 400

The Phase 3.6 Addendum (master plan line 3806) specifies "returns `400 EDIT_WINDOW_EXPIRED`". This contradicts Spec 3.5's already-shipped behavior, which uses **409 CONFLICT** for `EDIT_WINDOW_EXPIRED` on posts. Within-codebase consistency wins — comments use 409 too. Same `EditWindowExpiredException` type can be promoted to a shared/parent exception, OR a new `CommentEditWindowExpiredException` mirrors the shape. CC's recon should propose the cleaner refactor.

**Why:** API consistency for clients consuming both endpoints. A frontend that handles `EDIT_WINDOW_EXPIRED` should not need branching on HTTP status by content type.

### D2. Endpoint paths: POST nested, PATCH/DELETE non-nested

The master plan body uses `PATCH/DELETE /api/v1/comments/{id}` (non-nested). The addendum uses nested `PATCH /api/v1/posts/{post_id}/comments/{comment_id}`. Resolve to:

- `POST /api/v1/posts/{postId}/comments` — nested (creating sub-resource)
- `PATCH /api/v1/comments/{id}` — non-nested (resource uniquely identified by UUID)
- `DELETE /api/v1/comments/{id}` — non-nested

**Why:** REST convention (resources with unique IDs use flat paths for individual ops); parity with Spec 3.5's `PATCH /api/v1/posts/{id}` and `DELETE /api/v1/posts/{id}` (also non-nested); the addendum's nested PATCH path adds redundant info that doesn't authenticate anything (the comment ID alone determines ownership and the parent post).

### D3. `INTERCESSION` is added as a new ActivityType (the 13th)

Master plan body says comments fire "intercession activity type, smaller point value than posting." Recon confirms `INTERCESSION` does not exist in `ActivityType` enum (has 12 entries, latest verified). Add it.

**Backend changes:**
- Add `INTERCESSION("intercession")` to `com.worshiproom.activity.ActivityType` enum.

**Frontend changes (this spec, NOT deferred):**
- Add `intercession: 10` to `frontend/src/constants/dashboard/activity-points.ts` `ACTIVITY_POINTS`.
- Add `intercession: 'Interceded'` to `ACTIVITY_DISPLAY_NAMES`.
- Add `intercession: 'Pray for someone (comment)'` to `ACTIVITY_CHECKLIST_NAMES`.
- Add `'intercession'` to `ALL_ACTIVITY_TYPES`.
- Update `MAX_DAILY_BASE_POINTS` from 155 to 165 and `MAX_DAILY_POINTS` from 310 to 330.
- Add `intercession: false` to the default `DailyActivities` shape and to anywhere DailyActivities defaults are constructed (recon `freshDailyActivities()` in `services/faith-points-storage.ts`).
- Update the `ActivityType` union in `frontend/src/types/dashboard.ts` to include `'intercession'`.
- Update Spec 2.7's dual-write parity test (if it asserts a count) from 12 → 13.

**Point value: 10.** Smaller than `prayerWall=15` per master plan. Aligns with `pray=10`, `listen=10`, `reflection=10`, `localVisit=10`, `devotional=10` — all "low-intensity participation" tier.

**Followup:** None — INTERCESSION ships fully wired in this spec. No backend-frontend skew. **Eric: confirm point value (10) before CC writes the spec.** If you want a different value, set it now.

### D4. Crisis detection: keyword-only (NO LLM classifier)

Inherits Spec 3.5 D1 reasoning verbatim. `CommentCrisisDetector` mirrors `PostCrisisDetector` — same 12 keywords, same case-insensitive substring match, public class in `com.worshiproom.safety`. Followup tracks the LLM-classifier upgrade (already item #15 in `_plans/post-1.10-followups.md` from Spec 3.5; extend the followup to mention comments too rather than adding a new entry).

### D5. Crisis alerting: Sentry + DB flag (NO email)

Inherits Spec 3.5 D2 reasoning verbatim. SMTP still blocked on domain purchase. The existing `CrisisAlertService` is reused (extended to take `ContentType`). Followup: extend item #16 in followups file to mention comments — the SMTP wiring will cover both posts and comments when it lands.

### D6. Soft-delete preserves content; no `'[deleted]'` replacement

Inherits Spec 3.5 D6. `is_deleted=true`, content stays, `user_id` stays. Account-deletion content replacement is Spec 10.11's concern.

### D7. No `is_anonymous` for comments

Recon confirms `PostComment` entity has NO `is_anonymous` column. Posts had it; comments don't. This means:
- `CreateCommentRequest` DTO has no `isAnonymous` field.
- Commenter identity is always visible in `CommentDto.userId`.
- No "anonymous comment" feature in this spec or the wave.

If a future spec wants anonymous comments, it ships a Liquibase changeset adding the column + DTO field + tests. Not Spec 3.6's concern.

### D8. **Authorization for already-soft-deleted-not-owned: 403 (matching Spec 3.5)**

For `DELETE /api/v1/comments/{id}` where the comment is already soft-deleted and the requester is not the author and not admin: return **403 FORBIDDEN**, matching Spec 3.5's resolved choice (Option A from the 3.5 plan review). UUIDs aren't enumerable, so the privacy-leak concern is theoretical; UX upside (telling a legitimate user "this isn't yours") is real. Same trade-off Eric chose for Posts; preserve it for Comments.

### D9. `comment_count` decrements on comment soft-delete

Master plan acceptance criterion says creation increments `comment_count`. Symmetric question (not in master plan): does soft-delete decrement? **Yes.** The denormalized counter must reflect what a viewer sees in `GET /api/v1/posts/{id}/comments` (which filters out `is_deleted=true`). If create increments and delete doesn't decrement, the displayed count drifts upward. Decrement on soft-delete inside the same `@Transactional`. Use SQL-side `UPDATE posts SET comment_count = comment_count - 1 WHERE id = ? AND comment_count > 0` (the `> 0` guard prevents negative counters under any race condition).

### D10. Idempotency-Key support on POST (mirroring Spec 3.5)

Master plan does not specify idempotency. Add it anyway, mirroring Spec 3.5's pattern. Comments suffer the same network-retry duplication as posts — if a user double-taps "Send" or the network drops the response on the first try, idempotency prevents duplicates. `Idempotency-Key` header optional (no header = no caching, just runs the create flow). Same per-(userId, key) cache, same body-hash mismatch → 422 IDEMPOTENCY_KEY_MISMATCH, same 24h TTL, same 10k bounded size.

### D11. `parent_comment_id` validation: same parent post + live comment

`POST /api/v1/posts/{postId}/comments` accepts optional `parentCommentId`. If provided, validate at service-layer (NOT FK alone):
- The referenced comment exists and is NOT soft-deleted.
- The referenced comment's `post_id` equals the URL path's `{postId}`.
- If either fails, return 400 INVALID_INPUT with code `INVALID_PARENT_COMMENT`.

**Why:** FK alone allows a malicious or buggy client to thread a comment under a parent that lives on a different post (creating cross-post phantom threads). Service-layer check enforces the invariant.

**Depth limit:** None in this spec (master plan defers nesting depth to Phase 4). Recon should confirm there's no existing constraint to break.

### D12. `is_helpful` is NOT editable via this spec

Existing `PostComment.is_helpful` boolean stays read-only via this spec's PATCH endpoint. Master plan body says PATCH allows "content only." `is_helpful` is owned by a future surface (post author marking a comment helpful, or moderator-side action). If `UpdateCommentRequest` DTO has `isHelpful`, JsonIgnoreProperties drops it (per Spec 3.5's deviation #1) — same followup item #18 covers the strict-rejection hardening.

## Watch-Fors (Inherited + New)

### Inherited from Spec 3.5 (apply identically to comments)

1. **Crisis flag does NOT block creation.** Flagged comment is still saved. `crisisResources` block in 201 response. Block-on-flag is harmful to the very users we're trying to support.
2. **No content in Sentry tags or messages.** `CrisisAlertService.alert(...)` must accept IDs and a `ContentType` enum — never a `String content`. Sentry message string is short and content-free.
3. **AFTER_COMMIT for crisis event publish.** `@TransactionalEventListener(phase = AFTER_COMMIT)`. Never `@Async`. Never `BEFORE_COMMIT`.
4. **Activity engine inside same `@Transactional` as the insert.** No separate transaction. Atomic comment + activity_log row.
5. **Bounded caches everywhere.** `CommentsRateLimitService` bucket map, `CommentsIdempotencyService` cache, listener dedup cache. All Caffeine, all explicit `maximumSize(N)`.
6. **Rate limit fires BEFORE DB insert.** `commentsRateLimitService.checkAndConsume(authorId)` is flow step 3. If rate limit throws, no insert, no activity, no event.
7. **OWASP sanitization on `content`.** Comment content is plain-text only. Sanitize before persist; if post-sanitization is empty/blank, return 400 EMPTY_CONTENT.
8. **`@RestControllerAdvice` scoped to `com.worshiproom.post.comment`** (or wherever `CommentExceptionHandler` lives). Don't catch exceptions from non-comment controllers.
9. **SecurityConfig method-specific rules above OPTIONAL_AUTH_PATTERNS.** Same gotcha Spec 3.5 caught: `/api/v1/posts/*` and `/api/v1/comments/*` patterns in OPTIONAL_AUTH_PATTERNS match for any method. Anonymous POST/PATCH/DELETE on comments paths must route to `authenticated()` BEFORE the path-only permitAll rules. Add three new `requestMatchers(HttpMethod.X, ...)` rules for comments paths.
10. **L1-cache trap (Spec 3.5 blocker recurrence).** `PostComment` entity has `created_at` and `updated_at` with `insertable=false, updatable=false`. After `save()` + `flush()`, the managed entity in the persistence context still has `null` timestamps. `findById` returns the same managed entity (cached). Use `entityManager.refresh(savedComment)` to re-fetch from DB before mapping to DTO. Add an integration test asserting `$.data.createdAt` and `$.data.updatedAt` are present in the create response — same regression guard 3.5 should have had from day one.
11. **Plain text only.** No HTML, no Markdown rendering on the read side (3.4 already enforces this). Sanitization is belt-and-suspenders.
12. **`PATCH` on already-soft-deleted comment returns 404.** Don't allow editing a soft-deleted comment, ever (per author OR admin). Soft-delete is terminal for the edit lifecycle.

### New to Spec 3.6

13. **`comment_count` and `last_activity_at` updates use SQL-side increments.** `UPDATE posts SET comment_count = comment_count + 1, last_activity_at = NOW() WHERE id = ?`. NOT load-modify-save in Java. Concurrent comment creation under load would lose updates with Java-side increment.
14. **Decrement `comment_count` on soft-delete with `> 0` guard.** `UPDATE posts SET comment_count = comment_count - 1 WHERE id = ? AND comment_count > 0`. Prevents negative counter under any race or buggy double-delete.
15. **DO NOT bump `last_activity_at` on PATCH or DELETE.** Only the create path updates it. Edits and deletes are author-side intent, not engagement signal. (Same rule Spec 3.5 had for posts.)
16. **`parent_comment_id` cross-post check.** Service-layer assertion that `parentComment.postId == url.postId`. Test case explicitly: post A has comment C1; client tries to create reply on post B with `parentCommentId=C1.id` — must return 400.
17. **Comment creation on soft-deleted post returns 404.** Look up parent post via a finder that treats `is_deleted=true` as "not found." Reuse `PostRepository.findByIdAndIsDeletedFalse(UUID)` (added in Spec 3.5).
18. **Crisis detector parity test extended.** `PostCrisisDetectorParityTest` (or a new `CommentCrisisDetectorParityTest`) asserts `CommentCrisisDetector.SELF_HARM_KEYWORDS` is `containsExactlyElementsOf` `PostCrisisDetector.SELF_HARM_KEYWORDS`. Drift between post and comment detectors is the kind of bug that ships silently.
19. **`CrisisDetectedEvent` shape change is a breaking refactor of Spec 3.5 code.** Generalizing `postId` to `contentId` + adding `ContentType` requires updating Spec 3.5's `PostService.createPost`, `PostService.updatePost`, `CrisisDetectedEventListener`, `CrisisAlertService`, and all corresponding tests. The change is mechanical but touches ~7 files. Plan must include this refactor explicitly.
20. **`INTERCESSION` parity test will fail without frontend update.** Spec 2.7's dual-write parity test (if it counts ActivityType entries) will break the moment INTERCESSION is added to backend. The frontend update in Divergence 3 must ship in the same commit/spec — not deferred. Watch the test count assertion specifically.
21. **Don't conflate `parentCommentId` with `postId`.** They're separate concerns on the same row. `postId` = which post this comment belongs to. `parentCommentId` = which comment this is replying to (null = top-level). The composite invariant `parentComment.postId == this.postId` is what D11 enforces.
22. **Comment delete does NOT cascade to replies.** Replies stay alive with `parent_comment_id` pointing at a soft-deleted comment. The read endpoint already filters soft-deleted from the response (Spec 3.4). Phase 10 moderation may revisit; out of scope here.
23. **Author edits do not un-flag `crisis_flag`.** Once flagged, stays flagged until moderator clears. Same rule as Posts.
24. **Soft-deleted comments' replies remain visible in 3.4 read endpoint.** This is correct behavior — deleting your top-level comment doesn't silence the discussion under it. Don't try to hide the thread on soft-delete.
25. **`UpdateCommentRequest` rejects `parentCommentId`** — threading is set at creation, immutable thereafter. Same shape as `is_anonymous` immutability for posts.
26. **Auth gate via `@AuthenticationPrincipal AuthenticatedUser principal`.** `principal.userId()` and `principal.isAdmin()` are the authorization facts. Don't introduce a new "moderator" trust-level concept — defer to Phase 10 moderation queue spec.

## Pattern Reuse Map (from Spec 3.5)

| 3.5 component | 3.6 use |
|---|---|
| `PostCrisisDetector` | Mirror as `CommentCrisisDetector` (same package, same shape, same keywords). Parity test against the post detector. |
| `CrisisDetectedEvent` | **Refactor in place** to `(UUID contentId, UUID authorId, ContentType type)`. Update post call sites. |
| `CrisisAlertService` | Refactor signature to `alert(UUID contentId, UUID authorId, ContentType type)`. Sentry tags now include `content_type`. |
| `CrisisDetectedEventListener` | Listener key changes from `event.postId()` to `event.contentId()`. Same dedup behavior, just generalized. |
| `CrisisResources`, `CrisisResource`, `CrisisResourcesBlock` | Reuse as-is. Same intro message, same 3 resources. |
| `PostsRateLimitConfig` | Mirror as `CommentsRateLimitConfig` (`worshiproom.comments.*` prefix). Parameters: `max-per-hour=30`, `bucket-cache-size=10000`, `edit-window-minutes=5`, `idempotency.cache-size=10000`. |
| `PostsRateLimitService` | Mirror as `CommentsRateLimitService` with `Refill.intervally(30, Duration.ofHours(1))`. |
| `PostsIdempotencyService` | Mirror as `CommentsIdempotencyService`. |
| `PostsRateLimitException` (with `Retry-After`) | Mirror as `CommentsRateLimitException`. Friendly message: "You're commenting a lot — please wait about N minutes before commenting again." |
| `EditWindowExpiredException` | Reusable as-is. Promote to a shared package if currently in `com.worshiproom.post`, or mirror as `CommentEditWindowExpiredException`. CC's recon decides. |
| `PostForbiddenException`, `PostNotFoundException` | Mirror as `CommentForbiddenException`, `PostCommentNotFoundException`. (Note: `PostCommentNotFoundException` already exists from Spec 3.4 read-side — extend it for write paths.) |
| `IdempotencyKeyMismatchException` | Reusable as-is. |
| OWASP `htmlSanitizerPolicy` bean | Reuse the same configured `PolicyFactory` from Spec 3.5. Extract to a shared `@Configuration` class if Spec 3.5 declared it inline in `PostService`. |
| `SecurityConfig` method-specific rules | Add three new `requestMatchers` for `POST /api/v1/posts/*/comments`, `PATCH /api/v1/comments/*`, `DELETE /api/v1/comments/*` — all `authenticated()` — placed ABOVE OPTIONAL_AUTH_PATTERNS. |
| `PostExceptionHandler` (with `Retry-After` header on 429) | Mirror as `CommentExceptionHandler` package-scoped to `com.worshiproom.post.comment`. Same `PostsRateLimitException` precedence pattern. |
| `PostValidationExceptionHandler` (with `HttpMessageNotReadableException` mapping) | Mirror as `CommentValidationExceptionHandler` for the new comment DTOs. |
| `application.properties` posts properties | Add comments section: `worshiproom.comments.rate-limit.max-per-hour=30`, `worshiproom.comments.rate-limit.bucket-cache-size=10000`, `worshiproom.comments.edit-window-minutes=5`, `worshiproom.comments.idempotency.cache-size=10000`. |

## Recon Items (CC must verify before writing the spec)

CC's recon phase should establish the following ground truths. Each was checked in a one-shot during brief authoring; CC must re-verify because the codebase may have moved.

1. **`ActivityType.INTERCESSION` does NOT exist.** Confirmed via reading `ActivityType.java`. Recon should confirm and then plan its addition + frontend extension.
2. **`PostComment` entity has `crisis_flag`, `is_deleted`, `deleted_at`, `parent_comment_id`, `is_helpful`. NO `is_anonymous`.** Confirmed via reading `PostComment.java`.
3. **`PostComment.created_at` and `updated_at` are `insertable=false, updatable=false`.** Same L1-cache trap as Posts.
4. **`PostCommentService` is read-only (`@Transactional(readOnly=true)` at class level)** — write methods need method-level override.
5. **`PostRepository.findByIdAndIsDeletedFalse` exists** (added by Spec 3.5). Reusable for parent-post existence check.
6. **`CrisisDetectedEvent` currently takes `(UUID postId, UUID authorId)`** — refactor in place.
7. **OWASP HTML Sanitizer dependency on classpath** (Spec 3.5 added it).
8. **`htmlSanitizerPolicy` bean configuration** — recon should locate it. If it's declared inline in `PostService`, extract to a shared `@Configuration` class as part of this spec (small refactor, low risk).
9. **Spec 2.7 dual-write parity test count assertion** — recon should locate the test asserting frontend ↔ backend ActivityType list equality. Currently expects 12; will need to expect 13 after INTERCESSION is added.
10. **Existing `CommentDto` shape** — does it include all fields needed for the create/update response? `id, postId, userId, parentCommentId, content, isHelpful, isDeleted, deletedAt, moderationStatus, crisisFlag, createdAt, updatedAt`. If yes, reuse. If a field is missing for write responses (probably not), extend.
11. **`CreateCommentResponse` shape** — recon should propose. Likely mirrors `CreatePostResponse`: `{ data: CommentDto, crisisResources: CrisisResourcesBlock | null, meta: { requestId } }`. `@JsonInclude(NON_NULL)` to drop `crisisResources` on non-flagged path.
12. **`PostController` ownership of comments routes** — recon must decide whether to add the three new comment routes to `PostController` (since POST is nested under posts) or create a new `CommentController`. Consistency argument: PostController is bloating; a separate `CommentController` for comment routes (including the existing 3.4 GET) is cleaner long-term. Recon decides; the answer affects exception-handler scoping.

## Files (Expected Surface)

**New (production):**
- `backend/src/main/java/com/worshiproom/safety/CommentCrisisDetector.java`
- `backend/src/main/java/com/worshiproom/safety/ContentType.java` (new enum: `POST`, `COMMENT`)
- `backend/src/main/java/com/worshiproom/post/comment/CommentsRateLimitConfig.java`
- `backend/src/main/java/com/worshiproom/post/comment/CommentsRateLimitService.java`
- `backend/src/main/java/com/worshiproom/post/comment/CommentsRateLimitException.java`
- `backend/src/main/java/com/worshiproom/post/comment/CommentsIdempotencyService.java`
- `backend/src/main/java/com/worshiproom/post/comment/CommentForbiddenException.java`
- `backend/src/main/java/com/worshiproom/post/comment/CommentEditWindowExpiredException.java` (or reuse `EditWindowExpiredException`)
- `backend/src/main/java/com/worshiproom/post/comment/InvalidParentCommentException.java`
- `backend/src/main/java/com/worshiproom/post/comment/EmptyCommentContentException.java`
- `backend/src/main/java/com/worshiproom/post/comment/CommentExceptionHandler.java`
- `backend/src/main/java/com/worshiproom/post/comment/CommentValidationExceptionHandler.java`
- `backend/src/main/java/com/worshiproom/post/comment/dto/CreateCommentRequest.java`
- `backend/src/main/java/com/worshiproom/post/comment/dto/UpdateCommentRequest.java`
- `backend/src/main/java/com/worshiproom/post/comment/dto/CreateCommentResponse.java`
- (Possibly) `backend/src/main/java/com/worshiproom/post/comment/CommentController.java` — or extend PostController

**Modified (production):**
- `backend/src/main/java/com/worshiproom/safety/CrisisDetectedEvent.java` — add `ContentType type`
- `backend/src/main/java/com/worshiproom/safety/CrisisAlertService.java` — accept `ContentType`, add Sentry tag
- `backend/src/main/java/com/worshiproom/safety/CrisisDetectedEventListener.java` — dedup key by `contentId`
- `backend/src/main/java/com/worshiproom/post/PostService.java` — update CrisisDetectedEvent calls to pass `ContentType.POST`
- `backend/src/main/java/com/worshiproom/post/comment/PostComment.java` — drop `updatable=false` from `updated_at`; add setters for writable fields (content, is_deleted, deleted_at, crisis_flag, updated_at, etc.)
- `backend/src/main/java/com/worshiproom/post/comment/PostCommentRepository.java` — add `findByIdAndIsDeletedFalse(UUID)` and `findByIdAndIsDeletedTrue(UUID)`
- `backend/src/main/java/com/worshiproom/post/comment/PostCommentService.java` — add `createComment`, `updateComment`, `deleteComment`
- `backend/src/main/java/com/worshiproom/auth/SecurityConfig.java` — three new method-specific `requestMatchers` for comment paths above OPTIONAL_AUTH_PATTERNS
- `backend/src/main/java/com/worshiproom/activity/ActivityType.java` — add `INTERCESSION("intercession")`
- `backend/src/main/resources/application.properties` — comments section (4 keys)
- `backend/src/main/resources/openapi.yaml` — 3 new paths + ~3 new schemas
- `frontend/src/constants/dashboard/activity-points.ts` — INTERCESSION entry
- `frontend/src/types/dashboard.ts` — `ActivityType` union extended
- `frontend/src/services/faith-points-storage.ts` — `freshDailyActivities()` includes `intercession: false`
- `_plans/post-1.10-followups.md` — extend items #15 and #16 to mention comments

**Modified (tests):**
- All Spec 3.5 tests touching `CrisisDetectedEvent`, `CrisisAlertService`, `CrisisDetectedEventListener` — update for new event shape
- Spec 2.7 dual-write parity test — count 12 → 13

## Test Plan

Target ~50 tests total (acceptance criterion was "at least 25 integration tests"; this is 50 across unit + integration to match Spec 3.5's coverage discipline).

**Unit (~20):**
- `CommentCrisisDetectorTest` — 8 (mirror PostCrisisDetectorTest exactly)
- `CommentCrisisDetectorParityTest` — 4 (parity vs. post detector + 3 existing detectors + frontend)
- `CommentsRateLimitServiceTest` — 5 (5/30 in window, 31st fails, retry-after, custom max, message format)
- `CommentsIdempotencyServiceTest` — 3 (hit, mismatch, isolation)
- `CommentsRateLimitExceptionTest` — 4 (formatMessage at boundaries: <60s, minutes, hour, hours)
- `CommentEditWindowTest` — 4 (within window content edit succeeds, after window throws, no exempt fields)
- `CommentServiceWriteTest` — ~10 (rate limit fires before save, crisis detection runs, parent post visibility, parentCommentId cross-post rejection, idempotency cached return, soft-delete decrements counter, etc.)

**Integration (~30):**
- `CommentWriteIntegrationTest extends AbstractIntegrationTest` — full HTTP-level coverage via Testcontainers + MockMvc + JWT
  - POST happy paths (~5): top-level comment, threaded reply, with idempotency key, anonymous-style headers absent, returns Location header
  - POST validation failures (~6): missing content, content >10000 chars (or whatever the limit is — recon), invalid parentCommentId, parent in different post, parent soft-deleted, unknown field
  - POST auth (~2): no JWT 401, invalid JWT 401
  - POST rate limiting (~2): 30 then 31st returns 429 with Retry-After, different users isolated
  - POST crisis (~3): suicide keyword returns 201 with crisisResources block + crisis_flag persisted, normal content omits crisisResources, crisis on threaded reply also fires
  - POST counter & timestamp (~2): comment_count incremented on parent post, last_activity_at bumped on parent post (assert via direct DB query)
  - POST parent-post (~1): creating comment on soft-deleted parent post returns 404
  - PATCH (~3): author within window succeeds, after window 409, non-author 403
  - DELETE (~3): author returns 204 + counter decrements, already-deleted by author returns 204 idempotent, non-author of deleted returns 403
  - L1-cache regression guard (~1): create response includes createdAt/updatedAt (mirrors Spec 3.5's missing assertion)
  - Crisis event AFTER_COMMIT (~1): if comment insert rolls back, no Sentry alert (use a transactional rollback test pattern)

**Refactor parity tests (~5):**
- Spec 3.5's `PostServiceWriteTest.createPost_crisisKeyword_publishesCrisisDetectedEvent` — assert event now carries `ContentType.POST`
- Spec 3.5's `CrisisDetectedEventListenerTest` — update to use new event shape
- Spec 3.5's `CrisisAlertServiceTest` — assert `content_type` Sentry tag is set
- Spec 2.7 parity test — assert ActivityType count is now 13

## Out of Scope

- Threaded reply UI (Phase 4)
- Comment depth limits (Phase 4)
- Moderator/trust-level authorization (Phase 10)
- Email alerts on crisis-flagged comments (deferred — followup #16 extended)
- LLM classifier for comment crisis detection (deferred — followup #15 extended)
- `is_helpful` editing — that's a future "post author marks helpful" or "moderator review" surface
- Anonymous comments (no schema column; future-spec problem)
- `@RequireVerifiedEmail` gate (followup #17 extended; SMTP-blocked)
- Comment idempotency cache atomicity vs. transaction commit (Spec 3.5 followup; same theoretical concern, same defer)
- Frontend wiring for the new endpoints — Spec 3.10 owns

## Strict Rules (DO NOT)

- Do NOT introduce a "moderator" or "trust level" concept. Use `principal.isAdmin()` only.
- Do NOT add `is_anonymous` support to comments. Schema doesn't have it.
- Do NOT cascade-delete replies on parent comment soft-delete. Replies stay alive.
- Do NOT bump `last_activity_at` on PATCH or DELETE. Only on create.
- Do NOT update `comment_count` Java-side. Use SQL-side increment/decrement.
- Do NOT block creation when crisis is flagged. Always create. Always include resources block.
- Do NOT include comment content in Sentry tags or messages.
- Do NOT use `@Async` for the crisis alert. Use `@TransactionalEventListener(phase = AFTER_COMMIT)`.
- Do NOT use `findById` after `flush` to repopulate timestamps. Use `entityManager.refresh(saved)`.
- Do NOT add a depth limit on threaded replies. Phase 4's concern.
- Do NOT treat `parentCommentId` validation as an FK-only concern. Service-layer cross-post check is mandatory.
- Do NOT create a separate idempotency cache per content type if a clean shared `WriteIdempotencyService<TRequest, TResponse>` generic abstraction emerges in recon. But also do NOT spend hours on a generic abstraction if mirroring the existing per-domain service is straightforward — judgment call for recon.
- Do NOT defer the frontend INTERCESSION wiring. It ships in this spec.
- Do NOT defer the `CrisisDetectedEvent` refactor of Spec 3.5 code. It's mechanical and necessary for the listener dedup to work cleanly across both content types.

## Tier Reaffirmation

Run **MAX** through the full pipeline:
- `/spec-forums spec-3-6` (with this brief)
- `/plan-forums` (with the spec output)
- `/execute-plan-forums` (with the plan output)
- `/code-review _plans/forums/2026-XX-XX-spec-3-6.md --spec _specs/forums/spec-3-6.md`

The empirical pass at code-review time is the highest-value MAX placement (per the L1-cache lesson from Spec 3.5).

---

**Eric: one decision to make before pasting this into CC.** Divergence 3 sets INTERCESSION's point value at 10. Confirm or override before CC starts spec authoring. Other knobs (rate limit 30/hour, edit window 5min, idempotency 24h TTL) are master-plan-derived and not knobs to tune unless you have a reason.
