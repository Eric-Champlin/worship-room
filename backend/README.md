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

### Dev seed users

When the backend boots with `spring.profiles.active=dev` (the default — see `application.properties`), Liquibase applies `contexts/dev-seed.xml`, which inserts 5 test users so you can exercise `POST /api/v1/auth/login`, `GET /api/v1/users/me`, and `PATCH /api/v1/users/me` without manually registering.

**Shared password for every seed user:** `WorshipRoomDev2026!`

| Email | First / Last | Display name | `is_admin` | Timezone | Verified |
|-------|--------------|--------------|-----------|----------|----------|
| `admin@worshiproom.dev` | Admin / User | `Admin User` (first_last) | ✅ | America/Chicago | ✅ |
| `sarah@worshiproom.dev` | Sarah / Johnson | `Sarah` (first_only) | | America/New_York | ✅ |
| `bob@worshiproom.dev` | Bob / Smith | `Bob S.` (first_last_initial) | | America/Los_Angeles | ✅ |
| `mikey@worshiproom.dev` | Michael / Martinez | `Mikey M.` (custom) | | Europe/London | ✅ |
| `sakura@worshiproom.dev` | Sakura / Tanaka | `Sakura` (first_only) | | Asia/Tokyo | ❌ (unverified) |

Seed UUIDs are deterministic: `00000000-0000-0000-0000-00000000000N` where N is the row number in the table above (1 = admin, 2 = sarah, etc.).

#### Starting a fresh dev database

```sh
docker compose down -v                                                    # wipe volume
docker compose up -d postgres                                             # fresh container
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev                     # boot — Liquibase applies seed
```

#### Logging in as a seed user

```sh
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"sarah@worshiproom.dev","password":"WorshipRoomDev2026!"}'
```

The response includes a JWT — use it as `Authorization: Bearer <token>` on subsequent requests.

#### Regenerating the BCrypt hash

If you ever need to change the shared dev password, regenerate the hash with a throwaway JUnit test (mirrors the approach used when this spec shipped):

```java
// src/test/java/com/worshiproom/auth/DevSeedBcryptHashGenerator.java
@Test
void generateAndPrintHash() {
    BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
    String hash = encoder.encode("your-new-password");
    System.out.println("HASH: " + hash);
    assertThat(encoder.matches("your-new-password", hash)).isTrue();
}
```

Run via `./mvnw test -Dtest=DevSeedBcryptHashGenerator`, copy the printed hash, then delete the throwaway file. Create a NEW Liquibase changeset (do NOT edit `contexts/dev-seed.xml` in place — Liquibase checksum mismatch will crash startup) that either `UPDATE`s the 5 `users.password_hash` rows or `DELETE`s + re-`INSERT`s them.

The dev password is plaintext in this README because dev data is scoped to local machines only — the dev context is blocked in prod by `application-prod.properties` (`spring.liquibase.contexts=production`) and in tests by `AbstractIntegrationTest` / `AbstractDataJpaTest` (`spring.liquibase.contexts=test`).

### Dev seed mock prayer-wall content (Spec 3.2)

In addition to the 5 auth-seed users above, `contexts/dev-seed.xml` includes a separate Spec 3.2 mock-seed file (`contexts/2026-04-27-021-prayer-wall-mock-seed.xml`) that loads ten **non-loginable** mock prayer-wall users plus realistic Prayer Wall content under the same `context="dev"` gating.

The mock users are **separate** from the 5 auth-seed users. They share the same dev BCrypt hash (so technically they're loginable) but their email pattern (`mock-{name}@worshiproom.local`) and their role as "content authors" rather than "test accounts" make the distinction clear in dev tools.

| Group | Count | Purpose |
|-------|-------|---------|
| Mock users | 10 | UUIDs `...0101`..`...010a`; authors of mock prayers/comments/reactions |
| Mock prayers | 24 | UUIDs `...0201`..`...0218`; 3 QOTD responses + 3 mental-health + 18 regular |
| Mock comments | 35 | UUIDs `...0301`..`...0323` |
| Mock reactions | 5 | composite-PK rows (post_id, user_id=`...0101` Sarah, reaction_type='praying') |
| QOTD questions | 72 | ids `qotd-1`..`qotd-72`; 60 general + 12 liturgical-season |

**Verify the seed loaded:**

```sh
psql -h localhost -U worshiproom -d worshiproom_dev -c "
  SELECT 'users' AS table_name, COUNT(*) FROM users
  UNION ALL SELECT 'posts',   COUNT(*) FROM posts
  UNION ALL SELECT 'post_comments',  COUNT(*) FROM post_comments
  UNION ALL SELECT 'post_reactions', COUNT(*) FROM post_reactions
  UNION ALL SELECT 'qotd_questions', COUNT(*) FROM qotd_questions;
"
```

Expected output (after a fresh `docker compose down -v && docker compose up -d postgres && ./mvnw spring-boot:run -Dspring-boot.run.profiles=dev`):

- `users`: 15 (5 Phase 1.8 auth + 10 Phase 3.2 mock)
- `posts`: 24
- `post_comments`: 35
- `post_reactions`: 5
- `qotd_questions`: 72

**Reset path:** same as auth seed — `docker compose down -v` destroys the volume, next backend boot reapplies all migrations including both seeds.

**Production safety:** `application-prod.properties` sets `spring.liquibase.contexts=production` — the `context="dev"` mock seed is NEVER applied to production deployments. Tests under `AbstractIntegrationTest` pin `contexts=test`, so the mock seed is also NEVER applied during the test suite (verified by `MockSeedDevContextTest.mockSeedDoesNotLoadUnderTestContext`).

## GeoIP Setup (Spec 1.5g — optional)

The `/settings/sessions` UI shows the user's active sign-in sessions with a coarse city derived from the request IP. The city comes from a local copy of MaxMind's free GeoLite2-City database; no third-party API calls happen at runtime (privacy + latency).

**The backend boots fine without this**. When the `.mmdb` file is absent, `ip_city` is stored as `NULL` for every session and the UI shows "Unknown location". You only need to set this up if you want city labels to appear in development.

### One-time setup

1. **Register at <https://www.maxmind.com>** and accept the GeoLite2 EULA (free for commercial use with attribution).
2. **Generate a license key** in your MaxMind account → "My License Key" → "Generate new license key" (any key type works; the free tier allows the GeoLite2-City download).
3. **Set the env var** in your local environment:
   ```sh
   export MAXMIND_LICENSE_KEY=YOUR_KEY_HERE
   ```
   Recommended: add it to `backend/.env` (this file is `.gitignore`d).
4. **Confirm `.gitignore`** covers `data/geoip/` and `*.mmdb` (already configured in `backend/.gitignore`). The `.mmdb` is ~50MB and the EULA forbids redistribution under the free tier.

### Downloading / refreshing the database

The download is wired into Maven via the `geoip-download` profile, activated automatically when `MAXMIND_LICENSE_KEY` is set:

```sh
./mvnw process-resources    # download to backend/data/geoip/
```

Or run as part of any full build:

```sh
./mvnw package              # also fetches if MAXMIND_LICENSE_KEY is set
```

Refresh cadence is manual — re-run `mvn process-resources` whenever you want a newer database. City geography drifts slowly; monthly is plenty. There is no `@Scheduled` runtime refresh.

### Production deployment

In production, set `MAXMIND_LICENSE_KEY` on the deploy platform (Railway/Render Variables UI). The build pipeline picks it up and bakes the `.mmdb` into the deployed artifact's working directory. If the key is absent in prod, sessions get `ip_city=NULL` — no crash, no startup failure.

### Verification

```sh
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```

Watch for one of these log lines at startup:

- `GeoIP database loaded path=./data/geoip/GeoLite2-City.mmdb` — working
- `GeoIP database unavailable at path=...; city lookups disabled.` — degraded (expected if you skipped the setup)

### Path override

The default lookup path is `./data/geoip/GeoLite2-City.mmdb` relative to the backend working directory. Override via:

```properties
geoip.database-path=/var/data/geoip/GeoLite2-City.mmdb
```

in `application.properties` or via env var (`GEOIP_DATABASE_PATH=...`).

## Key files referenced by project rules

- `.claude/rules/03-backend-standards.md` — Spring Boot conventions, API contract, `@RestControllerAdvice` scoping patterns
- `.claude/rules/02-security.md` — rate limiting, XFF trust policy, password policy, CORS, secret handling
- `.claude/rules/07-logging-monitoring.md` — PII discipline, framework log suppressions (the two `logging.level.org.springframework.web.*=INFO` lines in `application-dev.properties` are MANDATORY)
- `.claude/rules/06-testing.md` — Testcontainers for DB-backed tests (never H2), test slice conventions

## What's next (Forums Wave Phase 1+)

The 156-spec Forums Wave Master Plan lives at `_forums_master_plan/round3-master-plan.md`. Phase 1 adds Liquibase (Spec 1.2), the `users` table (Spec 1.3), Spring Security + JWT (Spec 1.4), and the auth lifecycle specs (1.5b–1.5g: password reset, change password, email verification, lockout, session invalidation). New top-level packages (`auth/`, `user/`, `prayer/`, `moderation/`, etc.) will sit alongside `proxy/` — do not pre-create them; Forums Wave specs own them.
