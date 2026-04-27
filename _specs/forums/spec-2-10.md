# Forums Wave: Spec 2.10 — Historical Activity Backfill

**Master Plan Reference:** `_forums_master_plan/round3-master-plan.md` → Spec 2.10 (line 2843)
**Branch:** `forums-wave-continued` (stay on this branch — no per-spec sub-branch)
**Date:** 2026-04-27

---

## Affected Frontend Routes

N/A — backend-only spec for the user-visible surface. The frontend changes are confined to `frontend/src/services/activity-backfill.ts` (a new service module) and a wiring change inside `frontend/src/hooks/useFaithPoints.ts`. There is no UI surface, no banner, no progress indicator, no toast — backfill is silent infrastructure (per Architectural Decision #11). The `/verify-with-playwright` skill is therefore skipped for this spec.

The plan generated from this spec should inherit this section unchanged.

---

## Spec Header

- **ID:** `round3-phase02-spec10-historical-activity-backfill`
- **Size:** M
- **Risk:** Medium (touches users' existing localStorage history; read-only-from-localStorage is safe, but the write side on the backend must be idempotent across retries)
- **Prerequisites:** 2.9 (Phase 2 Cutover) ✅ — dual-write live in dev and prod. The cutover flipped `VITE_USE_BACKEND_ACTIVITY=true`, which means the backend now receives real activity traffic from real frontend `recordActivity` calls. Without 2.9 shipped, there is no reliable trigger point for the one-time backfill to fire.
- **Phase:** 2 — Activity Engine Migration (Dual-Write)
- **Tenth and final spec of Phase 2.** After this spec ships and the tracker flips, Phase 2 is 10/10 ✅. Phase 3 (Forums) starts next.

---

## Goal

Backfill each user's existing localStorage activity history to the backend shadow tables, ONCE, on first dual-write after Phase 2 cutover.

Without this, every user who had Phase 1 activity (points, streaks, badges) would appear "fresh" in the backend, and any future wave that promotes backend reads to source-of-truth would silently discard pre-cutover activity. A one-time idempotent backfill closes that door cleanly.

The frontend triggers the backfill automatically on the first dual-write after cutover (gated by a new `wr_activity_backfill_completed` localStorage flag). The backend persists the payload in a single `@Transactional` operation across five tables (`activity_log`, `faith_points`, `streak_state`, `user_badges`, `activity_counts`). UPSERT semantics make retries safe: if the user clears localStorage and the flag goes missing, a re-fired backfill produces the same final database state.

There is no UI surface. The user sees nothing. If backfill succeeds, the user keeps using the app as before. If it fails, the user keeps using the app as before — localStorage is still source of truth for reads.

---

## Master Plan Divergences

Three meaningful divergences from master plan v2.9 § Spec 2.10 (line 2843) worth pinning before drafting. The brief also adopts a fundamentally different upsert strategy (overwrite-and-DO-NOTHING rather than MAX-based) per the Architectural Decisions section below — that is the brief's authoritative approach for this spec.

### Divergence 1 — `wr_activity_counts` is NOT a separate localStorage key

The master plan body lists `wr_activity_counts` as one of the localStorage keys to backfill. **Verified during recon:** this key does not exist. The 14 activity counts live INSIDE `wr_badges` as the `activityCounts` field of the `BadgeData` object.

**Resolution:** the backfill payload reads counts from `wr_badges.activityCounts`, not from a non-existent `wr_activity_counts` key. The payload's `badges.activityCounts` sub-object carries the 14 counters; the backfill service writes those into the `activity_counts` table.

### Divergence 2 — `wr_streak_repairs` is NOT in scope for backfill

The master plan body lists `wr_streak_repairs` as one of the localStorage keys to send to the backend. Per **Spec 2.3 Divergence 3**, repair STATE persistence is not implemented on the backend — only eligibility CHECKING was ported. Spec 2.1's `streak_state` table has no repair columns.

**Resolution:** `wr_streak_repairs` is excluded from the backfill payload entirely. A future spec (when repair persistence ships) will add a separate one-time backfill for repair state at that time. The `BackfillRequest` DTO does NOT include a `streakRepairs` field.

### Divergence 3 — `activity_log` backfill uses synthetic `occurred_at` because localStorage doesn't store per-activity timestamps

The frontend's `wr_daily_activities` is shaped as `Record<dateString, DailyActivities>` — a date-keyed map of boolean activity flags, NOT a timestamped event log. So when backfilling, we don't have the actual moment-in-time when a user pressed pray on April 19th — only that they did pray on April 19th.

**Resolution:** synthesize an `occurred_at` for each backfilled `activity_log` row by combining the localStorage date with a fixed time of day (noon UTC anchored in the user's timezone — see Architectural Decision #3). This is honest about the limitation: backfilled rows reflect "this user had this activity on this date" without claiming the timestamp is accurate to the minute.

Real-time activity (post-cutover) gets accurate `occurred_at = NOW()` per Spec 2.6's behavior. Only the historical backfill rows get synthetic timestamps. The two row populations are distinguishable via `source_feature='backfill'` versus other values.

---

## Recon Facts (verified during brief authoring; re-verify suspect ones during execution)

### A) The five localStorage keys (verified)

From the four storage-services already read in earlier specs:

- **`wr_daily_activities`** — `Record<dateString, DailyActivities>` keyed by `YYYY-MM-DD`; each value is `{mood: bool, pray: bool, ..., pointsEarned: int, multiplier: number}` for the 12 activity flags plus 2 derived fields
- **`wr_faith_points`** — `{totalPoints: int, currentLevel: int, currentLevelName: string, pointsToNextLevel: int, lastUpdated: ISO string}`
- **`wr_streak`** — `{currentStreak: int, longestStreak: int, lastActiveDate: YYYY-MM-DD or null}`
- **`wr_badges`** — `{earned: Record<badgeId, {badgeId, earnedAt, displayCount}>, newlyEarned: string[], activityCounts: {pray: int, journal: int, ...14 counts}}`
- **`wr_streak_repairs`** — out of scope per Divergence 2; do not include

### B) Idempotency tracking — new localStorage key

A new localStorage key tracks whether backfill has completed:

- **`wr_activity_backfill_completed`** — boolean string (`'true'` or absent)

This key is set to `'true'` AFTER the backfill endpoint returns 200. If the user clears localStorage, the next dual-write after cutover will trigger a backfill again — the backend's UPSERT semantics make this safe (no duplicate `activity_log` rows because of the partial unique index, no double-counting because `faith_points`/`activity_counts` overwrite to localStorage values, and `user_badges` ON CONFLICT DO NOTHING).

This key MUST be documented in `.claude/rules/11-local-storage-keys.md` as part of this spec.

### C) The endpoint shape

```
POST /api/v1/activity/backfill
```

Authentication required (Bearer JWT). Request body:

```json
{
  "schemaVersion": 1,
  "userTimezone": "America/Chicago",
  "activityLog": {
    "2026-04-15": { "mood": true, "pray": true, "listen": false, "...": "..." },
    "2026-04-16": { "mood": false, "pray": true, "...": "..." }
  },
  "faithPoints": { "totalPoints": 1245, "currentLevel": 3, "...": "..." },
  "streak": { "currentStreak": 5, "longestStreak": 12, "lastActiveDate": "2026-04-26" },
  "badges": {
    "earned": {
      "first_prayer": { "badgeId": "first_prayer", "earnedAt": "2026-04-15T10:30:00Z", "displayCount": 1 },
      "streak_7":     { "badgeId": "streak_7",     "earnedAt": "2026-04-21T08:00:00Z", "displayCount": 1 }
    },
    "activityCounts": { "pray": 42, "journal": 18, "meditate": 7, "...": "..." }
  }
}
```

Response:

```json
{
  "data": {
    "activityLogRowsInserted": 31,
    "faithPointsUpdated": true,
    "streakStateUpdated": true,
    "badgesInserted": 5,
    "activityCountsUpserted": 14
  },
  "meta": { "requestId": "..." }
}
```

The response surfaces what was actually written so frontend logging is honest about what happened.

### D) Idempotency keys per table

For each table, an UPSERT keyed on stable identifying columns:

- **`activity_log`**: primary key is a UUID, not stable across retries. Need a different idempotency strategy — see Architectural Decision #2.
- **`faith_points`**: PK is `user_id`; backfill UPSERTS by `user_id` (overwrites the existing row with backfill values).
- **`streak_state`**: PK is `user_id`; same pattern.
- **`user_badges`**: composite PK `(user_id, badge_id)`; UPSERT — INSERT new, on conflict do nothing (don't decrement `display_count` on retry).
- **`activity_counts`**: composite PK `(user_id, count_type)`; UPSERT — set `count_value` to the localStorage value (NOT increment, this is a backfill-overwrite operation).

### E) Existing endpoint precedent

`POST /api/v1/activity` from Spec 2.6 is the closest precedent for shape. Same envelope, same auth, same controller+service split. Spec 2.10's controller/service mirror that pattern.

### F) The frontend trigger point

Spec 2.7's `recordActivity` `useCallback` fires the dual-write at the end of the function (after `persistAll`, `setState`, `window.dispatchEvent`). The backfill check goes in the SAME function, immediately BEFORE the dual-write call:

```ts
if (isBackendActivityEnabled() && isAuthenticated) {
  // Backfill check first (one-time, idempotent)
  if (!isBackfillCompleted()) {
    triggerBackfill().catch((err) => console.warn(...));
  }
  // Then the normal dual-write
  postActivityToBackend(type, sourceFeature).catch((err) => console.warn(...));
}
```

Both calls are fire-and-forget. They race; the backend handles both correctly:

- If backfill arrives first and dual-write second → backfill writes pre-cutover state, dual-write adds today's new event on top
- If dual-write arrives first and backfill second → dual-write writes today's event, backfill UPSERTS `faith_points`/`streak_state` to localStorage values (which include today's event since localStorage was just updated synchronously before either call fired). Backfill writes `activity_log` rows for HISTORICAL dates only — see Architectural Decision #2.

The race is benign because of UPSERT semantics + the synthetic-noon-timestamp restriction (backfill never inserts an `activity_log` row for today, only historical dates).

---

## Architectural Decisions

### 1. Backfill is a separate endpoint, not a parameter on `POST /api/v1/activity`

Two endpoints:

- `POST /api/v1/activity` (Spec 2.6) — single-event recording
- `POST /api/v1/activity/backfill` (Spec 2.10) — bulk one-time history import

**Why separate:**

- Different request shapes (single event vs. full history payload)
- Different transactional concerns (single row vs. dozens of rows in one transaction)
- Different idempotency strategies
- Different rate-limiting profiles (dual-write fires per activity; backfill fires once per user lifetime)

Combining them would require a complex polymorphic request body. Separation is cleaner.

### 2. `activity_log` idempotency via partial unique index on `(user_id, activity_type, occurred_at) WHERE source_feature = 'backfill'`

The `activity_log` table's primary key is a random UUID per row, which can't be used for idempotency across retries. Solution:

- Synthesize `occurred_at` as `<localStorage_date> 12:00:00` in the user's timezone (converted to UTC for storage). All historical rows for a given (user, type, date) get the SAME synthetic timestamp.
- The backfill endpoint uses `INSERT ... ON CONFLICT (user_id, activity_type, occurred_at) DO NOTHING`.
- This requires a UNIQUE constraint or partial index on `(user_id, activity_type, occurred_at)` limited to backfilled rows.

**Schema decision:** add a NEW partial unique index in a new Liquibase changeset:

```sql
CREATE UNIQUE INDEX activity_log_backfill_idempotency_idx
  ON activity_log (user_id, activity_type, occurred_at)
  WHERE source_feature = 'backfill';
```

The partial index only constrains backfill rows; real-time `recordActivity` calls (which use `NOW()` and are unique by virtue of nanosecond precision) are unaffected.

`source_feature = 'backfill'` is the marker. All historical rows get inserted with `source_feature: 'backfill'`. Real-time rows continue to use `'daily_hub'`, `'prayer_wall'`, etc.

This adds ONE Liquibase changeset (the partial unique index) — the only schema change in this spec.

### 3. Synthetic `occurred_at`: noon in the user's timezone

For historical backfill, synthesize each row's `occurred_at` as `localStorage_date 12:00:00` in the user's stored timezone (`users.timezone` from Spec 1.3b), converted to a UTC `Instant` for the `TIMESTAMP WITH TIME ZONE` column.

**Reasons:**

- Noon avoids edge cases at midnight (DST transitions, day boundary ambiguity)
- User-timezone-anchored is correct for "this user had pray on this date" semantics
- Reproducible across retries — same input produces same synthetic timestamp

**Implementation:**

```java
LocalDate date = LocalDate.parse(dateString);
ZoneId tz = ZoneId.of(user.getTimezone());
Instant occurredAt = date.atTime(12, 0).atZone(tz).toInstant();
```

The `userTimezone` field on the request body is informational/sanity-check only — the authoritative timezone is `users.timezone` from Spec 1.3b. If the request's `userTimezone` disagrees with the database, log a WARN and use the database value.

### 4. `activity_log` gets one row per `(date, activity_type)` where the boolean is true

For each date in `wr_daily_activities`, iterate the 12 activity booleans. For each one that's true, INSERT one `activity_log` row:

```
user_id        = authenticated user
activity_type  = the boolean field name (e.g., 'pray')
source_feature = 'backfill'
occurred_at    = synthetic noon timestamp per Decision 3
points_earned  = 0  (we don't have per-activity points from localStorage; the daily pointsEarned is for the whole day, not per activity)
metadata       = {"backfilled": true, "originalDate": "2026-04-15"}
```

`points_earned = 0` on the backfill rows because the daily total in localStorage covers all activities that day combined (multiplier × sum), not a per-activity attribution. The `faith_points` table gets the actual cumulative total via Decision 5 below; `activity_log` rows are for the event stream, where per-event attribution is known to be 0.

### 5. `faith_points` backfill is overwrite, not increment

```sql
INSERT INTO faith_points (user_id, total_points, current_level, last_updated)
VALUES (?, ?, ?, NOW())
ON CONFLICT (user_id) DO UPDATE
SET total_points = EXCLUDED.total_points,
    current_level = EXCLUDED.current_level,
    last_updated = NOW()
```

**Why overwrite:** localStorage is the source of truth for cumulative points at the moment of cutover. Any prior backfill attempt that partially completed would have left stale values; overwriting from the localStorage payload is correct.

This intentionally diverges from the master plan's MAX-based upsert. Reason: during dual-write mode, the backend total is a *shadow* of localStorage. Taking MAX would lock in any incorrect transient backend value (e.g., from a buggy intermediate state) and refuse to converge to the localStorage truth. Overwrite is the correct primitive while localStorage stays canonical for reads.

Same pattern for `streak_state`.

### 6. `user_badges` backfill is `INSERT ... ON CONFLICT DO NOTHING`

For each badge in `wr_badges.earned`:

```sql
INSERT INTO user_badges (user_id, badge_id, earned_at, display_count)
VALUES (?, ?, ?, ?)
ON CONFLICT (user_id, badge_id) DO NOTHING
```

`ON CONFLICT DO NOTHING` (not `DO UPDATE`) — if a real-time badge was earned between cutover and backfill firing, we don't want to overwrite its `earned_at` with a stale localStorage value or reset its `display_count`.

### 7. `activity_counts` backfill is overwrite

Same logic as `faith_points`: localStorage holds the cumulative truth at cutover. UPSERT overwrites `count_value`.

For each of the 14 counters in `wr_badges.activityCounts`:

```sql
INSERT INTO activity_counts (user_id, count_type, count_value, last_updated)
VALUES (?, ?, ?, NOW())
ON CONFLICT (user_id, count_type) DO UPDATE
SET count_value = EXCLUDED.count_value, last_updated = NOW()
```

### 8. Single transaction; rollback on any failure

`ActivityBackfillService.backfill` is `@Transactional`. All five table writes happen in one transaction. ANY failure → full rollback, frontend retries on next dual-write.

### 9. Payload size limit: 1MB on the request body

Spring's default multipart and JSON body limits are typically 1MB or higher. For typical users with months of localStorage history, the payload is <100KB. For users with years, it could approach 1MB but rarely exceed.

Configure Spring's `spring.servlet.multipart.max-request-size=1MB` if not already set. Reject larger requests with `413 Payload Too Large`.

If a user's payload exceeds 1MB, the backfill won't complete. Acceptable failure mode for the rare case — they keep their localStorage data and can wait for a future "chunked backfill" spec. This is documented in `_plans/post-1.10-followups.md` as part of this spec's wrap-up.

### 10. Frontend trigger: fire-and-forget, but track completion

The frontend pattern in `useFaithPoints.recordActivity`:

```ts
if (isBackendActivityEnabled() && isAuthenticated) {
  if (!isBackfillCompleted()) {
    triggerBackfill()
      .then(() => markBackfillCompleted())
      .catch((err) => console.warn('[useFaithPoints] backfill failed:', err));
  }
  postActivityToBackend(type, sourceFeature)
    .catch((err) => console.warn('[useFaithPoints] dual-write failed:', err));
}
```

The backfill `.then()` sets `wr_activity_backfill_completed = 'true'` ONLY on success. On failure, the next dual-write retries.

The `.then()` is the only place the localStorage flag is set. Don't set it before the await resolves; don't set it from within the `apiFetch` helper.

### 11. No UI surface

The user sees nothing. No banner, no progress bar, no "we're importing your history" toast. Backfill is an invisible infrastructure operation. If it succeeds, the user keeps using the app as before. If it fails, the user keeps using the app as before — localStorage is still source of truth for reads.

This applies to the success path AND the failure path AND the "running" path. `apiFetch` errors that bubble out of `triggerBackfill` are swallowed by the `.catch` and logged to console at WARN level. Sentry reporting (if any) flows through the existing global handler — no spec-specific instrumentation.

---

## Deliverables

### Files to create

- **`backend/src/main/resources/db/changelog/2026-04-27-008-add-activity-log-backfill-idempotency-index.xml`** — Liquibase changeset adding the partial unique index per Architectural Decision #2.
- **`backend/src/main/java/com/worshiproom/activity/ActivityBackfillController.java`** — `POST /api/v1/activity/backfill` endpoint.
- **`backend/src/main/java/com/worshiproom/activity/ActivityBackfillService.java`** — `@Transactional` service that orchestrates the five-table backfill.
- **`backend/src/main/java/com/worshiproom/activity/dto/ActivityBackfillRequest.java`** — Java record matching Recon C request shape.
- **`backend/src/main/java/com/worshiproom/activity/dto/ActivityBackfillResponse.java`** — Java record matching Recon C response shape.
- Plus nested record types for the request body sub-structures (`BackfillActivityLog`, `BackfillFaithPoints`, `BackfillStreak`, `BackfillBadges`, etc. — CC's call on exact decomposition; nest under `ActivityBackfillRequest` as static records, or keep them as top-level records in `dto/`, whichever matches existing convention from Spec 2.6).
- **`backend/src/test/java/com/worshiproom/activity/ActivityBackfillControllerIntegrationTest.java`** — extends `AbstractIntegrationTest`. Test list per **Tests Required** below.
- **`frontend/src/services/activity-backfill.ts`** — frontend module with `isBackfillCompleted()`, `markBackfillCompleted()`, `triggerBackfill()`, `assembleBackfillPayload()` exports.
- **`frontend/src/services/__tests__/activity-backfill.test.ts`** — Vitest tests for the frontend module.

### Files to modify

- **`backend/src/main/resources/db/changelog/master.xml`** — append the new `<include>` entry (sixth and final Phase 2 changeset).
- **`backend/src/test/java/com/worshiproom/db/LiquibaseSmokeTest.java`** — bump count assertion from 7 to 8; add row-check for the new changeset; verify the partial unique index exists via `information_schema` query.
- **`backend/src/main/resources/openapi.yaml`** — add `POST /api/v1/activity/backfill` path, `ActivityBackfillRequest` schema, `ActivityBackfillResponse` schema. Run codegen to regenerate frontend types.
- **`frontend/src/hooks/useFaithPoints.ts`** — wire the backfill check + trigger before the existing dual-write call per Architectural Decision #10.
- **`frontend/src/hooks/__tests__/useFaithPoints.test.ts`** — add tests for the backfill trigger gating (fires once, gated by completion flag, fires again after localStorage clear).
- **`.claude/rules/11-local-storage-keys.md`** — document the new `wr_activity_backfill_completed` key.

### Files NOT to modify

- `pom.xml` — no new dependencies.
- `application.properties` — verify `spring.servlet.multipart.max-request-size`; add ONLY if not present. Do not change existing values.
- All Phase 2 services (`FaithPointsService`, `StreakService`, `BadgeService`, `ActivityCountsService`, `ActivityService`): no changes.
- All Phase 2 entities (`FaithPoints`, `StreakState`, `ActivityLog`, `UserBadge`, `ActivityCount`): no changes.
- All Phase 2 frontend services (`faith-points-storage`, `badge-storage`, `streak-repair-storage`): no changes.
- `_forums_master_plan/spec-tracker.md` — Eric flips rows manually after commit.
- `CLAUDE.md` — Phase 2 wave-close summary belongs in a separate hygiene update, not this spec.

---

## Tests Required

### Backend integration tests (extends `AbstractIntegrationTest`)

`ActivityBackfillControllerIntegrationTest`, ~14 tests:

**A) Happy path (3 tests):**

1. Authenticated POST with full payload returns 200 with response counts matching the inputs
2. `activity_log` rows inserted with synthetic noon timestamps and `source_feature='backfill'`
3. `faith_points`, `streak_state`, `user_badges`, `activity_counts` tables populated correctly

**B) Idempotency (4 tests):**

4. Calling backfill twice with the same payload produces the same final state (no duplicate `activity_log` rows; `faith_points`/`streak_state` UPSERT to same values; `user_badges` DO NOTHING preserves the originals; `activity_counts` UPSERT to same value)
5. After backfill, calling Spec 2.6's `POST /api/v1/activity` for today still works correctly (no interference with real-time recording)
6. After Spec 2.6 records a real-time activity, then backfill fires for historical dates: the real-time row is unchanged
7. `activity_log` unique constraint correctly rejects a duplicate backfill row at the DB level

**C) Authentication & authorization (2 tests):**

8. Unauthenticated POST returns 401
9. User A's payload cannot affect User B's data (each request scoped to authenticated user)

**D) Validation (2 tests):**

10. Missing required fields returns 400
11. Payload exceeding 1MB returns 413

**E) Transactional rollback (2 tests):**

12. Simulated failure mid-transaction (e.g., constraint violation) → no partial state
13. Successful completion has all five table writes consistent

**F) Edge cases (1 test):**

14. Empty payload (user has no localStorage history; new account) → 200 with all-zero counts; no rows inserted

### Backend Liquibase smoke test extension

`LiquibaseSmokeTest` gains:

- `hasSize` assertion bumped from 7 to 8
- New row-check for changeset 008
- Verify the partial unique index exists via `information_schema.indexes`

### Frontend tests (Vitest)

`activity-backfill.test.ts`, ~8 tests:

**A) `isBackfillCompleted` (2 tests):**

1. Returns true when `wr_activity_backfill_completed === 'true'`
2. Returns false when key is absent or set to anything else (fail-closed)

**B) `assembleBackfillPayload` (3 tests):**

3. Reads all 4 in-scope localStorage keys correctly into the payload shape
4. Empty localStorage produces a valid empty-but-well-formed payload
5. Excludes `wr_streak_repairs` from the payload (per Divergence 2)

**C) `triggerBackfill` (2 tests):**

6. Successful 200 response sets `wr_activity_backfill_completed='true'`
7. Failed response (mocked 500) does NOT set the flag; logs warning

**D) Integration with `useFaithPoints` (1 test, in `useFaithPoints.test.ts`):**

8. With flag on, backfill not yet completed: `triggerBackfill` called once on first `recordActivity`; not called again on subsequent calls in same session

**Total: ~22 new tests across backend and frontend.** Wall-clock target: backend integration <12s; frontend Vitest <500ms.

---

## Out of Scope

- **Repair state backfill** (`wr_streak_repairs` excluded per Divergence 2)
- **Promoting backend reads to source-of-truth** (future spec, post-Phase 2)
- **A "force re-backfill" admin endpoint**
- **Chunked/streaming backfill for users with >1MB payloads** (followup if it ever surfaces)
- **Migration of `wr_friends`, `wr_reading_plan_progress`, `wr_bible_progress`, `wr_meditation_history`, `wr_gratitude_entries`, `wr_local_visits`, or `wr_listening_history`** — those data sources stay frontend-only until their own future migration specs
- **UI surface** (no banner, no progress, no toast)
- **Retry queue for failed backfills** (the next dual-write retries automatically; no explicit queue)
- **Telemetry/Sentry instrumentation specific to backfill** (`apiFetch`'s existing error path is sufficient)
- **Modifying the `wr:activity-recorded` external event paths** (Spec 2.7 followup)
- **Manual a11y testing** (no UI to audit)
- **Cross-device merge semantics** (master plan documents this as a known limitation; first device's backfill wins; second device's pre-cutover history stays local-only)
- **Retroactive badge computation** (badges are earned in the moment, not recomputed during backfill)
- **CLAUDE.md edits** — Phase 2 wave-close summary belongs in a separate hygiene update

---

## Acceptance Criteria

- [ ] `POST /api/v1/activity/backfill` exists, requires Bearer auth, returns 200 on success with the response shape from Recon C
- [ ] Liquibase changeset 008 adds the partial unique index on `activity_log` per Architectural Decision #2
- [ ] `LiquibaseSmokeTest` count assertion bumped from 7 to 8; new row-check passes; partial-index existence verified
- [ ] `activity_log` rows from backfill have `source_feature='backfill'` and synthetic noon timestamps in user's timezone
- [ ] `faith_points` UPSERT overwrites `total_points` / `current_level`
- [ ] `streak_state` UPSERT overwrites `current_streak` / `longest_streak` / `last_active_date`
- [ ] `user_badges` `INSERT ... ON CONFLICT DO NOTHING` (preserves real-time badge state)
- [ ] `activity_counts` UPSERT overwrites `count_value` for all 14 counters
- [ ] Single `@Transactional` transaction; rollback on any exception
- [ ] Idempotency: calling backfill twice produces the same final state
- [ ] Authentication required; unauth returns 401
- [ ] User scoping enforced; can't write to another user's tables
- [ ] Payload >1MB returns 413
- [ ] `openapi.yaml` has new path + schemas; frontend types regenerated
- [ ] Frontend module `activity-backfill.ts` exposes `isBackfillCompleted`, `markBackfillCompleted`, `triggerBackfill`, `assembleBackfillPayload`
- [ ] `useFaithPoints` triggers backfill before dual-write, only when not yet completed
- [ ] Backfill on success sets `wr_activity_backfill_completed='true'` in localStorage
- [ ] Backfill on failure does NOT set the flag (logs warning only)
- [ ] `wr_streak_repairs` excluded from backfill payload (per Divergence 2)
- [ ] `wr_activity_backfill_completed` documented in `.claude/rules/11-local-storage-keys.md`
- [ ] Backend integration tests: 14+ tests, all green
- [ ] Frontend Vitest tests: 8+ tests, all green
- [ ] Existing Phase 2 services and entities unchanged
- [ ] Backend test baseline: prior count + ~14 new + 1 `LiquibaseSmokeTest` extension, all green
- [ ] Frontend test baseline: prior count + ~9 new tests, all green
- [ ] Build succeeds (`pnpm build`) on frontend; `./mvnw test` passes on backend
- [ ] Branch unchanged (still `forums-wave-continued`)
- [ ] Spec tracker (`_forums_master_plan/spec-tracker.md`) NOT modified (Eric flips rows manually after commit)

---

## Guardrails (DO NOT)

- Do **NOT** change branches. Stay on `forums-wave-continued`.
- Do **NOT** modify any Phase 2 service or entity beyond the `LiquibaseSmokeTest` extension.
- Do **NOT** modify `FaithPointsService`, `StreakService`, `BadgeService`, `ActivityCountsService`, `ActivityService`, or any of their entities/repositories.
- Do **NOT** include `wr_streak_repairs` in the backfill payload (per Divergence 2).
- Do **NOT** include a non-existent `wr_activity_counts` key (per Divergence 1; counts live inside `wr_badges`).
- Do **NOT** use `INSERT ... ON CONFLICT DO UPDATE` for `user_badges` (preserves real-time state via DO NOTHING).
- Do **NOT** use INCREMENT semantics for `activity_counts` on backfill (it's an overwrite, not a delta).
- Do **NOT** compute today/currentWeekStart inside the backfill service. Take them as request parameters or derive from `user.timezone`.
- Do **NOT** add UI surface. No banner, no progress, no toast.
- Do **NOT** add a retry queue. Next dual-write retries.
- Do **NOT** modify Spec 2.6's `POST /api/v1/activity` endpoint. This is a separate endpoint.
- Do **NOT** remove the localStorage data after successful backfill. localStorage stays canonical for reads.
- Do **NOT** add `Sentry.captureException` calls. Existing global handler covers it.
- Do **NOT** add `@PreAuthorize` annotations. JWT filter handles auth.
- Do **NOT** add this endpoint to `PublicPaths`. Authenticated only.
- Do **NOT** exceed Spring's default 1MB request body limit. Reject larger requests with 413.
- Do **NOT** apply MAX-based upserts (the master plan's older approach). Use overwrite for `faith_points`/`streak_state`/`activity_counts` and DO NOTHING for `user_badges`, per Architectural Decisions #5–#7.
- Do **NOT** modify `CLAUDE.md` (Phase 2 wave-close summary belongs in a separate hygiene update).
- Do **NOT** commit, push, or do any git operation. Eric handles all git.
- Do **NOT** touch `_forums_master_plan/spec-tracker.md`.

---

## Plan Shape Expectation

`/plan-forums` output for this M/Medium spec should be **12-16 steps**:

1. Recon: read frontend storage services (`faith-points-storage`, `badge-storage`), frontend hook (`useFaithPoints`), backend Spec 2.6 `ActivityController`/`Service` for endpoint pattern, `lib/api-client.ts` for fetch pattern, `openapi.yaml` for path precedent.
2. Author Liquibase changeset 008 (partial unique index on `activity_log`).
3. Append `<include>` to `master.xml`.
4. Extend `LiquibaseSmokeTest` (hasSize 7→8 + new row-check + partial-index existence test).
5. Author `ActivityBackfillRequest`, `ActivityBackfillResponse`, and nested record DTOs.
6. Author `ActivityBackfillService` with `@Transactional` backfill method.
7. Author `ActivityBackfillController`.
8. Update `openapi.yaml` + run codegen.
9. Author backend `ActivityBackfillControllerIntegrationTest`.
10. Author frontend `activity-backfill.ts` module.
11. Author frontend `activity-backfill.test.ts`.
12. Wire backfill trigger into `useFaithPoints.recordActivity`.
13. Extend `useFaithPoints.test.ts` with backfill-trigger tests.
14. Document `wr_activity_backfill_completed` in `.claude/rules/11-local-storage-keys.md`.
15. Run `./mvnw test`; iterate.
16. Run `pnpm test`; iterate.
17. Self-review against acceptance criteria.

If plan comes back with 22+ steps, proposes modifying any 2.2–2.9 deliverable beyond `LiquibaseSmokeTest`, proposes a UI surface, proposes including `wr_streak_repairs`, proposes a separate Sentry instrumentation layer, or proposes chunked/streaming backfill, push back hard.

---

## Notes for Eric

- **Final spec of Phase 2.** After this commits and the tracker flips, Phase 2 is 10/10 ✅. Phase 3 (Forums) starts next.

- **Two divergences from master plan v2.9 worth flagging:** `wr_activity_counts` doesn't exist as a separate key (counts live inside `wr_badges`); `wr_streak_repairs` is out of scope because backend repair persistence isn't ported. Plus a third related divergence: synthetic noon timestamps for backfilled `activity_log` rows because localStorage doesn't store per-activity timestamps.

- **Substantive upsert-strategy divergence from master plan:** master plan v2.9 § 2.10 prescribes MAX-based upserts everywhere. This spec uses **overwrite** for `faith_points`/`streak_state`/`activity_counts` and **DO NOTHING** for `user_badges`. Reason: while localStorage stays canonical for reads, the backend total is shadow data; MAX would refuse to converge on the localStorage truth if a transient backend value was wrong. Overwrite is correct in this regime. When a future spec promotes backend reads to source-of-truth, the upsert strategy may need to be re-examined.

- **The synthetic-noon-timestamp approach is honest about the limitation:** backfilled rows reflect "user had this activity on this date" without claiming minute-accuracy. The `activity_log` rows from real-time recording (post-cutover) get accurate `NOW()` timestamps. The two row populations are distinguishable via `source_feature='backfill'` vs other values.

- **Pre-execution checklist:** Docker IS required (Testcontainers for backend integration tests). Postgres dev container useful for manual verification.

- **The race between backfill and dual-write is benign by design** — both fire-and-forget; UPSERT semantics handle either ordering correctly; backfill never inserts a row for today (only historical dates); real-time recording uses `NOW()` timestamps that won't collide with synthetic noon timestamps.

- **Spec-tracker note:** the tracker shows 2.9 as ⬜ and 2.10 as ⬜. The brief stating "Prerequisites: 2.9 ✅" reflects your actual working state (cutover complete, dual-write live in dev and prod). Same situation as Spec 2.8 → 2.9: the spec/plan/commit exist on the branch even though the tracker hasn't been flipped yet. Flip 2.9's row when convenient.

- **After 2.10 commits and the tracker flip,** propose to Eric writing a "Phase 2 Execution Reality Addendum" entry to the master plan documenting the cluster of divergences across 2.3, 2.4, 2.10 (grace days don't exist, grief pause doesn't exist, repair persistence not built, `wr_activity_counts` doesn't exist as separate key, MAX-based upsert strategy replaced by overwrite/DO-NOTHING). Same shape as the Phase 1 Execution Reality Addendum.
