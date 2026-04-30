# Forums Wave: Spec 1.5c — Change Password Endpoint

**Master Plan Reference:** `_forums_master_plan/round3-master-plan.md` → Spec 1.5c (lines 8485-8499 of master plan body)
**Branch:** `forums-wave-continued`
**Date:** 2026-04-30

---

## Affected Frontend Routes

- `/settings?tab=account`

---

## Spec 1.5c Brief — Change Password Endpoint

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

**xHigh.** Master plan body says S/Low. Single-endpoint spec with well-trodden patterns (mirrors AuthService.login + AuthService.register flows shipped in Spec 1.5). However, this is a security-boundary endpoint — current-password verification, BCrypt re-hash, rate limiting, anti-enumeration logic — and the brief carries the structured reasoning explicitly. xHigh + comprehensive brief outperforms direct-prompt-with-implicit-decisions for security work. MAX would be over-spending.

## Master Plan Divergence

Three deliberate divergences from the master plan body's text (lines 8485-8499 of `_forums_master_plan/round3-master-plan.md`):

**MPD-1: Frontend file structure differs from master plan body.** Master plan body says create `frontend/src/pages/settings/ChangePasswordSection.tsx` and modify `frontend/src/pages/settings/SettingsPage.tsx`. Recon: neither path exists. The actual structure is:
- Settings page: `frontend/src/pages/Settings.tsx` (NOT in `settings/` subdirectory)
- Section components: `frontend/src/components/settings/*.tsx` (mirrors AccountSection, ProfileSection, PrivacySection, etc.)

This brief follows the actual project structure. The new section component lands at `frontend/src/components/settings/ChangePasswordModal.tsx` (modal form, not inline section — see MPD-2).

**MPD-2: Wire to existing "Change Password" button in `AccountSection.tsx`, not a new top-level section.** Recon revealed `frontend/src/components/settings/AccountSection.tsx:62-69` already has a "Change Password" button that fires `showToast('This feature is on the way.')`. The frontend wiring scope is to **replace the toast with a modal** that hosts the change-password form. Adding a new top-level Settings section would be inconsistent with the existing UX where Account-tier actions (Change Email, Change Password, Delete Account) all live under "Account."

**MPD-3: Anti-enumeration rate-limit dimension.** Master plan body doesn't specify rate limiting for this endpoint. Per the recalibrated tier rules and the LoginRateLimitFilter precedent (Spec 1.5), brute-force protection on a current-password verification endpoint is required. This brief adds a per-user rate limit (5 attempts / 15 min) using a NEW Caffeine-bounded bucket parallel to the existing login filter. Reasoning: an attacker with a valid stolen JWT (e.g., session hijack) could brute-force the current password to take over the account permanently. Rate limit caps this to 5 attempts before lockout window kicks in. See D5.

## Recon Ground Truth (2026-04-30)

All facts re-verified on the active machine (`/Users/eric.champlin/worship-room/`):

**R1 — `AuthController` is the canonical auth-endpoint controller** at `backend/src/main/java/com/worshiproom/auth/AuthController.java`. Three endpoints today: POST `/register`, POST `/login`, POST `/logout`. Per master plan body, this spec adds POST `/change-password` to the same controller (extend, don't create a new controller).

**R2 — `AuthService` is the canonical auth-service** with `register()` and `login()` methods. This spec adds `changePassword(UUID userId, ChangePasswordRequest)` to the same class. Service is `@Service`, login is `@Transactional(readOnly = true)`, register is `@Transactional`. The new `changePassword` method is `@Transactional` (writes user.passwordHash).

**R3 — `BCryptPasswordEncoder` is dependency-injected** as `passwordEncoder`. Same instance used for register's encode and login's matches. Strength is the Spring Boot default (10). NO encoder-strength changes in this spec.

**R4 — `User` entity** has `passwordHash` field with `setPasswordHash(String)` setter (verified in `backend/src/main/java/com/worshiproom/user/User.java`). The User entity also has `updated_at` column auto-managed by JPA `@PrePersist` / `@PreUpdate` — saving the user via `userRepository.save(user)` will bump `updated_at` automatically.

**R5 — `AuthException` factory pattern.** Existing factories: `unauthorized()`, `tokenMalformed()`, `tokenInvalid()`, `tokenExpired()`, `invalidCredentials()`. This spec adds `currentPasswordIncorrect()` (401, code `CURRENT_PASSWORD_INCORRECT`) and `passwordsMustDiffer()` (400, code `PASSWORDS_MUST_DIFFER`). Per the LoginRateLimitFilter precedent for rate-limited auth flows, also add `changePasswordRateLimited(long retryAfterSec)` returning 429 with code `CHANGE_PASSWORD_RATE_LIMITED`.

**R6 — `AuthExceptionHandler`** is unscoped (`@RestControllerAdvice` with no `basePackages`). Handles all `AuthException` subtypes. This spec extends the handler ONLY if 429 needs `Retry-After` header (parallel pattern to Spec 1.5f's `AccountLockedException` handling per Eric's brief that's in flight). For consistency with that pattern, add `ChangePasswordRateLimitedException` as a subclass of `AuthException` and check `instanceof` in the handler.

**[VERIFY at plan time] Spec 1.5f appears to have shipped** — `AccountLockedException.java` and `AccountLockoutProperties.java` already exist in the auth package. If confirmed, the AuthExceptionHandler likely already has the Retry-After pattern wired for `AccountLockedException`, and this spec adds a second `else if` for `ChangePasswordRateLimitedException` rather than introducing the pattern fresh. Plan recon should grep AuthExceptionHandler to confirm the current state.

**R7 — `LoginRateLimitFilter` is the canonical Caffeine-bucket pattern** for per-dimension rate limiting at the filter layer. This spec uses the same Caffeine-bucket pattern but at the **service layer** (not filter), keyed by **userId** (not email or IP). Reasoning: change-password is an authenticated endpoint; the JWT principal gives us userId for free, and per-user is the right granularity (one rate-limit bucket per user account, regardless of how many devices they're attempting from).

**R8 — JWT extraction in controllers.** Existing patterns (e.g., `PostController`, `CommentController`, `ReportController` per Spec 3.8) use `@AuthenticationPrincipal AuthenticatedUser principal` parameter. Spec 1.5c uses the same pattern.

**R9 — `apiFetch` exists** in `frontend/src/lib/api-client.ts`. Authenticated requests automatically include Bearer token via `getStoredToken()`. 401 responses dispatch `wr:auth-invalidated` event. The new `changePassword` API call goes through `apiFetch` without `skipAuth: true`.

**R10 — `Settings.tsx`** at `frontend/src/pages/Settings.tsx` is the actual settings page. Routes via `<Settings />` component with auth gate (`if (!isAuthenticated) return <Navigate to="/" replace />`). 6 section tabs (profile, dashboard, notifications, privacy, account, app). The "Account" tab renders `<AccountSection email={user.email} />`.

**R11 — `AccountSection.tsx`** at `frontend/src/components/settings/AccountSection.tsx` already contains:
- Email row with "Change Email" button (toast: "This feature is on the way.")
- "Change Password" button (toast: "This feature is on the way.")
- "Delete Account" red button (opens `DeleteAccountModal`)

The DeleteAccountModal is the canonical pattern for an Account-section modal. Reuse the same shape for `ChangePasswordModal`.

**R12 — `DeleteAccountModal.tsx`** at `frontend/src/components/settings/DeleteAccountModal.tsx` is the modal pattern reference. Modal-as-component, controlled via `showDeleteModal` state in parent. Esc/backdrop dismissal, focus trap, ARIA dialog role. Mirror this shape.

**R13 — `useToast` hook** is the canonical toast notification surface. Imported from `@/components/ui/Toast`. Used in `AccountSection` for the placeholder. ChangePasswordModal uses it for success toast on completion.

**R14 — Password validation rule.** From `RegisterRequest.java:12`: `@Size(min = 8, max = 255)` — minimum 8 chars, maximum 255. NO complexity requirements (no special chars, no mixed case). This spec mirrors that rule on the new password field. Frontend matches: minimum 8 characters, max 255.

**R15 — `EmailHasher` exists** for forensic-safe email logging. New log lines in `AuthService.changePassword` log the userId (UUID, not PII), not the email. No EmailHasher needed in this spec.

**R16 — No new SecurityConfig changes needed.** `/api/v1/auth/change-password` is NOT in `PublicPaths.PATTERNS`, so it falls through to the `/api/v1/**` `.authenticated()` rule at the bottom of SecurityConfig. JwtAuthenticationFilter processes the Bearer token and extracts the `AuthenticatedUser` principal. **Verified by reading SecurityConfig.java end-to-end.**

**R17 — `ProxyError` envelope** at `backend/src/main/java/com/worshiproom/proxy/common/ProxyError.java`. AuthExceptionHandler already wraps in `ProxyError.of(code, message, requestId)`. No envelope changes.

**R18 — `application.properties` rate-limit conventions.** New properties under `auth.rate-limit.change-password.*`:
```
auth.rate-limit.change-password.capacity=5
auth.rate-limit.change-password.window-minutes=15
```
Mirrors the shape of `auth.rate-limit.per-email.*` and `auth.rate-limit.per-ip.*` (already shipped per Spec 1.5).

## Phase 3 Execution Reality Addendum gates — applicability

| # | Convention | Applies to 1.5c? |
|---|---|---|
| 1 | EditWindowExpired returns 409 | N/A — no edit-window endpoints |
| 2 | L1-cache trap | **APPLIES MILDLY** — service does `userRepository.findById()` then `setPasswordHash()` then save. Standard JPA flow, no JPQL UPDATE, no L1-cache trap risk |
| 3 | `@Modifying` flags | N/A — uses entity-based `userRepository.save()`, not JPQL UPDATE |
| 4 | SecurityConfig method-specific rule ordering | **DOES NOT APPLY** — endpoint falls through to the catchall `/api/v1/**` `.authenticated()` rule per R16. NO new SecurityConfig changes |
| 5 | Caffeine-bounded bucket pattern | **APPLIES** — service-layer rate limit per R7 |
| 6 | Domain-scoped `@RestControllerAdvice` | **DOES NOT APPLY** — `AuthExceptionHandler` is intentionally unscoped per R6 (handles filter-thrown exceptions where the handler is null). Mirror that pattern |
| 7 | `CrisisAlertService` unified entry | N/A |
| 8 | Schema realities — do NOT recreate | **CRITICAL** — `users` table EXISTS. NO schema changes in this spec. NEVER add `create-users-table.xml` |
| 9 | INTERCESSION ActivityType | N/A |
| 10 | `wr_prayer_reactions` shape | N/A |
| 11 | Liquibase filename convention | N/A — no schema changes |
| 12 | BB-45 cross-mount subscription test | N/A — backend spec |

## Decisions and divergences (10 items)

**D1 — Endpoint shape: `POST /api/v1/auth/change-password`.**
Body:
```json
{
  "currentPassword": "...",
  "newPassword": "..."
}
```
Response on success: 204 No Content (matches `/logout` precedent — no body needed). Response on failure: 400/401/429 with ProxyError envelope.

Why 204 not 200: there's no payload to return. The caller already knows the new password (they just submitted it). Returning 200 with `{success: true}` would be empty-content noise. 204 is the canonical "succeeded, no body" response.

**D2 — Service method signature.**
```java
@Transactional
public void changePassword(UUID userId, ChangePasswordRequest request) {
    // Implementation per D3
}
```
Method is `void` (no return) matching the 204 response.

**D3 — Service flow.**

```java
public void changePassword(UUID userId, ChangePasswordRequest request) {
    // Rate limit check FIRST (cheap, fail-fast on abuse)
    changePasswordRateLimitService.checkAndConsume(userId);

    // Load user (we already know they're authenticated; user must exist)
    User user = userRepository.findById(userId)
        .orElseThrow(() -> new IllegalStateException(
            "Authenticated principal references non-existent user: " + userId));

    // Verify current password — ALWAYS run BCrypt for timing equalization
    boolean currentPasswordMatches = passwordEncoder.matches(
        request.currentPassword(), user.getPasswordHash());

    if (!currentPasswordMatches) {
        log.info("changePasswordCurrentIncorrect userId={}", userId);
        throw AuthException.currentPasswordIncorrect();
    }

    // Reject if old == new (UX nicety, prevents accidental no-op)
    if (passwordEncoder.matches(request.newPassword(), user.getPasswordHash())) {
        log.info("changePasswordSameAsCurrent userId={}", userId);
        throw AuthException.passwordsMustDiffer();
    }

    // All checks passed — re-hash and save
    String newHash = passwordEncoder.encode(request.newPassword());
    user.setPasswordHash(newHash);
    userRepository.save(user);

    log.info("changePasswordSucceeded userId={}", userId);
}
```

**Order matters:** rate limit FIRST (fail-fast), then load user, then BCrypt-verify current, then BCrypt-verify new!=current, then update. The `passwordEncoder.matches(request.newPassword(), user.getPasswordHash())` runs against the OLD hash — this catches the case where the user typed their current password again.

**D4 — Existing JWT remains valid after password change.**
This spec does NOT invalidate other sessions or rotate the JWT. The current request's JWT continues to work. Other devices logged into the same account continue to work until their JWT expires naturally.

Reasoning: JWT invalidation requires a Redis-backed blocklist, which is Spec 1.5g's territory (and is Redis-blocked until 5.6 ships). Documenting "session invalidation on password change" as out-of-scope here ensures the user understands the security model: a leaked password before change → attacker can use stolen sessions until the JWT TTL expires (default ~24h). When 1.5g ships, password-change should ALSO invalidate other sessions; document this as a followup.

Followup entry to add to `_plans/post-1.10-followups.md`:
```
## NN. Change-password should invalidate other sessions (Spec 1.5g dependency)

When 1.5g (Session Invalidation & Logout-All-Devices) ships, AuthService.changePassword
should optionally invalidate all other active sessions for the user (keep current
session, blocklist all others). Today (Spec 1.5c shipped without 1.5g): password
change updates the hash; existing JWTs remain valid until natural TTL expiry.

Captured: 2026-04-30 during Spec 1.5c authoring.
Revisit: when Spec 1.5g is in flight.
```

**D5 — Rate limit: 5 attempts / 15 min per user.**
New `ChangePasswordRateLimitService` mirrors `BookmarksRateLimitService` shape:

```java
@Service
public class ChangePasswordRateLimitService {
    private final Cache<UUID, Bucket> userBuckets;
    private final int capacity;
    private final int windowMinutes;

    public ChangePasswordRateLimitService(
            @Value("${auth.rate-limit.change-password.capacity}") int capacity,
            @Value("${auth.rate-limit.change-password.window-minutes}") int windowMinutes
    ) {
        this.capacity = capacity;
        this.windowMinutes = windowMinutes;
        this.userBuckets = Caffeine.newBuilder()
            .maximumSize(10_000)
            .expireAfterAccess(Duration.ofMinutes(30))  // 2x window for safety
            .build();
    }

    public void checkAndConsume(UUID userId) {
        Bucket bucket = userBuckets.get(userId, k -> buildBucket());
        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);
        if (!probe.isConsumed()) {
            long retryAfterSec = Math.max(1L, probe.getNanosToWaitForRefill() / 1_000_000_000L);
            throw AuthException.changePasswordRateLimited(retryAfterSec);
        }
    }

    private Bucket buildBucket() {
        Bandwidth limit = Bandwidth.classic(capacity,
            Refill.intervally(capacity, Duration.ofMinutes(windowMinutes)));
        return Bucket.builder().addLimit(limit).build();
    }
}
```

**Bucket eviction: 30-min window for a 15-min refill.** Eviction strictly longer than refill prevents giving an attacker free retries by evicting an active bucket.

**D6 — `ChangePasswordRequest` DTO with validation.**

```java
package com.worshiproom.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ChangePasswordRequest(
    @NotBlank @Size(min = 1, max = 255) String currentPassword,
    @NotBlank @Size(min = 8, max = 255) String newPassword
) {}
```

`currentPassword` has `min=1` (just non-blank) — we only check it via BCrypt; size constraints are for input sanity. `newPassword` has `min=8, max=255` matching `RegisterRequest.password` validation per R14.

**D7 — `ChangePasswordRateLimitedException` extends `AuthException`.**
Carries `retryAfterSeconds`. Handler reads instance type and adds `Retry-After` header on 429:

```java
// In AuthExceptionHandler.handleAuth (extension):
@ExceptionHandler(AuthException.class)
public ResponseEntity<ProxyError> handleAuth(AuthException ex) {
    var requestId = MDC.get("requestId");
    log.info("Auth rejected: code={} message={}", ex.getCode(), ex.getMessage());
    var builder = ResponseEntity.status(ex.getStatus());
    if (ex instanceof ChangePasswordRateLimitedException rl) {
        builder.header(HttpHeaders.RETRY_AFTER, String.valueOf(rl.getRetryAfterSeconds()));
    }
    return builder.body(ProxyError.of(ex.getCode(), ex.getMessage(), requestId));
}
```

**Note for sequencing with 1.5f:** Spec 1.5f (Account Lockout) appears to have shipped already per the recon ground-truth update above (`AccountLockedException.java` exists in the auth package). If the AuthExceptionHandler already carries the Retry-After pattern for `AccountLockedException`, this spec adds a second `else if` for `ChangePasswordRateLimitedException`. Plan recon must confirm and adjust the handler patch accordingly.

**D8 — Logging discipline.**
- `log.info("changePasswordCurrentIncorrect userId={}", userId);` — log userId (UUID), NOT email
- `log.info("changePasswordSameAsCurrent userId={}", userId);`
- `log.info("changePasswordSucceeded userId={}", userId);`
- NEVER log password values (current OR new)
- NEVER log password hash
- The rate-limit service logs at INFO when it throws: `log.info("changePasswordRateLimited userId={} retryAfterSec={}", userId, retryAfterSec);`

**D9 — Frontend wiring: replace toast with modal.**

`AccountSection.tsx` currently has:
```tsx
<button
  type="button"
  onClick={() => showToast('This feature is on the way.')}
  className="..."
>
  Change Password
</button>
```

Replace with:
```tsx
const [showChangePasswordModal, setShowChangePasswordModal] = useState(false)

<button
  type="button"
  onClick={() => setShowChangePasswordModal(true)}
  className="..."
>
  Change Password
</button>

{showChangePasswordModal && (
  <ChangePasswordModal
    onClose={() => setShowChangePasswordModal(false)}
    onSuccess={() => {
      setShowChangePasswordModal(false)
      showToast('Your password has been updated.')
    }}
  />
)}
```

`ChangePasswordModal` is a new component at `frontend/src/components/settings/ChangePasswordModal.tsx`. Mirrors `DeleteAccountModal.tsx` shape for ARIA/focus/keyboard handling. Form fields:
- "Current password" (type=password, required)
- "New password" (type=password, required, minLength=8)
- "Confirm new password" (type=password, required, must match new password — client-side validation only)
- "Update password" submit button (disabled while submitting)
- "Cancel" button

**D10 — Frontend service module.**

New file `frontend/src/services/api/auth-api.ts` (or extend if it exists — recon at plan time):
```typescript
export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  return apiFetch('/api/v1/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword })
  })
}
```

If `auth-api.ts` doesn't exist yet, this spec creates it. If it exists, extend with this function. The rest of `AuthContext`'s register/login flow does NOT migrate to this module in this spec — out of scope.

## Watch-fors (15 items)

1. **BCrypt verify ALWAYS runs on the current-password check.** Don't shortcut by checking length first or anything — pay the BCrypt cost on every request. This is timing-equalization defense-in-depth. The rate limit catches the brute-force path; BCrypt timing keeps individual probes from leaking info.

2. **`passwordEncoder.matches(newPassword, oldHash)` runs AFTER currentPassword check passes.** Order matters: if currentPassword is wrong, throw 401 immediately. Don't leak any info about the new password by running its check first.

3. **NO password complexity requirements.** Per R14, only `@Size(min=8, max=255)`. Don't introduce uppercase/lowercase/special-char rules. Bcrypt + length is the project's password policy.

4. **NO password-history check.** This spec does NOT track previous passwords. Setting newPassword to a value the user used 6 months ago succeeds. Out of scope. (If ever needed, would require a new `password_history` table and is its own spec.)

5. **`Retry-After` header units: SECONDS, not millis.** Mirror `BookmarksRateLimitException` precedent. Header value calculation: `Math.max(1L, probe.getNanosToWaitForRefill() / 1_000_000_000L)`.

6. **Rate limit bucket eviction window > refill window.** Caffeine's `expireAfterAccess(30 min)` for a 15-min refill bucket. If eviction were 10 min, an attacker could force eviction by waiting 11 min, then get a fresh bucket. 30-min eviction prevents this.

7. **Rate limit is per-user, not per-IP.** An attacker with a valid JWT from a session-hijack can only attempt 5 password changes against the victim's account regardless of IP. An attacker with JWTs from 100 different stolen accounts gets 500 attempts total but only 5 per account.

8. **JWT not invalidated on password change.** Per D4. Document in the success toast copy ("Your password has been updated.") — do NOT add "and you've been logged out of other devices" because that's not true today. When 1.5g ships, the toast may change.

9. **OpenAPI yaml extension (Universal Rule 4).** Add `paths./auth/change-password.post`, `components.schemas.ChangePasswordRequest`. Reference existing `ProxyError` for 401/400/429 responses.

10. **`@Valid` annotation on the request body.** Mirror `AuthController.register` and `AuthController.login` pattern. Validation errors surface via `AuthValidationExceptionHandler` (already shipped).

11. **Anti-enumeration is not a concern here.** Unlike login (where unknown email vs wrong password timing matters), change-password requires authentication, so there's no enumeration surface — the attacker already knows which userId they're targeting (their own JWT carries it). The only enumeration risk would be "is this a real user?" but `principal.userId()` is always real for an authenticated request (else the JWT filter would have rejected). Therefore: no DUMMY_HASH equivalent needed.

12. **Constructor injection.** `AuthService` already uses constructor injection. Add `ChangePasswordRateLimitService` to the constructor. NO `@Autowired` field annotations.

13. **Service-layer race safety.** Two concurrent change-password requests for the same user could:
    - Both load user with hash H1
    - Both set new hashes H2 and H3
    - Last write wins
    - This is acceptable — rare race, last-writer-wins is fine, no data corruption
    - The rate limit (5 per 15 min) makes this practically impossible anyway

14. **Frontend modal Cancel button does NOT call API.** Cancel just closes the modal. Form state is dropped. Do NOT log a "user cancelled change password" event — that's not signal worth capturing.

15. **Frontend modal: focus management.** On open, focus jumps to "Current password" field. On close (Esc/backdrop/Cancel/Success), focus returns to the "Change Password" button in AccountSection. Mirror `DeleteAccountModal` pattern.

## Test specifications (target ~22 tests, master plan AC says ≥10)

The master plan body says S/Low risk. Brief argues 22 tests for thorough coverage of the security-boundary surface.

**Backend tests (~17):**

`AuthControllerChangePasswordTest` extends `AbstractIntegrationTest` (~10 tests):
- POST /change-password: 204 success with valid current + new
- POST /change-password: 401 INVALID_CREDENTIALS for wrong current password (well, CURRENT_PASSWORD_INCORRECT actually — adjust)
- POST /change-password: 400 PASSWORDS_MUST_DIFFER when new == current
- POST /change-password: 400 validation when new password is too short (< 8 chars)
- POST /change-password: 400 validation when new password is missing
- POST /change-password: 400 validation when current password is blank
- POST /change-password: 401 (no Bearer token)
- POST /change-password: 401 (invalid Bearer token — e.g., expired)
- POST /change-password: 429 with Retry-After after 5 failed attempts within window
- POST /change-password: post-success login with NEW password works; OLD password fails

`AuthServiceChangePasswordTest` (~5 tests, can extend `AbstractIntegrationTest`):
- changePassword updates user.passwordHash to new BCrypt hash
- changePassword throws CURRENT_PASSWORD_INCORRECT on wrong current
- changePassword throws PASSWORDS_MUST_DIFFER when new matches current
- changePassword updates user.updatedAt timestamp (verifies JPA @PreUpdate fired)
- changePassword does NOT modify other user fields (firstName, lastName, etc.)

`ChangePasswordRateLimitServiceTest` plain JUnit5 (~2 tests):
- Bucket allows 5 consumes within window
- 6th consume throws ChangePasswordRateLimitedException with retryAfterSeconds > 0

**Frontend tests (~5):**

`ChangePasswordModal.test.tsx` (~5 tests):
- Renders three password fields + Update + Cancel
- "Confirm new password" mismatch shows inline error
- Submit calls changePassword API with current + new
- Successful API call calls onSuccess prop
- 401 from API shows "Your current password isn't correct" inline error (NOT a toast — inline is more contextual)

## Files to create

```
backend/src/main/java/com/worshiproom/auth/
  ChangePasswordRateLimitService.java
  ChangePasswordRateLimitedException.java
  dto/
    ChangePasswordRequest.java

backend/src/test/java/com/worshiproom/auth/
  AuthControllerChangePasswordTest.java
  AuthServiceChangePasswordTest.java
  ChangePasswordRateLimitServiceTest.java

frontend/src/components/settings/
  ChangePasswordModal.tsx

frontend/src/components/settings/__tests__/
  ChangePasswordModal.test.tsx

frontend/src/services/api/
  auth-api.ts                      # NEW if it doesn't exist; extend if it does (recon at plan time)
```

## Files to modify

```
backend/src/main/java/com/worshiproom/auth/AuthController.java        # add changePassword endpoint method
backend/src/main/java/com/worshiproom/auth/AuthService.java           # add changePassword method per D3
backend/src/main/java/com/worshiproom/auth/AuthException.java         # add 3 new factory methods
backend/src/main/java/com/worshiproom/auth/AuthExceptionHandler.java  # extend with Retry-After header for ChangePasswordRateLimitedException

backend/src/main/resources/application.properties                     # add auth.rate-limit.change-password.* properties
backend/src/main/resources/openapi.yaml                               # add /auth/change-password endpoint + ChangePasswordRequest schema

frontend/src/components/settings/AccountSection.tsx                   # replace placeholder toast with modal trigger
frontend/src/components/settings/__tests__/AccountSection.test.tsx    # extend with modal-trigger test (if file exists; create if not)

_plans/post-1.10-followups.md                                          # add Spec 1.5g session-invalidation followup per D4
```

## Files explicitly NOT modified

- `backend/src/main/java/com/worshiproom/auth/SecurityConfig.java` — no new auth rules needed (R16)
- `backend/src/main/java/com/worshiproom/auth/PublicPaths.java` — endpoint is authenticated by default
- `backend/src/main/java/com/worshiproom/auth/JwtService.java` — no JWT changes
- `backend/src/main/java/com/worshiproom/auth/LoginRateLimitFilter.java` — login rate limiting is unchanged
- `backend/src/main/resources/db/changelog/*.xml` — NO schema changes
- `backend/src/main/java/com/worshiproom/user/User.java` — no User entity changes
- `frontend/src/contexts/AuthContext.tsx` — no auth context changes; password change does NOT log out the user
- `frontend/src/pages/Settings.tsx` — no top-level Settings changes; AccountSection handles the wiring

## Acceptance criteria

- [ ] `POST /api/v1/auth/change-password` requires authentication (returns 401 without Bearer token)
- [ ] On success: returns 204 No Content; user.passwordHash updated to BCrypt hash of new password
- [ ] On wrong current password: returns 401 with code CURRENT_PASSWORD_INCORRECT
- [ ] On new == current: returns 400 with code PASSWORDS_MUST_DIFFER (uses BCrypt match against current hash to detect)
- [ ] On new password < 8 chars: returns 400 with validation error
- [ ] On new password > 255 chars: returns 400 with validation error
- [ ] On 6th attempt within 15 min window: returns 429 with Retry-After header in seconds
- [ ] BCrypt verify of currentPassword runs on EVERY request (timing-equalization invariant)
- [ ] BCrypt verify of newPassword-vs-current-hash runs ONLY after currentPassword check passes
- [ ] Existing JWT continues to work after successful password change (no session invalidation)
- [ ] Subsequent login with NEW password succeeds; subsequent login with OLD password fails (404 / INVALID_CREDENTIALS)
- [ ] Rate limit bucket is per-user (UUID-keyed); 30-min eviction window for 15-min refill bucket
- [ ] All log lines use `userId` (UUID), never email; never log password value; never log password hash
- [ ] OpenAPI yaml extended with /auth/change-password endpoint + ChangePasswordRequest DTO + 4 response codes (204, 400, 401, 429)
- [ ] AuthExceptionHandler sets Retry-After header when handling ChangePasswordRateLimitedException
- [ ] application.properties includes the new auth.rate-limit.change-password.* section with explanatory comments
- [ ] Frontend ChangePasswordModal replaces the placeholder toast in AccountSection
- [ ] Modal mirrors DeleteAccountModal pattern: ARIA dialog, focus trap, Esc/backdrop dismissal, focus restore on close
- [ ] Modal "Confirm new password" field validates match client-side; submit disabled until all fields valid
- [ ] Modal success toast: "Your password has been updated." (sentence case, period, no exclamation)
- [ ] Modal current-password-wrong inline error (NOT toast): "Your current password isn't correct."
- [ ] No frontend logout occurs on successful password change
- [ ] Followup entry added to _plans/post-1.10-followups.md per D4
- [ ] At least 22 tests across backend + frontend

## Out of scope (deferred to other specs)

- Session invalidation on password change (Spec 1.5g — Redis-blocked)
- Password complexity requirements (out of scope; Bcrypt + length is the project's policy)
- Password history (no `password_history` table; can re-use old passwords)
- Email notification "Your password was changed" (Spec 1.5d/15.1 territory — SMTP-blocked)
- 2FA enrollment / re-enrollment flows (out of scope; not in master plan)
- Password reset (Spec 1.5b — SMTP-blocked)
- Forced password change (admin-initiated) — out of scope
- Account-recovery questions — out of scope (modern best practice avoids these)

## Brand voice / Universal Rules quick reference (1.5c-relevant)

- Rule 4: OpenAPI extended for new endpoint
- Rule 6: All new code has tests
- Rule 11: Brand voice — pastor's-wife test on the 4 user-facing strings (success toast, current-wrong inline error, new-too-short error, rate-limited toast/error)
- Rule 12: Anti-pressure copy — sentence case + period, no exclamation, no urgency framing
- Rule 15: Rate limiting on the endpoint (per D5)
- Rule 16: Respect existing patterns — `AuthService` extension, AuthException factory methods, Caffeine bucket pattern, constructor injection, `@Valid` request bodies, ProxyError envelope, modal pattern from DeleteAccountModal

## Tier rationale

xHigh, not MAX. The dimensions:
1. **No novel patterns** — extends existing `AuthController`/`AuthService` shape, mirrors `BookmarksRateLimitService`, mirrors `DeleteAccountModal`. All Phase 1 + Phase 3 conventions apply directly.
2. **No cross-author leakage surface** — endpoint operates only on the authenticated user's own row.
3. **Privilege escalation surface is bounded** — caller MUST already be authenticated. They can only change their OWN password (`principal.userId()` is the only userId in play; never accept userId from request body or path).
4. **Recoverable failure modes** — bug → user can't change password (UI shows error; user retries) OR user changes to a password they didn't intend (they reset via 1.5b once that ships, or contact support for manual reset via psql).
5. **Anti-enumeration risk is N/A** per Watch-For #11 (authenticated endpoint).

The brief's 15 watch-fors + 22-test target + 10 explicit decisions provide structured reasoning. xHigh + comprehensive brief outperforms MAX + thin brief for this kind of pattern-application spec.

## Recommended planner instruction

When invoking `/plan-forums spec-1-5c`, run the Plan Tightening Audit with extra scrutiny on:
- Lens 2 (BCrypt timing equalization) — verify currentPassword BCrypt runs on every request, not short-circuited
- Lens 5 (SecurityConfig) — verify NO security config changes are made (the catchall rule covers this endpoint)
- Lens 6 (validation) — `@NotBlank @Size(min=8, max=255)` on newPassword; `@NotBlank @Size(min=1, max=255)` on currentPassword
- Lens 9 (Caffeine bucket eviction) — verify `expireAfterAccess(30 min)` for 15-min window (eviction > refill prevents free-retry attack)
- Lens 14 (logging discipline) — verify NO password values, NO password hashes, NO emails in any log line; only userId
- Lens 15 (no session invalidation in this spec) — explicit acceptance test that JWT continues to work after change
