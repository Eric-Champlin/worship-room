# Forums Wave: Spec 1.3 — Liquibase Integration and First Changeset

**Master Plan Reference:** `_forums_master_plan/round3-master-plan.md` → Spec 1.3
**Branch:** `claude/forums/round3-forums-wave`
**Date:** 2026-04-23

---

## Affected Frontend Routes

N/A — backend-only spec. No frontend code touched. `/verify-with-playwright` should be skipped.

---

### Spec 1.3 — Liquibase Integration and First Changeset

- **ID:** `round3-phase01-spec03-liquibase-setup`
- **Phase:** 1 — Backend Foundation
- **Size:** M
- **Risk:** Low
- **Prerequisites:** Spec 1.2 (PostgreSQL via Docker Compose) ✅
- **Goal:** Wire Liquibase into the backend so schema changes are managed via versioned changesets. Land the first changeset creating the `users` table per the canonical schema from Architectural Decision 3 (excluding `username`, which arrives via Phase 8.1's 3-step add+backfill+constrain sequence). Add a smoke test that confirms the table exists after migration.

---

## Approach

Add `org.liquibase:liquibase-core` to `backend/pom.xml`. Spring Boot auto-configures Liquibase when it sees the dependency on the classpath — no extra configuration class needed. Add `spring.liquibase.change-log=classpath:db/changelog/master.xml` and `spring.liquibase.enabled=true` to the base `application.properties` (not dev-only — Liquibase runs in every environment including prod).

Create the master changelog at `backend/src/main/resources/db/changelog/master.xml`. This file includes sub-changelogs in chronological order via `<include file="..."/>` directives. New changesets in future specs append to this master — never edit existing includes.

Create the first changeset: `backend/src/main/resources/db/changelog/2026-04-23-001-create-users-table.xml`. Filename uses today's date (the master plan's `2026-04-14-001` example is stale — use today's actual date per `03-backend-standards.md` naming convention).

The changeset creates the `users` table with columns from Decision 3, explicitly excluding `username` (per acceptance criterion — that column arrives via Phase 8.1 to demonstrate the additive migration pattern). Include a `<rollback>` block with `<dropTable tableName="users"/>` since this is a simple creation.

Add `backend/src/test/java/com/worshiproom/db/LiquibaseSmokeTest.java` — a Testcontainers-backed integration test that applies all changesets against a fresh PostgreSQL container and asserts the `users` table exists with the expected columns. This test is NET-NEW and establishes the pattern future schema specs will follow. It does NOT extend `AbstractIntegrationTest` (that class arrives in Spec 1.7) — instead, it uses `@Testcontainers` + `@SpringBootTest` directly with a minimal test configuration. When Spec 1.7 lands, `LiquibaseSmokeTest` will be refactored to extend the new base class.

## Files to create

- `backend/src/main/resources/db/changelog/master.xml` — master changelog, imports sub-changelogs in order
- `backend/src/main/resources/db/changelog/2026-04-23-001-create-users-table.xml` — first changeset; creates `users` table per Decision 3 (minus `username`)
- `backend/src/test/java/com/worshiproom/db/LiquibaseSmokeTest.java` — Testcontainers smoke test confirming the migration applies cleanly and `users` table exists

## Files to modify

- `backend/pom.xml` — add `org.liquibase:liquibase-core` (version managed by Spring Boot BOM). Also add Testcontainers dependencies for the smoke test: `org.testcontainers:testcontainers`, `org.testcontainers:postgresql`, `org.testcontainers:junit-jupiter` (all test scope; versions managed by Spring Boot BOM).
- `backend/src/main/resources/application.properties` — add `spring.liquibase.change-log=classpath:db/changelog/master.xml` and `spring.liquibase.enabled=true`. This goes in the BASE properties file so Liquibase runs in dev, test, and prod identically. Do NOT put it in `application-dev.properties` — that would skip migrations in prod.

## Database changes

Creates the `users` table per the canonical Decision 3 schema (minus `username`). Final column set for this changeset:

| Column | Type | Constraints | Source | Notes |
|---|---|---|---|---|
| `id` | UUID | PRIMARY KEY, NOT NULL, DEFAULT `gen_random_uuid()` | Decision 3 + 05-database.md "every table must have UUID PK" | Generated server-side at registration |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL | Decision 3 | Unique constraint is case-sensitive at DB level; case-insensitive email matching is handled at the application layer |
| `password_hash` | VARCHAR(255) | NOT NULL | Decision 3 | BCrypt output fits in 60 chars; 255 gives headroom for future algorithm changes |
| `first_name` | VARCHAR(100) | NOT NULL | Decision 3 | Collected at registration |
| `last_name` | VARCHAR(100) | NOT NULL | Decision 3 | Collected at registration |
| `display_name_preference` | VARCHAR(20) | NOT NULL, DEFAULT `'first_only'`, CHECK IN (`'first_only'`, `'first_last_initial'`, `'first_last'`, `'custom'`) | Decision 3 | CHECK constraint per `03-backend-standards.md` convention for enum-like VARCHAR columns |
| `custom_display_name` | VARCHAR(100) | NULL | Decision 3 | Only populated when `display_name_preference='custom'`; application layer enforces this invariant |
| `avatar_url` | VARCHAR(500) | NULL | Decision 3 | |
| `bio` | TEXT | NULL | Decision 3 | |
| `favorite_verse_reference` | VARCHAR(50) | NULL | Decision 3 | e.g., `"John 3:16"` |
| `favorite_verse_text` | TEXT | NULL | Decision 3 | |
| `is_admin` | BOOLEAN | NOT NULL, DEFAULT `false` | Decision 3 | Seeded via `ADMIN_EMAIL` env var in Spec 1.10 |
| `is_banned` | BOOLEAN | NOT NULL, DEFAULT `false` | Decision 3 | |
| `is_email_verified` | BOOLEAN | NOT NULL, DEFAULT `false` | Decision 3 | **See Notes-for-plan-phase recon item #3 — this column's relationship to Spec 1.5d's `email_verified_at` TIMESTAMP needs a decision** |
| `joined_at` | TIMESTAMP | NOT NULL, DEFAULT `NOW()` | Decision 3 | Distinct from `created_at`; `joined_at` is the user-facing "member since" date while `created_at` is the row audit timestamp |
| `last_active_at` | TIMESTAMP | NULL | Decision 3 | Updated by authenticated request filter (Spec 1.4+) |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT `NOW()` | 05-database.md "every table must have" rule | |
| `updated_at` | TIMESTAMP | NOT NULL, DEFAULT `NOW()` | 05-database.md "every table must have" rule | Application sets on update; trigger NOT required for this spec |
| `is_deleted` | BOOLEAN | NOT NULL, DEFAULT `false` | Decision 3 | Soft-delete per Spec 10.11 account-deletion flow |
| `deleted_at` | TIMESTAMP | NULL | Decision 3 | Set when `is_deleted` flips true |

**Indexes in this changeset:**

- Implicit unique index on `email` (from the UNIQUE constraint — no explicit CREATE INDEX needed; PostgreSQL creates it automatically)
- Implicit primary key index on `id`

**Explicitly NOT in this changeset:**

- `username` column (per acceptance criterion — arrives via Phase 8.1 3-changeset sequence: nullable-add → backfill → NOT-NULL-constrain; demonstrates the additive migration pattern)
- `terms_version`, `privacy_version` columns (per v2.8 Spec 1.10f — ToS consent tracking; that spec is the sole authority for those columns)
- `email_verified_at` TIMESTAMP (per v2.8 Spec 1.5d — email verification flow; see Notes-for-plan-phase recon item #3 for how this interacts with the boolean `is_email_verified` in Decision 3)
- Foreign key indexes to `users.id` (none exist yet — other tables with FK-to-users arrive in Phases 2 / 2.5 / 3)

**Rollback:** `<dropTable tableName="users"/>` — sufficient for initial table creation.

**Migration safety:** Zero-downtime compatible trivially — this is the first changeset, no existing data or running application to worry about.

## API changes

None — infrastructure spec. Auth endpoints and `/api/v1/users/me` arrive in Specs 1.5 and 1.6.

## Copy Deck

No user-facing copy in this spec.

## Anti-Pressure Copy Checklist

- [x] No FOMO language (N/A — no new copy)
- [x] No shame language (N/A — no new copy)
- [x] No exclamation points near vulnerability (N/A — no new copy)
- [x] No streak-as-shame messaging (N/A — no new copy)
- [x] No comparison framing (N/A — no new copy)
- [x] Scripture as gift, not decoration (N/A — no scripture in this spec)

## Anti-Pressure Design Decisions

N/A — infrastructure-only spec with no user-visible surface.

## Acceptance criteria

- [ ] `backend/pom.xml` includes `org.liquibase:liquibase-core` (runtime dependency, Spring Boot BOM version) and Testcontainers dependencies (test scope)
- [ ] `backend/src/main/resources/application.properties` sets `spring.liquibase.change-log=classpath:db/changelog/master.xml` and `spring.liquibase.enabled=true` — placed in BASE properties (not dev-only)
- [ ] `backend/src/main/resources/db/changelog/master.xml` exists and includes `2026-04-23-001-create-users-table.xml` via `<include file="..."/>` directive
- [ ] `backend/src/main/resources/db/changelog/2026-04-23-001-create-users-table.xml` exists with:
  - [ ] `<changeSet id="2026-04-23-001-create-users-table" author="worship-room">` matching the filename
  - [ ] All 20 columns from Decision 3 (minus `username`) with correct types, nullability, defaults, and CHECK constraints as enumerated in the Database Changes table above
  - [ ] `<rollback><dropTable tableName="users"/></rollback>` block
- [ ] `./mvnw spring-boot:run -Dspring-boot.run.profiles=dev` (with postgres up) applies the changeset automatically on startup — look for Liquibase INFO log lines `Reading from DATABASECHANGELOG` and `ChangeSet ... ran successfully`
- [ ] `psql -h localhost -U worshiproom -d worshiproom_dev -c '\d users'` confirms the `users` table exists with all expected columns and types
- [ ] `psql -h localhost -U worshiproom -d worshiproom_dev -c 'SELECT id, author, filename FROM databasechangelog;'` returns exactly one row for the first changeset
- [ ] Restarting the server (`./mvnw spring-boot:run` again) does NOT re-apply the changeset — Liquibase idempotency works as expected
- [ ] `./mvnw test` passes — 280 pre-existing tests still green + new `LiquibaseSmokeTest` passes (total should be 281)
- [ ] `LiquibaseSmokeTest.java` uses Testcontainers PostgreSQL (NOT H2 — per `06-testing.md` rule "Never use H2 for testing")
- [ ] `LiquibaseSmokeTest.java` asserts the `users` table exists AND asserts the column count matches 20 AND spot-checks 3-4 specific columns (`id`, `email`, `password_hash`, `display_name_preference`) for correct types and nullability
- [ ] `DATABASECHANGELOG` and `DATABASECHANGELOGLOCK` tables are created by Liquibase on first run (these are Liquibase's internal tables — their existence confirms Liquibase is wired correctly)
- [ ] `/api/v1/health` still returns `{"status":"UP"...}` with all three providers `configured: true` (no regression)
- [ ] `grep -iE 'aiza|key=|signature=' /tmp/backend.log` returns zero matches (dev-profile PII/key-leak suppressions still intact)

## Testing notes

**`LiquibaseSmokeTest.java` structure** — this test establishes the pattern for future schema specs. It is NOT a replacement for `AbstractIntegrationTest` (which arrives in Spec 1.7); it is a standalone, minimal integration test. When Spec 1.7 introduces `AbstractIntegrationTest`, this test should be refactored to extend it — flag as a follow-up in Spec 1.7's execution.

```java
package com.worshiproom.db;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Testcontainers
class LiquibaseSmokeTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
        .withDatabaseName("worshiproom_test")
        .withUsername("test")
        .withPassword("test");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void usersTableExistsAfterMigration() {
        List<Map<String, Object>> columns = jdbcTemplate.queryForList(
            "SELECT column_name, data_type, is_nullable FROM information_schema.columns " +
            "WHERE table_name = 'users' ORDER BY ordinal_position"
        );

        assertThat(columns).hasSize(20);
        assertThat(columns).extracting("column_name")
            .contains("id", "email", "password_hash", "first_name", "last_name",
                      "display_name_preference", "custom_display_name", "avatar_url", "bio",
                      "favorite_verse_reference", "favorite_verse_text",
                      "is_admin", "is_banned", "is_email_verified",
                      "joined_at", "last_active_at", "created_at", "updated_at",
                      "is_deleted", "deleted_at");
    }

    @Test
    void liquibaseChangelogRecordsChangeset() {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
            "SELECT id, author FROM databasechangelog"
        );
        assertThat(rows).hasSize(1);
        assertThat(rows.get(0).get("id")).isEqualTo("2026-04-23-001-create-users-table");
    }

    @Test
    void displayNamePreferenceCheckConstraintRejectsInvalidValues() {
        assertThatThrownBy(() ->
            jdbcTemplate.update(
                "INSERT INTO users (id, email, password_hash, first_name, last_name, " +
                "display_name_preference) VALUES (gen_random_uuid(), ?, ?, ?, ?, ?)",
                "test@example.com", "hash", "Test", "User", "invalid_value"
            )
        ).hasMessageContaining("check constraint"); // PostgreSQL error message
    }
}
```

**Test count expected:** 3 test methods minimum. More if CC wants to verify column types / defaults individually — acceptable growth, not mandatory.

**Manual verification steps** (CC should run as part of step-level verification):

1. `docker compose down -v && docker compose up -d postgres` — start from clean slate
2. `./mvnw spring-boot:run -Dspring-boot.run.profiles=dev` — look for Liquibase log lines, no errors
3. `psql -h localhost -U worshiproom -d worshiproom_dev -c '\d users'` — confirm schema matches Decision 3
4. `psql -h localhost -U worshiproom -d worshiproom_dev -c 'SELECT * FROM databasechangelog;'` — confirm changeset is recorded
5. `Ctrl-C` backend, restart with `./mvnw spring-boot:run -Dspring-boot.run.profiles=dev` — confirm zero changesets applied on second run
6. `./mvnw test` — all tests green including `LiquibaseSmokeTest`

**Fail-closed verification:** Stop postgres, attempt `./mvnw spring-boot:run`. Liquibase should fail to connect and the backend should fail to start (same fail-closed behavior established in Spec 1.2). After confirming, restart postgres and re-verify happy path.

## Notes for plan phase recon

1. **Changeset filename date.** The master plan shows `2026-04-14-001-create-users-table.xml` — that's stale. Today is 2026-04-23. Use today's date in the filename. Per `03-backend-standards.md`: `YYYY-MM-DD-NNN-description.xml` globally unique. Before creating the file, run `ls backend/src/main/resources/db/changelog/` — the directory doesn't exist yet (this spec creates it), so the first file is `2026-04-23-001-create-users-table.xml`. No collisions possible.
2. **Master changelog structure.** Use this template — the include ordering matters (alphabetical by filename via the YYYY-MM-DD-NNN prefix means chronological):

   ```xml
   <?xml version="1.0" encoding="UTF-8"?>
   <databaseChangeLog xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
     xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
     xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
       http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-latest.xsd">
     <include file="db/changelog/2026-04-23-001-create-users-table.xml"/>
   </databaseChangeLog>
   ```

3. **CRITICAL — resolve the `is_email_verified` naming mismatch between specs.** Decision 3 specifies `is_email_verified BOOLEAN NOT NULL DEFAULT FALSE` (a simple flag). Spec 1.5d (v2.8 addition) introduces `email_verified_at TIMESTAMP` (a nullable timestamp recording when verification happened). These overlap in intent but differ in representation. Two ways to reconcile:
   - **(A) Use Decision 3 as written:** create `is_email_verified BOOLEAN` in this changeset. Spec 1.5d later adds `email_verified_at TIMESTAMP` as a separate column, with `is_email_verified` flipping true when `email_verified_at` is non-null. Slightly redundant but matches Decision 3 verbatim.
   - **(B) Skip `is_email_verified` entirely and only create `email_verified_at` in Spec 1.5d:** cleaner schema long-term, but deviates from Decision 3. The boolean becomes derived: `email_verified_at IS NOT NULL`.
   - **Recommendation:** Go with (A) — Decision 3 is authoritative, and the boolean is trivially cheap. CC should note the future-reconciliation opportunity in the Execution Log but not deviate from Decision 3 here. If Eric wants option (B), flag before the changeset is written, not after.
4. **`gen_random_uuid()` vs Liquibase `UUID generator`.** PostgreSQL 13+ includes `gen_random_uuid()` natively (no extension needed as of PG 13). Use `DEFAULT gen_random_uuid()` in the changeset. If testing against older PG versions, the `pgcrypto` extension provides the same function — but we pinned `postgres:16-alpine` in Spec 1.2, so `gen_random_uuid()` is guaranteed.
5. **Testcontainers dependency declaration.** Spring Boot 3.x + Spring Boot BOM manages Testcontainers versions. The three needed for `LiquibaseSmokeTest`:

   ```xml
   <dependency>
       <groupId>org.testcontainers</groupId>
       <artifactId>testcontainers</artifactId>
       <scope>test</scope>
   </dependency>
   <dependency>
       <groupId>org.testcontainers</groupId>
       <artifactId>postgresql</artifactId>
       <scope>test</scope>
   </dependency>
   <dependency>
       <groupId>org.testcontainers</groupId>
       <artifactId>junit-jupiter</artifactId>
       <scope>test</scope>
   </dependency>
   ```

   No explicit `<version>` tags needed — Spring Boot BOM handles them.
6. **Liquibase config placement.** The `spring.liquibase.*` properties MUST go in the base `application.properties`, not `application-dev.properties`. Liquibase must run in all environments (dev, test, prod). If placed dev-only, prod deploys would skip migrations and the app would fail to start in prod. Verify placement before committing.
7. **`gen_random_uuid()` inside a Liquibase XML changeset.** The syntax is `defaultValueComputed="gen_random_uuid()"` — not `defaultValue`. Example column fragment:

   ```xml
   <column name="id" type="UUID" defaultValueComputed="gen_random_uuid()">
       <constraints primaryKey="true" nullable="false"/>
   </column>
   ```

8. **`CHECK` constraints in Liquibase XML.** Use `<sql>` or `<constraints checkConstraint="...">` — the exact syntax depends on Liquibase version. Spring Boot BOM pulls Liquibase 4.x, which supports:

   ```xml
   <column name="display_name_preference" type="VARCHAR(20)" defaultValue="first_only">
       <constraints nullable="false"/>
   </column>
   <!-- Add CHECK constraint separately: -->
   <sql>
       ALTER TABLE users ADD CONSTRAINT users_display_name_preference_check
       CHECK (display_name_preference IN ('first_only', 'first_last_initial', 'first_last', 'custom'));
   </sql>
   ```

   CC can also use Liquibase's `<addCheckConstraint>` change type if the version supports it — verify before writing.
9. **`TIMESTAMP` vs `TIMESTAMP WITH TIME ZONE`.** Decision 3 uses plain `TIMESTAMP`. PostgreSQL treats `TIMESTAMP` as timezone-naive and `TIMESTAMP WITH TIME ZONE` (alias `TIMESTAMPTZ`) as timezone-aware. The rules file in `03-backend-standards.md` changeset template uses `TIMESTAMP WITH TIME ZONE`. Use `TIMESTAMP WITH TIME ZONE` (TIMESTAMPTZ) for all timestamp columns — it prevents a class of DST/timezone bugs. Decision 3's plain `TIMESTAMP` should be read as shorthand; the actual convention (per rules file) is TIMESTAMPTZ. Flag before writing if you disagree.
10. **Spring Boot auto-config for Liquibase.** Once `liquibase-core` is on the classpath and `spring.liquibase.change-log` is set, Spring Boot runs Liquibase automatically on application startup, BEFORE the Spring context finishes initializing. No `@Bean` configuration needed. If CC adds a custom `LiquibaseConfig` class, that's over-engineering — remove it.
11. **Pre-flight baseline checks** (per Spec 1.1 lesson-learned):
    - `./mvnw test` passes 280/0/0 on current branch before starting
    - `docker compose up -d postgres` + `./mvnw spring-boot:run -Dspring-boot.run.profiles=dev` currently connects to postgres cleanly (Spec 1.2 verified this)
    - `/api/v1/health` returns all three providers `configured: true`
    - If any baseline is red, flag before attributing failures to this spec's work.
12. **`backend/src/test/java/com/worshiproom/db/` directory doesn't exist yet.** CC must create the `db/` test package. Per `03-backend-standards.md` package conventions, `db` as a subpackage is acceptable for infrastructure tests that don't fit into feature packages.

## Out of scope

- **JPA entity classes.** No `User.java` entity in this spec. The JPA entity arrives in Spec 1.4 or 1.5 when auth needs it. This spec is raw SQL schema only.
- **JPA repository classes.** No `UserRepository.java` — arrives with the entity.
- **`AbstractIntegrationTest` base class.** Arrives in Spec 1.7. `LiquibaseSmokeTest` stands alone for now and will be refactored later.
- **Liquibase contexts (`dev-seed.xml`, `test-seed.xml`).** Arrive in Spec 1.8 (or wherever the master plan schedules seed data). No contexts in this spec.
- **`username` column.** Arrives via Phase 8.1 3-changeset sequence (nullable-add → backfill → NOT-NULL-constrain). Deliberately out of scope here to demonstrate the additive migration pattern on a later spec.
- **`terms_version` / `privacy_version` columns.** Arrive in v2.8 Spec 1.10f (ToS consent). That spec is the sole authority for those columns.
- **`email_verified_at` TIMESTAMP column.** Arrives in v2.8 Spec 1.5d (email verification flow). This spec creates only the `is_email_verified BOOLEAN` per Decision 3 verbatim.
- **Production datasource configuration / env-var wiring.** Deferred to Spec 1.10b.
- **Database backup / restore procedures.** Deferred to Spec 1.10c / 1.10e.
- **Any index beyond the implicit PK + UNIQUE email.** Additional indexes arrive with the tables that join against `users.id` (Phase 2+).
- **Liquibase rollback orchestration beyond a single `dropTable`.** More complex rollback scenarios (e.g., data-preserving rollbacks) arrive when needed — this spec's simple creation doesn't justify them.

## Out-of-band notes for Eric

- **This is where your Liquibase work experience pays off.** The structure should feel very familiar. The master changelog + dated changesets + include-only-never-edit discipline is identical to what you use at Ramsey.
- **One Forums-Wave-specific wrinkle:** the `contexts/` directory pattern (for dev-only seed data, test-only fixtures) isn't in this spec — it arrives in Spec 1.8. The master changelog in this spec has no context filtering; everything it includes runs in every environment.
- **The `is_email_verified` vs `email_verified_at` naming mismatch is the most likely plan-contradiction CC will surface.** Decision 3 and Spec 1.5d use different representations. The Notes-for-plan-phase recon flags this explicitly and recommends Option A (honor Decision 3, let Spec 1.5d reconcile later). If CC picks a different path, it should stop and ask — this is a cross-spec decision, not a unilateral one.
- **The changeset filename date must be today's actual date (2026-04-23), not the master plan's stale `2026-04-14` example.** CC should double-check the filename before writing the changeset. A date mismatch doesn't break anything technically (Liquibase cares about the changeset ID, not the filename date), but it's a naming convention violation that future grepping depends on.
- **The Testcontainers dependencies in `pom.xml` are net-new.** They'll be reused by every future schema spec and by Spec 1.7's `AbstractIntegrationTest`. Adding them here is correct and not scope creep — the first integration test genuinely needs them.
- **Spring Boot auto-runs Liquibase on startup.** You'll see Liquibase log lines BEFORE the "Started WorshipRoomApplication" line because Liquibase completes before the Spring context finishes. If you see the startup message without any Liquibase log lines, something is wrong (most likely `spring.liquibase.enabled=false` or the master changelog path is broken).
- **If `./mvnw test` fails with `TestcontainersException: Could not find a valid Docker environment`, Docker Desktop isn't running.** Start it and re-run. Same failure mode as Spec 1.2.
- **Expect the test count to go from 280 → 281 (or 283 if CC writes all 3 test methods from the example).** Anything else is unexpected — investigate.
- **Spec 1.3b (Users Table Timezone Column) is the next spec after this one.** It adds a `timezone VARCHAR(50)` column via a separate changeset. The pattern established here (one changeset per logical change) makes Spec 1.3b straightforward.
