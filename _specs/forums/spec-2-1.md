# Forums Wave: Spec 2.1 — Activity Engine Schema (Liquibase)

**Master Plan Reference:** `_forums_master_plan/round3-master-plan.md` → Spec 2.1 (line 2606), Decision 5 (line 700)
**Branch:** `forums-wave-continued` (stay on this branch — no per-spec sub-branch)
**Date:** 2026-04-26

---

## Affected Frontend Routes

N/A — backend-only spec. No frontend code touched. The five tables this spec creates will be exercised by `POST /api/v1/activity` (Spec 2.6) and the dual-write wiring (Spec 2.7); user-facing behavior does not change in this wave.

---

## Spec Header

- **ID:** `round3-phase02-spec01-activity-schema`
- **Size:** M
- **Risk:** Low
- **Prerequisites:** Phase 1 complete ✅ (24 specs shipped; Specs 1.10e/1.10k return in later waves; Specs 1.5b–1.5g deferred end-of-project pending SMTP setup. None of these outstanding prerequisites apply to a schema-only spec — the only Phase 1 dependency that matters here is the existing `users` table and its `id UUID` primary key, both of which are in production via Spec 1.3.)
- **Phase:** 2 — Activity Engine Migration (Dual-Write)
- **First spec of Phase 2.** Specs 2.2–2.6 layer the business logic on top.

---

## Goal

Create the five PostgreSQL tables that back the Activity Engine backend port: `activity_log`, `faith_points`, `streak_state`, `user_badges`, `activity_counts`. Liquibase changesets only — no JPA entities, no repositories, no services, no controllers. Those land in Specs 2.2 through 2.6.

This is the foundational migration for Phase 2. Once it ships, five subsequent specs can layer in the business logic (faith-points calculation, streak state machine, badge eligibility, activity counts, the `POST /api/v1/activity` endpoint). Decoupling schema from logic keeps each spec small and auditable.

---

## Master Plan Divergences

One small divergence from master plan v2.9 § Spec 2.1 worth flagging:

### 1. Changeset filename dates

The master plan body lists changeset filenames as `2026-04-15-001-create-activity-log-table.xml` through `2026-04-15-005-create-activity-counts-table.xml`. Those April 15 dates were aspirational from when the master plan was authored and don't reflect today's reality. The canonical pattern (per shipped Spec 1.3 and Spec 1.3b) is "date when the changeset is authored, with sequential number suffix to disambiguate same-day changesets."

**Actual filenames for this spec:** `2026-04-25-003-...` through `2026-04-25-007-...` continuing the numeric sequence after the existing:

- `2026-04-23-001-create-users-table.xml`
- `2026-04-23-002-add-users-timezone-column.xml`

Once a changeset ships, its filename is permanent and its MD5 is recorded in `DATABASECHANGELOG`. Future schema changes never edit existing files; they append new ones.

> Note on date choice: the file authoring date is `2026-04-25` because the recon and brief authoring landed on that day. Today (2026-04-26) is when execution begins. Either date would be defensible per the rule; the brief's explicit instruction is `2026-04-25`. CC must use `2026-04-25` as the date prefix verbatim.

---

## Recon Facts (verified during brief authoring — re-verify suspect ones during execution)

- **Existing changeset directory:** `backend/src/main/resources/db/changelog/` with three files plus master.xml:
  - `2026-04-23-001-create-users-table.xml`
  - `2026-04-23-002-add-users-timezone-column.xml`
  - `contexts/dev-seed.xml`
  - `master.xml`

- **Existing master.xml** is a thin index that `<include>`s each changeset by relative path. Future specs APPEND `<include>` entries and never edit or reorder existing entries.

- **Existing changeset pattern** (verified by reading `2026-04-23-001-create-users-table.xml`):
  - `<databaseChangeLog>` root with proper `xmlns` + `xsi`
  - One `<changeSet id="<filename-without-xml>" author="worship-room">` per file
  - `<createTable>` with explicit column types and constraints
  - `<sql>` blocks for CHECK constraints (named explicitly)
  - `<rollback>` block with `<dropTable>` for symmetry
  - Comment block at top explaining the spec scope and the "MD5 is permanent once shipped" convention

- **Existing column-type conventions** (verified):
  - UUID primary keys with `defaultValueComputed="gen_random_uuid()"`
  - `TIMESTAMP WITH TIME ZONE` for all timestamps (NOT plain `TIMESTAMP`, NOT `TIMESTAMPTZ` keyword form)
  - `defaultValueComputed="NOW()"` for `created_at` / `updated_at` / similar
  - `VARCHAR(255)` for emails and similar bounded strings
  - `BOOLEAN` with `defaultValueBoolean="false"` for flags
  - NOT NULL constraints declared via `<constraints nullable="false"/>`

- **Existing `LiquibaseSmokeTest`** at `backend/src/test/java/com/worshiproom/db/LiquibaseSmokeTest.java` has four tests:
  1. `usersTableExistsWithAllDecision3Columns` — asserts 21 columns
  2. `liquibaseChangelogRecordsAllChangesets` — asserts exactly **2** rows in `databasechangelog` (will need to bump to **7** after this spec)
  3. `timezoneColumnHasCorrectDefaultAndConstraints`
  4. `displayNamePreferenceCheckConstraintRejectsInvalidValues`

  This spec MUST extend the smoke test to add tests for each new table AND update the count assertion in test #2 from 2 to 7.

- **Existing Testcontainers infrastructure** (per Spec 1.7 and Phase 1 Execution Reality Addendum):
  - `AbstractIntegrationTest` — full Spring context tests
  - `AbstractDataJpaTest` — slice tests
  - Both share a singleton Postgres container via `TestContainers` utility class
  - `@DynamicPropertySource` pins `spring.liquibase.contexts=test`

- **The schema for all five tables** is described verbatim in master plan Decision 5 (line 700). CC must consult that section during recon. THIS SPEC DOES NOT REPRODUCE THE FULL SCHEMA — it lists table names and must-honor constraints. The authoritative source for column-by-column shape is master plan Decision 5.

---

## Architectural Decisions

### 1. One changeset per table

Five separate XML files, not one combined file. Reasons:

- Matches the discipline pattern from Spec 1.3 (one file per logical unit).
- Lets a future spec roll back ONE table independently if a design flaw surfaces.
- Easier code review: each file is small and self-contained.

**Filenames** (in order of master.xml include):

- `2026-04-25-003-create-activity-log-table.xml`
- `2026-04-25-004-create-faith-points-table.xml`
- `2026-04-25-005-create-streak-state-table.xml`
- `2026-04-25-006-create-user-badges-table.xml`
- `2026-04-25-007-create-activity-counts-table.xml`

### 2. Schema shape per master plan Decision 5 — verbatim

CC reads master plan v2.9 line 700 and applies the schema exactly as described. Where the master plan says `TIMESTAMP`, interpret as `TIMESTAMP WITH TIME ZONE` per the existing users table convention. Where the master plan says `DATE`, use SQL `DATE`.

If CC notices any column type or constraint that disagrees with what's in this spec, **MASTER PLAN WINS**. Stop and report the discrepancy before writing code; do not silently reconcile.

### 3. Foreign keys with ON DELETE CASCADE

All foreign keys to `users(id)` must declare `ON DELETE CASCADE`. Per Decision 5: when a user is deleted, their activity history goes with them (for now — soft-delete semantics for activity is a future spec's call). This also matches `.claude/rules/05-database.md` which lists `activity_log`, `faith_points`, `streak_state`, `user_badges` as canonical CASCADE tables.

Liquibase syntax:

```xml
<addForeignKeyConstraint
  baseTableName="activity_log"
  baseColumnNames="user_id"
  constraintName="fk_activity_log_user"
  referencedTableName="users"
  referencedColumnNames="id"
  onDelete="CASCADE"/>
```

### 4. CHECK constraints for domain invariants

Add CHECK constraints that catch obviously-wrong values at the database level:

- `faith_points.total_points >= 0`
- `faith_points.current_level >= 1`
- `streak_state.current_streak >= 0`
- `streak_state.longest_streak >= 0`
- `streak_state.grace_days_used >= 0`
- `user_badges.display_count >= 1`
- `activity_counts.count_value >= 0`

**Name each constraint explicitly** (per the existing `users_display_name_preference_check` pattern):

- `faith_points_total_points_nonneg_check`
- `faith_points_current_level_positive_check`
- `streak_state_current_streak_nonneg_check`
- `streak_state_longest_streak_nonneg_check`
- `streak_state_grace_days_used_nonneg_check`
- `user_badges_display_count_positive_check`
- `activity_counts_count_value_nonneg_check`

Use `<sql>` blocks with `ALTER TABLE ADD CONSTRAINT`, not inline column constraints. The named-constraint pattern matches Spec 1.3.

### 5. Indexes — minimal, justified

The master plan says "Indexes per the Decision 5 spec" but Decision 5 doesn't enumerate specific indexes. Apply this small starting set with explicit reasoning captured in changeset comments:

**`activity_log`:**

- `INDEX (user_id, occurred_at DESC)` — supports the "give me a user's recent activity" query that Spec 2.6's `POST /api/v1/activity` will use to compute streak and badge eligibility
- `INDEX (user_id, activity_type)` — supports the count queries that drive badge eligibility (Spec 2.4)

**`faith_points`:** PK on `user_id` is the only access path needed today. No additional indexes.

**`streak_state`:** PK on `user_id` is the only access path needed today. No additional indexes.

**`user_badges`:** composite PK `(user_id, badge_id)` is the only access path needed today. No additional indexes.

**`activity_counts`:** composite PK `(user_id, count_type)` is the only access path needed today. No additional indexes.

Rationale captured in each changeset's leading comment: "indexes match expected query patterns for Spec 2.x; add more in a future tuning spec when production query plans reveal need."

### 6. Rollback blocks for each changeset

Symmetric with Spec 1.3. Each `<changeSet>` ends with:

```xml
<rollback>
  <dropTable tableName="<table>"/>
</rollback>
```

Liquibase drops CHECK constraints, indexes, and FK constraints transitively when the table itself is dropped — no need to enumerate them in the rollback.

### 7. No JPA entities, no repositories, no services

This spec is migration-only. Specs 2.2 through 2.6 add the Java code that consumes these tables. Adding any of that here is scope creep that breaks the spec sequencing.

### 8. Master changelog is append-only

Add five new `<include>` entries to `master.xml` in the order listed in Decision 1. Do NOT reorder existing entries. Do NOT modify existing entries. The new entries must precede the existing `contexts/dev-seed.xml` entry (the dev-seed include stays last).

### 9. No Liquibase contexts on these new changesets

These tables must materialize in dev, test, AND prod profiles — same posture as the existing `users` table. Do NOT add `context="dev"` or `context="test"` to any of the five new changesets. Contexts are reserved for seed-data changesets per `.claude/rules/05-database.md` § "Test-profile context override."

---

## Files to Create

All paths under `backend/src/main/resources/db/changelog/`:

### `2026-04-25-003-create-activity-log-table.xml`

Columns per Decision 5:

- `id` (UUID PK, `defaultValueComputed="gen_random_uuid()"`)
- `user_id` (UUID NOT NULL, FK to `users(id)` with `ON DELETE CASCADE`)
- `activity_type` (VARCHAR(50) NOT NULL) — `'pray'`, `'meditate'`, `'journal'`, `'prayer_wall'`, `'bible'`, etc.
- `source_feature` (VARCHAR(50) NOT NULL) — `'daily_hub'`, `'prayer_wall'`, `'bible'`, `'music'`, etc.
- `occurred_at` (TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW())
- `points_earned` (INTEGER NOT NULL DEFAULT 0)
- `metadata` (JSONB NULL)

Two indexes per Architectural Decision #5. Rollback block.

### `2026-04-25-004-create-faith-points-table.xml`

Columns per Decision 5:

- `user_id` (UUID PK + FK to `users(id)` with `ON DELETE CASCADE`)
- `total_points` (INTEGER NOT NULL DEFAULT 0)
- `current_level` (INTEGER NOT NULL DEFAULT 1)
- `last_updated` (TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW())

Two CHECK constraints per Architectural Decision #4. Rollback block.

### `2026-04-25-005-create-streak-state-table.xml`

Columns per Decision 5:

- `user_id` (UUID PK + FK to `users(id)` with `ON DELETE CASCADE`)
- `current_streak` (INTEGER NOT NULL DEFAULT 0)
- `longest_streak` (INTEGER NOT NULL DEFAULT 0)
- `last_active_date` (DATE NULL)
- `grace_days_used` (INTEGER NOT NULL DEFAULT 0)
- `grace_week_start` (DATE NULL)
- `grief_pause_until` (DATE NULL)
- `grief_pause_used_at` (TIMESTAMP WITH TIME ZONE NULL)

Three CHECK constraints per Architectural Decision #4. Rollback block.

### `2026-04-25-006-create-user-badges-table.xml`

Columns per Decision 5:

- `user_id` (UUID NOT NULL, FK to `users(id)` with `ON DELETE CASCADE`)
- `badge_id` (VARCHAR(100) NOT NULL)
- `earned_at` (TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW())
- `display_count` (INTEGER NOT NULL DEFAULT 1)

Composite primary key `(user_id, badge_id)`. One CHECK constraint per Architectural Decision #4. Rollback block.

### `2026-04-25-007-create-activity-counts-table.xml`

Columns per Decision 5:

- `user_id` (UUID NOT NULL, FK to `users(id)` with `ON DELETE CASCADE`)
- `count_type` (VARCHAR(50) NOT NULL)
- `count_value` (INTEGER NOT NULL DEFAULT 0)
- `last_updated` (TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW())

Composite primary key `(user_id, count_type)`. One CHECK constraint per Architectural Decision #4. Rollback block.

---

## Files to Modify

### `backend/src/main/resources/db/changelog/master.xml`

Append five new `<include>` lines after the existing `2026-04-23-002` entry, before the `contexts/dev-seed.xml` entry. The dev-seed entry stays last. Do not edit or reorder existing entries.

### `backend/src/test/java/com/worshiproom/db/LiquibaseSmokeTest.java`

Three changes:

1. **Update `liquibaseChangelogRecordsAllChangesets`** — bump `hasSize(2)` to `hasSize(7)`, and append five additional row assertions verifying each new changeset's id, author, and filename suffix. Existing two assertions stay verbatim.

2. **Add a new test method per new table:**
   - `activityLogTableExistsWithExpectedColumns`
   - `faithPointsTableExistsWithExpectedColumns`
   - `streakStateTableExistsWithExpectedColumns`
   - `userBadgesTableExistsWithExpectedColumnsAndCompositePK`
   - `activityCountsTableExistsWithExpectedColumnsAndCompositePK`

   Each follows the pattern of `usersTableExistsWithAllDecision3Columns`: query `information_schema.columns`, assert column count and ordering via `containsExactly`, spot-check 2–3 specific column types (UUID, TIMESTAMP WITH TIME ZONE, JSONB where applicable). For composite-PK tables, additionally query `information_schema.table_constraints` to verify the primary key spans both columns.

3. **Add a test verifying the CHECK constraints reject invalid values**, modeled on `displayNamePreferenceCheckConstraintRejectsInvalidValues`. One test method per CHECK constraint, OR one parameterized method that exercises all of them — CC's call. Either way, every CHECK constraint must have a passing rejection test that asserts `DataIntegrityViolationException` with a message containing the constraint name.

**No new test classes outside `LiquibaseSmokeTest`** for this spec. The smoke test extension covers schema verification; no JPA entity tests yet because there are no entities.

---

## Database Changes (Liquibase)

| Filename | Action |
|---|---|
| `2026-04-25-003-create-activity-log-table.xml` | NEW — creates `activity_log` + 2 indexes + FK CASCADE |
| `2026-04-25-004-create-faith-points-table.xml` | NEW — creates `faith_points` + 2 CHECK + FK CASCADE |
| `2026-04-25-005-create-streak-state-table.xml` | NEW — creates `streak_state` + 3 CHECK + FK CASCADE |
| `2026-04-25-006-create-user-badges-table.xml` | NEW — creates `user_badges` + composite PK + 1 CHECK + FK CASCADE |
| `2026-04-25-007-create-activity-counts-table.xml` | NEW — creates `activity_counts` + composite PK + 1 CHECK + FK CASCADE |
| `master.xml` | MODIFIED — five `<include>` entries appended in order |

---

## API Changes

None. This spec creates no endpoints. `POST /api/v1/activity` is Spec 2.6.

---

## Copy Deck

N/A — no user-facing copy. Schema-only spec.

---

## Anti-Pressure Copy Checklist

N/A — no user-facing copy. (Universal Rule 12 still binds future Phase 2 specs that surface the data; this spec produces no UI.)

---

## Anti-Pressure Design Decisions

N/A — schema only. The grace-day, grief-pause, and streak-repair semantics live in Spec 2.3's `StreakService`. This spec just provides the columns those services will write to (`grace_days_used`, `grace_week_start`, `grief_pause_until`, `grief_pause_used_at`).

---

## Acceptance Criteria

- [ ] Five new XML changeset files exist at the canonical paths under `backend/src/main/resources/db/changelog/`
- [ ] Each changeset uses the established Spec 1.3 pattern: `databaseChangeLog` root, single `changeSet` per file, `<createTable>` with explicit types and constraints, named CHECK constraints via `<sql>` blocks, rollback block with `<dropTable>`
- [ ] All five FOREIGN KEYs to `users(id)` declare `onDelete="CASCADE"`
- [ ] Seven CHECK constraints exist with the names listed in Architectural Decision #4
- [ ] Two indexes exist on `activity_log` per Architectural Decision #5
- [ ] `master.xml` has five new `<include>` entries in the correct order; existing entries unchanged
- [ ] `LiquibaseSmokeTest` extended:
  - `liquibaseChangelogRecordsAllChangesets` count assertion bumped from `hasSize(2)` to `hasSize(7)` with the five new row checks
  - Five new "table exists with expected columns" tests
  - New CHECK-constraint rejection tests covering all seven constraints
- [ ] `./mvnw test` passes ALL tests with the new schema in place; no existing test regresses (baseline 434 → ~445)
- [ ] `psql \d activity_log` (or equivalent on Testcontainers) shows the expected schema
- [ ] Each changeset has a working rollback block (rollback not exercised in test, but syntactically valid)
- [ ] No JPA entities created
- [ ] No service or controller code introduced
- [ ] No frontend changes
- [ ] No new dependency in `pom.xml`
- [ ] No env var added
- [ ] No `application-{profile}.properties` change
- [ ] Spring Boot starts cleanly in dev profile with the new schema (manual verification by Eric post-merge against the docker-compose Postgres container)

---

## Testing Notes

**Test class:** `LiquibaseSmokeTest` (extending the existing four tests with new methods).

**Baseline:** Post-1.10f / current state: 434 backend tests pass. New methods bring count to ~445 (depending on whether CC parameterizes the CHECK-constraint tests or adds them individually). Wall-clock impact: <2s for the new tests (no fixtures, just DDL inspection via `JdbcTemplate` against the test container).

**Acceptance:** same number of pre-existing tests still pass, new tests all green, no flake introduced. Whole backend test suite runs in roughly the existing ~97s baseline (per Phase 1 Execution Reality Addendum point #1).

**Rollback testing:** rollback blocks are not exercised in test (Liquibase rollback is a manual operator action via `liquibase rollback`); the rollback blocks are validated by Liquibase's XML parser at startup, which is sufficient for this spec.

**Reactive store consumer pattern:** N/A — schema-only spec, no frontend store touched.

---

## Notes for Plan Phase Recon

**Mandatory reads during `/plan-forums`:**

1. Master plan Decision 5 (line 700) for the verbatim schema — every column type and nullability MUST match.
2. `backend/src/main/resources/db/changelog/2026-04-23-001-create-users-table.xml` for the canonical changeset pattern — copy this structure faithfully (databaseChangeLog wrapper, changeSet id matching filename, named CHECK via `<sql>`, rollback block).
3. `backend/src/main/resources/db/changelog/master.xml` to confirm append-only ordering.
4. `backend/src/test/java/com/worshiproom/db/LiquibaseSmokeTest.java` for the smoke-test extension target — the assertion patterns for column existence, ordering, and CHECK rejection.
5. `backend/src/test/java/com/worshiproom/support/AbstractIntegrationTest.java` — the base class the smoke test extends (no changes needed; just confirm the singleton container model).
6. `.claude/rules/03-backend-standards.md` § Liquibase Standards — naming, rollback rule, ON DELETE CASCADE rule.
7. `.claude/rules/05-database.md` § Canonical Table Registry Phase 2 — confirms the five tables ARE the canonical names.
8. `.claude/rules/06-testing.md` § Testcontainers Setup Pattern — the singleton container shape this test relies on.

**Pre-execution verification:** Docker running, Postgres container up. The test suite uses Testcontainers (auto-starts its own container). For `./mvnw spring-boot:run` to apply the migrations against the dev database, the docker-compose Postgres container must be running.

**Plan size expectation:** 8–11 steps. If the plan comes back with 15+ steps or proposes JPA entities, services, controllers, the activity endpoint, `openapi.yaml` edits, or any code beyond changesets and the smoke test, push back hard — those are explicit guardrail violations. See "Out of Scope" below.

---

## Out of Scope

- JPA entities for any of the five tables (Specs 2.2–2.6 introduce them as needed)
- Repositories, services, controllers (Specs 2.2–2.6)
- The `POST /api/v1/activity` endpoint (Spec 2.6)
- Faith points calculation logic (Spec 2.2)
- Streak state machine logic (Spec 2.3)
- Badge eligibility logic (Spec 2.4)
- Activity counts logic (Spec 2.5)
- Frontend dual-write wiring (Spec 2.7)
- Drift-detection test (Spec 2.8)
- OpenAPI spec updates (no endpoint yet)
- Sentry tagging for activity-engine errors (no errors yet)
- Index tuning beyond the two on `activity_log` (future spec when `pg_stat` shows real query patterns)
- Indexes on `source_feature`, `activity_type` joins, etc. (premature; defer until real queries exist)
- Soft-delete semantics for `activity_log` (CASCADE is the decision; future spec can add `is_deleted` columns if needed)
- Materialized views or aggregations
- Partitioning `activity_log` by date (premature; defer until table size warrants it)
- Triggers, stored procedures, views
- Backfill of historical activity from localStorage (Spec 2.10)

---

## Guardrails (DO NOT)

- Do NOT change branches. Stay on `forums-wave-continued`.
- Do NOT modify `frontend/**` anywhere.
- Do NOT modify any existing changeset XML file. They are immutable once shipped (their MD5 is in `DATABASECHANGELOG`).
- Do NOT reorder existing `<include>` entries in `master.xml`.
- Do NOT introduce JPA entities, repositories, services, or controllers — those are Specs 2.2–2.6.
- Do NOT add the `POST /api/v1/activity` endpoint — Spec 2.6.
- Do NOT modify `SecurityConfig`, `CorsConfig`, `SecurityHeadersConfig`, `SentryConfig`, or any other config from Phase 1.
- Do NOT modify `openapi.yaml` — no endpoint exists yet.
- Do NOT add indexes beyond the two on `activity_log` specified in Architectural Decision #5. Index tuning is its own future spec; over-indexing is its own anti-pattern.
- Do NOT add triggers, stored procedures, materialized views, or partitioning.
- Do NOT modify any test outside `LiquibaseSmokeTest`.
- Do NOT commit, push, or do any git operation. Eric handles all git.
- Do NOT touch `_forums_master_plan/spec-tracker.md`.
- Do NOT add Liquibase contexts to these new changesets (they should run in dev, test, AND prod — same as the existing users-table changeset).

---

## Universal Rules Applied (per master plan Phase 0 § Universal Spec Rules)

- **Rule 3 (UUID primary keys):** every table satisfies — `activity_log.id`, and the user-id-keyed PKs on the other four (composite PKs include UUID `user_id`).
- **Rule 4 (OpenAPI single source of truth):** N/A — no endpoint added.
- **Rule 12 (Anti-pressure copy):** N/A — no user-facing text.
- **Rule 13 (Crisis detection supersession):** N/A — no user input flow.
- **Rule on Liquibase ON DELETE CASCADE for user-child tables** (Decision 10 rule 8): all five FKs satisfy.
- **Rule on test infrastructure** (Spec 1.7): `LiquibaseSmokeTest` extends `AbstractIntegrationTest`; new tests stay in that class and inherit the singleton-container pattern.

---

## Out-of-Band Notes for Eric

- Phase 2's first spec. Backend code is back in the picture after the recent run of doc/content specs (Spec 1.10g/h/i/j/l/m).
- Master plan Decision 5 is THE authoritative schema source. CC must read it during recon — this spec intentionally doesn't reproduce the full schema body to avoid drift.
- After Spec 2.1 ships, Specs 2.2–2.6 layer in the actual business logic. Each one is independent and stackable. Spec 2.7 (Frontend dual-write) is the cutover bridge.
- **Pre-execution checklist:** Docker running, Postgres container up. The test suite needs Testcontainers (which auto-starts its own container) but for `./mvnw spring-boot:run` to apply the migrations against your dev database, your docker-compose Postgres container must be running.
- Today's date is 2026-04-26; the changeset filename date is 2026-04-25 because that's when this brief was authored. Once the changesets land in `DATABASECHANGELOG` their filename is permanent — the +1-day stale date is harmless and the alternative (renaming five files post-merge) is forbidden.
- The seven CHECK constraint names are deliberately verbose. Future-you in three years grepping a Sentry stack trace for `streak_state_grace_days_used_nonneg_check` will thank present-you.
