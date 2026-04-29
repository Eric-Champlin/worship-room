---
paths: ["backend/**"]
---

## Forums Wave Backend Standards

**Status: Forums Wave Phase 1 (Backend Foundation, 24/30 specs) and Phase 2 (Activity Engine Migration, 10/10 specs) shipped. Phase 2.5 (Friends Migration) starting next; master plan v2.9 with Phase 1 and Phase 2 Execution Reality Addendums is authoritative.** The backend is built using Spring Boot 3.x. The Key Protection Wave closed the proxy layer (Specs 1–4: foundation, Gemini, Maps, FCBH); Phase 1 added auth + Liquibase + JPA + production hardening; Phase 2 added the activity engine in dual-write mode.

**Authority hierarchy:** If this file conflicts with the master plan's Universal Rules or Architectural Decisions, the master plan wins.

## Tech Stack

### Backend
- **Framework:** Spring Boot 3.x (pin exact version in `pom.xml`)
- **Language:** Java 21
- **Build:** Maven (`./mvnw` wrapper)
- **Database:** PostgreSQL (Docker Compose for local dev, Railway/Supabase/Neon for prod)
- **Migrations:** Liquibase (XML changesets, NOT Flyway)
- **ORM:** Spring Data JPA
- **Cache:** Redis (rate limiting + caching; in-memory fallback for local dev)
- **Security:** Spring Security + JWT (BCrypt password hashing)
- **Testing:** JUnit 5 + Spring Boot Test + Testcontainers (PostgreSQL + Redis)
- **Email:** Spring Mail via SMTP (Postmark, SendGrid, or Resend)
- **Logging:** Logback with JSON structured logging
- **Monitoring:** Sentry (error tracking + PII scrubber) + UptimeRobot (uptime)
- **Object Storage:** S3-compatible (Cloudflare R2 / AWS S3 / MinIO for local dev)

### External APIs
- **AI:** Not used in Forums Wave MVP (curated content only; LLM integration deferred per master plan)
- **Maps:** Google Maps Places API (Phase 7.5 Local Support — mock data in earlier phases)
- **Music:** Spotify Embed Player (no API key needed; track IDs from playlist)

## API Contract

### REST API Conventions
- **Base Path:** `/api/v1`
- **Authentication:** `Authorization: Bearer <JWT_token>` for protected endpoints
- **Content Type:** `application/json`

### Standard Response Shapes

**Success:**
```json
{
  "data": { ... },
  "meta": { "requestId": "unique-request-id" }
}
```

**Success with pagination:**
```json
{
  "data": [ ... ],
  "meta": { "page": 1, "limit": 20, "total": 100, "requestId": "..." }
}
```

**Error:**
```json
{
  "code": "ERROR_CODE",
  "message": "Human-readable error message",
  "requestId": "unique-request-id",
  "timestamp": "2026-04-16T10:30:00Z"
}
```

### Response Headers (all responses)
- `X-Request-Id`: Unique identifier for request tracing
- `X-RateLimit-Limit`: Maximum requests in window
- `X-RateLimit-Remaining`: Requests remaining
- `X-RateLimit-Reset`: Unix timestamp when limit resets
- On `429`: include `Retry-After` header (seconds until retry)

### HTTP Status Codes
- `200 OK` — Success
- `201 Created` — Resource created
- `400 Bad Request` — Invalid input (code: `INVALID_INPUT`)
- `401 Unauthorized` — Missing/invalid token (code: `UNAUTHORIZED`)
- `403 Forbidden` — Insufficient permissions (code: `FORBIDDEN`)
- `404 Not Found` — Resource not found (code: `NOT_FOUND`)
- `409 Conflict` — Duplicate resource (code: `CONFLICT`)
- `422 Unprocessable Content` — Request valid but upstream content cannot be processed (code: `SAFETY_BLOCK` for AI safety-filter refusals per Spec 2; other 422 codes may be added per endpoint)
- `429 Too Many Requests` — Rate limit exceeded (code: `RATE_LIMITED`)
- `500 Internal Server Error` — Server error (code: `INTERNAL_ERROR`)
- `502 Bad Gateway` — Upstream API returned an error or unreachable (code: `UPSTREAM_ERROR`) — used by proxy endpoints (`/api/v1/proxy/**`) when Gemini, Google Maps, FCBH, or future upstreams fail
- `504 Gateway Timeout` — Upstream API exceeded its per-request timeout (code: `UPSTREAM_TIMEOUT`) — used by proxy endpoints for timeouts exceeding the configured `proxy.upstream.default-timeout-ms` or a service-specific override

**Special response (not an error):**
- `200 OK` with `crisis_flag: true` in body — content flagged by crisis detection (code: `CRISIS_DETECTED`). Post is still created with `crisis_flag=true` and crisis resources surfaced in UI. This is NOT a rejection.

### Error Code Catalog

The codes above are a sampling. The canonical list of every machine-readable `code` value the API emits (the `code` field in error response bodies, NOT HTTP status codes — those are documented above) lives at `backend/docs/api-error-codes.md`. It covers naming conventions, the procedure for adding a new code, and known drift / gaps. **Consult it before introducing a new error code in any new spec** so we don't end up with `INVALID_INPUT` / `VALIDATION_ERROR` / `BAD_REQUEST` parallel codes meaning the same thing.

### Pagination
- Query params: `?page=1&limit=20` (1-indexed pages, max limit 50)
- Default limit: 20
- Response meta includes: `page`, `limit`, `total`

## Liquibase Standards

### Changeset Naming
All changesets live in `backend/src/main/resources/db/changelog/` with filenames:
```
YYYY-MM-DD-NNN-description.xml
```
- `YYYY-MM-DD` — the date the changeset was authored
- `NNN` — three-digit sequence number for that date (001, 002, 003)
- `description` — lowercase kebab-case summary (e.g., `create-users-table`, `add-posts-image-columns`)

### Changelog Structure (Decision 10)
```
backend/src/main/resources/db/changelog/
  master.xml                              (master changelog, includes all sub-changelogs in order)
  2026-04-14-001-create-users-table.xml
  2026-04-14-002-extend-users-username.xml
  ...
  contexts/
    dev-seed.xml                          (dev-only seed data, context='dev')
    test-seed.xml                         (test-only seed data, context='test')
```

- `master.xml` includes all changeset files in order
- `dev-seed.xml` only runs with `spring.liquibase.contexts=dev` (local dev)
- `test-seed.xml` only runs with `spring.liquibase.contexts=test` (Testcontainers)
- Production runs with no context (safe)

**CRITICAL:** Every date+sequence prefix must be globally unique across all changesets. Duplicate prefixes cause Liquibase checksum conflicts that crash the app on deploy. Before creating a new changeset, check existing files: `ls backend/src/main/resources/db/changelog/`

### Changeset Rules
- One logical change per changeset (don't combine CREATE TABLE + ALTER TABLE in one file)
- Always include a `rollback` block (typically DROP TABLE for CREATE, reverse ALTER for modifications)
- Use `author="worship-room"` for all changesets
- UUID primary keys on every table (master plan Universal Rule 3)
- CHECK constraints for enum-like VARCHAR columns (e.g., `interaction_type`, `status`)
- Foreign keys with explicit constraint names
- **Foreign keys with `ON DELETE CASCADE`** for child tables whose rows should disappear when parent user is deleted (e.g., `activity_log`, `faith_points`, `streak_state`, `user_badges`, `friend_relationships`). Per Decision 10 rule 8.
- Indexes on every column used in WHERE clauses or ORDER BY
- Never use H2 for testing — it lies about PostgreSQL behavior. Testcontainers only.

### Changeset Template
```xml
<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
    http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-latest.xsd">

  <changeSet id="YYYY-MM-DD-NNN-description" author="worship-room">
    <!-- Change here -->
    <rollback>
      <!-- Rollback here -->
    </rollback>
  </changeSet>
</databaseChangeLog>
```

## Spring Boot Coding Standards

### Package Structure

**Base package:** **`com.worshiproom`**. Phase 1 Spec 1.1 ✅ renamed from the original `com.example.worshiproom` (covered ~60+ proxy files + tests + `pom.xml` `groupId` + Docker image tags). The new path is canonical everywhere. If `com/example/worshiproom/` still appears anywhere in the codebase post-Phase-1, that's a regression — the rename was complete and verified.

**Current structure (post-Phase-2):**
```
com.worshiproom/
├── WorshipRoomApplication.java
├── config/
│   ├── CorsConfig.java                  (binds proxy.cors.allowed-origins, exposes WebMvcConfigurer)
│   ├── JsonNullableConfig.java          (Phase 1 — Jackson registration for jsonnullable)
│   ├── ProxyConfig.java                 (binds proxy.* properties, exposes WebClient + IpResolver beans)
│   ├── SecurityHeadersConfig.java       (Phase 1 Spec 1.10g — 6 security headers as servlet filter at HIGHEST_PRECEDENCE+6)
│   └── SentryConfig.java                (Phase 1 Spec 1.10d — graceful no-op when SENTRY_DSN unset; PII boundary; expected-exception filter)
├── controller/
│   └── ApiController.java               (/api/v1/health, /api/v1/hello — health endpoint reports providers.* status)
├── auth/                                (Phase 1 — Spring Security + JWT: login/register/me endpoints, JwtAuthenticationFilter, LoginRateLimitFilter, BCrypt, anti-enumeration)
├── user/                                (Phase 1 — User entity, UserController, UserService, UserRepository, DisplayNameResolver, PATCH /users/me)
├── activity/                            (Phase 2 — ActivityLog, FaithPoints, Streak, Badge, ActivityCounts; pure-function services + dual-write POST /api/v1/activity + POST /api/v1/activity/backfill; 13 ActivityType values incl. INTERCESSION added in Spec 3.6)
├── friends/                             (Phase 2.5 — friend_relationships, friend_requests; mutual-model service)
├── social/                              (Phase 2.5 — social_interactions, milestone_events write paths)
├── mute/                                (Spec 2.5.7 — user_mutes, MutesService; asymmetric per-user mute filtering)
├── safety/                              (Phase 3 — CrisisAlertService canonical entry point; ContentType.POST | ContentType.COMMENT)
├── post/                                (Phase 3 — unified posts family: Post + PostComment + PostReaction + PostBookmark, PostController + PostService + write services, PostExceptionHandler package-scoped advice, PostsRateLimitConfig, PostsIdempotencyService, QotdQuestion entity + repository, UserResolverService kebab-case shim)
└── proxy/                               (Key Protection Wave; package renamed in Phase 1 Spec 1.1)
    ├── common/                          (shared across all proxy subpackages)
    │   ├── ProxyResponse.java
    │   ├── ProxyError.java
    │   ├── ProxyException.java              (base class)
    │   ├── UpstreamException.java           (502 UPSTREAM_ERROR)
    │   ├── UpstreamTimeoutException.java    (504 UPSTREAM_TIMEOUT)
    │   ├── RateLimitExceededException.java  (429 RATE_LIMITED)
    │   ├── SafetyBlockException.java        (422 SAFETY_BLOCK, added in Spec 2)
    │   ├── ProxyExceptionHandler.java       (@RestControllerAdvice(basePackages="...proxy"))
    │   ├── RateLimitExceptionHandler.java   (global @RestControllerAdvice — filter-raised, see Error Handling)
    │   ├── RequestIdFilter.java             (@Order(HIGHEST_PRECEDENCE))
    │   ├── RateLimitFilter.java             (@Order(HIGHEST_PRECEDENCE + 10), scoped to /api/v1/proxy/**)
    │   └── IpResolver.java
    ├── ai/                              (Spec 2 — Gemini)
    ├── maps/                            (Spec 3 — Google Maps Places)
    └── bible/                           (Spec 4 — FCBH DBP)
```

**Test-only packages** at `backend/src/test/java/com/worshiproom/`:
- `support/` — `AbstractIntegrationTest`, `AbstractDataJpaTest`, `TestContainers` (singleton PostgreSQL container, started once per JVM run; both base classes register `spring.liquibase.contexts=test` via `@DynamicPropertySource`)
- `db/` — `LiquibaseSmokeTest` (runs all changesets against Testcontainers, verifies clean migration on every test suite run)

**Proxy subpackage convention (MANDATORY):** Every proxy feature lives under `com.worshiproom.proxy.{feature}/` — `proxy.ai` for Gemini (Spec 2), `proxy.maps` for Google Maps (Spec 3), `proxy.bible` for FCBH (Spec 4). Feature packages contain their controller + service + prompts/DTOs/helpers specific to that upstream. They NEVER redefine what already exists in `proxy.common` — shared types, exceptions, filters, and handlers always stay in common. Note: the master plan v2.6 listed provisional names (`proxy.places`, `proxy.audio`) that were superseded during execution — specs chose domain names (`proxy.maps`, `proxy.bible`) per "spec is feature authority." The current on-disk structure is authoritative.

**Forums Wave package additions:** Phase 2.5 ✅ shipped `com.worshiproom.friends/`, `com.worshiproom.social/`, and `com.worshiproom.mute/` (Spec 2.5.7). Phase 3 ✅ shipped `com.worshiproom.post/` (unified `posts` family) and `com.worshiproom.safety/` (CrisisAlertService — the canonical entry point for crisis-flag handling per Spec 3.5/3.6). **Still future:** Phase 10 will add `com.worshiproom.moderation/` (Spec 10.10 admin foundation, 10.7 peer moderator queue). Phase 12 will add `com.worshiproom.notification/`. Phase 15 will add `com.worshiproom.email/` (SMTP-blocked until domain purchase per `_plans/post-1.10-followups.md`). **Spec 2.5.6 (Block User) is NOT yet shipped despite older tracker text** — `com.worshiproom.block/` does not exist; Block reuses the Mute pattern when it ships. Do not create future packages preemptively — each phase's specs own them.

### Controller Conventions
- Annotate with `@RestController` and `@RequestMapping("/api/v1/...")`
- Keep controllers thin — delegate ALL business logic to services
- Use `@Valid` on request body parameters
- Return DTOs, NEVER expose JPA entities
- Use `ResponseEntity` for explicit status codes
- Constructor injection only (never `@Autowired` on fields)

### Service Conventions
- Annotate with `@Service`
- Use `@Transactional` on methods that write to the database
- Use `@Transactional(readOnly = true)` on read-only methods
- Constructor injection for all dependencies
- Throw domain-specific exceptions (caught by a global `@ControllerAdvice`)

### JPA Entity Conventions
- Annotate with `@Entity` and `@Table(name = "table_name")`
- UUID primary key: `@Id @GeneratedValue(strategy = GenerationType.UUID)`
- Use `@Column` annotations with explicit `nullable`, `length` where appropriate
- Timestamps: `@CreatedDate` and `@LastModifiedDate` with `@EntityListeners(AuditingEntityListener.class)`
- No-arg constructor required by JPA (can be `protected`)
- All-args constructor for application use
- Equals/hashCode based on `id` field only

### Repository Conventions
- Extend `JpaRepository<Entity, UUID>`
- Custom queries via `@Query` with JPQL (prefer JPQL over native SQL unless performance-critical)
- Method naming: `findAllByUserIdOrderByCreatedAtDesc(UUID userId)`
- Pageable support: `Page<Entity> findAllByUserId(UUID userId, Pageable pageable)`
- **Bulk UPDATE/DELETE methods MUST use `@Modifying(clearAutomatically = true, flushAutomatically = true)`.** Without `clearAutomatically`, subsequent reads in the same transaction return stale entities from Hibernate's persistence context. Without `flushAutomatically`, pending in-memory changes don't reach the DB before the bulk update fires. Convention established in Spec 3.7; used 11 times across `PostRepository`, `BookmarkRepository`, `ReactionRepository`. `/code-review` MUST flag any new `@Modifying` annotation missing either flag.
- **L1-cache trap on save → flush → findById.** A repository `save()` followed immediately by `findById()` returns the entity from the persistence context, NOT a fresh DB read. For columns marked `@Column(insertable=false, updatable=false)` (typical for DB-default audit timestamps like `created_at`/`updated_at`), the in-memory entity has `null` for those columns even after the SQL INSERT populates them. **Canonical fix:** call `entityManager.refresh(saved)` after `save()` and before DTO mapping. **Test guard:** any create-endpoint integration test that asserts a non-null timestamp in the response body catches this regression. Surfaced by Spec 3.5 + Spec 3.6 plan deviations; `ReactionWriteService.java:102` carries an explanatory comment.

### DTO Conventions
- Use Java records for request/response DTOs: `public record CreatePostRequest(...) {}`
- Validate with Bean Validation annotations: `@NotNull`, `@NotBlank`, `@Size`, `@Email`
- Separate request and response DTOs (never reuse the same class for both)
- Map between entities and DTOs in the service layer (not the controller)

### Error Handling
- Global `@ControllerAdvice` exception handler
- Domain exceptions extend a base `WorshipRoomException` with an error code
- Never expose stack traces to the client
- Never expose internal error details — use generic messages with request IDs for debugging
- Log the full exception server-side with the request ID for correlation
- **Upstream error text never reaches the client.** See `02-security.md` § "Never Leak Upstream Error Text" — proxy services catch upstream failures, log the full cause server-side, and throw `UpstreamException` / `UpstreamTimeoutException` with user-safe generic messages. Every proxy service test asserts the caught exception's message does NOT appear in the thrown `ProxyException`'s message.

### `@RestControllerAdvice` Scoping (MANDATORY pattern)

Proxy advices are **package-scoped** via `@RestControllerAdvice(basePackages = "com.worshiproom.proxy")`. This prevents a proxy exception handler from accidentally catching and reshaping exceptions thrown by unrelated Forums Wave controllers in sibling packages.

**Filter-raised exception gotcha (non-obvious):** Package-scoped advices DO NOT catch exceptions thrown from servlet filters. When a filter throws, the Spring `HandlerExceptionResolver` chain runs with `handler == null` (there is no controller associated with a filter-raised exception), which causes the advice's `isApplicableToBeanType(null)` check to fail. Package-scoped advices are silently skipped for filter-raised exceptions.

**Pattern:** Filter-raised exceptions require one of two solutions:
1. **Unscoped companion advice** — a separate `@RestControllerAdvice` (no `basePackages`) that handles ONLY the filter-raised exception type. Safe because it only matches one exception class that's only ever thrown by the filter. Spec 1's `RateLimitExceptionHandler` is the canonical example: a global advice handling only `RateLimitExceededException`, documented with a class-level JavaDoc explaining why it's intentionally unscoped.
2. **HandlerExceptionResolver delegation from inside the filter** — the filter injects `@Qualifier("handlerExceptionResolver") HandlerExceptionResolver` and calls `resolver.resolveException(request, response, null, ex)` instead of throwing. The resolver chain finds the appropriate advice because the resolver explicitly iterates advices. Spec 1's `RateLimitFilter` uses this pattern so the rate-limit response body + `Retry-After` header are emitted correctly.

Either pattern is acceptable. The unscoped-companion-advice pattern is simpler for single-exception cases; the resolver-delegation pattern is better when the filter needs fine control over the response. DO NOT add `basePackages` to an advice that must catch filter-raised exceptions — it will silently fail in production.

### SecurityConfig rule ordering (MANDATORY pattern)

Spring Security uses **first-match-wins** when evaluating `requestMatchers` rules. Method-specific `.authenticated()` rules MUST appear BEFORE permissive rules like `OPTIONAL_AUTH_PATTERNS.permitAll()` — otherwise the permissive rule wins and unauthenticated writes silently succeed.

Additionally, Spring's `AntPathMatcher` treats `*` as a single path segment. `/api/v1/posts/*` does NOT match `/api/v1/posts/*/reactions`. Nested paths require their own explicit rules.

**Pattern (canonical from Specs 3.5/3.6/3.7 `SecurityConfig.java`):**

```java
http.authorizeHttpRequests(auth -> auth
    // Method-specific rules FIRST — first-match-wins
    .requestMatchers(POST, "/api/v1/posts").authenticated()
    .requestMatchers(PATCH, "/api/v1/posts/*").authenticated()
    .requestMatchers(DELETE, "/api/v1/posts/*").authenticated()
    .requestMatchers(POST, "/api/v1/posts/*/reactions").authenticated()  // Nested path needs its own rule
    .requestMatchers(DELETE, "/api/v1/posts/*/reactions").authenticated()
    // Permissive rules LAST
    .requestMatchers(OPTIONAL_AUTH_PATTERNS).permitAll()
    .anyRequest().authenticated()
);
```

**`/code-review` MUST flag** any new `.authenticated()` rule that appears AFTER `permitAll()`, OR any nested path that depends on a parent rule's `*` to match. Phase 4 post-type writes, 6.1/6.2/6.6 hero-feature writes, 8.1 username PATCH, 10.7b user reports, 10.11 account deletion all need explicit method-specific rules ordered above the permissive set.

### Input Validation
- All user inputs validated for length, format, content
- Plain text only for all user-generated content (posts, comments, prayers, journal entries)
- No HTML, no Markdown rendering in MVP — store and display as plain text with `white-space: pre-wrap`
- Backend defensively strips all `<...>` tags on input (belt-and-suspenders with frontend React escaping)
- Never use `dangerouslySetInnerHTML` on user content in the frontend

### Admin Configuration
- Admin user seeded from `ADMIN_EMAIL` env var with `is_admin = true`
- Admin access checked via `user.is_admin` boolean (NOT hardcoded email comparisons)
- All admin actions logged to `admin_audit_log` table with: admin_user_id, action, target_type, target_id, details JSONB, created_at
- Moderation queue at `/admin/prayer-wall` (future phase)

### Rate Limiting

**Current implementation** (shipped in Spec 1 `ai-proxy-foundation`; see `02-security.md` § Rate Limiting for the full policy):
- **Mechanism:** bucket4j token bucket + Caffeine-backed bounded bucket map. NOT Spring Security, NOT Redis.
- **Scope:** `/api/v1/proxy/**` only. Other routes (health, future Forums Wave endpoints) are excluded via `RateLimitFilter.shouldNotFilter`.
- **Profile defaults:** Dev 120/min with 30-burst; prod 60/min with 10-burst. All configurable via `proxy.rate-limit.*` in `application-{profile}.properties` — never hardcoded.
- **Enforcement:** Per-IP until JWT auth lands. Once auth is wired, per-user takes precedence for authenticated endpoints.
- **Response headers on every response:** `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`. On 429: `Retry-After` (integer seconds).
- **Bucket-map bounding is mandatory** — see `02-security.md` § "BOUNDED EXTERNAL-INPUT CACHES".

**Forums Wave targets (not yet implemented):**
- Read (authenticated): 100/min per user
- Read (unauthenticated): 30/min per IP with 20-request burst
- Write (authenticated): 20/min per user
- Auth: 5 login attempts per 15 min per email
- AI (when per-user replaces per-IP): 20/hour per user
- **When Redis is down (once deployed):** Fail-closed (deny), not fail-open (allow unlimited).

### CORS Policy
- **Local dev:** `http://localhost:5173,http://localhost:5174,http://localhost:4173` (Vite dev + preview)
- **Production:** `https://worshiproom.com,https://www.worshiproom.com` (apex + www)
- **Methods:** GET, POST, PUT, PATCH, DELETE, OPTIONS
- **Headers:** Content-Type, Authorization, X-Request-Id
- **Exposed Headers** (MANDATORY): `X-Request-Id, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, Retry-After` — without `exposedHeaders`, browsers hide these from frontend JavaScript even though they arrive on the wire.
- **Credentials:** `false` for MVP (in-memory JWT, no cookies)
- **Configuration:** `proxy.cors.allowed-origins` (comma-separated) in `application-{profile}.properties`, bound via `@Value("${proxy.cors.allowed-origins}")` into `CorsConfig`. No inline `@Value` defaults (they duplicate `application.properties` and create drift).

### OpenAPI Spec and Type Generation (Universal Rule 4)
- **Single source of truth:** `backend/src/main/resources/openapi.yaml` (hand-authored, NOT generated from controllers — matches Spec 1 § Decision 10). The `src/main/resources/` location ships the spec inside the JAR, so it is available at runtime if ever needed.
- **Frontend types:** Generated to `frontend/src/types/api/generated.ts` via `openapi-typescript` (pipeline wired up by Forums Wave Phase 1; hand-typed in the interim).
- **Regeneration:** Run `npm run types:generate` after any API change (once the pipeline is wired).
- **Hand-editing generated types is forbidden** — edit the OpenAPI spec, then regenerate.
- **Swagger UI:** Available at `/api/docs` in dev profile only (never in production).
- **Linting:** Validate with Swagger Editor (editor.swagger.io) or `npx @redocly/cli lint` before shipping any spec that adds paths. Spec 1's openapi.yaml has the shared schemas (`ProxyResponse`, `ProxyError`) and shared responses (`BadRequest`, `RateLimited`, `UpstreamError`, `UpstreamTimeout`, `InternalError`, `SafetyBlocked`) — proxy specs add paths that `$ref` these shared components; they do NOT redefine them.

### Content Policy
- All scripture uses WEB (World English Bible) translation — public domain, no licensing
- Anti-pressure copy discipline applies to all user-facing text (master plan Universal Rule 12)
- Crisis detection takes precedence over feature behavior (master plan Universal Rule 13)
- No exclamation points near vulnerability content

## Forums Wave Master Plan Integration

The Forums Wave Master Plan at `_forums_master_plan/round3-master-plan.md` is the source of truth for:
- All 156 spec definitions (ID, acceptance criteria, file lists, database changes, API changes)
- 17 Universal Rules that apply to every spec
- 17 Architectural Decisions that define the technical foundation
- Cross-spec dependencies and prerequisite ordering
- Liquibase changeset filenames (pre-assigned to avoid collisions)

**Before implementing any Forums Wave spec, read the relevant section of the master plan.** The plan was audited across 15 dimensions and is execution-ready.
