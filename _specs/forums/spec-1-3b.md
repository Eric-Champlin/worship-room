# Forums Wave: Spec 1.3b — Users Table Timezone Column

**Master Plan Reference:** `_forums_master_plan/round3-master-plan.md` → Spec 1.3b
**Branch:** `claude/forums/round3-forums-wave`
**Date:** 2026-04-23

---

## Affected Frontend Routes

N/A — backend schema-only spec. No frontend code touched. `/verify-with-playwright` should be skipped.

The master plan's "Settings UI" and "AuthModal timezone detection" requirements are explicitly deferred to the downstream specs that own those files (see Out-of-band notes).

---

### Spec 1.3b — Users Table Timezone Column

- **ID:** `round3-phase01-spec03b-users-timezone-column`
- **Phase:** 1 — Backend Foundation
- **Size:** **S** (schema-only per this spec's scope reduction; master plan's S sizing was for column-add work specifically, not full-stack wiring)
- **Risk:** Low
- **Prerequisites:** Spec 1.3 (Liquibase Integration and First Changeset) ✅
- **Goal:** Add a `timezone VARCHAR(50) NOT NULL DEFAULT 'UTC'` column to the `users` table via a second Liquibase changeset. Demonstrate the additive-migration pattern (one changeset per logical change) that Spec 1.3 foreshadowed. This column unblocks five downstream features — Night Mode, 3am Watch, Sunday Service Sync, liturgical theming, timezone-aware grace reset — all of which consume it in Phase 6+. Capturing the column now (even though nothing reads it yet) is strictly cheaper than retrofitting across five features later.

---

## Approach

Create a new Liquibase changeset at `backend/src/main/resources/db/changelog/2026-04-23-002-add-users-timezone-column.xml` that adds `timezone VARCHAR(50) NOT NULL DEFAULT 'UTC'` to the `users` table. The `DEFAULT 'UTC'` is load-bearing: any existing rows (e.g., from future dev-seed data) would fail the NOT NULL constraint on migration without a default value, which would crash Spring Boot on startup.

Update `backend/src/main/resources/db/changelog/master.xml` to include the new changeset AFTER the Spec 1.3 changeset — include order matters for chronological application.

Extend `LiquibaseSmokeTest.java` (created in Spec 1.3) with one new test method that confirms the `timezone` column exists, has type `VARCHAR(50)`, is `NOT NULL`, and has the default value `'UTC'`. Update the existing `usersTableExistsAfterMigration()` test to expect 21 columns instead of 20, and to include `timezone` in the column-names assertion.

**Explicitly out of scope in this phase:** JPA entity field on `User.java`, `RegisterRequest` DTO field, `UserResponse` DTO field, `AuthService` registration logic with timezone capture, `UserService` timezone update endpoint, `PATCH /api/v1/users/me` endpoint, frontend `AuthModal` browser-timezone detection, Settings page timezone autocomplete, Playwright end-to-end test. These all depend on code/routes/DTOs that don't yet exist on the current branch — they arrive in Specs 1.4 (Spring Security + JWT), 1.5 (Auth endpoints), 1.6 (Users/me endpoint), and later UI specs. Each of those downstream specs will wire up its portion of the master plan's original 1.3b scope. See Out-of-band notes for the handoff strategy.

## Files to create

- `backend/src/main/resources/db/changelog/2026-04-23-002-add-users-timezone-column.xml` — single-column addition with rollback block

## Files to modify

- `backend/src/main/resources/db/changelog/master.xml` — add `<include file="db/changelog/2026-04-23-002-add-users-timezone-column.xml"/>` AFTER the existing Spec 1.3 include
- `backend/src/test/java/com/worshiproom/db/LiquibaseSmokeTest.java` — update `usersTableExistsAfterMigration()` to assert 21 columns (was 20) and include `timezone` in the expected column-names list; add one new test method `timezoneColumnHasCorrectDefaultAndConstraints()` that verifies type, nullability, and default value

**Explicitly NOT modified in this spec** (will be modified by the downstream specs that own these files when they arrive):

- `backend/src/main/java/com/worshiproom/user/User.java` — JPA entity doesn't exist yet; will be created in Spec 1.4 or 1.5. That spec will include the `timezone` field at creation time.
- `backend/src/main/java/com/worshiproom/auth/dto/RegisterRequest.java` — DTO doesn't exist yet; will be created in Spec 1.5 (Auth endpoints). That spec will include the optional `timezone` field at creation time, with browser-detected timezone from the frontend.
- `backend/src/main/java/com/worshiproom/user/dto/UserResponse.java` — DTO doesn't exist yet; will be created in Spec 1.6 (User Me Endpoint). That spec will include `timezone` in the response shape at creation time.
- `backend/src/main/java/com/worshiproom/auth/AuthService.java` — doesn't exist yet; will be created in Spec 1.5. That spec will include timezone capture on register with UTC fallback.
- `backend/src/main/java/com/worshiproom/user/UserService.java` — doesn't exist yet; will be created in Spec 1.6. A dedicated downstream spec (or Spec 1.6 itself) will add the timezone update endpoint logic and `ZoneId.of()` validation.
- `frontend/src/components/prayer-wall/AuthModal.tsx` — will be updated in Spec 1.5's frontend wiring to send browser-detected timezone on register. Don't modify here.
- `frontend/src/pages/Settings.tsx` or equivalent — timezone autocomplete UI arrives in a dedicated Settings spec (likely Phase 1.10 or Phase 8). Don't modify here.

## Database changes

Adds one column to `users`:

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `timezone` | VARCHAR(50) | NOT NULL, DEFAULT `'UTC'` | IANA timezone string (e.g., `'America/Chicago'`, `'Europe/London'`, `'Asia/Tokyo'`). 50 chars is safely above the longest IANA zone name (`'America/Argentina/ComodRivadavia'` = 31 chars). |

**Liquibase changeset structure:**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
    http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-latest.xsd">

  <changeSet id="2026-04-23-002-add-users-timezone-column" author="worship-room">
    <addColumn tableName="users">
      <column name="timezone" type="VARCHAR(50)" defaultValue="UTC">
        <constraints nullable="false"/>
      </column>
    </addColumn>
    <rollback>
      <dropColumn tableName="users" columnName="timezone"/>
    </rollback>
  </changeSet>
</databaseChangeLog>
```

**Rollback:** `<dropColumn>` is safe because the default means no data loss for existing rows (all rows will have `'UTC'` or a user-set value; dropping the column simply removes that metadata — it doesn't orphan foreign keys or break existing queries).

**Migration safety:** Zero-downtime compatible. Adding a NOT NULL column WITH a default value is safe in PostgreSQL 11+ (the default is stored as metadata, not rewritten across every row) — no table rewrite, no lock escalation. PostgreSQL 16 (our pinned version in Spec 1.2) handles this optimally.

## API changes

None in this spec. The column is added to the schema only; no endpoint yet reads or writes it. Downstream specs in the phase (1.5, 1.6) introduce the endpoints that consume it.

## Copy Deck

No user-facing copy in this spec.

**Deferred copy** (will land with the downstream specs that own the UI):

- Settings label: `"Timezone"` — deferred to Settings spec
- Settings helper text: `"We use this to know when your day starts and ends."` — deferred to Settings spec
- Invalid timezone error: `"That timezone isn't one we recognize. Try picking from the list."` — deferred to Settings spec
- Registration: no user-facing copy (silent auto-detection) — deferred to Spec 1.5 frontend wiring

## Anti-Pressure Copy Checklist

- [x] No FOMO language (N/A — no copy in this spec)
- [x] No shame language (N/A — no copy in this spec)
- [x] No exclamation points near vulnerability (N/A — no copy in this spec)
- [x] No streak-as-shame messaging (N/A — no copy in this spec)
- [x] No comparison framing (N/A — no copy in this spec)
- [x] Scripture as gift, not decoration (N/A — no scripture in this spec)

## Anti-Pressure Design Decisions

The master plan's anti-pressure consideration — *"Streak is NOT broken by a timezone change alone. The streak service treats any same-calendar-date activity in the user's CURRENT timezone as continuing the streak, even if the stored last_active_date was recorded in a different timezone"* — is noted for the record but NOT implemented in this spec. The streak service doesn't exist yet (Phase 2). The timezone-aware streak preservation logic will be implemented when the streak service is built or migrated. **Flag this forward** when Phase 2 streak work lands — the streak service spec must explicitly honor this rule.

## Acceptance criteria

- [ ] `backend/src/main/resources/db/changelog/2026-04-23-002-add-users-timezone-column.xml` exists with:
  - [ ] `<changeSet id="2026-04-23-002-add-users-timezone-column" author="worship-room">` matching the filename
  - [ ] `<addColumn>` element adding `timezone VARCHAR(50)` to `users` with `defaultValue="UTC"` and `nullable="false"`
  - [ ] `<rollback><dropColumn .../></rollback>` block
- [ ] `master.xml` includes the new changeset AFTER `2026-04-23-001-create-users-table.xml` (chronological order)
- [ ] `./mvnw spring-boot:run -Dspring-boot.run.profiles=dev` (with postgres up AND the users table already created from Spec 1.3) applies the changeset on startup — Liquibase logs `ChangeSet ... ran successfully`
- [ ] `psql -h localhost -U worshiproom -d worshiproom_dev -c '\d users'` shows the `timezone` column with type `character varying(50)`, `not null`, default `'UTC'`
- [ ] `psql -h localhost -U worshiproom -d worshiproom_dev -c "SELECT id, filename FROM databasechangelog ORDER BY orderexecuted;"` returns exactly 2 rows, in order: `2026-04-23-001-create-users-table`, `2026-04-23-002-add-users-timezone-column`
- [ ] Restarting the server does NOT re-apply the changeset (idempotency)
- [ ] `./mvnw test` passes — 283 pre-existing tests still green, plus the updated `LiquibaseSmokeTest` (total should remain 283 if the new test method replaces a prior one's scope, or grow to 284 if the new method is truly additive — acceptable either way)
- [ ] `LiquibaseSmokeTest.usersTableExistsAfterMigration()` asserts 21 columns (updated from 20) and includes `timezone` in the expected column-names list
- [ ] New test method `timezoneColumnHasCorrectDefaultAndConstraints()` asserts:
  - [ ] Column `timezone` exists
  - [ ] Data type is `character varying` (PostgreSQL's internal name for VARCHAR)
  - [ ] Character maximum length is 50
  - [ ] `IS NULLABLE` is `'NO'`
  - [ ] `COLUMN DEFAULT` string contains `'UTC'` (PostgreSQL may surface it as `'UTC'::character varying` — substring match is sufficient)
- [ ] `/api/v1/health` still returns `{"status":"UP"...}` with all three providers `configured: true` (no regression)
- [ ] `grep -iE 'aiza|key=|signature=' /tmp/backend.log` returns zero matches (dev-profile PII/key-leak suppressions still intact)
- [ ] `application-dev.properties` unchanged from pre-spec state (diff confirms byte-for-byte identical to pre-1.3b commit — no accidental touches)

## Testing notes

**Test updates expected to `LiquibaseSmokeTest.java`:**

```java
// UPDATED test — column count changes from 20 to 21
@Test
void usersTableExistsAfterMigration() {
    List<Map<String, Object>> columns = jdbcTemplate.queryForList(
        "SELECT column_name, data_type, is_nullable FROM information_schema.columns " +
        "WHERE table_name = 'users' ORDER BY ordinal_position"
    );

    assertThat(columns).hasSize(21); // was 20
    assertThat(columns).extracting("column_name")
        .contains("id", "email", "password_hash", "first_name", "last_name",
                  "display_name_preference", "custom_display_name", "avatar_url", "bio",
                  "favorite_verse_reference", "favorite_verse_text",
                  "is_admin", "is_banned", "is_email_verified",
                  "joined_at", "last_active_at", "created_at", "updated_at",
                  "is_deleted", "deleted_at",
                  "timezone"); // added
}

// UPDATED test — expect 2 changesets now
@Test
void liquibaseChangelogRecordsChangeset() {
    List<Map<String, Object>> rows = jdbcTemplate.queryForList(
        "SELECT id FROM databasechangelog ORDER BY orderexecuted"
    );
    assertThat(rows).hasSize(2);
    assertThat(rows.get(0).get("id")).isEqualTo("2026-04-23-001-create-users-table");
    assertThat(rows.get(1).get("id")).isEqualTo("2026-04-23-002-add-users-timezone-column");
}

// NEW test — specific to this spec's column addition
@Test
void timezoneColumnHasCorrectDefaultAndConstraints() {
    Map<String, Object> col = jdbcTemplate.queryForMap(
        "SELECT data_type, character_maximum_length, is_nullable, column_default " +
        "FROM information_schema.columns " +
        "WHERE table_name = 'users' AND column_name = 'timezone'"
    );

    assertThat(col.get("data_type")).isEqualTo("character varying");
    assertThat(col.get("character_maximum_length")).isEqualTo(50);
    assertThat(col.get("is_nullable")).isEqualTo("NO");
    assertThat(col.get("column_default").toString()).contains("UTC");
}
```

**Manual verification steps** (CC should run as part of step-level verification):

1. Before starting: confirm Spec 1.3's changeset is on disk and `master.xml` already includes it (sanity check against the current branch state)
2. `docker compose down -v && docker compose up -d postgres` — start from clean slate
3. `./mvnw spring-boot:run -Dspring-boot.run.profiles=dev` — look for BOTH changesets applying in order (1.3's `create-users-table` first, then this spec's `add-users-timezone-column`). Zero errors.
4. `psql -h localhost -U worshiproom -d worshiproom_dev -c '\d users'` — confirm the new column is present with the right shape
5. `psql -h localhost -U worshiproom -d worshiproom_dev -c 'SELECT id, filename FROM databasechangelog ORDER BY orderexecuted;'` — confirm both changesets are recorded in order
6. `Ctrl-C` backend, restart — confirm zero changesets applied on second run (both are already in `databasechangelog`)
7. `./mvnw test` — all tests green including the updated + new `LiquibaseSmokeTest` assertions

## Notes for plan phase recon

1. **Changeset filename date + sequence.** Master plan suggests `2026-04-14-003`. Both are stale. Today is 2026-04-23, and Spec 1.3's changeset was `2026-04-23-001`. This spec is the SECOND changeset of the same day → filename is `2026-04-23-002-add-users-timezone-column.xml`. Sequence numbers increment within a date; dates don't advance just because a new spec is being written. Verify no collision by `ls backend/src/main/resources/db/changelog/` — expect only `2026-04-23-001-create-users-table.xml` + `master.xml` to be present.
2. **`master.xml` include ordering.** Must be chronological — earlier dates/sequences first. The new `<include>` line goes AFTER the existing `2026-04-23-001-create-users-table.xml` include. Liquibase applies in the order it encounters includes; out-of-order includes WILL cause subtle bugs down the line when changesets have dependencies on earlier ones. Preserve order discipline from this changeset onward.
3. **Additive-migration pattern reference.** The master plan called out Spec 1.3b as the reference implementation for the additive-migration pattern. Keep the changeset clean and minimal so future contributors (and Eric) can use it as a template: one changeset file = one logical change = one `<addColumn>` (or analogous) + one `<rollback>`. If the plan author is tempted to batch other schema fixes into this changeset, decline — separate changesets per logical change is the convention per `03-backend-standards.md` Liquibase Standards.
4. **Scope discipline — recon contract.** Re-read this spec's Out-of-band notes carefully. The master plan's spec text for 1.3b includes full-stack wiring (User entity, DTOs, services, AuthModal, Settings page, Playwright) that references code not yet on disk. The plan MUST stay schema-only. If the plan author finds themselves writing Implementation Steps that modify files outside `backend/src/main/resources/db/changelog/` or `LiquibaseSmokeTest.java`, stop — the plan has drifted from the spec's scope. The downstream consumption work is owned by Specs 1.4, 1.5, 1.6, and later Settings / Phase 2 specs.
5. **`LiquibaseSmokeTest.java` deviation from Spec 1.3.** Spec 1.3's version of the `usersTableExistsAfterMigration()` test hardcoded `hasSize(20)` and an exact column list. That list is now stale as of this spec. The updated test must reflect the new 21-column state. This is expected test evolution, not a regression — the test's job is to mirror the current schema, not freeze the schema.
6. **PostgreSQL 11+ is required for `ADD COLUMN NOT NULL DEFAULT <constant>` without a table rewrite.** Spec 1.2 pinned `postgres:16-alpine`, which satisfies this comfortably. No action needed; just a data point if CC needs to justify the migration-safety claim.
7. **VARCHAR(50) rationale.** Longest IANA timezone name is `'America/Argentina/ComodRivadavia'` at 31 chars. 50 is safely above that with headroom for any future IANA additions. Don't second-guess to 30 or go wild to 200; 50 matches the master plan.
8. **`defaultValue="UTC"` in Liquibase XML.** The Liquibase `defaultValue` attribute is a string value (not a SQL expression). `"UTC"` will be quoted correctly by Liquibase when generating the SQL. Do NOT use `defaultValueComputed="'UTC'"` — that's for SQL expressions like `gen_random_uuid()`.
9. **`LiquibaseSmokeTest` expected test count.** The spec's acceptance criteria allow for either 283 (if the new test method coexists with updated existing methods) or 284 (if it's purely additive). CC should pick the approach that keeps the test suite clean — likely 284 total (adding one method while updating two existing ones). Document the actual count in the Execution Log.
10. **Pre-flight baseline checks** (per Spec 1.1 lesson-learned):
    - `./mvnw test` passes 283/0/0 on current branch before starting
    - `docker compose up -d postgres` + `./mvnw spring-boot:run -Dspring-boot.run.profiles=dev` currently applies Spec 1.3's changeset and starts cleanly
    - `psql ... \d users` shows the 20-column users table from Spec 1.3
    - `/api/v1/health` returns all three providers `configured: true`
    - If any baseline is red, flag before attributing failures to this spec's work.
11. **Spec 1.1 regression lesson applied:** CC's step-by-step verification should NOT test `./mvnw test` after ONLY adding the changeset file but before updating `master.xml` include. Between those two sub-steps, Liquibase would try to run against an unknown changeset OR skip the changeset entirely, depending on include order. Treat "create changeset file" + "update master.xml include" as an atomic unit, verify tests only after both complete. Same atomic-unit discipline we hit in Spec 1.3 with Spring Boot auto-config.

## Out of scope

- **JPA entity `User.java`.** Will be created in Spec 1.4 (Spring Security + JWT Setup) or Spec 1.5 (Auth endpoints). That spec will include the `timezone` field from creation, not retrofit it.
- **`RegisterRequest` DTO timezone field.** Will be created in Spec 1.5 (Auth endpoints). That spec will add the optional `timezone` field at creation time with browser auto-detection wiring on the frontend.
- **`UserResponse` DTO timezone field.** Will be created in Spec 1.6 (User Me Endpoint). That spec will include `timezone` in the response shape at creation time.
- **`AuthService` timezone capture with UTC fallback.** Will be implemented in Spec 1.5. UTC fallback policy (silent on register, validation error on settings update) is documented in the master plan for reference.
- **`UserService` timezone update endpoint.** Will be implemented in Spec 1.6 or a dedicated Settings spec. `ZoneId.of()` validation wrapper lives here when that spec lands.
- **`PATCH /api/v1/users/me` endpoint.** Will be implemented in Spec 1.6 or dedicated Settings spec. Master plan specifies stricter validation here (400 INVALID_INPUT on bad IANA string) — honor that when the endpoint ships.
- **Frontend `AuthModal` browser timezone detection.** Will be wired in Spec 1.5's frontend portion. Uses `Intl.DateTimeFormat().resolvedOptions().timeZone`.
- **Settings page timezone autocomplete.** Will be implemented in a dedicated Settings spec (likely Phase 1.10 or Phase 8). Master plan recommends `react-select` + `Intl.supportedValuesOf('timeZone')` — no `moment-timezone` dependency needed.
- **Playwright end-to-end test for browser-timezone round-trip.** Will be added in Spec 1.5's frontend portion alongside the AuthModal changes.
- **Timezone-aware streak preservation logic.** Streak service doesn't exist yet; arrives in Phase 2. That spec must honor the "streak is not broken by timezone change alone" rule — flag forward.
- **DST transition handling.** Relies on Java's `ZoneId` (handled correctly by default). No action in this spec.
- **Retroactive streak recomputation on timezone change.** Deferred to a dedicated future spec. MVP is streak preservation, not backfill.
- **Dev-seed users' timezone defaults.** No dev-seed data exists yet. When seed data is added in Spec 1.8 (or wherever contexts land), the seed script will explicitly set `timezone='UTC'` for test determinism.

## Out-of-band notes for Eric

- **The master plan conflated two different concerns in Spec 1.3b.** It listed the column addition (schema-only, belongs in Phase 1.3 territory) alongside the full-stack wiring to consume it (User entity, DTOs, services, AuthModal, Settings page, Playwright). The wiring touches files that don't exist yet — `AuthService.java`, `UserService.java`, `User.java`, `UserResponse.java`, `AuthModal.tsx`'s real-auth wiring, the Settings page. Those files arrive in Specs 1.4 / 1.5 / 1.6 / 1.10+ / dedicated Settings spec. Doing the wiring now would mean inventing the entire auth stack ahead of schedule — which breaks the phase's step-by-step layering.
- **The scope reduction applied here:** this spec adds ONLY the schema column. The master plan's wiring requirements are re-homed to the downstream specs that own each touched file. The Out-of-scope section above is the canonical handoff list. When each downstream spec is written, verify that spec includes the timezone-wiring portion the master plan originally bundled here.
- **Why this is the right call (not scope creep the other direction):** The downstream specs are going to create `User.java`, `RegisterRequest`, `UserResponse`, etc. from scratch anyway. Creating them in 1.3b with a timezone field, then deleting and re-creating them in 1.4/1.5 with the real structure, is wasted churn. The additive-migration pattern we're demonstrating applies to SCHEMA, not code — code gets written once in the spec that owns it, with the full shape from day one.
- **What to do when Specs 1.4, 1.5, 1.6 are written:** Each of those specs needs an explicit "include `timezone` field" line item in its Files-to-modify section. I'll add that as a Notes-for-plan-phase recon item when I write each of those specs, so nothing falls through the cracks. If you notice me writing Spec 1.5 without a timezone-field bullet in the RegisterRequest DTO, flag it.
- **The additive-migration pattern is what's being demonstrated, independently of the wiring.** Spec 1.3 deliberately excluded `username` from the initial users table so that Phase 8.1 could demonstrate the 3-step add-nullable-then-backfill-then-constrain sequence. Spec 1.3b adds `timezone` via a separate changeset to demonstrate the simplest additive case (single column, NOT NULL + default, one changeset). Together they establish the pattern library future schema specs will draw from.
- **VARCHAR(50) is the right size.** Don't let CC or any plan author push to 100 "just in case" — the IANA database is well-characterized and 50 is plenty. Going bigger wastes row space (trivially) but more importantly weakens the signal of what shape we expect the data to take.
- **This is the shortest spec in Phase 1 by a wide margin.** One changeset file, one `master.xml` include line, two test updates. Expected effort: under an hour of CC time including verification. If CC's plan runs longer than that, something has drifted.
- **If you want the full-stack version instead:** stop before pasting into `/spec-forums` and tell me. I'll rewrite as a multi-spec bundle (1.3b-schema + forward-reference stubs for 1.4/1.5/1.6 that each own their portion). But I strongly recommend schema-only here — it keeps the Phase 1 layering clean.
