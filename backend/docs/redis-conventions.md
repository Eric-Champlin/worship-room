# Redis Conventions

Worship Room uses Redis 7 (Alpine) as a shared cache and ephemeral data store.
This document defines the conventions every consumer must follow.

Authored alongside Spec 5.6 (Redis Cache Foundation). Future specs that introduce
new key namespaces or new consumers update this file in their own diff.

## Connection

Two precedence rules govern connection resolution:

1. If `REDIS_URL` is set, parse it as `redis[s]://[user][:password]@host[:port][/db]`.
2. Otherwise, fall back to `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`.

Both forms work against any Redis provider (Upstash, Redis Cloud, Railway, ElastiCache,
self-hosted, Docker). Production deployment uses Upstash free tier by default; see
"Provider choice" below.

## Key namespaces

All keys are prefixed by domain. Keys without a documented prefix are not allowed.

- `cache:*` — Spring `@Cacheable`-managed entries. The cache name appears between the
  prefix and the entry key: `cache:<cacheName>:<entryKey>`. As of 5.6 ship there are
  zero `@Cacheable` consumers; Phase 6.1 (Prayer Receipt) is the first.
- `rate:*` — Rate limiter buckets. Format:
  `rate:{endpoint-category}:{authed|anon}:{user-id-or-ip-hash}:{window-start-epoch}`.
  `endpoint-category` is a fixed-vocabulary segment chosen per consumer.
- `presence:*` — Reserved for Phase 6.11b Live Presence (sorted-set keys).
- `lock:*` — Reserved for future distributed locks (currently out of scope).

A repo-wide static-analysis test (`RepoWideTtlEnforcementTest`) verifies that no
un-TTL'd raw `opsForValue().set()` calls exist. Always use the 3-argument
`set(key, value, Duration)` overload OR explicit `expire(key, ...)`.

## TTL policy

Every key has an explicit TTL. No exceptions. A key without an expiry is a memory leak
waiting to happen, and on Upstash free tier it counts against the 256 MB data limit
indefinitely.

Per-cache TTLs go in `application.properties`:

    spring.cache.redis.time-to-live.<cacheName>=<duration>

Rate-limit buckets get a 1-hour TTL via
`Bucket4jLettuce.casBasedBuilder(...).expirationAfterWrite(ExpirationAfterWriteStrategy.fixedTimeToLive(...))`.

## Sorted sets (reserved for presence)

The Phase 6.11b Live Presence feature uses ZADD with score = epoch timestamp:

    ZADD presence:room-abc <ts> user-uuid

Then ZRANGEBYSCORE queries the 60-minute window:

    ZRANGEBYSCORE presence:room-abc <ts-3600> +inf

5.6 does NOT use sorted sets. Rate limiting in 5.6 uses bucket4j-lettuce token-bucket
on both sides (parity with the existing in-memory implementation).

## Provider choice (Upstash free tier)

Default production target: Upstash Redis (free tier — 10K commands/day, 256 MB data,
pay-per-command above the free tier). Worship Room scale fits comfortably in the
free tier at Phase 6 sizing (~2K commands/day for 100 active users).

Upgrade trigger: when daily command count exceeds 8K (80% of free tier), upgrade to
Upstash paid tier or migrate to self-hosted Redis on the prod host. The infrastructure
code is provider-agnostic; the choice is a deployment configuration call.

Alternative providers (also supported by the connection layer): Redis Cloud free tier
(30 MB), Railway Redis (if Railway is the deploy target), AWS ElastiCache (overkill at
this scale), self-hosted on the prod host.

## Degraded mode

Redis is OPTIONAL in production (per Spec 5.6 D4 / W10). If Redis is unreachable:

- `CacheManager` falls back to in-memory `ConcurrentMapCacheManager` (cache bypass).
- `RateLimiterConfig` falls back to `InMemoryRateLimiter` (single-instance state).
- `RedisHealthIndicator` reports DEGRADED (not DOWN).
- Overall `/actuator/health` reports DEGRADED.
- Sentry receives an error event.

The backend continues serving requests in this state. Manual restoration is via the
provider's UI or env-var update; no app-side intervention required.

Spring Boot's auto-configured Redis health indicator is disabled via
`management.health.redis.enabled=false` in `application.properties` so the custom
`RedisHealthIndicator` is the sole reporter for the `redis` component. The custom
indicator emits the `DEGRADED` status (defined in `DegradedAwareStatusAggregator`)
on any Redis failure; the priority list
`DOWN > DEGRADED > OUT_OF_SERVICE > UP > UNKNOWN`
in the aggregator ensures overall health is DEGRADED only when Redis is the failing
component (a real db or diskSpace DOWN still wins).

## Circuit breaker

The `CircuitBreakingCacheManager` wraps the Redis CacheManager with a 3-strike circuit
breaker. After 3 consecutive failures, cache reads/writes bypass Redis for 30 seconds.
Recovery is automatic on the next successful operation.

State is in-memory (not cross-instance). Each backend instance maintains its own
counter; multi-instance deployments can have different circuits open at any moment.
This is intentional — the circuit breaker is per-process resilience, not a global
coordination mechanism.

## Local development

The dev profile defaults to in-memory cache + in-memory rate limiter, so local
iteration works without Redis running. To exercise Redis locally:

    docker compose up redis

Then either set `worshiproom.ratelimit.backend=redis` (or set the env var
`WORSHIPROOM_RATELIMIT_BACKEND=redis`), or use a per-test
`@TestPropertySource(properties = "worshiproom.ratelimit.backend=redis")`.

## Troubleshooting

- "Redis unreachable at startup; falling back to InMemoryRateLimiter (degraded mode)":
  Check that `REDIS_URL` or the triplet is set and the target is reachable. Verify with
  `redis-cli -h <host> -p <port> -a <password> ping`.
- `/actuator/health/redis` reports DEGRADED: same as above; the indicator probes on
  every health check.
- Bucket counts disagree across two backend instances: expected when
  `worshiproom.ratelimit.backend=memory`; switch to `redis` to share state.
- Bucket counts disagree even with `redis`: check that both instances point at the
  same Redis (different `REDIS_URL`s = independent state).

## See also

- Spec: `_specs/forums/spec-5-6.md`
- Plan: `_plans/forums/2026-05-11-spec-5-6.md`
- Phase 6 first consumer: `_forums_master_plan/round3-master-plan.md` → Spec 6.1
- Related runbooks: `runbook-monitoring.md`, `runbook-storage.md`, `env-vars-runbook.md`
