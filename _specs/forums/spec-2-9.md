# Forums Wave: Spec 2.9 — Phase 2 Cutover

**Master Plan Reference:** `_forums_master_plan/round3-master-plan.md` → Spec 2.9 (line 2821)
**Branch:** `forums-wave-continued` (stay on this branch — no per-spec sub-branch)
**Date:** 2026-04-27

---

## Affected Frontend Routes

N/A — cutover spec. The only code change is a flag default flip in `frontend/.env.example`. No new components, no UI changes, no new routes. The `/verify-with-playwright` skill is therefore skipped for this spec.

The manual smoke test (Eric's responsibility) exercises the Daily Hub primary tabs and Prayer Wall to confirm dual-write fires end-to-end, but that is interactive verification, not automated visual regression.

---

## Spec Header

- **ID:** `round3-phase02-spec09-phase2-cutover`
- **Size:** S
- **Risk:** Medium (live cutover — flips dual-write from off to on across all dev/prod builds; first time the backend receives real activity traffic from a real frontend feature)
- **Prerequisites:** 2.8 (Drift Detection Test) ✅ — fixture-driven parity test ships at `_test_fixtures/activity-engine-scenarios.json`. With drift detection in place, flipping the dual-write flag is safer because any future divergence between frontend and backend implementations surfaces at test time.
- **Phase:** 2 — Activity Engine Migration (Dual-Write)
- **Ninth spec of Phase 2.** Only Spec 2.10 (Historical Activity Backfill) remains after this one.

---

## Goal

Flip `VITE_USE_BACKEND_ACTIVITY` default from `false` to `true`, smoke-test the dual-write end-to-end in local dev, and document the cutover in `_plans/forums/phase02-cutover-checklist.md`.

After this spec ships:

- **Dev environment**: dual-write fires on every `recordActivity` call by default. Local dev becomes the same shape as production for backend traffic.
- **Production builds**: the `.env.example` default is `true`, but Vite env vars are baked at build time — Eric must add `VITE_USE_BACKEND_ACTIVITY=true` to Railway frontend service env vars for prod to actually flip. The .env.example flip alone is necessary but not sufficient for prod.
- **Drift detection (Spec 2.8)** keeps both implementations honest going forward.

This is the **first spec where the backend receives real activity traffic from a real frontend feature**. Vitest in Spec 2.7 mocked the backend; drift detection in Spec 2.8 doesn't hit the backend at all. Manual smoke testing fills the gap — there is no automated test today that exercises the full HTTP path from frontend `recordActivity` → JWT auth → `POST /api/v1/activity` → Postgres persistence.

---

## Master Plan Divergences

Three meaningful divergences from master plan v2.9 § Spec 2.9 (line 2821) worth pinning before drafting.

### Divergence 1 — Checklist path matches existing convention, not master plan body

The master plan body says `_plans/forums-wave/phase02-cutover-checklist.md` (note the `forums-wave` directory). The existing Phase 1 cutover checklist lives at `_plans/forums/phase01-cutover-checklist.md` (no `-wave` suffix).

**Verified during recon:** `_plans/forums/` exists and contains 28 files including `phase01-cutover-checklist.md`. There is no `_plans/forums-wave/` directory.

**Resolution:** this spec creates the checklist at `_plans/forums/phase02-cutover-checklist.md` matching the established convention. The master plan body is wrong on this path; future cutover specs (2.5.5, etc.) will follow the same `_plans/forums/` convention.

### Divergence 2 — Vite config does not need a default; verified

The master plan acceptance criteria say "Flag default is `true` in `.env.example` and Vite config." Vite reads env vars from `.env*` files at build time; `vite.config.ts` itself doesn't typically encode application env var defaults — those are read at runtime via `import.meta.env`.

**Verified during recon:** `grep -n VITE_USE_BACKEND_ACTIVITY frontend/vite.config.ts` returns zero matches. The flag's runtime read happens entirely in `frontend/src/lib/env.ts` via the `isBackendActivityEnabled` helper (lines 70-85), which uses strict equality `=== 'true'` against `import.meta.env.VITE_USE_BACKEND_ACTIVITY`. Anything other than the literal string `'true'` (including `undefined`, `''`, and `'false'`) returns false (fail-closed).

**Resolution:** the only PRODUCTION default that matters lives in:

- (a) `.env.example` — the documented default for new clones
- (b) Railway production env vars — the live default for prod
- (c) `frontend/.env.local` — Eric's local dev override

This spec flips (a). It does NOT modify `vite.config.ts`. It DOES tell Eric to set the Railway env var in the manual checklist. The fail-closed check in env.ts means "no env var set" still means "off" — so flipping `.env.example` to `true` doesn't automatically flip prod. Railway needs an explicit `VITE_USE_BACKEND_ACTIVITY=true` var added too.

### Divergence 3 — Accessibility smoke test is Universal Rule 17 retrofit, not net-new work

The master plan acceptance criterion lists "Universal Rule 17 per-phase accessibility smoke test passes." This is a codebase-wide convention from CLAUDE.md retrofitted into Phase 2 cutover during the v2.6 hygiene pass — every phase does it once, at cutover. It's not new work this spec invents.

**Resolution:** the spec includes the a11y smoke test as a manual checklist item, but the SCOPE of the a11y check is narrow: only routes/components that Phase 2 introduced or modified. Phase 2 was almost entirely backend + a single frontend hook change (Spec 2.7) that has no UI impact. The practical scope is: confirm the existing daily-hub / prayer-wall / journal / meditate / bible / music routes still scan clean — but no new components to verify because Phase 2 didn't add any user-visible UI.

---

## Recon Facts (verified during brief authoring; re-verify suspect ones during execution)

### A) Current flag state

`frontend/.env.example` (line 30) currently has:

```
VITE_USE_BACKEND_ACTIVITY=false
```

Plus a comment block above (lines 19-29) explaining the dual-write strategy and naming Spec 2.9 as the cutover owner. This spec flips the value to `'true'` and updates the comment to reflect that cutover happened.

### B) The flag's consumer

`frontend/src/lib/env.ts` lines 70-85:

```ts
const USE_BACKEND_ACTIVITY = import.meta.env.VITE_USE_BACKEND_ACTIVITY as string | undefined

/**
 * Returns true when activity events should be dual-written to the backend
 * (POST /api/v1/activity) alongside the existing localStorage write.
 *
 * Strict equality to the string `'true'` — `'false'`, `''`, `undefined`,
 * and any other value all return false (fail-closed).
 *
 * Default: false. Cutover (flag default flip) is owned by Spec 2.9.
 *
 * Used by: useFaithPoints (Spec 2.7 — Frontend Activity Dual-Write).
 */
export function isBackendActivityEnabled(): boolean {
  return USE_BACKEND_ACTIVITY === 'true'
}
```

The check is `=== 'true'` — strict string equality, fail-closed. Consumed by `hooks/useFaithPoints.ts` in the `recordActivity` `useCallback` (per Spec 2.7's deliverables). After Spec 2.9 ships, the docstring comment "Default: false. Cutover (flag default flip) is owned by Spec 2.9." should be updated to reflect that cutover happened — but per Architectural Decision #5 below, the docstring update is a courtesy, not a deliverable.

### C) Railway env vars

Production deploys read `VITE_USE_BACKEND_ACTIVITY` at build time (Vite env vars are baked into the production bundle). The Railway service for the frontend needs:

```
VITE_USE_BACKEND_ACTIVITY=true
```

Set BEFORE the next production deploy. Existing convention: add via Railway dashboard → frontend service → Variables tab → "+ New Variable". Same pattern as `VITE_API_BASE_URL`, `VITE_VAPID_PUBLIC_KEY`. Per Phase 1's Spec 1.10 cutover, the Railway frontend Dockerfile already exposes `VITE_API_BASE_URL` via `ARG VITE_API_BASE_URL` + `ENV VITE_API_BASE_URL=$VITE_API_BASE_URL` so the build picks it up — verify whether `VITE_USE_BACKEND_ACTIVITY` needs the same Dockerfile wiring during the manual prod cutover step.

### D) The backend endpoint

`POST /api/v1/activity` (shipped in Spec 2.6) is live in dev. Authentication required (Bearer JWT). Persists to `activity_log`, `faith_points`, `streak_state`, `user_badges`, `activity_counts`.

### E) Existing cutover checklist (Phase 1)

`_plans/forums/phase01-cutover-checklist.md` is the format precedent. CC reads it during recon to match structure (numbered H2 sections with checkbox items, sign-off section at the end, inline notes for deviations). The Phase 2 checklist mirrors this structure, scoped to dual-write activation rather than first-time platform deploy.

### F) CLAUDE.md update — DECIDED: NO EDIT NEEDED

The master plan says "Update CLAUDE.md if anything changed." Phase 2 changed:

- 5 new tables in the database (activity_log, faith_points, streak_state, user_badges, activity_counts)
- 1 new endpoint (POST /api/v1/activity)
- 1 new frontend behavior (dual-write under flag)
- 4 new pure-calculation services in the backend

**Verified during recon:** CLAUDE.md's "Implementation Phases" section (lines 139-157) lists prior waves at high level (Round 2, Round 3, Bible Wave, AI Integration, Key Protection) and notes Phase 3 Forums Wave is "READY TO START. 156 specs across 19 phases." It does NOT enumerate Phase 2's tables, endpoints, or services. Adding them now would be premature — Phase 2 is not closed yet (Spec 2.10 historical backfill remains), and the project convention is to summarize a wave in CLAUDE.md after the wave fully ships.

**Resolution:** leave CLAUDE.md unchanged in this spec. When Phase 2 fully closes (after Spec 2.10), a hygiene update can add a Phase 2 summary line. This spec is the activation step, not the wave-close step.

### G) Vite config check

`grep -n VITE_USE_BACKEND_ACTIVITY frontend/vite.config.ts` returns zero matches. Per Architectural Decision #5, do NOT modify `vite.config.ts` in this spec.

### H) `_cutover-evidence/` directory state

The directory already exists (created during Phase 1 cutover) and contains:

- `phase1-a11y-smoke.json` (~4.4 MB — Phase 1 axe-core output)
- `capture-axe-evidence.mjs` (the script Eric used to capture Phase 1 evidence — runs Playwright + axe-core against the deployed Railway frontend, logged-out, on `/` and `/prayer-wall`)

The Phase 2 evidence files (`phase2-a11y-smoke.json` + `phase2-a11y-notes.md`) join the same directory. Eric can adapt `capture-axe-evidence.mjs` to add the Phase 2 routes (just add to the `ROUTES` array constant).

---

## Architectural Decisions

### 1. ONE single code change: flip the flag

The actual code modification is one line in `frontend/.env.example`:

```
VITE_USE_BACKEND_ACTIVITY=false  →  true
```

Plus a comment update reflecting that cutover happened. That's the entirety of the production code change.

### 2. The manual smoke test is load-bearing

Vitest tests in Spec 2.7 mock the backend. Drift detection in Spec 2.8 doesn't hit the backend at all. NOTHING in the committed test suite verifies that an actual HTTP call from the frontend reaches the actual backend with the actual JWT and gets persisted to actual Postgres.

The smoke test fills that gap. Eric must run it before the cutover commit lands, and the checklist must capture the test results.

### 3. Checklist document is the deliverable

The cutover checklist at `_plans/forums/phase02-cutover-checklist.md` is itself a deliverable — not just internal scaffolding. It serves as the audit trail for Phase 2 completion and as the template for future-phase cutovers (2.5.5, etc.).

The checklist covers:

- Pre-flight checks (Docker, backend, frontend, dev DB)
- Code change (flag flip)
- Build verification (frontend builds with flag on)
- Manual smoke test (5+ activity types)
- Backend persistence verification (psql queries)
- localStorage canonicality verification (UI still reflects old data)
- A11y smoke per Universal Rule 17
- Production deploy plan (Railway env var, build, smoke in prod)
- Rollback plan (set flag back to false; deploy)
- Sign-off

### 4. Rollback is defined explicitly

If the prod cutover surfaces a problem, rollback is:

- Set `VITE_USE_BACKEND_ACTIVITY=false` in Railway
- Trigger a redeploy
- The fail-closed env check means dual-write stops immediately on the next page load
- localStorage data is unaffected — users see no difference

The activity_log/faith_points/streak_state/user_badges/activity_counts rows already written stay in the DB; they're shadow data with no user-facing consumer until a future "promote backend reads" spec.

### 5. No forced flip in vite.config.ts

Per Divergence 2, `vite.config.ts` doesn't encode application-env defaults. The `.env.example` flip + Railway env var are the authoritative locations.

Recon verified zero references to `VITE_USE_BACKEND_ACTIVITY` in `vite.config.ts`. Do NOT touch `vite.config.ts`.

### 6. CLAUDE.md left unchanged

Per Recon F, CLAUDE.md's Implementation Phases section is high-level and doesn't enumerate Phase 2 internals. A Phase 2 summary is appropriate after Spec 2.10 fully closes the wave, not at this activation step. Do NOT modify CLAUDE.md.

### 7. No scope creep

This spec does NOT:

- Promote backend reads to source-of-truth (future spec)
- Backfill historical activity (Spec 2.10)
- Reconcile localStorage vs backend drift (no such reconciliation exists yet)
- Add monitoring/dashboarding for the new endpoint beyond what Spec 1.10d already provides
- Modify the `wr:activity-recorded` external event paths (Spec 2.7 followup)
- Update the docstring in `lib/env.ts` (the "Default: false. Cutover owned by Spec 2.9." comment is a courtesy update; not in scope)

---

## Deliverables

### Files to modify

- **`frontend/.env.example`** — flip `VITE_USE_BACKEND_ACTIVITY` from `false` to `true`. Update the surrounding comment block (lines 19-29) to reflect that cutover happened (e.g., "Activated by Spec 2.9 cutover on 2026-04-27.").

### Files to create

- **`_plans/forums/phase02-cutover-checklist.md`** — full cutover checklist per Architectural Decision #3. Modeled on `_plans/forums/phase01-cutover-checklist.md`. Sections enumerated in the "Deliverable Structure" section below.
- **`_cutover-evidence/phase2-a11y-smoke.json`** — placeholder file noting that Eric authors the real axe-core output during the smoke-test execution. CC creates only a scaffold; the actual scan runs against the deployed (or local) frontend.
- **`_cutover-evidence/phase2-a11y-notes.md`** — placeholder file with the structure for Eric to fill in during keyboard + VoiceOver spot-checks.

### Files NOT to modify

- `vite.config.ts` (per Architectural Decision #5)
- `CLAUDE.md` (per Architectural Decision #6)
- `frontend/src/lib/env.ts` (the docstring "Default: false. Cutover owned by Spec 2.9." is a courtesy update; not in scope per Architectural Decision #7)
- `frontend/src/hooks/useFaithPoints.ts` (Spec 2.7's wiring is correct as-is)
- `backend/**` (zero backend changes — this is purely a frontend flag flip + documentation)
- `openapi.yaml`
- `master.xml` or any Liquibase changeset
- Any test file (the manual smoke test produces evidence that lives in `_cutover-evidence/`, not in test code)
- `_forums_master_plan/spec-tracker.md` — Eric flips rows manually after commit

---

## Deliverable Structure — `phase02-cutover-checklist.md`

Required sections (CC writes the document; Eric works through the checkboxes during execution):

```markdown
# Phase 2 Cutover Checklist — Activity Engine Dual-Write

**Purpose:** Activate the dual-write path so backend activity tables receive real production traffic.
**Phase 2 status before this spec:** 8/10 specs complete (2.1-2.8). 2.9 (this) is the activation. 2.10 (historical backfill) is the close.

## Overview
- 1-2 paragraphs: what Phase 2 delivered (5 backend tables, 4 services, 1 endpoint, 1 frontend hook change), why this cutover happens now (drift detection in 2.8 makes the flip safe), what changes for users (nothing visible) and for the backend (real traffic).

## Pre-flight checks
- [ ] On forums-wave-continued branch
- [ ] Working tree clean (git status returns nothing pending)
- [ ] Docker running
- [ ] Backend Postgres container running (docker-compose up)
- [ ] Backend `./mvnw spring-boot:run` succeeds and serves on :8080
- [ ] /api/v1/health returns 200
- [ ] Frontend `pnpm dev` succeeds and serves on :5173
- [ ] You can log in with a dev seed user (e.g., dev1@worshiproom.com)

## Code change
- [ ] Flip VITE_USE_BACKEND_ACTIVITY=true in frontend/.env.example
- [ ] Update comment block: "Activated by Spec 2.9 cutover on <date>"
- [ ] Set VITE_USE_BACKEND_ACTIVITY=true in your local frontend/.env.local
- [ ] Restart frontend dev server (Vite env vars are build-time)

## Build verification
- [ ] `pnpm tsc --noEmit` clean
- [ ] `pnpm lint` clean
- [ ] `pnpm build` clean
- [ ] `pnpm test` clean (Vitest unit tests still pass with flag = true; baseline 8,811 pass / 11 known-fail)

## Manual smoke test — 5 activity types

For each activity below: tap/use the feature in the dev frontend, then verify backend persistence via the SQL queries in the next section.

### Smoke 1: Pray
- [ ] Tap "Pray" button on a Prayer Wall card
- [ ] localStorage updated (DevTools → Application → LocalStorage → wr_daily_activities, today's pray=true)
- [ ] Backend activity_log row inserted (run psql query — see Backend Verification Queries below)
- [ ] Backend activity_counts.pray incremented by 1
- [ ] Backend faith_points.total_points reflects new total
- [ ] Backend streak_state row updated for current user

### Smoke 2: Journal
- [ ] Save a journal entry from the Daily Hub Journal tab
- [ ] Backend activity_log row with activity_type='journal' (source_feature='journal' per Spec 2.7's vocabulary)
- [ ] activity_counts.journal incremented
- [ ] faith_points reflects journal points

### Smoke 3: Meditate
- [ ] Complete a meditation session (any of the 6 types)
- [ ] Backend activity_log row with activity_type='meditate' (source_feature='meditate')
- [ ] activity_counts.meditate incremented

### Smoke 4: Bible (chapter complete)
- [ ] Mark a chapter as read (verify which trigger fires the activity — chapter visit vs reading-plan day complete)
- [ ] Backend activity_log row appears (source_feature='bible' or 'reading_plan' per Spec 2.7's vocabulary; capture the actual value observed)

### Smoke 5: Music (listen completion)
- [ ] Listen to a track to completion
- [ ] Backend activity_log row with activity_type='listen' (source_feature='music')
- [ ] **NOTE:** Per Spec 2.7 followup, the listen path may use the `wr:activity-recorded` event bypass instead of `useFaithPoints.recordActivity` directly. If no row appears, that's the documented gap — record observed behavior here for future Spec 2.7-followup planning. Do NOT fix in this cutover.

## Backend verification queries

Run via `psql` against the dev DB:

\`\`\`sql
-- Most recent activity_log rows for the test user
SELECT activity_type, source_feature, occurred_at, points_earned
FROM activity_log
WHERE user_id = '<test-user-uuid>'
ORDER BY occurred_at DESC
LIMIT 20;

-- Current activity_counts for the test user
SELECT count_type, count_value, last_updated
FROM activity_counts
WHERE user_id = '<test-user-uuid>'
ORDER BY count_type;

-- Current faith_points for the test user
SELECT total_points, current_level, last_updated
FROM faith_points
WHERE user_id = '<test-user-uuid>';

-- Current streak_state for the test user
SELECT current_streak, longest_streak, last_active_date
FROM streak_state
WHERE user_id = '<test-user-uuid>';

-- Newly earned badges
SELECT badge_id, earned_at, display_count
FROM user_badges
WHERE user_id = '<test-user-uuid>'
ORDER BY earned_at DESC;
\`\`\`

To find your test user UUID:

\`\`\`sql
SELECT id, email FROM users WHERE email = 'dev1@worshiproom.com';
\`\`\`

## localStorage canonicality verification
- [ ] Refresh the frontend page after the smoke test
- [ ] All UI elements (points total, streak counter, recent badges, daily activity card) reflect the SAME state that was visible before the refresh
- [ ] Confirms localStorage is still source of truth for reads — backend traffic is shadow only

## Accessibility smoke (Universal Rule 17)
- [ ] Run axe-core automated scan on /, /daily, /prayer-wall, /bible, /music routes (Phase 2 modified the activity-recording hook only; no new components — scope is "verify existing routes still scan clean")
- [ ] Save axe-core JSON output to _cutover-evidence/phase2-a11y-smoke.json (replace placeholder content)
- [ ] Zero CRITICAL violations across the scanned routes
- [ ] Keyboard-only walkthrough of the daily hub primary flow (open daily hub → tap pray → see the activity recorded indicator) completes without dead-ends
- [ ] VoiceOver spot-check on Prayer Wall pray-button interaction completes without blocking issues
- [ ] Brief notes saved to _cutover-evidence/phase2-a11y-notes.md (replace placeholder content)

## Production deploy plan
- [ ] Verify Railway frontend Dockerfile exposes VITE_USE_BACKEND_ACTIVITY (mirror the VITE_API_BASE_URL pattern from Spec 1.10 — `ARG` + `ENV` before `RUN pnpm build`). If missing, add a one-line Dockerfile patch.
- [ ] Add VITE_USE_BACKEND_ACTIVITY=true to Railway frontend service env vars (Variables tab → + New Variable)
- [ ] Trigger a Railway deploy (push to main, or manual deploy)
- [ ] After deploy completes: smoke test 1 activity in prod (use a real account, tap pray, verify backend received the row via `railway connect postgres`)
- [ ] If prod smoke test fails: see Rollback plan below

## Rollback plan (if prod surfaces issues)

If anything goes wrong in production after the deploy:

1. Set VITE_USE_BACKEND_ACTIVITY=false in Railway frontend service env vars
2. Trigger a redeploy (or wait for next auto-deploy)
3. Verify in DevTools that subsequent recordActivity calls no longer fire POST /api/v1/activity
4. localStorage data is untouched; users see no difference
5. Backend rows already written remain (shadow data, no consumer)
6. Open a followup entry in `_plans/post-1.10-followups.md` describing what failed
7. Do NOT revert the spec's commit. The flag-flip stays; the env var override is the rollback mechanism.

## Sign-off
- Cutover date: ____________
- Eric's sign-off: ____________
- Local smoke test passed: ____________
- Production smoke test passed: ____________
- A11y evidence committed: ____________
- Phase 2 status: COMPLETE pending Spec 2.10 (historical backfill).
```

(Note: the SQL fenced code blocks above are escaped with backslash-backtick because they live inside the spec's outer fenced markdown block; the actual checklist file uses plain triple-backtick fences.)

---

## Tests Required

This spec has NO automated tests. The deliverable is a flag flip + a manual checklist + manual smoke evidence. Adding automated tests for a flag flip is busywork.

Vitest tests authored in Spec 2.7 already verify both flag states (10 tests across flag-off, flag-on, error handling, and idempotency scenarios). Drift detection from Spec 2.8 already verifies implementation parity. Nothing else to test in code.

The smoke test results are captured in `_cutover-evidence/phase2-a11y-smoke.json` and `_cutover-evidence/phase2-a11y-notes.md`. Those files are the evidence; they're not "tests" in the executable sense.

---

## Out of Scope

- Promoting backend reads to source-of-truth (future spec)
- Historical activity backfill (Spec 2.10)
- Reconciliation between divergent localStorage and backend state (no reconciliation exists yet)
- Endpoint-specific monitoring/dashboarding (Spec 1.10d's Sentry covers exception capture; that's enough)
- Modifying the `wr:activity-recorded` external event paths (Spec 2.7 followup; the listen-path bypass in Smoke 5 is documented, not fixed)
- Adding rate limiting specific to `/api/v1/activity` (general per-IP rate limiting from Spec 1 still applies)
- Changing the dual-write strategy (still fire-and-forget; still localStorage-canonical for reads)
- Vite config changes (per Architectural Decision #5)
- Backend changes
- Migrating other localStorage features (badges, prayer wall, etc.) — Phase 3 territory
- Authoring a "rollback test" — manual Railway env var change is the rollback; nothing to automate
- Updating the `isBackendActivityEnabled` docstring (per Architectural Decision #7)
- Updating CLAUDE.md (per Architectural Decision #6)

---

## Acceptance Criteria

- [ ] `frontend/.env.example` has `VITE_USE_BACKEND_ACTIVITY=true`
- [ ] Comment block above the flag updated to reflect cutover (e.g., "Activated by Spec 2.9 cutover on 2026-04-27.")
- [ ] `_plans/forums/phase02-cutover-checklist.md` exists with the full structure listed in "Deliverable Structure" above
- [ ] `_cutover-evidence/phase2-a11y-smoke.json` exists as a placeholder noting Eric authors real content during smoke-test execution (CC creates the scaffold; the axe scan output is Eric's manual capture)
- [ ] `_cutover-evidence/phase2-a11y-notes.md` exists as a placeholder noting Eric records keyboard + VoiceOver outcomes during smoke-test execution
- [ ] CLAUDE.md unchanged (per Architectural Decision #6 and Recon F)
- [ ] `vite.config.ts` unchanged (per Architectural Decision #5 and Recon G)
- [ ] `frontend/src/lib/env.ts` unchanged (per Architectural Decision #7)
- [ ] No backend changes
- [ ] No `openapi.yaml` changes
- [ ] No `master.xml` or schema changes
- [ ] No test file changes
- [ ] All Phase 2 deliverables (2.1-2.8) unchanged
- [ ] Build still succeeds (`pnpm build`) with flag = true
- [ ] All existing Vitest tests still pass with flag = true (baseline 8,811 pass / 11 known-fail; any NEW failing file or fail count > 11 is a regression)
- [ ] Spec tracker (`_forums_master_plan/spec-tracker.md`) NOT modified (Eric flips rows manually after commit)
- [ ] Branch unchanged (still `forums-wave-continued`)

---

## Guardrails (DO NOT)

- Do **NOT** change branches. Stay on `forums-wave-continued`.
- Do **NOT** modify any backend file.
- Do **NOT** modify `openapi.yaml`.
- Do **NOT** modify `master.xml` or any Liquibase changeset.
- Do **NOT** modify any Phase 2 service, entity, repository, or test file.
- Do **NOT** modify `hooks/useFaithPoints.ts` (Spec 2.7's wiring is correct as-is).
- Do **NOT** modify `lib/env.ts` (Spec 2.7's helper is correct as-is; the docstring "Default: false. Cutover owned by Spec 2.9." is a courtesy update, not a deliverable).
- Do **NOT** modify `lib/api-client.ts`.
- Do **NOT** modify `vite.config.ts` (recon verified zero references).
- Do **NOT** modify `CLAUDE.md` (Phase 2 is not closed yet; Phase 2 summary belongs in a post-2.10 hygiene update).
- Do **NOT** add automated tests for the flag flip.
- Do **NOT** touch the `wr:activity-recorded` external event paths.
- Do **NOT** promote backend reads to source-of-truth.
- Do **NOT** add reconciliation logic between localStorage and backend.
- Do **NOT** add endpoint monitoring/dashboarding.
- Do **NOT** add rate limiting.
- Do **NOT** execute the manual smoke test (CC can document the steps but cannot operate the dev frontend interactively to actually run the test). Eric runs it.
- Do **NOT** generate the `_cutover-evidence/*` files with fake axe-core JSON output. Eric runs the scans; CC creates only placeholder scaffolds noting that real content lands during execution.
- Do **NOT** commit, push, or do any git operation. Eric handles all git.
- Do **NOT** touch `_forums_master_plan/spec-tracker.md`.

---

## Plan Shape Expectation

`/plan-forums` output for this S/Medium spec should be **6-8 steps**:

1. Recon: read `frontend/.env.example`, `frontend/src/lib/env.ts`, `_plans/forums/phase01-cutover-checklist.md`, `CLAUDE.md`. Search `vite.config.ts` for any `VITE_USE_BACKEND_ACTIVITY` reference (verify zero matches). Confirm CLAUDE.md edit decision (recon already says no).
2. Flip `VITE_USE_BACKEND_ACTIVITY=false → true` in `frontend/.env.example`. Update the surrounding comment block.
3. Skip CLAUDE.md edit (per recon decision and Architectural Decision #6).
4. Author `_plans/forums/phase02-cutover-checklist.md` per the structure in "Deliverable Structure" above. Use the actual activity types and feature paths Phase 2 modified.
5. Create placeholder/scaffold versions of `_cutover-evidence/phase2-a11y-smoke.json` and `_cutover-evidence/phase2-a11y-notes.md` noting that Eric authors the real content during smoke test execution.
6. Run `pnpm build` to verify the flag flip doesn't break the build. Run `pnpm test` to verify Vitest tests still pass at the 8,811 / 11 baseline.
7. Self-review against acceptance criteria.

If the plan comes back with 12+ steps, proposes modifying any backend file, proposes adding automated tests for the flag, proposes `vite.config.ts` changes without recon evidence, proposes generating fake a11y evidence, proposes a CLAUDE.md edit, or proposes a `lib/env.ts` docstring update — push back hard.

---

## Notes for Eric

- **Smallest spec of Phase 2 by code change. Largest by ceremony.** The cutover checklist is THE deliverable; the flag flip is a one-line change.

- **Pre-execution checklist:** Docker should be running so the build verification step can confirm clean. The MANUAL smoke test phase requires Docker, Postgres up, backend running, frontend running, and a logged-in dev user. Plan 30-45 minutes for the manual smoke walkthrough.

- **The a11y evidence files are authored DURING the smoke test, not by CC.** CC creates placeholder/scaffold files; Eric runs axe-core (you can adapt `_cutover-evidence/capture-axe-evidence.mjs` from Phase 1 — just add the Phase 2 routes to the `ROUTES` array constant), exports JSON, replaces the placeholder contents.

- **The Railway production env var step is a separate manual task you do after committing this spec.** The committed flag flip in `.env.example` doesn't automatically affect prod — Railway env vars are independent. You may also need to patch the Railway frontend Dockerfile to expose `VITE_USE_BACKEND_ACTIVITY` via `ARG` + `ENV` before `RUN pnpm build` (mirror the `VITE_API_BASE_URL` pattern from Spec 1.10's cutover scope extension).

- **If the smoke test surfaces ANY problem** (backend rejects the request, JWT auth fails, persistence skips a step, etc.), DO NOT commit this spec. Open a followup, fix the underlying issue first, retry the smoke test, then commit.

- **Phase 2 status after this spec ships:** 9/10 done. Only Spec 2.10 (Historical Activity Backfill) remains. M-sized, Medium-risk. Wires a one-time backfill of localStorage history to backend shadow tables for users who had Phase 1 activity before this cutover.

- **Spec 2.8 tracker note:** the spec tracker shows 2.8 as ⬜ but the spec file (`_specs/forums/spec-2-8.md`), plan (`_plans/forums/2026-04-27-spec-2-8.md`), and commit (`ecc45e2 spec-2-8`) all exist on the branch. The brief stating "Prerequisites: 2.8 ✅" reflects your actual working state, not the tracker — flip the tracker after 2.8's manual verification completes if you haven't already.
