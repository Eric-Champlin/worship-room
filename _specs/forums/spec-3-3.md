# Forums Wave: Spec 3.3 — Posts Read Endpoints (Phase 3 First Read API)

**Master Plan Reference:** `_forums_master_plan/round3-master-plan.md` → Spec 3.3 (body at line 3681; canonical visibility predicate at line 6307–6321 / Spec 7.7)
**ID:** `round3-phase03-spec03-posts-read-endpoints`
**Branch:** `forums-wave-continued` (long-lived; do NOT create a new branch, do NOT checkout, do NOT commit/push)
**Date:** 2026-04-28

---

## Affected Frontend Routes

N/A — backend-only spec. Frontend feed reads stay on mock data (no consumer wired yet — Phase 3.10 wires the consumer). `/verify-with-playwright` should be SKIPPED for this spec per the Forums Wave Workflow.

---

# Spec 3.3: Posts Read Endpoints (Phase 3 First Read API)

**Spec ID:** `round3-phase03-spec03-posts-read-endpoints`
**Branch:** `forums-wave-continued` (Eric's long-lived branch — DO NOT create a new branch, DO NOT checkout, DO NOT commit/push)
**Prereqs:** 3.1 ✅ (six tables exist), 3.2 ✅ (mock seed loaded in dev — gives real rows to query against)
**Size:** L
**Risk:** Medium (visibility predicate is the load-bearing correctness concern; mute filter integration is the second; pagination shape is the third — all three intersect in three endpoints)
**Master Plan Reference:** `_forums_master_plan/round3-master-plan.md` — Spec 3.3 body (line 3681), canonical visibility predicate at line 6307–6321 (Spec 7.7)

---

## STAY ON BRANCH

Same as the rest of the wave. Stay on `forums-wave-continued`. No `git checkout`, `git branch`, `git commit`, `git push`, `git stash`, `git reset`. Eric handles git manually.

---

## Goal

Ship the first three read endpoints for the Prayer Wall backend:

1. **`GET /api/v1/posts`** — paginated feed with filtering and sorting
2. **`GET /api/v1/posts/{id}`** — single post detail (comments are a separate concern; this endpoint returns ONLY post fields, no inlined comments — see Divergence 3)
3. **`GET /api/v1/users/{username}/posts`** — posts authored by a specific user

All three apply the canonical visibility predicate (Phase 7.7's pseudo-SQL block, ported to JPA). Authenticated viewers see public + relevant friends + their own posts (including private). Unauthenticated viewers see only public posts. Muted authors are filtered out via `MuteService.isMuted` integration. Anonymous posts return `displayName: "Anonymous"` and `avatarUrl: null` regardless of viewer.

After this spec ships:

- `com.worshiproom.post` package exists with entity, repository, service, controller, mapper, DTOs, exception advice
- Three read endpoints serve real data from the dev database (the Phase 3.2 seed)
- Visibility predicate is centralized in ONE place (a `PostSpecifications` class or `@Query` fragment) — every post-returning endpoint uses it
- Frontend feed reads stay on mock data (no consumer wired yet — Phase 3.10 wires the consumer)
- No write endpoints (Specs 3.5, 3.6, 3.7, 3.8)
- No comments read (Spec 3.4)

---

## Master Plan Divergence

Five divergences worth flagging upfront.

### Divergence 1: Mute filter integration applied here, NOT deferred

**What the master plan says:** Spec 3.3 body doesn't mention mute filtering. Spec 2.5.7 deferred mute filter integration to "Phase 3 — Spec 3.3 (backend) + 3.10 (frontend)."

**What this brief says:** Mute filtering applies to `GET /api/v1/posts` (feed) and `GET /api/v1/users/{username}/posts` (author posts) — but NOT to `GET /api/v1/posts/{id}` (single post detail). Reasoning:

- **Feed reads:** muted authors' posts are filtered out via `WHERE NOT EXISTS (SELECT 1 FROM user_mutes WHERE muter_id = :viewer_id AND muted_id = posts.user_id)`. This is the canonical mute semantic — "their posts don't appear in your feed."
- **Author-posts reads:** if viewer is requesting `GET /api/v1/users/sarah/posts` and viewer has muted Sarah, return EMPTY array (not 404). Reasoning: returning posts they explicitly muted contradicts the mute contract; returning 404 leaks "Sarah exists" vs "Sarah doesn't exist." Empty array preserves the asymmetric mute semantic — Sarah doesn't know she's muted, viewer just sees no posts. (See Watch-For #2 for an alternative consideration.)
- **Single post detail:** if viewer fetches `GET /api/v1/posts/{specificId}` and the post's author is muted, return the post anyway. Mute filters discovery (feed, author profile), NOT explicit lookup. If the viewer has the post ID, they presumably arrived via a direct link from elsewhere (notification, shared URL) — filtering would silently confuse them. This is consistent with how Twitter/X handles muted users: their tweets don't appear in your timeline, but if you click through to their profile via direct URL, you see the content.

### Divergence 2: `GET /api/v1/posts/{id}` does NOT inline comments

**What the master plan says:** Acceptance criterion line 3707: "GET /api/v1/posts/{id} returns single post with comments inlined."

**What this brief says:** Single-post endpoint returns ONLY post fields. Comments come from `GET /api/v1/posts/{id}/comments` — that endpoint is owned by Spec 3.4 (Engagement Read Endpoints).

**Why:**
- **Separation of concerns:** Comments have their own visibility, soft-delete, moderation, and (in Phase 4) threading semantics. Bundling them into the post-detail response means the post controller must understand comment edge cases (threading, parent-deleted, moderation), which couples Specs 3.3 and 3.4.
- **Cache strategy alignment:** Spec 5.6 (Redis cache) will cache post details and comment lists separately because they invalidate on different events (post edit invalidates post; new comment invalidates only comments). Bundling them creates a single cache key with two invalidation triggers — standard cache-design anti-pattern.
- **Endpoint composability:** Frontend may want a "post-only refresh" (e.g., after marking answered) without re-fetching all comments. Separate endpoints support this naturally.

The frontend feature impact is minimal — the consumer code in Phase 3.10 makes two requests (`/posts/{id}` then `/posts/{id}/comments`) instead of one. The two requests can fire in parallel; total latency is `max(t1, t2)` not `t1 + t2`.

### Divergence 3: Pagination is page/limit, NOT cursor-based

**What the master plan says:** Acceptance criterion line 3700: "Pagination defaults: `page=1`, `limit=20`, `max limit=50`."

**What this brief says:** Following master plan exactly. Page/limit. Query params `?page=N&limit=M`. Response includes `meta.page`, `meta.limit`, `meta.totalCount`, `meta.totalPages`, `meta.hasNextPage`, `meta.hasPrevPage`.

**Why mention this:** Cursor-based pagination is the modern best-practice for feeds (stable under concurrent inserts), and recon may pattern-match against that practice and propose cursor pagination. Master plan's choice is deliberate — page/limit is simpler for the frontend (page numbers are user-visible UX, "Page 2 of 17"), the data volume in a category-filtered feed is bounded enough that page-number drift under concurrent inserts is acceptable, and Phase 11.x search uses page/limit too. Consistency wins.

If recon argues for cursor-based, push back: master plan is explicit. Drift to cursor would also break Phase 7.6 friends-pin-to-top (which composes a "first 3 friend posts + paginated rest" response — page/limit makes the composition trivial).

### Divergence 4: Visibility predicate centralized in `PostSpecifications` class (Spring Data JPA `@Specification` API)

**What the master plan says:** Spec 7.7 line 6324: "This predicate is centralized as a JPA Specification or a `@Query` fragment that every post-returning endpoint uses."

**What this brief says:** Use Spring Data JPA's `Specification<Post>` API to compose the visibility predicate as reusable building blocks. Specifications are composable (`Specification.where(visibilityPredicate(viewerId)).and(categoryFilter(category)).and(notMuted(viewerId))`), testable in isolation, and Spring Data JPA handles the SQL generation.

**Why:** A monolithic `@Query` JPQL fragment with all filters in one string would (a) be 30+ lines and unreadable, (b) require dynamic JPQL composition for the optional filters (category, postType, qotdId), (c) duplicate across the three endpoints with subtle drift risk. Specifications solve all three. Pattern reference: any prior backend code that uses Specifications — recon should grep `com.worshiproom` for existing Specification usage; if none exists, this spec establishes the pattern.

### Divergence 5: Author-posts endpoint uses `username`, not user UUID

**What the master plan says:** Acceptance criterion line 3708: "GET /api/v1/users/{username}/posts returns posts authored by that user."

**What this brief says:** Username-based path lookup. **But usernames don't exist yet** — they ship in Phase 8 (`round3-phase08-spec01-username-system`). For the wave's interim period (Phase 3 through Phase 7), the `{username}` path param actually accepts the user's UUID OR a friendly identifier derived from `users.first_name` + `users.last_name` (kebab-cased and lowercased — e.g., "sarah-johnson"). When Phase 8 ships, the resolver swaps to the new `users.username` column.

**Recon discovery item:** verify whether Phase 8.1 has any preview infrastructure — perhaps a transient column or a derived computed field — that this spec should consume early. If not, the kebab-case derivation is the wave-interim approach, with a clear followup entry in `_plans/post-1.10-followups.md`: "Replace kebab-case username derivation in `UserResolverService` with `users.username` lookup when Phase 8.1 ships."

**Why mention this:** Without the divergence, recon may either (a) assume `users.username` exists and fail at compile-time, or (b) propose a different resolution scheme (UUIDs in the path, `?author=` query param) that drifts from the master plan's contract. The kebab-case fallback honors the master plan's URL shape while staying compatible with current schema.

---

## API Contract

### `GET /api/v1/posts` — Feed

**Auth:** Optional (Bearer JWT or anonymous)

**Query params:**
- `page` (int, default 1, min 1) — page number
- `limit` (int, default 20, max 50, min 1) — page size
- `category` (string, optional) — one of the 10 PRAYER_CATEGORIES; filters to that category only
- `postType` (string, optional) — one of the 5 post_type enum values; filters to that type
- `qotdId` (string, optional) — filters to QOTD-response posts for that question
- `sort` (string, optional, default `'bumped'`) — one of:
  - `'bumped'` → ORDER BY `last_activity_at DESC`
  - `'recent'` → ORDER BY `created_at DESC`
  - `'answered'` → WHERE `is_answered = TRUE` ORDER BY `answered_at DESC`

**Response:** 200 with shape:
```json
{
  "data": [PostDto, PostDto, ...],
  "meta": {
    "page": 1,
    "limit": 20,
    "totalCount": 247,
    "totalPages": 13,
    "hasNextPage": true,
    "hasPrevPage": false,
    "requestId": "..."
  }
}
```

**Empty result:** `data: []` with valid meta, NOT 404.

### `GET /api/v1/posts/{id}` — Single Post Detail

**Auth:** Optional

**Path param:** `id` UUID

**Response:** 200 with `PostDto` body wrapped in `{ data, meta }`. 404 if post doesn't exist OR is soft-deleted OR fails visibility predicate (don't leak existence — see Watch-For #4).

### `GET /api/v1/users/{username}/posts` — Author Posts

**Auth:** Optional

**Path param:** `username` — kebab-case derived identifier OR UUID (per Divergence 5)

**Query params:**
- `page` (int, default 1)
- `limit` (int, default 20, max 50)
- `sort` (default `'recent'` — author profile defaults to chronological, NOT bumped)

**Response:** 200 with paginated `data` and `meta` shape (same as feed). Empty array if user doesn't exist OR viewer has muted them OR their posts all fail visibility predicate. **Don't 404 on missing user** — leaks user existence; consistent with Phase 1's anti-enumeration patterns.

---

## DTO Shape

```java
public record PostDto(
    UUID id,
    String postType,            // 'prayer_request' | 'testimony' | 'question' | 'discussion' | 'encouragement'
    String content,
    String category,            // nullable
    boolean isAnonymous,
    String challengeId,         // nullable
    String qotdId,              // nullable
    String visibility,          // 'public' | 'friends' | 'private'
    boolean isAnswered,
    String answeredText,        // nullable
    OffsetDateTime answeredAt,  // nullable
    String moderationStatus,    // 'approved' | 'flagged' (NEVER 'hidden' or 'removed' — those are filtered out)
    boolean crisisFlag,
    int prayingCount,
    int candleCount,
    int commentCount,
    int bookmarkCount,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt,
    OffsetDateTime lastActivityAt,
    AuthorDto author              // see below; null when isAnonymous=true is HANDLED specially per below
) {}

public record AuthorDto(
    UUID id,                     // null when isAnonymous=true
    String displayName,          // 'Anonymous' when isAnonymous=true
    String avatarUrl             // null when isAnonymous=true
) {}
```

**Anonymous handling (load-bearing):** When `posts.is_anonymous = TRUE`, the mapper returns `AuthorDto(null, "Anonymous", null)` regardless of the underlying `posts.user_id`. The author's real UUID is NEVER leaked to clients — even to the post's author themselves via this endpoint. (Authors who want to verify their own anonymous post can identify it via context — created timestamp, content — without the system breaking the anonymity contract for any client.)

**Fields deliberately excluded from `PostDto`:**
- `is_deleted` and `deleted_at` — filtered at the query layer; soft-deleted posts never reach the mapper
- `report_count` — moderation-internal; not exposed to non-moderators
- `user_id` for non-anonymous posts is exposed via `author.id`; for anonymous posts, NULL out

---

## The Visibility Predicate (Verbatim from Phase 7.7)

```sql
-- Pseudo-SQL canonical fragment from master plan line 6307-6321
WHERE posts.is_deleted = FALSE
  AND posts.moderation_status IN ('approved', 'flagged')  -- 'hidden' and 'removed' invisible to non-moderators
  AND (
    posts.visibility = 'public'
    OR (posts.visibility = 'friends' AND :viewer_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM friend_relationships fr
        WHERE fr.user_id = posts.user_id
          AND fr.friend_user_id = :viewer_id
          AND fr.status = 'active'
    ))
    OR (posts.visibility = 'private' AND posts.user_id = :viewer_id)
    OR posts.user_id = :viewer_id  -- author always sees own posts regardless of visibility
  )
```

Translates to a `Specification<Post>` building block:

```java
public static Specification<Post> visibleTo(@Nullable UUID viewerId) {
    return (root, query, cb) -> {
        // is_deleted = false
        Predicate notDeleted = cb.isFalse(root.get("isDeleted"));

        // moderation_status IN ('approved', 'flagged')
        Predicate moderationVisible = root.get("moderationStatus").in("approved", "flagged");

        // Visibility branch (4 options OR'd)
        Predicate publicPost = cb.equal(root.get("visibility"), "public");

        Predicate friendsPost;
        Predicate privatePost;
        Predicate ownPost;

        if (viewerId == null) {
            // Unauthenticated viewer: only public posts
            friendsPost = cb.disjunction();  // always false
            privatePost = cb.disjunction();
            ownPost = cb.disjunction();
        } else {
            // Authenticated viewer
            // friends: post.visibility='friends' AND EXISTS(friend_relationships row)
            Subquery<Integer> frSubquery = query.subquery(Integer.class);
            Root<FriendRelationship> fr = frSubquery.from(FriendRelationship.class);
            frSubquery.select(cb.literal(1))
                .where(
                    cb.equal(fr.get("userId"), root.get("userId")),
                    cb.equal(fr.get("friendUserId"), viewerId),
                    cb.equal(fr.get("status"), "active")
                );
            friendsPost = cb.and(
                cb.equal(root.get("visibility"), "friends"),
                cb.exists(frSubquery)
            );

            // private: post.visibility='private' AND author_id == viewer_id
            privatePost = cb.and(
                cb.equal(root.get("visibility"), "private"),
                cb.equal(root.get("userId"), viewerId)
            );

            // own: post.user_id == viewer_id (regardless of visibility)
            ownPost = cb.equal(root.get("userId"), viewerId);
        }

        Predicate visibilityClause = cb.or(publicPost, friendsPost, privatePost, ownPost);

        return cb.and(notDeleted, moderationVisible, visibilityClause);
    };
}
```

**This Specification is the load-bearing correctness concern of the spec.** A buggy version leaks private posts to wrong viewers. Recon's first job is verifying the Specification matches the canonical SQL exactly — every branch, every condition. Tests must cover:
- Unauthenticated viewer sees only public posts (no friends/private/own branches active)
- Authenticated viewer sees public posts
- Authenticated viewer sees friends-visibility posts ONLY when an active friend_relationship row connects them to the author
- Authenticated viewer sees private posts ONLY when they're the author
- Authenticated viewer sees their OWN posts regardless of visibility setting
- Soft-deleted posts never appear (any viewer)
- `moderation_status='hidden'` posts never appear (non-moderators; moderator-view is a Phase 10 concern)
- `moderation_status='removed'` posts never appear (any viewer)
- `moderation_status='flagged'` posts DO appear (transparency; Phase 10 may add a "flagged" badge in the UI later)

### Mute Filter (Phase 3 Integration of Spec 2.5.7)

Composes with the visibility predicate for `GET /api/v1/posts` (feed) and `GET /api/v1/users/{username}/posts` (author):

```java
public static Specification<Post> notMutedBy(@Nullable UUID viewerId) {
    if (viewerId == null) {
        return (root, query, cb) -> cb.conjunction();  // always true
    }
    return (root, query, cb) -> {
        Subquery<Integer> muteSubquery = query.subquery(Integer.class);
        Root<UserMute> um = muteSubquery.from(UserMute.class);
        muteSubquery.select(cb.literal(1))
            .where(
                cb.equal(um.get("muterId"), viewerId),
                cb.equal(um.get("mutedId"), root.get("userId"))
            );
        return cb.not(cb.exists(muteSubquery));
    };
}
```

NOT applied to `GET /api/v1/posts/{id}` (single-post detail) per Divergence 1. Tests must cover:
- Authenticated viewer who has muted user X does NOT see X's posts in feed
- Authenticated viewer who has muted user X gets empty array on `GET /api/v1/users/x/posts`
- Authenticated viewer who has muted user X CAN still see X's post via direct `GET /api/v1/posts/{x-post-id}`
- Unauthenticated viewer sees all public posts (mute is per-user; can't mute without auth)

---

## Files to Create

```
backend/src/main/java/com/worshiproom/post/
  Post.java                            (JPA entity)
  PostType.java                        (enum: PRAYER_REQUEST, TESTIMONY, QUESTION, DISCUSSION, ENCOURAGEMENT)
  PostTypeConverter.java
  PostVisibility.java                  (enum: PUBLIC, FRIENDS, PRIVATE)
  PostVisibilityConverter.java
  ModerationStatus.java                (enum: APPROVED, FLAGGED, HIDDEN, REMOVED)
  ModerationStatusConverter.java
  PostRepository.java                  (extends JpaRepository<Post, UUID>, JpaSpecificationExecutor<Post>)
  PostService.java                     (orchestrates Specification composition + repo calls)
  PostController.java
  PostMapper.java                      (Post entity → PostDto with anonymous handling)
  PostSpecifications.java              (visibleTo, notMutedBy, byCategory, byPostType, byQotdId, byAuthor)
  UserResolverService.java             (kebab-case username → UUID resolution per Divergence 5)
  PostNotFoundException.java           (404)
  PostExceptionHandler.java
  PostValidationExceptionHandler.java
  dto/PostDto.java
  dto/AuthorDto.java
  dto/PostListResponse.java            (wraps List<PostDto> + meta)

backend/src/test/java/com/worshiproom/post/
  PostSpecificationsTest.java          (visibility predicate correctness — most critical test class)
  PostServiceTest.java                 (filter composition, sort handling, pagination)
  PostControllerIntegrationTest.java   (end-to-end HTTP, mute integration, anonymous handling)
  PostMapperTest.java                  (entity → DTO; anonymous handling)
  UserResolverServiceTest.java         (kebab-case derivation; UUID fallback)
```

## Files to Modify

```
backend/src/main/resources/openapi.yaml
  — add 3 path entries: GET /api/v1/posts, GET /api/v1/posts/{id}, GET /api/v1/users/{username}/posts
  — add PostDto, AuthorDto, PostListResponse schemas
  — reference shared ProxyResponse and ProxyError
  — lint with npx @redocly/cli lint
```

## Files NOT to Modify

- `frontend/**` — no consumer wired yet; Phase 3.10 owns frontend integration
- `backend/src/main/java/com/worshiproom/auth/PublicPaths.java` — the three endpoints support BOTH anonymous AND authenticated access. The `JwtAuthenticationFilter` should attempt to authenticate if a Bearer token is present, but allow the request through if absent. Recon should verify whether existing `JwtAuthenticationFilter` behavior allows null-principal pass-through for non-PublicPaths URLs, OR whether the post paths need to be added to PublicPaths. (See Watch-For #6.)
- Any Liquibase changeset — schema is finalized in 3.1
- `MuteService.java` (com.worshiproom.mute) — exposes `isMuted` already; this spec just consumes it via Specification subquery, doesn't modify
- `FriendRelationship.java` (com.worshiproom.friends) — used in visibility Specification subquery, not modified
- Any Phase 2.5 service — friends/social/mute domains untouched

## Files to Delete

None.

---

## Acceptance Criteria

### Endpoints exist and return correct shape

- [ ] `GET /api/v1/posts` returns 200 with `{data, meta}` envelope
- [ ] `meta` includes page, limit, totalCount, totalPages, hasNextPage, hasPrevPage, requestId
- [ ] Empty result returns 200 with `data: []`, NOT 404
- [ ] Default pagination is page=1, limit=20
- [ ] `?limit=51` is rejected with 400 INVALID_INPUT (max 50)
- [ ] `?limit=0` is rejected with 400 INVALID_INPUT (min 1)
- [ ] `?page=0` is rejected with 400 INVALID_INPUT (min 1)
- [ ] `GET /api/v1/posts/{id}` returns 200 with PostDto for valid post
- [ ] `GET /api/v1/posts/{id}` returns 404 POST_NOT_FOUND for nonexistent ID
- [ ] `GET /api/v1/posts/{id}` returns 404 POST_NOT_FOUND for soft-deleted post
- [ ] `GET /api/v1/posts/{id}` returns 404 POST_NOT_FOUND when visibility predicate excludes it (don't leak existence)
- [ ] `GET /api/v1/users/{username}/posts` returns 200 with paginated data
- [ ] `GET /api/v1/users/{username}/posts` returns 200 with `data: []` for nonexistent username (don't leak)
- [ ] `GET /api/v1/users/{username}/posts` accepts kebab-case ('sarah-johnson') OR UUID
- [ ] All endpoints work both with and without `Authorization: Bearer ...` header

### Filtering

- [ ] `?category=health` returns only health posts
- [ ] `?category=invalid-value` is rejected with 400 INVALID_INPUT
- [ ] `?postType=prayer_request` returns only prayer_request posts
- [ ] `?postType=invalid` is rejected with 400 INVALID_INPUT
- [ ] `?qotdId=qotd-1` returns only QOTD-response posts for qotd-1
- [ ] Multiple filters compose with AND: `?category=health&postType=prayer_request` returns the intersection

### Sorting

- [ ] `?sort=bumped` (default) sorts by `last_activity_at DESC`
- [ ] `?sort=recent` sorts by `created_at DESC`
- [ ] `?sort=answered` returns ONLY `is_answered=true` posts, sorted by `answered_at DESC`
- [ ] `?sort=invalid` is rejected with 400 INVALID_INPUT
- [ ] Author-posts endpoint defaults to `sort=recent` (NOT `bumped`)

### Visibility predicate (the load-bearing correctness concern)

- [ ] Unauthenticated viewer sees public posts
- [ ] Unauthenticated viewer does NOT see friends-visibility posts
- [ ] Unauthenticated viewer does NOT see private posts
- [ ] Authenticated viewer sees public posts
- [ ] Authenticated viewer sees friends-visibility posts when an active friend_relationships row exists between them and the author (`fr.user_id = author_id AND fr.friend_user_id = viewer_id AND fr.status = 'active'`)
- [ ] Authenticated viewer does NOT see friends-visibility posts when no friend_relationship exists
- [ ] Authenticated viewer does NOT see friends-visibility posts when friend_relationships row has `status = 'blocked'` (NOT 'active')
- [ ] Authenticated viewer sees their OWN private posts
- [ ] Authenticated viewer does NOT see ANOTHER user's private posts
- [ ] Authenticated viewer sees their OWN public posts (own-post branch fires)
- [ ] Authenticated viewer sees their OWN friends posts (own-post branch fires regardless of friend rows)
- [ ] Soft-deleted posts (`is_deleted=true`) NEVER appear, regardless of viewer
- [ ] Posts with `moderation_status='hidden'` NEVER appear (non-moderator endpoints)
- [ ] Posts with `moderation_status='removed'` NEVER appear
- [ ] Posts with `moderation_status='approved'` appear normally
- [ ] Posts with `moderation_status='flagged'` appear normally (transparency; UI may render a chip later)

### Mute filter integration (Spec 2.5.7 deferred work)

- [ ] Authenticated viewer who has muted user X does NOT see X's posts in `GET /api/v1/posts`
- [ ] Authenticated viewer who has muted user X gets `data: []` on `GET /api/v1/users/x/posts`
- [ ] Authenticated viewer who has muted user X CAN still fetch X's post via `GET /api/v1/posts/{xPostId}` directly (per Divergence 1)
- [ ] Unauthenticated viewer sees all public posts (no mute filter applied; can't mute without auth)
- [ ] Mute filter does NOT affect viewer's own posts (you can't mute yourself; if data inconsistency creates such a row, the filter doesn't accidentally hide the viewer's own content)

### Anonymous handling

- [ ] Posts with `is_anonymous=true` return `author.displayName='Anonymous'`, `author.avatarUrl=null`, `author.id=null`
- [ ] The author's real UUID is NEVER returned in any field for anonymous posts
- [ ] Even the post's true author sees `Anonymous` when fetching via these endpoints
- [ ] Non-anonymous posts return real author data (id, displayName, avatarUrl from users table)

### Response shape conformance

- [ ] All 200 responses have `{data, meta}` envelope per `03-backend-standards.md`
- [ ] All error responses have `{code, message, requestId, timestamp}` per error catalog
- [ ] `X-Request-Id` header present on all responses
- [ ] PostDto serializes `OffsetDateTime` as ISO-8601 with offset (e.g., `2026-04-27T15:30:00Z`)
- [ ] PostDto omits `is_deleted`, `deleted_at`, `report_count` (these never reach the client)

### OpenAPI spec

- [ ] 3 new paths added with full request/response schemas
- [ ] PostDto, AuthorDto, PostListResponse schemas defined
- [ ] `npx @redocly/cli lint` passes

### Test count target

L-sized → 20–40 tests per `06-testing.md`. Master plan target: at least 18 (Spec 7.7 says "at least 18 tests" for visibility-predicate enforcement; this spec's broader surface earns more). Distributed:
- `PostSpecificationsTest`: 15-18 tests (visibility branches, mute branches, filter composition)
- `PostServiceTest`: 6-8 tests (sort handling, pagination math, kebab-case resolution)
- `PostControllerIntegrationTest`: 12-16 tests (end-to-end HTTP, anonymous, validation, mute integration)
- `PostMapperTest`: 4-5 tests (entity → DTO; anonymous handling; nullable fields)
- `UserResolverServiceTest`: 4-5 tests (kebab-case, UUID, not-found)

Total **~40-50 tests**, slightly above L target due to the visibility-predicate criticality. Acceptable. If CC's plan proposes 70+, push back.

---

## What to Watch For in CC's Spec Output

1. **Visibility predicate exactness.** This is the load-bearing concern. Recon must produce a Specification that EXACTLY matches the canonical pseudo-SQL from master plan line 6307-6321. Every branch, every condition. Subtle bugs (e.g., reversing `fr.user_id` and `fr.friend_user_id`) leak private content. Recon's plan output should include the side-by-side comparison: pseudo-SQL fragment vs Specification code, line-by-line. Don't accept a plan that says "implements the visibility predicate" without showing the alignment.

2. **Author-posts mute semantic.** The brief recommends "viewer mutes Sarah → `GET /users/sarah/posts` returns empty array." Alternative: return 404 NOT_FOUND. The empty-array path is recommended because (a) preserves asymmetric mute semantic — Sarah doesn't know, viewer just sees no posts, (b) consistent with feed read where muted users' posts simply vanish, (c) doesn't leak "Sarah was muted" via differential responses. If CC's recon argues for 404, the case for empty-array is the asymmetric-mute consistency. Either is defensible; document the choice in the plan.

3. **Single-post mute semantic.** Per Divergence 1, mute does NOT filter `GET /api/v1/posts/{id}`. If CC's plan applies the mute filter to single-post detail, push back — that breaks the asymmetric mute contract (the muted user can still link-share their own post; viewer with the link gets a 404, which is confusing).

4. **404 vs visibility leak on `GET /api/v1/posts/{id}`.** When a post exists but visibility predicate excludes it, the response is 404 POST_NOT_FOUND. NOT 403 FORBIDDEN. Reasoning: 403 leaks "this post exists but you can't see it." 404 says "no such post visible to you." Anti-enumeration consistent with Phase 1's auth patterns. If CC proposes 403, push back.

5. **Don't 404 on missing user in `GET /api/v1/users/{username}/posts`.** Same anti-enumeration logic. Empty array, 200 status. If CC proposes 404 USER_NOT_FOUND, push back — that leaks user existence.

6. **`JwtAuthenticationFilter` null-principal pass-through.** The three endpoints support both authenticated and anonymous callers. Recon must verify what happens when `Authorization` header is absent: does `JwtAuthenticationFilter` skip authentication and let the request through with a null principal, or does it reject? If reject, the post paths need to be added to `PublicPaths.PATTERNS` (BUT that means even garbage Bearer tokens are silently ignored — different semantic). The cleanest pattern: `JwtAuthenticationFilter` attempts auth, sets principal if successful, allows through if no header, REJECTS if invalid header. Recon should grep the existing filter behavior and confirm. This is the architectural decision that determines whether `PublicPaths` needs editing.

7. **Specification subquery for `friend_relationships`.** The pattern used in `visibleTo()` requires `FriendRelationship` to be a JPA-managed entity in scope. Recon should verify it exists from Phase 2.5.1 (it does — from prior conversation context). Same for `UserMute`. If either entity isn't accessible via `EntityManager` from the post package, the cross-package import is fine — these are read-only queries via Specifications, not service-layer coupling.

8. **`OffsetDateTime` vs `Instant` vs `LocalDateTime`.** Schema columns are `TIMESTAMP WITH TIME ZONE` per Spec 3.1. The Java type matching that is `OffsetDateTime`. Recon should grep existing entities (User, FriendRelationship, ActivityLog) to verify the existing convention. If they use `Instant`, match that. If they use `OffsetDateTime`, match that. Don't introduce a third pattern.

9. **Counter freshness.** Denormalized counters (praying_count, candle_count, etc.) are read-as-stored. This spec doesn't recompute them; Phase 3.7's write endpoints maintain them via increments. Don't add `@Formula` or join-counting to the entity — the columns are the source of truth for read.

10. **`flagged` posts are visible.** Per the canonical predicate, `moderation_status IN ('approved', 'flagged')` for non-moderator reads. `flagged` is "moderator hasn't reviewed yet but auto-classifier found something" — visible to all viewers, with potential UI chip in Phase 10. Don't accidentally exclude flagged posts; the predicate is explicit.

11. **Pagination math.** `totalPages = ceil(totalCount / limit)`. `hasNextPage = page < totalPages`. `hasPrevPage = page > 1`. Edge case: `totalCount = 0` → `totalPages = 0`, `hasNextPage = false`, `hasPrevPage = false`, even when `page = 1`. Test the zero-result case explicitly.

12. **`@Transactional(readOnly = true)`** on `PostService` read methods. Phase 1 backend-standards likely already mandates this; recon should match.

13. **Sort whitelist.** `?sort=foo` must reject (400 INVALID_INPUT). Don't pass user input directly to ORDER BY — even with JPA Specifications, accepting arbitrary sort values is a foot-gun. Validate against the three allowed values (`bumped`, `recent`, `answered`) at the controller layer.

14. **Don't return `report_count` to clients.** It's moderation-internal. Frontend never displays it; including in PostDto leaks information about how many users have reported a post (could enable harassment via "is this person being reported a lot?" reconnaissance). PostMapper drops it.

15. **Author resolver caching.** `UserResolverService.resolveByKebabCase("sarah-johnson")` performs a DB lookup. If the same author is queried 10 times in a single feed render (unlikely for `/users/{username}/posts` but possible if the controller is structured oddly), one lookup per request is sufficient. Don't add a Caffeine cache here — premature optimization. Phase 5.6 Redis cache will handle hot-path caching.

16. **Anonymous post `author.id = null` in JSON response.** The JSON serializer must include the `id` field with value `null`, not omit it entirely. Frontend code expects the field's presence. Verify Jackson configuration.

17. **Single quotes** in shell snippets, file paths, fixture strings. Cell strings in test fixtures use single quotes (matching curly-quote autocorrect avoidance from Phase 1 Execution Reality Addendum item 8).

---

## Out of Scope

- Comments read endpoints (Spec 3.4 — owns `GET /posts/{id}/comments`)
- Reactions read (`GET /posts/{id}/reactions` — possibly Spec 3.4)
- Bookmarks read (Spec 3.4)
- Reports read (`GET /admin/reports` — Phase 10)
- Posts write (Spec 3.5 — XL/High, MAX-worthy)
- Comments write (Spec 3.6)
- Reactions/bookmarks write (Spec 3.7)
- Reports write (Spec 3.8)
- QOTD endpoints (Spec 3.9)
- Frontend wiring (Spec 3.10)
- Phase 3 cutover (Spec 3.12)
- Username system (Phase 8.1 — kebab-case is the wave-interim approach)
- Friends-pin-to-top reordering (Phase 7.6)
- Composer-side visibility selector (Phase 7.7)
- Search by author (Phase 6.10)
- Full-text search (Phase 11)
- Notification triggers on new post (Phase 12)
- Crisis detection on post content (Phase 3.5 backend; this spec is read-only and doesn't trigger anything)
- Admin/moderator views of hidden/removed posts (Phase 10)
- Cache layer (Phase 5.6 Redis)
- Rate limiting (Phase 10.9 — read endpoints likely stay unrate-limited or use the existing Phase 1 RateLimitFilter)
- Drift detection between frontend mock-data shape and backend response (no analogue to Phase 2's Spec 2.8; mock data shape is documented in `prayer-wall.ts` and verified by frontend type generation when Phase 3.10 ships)

---

## Out-of-Band Notes for Eric

- This is the first Phase 3 spec with substantive backend logic. Pattern-matching against Phase 2.5's friends/mutes packages helps: same shape (entity → repo → service → controller → mapper → DTOs → exception advice), more endpoints, harder query.
- Estimated execution: 2-3 sessions. ~17 new files + 1 modified + ~40 tests.
- Watch-For #1 (visibility predicate exactness) is the load-bearing recon concern. The plan output MUST include the side-by-side comparison of pseudo-SQL vs Specification code. Don't accept hand-wavy "implements the predicate" claims — get the alignment in writing.
- Watch-For #2 (author-posts mute semantic) is a real choice. My recommendation is empty-array; CC may argue for 404. Either is defensible; the plan should explicitly note the chosen path and reasoning.
- Watch-For #6 (JwtAuthenticationFilter null-principal pass-through) determines whether `PublicPaths.java` needs editing. Recon must verify the existing filter behavior before drafting the spec — this isn't optional.
- Phase 8.1 will replace the kebab-case username derivation with real `users.username` lookup. The followup entry tracks this; the wave-interim approach is solid for now.
- Spec tracker after 3.3 ships: `3.3 ✅`, Phase 3 progress 3/12.
- xHigh thinking is appropriate. The visibility predicate has reasoning depth (~5 branches, edge cases on each), but it's pattern-matchable against the canonical pseudo-SQL — recon does the translation, not novel architecture. The mute filter is a one-line subquery. Pagination math is mechanical. MAX would be over-spending; reserve it for 3.5 (Posts Write — crisis detection, the actual MAX-worthy spec).
- After 3.3 ships, **Spec 3.4 (Engagement Read Endpoints)** is up next — M-sized, Low risk. Comments + reactions + bookmarks read endpoints. Smaller scope, simpler queries; pattern-matches against this spec's shape. Will draft when 3.3 finishes review.
