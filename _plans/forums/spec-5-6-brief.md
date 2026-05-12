# Spec 5.6 — Redis Cache Foundation

**Master plan ID:** `round3-phase05-spec06-redis-cache-foundation`
**Size:** M (per master plan; brief ratifies)
**Risk:** Medium (per master plan; brief ratifies — new infrastructure dependency; production rate limiting and Phase 6 Live Presence both depend on this)
**Prerequisites:** 5.5 (Deprecated Pattern Purge) ⬜ — must ship before 5.6 execution begins
**Tier:** High

---

## 1. Branch discipline (CRITICAL)

**You are on a long-lived working branch named `forums-wave-continued`. Stay on it.**

Eric handles all git operations manually. Claude Code MUST NEVER run any of the following commands in this session, in any phase (recon, plan, execute, verify, review):

- `git checkout` / `git checkout -b`
- `git switch` / `git switch -c`
- `git branch`
- `git commit` / `git commit -am`
- `git push`
- `git stash` / `git stash pop`
- `git reset` (any flag)
- `git rebase`
- `git cherry-pick`
- `git merge`
- `gh pr create`, `gh pr merge`, `glab mr create`, etc.

If Claude Code believes a git operation is needed, surface it as a recommendation and STOP. Eric will execute manually.

The only acceptable git tooling Claude Code may invoke is read-only inspection: `git status`, `git diff`, `git log --oneline`, `git blame`, `git show <sha>`.

**Note:** Unlike 5.1/5.3/5.4/5.5 (all pure-frontend Prayer Wall visual specs), 5.6 is **pure-backend infrastructure work** — Spring Boot, Redis, Testcontainers, Maven. Zero frontend changes. Zero database schema changes (Liquibase). The diff lives entirely under `backend/`, `docker-compose.yml`, and `.env.example`.

---

## 2. Tier — High

### Why High

5.6 has bounded scope and concrete deliverables — the master plan body is unusually detailed (190 lines, 4 substacks, 11 files to create, 7+ files to modify, 14 explicit ACs). Most decisions are engineering judgment over a well-understood problem (Redis + Spring + bucket4j integration). That's classic High tier territory.

Three properties keep it above Standard:

1. **New infrastructure dependency.** Redis is the first non-PostgreSQL data store Worship Room adopts. Production deployment topology grows: Backend → PostgreSQL → Redis. Health monitoring, env var management, and operational runbook all expand. Getting the optionality model wrong (D4 — degraded vs hard-fail) corrupts production resilience.

2. **Contract test is the load-bearing artifact.** The master plan's out-of-band notes name this explicitly: "The contract test for rate limiters is the most important artifact here." InMemoryRateLimiter and RedisRateLimiter must produce identical externally-visible behavior. A weak contract test means the cutover from one to the other silently changes rate-limit semantics. The spec must structure the contract test so it actually exercises divergent behavior (concurrent requests, clock-edge cases, burst handling, refill timing).

3. **Migration scope is larger than the master plan implies.** Recon found 10+ existing rate-limit service classes rolling their own bucket4j+Caffeine pattern. The master plan body says "Existing rate limiter consumer classes refactored to inject `RateLimiter` interface" — but mass-refactoring 10+ services blows past M-size. The brief introduces the **strangler pattern** as the design call (D1): 5.6 ships the infrastructure; existing services keep their bucket4j+Caffeine setups unchanged; new code consumes the new interface; per-service migration happens in follow-up specs as need arises. This divergence from the master plan body is the most important design call in the brief.

### Why not Standard

Standard is for mechanical work with no architectural decisions. 5.6 introduces a new infrastructure dependency, defines a new contract (`RateLimiter` interface) that future code consumes, and decides the production failure mode (degraded vs hard-fail). These are durable choices that affect every subsequent backend spec.

### Why not xHigh

xHigh is for brand-defining work or work with subjective quality bars. 5.6 has no design intent surface, no brand voice surface, no "feels exquisite" criterion. Everything is objectively verifiable: cache TTLs apply, rate limiter contract test passes, circuit breaker engages and recovers, health endpoint reports correct state, every Redis key has a TTL. High covers it.

### Override moments that should bump 5.6 to MAX

- **Plan-time CC discovers no Redis-compatible bucket4j extension exists for Lettuce in the version range.** Master plan assumes one exists; recon below confirms `bucket4j_jdk17-core 8.18.0` is the existing version. Plan recon must verify `bucket4j-redis-*` extension compatibility. If incompatible, advisor decides between (a) upgrading bucket4j, (b) implementing token-bucket logic directly via Lua scripts, or (c) switching algorithm to sorted-set sliding window (which changes `X-RateLimit-*` header semantics — needs Eric review).
- **Execute-time CC encounters Spring Data Redis version conflicts with Spring Boot 3.5.11.** Master plan note #2 asks plan recon to verify. If conflicts appear, advisor decides whether to upgrade Spring Boot (out of 5.6 scope) or pin a different Redis client version.
- **Contract test fails to pass against both impls.** The contract test is load-bearing; if behavior diverges between InMemoryRateLimiter and RedisRateLimiter, the divergence is either (a) a real bug in one impl (fix it), or (b) a fundamental incompatibility between the two backends (which means the design call needs revisiting).
- **Circuit breaker recovery test is flaky.** Restarting a Testcontainer mid-test (`redisContainer.stop()` + `redisContainer.start()`) is a known-fragile pattern. If flakiness can't be resolved by reasonable retry/wait semantics, advisor decides whether to ship without the recovery assertion (accept manual verification) or invest more in test stability.
- **Recon discovers existing rate-limit services use bucket4j in ways the new InMemoryRateLimiter interface can't preserve.** Configuration-per-call-site is the likely surprise (each existing service has its own bucket configuration: rate, burst, refill window). The new interface must accommodate per-call-site configs without forcing every consumer to hand-roll BucketConfiguration objects.
- **Production fallback decision (D4) needs Eric's call.** The brief defaults to "optional with degraded health," but Eric may prefer hard-fail (Redis-down = backend-won't-start) for stricter operational guarantees. Surface during brief review.

---

## 3. Integration verification — REQUIRED

This spec is backend infrastructure; there is no Playwright surface and no visual verification. The verification surface is **Testcontainer-driven integration tests + manual dev-stack smoke + production-like staging smoke** (if a staging env exists).

### Required Testcontainer integration scenarios

1. **Redis health indicator.** `RedisHealthIndicator` reports `UP` when the Testcontainer is running; `DOWN` when stopped. Exposed via `GET /actuator/health/redis`. Asserts response body contains `"status":"UP"` and connection metadata (host, port).

2. **CacheManager wiring per profile.** With `spring.profiles.active=prod` (overridden in the integration test via `@ActiveProfiles("prod")`), the autowired `CacheManager` is an instance of `RedisCacheManager`. With `dev` profile, it's `ConcurrentMapCacheManager`. Asserted by `instanceof` check on the bean.

3. **Rate limiter contract test — InMemoryRateLimiter.** Same test class, parametrized over both implementations. Scenarios:
   - Single-instance: N requests in window = N tokens consumed; (N+1)th request rejected
   - Refill: after window passes, capacity restored to full
   - Burst: rapid sequential requests within bucket capacity all succeed
   - Different keys: independent buckets per key (e.g., user A and user B both at full capacity)
   - `X-RateLimit-Remaining` value monotonically non-increasing within a window

4. **Rate limiter contract test — RedisRateLimiter.** Same scenarios, against a Redis Testcontainer. Plus:
   - Cross-instance: two `RedisRateLimiter` instances share the same Redis backend; rate-limit state visible across both
   - Concurrent: 10 parallel threads hitting the same bucket key — total requests admitted equals bucket capacity (no over-admission, no under-admission)

5. **Circuit breaker engagement.** With Redis Testcontainer running, cache is consulted normally. Stop the Testcontainer (`redisContainer.stop()`); after 3 consecutive cache operations fail, the circuit opens (cache is bypassed; underlying data source is queried directly). Health indicator transitions to `DEGRADED` state.

6. **Circuit breaker recovery.** With circuit open, restart the Testcontainer (`redisContainer.start()`). Within 30 seconds (or whatever the recovery window is — plan recon decides), the circuit closes (cache is consulted again). Health indicator returns to `UP`.

7. **Sentry integration on Redis failures.** Stop the Testcontainer; trigger a Redis operation; assert that Sentry SDK received an error event. Uses the existing Sentry test harness (plan recon checks how `SentryConfig.java` is exercised in existing tests — likely a mock SentryClient or `SentryOptions.setBeforeSend` interceptor).

8. **REDIS_URL parsing.** With `REDIS_URL=rediss://user:secret@host.example.com:6380/0`, the connection factory resolves to host=`host.example.com`, port=6380, password=`secret`, SSL=true, database=0. Tested via `@TestPropertySource` overriding env vars.

9. **REDIS_HOST/PORT/PASSWORD triplet parsing.** With triplet set (and `REDIS_URL` empty), same resolution. Documents the precedence order in `redis-conventions.md`.

10. **TTL enforcement.** A repo-wide test scans all `@Cacheable` annotations (currently zero — see D5) and asserts each cache name has an explicit TTL in `application.properties` under `spring.cache.redis.cache-null-values=false` and `spring.cache.redis.time-to-live.<cacheName>=<duration>`. Test passes vacuously today; remains as a safety net for subsequent specs that add `@Cacheable` methods.

11. **Every Redis SET has a TTL — repo-wide grep test.** A test scans source files for raw `redisTemplate.opsForValue().set(` calls and asserts each is followed by a TTL specification (either via `.set(key, value, Duration.ofXxx(...))` overload or an explicit `expire(key, ...)` call). Prevents accidental un-TTL'd keys.

12. **Rate limit headers under 2-instance simulation.** Spawn two `@SpringBootTest` instances sharing the same Redis Testcontainer. Hit the same bucket key from both. Final response from either instance reports `X-RateLimit-Remaining` consistent with combined consumption. Validates cross-instance state.

### Required manual dev-stack smoke

After `docker-compose up -d` (with the new Redis service), Eric runs:

- `docker-compose ps` confirms `redis:7-alpine` container is `Up` and listening on the documented port
- `docker exec <redis-container> redis-cli ping` returns `PONG`
- Backend boots without errors against the dev stack: `mvn spring-boot:run -Dspring-boot.run.profiles=dev` produces no Redis-related WARN or ERROR
- `curl http://localhost:8080/actuator/health` returns `"redis":{"status":"UP"}` (in addition to existing components)
- `curl http://localhost:8080/actuator/health/redis` returns just the Redis component status
- Stopping Redis (`docker-compose stop redis`) and re-curling `/actuator/health` shows the Redis status as `DOWN` and overall as `DEGRADED` (not `DOWN` — health degradation, not total failure, per D4)

### Required staging smoke (if staging exists)

- Backend deployed to staging with `REDIS_URL` configured against a real Redis instance (Upstash free tier or equivalent per master plan recon note #1)
- `/actuator/health/redis` returns `UP` in staging
- Rate limit headers behave as expected (try hitting any rate-limited endpoint at high frequency, observe `X-RateLimit-Remaining` decrement)

Verify-with-playwright is **NOT** required for this spec. The skill is designed for frontend visual verification.

<!-- CHUNK_BOUNDARY_1 -->

---

## 4. Master Plan Divergence

The master plan body for Spec 5.6 is unusually concrete — 4 substacks, 11 files to create, 7+ files to modify, 14 ACs. Most of the brief ratifies the master plan rather than expanding it. The divergences below are the points where brief recon found disk reality that requires the master plan's framing to bend.

### MPD-1 — "Extracted from the existing implementation" → strangler pattern over mass refactor

Master plan body for `InMemoryRateLimiter.java`: *"extracted from the existing in-memory implementation."*

Master plan body files-to-modify: *"Existing rate limiter consumer classes refactored to inject `RateLimiter` interface instead of constructing bucket4j directly."*

**Recon finding (verified):** there is no single "existing in-memory implementation." There are 10+ per-domain rate-limit service classes, each independently constructing its own bucket4j `Bucket` instance with a Caffeine `Cache<String, Bucket>` for per-key bucket retention:

- `backend/src/main/java/com/worshiproom/upload/UploadRateLimitService.java`
- `backend/src/main/java/com/worshiproom/legal/LegalAcceptRateLimitService.java`
- `backend/src/main/java/com/worshiproom/proxy/common/RateLimitFilter.java`
- `backend/src/main/java/com/worshiproom/post/ResolveRateLimitService.java`
- `backend/src/main/java/com/worshiproom/post/report/ReportsRateLimitService.java`
- `backend/src/main/java/com/worshiproom/post/PostsRateLimitService.java`
- `backend/src/main/java/com/worshiproom/post/engagement/BookmarksRateLimitService.java`
- `backend/src/main/java/com/worshiproom/post/engagement/ReactionsRateLimitService.java`
- `backend/src/main/java/com/worshiproom/post/comment/CommentsRateLimitService.java`
- `backend/src/main/java/com/worshiproom/auth/ChangePasswordRateLimitService.java`
- `backend/src/main/java/com/worshiproom/auth/LoginRateLimitFilter.java`

Mass-refactoring all 11 services to inject a unified `RateLimiter` interface, plus updating each service's tests, plus updating each service's per-call-site bucket configuration migration, exceeds the M-size envelope. Each service likely has subtly different bucket configurations (rate, burst, refill window) baked into its current constructor — the new interface must accommodate per-call-site configs without forcing a hand-rolled `BucketConfiguration` at every consumer.

**Brief's design call (D1): strangler pattern.** 5.6 ships the new infrastructure but does NOT mass-refactor existing services. Specifically:

1. `RateLimiter.java` (interface) defines the new contract
2. `InMemoryRateLimiter.java` is the new canonical bucket4j+Caffeine implementation (designed for parity with the existing per-service pattern, not literally extracted from any one of them)
3. `RedisRateLimiter.java` is the bucket4j-Redis-backed implementation
4. `RateLimiterConfig.java` selects the impl by profile
5. **No existing service migrates in 5.6.** Existing services keep their bucket4j+Caffeine setups unchanged. They continue to work in dev (single-instance) and prod (current behavior).
6. The contract test exercises both impls side-by-side, validating behavioral equivalence
7. The **first** new consumer (likely Phase 6.1 Prayer Receipt's caching path, or whichever spec first needs cross-instance rate limiting) consumes the new `RateLimiter` interface, NOT the per-service rate-limit pattern
8. Per-service migration of existing rate-limit services is **deferred** to follow-up specs, prioritized by which services actually need cross-instance state (LoginRateLimitFilter is the obvious first candidate — multi-instance prod must share login rate-limit state for security; other services can stay in-memory until they hit a real cross-instance need)

**Why strangler over big-bang:**

- Existing services work today; there's no production fire forcing immediate migration
- M-size envelope preserved
- Contract test validates the new infrastructure before mass adoption (catch divergence early)
- Per-service migration in subsequent specs lets each service's bucket configuration migrate with intent (not as a side effect of an infrastructure spec)
- Reduces blast radius: 5.6's diff is bounded to NEW files plus property/dependency edits; existing service code is untouched

**Follow-up issue to file:** "Spec 5.7 (or similar): Migrate per-service rate limiters to `RateLimiter` interface, prioritized by cross-instance need (LoginRateLimitFilter first)."

### MPD-2 — "Sorted sets are the pattern for time-windowed presence and rate limiting" applies to PRESENCE only

Master plan body, substack 2: *"Sorted sets (`ZADD`) are the pattern for time-windowed presence and rate limiting."*

**Brief clarification:** sorted sets are the pattern for **presence** (Phase 6 Live Presence, which uses time-windowed user-active-at-X tracking via ZADD with score=timestamp + ZRANGEBYSCORE for window queries). They are NOT the pattern for rate limiting in 5.6.

Rate limiting in 5.6 uses **token bucket** semantics (the existing bucket4j algorithm), backed by Lettuce via bucket4j's Redis extension. Reasons:

1. `X-RateLimit-Remaining` and `X-RateLimit-Reset` headers already encode token-bucket semantics (current bucket size, time-until-next-refill). Switching to sliding-window changes the meaning of these headers in user-visible ways.
2. Behavioral parity between `InMemoryRateLimiter` and `RedisRateLimiter` is trivial when both use token bucket. Switching to sliding window for Redis-only would introduce a contract-test gap (the two impls would have measurably different behavior under burst conditions).
3. The existing per-service rate-limit code is bucket4j-based. The strangler pattern works only if the new interface accommodates the existing algorithm.
4. bucket4j has a mature Redis extension (`bucket4j-redis` family, plus the Spring Data Redis variant) that supports Lettuce. This means RedisRateLimiter is mostly configuration, not a from-scratch Lua-script implementation.

**Plan recon must verify** the exact bucket4j-Redis artifact name and version compatible with bucket4j 8.18.0 + Spring Boot 3.5.11 + Lettuce. Likely `bucket4j_jdk17-redis-common` + `bucket4j_jdk17-lettuce` or the Spring Data Redis variant. If incompatible, MAX override moment applies (Section 2).

### MPD-3 — `@Cacheable` targets discovered at plan time — 5.6 builds the road, not the cars

Master plan body, recon note #4: *"Identify the specific `@Cacheable` targets. Audit PostService / QOTDService / LiturgicalService / etc."*

**Recon finding (verified):** Zero `@Cacheable` annotations exist in the codebase today. `grep` on `backend/src/main` for `@Cacheable` returns 0 matches.

**Brief's design call (D5): 5.6 does NOT add `@Cacheable` annotations.** 5.6 sets up the `CacheManager` infrastructure (Redis-backed in prod, ConcurrentMap-backed in dev), defines the cache name convention (`cache:<name>`), and establishes the per-cache TTL configuration mechanism in `application.properties`. Subsequent specs add `@Cacheable` to specific methods.

The master plan AC *"All configured `@Cacheable` methods have explicit TTL"* is satisfied vacuously today (zero methods to verify). The brief preserves this AC as a regression net for subsequent specs — the verifying test loops over all `@Cacheable` annotations and asserts each has a corresponding TTL property. Today it asserts zero of zero; tomorrow it asserts N of N.

**Why no `@Cacheable` in 5.6:**

- Per-method caching is a per-service design call (which methods are safe to cache? what TTL? what eviction triggers?). Folding those decisions into an infrastructure spec dilutes both.
- Phase 6.1 Prayer Receipt explicitly states: *"Response cached in Redis for 30 seconds (per Spec 5.6) — no point re-querying on every refresh."* Phase 6.1 is the first natural consumer; let it own the `@Cacheable` decision for `GET /api/v1/posts/{id}/prayer-receipt`.
- The 5.6 contract is the infrastructure: "Redis is wired, CacheManager is profile-aware, TTLs are enforced when present." Consumers add caching one method at a time, each with explicit justification.

### MPD-4 — Production optionality — degraded over hard-fail

Master plan body, recon note #3: *"Decide if Redis should be optional in prod (fallback entirely to in-memory with a health-degraded state)."*

**Brief's design call (D4): optional in prod, with degraded health reporting.** Reasoning:

1. The master plan already specifies a circuit breaker on cache reads (3 consecutive failures → bypass for 30s). That's the per-operation degradation. Backend-level degradation is the same pattern at startup: if Redis is structurally unreachable at boot, the backend boots with the in-memory rate limiter selected (`InMemoryRateLimiter`), the cache bypassed (`NoOpCacheManager` or equivalent), and `/actuator/health` reporting overall status `DEGRADED`.
2. Worship Room is a small hobby project where total outages from a Redis hiccup are worse than degraded performance. Eric's success criterion is "breaking even on hosting" — the service staying up at reduced functionality beats the service being down.
3. Sentry alerts on Redis-down events; Eric gets paged; manual restoration happens. The degraded path buys time for human intervention.
4. The contract test design (parity between impls) means an in-memory fallback during prod degradation produces NO user-visible behavior change for rate limiting (within a single instance — cross-instance state is the only thing lost, and that's already what we have today). Caching is bypassed, which adds latency but doesn't break functionality.

**Plan recon decides the implementation mechanism.** Options include:

- Spring Boot's `@ConditionalOnBean` + custom `RedisAvailable` condition that checks connectivity at startup
- `@Profile`-based bean selection with a startup hook that validates Redis and falls back if unreachable
- A custom `CacheManager` wrapper that delegates to Redis when available and to in-memory when not

Default recommendation: the wrapper pattern (simplest; one bean to test). Plan recon evaluates.

**If Eric prefers hard-fail in prod:** override D4 at brief review. The contract test and infrastructure remain unchanged; only the startup behavior shifts (Redis-unreachable at boot → application context fails to start, container restarts via orchestrator).

### MPD-5 — Free-tier Redis is the deployment default

Master plan body, recon note #1: *"Confirm Upstash Redis free tier (10K commands/day, 256 MB data) suffices for Phase 6 presence + rate limiting + caching."*

**Brief's design call (D6): free tier with bake-in upgrade path.** Reasoning:

1. Worship Room's hobby-scale traffic is well within free-tier limits at Phase 6. Presence is sorted-set updates (~10 commands per active user per minute window), rate limiting is bucket reads (~1 command per request), caching is GET/SET (~2 commands per cache hit). 10K commands/day = ~7 commands/minute averaged — fits a small active user base.
2. The connection layer uses `REDIS_URL` (Upstash-compatible format) OR `REDIS_HOST/PORT/PASSWORD` triplet. Either works against any Redis provider — Upstash, Redis Cloud, Railway Redis, AWS ElastiCache, self-hosted, Docker. The infrastructure code is provider-agnostic.
3. TTLs are tunable per-namespace in `application.properties`. If usage approaches free-tier limits, TTLs can be lengthened (fewer Redis writes) or specific cache names can be disabled. No code change required.
4. The brief documents the upgrade decision criteria in `backend/docs/redis-conventions.md`: *"When daily command count exceeds 8K (80% of free tier), upgrade to Upstash paid tier or migrate to self-hosted Redis on the prod host."*

**This is a deployment configuration call, not a code call.** 5.6 does not encode Upstash specifically anywhere — the prod profile reads env vars and connects to whatever Redis is configured.

### MPD-6 — New `application-test.properties` file

Master plan body files-to-modify: *`backend/src/main/resources/application-test.properties` — Redis Testcontainer config.*

**Recon finding (verified):** No `application-test.properties` file currently exists. Master plan implies creating it.

**Brief's design call:** create `application-test.properties` as a NEW file. Plan recon checks whether existing integration tests use a test profile or rely on dev profile + `@TestPropertySource` overrides. If existing tests use `@TestPropertySource` consistently, that pattern continues; the new `application-test.properties` provides Redis Testcontainer connection defaults (likely `${REDIS_HOST:localhost}:${REDIS_PORT:6379}` with Testcontainer-injected overrides).

### MPD-7 — "Database changes: None" is correct; Liquibase is not touched

Master plan body: *"Database changes: None."*

**Brief ratifies.** Redis is not a Liquibase target. No changesets are added in 5.6. The `db/changelog/` directory is untouched.

If plan-time CC instinctively reaches for Liquibase because "backend infrastructure spec," reject. Redis is schemaless; setup is configuration + connection, not migration.

<!-- CHUNK_BOUNDARY_2 -->

---

## 5. Recon Ground Truth (2026-05-11)

Each finding marked **VERIFIED** (verified on disk by brief author; trust this in the spec) or **PLAN-RECON-REQUIRED** (brief author could not verify end-to-end; plan-time CC reads at plan time and produces the catalog or finding then). Per the R-OVR pattern, if any VERIFIED finding turns out to be wrong on disk at plan time, the spec records an R-OVR entry; the brief's design intent stands.

### R1 — Spring Boot version — VERIFIED

`backend/pom.xml` line 11: `<version>3.5.11</version>` against `<artifactId>spring-boot-starter-parent</artifactId>`. Matches master plan recon note #2's assumption.

Spring Data Redis ships with Spring Boot 3.5.x BOM. Plan recon adds the starter dependency without specifying a version (let the BOM resolve).

### R2 — Existing rate limiter is bucket4j 8.18.0 + Caffeine 3.1.8 — VERIFIED

`backend/pom.xml` lines 69-73 + 127-131:

```xml
<dependency>
  <groupId>com.bucket4j</groupId>
  <artifactId>bucket4j_jdk17-core</artifactId>
  <version>8.18.0</version>
</dependency>

<dependency>
  <groupId>com.github.ben-manes.caffeine</groupId>
  <artifactId>caffeine</artifactId>
  <version>3.1.8</version>
</dependency>
```

The pom comment on the Caffeine dep reads: *"Caffeine — bounded LRU cache for per-IP rate-limit buckets."* This confirms the Caffeine cache is the holder for per-key bucket retention; bucket4j provides the token-bucket algorithm.

Plan recon adds the Redis-backed bucket4j extension. The `com.bucket4j` groupId publishes:

- `bucket4j_jdk17-redis-common` — abstract API for Redis-backed buckets
- `bucket4j_jdk17-lettuce` — Lettuce client integration (Spring Boot default)
- `bucket4j_jdk17-redis-spring-data` — RedisTemplate-based integration (alternative)

Plan recon picks the one compatible with Spring Boot 3.5.11 + Lettuce. Likely `bucket4j_jdk17-lettuce` 8.18.0 (must match the core version).

### R3 — 11 existing rate-limit service classes — VERIFIED

Verified by grep on `backend/src/main/java/com/worshiproom/**/*.java` for `bucket4j`:

| File | Domain |
|------|--------|
| `upload/UploadRateLimitService.java` | Upload throttling |
| `legal/LegalAcceptRateLimitService.java` | Legal acceptance throttling |
| `proxy/common/RateLimitFilter.java` | Proxy-layer rate-limit filter |
| `post/ResolveRateLimitService.java` | Post resolution throttling |
| `post/report/ReportsRateLimitService.java` | Report submission throttling |
| `post/PostsRateLimitService.java` | Post create/update throttling |
| `post/engagement/BookmarksRateLimitService.java` | Bookmark toggle throttling |
| `post/engagement/ReactionsRateLimitService.java` | Reaction (praying/candle) throttling |
| `post/comment/CommentsRateLimitService.java` | Comment create/update throttling |
| `auth/ChangePasswordRateLimitService.java` | Change-password throttling |
| `auth/LoginRateLimitFilter.java` | Login throttling |

Plus `proxy/common/RateLimitExceededException.java` as a shared exception type (verified by name; plan recon reads to confirm).

All use bucket4j + Caffeine pattern. None is migrated in 5.6 (per D1 strangler pattern).

### R4 — Zero `@Cacheable` annotations exist — VERIFIED

Grep on `backend/src/main` for `@Cacheable` returns 0 matches. Caching is greenfield. 5.6 sets up infrastructure; subsequent specs add annotations.

### R5 — Testcontainers already in use — VERIFIED

`backend/pom.xml` lines 192-213:

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

<dependency>
  <groupId>org.testcontainers</groupId>
  <artifactId>minio</artifactId>
  <scope>test</scope>
</dependency>
```

The pom comment reads: *"Testcontainers (Spec 1.3) — real PostgreSQL in integration tests per 06-testing.md 'never use H2' rule. Versions managed by Spring Boot BOM."*

The Redis Testcontainer uses `GenericContainer("redis:7-alpine")` per the master plan; this is built into the core `testcontainers` artifact (no module needed). The new `RedisIntegrationTest` follows the same pattern as existing PostgreSQL integration tests — plan recon reads one existing PostgreSQL-Testcontainer test class as the template.

### R6 — Spring Boot starter actuator + Sentry already wired — VERIFIED

`backend/pom.xml`:

- Line 47: `spring-boot-starter-actuator` (health endpoints already exposed)
- Line 116: `io.sentry:sentry-spring-boot-starter-jakarta:8.40.0` with comment *"Auto-wires SDK init, request hooks, @ExceptionHandler integration, and MDC propagation. DSN-absent behavior is graceful no-op — see SentryConfig.java doc and backend/docs/runbook-monitoring.md for the runbook."*

`RedisHealthIndicator` integrates with the existing actuator setup by extending `org.springframework.boot.actuate.health.AbstractHealthIndicator`. The `/actuator/health/redis` endpoint is automatic given the bean name `redisHealthIndicator` (Spring Boot health endpoint conventions). Plan recon reads `SentryConfig.java` to understand how Sentry events are emitted from existing services.

### R7 — 3 existing application properties files — VERIFIED

`backend/src/main/resources/`:

- `application.properties` (base)
- `application-dev.properties` (dev profile)
- `application-prod.properties` (prod profile)

No `application-test.properties` exists yet. 5.6 creates one (per MPD-6).

**Plan recon must read** the existing application.properties to understand:

- Profile activation conventions (likely via `SPRING_PROFILES_ACTIVE` env var)
- Existing actuator config (`management.endpoints.web.exposure.include=*` or similar)
- Existing connection pool / HikariCP config (informs whether to set Lettuce equivalent settings)
- Existing `spring.cache.type` setting (likely absent; 5.6 adds it as `redis` in prod, `simple` in dev)

### R8 — docker-compose.yml exists with postgres service — VERIFIED

`/Users/Eric/worship-room/docker-compose.yml` (repo root) starts with:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
  ...
```

5.6 adds a `redis:7-alpine` service following the same pattern. Plan recon reads the existing postgres service definition to match conventions (volume naming, port mapping style, healthcheck shape if present, restart policy, network membership).

### R9 — `.env.example` exists — VERIFIED (location)

`backend/.env.example` exists. 5.6 modifies it to add `REDIS_URL`, `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` with empty defaults plus a comment explaining the precedence (`REDIS_URL` wins if set; triplet is fallback).

Plan recon also checks if a root-level `.env.example` exists for docker-compose configuration. If so, mirror the Redis env vars there too.

### R10 — `Dockerfile` exists — VERIFIED (location)

`backend/Dockerfile` exists. 5.6 likely does NOT modify it (Redis connection is configuration, not container build). Plan recon confirms.

### R11 — Existing `proxy/common/IpResolver.java` — PLAN-RECON-REQUIRED

Referenced from `auth/LoginRateLimitFilter.java` line 7 as `import com.worshiproom.proxy.common.IpResolver;`. Provides the IP-or-userId hash used as the bucket key for anonymous rate limiting. The new `RateLimiter` interface accepts a bucket key as a `String`; plan recon decides whether the new interface forces consumers to compute the key (via `IpResolver`) before calling, or whether the interface offers an overload that accepts an HTTP request and computes the key internally.

**Default recommendation:** consumers compute the key; interface is `tryConsume(String bucketKey, BucketConfiguration config): boolean` (or similar). Keeps the interface narrow and testable.

### R12 — Existing `proxy/common/RateLimitExceededException.java` — PLAN-RECON-REQUIRED

Referenced from multiple rate-limit services. The new `RateLimiter` interface's contract for refusal could throw this exception OR return a boolean OR return a result object. Plan recon reads the existing exception's usage pattern and the new interface preserves backward-compatible refusal semantics (likely a `RateLimitResult` record with `allowed: boolean`, `remaining: long`, `retryAfter: Duration`).

### R13 — bucket4j-Redis extension artifact ID and version — PLAN-RECON-REQUIRED

Maven Central artifact name is unverified. Candidates:

- `com.bucket4j:bucket4j_jdk17-redis-common` (transitive infrastructure for any Redis-backed bucket)
- `com.bucket4j:bucket4j_jdk17-lettuce` (Lettuce client integration; expected match for Spring Boot default)
- `com.bucket4j:bucket4j_jdk17-redis-spring-data` (RedisTemplate-based; alternative)

Plan recon picks one. Both produce a `LettuceBasedProxyManager` (or `SpringDataRedisProxyManager`) that the `RedisRateLimiter` consumes. Version must match the existing `bucket4j_jdk17-core` 8.18.0.

If the artifact doesn't exist at 8.18.0 for Lettuce, the MAX override moment from Section 2 applies.

### R14 — Existing Sentry test harness pattern — PLAN-RECON-REQUIRED

Referenced in `SentryConfig.java` (per pom.xml comment R6). Plan recon reads `SentryConfig.java` and any existing Sentry-emitting code to identify the test pattern. Most likely:

- A `@MockBean` or `@SpyBean` on the Sentry hub/client
- An interceptor on `SentryOptions.setBeforeSend(...)` for test assertions
- A separate `SentryTestConfig` that swaps in a no-op or capturing Sentry client

The RedisRateLimiter / RedisHealthIndicator / CacheConfig classes use the existing pattern for Sentry emission; no new pattern introduced.

### R15 — Existing logback / structured logging configuration — PLAN-RECON-REQUIRED

Pom.xml line 122-124 shows `net.logstash.logback:logstash-logback-encoder:8.0`. Logback is structured JSON. Plan recon reads `backend/src/main/resources/logback-spring.xml` to confirm the structured-log format. Redis operation logs (DEBUG for duration, WARN for slow ops, ERROR for failures) emit through the existing logger; no logger config changes in 5.6.

---

## 6. Phase 3 Execution Reality Addendum gates — applicability

The Phase 3 Execution Reality Addendum was authored for visual / chrome migration work. 5.6 is backend infrastructure; most gates don't apply. The brief defines a backend-equivalent gate set as Gates 23-28.

| Gate | Description | 5.6 applicability |
|------|-------------|-------------------|
| Gates 1-7 | Standard visual/chrome migration gates | **N/A** — not visual work |
| Gate 17 | Universal Rule 17 axe-core (visual a11y) | **N/A** |
| Gate 18 | Visual parity gate | **N/A** |
| Gate 19 | Brand voice gate | **N/A** |
| Gate 20 | `prefers-reduced-motion` preservation | **N/A** |
| Gate 21 | Lighthouse Performance | **N/A** |
| Gate 22 | Daily Hub Catalog (5.5 innovation) | **N/A** |
| **Gate 23 (NEW for 5.6)** | Testcontainer-based Redis integration test — no Redis mocking | **APPLIES** |
| **Gate 24 (NEW for 5.6)** | Contract test parity between InMemoryRateLimiter and RedisRateLimiter | **APPLIES** |
| **Gate 25 (NEW for 5.6)** | Every Redis SET has explicit TTL (repo-wide grep test) | **APPLIES** |
| **Gate 26 (NEW for 5.6)** | Circuit breaker engagement + recovery verified by Testcontainer stop/start | **APPLIES** |
| **Gate 27 (NEW for 5.6)** | Health endpoint reports DEGRADED (not DOWN) when Redis unreachable, per D4 | **APPLIES** |
| **Gate 28 (NEW for 5.6)** | No new rate-limit service is migrated in 5.6 — strangler pattern preserved | **APPLIES** |

Gates 23-26 inherit from existing project standards (Testcontainers for real-data integration tests is per `06-testing.md` *"never use H2"* rule; the same rule applies *"never mock Redis when a Testcontainer can validate the real semantics"*). Plan recon reads `06-testing.md` to confirm exact wording.

Gate 27 codifies D4. Gate 28 codifies D1.

---

## 7. Decisions and divergences

### D1 — Strangler pattern over mass refactor (the central design call)

Per MPD-1. 5.6 ships the new infrastructure (`RateLimiter` interface, `InMemoryRateLimiter`, `RedisRateLimiter`, `RateLimiterConfig`) and the contract test that validates behavioral parity. **No existing rate-limit service is migrated.** The 11 per-domain services keep their bucket4j+Caffeine setups untouched.

The **first** new consumer (likely Phase 6.1 Prayer Receipt's `GET /api/v1/posts/{id}/prayer-receipt` endpoint, which is the first endpoint to need cache + cross-instance rate limiting per master plan) consumes the new interface.

Follow-up specs migrate existing services per cross-instance need:

- **High-priority follow-up:** Spec 5.7 (or similar) migrates `LoginRateLimitFilter` first. Login rate limiting is security-critical and must share state across instances in production.
- **Medium-priority follow-up:** Migrate high-traffic services next: `PostsRateLimitService`, `ReactionsRateLimitService`, `CommentsRateLimitService`. These benefit from cross-instance state but aren't security-blocking.
- **Low-priority follow-up:** Migrate low-traffic services (Upload, Legal, ChangePassword, Reports, Resolve, Bookmarks) when needed.

### D2 — bucket4j algorithm preserved across both impls; sorted sets reserved for presence

Per MPD-2. RedisRateLimiter uses bucket4j's Lettuce-Redis extension. The token-bucket algorithm is identical to the in-memory version; only the bucket state storage differs (in-memory `Caffeine<String, Bucket>` vs Redis-backed `LettuceBasedProxyManager`).

### D3 — Profile-aware `RateLimiterConfig` selects impl by Spring profile

`RateLimiterConfig.java` is a `@Configuration` class. Bean selection:

- `dev` profile → `InMemoryRateLimiter` bean
- `prod` profile → `RedisRateLimiter` bean (with degraded fallback to `InMemoryRateLimiter` per D4)
- `test` profile → `InMemoryRateLimiter` by default; integration tests targeting Redis use `@ActiveProfiles("prod")` or `@TestPropertySource` to override

Implementation: `@Bean @Profile("dev | test")` for the in-memory; `@Bean @Profile("prod")` for the Redis (with the wrapper from D4). Plan recon picks the exact `@Profile` syntax.

### D4 — Optional Redis in prod with degraded health (default)

Per MPD-4. If Redis is unreachable at boot:

1. `RateLimiterConfig` falls back to `InMemoryRateLimiter` bean (prod profile, but Redis-not-available)
2. `CacheConfig` falls back to `NoOpCacheManager` or equivalent (cache bypass)
3. `RedisHealthIndicator` reports `DOWN`
4. Overall `/actuator/health` reports `DEGRADED` (Spring Boot's three-state health model with a custom aggregator)
5. Sentry receives an error event with context ("Redis unreachable at startup; service running in degraded mode")
6. Backend boots normally and serves requests; rate limiting is single-instance; caching is bypassed

If Eric prefers hard-fail: override D4 at brief review. The contract test and infrastructure remain unchanged; only the `RateLimiterConfig` startup behavior shifts.

### D5 — Zero `@Cacheable` annotations added in 5.6

Per MPD-3. 5.6 builds the road; consumers add the cars. The TTL-enforcement test passes vacuously today.

### D6 — `REDIS_URL` precedence over triplet; provider-agnostic

Connection resolution:

1. If `REDIS_URL` is set (any non-empty value), parse it as the Upstash-compatible URL format: `redis[s]://[user][:password]@host[:port][/db]`. Extract host, port, password, SSL flag, database index.
2. Otherwise, fall back to `REDIS_HOST` + `REDIS_PORT` + `REDIS_PASSWORD` triplet. Defaults if missing: `REDIS_HOST=localhost`, `REDIS_PORT=6379`, `REDIS_PASSWORD=` (empty).
3. Document precedence in `backend/docs/redis-conventions.md`.

Works against any Redis provider (Upstash, Redis Cloud, Railway, ElastiCache, self-hosted, Docker).

### D7 — Testcontainer pattern matches existing PostgreSQL convention

New `RedisIntegrationTest.java` declares the container as a static field with `@Container`:

```java
@Testcontainers
class RedisIntegrationTest {
    @Container
    static GenericContainer<?> redis = new GenericContainer<>("redis:7-alpine")
        .withExposedPorts(6379);

    @DynamicPropertySource
    static void redisProps(DynamicPropertyRegistry r) {
        r.add("spring.data.redis.host", redis::getHost);
        r.add("spring.data.redis.port", () -> redis.getMappedPort(6379));
    }
    // ...
}
```

One container per test class (per master plan testing notes). Plan recon reads an existing PostgreSQL Testcontainer test as the template.

### D8 — Circuit breaker implemented as a thin wrapper, not Resilience4j

The circuit breaker pattern (3 consecutive failures → bypass for 30s) is implemented in `CacheConfig.java` as a thin custom wrapper around the Redis-backed `CacheManager`:

- Wrapper delegates to Redis-backed cache when `circuit.closed == true`
- On 3 consecutive `RedisConnectionException` (or similar), `circuit.closed = false`; cache reads/writes return immediately (bypass; null reads, no-op writes)
- After 30 seconds, the next call attempts Redis; success → close circuit; failure → reset 30-second timer
- Counter is `AtomicInteger` (in-memory; doesn't need cross-instance state)

No Resilience4j dependency added. Reasons:

- Single use case; the algorithm is ~30 lines of code
- Resilience4j adds significant dependency weight for a feature 5.6 uses in exactly one place
- The custom wrapper is testable via Testcontainer stop/start without external library complexity
- Future specs can adopt Resilience4j if circuit-breaker patterns proliferate beyond cache

### D9 — Rate limiter interface accepts pre-computed bucket key

Per R11. The `RateLimiter` interface signature:

```java
public interface RateLimiter {
    RateLimitResult tryConsume(String bucketKey, BucketConfiguration config);
}

public record RateLimitResult(boolean allowed, long remaining, Duration retryAfter) {}
```

Consumers compute the bucket key (via existing `IpResolver` or their own logic) before calling. Keeps the interface narrow and testable without HTTP request context coupling.

If plan recon discovers a strong reason to also offer an HTTP-request overload, fine — it would be `tryConsume(HttpServletRequest req, EndpointCategory category)` as a convenience wrapper around the narrow form. Default: narrow form only.

### D10 — No new dependencies beyond Redis-specific additions

5.6 adds:

- `spring-boot-starter-data-redis` (no version; BOM-resolved)
- `bucket4j_jdk17-lettuce` (or equivalent; version matches `bucket4j_jdk17-core` 8.18.0)

No other new dependencies. Specifically:

- **No Resilience4j** (per D8)
- **No Redisson** (Lettuce via Spring Data Redis is sufficient)
- **No Spring Session Data Redis** (no session storage; out of scope per master plan)
- **No new test libraries** (Testcontainers already in use; AssertJ + JUnit 5 already in use)

### D11 — Key namespace conventions documented and enforced by lint

`backend/docs/redis-conventions.md` documents:

- `cache:*` for Spring `@Cacheable`-managed entries
- `rate:*` for rate-limit buckets, format: `rate:{endpoint-category}:{authed|anon}:{user-id-or-ip-hash}:{window-start-epoch}`
- `presence:*` reserved for Phase 6 Live Presence (sorted-set keys)
- `lock:*` reserved for future distributed locks (currently out of scope)
- Mandatory TTL on every key
- Sorted-set conventions for time-windowed data
- Binary-safe string values only; structured data serializes to JSON

The document is a 5.6 deliverable. Subsequent specs extend it.

Gate 25 (Section 6) enforces TTL presence via a repo-wide grep test. Plan recon designs the test predicate.

### D12 — Observability follows existing patterns; no new infrastructure

- DEBUG-level logging for every Redis operation (key, op, duration_ms) via the existing logstash-logback-encoder pipeline
- WARN-level logging for slow ops (>100ms) via the same pipeline
- ERROR-level logging for Redis failures + Sentry event emission via the existing Sentry integration
- Health indicator integrates with existing actuator setup

No new logging infrastructure, no new Sentry config, no new actuator config. 5.6 consumes what's already wired.

<!-- CHUNK_BOUNDARY_3 -->

---

## 8. Watch-fors

### W1 — Branch discipline

Stay on `forums-wave-continued`. Never run git mutations. See Section 1.

### W2 — 5.5 must ship before 5.6 execution

5.5 status: ⬜ (brief authored 2026-05-11). 5.6 spec can be written in parallel (specs serialize separately from execution), but `/execute-plan-forums spec-5-6` is BLOCKED until 5.5 ships and merges to `forums-wave-continued`. Plan recon confirms 5.5 status before unblocking execution.

### W3 — Strangler pattern is binding (D1 / Gate 28)

**No existing rate-limit service file is modified in 5.6.** The 11 existing `*RateLimit*.java` files keep their bucket4j+Caffeine setups unchanged. If execute-time CC instinctively reaches to migrate `LoginRateLimitFilter` because "it would benefit from cross-instance state," STOP and surface to Eric. Per-service migration is a follow-up spec, NOT a 5.6 deliverable.

Follow-up specs migrate per-service rate limiters with explicit per-service intent and per-service testing. Folding any of those into 5.6 dilutes both the infrastructure work and the migration work.

### W4 — No `@Cacheable` annotations added in 5.6 (D5 / MPD-3)

Zero `@Cacheable` annotations exist today (R4). 5.6 ships the CacheManager infrastructure but does NOT annotate any methods. If plan-time or execute-time CC proposes adding `@Cacheable` to `PostService.getPost()` or similar "obvious" caching wins, reject. The Phase 6.1 Prayer Receipt spec is the first natural consumer; let it own its caching decisions.

### W5 — No Liquibase changesets added (MPD-7)

Redis is schemaless. No SQL migrations. `db/changelog/` is untouched.

### W6 — No new dependencies beyond Redis-specific (D10)

Add exactly two new dependency entries to `backend/pom.xml`:

- `spring-boot-starter-data-redis` (BOM-resolved version)
- `bucket4j_jdk17-lettuce` (or equivalent; version pinned to match `bucket4j_jdk17-core` 8.18.0)

Reject:

- **Resilience4j** — the circuit breaker is a thin custom wrapper (D8)
- **Redisson** — Lettuce via Spring Data Redis is sufficient
- **Spring Session Data Redis** — no session storage in scope
- **Any new test library** — Testcontainers + JUnit 5 + AssertJ already present

### W7 — Bucket4j algorithm preserved across both impls (D2 / MPD-2)

The master plan body line referencing sorted sets for rate limiting applies to **presence** (Phase 6). 5.6's rate limiting uses bucket4j token-bucket on both sides. If plan-time CC proposes a sorted-set-based sliding window for the Redis impl, reject. Contract test parity requires same algorithm.

### W8 — Every Redis key has explicit TTL (Gate 25)

No un-TTL'd keys. Every `redisTemplate.opsForValue().set(...)`, every `@Cacheable` cache name, every rate-limit bucket has an explicit expiry. The repo-wide grep test enforces this. Plan recon designs the test predicate.

If execute-time CC writes a raw `.set(key, value)` without a TTL overload, the grep test fails and execution halts.

### W9 — Circuit breaker is a custom thin wrapper, not a library (D8)

Resilience4j is NOT added as a dependency. The circuit breaker is ~30 lines of code in `CacheConfig.java` (or a small helper class). State is `AtomicInteger` (in-memory; not Redis-backed; not cross-instance). The recovery window is 30 seconds.

If plan-time CC proposes Resilience4j on grounds of "production-ready library," reject. The dependency weight is unjustified for a single use case.

### W10 — Health endpoint reports DEGRADED, not DOWN, when Redis unreachable (D4 / Gate 27)

Spring Boot's default `HealthAggregator` returns `DOWN` if any indicator is `DOWN`. 5.6 customizes the aggregator (or uses Spring Boot 3.x's `StatusAggregator` API) so that Redis being `DOWN` produces an OVERALL `DEGRADED` status, not `DOWN`. Reasoning: backend serves requests in degraded mode; "DOWN" misrepresents the actual state to load balancers and uptime monitors.

Plan recon picks the exact aggregator mechanism.

### W11 — No mocking of `RedisTemplate` or `Bucket` (Gate 23)

Master plan testing notes are explicit: *"Do NOT mock Spring's `RedisTemplate` — the value is in exercising real Redis semantics."* All integration tests use Testcontainers. Unit tests for pure-logic helpers (the bucket-key formatter, the URL parser) can use plain JUnit without container.

If execute-time CC adds `@MockBean RedisTemplate` or `Mockito.mock(Bucket.class)`, reject.

### W12 — No `Caveat`, `font-script`, FrostedCard, or other frontend tokens in this brief

5.6 is backend-only. The brief should never reference frontend tokens, Tailwind classes, design system rules (09-design-system.md), or visual primitives. If execute-time CC accidentally edits a frontend file, reject.

### W13 — No edits to existing rate-limit service files (W3 codified)

Callback to W3. Repeating because this is the load-bearing scope guarantee.

### W14 — No edits to design system rules files

`.claude/rules/09-design-system.md` and other rules files are out of scope. If plan-time CC proposes documenting Redis patterns in rules files, reject — `backend/docs/redis-conventions.md` is the canonical location.

### W15 — Single config class per concern

- `RedisConfig.java` — connection factory, RedisTemplate beans
- `CacheConfig.java` — CacheManager bean + circuit breaker wrapper
- `RedisHealthIndicator.java` — actuator health indicator
- `RateLimiterConfig.java` — RateLimiter bean selection per profile

Keep these separate. If plan-time CC proposes merging them into a single `RedisAutoConfiguration` for "simplicity," reject — separation of concerns aids future modification and testing.

### W16 — Maven not Gradle; Java 17+

Project uses Maven. The bucket4j artifact group is `com.bucket4j` (note the `_jdk17` suffix indicating JDK 17 compatibility). All new classes target Java 17 features as appropriate (records, sealed interfaces, pattern matching).

Do not introduce Gradle build files. Do not target Java 11 or earlier.

### W17 — `application-test.properties` is NEW (MPD-6)

File does not exist today. 5.6 creates it. Plan recon designs the file's content based on existing test patterns.

### W18 — Sentry emission uses existing pattern (R14)

Do not reinvent Sentry integration. The existing `SentryConfig.java` is the canonical entry point. Redis failures emit via the same path as existing Spring `@ExceptionHandler` integrations.

### W19 — No session storage in Redis

Master plan out-of-scope explicit: *"Session storage in Redis (JWT is stateless in-memory per Decision 6 — no sessions to store)."* If plan-time CC proposes Spring Session Data Redis, reject.

### W20 — No distributed locks

Master plan out-of-scope explicit. No `lock:*` key namespace usage in 5.6 (the namespace is reserved in `redis-conventions.md` per D11 but no consumers).

### W21 — No full-text search in Redis

Master plan out-of-scope explicit. PostgreSQL handles full-text search per Phase 11.

### W22 — No Redis Streams or Pub/Sub

Master plan out-of-scope explicit. Presence in Phase 6 uses sorted sets, not pub/sub.

### W23 — docker-compose Redis service uses AOF persistence

Master plan substack 1: *"docker-compose.yml gains a redis:7-alpine service with a named volume for AOF persistence (appendonly yes)."* The AOF persistence flag is for dev convenience (cache survives container restarts during local dev). Production Redis configuration is provider-managed (Upstash sets its own persistence policy).

### W24 — Rate-limit bucket key format is fixed (D11)

`rate:{endpoint-category}:{authed|anon}:{user-id-or-ip-hash}:{window-start-epoch}` is the format. Plan recon decides the exact endpoint-category enum (login / posts / reactions / comments / etc.) based on existing per-service categories. Future-proofing: the enum can grow without schema changes (it's just a key segment).

### W25 — Documentation lives at `backend/docs/redis-conventions.md`

Not `_forums_master_plan/`, not `.claude/rules/`, not `/docs/`. The file lives next to other backend docs (`backend/docs/runbook-monitoring.md` per pom comment R6). Plan recon confirms the docs directory exists and lists existing docs for cross-reference patterns.

### W26 — Eric updates spec-tracker manually after merge

Master plan tracker at `_forums_master_plan/spec-tracker.md`. 5.6 status flips ⬜ → ✅ after:

1. PR merged to `forums-wave-continued`
2. Manual dev-stack smoke confirms backend boots against `docker-compose up -d` with Redis
3. (Optional) Staging deployment confirms `/actuator/health/redis` returns UP against a real Redis

Spec and plan must NOT modify spec-tracker.md as part of execution.

### W27 — No Phase 6 work in 5.6

Do not implement presence, prayer receipt caching, sorted-set patterns, or any Phase 6.x feature. 5.6 is the foundation; Phase 6 consumes it. If plan-time CC instinctively proposes "while we're at it, let's add a stub PresenceService," reject.

### W28 — Test profile defaults preserve existing test behavior

`application-test.properties` (new) must not break existing test runs. Existing tests rely on dev-profile defaults plus `@TestPropertySource` overrides. The new test-profile file provides Redis Testcontainer connection defaults but should not flip cache backend or rate limiter selection for tests that don't touch Redis.

Default `application-test.properties` content (plan recon refines):

```properties
# Test profile defaults
# Redis connection — Testcontainer dynamic properties override these
spring.data.redis.host=localhost
spring.data.redis.port=6379

# Default to in-memory cache and rate limiter for tests that don't touch Redis
spring.cache.type=simple
ratelimit.backend=memory

# Redis-touching tests use @ActiveProfiles("prod") or @TestPropertySource
```

---

## 9. Test specifications

Master plan AC: *"At least 18 tests across cache config, rate limiter contract, Redis health, and circuit breaker."*

The brief refines to specific test classes and approximate test counts. Plan recon finalizes per actual implementation.

### Test 1 — `RedisIntegrationTest.java` (NEW)

Location: `backend/src/test/java/com/worshiproom/cache/RedisIntegrationTest.java`

Master plan AC coverage: connectivity, health indicator, REDIS_URL parsing, REDIS_HOST/PORT/PASSWORD triplet parsing.

Approximate test count: 5-7

Scenarios:

- Container starts and accepts connections
- `RedisHealthIndicator` reports UP when reachable
- `RedisHealthIndicator` reports DOWN when Testcontainer stopped
- `REDIS_URL` parsing (with and without SSL prefix, with and without database index)
- `REDIS_HOST/PORT/PASSWORD` triplet parsing
- Precedence: `REDIS_URL` set + triplet set → URL wins
- Connection metadata exposed via `/actuator/health/redis` body

### Test 2 — `CacheConfigIntegrationTest.java` (NEW)

Location: `backend/src/test/java/com/worshiproom/cache/CacheConfigIntegrationTest.java`

Master plan AC coverage: CacheManager profile selection, circuit breaker engagement, circuit breaker recovery, TTL configuration.

Approximate test count: 6-8

Scenarios:

- `dev` profile → `ConcurrentMapCacheManager` autowired
- `prod` profile → `RedisCacheManager` autowired (against Testcontainer)
- Cache GET/SET round-trip with TTL applied (verify TTL via `redisTemplate.getExpire(key)`)
- Circuit breaker: 3 consecutive Redis failures → cache reads return null without further Redis attempts
- Circuit breaker: 30 seconds after open, next call attempts Redis; success closes circuit
- Circuit breaker: 30 seconds after open, next call attempts Redis; failure resets the 30-second timer
- Cache bypass during circuit-open does not throw (silent degradation)
- TTL-enforcement repo-wide test passes against zero `@Cacheable` annotations today (vacuous truth)

### Test 3 — `RateLimiterContractTest.java` (NEW) — THE LOAD-BEARING TEST

Location: `backend/src/test/java/com/worshiproom/ratelimit/RateLimiterContractTest.java`

This is the most important test in 5.6 per the master plan's out-of-band notes.

Parametrized over both implementations. Use JUnit 5's `@ParameterizedTest` with a `@MethodSource` providing `InMemoryRateLimiter.class` and `RedisRateLimiter.class` (constructed against a Testcontainer for the Redis variant).

Approximate test count: 8-10

Scenarios (each parametrized over both impls):

1. **Basic consumption.** N requests consume N tokens; capacity remaining = original - N.
2. **Rejection.** Capacity + 1 requests → last request returns `allowed=false`.
3. **Refill.** After full refill window, capacity is restored. Burst-capacity rules respected.
4. **Per-key isolation.** Different bucket keys consume from independent buckets.
5. **Concurrent requests on same key.** 10 parallel threads on the same key; exactly `min(threads, capacity)` succeed; total admissions equal expected.
6. **`remaining` semantics.** After K successful consumptions, `result.remaining()` equals expected. Monotonically non-increasing within a window.
7. **`retryAfter` semantics.** When rejected, `retryAfter` equals time until next token availability.
8. **Configuration parity.** Same `BucketConfiguration` produces same observable behavior across both impls.

Plus Redis-specific (not parametrized; runs against RedisRateLimiter only):

9. **Cross-instance state.** Two `RedisRateLimiter` instances sharing the same Redis backend share state; consumption from one is visible to the other.

### Test 4 — `RedisRateLimiterIntegrationTest.java` (NEW)

Location: `backend/src/test/java/com/worshiproom/ratelimit/RedisRateLimiterIntegrationTest.java`

Master plan AC coverage: Redis-backed rate limiter integration tests.

Approximate test count: 4-6

Scenarios:

- 2-instance simulation: spawn two `@SpringBootTest` instances with the same Redis Testcontainer; rate-limit state mathematically accurate (per master plan AC)
- `X-RateLimit-Remaining` header reflects Redis-backed count in prod profile (integration with `@Controller` if existing rate-limit filter consumes the new interface in a test context)
- Lua script behavior under contention (bucket4j-redis uses Lua for atomic decrement; verify no race conditions under high concurrency)
- TTL on bucket keys (rate-limit buckets expire after their refill window + safety margin)

### Test 5 — Repo-wide TTL grep test (NEW)

Location: `backend/src/test/java/com/worshiproom/cache/RepoWideTtlEnforcementTest.java` (or similar; plan recon picks)

Test scans `backend/src/main/java/**/*.java` for raw `redisTemplate.opsForValue().set(...)` calls and asserts each has a TTL overload (`.set(key, value, Duration.ofXxx(...))`) or is followed by an `.expire(...)` call.

Also scans for `@Cacheable` annotations and asserts each cache name has a corresponding `spring.cache.redis.time-to-live.<cacheName>` property.

Approximate test count: 1 (with N sub-assertions where N = matches found; today zero matches today, so vacuous truth)

### Test 6 — Existing rate-limit service tests — NO CHANGES

The 11 existing per-service rate-limit tests stay unchanged. Per D1 / W3, no existing service is migrated in 5.6.

If plan-time CC discovers an existing rate-limit test fails after the Maven dependency changes (e.g., because the bucket4j-lettuce extension transitively pulls a conflicting Lettuce version), that's an R-OVR moment — plan recon investigates and may need to add an exclusion to the new dependency.

### Net test count

Approximate: 24-32 new tests across 5 new test classes. Master plan AC requires ≥18. Brief comfortably exceeds.

Plan recon refines counts based on actual implementation. The contract test (Test 3) is load-bearing; it cannot be cut.

---

## 10. Files to Create / Modify / NOT to Modify / Delete

### CREATE

**Backend source:**

- `backend/src/main/java/com/worshiproom/cache/RedisConfig.java` — connection factory, `RedisTemplate` beans, `LettuceConnectionFactory` configuration
- `backend/src/main/java/com/worshiproom/cache/CacheConfig.java` — profile-aware `CacheManager` bean, circuit breaker wrapper (per D8), per-cache TTL configuration consumer
- `backend/src/main/java/com/worshiproom/cache/RedisHealthIndicator.java` — actuator health indicator (extends `AbstractHealthIndicator`)
- `backend/src/main/java/com/worshiproom/ratelimit/RateLimiter.java` — interface (per D9)
- `backend/src/main/java/com/worshiproom/ratelimit/RateLimitResult.java` — record (per D9; could be a nested record in `RateLimiter.java` per plan recon)
- `backend/src/main/java/com/worshiproom/ratelimit/InMemoryRateLimiter.java` — bucket4j + Caffeine implementation
- `backend/src/main/java/com/worshiproom/ratelimit/RedisRateLimiter.java` — bucket4j-lettuce implementation
- `backend/src/main/java/com/worshiproom/ratelimit/RateLimiterConfig.java` — profile-aware bean selection (per D3 / D4)

**Backend tests:**

- `backend/src/test/java/com/worshiproom/cache/RedisIntegrationTest.java` (per Test 1)
- `backend/src/test/java/com/worshiproom/cache/CacheConfigIntegrationTest.java` (per Test 2)
- `backend/src/test/java/com/worshiproom/cache/RepoWideTtlEnforcementTest.java` (per Test 5)
- `backend/src/test/java/com/worshiproom/ratelimit/RateLimiterContractTest.java` (per Test 3 — LOAD-BEARING)
- `backend/src/test/java/com/worshiproom/ratelimit/RedisRateLimiterIntegrationTest.java` (per Test 4)

**Backend resources:**

- `backend/src/main/resources/application-test.properties` (per MPD-6)

**Backend docs:**

- `backend/docs/redis-conventions.md` (per D11)

**Note on `InMemoryRateLimiter` test:** Existing test patterns suggest each new `RateLimiter` impl gets a dedicated unit test in addition to the contract test. Plan recon decides whether `InMemoryRateLimiterUnitTest.java` is needed or whether the contract test's coverage is sufficient. Default: contract test is the comprehensive coverage; per-impl unit tests are optional and only added if a unique behavior needs isolated testing.

### MODIFY

**Backend Maven build:**

- `backend/pom.xml` — add `spring-boot-starter-data-redis`, add `bucket4j_jdk17-lettuce` (per D10 / W6)

**Backend resources:**

- `backend/src/main/resources/application.properties` — add Redis connection placeholders (`spring.data.redis.host=${REDIS_HOST:localhost}`, etc.), cache type, rate limiter backend selector
- `backend/src/main/resources/application-dev.properties` — confirm `spring.cache.type=simple` and `ratelimit.backend=memory` defaults
- `backend/src/main/resources/application-prod.properties` — set `spring.cache.type=redis` and `ratelimit.backend=redis`; document Redis env var precedence

**Backend env:**

- `backend/.env.example` — add `REDIS_URL` (commented, with documentation), `REDIS_HOST=localhost`, `REDIS_PORT=6379`, `REDIS_PASSWORD=`

**Repo root:**

- `docker-compose.yml` — add `redis:7-alpine` service (per R8 / W23)
- (Possibly) repo-root `.env.example` if it exists — mirror Redis env vars

### NOT TO MODIFY

**Existing rate-limit services (W3 / D1 strangler pattern):**

- `backend/src/main/java/com/worshiproom/upload/UploadRateLimitService.java`
- `backend/src/main/java/com/worshiproom/legal/LegalAcceptRateLimitService.java`
- `backend/src/main/java/com/worshiproom/proxy/common/RateLimitFilter.java`
- `backend/src/main/java/com/worshiproom/post/ResolveRateLimitService.java`
- `backend/src/main/java/com/worshiproom/post/report/ReportsRateLimitService.java`
- `backend/src/main/java/com/worshiproom/post/PostsRateLimitService.java`
- `backend/src/main/java/com/worshiproom/post/engagement/BookmarksRateLimitService.java`
- `backend/src/main/java/com/worshiproom/post/engagement/ReactionsRateLimitService.java`
- `backend/src/main/java/com/worshiproom/post/comment/CommentsRateLimitService.java`
- `backend/src/main/java/com/worshiproom/auth/ChangePasswordRateLimitService.java`
- `backend/src/main/java/com/worshiproom/auth/LoginRateLimitFilter.java`
- `backend/src/main/java/com/worshiproom/proxy/common/IpResolver.java`
- `backend/src/main/java/com/worshiproom/proxy/common/RateLimitExceededException.java`
- All existing tests for the above

**Frontend (5.6 is backend-only):**

- All of `frontend/`

**Liquibase / database (W5):**

- `backend/src/main/resources/db/changelog/**`

**Rules files (W14):**

- `.claude/rules/**`

**Spec-tracker (W26):**

- `_forums_master_plan/spec-tracker.md` — Eric updates manually post-merge
- `_forums_master_plan/round3-master-plan.md` — no master plan edits in 5.6

**Frontend / visual files:**

- All Prayer Wall surfaces (5.6 has no visual scope)
- All Daily Hub surfaces
- `09-design-system.md`

**Historical specs:**

- `_specs/forums/spec-5-1.md`, `5-3.md`, `5-4.md`, `5-5.md` — do not edit

**Existing Sentry/logging/actuator config:**

- `backend/src/main/java/com/worshiproom/.../SentryConfig.java` (read-only at plan time)
- `backend/src/main/resources/logback-spring.xml` (read-only at plan time)

**Other backend files not in CREATE/MODIFY lists:**

- `backend/Dockerfile`, `backend/.mvn/`, `backend/mvnw` (no build changes)
- `backend/README.md` (plan recon decides if a README addition is warranted; default: no, the new `redis-conventions.md` is the canonical reference)

### DELETE

None. 5.6 is purely additive.

<!-- CHUNK_BOUNDARY_4 -->

---

## 11. Acceptance criteria

Master plan AC verbatim (14 items):

- [ ] Redis 7 service running in docker-compose dev stack with AOF persistence
- [ ] Spring Data Redis dependency present and Lettuce client active
- [ ] `REDIS_URL` (Upstash-style) parses correctly when set instead of HOST/PORT/PASSWORD triplet
- [ ] `RedisHealthIndicator` reports UP when Redis is reachable, DOWN otherwise; exposed via `/actuator/health/redis`
- [ ] `CacheManager` bean is Redis-backed in `prod` profile, ConcurrentMap-backed in `dev` profile
- [ ] All configured `@Cacheable` methods have explicit TTL (verified by test that scans `@Cacheable` annotations) — satisfied vacuously today per D5
- [ ] Rate limiter contract test passes against both InMemoryRateLimiter and RedisRateLimiter
- [ ] Rate limiter correctly tracks requests across simulated multiple-instance scenario
- [ ] `X-RateLimit-Remaining` header reflects Redis-backed count in prod profile
- [ ] Cache bypass circuit breaker engages after 3 consecutive Redis failures
- [ ] Cache bypass recovers automatically when Redis comes back
- [ ] Redis connection failures are logged at ERROR and propagate to Sentry
- [ ] Every Redis key set in the app has an associated TTL (verified by repo-wide grep test)
- [ ] `backend/docs/redis-conventions.md` documents key namespaces, TTL policy, sorted-set examples
- [ ] Rate limit headers mathematically accurate under 2-instance simulation
- [ ] At least 18 tests across cache config, rate limiter contract, Redis health, and circuit breaker

Brief expansion AC (Section 4 MPDs + Section 7 D-decisions):

- [ ] Strangler pattern preserved: zero existing rate-limit service files modified (Gate 28 / W3 / D1)
- [ ] Zero `@Cacheable` annotations added in 5.6 diff (D5 / W4)
- [ ] Zero Liquibase changesets added (MPD-7 / W5)
- [ ] Health endpoint reports DEGRADED (not DOWN) when Redis unreachable (Gate 27 / D4 / W10)
- [ ] No new dependencies beyond `spring-boot-starter-data-redis` and `bucket4j_jdk17-lettuce` (D10 / W6)
- [ ] Circuit breaker is a custom thin wrapper (~30 lines), not Resilience4j (D8 / W9)
- [ ] No `RedisTemplate` or `Bucket` mocking in tests (Gate 23 / W11)
- [ ] Bucket4j token-bucket algorithm preserved across both impls; no sorted-set sliding window for rate limiting (D2 / W7)
- [ ] `RateLimiter` interface signature is `tryConsume(String bucketKey, BucketConfiguration config): RateLimitResult` (D9)
- [ ] `REDIS_URL` precedence over triplet is documented in `backend/docs/redis-conventions.md` (D6 / D11)
- [ ] Key namespace conventions (`cache:*`, `rate:*`, `presence:*`, `lock:*`) documented in `redis-conventions.md` (D11)
- [ ] Contract test exercises 8-10 scenarios parametrized over both impls plus 1 Redis-specific scenario (Section 9 Test 3)
- [ ] `application-test.properties` created with Testcontainer-friendly defaults (MPD-6 / W17 / W28)
- [ ] Free-tier Redis upgrade decision criteria documented in `redis-conventions.md` (MPD-5)
- [ ] Spec-tracker.md not modified by spec or plan execution (W26)
- [ ] Master plan body not modified (W14 / MODIFY list)

Follow-up issue AC:

- [ ] A follow-up issue is filed (in `_plans/follow-ups/` or wherever Eric tracks follow-ups) titled "Spec 5.7 (or similar): Migrate per-service rate limiters to `RateLimiter` interface" with priority ranking per D1's follow-up list

Verification AC:

- [ ] All 5 new test classes pass (Section 9)
- [ ] Net new test count is ≥18 (master plan AC) and ideally 24-32 per brief Section 9
- [ ] `/code-review` passes with zero Blocker, zero Major findings
- [ ] Manual dev-stack smoke (Section 3) succeeds
- [ ] (If staging exists) Staging smoke (Section 3) succeeds
- [ ] Manual Eric review: spec-tracker flipped ⬜ → ✅ after merge + smoke

---

## 12. Out of scope

Master plan body's out-of-scope items (verbatim):

- Redis Streams or Pub/Sub
- Multi-region Redis replication
- Redis Cluster
- Session storage in Redis
- Full-text search in Redis
- Distributed locks

Brief expansion — explicit deferrals:

- **Per-service rate-limiter migration.** D1's strangler pattern defers all 11 existing services. Follow-up specs handle these.
- **`@Cacheable` annotations on any service method.** D5. Phase 6.x and beyond.
- **Liquibase changesets / database schema changes.** MPD-7. Redis is schemaless.
- **Frontend changes of any kind.** 5.6 is backend-only.
- **`.claude/rules/*` edits.** W14. The new documentation lives at `backend/docs/redis-conventions.md`.
- **Spec-tracker / master plan edits.** W26 / MODIFY list.
- **Phase 6 features.** W27. Presence, prayer receipt caching, live updates — all Phase 6 scope.
- **Resilience4j or other circuit-breaker libraries.** D8 / W9.
- **Redisson, Spring Session Data Redis, or other Redis-adjacent libraries beyond the strict need.** W6.
- **API endpoint changes.** Master plan: *"API changes: None (infrastructure only; the rate limit headers already exist from Phase 1)."*
- **User-facing copy.** Master plan: *"Copy Deck: None."*
- **Observability infrastructure changes** (no new Sentry config, no new logger, no new actuator endpoints beyond `/actuator/health/redis`). D12.
- **Existing test infrastructure changes.** No new Vitest config, no new JUnit extensions, no new Testcontainer base classes.
- **Production deployment / infrastructure-as-code.** 5.6 sets up the dev stack and the application-side wiring. The production deployment of Redis itself (Upstash account setup, Railway Redis add-on, etc.) is operational work outside the codebase.
- **Performance optimization.** 5.6 introduces caching infrastructure but doesn't measure performance gains. Subsequent specs (Phase 6.1 onwards) can profile and tune per-feature caching.
- **Cross-cutting `@Cacheable` audit across all services.** D5 / W4. Per-method caching decisions live with the per-method spec, not the infrastructure spec.

---

## 13. Brand voice quick reference

**N/A for this spec.** 5.6 has no user-facing copy. Master plan body: *"Copy Deck: None (no user-facing copy)."*

The one place where naming and tone matter:

- **Documentation tone in `backend/docs/redis-conventions.md`.** Match the existing `backend/docs/runbook-monitoring.md` voice (matter-of-fact, technical, calmly authoritative). Not marketing voice. Not preachy. Not religious-literalism in any examples (rate-limit bucket names like `prayer-submit` are fine because they describe the API surface; bucket names like `divine-mercy-throttle` are not).
- **Log message tone.** Spring's default log format is fine; structured JSON via logstash-logback-encoder. Log messages describe events factually ("Redis connection failed: <cause>") without alarmism or jargon-as-drama.
- **Exception messages.** Existing patterns. `RateLimitExceededException`'s message format stays consistent with current usage.
- **Comment block tone in new Java classes.** Match the existing comment style on `SentryConfig.java` (referenced in pom.xml) and similar config classes — explain WHY (per-class purpose, key design decisions, cross-references to spec) not WHAT (which the code itself documents).

---

## 14. Tier rationale

### Why High (extended)

5.6 has three rare properties that put it above Standard but not at xHigh:

1. **New infrastructure dependency with operational implications.** Redis becomes a deployment target. The degraded-health model (D4) decides how a Redis outage affects user experience. Getting this wrong corrupts production resilience. High.

2. **Load-bearing contract test.** Master plan's own out-of-band notes name this: *"The contract test for rate limiters is the most important artifact here."* The contract test validates that InMemoryRateLimiter and RedisRateLimiter produce identical observable behavior. Weakness here means silent regressions when consumers switch from one to the other. High.

3. **Migration scope explosion risk.** The strangler pattern decision (D1) keeps 5.6 at M-size by deferring 10+ service refactors. Without that decision, 5.6 balloons into an L+ spec with diffuse risk across many files. Recognizing and disciplining the scope is the central design judgment. High.

### Override moments triggering MAX (re-stated for visibility)

1. **bucket4j-Redis extension incompatibility** with bucket4j 8.18.0 + Lettuce + Spring Boot 3.5.11. Advisor decides between upgrading bucket4j (out of scope), implementing token-bucket directly via Lua scripts (significant new work), or switching to sliding-window (changes header semantics; requires Eric review).

2. **Spring Data Redis version conflicts** with the existing Spring Boot 3.5.11 BOM. Advisor decides between Spring Boot upgrade (out of scope) and Redis client version pin.

3. **Contract test fails to pass** against both impls. Investigate whether the divergence is a real bug or a fundamental incompatibility between the backends.

4. **Circuit breaker recovery test is unstably flaky.** Decide whether to ship without the recovery assertion (manual verification only) or invest more in test stability.

5. **Existing rate-limit services use bucket4j in ways the new interface can't accommodate** — specifically, per-call-site `BucketConfiguration` injection that the new interface design (D9) didn't anticipate. Revise the interface or change the strategy.

6. **Eric prefers hard-fail over degraded** for prod (D4). Override the brief at review time; spec proceeds with hard-fail semantics.

7. **Plan-time CC discovers a 12th rate-limit service** the brief didn't enumerate in R3. Add to the NOT-TO-MODIFY list; verify the strangler pattern still applies (no migration in 5.6).

---

## 15. Recommended planner instruction

The exact prompt for `/spec-forums spec-5-6` that Eric pastes into Claude Code:

```
/spec-forums spec-5-6

Brief: _plans/forums/spec-5-6-brief.md

Before writing the spec, complete plan-time recon for the items marked
PLAN-RECON-REQUIRED in brief Section 5:

  - R11: Read backend/src/main/java/com/worshiproom/proxy/common/IpResolver.java
    to understand the existing bucket-key computation pattern
  - R12: Read backend/src/main/java/com/worshiproom/proxy/common/RateLimitExceededException.java
    and grep for its usage to understand refusal semantics
  - R13: Verify the bucket4j-Redis extension artifact on Maven Central:
    confirm bucket4j_jdk17-lettuce (or equivalent) version 8.18.0 exists
    and is compatible with Spring Boot 3.5.11 + Lettuce
  - R14: Read SentryConfig.java and one existing Sentry-emitting service
    (e.g., a controller that uses Spring's @ExceptionHandler) to identify
    the test pattern for Sentry assertions
  - R15: Read backend/src/main/resources/logback-spring.xml to confirm
    structured-log conventions
  - One existing PostgreSQL Testcontainer integration test class as the
    template for RedisIntegrationTest.java (likely under
    backend/src/test/java/com/worshiproom/.../*IntegrationTest.java)
  - backend/src/main/resources/application.properties and application-prod.properties
    end-to-end to understand profile activation and existing config patterns
  - .claude/rules/06-testing.md to confirm the "never mock real infrastructure"
    rule and refine W11's phrasing
  - .claude/rules/07-spring-boot.md or similar (if exists) for Spring Boot
    project-specific conventions

Also verify the brief's R3 list (11 existing rate-limit service files) is
complete by greping for `bucket4j` in backend/src/main/java/. If additional
service files surface, add to the NOT-TO-MODIFY list per W3/D1.

If any VERIFIED finding in the brief turns out to be wrong on disk at plan
time, record an R-OVR entry in the spec's recon section. The brief's design
intent (D1-D12, W1-W28) is preserved verbatim; only the ground truth is
corrected.

Spec output path: _specs/forums/spec-5-6.md
Spec length expectation: 1100-1500 lines

Conventions:
- Stay on forums-wave-continued (long-lived branch; never switch)
- No git mutations from Claude Code at any phase
- Maven not Gradle, npm not pnpm (5.6 is backend-only so npm doesn't come up)
- Single quotes throughout shell (Java uses double quotes per Java convention)
- Tests in src/test/java/ colocated package mirrors of src/main/java/
- No new dependencies beyond spring-boot-starter-data-redis and bucket4j_jdk17-lettuce
- Spec-tracker update is Eric's manual responsibility post-merge

Prerequisites confirmation (block on these before writing the spec):
- 5.5 (Deprecated Pattern Purge) status confirmed (⬜ at brief authorship);
  spec can be written in parallel but execute-time blocks until 5.5 ships
- Spring Boot 3.5.11 verified at backend/pom.xml line 11
- bucket4j 8.18.0 + Caffeine 3.1.8 verified at backend/pom.xml lines 69-131
- Existing 11 rate-limit service files verified by grep on backend/src/main
- Zero @Cacheable annotations verified by grep on backend/src/main
- 3 application properties files exist (application, -dev, -prod); -test is NEW
- docker-compose.yml exists at repo root with postgres service

Tier: High. Override moments per brief Section 2 / Section 14.

The strangler pattern (D1) is the central design call: no existing
rate-limit service file is modified. The contract test (Test 3) is the
load-bearing artifact. The degraded health model (D4) is the production
resilience call.
```

---

## 16. Verification handoff

After `/spec-forums spec-5-6` produces the spec, the pipeline continues:

1. **`/plan-forums _specs/forums/spec-5-6.md`** — Claude Code produces the detailed plan. Plan output path: `_plans/forums/spec-5-6.md`. Plan includes:
   - The R11, R12, R13, R14, R15 recon findings (filled in from plan-time reading)
   - The exact `bucket4j-lettuce` artifact ID and version (R13 resolution)
   - The exact `application-test.properties` content (MPD-6 resolution)
   - The exact `RateLimiter` interface signature (D9 resolution; brief's default likely accepted)
   - The exact circuit breaker wrapper implementation sketch (D8)
   - The exact `redis-conventions.md` outline (D11)
   - The exact health-aggregator mechanism for DEGRADED-not-DOWN reporting (W10)

2. **Eric reviews the plan.** Particular attention to:
   - The strangler pattern is preserved (Gate 28): no existing rate-limit service file in the modify list
   - The contract test design has 8-10 parametrized scenarios plus the Redis-specific cross-instance scenario
   - The circuit breaker recovery test has reasonable flakiness mitigation (retry/wait semantics)
   - The DEGRADED-not-DOWN aggregator approach is sound
   - No new dependencies beyond the two named ones
   - The R13 artifact verification succeeded
   - The follow-up issue is enumerated with priority

3. **5.5 must be ✅ in spec-tracker.md before `/execute-plan-forums`.** Eric confirms before unblocking.

4. **`/execute-plan-forums _plans/forums/spec-5-6.md`** — Claude Code executes the plan. Branch: `forums-wave-continued`. No commits. Per-step verification via `mvn test` (running only the new test classes initially, then full suite after all source changes).

5. **`/code-review`** — Claude Code reviews the diff per standard skill protocol. Acceptance criteria from Section 11 are the review checklist. Zero Blockers, zero Majors required to advance.

6. **Integration verification per Section 3:**
   - All Testcontainer integration scenarios pass
   - Manual dev-stack smoke completed by Eric
   - Staging smoke if staging env exists

7. **Eric commits.** Suggested commit message structure:

   ```
   spec5.6: redis cache foundation + rate limiter strangler infrastructure

   - backend/pom.xml: add spring-boot-starter-data-redis + bucket4j_jdk17-lettuce
   - new cache infrastructure: RedisConfig, CacheConfig (w/ circuit breaker),
     RedisHealthIndicator (DEGRADED-not-DOWN aggregator)
   - new ratelimit infrastructure: RateLimiter interface, RateLimitResult record,
     InMemoryRateLimiter (bucket4j+Caffeine), RedisRateLimiter (bucket4j-lettuce),
     RateLimiterConfig (profile-aware bean selection w/ degraded fallback)
   - application-test.properties: NEW
   - application.properties / -dev / -prod: cache type + ratelimit backend selectors
   - docker-compose.yml: add redis:7-alpine with AOF persistence
   - .env.example: REDIS_URL + triplet env vars documented
   - tests: RedisIntegrationTest, CacheConfigIntegrationTest,
     RateLimiterContractTest (load-bearing; 8-10 parametrized scenarios),
     RedisRateLimiterIntegrationTest, RepoWideTtlEnforcementTest (~24-32 tests)
   - backend/docs/redis-conventions.md: key namespaces, TTL policy, upgrade criteria

   No existing rate-limit service is modified (strangler pattern per brief D1).
   No @Cacheable annotations added (per brief D5 — subsequent specs add them).
   No Liquibase changesets (Redis is schemaless).
   No frontend changes.

   Follow-up: Spec 5.7 (or similar) migrates per-service rate limiters to the
   new RateLimiter interface, prioritized by cross-instance need
   (LoginRateLimitFilter first).

   Spec: _specs/forums/spec-5-6.md
   Plan: _plans/forums/spec-5-6.md
   Brief: _plans/forums/spec-5-6-brief.md
   ```

8. **Eric pushes.** `git push origin forums-wave-continued`.

9. **Eric flips spec-tracker.** `_forums_master_plan/spec-tracker.md` Spec 5.6 status ⬜ → ✅ after merge + dev-stack smoke confirmed.

10. **Eric files the follow-up issue** for Spec 5.7 (per-service rate-limiter migration) with priority ranking per D1.

### Override moments — escalation paths during verification handoff

- **Spec produces a recon finding that contradicts a D-decision.** Spec records the contradiction in an R-OVR section; advisor reviews; brief is not edited (specs are historical); the spec's R-OVR governs execution.

- **Plan finds an existing rate-limit service not in the brief's R3 list.** Plan adds the file to the NOT-TO-MODIFY list per W3/D1. No advisor needed unless the new file uses a fundamentally different pattern (e.g., a service that already uses a non-bucket4j algorithm).

- **Execute finds the bucket4j-lettuce extension has a transitive dependency conflict with existing Lettuce or Spring Data Redis.** Execute halts; advisor decides between adding a Maven exclusion, pinning a different version, or switching to the bucket4j-spring-data-redis extension instead.

- **Contract test reveals InMemoryRateLimiter and RedisRateLimiter have measurably different behavior under burst conditions.** Investigate root cause. If a real bug, fix. If a fundamental incompatibility (e.g., Caffeine eviction vs Redis TTL produces different effective bucket lifetimes), advisor decides whether the divergence is acceptable (document in `redis-conventions.md`) or requires algorithm tweaks.

- **Circuit breaker tests are persistently flaky.** Reduce flakiness via reasonable retry/wait semantics. If unresolvable in reasonable time, ship without automated recovery assertion (keep the engagement assertion; manual verification covers recovery). Document in the plan.

- **Manual dev-stack smoke fails on Eric's machine.** Most likely a Docker / port-conflict / env-var issue. Plan recon provides troubleshooting steps in `redis-conventions.md`. If smoke is fundamentally broken, advisor diagnoses.

- **Staging smoke fails.** Most likely an Upstash / Railway / DNS / network issue. Operational debugging; not a spec issue. Eric resolves the deployment; spec ratifies post-resolution.

---

## Prerequisites confirmed (as of 2026-05-11 brief authorship)

- ✅ Branch: forums-wave-continued (long-lived; in active use)
- ✅ Phase 5 progress: 5.0 closed; 5.1, 5.2, 5.3 ✅; 5.4 spec written, plan pending; 5.5 brief authored 2026-05-11
- ⬜ 5.5 must ship before 5.6 execution (W2); spec can be written in parallel
- ✅ Spring Boot 3.5.11 verified at `backend/pom.xml` line 11 (R1)
- ✅ bucket4j_jdk17-core 8.18.0 + Caffeine 3.1.8 verified at `backend/pom.xml` lines 69-131 (R2)
- ✅ 11 existing rate-limit service files verified by grep (R3)
- ✅ Zero `@Cacheable` annotations verified by grep on backend/src/main (R4)
- ✅ Testcontainers (core, postgresql, junit-jupiter, minio) verified at `backend/pom.xml` lines 192-213 (R5)
- ✅ Spring Boot starter actuator + Sentry already integrated (R6)
- ✅ 3 application properties files exist; -test is NEW (R7)
- ✅ `docker-compose.yml` exists at repo root with postgres service (R8)
- ✅ `backend/.env.example` exists (R9)
- ✅ `backend/Dockerfile` exists; not modified in 5.6 (R10)
- ⬜ R11-R15 are PLAN-RECON-REQUIRED; not blocking brief authorship
- ✅ Conventions confirmed: Maven, Java 17, Spring Boot 3.5.x, JUnit 5, AssertJ, Testcontainers; no new test or core libraries
- ✅ Brief output path: `_plans/forums/spec-5-6-brief.md`
- ✅ Spec output path: `_specs/forums/spec-5-6.md`
- ✅ Plan output path: `_plans/forums/spec-5-6.md`
- ✅ Tier: High; override-to-MAX moments enumerated in Section 2 / 14

---

**End of brief.**
