# Forums Wave: Spec 2.6 — Activity API Endpoint

**Master Plan Reference:** `_forums_master_plan/round3-master-plan.md` → Spec 2.6 (line 2737)
**Branch:** `forums-wave-continued` (stay on this branch — no per-spec sub-branch)
**Date:** 2026-04-26

---

## Affected Frontend Routes

N/A — backend-only spec. No frontend code touched beyond regenerated OpenAPI types in `frontend/src/types/api/*` (or wherever the codegen target lives — recon confirms during execution). The `POST /api/v1/activity` endpoint this spec creates will be wired to the frontend's `recordActivity()` flow as a fire-and-forget dual-write in Spec 2.7. User-facing behavior does not change in this spec; `/verify-with-playwright` is skipped.

---

## Spec Header

- **ID:** `round3-phase02-spec06-activity-endpoint`
- **Size:** L
- **Risk:** Medium (orchestration, transaction boundary, points-delta computation, first-time-today semantics, response shape stability — many surfaces to get right)
- **Prerequisites:** 2.1 (Activity Engine Schema) ✅, 2.2 (Faith Points Calculation Service) ✅, 2.3 (Streak State Service) ✅, 2.4 (Badge Eligibility Service) ✅, 2.5 (Activity Counts Service) ✅ — all four backend services and the `activity_log` / `activity_counts` / `faith_points` / `streak_state` / `user_badges` tables exist in `com.worshiproom.activity`.
- **Phase:** 2 — Activity Engine Migration (Dual-Write)
- **Sixth spec of Phase 2. Biggest spec of Phase 2.** Specs 2.7 (frontend dual-write), 2.8 (drift detection), 2.9 (cutover), and 2.10 (backfill) layer on top of this endpoint.

---

## Goal

Build the `POST /api/v1/activity` endpoint that composes all four services from Specs 2.2–2.5 into a single authenticated backend operation. Each call:

1. Records an `activity_log` row (always)
2. Increments the relevant activity count (always, when a `count_type` mapping exists)
3. Updates `faith_points` and `streak_state` IF this is the user's first occurrence of this `activity_type` today (in the user's timezone)
4. Checks for newly-eligible badges and persists them to `user_badges` (with `display_count` handling for repeatable badges)
5. Returns an `ActivityResponse` matching Decision 5's shape

Single transaction. Rollback on any failure.

This is the **consumer side of the dual-write strategy**: the frontend (Spec 2.7, next) will fire-and-forget `POST /api/v1/activity` on every `recordActivity` call. The backend persists the shadow copy. Reads stay frontend-localStorage-driven during the wave.

The master plan describes this spec at `_forums_master_plan/round3-master-plan.md` line 2737.

---

## Master Plan Divergences

Three meaningful clarifications and tightenings of master plan v2.9 § Spec 2.6 worth flagging up front.

### Divergence 1 — Points-delta semantics, not independent-earn

The master plan body says "`FaithPointsService.recordActivity(...)` returns points result." There is no `recordActivity` method on `FaithPointsService` — Spec 2.2 only defines `calculate(activities, currentTotalPoints)`.

The frontend semantics are subtle: faith points accumulate based on TODAY's daily activity set, with a multiplier that depends on activity count. When a new activity is added today, the correct points delta is:

```
newDailyTotal = calculate(todaysActivitiesAfterNew, 0).pointsEarned
oldDailyTotal = calculate(todaysActivitiesBeforeNew, 0).pointsEarned
pointsDelta   = newDailyTotal - oldDailyTotal
newLifetime   = currentLifetimePoints + pointsDelta
```

NOT: "this single activity earned X points based on its own multiplier." Adding a 4th activity might bump the multiplier from 1.25 to 1.5, retroactively bumping the previous 3 activities' contribution as well. The delta captures this correctly.

**Resolution:** Spec 2.6's controller computes the delta via two calls to `FaithPointsService.calculate`. See Architectural Decision #4 for the exact algorithm.

### Divergence 2 — First-time-today gating on faith points, streak, and badges — but NOT on activity_log or activity_counts

The frontend's `DailyActivities` is a boolean-per-activity-type shape. Recording "pray" twice in a day flips `dailyActivities.pray` from false to true on the first call; the second call is a no-op for the boolean. So the points/streak/badge updates only fire on the FIRST occurrence of each `activity_type` each day.

But the `activity_log` (event stream) and `activity_counts` (lifetime counters) WILL be written on every call. Two prayer events in one day = 2 `activity_log` rows + count incremented by 2, but only 1 set of points/streak/badge updates.

This is the correct behavior — pray-count is a lifetime counter that should reflect every prayer event, while daily points are gated by the boolean activity model.

**Resolution:** the controller queries `activity_log` for "any row with this user, this `activity_type`, today (in user's timezone)" BEFORE this insert. If found → skip the points/streak/badge work (record-only path). If not found → full path.

### Divergence 3 — grace_used and grace_remaining in response are always zero

Decision 5's response shape includes:

```
streak: { current, longest, new_today, grace_used, grace_remaining }
```

Per Spec 2.3's Divergence 1 (grace days don't exist in frontend), the backend has no grace logic. The response fields stay in the shape (for API stability — Spec 2.7 frontend dual-write reads this shape) but always return:

- `grace_used: 0`
- `grace_remaining: 0`

A future grace-days spec will populate them honestly.

---

## Recon Facts (verified during brief authoring — re-verify suspect ones during execution)

### A) The activity_type → count_type mapping (verbatim from `frontend/src/services/badge-storage.ts`)

```ts
ACTIVITY_TYPE_TO_COUNT_KEY: Partial<Record<ActivityType, keyof ActivityCounts>> = {
  pray: 'pray',
  journal: 'journal',
  meditate: 'meditate',
  listen: 'listen',
  prayerWall: 'prayerWall',
  readingPlan: 'readingPlan',
  gratitude: 'gratitude',
  // mood, reflection, challenge, localVisit, devotional → no counter
};
```

7 mappings only. The other 5 `ActivityType` values do NOT trigger count increments via this endpoint. Their counters (where they exist) are incremented by other code paths in future specs.

The Java mapping lives at the call site in this spec, NOT in `ActivityCountsService` (per Spec 2.5's brief out-of-scope). Suggested location: a `private static final EnumMap` inside `ActivityController` or `ActivityService` (CC's call).

### B) Existing services (composition targets)

From Spec 2.2:
- `FaithPointsService.calculate(Set<ActivityType>, int currentTotalPoints) → FaithPointsResult`
- `LevelThresholds.levelForPoints(int) → LevelInfo`
- `FaithPoints` entity (mapped to `faith_points` table)
- `FaithPointsRepository` (JpaRepository stub)

From Spec 2.3:
- `StreakService.updateStreak(StreakStateData, LocalDate today) → StreakResult`
- `StreakService.isFreeRepairAvailable(LocalDate?, LocalDate currentWeekStart) → boolean`
- `StreakState` entity
- `StreakRepository`

From Spec 2.4:
- `BadgeService.checkBadges(BadgeCheckContext, Set<String> alreadyEarned) → BadgeResult`
- `BadgeCatalog.lookup(badgeId) → BadgeDefinition`
- `UserBadge` entity (composite key `user_id` + `badge_id`)
- `BadgeRepository`

From Spec 2.5:
- `ActivityCountsService.incrementCount(UUID userId, CountType)`
- `ActivityCountsService.getAllCounts(UUID userId) → Map<CountType, Integer>`
- `ActivityCount` entity
- `ActivityCountsRepository`
- `CountType` enum

### C) activity_log table (created by Spec 2.1)

```
id              UUID PRIMARY KEY (gen_random_uuid())
user_id         UUID NOT NULL REFERENCES users(id) CASCADE
activity_type   VARCHAR(50) NOT NULL
source_feature  VARCHAR(50) NOT NULL
occurred_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
points_earned   INTEGER NOT NULL DEFAULT 0
metadata        JSONB NULL
```

Indexes: `(user_id, occurred_at DESC)`, `(user_id, activity_type)`.

This spec needs to introduce the `ActivityLog` JPA entity and `ActivityLogRepository` — they don't exist yet (Spec 2.1 was schema-only).

### D) User timezone

User's timezone is in `users.timezone` (VARCHAR, populated during registration via Spec 1.3b). Default `'UTC'` if anything went wrong at registration. The `User` entity already exposes this; `UserRepository.findById` is the existing access path.

For the orchestration, `today` and `currentWeekStart` are computed once at the start of the request:

```java
ZoneId tz = ZoneId.of(user.getTimezone());
LocalDate today = LocalDate.now(tz);
LocalDate currentWeekStart = today.with(
    TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)
);
```

### E) Auth pattern

The existing `JwtAuthenticationFilter` (Spec 1.4) populates the Spring Security `Authentication` principal with the user ID from the JWT's `sub` claim. `PublicPaths` declares which paths bypass auth; everything under `/api/v1/**` that isn't explicitly public requires auth.

`POST /api/v1/activity` REQUIRES auth. It is NOT added to `PublicPaths`.

The user ID is extracted via the standard pattern (likely `@AuthenticationPrincipal` or by reading `SecurityContextHolder` — verify by reading `UserController` for the canonical pattern).

### F) OpenAPI pattern (verified by reading `backend/src/main/resources/openapi.yaml`)

Standard envelope:

```json
{
  "data": { "...response payload..." },
  "meta": { "requestId": "..." }
}
```

Standard error responses use `$ref`s to `BadRequest`, `Unauthorized`, `RateLimited`, `InternalError`. New endpoint docs follow the existing `/api/v1/proxy/ai/explain` pattern.

### G) Frontend type generation

The codebase has type generation from `openapi.yaml` to frontend types. Verify by looking at `frontend/src/types/api/` or similar location during recon. After modifying `openapi.yaml`, the standard codegen command updates frontend types.

THIS spec updates `openapi.yaml` AND runs the codegen so the frontend has `ActivityRequest`/`ActivityResponse` types ready when Spec 2.7 wires the dual-write call. CC should verify the codegen command from `package.json` or `CLAUDE.md` during recon.

### H) Decision 5 response shape (verbatim, from master plan `_forums_master_plan/round3-master-plan.md` line 700)

```
POST /api/v1/activity
Body: { activity_type, source_feature, metadata }

Response: {
  data: {
    points_earned: int,
    total_points: int,
    current_level: int,
    level_up: boolean,
    streak: { current, longest, new_today, grace_used, grace_remaining },
    new_badges: [ { id, name, celebration_tier, earned_at } ],
    multiplier_tier: { label, multiplier }
  },
  meta: { requestId }
}
```

This is the canonical shape. `ActivityResponse` Java DTO mirrors it exactly (snake_case wire format via `@JsonProperty` or `ObjectMapper` config — match the existing convention).

---

## Architectural Decisions

### 1. Controller + orchestrator service pattern

Per the master plan files-to-create list:

- `ActivityController` (HTTP boundary, validation, principal extraction, response building)
- `ActivityService` (orchestration of the four services within a transaction)

The split keeps controller thin and orchestration unit-testable.

### 2. Single transaction via @Transactional

`ActivityService.recordActivity` is annotated `@Transactional` (default isolation, default propagation). All four service calls + `activity_log` insert + `faith_points` UPSERT + `streak_state` UPSERT + `user_badges` INSERTs happen inside one transaction. ANY exception → full rollback, no partial state.

The controller catches expected exceptions (validation, auth) and translates to HTTP error responses. Unexpected exceptions propagate to the existing global exception handler (which Sentry from Spec 1.10d already wraps).

### 3. activity_type → count_type mapping as a private EnumMap

Per recon section A, only 7 of 12 activity types map to count types. Suggested implementation:

```java
private static final Map<ActivityType, CountType> ACTIVITY_TO_COUNT =
    new EnumMap<>(Map.of(
        ActivityType.PRAY,         CountType.PRAY,
        ActivityType.JOURNAL,      CountType.JOURNAL,
        ActivityType.MEDITATE,     CountType.MEDITATE,
        ActivityType.LISTEN,       CountType.LISTEN,
        ActivityType.PRAYER_WALL,  CountType.PRAYER_WALL,
        ActivityType.READING_PLAN, CountType.READING_PLAN,
        ActivityType.GRATITUDE,    CountType.GRATITUDE
    ));
```

When `activityType` has no mapping → skip the increment, no error.

### 4. Points-delta computation algorithm

The orchestration:

```java
// Read current state
User user = userRepository.findById(userId).orElseThrow();
ZoneId tz = ZoneId.of(user.getTimezone());
LocalDate today = LocalDate.now(tz);
LocalDate currentWeekStart = today.with(
    TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));

// Determine first-time-today (Divergence 2)
boolean firstTimeToday = activityLogRepository
    .countByUserIdAndActivityTypeAndOccurredAtBetween(
        userId, activityType.getWireValue(),
        today.atStartOfDay(tz).toInstant(),
        today.atTime(LocalTime.MAX).atZone(tz).toInstant()
    ) == 0;

// Always: insert activity_log row (points_earned=0 by default,
//   updated below if firstTimeToday)
ActivityLog logRow = new ActivityLog(
    UUID.randomUUID(), userId, activityType.getWireValue(),
    sourceFeature, Instant.now(), 0, metadata);

// Always: increment count if mapping exists
CountType countType = ACTIVITY_TO_COUNT.get(activityType);
if (countType != null) {
    activityCountsService.incrementCount(userId, countType);
}

// Conditional path: first-time-today only
int pointsDelta = 0;
boolean levelUp = false;
int totalPoints, currentLevel;
StreakResult streakResult;
List<String> newBadgeIds = List.of();
List<BadgeDefinition> newBadgeDefs = List.of();
MultiplierTier multiplierTier;

FaithPoints fp = faithPointsRepository.findById(userId)
    .orElse(FaithPoints.fresh(userId));
StreakStateData streakData = readStreakState(userId);

if (firstTimeToday) {
    // Compute points delta via two FaithPointsService.calculate calls
    Set<ActivityType> oldSet = readTodaysActivityTypes(
        userId, today, tz);  // distinct from activity_log
    Set<ActivityType> newSet = new HashSet<>(oldSet);
    newSet.add(activityType);

    FaithPointsResult oldResult = faithPointsService.calculate(oldSet, 0);
    FaithPointsResult newResult = faithPointsService.calculate(newSet, 0);
    pointsDelta = newResult.pointsEarned() - oldResult.pointsEarned();
    multiplierTier = newResult.multiplierTier();

    // Update lifetime points
    int newLifetimePoints = fp.getTotalPoints() + pointsDelta;
    LevelInfo levelInfo = LevelThresholds.levelForPoints(newLifetimePoints);
    levelUp = levelInfo.level() > fp.getCurrentLevel();
    fp.setTotalPoints(newLifetimePoints);
    fp.setCurrentLevel(levelInfo.level());
    fp.setLastUpdated(Instant.now());
    faithPointsRepository.save(fp);

    // Update streak
    streakResult = streakService.updateStreak(streakData, today);
    persistStreakState(userId, streakResult.newState());

    // Check badges
    BadgeCheckContext context = buildContext(
        userId, streakResult.newState(),
        levelInfo.level(), fp.getCurrentLevel(),
        newSet, /* ... */ );
    Set<String> alreadyEarned = badgeRepository.findByUserId(userId)
        .stream().map(UserBadge::getBadgeId).collect(toSet());
    BadgeResult badgeResult = badgeService.checkBadges(
        context, alreadyEarned);
    newBadgeIds = badgeResult.newlyEarnedBadgeIds();
    newBadgeDefs = badgeResult.newlyEarnedDefinitions();
    persistNewBadges(userId, newBadgeDefs);

    // Update activity_log row's points_earned
    logRow.setPointsEarned(pointsDelta);

    totalPoints = newLifetimePoints;
    currentLevel = levelInfo.level();
} else {
    // record-only path: load current state for response
    streakResult = StreakResult.unchanged(streakData);
    multiplierTier = computeCurrentMultiplierFromTodaysSet(
        userId, today, tz);
    totalPoints = fp.getTotalPoints();
    currentLevel = fp.getCurrentLevel();
}

// Always: persist activity_log (even on record-only path)
activityLogRepository.save(logRow);

return ActivityResponse.from(
    pointsDelta, totalPoints, currentLevel, levelUp,
    streakResult, newBadgeDefs, multiplierTier);
```

This pseudocode is illustrative — CC should structure as it sees fit. The KEY invariants:

- `activity_log` written on every call
- `activity_counts` incremented on every call (if mapping exists)
- `faith_points` / `streak_state` / badge updates ONLY on first-time-today
- all of it inside ONE transaction

### 5. faith_points UPSERT via repository.save (NOT native UPSERT)

Unlike `activity_counts` (which has `ActivityCountsService`'s native UPSERT for atomic increment under concurrency), the `faith_points` and `streak_state` updates happen at most once per request and are gated by the `firstTimeToday` check. Race conditions on the same user's `faith_points` within the same second are exceptionally rare AND the transaction isolation handles them. JPA's `repository.save()` is fine.

If the row doesn't exist (new user's first-ever activity), `FaithPoints.fresh(userId)` creates an in-memory entity that `save()` will INSERT. Subsequent calls UPDATE the existing row.

Same pattern for `streak_state`.

### 6. user_badges persistence with display_count for repeatables

For each newly-earned badge in `BadgeResult`:

- If `catalog.lookup(badgeId).repeatable() == false`: INSERT new `UserBadge` (or no-op if PK conflict — shouldn't happen because `BadgeService` filters already-earned non-repeatable badges out)
- If `catalog.lookup(badgeId).repeatable() == true` (only `full_worship_day` today): UPSERT — increment `display_count` if row exists, INSERT with `display_count=1` if not. Use a native UPSERT query in `BadgeRepository` similar to `ActivityCountsRepository`'s pattern:

```sql
INSERT INTO user_badges (user_id, badge_id, earned_at, display_count)
VALUES (:userId, :badgeId, NOW(), 1)
ON CONFLICT (user_id, badge_id)
DO UPDATE SET
  display_count = user_badges.display_count + 1
```

For this spec, ADD a method `incrementDisplayCount(userId, badgeId)` to `BadgeRepository`. It's the only modification to a 2.4 deliverable; the existing `JpaRepository<UserBadge, UserBadgeId>` stub is unchanged otherwise.

### 7. activity_log insertion with JSONB metadata

The `ActivityLog` entity's `metadata` field is JSONB. Use Hibernate's `@JdbcTypeCode(SqlTypes.JSON)` annotation (or the codebase's existing JSONB pattern — verify during recon). The metadata field is OPTIONAL on the request; null is fine.

Suggested entity field type: `Map<String, Object>` or `JsonNode`. Match whatever convention exists for JSONB handling in the codebase (proxy code might already have a JSONB pattern from Phase 1).

### 8. Input validation at the controller layer

Use Spring's `@Valid` + Bean Validation annotations on `ActivityRequest`:

```java
public record ActivityRequest(
    @NotNull
    ActivityType activityType,
    @NotBlank @Size(max = 50)
    String sourceFeature,
    Map<String, Object> metadata  // optional, no validation
) {}
```

- Invalid `activity_type` (string not in the enum) → 400 with field-level error from the existing validation handler.
- Invalid `sourceFeature` (blank or > 50 chars) → 400.
- Missing body → 400.
- Wrong content-type → 415.

The existing `UserValidationExceptionHandler` already maps `MethodArgumentNotValidException` to the standard error response shape. Don't add new exception handlers.

### 9. OpenAPI schema updates

Add to `openapi.yaml`:

- tag: `"Activity"` (description: `"Activity recording for points, streak, and badge tracking"`)
- path: `/api/v1/activity` (POST)
- schemas: `ActivityRequest`, `ActivityResponse`, `ActivityResponseData`, `StreakSnapshot`, `NewBadge`, `MultiplierTierSnapshot`

Use `$ref` for nested schemas (standard pattern in this file). Auth: requires Bearer JWT; use `security: [{ bearerAuth: [] }]` matching existing authenticated endpoints (verify by reading the `/api/v1/users/me` endpoint definition for precedent).

Run codegen to update frontend types after `openapi.yaml` changes.

### 10. No rate limiting specific to /activity (for now)

The existing `RateLimitFilter` from Phase 1 covers global abuse. The master plan acceptance criterion says "Rate limited per `.claude/rules/02-security.md` (no specific limit on activity writes for now, but the rate limit filter is in place)." Don't add an endpoint-specific rate limit here.

---

## Deliverables

### New code files

- `backend/src/main/java/com/worshiproom/activity/ActivityController.java` — `@RestController`, mapped to `POST /api/v1/activity`. Handles auth principal extraction, request validation, response envelope assembly. Delegates to `ActivityService`.
- `backend/src/main/java/com/worshiproom/activity/ActivityService.java` — `@Service` with `@Transactional` `recordActivity(UUID userId, ActivityRequest)` method. Composes the four services.
- `backend/src/main/java/com/worshiproom/activity/ActivityLog.java` — JPA entity mapping to `activity_log` table. Maps `id`, `user_id`, `activity_type`, `source_feature`, `occurred_at`, `points_earned`, `metadata` (JSONB).
- `backend/src/main/java/com/worshiproom/activity/ActivityLogRepository.java` — Spring Data JPA interface extending `JpaRepository<ActivityLog, UUID>`. Custom query: `countByUserIdAndActivityTypeAndOccurredAtBetween` for the `firstTimeToday` detection. Plus `findDistinctActivityTypesByUserIdAndDateRange` (or equivalent) for assembling today's activity-type set.
- `backend/src/main/java/com/worshiproom/activity/dto/ActivityRequest.java` — Java record per Architectural Decision #8.
- `backend/src/main/java/com/worshiproom/activity/dto/ActivityResponse.java` — Java record matching Decision 5 shape (see recon H).
- `backend/src/main/java/com/worshiproom/activity/dto/ActivityResponseData.java` — Java record for the inner data payload.
- `backend/src/main/java/com/worshiproom/activity/dto/StreakSnapshot.java` — Java record (`current`, `longest`, `newToday`, `graceUsed`, `graceRemaining`).
- `backend/src/main/java/com/worshiproom/activity/dto/NewBadge.java` — Java record (`id`, `name`, `celebrationTier`, `earnedAt`).
- `backend/src/main/java/com/worshiproom/activity/dto/MultiplierTierSnapshot.java` — Java record (`label`, `multiplier`).
- `backend/src/test/java/com/worshiproom/activity/ActivityControllerIntegrationTest.java` — Extends `AbstractIntegrationTest`. Full integration tests covering the scenarios in **Tests Required**.

### Modified code files

- `backend/src/main/java/com/worshiproom/activity/BadgeRepository.java` — Add `incrementDisplayCount(userId, badgeId)` method per Architectural Decision #6. Native UPSERT query.
- `backend/src/main/resources/openapi.yaml` — Add `Activity` tag, `/api/v1/activity` path, and 6 new schemas per Architectural Decision #9.
- `frontend/src/types/api/*` (or wherever generated types live) — Regenerated from updated `openapi.yaml`. CC determines exact files via the codegen command.

### NOT modified

- `pom.xml`: no new dependencies.
- `application.properties`: no changes.
- `master.xml`: no changes (no new migrations).
- `LiquibaseSmokeTest`: no changes.
- `PublicPaths`: no changes (this is an authenticated endpoint).
- `SecurityConfig`: no changes (existing auth chain handles it).
- `User` entity / `UserRepository`: no changes (read-only access).
- `FaithPointsService`, `StreakService`, `BadgeService`, `ActivityCountsService`: no changes (consumed as-is).
- `FaithPoints`, `StreakState`, `ActivityCount`, `UserBadge` entities: no changes (read/write via existing repositories + the new `BadgeRepository` UPSERT method).

---

## Tests Required

Test class: `ActivityControllerIntegrationTest` extends `AbstractIntegrationTest`. Real Spring context, real Postgres via Testcontainers, real HTTP via MockMvc or TestRestTemplate (verify the existing pattern).

Master plan asks for "happy path, level-up case, badge-earned case, streak-continuation case via Testcontainers." Aim for ~21 tests covering 9 categories:

### A) Happy path basics (3 tests)

1. Authenticated POST with valid body returns 200 with `ActivityResponse` populated correctly (`points_earned > 0`, `streak.current = 1` for first-ever, etc.)
2. `activity_log` row created on success
3. `activity_count` incremented when mapping exists (e.g., `pray` → `pray` count = 1)

### B) Authentication & authorization (2 tests)

1. Unauthenticated POST returns 401
2. Invalid JWT returns 401

### C) Validation (3 tests)

1. Missing body returns 400
2. Invalid `activity_type` (string not in enum) returns 400 with field-level error
3. Blank `source_feature` returns 400

### D) Level-up case (2 tests)

1. User with `totalPoints` just below threshold; activity pushes them over → `response.level_up = true`, `response.current_level` incremented, `level_<n>` badge in `response.new_badges`
2. User above threshold; activity doesn't trigger level-up → `response.level_up = false`

### E) Badge-earned case (2 tests)

1. User's first prayer activity → `response.new_badges` contains `'first_prayer'` with correct metadata (`id`, `name`, `celebration_tier`, `earned_at`)
2. `user_badges` row inserted for the new badge

### F) Streak transitions (3 tests)

1. First-ever activity → `streak.current = 1`, `streak.new_today = true`
2. Same-day repeat → `streak.current` unchanged, `streak.new_today = false`
3. Day-over-day → streak incremented

### G) First-time-today gating (3 tests)

1. First "pray" of the day → points/streak/badge updates fire
2. Second "pray" same day → `activity_log` row created, `pray` count incremented again, BUT `points_earned = 0`, no streak change, no new badges
3. Different `activity_type` same day → counts as new for that type (full path)

### H) Transaction rollback (2 tests)

1. Simulate a downstream failure mid-transaction (e.g., bad data triggering CHECK constraint); verify NO partial state — no `activity_log` row, no count increment, no `faith_points` change
2. Successful path leaves all four state changes consistent

### I) Response shape stability (1 test)

1. Response includes ALL Decision 5 fields, including `grace_used = 0` and `grace_remaining = 0` (per Divergence 3)

**Total: ~21 integration tests.** All run against Testcontainers Postgres. Wall-clock target: <15 seconds for the full `ActivityControllerIntegrationTest` class.

---

## Out of Scope

- Frontend changes (Spec 2.7 wires the dual-write call)
- The drift-detection test (Spec 2.8 — separate spec)
- Phase 2 cutover (Spec 2.9)
- Historical activity backfill (Spec 2.10)
- Reading plan progress, bible progress, meditation history, gratitude entries, local visits, listening history backend tables (those data sources stay frontend-only during this wave; `BadgeCheckContext` gets empty values for them)
- Reflection count incrementing (frontend handles via separate code path; backend will get its own future spec)
- Encouragements/intercessions/prayer-wall-posts/full-worship-days/challenges-completed/bible-chapters-read count incrementing via THIS endpoint (those have their own future incrementing paths in their respective feature-area specs)
- Streak repair APPLICATION (only eligibility was ported in 2.3; application is a future spec)
- Welcome/challenge badge granting (separate code paths per Spec 2.4 Divergence 2)
- Endpoint-specific rate limiting
- Soft-delete or audit history for `activity_log`
- WebSocket or SSE push notifications for new badges
- Caching `faith_points` reads
- Materialized aggregations
- Modifying any existing controller, service, entity, or repository (only `BadgeRepository` gains one method)

---

## Acceptance Criteria

- [ ] `POST /api/v1/activity` exists, requires Bearer auth, returns 200 on success with `ActivityResponse` matching Decision 5 shape
- [ ] `ActivityController`, `ActivityService`, `ActivityLog`, `ActivityLogRepository`, and 6 DTO records exist in `com.worshiproom.activity`
- [ ] `BadgeRepository` has `incrementDisplayCount` native UPSERT method
- [ ] `activity_log` row created on every successful call
- [ ] `activity_counts` incremented on every successful call when `activity_type` maps to a `count_type` (7 mappings per recon A)
- [ ] `faith_points` UPSERT, `streak_state` UPSERT, and `user_badges` INSERT/UPSERT happen ONLY on first-time-today (per Divergence 2)
- [ ] Points-delta computation via two `FaithPointsService.calculate` calls (per Architectural Decision #4)
- [ ] Single transaction; rollback on any exception
- [ ] `grace_used` and `grace_remaining` always 0 in response (per Divergence 3)
- [ ] `new_today` derived from `streakResult.transition` (true unless `transition == SAME_DAY`)
- [ ] `new_badges` array includes `id`, `name`, `celebration_tier`, `earned_at` for each newly earned badge
- [ ] `full_worship_day` badge increments `display_count` via UPSERT on repeated firings
- [ ] Invalid `activity_type` returns 400 with field-level error
- [ ] Unauthenticated returns 401
- [ ] `openapi.yaml` has `Activity` tag, `/api/v1/activity` path, and the 6 new schemas
- [ ] Frontend types regenerated; `ActivityRequest` and `ActivityResponse` types available in frontend
- [ ] `ActivityControllerIntegrationTest` has at least 18 tests covering the 9 categories in **Tests Required**, all green
- [ ] Backend test baseline: prior count + ~21 new tests, all green (no existing test regresses)
- [ ] No new dependency in `pom.xml`
- [ ] No `master.xml` changes
- [ ] No frontend changes beyond the regenerated types
- [ ] `FaithPointsService`, `StreakService`, `BadgeService`, `ActivityCountsService` unchanged
- [ ] `FaithPoints`, `StreakState`, `ActivityCount`, `UserBadge` entities unchanged
- [ ] `PublicPaths` unchanged (endpoint requires auth)

---

## Guardrails (DO NOT)

- Do NOT change branches. Stay on `forums-wave-continued`.
- Do NOT modify any frontend file beyond the regenerated types.
- Do NOT modify `FaithPointsService`, `StreakService`, `BadgeService`, or `ActivityCountsService`. Consume them as-is.
- Do NOT modify `FaithPoints`, `StreakState`, `ActivityCount`, or `UserBadge` entities.
- Do NOT modify `ActivityType`, `CountType`, `CelebrationTier`, or any constants from 2.2-2.5.
- Do NOT add this endpoint to `PublicPaths`.
- Do NOT add `@PreAuthorize` annotations (the existing JWT filter handles auth gating).
- Do NOT compute `pointsEarned` by passing a single-element set to `FaithPointsService.calculate`. Use the delta algorithm (Architectural Decision #4).
- Do NOT skip `activity_log` insertion on the record-only path. Every call writes a row.
- Do NOT skip `activity_counts` increment on the record-only path (when mapping exists).
- Do NOT increment counts for activity types without mappings (`mood`, `reflection`, `challenge`, `localVisit`, `devotional`).
- Do NOT add grace-day or grief-pause logic. Per Spec 2.3 divergences, frontend doesn't have them; backend doesn't either.
- Do NOT apply streak repairs in this endpoint. Spec 2.3 only ported eligibility check; application is a future spec.
- Do NOT grant the welcome badge here. It's granted at registration (future spec).
- Do NOT grant challenge badges here. They're granted by challenge-completion code paths (future spec).
- Do NOT introduce a new exception class for activity errors. Reuse standard validation/auth/server-error patterns.
- Do NOT add `Sentry.captureException` calls. The existing global error handler covers it.
- Do NOT add an ALTER migration. Use Spec 2.1's schema as-is.
- Do NOT add columns to `activity_log`, `faith_points`, `streak_state`, `user_badges`, or `activity_counts`.
- Do NOT add a controller-level rate limit. Existing `RateLimitFilter` is sufficient.
- Do NOT add caching. Reads come from DB on every request.
- Do NOT compute `today`/`currentWeekStart` in the service — compute once in the orchestrator at the start of the transaction, pass to all downstream calls.
- Do NOT use `getActiveSpan`/Sentry context manipulation.
- Do NOT commit, push, or do any git operation. Eric handles all git.
- Do NOT touch `_forums_master_plan/spec-tracker.md`.

---

## Plan Shape Expectation

`/plan-forums` output for this L/Medium spec should be 14-20 steps:

1. **Recon:** read `frontend/src/services/faith-points-storage.ts` (the `recordActivity`-equivalent flow), `services/badge-storage.ts` (`ACTIVITY_TYPE_TO_COUNT_KEY`), backend Spec 2.2-2.5 services and entities for composition shape, `openapi.yaml` for endpoint pattern, `UserController` for auth principal pattern, JSONB handling pattern (search for existing `@JdbcTypeCode` usage), frontend type codegen command.
2. Author `ActivityLog` entity.
3. Author `ActivityLogRepository` with `countByUserIdAndActivityTypeAndOccurredAtBetween` plus the distinct-types query.
4. Author `ActivityRequest`, `ActivityResponse`, `ActivityResponseData`, `StreakSnapshot`, `NewBadge`, `MultiplierTierSnapshot` DTOs.
5. Add `incrementDisplayCount` UPSERT method to `BadgeRepository`.
6. Author `ActivityService` (orchestrator) with `@Transactional` `recordActivity` method implementing the 8-step algorithm.
7. Author `ActivityController` with `POST /api/v1/activity` mapping, `@Valid` request, principal extraction, `ActivityResponse` envelope.
8. Update `openapi.yaml`: add tag, path, and 6 schemas.
9. Run codegen to regenerate frontend types.
10. Author `ActivityControllerIntegrationTest` with all 21 tests across 9 categories.
11. Run `./mvnw test`; iterate.
12. Self-review against acceptance criteria; specifically verify:
    - (a) first-time-today gating correctly partitions full-path from record-only-path
    - (b) points-delta is correct across multiplier tier boundaries
    - (c) transaction rollback works
    - (d) `grace_used`/`grace_remaining` = 0 in response

If plan comes back with 25+ steps, proposes ALTER migrations, proposes modifying any 2.2-2.5 service or entity (other than adding `incrementDisplayCount` to `BadgeRepository`), proposes implementing grace days / grief pause / repair application / welcome / challenge badges, or proposes endpoint-specific rate limiting, push back hard.

---

## Notes for Eric

- **Biggest spec of Phase 2.** The orchestration is non-trivial and has several semantic subtleties (delta computation, first-time-today gating, repeatable badge upsert) that this spec tries to pin down explicitly.

- **Pre-execution checklist:** Docker IS required (Testcontainers for the integration tests). Frontend dev server NOT required even though codegen will modify frontend types.

- After 2.6 ships, the backend has a real, tested, authenticated endpoint that the frontend will call. **Spec 2.7 (Frontend Activity Dual-Write) is the cutover** — first frontend changes since Phase 1's doc/content specs.

- The frontend dual-write spec (2.7) is M-sized; much shorter than 2.6.

- After 2.7 ships, **Spec 2.8 (Drift Detection)** gives you the cross-implementation parity test that catches any future drift between frontend and backend faith-point/streak/badge logic.

- **Phase 2 status after this spec:** 6/10 done. Specs 2.7 (M), 2.8 (M), 2.9 (S), 2.10 (M) remaining. The hard part of Phase 2 ends with this spec.
