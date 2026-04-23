# Spec 1.4 — Spring Security and JWT Setup

> **Pipeline note for Eric:** Invoke with `--from-branch` to stay on the current Forums Wave working branch (all 156 specs share one branch). Paste everything below the horizontal rule into `/spec-forums`.
>
> **⚠️ Heads-up before you paste:** Spec 1.4 is the largest and riskiest Phase 1 spec so far — **L / Medium-High risk**. It introduces the Spring Security filter chain on top of the existing shipped proxy filter chain (RequestIdFilter, RateLimitFilter). Filter ordering and `shouldNotFilter` scoping are the two silent-failure modes to watch for. Expect 10-20 tests, a new `auth/` package, ~6 new Java files, and careful `SecurityConfig` wiring. The spec is deliberately scoped to plumbing only — no endpoints, no frontend, no real user registration flow. Those arrive in Specs 1.5 / 1.6 / 1.9.

---

### Spec 1.4 — Spring Security and JWT Setup

- **ID:** `round3-phase01-spec04-spring-security-jwt`
- **Phase:** 1 — Backend Foundation
- **Size:** L
- **Risk:** **Medium-High** (v2.7: increased from Medium — must coexist with the shipped proxy filter chain without breaking rate-limit enforcement or request-ID threading)
- **Prerequisites:** Spec 1.3 (Liquibase Integration and First Changeset) ✅, Spec 1.3b (Users Table Timezone Column) ✅
- **Goal:** Add Spring Security + JJWT to the backend. Configure a `JwtAuthenticationFilter` that validates bearer tokens and sets the Spring Security `Authentication` principal to the user ID. Configure `SecurityConfig` to require auth on `/api/v1/**` routes except the documented public exceptions. Add a BCrypt password encoder bean. Ship unit tests for `JwtService` (sign + parse + expiry + tamper detection). **No endpoints, no user registration, no frontend wiring — that's Specs 1.5 / 1.6 / 1.9.**

---

## Affected Frontend Routes

N/A — backend-only spec. No frontend code touched. `/verify-with-playwright` should be skipped.

The frontend AuthContext JWT migration is explicitly deferred to Spec 1.9.

---

## Approach

### Filter coexistence — the critical design constraint

The backend already has two filters at specific orders:

- `RequestIdFilter` at `@Order(Ordered.HIGHEST_PRECEDENCE)` — threads a 22-char request ID into MDC for every request
- `RateLimitFilter` at `@Order(Ordered.HIGHEST_PRECEDENCE + 10)` with `shouldNotFilter` scoping to `/api/v1/proxy/**` — per-IP rate limiting for the anonymous proxy layer

`JwtAuthenticationFilter` MUST be ordered AFTER both. Suggested: `@Order(Ordered.HIGHEST_PRECEDENCE + 100)`. This ordering is load-bearing:

1. Every authenticated request still gets a request ID threaded through MDC (RequestIdFilter runs first — all logs during the request lifecycle share that ID)
2. Anonymous proxy traffic on `/api/v1/proxy/**` still gets per-IP rate limiting before auth even tries to run (RateLimitFilter runs at +10, auth at +100)
3. Auth runs last so it can assume both request-ID context and rate-limit enforcement are already in place

### Public vs authenticated routes

`SecurityConfig` configures these as **PUBLIC** (no auth required):

- `/api/v1/health` — provider readiness endpoint (shipped in Key Protection Wave; must stay public for uptime probes)
- `/api/health` — legacy health alias (preserved from Spec 1.1; deferred retirement)
- `/api/hello` — legacy trivial endpoint (preserved from Spec 1.1)
- `/api/v1/auth/register` — will be implemented in Spec 1.5; registered as public now so the filter chain is ready
- `/api/v1/auth/login` — same
- `/api/v1/proxy/**` — Key Protection Wave explicitly documented "Per-IP until JWT auth lands. Once auth is wired, per-user takes precedence for authenticated endpoints." **Spec 1.4 does NOT implement per-user precedence — that's a post-Phase-1 enhancement (likely Phase 6 or dedicated ops spec).** For now, proxy endpoints stay anonymous-accessible with per-IP rate limiting. If an authenticated user hits a proxy endpoint, the JWT should be IGNORED (not rejected) — `permitAll()` on `/api/v1/proxy/**` achieves this.
- `/actuator/health`, `/actuator/info` — Spring Actuator health endpoints (already configured in `application.properties` to expose `health,info`)
- CORS preflight `OPTIONS` on every path — MANDATORY per `03-backend-standards.md` § Filter ordering to prevent JWT filter from eating preflight requests

All other `/api/v1/**` routes are **AUTHENTICATED** (401 UNAUTHORIZED if no valid JWT).

### JWT design

- **Algorithm:** HS256 (HMAC-SHA256) — matches `.claude/rules/02-security.md`
- **Claims:** `sub` (user UUID as string), `iat` (issued at), `exp` (expiry), `is_admin` (boolean, default false)
- **Expiry:** 1 hour (`JWT_EXPIRATION=3600` seconds — env var from `08-deployment.md`)
- **Secret:** Read from `JWT_SECRET` env var. Dev profile has a clearly-labeled development fallback value; prod MUST fail fast if the env var is unset. No hardcoded production secret.
- **Library:** `io.jsonwebtoken:jjwt` (version 0.12.x — current stable). Three artifacts needed: `jjwt-api` (compile), `jjwt-impl` (runtime), `jjwt-jackson` (runtime for JSON serialization).

### BCrypt password encoder

A single `@Bean` exposing `BCryptPasswordEncoder` (Spring Security default strength = 10, acceptable for MVP). The bean is used by the auth service (Spec 1.5) and by the timing-equalization dummy-hash path (Spec 1.5's anti-enumeration) — making it available as a reusable bean avoids both specs needing to construct their own encoder.

### `AuthenticatedUser` helper

A small record or class that wraps `Authentication.getPrincipal()` into a typed `UserId` + `isAdmin` accessor. Controllers in Specs 1.5+ can inject `AuthenticatedUser` (via a custom `@AuthenticationPrincipal` resolver or a `@Component` argument resolver) rather than reaching into `SecurityContextHolder` directly. This is scaffolding for future controllers, not a full implementation — the simplest viable shape that gives controllers type-safe access is fine.

## Files to create

- `backend/src/main/java/com/worshiproom/auth/JwtService.java` — signing + parsing + expiry validation + tamper detection. Single class, ~80 lines.
- `backend/src/main/java/com/worshiproom/auth/JwtAuthenticationFilter.java` — extends `OncePerRequestFilter`. Reads `Authorization: Bearer <token>`, validates via `JwtService`, sets `SecurityContextHolder` authentication. `@Order(Ordered.HIGHEST_PRECEDENCE + 100)`.
- `backend/src/main/java/com/worshiproom/auth/SecurityConfig.java` — `@Configuration` + `@EnableWebSecurity`. Defines `SecurityFilterChain` bean. Registers `JwtAuthenticationFilter` via `addFilterAfter(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)`. Configures public routes list explicitly.
- `backend/src/main/java/com/worshiproom/auth/AuthenticatedUser.java` — small record/helper exposing `UUID userId()` and `boolean isAdmin()` for controller injection.
- `backend/src/main/java/com/worshiproom/auth/JwtConfig.java` — `@ConfigurationProperties(prefix = "jwt")` binding for `JWT_SECRET` and `JWT_EXPIRATION`. OR inline `@Value` in `JwtService` — either pattern is acceptable; pick one and be consistent with `ProxyConfig`'s style.
- `backend/src/main/java/com/worshiproom/auth/PasswordConfig.java` — `@Configuration` with a single `@Bean BCryptPasswordEncoder passwordEncoder()`. Could also live inside `SecurityConfig`; separate file preferred for clarity.
- `backend/src/test/java/com/worshiproom/auth/JwtServiceTest.java` — unit tests covering all happy and sad paths for `JwtService` (see Testing notes for enumeration).
- `backend/src/test/java/com/worshiproom/auth/JwtAuthenticationFilterTest.java` — unit tests for the filter using `MockMvc` + mocked `JwtService`.
- `backend/src/test/java/com/worshiproom/auth/SecurityConfigIntegrationTest.java` — `@SpringBootTest` integration test that verifies the actual filter chain ordering and public-vs-authenticated route enforcement. Uses Testcontainers via the same standalone pattern as `LiquibaseSmokeTest` (Spec 1.7's `AbstractIntegrationTest` hasn't landed yet).

## Files to modify

- `backend/pom.xml` — add three new dependencies:
  - `org.springframework.boot:spring-boot-starter-security` (version managed by Spring Boot BOM)
  - `io.jsonwebtoken:jjwt-api:0.12.6` (compile scope)
  - `io.jsonwebtoken:jjwt-impl:0.12.6` (runtime scope)
  - `io.jsonwebtoken:jjwt-jackson:0.12.6` (runtime scope)
- `backend/src/main/resources/application.properties` — add JWT config section:
  ```properties
  # ─── JWT ───────────────────────────────────────────────────────────────────
  jwt.secret=${JWT_SECRET:}
  jwt.expiration-seconds=${JWT_EXPIRATION:3600}
  ```
  The empty `:` default for `JWT_SECRET` means if the env var is unset in a non-dev profile, the property binds to empty string. The `JwtService` bean's `@PostConstruct` validation MUST reject empty strings in non-dev profiles (see Testing notes).
- `backend/src/main/resources/application-dev.properties` — add a dev-only JWT_SECRET fallback, clearly labeled:
  ```properties
  # ─── JWT (dev) ─────────────────────────────────────────────────────────────
  # Dev-only fallback secret. Real JWT_SECRET env var takes precedence.
  # NEVER use this value in production — prod MUST set JWT_SECRET explicitly
  # or the backend will fail to start (see JwtService @PostConstruct).
  jwt.secret=${JWT_SECRET:dev-jwt-secret-256-bits-minimum-length-required-for-hs256-algorithm-xxxxxx}
  ```
  The fallback string must be ≥ 32 bytes (HS256 minimum) — the 96-char example above satisfies this.
- `backend/.gitignore` — verify `.env` is ignored. If it's already there (it should be from the Key Protection Wave), this is a no-op verification, not an edit. If it's missing, add it.

## Database changes

None. No schema touched. The users table already has `password_hash VARCHAR(255)` from Spec 1.3, which is what BCrypt will populate (in Spec 1.5).

## API changes

None in this spec. This spec adds security plumbing only. Auth endpoints (`/api/v1/auth/register`, `/api/v1/auth/login`, `/api/v1/auth/logout`) arrive in Spec 1.5. `/api/v1/users/me` arrives in Spec 1.6.

**Behavioral changes to existing endpoints:**

- All `/api/v1/**` routes that are NOT in the public allowlist now return 401 UNAUTHORIZED instead of being accessible. Relevant today:
  - `/api/v1/hello` (Spec 1.1-preserved) — becomes authenticated. Verify this is acceptable; if not, add to public allowlist.
- All `/api/health`, `/api/hello`, `/api/v1/health`, `/api/v1/proxy/**`, `/actuator/health`, `/actuator/info` routes remain public.

## Copy Deck

No user-facing copy. Error responses use existing `ProxyError` shape (or a new `ErrorResponse` for auth errors — TBD in plan phase, keep consistent with proxy's existing shape).

**Error codes added in this spec:**

- `UNAUTHORIZED` (401) — missing `Authorization` header or invalid bearer prefix
- `TOKEN_INVALID` (401) — signature check failed (tampered or wrong secret)
- `TOKEN_EXPIRED` (401) — `exp` claim is in the past
- `TOKEN_MALFORMED` (401) — token doesn't parse as a JWT at all

## Anti-Pressure Copy Checklist

- [x] No FOMO language (N/A — error messages only)
- [x] No shame language (N/A — no user-facing copy)
- [x] No exclamation points near vulnerability (N/A)
- [x] No streak-as-shame messaging (N/A)
- [x] No comparison framing (N/A)
- [x] Scripture as gift, not decoration (N/A)

## Anti-Pressure Design Decisions

N/A — infrastructure-only spec with no user-visible surface.

## Acceptance criteria

- [ ] `backend/pom.xml` includes `spring-boot-starter-security` and the three jjwt artifacts (api/impl/jackson)
- [ ] `backend/src/main/resources/application.properties` declares `jwt.secret=${JWT_SECRET:}` and `jwt.expiration-seconds=${JWT_EXPIRATION:3600}`
- [ ] `backend/src/main/resources/application-dev.properties` declares a clearly-labeled dev-only `jwt.secret` fallback ≥ 32 bytes
- [ ] `JwtService` exists and supports: `generateToken(UUID userId, boolean isAdmin)`, `parseToken(String token)` returning claims, and `@PostConstruct` validation that fails fast if secret is empty/too-short
- [ ] `JwtAuthenticationFilter` extends `OncePerRequestFilter`, is `@Order(Ordered.HIGHEST_PRECEDENCE + 100)`, and correctly sets `SecurityContextHolder` authentication
- [ ] `SecurityConfig` uses `addFilterAfter(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)` (explicit ordering; NOT default insertion)
- [ ] `SecurityConfig` configures OPTIONS preflight as `permitAll()` globally (prevents JWT filter from eating CORS preflights)
- [ ] `SecurityConfig` public route list includes: `/api/v1/health`, `/api/health`, `/api/hello`, `/api/v1/auth/register`, `/api/v1/auth/login`, `/api/v1/proxy/**`, `/actuator/health`, `/actuator/info`
- [ ] `BCryptPasswordEncoder` is exposed as a `@Bean` named `passwordEncoder`
- [ ] `AuthenticatedUser` helper exists with typed `UUID userId()` and `boolean isAdmin()` accessors
- [ ] Unauthenticated GET `/api/v1/health` returns 200 (public)
- [ ] Unauthenticated GET `/api/v1/users/me` returns 401 (route doesn't exist yet; Spec 1.6 implements it — but Spring Security's default 401 on unmapped-but-authenticated paths is sufficient for this AC. If the default behavior is 404 instead of 401, adjust `SecurityConfig` to ensure 401 for all `/api/v1/**` non-public routes regardless of whether they're mapped.)
- [ ] Request with `Authorization: Bearer <malformed-token>` on a protected route returns 401 with `code: TOKEN_MALFORMED` or `TOKEN_INVALID`
- [ ] Request with `Authorization: Bearer <expired-token>` returns 401 with `code: TOKEN_EXPIRED`
- [ ] Request with `Authorization: Bearer <valid-token-signed-with-wrong-secret>` returns 401 with `code: TOKEN_INVALID`
- [ ] Request with a valid token on a protected route does NOT 401 (would 404 instead, since no protected endpoint exists yet — but the filter doesn't reject it)
- [ ] Request to `/api/v1/proxy/ai/explain` without `Authorization` header succeeds (rate-limited, but not auth-rejected). Existing proxy rate-limit enforcement is intact — 120/min dev, 60/min prod.
- [ ] Request to `/api/v1/proxy/ai/explain` WITH `Authorization: Bearer <anything>` header succeeds — JWT is ignored on proxy routes, not rejected (`permitAll()` on `/api/v1/proxy/**`)
- [ ] CORS preflight `OPTIONS /api/v1/health` returns 200 with correct CORS headers (not 401)
- [ ] Filter ordering verified via integration test: a valid authenticated request produces log output containing a request ID (RequestIdFilter ran first) AND rate-limit headers on proxy routes (RateLimitFilter ran before auth on `/api/v1/proxy/**`)
- [ ] `grep -iE 'aiza|key=|signature=' /tmp/backend.log` after a successful authenticated request returns zero matches (dev-profile PII/key-leak suppressions intact; no JWT secret in logs)
- [ ] JWT secret does NOT appear in any log line at any level (grep the log for the dev fallback string's distinctive tail — expect zero matches)
- [ ] `./mvnw test` passes — all pre-existing tests still green, plus 15-25 new tests across the three new test classes
- [ ] `./mvnw spring-boot:run -Dspring-boot.run.profiles=dev` starts cleanly, all three providers still `configured: true` at `/api/v1/health`
- [ ] `backend/.gitignore` ignores `.env` (verification only — not an edit unless missing)

## Testing notes

### Test count expectations

Per `06-testing.md`, an L-sized spec should produce 20-40 tests. Realistic breakdown:

- `JwtServiceTest.java` — 8-12 tests
- `JwtAuthenticationFilterTest.java` — 6-10 tests (MockMvc-based)
- `SecurityConfigIntegrationTest.java` — 4-8 tests (`@SpringBootTest` with real filter chain)

Total: ~18-30 new tests.

### `JwtServiceTest.java` mandatory coverage

| Test | Expected behavior |
|---|---|
| `generatesTokenWithCorrectClaims` | `sub` = user UUID, `iat` ≈ now, `exp` ≈ now + 1h, `is_admin` matches input |
| `parsesValidTokenCorrectly` | Round-trip: generate → parse → same claims |
| `rejectsTokenWithWrongSignature` | Token signed with different secret throws (specific exception type verified) |
| `rejectsExpiredToken` | Clock moved forward past `exp` → throws ExpiredJwtException |
| `rejectsMalformedToken` | Garbage string → throws MalformedJwtException |
| `rejectsTokenWithoutSubClaim` | Token missing `sub` → throws specific exception |
| `rejectsNullToken` | Null input → throws or returns typed "invalid" result |
| `postConstructFailsWithEmptySecret` | Create `JwtService` with empty secret → `@PostConstruct` throws IllegalStateException |
| `postConstructFailsWithShortSecret` | Create `JwtService` with 16-byte secret (below HS256 minimum) → `@PostConstruct` throws |
| `postConstructAcceptsValidDevSecret` | The dev-profile fallback secret passes validation |

### `JwtAuthenticationFilterTest.java` coverage

Use `@WebMvcTest` or `MockMvc` with stubbed `JwtService`:

| Test | Expected behavior |
|---|---|
| `noAuthorizationHeaderOnProtectedRoute` | Returns 401 with `UNAUTHORIZED` code |
| `malformedBearerPrefix` | `Authorization: NotBearer token` → 401 |
| `validTokenSetsSecurityContext` | Protected route receives authenticated principal with correct user ID |
| `expiredTokenReturnsTokenExpired` | 401 with `TOKEN_EXPIRED` code |
| `invalidSignatureReturnsTokenInvalid` | 401 with `TOKEN_INVALID` code |
| `malformedTokenReturnsTokenMalformed` | 401 with `TOKEN_MALFORMED` code |
| `publicRouteWithInvalidTokenStillSucceeds` | Invalid `Authorization` header on `/api/v1/health` is ignored — returns 200 |
| `optionsPreflightAlwaysSucceeds` | `OPTIONS /api/v1/users/me` returns 200 with CORS headers, no 401 |

### `SecurityConfigIntegrationTest.java` coverage

Full `@SpringBootTest` with real filter chain. Use Testcontainers PostgreSQL (same standalone pattern as `LiquibaseSmokeTest` — Spec 1.7's `AbstractIntegrationTest` doesn't exist yet).

| Test | Expected behavior |
|---|---|
| `filterChainOrderingIsCorrect` | Request produces logs with request ID in MDC (RequestIdFilter ran) AND X-RateLimit-* headers on `/api/v1/proxy/**` (RateLimitFilter ran). Both before auth. |
| `proxyRoutesRemainAnonymousAccessible` | GET `/api/v1/proxy/ai/explain` without auth returns rate-limited success (actually 400 or whatever the proxy's response is without required fields — the point is NOT 401) |
| `proxyRoutesIgnoreValidJwt` | Same request WITH valid `Authorization: Bearer <valid>` returns the same response as without (JWT is ignored, not validated) |
| `healthRoutesRemainPublic` | `/api/v1/health`, `/api/health`, `/actuator/health` all return 200 without auth |
| `unauthenticatedRequestToFutureProtectedRouteReturns401` | `/api/v1/users/me` (unmapped) returns 401 not 404 |
| `corsPreflightOptionsAlwaysSucceeds` | `OPTIONS /api/v1/users/me` returns 200 with CORS headers |

### Manual verification steps

1. Start dev backend: `./mvnw spring-boot:run -Dspring-boot.run.profiles=dev`
2. Verify public routes: `curl -v http://localhost:8080/api/v1/health` → 200, `curl -v http://localhost:8080/actuator/health` → 200
3. Verify proxy still anonymous: `curl -v http://localhost:8080/api/v1/proxy/ai/explain` → NOT 401 (will be 400/validation error, but the point is auth doesn't block it)
4. Verify CORS preflight: `curl -v -X OPTIONS -H "Origin: http://localhost:5173" http://localhost:8080/api/v1/health` → 200 with `Access-Control-*` headers
5. Verify unauthenticated protected route rejection: `curl -v http://localhost:8080/api/v1/users/me` → 401 with `code: UNAUTHORIZED` in body
6. Log-inspection: `tail -f /tmp/backend.log` and confirm no secrets appear. `grep 'dev-jwt-secret' /tmp/backend.log` → expect zero matches.
7. Rate limit still works on proxy: `for i in $(seq 1 130); do curl -s http://localhost:8080/api/v1/proxy/ai/explain > /dev/null; done; curl -I http://localhost:8080/api/v1/proxy/ai/explain` → expect 429 (dev rate limit is 120/min)

## Notes for plan phase recon

1. **Critical filter-order verification.** The current filter chain on `main` is `RequestIdFilter` at HIGHEST_PRECEDENCE → `RateLimitFilter` at HIGHEST_PRECEDENCE+10 with proxy-path scoping. Before writing code, CC should verify both are still present and ordered correctly via `grep -rn '@Order(Ordered.HIGHEST_PRECEDENCE' backend/src/main/java/com/worshiproom/`. Adding `JwtAuthenticationFilter` at HIGHEST_PRECEDENCE+100 should produce three filters in strictly increasing order.

2. **Spring Security's default filter insertion is a trap.** If CC registers `JwtAuthenticationFilter` as a `@Component` without explicit `SecurityFilterChain` ordering, Spring Security may insert it at an unexpected position in the security filter chain — BEFORE `UsernamePasswordAuthenticationFilter` in some cases, which breaks nothing yet but is fragile. The CORRECT pattern is:
   ```java
   @Bean
   SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
       return http
           .authorizeHttpRequests(auth -> auth
               .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
               .requestMatchers("/api/v1/health", "/api/health", "/api/hello").permitAll()
               .requestMatchers("/api/v1/auth/register", "/api/v1/auth/login").permitAll()
               .requestMatchers("/api/v1/proxy/**").permitAll()
               .requestMatchers("/actuator/health", "/actuator/info").permitAll()
               .requestMatchers("/api/v1/**").authenticated()
               .anyRequest().permitAll()  // legacy /api/hello, /api/health covered above
           )
           .csrf(csrf -> csrf.disable())  // stateless JWT; no CSRF needed
           .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
           .addFilterAfter(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
           .build();
   }
   ```
   Verify the exact pattern in Spring Security 6.x docs before writing — the API evolves.

3. **`@Component` on `JwtAuthenticationFilter` is redundant** when it's injected into `SecurityConfig` via constructor. Pick one pattern: either `@Component` + auto-scan + Spring Security auto-insertion (risky — see #2), OR no `@Component` + manual bean declaration in `SecurityConfig` + explicit `addFilterAfter`. The master plan's Approach section implies the second pattern.

4. **`HandlerExceptionResolver` delegation for filter-raised exceptions.** `RateLimitFilter` uses `handlerExceptionResolver.resolveException(...)` instead of throwing — this lets the package-scoped `ProxyExceptionHandler` advice produce the right response shape. `JwtAuthenticationFilter` will face the same problem: if it throws, the advice may not be invoked (package-scoping issue from `03-backend-standards.md` § "@RestControllerAdvice Scoping"). Two options:
   - **(A)** Use the same `HandlerExceptionResolver` delegation pattern as `RateLimitFilter`. Reuse the qualifier `@Qualifier("handlerExceptionResolver")`.
   - **(B)** Create an unscoped `@RestControllerAdvice` for auth exceptions (the `RateLimitExceptionHandler` precedent). The class-level JavaDoc must explain why it's intentionally unscoped.
   Both are valid. Option B is conceptually cleaner for auth (it's not proxy-related); Option A is less code. Pick one and be consistent with the pattern choice in a follow-up recon note.

5. **JWT secret length validation.** HS256 requires a secret of at least 256 bits (32 bytes). The dev fallback in `application-dev.properties` must be ≥ 32 bytes. JJWT's `Keys.hmacShaKeyFor(byte[])` validates this at key-construction time and throws `WeakKeyException` if the secret is too short. The `JwtService` `@PostConstruct` should wrap this in a more actionable error message.

6. **`JwtConfig` vs inline `@Value`.** Two valid patterns:
   - `@ConfigurationProperties(prefix = "jwt")` binding class — matches `ProxyConfig`'s style, more testable
   - Inline `@Value("${jwt.secret}") String secret` in `JwtService` — simpler, less ceremony
   Pick one. `ProxyConfig` uses the former; consistency argues for `JwtConfig`. But it's small enough that either is fine.

7. **`AuthenticatedUser` implementation decision.** Simplest shape:
   ```java
   public record AuthenticatedUser(UUID userId, boolean isAdmin) {}
   ```
   Can be extracted from `Authentication` via a custom `HandlerMethodArgumentResolver` OR a static helper method `AuthenticatedUser.from(SecurityContext)`. Controller injection via `@AuthenticationPrincipal AuthenticatedUser user` is the cleanest API. Spec 1.5/1.6 will use this — get the shape right now.

8. **Password encoder strength.** Spring Security default is 10 rounds (`BCryptPasswordEncoder()` no args). `.claude/rules/02-security.md` doesn't specify a strength. 10 is reasonable for MVP; hash time is ~60ms on modern hardware. Do NOT go above 12 without measuring — auth latency matters for login UX. Default 10 is correct for this spec.

9. **`.env` and `.gitignore`.** The Key Protection Wave's `backend/.env.local` should already be in `.gitignore`. Verify: `grep -E '^\.env' backend/.gitignore` → expect matches. If the pattern is `.env*` or similar, that covers `.env.local`, `.env`, `.env.production`, etc. If the pattern is too narrow, widen it.

10. **Test configuration for `SecurityConfigIntegrationTest`.** `@SpringBootTest` with Testcontainers. Since `AbstractIntegrationTest` doesn't exist until Spec 1.7, this test uses the standalone pattern from `LiquibaseSmokeTest`:
    ```java
    @SpringBootTest
    @Testcontainers
    class SecurityConfigIntegrationTest {
        @Container
        static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("worshiproom_test")
            .waitingFor(Wait.forListeningPort());  // Spec 1.3b lesson: fixes port-publishing race
        // ...
    }
    ```
    When Spec 1.7 lands, both `LiquibaseSmokeTest` and `SecurityConfigIntegrationTest` get refactored to extend `AbstractIntegrationTest`.

11. **Spring Boot auto-config interaction (Spec 1.3 lesson).** Adding `spring-boot-starter-security` to the classpath activates Spring Security auto-config immediately. The default auto-config applies basic authentication with a randomly-generated password logged to stdout (!!!) — if CC runs tests between "add dependency" and "add `SecurityConfig`", every HTTP test fails with 401. Treat "add dependency + add `SecurityConfig`" as an atomic unit, like Steps 1-3 in Spec 1.3. Don't verify tests until both are in place.

12. **`AuthenticationManager` bean.** Spring Security 6 no longer auto-exposes `AuthenticationManager`. Spec 1.5 (login endpoint) will need it for `DaoAuthenticationProvider`. Spec 1.4 does NOT need to expose it — defer to Spec 1.5. But if CC is tempted to pre-expose it, fine; just don't let scope creep further.

13. **Pre-flight baseline checks:**
    - `./mvnw test` passes 284/0/0 on current branch (Spec 1.3b added 1 test)
    - `./mvnw spring-boot:run -Dspring-boot.run.profiles=dev` starts cleanly with postgres up
    - All three proxy endpoints round-trip cleanly
    - `/api/v1/health` returns all three providers `configured: true`
    - If any baseline is red, flag before attributing failures to this spec's work.

## Out of scope

- **Auth endpoints** (`/api/v1/auth/register`, `/api/v1/auth/login`, `/api/v1/auth/logout`) — Spec 1.5
- **User Me endpoint** (`/api/v1/users/me`) — Spec 1.6
- **User JPA entity** (`User.java`) — Spec 1.5 or wherever repository is first needed. Decision deferred to plan phase.
- **Password reset / email verification / change password / change email / account lockout / session invalidation** — Specs 1.5b through 1.5g
- **Frontend AuthContext JWT migration** — Spec 1.9
- **Per-user rate limiting on proxy endpoints** — post-Phase-1 enhancement (likely Phase 6 or dedicated ops spec). Per-IP rate limiting stays.
- **Refresh tokens** — deferred. 1-hour tokens with re-login on expiry for MVP.
- **JWT storage in httpOnly cookies** — deferred. In-memory React state for MVP (`.claude/rules/02-security.md` explicitly).
- **CSRF protection** — not needed for stateless JWT. `csrf.disable()` in `SecurityConfig`.
- **OAuth / SSO / third-party identity providers** — not in scope for the Forums Wave at all.
- **Actuator endpoint authentication** — `health,info` stay public. Other actuator endpoints don't need to be addressed because `application.properties` only exposes those two.
- **2FA / MFA** — master plan lists this as a "future enhancement" in `02-security.md`.
- **Spring Security's default `UserDetailsService`** — not needed. Our JWT filter sets the Authentication principal directly from the `sub` claim, not by loading a user from a DB on every request. The DB lookup for `/users/me` happens in the controller, not the filter.

## Out-of-band notes for Eric

- **The filter-ordering test is the most valuable integration test in this spec.** It's the only way to catch a silent regression where Spring Security's default insertion puts `JwtAuthenticationFilter` BEFORE `RateLimitFilter`, which would cause anonymous proxy traffic to skip rate limiting. If that test doesn't exist or doesn't actually verify BOTH filters ran (request ID in MDC + X-RateLimit headers), CC is missing the central value proposition of this spec.
- **The proxy-remains-anonymous ACs are specifically designed to protect the Key Protection Wave's per-IP rate limiting.** Three specs (Gemini, Maps, FCBH) documented "per-IP until JWT auth lands" — if Spec 1.4 accidentally adds auth to `/api/v1/proxy/**`, the frontend calls break and per-IP rate limiting becomes redundant. The `permitAll()` on the proxy prefix is the correct boundary.
- **Spec 1.4 is the last "pure plumbing" spec in Phase 1 before things get real.** Specs 1.5+ start creating user entities, wiring registration, writing login flows. Get the auth infrastructure rock-solid here and 1.5 / 1.5b / 1.5c / 1.5d / 1.5e / 1.5f / 1.5g all get dramatically simpler.
- **JJWT version pinning.** `0.12.6` is current stable as of April 2026. If CC wants to use a different version, it should verify the API shape matches the import pattern expected by `JwtService`. JJWT 0.11.x → 0.12.x had significant API changes; don't mix versions.
- **The dev JWT secret is deliberately obvious-looking** (`dev-jwt-secret-256-bits-minimum-length-required-for-hs256-algorithm-xxxxxx`). This is good — anyone reviewing the dev-profile properties file should immediately know this is not a real secret. If CC tries to make it look more "production-like," reject that; the obvious-fake-secret pattern is intentional.
- **`logging.level.org.springframework.security` is worth considering for dev.** Spring Security's debug logging exposes a LOT of useful info when filter ordering goes wrong. But it can also be noisy. Default behavior (INFO) is fine; if debugging auth issues later, temporarily set `logging.level.org.springframework.security=DEBUG` — but don't leave it there long because the output mentions auth principal details (user IDs) that shouldn't hit aggregated logs.
- **When Spec 1.5 lands and needs `AuthenticationManager`, it'll expose that bean in `SecurityConfig` or a dedicated config class.** Spec 1.4 should NOT pre-expose it — the bean's role is login-specific and fits more naturally alongside the login endpoint.
- **Test suite growth expectation: +18 to +30 tests.** Starting at 284; ending around 302-314. If CC ends significantly outside that range, flag in the Execution Log. Too few tests = incomplete coverage. Too many tests = possible duplication between `JwtServiceTest` and `JwtAuthenticationFilterTest`.
- **The Key Protection Wave's filter-raised-exception pattern (`handlerExceptionResolver.resolveException`) is a specific design choice for how filters integrate with `@RestControllerAdvice`.** Spec 1.4 should follow the same pattern for any exceptions raised by `JwtAuthenticationFilter`. The alternative — unscoped `@RestControllerAdvice` for auth errors — is the other valid choice. Pick one in the plan phase and stick with it; don't switch mid-implementation.
