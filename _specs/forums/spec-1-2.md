# Forums Wave: Spec 1.2 — PostgreSQL via Docker Compose

**Master Plan Reference:** `_forums_master_plan/round3-master-plan.md` → Spec 1.2
**Branch:** `claude/forums/round3-forums-wave`
**Date:** 2026-04-23

---

## Affected Frontend Routes

N/A — backend-only spec. No frontend code touched. `/verify-with-playwright` should be skipped.

---

### Spec 1.2 — PostgreSQL via Docker Compose

- **ID:** `round3-phase01-spec02-postgres-docker`
- **Phase:** 1 — Backend Foundation
- **Size:** S
- **Risk:** Low
- **Prerequisites:** Spec 1.1 (Backend Skeleton Audit) ✅
- **Goal:** Add a PostgreSQL 16 service to the root `docker-compose.yml`. Add the JDBC driver to `backend/pom.xml`. Add datasource configuration to the existing `backend/src/main/resources/application-dev.properties` (EXTEND — do NOT overwrite). Confirm the backend can connect to the database on startup (no schema yet — that comes in Spec 1.3).

---

## Approach

Add a `postgres` service to `docker-compose.yml` with image `postgres:16-alpine`, port mapping `5432:5432`, environment variables for database name (`worshiproom_dev`), user (`worshiproom`), password (local-only, documented in README), a named volume for persistence, and a healthcheck using `pg_isready` (which IS bundled in the postgres image — unlike the `curl` issue we hit in Spec 1.1 with the Alpine backend image).

Make the `backend` service's `depends_on` gate on `postgres` being healthy (existing `depends_on` structure in `docker-compose.yml` may need adjustment — frontend currently depends on backend health, postgres will become the new root dependency).

Add `org.postgresql:postgresql` to `backend/pom.xml` as a standard runtime dependency. Spring Boot auto-resolves the driver class from the JDBC URL, so no explicit `spring.datasource.driver-class-name` needed.

**EXTEND (do NOT overwrite) `backend/src/main/resources/application-dev.properties`** with a new `# ─── Datasource ───` section at the bottom. The file currently contains five organized sections (Logging, Rate limit, Actuator, CORS — plus the critical PII/key-leak log suppressions from Spec 4 Deviation #1). Preserve all existing content verbatim. Append datasource configuration that points to `jdbc:postgresql://localhost:5432/worshiproom_dev` with matching credentials.

Update `backend/README.md` (created in Spec 1.1) with a new database section covering: `docker compose up -d postgres` to start, `docker compose stop postgres` to stop gracefully, `docker compose down -v` to wipe volumes (documented with warning), and the `psql` connection command for manual inspection.

## Files to create

- None. The original master plan spec listed `application-dev.properties` as a file to create — **this is stale**. The file already exists (created during the Key Protection Wave to house log suppressions). This spec EXTENDS it.

## Files to modify

- `docker-compose.yml` — add `postgres` service with `postgres:16-alpine`, named volume, healthcheck using `pg_isready`, and update `backend.depends_on` to wait for postgres health
- `backend/pom.xml` — add `org.postgresql:postgresql` dependency (runtime scope acceptable; default `compile` scope also works — Spring Boot BOM manages the version)
- `backend/src/main/resources/application-dev.properties` — EXTEND with new `# ─── Datasource ───` section; preserve all existing Logging / Rate limit / Actuator / CORS sections byte-for-byte
- `backend/README.md` — add database startup / shutdown / wipe / manual-inspection commands

## Database changes

None. This spec stands up PostgreSQL infrastructure only. Liquibase integration and the first schema changeset arrive in Spec 1.3.

## API changes

None — infrastructure spec.

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

- [ ] `docker compose up -d postgres` starts the postgres container cleanly
- [ ] `docker compose ps postgres` reports `healthy` after `pg_isready` healthcheck passes (typically within 5–10 seconds on first boot)
- [ ] `psql -h localhost -U worshiproom -d worshiproom_dev` connects (prompted for password; password documented in `backend/README.md`)
- [ ] `./mvnw spring-boot:run -Dspring-boot.run.profiles=dev` starts without database connection errors — Spring Boot's HikariCP pool connects successfully to `jdbc:postgresql://localhost:5432/worshiproom_dev`
- [ ] `/api/v1/health` still returns `{"status":"UP"...}` with all three providers' `configured: true` (existing Key Protection Wave behavior preserved)
- [ ] `docker compose down` stops the database without data loss (named volume persists)
- [ ] `docker compose down -v` stops and wipes the volume (documented in README with a ⚠️ warning — irreversible)
- [ ] `docker compose up --build backend` starts the backend and — with postgres also running — completes boot without errors. The Docker healthcheck for backend itself may still fail due to the pre-existing `curl`-not-in-Alpine bug from commit `0c9618f` (out of scope — Spec 1.1 deferred this to a follow-up). A separate manual `curl http://localhost:8080/api/v1/health` from the host should succeed.
- [ ] `backend` service in `docker-compose.yml` has `depends_on: postgres: condition: service_healthy` — backend waits for postgres healthcheck before starting
- [ ] `backend/pom.xml` includes `org.postgresql:postgresql` (version managed by Spring Boot BOM — no explicit `<version>` tag needed unless overriding)
- [ ] `backend/src/main/resources/application-dev.properties` retains all pre-existing content unchanged (verify: `diff` the pre-state and post-state; only net-new lines should be the `# ─── Datasource ───` section)
- [ ] `./mvnw test` passes — 280 pre-existing tests still green (no new tests in this spec; pure infrastructure)
- [ ] `backend/README.md` includes a "Local Database" section with start / stop / wipe / psql commands

## Testing notes

- **No new unit or integration tests.** This spec adds infrastructure, not code. The 280-test Key Protection Wave suite is the regression baseline and must remain green.
- **Manual verification steps** (CC should run these as part of Step-level verification):
  1. `docker compose up -d postgres` — expect container to be created and running
  2. `docker compose ps` — expect STATUS column to show `(healthy)` after ~10s
  3. `docker exec -it worship-room-postgres-1 pg_isready -U worshiproom -d worshiproom_dev` — expect `accepting connections`
  4. `./mvnw spring-boot:run -Dspring-boot.run.profiles=dev` — look for HikariCP log line `HikariPool-1 - Start completed.` and zero connection errors in the first 30 seconds of startup
  5. `curl http://localhost:8080/api/v1/health` — expect `{"status":"UP","providers":{...}}` with all three providers still reporting `configured: true`
  6. `docker compose down` (without `-v`), then `docker compose up -d postgres` again — expect the container to come back up with the same data (volume persistence works)
  7. `docker compose down -v` — expect the volume to be deleted; next `up -d postgres` starts from an empty database
- **Backend connection failure mode to test:** Stop postgres (`docker compose stop postgres`), then attempt `./mvnw spring-boot:run -Dspring-boot.run.profiles=dev`. Expect Spring Boot to log connection errors and fail to fully start (exit or hang on HikariCP retry loop). This is correct fail-closed behavior and confirms the datasource config is actually being consumed. After confirming, restart postgres and re-verify happy path.

## Notes for plan phase recon

1. **Critical precondition: `application-dev.properties` already exists.** The original master plan said to CREATE it. It was already created during the Key Protection Wave (Spec 4 Deviation #1) to house two narrow framework log suppressions that prevent API keys and user content from leaking into dev logs. CC must EXTEND this file, not overwrite it. Pre-execution recon should include `cat backend/src/main/resources/application-dev.properties` and confirm the existing sections (Logging, Rate limit, Actuator, CORS) are preserved byte-for-byte in the final state.
2. **Critical precondition: `application.properties` (the base/shared file) may or may not already have datasource hints.** Before deciding whether to put datasource config in `application.properties` (shared) or `application-dev.properties` (dev-only), CC should `cat` both files and grep for `spring.datasource`. The answer determines where to append: dev-only if the base file stays database-agnostic, or base-plus-dev-override if the base file needs a placeholder URL.
3. **Password handling.** The master plan says "password (local-only, documented in README)." Use a fixed development password like `worshiproom` or `localdev` — this is a development-only database, not production. Document in `backend/README.md` with a clear ⚠️ that this password never goes to production (production credentials come from the hosting platform's env vars, per Spec 1.10b).
4. **Docker healthcheck syntax.** Use `pg_isready -U worshiproom -d worshiproom_dev` as the healthcheck command. `pg_isready` IS bundled in the official `postgres` image (including Alpine variants), so this does NOT have the same `curl`-missing-in-Alpine bug we hit in Spec 1.1. Example healthcheck block:

   ```yaml
   healthcheck:
     test: ["CMD-SHELL", "pg_isready -U worshiproom -d worshiproom_dev"]
     interval: 5s
     timeout: 3s
     retries: 5
     start_period: 10s
   ```

5. **Named volume naming.** Use `worshiproom_postgres_data` or similar project-scoped name — avoid generic names like `pgdata` that could collide with other Docker projects on Eric's machine.
6. **`depends_on` structure.** The current `backend` service declaration uses `depends_on` implicitly through `env_file` / `build` only (no explicit `depends_on` block — verify with `cat docker-compose.yml`). Add an explicit `depends_on: postgres: condition: service_healthy`. The existing `frontend.depends_on: backend: condition: service_healthy` stays unchanged (still broken due to the Spec 1.1 `curl` issue, still out of scope here).
7. **PostgreSQL version pinning.** The spec says `postgres:16-alpine`. Do NOT use `postgres:latest` — reproducibility demands a pinned major version. `16-alpine` is the current LTS major and matches what the `03-backend-standards.md` rules file specifies.
8. **Maven dependency scope.** `org.postgresql:postgresql` can be added with default `compile` scope or `runtime` scope. Both work. `runtime` is marginally more correct since the driver is only needed at runtime, but `compile` is simpler and matches what Spring Boot's Initializer generates. Pick one and be consistent.
9. **`.gitignore` check.** The named Docker volume lives in Docker's storage area, not the project directory, so no `.gitignore` changes are needed. But if CC notices any `data/` or `pgdata/` directory appearing in the project root, that means the volume was mis-configured as a bind mount — fix immediately.
10. **Pre-flight baseline (Spec 1.1 lesson learned).** Before starting, verify the baseline state on the current branch: `./mvnw test` passes 280/0/0/0, `docker compose up --build backend` builds cleanly, `/api/v1/health` returns all three providers `configured: true`. If any of these are red on the current branch, flag before starting — the failure is pre-existing and shouldn't be attributed to this spec's work.

## Out of scope

- **Liquibase integration** — deferred to Spec 1.3. This spec adds the database server and driver only; no schema, no migrations, no changelog, no `spring.liquibase.*` properties.
- **JPA / Hibernate configuration** — deferred to later specs. No `spring.jpa.*` properties in this spec. Spring Boot's auto-config may warn about missing JPA settings; those warnings are acceptable and resolved in 1.3+.
- **Test-profile datasource.** `application-test.properties` stays untouched. Testcontainers (Spec 1.7) supplies its own ephemeral PostgreSQL for integration tests, independently of the local dev database.
- **Production datasource configuration.** `application-prod.properties` stays untouched. Production database connection strings come from platform env vars (`DATABASE_URL` etc.) per Spec 1.10b's deployment decisions.
- **Redis service.** Deferred to Spec 5.6 (or whenever the master plan schedules it — check the tracker). Local rate limiting still uses in-memory Caffeine.
- **Fixing the backend Alpine `curl` healthcheck bug.** Pre-existing from commit `0c9618f`, deferred by Spec 1.1 to a follow-up spec. NOT this spec's problem.
- **Doc-sweep of rules/skills files.** The pending Spec 1.1b doc-sweep (updating `com.example.worshiproom` references in `.claude/rules/` and `.claude/skills/`) is independent of this spec and will land separately.

## Out-of-band notes for Eric

- **The biggest trap in this spec is the pre-existing `application-dev.properties` file.** If CC reads the master plan's "Files to create" list literally, it will blow away the Spec 4 Deviation #1 log suppressions — and you won't notice until some future proxy call accidentally logs an API key. The Approach section + Files to modify list + Acceptance criteria all emphasize EXTEND vs. CREATE, but watch the code review carefully: the diff should show a net-additive change to `application-dev.properties`, not a rewrite.
- **The `pg_isready` healthcheck will Just Work.** Unlike the backend's `curl`-missing-in-Alpine bug, postgres images ship with their own health-check binary. Spec 1.1's pain doesn't repeat here.
- **No code changes means no new tests.** This is deliberately an infrastructure-only spec. If you find yourself reviewing net-new `.java` files in the diff, something has gone off-script.
- **Expect a Spring Boot warning about missing JPA configuration.** Once Spring sees a datasource but no JPA/Hibernate setup, it logs a warning on startup along the lines of "No `DataSource` bean with qualifier" or "Hibernate is not configured." Acceptable for this spec. Spec 1.3+ resolves it.
- **Password discipline.** The dev password (`worshiproom` or whatever you pick) goes in `application-dev.properties` in plaintext. That's fine — it's a local-only database that never accepts external connections. Production credentials live in env vars, never in the repo. The README should state this explicitly so no one is confused about it later.
- **If the `./mvnw spring-boot:run -Dspring-boot.run.profiles=dev` step fails with a Hikari connection timeout, the most likely cause is postgres not being fully ready yet.** Wait 15 seconds after `docker compose up -d postgres` before starting the backend. In Spec 1.3+, Liquibase run-at-boot will handle this naturally; for this spec, manual sequencing is fine.
- **The legacy `/api/health` and `/api/hello` endpoints from Spec 1.1 are still preserved.** Don't touch them. Their retirement is a separate follow-up spec, not tangled into infrastructure work.
