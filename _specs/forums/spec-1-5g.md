# Forums Wave: Spec 1.5g — Session Invalidation & Logout-All-Devices

**Master Plan Reference:** `_forums_master_plan/round3-master-plan.md` → Spec 1.5g (lines 8587-8603 of master plan body)
**Brief Reference:** `_plans/forums/spec-1-5g-brief.md`
**Branch:** `forums-wave-continued`
**Date:** 2026-05-12

---

## Affected Frontend Routes

- `/settings/sessions`
- `/settings?tab=account` (password change flow already exists; 1.5g modifies its post-success behavior)
- `/?auth=login` (redirect target after "Sign out everywhere" and after a revoked token fires 401 TOKEN_REVOKED)

---

## Recon Overrides (post-brief verification, 2026-05-12)

The brief's R1-R8 "VERIFIED" claims were re-verified on disk at spec-from-brief time. Most matched exactly. The following findings override or extend the brief — plan and execute MUST honor these over the brief's older text:

**RO-1 (overrides R8): `AuthenticatedUser` is a Java RECORD, not a class.**

File: `backend/src/main/java/com/worshiproom/auth/AuthenticatedUser.java`. The brief's R8 paragraph claims it is a "Class (not record); has `getUserId()` and `getIsAdmin()` getters". On disk:

```java
public record AuthenticatedUser(UUID userId, boolean isAdmin) {}
```

Accessor is `principal.userId()` (record accessor), NOT `principal.getUserId()`. Verified by reading `AuthController.changePassword` line 51: `authService.changePassword(principal.userId(), request);`.

**Implications for MPD-9 (`AuthenticatedUser` gains `jti` field):**
- The new record header becomes `public record AuthenticatedUser(UUID userId, boolean isAdmin, UUID jti) {}`.
- Records DO support secondary constructors, so a 2-arg back-compat overload IS feasible: `public AuthenticatedUser(UUID userId, boolean isAdmin) { this(userId, isAdmin, null); }`. Plan-time R11 chooses between (a) refactor every call site to 3-arg + a `forTest(...)` static factory, or (b) keep the 2-arg secondary constructor for test-fixture ergonomics and have production code use the 3-arg canonical.
- Filter code that today does `new AuthenticatedUser(userId, isAdmin)` (JwtAuthenticationFilter:112) becomes `new AuthenticatedUser(userId, isAdmin, jti)` — there is no Lombok-style "add a field" — the record header itself changes.

**RO-2 (extends R11): the `new AuthenticatedUser(...)` call-site count is meaningfully larger than the brief implies.**

The brief says "Most are test fixtures" with likely candidates "AuthControllerTest fixtures, tests mocking principals, WithMockUser-equivalent custom annotations." A grep at spec-from-brief time found **30+ call sites in the test suite alone**, concentrated in Phase 3 (Post family) tests that ship principal construction inline:

- `backend/src/test/java/com/worshiproom/post/PostVisibilityTransitionTest.java` (1)
- `backend/src/test/java/com/worshiproom/post/PostEditWindowTest.java` (6)
- `backend/src/test/java/com/worshiproom/post/PostServiceWriteTest.java` (8)
- `backend/src/test/java/com/worshiproom/post/comment/PostCommentServiceUpdateTest.java` (7)
- `backend/src/test/java/com/worshiproom/post/comment/PostCommentServiceDeleteTest.java` (6)
- plus production `JwtAuthenticationFilter.java:112`

Plan-time R11 must complete the enumeration (grep both `main` and `test` paths, also include `bookmark/`, `reaction/` test subpackages that may have similar fixture patterns post-Phase-3). The volume reinforces the brief's recommendation to keep a 2-arg back-compat path (whether via a `forTest(...)` static factory OR a record secondary constructor) so the refactor is not a 30+-file flag day. **Decision: defer to plan-time R11 to choose.** Brief's preferred direction (`forTest` factory) is acceptable; secondary-constructor on the record is also acceptable and may produce a smaller diff.

**RO-3 (extends R5): newest Liquibase changeset on disk is `2026-05-10-001-add-posts-help-tags.xml`.**

Brief says "1.5g adds via new changeset `YYYY-MM-DD-NNN-add-users-session-generation-column.xml`." Confirmed there is no `session_generation` column on `users` today (last `users.*` changeset is `2026-04-30-002-add-users-account-lockout-columns.xml`; subsequent changesets are `posts`-only). The three new changesets 1.5g introduces should use today's date or whatever date the execute step lands:

- `2026-05-12-001-add-users-session-generation-column.xml` (or current execute date)
- `2026-05-12-002-create-active-sessions-table.xml`
- `2026-05-12-003-create-jwt-blocklist-table.xml`

No prefix collisions with existing changesets. Confirmed via `ls backend/src/main/resources/db/changelog/`.

**RO-4 (extends R6, R7): cache infrastructure is intact and matches brief.**

`backend/src/main/java/com/worshiproom/cache/` contains: `CacheConfig.java`, `CircuitBreakingCacheManager.java`, `DegradedAwareStatusAggregator.java`, `RedisConfig.java`, `RedisHealthIndicator.java`. R7's implication holds: `CircuitBreakingCacheManager` wraps the Spring Cache abstraction, NOT raw RedisTemplate, so `JwtBlocklistService` cannot piggyback on it — must implement its own try/catch + Postgres fallback explicitly per MPD-2. The brief's reasoning is correct.

**RO-5 (extends R12): `AuthException` factory inventory matches brief exactly.**

Existing factories: `unauthorized()`, `tokenMalformed()`, `tokenInvalid()`, `tokenExpired()`, `invalidCredentials()`, `accountLocked()` (returns subtype `AccountLockedException`), `currentPasswordIncorrect()`, `passwordsMustDiffer()`, `changePasswordRateLimited()` (returns subtype `ChangePasswordRateLimitedException`). 1.5g adds `tokenRevoked()` returning 401 with code `TOKEN_REVOKED`. Per the brief's MPD-8.

Notable: `currentPasswordIncorrect()` returns 403 (not 401) by deliberate design — see its JavaDoc explaining the frontend `apiFetch` global token-clear interaction. **1.5g's `tokenRevoked()` returns 401** because the user IS supposed to be logged out (the whole point of the spec) — the global token-clear behavior is exactly the desired outcome.

**RO-6 (additive): `LoginRateLimitFilter` and `ChangePasswordRateLimitService` already shipped.**

Existing files: `LoginRateLimitFilter.java`, `LoginAttemptRepository.java`, `LoginAttemptService.java`, `ChangePasswordRateLimitConfig.java`, `ChangePasswordRateLimitService.java`, `ChangePasswordRateLimitedException.java`. The brief's "Files to NOT modify" list correctly identifies these as orthogonal. 1.5g introduces a sibling pattern (`SessionRateLimitConfig` + `SessionRateLimitService` + `SessionRateLimitedException`) following the `ChangePasswordRateLimit*` shape — this is the canonical Caffeine-bounded bucket pattern documented in `02-security.md` § "BOUNDED EXTERNAL-INPUT CACHES" and reinforced by Phase 3 Addendum item 5.

**RO-7 (additive, security-headers cross-reference): all responses on 1.5g endpoints carry the six security headers from Spec 1.10g.**

`SecurityHeadersConfig.java` is at `Ordered.HIGHEST_PRECEDENCE + 6` and decorates every response — including 401s emitted from inside `JwtAuthenticationFilter`. 1.5g's `tokenRevoked()` 401 responses, `/api/v1/sessions/*` responses, and the modified `/api/v1/auth/logout` 204 all inherit the six headers automatically. No new SecurityHeadersConfig work required.

---

## Spec 1.5g Brief — Session Invalidation & Logout-All-Devices

**Master plan reference:** `_forums_master_plan/round3-master-plan.md` lines 8587-8603 (v2.8 Appendix E spec stub)

**Spec ID:** `round3-phase01-spec05g-session-invalidation`

**Phase:** 1 (Backend Foundation)

**Size:** M

**Risk:** Medium (JWT stateless model requires careful invalidation design)

**Prerequisites:**
- 1.5 (Auth Endpoints) ✅
- 5.6 (Redis Cache Foundation) ✅

**Tier:** **High** (security infrastructure, well-understood patterns)

**Pipeline:** This brief → `/spec-forums spec-1-5g-brief.md` → `/plan-forums spec-1-5g.md` → execute → review.

**DO NOT EXECUTE while Spec 6.1 is running.** 1.5g modifies `JwtAuthenticationFilter.java`, `SecurityConfig.java`, and `JwtService.java` — same auth surface 6.1 consumes. Wait for 6.1 to fully merge to master, then proceed.

---

## 1. Branch Discipline

Branch: `forums-wave-continued`. Long-lived branch covering the Forums Wave. Eric handles all git operations manually. Claude Code NEVER commits, pushes, branches, merges, rebases, or alters git state at any phase. Violation of W1 is grounds to halt execute.

After 6.1 merges to master, Eric will rebase/merge `forums-wave-continued` onto current master before 1.5g executes. CC assumes a clean working tree at execute-start and confirms via `git status` (read-only verification — no `git add`, no `git stash`, no mutation of any kind).

---

## 2. Tier — High (not xHigh)

1.5g is **High** tier, not xHigh.

**Why not xHigh:**
- No brand-defining UX surface. /settings/sessions is utility, not signature.
- No load-bearing user-content curation (vs. 6.1's 60 verses).
- No privacy-by-construction wire-format concerns (vs. 6.1's friend-attribution leak risk).
- Well-understood security patterns (JWT blocklist + generation counter is industry-standard).

**Why not Medium:**
- Touches `JwtAuthenticationFilter`, which runs on every authenticated request. A bug here breaks all auth.
- Adds new persistent state (`active_sessions`, `jwt_blocklist`) with security implications.
- Redis degraded-mode behavior must NOT silently disable session invalidation (security-critical fallback).

**Practical execution implication:** High tier means CC uses Opus 4.7 thinking `xhigh` for spec-from-brief + plan; routine execute steps use `high`. No HUMAN-IN-THE-LOOP gates of the type 6.1 had (Gate-29 verses, Gate-34 brand-voice audit). Eric reviews backend security tests after execute, manually verifies the /settings/sessions UX, and confirms degraded-mode tests cover Redis-outage scenarios.

---

## 3. Visual & Integration Verification

Most of 1.5g is backend infrastructure with no visible UX. The frontend deliverable is a single new page: `/settings/sessions`. Verification surface accordingly:

**Frontend (Playwright):**
- `/settings/sessions` renders the current user's active sessions list
- Each row: device label (parsed from User-Agent), city (GeoIP), last-active timestamp, "This device" badge on current session
- "Sign out other devices" revokes all OTHER sessions; current continues
- "Sign out everywhere" revokes ALL sessions including current; user redirected to login
- Per-row "Sign out this device" revokes one specific session
- Password change flow: current session continues with new token; other devices die on next request

**Backend (Integration tests with Testcontainers + Redis):**
- Logout invalidates token (next request → 401 TOKEN_REVOKED)
- Logout-all increments session_generation; all tokens with old gen → 401
- Password change increments session_generation; current session issued NEW token
- Blocklist entry expires after JWT TTL (no eternal Redis growth)
- Redis outage falls back to Postgres blocklist (no silent failure)
- Concurrent revoke + auth race: in-flight request finishes; next request fails

**Manual verification by Eric after execute:**
- Login from two browsers (or browser + private window) simulating two devices
- Visit /settings/sessions; verify both appear with "This device" badge correct on current
- "Sign out other devices" from browser A → browser B's next request fails 401
- Change password from browser A → browser B's next request fails 401, browser A continues seamlessly

## 4. Master Plan Divergences (MPDs)

Deliberate divergences from the stub at lines 8587-8603. Plan/execute MUST honor the brief, not the stub.

**MPD-1: BOTH blocklist AND session-generation counter (stub says blocklist only).**
The stub says "introduce a jwt_blocklist." That's necessary but insufficient. Blocklist handles per-token revoke (revoke one device). For logout-all-devices and password-change-everywhere, a session-generation counter on the `users` table is the right mechanism — O(1) per request, no storage growth, atomic invalidation of all outstanding tokens. Brief commits to both.

**MPD-2: Redis primary + Postgres fallback, NO in-memory fallback.**
Stub says "Redis-backed, falls back to DB." 5.6's RateLimiter uses Redis + in-memory fallback. For 1.5g, in-memory fallback is **forbidden**: an in-memory blocklist evaporates on process restart, silently un-revoking previously-revoked tokens. Brief mandates: Redis primary, Postgres `jwt_blocklist` table as durable fallback, NO in-memory option.

**MPD-3: Password change keeps current session valid.**
Stub doesn't decide UX. Brief decides: when user successfully changes password from Settings, current session continues (a NEW JWT is issued with incremented session_generation). All OTHER devices die. Rationale: user just authenticated by typing current password; punishing them with a forced re-login is hostile UX. Matches Google/Apple/Instagram pattern.

**MPD-4: `active_sessions` table is distinct from `jwt_blocklist`.**
Different concerns. `jwt_blocklist` = "revoked tokens" (auth filter consults). `active_sessions` = "currently-valid sessions" (UI consults). Stub conflates them. Brief separates cleanly.

**MPD-5: Privacy-friendly session display.**
Stub doesn't address device-list privacy. Brief decides: NO raw IP addresses in UI or DB (only city-level GeoIP). NO browser fingerprinting beyond UA parsing. NO geolocation API. Last-seen timestamps human-readable ("2 hours ago"), not millisecond precision.

**MPD-6: Out-of-scope items explicit.**
Stub doesn't enumerate. Brief makes explicit:
- Refresh tokens: separate spec, deferred indefinitely (current single-token model is fine)
- MFA / 2FA: separate spec, post-MVP
- "New device signed in" emails: requires SMTP (Phase 15.1), deferred
- Audit log of session events: Phase 13 candidate
- Device fingerprinting beyond UA-parse: anti-pattern, never

**MPD-7: Forward-compatible hook for Spec 1.5b (Password Reset).**
1.5b is blocked on Phase 15.1 SMTP. When 1.5b ships, it calls into 1.5g's `SessionService.invalidateAllForUser(userId)` from its reset-completion handler. Brief mandates: 1.5g exposes this method as a stable public API. Don't implement 1.5b's path; just leave the door open.

**MPD-8: TOKEN_REVOKED is a new AuthException error code.**
Existing AuthException codes: TOKEN_EXPIRED, TOKEN_INVALID, TOKEN_MALFORMED, INVALID_CREDENTIALS, ACCOUNT_LOCKED, CURRENT_PASSWORD_INCORRECT, PASSWORDS_MUST_DIFFER, CHANGE_PASSWORD_RATE_LIMITED. 1.5g adds TOKEN_REVOKED to distinguish "explicitly revoked" from "malformed/expired/wrong-signature." Frontend shows different copy ("You were signed out from this device" vs "Session expired").

**MPD-9: AuthenticatedUser gains a `jti` field (breaking constructor change).**
Today: `new AuthenticatedUser(userId, isAdmin)`. After 1.5g: `new AuthenticatedUser(userId, isAdmin, jti)`. Principal needs jti so `AuthController.logout()` can read it via `@AuthenticationPrincipal` and add it to the blocklist. Plan-time recon enumerates every call site (R11) and refactors. Most are test fixtures.

> **Recon override RO-1:** `AuthenticatedUser` is a Java RECORD on disk (`public record AuthenticatedUser(UUID userId, boolean isAdmin) {}`), not a class. The brief's "class with getUserId()" claim is incorrect. Records support secondary constructors, so a 2-arg back-compat path is feasible. Plan-time R11 chooses between (a) refactor every call site to 3-arg + `forTest(...)` static factory, or (b) keep a 2-arg record secondary constructor for test ergonomics. See RO-1 above for the verified file state and RO-2 for the actual call-site count (30+, concentrated in Phase 3 Post-family tests, not just AuthControllerTest fixtures as the brief implies).

**MPD-10: `users.session_generation` is non-nullable INT with default 0.**
New column on existing `users` table. Liquibase changeset is additive (no data backfill needed; default applies retroactively). JWTs issued before 1.5g ships will have NO `gen` claim — filter MUST treat missing-`gen` as gen=0 and accept (Gate-G-MIGRATION).

---

## 5. Recon Ground Truth

Verified on disk during brief recon (R1-R8) or flagged for plan-time recon (R9-R14).

> **Re-verified at spec-from-brief time (2026-05-12):** R1, R2, R3, R5, R6, R7, R12 confirmed exactly as written. R8 has a divergence — see RO-1 in "Recon Overrides" section above. The R8 paragraph below is preserved for traceability but the override wins for execute-time decisions.

**R1 — JwtService.java structure: VERIFIED.**
File: `backend/src/main/java/com/worshiproom/auth/JwtService.java` (77 lines).
- Uses io.jsonwebtoken (JJWT) library
- Signing: HS256, secret from `JwtConfig` (env `JWT_SECRET`)
- Minimum secret length: 32 bytes (256-bit) enforced at @PostConstruct
- Current claims: `subject` (userId UUID stringified), `is_admin` (boolean), standard `iat` + `exp`
- **NO `jti` claim today**
- **NO `gen` claim today**
- `generateToken(UUID userId, boolean isAdmin)` signature — 1.5g changes to `generateToken(UUID userId, boolean isAdmin, int sessionGeneration)`. The `jti` is generated INSIDE the method (random UUID), not passed in.
- `parseToken(token)` returns `Jws<Claims>`, throws ExpiredJwtException / SignatureException / MalformedJwtException

**R2 — JwtAuthenticationFilter.java structure: VERIFIED.**
File: `backend/src/main/java/com/worshiproom/auth/JwtAuthenticationFilter.java` (138 lines).
- Extends OncePerRequestFilter
- Instantiated INLINE by SecurityConfig (NOT a Spring bean — avoids double-fire)
- Skips OPTIONS preflight via `shouldNotFilter`
- Skips public paths via `PublicPaths.PATTERNS`
- Reads Bearer token, parses, sets principal `new AuthenticatedUser(userId, isAdmin)` at line 112
- Error mapping: ExpiredJwtException → TOKEN_EXPIRED; SignatureException → TOKEN_INVALID; MalformedJwtException / IllegalArgumentException → TOKEN_MALFORMED; fallback Exception → TOKEN_INVALID
- Errors delegated to HandlerExceptionResolver via `AuthException.tokenExpired()` / `tokenInvalid()` / `tokenMalformed()`
- **Insertion point for 1.5g checks: AFTER line 110 (after `isAdmin` extraction), BEFORE the `new AuthenticatedUser(...)` construction at line 112.** Order: (a) extract `jti` claim → (b) blocklist check → (c) extract `gen` claim → (d) session-generation check → (e) construct principal with jti.

**R3 — AuthController.java: VERIFIED.**
File: `backend/src/main/java/com/worshiproom/auth/AuthController.java`.
Endpoints today:
- POST `/api/v1/auth/register` (line 29-33)
- POST `/api/v1/auth/login` (line 35-39)
- POST `/api/v1/auth/logout` (line 41-44) — **EXISTS but no-op**, returns 204 No Content; token remains valid until expiry. **This is the security gap 1.5g closes.**
- POST `/api/v1/auth/change-password` (line 46-49) — shipped via Spec 1.5c
1.5g modifies logout to actually invalidate; adds new endpoints under `/api/v1/sessions/*`.

**R4 — AuthService delegate: VERIFIED.**
AuthController delegates to AuthService. Change-password endpoint takes `@AuthenticationPrincipal AuthenticatedUser principal` + `@Valid @RequestBody ChangePasswordRequest`. The hash-update + session-generation increment + new JWT issuance happens in AuthService (R9 confirms exact insertion point).

**R5 — `users` table schema: VERIFIED.**
File: `backend/src/main/resources/db/changelog/2026-04-23-001-create-users-table.xml`.
Columns: id, email, password_hash, first_name, last_name, display_name_preference, custom_display_name, avatar_url, bio, favorite_verse_*, is_admin, is_banned, is_email_verified, joined_at, last_active_at, created_at, updated_at, is_deleted, deleted_at.
**NO `session_generation` column.** Subsequent changesets: `2026-04-23-002-add-users-timezone-column.xml`, `2026-04-30-001-add-users-legal-version-columns.xml`, `2026-04-30-002-add-users-account-lockout-columns.xml`.
1.5g adds via new changeset `YYYY-MM-DD-NNN-add-users-session-generation-column.xml`.

**R6 — 5.6 RedisConfig: VERIFIED.**
File: `backend/src/main/java/com/worshiproom/cache/RedisConfig.java`.
- Provides `RedisConnectionFactory` bean (Lettuce, reads `spring.data.redis.url` / `host` / `port`)
- Provides `RedisTemplate<String, String>` bean with `StringRedisSerializer` for key + value
1.5g's blocklist service `@Autowired RedisTemplate<String, String>` directly — no new connection setup.

**R7 — 5.6 cache infrastructure: VERIFIED.**
Files in `backend/src/main/java/com/worshiproom/cache/`:
- `CacheConfig.java` (profile-aware: ConcurrentMapCacheManager dev/test, RedisCacheManager prod, `cache:` prefix)
- `CircuitBreakingCacheManager.java` (wraps CacheManager, NOT raw RedisTemplate)
- `DegradedAwareStatusAggregator.java`, `RedisHealthIndicator.java`
**Implication for 1.5g:** the circuit breaker wraps Spring Cache abstraction, not raw RedisTemplate. 1.5g's `JwtBlocklistService` cannot piggyback — it must implement its own try/catch + Postgres fallback explicitly. Intentional (per MPD-2; in-memory fallback forbidden; only DB fallback acceptable).

**R8 — AuthenticatedUser class: VERIFIED.**
File: `backend/src/main/java/com/worshiproom/auth/AuthenticatedUser.java`.
- Class (not record); has `getUserId()` and `getIsAdmin()` getters
- Constructor today: `new AuthenticatedUser(UUID userId, boolean isAdmin)` (JwtAuthenticationFilter line 112)
- 1.5g adds `jti` field → breaking constructor change → affects every call site (mostly test fixtures, see R11)

> **⚠️ RO-1 (overrides R8):** On disk, `AuthenticatedUser` is `public record AuthenticatedUser(UUID userId, boolean isAdmin) {}`. Accessor is `principal.userId()` (record accessor) — `AuthController.changePassword` line 51 confirms. The MPD-9 refactor remains valid in spirit: the record header gains a third component `UUID jti`, and a 2-arg secondary constructor is feasible if plan-time R11 prefers minimal call-site churn.

**R9 — PLAN-RECON-REQUIRED: AuthService.changePassword() insertion point.**
Plan-time recon reads `AuthService.java` end-to-end. Identifies where the password-hash UPDATE happens. Insertion point for `userRepository.incrementSessionGeneration(userId)` is in the same transaction, AFTER the password update succeeds and BEFORE the method returns. Plan also identifies where AuthService calls `jwtService.generateToken(userId, isAdmin, newGen)` to issue the new JWT, and returns it in the response body for AuthContext to swap.

**R10 — PLAN-RECON-REQUIRED: AuthControllerTest test infrastructure.**
Plan-time recon reads existing AuthControllerTest (or AuthIntegrationTest). Questions: MockMvc vs RestAssured? How seed test users + obtain JWTs? Is there `@DynamicPropertySource` for Testcontainers Postgres + Redis? 1.5g's `SessionInvalidationIntegrationTest` follows the same pattern (no novel test infra).

**R11 — PLAN-RECON-REQUIRED: AuthenticatedUser constructor caller count.**
Plan-time recon runs `grep -r "new AuthenticatedUser(" backend/src/` to enumerate every site. Likely candidates: production `JwtAuthenticationFilter`, AuthControllerTest fixtures, tests mocking principals, WithMockUser-equivalent custom annotations. Plan documents each site + refactor strategy (likely: keep 2-arg constructor with no-jti overload that synthesizes random jti, mark deprecated for tests, prefer 3-arg in production code).

> **⚠️ RO-2 (extends R11):** Preview grep at spec-from-brief time found 30+ call sites concentrated in Phase 3 Post-family tests (`post/`, `post/comment/`, `post/bookmark/`, `post/reaction/`), NOT just AuthControllerTest fixtures. Plan-time R11 must enumerate exhaustively. Volume reinforces the brief's preference for a 2-arg back-compat path.

**R12 — PLAN-RECON-REQUIRED: AuthException factory method addition.**
File: `backend/src/main/java/com/worshiproom/auth/AuthException.java`. Current factories: `tokenExpired()`, `tokenInvalid()`, `tokenMalformed()`. Other codes: INVALID_CREDENTIALS, ACCOUNT_LOCKED, CURRENT_PASSWORD_INCORRECT, PASSWORDS_MUST_DIFFER, CHANGE_PASSWORD_RATE_LIMITED. 1.5g adds `tokenRevoked()` returning 401 with code TOKEN_REVOKED.

**R13 — PLAN-RECON-REQUIRED: UserRepository session_generation atomicity.**
1.5g needs atomic increment. Plan decides:
- Native query: `UPDATE users SET session_generation = session_generation + 1 WHERE id = :userId RETURNING session_generation`
- Wrapped in `@Modifying @Query(nativeQuery = true)` on UserRepository
- Returns the new value
Canonical SQL-side-increment pattern (Master Plan Decision 4).

> **Phase 3 Addendum cross-reference:** `@Modifying` annotations MUST include both `clearAutomatically = true` AND `flushAutomatically = true` per `03-backend-standards.md` § Repository Conventions. The `incrementSessionGeneration` query is a bulk UPDATE and falls under this rule. `/code-review` flags any new `@Modifying` missing either flag.

**R14 — PLAN-RECON-REQUIRED: Frontend AuthContext logout flow + new /settings/sessions page.**
Plan reads:
- `frontend/src/context/AuthContext.tsx` — how does logout flow work today? Does it call backend `/auth/logout` or just clear localStorage?
- `frontend/src/pages/Settings.tsx` — section structure for routing to `/settings/sessions` subroute (or sibling page)
- Existing fetch hook pattern for new `useSessions()` hook (mirrors `usePrayerReceipt` from 6.1: native fetch via `apiFetch`)

---

## 6. Phase 3 Execution Reality Addendum Gates — Applicability

| Gate | Applicability | Notes |
|------|---------------|-------|
| Gate-1 (Liquibase rules) | **Applies.** | Two new changesets (active_sessions, jwt_blocklist) + one column add (session_generation). All additive. |
| Gate-2 (OpenAPI updates) | **Applies.** | New `/api/v1/sessions/*` + modified `/auth/logout`. |
| Gate-3 (Copy Deck) | **Applies (minimal).** | /settings/sessions UI strings need Copy Deck entries. Backend error codes are machine-readable. |
| Gate-4 (Tests mandatory) | **Applies.** | ~35 tests. |
| Gate-5 (Accessibility) | **Applies.** | /settings/sessions: semantic markup, keyboard nav for revoke buttons, screen-reader announcements on revoke. |
| Gate-6 (Performance) | **Applies.** | Filter adds ~2 Redis ops + 1 cached DB read. Budget: median +3ms, p99 +10ms per authenticated request. |
| Gate-7 (Rate limiting on ALL endpoints) | **Applies.** | New `/sessions/*` endpoints: revoke endpoints get low limits (10/hour/user — these aren't endpoints that should be hammered). |
| Gate-8 (Respect existing patterns) | **Applies.** | Re-use 5.6's RedisTemplate, AuthException factory pattern, OncePerRequestFilter chain, @AuthenticationPrincipal injection. |
| Gate-9 (Plain text only) | **N/A.** | No user-content rendering. |
| Gate-10 (Crisis detection supersession) | **N/A.** | Not a content feature. |

**New gates specific to 1.5g:**

**Gate-G-DEGRADED (Redis outage — HARD).**
Redis unreachable → blocklist falls back to Postgres `jwt_blocklist`. Integration test MUST cover: stop the Redis Testcontainer mid-test, verify subsequent revokes still work (writes to Postgres), verify auth requests still consult Postgres for blocklist lookup. **Silent in-memory fallback is forbidden** (MPD-2). If both Redis AND Postgres unreachable, filter MUST fail closed (reject all requests with TOKEN_INVALID) — never fail open.

**Gate-G-MIGRATION (pre-1.5g JWT tolerance — HARD).**
Existing JWTs issued before 1.5g ships have NO `gen` and NO `jti`. Filter MUST treat:
- Missing `gen` claim → accept (treat as gen=0)
- Missing `jti` claim → accept, skip blocklist check
Prevents forced-logout-everyone on deploy. Pre-1.5g tokens roll over naturally within their TTL (24h-7d depending on `JwtConfig.expirationSeconds`).

**Gate-G-PRINCIPAL (AuthenticatedUser refactor — HARD).**
Every `new AuthenticatedUser(userId, isAdmin)` call site updated to either `new AuthenticatedUser(userId, isAdmin, jti)` (production) or `AuthenticatedUser.forTest(userId, isAdmin)` (test fixtures — synthesizes random jti). Plan recon (R11) enumerates; execute updates all in one commit; no partial migration.

> **RO-1 / RO-2 reminder:** Plan-time R11 may choose to satisfy Gate-G-PRINCIPAL via a record secondary constructor `public AuthenticatedUser(UUID userId, boolean isAdmin) { this(userId, isAdmin, null); }` INSTEAD of a `forTest(...)` factory, reducing call-site churn across the 30+ Phase 3 test fixtures. Both approaches satisfy the gate. The gate's invariant is "production code passes a real jti; test code does not need to"; the gate does not mandate the specific API shape.

**Gate-G-FAIL-CLOSED (filter fails closed on infra failure — HARD).**
JwtAuthenticationFilter encountering unexpected exception during blocklist or generation check (Redis timeout, DB connection lost mid-query) MUST reject with TOKEN_INVALID — never fall through to allow as authenticated. Conservative catch-all per existing line-131 pattern.

**Gate-G-SESSION-VISIBILITY (active_sessions accuracy — SOFT).**
The /settings/sessions list is best-effort, not real-time. Sessions update on every authenticated request (throttled to 1/min/session). A revoked session may briefly remain visible until its row is removed. Privacy invariant: revocation actually disables the token; UI freshness is secondary. Document; surface in UI with a subtle "Last refreshed: 2s ago" indicator.

---

## 7. Decisions Catalog

The 12 design decisions baked into the brief that plan and execute must honor.

**D-Mechanism: Both blocklist AND session-generation counter.** (MPD-1)
Filter rejects if `jti ∈ blocklist` OR `claim.gen != user.session_generation`.

**D-Storage: Redis primary, Postgres fallback, NO in-memory.** (MPD-2)
JwtBlocklistService writes to both Redis AND Postgres on every revoke (dual-write, sync). Reads consult Redis first; on Redis miss/error, falls back to Postgres. NO in-memory caching of blocklist hits (would re-introduce process-restart vulnerability). NO writeback queue (asymmetric write delays open a race window between revoke and check).

**D-TTL: Redis blocklist entry TTL = JWT remaining lifetime at revoke-time.**
When revoking, compute `ttl_seconds = jwt.exp - now`. Set Redis key with that TTL. Past expiry, the JWT is invalid anyway (regular expiry check), so the blocklist entry is redundant. Caps blocklist size to "currently-valid tokens that were revoked" — naturally pruned by TTL.

**D-PostgresBlocklistTTL: Postgres blocklist entries pruned via scheduled job.**
Postgres doesn't have native TTL. Add a `@Scheduled` job (cron, hourly) that deletes `jwt_blocklist` rows where `expires_at < now()`. Same TTL semantics as Redis. Test verifies the cleanup job runs and prunes correctly.

**D-PasswordChangeUX: Current session continues; other sessions die.** (MPD-3)
On successful password change, AuthService:
1. Updates `users.password_hash`
2. Increments `users.session_generation`
3. Issues a NEW JWT for the current session with the new gen
4. Returns 200 with the new JWT in the response body
5. Frontend AuthContext swaps the stored token transparently

Other devices: their tokens have the OLD gen, fail filter check on next request → 401 TOKEN_REVOKED → frontend redirects to login.

> **Note for plan/execute:** Today's `/api/v1/auth/change-password` returns 204 No Content (AuthController line 47-53). D-PasswordChangeUX requires changing this to return 200 with the new JWT body. This is a breaking change to the change-password endpoint contract — frontend AuthContext + ChangePasswordSection.tsx must update in the same execute commit. OpenAPI must reflect the new response shape.

**D-SessionGenerationDefault: 0 (zero, not 1).**
New users start at gen=0. JWTs include `"gen": 0`. Logout-all increments to 1. Pre-1.5g users have NULL → treated as 0 by the filter (Gate-G-MIGRATION).

**D-ActiveSessionsSchema:**
```sql
CREATE TABLE active_sessions (
  session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  jti UUID NOT NULL UNIQUE,
  device_label VARCHAR(200),         -- "Chrome on macOS", parsed from UA
  ip_city VARCHAR(100),               -- GeoIP city, NULL if unknown
  last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX active_sessions_user_id_idx ON active_sessions(user_id);
CREATE INDEX active_sessions_jti_idx ON active_sessions(jti);
```

**D-JwtBlocklistSchema:**
```sql
CREATE TABLE jwt_blocklist (
  jti UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  revoked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL  -- matches JWT exp
);
CREATE INDEX jwt_blocklist_expires_at_idx ON jwt_blocklist(expires_at);  -- for cleanup job
```

**D-WriteThrottling: active_sessions.last_seen_at updates throttled to 1/min/session.**
Without throttling, every authenticated request writes to active_sessions — write storm. Throttle: only update if `now() - last_seen_at > 60s`. Implemented via SQL `UPDATE ... WHERE last_seen_at < now() - interval '60 seconds'` (no row matched = no write). No application-level state needed.

**D-DeviceLabelParse: ua-parser-java library.**
Parse User-Agent into a friendly string like "Chrome 124 on macOS 14.5". Use `ua-parser-java` (mature, MIT licensed, ~50KB). Falls back to "Unknown device" if parse fails. NEVER store raw UA in DB (privacy + storage bloat).

**D-GeoIP: MaxMind GeoLite2 City database, local file.**
Free database, 50MB, updates weekly. Download at build time or boot time (decide in plan). NEVER call a third-party IP-to-city API at runtime (latency + privacy). NULL `ip_city` if lookup fails. NEVER log raw IPs.

**D-FetchPattern: Native fetch + useState/useEffect (consistent with 6.1).**
Frontend `useSessions()` hook follows the `usePrayerReceipt` pattern from 6.1. No React Query / SWR / Jotai. `apiFetch` from `@/lib/api-client`. Manual loading/error state.

**D-1.5bHook: SessionService.invalidateAllForUser(UUID) is stable public API.** (MPD-7)
When Spec 1.5b (Password Reset Flow) ships post-Phase 15.1, it calls into this method from its reset-completion handler. Brief mandates: keep the method signature stable, document it as a public extension point.

---

## 8. Watch-fors

Organized by theme. ~35 items total. CC must internalize all of these before plan and execute.

### Security
- W1 (CC-no-git): Claude Code never runs git operations at any phase. Eric handles all commits, pushes, branches, merges manually.
- W2: Filter fails closed on any infrastructure exception (Gate-G-FAIL-CLOSED). Conservative catch-all rejects with TOKEN_INVALID, never authenticates.
- W3: In-memory blocklist fallback is FORBIDDEN. Only Postgres fallback is acceptable (MPD-2).
- W4: Never log full JWTs at any log level. Log only the `jti` (which is itself a non-secret identifier).
- W5: Never store raw IPs in DB or logs. Only GeoIP city (D-GeoIP).
- W6: Never store raw User-Agent strings in DB. Only parsed friendly label (D-DeviceLabelParse).
- W7: NEVER expose `jti` or `session_generation` values in API responses (they're internal). The `session_id` (UUID) IS exposed in /sessions list because it's the revoke key — but jti is hidden.
- W8: SecurityConfig rules for `/api/v1/sessions/**` must be `.authenticated()` BEFORE `OPTIONAL_AUTH_PATTERNS.permitAll()` per Phase 3 Addendum item 4.

### Privacy
- W9: /settings/sessions list shows ONLY the current user's sessions. Strict authentication check + WHERE user_id = principal.userId on every query.
- W10: Last-active timestamps shown human-readable ("2 hours ago") not millisecond-precision (would enable fingerprinting attacks via traffic-correlation).
- W11: Device label uses major-version only ("Chrome 124" not "Chrome 124.0.6367.119") — same privacy rationale.
- W12: GeoIP returns city, never lat/long. Never region/state if city is unknown (the gradient of specificity matters).

### Performance
- W13: Filter overhead ≤3ms median, ≤10ms p99 per authenticated request. Measured via integration test with timing assertion.
- W14: Blocklist Redis lookup uses `EXISTS jti:<uuid>` (O(1), no SCAN). Postgres fallback uses `SELECT 1 FROM jwt_blocklist WHERE jti = ? LIMIT 1` (PK lookup, O(log n)).
- W15: Session-generation check is in-memory comparison (claim integer vs userRepository.getSessionGeneration(userId) — and `userRepository.getSessionGeneration` is itself cacheable via 5.6's `@Cacheable("user-session-gen")` with short TTL like 30s). DO NOT hit DB on every authenticated request.
- W16: active_sessions write throttled to 1/min/session (D-WriteThrottling).

### Migration / backward compatibility
- W17: Pre-1.5g JWTs (no jti, no gen claim) MUST be accepted by the filter. Treat missing claims as gen=0 and skip blocklist check (Gate-G-MIGRATION).
- W18: `users.session_generation` column added with DEFAULT 0 — existing rows get 0 retroactively. No data backfill needed.
- W19: AuthenticatedUser constructor refactor touches every call site (Gate-G-PRINCIPAL). Test fixtures use `forTest(...)` static factory; production uses 3-arg constructor.

> **RO-1 / RO-2 reminder:** W19's "static factory" is one valid approach; a record secondary constructor `public AuthenticatedUser(UUID userId, boolean isAdmin) { this(userId, isAdmin, null); }` is equally valid and may reduce the 30+ call-site churn. Plan-time R11 decides.

### Test discipline
- W20: ALL revoke endpoints have integration tests covering the auth-filter-rejects-revoked-token path.
- W21: Degraded-mode test (Redis outage) covers both write path (revoke still works via Postgres) and read path (filter still consults Postgres for blocklist).
- W22: Concurrent revoke + auth race test: thread A revokes while thread B authenticates. Final state: thread B's in-flight request completes (it was authenticated before the revoke), but thread B's NEXT request fails 401.
- W23: Pre-1.5g JWT tolerance test: manually craft a JWT without `jti`/`gen` claims and verify filter accepts it.
- W24: TOKEN_REVOKED error code test: revoke a token, hit any authenticated endpoint with it, assert response is 401 with code=TOKEN_REVOKED (not TOKEN_INVALID).
- W25: Cleanup job test: insert expired jwt_blocklist row, run job, verify row deleted.

### UX
- W26: "Sign out everywhere" button shows confirmation dialog ("This will sign you out on all devices. Continue?"). "Sign out other devices" does NOT show confirmation (less destructive).
- W27: After "Sign out everywhere", frontend redirects to /login with a flash message ("You've been signed out everywhere.").
- W28: After "Sign out this device" on the current session row, same as "Sign out everywhere" for that single session — redirect to /login.
- W29: After password change, current session continues silently. No flash message about "other devices signed out" (don't make the user feel surveilled).
- W30: "This device" badge on the current session row is rendered server-side (compare row.jti to principal.jti) — not client-side guessing.

> **Cross-reference for W27 / W28:** Frontend redirect target is `/?auth=login` per `02-security.md` § "Query-param-driven AuthModal (Spec 7)" — `/login` is a legacy `<Navigate>` redirect. Plan-time R14 confirms which route the AuthContext logout flow uses today; the query-param target is the canonical pattern.

### Brand voice
- W31: All /settings/sessions copy is neutral, factual, no shaming or fear language. "Sign out" not "Force logout." "This device" not "Your trusted device." No urgency framing ("Suspicious activity detected!" — never).
- W32: Error messages on the page (e.g., "Couldn't revoke session — try again") are gentle and assume goodwill. NO "An error occurred" technical-speak.

### Anti-pressure
- W33: NO "session security score." NO gamification ("You haven't signed out unused devices in 90 days — clean up!"). NO scarcity framing.
- W34: The page intentionally does NOT show login history (failed login attempts, geographic anomalies) — that's surveillance UX, separate concern, post-1.5g if at all.

### Operations
- W35: `@Scheduled` cleanup job runs hourly. Logs row count deleted at INFO level. Surfaces metrics for Phase 12 observability (cleanup duration, rows pruned).

---

## 9. Test Specifications

~35 tests total. Heavy on backend integration; minimal frontend unit (component-level); one Playwright suite for the /settings/sessions page.

### Backend unit tests (~5)
- `JwtServiceTest`: `generateToken` includes `jti` and `gen` claims. Decoded token's `jti` matches a UUID pattern.
- `JwtServiceTest`: `generateToken` with sessionGeneration=5 produces a token whose `gen` claim parses as 5.
- `JwtBlocklistServiceTest` (unit, mocked RedisTemplate + JdbcTemplate): `revoke(jti, userId, expiresAt)` writes to both Redis and Postgres.
- `JwtBlocklistServiceTest`: `isRevoked(jti)` returns true if Redis hits.
- `JwtBlocklistServiceTest`: `isRevoked(jti)` falls back to Postgres on simulated Redis exception.

### Backend integration tests — auth filter behavior (~10)
- `SessionInvalidationIntegrationTest.normalAuthSucceeds`: valid token → 200 on any authenticated endpoint.
- `.revokedTokenRejected`: valid token → revoke → next request with same token → 401 with code=TOKEN_REVOKED.
- `.expiredBlocklistEntryNotRejected`: token revoked → its jwt_blocklist row expires → token would naturally be expired anyway → 401 TOKEN_EXPIRED (not TOKEN_REVOKED).
- `.sessionGenerationMismatchRejected`: valid token → user.session_generation incremented → next request → 401 TOKEN_REVOKED.
- `.preMigrationTokenAccepted`: craft JWT without `jti`/`gen` claims → 200 (Gate-G-MIGRATION).
- `.failsClosedOnRedisAndPostgresOutage`: simulate both unreachable → filter rejects with 401 TOKEN_INVALID (Gate-G-FAIL-CLOSED).
- `.degradedRedisStillRevokes`: Redis Testcontainer stopped → revoke call succeeds via Postgres → next auth attempt with that token → 401 TOKEN_REVOKED.
- `.filterPerformanceMedian`: 1000 sequential authenticated requests, measure median latency overhead, assert ≤3ms over baseline.
- `.filterPerformanceP99`: same set, assert p99 ≤10ms.
- `.concurrentRevokeAndAuth`: thread A revokes, thread B in mid-request — thread B's CURRENT request completes (was authenticated before revoke), thread B's NEXT request fails 401.

### Backend integration tests — endpoints (~10)
- `POST /api/v1/auth/logout` with valid token → 204; token now revoked.
- `POST /api/v1/auth/logout` without token → 401.
- `POST /api/v1/auth/logout` removes the session from active_sessions.
- `GET /api/v1/sessions` returns list of current user's active sessions, sorted by last_seen_at descending.
- `GET /api/v1/sessions` includes `is_current` boolean on the row matching the request's jti.
- `DELETE /api/v1/sessions/{sessionId}` revokes that specific session; other sessions continue.
- `DELETE /api/v1/sessions/{sessionId}` for a session_id belonging to a different user → 403 (not 404; don't leak existence).
- `DELETE /api/v1/sessions/all-others` revokes all sessions except the current one; current continues.
- `DELETE /api/v1/sessions/all` revokes all sessions including current; current returns 204 but next request fails 401.
- `POST /api/v1/auth/change-password` increments session_generation, issues new JWT, current session continues with new token.

### Backend integration tests — cleanup job (~3)
- Scheduled job deletes jwt_blocklist rows where expires_at < now().
- Scheduled job deletes active_sessions rows whose jti is in jwt_blocklist (orphan cleanup).
- Scheduled job logs row counts at INFO.

### Frontend unit tests (~5)
- `useSessions()` hook: 200 response → `{ data: [sessions], loading: false, error: null }`.
- `useSessions()` hook: 401 → redirect to /login (consistent with rest of app).
- `<SessionsPage>`: renders one row per session, "This device" badge on current.
- `<SessionsPage>`: "Sign out everywhere" shows confirmation dialog.
- `<SessionsPage>`: revoke button triggers DELETE call, optimistically updates list.

### Playwright E2E (~3 scenarios)
- Two-browser test: login in browser A and B (simulate two devices), open /settings/sessions in A, both appear, "Sign out other devices" → B's next request fails 401.
- Password change: login in A and B, change password from A, A continues with new token, B fails on next request.
- Single session revoke: A and B logged in, A revokes B's specific session_id from /settings/sessions, B fails on next request, A unaffected.

---

## 10. Files

### To CREATE
- `backend/src/main/resources/db/changelog/YYYY-MM-DD-NNN-add-users-session-generation-column.xml` — adds `users.session_generation INT NOT NULL DEFAULT 0`.
- `backend/src/main/resources/db/changelog/YYYY-MM-DD-NNN-create-active-sessions-table.xml` — D-ActiveSessionsSchema.
- `backend/src/main/resources/db/changelog/YYYY-MM-DD-NNN-create-jwt-blocklist-table.xml` — D-JwtBlocklistSchema.
- `backend/src/main/java/com/worshiproom/auth/session/SessionService.java` — orchestrates session lifecycle (record, revoke, list).
- `backend/src/main/java/com/worshiproom/auth/session/SessionsController.java` — REST API.
- `backend/src/main/java/com/worshiproom/auth/session/ActiveSession.java` — JPA entity.
- `backend/src/main/java/com/worshiproom/auth/session/ActiveSessionRepository.java` — JPA repo with custom queries.
- `backend/src/main/java/com/worshiproom/auth/session/SessionResponse.java` — DTO for /sessions list.
- `backend/src/main/java/com/worshiproom/auth/blocklist/JwtBlocklistService.java` — Redis + Postgres dual-write/read-fallback.
- `backend/src/main/java/com/worshiproom/auth/blocklist/JwtBlocklistEntry.java` — JPA entity for Postgres fallback.
- `backend/src/main/java/com/worshiproom/auth/blocklist/JwtBlocklistRepository.java` — JPA repo.
- `backend/src/main/java/com/worshiproom/auth/blocklist/JwtBlocklistCleanupJob.java` — @Scheduled hourly cleanup.
- `backend/src/main/java/com/worshiproom/auth/SessionRateLimitConfig.java` — rate-limit config for /sessions endpoints.
- `backend/src/main/java/com/worshiproom/auth/SessionRateLimitService.java` — Caffeine bucket pattern from 5.6.
- `backend/src/main/java/com/worshiproom/auth/SessionRateLimitedException.java` — extends AuthException.
- `frontend/src/pages/Settings/SessionsPage.tsx` — /settings/sessions page.
- `frontend/src/hooks/useSessions.ts` — fetch hook.
- `frontend/src/types/session.ts` — type declarations.
- Test files mirroring the above (under `backend/src/test/java/.../session/`, `.../blocklist/`, and `frontend/src/.../__tests__/`).
- `frontend/tests/e2e/sessions.spec.ts` — Playwright suite.

### To MODIFY
- `backend/src/main/java/com/worshiproom/auth/JwtService.java` — add `jti` + `gen` claims to `generateToken`; new signature.
- `backend/src/main/java/com/worshiproom/auth/JwtAuthenticationFilter.java` — insert blocklist + generation checks after line 110.
- `backend/src/main/java/com/worshiproom/auth/AuthenticatedUser.java` — add `jti` field, refactor constructor per Gate-G-PRINCIPAL.
- `backend/src/main/java/com/worshiproom/auth/AuthException.java` — add `tokenRevoked()` factory.
- `backend/src/main/java/com/worshiproom/auth/AuthController.java` — make `/auth/logout` actually invalidate.
- `backend/src/main/java/com/worshiproom/auth/AuthService.java` — increment session_generation on password change, issue new JWT, return in response.
- `backend/src/main/java/com/worshiproom/user/UserRepository.java` — add atomic `incrementSessionGeneration(UUID)` query.
- `backend/src/main/java/com/worshiproom/auth/SecurityConfig.java` — add `.authenticated()` matchers for `/api/v1/sessions/**`.
- `backend/src/main/resources/openapi.yaml` — new endpoints + modified logout.
- `backend/pom.xml` — add ua-parser-java + MaxMind GeoIP2 deps.
- `frontend/src/pages/Settings.tsx` — add nav link to /settings/sessions.
- `frontend/src/context/AuthContext.tsx` — handle 401 TOKEN_REVOKED (redirect to login with flash), swap JWT after password-change response.
- Existing test fixtures using `new AuthenticatedUser(...)` — refactor per R11 / Gate-G-PRINCIPAL.

> **RO-2 reminder:** Test-fixture refactor scope is ≥30 files concentrated in `backend/src/test/java/com/worshiproom/post/` and subpackages (`post/comment/`, likely also `post/bookmark/`, `post/reaction/`). Plan-time R11 produces the exhaustive list.

### NOT to modify (explicit non-targets)
- `JwtConfig.java` — secret and expiration unchanged.
- `LoginRateLimitFilter.java` — unrelated to 1.5g.
- `ChangePasswordRateLimitService.java` — already shipped via 1.5c; 1.5g hooks into AuthService.changePassword AFTER this fires.
- `RestAuthenticationEntryPoint.java` — 401 handling unchanged.
- 5.6's `CircuitBreakingCacheManager` — 1.5g implements its own fallback explicitly (R7).
- Any prayer-wall / friends / posts code — orthogonal to 1.5g.

### To DELETE
None. 1.5g is purely additive.

---

## 11. Acceptance Criteria

**Functional (from master plan):**
- A. User can explicitly log out via POST /api/v1/auth/logout; the token is rejected on subsequent use.
- B. User can view active sessions at /settings/sessions.
- C. User can revoke individual sessions.
- D. User can "sign out other devices" (keeps current).
- E. User can "sign out everywhere" (logs out current too).
- F. Password change automatically invalidates all OTHER sessions; current continues.

**Security (brief-mandated):**
- G. Pre-1.5g JWTs continue working after deploy (Gate-G-MIGRATION).
- H. Redis outage does not silently disable session invalidation (Gate-G-DEGRADED).
- I. Filter fails closed on infrastructure errors (Gate-G-FAIL-CLOSED).
- J. No raw IPs / no raw UAs / no jti or session_generation in API responses (W4-W7).

**Performance:**
- K. Filter overhead ≤3ms median, ≤10ms p99.
- L. active_sessions writes throttled to 1/min/session.

**Operational:**
- M. Cleanup job prunes expired blocklist entries hourly.
- N. /settings/sessions UX matches D-PasswordChangeUX and W26-W30.

---

## 12. Out of Scope

Explicitly NOT in 1.5g (some are deferred to future specs, some are anti-features):

- **Refresh tokens.** Single-token model unchanged. Future spec if needed.
- **MFA / 2FA.** Separate concern.
- **"New device signed in" email notifications.** Requires SMTP (Phase 15.1). Will be added in a follow-up spec after 15.1 ships.
- **Audit log of session events.** Phase 13 personal-analytics candidate. Not 1.5g.
- **Device fingerprinting beyond User-Agent parsing.** Anti-pattern for privacy. Never.
- **Failed-login-attempt history on /settings/sessions.** Surveillance UX, separate spec, post-MVP if at all.
- **Session-security score / gamification.** Anti-pattern (W33).
- **OAuth / SSO integration.** Separate concern.
- **Concurrent-session limit enforcement** ("max 5 active sessions per user"). Out of scope for 1.5g; could be a later policy spec.
- **Geo-anomaly detection** ("you usually sign in from Tennessee but now from Russia"). Surveillance UX, separate spec.

---

## 13. Tier Rationale

**Why High not xHigh:** see Section 2. No content curation, no brand-defining UX, no privacy-by-construction wire-format design surface comparable to 6.1.

**Why High not Medium:** runs in JwtAuthenticationFilter on every authenticated request — a bug here breaks every endpoint. Adds security-critical state with fallback semantics that must be tested under failure. The judgment surface is in degraded-mode behavior and migration-tolerance — narrower than 6.1 but still requires senior care.

**Practical execution implication:**
- spec-from-brief: Opus 4.7 thinking xhigh
- plan-from-spec: Opus 4.7 thinking xhigh
- execute: high for routine code, xhigh on the JwtAuthenticationFilter changes and degraded-mode logic
- review: high baseline, xhigh focus on filter + fallback paths

---

## 14. Recommended Planner Instruction

```
Plan execution for Spec 1.5g per /Users/Eric/worship-room/_specs/forums/spec-1-5g.md.

Tier: High. Use Opus 4.7 thinking depth xhigh.

Honor all 10 MPDs, 12 decisions, ~35 watch-fors, ~35 tests, and 5 new gates
(Gate-G-DEGRADED, Gate-G-MIGRATION, Gate-G-PRINCIPAL, Gate-G-FAIL-CLOSED,
Gate-G-SESSION-VISIBILITY).

Honor the Recon Overrides section (RO-1 through RO-7), especially:
- RO-1: AuthenticatedUser is a record, not a class
- RO-2: 30+ test-fixture call sites for AuthenticatedUser refactor

Required plan-time recon (R9-R14):
- R9: read AuthService.java end-to-end; identify changePassword() insertion point
- R10: read existing AuthControllerTest pattern (MockMvc vs RestAssured, Testcontainers setup)
- R11: enumerate every `new AuthenticatedUser(...)` call site; document refactor strategy
- R12: confirm AuthException factory pattern; design `tokenRevoked()`
- R13: design atomic `incrementSessionGeneration` query (native @Modifying @Query with
       clearAutomatically=true + flushAutomatically=true per Phase 3 Addendum item 3)
- R14: read frontend AuthContext.tsx + Settings.tsx; design /settings/sessions integration

Plan-time divergences from brief: document in a Plan-Time Divergences section
(same pattern as 6.1's plan). Justifiable divergences are welcome; surface them
explicitly rather than silently changing the brief.

Step dependency map: show which steps can parallelize (likely backend cluster
independent of frontend cluster).

Do NOT plan for execution while Spec 6.1 is running. The plan can be authored
now (it's a document) but execute must wait for 6.1 to fully merge to master.

Per W1, you do not run any git operations at any phase.
```

---

## 15. Verification Handoff (Post-Execute)

After CC finishes execute and produces the per-step Execution Log:

**Eric's verification checklist:**
1. Review code diff section by section
2. Manually verify degraded-mode integration test actually stops the Redis Testcontainer mid-test (not just mocks the outage)
3. Manually verify Gate-G-MIGRATION: craft a JWT signed with the same secret but missing jti/gen claims, hit a protected endpoint, confirm 200
4. Manually verify Gate-G-FAIL-CLOSED: temporarily break the Postgres connection (rename the JDBC URL property), confirm filter rejects with 401
5. Manually verify the two-browser UX flow (login in two browsers, revoke, password-change)
6. Verify /settings/sessions axe-core a11y test passes
7. Verify NO raw IPs or UAs anywhere in DB or logs (grep test)
8. Verify cleanup job runs and prunes correctly

**If all clean:** Eric commits, pushes, opens MR, merges to master. Tracker updates: "After 5.6 ships: 1.5g" note removed; 1.5g flips ⬜ → ✅.

---

## 16. Prerequisites Confirmed

- **1.5 (Auth Endpoints):** ✅ (shipped earlier in Phase 1)
- **5.6 (Redis Cache Foundation):** ✅ (just shipped)
- **6.1 (Prayer Receipt):** EXECUTING (do not run 1.5g concurrently — wait for merge)

After 6.1 merges:
- Sequencing safe to begin: spec-from-brief → plan → execute on a clean `forums-wave-continued` tree (rebased onto master).

---

## End of Brief
