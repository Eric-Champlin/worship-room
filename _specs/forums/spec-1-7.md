# Forums Wave: Spec 1.7 — Testcontainers Integration Test Infrastructure

**Master Plan Reference:** `_forums_master_plan/round3-master-plan.md` → Spec 1.7
**Branch:** `claude/forums/round3-forums-wave`
**Date:** 2026-04-23

---

## Affected Frontend Routes

N/A — backend test-infrastructure-only spec. No frontend code touched. No API changes. No database changes. No runtime behavior change. `/verify-with-playwright` should be skipped.

---

### Spec 1.7 — Testcontainers Integration Test Infrastructure

- **ID:** `round3-phase01-spec07-testcontainers-setup`
- **Phase:** 1 — Backend Foundation
- **Size:** M
- **Risk:** Low
- **Prerequisites:** Spec 1.3 ✅, Spec 1.3b ✅, Spec 1.4 ✅, Spec 1.5 ✅ (all merged into `claude/forums/round3-forums-wave`)
- **Goal:** Consolidate the 5 per-class Testcontainers setups that accumulated across Specs 1.3–1.5 into a shared singleton-container pattern, so full-suite test runtime drops from ~90s to ~30s and every future Phase 2+ integration test inherits the speedup for free. This is test-infrastructure cleanup only — **no production code changes, no API changes, no database changes, no runtime behavior change.**

---

## Why this spec exists now

`.claude/rules/06-testing.md` and `.claude/skills/execute-plan-forums/SKILL.md` both already promise that an `AbstractIntegrationTest` base class exists and that integration tests should extend it. That promise was deferred through Specs 1.3–1.5 (each added its own `@Container` static field with a class-level JavaDoc saying "Spec 1.7 will refactor this"). This spec delivers on that promise **before Spec 1.6 adds a 6th per-class container.**

### Deviation from master plan's prereq chain

The master plan lists Spec 1.7's prereq as **1.6**. This spec intentionally runs **before** 1.6 — since 1.6 has not been started yet, inserting 1.7 first saves 1.6 from adding a 6th per-class `@Container` that would then need to be immediately migrated. The 1.6/1.7 order is reversed deliberately; no functional dependency is broken (1.6's User Me endpoint doesn't depend on any test-infra change, and 1.7's refactor of the five existing test classes stands on its own).

---

## Approach

### Current test inventory (5 Testcontainers-using classes)

All 5 use identical container config: `postgres:16-alpine`, database `worshiproom_test`, user/password `test/test`, `Wait.forListeningPort()` wait strategy.

| Test class                          | Package              | Spring annotation                                  | Extra dynamic properties                               |
| ----------------------------------- | -------------------- | -------------------------------------------------- | ------------------------------------------------------ |
| `LiquibaseSmokeTest`                | `db/`                | `@SpringBootTest`                                  | JDBC only                                              |
| `SecurityConfigIntegrationTest`     | `auth/`              | `@SpringBootTest + @AutoConfigureMockMvc`          | JDBC + `jwt.secret`                                    |
| `UserRepositoryTest`                | `user/`              | `@DataJpaTest + @AutoConfigureTestDatabase(NONE)`  | JDBC only                                              |
| `LoginRateLimitFilterTest`          | `auth/`              | `@SpringBootTest(properties=...) + @AutoConfigureMockMvc` | JDBC + `jwt.secret` + `proxy.trust-forwarded-headers` |
| `AuthControllerIntegrationTest`     | `auth/`              | `@SpringBootTest + @AutoConfigureMockMvc`          | JDBC + `jwt.secret` + `auth.rate-limit.*` overrides    |

Unit tests that do NOT use Testcontainers (leave alone): `AuthServiceTest`, `JwtServiceTest`, `JwtAuthenticationFilterTest`, `DisplayNameResolverTest`.

### Key design decisions (do not re-litigate during planning)

1. **Singleton container pattern.** One `public static final PostgreSQLContainer<?>` started in a `static {}` block, shared across the entire JVM test run. Testcontainers' Ryuk sidecar handles cleanup on JVM exit — do NOT add a manual `@AfterAll` stop hook.

2. **Two base classes, not one.** `@DataJpaTest` (slice test) and `@SpringBootTest` (full context) are mutually exclusive Spring annotations. A single abstract base class can't serve both. Solution:
   - `AbstractIntegrationTest` — annotated `@SpringBootTest` — for the 4 full-context tests
   - `AbstractDataJpaTest` — annotated `@DataJpaTest + @AutoConfigureTestDatabase(replace = Replace.NONE)` — for `UserRepositoryTest`
   - Both share the same singleton container via a `TestContainers` utility class

3. **Subclass-additive dynamic properties must be preserved.** Each subclass's own `@DynamicPropertySource` method augments the base class's JDBC registration — does not replace it. Spring aggregates `@DynamicPropertySource` methods across the inheritance hierarchy. `SecurityConfigIntegrationTest`, `LoginRateLimitFilterTest`, and `AuthControllerIntegrationTest` all need to keep their test-specific property registration intact.

4. **`.withReuse(true)` is opt-in only.** Default to reuse disabled. Document in `TestContainers.java` JavaDoc how developers can opt in locally via `~/.testcontainers.properties` (`testcontainers.reuse.enable=true`). CI must not use reuse.

5. **Preserve the `Wait.forListeningPort()` strategy and its Mac Docker Desktop comment.** The comment in `LiquibaseSmokeTest.java` explaining why this strategy beats the default log-message wait (race condition on Mac Docker Desktop port publishing) must relocate to `TestContainers.java`, not be deleted.

6. **`LoginRateLimitFilterTest`'s inline `@SpringBootTest(properties=...)` migration** — let CC choose between keeping inline or moving to `@DynamicPropertySource`. Either is fine; just document the choice in a class-level comment.

---

## Files to create

- `backend/src/test/java/com/worshiproom/support/TestContainers.java` (singleton container + helper to register JDBC properties)
- `backend/src/test/java/com/worshiproom/support/AbstractIntegrationTest.java` (`@SpringBootTest` base)
- `backend/src/test/java/com/worshiproom/support/AbstractDataJpaTest.java` (`@DataJpaTest` base)
- `backend/src/test/java/com/worshiproom/support/TestContainersSingletonTest.java` (3–4 tests asserting singleton behavior, running state, JDBC URL format)

---

## Files to modify

**Test migrations** (preserve all existing test bodies; only change the class header + remove `@Container` static field + remove `@Testcontainers` annotation + move shared JDBC `@DynamicPropertySource` into base):

- `backend/src/test/java/com/worshiproom/db/LiquibaseSmokeTest.java`
- `backend/src/test/java/com/worshiproom/auth/SecurityConfigIntegrationTest.java`
- `backend/src/test/java/com/worshiproom/user/UserRepositoryTest.java`
- `backend/src/test/java/com/worshiproom/auth/LoginRateLimitFilterTest.java`
- `backend/src/test/java/com/worshiproom/auth/AuthControllerIntegrationTest.java`

**Documentation updates** (additive, not replacement):

- `.claude/rules/06-testing.md` — Add a ~5-line paragraph after the existing `AbstractIntegrationTest` example explaining: (a) the sibling `AbstractDataJpaTest` exists for slice tests; (b) both share the singleton container via `TestContainers`; (c) subclasses may add their own `@DynamicPropertySource` for test-specific properties (jwt.secret, rate-limit overrides), which augment (not replace) the base's JDBC registration. The existing example stays valid.
- `.claude/skills/execute-plan-forums/SKILL.md` — One-line edit: change `"Extend AbstractIntegrationTest from Spec 1.7"` to `"Extend AbstractIntegrationTest (or AbstractDataJpaTest for repository slice tests) from Spec 1.7"`.

---

## Database changes

None. No Liquibase changesets. No schema changes. No seed data changes. The container still runs Liquibase on startup (same as today), but nothing about the migrations themselves changes.

---

## API changes

None. No endpoints added, modified, or removed. No OpenAPI spec updates.

---

## Acceptance criteria

- [ ] All ~369 existing tests still pass after the refactor (no test behavior regression).
- [ ] Running `./mvnw test` shows **exactly one** `Started PostgreSQLContainer` log line per JVM run (not one per test class).
- [ ] Full-suite runtime on Eric's local machine: **≤ 40 seconds** (baseline ~85–95 seconds).
- [ ] `grep -rn "@Container" backend/src/test/` returns matches only inside `TestContainers.java`.
- [ ] `grep -rn "@Testcontainers" backend/src/test/` returns matches only inside `TestContainers.java` (if anywhere).
- [ ] No production source file modified — `git diff backend/src/main/` is empty.
- [ ] No new dependencies in `backend/pom.xml`.
- [ ] `.claude/rules/06-testing.md` gains the documented ~5-line paragraph about the two base classes.
- [ ] `.claude/skills/execute-plan-forums/SKILL.md` gains the one-line edit mentioning `AbstractDataJpaTest`.
- [ ] `TestContainersSingletonTest` asserts: (a) container is running, (b) same container instance returned on repeated access, (c) JDBC URL format matches `jdbc:postgresql://...:PORT/worshiproom_test`.
- [ ] Class-level comment on `AbstractIntegrationTest` reminds future authors to clean entity state in `@BeforeEach` (since the container is shared across tests).

---

## Testing notes

### Plan verification commands

```bash
# Runtime check — must be ≤ 40s
time ./mvnw test

# Singleton check — must print exactly 1 line
./mvnw test 2>&1 | grep -c "Started PostgreSQLContainer"

# @Container leakage check — must return only TestContainers.java
grep -rn "@Container" backend/src/test/

# Production source untouched
git diff backend/src/main/

# No new pom.xml deps
git diff backend/pom.xml
```

### Gotchas worth naming

- **Test isolation with a shared container.** Full-context tests already clean up via `userRepository.deleteAll()` in `@BeforeEach`. `@DataJpaTest` auto-rolls-back. Risk: a future test author adds a new integration test and forgets cleanup. Mitigation: class-level comment on `AbstractIntegrationTest` reminding authors to clean entity state in `@BeforeEach`. The reminder comment is part of the acceptance criteria — don't skip it.
- **Runtime regression check.** If post-refactor `./mvnw test` is > 50s, the singleton pattern isn't working — likely the static block isn't triggering on first access, or `@Container` annotations got left behind somewhere. Investigate before declaring done.
- **Docker Desktop not running.** Will fail at static-block initialization with `ContainerLaunchException`. Same failure mode as the current per-class pattern, just surfaces earlier (first test class loaded, not when the first `@Testcontainers` test runs). Not a regression.
- **`@DataJpaTest` + `@AutoConfigureTestDatabase(replace = Replace.NONE)`.** Without the `replace = NONE`, Spring Boot tries to wire an embedded H2 database and ignores the Testcontainers-provided properties. This is why `UserRepositoryTest` currently has that annotation — `AbstractDataJpaTest` must carry it forward.
- **`@DynamicPropertySource` inheritance.** Spring's Java-based `@DynamicPropertySource` aggregates across the inheritance hierarchy — the base class's registration runs AND the subclass's registration runs, with the subclass's values layered on top. Confirmed in Spring Framework docs. Do not attempt to "override" the base method; add a new one with a different name.

---

## Notes for plan phase recon

The plan phase should verify these before executing:

1. Confirm `@DynamicPropertySource` inheritance behavior in Spring Boot 3.5.11 (subclass methods run in addition to base class, not instead of). Spring Framework reference docs state this explicitly, but a quick empirical check on a small two-class hierarchy rules out any surprise.
2. Confirm `@DataJpaTest`'s per-test transactional rollback still works with the shared container (should — transactions are independent of container sharing). Spot-check by inspecting `UserRepositoryTest`'s current test methods for any `@Rollback(false)` overrides.
3. Grep `backend/src/test/` for any `@Testcontainers` class not in the migration list above (should be zero; if any found, add to migration scope). Use `grep -rln "@Testcontainers" backend/src/test/` — returns a list of file paths.
4. Verify package naming convention — the brief recommends `support/` but plan phase should check if repo has a different convention. Existing test files live under `backend/src/test/java/com/worshiproom/{db,auth,user,...}/` — `support/` is a sensible new sibling. If the repo uses a different convention (e.g., `testsupport/` or `testing/`), match it.
5. Decide on `LoginRateLimitFilterTest`'s inline-properties vs `@DynamicPropertySource` migration (either acceptable; document the choice in a class-level comment).
6. Confirm the exact JavaDoc strings in the five test classes saying "Spec 1.7 will refactor this" so the refactor can remove them cleanly without leaving orphan references.
7. Verify `application-test.properties` does NOT already exist in `backend/src/main/resources/` — the original master plan Spec 1.7 called for creating it, but the 5 current test classes have been configuring via `@DynamicPropertySource` instead. Confirm no stale file needs to be reconciled.

---

## Out of scope

- Migrating unit tests (`AuthServiceTest`, `JwtServiceTest`, `JwtAuthenticationFilterTest`, `DisplayNameResolverTest`) — they correctly avoid Testcontainers; leave alone.
- Enabling `.withReuse(true)` by default — opt-in only.
- Parallel test execution (Maven `-T` flag) — separate optimization.
- Adding a Redis container to the shared setup — Redis arrives in Spec 5.6; premature here.
- Upgrading container image (e.g., `postgres:17`) — stay pinned at `postgres:16-alpine`.
- Creating `application-test.properties` or `db/changelog/contexts/test-seed.xml` from the original master plan Spec 1.7 text. The established `@DynamicPropertySource` pattern replaces the `application-test.properties` need; test seed data is still expected to arrive in Spec 1.8.
- Updating `backend/README.md` with integration-test docs. `.claude/rules/06-testing.md` is the canonical reference; a docs cross-link from the README can arrive later if it's missed.
- Updating `_forums_master_plan/spec-tracker.md` to mark 1.7 complete — Eric owns the tracker.

---

## Out-of-band notes for Eric

### Documentation safety

This spec is designed to be **additive-only to documentation**. The existing `06-testing.md` `AbstractIntegrationTest` example stays valid; we add a sibling paragraph. The `execute-plan-forums` skill gets a one-line edit. No past plans or specs are invalidated — the 5 migrated test classes already have JavaDocs saying "Spec 1.7 will refactor this," so this spec delivers on an already-documented promise.

### Tracker drift

`_forums_master_plan/spec-tracker.md` currently shows Specs 1.4, 1.5, and 1.7 as ⬜ (not started), but the git log on `claude/forums/round3-forums-wave` has commits for 1.4 and 1.5. The tracker is cosmetically behind; no functional impact on this spec. You may want to flip 1.4 and 1.5 to ✅ as part of a housekeeping pass.

### 1.6/1.7 reorder

This spec runs BEFORE Spec 1.6 (User Me Endpoint) — reversing the master plan's order. Rationale is in "Why this spec exists now" above. When you execute 1.6 next, the User Me endpoint's integration test should `extend AbstractIntegrationTest` (or `AbstractDataJpaTest` if it's a repository slice test) directly from day one — no per-class `@Container` setup. Saves a later cleanup pass.

### Shared branch convention

Spec content header records `**Branch:** claude/forums/round3-forums-wave` matching prior Forums Wave specs. Per established convention on the Forums Wave, per-spec branches are not used — commits for each spec land directly on the integration branch. If you want to switch to per-spec branches going forward, say the word and I'll create `claude/forums/forums-spec-1-7` for this one.
