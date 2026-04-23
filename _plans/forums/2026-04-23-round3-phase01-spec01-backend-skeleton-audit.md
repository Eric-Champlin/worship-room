# Forums Wave Plan: Spec 1.1 — Audit and Rename Backend Skeleton

**Spec:** `_specs/forums/round3-phase01-spec01-backend-skeleton-audit.md`
**Master Plan:** `_forums_master_plan/round3-master-plan.md` → Spec 1.1
**Date:** 2026-04-23
**Branch:** `claude/forums/round3-forums-wave`
**Phase:** 1 — Backend Foundation
**Size:** L
**Risk:** Medium

---

## Affected Frontend Routes

N/A — backend-only spec. `/verify-with-playwright` should be skipped.

---

## Universal Rules Checklist

- [x] Rule 1: No git operations by CC — plan contains NO `git commit`, `git push`, `git checkout`, `git reset`, `git stash`. `git mv` is used ONLY as a content-neutral file-system rename (required to preserve git blame across the package move); it does not change branch state or history.
- [x] Rule 2: Master Plan Quick Reference read — Phase 1 overview confirms this spec renames ONLY; new packages (auth, user, etc.) are Spec 1.2+.
- [N/A] Rule 3: Liquibase — no schema changes in this spec.
- [N/A] Rule 4: OpenAPI — no API surface changes; `openapi.yaml` grep confirmed no `com.example.worshiproom` references.
- [N/A] Rule 5: Copy Deck — no user-facing copy.
- [x] Rule 6: Tests — no new tests written. The existing ~280-test suite is the safety net; all must stay green.
- [N/A] Rule 7: `wr_*` localStorage keys — no frontend changes.
- [N/A] Rule 8: BB-45 anti-pattern — no frontend reactive-store changes.
- [N/A] Rule 9: Accessibility — no UI changes.
- [N/A] Rule 10: Performance — no UI changes; bundle size unaffected.
- [N/A] Rule 11: Brand voice — no user-facing strings.
- [N/A] Rule 12: Anti-pressure design — no user-visible surface.
- [N/A] Rule 13: Crisis detection — no user-generated content touched.
- [N/A] Rule 14: Plain-text content — no user content surfaces.
- [x] Rule 15: Rate limiting — the existing `RateLimitFilter` ordering and `/api/v1/proxy/**` scoping MUST survive the rename; Step 8 includes a 429 regression check.
- [x] Rule 16: Respect existing patterns — preserves all filter ordering, advice scoping, exception-handler semantics, and controller `@RequestMapping` paths verbatim; legacy `/api/health` and `/api/hello` endpoints preserved (frontend `api/client.ts:37,41` still uses them).
- [N/A] Rule 17: Per-phase cutover — Spec 1.1 is not a cutover spec (Spec 1.10 is the Phase 1 cutover).

---

## Architecture Context

### Current baseline (as of 2026-04-23 on branch `claude/forums/round3-forums-wave`)

**Java source tree under `com.example.worshiproom/`:**

- `backend/src/main/java/com/example/worshiproom/` — **52 files**
    - `WorshipRoomApplication.java` (root; `@SpringBootApplication` with default scanning)
    - `config/` — `ProxyConfig.java` (`@Configuration @ConfigurationProperties(prefix = "proxy")`), `CorsConfig.java`
    - `controller/` — `ApiController.java` (exposes `/api/health`, `/api/v1/health`, `/api/hello`)
    - `proxy/common/` — 13 files: shared exceptions (`ProxyException`, `UpstreamException`, `UpstreamTimeoutException`, `RateLimitExceededException`, `SafetyBlockException`), DTOs (`ProxyResponse`, `ProxyError`), filters (`RequestIdFilter`, `RateLimitFilter`), advices (`ProxyExceptionHandler`, `RateLimitExceptionHandler`), helpers (`IpResolver`)
    - `proxy/ai/` — 26 files: Gemini Explain/Reflect, Ask (AI-1), Prayer (AI-2), JournalReflection (AI-3), including controllers, services, DTOs, prompts, crisis detectors
    - `proxy/maps/` — 6 files: `MapsController`, `GoogleMapsService`, `MapsCacheKeys`, request/response DTOs
    - `proxy/bible/` — 4 files: `FcbhController`, `FcbhService`, `FcbhCacheKeys`, `FcbhNotFoundException`
- `backend/src/test/java/com/example/worshiproom/` — **34 files** mirroring main tree

**Files containing `com.example.worshiproom` references:** 88 (verified via `grep -rln 'com\.example\.worshiproom' backend/src/ | wc -l`):

- 86 `.java` files (package + import statements; plus one annotation `basePackages` attribute; plus one JavaDoc `{@code ...}` tag)
- `backend/src/main/resources/application-dev.properties` (line 5: `logging.level.com.example.worshiproom=DEBUG`)
- `backend/src/main/resources/application-prod.properties` (line 5: `logging.level.com.example.worshiproom=INFO`)

**`pom.xml`** separately references `<groupId>com.example</groupId>` at line 15 (only `com.example` occurrence in the file — does NOT contain the full `com.example.worshiproom` path).

**Files that do NOT need changes (verified by grep):**

- `backend/src/main/resources/application.properties` — no package refs
- `backend/src/main/resources/logback-spring.xml` — no package refs (uses `service: worship-room-backend` label only)
- `backend/src/main/resources/openapi.yaml` — no package refs
- `backend/Dockerfile` — pure Maven + Java build, no package-aware commands
- `docker-compose.yml` — healthcheck uses `/actuator/health` (NOT `/api/v1/health` as the spec approach text implies); this is pre-existing and outside spec scope (see Edge Cases table below)
- `backend/.mvn/maven.config`, `backend/.mvn/settings.xml`, `backend/.mvn/wrapper/` — no package refs
- `backend/.env.example`, `backend/.env.local` — no package refs

### `@RestControllerAdvice` inventory (must survive the rename)

Two advices exist (both in `proxy/common/`):

1. **`ProxyExceptionHandler`** — `@RestControllerAdvice(basePackages = "com.example.worshiproom.proxy")` at line 16. Package-scoped to catch only proxy-thrown exceptions. Handlers: `FcbhNotFoundException` → 404, `ProxyException` (base) → varies, `MethodArgumentNotValidException` / `ConstraintViolationException` / `HandlerMethodValidationException` / `MissingServletRequestParameterException` → 400, `Throwable` → 500. Its `basePackages` attribute MUST be updated to `"com.worshiproom.proxy"` as part of the rename.
2. **`RateLimitExceptionHandler`** — `@RestControllerAdvice` (no `basePackages`) at line 25. Deliberately unscoped because it handles `RateLimitExceededException` raised from a servlet filter — package-scoped advices are silently skipped when `handler==null`. Its class-level JavaDoc (line 17) references the OTHER advice's `basePackages` string `"com.example.worshiproom.proxy"` in `{@code ...}` — this reference MUST also be updated.

### `@ComponentScan` / `@SpringBootApplication(scanBasePackages=...)` inventory

- `WorshipRoomApplication.java` uses plain `@SpringBootApplication` (default scanning, follows the annotated class's own package). NO hardcoded `scanBasePackages` — no change needed to the annotation; it will automatically scan the new package after the class is moved.
- `ProxyConfig.java` uses `@Configuration @ConfigurationProperties(prefix = "proxy")` — no package path embedded.
- `CorsConfig.java` uses `@Configuration` — no package path embedded.

### Dev-profile log suppressions (Universal Rule 15 / `07-logging-monitoring.md`)

`application-dev.properties` contains two narrow framework-class suppressions that MUST survive the rename unchanged:

- `logging.level.org.springframework.web.servlet.mvc.method.annotation=INFO`
- `logging.level.org.springframework.web.reactive.function.client.ExchangeFunctions=INFO`
- Also: `logging.level.org.springframework.web.servlet.DispatcherServlet=INFO`, `logging.level.org.springframework.web.HttpLogging=INFO`

These target **framework packages**, not `com.example.worshiproom`. They are structurally unaffected by the rename but MUST be re-verified post-rename via the key-leak grep regression check (Step 8).

### Frontend call-site inventory for legacy endpoints

- `frontend/src/api/client.ts:37` calls `/api/health`
- `frontend/src/api/client.ts:41` calls `/api/hello`

Both endpoints are preserved as-is in this spec (guardrail: do NOT change `ApiController.java`'s `@RequestMapping("/api")`). Retirement of `/api/health` and `/api/hello` would be a separate follow-up spec.

---

## Database Changes

None — rename is pure Java/config. No Liquibase changesets.

---

## API Changes

None — public API surface preserved identically:

- `/api/health` (legacy) — preserved
- `/api/v1/health` (current; reports `providers.*.configured`) — preserved
- `/api/hello` (legacy) — preserved
- `/api/v1/proxy/ai/*` — preserved
- `/api/v1/proxy/maps/*` — preserved
- `/api/v1/proxy/bible/*` — preserved

---

## Assumptions & Pre-Execution Checklist

- [ ] Key Protection Wave Specs 1–4 merged into `main` (current repo state confirms all four shipped)
- [ ] `./mvnw test` green on branch `claude/forums/round3-forums-wave` before starting (~280 tests expected to pass)
- [ ] Backend env keys populated in `backend/.env.local` (at least two of `GEMINI_API_KEY`, `GOOGLE_MAPS_API_KEY`, `FCBH_API_KEY`) — needed for the runtime smoke test in Step 8
- [ ] Docker Desktop running (optional; only needed for the `docker compose up --build backend` verification in Step 9)
- [ ] No in-flight uncommitted changes elsewhere in the repo beyond this spec's deliverables (rename is atomic — mixing it with unrelated edits makes bisecting regressions harder)
- [ ] Backend compiles cleanly on `main`: `./mvnw -f backend compile`
- [ ] `backend/README.md` does NOT exist today (confirmed via `Read` tool). The spec's directive "Document the current state in `backend/README.md`" is interpreted as CREATE this file; a placeholder scaffold is provided in Step 10.
- [ ] No Liquibase changeset filename collisions — N/A (no changesets in this spec)

---

## Spec-Category-Specific Guidance

**This is a BACKEND-ONLY REFACTOR spec.** It creates no new packages, no new endpoints, no schema changes, and writes no new tests. The existing test suite IS the safety net. Execution follows the pattern:

1. Baseline capture BEFORE any changes (file counts, `@RestControllerAdvice` locations, test-suite green)
2. Physical file move (`git mv` preserves blame across the rename)
3. Textual replacement of all `com.example.worshiproom` → `com.worshiproom` across Java source
4. `basePackages` attribute update on the package-scoped advice
5. `pom.xml` groupId update
6. Properties file logging-level key updates
7. Compile — first green light
8. Test suite — second green light (and the primary regression check)
9. Runtime smoke — third green light (manual curl tests; exercises filter chain, advice scoping, and upstream WebClient calls end-to-end)
10. Create `backend/README.md` project tour

**The spec recommends IntelliJ's Refactor → Rename Package.** This plan is scripted because `/execute-plan-forums` executes in CC, not IntelliJ. The scripted approach is safe for this specific case because all 185 occurrences across 88 files are one of four unambiguous forms:

- `package com.example.worshiproom...;` (package declaration)
- `import com.example.worshiproom...;` (import statement)
- `com.example.worshiproom` as the full value of a string attribute or JavaDoc `{@code ...}` tag
- `logging.level.com.example.worshiproom=<LEVEL>` (properties file key)

No partial matches, no ambiguous substrings — `sed` is safe here because the input is structurally uniform, NOT because the spec's general warning is wrong. **If the user prefers IntelliJ:** do the Refactor → Rename Package in IntelliJ BEFORE invoking `/execute-plan-forums`. Steps 2–3 of this plan will detect the already-moved files and become no-ops; Step 4 (`basePackages` attribute) still runs because IntelliJ sometimes misses `{@code ...}` JavaDoc references; Step 5 onward is unchanged.

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Rename method: IntelliJ vs. scripted | Scripted `git mv` + explicit per-file search-and-replace | `/execute-plan-forums` runs in CC, not IntelliJ. The specific grep inventory (185 refs / 88 files / 4 uniform forms) shows zero partial-match risk. Safety net is compile + 280-test suite. If the user prefers IntelliJ, they do it before `/execute-plan-forums` and Steps 2–3 become no-ops. |
| `pom.xml` groupId | `com.worshiproom` (not `com.worshiproom.backend`) | Spec Approach section permits either: "`com.worshiproom` top-level" is the simpler choice and matches the package path. |
| `artifactId` | Leave as `worship-room-backend` | Not mentioned in spec; changing it would ripple into `target/*.jar` naming and Dockerfile `COPY --from=build /app/target/*.jar` (which uses a wildcard, so no ripple even if it did change, but leaving it untouched minimizes risk). |
| Legacy `/api/health` and `/api/hello` | Preserved — do NOT change `ApiController.java`'s `@RequestMapping` | Spec guardrail (line 107): "Do NOT change `ApiController.java`'s `@RequestMapping('/api')` annotation to `'/api/v1'`". Frontend `api/client.ts:37,41` uses `/api/health` and `/api/hello` — retirement is a separate spec. |
| `docker-compose.yml` healthcheck URL uses `/actuator/health` not `/api/v1/health` | Leave unchanged | Spec's "verify the existing `/api/v1/health` endpoint is used" turned out to be false on disk — the current healthcheck targets `/actuator/health`, which is a valid Spring Boot Actuator endpoint that's already exposed (`management.endpoints.web.exposure.include=health,info`). Changing it would be scope creep (and would need its own smoke test). This is documented in the plan so the deviation is visible on the record. |
| Empty `com/example/` directory after the rename | Delete the empty `com/example/worshiproom/` and `com/example/` directories post-move (main + test trees) | Leaving empty directories would be confusing and might surface in IntelliJ as orphaned package folders. `git mv` leaves the source empty; `rmdir` removes it. |
| `RateLimitExceptionHandler.java` JavaDoc `{@code com.example.worshiproom.proxy}` reference | Update to `{@code com.worshiproom.proxy}` as part of Step 3 | This is a textual comment reference; IntelliJ's refactor usually updates `{@code ...}` tags but not always. Explicitly handled in the Step 3 grep-then-rewrite pass. |
| New `backend/README.md` scope | Short project tour (filter chain, proxy subpackages, three upstreams, health endpoint, env-var onboarding link to `.env.example`) — NOT exhaustive API docs | Spec says "Document the current state... tour of the actual current structure". A 60–100-line README matching that scope. Does NOT duplicate `03-backend-standards.md` or `_forums_master_plan/round3-master-plan.md`. |
| Running `spring-boot:run` in Step 8 | Run in the background via `run_in_background=true` and `curl` against it | `spring-boot:run` is a long-lived foreground process. Background it, poll for readiness, curl, then kill it. |

---

## Implementation Steps

### Step 1: Pre-flight inventory and baseline capture

**Objective:** Record the exact current state so the post-rename state can be verified against an objective baseline.

**Files to create/modify:** None — this step only reads.

**Details:**

Record these numbers to the plan's Execution Log or to a scratch note:

```bash
# File counts
find backend/src/main/java/com/example/worshiproom/ -name "*.java" | wc -l   # expect 52
find backend/src/test/java/com/example/worshiproom/ -name "*.java" | wc -l   # expect 34

# Reference counts
grep -rln 'com\.example\.worshiproom' backend/src/ backend/pom.xml backend/src/main/resources/ | wc -l   # expect 88
grep -rn 'com\.example\.worshiproom' backend/src/ backend/pom.xml backend/src/main/resources/ | wc -l   # expect 185

# @RestControllerAdvice inventory
grep -rn '@RestControllerAdvice' backend/src/main/java/
# Expect exactly two classes:
#   proxy/common/ProxyExceptionHandler.java:16  →  basePackages = "com.example.worshiproom.proxy"
#   proxy/common/RateLimitExceptionHandler.java:25  →  (no basePackages)

# Test suite green on current tree
./mvnw -f backend test
# Expect: BUILD SUCCESS, ~280 tests, 0 failures, 0 errors
```

**Guardrails (DO NOT):**

- DO NOT start the rename if `./mvnw test` is red on the current tree — the rename's safety net is a green baseline.
- DO NOT proceed if file counts differ from the expected 52/34 — means the tree has drifted since plan authoring and Step 8's grep verifications may be wrong.

**Verification:**

- [ ] File counts recorded (main=52, test=34, total=86)
- [ ] Reference counts recorded (88 files / 185 occurrences)
- [ ] Two advices confirmed (ProxyExceptionHandler package-scoped; RateLimitExceptionHandler unscoped)
- [ ] `./mvnw test` reports BUILD SUCCESS with ~280 tests passing

**Expected state after completion:**

- [ ] Baseline numbers captured for comparison in Step 8 and Step 11
- [ ] No files have been changed

---

### Step 2: Physical rename of main + test source trees via `git mv`

**Objective:** Move all source files from `com/example/worshiproom/` to `com/worshiproom/` while preserving git blame history. File contents are unchanged at this point (package declarations inside the files still read `com.example.worshiproom`, which Step 3 fixes).

**Files to create/modify:**

- `backend/src/main/java/com/example/worshiproom/` → `backend/src/main/java/com/worshiproom/` (entire subtree, 52 files + directories)
- `backend/src/test/java/com/example/worshiproom/` → `backend/src/test/java/com/worshiproom/` (entire subtree, 34 files + directories)

**Details:**

```bash
# Main tree
mkdir -p backend/src/main/java/com/worshiproom
git mv backend/src/main/java/com/example/worshiproom/* backend/src/main/java/com/worshiproom/
rmdir backend/src/main/java/com/example/worshiproom
rmdir backend/src/main/java/com/example

# Test tree
mkdir -p backend/src/test/java/com/worshiproom
git mv backend/src/test/java/com/example/worshiproom/* backend/src/test/java/com/worshiproom/
rmdir backend/src/test/java/com/example/worshiproom
rmdir backend/src/test/java/com/example
```

Note: `git mv <src>/*` moves the CHILDREN of `com/example/worshiproom/` (the immediate subdirectories `config/`, `controller/`, `proxy/`, `WorshipRoomApplication.java`) into the new parent `com/worshiproom/`, preserving the internal subpackage structure. After the move, the source directory is empty and is removed by `rmdir`.

**Guardrails (DO NOT):**

- DO NOT use `mv` (non-git) — `git mv` preserves blame/history across the move; plain `mv` makes the tree think the files are deleted+recreated.
- DO NOT use `rm -rf backend/src/main/java/com/example` — use `rmdir` so the command fails loudly if the directory isn't empty (which would mean a file was missed).
- DO NOT modify file contents in this step — package declarations still read `com.example.worshiproom`; Step 3 rewrites them.

**Verification:**

```bash
# New tree has expected file counts
find backend/src/main/java/com/worshiproom/ -name "*.java" | wc -l   # expect 52
find backend/src/test/java/com/worshiproom/ -name "*.java" | wc -l   # expect 34

# Old tree is gone
[ ! -d backend/src/main/java/com/example ] && echo "old main tree gone"
[ ! -d backend/src/test/java/com/example ] && echo "old test tree gone"

# Git sees the moves as renames (not delete+add)
git -C backend status | head -20   # expect "renamed: ..." lines, not "deleted: ... new file: ..."
```

**Expected state after completion:**

- [ ] Both trees physically moved to `com/worshiproom/`
- [ ] Old `com/example/` directories removed (main + test)
- [ ] File counts match baseline (52/34)
- [ ] `git status` shows the changes as renames (preserving blame)
- [ ] Compile will FAIL at this point because package declarations inside the files are now mismatched — this is expected and fixed in Step 3.

---

### Step 3: Rewrite package declarations and imports across all moved source files

**Objective:** Update every `package com.example.worshiproom...;` and `import com.example.worshiproom...;` (and every JavaDoc `{@code com.example.worshiproom...}` reference) across the moved Java tree to use the new package path `com.worshiproom`.

**Files to create/modify:** 86 `.java` files under `backend/src/main/java/com/worshiproom/` and `backend/src/test/java/com/worshiproom/`.

**Details:**

Use a single find + in-place replacement pass across all `.java` files under `backend/src/`:

```bash
find backend/src -name "*.java" -type f -exec sed -i '' 's|com\.example\.worshiproom|com.worshiproom|g' {} +
```

(Note: `sed -i ''` is the macOS BSD syntax. On Linux, use `sed -i 's|...|...|g'` without the `''`.)

This rewrites:

- Every `package com.example.worshiproom...;` declaration (one per file)
- Every `import com.example.worshiproom...;` statement (many per file)
- Every `{@code com.example.worshiproom...}` JavaDoc reference (notably in `RateLimitExceptionHandler.java:17`)
- Every `"com.example.worshiproom..."` string literal — there is exactly one, in `ProxyExceptionHandler.java:16`'s `basePackages = "com.example.worshiproom.proxy"` attribute. This is handled correctly by the global sed since `com.example.worshiproom` is its complete prefix.

**Guardrails (DO NOT):**

- DO NOT restrict the find to a specific subdirectory — the whole `backend/src/` tree needs the same transformation.
- DO NOT skip the test tree — integration tests import from `com.example.worshiproom.proxy.common.*` etc. and will fail to compile without the update.
- DO NOT extend the replacement to non-`.java` files in this step — properties files are handled in Step 5, `pom.xml` in Step 6. Separating them keeps each step's blast radius small.

**Verification:**

```bash
# Zero old references in any Java file
grep -rln 'com\.example\.worshiproom' backend/src/*.java 2>/dev/null
grep -rln 'com\.example\.worshiproom' backend/src/main/java/ backend/src/test/java/ | wc -l   # expect 0

# Every moved file has a new package declaration
grep -l '^package com\.worshiproom' backend/src/main/java/com/worshiproom/**/*.java | wc -l   # expect 52 (via bash glob; or use find)
grep -rl '^package com\.worshiproom' backend/src/main/java/com/worshiproom/ | wc -l   # expect 52
grep -rl '^package com\.worshiproom' backend/src/test/java/com/worshiproom/ | wc -l   # expect 34

# Spot-check that @RestControllerAdvice basePackages attribute was updated
grep -n 'basePackages' backend/src/main/java/com/worshiproom/proxy/common/ProxyExceptionHandler.java
# Expected output:
#   16:@RestControllerAdvice(basePackages = "com.worshiproom.proxy")

# Spot-check that RateLimitExceptionHandler JavaDoc was updated
grep -n 'com\.worshiproom\.proxy' backend/src/main/java/com/worshiproom/proxy/common/RateLimitExceptionHandler.java
# Expected: a line near 17 mentioning basePackages="com.worshiproom.proxy"
```

**Expected state after completion:**

- [ ] Zero `com.example.worshiproom` occurrences in any `.java` file under `backend/src/`
- [ ] All 52 main tree files have `package com.worshiproom...;` declarations
- [ ] All 34 test tree files have `package com.worshiproom...;` declarations
- [ ] `ProxyExceptionHandler` `basePackages` attribute reads `"com.worshiproom.proxy"`
- [ ] `RateLimitExceptionHandler` JavaDoc reference reads `"com.worshiproom.proxy"`
- [ ] Step 4's `./mvnw compile` is expected to SUCCEED at this point.

---

### Step 4: Explicit verification of `@RestControllerAdvice` advice scoping

**Objective:** The single most-likely silent-failure surface in this rename is the `ProxyExceptionHandler`'s `basePackages` attribute. If sed somehow missed it, the advice would silently stop catching proxy exceptions and every 502/504/etc. would fall through to the Spring whitelabel error page instead of the standard `ProxyError` shape. This step is a dedicated sanity check BEFORE compile, because catching it now is cheaper than debugging a 500 in Step 9's runtime smoke.

**Files to create/modify:** None — verification only. Edits only if a defect is detected.

**Details:**

```bash
# ProxyExceptionHandler: must read basePackages = "com.worshiproom.proxy"
grep -A 1 '@RestControllerAdvice' backend/src/main/java/com/worshiproom/proxy/common/ProxyExceptionHandler.java

# RateLimitExceptionHandler: must NOT have basePackages attribute (it is intentionally unscoped)
grep -A 1 '@RestControllerAdvice' backend/src/main/java/com/worshiproom/proxy/common/RateLimitExceptionHandler.java
# Expected: @RestControllerAdvice  (no parentheses, no basePackages attribute)

# Global search: no @RestControllerAdvice anywhere should still reference com.example.worshiproom
grep -rn '@RestControllerAdvice' backend/src/main/java/ | grep 'com\.example'
# Expected: zero hits

# Global search: no scanBasePackages or @ComponentScan anywhere should reference com.example.worshiproom
grep -rn 'scanBasePackages\|@ComponentScan' backend/src/main/java/ | grep 'com\.example'
# Expected: zero hits (baseline already confirmed there are no scanBasePackages / @ComponentScan uses)
```

**If any grep finds a lingering `com.example.worshiproom` string attribute (most likely in a `basePackages` annotation),** rewrite it via targeted `Edit` tool calls on the specific file. This is the ONE place where the spec's IntelliJ warning matters most — silent advice-scoping breakage would only surface in Step 9's runtime smoke as a wrong response shape.

**Guardrails (DO NOT):**

- DO NOT proceed to Step 5 compile if any `@RestControllerAdvice` still references `com.example.worshiproom` — fix first.
- DO NOT broaden `ProxyExceptionHandler`'s scope to catch non-proxy exceptions. Its value is the narrow scoping — breaking that would mask unrelated exceptions from future Forums Wave controllers.

**Verification:**

- [ ] `ProxyExceptionHandler`'s `basePackages` attribute reads exactly `"com.worshiproom.proxy"`
- [ ] `RateLimitExceptionHandler` remains unscoped (no `basePackages`)
- [ ] No `@RestControllerAdvice`, `scanBasePackages`, or `@ComponentScan` in the source tree references the old package

**Expected state after completion:**

- [ ] Advice scoping integrity verified by explicit inspection (cheaper than discovering it broken in Step 9)

---

### Step 5: Update properties file log-level keys

**Objective:** Rewrite the two `logging.level.com.example.worshiproom=<LEVEL>` lines in dev and prod profiles so application-level logs are captured at the new package path.

**Files to create/modify:**

- `backend/src/main/resources/application-dev.properties` — line 5: `logging.level.com.example.worshiproom=DEBUG` → `logging.level.com.worshiproom=DEBUG`
- `backend/src/main/resources/application-prod.properties` — line 5: `logging.level.com.example.worshiproom=INFO` → `logging.level.com.worshiproom=INFO`

**Details:**

Use two `Edit` tool calls (or a targeted sed on only these two files):

```bash
sed -i '' 's|logging\.level\.com\.example\.worshiproom|logging.level.com.worshiproom|g' \
  backend/src/main/resources/application-dev.properties \
  backend/src/main/resources/application-prod.properties
```

**Guardrails (DO NOT):**

- DO NOT touch any other property lines. In particular, **DO NOT modify** the four framework-class log suppressions in `application-dev.properties` (`logging.level.org.springframework.web.servlet.mvc.method.annotation=INFO`, `ExchangeFunctions=INFO`, `DispatcherServlet=INFO`, `HttpLogging=INFO`). They target framework packages and are invariant across the rename. Spec guardrail: "Do NOT modify any `application-*.properties` log-suppression lines".
- DO NOT modify `application.properties` (the shared file has no package-level logging configuration).

**Verification:**

```bash
# New keys present
grep -n 'logging\.level\.com\.worshiproom' backend/src/main/resources/application-dev.properties
# Expected: 5:logging.level.com.worshiproom=DEBUG

grep -n 'logging\.level\.com\.worshiproom' backend/src/main/resources/application-prod.properties
# Expected: 5:logging.level.com.worshiproom=INFO

# Old keys gone
grep -n 'com\.example\.worshiproom' backend/src/main/resources/
# Expected: zero hits

# Framework suppressions preserved (spot-check dev profile)
grep 'logging\.level\.org\.springframework\.web' backend/src/main/resources/application-dev.properties
# Expected: 4 lines still present and unchanged:
#   logging.level.org.springframework.web=DEBUG
#   logging.level.org.springframework.web.servlet.mvc.method.annotation=INFO
#   logging.level.org.springframework.web.servlet.DispatcherServlet=INFO
#   logging.level.org.springframework.web.HttpLogging=INFO
#   logging.level.org.springframework.web.reactive.function.client.ExchangeFunctions=INFO
```

**Expected state after completion:**

- [ ] Both profile property files use `logging.level.com.worshiproom`
- [ ] Framework log suppressions (4 lines in dev, 0 in prod) unchanged

---

### Step 6: Update `pom.xml` `groupId`

**Objective:** Change Maven `<groupId>` so the JAR coordinate is `com.worshiproom:worship-room-backend`.

**Files to create/modify:** `backend/pom.xml` (line 15).

**Details:**

```xml
<!-- Before -->
<groupId>com.example</groupId>

<!-- After -->
<groupId>com.worshiproom</groupId>
```

Use `Edit`:

- `old_string`: `    <groupId>com.example</groupId>`
- `new_string`: `    <groupId>com.worshiproom</groupId>`

Leave `<artifactId>worship-room-backend</artifactId>` unchanged — it is not mentioned in the spec and changing it would alter the `target/*.jar` filename and require Dockerfile review.

**Guardrails (DO NOT):**

- DO NOT change the Spring Boot parent `<groupId>org.springframework.boot</groupId>` — that is a dependency coordinate, unrelated to this project's own groupId.
- DO NOT change any dependency `<groupId>` — all dependencies are external libraries.
- DO NOT rename `<artifactId>`.
- DO NOT add a `<version>` change — Maven doesn't require one.

**Verification:**

```bash
# Project groupId is now com.worshiproom
grep -n '<groupId>' backend/pom.xml
# Line 15 should read: <groupId>com.worshiproom</groupId>
# Other groupId lines (parent = org.springframework.boot; dependencies) unchanged

# No com.example anywhere in pom.xml
grep -n 'com\.example' backend/pom.xml
# Expected: zero hits

./mvnw -f backend help:effective-pom -q | grep -A 1 '<groupId>com.worshiproom' | head -5
# (optional) Confirms Maven resolves the new groupId without warnings
```

**Expected state after completion:**

- [ ] `backend/pom.xml` line 15 reads `<groupId>com.worshiproom</groupId>`
- [ ] No `com.example` occurrences anywhere in `backend/pom.xml`
- [ ] Maven dependencies and plugins unaffected

---

### Step 7: Final stale-reference sweep

**Objective:** Catch anything the Step 3–6 changes missed across the entire `backend/` tree (excluding `target/`, which contains stale bytecode artifacts that will be regenerated on the next build).

**Files to create/modify:** None — verification only. Fixes applied via `Edit` if any surprises surface.

**Details:**

```bash
# Anywhere in backend/ (excluding target/) referencing the old package path
find backend -path '*/target/*' -prune -o -type f \
  \( -name "*.java" -o -name "*.properties" -o -name "*.xml" -o -name "*.yaml" -o -name "*.yml" -o -name "Dockerfile" -o -name "*.md" -o -name ".env*" \) \
  -print 2>/dev/null | xargs grep -l 'com\.example' 2>/dev/null

# Expected output: empty (no hits)
```

Any hit here is investigated immediately. Possible surprises not caught by the previous steps:

- String literals in `@Value(...)` annotations — (none found in baseline; would be caught by compile anyway since `@Value` that references a removed property key fails bean creation)
- Class-reference strings in reflection / `Class.forName(...)` calls — (none found in baseline)
- Comments in `openapi.yaml` or `.mvn/settings.xml` — (grep returned zero hits)
- Any `.md` file in `backend/` — `backend/README.md` does not exist; the repo `README.md` at repo root does NOT mention `com.example.worshiproom`

**Guardrails (DO NOT):**

- DO NOT include `backend/target/` in the grep — it will contain stale `.class` files with the old package path in bytecode. These are regenerated on `./mvnw clean compile` (Step 8).

**Verification:**

- [ ] `find ... | xargs grep -l 'com\.example'` returns zero hits anywhere in `backend/` excluding `target/`

**Expected state after completion:**

- [ ] Source tree is free of stale `com.example.worshiproom` references (main source, tests, properties, pom, openapi, Dockerfile, etc.)

---

### Step 8: Clean compile + full test suite

**Objective:** Primary safety-net verification — the full 280-test suite must stay green. Any compile error or test failure at this point is a regression that must be fixed before proceeding.

**Files to create/modify:** None — regenerates `backend/target/` artifacts.

**Details:**

```bash
# Clean build artifacts (wipe stale bytecode from the old package path)
./mvnw -f backend clean

# Compile
./mvnw -f backend compile
# Expected: BUILD SUCCESS, zero unresolved-import warnings

# Full test suite (main + tests)
./mvnw -f backend test
# Expected: BUILD SUCCESS, ~280 tests, 0 failures, 0 errors, 0 skipped (or same skipped count as baseline)
```

If any tests fail, read the failure message carefully before reacting:

- `ClassNotFoundException` / `NoClassDefFoundError` → sed missed a file; re-run Step 3's find+grep verification
- `@RestControllerAdvice` not catching exceptions → Step 4's basePackages attribute not updated; re-verify
- Bean-creation failure mentioning `@Value` or `@ConfigurationProperties` → a string reference to the old package somewhere in an annotation; run Step 7's sweep again with stricter grep
- Any integration test failing with HTTP 500 instead of the expected `ProxyError` shape → the ProxyExceptionHandler advice is not being picked up; Step 4's check failed silently

**Guardrails (DO NOT):**

- DO NOT suppress failing tests with `@Disabled`. Any failure post-rename is a regression.
- DO NOT modify test assertions to make them pass. If a test was previously green and is now red, the rename broke something.
- DO NOT skip `./mvnw clean` — without it, stale `target/classes/` artifacts from the old package path could mask real problems.

**Verification:**

- [ ] `./mvnw -f backend compile` produces BUILD SUCCESS
- [ ] `./mvnw -f backend test` produces BUILD SUCCESS with the same test count as the baseline (~280) and zero failures
- [ ] No tests disabled, no assertions weakened

**Expected state after completion:**

- [ ] Code compiles and all tests pass on the renamed tree
- [ ] Confidence that the static behavior of the refactor is clean

---

### Step 9: Runtime smoke test — start the app, exercise all three proxy upstreams, and run the three regression checks

**Objective:** Exercise the full filter chain, advice scoping, CORS, rate limiting, upstream WebClient calls, and log-suppression discipline end-to-end. This is the spec's primary post-rename sanity gate — four of the five spec acceptance criteria (items 5–9, 11) verify here.

**Files to create/modify:** None. Produces a transient backend log at a known path for grep verification.

**Details:**

```bash
# 1. Start the backend in dev profile in the background, capturing logs to /tmp/backend.log
mkdir -p /tmp
./mvnw -f backend spring-boot:run -Dspring-boot.run.profiles=dev \
  > /tmp/backend.log 2>&1 &
BACKEND_PID=$!

# Wait for startup (health endpoint 200)
until curl -sfo /dev/null http://localhost:8080/api/v1/health; do
  sleep 2
  # Bail out if the process died
  kill -0 $BACKEND_PID 2>/dev/null || { echo "Backend failed to start — check /tmp/backend.log"; exit 1; }
done

# 2. Health-endpoint regression check (spec AC 5, 11)
curl -s http://localhost:8080/api/v1/health | jq
# Expected: JSON with status="ok" and providers.gemini.configured, .googleMaps.configured, .fcbh.configured all booleans.
# If any env var is missing in backend/.env.local, that provider reports configured:false — that's fine; the shape is what matters.

# Also verify legacy aliases still serve:
curl -s http://localhost:8080/api/health | jq    # Should match /api/v1/health body
curl -s http://localhost:8080/api/hello | jq     # Should return {"message":"Hello"}

# 3. Three proxy endpoint round-trips (spec AC 6)
# Gemini Explain (requires GEMINI_API_KEY configured)
curl -s -X POST http://localhost:8080/api/v1/proxy/ai/explain \
  -H "Content-Type: application/json" \
  -d '{"reference":"John 3:16","verseText":"For God so loved the world..."}' | jq
# Expected: ProxyResponse shape: {"data":{"content":"..."},"meta":{"requestId":"..."}}

# Google Maps Geocode (requires GOOGLE_MAPS_API_KEY configured)
curl -s "http://localhost:8080/api/v1/proxy/maps/geocode?query=Nashville+TN" | jq
# Expected: ProxyResponse shape with geocoded lat/lng

# FCBH filesets (requires FCBH_API_KEY configured)
curl -s "http://localhost:8080/api/v1/proxy/bible/filesets/EN1WEBN2DA/JHN/3" | jq
# Expected: ProxyResponse shape with audio chapter metadata

# 4. Filter ordering regression check (spec testing note 1) — 130 rapid calls exceed dev's 120/min limit
for i in $(seq 1 130); do
  curl -s -o /dev/null -w '%{http_code} ' \
    -X POST http://localhost:8080/api/v1/proxy/ai/explain \
    -H "Content-Type: application/json" \
    -d '{"reference":"John 3:16","verseText":"For God so loved the world..."}'
done; echo
# Expected: mostly 200/502 codes, then transitioning to 429 once bucket is drained.
# Crucial: at least one 429 response should appear.
# Inspect the 429 response headers:
curl -s -I -X POST http://localhost:8080/api/v1/proxy/ai/explain \
  -H "Content-Type: application/json" \
  -d '{"reference":"John 3:16","verseText":"x"}' | head -15
# Expected headers on the 429: Retry-After, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, X-Request-Id
# If 429 never appears or is missing Retry-After, RateLimitFilter ordering or scoping has regressed.

# 5. Advice scoping regression check (spec testing note 2) — trigger an UpstreamException
# The simplest trigger is a Gemini call with a malformed body that the upstream rejects, OR
# verifying that an invalid JSON body returns the ProxyError shape (BadRequest handler path):
curl -s -X POST http://localhost:8080/api/v1/proxy/ai/explain \
  -H "Content-Type: application/json" \
  -d '{"reference":""}' | jq
# Expected: ProxyError shape: {"code":"INVALID_INPUT","message":"reference: must not be blank","requestId":"...","timestamp":"..."}
# NOT a Spring whitelabel error page (which would be HTML starting with <!doctype html>).
# If the response is HTML or the JSON shape is different, ProxyExceptionHandler.basePackages was broken by the rename.

# 6. Log-suppression regression check (spec testing note 3, spec AC 8)
grep -iE 'aiza|key=|signature=' /tmp/backend.log | wc -l
# Expected: 0
# If non-zero, the two log-suppression lines in application-dev.properties (targeting framework packages)
# are not working correctly post-rename. They should be unchanged — but verify.

# 7. Tear down
kill $BACKEND_PID
wait $BACKEND_PID 2>/dev/null
```

**Guardrails (DO NOT):**

- DO NOT commit or push `/tmp/backend.log`.
- DO NOT leave the backend process running after verification.
- DO NOT skip the 429 regression check — it is the primary evidence that `RateLimitFilter` survived the rename with its ordering and scoping intact.
- DO NOT skip the advice-scoping regression check — it is the primary evidence that `ProxyExceptionHandler` still catches proxy exceptions with the correct `basePackages` attribute.

**Verification:**

- [ ] Backend starts cleanly in dev profile without startup errors
- [ ] `/api/v1/health`, `/api/health`, `/api/hello` all respond with the expected shapes
- [ ] All three proxy upstreams round-trip correctly (assuming keys are configured in `.env.local`)
- [ ] Rate limiter emits 429 with `Retry-After` + full `X-RateLimit-*` headers after burst exhaustion
- [ ] Validation errors return `ProxyError` shape (not whitelabel HTML)
- [ ] `grep -iE 'aiza|key=|signature=' /tmp/backend.log` returns zero matches

**Expected state after completion:**

- [ ] End-to-end behavior is identical to pre-rename; no regressions
- [ ] Log-suppression discipline intact

---

### Step 10: Create `backend/README.md`

**Objective:** Document the post-Key-Protection-Wave backend structure so a new contributor can navigate it without reading the full master plan.

**Files to create/modify:** `backend/README.md` (new file).

**Details:**

Create a project tour with the following sections (~60–100 lines of markdown):

1. **What this is** — one-paragraph summary: Spring Boot 3.x backend that proxies three upstream APIs (Gemini, Google Maps, FCBH) so their keys never reach the frontend; Forums Wave will add auth, persistence, and domain services on top.
2. **Project structure** — tree view of `src/main/java/com/worshiproom/`:
    - `WorshipRoomApplication.java` (entrypoint)
    - `config/` — `ProxyConfig` (binds `proxy.*` props, exposes WebClient + IpResolver beans), `CorsConfig`
    - `controller/ApiController` — `/api/health`, `/api/v1/health`, `/api/hello`
    - `proxy/common/` — shared exceptions, DTOs (`ProxyResponse`, `ProxyError`), filters (`RequestIdFilter`, `RateLimitFilter`), advices (`ProxyExceptionHandler`, `RateLimitExceptionHandler`), helpers (`IpResolver`)
    - `proxy/ai/` — Gemini Explain/Reflect (BB-30/31), Ask (AI-1), Prayer (AI-2), JournalReflection (AI-3)
    - `proxy/maps/` — Google Maps Geocode + Places + PlacePhoto
    - `proxy/bible/` — FCBH DBP v4 (listAudioBibles, per-chapter filesets)
3. **Filter chain** — one-sentence summary of `RequestIdFilter` (HIGHEST_PRECEDENCE, sets MDC + `X-Request-Id`) and `RateLimitFilter` (HIGHEST_PRECEDENCE + 10, scoped to `/api/v1/proxy/**` via `shouldNotFilter`, bucket4j + Caffeine bounded bucket map).
4. **Caches** — three Caffeine cache layers (per upstream, bounded by size + TTL) live in the service classes, not in a shared cache manager.
5. **Health endpoint** — `/api/v1/health` reports `providers.{gemini,googleMaps,fcbh}.configured` booleans so a deploy can verify env-var wiring without needing a live upstream call. `/api/health` is a legacy alias preserved for backward compatibility.
6. **Local dev setup** — copy `backend/.env.example` to `backend/.env.local`, fill in upstream keys (or leave blank for the provider to report `configured:false`), then `./mvnw spring-boot:run` or `docker compose up backend`.
7. **Key files referenced by rules** — pointer to `.claude/rules/03-backend-standards.md` (conventions), `02-security.md` (rate limiting, XFF), `07-logging-monitoring.md` (PII rules, framework log suppressions).
8. **What's next (Forums Wave Phase 1+)** — pointer to `_forums_master_plan/round3-master-plan.md` for the 156-spec plan; Spec 1.2 adds Liquibase, Spec 1.3 adds the `users` table, Spec 1.4 adds Spring Security + JWT.

**Guardrails (DO NOT):**

- DO NOT duplicate the full contents of `03-backend-standards.md`, `02-security.md`, or the master plan — the README points to them, it doesn't restate them.
- DO NOT include API docs for every endpoint — that's what `openapi.yaml` and Swagger UI at `/api/docs` are for.
- DO NOT mention Liquibase, PostgreSQL, JWT, or any other not-yet-shipped Phase 1+ tech as if it exists today. The README describes the **current** state.

**Verification:**

- [ ] File exists at `backend/README.md`
- [ ] Length approximately 60–100 lines (tour scope, not book scope)
- [ ] Accurate references to current package path (`com.worshiproom.*`) not old path (`com.example.worshiproom.*`)
- [ ] Points readers to the rules files and the master plan rather than duplicating them

**Expected state after completion:**

- [ ] `backend/README.md` committed as part of this plan's deliverable

---

### Step 11: Optional Docker build verification (spec AC 10, 11)

**Objective:** Verify that the Dockerized backend builds and the healthcheck in `docker-compose.yml` still passes post-rename.

**Files to create/modify:** None.

**Details:**

```bash
# Build and start just the backend service
docker compose up --build backend -d

# Wait for the healthcheck to flip to healthy
for i in $(seq 1 30); do
  STATUS=$(docker compose ps --format json backend | jq -r '.[0].Health // empty')
  echo "attempt $i: $STATUS"
  [ "$STATUS" = "healthy" ] && break
  sleep 5
done

# Verify the endpoint is actually serving
curl -s http://localhost:8080/api/v1/health | jq

# Tear down
docker compose down
```

Note: `docker-compose.yml`'s healthcheck uses `http://localhost:8080/actuator/health` (not `/api/v1/health` as the spec's Approach section suggested). Both endpoints exist in the current codebase; `/actuator/health` is what's actually exercised by the Docker healthcheck, and it works because Spring Boot Actuator is exposed in both dev and prod profiles. No change to `docker-compose.yml` in this spec.

**Guardrails (DO NOT):**

- DO NOT modify `docker-compose.yml`'s healthcheck URL in this spec. The healthcheck URL change (if any) is scope creep and belongs to a separate spec.
- DO NOT skip `--build` — the old `target/*.jar` inside any cached Docker image would contain the old package path and would work, masking a real regression.

**Verification:**

- [ ] `docker compose up --build backend` completes without errors
- [ ] Docker healthcheck reports `healthy` within 30 polling attempts (~2.5 min)
- [ ] `curl http://localhost:8080/api/v1/health` returns the expected providers shape

**Expected state after completion:**

- [ ] Dockerized backend boots and reports healthy

*Optional step — if Docker Desktop is not running, skip this step and proceed to Step 12. The core acceptance criteria (1–9) are already met by Steps 1–10; Docker verification is a nice-to-have.*

---

### Step 12: Final acceptance-criteria gate

**Objective:** Walk through all 11 spec acceptance criteria (Approach § "Acceptance criteria (v2.7)") and confirm each one.

**Files to create/modify:** None — verification only.

**Details:**

| # | Criterion | Evidence |
|---|-----------|----------|
| 1 | Group ID is `com.worshiproom` in `pom.xml` | `grep -n '<groupId>com\.worshiproom' backend/pom.xml` → line 15 |
| 2 | Package structure is `com.worshiproom.*` throughout main + test trees | `find backend/src -type d -name 'worshiproom' -path '*/com/worshiproom'` → 2 results (main, test) |
| 3 | `./mvnw clean compile` succeeds with zero unresolved-import warnings | Step 8 evidence |
| 4 | `./mvnw test` passes all ~280 pre-existing tests | Step 8 evidence; compare to baseline from Step 1 |
| 5 | `./mvnw spring-boot:run -Dspring-boot.run.profiles=dev` starts cleanly; `/api/v1/health` reports `configured:true` for providers with keys set | Step 9 evidence |
| 6 | Three proxy endpoints round-trip correctly | Step 9 evidence (Gemini Explain, Maps Geocode, FCBH filesets all returned `ProxyResponse` shape) |
| 7 | `grep -rn 'com.example.worshiproom' backend/src/` returns zero hits | `grep -rn 'com\.example\.worshiproom' backend/src/ \| wc -l` → 0 |
| 8 | `grep -iE 'aiza\|key=\|signature=' /tmp/backend.log` returns zero matches | Step 9 evidence |
| 9 | `docker compose up --build backend` builds and runs successfully | Step 11 evidence (optional step) |
| 10 | Healthcheck in docker-compose passes | Step 11 evidence (optional step) |
| 11 | README documents the current project structure | `backend/README.md` exists with accurate tour |
| 12 | `ProxyExceptionHandler` `basePackages` updated; no lingering `com.example.worshiproom.proxy` in `basePackages` attributes | Step 4 evidence; `grep -rn '@RestControllerAdvice' backend/src/main/java/ \| grep com\\.example` → 0 hits |

**Guardrails (DO NOT):**

- DO NOT claim completion if any acceptance criterion fails. Roll back and investigate.

**Verification:**

- [ ] All 12 items checked off with concrete evidence

**Expected state after completion:**

- [ ] Spec 1.1 is complete; the skeleton is ready for Spec 1.2 (Liquibase) to build on top.

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Pre-flight inventory and baseline capture |
| 2 | 1 | Physical rename of main + test source trees via `git mv` |
| 3 | 2 | Rewrite package declarations and imports across moved Java files |
| 4 | 3 | Explicit verification of `@RestControllerAdvice` advice scoping |
| 5 | 1 | Update properties file log-level keys (independent of Java rename, but checked after Step 4 for logical grouping) |
| 6 | 1 | Update `pom.xml` `groupId` (independent of Java rename, but usually done after) |
| 7 | 3, 5, 6 | Final stale-reference sweep |
| 8 | 7 | Clean compile + full test suite |
| 9 | 8 | Runtime smoke test — all three upstreams + regression checks |
| 10 | — | Create `backend/README.md` (can be written independently; gated to after Step 9 so the tour reflects verified-working state) |
| 11 | 8 | Optional Docker build verification |
| 12 | 2–11 | Final acceptance-criteria gate |

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Pre-flight inventory and baseline capture | [COMPLETE] | 2026-04-23 | Baseline: 52 main Java / 34 test Java / 88 files / 185 occurrences of `com.example.worshiproom`. Advices verified (ProxyExceptionHandler scoped, RateLimitExceptionHandler unscoped). `./mvnw test` → 280 pass / 0 fail / 0 skipped / BUILD SUCCESS. Safety backup branch: `backup/pre-execute-20260423064610`. |
| 2 | Physical rename of main + test source trees via git mv | [COMPLETE] | 2026-04-23 | 52 main + 34 test files moved to `com/worshiproom/` via `git mv`. Old `com/example/` directories removed. `git status` shows moves as `renamed:` (blame preserved). Files contents NOT yet updated — package declarations still read `com.example.worshiproom`, fixed in Step 3. |
| 3 | Rewrite package declarations and imports | [COMPLETE] | 2026-04-23 | Single `find + sed -i '' 's\|com\.example\.worshiproom\|com.worshiproom\|g'` pass across `backend/src/**/*.java`. Result: 0 old refs remaining in Java tree; 52 main + 34 test files have new `package com.worshiproom...;` declarations; `ProxyExceptionHandler.basePackages` updated to `"com.worshiproom.proxy"`; `RateLimitExceptionHandler` JavaDoc `{@code}` reference updated. |
| 4 | Verify @RestControllerAdvice advice scoping | [COMPLETE] | 2026-04-23 | `ProxyExceptionHandler` → `@RestControllerAdvice(basePackages = "com.worshiproom.proxy")`; `RateLimitExceptionHandler` → `@RestControllerAdvice` (unscoped, correct); zero `@RestControllerAdvice`/`@ComponentScan`/`scanBasePackages` references still pointing at `com.example`. |
| 5 | Update properties file log-level keys | [COMPLETE] | 2026-04-23 | `application-dev.properties:5` → `logging.level.com.worshiproom=DEBUG`; `application-prod.properties:5` → `logging.level.com.worshiproom=INFO`. Zero stale refs in `backend/src/main/resources/`. All 5 framework log-suppression lines in dev profile preserved unchanged (including the two key-leak suppressions for `method.annotation` and `ExchangeFunctions`). |
| 6 | Update pom.xml groupId | [COMPLETE] | 2026-04-23 | `pom.xml:15` → `<groupId>com.worshiproom</groupId>`. Spring Boot parent groupId (line 9) and all dependency groupIds (lines 27, 32, 37, 43, 50, 56, 63, 70, 76, 85) preserved. Zero `com.example` occurrences in pom.xml. `artifactId` unchanged per plan. |
| 7 | Final stale-reference sweep | [COMPLETE] | 2026-04-23 | `find backend -path '*/target/*' -prune ...` sweep across `.java`, `.properties`, `.xml`, `.yaml`, `.yml`, `Dockerfile`, `.md`, `.env*` returned zero files containing `com.example`. Tree is clean of the old package path. |
| 8 | Clean compile + full test suite | [COMPLETE] | 2026-04-23 | `./mvnw clean` → BUILD SUCCESS. `./mvnw compile` → 52 source files compiled cleanly (only a pre-existing deprecation warning in `RateLimitFilter.java`, unrelated to rename). `./mvnw test` → **280 pass / 0 fail / 0 skipped / BUILD SUCCESS** — identical to pre-rename baseline. Zero regression. |
| 9 | Runtime smoke test — three upstreams + regression checks | [COMPLETE] | 2026-04-23 | Backend started in dev profile with `.env.local` exported. `/api/v1/health`, `/api/health`, `/api/hello` all 200; all three providers `configured:true`. Three proxy round-trips green (Gemini Explain → 200 ProxyResponse with content; Maps Geocode Nashville → 200 with lat/lng; FCBH bibles → 200 with DBP response). Rate-limit burst (150 invalid-body req): **30×400 + 120×429** matches dev `120/min burst=30` exactly; 429 carries `Retry-After: 33` + `X-Request-Id`; 200/400 carry `X-RateLimit-Limit=30`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`. Advice-scoping regression: 400 body = `{"code":"INVALID_INPUT","message":"reference: reference is required","requestId":"...","timestamp":"..."}` — ProxyError shape intact. Log-leak grep for `aiza\|key=\|signature=` on `/tmp/backend.log` → 0. User-content leak (verseText "For God so loved") → 0. Safe controller INFO log ("Explain request received") → 34 occurrences. Backend torn down, port 8080 free. |
| 10 | Create backend/README.md | [COMPLETE] | 2026-04-23 | Created `backend/README.md` (76 lines, within plan's 60–100 target). Sections: project summary, structure tree under `com/worshiproom/`, filter chain (RequestIdFilter + RateLimitFilter with order/scoping), caches (three Caffeine layers in service classes), health endpoint shape, local dev setup, rule-file pointers, Forums Wave next-steps. Zero `com.example.worshiproom` references; new `com.worshiproom` path referenced in tree + ProxyExceptionHandler basePackages. |
| 11 | Optional Docker build verification | [COMPLETE WITH NOTED DEVIATION] | 2026-04-23 | Docker build + container boot + both health endpoints verified ✓. Docker healthcheck fails due to missing curl in Alpine runtime image — pre-existing bug from commit 0c9618f (Key Protection Spec 1), unrelated to rename. Acceptance criteria #9 (docker build) satisfied; AC #10 (healthcheck passes) deferred to follow-up spec. |
| 12 | Final acceptance-criteria gate | [COMPLETE WITH NOTED DEVIATION] | 2026-04-23 | **AC #1** groupId → `pom.xml:15 = com.worshiproom` ✓. **AC #2** package structure → `backend/src/{main,test}/java/com/worshiproom/` both present ✓. **AC #3** clean compile, zero unresolved-import warnings → Step 8 BUILD SUCCESS ✓. **AC #4** ~280 tests pass → Step 8 `Tests run: 280, Failures: 0, Errors: 0` (identical to baseline) ✓. **AC #5** `spring-boot:run` dev + `/api/v1/health` reports `configured:true` → Step 9 evidence ✓. **AC #6** three proxy round-trips → Step 9 Gemini Explain 200, Maps Geocode 200, FCBH bibles 200 (all ProxyResponse shape) ✓. **AC #7** zero `com.example.worshiproom` hits → 0 across `backend/src/` ✓. **AC #8** log-leak grep returns 0 → Step 9 `grep -iE 'aiza\|key=\|signature=' /tmp/backend.log` → 0 ✓. **AC #9** `docker compose up --build backend` builds and runs → Step 11 build SUCCESS, container boots, `/actuator/health` UP, `/api/v1/health` configured:true ✓. **AC #10** healthcheck passes → ✗ DEFERRED (pre-existing curl-missing-in-Alpine bug, commit 0c9618f, unrelated to rename). **AC #11** README documents current structure → 76-line `backend/README.md` ✓. **AC #12** `@RestControllerAdvice` scoping → `ProxyExceptionHandler.basePackages = "com.worshiproom.proxy"`, zero stale refs ✓. **Summary: 11/12 acceptance criteria satisfied; AC #10 deferred to follow-up spec. Rename is complete and production-equivalent; zero regressions from baseline.** **Code review (2026-04-23): 4 findings (3 Medium, 1 Minor), 0 blocking. Medium #1–#3 (`com.example.worshiproom` doc-lag in `.claude/rules/03-backend-standards.md` + `.claude/skills/code-review/SKILL.md` + `.claude/skills/execute-plan-forums/SKILL.md`) DEFERRED to a dedicated doc-sweep follow-up spec (scope discipline — `.claude/rules/` and `.claude/skills/` are NOT in Spec 1.1's Files-to-Modify list; bundling them in widens the commit and breaks clean bisectability on the 156-spec branch). Minor #1 (`plan-forums` + `spec-forums` spec-filename convention edit) is NOT a revert candidate — applied manually out-of-band and intentionally stays. Spec 1.1 is clean for commit. Eric handles git manually.** |
