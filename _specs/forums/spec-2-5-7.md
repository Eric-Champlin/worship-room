# Forums Wave: Spec 2.5.7 — Mute User Feature (Phase 2.5 Final Spec)

**Master Plan Reference:** `_forums_master_plan/round3-master-plan.md` → Appendix E Spec 2.5.7 stub
**Branch:** `forums-wave-continued` (Eric's long-lived branch — STAY ON BRANCH)
**Date:** 2026-04-27

---

## Affected Frontend Routes

- `/settings` (Privacy section — adds Muted Users list after Blocked Users)
- `/friends` (FriendMenu — adds Mute action between Remove Friend and Block)
- `/profile/:userId` (FriendMenu surfaces here)
- `/prayer-wall/user/:id` (FriendMenu may surface here)

---

# Spec 2.5.7: Mute User Feature (Phase 2.5 Final Spec)

**Spec ID:** `round3-phase02-5-spec07-mute-user`
**Branch:** `forums-wave-continued` (Eric's long-lived branch — DO NOT create a new branch, DO NOT checkout, DO NOT commit/push)
**Prereqs:** 2.5.5 ✅ (cutover live; backend friends/social receiving traffic), 2.5.6 ✅ (block UX formalized; ConfirmDialog primitive in place)
**Size:** S
**Risk:** Low (greenfield feature with no consumers today; Phase 3 feed will integrate the read filter when Prayer Wall lands)
**Master Plan Reference:** `_forums_master_plan/round3-master-plan.md` — Appendix E Spec 2.5.7 stub (last entry)

---

## STAY ON BRANCH

Same as the rest of Phase 2.5. Stay on `forums-wave-continued`. No `git checkout`, `git branch`, `git commit`, `git push`, `git stash`, `git reset`. Eric handles git manually.

---

## Goal

Ship the Mute User feature end-to-end:

1. **Backend:** new `user_mutes` table (Liquibase changeset), `com.worshiproom.mute` package with entity, repository, service, controller, exception, and DTOs. Three endpoints under `/api/v1/mutes`. Authenticated via JWT.

2. **Frontend:** new `useMutes` hook (similar shape to `useFriends.blocked`), `wr_mutes` localStorage key for the local mute list, `mutes-storage.ts` service, `mutes-api.ts` API client, dual-write to backend behind a new `VITE_USE_BACKEND_MUTES` env flag.

3. **UI:** Mute/Unmute action in `FriendMenu` (alongside Remove Friend / Block), Settings → Privacy → "Muted Users" list (mirrors Blocked Users list shape), ConfirmDialog confirmations for both actions.

4. **Read filter integration:** `useMutes.muted` exposed but **NO existing feed currently consumes it**. Phase 3 (Prayer Wall Backend) will integrate the filter when feed reads land. This spec ships the data plumbing; the filter consumer arrives in Phase 3.

After this spec ships, Phase 2.5 fully closes (8/8 specs).

---

## What Mute Means (vs Block)

Per master plan: **mute is the asymmetric, softer version of block.** Critical semantics:

| Behavior | Block | Mute |
|---|---|---|
| Muter/blocker hides target's content | ✅ | ✅ |
| Target hidden from muter/blocker in lists/search | ✅ | ❌ (target still sees muter normally) |
| Existing friendship terminated | ✅ | ❌ |
| Pending friend requests deleted | ✅ | ❌ |
| Future friend requests blocked | ✅ | ❌ |
| Encouragements/nudges blocked | ✅ | ❌ |
| Notifications about target suppressed | ✅ | partial (target's posts hidden from feed; mentions/replies still notify) |
| Reversible | ✅ | ✅ |

Mute is asymmetric and feed-scoped. The muted user doesn't know they're muted. The muter still gets notifications about the muted user's interactions with the muter's own content (replies to my comment, reactions to my post) — only feed posts/discovery surfaces are filtered.

---

## Master Plan Divergence

Three divergences worth flagging.

### Divergence 1: Mute is its own table, not a status on `friend_relationships`

**What the master plan says:** Spec 2.5.7 stub specifies new `user_mutes` table with columns `(muter_id, muted_id, created_at)`.

**What this brief says:** Following master plan exactly. Mute does NOT extend `friend_relationships.status` enum (which is `'active' | 'blocked'` per Decision 8) to add `'muted'`. The reasons matter:

- **Friend relationships are mutual; mutes are unilateral.** Adding `'muted'` to a mutual table would require duplicate row maintenance with confusing semantics ("does muting A→B require also writing B→A as muted?" — no, but the schema would suggest yes by analogy with friendship).
- **Block already uses `friend_relationships` with `status='blocked'`** because block IS adjacent to friendship semantically (it terminates one). Mute is orthogonal — you can mute someone you've never been friends with, who you're currently friends with, who you previously blocked, etc.
- **Future feed-filter performance** — querying "is this poster muted by viewer?" against a focused `user_mutes` table is faster and clearer than against `friend_relationships` with a status enum filter.

**Why mention this:** CC's recon may pattern-match against block (in `friend_relationships`) and propose extending the status enum. Push back — master plan is correct.

### Divergence 2: Endpoints under `/api/v1/mutes`, NOT `/api/v1/users/me/mutes`

**What the master plan says:** Spec 2.5.7 stub says "Endpoints: POST/DELETE/GET `/api/v1/mutes`."

**What this brief says:** Following master plan exactly. Three endpoints:
- `POST /api/v1/mutes` — body `{ userId }` — mute a user
- `DELETE /api/v1/mutes/{userId}` — unmute a user
- `GET /api/v1/mutes` — list users I've muted

**Why mention this:** Spec 2.5.3 placed friends/blocks endpoints under `/api/v1/users/me/...` (per its Divergence 5). The master plan's choice of `/api/v1/mutes` (without the `users/me` prefix) is mildly inconsistent with the friends/blocks namespace — but it's what the master plan says, and changing it now creates a divergence FROM the master plan that future-Eric won't expect. Honor the master plan.

If recon argues for `/api/v1/users/me/mutes` for consistency with blocks — push back. Spec 2.5.3's Divergence 5 was about write-only endpoints under `/api/v1/social/...` (which mutes resemble more than friends-relationship endpoints). The `/api/v1/mutes` namespace fits the pattern.

### Divergence 3: Read filter integration deferred to Phase 3

**What the master plan says:** Stub says "Only filters feed reads."

**What this brief says:** This spec ships the data layer (table + endpoints + frontend hook + UI surfaces) but does NOT integrate the filter into any read path. Reason: there's no real feed read path to filter today. Prayer Wall feed currently reads from mock data (`wr_prayer_wall` localStorage); Phase 3 (Prayer Wall Backend, 12 specs) replaces this with backend reads. The filter integration belongs in Phase 3 — specifically Spec 3.3 (Posts Read Endpoints) on the backend side and Spec 3.10 (Frontend Service API Implementations) on the frontend side.

**Why:** Adding a mock-data filter now creates throwaway code that Phase 3 deletes. The mute data layer ships now (so Phase 3 has the data to filter on), but the filter consumer waits until there's a real feed.

**Followup entry** to add to `_plans/post-1.10-followups.md`:
> "Mute filter integration in Prayer Wall feed reads. Owner: Phase 3 specs 3.3 (backend) + 3.10 (frontend). Verifies: muted users' posts excluded from `GET /api/v1/feed` response; muted users' presence excluded from active-now indicators; muted users' reactions still appear on the muter's posts (asymmetric semantic preserved)."

---

## Backend Deliverables

### Liquibase changeset: `2026-04-27-013-create-user-mutes-table.xml`

```sql
CREATE TABLE user_mutes (
  muter_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  muted_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  PRIMARY KEY (muter_id, muted_id),
  CONSTRAINT user_mutes_no_self_mute CHECK (muter_id <> muted_id)
);

CREATE INDEX idx_user_mutes_muter ON user_mutes (muter_id, created_at DESC);
```

Composite PK on `(muter_id, muted_id)` makes the "is X muted by Y?" query a primary-key lookup. Secondary index supports "list my mutes" ordered by recency.

**No `reason_text` column** — master plan stub doesn't include it (block doesn't have one either; mute is even softer so even less need to capture rationale). If a future spec wants annotated mutes, add the column then.

**FK CASCADE** on both columns per `05-database.md`'s mandatory rule.

### Package: `com.worshiproom.mute`

```
backend/src/main/java/com/worshiproom/mute/UserMute.java                       (entity, composite PK via @IdClass)
backend/src/main/java/com/worshiproom/mute/UserMuteId.java                     (composite PK class, mirrors FriendRelationshipId)
backend/src/main/java/com/worshiproom/mute/UserMuteRepository.java
backend/src/main/java/com/worshiproom/mute/MuteService.java
backend/src/main/java/com/worshiproom/mute/MuteController.java
backend/src/main/java/com/worshiproom/mute/MuteException.java                  (abstract base)
backend/src/main/java/com/worshiproom/mute/SelfActionException.java            (or reuse from friends — see Watch-For #5)
backend/src/main/java/com/worshiproom/mute/UserNotFoundException.java          (or reuse — see Watch-For #5)
backend/src/main/java/com/worshiproom/mute/AlreadyMutedException.java          (409 — idempotent alternative; see Watch-For #6)
backend/src/main/java/com/worshiproom/mute/NotMutedException.java              (404)
backend/src/main/java/com/worshiproom/mute/MuteExceptionHandler.java
backend/src/main/java/com/worshiproom/mute/MuteValidationExceptionHandler.java
backend/src/main/java/com/worshiproom/mute/dto/MuteUserRequest.java            ({ @NotNull UUID userId })
backend/src/main/java/com/worshiproom/mute/dto/MutedUserDto.java               ({ userId, displayName, avatarUrl, mutedAt })
```

### `MuteService` operations

```java
@Transactional
public void muteUser(UUID muterId, UUID mutedId) {
  // 1. SelfActionException if muterId == mutedId
  // 2. UserNotFoundException if mutedId doesn't exist or is deleted/banned
  // 3. Idempotent: if (muterId, mutedId) row already exists, return without error (or throw AlreadyMutedException — see Watch-For #6)
  // 4. INSERT new UserMute row
}

@Transactional
public void unmuteUser(UUID muterId, UUID mutedId) {
  // 1. SelfActionException if muterId == mutedId
  // 2. NotMutedException if no row exists for (muterId, mutedId)
  // 3. DELETE the row
}

@Transactional(readOnly = true)
public List<MutedUserDto> listMutedUsers(UUID muterId) {
  // Native query joining user_mutes with users to get displayName + avatarUrl
  // Order by created_at DESC
  // Filter: deleted users excluded? — recon decides; defensive default = include them so the muter can still see and unmute
}

public boolean isMuted(UUID muterId, UUID mutedId) {
  return userMuteRepository.existsById(new UserMuteId(muterId, mutedId));
}
```

The `isMuted(UUID, UUID)` method is the contract Phase 3 will consume from `FeedService` — that's why this method exists today even though no consumer fires it yet.

### Endpoints

#### `POST /api/v1/mutes`

- **Body:** `MuteUserRequest { @NotNull UUID userId }`
- **Service call:** `muteService.muteUser(principal.userId(), userId)`
- **Auth:** JWT required
- **Response:** 201 `ProxyResponse<{ mutedUserId: UUID, mutedAt: ISO8601 }>`

#### `DELETE /api/v1/mutes/{userId}`

- **Path param:** `userId` UUID
- **Service call:** `muteService.unmuteUser(principal.userId(), userId)`
- **Auth:** JWT required
- **Response:** 204 No Content

#### `GET /api/v1/mutes`

- **Service call:** `muteService.listMutedUsers(principal.userId())`
- **Auth:** JWT required
- **Response:** 200 `ProxyResponse<List<MutedUserDto>>` — empty array if no mutes

### Exception → HTTP code mapping

| Exception | HTTP | Code |
|---|---|---|
| `SelfActionException` | 400 | `SELF_ACTION_FORBIDDEN` |
| `UserNotFoundException` | 404 | `USER_NOT_FOUND` |
| `AlreadyMutedException` (if used) | 409 | `ALREADY_MUTED` |
| `NotMutedException` | 404 | `NOT_MUTED` |

`MuteExceptionHandler` is package-scoped to `com.worshiproom.mute`. Same shape as `FriendsExceptionHandler` — copy the structure.

### Tests

- `MuteServiceTest` (8–10 tests): muteUser happy path, self-mute rejected, target user not found, idempotency on double-mute, unmuteUser happy path, unmute when not muted, listMutedUsers empty, listMutedUsers populated with correct display names, FK CASCADE verification on user delete, isMuted query
- `MuteControllerIntegrationTest` (6–8 tests): POST/DELETE/GET endpoints, 401 without JWT, validation errors, exception → HTTP code mapping

Use `AbstractIntegrationTest` for controller tests, `AbstractDataJpaTest` for service-layer tests.

### OpenAPI updates

Three new path entries (`/api/v1/mutes` POST + GET, `/api/v1/mutes/{userId}` DELETE). Two new schemas (`MuteUserRequest`, `MutedUserDto`). Lint with `npx @redocly/cli lint`.

---

## Frontend Deliverables

### `wr_mutes` localStorage key

New top-level localStorage key. Shape:

```typescript
interface MutesData {
  muted: string[]  // array of muted user IDs (no display names — looked up via ALL_MOCK_USERS or backend)
}
```

Storage key constant `MUTES_KEY = 'wr_mutes'` in `mutes-storage.ts`. Default empty data: `{ muted: [] }`.

**Why a separate key, not folded into `wr_friends.blocked`:** mute is orthogonal to friends domain. Nesting it under friends would conflate concerns. Separate file = separate concern.

### `mutes-storage.ts`

Pattern matches `friends-storage.ts`:

```typescript
export const MUTES_KEY = 'wr_mutes'

export const EMPTY_MUTES_DATA: MutesData = { muted: [] }

export function getMutesData(): MutesData { /* with try/catch + shape validation */ }

export function saveMutesData(data: MutesData): boolean { /* with try/catch */ }

export function muteUser(data: MutesData, userId: string): MutesData {
  return data.muted.includes(userId)
    ? data
    : { ...data, muted: [...data.muted, userId] }
}

export function unmuteUser(data: MutesData, userId: string): MutesData {
  return { ...data, muted: data.muted.filter((id) => id !== userId) }
}

export function isMuted(data: MutesData, userId: string): boolean {
  return data.muted.includes(userId)
}
```

### `mutes-api.ts`

```typescript
export async function muteUserApi(userId: string): Promise<{ mutedUserId: string; mutedAt: string }> {
  return apiFetch('/api/v1/mutes', {
    method: 'POST',
    body: JSON.stringify({ userId }),
  })
}

export async function unmuteUserApi(userId: string): Promise<void> {
  await apiFetch<void>(`/api/v1/mutes/${userId}`, { method: 'DELETE' })
}

export async function listMutedUsersApi(): Promise<MutedUserApiResponse[]> {
  return apiFetch('/api/v1/mutes', { method: 'GET' })
}
```

`listMutedUsersApi` ships but isn't consumed by any UI in this spec — it's there for future Phase 3 work that will reconcile localStorage `wr_mutes.muted` against backend truth.

### `useMutes` hook

```typescript
export function useMutes(): {
  muted: string[]
  isMuted: (userId: string) => boolean
  muteUser: (userId: string) => void
  unmuteUser: (userId: string) => void
} {
  const { isAuthenticated } = useAuth()
  const [data, setData] = useState<MutesData>(() => {
    if (!isAuthenticated) return EMPTY_MUTES_DATA
    return getMutesData()
  })

  const persist = useCallback((newData: MutesData) => {
    setData(newData)
    saveMutesData(newData)
  }, [])

  const mute = useCallback((userId: string) => {
    if (!isAuthenticated) return
    persist(storageMuteUser(data, userId))
    if (shouldDualWriteMutes()) {
      muteUserApi(userId).catch((err) =>
        console.warn('[useMutes] backend muteUser dual-write failed:', err)
      )
    }
  }, [isAuthenticated, data, persist])

  const unmute = useCallback((userId: string) => {
    if (!isAuthenticated) return
    persist(storageUnmuteUser(data, userId))
    if (shouldDualWriteMutes()) {
      unmuteUserApi(userId).catch((err) =>
        console.warn('[useMutes] backend unmuteUser dual-write failed:', err)
      )
    }
  }, [isAuthenticated, data, persist])

  const isMutedFn = useCallback((userId: string) => storageIsMuted(data, userId), [data])

  return { muted: data.muted, isMuted: isMutedFn, muteUser: mute, unmuteUser: unmute }
}

function shouldDualWriteMutes(): boolean {
  return isBackendMutesEnabled() && getStoredToken() !== null
}
```

### Env flag

`VITE_USE_BACKEND_MUTES=false` added to `.env.example` (defaulting OFF — not part of Phase 2.5 cutover; flag flips in a one-line followup commit after this spec ships, OR ships with a default of `true` since the wave is post-cutover; recon decides per the pattern from 2.5.5).

**Recommendation:** ship default `false` in `.env.example`, with a comment noting that Phase 2.5 cutover already happened for friends/social and this flag follows the same pattern (manual flip when comfortable). The followup task to flip is a 30-second one-liner.

`isBackendMutesEnabled()` in `lib/env.ts` mirrors `isBackendActivityEnabled()` exactly. Strict `=== 'true'` comparison.

### UI surfaces

#### 1. `FriendMenu.tsx` — add Mute action

Currently has Remove Friend + Block. Add Mute as a third option (between Remove and Block). Same ConfirmDialog pattern from Spec 2.5.6.

**Mute confirmation copy:**
- Title: `Mute {displayName}?`
- Body: `Their posts won't appear in your feed. They won't know you've muted them. You can unmute anytime in Settings → Privacy.`
- Confirm button: `Mute`
- Cancel button: `Cancel`
- Variant: `subtle` (NOT `destructive` — mute is gentler than block/remove)

The "subtle" variant may not exist in Spec 1.9b's ConfirmDialog primitive yet. If not: use `default` variant (no destructive red styling). Recon should verify the available variants and match.

#### 2. `Settings.tsx` → Privacy section — add "Muted Users" list

Mirrors the Blocked Users list shape from Spec 2.5.6. Reads from `useMutes.muted`. Each entry shows display name (looked up via `ALL_MOCK_USERS` per existing pattern) + Unmute button. Unmute opens ConfirmDialog:

- Title: `Unmute {displayName}?`
- Body: `Their posts will appear in your feed again.`
- Confirm: `Unmute`
- Cancel: `Cancel`
- Variant: `default`

Empty state: `You haven't muted anyone.`

The Muted Users section sits AFTER the Blocked Users section in PrivacySection (visual order: stronger destructive actions higher; mute is below block).

#### 3. `useFriends` interaction

`useFriends` does NOT need to know about mutes. The two hooks are independent. Settings page calls both `useFriends` (for blocked list) and `useMutes` (for muted list).

**Watch-For #4 below:** PrivacySection needs to import both hooks. Don't conflate them.

### Tests

- `mutes-storage.test.ts` (4–5 tests): get/save round-trip, mute/unmute pure ops, idempotency, isMuted lookup, corrupt-data fallback
- `mutes-api.test.ts` (3–4 tests): each API function with success + 4xx + network error
- `useMutes.test.tsx` (6–8 tests): flag-on/flag-off matrix for mute/unmute, simulated-auth gate, backend error swallowed, multiple-mute idempotency
- `FriendMenu.test.tsx` updates (2–3 new tests): Mute button opens ConfirmDialog, confirm fires callback, cancel does nothing
- `PrivacySection.test.tsx` updates (3–4 new tests): Muted Users section renders from `useMutes.muted`, empty state, Unmute opens ConfirmDialog with correct copy

Total **~22–28 frontend tests** + **~14–18 backend tests** = ~40 tests. S-sized spec target is 5–15 tests per `06-testing.md`, but this spec spans backend + frontend + 3 UI surfaces; the count overshoots the size label. That's fine — size labels are heuristic, not contract. If CC's plan proposes 60+, push back.

---

## Files to Create

### Backend
```
backend/src/main/resources/db/changelog/2026-04-27-013-create-user-mutes-table.xml

backend/src/main/java/com/worshiproom/mute/
  UserMute.java
  UserMuteId.java
  UserMuteRepository.java
  MuteService.java
  MuteController.java
  MuteException.java
  SelfActionException.java        (OR reuse — see Watch-For #5)
  UserNotFoundException.java      (OR reuse — see Watch-For #5)
  AlreadyMutedException.java      (IF using non-idempotent semantics — see Watch-For #6)
  NotMutedException.java
  MuteExceptionHandler.java
  MuteValidationExceptionHandler.java
  dto/MuteUserRequest.java
  dto/MutedUserDto.java

backend/src/test/java/com/worshiproom/mute/
  MuteServiceTest.java
  MuteControllerIntegrationTest.java
```

### Frontend
```
frontend/src/services/mutes-storage.ts
frontend/src/services/api/mutes-api.ts
frontend/src/hooks/useMutes.ts

frontend/src/services/__tests__/mutes-storage.test.ts
frontend/src/services/api/__tests__/mutes-api.test.ts
frontend/src/hooks/__tests__/useMutes.test.tsx
```

## Files to Modify

### Backend
```
backend/src/main/resources/db/changelog/master.xml
  — append <include> for changeset 2026-04-27-013
backend/src/main/resources/openapi.yaml
  — add 3 paths + 2 schemas
```

### Frontend
```
frontend/src/types/dashboard.ts
  — add MutesData interface

frontend/src/lib/env.ts
  — add isBackendMutesEnabled()

frontend/.env.example
  — add VITE_USE_BACKEND_MUTES=false with comment block

frontend/src/components/friends/FriendMenu.tsx
  — add Mute menu item between Remove and Block
  — add ConfirmDialog state for mute action with copy from spec body

frontend/src/components/settings/PrivacySection.tsx
  — add Muted Users section after Blocked Users
  — read from useMutes
  — Unmute action with ConfirmDialog

frontend/src/components/friends/__tests__/FriendMenu.test.tsx
  — add Mute action coverage (2-3 tests)

frontend/src/components/settings/__tests__/PrivacySection.test.tsx
  — add Muted Users section coverage (3-4 tests)
```

## Files NOT to Modify

- `backend/src/main/java/com/worshiproom/friends/**` — friends domain unchanged
- `backend/src/main/java/com/worshiproom/social/**` — social domain unchanged
- `backend/src/main/java/com/worshiproom/auth/PublicPaths.java` — all 3 mute endpoints require auth
- Any feed-read code — read filter integration deferred to Phase 3 per Divergence 3
- `frontend/src/hooks/useFriends.ts` — friends hook unchanged; mute is a separate concern
- `frontend/src/services/friends-storage.ts` — friends storage unchanged

## Files to Delete

None.

---

## Acceptance Criteria

### Backend — schema and endpoints

- [ ] `user_mutes` table created via Liquibase changeset 2026-04-27-013
- [ ] Composite PK on `(muter_id, muted_id)`
- [ ] CHECK constraint `user_mutes_no_self_mute` rejects self-mute attempts at DB level
- [ ] FK CASCADE on both columns to `users(id)` — verified by deleting a user and observing both their muter and muted rows vanish
- [ ] Secondary index `idx_user_mutes_muter` on `(muter_id, created_at DESC)`
- [ ] `POST /api/v1/mutes` returns 201 with valid body and JWT
- [ ] `POST /api/v1/mutes` returns 400 SELF_ACTION_FORBIDDEN when `userId == principal.userId()`
- [ ] `POST /api/v1/mutes` returns 404 USER_NOT_FOUND when target user doesn't exist or is deleted/banned
- [ ] `POST /api/v1/mutes` is idempotent: second mute of same user returns 201 without duplicate row creation (OR returns 409 ALREADY_MUTED — recon picks per Watch-For #6)
- [ ] `DELETE /api/v1/mutes/{userId}` returns 204 with valid JWT and existing mute
- [ ] `DELETE /api/v1/mutes/{userId}` returns 404 NOT_MUTED when no mute exists
- [ ] `GET /api/v1/mutes` returns 200 with empty array when no mutes
- [ ] `GET /api/v1/mutes` returns 200 with populated array; entries include displayName and avatarUrl from joined `users` table
- [ ] All 3 endpoints return 401 without JWT
- [ ] OpenAPI spec includes 3 new paths and 2 new schemas; `npx @redocly/cli lint` passes

### Frontend — hook and storage

- [ ] `useMutes` hook returns `muted: string[]`, `isMuted(id) => boolean`, `muteUser(id) => void`, `unmuteUser(id) => void`
- [ ] `muteUser` updates `wr_mutes.muted` array idempotently (no duplicates)
- [ ] `unmuteUser` removes the user from `wr_mutes.muted`
- [ ] Flag-off → no backend API call fires from `muteUser` or `unmuteUser`
- [ ] Flag-on AND JWT present → `muteUser` fires `POST /api/v1/mutes` with `{userId}`
- [ ] Flag-on AND JWT present → `unmuteUser` fires `DELETE /api/v1/mutes/{userId}`
- [ ] Backend error during dual-write swallowed; localStorage state still updates; `console.warn` logged with prefix `[useMutes] backend ... dual-write failed:`
- [ ] Simulated-auth (no JWT) → no backend call even when flag on (per `shouldDualWriteMutes` guard)
- [ ] `wr_mutes` localStorage key shape validated on read with try/catch fallback to `EMPTY_MUTES_DATA`

### UI

- [ ] `FriendMenu` shows three options: Remove Friend, Mute, Block (in that order)
- [ ] Mute click opens ConfirmDialog with title "Mute {displayName}?" and body copy specified above
- [ ] Confirm fires `useMutes.muteUser`; cancel closes dialog without action
- [ ] `PrivacySection` shows Muted Users section AFTER Blocked Users section
- [ ] Empty state: "You haven't muted anyone."
- [ ] Each entry shows display name (via `ALL_MOCK_USERS` lookup) + Unmute button
- [ ] Unmute opens ConfirmDialog with title "Unmute {displayName}?" and body "Their posts will appear in your feed again."
- [ ] Mute and Unmute confirmations use `default` (or `subtle`) variant — NOT `destructive`
- [ ] No `window.confirm()` calls in any modified file

### Env flag

- [ ] `VITE_USE_BACKEND_MUTES` added to `.env.example` with comment block matching existing flag pattern
- [ ] `isBackendMutesEnabled()` in `env.ts` uses strict `=== 'true'` comparison
- [ ] Default value `false` (manual flip after spec ships)

### Test count target

S-sized → 5–15 tests per `06-testing.md`. This spec spans backend + frontend + 3 UI surfaces, so the count naturally overshoots. Target ~40 tests total (~14–18 backend, ~22–28 frontend). If CC's plan proposes 60+, push back.

---

## What to Watch For in CC's Spec Output

1. **Don't extend `friend_relationships.status` to add `'muted'`.** Per Divergence 1, mute is its own table. If CC's recon proposes adding to the existing enum, push back hard — the master plan is explicit.

2. **Endpoints are `/api/v1/mutes`, not `/api/v1/users/me/mutes`.** Per Divergence 2 and master plan stub. If CC's recon proposes consistency with friends/blocks namespace, the master plan wins.

3. **No feed-filter integration in this spec.** Per Divergence 3. If CC's plan proposes touching any read code (FeedService, prayer wall storage, etc.) to apply mute filtering, push back — that's Phase 3 territory. The `isMuted()` service method exists for future consumers but has no caller in this spec.

4. **`useFriends` and `useMutes` are independent.** Don't merge them. Don't have one call the other. Settings page imports both. FriendMenu component imports `useMutes` independently of its existing `useFriends` consumer (or threads `onMute` through props from the parent — recon picks the simpler approach, mirrors the `onBlock` pattern).

5. **Reuse `SelfActionException` and `UserNotFoundException` from `com.worshiproom.friends`** if their HTTP code + error code match what mute needs (and they do — both 400 SELF_ACTION_FORBIDDEN and 404 USER_NOT_FOUND match). Don't create duplicates. Pattern from Spec 2.5.4b. If the exception classes don't expose what mute needs (e.g., constructor signature mismatch), THEN create mute-package versions — but verify before duplicating.

6. **Mute idempotency: pick one semantic.** Two valid options:
   - **Idempotent silent return** (recommended): muting an already-muted user returns 201 with the existing row's data. Simpler for clients (no special-case handling).
   - **AlreadyMutedException 409**: stricter; client must catch.
   Both are defensible. Master plan stub doesn't specify. Recon picks; document the choice in the service Javadoc and the test name. Recommendation: go idempotent for parity with how `blockUser` was specified in 2.5.2 (which is also idempotent on already-blocked).

7. **`MutedUserDto` join performance.** `listMutedUsers` joins `user_mutes` with `users`. For users who've muted hundreds of people (unlikely but possible), this is a fast index-driven query. If recon proposes pagination, push back — premature optimization. Add pagination when there's a real user with 1000+ mutes (which won't happen).

8. **No backend rate limiting in this spec.** Per the same pattern as friends endpoints (Spec 2.5.3 Divergence 1) — defer to Phase 10.9. If CC proposes a rate limit on mute, push back; followup entry in `_plans/post-1.10-followups.md`.

9. **The `subtle` ConfirmDialog variant** may not exist. Recon should check Spec 1.9b's ConfirmDialog component (created in 2.5.6 if it didn't already exist). Fallback: use `default` variant (no destructive red styling). Don't introduce a new variant just for mute.

10. **Mute confirmation copy clarifies asymmetry.** "They won't know you've muted them" is load-bearing. Don't soften to "It will be quiet." Users deserve to understand the privacy semantics.

11. **Unmute confirmation copy is brief.** Mute is the harder decision; unmute is recoverable. Don't pad the copy. "Their posts will appear in your feed again." is enough.

12. **`MutesData` is a top-level localStorage key, NOT nested under `wr_friends` or `wr_settings`.** Discrete concern, discrete file. Don't let CC propose nesting for "consistency."

13. **No display-name field in `wr_mutes`.** The localStorage stores user IDs only (matching `wr_friends.blocked` pattern). Display names come from `ALL_MOCK_USERS` lookup at render time. When backend reads land in Phase 3+, this lookup gets replaced with backend `GET /api/v1/users/{id}` calls — out of scope here.

14. **Single quotes** for all shell snippets, file paths, fixture strings.

---

## Out of Scope

- Filtering feed reads by mute (deferred to Phase 3 per Divergence 3)
- Filtering search results by mute (Phase 11+ search territory)
- Filtering presence/active-now indicators by mute (Phase 6.11b live presence territory)
- Filtering notifications by mute (Phase 12 notification system territory; partial filter at most — direct mentions/replies should still notify)
- Mute reasons/notes (master plan stub doesn't include; future spec if needed)
- Per-feature mute granularity (e.g., "mute their posts but not their comments") — out of scope; all-or-nothing for MVP
- Time-bounded mute (e.g., "mute for 7 days then auto-unmute") — out of scope
- Mass mute / mute-from-list — out of scope
- Mute analytics ("you've muted X people this month") — out of scope (and mildly anti-pattern)
- Suggested mute candidates — out of scope (and probably anti-pattern)
- Backend rate limiting on mute endpoints (defer to Phase 10.9 per Watch-For #8)
- Promoting backend reads to source-of-truth for mutes (future wave when feed reads land)
- Migration of any existing localStorage mute data (none exists; greenfield)
- Cross-device mute sync via push (Phase 12 territory; for now, mutes sync via dual-write but require app reload)
- Showing the muter who's muted them (privacy violation; explicitly never)
- Notifying the muted user (privacy violation; explicitly never)

---

## Out-of-Band Notes for Eric

- This is the smallest spec of Phase 2.5 by design. S-sized, Low risk, greenfield. Should execute in 1 session.
- Phase 2.5 fully closes when this ships. CLAUDE.md gets a Phase 2.5 summary in a hygiene update afterward (not in this spec — wave-close cleanup is its own concern).
- The `isMuted()` service method on the backend has no caller today, but Phase 3's Spec 3.3 (Posts Read Endpoints) and Phase 3.10 (Frontend Service API Implementations) will both consume it. The followup entry in `_plans/post-1.10-followups.md` flags this so Phase 3 specs don't miss it.
- The `VITE_USE_BACKEND_MUTES` flag follows the same lifecycle as the others — defaults `false` in `.env.example` for MVP, manual flip when comfortable. Could be flipped to `true` immediately after this spec ships; the manual smoke test (mute → backend row appears, unmute → row deleted) is straightforward.
- If recon discovers a different pattern for ConfirmDialog variants than what 2.5.6 established, defer to that pattern. The brief's `subtle` variant suggestion is illustrative; the actual variant naming follows whatever 2.5.6 shipped.
- No drift detection test for mute (analogous to Phase 2's Spec 2.8 for activity). Mute logic is too thin to drift; the schema is small, the operations are CRUD, and there's no shared computation between frontend and backend that could diverge. If Phase 3+ adds derived state (e.g., "muted user count badge"), drift detection becomes worth considering.
- xHigh thinking is appropriate. Pattern-matching against block (Spec 2.5.6), CRUD, no deep reasoning. MAX would be over-spending.
- Spec tracker after 2.5.7 ships: `2.5.7 ✅`, **Phase 2.5 progress 8/8 — COMPLETE**.
- **Next phase: Phase 3 — Prayer Wall Backend (12 specs).** Different shape entirely from Phase 2.5 — wider, deeper, more architecturally consequential. Spec 3.1 (Prayer Wall Schema) is the next brief. The XL/High specs you flagged earlier (3.5 Posts Write, 3.10 Frontend Service API) live in this phase. I'll draft 3.1 when 2.5.7 closes review and you give the signal.
