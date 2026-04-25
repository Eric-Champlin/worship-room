# Forums Wave: Spec 1.10l — Playwright E2E Test Infrastructure

**Master Plan Reference:** `_forums_master_plan/round3-master-plan.md` → Spec 1.10l (lines 8272–8288), Appendix E
**Branch:** `forums-wave-continued` (existing branch — explicit instruction in brief: do NOT change branches)
**Date:** 2026-04-25

---

## Affected Frontend Routes

N/A — frontend test-infrastructure-only spec. No user-facing route changes. The refactor touches `frontend/e2e/`, `frontend/tests/`, `frontend/playwright.config.ts`, and `frontend/docs/` only.

---

## ID

`round3-phase01-spec10l-playwright-e2e-test-infrastructure`

(Master plan canonical ID is `round3-phase01-spec10l-playwright-e2e`; brief extends with `-test-infrastructure` suffix to disambiguate from a future "CI wiring" follow-up. Both forms refer to the same spec.)

## Size

M

## Risk

Low (refactor-and-extract; no new tests, no behavior changes, no dependency bumps)

## Prerequisites

- 1.9 (Frontend AuthContext JWT Migration) ✅
- 1.9b (Error & Loading State Design System) ✅
- 1.10 (Phase 1 Cutover and End-to-End Test) ✅
- 1.10j (Liveness/Readiness Health Checks) — shipped via commit `9a2b52d` (tracker not yet updated to ✅; treat as complete)

## Goal

Consolidate the duplicated patterns across the existing Playwright E2E specs into a small, reusable fixtures library and tighten `playwright.config.ts` so future tests inherit better defaults instead of reinventing them.

The honest motivation: the existing E2E tests work, but every new spec author copies the same `VIEWPORTS` array, the same screenshot-dir construction, the same `seedSkipDashboardGates` seed, the same backend mock setup, and the same Axe scan boilerplate. Phase 2 (Activity Engine) will land 6+ new endpoints, each likely needing E2E coverage. Without consolidation, each new spec adds 50–100 lines of boilerplate that drifts from the canonical pattern over time. Land the infrastructure now so Phase 2's E2E tests inherit it.

This spec is **REFACTOR-AND-EXTRACT, not new-feature.** No new tests are added. Existing tests are updated to use the new fixtures. Test count stays the same; lines-of-code in test files goes DOWN.

Three deliverables:

1. A `frontend/e2e/fixtures/` directory with a small set of reusable modules (viewports, paths, dashboard-gates, dev-seed constants, mock-backend helpers, axe wrappers).
2. Updated `playwright.config.ts` with sensible defaults: retries, screenshot/video on failure, HTML reporter, trace on first retry. NO browser-project expansion (still chromium-only) — adding firefox/webkit is its own follow-up when there's a real cross-browser concern.
3. Refactored existing 6 e2e specs (and applicable integration specs) that import from fixtures instead of inlining. Behavior unchanged; line counts down.

---

## Master Plan Divergences

Three deviations from master plan v2.9 § Spec 1.10l body. Each is intentional and should be preserved by `/plan-forums`.

### 1. NO CI INTEGRATION

Master plan body lists `.github/workflows/playwright.yml` and "wire E2E into CI" as deliverables. **Out of scope for this spec.** Worship Room has no CI today (no `.github/workflows/` directory; deploys are direct git push to Railway with no pre-merge checks). Wiring CI is genuinely a separate concern: requires picking a CI provider, configuring secrets, dealing with browser binaries in CI containers, and deciding when E2E should gate merges. Each of those is its own decision. Flagged as a known gap in `frontend/docs/e2e-test-patterns.md` § "Known gaps and follow-ups."

### 2. NO NEW BROWSER PROJECTS

Master plan suggests `chromium`/`firefox`/`webkit` matrix with three viewport projects (desktop 1440x900, tablet 768x1024, mobile 375x667). **This spec keeps chromium-only** because:

- Worship Room's actual browser support story is "modern evergreen browsers" with no formal commitment to specific vendors.
- Firefox + webkit add ~2-3x the test runtime with mostly-redundant coverage given the app uses no vendor-specific APIs.
- Cross-browser coverage is a real concern when the app starts using newer Web APIs (Web Speech, View Transitions, CSS @scope) — none of which Worship Room currently uses.

When the first vendor-specific bug surfaces in production, THAT's when to add the projects. Today is not that day. Note: viewport iteration still happens per-test via the `VIEWPORTS` fixture (not as Playwright projects), so visual capture across the three sizes continues to work as it does today.

### 3. NO NEW E2E TESTS

Master plan body lists adding coverage for "key user flows beyond auth" (smoke tests on dashboard, prayer wall, etc.). **Adding tests is genuinely Phase 2's job** — those flows belong with the specs that build them (Activity Engine has its own E2E coverage in Phase 2 specs). This spec is infrastructure-only: refactor and consolidate, not author. Future E2E tests inherit the cleaner foundation.

---

## Recon Facts (verified during brief authoring; CC re-verifies during plan)

- **Playwright version:** 1.58.2 in `package.json` devDependencies.
- **@axe-core/playwright:** 4.11.1 already present.
- **`frontend/playwright.config.ts`** is 9 lines (substantively 7):
  ```ts
  import { defineConfig } from '@playwright/test';

  export default defineConfig({
    testMatch: ['e2e/**/*.spec.ts', 'tests/**/*.spec.ts'],
    use: {
      headless: true,
      baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173',
    },
  });
  ```
  No projects, no retries, no reporter override, no trace config.

- **`frontend/e2e/`** contains 6 spec files (verified):
  - `bb37-full-audit.spec.ts`
  - `bb38-search-deeplink.spec.ts`
  - `full-site-audit.spec.ts`
  - `phase01-auth-roundtrip.spec.ts`
  - `spec-1-9-auth-flow.spec.ts`
  - `spec-1-9b-captures.spec.ts`

- **`frontend/tests/integration/`** contains 2 specs (verified — note: brief said `frontend/tests/`, actual path is `frontend/tests/integration/`):
  - `contextual-prompt.spec.ts`
  - `notification-deeplink.spec.ts`

- **Common patterns to extract** (grep across all 8 spec files during plan execution):
  - `VIEWPORTS` const (`{ name, width, height }`) — confirmed in `phase01-auth-roundtrip`, `spec-1-9-auth-flow`, `spec-1-9b-captures`. Other files: TBD during plan recon.
  - `SCREENSHOT_DIR` construction via `path.resolve` + `fileURLToPath(import.meta.url)` boilerplate — confirmed in same files.
  - `seedSkipDashboardGates()` — defined inline in `phase01-auth-roundtrip.spec.ts`; pattern is reusable.
  - `DEV_SEED_EMAIL` / `DEV_SEED_PASSWORD` constants — in `phase01-auth-roundtrip.spec.ts`.
  - `page.route()` mock-backend setup for AuthModal flows — confirmed in `phase01-auth-roundtrip` and `spec-1-9-auth-flow`. Other files: TBD.
  - `AxeBuilder` + WCAG 2.1 AA tags pattern — inline in multiple files.

- **`frontend/playwright-screenshots/`** is gitignored (verified — line in `.gitignore`).
- **`frontend/test-results/`** is gitignored (verified — `test-results/` line in `.gitignore`).
- **`.playwright-mcp/`** is also gitignored (verified).
- **No** `frontend/e2e/fixtures/` directory today.
- **No** `frontend/e2e/helpers/` directory today.
- **No** `frontend/docs/e2e-test-patterns.md` today.

---

## Architectural Decisions

### 1. FIXTURES DIRECTORY, NOT HELPERS

New directory: `frontend/e2e/fixtures/`. Use Playwright's "fixtures" terminology consistently — it's their term for reusable test setup. Avoids confusion with Vitest's "helpers" or generic "utils" naming. Each fixture module does one thing.

### 2. EACH FIXTURE MODULE IS PURE FUNCTIONS + CONSTANTS

No classes, no Playwright `test.extend(...)` magic for this spec. The Playwright fixtures API is powerful but has a learning curve; for an infrastructure-foundation spec, plain TS modules with exported functions and constants are easier to understand, easier to type-check, and easier to incrementally adopt. If/when a future spec genuinely needs `test.extend` (e.g., for per-test authenticated browser context), that's its own decision.

### 3. NO RUNTIME BEHAVIOR CHANGES

The refactor keeps existing test behavior identical:

- Same viewports, same screenshot paths, same Axe rule sets, same backend mocks, same dev-seed constants
- Test names unchanged
- Test count unchanged
- Per-test pass/fail outcomes unchanged (the same set of tests pass and the same `fixme`'d tests stay `fixme`'d)

This is a requirement, not a goal. **If extracting a fixture would change behavior, DO NOT extract it** — leave it inline and document the divergence as future work.

### 4. PLAYWRIGHT CONFIG TIGHTENING — INCLUDED, MODEST

Add:
- `retries: process.env.CI === 'true' ? 1 : 0` — catches flaky tests when CI exists later without making local dev painful.
- `use.screenshot: 'only-on-failure'`
- `use.video: 'retain-on-failure'`
- `use.trace: 'on-first-retry'`
- `reporter: [['list'], ['html', { open: 'never' }]]`

Do NOT add:
- Multiple browser projects (out of scope, see divergence #2)
- `webServer` config to auto-start dev server (current pattern is "developer runs `pnpm dev` separately"; auto-start adds startup-race risk)
- `globalSetup` / `globalTeardown` hooks (no current need)
- Timeout overrides (Playwright's defaults work fine for current tests)

### 5. EXISTING SPECS GET REFACTORED IN PLACE

No file renames, no file moves. Each existing spec stays at its current path; its inline `VIEWPORTS` / `SCREENSHOT_DIR` / `seedSkipDashboardGates` / etc. get replaced with imports from `frontend/e2e/fixtures/`. Diff hygiene matters here: each refactor should be small enough that a reviewer can visually confirm "same behavior, fewer lines."

### 6. DOCUMENTATION GOES IN `frontend/docs/`, NOT BACKEND DOCS

This is a frontend concern. New file at `frontend/docs/e2e-test-patterns.md` (analogous to the backend's `runbook-*` documents but in the frontend tree). Don't conflate with backend documentation.

---

## Files to Create

### Fixture modules

- **`frontend/e2e/fixtures/index.ts`**
  Re-exports the public API of all fixture modules so callers can do `import { VIEWPORTS, seedSkipDashboardGates } from './fixtures'` instead of deep-importing each module.

- **`frontend/e2e/fixtures/viewports.ts`**
  Exports the `VIEWPORTS` constant (mobile/tablet/desktop tuple) and a typed `Viewport` type. Source of truth for any test that iterates viewports for visual capture.

- **`frontend/e2e/fixtures/paths.ts`**
  Exports a `screenshotDir(specSlug: string)` function that returns the canonical screenshot directory path for a given spec (e.g., `screenshotDir('1-9')` → `<repo>/frontend/playwright-screenshots/1-9`). Encapsulates the `__filename` / `__dirname` / `fileURLToPath` dance so each spec doesn't reimplement it.

- **`frontend/e2e/fixtures/dashboard-gates.ts`**
  Exports `seedSkipDashboardGates(page: Page)` — extracted verbatim from `phase01-auth-roundtrip.spec.ts`, including its detailed JSDoc. Plus `seedOnboardingComplete(page)` and `seedTodaysMoodCheckIn(page)` as smaller-grained helpers for tests that only need one or the other. Default `seedSkipDashboardGates` calls both.

- **`frontend/e2e/fixtures/dev-seed-users.ts`**
  Exports `DEV_SEED_EMAIL`, `DEV_SEED_PASSWORD`, and a `freshTestEmail()` function. Source of truth for the dev-seed credentials documented in `backend/src/main/resources/db/changelog/contexts/dev-seed.xml`. JSDoc must include the prominent "password is intentionally public; dev-seed context never loads in prod" comment from `phase01-auth-roundtrip.spec.ts`.

- **`frontend/e2e/fixtures/mock-backend.ts`**
  Exports configurable `page.route()` helpers for the three most common mock-backend patterns:
  - `mockAuthLogin(page, { user, token, error? })`
  - `mockAuthRegister(page, { user, token, error? })`
  - `mockUsersMe(page, { user })`

  Plus a `SAMPLE_USER_SUMMARY` constant to use as a default. CC verifies the canonical response shapes by grepping `spec-1-9-auth-flow.spec.ts` and `spec-1-9b-captures.spec.ts` during execution.

- **`frontend/e2e/fixtures/axe.ts`**
  Exports `runAxeScan(page: Page, opts?)` — wraps `AxeBuilder` with the standard WCAG 2.1 AA tags and returns the violations array. One-line replacement for the multi-line `AxeBuilder` setup currently inlined in `spec-1-9`, `spec-1-9b`, and `full-site-audit`.

### Documentation

- **`frontend/docs/e2e-test-patterns.md`**
  Documentation runbook with sections:
  1. Purpose and audience (when to write E2E vs Vitest unit)
  2. Test directory layout (`e2e/` vs `tests/integration/` vs `tests/performance/`)
  3. The fixtures library (one subsection per fixture module, showing import + usage)
  4. The mock-backend pattern (`page.route` + per-test request interception, when to use it vs real-backend mode)
  5. The dev-mode vs prod-mode pattern from `phase01-auth-roundtrip.spec.ts` (`PLAYWRIGHT_BASE_URL` env var, why it doesn't infer backend URL from a second var)
  6. The dashboard-gates pattern (why we skip onboarding / mood check-in, when not to skip them)
  7. Screenshot capture conventions (path layout, viewport iteration, naming)
  8. Axe accessibility scan conventions (WCAG 2.1 AA tags, `fixme`'d violations, when to fix vs document)
  9. Known gaps and follow-ups (no CI integration, no cross-browser projects, no visual regression, no component-level Playwright)
  10. Related documents (`CLAUDE.md`, `.claude/rules/06-testing.md`, backend's existing `runbook-*` docs as siblings)

---

## Files to Modify

- **`frontend/playwright.config.ts`**
  Expand from 9 lines to ~25 lines per § Architectural Decisions #4. Keep `testMatch` and `baseURL` exactly as today; add `retries`, `screenshot`, `video`, `trace`, `reporter`.

- **`frontend/e2e/phase01-auth-roundtrip.spec.ts`**
  Replace inline `seedSkipDashboardGates` with import. Replace inline `DEV_SEED_EMAIL` / `DEV_SEED_PASSWORD` with imports. Behavior unchanged.

- **`frontend/e2e/spec-1-9-auth-flow.spec.ts`**
  Replace inline `VIEWPORTS`, `SCREENSHOT_DIR`, `AxeBuilder` boilerplate with imports. Replace inline mock-backend `page.route()` setup with `mockAuthLogin` / `mockAuthRegister` / `mockUsersMe` imports. Replace inline `SAMPLE_USER_SUMMARY` with the imported one.

- **`frontend/e2e/spec-1-9b-captures.spec.ts`**
  Same pattern as `spec-1-9`.

- **`frontend/e2e/full-site-audit.spec.ts`**
  Replace inline `VIEWPORTS` (if present) and Axe boilerplate with imports. Public/protected route arrays stay inline — they're audit-specific, not reusable.

- **`frontend/e2e/bb37-full-audit.spec.ts`** and **`frontend/e2e/bb38-search-deeplink.spec.ts`**
  CC inspects during execution. Apply fixture imports if the file uses any of the extracted patterns. If the file uses none of them, leave it untouched (no make-work refactors).

- **`frontend/tests/integration/contextual-prompt.spec.ts`** and **`frontend/tests/integration/notification-deeplink.spec.ts`**
  Same — apply imports if applicable, otherwise leave untouched.

NEW tests: NONE. This is infrastructure-only.

---

## Database Changes

None. Frontend-only spec.

---

## API Changes

None. Frontend-only spec.

---

## Copy Deck

None for this spec. The only user-facing copy touched is the existing test code — copy strings inside test assertions are preserved verbatim.

The new `frontend/docs/e2e-test-patterns.md` runbook is internal-developer documentation, not user-facing copy. Tone should be matter-of-fact and instructional, matching the backend's existing `runbook-*` docs.

---

## Anti-Pressure Copy Checklist

N/A — no user-facing copy added or modified.

The internal documentation should still avoid blame language for future spec authors ("when you copy boilerplate the linter…" instead of "you'll forget to…"), matching the warm-but-professional tone of `.claude/rules/`.

---

## Anti-Pressure Design Decisions

N/A — infrastructure spec, no user-facing surfaces.

---

## Acceptance Criteria

- [ ] `frontend/e2e/fixtures/` directory exists with all 7 modules listed in § "Files to Create" → "Fixture modules".
- [ ] Each fixture module is pure TypeScript (no classes, no Playwright `test.extend` magic) with explicit type exports.
- [ ] `frontend/playwright.config.ts` has `retries`, `screenshot`, `video`, `trace`, and `reporter` additions per § "Architectural Decisions" #4. `testMatch` and `baseURL` unchanged.
- [ ] `phase01-auth-roundtrip.spec.ts` imports `seedSkipDashboardGates` and `DEV_SEED_*` from fixtures.
- [ ] `spec-1-9-auth-flow.spec.ts` imports `VIEWPORTS`, `screenshotDir`, `runAxeScan`, and mock-backend helpers from fixtures.
- [ ] `spec-1-9b-captures.spec.ts` uses fixtures equivalently.
- [ ] All other e2e/integration specs are inspected; imports added where the file uses any extracted pattern; untouched otherwise.
- [ ] `frontend/docs/e2e-test-patterns.md` exists with all 10 sections.
- [ ] `npx playwright test` passes the SAME number of tests as before, with the SAME tests `fixme`'d. No new flake, no behavior changes.
- [ ] `npx tsc --noEmit` succeeds (no type errors introduced by the new fixture modules).
- [ ] `pnpm lint` succeeds.
- [ ] No backend changes (verified: `git diff --name-only main...HEAD | grep '^backend/'` returns nothing for files this spec adds).
- [ ] No `package.json` or `pnpm-lock.yaml` changes (no new dependencies).
- [ ] Total lines-of-code in `e2e/*.spec.ts` files DECREASES. The refactor is a net deletion. CC reports the before/after line counts in the execution log.

---

## Testing Notes

The fixtures library is exercised by the existing 6+2 e2e specs that import from it. **No separate unit tests for the fixtures themselves** — over-testing infrastructure code that's already exercised by every refactored spec adds maintenance burden without catching real bugs.

**Test baseline post-1.10d:** 434/434 backend tests pass (no backend changes in this spec, so unchanged). Frontend e2e test count is whatever the existing 8 specs sum to — CC runs `npx playwright test` once before refactoring to establish baseline, again after to confirm same count passes.

**ACCEPTANCE for tests:** same number of tests passing, same `fixme`'d tests still `fixme`'d, no new flake. No unintentional skip changes.

**Per `.claude/rules/06-testing.md` (Test Count Expectations for M-sized specs):** would normally be 10–20 tests. This spec is the documented exception — refactor-only, no new tests, infrastructure consolidation.

---

## Notes for Plan Phase Recon

`/plan-forums` should:

1. **Run `npx playwright test` once** (with services running locally — frontend dev server + backend if any of the 8 specs hit it) to capture baseline pass/skip/fixme count. Record it in the plan as the "before" snapshot.

2. **Grep all 8 spec files** for `VIEWPORTS`, `SCREENSHOT_DIR`, `seedSkipDashboardGates`, `DEV_SEED_`, `page.route`, and `AxeBuilder` to establish the exact duplication map. Some files may use one pattern but not others.

3. **Read `phase01-auth-roundtrip.spec.ts` carefully** — its `seedSkipDashboardGates` JSDoc and dev-mode comments are the canonical source for the fixture extractions. Preserve the JSDoc verbatim.

4. **Read `spec-1-9-auth-flow.spec.ts` and `spec-1-9b-captures.spec.ts`** to capture the canonical mock-backend response shapes for `SAMPLE_USER_SUMMARY`, login response, register response, `/users/me` response. The fixture API must match what those tests currently expect.

5. **Verify** `package.json` has `@playwright/test` 1.58.2 and `@axe-core/playwright` 4.11.1 as already-installed devDependencies — no installs required.

6. **Inspect** `bb37-full-audit.spec.ts`, `bb38-search-deeplink.spec.ts`, `frontend/tests/integration/contextual-prompt.spec.ts`, `frontend/tests/integration/notification-deeplink.spec.ts` to determine which (if any) use the extracted patterns. Files that don't use any are left alone.

7. **Confirm** `.gitignore` already excludes `frontend/playwright-screenshots/` and `test-results/` (it does — verified during spec authoring). No `.gitignore` edits required.

The plan should land at 8–13 steps. If the plan comes back with 20+ steps or proposes adding new tests, browser projects, or CI integration, push back hard — those are guardrail violations.

### Plan Shape Expectation (from brief)

1. Recon: grep all 8 spec files for the six duplicated patterns. Establish exact duplication map. Run `npx playwright test` to capture baseline pass count.
2. Create `frontend/e2e/fixtures/` directory.
3. Create `viewports.ts`, `paths.ts`, `dev-seed-users.ts`, `dashboard-gates.ts`, `axe.ts` (in dependency order — modules with no inter-dependencies first).
4. Create `mock-backend.ts` (depends on `dev-seed-users.ts` for `SAMPLE_USER_SUMMARY`).
5. Create `index.ts` re-exports.
6. Refactor `phase01-auth-roundtrip.spec.ts` to use fixtures. Run `npx playwright test e2e/phase01-auth-roundtrip` — confirm same pass count.
7. Refactor `spec-1-9-auth-flow.spec.ts`. Run targeted Playwright test. Confirm.
8. Refactor `spec-1-9b-captures.spec.ts`. Same.
9. Inspect `bb37`, `bb38`, `full-site-audit`, `contextual-prompt`, `notification-deeplink`. Refactor any that use extracted patterns; leave others alone.
10. Update `playwright.config.ts` with the modest tightening.
11. Run full `npx playwright test`. Confirm same pass count as baseline.
12. Author `frontend/docs/e2e-test-patterns.md`.
13. Run `npx tsc --noEmit` and `pnpm lint`. Iterate.

---

## Out of Scope

- New E2E test coverage (Phase 2's job per master plan divergence #3).
- CI integration / GitHub Actions / GitLab CI / etc.
- Browser project expansion (firefox, webkit).
- Visual regression testing (Percy, Chromatic, etc.).
- Component-level Playwright (Playwright Component Testing).
- `webServer` auto-start in `playwright.config.ts`.
- Vitest unit-test infrastructure (different framework, separate spec).
- Backend changes of any kind. This spec touches only `frontend/` files.
- Modification of existing test BEHAVIOR. Refactor only — same tests, same outcomes.
- Performance test infrastructure (`frontend/tests/performance/` exists but is its own concern; not addressed here).
- New axe-core rules or tag sets beyond WCAG 2.1 AA.
- `@axe-core` or `@playwright/test` version bumps.
- ESLint rules specific to `.spec.ts` files.
- Tracker updates. Eric handles tracker manually.

---

## Guardrails (DO NOT)

- Do NOT change branches. Stay on `forums-wave-continued`.
- Do NOT modify any `backend/**` file.
- Do NOT add new dependencies to `package.json`.
- Do NOT bump existing dependency versions (Playwright, `@axe-core/playwright`, etc.).
- Do NOT add new browser projects to `playwright.config.ts`.
- Do NOT add `webServer` auto-start config.
- Do NOT add `globalSetup` or `globalTeardown` hooks.
- Do NOT use Playwright's `test.extend()` API for this spec — plain TS modules only.
- Do NOT change test behavior. Refactor only. If extracting a fixture would alter test outcomes, leave the code inline and note as future work.
- Do NOT rename or move any spec file.
- Do NOT add new E2E tests.
- Do NOT add CI workflow files (`.github/workflows`, etc.).
- Do NOT modify `.gitignore` (separate concern; if `playwright-screenshots/` or `test-results/` aren't gitignored, flag in execution log but don't fix here — verified during spec authoring that BOTH are already gitignored).
- Do NOT touch `_forums_master_plan/spec-tracker.md`.
- Do NOT commit, push, or do any git operation. Eric handles all git.

---

## Out-of-Band Notes for Eric

- **Tracker reflects this spec as ⬜.** Update to ✅ after merge per usual workflow. Same row, no renumbering needed.
- **`1.10j` is shipped (commit `9a2b52d`) but tracker still shows ⬜.** Worth a tracker update at the same time you mark this spec complete. Brief explicitly listed `1.10j` as ✅ — treating that as authoritative.
- **Filename note:** Saved as `_specs/forums/spec-1-10l.md` (canonical short-form, matches all 17 existing spec files in the directory). Brief proposed `round3-phase01-spec10l-playwright-e2e-test-infrastructure.md` — that's the canonical `**ID:**` value, preserved inside the file body, but the on-disk filename follows the established convention.
- **Spec ID extension:** Brief uses `round3-phase01-spec10l-playwright-e2e-test-infrastructure`; master plan uses `round3-phase01-spec10l-playwright-e2e`. Spec body honors the brief's ID. Both forms refer to the same spec — `/plan-forums` and `/code-review` should treat them as equivalent.
- **Plan phase will run `npx playwright test`** to capture baseline. That requires the dev server (`pnpm dev` from `frontend/`) running locally, since `baseURL` defaults to `http://localhost:5173`. Some tests may also need the backend running (`./mvnw spring-boot:run` from `backend/`) — `phase01-auth-roundtrip.spec.ts` definitely does. If this is inconvenient, plan can defer baseline capture to execution phase and just record "baseline TBD" as a placeholder, with execution being the actual-confirmation step.
- **The Playwright MCP server's `--headless` flag does NOT apply** to direct `npx playwright test` runs — it only affects MCP-driven browser launches. The existing config has `headless: true` already, which is correct and preserved.
