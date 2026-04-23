# Forums Wave: Spec 1.5 — Auth Endpoints (Register, Login, Logout)

**Master Plan Reference:** `_forums_master_plan/round3-master-plan.md` → Spec 1.5
**Branch:** `claude/forums/round3-forums-wave`
**Date:** 2026-04-23

---

## Affected Frontend Routes

N/A — backend-only spec. No frontend code touched. `/verify-with-playwright` should be skipped.

The frontend AuthContext JWT migration (replacing the mock in-memory user with real `/api/v1/auth/*` calls) is explicitly deferred to Spec 1.9. Spec 1.5 lands the endpoints; Spec 1.9 wires them in.

---

### Spec 1.5 — Auth Endpoints (Register, Login, Logout)

- **ID:** `round3-phase01-spec05-auth-endpoints`
- **Phase:** 1 — Backend Foundation
- **Size:** L
- **Risk:** **High** (security-critical; must follow `.claude/rules/02-security.md` exactly)
- **Prerequisites:** Spec 1.3 ✅, Spec 1.3b ✅, Spec 1.4 ✅
- **Goal:** Implement the three public auth endpoints — `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `POST /api/v1/auth/logout` — on top of the Spring Security + JWT infrastructure from Spec 1.4. Create the `User` JPA entity matching the Spec 1.3 + 1.3b Liquibase schema. Add anti-enumeration to registration, timing-equalization + rate limiting to login. Backend-only in this spec; frontend AuthContext migration ships in Spec 1.9.

---

## Approach

### Overview

Spec 1.5 assembles the first real persistence layer and the first authenticated user lifecycle. Four concerns:

1. **JPA entity + repository** — `User` entity maps 1:1 to the users table from Specs 1.3 + 1.3b (21 columns). `UserRepository` is a Spring Data JPA repository with `findByEmailIgnoreCase` and `existsByEmailIgnoreCase` derived queries.
2. **Registration endpoint** — `POST /api/v1/auth/register` with anti-enumeration: existing email returns the same 200 shape as a new email (no "email already in use" leak), with the SAME timing.
3. **Login endpoint** — `POST /api/v1/auth/login` with timing equalization (always run a BCrypt match against a fixed dummy hash when the user is unknown) and rate limiting (per-email AND per-IP token buckets, 429 with `Retry-After` on exceed).
4. **Logout endpoint** — `POST /api/v1/auth/logout` is a no-op on the backend (stateless JWTs are client-side invalidated; no server-side session to kill). The endpoint exists for API symmetry and future httpOnly-cookie migration.

### JPA + Spring Data auto-config

Adding `spring-boot-starter-data-jpa` to the classpath activates Hibernate's `HibernateJpaAutoConfiguration`. This is a big auto-config — three things to watch:

- **`spring.jpa.hibernate.ddl-auto`** MUST be `validate` or `none`, NEVER `update` or `create`. Liquibase owns schema; Hibernate validates that the entities match. Set `spring.jpa.hibernate.ddl-auto=validate` in base `application.properties` so it applies to dev, test, and prod uniformly.
- **`spring.jpa.open-in-view`** MUST be `false`. Open-in-view keeps Hibernate sessions alive across the full HTTP response rendering, which hides lazy-loading bugs and has caused production issues in prior projects. Set explicitly `false` in base properties.
- **`spring.jpa.properties.hibernate.jdbc.time_zone=UTC`** — canonical JPA+timezone setup. All `TIMESTAMP WITH TIME ZONE` columns round-trip through Java's `OffsetDateTime` / `Instant` reliably when this is set.

These three properties are the baseline JPA config the whole rest of the Forums Wave will depend on. Get them right here.

### User entity — 21 columns, careful mapping

Spec 1.3 created 20 columns; Spec 1.3b added the 21st (`timezone`). The JPA entity must match. Column-by-column notes:

- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()` — entity has `@Id @Column(name = "id") private UUID id;` with NO `@GeneratedValue` (the DB generates via `gen_random_uuid()`; Hibernate reads it back after insert). Use `@GeneratedValue(strategy = GenerationType.UUID)` ONLY if Hibernate's UUID generation matches the DB default, which gets tricky cross-DB. Simplest: let the DB generate, use `@PrePersist` nothing, set `@Column(insertable = false, updatable = false)` on `id`.
  - **Alternative** (cleaner): set `id = UUID.randomUUID()` in the constructor/`@PrePersist` hook. Bypasses the DB default. Requires dropping the `gen_random_uuid()` default or letting it act as a no-op fallback. Plan phase picks.
- `email` — `@Column(unique = true, nullable = false, length = 255)`. Application layer normalizes to lowercase before save (see anti-enumeration below).
- `password_hash` — `@Column(name = "password_hash", nullable = false, length = 255)`. NEVER exposed in DTOs or `toString()`.
- `first_name`, `last_name`, `custom_display_name` — plain strings, `@Column` with explicit `name = "..."` since Java's camelCase field names don't auto-map to snake_case DB columns by default. Use Hibernate's `PhysicalNamingStrategyStandardImpl` or write them explicitly.
- `display_name_preference` — `@Enumerated(EnumType.STRING)` + Java enum `DisplayNamePreference { FIRST_ONLY, FIRST_LAST_INITIAL, FIRST_LAST, CUSTOM }`. Match the DB CHECK constraint values exactly (lowercase + underscore). Requires a Jackson custom (de)serializer or Hibernate converter to handle the snake_case strings.
- `avatar_url`, `bio`, `favorite_verse_reference`, `favorite_verse_text` — nullable strings. `@Column(name = "...")`.
- `is_admin`, `is_banned`, `is_email_verified`, `is_deleted` — `boolean` primitives with `@Column(name = "...")`.
- `joined_at`, `last_active_at`, `created_at`, `updated_at`, `deleted_at` — `OffsetDateTime` (preferred over `Instant` because `TIMESTAMPTZ` round-trips correctly with offset info). `@Column(name = "...")`.
- `timezone` — `@Column(nullable = false, length = 50)`. Java field name `timezone` matches DB name directly.

**Audit timestamps** — Spec 1.5 does NOT implement `@EntityListeners(AuditingEntityListener.class)` with Spring Data JPA auditing. Rationale: Liquibase already sets `DEFAULT NOW()` on `created_at`, `updated_at`, `joined_at`. The entity relies on the DB defaults on insert. For updates, the application can either: (a) manually set `updated_at = OffsetDateTime.now(ZoneOffset.UTC)` in service methods that mutate the user (simple, explicit); or (b) use a `@PreUpdate` hook. Spec 1.5 uses (a) — it's called in exactly one place (change-password flow, Spec 1.5c; not in 1.5). Defer full auditing infrastructure to a future spec if it becomes a pattern.

### Anti-enumeration on registration

The master plan: *"Register with existing email returns the same 200 response shape as a new email (no 'email already in use' leak)."*

**Implementation pattern:**

1. `AuthService.register(RegisterRequest)` checks `userRepository.existsByEmailIgnoreCase(email)`.
2. **If email exists:** return a `RegisterResponse` shaped identically to the success case — same JSON fields, same HTTP status (200). The "success" response contains a `token` and `user` object. For the existing-email case, return a token for the EXISTING user? Or a token for no user (returning an unusable token)? **Decision: return no token.** The response shape is `{ data: { registered: true }, meta: { requestId } }` for both cases. The frontend treats `registered: true` as success and proceeds to a follow-up "check your email" step (Phase 1's Spec 1.5d email verification assumes this pattern). No login JWT is issued at registration — user must then log in separately with their password. This matches the typical "sign up → verify email → log in" flow.
3. **Timing equalization:** BCrypt hashing is slow (~60ms). The new-email branch hashes the password; the existing-email branch must also "hash" something to keep timing equal. Use the `passwordEncoder.encode(password)` on BOTH branches (discarding the result in the existing-email branch). This adds ~60ms to the existing-email path, matching the new-email path.
4. **Logging:** Log distinct events at DEBUG level (`registerSucceeded userId=...`, `registerCollision email=***`) so ops can observe the actual behavior without exposing it through the HTTP response. Hash the email in logs (SHA-256 of lowercased email) — NEVER log raw email.

### Timing equalization on login

**Implementation pattern:**

1. `AuthService.login(email, password)`:
   - Look up user by email.
   - **If user does not exist:** call `passwordEncoder.matches(password, DUMMY_HASH)` and discard the result. Then throw `AuthException.invalidCredentials()` (generic "Invalid email or password" message, 401 `INVALID_CREDENTIALS`).
   - **If user exists:** call `passwordEncoder.matches(password, user.getPasswordHash())`. If false, throw `AuthException.invalidCredentials()`. If true, issue JWT and return `AuthResponse`.
2. `DUMMY_HASH` is a compile-time constant — the BCrypt hash of a fixed placeholder string (e.g., `"dummy-password-for-timing-equalization"`). Store as a `private static final String` in `AuthService`. Generate once at dev time with `BCryptPasswordEncoder().encode(...)` and paste the output. Do NOT generate it at runtime (non-deterministic; would break timing guarantees on the first login after startup).
3. **Test for timing leak:** `AuthServiceTest.loginUnknownEmail_matchesKnownEmailTiming_within100ms`. Measures 100 login attempts each for unknown-email and known-email-wrong-password cases. Asserts the median difference is below 100ms. Not perfect but catches egregious regressions (e.g., someone adding an early `return` for the unknown-email case).

### Rate limiting on login — new filter, disambiguated name

Master plan says create `com.worshiproom.auth.RateLimitFilter`. **This spec renames it to `LoginRateLimitFilter` to avoid collision with the existing `com.worshiproom.proxy.common.RateLimitFilter` (Key Protection Wave).** Rationale: two classes with the same simple name in different packages confuses filter-order debugging and makes grep-driven navigation unreliable. `LoginRateLimitFilter` is explicit about its scope.

**Filter ordering:**

- `RequestIdFilter` — `@Order(Ordered.HIGHEST_PRECEDENCE)`
- `RateLimitFilter` (proxy, `/api/v1/proxy/**`) — `@Order(Ordered.HIGHEST_PRECEDENCE + 10)`
- `LoginRateLimitFilter` (new, `/api/v1/auth/login`) — `@Order(Ordered.HIGHEST_PRECEDENCE + 20)`
- `JwtAuthenticationFilter` — `@Order(Ordered.HIGHEST_PRECEDENCE + 100)`

The login filter runs BEFORE JWT auth (no token on login attempts) and AFTER request-ID (so failed-login logs get a request ID). It uses `shouldNotFilter` scoping to match only `POST /api/v1/auth/login` — all other methods/paths pass through.

**Rate limiting policy:**

- **Per-email:** 5 attempts per 15-minute window. Bucket key = lowercased email.
- **Per-IP:** 20 attempts per 15-minute window. Bucket key = resolved client IP (reuse `IpResolver` from Key Protection Wave).
- **On exceed:** 429 Too Many Requests with `Retry-After: <seconds>` header. The error body uses the same `ProxyError` shape as the proxy rate limiter.
- **Enforcement:** BOTH buckets MUST pass. A bot hitting 20 emails from one IP in 15 min is per-IP blocked; a distributed bot hitting one email from 20 IPs in 15 min is per-email blocked.
- **Bucket storage:** Caffeine cache, `maximumSize(50_000)`, `expireAfterAccess(Duration.ofMinutes(30))`. Two separate caches (one per-email, one per-IP). Memory: ~10 MB worst case.

**Bucket4j integration:** Already on the classpath from the proxy rate limiter. Use the same `Bandwidth.classic(...)` pattern.

### DTOs and response shapes

- `RegisterRequest`:

  ```java
  public record RegisterRequest(
      @NotBlank @Email @Size(max = 255) String email,
      @NotBlank @Size(min = 12, max = 255) String password,
      @NotBlank @Size(max = 100) String firstName,
      @NotBlank @Size(max = 100) String lastName,
      @Size(max = 50) String timezone  // optional; defaults to "UTC" if omitted or invalid
  ) {}
  ```

  The `timezone` field is the forward-flagged addition from Spec 1.3b's execution note.

- `LoginRequest`:

  ```java
  public record LoginRequest(
      @NotBlank @Email @Size(max = 255) String email,
      @NotBlank @Size(max = 255) String password
  ) {}
  ```

- `RegisterResponse` — `{ registered: true }`. No `token`, no `user`. Email-verify flow (Spec 1.5d) will be the handoff point.
- `AuthResponse` (login success):

  ```java
  public record AuthResponse(String token, UserSummary user) {}
  public record UserSummary(
      UUID id,
      String email,
      String displayName,   // computed via DisplayNameResolver
      String firstName,
      String lastName,
      boolean isAdmin,
      String timezone
  ) {}
  ```

  Wrapped in `ProxyResponse.of(authResponse, requestId)` so the JSON shape is `{ data: { token, user }, meta: { requestId } }`.

### `DisplayNameResolver` — canonical algorithm from Decision 3

Pure function, no dependencies, ~20 lines. Four cases:

| Preference | Computed displayName |
|---|---|
| `FIRST_ONLY` | `firstName` |
| `FIRST_LAST_INITIAL` | `firstName + " " + lastName.charAt(0) + "."` (e.g., "Sarah J.") |
| `FIRST_LAST` | `firstName + " " + lastName` |
| `CUSTOM` | `customDisplayName` (non-null) OR `firstName` (fallback if `customDisplayName` is null) |

Put in `com.worshiproom.user` package. Unit test covers all four cases + the CUSTOM-null fallback.

### Error codes added in this spec

All use the existing `ProxyError` shape.

- `INVALID_CREDENTIALS` (401) — login with wrong email/password combo (generic message, no email/password feedback)
- `VALIDATION_FAILED` (400) — `@Valid` bean validation failures. Field-level errors in the response meta.
- `RATE_LIMITED` (429) — already exists in the proxy error catalog; reuse. Include `Retry-After` header.

## Files to create

### Backend production code

- `backend/src/main/java/com/worshiproom/user/User.java` — JPA entity matching the 21-column users table
- `backend/src/main/java/com/worshiproom/user/UserRepository.java` — Spring Data JPA repository (`extends JpaRepository<User, UUID>`)
- `backend/src/main/java/com/worshiproom/user/DisplayNameResolver.java` — pure-function display name resolver
- `backend/src/main/java/com/worshiproom/user/DisplayNamePreference.java` — enum with 4 values (FIRST_ONLY, FIRST_LAST_INITIAL, FIRST_LAST, CUSTOM)
- `backend/src/main/java/com/worshiproom/auth/AuthController.java` — `@RestController` with 3 endpoints
- `backend/src/main/java/com/worshiproom/auth/AuthService.java` — register/login/logout business logic
- `backend/src/main/java/com/worshiproom/auth/LoginRateLimitFilter.java` — per-email + per-IP rate limiting (renamed from master plan's `RateLimitFilter`)
- `backend/src/main/java/com/worshiproom/auth/dto/RegisterRequest.java` — record with validation annotations
- `backend/src/main/java/com/worshiproom/auth/dto/LoginRequest.java` — record with validation annotations
- `backend/src/main/java/com/worshiproom/auth/dto/RegisterResponse.java` — `{ registered: true }`
- `backend/src/main/java/com/worshiproom/auth/dto/AuthResponse.java` — `{ token, user }` (login success)
- `backend/src/main/java/com/worshiproom/auth/dto/UserSummary.java` — nested user shape used by `AuthResponse`

### Backend test code

- `backend/src/test/java/com/worshiproom/user/UserTest.java` — entity mapping + column-name sanity tests (Hibernate boots without errors)
- `backend/src/test/java/com/worshiproom/user/UserRepositoryTest.java` — `@DataJpaTest` with Testcontainers: `findByEmailIgnoreCase`, `existsByEmailIgnoreCase`, case-insensitive match
- `backend/src/test/java/com/worshiproom/user/DisplayNameResolverTest.java` — all 4 preference cases + CUSTOM-null fallback (5 tests)
- `backend/src/test/java/com/worshiproom/auth/AuthServiceTest.java` — unit tests with mocked dependencies (register new, register collision, login success, login unknown email, login wrong password, timing equalization)
- `backend/src/test/java/com/worshiproom/auth/LoginRateLimitFilterTest.java` — per-email and per-IP bucket behavior with MockMvc
- `backend/src/test/java/com/worshiproom/auth/AuthControllerIntegrationTest.java` — full `@SpringBootTest` end-to-end via Testcontainers. Standalone pattern (Spec 1.7's `AbstractIntegrationTest` not yet landed).

## Files to modify

- `backend/pom.xml` — add `spring-boot-starter-data-jpa` (version managed by Spring Boot BOM)
- `backend/src/main/resources/application.properties` — add JPA config:

  ```properties
  # ─── JPA / Hibernate ───────────────────────────────────────────────────────
  # Liquibase owns schema; Hibernate validates only. NEVER set to update/create.
  spring.jpa.hibernate.ddl-auto=validate
  # open-in-view=false surfaces lazy-loading bugs during development
  # rather than hiding them behind the open session.
  spring.jpa.open-in-view=false
  # Canonical JPA + timezone setup for TIMESTAMPTZ columns.
  spring.jpa.properties.hibernate.jdbc.time_zone=UTC
  # Rate-limit policy for POST /api/v1/auth/login (shipped in Spec 1.5).
  auth.rate-limit.per-email.capacity=5
  auth.rate-limit.per-email.window-minutes=15
  auth.rate-limit.per-ip.capacity=20
  auth.rate-limit.per-ip.window-minutes=15
  ```

- `backend/src/main/java/com/worshiproom/auth/PublicPaths.java` — no change (register + login already in the list from Spec 1.4; verify)
- `backend/src/main/java/com/worshiproom/auth/SecurityConfig.java` — add `.requestMatchers("/api/v1/auth/logout").permitAll()` to the public-route list. Logout is JWT-stateless and doesn't need auth; if a user wants to "log out" they just drop the token on the client. Keeping it public avoids unnecessary 401s if the token is expired when they click logout.

**Explicitly NOT modified in this spec** (will be modified by downstream specs):

- `frontend/src/contexts/AuthContext.tsx` — Spec 1.9
- `frontend/src/components/prayer-wall/AuthModal.tsx` — Spec 1.9 (includes the browser-timezone detection forward-flagged by Spec 1.3b)
- OpenAPI spec at `backend/src/main/resources/openapi.yaml` — see "Notes for plan phase recon" item #12

## Database changes

None. Schema is already in place from Specs 1.3 + 1.3b. This spec only wires the JPA entity to the existing table.

**Important validation:** `spring.jpa.hibernate.ddl-auto=validate` will cause Spring Boot startup to FAIL if the `User` entity columns don't match the DB schema exactly (names, nullability, types). This is by design — it's the safety net. Getting the entity right requires careful column-by-column checking.

## API changes

### New endpoints

- `POST /api/v1/auth/register` — public. Body: `RegisterRequest`. Response: 200 + `{ data: { registered: true }, meta: { requestId } }` (same shape for new and existing email). 400 on validation failure with field-level errors.
- `POST /api/v1/auth/login` — public. Body: `LoginRequest`. Response: 200 + `{ data: { token, user }, meta: { requestId } }` on success. 401 + `INVALID_CREDENTIALS` on wrong email or password (timing-equalized). 429 + `Retry-After` on rate limit. 400 on validation failure.
- `POST /api/v1/auth/logout` — public. No body. Response: 204 No Content. Server-side no-op (stateless JWT).

All three endpoints are in `PublicPaths.PATTERNS` (already handled for register/login in Spec 1.4; this spec adds logout).

### Behavior changes to existing endpoints

None.

## Copy Deck

User-facing error messages (all under the `ProxyError` shape's `message` field):

- **INVALID_CREDENTIALS (401):** `"Invalid email or password."` — identical for wrong email and wrong password. Never reveals which was wrong.
- **VALIDATION_FAILED (400):** Default Spring validation messages. Email format invalid: `"must be a well-formed email address"`. Password too short: `"size must be between 12 and 255"`. First name missing: `"must not be blank"`. These are standard Spring defaults and are acceptable for API consumers (the frontend remaps them for display in Spec 1.9).
- **RATE_LIMITED (429):** `"Too many login attempts. Please try again in <N> minutes."` — interpolate the retry-after duration.

Anti-pressure language is not applicable — these are 400/401/429 responses to programmatic callers. The frontend in Spec 1.9 will wrap the error display with anti-pressure copy.

## Anti-Pressure Copy Checklist

- [x] No FOMO language (N/A — error messages only)
- [x] No shame language (N/A — `INVALID_CREDENTIALS` is neutral: "Invalid email or password", not "You entered the wrong password")
- [x] No exclamation points near vulnerability (N/A)
- [x] No streak-as-shame messaging (N/A)
- [x] No comparison framing (N/A)
- [x] Scripture as gift, not decoration (N/A — no scripture in this spec)

## Anti-Pressure Design Decisions

- **Generic credential error message.** Users who fail login don't get told which of email or password was wrong. This is a security property (prevents email enumeration) AND an anti-pressure property (no specific "you got your password wrong" shame trigger). Good alignment.
- **Rate limit copy** uses neutral language ("Too many login attempts" not "You've tried too many times"). 2nd-person "you" is avoided in error copy per `02-security.md` best practices.

## Acceptance criteria

### Dependency + configuration

- [ ] `backend/pom.xml` includes `spring-boot-starter-data-jpa` (version managed by Spring Boot BOM)
- [ ] `application.properties` sets `spring.jpa.hibernate.ddl-auto=validate`, `spring.jpa.open-in-view=false`, `spring.jpa.properties.hibernate.jdbc.time_zone=UTC`, plus the four `auth.rate-limit.*` properties
- [ ] `SecurityConfig` adds `/api/v1/auth/logout` to the public route list

### User entity + repository

- [ ] `User.java` exists with all 21 fields from the users table schema, correct Java types, correct `@Column(name = "...")` mappings
- [ ] `UserRepository.java` extends `JpaRepository<User, UUID>` with `findByEmailIgnoreCase(String email)` and `existsByEmailIgnoreCase(String email)` methods
- [ ] `DisplayNamePreference.java` enum has exactly 4 values: `FIRST_ONLY`, `FIRST_LAST_INITIAL`, `FIRST_LAST`, `CUSTOM`
- [ ] Spring Boot starts cleanly with `spring.jpa.hibernate.ddl-auto=validate` (proves the entity matches the DB schema exactly)

### Registration

- [ ] `POST /api/v1/auth/register` with valid body creates a user and returns 200 with `{ data: { registered: true }, meta: { requestId } }`
- [ ] Register with existing email returns the SAME 200 response shape (no "email already in use" leak)
- [ ] Timing test: `registerWithExistingEmail_matchesRegisterWithNewEmailTiming_within100ms` passes (median difference below 100ms over 50 iterations each)
- [ ] Register with password < 12 chars returns 400 with field-level error for `password`
- [ ] Register with invalid email format returns 400 with field-level error for `email`
- [ ] Register with missing firstName or lastName returns 400
- [ ] Register with valid timezone (e.g., `"America/Chicago"`) persists that timezone
- [ ] Register with omitted timezone defaults to `"UTC"` on the persisted user
- [ ] Register with invalid timezone string (e.g., `"Not/AZone"`) defaults to `"UTC"` (silent fallback — master plan policy: never block registration over timezone detection)
- [ ] Register persists `password_hash` as a BCrypt hash (starts with `$2a$10$` or `$2b$10$`)
- [ ] Register NEVER logs the raw password (grep the log for the known plaintext after a test run — expect zero matches)
- [ ] Register NEVER logs the raw email (grep the log for the known email — expect zero matches; hashed email is OK)

### Login

- [ ] `POST /api/v1/auth/login` with correct credentials returns 200 with `{ data: { token, user }, meta: { requestId } }`
- [ ] The returned token validates against `JwtService.parseToken()` and contains the correct user ID as `sub`
- [ ] Login with wrong password returns 401 with generic `INVALID_CREDENTIALS` message "Invalid email or password."
- [ ] Login with unknown email returns 401 with the SAME generic `INVALID_CREDENTIALS` message
- [ ] Timing test: `loginUnknownEmail_matchesKnownEmailWrongPasswordTiming_within100ms` passes (median difference below 100ms over 100 iterations each)
- [ ] 6th login attempt within 15 minutes for the same email returns 429 with `Retry-After` header
- [ ] 21st login attempt within 15 minutes from the same IP (across different emails) returns 429 with `Retry-After` header
- [ ] Rate limit resets after the configured window (test uses time-manipulation, not actual 15-minute wait)
- [ ] Login success log line does NOT include the password (grep for plaintext — zero matches)
- [ ] Email in logs is hashed (SHA-256 prefix)

### Logout

- [ ] `POST /api/v1/auth/logout` returns 204 No Content with empty body
- [ ] Logout works with or without a JWT in the `Authorization` header (no rejection)
- [ ] Logout is a no-op — calling it twice in a row both return 204

### Display name resolver

- [ ] `DisplayNameResolverTest` has exactly 5 tests covering all 4 preference values + CUSTOM-null fallback
- [ ] `FIRST_ONLY` for Sarah Johnson returns `"Sarah"`
- [ ] `FIRST_LAST_INITIAL` for Sarah Johnson returns `"Sarah J."`
- [ ] `FIRST_LAST` for Sarah Johnson returns `"Sarah Johnson"`
- [ ] `CUSTOM` with `customDisplayName="Sari"` returns `"Sari"`
- [ ] `CUSTOM` with `customDisplayName=null` falls back to `firstName`

### Integration + regression

- [ ] `AuthControllerIntegrationTest` covers all happy paths + security edge cases via Testcontainers
- [ ] `./mvnw test` passes — 321 pre-existing tests still green, plus 30-50 new tests. Total ~351-371.
- [ ] `./mvnw spring-boot:run -Dspring-boot.run.profiles=dev` starts cleanly, all three providers still `configured: true` at `/api/v1/health`
- [ ] Proxy endpoints still work unauthenticated with per-IP rate limiting intact
- [ ] `grep -iE 'aiza|key=|signature=' /tmp/backend.log` returns zero matches
- [ ] `backend/.gitignore` still ignores `.env` (verify only; should be unchanged)
- [ ] No password appears in any log line at any level (canary: register with password `"canary-password-12345"`, grep log, expect zero matches)

## Testing notes

### Test distribution

- `DisplayNameResolverTest.java` — 5 tests
- `UserTest.java` — 2-3 tests (entity-boots-cleanly sanity)
- `UserRepositoryTest.java` — 5-8 tests (`@DataJpaTest` + Testcontainers)
- `AuthServiceTest.java` — 10-15 tests (unit tests, mocked repo + encoder)
- `LoginRateLimitFilterTest.java` — 5-8 tests (MockMvc, per-email and per-IP buckets)
- `AuthControllerIntegrationTest.java` — 10-15 tests (`@SpringBootTest` + Testcontainers)

Total: ~37-54 new tests.

### Mandatory `AuthServiceTest` coverage

| Test | Expected behavior |
|---|---|
| `registerWithNewEmailCreatesUser` | User row persisted; password hashed; response shape correct |
| `registerWithExistingEmailReturnsSameShape` | No new row inserted; response identical to new-email case |
| `registerWithExistingEmail_matchesNewEmailTiming_within100ms` | 50 iterations each; median delta < 100ms |
| `registerNormalizesEmailToLowercase` | "Foo@BAR.com" persists as "foo@bar.com" |
| `registerWithOmittedTimezoneDefaultsToUTC` | Persisted timezone = "UTC" |
| `registerWithInvalidTimezoneDefaultsToUTC` | "Not/AZone" silently becomes "UTC" (logged as warning) |
| `registerWithValidTimezonePersistsIt` | "America/Chicago" persists correctly |
| `registerNeverLogsRawPassword` | Canary password not in log output |
| `loginWithCorrectCredentialsReturnsToken` | Token is a valid JWT with sub=userId, is_admin claim correct |
| `loginWithWrongPasswordThrowsInvalidCredentials` | AuthException.invalidCredentials() raised |
| `loginWithUnknownEmailThrowsInvalidCredentials` | Same exception; dummy hash matched first |
| `loginUnknownEmail_matchesKnownEmailWrongPasswordTiming_within100ms` | 100 iterations each; median delta < 100ms |
| `loginEmailLookupIsCaseInsensitive` | "FOO@bar.com" logs in as "foo@bar.com" |

### Mandatory `LoginRateLimitFilterTest` coverage

| Test | Expected behavior |
|---|---|
| `within5AttemptsPerEmail_noLimit` | First 5 attempts for same email all pass filter |
| `sixthAttemptPerEmail_returns429` | 6th attempt in same window returns 429 with Retry-After |
| `differentEmails_differentBuckets` | 5 attempts for email A + 5 for email B = no 429 |
| `within20AttemptsPerIp_noLimit` | 20 distinct emails from same IP all pass |
| `twentyFirstAttemptPerIp_returns429` | 21st attempt from same IP returns 429 |
| `rateLimitHeadersPresent` | X-RateLimit-Remaining, Retry-After set correctly |
| `filterSkipsNonLoginPaths` | POST to /api/v1/auth/register is NOT rate-limited by this filter |
| `filterSkipsGetOnLoginPath` | GET /api/v1/auth/login (nonexistent route) is NOT rate-limited — only POST |

### Mandatory `AuthControllerIntegrationTest` coverage (highlights)

- Register → login → use token on a protected route (e.g., hit `/api/v1/users/me` when 1.6 lands; for 1.5 standalone, hit any non-public `/api/v1/**` route and expect 404-not-401, proving auth accepted the token)
- Register twice with same email, confirm response shape identical both times
- Login with correct credentials, confirm returned token's `sub` claim equals the created user's ID
- Login with wrong password + login with unknown email, confirm both return identical 401 bodies
- Register-then-login round trip: the login response's `user.displayName` matches `DisplayNameResolver.resolve(createdUser)` exactly
- Timezone round-trip: register with `timezone=America/Chicago`, login, confirm `AuthResponse.user.timezone=="America/Chicago"`

### Manual verification steps

1. Start backend: `./mvnw spring-boot:run -Dspring-boot.run.profiles=dev`
2. Register a new user:

   ```bash
   curl -v -X POST http://localhost:8080/api/v1/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"hunter2hunter2","firstName":"Test","lastName":"User","timezone":"America/Chicago"}'
   ```

   Expect 200 with `{"data":{"registered":true},"meta":{"requestId":"..."}}`.
3. Register again with same email — expect same 200 shape.
4. Verify in psql: `SELECT email, timezone, display_name_preference FROM users;` — exactly one row.
5. Login:

   ```bash
   curl -v -X POST http://localhost:8080/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"hunter2hunter2"}'
   ```

   Expect 200 with token + user.
6. Login with wrong password — expect 401 with `"Invalid email or password."`.
7. Login 6 times in rapid succession — 6th returns 429 with `Retry-After`.
8. Hit a protected route with the token: `curl -H "Authorization: Bearer <token>" http://localhost:8080/api/v1/users/me` — expect 404 (route doesn't exist yet; Spec 1.6), NOT 401.
9. Logout: `curl -X POST http://localhost:8080/api/v1/auth/logout` — expect 204.
10. Log inspection: `tail -f /tmp/backend.log | grep -iE 'hunter2|test@example'` — expect zero matches to the raw password, zero matches to the raw email.

## Notes for plan phase recon

1. **Spring Data JPA auto-config is the biggest auto-config surface yet.** Per the Phase 1 lesson pattern (Specs 1.2 + 1.3 + 1.4 all tripped on Spring Boot auto-config), expect this to cascade. Likely failure modes:
   - Adding the JPA starter without `ddl-auto=validate` causes `update` (the Spring Boot default if a managed datasource is detected) — Hibernate tries to ALTER the schema and fails against the Liquibase-owned users table. Set `ddl-auto=validate` in the SAME commit as adding the starter.
   - Slice tests (`@WebMvcTest`) may now try to auto-configure a datasource and fail. If existing slice tests break after adding the JPA starter, the fix is the same pattern as Spec 1.4: `excludeAutoConfiguration = {DataSourceAutoConfiguration.class, HibernateJpaAutoConfiguration.class}` on the affected slice tests — or extend the `SecurityAutoConfiguration` exclusion to include JPA.
2. **`spring.jpa.hibernate.ddl-auto=validate` will immediately surface any mismatch between the `User` entity and the 21-column DB schema.** Plan phase should include a detailed column-by-column review of the entity vs. the Spec 1.3 + 1.3b changesets BEFORE writing the entity. One wrong `@Column(name=...)` and Spring Boot fails to start with a cryptic Hibernate error. Get this right on the first pass.
3. **`User.id` generation strategy.** Two options:
   - **(A)** DB default: `@Id @Column(insertable = false, updatable = false) private UUID id;` — requires `Hibernate.refresh()` or `saveAndFlush()` to read back the generated ID. Simpler schema story.
   - **(B)** Application-generated: `@PrePersist` hook sets `id = UUID.randomUUID()`. Works cleanly with `save()`. Means the `gen_random_uuid()` DB default is vestigial (never used).

   Recommendation: (B). Cleaner test stories, no surprise `null` IDs during test assertions, DB default acts as a safety net for direct SQL inserts. If you disagree and want (A), flag before writing code.
4. **Timing-equalization testing is flaky by nature.** The `within100ms` budget is generous but CI machines vary. Mitigation:
   - Warm up BCrypt with 3-5 throwaway calls before measuring
   - Measure median, not mean (robust against single outliers)
   - 50-100 iterations each to stabilize
   - If the test still flakes on CI, widen to `within200ms`. Document any widening in Execution Log.
5. **Anti-enumeration response shape decision.** Master plan AC says "Register with existing email returns the same 200 response". Two valid interpretations:
   - **(A)** Return `{ data: { registered: true } }` for both. No JWT issued at registration; user must log in separately. (This spec picks A.)
   - **(B)** Return `{ data: { token, user } }` for both — but for existing-email, the "token" is a throwaway signed for a fake user. Prevents any differential behavior at the HTTP layer.

   (A) is simpler and matches the typical "register → verify email → log in" flow. (B) is paranoid. Decision locked to (A) unless plan phase surfaces a reason to reconsider.
6. **Testcontainers PostgreSQL reuse.** `LiquibaseSmokeTest` and `SecurityConfigIntegrationTest` each spin up their own container. Adding `UserRepositoryTest` (`@DataJpaTest`) and `AuthControllerIntegrationTest` (`@SpringBootTest`) each spin up MORE containers. Test runtime will jump. Spec 1.7 introduces `AbstractIntegrationTest` with a shared container, which is the right long-term fix. For now, Spec 1.5 accepts the runtime cost. If CI runtime becomes unacceptable (> 5 minutes for the full test suite), use the Testcontainers `.withReuse(true)` flag temporarily — document in Execution Log.
7. **`@DataJpaTest` replaces the DB with H2 by default.** We do NOT want H2 (per `06-testing.md` "Never use H2 for testing"). Override with `@AutoConfigureTestDatabase(replace = Replace.NONE)` + Testcontainers `@DynamicPropertySource`. Same pattern that `LiquibaseSmokeTest` uses.
8. **`BCryptPasswordEncoder.matches()` is constant-time for equal-length hashes.** Spring Security's implementation uses `MessageDigest.isEqual`-like comparison internally. This is why the dummy-hash approach works — `matches(password, DUMMY_HASH)` takes the same time as `matches(password, realHash)`. If JDK or Spring Security is ever swapped for a different encoder, revisit this assumption.
9. **`LoginRateLimitFilter` scope must be strict.** `shouldNotFilter(request)` returns `true` unless `POST /api/v1/auth/login`. Missing this will silently rate-limit register AND logout, breaking unrelated flows.
10. **Logging email safely.** `AuthService` should log hashed emails:

    ```java
    private static String hashEmail(String email) {
        return "email_" + Hashing.sha256().hashString(email.toLowerCase(), StandardCharsets.UTF_8).toString().substring(0, 16);
    }
    ```

    Short prefix + 16 hex chars is greppable but non-reversible. Use Guava's `Hashing` (already transitively available via Spring Boot) or `java.security.MessageDigest` directly.
11. **`JwtService.generateToken()` signature.** Spec 1.4 defined `generateToken(UUID userId, boolean isAdmin)`. AuthService needs the user's `is_admin` from the entity at login time. Add it to the `UserSummary` DTO too, and use the same field in the JWT claims.
12. **OpenAPI spec.** `.claude/rules/03-backend-standards.md` says OpenAPI lives at `backend/src/main/resources/openapi.yaml` and is EXTENDED (not recreated) by every endpoint-adding spec. Verify whether that file exists yet (Key Protection Wave may have created it for proxy endpoints). If it doesn't exist, decision: (a) create it as part of Spec 1.5 with the auth endpoints, or (b) defer OpenAPI foundation to a dedicated infra spec and skip the file for now. Check the current file state in plan phase and pick. My recommendation is (a) — create it here with auth endpoints; proxy endpoints get documented later when convenient.
13. **`RegisterRequest` field validation is application-layer.** Bean Validation (`@NotBlank`, `@Email`, `@Size`) catches validation errors BEFORE they reach `AuthService`. The service layer can assume inputs are well-formed, which simplifies internal logic. Use `@Valid @RequestBody RegisterRequest request` on the controller method.
14. **Pre-flight baseline checks:**
    - `./mvnw test` passes 321/0/0 on current branch (after Spec 1.4)
    - `./mvnw spring-boot:run -Dspring-boot.run.profiles=dev` starts cleanly with postgres up
    - `/api/v1/health` returns all three providers `configured: true`
    - `/api/v1/proxy/ai/explain` still round-trips with per-IP rate limiting
    - If any baseline is red, flag before attributing failures to this spec's work.
15. **Deviation from master plan's Files-to-create list:** Master plan says `backend/src/main/java/com/worshiproom/auth/RateLimitFilter.java`. This spec renames to `LoginRateLimitFilter.java` to avoid collision with the existing `com.worshiproom.proxy.common.RateLimitFilter`. Rationale in Approach section. Document this renaming in the Execution Log deviation list.

## Out of scope

- **Password reset flow** (`/forgot-password`, `/reset-password`) — Spec 1.5b
- **Change password endpoint** — Spec 1.5c
- **Email verification flow** (`/verify-email`, `/resend-verification`) — Spec 1.5d
- **Change email with re-verification** — Spec 1.5e
- **Account lockout / brute-force protection** (locks after N failed attempts) — Spec 1.5f (this is a DIFFERENT concern from rate limiting; rate limiting blocks rapid attempts, lockout blocks sustained attacks over longer windows)
- **Session invalidation / logout-all-devices** — Spec 1.5g (requires a JTI-to-user mapping table; this spec's logout is a pure no-op)
- **Frontend AuthContext + AuthModal wiring to these endpoints** — Spec 1.9. Includes browser-timezone detection via `Intl.DateTimeFormat().resolvedOptions().timeZone` (forward-flagged by Spec 1.3b).
- **User profile update endpoint** (`PATCH /api/v1/users/me`) — Spec 1.6 (or a dedicated settings spec)
- **Admin-role management** — The `is_admin` column is populated only via DB seed or direct SQL UPDATE. No endpoint to grant/revoke admin in MVP.
- **2FA / MFA** — future enhancement per `02-security.md`
- **Refresh tokens** — deferred (1-hour tokens + re-login on expiry for MVP)
- **JWT in httpOnly cookies** — deferred (in-memory React state for MVP)
- **OAuth / SSO** — not in scope for Forums Wave
- **GDPR-style "export my data"** — Spec 10.11 (data retention + deletion)
- **Honeypot fields on registration form** — frontend concern, deferred
- **CAPTCHA** — only if abuse patterns emerge post-launch; not in MVP

## Out-of-band notes for Eric

- **This spec is a lot.** Size L is accurate, maybe even undersold. Expect ~8-12 production files, ~6 test files, ~40 new tests. Plan phase will take CC longer than prior Phase 1 plans; execution will take longer still. Don't panic if CC needs two or three stop-and-ask cycles.
- **The security-sensitive parts (anti-enumeration, timing equalization, rate limiting) have very specific correctness invariants.** The code review checklist must explicitly verify: (a) both register paths call `passwordEncoder.encode()`, (b) both login paths call `passwordEncoder.matches()`, (c) `LoginRateLimitFilter` scope is strict to POST /api/v1/auth/login, (d) no raw email or password appears in logs at any level.
- **JPA entity correctness is the #1 risk.** `spring.jpa.hibernate.ddl-auto=validate` will force perfection at startup, but the error messages are cryptic. If CC hits a validation error, it should share the full stack trace and the entity definition; I'll diff it against the changesets.
- **Timing tests are flaky.** The `within100ms` budgets may need tuning. If CI is slower than dev laptop, widen to `within200ms` with a comment. Don't remove the tests — they're the canary for whether anti-enumeration and timing-equalization actually work.
- **`LoginRateLimitFilter` bucket memory.** 50,000 buckets × ~100 bytes = ~5 MB. For a dev laptop or MVP production load this is fine. Redis-backed rate limiting is a Phase 5+ concern when we go multi-instance.
- **Testcontainers startup time will dominate.** Three or four `@SpringBootTest` / `@DataJpaTest` test classes, each spinning up a container (until Spec 1.7 consolidates), means the test suite runtime jumps from ~30 seconds to maybe ~90 seconds. Acceptable for Phase 1; Spec 1.7 is the fix.
- **Don't wire the frontend here.** Even when CC is "done" and looking for more to do, reject frontend wiring requests. Spec 1.9 owns it, and Spec 1.9 has its own recon + plan + execute cycle. Scope creep is the #1 risk after security correctness.
- **If anything in the `User` entity mapping feels ambiguous or the ddl-auto=validate error is cryptic, stop and surface.** Entity mistakes compound — one wrong column name cascades through every test. Catch it before the integration tests run.
- **Test count after Spec 1.5: ~351-371.** Baseline of 321 + 30-50 new. If CC ends below 351 flag for coverage gap; if above 380 flag for possible duplication between `AuthServiceTest` and `AuthControllerIntegrationTest`.
