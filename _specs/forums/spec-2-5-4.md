# Forums Wave: Spec 2.5.4 — Frontend Friends Dual-Write

**Master Plan Reference:** `_forums_master_plan/round3-master-plan.md` → Decision 5 (dual-write strategy, lines 951–1048), Decision 8 (lines 1131–1196), Spec 2.5.4 body (lines 3344–3365)
**Branch:** `forums-wave-continued` (stay on this branch — no per-spec sub-branch)
**Date:** 2026-04-27

---

## Affected Frontend Routes

N/A — frontend dual-write spec, but no user-visible UI changes. The new flag (`VITE_USE_BACKEND_FRIENDS`) defaults to `false`, so behavior is byte-identical on every route that consumes `useFriends` (`/friends`, `/profile/:userId`, the Friends/Leaderboard tabs, friend-action surfaces inside Prayer Wall, etc.). When the flag is flipped on locally for smoke-testing (Spec 2.5.5 owns the cutover), the backend dispatch is silent — no toast, no banner, no error surface, no UI affordance. Mirrors the Spec 2.7 pattern exactly. `/verify-with-playwright` is therefore skipped for this spec.

The new optional `backendId?: string` field on `FriendRequest` is invisible at the UI layer; existing serialized `wr_friends` data without `backendId` continues to render normally.

---

## Spec Header

- **ID:** `round3-phase02-5-spec04-frontend-friends-dual-write`
- **Size:** L
- **Risk:** Medium (touches ~12 friends-related call sites, requestId mapping is non-trivial, simulated-auth edge case)
- **Prerequisites:** 2.5.1 ✅ shipped (4 friends-domain tables + Liquibase changesets), 2.5.2 ✅ shipped (`FriendsService` exposes all 11 operations), 2.5.3 ✅ shipped (all 8 friends endpoints live behind JWT auth)
- **Phase:** 2.5 — Friends + Social Migration (Dual-Write)
- **Fourth spec of Phase 2.5.** First frontend-only spec of the phase. Specs 2.5.4b (social interactions + milestone events), 2.5.5 (cutover), 2.5.6 (block UX), 2.5.7 (mute UX) layer on top.

---

## STAY ON BRANCH

Same as 2.5.1 / 2.5.2 / 2.5.3. Stay on `forums-wave-continued`. No `git checkout`, `git branch`, `git commit`, `git push`, `git stash`, `git reset`. Eric handles git manually.

---

## Goal

Wire the existing `useFriends` hook to dual-write friend mutations to the backend (alongside the existing localStorage write) when `VITE_USE_BACKEND_FRIENDS=true`. localStorage stays the source of truth for reads; backend receives a shadow copy. Mirror the Spec 2.7 (Activity Dual-Write) pattern exactly — fire-and-forget, errors logged + swallowed, never break the UI. Six mutations get dual-writes: `sendRequest`, `acceptRequest`, `declineRequest`, `cancelRequest`, `removeFriend`, `blockUser`. Search and unblock are explicitly out of scope (see Out of Scope section).

Frontend reads (`friends`, `pendingIncoming`, `pendingOutgoing`, `blocked`, `searchUsers`, `suggestions`) continue to come from localStorage / mock data unchanged. The wave will not promote backend to source-of-truth for reads — that's a future spec.

---

## Master Plan Divergence

Four divergences worth flagging.

### Divergence 1: Local request IDs (`req-{ts}-{rand}`) ≠ backend request IDs (UUIDs); the spec persists a mapping

**What the master plan says:** Master plan Spec 2.5.4 body (line 3352) just says "wrap each mutation (sendRequest, acceptRequest, etc.) with a backend call alongside the existing localStorage write." Doesn't address ID mismatch.

**What this brief says:** The backend's PATCH endpoint requires the backend's UUID (`PATCH /api/v1/friend-requests/{backendId}`), not the local string ID (`req-1234-abc`). When `sendRequest` is dual-writing, the backend's POST response includes the backend-assigned UUID. We capture that on success and store it on the local `FriendRequest` object as a new optional `backendId` field. Then `acceptRequest` / `declineRequest` / `cancelRequest` read `backendId` from the local request and use it for the backend PATCH call. If `backendId` is absent (request was created pre-flag-flip, or POST failed silently), the backend PATCH call is skipped with a warning log — local state still updates.

**Why:** Without this mapping, the dual-write pipeline breaks at the second hop: PATCH call sends `req-1234-abc` to a URL expecting a UUID, gets 400 INVALID_INPUT or 404 NOT_FOUND, the backend never sees the accept/decline/cancel signal. The mapping is the only correct way to bridge the local-ID and backend-ID worlds during the dual-write wave.

**Schema addition:** `FriendRequest` interface in `frontend/src/types/dashboard.ts` gains an optional `backendId?: string` field. Existing `wr_friends` data without `backendId` continues to work (TypeScript optional, runtime undefined). `friends-storage.ts` operation functions take an optional `backendId` parameter on `sendFriendRequest` and store it on the FriendRequest if provided.

### Divergence 2: Mock target users → most dual-write attempts will return 404 USER_NOT_FOUND (intentional)

**What the master plan says:** Decision 5 acknowledges dual-write is best-effort: "If the backend hiccups, every feature still works from localStorage."

**What this brief says:** Most friend-mutation backend calls in this wave will fail with 404 USER_NOT_FOUND because the target users are mock-data UUIDs (`ALL_MOCK_USERS`, `MOCK_SUGGESTIONS` from `frontend/src/mocks/friends-mock-data.ts`) that don't exist in the backend `users` table. This is expected and tolerated. Console warnings are logged; localStorage state is unaffected.

**Why mention this:** Without this acknowledgment, future debugging sessions will confuse "intentional 404 because mock data" with "real bug in dual-write wiring." The 404 floor is the wave-level reality. Real cross-device data arrives only after (a) Phase 2.5 cutover flips the flag default, AND (b) real authenticated users on different devices start friending each other — both of which postdate this spec.

**The exception:** when one real authenticated user (e.g., a Phase 1.8 dev seed user) sends a request to ANOTHER real user, the backend writes will succeed and create real shadow data. Recon should verify by manually testing the dual-write between two seed users in dev — at least one round-trip should produce a real `friend_requests` row in PostgreSQL.

### Divergence 3: Search is NOT dual-written; mock search remains canonical for this wave

**What the master plan says:** Master plan Spec 2.5.4 body lists files to modify (line 3354–3358) and acceptance criteria (3360–3365) but doesn't explicitly address search.

**What this brief says:** `searchUsers(query)` in `useFriends` stays synchronous and mock-data-driven. The backend's `GET /api/v1/users/search?q=...` endpoint is NOT called during this wave.

**Why:** Three reasons. (a) Search is a read, and the wave's contract is "reads stay localStorage; backend is shadow for writes only." (b) Switching search to async-backend would require UI changes (loading spinner, debouncing, empty-state handling) that are bigger than a "dual-write wiring" spec should be. (c) The backend's search is keyed off real `users` table rows; during this wave, the only real users are the 5 dev-seed accounts plus whoever's testing — search results would be dramatically smaller than mock-data results, causing UX regression for no benefit. Add a followup: "Async backend search integration in `useFriends.searchUsers`" for Phase 7+ when real users exist.

### Divergence 4: Unblock is out of scope (no UI consumer exists)

**What the master plan says:** Spec 2.5.4 acceptance criteria (line 3362) say "All friend mutations dual-write when flag is on." Backend (Spec 2.5.3) supports unblock via `DELETE /api/v1/users/me/blocks/{userId}`.

**What this brief says:** `useFriends` does not currently expose `unblockUser`. The only place "unblock" semantics fire today is via `blockUser` reversal (which doesn't exist as a function). No UI calls unblock. Adding a wrapper function to `useFriends` for an operation no UI consumes is dead code. Spec 2.5.6 (Block User Feature, Medium-sized) is the natural home for the formalized block/unblock UX, including the unblock dual-write.

**Why:** Avoid shipping unused code paths. Tests for `unblockUser` would have no integration path; manual QA can't exercise it via the UI. Defer cleanly to 2.5.6.

---

## API Client Layer (new)

Mirror `frontend/src/lib/api-client.ts` calling pattern from Spec 2.7 / Spec 1.9. New module:

```
frontend/src/services/api/friends-api.ts
```

Six exported functions, each wrapping `apiFetch` with the appropriate path/method/body:

```typescript
import { apiFetch } from '@/lib/api-client'

interface SendFriendRequestApiResponse {
  id: string                 // backend's UUID — captured for the local-to-backend ID mapping
  fromUserId: string
  toUserId: string
  message: string | null
  status: string
  createdAt: string
  respondedAt: string | null
  // (...whatever else the backend returns; mirror the FriendRequestDto record from 2.5.2)
}

export async function sendFriendRequestApi(
  toUserId: string,
  message: string | null,
): Promise<SendFriendRequestApiResponse> {
  return apiFetch<SendFriendRequestApiResponse>('/api/v1/users/me/friend-requests', {
    method: 'POST',
    body: JSON.stringify({ toUserId, message }),
  })
}

export async function respondToFriendRequestApi(
  backendRequestId: string,
  action: 'accept' | 'decline' | 'cancel',
): Promise<void> {
  await apiFetch<unknown>(`/api/v1/friend-requests/${backendRequestId}`, {
    method: 'PATCH',
    body: JSON.stringify({ action }),
  })
}

export async function removeFriendApi(friendUserId: string): Promise<void> {
  await apiFetch<void>(`/api/v1/users/me/friends/${friendUserId}`, {
    method: 'DELETE',
  })
}

export async function blockUserApi(userId: string): Promise<void> {
  await apiFetch<void>('/api/v1/users/me/blocks', {
    method: 'POST',
    body: JSON.stringify({ userId }),
  })
}
```

Four functions, not six: accept/decline/cancel collapse into one `respondToFriendRequestApi` because the backend's PATCH endpoint dispatches by `action` field. Helper functions `acceptFriendRequestApi(id)`, `declineFriendRequestApi(id)`, `cancelFriendRequestApi(id)` may be added on top as thin wrappers if it improves call-site readability — recon decides.

**Type generation note:** if the openapi-typescript pipeline lands as part of Spec 2.5.3 (per that spec's acceptance criteria), the request/response types should be imported from `frontend/src/types/api/generated.ts` rather than hand-written here. If the pipeline isn't yet wired up, hand-typed shapes inline are acceptable for now.

---

## Wiring into `useFriends`

The dual-write block lands inside each of the six mutation `useCallback`s, AFTER the local `persist(...)` call (mirroring Spec 2.7's pattern of localStorage-first then backend-shadow). Skeleton:

```typescript
import { isBackendFriendsEnabled } from '@/lib/env'
import { getStoredToken } from '@/lib/auth-storage'
import {
  sendFriendRequestApi,
  respondToFriendRequestApi,
  removeFriendApi,
  blockUserApi,
} from '@/services/api/friends-api'

const sendRequest = useCallback(
  (toProfile: FriendProfile) => {
    if (!isAuthenticated || !user) return

    // ... existing localStorage write ...
    const newData = storageSendRequest(data, currentUserProfile, toProfile)
    persist(newData)

    // Spec 2.5.4 dual-write — fire-and-forget, never block UX.
    if (shouldDualWrite()) {
      sendFriendRequestApi(toProfile.id, null)
        .then((response) => {
          // Capture backend's UUID for future PATCH calls (Divergence 1)
          attachBackendIdToLocalRequest(toProfile.id, response.id)
        })
        .catch((err) => {
          console.warn('[useFriends] backend sendRequest dual-write failed:', err)
        })
    }
  },
  [isAuthenticated, user, data, persist],
)

// Helper, not exported — lives at the top of useFriends.ts or a co-located module.
function shouldDualWrite(): boolean {
  return isBackendFriendsEnabled() && getStoredToken() !== null
}
```

The `shouldDualWrite()` guard is critical (see Watch-For #1 below): both the env flag AND a real JWT must be present. `isAuthenticated` alone returns true for legacy simulated-auth mode (no JWT), and firing the backend call in that mode would produce an apiFetch 401 → AUTH_INVALIDATED dispatch → unintended logout cascade.

### `attachBackendIdToLocalRequest` helper

Updates the local FriendRequest in the `pendingOutgoing` array to set its `backendId` field, then re-persists `wr_friends`. Pure operation function in `friends-storage.ts`:

```typescript
// In friends-storage.ts
export function attachBackendId(
  data: FriendsData,
  toUserId: string,
  backendId: string,
): FriendsData {
  return {
    ...data,
    pendingOutgoing: data.pendingOutgoing.map((req) =>
      req.to.id === toUserId && !req.backendId ? { ...req, backendId } : req,
    ),
  }
}
```

Match-criterion: the most-recently-sent outgoing request to `toUserId` that has no `backendId` yet. The "no `backendId` yet" filter prevents a stale .then() callback from clobbering an already-mapped request if the user happens to send→cancel→re-send rapidly. The `useFriends` callback for sendRequest captures the post-success state via setState updater pattern — recon decides whether to use the updater pattern or direct localStorage rewrite (the latter is simpler; the former is more reactive-correct).

### Respond mutations need backendId lookup

`acceptRequest`, `declineRequest`, `cancelRequest` all look up the FriendRequest in the appropriate array (`pendingIncoming` for accept/decline, `pendingOutgoing` for cancel) and read its `backendId` before firing the API call:

```typescript
const acceptRequest = useCallback(
  (localRequestId: string) => {
    if (!isAuthenticated) return

    // Capture backendId BEFORE persist (since persist removes the request from pendingIncoming)
    const request = data.pendingIncoming.find((r) => r.id === localRequestId)
    const backendId = request?.backendId

    // ... existing localStorage write ...
    persist(storageAcceptRequest(data, localRequestId))

    // Dual-write only if we have a backendId (Divergence 1 mapping).
    if (shouldDualWrite() && backendId) {
      respondToFriendRequestApi(backendId, 'accept').catch((err) => {
        console.warn('[useFriends] backend acceptRequest dual-write failed:', err)
      })
    } else if (shouldDualWrite() && !backendId) {
      console.warn(
        '[useFriends] skipping backend acceptRequest — no backendId on local request',
        { localRequestId },
      )
    }
  },
  [isAuthenticated, data, persist],
)
```

Same shape for decline and cancel.

### removeFriend and blockUser are simpler

Both take a user ID directly (no request-ID layer). Direct dual-write:

```typescript
const removeAFriend = useCallback(
  (friendId: string) => {
    if (!isAuthenticated) return

    persist(storageRemoveFriend(data, friendId))

    if (shouldDualWrite()) {
      removeFriendApi(friendId).catch((err) => {
        console.warn('[useFriends] backend removeFriend dual-write failed:', err)
      })
    }
  },
  [isAuthenticated, data, persist],
)

const blockAUser = useCallback(
  (userId: string) => {
    if (!isAuthenticated) return

    persist(storageBlockUser(data, userId))

    if (shouldDualWrite()) {
      blockUserApi(userId).catch((err) => {
        console.warn('[useFriends] backend blockUser dual-write failed:', err)
      })
    }
  },
  [isAuthenticated, data, persist],
)
```

---

## Files to Create

```
frontend/src/services/api/friends-api.ts
frontend/src/services/api/__tests__/friends-api.test.ts
```

## Files to Modify

```
frontend/src/hooks/useFriends.ts
  — add shouldDualWrite() helper
  — wire 6 mutations to call the api functions in fire-and-forget pattern
  — capture backendId on sendRequest success
  — read backendId on accept/decline/cancel before persisting (since persist removes the request)

frontend/src/services/friends-storage.ts
  — add attachBackendId(data, toUserId, backendId) pure operation function

frontend/src/types/dashboard.ts
  — extend FriendRequest interface with optional backendId?: string field

frontend/src/lib/env.ts
  — add isBackendFriendsEnabled() helper mirroring isBackendActivityEnabled() exactly

frontend/.env.example
  — add VITE_USE_BACKEND_FRIENDS=false default
  — comment block matching VITE_USE_BACKEND_ACTIVITY's existing entry

frontend/src/hooks/__tests__/useFriends.test.tsx (or create if missing)
  — test coverage for both flag states (see Test Plan below)
```

## Files NOT to Modify (deliberate non-changes)

- `frontend/src/mocks/friends-mock-data.ts` — mock UUIDs stay; don't try to align with backend seed users. Out of scope.
- `useFriends.ts` `searchUsers` callback — Divergence 3 keeps it synchronous + mock-driven.
- `useFriends.ts` `suggestions` memo — same; reads stay localStorage during wave.
- Any backend code — 2.5.3 is final.

## Files to Delete

None.

---

## Acceptance Criteria

### Flag-off behavior (regression discipline)

- [ ] `VITE_USE_BACKEND_FRIENDS` unset (or `false`, `''`, or any non-`'true'` value) → no `apiFetch` call fires for any of the 6 mutations
- [ ] All existing `useFriends` test cases still pass with no test modifications
- [ ] localStorage `wr_friends` shape unchanged when flag off (no spurious `backendId` field appearing on requests)
- [ ] Mock data (`ALL_MOCK_USERS`, `MOCK_SUGGESTIONS`) still drives suggestions, search, and request flows when flag off

### Flag-on behavior (the wiring)

- [ ] `VITE_USE_BACKEND_FRIENDS=true` AND `getStoredToken() !== null` → `sendRequest` fires `POST /api/v1/users/me/friend-requests` with body `{toUserId, message: null}`
- [ ] `sendRequest` success captures `response.id` as `backendId` on the local outgoing request via `attachBackendId`
- [ ] `sendRequest` failure (network error, 4xx, 5xx) is swallowed; localStorage state unchanged; console.warn logged with prefix `[useFriends] backend sendRequest dual-write failed:`
- [ ] `acceptRequest` for a request with `backendId` fires `PATCH /api/v1/friend-requests/{backendId}` with body `{action: "accept"}`
- [ ] `acceptRequest` for a request WITHOUT `backendId` (locally-created pre-flag-flip) skips the backend call and logs `[useFriends] skipping backend acceptRequest — no backendId on local request`
- [ ] Same shape: declineRequest fires PATCH `{action: "decline"}`, cancelRequest fires PATCH `{action: "cancel"}`
- [ ] `removeFriend` fires `DELETE /api/v1/users/me/friends/{friendId}` (no body)
- [ ] `blockUser` fires `POST /api/v1/users/me/blocks` with body `{userId}`
- [ ] All five mutation paths (send, respond×3, remove, block) swallow errors via `.catch(console.warn)`; localStorage state always updates regardless of backend outcome

### Auth-state guard (Watch-For #1)

- [ ] When user is in legacy simulated-auth mode (`wr_auth_simulated === 'true'` BUT `getStoredToken()` returns null), `shouldDualWrite()` returns false; no apiFetch fires for any mutation
- [ ] When user is in real-JWT mode (`getStoredToken()` returns a token), `shouldDualWrite()` returns true (assuming flag on)
- [ ] When user is fully unauthenticated (`!isAuthenticated`), the existing early-return in each callback fires; no dual-write attempt

### requestId mapping (Divergence 1)

- [ ] `FriendRequest` TypeScript interface gains optional `backendId?: string` field
- [ ] Existing serialized `wr_friends` data without `backendId` deserializes cleanly (no runtime errors, requests function normally)
- [ ] `sendFriendRequest` operation in `friends-storage.ts` does NOT set `backendId` (it's set later by `attachBackendId` after backend response)
- [ ] `attachBackendId` updates the most-recent matching outgoing request only when `backendId` is currently undefined (idempotent against double-callback firing)

### Env file

- [ ] `frontend/.env.example` includes `VITE_USE_BACKEND_FRIENDS=false` with a comment line matching the existing `VITE_USE_BACKEND_ACTIVITY` entry's tone and content
- [ ] `isBackendFriendsEnabled()` in `env.ts` uses strict `=== 'true'` comparison (fail-closed; mirrors `isBackendActivityEnabled` exactly)

### Test count target

L-sized → 20–40 tests per `06-testing.md`. Master plan says "at least 8 tests cover both flag states." Target **14–18 tests** across the three test files (api client, hook, storage).

---

## Test Plan

### `friends-api.test.ts` (4–5 tests)

Use MSW or fetch-mock to intercept HTTP calls. Verify:
- `sendFriendRequestApi` calls `POST /api/v1/users/me/friend-requests` with correct body and Authorization header from `getStoredToken()`
- `respondToFriendRequestApi('uuid', 'accept')` calls `PATCH /api/v1/friend-requests/uuid` with `{action: "accept"}`
- `removeFriendApi('uuid')` calls `DELETE /api/v1/users/me/friends/uuid`
- `blockUserApi('uuid')` calls `POST /api/v1/users/me/blocks` with `{userId: 'uuid'}`
- Network error rejects the promise (caller-side handles via .catch)

### `useFriends.test.tsx` (8–10 tests)

Mock `friends-api.ts` functions via `vi.mock`. Verify:
- Flag off → none of the api functions called for any mutation
- Flag on + JWT present → `sendRequest` calls `sendFriendRequestApi`
- `sendRequest` success path attaches `backendId` to local request
- `acceptRequest` with `backendId` calls `respondToFriendRequestApi(backendId, 'accept')`
- `acceptRequest` WITHOUT `backendId` doesn't call api; logs warning
- Same shape for decline and cancel
- `removeFriend` calls `removeFriendApi(friendId)` when flag on
- `blockUser` calls `blockUserApi(userId)` when flag on
- Backend error in any mutation doesn't change local state or throw to caller
- Simulated-auth (no JWT) → no api calls fire even when flag on

### `friends-storage.test.ts` (2–3 tests; co-locate with existing tests)

- `attachBackendId` updates the matching outgoing request's `backendId`
- `attachBackendId` is no-op when no matching request exists
- `attachBackendId` only updates when `backendId` is currently undefined (idempotency)

---

## What to Watch For in CC's Spec Output

1. **Simulated-auth guard.** `shouldDualWrite()` MUST gate on BOTH `isBackendFriendsEnabled()` AND `getStoredToken() !== null`. Spec 2.7's pattern uses only `isAuthenticated`, which evaluates true for legacy simulated-auth mode (where no JWT exists). Firing apiFetch without a JWT returns 401, which dispatches `AUTH_INVALIDATED_EVENT`, which AuthContext handles as a "stale token" condition and may unintentionally log out simulated-auth users. Recon should verify what AuthContext's `wr:auth-invalidated` handler does — if it tolerates legacy mock-auth gracefully, the simpler `if (isAuthenticated && isBackendFriendsEnabled())` pattern is safe. If it doesn't, the `getStoredToken() !== null` guard is mandatory. Either way: explicit verification, not assumption.

2. **`backendId` capture timing.** In `sendRequest`, the `.then(response => attachBackendIdToLocalRequest(...))` callback fires AFTER `persist(newData)` has already updated React state with the new outgoing request. The callback then re-persists with the `backendId` filled in. There's a small race window where a user could double-tap "send request" and the second send would not find a "no backendId yet" outgoing request to attach to (because the first one is still in flight). This is an acceptable edge case — duplicate sends are already rate-limited at the storage layer (existing `sendFriendRequest` operation rejects duplicates). Recon should NOT try to add complex async ordering or queue logic for this; the dual-write pattern is meant to be loose.

3. **PATCH endpoint URL pattern.** Master plan says `PATCH /api/v1/friend-requests/{id}` (NOT `/api/v1/users/me/friend-requests/{id}`). Spec 2.5.3 implements it at the bare path. Don't accidentally namespace it under `/users/me/...`.

4. **Response shape for sendRequest.** The backend's POST returns `ProxyResponse<FriendRequestDto>` envelope. `apiFetch` strips the envelope and returns `data` directly, so the .then callback sees the FriendRequestDto fields (including `id` for the backend UUID). If recon proposes parsing the envelope manually inside `friends-api.ts`, push back — apiFetch already handles it.

5. **Don't add an `unblockUser` function.** Per Divergence 4. Even if CC's recon notices the backend supports it. Spec 2.5.6 owns the unblock UX.

6. **Don't change `searchUsers` to async.** Per Divergence 3. Synchronous mock filter stays.

7. **Don't modify `friends-mock-data.ts`.** Mock UUIDs stay separate from backend UUIDs. No "harmonization" attempts in this spec.

8. **`isBackendFriendsEnabled()` mirrors `isBackendActivityEnabled()` EXACTLY.** Same `=== 'true'` strict equality, same JSDoc shape, same failure mode. Don't get clever with default values or fallback semantics.

9. **The `attachBackendId` helper match criterion.** "Most recent outgoing request to `toUserId` without a `backendId`." If CC proposes matching by request creation timestamp (which exists as `sentAt` on the FriendRequest), that works too — the simpler "first match without backendId" is fine. Don't over-engineer.

10. **DELETE endpoint with no body.** `removeFriendApi` and the (out-of-scope) unblock both DELETE with no JSON body. `apiFetch` defaults Content-Type to `application/json` even on DELETEs, which is fine — the backend accepts it. Don't try to suppress the Content-Type header.

11. **Respond endpoints capture backendId BEFORE persist.** This is non-obvious. The `persist(storageAcceptRequest(data, localRequestId))` call removes the request from `pendingIncoming` (because accept moves it to `friends`). After persist, looking up `data.pendingIncoming.find(r => r.id === localRequestId)` returns undefined. So the backendId lookup MUST happen BEFORE the persist call. Same for declineRequest (removes from pendingIncoming) and cancelRequest (removes from pendingOutgoing). This is the kind of bug that would silently ship if recon doesn't catch it.

12. **Error log prefix consistency.** All warn logs use the prefix `[useFriends] backend {operation} dual-write failed:` — match Spec 2.7's prefix style exactly so future log-grepping works uniformly across the dual-write surface.

13. **Single quotes** for any shell commands, paths, or test fixture strings. (Standard hygiene.)

---

## Out of Scope

- **Search dual-write** (Divergence 3) — synchronous mock search stays. Followup: "Async backend search integration" for Phase 7+.
- **Unblock dual-write** (Divergence 4) — no UI consumer. Spec 2.5.6 owns it.
- **Reading FriendDto data from backend** — backend response is logged but not consumed; reads stay localStorage during this wave. Future spec (likely Phase 7) promotes backend to source of truth.
- **Pagination on friends list** — no UI need; out of scope.
- **`wr_social_interactions` and `wr_milestone_feed` dual-write** — those go to Spec 2.5.4b in their own dedicated spec.
- **The `VITE_USE_BACKEND_FRIENDS` flag flip to `true` in dev/.env.example** — that's Spec 2.5.5 (cutover).
- **Optimistic updates / rollback on backend error** — fire-and-forget pattern means localStorage is the contract; no rollback needed.
- **`useEffect` to refresh friends data from backend on mount** — reads stay localStorage; no backend GET calls fire from `useFriends`.
- **Replacing mock UUIDs with backend seed-user UUIDs** — not in scope; mock data stays as-is.
- **Sentry integration for dual-write failures** — console.warn is sufficient. Frontend Sentry isn't even wired yet (per `07-logging-monitoring.md`'s "1.10d-bis" deferred note).

---

## Out-of-Band Notes for Eric

- This is L-sized but mostly mechanical. Reasoning depth is low except for the requestId mapping (Divergence 1) and the simulated-auth guard (Watch-For #1). xHigh thinking is plenty — no MAX consideration needed.
- Estimated execution: 1–2 sessions. ~2 new files, ~5 modified, ~14–18 tests.
- After 2.5.4 ships, the dual-write infrastructure is in place but the flag default is still `false` in `.env.example`. Spec 2.5.5 (cutover) flips it. Until then, the dual-write code paths are inert in the running app — only test environments exercise them.
- Manual smoke test recommendation post-execution: with flag on locally, log in as a Phase 1.8 dev seed user, send a friend request to ANOTHER seed user (need to inject a real seed user into mock data temporarily, or wait until 2.5.5 cutover when seed users may surface naturally), accept it on a second browser tab, verify a real `friend_requests` row in the dev PostgreSQL with `status='accepted'` and two `friend_relationships` rows. This is the only end-to-end verification of the wire-up; unit tests cover the function-call shape but not the actual round-trip. Defer the manual smoke to 2.5.5's cutover checklist if simpler.
- Spec tracker after 2.5.4 ships: `2.5.4 ✅`, Phase 2.5 progress 4/8.
- Watch-For #1 (simulated-auth guard) is the one I'm least certain about. Spec 2.7 may have already addressed this concern in a way I haven't traced. CC's recon should grep for the AuthContext handler of `AUTH_INVALIDATED_EVENT` and trace what happens to legacy simulated-auth users when it fires. If the simulated-auth flow handles it gracefully, my proposed `getStoredToken() !== null` guard becomes belt-and-suspenders rather than necessary — still good defensive code, but not load-bearing. If the simulated-auth flow gets clobbered by the event, the guard is mandatory. Either way: this gets explicit verification.
- The next spec after 2.5.4 is 2.5.4b (Social Interactions & Milestone Events Dual-Write), which is the same shape but for two new write-only endpoints that don't currently exist on the backend yet. 2.5.4b creates the backend AND the frontend dual-write in one spec — different shape from 2.5.4 entirely. Will draft when 2.5.4 finishes review.
