# Forums Wave: Spec 2.5 — Activity Counts Service

**Master Plan Reference:** `_forums_master_plan/round3-master-plan.md` → Spec 2.5 (line 2714)
**Branch:** `forums-wave-continued` (stay on this branch — no per-spec sub-branch)
**Date:** 2026-04-26

---

## Affected Frontend Routes

N/A — backend-only spec. No frontend code touched. The `ActivityCountsService` this spec creates will be composed by `POST /api/v1/activity` (Spec 2.6) — alongside `FaithPointsService`, `StreakService`, and `BadgeService` from Specs 2.2/2.3/2.4 — and exercised end-to-end by Spec 2.7's frontend dual-write wiring. User-facing behavior does not change in this spec.

---

## Spec Header

- **ID:** `round3-phase02-spec05-activity-counts-service`
- **Size:** S
- **Risk:** Low (narrow scope; well-defined contract; the only genuine concern is atomic increment correctness under concurrency, which has a single canonical solution)
- **Prerequisites:** 2.1 (Activity Engine Schema) ✅, 2.2 (Faith Points Calculation Service) ✅, 2.3 (Streak State Service) ✅, 2.4 (Badge Eligibility Service) ✅ — `activity_counts` table exists per `backend/src/main/resources/db/changelog/2026-04-25-007-create-activity-counts-table.xml`; the `com.worshiproom.activity` package exists with `FaithPoints`, `StreakState`, and `UserBadge` entity precedents.
- **Phase:** 2 — Activity Engine Migration (Dual-Write)
- **Fifth spec of Phase 2.** Spec 2.6 (HTTP endpoint) composes everything; Specs 2.7 (frontend dual-write), 2.8 (drift detection), 2.9 (cutover), and 2.10 (backfill) layer on top.

---

## Goal

Build a persistence-layer service that maintains per-user counts for the 14 activity-derived counters defined in the frontend's `ActivityCounts` interface. The service exposes atomic-increment, get-with-default-zero, and get-all-counts operations against the `activity_counts` table created in Spec 2.1.

This is the **first Phase 2 spec that actually writes to the database.** The previous four (2.2 FaithPoints, 2.3 Streak, 2.4 Badge) are pure-calculation services. This one is the counterweight — pure persistence, no calculation logic.

The eventual consumer is Spec 2.6's `POST /api/v1/activity` endpoint, which will:

(a) call `ActivityCountsService.incrementCount` for the count type derived from the request's `activity_type`
(b) call `ActivityCountsService.getAllCounts` to assemble the `ActivityCountsSnapshot` input for `BadgeService.checkBadges`

---

## Master Plan Divergences

One small tightening of master plan v2.9 § Spec 2.5 worth calling out.

### Divergence 1 — Atomic increment via PostgreSQL UPSERT, NOT pessimistic lock

The master plan's Approach says "Atomic increment via JPA `@Modifying` query OR pessimistic lock." Both are theoretically valid, but UPSERT (PostgreSQL's `INSERT ... ON CONFLICT DO UPDATE`) is strictly better for this use case:

- **Genuinely atomic at the database level** (no race window between the lock acquire and the update)
- **Handles "row doesn't exist yet" in a single round-trip** (pessimistic lock requires a separate INSERT path with its own race condition between SELECT-for-existence and INSERT)
- **No deadlock risk** under concurrent calls to different `(userId, countType)` pairs
- **Standard idiom** for counter tables

This spec prescribes UPSERT specifically. See Architectural Decision #2.

This is a **tightening, not a contradiction** — the master plan allows either approach, and we're picking the better one.

---

## Recon Facts (verified during brief authoring — re-verify suspect ones during execution)

### A) The 14 count types (verbatim from `frontend/src/types/dashboard.ts` `ActivityCounts` interface)

```
pray
journal
meditate
listen
prayerWall
readingPlan
gratitude
reflection
encouragementsSent
fullWorshipDays
challengesCompleted
intercessionCount
bibleChaptersRead
prayerWallPosts
```

These are the canonical wire-format strings. The backend `CountType` enum mirrors these as the `@JsonValue` mapping (same pattern as `ActivityType` from Spec 2.2 and `CelebrationTier` from Spec 2.4).

**NOTE:** `ActivityType` (12 values from Spec 2.2) and `CountType` (14 values from this spec) are DIFFERENT vocabularies with partial overlap. Don't try to unify them — they describe different things (what activities exist vs what counters accumulate). Spec 2.6 will define the `activity_type → count_type` mapping at the call site, not here.

### B) The frontend's count-increment behavior

`frontend/src/services/badge-storage.ts`:

```ts
const ACTIVITY_TYPE_TO_COUNT_KEY: Partial<Record<ActivityType, keyof ActivityCounts>> = {
  pray: 'pray',
  journal: 'journal',
  meditate: 'meditate',
  listen: 'listen',
  prayerWall: 'prayerWall',
  readingPlan: 'readingPlan',
  gratitude: 'gratitude',
  // mood has no counter
};

export function incrementActivityCount(data: BadgeData, type: ActivityType): BadgeData {
  const countKey = ACTIVITY_TYPE_TO_COUNT_KEY[type];
  if (!countKey) return data;  // mood/challenge/localVisit/devotional bail
  return {
    ...data,
    activityCounts: {
      ...data.activityCounts,
      [countKey]: data.activityCounts[countKey] + 1,
    },
  };
}
```

This frontend function only handles **7 of the 14 counters** (the activity-derived ones). The other 7 (`encouragementsSent`, `fullWorshipDays`, `challengesCompleted`, `intercessionCount`, `bibleChaptersRead`, `prayerWallPosts`, plus `reflection`) are incremented by other code paths in the frontend — Prayer Wall code increments `encouragementsSent`/`intercessionCount`/`prayerWallPosts`; Bible reader increments `bibleChaptersRead`; challenges code increments `challengesCompleted`; Full Worship Day handler increments `fullWorshipDays`; Evening Reflection increments `reflection`.

**THIS spec's service doesn't care about which-call-site-increments-which-counter.** It exposes a generic `incrementCount(userId, countType)` and trusts the caller. Spec 2.6 maps `activity_type → count_type` at the controller layer.

### C) Spec 2.1 schema recap (the table)

`activity_counts` table (created by Spec 2.1):

| Column         | Type                       | Constraints                                                                              |
| -------------- | -------------------------- | ---------------------------------------------------------------------------------------- |
| `user_id`      | UUID                       | NOT NULL, FK → `users.id` ON DELETE CASCADE                                              |
| `count_type`   | VARCHAR(50)                | NOT NULL                                                                                 |
| `count_value`  | INTEGER                    | NOT NULL DEFAULT 0; CHECK `activity_counts_count_value_nonneg_check (>= 0)`              |
| `last_updated` | TIMESTAMP WITH TIME ZONE   | NOT NULL DEFAULT NOW()                                                                   |
| —              | —                          | PRIMARY KEY `(user_id, count_type)`                                                      |

Composite primary key `(user_id, count_type)`. The CHECK constraint enforces non-negative `count_value`. The CASCADE foreign key means a user delete cascades to their counts.

### D) Package structure

The `com.worshiproom.activity` package exists from Specs 2.2, 2.3, 2.4. Spec 2.5 adds:

- `com.worshiproom.activity.ActivityCount` (entity)
- `com.worshiproom.activity.ActivityCountId` (composite key)
- `com.worshiproom.activity.ActivityCountsRepository`
- `com.worshiproom.activity.ActivityCountsService`
- `com.worshiproom.activity.CountType` (enum)

### E) Composite-key pattern precedent

`UserBadge` (from Spec 2.4) uses a composite key `(user_id, badge_id)` in the same shape as `ActivityCount`'s `(user_id, count_type)`. CC must use **THE SAME composite-key pattern** (`@IdClass` vs `@EmbeddedId`) that 2.4 chose, for consistency. Re-read `backend/src/main/java/com/worshiproom/activity/UserBadge.java` and `UserBadgeId.java` during recon to match the pattern exactly.

### F) Existing test infrastructure

Spec 1.7 + the Phase 1 Execution Reality Addendum established:

- `AbstractIntegrationTest` — extends with `@SpringBootTest`, full Spring context, registers JDBC properties via `@DynamicPropertySource` for the singleton Postgres Testcontainer.
- `AbstractDataJpaTest` — slice tests with `@DataJpaTest`.

For `ActivityCountsService` testing, **`AbstractIntegrationTest` is the right choice** (the service is so thin that testing it in isolation gives little value; integration tests against the real DB cover both the service and the repository together).

---

## Architectural Decisions

### 1. This is a persistence service, NOT a calculation service

Different posture from Specs 2.2/2.3/2.4:

- Has constructor-injected dependencies (the repository)
- Touches the database
- Has `@Transactional` methods (where appropriate)
- Tests against real Testcontainers Postgres, not mocks

```java
@Service
public class ActivityCountsService {

    private final ActivityCountsRepository repo;

    public ActivityCountsService(ActivityCountsRepository repo) {
        this.repo = repo;
    }

    @Transactional
    public void incrementCount(UUID userId, CountType countType);

    @Transactional(readOnly = true)
    public int getCount(UUID userId, CountType countType);

    @Transactional(readOnly = true)
    public Map<CountType, Integer> getAllCounts(UUID userId);
}
```

### 2. Atomic increment via PostgreSQL UPSERT

The repository exposes a native UPSERT query:

```java
@Modifying
@Query(value = """
    INSERT INTO activity_counts (user_id, count_type, count_value, last_updated)
    VALUES (:userId, :countType, 1, NOW())
    ON CONFLICT (user_id, count_type)
    DO UPDATE SET
      count_value = activity_counts.count_value + 1,
      last_updated = NOW()
    """, nativeQuery = true)
void incrementCount(@Param("userId") UUID userId,
                    @Param("countType") String countType);
```

This is **genuinely atomic.** PostgreSQL handles the conflict detection inside a single statement; no explicit lock, no race window. Two concurrent calls for the same `(userId, countType)` produce `count_value = 2` deterministically.

**Note:** the parameter is `String countType`, not the enum. The service converts `CountType.PRAYER_WALL.getWireValue()` to `"prayerWall"` before passing to the repository. The wire-format string is what gets stored.

### 3. Default-zero semantics for `getCount`

```java
@Transactional(readOnly = true)
public int getCount(UUID userId, CountType countType) {
    return repo.findById(new ActivityCountId(userId, countType.getWireValue()))
               .map(ActivityCount::getCountValue)
               .orElse(0);
}
```

**No null returns.** Missing rows mean "zero count," which is the correct semantic for a counter that has never been incremented.

### 4. `getAllCounts` returns `Map<CountType, Integer>` with zero-fill

```java
@Transactional(readOnly = true)
public Map<CountType, Integer> getAllCounts(UUID userId) {
    List<ActivityCount> rows = repo.findAllByUserId(userId);
    Map<CountType, Integer> result = new EnumMap<>(CountType.class);
    for (CountType type : CountType.values()) {
        result.put(type, 0);
    }
    for (ActivityCount row : rows) {
        CountType.fromWireValue(row.getCountType())
            .ifPresent(type -> result.put(type, row.getCountValue()));
    }
    return result;
}
```

**Every `CountType` is present in the returned map**, even if the row doesn't exist (value = 0). This makes consumer code (Spec 2.6 assembling the `ActivityCountsSnapshot` for `BadgeService`) trivial — no null checks, no missing-key handling.

The `fromWireValue` lookup must handle "wire string in DB that isn't a valid `CountType`" gracefully. **Recommended:** skip-and-log-warning rather than throw — more resilient for production. (Throwing surfaces drift faster but risks one rogue row breaking every `getAllCounts` call.) `fromWireValue` therefore returns `Optional<CountType>` and unknown-string rows are skipped with a `log.warn`.

### 5. `CountType` enum mirrors wire strings

Same pattern as `ActivityType` from Spec 2.2 and `CelebrationTier` from Spec 2.4:

```java
public enum CountType {
    PRAY("pray"),
    JOURNAL("journal"),
    MEDITATE("meditate"),
    LISTEN("listen"),
    PRAYER_WALL("prayerWall"),
    READING_PLAN("readingPlan"),
    GRATITUDE("gratitude"),
    REFLECTION("reflection"),
    ENCOURAGEMENTS_SENT("encouragementsSent"),
    FULL_WORSHIP_DAYS("fullWorshipDays"),
    CHALLENGES_COMPLETED("challengesCompleted"),
    INTERCESSION_COUNT("intercessionCount"),
    BIBLE_CHAPTERS_READ("bibleChaptersRead"),
    PRAYER_WALL_POSTS("prayerWallPosts");

    private final String wireValue;

    @JsonValue
    public String getWireValue() { return wireValue; }

    public static Optional<CountType> fromWireValue(String wire);
}
```

**Full 14 values.** No `mood` (the frontend explicitly excludes it). No `challenge`/`localVisit`/`devotional` (those activity types have no corresponding counters).

### 6. No controller, no API surface

This is a **service-only spec.** Spec 2.6 owns the controller that calls it. No `openapi.yaml` changes here.

### 7. No logic for deriving which counter to increment

The `activity_type → count_type` mapping is **intentionally absent** from this spec. The mapping decision happens at the call site (controller) in Spec 2.6, not in this service. This service just: "given a `CountType`, increment it atomically."

---

## Files to Create

### Production source (5 files)

- `backend/src/main/java/com/worshiproom/activity/CountType.java`
  - Java enum with 14 values per Architectural Decision #5. Includes `@JsonValue` accessor and `fromWireValue` static lookup returning `Optional<CountType>`.
- `backend/src/main/java/com/worshiproom/activity/ActivityCountId.java`
  - Composite key class for `ActivityCount`. Same pattern (`@IdClass` vs `@EmbeddedId`) as `UserBadgeId` from Spec 2.4 — verify during recon and match exactly.
- `backend/src/main/java/com/worshiproom/activity/ActivityCount.java`
  - JPA entity. `@Entity`, `@Table(name = "activity_counts")`. Maps `user_id` (UUID), `count_type` (String), `count_value` (int), `last_updated` (`Instant` or `OffsetDateTime` — match the precedent from `FaithPoints`/`UserBadge` entities). Composite key matches the `UserBadge` pattern.
- `backend/src/main/java/com/worshiproom/activity/ActivityCountsRepository.java`
  - Spring Data JPA interface extending `JpaRepository<ActivityCount, ActivityCountId>` with two custom queries:
    - `incrementCount(userId, countType)` — UPSERT per Architectural Decision #2
    - `findAllByUserId(userId)` — derived query method, returns `List<ActivityCount>`
- `backend/src/main/java/com/worshiproom/activity/ActivityCountsService.java`
  - `@Service` with three public methods per Architectural Decision #1.

### Tests (2 files)

- `backend/src/test/java/com/worshiproom/activity/CountTypeTest.java`
  - Pure JUnit 5 tests for `CountType` enum (wire-value mapping, `fromWireValue` round-trip, unknown-value handling).
- `backend/src/test/java/com/worshiproom/activity/ActivityCountsServiceIntegrationTest.java`
  - Extends `AbstractIntegrationTest`. Full integration tests against Testcontainers Postgres. Test list per the **Tests Required** section.

---

## Files to Modify

**NONE.**

- `pom.xml`: no new dependencies.
- `application.properties` (any profile): no changes.
- `master.xml`: no changes (no new migrations).
- `LiquibaseSmokeTest`: no changes.
- `openapi.yaml`: no changes.
- All 2.2/2.3/2.4 deliverables (`FaithPointsService`, `StreakService`, `BadgeService`, `ActivityType`, `CelebrationTier`, etc.): no changes.

---

## Database Changes

**NONE.** The `activity_counts` table already exists from Spec 2.1. This spec only creates the JPA entity that maps to the existing schema. No `ALTER TABLE`, no new tables, no new indexes, no new changesets.

---

## API Changes

**NONE.** No controller, no endpoint, no OpenAPI updates. Spec 2.6 owns the `POST /api/v1/activity` endpoint that will compose `ActivityCountsService` with the rest of the activity engine.

---

## Tests Required

Test classes:

- `ActivityCountsServiceIntegrationTest` extends `AbstractIntegrationTest`
- `CountTypeTest` (pure JUnit 5, no Spring)

Master plan asks for "at least 5 unit tests." This spec asks for a comprehensive integration suite (~12 tests) plus a few unit tests on the enum, because most of this service's behavior is database-bound and only meaningfully tested against real Postgres.

### A) `ActivityCountsServiceIntegrationTest` (~12 tests)

1. `incrementCount` on fresh `(userId, countType)` creates row with `count_value = 1`.
2. `incrementCount` on existing row increments `count_value` by 1 (pre-seed row at value 5, increment, assert 6).
3. Multiple sequential increments on the same key produce the expected total (10 increments, assert value = 10).
4. Increments on different `countType` for the same user stay independent (3 increments to `PRAY`, 2 to `JOURNAL`; assert `PRAY=3`, `JOURNAL=2`).
5. Increments on the same `countType` for different users stay independent (user A increments `PRAY` 5 times, user B increments `PRAY` 2 times; assert independent values).
6. `last_updated` column updates on each increment (read timestamp before, increment, read after, assert after > before).
7. `getCount` returns 0 for `(userId, countType)` where no row exists.
8. `getCount` returns current value for existing row.
9. `getAllCounts` returns a map with all 14 `CountType` keys present, value 0 for absent rows, current value for present rows.
10. **CONCURRENT INCREMENT TEST** — load-bearing for the "no race condition" acceptance criterion. Use a `CountDownLatch` + `ExecutorService` (10 threads) to fire 100 concurrent increments to the same `(userId, countType)`. Wait for all to complete. Assert `count_value = 100` exactly. *This test verifies the UPSERT pattern's atomicity. If it ever fails (sees a value < 100), the implementation has lost a write — investigate immediately.*
11. **CHECK constraint violation:** attempt direct SQL UPDATE setting `count_value = -1` → fails with `DataIntegrityViolationException` citing the `activity_counts_count_value_nonneg_check` constraint. *(Sanity check that Spec 2.1's CHECK constraint is still enforcing.)*
12. **Foreign key cascade:** insert user, increment counts, delete user, verify `activity_counts` rows are gone.

### B) `CountTypeTest` (~5 tests)

1. Every `CountType` has a non-null `wireValue`.
2. `fromWireValue("pray")` returns `CountType.PRAY` for all 14 mappings (parameterize this).
3. `fromWireValue("nonexistent")` returns `Optional.empty` (per Architectural Decision #4 resilience choice).
4. Round-trip: for every `CountType`, `fromWireValue(type.getWireValue()).get() == type`.
5. JSON serialization via Jackson produces the wire string (use `ObjectMapper` to verify `writeValueAsString(CountType.PRAYER_WALL) == "\"prayerWall\""`).

**Total: ~17 tests across both files.** Wall-clock target for the integration suite: <8s (most of the cost is Spring context boot, which the singleton container amortizes across the existing test suite). The concurrency test adds ~1s; acceptable.

---

## Acceptance Criteria

- [ ] `CountType` enum has 14 values matching the wire strings in Recon section A exactly
- [ ] `ActivityCount` JPA entity maps to `activity_counts` table with all 4 columns and composite primary key
- [ ] `ActivityCountsRepository` extends `JpaRepository<ActivityCount, ActivityCountId>`
- [ ] Repository has `incrementCount(userId, countType)` method using PostgreSQL UPSERT (`INSERT ... ON CONFLICT DO UPDATE`)
- [ ] Repository has `findAllByUserId` derived query method
- [ ] `ActivityCountsService` has `incrementCount`, `getCount`, `getAllCounts` methods per Architectural Decision #1
- [ ] `getCount` returns 0 for missing rows (never null)
- [ ] `getAllCounts` returns a 14-entry map with zero-fill for absent rows
- [ ] **Atomic increment verified by concurrent-write test** (100 simultaneous increments produce `count_value = 100`)
- [ ] All 14 `CountType` values round-trip through wire-format serialization
- [ ] `ActivityCountsServiceIntegrationTest` has at least 12 tests, all passing
- [ ] `CountTypeTest` has at least 5 tests, all passing
- [ ] Backend test baseline: prior count + ~17 new tests, all green
- [ ] No frontend changes
- [ ] No new dependency in `pom.xml`
- [ ] No `openapi.yaml` changes
- [ ] No `master.xml` changes (no new migrations)
- [ ] `LiquibaseSmokeTest` unchanged
- [ ] FaithPoints, Streak, Badge entities/services and any 2.2/2.3/2.4 deliverables unchanged
- [ ] Service uses `@Transactional` appropriately (write methods use the default isolation; read methods use `readOnly = true`)
- [ ] Composite-key pattern matches `UserBadge` from Spec 2.4 (whichever of `@IdClass` or `@EmbeddedId` 2.4 chose)

---

## Out of Scope

- The `activity_type → count_type` mapping logic (Spec 2.6 defines it at the controller)
- Decrement, reset, or set-to-arbitrary-value operations (no caller needs them)
- Bulk-increment-multiple-counters API (no caller needs it; Spec 2.6 calls `incrementCount` once per request)
- Historical count tracking / audit log (`count_value` is the current state; no history beyond `last_updated`)
- Materialized aggregations or rollups
- The `POST /api/v1/activity` endpoint (Spec 2.6)
- Frontend dual-write (Spec 2.7)
- Drift detection (Spec 2.8)
- Modifying `activity_counts` schema (no `ALTER` migrations; Spec 2.1's schema is what it is)
- Modifying any 2.2/2.3/2.4 deliverable
- Modifying any frontend file

---

## Guardrails (DO NOT)

- **Do NOT change branches.** Stay on `forums-wave-continued`.
- Do NOT modify any frontend file.
- Do NOT use a pessimistic lock pattern. UPSERT is the prescribed approach.
- Do NOT use `findById` + `setValue` + `save` for incrementing — that has a race condition between read and write.
- Do NOT add a controller. Spec 2.6 owns the endpoint.
- Do NOT define the `activity_type → count_type` mapping in this spec. That belongs to Spec 2.6.
- Do NOT add `ActivityType`-related logic. `ActivityType` (from Spec 2.2) and `CountType` (this spec) are separate vocabularies.
- Do NOT include `mood` in `CountType`. The frontend explicitly excludes mood from counters.
- Do NOT include `challenge`, `localVisit`, or `devotional` in `CountType`. They have no corresponding counters in `ActivityCounts`.
- Do NOT add columns to `activity_counts`. The schema from Spec 2.1 is fixed.
- Do NOT create new tables.
- Do NOT add `Sentry.captureException` calls.
- Do NOT add `openapi.yaml` entries.
- Do NOT modify `FaithPointsService`, `StreakService`, `BadgeService`, or any 2.2/2.3/2.4 deliverable.
- Do NOT create historical/audit tables for counts.
- Do NOT use `@Lock(LockModeType.PESSIMISTIC_WRITE)` anywhere.
- Do NOT use Spring's `RetryTemplate` or `@Retryable` for the increment — UPSERT eliminates the need for retry.
- Do NOT commit, push, or do any git operation. Eric handles all git.
- Do NOT touch `_forums_master_plan/spec-tracker.md`.

---

## Plan Shape Expectation

`/plan-forums` output for this S/Low spec should be **7–10 steps**:

1. **Recon:** read `frontend/src/types/dashboard.ts` (`ActivityCounts` interface — 14 fields), `frontend/src/services/badge-storage.ts` (`incrementActivityCount` logic + `ACTIVITY_TYPE_TO_COUNT_KEY` for context), Spec 2.4's `UserBadge.java` + `UserBadgeId.java` for composite-key pattern, Spec 2.1's `2026-04-25-007-create-activity-counts-table.xml` for schema confirmation, `AbstractIntegrationTest` base class.
2. Author `CountType` enum with 14 values + wire-format mapping + `fromWireValue` lookup.
3. Author `CountTypeTest` with the 5+ unit tests.
4. Author `ActivityCountId` composite key class.
5. Author `ActivityCount` JPA entity.
6. Author `ActivityCountsRepository` with UPSERT `@Modifying` query and `findAllByUserId`.
7. Author `ActivityCountsService` with `incrementCount`, `getCount`, `getAllCounts` methods.
8. Author `ActivityCountsServiceIntegrationTest` with the 12+ integration tests including the concurrency test.
9. Run `./mvnw test`; iterate.
10. Self-review against acceptance criteria; specifically verify the atomic-increment test produces `count_value = 100` deterministically.

**If the plan comes back with 15+ steps, proposes pessimistic locks, proposes a controller, proposes ALTER migrations, proposes the `activity_type → count_type` mapping in this spec, or proposes `RetryTemplate` / `@Retryable`, push back hard.**

---

## Notes for Eric

- After four pure-calculation specs in a row, **this one actually writes to the database.** Different feel: Testcontainers is required, the concurrency test is load-bearing, and the service has constructor-injected dependencies.

- **Pre-execution checklist:** Docker IS required this time. Start `docker-compose` Postgres OR rely on Testcontainers (which auto-starts its own container during test runs). For pure `./mvnw test`, Testcontainers handles it.

- **The concurrency test (100 simultaneous increments) is the one acceptance criterion that genuinely earns its keep.** Watch the test output during code review — if it ever reports `count_value < 100`, the UPSERT isn't working atomically and the implementation needs a closer look.

- After 2.5 ships, **Spec 2.6 (Activity API Endpoint) is where EVERYTHING composes.** `POST /api/v1/activity` orchestrates `FaithPointsService` + `StreakService` + `BadgeService` + `ActivityCountsService` behind a single transaction. That one will feel different — biggest spec of Phase 2 by surface area.
