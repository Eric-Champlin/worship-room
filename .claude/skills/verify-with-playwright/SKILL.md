---
description: Runtime UI verification using Playwright — visual rendering, interactive flows, responsive breakpoints (6 sizes), accessibility, console/network diagnostics, and optional prod comparison
argument-hint: Route to verify, optionally followed by plan file path and/or --compare-prod URL (e.g. /daily, /daily _plans/2026-03-03-daily-experience.md, /daily --compare-prod https://worshiproom.app/daily)
user-invokable: true
name: verify-with-playwright
---

# verify-with-playwright

Runtime UI verification and diagnosis for **Worship Room** — a Christian emotional healing web app built with React 18 + TypeScript (Vite), Spring Boot (Java), TailwindCSS, and PostgreSQL.

User input: $ARGUMENTS

## Usage

```bash
# Standard verification
/verify-with-playwright /daily

# Plan-aware verification
/verify-with-playwright /daily _plans/2026-03-03-daily-experience.md

# Side-by-side comparison against production
/verify-with-playwright /daily --compare-prod https://worshiproom.app/daily

# Plan-aware with auto-detected prod URL (from recon report)
/verify-with-playwright /daily _plans/2026-03-03-daily-experience.md
```

**What this verifies:**
1. **Visual rendering** — elements visible, layout correct, text content present
2. **Interactive flows** — clicks, form inputs, navigation, modals, tabs, expand/collapse
3. **Responsive breakpoints** — 6 viewports (375, 428, 768, 1024, 1440, 1920)
4. **Console/network** — no uncaught errors, no failed requests, no CORS issues
5. **Accessibility** — labels, keyboard nav, focus indicators, ARIA
6. **Design compliance** — computed styles vs recon report or plan specs (if available)
7. **Prod comparison** — side-by-side style comparison against production (if --compare-prod)

**What this does NOT do:**
- Run unit tests (use `pnpm test`)
- Perform full accessibility audits (use `/code-review`)
- Test backend API logic (use `./mvnw test`)
- Modify any code

**CRITICAL: This command is read-only. It does NOT modify code, commit, push, or perform any git operations.**

---

## Step 1: Parse Arguments

From `$ARGUMENTS`, determine:

**`target`** — Route, page, or component to verify (e.g., `/daily`, `/prayer-wall`, `"the auth modal"`)

**`plan_path`** (optional) — Path to a plan file. Enables plan-aware mode:
- Cross-reference UI against plan specifications
- Verify guardrails (DO NOT items) were respected
- Check edge case decisions are reflected in UI

**`--compare-prod {URL}`** (optional) — Production URL for side-by-side comparison.

**Auto-detect prod URL:** If a plan file references a recon report with a Source URL, and `--compare-prod` was NOT explicitly passed, automatically enable comparison mode:

```text
Auto-detected prod URL from recon report: {source URL}
Running in --compare-prod mode automatically.
To skip, re-run with --no-compare-prod flag.
```

If `$ARGUMENTS` is empty, ask the user what to verify and **stop**.

---

## Step 2: Ensure Servers Are Running

### Frontend (port 5173)

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:5173
```

- If `200`: Continue.
- If no response: Start it:

```bash
cd frontend
nohup pnpm dev > /tmp/worship-room-frontend.log 2>&1 &
# Wait up to 30 seconds for ready
```

If fails after 30 seconds: **Stop** with error.

### Backend (port 8080)

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/health
```

- If `200`: Continue.
- If no response: Start it:

```bash
cd backend
nohup ./mvnw spring-boot:run > /tmp/worship-room-backend.log 2>&1 &
# Wait up to 60 seconds
```

If fails: **Warning** — proceed with frontend-only verification. Note limitation in report.

Track which servers were started (don't stop them when done).

---

## Step 3: Capture Diagnostic Baseline

Navigate to the target URL. Before testing anything, capture the initial state:

**Console:** All errors, warnings, uncaught exceptions, unhandled promise rejections.

**Network:** Failed requests (4xx, 5xx), CORS errors, slow requests (>2s), pending requests.

**DOM/UI:** Page title, key visible elements, any visible error messages.

**Screenshot:** Full-page screenshot at desktop (1440px).

```text
## Baseline Capture: {URL}

### Page State
- Title: {page title}
- Key elements visible: {list}
- Visible errors: {any error messages in UI}

### Console
- Errors: {count} — {summary or "none"}
- Warnings: {count} — {summary or "none"}
- Uncaught exceptions: {count} — {summary or "none"}

### Network
- Failed requests: {count} — {summary or "none"}
- Slow requests (>2s): {count} — {summary or "none"}
- CORS/blocked: {count} — {summary or "none"}

### Pre-existing Issues
- {anything broken BEFORE testing — document but don't investigate}
```

**If critical baseline issues (page crash, blank screen): STOP and report.**

---

## Step 4: Build Verification Script

Plan what to verify. Read relevant source files for reconnaissance:

1. What elements should be visible (headings, buttons, cards, sections)
2. What interactions to test (clicks, inputs, toggles, modals, tabs)
3. What states to check (empty, loaded, error, logged-in vs logged-out)
4. Auth state — check `useAuth.ts` for gating behavior

**If plan-aware:** Pull flows from the plan's implementation steps, edge cases, and design context.

**Form-specific flows (if page has forms):**
- Fill each text input, verify it accepts values
- Cycle through EVERY dropdown option (not just the first)
- Trigger conditional fields (e.g., "Other" revealing a text input)
- Tab through all fields — verify focus order
- Submit with valid data — verify outcome
- Submit empty — verify validation errors

**Display the script before executing:**

```text
## Verification Script

### Flow 1: {description}
| Step | Action | Expected Outcome | Check |
|------|--------|------------------|-------|
| 1 | Navigate to {route} | Page loads, {element} visible | DOM |
| 2 | Click {button} | {expected change} | DOM |
| ... | ... | ... | ... |

### Flow 2: {description}
| ... | ... | ... | ... |

Proceed? (yes / modify)
```

**Wait for user confirmation before executing.**

---

## Step 5: Execute Verification Flows

### Test Structure

Create a temporary test at `frontend/playwright-verify.spec.ts`:

```typescript
import { test, expect, type Page, type ConsoleMessage } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';
const SCREENSHOT_DIR = 'playwright-screenshots';

// 6 breakpoints matching Worship Room design system + industry standards
const BREAKPOINTS = {
  mobileS:    { width: 375, height: 812 },   // iPhone SE / 13 mini
  mobileL:    { width: 428, height: 926 },   // iPhone 14 Pro Max
  tablet:     { width: 768, height: 1024 },  // iPad portrait
  tabletL:    { width: 1024, height: 768 },  // iPad landscape
  desktop:    { width: 1440, height: 900 },  // Standard laptop
  desktopXL:  { width: 1920, height: 1080 }, // Full HD monitor
};

// Console/network capture
const consoleErrors: string[] = [];
const consoleWarnings: string[] = [];
const networkFailures: { url: string; status: number; method: string; error?: string }[] = [];

// Filter noise
const IGNORE_PATTERNS = ['DevTools', 'HMR', '[vite]', 'favicon.ico', 'chrome-extension://'];
```

**For each step in the flow:**

1. Execute the action (click, fill, navigate, wait)
2. Capture state after action: new console errors, new network requests, DOM changes
3. Validate against expected outcome:

```text
### Step {N}: {action}

**Action:** {what was done}
**Expected:** {from script}
**Actual:** {what happened}
**Verdict:** PASS / FAIL / UNEXPECTED

**Console (new since last step):** {errors or "clean"}
**Network (new since last step):** {request — status — duration}
**DOM changes:** {elements appeared/disappeared/changed}
```

4. If a step fails: document exactly what happened, capture console/network state, **continue** to next step unless page is unresponsive
5. Between flows: reset state (navigate back, clear forms, refresh)

### Run

```bash
cd frontend
mkdir -p playwright-screenshots
npx playwright test playwright-verify.spec.ts --reporter=list
```

---

## Step 6: Design Compliance Check (if recon report or plan with design specs)

### 6a: Recon Style Verification (if CSS Mapping Table exists)

Extract computed styles from every element in the mapping table and compare:

| Element | Property | Recon Value | Built Value | Match? |
|---------|----------|------------|-------------|--------|
| {elem}  | {prop}   | {expected} | {actual}    | YES/NO |

**Match rate:** {X}/{Y} ({percentage}%)

### 6b: Prod Comparison (if --compare-prod provided)

For each major component, extract computed styles from BOTH local and prod at the same viewport, and compare:

| Component | Property | Prod Value | Local Value | Match? |
|-----------|----------|-----------|-------------|--------|
| {comp}    | {prop}   | {value}   | {value}     | YES/NO |

Flag any mismatches with exact values.

---

## Step 7: Accessibility Smoke Check

```text
## Accessibility Smoke Check

### Form Elements
- All inputs have associated labels: YES / NO — {details}
- All buttons have accessible names: YES / NO — {details}
- Required fields indicated: YES / NO — {details}

### Keyboard Navigation
- Tab order follows visual order: YES / NO — {details}
- Focus indicators visible: YES / NO — {details}
- No focus traps: YES / NO — {details}

### ARIA
- Dynamic content changes announced: YES / NO / N/A
- Error messages associated with inputs: YES / NO — {details}
- Loading states communicated: YES / NO — {details}

### Issues Found
- {specific issue and element}
```

**This is a smoke check, not a full audit.**

---

## Step 8: Responsive Verification

Screenshot at ALL 6 breakpoints:

| Breakpoint | Width | Height | Filename |
|-----------|-------|--------|----------|
| Mobile S | 375 | 812 | `{page}-375x812.png` |
| Mobile L | 428 | 926 | `{page}-428x926.png` |
| Tablet P | 768 | 1024 | `{page}-768x1024.png` |
| Tablet L | 1024 | 768 | `{page}-1024x768.png` |
| Desktop | 1440 | 900 | `{page}-1440x900.png` |
| Desktop XL | 1920 | 1080 | `{page}-1920x1080.png` |

At each viewport, run JavaScript to inspect computed styles on key layout elements and flag:

- **Horizontal overflow** (element wider than viewport → horizontal scrollbar)
- **Text overflow** (cut off, overlapping, outside container)
- **Flex/grid wrapping** (layouts not wrapping on smaller screens)
- **Font size scaling** (identical on mobile and desktop)
- **Disproportionate spacing** (padding/margins too large/small for viewport)
- **Touch targets** (interactive elements < 44x44px on mobile)
- **Image/embed scaling** (not scaling down on small screens)
- **Hidden elements** (should be visible but aren't, or vice versa)
- **Navigation** (mobile drawer works, desktop nav displays correctly)

```text
## Responsive Verification

### Breakpoint Results
| Viewport | Screenshot | Issues |
|----------|-----------|--------|
| 375x812 (Mobile S) | {file} | {count — summary or "clean"} |
| 428x926 (Mobile L) | {file} | {count — summary or "clean"} |
| 768x1024 (Tablet P) | {file} | {count — summary or "clean"} |
| 1024x768 (Tablet L) | {file} | {count — summary or "clean"} |
| 1440x900 (Desktop) | {file} | {count — summary or "clean"} |
| 1920x1080 (Desktop XL) | {file} | {count — summary or "clean"} |

### Responsive Issues
| # | Viewport | Element | Issue | Severity |
|---|----------|---------|-------|----------|
| 1 | 375x812 | {selector} | {description} | BLOCKING/NON-BLOCKING |
```

---

## Step 9: Worship Room-Specific Checks

**Always run these, regardless of flags:**

| Check | Status | Evidence |
|-------|--------|----------|
| Crisis resources in footer | PRESENT / MISSING | {details} |
| Auth modal appears for gated actions (not redirect) | CORRECT / WRONG | {details} |
| Purple gradient hero renders correctly | YES / NO | {details} |
| Lucide icons render (not broken images) | YES / NO | {details} |
| Design system colors match (primary violet, neutral bg) | YES / NO | {details} |
| Spotify embed loads (if on page) | YES / NO | {details} |
| No `dangerouslySetInnerHTML` on user content | SAFE / FLAGGED | {details} |
| Squiggle background matches across tabs | CONSISTENT / MISMATCHED | {details} |
| White decorative dividers render under headings | YES / NO / N/A | {details} |

---

## Step 10: Diagnose Issues (only if issues found)

For each FAIL or UNEXPECTED result:

**Console errors:** Identify originating component, classify (React error? Promise rejection? Type error?), determine if pre-existing or new.

**Network failures:** Capture URL, method, status, timing. Classify (API mismatch? Auth? CORS? Timeout?).

**DOM/UI issues:** Identify selector, classify (rendering? state management? timing?). Is element present but hidden, wrong content, or absent?

**Flakiness detection:** If any failure seems intermittent, re-run 2-3 times. Document whether consistent or flaky. If flaky, note what varies between runs.

```text
### Issue {N}: {title}

**Observed in:** Flow {X}, Step {Y}
**Severity:** BLOCKING / NON-BLOCKING
**Deterministic:** YES / NO (flaky)
**Pre-existing or new:** PRE-EXISTING / NEW

**Evidence:**
- {console output, network details, or DOM state}

**Root cause hypothesis:**
- {what's likely wrong — evidence-based, not guessing}
- {which component/file is likely responsible}

**Suggested investigation:**
- {where to look — specific file, component}
- {what to check — state management, conditional rendering}
```

**DO NOT suggest code fixes. Diagnosis only.**

---

## Step 11: Produce Verification Report

```text
# UI Verification Report: {URL}

## Summary
- **URL verified:** {URL}
- **Servers:** Frontend ✅ | Backend ✅ / ⚠️ not running
- **Flows executed:** {count}
- **Total steps:** {count}
- **Passed:** {count}
- **Failed:** {count}
- **Unexpected:** {count}
- **Overall verdict:** PASS / FAIL / PARTIAL

## Flow Results

### Flow 1: {description}
| Step | Action | Verdict |
|------|--------|---------|
| 1 | {action} | PASS/FAIL |

## Console Summary
- Pre-existing errors: {count}
- New errors during testing: {count}
- Critical: {list or "none"}

## Network Summary
- Failed requests: {count} — {URLs}
- Slow requests: {count} — {URLs and durations}

## Design Compliance
{from Step 6, or "No recon report / prod URL provided"}

## Accessibility
{from Step 7}

## Responsive
- **Viewports tested:** 6 (375, 428, 768, 1024, 1440, 1920)
- **Issues found:** {count or "none"}
{from Step 8}

## Worship Room Checks
{from Step 9}

## Plan Compliance (if plan-aware)
| Plan Item | Status | Evidence |
|-----------|--------|----------|
| Guardrail: {item} | ✅ Respected / ❌ Violated | {evidence} |
| Edge case: {decision} | ✅ Implemented / ❌ Missing | {evidence} |

## Issues Found
| # | Issue | Severity | Flow/Step | Deterministic |
|---|-------|----------|-----------|---------------|
| 1 | {title} | BLOCKING/NON-BLOCKING | Flow {X} Step {Y} | YES/NO |

## Diagnosed Issues (details)
{from Step 10}

## Screenshots Captured
| Screenshot | Breakpoint | Description |
|-----------|-----------|-------------|
| {file} | {breakpoint} | {description} |

## Confidence Assessment
- **Overall:** HIGH / MEDIUM / LOW
- **Reasoning:** {specific evidence}

## Recommended Next Steps
- {investigation actions for issues found}
- {whether to re-verify after fixes}
```

**STOP. Do not modify any code. Verification is complete.**

---

## Step 12: Clean Up

1. **Delete** the temporary test file: `rm frontend/playwright-verify.spec.ts`
2. **Keep** screenshots in `frontend/playwright-screenshots/`
3. **Do NOT stop** dev servers
4. **Do NOT modify** source code
5. **Do NOT update** plan execution logs

---

## Rules

### Scope
- Only verify what was requested — don't test unrelated pages
- Do not fix issues — report them
- Do not modify source code (only temp test file, deleted after)

### Screenshots
- Always capture at all 6 breakpoints + before/after interactions
- Clear previous screenshots on each run: `rm -rf frontend/playwright-screenshots/*`
- Descriptive filenames: `desktop-1440-full.png`, `mobile-375-after-tab-switch.png`

### Assertions
- Be specific but not brittle — assert on text, visibility, layout, not pixel positions
- Use `data-testid` when available, fall back to ARIA labels, roles, text content
- Prefer `toBeVisible()` over `toBeInTheDocument()`
- Check element counts for lists

### Console Error Handling
- **Fail** on `console.error` and uncaught exceptions
- **Report** but don't fail on `console.warn`
- **Ignore:** DevTools, HMR, `[vite]`, `favicon.ico`, `chrome-extension://`

### Auth State
- First verify logged-out experience
- Note that logged-in verification requires temporarily modifying `useAuth()`
- Do NOT modify `useAuth()` automatically

### Error Handling
- Playwright install fails → **Stop**
- Dev server won't start → **Stop**
- Test timeout → Report as failure, capture screenshot, continue other tests
- Route returns 404 → Report as failure
- Playwright crashes → Report raw error

### Flakiness
- If any failure seems intermittent, re-run 2-3 times
- Document whether consistent or flaky
- If flaky: note what varies between runs

## Philosophy

The browser is the ultimate test environment. Unit tests prove components work in isolation. Playwright proves the assembled UI works as a system — catching integration issues, timing bugs, responsive breakage, and invisible failures that no unit test can find. Trust what the browser shows you at EVERY viewport size, document everything, and let the developer decide what to fix.