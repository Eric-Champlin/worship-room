# Forums Wave: Spec 3.4 — Engagement Read Endpoints (Comments, Reactions, Bookmarks)

**Master Plan Reference:** `_forums_master_plan/round3-master-plan.md` → Spec 3.4 (body at line 3718)
**ID:** `round3-phase03-spec04-engagement-read`
**Branch:** `forums-wave-continued` (long-lived; do NOT create a new branch, do NOT checkout, do NOT commit/push)
**Date:** 2026-04-28

---

## Affected Frontend Routes

N/A — backend-only spec. Frontend reads stay on mock data + localStorage (no consumer wired yet — Phase 3.10 wires the consumer). `/verify-with-playwright` should be SKIPPED for this spec per the Forums Wave Workflow.

---

# Spec 3.4: Engagement Read Endpoints (Comments, Reactions, Bookmarks)

**Spec ID:** `round3-phase03-spec04-engagement-read`
**Branch:** `forums-wave-continued` (Eric's long-lived branch — DO NOT create a new branch, DO NOT checkout, DO NOT commit/push)
**Prereqs:** 3.1 ✅, 3.2 ✅, 3.3 ✅ (PostController + PostSpecifications + visibility predicate centralized; this spec composes against that infrastructure)
**Size:** M
**Risk:** Low (three read endpoints, smaller queries than 3.3, no novel architecture; bookmarks endpoint reuses the visibility predicate from 3.3 directly)
**Master Plan Reference:** `_forums_master_plan/round3-master-plan.md` — Spec 3.4 body (line 3718)

---

## STAY ON BRANCH

Same as the rest of the wave. Stay on `forums-wave-continued`. No `git checkout`, `git branch`, `git commit`, `git push`, `git stash`, `git reset`. Eric handles git manually.

---

## Goal

Ship the three engagement-read endpoints that the frontend will consume in Phase 3.10:

1. **`GET /api/v1/posts/{id}/comments`** — paginated comments for a post
2. **`GET /api/v1/users/me/reactions`** — viewer's reactions across all their reacted posts (flat map response keyed by post_id)
3. **`GET /api/v1/users/me/bookmarks`** — paginated bookmarked posts (returns PostDto rows for posts the viewer has bookmarked)

The first endpoint is anonymous-friendly (anyone can read comments on a visible post). The second and third are authenticated-only (`/users/me/...` namespace pattern from Phase 2.5).

After this spec ships:

- `com.worshiproom.post.comment` package exists for comment-specific code (entity, repository, service additions, mapper)
- `PostController` (or `EngagementController` — see Divergence 1) has the three new endpoints
- `PostSpecifications.visibleTo()` from Spec 3.3 is reused for the bookmarks endpoint
- Frontend reads stay on mock data + localStorage; Phase 3.10 wires the consumer

This spec does NOT cover comment writes (Spec 3.6), reaction toggle writes (Spec 3.7), or bookmark toggle writes (also Spec 3.7).

---

## Master Plan Divergence

Four divergences worth flagging.

### Divergence 1: Three endpoints stay on `PostController`, NOT a new `EngagementController`

**What the master plan says:** Spec 3.4 line 3726: "Three new endpoints on `PostController` (or a new `EngagementController` if cleaner)."

**What this brief says:** Stay on `PostController`. Don't create `EngagementController`.

**Why:**
- All three endpoints' URLs include `/posts/...` or are scoped per-viewer with payload that's "stuff about posts." The conceptual ownership is post-domain.
- Splitting into two controllers means duplicating exception handler advice scoping, OpenAPI tag organization, and shared dependency injection. No payback.
- Phase 3.5 (Posts Write) will add 3 more endpoints to `PostController`. Phase 3.7 will add reaction/bookmark write endpoints — either on `PostController` or a focused `EngagementWriteController`. Wait until Phase 3.7 to make that split decision based on actual code volume.

If `PostController` exceeds ~12 endpoints by Phase 3.7, splitting becomes worthwhile. For now, three endpoints in this spec (totaling 6 on `PostController` after this) is well within manageable bounds.

### Divergence 2: Threaded comments handled, but threading UI is deferred

**What the master plan says:** Acceptance criterion line 3732: "Threaded comments (with `parent_comment_id`) returned with the parent context."

**What this brief says:** The endpoint returns comments with their `parentCommentId` field populated when present. The response groups replies as a `replies: CommentDto[]` array nested inside their parent comment for response simplicity — but in this wave, frontend doesn't render threading (Phase 4 territory). For now: top-level comments get a `replies: []` array (empty during Phase 3 because no UI creates replies); when Phase 4 adds reply UI, the array starts populating.

**Endpoint behavior in this spec:**
- Returns top-level comments only (parent_comment_id IS NULL)
- Each top-level comment has a `replies: CommentDto[]` field (empty array during Phase 3)
- Sort: `created_at ASC` per master plan
- Pagination applies to TOP-LEVEL comments only — replies come along with their parents regardless of count
- Reply collection per parent does NOT have its own pagination; if a parent has 50+ replies (extreme edge case during Phase 4+), all 50 ship in one response payload. Pagination of replies is a Phase 4+ concern.

**Why:** The cleaner alternative is to flatten and let the frontend group replies, but that breaks the "data shape matches frontend rendering shape" pattern. Pre-grouping on the backend means frontend renders without any tree-walking logic — simpler frontend, fixed cost on backend.

### Divergence 3: Reactions endpoint returns a FLAT MAP, not a list

**What the master plan says:** Acceptance criterion line 3733: "`GET /api/v1/users/me/reactions` returns `{ reactions: { [postId]: { isPraying, isBookmarked } } }`."

**What this brief says:** Following master plan exactly. The response shape is a flat map (object) keyed by `postId` (UUID string), with values `{ isPraying: boolean, isBookmarked: boolean }`. This matches the existing frontend `wr_prayer_reactions` localStorage shape (`Record<string, PrayerReaction>` from `lib/prayer-wall/reactionsStore.ts`).

**Why mention this:** A more conventional REST response would be a list `[{ postId, isPraying, isBookmarked }, ...]`. The map shape is deliberate — it's optimized for frontend O(1) lookup (`reactions[postId]?.isPraying ?? false` during feed render) without any client-side transformation. CC's recon may default to the list shape; the map is the intentional choice. Don't reshape.

**Schema reality check:**
- `post_reactions` table: row exists with `reaction_type='praying'` ↔ `isPraying = true`. No row ↔ `isPraying = false`.
- `post_bookmarks` table: row exists ↔ `isBookmarked = true`. No row ↔ `isBookmarked = false`.

The endpoint's underlying query unions the two tables and groups by post_id. Posts where the viewer has neither reacted nor bookmarked do NOT appear in the map (frontend treats absence as "neither"). This keeps the response size bounded by the user's actual engagement count, not the total post count.

**`candle` reactions are NOT in this response.** Per Spec 3.1, the `post_reactions.reaction_type` CHECK constraint allows `'praying'` and `'candle'`. The frontend's existing `PrayerReaction` interface only has `isPraying` and `isBookmarked` — no `isCandled`. Phase 6.6 (Answered Wall) introduces the candle UI; THAT spec extends this endpoint's response shape to include `isCandled`. For Phase 3, we follow the existing frontend shape; if the viewer has only candle reactions on some posts, those posts don't appear in the response.

This is a deliberate scope boundary. Don't extend the response with `isCandled` in this spec just because the schema supports it.

### Divergence 4: Bookmarks endpoint reuses `PostSpecifications.visibleTo()` from Spec 3.3

**What the master plan says:** Acceptance criterion line 3734: "`GET /api/v1/users/me/bookmarks` returns paginated bookmarked posts."

**What this brief says:** The bookmarks endpoint composes the visibility predicate from Spec 3.3 with a bookmark-existence filter. SQL conceptually:

```sql
WHERE EXISTS (SELECT 1 FROM post_bookmarks WHERE post_id = posts.id AND user_id = :viewerId)
  AND <visibility predicate from PostSpecifications.visibleTo(viewerId)>
```

**Why this matters:** A user could bookmark a friend's post when it had `visibility='friends'`, then later get blocked by that friend (`friend_relationships.status='blocked'`), at which point the post should NOT appear in bookmarks. Same rule for posts that get soft-deleted or moderated to `'hidden'`/`'removed'` after bookmarking. The visibility predicate ensures bookmarks reflect current state, not historical state.

**Edge case:** the user always sees their own bookmarked posts regardless of visibility (the own-post branch of the predicate), even if they later changed visibility from public to private. This is correct — they bookmarked their own thing; they should see it.

If recon proposes skipping the visibility predicate ("they bookmarked it, they should always see it"), push back — that creates a privacy leak when bookmarked friends-visibility posts persist after unfriending.

---

## API Contract

### `GET /api/v1/posts/{id}/comments` — Comments for a Post

**Auth:** Optional (anyone can read comments on a visible post)

**Path param:** `id` UUID — the post

**Query params:**
- `page` (int, default 1, min 1)
- `limit` (int, default 20, max 50, min 1)

**Response:** 200 with shape:
```json
{
  "data": [CommentDto, CommentDto, ...],
  "meta": { page, limit, totalCount, totalPages, hasNextPage, hasPrevPage, requestId }
}
```

**Pre-check:** before listing comments, the endpoint verifies the post itself is visible to the viewer (using `PostSpecifications.visibleTo(viewerId)`). If the post is visible, return its comments. If not, return 404 POST_NOT_FOUND (consistent with Spec 3.3's anti-enumeration pattern). This handles the case where someone has a comment URL but the post has since become private/deleted/hidden.

**Empty result:** `data: []` (not 404), if the post is visible but has no comments.

**Soft-deleted comments:** excluded (`is_deleted = FALSE` in the query).

**Hidden/removed comments:** excluded (`moderation_status IN ('approved', 'flagged')`).

**Threaded replies handling:** per Divergence 2 — top-level comments are paginated; replies nested inside.

### `GET /api/v1/users/me/reactions` — Viewer's Reactions Map

**Auth:** Required (Bearer JWT)

**Query params:** none

**Response:** 200 with shape:
```json
{
  "data": {
    "reactions": {
      "00000000-0000-0000-0000-000000000201": { "isPraying": true, "isBookmarked": false },
      "00000000-0000-0000-0000-000000000205": { "isPraying": false, "isBookmarked": true },
      "00000000-0000-0000-0000-000000000208": { "isPraying": true, "isBookmarked": true }
    }
  },
  "meta": { requestId }
}
```

**No pagination.** The response is bounded by the viewer's engagement history (a user with 1000 reactions sees 1000 entries). In Phase 6+ if this becomes large, pagination can be added; for MVP the unbounded response is fine.

**No visibility filtering.** The response includes reactions on posts that may now be hidden or deleted — frontend filters at render time using the post list it already has. Reasoning: this is the viewer's OWN engagement data; they should see what they reacted to, even if those posts have since been moderated. The frontend joins this map with the visible-post-list (from `GET /api/v1/posts`) at render time, naturally filtering.

**Empty case:** `{ "data": { "reactions": {} } }` for a user who has no reactions or bookmarks. NOT 404.

### `GET /api/v1/users/me/bookmarks` — Bookmarked Posts (Paginated)

**Auth:** Required (Bearer JWT)

**Query params:**
- `page` (int, default 1, min 1)
- `limit` (int, default 20, max 50, min 1)
- `sort` (default `'recent'` — bookmarks sorted by `post_bookmarks.created_at DESC` — when the bookmark was created, not the post creation time)

**Response:** 200 with paginated `data: PostDto[]` and `meta` shape (same envelope as `GET /api/v1/posts`).

**Visibility predicate applied** per Divergence 4. Bookmarks for posts that are no longer visible to the viewer don't appear in the response.

**Empty case:** `{ data: [] }` for a user with no bookmarks. NOT 404.

---

## DTO Shape

### `CommentDto`

```java
public record CommentDto(
    UUID id,
    UUID postId,
    UUID parentCommentId,         // null for top-level
    String content,
    boolean isHelpful,
    String moderationStatus,      // 'approved' | 'flagged'
    boolean crisisFlag,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt,
    AuthorDto author,             // reuse from Spec 3.3 — anonymous-aware
    List<CommentDto> replies      // empty during Phase 3
) {}
```

**Anonymous comments:** Phase 3.1 schema does NOT include `is_anonymous` on `post_comments` (anonymous applies to posts, not comments). Comment authors are always real users. The anonymous-aware `AuthorDto` mapper from Spec 3.3 is reused, but for comments it always returns the real author.

**Excluded fields** (not sent to clients):
- `is_deleted` and `deleted_at` — filtered at query
- `user_id` directly — exposed via `author.id` instead

### `ReactionsResponse`

```java
public record ReactionsResponse(
    Map<UUID, PerPostReaction> reactions
) {}

public record PerPostReaction(
    boolean isPraying,
    boolean isBookmarked
) {}
```

The `Map<UUID, PerPostReaction>` serializes as a JSON object with UUID-string keys. Jackson handles this natively when the map's value type is itself JSON-serializable.

**Important:** Map iteration order in JSON output is not guaranteed. The frontend uses lookups, not iteration, so order doesn't matter. Don't add ordering logic; it's wasted effort.

### `BookmarksResponse`

Reuses `PostListResponse` from Spec 3.3 — `{ data: PostDto[], meta: {...} }`. Same envelope, same DTO. Different filter (bookmarked posts only) and different default sort (`post_bookmarks.created_at DESC`).

---

## The Queries

### Query 1: Comments for a post

```sql
SELECT c.*, u.* FROM post_comments c
JOIN users u ON u.id = c.user_id
WHERE c.post_id = :postId
  AND c.is_deleted = FALSE
  AND c.moderation_status IN ('approved', 'flagged')
  AND c.parent_comment_id IS NULL
ORDER BY c.created_at ASC
LIMIT :limit OFFSET :offset
```

Then for each top-level comment, fetch replies (single batch query with `WHERE parent_comment_id IN (:parentIds)` — N+1 prevention):

```sql
SELECT c.*, u.* FROM post_comments c
JOIN users u ON u.id = c.user_id
WHERE c.parent_comment_id IN (:parentIds)
  AND c.is_deleted = FALSE
  AND c.moderation_status IN ('approved', 'flagged')
ORDER BY c.created_at ASC
```

Group by `parent_comment_id` in Java, attach to parents.

**Pre-check on post visibility** runs first — a single query on `posts` filtered through `PostSpecifications.visibleTo(viewerId)`. If 0 results, 404. If 1 result, proceed to comment queries.

### Query 2: Viewer's reactions

```sql
-- Single query with full outer join, OR two queries unioned in Java
SELECT post_id, 'praying' AS kind FROM post_reactions
WHERE user_id = :viewerId AND reaction_type = 'praying'
UNION ALL
SELECT post_id, 'bookmark' AS kind FROM post_bookmarks
WHERE user_id = :viewerId
```

Build the map in Java by iterating results — `praying` rows set `isPraying=true`; `bookmark` rows set `isBookmarked=true`. Map default values are `false`.

Alternative: two separate queries, build the map. Slightly cleaner Java, marginally more DB roundtrips. Recon picks; both are fine.

### Query 3: Bookmarked posts

```sql
SELECT p.*, u.* FROM posts p
JOIN users u ON u.id = p.user_id
WHERE EXISTS (SELECT 1 FROM post_bookmarks pb WHERE pb.post_id = p.id AND pb.user_id = :viewerId)
  AND <visibility predicate from PostSpecifications.visibleTo>
ORDER BY (SELECT pb.created_at FROM post_bookmarks pb WHERE pb.post_id = p.id AND pb.user_id = :viewerId) DESC
LIMIT :limit OFFSET :offset
```

The ORDER BY subquery is awkward. Cleaner alternative: JOIN with `post_bookmarks` instead of EXISTS, then ORDER BY `pb.created_at DESC`:

```sql
SELECT p.*, u.* FROM posts p
JOIN post_bookmarks pb ON pb.post_id = p.id
JOIN users u ON u.id = p.user_id
WHERE pb.user_id = :viewerId
  AND <visibility predicate>
ORDER BY pb.created_at DESC
LIMIT :limit OFFSET :offset
```

Recon picks. The JOIN form is cleaner and avoids the subquery; use that unless there's a reason to prefer EXISTS (none I see).

---

## Files to Create

```
backend/src/main/java/com/worshiproom/post/comment/
  PostComment.java                       (JPA entity for post_comments)
  PostCommentRepository.java             (extends JpaRepository<PostComment, UUID>, JpaSpecificationExecutor<PostComment>)
  PostCommentService.java                (list comments, fetch replies in batch)
  PostCommentMapper.java                 (entity → CommentDto with reply nesting)
  PostCommentNotFoundException.java      (404 — used by Spec 3.6 too; ship the class now)
  dto/CommentDto.java
  dto/CommentListResponse.java

backend/src/main/java/com/worshiproom/post/engagement/
  EngagementService.java                 (orchestrates reactions map + bookmarks queries)
  ReactionRepository.java                (queries post_reactions for viewer's reactions; minimal — likely just a custom @Query method)
  BookmarkRepository.java                (queries post_bookmarks; reuses existing JpaRepository pattern)
  PostReaction.java                      (JPA entity for post_reactions — read-only in this spec)
  PostBookmark.java                      (JPA entity for post_bookmarks — read-only in this spec)
  PostReactionId.java                    (composite PK class)
  PostBookmarkId.java                    (composite PK class)
  dto/PerPostReaction.java
  dto/ReactionsResponse.java

backend/src/test/java/com/worshiproom/post/comment/
  PostCommentServiceTest.java
  PostCommentControllerIntegrationTest.java

backend/src/test/java/com/worshiproom/post/engagement/
  EngagementServiceTest.java
  EngagementControllerIntegrationTest.java
```

## Files to Modify

```
backend/src/main/java/com/worshiproom/post/PostController.java
  — add 3 new endpoint methods
  — inject PostCommentService and EngagementService
  — preserve existing 3 endpoints from Spec 3.3 unchanged

backend/src/main/java/com/worshiproom/post/PostSpecifications.java
  — no changes; reused as-is for bookmarks endpoint visibility predicate

backend/src/main/resources/openapi.yaml
  — add 3 path entries: GET /api/v1/posts/{id}/comments, GET /api/v1/users/me/reactions, GET /api/v1/users/me/bookmarks
  — add CommentDto, CommentListResponse, PerPostReaction, ReactionsResponse schemas
  — lint with npx @redocly/cli lint
```

## Files NOT to Modify

- `frontend/**` — no consumer wired yet; Phase 3.10 owns frontend integration
- `PublicPaths.java` — `/posts/{id}/comments` follows the same auth-optional pattern as `/posts/{id}` from Spec 3.3 (anonymous callers can read; authenticated callers may see additional context). `/users/me/...` endpoints require auth and are handled by the standard JWT filter, not PublicPaths.
- Any Liquibase changeset — schema is finalized in 3.1
- Any code in `com.worshiproom.mute` — engagement reads don't apply mute filtering (see Watch-For #4)
- Any code in `com.worshiproom.friends` — visibility predicate via `PostSpecifications` already references `friend_relationships`; no changes needed here
- `Post.java` (Spec 3.3 entity) — comment count is denormalized on `posts.comment_count`; this spec doesn't update that counter (Spec 3.6 maintains it)

## Files to Delete

None.

---

## Acceptance Criteria

### Endpoints exist and return correct shape

- [ ] `GET /api/v1/posts/{id}/comments` returns 200 with `{data, meta}` envelope
- [ ] `GET /api/v1/posts/{id}/comments` returns 404 POST_NOT_FOUND when post doesn't exist OR is soft-deleted OR fails visibility predicate
- [ ] `GET /api/v1/posts/{id}/comments` returns `data: []` when post is visible but has no comments
- [ ] Comments sorted by `created_at ASC` (oldest first; matches comment-thread reading convention)
- [ ] Default pagination is page=1, limit=20
- [ ] Max limit is 50; `?limit=51` rejected with 400 INVALID_INPUT
- [ ] `GET /api/v1/users/me/reactions` returns 200 with `{data: {reactions: {...}}, meta}` shape
- [ ] `GET /api/v1/users/me/reactions` returns 401 without JWT
- [ ] `GET /api/v1/users/me/reactions` returns empty map `{reactions: {}}` for user with no reactions
- [ ] `GET /api/v1/users/me/bookmarks` returns 200 with paginated PostDto data
- [ ] `GET /api/v1/users/me/bookmarks` returns 401 without JWT
- [ ] `GET /api/v1/users/me/bookmarks` returns `data: []` for user with no bookmarks
- [ ] Bookmarks sorted by `post_bookmarks.created_at DESC` (most recently bookmarked first)

### Comments handling

- [ ] Top-level comments paginated; `parent_comment_id IS NULL` filter applied
- [ ] Soft-deleted comments excluded (`is_deleted = FALSE`)
- [ ] Hidden/removed comments excluded (`moderation_status IN ('approved', 'flagged')`)
- [ ] Replies fetched in single batch query (N+1 prevention)
- [ ] Each top-level comment has a `replies: []` array (empty during Phase 3)
- [ ] When reply data exists in DB (manually inserted for testing), each top-level comment's `replies` array is populated with its replies sorted by `created_at ASC`
- [ ] Author information populated via `AuthorDto` (real author for comments — comments don't have anonymous flag)

### Reactions map

- [ ] Map is keyed by post_id (UUID strings)
- [ ] Each entry has `isPraying: boolean` and `isBookmarked: boolean`
- [ ] Posts where viewer has reacted but not bookmarked: `{isPraying: true, isBookmarked: false}`
- [ ] Posts where viewer has bookmarked but not reacted: `{isPraying: false, isBookmarked: true}`
- [ ] Posts where viewer has both: `{isPraying: true, isBookmarked: true}`
- [ ] Posts where viewer has neither: NOT in the map (frontend treats absence as both-false)
- [ ] Candle reactions do NOT appear in the response (deliberate scope per Divergence 3)
- [ ] Soft-deleted/hidden posts: their reactions still appear in the map (no visibility filter applied — the map reflects viewer's own engagement history)

### Bookmarks listing

- [ ] Returns full PostDto rows (not just bookmark records)
- [ ] Visibility predicate applied: bookmarks for now-private/deleted/hidden posts excluded
- [ ] Sort: by bookmark creation time DESC (NOT post creation time)
- [ ] Pagination math correct: empty case returns `data: []` with valid meta (totalCount=0, totalPages=0)

### Visibility predicate reuse

- [ ] `GET /api/v1/posts/{id}/comments` runs visibility check on the parent post before listing comments
- [ ] `GET /api/v1/users/me/bookmarks` applies visibility predicate to bookmarked posts
- [ ] Tests cover: bookmark a friends-visibility post, unfriend the author, the post no longer appears in bookmarks
- [ ] Tests cover: bookmark a public post, post gets soft-deleted, the post no longer appears in bookmarks

### OpenAPI spec

- [ ] 3 new paths added with full request/response schemas
- [ ] CommentDto, CommentListResponse, PerPostReaction, ReactionsResponse schemas defined
- [ ] `npx @redocly/cli lint` passes

### Test count target

M-sized → 10–20 tests per `06-testing.md`. Master plan target: at least 15. Distributed:
- `PostCommentServiceTest`: 6-8 tests (pagination, sorting, soft-delete filter, replies batching)
- `PostCommentControllerIntegrationTest`: 6-8 tests (endpoint behavior, post visibility pre-check, 404 cases)
- `EngagementServiceTest`: 4-6 tests (reactions map building, bookmarks visibility filtering)
- `EngagementControllerIntegrationTest`: 6-8 tests (auth gating, empty cases, sort order)

Total **~22-30 tests**. If CC's plan proposes 50+, push back; if 12 or below, push back the other way.

---

## What to Watch For in CC's Spec Output

1. **Don't apply mute filter to comments.** The mute semantic per Spec 2.5.7 is "their POSTS don't appear in your feed." Comments by muted users on a post you can see ARE visible — mute is post-discovery-scoped, not interaction-scoped. If CC's plan adds mute filtering to the comments endpoint, push back. (See Watch-For #4 for nuance.)

2. **Don't apply mute filter to reactions map either.** Same reasoning — the map reflects YOUR engagement history. Posts by users you've muted but reacted to before muting still appear in the map. Frontend's render-time join with the visible-post-list naturally filters since muted users' posts won't be in the visible list.

3. **DO apply mute filter to bookmarks endpoint? — DECISION NEEDED.** The bookmarks endpoint returns posts from arbitrary authors. If a viewer bookmarked a post from someone they later muted, should the bookmark appear?

   **Recommendation: YES, mute filter applies.** Bookmarks ARE a feed-like discovery surface ("my bookmarks page" is a discovery view). Showing muted users' posts there contradicts the muted contract. Recon should match this with `PostSpecifications.notMutedBy(viewerId)` composed with the bookmark JOIN.

   **Counterargument:** "the user explicitly bookmarked this; surfacing it is consistent with their intent." Not strong enough — they also explicitly muted the author. Mute is a stronger signal than bookmark. If CC argues otherwise, the case for mute-filter-applied is the consistency with feed reads.

4. **Comment author display when post author is anonymous.** A post can be anonymous (`posts.is_anonymous=true`); comments on that post show real author names. If the post author themselves comments on their own anonymous post, their identity is REVEALED via the comment author display. This is a known UX trade-off — the master plan doesn't address it directly. For Phase 3.4, ship the straightforward behavior (real comment authors always shown) and add a followup entry: "Anonymous post comment author handling — should the post's anonymous author auto-anonymize their own comments? Decision deferred to Phase 4."

5. **Reactions map cardinality concern.** A heavy user with 1000+ posts engaged could see large response payload. For MVP, this is fine — JSON object with 1000 entries is ~50KB. If load testing in Phase 5/6 reveals issues, paginate then. Don't add pagination preemptively.

6. **Map vs list shape.** Per Divergence 3, the map shape is intentional. If recon proposes a list `[{ postId, isPraying, isBookmarked }]` for "REST conventionality," push back. The map matches frontend's existing `wr_prayer_reactions` shape and supports O(1) lookups.

7. **Bookmarks endpoint pagination uses `post_bookmarks.created_at DESC`, NOT `posts.created_at DESC`.** This is the load-bearing detail. "Most recently bookmarked" ≠ "most recent post." A user who bookmarks an old post today should see that bookmark at the top. If CC's plan sorts by `posts.created_at`, push back.

8. **N+1 prevention on reply loading.** When fetching top-level comments and their replies, the second query MUST be a batch (`WHERE parent_comment_id IN (:parentIds)`) — never a per-parent loop. Tests should verify query count via `@Sql` setup with multiple comments + replies and assert the actual number of SQL queries fired (Hibernate Statistics, or `@DataJpaTest` query count assertions). If the plan doesn't show this concern explicitly, recon missed it.

9. **The `replies` array is always present, even when empty.** During Phase 3, every top-level comment serializes with `replies: []`. Don't omit the field via `@JsonInclude(NON_EMPTY)` — frontend code expects the field's presence. Verify Jackson configuration.

10. **Comments endpoint pre-checks post visibility BEFORE listing comments.** Don't return comments for a post the viewer can't see. The pre-check is one extra query (single post visibility check) — cheap, and prevents a privacy leak via comment listings on private/deleted posts.

11. **Bookmarks endpoint returns visible posts only.** Per Divergence 4. The `WHERE EXISTS (post_bookmarks)` and visibility predicate compose. If the plan's SQL skips visibility filtering "because the user explicitly bookmarked them," push back — that creates a privacy leak when bookmarked friends-visibility posts persist after unfriending.

12. **`AuthorDto` reuse from Spec 3.3.** Same DTO. Don't duplicate. The Spec 3.3 mapper has anonymous-aware logic; for comments, it's not strictly needed (comments aren't anonymous), but reusing the DTO keeps frontend types consistent.

13. **Single quotes** in shell snippets, file paths, fixture strings.

14. **`OffsetDateTime` matching Spec 3.3 convention.** `created_at`, `updated_at` — the schema columns are `TIMESTAMP WITH TIME ZONE`; the Java type matching is `OffsetDateTime`. Consistency with PostDto from Spec 3.3.

---

## Out of Scope

- Comment writes — POST/PATCH/DELETE on comments (Spec 3.6)
- Reaction toggle writes — POST/DELETE on `/posts/{id}/reactions` (Spec 3.7)
- Bookmark toggle writes — POST/DELETE on `/posts/{id}/bookmarks` (Spec 3.7)
- Reports endpoints (Spec 3.8)
- QOTD endpoints (Spec 3.9)
- `isCandled` field in reactions map (Phase 6.6 Answered Wall extends shape)
- Anonymous post author commenting on their own anonymous post — display behavior (followup; Phase 4 likely)
- Reply pagination (Phase 4+ when reply UI exists and N can grow)
- Reaction-by-other-users counts on comments (Phase 4+; comments don't currently have reaction tables)
- "Helpful" toggle on comments (`is_helpful` exists in schema but no endpoint sets/reads it — Phase 4)
- Mute filter on the comments endpoint (Watch-For #1; deferred indefinitely — comments by muted users on visible posts ARE visible)
- Frontend wiring (Spec 3.10)
- Cache layer (Phase 5.6 Redis)
- Rate limiting (Phase 10.9)
- Drift detection between frontend mock-data shape and backend response (no analogue to Phase 2's Spec 2.8)

---

## Out-of-Band Notes for Eric

- This is the lightest Phase 3 spec with substantive logic. M-sized; pattern-matches against 3.3's surface; smaller queries; less reasoning depth.
- Estimated execution: 1-2 sessions. ~13 new files + 3 modified + ~22-30 tests.
- The load-bearing recon items: (a) bookmarks visibility composition with `PostSpecifications.visibleTo()` per Divergence 4, and (b) N+1 prevention on reply loading per Watch-For #8. Everything else is mechanical.
- Watch-For #3 (mute filter on bookmarks) is a real choice. My recommendation is "yes, apply mute filter." If CC's recon argues otherwise with strong reasoning, accept; the plan should explicitly document the choice either way.
- After 3.4 ships, the read side of Phase 3 is complete. Spec 3.5 (Posts Write Endpoints) is next — XL/High, MAX-worthy because of crisis detection. Different shape entirely. I'll draft when 3.4 finishes review.
- Spec tracker after 3.4 ships: `3.4 ✅`, Phase 3 progress 4/12.
- xHigh thinking is appropriate. Pattern-matching against 3.3, mechanical query composition, well-bounded surface. MAX would be over-spending; reserve for 3.5.
- Phase 3 critical-path bottleneck reminder: **3.5 (Posts Write Endpoints, XL/High)** is the MAX-worthy spec. Crisis detection has multiple-branch correctness reasoning (validate → classifier call → handle classifier failure → maybe-flag-on-create → return user-safe response → log without PII → don't leak upstream errors) where xHigh might pick a defensible-but-wrong path. When 3.4 ships and you're approaching 3.5, ping me and we can discuss whether your weekly MAX limit lines up with that execution window.
