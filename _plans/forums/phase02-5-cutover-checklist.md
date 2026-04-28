# Phase 2.5 Cutover Checklist — Friends + Social Dual-Write

**Purpose:** Activate the dual-write path so backend friends + social interaction tables receive real production traffic alongside the existing localStorage writes, and verify the backend-side milestone-event emission path end-to-end for the first time.
**Phase 2.5 status before this spec:** 5/8 specs complete (2.5.1–2.5.4b). 2.5.5 (this) is the activation. 2.5.6 (Block UX) and 2.5.7 (Mute UX) remain after.
**Cutover date:** _____________ (Eric fills in)

---

## Overview

Phase 2.5 delivered the backend friends + social engine — four tables (`friend_relationships`, `friend_requests`, `social_interactions`, `milestone_events`), two services (`FriendsService`, `SocialService`) with backend-side milestone-event emission integrated into `ActivityService.recordActivity` and `FriendsService.acceptRequest`, eight endpoints (friend request send/accept/decline, friend remove, block, encouragement, nudge, recap dismissal), and two frontend hook wirings (`useFriends`, `useSocialInteractions`) that dual-write when `VITE_USE_BACKEND_FRIENDS=true` and `VITE_USE_BACKEND_SOCIAL=true` respectively.

This cutover flips both flags from `false` to `true` atomically so dual-write fires by default in dev and prod. Reads remain localStorage-canonical — backend rows written here are shadow data with no user-facing consumer until a future "promote backend reads" spec ships. Drift detection was deliberately not added for friends/social per Spec 2.5.4 / 2.5.4b — the surface area is small and well-tested by the existing Vitest suites that exercise both flag states via `vi.stubEnv`. For users, nothing visible changes. For the backend, this is the first time the eight Phase 2.5 endpoints receive real traffic from a real frontend, AND the first time milestone events fire end-to-end from real user actions (level-up, streak milestone, friend milestone) instead of from test scenarios.

---

## 1. Pre-flight checks

- [ ] On `forums-wave-continued` branch
- [ ] Working tree clean (`git status` returns nothing pending beyond the Spec 2.5.5 changes)
- [ ] Docker running
- [ ] Backend Postgres container running (`docker-compose up`)
- [ ] Backend dev server running (`./mvnw spring-boot:run`) and serving on `:8080`
- [ ] `/api/v1/health` returns 200 with provider readiness JSON
- [ ] Frontend dev server running (`pnpm dev`) and serving on `:5173`
- [ ] Logged in as TWO dev seed users in separate sessions — `dev1@worshiproom.com` (tab A) and `dev2@worshiproom.com` (tab B, incognito or different browser). Both sessions have valid JWTs in `wr_jwt_token`. Friends flow needs two real users to land real backend rows.
- [ ] `VITE_USE_BACKEND_ACTIVITY=true` is set in `frontend/.env.local` (already cutover'd by Spec 2.9 — needed because milestone emission verification in Section 5 depends on the activity dual-write path running)

---

## 2. Code change

- [ ] Flip `VITE_USE_BACKEND_FRIENDS=true` in `frontend/.env.example` (CC has done this in Step 1 of the plan; Eric verifies)
- [ ] Flip `VITE_USE_BACKEND_SOCIAL=true` in `frontend/.env.example` (CC has done this in Step 1 of the plan; Eric verifies)
- [ ] Update both comment blocks above the flags to reflect post-cutover state — "Activated by Spec 2.5.5 cutover on 2026-04-27." (CC has done this in Step 1 of the plan; Eric verifies)
- [ ] Set both `VITE_USE_BACKEND_FRIENDS=true` and `VITE_USE_BACKEND_SOCIAL=true` in local `frontend/.env.local` (Eric does this manually because `.env.local` is gitignored — CC does NOT touch it)
- [ ] Restart the frontend dev server so Vite re-reads the env vars (Vite env vars are baked at build time; restart is required for the new values to take effect)

---

## 3. Build verification

- [ ] `pnpm tsc --noEmit` clean (zero new TypeScript errors)
- [ ] `pnpm lint` clean (zero new lint errors)
- [ ] `pnpm build` clean (production build succeeds with both flags set to `true`)
- [ ] `pnpm test` clean — Vitest baseline matches the post-2.5.4b count (CLAUDE.md "Build Health" anchors at 8,811 pass / 11 known-fail; the post-2.5.4b count is higher — record actual observed baseline below). Any NEW failing file or fail count beyond the baseline is a regression.

**Observed Vitest baseline (Eric records during execution):** _____________

---

## 4. Manual smoke test — friends mutations (between two real users)

For each smoke below: perform the action in tab A or tab B as indicated, then verify backend persistence via the SQL queries in Section 6. Open browser DevTools → Network tab → filter to `/api/v1/users/me/friend-requests`, `/api/v1/friend-requests/`, `/api/v1/users/me/friends/`, `/api/v1/users/me/blocks`, and `/api/v1/social/` to confirm the POST/PATCH/DELETE fires alongside the localStorage write.

**Setup note:** Some prior mock-data UUIDs in `useFriends`'s seed list will not exist as real users in the backend. Targeting them via the dual-write path produces a backend `404 USER_NOT_FOUND` — that is expected behavior, NOT a regression. The localStorage write succeeds; only the shadow backend write fails. The smokes below use the two real dev seed users.

### Smoke 1: Send friend request

- [ ] In tab A (dev1), open the Friends panel and send a friend request to dev2's user UUID
- [ ] DevTools → Application → LocalStorage → `wr_friends` for dev1 shows the new pending outgoing request, and the request has a `backendId` populated from the response
- [ ] DevTools → Network shows `POST /api/v1/users/me/friend-requests` returning 201 with the JWT in the `Authorization: Bearer ...` header
- [ ] Backend `friend_requests` row inserted with `from_user_id=<dev1-uuid>`, `to_user_id=<dev2-uuid>`, `status='pending'` (verify via Section 6 query)
- [ ] If targeting a mock-data UUID: expect `404 USER_NOT_FOUND` warning in DevTools Console — this is the documented backend behavior for mock-data UUIDs and not a regression

### Smoke 2: Accept friend request

- [ ] In tab B (dev2), open the Friends panel and accept the incoming friend request from dev1
- [ ] DevTools → Network shows `PATCH /api/v1/friend-requests/<id>` with body `{ "action": "accept" }` returning 200
- [ ] Backend `friend_requests` row for that pair updates to `status='accepted'`
- [ ] Backend `friend_relationships` table now has TWO rows for the pair — one for each direction (`(dev1, dev2)` and `(dev2, dev1)`) — both with `status='active'`
- [ ] If this is dev2's first accepted friend, `milestone_events` row inserted with `user_id=<dev2-uuid>`, `event_type='friend_milestone'`, `event_metadata->>'friendCount' = '1'` (this confirms Smoke 11 by construction)

### Smoke 3: Send encouragement

- [ ] In tab A (dev1), send an encouragement to dev2 (one of the 4 preset messages)
- [ ] DevTools → Network shows `POST /api/v1/social/encouragements` returning 201
- [ ] Backend `social_interactions` row inserted with `from_user_id=<dev1-uuid>`, `to_user_id=<dev2-uuid>`, `interaction_type='encouragement'`
- [ ] Local `wr_social_interactions` for dev1 reflects the encouragement entry

### Smoke 4: Send nudge

- [ ] In tab A (dev1), send a nudge to dev2 (only available if dev2 is marked inactive 3+ days; for testing, you may need to temporarily adjust dev2's last-active date or use a previously-inactive dev account)
- [ ] DevTools → Network shows `POST /api/v1/social/nudges` returning 201
- [ ] Backend `social_interactions` row inserted with `interaction_type='nudge'`

### Smoke 5: Dismiss recap

- [ ] In tab A (dev1), dismiss the weekly recap card (Monday or whenever it surfaces)
- [ ] DevTools → Network shows `POST /api/v1/social/recap-dismissal` returning 201 (or 200 if the endpoint is idempotent)
- [ ] Backend `social_interactions` row inserted with `interaction_type='recap_dismissal'`

### Smoke 6: Decline friend request

- [ ] In tab B (dev2), send a NEW friend request to dev1 (so we have a fresh pending request to decline)
- [ ] In tab A (dev1), decline the incoming request
- [ ] DevTools → Network shows `PATCH /api/v1/friend-requests/<id>` with body `{ "action": "decline" }` returning 200
- [ ] Backend `friend_requests` row updates to `status='declined'`
- [ ] No `friend_relationships` row created for this pair direction
- [ ] If dev2 immediately retries the friend request: backend returns `409 DUPLICATE` (the declined row still exists and prevents a duplicate-pending row)

### Smoke 7: Remove friend

- [ ] In tab A (dev1), remove dev2 from friends (uses the friendship from Smoke 2)
- [ ] DevTools → Network shows `DELETE /api/v1/users/me/friends/<dev2-uuid>` returning 204
- [ ] Backend `friend_relationships` table — BOTH rows for the pair `(dev1, dev2)` and `(dev2, dev1)` are deleted in one operation
- [ ] Local `wr_friends` for dev1 no longer lists dev2

### Smoke 8: Block user

- [ ] Re-create the friendship from Smoke 1+2 first if needed, OR start fresh with dev1 having no relationship to dev2
- [ ] In tab A (dev1), block dev2
- [ ] DevTools → Network shows `POST /api/v1/users/me/blocks` returning 201 with `{ "blockedUserId": "<dev2-uuid>" }`
- [ ] Backend `friend_relationships` table — single row inserted with `user_id=<dev1-uuid>`, `friend_user_id=<dev2-uuid>`, `status='blocked'`. Reverse-direction row NOT inserted (block is directional)
- [ ] Any pre-existing `friend_requests` rows between the pair (in either direction) are deleted as part of the block operation
- [ ] Local `wr_friends.blockedUsers` for dev1 includes dev2's UUID

---

## 5. Manual smoke test — milestone emission verification

This is the broader scope per spec Divergence 3 — the first end-to-end run of the backend-side milestone-event emission path. The emission code (in `ActivityService.recordActivity` and `FriendsService.acceptRequest`) is unconditional and not gated by any frontend env flag, so milestone events fire as soon as a real user action triggers them. Smokes 9 and 10 are best-effort — milestone thresholds may not be reachable from current seed-data state. Smoke 11 falls out of Smoke 2 by construction.

### Smoke 9: Level-up milestone (best-effort)

- [ ] Check dev1's current `faith_points.total_points` and `faith_points.current_level` via Section 6
- [ ] If dev1 is near a level threshold (within ~50 points of next level): perform Phase 2 dual-write activities (pray, journal, meditate, etc.) until dev1 crosses the threshold
- [ ] After threshold cross: backend `milestone_events` row inserted with `user_id=<dev1-uuid>`, `event_type='level_up'`, `event_metadata->>'newLevel' = '<new-level>'`
- [ ] If dev1 is NOT near a threshold: document this and defer to natural usage. Record in this checklist: "Smoke 9 deferred — dev1 at <points> points, level <level>, threshold for next level too far for smoke window. Will surface naturally in coming days."

### Smoke 10: Streak milestone (best-effort)

- [ ] Check dev1's current `streak_state.current_streak` via Section 6
- [ ] If dev1 is at threshold-1 for a streak milestone (e.g., currently at 6 days for a 7-day milestone, or 29 days for a 30-day milestone): perform any Phase 2 dual-write activity today to advance the streak past the threshold
- [ ] After advance: backend `milestone_events` row inserted with `user_id=<dev1-uuid>`, `event_type='streak_milestone'`, `event_metadata->>'streakDays' = '<threshold>'`
- [ ] If dev1 is NOT at threshold-1: document this and defer to natural usage. Record in this checklist: "Smoke 10 deferred — dev1 at <streak> days, next milestone threshold too far for smoke window. Will surface naturally."

### Smoke 11: Friend milestone (confirmable)

- [ ] If Smoke 2 was performed against a previously-friendless dev2: backend `milestone_events` row already exists with `user_id=<dev2-uuid>`, `event_type='friend_milestone'`, `event_metadata->>'friendCount' = '1'`
- [ ] Verify via the Section 6 milestone query
- [ ] If Smoke 2 was performed against a dev2 who already had friends: this smoke is satisfied by any prior accepted-request row in `milestone_events` for dev2, OR can be re-run with a third dev seed user (dev3) who has no existing friends accepting a fresh request

---

## 6. Backend verification queries

Run these via `psql` against the dev DB. Substitute `<dev1-uuid>` and `<dev2-uuid>` with the actual UUIDs from the helper query below.

To find the dev seed user UUIDs:

```sql
SELECT id, email FROM users
WHERE email IN ('dev1@worshiproom.com', 'dev2@worshiproom.com');
```

Most recent `friend_requests` rows (any status, both directions):

```sql
SELECT id, from_user_id, to_user_id, status, created_at, responded_at
FROM friend_requests
ORDER BY created_at DESC
LIMIT 10;
```

Most recent `friend_relationships` rows (active + blocked):

```sql
SELECT user_id, friend_user_id, status, created_at
FROM friend_relationships
ORDER BY created_at DESC
LIMIT 10;
```

Most recent `social_interactions` rows (encouragements, nudges, recap dismissals):

```sql
SELECT id, from_user_id, to_user_id, interaction_type, payload, created_at
FROM social_interactions
ORDER BY created_at DESC
LIMIT 20;
```

Most recent `milestone_events` rows (`level_up`, `streak_milestone`, `friend_milestone` — note the DB stores the lowercase `MilestoneEventType.value()` form, not the Java identifier):

```sql
SELECT id, user_id, event_type, event_metadata, occurred_at
FROM milestone_events
ORDER BY occurred_at DESC
LIMIT 20;
```

---

## 7. localStorage canonicality verification

- [ ] Refresh the frontend page in tab A after the smoke test completes
- [ ] All UI elements (friends list, pending requests, recent encouragements, milestone feed) reflect the SAME state visible immediately before the refresh
- [ ] Refresh the frontend page in tab B and confirm dev2's view matches expected state
- [ ] Confirms localStorage is still the source of truth for reads — backend traffic remains shadow only until a future "promote backend reads" spec ships

---

## 8. Accessibility smoke (Universal Rule 17)

Phase 2.5 wired backend dual-write to existing Friends UI + existing social-interaction UI + existing milestone-feed UI; no new user-visible UI was added. Scope is "verify existing routes still scan clean," not net-new audit work. The capture script from prior phases (`_cutover-evidence/capture-axe-evidence.mjs`) can be adapted by extending its `ROUTES` constant — the route set matches Phase 2's since no new routes shipped in 2.5.x.

- [ ] Run axe-core automated scan on `/`, `/daily`, `/prayer-wall`, and `/profile/:userId` (and any friends-specific routes that exist)
- [ ] Save axe-core JSON output to `_cutover-evidence/phase02-5-a11y-smoke.json` (replace the placeholder content created in Step 3 of the plan)
- [ ] Zero CRITICAL violations across the scanned routes (any non-CRITICAL findings recorded as follow-up entries in `_plans/post-1.10-followups.md`)
- [ ] Keyboard-only walkthrough of the friends primary flow (open friends panel → send friend request → accept request, across the two tabs) completes without dead-ends
- [ ] VoiceOver spot-check on the encouragement-send interaction completes without blocking issues
- [ ] Brief notes saved to `_cutover-evidence/phase02-5-a11y-notes.md` (replace the placeholder content created in Step 4 of the plan)

---

## 9. Production deploy plan

- [ ] Verify the Railway frontend Dockerfile exposes both `VITE_USE_BACKEND_FRIENDS` and `VITE_USE_BACKEND_SOCIAL` (mirror the `VITE_API_BASE_URL` pattern from Spec 1.10 and the `VITE_USE_BACKEND_ACTIVITY` pattern from Spec 2.9 — `ARG VITE_USE_BACKEND_FRIENDS` + `ENV VITE_USE_BACKEND_FRIENDS=$VITE_USE_BACKEND_FRIENDS` and the same for `_SOCIAL` before `RUN pnpm build`). If missing, add a one-line Dockerfile patch for each.
- [ ] Add `VITE_USE_BACKEND_FRIENDS=true` to Railway frontend service env vars (Variables tab → "+ New Variable")
- [ ] Add `VITE_USE_BACKEND_SOCIAL=true` to Railway frontend service env vars (Variables tab → "+ New Variable")
- [ ] Trigger a Railway deploy (push to `main`, or trigger a manual deploy from the dashboard)
- [ ] After deploy completes: smoke test ONE friend-request flow in prod between two real accounts — send a friend request, accept it, verify the backend received the rows via `railway connect postgres` and the Section 6 queries
- [ ] If the prod smoke test fails: see Rollback plan below

---

## 10. Rollback plan (if prod surfaces issues)

If anything goes wrong in production after the deploy:

1. Set `VITE_USE_BACKEND_FRIENDS=false` AND `VITE_USE_BACKEND_SOCIAL=false` in Railway frontend service env vars (Variables tab → existing variables → edit value for both)
2. Trigger a redeploy (or wait for the next auto-deploy to pick up the new values)
3. Verify in browser DevTools that subsequent friend mutations no longer fire backend POSTs/PATCHes/DELETEs — the fail-closed env check (`=== 'true'`) treats any non-`'true'` value as off
4. Verify subsequent social interactions (encouragements, nudges, recap dismissals) no longer fire backend POSTs
5. localStorage data is untouched; users see no difference
6. Backend rows already written remain in the database (shadow data with no consumer) — no cleanup required
7. Backend-side milestone-event emission continues to fire from `ActivityService.recordActivity` and `FriendsService.acceptRequest` — that path is gated by Phase 2's `VITE_USE_BACKEND_ACTIVITY` flag (still on) plus backend-side acceptRequest logic, NOT by Phase 2.5's flags. This is by design and not a rollback concern.
8. Open a followup entry in `_plans/post-1.10-followups.md` describing what failed, including the request ID from any `X-Request-Id` headers captured in the failure
9. Do NOT revert the spec's commit. The flag-flips stay in `.env.example`; the Railway env var override is the rollback mechanism.

---

## 11. Sign-off

- Cutover date: _____________
- Eric's sign-off: _____________
- Local smoke test passed: _____________
- Production smoke test passed: _____________
- A11y evidence committed: _____________
- Phase 2.5 status: PARTIAL — 6/8 specs complete (2.5.1–2.5.5). Remaining: 2.5.6 (Block UX), 2.5.7 (Mute UX).
