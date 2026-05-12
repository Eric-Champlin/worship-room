# Forums Wave: Spec 5.6 — Redis Cache Foundation

**Master Plan Reference:** `_forums_master_plan/round3-master-plan.md` → Spec 5.6 (lines ~4735–4860). Master plan body is unusually concrete (190 lines, 4 substacks, 11 files to create, 7+ files to modify, 14 ACs).
**Source Brief:** `_plans/forums/spec-5-6-brief.md` (authored 2026-05-11 — **brief is binding for design intent; brief wins over master plan body where they diverge** per MPD-1 through MPD-7; this spec's Recon Reality Overrides win over brief where brief's recon is wrong on disk; rules-file standards in `.claude/rules/02-security.md`, `03-backend-standards.md`, `06-testing.md`, `07-logging-monitoring.md`, `08-deployment.md` win over both brief and spec on cross-cutting conventions).
**Branch:** `forums-wave-continued` (long-lived working branch — Eric handles all git operations manually; CC must NOT run any git mutations at any phase: no `git checkout`, no `git commit`, no `git push`, no `git stash`, no `git reset`, no `gh pr create`. Only read-only inspection — `git status`, `git diff`, `git log`, `git show` — is permitted).
**Date:** 2026-05-11.

---

## Affected Frontend Routes

**N/A — backend-only spec.** 5.6 is pure-backend infrastructure work (Spring Boot, Redis, Testcontainers, Maven). Zero frontend changes. Zero Liquibase schema changes. The diff lives entirely under `backend/`, `docker-compose.yml`, and `.env.example`. `/verify-with-playwright` is **NOT** required for this spec (per brief Section 3). The verification surface is Testcontainer-driven integration tests + manual dev-stack smoke + (if staging exists) production-like staging smoke.

---

## Metadata

- **ID:** `round3-phase05-spec06-redis-cache-foundation`
- **Phase:** 5 (Prayer Wall Visual Migration — 5.6 is the only backend-infrastructure spec in an otherwise visual phase; lands at Phase 5's end specifically so Phase 6 features don't have to invent Redis wiring as a side quest)
- **Size:** M (per master plan; brief ratifies — the strangler pattern in D1 is the central design judgment that keeps 5.6 at M-size by deferring mass migration to follow-up specs)
- **Risk:** Medium (per master plan; brief ratifies — new infrastructure dependency; production rate limiting and Phase 6 Live Presence both depend on this landing cleanly)
- **Tier:** High (per brief Section 2 / 14 — new infrastructure dependency, load-bearing contract test, migration-scope-explosion risk all keep 5.6 above Standard; no design-intent surface keeps it below xHigh)
- **Prerequisites:**
  - **5.5 (Deprecated Pattern Purge and Visual Audit) ✅** — verified in `_forums_master_plan/spec-tracker.md` row 77 on 2026-05-11 (the brief was authored when 5.5 was ⬜ pending; 5.5 has since shipped via Spec 14 partial fold-in + dedicated work, so 5.6 execution is unblocked).
  - **Spring Boot 3.5.11** — verified at `backend/pom.xml` line 11 (R1).
  - **bucket4j 8.18.0 + Caffeine 3.1.8** — verified at `backend/pom.xml` lines 69-131 (R2).
  - **11 existing rate-limit service files** — verified by grep on `backend/src/main/java/com/worshiproom/` (R3, see below).
  - **Zero `@Cacheable` annotations** — verified by grep on `backend/src/main/` (R4).
  - **Testcontainers (core, postgresql, junit-jupiter, minio)** — verified at `backend/pom.xml` lines 192-213 (R5).
  - **Spring Boot starter actuator + Sentry already integrated** — verified at `backend/pom.xml` (R6).
  - **3 application properties files exist** (`application.properties`, `application-dev.properties`, `application-prod.properties`); `application-test.properties` is **NEW** in 5.6 (R7 / MPD-6).
  - **`docker-compose.yml` exists at repo root** with `postgres:16-alpine` service (R8).
  - **`backend/.env.example` exists** (R9).

---

## Recon Reality Overrides (2026-05-11)

**This section is the gate where brief recon meets disk reality.** Pattern follows Spec 3.7 § Recon R1/R2/R3 and Spec 5.5 § Recon Reality Overrides. The codebase wins on facts; the brief's design intent (D1-D12, W1-W28) is preserved verbatim except where an R-OVR explicitly supersedes a VERIFIED claim.

### R-OVR-R1 through R-OVR-R10 — VERIFIED claims ratified

All ten VERIFIED items in brief Section 5 (R1 through R10) were re-verified on disk at spec authorship time:

- **R1 Spring Boot 3.5.11** — confirmed at `backend/pom.xml` line 11 (`<version>3.5.11</version>`).
- **R2 bucket4j 8.18.0 + Caffeine 3.1.8** — confirmed at `backend/pom.xml` (`bucket4j_jdk17-core` 8.18.0 + `caffeine` 3.1.8).
- **R3 11 existing rate-limit service files** — confirmed by `grep -rln "bucket4j" backend/src/main/java/com/worshiproom/`; exact 11-file match with brief's list (no 12th file surfaced). See Section "Files NOT to modify" below for the canonical inventory.
- **R4 Zero `@Cacheable` annotations** — confirmed by `grep -rln "@Cacheable" backend/src/main/`; zero matches.
- **R5 Testcontainers in use** — confirmed at `backend/pom.xml`.
- **R6 Spring Boot starter actuator + Sentry already wired** — confirmed.
- **R7 3 application properties files; no `-test`** — confirmed (`ls backend/src/main/resources/application*.properties` returns 3 files).
- **R8 `docker-compose.yml` exists with postgres service** — confirmed at repo root.
- **R9 `backend/.env.example` exists** — confirmed.
- **R10 `backend/Dockerfile` exists; not modified** — confirmed.

**No R-OVR overrides issued at spec authorship.** Plan-time recon (R11-R15 below) may surface additional findings; if any do, the plan records them as R-OVR entries and execution honors them.

### R-OVR-RULES1 — `application-test.properties` interaction with test base classes

`.claude/rules/05-database.md` § "Test-profile context override (no `application-test.properties`)" notes that there is currently NO `application-test.properties`; `AbstractIntegrationTest` and `AbstractDataJpaTest` register `spring.liquibase.contexts=test` via `@DynamicPropertySource` instead. The rule explicitly anticipates 5.6: *"If a future spec creates `application-test.properties`, the `@DynamicPropertySource` override in the base classes can be removed; until that happens, the base-class override is the canonical mechanism."*

**5.6 creates `application-test.properties`** (per brief MPD-6 / W17). However, **5.6 does NOT remove the existing `@DynamicPropertySource` Liquibase-contexts override from the base classes** unless plan recon explicitly establishes that the new properties file fully covers what the override does. Default disposition: leave the override in place; the new properties file provides Redis-Testcontainer-friendly defaults only. Moving the Liquibase-contexts override into the new file is a candidate for a future cleanup spec, not 5.6 scope.

### R-OVR-RULES2 — Master plan body "Existing rate limiter (from Universal Rule 15) migrates to Redis-backed" vs strangler pattern

Master plan substack 4 reads: *"Existing in-memory rate limiter (from Universal Rule 15) migrates to Redis-backed implementation using `INCR` + `EXPIRE` per bucket."* And master plan files-to-modify reads: *"Existing rate limiter consumer classes refactored to inject `RateLimiter` interface instead of concrete impl."*

**Brief MPD-1 (D1) overrides this:** 5.6 ships the new infrastructure (`RateLimiter` interface, `InMemoryRateLimiter`, `RedisRateLimiter`, `RateLimiterConfig`) and the contract test, but **does not migrate any of the 11 existing per-service rate-limit classes.** Per-service migration is deferred to follow-up specs (5.7 starts with `LoginRateLimitFilter`, then high-traffic services, then low-traffic). The mass-refactor implied by the master plan body would balloon 5.6 past M-size with diffuse risk across 11+ files.

Also: master plan substack 4 mentions *"`INCR` + `EXPIRE` per bucket"*. Brief D2 overrides this: 5.6 uses **bucket4j's Lettuce-Redis extension** (likely `bucket4j_jdk17-lettuce` 8.18.0 — confirmed at plan recon R13) on both sides; token-bucket algorithm preserved across In-Memory and Redis impls so the contract test can validate behavioral parity. `INCR`+`EXPIRE` would have been a from-scratch implementation that diverges from the existing per-service bucket4j algorithm and breaks contract-test parity.

This is the central design call. See Section "Design Decisions" → D1 / D2 below.

### R-OVR-RULES3 — Master plan files-to-modify entry `.env.example` vs `backend/.env.example`

Master plan files-to-modify reads: *`.env.example` — document REDIS_URL, REDIS_HOST/PORT/PASSWORD*. The canonical file is `backend/.env.example` (verified per R9). Whether a root-level `.env.example` also exists for docker-compose orchestration is plan-recon-required (PLAN-RECON-REQUIRED-R-ENV-1 below). If a root-level `.env.example` exists, mirror the Redis env vars there too; if not, document only `backend/.env.example`.

### R-OVR-RULES4 — Master plan recon note #3 default "NO" vs brief D4 "degraded with fallback"

Master plan recon note #3 reads: *"Decide if Redis should be optional in prod (fallback entirely to in-memory with a health-degraded signal) for resilience. Default: NO — Redis is a hard dependency once rate limiter migrates."*

**Brief MPD-4 (D4) overrides this default:** Redis is **optional in prod with degraded health reporting**. Reasoning per brief Section 4 MPD-4: (1) circuit breaker on cache reads is already the per-operation degradation pattern; backend-level degradation at boot is the same pattern; (2) Worship Room is a small hobby project where total outages are worse than degraded performance; (3) Sentry alerts on Redis-down for manual restoration; (4) the contract test design (D1 parity) means an in-memory fallback during prod degradation produces NO user-visible rate-limit semantics change (within a single instance; cross-instance state is the only thing lost, which is what we have today). Eric can override D4 at brief review if hard-fail is preferred — only the `RateLimiterConfig` startup behavior shifts; the contract test and infrastructure remain unchanged.

This is consistent with the brief's note that the master plan's "Default: NO" rationale was *"its absence means either no rate limiting (dangerous) or rejecting all writes (bad UX)."* Brief D4 addresses option (a): the degraded fallback IS rate limiting — single-instance, in-memory. Not absent. The strangler pattern means existing rate limiting is also single-instance today, so "Redis-degraded" doesn't regress current behavior; it just doesn't reach the "future-instance" state that Phase 6+ wants.

---

## Goal

Stand up Redis as a shared cache and ephemeral data store before any feature consumer needs it. Spec 6.11b (Live Presence) requires Redis sorted sets for 60-minute presence windows. Production rate limiting (Universal Rule 15) currently falls back to in-memory per-instance counters — fine for single-instance dev but fundamentally broken the moment a deployment runs two backend replicas. This spec closes that gap and establishes the Redis patterns future specs can reuse.

Lands at Phase 5's end specifically so Phase 6 features don't have to invent Redis wiring as a side quest.

---

## Why this spec exists

Three rationales, taken from the master plan:

1. **Spec 6.11b's complexity spikes if Redis itself is unfamiliar.** Introducing Redis concurrently with presence-tracking logic would mean debugging "is it my sorted-set query or my Redis config?" simultaneously. Separating the foundation (this spec) from the consumer (6.11b) keeps each problem small.

2. **Rate limiting works in-memory through Phase 5.** Single-instance dev + low-traffic early prod = no production fire. Running a Redis container for 3-4 months unused burns hosting credits without return. Phase 5 end is the just-in-time landing point.

3. **Strangler pattern preserves M-size.** Per D1 (below): the 11 existing per-service rate-limit classes keep their bucket4j+Caffeine setups untouched in 5.6. Follow-up specs migrate per-service rate limiters prioritized by cross-instance need (LoginRateLimitFilter first, then high-traffic services, then low-traffic).

---

## Approach

Add Redis 7 to the deployment stack (docker-compose for dev, platform-native for prod via Railway/Render/Upstash), wire Spring Data Redis, configure Spring's `@Cacheable` abstraction (but **do not annotate any methods in 5.6** — see D5), introduce a `RateLimiter` interface with in-memory and Redis-backed implementations, and establish the sorted-set + key-namespacing conventions that Phase 6 will consume.

**Four substacks (from master plan):**

### Substack 1 — Redis service wiring

- `docker-compose.yml` gains a `redis:7-alpine` service with a named volume for AOF persistence (`appendonly yes`), port `6379:6379`, healthcheck via `redis-cli ping` (matching the existing postgres service pattern — see R8).
- Production: deployment target deferred (master plan Spec 1.10b dimension). Options: Railway Redis (matches backend choice if Railway), Upstash (serverless, free tier 10K commands/day), Redis Cloud free tier (30 MB). Upstash is the recommended default for Worship Room scale — pay-per-command means months of unused Redis cost $0. Per brief D6 / MPD-5, the infrastructure code is provider-agnostic; the choice is a deployment configuration call, not a code call.
- Env vars: `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` (empty in dev, set in prod). Connection URL format `redis://[:password@]host:port/db` supported as `REDIS_URL` alternative (Upstash emits this format directly). Per D6: `REDIS_URL` wins if set; triplet is fallback.
- Spring Data Redis dependency via `org.springframework.boot:spring-boot-starter-data-redis`.
- Lettuce as the default client (reactive-capable; thread-safe; Spring Boot's default).

### Substack 2 — Key namespacing and conventions

- All keys prefixed by domain: `cache:*` for Spring `@Cacheable`-managed entries, `rate:*` for rate limiter buckets, `presence:*` reserved for Phase 6 Live Presence (sorted-set keys), `lock:*` reserved for future distributed locks (currently out of scope per master plan).
- TTLs are MANDATORY on every key. No un-TTL'd keys. A key without an expiry is a memory leak waiting to happen; per Gate 25 the linter-equivalent is a repo-wide grep test enforcing this.
- Sorted sets (`ZADD`) are the pattern for time-windowed presence (Phase 6.11b), documented with working examples in the conventions doc. **NOT** the pattern for rate limiting in 5.6 — see D2 / W7.
- Binary-safe string values only; if a consumer wants to store structured data, it serializes to JSON first (no Java `Serializable`-based binary blobs — a deployment that upgrades a Java class breaks existing cached data).

### Substack 3 — Spring `@Cacheable` configuration

- `CacheConfig.java` registers Redis as the `CacheManager` in `prod` profile; a `ConcurrentMapCacheManager` in `dev` profile (so local iteration doesn't require Redis running).
- Per-cache TTLs configured in `application.properties` under `spring.cache.redis.time-to-live.<cacheName>=<duration>` — one central place to tune cache lifetimes without code changes.
- Targeted caching only **(but deferred to consumers per D5)**. Master plan calls out:
  - **DO cache:** QOTD question-of-the-day lookup (TTL = end of day), category list, trust level thresholds (TTL = 1 hour), liturgical season computation (TTL = 1 hour), global leaderboard snapshots (TTL = 5 minutes).
  - **Do NOT cache:** user-specific read-your-writes paths (newly posted prayers wouldn't appear immediately), anonymous-post author lookups (correctness-critical), crisis flag status (must always be live).
- Per D5 / MPD-3: **5.6 does NOT add any `@Cacheable` annotations.** Zero exist today (R4). The master plan AC *"All configured `@Cacheable` methods have explicit TTL"* is satisfied vacuously today (zero methods to verify). The AC is preserved as a regression net for Phase 6.1+ — the verifying test loops over all `@Cacheable` annotations and asserts each has a corresponding TTL property. Today it asserts zero of zero; tomorrow it asserts N of N.

### Substack 4 — Rate limiter infrastructure (strangler pattern, NOT migration)

- New `RateLimiter` interface (`com.worshiproom.ratelimit.RateLimiter`) defines the new contract per D9: `RateLimitResult tryConsume(String bucketKey, BucketConfiguration config)`.
- New `InMemoryRateLimiter.java` is the bucket4j + Caffeine canonical implementation (designed for parity with the existing per-service pattern, **not** literally extracted from any one of them — see MPD-1).
- New `RedisRateLimiter.java` is the bucket4j-Redis-backed implementation using `bucket4j_jdk17-lettuce` (or equivalent verified at plan recon R13). Token-bucket algorithm preserved; only bucket-state storage differs (in-memory `Caffeine<String, Bucket>` vs Redis-backed `LettuceBasedProxyManager`).
- New `RateLimiterConfig.java` selects the impl by Spring profile per D3:
  - `dev` profile → `InMemoryRateLimiter` bean
  - `prod` profile → `RedisRateLimiter` bean (with degraded fallback to `InMemoryRateLimiter` per D4)
  - `test` profile → `InMemoryRateLimiter` by default; integration tests targeting Redis use `@ActiveProfiles("prod")` or `@TestPropertySource` to override
- **No existing rate-limit service migrates in 5.6.** All 11 services keep their bucket4j+Caffeine setups unchanged (per D1 / W3 / Gate 28).
- Bucket key pattern per D11: `rate:{endpoint-category}:{authed|anon}:{user-id-or-ip-hash}:{window-start-epoch}`. Plan recon picks the exact `endpoint-category` enum.
- `X-RateLimit-Remaining` / `X-RateLimit-Reset` headers reflect Redis-backed count in prod profile **for any new consumer that adopts the interface**. Existing per-service consumers retain their current header behavior (single-instance) until per-service migration ships.

### Observability integration (builds on Spec 1.10d)

Per D12 — no new observability infrastructure:

- DEBUG-level logging for every Redis operation (key, op, duration_ms) via the existing logstash-logback-encoder pipeline.
- WARN-level logging for slow ops (>100ms) via the same pipeline.
- ERROR-level logging for Redis failures + Sentry event emission via the existing Sentry integration (`SentryConfig.java`, see R6).
- Circuit breaker on the cache read path: if Redis is unreachable for 3 consecutive ops, bypass cache and hit the database directly (with a `WARN` log). The app MUST NOT fail user requests because the cache is down. Implementation per D8 — a thin custom wrapper, NOT Resilience4j.
- `RedisHealthIndicator` integrates with the existing actuator setup by extending `org.springframework.boot.actuate.health.AbstractHealthIndicator`. `/actuator/health/redis` endpoint is automatic given the bean name `redisHealthIndicator`.

---

## Master Plan Divergences

The master plan body for Spec 5.6 is unusually concrete. Most of the brief ratifies the master plan rather than expanding it. The seven divergences below are the points where brief recon found disk reality that requires the master plan's framing to bend. **MPDs are authoritative over master plan body where they disagree.**

### MPD-1 — "Extracted from the existing implementation" → strangler pattern over mass refactor

**Master plan body for `InMemoryRateLimiter.java`:** *"extracted from the existing in-memory implementation."*

**Master plan files-to-modify:** *"Existing rate limiter consumer classes refactored to inject `RateLimiter` interface instead of constructing bucket4j directly."*

**Recon finding (R3, VERIFIED):** there is no single "existing in-memory implementation." There are 11 per-domain rate-limit service classes, each independently constructing its own bucket4j `Bucket` instance with a Caffeine `Cache<String, Bucket>` for per-key bucket retention. Mass-refactoring all 11 services exceeds the M-size envelope.

**Design call (D1): strangler pattern.** 5.6 ships the new infrastructure but does NOT mass-refactor existing services. See "Design Decisions → D1" below. Follow-up issue filed: "Spec 5.7 (or similar): Migrate per-service rate limiters to `RateLimiter` interface, prioritized by cross-instance need (LoginRateLimitFilter first)."

### MPD-2 — Sorted sets apply to presence, not rate limiting in 5.6

**Master plan body, substack 2:** *"Sorted sets (`ZADD`) are the pattern for time-windowed presence and rate limiting."*

**Brief clarification:** sorted sets are the pattern for **presence** (Phase 6 Live Presence, which uses time-windowed user-active-at-X tracking via ZADD with score=timestamp + ZRANGEBYSCORE for window queries). They are NOT the pattern for rate limiting in 5.6.

Rate limiting in 5.6 uses **token bucket** semantics (the existing bucket4j algorithm), backed by Lettuce via bucket4j's Redis extension. Reasons:

1. `X-RateLimit-Remaining` and `X-RateLimit-Reset` headers already encode token-bucket semantics. Switching to sliding-window changes the meaning in user-visible ways.
2. Behavioral parity between `InMemoryRateLimiter` and `RedisRateLimiter` is trivial when both use token bucket. Switching to sliding window for Redis-only would introduce a contract-test gap.
3. The existing per-service rate-limit code is bucket4j-based. The strangler pattern works only if the new interface accommodates the existing algorithm.
4. bucket4j has a mature Redis extension (`bucket4j-redis` family, plus the Spring Data Redis variant) that supports Lettuce. RedisRateLimiter is mostly configuration, not a from-scratch Lua-script implementation.

**Plan recon must verify** the exact bucket4j-Redis artifact name and version (R13). If incompatible with bucket4j 8.18.0 + Spring Boot 3.5.11 + Lettuce, MAX override moment applies (Section "Override Moments" below).

### MPD-3 — `@Cacheable` targets discovered at consumer time — 5.6 builds the road, not the cars

**Master plan body, recon note #4:** *"Identify the specific `@Cacheable` targets. Audit PostService / QOTDService / LiturgicalService / etc."*

**Recon finding (R4, VERIFIED):** Zero `@Cacheable` annotations exist today.

**Design call (D5):** 5.6 does NOT add any `@Cacheable` annotations. 5.6 sets up the `CacheManager` infrastructure (Redis-backed in prod, ConcurrentMap-backed in dev), defines the cache name convention (`cache:<name>`), and establishes the per-cache TTL configuration mechanism in `application.properties`. Subsequent specs add `@Cacheable` to specific methods.

The master plan AC *"All configured `@Cacheable` methods have explicit TTL"* is satisfied vacuously today (zero methods to verify). The brief preserves this AC as a regression net.

**Why no `@Cacheable` in 5.6:**

- Per-method caching is a per-service design call (which methods are safe to cache? what TTL? what eviction triggers?). Folding those decisions into an infrastructure spec dilutes both.
- Phase 6.1 Prayer Receipt explicitly states (master plan line 4926): *"Response cached in Redis for 30 seconds (per Spec 5.6) — no point re-querying on every refresh."* Phase 6.1 is the first natural consumer; let it own the `@Cacheable` decision for `GET /api/v1/posts/{id}/prayer-receipt`.
- The 5.6 contract is the infrastructure: "Redis is wired, CacheManager is profile-aware, TTLs are enforced when present." Consumers add caching one method at a time, each with explicit justification.

### MPD-4 — Production optionality — degraded over hard-fail

**Master plan body, recon note #3:** *"Decide if Redis should be optional in prod (fallback entirely to in-memory with a health-degraded state). Default: NO."*

**Design call (D4): optional in prod, with degraded health reporting** (overrides the master plan default). Reasoning:

1. The master plan already specifies a circuit breaker on cache reads (3 consecutive failures → bypass for 30s). That's the per-operation degradation. Backend-level degradation is the same pattern at startup: if Redis is structurally unreachable at boot, the backend boots with the in-memory rate limiter selected (`InMemoryRateLimiter`), the cache bypassed (`NoOpCacheManager` or equivalent), and `/actuator/health` reporting overall status `DEGRADED`.
2. Worship Room is a small hobby project where total outages from a Redis hiccup are worse than degraded performance. Eric's success criterion is "breaking even on hosting" — the service staying up at reduced functionality beats the service being down.
3. Sentry alerts on Redis-down events; Eric gets paged; manual restoration happens. The degraded path buys time for human intervention.
4. The contract test design (parity between impls) means an in-memory fallback during prod degradation produces NO user-visible behavior change for rate limiting (within a single instance — cross-instance state is the only thing lost, and that's already what we have today). Caching is bypassed, which adds latency but doesn't break functionality.

**Plan recon decides the implementation mechanism.** Options:

- Spring Boot's `@ConditionalOnBean` + custom `RedisAvailable` condition that checks connectivity at startup
- `@Profile`-based bean selection with a startup hook that validates Redis and falls back if unreachable
- A custom `CacheManager` wrapper that delegates to Redis when available and to in-memory when not

**Default recommendation:** the wrapper pattern (simplest; one bean to test). Plan recon evaluates.

**If Eric prefers hard-fail in prod:** override D4 at brief review. The contract test and infrastructure remain unchanged; only the startup behavior shifts (Redis-unreachable at boot → application context fails to start, container restarts via orchestrator).

### MPD-5 — Free-tier Redis is the deployment default

**Master plan body, recon note #1:** *"Confirm Upstash Redis free tier (10K commands/day, 256 MB data) suffices for Phase 6 presence + rate limiting + caching."*

**Design call (D6): free tier with bake-in upgrade path.** Reasoning:

1. Worship Room's hobby-scale traffic is well within free-tier limits at Phase 6. Presence is sorted-set updates (~10 commands per active user per minute window), rate limiting is bucket reads (~1 command per request), caching is GET/SET (~2 commands per cache hit). 10K commands/day = ~7 commands/minute averaged — fits a small active user base.
2. The connection layer uses `REDIS_URL` (Upstash-compatible format) OR `REDIS_HOST/PORT/PASSWORD` triplet. Either works against any Redis provider — Upstash, Redis Cloud, Railway Redis, AWS ElastiCache, self-hosted, Docker. The infrastructure code is provider-agnostic.
3. TTLs are tunable per-namespace in `application.properties`. If usage approaches free-tier limits, TTLs can be lengthened (fewer Redis writes) or specific cache names can be disabled. No code change required.
4. The brief documents the upgrade decision criteria in `backend/docs/redis-conventions.md`: *"When daily command count exceeds 8K (80% of free tier), upgrade to Upstash paid tier or migrate to self-hosted Redis on the prod host."*

**This is a deployment configuration call, not a code call.** 5.6 does not encode Upstash specifically anywhere — the prod profile reads env vars and connects to whatever Redis is configured.

### MPD-6 — New `application-test.properties` file

**Master plan body files-to-modify:** *`backend/src/main/resources/application-test.properties` — Redis Testcontainer config.*

**Recon finding (R7, VERIFIED):** No `application-test.properties` file currently exists. Master plan implies creating it.

**Design call:** create `application-test.properties` as a NEW file. Plan recon checks whether existing integration tests use a test profile or rely on dev profile + `@TestPropertySource` overrides. Per `.claude/rules/05-database.md`, currently `AbstractIntegrationTest` and `AbstractDataJpaTest` pin `spring.liquibase.contexts=test` via `@DynamicPropertySource`. Per R-OVR-RULES1: leave the `@DynamicPropertySource` Liquibase-contexts override in place unless plan recon establishes the new file fully covers what the override does. Default disposition: the new properties file provides Redis-Testcontainer-friendly defaults only.

### MPD-7 — Database changes: None — Liquibase is not touched

**Master plan body:** *"Database changes: None."*

**Brief ratifies.** Redis is not a Liquibase target. No changesets are added in 5.6. The `db/changelog/` directory is untouched.

If plan-time CC instinctively reaches for Liquibase because "backend infrastructure spec," reject. Redis is schemaless; setup is configuration + connection, not migration.

---

## Plan-Recon-Required items

Five items in brief Section 5 are marked PLAN-RECON-REQUIRED. The plan phase reads these at plan time and records findings as R-OVR entries if any contradict the brief's defaults.

### R11 — Existing `proxy/common/IpResolver.java`

Referenced from `auth/LoginRateLimitFilter.java` as `import com.worshiproom.proxy.common.IpResolver;`. Provides the IP-or-userId hash used as the bucket key for anonymous rate limiting. The new `RateLimiter` interface accepts a bucket key as a `String`; plan recon decides whether the new interface forces consumers to compute the key (via `IpResolver`) before calling, or whether the interface offers an overload that accepts an HTTP request and computes the key internally.

**Default recommendation (D9):** consumers compute the key; interface is `RateLimitResult tryConsume(String bucketKey, BucketConfiguration config)`. Keeps the interface narrow and testable.

### R12 — Existing `proxy/common/RateLimitExceededException.java`

Referenced from multiple rate-limit services. The new `RateLimiter` interface's contract for refusal could throw this exception OR return a boolean OR return a result object. Plan recon reads the existing exception's usage pattern.

**Default recommendation (D9):** return a `RateLimitResult` record with `allowed: boolean`, `remaining: long`, `retryAfter: Duration`. The existing per-service consumers continue throwing `RateLimitExceededException` from their layer; the new interface stays narrow and testable.

### R13 — bucket4j-Redis extension artifact ID and version

Maven Central artifact name is unverified. Candidates:

- `com.bucket4j:bucket4j_jdk17-redis-common` (transitive infrastructure for any Redis-backed bucket)
- `com.bucket4j:bucket4j_jdk17-lettuce` (Lettuce client integration; expected match for Spring Boot default)
- `com.bucket4j:bucket4j_jdk17-redis-spring-data` (RedisTemplate-based; alternative)

Plan recon picks one. Both produce a `LettuceBasedProxyManager` (or `SpringDataRedisProxyManager`) that the `RedisRateLimiter` consumes. Version must match the existing `bucket4j_jdk17-core` 8.18.0.

**If the artifact doesn't exist at 8.18.0 for Lettuce, the MAX override moment applies** (see "Override Moments" below — option 1: upgrading bucket4j, option 2: implementing token-bucket logic directly via Lua scripts, option 3: switching algorithm to sorted-set sliding window).

### R14 — Existing Sentry test harness pattern

Referenced in `SentryConfig.java`. Plan recon reads `SentryConfig.java` and any existing Sentry-emitting code to identify the test pattern. Most likely:

- A `@MockBean` or `@SpyBean` on the Sentry hub/client
- An interceptor on `SentryOptions.setBeforeSend(...)` for test assertions
- A separate `SentryTestConfig` that swaps in a no-op or capturing Sentry client

The RedisRateLimiter / RedisHealthIndicator / CacheConfig classes use the existing pattern for Sentry emission; no new pattern introduced.

### R15 — Existing logback / structured logging configuration

Pom.xml shows `net.logstash.logback:logstash-logback-encoder:8.0`. Logback is structured JSON. Plan recon reads `backend/src/main/resources/logback-spring.xml` to confirm the structured-log format. Redis operation logs (DEBUG for duration, WARN for slow ops, ERROR for failures) emit through the existing logger; no logger config changes in 5.6.

### PLAN-RECON-REQUIRED-R-ENV-1 — Root-level `.env.example`

Per R-OVR-RULES3: plan recon checks whether a root-level `.env.example` exists (for docker-compose orchestration). If so, mirror the Redis env vars there too; if not, document only `backend/.env.example`.

---

## Design Decisions

### D1 — Strangler pattern over mass refactor (the central design call)

Per MPD-1. 5.6 ships the new infrastructure (`RateLimiter` interface, `InMemoryRateLimiter`, `RedisRateLimiter`, `RateLimiterConfig`) and the contract test that validates behavioral parity. **No existing rate-limit service is migrated.** The 11 per-domain services keep their bucket4j+Caffeine setups untouched.

The **first** new consumer (likely Phase 6.1 Prayer Receipt's `GET /api/v1/posts/{id}/prayer-receipt` endpoint, which is the first endpoint to need cache + cross-instance rate limiting per master plan line 4926) consumes the new interface.

Follow-up specs migrate existing services per cross-instance need:

- **High-priority follow-up:** Spec 5.7 (or similar) migrates `LoginRateLimitFilter` first. Login rate limiting is security-critical and must share state across instances in production.
- **Medium-priority follow-up:** Migrate high-traffic services next: `PostsRateLimitService`, `ReactionsRateLimitService`, `CommentsRateLimitService`. These benefit from cross-instance state but aren't security-blocking.
- **Low-priority follow-up:** Migrate low-traffic services (Upload, Legal, ChangePassword, Reports, Resolve, Bookmarks) when needed.

**Why strangler over big-bang:**

- Existing services work today; there's no production fire forcing immediate migration
- M-size envelope preserved
- Contract test validates the new infrastructure before mass adoption (catch divergence early)
- Per-service migration in subsequent specs lets each service's bucket configuration migrate with intent (not as a side effect of an infrastructure spec)
- Reduces blast radius: 5.6's diff is bounded to NEW files plus property/dependency edits; existing service code is untouched

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

One container per test class (per master plan testing notes). Plan recon reads an existing PostgreSQL Testcontainer test as the template — likely under `backend/src/test/java/com/worshiproom/support/AbstractIntegrationTest.java` (see `06-testing.md` § "Testcontainers Setup Pattern").

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

If plan recon discovers a strong reason to also offer an HTTP-request overload, fine — it would be `tryConsume(HttpServletRequest req, EndpointCategory category)` as a convenience wrapper around the narrow form. **Default: narrow form only.**

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

Gate 25 enforces TTL presence via a repo-wide grep test. Plan recon designs the test predicate.

### D12 — Observability follows existing patterns; no new infrastructure

- DEBUG-level logging for every Redis operation (key, op, duration_ms) via the existing logstash-logback-encoder pipeline
- WARN-level logging for slow ops (>100ms) via the same pipeline
- ERROR-level logging for Redis failures + Sentry event emission via the existing Sentry integration
- Health indicator integrates with existing actuator setup

No new logging infrastructure, no new Sentry config, no new actuator config. 5.6 consumes what's already wired.

---

## Phase 3 Execution Reality Addendum gates — applicability

The Phase 3 Execution Reality Addendum was authored for visual / chrome migration work. 5.6 is backend infrastructure; most gates don't apply. The brief defines backend-equivalent gates 23-28.

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

Gates 23-26 inherit from existing project standards (Testcontainers for real-data integration tests is per `06-testing.md` *"never use H2"* rule; the same rule applies *"never mock Redis when a Testcontainer can validate the real semantics"*).

Gate 27 codifies D4. Gate 28 codifies D1.

---

## Watch-fors (W1–W28)

These are the spec-execution invariants. Plan and execute phases MUST honor each.

### W1 — Branch discipline

Stay on `forums-wave-continued`. Never run git mutations. See Section "Branch" at top of spec.

### W2 — 5.5 must ship before 5.6 execution

**Resolved at spec authorship:** 5.5 has shipped (spec-tracker row 77 ✅). Execution unblocked.

### W3 — Strangler pattern is binding (D1 / Gate 28)

**No existing rate-limit service file is modified in 5.6.** The 11 existing `*RateLimit*.java` files keep their bucket4j+Caffeine setups unchanged. If execute-time CC instinctively reaches to migrate `LoginRateLimitFilter` because "it would benefit from cross-instance state," STOP and surface to Eric. Per-service migration is a follow-up spec, NOT a 5.6 deliverable.

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

This follows the same principle as `06-testing.md` *"never use H2 for testing"* — Testcontainers exercises real infrastructure semantics, and mocking would defeat the value.

### W12 — No frontend tokens in this spec

5.6 is backend-only. The spec MUST NOT reference frontend tokens, Tailwind classes, design system rules (09-design-system.md), or visual primitives. If execute-time CC accidentally edits a frontend file, reject.

### W13 — No edits to existing rate-limit service files (W3 codified)

Callback to W3. Repeating because this is the load-bearing scope guarantee.

### W14 — No edits to design system rules files

`.claude/rules/09-design-system.md` and other rules files are out of scope. If plan-time CC proposes documenting Redis patterns in rules files, reject — `backend/docs/redis-conventions.md` is the canonical location.

### W15 — Single config class per concern

- `RedisConfig.java` — connection factory, `RedisTemplate` beans
- `CacheConfig.java` — `CacheManager` bean + circuit breaker wrapper
- `RedisHealthIndicator.java` — actuator health indicator
- `RateLimiterConfig.java` — `RateLimiter` bean selection per profile

Keep these separate. If plan-time CC proposes merging them into a single `RedisAutoConfiguration` for "simplicity," reject — separation of concerns aids future modification and testing.

### W16 — Maven not Gradle; Java 17+

Project uses Maven. The bucket4j artifact group is `com.bucket4j` (note the `_jdk17` suffix indicating JDK 17 compatibility). All new classes target Java 17 features as appropriate (records, sealed interfaces, pattern matching).

Per `03-backend-standards.md` the project is on Java 21; the bucket4j `_jdk17` artifact is forward-compatible. Do not introduce Gradle build files. Do not target Java 11 or earlier.

### W17 — `application-test.properties` is NEW (MPD-6)

File does not exist today. 5.6 creates it. Plan recon designs the file's content based on existing test patterns. Per R-OVR-RULES1: do not remove the existing `@DynamicPropertySource` Liquibase-contexts override from `AbstractIntegrationTest` / `AbstractDataJpaTest` unless plan recon establishes the new file fully covers what the override does.

### W18 — Sentry emission uses existing pattern (R14)

Do not reinvent Sentry integration. The existing `SentryConfig.java` is the canonical entry point. Redis failures emit via the same path as existing Spring `@ExceptionHandler` integrations.

Per `07-logging-monitoring.md` § "Error Tracking — Sentry": the PII boundary is hard — only `user.id` (UUID) is attached; never email, displayName, IP, or request bodies. Redis-failure events MUST honor the same boundary (key names are OK to attach as event context; the `verseTextLength`-style numeric metadata is OK; raw user input is not).

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

Not `_forums_master_plan/`, not `.claude/rules/`, not `/docs/`. The file lives next to other backend docs (`backend/docs/runbook-monitoring.md`, `backend/docs/env-vars-runbook.md`, `backend/docs/api-error-codes.md`). Plan recon confirms the docs directory exists and lists existing docs for cross-reference patterns.

Tone per brief Section 13: match `backend/docs/runbook-monitoring.md` voice (matter-of-fact, technical, calmly authoritative). Not marketing voice. Not preachy. Not religious-literalism in any examples (rate-limit bucket names like `prayer-submit` are fine because they describe the API surface; bucket names like `divine-mercy-throttle` are not).

### W26 — Eric updates spec-tracker manually after merge

Master plan tracker at `_forums_master_plan/spec-tracker.md`. 5.6 status flips ⬜ → ✅ after:

1. PR merged to `forums-wave-continued`
2. Manual dev-stack smoke confirms backend boots against `docker-compose up -d` with Redis
3. (Optional) Staging deployment confirms `/actuator/health/redis` returns UP against a real Redis

Spec and plan must NOT modify `spec-tracker.md` as part of execution.

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

## Files to Create / Modify / NOT to Modify / Delete

### CREATE

**Backend source:**

- `backend/src/main/java/com/worshiproom/cache/RedisConfig.java` — connection factory, `RedisTemplate` beans, `LettuceConnectionFactory` configuration. Reads `REDIS_URL` first, falls back to `REDIS_HOST/PORT/PASSWORD` triplet per D6.
- `backend/src/main/java/com/worshiproom/cache/CacheConfig.java` — profile-aware `CacheManager` bean, circuit breaker wrapper (per D8), per-cache TTL configuration consumer.
- `backend/src/main/java/com/worshiproom/cache/RedisHealthIndicator.java` — actuator health indicator (extends `AbstractHealthIndicator`). Custom aggregator for DEGRADED-not-DOWN status per W10.
- `backend/src/main/java/com/worshiproom/ratelimit/RateLimiter.java` — interface (per D9).
- `backend/src/main/java/com/worshiproom/ratelimit/RateLimitResult.java` — record (per D9; plan recon decides whether nested in `RateLimiter.java` or standalone — default standalone for clarity).
- `backend/src/main/java/com/worshiproom/ratelimit/InMemoryRateLimiter.java` — bucket4j + Caffeine implementation. Designed for parity with the existing per-service pattern, not literally extracted from any one of them (per MPD-1).
- `backend/src/main/java/com/worshiproom/ratelimit/RedisRateLimiter.java` — bucket4j-lettuce implementation.
- `backend/src/main/java/com/worshiproom/ratelimit/RateLimiterConfig.java` — profile-aware bean selection (per D3 / D4).

**Backend tests:**

- `backend/src/test/java/com/worshiproom/cache/RedisIntegrationTest.java` (per Test 1 below).
- `backend/src/test/java/com/worshiproom/cache/CacheConfigIntegrationTest.java` (per Test 2 below).
- `backend/src/test/java/com/worshiproom/cache/RepoWideTtlEnforcementTest.java` (per Test 5 below).
- `backend/src/test/java/com/worshiproom/ratelimit/RateLimiterContractTest.java` (per Test 3 — LOAD-BEARING).
- `backend/src/test/java/com/worshiproom/ratelimit/RedisRateLimiterIntegrationTest.java` (per Test 4 below).

**Backend resources:**

- `backend/src/main/resources/application-test.properties` (per MPD-6 / W17).

**Backend docs:**

- `backend/docs/redis-conventions.md` (per D11).

**Note on `InMemoryRateLimiter` test:** Existing test patterns suggest each new `RateLimiter` impl gets a dedicated unit test in addition to the contract test. Plan recon decides whether `InMemoryRateLimiterUnitTest.java` is needed or whether the contract test's coverage is sufficient. **Default: contract test is the comprehensive coverage; per-impl unit tests are optional and only added if a unique behavior needs isolated testing.**

### MODIFY

**Backend Maven build:**

- `backend/pom.xml` — add `spring-boot-starter-data-redis` (BOM-resolved), add `bucket4j_jdk17-lettuce` (version `8.18.0` to match `bucket4j_jdk17-core`). Per D10 / W6 — exactly two new dependencies, no more.

**Backend resources:**

- `backend/src/main/resources/application.properties` — add Redis connection placeholders (`spring.data.redis.host=${REDIS_HOST:localhost}`, etc.), cache type, rate limiter backend selector, per-cache TTL property keys (no values today since D5 has zero `@Cacheable` annotations).
- `backend/src/main/resources/application-dev.properties` — confirm `spring.cache.type=simple` and `ratelimit.backend=memory` defaults. Plan recon may add a brief comment block explaining: dev profile defaults to in-memory; opt-in to Redis via `RATE_LIMIT_BACKEND=redis` env var for testing.
- `backend/src/main/resources/application-prod.properties` — set `spring.cache.type=redis` and `ratelimit.backend=redis`; document Redis env var precedence in inline comments. Per `07-logging-monitoring.md` § "Framework Log Suppression": ensure `logging.level.org.springframework.web=WARN` is preserved (already in place per Spec 1.10g) so Redis op debug logs don't leak request bodies. (5.6 adds its own DEBUG-level Redis op logging via the logstash-logback-encoder per D12; that's a separate logger.)

**Backend env:**

- `backend/.env.example` — add `REDIS_URL` (commented, with documentation that it overrides the triplet), `REDIS_HOST=localhost`, `REDIS_PORT=6379`, `REDIS_PASSWORD=`.

**Repo root:**

- `docker-compose.yml` — add `redis:7-alpine` service following the existing postgres service pattern (port 6379:6379, named volume for AOF persistence per W23, healthcheck `redis-cli ping`, restart policy matching postgres).
- (Conditional, per PLAN-RECON-REQUIRED-R-ENV-1) repo-root `.env.example` if it exists — mirror Redis env vars.

### NOT TO MODIFY

**Existing rate-limit services (W3 / D1 strangler pattern):**

The 11 files verified via R3 (`grep -rln "bucket4j" backend/src/main/java/com/worshiproom/`):

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

Plus their supporting types:

- `backend/src/main/java/com/worshiproom/proxy/common/IpResolver.java` (read-only at plan time per R11)
- `backend/src/main/java/com/worshiproom/proxy/common/RateLimitExceededException.java` (read-only at plan time per R12)
- All existing tests for the above (their assertions cover current single-instance behavior; that behavior is preserved by strangler)

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
- `.claude/rules/09-design-system.md`

**Historical specs:**

- `_specs/forums/spec-5-1.md`, `5-3.md`, `5-4.md`, `5-5.md` — do not edit

**Existing Sentry/logging/actuator config:**

- `backend/src/main/java/com/worshiproom/config/SentryConfig.java` (read-only at plan time)
- `backend/src/main/resources/logback-spring.xml` (read-only at plan time)

**Other backend files not in CREATE/MODIFY lists:**

- `backend/Dockerfile`, `backend/.mvn/`, `backend/mvnw` (no build changes per R10)
- `backend/README.md` (plan recon decides if a README addition is warranted; default: no, the new `redis-conventions.md` is the canonical reference)

### DELETE

None. 5.6 is purely additive.

---

## Database changes

**None.** Redis is schemaless. No Liquibase changesets are added in 5.6. The `backend/src/main/resources/db/changelog/` directory is untouched.

(Per MPD-7 / W5 / master plan body.)

---

## API changes

**None.** Master plan: *"API changes: None (infrastructure only; the rate limit headers already exist from Phase 1)."*

The `X-RateLimit-Limit / -Remaining / -Reset` and `Retry-After` headers introduced in Spec 1 (`ai-proxy-foundation`) remain unchanged. The new `RateLimiter` interface does not introduce new endpoints or new header shapes. When the first consumer adopts the interface (likely Phase 6.1), header semantics may change from per-instance to cross-instance counts — but that's a Phase 6.1 concern, not 5.6.

---

## Copy Deck

**N/A for this spec.** 5.6 has no user-facing copy. Master plan body: *"Copy Deck: None (no user-facing copy)."*

Per brief Section 13, the one place where naming and tone matter:

- **Documentation tone in `backend/docs/redis-conventions.md`.** Match the existing `backend/docs/runbook-monitoring.md` voice (matter-of-fact, technical, calmly authoritative). Not marketing voice. Not preachy. Not religious-literalism in any examples (rate-limit bucket names like `prayer-submit` are fine because they describe the API surface; bucket names like `divine-mercy-throttle` are not).
- **Log message tone.** Spring's default log format is fine; structured JSON via logstash-logback-encoder. Log messages describe events factually ("Redis connection failed: <cause>") without alarmism or jargon-as-drama. Per `07-logging-monitoring.md`: never log user content (verse text, journal entries, prayer content) — Redis keys and operation names are fine; values that contain user-submitted content are not.
- **Exception messages.** Existing patterns. `RateLimitExceededException`'s message format stays consistent with current usage (W13: existing services aren't modified, so their exception messages don't change).
- **Comment block tone in new Java classes.** Match the existing comment style on `SentryConfig.java` and similar config classes — explain WHY (per-class purpose, key design decisions, cross-references to spec) not WHAT (which the code itself documents).

---

## Anti-Pressure Copy Checklist

**N/A.** No user-facing copy in 5.6.

---

## Anti-Pressure Design Decisions

**N/A.** No user-facing behavior change in 5.6.

---

## Test specifications

Master plan AC: *"At least 18 tests across cache config, rate limiter contract, Redis health, and circuit breaker."*

The brief refines to specific test classes and approximate test counts. Plan recon finalizes per actual implementation. All tests follow the *"never mock real infrastructure"* rule per `06-testing.md` and W11 — Testcontainers for any Redis-touching test, plain JUnit only for pure-logic helpers (bucket-key formatter, URL parser).

### Test 1 — `RedisIntegrationTest.java` (NEW)

Location: `backend/src/test/java/com/worshiproom/cache/RedisIntegrationTest.java`

Master plan AC coverage: connectivity, health indicator, REDIS_URL parsing, REDIS_HOST/PORT/PASSWORD triplet parsing.

Approximate test count: **5-7**

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

Approximate test count: **6-8**

Scenarios:

- `dev` profile → `ConcurrentMapCacheManager` autowired
- `prod` profile → `RedisCacheManager` autowired (against Testcontainer)
- Cache GET/SET round-trip with TTL applied (verify TTL via `redisTemplate.getExpire(key)`)
- Circuit breaker: 3 consecutive Redis failures → cache reads return null without further Redis attempts
- Circuit breaker: 30 seconds after open, next call attempts Redis; success closes circuit
- Circuit breaker: 30 seconds after open, next call attempts Redis; failure resets the 30-second timer
- Cache bypass during circuit-open does not throw (silent degradation per W10 / D4)
- TTL-enforcement repo-wide test passes against zero `@Cacheable` annotations today (vacuous truth)

### Test 3 — `RateLimiterContractTest.java` (NEW) — THE LOAD-BEARING TEST

Location: `backend/src/test/java/com/worshiproom/ratelimit/RateLimiterContractTest.java`

**This is the most important test in 5.6** per the master plan's out-of-band notes (line 4860): *"The contract test for rate limiters is the most important artifact here."*

Parametrized over both implementations. Use JUnit 5's `@ParameterizedTest` with a `@MethodSource` providing `InMemoryRateLimiter.class` and `RedisRateLimiter.class` (constructed against a Testcontainer for the Redis variant).

Approximate test count: **8-10**

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

Approximate test count: **4-6**

Scenarios:

- 2-instance simulation: spawn two `@SpringBootTest` instances with the same Redis Testcontainer; rate-limit state mathematically accurate (per master plan AC)
- `X-RateLimit-Remaining` header reflects Redis-backed count in prod profile (integration with `@Controller` if existing rate-limit filter consumes the new interface in a test context — note: no existing filter does today per D1, so this test may need a thin test-only consumer; plan recon decides)
- Lua script behavior under contention (bucket4j-redis uses Lua for atomic decrement; verify no race conditions under high concurrency)
- TTL on bucket keys (rate-limit buckets expire after their refill window + safety margin)

### Test 5 — Repo-wide TTL grep test (NEW)

Location: `backend/src/test/java/com/worshiproom/cache/RepoWideTtlEnforcementTest.java` (or similar; plan recon picks final name)

Test scans `backend/src/main/java/**/*.java` for raw `redisTemplate.opsForValue().set(...)` calls and asserts each has a TTL overload (`.set(key, value, Duration.ofXxx(...))`) or is followed by an `.expire(...)` call.

Also scans for `@Cacheable` annotations and asserts each cache name has a corresponding `spring.cache.redis.time-to-live.<cacheName>` property in `application.properties` / `application-prod.properties`.

Approximate test count: **1** (with N sub-assertions where N = matches found; today zero matches, so vacuous truth)

### Test 6 — Existing rate-limit service tests — NO CHANGES

The 11 existing per-service rate-limit tests stay unchanged. Per D1 / W3, no existing service is migrated in 5.6.

If plan-time CC discovers an existing rate-limit test fails after the Maven dependency changes (e.g., because the bucket4j-lettuce extension transitively pulls a conflicting Lettuce version), that's an R-OVR moment — plan recon investigates and may need to add an exclusion to the new dependency.

### Net test count

Approximate: **24-32 new tests** across 5 new test classes. Master plan AC requires ≥18. Brief comfortably exceeds.

Plan recon refines counts based on actual implementation. **The contract test (Test 3) is load-bearing; it cannot be cut.**

---

## Integration verification

Per brief Section 3. This spec is backend infrastructure; there is no Playwright surface and no visual verification. The verification surface is **Testcontainer-driven integration tests + manual dev-stack smoke + production-like staging smoke** (if a staging env exists).

### Required Testcontainer integration scenarios

1. **Redis health indicator.** `RedisHealthIndicator` reports `UP` when the Testcontainer is running; `DOWN` when stopped. Exposed via `GET /actuator/health/redis`. Asserts response body contains `"status":"UP"` and connection metadata (host, port).

2. **CacheManager wiring per profile.** With `spring.profiles.active=prod` (overridden in the integration test via `@ActiveProfiles("prod")`), the autowired `CacheManager` is an instance of `RedisCacheManager`. With `dev` profile, it's `ConcurrentMapCacheManager`. Asserted by `instanceof` check on the bean.

3. **Rate limiter contract test — InMemoryRateLimiter.** Same test class, parametrized over both implementations. Scenarios per Test 3 above.

4. **Rate limiter contract test — RedisRateLimiter.** Same scenarios, against a Redis Testcontainer. Plus cross-instance and concurrent scenarios.

5. **Circuit breaker engagement.** With Redis Testcontainer running, cache is consulted normally. Stop the Testcontainer (`redisContainer.stop()`); after 3 consecutive cache operations fail, the circuit opens (cache is bypassed; underlying data source is queried directly). Health indicator transitions to `DEGRADED` state.

6. **Circuit breaker recovery.** With circuit open, restart the Testcontainer (`redisContainer.start()`). Within 30 seconds (or whatever the recovery window is — plan recon decides), the circuit closes (cache is consulted again). Health indicator returns to `UP`.

7. **Sentry integration on Redis failures.** Stop the Testcontainer; trigger a Redis operation; assert that Sentry SDK received an error event. Uses the existing Sentry test harness per R14.

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
- Stopping Redis (`docker-compose stop redis`) and re-curling `/actuator/health` shows the Redis status as `DOWN` and overall as `DEGRADED` (not `DOWN` — health degradation, not total failure, per D4 / W10)

### Required staging smoke (if staging exists)

- Backend deployed to staging with `REDIS_URL` configured against a real Redis instance (Upstash free tier or equivalent per master plan recon note #1)
- `/actuator/health/redis` returns `UP` in staging
- Rate limit headers behave as expected (try hitting any rate-limited endpoint at high frequency, observe `X-RateLimit-Remaining` decrement). NOTE: per D1, existing rate-limit headers are still single-instance; cross-instance headers only become observable when a consumer adopts the new interface.

**`/verify-with-playwright` is NOT required for this spec.** The skill is designed for frontend visual verification.

---

## Acceptance criteria

### Master plan AC (verbatim, 14 items)

- [ ] Redis 7 service running in docker-compose dev stack with AOF persistence
- [ ] Spring Data Redis dependency present and Lettuce client active
- [ ] `REDIS_URL` (Upstash-style) parses correctly when set instead of HOST/PORT/PASSWORD triplet
- [ ] `RedisHealthIndicator` reports UP when Redis is reachable, DOWN otherwise; exposed via `/actuator/health/redis`
- [ ] `CacheManager` bean is Redis-backed in `prod` profile, ConcurrentMap-backed in `dev` profile
- [ ] All configured `@Cacheable` methods have explicit TTL (verified by test that scans `@Cacheable` annotations) — satisfied vacuously today per D5
- [ ] Rate limiter contract test passes against both InMemoryRateLimiter and RedisRateLimiter
- [ ] Rate limiter correctly tracks requests across simulated multiple-instance scenario
- [ ] `X-RateLimit-Remaining` header reflects Redis-backed count in prod profile (for any consumer that adopts the new interface; existing per-service consumers retain single-instance behavior per D1)
- [ ] Cache bypass circuit breaker engages after 3 consecutive Redis failures
- [ ] Cache bypass recovers automatically when Redis comes back
- [ ] Redis connection failures are logged at ERROR and propagate to Sentry
- [ ] Every Redis key set in the app has an associated TTL (verified by repo-wide grep test)
- [ ] `backend/docs/redis-conventions.md` documents key namespaces, TTL policy, sorted-set examples
- [ ] Rate limit headers mathematically accurate under 2-instance simulation
- [ ] At least 18 tests across cache config, rate limiter contract, Redis health, and circuit breaker

### Brief expansion AC (Section 4 MPDs + Section 7 D-decisions)

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
- [ ] Contract test exercises 8-10 scenarios parametrized over both impls plus 1 Redis-specific scenario (Test 3)
- [ ] `application-test.properties` created with Testcontainer-friendly defaults (MPD-6 / W17 / W28)
- [ ] Free-tier Redis upgrade decision criteria documented in `redis-conventions.md` (MPD-5)
- [ ] Spec-tracker.md not modified by spec or plan execution (W26)
- [ ] Master plan body not modified (W14 / MODIFY list)

### Follow-up issue AC

- [ ] A follow-up issue is filed (in `_plans/follow-ups/` or wherever Eric tracks follow-ups) titled "Spec 5.7 (or similar): Migrate per-service rate limiters to `RateLimiter` interface" with priority ranking per D1's follow-up list (LoginRateLimitFilter first, then high-traffic services, then low-traffic)

### Verification AC

- [ ] All 5 new test classes pass
- [ ] Net new test count is ≥18 (master plan AC) and ideally 24-32 per Section "Test specifications"
- [ ] `/code-review` passes with zero Blocker, zero Major findings
- [ ] Manual dev-stack smoke (above) succeeds
- [ ] (If staging exists) Staging smoke (above) succeeds
- [ ] Manual Eric review: spec-tracker flipped ⬜ → ✅ after merge + smoke

---

## Out of scope

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

## Notes for plan phase recon

Per master plan:

1. Confirm Upstash Redis free tier (10K commands/day, 256 MB data) suffices for Phase 6 presence + rate limiting + targeted caching. Rough estimate: 100 active users × ~20 Redis ops/user/day = 2K/day. Plenty of headroom.
2. Verify Spring Data Redis version matches Spring Boot 3.5.11 (R1 confirms Spring Boot 3.5.11 at `pom.xml` line 11). Spring Data Redis ships with the Spring Boot 3.5.x BOM. Plan recon adds the starter dependency without specifying a version (let the BOM resolve).
3. Decide if Redis should be optional in prod — **brief D4 overrides the master plan default to "optional with degraded health."** Plan recon picks the implementation mechanism (wrapper pattern recommended; alternatives evaluated).
4. Identify the specific `@Cacheable` targets — **brief D5 defers this entirely. 5.6 adds zero annotations.** Plan recon does NOT audit PostService / QOTDService / LiturgicalService / LeaderboardService; that's Phase 6.1+ scope.

Per brief Section 5 (R11-R15) — see Section "Plan-Recon-Required items" above.

Additional plan-recon items the brief calls out:

- Read `backend/src/main/resources/application.properties` and `application-prod.properties` end-to-end to understand profile activation and existing config patterns
- Read `.claude/rules/06-testing.md` to confirm the "never mock real infrastructure" rule and refine W11's phrasing
- Verify the brief's R3 list (11 existing rate-limit service files) is complete by re-greping for `bucket4j` in `backend/src/main/java/`. If additional service files surface, add to the NOT-TO-MODIFY list per W3/D1. **Already verified at spec authorship — exact 11-file match. Plan-time recon can re-verify but no surprises expected.**

---

## Override Moments — escalation to MAX tier

Per brief Section 2 (Override moments that should bump 5.6 to MAX) and Section 14 (Override moments — re-stated). The brief documents seven scenarios where 5.6 needs Eric-as-advisor intervention beyond plan recon's discretion:

1. **bucket4j-Redis extension incompatibility** with bucket4j 8.18.0 + Lettuce + Spring Boot 3.5.11. Advisor decides between (a) upgrading bucket4j (out of 5.6 scope), (b) implementing token-bucket logic directly via Lua scripts (significant new work), or (c) switching to sliding-window (changes header semantics; requires Eric review).

2. **Spring Data Redis version conflicts** with the existing Spring Boot 3.5.11 BOM. Advisor decides whether to upgrade Spring Boot (out of 5.6 scope) or pin a different Redis client version.

3. **Contract test fails to pass against both impls.** The contract test is load-bearing; if behavior diverges between InMemoryRateLimiter and RedisRateLimiter, the divergence is either (a) a real bug in one impl (fix it), or (b) a fundamental incompatibility between the two backends (which means the design call needs revisiting).

4. **Circuit breaker recovery test is flaky.** Restarting a Testcontainer mid-test (`redisContainer.stop()` + `redisContainer.start()`) is a known-fragile pattern. If flakiness can't be resolved by reasonable retry/wait semantics, advisor decides whether to ship without the recovery assertion (accept manual verification) or invest more in test stability.

5. **Recon discovers existing rate-limit services use bucket4j in ways the new InMemoryRateLimiter interface can't preserve.** Configuration-per-call-site is the likely surprise (each existing service has its own bucket configuration: rate, burst, refill window). The new interface must accommodate per-call-site configs without forcing every consumer to hand-roll BucketConfiguration objects.

6. **Production fallback decision (D4) needs Eric's call.** The brief defaults to "optional with degraded health," but Eric may prefer hard-fail (Redis-down = backend-won't-start) for stricter operational guarantees. Surface during brief review.

7. **Plan-time CC discovers a 12th rate-limit service** the brief didn't enumerate in R3. Add to the NOT-TO-MODIFY list; verify the strangler pattern still applies. **Already verified at spec authorship — no 12th service found. Re-verify at plan time as a defensive check.**

---

## Out-of-band notes for Eric (master plan verbatim + brief expansion)

**Master plan out-of-band:** The contract test for rate limiters is the most important artifact here. If you later decide to swap Redis for Dragonfly, KeyDB, or a different cache, the contract test is what tells you the swap is safe. The circuit breaker on the cache read path is load-bearing in a different way: the day Redis has a hiccup (and it will), the app should get slightly slower, not start 500-ing. Budget an afternoon to manually verify this — stop your dev Redis, hit the app, confirm pages load, confirm the WARN logs fire, then restart Redis and confirm recovery. This is the kind of test that prevents a 2 AM outage from a Redis maintenance window.

**Brief expansion:**

- The strangler pattern (D1) is the central design call. It is what keeps 5.6 at M-size and bounds the blast radius. If you find yourself feeling pressure to "just migrate LoginRateLimitFilter while we're here," resist. The follow-up spec exists specifically so that migration has its own intent and its own testing surface.
- The DEGRADED-not-DOWN health model (D4 / W10) is the production resilience call. If you prefer hard-fail semantics (Redis-unreachable = backend-won't-start), override D4 at brief review. The contract test infrastructure stays the same either way.
- The free-tier Redis decision (D6 / MPD-5) is a deployment configuration call, not a code call. 5.6 doesn't encode Upstash specifically anywhere. When you set up the prod Redis instance, document the provider and the upgrade trigger (80% of free tier) in `redis-conventions.md`.

---

## Verification handoff

After this spec is approved, the pipeline continues:

1. **`/plan-forums _specs/forums/spec-5-6.md`** — Claude Code produces the detailed plan at `_plans/forums/spec-5-6.md`. Plan includes:
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

3. **5.5 ✅ in spec-tracker.md** before `/execute-plan-forums`. **Already confirmed at spec authorship.**

4. **`/execute-plan-forums _plans/forums/spec-5-6.md`** — Claude Code executes the plan. Branch: `forums-wave-continued`. No commits. Per-step verification via `./mvnw test` (running only the new test classes initially, then full suite after all source changes).

5. **`/code-review`** — Claude Code reviews the diff per standard skill protocol. Acceptance criteria above are the review checklist. Zero Blockers, zero Majors required to advance.

6. **Integration verification per Section "Integration verification":**
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

## See also

- **Master plan body:** `_forums_master_plan/round3-master-plan.md` → Spec 5.6 (lines ~4735–4860)
- **Source brief:** `_plans/forums/spec-5-6-brief.md`
- **Spec tracker:** `_forums_master_plan/spec-tracker.md` row 78
- **Phase 6 first consumer:** `_forums_master_plan/round3-master-plan.md` → Spec 6.1 Prayer Receipt (line 4926 references this spec's cache infrastructure)
- **Related rules:**
  - `.claude/rules/02-security.md` § Rate Limiting — bucket4j + Caffeine canonical pattern, BOUNDED EXTERNAL-INPUT CACHES rule
  - `.claude/rules/03-backend-standards.md` § Rate Limiting — current per-IP limits, Forums Wave targets (read 100/min auth, write 20/min auth, etc.)
  - `.claude/rules/05-database.md` § "Test-profile context override (no `application-test.properties`)" — interacts with W17 / MPD-6 / R-OVR-RULES1
  - `.claude/rules/06-testing.md` § Testcontainers Setup Pattern — `AbstractIntegrationTest` base-class pattern that `RedisIntegrationTest` should follow
  - `.claude/rules/07-logging-monitoring.md` § Error Tracking — Sentry PII boundary (W18); § Framework Log Suppression — preserve `org.springframework.web=WARN` to prevent body/query-string leaks
  - `.claude/rules/08-deployment.md` § Environment Variables — `REDIS_URL` already listed as deferred; this spec activates it

---

**Spec authored 2026-05-11 on branch `forums-wave-continued`. Pre-requisite 5.5 ✅. Ready for `/plan-forums _specs/forums/spec-5-6.md`.**
