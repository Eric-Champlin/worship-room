# Shared Test Fixtures

This directory holds JSON fixture files consumed by both the backend (Java/Maven) test suite AND the frontend (TypeScript/Vitest) test suite. Each fixture defines parameterized test scenarios that BOTH implementations must satisfy.

## Files

- `activity-engine-scenarios.json` — Drift detection between the frontend and backend activity engines (faith points, streak, badges, repair eligibility). Consumed by `backend/src/test/java/com/worshiproom/activity/DriftDetectionTest.java` and `frontend/src/services/__tests__/activity-drift.test.ts`. Introduced by Forums Wave Spec 2.8.
- `qotd-rotation.json` — Drift detection between the frontend `getTodaysQuestion()` (`frontend/src/constants/question-of-the-day.ts`) and the backend `QotdService.findForDate()` (`backend/src/main/java/com/worshiproom/post/QotdService.java`) on the modulo-72 rotation path. Consumed by `backend/src/test/java/com/worshiproom/post/QotdDriftDetectionTest.java` and `frontend/src/constants/__tests__/qotd-drift.test.ts`. Introduced by Forums Wave Spec 3.9. Frontend consumer mocks `getLiturgicalSeason` to `isNamedSeason: false` so all dates exercise the shared modulo path; the seasonal branch is the deferred Phase 9.2 regression documented in spec D1.

## Adding a Scenario

1. Append a new entry to the `scenarios` array in the relevant fixture file.
2. Ensure the new scenario has a unique `id` (kebab-case, descriptive).
3. Compute the expected values by hand or by running a one-shot generator against the existing implementation. Do NOT compute expected values by running the drift test itself — that is circular.
4. Run the backend and frontend tests; both must pass without code changes (the harnesses are parameterized — they pick up new scenarios automatically).

## Why JSON?

Both Jackson (backend) and Vite/Vitest (frontend) parse JSON natively. No new dependencies on either side. YAML or TOML would force a parser dependency on at least one side.

## Why At Repo Root?

The directory follows the existing underscore-prefix convention for non-source repo directories: `_plans/`, `_specs/`, `_recon/`, `_reports/`, `_cutover-evidence/`, `_forums_master_plan/`. Fixtures sit alongside these and are not part of either the backend or frontend build artifact.
