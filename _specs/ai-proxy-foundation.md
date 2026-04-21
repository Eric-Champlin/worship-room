# AI Proxy Foundation (Spec 1 of 5)

**Spec ID:** ai-proxy-foundation
**Wave:** Key Protection (5-spec series, this is spec 1 of 5)
**Track:** Backend foundation — enables all subsequent proxy specs
**Branch:** `claude/feature/ai-proxy-foundation` — cut fresh from `main` after the `/ask` redesign branch is merged

> **Prerequisite:** the `/ask` redesign branch (`claude/feature/ask-page-redesign`) must be merged to `main` before this spec is cut, so we start from a clean baseline. If you want to verify, run `git log main --oneline -5` and look for the /ask redesign commit.

---

## ⚠️ CRITICAL EXECUTION RULES (read before coding)

1. **CC must stay on branch `claude/feature/ai-proxy-foundation` throughout the entire execution.** Do NOT cut additional branches. Do NOT merge. Do NOT rebase. Do NOT reset. Do NOT run `git checkout`, `git commit`, `git push`, or any other git subcommand. Eric handles all git operations manually.
2. **Before writing any code, CC verifies the current branch by running `git branch --show-current` via `bash`.** If the result is `main`, ask the user to cut the branch, then stop. If the result is any branch name other than `claude/feature/ai-proxy-foundation`, STOP and surface to the user. Do not proceed until the user confirms the branch.
3. **No frontend changes in this spec.** Spec 2 migrates frontend callers off direct Gemini calls. This spec only builds the backend foundation.
4. **No new keys are introduced.** This spec accepts the existing `VITE_GEMINI_API_KEY` value as the source of truth for the backend env var (renamed to `GEMINI_API_KEY` without the `VITE_` prefix on the backend side). Eric will copy the value from `frontend/.env.local` to `backend/.env.local` manually before testing.
5. **No database, no JWT, no Liquibase, no Redis in this spec.** The Forums Wave master plan has Phase 1 specs that add all of these — this proxy foundation deliberately stays narrow so it can ship before Forums Wave Phase 1 lands. The proxy is essentially stateless. The rate limiter is in-memory (per-instance) for now; Spec 1 documents the Redis upgrade path but does NOT implement it.
6. **Follow `.claude/rules/03-backend-standards.md` conventions for everything except the items explicitly excluded above.** Specifically: package structure, controller/service patterns, response shapes, error format, OpenAPI requirement, content policy, logging rules from `07-logging-monitoring.md`, security rules from `02-security.md`.
7. **When this spec says "use exactly this code" — do it verbatim.** Do not rewrite, refactor, or "improve" the structure. Java has many idioms; this spec picks specific ones for consistency with the rest of the project.

---

## Why this spec exists

Three frontend API keys are currently bundled into the production JavaScript that ships to every visitor: `VITE_GEMINI_API_KEY`, `VITE_GOOGLE_MAPS_API_KEY`, `VITE_FCBH_API_KEY`. Anyone can extract them via Chrome DevTools and use them to bill costs to Eric's accounts.

The fix is a backend proxy: keep the keys server-side, expose narrow HTTP endpoints that the frontend calls, enforce rate limits on the server (where they cannot be bypassed by tab reload).

This spec builds the **foundation** that all three proxies will share:

- A new top-level package (`com.example.worshiproom.proxy`) with conventions for proxy controllers, services, and configuration
- An IP-based rate-limit filter (token bucket, in-memory) that can be applied to any proxy endpoint
- A standardized response/error shape matching `.claude/rules/03-backend-standards.md`
- A health-check extension that confirms each proxy's upstream is reachable
- An OpenAPI spec scaffold that subsequent specs add endpoints to
- A request-ID generation filter so every log line is traceable
- A secret-management pattern via env vars + `.env.local` (gitignored)
- An exception handler that maps domain errors to HTTP responses without leaking stack traces or upstream API details to the client
- Test infrastructure for proxy endpoints (Spring Boot Test + MockMvc — no Testcontainers needed because there's no database)

After this spec ships, **no proxy endpoints exist yet**. Specs 2-4 add the actual `/api/v1/proxy/ai/*`, `/api/v1/proxy/places/*`, `/api/v1/proxy/audio/*` controllers using the conventions established here.

---

## Files touched

| File | Change | Purpose |
|---|---|---|
| `backend/pom.xml` | Modify | Add 3 dependencies: google-genai SDK, spring-boot-starter-webflux (for non-blocking HTTP client), bucket4j (rate limiter). Add OpenAPI plugin. |
| `backend/src/main/resources/application.properties` | Modify | Add proxy config block: rate limit defaults, request timeout, max body size, secret env var bindings |
| `backend/src/main/resources/application-dev.properties` | Create | Dev profile — verbose logging, in-memory rate limiter, looser CORS |
| `backend/src/main/resources/application-prod.properties` | Create | Prod profile — JSON logging, tighter rate limits, prod CORS |
| `backend/src/main/resources/logback-spring.xml` | Create | Structured JSON logging config matching `07-logging-monitoring.md` |
| `backend/src/main/java/com/example/worshiproom/config/CorsConfig.java` | Modify | Add prod origin (`https://worshiproom.com`), per-environment origin list, document allowed headers |
| `backend/src/main/java/com/example/worshiproom/config/ProxyConfig.java` | Create | `@Configuration` for proxy properties, beans for rate limiter and request-ID generator |
| `backend/src/main/java/com/example/worshiproom/proxy/common/ProxyResponse.java` | Create | Standardized success-response record matching `{ data, meta: { requestId } }` |
| `backend/src/main/java/com/example/worshiproom/proxy/common/ProxyError.java` | Create | Standardized error-response record matching `{ code, message, requestId, timestamp }` |
| `backend/src/main/java/com/example/worshiproom/proxy/common/ProxyException.java` | Create | Base exception class for all proxy errors |
| `backend/src/main/java/com/example/worshiproom/proxy/common/UpstreamException.java` | Create | Subclass for upstream API failures (Gemini/Google/FCBH returning errors) |
| `backend/src/main/java/com/example/worshiproom/proxy/common/RateLimitExceededException.java` | Create | Subclass thrown by the rate limiter when bucket empty |
| `backend/src/main/java/com/example/worshiproom/proxy/common/UpstreamTimeoutException.java` | Create | Subclass for request timeouts to upstream APIs |
| `backend/src/main/java/com/example/worshiproom/proxy/common/ProxyExceptionHandler.java` | Create | `@ControllerAdvice` mapping all proxy exceptions to HTTP responses |
| `backend/src/main/java/com/example/worshiproom/proxy/common/RequestIdFilter.java` | Create | Servlet filter that generates `X-Request-Id` per request and sets MDC for logging |
| `backend/src/main/java/com/example/worshiproom/proxy/common/RateLimitFilter.java` | Create | Servlet filter that enforces per-IP rate limits on `/api/v1/proxy/**` |
| `backend/src/main/java/com/example/worshiproom/proxy/common/IpResolver.java` | Create | Helper that extracts the real client IP from request headers (`X-Forwarded-For` aware) |
| `backend/src/main/java/com/example/worshiproom/controller/ApiController.java` | Modify | Extend health endpoint to check proxy readiness; add `/api/v1/health` (versioned alias) |
| `backend/src/main/resources/openapi.yaml` | Create | OpenAPI 3.1 scaffold — paths section empty, components section has shared schemas |
| `backend/.env.example` | Create | Template for `backend/.env.local` documenting all env vars the backend needs |
| `backend/src/test/java/com/example/worshiproom/proxy/common/RateLimitFilterTest.java` | Create | JUnit + MockMvc tests for the rate limiter |
| `backend/src/test/java/com/example/worshiproom/proxy/common/RequestIdFilterTest.java` | Create | Tests for request-ID generation and MDC propagation |
| `backend/src/test/java/com/example/worshiproom/proxy/common/ProxyExceptionHandlerTest.java` | Create | Tests for the exception → HTTP response mapping |
| `backend/src/test/java/com/example/worshiproom/proxy/common/IpResolverTest.java` | Create | Tests for IP resolution edge cases (X-Forwarded-For chains, IPv6, etc.) |
| `backend/src/test/java/com/example/worshiproom/controller/ApiControllerTest.java` | Create | Tests for the extended health endpoint |
| `backend/.gitignore` | Create | Backend-specific gitignore — must include `.env.local`, `target/`, `.idea/`, IDE files |
| `docker-compose.yml` (repo root) | Modify | Add `env_file` directive so the backend service picks up `backend/.env.local` |

**No frontend files are modified in this spec.** That's Spec 2's job.

**Net new code:** ~600-800 lines of Java + ~150 lines of XML/properties + ~80 lines of YAML (OpenAPI). Test code adds another ~400-500 lines.

---

## Conceptual overview (for the reviewer who hasn't done Spring before)

If you've only worked in React/TypeScript, here's what a Spring Boot project looks like at a glance. Skip this section if you've used Spring before.

**Spring Boot is a Java framework for building HTTP servers.** A typical request flow:

```
Browser → HTTP request → Servlet container (Tomcat, embedded in Spring Boot)
                       → Filter chain (cross-cutting concerns: CORS, request-id, rate limit)
                       → Controller (@RestController class with @GetMapping/@PostMapping methods)
                       → Service (@Service class with business logic)
                       → External call (HTTP client, database, etc.)
                       → Service returns a result
                       → Controller wraps it in a response
                       → Filter chain on the way out
                       → HTTP response → Browser
```

**Annotations are decorators** that tell Spring how to wire things together at startup. The most common ones in this spec:

- `@RestController` on a class → "this is an HTTP controller, return values become response bodies"
- `@RequestMapping("/api/v1/proxy")` on a class → "every method's path is prefixed with this"
- `@PostMapping("/ai/explain")` on a method → "this method handles POST requests to that path"
- `@RequestBody` on a parameter → "deserialize the JSON request body into this Java object"
- `@Valid` on a parameter → "run Bean Validation on this object before invoking the method"
- `@Service` on a class → "Spring should manage instances of this class and inject it where requested"
- `@Configuration` on a class → "this class declares beans (objects Spring should manage) via @Bean methods"
- `@Bean` on a method → "the return value is a bean Spring should manage"
- `@Component` on a class → generic version of @Service/@Controller/@Configuration; used for filters
- `@ControllerAdvice` on a class → "this class handles exceptions from controllers globally"
- `@ExceptionHandler(SomeException.class)` on a method → "when this exception is thrown anywhere, call this method"
- `@Value("${some.property}")` on a field → "inject the value of this config property here"
- `@ConfigurationProperties(prefix = "proxy")` on a class → "bind every config property starting with `proxy.` to fields on this class"

**Constructor injection** is the dependency-injection style this spec uses everywhere. Instead of `@Autowired` on fields, you write a normal constructor and Spring figures out which beans to pass in. This makes classes testable without Spring startup overhead.

**Records** are Java's lightweight immutable data carriers (similar to TypeScript's `interface` but at runtime). Used here for DTOs (request/response shapes).

**The filter chain** runs before any controller method. Filters are how we implement cross-cutting concerns like rate limiting and request-ID generation without polluting every controller.

**Profiles** (`-dev`, `-prod`) let you have different configuration for different environments. Spring Boot picks the active profile from the `SPRING_PROFILES_ACTIVE` environment variable.

That's enough context to read this spec. CC will write idiomatic Spring; you'll be able to follow what each piece does as you review.

---

## Architecture decisions baked into this spec

A few decisions worth surfacing because they're load-bearing:

**1. URL prefix is `/api/v1/proxy/*`.** Subsequent specs add `/api/v1/proxy/ai/explain`, `/api/v1/proxy/places/searchText`, `/api/v1/proxy/audio/bibles`. The `/proxy` segment makes it obvious in logs and OpenAPI docs that these endpoints are pure pass-through to upstream APIs (vs `/api/v1/auth/*` or `/api/v1/posts/*` which are application logic). Forums Wave specs add their own paths under `/api/v1/*` without `/proxy`.

**2. Versioning is `/v1/` from day one.** Even though we have no clients today, the master plan establishes `/v1/` as the convention. Changing this later means updating both backend and frontend; getting it right now is free.

**3. Rate limiter is per-IP, in-memory, with bucket4j.** Token bucket algorithm. Each unique IP gets a bucket that refills at a fixed rate. When a bucket is empty, requests are rejected with HTTP 429. Limits are configurable per environment via `application.properties`. The "in-memory" caveat means rate limits don't persist across restarts and don't sync across multiple instances — but until we deploy multi-instance or run a container orchestrator, this is fine. Spec documents the migration path to Redis-backed bucket4j when we deploy multi-instance.

**4. Exception handling is centralized via `@ControllerAdvice`.** Controllers throw typed exceptions; a single global handler catches them and translates to HTTP responses with the standard error shape. This means individual controller methods are clean and consistent error format is impossible to forget.

**5. WebClient (from spring-boot-starter-webflux) is the HTTP client used for upstream calls.** Not RestTemplate (deprecated for new code), not raw `HttpClient`. WebClient is non-blocking and has good support for timeouts, retries, and abort signals. Even though this is a synchronous-style project, WebClient works fine in a blocking style via `.block()`. Subsequent specs use this pattern.

**6. Logging is JSON-structured via Logback + logstash-logback-encoder.** Every log line includes `timestamp`, `level`, `logger`, `requestId` (from MDC), and any structured fields. This matches `07-logging-monitoring.md` requirements. PII never logged: never log the request body, the upstream response body, or any user input. Only metadata (timing, status codes, error codes, request IDs).

**7. Request IDs are 22-character base64-encoded UUIDs (no padding).** Set as response header `X-Request-Id`. Propagated to MDC so every log line in that request's lifecycle has the ID. If the client provides their own `X-Request-Id`, we honor it (lets the frontend correlate). Otherwise we generate one.

**8. Profile structure: `application.properties` has shared defaults, `application-dev.properties` and `application-prod.properties` override per environment.** The frontend stays on `dev` profile by default (via `SPRING_PROFILES_ACTIVE=dev` in `docker-compose.yml`). Production deploys set `SPRING_PROFILES_ACTIVE=prod`.

**9. Secret loading is via env vars (NOT `.env.local` parsing in code).** Spring Boot natively reads env vars and maps them to properties. `.env.local` is just a convention for `docker-compose` to load env vars before starting the JVM. The Java code never opens `.env.local`. This matches twelve-factor app principles and lets Railway/Render inject env vars in production exactly the same way.

**10. The OpenAPI spec is hand-authored (not generated from controllers).** This is the project convention per `03-backend-standards.md` Universal Rule 4: OpenAPI is the single source of truth, and TypeScript types are generated from it. Forum Wave Phase 1 sets up the generator pipeline (`backend/api/openapi.yaml` → `frontend/src/types/api/generated.ts` via `openapi-typescript`). For this spec, we hand-author the scaffold; subsequent specs hand-author the endpoint definitions before implementing. Generation pipeline is out of scope here (Forums Wave owns it).

---

## File-by-file changes

### 1. `backend/pom.xml`

Add three dependencies and one plugin to the existing `<dependencies>` and `<plugins>` blocks. Do NOT remove or modify any existing entries.

**Add to `<dependencies>` (place after the existing `spring-boot-starter-validation` block):**

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
    <version>8.10.1</version>
</dependency>

<!-- Structured JSON logging encoder — used by logback-spring.xml -->
<dependency>
    <groupId>net.logstash.logback</groupId>
    <artifactId>logstash-logback-encoder</artifactId>
    <version>8.0</version>
</dependency>
```

**Background for the reviewer:**

- `google-genai` is the official Google GenAI SDK for Java, versioned 1.51.0 at time of writing (verified via Maven Central). API mirrors the JS SDK the frontend already uses: `Client.builder().apiKey(...).build()`, `client.models.generateContent(...)`. CC should pin this exact version, not `LATEST`.
- `spring-boot-starter-webflux` brings in `WebClient`, the non-blocking HTTP client. Adds reactor + netty as transitive dependencies. Does NOT change the existing servlet-based controller stack — WebClient is just a client library that happens to live in the webflux starter. The controllers stay servlet-based via `spring-boot-starter-web`.
- `bucket4j` is the most popular Java token-bucket library. The `_jdk17-core` artifact is the modern variant (older `bucket4j-core` is for Java 8). 8.10.1 is the current stable.
- `logstash-logback-encoder` provides the JSON encoder for Logback. We use it directly from `logback-spring.xml`.

CC must NOT add additional dependencies beyond these four. If CC discovers a "convenience library" mid-execution, surface it to Eric for review rather than adding it.

### 2. `backend/src/main/resources/application.properties`

This file holds shared defaults. Profile-specific overrides go in `application-dev.properties` and `application-prod.properties`.

**Replace the entire file contents with:**

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
# Strict JSON output: don't include null fields in responses unless explicitly
# requested. Keeps response bodies tight.
spring.jackson.default-property-inclusion=non_null
# Don't fail when an unknown property appears in a request body — log a warning
# and ignore it. Defensive against client/server version drift.
spring.jackson.deserialization.fail-on-unknown-properties=false

# ─── HTTP server ───────────────────────────────────────────────────────────
# Maximum request body size — proxy endpoints don't accept large bodies.
spring.servlet.multipart.max-file-size=1MB
spring.servlet.multipart.max-request-size=1MB
# Hard cap on URL length — defensive against absurd query params
server.tomcat.max-http-request-header-size=16KB

# ─── Proxy foundation ──────────────────────────────────────────────────────
# Default rate limit: 60 requests per minute per IP across ALL proxy endpoints.
# Overridden per-profile and tunable per-endpoint by future specs.
proxy.rate-limit.requests-per-minute=60
proxy.rate-limit.burst-capacity=10

# Default upstream call timeout (10 seconds). Individual specs may override
# per endpoint (e.g., Gemini requests get 30s).
proxy.upstream.default-timeout-ms=10000

# Request body size cap for proxy endpoints (smaller than spring's default
# multipart cap because proxy endpoints accept JSON only, no file uploads).
proxy.max-request-body-bytes=65536

# Secret keys (loaded from env vars, never committed)
# Spec 1 declares the property bindings; Specs 2-4 actually use them.
proxy.gemini.api-key=${GEMINI_API_KEY:}
proxy.google-maps.api-key=${GOOGLE_MAPS_API_KEY:}
proxy.fcbh.api-key=${FCBH_API_KEY:}

# ─── Logging ───────────────────────────────────────────────────────────────
# Logback config in src/main/resources/logback-spring.xml — this property tells
# Spring Boot to use it (and the -spring suffix enables Spring profile awareness).
logging.config=classpath:logback-spring.xml
```

**Background:** The `${GEMINI_API_KEY:}` syntax means "read env var `GEMINI_API_KEY`, default to empty string if not set." Spring Boot expands this at startup. Empty defaults are intentional — the server still starts even if a key is missing; only endpoints that need the missing key fail when called. This mirrors the frontend's `requireGeminiApiKey()` pattern (lazy, fails at use, not at boot).

### 3. `backend/src/main/resources/application-dev.properties` (NEW)

```properties
# Dev profile — verbose logging, looser limits, in-memory rate limiter

# ─── Logging ───────────────────────────────────────────────────────────────
# Human-readable log output for local development (not JSON)
logging.level.root=INFO
logging.level.com.example.worshiproom=DEBUG
logging.level.org.springframework.web=DEBUG
# Disable JSON encoding for dev (logback-spring.xml respects this property)
proxy.logging.json-format=false

# ─── Rate limit (dev — looser) ─────────────────────────────────────────────
proxy.rate-limit.requests-per-minute=120
proxy.rate-limit.burst-capacity=30

# ─── Actuator (dev — expose more endpoints) ────────────────────────────────
management.endpoints.web.exposure.include=health,info,metrics,beans,env,configprops
```

### 4. `backend/src/main/resources/application-prod.properties` (NEW)

```properties
# Prod profile — JSON logging, stricter limits

# ─── Logging ───────────────────────────────────────────────────────────────
logging.level.root=INFO
logging.level.com.example.worshiproom=INFO
logging.level.org.springframework.web=WARN
# JSON encoding for prod (machine-parseable for aggregators)
proxy.logging.json-format=true

# ─── Rate limit (prod — strict) ────────────────────────────────────────────
proxy.rate-limit.requests-per-minute=60
proxy.rate-limit.burst-capacity=10

# ─── Actuator (prod — minimal) ─────────────────────────────────────────────
management.endpoints.web.exposure.include=health,info
management.endpoint.health.show-details=when-authorized
```

### 5. `backend/src/main/resources/logback-spring.xml` (NEW)

Logback's spring-aware config. The `-spring` suffix in the filename enables `<springProfile>` blocks.

**Full file contents:**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
    <!-- Read the json-format property to pick the encoder -->
    <springProperty
        scope="context"
        name="JSON_FORMAT"
        source="proxy.logging.json-format"
        defaultValue="false"/>

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

    <!-- Pick an appender at startup based on JSON_FORMAT -->
    <if condition='"true".equals(property("JSON_FORMAT"))'>
        <then>
            <root level="INFO">
                <appender-ref ref="CONSOLE_JSON"/>
            </root>
        </then>
        <else>
            <root level="INFO">
                <appender-ref ref="CONSOLE_PLAIN"/>
            </root>
        </else>
    </if>

    <!-- Per-package log levels — overridden by application-{profile}.properties -->
    <logger name="com.example.worshiproom" level="INFO"/>
    <logger name="org.springframework.web" level="INFO"/>
</configuration>
```

**Note:** The `<if condition>` element is from Logback's groovy-conditional support. If CC encounters issues with this syntax (some Logback distributions exclude the conditional library), fall back to using two separate `logback-spring.xml` profile-conditional blocks via `<springProfile name="dev">` / `<springProfile name="prod">`. CC should try the conditional first; if Logback complains at startup, use the springProfile fallback.

### 6. `backend/src/main/java/com/example/worshiproom/config/CorsConfig.java` (MODIFY)

Replace the entire file contents:

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
 *
 * Spec 1 (AI proxy foundation) extends this to support both profiles. Forums
 * Wave Phase 1 may further refine when JWT + cookies are introduced.
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

**Add to `application.properties` (the shared file from step 2):**

```properties
# ─── CORS ──────────────────────────────────────────────────────────────────
# Comma-separated list of allowed origins. Override per-profile.
proxy.cors.allowed-origins=http://localhost:5173
```

**Add to `application-prod.properties`:**

```properties
proxy.cors.allowed-origins=https://worshiproom.com,https://www.worshiproom.com
```

**Add to `application-dev.properties`:**

```properties
# Allow Vite dev server on standard and alternate ports
proxy.cors.allowed-origins=http://localhost:5173,http://localhost:5174,http://localhost:4173
```

The `@Value` annotation supports comma-separated strings → `String[]` directly. The `exposedHeaders` list is critical — without it, the browser hides the rate limit headers from frontend code even though they're sent.

### 7. `backend/src/main/java/com/example/worshiproom/config/ProxyConfig.java` (NEW)

```java
package com.example.worshiproom.config;

import com.example.worshiproom.proxy.common.IpResolver;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

/**
 * Proxy-foundation configuration.
 *
 * Binds all `proxy.*` properties from application.properties to a typed
 * Java object so other classes can inject {@link ProxyProperties} and read
 * settings type-safely instead of using {@code @Value("${proxy.*}")}.
 *
 * Also exposes shared infrastructure beans (WebClient, IpResolver) that
 * subsequent proxy specs depend on.
 */
@Configuration
@ConfigurationProperties(prefix = "proxy")
public class ProxyConfig {

    private RateLimitProperties rateLimit = new RateLimitProperties();
    private UpstreamProperties upstream = new UpstreamProperties();
    private long maxRequestBodyBytes = 65536;
    private GeminiProperties gemini = new GeminiProperties();
    private GoogleMapsProperties googleMaps = new GoogleMapsProperties();
    private FcbhProperties fcbh = new FcbhProperties();

    // ─── Beans ──────────────────────────────────────────────────────────

    /**
     * Single shared WebClient instance for all proxy upstream calls.
     *
     * Configured with the default upstream timeout. Individual proxies may
     * override timeouts per request via {@code .timeout(Duration.ofMillis(...))}
     * on the call chain — this default is the fallback.
     *
     * Subsequent specs (Spec 2 Gemini, Spec 3 Maps, Spec 4 FCBH) inject this
     * bean rather than constructing their own WebClient.
     */
    @Bean
    public WebClient proxyWebClient() {
        return WebClient.builder()
            .codecs(configurer -> configurer.defaultCodecs()
                .maxInMemorySize((int) maxRequestBodyBytes))
            .build();
    }

    /**
     * Helper for resolving the real client IP from request headers. Used by
     * the rate limiter and audit logging.
     */
    @Bean
    public IpResolver ipResolver() {
        return new IpResolver();
    }

    // ─── Getters / setters (Spring needs these for property binding) ────

    public RateLimitProperties getRateLimit() { return rateLimit; }
    public void setRateLimit(RateLimitProperties rateLimit) { this.rateLimit = rateLimit; }
    public UpstreamProperties getUpstream() { return upstream; }
    public void setUpstream(UpstreamProperties upstream) { this.upstream = upstream; }
    public long getMaxRequestBodyBytes() { return maxRequestBodyBytes; }
    public void setMaxRequestBodyBytes(long maxRequestBodyBytes) { this.maxRequestBodyBytes = maxRequestBodyBytes; }
    public GeminiProperties getGemini() { return gemini; }
    public void setGemini(GeminiProperties gemini) { this.gemini = gemini; }
    public GoogleMapsProperties getGoogleMaps() { return googleMaps; }
    public void setGoogleMaps(GoogleMapsProperties googleMaps) { this.googleMaps = googleMaps; }
    public FcbhProperties getFcbh() { return fcbh; }
    public void setFcbh(FcbhProperties fcbh) { this.fcbh = fcbh; }

    // ─── Nested property classes ────────────────────────────────────────

    public static class RateLimitProperties {
        private int requestsPerMinute = 60;
        private int burstCapacity = 10;
        public int getRequestsPerMinute() { return requestsPerMinute; }
        public void setRequestsPerMinute(int requestsPerMinute) { this.requestsPerMinute = requestsPerMinute; }
        public int getBurstCapacity() { return burstCapacity; }
        public void setBurstCapacity(int burstCapacity) { this.burstCapacity = burstCapacity; }
    }

    public static class UpstreamProperties {
        private long defaultTimeoutMs = 10_000;
        public long getDefaultTimeoutMs() { return defaultTimeoutMs; }
        public void setDefaultTimeoutMs(long defaultTimeoutMs) { this.defaultTimeoutMs = defaultTimeoutMs; }
    }

    public static class GeminiProperties {
        private String apiKey = "";
        public String getApiKey() { return apiKey; }
        public void setApiKey(String apiKey) { this.apiKey = apiKey; }
        public boolean isConfigured() { return apiKey != null && !apiKey.isBlank(); }
    }

    public static class GoogleMapsProperties {
        private String apiKey = "";
        public String getApiKey() { return apiKey; }
        public void setApiKey(String apiKey) { this.apiKey = apiKey; }
        public boolean isConfigured() { return apiKey != null && !apiKey.isBlank(); }
    }

    public static class FcbhProperties {
        private String apiKey = "";
        public String getApiKey() { return apiKey; }
        public void setApiKey(String apiKey) { this.apiKey = apiKey; }
        public boolean isConfigured() { return apiKey != null && !apiKey.isBlank(); }
    }
}
```

**Why this many getters/setters:** Spring's `@ConfigurationProperties` mechanism uses JavaBean-style getters and setters to bind property values. Records won't work here (they're immutable; Spring needs to call setters). The verbosity is annoying but it's the canonical Spring pattern.

**The `isConfigured()` helpers** mirror the frontend's `isGeminiApiKeyConfigured()` / `isGoogleMapsApiKeyConfigured()` / `isFcbhApiKeyConfigured()` pattern. Future specs use them for graceful degradation.

### 8. `backend/src/main/java/com/example/worshiproom/proxy/common/ProxyResponse.java` (NEW)

```java
package com.example.worshiproom.proxy.common;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.Map;

/**
 * Standardized success-response envelope matching the project's API contract:
 *
 *     { "data": <payload>, "meta": { "requestId": "..." } }
 *
 * Per .claude/rules/03-backend-standards.md § Standard Response Shapes.
 *
 * Controllers return this directly. Jackson serializes it to JSON automatically.
 *
 * @param <T> the payload type
 */
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

### 9. `backend/src/main/java/com/example/worshiproom/proxy/common/ProxyError.java` (NEW)

```java
package com.example.worshiproom.proxy.common;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.Instant;

/**
 * Standardized error-response shape:
 *
 *     {
 *       "code": "RATE_LIMITED",
 *       "message": "Too many requests. Try again in 30 seconds.",
 *       "requestId": "abc123",
 *       "timestamp": "2026-04-21T10:30:00Z"
 *     }
 *
 * Per .claude/rules/03-backend-standards.md § Standard Response Shapes.
 *
 * The exception handler (ProxyExceptionHandler) is the only producer of these
 * — controllers throw exceptions, the handler converts to ProxyError + HTTP
 * status code.
 */
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

### 10. `backend/src/main/java/com/example/worshiproom/proxy/common/ProxyException.java` (NEW)

```java
package com.example.worshiproom.proxy.common;

import org.springframework.http.HttpStatus;

/**
 * Base class for all proxy-side exceptions. Carries an HTTP status, a stable
 * error code (used by frontend code to branch), and a user-safe message.
 *
 * Subclasses pick specific status + code combinations:
 *   - RateLimitExceededException → 429 RATE_LIMITED
 *   - UpstreamException → 502 UPSTREAM_ERROR (or 503 UPSTREAM_UNAVAILABLE)
 *   - UpstreamTimeoutException → 504 UPSTREAM_TIMEOUT
 *
 * {@code cause} is preserved for server-side logging but never leaked to the
 * client (the exception handler discards it from the response).
 */
public class ProxyException extends RuntimeException {

    private final HttpStatus status;
    private final String code;

    public ProxyException(HttpStatus status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
    }

    public ProxyException(HttpStatus status, String code, String message, Throwable cause) {
        super(message, cause);
        this.status = status;
        this.code = code;
    }

    public HttpStatus getStatus() { return status; }
    public String getCode() { return code; }
}
```

### 11. `backend/src/main/java/com/example/worshiproom/proxy/common/UpstreamException.java` (NEW)

```java
package com.example.worshiproom.proxy.common;

import org.springframework.http.HttpStatus;

/**
 * Thrown when the upstream API (Gemini, Google Places, FCBH) returned a
 * non-success response or otherwise failed in a way that's not a timeout.
 *
 * The {@code message} should be USER-SAFE (no stack traces, no upstream-API
 * internal details). The original cause is preserved for server-side logging.
 */
public class UpstreamException extends ProxyException {
    public UpstreamException(String message) {
        super(HttpStatus.BAD_GATEWAY, "UPSTREAM_ERROR", message);
    }

    public UpstreamException(String message, Throwable cause) {
        super(HttpStatus.BAD_GATEWAY, "UPSTREAM_ERROR", message, cause);
    }
}
```

### 12. `backend/src/main/java/com/example/worshiproom/proxy/common/UpstreamTimeoutException.java` (NEW)

```java
package com.example.worshiproom.proxy.common;

import org.springframework.http.HttpStatus;

/**
 * Thrown when an upstream call exceeded its timeout budget.
 */
public class UpstreamTimeoutException extends ProxyException {
    public UpstreamTimeoutException(String message) {
        super(HttpStatus.GATEWAY_TIMEOUT, "UPSTREAM_TIMEOUT", message);
    }

    public UpstreamTimeoutException(String message, Throwable cause) {
        super(HttpStatus.GATEWAY_TIMEOUT, "UPSTREAM_TIMEOUT", message, cause);
    }
}
```

### 13. `backend/src/main/java/com/example/worshiproom/proxy/common/RateLimitExceededException.java` (NEW)

```java
package com.example.worshiproom.proxy.common;

import org.springframework.http.HttpStatus;

/**
 * Thrown by {@link RateLimitFilter} when the calling IP's bucket is empty.
 *
 * Carries {@code retryAfterSeconds} so the exception handler can set the
 * HTTP {@code Retry-After} header. Frontend code reads this header to render
 * a "try again in N seconds" message.
 */
public class RateLimitExceededException extends ProxyException {

    private final long retryAfterSeconds;

    public RateLimitExceededException(long retryAfterSeconds) {
        super(
            HttpStatus.TOO_MANY_REQUESTS,
            "RATE_LIMITED",
            "Too many requests. Try again in " + retryAfterSeconds + " seconds."
        );
        this.retryAfterSeconds = retryAfterSeconds;
    }

    public long getRetryAfterSeconds() { return retryAfterSeconds; }
}
```

### 14. `backend/src/main/java/com/example/worshiproom/proxy/common/ProxyExceptionHandler.java` (NEW)

```java
package com.example.worshiproom.proxy.common;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Global exception handler for all proxy controllers.
 *
 * Maps:
 *   - ProxyException (and subclasses) → typed HTTP response with ProxyError body
 *   - MethodArgumentNotValidException (Bean Validation failures) → 400 INVALID_INPUT
 *   - Throwable (anything else) → 500 INTERNAL_ERROR with generic message
 *
 * NEVER leaks stack traces, upstream API responses, or internal state to the
 * client. All such information is logged server-side with the request ID for
 * correlation.
 */
@RestControllerAdvice(basePackages = "com.example.worshiproom.proxy")
public class ProxyExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(ProxyExceptionHandler.class);

    @ExceptionHandler(RateLimitExceededException.class)
    public ResponseEntity<ProxyError> handleRateLimit(RateLimitExceededException ex) {
        var requestId = MDC.get("requestId");
        log.info("Rate limit exceeded: retryAfter={}s", ex.getRetryAfterSeconds());
        return ResponseEntity
            .status(ex.getStatus())
            .header("Retry-After", String.valueOf(ex.getRetryAfterSeconds()))
            .body(ProxyError.of(ex.getCode(), ex.getMessage(), requestId));
    }

    @ExceptionHandler(ProxyException.class)
    public ResponseEntity<ProxyError> handleProxyException(ProxyException ex) {
        var requestId = MDC.get("requestId");
        // Log the full cause server-side; don't include in response.
        log.warn("Proxy exception: code={} message={}", ex.getCode(), ex.getMessage(), ex);
        return ResponseEntity
            .status(ex.getStatus())
            .body(ProxyError.of(ex.getCode(), ex.getMessage(), requestId));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ProxyError> handleValidation(MethodArgumentNotValidException ex) {
        var requestId = MDC.get("requestId");
        var firstError = ex.getBindingResult().getFieldErrors().stream()
            .findFirst()
            .map(e -> e.getField() + ": " + e.getDefaultMessage())
            .orElse("Invalid input");
        log.info("Validation failed: {}", firstError);
        return ResponseEntity
            .status(HttpStatus.BAD_REQUEST)
            .body(ProxyError.of("INVALID_INPUT", firstError, requestId));
    }

    @ExceptionHandler(Throwable.class)
    public ResponseEntity<ProxyError> handleUnexpected(Throwable ex) {
        var requestId = MDC.get("requestId");
        // Log the full exception server-side; client gets a generic message.
        log.error("Unhandled exception in proxy", ex);
        return ResponseEntity
            .status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(ProxyError.of(
                "INTERNAL_ERROR",
                "An unexpected error occurred. Please try again.",
                requestId
            ));
    }
}
```

**Critical detail:** the `basePackages = "com.example.worshiproom.proxy"` restriction means this handler ONLY catches exceptions from proxy controllers. Future Forums Wave controllers in other packages get their own handler. This prevents accidental cross-domain coupling.

### 15. `backend/src/main/java/com/example/worshiproom/proxy/common/RequestIdFilter.java` (NEW)

```java
package com.example.worshiproom.proxy.common;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.ByteBuffer;
import java.util.Base64;
import java.util.UUID;

/**
 * Generates a per-request ID, sets it on the response header, and adds it
 * to SLF4J's MDC so every log line in the request's lifecycle includes it.
 *
 * Honors a client-provided {@code X-Request-Id} if present (lets the
 * frontend correlate). Otherwise generates a 22-char base64 UUID.
 *
 * Runs FIRST in the filter chain (HIGHEST_PRECEDENCE) so all subsequent
 * logging includes the ID.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class RequestIdFilter extends OncePerRequestFilter {

    public static final String HEADER_NAME = "X-Request-Id";
    public static final String MDC_KEY = "requestId";

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        String requestId = request.getHeader(HEADER_NAME);
        if (requestId == null || requestId.isBlank() || requestId.length() > 64) {
            // Client did not provide one (or it's bogus) — generate.
            requestId = generateRequestId();
        }
        response.setHeader(HEADER_NAME, requestId);
        MDC.put(MDC_KEY, requestId);
        try {
            filterChain.doFilter(request, response);
        } finally {
            MDC.remove(MDC_KEY);
        }
    }

    /**
     * 22-char base64-encoded UUID (no padding). Compact, URL-safe, opaque.
     */
    static String generateRequestId() {
        UUID uuid = UUID.randomUUID();
        ByteBuffer buf = ByteBuffer.allocate(16);
        buf.putLong(uuid.getMostSignificantBits());
        buf.putLong(uuid.getLeastSignificantBits());
        return Base64.getUrlEncoder().withoutPadding().encodeToString(buf.array());
    }
}
```

### 16. `backend/src/main/java/com/example/worshiproom/proxy/common/IpResolver.java` (NEW)

```java
package com.example.worshiproom.proxy.common;

import jakarta.servlet.http.HttpServletRequest;

/**
 * Resolves the real client IP from a request, accounting for X-Forwarded-For
 * headers set by load balancers and reverse proxies (Vercel, Railway, etc.).
 *
 * Resolution order:
 *   1. First valid IP in {@code X-Forwarded-For} (left-most = original client)
 *   2. {@code X-Real-IP} header
 *   3. {@code request.getRemoteAddr()}
 *
 * Returns "unknown" if all three fail (shouldn't happen, but defensive).
 *
 * The X-Forwarded-For header is a comma-separated list when there are
 * multiple proxy hops. We take the leftmost entry (the original client) and
 * trim whitespace.
 *
 * This is NOT bullet-proof against IP spoofing — anyone can set
 * X-Forwarded-For from outside the trust boundary. In production with Vercel
 * or Railway in front, those services strip incoming X-Forwarded-For and set
 * their own. For the in-memory rate limiter, this is good enough; rate
 * limiting is courtesy, not security. Hardening (trusted-proxy verification)
 * is a future spec.
 */
public class IpResolver {

    private static final String X_FORWARDED_FOR = "X-Forwarded-For";
    private static final String X_REAL_IP = "X-Real-IP";

    public String resolve(HttpServletRequest request) {
        String xff = request.getHeader(X_FORWARDED_FOR);
        if (xff != null && !xff.isBlank()) {
            // Take the first (leftmost) entry — the original client.
            int comma = xff.indexOf(',');
            String first = (comma >= 0) ? xff.substring(0, comma) : xff;
            String trimmed = first.trim();
            if (!trimmed.isEmpty()) return trimmed;
        }
        String real = request.getHeader(X_REAL_IP);
        if (real != null && !real.isBlank()) return real.trim();
        String remote = request.getRemoteAddr();
        return (remote != null && !remote.isEmpty()) ? remote : "unknown";
    }
}
```

### 17. `backend/src/main/java/com/example/worshiproom/proxy/common/RateLimitFilter.java` (NEW)

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
import java.util.concurrent.ConcurrentHashMap;

/**
 * Per-IP rate limiter for /api/v1/proxy/** endpoints. Token bucket
 * implementation via bucket4j.
 *
 * - Each IP gets a bucket with capacity = burstCapacity tokens.
 * - Tokens refill at requestsPerMinute / minute.
 * - Each request consumes 1 token.
 * - When the bucket is empty, throws RateLimitExceededException with the
 *   wall-clock seconds until the next token refills.
 *
 * Sets three headers on every successful response:
 *   X-RateLimit-Limit:     burstCapacity
 *   X-RateLimit-Remaining: tokens left in this IP's bucket
 *   X-RateLimit-Reset:     epoch seconds when the bucket will be full again
 *
 * In-memory only — buckets are lost on restart and don't sync across
 * instances. This is acceptable for current single-instance deployments.
 * When the project deploys multi-instance, swap the bucket store for
 * Redis-backed bucket4j (one-line change to the bean wiring).
 *
 * Runs AFTER RequestIdFilter so log lines from this filter include the
 * request ID.
 */
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
        // Only enforce rate limits on /api/v1/proxy/** endpoints.
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

        // Annotate the response with rate-limit headers.
        long remaining = probe.getRemainingTokens();
        long resetEpochSeconds = (System.nanoTime() + probe.getNanosToWaitForRefill())
            / 1_000_000_000L
            + (System.currentTimeMillis() / 1000L);
        // (The above resetEpochSeconds approximates "when the bucket will
        // refill". For a token-bucket the conceptually-cleaner answer is
        // "when the next token will arrive" — which is what we expose.)

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

**Note about `resetEpochSeconds`:** the math above looks slightly weird because `System.nanoTime()` and `System.currentTimeMillis()` measure different things (one is monotonic, one is wall-clock). What we actually want is "wall-clock epoch seconds when the bucket will be full again." A cleaner implementation would compute `Instant.now().plusNanos(probe.getNanosToWaitForRefill()).getEpochSecond()`. CC should use that cleaner version:

```java
long resetEpochSeconds = java.time.Instant.now()
    .plusNanos(probe.getNanosToWaitForRefill())
    .getEpochSecond();
```

(Replacing the awkward 4-line calculation in the snippet above. Apologies for the confusion in the spec draft — use the clean version.)

### 18. `backend/src/main/java/com/example/worshiproom/controller/ApiController.java` (MODIFY)

Replace entire file contents:

```java
package com.example.worshiproom.controller;

import com.example.worshiproom.config.ProxyConfig;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Root API endpoints. Health checks and a versioned health alias.
 *
 * The unversioned /api/health endpoint is preserved for backwards-compat with
 * existing callers (docker-compose health check). The versioned /api/v1/health
 * endpoint follows the master plan's URL scheme and is what new clients hit.
 *
 * Both endpoints report which proxy keys are configured (without exposing the
 * keys themselves) so deploys can verify env vars are wired correctly.
 */
@RestController
public class ApiController {

    private final ProxyConfig config;

    public ApiController(ProxyConfig config) {
        this.config = config;
    }

    @GetMapping("/api/health")
    public Map<String, Object> healthLegacy() {
        return buildHealth();
    }

    @GetMapping("/api/v1/health")
    public Map<String, Object> health() {
        return buildHealth();
    }

    @GetMapping("/api/hello")
    public Map<String, String> hello() {
        return Map.of("message", "Hello");
    }

    private Map<String, Object> buildHealth() {
        var providers = new LinkedHashMap<String, Boolean>();
        providers.put("gemini", config.getGemini().isConfigured());
        providers.put("googleMaps", config.getGoogleMaps().isConfigured());
        providers.put("fcbh", config.getFcbh().isConfigured());

        var result = new LinkedHashMap<String, Object>();
        result.put("status", "ok");
        result.put("providers", providers);
        return result;
    }
}
```

**Why this design:**

- The original `/api/health` returned `{"status": "ok"}`. Changing the shape would break the existing docker-compose health check — but adding fields to the existing JSON object is backwards-compatible (the docker-compose check just looks for HTTP 200, doesn't parse the body).
- Reporting which providers are "configured" is operational gold: when Eric deploys to Railway and forgets to set `GEMINI_API_KEY`, hitting `/api/v1/health` shows `"gemini": false` immediately.
- The endpoint never exposes key values — only booleans. Defensive against accidental log scraping.

### 19. `backend/src/main/resources/openapi.yaml` (NEW)

Hand-authored scaffold. Subsequent specs add their endpoints under `paths:`.

```yaml
openapi: 3.1.0
info:
  title: Worship Room API
  description: |
    Backend API for Worship Room.

    Phase 1: Proxy endpoints for upstream APIs (Gemini, Google Places, FCBH)
    that previously had keys exposed in the frontend bundle. Subsequent
    Forums Wave specs add application endpoints (auth, posts, comments, etc.).

    See `_specs/ai-proxy-foundation.md` for proxy architecture details.
  version: 1.0.0
  license:
    name: Proprietary
    identifier: proprietary
  contact:
    name: Eric Champlin
servers:
  - url: http://localhost:8080
    description: Local development
  - url: https://api.worshiproom.com
    description: Production

tags:
  - name: Health
    description: Liveness and readiness checks
  - name: Proxy / AI
    description: Proxied AI endpoints (Gemini)
  - name: Proxy / Places
    description: Proxied Google Maps Places endpoints
  - name: Proxy / Audio
    description: Proxied FCBH Digital Bible Platform endpoints

paths:
  /api/v1/health:
    get:
      tags: [Health]
      summary: Health check with provider readiness
      operationId: getHealth
      responses:
        '200':
          description: Service is healthy
          content:
            application/json:
              schema:
                type: object
                required: [status, providers]
                properties:
                  status:
                    type: string
                    enum: [ok]
                  providers:
                    type: object
                    required: [gemini, googleMaps, fcbh]
                    properties:
                      gemini: { type: boolean }
                      googleMaps: { type: boolean }
                      fcbh: { type: boolean }

components:
  schemas:
    ProxyResponse:
      description: |
        Standard success-response envelope. The `data` field's shape varies
        per endpoint and is documented inline on each operation.
      type: object
      required: [data, meta]
      properties:
        data: {}
        meta:
          type: object
          required: [requestId]
          properties:
            requestId: { type: string, minLength: 22, maxLength: 22 }

    ProxyError:
      description: Standard error-response shape.
      type: object
      required: [code, message, requestId, timestamp]
      properties:
        code:
          type: string
          example: RATE_LIMITED
          description: Stable error code that the frontend branches on.
        message:
          type: string
          description: User-safe error message (no stack traces, no upstream details).
        requestId:
          type: string
          description: Same request ID that's set on the X-Request-Id response header.
        timestamp:
          type: string
          format: date-time

  responses:
    BadRequest:
      description: Invalid input
      content:
        application/json:
          schema: { $ref: '#/components/schemas/ProxyError' }
    RateLimited:
      description: Too many requests
      headers:
        Retry-After:
          schema: { type: integer }
          description: Seconds until the rate limit window resets.
        X-RateLimit-Limit:
          schema: { type: integer }
        X-RateLimit-Remaining:
          schema: { type: integer }
        X-RateLimit-Reset:
          schema: { type: integer }
      content:
        application/json:
          schema: { $ref: '#/components/schemas/ProxyError' }
    UpstreamError:
      description: Upstream API failed
      content:
        application/json:
          schema: { $ref: '#/components/schemas/ProxyError' }
    UpstreamTimeout:
      description: Upstream API timed out
      content:
        application/json:
          schema: { $ref: '#/components/schemas/ProxyError' }
    InternalError:
      description: Unexpected server error
      content:
        application/json:
          schema: { $ref: '#/components/schemas/ProxyError' }
```

### 20. `backend/.env.example` (NEW)

```bash
# Worship Room — backend environment variables
# ────────────────────────────────────────────────────────────────────────────
# Copy this file to backend/.env.local and fill in real values. .env.local is
# gitignored. Never commit real keys.
#
# In local dev, docker-compose loads this file via env_file directive (see
# docker-compose.yml). In production, your hosting platform (Railway/Render)
# injects env vars directly — do NOT deploy a .env.local file to production.
# ────────────────────────────────────────────────────────────────────────────

# ─── Active profile ────────────────────────────────────────────────────────
SPRING_PROFILES_ACTIVE=dev

# ─── Gemini (used by Spec 2) ───────────────────────────────────────────────
# Same value as VITE_GEMINI_API_KEY in frontend/.env.local.
# After Spec 2 ships, this becomes the SOLE source of truth for the Gemini
# key — VITE_GEMINI_API_KEY can be removed from the frontend .env.local.
GEMINI_API_KEY=your-gemini-api-key-here

# ─── Google Maps (used by Spec 3) ──────────────────────────────────────────
# Same value as VITE_GOOGLE_MAPS_API_KEY in frontend/.env.local.
GOOGLE_MAPS_API_KEY=your-google-maps-api-key-here

# ─── FCBH (used by Spec 4) ─────────────────────────────────────────────────
# Same value as VITE_FCBH_API_KEY in frontend/.env.local.
FCBH_API_KEY=your-fcbh-api-key-here
```

### 21. `backend/.gitignore` (NEW)

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

**Sanity check:** after this file is created, run `git status` from the backend directory. `.env.local` (when you create it) and `target/` (compiled output) should both be ignored.

### 22. `docker-compose.yml` (repo root) (MODIFY)

Modify the existing `backend` service block to load env vars from `backend/.env.local`. Replace the existing `environment:` section under the backend service with `env_file:` + `environment:`:

**Before:**
```yaml
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8080:8080"
    environment:
      - SPRING_PROFILES_ACTIVE=docker
    healthcheck:
      ...
```

**After:**
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

**Note:** `env_file` lines have NO quotes around values, no `export`, no shell expansion. They're simple `KEY=VALUE` lines. The existing `.env.example` matches this format.

If `.env.local` doesn't exist when `docker-compose up` runs, Docker will warn but proceed. The backend will start with empty key values. Eric will create `.env.local` from `.env.example` before first run.

---

## Tests

All tests live under `backend/src/test/java/`. Spring Boot's testing model uses JUnit 5 + `@SpringBootTest` for integration tests and plain JUnit for unit tests.

### 23. `backend/src/test/java/com/example/worshiproom/proxy/common/RateLimitFilterTest.java` (NEW)

```java
package com.example.worshiproom.proxy.common;

import com.example.worshiproom.config.ProxyConfig;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("RateLimitFilter")
class RateLimitFilterTest {

    private RateLimitFilter filter;
    private ProxyConfig config;

    @BeforeEach
    void setUp() {
        config = new ProxyConfig();
        config.getRateLimit().setBurstCapacity(3);
        config.getRateLimit().setRequestsPerMinute(60);
        filter = new RateLimitFilter(config, new IpResolver());
    }

    @Test
    @DisplayName("allows requests up to the burst capacity")
    void allowsBurstCapacityRequests() throws Exception {
        for (int i = 0; i < 3; i++) {
            var req = new MockHttpServletRequest("POST", "/api/v1/proxy/ai/explain");
            req.setRemoteAddr("10.0.0.1");
            var res = new MockHttpServletResponse();
            filter.doFilter(req, res, new MockFilterChain());
            assertThat(res.getHeader("X-RateLimit-Limit")).isEqualTo("3");
            assertThat(res.getHeader("X-RateLimit-Remaining")).isNotNull();
        }
    }

    @Test
    @DisplayName("throws RateLimitExceededException when bucket is empty")
    void throwsWhenBucketEmpty() throws Exception {
        var ip = "10.0.0.2";
        // Drain the bucket
        for (int i = 0; i < 3; i++) {
            var req = new MockHttpServletRequest("POST", "/api/v1/proxy/ai/explain");
            req.setRemoteAddr(ip);
            filter.doFilter(req, new MockHttpServletResponse(), new MockFilterChain());
        }
        // Fourth request should fail
        var req = new MockHttpServletRequest("POST", "/api/v1/proxy/ai/explain");
        req.setRemoteAddr(ip);
        assertThatThrownBy(() ->
            filter.doFilter(req, new MockHttpServletResponse(), new MockFilterChain())
        )
            .isInstanceOf(RateLimitExceededException.class)
            .satisfies(ex -> {
                var rle = (RateLimitExceededException) ex;
                assertThat(rle.getRetryAfterSeconds()).isGreaterThan(0L);
            });
    }

    @Test
    @DisplayName("buckets are isolated per IP")
    void isolatedPerIp() throws Exception {
        for (int i = 0; i < 3; i++) {
            var req = new MockHttpServletRequest("POST", "/api/v1/proxy/ai/explain");
            req.setRemoteAddr("10.0.0.3");
            filter.doFilter(req, new MockHttpServletResponse(), new MockFilterChain());
        }
        // A different IP should still have a full bucket
        var req = new MockHttpServletRequest("POST", "/api/v1/proxy/ai/explain");
        req.setRemoteAddr("10.0.0.4");
        var res = new MockHttpServletResponse();
        filter.doFilter(req, res, new MockFilterChain());
        // No exception
        assertThat(res.getStatus()).isEqualTo(200);
    }

    @Test
    @DisplayName("does not enforce on non-proxy paths")
    void skipsNonProxyPaths() throws Exception {
        var req = new MockHttpServletRequest("GET", "/api/v1/health");
        req.setRemoteAddr("10.0.0.5");
        var res = new MockHttpServletResponse();
        var chain = new MockFilterChain();
        filter.doFilter(req, res, chain);
        // No rate-limit headers added on non-proxy paths
        assertThat(res.getHeader("X-RateLimit-Limit")).isNull();
    }

    @Test
    @DisplayName("uses X-Forwarded-For when present")
    void respectsXForwardedFor() throws Exception {
        var ip = "203.0.113.99"; // RFC 5737 example IP
        for (int i = 0; i < 3; i++) {
            var req = new MockHttpServletRequest("POST", "/api/v1/proxy/ai/explain");
            req.setRemoteAddr("10.0.0.1"); // proxy address
            req.addHeader("X-Forwarded-For", ip);
            filter.doFilter(req, new MockHttpServletResponse(), new MockFilterChain());
        }
        // Same client IP via XFF should be rate-limited
        var req = new MockHttpServletRequest("POST", "/api/v1/proxy/ai/explain");
        req.setRemoteAddr("10.0.0.1");
        req.addHeader("X-Forwarded-For", ip);
        assertThatThrownBy(() ->
            filter.doFilter(req, new MockHttpServletResponse(), new MockFilterChain())
        ).isInstanceOf(RateLimitExceededException.class);
    }
}
```

### 24. `backend/src/test/java/com/example/worshiproom/proxy/common/RequestIdFilterTest.java` (NEW)

```java
package com.example.worshiproom.proxy.common;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("RequestIdFilter")
class RequestIdFilterTest {

    private final RequestIdFilter filter = new RequestIdFilter();

    @Test
    @DisplayName("generates a 22-char base64 ID when none provided")
    void generatesIdWhenAbsent() throws Exception {
        var req = new MockHttpServletRequest();
        var res = new MockHttpServletResponse();
        filter.doFilter(req, res, new MockFilterChain());
        var id = res.getHeader("X-Request-Id");
        assertThat(id).isNotNull().hasSize(22);
    }

    @Test
    @DisplayName("honors a client-provided X-Request-Id")
    void honorsClientId() throws Exception {
        var clientId = "client-abc-123";
        var req = new MockHttpServletRequest();
        req.addHeader("X-Request-Id", clientId);
        var res = new MockHttpServletResponse();
        filter.doFilter(req, res, new MockFilterChain());
        assertThat(res.getHeader("X-Request-Id")).isEqualTo(clientId);
    }

    @Test
    @DisplayName("rejects oversized client IDs and generates instead")
    void rejectsOversizedId() throws Exception {
        var oversized = "x".repeat(100);
        var req = new MockHttpServletRequest();
        req.addHeader("X-Request-Id", oversized);
        var res = new MockHttpServletResponse();
        filter.doFilter(req, res, new MockFilterChain());
        assertThat(res.getHeader("X-Request-Id")).hasSize(22);
    }

    @Test
    @DisplayName("populates MDC during filter chain and clears after")
    void mdcPopulatedAndCleared() throws Exception {
        var capturedMdc = new AtomicReference<String>();
        var req = new MockHttpServletRequest();
        var res = new MockHttpServletResponse();
        FilterChain chain = (rq, rs) -> capturedMdc.set(MDC.get(RequestIdFilter.MDC_KEY));
        filter.doFilter(req, res, chain);
        assertThat(capturedMdc.get()).isNotNull().hasSize(22);
        // After filter completes, MDC should be cleared
        assertThat(MDC.get(RequestIdFilter.MDC_KEY)).isNull();
    }
}
```

### 25. `backend/src/test/java/com/example/worshiproom/proxy/common/ProxyExceptionHandlerTest.java` (NEW)

```java
package com.example.worshiproom.proxy.common;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("ProxyExceptionHandler")
class ProxyExceptionHandlerTest {

    private final ProxyExceptionHandler handler = new ProxyExceptionHandler();

    @Test
    @DisplayName("RateLimitExceededException → 429 with Retry-After header")
    void handlesRateLimit() {
        MDC.put("requestId", "test-req-id");
        try {
            var response = handler.handleRateLimit(new RateLimitExceededException(42));
            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
            assertThat(response.getHeaders().getFirst("Retry-After")).isEqualTo("42");
            assertThat(response.getBody().code()).isEqualTo("RATE_LIMITED");
            assertThat(response.getBody().requestId()).isEqualTo("test-req-id");
        } finally {
            MDC.clear();
        }
    }

    @Test
    @DisplayName("UpstreamException → 502 BAD_GATEWAY")
    void handlesUpstreamException() {
        MDC.put("requestId", "test-req-id");
        try {
            var response = handler.handleProxyException(new UpstreamException("upstream broke"));
            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_GATEWAY);
            assertThat(response.getBody().code()).isEqualTo("UPSTREAM_ERROR");
            assertThat(response.getBody().message()).isEqualTo("upstream broke");
        } finally {
            MDC.clear();
        }
    }

    @Test
    @DisplayName("Unknown Throwable → 500 INTERNAL_ERROR with generic message")
    void handlesUnexpected() {
        MDC.put("requestId", "test-req-id");
        try {
            var response = handler.handleUnexpected(new RuntimeException("internal detail"));
            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
            assertThat(response.getBody().code()).isEqualTo("INTERNAL_ERROR");
            // CRITICAL: the internal exception message must NOT leak to the client
            assertThat(response.getBody().message()).doesNotContain("internal detail");
        } finally {
            MDC.clear();
        }
    }
}
```

### 26. `backend/src/test/java/com/example/worshiproom/proxy/common/IpResolverTest.java` (NEW)

```java
package com.example.worshiproom.proxy.common;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("IpResolver")
class IpResolverTest {

    private final IpResolver resolver = new IpResolver();

    @Test
    void prefersXForwardedForOverRemoteAddr() {
        var req = new MockHttpServletRequest();
        req.setRemoteAddr("10.0.0.1");
        req.addHeader("X-Forwarded-For", "203.0.113.99");
        assertThat(resolver.resolve(req)).isEqualTo("203.0.113.99");
    }

    @Test
    void usesLeftmostXForwardedForEntry() {
        var req = new MockHttpServletRequest();
        req.addHeader("X-Forwarded-For", "203.0.113.99, 198.51.100.1, 192.0.2.50");
        assertThat(resolver.resolve(req)).isEqualTo("203.0.113.99");
    }

    @Test
    void fallsBackToXRealIp() {
        var req = new MockHttpServletRequest();
        req.setRemoteAddr("10.0.0.1");
        req.addHeader("X-Real-IP", "203.0.113.50");
        assertThat(resolver.resolve(req)).isEqualTo("203.0.113.50");
    }

    @Test
    void fallsBackToRemoteAddr() {
        var req = new MockHttpServletRequest();
        req.setRemoteAddr("10.0.0.99");
        assertThat(resolver.resolve(req)).isEqualTo("10.0.0.99");
    }

    @Test
    void returnsUnknownWhenAllFail() {
        var req = new MockHttpServletRequest();
        req.setRemoteAddr(""); // some servers/test harnesses leave it blank
        assertThat(resolver.resolve(req)).isEqualTo("unknown");
    }

    @Test
    void trimsWhitespaceFromHeaders() {
        var req = new MockHttpServletRequest();
        req.addHeader("X-Forwarded-For", "  203.0.113.99  , 198.51.100.1");
        assertThat(resolver.resolve(req)).isEqualTo("203.0.113.99");
    }
}
```

### 27. `backend/src/test/java/com/example/worshiproom/controller/ApiControllerTest.java` (NEW)

```java
package com.example.worshiproom.controller;

import com.example.worshiproom.config.ProxyConfig;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(SpringExtension.class)
@WebMvcTest(controllers = ApiController.class)
@DisplayName("ApiController")
class ApiControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;

    @TestConfiguration
    static class TestConfig {
        @Bean
        public ProxyConfig proxyConfig() {
            var c = new ProxyConfig();
            c.getGemini().setApiKey("present");
            // googleMaps and fcbh stay empty
            return c;
        }
    }

    @Test
    @DisplayName("GET /api/v1/health returns 200 and provider statuses")
    void healthReturnsProviderStatuses() throws Exception {
        mockMvc.perform(get("/api/v1/health"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("ok"))
            .andExpect(jsonPath("$.providers.gemini").value(true))
            .andExpect(jsonPath("$.providers.googleMaps").value(false))
            .andExpect(jsonPath("$.providers.fcbh").value(false));
    }

    @Test
    @DisplayName("GET /api/health (legacy alias) returns same shape")
    void legacyHealthReturnsSameShape() throws Exception {
        mockMvc.perform(get("/api/health"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("ok"));
    }
}
```

---

## Acceptance criteria

After this spec ships, verify each of the following:

1. ✅ `cd backend && ./mvnw clean package` compiles without errors and produces `target/worship-room-backend-0.0.1-SNAPSHOT.jar`
2. ✅ `./mvnw test` passes — all 5 new test files run (rate limit, request ID, exception handler, IP resolver, API controller). At least 25 individual test cases.
3. ✅ With `backend/.env.local` populated and `docker-compose up -d backend`, the backend starts and `curl http://localhost:8080/api/v1/health` returns `{"status":"ok","providers":{...}}` with each `provider` showing `true` if its env var is set
4. ✅ `curl -i http://localhost:8080/api/v1/health` includes an `X-Request-Id` header
5. ✅ `curl -i -H "X-Request-Id: my-test-id" http://localhost:8080/api/v1/health` returns the same `X-Request-Id` value back (client ID honored)
6. ✅ `curl -i http://localhost:8080/api/v1/proxy/nonexistent` returns 404 (no proxy controllers exist yet — but the rate-limit headers should appear, proving the filter ran)
7. ✅ Rapid-fire 100 requests against `/api/v1/proxy/anything` from the same IP eventually returns 429 with `Retry-After` header
8. ✅ Backend logs include `requestId` field (visible in plain-text format with `[abc123def...]` prefix in dev profile)
9. ✅ `backend/.gitignore` contains `.env.local` and `.env.local` is NOT tracked by git (`git status backend/.env.local` shows nothing)
10. ✅ `backend/.env.example` exists and documents all 4 env vars (SPRING_PROFILES_ACTIVE, GEMINI_API_KEY, GOOGLE_MAPS_API_KEY, FCBH_API_KEY)
11. ✅ `backend/src/main/resources/openapi.yaml` is valid OpenAPI 3.1 (verify by pasting into [editor.swagger.io](https://editor.swagger.io) — should render without errors and show the 1 health endpoint)
12. ✅ CORS preflight from `http://localhost:5173` to `http://localhost:8080/api/v1/health` succeeds (test in browser console: `fetch('http://localhost:8080/api/v1/health').then(r => r.json()).then(console.log)`)
13. ✅ No frontend files modified — `git diff --stat main..HEAD frontend/` returns empty
14. ✅ The existing `/api/health` and `/api/hello` endpoints still work (backwards compat preserved)
15. ✅ No new `application.yml` files appear (everything is `.properties` per project convention)
16. ✅ `docker-compose up -d` brings up the backend successfully with env vars loaded from `backend/.env.local`
17. ✅ CC stayed on branch `claude/feature/ai-proxy-foundation` throughout — `git branch --show-current` confirms

---

## Edge cases CC must handle

1. **`.env.local` missing.** `docker-compose up` warns but proceeds. The backend starts with empty key values. The health endpoint correctly reports all providers as `false`. Don't crash at startup just because keys are missing — this is the require-on-use pattern.

2. **Rate limit overflow with same IP from many tabs.** All tabs from the same IP share one bucket. This is intentional — Eric and his test tabs will hit limits faster than separate users. For dev, the `application-dev.properties` cranks limits up to 120/min so it's not annoying.

3. **`X-Forwarded-For` with multiple hops.** IpResolverTest's `usesLeftmostXForwardedForEntry` test covers it. Take the leftmost, not the rightmost. (This contradicts some old guidance — for Vercel/Railway-style hosting the leftmost IS the original client.)

4. **Concurrent requests modifying the bucket map.** `ConcurrentHashMap.computeIfAbsent` is atomic; bucket4j's `tryConsumeAndReturnRemaining` is thread-safe. No additional synchronization needed.

5. **Memory growth from never-evicted buckets.** Each unique IP creates a bucket that lives forever in `buckets` map. Worst case: a botnet hitting the API with 100K unique IPs creates 100K buckets at ~150 bytes each = ~15MB. Acceptable. Eviction (e.g., LRU) is a future-spec improvement.

6. **OpenAPI YAML validation.** CC should paste the openapi.yaml into editor.swagger.io and confirm zero errors before considering this spec complete. If errors appear, fix the YAML rather than ignoring them — Forums Wave Phase 1 generates TS types from this file, so validity matters.

7. **Logback's `<if>` element availability.** Some Logback distributions exclude the conditional library (janino). If startup fails with a "janino" or "OnConsoleStatusListener" error, swap to `<springProfile name="dev">` / `<springProfile name="prod">` blocks instead of the `<if>` conditional. CC should attempt the conditional first and fall back if it doesn't work.

---

## Out of scope (subsequent specs)

- Actual proxy endpoints (Spec 2 adds Gemini, Spec 3 Maps, Spec 4 FCBH)
- Frontend changes to call the proxy (Specs 2/3/4 each modify the frontend)
- Removing `VITE_*_API_KEY` from frontend bundle (Specs 2/3/4)
- JWT authentication (Forums Wave Phase 1)
- Liquibase schema management (Forums Wave Phase 1)
- Redis-backed rate limiter (Forums Wave Phase 5.6 or a future deploy spec)
- Per-user rate limits (currently per-IP only — per-user requires JWT auth from Forums Wave Phase 1)
- Sentry integration (Forums Wave Phase 1.10d)
- Generating TypeScript types from openapi.yaml (Forums Wave Phase 1)
- Swagger UI at `/api/docs` (Forums Wave Phase 1)
- Production deployment configuration for Railway/Render (Spec 5 includes deployment notes for the proxy specifically; full deployment is master-plan work)
- Automatic IP eviction from in-memory bucket store (defer until measured memory becomes a problem)

---

## Final reminder

**CC must confirm branch BEFORE writing any code.** Run:

```
git branch --show-current
```

Expected: `claude/feature/ai-proxy-foundation`.

If anything else, STOP and ask Eric to resolve.

Then execute the file changes in the order given (1 → 27). Run `./mvnw test` after section 17 (after all common/ classes exist) and again at the end. Run `./mvnw clean package` at the end. Do NOT commit. Paste diffs for Eric's review before handing off.

When asking Eric to test the running backend, give him these exact commands:

```bash
# 1. Create env file (one-time)
cd backend
cp .env.example .env.local
# Open .env.local and paste the same VITE_GEMINI_API_KEY value from frontend/.env.local
# (paste it as GEMINI_API_KEY, without the VITE_ prefix)

# 2. Start the backend
cd ..
docker-compose up -d backend

# 3. Health check
curl -s http://localhost:8080/api/v1/health | jq

# 4. View logs (look for the request ID in [brackets])
docker-compose logs -f backend
```

Eric should see `"providers":{"gemini":true,"googleMaps":false,"fcbh":false}` in the health response (gemini true because he set the var; the other two false until Specs 3 and 4 ship).
