# Forums Wave: Spec 2.3 — Streak State Service (Backend Port)

**Master Plan Reference:** `_forums_master_plan/round3-master-plan.md` → Spec 2.3 (line ~2661), Decision 5 (line ~700)
**Branch:** `forums-wave-continued` (stay on this branch — no per-spec sub-branch)
**Date:** 2026-04-26

---

## Affected Frontend Routes

N/A — backend-only spec. No frontend code touched. The `StreakService` this spec creates will be composed by `POST /api/v1/activity` (Spec 2.6) and exercised end-to-end by Spec 2.7's frontend dual-write wiring; user-facing behavior does not change in this spec.

---

## Spec Header

- **ID:** `round3-phase02-spec03-streak-service`
- **Size:** L
- **Risk:** Medium (must match frontend logic exactly; drift breaks the dual-write strategy for streak updates)
- **Prerequisites:** 2.1 (Activity Engine Schema) ✅, 2.2 (Faith Points Calculation Service) ✅ — `streak_state` table exists per `backend/src/main/resources/db/changelog/2026-04-25-005-create-streak-state-table.xml`; `com.worshiproom.activity` package exists with FaithPoints entity precedent.
- **Phase:** 2 — Activity Engine Migration (Dual-Write)
- **Third spec of Phase 2.** Specs 2.4 (badge service), 2.5 (activity counts), 2.6 (HTTP endpoint) layer on top.

---

## Goal

Port the existing frontend streak logic from `frontend/src/services/faith-points-storage.ts` (the `updateStreak` function) and `frontend/src/services/streak-repair-storage.ts` (the repair-eligibility check) to a backend `StreakService` that produces byte-identical output for the same inputs.

This is a **faithful port, NOT a redesign.** Same state machine, same edge cases, same date math. If the frontend resets a streak after a multi-day gap, the backend resets too. No improvements, no behavior changes.

The eventual consumer is Spec 2.6's `POST /api/v1/activity` endpoint (which will compose this service with persistence). Spec 2.8's drift-detection test will assert parity. THIS spec just ensures the values are right at the moment of porting.

---

## Master Plan Divergences

Three meaningful divergences from master plan v2.9 § Spec 2.3 body. Each is a "master plan made an assumption that doesn't match execution reality" issue, similar in shape to the Phase 1 Execution Reality Addendum.

### Divergence 1 — Grace days do not exist in the activity-streak frontend

Master plan v2.9 § Spec 2.3 lists grace-day consumption as a feature to port. It also lists grace-day reset on Monday midnight as an acceptance criterion ("Grace days reset on Monday midnight (server time)"). The Decision 5 schema (materialized by Spec 2.1) has columns `grace_days_used` and `grace_week_start` for this purpose.

**Verified:** there is NO grace-day logic in the activity-streak frontend code being ported (`frontend/src/services/faith-points-storage.ts` and `frontend/src/services/streak-repair-storage.ts`). The master plan v2.9 was written assuming the frontend had grace-day handling for the activity streak; it does not.

(Note: a SEPARATE streak system — the Bible-wave streak from BB-17 in `frontend/src/types/bible-streak.ts` and `frontend/src/components/bible/streak/` — does have its own `graceDaysAvailable` / `graceDaysUsedThisWeek` fields. That is a different feature with its own state model; this spec ports the activity / faith-points streak, not the Bible streak. The Bible streak's grace-day behavior is unrelated to this spec.)

**Resolution:** this spec does NOT port grace-day logic. The columns in `streak_state` stay unused with their default values (`grace_days_used = 0`, `grace_week_start = NULL`). The `StreakState` JPA entity reads/writes them faithfully but the `StreakService` methods never reference them.

A future spec will:
(a) design the grace-day UX for the activity streak
(b) implement it on the frontend
(c) extend `StreakService` to consume those columns
(d) add drift-detection scenarios

### Divergence 2 — Grief pause does not exist in the activity-streak frontend

Same shape as Divergence 1. Master plan v2.9 lists grief pause as a feature ("Active grief pause prevents any streak break"). The schema has `grief_pause_until` and `grief_pause_used_at` columns. Greps for `griefPause` / `grief_pause` / `grief_pause_until` return zero matches in `frontend/src/services/faith-points-storage.ts` and `frontend/src/services/streak-repair-storage.ts`.

**Resolution:** same as Divergence 1. Columns stay unused; service methods don't reference them; future spec implements the feature with frontend-first authoring.

### Divergence 3 — Streak repair APPLICATION is out of scope; only ELIGIBILITY-CHECK is ported

Master plan v2.9 lists "Repair eligibility flag returned when a single broken day could be repaired" as a 2.3 acceptance criterion. The frontend has a `wr_streak_repairs` localStorage key (separate from `wr_streak`) with its own data shape: `previousStreak`, `lastFreeRepairDate`, `repairsUsedThisWeek`, `weekStartDate`. None of these have backend persistence today — Spec 2.1's `streak_state` table has no repair-related columns.

**Resolution:** this spec ports the **ELIGIBILITY-CHECK** logic as a pure function (`isFreeRepairAvailable`). It does NOT port the application-of-a-repair (state mutation), and it does NOT add database persistence for repair state. A future spec will:
(a) decide how to persist repair state on the backend (separate `streak_repair_state` table or columns added to `streak_state`)
(b) port the apply-a-repair logic (`useFreeRepair` / `usePaidRepair` / `clearPreviousStreak`)
(c) wire it into the API surface

For THIS spec: the eligibility-check is a pure function over inputs `(lastFreeRepairDate: LocalDate?, currentWeekStart: LocalDate)`. The caller in a future spec decides where those inputs come from.

---

## Recon Facts (verified during brief authoring — re-verify suspect ones during execution)

### A) The frontend streak-update logic

Located in `frontend/src/services/faith-points-storage.ts`:

```ts
export function updateStreak(today: string, currentData: StreakData): StreakData {
  // First-ever activity
  if (currentData.lastActiveDate === null) {
    return { currentStreak: 1, longestStreak: 1, lastActiveDate: today };
  }

  // Already active today
  if (currentData.lastActiveDate === today) {
    return { ...currentData };
  }

  const yesterday = getYesterdayDateString();

  // Consecutive day
  if (currentData.lastActiveDate === yesterday) {
    const newStreak = currentData.currentStreak + 1;
    return {
      currentStreak: newStreak,
      longestStreak: Math.max(newStreak, currentData.longestStreak),
      lastActiveDate: today,
    };
  }

  // Missed day(s) — reset to 1
  return {
    currentStreak: 1,
    longestStreak: Math.max(1, currentData.longestStreak),
    lastActiveDate: today,
  };
}
```

**Four state transitions:**

1. **First-ever activity** (`lastActiveDate` is null) → `{1, 1, today}`
2. **Already active today** (`lastActiveDate === today`) → unchanged
3. **Yesterday** (`lastActiveDate === yesterday`) → increment current streak; longest = max(new, longest)
4. **Older than yesterday** (multi-day gap) → reset to `{1, max(1, longest), today}`

**Note:** the frontend ALSO calls `capturePreviousStreak(oldStreak)` from `streak-repair-storage.ts` AFTER `updateStreak` when a reset occurs (specifically when `oldStreak > 1`, so a meaningful streak was lost). This is part of the repair flow. THIS spec does NOT port `capturePreviousStreak` — see Divergence 3.

The `StreakResult` DTO this spec produces should include enough information for a future caller to know whether a "capture for repair" event happened, even though we don't persist it yet. See Architectural Decision 4 below.

### B) The frontend repair-eligibility logic

Located in `frontend/src/services/streak-repair-storage.ts`:

```ts
export function isFreeRepairAvailable(): boolean {
  const data = getRepairData();
  if (data.lastFreeRepairDate === null) return true;
  const currentWeekStart = getCurrentWeekStart();
  return data.lastFreeRepairDate < currentWeekStart;
}
```

**Two cases:**

1. **Never used** → free repair available
2. **Used at least once** → free repair available iff `lastFreeRepairDate < currentWeekStart` (i.e., the use was in a previous week)

### C) The frontend date utilities

`frontend/src/utils/date.ts`:

```ts
// Returns "yyyy-MM-dd" in LOCAL time (not UTC).
function getLocalDateString(date: Date = new Date()): string

function getYesterdayDateString(): string  // Today minus 1 day, local time

function getCurrentWeekStart(): string {
  // Returns the Monday of the current week, in local time.
  // If today is Sunday, returns the Monday from 6 days ago.
  // If today is Monday, returns today.
}
```

**CRITICAL:** the frontend uses **LOCAL time**. Each user's "today" is local to their browser. The backend has no implicit notion of the user's local time — it has the user's stored timezone (`users.timezone` column added in Spec 1.3b).

**For THIS spec:** the `StreakService` methods take `today: LocalDate` and `currentWeekStart: LocalDate` **AS PARAMETERS**. The service does NOT compute these itself. The CALLER (Spec 2.6's controller) computes them using the authenticated user's timezone.

This keeps the service pure and trivially testable: every test passes in fixed `LocalDate` values.

### D) Spec 2.1 schema recap (relevant table)

`streak_state` table (created by Spec 2.1, currently empty — verified at `backend/src/main/resources/db/changelog/2026-04-25-005-create-streak-state-table.xml`):

| Column                | Type                       | Constraints                                                                |
| --------------------- | -------------------------- | -------------------------------------------------------------------------- |
| `user_id`             | UUID                       | PRIMARY KEY, FK → `users.id` ON DELETE CASCADE                             |
| `current_streak`      | INTEGER                    | NOT NULL DEFAULT 0; CHECK `streak_state_current_streak_nonneg_check (>= 0)` |
| `longest_streak`      | INTEGER                    | NOT NULL DEFAULT 0; CHECK `streak_state_longest_streak_nonneg_check (>= 0)` |
| `last_active_date`    | DATE                       | NULL                                                                       |
| `grace_days_used`     | INTEGER                    | NOT NULL DEFAULT 0; CHECK `streak_state_grace_days_used_nonneg_check (>= 0)` |
| `grace_week_start`    | DATE                       | NULL                                                                       |
| `grief_pause_until`   | DATE                       | NULL                                                                       |
| `grief_pause_used_at` | TIMESTAMP WITH TIME ZONE   | NULL                                                                       |

The JPA entity must map all eight columns even though THIS spec only uses three (`current_streak`, `longest_streak`, `last_active_date`). The unused columns get default values on insert and stay at default until a future spec uses them.

### E) Package structure

The `com.worshiproom.activity` package was created by Spec 2.2 and currently contains:

- `ActivityType.java` (enum, 12 values, `@JsonValue`/`@JsonCreator`)
- `FaithPoints.java` (JPA entity, manual getters/setters, no Lombok)
- `FaithPointsRepository.java` (`JpaRepository<FaithPoints, UUID>` stub)
- `FaithPointsService.java` (pure calculation, no Spring deps)
- `MultiplierTier.java` (record)
- `constants/` (PointValues, MultiplierTiers, LevelThresholds)
- `dto/FaithPointsResult.java` (record)

Spec 2.3 adds new files to the same package:

- `com.worshiproom.activity.StreakState` (entity)
- `com.worshiproom.activity.StreakRepository` (Spring Data)
- `com.worshiproom.activity.StreakService` (calculation)
- `com.worshiproom.activity.StreakStateData` (record — input value object)
- `com.worshiproom.activity.StreakTransition` (enum)
- `com.worshiproom.activity.dto.StreakResult` (record)

The `FaithPoints` entity (`backend/src/main/java/com/worshiproom/activity/FaithPoints.java`) is the canonical entity-style precedent for `StreakState`: manual getters/setters, no Lombok, explicit `@Column` annotations, equals/hashCode by primary key (`userId`), no `@PrePersist` (PK comes from the FK / caller).

---

## Architectural Decisions

### 1. Pure calculation service — no database, mirrors Spec 2.2

`StreakService` exposes:

```java
public StreakResult updateStreak(
    StreakStateData currentState,
    LocalDate today
)

public boolean isFreeRepairAvailable(
    LocalDate lastFreeRepairDate,  // nullable
    LocalDate currentWeekStart
)
```

Both pure functions. No `@Autowired` dependencies. No repository injection. Spec 2.6 will compose this service with the repository to read/write the database.

### 2. The entity and repository are scaffolding-only

`StreakState.java` is a JPA entity mapping to `streak_state`. `StreakRepository.java` extends `JpaRepository<StreakState, UUID>` with no custom methods.

**Neither is referenced by `StreakService` in this spec.** They sit as scaffolding for Spec 2.6 to inject and use. Same posture as `FaithPoints` / `FaithPointsRepository` in Spec 2.2.

### 3. Input-type design — `StreakStateData` vs the entity

The `StreakService.updateStreak` method takes a `StreakStateData` value object as input — **NOT the JPA entity directly.** This separation:

- Keeps the service unit-testable without entity construction ceremony
- Decouples the calculation from the persistence layer
- Lets Spec 2.6 build `StreakStateData` from either the entity (existing user) or from defaults (new user) without coupling the service to JPA

Suggested shape (Java record):

```java
public record StreakStateData(
    int currentStreak,
    int longestStreak,
    LocalDate lastActiveDate  // nullable
) {
  public static StreakStateData fresh() {
    return new StreakStateData(0, 0, null);
  }
}
```

### 4. Result DTO includes "repair-capture intent" metadata

When a streak resets (transition #4: multi-day-gap), the frontend ALSO captures the old streak via `capturePreviousStreak`. This spec doesn't persist that, but the `StreakResult` should expose enough information for a future Spec 2.6 (or a future repair-application spec) to know that a capture-eligible reset happened.

`StreakResult` shape (Java record):

```java
public record StreakResult(
    StreakStateData newState,
    StreakTransition transition,    // FIRST_EVER, SAME_DAY, INCREMENT, RESET
    int previousStreak,             // value of currentStreak BEFORE the update
    boolean shouldCaptureForRepair  // true iff transition == RESET && previousStreak > 1
) {}
```

The `shouldCaptureForRepair` flag is the bridge to a future spec. THIS spec doesn't act on it; it just reports it correctly.

### 5. Streak transition enum

Java enum with four values matching the four state transitions:

- `FIRST_EVER` — `lastActiveDate` was null
- `SAME_DAY` — `lastActiveDate` equals today
- `INCREMENT` — `lastActiveDate` equals today minus 1
- `RESET` — `lastActiveDate` before today minus 1

Useful for testing (assertions can match the enum value) and for future callers to switch on transition type.

### 6. Date comparison uses `LocalDate` naturally

Java's `LocalDate.isBefore`, `LocalDate.isEqual`, and `LocalDate.minusDays(1)` are the right primitives. **No string-based date math** — the frontend's string approach is incidental to its JS context; Java has the right type for this.

The "yesterday" check translates from `currentData.lastActiveDate === yesterday` to `lastActiveDate.isEqual(today.minusDays(1))`.

The "older than yesterday" check is the natural fallthrough after FIRST_EVER, SAME_DAY, and INCREMENT branches are excluded — not `lastActiveDate.isBefore(today.minusDays(1))` (which would be wrong if reached after a null check anyway).

### 7. No logging, no Sentry, no metrics

Same posture as Spec 2.2. Pure calculation; the request-id middleware already captures context; no logs needed inside the service. **No `Sentry.captureException` calls.**

---

## Files to Create

```
backend/src/main/java/com/worshiproom/activity/
├── StreakState.java                    JPA entity, maps all 8 columns of streak_state (scaffolding only — not consumed by service)
├── StreakRepository.java               JpaRepository<StreakState, UUID> stub (scaffolding only)
├── StreakService.java                  @Service, pure calculation, no Spring deps; two public methods
├── StreakStateData.java                record(currentStreak, longestStreak, lastActiveDate) — input value object
├── StreakTransition.java               enum {FIRST_EVER, SAME_DAY, INCREMENT, RESET}
└── dto/
    └── StreakResult.java               record(newState, transition, previousStreak, shouldCaptureForRepair)

backend/src/test/java/com/worshiproom/activity/
└── StreakServiceTest.java              25+ tests, plain JUnit 5, no Spring
```

## Files to Modify

**NONE.**

- `pom.xml`: no new dependencies
- `application.properties` / `application-prod.properties` / `application-dev.properties`: no changes
- `db/changelog/master.xml`: no changes (no new migrations)
- `LiquibaseSmokeTest`: no changes (no schema work)
- `openapi.yaml`: no changes (no new endpoints — Spec 2.6 owns this)
- Existing exception handlers (`ProxyExceptionHandler`, `RateLimitExceptionHandler`, `UserExceptionHandler`): no changes
- `FaithPoints` entity, `FaithPointsRepository`, `FaithPointsService`, `FaithPointsServiceTest` (from Spec 2.2): no changes
- `ActivityType` enum, `MultiplierTier` record, `constants/*` (from Spec 2.2): no changes

## Database Changes

**NONE.** The `streak_state` table was created in Spec 2.1. This spec adds the JPA entity + repository as scaffolding for Spec 2.6 but introduces no new tables, columns, indexes, or constraints. `master.xml` is untouched.

## API Changes

**NONE.** This spec creates no controllers and no endpoints. `POST /api/v1/activity` is owned by Spec 2.6. `openapi.yaml` is untouched.

## Copy Deck

**N/A — this spec creates no user-facing strings.** The service is server-internal pure calculation. All values are numeric / boolean / enum.

## Anti-Pressure Copy Checklist

**N/A — no new user-facing copy in this spec.**

---

## Tests Required

Test class: `StreakServiceTest`, **plain JUnit 5** (NOT `@SpringBootTest`, NOT extending `AbstractIntegrationTest`). The service has no Spring dependencies; instantiate directly: `new StreakService()`.

### Minimum test coverage (master plan target: 25+; this spec targets 25+)

#### A) `updateStreak` — first-ever activity (3 tests)

- `lastActiveDate` null, `currentStreak` 0 → returns `{1, 1, today}`, transition `FIRST_EVER`, `previousStreak` 0, `shouldCaptureForRepair` false
- `lastActiveDate` null, but `currentStreak` somehow non-zero (corrupted state) → still treats as first-ever per the null-check ordering (the frontend's null-check is positional and unconditional)
- Verifies `longestStreak` is set to 1 even from `{0, 0, null}` initial state

#### B) `updateStreak` — same-day repeat (3 tests)

- `lastActiveDate` equals today, `currentStreak` 5, `longestStreak` 7 → returns unchanged `{5, 7, today}`, transition `SAME_DAY`, `previousStreak` 5, `shouldCaptureForRepair` false
- `lastActiveDate` equals today on the day someone first becomes active (e.g., `{1, 1, today}`) → returns unchanged
- Verifies idempotency: calling `updateStreak` twice with the same `today` yields the same result

#### C) `updateStreak` — yesterday → increment (5 tests)

- `currentStreak` 1, `longestStreak` 1, `lastActive` yesterday → `{2, 2, today}`, transition `INCREMENT`
- `currentStreak` 5, `longestStreak` 10, `lastActive` yesterday → `{6, 10, today}`, transition `INCREMENT` (longest unchanged because new < longest)
- `currentStreak` 5, `longestStreak` 5, `lastActive` yesterday → `{6, 6, today}`, transition `INCREMENT` (longest now 6)
- `currentStreak` 99, `longestStreak` 99, `lastActive` yesterday → `{100, 100, today}`, transition `INCREMENT`
- Verifies the new `longestStreak = max(newStreak, oldLongest)` invariant

#### D) `updateStreak` — multi-day gap → reset (5 tests)

- Two days ago, streak 10, longest 10 → `{1, 10, today}`, transition `RESET`, `previousStreak` 10, `shouldCaptureForRepair` **true**
- One week ago, streak 7, longest 7 → `{1, 7, today}`, `RESET`, prev 7, `shouldCaptureForRepair` **true**
- Two days ago, streak 1, longest 5 → `{1, 5, today}`, `RESET`, prev 1, `shouldCaptureForRepair` **FALSE** (because `previousStreak <= 1`)
- Two days ago, streak 0, longest 0 → `{1, 1, today}`, `RESET`, prev 0, `shouldCaptureForRepair` false; `longestStreak` goes to 1 because `max(1, 0) = 1`
- 365 days ago → behaves identically to two-days-ago (any gap > 1 day is `RESET`)

#### E) `updateStreak` — date edge cases (4 tests)

- Month boundary: `lastActive` Jan 31, today Feb 1 → `INCREMENT`
- Year boundary: `lastActive` Dec 31, today Jan 1 → `INCREMENT`
- Leap year: `lastActive` Feb 28 2024, today Feb 29 2024 → `INCREMENT`
- DST irrelevance: `LocalDate` has no time component, so DST transitions don't affect the calculation; sanity test with a date that crosses a DST boundary in a typical timezone passes the same way

#### F) `isFreeRepairAvailable` (5 tests)

- `lastFreeRepairDate` null → **true**
- `lastFreeRepairDate` strictly before `currentWeekStart` by 1 day → **true**
- `lastFreeRepairDate` equals `currentWeekStart` → **false**
- `lastFreeRepairDate` strictly after `currentWeekStart` by 1 day → **false** (used this week)
- `lastFreeRepairDate` exactly one week ago (the previous Monday, with `currentWeekStart` being today Monday) → **true** (strictly less than this week's Monday)

**Total minimum: 25 tests.** All pure JUnit 5, no `@SpringBootTest`, no Testcontainers, no database. Wall-clock target for `StreakServiceTest`: under 1 second (pure unit tests).

---

## Acceptance Criteria

- [ ] `com.worshiproom.activity` package has the **six new production source files** listed in **Files to Create** (`StreakState`, `StreakRepository`, `StreakService`, `StreakStateData`, `StreakTransition`, `dto/StreakResult`).
- [ ] `StreakState` JPA entity maps to `streak_state` table with **all eight columns** from Spec 2.1, correct types and constraints (`user_id` UUID PK, `current_streak` INTEGER, `longest_streak` INTEGER, `last_active_date` DATE, `grace_days_used` INTEGER, `grace_week_start` DATE, `grief_pause_until` DATE, `grief_pause_used_at` TIMESTAMP WITH TIME ZONE).
- [ ] `StreakRepository` extends `JpaRepository<StreakState, UUID>`; no custom methods.
- [ ] `StreakStateData` record has three fields (`currentStreak`, `longestStreak`, `lastActiveDate`) per Architectural Decision 3.
- [ ] `StreakTransition` enum has four values (`FIRST_EVER`, `SAME_DAY`, `INCREMENT`, `RESET`) per Architectural Decision 5.
- [ ] `StreakResult` record has four fields (`newState`, `transition`, `previousStreak`, `shouldCaptureForRepair`) per Architectural Decision 4.
- [ ] `StreakService.updateStreak` produces correct output across all four state transitions (first-ever, same-day, increment, reset).
- [ ] `StreakService.isFreeRepairAvailable` matches frontend logic exactly: `null` → true; `< currentWeekStart` → true; `>= currentWeekStart` → false.
- [ ] `StreakServiceTest` has at least **25 tests** covering the six categories listed in **Tests Required**. All pass.
- [ ] Tests are pure JUnit 5 — no `@SpringBootTest`, no Testcontainers.
- [ ] Backend test baseline: prior count + 25+ new tests, all green.
- [ ] No frontend changes.
- [ ] No new dependency in `pom.xml`.
- [ ] No env var added.
- [ ] No `openapi.yaml` changes.
- [ ] No `master.xml` changes (no new migrations).
- [ ] `LiquibaseSmokeTest` unchanged.
- [ ] `FaithPointsService` and 2.2 deliverables unchanged.
- [ ] `StreakService` methods do **NOT** reference grace-day or grief-pause columns (per Divergences 1 and 2).
- [ ] `StreakService.updateStreak` does **NOT** mutate or persist repair state (per Divergence 3).

---

## Guardrails (DO NOT)

- **Do NOT change branches.** Stay on `forums-wave-continued`.
- **Do NOT modify any frontend file.** The frontend is the contract.
- **Do NOT modify the existing constants in `frontend/src/constants/dashboard/`.**
- **Do NOT improve or refactor the streak transition logic.** Port the four-state-machine exactly. If the frontend has an oddity, port the oddity. Surface it as a follow-up if it bothers you.
- **Do NOT introduce grace-day handling.** Frontend has none for the activity streak; no port target exists.
- **Do NOT introduce grief-pause handling.** Frontend has none for the activity streak.
- **Do NOT introduce repair-application state mutation.** Only eligibility-check is in scope.
- **Do NOT add columns to `streak_state` via a new migration.** The schema is what it is; this spec is service-only.
- **Do NOT create a `streak_repair_state` table.**
- **Do NOT add database access to `StreakService`.** Pure calculation.
- **Do NOT inject the repository into the service.**
- **Do NOT add a controller.** Spec 2.6 owns `POST /api/v1/activity`.
- **Do NOT modify `openapi.yaml`.**
- **Do NOT add `Sentry.captureException` calls.**
- **Do NOT add `@Transactional`** anywhere (no DB calls).
- **Do NOT use string-based date math.** `LocalDate` is the right type.
- **Do NOT compute "today" or "currentWeekStart" inside the service.** Both come in as parameters from the caller.
- **Do NOT modify `FaithPointsService`, `FaithPoints` entity, `ActivityType` enum, or any 2.2 deliverable.**
- **Do NOT commit, push, or do any git operation.** Eric handles all git.
- **Do NOT touch `_forums_master_plan/spec-tracker.md`.**

---

## Plan Shape Expectation

`/plan-forums` output for this L/Medium spec should be **9–13 steps**:

1. **Recon:** read frontend `faith-points-storage.ts` (`updateStreak` function), `streak-repair-storage.ts` (`isFreeRepairAvailable` function), `utils/date.ts` (date utilities). Verify Divergences 1, 2, 3 by greps for grace/grief/repair-state in `frontend/src/services/faith-points-storage.ts` and `frontend/src/services/streak-repair-storage.ts` (the activity-streak files specifically — NOT `frontend/src/types/bible-streak.ts`, which is a separate Bible-wave streak system). Confirm `streak_state` table schema from Spec 2.1's `2026-04-25-005-create-streak-state-table.xml`. Read Spec 2.2's `FaithPoints` entity for the entity-style precedent.
2. Author `StreakStateData` record (input value object).
3. Author `StreakTransition` enum.
4. Author `StreakResult` record.
5. Author `StreakState` JPA entity (mapping all 8 columns).
6. Author `StreakRepository` interface (stub).
7. Author `StreakService` with two public methods.
8. Author `StreakServiceTest` with all 25+ tests across the six categories.
9. Run `./mvnw test`; iterate.
10. Self-review against acceptance criteria; specifically verify the three divergences are honored (no grace, no grief, no repair-state mutation).

If the plan comes back with **18+ steps** or proposes implementing grace days, grief pause, repair application, schema changes, the controller, the `activity_log` entity, `openapi.yaml` updates, or any DB access from `StreakService`, push back hard — those are explicit guardrail violations.

---

## Notes for Plan Phase Recon

The plan-phase recon should:

1. **Re-read the two frontend files end-to-end** (`faith-points-storage.ts` for `updateStreak` and `streak-repair-storage.ts` for `isFreeRepairAvailable`) and confirm the snippets quoted in this spec are still accurate. The brief was authored on 2026-04-26; if any logic drifted between then and execution, the brief loses authority and the frontend files win.
2. **Re-read `frontend/src/utils/date.ts`** to confirm `getYesterdayDateString()` and `getCurrentWeekStart()` semantics. The Java port uses `LocalDate` (no string date math), but the semantic contract — "Monday is week start", "yesterday is today minus 1 day" — must match.
3. **Confirm the `streak_state` table schema** at `backend/src/main/resources/db/changelog/2026-04-25-005-create-streak-state-table.xml` matches recon section D. Pay attention to the **named CHECK constraints** (`streak_state_current_streak_nonneg_check`, `streak_state_longest_streak_nonneg_check`, `streak_state_grace_days_used_nonneg_check`) — those are real DB constraints that the entity's Bean Validation annotations should mirror (e.g., `@Min(0)` on `currentStreak`, `@Min(0)` on `longestStreak`, `@Min(0)` on `graceDaysUsed`).
4. **Read `FaithPoints.java` end-to-end** (the canonical entity precedent in this package) to confirm the entity style: manual getters/setters, no Lombok, explicit `@Column` annotations, `@Min` Bean Validation mirroring DB CHECK constraints, equals/hashCode by primary key (`userId`), no `@PrePersist` (PK comes from caller / FK).
5. **Verify package convention.** `ls backend/src/main/java/com/worshiproom/activity/` should already show the Spec 2.2 files. New files go in the same package directory.
6. **Confirm test infrastructure.** The plan should NOT require `AbstractIntegrationTest` or `AbstractDataJpaTest` (those are for Testcontainers integration tests). Pure unit tests need no base class — `new StreakService()` is the entire setup.
7. **Verify the Divergences are still real.** Run greps against `frontend/src/services/faith-points-storage.ts` and `frontend/src/services/streak-repair-storage.ts` specifically for: `grace_days_used`, `graceDays`, `graceDaysUsed`, `grace_week_start`, `griefPause`, `grief_pause`, `grief_pause_until`. Expect zero matches in those two files. (Note: `frontend/src/types/bible-streak.ts` and `frontend/src/components/bible/streak/` DO have grace-day fields for the Bible-wave streak — those are unrelated and out of scope.)

---

## Out of Scope

- **Grace-day consumption logic** — frontend doesn't have it for the activity streak (Divergence 1)
- **Grief-pause logic** — frontend doesn't have it for the activity streak (Divergence 2)
- **Streak repair application** — only eligibility check is in scope (Divergence 3)
- **Persisting repair state** — no schema for it today
- **The `capturePreviousStreak` side effect** — surfaced as a flag in `StreakResult` (`shouldCaptureForRepair`) but not acted on
- **The `clearPreviousStreak` function from `streak-repair-storage.ts`** — applies only when a repair is applied, which is out of scope
- **The 50-points-cost-for-paid-repair logic** — repair application out of scope
- **The `POST /api/v1/activity` endpoint** (Spec 2.6)
- **Frontend dual-write** (Spec 2.7)
- **Drift detection** (Spec 2.8)
- **The Badge service** (Spec 2.4)
- **The Activity Counts service** (Spec 2.5)
- **Modifying the frontend `updateStreak` or `streak-repair-storage`** — the frontend is the contract
- **Modifying any constants** in `frontend/src/constants/dashboard/`
- **Modifying Spec 2.1 schema** (no ALTER TABLE migrations)
- **New JPA entities for `activity_log`, `user_badges`, or `activity_counts`** — those belong to their respective specs
- **Modifying the `FaithPoints` entity, repository, service, or tests from Spec 2.2**
- **Bible-wave streak system** (`frontend/src/types/bible-streak.ts`, BB-17 streak with grace days) — separate feature, not part of this port
- **Concurrency / locking semantics** for `streak_state` updates — Spec 2.6 owns this

---

## Out-of-Band Notes for Eric

- **Three meaningful divergences from master plan v2.9.** The master plan was written assuming features (grace days, grief pause, repair persistence) the activity-streak frontend doesn't have yet. Same shape as the Phase 1 Execution Reality Addendum. When this spec ships, consider adding a short Phase 2 Execution Reality note to the master plan documenting these.
- **The "faithful port" discipline holds:** port what exists, don't build forward. Future specs (which will be authored with frontend-first ordering) can layer in the missing features when their UX is designed.
- **`StreakResult.shouldCaptureForRepair` is the forward-compatibility bridge.** THIS spec doesn't act on it; a future spec will. The flag is set correctly so future callers don't have to recompute the condition.
- **One-line clarification on Divergence 1 framing:** the brief originally said "zero matches in frontend/src" for grace-day greps; in fact, `frontend/src/types/bible-streak.ts` and `frontend/src/components/bible/streak/` DO contain `graceDaysAvailable` / `graceDaysUsedThisWeek` — but those belong to the BB-17 Bible-wave streak, a separate feature with its own state model. The spec's substance (no grace logic in the activity / faith-points streak being ported) holds. The recon step in `/plan-forums` should re-verify by greping the two specific files this spec ports (`faith-points-storage.ts`, `streak-repair-storage.ts`), not the entire `frontend/src/`.
- **Pre-execution checklist:**
  - Docker NOT required (pure unit tests).
  - Postgres NOT required.
  - Just `./mvnw test` against the existing test container infrastructure (which Testcontainers lazily starts only for tests that need it — `StreakServiceTest` doesn't, so Testcontainers won't start).
- **Spec-tracker note.** When this spec ships, update `_forums_master_plan/spec-tracker.md` row for Spec 2.3 from ⬜ to ✅.
