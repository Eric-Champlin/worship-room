# Forums Wave: Spec 1.8 — Dev Seed Data

**Master Plan Reference:** `_forums_master_plan/round3-master-plan.md` → Spec 1.8
**Branch:** `claude/forums/round3-forums-wave`
**Date:** 2026-04-23

---

## Affected Frontend Routes

N/A — backend-only spec. No frontend code touched. No API changes. No runtime behavior change at the HTTP layer. `/verify-with-playwright` should be skipped.

The seed users this spec creates will be consumed by Spec 1.9 (Frontend AuthContext JWT Migration) once the frontend is wired to the real backend, but 1.8 itself ships zero frontend work.

---

## Spec 1.8 — Dev Seed Data

- **ID:** `round3-phase01-spec08-dev-seed-data`
- **Phase:** 1 — Backend Foundation
- **Size:** S
- **Risk:** Low
- **Prerequisites:** 1.3 ✅ (Liquibase + users table), 1.3b ✅ (timezone column), 1.5 ✅ (auth endpoints — so the seeded hashes can be validated via real login), 1.7 ✅ (Testcontainers singleton container for the isolation test)

> **Prereq note.** The master plan (`round3-master-plan.md` line 1706) lists only Spec 1.7 as the prerequisite. This brief expands the prereq chain to 1.3, 1.3b, 1.5, and 1.7 because: (a) the INSERTs depend on the `users` table (1.3) and its `timezone` column (1.3b); (b) the critical E2E success criterion is `POST /api/v1/auth/login` against a seeded hash (1.5); (c) `DevSeedContextIsolationTest` extends `AbstractIntegrationTest` (1.7). All four prereqs are ✅ on the tracker.

---

## Goal

Seed the local dev PostgreSQL with 5 test users at app startup via a Liquibase `context='dev'` changeset, so Eric can manually exercise `POST /api/v1/auth/login`, `GET /api/v1/users/me`, and `PATCH /api/v1/users/me` without having to register fresh users every time he wipes the DB volume. The seed data also exercises all four `display_name_preference` values and multiple timezones, which catches `DisplayNameResolver` and timezone-validation bugs before Spec 1.9 brings the frontend into the picture.

This spec intentionally establishes the Liquibase-contexts pattern (`dev` vs `test` vs no-context-for-prod) that every future seed spec will reuse. Decision 10 of the master plan outlines the pattern; this is the first spec to actually implement it.

---

## Why this spec exists now

- Specs 1.4, 1.5, 1.6 shipped a working auth stack, but the `users` table is empty in dev. Every manual test today requires: register → remember the password → login → curl with the fresh JWT. Friction compounds across sessions.
- Spec 1.9 (Frontend AuthContext JWT Migration, L/High) is the next major spec. Before jumping into it, seed users let Eric manually verify the backend end-to-end against `curl` — a fast feedback loop that's hard to replicate once the frontend is in the mix.
- Master plan Decision 2 explicitly lists the **BCrypt-in-Liquibase-XML gotcha** (`$` characters interpreted as template delimiters) and says "The Phase 1.8 dev-seed spec MUST pick one approach and document it. Recommended: option (a), CDATA blocks." This spec makes that decision binding and documents the pattern for every future seed changeset.
- Future production-seed specs (admin user from `ADMIN_EMAIL`, curated QOTD questions in Phase 3.9, seed badges in Phase 2) will all reuse this spec's changeset structure. Getting it right here saves rework later.

---

## Current state

- `backend/src/main/resources/db/changelog/master.xml` exists with 2 non-context changesets (`2026-04-23-001-create-users-table`, `2026-04-23-002-add-users-timezone-column`)
- No `contexts/` subdirectory exists yet in `db/changelog/`
- `application-dev.properties` exists but does NOT currently set `spring.liquibase.contexts=dev` (verify during recon — if already set, adjust plan accordingly)
- `application-test.properties` exists (used by Testcontainers tests via Spec 1.7's base classes) and must NOT activate the `dev` context — if tests accidentally pull in dev-seed users, integration test assertions about user counts will drift
- `application-prod.properties` exists and must NOT activate the `dev` context (production safety)
- `BCryptPasswordEncoder` bean configured from Spec 1.4 at strength 10 — seed hashes must be generated with the same strength

---

## Key design decisions (do not re-litigate during planning)

1. **CDATA blocks for BCrypt hash columns.** Per master plan Decision 2 recommendation. Every `<column name="password_hash" value="...">` in the seed changeset wraps its value in `<![CDATA[...]]>` to prevent Liquibase XML from interpreting `$` as a template delimiter. Example:

   ```xml
   <column name="password_hash">
     <![CDATA[$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy]]>
   </column>
   ```

   Alternative approaches rejected: escape-sequence `\${}` (ugly, easy to miss), SQL changeset via `<sqlFile>` (loses Liquibase XML tooling, harder to diff).

2. **Seed user roster (5 users).** Hardcoded UUIDs (reproducible across DB resets; enables predictable URLs for manual frontend testing). Every user gets BCrypt hash of the same dev password `WorshipRoomDev2026!` (19 chars, meets 12-char minimum).

   | # | Email                   | First/Last         | `display_name_preference` | `custom_display_name` | `timezone`           | `is_admin` | `is_email_verified` | Notes                                                                                   |
   | - | ----------------------- | ------------------ | ------------------------- | --------------------- | -------------------- | ---------- | ------------------- | --------------------------------------------------------------------------------------- |
   | 1 | `admin@worshiproom.dev` | Admin / User       | `first_last`              | null                  | `America/Chicago`    | true       | true                | Admin account; exercises `first_last` → "Admin User"                                    |
   | 2 | `sarah@worshiproom.dev` | Sarah / Johnson    | `first_only`              | null                  | `America/New_York`   | false      | true                | Default preference → "Sarah"; bio + favorite verse populated                            |
   | 3 | `bob@worshiproom.dev`   | Bob / Smith        | `first_last_initial`      | null                  | `America/Los_Angeles`| false      | true                | → "Bob S."; avatar URL populated                                                        |
   | 4 | `mikey@worshiproom.dev` | Michael / Martinez | `custom`                  | `Mikey M.`            | `Europe/London`      | false      | true                | Exercises custom preference path                                                        |
   | 5 | `sakura@worshiproom.dev`| Sakura / Tanaka    | `first_only`              | null                  | `Asia/Tokyo`         | false      | **false**           | Unverified email; future Spec 1.5d test target; exercises non-Western timezone          |

   All 5 users have `joined_at` set to a fixed past timestamp (e.g., `2026-01-15 10:00:00+00`) for reproducibility. `created_at` / `updated_at` default to `NOW()` per table schema. `bio` / `avatar_url` / `favorite_verse_reference` / `favorite_verse_text` populated on users 2 and 3 to exercise profile display; nullable on users 1, 4, 5.

3. **UUIDs are hardcoded, not generated.** User IDs in seed data are deterministic UUIDs (one per user). Rationale: (a) frontend dev against `/u/:username` routes can bookmark specific users; (b) integration tests can reference a specific seed user without discovery queries; (c) reproducible across `docker compose down -v` cycles. Pick human-readable patterns like `00000000-0000-0000-0000-000000000001` through `00000000-0000-0000-0000-000000000005` — NOT realistic UUIDs. This makes it visually obvious in logs and DB queries that a UUID is a seed user.

4. **No test-seed changeset in this spec.** Test integration tests use `userRepository.save()` or `userRepository.deleteAll()` + fresh inserts per `@BeforeEach` (existing pattern from Spec 1.5 `AuthControllerIntegrationTest`). Adding a `contexts/test-seed.xml` now is premature — if a future spec needs shared test fixtures, that spec adds the file. Out of scope here.

5. **Liquibase context activation in `application-dev.properties`.** Add `spring.liquibase.contexts=dev` to `application-dev.properties` so `./mvnw spring-boot:run -Dspring-boot.run.profiles=dev` applies the dev-seed. `application-test.properties` and `application-prod.properties` remain unchanged (no context = runs only the always-on changesets).

6. **BCrypt hash regeneration procedure documented, not automated.** If the dev password ever needs to change (low probability), Eric manually generates a new hash via a throwaway test method or `jshell` snippet, then updates the changeset. Do NOT add a build-time hash-generation step — it obscures what's actually in the DB. The spec includes a one-line snippet in `backend/README.md` showing how to regenerate:

   ```
   jshell: new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder(10).encode("your-password")
   ```

7. **Idempotency and re-seeding.** Liquibase tracks applied changesets in `DATABASECHANGELOG`. Once the dev-seed runs, re-running does nothing. If Eric manually deletes seed users (via `psql`) and wants them back, the documented path is `docker compose down -v && docker compose up -d postgres && ./mvnw spring-boot:run -Dspring-boot.run.profiles=dev`. DO NOT add `runOnChange="true"` or `runAlways="true"` to the changeset — both are antipatterns that bypass Liquibase's safety guarantees.

8. **Pre-condition to prevent prod-context bleed.** The dev-seed changeset includes a `<preConditions onFail="HALT">` with `<not><sqlCheck expectedResult="0">SELECT 1 FROM information_schema.tables WHERE table_name='users'</sqlCheck></not>` — a defensive check that `users` table exists before trying to insert. Liquibase context alone prevents prod execution, but the precondition is belt-and-suspenders.

9. **README documentation.** `backend/README.md` gets a new "Dev Seed Users" section listing all 5 users, the shared password, how to activate the dev context, and the BCrypt-regeneration snippet. This is the only place the shared dev password is written in prose — the changeset has it as a hash, obviously.

---

## Files to create

- `backend/src/main/resources/db/changelog/contexts/dev-seed.xml` — Liquibase changeset with `context="dev"` attribute, 5 `<insert>` operations into `users` table, each with CDATA-wrapped BCrypt hash, hardcoded UUIDs, fixed `joined_at`, and full profile fields per the roster table above
- `backend/src/test/java/com/worshiproom/db/DevSeedContextIsolationTest.java` — integration test extending `AbstractIntegrationTest` that verifies: (a) running in test context, seed users do NOT appear in `users` table; (b) the dev-seed changeset file exists at the expected path and has `context="dev"` attribute (parsed from the XML). This is a drift-detection test — it fails if someone accidentally removes the `context="dev"` attribute.

---

## Files to modify

- `backend/src/main/resources/db/changelog/master.xml` — add `<include file="db/changelog/contexts/dev-seed.xml" relativeToChangelogFile="false"/>` AFTER the two existing users-table changesets (must come after the timezone column exists, or the INSERT fails). Placement matters: include the dev-seed AFTER the timezone column changeset so the seed can populate the `timezone` field.
- `backend/src/main/resources/application-dev.properties` — add `spring.liquibase.contexts=dev` (verify via recon it's not already there; if currently absent, add it; if already present, confirm it says `dev` and not something else)
- `backend/src/main/resources/application-test.properties` — verify it does NOT have `spring.liquibase.contexts=dev` (should be absent). If absent, no change needed; if somehow present, remove.
- `backend/src/main/resources/application-prod.properties` — verify it does NOT activate dev context. Defensive: explicitly set `spring.liquibase.contexts=` (empty) to make the intent obvious to future readers. Low-priority polish; can skip if it feels overly defensive.
- `backend/README.md` — add a "Dev Seed Users" section documenting: all 5 users (email, display name, admin status, timezone, verified-status), the shared dev password `WorshipRoomDev2026!`, how to activate dev context (`./mvnw spring-boot:run -Dspring-boot.run.profiles=dev`), how to reset (`docker compose down -v`), how to regenerate BCrypt hashes (the jshell snippet from Decision 6)

---

## Files to delete

None.

---

## Database changes

- **No schema changes.** Existing `users` table columns are used as-is.
- **Data changes (dev context only):** 5 rows inserted into `users`. Prod and test DBs are untouched.
- **Liquibase tracking:** 1 new row in `DATABASECHANGELOG` when the changeset first applies.

---

## API changes

None. This spec doesn't touch controllers, services, DTOs, or the OpenAPI spec.

---

## Success criteria

- [ ] Running `./mvnw spring-boot:run -Dspring-boot.run.profiles=dev` with a freshly-wiped DB (`docker compose down -v && docker compose up -d postgres`) applies the dev-seed changeset successfully (Liquibase logs show `dev-seed` as applied)
- [ ] `psql -c "SELECT email, display_name_preference FROM users ORDER BY email"` returns exactly the 5 seed users in expected order
- [ ] `curl -X POST http://localhost:8080/api/v1/auth/login -H "Content-Type: application/json" -d '{"email":"sarah@worshiproom.dev","password":"WorshipRoomDev2026!"}'` returns 200 with a valid JWT — confirms BCrypt hash matches the plaintext (this is the critical E2E verification)
- [ ] `curl -H "Authorization: Bearer <token>" http://localhost:8080/api/v1/users/me` returns Sarah's full profile with `displayName: "Sarah"` (confirms DisplayNameResolver integration)
- [ ] Same flow with `mikey@worshiproom.dev` returns `displayName: "Mikey M."` (custom preference)
- [ ] Same flow with `bob@worshiproom.dev` returns `displayName: "Bob S."` (first_last_initial preference)
- [ ] Same flow with `admin@worshiproom.dev` returns `isAdmin: true` and `displayName: "Admin User"`
- [ ] `sakura@worshiproom.dev` login succeeds but `isEmailVerified: false` in `/me` response (future Spec 1.5d test target)
- [ ] Running `./mvnw test` (Testcontainers, no `dev` profile active) shows `users` table empty between tests — seed data does NOT leak into test context
- [ ] `DevSeedContextIsolationTest` passes (asserts the dev-seed XML has `context="dev"` attribute and test DB has zero users after applying migrations without activating dev context)
- [ ] `backend/README.md` has a "Dev Seed Users" section documenting all 5 users with clear instructions
- [ ] Full test suite still runs in ~97s (no regression from Spec 1.7 baseline)
- [ ] `./mvnw test` still passes all 378 tests + the 1-2 new tests from `DevSeedContextIsolationTest`

---

## Pre-execution recon items for `/plan-forums` to verify

1. **Confirm `application-dev.properties` current state** — does it already have a `spring.liquibase.contexts` setting? If yes, confirm value is `dev` or adjust plan to update it. If no, the plan adds it.
2. **Confirm `master.xml` include order** — the dev-seed MUST come after `2026-04-23-002-add-users-timezone-column` so the `timezone` column exists when the INSERT runs. Verify by reading `master.xml`.
3. **Generate real BCrypt hash** — during planning phase, generate the actual BCrypt hash for `WorshipRoomDev2026!` at strength 10 (e.g., via a throwaway `jshell` or a quick test). Verify it decodes back to the plaintext via `BCryptPasswordEncoder.matches()`. Paste the real hash into the changeset. **DO NOT leave a placeholder hash in the changeset** — unlike `DUMMY_HASH` in Spec 1.5, this hash must be real and verifiable.
4. **Verify hardcoded UUID format acceptability** — check whether the DB or JPA has any validation that rejects the `00000000-0000-0000-0000-000000000001` style UUIDs. PostgreSQL's UUID type accepts them; confirm Hibernate/JPA doesn't have stricter validation.
5. **Verify `PublicPaths` does NOT accidentally include dev-seed endpoints** — no changes expected; just confirming no regression.
6. **Check for existing `.sql` or `.xml` files under `db/changelog/contexts/`** — if the directory exists with other files, accommodate; if it doesn't exist, the spec creates it.
7. **Confirm no test in the existing suite depends on an empty `users` table at startup via a mechanism that would break if dev-seed bleeds in** — cross-check all 6 Testcontainers-using test classes (`LiquibaseSmokeTest`, `SecurityConfigIntegrationTest`, `UserRepositoryTest`, `LoginRateLimitFilterTest`, `AuthControllerIntegrationTest`, `UserControllerIntegrationTest`) to confirm they rely on `userRepository.deleteAll()` or `@DataJpaTest` auto-rollback, not on implicit "users is empty at startup" assumption.

---

## Out of scope

- **Production admin user seeding from `ADMIN_EMAIL` env var** — that's a future prod-seed spec (possibly part of Spec 1.10 or a dedicated hardening spec). Dev seed is NOT the same thing.
- **Test-context seed data (`contexts/test-seed.xml`)** — not needed now; tests manage their own fixtures. If a future spec wants shared test fixtures, that spec adds the file.
- **Seed data for other tables** — `posts`, `post_comments`, `friend_relationships`, etc. are all future tables from Phase 2+ specs; each of those specs owns its own dev-seed extension when the table lands.
- **Faker-library auto-generated rich seed data** — explicit 5 users is enough for manual testing. Generated data is hard to reason about and hurts reproducibility.
- **Seed the user's password history or login attempts** — those tables don't exist yet (Spec 1.5f / 1.5g).
- **Seed data for QOTD questions** — Phase 3.9 owns that migration.
- **A dedicated seed-data management UI / admin page** — way out of scope.
- **Automated BCrypt hash regeneration at build time** — explicit manual process per Decision 6.

---

## Gotchas worth naming in the spec

- **The BCrypt hash in the changeset MUST be real.** Unlike Spec 1.5's `DUMMY_HASH` placeholder that could be replaced at execution time, THIS hash is what every dev login verifies against. If CC leaves a placeholder, every seed user login returns 401 "invalid credentials" with no obvious cause (dummy-hash matching burns ~100ms of BCrypt time producing the 401). The plan phase must generate and embed the real hash.
- **CDATA is a sharp edge.** The wrapping is `<![CDATA[...]]>` — not `<CDATA>` or `<cdata>`. Whitespace inside CDATA is preserved exactly, so don't add leading/trailing spaces around the hash. Test by reading the raw XML after the changeset runs.
- **Liquibase XML `${...}` expansion.** Even outside CDATA, Liquibase still tries to expand `${...}` sequences in non-hash columns (e.g., bio text). If a seed bio contains literal `${` for some reason, escape it. In practice, we won't hit this with our chosen seed content, but worth knowing.
- **Hardcoded UUIDs and production leakage anxiety.** Someone might worry that the seed UUIDs (like `00000000-0000-0000-0000-000000000001`) could accidentally end up in production. They can't — the `context="dev"` attribute prevents the changeset from running outside the dev profile. The `DevSeedContextIsolationTest` explicitly verifies this.
- **Timezone values must be valid IANA strings.** `America/Chicago`, `Europe/London`, `Asia/Tokyo`, etc. NOT abbreviations like `CST` or `EST` (those are ambiguous — e.g., `CST` = Central Standard Time OR China Standard Time). JPA validates via `ZoneId.of()` on read; invalid seed timezones would crash `GET /me` for that user.
- **`joined_at` vs `created_at` vs `updated_at`.** Seed users get a fixed `joined_at` (for reproducibility) but `created_at` / `updated_at` default to `NOW()` (stored at the moment the changeset ran). This is intentional — `joined_at` represents the user's account creation moment in business terms, while `created_at` tracks the row's creation in infrastructure terms. They're distinct columns.
- **Re-running the app doesn't re-seed.** If Eric adds a new seed user to the changeset AFTER it's already applied, Liquibase will fail on startup with a checksum mismatch. The correct move is to create a NEW changeset (e.g., `2026-04-24-001-dev-seed-additional-users.xml`) with the additional insert, NOT edit the committed one. This is standard Liquibase discipline from Rule 3 of the Universal Rules.
- **The shared dev password is non-secret and OK to commit.** `WorshipRoomDev2026!` appears in `backend/README.md` in plaintext. This is fine because dev data is isolated to the dev profile and never runs in production. If this assumption ever breaks, it's a bigger problem than this password.

---

## Documentation safety

Additive only. No past specs invalidated. `.claude/rules/` files unchanged (`05-database.md` already covers Liquibase conventions including contexts; no new pattern introduced). Master plan unchanged. Spec tracker gets a manual ✅ update post-execution. The `backend/README.md` update is additive (new section, no existing content removed).

---

## See Also

- Master plan `round3-master-plan.md` → Decision 2 (BCrypt-in-Liquibase-XML gotcha) and Decision 10 (Liquibase contexts pattern)
- `.claude/rules/05-database.md` — Liquibase conventions (existing)
- `.claude/rules/02-security.md` — password policy (BCrypt strength 10, 12-char minimum)
- `_specs/forums/spec-1-5.md` — `DUMMY_HASH` precedent (what NOT to do for this spec)
- `_specs/forums/spec-1-7.md` — `AbstractIntegrationTest` base class (consumed by `DevSeedContextIsolationTest`)
