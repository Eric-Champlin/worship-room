---
paths: ["backend/**"]
---

## Forums Wave Backend Standards

**Status: Active — Phase 3 (Forums Wave) is in progress.** The backend is being built using Spring Boot 3.x with the spec-driven pipeline defined in the Forums Wave Master Plan at `_forums_master_plan/round3-master-plan.md`.

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
- `429 Too Many Requests` — Rate limit exceeded (code: `RATE_LIMITED`)
- `500 Internal Server Error` — Server error (code: `INTERNAL_ERROR`)

**Special response (not an error):**
- `200 OK` with `crisis_flag: true` in body — content flagged by crisis detection (code: `CRISIS_DETECTED`). Post is still created with `crisis_flag=true` and crisis resources surfaced in UI. This is NOT a rejection.

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

**Current state:** The existing skeleton uses `com.example.worshiproom`. Spec 1.1 (Backend Skeleton Audit) will decide whether to rename to `com.worshiproom` or keep the existing package. Until that decision is made, use whichever package the skeleton currently uses.

**Target structure (within the base package):**
```
{base-package}
├── auth/           — AuthController, AuthService, JWT utils
├── user/           — UserController, UserService, User entity
├── prayer/         — PostController, PostService, Post/Comment entities
├── moderation/     — ReportController, UserReportService
├── friends/        — FriendsController, FriendsService
├── social/         — SocialInteractionsService, MilestoneEventsService
├── verse/          — VerseFindsYouService
├── email/          — WelcomeSequenceService, UnsubscribeController
├── legal/          — LegalVersionService
├── notification/   — NotificationService
├── config/         — SecurityConfig, CorsConfig, RedisConfig
├── common/         — shared DTOs, exceptions, base classes
└── infrastructure/ — S3 adapter, Sentry config, rate limiter
```

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
- **Implementation:** Redis-backed in production (via Spec 5.6), in-memory fallback for local dev
- **Per-user limits:** Configurable via env vars, not hardcoded
- **Standard tiers:**
  - Read endpoints (authenticated): 100 requests/minute per user
  - Read endpoints (unauthenticated): 30 requests/minute per IP, with 20-request burst allowance
  - Write endpoints: 20 requests/minute per authenticated user
  - Auth endpoints: 5 login attempts per 15 minutes per email
  - AI endpoints: 20 requests/hour per user (when AI features ship)
- **Global:** IP-based 100 requests/minute at edge level
- **Rate limit response:** 429 with `Retry-After` header and standard error shape
- **When Redis is down:** Fail-closed (deny requests) not fail-open (allow unlimited)

### CORS Policy
- **Local dev:** `http://localhost:5173`
- **Production:** `https://worshiproom.com` (or actual domain)
- **Methods:** GET, POST, PUT, PATCH, DELETE, OPTIONS
- **Headers:** Content-Type, Authorization, X-Request-Id
- **Credentials:** `false` for MVP (in-memory JWT, no cookies)

### OpenAPI Spec and Type Generation (Universal Rule 4)
- **Single source of truth:** `backend/api/openapi.yaml`
- **Frontend types:** Generated to `frontend/src/types/api/generated.ts` via `openapi-typescript`
- **Regeneration:** Run `npm run types:generate` after any API change
- **Hand-editing generated types is forbidden** — edit the OpenAPI spec, then regenerate
- **Swagger UI:** Available at `/api/docs` in dev profile only (never in production)
- **Linting:** Spectral (or similar) in CI to validate the spec

### Content Policy
- All scripture uses WEB (World English Bible) translation — public domain, no licensing
- Anti-pressure copy discipline applies to all user-facing text (master plan Universal Rule 12)
- Crisis detection takes precedence over feature behavior (master plan Universal Rule 13)
- No exclamation points near vulnerability content

## Forums Wave Master Plan Integration

The Forums Wave Master Plan at `_forums_master_plan/round3-master-plan.md` is the source of truth for:
- All 138 spec definitions (ID, acceptance criteria, file lists, database changes, API changes)
- 17 Universal Rules that apply to every spec
- 17 Architectural Decisions that define the technical foundation
- Cross-spec dependencies and prerequisite ordering
- Liquibase changeset filenames (pre-assigned to avoid collisions)

**Before implementing any Forums Wave spec, read the relevant section of the master plan.** The plan was audited across 15 dimensions and is execution-ready.
