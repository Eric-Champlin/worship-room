# Forums Wave: Spec 2.5.5 — Phase 2.5 Cutover

**Master Plan Reference:** `_forums_master_plan/round3-master-plan.md` → Spec 2.5.5 (Phase 2.5 cutover)
**Branch:** `forums-wave-continued` (stay on this branch — no per-spec sub-branch)
**Date:** 2026-04-27

---

## STAY ON BRANCH

Same as the rest of Phase 2.5. Stay on `forums-wave-continued`. No `git checkout`, `git branch`, `git commit`, `git push`, `git stash`, `git reset`. Eric handles git manually.

---

## Affected Frontend Routes

N/A — cutover spec. The only code changes are flag default flips in `frontend/.env.example`. No new components, no UI changes, no new routes. The `/verify-with-playwright` skill is therefore skipped for this spec.

The manual smoke test (Eric's responsibility) exercises Friends UI flows + social interactions UI flows + milestone-emission verification, but that's interactive verification, not automated visual regression.

---

## Spec Header

- **ID:** `round3-phase02-5-spec05-phase2-5-cutover`
- **Size:** S
- **Risk:** Medium (live cutover — flips dual-write from off to on for friends + social + milestone events; first time the backend receives real friends/social traffic from a real frontend)
- **Prerequisites:** 2.5.4 ✅ (frontend friends dual-write), 2.5.4b ✅ (social interactions + milestone events dual-write — backend emission paths in ActivityService and FriendsService also need to be live before cutover)
- **Phase:** 2.5 — Friends Migration (Dual-Write)
- **Sixth spec of Phase 2.5.** Specs 2.5.6 (Block User Feature) and 2.5.7 (Mute User Feature) remain after this one.

---

## Goal

Flip three env flag defaults from `false` to `true` in one cutover:

1. `VITE_USE_BACKEND_FRIENDS` — owned by Spec 2.5.4 (six friend mutations dual-write)
2. `VITE_USE_BACKEND_SOCIAL` — owned by Spec 2.5.4b (three social mutation dual-writes; milestone event emission is backend-side per 2.5.4b's Divergence 1, no flag needed)
3. (Verify) Any milestone-related flag if 2.5.4b introduced one — recon during execution confirms the actual flag set; this brief assumes only the two flags above based on 2.5.4b's spec body (Divergence 1 keeps milestone emission backend-only, no frontend POST).

After this spec ships:

- **Dev environment:** dual-write fires on every friend mutation and social interaction. Local dev becomes the same shape as production for backend traffic.
- **Production builds:** the `.env.example` defaults are `true`, but Vite env vars are baked at build time — Eric must add both flag vars to Railway frontend service env vars for prod to actually flip. The .env.example flip alone is necessary but not sufficient for prod.
- **Backend milestone emission** (from `ActivityService.recordActivity` and `FriendsService.acceptRequest`) is already live regardless of flag state — those code paths have no env-flag gating per 2.5.4b's design. The cutover is therefore frontend-side only.

This is the **first spec where the backend receives real friends/social traffic from a real frontend feature**. Vitest tests in 2.5.4 and 2.5.4b mocked the backend; nothing committed verifies actual HTTP friends-mutation calls reach actual Postgres `friend_relationships` / `friend_requests` / `social_interactions` rows. Manual smoke testing fills the gap.

---

## Master Plan Divergences

Three divergences from the master plan body worth pinning before drafting.

### Divergence 1 — Two flags flip, not one

**What the master plan implies:** Spec 2.5.5's body (master plan) refers loosely to "the friends dual-write flag" — singular.

**What this brief says:** Two flags flip in this spec (`VITE_USE_BACKEND_FRIENDS` and `VITE_USE_BACKEND_SOCIAL`). Phase 2.5 ships dual-write across two domains (friends + social interactions). Both must activate together — partial cutover (e.g., friends-only) creates confusing state where users encourage friends but the backend has no `friend_relationships` row reflecting the friendship, leading to backend 403 NOT_FRIENDS rejections on every encouragement attempt for the entire wave.

**Why mention this:** CC's recon may treat the spec body literally and propose flipping only one flag. Push back — both flags flip together. Atomic cutover.

### Divergence 2 — Checklist path matches existing convention, not master plan body

Same divergence as Spec 2.9's Divergence 1. The master plan body may say `_plans/forums-wave/...`; the established convention is `_plans/forums/`. This spec creates `_plans/forums/phase02-5-cutover-checklist.md` matching `phase02-cutover-checklist.md` from Spec 2.9.

### Divergence 3 — Backend smoke test must verify milestone emission, not just dual-write

Master plan acceptance criteria for cutover specs typically focus on dual-write verification ("backend received the row, localStorage unchanged"). For Phase 2.5, the cutover smoke test must ALSO verify that **backend-side milestone event emission** works end-to-end:

- When a Phase 2 dual-write activity causes a level-up, a `milestone_events` row with `event_type='LEVEL_UP'` should appear (emitted by `ActivityService.recordActivity` per 2.5.4b's Divergence 1)
- When a Phase 2 dual-write activity causes a streak milestone, a `STREAK_MILESTONE` row should appear
- When `friendsService.acceptRequest` runs (via real frontend dual-write, two real users with real backend `friend_relationships` rows), a `FRIEND_MILESTONE` row should appear if friend count crosses a threshold

These emissions are gated by Phase 2's `VITE_USE_BACKEND_ACTIVITY` flag (already on since Spec 2.9) and Phase 2.5's `VITE_USE_BACKEND_FRIENDS` flag (newly on after this cutover). The cutover is the first time both gates are open simultaneously, so it's the first opportunity to verify milestone emission end-to-end.

**Why mention this:** The smoke test scope is broader than a typical "dual-write fires" check. The milestone-event row verification queries are part of the checklist.

---

## Recon Facts (verified during brief authoring; re-verify suspect ones during execution)

### A) Current flag state

`frontend/.env.example` should currently have:

```
VITE_USE_BACKEND_FRIENDS=false
VITE_USE_BACKEND_SOCIAL=false
```

Plus comment blocks above each, naming Spec 2.5.5 as the cutover owner. This spec flips both values to `'true'` and updates the comments to reflect cutover happened.

**Recon verification step during execution:** confirm the actual flag names and current values in `.env.example`. If 2.5.4b shipped under a different name (e.g., `VITE_USE_BACKEND_MILESTONE` instead of or alongside `VITE_USE_BACKEND_SOCIAL`), the cutover flips whatever 2.5.4b actually committed.

### B) The flags' consumers

Same pattern as Spec 2.7's `isBackendActivityEnabled`. Strict equality `=== 'true'`, fail-closed. Located in `frontend/src/lib/env.ts`. Consumed by:

- `useFriends` (Spec 2.5.4) for the six friend mutations
- `useSocialInteractions` (Spec 2.5.4b) for the three social mutations

After this spec ships, the docstring "Default: false. Cutover owned by Spec 2.5.5." in each helper should be updated to reflect cutover happened — but per Architectural Decision #5 below, the docstring update is a courtesy, not a deliverable.

### C) Railway env vars

Production deploys read these vars at build time (Vite env vars are baked into the production bundle). The Railway service for the frontend needs:

```
VITE_USE_BACKEND_FRIENDS=true
VITE_USE_BACKEND_SOCIAL=true
```

Set BEFORE the next production deploy. Same convention as Spec 2.9's Recon C — add via Railway dashboard. Per Phase 1's Spec 1.10 cutover, the Railway frontend Dockerfile already exposes `VITE_API_BASE_URL` via `ARG VITE_API_BASE_URL` + `ENV VITE_API_BASE_URL=$VITE_API_BASE_URL`, and Spec 2.9 either added `VITE_USE_BACKEND_ACTIVITY` to the same pattern or documented the gap. Verify whether the new flags need the same Dockerfile wiring during the manual prod cutover step.

### D) The backend endpoints

All five Phase 2.5 endpoints (4 friends + 4 social) are live in dev:

- `POST /api/v1/users/me/friend-requests`
- `PATCH /api/v1/friend-requests/{id}`
- `DELETE /api/v1/users/me/friends/{friendId}`
- `POST /api/v1/users/me/blocks`
- `POST /api/v1/social/encouragements`
- `POST /api/v1/social/nudges`
- `POST /api/v1/social/recap-dismissal`

(Plus `GET /api/v1/users/search` and `GET /api/v1/users/me/friends` and the two `GET /api/v1/users/me/friend-requests` variants — read endpoints exposed but not consumed by the dual-write wave.)

All require Bearer JWT. All persist to the four Phase 2.5 tables (`friend_relationships`, `friend_requests`, `social_interactions`, `milestone_events`).

### E) Existing cutover checklist (Phase 2)

`_plans/forums/phase02-cutover-checklist.md` is the format precedent. CC reads it during recon to match structure (numbered H2 sections with checkbox items, sign-off section at the end, inline notes for deviations). The Phase 2.5 checklist mirrors this structure, scoped to friends/social dual-write activation and milestone emission verification.

### F) CLAUDE.md update — DECIDED: NO EDIT NEEDED

Same reasoning as Spec 2.9's Recon F. Phase 2.5 is not closed yet (Specs 2.5.6 Block User and 2.5.7 Mute User remain). Adding a Phase 2.5 summary now would be premature. When Phase 2.5 fully closes (after 2.5.7), a hygiene update can add a Phase 2.5 summary line.

**Resolution:** leave CLAUDE.md unchanged in this spec.

### G) Vite config check

Per Spec 2.9's Recon G + Architectural Decision #5, `vite.config.ts` doesn't encode application-env defaults. The `.env.example` flip + Railway env vars are the authoritative locations. Recon during execution should `grep -n VITE_USE_BACKEND_FRIENDS frontend/vite.config.ts` and `grep -n VITE_USE_BACKEND_SOCIAL frontend/vite.config.ts` — both should return zero matches.

### H) `_cutover-evidence/` directory state

The directory contains Phase 1 + Phase 2 a11y evidence already (`phase1-a11y-smoke.json`, `phase2-a11y-smoke.json`, `phase2-a11y-notes.md`). The Phase 2.5 evidence files (`phase02-5-a11y-smoke.json` + `phase02-5-a11y-notes.md`) join the same directory. Eric can adapt `capture-axe-evidence.mjs` to add Phase 2.5 routes (which is the same set as Phase 2's, since Phase 2.5 doesn't add new UI routes).

### I) Phase 2.5 didn't add new UI routes

Verify during recon: Phase 2.5 (Specs 2.5.1–2.5.4b) added no new frontend routes. Friends UI, social interaction UI, milestone feed UI — all existed before Phase 2.5 (built in earlier waves; Phase 2.5 only wired backend dual-write to existing UI). The a11y smoke scope is therefore: confirm existing routes still scan clean. Same as Phase 2.

---

## Architectural Decisions

### 1. Two simultaneous flag flips, not staggered

Per Divergence 1. Atomic cutover. Both flags go from `false` to `true` in a single commit.

### 2. The manual smoke test is load-bearing

Same as Spec 2.9's Architectural Decision #2. Vitest tests in 2.5.4 and 2.5.4b mock the backend. Nothing in the committed test suite verifies that an actual HTTP call from the frontend reaches the actual backend with the actual JWT and gets persisted to actual Postgres for friends/social mutations.

The smoke test fills that gap. Eric must run it before the cutover commit lands, and the checklist must capture the test results.

### 3. Checklist document is the deliverable

Same as Spec 2.9. The cutover checklist at `_plans/forums/phase02-5-cutover-checklist.md` is itself a deliverable — not just internal scaffolding. It serves as the audit trail for Phase 2.5 partial-completion (Specs 2.5.1–2.5.5) and as the template for Phase 3 cutover.

The checklist covers:

- Pre-flight checks (Docker, backend, frontend, dev DB, two seed users for friend-flow testing)
- Code change (two flag flips)
- Build verification (frontend builds with flags on)
- Manual smoke test (friends mutations + social mutations + milestone emission verification)
- Backend persistence verification (psql queries against the four Phase 2.5 tables)
- localStorage canonicality verification (UI still reflects mock-data + localStorage-derived state)
- A11y smoke per Universal Rule 17
- Production deploy plan (Railway env vars, Dockerfile patch if needed, build, smoke in prod)
- Rollback plan (set flags back to false; deploy)
- Sign-off

### 4. Rollback is defined explicitly

Same as Spec 2.9's Architectural Decision #4. If prod cutover surfaces a problem, rollback is:

- Set `VITE_USE_BACKEND_FRIENDS=false` and `VITE_USE_BACKEND_SOCIAL=false` in Railway
- Trigger a redeploy
- Fail-closed env check means dual-write stops immediately on next page load
- localStorage data unaffected — users see no difference
- Backend rows already written stay in DB; shadow data with no consumer

**Important:** the milestone events emitted backend-side during the cutover window are NOT affected by rollback. They were emitted by `ActivityService` (always-on, gated only by Phase 2's flag) and `FriendsService.acceptRequest` (always-on, fires whenever a real friend acceptance happens server-side). Even after rollback, Phase 2 activity dual-writes continue triggering milestone emissions. This is fine — milestones are derived signals; their continued emission isn't a "rollback" concern.

### 5. No forced flips in vite.config.ts, env.ts docstrings, or CLAUDE.md

Per Architectural Decisions 5, 6, 7 from Spec 2.9. Same reasoning. The `.env.example` flip + Railway env vars are authoritative; the `lib/env.ts` docstrings stay as written (courtesy update only); CLAUDE.md gets its summary after the full Phase 2.5 wave closes.

### 6. No scope creep

This spec does NOT:

- Promote backend reads to source-of-truth for friends or social (future spec, likely Phase 7+)
- Backfill historical friends data from localStorage (no analogue to Phase 2's Spec 2.10; mock-data UUIDs in `wr_friends` localStorage don't map to real backend users — no backfill possible)
- Reconcile localStorage vs backend drift (no reconciliation exists yet)
- Add monitoring/dashboarding for the new endpoints beyond what Spec 1.10d already provides
- Add per-user rate limiting on friends endpoints (Spec 10.9 territory; deferred per Spec 2.5.3's Divergence 1)
- Modify backend code in any package
- Update docstrings in `lib/env.ts`

---

## Deliverables

### Files to modify

- **`frontend/.env.example`** — flip `VITE_USE_BACKEND_FRIENDS` from `false` to `true`. Flip `VITE_USE_BACKEND_SOCIAL` from `false` to `true`. Update both surrounding comment blocks to reflect cutover happened (e.g., "Activated by Spec 2.5.5 cutover on 2026-04-27.").

### Files to create

- **`_plans/forums/phase02-5-cutover-checklist.md`** — full cutover checklist per Architectural Decision #3. Modeled on `_plans/forums/phase02-cutover-checklist.md`. Sections enumerated in the "Deliverable Structure" section below.
- **`_cutover-evidence/phase02-5-a11y-smoke.json`** — placeholder file noting that Eric authors the real axe-core output during smoke-test execution. CC creates only a scaffold; the actual scan runs against the deployed (or local) frontend.
- **`_cutover-evidence/phase02-5-a11y-notes.md`** — placeholder file with the structure for Eric to fill in during keyboard + VoiceOver spot-checks.

### Files NOT to modify

- `vite.config.ts` (per Architectural Decision #5)
- `CLAUDE.md` (per Architectural Decision #5)
- `frontend/src/lib/env.ts` (the `isBackendFriendsEnabled` and `isBackendSocialEnabled` docstrings stay — courtesy update only, not in scope per Architectural Decision #5)
- `frontend/src/hooks/useFriends.ts` (Spec 2.5.4's wiring is correct as-is)
- `frontend/src/hooks/useSocialInteractions.ts` (Spec 2.5.4b's wiring is correct as-is)
- `backend/**` (zero backend changes — purely a frontend flag flip + documentation)
- `openapi.yaml`
- `master.xml` or any Liquibase changeset
- Any test file (the manual smoke test produces evidence that lives in `_cutover-evidence/`, not in test code)
- `_forums_master_plan/spec-tracker.md` — Eric flips rows manually after commit

---

## Deliverable Structure — `phase02-5-cutover-checklist.md`

Required sections (CC writes the document; Eric works through the checkboxes during execution):

```markdown
# Phase 2.5 Cutover Checklist — Friends + Social Dual-Write

**Purpose:** Activate the dual-write paths so backend friends + social tables receive real production traffic. Also serves as first end-to-end verification of backend-side milestone event emission (introduced by Spec 2.5.4b).

**Phase 2.5 status before this spec:** 5/8 specs complete (2.5.1–2.5.4b). 2.5.5 (this) is the activation. 2.5.6 (block UX) and 2.5.7 (mute UX) remain after.

## Overview
- 1-2 paragraphs: what Phase 2.5 delivered (4 backend tables, 2 services, 8 endpoints, 2 frontend hook wirings, milestone event emission integration into ActivityService and FriendsService), why this cutover happens now (drift detection from Phase 2 covers the activity engine; friends/social dual-write has no drift detection but the surface area is small and well-tested), what changes for users (nothing visible) and for the backend (real friends + social traffic, plus milestone events fire from real user actions).

## Pre-flight checks
- [ ] On forums-wave-continued branch
- [ ] Working tree clean (git status returns nothing pending)
- [ ] Docker running
- [ ] Backend Postgres container running (docker-compose up)
- [ ] Backend `./mvnw spring-boot:run` succeeds and serves on :8080
- [ ] /api/v1/health returns 200
- [ ] Frontend `pnpm dev` succeeds and serves on :5173
- [ ] You can log in with TWO dev seed users (e.g., dev1@worshiproom.com and dev2@worshiproom.com — friends flow needs two real users)
- [ ] VITE_USE_BACKEND_ACTIVITY=true is set (Phase 2 cutover already done; needed for milestone emission verification)

## Code change
- [ ] Flip VITE_USE_BACKEND_FRIENDS=true in frontend/.env.example
- [ ] Flip VITE_USE_BACKEND_SOCIAL=true in frontend/.env.example
- [ ] Update comment blocks: "Activated by Spec 2.5.5 cutover on <date>"
- [ ] Set both vars to true in your local frontend/.env.local
- [ ] Restart frontend dev server (Vite env vars are build-time)

## Build verification
- [ ] `pnpm tsc --noEmit` clean
- [ ] `pnpm lint` clean
- [ ] `pnpm build` clean
- [ ] `pnpm test` clean (Vitest unit tests still pass with both flags = true; baseline matches post-2.5.4b count)

## Manual smoke test — friends mutations (between two real users)

For this section: log in as dev1@ in browser tab A, dev2@ in browser tab B (incognito or different browser). Both users are real backend users (Spec 1.8 dev seed) so friends mutations will land real backend rows.

### Smoke 1: Send friend request
- [ ] In tab A (dev1), find dev2 via friend search OR add them manually if search doesn't surface seed users
- [ ] Tap "Send Friend Request"
- [ ] Backend `friend_requests` row inserted with `from_user_id=dev1, to_user_id=dev2, status='pending'` (verify via psql query in Backend Verification Queries section)
- [ ] Local outgoing request gets `backendId` populated (verify via DevTools → Application → LocalStorage → wr_friends → pendingOutgoing[0].backendId is a UUID)
- [ ] If sending to a mock-data user (not a real seed user), backend returns 404 USER_NOT_FOUND — log shows `[useFriends] backend sendRequest dual-write failed:` warning, localStorage state still updates as expected. Document this expected behavior here.

### Smoke 2: Accept friend request
- [ ] In tab B (dev2), see incoming request from dev1
- [ ] Tap "Accept"
- [ ] Backend `friend_requests` row updates: `status='accepted'`, `responded_at` set
- [ ] Backend creates TWO `friend_relationships` rows: (dev1, dev2, active) and (dev2, dev1, active)
- [ ] Backend emits `milestone_events` row with `event_type='FRIEND_MILESTONE'` IF dev2's friend count crosses a threshold (likely "first friend" — depends on whether other accepted friendships exist for dev2)

### Smoke 3: Send encouragement
- [ ] In tab A (dev1), tap "Encourage" on dev2's profile or activity
- [ ] Choose preset message
- [ ] Backend `social_interactions` row inserted with `from_user_id=dev1, to_user_id=dev2, interaction_type='encouragement', payload={"message": "..."}`
- [ ] Local `wr_social_interactions.encouragements` array gets a new entry

### Smoke 4: Send nudge
- [ ] In tab A (dev1), tap "Nudge" on dev2's profile
- [ ] Backend `social_interactions` row inserted with `interaction_type='nudge'`
- [ ] Local `wr_social_interactions.nudges` array gets a new entry

### Smoke 5: Dismiss recap
- [ ] In tab A (dev1), dismiss the weekly recap card (if present this week)
- [ ] Backend `social_interactions` row inserted with `interaction_type='recap_dismissal', from_user_id=dev1, to_user_id=dev1, payload={"weekStart": "..."}`
- [ ] Local `wr_social_interactions.recapDismissals` array gets the weekStart

### Smoke 6: Decline friend request (separate flow)
- [ ] Have dev2 send a NEW friend request to dev1 (or use an unaccepted one if available)
- [ ] In tab A (dev1), tap "Decline"
- [ ] Backend `friend_requests` row updates: `status='declined'`, `responded_at` set
- [ ] No `friend_relationships` rows created
- [ ] Verify the FULL UNIQUE constraint by attempting another send from dev2 to dev1 — should fail with 409 DUPLICATE_FRIEND_REQUEST (document the warning in console; localStorage state should still update locally because the storage-layer dedupe also kicks in)

### Smoke 7: Remove friend
- [ ] After Smoke 2 (dev1 and dev2 are friends), in tab A tap "Remove Friend" on dev2
- [ ] Backend deletes BOTH `friend_relationships` rows in one operation
- [ ] Local `wr_friends.friends` array no longer contains dev2

### Smoke 8: Block user
- [ ] In tab A (dev1), tap "Block" on dev2 (Phase 2.5.6 will formalize this UX; for now, exercise whatever Block trigger exists)
- [ ] Backend inserts single `friend_relationships` row: (dev1, dev2, blocked)
- [ ] Backend deletes any pending `friend_requests` between dev1 and dev2 (per 2.5.2's Divergence 3 + 2.5.6 mention)

## Manual smoke test — milestone emission verification

This is the broader scope per Divergence 3.

### Smoke 9: Level-up milestone (via Phase 2 dual-write path)
- [ ] As dev1, perform enough activities to cross a level threshold (use seed user with near-threshold faith_points if dev seed allows; otherwise this smoke is "best-effort" and may need to be deferred to natural usage)
- [ ] Backend `milestone_events` row inserted with `event_type='LEVEL_UP'`, `metadata={"newLevel": N}`
- [ ] Emission timing: should be inside the same transaction as the activity record (check `occurred_at` matches `activity_log.occurred_at` within milliseconds)

### Smoke 10: Streak milestone (via Phase 2 dual-write path)
- [ ] If dev1's current_streak is at a threshold-1 value, perform an activity to push to threshold
- [ ] Backend `milestone_events` row inserted with `event_type='STREAK_MILESTONE'`, `metadata={"streakDays": N}`
- [ ] Note: streak emission is a "best-effort" smoke if seed data doesn't naturally land at threshold-1; document outcome.

### Smoke 11: Friend milestone (already verified in Smoke 2)
- [ ] Confirm `event_type='FRIEND_MILESTONE'` row exists from Smoke 2 (dev2 accepting dev1's request crosses dev2's "first friend" threshold)

## Backend verification queries

Run via `psql` against the dev DB:

\`\`\`sql
-- Most recent friend_requests rows
SELECT id, from_user_id, to_user_id, status, created_at, responded_at
FROM friend_requests
ORDER BY created_at DESC
LIMIT 10;

-- Most recent friend_relationships rows
SELECT user_id, friend_user_id, status, created_at
FROM friend_relationships
ORDER BY created_at DESC
LIMIT 10;

-- Most recent social_interactions rows
SELECT id, from_user_id, to_user_id, interaction_type, payload, created_at
FROM social_interactions
ORDER BY created_at DESC
LIMIT 20;

-- Most recent milestone_events rows
SELECT id, user_id, event_type, event_metadata, occurred_at
FROM milestone_events
ORDER BY occurred_at DESC
LIMIT 20;

-- Find dev seed user UUIDs
SELECT id, email FROM users WHERE email IN ('dev1@worshiproom.com', 'dev2@worshiproom.com');
\`\`\`

## localStorage canonicality verification
- [ ] Refresh the frontend page after the smoke test
- [ ] All UI elements (friends list, pending requests, recent encouragements, milestone feed) reflect the SAME state that was visible before the refresh
- [ ] Confirms localStorage is still source of truth for reads — backend traffic is shadow only

## Accessibility smoke (Universal Rule 17)
- [ ] Run axe-core automated scan on /, /daily, /prayer-wall, /profile (if friends UI lives there), and any friends-specific routes (Phase 2.5 added no new routes per Recon I — scope is "verify existing routes still scan clean")
- [ ] Save axe-core JSON output to _cutover-evidence/phase02-5-a11y-smoke.json (replace placeholder content)
- [ ] Zero CRITICAL violations across the scanned routes
- [ ] Keyboard-only walkthrough of the friends primary flow (open friends panel → send request → accept request) completes without dead-ends
- [ ] VoiceOver spot-check on encouragement-send interaction completes without blocking issues
- [ ] Brief notes saved to _cutover-evidence/phase02-5-a11y-notes.md (replace placeholder content)

## Production deploy plan
- [ ] Verify Railway frontend Dockerfile exposes both VITE_USE_BACKEND_FRIENDS and VITE_USE_BACKEND_SOCIAL via ARG + ENV before RUN pnpm build (mirror VITE_USE_BACKEND_ACTIVITY pattern from Spec 2.9 cutover). If missing, add a one-line Dockerfile patch for each.
- [ ] Add VITE_USE_BACKEND_FRIENDS=true to Railway frontend service env vars (Variables tab → + New Variable)
- [ ] Add VITE_USE_BACKEND_SOCIAL=true to Railway frontend service env vars
- [ ] Trigger a Railway deploy (push to main, or manual deploy)
- [ ] After deploy completes: smoke test ONE friend request flow in prod between two real accounts (verify backend received the row via `railway connect postgres`)
- [ ] If prod smoke test fails: see Rollback plan below

## Rollback plan (if prod surfaces issues)

If anything goes wrong in production after the deploy:

1. Set VITE_USE_BACKEND_FRIENDS=false AND VITE_USE_BACKEND_SOCIAL=false in Railway frontend service env vars
2. Trigger a redeploy (or wait for next auto-deploy)
3. Verify in DevTools that subsequent friend mutations no longer fire backend POSTs/PATCHes/DELETEs
4. Verify subsequent social interactions no longer fire backend POSTs
5. localStorage data is untouched; users see no difference
6. Backend rows already written remain (shadow data, no consumer)
7. Backend-side milestone emissions continue (gated by Phase 2's flag, not Phase 2.5's) — this is by design and not a rollback concern
8. Open a followup entry in `_plans/post-1.10-followups.md` describing what failed
9. Do NOT revert the spec's commit. The flag flips stay; the env var override is the rollback mechanism.

## Sign-off
- Cutover date: ____________
- Eric's sign-off: ____________
- Local smoke test passed: ____________
- Production smoke test passed: ____________
- A11y evidence committed: ____________
- Phase 2.5 status: PARTIAL — 6/8 specs complete (2.5.1–2.5.5). Remaining: 2.5.6 (Block UX), 2.5.7 (Mute UX).
```

(Note: the SQL fenced code blocks above are escaped with backslash-backtick because they live inside the spec's outer fenced markdown block; the actual checklist file uses plain triple-backtick fences.)

---

## Tests Required

This spec has NO automated tests. Same as Spec 2.9. The deliverable is two flag flips + a manual checklist + manual smoke evidence. Adding automated tests for flag flips is busywork.

Vitest tests authored in 2.5.4 and 2.5.4b already verify both flag states for each hook. Nothing else to test in code.

The smoke test results are captured in `_cutover-evidence/phase02-5-a11y-smoke.json` and `_cutover-evidence/phase02-5-a11y-notes.md`. Those files are the evidence; they're not "tests" in the executable sense.

---

## Out of Scope

- Promoting backend reads to source-of-truth for friends or social (future spec)
- Historical friends backfill from localStorage (mock-data UUIDs don't map to real backend users; no backfill possible — different from Phase 2's Spec 2.10)
- Reconciliation between divergent localStorage and backend friends state (no reconciliation exists yet)
- Endpoint-specific monitoring/dashboarding (Spec 1.10d's Sentry covers exception capture)
- Adding per-user rate limiting on friends endpoints (Spec 10.9 territory; deferred per 2.5.3's Divergence 1)
- Block UX formalization (Spec 2.5.6)
- Mute UX (Spec 2.5.7)
- Migrating other localStorage features (prayer wall, etc.) — Phase 3+ territory
- Authoring a "rollback test" — manual Railway env var change is the rollback; nothing to automate
- Updating the `isBackendFriendsEnabled` / `isBackendSocialEnabled` docstrings (per Architectural Decision #5)
- Updating CLAUDE.md (per Architectural Decision #5)
- Vite config changes (per Architectural Decision #5)
- Backend changes
- Drift detection between frontend friends/social logic and backend (Phase 2.5 has no analogue to Spec 2.8's drift detection — by design, since friends/social have less complex shared logic than the activity engine)

---

## Acceptance Criteria

- [ ] `frontend/.env.example` has `VITE_USE_BACKEND_FRIENDS=true`
- [ ] `frontend/.env.example` has `VITE_USE_BACKEND_SOCIAL=true`
- [ ] Comment blocks above both flags updated to reflect cutover (e.g., "Activated by Spec 2.5.5 cutover on 2026-04-27.")
- [ ] `_plans/forums/phase02-5-cutover-checklist.md` exists with the full structure listed in "Deliverable Structure" above
- [ ] `_cutover-evidence/phase02-5-a11y-smoke.json` exists as a placeholder noting Eric authors real content during smoke-test execution
- [ ] `_cutover-evidence/phase02-5-a11y-notes.md` exists as a placeholder noting Eric records keyboard + VoiceOver outcomes during smoke-test execution
- [ ] CLAUDE.md unchanged (per Architectural Decision #5 and Recon F)
- [ ] `vite.config.ts` unchanged (per Architectural Decision #5 and Recon G)
- [ ] `frontend/src/lib/env.ts` unchanged (per Architectural Decision #5)
- [ ] No backend changes
- [ ] No `openapi.yaml` changes
- [ ] No `master.xml` or schema changes
- [ ] No test file changes
- [ ] All Phase 2.5 deliverables (2.5.1–2.5.4b) unchanged
- [ ] Build still succeeds (`pnpm build`) with both flags = true
- [ ] All existing Vitest tests still pass with both flags = true (baseline matches post-2.5.4b count; any NEW failing file is a regression)
- [ ] Spec tracker (`_forums_master_plan/spec-tracker.md`) NOT modified (Eric flips rows manually after commit)
- [ ] Branch unchanged (still `forums-wave-continued`)

---

## Guardrails (DO NOT)

- Do **NOT** change branches. Stay on `forums-wave-continued`.
- Do **NOT** modify any backend file.
- Do **NOT** modify `openapi.yaml`.
- Do **NOT** modify `master.xml` or any Liquibase changeset.
- Do **NOT** modify any Phase 2.5 service, entity, repository, or test file.
- Do **NOT** modify `hooks/useFriends.ts` (Spec 2.5.4's wiring is correct as-is).
- Do **NOT** modify `hooks/useSocialInteractions.ts` (Spec 2.5.4b's wiring is correct as-is).
- Do **NOT** modify `lib/env.ts` (Spec 2.5.4 + 2.5.4b's helpers are correct as-is; the docstrings are courtesy updates, not deliverables).
- Do **NOT** modify `lib/api-client.ts` or any `services/api/*` file.
- Do **NOT** modify `vite.config.ts` (recon must verify zero references).
- Do **NOT** modify `CLAUDE.md` (Phase 2.5 is not closed yet; summary belongs in a post-2.5.7 hygiene update).
- Do **NOT** add automated tests for the flag flips.
- Do **NOT** flip only one flag (Divergence 1 — atomic cutover).
- Do **NOT** promote backend reads to source-of-truth for friends or social.
- Do **NOT** add reconciliation logic between localStorage and backend.
- Do **NOT** add endpoint monitoring/dashboarding.
- Do **NOT** add rate limiting.
- Do **NOT** execute the manual smoke test (CC can document the steps but cannot operate the dev frontend interactively to actually run the test). Eric runs it.
- Do **NOT** generate the `_cutover-evidence/*` files with fake axe-core JSON output. Eric runs the scans; CC creates only placeholder scaffolds.
- Do **NOT** commit, push, or do any git operation. Eric handles all git.
- Do **NOT** touch `_forums_master_plan/spec-tracker.md`.
- Do **NOT** touch the milestone-emission code paths in `ActivityService` or `FriendsService` (those are 2.5.4b deliverables, working as designed).

---

## Plan Shape Expectation

`/plan-forums` output for this S/Medium spec should be **6-8 steps**:

1. Recon: read `frontend/.env.example`, `frontend/src/lib/env.ts` (specifically the `isBackendFriendsEnabled` and `isBackendSocialEnabled` helpers added by 2.5.4 and 2.5.4b), `_plans/forums/phase02-cutover-checklist.md`, `CLAUDE.md`. Search `vite.config.ts` for any references to either flag (verify zero matches). Confirm CLAUDE.md edit decision (recon already says no). Verify the actual flag names committed by 2.5.4b — if they differ from `VITE_USE_BACKEND_SOCIAL`, adjust accordingly.
2. Flip `VITE_USE_BACKEND_FRIENDS=false → true` in `frontend/.env.example`. Update the surrounding comment block.
3. Flip `VITE_USE_BACKEND_SOCIAL=false → true` (or whatever 2.5.4b's actual flag name is) in `frontend/.env.example`. Update the surrounding comment block.
4. Skip CLAUDE.md edit (per recon decision and Architectural Decision #5).
5. Author `_plans/forums/phase02-5-cutover-checklist.md` per the structure in "Deliverable Structure" above. Use the actual friend/social mutation paths Phase 2.5 wired.
6. Create placeholder/scaffold versions of `_cutover-evidence/phase02-5-a11y-smoke.json` and `_cutover-evidence/phase02-5-a11y-notes.md`.
7. Run `pnpm build` to verify the flag flips don't break the build. Run `pnpm test` to verify Vitest tests still pass at the post-2.5.4b baseline.
8. Self-review against acceptance criteria.

If the plan comes back with 12+ steps, proposes modifying any backend file, proposes adding automated tests for the flag flips, proposes `vite.config.ts` changes without recon evidence, proposes generating fake a11y evidence, proposes a CLAUDE.md edit, or proposes a `lib/env.ts` docstring update — push back hard.

---

## Notes for Eric

- **Smallest spec of Phase 2.5 by code change. Largest by ceremony.** Same as Spec 2.9. The cutover checklist is THE deliverable; the two flag flips are two-line changes.

- **Pre-execution checklist:** Docker should be running so the build verification step can confirm clean. The MANUAL smoke test phase requires Docker, Postgres up, backend running, frontend running, AND TWO logged-in dev users in two browser sessions (the friends flow needs a real sender + real recipient — mock-data UUIDs can't accept friend requests because they don't have backend rows).

- **Plan 45-60 minutes for the manual smoke walkthrough.** Slightly longer than Phase 2's because there are more flows (8 friend/social mutation smokes + 3 milestone emission verifications vs. Phase 2's 5 activity smokes), and some milestone-emission smokes may require seed-data setup or "best-effort, defer if seed isn't at threshold."

- **The a11y evidence files are authored DURING the smoke test, not by CC.** Same as Phase 2. Adapt `_cutover-evidence/capture-axe-evidence.mjs` from prior phases — Phase 2.5 routes are the same set since no new UI shipped.

- **The Railway production env var step is a separate manual task you do after committing this spec.** Two new vars to add this time. May also need Dockerfile patches mirroring the `VITE_API_BASE_URL` pattern.

- **If the smoke test surfaces ANY problem** (backend rejects a request unexpectedly, JWT auth fails, milestone emission doesn't fire when expected), DO NOT commit this spec. Open a followup, fix the underlying issue first, retry the smoke test, then commit.

- **Phase 2.5 status after this spec ships:** 6/8 done. Specs 2.5.6 (Block User Feature, M-sized) and 2.5.7 (Mute User Feature, S-sized) remain. After those ship, Phase 2.5 fully closes and CLAUDE.md gets a Phase 2.5 summary in a hygiene update.

- **The Friends + Social cutover is more interesting than Phase 2's because it's the first time backend-side milestone emission runs end-to-end.** Phase 2's cutover proved activity-engine dual-write; Phase 2.5's cutover proves the ActivityService → MilestoneEventsService and FriendsService → MilestoneEventsService backend-side emission paths from 2.5.4b's Divergence 1. Smokes 9–11 are the verification of that — easy to skip but they're the highest-signal smokes in the checklist.

- **Tracker note:** the spec tracker shows 2.5.4 and 2.5.4b as ⬜ at the time of this brief authoring; Eric flips them ✅ manually after the respective specs ship. By the time this spec executes, both should be ✅ — recon should verify before proceeding.
