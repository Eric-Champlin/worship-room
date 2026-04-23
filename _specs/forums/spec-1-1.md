# Forums Wave: Spec 1.1 — Audit and Rename Backend Skeleton

**Master Plan Reference:** `_forums_master_plan/round3-master-plan.md` → Spec 1.1
**Branch:** `claude/forums/round3-forums-wave`
**Date:** 2026-04-23

---

## Affected Frontend Routes

N/A — backend-only spec. The rename is entirely within `backend/`. No frontend changes, no UI verification needed. `/verify-with-playwright` should be skipped.

---

### Spec 1.1 — Audit and Rename Backend Skeleton

- **ID:** `round3-phase01-spec01-backend-skeleton-audit`
- **Phase:** 1 — Backend Foundation
- **Size:** **L** (v2.7: increased from S — the Key Protection Wave expanded the backend from ~3 files to ~60+ files across four proxy subpackages; the rename now touches all of them plus their test files)
- **Risk:** **Medium** (v2.7: increased from Low — filter ordering, WebClient config, and three shipped proxy services must survive the refactor without regression)
- **Prerequisites:** Phase 0 read (Spec 0.1 ✅); Key Protection Wave merged (Specs 1–4 of `ai-proxy-*`); `./mvnw test` green on `main` before starting
- **Goal:** Rename the group ID from `com.example.worshiproom` to `com.worshiproom`, preserving the entire shipped proxy layer (`proxy.common`, `proxy.ai`, `proxy.maps`, `proxy.bible`) and all its tests, filters, exception handlers, and configuration. Reconcile the existing `/api/v1/*` endpoints with the plan's original intent. Document the current state in `backend/README.md`.

**Phase purpose:** Audit the existing backend skeleton, rename the group ID, add Liquibase + Spring Security + JWT + OpenAPI + Testcontainers, ship the first real auth endpoints, and swap the frontend AuthContext to use real JWT auth. After this phase, Eric can register, log in, and the backend knows who he is. No features yet beyond auth.

**What this phase accomplishes:** At the end of Phase 1, Eric can start the backend locally with `./mvnw spring-boot:run`, the frontend can register a user via `POST /api/v1/auth/register`, log in via `POST /api/v1/auth/login`, store the JWT in React state, and make authenticated GET requests to `/api/v1/users/me` that round-trip correctly with full type safety from OpenAPI. Nothing user-facing has changed beyond auth, but the entire backend stack is ready for Phase 2 to start adding feature data.

**Sequencing notes:** Specs in this phase are mostly sequential. Spec 1.1 audits and renames; everything else depends on it. Spec 1.2 through 1.10 build up layer by layer. Spec 1.10 is the cutover.

---

## Approach (v2.7 rewrite)

Open the project in IntelliJ. Use **Refactor → Rename Package** on the root `com.example.worshiproom` → `com.worshiproom`. IntelliJ will recursively rename every subpackage (`proxy.common`, `proxy.ai`, `proxy.maps`, `proxy.bible`, `proxy.common.*`, `config`, `controller`) and update every `import` statement in both `src/main/java/` and `src/test/java/`. **Never sed-replace package names** — with 60+ files the refactor tool is the only safe path.

After the rename, update:

- **`backend/pom.xml`** — `groupId` from `com.example` to `com.worshiproom` (or keep `com.worshiproom` top-level; both are acceptable)
- **`backend/.mvn/` and any `@PackageMapping` / `@ComponentScan(basePackages=...)` annotations** — scan for string literals that reference the old package path
- **`application.properties`, `application-dev.properties`, `application-prod.properties`** — grep for `com.example.worshiproom` in any property keys (Liquibase contexts, Spring scanning, logging package paths, etc.). **Critical:** the two `logging.level.org.springframework.web.*.annotation=INFO` / `ExchangeFunctions=INFO` suppressions in `application-dev.properties` do NOT need changes (they're framework classes, not our packages) — but verify they still resolve correctly after the refactor.
- **`backend/src/main/resources/openapi.yaml`** — grep for `com.example.worshiproom` in any schema definitions or server URLs (unlikely but possible)
- **`backend/Dockerfile`** — grep for the old package path (unlikely but possible)
- **`docker-compose.yml`** — healthcheck URL: verify the existing `/api/v1/health` endpoint is used (it should be — that endpoint already exists via the Key Protection Wave and reports `providers.*.configured` booleans). **Important:** do NOT change `ApiController.java`'s `@RequestMapping` — the v2.6 spec instructed to move `/api/health` → `/api/v1/health`, but `/api/v1/health` ALREADY EXISTS and carries provider status. The pre-existing `/api/health` and `/api/hello` endpoints can either (a) be kept as legacy aliases, or (b) be retired via a dedicated follow-up spec. Preserve them for now to avoid breaking any external health probes.
- **`backend/README.md`** — replace the v2.6 project-tour template with a tour of the actual current structure: `proxy.common` filters / handlers / types, `proxy.ai` Gemini, `proxy.maps` Google Maps, `proxy.bible` FCBH, the three Caffeine cache layers, the `WebClient` bean, the `/api/v1/health` provider-configured reporting.

Run `./mvnw clean test` to confirm EVERYTHING still compiles and all ~280 existing tests still pass. Run `./mvnw spring-boot:run -Dspring-boot.run.profiles=dev` and smoke-test the three proxy endpoints:

- `curl /api/v1/proxy/ai/explain`
- `curl /api/v1/proxy/maps/geocode?query=Nashville+TN`
- `curl /api/v1/proxy/bible/filesets/EN1WEBN2DA/JHN/3`

All three must return `ProxyResponse`-shaped bodies with valid `data` fields. Grep `/tmp/backend.log` for `com.example.worshiproom` — expect zero matches (anywhere other than in bytecode artifacts, which should have been regenerated).

## Files to modify (v2.7 — non-exhaustive; the IntelliJ refactor will discover more)

- `backend/pom.xml` (groupId)
- Every file under `backend/src/main/java/com/example/worshiproom/` → moved to `com/worshiproom/` (expect 30+ files across: root `WorshipRoomApplication.java`, `config/`, `controller/`, `proxy/common/`, `proxy/ai/`, `proxy/maps/`, `proxy/bible/`)
- Every file under `backend/src/test/java/com/example/worshiproom/` → moved to `com/worshiproom/` (expect 30+ files mirroring the main structure)
- `backend/src/main/resources/application.properties`, `application-dev.properties`, `application-prod.properties` (grep for package-path strings)
- `backend/src/main/resources/openapi.yaml` (grep for package-path strings)
- `backend/Dockerfile` (grep for package-path strings)
- `docker-compose.yml` (healthcheck URL verification, not modification)
- `backend/README.md` (project tour, substantially rewritten)

## Database changes

None — rename is pure Java/config. No schema changes.

## API changes

None — public API surface is preserved. All three proxy endpoints stay at the same paths (`/api/v1/proxy/ai/*`, `/api/v1/proxy/maps/*`, `/api/v1/proxy/bible/*`). The legacy `/api/health` and `/api/hello` are preserved as-is (any retirement is deferred to a follow-up spec).

## Copy Deck

No user-facing copy in this spec. The rename is internal plumbing only.

## Anti-Pressure Copy Checklist

- [x] No FOMO language (N/A — no new copy)
- [x] No shame language (N/A — no new copy)
- [x] No exclamation points near vulnerability (N/A — no new copy)
- [x] No streak-as-shame messaging (N/A — no new copy)
- [x] No comparison framing (N/A — no new copy)
- [x] Scripture as gift, not decoration (N/A — no scripture in this spec)

## Anti-Pressure Design Decisions

N/A — infrastructure-only spec with no user-visible surface.

## Acceptance criteria (v2.7)

- [ ] Group ID is `com.worshiproom` in `pom.xml`
- [ ] Package structure is `com.worshiproom.*` throughout main + test trees
- [ ] `./mvnw clean compile` succeeds with zero warnings about unresolved imports
- [ ] `./mvnw test` passes — ALL ~280 pre-existing tests green; no new failures introduced by the rename
- [ ] `./mvnw spring-boot:run -Dspring-boot.run.profiles=dev` starts the backend cleanly; all three providers report `configured: true` at `/api/v1/health` (assuming env vars are populated)
- [ ] Three proxy endpoints round-trip correctly post-rename (curl smoke tests above)
- [ ] `grep -rn 'com.example.worshiproom' backend/src/` returns zero hits
- [ ] `grep -iE 'aiza|key=|signature=' /tmp/backend.log` returns zero matches (verifying the two log suppressions in `application-dev.properties` still work post-rename)
- [ ] `docker compose up --build backend` builds and runs successfully
- [ ] Healthcheck in docker-compose passes (existing `/api/v1/health` URL)
- [ ] README documents the current (post-Key-Protection-Wave) project structure including proxy subpackages
- [ ] `ProxyExceptionHandler` (and any other `@RestControllerAdvice` with `basePackages`) has its attribute updated to `com.worshiproom.proxy` — grep verifies no lingering `com.example.worshiproom.proxy` in `basePackages` attributes

## Guardrails (v2.7 — DO NOT)

- Do NOT change `ApiController.java`'s `@RequestMapping("/api")` annotation to `"/api/v1"` (the v2.6 instruction) — `/api/v1/health` and `/api/v1/hello` already exist as separate endpoints, and the legacy `/api/health` may be referenced by external probes. Preserve both; retire the legacy ones in a follow-up spec if desired.
- Do NOT modify any `application-*.properties` log-suppression lines (the two narrow `logging.level` entries for `org.springframework.web.*.annotation=INFO` and `ExchangeFunctions=INFO`) — they target framework classes and survive the rename unchanged.
- Do NOT alter filter ordering (`RequestIdFilter` at `HIGHEST_PRECEDENCE`, `RateLimitFilter` at `HIGHEST_PRECEDENCE + 10`, `RateLimitFilter.shouldNotFilter` scoping to `/api/v1/proxy/**`).
- Do NOT modify `ProxyExceptionHandler`'s `basePackages` attribute semantics — update it to the new path (`com.worshiproom.proxy`) as part of the rename, but DO NOT broaden it to catch non-proxy exceptions.
- Do NOT delete `backend/.env.local` or any of its `GEMINI_API_KEY`/`GOOGLE_MAPS_API_KEY`/`FCBH_API_KEY` entries.

## Testing notes

- **No new tests are written in this spec.** The rename must preserve the existing ~280-test suite. Any new test failures post-refactor are regressions and must be fixed, not suppressed.
- **Filter ordering regression check:** Spin up the app in dev profile and hit `/api/v1/proxy/ai/explain` 130 times rapidly (exceeds dev 120/min limit). Expect 429 response with `Retry-After` and `X-RateLimit-*` headers. If that doesn't happen, `RateLimitFilter` is either mis-ordered or its `shouldNotFilter` scoping broke.
- **Advice scoping regression check:** Craft a test request that triggers `UpstreamException` in one of the proxy services. Response body should be the standard `ProxyError` shape (`code: UPSTREAM_ERROR`, `message`, `requestId`, `timestamp`) — NOT a Spring Boot default whitelabel error page. If the response is a whitelabel page, `ProxyExceptionHandler`'s `basePackages` wasn't updated correctly and filter-raised-advice scoping silently broke.
- **Log suppression regression check:** After a successful proxy round-trip, `grep -iE 'aiza|key=|signature='` on the dev backend log. Zero matches expected. This verifies the two narrow `logging.level` suppressions in `application-dev.properties` still target the correct framework classes post-rename (they target framework packages, not ours, so this should just work — but verify).
- **Health endpoint regression check:** `curl /api/v1/health` returns a JSON body with `providers.gemini.configured`, `providers.maps.configured`, `providers.fcbh.configured` all as booleans. If the shape changed, something in the controller hierarchy moved unexpectedly during the refactor.

## Notes for plan phase recon

1. **Count the files before starting.** `find backend/src/main/java/com/example/worshiproom/ -name "*.java" | wc -l` and the same for `src/test/java/`. Record both numbers. After the refactor, the same counts under `com/worshiproom/` should match — off-by-one means IntelliJ missed a file.
2. **Inventory all `@RestControllerAdvice` classes** with `grep -rn '@RestControllerAdvice' backend/src/main/java/`. Expect at least two: the proxy-scoped `ProxyExceptionHandler` (`basePackages = "com.example.worshiproom.proxy"`) and the global unscoped `RateLimitExceptionHandler` (no `basePackages`). The proxy-scoped one needs its `basePackages` attribute updated; the global one doesn't. If there are more, list them all and verify each one's `basePackages` attribute post-rename.
3. **Inventory all `@ComponentScan` and `@SpringBootApplication(scanBasePackages=...)` annotations.** `grep -rn 'scanBasePackages\|ComponentScan' backend/src/main/java/`. If any hardcode the package path, they need updating. `WorshipRoomApplication.java` uses default scanning, which follows the annotated class's package automatically — no change needed there.
4. **Verify the OpenAPI spec's server URL section.** `grep -A 5 '^servers:' backend/src/main/resources/openapi.yaml`. Server URLs almost certainly don't reference the Java package, but grep confirms.
5. **Check the Dockerfile for hardcoded paths.** Dockerfiles usually reference the built JAR path (`target/*.jar`), which doesn't embed package names. But `COPY` instructions or layer-caching hints might. Grep confirms.
6. **Inventory legacy endpoint callers.** Before deciding whether to retire `/api/health` and `/api/hello`, grep the frontend and docker-compose for references: `grep -rn '/api/health\b\|/api/hello\b' frontend/ docker-compose.yml`. If anything references them, retiring is a breaking change and stays out of this spec's scope.
7. **Sanity-check the pom.xml.** After changing `groupId`, run `./mvnw clean compile` — Maven will fail fast if the groupId is invalid. A clean compile is the first green light.
8. **Confirm IDE state.** Close IntelliJ fully before the refactor and reopen from scratch — this ensures no stale index entries survive. After IntelliJ reopens, wait for indexing to complete before triggering the refactor.

## Out of scope

- **Adding new packages.** Phase 1 specs 1.2+ add new packages (`auth`, `user`, `infrastructure`, etc.). This spec only renames what exists.
- **Retiring the legacy `/api/health` and `/api/hello` endpoints.** Preserved as-is. If retirement is desired, a follow-up spec handles it with proper deprecation notices to any external probes.
- **Changes to filter ordering or `shouldNotFilter` scoping.** The inherited proxy filter chain is correct; this spec preserves it verbatim.
- **Any API contract changes.** Public endpoints keep the same paths, same response shapes, same behavior.
- **Database setup.** Spec 1.2 adds PostgreSQL via Docker Compose; this spec doesn't touch the database.
- **Performance optimization.** Any test-suite slowness post-rename is handled in a separate performance spec, not here.

## Out-of-band notes for Eric

- **Use IntelliJ's refactor tool.** Sed-replacing 60+ files is how you break things silently. After the refactor, spot-check: `grep -rn '@RestControllerAdvice' backend/src/main/java/com/worshiproom/proxy/common/` should show `basePackages = "com.worshiproom.proxy"` (updated) — if IntelliJ missed it and it still reads `com.example.worshiproom.proxy`, advice scoping will silently stop working and filter-raised exceptions will fall through to default Spring error handlers. This is the single most likely silent failure.
- **The test suite is the safety net.** ~280 tests already exercise the proxy layer end-to-end. If they all pass post-rename, the refactor is almost certainly clean. If any fail, read the failure message carefully — ClassNotFoundException or NoClassDefFoundError usually means IntelliJ left a stale reference somewhere unexpected (often in a `@Value` annotation or a string-based class reference).
- **Commit discipline.** Even though all 156 specs share one branch, make this rename a single atomic commit on that branch. Don't interleave the rename with other work — a clean rename commit makes bisecting trivial if anything regresses in later specs. (CC doesn't commit; this is for when you commit manually at the end.)
- **Filter ordering is the second most likely silent failure.** After the rename, re-read `RequestIdFilter` and `RateLimitFilter` — confirm their `@Order` values (`Ordered.HIGHEST_PRECEDENCE` and `HIGHEST_PRECEDENCE + 10` respectively). Spec 1.4 (Spring Security + JWT) layers a `JwtAuthenticationFilter` on top, so leaving room above `+10` for future filters is part of the architecture.
- **If anything in Step 3 of `spec-forums` produces a clean Git diff (no uncommitted changes), the rename will feel anticlimactic.** That's the point — a clean rename is boring. The excitement comes in Spec 1.2+ when real database and auth work starts.
