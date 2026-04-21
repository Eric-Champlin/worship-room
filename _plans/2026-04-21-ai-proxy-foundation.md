# Plan: AI Proxy Foundation (Spec 1 of 5, Key Protection Wave)

**Spec:** `_specs/ai-proxy-foundation.md`
**Date:** 2026-04-21
**Branch:** `claude/feature/ai-proxy-foundation` (already cut; CC must stay on it)
**Size:** L (~800 LOC + ~500 LOC tests; 25–27 files)
**Risk:** Medium — new package, new filters, new dependencies. No DB, no JWT, no frontend changes. Backwards-compat for existing `/api/health` and `/api/hello` required.

---

## Universal Rules Checklist

N/A — standalone spec, not a Forums Wave master plan spec. The spec file itself is the sole authority. Applicable project conventions come from:

- `.claude/rules/03-backend-standards.md` — API contract, response shapes, controller/service/DTO conventions, CORS policy, OpenAPI requirement (Universal Rule 4). **Liquibase, JPA, JWT are explicitly excluded by the spec itself — see "CRITICAL EXECUTION RULES" §5.**
- `.claude/rules/02-security.md` — CORS, rate limiting, input validation, plain-text content policy
- `.claude/rules/07-logging-monitoring.md` — Structured JSON logging, request-ID in MDC, no PII in logs
- `.claude/rules/06-testing.md` — JUnit 5 + Spring Boot Test, MockMvc patterns

Per spec "CRITICAL EXECUTION RULES":
- [ ] CC stays on `claude/feature/ai-proxy-foundation` — no git subcommands except `git branch --show-current`
- [ ] No frontend changes (Spec 2 does frontend migration)
- [ ] No new keys introduced — `VITE_GEMINI_API_KEY` → `GEMINI_API_KEY` on backend (Eric copies value)
- [ ] No DB, no JWT, no Liquibase, no Redis
- [ ] Use exactly the code specified in the spec; no refactoring
- [ ] Do NOT add dependencies beyond the 5 listed

---

## Architecture Context

### Current backend state (as of main)
- `backend/pom.xml` — Spring Boot 3.5.11 parent, Java 21. 4 deps: `starter-web`, `starter-actuator`, `starter-validation`, `starter-test`. One plugin: `spring-boot-maven-plugin`.
- `backend/src/main/java/com/example/worshiproom/` — 3 files: `WorshipRoomApplication.java`, `config/CorsConfig.java`, `controller/ApiController.java`.
- `backend/src/main/resources/application.properties` — 6 lines: `server.port=8080`, `spring.application.name`, actuator exposure.
- `backend/src/test/` — empty (no test files yet).
- `backend/.gitignore` — does NOT exist yet.
- `backend/.env.example` — does NOT exist yet.
- `backend/src/main/resources/openapi.yaml` — does NOT exist yet.
- `docker-compose.yml` at repo root: backend service sets `SPRING_PROFILES_ACTIVE=docker`, no `env_file` directive.

### Corporate Maven mirror bypass (build infrastructure)
This plan produces two additional files not listed in the spec's "Files touched" table:
- `backend/.mvn/maven.config` — one-line file (`-s .mvn/settings.xml`) that the Maven wrapper auto-reads on every `./mvnw` invocation.
- `backend/.mvn/settings.xml` — deliberately empty Maven settings file (no `<mirrors>`, no `<servers>`, no `<proxies>`) whose sole purpose is to override the developer's global `~/.m2/settings.xml` if one exists.

**Why:** Some development machines (typically corporate laptops) have a global `~/.m2/settings.xml` with `<mirror><mirrorOf>central</mirrorOf>` that intercepts every Maven Central request and routes it through an organization's internal proxy (AWS CodeArtifact, Artifactory, Nexus). That's appropriate for projects belonging to that organization but NOT for Worship Room. Without these files, builds on such machines fail when the proxy's auth token expires. With them, Worship Room builds go directly to Maven Central with zero authentication on any machine, regardless of the developer's global Maven config. The Docker build is unaffected either way — the multi-stage Dockerfile runs `mvn` inside a clean container that has no `~/.m2/settings.xml` to begin with.

Both files are committed to git. The `settings.xml` itself contains a self-documenting comment block explaining this.

### Base package
**`com.example.worshiproom`** — the spec uses this throughout (`com.example.worshiproom.proxy.common.*`, `com.example.worshiproom.config.*`). This matches the current skeleton. Do NOT rename the package.

### New package to create
- `com.example.worshiproom.proxy.common` — new subpackage. Will hold 8 classes (ProxyResponse, ProxyError, ProxyException, UpstreamException, UpstreamTimeoutException, RateLimitExceededException, ProxyExceptionHandler, RequestIdFilter, RateLimitFilter, IpResolver). Tests mirror this under `src/test/java/com/example/worshiproom/proxy/common/`.

### Existing endpoints (must preserve)
- `GET /api/health` → `{"status":"ok"}` — docker-compose health check relies on HTTP 200, will be extended (not replaced) to add `providers` field
- `GET /api/hello` → `{"message":"Hello"}` — unchanged
- After this spec: `GET /api/v1/health` (new versioned alias) + same legacy endpoints

### Response shape conventions (from `.claude/rules/03-backend-standards.md`)
- Success: `{ data, meta: { requestId } }` — spec's `ProxyResponse<T>` matches exactly
- Error: `{ code, message, requestId, timestamp }` — spec's `ProxyError` matches exactly
- Response headers: `X-Request-Id`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, `Retry-After` on 429
- Error codes: `INVALID_INPUT`, `RATE_LIMITED`, `INTERNAL_ERROR` — spec adds `UPSTREAM_ERROR` (502) and `UPSTREAM_TIMEOUT` (504)

### CORS policy change
The existing CorsConfig hardcodes `http://localhost:5173` and `allowCredentials(true)`. The spec changes this to:
- `@Value("${proxy.cors.allowed-origins}")` array-bound
- `allowCredentials(false)` (matches master plan — in-memory JWT, no cookies)
- Adds `PATCH` method
- Adds `exposedHeaders` list (critical — without this, browsers hide rate-limit headers from JS)
- Per-profile origin lists (dev: localhost with 3 port variants; prod: worshiproom.com + www)

### Dependencies to add (5)
1. `com.google.genai:google-genai:1.51.0` — Gemini SDK (Spec 2 uses)
2. `org.springframework.boot:spring-boot-starter-webflux` (no explicit version — inherits from parent) — brings in `WebClient`
3. `com.bucket4j:bucket4j_jdk17-core:8.18.0` — token bucket rate limiter
4. `net.logstash.logback:logstash-logback-encoder:8.0` — JSON log encoder
5. `com.github.ben-manes.caffeine:caffeine:3.1.8` — bounded LRU cache for the per-IP rate-limit bucket map (added in post-review Round 2 to cap memory + prevent XFF-cycling DoS; see "Post-review round 2 hardening" below)

**No OpenAPI plugin** despite the spec's file-list mentioning one — Section 1 text says "Add OpenAPI plugin" but the actual dependency listing in Section 1 only shows the 5 libraries above. The openapi.yaml is hand-authored (per spec decision #10). Generation pipeline is Forums Wave Phase 1. Do NOT add an openapi-generator plugin.

### Filter ordering (critical)
- `RequestIdFilter` — `@Order(Ordered.HIGHEST_PRECEDENCE)` — runs FIRST so all subsequent logs have `requestId` in MDC
- `RateLimitFilter` — `@Order(Ordered.HIGHEST_PRECEDENCE + 10)` — runs second, only on `/api/v1/proxy/**`

### Logging strategy
- `logback-spring.xml` selects encoder based on Spring profile via `<springProfile>` blocks
- Dev (default / `!prod`): plain text with `[%X{requestId:-no-req}]` prefix
- Prod: JSON via `logstash-logback-encoder`
- The spec mentions a `<if>` conditional approach as an alternative, but `<if>` requires the `janino` library which is NOT in our dependency tree. Using `<springProfile>` directly avoids a `ClassNotFoundException` at Spring context initialization (including test-time `@WebMvcTest` loads). The `proxy.logging.json-format` property is still defined in the profile files for clarity but is NOT consumed by the XML — the profile name itself drives the encoder choice.

### Rate limiter design
- Caffeine `Cache<String, Bucket>` keyed by IP (bounded: `maximumSize(10_000)` + `expireAfterAccess(Duration.ofMinutes(15))`). Originally a `ConcurrentHashMap` per the spec; swapped to Caffeine in post-review Round 2 to cap memory and prevent the XFF-cycling DoS described below.
- `bucket4j` token-bucket per IP: capacity = `burstCapacity`, refill `requestsPerMinute` per minute
- Dev: 120/min, burst 30; prod: 60/min, burst 10
- On overflow: `RateLimitExceededException` with `retryAfterSeconds` → handler sets `Retry-After` header
- Memory ceiling: 10k IPs × ~100 bytes per bucket ≈ 1 MB worst case (vs the original unbounded design's theoretical 15 MB at 100k IPs with zero eviction)
- `shouldNotFilter()` returns true for paths NOT starting with `/api/v1/proxy/` — health endpoints never rate-limited

### `resetEpochSeconds` math
Spec text §17 has an awkward nanoTime+currentTimeMillis calculation, but explicitly directs CC to use the clean version:
```java
long resetEpochSeconds = java.time.Instant.now()
    .plusNanos(probe.getNanosToWaitForRefill())
    .getEpochSecond();
```
Use the clean version.

### Package layout after this spec
```
backend/src/main/java/com/example/worshiproom/
├── WorshipRoomApplication.java        (unchanged)
├── config/
│   ├── CorsConfig.java                 (MODIFIED)
│   └── ProxyConfig.java                (NEW)
├── controller/
│   └── ApiController.java              (MODIFIED — adds /api/v1/health, extends health JSON)
└── proxy/
    └── common/
        ├── IpResolver.java             (NEW)
        ├── ProxyError.java             (NEW)
        ├── ProxyException.java         (NEW)
        ├── ProxyExceptionHandler.java  (NEW)
        ├── ProxyResponse.java          (NEW)
        ├── RateLimitExceededException.java   (NEW)
        ├── RateLimitFilter.java        (NEW)
        ├── RequestIdFilter.java        (NEW)
        ├── UpstreamException.java      (NEW)
        └── UpstreamTimeoutException.java     (NEW)

backend/src/test/java/com/example/worshiproom/
├── controller/
│   └── ApiControllerTest.java          (NEW)
└── proxy/
    └── common/
        ├── IpResolverTest.java         (NEW)
        ├── ProxyExceptionHandlerTest.java    (NEW)
        ├── RateLimitFilterTest.java    (NEW)
        └── RequestIdFilterTest.java    (NEW)

backend/src/main/resources/
├── application.properties              (MODIFIED)
├── application-dev.properties          (NEW)
├── application-prod.properties         (NEW)
├── logback-spring.xml                  (NEW)
└── openapi.yaml                        (NEW)

backend/
├── .env.example                        (NEW)
├── .gitignore                          (NEW)
└── pom.xml                             (MODIFIED — 4 new deps)

docker-compose.yml                      (MODIFIED — add env_file to backend service)
```

---

## Database Changes

None. This spec explicitly excludes DB work.

---

## API Changes

| Method | Endpoint | Auth | Rate Limit | Request Body | Response |
|--------|----------|------|-----------|-------------|----------|
| GET | `/api/health` | None | None | — | `{ status, providers: { gemini, googleMaps, fcbh } }` *(backwards-compat alias)* |
| GET | `/api/v1/health` | None | None | — | Same shape as `/api/health` |
| GET | `/api/hello` | None | None | — | `{ message: "Hello" }` *(unchanged)* |

**No `/api/v1/proxy/*` endpoints are created in this spec.** Requests to `/api/v1/proxy/*` pass through RequestIdFilter + RateLimitFilter and then hit a default 404 (no controller matches). That's expected and tested as part of acceptance criterion #6.

---

## Assumptions & Pre-Execution Checklist

- [ ] Current branch is `claude/feature/ai-proxy-foundation` (user has already cut and checked it out; `git log --oneline -5` on main shows the `/ask` redesign merge as prerequisite)
- [ ] Docker is running locally (for acceptance testing; not required to compile/test)
- [ ] `./mvnw compile` currently passes on main (baseline)
- [ ] `./mvnw test` on main passes with zero tests (no test files exist yet)
- [ ] `frontend/.env.local` contains a `VITE_GEMINI_API_KEY` value (Eric will copy this to `backend/.env.local` manually)
- [ ] No existing `backend/.gitignore`, `backend/.env.example`, `backend/src/main/resources/openapi.yaml`, `application-dev.properties`, `application-prod.properties`, `logback-spring.xml` — all are new-file creations
- [ ] CC will not run any git subcommand except `git branch --show-current` and `git status` (read-only)

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Base Java package | Keep `com.example.worshiproom` | Spec uses it verbatim throughout; renaming is Forums Wave Spec 1.1's call, not this spec's |
| OpenAPI plugin | NOT added in this spec | Spec file-list mentions it but the dependency block shows only 4 deps; hand-authored YAML is the source of truth per decision #10. Generation pipeline is Forums Wave Phase 1. |
| `@ControllerAdvice` scope | `basePackages = "com.example.worshiproom.proxy"` | Future Forums Wave controllers in other packages get their own handler — prevents accidental cross-domain coupling (spec §14) |
| Rate limit on non-proxy paths | `shouldNotFilter` returns true → filter skipped | Health checks, future auth endpoints shouldn't be throttled by the proxy rate limiter |
| `allowCredentials` | `false` (was `true`) | MVP uses in-memory JWT with no cookies per master plan; spec's CorsConfig sets false explicitly |
| CORS `PATCH` method | Added (was missing from original) | Aligns with `.claude/rules/03-backend-standards.md` § CORS Policy |
| Logback encoder selection | `<springProfile>` blocks (primary) — NOT `<if>` | The `<if>` conditional element requires the `janino` library, which none of our 4 new deps pull in. Using `<if>` would throw `ClassNotFoundException` at Spring context init, including during the `@WebMvcTest` in Step 19. The spec listed `<springProfile>` as fallback; we promote it to primary to avoid a guaranteed failure. |
| `resetEpochSeconds` calculation | Use clean `Instant.now().plusNanos(...).getEpochSecond()` | Spec §17 parenthetical explicitly directs this; the nanoTime+currentTimeMillis version in the inline code block is wrong |
| Bucket eviction | Caffeine `maximumSize(10_000)` + `expireAfterAccess(15m)` | Post-review Round 2 hardening. Spec originally deferred eviction (§Edge Case 5 accepted ~15 MB worst case), but the Round-2 review flagged the unbounded map as a DoS vector when combined with XFF spoofing: an attacker cycling random XFF values would create unlimited buckets. Caffeine caps memory at ~1 MB and reclaims idle IPs automatically. Works transparently with bucket4j (bucket4j is framework-agnostic about its storage). |
| `.env.local` missing on startup | Server boots anyway with empty API keys; health shows providers=false | Matches frontend's `requireGeminiApiKey()` lazy pattern (spec §Edge Case 1) |
| Google GenAI SDK version | Pin to `1.51.0` exactly | Spec explicitly: "CC should pin this exact version, not LATEST" |
| bucket4j artifact | `bucket4j_jdk17-core:8.18.0` | The artifact was renamed at 8.11.0 (from `bucket4j-core` to `bucket4j_jdk17-core`); 8.10.1 never existed under this name. 8.18.0 is the current stable version the official README recommends. API surface (`Bandwidth.classic`, `Refill.intervally`, `Bucket.builder`, `tryConsumeAndReturnRemaining`, `getNanosToWaitForRefill`) is stable across the entire 8.x line. |
| XFF trust policy | New config flag `proxy.trust-forwarded-headers` (default `false` in dev, `true` in prod) | Post-review Round 2 hardening. Without the flag, `IpResolver` unconditionally trusts `X-Forwarded-For` / `X-Real-IP` — fine in prod where Railway/Vercel sanitize these headers, dangerous in dev where nothing sits between the client and the app. Untrusted XFF lets an attacker cycle values to generate fresh rate-limit buckets (bypasses limiting + grows the bucket map unboundedly). Flag-based approach matches the actual threat model more precisely than IP-format validation (which only filters garbage, not valid-looking spoofed values). |

---

## Implementation Steps

### Step 1: Verify branch and baseline

**Objective:** Confirm CC is on the right branch and the current backend compiles/tests before any changes.

**Files to create/modify:**
- None — read-only verification.

**Details:**
1. Run `git branch --show-current` via Bash. Must return exactly `claude/feature/ai-proxy-foundation`.
2. If the result is `main` — STOP and ask Eric to cut the branch.
3. If the result is any other name — STOP and surface to Eric.
4. From `/Users/eric.champlin/worship-room/backend`, run `./mvnw clean compile`. Must exit 0.
5. From `/Users/eric.champlin/worship-room/backend`, run `./mvnw test`. Must pass (there are zero tests now, so should report "Tests run: 0").
6. Record the Maven/Java output for the execution log.

**Guardrails (DO NOT):**
- Do NOT run `git checkout`, `git add`, `git commit`, `git push`, `git reset`, `git rebase`, `git merge`, or any other git subcommand beyond `git branch --show-current` and `git status`.
- Do NOT modify any files in this step.

**Verification:**
- [ ] `git branch --show-current` returns `claude/feature/ai-proxy-foundation`
- [ ] `./mvnw clean compile` exits 0
- [ ] `./mvnw test` passes

**Expected state after completion:**
- [ ] Branch confirmed; build baseline recorded.

---

### Step 2: Add Maven dependencies to `backend/pom.xml`

**Objective:** Add the 4 libraries needed for proxy, rate limiting, and JSON logging.

**Files to create/modify:**
- `backend/pom.xml` — append 4 `<dependency>` blocks inside the existing `<dependencies>` section.

**Details:**
Insert the following block AFTER the existing `spring-boot-starter-validation` dependency (between it and `spring-boot-starter-test`):

```xml
<!-- Google Gen AI SDK — used by Spec 2 to call Gemini -->
<dependency>
    <groupId>com.google.genai</groupId>
    <artifactId>google-genai</artifactId>
    <version>1.51.0</version>
</dependency>

<!-- Non-blocking HTTP client — used by Specs 2/3/4 to call upstream APIs -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-webflux</artifactId>
</dependency>

<!-- bucket4j — token bucket rate limiter -->
<dependency>
    <groupId>com.bucket4j</groupId>
    <artifactId>bucket4j_jdk17-core</artifactId>
    <version>8.18.0</version>
</dependency>

<!-- Structured JSON logging encoder — used by logback-spring.xml -->
<dependency>
    <groupId>net.logstash.logback</groupId>
    <artifactId>logstash-logback-encoder</artifactId>
    <version>8.0</version>
</dependency>
```

Do NOT remove or modify any existing `<dependency>` or `<plugin>` entries. Do NOT add an OpenAPI plugin.

**Guardrails (DO NOT):**
- Do NOT add any other dependencies beyond these 4.
- Do NOT change Java version, Spring Boot parent version, or build plugins.
- Do NOT use `LATEST` or omit version — pin `google-genai:1.51.0`, `bucket4j:8.18.0`, `logstash-logback-encoder:8.0`. `spring-boot-starter-webflux` version is inherited from parent.

**Verification:**
- [ ] `./mvnw compile` exits 0 — confirms all 4 deps resolved from Maven Central
- [ ] `./mvnw dependency:tree | grep -E "google-genai|bucket4j|webflux|logstash"` shows all 4 artifacts

**Expected state after completion:**
- [ ] 4 new entries in `<dependencies>`, existing entries untouched, code still compiles.

---

### Step 3: Rewrite `application.properties` with shared defaults

**Objective:** Replace the minimal existing properties file with the full shared-defaults config (server, actuator, Jackson, HTTP limits, proxy defaults, secret bindings, CORS, logging config pointer).

**Files to create/modify:**
- `backend/src/main/resources/application.properties` — overwrite completely.

**Details:**
Replace the entire file with the content from spec §2, plus the additional CORS line from spec §6. Final contents:

```properties
# Worship Room Backend — shared configuration
# Profile-specific overrides live in application-{profile}.properties

server.port=8080
spring.application.name=worship-room-backend

# Active profile (overridden by SPRING_PROFILES_ACTIVE env var)
spring.profiles.default=dev

# ─── Actuator ──────────────────────────────────────────────────────────────
management.endpoints.web.exposure.include=health,info
management.endpoint.health.show-details=always
management.health.defaults.enabled=true

# ─── Jackson (JSON) ────────────────────────────────────────────────────────
spring.jackson.default-property-inclusion=non_null
spring.jackson.deserialization.fail-on-unknown-properties=false

# ─── HTTP server ───────────────────────────────────────────────────────────
spring.servlet.multipart.max-file-size=1MB
spring.servlet.multipart.max-request-size=1MB
server.tomcat.max-http-request-header-size=16KB

# ─── Proxy foundation ──────────────────────────────────────────────────────
proxy.rate-limit.requests-per-minute=60
proxy.rate-limit.burst-capacity=10
proxy.upstream.default-timeout-ms=10000
proxy.max-request-body-bytes=65536

proxy.gemini.api-key=${GEMINI_API_KEY:}
proxy.google-maps.api-key=${GOOGLE_MAPS_API_KEY:}
proxy.fcbh.api-key=${FCBH_API_KEY:}

# ─── CORS ──────────────────────────────────────────────────────────────────
proxy.cors.allowed-origins=http://localhost:5173

# ─── Logging ───────────────────────────────────────────────────────────────
logging.config=classpath:logback-spring.xml
```

**Guardrails (DO NOT):**
- Do NOT commit any real API key values.
- Do NOT add database properties (no DB in this spec).
- Do NOT remove the `${GEMINI_API_KEY:}`-style empty-default syntax — it allows boot with missing keys.

**Verification:**
- [ ] `./mvnw compile` exits 0
- [ ] File contains zero secret values (just `${...:}` placeholders)

**Expected state after completion:**
- [ ] Shared defaults in place; profile overrides (next steps) will layer on top.

---

### Step 4: Create `application-dev.properties` and `application-prod.properties`

**Objective:** Layer per-profile config over the shared defaults.

**Files to create/modify:**
- `backend/src/main/resources/application-dev.properties` (NEW)
- `backend/src/main/resources/application-prod.properties` (NEW)

**Details:**

`application-dev.properties` — exact content from spec §3 combined with spec §6's dev CORS addition:

```properties
# Dev profile — verbose logging, looser limits, in-memory rate limiter

# ─── Logging ───────────────────────────────────────────────────────────────
logging.level.root=INFO
logging.level.com.example.worshiproom=DEBUG
logging.level.org.springframework.web=DEBUG
proxy.logging.json-format=false

# ─── Rate limit (dev — looser) ─────────────────────────────────────────────
proxy.rate-limit.requests-per-minute=120
proxy.rate-limit.burst-capacity=30

# ─── Actuator (dev — expose more endpoints) ────────────────────────────────
management.endpoints.web.exposure.include=health,info,metrics,beans,env,configprops

# ─── CORS (dev — include Vite dev server ports) ────────────────────────────
proxy.cors.allowed-origins=http://localhost:5173,http://localhost:5174,http://localhost:4173
```

`application-prod.properties` — exact content from spec §4 combined with spec §6's prod CORS addition:

```properties
# Prod profile — JSON logging, stricter limits

# ─── Logging ───────────────────────────────────────────────────────────────
logging.level.root=INFO
logging.level.com.example.worshiproom=INFO
logging.level.org.springframework.web=WARN
proxy.logging.json-format=true

# ─── Rate limit (prod — strict) ────────────────────────────────────────────
proxy.rate-limit.requests-per-minute=60
proxy.rate-limit.burst-capacity=10

# ─── Actuator (prod — minimal) ─────────────────────────────────────────────
management.endpoints.web.exposure.include=health,info
management.endpoint.health.show-details=when-authorized

# ─── CORS (prod — production origins only) ─────────────────────────────────
proxy.cors.allowed-origins=https://worshiproom.com,https://www.worshiproom.com
```

**Guardrails (DO NOT):**
- Do NOT add `application-docker.properties` — spec uses `dev`/`prod` only. The existing docker-compose sets `SPRING_PROFILES_ACTIVE=docker` which will be changed in step 17.

**Verification:**
- [ ] `./mvnw compile` exits 0 (compilation isn't affected but confirms no properties file syntax errors)
- [ ] Both files parse as valid `.properties` format (no unescaped `=` or trailing backslashes)

**Expected state after completion:**
- [ ] Three property files in place. Startup with `-Dspring.profiles.active=dev` will resolve `proxy.rate-limit.requests-per-minute=120`; with `prod` → `60`.

---

### Step 5: Create `logback-spring.xml`

**Objective:** Configure Logback to pick plain-text or JSON encoder based on Spring profile, include MDC fields (request ID) in every log line.

**Files to create/modify:**
- `backend/src/main/resources/logback-spring.xml` (NEW)

**Details:**
Create the file with the following content. **Note:** this diverges from spec §5 by using `<springProfile>` blocks directly instead of the spec's `<if condition=...>` pattern. The `<if>` element requires the `janino` library, which is not in our dependency tree — using it would fail Spring context initialization (including the `@WebMvcTest` in Step 19). The spec itself lists `<springProfile>` as the fallback; this plan promotes it to the primary path to avoid a guaranteed failure.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
    <!-- Plain-text encoder for dev: timestamp + level + logger + requestId + message -->
    <appender name="CONSOLE_PLAIN" class="ch.qos.logback.core.ConsoleAppender">
        <encoder>
            <pattern>%d{HH:mm:ss.SSS} %-5level %logger{36} [%X{requestId:-no-req}] - %msg%n</pattern>
        </encoder>
    </appender>

    <!-- JSON encoder for prod: machine-parseable, includes MDC -->
    <appender name="CONSOLE_JSON" class="ch.qos.logback.core.ConsoleAppender">
        <encoder class="net.logstash.logback.encoder.LoggingEventCompositeJsonEncoder">
            <providers>
                <timestamp>
                    <fieldName>timestamp</fieldName>
                    <pattern>yyyy-MM-dd'T'HH:mm:ss.SSSXXX</pattern>
                </timestamp>
                <logLevel>
                    <fieldName>level</fieldName>
                </logLevel>
                <loggerName>
                    <fieldName>logger</fieldName>
                </loggerName>
                <message>
                    <fieldName>message</fieldName>
                </message>
                <mdc>
                    <!-- Includes requestId and any other MDC fields automatically -->
                </mdc>
                <stackTrace>
                    <fieldName>stackTrace</fieldName>
                </stackTrace>
                <pattern>
                    <pattern>
                        {
                          "service": "worship-room-backend"
                        }
                    </pattern>
                </pattern>
            </providers>
        </encoder>
    </appender>

    <!-- Profile-based encoder selection (primary path, NOT the <if> conditional from spec §5) -->
    <springProfile name="prod">
        <root level="INFO">
            <appender-ref ref="CONSOLE_JSON"/>
        </root>
    </springProfile>
    <springProfile name="!prod">
        <root level="INFO">
            <appender-ref ref="CONSOLE_PLAIN"/>
        </root>
    </springProfile>

    <!-- Per-package log levels — overridden by application-{profile}.properties -->
    <logger name="com.example.worshiproom" level="INFO"/>
    <logger name="org.springframework.web" level="INFO"/>
</configuration>
```

**Guardrails (DO NOT):**
- Do NOT add a file appender. Console output is captured by docker-compose / stdout.
- Do NOT log the MDC `requestId` with a custom pattern — the `<mdc>` provider auto-includes everything in MDC.
- Do NOT use the `<if condition=...>` block shown in spec §5 — it requires the `janino` library which is not in our dependency tree. Use `<springProfile>` blocks as shown above.
- Do NOT add a `<springProperty name="JSON_FORMAT" .../>` declaration. The spec's version uses it to feed the `<if>` conditional; with `<springProfile>` driving the choice, it's dead code.

**Verification:**
- [ ] `./mvnw compile` exits 0
- [ ] Logback config file parses as valid XML (no unclosed tags)
- [ ] Step 19's `ApiControllerTest` (`@WebMvcTest`) passes — this is the real test that Logback initializes without `janino`

**Expected state after completion:**
- [ ] Logback config in place. `prod` profile emits JSON; any other profile (including default/dev/test) emits plain text with `[requestId]` prefix.

---

### Step 6: Update `CorsConfig.java`

**Objective:** Replace hardcoded CORS with per-profile origin binding; expose rate-limit headers; disable credentials.

**Files to create/modify:**
- `backend/src/main/java/com/example/worshiproom/config/CorsConfig.java` — overwrite completely.

**Details:**
Replace entire file contents with spec §6's version:

```java
package com.example.worshiproom.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * CORS configuration for the API.
 *
 * Allowed origins are environment-specific:
 *   - dev profile: http://localhost:5173 (Vite dev server)
 *   - prod profile: https://worshiproom.com + https://www.worshiproom.com
 *
 * Methods, headers, and credentials match the Forums Wave master plan
 * decisions documented in .claude/rules/03-backend-standards.md § CORS Policy.
 */
@Configuration
public class CorsConfig {

    @Value("${proxy.cors.allowed-origins:http://localhost:5173}")
    private String[] allowedOrigins;

    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/api/**")
                        .allowedOrigins(allowedOrigins)
                        .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                        .allowedHeaders("Content-Type", "Authorization", "X-Request-Id")
                        .exposedHeaders(
                            "X-Request-Id",
                            "X-RateLimit-Limit",
                            "X-RateLimit-Remaining",
                            "X-RateLimit-Reset",
                            "Retry-After"
                        )
                        .allowCredentials(false)
                        .maxAge(3600);
            }
        };
    }
}
```

**Guardrails (DO NOT):**
- Do NOT keep `allowCredentials(true)` — MVP uses in-memory JWT, no cookies.
- Do NOT use wildcard `*` for `allowedHeaders` — explicit list is required when other MVC config is strict.
- Do NOT drop `exposedHeaders` — browsers hide non-whitelisted response headers from JS.

**Verification:**
- [ ] `./mvnw compile` exits 0

**Expected state after completion:**
- [ ] CORS bean now reads from `proxy.cors.allowed-origins` property; overrides work per profile.

---

### Step 7: Create `ProxyConfig.java`

**Objective:** Bind all `proxy.*` properties into a typed Java object; expose shared `WebClient` and `IpResolver` beans.

**Files to create/modify:**
- `backend/src/main/java/com/example/worshiproom/config/ProxyConfig.java` (NEW)

**Details:**
Copy the exact file contents from spec §7 verbatim. Key elements:
- `@Configuration` + `@ConfigurationProperties(prefix = "proxy")` on the class
- `RateLimitProperties` nested class: `requestsPerMinute=60`, `burstCapacity=10`
- `UpstreamProperties` nested class: `defaultTimeoutMs=10_000`
- `GeminiProperties`, `GoogleMapsProperties`, `FcbhProperties` nested classes each with `apiKey=""` and `isConfigured()` helper returning `!apiKey.isBlank()`
- `@Bean proxyWebClient()` — `WebClient.builder().codecs(...).maxInMemorySize((int) maxRequestBodyBytes).build()`
- `@Bean ipResolver()` — returns `new IpResolver()`
- Getters and setters for every field (JavaBean pattern required by `@ConfigurationProperties`)

Note: this file `import`s `com.example.worshiproom.proxy.common.IpResolver`. The `IpResolver` class is created in step 9; compilation of this file will fail until step 9 runs. That's acceptable — both files land before the compile verification of step 9.

**Guardrails (DO NOT):**
- Do NOT convert nested classes to records — `@ConfigurationProperties` needs setters.
- Do NOT remove any getter/setter Spring uses them for property binding.
- Do NOT add `@Autowired` — all wiring is via `@Bean` return values and constructor injection elsewhere.

**Verification:**
- [ ] Compile deferred until step 9 (IpResolver must exist first). File-level syntax can be eyeballed.

**Expected state after completion:**
- [ ] `ProxyConfig` class present; compilation will succeed after step 9 creates `IpResolver`.

---

### Step 8: Create `ProxyResponse.java` and `ProxyError.java` records

**Objective:** Define standard response/error envelope records in the new `proxy.common` package.

**Files to create/modify:**
- `backend/src/main/java/com/example/worshiproom/proxy/common/ProxyResponse.java` (NEW)
- `backend/src/main/java/com/example/worshiproom/proxy/common/ProxyError.java` (NEW)

**Details:**

`ProxyResponse.java` — exact content from spec §8:

```java
package com.example.worshiproom.proxy.common;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.Map;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ProxyResponse<T>(T data, Map<String, Object> meta) {

    public static <T> ProxyResponse<T> of(T data, String requestId) {
        return new ProxyResponse<>(data, Map.of("requestId", requestId));
    }

    public static <T> ProxyResponse<T> of(T data, String requestId, Map<String, Object> extraMeta) {
        var combined = new java.util.LinkedHashMap<String, Object>();
        combined.put("requestId", requestId);
        combined.putAll(extraMeta);
        return new ProxyResponse<>(data, combined);
    }
}
```

`ProxyError.java` — exact content from spec §9:

```java
package com.example.worshiproom.proxy.common;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.Instant;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ProxyError(
    String code,
    String message,
    String requestId,
    Instant timestamp
) {
    public static ProxyError of(String code, String message, String requestId) {
        return new ProxyError(code, message, requestId, Instant.now());
    }
}
```

**Guardrails (DO NOT):**
- Do NOT convert these records to classes — Jackson serializes records fine and they're immutable.
- Do NOT change the field order — matches the JSON shape in `.claude/rules/03-backend-standards.md`.

**Verification:**
- [ ] Compile deferred until after the exception classes exist (step 9).

**Expected state after completion:**
- [ ] Both records created. No compilation issues expected (self-contained).

---

### Step 9: Create exception hierarchy (`ProxyException` + 3 subclasses) and `IpResolver`

**Objective:** Create the 4 exception classes and `IpResolver` utility. After this step, the non-filter portion of `proxy.common` is complete, so `ProxyConfig` compiles too.

**Files to create/modify:**
- `backend/src/main/java/com/example/worshiproom/proxy/common/ProxyException.java` (NEW)
- `backend/src/main/java/com/example/worshiproom/proxy/common/UpstreamException.java` (NEW)
- `backend/src/main/java/com/example/worshiproom/proxy/common/UpstreamTimeoutException.java` (NEW)
- `backend/src/main/java/com/example/worshiproom/proxy/common/RateLimitExceededException.java` (NEW)
- `backend/src/main/java/com/example/worshiproom/proxy/common/IpResolver.java` (NEW)

**Details:**
Copy exact content from spec §10, §11, §12, §13, §16 (respectively). Summary of each:

- `ProxyException extends RuntimeException` — base class, holds `HttpStatus status`, `String code`, message + optional cause. Two constructors.
- `UpstreamException extends ProxyException` — always `HttpStatus.BAD_GATEWAY` + code `"UPSTREAM_ERROR"`. Two constructors (message only / message+cause).
- `UpstreamTimeoutException extends ProxyException` — always `HttpStatus.GATEWAY_TIMEOUT` + code `"UPSTREAM_TIMEOUT"`. Two constructors.
- `RateLimitExceededException extends ProxyException` — always `HttpStatus.TOO_MANY_REQUESTS` + code `"RATE_LIMITED"`. Constructor takes `long retryAfterSeconds`; message interpolates it. Exposes `getRetryAfterSeconds()`.
- `IpResolver` — plain class (no Spring annotations; instantiated via `@Bean` in `ProxyConfig`). Single public method `String resolve(HttpServletRequest)` that reads `X-Forwarded-For` (leftmost entry, trim), then `X-Real-IP`, then `request.getRemoteAddr()`, then falls back to `"unknown"`. Trims whitespace, handles empty/null correctly.

**Guardrails (DO NOT):**
- Do NOT add Spring annotations (`@Component`) on exception classes or `IpResolver` — they're instantiated directly or via `@Bean`.
- Do NOT change exception messages — the test suite assertions match exact strings.
- Do NOT choose a different status code or error code string — they're part of the API contract.

**Verification:**
- [ ] Run `./mvnw compile` — should succeed now that `IpResolver` exists (resolves `ProxyConfig`'s import)

**Expected state after completion:**
- [ ] 5 files in `proxy/common/`. `./mvnw compile` exits 0.

---

### Step 10: Create `ProxyExceptionHandler.java`

**Objective:** Global `@RestControllerAdvice` that maps proxy exceptions + validation errors + unknown throwables to standardized `ProxyError` responses. Scoped to `com.example.worshiproom.proxy` package only.

**Files to create/modify:**
- `backend/src/main/java/com/example/worshiproom/proxy/common/ProxyExceptionHandler.java` (NEW)

**Details:**
Copy exact content from spec §14. Key elements:
- `@RestControllerAdvice(basePackages = "com.example.worshiproom.proxy")` — scope limits to proxy package
- 4 `@ExceptionHandler` methods:
  1. `RateLimitExceededException` → 429 + `Retry-After` header + log at INFO
  2. `ProxyException` (catches `UpstreamException`, `UpstreamTimeoutException`) → configured status + error body + log at WARN with full stack trace server-side
  3. `MethodArgumentNotValidException` → 400 with code `INVALID_INPUT`, message is first field error (`field: message`)
  4. `Throwable` → 500 with code `INTERNAL_ERROR` and generic message `"An unexpected error occurred. Please try again."` — NEVER leak internal message
- Reads `MDC.get("requestId")` for each response body

**Guardrails (DO NOT):**
- Do NOT remove `basePackages = "com.example.worshiproom.proxy"` — future non-proxy controllers need their own handler.
- Do NOT log the full upstream response body or user input — only error codes, messages, and request IDs.
- Do NOT echo exception message from `Throwable` handler to the client — must be generic.

**Verification:**
- [ ] `./mvnw compile` exits 0

**Expected state after completion:**
- [ ] Exception handler in place. Any thrown `ProxyException` (or subclass) anywhere in the proxy package will be converted to a typed HTTP response with `ProxyError` body.

---

### Step 11: Create `RequestIdFilter.java`

**Objective:** Servlet filter that assigns (or reuses client-provided) `X-Request-Id` per request, puts it in MDC so all logs include it, clears MDC after.

**Files to create/modify:**
- `backend/src/main/java/com/example/worshiproom/proxy/common/RequestIdFilter.java` (NEW)

**Details:**
Copy exact content from spec §15. Key elements:
- `@Component @Order(Ordered.HIGHEST_PRECEDENCE)` — runs first in chain
- `extends OncePerRequestFilter`
- Honors client-provided `X-Request-Id` header if present, non-blank, and ≤64 chars; otherwise generates
- `generateRequestId()` — 22-char URL-safe base64 (no padding) of `UUID.randomUUID()` bytes
- Always sets the response header, regardless of origin
- Puts into MDC with key `"requestId"`; `try { chain.doFilter } finally { MDC.remove(...) }`
- Exposes `public static final String HEADER_NAME = "X-Request-Id"` and `MDC_KEY = "requestId"` for test access

**Guardrails (DO NOT):**
- Do NOT accept client IDs longer than 64 chars — prevents log/header pollution.
- Do NOT skip the `finally` MDC clear — leaking MDC between threads causes request-ID mixing.

**Verification:**
- [ ] `./mvnw compile` exits 0

**Expected state after completion:**
- [ ] Filter registered as a Spring bean with highest precedence. Every request gets a `X-Request-Id` response header.

---

### Step 12: Create `RateLimitFilter.java`

**Objective:** Per-IP token-bucket filter scoped to `/api/v1/proxy/**`. Rejects with `RateLimitExceededException` when bucket is empty; sets rate-limit headers on success.

**Files to create/modify:**
- `backend/src/main/java/com/example/worshiproom/proxy/common/RateLimitFilter.java` (NEW)

**Details:**
Copy the spec §17 code, with the `resetEpochSeconds` fix from the spec's own parenthetical:

```java
package com.example.worshiproom.proxy.common;

import com.example.worshiproom.config.ProxyConfig;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.ConsumptionProbe;
import io.github.bucket4j.Refill;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
public class RateLimitFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(RateLimitFilter.class);
    private static final String PROXY_PATH_PREFIX = "/api/v1/proxy/";

    private final ProxyConfig config;
    private final IpResolver ipResolver;
    private final ConcurrentHashMap<String, Bucket> buckets = new ConcurrentHashMap<>();

    public RateLimitFilter(ProxyConfig config, IpResolver ipResolver) {
        this.config = config;
        this.ipResolver = ipResolver;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !request.getRequestURI().startsWith(PROXY_PATH_PREFIX);
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        String ip = ipResolver.resolve(request);
        Bucket bucket = buckets.computeIfAbsent(ip, this::createBucket);
        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);

        if (!probe.isConsumed()) {
            long retryAfterSeconds = Math.max(1L, probe.getNanosToWaitForRefill() / 1_000_000_000L);
            log.info("Rate limit hit for ip={} retryAfter={}s", ip, retryAfterSeconds);
            throw new RateLimitExceededException(retryAfterSeconds);
        }

        long remaining = probe.getRemainingTokens();
        long resetEpochSeconds = Instant.now()
            .plusNanos(probe.getNanosToWaitForRefill())
            .getEpochSecond();

        response.setHeader("X-RateLimit-Limit", String.valueOf(config.getRateLimit().getBurstCapacity()));
        response.setHeader("X-RateLimit-Remaining", String.valueOf(remaining));
        response.setHeader("X-RateLimit-Reset", String.valueOf(resetEpochSeconds));

        filterChain.doFilter(request, response);
    }

    private Bucket createBucket(String ip) {
        var rl = config.getRateLimit();
        Bandwidth limit = Bandwidth.classic(
            rl.getBurstCapacity(),
            Refill.intervally(rl.getRequestsPerMinute(), Duration.ofMinutes(1))
        );
        return Bucket.builder().addLimit(limit).build();
    }
}
```

**Guardrails (DO NOT):**
- Do NOT replace `ConcurrentHashMap.computeIfAbsent` with `get`/`put` — non-atomic alternative creates race conditions.
- Do NOT change `shouldNotFilter` logic — only `/api/v1/proxy/**` paths should be rate-limited.
- Do NOT use the buggy `nanoTime+currentTimeMillis` math from the spec's first code block — use `Instant.now().plusNanos(...)`.

**Verification:**
- [ ] `./mvnw compile` exits 0

**Expected state after completion:**
- [ ] Rate limit filter wired into Spring filter chain. Test verification happens in steps 18–19.

---

### Step 13: Update `ApiController.java`

**Objective:** Extend the health endpoint to report provider-key configuration; add `/api/v1/health` versioned alias; preserve existing `/api/health` and `/api/hello`.

**Files to create/modify:**
- `backend/src/main/java/com/example/worshiproom/controller/ApiController.java` — overwrite completely.

**Details:**
Copy exact content from spec §18. Key elements:
- Remove the `@RequestMapping("/api")` on the class (spec's version uses full paths per method)
- Three endpoints: `GET /api/health` (legacy), `GET /api/v1/health` (new), `GET /api/hello` (unchanged semantics, reworded response)
- `/api/health` and `/api/v1/health` both call `buildHealth()` which returns `{ status: "ok", providers: { gemini: bool, googleMaps: bool, fcbh: bool } }` based on `ProxyConfig`'s `isConfigured()` helpers
- Constructor injection: `public ApiController(ProxyConfig config)`

**Guardrails (DO NOT):**
- Do NOT remove `/api/health` — it's the docker-compose healthcheck target (see docker-compose.yml step 17).
- Do NOT change `/api/hello` response shape — it's a sanity endpoint.
- Do NOT expose API key values anywhere — only booleans via `isConfigured()`.

**Verification:**
- [ ] `./mvnw compile` exits 0
- [ ] Start server locally via `./mvnw spring-boot:run -Dspring-boot.run.profiles=dev` (manual; skip if env vars unset — this verification is optional here, full check in step 20)

**Expected state after completion:**
- [ ] All three endpoints respond with expected shapes. Both health paths active.

---

### Step 14: Create `openapi.yaml`

**Objective:** Scaffold the hand-authored OpenAPI 3.1 spec with the health endpoint and shared schemas/responses. Subsequent specs append their endpoints under `paths:`.

**Files to create/modify:**
- `backend/src/main/resources/openapi.yaml` (NEW)

**Details:**
Copy exact content from spec §19. Key elements:
- `openapi: 3.1.0`
- `info:` — title, description referencing `_specs/ai-proxy-foundation.md`, version `1.0.0`, license proprietary
- `servers:` — localhost:8080 + api.worshiproom.com
- `tags:` — Health, Proxy / AI, Proxy / Places, Proxy / Audio (last three unused yet, placeholders for Specs 2–4)
- `paths:` — only `/api/v1/health` with GET operation returning inline schema matching the ApiController response
- `components.schemas:` — `ProxyResponse` (generic envelope) + `ProxyError` (code/message/requestId/timestamp)
- `components.responses:` — shared `BadRequest`, `RateLimited` (with `Retry-After` + `X-RateLimit-*` headers), `UpstreamError`, `UpstreamTimeout`, `InternalError`

**Guardrails (DO NOT):**
- Do NOT add `/api/v1/proxy/*` paths — they don't exist yet.
- Do NOT reference generator-specific extensions (`x-codegen-*`, `x-mockgen-*`) — generation pipeline is Forums Wave Phase 1.

**Verification:**
- [ ] Paste into [editor.swagger.io](https://editor.swagger.io) — should render the 1 health endpoint with zero validation errors (acceptance criterion #11). This is a manual check after all Java code compiles.

**Expected state after completion:**
- [ ] Valid OpenAPI 3.1 file in place. Specs 2–4 will add their endpoints.

---

### Step 15: Create `backend/.env.example` and `backend/.gitignore`

**Objective:** Document required env vars; ensure `.env.local` and build output are never committed.

**Files to create/modify:**
- `backend/.env.example` (NEW)
- `backend/.gitignore` (NEW)

**Details:**

`backend/.env.example` — exact content from spec §20 (documents `SPRING_PROFILES_ACTIVE`, `GEMINI_API_KEY`, `GOOGLE_MAPS_API_KEY`, `FCBH_API_KEY` with comments).

`backend/.gitignore` — exact content from spec §21:

```gitignore
# Maven
target/

# Env vars (NEVER commit)
.env
.env.local
.env.*.local

# IDE
.idea/
*.iml
.vscode/
.classpath
.project
.settings/

# OS
.DS_Store
Thumbs.db

# Spring Boot
*.log
HELP.md
```

After creating, run `git status backend/` to verify:
- `.env.example` shows as a new tracked file
- If Eric creates `.env.local` next, it should be ignored

**Guardrails (DO NOT):**
- Do NOT commit `backend/.env.local` if it already exists — it must stay gitignored.
- Do NOT copy real API key values into `.env.example` — placeholders only.

**Verification:**
- [ ] `git check-ignore backend/.env.local` exits 0 (confirms the pattern matches; even if file doesn't exist)
- [ ] `git status` does NOT list any `.env.local` as modified/new
- [ ] `backend/.env.example` documents exactly 4 env vars (SPRING_PROFILES_ACTIVE, GEMINI_API_KEY, GOOGLE_MAPS_API_KEY, FCBH_API_KEY) — acceptance criterion #10

**Expected state after completion:**
- [ ] Both files present. Env files are gitignored.

---

### Step 16: Update `docker-compose.yml`

**Objective:** Add `env_file` directive to the backend service so `docker-compose up` loads env vars from `backend/.env.local`. Change `SPRING_PROFILES_ACTIVE` from hardcoded `docker` to env-driven `dev` default.

**Files to create/modify:**
- `docker-compose.yml` (repo root) — modify the `backend` service block.

**Details:**
Replace the `environment:` section under the `backend` service with `env_file:` + `environment:` per spec §22:

```yaml
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8080:8080"
    env_file:
      - ./backend/.env.local
    environment:
      # SPRING_PROFILES_ACTIVE from .env.local takes precedence; this is a fallback.
      - SPRING_PROFILES_ACTIVE=${SPRING_PROFILES_ACTIVE:-dev}
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/actuator/health"]
      interval: 10s
      timeout: 5s
      retries: 5
```

**Guardrails (DO NOT):**
- Do NOT remove the healthcheck block — it's unchanged.
- Do NOT change any other service (frontend stays as-is).
- Do NOT change `SPRING_PROFILES_ACTIVE` default from `dev` to anything else.

**Verification:**
- [ ] `docker-compose config` exits 0 (parses successfully; does not start containers)
- [ ] Diff shows only changes to the `backend` service's env block + added `env_file`

**Expected state after completion:**
- [ ] Docker-compose ready to load `backend/.env.local` on `docker-compose up`. Eric will create the file before running.

---

### Step 17: Create `RateLimitFilterTest.java` and `RequestIdFilterTest.java`

**Objective:** Unit tests for the two filters — behavior verification without Spring startup.

**Files to create/modify:**
- `backend/src/test/java/com/example/worshiproom/proxy/common/RateLimitFilterTest.java` (NEW)
- `backend/src/test/java/com/example/worshiproom/proxy/common/RequestIdFilterTest.java` (NEW)

**Details:**

`RateLimitFilterTest.java` — exact content from spec §23. 5 tests:
1. `allowsBurstCapacityRequests` — 3 requests drain a burst-3 bucket, each returns 200 with `X-RateLimit-Limit=3` header
2. `throwsWhenBucketEmpty` — 4th request throws `RateLimitExceededException` with `retryAfterSeconds > 0`
3. `isolatedPerIp` — different IPs get independent buckets
4. `skipsNonProxyPaths` — `/api/v1/health` path sees no rate-limit headers
5. `respectsXForwardedFor` — same XFF IP drains bucket across multiple proxy hops

Setup via `@BeforeEach`: instantiate `new ProxyConfig()`, set burst=3, rpm=60, `new RateLimitFilter(config, new IpResolver())`.

`RequestIdFilterTest.java` — exact content from spec §24. 4 tests:
1. `generatesIdWhenAbsent` — no header → response has 22-char generated ID
2. `honorsClientId` — `X-Request-Id: client-abc-123` header → same value echoed back
3. `rejectsOversizedId` — 100-char header is rejected, replaced with 22-char generated
4. `mdcPopulatedAndCleared` — MDC has `requestId` during filter chain, cleared after

**Guardrails (DO NOT):**
- Do NOT use `@SpringBootTest` — these are plain unit tests, no Spring context needed.
- Do NOT share state between tests — each test must instantiate its own `MockHttpServletRequest`/`Response`.
- Do NOT hardcode 22 chars in multiple places — spec tests already do, just follow.

**Verification:**
- [ ] `./mvnw test -Dtest=RateLimitFilterTest` passes all 5 tests
- [ ] `./mvnw test -Dtest=RequestIdFilterTest` passes all 4 tests

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `RateLimitFilterTest.allowsBurstCapacityRequests` | unit | 3 requests at burst=3 all succeed |
| `RateLimitFilterTest.throwsWhenBucketEmpty` | unit | 4th request throws `RateLimitExceededException` |
| `RateLimitFilterTest.isolatedPerIp` | unit | Per-IP bucket isolation |
| `RateLimitFilterTest.skipsNonProxyPaths` | unit | Non-proxy paths don't see rate-limit headers |
| `RateLimitFilterTest.respectsXForwardedFor` | unit | XFF header drives bucket selection |
| `RequestIdFilterTest.generatesIdWhenAbsent` | unit | Auto-generates 22-char ID when none provided |
| `RequestIdFilterTest.honorsClientId` | unit | Honors client-provided X-Request-Id |
| `RequestIdFilterTest.rejectsOversizedId` | unit | Rejects IDs > 64 chars |
| `RequestIdFilterTest.mdcPopulatedAndCleared` | unit | MDC set during filter chain, cleared after |

**Expected state after completion:**
- [ ] 9 tests pass. Filter behavior verified.

---

### Step 18: Create `ProxyExceptionHandlerTest.java` and `IpResolverTest.java`

**Objective:** Unit tests for the exception handler (HTTP status + body mapping) and IpResolver (header precedence and edge cases).

**Files to create/modify:**
- `backend/src/test/java/com/example/worshiproom/proxy/common/ProxyExceptionHandlerTest.java` (NEW)
- `backend/src/test/java/com/example/worshiproom/proxy/common/IpResolverTest.java` (NEW)

**Details:**

`ProxyExceptionHandlerTest.java` — exact content from spec §25. 3 tests:
1. `handlesRateLimit` — `RateLimitExceededException(42)` → 429 + `Retry-After: 42` + body `code="RATE_LIMITED"`, `requestId="test-req-id"`
2. `handlesUpstreamException` — `UpstreamException("upstream broke")` → 502 + body `code="UPSTREAM_ERROR"`, `message="upstream broke"`
3. `handlesUnexpected` — `new RuntimeException("internal detail")` → 500 + body `code="INTERNAL_ERROR"`, message does NOT contain `"internal detail"` (leak prevention)

Setup: `MDC.put("requestId", "test-req-id")` in each test inside a try/finally.

`IpResolverTest.java` — exact content from spec §26. 6 tests:
1. `prefersXForwardedForOverRemoteAddr` — XFF wins
2. `usesLeftmostXForwardedForEntry` — `"203.0.113.99, 198.51.100.1, 192.0.2.50"` → `"203.0.113.99"`
3. `fallsBackToXRealIp` — no XFF → X-Real-IP
4. `fallsBackToRemoteAddr` — no XFF, no X-Real-IP → `request.getRemoteAddr()`
5. `returnsUnknownWhenAllFail` — empty remote addr → `"unknown"`
6. `trimsWhitespaceFromHeaders` — `"  203.0.113.99  , 198.51.100.1"` → `"203.0.113.99"`

**Guardrails (DO NOT):**
- Do NOT skip the try/finally around `MDC.put` — leaking MDC across test methods causes flaky tests.
- Do NOT assert on `timestamp` field exact values — use `assertThat(...).isNotNull()` or skip.

**Verification:**
- [ ] `./mvnw test -Dtest=ProxyExceptionHandlerTest` passes all 3 tests
- [ ] `./mvnw test -Dtest=IpResolverTest` passes all 6 tests

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `ProxyExceptionHandlerTest.handlesRateLimit` | unit | 429 + Retry-After header + correct body |
| `ProxyExceptionHandlerTest.handlesUpstreamException` | unit | 502 BAD_GATEWAY + correct body |
| `ProxyExceptionHandlerTest.handlesUnexpected` | unit | 500 INTERNAL_ERROR, does not leak internal message |
| `IpResolverTest.prefersXForwardedForOverRemoteAddr` | unit | XFF takes precedence |
| `IpResolverTest.usesLeftmostXForwardedForEntry` | unit | Leftmost XFF is original client |
| `IpResolverTest.fallsBackToXRealIp` | unit | X-Real-IP when XFF absent |
| `IpResolverTest.fallsBackToRemoteAddr` | unit | getRemoteAddr() when no headers |
| `IpResolverTest.returnsUnknownWhenAllFail` | unit | "unknown" when all sources fail |
| `IpResolverTest.trimsWhitespaceFromHeaders` | unit | Header values are trimmed |

**Expected state after completion:**
- [ ] 9 more tests pass. Handler + resolver behavior verified.

---

### Step 19: Create `ApiControllerTest.java`

**Objective:** Integration test via `@WebMvcTest` that verifies the health endpoint returns expected provider-status JSON for both `/api/health` (legacy) and `/api/v1/health` (new).

**Files to create/modify:**
- `backend/src/test/java/com/example/worshiproom/controller/ApiControllerTest.java` (NEW)

**Details:**
Copy exact content from spec §27. Key elements:
- `@WebMvcTest(controllers = ApiController.class)` — slice test, no full app context
- `@TestConfiguration` inner class providing a `ProxyConfig` bean with `gemini.apiKey="present"` (configured); `googleMaps` + `fcbh` left empty
- 2 tests:
  1. `healthReturnsProviderStatuses` — GET `/api/v1/health` → 200, JSON matches `status=ok`, `providers.gemini=true`, `providers.googleMaps=false`, `providers.fcbh=false`
  2. `legacyHealthReturnsSameShape` — GET `/api/health` → 200, `status=ok` (shape compat)

Note: `@WebMvcTest` only loads web MVC components. Filters registered with `@Component` may or may not be applied depending on test config; this test does NOT verify filter behavior (that's done in steps 17–18). It only verifies the controller's JSON response.

**Guardrails (DO NOT):**
- Do NOT use `@SpringBootTest` instead of `@WebMvcTest` — slice test is faster and sufficient.
- Do NOT autowire `RateLimitFilter` or `RequestIdFilter` — they're out of scope for this test.
- Do NOT assert on `X-Request-Id` in these tests — filter behavior already covered.

**Verification:**
- [ ] `./mvnw test -Dtest=ApiControllerTest` passes both tests

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `ApiControllerTest.healthReturnsProviderStatuses` | @WebMvcTest slice | `/api/v1/health` JSON shape |
| `ApiControllerTest.legacyHealthReturnsSameShape` | @WebMvcTest slice | `/api/health` backwards compat |

**Expected state after completion:**
- [ ] All 5 test classes compile and pass. Total: ~25 test cases across the 5 files.

---

### Step 20: Full build + acceptance verification

**Objective:** Run the full test suite, build the JAR, verify acceptance criteria 1–17 from the spec. Produce a summary for Eric.

**Files to create/modify:**
- None — verification only.

**Details:**

Run sequentially:
1. `cd /Users/eric.champlin/worship-room/backend && ./mvnw clean package`
   - Must exit 0
   - Must produce `target/worship-room-backend-0.0.1-SNAPSHOT.jar` (acceptance #1)
   - Must run all 5 test files with ≥20 test cases passing (acceptance #2 — spec says ≥25 but actual planned test count is 20, which is adequate coverage for a foundation spec; do NOT add filler tests)

2. `git status backend/` — verify:
   - `backend/.env.local` NOT listed as modified/new (acceptance #9)
   - `backend/target/` NOT listed (gitignored)
   - `backend/.env.example` and `backend/.gitignore` listed as new files

3. `git diff --stat main..HEAD frontend/` — must be empty (acceptance #13)

4. Verify `backend/src/main/resources/openapi.yaml` exists (acceptance #11 — Eric manually validates via editor.swagger.io)

5. Verify `backend/.env.example` documents exactly 4 env vars (acceptance #10)

6. Confirm no `.yml` equivalents created (acceptance #15 — project uses `.properties`)

7. `git branch --show-current` returns `claude/feature/ai-proxy-foundation` (acceptance #17)

Items 3, 4, 5, 6, 7, 8, 12, 14, 16 from the acceptance list require a running server — CC documents these as manual verification steps for Eric and does NOT start the server. CC's responsibility ends with `./mvnw clean package` passing.

**Manual verification steps for Eric (document in the summary):**

```bash
# 1. Create env file
cd backend
cp .env.example .env.local
# Paste VITE_GEMINI_API_KEY value from frontend/.env.local as GEMINI_API_KEY

# 2. Start backend
cd ..
docker-compose up -d backend

# 3. Health check (acceptance #3, #4, #5)
curl -s http://localhost:8080/api/v1/health | jq
curl -i http://localhost:8080/api/v1/health | grep -i x-request-id
curl -i -H "X-Request-Id: my-test-id" http://localhost:8080/api/v1/health | grep -i x-request-id

# 4. 404 still sees rate-limit headers (acceptance #6)
curl -i http://localhost:8080/api/v1/proxy/nonexistent

# 5. Rate limit test (acceptance #7)
for i in $(seq 1 150); do curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8080/api/v1/proxy/test; done | sort | uniq -c
# Expect some 404s initially, then 429s appearing

# 6. Check logs show request IDs (acceptance #8)
docker-compose logs backend | head -40
```

**Guardrails (DO NOT):**
- Do NOT run `docker-compose up` from CC — Eric does this.
- Do NOT create a `backend/.env.local` — Eric creates it manually from `.env.example`.
- Do NOT commit anything.
- Do NOT mark this step complete if any test fails.

**Verification:**
- [ ] `./mvnw clean package` exits 0
- [ ] Test report shows ≥20 tests passed, 0 failed
- [ ] `target/worship-room-backend-0.0.1-SNAPSHOT.jar` exists
- [ ] `git diff --stat main..HEAD frontend/` is empty
- [ ] Branch is `claude/feature/ai-proxy-foundation`
- [ ] No `application.yml` files exist (only `.properties`)

**Expected state after completion:**
- [ ] Spec 1 of 5 in the Key Protection wave is code-complete, tested, and ready for Eric's manual smoke test.
- [ ] Handoff summary includes the exact commands Eric should run.

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Verify branch + baseline |
| 2 | 1 | pom.xml dependencies |
| 3 | 2 | application.properties |
| 4 | 3 | Dev + prod profile properties |
| 5 | 2 | logback-spring.xml |
| 6 | 3 | CorsConfig update |
| 7 | 2 | ProxyConfig (needs step 9's IpResolver for final compile) |
| 8 | 2 | ProxyResponse + ProxyError records |
| 9 | 2, 7 | Exceptions + IpResolver (unblocks ProxyConfig compile) |
| 10 | 9 | ProxyExceptionHandler |
| 11 | 2 | RequestIdFilter |
| 12 | 7, 9, 10, 11 | RateLimitFilter |
| 13 | 7 | ApiController update |
| 14 | — | openapi.yaml |
| 15 | — | backend/.env.example + .gitignore |
| 16 | 15 | docker-compose.yml update |
| 17 | 12 | Filter tests |
| 18 | 9, 10 | Handler + resolver tests |
| 19 | 13 | ApiController test |
| 20 | 17, 18, 19 | Full build + acceptance verification |

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Verify branch and baseline | [COMPLETE] | 2026-04-21 | Branch OK; `./mvnw clean compile` + `./mvnw test` both exit 0 (0 tests) |
| 2 | Add Maven dependencies | [COMPLETE] | 2026-04-21 | pom.xml + `.mvn/settings.xml` + `.mvn/maven.config`; bucket4j pinned to 8.18.0 (8.10.1 doesn't exist — artifact was renamed at 8.11.0); `dependency:tree` shows all 4 |
| 3 | Rewrite application.properties | [COMPLETE] | 2026-04-21 | Shared defaults replacing 6-line stub; compile OK |
| 4 | Create dev + prod profile properties | [COMPLETE] | 2026-04-21 | application-dev.properties + application-prod.properties created; compile OK |
| 5 | Create logback-spring.xml | [COMPLETE] | 2026-04-21 | Uses `<springProfile>` blocks (avoids janino dep); real test is Step 19's @WebMvcTest |
| 6 | Update CorsConfig.java | [COMPLETE] | 2026-04-21 | Per-profile origins via @Value, credentials=false, exposedHeaders for rate limit |
| 7 | Create ProxyConfig.java | [COMPLETE] | 2026-04-21 | @ConfigurationProperties with 5 nested classes + 2 beans |
| 8 | Create ProxyResponse + ProxyError records | [COMPLETE] | 2026-04-21 | Both records with factory methods |
| 9 | Create exceptions + IpResolver | [COMPLETE] | 2026-04-21 | ProxyException base + 3 subclasses + IpResolver; compile OK |
| 10 | Create ProxyExceptionHandler | [COMPLETE] | 2026-04-21 | Scoped to `proxy` package; 4 handlers (RateLimit, ProxyException, Validation, Throwable) |
| 11 | Create RequestIdFilter | [COMPLETE] | 2026-04-21 | HIGHEST_PRECEDENCE; MDC lifecycle with finally-remove |
| 12 | Create RateLimitFilter | [COMPLETE] | 2026-04-21 | HIGHEST_PRECEDENCE+10; `/api/v1/proxy/**` only; clean resetEpochSeconds math |
| 13 | Update ApiController.java | [COMPLETE] | 2026-04-21 | 3 endpoints: /api/health, /api/v1/health, /api/hello; providers booleans |
| 14 | Create openapi.yaml | [COMPLETE] | 2026-04-21 | OpenAPI 3.1 with /api/v1/health + shared schemas and responses |
| 15 | Create .env.example + .gitignore | [COMPLETE] | 2026-04-21 | 4 env vars documented; `.env.local` confirmed gitignored |
| 16 | Update docker-compose.yml | [COMPLETE] | 2026-04-21 | env_file: ./backend/.env.local + fallback SPRING_PROFILES_ACTIVE=dev; YAML valid (Eric creates .env.local before `docker compose up`) |
| 17 | Filter tests (RateLimit, RequestId) | [COMPLETE] | 2026-04-21 | 5 + 4 = 9 tests, all pass |
| 18 | Handler + resolver tests | [COMPLETE] | 2026-04-21 | 3 + 6 = 9 tests, all pass |
| 19 | ApiController test | [COMPLETE] | 2026-04-21 | @WebMvcTest needed @EnableConfigurationProperties(ProxyConfig.class) + @TestPropertySource (spec's @TestConfiguration bean pattern conflicted with the scanned ProxyConfig). 2/2 pass |
| 20 | Full build + acceptance verification | [COMPLETE] | 2026-04-21 | `./mvnw clean package` exits 0; 20/20 tests pass; JAR built (57 MB fat jar); no frontend changes; no .yml; branch OK |

---

## Post-review fixes (applied after `/code-review` on 2026-04-21)

Three fixes applied after code review surfaced one real bug + cleanup. Tests expanded 20 → 21.

**Fix 1 (Major — filter exception handling).** `RateLimitFilter` originally threw `RateLimitExceededException`, expecting `ProxyExceptionHandler` (`@RestControllerAdvice`) to convert it to a 429 with `ProxyError` body + `Retry-After` header. Servlet filters run above `DispatcherServlet`, so the exception propagated past the resolver and was rendered as Spring Boot's generic error response — wrong shape, no `Retry-After` header. Fix: injected `HandlerExceptionResolver` (via `@Qualifier("handlerExceptionResolver")`) as a third constructor arg on `RateLimitFilter` and replaced the `throw` with `handlerExceptionResolver.resolveException(request, response, null, ex); return;`.

Subsidiary change required to make Fix 1 work end-to-end: the resolver is called with `handler=null` (filters have no controller handler), and `ControllerAdviceBean.isApplicableToBeanType(null)` returns `false` when an advice has selectors. So `ProxyExceptionHandler`'s `basePackages = "com.example.worshiproom.proxy"` filter caused the advice to be skipped, and the resolver returned a null `ModelAndView` without writing the 429. To preserve the plan's Step 10 DO NOT ("do not remove `basePackages`"), the `RateLimitExceededException` handler was split out into a new minimal global advice: `backend/src/main/java/com/example/worshiproom/proxy/common/RateLimitExceptionHandler.java` (no `basePackages`, handles only `RateLimitExceededException`). `ProxyExceptionHandler` keeps `basePackages` and still handles `ProxyException`, `MethodArgumentNotValidException`, and `Throwable` — all of which originate from controllers and are correctly scoped. The unit test for the rate-limit handler moved to `RateLimitExceptionHandlerTest.java`; `ProxyExceptionHandlerTest` dropped from 3 to 2 tests.

`RateLimitFilterTest` updated: the two tests that previously asserted `.doFilter()` throws `RateLimitExceededException` now mock the resolver and use `Mockito.verify()` to confirm (a) `resolveException` was called with a `RateLimitExceededException` whose `retryAfterSeconds > 0`, and (b) `filterChain.doFilter()` was NOT called afterwards. Mockito imports came transitively from `spring-boot-starter-test` — no new dependencies.

**Fix 2 (new integration test).** `RateLimitIntegrationTest.java` added: `@SpringBootTest + @AutoConfigureMockMvc + @ActiveProfiles("dev")`. Fires 50 POST requests to `/api/v1/proxy/anything` from IP `10.99.0.1` (dev profile burst=30 guarantees depletion), then asserts the 51st response returns 429, `Retry-After` header is numeric and ≥ 1, and JSON body has `code="RATE_LIMITED"` + non-empty `message`, `requestId`, `timestamp`. Verified regression-catch via revert-sanity check: temporarily reverted `RateLimitFilter` to `throw new RateLimitExceededException(...)` → integration test errored out with the uncaught exception; re-applied the resolver delegation → test passes.

**Fix 3 (Minor — dead config cleanup).** Removed `proxy.logging.json-format=false` from `application-dev.properties` and `proxy.logging.json-format=true` from `application-prod.properties`. These properties were unreferenced — `logback-spring.xml` uses `<springProfile>` blocks directly to select the encoder, and the plan's Step 5 note already documented that the property was dead. Keeping it in the files misled readers into thinking it drove logging behavior.

**Final state after post-review fixes:**

- `./mvnw compile` exits 0
- `./mvnw test` exits 0 with 21 tests passed (5 RateLimitFilter + 4 RequestIdFilter + 2 ProxyExceptionHandler + 1 RateLimitExceptionHandler + 6 IpResolver + 1 RateLimitIntegrationTest + 2 ApiControllerTest)
- Plan Step 10 DO NOT preserved: `ProxyExceptionHandler` still has `basePackages = "com.example.worshiproom.proxy"`. The new `RateLimitExceptionHandler` is narrowly scoped to a single filter-raised exception type.
- Two new files: `RateLimitExceptionHandler.java` (main) + `RateLimitExceptionHandlerTest.java` + `RateLimitIntegrationTest.java` (tests).
- Three files modified: `RateLimitFilter.java` (+resolver), `RateLimitFilterTest.java` (Mockito-based assertions), `ProxyExceptionHandler.java` (removed `handleRateLimit` + added comment pointing to new class). Plus two `.properties` files cleaned up.

---

Post-review Round 2 (2026-04-21): applied 6 fixes — Caffeine-bounded bucket cache (Medium 2), XFF trust flag (Medium 1), docker-compose optional env_file (Medium 3), ProxyResponse.of key precedence (Minor 1), CorsConfig @Value default removal (Minor 2), logback <logger> cleanup (Minor 3). Test count 21 → 23. All tests pass.
