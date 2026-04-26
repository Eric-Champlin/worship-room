# Forums Wave: Spec 2.7 — Frontend Activity Dual-Write

**Master Plan Reference:** `_forums_master_plan/round3-master-plan.md` → Spec 2.7 (line 2774)
**Branch:** `forums-wave-continued` (stay on this branch — no per-spec sub-branch)
**Date:** 2026-04-26

---

## Affected Frontend Routes

N/A — frontend-only spec, but no user-visible UI changes. The dual-write flag (`VITE_USE_BACKEND_ACTIVITY`) defaults to `false`, so behavior is byte-identical to today on every route. When the flag is flipped on locally for smoke-testing (Spec 2.9 owns the cutover), the backend dispatch is silent — no toast, no banner, no animation, no error surface. `/verify-with-playwright` is therefore skipped for this spec.

The signature change to `recordActivity(type, sourceFeature)` ripples through ~12 call sites but is a TypeScript-time concern, not a runtime one — Vitest covers the behavior change.

---

## Spec Header

- **ID:** `round3-phase02-spec07-frontend-activity-dual-write`
- **Size:** M
- **Risk:** Medium (touches the load-bearing `recordActivity` function that ~12 call sites depend on; signature change ripples to every caller)
- **Prerequisites:** 2.6 (Activity API Endpoint) ✅ — `POST /api/v1/activity` exists in `com.worshiproom.activity`, with `ActivityRequest`/`ActivityResponse` DTOs in the OpenAPI spec and codegen output present in the frontend.
- **Phase:** 2 — Activity Engine Migration (Dual-Write)
- **Seventh spec of Phase 2. First frontend-only spec of the phase.** Specs 2.8 (drift detection), 2.9 (cutover), and 2.10 (backfill) layer on top.

---

## Goal

Wire the frontend's existing `recordActivity` flow to fire-and-forget `POST /api/v1/activity` (the endpoint shipped in Spec 2.6) after the localStorage updates complete. localStorage stays source of truth for reads. The backend is a shadow copy.

**Behavior with the env flag OFF (default):** identical to today. No backend call, no observable change.

**Behavior with the env flag ON:** localStorage updates fire first and produce all UX (celebrations, sound effects, state). The backend call fires after, doesn't await, errors silently logged.

Cutover (flipping the flag default to `true`) is Spec 2.9, not this spec. This spec just builds the wiring under a flag that defaults off.

---

## Master Plan Divergences

Two clarifications from master plan v2.9 § Spec 2.7 worth flagging before drafting.

### Divergence 1 — `recordActivity` lives in a hook, not a service

The master plan body says "Locate the existing `recordActivity()` function — likely `services/activity-recorder.ts` or similar."

**Verified:** it lives in `frontend/src/hooks/useFaithPoints.ts` as a `useCallback` inside the `useFaithPoints` hook. There is no `services/activity-recorder.ts` file. The current signature (line 127) is `recordActivity: (type: ActivityType) => void`; the implementation is at line 138.

**Resolution:** this spec modifies `hooks/useFaithPoints.ts`. The wiring goes in the `recordActivity` `useCallback`, positioned after `persistAll`, `setState`, and the `window.dispatchEvent` calls.

### Divergence 2 — Signature change: `sourceFeature` becomes a required parameter

The current signature is `recordActivity(type: ActivityType)`. The backend's `POST /api/v1/activity` (Spec 2.6) requires a `@NotBlank` `source_feature` field in the request body. The frontend has to supply it.

Two options were considered:

- **(a)** Add a required `sourceFeature` parameter; update every caller
- **(b)** Default to `'unknown'` or a heuristic; let callers override

This brief picks **option (a)** — every caller must declare which feature they represent. Reasons:

- Backend rate-limiting and analytics get real data from day one rather than `'unknown'` soup
- Bug investigation: knowing "this point came from `daily_hub` Pray vs `prayer_wall` Pray" matters
- Migration cost is bounded (~12 call sites; recon enumerates via grep)

**Source-feature string vocabulary** (recon verifies during execution by listing call sites and matching them to feature areas):

| String | Caller |
|---|---|
| `daily_hub` | DailyHub component |
| `prayer_wall` | Prayer Wall (pray button, post composer) |
| `bible` | Bible reader |
| `music` | Music player completion |
| `meditate` | Meditation timer |
| `journal` | Journal entry save |
| `gratitude` | Gratitude entry |
| `mood` | Mood card |
| `reading_plan` | Reading plan day completion |
| `challenge` | Challenge daily completion |
| `local_support` | Local support visit |
| `devotional` | Devotional read |

These are **suggested**; recon may surface additional features. Match each call site to whichever string fits naturally — the backend's `source_feature` column is a `VARCHAR(50)`, not constrained.

---

## Recon Facts (verified during brief authoring — re-verify suspect ones during execution)

### A) The existing `recordActivity` flow

In `frontend/src/hooks/useFaithPoints.ts`, the `recordActivity` `useCallback` executes (in order):

1. Auth gate: `if (!isAuthenticated) return`
2. Idempotency check: `if (todayEntry[type]) return`
3. Update `todayEntry`, recalculate daily points
4. Compute `pointDifference`, update `faithPoints`
5. Update streak (with `capturePreviousStreak` side effect on reset transitions where `currentStreak > 1`)
6. Read badge data, increment activity count
7. Run `checkForNewBadges`
8. Award new badges + handle `full_worship_day` counter
9. `saveBadgeData`
10. `persistAll(activityLog, newFaithPoints, newStreak)`
11. `setState({...})`
12. `window.dispatchEvent('wr:points-earned', ...)`
13. `window.dispatchEvent('wr:level-up', ...)` if applicable

The dual-write call inserts as **step 14** — after all the existing work, fire-and-forget. The early returns in steps 1 and 2 mean the backend call never fires for unauthenticated calls or same-day repeats. That matches the dual-write strategy: the backend is a shadow of localStorage state.

### B) The existing API client

Verified by reading `frontend/src/lib/api-client.ts`. Standard helper:

```ts
apiFetch<T>(path, options): Promise<T>
```

- Auto-prepends `VITE_API_BASE_URL`
- Auto-attaches `Authorization: Bearer <token>` from `auth-storage` (unless `skipAuth: true`)
- 30s default timeout via `AbortController`
- Parses `{ data, meta }` envelope; returns `data` typed
- Throws `ApiError` on non-2xx
- 401 on authenticated request → clears stored token, dispatches `AUTH_INVALIDATED_EVENT`

This is the canonical client for new code (per the file's own header comment). Spec 2.7 uses it.

### C) Generated API types (from Spec 2.6's openapi changes)

After Spec 2.6 ran codegen, the frontend has generated TypeScript types for `ActivityRequest` and `ActivityResponse`. Recon verifies the exact import path during execution (likely `@/types/api/activity` or similar — check the codegen output location).

The dual-write call constructs an `ActivityRequest` body and ignores the `ActivityResponse` on success (we do not read backend results during dual-write).

### D) Environment variable pattern

Vite env vars are build-time, prefixed `VITE_`. Existing example from `frontend/.env.example` (verify during recon):

```
VITE_API_BASE_URL=http://localhost:8080
VITE_USE_BACKEND_AUTH=true   # added in Spec 1.10 cutover
```

This spec adds:

```
VITE_USE_BACKEND_ACTIVITY=false
```

Default `false` until Spec 2.9 flips it. Reading the flag in code follows the existing pattern (likely `import.meta.env.VITE_USE_BACKEND_ACTIVITY === 'true'` or the env helper at `lib/env.ts` — verified to exist; recon confirms the existing accessor pattern).

### E) The `wr:activity-recorded` external event (out of scope)

`useFaithPoints.ts` listens for a `wr:activity-recorded` window event from external code paths (e.g., listen tracker in the music player) that update localStorage directly without going through `useFaithPoints.recordActivity`. The listener just refreshes React state.

**These external paths are out of scope.** Wiring them to dual-write requires finding each one and modifying it. This spec only modifies `useFaithPoints.recordActivity`. Recon should grep for `wr:activity-recorded` dispatches during execution and surface them as a followup entry in `_plans/post-1.10-followups.md` (NOT add them to scope).

### F) User timezone — not the frontend's concern

The backend reads `user.timezone` from the `users` table to compute "today" for first-time-today gating. The frontend sends only `activity_type`, `source_feature`, optional `metadata`. Timezone derivation happens server-side per Spec 2.6's design. Frontend doesn't need to send timezone.

---

## Architectural Decisions

### 1. Placement: after all existing work, inside `recordActivity`

The backend call goes at the end of the `recordActivity` `useCallback`, after step 13 (window dispatches). All localStorage writes, React state updates, sound effects, and celebrations have already completed. If the backend call fails, none of that is affected.

### 2. Fire-and-forget pattern

```ts
// Fire-and-forget; do NOT await
if (isBackendActivityEnabled()) {
  postActivityToBackend(type, sourceFeature)
    .catch((err) => {
      // Silent failure — log but never surface
      console.warn('[useFaithPoints] backend dual-write failed:', err);
    });
}
```

No `await`. The promise dangles deliberately. JavaScript's event loop processes the microtask after the synchronous `recordActivity` work returns; React re-renders are not blocked.

The `.catch` handler is **required**. Without it, the unhandled rejection generates a noisy console error on every backend failure and triggers global window error handlers.

### 3. Signature change

Current:

```ts
recordActivity: (type: ActivityType) => void
```

New:

```ts
recordActivity: (type: ActivityType, sourceFeature: string) => void
```

`sourceFeature` is **required** (not optional). TypeScript enforces caller updates. Every existing call site must pass an explicit string per the vocabulary in Divergence 2.

If `sourceFeature` defaults to `undefined` (optional) or empty string, the backend's `@NotBlank` validation rejects with 400 and the dual-write fails on every call. Required typing prevents this entire failure mode.

### 4. Env flag gate — fail-closed

If `VITE_USE_BACKEND_ACTIVITY` is anything other than the exact string `'true'`, the backend call doesn't fire. Includes: `'false'`, `''`, `undefined`, malformed values.

Helper (in `useFaithPoints` or a new util in `lib/env.ts`):

```ts
function isBackendActivityEnabled(): boolean {
  return import.meta.env.VITE_USE_BACKEND_ACTIVITY === 'true';
}
```

String comparison only. Don't use truthiness — `'false'` is truthy as a string.

### 5. Silent error handling

The `.catch` handler logs to `console.warn` (or `console.error` if the codebase convention is consistent on that — verify during recon). It does **NOT**:

- Show a toast
- Throw
- Update React state
- Dispatch a window event
- Block the next call
- Surface anything to the user

The user sees identical UX whether the backend is up, down, slow, or returning 500s. localStorage is the contract.

Two specific cases worth noting:

- **401 from backend** → `apiFetch` already handles this by clearing the token and firing `AUTH_INVALIDATED_EVENT`. The dual-write's `.catch` sees an `ApiError` and logs; `AuthContext` handles the actual logout via the event listener.
- **Network error** → `apiFetch` throws `ApiError('NETWORK_ERROR', 0, ...)`. The `.catch` logs and moves on.

### 6. The call itself

```ts
async function postActivityToBackend(
  type: ActivityType,
  sourceFeature: string,
): Promise<void> {
  await apiFetch<ActivityResponse>('/api/v1/activity', {
    method: 'POST',
    body: JSON.stringify({
      activity_type: type,
      source_feature: sourceFeature,
      // metadata omitted — frontend has no metadata to send today
    }),
  });
  // Response data is intentionally discarded. Backend
  // is a shadow; localStorage stays canonical for reads.
}
```

Note `activity_type` and `source_feature` are snake_case to match the backend's openapi shape. The generated TypeScript types should reflect this.

### 7. Metadata field stays unused for now

Spec 2.6's request body accepts an optional `metadata` JSONB field. The frontend has no metadata to send today (no contextual data the backend cares about). A future spec may add metadata for things like "this prayer was for X friend" or "this bible chapter was John 3" — when that's needed, extend `recordActivity`'s signature again.

### 8. No retry, no queue, no offline buffer

Fire-and-forget means lost calls stay lost. Implementing retry or offline queueing is out of scope (and arguably wrong — the dual-write strategy explicitly accepts that the backend will be incomplete). When backend reads become source of truth in a future wave, the localStorage data gets backfilled then (Spec 2.10 owns the backfill).

---

## Deliverables

### Files to modify

- **`frontend/src/hooks/useFaithPoints.ts`** — three changes:
  - (a) `recordActivity` signature: add `sourceFeature: string`
  - (b) Add `postActivityToBackend` helper (private to this file OR exported from a new util — recon's call)
  - (c) Wire fire-and-forget call at end of `recordActivity`, gated by env flag
- **`frontend/.env.example`** — add line: `VITE_USE_BACKEND_ACTIVITY=false`
- **`frontend/src/lib/env.ts`** — add typed accessor for `VITE_USE_BACKEND_ACTIVITY` if the existing pattern uses one. Otherwise inline the check.
- **All call sites of `recordActivity`** (recon enumerates via grep; estimated ~12 sites). Each call gets a `sourceFeature` string per the vocabulary in Divergence 2.
- **`frontend/src/hooks/__tests__/useFaithPoints.test.ts`** — extend with the test scenarios in Tests Required. Existing tests stay green; new tests cover dual-write behavior.
- **`_plans/post-1.10-followups.md`** — add a followup entry documenting the `wr:activity-recorded` external event paths that bypass `useFaithPoints.recordActivity` and aren't dual-written. Include the locations recon found via grep.

### Files NOT to modify

- `frontend/src/lib/api-client.ts` (use as-is)
- `backend/**` (all of it; this is frontend-only)
- `openapi.yaml` (unchanged from Spec 2.6)
- Generated API types (unchanged from Spec 2.6)
- Any other hook, service, or component beyond the `recordActivity` call sites
- `_forums_master_plan/spec-tracker.md`

---

## Tests Required

Test class: existing `frontend/src/hooks/__tests__/useFaithPoints.test.ts` (Vitest + React Testing Library; verify pattern during recon).

Master plan asks for "at least 5 tests cover both flag states." Aim for **at least 10 tests** across the four scenario groups below. The brief enumerates 12 candidate tests; pick the 10 best (drop the lowest-value duplicates after recon — likely the URL-shape test if it's redundant with the body-shape test, and one of the flag-off variants).

### A) Flag-off behavior (3 tests — preserve existing behavior)

1. With `VITE_USE_BACKEND_ACTIVITY` undefined → no backend call fires (mock fetch and assert zero invocations); localStorage updates as before.
2. With `VITE_USE_BACKEND_ACTIVITY = 'false'` → no backend call fires.
3. With `VITE_USE_BACKEND_ACTIVITY = ''` → no backend call fires (fail-closed).

### B) Flag-on behavior (5 tests)

1. With flag = `'true'` and `isAuthenticated` → backend call fires after localStorage write completes.
2. Backend call body has correct `activity_type` and `source_feature` shape.
3. `recordActivity` returns synchronously (no await on the backend call); the localStorage state and React state are updated before any backend response.
4. Backend call URL is `/api/v1/activity` (the `apiFetch` auto-prepends base URL).
5. `Authorization` header attached automatically (`apiFetch` reads stored token).

### C) Error handling (3 tests)

1. Backend returns 500 → `console.warn` logged; no toast, no state regression, no thrown exception escaping.
2. Backend network error (mock fetch rejection) → `console.warn` logged; `recordActivity` completes normally.
3. Backend 401 → `ApiError` caught, `AUTH_INVALIDATED_EVENT` fires once (existing `apiFetch` behavior; spec verifies it still works in the dual-write context).

### D) Idempotency interaction (1 test)

1. With flag on, calling `recordActivity` twice for the same type same day → backend call fires **once** only (the idempotency early-return on second call prevents the backend dispatch too).

**Total target: 10 tests.** All run against mocked fetch (no real network). Wall-clock: should add <500 ms to the existing `useFaithPoints` test suite.

---

## Out of Scope

- The `wr:activity-recorded` external event paths. They're documented as a followup but not wired in this spec.
- Reading the backend's `ActivityResponse`. Frontend stays localStorage-canonical for reads.
- Cross-device sync. Same constraint — backend is shadow.
- Retry/queue/offline buffer for failed backend calls.
- Toast or UI feedback on backend errors.
- Per-call-site instrumentation for `source_feature` analytics beyond passing the string.
- Telemetry/Sentry on dual-write failures (`apiFetch` already surfaces `ApiError`s to whatever instrumentation exists).
- Modifying the streak repair flow (`repairStreak` callback); it's a separate operation and a future spec will dual-write repairs when persistence lands.
- Modifying the `clearNewlyEarnedBadges` callback; it's pure client state.
- Flipping the flag default to `true` (Spec 2.9).
- Drift detection (Spec 2.8).
- Backfill of historical activity data (Spec 2.10).
- Modifying any backend file.
- Modifying `openapi.yaml`.
- Modifying the `api-client.ts` itself.

---

## Acceptance Criteria

- [ ] `recordActivity` signature updated to require `sourceFeature: string`
- [ ] All existing call sites of `recordActivity` updated to pass an explicit `sourceFeature` string per the Divergence 2 vocabulary
- [ ] TypeScript compiles cleanly with the new signature (no callers missing the param)
- [ ] `VITE_USE_BACKEND_ACTIVITY` documented in `.env.example` with default `'false'`
- [ ] `postActivityToBackend` uses `apiFetch` from `lib/api-client.ts`
- [ ] Dual-write call placed at end of `recordActivity`, after `persistAll`, `setState`, and window dispatches
- [ ] Fire-and-forget (no `await` on the backend promise; `.catch` handler attached)
- [ ] Backend errors silently logged via `console.warn`; no toast, no thrown exception, no state regression
- [ ] Flag-off behavior is byte-identical to current behavior
- [ ] Flag-on behavior fires the backend call after localStorage writes
- [ ] Backend call body uses snake_case `activity_type` and `source_feature` matching the openapi schema
- [ ] `Authorization` header attached automatically via `apiFetch`
- [ ] Same-day idempotent repeats do NOT fire the backend (the existing early-return on `todayEntry[type]` gates both localStorage and backend)
- [ ] At least 10 tests cover the four scenario groups in Tests Required, all green
- [ ] Existing `useFaithPoints` tests still pass
- [ ] No frontend regression in any other test file
- [ ] No backend changes
- [ ] No `openapi.yaml` changes
- [ ] Followup entry in `_plans/post-1.10-followups.md` documents the `wr:activity-recorded` external paths still untouched
- [ ] Build succeeds (`pnpm build`) with no warnings

---

## Guardrails (DO NOT)

- Do **NOT** change branches. Stay on `forums-wave-continued`.
- Do **NOT** modify any backend file.
- Do **NOT** modify `openapi.yaml` or generated API types.
- Do **NOT** modify `api-client.ts` itself.
- Do **NOT** await the backend call. Fire-and-forget.
- Do **NOT** make `sourceFeature` optional. Required typing prevents the `@NotBlank` failure mode.
- Do **NOT** default `sourceFeature` to `'unknown'` or any sentinel. Update each call site explicitly.
- Do **NOT** show a toast or any UI on backend errors.
- Do **NOT** add retry logic.
- Do **NOT** add an offline queue.
- Do **NOT** read or use the `ActivityResponse` data. Discard it.
- Do **NOT** remove the existing idempotency check (`if (todayEntry[type]) return`). The frontend's same-day semantics drive the dual-write.
- Do **NOT** add the dual-write to the `wr:activity-recorded` event listener path. Followup, not scope.
- Do **NOT** modify `repairStreak` or `clearNewlyEarnedBadges`.
- Do **NOT** flip `VITE_USE_BACKEND_ACTIVITY` to `true`. Spec 2.9 owns the cutover.
- Do **NOT** invent new `source_feature` strings outside the vocabulary in Divergence 2 unless recon surfaces a call site that genuinely doesn't fit one of those.
- Do **NOT** use truthiness on the env flag. Exact string comparison to `'true'`.
- Do **NOT** add Sentry instrumentation in this spec. `apiFetch`'s existing error path is sufficient.
- Do **NOT** commit, push, or do any git operation. Eric handles all git.
- Do **NOT** touch `_forums_master_plan/spec-tracker.md`.

---

## Plan Shape Expectation

`/plan-forums` output for this M/Medium spec should be **9–13 steps**:

1. Recon: read `hooks/useFaithPoints.ts` (the `recordActivity` `useCallback`), `lib/api-client.ts` (apiFetch usage pattern), `.env.example` (existing flag pattern), generated API types from Spec 2.6's openapi update. Grep for ALL call sites of `recordActivity` across `frontend/src`. Grep for `wr:activity-recorded` dispatches and document locations.
2. Add `VITE_USE_BACKEND_ACTIVITY` to `.env.example`.
3. Add `isBackendActivityEnabled` helper (in `env.ts` if it exists, otherwise inline).
4. Add `postActivityToBackend` helper inside `useFaithPoints.ts`.
5. Modify `recordActivity` signature: add `sourceFeature` param.
6. Wire fire-and-forget call at end of `recordActivity`, gated by the flag.
7. Update every call site found in step 1 to pass an explicit `sourceFeature` string per the Divergence 2 vocabulary.
8. Verify TypeScript compiles cleanly (no missing-param errors).
9. Extend `useFaithPoints.test.ts` with the 10 new test scenarios.
10. Run `pnpm test`; iterate.
11. Run `pnpm build`; verify no warnings.
12. Add followup entry to `_plans/post-1.10-followups.md` documenting the untouched `wr:activity-recorded` external paths with their file locations.
13. Self-review against acceptance criteria.

If the plan comes back with 18+ steps, proposes wiring the external event paths into scope, proposes retry/queue logic, proposes reading the `ActivityResponse`, or proposes flipping the flag default — push back hard.

---

## Notes for Eric

- First frontend changes since the doc/content specs of Phase 1. Different feel from the recent backend specs.
- The signature change (adding required `sourceFeature`) will show up as TypeScript errors at every call site as soon as CC modifies the type. This is the desired behavior — the compiler enumerates the call sites for you.
- After this spec ships and you commit, the dual-write is **wired but off**. To smoke-test it locally:
  1. Set `VITE_USE_BACKEND_ACTIVITY=true` in `frontend/.env.local`
  2. Restart frontend dev server (Vite env vars are build-time)
  3. Make sure backend is running and Postgres is up
  4. Tap an activity in the UI
  5. Check the backend's `activity_log` table for the row
  6. Verify localStorage still shows the activity in `wr_daily_activities`

  This is a Spec 2.9 task formally, but useful reassurance.
- **Pre-execution checklist:** Docker NOT required (frontend-only spec; no backend tests). Postgres NOT required.
- After 2.7 ships, Spec 2.8 (Drift Detection) ships the cross-implementation parity test. M-sized, Low-risk. Establishes `_test_fixtures/activity-engine-scenarios.json` and runs both impls against it.
- **Phase 2 status after this spec:** 7/10 done. Specs 2.8 (M), 2.9 (S), 2.10 (M) remaining.
