# Forums Wave: Spec 3.7 — Reactions and Bookmarks Write Endpoints

**Master Plan Reference:** `_forums_master_plan/round3-master-plan.md` → Spec 3.7 (body at lines 3810-3828; Phase 3.7 Addendum lines 3830-3832)
**ID:** `round3-phase03-spec07-reactions-bookmarks-write`
**Branch:** `forums-wave-continued` (long-lived; do NOT create a new branch, do NOT checkout, do NOT commit/push)
**Date:** 2026-04-28

---

## Affected Frontend Routes

N/A — this spec is **mostly** backend. The frontend touches three files only (`frontend/src/hooks/usePrayerReactions.ts`, `frontend/src/lib/prayer-wall/reactionsStore.ts`, `frontend/src/types/prayer-wall.ts`) to extend the local-only reactive store with a candle field. No UI changes ship here — the actual user-facing wiring for the new POST/DELETE reaction and bookmark endpoints is owned by Spec 3.10 (Frontend Service API Implementations); the dual-write flag flips in Spec 3.12 (Phase 3 Cutover). `/verify-with-playwright` should be SKIPPED for this spec per the Forums Wave Workflow.

The affected pages (for downstream Spec 3.10's verification) are `/prayer-wall`, `/prayer-wall/:id`, `/prayer-wall/dashboard`, `/prayer-wall/user/:id`. None of those see a behavioral change in 3.7.

---

## STAY ON BRANCH

Same as the rest of the wave. Stay on `forums-wave-continued`. No `git checkout`, `git branch`, `git commit`, `git push`, `git stash`, `git reset`. Eric handles git manually.

---

## Pre-Execution Recon Findings (Authoritative — supersedes the brief where they conflict)

The brief was authored against a stale mental model of the Phase 3 schema. Spec 3.1's changesets 014 and 016 (shipped 2026-04-27) ALREADY landed the schema migration the brief describes as new work. The on-disk reality below is authoritative; the planner and executor must trust this section over any contradictory text in the brief that follows.

### R1. `post_reactions.reaction_type` ALREADY EXISTS — Divergence D7 (schema migration) is OBSOLETE

`backend/src/main/resources/db/changelog/2026-04-27-016-create-post-reactions-table.xml` (Spec 3.1) created `post_reactions` with:

- `reaction_type VARCHAR(30) NOT NULL DEFAULT 'praying'`
- Composite primary key `pk_post_reactions` on `(post_id, user_id, reaction_type)`
- Named CHECK constraint `post_reactions_reaction_type_check` enforcing `reaction_type IN ('praying', 'candle')`
- Index `idx_post_reactions_post_type` on `(post_id, reaction_type)`
- Index `idx_post_reactions_user_created` on `(user_id, created_at DESC)`
- ON DELETE CASCADE FKs to `posts` and `users`

**Implication:** The brief's Divergence D7 ("Schema migration: backfill BEFORE adding new unique constraint") is a no-op — there is nothing to backfill, no constraint to drop, no NOT NULL to set. **Do NOT write a new Liquibase changeset for `post_reactions`.** Editing changeset 016 is forbidden (its MD5 is permanent in DATABASECHANGELOG of every existing dev/test/prod database).

The only Liquibase work potentially needed in this spec is **none** — see R2.

### R2. `posts.candle_count` ALREADY EXISTS

`backend/src/main/resources/db/changelog/2026-04-27-014-create-posts-table.xml` (Spec 3.1) created the `posts` table with `candle_count INTEGER NOT NULL DEFAULT 0` already present alongside `praying_count`, `comment_count`, `bookmark_count`, `report_count`. The columns are documented in the changeset comment as the "5 denormalized counters maintained by application-layer increment/decrement logic in Specs 3.5+."

**Implication:** No `posts` schema change is needed in this spec. `Post.java` may need a `candleCount` getter (recon Step 1 of the plan must confirm), but the column exists and defaults correctly.

### R3. **No new Liquibase changeset is required for Spec 3.7.**

Combining R1 and R2: the only deliverable surface the brief framed as a Liquibase changeset is already shipped. The plan should NOT include a "new changeset" step. The plan SHOULD include a smoke-check step that confirms the existing schema state matches expectations (a single `LiquibaseSmokeTest`-style assertion that `reaction_type` column exists, the composite PK has the expected three columns, and `posts.candle_count` exists with default 0).

### R4. Existing `engagement/` package — D13 resolves to "consolidate, do NOT split"

The brief proposes new `com.worshiproom.post.reaction/` and `com.worshiproom.post.bookmark/` packages. The on-disk reality:

- `backend/src/main/java/com/worshiproom/post/engagement/` already exists and consolidates BOTH reactions and bookmarks
- Files present: `PostReaction`, `PostReactionId`, `PostBookmark`, `PostBookmarkId`, `ReactionRepository`, `BookmarkRepository`, `BookmarkRepositoryCustom`, `BookmarkRepositoryImpl`, `EngagementService` (read-only orchestration for `/users/me/reactions` and `/users/me/bookmarks`), `engagement/dto/PerPostReaction`, `engagement/dto/ReactionsResponse`
- `PostController` already injects `EngagementService` and serves the read-side `/users/me/reactions` and `/users/me/bookmarks` endpoints

**Implication:** The write-side for Spec 3.7 lives in `com.worshiproom.post.engagement/`. NOT in new `reaction/` or `bookmark/` subpackages. The plan should:

- Add a write-side service alongside the existing read-only `EngagementService`. Two acceptable shapes:
  - **(a)** Add write methods to `EngagementService` and rename if needed
  - **(b)** Create `EngagementWriteService` (or a pair `ReactionWriteService` / `BookmarkWriteService`) in the same package
  Recommend **(b)** with two services (`ReactionWriteService`, `BookmarkWriteService`) — keeps the `@Transactional` boundary tight per operation and matches Spec 3.5/3.6's "one write service per resource" pattern (`PostService` write methods, `PostCommentService` write methods).
- Either extend `PostController` with the four new endpoints (matches the existing pattern — the controller is `@RequestMapping("/api/v1")` and already serves the read-side reactions/bookmarks endpoints) OR add a new `EngagementWriteController` in the same package. Recommend **extending `PostController`** to keep all `/api/v1/posts/{id}/*` endpoints in one place and avoid splitting the post namespace across two controllers (a Phase 3.5+ refactor can split it later when PostController exceeds size budget).
- Use the existing read-only entities (`PostReaction`, `PostBookmark`) for queries. For writes, the entities currently lack the constructor/setter shape needed to insert new rows (verify in plan); if needed, add an `insert` repository method that uses native SQL or a JPA-friendly write entity. The simplest path: add JPA insertable constructors to existing entities (the `PostReaction(UUID, UUID, String)` constructor already exists — verified during recon).
- New rate-limit infrastructure mirrors Spec 3.5/3.6: `ReactionsRateLimitConfig`, `ReactionsRateLimitService`, `ReactionsRateLimitException`; `BookmarksRateLimitConfig`, `BookmarksRateLimitService`, `BookmarksRateLimitException`. All in `com.worshiproom.post.engagement/`.
- New exception handler: extend the existing package-scoped advice OR add a new `EngagementExceptionHandler` for the rate-limit exceptions. Filter-raised exceptions still need the unscoped-companion-advice pattern from `03-backend-standards.md` if any reach the response chain.

### R5. **Existing `PrayerReaction` frontend type already has `isBookmarked` — D9 (localStorage migration) is over-scoped**

The brief states the localStorage shape is `Record<string, { praying: boolean }>` and migrates it to `Record<string, { praying: boolean, candle: boolean }>`. The on-disk reality (`frontend/src/types/prayer-wall.ts`):

```ts
export interface PrayerReaction {
  prayerId: string
  isPraying: boolean
  isBookmarked: boolean
}
```

The store at `frontend/src/lib/prayer-wall/reactionsStore.ts` already persists this 3-field shape under `wr_prayer_reactions`, validates it with `isValidReaction`, and seeds from `getMockReactions()` on first load. There is NO existing version flag (`wr_prayer_reactions_version` does NOT exist in the codebase).

**Implication:** The migration is simpler than the brief implies. We need to ADD a single field — `isCandle: boolean` (NOT `candle: boolean` — match the existing `is*` naming convention used by `isPraying` / `isBookmarked`). The migration logic:

- The existing `isValidReaction` guard is strict: it returns `false` if `isCandle` is missing, which makes the cache hydrate fail and silently re-seed from mocks (data loss). **This is the migration vector.** Two options:
  - **(a)** Loosen `isValidReaction` to treat `isCandle` as optional, and add a hydration-time fixup that defaults missing `isCandle` to `false` and writes back. Matches Pattern A in `11-local-storage-keys.md`. Single read, single write.
  - **(b)** Introduce a `wr_prayer_reactions_version` localStorage key that flips on first migration. More verbose; not warranted for a single-field addition.
  Recommend **(a)** — it's the smaller change and the mock-reseeding fallback is acceptable for users with corrupt-but-old data.
- The new `toggleCandle(prayerId)` method mirrors `togglePraying` exactly. Independent toggle: flipping `isCandle` does NOT touch `isPraying` or `isBookmarked`.
- The `PrayerReaction` type extends with `isCandle: boolean`.
- The `usePrayerReactions` hook return type adds `toggleCandle: (prayerId: string) => boolean`.
- `getMockReactions` (the seed source) needs a one-line update to default `isCandle: false` on every seed entry.

### R6. **Spec 3.4 read-side currently excludes candle from `/users/me/reactions` map — is that in scope to fix here?**

The existing `EngagementService.reactionsFor(viewerId)` at line 53 calls `findByUserIdAndReactionType(viewerId, "praying")` — it deliberately excludes candle reactions from the read-side map per "Spec 3.4 Divergence 3 — candle excluded." The current `PerPostReaction` DTO has only `isPraying` and `isBookmarked` fields.

**Open question for the planner to resolve:** When this spec adds candle WRITES, should the read-side `/users/me/reactions` map ALSO start surfacing `isCandle`? Two paths:

- **(a)** YES — extend `PerPostReaction` with `isCandle: boolean`, query both `'praying'` AND `'candle'` reaction types in `EngagementService.reactionsFor`, accumulate into the response. Symmetric. Costs one extra DB query per `/users/me/reactions` call. Frontend integration in Spec 3.10 becomes simpler.
- **(b)** NO — keep the read-side scoped to praying for this spec. Spec 3.10 (frontend service API) handles the read-side wiring and can extend `PerPostReaction` then. Smaller blast radius but defers the symmetry.

Recommend **(a)** — the symmetry is small (add one field to a DTO, one extra repository call, the existing accumulator pattern handles it). Adding a write surface for a reaction type whose read endpoint deliberately hides it would be confusing for Spec 3.10's author. The plan should include this read-side extension; if it grows the spec scope unacceptably, the planner can downgrade to (b) and document the deferral.

### R7. SecurityConfig method-specific patterns — gotcha confirmed

`SecurityConfig` already has method-specific rules for `/api/v1/posts/*` (POST, PATCH, DELETE) and `/api/v1/posts/*/comments` (POST). **The wildcard `/api/v1/posts/*` does NOT match nested paths like `/api/v1/posts/{id}/reactions` or `/api/v1/posts/{id}/bookmark`** — Spring's `*` pattern matches a single path segment. Without explicit method+pattern rules for the new nested write endpoints, anonymous POST/DELETE could leak through `OPTIONAL_AUTH_PATTERNS`. The plan must add four rules:

- `requestMatchers(HttpMethod.POST, "/api/v1/posts/*/reactions").authenticated()`
- `requestMatchers(HttpMethod.DELETE, "/api/v1/posts/*/reactions").authenticated()`
- `requestMatchers(HttpMethod.POST, "/api/v1/posts/*/bookmark").authenticated()`
- `requestMatchers(HttpMethod.DELETE, "/api/v1/posts/*/bookmark").authenticated()`

These are inherited gotcha #3 from the brief, confirmed against on-disk reality.

### R8. `ActivityType.INTERCESSION`, `PostSpecifications.visibleTo(viewerId)`, OWASP infrastructure — all confirmed present

- `ActivityType.INTERCESSION` ships in `backend/src/main/java/com/worshiproom/activity/ActivityType.java` per Spec 3.6 (verified `INTERCESSION("intercession")` enum constant + `INTERCESSION_COUNT` in `CountType` + `BadgeThresholds.INTERCESSIONS = 25` + `PointValues` map entry of 10 points)
- `PostSpecifications.visibleTo(viewerId)` ships in `backend/src/main/java/com/worshiproom/post/PostSpecifications.java` and is used by Spec 3.3/3.4 read endpoints (the canonical visibility predicate from master plan Spec 7.7)
- OWASP HTML Sanitizer is on the classpath from Spec 3.5 — but is **not used in 3.7** (no user-generated text)

### R9. **`last_activity_at` policy — recon defers to existing read-side sort logic**

The brief's "DO NOT" list says "Do NOT bump `last_activity_at` on reactions or bookmarks" with a caveat for the planner to verify. The on-disk reality:

- `idx_posts_last_activity` is a partial index `ON posts (last_activity_at DESC) WHERE is_deleted = FALSE AND moderation_status = 'approved'` — Spec 3.1 changeset 014
- `PostService.SortKey.BUMPED` is the default feed sort in `PostController.listFeed` (defaults to "bumped")
- Spec 3.6 bumps `last_activity_at` on comment creation per its "counter and timestamp denormalization" section
- The master plan describes `last_activity_at` as the bump-sort timestamp for "engagement"

**Resolution:** Reactions and bookmarks DO NOT bump `last_activity_at`. The conceptual definition of "engagement that bumps a post" is "user-generated text response" — comments. Reactions are a low-friction social signal that should not promote posts in the feed (otherwise a bot or a single-user spam pattern could keep an old post artificially fresh). Bookmarks are a private organizational action with zero feed-visibility. The brief's stated rule holds. Plan should explicitly NOT include `last_activity_at = NOW()` in the SQL UPDATE for either write path.

### R10. Mock-data seeding — the `getMockReactions` fallback applies to candle too

`reactionsStore.ts` calls `getMockReactions()` on first load when storage is empty. After this spec ships, the mock seed must include `isCandle: false` (or a varied set of candle states across mock posts to keep the dev/QA experience realistic). The plan should update `frontend/src/mocks/prayer-wall-mock-data.ts` accordingly. This is a small one-line per-entry change.

### R11. Test-target counts and locations confirmed

- BB-45 subscription tests live at `frontend/src/lib/prayer-wall/__tests__/reactionsStore.test.ts` AND `frontend/src/hooks/__tests__/usePrayerReactions.subscription.test.tsx`. The plan must extend BOTH files for candle-path coverage.
- Backend integration tests must extend `AbstractIntegrationTest` per `06-testing.md` § Testcontainers Setup Pattern. Use the singleton `TestContainers.POSTGRES`. Override JWT/rate-limit properties via `@DynamicPropertySource` if needed (Spec 3.5/3.6 patterns).
- The brief's target of ~30 tests stands; recon does NOT downsize. Frontend test count adjusts to ~5-7 (the migration test, candle toggle independence, BB-45 subscription extensions).

### R12. **The brief contains a sample response field name mismatch — `reactionType` vs. enum**

The brief's response shape uses `reactionType: 'praying' | 'candle'` (the literal lowercase string). The existing read-side stores reaction_type as a String for forward-compat per `PostReaction.java`'s class-level JavaDoc ("Phase 6.6 Answered Wall will widen the underlying CHECK constraint to add 'praising' / 'celebrate'; an enum bound to that column would need an ALTER mid-flight"). **The new write-side DTO MUST also use `String` for the request and response, not a Java enum.** Validate the value with a `@Pattern(regexp = "^(praying|candle)$")` annotation OR a custom validator that gives a clean 400 INVALID_INPUT. NEVER let the DB CHECK constraint be the validation surface — the resulting error is a 500 (or worse, an `UpstreamException` if it leaks).

The brief's mention of `ReactionType.java` (enum: PRAYING, CANDLE) at the "Files (Expected Surface)" section is **wrong** — do NOT create that enum. Use String + validator. This matches the existing `PostReaction.reactionType` typing.

### R13. **The brief's `state` field in the toggle response is a NEW idea that fits the codebase well — keep it**

The toggle response shape `{ reactionType, state: 'added' | 'removed', prayingCount, candleCount }` with status 201 on add / 200 on remove is **not** an existing pattern (Spec 3.5/3.6 don't have toggle endpoints). The brief's argument for the `state` field — disambiguating toggle direction independent of counter math under network reorder — is sound and the field should ship. The planner should write the OpenAPI schema accordingly (`state` as a `string` with `enum: [added, removed]`).

### Summary of Recon-Driven Plan Adjustments

| Brief item | Reality | Plan adjustment |
|---|---|---|
| D7 Liquibase migration | Already shipped in 3.1 | No new changeset; smoke-check existing schema |
| D9 localStorage migration adding `bookmark` | `isBookmarked` already exists; only `isCandle` is new | Add single field; loosen `isValidReaction` guard; default-fixup on hydrate |
| Files: new `reaction/` and `bookmark/` packages | `engagement/` package already consolidates both | Extend `engagement/` package; recommend two write-services + extend `PostController` |
| Files: new `ReactionType.java` enum | Existing `reaction_type` is `String` for forward-compat (Phase 6.6) | NO enum; use String + `@Pattern` validator |
| Read-side scope | Spec 3.4 currently excludes candle from `/users/me/reactions` | Extend `PerPostReaction` + `EngagementService.reactionsFor` to include candle (recommended path; planner can defer to 3.10 if scope creeps) |
| Field naming `candle: boolean` | Existing pattern is `is*` (`isPraying`, `isBookmarked`) | Use `isCandle: boolean` for consistency |
| `Post.candleCount` field | Already mapped in `Post.java` (line 78–79: `@Column(name = "candle_count", nullable = false) private int candleCount;`) | NO entity work needed for candle counter — getter/setter pair likely already present (verify briefly in plan, but don't add the field) |
| Decrement guard SQL `>= 0` (brief D10) | Existing 3.6 pattern uses `> 0` (correct); `>= 0` would silently allow decrement-to-negative | Use `WHERE p.<counter> > 0` for ALL decrement queries. See R14. |
| Increment query `last_activity_at` bump | 3.6's `incrementCommentCount` ALSO bumps `last_activity_at`; copy-pasting would re-introduce the bug | Write SEPARATE repo methods that OMIT the `last_activity_at` clause for reactions/bookmarks. See R15. |
| Mock seed `post_reactions` rows | Dev-only seed `2026-04-27-021-prayer-wall-mock-seed.xml` inserts 5 reaction rows; all use the column default `'praying'` | No backfill or migration of seed rows needed — column default handles them. The schema-invariant test should still pass against the seeded dev DB. |
| `ActivityRequest` constructor | Confirmed signature: `record ActivityRequest(ActivityType activityType, String sourceFeature, Map<String, Object> metadata)` | Call as `new ActivityRequest(ActivityType.INTERCESSION, "prayer-wall-reaction", null)` (matches brief). |

### R14. **Decrement guard correction — `> 0`, not `>= 0`**

The brief's D10 prescribes `WHERE <counter> >= 0` for decrement queries. This is **incorrect**. The semantics:

- `WHERE counter >= 0 ... SET counter = counter - 1` matches when counter is 0 and decrements to -1 (still satisfies the WHERE condition before the UPDATE evaluates). This is exactly the bug the guard is supposed to prevent.
- `WHERE counter > 0 ... SET counter = counter - 1` matches when counter is 1+ and decrements to 0+. Correct invariant: counter never goes negative.

Spec 3.6's actual `decrementCommentCount` query at `PostRepository.java:55-56` uses `> 0`. Plan must follow the existing convention. **Treat any `>= 0` in the brief or in this spec body as a brief-level error and use `> 0`.**

### R15. **`last_activity_at` is bumped by Spec 3.6's `incrementCommentCount` query — DO NOT copy-paste**

The actual increment query in `PostRepository.java:43-44`:

```java
@Modifying(clearAutomatically = true, flushAutomatically = true)
@Query("UPDATE Post p SET p.commentCount = p.commentCount + 1, p.lastActivityAt = CURRENT_TIMESTAMP WHERE p.id = :postId")
```

The `lastActivityAt = CURRENT_TIMESTAMP` clause is correct for comments (per R9, comments DO bump engagement) but **must be omitted for reactions and bookmarks** (per R9, they do NOT bump). When the plan author writes the new repo methods, they must NOT copy `incrementCommentCount` and merely change the field name — they must write fresh queries that exclude the timestamp clause:

```java
// Reactions:
@Query("UPDATE Post p SET p.prayingCount = p.prayingCount + 1 WHERE p.id = :postId")
@Query("UPDATE Post p SET p.prayingCount = p.prayingCount - 1 WHERE p.id = :postId AND p.prayingCount > 0")
@Query("UPDATE Post p SET p.candleCount = p.candleCount + 1 WHERE p.id = :postId")
@Query("UPDATE Post p SET p.candleCount = p.candleCount - 1 WHERE p.id = :postId AND p.candleCount > 0")

// Bookmarks:
@Query("UPDATE Post p SET p.bookmarkCount = p.bookmarkCount + 1 WHERE p.id = :postId")
@Query("UPDATE Post p SET p.bookmarkCount = p.bookmarkCount - 1 WHERE p.id = :postId AND p.bookmarkCount > 0")
```

(Method-name conventions match Spec 3.6's `incrementCommentCount` / `decrementCommentCount` pairing — use `incrementPrayingCount` / `decrementPrayingCount` etc.)

### R16. **Toggle-retry semantic — flag for the planner, not necessarily a blocker**

The brief's D5 ("composite key handles idempotency") is true ONLY for endpoints whose end-state is deterministic-by-key. **Toggle endpoints are NOT in that category.** A network-retry of the SAME `POST /reactions {reactionType:praying}` request:

- First call lands → row inserted, `state=added`
- Network drops the response
- Client retries the same call → composite key collision → toggle inverts → row deleted, `state=removed`
- Client now sees `state=removed` even though the user clicked "pray" once

The brief's `state: 'added' | 'removed'` field partially mitigates this — the client can detect the unexpected state and reconcile (e.g., re-issue the toggle). But it doesn't eliminate the surprise. Idempotency-Key cache (which the brief explicitly excludes) WOULD eliminate it.

**Plan author's call:** This is a known trade-off, not a correctness bug. Acceptable resolutions:

- **(a)** Ship as-is, document the retry semantic in the OpenAPI description, and rely on the frontend in Spec 3.10 to handle the `state` reconciliation.
- **(b)** Add a lightweight Idempotency-Key cache scoped just to the toggle endpoint (revert D5 partially).
- **(c)** Replace the toggle with explicit "set state" semantics: `POST /reactions { reactionType: 'praying', state: 'on' | 'off' }` — idempotent end-state.

Recommend **(a)** — the bookmark POST/DELETE pair already exhibits the same property (the brief accepts it there). The complexity of (b) or (c) isn't justified for a Phase 3 social-action endpoint where the user almost never sees a true network drop. Note this trade-off in the OpenAPI spec.

**The brief's everything else** — rate limits (60/hour each), no Idempotency-Key, no crisis detection, INTERCESSION on add only, SQL-side counter UPDATE with `>= 0` guard, parent-post visibility check via `PostSpecifications.visibleTo`, anonymous → 401, no `last_activity_at` bump, OWASP not used, separate POST/DELETE for bookmarks (no toggle), idempotent bookmark POST returns 200 vs 201, DELETE without `reactionType` returns 400 — all stand as written.

---

# Spec 3.7 — Reactions and Bookmarks Write Endpoints (Brief)

**Spec ID:** `round3-phase03-spec07-reactions-bookmarks-write`
**Master Plan body:** `_forums_master_plan/round3-master-plan.md` lines 3810-3826 (Spec 3.7) + Phase 3.7 Addendum
**Size:** L (backend + frontend + schema migration — three surfaces, but each surface is small)
**Risk:** Medium (per master plan)
**Prerequisites:** Spec 3.6 (Comments Write Endpoints) committed and shipped — `INTERCESSION` ActivityType present in both backend enum and frontend constants, `CommentsRateLimitConfig` and idempotency infrastructure available as reference, `CrisisDetectedEvent` already generalized to `(contentId, authorId, ContentType)`.
**Tier policy:** **xHigh throughout** (NOT MAX). Justification:
- No user-generated text → no crisis detection surface → no silent-safety-failure mode
- Established patterns: idempotency via composite-key constraints (simpler than 3.5's body-hash idempotency), counter increments via SQL-side UPDATEs (carry-over watch-for from 3.6), method-specific SecurityConfig rules (carry-over from 3.5)
- The one genuine new-architecture piece is the schema migration, which is small (one column added per table) and Liquibase changesets get extra scrutiny in code review by convention
- localStorage Pattern A migration is well-trodden (rule 11 covers it)

This calibrates the policy from earlier in the wave: MAX is reserved for crisis-detection / user-safety / security-boundary surfaces. 3.7 has none of these.

## Goal

Implement four endpoints + a schema migration + frontend hook/store extensions:

**Backend endpoints:**
- `POST /api/v1/posts/{postId}/reactions` — **toggle** a reaction by `reactionType` (`praying` or `candle`).
- `DELETE /api/v1/posts/{postId}/reactions?reactionType=praying` — explicit remove (idempotent — 204 whether row existed or not).
- `POST /api/v1/posts/{postId}/bookmark` — add bookmark (idempotent — 200 whether already present or new).
- `DELETE /api/v1/posts/{postId}/bookmark` — remove bookmark (idempotent — 204 whether present or not).

**Backend schema (single Liquibase changeset):**
- Add `reaction_type VARCHAR(20) NOT NULL` to `post_reactions` (with backfill of existing rows to `'praying'` BEFORE adding the new unique constraint).
- Replace existing `(post_id, user_id)` unique constraint with `(post_id, user_id, reaction_type)`.
- Add `candle_count INTEGER NOT NULL DEFAULT 0` to `posts`.

> **⚠ Recon override (R1, R2, R3):** This entire Liquibase block is OBSOLETE. `post_reactions.reaction_type` and the composite PK `(post_id, user_id, reaction_type)` already exist from Spec 3.1 changeset 016 (with CHECK `IN ('praying', 'candle')`). `posts.candle_count` already exists from Spec 3.1 changeset 014 with `INTEGER NOT NULL DEFAULT 0`. **Do NOT write a new changeset.** See "Pre-Execution Recon Findings" above for full detail.

**Frontend:**
- Extend `usePrayerReactions` hook with `toggleCandle(postId)` mirroring existing `togglePraying(postId)`.
- Migrate `wr_prayer_reactions` localStorage key from `Record<string, { praying: boolean }>` to `Record<string, { praying: boolean, candle: boolean }>` via Pattern A migration (per `.claude/rules/11-local-storage-keys.md`).
- Update `reactionsStore.ts` to handle the new shape; `useSyncExternalStore` subscription contract unchanged.
- All frontend changes ship behind the existing `VITE_USE_BACKEND_PRAYER_WALL=false` flag — backend wiring happens in Spec 3.10. This spec only updates LOCAL hook and store shape.

> **⚠ Recon override (R5, R10):** The current frontend type is `{ prayerId, isPraying, isBookmarked }` (NOT `{ praying }`). Migration target is `{ prayerId, isPraying, isBookmarked, isCandle }`. Field name is `isCandle` (matching the `is*` convention), not `candle`. The mock seed at `frontend/src/mocks/prayer-wall-mock-data.ts` also needs `isCandle: false` (or varied) on each entry. See Pre-Execution Recon Findings R5 and R10.

## Approach

Reuse infrastructure from 3.5 and 3.6:

- **Rate limiting:** `ReactionsRateLimitService` and `BookmarksRateLimitService` mirror `PostsRateLimitService` but with looser limits — reactions/bookmarks are low-friction social actions, not content creation. Suggested limits: **60 reactions/hour per user**, **60 bookmarks/hour per user**. Bounded Caffeine cache, same shape.
- **No idempotency-key header.** The composite database key `(post_id, user_id, reaction_type)` provides natural idempotency at the DB level — duplicate POSTs with the same reaction_type collapse to a no-op (or the toggle inverts, depending on prior state). Network retries that double-fire produce the SAME end state regardless. This is structurally simpler than 3.5/3.6's idempotency cache.
- **Activity engine integration:** Adding a reaction (either `praying` or `candle`, regardless of which) fires `recordActivity(INTERCESSION, "prayer-wall-reaction")`. Removing a reaction does NOT fire any activity (no negative points). Bookmarks NEVER fire activity events. The activity engine's per-user-per-day idempotency means multiple reactions across multiple posts on the same day still credit only once — that's the existing engine behavior, not new.
- **Counter denormalization:** All four operations use SQL-side `UPDATE posts SET <counter> = <counter> +/- 1 WHERE id = ? AND <counter> >= 0` patterns. NEVER load-modify-save in Java. Same race-safety rule from 3.6 watch-for #13.
- **`praying_count` and `candle_count` are independent counters.** A user with both praying AND candle on the same post contributes +1 to each. Both counters update transactionally with the row insert/delete.
- **Auth gate:** Method-specific SecurityConfig rules ABOVE `OPTIONAL_AUTH_PATTERNS` for: `POST/DELETE /api/v1/posts/*/reactions`, `POST/DELETE /api/v1/posts/*/bookmark`. Anonymous returns 401. Same gotcha 3.5 first caught.
- **Parent post visibility check:** Both endpoints verify the parent post is visible to the requester (not soft-deleted, visibility rules respected) using the same `PostSpecifications.visibleTo(viewerId)` pattern from 3.3 read endpoints. If the post isn't visible, return 404 (not 403 — same anti-enumeration pattern as the rest of the wave's reads).
- **Toggle response shape (reactions POST):** `{ data: { reactionType: 'praying' | 'candle', state: 'added' | 'removed', prayingCount: 42, candleCount: 5 }, meta: { requestId } }`. Status 201 on add, 200 on remove. The post's updated counters are returned in the body so the frontend can update its local cache without a re-read.
- **Bookmark response shape (POST):** `{ data: { bookmarked: true, bookmarkCount: 17 }, meta: { requestId } }`. Status 200.
- **Bookmark response shape (DELETE):** Status 204 with no body, OR 200 with `{ data: { bookmarked: false, bookmarkCount: 16 }, meta: { requestId } }`. **Recon item:** check what 3.5/3.6 returned for delete-success (Spec 3.5 returned 204 for DELETE post). 204 keeps consistency.

## Acceptance Criteria

From master plan body (lines 3818-3825):

- [ ] Reacting twice with the same reactionType does not double-count (toggle removes on second POST)
- [ ] Removing a reaction decrements the corresponding counter
- [ ] Bookmarking twice does not double-count (idempotent — second POST is no-op)
- [ ] Counters update transactionally with row insert/delete
- [ ] Reaction add fires INTERCESSION activity (faith points credited per-user-per-day idempotency)
- [ ] Reaction removal does NOT fire activity (no negative points)
- [ ] At least 15 integration tests

Add (recon-driven, not in master plan):

- [ ] `POST /reactions` with reactionType=praying when user has candle → adds praying (user now has both); `praying_count` +1, `candle_count` unchanged
- [ ] Existing `(post_id, user_id)` rows in `post_reactions` are backfilled to `reaction_type='praying'` BEFORE the new unique constraint is added (changeset ordering is critical)
- [ ] `candle_count` defaults to 0 for all existing rows in `posts`
- [ ] Anonymous POST/DELETE on reactions/bookmarks paths return 401
- [ ] React on soft-deleted post returns 404 (post not visible)
- [ ] React on private post owned by another user returns 404 (post not visible to viewer)
- [ ] Bookmark on soft-deleted post returns 404
- [ ] localStorage migration runs on first load with old-shape data, never re-runs after
- [ ] Frontend `togglePraying` and `toggleCandle` are independent (toggling one doesn't affect the other in localStorage)
- [ ] BB-45 reactive store subscription tests still pass after the shape change

> **Recon note on the two backfill-related criteria above:** Per R1, the backfill / constraint-replacement steps are no-ops (the schema is already correct). The plan should keep an assertion-style test that verifies the EXISTING schema state (every row has non-null `reaction_type`, the composite PK includes `reaction_type`, `candle_count` exists with default 0) so any future regression is caught.

## Divergences from Master Plan

### D1. POST is a toggle (per addendum); DELETE is an explicit remove (per master plan body)

Master plan body lists separate POST and DELETE endpoints. Addendum says POST toggles. Both endpoints exist:
- POST is the **toggle** — one round trip for the common UX action
- DELETE is **explicit removal** with `reactionType` query param — useful for cleanup paths that want to assert "make sure not reacted"

Frontend `togglePraying()` and `toggleCandle()` use POST. DELETE is reserved for future contexts (e.g., "delete my account → clear all reactions" batch flow).

**Why:** Toggle UX is one round trip; explicit DELETE has REST-correct semantics for the rare cleanup case. Both are cheap to implement once the service-layer toggle method exists.

### D2. Bookmarks use POST/DELETE split, NOT toggle

Bookmarks are inherently boolean (saved or not) and the user mental model is "save"/"unsave," not "react"/"unreact" as a single emotional gesture. POST is "save" (idempotent: 200 if already saved). DELETE is "unsave" (idempotent: 204 if not saved). No toggle endpoint.

**Why:** Different UX semantic from reactions. Bookmark buttons in feeds typically show distinct save/saved states with explicit user intent. Mirroring the reaction toggle pattern would feel surprising.

### D3. Reactions fire INTERCESSION activity; bookmarks fire nothing

Master plan body explicit: "Reactions fire activity events for intercession. Bookmarks do not earn points." `recordActivity(INTERCESSION, "prayer-wall-reaction")` on every reaction-add. Same `ActivityRequest` constructor pattern as 3.5/3.6: `new ActivityRequest(ActivityType.INTERCESSION, "prayer-wall-reaction", null)`.

**Why:** Bookmarks are a private organizational action, not community engagement. Praying for someone IS the community engagement.

### D4. NO crisis detection on reactions/bookmarks

No user-generated text → no detector needed. This is the only spec in Phase 3 write endpoints that doesn't ship a `*CrisisDetector` class.

### D5. NO Idempotency-Key header

The composite database key `(post_id, user_id, reaction_type)` for reactions and `(post_id, user_id)` for bookmarks provides natural idempotency. A network retry of the SAME POST request produces the SAME end state regardless of how many times it lands. Adding an idempotency cache layer would be redundant complexity.

**Why:** Schema-level idempotency is simpler and more robust than application-cache idempotency. The 3.5/3.6 idempotency layer was needed because comment/post creates have non-deterministic side effects (auto-generated UUIDs, created_at timestamps, crisis-flag detection state) that the client can't replay; reactions/bookmarks have deterministic-by-key end state.

### D6. NO edit window

Reactions and bookmarks have no "content" to edit. Toggle is the only mutation. Edit window concept doesn't apply.

### D7. Schema migration: backfill BEFORE adding new unique constraint

Liquibase changeset must follow this exact ordering within a single changeset:
1. `ALTER TABLE post_reactions ADD COLUMN reaction_type VARCHAR(20)` (nullable initially)
2. `UPDATE post_reactions SET reaction_type = 'praying' WHERE reaction_type IS NULL` (backfill ALL existing rows)
3. `ALTER TABLE post_reactions ALTER COLUMN reaction_type SET NOT NULL`
4. `ALTER TABLE post_reactions DROP CONSTRAINT post_reactions_post_id_user_id_key` (or whatever the existing unique constraint is named — recon needed)
5. `ALTER TABLE post_reactions ADD CONSTRAINT post_reactions_post_id_user_id_reaction_type_key UNIQUE (post_id, user_id, reaction_type)`
6. `ALTER TABLE posts ADD COLUMN candle_count INTEGER NOT NULL DEFAULT 0`

If any step fails mid-changeset, Liquibase rolls back the whole changeset (transactional DDL on Postgres). NEVER edit this changeset after it's committed — write a follow-up changeset for any later schema changes.

**Why:** Backfilling before the constraint is added avoids constraint violations on existing rows. Adding NOT NULL after backfill avoids NULL violations. The order is the only correct order.

> **⚠ Recon override of D7 (R1, R2, R3):** D7 is OBSOLETE. The schema work it describes was already done by Spec 3.1 changesets 014 and 016 (shipped 2026-04-27). The actual on-disk state already matches the desired end state of D7's steps. **No new changeset is required.** Do NOT add a changeset that re-attempts these steps — Liquibase will either no-op them (if it detects matching state) or fail loudly (if it tries to ADD a column that exists). The plan should include a single integration test that verifies the existing schema invariants (`reaction_type` is NOT NULL on all rows, the composite PK is `(post_id, user_id, reaction_type)`, `posts.candle_count` exists with default 0) so any future schema drift is caught.

### D8. Rate limit: 60/hour for both reactions and bookmarks

Master plan does not specify rate limits for either. Mirror the social-action shape:
- Posts: 5/hour (high-friction content creation)
- Comments: 30/hour (medium-friction reply)
- Reactions: 60/hour (low-friction social signal)
- Bookmarks: 60/hour (low-friction personal organization)

**Why:** A user reading their feed and reacting to many posts in a session shouldn't hit the rate limit organically. 60/hour ≈ one per minute sustained, which is well above realistic usage. Abuse-prevention floor.

### D9. localStorage Pattern A migration ships in this spec

`wr_prayer_reactions` shape changes from `Record<string, { praying: boolean }>` to `Record<string, { praying: boolean, candle: boolean }>` via Pattern A migration per rule 11:
- Bump `wr_prayer_reactions_version` from current value to next
- On read, if version is old: transform each entry by adding `candle: false`, write back with new version
- After migration, treat all entries as new-shape

**Why:** Pre-existing localStorage data in users' browsers must continue to work. Pattern A is the established Worship Room migration approach.

> **⚠ Recon override of D9 (R5):** The actual existing shape is `Record<string, { prayerId, isPraying, isBookmarked }>`. The migration adds a single field `isCandle: boolean` (default `false`). The simpler implementation: loosen the `isValidReaction` guard to treat `isCandle` as optional, default-fill to `false` on read, write back. No version key is required for a single-field additive migration where the missing field has a safe default. (A version key is justified when the migration is non-additive or has multiple fields — neither applies here.) See R5 for full detail.

### D10. Counter increments use SQL-side UPDATE; decrements have `>= 0` guard

Carry-over from 3.6 watch-for #13. NEVER load-modify-save. Decrements use `WHERE counter >= 0` to prevent negatives under any race or buggy double-toggle.

**Why:** Concurrent reactions on a popular post would lose updates with Java-side increment. The guard prevents drift even under failure cases.

### D11. `state` field in toggle response is `'added'` or `'removed'`

The POST /reactions toggle returns `state: 'added' | 'removed'` so the frontend knows which way the toggle went without checking before/after counters. Without this field, a network reorder (request goes 1→2 in client, lands 2→1 on server) could leave the frontend cache wrong.

**Why:** Toggle endpoints are inherently ambiguous — "what state am I in now?" must be in the response. Counter values alone are insufficient because they could change between the user's two clicks for unrelated reasons (other users reacting concurrently).

## Watch-Fors (Inherited + New)

### Inherited from 3.5/3.6

1. **SQL-side counter updates.** All four operations use UPDATE statements, not load-modify-save.
2. **Activity engine inside same `@Transactional` boundary.** No separate transaction for the activity record.
3. **SecurityConfig method-specific rules above OPTIONAL_AUTH_PATTERNS.** Without this, anonymous POST/DELETE slips through `permitAll()` for `/api/v1/posts/*` patterns.
4. **Bounded Caffeine caches.** ReactionsRateLimitService and BookmarksRateLimitService each use bounded buckets (10k entries, 2h expireAfterAccess).
5. **`@RestControllerAdvice` package-scoped.** New exception handlers scoped to wherever the new controller lives (likely a new package `com.worshiproom.post.reaction` and `com.worshiproom.post.bookmark`, OR consolidated into PostController — recon decides).
6. **Liquibase changeset filename convention.** Recon must verify the next changeset number after Spec 3.5/3.6's changesets.
7. **OpenAPI extension at `backend/src/main/resources/openapi.yaml`** — extend, not replace.

> **Recon override of #5 and #6 (R3, R4):** The new code lives in the existing `com.worshiproom.post.engagement/` package. New `@RestControllerAdvice` (if needed for filter-raised exceptions) goes there. NO new Liquibase changeset is needed (R3), so #6 doesn't apply.

### New to Spec 3.7

8. **Existing `post_reactions` row backfill before constraint change.** Order matters: backfill THEN constraint replace. Reverse order fails on existing data.

> **Recon override (R1):** Obsolete — the constraint work is already done.

9. **`candle_count` default 0 on all existing posts.** Liquibase `DEFAULT 0 NOT NULL` ensures this; verify the changeset has both `defaultValueNumeric="0"` and `constraints nullable="false"`.

> **Recon override (R2):** Already done by Spec 3.1 changeset 014 with `defaultValueNumeric="0"` + `constraints nullable="false"`. Plan should add an assertion test that confirms this invariant continues to hold.

10. **Frontend hook signature stability.** `usePrayerReactions` returns must keep all existing fields (BB-45 subscription test guards this). New `toggleCandle` and `candle: boolean` field added; nothing existing renamed or removed.
11. **localStorage version bump tested.** Add test that simulates loading old-shape localStorage data, runs the hook initialization, asserts new-shape data is written back.

> **Recon override (R5):** Field is `isCandle: boolean`, not `candle: boolean`. No version bump is required (additive migration with safe default). The test still applies — load old-shape (3-field) data, hydrate, assert new-shape (4-field) data written back.

12. **Activity engine called only on REACTION ADD path, not REMOVE.** Test asserts: 5 toggles (add → remove → add → remove → add) on the same post on the same day fires `recordActivity` 3 times (each ADD), and the activity engine's per-day idempotency means only the first credits points.
13. **Bookmark NEVER fires activity.** Test asserts: bookmark add does NOT result in any `recordActivity` call.
14. **Toggle response counters are post-mutation, not pre-mutation.** If user is the 5th person to pray and toggles ADD, response shows `prayingCount: 5`. If they then toggle REMOVE, response shows `prayingCount: 4`. Test the math.
15. **`reactionType` validation rejects unknown values.** Body validation: `reactionType IN ('praying', 'candle')`. Anything else returns 400 INVALID_INPUT. NOT a 500 from a JPA constraint violation downstream.

> **Recon note (R12):** Validation is a `@Pattern(regexp = "^(praying|candle)$")` on the request String field, NOT a Java enum. The existing `PostReaction.reactionType` is a String for forward-compat with Phase 6.6 widening (`praising`, `celebrate`).

16. **DELETE without `reactionType` query param returns 400.** Don't silently delete all reactions; require explicit type.
17. **Parent post visibility uses `PostSpecifications.visibleTo(viewerId)`.** Don't reinvent the visibility check; reuse the existing spec from 3.3.
18. **Idempotent bookmark POST returns 200, not 201, when row already exists.** New row → 201; existing row → 200. Frontend can ignore the difference; semantic correctness for clients that care.
19. **Reactive store BB-45 subscription test count.** Recon should locate this test file and verify the existing assertions don't break under shape change. May need to extend tests for `candle` paths.

> **Recon location finding (R11):** BB-45 subscription tests live at `frontend/src/lib/prayer-wall/__tests__/reactionsStore.test.ts` AND `frontend/src/hooks/__tests__/usePrayerReactions.subscription.test.tsx`. Both must be extended.

## Pattern Reuse Map (from Spec 3.5/3.6)

| 3.5/3.6 component | 3.7 use |
|---|---|
| `PostsRateLimitService` (Caffeine + bucket4j) | Mirror as `ReactionsRateLimitService` (60/hour) and `BookmarksRateLimitService` (60/hour). |
| `PostsRateLimitException` (with `Retry-After`) | Mirror as `ReactionsRateLimitException` and `BookmarksRateLimitException`. Friendly messages. |
| `PostsRateLimitConfig` `@ConfigurationProperties` | Mirror as `ReactionsRateLimitConfig` and `BookmarksRateLimitConfig`. |
| `PostExceptionHandler` `@RestControllerAdvice` (package-scoped) | New `ReactionExceptionHandler` and `BookmarkExceptionHandler` (or one shared if controllers consolidated). |
| Method-specific `requestMatchers` in SecurityConfig | Add four new rules: POST+DELETE for /reactions, POST+DELETE for /bookmark. |
| `PostSpecifications.visibleTo(viewerId)` | Reuse for parent-post visibility check. |
| `application.properties` rate-limit keys | Add: `worshiproom.reactions.rate-limit.max-per-hour=60`, `worshiproom.bookmarks.rate-limit.max-per-hour=60`. |
| `ActivityType.INTERCESSION` (added by 3.6) | Used for reaction-add activity events. |
| `recordActivity(ActivityRequest)` from `ActivityService` | Called inside service-layer toggle method on ADD only. |
| Liquibase changeset pattern | New changeset following the 3.1/3.2 numbering convention (recon verifies next number). |
| OWASP HTML Sanitizer | NOT USED — no user-generated text. |
| `*CrisisDetector` | NOT USED — no user-generated text. |
| Idempotency-Key header / cache services | NOT USED — composite-key DB constraint suffices. |

> **Recon override (R3):** "Liquibase changeset pattern" row is OBSOLETE — no new changeset is needed.

## Recon Items (CC must verify before writing the spec)

> **All 13 items resolved** — see "Pre-Execution Recon Findings" at the top of this document. Quick reference:
>
> 1. ✅ `post_reactions` schema: confirmed has `reaction_type` already with composite PK `(post_id, user_id, reaction_type)`. Existing PK constraint name: `pk_post_reactions`.
> 2. ✅ `post_bookmarks` schema: confirmed `(post_id, user_id)` composite PK named `pk_post_bookmarks`, plus `created_at`. No extra columns.
> 3. ✅ `posts.praying_count` and `posts.bookmark_count` exist (Spec 3.1 changeset 014).
> 4. ✅ Wait — `posts.candle_count` ALSO already exists (Spec 3.1 changeset 014). The brief's premise that it doesn't is wrong. See R2.
> 5. ✅ Test data: dev-context seed `2026-04-27-021-prayer-wall-mock-seed.xml` may seed `post_reactions` rows; if so, all such rows already have `reaction_type='praying'` (defaultValue). Production / test contexts have zero rows. Backfill is unnecessary in all environments.
> 6. ✅ Next Liquibase changeset number: NOT NEEDED (no new changeset). For reference, the next sequential number after Spec 3.5/3.6 work is whatever those specs landed; recent files include `2026-04-27-020-relax-post-reports-review-consistency.xml`. The plan's only Liquibase action is to confirm existing state via test, not to add a file.
> 7. ✅ `PostSpecifications.visibleTo(viewerId)` exists in `backend/src/main/java/com/worshiproom/post/PostSpecifications.java` from Spec 3.3.
> 8. ✅ `ActivityType.INTERCESSION` is in the enum (Spec 3.6).
> 9. ✅ `usePrayerReactions` hook current shape: returns `{ reactions, togglePraying, toggleBookmark }`. The `reactions` value is `Record<string, PrayerReaction>` where `PrayerReaction = { prayerId, isPraying, isBookmarked }`. `togglePraying(prayerId): boolean` returns the PREVIOUS isPraying. `toggleBookmark(prayerId): void`. Subscribes via `useSyncExternalStore`. New `toggleCandle(prayerId): boolean` mirrors `togglePraying`.
> 10. ✅ Pattern A migration: per rule 11, `wr_*_version` keys can be used for non-trivial migrations. For a single-field additive migration with a safe default, the simpler "loosen guard + default-fill on read" pattern is acceptable. R5 details.
> 11. ✅ `wr_prayer_reactions_version`: does NOT exist; not needed for this migration (R5).
> 12. ✅ BB-45 subscription tests: `frontend/src/lib/prayer-wall/__tests__/reactionsStore.test.ts` AND `frontend/src/hooks/__tests__/usePrayerReactions.subscription.test.tsx`. Both extended.
> 13. ✅ Decision on packaging: **CONSOLIDATE in `com.worshiproom.post.engagement/`**. The package already has read-side service + entities + DTOs. Add `ReactionWriteService` and `BookmarkWriteService` alongside `EngagementService`. Extend `PostController` with the four new endpoints (`/api/v1` already mapped). One package, two write services, one controller. R4 details.

## Files (Expected Surface)

> **Recon override of the entire "Files" section (R4):** The brief proposes `com.worshiproom.post.reaction/` and `com.worshiproom.post.bookmark/` packages with separate controllers. The actual codebase consolidates both in `com.worshiproom.post.engagement/`. The corrected surface is below; the brief's list is preserved beneath as historical context but should NOT be the planner's reference.

**Corrected surface (per recon):**

**New (production):**
- `backend/src/main/java/com/worshiproom/post/engagement/ReactionWriteService.java` — toggles `post_reactions` rows, updates `posts.praying_count` / `posts.candle_count` via SQL-side UPDATE, fires INTERCESSION on add only.
- `backend/src/main/java/com/worshiproom/post/engagement/BookmarkWriteService.java` — idempotent insert/delete on `post_bookmarks`, updates `posts.bookmark_count`.
- `backend/src/main/java/com/worshiproom/post/engagement/ReactionsRateLimitConfig.java` (`@ConfigurationProperties("worshiproom.reactions.rate-limit")`).
- `backend/src/main/java/com/worshiproom/post/engagement/ReactionsRateLimitService.java`.
- `backend/src/main/java/com/worshiproom/post/engagement/ReactionsRateLimitException.java`.
- `backend/src/main/java/com/worshiproom/post/engagement/BookmarksRateLimitConfig.java` (`@ConfigurationProperties("worshiproom.bookmarks.rate-limit")`).
- `backend/src/main/java/com/worshiproom/post/engagement/BookmarksRateLimitService.java`.
- `backend/src/main/java/com/worshiproom/post/engagement/BookmarksRateLimitException.java`.
- `backend/src/main/java/com/worshiproom/post/engagement/EngagementExceptionHandler.java` — package-scoped `@RestControllerAdvice(basePackages = "com.worshiproom.post.engagement")` for the new rate-limit exceptions. Plus an unscoped companion advice (or `HandlerExceptionResolver` delegation from any new filter, if introduced) for filter-raised exceptions per `03-backend-standards.md` § "@RestControllerAdvice Scoping".
- `backend/src/main/java/com/worshiproom/post/engagement/dto/ToggleReactionRequest.java` — record `{ String reactionType }` with `@Pattern(regexp = "^(praying|candle)$")`.
- `backend/src/main/java/com/worshiproom/post/engagement/dto/ToggleReactionResponse.java` — record `{ String reactionType, String state, int prayingCount, int candleCount }` (state ∈ {"added","removed"}). Wrapped in standard `ProxyResponse<...>` shape with `meta.requestId`.
- `backend/src/main/java/com/worshiproom/post/engagement/dto/BookmarkResponse.java` — record `{ boolean bookmarked, int bookmarkCount }`. Used for POST. DELETE returns 204 with no body (consistent with Spec 3.5 DELETE).

**Modified (production):**
- `backend/src/main/java/com/worshiproom/post/Post.java` — verify `candleCount` getter exists; add if missing. (Field/column already exists; entity may already map it — recon during plan.)
- `backend/src/main/java/com/worshiproom/post/PostController.java` — add four endpoints: `POST /posts/{id}/reactions`, `DELETE /posts/{id}/reactions`, `POST /posts/{id}/bookmark`, `DELETE /posts/{id}/bookmark`. Inject `ReactionWriteService`, `BookmarkWriteService`, the two rate-limit services. Auth via `@AuthenticationPrincipal AuthenticatedUser` (existing pattern).
- `backend/src/main/java/com/worshiproom/post/engagement/EngagementService.java` — extend `reactionsFor` to include candle reactions (R6 path (a)) by querying both `'praying'` and `'candle'` types and accumulating into `PerPostReaction`. (Defer to Spec 3.10 if planner downsizes per R6 path (b).)
- `backend/src/main/java/com/worshiproom/post/engagement/ReactionRepository.java` — add a write-side helper if needed (otherwise rely on `JpaRepository.save(...)` and `findById(...)`); add `existsByPostIdAndUserIdAndReactionType` and `deleteByPostIdAndUserIdAndReactionType` queries.
- `backend/src/main/java/com/worshiproom/post/engagement/BookmarkRepository.java` — add `existsByPostIdAndUserId`, `deleteByPostIdAndUserId`.
- `backend/src/main/java/com/worshiproom/post/PostRepository.java` — add SQL-side counter UPDATE queries (`@Modifying` + `@Query`): `incrementPrayingCount(UUID postId)`, `decrementPrayingCount(UUID postId)`, `incrementCandleCount(UUID postId)`, `decrementCandleCount(UUID postId)`, `incrementBookmarkCount(UUID postId)`, `decrementBookmarkCount(UUID postId)`. Each decrement uses `WHERE counter >= 0` guard — see D10. NO `last_activity_at` bump per R9.
- `backend/src/main/java/com/worshiproom/post/engagement/dto/PerPostReaction.java` — extend with `boolean isCandle` field if R6 path (a). (Defer if R6 path (b).)
- `backend/src/main/java/com/worshiproom/auth/SecurityConfig.java` — add four method-specific `requestMatchers` per R7.
- `backend/src/main/resources/application.properties` — add `worshiproom.reactions.rate-limit.max-per-hour=60` and `worshiproom.bookmarks.rate-limit.max-per-hour=60`.
- `backend/src/main/resources/openapi.yaml` — add 4 new paths + ToggleReactionRequest/Response and BookmarkResponse schemas. Extend, do not replace.
- `frontend/src/types/prayer-wall.ts` — extend `PrayerReaction` with `isCandle: boolean`.
- `frontend/src/lib/prayer-wall/reactionsStore.ts` — loosen `isValidReaction` to accept missing `isCandle`; default-fill to `false` on hydrate; write back; add `toggleCandle(prayerId): boolean` mirroring `togglePraying`.
- `frontend/src/hooks/usePrayerReactions.ts` — add `toggleCandle` to the returned shape. Update return type signature.
- `frontend/src/mocks/prayer-wall-mock-data.ts` — add `isCandle: false` to each entry produced by `getMockReactions()`. Optional: vary `isCandle` across some entries for dev/QA realism.

**Modified (tests):**
- `frontend/src/lib/prayer-wall/__tests__/reactionsStore.test.ts` — extend BB-45 subscription tests for `toggleCandle`; add migration test (load 3-field old-shape data, assert 4-field new-shape after hydration); assert `toggleCandle` independence from `togglePraying` and `toggleBookmark`.
- `frontend/src/hooks/__tests__/usePrayerReactions.subscription.test.tsx` — extend for candle subscription path.

**NOT modified** (per R3): No new Liquibase changeset; `db.changelog-master.xml` and `db/changelog/changesets/` untouched.

---

**Brief's original Files surface (preserved for traceability — DO NOT FOLLOW):**

The brief listed:
- `backend/src/main/resources/db/changelog/changesets/0XX-add-reaction-type-and-candle-count.xml` — OBSOLETE per R3
- `backend/src/main/java/com/worshiproom/post/reaction/*` package — OBSOLETE per R4 (consolidated in `engagement/`)
- `backend/src/main/java/com/worshiproom/post/reaction/ReactionType.java` (enum) — OBSOLETE per R12 (use String + `@Pattern`)
- `backend/src/main/java/com/worshiproom/post/bookmark/*` package — OBSOLETE per R4

## Test Plan

Target ~30 tests total (master plan acceptance: "at least 15 integration tests"; aim higher to match coverage discipline from 3.5/3.6).

**Unit (~10):**
- `ReactionsRateLimitServiceTest` — 4 (within limit, 60th OK, 61st throws, custom max)
- `BookmarksRateLimitServiceTest` — 3 (mirror)
- `ReactionWriteServiceTest` — 5 (toggle add → row inserted + counter +1 + activity fired; toggle same type → row removed + counter -1 + NO activity; toggle different type → row added separately; soft-deleted post → 404; non-visible private post → 404)
- `BookmarkWriteServiceTest` — 3 (POST when absent → row inserted + 201, POST when present → no-op + 200, DELETE idempotent)

**Integration (~20):**
- `ReactionWriteIntegrationTest extends AbstractIntegrationTest`
  - POST praying happy paths (~3): toggle to add, toggle to remove, toggle different type (praying then candle = both)
  - POST praying validation (~3): missing reactionType, invalid reactionType value, body deserialization error
  - POST praying auth (~2): no JWT 401, invalid JWT 401
  - POST praying rate limiting (~1): 60th OK, 61st returns 429
  - POST praying counter math (~2): praying_count and candle_count update independently and correctly
  - POST praying activity (~2): ADD fires INTERCESSION, REMOVE does NOT fire
  - POST praying visibility (~2): soft-deleted post 404, non-visible private post 404
  - DELETE praying (~2): idempotent (whether row exists or not), missing reactionType query param 400
- `BookmarkWriteIntegrationTest extends AbstractIntegrationTest`
  - POST happy paths (~2): new bookmark 201, duplicate 200
  - POST auth (~2)
  - POST rate limiting (~1): 60th OK, 61st 429
  - POST visibility (~2): soft-deleted 404, private not-visible 404
  - POST counter (~1): bookmark_count increments correctly
  - DELETE (~2): idempotent
  - Activity (~1): bookmark NEVER fires activity (assert via mock verification)

**Liquibase / schema invariant test (~1):**
- Apply existing changesets to a fresh Testcontainers DB. Assert: `post_reactions.reaction_type` is NOT NULL with CHECK `IN ('praying','candle')`, primary key columns are `(post_id, user_id, reaction_type)`, `posts.candle_count` exists with default 0. (Per R3, this is an EXISTING-state invariant test, not a new-changeset application test.)

**Frontend tests (~5-7):**
- `reactionsStore.test.ts` — extend BB-45 subscription tests:
  - `toggleCandle` updates only the `isCandle` field, not `isPraying` or `isBookmarked`
  - `togglePraying` updates only `isPraying`, not `isCandle` or `isBookmarked`
  - `toggleBookmark` updates only `isBookmarked`, not the others
  - Reading 3-field old-shape localStorage triggers hydration default-fill, writes 4-field new-shape
  - Migration is idempotent (running hydration twice on already-migrated data is a no-op)
- `usePrayerReactions.subscription.test.tsx` — extend with a candle-path subscription test that mutates the store after mount and asserts re-render

## Out of Scope

- Backend wiring for the frontend reaction/bookmark hooks (Spec 3.10 — Frontend Service API Implementations)
- Reactive store backend hydration on login (Spec 3.11)
- `VITE_USE_BACKEND_PRAYER_WALL=true` cutover (Spec 3.12)
- Per-post reaction breakdown by user (e.g., "show me everyone who prayed for this") — future spec
- Notification when someone prays for your post — future spec
- Bookmark folders / organization — future spec
- Aggregate reaction analytics — future spec
- Crisis detection on reactions — N/A, no text content

## Strict Rules (DO NOT)

- Do NOT add a third reaction type. The schema is `praying` and `candle` only. Future reaction types (heart, hug, etc.) require their own spec with their own counter column.
- Do NOT use load-modify-save for counter updates. SQL-side UPDATE only.
- Do NOT fire activity on reaction REMOVE. No negative points.
- Do NOT fire activity on bookmark add or remove. Bookmarks are private organization, not engagement.
- Do NOT skip the existing-row backfill in the Liquibase changeset. Order is: ADD column → BACKFILL → SET NOT NULL → DROP old constraint → ADD new constraint → ADD candle_count.
   - **Recon override (R1, R3):** Obsolete — no new changeset.
- Do NOT edit the changeset after committing. Liquibase MD5 is permanent. Any later schema change ships in a new changeset.
   - **Still applies retroactively:** Do NOT edit changesets 014 or 016 (they are committed and have permanent MD5s in DATABASECHANGELOG).
- Do NOT use Idempotency-Key header / cache. The DB composite key handles idempotency.
- Do NOT bump `last_activity_at` on reactions or bookmarks. The post's "engagement" timestamp is conceptually about content engagement (comments), not reactions.
  - **Recon resolution (R9):** Confirmed. The `BUMPED` sort uses `last_activity_at`; reactions/bookmarks must not artificially promote posts.
- Do NOT roll back the localStorage migration. Pattern A is one-way: bump version, transform shape, write back. Users on old code who load the new shape see no error (the new fields default safely).
- Do NOT create a `wr_prayer_reactions_v2` key. Keep the same key name; bump the internal version field.
   - **Recon override (R5):** No version field is needed for this migration. Same key, additive shape with safe default.
- Do NOT modify other Phase 0.5 reactive store keys. Only `wr_prayer_reactions` shape changes.
- Do NOT create a Java `ReactionType` enum. Use `String` + `@Pattern` validator (R12).
- Do NOT create new `com.worshiproom.post.reaction/` or `com.worshiproom.post.bookmark/` packages. Consolidate in existing `com.worshiproom.post.engagement/` (R4).

## Tier Reaffirmation

Run **xHigh** through the full pipeline:
- `/spec-forums spec-3-7` (with this brief)
- `/plan-forums` (with the spec output)
- `/execute-plan-forums` (with the plan output)
- `/code-review _plans/forums/2026-XX-XX-spec-3-7.md --spec _specs/forums/spec-3-7.md`

If you want extra conservatism on the schema migration specifically, MAX is reasonable for the Liquibase-changeset-bearing steps only. Otherwise xHigh is calibrated correctly.

> **Recon note:** Since R3 eliminated the new Liquibase changeset, the "MAX-on-changeset" carve-out is moot. xHigh through the full pipeline.
