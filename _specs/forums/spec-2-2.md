# Forums Wave: Spec 2.2 — Faith Points Calculation Service (Backend Port)

**Master Plan Reference:** `_forums_master_plan/round3-master-plan.md` → Spec 2.2 (line ~2638), Decision 5 (line ~700)
**Branch:** `forums-wave-continued` (stay on this branch — no per-spec sub-branch)
**Date:** 2026-04-26

---

## Affected Frontend Routes

N/A — backend-only spec. No frontend code touched. The `FaithPointsService` this spec creates will be composed by `POST /api/v1/activity` (Spec 2.6) and exercised end-to-end by Spec 2.7's frontend dual-write wiring; user-facing behavior does not change in this spec.

---

## Spec Header

- **ID:** `round3-phase02-spec02-faith-points-service`
- **Size:** L
- **Risk:** Medium (must match frontend logic exactly — drift here breaks every consumer of the dual-write strategy)
- **Prerequisites:** 2.1 (Activity Engine Schema) ✅ — the five Liquibase changesets at `backend/src/main/resources/db/changelog/2026-04-25-003-...` through `2026-04-25-007-...` exist on disk and applied during Phase 2.1 execution. Spec-tracker still shows 2.1 as ⬜ pending Eric's manual update — that's expected, not a blocker.
- **Phase:** 2 — Activity Engine Migration (Dual-Write)
- **Second spec of Phase 2.** Specs 2.3 (streak service), 2.4 (badge service), 2.5 (activity counts), 2.6 (HTTP endpoint) layer on top.

---

## Goal

Port the existing frontend faith-points calculation logic from `frontend/src/services/faith-points-storage.ts` (and its constants files in `frontend/src/constants/dashboard/`) to a backend `FaithPointsService` that produces byte-identical output for the same inputs.

This is a **faithful port, NOT a redesign.** Same 12 activity types, same point values, same 4-tier multiplier system, same 6-level threshold curve. If the frontend rounds with `Math.round`, the backend uses `Math.round`. Improvements, refactors, fixes — all out of scope for this spec.

The eventual consumer is Spec 2.6's `POST /api/v1/activity` endpoint. Spec 2.8 ships the drift-detection test that asserts frontend and backend produce identical results across ~50 shared scenarios. THIS spec just ensures the values are right at the moment of porting.

---

## Master Plan Divergences

Two small clarifications from master plan v2.9 § Spec 2.2 body worth pinning before drafting:

### 1. JPA entity + repository are scaffolding, not consumed here

The master plan body lists `FaithPointsRepository.java` in the files-to-create list, but the Approach section and acceptance criteria are unambiguous about the SERVICE being pure-calculation: "No database calls in unit tests — pure logic only."

**Resolution:** this spec creates a `FaithPoints` JPA entity that maps to the `faith_points` table from Spec 2.1, plus a `FaithPointsRepository` Spring Data interface stub. NEITHER is consumed by `FaithPointsService` in this spec. They sit as scaffolding for Spec 2.6 to inject and use. The service methods are pure functions over their inputs.

This keeps the spec scope clean (calculation only), defers persistence behavior to the spec that owns the endpoint (2.6), and follows the master plan's file list literally.

### 2. Test scenarios hardcoded in Java, not JSON fixture file

The master plan's Decision 5 mentions a shared `_test_fixtures/activity-engine-scenarios.json` file that both frontend and backend implementations will be tested against. That file is introduced by Spec 2.8 (drift detection), NOT by this spec.

For this spec: hardcode test scenarios in Java directly (per the master plan's Approach: "hardcoded set of (input, expected output) pairs"). When Spec 2.8 ships, it extracts the scenarios from both implementations and builds the shared JSON file then.

---

## Recon Facts (verified during brief authoring — re-verify suspect ones during execution)

### A) The frontend calculation logic

`frontend/src/services/faith-points-storage.ts` exposes:

```ts
calculateDailyPoints(activities: DailyActivities): {
  points: number;
  multiplier: number;
}
```

The full implementation (verified at `frontend/src/services/faith-points-storage.ts` lines 89–109):

```ts
let basePoints = 0;
let activityCount = 0;
for (const key of ACTIVITY_BOOLEAN_KEYS) {
  if (activities[key]) {
    basePoints += ACTIVITY_POINTS[key];
    activityCount++;
  }
}
let multiplier = 1;
for (const tier of MULTIPLIER_TIERS) {
  if (activityCount >= tier.minActivities) {
    multiplier = tier.multiplier;
    break;
  }
}
return { points: Math.round(basePoints * multiplier), multiplier };
```

The level-derivation logic lives separately at `frontend/src/constants/dashboard/levels.ts` (lines 26–42):

```ts
export function getLevelForPoints(points: number): {
  level: number;
  name: string;
  pointsToNextLevel: number;
} {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (points >= LEVEL_THRESHOLDS[i].threshold) {
      const nextThreshold = LEVEL_THRESHOLDS[i + 1]?.threshold ?? null;
      return {
        level: LEVEL_THRESHOLDS[i].level,
        name: LEVEL_THRESHOLDS[i].name,
        pointsToNextLevel:
          nextThreshold !== null ? nextThreshold - points : 0,
      };
    }
  }
  return { level: 1, name: 'Seedling', pointsToNextLevel: 100 };
}
```

CC reads both files during execution to confirm these snippets are still accurate.

### B) The twelve activity types (verbatim, frontend-canonical)

From `frontend/src/constants/dashboard/activity-points.ts`:

```ts
ACTIVITY_POINTS: Record<ActivityType, number> = {
  mood: 5,
  pray: 10,
  listen: 10,
  prayerWall: 15,
  readingPlan: 15,
  meditate: 20,
  journal: 25,
  gratitude: 5,
  reflection: 10,
  challenge: 20,
  localVisit: 10,
  devotional: 10,
}
```

Frontend canonical key order:
`mood, pray, listen, prayerWall, readingPlan, meditate, journal, gratitude, reflection, challenge, localVisit, devotional`

The frontend uses camelCase keys (`prayerWall`, `readingPlan`, `localVisit`). The Spec 2.1 schema for `activity_log.activity_type` is `VARCHAR(50)`. The wire-format string sent over `POST /activity` will be the camelCase string directly — no transformation.

### C) The four multiplier tiers (verbatim, ordered)

```ts
MULTIPLIER_TIERS = [
  { minActivities: 7, multiplier: 2,    label: 'Full Worship Day' },
  { minActivities: 4, multiplier: 1.5,  label: 'Devoted' },
  { minActivities: 2, multiplier: 1.25, label: 'Growing' },
  { minActivities: 0, multiplier: 1,    label: '' },
]
```

The order matters — the loop short-circuits on the first match, so 7+ activities beats 4+ which beats 2+ which beats 0+.

Note the empty-string label for the base tier — preserve it verbatim. Don't substitute "None" or "Base" or anything.

### D) The six level thresholds (verbatim)

```ts
LEVEL_THRESHOLDS = [
  { level: 1, name: 'Seedling',     threshold: 0     },
  { level: 2, name: 'Sprout',       threshold: 100   },
  { level: 3, name: 'Blooming',     threshold: 500   },
  { level: 4, name: 'Flourishing',  threshold: 1500  },
  { level: 5, name: 'Oak',          threshold: 4000  },
  { level: 6, name: 'Lighthouse',   threshold: 10000 },
]
```

Level 6 (Lighthouse) is the cap. `pointsToNextLevel` returns 0 for users at level 6 (no further level to advance to).

### E) Rounding semantics

JavaScript `Math.round(x)`: for positive `x`, rounds half away from zero (`15 * 1.5 = 22.5 → 23`).

Java `Math.round(double)`: identical behavior for positive inputs (rounds half toward positive infinity, which equals half-away-from-zero when the value is positive).

All inputs to multiplication here are non-negative integers times non-negative doubles, so the products are always non-negative. Java's `Math.round((double) basePoints * multiplier)` produces identical output to JavaScript's `Math.round(basePoints * multiplier)` for every input we'll encounter.

CC must use `Math.round` (not `BigDecimal`, not `Math.floor`, not custom rounding). The frontend's choice IS the contract.

### F) Spec 2.1 schema recap (relevant tables)

`faith_points` table (created by Spec 2.1, currently empty — verified at `backend/src/main/resources/db/changelog/2026-04-25-004-create-faith-points-table.xml`):

| Column          | Type                       | Constraints                                                                |
| --------------- | -------------------------- | -------------------------------------------------------------------------- |
| `user_id`       | UUID                       | PRIMARY KEY, FK → users.id ON DELETE CASCADE                               |
| `total_points`  | INTEGER                    | NOT NULL DEFAULT 0; CHECK `faith_points_total_points_nonneg_check (>= 0)`  |
| `current_level` | INTEGER                    | NOT NULL DEFAULT 1; CHECK `faith_points_current_level_positive_check (>= 1)` |
| `last_updated`  | TIMESTAMP WITH TIME ZONE   | NOT NULL DEFAULT NOW()                                                     |

The JPA entity must map this exact shape. No hidden columns, no `@Version`, no audit fields beyond `last_updated`.

### G) Package structure

The `com.worshiproom.activity` package does NOT exist yet (Spec 2.1 was schema-only; verified by `ls backend/src/main/java/com/worshiproom/`). This spec creates it.

Established sibling-package patterns (verified by reading `com.worshiproom.user`):

- `com.worshiproom.user.User` (entity, manual getters/setters, `@PrePersist` for UUID)
- `com.worshiproom.user.UserRepository` (Spring Data interface)
- `com.worshiproom.user.UserService` (business logic)
- `com.worshiproom.user.UserController` (HTTP)
- `com.worshiproom.user.UserException` (domain exceptions)
- `com.worshiproom.user.UserExceptionHandler` (advice)

Mirror this layout for activity (minus the controller — Spec 2.6 owns the controller). **The User entity uses manual getters/setters, NOT Lombok.** Match that style for `FaithPoints`.

The enum-conversion pattern in `User` (`@Convert(converter = DisplayNamePreferenceConverter.class)` on a `DisplayNamePreference` enum with `dbValue()` / `fromDbValue()` methods) is for **DB column persistence**, not for JSON wire serialization. Since `ActivityType` in this spec is NEVER a column on `FaithPoints` (it's only consumed via JSON request bodies in Spec 2.6's controller), it needs Jackson serialization (`@JsonValue` + `@JsonCreator`), NOT `AttributeConverter`. The two patterns serve different purposes.

---

## Architectural Decisions

### 1. Pure calculation service — no database

`FaithPointsService` exposes:

```java
public FaithPointsResult calculate(
    Set<ActivityType> activities,
    int currentTotalPoints
)
```

The method computes:

- `basePoints` (sum of point values for the given activities)
- `activityCount` (size of the set)
- `multiplier tier` (label + multiplier value)
- `pointsEarned = Math.round(basePoints * multiplier)`
- `newTotalPoints = currentTotalPoints + pointsEarned`
- `levelInfo` for newTotalPoints (level, name, pointsToNextLevel)
- `levelUp` boolean (current level vs new level)

The service has **NO `@Autowired` dependencies. NO repository injected.** Pure function. Spec 2.6 will compose this service with the repository to read/write the database.

### 2. The entity and repository are scaffolding-only

`FaithPoints.java` is a JPA entity mapping to `faith_points`. `FaithPointsRepository.java` extends `JpaRepository<FaithPoints, UUID>` with no custom methods.

**Neither is referenced by `FaithPointsService`.** They're built here so Spec 2.6 doesn't have to backtrack and add them.

### 3. ActivityType enum mirrors frontend strings exactly

Java enum constants are `SCREAMING_SNAKE_CASE` by convention, but the wire-format string MUST be camelCase to match the frontend. Use `@JsonValue` and `@JsonCreator` to map:

```java
public enum ActivityType {
  MOOD("mood"),
  PRAY("pray"),
  LISTEN("listen"),
  PRAYER_WALL("prayerWall"),
  READING_PLAN("readingPlan"),
  MEDITATE("meditate"),
  JOURNAL("journal"),
  GRATITUDE("gratitude"),
  REFLECTION("reflection"),
  CHALLENGE("challenge"),
  LOCAL_VISIT("localVisit"),
  DEVOTIONAL("devotional");

  private final String wireValue;

  ActivityType(String wireValue) { this.wireValue = wireValue; }

  @JsonValue
  public String wireValue() { return wireValue; }

  @JsonCreator
  public static ActivityType fromWireValue(String value) { /* lookup */ }
}
```

`@JsonValue` / `@JsonCreator` are the right Jackson pattern for JSON wire format. The `User` package's `DisplayNamePreferenceConverter` (`AttributeConverter`) is the right pattern for **DB column persistence**, which this enum doesn't need (it's never persisted as a column on `FaithPoints`).

### 4. Constants live in a separate sub-package

Mirror the master plan's file list:

- `com.worshiproom.activity.constants.PointValues`
- `com.worshiproom.activity.constants.MultiplierTiers`
- `com.worshiproom.activity.constants.LevelThresholds`

Each is a final class with a private constructor (utility class pattern) holding the relevant constants. `PointValues` exposes a `Map<ActivityType, Integer>` (or 12 individual constants) — CC's call. The values are the contract; the exposure shape is incidental.

### 5. Result DTO shape

`com.worshiproom.activity.dto.FaithPointsResult`:

```java
public record FaithPointsResult(
  int basePoints,
  int activityCount,
  int pointsEarned,
  int totalPoints,
  int currentLevel,
  String currentLevelName,
  int pointsToNextLevel,
  boolean levelUp,
  MultiplierTier multiplierTier
) {}
```

Use a Java record (Java 21, available in this codebase). Records are immutable, ergonomic, and the right shape for pure-data-transfer objects. `MultiplierTier` is also a record (`record MultiplierTier(String label, double multiplier) {}`).

### 6. No Sentry instrumentation here

The service is pure logic; it can throw `IllegalArgumentException` if called with garbage inputs, but those bubble through the global handler chain established in 1.10g/1.10h. **No explicit `Sentry.captureException` calls.** The expected-exception filter from 1.10d already drops `IllegalArgumentException`-equivalent errors when they're thrown as validation failures from controller layers; service-level logic exceptions don't need special handling.

### 7. No logging inside the service

The service is called per-request from Spec 2.6's controller. Each call is a normal request, not a noteworthy event. The request-id middleware already captures the request context. **`FaithPointsService` should not emit info/debug logs** unless debugging a specific issue surfaces a need.

---

## Files to Create

```
backend/src/main/java/com/worshiproom/activity/
├── FaithPoints.java                            JPA entity (scaffolding only — not consumed by service)
├── FaithPointsRepository.java                  JpaRepository<FaithPoints, UUID> stub (scaffolding only)
├── FaithPointsService.java                     @Service, pure calculation, no Spring deps
├── ActivityType.java                           Enum, 12 values, @JsonValue/@JsonCreator
├── MultiplierTier.java                         record(String label, double multiplier)
├── constants/
│   ├── PointValues.java                        12 point values, final class, private ctor
│   ├── MultiplierTiers.java                    4 tiers in canonical highest-first order
│   └── LevelThresholds.java                    6 levels + levelForPoints(int) static
└── dto/
    └── FaithPointsResult.java                  Java record per Decision 5

backend/src/test/java/com/worshiproom/activity/
└── FaithPointsServiceTest.java                 28+ tests, plain JUnit 5, no Spring
```

## Files to Modify

**NONE.**

- `pom.xml`: no new dependencies
- `application.properties` / `application-prod.properties` / `application-dev.properties`: no changes
- `db/changelog/master.xml`: no changes (no new migrations)
- `LiquibaseSmokeTest`: no changes (no schema work)
- `openapi.yaml`: no changes (no new endpoints — Spec 2.6 owns this)
- Existing exception handlers (`ProxyExceptionHandler`, `RateLimitExceptionHandler`, `UserExceptionHandler`): no changes

## Database Changes

**NONE.** The `faith_points` table was created in Spec 2.1. This spec adds the JPA entity + repository as scaffolding for Spec 2.6 but introduces no new tables, columns, indexes, or constraints. `master.xml` is untouched.

## API Changes

**NONE.** This spec creates no controllers and no endpoints. `POST /api/v1/activity` is owned by Spec 2.6. `openapi.yaml` is untouched.

## Copy Deck

**N/A — this spec creates no user-facing strings.** The service is server-internal pure calculation. The level names ("Seedling", "Sprout", "Blooming", "Flourishing", "Oak", "Lighthouse") and multiplier labels ("Full Worship Day", "Devoted", "Growing", "") are user-facing **but ported verbatim from the frontend** — they are NOT new copy in this spec, they are exact mirrors. Per the faithful-port discipline, no copy review applies.

## Anti-Pressure Copy Checklist

**N/A — no new user-facing copy in this spec.** The pre-existing frontend strings (level names, multiplier labels) have already passed anti-pressure review during their original authoring; mirroring them verbatim does not require re-review.

---

## Tests Required

Test class: `FaithPointsServiceTest`, **plain JUnit 5** (NOT `@SpringBootTest`, NOT `@DataJpaTest`, NOT extending `AbstractIntegrationTest`). Per the master plan's acceptance criterion: "No database calls in unit tests — pure logic only."

The service has no Spring dependencies, so the test should instantiate it directly: `new FaithPointsService()`.

### Minimum test coverage (master plan target: "at least 20 unit tests"; this spec targets 28+)

#### A) Single-activity point values (12 tests, one per activity)

- Each activity alone produces base points equal to its `ACTIVITY_POINTS` value, multiplier 1.0, label `""` (empty).
- These 12 tests collectively pin every entry in the `PointValues` constant.

#### B) Multiplier tier boundaries (5+ tests)

- 0 activities → multiplier 1.0, label `""`, 0 points
- 1 activity → multiplier 1.0, label `""`
- 2 activities (smallest 2: `mood` + `gratitude`) → multiplier 1.25, label `"Growing"`, points = round(10 × 1.25) = **13**
- 4 activities → multiplier 1.5, label `"Devoted"`
- 7 activities → multiplier 2.0, label `"Full Worship Day"`
- 12 activities (all) → multiplier 2.0, label `"Full Worship Day"`, base points = 155, total = round(155 × 2) = **310**

#### C) Level-up scenarios (6+ tests)

- `currentTotalPoints = 95`, earn 10 → `totalPoints = 105`, levelUp from 1 to 2, level name "Sprout"
- `currentTotalPoints = 99`, earn 1 → `totalPoints = 100`, levelUp from 1 to 2 (boundary equality)
- `currentTotalPoints = 100`, earn 0 → `totalPoints = 100`, levelUp false (same level)
- One test per level boundary (1→2, 2→3, 3→4, 4→5, 5→6)
- `currentTotalPoints = 9999`, earn 1 → `totalPoints = 10000`, level 6 "Lighthouse", `pointsToNextLevel = 0`

#### D) Rounding edge cases (3+ tests)

- `basePoints * multiplier` producing a half value rounds up (e.g., 15 × 1.5 = 22.5 → **23**)
- `basePoints * multiplier` producing exact integer doesn't drift (e.g., 10 × 2 = 20.0 → **20**)
- Worst-case all-12-activities × 2.0 = **310** (verifies the `MAX_DAILY_POINTS` constant from frontend)

#### E) Defensive cases (2+ tests)

- Empty activity set → 0 points, multiplier 1.0, activityCount 0
- Negative `currentTotalPoints` (shouldn't happen in practice but the service shouldn't blow up; document expected behavior — CC's call on whether to throw `IllegalArgumentException` or treat as 0)

**Total minimum: 28 tests.** The master plan asks for 20+; this list goes deliberately further to pin every numeric value in the contract. Per the master plan acceptance criteria — "Every ActivityType enum value matches a frontend activity type string-for-string" and "Point values match the frontend constants file value-for-value" — the per-activity tests in group A and the multiplier-tier tests in group B together satisfy both.

**NO `@SpringBootTest`, NO Testcontainers, NO database.** Wall-clock target for `FaithPointsServiceTest`: under 1 second (pure unit tests).

---

## Acceptance Criteria

- [ ] `com.worshiproom.activity` package exists with the nine production source files listed in **Files to Create**.
- [ ] `FaithPoints` JPA entity maps to `faith_points` table with correct column names, types, and constraints (matches Spec 2.1 schema exactly: `user_id` UUID PK, `total_points` INTEGER, `current_level` INTEGER, `last_updated` `TIMESTAMP WITH TIME ZONE`).
- [ ] `FaithPointsRepository` extends `JpaRepository<FaithPoints, UUID>`; no custom methods.
- [ ] `ActivityType` enum has all 12 values; each maps to its frontend camelCase wire-format string via `@JsonValue` / `@JsonCreator`.
- [ ] `PointValues` has all 12 point values per recon section B; values are byte-identical to frontend constants.
- [ ] `MultiplierTiers` has all four tiers in canonical order (7→2.0, 4→1.5, 2→1.25, 0→1.0); labels match frontend verbatim (including the empty-string base label).
- [ ] `LevelThresholds` has all six levels; thresholds match frontend exactly; `levelForPoints` behavior matches frontend's `getLevelForPoints` across all six levels and the level-6 cap.
- [ ] `FaithPointsService.calculate` produces identical output to the frontend for every test scenario.
- [ ] `FaithPointsResult` record has the nine fields specified in Architectural Decision 5.
- [ ] `FaithPointsServiceTest` has at least 28 tests covering the five categories listed in **Tests Required**. All pass.
- [ ] Tests are pure JUnit 5 — no `@SpringBootTest`, no Testcontainers.
- [ ] Backend test baseline: 445+ tests pass, 0 fail (existing ~445 from post-2.1 baseline + the new tests).
- [ ] No frontend changes.
- [ ] No new dependency in `pom.xml`.
- [ ] No env var added.
- [ ] No `openapi.yaml` changes.
- [ ] No `master.xml` changes (no new migrations).
- [ ] `LiquibaseSmokeTest` unchanged (no schema work).

---

## Guardrails (DO NOT)

- **Do NOT change branches.** Stay on `forums-wave-continued`.
- **Do NOT modify any frontend file.** The frontend is the contract.
- **Do NOT modify the existing constants in `frontend/src/constants/dashboard/`.**
- **Do NOT improve or refactor the calculation logic.** If the frontend has an oddity, port the oddity. Surface it as a follow-up if it bothers you.
- **Do NOT introduce `BigDecimal`**, custom rounding, or any rounding mechanism other than `Math.round`.
- **Do NOT add database access to `FaithPointsService`.** It's pure calculation.
- **Do NOT inject the repository into the service.** They live in the same package, but the service does not reference the repository in this spec.
- **Do NOT add the `activity_log` entity, `streak_state` entity, `user_badges` entity, or `activity_counts` entity.** Those belong to their respective specs (2.6 will likely create the `activity_log` entity; 2.3 the `streak_state` entity; 2.4 the `user_badges` entity; 2.5 the `activity_counts` entity).
- **Do NOT add a controller.** Spec 2.6 owns `POST /api/v1/activity`.
- **Do NOT modify `openapi.yaml`.**
- **Do NOT add `Sentry.captureException` calls.**
- **Do NOT add new exception classes for calculation errors.** Throw `IllegalArgumentException` for genuine garbage input; let it bubble through the existing handler chain.
- **Do NOT add `@Transactional`** to any service method (no DB calls = no transaction needed).
- **Do NOT introduce parallel streams, virtual threads, or other concurrency primitives.** Pure calculation, single thread.
- **Do NOT commit, push, or do any git operation.** Eric handles all git.
- **Do NOT touch `_forums_master_plan/spec-tracker.md`.**

---

## Plan Shape Expectation

`/plan-forums` output for this L/Medium spec should be **10–14 steps**:

1. Recon: read frontend `faith-points-storage.ts`, `activity-points.ts`, `levels.ts`. Verify all the recon facts in this brief are still accurate. Read Spec 2.1's `2026-04-25-004-create-faith-points-table.xml` to confirm the entity's column-mapping target. Read `User.java` for the entity-style precedent (manual getters/setters, no Lombok). Read `DisplayNamePreferenceConverter.java` to confirm it's a JPA-only pattern (and therefore not the right precedent for `ActivityType`'s wire format).
2. Create `com.worshiproom.activity` package directory.
3. Author `ActivityType` enum with all 12 values + `@JsonValue` / `@JsonCreator` wire-format mapping.
4. Author `MultiplierTier` record (label + multiplier).
5. Author `constants/PointValues`, `constants/MultiplierTiers`, `constants/LevelThresholds`.
6. Author `dto/FaithPointsResult` record.
7. Author `FaithPoints` JPA entity (manual getters/setters, `@PrePersist`-free since user_id comes from FK, equals/hashCode by user_id).
8. Author `FaithPointsRepository` interface (stub).
9. Author `FaithPointsService` with `calculate` method.
10. Author `FaithPointsServiceTest` with all 28+ tests.
11. Run `./mvnw test`; iterate.
12. Self-review against acceptance criteria.

If the plan comes back with 20+ steps or proposes adding the controller, the `activity_log` entity, the streak service, the badge service, `openapi.yaml` updates, or any DB access from `FaithPointsService`, push back hard — those are explicit guardrail violations.

---

## Notes for Plan Phase Recon

The plan-phase recon should:

1. **Re-read the three frontend files end-to-end** (`faith-points-storage.ts`, `activity-points.ts`, `levels.ts`) and confirm the values quoted in this spec are still accurate. The brief was authored on 2026-04-26; if any value drifted between then and execution, the brief loses authority and the frontend files win.
2. **Confirm the `faith_points` table schema** at `backend/src/main/resources/db/changelog/2026-04-25-004-create-faith-points-table.xml` matches recon section F. Pay attention to the named CHECK constraints (`faith_points_total_points_nonneg_check`, `faith_points_current_level_positive_check`) — those are real constraints that the entity's Bean Validation annotations should mirror (e.g., `@Min(0)` on `totalPoints`, `@Min(1)` on `currentLevel`).
3. **Read `User.java` end-to-end** (already loaded above as the recon precedent) to confirm the entity style: manual getters/setters, no Lombok, explicit `@Column` annotations, equals/hashCode by primary key.
4. **Read `DisplayNamePreferenceConverter.java`** (loaded above) to confirm it's a JPA `AttributeConverter` for DB persistence — and therefore NOT the right precedent for `ActivityType`'s JSON wire serialization. The brief's `@JsonValue` / `@JsonCreator` recommendation stands.
5. **Verify package convention.** Run `ls backend/src/main/java/com/` — if only `worshiproom/` exists (no `example/worshiproom/`), Spec 1.1's package rename has merged and `com.worshiproom.activity` is correct. If `example/worshiproom/` still exists, something's wrong — flag and stop.
6. **Confirm test infrastructure.** The plan should NOT require `AbstractIntegrationTest` or `AbstractDataJpaTest` (those are for Testcontainers integration tests). Pure unit tests need no base class.

---

## Out of Scope

- **Streak service** (Spec 2.3 — separate spec, separate port)
- **Badge service** (Spec 2.4 — separate spec, separate port)
- **Activity Counts service** (Spec 2.5)
- **`POST /api/v1/activity` endpoint** (Spec 2.6 — composes this service with persistence)
- **Frontend dual-write wiring** (Spec 2.7 — wires the frontend to call the new endpoint)
- **The drift-detection test comparing frontend & backend** (Spec 2.8 — introduces `_test_fixtures/activity-engine-scenarios.json` and the cross-implementation parity test)
- **Phase 2 cutover** (Spec 2.9)
- **Historical activity backfill** (Spec 2.10)
- **Persistence behavior** — reading/writing `FaithPoints` rows. The entity and repository are scaffolding only.
- **Concurrency / locking semantics** for `faith_points` updates. Spec 2.6 owns this.
- **Level-up celebration UI** — frontend already has it; no changes there.
- **Modifying the frontend `faith-points-storage.ts`** — the frontend stays the source of truth for reads during the Forums Wave (per Decision 5's dual-write strategy).
- **Modifying any constants in `frontend/src/constants/dashboard/`.** The frontend is the contract; the backend ports it.

---

## Out-of-Band Notes for Eric

- **First L-sized code spec since 1.9 / 1.4 era.** Backend port work is denser than the recent doc/content specs. Plan time accordingly — expect 2–4 hours of recon + write + test iteration.
- **The "faithful port" discipline is the load-bearing principle.** If CC notices something it wants to improve in the frontend logic during recon, that's a future spec, not this one. Push back firmly on any plan step that introduces "while we're here, let's also fix..." framing.
- **The drift between the frontend and backend implementations is the single failure mode this spec is designed to prevent.** Spec 2.8's drift detection catches it later, but doing the port carefully now means Spec 2.8 should have nothing to flag.
- **Pre-execution checklist:**
  - Docker NOT required (pure unit tests).
  - Postgres NOT required.
  - Just `./mvnw test` against the existing test container infrastructure (which Testcontainers lazily starts only for tests that need it — `FaithPointsServiceTest` doesn't, so Testcontainers won't start).
- **Spec-tracker note.** When this spec ships, update `_forums_master_plan/spec-tracker.md` row #34 (Spec 2.2) from ⬜ to ✅. Also update row #33 (Spec 2.1) from ⬜ to ✅ if it hasn't been already — the changesets are on disk, the schema is live.
