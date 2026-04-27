# Forums Wave: Spec 2.8 — Drift Detection Test (Frontend ↔ Backend)

**Master Plan Reference:** `_forums_master_plan/round3-master-plan.md` → Spec 2.8 (line 2797)
**Branch:** `forums-wave-continued` (stay on this branch — no per-spec sub-branch)
**Date:** 2026-04-27

---

## Affected Frontend Routes

N/A — test-infrastructure-only spec. No production code paths change. No user-visible UI changes. The deliverable is a shared JSON fixture plus two parameterized test harnesses (one Java, one TypeScript) that consume the fixture and assert frontend/backend computation parity. `/verify-with-playwright` is therefore skipped for this spec.

---

## Spec Header

- **ID:** `round3-phase02-spec08-activity-drift-test`
- **Size:** M
- **Risk:** Low (test infrastructure only; no production code paths changed; failure modes surface at test time, not runtime)
- **Prerequisites:** 2.7 (Frontend Activity Dual-Write) ✅ — `recordActivity` now signals the backend under a feature flag; the engine implementations on both sides are stable enough to lock down with parity tests.
- **Phase:** 2 — Activity Engine Migration (Dual-Write)
- **Eighth spec of Phase 2.** Specs 2.9 (cutover) and 2.10 (historical backfill) layer on top.

---

## Goal

Build a test fixture file plus two harnesses (one Java, one TypeScript) that run the SAME inputs against the BACKEND and FRONTEND activity-engine implementations and assert byte-identical output. Catches the "you updated one side and forgot the other" failure mode that becomes increasingly likely as the codebase evolves.

The fixture file is the single source of truth for test inputs and expected outputs. Adding a scenario adds it to both implementations' test surfaces simultaneously — no code changes needed on either side.

---

## Master Plan Divergences

Three meaningful divergences from master plan v2.9 § Spec 2.8 (line 2797) that significantly shape the spec.

### Divergence 1 — Grace / grief / repair-application scenarios are out of scope

The master plan body lists these test categories: "simple activity, level-up, badge-earn, streak continuation, grace consumption, grief pause, repair eligibility."

Per the Phase 2 Execution Reality cluster (Specs 2.3 and 2.4 divergences):

- Grace days don't exist on either side.
- Grief pause doesn't exist on either side.
- Repair APPLICATION isn't ported (only eligibility).

Including those categories in the fixture would either:

- (a) require both implementations to fail the same way (low signal — neither implements the feature, so both produce empty/zero output)
- (b) require implementing the features as preconditions for the test (massive scope creep)

**Resolution:** drop grace consumption, grief pause, and repair APPLICATION as fixture categories. Keep repair ELIGIBILITY (both sides ported it). The fixture covers what's actually implemented. When grace/grief/repair-application ship in future specs, those specs add their fixture cases as part of their own scope.

### Divergence 2 — No backend `ActivityService.recordActivity` method exists; test at the component-service layer

The master plan body says "runs the backend `ActivityService` and asserts the result matches." In Spec 2.6, `ActivityService` is the orchestrator that takes an HTTP-shaped `ActivityRequest`, reads the database for current state, and persists results. Calling it from a drift test would require:

- Database setup for current-state inputs
- Authentication context for the principal
- Transaction rollback for cleanup

That's wrong for drift detection. Drift tests want PURE calculation parity. The fixture provides the current-state inputs (`currentStreak`, `currentTotalPoints`, `todaysActivities`, etc.) directly; the backend test invokes the four pure-calculation services (`FaithPointsService`, `StreakService`, `BadgeService` — and the `activity_type → count_type` mapping logic from `ActivityService`) DIRECTLY, then assembles the result for comparison.

**Resolution:** backend drift test is a pure JUnit 5 test extending nothing. It instantiates `FaithPointsService`, `StreakService`, `BadgeService` directly, runs each fixture's inputs through the same composition algorithm Spec 2.6 uses, and asserts the result. No Spring context, no Testcontainers, no database. Wall-clock target: <2 seconds for 30+ scenarios.

### Divergence 3 — Some fixture fields will be empty on the backend side; mirror that constraint

Per Spec 2.4 Divergence 1, the backend's `BadgeService` takes a `BadgeCheckContext` that includes 6 data sources (reading plans, bible progress, meditation history, gratitude entries, local visits, listening history) the BACKEND has no persistence for. Spec 2.6's `ActivityService` passes empty collections for all six.

For drift detection to be useful, BOTH implementations must receive the SAME context. The fixture provides those 6 data sources as inputs; the FRONTEND uses them; the BACKEND uses them. This way:

- Drift in shared logic (streak, points, basic badges) surfaces.
- Badges that only the backend would miss (bible, meditation, gratitude, etc.) ARE testable here even though production backend can't see them yet.

This is correct. The fixture tests CALCULATION parity, not production-data parity. When future specs add backend persistence for those data sources, no fixture changes are needed — the fixture already has the inputs.

---

## Recon Facts (verified during brief authoring — re-verify suspect ones during execution)

### A) No existing shared-fixtures infrastructure

`shared-test-cases/` does not exist. `_test_fixtures/` does not exist. This spec creates the directory and the convention both for this fixture and for any future cross-implementation parity test.

**Suggested path:** `_test_fixtures/activity-engine-scenarios.json` at repo root. Reasons:

- Follows the existing repo's underscore-prefix convention for non-source directories (`_plans/`, `_specs/`, `_audits/`, `_recon/`, `_reports/`, `_cutover-evidence/`, `_forums_master_plan/`).
- The master plan suggests `shared-test-cases/`; we're diverging to match the existing convention.
- `_test_fixtures` reads correctly when sorted alongside the other underscore directories.

CC verifies during recon that no other shared-fixture directory exists; if there's an established pattern that was missed, follow that instead.

### B) Backend test infrastructure precedent

Pure JUnit 5 tests (no `@SpringBootTest`, no Testcontainers) are the established pattern for service-layer tests:

- Spec 2.2: `FaithPointsServiceTest`
- Spec 2.3: `StreakServiceTest`
- Spec 2.4: `BadgeServiceTest`
- Spec 2.5: `CountTypeTest`

These all instantiate the service via `new ServiceClass()` and run assertions without Spring. The drift test follows the same pattern, but composes multiple services per fixture case.

Jackson is already on the backend classpath (Spring Boot default; verified by reading existing controller code that uses `@RequestBody` and `@ResponseBody`). The drift test reads the JSON via Jackson's `ObjectMapper` directly — no new dependency.

### C) Frontend test infrastructure precedent

Vitest is the established frontend test runner. Existing tests:

- `frontend/src/services/__tests__/faith-points-storage.test.ts`
- `frontend/src/services/__tests__/badge-engine.test.ts`
- `frontend/src/hooks/__tests__/useFaithPoints.test.ts`

Vitest reads JSON via standard ESM `import scenarios from '@/.../scenarios.json' assert { type: 'json' }` — Vite handles JSON imports natively. The frontend drift test reads the fixture this way. No node `fs` reads.

The frontend services are pure functions:

- `calculateDailyPoints(activities)` from `services/faith-points-storage.ts`
- `updateStreak(today, currentData)` from `services/faith-points-storage.ts`
- `checkForNewBadges(context, earned)` from `services/badge-engine.ts`
- `isFreeRepairAvailable()` from `services/streak-repair-storage.ts` (BUT this reads localStorage — for the drift test, the fixture passes `lastFreeRepairDate` and `currentWeekStart` explicitly, and the test calls a pure helper or duplicates the 2-line eligibility check inline)

**Note on the `isFreeRepairAvailable` frontend function:** the existing function reads from localStorage. For drift testing, extracting the pure 2-line check `lastFreeRepairDate === null || lastFreeRepairDate < currentWeekStart` is acceptable. Don't refactor the production frontend code — the drift test either inlines the check or imports a pure helper if one exists.

### D) The four engine-composition operations

Each fixture scenario defines inputs that exercise:

1. **Faith-points delta computation** (via two `calculateDailyPoints` / `FaithPointsService.calculate` calls — the new-set vs old-set delta)
2. **Streak update** (via `updateStreak` / `StreakService.updateStreak`)
3. **Badge check** (via `checkForNewBadges` / `BadgeService.checkBadges`)
4. **Repair eligibility** (via the inline check)

The output asserts on:

- `pointsEarned` (delta)
- `newTotalPoints`
- `newCurrentLevel`
- `levelUp` boolean
- `newCurrentStreak`
- `newLongestStreak`
- `streakTransition` (`FIRST_EVER` / `SAME_DAY` / `INCREMENT` / `RESET` on the backend; the frontend doesn't have an enum but can derive the equivalent from the result shape)
- `newBadgeIds` (sorted list of strings)
- `isFreeRepairAvailableAfter` (boolean)

Activity counts are NOT asserted here. They're a separate pure-persistence concern with no calculation logic to drift on.

---

## Architectural Decisions

### 1. Fixture file format — JSON, not YAML/TOML

JSON is universally supported. Both Vitest and Jackson parse it natively. YAML would require a parser dependency on at least one side. TOML is non-standard. JSON wins.

**Schema** (described informally; CC implements):

```json
{
  "schemaVersion": 1,
  "scenarios": [
    {
      "id": "first-ever-prayer",
      "description": "Brand-new user records their first pray activity",
      "input": {
        "userTimezone": "America/Chicago",
        "today": "2026-04-26",
        "currentWeekStart": "2026-04-20",
        "currentTotalPoints": 0,
        "currentLevel": 1,
        "currentStreak": 0,
        "longestStreak": 0,
        "lastActiveDate": null,
        "lastFreeRepairDate": null,
        "todaysActivitiesBefore": {
          "mood": false, "pray": false, "listen": false,
          "prayerWall": false, "readingPlan": false,
          "meditate": false, "journal": false,
          "gratitude": false, "reflection": false,
          "challenge": false, "localVisit": false,
          "devotional": false
        },
        "newActivityType": "pray",
        "alreadyEarnedBadgeIds": [],
        "friendCount": 0,
        "encouragementsSent": 0,
        "fullWorshipDays": 0,
        "challengesCompleted": 0,
        "intercessionCount": 0,
        "bibleChaptersRead": 0,
        "prayerWallPosts": 0,
        "readingPlanProgress": [],
        "bibleProgress": {},
        "meditationHistory": [],
        "gratitudeEntryDates": [],
        "localVisitsTotal": 0,
        "listeningHistory": []
      },
      "expected": {
        "pointsEarned": 10,
        "newTotalPoints": 10,
        "newCurrentLevel": 1,
        "levelUp": false,
        "newCurrentStreak": 1,
        "newLongestStreak": 1,
        "streakTransition": "FIRST_EVER",
        "newBadgeIds": ["first_prayer"],
        "isFreeRepairAvailableAfter": true
      }
    }
  ]
}
```

Both test harnesses parse this exact shape. Field names are camelCase to match TypeScript conventions; backend maps to its enum/record shapes via Jackson `@JsonProperty` where needed.

### 2. Enumerated scenario categories (~36 total)

The 30+ scenarios should cover (with rough count targets):

**A) FIRST-TIME-EVER (3 scenarios):**

- First-ever pray (single activity)
- First-ever multi-activity day (e.g., pray + meditate)
- First-ever full worship day (all 6 base activities)

**B) STREAK CONTINUATION (4 scenarios):**

- Yesterday → today (increment from 1 to 2)
- Yesterday → today (increment crossing 7 to trigger `streak_7` badge)
- Same-day repeat (no-op transition)
- Multi-day gap (RESET; old streak was 5 → repair capture eligible)

**C) STREAK BOUNDARIES (3 scenarios):**

- Crossing 14 (`streak_14` badge)
- Crossing 30 (`streak_30` badge)
- Crossing 365 (`streak_365` badge — the cap)

**D) LEVEL-UP (5 scenarios):**

- Crossing 100 (level 1→2)
- Crossing 500 (level 2→3)
- Crossing 1500 (level 3→4)
- Crossing 4000 (level 4→5)
- Crossing 10000 (level 5→6, the cap)

**E) MULTIPLIER TIERS (4 scenarios):**

- 1 activity (×1.0, no tier label)
- 2 activities (×1.25, "Growing")
- 4 activities (×1.5, "Devoted")
- 7 activities (×2.0, "Full Worship Day")

**F) BADGE-EARN — ACTIVITY MILESTONES (5 scenarios):**

- First prayer
- Prayer 100 (after `currentTotalPoints + count = threshold`)
- First journal
- Journal 50
- First listen

**G) BADGE-EARN — DATA-SOURCE-DEPENDENT (4 scenarios):**

- 7-day consecutive gratitude streak (uses `gratitudeEntryDates`)
- 30 unique gratitude days (uses `gratitudeEntryDates`)
- First reading-plan completion (uses `readingPlanProgress`)
- First bible-book completion (uses `bibleProgress`)

**H) BADGE REPEATABILITY (2 scenarios):**

- Full Worship Day FIRST time (badge fires)
- Full Worship Day SECOND time (badge fires again, due to repeatability — different earned set, but same condition)

**I) IDEMPOTENCY / SAME-DAY REPEAT (3 scenarios):**

- Second pray same day (no points delta, no streak change, no new badges)
- Second meditate same day (same)
- Mixed: first journal AFTER first pray same day (delta computed correctly with old-set having pray)

**J) REPAIR ELIGIBILITY (3 scenarios):**

- Never used (`lastFreeRepairDate` null) → eligible
- Used last week → eligible (`lastFreeRepairDate < currentWeekStart`)
- Used this week → not eligible (`lastFreeRepairDate == currentWeekStart`)

**Total: 36 scenarios.** Master plan asks for 30+; this list goes deliberately further to pin breadth.

### 3. Each harness runs a parameterized test

**Backend (`DriftDetectionTest.java`, JUnit 5):**

```java
@ParameterizedTest(name = "{0}")
@MethodSource("allScenarios")
void scenarioMatchesBackendComputation(DriftScenario scenario) {
  DriftResult actual = runBackend(scenario.input());
  assertEquals(scenario.expected(), actual,
      "Drift in scenario: " + scenario.id());
}

static Stream<DriftScenario> allScenarios() throws IOException {
  // Read _test_fixtures/activity-engine-scenarios.json
  // Path: relative to project root, NOT classpath
  File f = new File("../_test_fixtures/activity-engine-scenarios.json");
  JsonNode root = mapper.readTree(f);
  JsonNode arr = root.get("scenarios");
  return StreamSupport.stream(arr.spliterator(), false)
      .map(node -> mapper.convertValue(node, DriftScenario.class));
}
```

**Frontend (`activity-drift.test.ts`, Vitest):**

```ts
import scenarios from '@/../_test_fixtures/activity-engine-scenarios.json';

describe.each(scenarios.scenarios)('scenario $id', (scenario) => {
  it('matches frontend computation', () => {
    const actual = runFrontend(scenario.input);
    expect(actual).toEqual(scenario.expected);
  });
});
```

Both use the same `id` field as the test name so when one side fails, the failing scenario is immediately identifiable in CI output.

### 4. Assertion granularity — structural equality

Both harnesses compare the entire `expected` record/object for structural equality. NOT field-by-field assertions. Reasons:

- When drift surfaces, the diff in CI output shows ALL differences at once (e.g., streak AND badges both diverged) instead of bisecting field-by-field.
- Adding a new field to the schema requires updating the assertion in zero places — the new field flows through automatically.
- Mistakes (missing fields, typos in field names) surface as test failures rather than silent passes.

For the backend, this means a Java record's `equals()` is the comparison primitive. For the frontend, Vitest's `toEqual` does deep structural equality.

### 5. Critical: both sides must run the same composition algorithm as Spec 2.6

The `runBackend` and `runFrontend` helpers replicate the composition logic from Spec 2.6's `ActivityService` / `useFaithPoints.recordActivity`:

```text
// Pseudocode for both sides:
newActivities = oldActivities ∪ {newActivityType}
oldDailyTotal = calculateDailyPoints(oldActivities).points
newDailyTotal = calculateDailyPoints(newActivities).points
pointsDelta = newDailyTotal - oldDailyTotal
newTotalPoints = currentTotalPoints + pointsDelta
levelInfo = getLevelForPoints(newTotalPoints)
levelUp = levelInfo.level > currentLevel

streakResult = updateStreak(today, currentStreakData)

badgeContext = buildContext(streakResult, levelInfo, ...)
newBadgeIds = checkForNewBadges(badgeContext, alreadyEarnedSet)

repairEligible = lastFreeRepairDate == null
                 || lastFreeRepairDate < currentWeekStart

return { pointsEarned, newTotalPoints, newCurrentLevel,
         levelUp, ...streakResult fields...,
         newBadgeIds: sorted, isFreeRepairAvailableAfter }
```

This algorithm is duplicated in both harness helpers. Yes, that's "duplicated logic" — but it's TEST HARNESS code, not production code. The duplication is the entire point: the tests verify the implementations agree by running them through the SAME orchestration.

If an algorithm change is needed, BOTH harnesses get updated together (and so do `FaithPointsService` / `StreakService` / `BadgeService` / their frontend counterparts).

### 6. Same-day-repeat handling in harness

When `newActivityType` is already in `todaysActivitiesBefore`, the production code (Spec 2.6 backend, `useFaithPoints` frontend) early-returns without delta/streak/badge updates.

The harness MUST replicate this:

```text
if (todaysActivitiesBefore[newActivityType]) {
  return {
    pointsEarned: 0,
    newTotalPoints: currentTotalPoints,
    newCurrentLevel: currentLevel,
    levelUp: false,
    newCurrentStreak: currentStreak,
    newLongestStreak: longestStreak,
    streakTransition: "SAME_DAY",
    newBadgeIds: [],
    isFreeRepairAvailableAfter: <pure check>,
  };
}
```

### 7. `newBadgeIds` are sorted for stable comparison

Both implementations may return new badges in different orders depending on the iteration order of the 15 category checks. The expected fixture data sorts the badge IDs alphabetically; both harnesses sort their actual output before assertion.

This is correct: badge IDs are a SET, not an ordered list, for the purposes of "what got earned." Order is incidental.

### 8. `streakTransition` serialization

Backend's `StreakResult.transition` is the `StreakTransition` enum (`FIRST_EVER` / `SAME_DAY` / `INCREMENT` / `RESET`). Frontend's `updateStreak` doesn't have an enum — it returns a state object.

**Resolution:** the harness derives the transition string from the result shape. Logic identical on both sides:

- if `oldLastActive == null` → `"FIRST_EVER"`
- else if `newLastActive == oldLastActive` → `"SAME_DAY"` (this matches the early-return same-day case too)
- else if `oldLastActive == today.minus(1 day)` → `"INCREMENT"`
- else → `"RESET"`

The `SAME_DAY` case is gated by the same-day-repeat early return per Decision #6, which produces transition `"SAME_DAY"` directly. The above derivation only fires when we DID enter the streak update path.

Backend: `StreakService.updateStreak` returns the enum directly. The harness uses it as-is. Frontend: derive from inputs/outputs in the harness using the same logic. The fixture's expected value matches either path's output.

---

## Deliverables

### Files to create

- **`_test_fixtures/activity-engine-scenarios.json`** — 36 scenarios per Architectural Decision #2 covering 10 categories. JSON shape per Architectural Decision #1.
- **`_test_fixtures/README.md`** — Short doc: "what is this directory, why does it exist, how to add a scenario, what implementations consume which fixture file." 1 page max.
- **`backend/src/test/java/com/worshiproom/activity/DriftDetectionTest.java`** — Pure JUnit 5 parameterized test per Architectural Decision #3 (backend half).
- **`backend/src/test/java/com/worshiproom/activity/DriftScenario.java`** — Java record(s) modeling the fixture scenario shape. Required for Jackson deserialization.
- **`backend/src/test/java/com/worshiproom/activity/DriftInput.java`** — Java record for the input portion. Or nested as static record inside `DriftScenario` — CC's call.
- **`backend/src/test/java/com/worshiproom/activity/DriftExpected.java`** — Java record for the expected portion.
- **`backend/src/test/java/com/worshiproom/activity/DriftResult.java`** — Java record matching `DriftExpected`, used as `actual` for the `assertEquals` call.
- **`frontend/src/services/__tests__/activity-drift.test.ts`** — Vitest test per Architectural Decision #3 (frontend half). Uses `describe.each` over the imported scenarios array.

### Files NOT to modify

- `pom.xml` — no new dependencies (Jackson is already there).
- `application.properties` — no changes.
- `master.xml` — no changes.
- `LiquibaseSmokeTest` — no changes.
- `openapi.yaml` — no changes.
- All Phase 2 services and entities (2.2–2.7 deliverables) — no changes (`FaithPointsService`, `StreakService`, `BadgeService`, `ActivityCountsService`, `ActivityService`, all entities, all DTOs).
- Frontend services (`faith-points-storage`, `badge-engine`, `streak-repair-storage`) — no changes.
- `_forums_master_plan/spec-tracker.md` — no changes (Eric flips rows manually).

---

## Tests Required

The deliverable IS the test infrastructure. The "tests required" question becomes: how does this spec verify the test infrastructure works correctly?

**A) Both harnesses run all 36 scenarios green on the committed code.** This is acceptance criterion #1.

**B) The "drift catches drift" sanity check (manual, optional):**

During code review, Eric (or CC during execution) MAY temporarily edit ONE scenario's `expected.pointsEarned` to a wrong value, run the test suite, confirm BOTH harnesses fail with a clear diff identifying the bad scenario, then revert. This proves the assertion machinery works. NOT automated; just a one-time confidence check.

**C) The "implementation drift breaks the test" sanity check:**

During code review, Eric (or CC) MAY temporarily change one constant value (e.g., flip `ACTIVITY_POINTS.pray` from 10 to 12 in the BACKEND constants), run the backend harness, confirm fixtures fail loudly, then revert. Again, manual confidence check.

These two sanity checks are NOT part of the spec's automated test count — they're verification that the harness works. The actual test count contributed by this spec is:

- **Backend:** 36 parameterized tests (one per scenario), all green on committed code.
- **Frontend:** 36 parameterized tests (one per scenario), all green on committed code.

---

## Out of Scope

- Scenarios for grace days (feature doesn't exist on either side per Spec 2.3 Divergence 1)
- Scenarios for grief pause (same)
- Scenarios for repair APPLICATION (only eligibility was ported in Spec 2.3 Divergence 3)
- Scenarios for welcome badge (manually granted; not in `checkForNewBadges` per Spec 2.4 Divergence 2)
- Scenarios for challenge badges (same)
- Scenarios for `activity_counts` behavior (separate pure-persistence concern with no calculation logic to drift)
- Scenarios for the `wr:activity-recorded` external event paths (per Spec 2.7 followup, those don't go through `recordActivity` at all)
- The Phase 2 Cutover (Spec 2.9)
- Historical Backfill (Spec 2.10)
- A "fixture format spec" or "schema versioning strategy" beyond `schemaVersion: 1` in the JSON header (future spec if/when a schema break is needed)
- A pre-commit git hook to run drift tests (CI runs them; no hook needed)
- Modifying any Phase 2 service or entity
- Modifying any frontend service or constant
- Coverage of the OpenAPI request/response wire format (that's HTTP-layer parity, not engine parity — covered by Spec 2.6's integration tests)

---

## Acceptance Criteria

- [ ] `_test_fixtures/` directory created at repo root
- [ ] `_test_fixtures/activity-engine-scenarios.json` contains at least 30 scenarios (target 36) across the 10 categories listed in Architectural Decision #2
- [ ] `_test_fixtures/README.md` exists with a brief explanation of the directory and how to add scenarios
- [ ] `DriftDetectionTest.java` reads the fixture file via Jackson, deserializes into `DriftScenario` records, runs the parameterized test
- [ ] `DriftDetectionTest` is pure JUnit 5 — no `@SpringBootTest`, no Testcontainers, no database
- [ ] `DriftDetectionTest` backend wall-clock < 2 seconds
- [ ] `activity-drift.test.ts` reads the fixture via JSON import, runs `describe.each` over scenarios
- [ ] Frontend drift test wall-clock < 1 second
- [ ] Both tests pass green on the committed Phase 2 code
- [ ] Backend test count: prior count + 36 new tests, all green
- [ ] Frontend test count: prior count + 36 new tests, all green
- [ ] When a scenario fails on either side, the failure message includes the scenario `id` (so failures are bisectable)
- [ ] Adding a new scenario to the JSON file requires NO code changes on either side — both harnesses pick it up via parameterization
- [ ] No grace-day, grief-pause, or repair-application scenarios in the fixture (per Divergence 1)
- [ ] No welcome or challenge badge scenarios in the fixture (per Spec 2.4 Divergence 2)
- [ ] Same-day-repeat scenarios produce `SAME_DAY` transition with zero deltas
- [ ] All Phase 2 services/entities/frontend services unchanged
- [ ] `newBadgeIds` sorted alphabetically in both fixture expected values and harness output
- [ ] No new dependencies in `pom.xml` or `package.json`
- [ ] Backend build succeeds (`./mvnw test`)
- [ ] Frontend build succeeds (`pnpm test` and `pnpm build`)

---

## Guardrails (DO NOT)

- Do **NOT** change branches. Stay on `forums-wave-continued`.
- Do **NOT** modify any Phase 2 service or entity.
- Do **NOT** modify `FaithPointsService`, `StreakService`, `BadgeService`, `ActivityCountsService`, or `ActivityService`.
- Do **NOT** modify any frontend service or constant.
- Do **NOT** modify `openapi.yaml`.
- Do **NOT** modify `pom.xml`.
- Do **NOT** add a new dependency (Jackson + JUnit 5 are sufficient on backend; Vitest + ESM JSON imports are sufficient on frontend).
- Do **NOT** use `@SpringBootTest`, `@DataJpaTest`, or `AbstractIntegrationTest` for the drift test. Pure JUnit 5.
- Do **NOT** use Testcontainers in the drift test.
- Do **NOT** include grace, grief, or repair-application scenarios.
- Do **NOT** include welcome or challenge badge scenarios.
- Do **NOT** introduce a custom assertion DSL. `assertEquals` on records (backend) and `toEqual` (frontend) are sufficient.
- Do **NOT** make the harness duplicate-skeptical. Both sides intentionally implement the same composition algorithm.
- Do **NOT** split the fixture into multiple files. One fixture, one source of truth, both harnesses read it.
- Do **NOT** add a "test against the OpenAPI schema" check. That's HTTP-layer; not this spec's concern.
- Do **NOT** call the live backend HTTP endpoint from the frontend drift test. Frontend test runs the frontend services directly against fixture data.
- Do **NOT** compute "today" or "currentWeekStart" inside the harness. The fixture provides them explicitly.
- Do **NOT** compute random data, fuzz inputs, or property-test. Deterministic enumerated scenarios only.
- Do **NOT** log scenario inputs to stdout on success (cluttered CI output). Log only on failure, via the assertion's failure message.
- Do **NOT** regenerate expected values automatically as part of the drift test setup. The fixture is hand-authored (or one-shot-script-authored) and committed; the test asserts against committed values.
- Do **NOT** commit, push, or do any git operation. Eric handles all git.
- Do **NOT** touch `_forums_master_plan/spec-tracker.md`.

---

## Plan Shape Expectation

`/plan-forums` output for this M/Low spec should be **8–12 steps**:

1. **Recon:** read frontend `services/faith-points-storage.ts` (the `updateStreak` + `calculateDailyPoints` pure functions), `services/badge-engine.ts` (`checkForNewBadges`), backend `FaithPointsService`, `StreakService`, `BadgeService`, and `ActivityService` for the composition algorithm. Verify the field shapes for input/expected match what both implementations actually produce.
2. Author `_test_fixtures/README.md`.
3. Author the 36 scenarios in `_test_fixtures/activity-engine-scenarios.json`. **Critical:** compute each scenario's expected values BY HAND or by running the existing implementations as a one-shot reference (NOT by running the drift test itself — circularity). Each scenario's expected output must be correct independently of the test passing.
4. Author backend `DriftScenario`, `DriftInput`, `DriftExpected`, `DriftResult` records.
5. Author backend `DriftDetectionTest` with the `@MethodSource` pattern, the `runBackend` helper that composes the four services per Architectural Decision #5, and the structural-equality assertion.
6. Run `./mvnw test`; iterate until all 36 backend scenarios pass.
7. Author frontend `activity-drift.test.ts` with `describe.each`, the `runFrontend` helper that composes the frontend services via the same algorithm, and the `toEqual` assertion.
8. Run `pnpm test`; iterate until all 36 frontend scenarios pass.
9. Optional manual confidence check: temporarily break ONE scenario's expected, confirm BOTH harnesses fail loudly with the scenario id, revert.
10. Self-review against acceptance criteria.

If the plan comes back with 18+ steps, proposes test scenarios for grace/grief/repair-application, proposes property-based testing, proposes integrating the drift test with HTTP endpoint calls, or proposes a custom assertion DSL — push back hard.

---

## Notes for Eric

- **This spec's value is asymmetric to its size.** The 36 scenarios catch a class of bug that's near-impossible to catch any other way: silent semantic drift between two independent implementations of the same logic.

- **Authoring 36 scenarios is the work-intensive part of this spec.** CC will spend most of execution computing expected values. Each scenario's expected fields must be correct INDEPENDENTLY of the test passing — otherwise the test is measuring its own correctness, which is not signal.

- **One way CC can compute expected values reliably:** write a small one-shot Java main method that calls the existing Phase 2 backend services with the scenario's input and prints the result. Same for frontend. Use the printed output as the fixture's expected. This produces correct expected values WITHOUT making the harness self-validating — because the next time someone changes the implementation, THE HARNESS will catch the drift, not the regenerated expected values (which would mask it).

  **CC: do NOT regenerate expected values automatically as part of the drift test setup.** The fixture is hand-authored (or one-shot-script-authored) and committed; the test asserts against committed values.

- **Pre-execution checklist:** Docker NOT required (no DB tests). Frontend dev server NOT required.

- After 2.8 ships, **Spec 2.9 (Cutover)** flips `VITE_USE_BACKEND_ACTIVITY=true` and runs a manual smoke test. S-sized but Medium-risk because it's the live cutover. After 2.9, **Spec 2.10 (Historical Backfill)** closes Phase 2.

- **Phase 2 status after this spec:** 8/10 done. Specs 2.9 (S, Medium-risk) and 2.10 (M, Medium-risk) remaining.
