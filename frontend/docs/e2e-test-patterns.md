# E2E Test Patterns — Worship Room

This runbook documents how Worship Room's Playwright E2E tests are organized,
which fixtures they share, and which patterns to reach for when writing new
end-to-end coverage. It exists to prevent every new spec from re-deriving the
same boilerplate from older specs.

If you're adding a new browser-driven test, start here. If you're modifying
an existing one, the fixture inventory below is the canonical source for the
shared constants and helpers.

---

## 1. Purpose and audience

**Audience.** Future spec authors writing tests in `frontend/e2e/` or
`frontend/tests/integration/`.

**E2E vs Vitest unit.** Reach for Playwright when:

- The test exercises a real route in a browser (page navigation, modal
  open/close, focus management).
- The test asserts visual rendering (screenshot capture, CSS computed
  values) or accessibility (axe-core scan).
- The test verifies a flow that crosses multiple components (auth modal →
  dashboard → user-menu interaction).

Reach for Vitest + React Testing Library when:

- The test is component-internal logic (props, state, callbacks).
- The test exercises a hook in isolation.
- The test verifies a pure-TypeScript module (utilities, reducers, store
  reducers).

The two layers cover different concerns. A reactive store typically has
both: Vitest tests for store logic, plus a Playwright test that mounts a
consuming component and verifies subscription propagation across surfaces.

---

## 2. Test directory layout

```
frontend/
├── e2e/                          ← Browser-driven Playwright specs
│   ├── fixtures/                 ← Reusable fixtures (this spec)
│   │   ├── viewports.ts          ← Canonical 3-viewport set
│   │   ├── paths.ts              ← screenshotDir() helper
│   │   ├── dev-seed-users.ts     ← Backend dev-seed credentials
│   │   ├── dashboard-gates.ts    ← Onboarding/check-in seeds
│   │   ├── mock-backend.ts       ← page.route mocks for auth endpoints
│   │   ├── axe.ts                ← runAxeScan() wrapper
│   │   └── index.ts              ← Re-exports the public API
│   ├── phase01-auth-roundtrip.spec.ts   ← Real-backend auth flow
│   ├── spec-1-9-auth-flow.spec.ts        ← AuthModal capture (mocked)
│   ├── spec-1-9b-captures.spec.ts        ← Component capture (mocked)
│   ├── full-site-audit.spec.ts           ← All routes × 6 viewports
│   ├── bb37-full-audit.spec.ts           ← Bible-wave route audit
│   └── bb38-search-deeplink.spec.ts      ← Deep-link verification
│
├── tests/
│   ├── integration/              ← Playwright running against dev server
│   │   ├── contextual-prompt.spec.ts
│   │   └── notification-deeplink.spec.ts
│   └── performance/              ← Separate concern; not addressed here
│       └── core-flows.spec.ts
```

**`e2e/` vs `tests/integration/`.** Both are matched by
`playwright.config.ts`'s `testMatch`. The split is conventional, not
enforced: `e2e/` holds full user-journey browser tests; `tests/integration/`
holds tests that mount the running dev server but exercise narrower
behavior (localStorage seeding, push subscription shape, etc.).

**`tests/performance/`** is a separate concern with its own conventions
(scroll-jank measurement, cold-load timing). Out of scope for this
runbook.

---

## 3. The fixtures library

Every fixture module lives in `frontend/e2e/fixtures/`. Import via the
barrel at `./fixtures` rather than deep-importing each module:

```ts
import {
  VIEWPORTS,
  screenshotDir,
  DEV_SEED_EMAIL,
  seedSkipDashboardGates,
  mockAllAuth,
  runAxeScan,
} from './fixtures'
```

### 3.1 `viewports.ts`

Canonical 3-viewport set for screenshot iteration. Used by Spec 1.9 and
Spec 1.9b, plus any future spec that captures across mobile/tablet/desktop.

```ts
export const VIEWPORTS = [
  { name: 'mobile', width: 375, height: 667 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
] as const

export type Viewport = (typeof VIEWPORTS)[number]
```

Usage:

```ts
for (const viewport of VIEWPORTS) {
  test(`auth modal @ ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize(viewport)
    // capture
  })
}
```

**Don't add viewports here without a spec to consolidate.**
`full-site-audit.spec.ts` uses a different 6-viewport shape with
`mobileS`/`mobileL`/`tablet`/`tabletL`/`desktop`/`desktopXL`. That's
intentional — the audit is a different concern. Don't unify the two
without a spec that owns the consolidation.

### 3.2 `paths.ts`

Returns the canonical screenshot directory for a given spec slug. Wraps
the `import.meta.url` / `fileURLToPath` / `path.dirname` boilerplate so
each spec doesn't reimplement it.

```ts
export function screenshotDir(specSlug: string): string
```

Usage:

```ts
const SCREENSHOT_DIR = screenshotDir('1-9')
// → '<repo>/frontend/playwright-screenshots/1-9'
```

`frontend/playwright-screenshots/` is gitignored.

### 3.3 `dev-seed-users.ts`

Dev-seed credentials used by tests that hit a real backend (e.g.,
`phase01-auth-roundtrip.spec.ts`).

```ts
export const DEV_SEED_EMAIL = 'sarah@worshiproom.dev'
export const DEV_SEED_PASSWORD = 'WorshipRoomDev2026!'
export function freshTestEmail(): string
```

The dev-seed password is **public**. It is stored as a BCrypt hash in
`backend/src/main/resources/db/changelog/contexts/dev-seed.xml` with
`context='dev'`. The dev context never loads in production
(`context='production'` skips dev-seed.xml entirely). Hardcoding the
password in the fixture is intentional and supported by Spec 1.5f's
account-lockout test design.

`freshTestEmail()` returns `playwright-test+<timestamp>@worshiproom.dev`
for tests that register fresh users — useful when the test wants a clean
state and doesn't care about the dev-seed Sarah account.

### 3.4 `dashboard-gates.ts`

Helpers that seed `localStorage` to bypass the onboarding wizard and
daily mood check-in for authenticated tests.

```ts
export async function seedOnboardingComplete(page: Page): Promise<void>
export async function seedTodaysMoodCheckIn(page: Page): Promise<void>
export async function seedSkipDashboardGates(page: Page): Promise<void>
```

`seedSkipDashboardGates` calls both granular helpers. Use it whenever an
auth test wants the user to land directly on Dashboard rather than the
onboarding modal or daily check-in.

**Why these gates exist.** Dashboard's phase ladder
(`frontend/src/pages/Dashboard.tsx`) is `onboarding → welcome_back →
check_in → dashboard`. A freshly authenticated test user has empty
`localStorage` in Playwright's fresh browser context, so Dashboard renders
`phase === 'onboarding'` and replaces the Navbar with a full-screen
modal — making `User menu` button assertions impossible. Seeding the two
flags satisfies the gates without claiming to test onboarding or
check-in (those have separate specs).

`localStorage` is per-origin and persists across `page.goto()` calls
within the same origin, so a single seed call right after the first
`page.goto()` covers the whole flow.

### 3.5 `mock-backend.ts`

`page.route` helpers for the four auth-related endpoints. Use these
when the spec wants to exercise the AuthModal (or downstream
auth-aware UI) without a running backend.

```ts
export const SAMPLE_USER_SUMMARY: { id, email, displayName, ... }
export const SAMPLE_USER_RESPONSE: SAMPLE_USER_SUMMARY & profile fields
export const DUMMY_JWT: string

export async function mockAuthLogin(page, opts?: MockEndpointOptions)
export async function mockAuthRegister(page, opts?: MockEndpointOptions)
export async function mockUsersMe(page, opts?: MockEndpointOptions)
export async function mockAuthLogout(page)
export async function mockAllAuth(page, opts?: AllAuthMockOptions)
```

**`mockAllAuth` is the convenience helper** — registers all four mocks
in one call.

Default behavior:

```ts
await mockAllAuth(page)
// POST /api/v1/auth/login    → 200 { data: { token, user: SAMPLE_USER_SUMMARY }, ... }
// POST /api/v1/auth/register → 200 { data: { registered: true }, ... }
// GET  /api/v1/users/me      → 200 { data: SAMPLE_USER_RESPONSE, ... }
// POST /api/v1/auth/logout   → 204
```

Override per-endpoint:

```ts
await mockAllAuth(page, {
  login: {
    status: 401,
    body: { code: 'INVALID_CREDENTIALS', message: '…', requestId: '…' },
  },
})
```

Or call individual helpers:

```ts
await mockAuthLogin(page, { delayMs: 1500 }) // simulate slow login
```

**Response envelope.** All default bodies match the standard API contract
shape `{ data: ..., meta: { requestId: ... } }`. Override `body` if a
test needs to verify error-shape parsing.

### 3.6 `axe.ts`

`runAxeScan` wraps `AxeBuilder` with the standard WCAG 2.1 AA tag set
and returns the violations array.

```ts
export const STANDARD_AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21aa']
export async function runAxeScan(page: Page, opts?: { include?: string }): Promise<Result[]>
```

Usage:

```ts
const violations = await runAxeScan(page)
if (violations.length > 0) {
  console.log('violations:', violations.map((v) => ({ id: v.id, impact: v.impact })))
}
expect(violations).toEqual([])
```

Scoped scan (used by Spec 1.9b for component captures):

```ts
const violations = await runAxeScan(page, { include: '#capture-root' })
```

**Tag set is fixed at WCAG 2.1 AA** for now. Project target per
`CLAUDE.md` is WCAG 2.2 AA, but `@axe-core/playwright` does not yet
expose a `wcag22aa` tag. Bump the tag set when upstream support lands.

---

## 4. The mock-backend pattern

Two distinct flavors of E2E test:

**Real-backend mode** (`phase01-auth-roundtrip.spec.ts`). Every HTTP call
goes through to a running Spring Boot backend. Used to verify the auth
roundtrip end-to-end including Liquibase dev-seed user, BCrypt password
verification, JWT issuance, and frontend hydration via `/users/me`.

The test self-skips if the backend health probe fails:

```ts
test.beforeAll(async () => {
  if (IS_PROD_MODE) return
  const ctx = await pwRequest.newContext()
  try {
    const res = await ctx.get('http://localhost:8080/actuator/health', { timeout: 5_000 })
    if (!res.ok()) {
      test.skip(true, `Backend health probe returned ${res.status()}.`)
    }
  } catch (err) {
    test.skip(true, `Backend unreachable: ${(err as Error).message}.`)
  } finally {
    await ctx.dispose()
  }
})
```

**Mocked mode** (`spec-1-9-auth-flow.spec.ts`,
`spec-1-9b-captures.spec.ts`). All auth endpoints are intercepted via
`page.route` so the test runs against a frontend dev server alone. Used
for visual capture and a11y scans where the real backend is overkill.

**Choose real-backend mode when:**

- The test asserts properties of the actual auth flow (token issuance,
  rate-limit headers, lockout behavior).
- The test verifies the dev-seed user works and the Liquibase context
  loaded.
- The test is the end-of-phase smoke that exercises the whole stack.

**Choose mocked mode when:**

- The test captures visual or a11y baselines.
- The test verifies UI behavior under specific server responses (401,
  delayed response, missing field).
- The test runs in CI without a backend container.

---

## 5. Dev-mode vs prod-mode pattern

`phase01-auth-roundtrip.spec.ts` runs in two modes controlled by a single
env var:

- **Local dev (default).** Backend on `:8080`, frontend on `:5173`,
  dev-seed users available.
- **Production smoke.** Set `PLAYWRIGHT_BASE_URL=https://worshiproom.com`.
  The health probe is skipped (operator already knows the Railway state),
  scenario 2 (dev-seed login) self-skips because dev-seed users don't
  exist in prod, and scenario 1 (fresh register) creates a real user via
  `freshTestEmail()`.

```ts
const IS_PROD_MODE = Boolean(process.env.PLAYWRIGHT_BASE_URL)
```

**Why a single env var.** Spec 1.10 § 6.3 constrains the test to one
flag for prod smoke. The backend URL is NOT inferred from a second
variable; in prod mode, the test trusts the operator. If the deployed
backend is down, scenario 1 fails loudly — that's the desired outcome.

**Cleanup after prod smoke.** Run from a backend shell:

```sql
DELETE FROM users WHERE email LIKE 'playwright-test+%';
```

Documented in `_plans/forums/phase01-cutover-checklist.md` § 8.

---

## 6. Dashboard-gates pattern

`seedSkipDashboardGates(page)` skips both the onboarding wizard and the
daily mood check-in. Most authenticated tests need this:

```ts
async function registerFreshUser(page: Page, email: string) {
  await page.goto('/register')
  await seedSkipDashboardGates(page)
  // …fill form, submit, etc.
}
```

**When to skip only one gate.** If a test specifically targets onboarding
or check-in behavior, use the granular helper:

```ts
await seedOnboardingComplete(page)         // skip onboarding only
// or
await seedTodaysMoodCheckIn(page)          // skip daily check-in only
```

**When NOT to seed.** If the test IS testing onboarding or the daily
check-in (their own dedicated specs), don't seed at all — let those
phases render and assert on them.

---

## 7. Screenshot capture conventions

**Path layout:**

```
frontend/playwright-screenshots/<spec-slug>/<test-name>-<viewport>.png
```

Example: `frontend/playwright-screenshots/1-9/auth-modal-login-view-mobile.png`.

The directory is gitignored. Screenshots are operator-reviewed during
spec verification, not committed to the repo.

**Screenshot helper pattern:**

```ts
const SCREENSHOT_DIR = screenshotDir('1-9')

async function captureAndScan(page, name, viewport) {
  const file = path.join(SCREENSHOT_DIR, `${name}-${viewport.name}.png`)
  fs.mkdirSync(path.dirname(file), { recursive: true })
  await page.screenshot({ path: file, fullPage: false })
  return runAxeScan(page)
}
```

**Full page vs viewport.** Default to `fullPage: false` (clip to viewport)
for visual capture. Use `fullPage: true` only when the test specifically
verifies content below the fold.

**On-failure-only screenshots.** `playwright.config.ts` sets
`screenshot: 'only-on-failure'` so failed runs automatically capture
screenshots into `frontend/test-results/` (gitignored). Per-test
explicit screenshots above are for visual baselines, not failure debug.

---

## 8. Axe accessibility scan conventions

**Tag set:** `wcag2a`, `wcag2aa`, `wcag21aa`. Fixed for now; bump to
`wcag22aa` when `@axe-core/playwright` supports it (project target per
`CLAUDE.md` is WCAG 2.2 AA).

**Pattern:**

```ts
const violations = await runAxeScan(page)
if (violations.length > 0) {
  console.log(
    `[spec-id] @ ${context} violations:`,
    violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help })),
  )
}
expect(violations).toEqual([])
```

Console-log-on-failure is intentional — Playwright trims test output, and
the violation summary helps operators triage without opening the JSON
artifact.

**When to `test.fixme` a violation:** When the violation is real, will
take a separate spec to fix, and there's a documented follow-up. Include
a `// TODO(spec-TBD)` comment with the tracking spec ID and the
violation context (axe rule, contrast ratios, etc.).

The current example: Spec 1.10's `/prayer-wall` a11y test is
`test.fixme`'d pending a design-system primary-color contrast audit on
dark backgrounds.

**Universal Rule 17 a11y evidence.** End-of-phase cutover specs
(Spec 1.10 for Phase 1) capture a JSON evidence artifact at
`_cutover-evidence/<phase>-a11y-smoke.json`. The in-test assertion
`expect(violations).toEqual([])` is the baseline enforcement during local
dev; the JSON artifact is captured manually after running against prod.
Future phase cutovers follow the same convention.

---

## 9. Known gaps and follow-ups

**No CI integration.** Worship Room currently has no `.github/workflows/`
directory. Deploys are direct git push to Railway with no pre-merge
checks. Wiring CI is its own decision (provider, browser binaries,
gating policy) and was explicitly excluded from Spec 1.10l per § Master
Plan Divergences #1. When a CI provider is chosen, a follow-up spec
will (a) install Playwright browsers in CI, (b) decide which specs gate
merges versus run informationally, and (c) wire the prod smoke as a
post-deploy step.

**No cross-browser projects.** Chromium-only. Firefox and WebKit add
roughly 2-3× the runtime with mostly redundant coverage given Worship
Room uses no vendor-specific Web APIs. When a vendor-specific bug
surfaces in production, that's the trigger to add the projects — not
before. Per Spec 1.10l § Master Plan Divergences #2.

**No visual regression testing.** No Percy, no Chromatic, no
auto-comparing baseline screenshots. Per-screenshot manual review during
spec verification is the current bar. Visual regression tooling adds
storage and review overhead that the project hasn't yet earned the
budget for.

**No component-level Playwright.** Vitest + RTL covers component
testing. Playwright Component Testing would duplicate that surface
without adding meaningful coverage, and the configuration overhead
isn't worth it.

**Spec 1.5f account-lockout interaction.** Tests that exercise
`/api/v1/auth/login` against the real dev-seed user (specifically Sarah)
can lock the account out for 15 minutes if the same test invocation
performs 5+ failed logins. The
`phase01-auth-roundtrip.spec.ts` test 6 ("six failed logins surface
RATE_LIMITED copy") is designed to do exactly this. If it runs early in
a full-suite invocation, subsequent tests that need to log in as Sarah
within the 15-minute window will fail. The current workaround is to run
phase01 tests in isolation (`npx playwright test e2e/phase01-auth-roundtrip`)
when iterating, and to ignore Sarah-login transient failures in full-suite
runs that include test 6. A future spec could resolve this by either
(a) using `freshTestEmail()` for the rate-limit test, or (b) adding a
backend admin endpoint to clear the lockout between tests.

**Modal backdrop animation race in spec-1-9.** The AuthModal's
`motion-safe:animate-backdrop-fade-in` class can intercept clicks during
the fade-in, causing intermittent click-action retries on the "Log in"
toggle button in `openAuthModalFromLanding`. This was not fixed in
Spec 1.10l per Architectural Decision #3 ("No runtime behavior changes").
Future fix options: (a) wait for `animationend` before the toggle click,
(b) use `click({ force: true })` to bypass the interception check, or
(c) shorten the fade-in duration in the production component.

---

## 10. Related documents

- `CLAUDE.md` — top-level project orientation, build health, deployment.
- `.claude/rules/06-testing.md` — overarching testing strategy across
  backend (JUnit + Testcontainers) and frontend (Vitest + Playwright).
- `.claude/rules/04-frontend-standards.md` — accessibility standards,
  TypeScript strict mode, design system pointers.
- `.claude/rules/02-security.md` — auth gating strategy, rate limiting,
  account lockout (Spec 1.5f).
- `_plans/forums/phase01-cutover-checklist.md` — production smoke
  procedure for the auth roundtrip.
- `frontend/docs/performance-measurement.md` — sibling runbook for
  performance test infrastructure.
- `backend/docs/runbook-monitoring.md`,
  `backend/docs/env-vars-runbook.md` — backend operational runbooks
  (sibling pattern, different scope).
