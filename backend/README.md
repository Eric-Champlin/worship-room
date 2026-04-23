# Worship Room Backend

Spring Boot 3.x backend that proxies three upstream APIs (Gemini, Google Maps, FCBH DBP) so their keys never reach the frontend. The Forums Wave (Phase 3) will layer auth, PostgreSQL + Liquibase, and domain services on top of this proxy foundation.

## Project structure

```
src/main/java/com/worshiproom/
├── WorshipRoomApplication.java        -- @SpringBootApplication entrypoint
├── config/
│   ├── ProxyConfig.java               -- binds proxy.* props; exposes WebClient + IpResolver beans
│   └── CorsConfig.java                -- CORS via proxy.cors.allowed-origins
├── controller/
│   └── ApiController.java             -- /api/health, /api/v1/health, /api/hello
└── proxy/
    ├── common/                        -- shared across all proxy subpackages
    │   ├── ProxyResponse.java             DTO: { data, meta.requestId }
    │   ├── ProxyError.java                DTO: { code, message, requestId, timestamp }
    │   ├── ProxyException.java            base class for proxy-scoped exceptions
    │   ├── UpstreamException.java         502 UPSTREAM_ERROR
    │   ├── UpstreamTimeoutException.java  504 UPSTREAM_TIMEOUT
    │   ├── RateLimitExceededException.java 429 RATE_LIMITED
    │   ├── SafetyBlockException.java      422 SAFETY_BLOCK
    │   ├── FcbhNotFoundException.java     404 (FCBH-specific)
    │   ├── RequestIdFilter.java           @Order(HIGHEST_PRECEDENCE) — X-Request-Id + MDC
    │   ├── RateLimitFilter.java           @Order(HIGHEST_PRECEDENCE+10), scoped to /api/v1/proxy/**
    │   ├── ProxyExceptionHandler.java     @RestControllerAdvice(basePackages="com.worshiproom.proxy")
    │   ├── RateLimitExceptionHandler.java @RestControllerAdvice (unscoped, by design)
    │   └── IpResolver.java                honors XFF only when proxy.trust-forwarded-headers=true
    ├── ai/                            -- Gemini: Explain (BB-30), Reflect (BB-31), Ask (AI-1), Prayer (AI-2), JournalReflection (AI-3)
    ├── maps/                          -- Google Maps: Geocode, Places Nearby, Place Photo
    └── bible/                         -- FCBH DBP v4: listAudioBibles, per-chapter filesets
```

## Filter chain

Two servlet filters run on every request to `/api/v1/**`:

1. **`RequestIdFilter`** (`@Order(HIGHEST_PRECEDENCE)`) — generates (or honors a client-supplied) 22-character `X-Request-Id`, puts it on the response header, and places it in SLF4J MDC under key `requestId`. Cleared in a `finally` block so the MDC doesn't leak across requests in the thread pool. Every log line during the request lifecycle is prefixed with the request ID, and every `ProxyError` body carries the same ID — that's the primary operator-to-user debugging handshake.
2. **`RateLimitFilter`** (`@Order(HIGHEST_PRECEDENCE + 10)`) — bucket4j + Caffeine-backed bounded bucket map keyed by client IP. Scoped to `/api/v1/proxy/**` via `shouldNotFilter`; health endpoints and future Forums Wave routes are excluded. Dev defaults: 120 req/min with 30-burst; prod: 60/10. On 429 the filter delegates to Spring's `HandlerExceptionResolver` so `RateLimitExceptionHandler` can emit the full `ProxyError` body + `Retry-After` header.

## Caches

Three in-memory Caffeine caches live inside the service layer (not a shared cache manager):

- `GoogleMapsService` — geocode cache + places nearby cache
- `FcbhService` — list-audio-bibles cache + per-chapter fileset cache
- `GeminiService` — no caching (every AI call is unique; the frontend `bb32-v1:*` localStorage cache is the dedup layer)

All caches are bounded by both size and TTL; an unbounded map keyed on external input is a DoS vector (see `.claude/rules/02-security.md` § BOUNDED EXTERNAL-INPUT CACHES).

## Health endpoint

`GET /api/v1/health` returns `{"status":"ok","providers":{"gemini":{"configured":bool},"googleMaps":{"configured":bool},"fcbh":{"configured":bool}}}`. A deploy can verify env-var wiring without requiring a live upstream call — `configured:false` means the key is missing, not that the upstream is down. `GET /api/health` is a legacy alias that returns the same body. `GET /api/hello` returns `{"message":"Hello"}` (also legacy; used by the frontend landing-page smoke check).

## Local dev setup

```sh
cp .env.example .env.local                        # then fill in upstream keys as desired
docker compose up backend                          # loads .env.local via env_file directive
# OR
set -a && source .env.local && set +a && ./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```

Tests: `./mvnw test` (uses the `test` profile; does not need real keys). Integration tests that exercise upstream behavior use mocked SDK/WebClient responses.

## Local database

Spec 1.2 adds a PostgreSQL 16 service to `docker-compose.yml` for local development. Schema and migrations arrive in Spec 1.3 (Liquibase).

### Start / stop

```sh
docker compose up -d postgres          # start in background; ~5-10s to healthy
docker compose ps postgres             # STATUS column should read "healthy"
docker compose stop postgres           # graceful stop; data persists in named volume
```

### Manual inspection

```sh
psql -h localhost -U worshiproom -d worshiproom_dev
# password: worshiproom
```

### Wipe the database (⚠️ irreversible)

```sh
docker compose down -v                 # stops ALL services AND deletes the named volume
# Next `docker compose up -d postgres` starts from an empty database.
```

### Development credentials

The dev database credentials are hard-coded in `src/main/resources/application-dev.properties` because the container binds only to `localhost:5432` and never accepts external connections. Production credentials come from a platform-managed `DATABASE_URL` env var (Spec 1.10b). Never copy the dev credentials into any production configuration.

## Key files referenced by project rules

- `.claude/rules/03-backend-standards.md` — Spring Boot conventions, API contract, `@RestControllerAdvice` scoping patterns
- `.claude/rules/02-security.md` — rate limiting, XFF trust policy, password policy, CORS, secret handling
- `.claude/rules/07-logging-monitoring.md` — PII discipline, framework log suppressions (the two `logging.level.org.springframework.web.*=INFO` lines in `application-dev.properties` are MANDATORY)
- `.claude/rules/06-testing.md` — Testcontainers for DB-backed tests (never H2), test slice conventions

## What's next (Forums Wave Phase 1+)

The 156-spec Forums Wave Master Plan lives at `_forums_master_plan/round3-master-plan.md`. Phase 1 adds Liquibase (Spec 1.2), the `users` table (Spec 1.3), Spring Security + JWT (Spec 1.4), and the auth lifecycle specs (1.5b–1.5g: password reset, change password, email verification, lockout, session invalidation). New top-level packages (`auth/`, `user/`, `prayer/`, `moderation/`, etc.) will sit alongside `proxy/` — do not pre-create them; Forums Wave specs own them.
