# Forums Wave: Spec 2.5.3 — Friends API Endpoints (Phase 2.5 HTTP Layer)

**Master Plan Reference:** `_forums_master_plan/round3-master-plan.md` → Decision 8 (lines 1131–1196), Spec 2.5.3 body (lines 3314–3342)
**Branch:** `forums-wave-continued` (stay on this branch — no per-spec sub-branch)
**Date:** 2026-04-27

---

## Affected Frontend Routes

N/A — backend-only spec. The only frontend touch is regenerating (or hand-editing) `frontend/src/types/api/generated.ts` to include the new DTO and request shapes. No user-facing routes change in this spec; frontend dual-write wiring of these endpoints is deferred to Spec 2.5.4. Skip `/verify-with-playwright` for this spec.

---

## Spec Header

- **ID:** `round3-phase02-5-spec03-friends-endpoints`
- **Size:** L
- **Risk:** Medium (8 endpoints + auth gating + OpenAPI + frontend type regen + exception mapping; mechanical but high surface area)
- **Prerequisites:** 2.5.1 ✅ shipped (4 friends-domain tables created via changesets 2026-04-27-009 through 2026-04-27-012), 2.5.2 ✅ shipped (FriendsService exposes all 11 operations the controller needs)
- **Phase:** 2.5 — Friends + Social Migration (Dual-Write)
- **Third spec of Phase 2.5.** This is the smallest-reasoning, highest-surface-area spec in Phase 2.5. The `FriendsService` interface from 2.5.2 is the contract; this spec maps it onto HTTP without reshaping it.

---

## STAY ON BRANCH

Same as 2.5.1 / 2.5.2. Stay on `forums-wave-continued`. No `git checkout`, `git branch`, `git commit`, `git push`, `git stash`, `git reset`. Eric handles git manually.

---

## Goal

Wrap the 11 `FriendsService` methods shipped in 2.5.2 behind 8 REST endpoints under `/api/v1/users/me/friends`, `/api/v1/users/me/friend-requests`, `/api/v1/users/me/blocks`, `/api/v1/friend-requests/{id}`, and `/api/v1/users/search`. All endpoints authenticated via JWT (no `PublicPaths.java` additions). Map all 11 friends-domain exceptions to HTTP responses via package-scoped `@RestControllerAdvice`. Update `openapi.yaml` with new paths + schemas, regenerate frontend TypeScript types. Hit 22+ integration tests covering happy paths, auth gating, validation, exception → status code mapping, and edge cases.

This is the smallest-reasoning, highest-surface-area spec in Phase 2.5. The `FriendsService` interface from 2.5.2 is the contract; this spec maps it onto HTTP without reshaping it.

---

## Master Plan Divergence

Four divergences worth flagging to keep CC's recon focused.

### Divergence 1: Rate limiting deferred to Phase 10.9 (rate-limit-tightening)

**What the master plan says:** Spec 2.5.3 acceptance criterion line 3341 says "Rate limiting in place per project standards." `02-security.md` § "Forums Wave Rate Limits" specifies `Friend requests | 10 per day per user | Backend`.

**What this brief says:** Friends endpoints ship behind JWT auth (the de-facto gating mechanism — unauthenticated requests are rejected at `JwtAuthenticationFilter`). Per-user rate limiting (10 friend requests / day, 60 reactions / hour, etc.) is NOT built in this spec. Defer to Phase 10.9 (`round3-phase10-spec09-rate-limit-tightening`) where the broader rate-limit-tightening sweep covers all Forums Wave endpoints uniformly.

**Why:** The current `RateLimitFilter` (Phase 1 Spec 1) is per-IP, scoped only to `/api/v1/proxy/**`. Building per-user rate limiting just for friends endpoints would either (a) duplicate filter infrastructure that Phase 10.9 will rebuild correctly, or (b) require expanding `RateLimitFilter` scope and adding per-user keying — a substantive refactor that warrants its own spec. JWT authentication is the meaningful gate for the Phase 2.5 wave; abuse mitigation arrives with Phase 10. Add a followup entry in `_plans/post-1.10-followups.md`: "Per-user rate limiting on friends write endpoints (10 friend requests/day, etc.)" with revisit criterion "before Phase 10.9 ships, OR before backend friends becomes source-of-truth for reads."

### Divergence 2: User-search endpoint lives at `UserController`, not `FriendsController`

**What the master plan says:** Spec 2.5.3 line 3331 lists `GET /api/v1/users/search?q=name` alongside the friends endpoints, suggesting it ships with friends.

**What this brief says:** The endpoint goes in `UserController` (existing class at `/api/v1/users/**`), delegating to `FriendsService.searchUsers`. The other 7 endpoints go in a new `FriendsController`.

**Why:** URL namespace cohesion. `/api/v1/users/me/...` and `/api/v1/users/search` both belong to the user namespace; `/api/v1/users/me/friends` and `/api/v1/friend-requests/{id}` are friends-namespace. Splitting the `/users/search` endpoint into a friends controller would put a `/users/...` route in a non-`UserController`, which is confusing for future maintenance. `UserController` already injects `UserService`; adding a `FriendsService` dependency for the search delegation is a one-line constructor change. The cross-package dependency is fine — `FriendsService` is just a Spring bean and `UserController` is the natural endpoint owner for the URL.

### Divergence 3: PATCH single-endpoint dispatch (per master plan), not three separate verbs

**What the master plan says:** Line 3327: `PATCH /api/v1/friend-requests/{id}` (body: `{ action: 'accept' | 'decline' | 'cancel' }`).

**What this brief says:** Following master plan exactly. ONE endpoint, dispatched server-side based on `action` enum in body. `RespondToFriendRequestRequest` DTO has a single `@NotNull String action` field with custom validator (or `@Pattern`) constraining to the three values. Controller dispatches to `FriendsService.acceptRequest` / `declineRequest` / `cancelRequest`.

**Why mention this:** CC's recon may propose three separate endpoints (`POST /friend-requests/{id}/accept`, etc.) as more REST-idiomatic. Master plan's choice is deliberate — the three actions share validation, auth, and exception-handling shape, so dispatching server-side is simpler than triplicating the endpoint scaffolding. Don't second-guess the master plan here.

### Divergence 4: Week-start computation matches frontend convention (recon-driven)

**What the master plan says:** Decision 8 line 1187 says `weeklyPoints: number  // SUM(activity_log.points_earned) WHERE occurred_at >= getCurrentWeekStart()`. The "getCurrentWeekStart" semantics are not specified.

**What this brief says:** Controller computes `weekStart` for `FriendsService.listFriends(userId, weekStart)` using the user's `timezone` field. The week-start convention (Monday 00:00 local? Sunday 00:00 local?) MUST match the frontend's existing weekly-points calculation in `wr_friends` / `wr_leaderboard_global` so backend and frontend agree on which activity falls in "this week." Recon's task: grep `frontend/src/` for the function that computes weekly points or week start (likely in `services/friends-storage.ts`, `services/faith-points-storage.ts`, or `hooks/useFaithPoints.ts`). Match that convention exactly in the controller's helper.

**Why:** During Phase 2.5 wave, frontend remains source of truth for reads. Backend `weeklyPoints` is shadow data. But the FriendDto returned from `GET /users/me/friends` will eventually be consumed by Phase 7+ frontend code — the contract starts now. Drift between backend and frontend on "what's this week" causes silently-wrong leaderboards and weekly-recap notifications. Lock parity at the controller layer.

---

## Endpoints

Eight endpoints. Standard response shape `ProxyResponse.of(body, MDC.get("requestId"))` per existing `UserController` precedent. Empty list responses return 200 with `{ data: [] }`, NOT 404.

### 1. `GET /api/v1/users/me/friends`

- **Service call:** `friendsService.listFriends(principal.userId(), weekStart)` where `weekStart` is computed in controller from caller's `users.timezone`
- **Auth:** required (JWT)
- **Response:** 200 `ProxyResponse<List<FriendDto>>` — empty array when no friends
- **Pagination:** none (250-friend cap from `friends-system.md` makes single-response acceptable)

### 2. `GET /api/v1/users/me/friend-requests?direction=incoming|outgoing`

- **Service call:**
  - `direction=incoming` → `listIncomingPendingRequests(principal.userId())`
  - `direction=outgoing` → `listOutgoingPendingRequests(principal.userId())`
  - Missing direction param → 400 `INVALID_INPUT` "direction query parameter required"
  - Invalid direction value → 400 `INVALID_INPUT` "direction must be 'incoming' or 'outgoing'"
- **Auth:** required
- **Response:** 200 `ProxyResponse<List<FriendRequestDto>>`

### 3. `POST /api/v1/users/me/friend-requests`

- **Request body:** `SendFriendRequestRequest { @NotNull UUID toUserId, @Size(max=280) String message }`
- **Service call:** `sendRequest(principal.userId(), toUserId, message)`
- **Auth:** required
- **Response:** 201 `ProxyResponse<FriendRequestDto>` with `Location: /api/v1/friend-requests/{id}` header

### 4. `PATCH /api/v1/friend-requests/{id}`

- **Path param:** `id` UUID
- **Request body:** `RespondToFriendRequestRequest { @NotNull @Pattern(regexp="^(accept|decline|cancel)$") String action }`
- **Service call:** dispatch by action:
  - `accept` → `acceptRequest(id, principal.userId())`
  - `decline` → `declineRequest(id, principal.userId())`
  - `cancel` → `cancelRequest(id, principal.userId())`
- **Auth:** required
- **Response:** 200 `ProxyResponse<Map<String, String>>` body `{ "status": "accepted" | "declined" | "cancelled" }` (echoes the new state). Or 204 No Content if cleaner — CC picks. The 200-with-status is friendlier for frontend optimistic updates.

### 5. `DELETE /api/v1/users/me/friends/{friendId}`

- **Path param:** `friendId` UUID
- **Service call:** `removeFriend(principal.userId(), friendId)`
- **Auth:** required
- **Response:** 204 No Content (no body)

### 6. `POST /api/v1/users/me/blocks`

- **Request body:** `BlockUserRequest { @NotNull UUID userId }`
- **Service call:** `blockUser(principal.userId(), userId)`
- **Auth:** required
- **Response:** 201 `ProxyResponse<Map<String, Object>>` body `{ "blockedUserId": "<uuid>", "blockedAt": "<iso>" }` — no Location header (block isn't a separately-addressable resource by ID)

### 7. `DELETE /api/v1/users/me/blocks/{userId}`

- **Path param:** `userId` UUID
- **Service call:** `unblockUser(principal.userId(), userId)`
- **Auth:** required
- **Response:** 204 No Content

### 8. `GET /api/v1/users/search?q=name&limit=20`

- **Query params:** `q` string (required, min 2 chars enforced by service), `limit` int (optional, default 20, max 50 enforced by service)
- **Service call:** `friendsService.searchUsers(principal.userId(), q, limit)`
- **Location:** `UserController` (per Divergence 2)
- **Auth:** required
- **Response:** 200 `ProxyResponse<List<UserSearchResultDto>>`

---

## Exception → HTTP Code Mapping

The `FriendsException` subclasses already encode their HTTP status and machine-readable code (verified by reading 2.5.2's shipped code):

| Exception | HTTP | Code |
|---|---|---|
| `SelfActionException` | 400 | `SELF_ACTION_FORBIDDEN` |
| `InvalidInputException` | 400 | `INVALID_INPUT` |
| `BlockedUserException` | 403 | `BLOCKED_USER` |
| `UnauthorizedActionException` | 403 | `UNAUTHORIZED_ACTION` |
| `UserNotFoundException` | 404 | `USER_NOT_FOUND` |
| `FriendRequestNotFoundException` | 404 | `FRIEND_REQUEST_NOT_FOUND` |
| `NotFriendsException` | 404 | `NOT_FRIENDS` |
| `NotBlockedException` | 404 | `NOT_BLOCKED` |
| `AlreadyFriendsException` | 409 | `ALREADY_FRIENDS` |
| `DuplicateFriendRequestException` | 409 | `DUPLICATE_FRIEND_REQUEST` |
| `InvalidRequestStateException` | 409 | `INVALID_REQUEST_STATE` |

`FriendsExceptionHandler` is dead simple — mirror `UserExceptionHandler` exactly:

```java
@RestControllerAdvice(basePackages = "com.worshiproom.friends")
public class FriendsExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(FriendsExceptionHandler.class);

    @ExceptionHandler(FriendsException.class)
    public ResponseEntity<ProxyError> handleFriends(FriendsException ex) {
        var requestId = MDC.get("requestId");
        log.info("Friends-domain rejection: code={} message={}", ex.getCode(), ex.getMessage());
        return ResponseEntity
            .status(ex.getStatus())
            .body(ProxyError.of(ex.getCode(), ex.getMessage(), requestId));
    }
}
```

Pattern reference: `com.worshiproom.user.UserExceptionHandler` is the canonical shape. Copy it.

`FriendsValidationExceptionHandler` handles `@Valid` failures (`MethodArgumentNotValidException`, `HandlerMethodValidationException`, `MissingServletRequestParameterException`, `MethodArgumentTypeMismatchException`) for the friends package. Mirror `UserValidationExceptionHandler` — same package-scoped pattern, same INVALID_INPUT mapping, same field-error message format. Recon should grep `UserValidationExceptionHandler.java` and copy the structure.

**Note on package scoping:** Both advices are scoped to `com.worshiproom.friends`. The `UserController.search` endpoint added per Divergence 2 throws friends-domain exceptions (e.g., `InvalidInputException` from `FriendsService.searchUsers`) — those will bubble up through the user-package controller but be caught by the friends-package advice because exception advice scoping matches the EXCEPTION's package, not the controller's. Recon should verify Spring's advice resolution against this; if the package scoping doesn't catch friends exceptions thrown from a user-package controller, switch the friends advice to unscoped (no `basePackages`) like `RateLimitExceptionHandler` does. This is the kind of subtle Spring behavior worth a one-test verification.

---

## Files to Create

```
backend/src/main/java/com/worshiproom/friends/FriendsController.java
backend/src/main/java/com/worshiproom/friends/FriendsExceptionHandler.java
backend/src/main/java/com/worshiproom/friends/FriendsValidationExceptionHandler.java
backend/src/main/java/com/worshiproom/friends/dto/SendFriendRequestRequest.java
backend/src/main/java/com/worshiproom/friends/dto/RespondToFriendRequestRequest.java
backend/src/main/java/com/worshiproom/friends/dto/BlockUserRequest.java

backend/src/test/java/com/worshiproom/friends/FriendsControllerIntegrationTest.java
backend/src/test/java/com/worshiproom/friends/FriendsControllerExceptionMappingTest.java
```

CC may split or consolidate test classes. Two-class split rationale: one test class for happy-path endpoint behavior + auth gating + validation, second class for exhaustive exception → HTTP code coverage (one test per exception type minimum).

## Files to Modify

```
backend/src/main/java/com/worshiproom/user/UserController.java
```
Add `GET /search` endpoint (per Divergence 2). Constructor takes `FriendsService` (new injection). One new `@GetMapping("/search")` method delegating to `friendsService.searchUsers(...)`.

```
backend/src/main/resources/openapi.yaml
```
Add 8 new path entries with full request/response schemas. Reference shared `ProxyResponse` and `ProxyError` schemas. New schemas: `SendFriendRequestRequest`, `RespondToFriendRequestRequest`, `BlockUserRequest`, `FriendDto`, `FriendRequestDto`, `UserSearchResultDto`. Lint with Swagger Editor or `npx @redocly/cli lint` before shipping per `03-backend-standards.md` rule.

```
frontend/src/types/api/generated.ts
```
Regenerate via `npm run types:generate` (or whatever the established command is — recon should grep `package.json` scripts). If the openapi-typescript pipeline is NOT yet wired up (per `03-backend-standards.md`: "pipeline wired up by Forums Wave Phase 1; hand-typed in the interim"), recon should hand-type the new types to match the OpenAPI schemas. Either way: post-condition is `frontend/src/types/api/generated.ts` includes friends DTOs and request shapes.

## Files to Delete

None.

## Files NOT to Modify (deliberate non-changes)

- `backend/src/main/java/com/worshiproom/auth/PublicPaths.java` — all friends endpoints require auth. Listing only to confirm.
- `backend/src/main/java/com/worshiproom/friends/FriendsService.java` — service interface is finalized in 2.5.2; this spec only adds HTTP wrapping.
- Any Liquibase changeset — schema is finalized in 2.5.1.

---

## Acceptance Criteria

### Endpoints exist and are authenticated

- [ ] `GET /api/v1/users/me/friends` returns 401 with no JWT, 200 with valid JWT
- [ ] `GET /api/v1/users/me/friend-requests?direction=incoming` returns 200 with valid JWT
- [ ] `GET /api/v1/users/me/friend-requests?direction=outgoing` returns 200 with valid JWT
- [ ] `GET /api/v1/users/me/friend-requests` (missing direction) returns 400 INVALID_INPUT
- [ ] `GET /api/v1/users/me/friend-requests?direction=foo` returns 400 INVALID_INPUT
- [ ] `POST /api/v1/users/me/friend-requests` with `{toUserId, message}` returns 201 with `Location` header
- [ ] `PATCH /api/v1/friend-requests/{id}` with `{action: "accept"}` returns 200, status field reflects new state
- [ ] `PATCH /api/v1/friend-requests/{id}` with `{action: "decline"}` returns 200
- [ ] `PATCH /api/v1/friend-requests/{id}` with `{action: "cancel"}` returns 200
- [ ] `PATCH /api/v1/friend-requests/{id}` with `{action: "frobnicate"}` returns 400 INVALID_INPUT
- [ ] `DELETE /api/v1/users/me/friends/{friendId}` returns 204 No Content
- [ ] `POST /api/v1/users/me/blocks` with `{userId}` returns 201
- [ ] `DELETE /api/v1/users/me/blocks/{userId}` returns 204 No Content
- [ ] `GET /api/v1/users/search?q=ali&limit=10` returns 200 with `List<UserSearchResultDto>`

### Response shape conformance

- [ ] All 200/201 responses have shape `{ data: ..., meta: { requestId } }`
- [ ] All error responses have shape `{ code, message, requestId, timestamp }`
- [ ] `X-Request-Id` header on every response
- [ ] List endpoints return empty array (NOT 404) when underlying data is empty
- [ ] DELETE endpoints return 204 with no body (per HTTP spec)
- [ ] POST friend-request returns Location header pointing to `/api/v1/friend-requests/{id}`

### Exception mapping

- [ ] `SelfActionException` → 400 with code `SELF_ACTION_FORBIDDEN`
- [ ] `BlockedUserException` → 403 with code `BLOCKED_USER`
- [ ] `UnauthorizedActionException` → 403 with code `UNAUTHORIZED_ACTION`
- [ ] `UserNotFoundException` (friends-package) → 404 with code `USER_NOT_FOUND`
- [ ] `FriendRequestNotFoundException` → 404 with code `FRIEND_REQUEST_NOT_FOUND`
- [ ] `NotFriendsException` → 404 with code `NOT_FRIENDS`
- [ ] `NotBlockedException` → 404 with code `NOT_BLOCKED`
- [ ] `AlreadyFriendsException` → 409 with code `ALREADY_FRIENDS`
- [ ] `DuplicateFriendRequestException` → 409 with code `DUPLICATE_FRIEND_REQUEST`
- [ ] `InvalidRequestStateException` → 409 with code `INVALID_REQUEST_STATE`
- [ ] `InvalidInputException` → 400 with code `INVALID_INPUT`

### Request validation (`@Valid`)

- [ ] POST friend-request with missing `toUserId` returns 400 INVALID_INPUT with field error indicating "toUserId is required"
- [ ] POST friend-request with `message.length > 280` returns 400 INVALID_INPUT
- [ ] PATCH with missing `action` returns 400 INVALID_INPUT
- [ ] PATCH with `action` outside enum returns 400 INVALID_INPUT
- [ ] POST blocks with missing `userId` returns 400 INVALID_INPUT
- [ ] GET /users/search with `q` < 2 chars returns 400 INVALID_INPUT (service-layer validation surfaces through controller)

### Auth gating

- [ ] All 8 endpoints return 401 UNAUTHORIZED when called without `Authorization: Bearer ...` header
- [ ] All 8 endpoints return 401 with garbage Bearer token
- [ ] All 8 endpoints succeed with valid JWT
- [ ] None of the friends paths appear in `PublicPaths.PATTERNS`

### Week-start computation (Divergence 4)

- [ ] `GET /users/me/friends` returns FriendDto with `weeklyPoints` computed using week-start convention matching frontend (recon-determined)
- [ ] When caller's `users.timezone` is `"America/Chicago"`, weekStart is computed in Chicago time, NOT UTC
- [ ] Week-start helper has unit tests covering: timezone in DST-spring-forward week, timezone in DST-fall-back week, timezone with non-zero offset (e.g., Asia/Tokyo)

### OpenAPI spec

- [ ] `openapi.yaml` includes all 8 new path entries
- [ ] Schemas added: `SendFriendRequestRequest`, `RespondToFriendRequestRequest`, `BlockUserRequest`, `FriendDto`, `FriendRequestDto`, `UserSearchResultDto`
- [ ] Spec lints clean via `npx @redocly/cli lint backend/src/main/resources/openapi.yaml`
- [ ] Frontend `frontend/src/types/api/generated.ts` (or hand-typed equivalent) includes the new DTOs and request shapes

### Test count target

L-sized → 20–40 tests per `06-testing.md`. Master plan says "at least 20." Target **22–28 integration tests** distributed across the two test classes. All tests use `AbstractIntegrationTest` (full Spring context, real PostgreSQL via Testcontainers) since this exercises the full filter chain (RequestIdFilter → CorsFilter → SecurityHeadersFilter → JwtAuthenticationFilter → controller → service → DB).

---

## Testing Notes

**Use `AbstractIntegrationTest` + `MockMvc`.** Pattern from existing `UserControllerIntegrationTest` (or whatever Phase 1 tests of this shape look like — recon should pick the closest precedent and mirror it).

**JWT acquisition pattern in tests:** existing pattern likely involves either calling `/api/v1/auth/login` to acquire a real token, or directly minting one via `JwtService` with a known user. Recon should verify and follow the established pattern. Don't reinvent.

**Test data setup:** Use `@BeforeEach` to seed 3-5 test users (alice, bob, carol, dave, eve) and acquire JWTs for each. Most endpoint tests need 2-3 users to set up valid scenarios (e.g., "alice sends to bob" needs alice's JWT and bob's UUID).

**Exception-mapping test pattern** (one test per exception type minimum):

```java
@Test
void postFriendRequest_returns409_when_alreadyFriends() throws Exception {
  // setup: alice and bob are already friends (insert directly via repo)
  mockMvc.perform(post("/api/v1/users/me/friend-requests")
      .header("Authorization", "Bearer " + aliceJwt)
      .contentType(MediaType.APPLICATION_JSON)
      .content("""
        {"toUserId":"%s","message":null}
        """.formatted(bob.getId())))
    .andExpect(status().isConflict())
    .andExpect(jsonPath("$.code").value("ALREADY_FRIENDS"))
    .andExpect(jsonPath("$.requestId").exists());
}
```

**Note on JSON escaping:** the controller test for PATCH dispatch must include test cases for `{"action":"accept"}`, `{"action":"decline"}`, `{"action":"cancel"}`, `{"action":"frobnicate"}`, and `{}` (missing action). Five tests on this endpoint alone.

**Auth-gating tests** — write ONE parameterized test that walks all 8 endpoints with no Authorization header and asserts 401. Don't write 8 separate tests for the same auth concern. Per `06-testing.md`'s implicit "tests verify behavior, not boilerplate" principle.

**Week-start helper unit tests** — these don't need MockMvc or full Spring context. A small `@Test` class on the controller's week-start helper (or whatever class CC factors it into) covering the DST and timezone cases. ~3-5 tests.

**Empty-list response tests** — explicitly assert that `GET /users/me/friends` returns `{"data":[],"meta":{...}}` when the user has zero friends, NOT 404. Same for friend-requests endpoints.

---

## What to Watch For in CC's Spec Output

1. **Don't add friends paths to `PublicPaths.PATTERNS`.** All 8 endpoints require auth. If CC's plan proposes adding any friends path to PublicPaths, push back hard — that would expose user data to unauthenticated callers.

2. **PATCH dispatch via the action field, not three separate endpoints.** Per Divergence 3 / master plan. If CC proposes `POST /friend-requests/{id}/accept`, `POST /friend-requests/{id}/decline`, `POST /friend-requests/{id}/cancel` — push back. Master plan is deliberate.

3. **Search endpoint goes in `UserController`, not `FriendsController`.** Per Divergence 2. If CC proposes a new `UserSearchController` or putting it in `FriendsController`, the brief's recommendation is `UserController`. Either alternative is defensible if CC's recon makes a strong case, but the URL namespace is `/api/v1/users/search`, not `/api/v1/friends/search`, so cohesion favors UserController.

4. **`FriendsExceptionHandler` is package-scoped** (`@RestControllerAdvice(basePackages = "com.worshiproom.friends")`). UNLESS recon's verification test reveals that the search endpoint (in the user package) throws friends-domain exceptions that the package-scoped advice doesn't catch — in which case fall back to unscoped advice with the single-exception-class pattern from `RateLimitExceptionHandler`. This is the only architectural decision in this spec that needs verification rather than just specification.

5. **Empty list returns 200 with empty array, NOT 404.** "No friends" is not an error condition. Same for "no pending requests in this direction." Tests must assert this explicitly.

6. **`Location` header on POST friend-request, NOT on POST blocks.** Friend requests have a separately-addressable `/api/v1/friend-requests/{id}`; blocks don't have an analogous URL. Don't fabricate a `Location: /api/v1/blocks/{userId}` URL — that endpoint doesn't exist (only the DELETE form does).

7. **Week-start computation** — recon must grep `frontend/src/` for the existing weekly-points calculation and match its convention. Common gotcha: JavaScript `Date.getDay()` returns Sunday=0, Monday=1; Java `DayOfWeek.MONDAY.getValue()` returns 1. Off-by-one risk. Test with multiple timezones and DST boundaries.

8. **Don't build per-user rate limiting** in this spec (per Divergence 1). If CC's plan adds a `FriendsRateLimitFilter` or extends `RateLimitFilter` scope to `/api/v1/users/me/friends/**`, push back — that's Phase 10.9. JWT auth is the gate for this wave. Add the followup entry to `_plans/post-1.10-followups.md` instead.

9. **DELETE returns 204 with no body.** Not 200 with `{}`, not 200 with confirmation message. 204. Standard HTTP semantics.

10. **Don't add a `@JsonIgnore` or transient field to `AuthenticatedUser`** — it's a fixed contract from Spec 1.4. The principal carries `userId` and `isAdmin`; that's all. If a controller method needs the user's `timezone`, it fetches via `UserRepository.findById(principal.userId())`. The week-start helper takes the User entity (or just the timezone string) — don't try to enrich `AuthenticatedUser`.

11. **OpenAPI spec edits append, never reorder.** Same rule as Liquibase changesets — add new paths/schemas at logical insertion points but don't reshape existing entries (drift risk on cross-spec contract verification).

12. **Frontend `npm run types:generate`** — recon must verify this command exists in `frontend/package.json`. If not (the openapi-typescript pipeline may not be wired yet), hand-type the new types to match the OpenAPI schemas. Don't ship a spec that claims types were "regenerated" when they were hand-edited; document the path taken.

13. **Single quotes for shell snippets**, no curly quotes (autocorrect risk in commits/comments).

---

## Out of Scope

- Rate limiting per master plan target (deferred to Phase 10.9 per Divergence 1)
- Frontend dual-write wiring (→ Spec 2.5.4)
- Social interactions / milestone events HTTP layer (→ Spec 2.5.4b)
- Phase 2.5 cutover and env-var flip (→ Spec 2.5.5)
- Block user UX flow / Mute user feature (→ Specs 2.5.6 / 2.5.7)
- Pagination on friends list (250-cap makes single response acceptable for MVP)
- Sorting controls on friends list (current ORDER BY is `last_active_at DESC NULLS LAST, first_name ASC` from 2.5.2's native query — fixed for now)
- Last-active-write wiring on `users.last_active_at` (separate followup, mentioned in 2.5.2's Divergence 2)
- Admin endpoints to inspect or moderate friend graph (→ Phase 10)
- Friend-suggestion endpoints / "People You May Know" (→ Phase 14 onboarding)
- Webhook or SSE for friend-request notifications (→ Phase 12 notification system)

---

## Out-of-Band Notes for Eric

- This is the most mechanical spec in Phase 2.5. Reasoning depth is low; surface area is high. xHigh thinking is fine (per our discussion — even MAX wouldn't help much here, since the work is "mirror existing patterns" rather than "reason through novel correctness").
- Estimated execution: 1–2 sessions. ~6 new files + ~3 modified + ~25 tests.
- After 2.5.3 ships, the master plan's Decision 8 backend contract is fully realized. 2.5.4 wires the frontend dual-write; from then on the friends data starts shadow-writing to backend in dev.
- The OpenAPI lint is a real gate — `npx @redocly/cli lint` will catch malformed schemas before they ship to the frontend type generator. Run it locally before declaring the spec done.
- If recon discovers `frontend/package.json` doesn't have a `types:generate` script wired up, that's a separate followup ("Wire openapi-typescript pipeline") and 2.5.3 hand-types the new types in the interim. Don't let the missing pipeline block 2.5.3 — it would block all of Phase 3+ if we waited.
- Spec tracker update after 2.5.3 ships: `2.5.3 ✅`, Phase 2.5 progress 3/8.
- The `UserController` modification (adding `/search` endpoint) is small but cross-package. CC's recon should verify the existing `UserController` constructor injection pattern and add `FriendsService` as a new constructor parameter. No setter injection, no field injection — constructor only per `03-backend-standards.md`.
- The exception-handler-package-scoping verification (watch-for #4) is the single highest-risk discovery during recon. If `FriendsValidationExceptionHandler` and `FriendsExceptionHandler` scoped to `com.worshiproom.friends` don't catch exceptions raised from `UserController.search()`, the fallback (unscoped advice or move search to FriendsController) is a real architectural pivot. Recon's first job is verifying the package-scoping works for this cross-package case.
- Once 2.5.3 is green, the next spec (2.5.4) is frontend-only — first frontend work in Phase 2.5. Different shape, different recon, different watch-fors. I'll write that one when 2.5.3 finishes review.
