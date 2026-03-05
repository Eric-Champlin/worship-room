---
description: Verify frontend and backend changes using Playwright browser automation — visual rendering, interactive flows, responsive breakpoints, and console errors
argument-hint: Route or component to verify, optionally followed by plan file path (e.g. /prayer-wall, /prayer-wall _plans/2026-02-21-prayer-wall.md)
user-invokable: true
name: verify-with-playwright
---

You are running browser-based verification for **Worship Room** — a Christian emotional healing web app built with React 18 + TypeScript (Vite), Spring Boot (Java), TailwindCSS, and PostgreSQL.

User input: $ARGUMENTS

---

## Overview

This skill uses Playwright to verify that a specific page or component renders correctly, handles interactions properly, responds at all breakpoints, and produces no console errors. It is invoked as a standalone `/verify` command.

**What this verifies:**
1. **Visual rendering** — elements are visible, layout is correct, text content is present
2. **Interactive flows** — clicks, form inputs, navigation, modals, dropdowns, expand/collapse
3. **Responsive breakpoints** — mobile (< 640px), tablet (640–1024px), desktop (> 1024px)
4. **Console errors** — no uncaught JS errors or React errors in the browser console

**What this does NOT do:**
- Run unit tests (use `pnpm test` for that)
- Perform accessibility audits (use `/code-review` for that)
- Test backend API logic in isolation (use `./mvnw test` for that)
- Regression-test the entire app (scope is limited to the requested page/component)

---

## Step 1: Parse Arguments

From `$ARGUMENTS`, determine what to verify:

**`target`** — The route, page, or component to verify. Examples:
- A route: `/local-support/churches`, `/prayer-wall`, `/`, `/prayer-wall/dashboard`
- A component description: `"the auth modal"`, `"the new share dropdown"`, `"the hero section on the landing page"`
- A feature area: `"Local Support churches page with search and map"`

**`plan_path`** (optional) — If a second argument is provided that looks like a path to a `_plans/` file, read it. This enables **plan-aware mode**:
- Cross-reference what was built against what the plan specified
- Verify that plan guardrails (DO NOT items) were respected
- Check that edge case decisions from the plan's Edge Cases & Decisions table are reflected in the UI
- Include a **Plan Compliance** section in the verification report

If no plan path is provided, run a standard verification.

If `$ARGUMENTS` is empty or unclear, ask the user:

```
What would you like me to verify? Provide a route (e.g. /prayer-wall) or describe the component/feature.
Optionally include a plan file path for plan-aware verification.
```

**Stop** until the user clarifies.

---

## Step 2: Ensure Playwright Is Installed

Check if Playwright is available in the project. If not, install it.

```bash
# Check if playwright is installed
cd frontend
npx playwright --version 2>/dev/null

# If not installed, install it
npm install -D @playwright/test
npx playwright install chromium
```

**Only install Chromium** — we don't need Firefox or WebKit for verification. This saves time and disk space.

If Playwright is already installed, skip this step.

---

## Step 3: Ensure Dev Servers Are Running

### Frontend (port 5173)

```bash
# Check if frontend dev server is running
curl -s -o /dev/null -w "%{http_code}" http://localhost:5173
```

- If response is `200`: Frontend is running. Continue.
- If no response / connection refused: Start it.

```bash
cd frontend
nohup pnpm dev > /tmp/worship-room-frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Started frontend dev server (PID: $FRONTEND_PID)"

# Wait for it to be ready (up to 30 seconds)
for i in $(seq 1 30); do
  if curl -s -o /dev/null -w "%{http_code}" http://localhost:5173 | grep -q "200"; then
    echo "Frontend ready on http://localhost:5173"
    break
  fi
  sleep 1
done
```

If frontend fails to start after 30 seconds:
```
Error: Frontend dev server failed to start on port 5173.
Check /tmp/worship-room-frontend.log for details.
```
**Stop.**

### Backend (port 8080)

```bash
# Check if backend is running
curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/health
```

- If response is `200`: Backend is running. Continue.
- If no response / connection refused: Start it.

```bash
cd backend
nohup ./mvnw spring-boot:run > /tmp/worship-room-backend.log 2>&1 &
BACKEND_PID=$!
echo "Started backend (PID: $BACKEND_PID)"

# Wait for it to be ready (up to 60 seconds — Spring Boot takes longer)
for i in $(seq 1 60); do
  if curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/health | grep -q "200"; then
    echo "Backend ready on http://localhost:8080"
    break
  fi
  sleep 1
done
```

If backend fails to start after 60 seconds:
```
Warning: Backend did not start on port 8080. Proceeding with frontend-only verification.
Some features that depend on backend API calls may not work correctly.
```

**Do NOT stop.** Continue with frontend-only verification. Note the limitation in the report.

### Track What We Started

Keep track of which servers this skill started (vs. were already running) so we can report it but **do NOT stop servers when done** — the user may want to continue working.

---

## Step 4: Plan the Verification

Before writing any test code, plan what to verify based on the target. Read relevant source files to understand:

1. **What route/URL to navigate to**
2. **What elements should be visible** (headings, buttons, cards, sections)
3. **What interactions to test** (clicks, inputs, toggles, modals, expand/collapse)
4. **What states to check** (empty state, loaded state, error state, logged-in vs logged-out)
5. **Auth state** — Check `frontend/src/hooks/useAuth.ts` to determine if the page requires auth. If the page is auth-gated:
   - First verify the logged-out experience (hero + CTA visible, search UI hidden)
   - Note in the report that logged-in state requires temporarily toggling `useAuth()` to return `{ isLoggedIn: true }`

**Reconnaissance checklist:**
- Read the component file(s) for the target page
- Identify key `data-testid` attributes, ARIA labels, or text content to assert on
- Identify CSS classes or Tailwind utilities that indicate layout (e.g., `flex`, `grid`, `hidden`, `md:block`)
- Check for conditional rendering (auth gates, loading states, empty states)
- Identify interactive elements (buttons, links, inputs, dropdowns, modals)

**Output a brief plan before proceeding:**

```
Verification plan for: <target>
URL: <route>
Auth required: <yes/no>

Visual checks:
- <element 1 should be visible>
- <element 2 should contain text "...">

Interactions to test:
- <click X, expect Y>
- <type into input, expect Z>

Breakpoints to check:
- Desktop (1280px): <what to verify>
- Tablet (768px): <what to verify>
- Mobile (375px): <what to verify>

Console: Capture all errors/warnings during the above.

Proceeding...
```

---

## Step 5: Write and Run the Playwright Test

Create a temporary Playwright test file at `frontend/playwright-verify.spec.ts`.

### Test Structure

```typescript
import { test, expect, type Page, type ConsoleMessage } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';
const SCREENSHOT_DIR = 'playwright-screenshots';

// Breakpoints matching Worship Room design system
const BREAKPOINTS = {
  mobile: { width: 375, height: 812 },   // iPhone-sized
  tablet: { width: 768, height: 1024 },  // iPad-sized
  desktop: { width: 1280, height: 900 },  // Standard desktop
};

// Collect console errors and network failures
const consoleErrors: string[] = [];
const consoleWarnings: string[] = [];
const networkFailures: { url: string; status: number; method: string; error?: string }[] = [];

test.describe('<Target> Verification', () => {

  test.beforeEach(async ({ page }) => {
    // Listen for console errors
    page.on('console', (msg: ConsoleMessage) => {
      if (msg.type() === 'error') {
        consoleErrors.push(`[ERROR] ${msg.text()}`);
      }
      if (msg.type() === 'warning' && !msg.text().includes('DevTools')) {
        consoleWarnings.push(`[WARN] ${msg.text()}`);
      }
    });

    // Listen for uncaught exceptions
    page.on('pageerror', (error) => {
      consoleErrors.push(`[UNCAUGHT] ${error.message}`);
    });

    // Listen for failed network requests
    page.on('response', (response) => {
      if (response.status() >= 400) {
        networkFailures.push({
          url: response.url(),
          status: response.status(),
          method: response.request().method(),
        });
      }
    });

    // Listen for request failures (network errors, CORS, timeouts)
    page.on('requestfailed', (request) => {
      networkFailures.push({
        url: request.url(),
        status: 0,
        method: request.method(),
        error: request.failure()?.errorText || 'unknown',
      });
    });
  });

  // --- VISUAL RENDERING ---
  test('renders key elements at desktop', async ({ page }) => {
    await page.setViewportSize(BREAKPOINTS.desktop);
    await page.goto(`${BASE_URL}<route>`);
    await page.waitForLoadState('networkidle');

    // Screenshot: desktop full page
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/desktop-full.png`,
      fullPage: true
    });

    // Assert key elements
    // ... (generated based on reconnaissance)
  });

  // --- RESPONSIVE BREAKPOINTS ---
  for (const [name, size] of Object.entries(BREAKPOINTS)) {
    test(`renders correctly at ${name} (${size.width}x${size.height})`, async ({ page }) => {
      await page.setViewportSize(size);
      await page.goto(`${BASE_URL}<route>`);
      await page.waitForLoadState('networkidle');

      await page.screenshot({
        path: `${SCREENSHOT_DIR}/${name}-full.png`,
        fullPage: true
      });

      // Breakpoint-specific assertions
      // ... (generated based on reconnaissance)
    });
  }

  // --- INTERACTIVE FLOWS ---
  test('interactions work correctly', async ({ page }) => {
    await page.setViewportSize(BREAKPOINTS.desktop);
    await page.goto(`${BASE_URL}<route>`);
    await page.waitForLoadState('networkidle');

    // Test interactions
    // ... (generated based on reconnaissance)

    // Screenshot after interactions
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/desktop-after-interaction.png`,
      fullPage: true
    });
  });

  // --- CONSOLE ERRORS ---
  test('no console errors', async ({ page }) => {
    await page.setViewportSize(BREAKPOINTS.desktop);
    await page.goto(`${BASE_URL}<route>`);
    await page.waitForLoadState('networkidle');

    // Navigate around the page to trigger any lazy-loaded errors
    // ... (scroll, click interactive elements)

    // Report but don't necessarily fail on warnings
    if (consoleWarnings.length > 0) {
      console.log('Console warnings detected (non-blocking):');
      consoleWarnings.forEach(w => console.log(`  ${w}`));
    }

    // Fail on errors
    expect(consoleErrors, 'Console errors detected').toHaveLength(0);
  });
});
```

### Playwright Configuration

If `frontend/playwright.config.ts` does not exist, create a minimal one:

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: 'playwright-verify.spec.ts',
  timeout: 30000,
  expect: { timeout: 5000 },
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
    screenshot: 'on',
    trace: 'on-first-retry',
  },
  reporter: [['list']],
  retries: 0,
});
```

### Screenshot Directory

```bash
mkdir -p frontend/playwright-screenshots
```

### Run the Test

```bash
cd frontend
npx playwright test playwright-verify.spec.ts --reporter=list
```

**Capture the full output** — both passing and failing tests.

---

## Step 6: Collect Screenshots

After the test run completes (pass or fail), list all screenshots taken:

```bash
ls -la frontend/playwright-screenshots/
```

These screenshots are the verification evidence. They will be referenced in the report.

---

## Step 7: Diagnose Issues

If any tests failed, network requests failed, or console errors were captured, perform targeted diagnosis for each issue before generating the report.

**For console errors:**
- Identify the originating component/module from the stack trace if visible
- Classify: React error boundary? Unhandled promise rejection? Type error? Network-related?
- Is it pre-existing (appears on page load before any interaction) or caused by the new feature?

**For network failures:**
- Capture: URL, method, status code, and error text
- Classify: API contract mismatch? Auth issue? CORS? Timeout? Server error? Backend not running?
- If plan-aware: does the request URL/method match the API contract from the plan?

**For DOM/UI failures:**
- Is the element present but hidden? Present but wrong content? Absent entirely?
- Classify: Rendering issue? State management issue? Timing/race condition?

**For flaky failures:**
- If any failure seems inconsistent, re-run that specific test 2 more times
- Document whether the failure is consistent or intermittent
- If intermittent: note what varies between runs (timing, network response order)

**For each diagnosed issue, prepare:**

```
Issue: <title>
Observed in: <which test / step>
Pre-existing or new: <PRE-EXISTING if it appears before any new-feature interaction, NEW if introduced by the change>
Severity: BLOCKING / NON-BLOCKING
Deterministic: YES / NO (flaky)

Evidence:
- <console output, network details, or DOM state>

Root cause hypothesis:
- <what's likely wrong — based on evidence, not guessing>
- <which component/file is likely responsible>

Suggested investigation:
- <where to look — specific file, component, API client>
```

---

## Step 8: Generate the Verification Report

After running all tests, produce a structured report:

````
# Verification Report: <target>

**Route:** `<route>`
**Date:** YYYY-MM-DD HH:MM
**Servers:** Frontend ✅ (was already running / started by verify) | Backend ✅ / ⚠️ not running

---

## Results Summary

| Category | Status | Details |
|----------|--------|---------|
| Visual Rendering | ✅ PASS / ❌ FAIL | <summary> |
| Interactive Flows | ✅ PASS / ❌ FAIL | <summary> |
| Responsive (Mobile) | ✅ PASS / ❌ FAIL | <summary> |
| Responsive (Tablet) | ✅ PASS / ❌ FAIL | <summary> |
| Responsive (Desktop) | ✅ PASS / ❌ FAIL | <summary> |
| Console Errors | ✅ PASS / ❌ FAIL | <count> errors, <count> warnings |

---

## Visual Rendering

<what was checked and what was found>

## Interactive Flows

<what interactions were tested and results>

## Responsive Breakpoints

### Desktop (1280px)
<findings + screenshot reference>

### Tablet (768px)
<findings + screenshot reference>

### Mobile (375px)
<findings + screenshot reference>

## Console Output

### Errors (blocking)
<list each error, or "None">

### Warnings (non-blocking)
<list each warning, or "None">

## Network

### Failed Requests
| URL | Method | Status | Error | Pre-existing? |
|-----|--------|--------|-------|---------------|
| <url> | GET/POST | <status> | <error text> | YES / NO |

(or "No failed requests")

## Plan Compliance (only if plan-aware mode)

| Plan Item | Status | Details |
|-----------|--------|---------|
| Guardrail: <DO NOT item> | ✅ Respected / ❌ Violated | <evidence> |
| Edge case: <decision> | ✅ Implemented / ❌ Missing | <evidence> |
| Expected element: <element from plan> | ✅ Present / ❌ Missing | <evidence> |

---

## Screenshots Captured

| Screenshot | Breakpoint | Description |
|------------|-----------|-------------|
| `playwright-screenshots/desktop-full.png` | Desktop | Full page render |
| `playwright-screenshots/tablet-full.png` | Tablet | Full page render |
| `playwright-screenshots/mobile-full.png` | Mobile | Full page render |
| `playwright-screenshots/desktop-after-interaction.png` | Desktop | After interaction flow |

---

## Pre-existing Issues (existed before this change)
<numbered list, or "None — clean baseline">

## New Issues (introduced by this change)

### Blocking (must fix)
<numbered list with diagnosis from Step 7, or "None">

### Non-Blocking (should fix)
<numbered list with diagnosis from Step 7, or "None">

## Notes
<any observations, auth-state limitations, backend dependency notes>
````

---

## Step 9: Clean Up

After generating the report:

1. **Delete the temporary test file:**
   ```bash
   rm frontend/playwright-verify.spec.ts
   ```

2. **Keep the screenshots** — do NOT delete `frontend/playwright-screenshots/`. The user may want to review them.

3. **Do NOT stop dev servers** that were started by this skill. The user may still be working.

4. **Do NOT modify any source code.** This skill is read-only verification. If issues are found, report them — the user or `/execute-plan` handles fixes.

5. **If plan-aware mode was used**, do NOT update the plan's Execution Log. That's `/execute-plan`'s job. This skill is read-only.

---

## Rules

### Scope
- **Only verify what was requested.** Do not test unrelated pages or components.
- **Do not fix issues.** Report them. Fixing is the user's or `/execute-plan`'s job.
- **Do not modify source code.** The only files this skill creates are the temporary test file (deleted after) and screenshots (kept).
- **Do not run unit tests.** This skill is for browser-based visual/interaction verification only.

### Screenshots
- **Always capture screenshots** — at every breakpoint, before and after interactions.
- Screenshots are saved to `frontend/playwright-screenshots/` and organized by breakpoint and state.
- On each new `/verify` run, clear the previous screenshots first:
  ```bash
  rm -rf frontend/playwright-screenshots/*
  ```
- Screenshot filenames should be descriptive: `desktop-full.png`, `mobile-hero-section.png`, `tablet-after-search.png`, `desktop-modal-open.png`.

### Assertions
- **Be specific but not brittle.** Assert on text content, element visibility, and layout — not pixel positions or exact CSS values.
- **Use `data-testid` when available.** Fall back to ARIA labels, roles, or text content selectors.
- **Prefer `toBeVisible()` over `toBeInTheDocument()`** — we care about what the user sees, not just DOM presence.
- **Check element counts** when verifying lists (e.g., "at least 3 prayer cards should be visible").

### Responsive Verification
- **Desktop (1280×900):** Verify full side-by-side layouts, hover states, dropdown menus.
- **Tablet (768×1024):** Verify that layouts adapt (e.g., columns collapse, nav becomes hamburger if applicable).
- **Mobile (375×812):** Verify mobile-specific UI (hamburger menu, stacked layouts, toggle views instead of side-by-side, touch-friendly tap targets).
- **Key things to check per breakpoint:**
  - Elements that should be hidden at certain sizes (`hidden md:block`, `lg:flex`, etc.)
  - Layout direction changes (`flex-col` vs `flex-row`)
  - Navigation (desktop dropdown vs mobile drawer)
  - Map/list toggle vs side-by-side

### Console Error Handling
- **Fail on `console.error` and uncaught exceptions.** These are bugs.
- **Report but don't fail on `console.warn`.** Warnings are informational.
- **Ignore** React DevTools messages, Vite HMR messages, and browser extension noise.
- **Filter patterns to ignore:**
  - Messages containing `DevTools`
  - Messages containing `HMR`
  - Messages containing `[vite]`
  - Messages containing `favicon.ico`
  - Messages containing `chrome-extension://`

### Auth State Awareness
- If the page being verified has auth-gated content, the skill should:
  1. First verify the **logged-out experience** (what visitors see)
  2. Note in the report that verifying the logged-in experience requires temporarily modifying `useAuth()` in `frontend/src/hooks/useAuth.ts`
  3. Do NOT modify `useAuth()` automatically — that's a source code change

### Error Handling
- If Playwright installation fails → **Stop** with error details
- If dev server won't start → **Stop** with log file location
- If a test times out → Report as failure, capture whatever screenshot is possible, continue other tests
- If the route returns 404 → Report as failure ("Route not found — verify React Router config")
- If Playwright crashes → Report raw error, suggest `npx playwright install chromium`

### Worship Room–Specific Checks
When verifying Worship Room pages, always include these checks if relevant to the target:

- **Crisis resources in footer** — verify the footer renders with crisis hotline info on pages that should have it
- **Auth modal** — if testing an auth-gated interaction, verify the modal appears (not a redirect to `/login`)
- **Purple gradient heroes** — verify hero sections use the dark-to-violet gradient background
- **Lucide icons** — verify icons render (not broken image placeholders)
- **Design system colors** — spot-check that primary violet (`#6D28D9`), neutral background (`#F5F5F5`), and text colors match the design system
- **No `dangerouslySetInnerHTML`** — if the page renders user content, flag it in the report as a security concern (this is a code-level check, not Playwright, but worth noting if spotted during reconnaissance)
