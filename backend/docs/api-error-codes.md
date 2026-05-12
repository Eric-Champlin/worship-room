# API Error Code Catalog

**Last updated:** 2026-04-30 (Spec 1.5c — Change Password)
**Owner:** backend
**Sibling docs:** `backend/docs/runbook-security-headers.md`

## 1. Purpose and scope

This document is the canonical, machine-readable list of every error `code`
string the Worship Room API returns in an error response body's `code` field.
It exists so future endpoints (Phase 2 activity engine and beyond) reuse
existing codes instead of inventing parallel ones — `INVALID_INPUT`,
`VALIDATION_FAILED`, `BAD_REQUEST`, `VALIDATION_ERROR` would otherwise all
appear over time meaning the same thing.

**This document IS:**

- A catalog of every `code` string emitted in production today.
- The naming-convention reference for new codes added by Phase 2+.
- The procedure for adding a new code.
- A registry of known naming drift and structural gaps for future cleanup specs.

**This document is NOT:**

- A list of HTTP status codes — those live in
  `.claude/rules/03-backend-standards.md` § HTTP Status Codes.
- A list of response envelope fields — that lives in the same rule file.
- A list of per-endpoint error responses — those live in
  `backend/src/main/resources/openapi.yaml` per-operation `responses` blocks.
- Authoritative for HTTP status semantics. Each `code` carries a fixed
  associated HTTP status, but the same status (e.g., 400) can be emitted with
  multiple distinct codes (`INVALID_INPUT`, `VALIDATION_FAILED`).

## 2. Error response envelope

Standard error body shape (defined in `ProxyError.java`, referenced from
`.claude/rules/03-backend-standards.md`):

```json
{
  "code": "RATE_LIMITED",
  "message": "Too many requests. Try again in 60 seconds.",
  "requestId": "Mw7n2K8x3qY9jL4vP1tRsA",
  "timestamp": "2026-04-25T10:30:00Z"
}
```

`VALIDATION_FAILED` extends this envelope with an additional `fieldErrors`
map. See section 6.1 for the drift this creates and section 3 for the field
list.

## 3. The catalog

Sorted by category, alphabetical within category. The "Emitted in" column lists
the throw site closest to the user (factory or handler); for upstream-error
codes with many throw sites, see the source files for the full list. The
"Notes" column flags non-obvious behavior worth knowing before reusing a code.

### Auth

| Code | HTTP | Triggered by | Client copy pattern | Emitted in | Notes |
|---|---|---|---|---|---|
| `CHANGE_PASSWORD_RATE_LIMITED` | 429 | More than 5 change-password attempts (success or failure) within a 15-min refill window per user | `"Too many password-change attempts. Please try again later."` (static) | `AuthException.changePasswordRateLimited()` → `ChangePasswordRateLimitedException` ← `ChangePasswordRateLimitService.checkAndConsume` ← `AuthService.changePassword` | Spec 1.5c. Per-user (UUID-keyed) Caffeine bucket; eviction window (30 min) strictly longer than refill window (15 min) to prevent free-retry-after-eviction. `AuthExceptionHandler` adds `Retry-After` header. **Verb-past-tense convention deviation** — parallels grandfathered `RATE_LIMITED`. |
| `CURRENT_PASSWORD_INCORRECT` | **403** (not 401) | Wrong current password supplied to `POST /api/v1/auth/change-password` | `"Your current password isn't correct."` (static) | `AuthException.currentPasswordIncorrect()` ← `AuthService.changePassword` | Spec 1.5c. **Status-code deviation by design** — see § 6.7. 401 would trigger frontend `apiFetch`'s global token-clear + `wr:auth-invalidated` dispatch and force-logout the user on a wrong-password attempt. 403 ("authenticated but forbidden") matches the security boundary and lets the modal show the inline error without unmounting. **Adjective-noun convention deviation** — parallels grandfathered `INVALID_CREDENTIALS`. |
| `INVALID_CREDENTIALS` | 401 | Login attempt with unknown email or wrong password | `"Invalid email or password."` (static; same for both branches per anti-enumeration) | `AuthException.invalidCredentials()` ← `AuthService.login` | Timing-equalized — backend performs BCrypt verify on a dummy hash for unknown emails. Frontend should NOT differentiate "no such email" from "wrong password". |
| `PASSWORDS_MUST_DIFFER` | 400 | `POST /api/v1/auth/change-password` where the new password BCrypt-matches the current hash | `"Your new password must differ from your current password."` (static) | `AuthException.passwordsMustDiffer()` ← `AuthService.changePassword` | Spec 1.5c. Detected by `passwordEncoder.matches(newPassword, oldHash)` BEFORE encoding the new password (cheaper than encode-and-compare). Distinct from `VALIDATION_FAILED` because the input is structurally valid — this is a domain-rule rejection. **Verb-form convention deviation** — domain rule is more readable as a sentence than as `PASSWORD_DUPLICATE` or `NEW_PASSWORD_REUSED`. |
| `TOKEN_EXPIRED` | 401 | JWT `exp` claim is in the past | `"Authentication token has expired."` (static) | `AuthException.tokenExpired()` ← `JwtAuthenticationFilter` on `ExpiredJwtException` | Frontend should clear in-memory JWT and redirect to login. |
| `TOKEN_INVALID` | 401 | JWT signature verification failed, or any other unexpected JWT parsing error | `"Authentication token is invalid."` (static) | `AuthException.tokenInvalid()` ← `JwtAuthenticationFilter` on `SignatureException` and the catch-all branch | Catch-all also covers any non-`Expired`/`Malformed` JJWT exception. |
| `TOKEN_MALFORMED` | 401 | Bearer token is structurally invalid (not three dot-separated segments) or `sub` is not a UUID | `"Authentication token is malformed."` (static) | `AuthException.tokenMalformed()` ← `JwtAuthenticationFilter` on `MalformedJwtException` and `IllegalArgumentException` | `IllegalArgumentException` covers `UUID.fromString` failure on the subject claim. Also emitted by 1.5g when the `jti` claim is present but not a valid UUID. |
| `TOKEN_REVOKED` | 401 | Spec 1.5g — JWT `jti` is in the blocklist (`jwt_blocklist` table + Redis), OR JWT `gen` claim is stale relative to `users.session_generation` (logout-all or password-change rolled the user's gen forward) | `"This session has been signed out."` (static) | `AuthException.tokenRevoked()` ← `JwtAuthenticationFilter` on blocklist-hit OR session-gen-mismatch | Frontend treats identically to TOKEN_EXPIRED: clear stored JWT, surface auth modal. Anti-pressure copy — no surveillance framing. |
| `SESSION_RATE_LIMITED` | 429 | Spec 1.5g — more than 10 calls to `/api/v1/sessions/*` within a 60-min refill window per user | `"Too many session-management requests. Please try again later."` (static) | `AuthException.sessionRateLimited()` → `SessionRateLimitedException` ← `SessionRateLimitService.checkAndConsume` ← `SessionsController` | Per-user (UUID-keyed) Caffeine bucket; eviction window 90 min strictly longer than 60-min refill. `AuthExceptionHandler` adds `Retry-After` header. |
| `FORBIDDEN` | 403 | Spec 1.5g — service-thrown `AccessDeniedException` (cross-user session revoke or unknown sessionId — same response shape for both per W7/W9 anti-enumeration) | `"Session not found or not yours."` (static) | `AccessDeniedException` ← `ActiveSessionService.revokeSession` → `AuthExceptionHandler.handleAccessDenied` | Spring's default 403 has an empty body; the handler emits the `ProxyError` shape with code `FORBIDDEN`. Generic enough to be reused by other endpoints when they throw `AccessDeniedException`. |
| `UNAUTHORIZED` | 401 | Request reaches a protected route without any auth context | `"Authentication is required to access this resource."` (static) | `AuthException.unauthorized()` (factory; currently no callers); `RestAuthenticationEntryPoint.commence()` (Spring Security path when SecurityContextHolder has no auth) | Two emit paths with identical wire output — the factory is reserved for future Spec 1.5 work; the entry point is the live path today. |
| `USER_NOT_FOUND` | **401** (not 404) | Authenticated request whose JWT `sub` references a user that no longer exists in the database | `"Authenticated user not found."` (static) | `UserException.userNotFound()` ← `UserService.getCurrentUser`/`updateCurrentUser` | **Status-code deviation by design** — see § 6.2. Frontend treats this as a force-logout, not a 404 surface. |

### Validation

| Code | HTTP | Triggered by | Client copy pattern | Emitted in | Notes |
|---|---|---|---|---|---|
| `INVALID_INPUT` | 400 | (a) `@Valid @RequestBody` failure on a proxy controller; (b) `@RequestParam`/`@PathVariable` Bean Validation failure (handled by both `ConstraintViolationException` and `HandlerMethodValidationException` paths); (c) missing required `@RequestParam`; (d) user-domain rule violations from `UserException` (invalid timezone, custom-display-name preference without value, blank required field, explicit null on non-nullable field, invalid display-name preference enum value) | Dynamic per field. Format: `"<field>: <validation message>"` for body validation, `"<field> cannot be blank"` / `"Unknown timezone identifier: '<value>'"` etc. for user-domain rules | `ProxyExceptionHandler.handleValidation`, `handleConstraintViolation`, `handleHandlerMethodValidation`, `handleMissingParam`; `UserException` factories (`invalidTimezone`, `invalidDisplayNamePreference`, `customDisplayNameRequired`, `fieldBlank`, `nonNullableFieldNull`) | Body shape: flat `ProxyError`, no `fieldErrors` map. Wins for proxy controllers because `ProxyExceptionHandler` is package-scoped to `com.worshiproom.proxy`. See § 6.1 for the drift between this code and `VALIDATION_FAILED`. |
| `VALIDATION_FAILED` | 400 | `@Valid @RequestBody` failure on an auth or user controller (`MethodArgumentNotValidException`) | Static message: `"Request validation failed."`; per-field detail in the `fieldErrors` map | `AuthValidationExceptionHandler.handleValidation`; `UserValidationExceptionHandler.handleValidation` | **Body shape extends the standard envelope** with `fieldErrors: { <fieldName>: <message> }`. Wins for auth and user controllers because those advices are package-scoped to `com.worshiproom.auth` / `com.worshiproom.user`. Same exception type as one branch of `INVALID_INPUT` — see § 6.1. |

### Friends / Social

The friends and social packages emit a related family of domain rejections.
Two codes (`NOT_FRIENDS`, `USER_NOT_FOUND`) appear with **different HTTP
statuses** in different packages — that's deliberate, not drift. See the Notes
column for each.

| Code | HTTP | Triggered by | Client copy pattern | Emitted in | Notes |
|---|---|---|---|---|---|
| `ALREADY_FRIENDS` | 409 | `sendRequest` to a user with whom an ACTIVE friendship row already exists | Dynamic per-call | `AlreadyFriendsException` ← `FriendsService.sendRequest` | Spec 2.5.3. |
| `BLOCKED_USER` | 403 | Either party has BLOCKED the other when `sendRequest` or `acceptRequest` runs | Dynamic per-call | `BlockedUserException` ← `FriendsService.sendRequest`, `acceptRequest` | Spec 2.5.3. The block check runs on accept too, guarding against a block placed mid-flight between send and accept. |
| `DUPLICATE_FRIEND_REQUEST` | 409 | `friend_requests` UNIQUE constraint violation on `(from_user_id, to_user_id)` | Dynamic per-call | `DuplicateFriendRequestException` ← `FriendsService.sendRequest` | Spec 2.5.3. Caught from `DataIntegrityViolationException` and remapped. |
| `FRIEND_REQUEST_NOT_FOUND` | 404 | `acceptRequest` / `declineRequest` referring to a missing or already-resolved request id | Dynamic per-call | `FriendRequestNotFoundException` ← `FriendsService.acceptRequest`, `declineRequest` | Spec 2.5.3. |
| `INVALID_REQUEST_STATE` | 409 | `acceptRequest` / `declineRequest` on a request whose status is no longer PENDING | Dynamic per-call | `InvalidRequestStateException` ← `FriendsService.acceptRequest`, `declineRequest` | Spec 2.5.3. |
| `NOT_BLOCKED` | 404 | `unblockUser` for a user not currently blocked by the caller | Dynamic per-call | `NotBlockedException` ← `FriendsService.unblockUser` | Spec 2.5.3. |
| `NOT_FRIENDS` (friends) | **404** | `removeFriend` when no ACTIVE friendship row exists | Dynamic per-call | `com.worshiproom.friends.NotFriendsException` ← `FriendsService.removeFriend` | Spec 2.5.3. **Different status from the social-package version below.** Friends uses 404 because `removeFriend`'s lookup behaves like a "not found" — there is no resource to remove. |
| `NOT_FRIENDS` (social) | **403** | `sendEncouragement` / `sendNudge` when no ACTIVE friendship row exists between sender and recipient | `"Cannot send encouragement to a non-friend"` / `"Cannot nudge a non-friend"` | `com.worshiproom.social.NotFriendsException` ← `SocialInteractionsService.sendEncouragement`, `sendNudge` | Spec 2.5.4b. Social uses 403 because the user authenticates successfully but the action is rejected on authorization grounds. **Same code, different package, different status.** |
| `NUDGE_COOLDOWN` | 409 | `sendNudge` while the most recent nudge to the same recipient is still within `worshiproom.social.nudge.cooldown-days` (default 7) | `"Nudge cooldown active for this friend."` | `NudgeCooldownException` ← `SocialInteractionsService.sendNudge` | Spec 2.5.4b. Frontend `NUDGE_COOLDOWN_DAYS` constant must agree with the backend value. |
| `SELF_ACTION_FORBIDDEN` | 400 | An action targeting `principal.userId()` (e.g., friend request to self, encouragement to self, nudge self) | Dynamic per-call | `SelfActionException` ← `FriendsService.sendRequest`, `removeFriend`, `blockUser`, `unblockUser`; `SocialInteractionsService.sendEncouragement`, `sendNudge` | Specs 2.5.3 and 2.5.4b. Reused across both packages — the friends-package class is imported into social via cross-package import (caught by the deliberately-unscoped `FriendsExceptionHandler`). |
| `UNAUTHORIZED_ACTION` | 403 | `acceptRequest` / `declineRequest` when the acting user is not the request's recipient | Dynamic per-call | `UnauthorizedActionException` ← `FriendsService.acceptRequest`, `declineRequest` | Spec 2.5.3. |
| `USER_NOT_FOUND` (friends) | **404** | A friends or social action targeting a non-existent / soft-deleted / banned user | Dynamic per-call | `com.worshiproom.friends.UserNotFoundException` ← `FriendsService.*`; `SocialInteractionsService.sendEncouragement`, `sendNudge` | Specs 2.5.3 and 2.5.4b. **Same code as `USER_NOT_FOUND` in the Auth section above (which is 401).** Friends/social use 404 — the target is a domain resource, not the authenticated principal. The auth case is a force-logout scenario; this case is "the friend you tried to act on doesn't exist." Frontend MUST branch on status, not just code. |

### Posts

| Code | HTTP | Triggered by | Client copy pattern | Emitted in | Notes |
|---|---|---|---|---|---|
| `INVALID_HELP_TAG` | 400 | `POST /api/v1/posts` or `PATCH /api/v1/posts/{id}` carries an unknown wire-value in `helpTags` (e.g., `"pizza"`) | `"Invalid help tag: <value>"` (dynamic) | `InvalidHelpTagException` ← `HelpTag.fromWireValue` ← `PostService.normalizeHelpTags` | Spec 4.7b. Wire format is lowercase snake_case ONLY (`meals`, `rides`, `errands`, `visits`, `just_prayer`); `"MEALS"` rejects (case-sensitive). Routed via the generic `handlePost(PostException)` path (no dedicated handler). |
| `HELP_TAGS_NOT_ALLOWED_FOR_POST_TYPE` | 400 | Non-empty `helpTags` submitted on a non-prayer_request post (testimony, question, discussion, encouragement). Same code on POST and PATCH. | `"Help tags are only allowed on prayer_request posts."` (static) | `HelpTagsNotAllowedForPostTypeException` ← `PostService.createPost`, `PostService.updatePost` | Spec 4.7b. Dedicated `@ExceptionHandler` in `PostExceptionHandler.handleHelpTagsNotAllowed` logs the rejected `postType` wireValue for the audit trail (mirrors `handleImageNotAllowed`). |

### Rate limit

| Code | HTTP | Triggered by | Client copy pattern | Emitted in | Notes |
|---|---|---|---|---|---|
| `RATE_LIMITED` | 429 | (a) `RateLimitFilter` per-IP proxy bucket exhausted; (b) `LoginRateLimitFilter` per-IP or per-email login bucket exhausted; (c) social-package per-user hourly cap or per-friend daily cap exceeded (Spec 2.5.4b) | Dynamic. Filter path: `"Too many requests. Try again in <N> seconds."` Service path: `"Hourly encouragement cap reached. Please try again later."` / `"Daily encouragement cap for this friend reached."` / `"Hourly nudge cap reached. Please try again later."` | `RateLimitExceededException` ← `RateLimitFilter`, `LoginRateLimitFilter` (filter path); `com.worshiproom.social.RateLimitedException` ← `SocialInteractionsService.sendEncouragement`, `sendNudge` (service path) | Filter path always carries `Retry-After` header. Service path does NOT — the service-layer caps don't have a deterministic reset moment to advertise (see the master plan rate-limit section for the trade-off). Frontend should branch on `Retry-After` presence, not assume it. The two emit paths share a code because frontend retry behavior is identical: back off and retry later. |

### Proxy / upstream

| Code | HTTP | Triggered by | Client copy pattern | Emitted in | Notes |
|---|---|---|---|---|---|
| `NOT_FOUND` | 404 | FCBH DBP returns 404 for a fileset, chapter, or timestamps lookup (e.g., chapter has no audio) | `"Audio not available for this chapter."` (FCBH-specific today) | `FcbhNotFoundException` ← `FcbhService` | Sole emitter today is FCBH. Has a dedicated `@ExceptionHandler` branch in `ProxyExceptionHandler` (ahead of the generic `ProxyException` handler) so the log line is INFO-level — "audio not available" is expected UX, not a warning. |
| `SAFETY_BLOCK` | 422 | Upstream AI model refused to generate a response due to its safety filters (prompt-level block, output-level block via `FinishReason.SAFETY` or `PROHIBITED_CONTENT`, or empty-text silent block) | Variants: `"This prayer request was blocked by safety filters. Please rephrase."`, `"This question was blocked by safety filters. Please rephrase."`, `"This journal entry was blocked by safety filters. Please rephrase."`, `"Gemini blocked the prompt: <reason>"`, `"Gemini blocked the response: finishReason=<reason>"`, `"Gemini returned an empty response (likely a silent safety block)."` | `SafetyBlockException` ← `GeminiService` (3 paths), `PrayerService`, `JournalReflectionService`, `AskService` | 422 (Unprocessable Content) per RFC 9110 §15.5.21 — request was valid, upstream chose not to answer. Frontend `GeminiSafetyBlockError` maps this to a user-friendly explanation. The variant messages that name "Gemini" or "finishReason" are server-side debug aids that bypass the user-safe wrapper messages on the per-feature services — review whether they should be sanitized when consolidating naming drift. |
| `UPSTREAM_ERROR` | 502 | Upstream API (Gemini, Google Maps Places, FCBH DBP) returned an error status, threw an SDK exception, returned an empty body, or was misconfigured (missing API key) | Generic per-service: `"AI service is temporarily unavailable. Please try again."`, `"Maps service is temporarily unavailable. Please try again."`, `"FCBH service returned no response."`, `"…is not configured on the server."`, `"Maps service rejected the geocode request."`, `"Maps service returned empty photo body."` | `UpstreamException` ← `GeminiService`, `GoogleMapsService`, `FcbhService`, `PrayerService`, `JournalReflectionService`, `AskService` (~22 throw sites total) | **Never leaks upstream error text to the client** (per `02-security.md` § Never Leak Upstream Error Text). Server-side log captures the full cause chain with the request ID; the wire message is one of the canned strings above. Every proxy service test asserts the caught exception's message does NOT appear in the thrown `ProxyException`'s message. |
| `UPSTREAM_TIMEOUT` | 504 | Upstream API exceeded the configured per-request timeout (`proxy.upstream.default-timeout-ms` or service-specific override) | `"AI service timed out. Please try again."` / `"Maps service timed out. Please try again."` | `UpstreamTimeoutException` ← `GeminiService`, `GoogleMapsService` | Distinct from `UPSTREAM_ERROR` (502) so the frontend can branch on retry strategy. FCBH does not currently emit this — its WebClient timeout falls through to `UPSTREAM_ERROR`. |

### Generic

| Code | HTTP | Triggered by | Client copy pattern | Emitted in | Notes |
|---|---|---|---|---|---|
| `INTERNAL_ERROR` | 500 | Any `Throwable` that escapes a proxy controller without being mapped by a more specific handler | Static: `"An unexpected error occurred. Please try again."` | `ProxyExceptionHandler.handleUnexpected(Throwable)` | **Coverage gap**: this catch-all is package-scoped to `com.worshiproom.proxy`, so unexpected exceptions from `com.worshiproom.auth` or `com.worshiproom.user` controllers fall through to Spring Boot's `BasicErrorController` instead — see § 6.3. |

## 4. Naming conventions

### Existing pool — descriptive, factual

The catalog's codes use three different shapes:

- **Adjective-noun:** `INVALID_INPUT`, `INVALID_CREDENTIALS`, `INVALID_REQUEST_STATE`, `DUPLICATE_FRIEND_REQUEST`
- **Verb-past-tense:** `RATE_LIMITED`, `VALIDATION_FAILED`
- **Noun-only:** `UNAUTHORIZED`, `UNAUTHORIZED_ACTION`, `NOT_FOUND`, `NOT_FRIENDS`, `NOT_BLOCKED`, `INTERNAL_ERROR`, `UPSTREAM_ERROR`, `UPSTREAM_TIMEOUT`, `SAFETY_BLOCK`, `TOKEN_EXPIRED`, `TOKEN_INVALID`, `TOKEN_MALFORMED`, `USER_NOT_FOUND`, `FRIEND_REQUEST_NOT_FOUND`, `BLOCKED_USER`, `ALREADY_FRIENDS`, `NUDGE_COOLDOWN`, `SELF_ACTION_FORBIDDEN`

All are SCREAMING_SNAKE_CASE. That part is consistent.

### Convention for new codes (Phase 2+)

New codes follow `<NOUN>_<ADJECTIVE>` pattern:
`USER_BLOCKED`, `POST_LOCKED`, `ACTIVITY_DUPLICATED`,
`COMMENT_DELETED`, `BADGE_ALREADY_EARNED`.

Existing verb-past-tense codes (`RATE_LIMITED`, `VALIDATION_FAILED`) stay
as-is — retroactively renaming them would force frontend code changes that
aren't worth it. **Established codes are grandfathered; future codes follow
the noun-adjective convention.**

### When to add a new code vs reuse an existing one

Reuse an existing code when:

- The new failure mode is semantically the same as an existing one (e.g., a
  new validated `@RequestBody` failure on a proxy controller is still
  `INVALID_INPUT` — don't invent `BODY_INVALID`).
- The HTTP status is the same and the frontend would branch identically.

Add a new code when:

- The frontend needs to branch on the difference (e.g., distinct copy or
  distinct retry behavior).
- The HTTP status differs (different status with the same code is confusing
  and should be avoided — `USER_NOT_FOUND` at 401 is the one grandfathered
  exception, see § 6.2).
- The trigger is a new domain concept (a new business rule, a new upstream
  service, a new lifecycle event) that no existing code covers.

## 5. Adding a new error code

When introducing a new error code in any spec:

1. **Pick a name** that fits the conventions in § 4. Reuse an existing code
   if the failure is semantically equivalent (see "When to add a new code vs
   reuse an existing one").
2. **Add it to the relevant exception class or handler.** Domain exceptions
   live in `<feature>/<Feature>Exception.java` with static factory methods
   (`AuthException` and `UserException` are the canonical examples); the
   handler in `<Feature>ExceptionHandler.java` translates them to
   `ProxyError` responses.
3. **Verify the new code follows § 4's noun-adjective convention.** If it
   doesn't, justify why in the catalog row's Notes column. Grandfathered
   verb-past-tense codes are not a precedent for new ones.
4. **Add a row to this catalog** in the same commit as the code change.
   Choose the correct category (auth, validation, rate-limit, proxy,
   generic), insert alphabetically within the category. Fill out every
   column. Use the Notes column for non-obvious behavior (different body
   shape, status-code deviation, special handler ordering, etc.).
5. **Reference the code in the OpenAPI spec** for every endpoint that
   surfaces it. Update `backend/src/main/resources/openapi.yaml` per-operation
   `responses` blocks. Today the OpenAPI `ProxyError.code` field is plain
   `type: string` — see § 6.4 for the future cleanup.
6. **If the code maps to a user-facing copy line**, add the copy to the
   relevant per-feature constants file with anti-pressure voice (per
   `01-ai-safety.md` § AI Content Boundaries and the master plan's
   Universal Rule 12). Avoid blame, judgement, or pressure language.

## 6. Known gaps and follow-ups

Each subsection here is a future spec. The catalog documents the situation;
it does not repair it. **Do not consolidate or rename anything here without a
dedicated spec** — frontend code branches on these strings.

### 6.1 Naming drift: `INVALID_INPUT` vs `VALIDATION_FAILED`

- Same HTTP status (400). Same trigger in the most common case
  (`MethodArgumentNotValidException` on `@Valid @RequestBody`). Two codes,
  two body shapes.
- The advice that wins is decided by package scope:
  `ProxyExceptionHandler` (basePackages=`com.worshiproom.proxy`) emits
  `INVALID_INPUT` with a flat `ProxyError` body; `AuthValidationExceptionHandler`
  (basePackages=`com.worshiproom.auth`) and `UserValidationExceptionHandler`
  (basePackages=`com.worshiproom.user`) emit `VALIDATION_FAILED` with an
  extended body that adds a `fieldErrors` map.
- Frontend currently handles both shapes.
- **Future cleanup spec:** consolidate to one code (likely `VALIDATION_FAILED`
  for the broader semantics) with the `fieldErrors` map as an optional field.
  Migrate `INVALID_INPUT` callers (or vice versa) and update the OpenAPI
  schema to model the consolidated shape.

### 6.2 `USER_NOT_FOUND` returns 401, not 404

- Intentional per `UserException.userNotFound()` JavaDoc: the JWT subject is
  semantically invalid if the user no longer exists, so the server forces
  re-login rather than surface a confusing 404 on a self-route like
  `/api/v1/users/me`.
- The code name suggests a 4xx-NotFound, which conflicts with `NOT_FOUND`
  (which is a real 404 from FCBH). A reader scanning the catalog could
  reasonably expect `USER_NOT_FOUND` to also be 404.
- **Future cleanup spec:** rename to `USER_DELETED`, `SESSION_INVALIDATED`,
  or similar to match the actual 401 semantics. Coordinate with frontend
  to update the string match.

### 6.3 Missing `Throwable.class` catch-all in `AuthExceptionHandler` and `UserExceptionHandler`

- `ProxyExceptionHandler.handleUnexpected(Throwable)` is the only catch-all
  in the codebase, and it is package-scoped to `com.worshiproom.proxy`.
- Unexpected `RuntimeException` (or any uncaught exception) thrown from
  `AuthService`, `UserService`, or any future `com.worshiproom.auth.*` /
  `com.worshiproom.user.*` controller falls through to Spring Boot's
  default `BasicErrorController`.
- Result: response body has no `code` field, no `requestId` field, and uses
  Spring's default error JSON shape — non-canonical. Frontend error handling
  that branches on `code` will break.
- **Future cleanup spec:** add a `Throwable.class` catch-all to
  `AuthExceptionHandler` and `UserExceptionHandler` that emits
  `INTERNAL_ERROR` with the canonical envelope (matching
  `ProxyExceptionHandler.handleUnexpected`). Or, alternatively, lift the
  catch-all into a top-level unscoped advice covering all packages.

### 6.4 OpenAPI `ProxyError.code` is `type: string`, not an enum

- `backend/src/main/resources/openapi.yaml` defines `ProxyError.code` as
  plain `type: string` with one example value. The 14 codes in this catalog
  are not enumerated in the spec.
- This catalog is the canonical list; OpenAPI lags.
- **Future cleanup spec:** extend `ProxyError.code` with an `enum` of all
  14 codes, ideally auto-generated from this document so the two cannot
  drift. Per-operation `responses` blocks could narrow the enum to the
  subset each endpoint actually emits.

### 6.5 `VALIDATION_FAILED` body extension not modeled in OpenAPI

- The `BadRequest` response component in `openapi.yaml` references the flat
  `ProxyError` schema. The `fieldErrors: { <fieldName>: <message> }` map
  that `AuthValidationExceptionHandler` and `UserValidationExceptionHandler`
  add to the body is not modeled.
- Generated frontend types therefore lack the `fieldErrors` field; callers
  read it via untyped property access.
- **Future cleanup spec:** define a `ValidationError` schema that extends
  `ProxyError` with an optional `fieldErrors` map, and add a `BadRequestWithFields`
  response component that auth and user endpoints reference. Likely sequenced
  with § 6.1's consolidation.

### 6.6 `SAFETY_BLOCK` message variants leak upstream details

- Several `SAFETY_BLOCK` throw sites in `GeminiService` emit messages that
  name the upstream model and internal API fields:
  - `"Gemini blocked the prompt: <reason>"`
  - `"Gemini blocked the response: finishReason=<reason>"`
  - `"Gemini returned an empty response (likely a silent safety block)."`
- The per-feature services (`PrayerService`, `JournalReflectionService`,
  `AskService`) wrap these with clean copy (`"This question was blocked by
  safety filters. Please rephrase."`, `"This journal entry was blocked by
  safety filters. Please rephrase."`, `"This prayer request was blocked by
  safety filters. Please rephrase."`) — but the raw `GeminiService` variants
  can surface to clients on paths that throw before the wrapper applies
  (e.g., the `BB-30 explain` and `BB-31 reflect` endpoints, which call
  `GeminiService` directly without an intermediate wrapper).
- This violates the never-leak-upstream-details rule documented in
  `.claude/rules/02-security.md` § Never Leak Upstream Error Text.
- **Future cleanup spec:** audit every `SAFETY_BLOCK` throw site, ensure all
  messages are user-safe and free of upstream identifiers (no `"Gemini"`, no
  `"finishReason="`, no internal API field names). Wrap `GeminiService`
  messages at the throw site, not the catch site, so the explain/reflect
  endpoints get the same user-safe copy as the wrapped feature services.

### 6.7 `CURRENT_PASSWORD_INCORRECT` returns 403, not 401

- The conventional choice for "wrong password" is 401, but the change-password
  endpoint operates on an already-authenticated request. The caller's JWT IS
  valid; they just couldn't prove they know the *current* password.
- Returning 401 would trigger frontend `apiFetch`'s global 401 handler
  (`frontend/src/lib/api-client.ts`), which clears the JWT and dispatches
  `wr:auth-invalidated`. `AuthContext` listens for that event and sets
  `isAuthenticated: false`, which causes `Settings.tsx` to redirect to `/`.
  Net effect: a user who mistypes their current password gets logged out
  and bounced to home before they can read the inline error message.
- 403 ("authenticated, but forbidden from completing this action") is the
  semantically correct status. The code lives in the Auth section because
  the rule is auth-domain, even though the status is the friends/social
  family's `403`.
- **No future cleanup spec** — this is the intended design. Recorded here
  so the deviation is discoverable.

## 7. Related documents

- `.claude/rules/03-backend-standards.md` § HTTP Status Codes and § Standard
  Response Shapes — the authoritative reference for the response envelope and
  the HTTP status / code mapping table.
- `backend/src/main/resources/openapi.yaml` — per-endpoint error responses
  (which codes each operation can return).
- `.claude/rules/02-security.md` § Never Leak Upstream Error Text — why
  `UPSTREAM_ERROR` and `SAFETY_BLOCK` use canned messages.
- `.claude/rules/07-logging-monitoring.md` § Request ID Propagation — how the
  `requestId` field is generated and threaded through every error response.
- `backend/docs/runbook-security-headers.md` — sibling runbook (security
  headers policy and tuning).
