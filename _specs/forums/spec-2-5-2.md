# Forums Wave: Spec 2.5.2 — Friends Service & Repository (Phase 2.5 Backend Logic)

**Master Plan Reference:** `_forums_master_plan/round3-master-plan.md` → Decision 8 (lines 1131–1196), Spec 2.5.2 body (lines 3282–3312)
**Branch:** `forums-wave-continued` (stay on this branch — no per-spec sub-branch)
**Date:** 2026-04-27

---

## Affected Frontend Routes

N/A — backend-only spec. No frontend code touched. This spec defines the JPA entities, repositories, service, DTOs, and domain exceptions that Spec 2.5.3 (HTTP endpoints) and Spec 2.5.4 (frontend dual-write) build on. User-facing behavior does not change in this spec.

---

## Spec Header

- **ID:** `round3-phase02-5-spec02-friends-service`
- **Size:** L
- **Risk:** Medium (transactional accept-flow, denormalized DTO query, duplicate-request translation, FK CASCADE interactions)
- **Prerequisites:** 2.5.1 ✅ shipped (four tables created via changesets 2026-04-27-009 through 2026-04-27-012)
- **Phase:** 2.5 — Friends + Social Migration (Dual-Write)
- **Second spec of Phase 2.5.** This is the brain of the wave — Spec 2.5.3 wraps HTTP around it; Spec 2.5.4 wires the frontend dual-write. Get the service correct here and 2.5.3/2.5.4 are mechanical.

---

## STAY ON BRANCH

Same as 2.5.1. Stay on `forums-wave-continued`. No `git checkout`, `git branch`, `git commit`, `git push`, `git stash`, `git reset`. Eric handles git manually.

---

## Goal

Build the backend Java layer for Phase 2.5: JPA entities for the four tables shipped in 2.5.1, repositories with custom queries, a `FriendsService` exposing the ten domain operations from Decision 8, domain exceptions for the four error states, and the `FriendDto` denormalized response shape with the per-friend join (level / streak / faithPoints / weeklyPoints / lastActive). Plus 25+ integration tests covering happy paths, edge cases, the FULL UNIQUE anti-harassment behavior, FK CASCADE on user delete, and the mutual-friendship transactional shape.

This is the brain of Phase 2.5. Spec 2.5.3 wraps HTTP around it; Spec 2.5.4 wires the frontend dual-write. Get the service correct here and 2.5.3/2.5.4 are mechanical.

---

## Master Plan Divergence

Three small divergences worth flagging upfront so CC's recon doesn't get confused.

### Divergence 1: Service does NOT include "list social interactions" or "list milestone events" operations

**What the master plan says:** Decision 8 (line 1196 area) and the `social_interactions` / `milestone_events` schemas were created in Spec 2.5.1 alongside friends, suggesting some unification.

**What this brief says:** This spec covers ONLY friends and friend-requests operations. Social interactions and milestone events are write-only paths owned by Spec 2.5.4b (`SocialInteractionsService` + `MilestoneEventsService`, separate package `com.worshiproom.social`). 2.5.2 does not touch those tables.

**Why:** Per master plan Spec 2.5.4b body (lines 3367+), social_interactions and milestone_events get their own controllers/services in a separate package. Bundling them here would expand 2.5.2 from L to XL and conflate two unrelated domains. Schema lives together (one Liquibase wave); code lives separately.

### Divergence 2: `FriendDto.lastActive` returns whatever is in `users.last_active_at` — possibly always NULL today

**What the master plan says:** Decision 8 line 1187 says `lastActive: string  // ISO timestamp from users.last_active_at`.

**What this brief says:** Service queries `users.last_active_at` and returns it. Recon (and grep) confirms there is currently NO code path in Phase 1 / Phase 2 that SETS `users.last_active_at` — the column was added to the schema in Spec 1.3 but `JwtAuthenticationFilter` and the activity engine don't update it. So `FriendDto.lastActive` will be NULL for all friends until a separate spec wires last-active-write.

**Why:** Wiring `last_active_at` updates is a separate concern (which filter sets it? on every request, or every authed request, or every activity?). It doesn't belong in 2.5.2. The DTO field is plumbed correctly today; the data populates whenever last-active-write ships. Add a followup entry in `_plans/post-1.10-followups.md` titled "Wire `users.last_active_at` updates" with revisit criteria "before Phase 2.5 frontend dual-write reads from backend friends data" (which is never during Phase 2.5 wave — reads stay localStorage).

### Divergence 3: "Block also removes any pending requests" means DELETE, not status update

**What the master plan says:** Spec 2.5.2 acceptance criterion line 3309 says "Block also removes any pending requests between the two users" — ambiguous on delete-vs-cancel.

**What this brief says:** Block performs a hard `DELETE FROM friend_requests WHERE (from_user_id, to_user_id) IN ((blocker, blocked), (blocked, blocker)) AND status='pending'`. Not a status update.

**Why:** Two reasons. First, a request that's been actively cancelled by the sender already has `status='cancelled'` — using cancellation here would conflate "user explicitly cancelled" with "system auto-cleared because a block happened." Second, the FULL UNIQUE constraint on `(from_user_id, to_user_id)` means any non-deleted request row blocks future requests forever. If a user blocks then unblocks the same person and wants to start fresh, the old pending row stuck at `cancelled` would prevent any new request. DELETE here gives unblock-then-request a clean slate (and is consistent with the anti-harassment policy: blocking is a stronger signal than cancelling, so it gets stronger cleanup). Already-resolved requests (status `accepted` / `declined` / `cancelled`) are LEFT IN PLACE — block only deletes `pending`.

---

## JPA Entities

Four entities matching the four tables from 2.5.1. Mirror the existing patterns from `com.worshiproom.activity` (composite PKs via `@IdClass`, OffsetDateTime for timestamps, explicit constructor injection in services).

### `FriendRelationship` (composite PK via `@IdClass(FriendRelationshipId.class)`)

Fields:
- `userId: UUID` — `@Id`, column `user_id`
- `friendUserId: UUID` — `@Id`, column `friend_user_id`
- `status: FriendRelationshipStatus` — VARCHAR(20), see enum below
- `createdAt: OffsetDateTime` — column `created_at`, set by DB default

**Pattern reference:** mirror `UserBadge` + `UserBadgeId` exactly (same shape). `FriendRelationshipId` is a record-style class (or POJO, whichever pattern UserBadgeId uses) with `userId` and `friendUserId` fields, equals/hashCode generated.

### `FriendRequest` (UUID PK)

Fields:
- `id: UUID` — `@Id @GeneratedValue(strategy = GenerationType.UUID)`
- `fromUserId: UUID` — column `from_user_id`
- `toUserId: UUID` — column `to_user_id`
- `status: FriendRequestStatus` — VARCHAR(20), see enum below
- `message: String` — column `message`, nullable, max length 280
- `createdAt: OffsetDateTime` — set by DB default
- `respondedAt: OffsetDateTime` — nullable, set by service when status transitions away from `pending`

### Enums (CHECK constraint mirror, application-layer)

```java
public enum FriendRelationshipStatus {
  ACTIVE("active"),
  BLOCKED("blocked");
  // ... value() / fromValue() helpers per existing CountType / ActivityType pattern
}

public enum FriendRequestStatus {
  PENDING("pending"),
  ACCEPTED("accepted"),
  DECLINED("declined"),
  CANCELLED("cancelled");
  // ... same helper shape
}
```

Pattern reference: `ActivityType.java` and `CountType.java` are the canonical enum-with-string-value shape in the codebase. Use the same pattern (not the JPA `@Convert` route — those exist for `DisplayNamePreference` but the activity package's pattern is simpler and more recent).

---

## Repositories

### `FriendRelationshipRepository extends JpaRepository<FriendRelationship, FriendRelationshipId>`

Query methods needed:

```java
List<FriendRelationship> findAllByUserIdAndStatus(UUID userId, FriendRelationshipStatus status);
Optional<FriendRelationship> findByUserIdAndFriendUserId(UUID userId, UUID friendUserId);
boolean existsByUserIdAndFriendUserIdAndStatus(UUID userId, UUID friendUserId, FriendRelationshipStatus status);

// For "is X blocked by Y or Y blocked by X?" — covers both directions in one query
@Query("SELECT COUNT(fr) > 0 FROM FriendRelationship fr WHERE " +
       "((fr.userId = :a AND fr.friendUserId = :b) OR (fr.userId = :b AND fr.friendUserId = :a)) " +
       "AND fr.status = 'BLOCKED'")
boolean isEitherDirectionBlocked(@Param("a") UUID a, @Param("b") UUID b);

// Bulk delete on remove-friend (kills both rows in one statement)
@Modifying
@Query("DELETE FROM FriendRelationship fr WHERE " +
       "(fr.userId = :a AND fr.friendUserId = :b) OR (fr.userId = :b AND fr.friendUserId = :a)")
int deleteBothDirections(@Param("a") UUID a, @Param("b") UUID b);
```

### `FriendRequestRepository extends JpaRepository<FriendRequest, UUID>`

Query methods needed:

```java
List<FriendRequest> findAllByToUserIdAndStatus(UUID toUserId, FriendRequestStatus status);
List<FriendRequest> findAllByFromUserIdAndStatus(UUID fromUserId, FriendRequestStatus status);
Optional<FriendRequest> findByFromUserIdAndToUserId(UUID fromUserId, UUID toUserId);

// For block: delete pending requests in either direction
@Modifying
@Query("DELETE FROM FriendRequest fr WHERE " +
       "((fr.fromUserId = :a AND fr.toUserId = :b) OR (fr.fromUserId = :b AND fr.toUserId = :a)) " +
       "AND fr.status = 'PENDING'")
int deletePendingBetween(@Param("a") UUID a, @Param("b") UUID b);
```

### Native query for the friends-list denormalization (Decision 8 mandate)

The friends-list endpoint must return per-friend `level / levelName / currentStreak / faithPoints / weeklyPoints / lastActive` in a single aggregating query (Decision 8 explicitly forbids per-friend lookups). JPQL can't easily express the SUM over a windowed activity_log slice; use a native query with a projection:

```java
// In FriendRelationshipRepository (or a new FriendsQueryRepository if cleaner)
@Query(value = """
  SELECT
    u.id              AS friend_user_id,
    u.first_name      AS first_name,
    u.last_name       AS last_name,
    u.display_name_preference AS display_name_preference,
    u.custom_display_name AS custom_display_name,
    u.avatar_url      AS avatar_url,
    u.last_active_at  AS last_active_at,
    COALESCE(fp.current_level, 1)    AS level,
    COALESCE(fp.total_points, 0)     AS faith_points,
    COALESCE(ss.current_streak, 0)   AS current_streak,
    COALESCE((
      SELECT SUM(al.points_earned)
      FROM activity_log al
      WHERE al.user_id = u.id
        AND al.occurred_at >= :weekStart
    ), 0) AS weekly_points
  FROM friend_relationships fr
    JOIN users u ON u.id = fr.friend_user_id
    LEFT JOIN faith_points fp ON fp.user_id = u.id
    LEFT JOIN streak_state ss ON ss.user_id = u.id
  WHERE fr.user_id = :userId
    AND fr.status = 'active'
    AND u.is_deleted = FALSE
    AND u.is_banned = FALSE
  ORDER BY u.last_active_at DESC NULLS LAST, u.first_name ASC
  """,
  nativeQuery = true)
List<FriendsListProjection> findFriendsListForUser(
    @Param("userId") UUID userId,
    @Param("weekStart") OffsetDateTime weekStart);
```

`FriendsListProjection` is a Spring Data projection interface (not a POJO) with getter methods matching the column aliases. The service layer maps projection → `FriendDto` and computes the derived fields (`displayName` via `DisplayNameResolver`, `levelName` via a level→name map).

Pattern reference: any existing native-query projections in `com.worshiproom.activity`. If none exist, this introduces the pattern — flag in the plan output. Recon should grep for `nativeQuery = true` in `backend/src/main/java/`.

---

## Service Layer: `FriendsService`

Constructor injection (per `03-backend-standards.md`'s "constructor injection only" rule). Dependencies: `FriendRelationshipRepository`, `FriendRequestRepository`, `UserRepository`, `DisplayNameResolver`, `Clock` (for `OffsetDateTime.now(clock)` — testability per Phase 2 service patterns).

### Operations (10 total — matching Decision 8)

Each operation declares its `@Transactional` boundary and the exceptions it throws. CC's plan should produce concrete method signatures matching this shape.

**1. `listFriends(UUID userId, OffsetDateTime weekStart): List<FriendDto>`**
- `@Transactional(readOnly = true)`
- Calls `findFriendsListForUser` with `weekStart` computed by caller (controller layer in 2.5.3 will compute "current week start" in user's timezone)
- Maps projection rows → `FriendDto` via `DisplayNameResolver` + level→name lookup
- Returns empty list when no friends — never null

**2. `listIncomingPendingRequests(UUID userId): List<FriendRequestDto>`**
- `@Transactional(readOnly = true)`
- Returns requests where `to_user_id = userId` AND `status = pending`
- Each row joined with sender's `users` row to populate `senderDisplayName`, `senderAvatarUrl`

**3. `listOutgoingPendingRequests(UUID userId): List<FriendRequestDto>`**
- `@Transactional(readOnly = true)`
- Returns requests where `from_user_id = userId` AND `status = pending`
- Each row joined with recipient's `users` row to populate `recipientDisplayName`, `recipientAvatarUrl`

**4. `sendRequest(UUID fromUserId, UUID toUserId, String message): FriendRequest`**
- `@Transactional`
- Validation order:
  1. `fromUserId != toUserId` else throw `SelfActionException("Cannot send friend request to yourself")`
  2. `userRepository.findById(toUserId)` exists, not deleted, not banned else `UserNotFoundException`
  3. `isEitherDirectionBlocked(fromUserId, toUserId)` is false else `BlockedUserException` (HTTP 403 via controller advice)
  4. No existing `FriendRelationship` with `userId=fromUserId, friendUserId=toUserId, status=ACTIVE` (already friends) else `AlreadyFriendsException` (HTTP 409)
  5. INSERT new FriendRequest. If DataIntegrityViolationException with constraint name containing `friend_requests_unique_sender_recipient`, catch and throw `DuplicateFriendRequestException` (HTTP 409 — this catches the FULL UNIQUE: any prior request from `fromUserId` to `toUserId`, regardless of status, blocks the new one)
- Returns the persisted FriendRequest

**5. `acceptRequest(UUID requestId, UUID actingUserId): void`**
- `@Transactional`
- Validation order:
  1. `findById(requestId)` exists else `FriendRequestNotFoundException` (HTTP 404)
  2. `request.toUserId == actingUserId` else `UnauthorizedActionException` (HTTP 403 — only the recipient can accept)
  3. `request.status == PENDING` else `InvalidRequestStateException` (HTTP 409 — already-accepted / declined / cancelled requests can't be re-accepted)
  4. Re-check `isEitherDirectionBlocked(fromUserId, toUserId)` — if a block was placed AFTER the request was sent but BEFORE acceptance, refuse with `BlockedUserException`
- Updates: `request.status = ACCEPTED, request.respondedAt = OffsetDateTime.now(clock)`
- Inserts TWO `FriendRelationship` rows in the same transaction:
  - `(userId=fromUserId, friendUserId=toUserId, status=ACTIVE)`
  - `(userId=toUserId, friendUserId=fromUserId, status=ACTIVE)`
- If either insert fails (e.g., FK violation due to user deletion mid-flight), the entire transaction rolls back

**6. `declineRequest(UUID requestId, UUID actingUserId): void`**
- `@Transactional`
- Same validation 1–3 as accept (recipient-only, must be pending)
- Updates request: `status = DECLINED, respondedAt = NOW`
- NO friend_relationship rows inserted
- Note: the FULL UNIQUE on (fromUserId, toUserId) means the sender can never re-send. That's intentional per Decision 8.

**7. `cancelRequest(UUID requestId, UUID actingUserId): void`**
- `@Transactional`
- Validation:
  1. `findById(requestId)` else `FriendRequestNotFoundException`
  2. `request.fromUserId == actingUserId` else `UnauthorizedActionException` (only the sender can cancel)
  3. `request.status == PENDING` else `InvalidRequestStateException`
- Updates: `status = CANCELLED, respondedAt = NOW`

**8. `removeFriend(UUID actingUserId, UUID friendUserId): void`**
- `@Transactional`
- Validation:
  1. `actingUserId != friendUserId` else `SelfActionException`
  2. Existing relationship row with `(userId=actingUserId, friendUserId=friendUserId, status=ACTIVE)` exists else `NotFriendsException` (HTTP 404)
- Calls `deleteBothDirections(actingUserId, friendUserId)` — deletes both rows atomically
- Returns void; idempotency NOT a goal here (caller should know whether they were friends)

**9. `blockUser(UUID blockerId, UUID blockedId): void`**
- `@Transactional`
- Validation:
  1. `blockerId != blockedId` else `SelfActionException`
  2. `userRepository.findById(blockedId)` exists else `UserNotFoundException`
  3. NOT already-blocked (existsByUserIdAndFriendUserIdAndStatus) else no-op (return without action — block is idempotent on already-blocked)
- Operations (in this order, all in one transaction):
  1. Delete any existing `friend_relationships` row in EITHER direction (i.e., if they were friends, the friendship is broken by the block)
  2. Delete any pending `friend_requests` in EITHER direction (per Divergence 3 above)
  3. Insert single `friend_relationships` row: `(userId=blockerId, friendUserId=blockedId, status=BLOCKED)`. This unidirectional row is what `isEitherDirectionBlocked` matches on.
- The reverse direction (blocked person's friend_relationships row pointing at blocker) is NOT inserted — block is asymmetric. Only the blocker has the row.

**10. `unblockUser(UUID blockerId, UUID blockedId): void`**
- `@Transactional`
- Validation:
  1. `blockerId != blockedId` else `SelfActionException`
  2. Existing block row exists else `NotBlockedException` (HTTP 404)
- DELETE the block row. Note: this does NOT restore any prior friendship — if A and B were friends and A blocked B, the friendship is gone forever. Refriending requires a fresh friend request from someone — and remember, the FULL UNIQUE means either party can send a new request only if no prior request from them to the other exists. Practical implication: if A had previously sent a request to B and then blocked B, after unblocking, A cannot re-send (UNIQUE violation on the prior accepted-then-deleted-by-block trail... wait — the request row may still exist with status `ACCEPTED` and the relationship rows were deleted by block; the unique constraint on the request is still hit). This is an acceptable edge case — the master plan doesn't address it and product can revisit if it surfaces. Document in out-of-band notes.

**11 (bonus). `searchUsers(UUID actingUserId, String nameQuery, int limit): List<UserSearchResultDto>`**
- `@Transactional(readOnly = true)`
- Validation:
  1. `nameQuery.trim().length() >= 2` else throw `InvalidInputException` (avoid full-table scans on single-char queries)
  2. `limit <= 50` else clamp to 50
- Native query (or JPQL) joining `users` with anti-blocked filter:
  - `WHERE (LOWER(first_name) LIKE LOWER(:q || '%') OR LOWER(last_name) LIKE LOWER(:q || '%'))`
  - `AND id != :actingUserId` (exclude self)
  - `AND id NOT IN (SELECT friend_user_id FROM friend_relationships WHERE user_id = :actingUserId AND status = 'blocked')` (exclude users I blocked)
  - `AND id NOT IN (SELECT user_id FROM friend_relationships WHERE friend_user_id = :actingUserId AND status = 'blocked')` (exclude users who blocked me)
  - `AND is_deleted = FALSE AND is_banned = FALSE`
  - `ORDER BY first_name ASC`
  - `LIMIT :limit`
- Returns lightweight `UserSearchResultDto { id, displayName, avatarUrl }` — NO friend status, NO faith stats. The friend-add UI calls this endpoint just to identify candidates; the relationship status is determined client-side from the list-friends response and pending-requests responses.

That's the 10-operation interface (plus 1 search). All other concerns (HTTP wrappers, request validation, rate limiting) belong to Spec 2.5.3.

---

## DTOs

Place under `com.worshiproom.friends.dto`.

### `FriendDto` — denormalized friend record per Decision 8

```java
public record FriendDto(
    UUID id,                    // friend's user ID
    String displayName,         // computed via DisplayNameResolver
    String avatarUrl,           // nullable
    int level,                  // 1..6
    String levelName,           // "Seedling" / "Sprout" / ... / "Lighthouse"
    int currentStreak,
    int faithPoints,            // total
    int weeklyPoints,           // SUM since week start
    OffsetDateTime lastActive   // nullable until last-active-write ships (see Divergence 2)
) {}
```

**Level → name map** lives in `FriendsService` as a private static constant (or in a small `LevelNameLookup.java` if cleaner). The 6 names match `streak-faith-points-engine.md` per master plan: 1=Seedling, 2=Sprout, 3=Blooming, 4=Flourishing, 5=Oak, 6=Lighthouse. Recon should grep `frontend/src/` for the canonical names to ensure parity (the drift-detection test from Phase 2 Spec 2.8 catches this if it drifts).

### `FriendRequestDto` — request record (for incoming + outgoing list endpoints)

```java
public record FriendRequestDto(
    UUID id,
    UUID fromUserId,            // null in outgoing-list when same as caller (caller knows it's themselves)
    UUID toUserId,              // null in incoming-list when same as caller
    String otherPartyDisplayName,
    String otherPartyAvatarUrl,
    String message,             // nullable
    String status,              // "pending" / "accepted" / etc.
    OffsetDateTime createdAt,
    OffsetDateTime respondedAt  // nullable
) {}
```

The "otherParty" naming sidesteps the asymmetry of incoming-vs-outgoing — the API caller is always one side; the DTO surfaces the other side. Spec 2.5.3 may choose to split this into two DTOs (`IncomingFriendRequestDto` / `OutgoingFriendRequestDto`) if cleaner — that's its call.

### `UserSearchResultDto`

```java
public record UserSearchResultDto(
    UUID id,
    String displayName,
    String avatarUrl
) {}
```

Lightweight on purpose. The friend-add UI doesn't need full friend stats for search results.

---

## Domain Exceptions

Place under `com.worshiproom.friends`. All extend a shared base class (mirror existing patterns in `com.worshiproom.user.UserException`).

```
FriendsException             (sealed/abstract base, mirrors UserException shape)
├── SelfActionException                   (caller acting on themselves)
├── UserNotFoundException                 (target user doesn't exist or is deleted/banned — may already exist in user package; reuse if so)
├── BlockedUserException                  (caller is blocked by target OR vice versa)
├── AlreadyFriendsException               (relationship already ACTIVE)
├── NotFriendsException                   (no ACTIVE relationship to remove)
├── DuplicateFriendRequestException       (FULL UNIQUE violation — any prior request from sender to recipient exists)
├── FriendRequestNotFoundException        (request ID doesn't exist)
├── InvalidRequestStateException          (request not in expected status, e.g., trying to accept a cancelled request)
├── UnauthorizedActionException           (caller is not the recipient/sender as required by the operation)
├── NotBlockedException                   (unblock target wasn't blocked)
└── InvalidInputException                 (search query too short, etc.)
```

The HTTP code mapping (e.g., `BlockedUserException` → 403) lives in Spec 2.5.3's `FriendsExceptionHandler @RestControllerAdvice`. This spec ONLY defines the exception classes. CC may want to define them as sealed — that's fine if it matches existing patterns (check `UserException` shape — it uses sealed in some packages and not in others; mirror whichever is closest).

If `UserNotFoundException` already exists in `com.worshiproom.user`, REUSE it (don't create a friends-specific duplicate). Same for `InvalidInputException` if a generic one exists. Recon should grep for these classes before declaring new ones.

---

## Files to Create

```
backend/src/main/java/com/worshiproom/friends/FriendRelationship.java
backend/src/main/java/com/worshiproom/friends/FriendRelationshipId.java
backend/src/main/java/com/worshiproom/friends/FriendRelationshipStatus.java
backend/src/main/java/com/worshiproom/friends/FriendRelationshipRepository.java
backend/src/main/java/com/worshiproom/friends/FriendRequest.java
backend/src/main/java/com/worshiproom/friends/FriendRequestStatus.java
backend/src/main/java/com/worshiproom/friends/FriendRequestRepository.java
backend/src/main/java/com/worshiproom/friends/FriendsService.java
backend/src/main/java/com/worshiproom/friends/FriendsListProjection.java
backend/src/main/java/com/worshiproom/friends/FriendsException.java
backend/src/main/java/com/worshiproom/friends/SelfActionException.java
backend/src/main/java/com/worshiproom/friends/BlockedUserException.java
backend/src/main/java/com/worshiproom/friends/AlreadyFriendsException.java
backend/src/main/java/com/worshiproom/friends/NotFriendsException.java
backend/src/main/java/com/worshiproom/friends/DuplicateFriendRequestException.java
backend/src/main/java/com/worshiproom/friends/FriendRequestNotFoundException.java
backend/src/main/java/com/worshiproom/friends/InvalidRequestStateException.java
backend/src/main/java/com/worshiproom/friends/UnauthorizedActionException.java
backend/src/main/java/com/worshiproom/friends/NotBlockedException.java
backend/src/main/java/com/worshiproom/friends/dto/FriendDto.java
backend/src/main/java/com/worshiproom/friends/dto/FriendRequestDto.java
backend/src/main/java/com/worshiproom/friends/dto/UserSearchResultDto.java

backend/src/test/java/com/worshiproom/friends/FriendsServiceTest.java
backend/src/test/java/com/worshiproom/friends/FriendsServiceBlockTest.java
backend/src/test/java/com/worshiproom/friends/FriendsServiceListTest.java
```

Why three test classes: 25+ tests on a single test class is unwieldy. Split by concern: `FriendsServiceTest` (send / accept / decline / cancel / remove + happy paths), `FriendsServiceBlockTest` (block / unblock / block-side-effects / search-respects-blocks), `FriendsServiceListTest` (list-friends with the denormalized join, list-incoming, list-outgoing). CC may consolidate or split differently — that's its call as long as test coverage hits the target.

If `UserNotFoundException` already exists in `com.worshiproom.user`, drop it from the create list (reuse — see Domain Exceptions section).

## Files to Modify

```
backend/src/main/java/com/worshiproom/auth/PublicPaths.java
```
NO modification needed in 2.5.2 (controller is 2.5.3's responsibility — that's where the auth-required URLs land). Listing here only to confirm: this file does NOT change in this spec.

If CC's recon discovers any existing util/helper class that benefits from a small addition (e.g., `DisplayNameResolver` needs a new method to handle a friend record shape), that's an acceptable modification — call it out in the plan output.

## Files to Delete

None.

---

## Acceptance Criteria

### Entities + Repositories

- [ ] `FriendRelationship` entity with composite PK via `@IdClass(FriendRelationshipId.class)`, mirroring the `UserBadge` + `UserBadgeId` pattern
- [ ] `FriendRequest` entity with UUID `@Id @GeneratedValue(strategy = GenerationType.UUID)`
- [ ] Both status enums (`FriendRelationshipStatus`, `FriendRequestStatus`) with `value()` / `fromValue()` matching the `ActivityType` / `CountType` pattern
- [ ] `FriendsListProjection` interface with getter methods matching the native query column aliases
- [ ] All repository methods listed in the Repositories section above implemented and unit-tested

### Service: send/accept/decline/cancel/remove (Decision 8 acceptance criteria 1-5)

- [ ] `sendRequest` creates one row in `friend_requests` with `status='pending'`, `responded_at=NULL`
- [ ] `sendRequest` to self throws `SelfActionException`
- [ ] `sendRequest` to deleted/banned user throws `UserNotFoundException`
- [ ] `sendRequest` when caller is blocked by target throws `BlockedUserException`
- [ ] `sendRequest` when target is blocked by caller throws `BlockedUserException`
- [ ] `sendRequest` when relationship already ACTIVE throws `AlreadyFriendsException`
- [ ] `sendRequest` second time after first declined throws `DuplicateFriendRequestException` (THE headline test for Decision 8 anti-harassment policy)
- [ ] `sendRequest` second time after first cancelled throws `DuplicateFriendRequestException`
- [ ] `sendRequest` second time after first accepted throws `AlreadyFriendsException` (sender can't re-send even after they're friends — the active-friendship gate fires before the FULL UNIQUE catch per Operation 4 validation order; the after-declined / after-cancelled cases below cover the FULL UNIQUE catch path)
- [ ] `acceptRequest` updates request to `status='accepted'`, `responded_at=NOW`, AND inserts two `friend_relationships` rows with `status='active'` — verified via direct DB query inside the test
- [ ] `acceptRequest` by non-recipient throws `UnauthorizedActionException`
- [ ] `acceptRequest` on already-accepted/declined/cancelled request throws `InvalidRequestStateException`
- [ ] `acceptRequest` when block placed mid-flight throws `BlockedUserException` and rolls back the transaction (zero new relationship rows, request status unchanged)
- [ ] `declineRequest` updates request to `status='declined'`, `responded_at=NOW`, inserts ZERO relationship rows
- [ ] `declineRequest` by non-recipient throws `UnauthorizedActionException`
- [ ] `cancelRequest` updates request to `status='cancelled'`, `responded_at=NOW`
- [ ] `cancelRequest` by non-sender throws `UnauthorizedActionException`
- [ ] `removeFriend` deletes both `friend_relationships` rows in one operation
- [ ] `removeFriend` when not currently friends throws `NotFriendsException`

### Service: block/unblock (Decision 8 acceptance criteria 6-7)

- [ ] `blockUser` inserts a single `friend_relationships` row from blocker to blocked with `status='blocked'`
- [ ] `blockUser` when previously friends — both prior `friend_relationships` rows are deleted, then the single block row is inserted (verified via direct DB query for row count: pre-block 2 active rows, post-block 1 blocked row)
- [ ] `blockUser` deletes any pending `friend_requests` in EITHER direction (per Divergence 3) — test sets up requests in both directions, verifies they're hard-deleted (not status-updated)
- [ ] `blockUser` LEAVES IN PLACE non-pending `friend_requests` (accepted/declined/cancelled rows stay untouched)
- [ ] `blockUser` on already-blocked target is a no-op (idempotent — second call doesn't create a duplicate row, doesn't throw)
- [ ] `unblockUser` deletes the block row; relationship is fully gone (NOT restored to ACTIVE)
- [ ] `unblockUser` when not blocked throws `NotBlockedException`

### Service: search (Decision 8 acceptance criterion 8)

- [ ] `searchUsers` excludes the calling user
- [ ] `searchUsers` excludes users blocked by the caller
- [ ] `searchUsers` excludes users who blocked the caller
- [ ] `searchUsers` excludes deleted users
- [ ] `searchUsers` excludes banned users
- [ ] `searchUsers` matches first_name OR last_name (case-insensitive prefix)
- [ ] `searchUsers` with query < 2 chars throws `InvalidInputException`
- [ ] `searchUsers` clamps `limit` to 50 max

### Service: list-friends with denormalization (the Decision 8 mandate)

- [ ] `listFriends` returns one DTO per ACTIVE relationship row with `userId=caller`
- [ ] `listFriends` does NOT include the caller as their own friend
- [ ] `listFriends` does NOT include blocked users
- [ ] `FriendDto.level` reflects `faith_points.current_level` (defaults to 1 if no row)
- [ ] `FriendDto.faithPoints` reflects `faith_points.total_points` (defaults to 0 if no row)
- [ ] `FriendDto.currentStreak` reflects `streak_state.current_streak` (defaults to 0 if no row)
- [ ] `FriendDto.weeklyPoints` reflects `SUM(activity_log.points_earned WHERE occurred_at >= weekStart)` (defaults to 0 if no rows)
- [ ] `FriendDto.weeklyPoints` correctly excludes activity rows older than weekStart
- [ ] `FriendDto.lastActive` mirrors `users.last_active_at` (likely NULL today per Divergence 2 — test asserts NULL passthrough, not that the column is populated)
- [ ] `FriendDto.displayName` is computed via `DisplayNameResolver` (test exercises all 4 preferences: first_only, first_last_initial, first_last, custom)
- [ ] `FriendDto.levelName` matches the canonical 6-name map (Seedling/Sprout/Blooming/Flourishing/Oak/Lighthouse)
- [ ] `listFriends` query is exactly ONE SQL execution per call (verified via `@DataJpaTest` query-count or `Statistics` assertion if available — recon should confirm what query-count tooling Phase 1 / Phase 2 tests use; if none, document as a manual verification rather than blocking the spec)

### List incoming/outgoing requests

- [ ] `listIncomingPendingRequests` returns only pending requests where caller is recipient
- [ ] `listIncomingPendingRequests` excludes accepted/declined/cancelled rows
- [ ] `listOutgoingPendingRequests` returns only pending requests where caller is sender
- [ ] Each request DTO includes the OTHER party's displayName + avatarUrl
- [ ] Empty list returned (not null) when no requests

### FK CASCADE behavior (carry-forward from 2.5.1, but verify here at the service layer)

- [ ] Deleting a user via `userRepository.delete(...)` cascades all their friend_relationships rows (both directions) and friend_requests rows
- [ ] Caller's friends list correctly excludes a user who was deleted while the test was running (test seeds a friendship, deletes friend, asserts list-friends returns empty)

### Test count target

L-sized → 20–40 tests per `06-testing.md`. Decision 8's spec text says "at least 25." Target **28–35 integration tests** distributed across the three test classes.

All integration tests extend `AbstractIntegrationTest` (full Spring context — service uses transactional cross-table writes, so `@DataJpaTest` slice is insufficient). Native query tests can use `AbstractDataJpaTest` if simpler — recon decides.

---

## Testing Notes

**Use `AbstractIntegrationTest` for the bulk of `FriendsServiceTest`**, not `@DataJpaTest`. The accept-flow's two-table transactional shape needs the full Spring context to verify rollback semantics.

**Test data setup pattern** (use `@BeforeEach` per existing Phase 2 test patterns):

```java
private User userA;
private User userB;
private User userC;

@BeforeEach
void seedUsers() {
  userA = userRepository.save(buildUser("alice@example.com", "Alice", "Anderson"));
  userB = userRepository.save(buildUser("bob@example.com", "Bob", "Bennett"));
  userC = userRepository.save(buildUser("carol@example.com", "Carol", "Chen"));
  // No friend_relationships or friend_requests in baseline — each test sets up its own
}

@AfterEach
void cleanup() {
  // Rely on @Transactional rollback per AbstractIntegrationTest convention
  // OR: explicit deleteAll if tests need to commit
}
```

**For the FULL UNIQUE assertion**, the test should explicitly verify all three "after-X-then-resend" scenarios:

```java
@Test
void sendRequest_blocks_resend_after_decline() {
  FriendRequest first = friendsService.sendRequest(userA.getId(), userB.getId(), null);
  friendsService.declineRequest(first.getId(), userB.getId());

  assertThatThrownBy(() -> friendsService.sendRequest(userA.getId(), userB.getId(), null))
    .isInstanceOf(DuplicateFriendRequestException.class);
}
// Same shape for after-cancel and after-accept
```

**For the accept-flow rollback test**, simulate a block placed mid-flight by manually inserting a block row between the recipient's `findById` lookup and the relationship insert. One way: a Mockito spy on `FriendRelationshipRepository.isEitherDirectionBlocked` that inserts the block as a side effect on first call. Or a separate service method that does both in one transaction (cleaner). CC's plan picks.

**Drift parity with Phase 2's level-name map**: the level→name lookup MUST produce identical output to the frontend's existing map. Add ONE test that imports the canonical level-name pairs from `_test_fixtures/activity-engine-scenarios.json` (if present, per Phase 2 drift-detection setup) or hardcodes the 6 pairs and asserts `FriendsService.levelName(1..6)` matches. This is small but catches a class of "frontend says Oak, backend says Mighty Oak" drift.

**For native-query verification**, write at least one test that asserts the ORDER BY clause works (most-recently-active friend first when `last_active_at` is set, alphabetical fallback when NULL). Even though `last_active_at` is currently always NULL in production data (Divergence 2), the test can directly INSERT users with non-null timestamps and verify ordering — this future-proofs the native query for when last-active-write ships.

---

## What to Watch For in CC's Spec Output

1. **Composite PK pattern: `@IdClass(FriendRelationshipId.class)`, mirroring `UserBadge` + `UserBadgeId`.** If CC proposes `@EmbeddedId` instead, push back — the codebase convention is `@IdClass`. Consistency matters more than abstract preference.

2. **Native query for friends-list** — the alternative (JPQL with constructor expression and per-friend subqueries) will N+1 silently. The single native query is mandated by Decision 8. If CC proposes a JPQL approach with @Subquery or @Formula on the entity, push back — the native query lives on the repository, not on the entity.

3. **Mutual-friendship insert is service-layer, not entity-layer.** No entity lifecycle callbacks. No JPA `@PostPersist` triggering a sibling insert. The two `friend_relationships` rows are inserted by `FriendsService.acceptRequest` directly, both inside one `@Transactional`.

4. **`DataIntegrityViolationException` translation must check the constraint name** (`friend_requests_unique_sender_recipient`), not just catch the generic exception. Spring's exception wrapping is verbose — recon should confirm whether the constraint name surfaces in `getMessage()` or `getCause().getMessage()` or via `getRootCause()`. The test for this case must include an assertion that uses the constraint name (not just the exception type) to ensure future changes to the schema don't silently bypass the translation.

5. **`UserNotFoundException` reuse** — recon must grep `com.worshiproom.user` before declaring a friends-specific copy. If the user package has it, USE IT; don't duplicate the class. Same for any generic `InvalidInputException` if it exists.

6. **Block side-effect order in `blockUser`**: delete relationship rows FIRST, then delete pending request rows, THEN insert the block row. If the order is reversed (insert block first), the relationship-delete query that filters by `status='active'` works fine — but the cleaner ordering matches conceptually ("undo the existing state, then add the block"). If CC reorders, ask why.

7. **`isEitherDirectionBlocked` is checked TWICE in accept-flow**: once when the request was originally sent (in `sendRequest`), once when it's being accepted (in `acceptRequest`). The second check guards against blocks placed AFTER the request was sent. If CC removes the second check ("it was already checked"), push back — the time gap between send and accept can be hours or days; a block placed in between must be honored.

8. **Search query injection safety**: the LIKE query uses `LOWER(:q || '%')` — Spring Data parameter binding is parameterized, but if CC writes the query as native SQL with string concatenation, that's an injection vector. Use `:q` placeholder, not `'" + q + "'`.

9. **No JPA `cascade = CascadeType.ALL` on the entity FK references** — the FK cascade lives in the database changeset (`ON DELETE CASCADE`), per the Phase 1 pattern from `User`. Don't duplicate cascade behavior at the JPA layer; it confuses Hibernate and produces double-delete attempts.

10. **`Clock` injection** — the activity engine uses `Clock` for testable timestamps (e.g., `OffsetDateTime.now(clock)`). `FriendsService.acceptRequest` should follow the same pattern for setting `respondedAt`. Recon should grep `Clock` usage in `com.worshiproom.activity` for the established bean wiring.

11. **No HTTP layer in this spec.** If CC's plan starts mentioning `@RestController`, `@PostMapping`, controller advices, or HTTP status codes — that's Spec 2.5.3 territory. The exception classes are defined here; their HTTP mapping happens in 2.5.3.

12. **Single quotes in any shell snippets** the plan output may contain (grep examples, etc.).

---

## Out of Scope

- HTTP controllers, request/response validation, OpenAPI updates (→ Spec 2.5.3)
- `@RestControllerAdvice` for `FriendsException` → HTTP code mapping (→ Spec 2.5.3)
- Frontend dual-write wiring (→ Spec 2.5.4)
- Social interactions and milestone events services (→ Spec 2.5.4b, separate package `com.worshiproom.social`)
- Block user UI / Mute user feature (→ Specs 2.5.6 / 2.5.7)
- Last-active-write wiring on `users.last_active_at` — separate followup (per Divergence 2)
- Friends pinning to top of Prayer Wall feed (→ Phase 7.6, depends on this spec but doesn't ship here)
- Friend-of-friend recommendations / "People You May Know" (→ Phase 14 onboarding spec)
- Rate limiting (lives at filter layer; configured in Spec 2.5.3 alongside endpoints)
- Drift parity test integration with Phase 2's `_test_fixtures/activity-engine-scenarios.json` — only the level-name map check needs parity here; the broader drift-detection harness from Spec 2.8 is for points/streak calculation, not for friends data

---

## Out-of-Band Notes for Eric

- This is the load-bearing spec of Phase 2.5. If anything in here ships incorrectly, 2.5.3 (endpoints) and 2.5.4 (dual-write) inherit the bugs. Spend more recon time here than feels necessary.
- Estimated execution: 2–3 sessions. Probably one for entities + repositories + DTOs + exceptions, one for service operations, one for tests. CC may compress.
- The `FriendDto` denormalization native query is the single most error-prone part. After execution, manually run the SQL against the dev DB with seed users (when 2.5.4 lands and seeds friendships) to verify it returns reasonable rows. Or write a one-off integration test that seeds 5 users, makes them all friends with user A, and asserts `listFriends(userA)` returns 4 DTOs ordered correctly.
- After this spec ships, the master plan's Decision 8 expectations are mostly met. Spec 2.5.3 is mostly mechanical (HTTP wrappers around an already-tested service).
- The unblock-then-resend edge case in operation #10 (you blocked someone you'd previously sent a request to; even after unblock, you can't re-send) is unlikely to surface in MVP. If it does, the fix is a separate spec that either (a) deletes the friend_request row alongside the block, or (b) ignores cancelled/declined requests in the FULL UNIQUE check. Both are post-MVP product calls. Don't fix it preemptively in this spec.
- Once 2.5.2 is green, the spec-tracker entry becomes `2.5.2 ✅` and Phase 2.5 progress is 2/8.
- If during execution CC discovers any genuine schema bug in 2.5.1 (a column type mismatch, a missing CHECK, an index that doesn't get used by the native query and tanks performance) — that's a 2.5.1 follow-up changeset, NOT a backwards edit to the original 2.5.1 changesets. Liquibase MD5s are permanent once shipped. New changeset, append to master.xml.
- If recon finds anything in `_plans/post-1.10-followups.md` that has revisit criteria pointing at "before Phase 2.5 backend friends ships" — address those before merging. Likely none, but worth a grep.
