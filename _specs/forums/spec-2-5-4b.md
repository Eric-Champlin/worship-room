# Forums Wave: Spec 2.5.4b — Social Interactions and Milestone Events Dual-Write (Backend + Frontend)

**Master Plan Reference:** `_forums_master_plan/round3-master-plan.md` → Decision 8 (lines 1131–1196), Spec 2.5.4b body (lines 3367–3471)
**Branch:** `forums-wave-continued` (stay on this branch — no per-spec sub-branch)
**Date:** 2026-04-27

---

## Affected Frontend Routes

N/A for visible UI — this is a hybrid backend + frontend dual-write spec, but no user-visible UI changes ship. The new flag (`VITE_USE_BACKEND_SOCIAL`) defaults to `false`, so behavior is byte-identical on every route that consumes `useSocialInteractions`. Routes that consume the hook (and would exercise the flag-on dual-write path during the Spec 2.5.5 cutover smoke test):

- `/` — Dashboard `dismissRecap()` via `useWeeklyRecap` (recap card dismiss button)
- `/friends` — `EncourageButton` and `NudgeButton` inside the Friends list and Leaderboard tabs (`FriendRow`, `LeaderboardRow`)
- `/profile/:userId` — `GrowthProfile` page invokes `sendEncouragement` and `sendNudge` directly

When the flag is flipped on locally for smoke-testing (Spec 2.5.5 owns the cutover), the backend dispatch is silent — no toast, no banner, no error surface, no UI affordance. Mirrors the Spec 2.5.4 friends dual-write pattern exactly. `/verify-with-playwright` is therefore skipped for this spec.

The milestone-emission half of this spec is purely backend (`ActivityService` and `FriendsService` gain transparent `MilestoneEventsService.recordEvent(...)` calls). Zero new frontend behavior surrounds it — `useFaithPoints` continues to write `wr_milestone_feed` locally exactly as before, and no frontend POST fires.

---

## Spec Header

- **Spec ID:** `round3-phase02-5-spec04b-social-milestone-dual-write`
- **Branch:** `forums-wave-continued` (Eric's long-lived branch — DO NOT create a new branch, DO NOT checkout, DO NOT commit/push)
- **Prereqs:** 2.5.1 ✅ (tables shipped), 2.5.2 ✅, 2.5.3 ✅, 2.5.4 ✅ (dual-write pattern + env flag pattern established)
- **Size:** M
- **Risk:** Medium (creates new backend package + endpoints AND wires frontend dual-write in one spec; 5 endpoints; milestone event emission points need recon)
- **Phase:** 2.5 — Friends + Social Migration (Dual-Write)
- **Fifth spec of Phase 2.5.** First (and only) spec in Phase 2.5 that ships both new backend endpoints AND frontend dual-write together. Specs 2.5.5 (cutover), 2.5.6 (block UX), 2.5.7 (mute UX) layer on top.

---

## STAY ON BRANCH

Same as the rest of Phase 2.5. Stay on `forums-wave-continued`. No `git checkout`, `git branch`, `git commit`, `git push`, `git stash`, `git reset`. Eric handles git manually.

---

## Goal

This spec is the unique one in Phase 2.5 — it ships **both** new backend endpoints AND the frontend dual-write in one spec, because `social_interactions` and `milestone_events` had no API surface before this spec. (Spec 2.5.3 covered friends only; this spec covers the social/milestone domain.)

Three deliverables:

1. **Backend `com.worshiproom.social` package** — entities for `SocialInteraction` and `MilestoneEvent`, repositories, two services (`SocialInteractionsService` and `MilestoneEventsService`), controllers exposing 5 endpoints, package-scoped exception advice, OpenAPI updates.

2. **Frontend dual-write wiring** — `useSocialInteractions` hook fires backend writes alongside the existing localStorage writes for the three social operations (encouragement, nudge, recap dismissal); milestone-event creation paths (currently embedded in `useFaithPoints` per Spec 2.7's badge flow + level-up + streak milestone logic) fire backend writes alongside the existing `wr_milestone_feed` localStorage write.

3. **Env flag** — new `VITE_USE_BACKEND_SOCIAL` flag mirroring `VITE_USE_BACKEND_ACTIVITY` and `VITE_USE_BACKEND_FRIENDS`. Default false. Same pattern, same fail-closed semantics.

Reads stay localStorage-canonical. Backend is shadow data. Same wave contract as 2.5.4.

---

## Master Plan Divergence

Five divergences worth flagging upfront.

### Divergence 1: Milestone events are EMITTED by backend, not POSTED by frontend

**What the master plan says:** Spec 2.5.4b body lists `POST /api/v1/social/milestone-events` as one of the endpoints to create, suggesting frontend POSTs milestone events.

**What this brief says:** **No `POST /api/v1/social/milestone-events` endpoint exists in this spec.** Milestone events are written to the `milestone_events` table by the backend itself when `POST /api/v1/activity` (Spec 2.6's activity engine) detects a streak milestone, level-up, badge earning, or prayer-count milestone server-side. The activity engine already does this calculation in Java; emitting a `milestone_events` row is a one-line addition inside `ActivityService.recordActivity`.

The frontend dual-write for milestone events is therefore **redundant** — the backend will already have the row by the time the frontend's `addMilestoneToFeed(...)` localStorage write completes. The frontend's `wr_milestone_feed` array stays as the read source for the feed UI; backend `milestone_events` is the canonical record.

EXCEPTION: `friend_milestone` events (Decision 8 lists 5 valid `event_type` values; the 5th is `friend_milestone`). These fire when a user's friend count crosses thresholds (e.g., "first friend," "10 friends," etc.) — that emission lives in `FriendsService.acceptRequest` and should fire alongside the friend_relationships rows insert. Recon should grep `useFaithPoints` and badge-engine for the existing friend-count milestone logic to determine whether the threshold check already lives backend-side (in `FriendsService`) or frontend-side (in badge-engine.ts). If frontend-only, the threshold check moves to backend; the milestone row fires from `FriendsService.acceptRequest`.

**Why:** Single source of truth. Milestone events are derived signals from existing operations — they aren't user-submitted data. Having the frontend POST them creates a race condition (frontend computes "you leveled up" but backend's view of points hasn't reflected the activity yet) and a duplication concern (both sides compute the same threshold). Backend-side emission inside the existing transactional boundaries is correct.

This divergence collapses the spec from "5 endpoints" to "4 endpoints" and removes ~30% of the frontend dual-write work.

### Divergence 2: Recap dismissal is a no-op endpoint server-side; frontend dual-write is best-effort

**What the master plan says:** Spec 2.5.4b lists `POST /api/v1/social/recap-dismissal` as an endpoint.

**What this brief says:** Endpoint exists and writes a `social_interactions` row with `interaction_type='recap_dismissal'` and `payload={"weekStart": "2026-04-21"}`. Frontend dual-writes when `dismissRecap()` is called. Backend doesn't act on the data — no notifications, no UI suppression, no derived state. The row exists only as historical record and to support future analytics ("how often do users dismiss recaps in the first 24 hours?").

**Why mention this:** Recon may ask whether dismissal data should suppress backend-side notifications. Answer: not in this wave. Frontend `isRecapDismissedThisWeek()` reads localStorage; that contract is unchanged. The backend row is shadow-only.

### Divergence 3: Encouragement rate-limit re-validated server-side

**What the master plan says:** `02-security.md` § Forums Wave Rate Limits lists "Encouragements: 60 per hour per user, Backend." The frontend currently enforces `MAX_ENCOURAGEMENTS_PER_FRIEND_PER_DAY` (constant from `@/constants/dashboard/encouragements`).

**What this brief says:** Backend `SocialInteractionsService.sendEncouragement` re-validates two things:
1. **Per-friend daily cap:** queries `social_interactions WHERE from_user_id=:from AND to_user_id=:to AND interaction_type='encouragement' AND created_at >= start_of_day` and rejects with 429 RATE_LIMITED if count ≥ daily cap.
2. **Per-user hourly cap:** queries the same table for the past hour, all recipients, rejects with 429 if count ≥ 60.

The hourly cap is the abuse-prevention measure (one user can't spam 60 friends in 60 seconds). The per-friend daily cap is the social-friction measure (don't badger one friend with 100 encouragements in a day). Both apply.

**Why:** Frontend rate limit is advisory — the user can clear localStorage and bypass it. Backend enforcement is the real gate. Per `02-security.md`'s pattern of re-validation at the service layer (not the filter layer for this kind of business-rule limit).

The frontend dual-write fires regardless of whether the backend allows or rejects — the localStorage write already happened, and the backend rejection is logged + swallowed like any other dual-write failure. Future cutover spec (post-Phase-2.5) will promote backend to source of truth and switch this to "throw if backend rejects."

### Divergence 4: Nudge cooldown re-validated server-side too

**What the master plan says:** `NUDGE_COOLDOWN_DAYS` constant on the frontend governs cooldown.

**What this brief says:** Backend `SocialInteractionsService.sendNudge` queries `social_interactions WHERE from_user_id=:from AND to_user_id=:to AND interaction_type='nudge' ORDER BY created_at DESC LIMIT 1` and rejects with 409 NUDGE_COOLDOWN if the most recent nudge was within `nudgeCooldownDays`. The cooldown value is a backend constant (`SocialInteractionsService.NUDGE_COOLDOWN_DAYS`) matching the frontend constant. Drift between the two = bug; recon should determine the canonical value (the frontend constant likely is the canonical source today since social interactions are local-first).

Same fail-soft semantic as Divergence 3: backend rejection during dual-write is logged, not surfaced.

### Divergence 5: Endpoint paths under `/api/v1/social/...` not `/api/v1/users/me/...`

**What the master plan says:** Spec 2.5.4b lists endpoints loosely; conventions for path namespace not explicit.

**What this brief says:** Use `/api/v1/social/encouragements`, `/api/v1/social/nudges`, `/api/v1/social/recap-dismissal`. NOT `/api/v1/users/me/social/...`.

**Why:** These resources aren't user-scoped reads (which use `/users/me/...`); they're write-only logs of interactions between users. The `/social/` namespace cleanly groups them. Reading "my received encouragements" or "milestone events for me" — when those endpoints arrive in a future phase — would naturally use `/users/me/encouragements` for the authenticated-user-scoped read view. But during this wave, all five endpoints are write-only from the caller's perspective, and `/social/` is the right namespace.

---

## Backend Deliverables

### New package: `com.worshiproom.social`

Mirrors `com.worshiproom.friends` shape exactly. Files:

```
backend/src/main/java/com/worshiproom/social/SocialInteraction.java                 (entity, mirrors FriendRequest pattern with UUID PK)
backend/src/main/java/com/worshiproom/social/SocialInteractionType.java             (enum: ENCOURAGEMENT, NUDGE, RECAP_DISMISSAL)
backend/src/main/java/com/worshiproom/social/SocialInteractionTypeConverter.java    (mirrors FriendRequestStatusConverter)
backend/src/main/java/com/worshiproom/social/SocialInteractionRepository.java
backend/src/main/java/com/worshiproom/social/SocialInteractionsService.java
backend/src/main/java/com/worshiproom/social/SocialController.java
backend/src/main/java/com/worshiproom/social/SocialException.java                   (abstract base, mirrors FriendsException)
backend/src/main/java/com/worshiproom/social/RateLimitedException.java              (429)
backend/src/main/java/com/worshiproom/social/NudgeCooldownException.java            (409)
backend/src/main/java/com/worshiproom/social/NotFriendsException.java               (403; can't encourage/nudge non-friends; reuse `com.worshiproom.friends.NotFriendsException` if recon confirms HTTP code parity, else create separate)
backend/src/main/java/com/worshiproom/social/SocialExceptionHandler.java
backend/src/main/java/com/worshiproom/social/SocialValidationExceptionHandler.java
backend/src/main/java/com/worshiproom/social/dto/SendEncouragementRequest.java
backend/src/main/java/com/worshiproom/social/dto/SendNudgeRequest.java
backend/src/main/java/com/worshiproom/social/dto/RecapDismissalRequest.java

backend/src/main/java/com/worshiproom/social/MilestoneEvent.java                    (entity for milestone_events; READ-ONLY repository — no controller endpoint creates these in this spec)
backend/src/main/java/com/worshiproom/social/MilestoneEventType.java                (enum: STREAK_MILESTONE, LEVEL_UP, BADGE_EARNED, PRAYER_COUNT_MILESTONE, FRIEND_MILESTONE)
backend/src/main/java/com/worshiproom/social/MilestoneEventTypeConverter.java
backend/src/main/java/com/worshiproom/social/MilestoneEventRepository.java
backend/src/main/java/com/worshiproom/social/MilestoneEventsService.java            (called BY ActivityService and FriendsService; not controller-bound)
```

### Endpoints (4 total per Divergence 1)

#### 1. `POST /api/v1/social/encouragements`

- **Body:** `SendEncouragementRequest { @NotNull UUID toUserId, @NotBlank @Size(max=200) String message }`
- **Service call:** `socialInteractionsService.sendEncouragement(principal.userId(), toUserId, message)`
- **Validation order in service:**
  1. `from != to` else `SelfActionException`
  2. Target user exists, not deleted, not banned else `UserNotFoundException`
  3. `friendRelationshipRepo.existsByUserIdAndFriendUserIdAndStatus(from, to, ACTIVE)` else `NotFriendsException` (403; reuse from friends package, see file list above)
  4. Hourly count from sender < 60 else `RateLimitedException` (429)
  5. Per-friend daily count < cap else `RateLimitedException` (429)
  6. Insert SocialInteraction with `interaction_type='encouragement'`, `payload={"message": "..."}`
- **Response:** 201 `ProxyResponse<{ id, createdAt }>`

#### 2. `POST /api/v1/social/nudges`

- **Body:** `SendNudgeRequest { @NotNull UUID toUserId }`
- **Service call:** `socialInteractionsService.sendNudge(principal.userId(), toUserId)`
- **Validation order:**
  1. `from != to` else `SelfActionException`
  2. Target user exists, not deleted, not banned else `UserNotFoundException`
  3. Friendship exists else `NotFriendsException` (403)
  4. Cooldown not active else `NudgeCooldownException` (409)
  5. Hourly count from sender < 60 (nudges share the hourly cap with encouragements, OR have their own; recon resolves via `02-security.md` reading)
  6. Insert SocialInteraction with `interaction_type='nudge'`, `payload=null` (or empty object)
- **Response:** 201 `ProxyResponse<{ id, createdAt }>`

#### 3. `POST /api/v1/social/recap-dismissal`

- **Body:** `RecapDismissalRequest { @NotBlank @Pattern(regexp="\\d{4}-\\d{2}-\\d{2}") String weekStart }`
- **Service call:** `socialInteractionsService.dismissRecap(principal.userId(), weekStart)`
- **Validation:**
  1. `weekStart` parses as ISO date else `InvalidInputException`
  2. (No friend-relationship check; this is a self-action)
  3. Insert SocialInteraction with `interaction_type='recap_dismissal'`, `payload={"weekStart": "2026-04-21"}`, `to_user_id = from_user_id` (self-row; the `to` column isn't meaningful here but the schema requires it NOT NULL — same row uses sender for both columns)
- **Response:** 201 `ProxyResponse<{ id, createdAt }>`

**Schema note:** `social_interactions.to_user_id` is `NOT NULL` per Spec 2.5.1's changeset. For recap dismissal, the `to_user_id` field is set to the same value as `from_user_id` (self). This is mildly awkward but avoids a schema migration. Document in the service Javadoc. Alternative would be making `to_user_id` nullable in a follow-up changeset, but that's out of scope here.

#### 4. (Implicit) `MilestoneEventsService.recordEvent(...)` callable from `ActivityService` and `FriendsService`

Not a controller endpoint. Service method:

```java
public void recordEvent(UUID userId, MilestoneEventType type, Map<String, Object> metadata) {
  MilestoneEvent event = new MilestoneEvent(userId, type, metadata);
  repository.save(event);
}
```

`ActivityService.recordActivity` calls this when its existing `BadgeService.checkForNewBadges` returns a non-empty set (one event per badge — type=`BADGE_EARNED`, metadata={"badgeId": "..."}). It also calls this when level changes (type=`LEVEL_UP`, metadata={"newLevel": N}) and when a streak crosses configured thresholds (type=`STREAK_MILESTONE`, metadata={"streakDays": N}).

Recon discovery items:
- The exact streak milestone thresholds — likely 3, 7, 14, 30, 60, 100, 365 — recon should grep `BadgeService` and `streak-faith-points-engine.md` for the canonical list
- Whether `prayer_count_milestone` thresholds are documented — if not, defer to a later spec rather than hardcode
- `FriendsService.acceptRequest` calls `recordEvent(...)` for `FRIEND_MILESTONE` when the user's friend count crosses configured thresholds (1, 5, 10, 25, 50, 100 are common; recon should resolve from frontend's badge-engine which already encodes this)

### Configuration

`application.properties` additions:
```
worshiproom.social.encouragement.daily-cap-per-friend=10
worshiproom.social.encouragement.hourly-cap-per-user=60
worshiproom.social.nudge.cooldown-days=7
worshiproom.social.nudge.hourly-cap-per-user=60
```

Bind to a `@ConfigurationProperties` class `SocialLimitsConfig` in the social package, mirroring `ProxyConfig`'s pattern. Frontend constants in `@/constants/dashboard/encouragements` should match these values; recon should grep both and reconcile.

### OpenAPI updates

Three new path entries (`/api/v1/social/encouragements`, `/nudges`, `/recap-dismissal`). Three new request schemas. One shared response schema (the `{id, createdAt}` shape). Lint via `npx @redocly/cli lint`.

### Tests

`SocialInteractionsServiceTest` (12-15 tests covering happy paths + each rejection case + rate-limit boundaries).
`SocialControllerIntegrationTest` (8-10 tests covering 4xx/5xx mappings + auth gating + validation).
`MilestoneEventsServiceTest` (3-5 tests covering basic insert behavior; the integration with ActivityService / FriendsService gets covered by their own integration tests, which need ONE new test each: "recordActivity emits LEVEL_UP milestone when level changes" and "acceptRequest emits FRIEND_MILESTONE when threshold crossed").

Use `AbstractIntegrationTest` for service tests that need cross-table writes; `AbstractDataJpaTest` for repository-only tests.

---

## Frontend Deliverables

### New API client module

```
frontend/src/services/api/social-api.ts
```

Three exported functions mirroring the friends-api pattern:

```typescript
import { apiFetch } from '@/lib/api-client'

export async function sendEncouragementApi(toUserId: string, message: string): Promise<{id: string; createdAt: string}> {
  return apiFetch<{id: string; createdAt: string}>('/api/v1/social/encouragements', {
    method: 'POST',
    body: JSON.stringify({ toUserId, message }),
  })
}

export async function sendNudgeApi(toUserId: string): Promise<{id: string; createdAt: string}> {
  return apiFetch<{id: string; createdAt: string}>('/api/v1/social/nudges', {
    method: 'POST',
    body: JSON.stringify({ toUserId }),
  })
}

export async function sendRecapDismissalApi(weekStart: string): Promise<{id: string; createdAt: string}> {
  return apiFetch<{id: string; createdAt: string}>('/api/v1/social/recap-dismissal', {
    method: 'POST',
    body: JSON.stringify({ weekStart }),
  })
}
```

### Env flag

`frontend/src/lib/env.ts` gains `isBackendSocialEnabled()` mirroring `isBackendActivityEnabled()` exactly. `VITE_USE_BACKEND_SOCIAL=false` added to `.env.example` with comment matching the existing two flags.

### Wiring `useSocialInteractions`

Three mutations (`sendEncouragement`, `sendNudge`, `dismissRecap`) get the same fire-and-forget dual-write pattern from 2.5.4. Reuse the `shouldDualWriteSocial()` guard pattern (env flag AND `getStoredToken() !== null`).

`sendEncouragement` already has the friend-validation check — that stays. Backend re-validates anyway.

### What does NOT get a frontend dual-write

- **Milestone events** — backend emits these from `ActivityService` and `FriendsService` per Divergence 1. Frontend `wr_milestone_feed` continues as the local UI feed; no POST fires. The only frontend change relating to milestones is documenting in code comments that backend now emits these events.
- **Notifications** — `addNotification` writes to `wr_notifications` are local-only. Future spec will add notifications-domain backend.

### Tests

`useSocialInteractions.test.tsx` gets new test cases: flag-on/flag-off matrix for each of the three mutations. Same shape as `useFriends.test.tsx` (or wherever 2.5.4 placed its dual-write tests).

`social-api.test.ts` covers the three API functions (3 tests each: success, network error, 4xx).

---

## Master Plan Divergence Summary

(For ease of reference — full text in section above.)

| # | Divergence | Impact |
|---|---|---|
| 1 | Milestone events emitted backend-side by ActivityService/FriendsService, not POSTed by frontend | Removes 1 endpoint, simplifies frontend |
| 2 | Recap dismissal is shadow-only; backend doesn't suppress notifications | Pure record-keeping |
| 3 | Encouragement rate limits re-validated server-side at service layer | Real abuse prevention |
| 4 | Nudge cooldown re-validated server-side | Real abuse prevention |
| 5 | Endpoints under `/api/v1/social/...` not `/api/v1/users/me/social/...` | Cleaner namespace for write-only endpoints |

---

## Files to Create

### Backend

```
backend/src/main/java/com/worshiproom/social/
  SocialInteraction.java
  SocialInteractionType.java
  SocialInteractionTypeConverter.java
  SocialInteractionRepository.java
  SocialInteractionsService.java
  SocialController.java
  SocialException.java
  RateLimitedException.java
  NudgeCooldownException.java
  SocialExceptionHandler.java
  SocialValidationExceptionHandler.java
  SocialLimitsConfig.java
  MilestoneEvent.java
  MilestoneEventType.java
  MilestoneEventTypeConverter.java
  MilestoneEventRepository.java
  MilestoneEventsService.java
  dto/SendEncouragementRequest.java
  dto/SendNudgeRequest.java
  dto/RecapDismissalRequest.java

backend/src/test/java/com/worshiproom/social/
  SocialInteractionsServiceTest.java
  MilestoneEventsServiceTest.java
  SocialControllerIntegrationTest.java
```

### Frontend

```
frontend/src/services/api/social-api.ts
frontend/src/services/api/__tests__/social-api.test.ts
```

## Files to Modify

### Backend

```
backend/src/main/java/com/worshiproom/activity/ActivityService.java
  — add MilestoneEventsService dependency (constructor)
  — call milestoneEventsService.recordEvent(...) on level change (LEVEL_UP)
  — call recordEvent(...) on streak milestone (STREAK_MILESTONE)
  — call recordEvent(...) for each newly-earned badge (BADGE_EARNED, one event per badge)

backend/src/main/java/com/worshiproom/friends/FriendsService.java
  — add MilestoneEventsService dependency (constructor)
  — call recordEvent(...) in acceptRequest after the two friend_relationships rows insert, when friend count crosses configured thresholds (FRIEND_MILESTONE)

backend/src/main/resources/application.properties
  — add 4 worshiproom.social.* config entries

backend/src/main/resources/openapi.yaml
  — 3 new paths + 3 new request schemas + shared response schema

backend/src/test/java/com/worshiproom/activity/ActivityServiceTest.java (or appropriate)
  — add 1 test: "recordActivity emits LEVEL_UP milestone_event when level changes"

backend/src/test/java/com/worshiproom/friends/FriendsServiceTest.java
  — add 1 test: "acceptRequest emits FRIEND_MILESTONE when threshold crossed"
```

### Frontend

```
frontend/src/hooks/useSocialInteractions.ts
  — add shouldDualWriteSocial() guard
  — wire sendEncouragement, sendNudge, dismissRecap to fire-and-forget backend calls

frontend/src/lib/env.ts
  — add isBackendSocialEnabled()

frontend/.env.example
  — add VITE_USE_BACKEND_SOCIAL=false

frontend/src/hooks/__tests__/useSocialInteractions.test.tsx (or create)
  — flag-on/flag-off coverage
```

## Files NOT to Modify

- `frontend/src/services/social-storage.ts` — local operations unchanged
- `frontend/src/hooks/useFaithPoints.ts` — milestone event emission moves to backend; frontend `wr_milestone_feed` writes via existing path stay
- Any Liquibase changeset — schema is finalized in 2.5.1
- `useFaithPoints.ts`'s `addMilestone(...)` localStorage path — stays as-is per Divergence 1

## Files to Delete

None.

---

## Acceptance Criteria

### Backend — endpoints exist and validate

- [ ] `POST /api/v1/social/encouragements` returns 201 with valid friendship + valid body
- [ ] Returns 400 SELF_ACTION_FORBIDDEN when `toUserId == principal.userId()`
- [ ] Returns 404 USER_NOT_FOUND when target user doesn't exist or is deleted/banned
- [ ] Returns 403 NOT_FRIENDS when no active friendship between sender and recipient
- [ ] Returns 429 RATE_LIMITED when sender's hourly count ≥ 60
- [ ] Returns 429 RATE_LIMITED when sender's per-friend daily count ≥ cap
- [ ] Returns 400 INVALID_INPUT when message is empty or > 200 chars
- [ ] `POST /api/v1/social/nudges` returns 201 with valid friendship
- [ ] Returns 409 NUDGE_COOLDOWN when nudge sent within `nudgeCooldownDays` of last nudge to same recipient
- [ ] Returns 403 NOT_FRIENDS when no active friendship
- [ ] `POST /api/v1/social/recap-dismissal` returns 201 with valid `weekStart`
- [ ] Returns 400 INVALID_INPUT when `weekStart` doesn't match `\d{4}-\d{2}-\d{2}`
- [ ] All 4 endpoints return 401 without `Authorization: Bearer ...`

### Backend — milestone event emission

- [ ] `ActivityService.recordActivity` inserts a `milestone_events` row with `event_type='LEVEL_UP'` when the activity caused a level change; metadata includes `newLevel`
- [ ] `ActivityService.recordActivity` inserts a `milestone_events` row with `event_type='STREAK_MILESTONE'` when streak crosses a configured threshold; metadata includes `streakDays`
- [ ] `ActivityService.recordActivity` inserts a `milestone_events` row with `event_type='BADGE_EARNED'` for each newly-earned badge; metadata includes `badgeId`
- [ ] `FriendsService.acceptRequest` inserts a `milestone_events` row with `event_type='FRIEND_MILESTONE'` when the user's friend count crosses a configured threshold; metadata includes `friendCount`
- [ ] All milestone event inserts happen INSIDE the existing transaction (rollback semantics: if the activity fails to persist, no orphaned milestone event)

### Backend — exception mapping

- [ ] `SelfActionException` (reused from friends or new in social) → 400 SELF_ACTION_FORBIDDEN
- [ ] `UserNotFoundException` → 404 USER_NOT_FOUND
- [ ] `NotFriendsException` → 403 NOT_FRIENDS
- [ ] `RateLimitedException` → 429 RATE_LIMITED
- [ ] `NudgeCooldownException` → 409 NUDGE_COOLDOWN
- [ ] `InvalidInputException` (reuse if appropriate) → 400 INVALID_INPUT

### Frontend — flag-off behavior (regression discipline)

- [ ] `VITE_USE_BACKEND_SOCIAL` unset → no backend calls fire from `useSocialInteractions`
- [ ] All existing `useSocialInteractions` test cases still pass
- [ ] localStorage `wr_social_interactions` shape unchanged
- [ ] localStorage `wr_milestone_feed` shape unchanged regardless of flag (milestone is backend-emitted; frontend still writes local feed)

### Frontend — flag-on behavior

- [ ] Flag on AND `getStoredToken() !== null` → `sendEncouragement` fires `POST /api/v1/social/encouragements`
- [ ] `sendEncouragement` failure (network, 4xx, 5xx) is swallowed; localStorage state unchanged; console.warn logged
- [ ] `sendNudge` fires `POST /api/v1/social/nudges`
- [ ] `dismissRecap` fires `POST /api/v1/social/recap-dismissal` with `weekStart` from local computation
- [ ] Simulated-auth (no JWT) → no backend calls fire even when flag on (per 2.5.4's Watch-For #1 pattern)

### Test count target

M-sized → 10–20 tests per `06-testing.md`. Master plan target ~15. Backend: ~25 tests across 3 test files. Frontend: ~8 tests across 2 test files. Total **~33 tests**, which slightly overshoots M target due to spanning both backend and frontend — that's acceptable for this hybrid spec.

---

## What to Watch For in CC's Spec Output

1. **Don't create a `POST /milestone-events` endpoint.** Per Divergence 1. Milestone events are backend-emitted from existing service operations. If CC's plan adds an endpoint for frontend to POST milestone events, push back hard — that path creates the duplication and race conditions described in Divergence 1.

2. **Recap dismissal's `to_user_id = from_user_id` self-row hack.** Per Divergence section. Schema requires NOT NULL; we use sender for both columns. If CC proposes a migration to make `to_user_id` nullable, push back — out of scope. Document the convention in service Javadoc.

3. **Reuse exception classes from friends package where shape matches.** `NotFriendsException` and `SelfActionException` and `UserNotFoundException` exist in `com.worshiproom.friends`. If their HTTP code + error code match what social needs (and they do for these three), import and reuse. Don't duplicate. If CC's recon discovers shape mismatch (e.g., social's "not friends" should be 403 but friends' is 404), THEN create a social-package version — but verify before duplicating.

4. **Hourly rate-limit query window.** "Past hour" means `created_at >= NOW() - INTERVAL '1 hour'`. Use `OffsetDateTime.now(ZoneOffset.UTC).minusHours(1)` in Java. Don't use `LocalDateTime`. Don't use `Instant`-without-offset. Recon should pick the same shape `ActivityService` already uses.

5. **The milestone emission integration tests are crucial.** ActivityService and FriendsService each get ONE new test verifying the milestone_events row appears. These tests are the load-bearing part of Divergence 1 — they prove backend emission works. Don't let CC skip them or stub them as "covered elsewhere."

6. **Friend count threshold lookup.** Recon needs to find where the canonical thresholds are defined. Likely candidates: `frontend/src/services/badge-engine.ts`, `_protocol/streak-faith-points-engine.md`, `BadgeService.java`. If they're frontend-only today, they need to be ported to a backend constant in `FriendsService` or a shared `MilestoneThresholds` constants file. Document the canonical source.

7. **Configuration values via @ConfigurationProperties, not @Value.** `SocialLimitsConfig` should be a typed @ConfigurationProperties bean. Pattern reference: `ProxyConfig` in `com.worshiproom.config`. Don't sprinkle `@Value("${worshiproom.social.encouragement.daily-cap-per-friend}")` across services.

8. **Frontend constants reconciliation.** Recon should identify any drift between `frontend/src/constants/dashboard/encouragements.ts` and the new backend `application.properties` values. If frontend has `MAX_ENCOURAGEMENTS_PER_FRIEND_PER_DAY=10` and backend default is anything else, RESOLVE the drift in this spec. Both sides must agree.

9. **Don't enrich `useFaithPoints` with backend milestone POSTing.** Per Divergence 1. The hook keeps writing to `wr_milestone_feed` locally, full stop. The new behavior happens on the backend transparently.

10. **Simulated-auth guard pattern from 2.5.4.** Reuse `shouldDualWriteSocial()` with the same `env flag AND getStoredToken() !== null` pattern. Don't reinvent.

11. **No `unblockUser`-style omissions.** All 3 social mutations have UI consumers in `useSocialInteractions`. All 3 get dual-write wiring. No "out of scope, no consumer" skipping here.

12. **Nudge cooldown days is days, not hours.** `NUDGE_COOLDOWN_DAYS` is a day count. Use `Duration.ofDays(nudgeCooldownDays)` in Java, not minutes/hours arithmetic. Recon should grep frontend constant for the canonical value.

13. **`SocialInteraction.payload` JSONB serialization.** Use Jackson + Hibernate's `@JdbcTypeCode(SqlTypes.JSON)` annotation, OR serialize to/from a `Map<String, Object>` field with a `@Convert` converter. Recon should pick the simpler pattern that matches existing JSONB usage in the codebase (likely `BadgeRepository` or activity-package). Don't introduce a third pattern.

14. **Single quotes** for all shell snippets, file paths, fixture strings.

---

## Out of Scope

- **Reading endpoints for social or milestone data.** No `GET /api/v1/social/encouragements` or `GET /api/v1/users/me/milestone-events` in this spec. Reads stay localStorage-driven during this wave. Future Phase 7+ specs add these.
- **`wr_notifications` dual-write.** Notifications are local-only this wave. Phase 12 (notification system) replaces this entirely.
- **Cross-device milestone-event delivery.** Backend has the row; frontend doesn't pull it across devices. Future spec.
- **Suppression of recap notifications based on backend-stored dismissal.** Backend dismissal data is record-only this wave per Divergence 2.
- **Migration of existing localStorage `wr_social_interactions` data to backend.** Like Phase 2's activity backfill (Spec 2.10) — out of scope for this spec; future cutover spec may add it. The wave operates with a clean slate; older interactions stay local-only forever.
- **Phase 2.5 cutover and env flag flip.** Spec 2.5.5 owns that.
- **Block user feature** — Spec 2.5.6.

---

## Out-of-Band Notes for Eric

- This is the load-bearing spec of Phase 2.5 in terms of complexity per token. M-sized but spans backend + frontend, plus surgically modifies two existing backend services (ActivityService, FriendsService) for milestone event emission. Surface area is real.
- Estimated execution: 2-3 sessions. Probably one for the social package backend skeleton + endpoints, one for milestone emission integration, one for frontend wiring + tests.
- Watch-For #1 (no POST /milestone-events) is the divergence I'd most expect CC to push back on. Master plan body suggests the endpoint exists. Recon should explicitly compare master plan's spec body against this brief's Divergence 1 reasoning. If recon argues for the master plan path, the answer is: master plan was written before backend-side emission was an obvious option. The duplication concern is real. Backend emission wins.
- Watch-For #5 (milestone emission integration tests) is the next most likely to get hand-waved. Don't allow that. The point of moving emission to backend is provability via integration tests; skipping the tests defeats the purpose.
- Watch-For #6 (friend count thresholds) is a recon discovery item. Whatever value CC's recon settles on, the SAME values must be used in both `FriendsService.acceptRequest` AND in any frontend logic that surfaces "milestone reached!" UI. Drift here means inconsistent UX.
- Spec tracker after 2.5.4b ships: `2.5.4b ✅`, Phase 2.5 progress 5/8 (since 2.5.4b is the 5th of 8 specs).
- The next spec after 2.5.4b is **2.5.5 (Phase 2.5 Cutover)** — small, mechanical: flip the three env flag defaults to `true` in `.env.example`, run a cutover smoke test, document the cutover in `_cutover-evidence/`. Different shape entirely from 2.5.4b. I'll draft that one when 2.5.4b finishes review.
- After 2.5.5, the remaining two specs (2.5.6 Block User, 2.5.7 Mute User) wrap Phase 2.5. Both M/S sized. Quick path to Phase 3 from here.
- xHigh thinking is appropriate for this spec. The reasoning depth is moderate (rate limit query shape, JSONB serialization choice, transactional boundaries for milestone emission) but each individual decision is pattern-matchable against existing code. MAX would be over-spending.
