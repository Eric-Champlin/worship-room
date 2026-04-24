# Forums Wave: Spec 1.6 — User Me Endpoint

**Master Plan Reference:** `_forums_master_plan/round3-master-plan.md` → Spec 1.6
**Branch:** `claude/forums/round3-forums-wave`
**Date:** 2026-04-23

---

## Affected Frontend Routes

N/A — backend-only spec. No frontend code touched. `/verify-with-playwright` should be skipped.

The frontend AuthContext JWT migration that will consume `GET /api/v1/users/me` is explicitly deferred to Spec 1.9. Spec 1.6 lands both endpoints; Spec 1.9 wires the frontend in. Phase 8 (Unified Profile System) will also consume `UserResponse` for the `/u/:username` route.

---

### Spec 1.6 — User Me Endpoint

- **ID:** `round3-phase01-spec06-user-me-endpoint`
- **Phase:** 1 — Backend Foundation
- **Size:** S
- **Risk:** Low
- **Prerequisites:** Spec 1.4 ✅, Spec 1.5 ✅, Spec 1.7 ✅ (all merged into `claude/forums/round3-forums-wave`). Tracker still shows these as ⬜ — that is tracker drift, not a real blocker; commits `530d089 spec-1-4`, `1c84e7f spec-1-5`, and `e2cdb9d spec-1-7` are on the working branch.
- **Goal:** Expose the authenticated user's full profile via `GET /api/v1/users/me`, and allow the user to update their own profile fields via `PATCH /api/v1/users/me`. Both endpoints require a valid JWT; both return the canonical `UserResponse` shape that Spec 1.9 (Frontend AuthContext JWT Migration) and Phase 8 (Unified Profile System) will consume.

This spec also closes the timezone-consumption loop left open by Spec 1.3b: the PATCH endpoint is where users can change their timezone after registration, with strict `ZoneId.of()` validation returning 400 on invalid input.

---

### Deviation from master plan

The master plan stub for Spec 1.6 only specifies `GET /api/v1/users/me`. This spec expands scope to include `PATCH /api/v1/users/me` because Spec 1.3b's execution note (line 1475 of the master plan) explicitly re-homed the `PATCH` timezone-update handler here rather than letting it slip to a later Settings spec. The PATCH endpoint is also a hard prereq for anything that lets users edit profile fields (avatar, bio, favorite verse, display-name preference) — Phase 8 assumes it exists. Expanding 1.6 now avoids a sibling spec (e.g., 1.6b) that would duplicate controller/service scaffolding for one extra HTTP verb on the same URI.

Master plan tracker: size stays S (small), risk stays Low. Acceptance criteria expand from 4 to 8 (covering PATCH behavior).

---

## Why this spec exists now

- Spec 1.5 login already returns a minimal `UserSummary` (id, email, displayName, isAdmin) — enough to render the navbar, but NOT enough for a profile page or for the frontend to know the user's timezone, avatar, bio, or display-name preference.
- Spec 1.9 (Frontend AuthContext JWT Migration) will hydrate the React auth state from `GET /api/v1/users/me` on page load. Without 1.6, 1.9 has nothing to call.
- Spec 1.3b's execution note explicitly re-homed the `PATCH /api/v1/users/me` timezone update to this spec.
- Phase 8 profile specs all assume this endpoint exists.

---

## Current state (post-Spec-1.5-and-1.7)

- `User` JPA entity has 21 columns including all updatable profile fields (`first_name`, `last_name`, `display_name_preference`, `custom_display_name`, `avatar_url`, `bio`, `favorite_verse_reference`, `favorite_verse_text`, `timezone`).
- `DisplayNameResolver` service exists (Spec 1.5) and computes `displayName` from `first_name` / `last_name` / `display_name_preference` / `custom_display_name`.
- `UserSummary` record already exists (Spec 1.5) with 4 fields: `id`, `email`, `displayName`, `isAdmin`.
- `JwtAuthenticationFilter` is inline in the Spring Security chain; validates bearer tokens on every `/api/v1/**` request except the public paths (`/api/v1/health`, `/api/v1/auth/register`, `/api/v1/auth/login`, `/api/v1/auth/logout`).
- `AbstractIntegrationTest` / `AbstractDataJpaTest` base classes exist (Spec 1.7) with singleton container.

---

## Key design decisions (do not re-litigate during planning)

1. **Two endpoints on one controller.** Create `UserController` at `backend/src/main/java/com/worshiproom/user/UserController.java` with both `GET` and `PATCH` handlers for `/api/v1/users/me`. Delegate all logic to a new `UserService`.
2. **New `UserResponse` DTO, distinct from `UserSummary`.** `UserSummary` stays minimal (it's embedded in auth responses; widening it would bloat every login). `UserResponse` is the full profile shape:
   - `id` (UUID)
   - `email` (String)
   - `displayName` (String — computed via `DisplayNameResolver`)
   - `firstName` (String)
   - `lastName` (String)
   - `displayNamePreference` (String — one of `first_only`, `first_last_initial`, `first_last`, `custom`)
   - `customDisplayName` (String, nullable)
   - `avatarUrl` (String, nullable)
   - `bio` (String, nullable)
   - `favoriteVerseReference` (String, nullable)
   - `favoriteVerseText` (String, nullable)
   - `timezone` (String — IANA zone, e.g., `America/Chicago`)
   - `isAdmin` (boolean)
   - `isEmailVerified` (boolean)
   - `joinedAt` (ISO-8601 timestamp)
3. **PATCH field scope — user-updatable only.** Allowed fields: `firstName`, `lastName`, `displayNamePreference`, `customDisplayName`, `avatarUrl`, `bio`, `favoriteVerseReference`, `favoriteVerseText`, `timezone`. EXPLICITLY NOT updatable via this endpoint: `email` (→ Spec 1.5e Change Email, password-gated), `password` (→ Spec 1.5c Change Password), `isAdmin` (→ admin-only, future spec), `isBanned` (→ moderation, Phase 10), `isEmailVerified` (→ Spec 1.5d verification flow), `username` (→ Phase 8.1 Username System).
4. **PATCH semantics — "omitted ≠ null."** Use `JsonNullable<String>` (from `jackson-databind-nullable`) or equivalent pattern to distinguish three states in the request body:
   - Field absent from JSON → don't touch the DB column
   - Field present with explicit `null` → clear the DB column (for nullable fields only; non-null fields reject explicit null with 400)
   - Field present with a value → update the DB column

   Simplest implementation that doesn't add a new dependency: define the PATCH DTO with all `Optional<String>` fields and a custom Jackson deserializer, OR (cleaner) add the `openapitools:jackson-databind-nullable` dependency. Let `/plan-forums` pick one; document the choice.
5. **Timezone validation.** On PATCH, if `timezone` is present, validate via `ZoneId.of(value)`. Invalid input throws `DateTimeException` which maps to 400 `INVALID_INPUT` with message "Unknown timezone identifier". On GET, always return the stored timezone as-is.
6. **Non-null field constraints on PATCH.** `firstName` and `lastName` must remain non-null and non-empty after update (DB constraint + `@NotBlank` on the request). `displayNamePreference` must be one of the 4 enum values (validated at the service layer — DB `CHECK` constraint is a safety net).
7. **Custom display name constraint.** If `displayNamePreference='custom'` is being set AND `customDisplayName` is not being set AND the current `customDisplayName` is null, return 400 `INVALID_INPUT` with message "Custom display name required when preference is 'custom'". Conversely, allow setting `customDisplayName` without changing preference (user might want to pre-set it before switching).
8. **Rate limit: none in this spec.** Existing `LoginRateLimitFilter` is login-specific. Profile updates don't have an obvious abuse vector at MVP scale. If needed, Phase 10 rate-limit tightening (Spec 10.9) will add per-user write limits across the API.
9. **`last_active_at` touch: NOT in this spec.** It's tempting to update `last_active_at` on every `GET /me`, but that creates a write on every page load and couples activity tracking to profile reads. Defer to Phase 2 (Activity Engine).
10. **`updated_at` maintenance.** DB default is `NOW()` on insert; PATCH must explicitly set `updated_at = NOW()` in the service (since Spec 1.5 deferred JPA auditing). One line: `user.setUpdatedAt(Instant.now());` before `userRepository.save(user)`.
11. **Field length/format constraints (Bean Validation on the request DTO):**
    - `firstName`, `lastName`: `@Size(min=1, max=100)` + `@NotBlank` if present
    - `avatarUrl`: `@Size(max=500)` + `@Pattern` for URL format (reuse existing URL regex if one exists; otherwise simple `https?://.+`)
    - `bio`: `@Size(max=2000)` (pick a sane ceiling; master plan doesn't specify)
    - `favoriteVerseReference`: `@Size(max=50)`
    - `favoriteVerseText`: `@Size(max=500)`
    - `customDisplayName`: `@Size(min=1, max=100)` if present
    - `timezone`: `@Size(max=50)` + `ZoneId.of()` validation at service layer

---

## Files to create

- `backend/src/main/java/com/worshiproom/user/UserController.java` — thin controller with `@GetMapping` and `@PatchMapping` handlers, delegates to `UserService`, extracts authenticated user ID via `@AuthenticationPrincipal` (or the equivalent Spring Security pattern already in use by Spec 1.5's `AuthController`).
- `backend/src/main/java/com/worshiproom/user/UserService.java` — `getCurrentUser(userId)` returns `UserResponse`; `updateCurrentUser(userId, UpdateUserRequest)` applies field-by-field updates with validation, returns updated `UserResponse`. `@Transactional` on the update method.
- `backend/src/main/java/com/worshiproom/user/dto/UserResponse.java` — record with the 15 fields listed in Decision 2.
- `backend/src/main/java/com/worshiproom/user/dto/UpdateUserRequest.java` — record with `Optional<String>` (or `JsonNullable<String>`) fields per Decision 4.
- `backend/src/test/java/com/worshiproom/user/UserControllerIntegrationTest.java` — extends `AbstractIntegrationTest`; ~15–20 tests covering: GET returns full profile with computed `displayName`, GET returns 401 without auth, GET returns 401 with expired token, PATCH updates each individual field, PATCH rejects invalid timezone with 400, PATCH rejects attempt to set `email` / `password` / `isAdmin` (silently ignored — not present in request DTO, so invalid properties are rejected or dropped), PATCH enforces `firstName` / `lastName` non-blank, PATCH enforces `displayNamePreference='custom'` requires `customDisplayName`, PATCH updates `updated_at`, PATCH returns updated `UserResponse` with recomputed `displayName`.
- `backend/src/test/java/com/worshiproom/user/UserServiceTest.java` — extends `AbstractDataJpaTest`; ~8–10 tests covering pure service logic (field-by-field update application, timezone validation, custom-display-name constraint).

---

## Files to modify

- `backend/src/main/resources/openapi.yaml` — add two paths (`GET /api/v1/users/me`, `PATCH /api/v1/users/me`) using the inline envelope convention (`{data, meta: {requestId}}`) — do NOT reference a `ProxyResponse` schema (doesn't exist). Define `UserResponse` and `UpdateUserRequest` schemas. Reuse existing error response schemas (`BadRequest`, `Unauthorized`, `InternalError`).

Potentially also: `backend/pom.xml` — add `org.openapitools:jackson-databind-nullable` dependency if plan picks option (a) from Decision 4.

---

## Files to delete

None.

---

## Database changes

None. `users` table already has all required columns from Spec 1.3 + 1.3b.

---

## API changes

**`GET /api/v1/users/me`**

- Auth: required (Bearer JWT)
- Request body: none
- 200 response: `{ data: UserResponse, meta: { requestId } }`
- 401 response: `{ code: "UNAUTHORIZED", message: "...", requestId, timestamp }` (handled by existing `JwtAuthenticationFilter`)

**`PATCH /api/v1/users/me`**

- Auth: required (Bearer JWT)
- Request body: `UpdateUserRequest` — any subset of the 9 updatable fields
- Content-Type: `application/json`
- 200 response: `{ data: UserResponse, meta: { requestId } }` — returns the FULL updated profile (not just the changed fields), so the frontend can hydrate React state in one call
- 400 response on: invalid timezone, `firstName` / `lastName` blank, invalid `displayNamePreference` value, `displayNamePreference='custom'` without `customDisplayName` available, URL format invalid, field too long
- 401 response on missing/invalid JWT

---

## Success criteria

- `GET /api/v1/users/me` with valid JWT returns the authenticated user's full profile including server-computed `displayName`.
- `PATCH /api/v1/users/me` updates only the fields present in the request body (omitted fields untouched).
- `PATCH` with invalid timezone returns 400 with `INVALID_INPUT` and a message identifying the timezone as the problem.
- `PATCH` cannot escalate privileges (no way to set `isAdmin=true`, `isBanned=false`, `isEmailVerified=true` through this endpoint).
- `PATCH` cannot change email or password (those fields are not in `UpdateUserRequest`).
- `PATCH` updates `updated_at` to `NOW()` on every successful call.
- `displayName` in the response reflects the freshly-computed value after any name-field update.
- All ~20–30 new tests pass; existing ~369 tests still pass; Spec 1.7 singleton container still starts exactly once.
- OpenAPI spec lints cleanly (`npx @redocly/cli lint backend/src/main/resources/openapi.yaml`).
- Full test suite still runs in ≤40 seconds.

---

## Pre-execution recon items for `/plan-forums` to verify

1. Confirm `UserSummary` exists from Spec 1.5 and verify its field list before deciding whether `UserResponse` should extend/compose it or be independent (recommended: independent — different concerns).
2. Check whether a URL-format utility/regex already exists in the codebase (proxy package may have one from Maps spec); if so, reuse it for `avatarUrl` validation.
3. Confirm the PATCH partial-update dependency choice — either (a) `org.openapitools:jackson-databind-nullable` added to `pom.xml`, or (b) custom `Optional<String>` pattern with manual Jackson handling. Recommend (a) for cleanliness.
4. Verify how Spec 1.5 extracts the authenticated user ID from the Spring Security context in `AuthController` — reuse the same pattern in `UserController` (consistency matters more than picking the "best" approach).
5. Confirm the existing `AuthValidationExceptionHandler` (from Spec 1.5, scoped to `com.worshiproom.auth`) does NOT also need to cover `com.worshiproom.user` — create a sibling `UserValidationExceptionHandler` if needed, OR broaden to `com.worshiproom` if no other package would be adversely affected (recommend sibling — keeps scoping tight).
6. Verify `DisplayNameResolver` handles all 4 preference values including the edge case where `displayNamePreference='custom'` but `customDisplayName` is null (should probably fall back to `first_only` or throw — confirm Spec 1.5's implementation).
7. Check whether an ISO-8601 timestamp serialization config exists globally (Jackson `@JsonFormat` or `ObjectMapper` config); if yes, reuse for `joinedAt`.

---

## Out of scope

- Email updates (→ Spec 1.5e Change Email — password-gated re-verification flow).
- Password updates (→ Spec 1.5c Change Password).
- Username field (→ Phase 8.1 Username System — separate Liquibase changeset adds the column).
- Avatar file upload (→ Spec 1.10e Object Storage Adapter Foundation — stays URL-only for now).
- Account deletion (→ Spec 10.11 Account Deletion and Data Export).
- Admin endpoints to view/update OTHER users' profiles (→ Phase 10 admin work).
- `last_active_at` maintenance (→ Phase 2 Activity Engine).
- JPA auditing / `@EntityListeners` (→ Spec 1.5c if needed, or defer — manual `setUpdatedAt(Instant.now())` is sufficient for MVP).
- Rate limiting on user-update endpoint (→ Spec 10.9 Rate Limit Tightening if abuse patterns emerge).
- Rich bio formatting (Markdown/HTML) — plain text only per Universal Rule 14.

---

## Gotchas worth naming

- **PATCH partial-update semantics are easy to get wrong.** A test like "PATCH with only `timezone` in body preserves all other fields" is non-negotiable and should exist for every updatable field. If the implementation accidentally treats PATCH as PUT (full replace), `firstName` / `lastName` will get wiped on a timezone-only update and blow up the frontend.
- **`displayName` recomputation must happen AFTER field updates, not from the pre-update state.** If the user updates `firstName` from "Bob" to "Robert" and their preference is `first_only`, the response must show `displayName: "Robert"`, not `"Bob"`. Integration test required.
- **`DisplayNameResolver` null-safety on `customDisplayName`.** If preference is `custom` but `customDisplayName` is null, the resolver needs a defined fallback. Verify Spec 1.5's implementation before assuming behavior.
- **OpenAPI lint on the new paths.** Spec 1.5's plan noted the `ProxyResponse` schema does NOT exist; stick with the inline envelope (`{data, meta: {requestId}}`) for both new endpoints. Don't accidentally add a `$ref` to a non-existent schema.
- **`@Valid` on the PATCH request DTO.** Spring's `@Valid` works with `Optional<String>` fields but the annotations (`@Size`, `@Pattern`) need to be ON the inner type via `@Size(...) Optional<@NotBlank String>` or equivalent. Get this wrong and validation silently no-ops.
- **401 handling for the `GET /me` edge case: user deleted while token is still valid.** A 1-hour JWT is valid until expiry even if the user was deleted server-side. `UserService.getCurrentUser` must handle `userRepository.findById(userId)` returning empty — return 404 `USER_NOT_FOUND` or 401, pick one and document. Recommend 401 (token is semantically invalid if the subject no longer exists).

---

## Anti-Pressure Copy Checklist

No user-facing copy strings are introduced by this spec (it is a pure API endpoint — no UI, no emails, no notifications). Error messages returned in `ProxyError.message` follow the existing `INVALID_INPUT` pattern ("Unknown timezone identifier", "Custom display name required when preference is 'custom'", etc.) — these are developer-facing diagnostic messages, not user-facing copy.

If/when Spec 1.9 or Phase 8 surfaces validation errors in a profile edit UI, that spec owns the anti-pressure pass on the user-facing translation.

---

## Documentation safety

This spec is additive only:

- No past specs or plans are invalidated.
- No Universal Rules changed.
- Master plan unchanged (the deviation — expanded scope to include PATCH — is tracked in this spec's own "Deviation from master plan" section, not by editing the master plan).
- Spec tracker gets a manual `✅` update post-execution.
- `.claude/rules/` files do not need updates (existing rules already cover API shape, validation, response headers, and PII logging discipline — no new patterns introduced here).

---

## Out-of-band notes for Eric

- The master plan's Spec 1.6 stub only specified `GET`; this spec expands scope to include `PATCH` because the v2.8 Spec 1.3b execution note re-homed the `PATCH /api/v1/users/me` timezone handler here. If you'd rather split that into a sibling `Spec 1.6b — Update Me Endpoint`, that's a lightweight refactor of this spec; the design work here carries over cleanly.
- Tracker line 32–41 in `_forums_master_plan/spec-tracker.md` still shows Specs 1.4, 1.5, and 1.7 as ⬜. Commits on `claude/forums/round3-forums-wave` show otherwise. Worth a one-line update when you next touch the tracker.
- Decision 4 (partial-update dependency) is left open for `/plan-forums` to close. Adding `org.openapitools:jackson-databind-nullable` is the cleanest option; the `Optional<String>` pattern is the zero-new-deps option. Flag your preference to the planner if you care which one lands.
