# Forums Wave: Spec 1.5f — Account Lockout & Brute Force Protection

**Master Plan Reference:** `_forums_master_plan/round3-master-plan.md` → Spec 1.5f (lines 8527-8542)
**ID:** `round3-phase01-spec05f-account-lockout`
**Branch:** `forums-wave-continued` (per brief discipline — no new branch)
**Date:** 2026-04-30
**Size:** M (master plan) / xHigh effort tier (brief)
**Risk:** Medium

---

## Affected Frontend Routes

N/A — backend-only spec. The login form's existing `apiFetch` error handler covers the new 423 case generically; no UI components, routes, or stores are added or modified by this spec.

---

## Recon-Time Confirmations (2026-04-30)

All 13 brief Recon Ground Truth items were re-verified on the active machine before this spec was saved. Confirmed:

- **R1:** `LoginRateLimitFilter.java` exists at `backend/src/main/java/com/worshiproom/auth/LoginRateLimitFilter.java`. Auth package has `AuthController`, `AuthException`, `AuthExceptionHandler`, `AuthService`, `AuthValidationExceptionHandler`, `AuthenticatedUser`, `CachedBodyHttpServletRequest`, `EmailHasher`, `JwtAuthenticationFilter`, `JwtConfig`, `JwtService`, `LoginRateLimitFilter`, `PasswordConfig`, `PublicPaths`, `RestAuthenticationEntryPoint`, `SecurityConfig`, `dto/`. Do not modify the filter file.
- **R2:** `AuthService.login` at lines 99-142 (brief said 101-145; matches). The flow is exactly as the brief describes — DUMMY_HASH on lines 115-119 for unknown email; BCrypt at line 125; JWT issuance at line 130. Currently `@Transactional(readOnly = true)` on line 98 — must change to `@Transactional` per D4.
- **R3:** `AuthException` factory pattern verified at lines 28-47 (`unauthorized`, `tokenMalformed`, `tokenInvalid`, `tokenExpired`, `invalidCredentials`). HttpStatus + code + message constructor on lines 18-22. New `AccountLockedException` subclass needed per D5.
- **R4:** `AuthExceptionHandler` is unscoped `@RestControllerAdvice` on line 28 with explicit JavaDoc explaining why (filter-raised exceptions reach the resolver chain with `handler == null`, so package-scoped advices fail). Single `@ExceptionHandler(AuthException.class)` method at line 33. Must extend per D5 — keep unscoped, add `instanceof AccountLockedException` branch for `Retry-After`.
- **R5:** `User` entity at `backend/src/main/java/com/worshiproom/user/User.java` confirmed at 19 columns. Notable: `is_admin`, `is_banned`, `is_email_verified`, `is_deleted`, `terms_version`, `privacy_version`. NO lockout fields exist — this spec adds three.
- **R6 (UPDATED at recon time):** Latest changeset is `2026-04-30-001-add-users-legal-version-columns.xml` (1.10f). Today's date is 2026-04-30. **Confirmed sequence for this spec:** `2026-04-30-002-add-users-account-lockout-columns.xml`. The plan phase MUST re-confirm if any new changeset has shipped on 2026-04-30 between this spec and execution.
- **R7:** DUMMY_HASH at `AuthService.java:38-39` with detailed JavaDoc on lines 29-37 (regenerate only if BCrypt strength changes). Unknown-email path at lines 103-122 must remain unchanged.
- **R8:** `EmailHasher.hash(...)` exists in the auth package; used at multiple points in `AuthService` and `LoginRateLimitFilter`. New log lines must use it.
- **R9 + R13:** Phase 3 Addendum #2/#3 (L1-cache trap) applies. Both UPDATEs need `@Modifying(clearAutomatically=true, flushAutomatically=true)`.
- **R10:** `ProxyError.of(code, message, requestId)` envelope unchanged.
- **R11:** Auth properties verified at `application.properties` lines 192-196:
  ```
  auth.rate-limit.per-email.capacity=5
  auth.rate-limit.per-email.window-minutes=15
  auth.rate-limit.per-ip.capacity=20
  auth.rate-limit.per-ip.window-minutes=15
  ```
  Brief MPD-1 note about "20/15min not 20/hour" is correct — confirmed in code.
- **R12:** `RateLimitExceededException` is the 429 response shape. New `AccountLockedException` is a sibling 423 response, NOT a reuse.
- **`is_deleted` watch-for #12 follow-up:** `UserRepository.findByEmailIgnoreCase` does NOT filter on `is_deleted` — it returns soft-deleted users. Plan must decide whether soft-deleted users should be lock-eligible (cosmetic-only state change) or treated as unknown email (filter at query level). Brief recommends documenting and accepting cosmetic state change since soft-delete handling is a Spec 10.11 concern.
- **`is_banned` watch-for #11 follow-up:** Verified that `AuthService.login` does NOT currently check `is_banned`. A banned user can still log in today. The brief flags this as out of scope for 1.5f — if any banned-user gating is added, it should fire BEFORE the lockout check, but adding it is not part of this spec.

**Prerequisites verified ✅ in `_forums_master_plan/spec-tracker.md`:** 1.4 Spring Security/JWT, 1.5 Auth Endpoints. Spec 1.5f is currently ‼️ (cleared for execution per tracker line 63).

---

# Spec 1.5f Brief — Account Lockout & Brute Force Protection

## Branch discipline (CRITICAL — applies to this and ALL future specs)

CC MUST stay on the branch the user is currently on. Specifically:
- Do NOT call `git checkout -b <new-branch>`
- Do NOT call `git branch <new-branch>`
- Do NOT call `git switch -c <new-branch>`
- Do NOT call any git operation that creates, switches, or deletes branches
- Do NOT call `git commit`, `git push`, `git stash`, or `git reset`

The user manages all git operations manually. CC's only job is to write
files; the user reviews and commits. If CC notices it has somehow ended
up on a different branch than expected, STOP and ask the user before
any further action. This rule overrides any default skill behavior that
might want to auto-create a feature branch named after the spec.

## Tier

**xHigh.** Master plan body says M/Medium. Security infrastructure with established Phase 1 patterns to follow. No novel design surface — the existing `LoginRateLimitFilter` (Spec 1.5) demonstrates Caffeine-bucket and timing-equalization patterns; this spec adds a sibling persistent-lockout layer. Brief carries the watch-fors and decisions explicitly. Default xHigh per the recalibrated tier policy; MAX would be over-spending.

## Master Plan Divergence

Three deliberate divergences from the master plan body's text (lines 8534-8554 of `_forums_master_plan/round3-master-plan.md`):

**MPD-1: Per-IP rate limiting is ALREADY shipped (Spec 1.5).** Master plan body says "add `/api/v1/auth/login` to RateLimitFilter scope if not already" with "20 login attempts/hour/IP at the filter layer." Recon confirms: `backend/src/main/java/com/worshiproom/auth/LoginRateLimitFilter.java` exists, gates POST `/api/v1/auth/login`, applies BOTH per-email AND per-IP rate limits, sets `X-RateLimit-*` response headers, hashes emails for forensic privacy. The filter is wired and configured (per-email 5/15min, per-IP 20/15min — values in `application.properties`). **This spec does NOT modify or duplicate the filter.** Scope is the persistent account-lockout layer that complements (not replaces) the in-memory filter.

**Note:** the existing per-IP threshold is "20 / 15 minutes" (verified at `application.properties` line ~190), not "20 / hour" as the master plan body states. The actual production value is tighter than the master plan implied. No change needed; just flagging for accuracy.

**MPD-2: Three persistence columns, not two.** Master plan body says add `failed_login_count INT DEFAULT 0` and `locked_until TIMESTAMP NULL`. To correctly enforce a sliding 15-minute window ("5 failures within 15 minutes"), a third column is needed: `failed_login_window_start TIMESTAMP WITH TIME ZONE NULL`. Without it, four failures spread over a long period would still trigger a lockout on the 5th attempt — incorrect behavior. The three-column shape lets the SQL UPDATE atomically reset the window when the previous attempt was >15 min ago. See D2.

**MPD-3: Admin unlock endpoint deferred.** Master plan body mentions "Admin endpoint to manually unlock an account." Spec 10.10 (Admin Foundation) has not shipped, so there's no admin-UI or admin-auth pattern to consume. Manual unlock procedure for the operator (Eric) is documented in `backend/docs/runbook-account-lockout.md` as a `psql` recipe instead. When 10.10 ships, a follow-up spec adds the proper admin endpoint. Followup entry lands in `_plans/post-1.10-followups.md` so it's not forgotten.

## Recon Ground Truth

All facts re-verified on the active machine (`/Users/eric.champlin/worship-room/`):

**R1 — `LoginRateLimitFilter` is shipped (per MPD-1).** Path: `backend/src/main/java/com/worshiproom/auth/LoginRateLimitFilter.java`. Gates POST `/api/v1/auth/login` only. Two-dimensional rate limiting (per-email + per-IP) with Caffeine-bounded buckets (50K each, 30-min eviction window). Hashes emails for log lines via `EmailHasher.hash(...)`. **Do not modify this file.**

**R2 — `AuthService.login` flow** at `backend/src/main/java/com/worshiproom/auth/AuthService.java:101-145`:
1. Normalize email (lowercase, trim)
2. `userRepository.findByEmailIgnoreCase(normalizedEmail)`
3. If user not found: BCrypt against `DUMMY_HASH` (timing equalization), throw `AuthException.invalidCredentials()`
4. If user found: BCrypt against `user.getPasswordHash()`. If wrong, throw `AuthException.invalidCredentials()`
5. If correct: generate JWT, return `AuthResponse`

This spec inserts lockout logic between steps 4 and 5 (and resets state on success).

**R3 — `AuthException` factory pattern** at `backend/src/main/java/com/worshiproom/auth/AuthException.java`. Existing factories: `unauthorized()`, `tokenMalformed()`, `tokenInvalid()`, `tokenExpired()`, `invalidCredentials()`. This spec adds `accountLocked(long retryAfterSeconds)`. Returns 423 LOCKED with code `ACCOUNT_LOCKED`.

**R4 — `AuthExceptionHandler`** is unscoped (`@RestControllerAdvice` with no `basePackages`). Handles all `AuthException` subtypes with one method that ResponseEntity-builds from `ex.getStatus() + ex.getCode() + ex.getMessage()`. This spec does NOT modify the handler — adding a new factory for `accountLocked()` flows through the existing handler automatically. **However**, the 423 case needs a `Retry-After` header. The handler must be extended with a specific case for `ACCOUNT_LOCKED` that adds the header. See D5.

**R5 — `User` entity** at `backend/src/main/java/com/worshiproom/user/User.java` has 19 fields. Notable: `is_admin BOOLEAN`, `is_banned BOOLEAN`, `is_email_verified BOOLEAN`, `is_deleted BOOLEAN`. **No lockout fields exist yet** — this spec adds three.

**R6 — Liquibase changeset sequence.** Latest changeset in `backend/src/main/resources/db/changelog/` as of recon time: `2026-04-30-001-add-users-legal-version-columns.xml` (1.10f). When 1.5f executes, the new changeset takes the next available sequence: `<today's date>-NNN-add-users-account-lockout-columns.xml` where NNN is the next sequential number. **Recon at plan time** to read the current latest changeset and pick the right sequence. Always use today's date, not the brief authoring date (per the convention surfaced during 1.10f execution).

**R7 — DUMMY_HASH timing equalization** is shipped at `AuthService.java:30-41` for the unknown-email path. **Preserve this**. The lockout layer must not regress timing equalization. Specifically: lockout state is checked AFTER BCrypt verify on the known-email path, so a wrong-password attempt with a locked account still pays the BCrypt cost. See D6.

**R8 — `EmailHasher` exists** for forensic-safe email logging. New log lines in this spec MUST use `EmailHasher.hash(normalizedEmail)`, never raw email. Per `.claude/rules/07-logging-monitoring.md` PII rule.

**R9 — Phase 3 Addendum #3 — `@Modifying(clearAutomatically = true, flushAutomatically = true)`** required on the JPQL UPDATE that increments the failed-login count and conditionally sets `locked_until`. Without these flags, the post-update read of the `User` entity in the same transaction returns stale state (L1-cache trap).

**R10 — `ProxyError` envelope** at `backend/src/main/java/com/worshiproom/proxy/common/ProxyError.java` is the canonical error response shape. `AuthExceptionHandler` already wraps in `ProxyError.of(code, message, requestId)`. This spec does not change the envelope.

**R11 — `application.properties` auth config**:
````
auth.rate-limit.per-email.capacity=5
auth.rate-limit.per-email.window-minutes=15
auth.rate-limit.per-ip.capacity=20
auth.rate-limit.per-ip.window-minutes=15
````
This spec adds a parallel `auth.lockout.*` section (see D7).

**R12 — `RateLimitExceededException` is shipped** as the 429 response shape. Lockout uses a NEW exception (`AuthException.accountLocked(...)`), not `RateLimitExceededException`. Different status (423 vs 429), different semantics (account-state vs request-rate).

**R13 — Phase 1 Addendum guidance.** Phase 1 Addendum #1 (Testcontainers two-base-class pattern) means lockout integration tests extend `AbstractIntegrationTest` (full Spring context for filter + controller + service). The repository-layer JPQL UPDATE test could extend `AbstractDataJpaTest` (slice test) for speed.

## Phase 3 Execution Reality Addendum gates — applicability

| # | Convention | Applies to 1.5f? |
|---|---|---|
| 1 | EditWindowExpired returns 409 | N/A — no edit-window endpoints |
| 2 | L1-cache trap | **APPLIES** — JPQL UPDATE on user must use `@Modifying(clearAutomatically=true, flushAutomatically=true)` per R9 |
| 3 | `@Modifying` flags | **APPLIES** — per #2 |
| 4 | SecurityConfig method-specific rule ordering | N/A — `/api/v1/auth/login` is already in `PublicPaths.PATTERNS` (permitAll); this spec doesn't add new endpoints |
| 5 | Caffeine-bounded bucket pattern | N/A — lockout uses DB persistence, not in-memory buckets. The existing `LoginRateLimitFilter` is the in-memory layer (already shipped) |
| 6 | Domain-scoped `@RestControllerAdvice` | N/A — `AuthExceptionHandler` is unscoped per R4 (it must remain unscoped because it handles filter-thrown exceptions where the handler is null) |
| 7 | `CrisisAlertService` unified entry | N/A |
| 8 | Schema realities — do NOT recreate | **CRITICAL** — `users` table EXISTS. ALTER it via Liquibase to ADD three columns. NEVER recreate |
| 9 | INTERCESSION ActivityType | N/A |
| 10 | `wr_prayer_reactions` shape | N/A |
| 11 | Liquibase filename = today's date + next sequence | **APPLIES** — see R6 |
| 12 | BB-45 cross-mount subscription test | N/A — backend-only spec |

## Decisions and divergences (12 items)

**D1 — Three columns on users, all nullable.**
Liquibase changeset adds:
````xml
<addColumn tableName="users">
  <column name="failed_login_count" type="INTEGER" defaultValueNumeric="0">
    <constraints nullable="false"/>
  </column>
  <column name="failed_login_window_start" type="TIMESTAMP WITH TIME ZONE">
    <constraints nullable="true"/>
  </column>
  <column name="locked_until" type="TIMESTAMP WITH TIME ZONE">
    <constraints nullable="true"/>
  </column>
</addColumn>
````

`failed_login_count` is NOT NULL with default 0 because every user always has a count. The two timestamps are nullable because they're only set when there's an active failure window or lock. Existing users (5 dev seed + any prod) get count=0, both timestamps NULL — clean slate, no migration logic needed.

Rollback drops all three columns.

**D2 — Sliding-window enforcement via three-column atomic UPDATE.**
The "5 failures within 15 minutes" rule needs window tracking. Algorithm:
- On failed login, atomic UPDATE:
  - If `failed_login_window_start` is NULL OR more than 15 min ago: set window_start = NOW(), count = 1
  - Else: count = count + 1
  - If new count >= 5: set locked_until = NOW() + 15 min
- On successful login: reset all three (count=0, window_start=NULL, locked_until=NULL)
- On lock expiry (locked_until <= NOW): treat next attempt as fresh window

Implementation as a JPQL UPDATE in `LoginAttemptRepository`:
````java
@Modifying(clearAutomatically = true, flushAutomatically = true)
@Query("""
    UPDATE User u
    SET u.failedLoginCount = CASE
            WHEN u.failedLoginWindowStart IS NULL
                OR u.failedLoginWindowStart < :windowCutoff
            THEN 1
            ELSE u.failedLoginCount + 1
        END,
        u.failedLoginWindowStart = CASE
            WHEN u.failedLoginWindowStart IS NULL
                OR u.failedLoginWindowStart < :windowCutoff
            THEN :now
            ELSE u.failedLoginWindowStart
        END,
        u.lockedUntil = CASE
            WHEN (CASE
                WHEN u.failedLoginWindowStart IS NULL
                    OR u.failedLoginWindowStart < :windowCutoff
                THEN 1
                ELSE u.failedLoginCount + 1
            END) >= :maxFailures
            THEN :lockUntil
            ELSE u.lockedUntil
        END
    WHERE u.id = :userId
""")
int incrementFailedLogin(@Param("userId") UUID userId,
                          @Param("now") OffsetDateTime now,
                          @Param("windowCutoff") OffsetDateTime windowCutoff,
                          @Param("maxFailures") int maxFailures,
                          @Param("lockUntil") OffsetDateTime lockUntil);
````

The triple-CASE looks ugly but is atomic. Returns row count (always 1 for a valid user, 0 if user doesn't exist — the latter can't happen in practice because we already loaded the user in `AuthService`).

For successful-login reset:
````java
@Modifying(clearAutomatically = true, flushAutomatically = true)
@Query("""
    UPDATE User u
    SET u.failedLoginCount = 0,
        u.failedLoginWindowStart = NULL,
        u.lockedUntil = NULL
    WHERE u.id = :userId
""")
void resetLoginAttempts(@Param("userId") UUID userId);
````

Conditional: only fire the reset if any field is non-default. Saves a write on the common case of "user logs in successfully with count already 0." Use a guard in `LoginAttemptService`:
````java
if (user.getFailedLoginCount() > 0 || user.getLockedUntil() != null) {
    loginAttemptRepository.resetLoginAttempts(user.getId());
}
````

**D3 — Anti-enumeration: locked + wrong password = 401, not 423.**
This is the most important UX/security decision in the spec.

If we always return 423 ACCOUNT_LOCKED when locked, an attacker can probe whether an account is locked by submitting any password. This becomes an enumeration vector — combined with prior brute-force, the attacker can determine which accounts they've locked vs which they've successfully credentialed.

Resolution:
- **Locked + wrong password → 401 INVALID_CREDENTIALS** (don't reveal lock state to attacker)
- **Locked + correct password → 423 ACCOUNT_LOCKED with `Retry-After`** (legitimate user gets clear UX)
- **Not locked + wrong password → 401, increment count, maybe lock**
- **Not locked + correct password → 200, reset count**

The "BCrypt verify happens regardless of lock state" pattern is critical — both for timing equalization and for the anti-enumeration logic above. Always run BCrypt; THEN branch on lock state.

**D4 — Login flow changes (in `AuthService.login`).**
Modified pseudocode:
````java
public AuthResponse login(LoginRequest request) {
    String normalizedEmail = ...;
    Optional<User> maybeUser = userRepository.findByEmailIgnoreCase(normalizedEmail);

    if (maybeUser.isEmpty()) {
        // Existing DUMMY_HASH timing equalization — UNCHANGED
        boolean discarded = passwordEncoder.matches(request.password(), DUMMY_HASH);
        if (discarded) throw new IllegalStateException("...");
        log.debug("loginUnknownEmail emailHash={}", EmailHasher.hash(normalizedEmail));
        throw AuthException.invalidCredentials();
    }

    User user = maybeUser.get();

    // Always run BCrypt FIRST — for timing equalization AND anti-enumeration
    boolean passwordMatches = passwordEncoder.matches(request.password(), user.getPasswordHash());

    if (!passwordMatches) {
        // Wrong password: increment counter (and maybe lock).
        // If account was already locked, do NOT reveal that — return generic 401.
        loginAttemptService.recordFailedAttempt(user.getId());
        log.debug("loginWrongPassword userId={} previouslyLocked={}",
            user.getId(),
            user.getLockedUntil() != null && user.getLockedUntil().isAfter(OffsetDateTime.now(UTC)));
        throw AuthException.invalidCredentials();
    }

    // Password is correct. Now check lock state.
    OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
    if (user.getLockedUntil() != null && user.getLockedUntil().isAfter(now)) {
        long retryAfterSec = ChronoUnit.SECONDS.between(now, user.getLockedUntil());
        log.info("loginLockedAccount userId={} retryAfterSec={}", user.getId(), retryAfterSec);
        throw AuthException.accountLocked(Math.max(1, retryAfterSec));
    }

    // Password correct and not locked. Reset counters (conditional on non-zero state),
    // then issue token.
    loginAttemptService.recordSuccessfulLogin(user);

    String token = jwtService.generateToken(user.getId(), user.isAdmin());
    UserSummary summary = ...;
    log.info("loginSucceeded userId={}", user.getId());
    return new AuthResponse(token, summary);
}
````

The method becomes `@Transactional` (not `readOnly = true`) because it now writes via `LoginAttemptService`. The wider transaction wraps the BCrypt + write atomically — important for race-condition safety (D8).

**D5 — `AuthExceptionHandler` extension for 423 `Retry-After` header.**
Existing handler uses one generic `@ExceptionHandler(AuthException.class)` method. To add the `Retry-After` header for 423 responses without breaking other AuthException cases:

Option A: Conditional in the existing method
````java
@ExceptionHandler(AuthException.class)
public ResponseEntity<ProxyError> handleAuth(AuthException ex) {
    var requestId = MDC.get("requestId");
    log.info("Auth rejected: code={} message={}", ex.getCode(), ex.getMessage());
    var builder = ResponseEntity.status(ex.getStatus());
    if (ex instanceof AccountLockedException locked) {
        builder.header(HttpHeaders.RETRY_AFTER, String.valueOf(locked.getRetryAfterSeconds()));
    }
    return builder.body(ProxyError.of(ex.getCode(), ex.getMessage(), requestId));
}
````

Option B: Promote `AccountLockedException` to a sibling class and add a dedicated handler method. More idiomatic but more code.

Recommend **Option A** (conditional). Smaller surface, matches the existing factory-method pattern in `AuthException`. Add a new subclass `AccountLockedException extends AuthException` carrying `retryAfterSeconds`, and check `instanceof` in the handler.

**D6 — Timing equalization for the locked-account path.**
The unknown-email path does BCrypt against DUMMY_HASH and returns 401. The wrong-password-with-locked-account path also does BCrypt and returns 401. The locked-account-with-correct-password path does BCrypt and returns 423.

All three branches do exactly one BCrypt comparison. The `loginAttemptService.recordFailedAttempt(...)` write happens only on the wrong-password-known-email path (adds ~1ms). The DB UPDATE is dominated by BCrypt's ~80ms cost — the timing skew is detectable in theory, undetectable over the public internet in practice (network jitter dwarfs 1ms).

Acceptable. Document the trade-off in `LoginAttemptService` Javadoc.

**D7 — Configuration properties.**
New section in `application.properties` after the existing auth.rate-limit section:
````properties
# ─── Auth lockout policy (Spec 1.5f) ───────────────────────────────────────
# Persistent per-account lockout layer that complements the in-memory
# LoginRateLimitFilter (Spec 1.5). Lockout adds DB-persisted state that
# survives JVM restarts and provides forensic audit trail. Thresholds
# match the per-email rate-limit values (5 attempts / 15 min) so both
# layers fire at the same moment for consistent UX.
auth.lockout.max-failures-per-window=5
auth.lockout.window-minutes=15
auth.lockout.duration-minutes=15
````

Bound to `@ConfigurationProperties(prefix = "auth.lockout")` via a new `AccountLockoutProperties` class.

**D8 — Race-condition safety: BCrypt happens INSIDE the `@Transactional` boundary.**
Two concurrent failed-login attempts for the same user could:
- Both read user with count=4
- Both compute count+1=5 in their respective updates
- Both set lock_until

But because the JPQL UPDATE is server-side atomic (the `count+1` is computed in SQL, not Java), the race is benign. Postgres's row-level lock during UPDATE serializes them. Result: count = 6, locked. One extra increment doesn't break anything.

A more pathological race: failed login + successful login concurrent.
- Failed: increment count (count goes from 0 to 1)
- Successful: reset count to 0
- Result depends on order; either count=0 (success won) or count=1 (failure won)

Last-writer-wins is acceptable. The next successful login will reset cleanly.

To minimize race surface: keep the increment and the BCrypt verify in the same `@Transactional` boundary. Spring's `@Transactional` on `AuthService.login` covers this.

**D9 — `LoginAttemptService` is a thin wrapper.**
Master plan body says `LoginAttemptService.java` is a file to create. Its responsibilities:
- `recordFailedAttempt(UUID userId)` — calls the JPQL UPDATE with current time + lockout config
- `recordSuccessfulLogin(User user)` — conditionally calls the reset UPDATE (skip if no state to clear)

The service depends on `LoginAttemptRepository` (the JPA repo with the two `@Modifying` queries) and `AccountLockoutProperties` (the config bean).

`AuthService.login` constructor-injects `LoginAttemptService`. The service does NOT itself decide whether to lock — the JPQL CASE statement in the repo does that atomically.

**D10 — `LoginAttemptRepository` placement.**
Either: (a) extend `UserRepository` with the two new methods, or (b) create a new `LoginAttemptRepository` interface that operates on the same `User` entity.

Recommend **Option B** (new repo). Reasoning: `UserRepository` is shared across many domains (auth, user profile, friends, etc.). Adding `@Modifying` UPDATE methods to it muddies the read-mostly contract. A dedicated `LoginAttemptRepository` keeps the lockout concerns isolated and discoverable.

````java
package com.worshiproom.auth;
public interface LoginAttemptRepository extends JpaRepository<User, UUID> {
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(...)
    int incrementFailedLogin(...);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(...)
    void resetLoginAttempts(...);
}
````

Lives in the `auth/` package next to `AuthService`.

**D11 — Manual unlock via `psql` runbook (admin endpoint deferred per MPD-3).**
New documentation file: `backend/docs/runbook-account-lockout.md`. Contents:

````markdown
# Account Lockout Runbook

## Overview
Account lockouts fire after 5 failed login attempts within 15 minutes,
locking the account for 15 minutes. The lock auto-clears at the end of
the duration. Operator (Eric) can manually unlock earlier via psql.

## Manual Unlock Procedure

### Identify the locked account
```sql
SELECT id, email, failed_login_count, locked_until
FROM users
WHERE locked_until IS NOT NULL AND locked_until > NOW();
```

### Clear the lock for a specific user
```sql
UPDATE users
SET failed_login_count = 0,
    failed_login_window_start = NULL,
    locked_until = NULL
WHERE id = '<user-id>';
```

### Verify
Run the SELECT query again — the user should no longer appear.

## When To Manually Unlock
- User contacts support saying they're locked out and have verified
  their identity through a side channel (email reply, etc.)
- User is in a vulnerable state and the 15-min wait is harmful UX

## When NOT to Manually Unlock
- User just hits "I'm locked, please unlock" without identity verification
- Multiple lockout events in rapid succession (could be active brute force)

## Future Work
Spec 10.10b will add an admin UI for this operation. Until then, manual
psql is the only path. Document each manual unlock in the operator's
log per security best practice.
````

**D12 — Test coverage targets ~28 tests.**
Master plan body AC says "at least N tests" without specifying. Brief targets ~28 across:
- Liquibase migration apply/rollback (2)
- Repository JPQL UPDATE tests (5) — increment from 0/non-window/window, reset, locked_until-set-on-5th
- AuthService login tests (12) — successful login, wrong password counts, 5th failure locks, locked+correct=423, locked+wrong=401, post-lock-expiry resets window, unknown email path unchanged, etc.
- LoginAttemptService unit tests (4)
- AuthExceptionHandler 423-response test (2) — Retry-After header set, body shape correct
- Full integration test through controller (3) — end-to-end flow with real DB

## Watch-fors (18 items)

1. **Anti-enumeration: locked + wrong = 401**, NOT 423. Test must explicitly verify this. The 423 only fires when the password matches AND the account is locked.

2. **BCrypt verify ALWAYS runs on the known-email path.** Don't skip BCrypt for locked accounts — that breaks timing equalization. Test: timing of locked-correct-password vs unlocked-wrong-password should be similar (both ~80ms).

3. **`@Modifying(clearAutomatically=true, flushAutomatically=true)`** on both UPDATE queries. Without these flags, post-update entity reads return stale state and the L1-cache trap fires (Phase 3 Addendum #2 / #3).

4. **OffsetDateTime / TIMESTAMP WITH TIME ZONE end-to-end.** All timestamp columns are `TIMESTAMP WITH TIME ZONE`. JPA mapping is `OffsetDateTime`. Use `OffsetDateTime.now(ZoneOffset.UTC)` consistently — never `LocalDateTime` (timezone-naive), never `Instant` (no offset). Mirror the existing User entity's `joined_at` pattern.

5. **Liquibase changeset filename uses today's date.** Recon at plan time to read the latest changeset and pick `<today>-<NNN>-add-users-account-lockout-columns.xml`. Sequence resets to 001 if no other changeset has shipped today; otherwise increments. **Recon-time confirmation (2026-04-30):** latest is `2026-04-30-001-add-users-legal-version-columns.xml`, so 1.5f's changeset is `2026-04-30-002-add-users-account-lockout-columns.xml`. Plan phase MUST re-confirm if a new changeset has shipped on 2026-04-30 between this spec and execution.

6. **Liquibase rollback block** drops all three columns:
````xml
<rollback>
  <dropColumn tableName="users" columnName="failed_login_count"/>
  <dropColumn tableName="users" columnName="failed_login_window_start"/>
  <dropColumn tableName="users" columnName="locked_until"/>
</rollback>
````

7. **`failed_login_count` is NOT NULL DEFAULT 0.** Existing users get 0 automatically. The other two columns are nullable. Verify via Hibernate validation at startup (`spring.jpa.hibernate.ddl-auto=validate`).

8. **Existing dev seed users** (Spec 1.8) get count=0, both timestamps NULL after migration. No code change needed in `dev-seed.xml`. Test users behave normally.

9. **Logging discipline.** All log lines that mention the email use `EmailHasher.hash(normalizedEmail)`, never raw email. Log lines that mention the user use `userId` (UUID). NEVER log `failed_login_count` greater than threshold without redaction (could leak across requests in a shared logger).

10. **`Retry-After` header units: SECONDS, not millis.** Mirror `BookmarksRateLimitException` precedent. Calculate from `ChronoUnit.SECONDS.between(now, lockedUntil)` and clamp to >=1 (avoid 0 from sub-second windows).

11. **Banned users vs locked users.** `is_banned` is a permanent admin action; `locked_until` is a temporary security response. They're independent. A banned user who hits 5 failed logins should still get the temp lock layered on top — though the auth check for `is_banned` should fire before lockout. **Recon-time confirmation:** `AuthService.login` does NOT currently check `is_banned`. Adding banned-user gating is OUT OF SCOPE for 1.5f.

12. **Deleted users.** `is_deleted=true` users — recon: are they queryable via `findByEmailIgnoreCase`? If yes, deleted users could still have lockout state changed (cosmetic problem, not security). If `findByEmailIgnoreCase` filters out deleted users, the lockout never fires on them (they're indistinguishable from unknown email). **Recon-time confirmation:** `findByEmailIgnoreCase` does NOT filter on `is_deleted` — soft-deleted users are returned and would have lockout state mutated. Plan phase: document this as a known cosmetic state change; it doesn't compromise security and is a Spec 10.11 concern.

13. **Default value DEFAULT 0 in the migration.** Don't use `defaultValueComputed="0"` (string-based). Use `defaultValueNumeric="0"` for INTEGER (per Liquibase docs). Prevents type ambiguity.

14. **DUMMY_HASH timing equalization stays intact.** Spec 1.5f does NOT modify the unknown-email path. Test must verify: BCrypt is called against DUMMY_HASH, throws invalid_credentials, no DB write happens (verify via repository spy or transaction-count check).

15. **No new endpoints added by this spec.** This is a behavior-modification spec, not an API-surface-expansion spec. No SecurityConfig changes. No PublicPaths changes. The existing POST `/api/v1/auth/login` returns the new 423 response when locked.

16. **OpenAPI yaml extension (Universal Rule 4).** Add the 423 ACCOUNT_LOCKED response shape to the `/api/v1/auth/login` POST path. Document the `Retry-After` header. Add `ACCOUNT_LOCKED` to the response codes documentation.

17. **`AccountLockoutProperties` validation.** `@Min(1)` on all three int properties. Fail at app startup, not at first failed login.

18. **Login attempts on a locked account DO NOT EXTEND the lock.** Hitting wrong-password while locked: the JPQL UPDATE still runs (count increments), but `locked_until` doesn't reset (because count was already >= threshold from the prior lock event). Verify behavior: 5 failures → lock at T+0 for 15 min. Two more failures at T+5 → count goes to 7, locked_until still T+15 (no extension). At T+15, lock expires.

    **Alternative behavior:** "lock-time grows on continued attempts" (escalating lockout). Master plan body doesn't specify. Recommend NOT escalating in this spec — keeps the model simple. If escalation is desired later, add it as a follow-up.

## Test specifications (target ~28 tests)

**Liquibase migration tests (~2):**
- `LiquibaseAccountLockoutColumnsTest`:
  - Migration applies cleanly to a clean DB
  - Rollback drops all three columns

**Repository tests (~5):**
- `LoginAttemptRepositoryTest` extends `AbstractDataJpaTest`:
  - `incrementFailedLogin` from 0 → count=1, window_start=now, lock=null
  - `incrementFailedLogin` within window → count++, window_start unchanged
  - `incrementFailedLogin` outside window → count=1 (reset), window_start=now
  - `incrementFailedLogin` reaching threshold → lock_until=now+duration
  - `resetLoginAttempts` clears all three fields

**Service tests (~4):**
- `LoginAttemptServiceTest`:
  - `recordFailedAttempt` calls repository
  - `recordSuccessfulLogin` skips reset when state is already clean (no DB call)
  - `recordSuccessfulLogin` calls reset when count > 0
  - `recordSuccessfulLogin` calls reset when locked_until is non-null

**AuthService.login tests (~12) extending `AbstractIntegrationTest`:**
- successful login with clean state (existing test stays green)
- successful login resets prior failed_count from 1
- 1st wrong password: count=1, window_start set, no lock
- 4th wrong password: count=4, no lock yet
- 5th wrong password: count=5, locked_until set
- locked + wrong password: returns 401 (anti-enumeration)
- locked + correct password: returns 423 ACCOUNT_LOCKED with Retry-After
- locked password test: Retry-After header is in seconds, >= 1
- post-lock-expiry: counts reset on next successful login
- post-lock-expiry: counts also reset on failed login outside window (window resets)
- unknown email path: unchanged (DUMMY_HASH still fires; no DB writes happen)
- timing equalization: locked-correct vs unlocked-wrong response times within 100ms of each other (sanity check, not strict)

**Exception handler tests (~2):**
- `AuthExceptionHandlerTest`:
  - `AccountLockedException` → 423 with Retry-After header set
  - Other `AuthException` types → no Retry-After header (regression check)

**End-to-end controller tests (~3) extending `AbstractIntegrationTest`:**
- POST /api/v1/auth/login: 5 wrong attempts → 5 in 401, 6th in 401 (rate-limited by filter; lockout fired but rate-limit fires first)
- POST /api/v1/auth/login: locked-correct-password → 423 with proper body shape
- POST /api/v1/auth/login: full lifecycle — fail 5 times, wait > lock duration (or use Clock fixture), succeed → counts reset

## Files to create

````
backend/src/main/java/com/worshiproom/auth/
  LoginAttemptService.java
  LoginAttemptRepository.java
  AccountLockoutProperties.java
  AccountLockedException.java          # extends AuthException, carries retryAfterSeconds

backend/src/test/java/com/worshiproom/auth/
  LoginAttemptServiceTest.java
  LoginAttemptRepositoryTest.java      # extends AbstractDataJpaTest
  AccountLockoutLifecycleTest.java     # extends AbstractIntegrationTest, full controller flow
  LiquibaseAccountLockoutColumnsTest.java

backend/src/main/resources/db/changelog/
  2026-04-30-002-add-users-account-lockout-columns.xml   # confirmed at recon time; re-verify at plan time

backend/docs/
  runbook-account-lockout.md
````

## Files to modify

````
backend/src/main/java/com/worshiproom/auth/AuthService.java     # extend login() with lockout logic per D4; change @Transactional(readOnly=true) → @Transactional
backend/src/main/java/com/worshiproom/auth/AuthException.java   # add accountLocked() factory + AccountLockedException subclass
backend/src/main/java/com/worshiproom/auth/AuthExceptionHandler.java  # extend handler with Retry-After header for AccountLockedException
backend/src/main/java/com/worshiproom/user/User.java            # add 3 fields + getters + setters for failedLoginCount, failedLoginWindowStart, lockedUntil
backend/src/main/resources/application.properties               # add auth.lockout.* properties
backend/src/main/resources/db/changelog/master.xml              # register new changeset
backend/src/main/resources/openapi.yaml                         # add 423 response to /auth/login
backend/src/test/java/com/worshiproom/auth/AuthServiceTest.java # extend with new lockout-flow tests (per test list)
````

## Files explicitly NOT modified

- `backend/src/main/java/com/worshiproom/auth/LoginRateLimitFilter.java` — already shipped (Spec 1.5), works as-is
- `backend/src/main/java/com/worshiproom/auth/SecurityConfig.java` — no new auth rules needed
- `backend/src/main/java/com/worshiproom/auth/PublicPaths.java` — `/api/v1/auth/login` already public
- Frontend — no UI changes. The login form's existing 401 handling covers wrong-password. The new 423 case shows a generic "your account is temporarily locked" toast via the shared `apiFetch` error handler — no special UI needed for MVP. Future spec can add specific UX (countdown timer, link to password reset) when 1.5b ships.

## Acceptance criteria

Master plan body's intent + brief additions:

- [ ] Migration adds three nullable-where-appropriate columns to users table; rollback drops all three
- [ ] `failed_login_count` defaults to 0 NOT NULL; existing users have 0
- [ ] On wrong password: count increments via atomic JPQL UPDATE; window auto-resets if last attempt was >15 min ago
- [ ] On 5th wrong password within 15 min: `locked_until = now + 15 min`
- [ ] On wrong password while locked: returns 401 INVALID_CREDENTIALS (anti-enumeration)
- [ ] On correct password while locked: returns 423 ACCOUNT_LOCKED with `Retry-After` header in seconds
- [ ] On correct password while not locked: count and timestamps reset to defaults
- [ ] DUMMY_HASH timing equalization for unknown email is preserved (regression test)
- [ ] BCrypt verify runs on every known-email login attempt (timing parity across paths)
- [ ] Continued failed attempts on a locked account do NOT extend the lock (no escalation in this spec)
- [ ] All log lines hash emails via EmailHasher; never log raw emails
- [ ] `@Modifying(clearAutomatically=true, flushAutomatically=true)` on both UPDATE queries (Phase 3 Addendum #3)
- [ ] OpenAPI yaml extended with 423 response shape on `/api/v1/auth/login`
- [ ] `AuthExceptionHandler` sets `Retry-After` header when handling `AccountLockedException`
- [ ] At least 28 tests across migration, repository, service, full integration
- [ ] `runbook-account-lockout.md` documents manual unlock via psql
- [ ] `application.properties` includes the new `auth.lockout.*` section with explanatory comments
- [ ] Liquibase changeset filename uses today's date and the next sequence number (recon at plan time)
- [ ] No frontend changes; existing apiFetch error handling covers the new 423 case

## Out of scope (deferred to other specs)

- Admin unlock endpoint (Spec 10.10b — Admin Foundation prerequisite)
- Frontend UX for locked-state (specific countdown timer, "reset password" link in toast) — needs Spec 1.5b shipped first; bundled with launch-prep UX polish
- Escalating lockout duration on continued attempts — out of scope; current model is constant 15-min lock
- Email notification to user on lockout ("someone tried to log in to your account") — needs SMTP (Spec 15.1) shipped; followup
- IP-based lockout (locked at the IP level, not just rate-limited) — out of scope; the existing per-IP rate limit is sufficient
- Geographic anomaly detection ("login from new country triggers lock") — far out of scope, MVP doesn't need
- Lockout integration with password reset (Spec 1.5b) — when 1.5b ships, password reset should auto-clear the lock; documented in the followups file
- CAPTCHA on login after N failures — out of scope; rate limiting is sufficient at MVP scale
- Banned-user gating in `AuthService.login` — `is_banned` is not currently checked; if added, fires BEFORE lockout. Out of scope here.
- Soft-deleted user handling (`is_deleted=true`) — currently returned by `findByEmailIgnoreCase`; soft-deleted users could have lockout state mutated cosmetically. Spec 10.11 concern.

## Brand voice / Universal Rules quick reference (1.5f-relevant)

- Rule 4: OpenAPI extended for 423 response shape
- Rule 6: All new code has tests
- Rule 11: Brand voice — "Too many failed attempts. Try again in 15 minutes, or reset your password." (sentence case, period, no exclamation, no urgency framing)
- Rule 15: Rate limiting is shipped at the filter layer; this spec adds the persistent layer
- Rule 16: Respect existing patterns — domain-scoped advice (auth handler is intentionally unscoped per R4), constructor injection, `@ConfigurationProperties`

## Tier rationale

xHigh, not MAX. The dimensions:
1. **No novel patterns** — existing `LoginRateLimitFilter` and `AuthService.login` flow are direct templates. Adding a persistent lockout layer is well-trodden security infrastructure.
2. **No cross-author leakage surface** — locking is per-user-account, scoped to authentication. No cross-user data exposure.
3. **No privilege escalation surface** — `.authenticated()` not affected. The endpoint is `permitAll` (public login), and the lockout makes it MORE restrictive, not less.
4. **Anti-enumeration is the security-critical concern** — addressed via D3 (locked+wrong=401, not 423) with explicit test. The brief carries the structured reasoning.
5. **Recoverable failure modes** — bug → user gets locked when they shouldn't, or doesn't get locked when they should. Both are recoverable: the manual unlock procedure (D11) handles false-positive lockouts; the existing rate-limit filter provides defense-in-depth for false-negative lockouts.

The brief's 18 watch-fors + 28-test target + 12 explicit decisions provide structured reasoning. xHigh + comprehensive brief outperforms MAX + thin brief.

## Recommended planner instruction

When invoking `/plan-forums spec-1-5f`, run the Plan Tightening Audit with extra scrutiny on:
- Lens 2 (L1-cache trap) — verify both UPDATE queries have both `clearAutomatically` and `flushAutomatically` flags
- Lens 3 (anti-enumeration) — verify locked+wrong returns 401, not 423; locked+correct returns 423
- Lens 5 (SecurityConfig) — verify NO security config changes are made (the endpoint is already public)
- Lens 6 (validation) — `@Min(1)` on all `AccountLockoutProperties` integer fields
- Lens 8 (recon at plan time) — confirm the latest Liquibase changeset and pick the right sequence number for today
- Lens 14 (test for the timing-equalization invariant) — DUMMY_HASH path stays intact; regression test included
