# Phase 2 Cutover Checklist — Activity Engine Dual-Write

**Purpose:** Activate the dual-write path so backend activity tables receive real production traffic alongside the existing localStorage writes.
**Phase 2 status before this spec:** 8/10 specs complete (2.1–2.8). Spec 2.9 (this) is the activation. Spec 2.10 (historical backfill) is the close.
**Cutover date:** _____________ (Eric fills in)

---

## Overview

Phase 2 delivered the backend Activity Engine — five tables (`activity_log`, `faith_points`, `streak_state`, `user_badges`, `activity_counts`), four pure-calculation services (faith points, streaks, badges, counts), one endpoint (`POST /api/v1/activity`), and one frontend hook change (`useFaithPoints.recordActivity` dual-writes when `VITE_USE_BACKEND_ACTIVITY=true`). Drift detection (Spec 2.8) shipped a fixture-driven parity test at `_test_fixtures/activity-engine-scenarios.json` that runs both implementations against shared scenarios and asserts agreement.

This cutover flips `VITE_USE_BACKEND_ACTIVITY` from `false` to `true` so dual-write fires by default in dev and prod. Reads remain localStorage-canonical — backend rows written here are shadow data with no user-facing consumer until a future "promote backend reads" spec ships. For users, nothing visible changes. For the backend, this is the first time `/api/v1/activity` receives real traffic from a real frontend feature.

---

## 1. Pre-flight checks

- [ ] On `forums-wave-continued` branch
- [ ] Working tree clean (`git status` returns nothing pending beyond the Spec 2.9 changes)
- [ ] Docker running
- [ ] Backend Postgres container running (`docker-compose up`)
- [ ] Backend dev server running (`./mvnw spring-boot:run`) and serving on `:8080`
- [ ] `/api/v1/health` returns 200 with provider readiness JSON
- [ ] Frontend dev server running (`pnpm dev`) and serving on `:5173`
- [ ] Logged in as a dev seed user (e.g., `dev1@worshiproom.com`) with a valid JWT in `wr_jwt_token`

---

## 2. Code change

- [ ] Flip `VITE_USE_BACKEND_ACTIVITY=true` in `frontend/.env.example` (CC has done this in Step 1 of the plan; Eric verifies)
- [ ] Update the comment block above the flag to reflect post-cutover state (CC has done this in Step 1 of the plan; Eric verifies)
- [ ] Set `VITE_USE_BACKEND_ACTIVITY=true` in local `frontend/.env.local` (Eric does this manually because `.env.local` is gitignored — CC does NOT touch it)
- [ ] Restart the frontend dev server so Vite re-reads the env var (Vite env vars are baked at build time; restart is required for the new value to take effect)

---

## 3. Build verification

- [ ] `pnpm tsc --noEmit` clean (zero new TypeScript errors)
- [ ] `pnpm lint` clean (zero new lint errors)
- [ ] `pnpm build` clean (production build succeeds with the flag set to `true`)
- [ ] `pnpm test` clean — Vitest baseline 8,811 pass / 11 known-fail; any NEW failing file or fail count > 11 is a regression

---

## 4. Manual smoke test — 5 activity types

For each activity below: tap or use the feature in the dev frontend, then verify backend persistence via the SQL queries in Section 5. Open browser DevTools → Network tab → filter to `/api/v1/activity` to confirm the POST fires alongside the localStorage write.

### Smoke 1: Pray

- [ ] Tap the "Pray" button on a Prayer Wall card (or use the Pray tab on Daily Hub)
- [ ] DevTools → Application → LocalStorage → `wr_daily_activities` shows today's `pray=true` flag
- [ ] DevTools → Network shows `POST /api/v1/activity` returning 200 (or 204) with the JWT in the `Authorization: Bearer ...` header
- [ ] Backend `activity_log` row inserted (verify via Section 5 query)
- [ ] Backend `activity_counts.pray` incremented by 1
- [ ] Backend `faith_points.total_points` reflects the new total
- [ ] Backend `streak_state` row updated for the current user

### Smoke 2: Journal

- [ ] Save a journal entry from the Daily Hub Journal tab (any mode — Guided or Free Write)
- [ ] Backend `activity_log` row inserted with `activity_type='journal'` (and `source_feature='journal'` per Spec 2.7's vocabulary)
- [ ] `activity_counts.journal` incremented by 1
- [ ] `faith_points.total_points` reflects the journal points contribution

### Smoke 3: Meditate

- [ ] Complete a meditation session — any of the 6 types (Breathing, Soaking, Gratitude, ACTS, Psalms, Examen)
- [ ] Backend `activity_log` row inserted with `activity_type='meditate'` (and `source_feature='meditate'`)
- [ ] `activity_counts.meditate` incremented by 1

### Smoke 4: Bible (chapter complete)

- [ ] Mark a chapter as read (verify which trigger fires the activity — chapter visit on BibleReader mount, or reading-plan day complete)
- [ ] Backend `activity_log` row appears with `source_feature='bible'` or `'reading_plan'` per Spec 2.7's vocabulary — capture the actual value observed

### Smoke 5: Music (listen completion)

- [ ] Listen to a track to completion in the AudioDrawer
- [ ] Backend `activity_log` row inserted with `activity_type='listen'` (and `source_feature='music'`)
- [ ] **NOTE:** Per Spec 2.7 followup, the listen path may use the `wr:activity-recorded` event bypass instead of calling `useFaithPoints.recordActivity` directly. If no row appears, that is the documented gap — capture observed behavior here for future Spec 2.7-followup planning. Do NOT fix in this cutover.

---

## 5. Backend verification queries

Run these via `psql` against the dev DB. Substitute `<test-user-uuid>` with the actual UUID of the smoke-test user.

To find the test user UUID:

```sql
SELECT id, email FROM users WHERE email = 'dev1@worshiproom.com';
```

Most recent `activity_log` rows for the test user:

```sql
SELECT activity_type, source_feature, occurred_at, points_earned
FROM activity_log
WHERE user_id = '<test-user-uuid>'
ORDER BY occurred_at DESC
LIMIT 20;
```

Current `activity_counts` for the test user:

```sql
SELECT count_type, count_value, last_updated
FROM activity_counts
WHERE user_id = '<test-user-uuid>'
ORDER BY count_type;
```

Current `faith_points` for the test user:

```sql
SELECT total_points, current_level, last_updated
FROM faith_points
WHERE user_id = '<test-user-uuid>';
```

Current `streak_state` for the test user:

```sql
SELECT current_streak, longest_streak, last_active_date
FROM streak_state
WHERE user_id = '<test-user-uuid>';
```

Newly earned `user_badges` for the test user:

```sql
SELECT badge_id, earned_at, display_count
FROM user_badges
WHERE user_id = '<test-user-uuid>'
ORDER BY earned_at DESC;
```

---

## 6. localStorage canonicality verification

- [ ] Refresh the frontend page after the smoke test completes
- [ ] All UI elements (points total, streak counter, recent badges, daily activity card) reflect the SAME state visible immediately before the refresh
- [ ] Confirms localStorage is still the source of truth for reads — backend traffic remains shadow only until a future "promote backend reads" spec ships

---

## 7. Accessibility smoke (Universal Rule 17)

Phase 2 modified the `useFaithPoints.recordActivity` hook only — no new user-visible UI. Scope is "verify existing routes still scan clean," not net-new audit work. The capture script from Phase 1 (`_cutover-evidence/capture-axe-evidence.mjs`) can be adapted by extending its `ROUTES` constant to include the Phase 2 routes below.

- [ ] Run axe-core automated scan on `/`, `/daily`, `/prayer-wall`, `/bible`, `/music`
- [ ] Save axe-core JSON output to `_cutover-evidence/phase2-a11y-smoke.json` (replace the placeholder content created in Step 3 of the plan)
- [ ] Zero CRITICAL violations across the scanned routes (any non-CRITICAL findings recorded as follow-up entries in `_plans/post-1.10-followups.md`)
- [ ] Keyboard-only walkthrough of the daily hub primary flow (open Daily Hub → tap Pray → see activity recorded indicator) completes without dead-ends
- [ ] VoiceOver spot-check on Prayer Wall pray-button interaction completes without blocking issues
- [ ] Brief notes saved to `_cutover-evidence/phase2-a11y-notes.md` (replace the placeholder content created in Step 4 of the plan)

---

## 8. Production deploy plan

- [ ] Verify the Railway frontend Dockerfile exposes `VITE_USE_BACKEND_ACTIVITY` (mirror the `VITE_API_BASE_URL` pattern from Spec 1.10 — `ARG VITE_USE_BACKEND_ACTIVITY` + `ENV VITE_USE_BACKEND_ACTIVITY=$VITE_USE_BACKEND_ACTIVITY` before `RUN pnpm build`). If missing, add a one-line Dockerfile patch.
- [ ] Add `VITE_USE_BACKEND_ACTIVITY=true` to Railway frontend service env vars (Variables tab → "+ New Variable")
- [ ] Trigger a Railway deploy (push to `main`, or trigger a manual deploy from the dashboard)
- [ ] After deploy completes: smoke test 1 activity in prod (use a real account, tap Pray on Prayer Wall, verify backend received the row via `railway connect postgres` and the Section 5 queries)
- [ ] If the prod smoke test fails: see Rollback plan below

---

## 9. Rollback plan (if prod surfaces issues)

If anything goes wrong in production after the deploy:

1. Set `VITE_USE_BACKEND_ACTIVITY=false` in Railway frontend service env vars (Variables tab → existing variable → edit value)
2. Trigger a redeploy (or wait for the next auto-deploy to pick up the new value)
3. Verify in browser DevTools that subsequent `recordActivity` calls no longer fire `POST /api/v1/activity` — the fail-closed env check (`=== 'true'`) treats any non-`'true'` value as off
4. localStorage data is untouched; users see no difference
5. Backend rows already written remain in the database (shadow data with no consumer)
6. Open a followup entry in `_plans/post-1.10-followups.md` describing what failed, including the request ID from any `X-Request-Id` headers captured in the failure
7. Do NOT revert the spec's commit. The flag-flip stays in `.env.example`; the Railway env var override is the rollback mechanism

---

## 10. Sign-off

- Cutover date: _____________
- Eric's sign-off: _____________
- Local smoke test passed: _____________
- Production smoke test passed: _____________
- A11y evidence committed: _____________
- Phase 2 status: COMPLETE pending Spec 2.10 (historical backfill).
