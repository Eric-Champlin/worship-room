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
 
# Route with query parameters
/verify-with-playwright "/daily?tab=pray"
 
# Plan-aware with auto-detected prod URL (from recon report)
/verify-with-playwright /daily _plans/2026-03-03-daily-experience.md
```
 
**What this verifies:**
1. **Visual rendering** — elements visible, layout correct, text content present
2. **Interactive flows** — clicks, form inputs, navigation, modals, tabs, expand/collapse
3. **Responsive breakpoints** — 6 viewports (375, 428, 768, 1024, 1440, 1920) + any recon-detected breakpoints
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
 
## Comparison Rules (referenced throughout)
 
**These rules apply to ALL comparison steps in this skill. They are stated once here and referenced by name below.**
 
**CRITICAL: There is NO "CLOSE" verdict. Every comparison is YES or NO.**
 
| Value Type | YES (match) | NO (mismatch) |
|-----------|-------------|---------------|
| Numeric CSS (width, height, padding, margin, font-size, line-height, gap, border-radius, etc.) | Values identical or differ by ≤2px | Values differ by >2px |
| Colors (hex, rgb, hsl) | Identical color value (same color in different format is OK) | Any visible color difference |
| Text content | Identical text | Any text difference, no matter how small |
| Gradient angle | Identical or ≤5° difference | >5° difference |
| Gradient cutoff position | Identical or ≤5px | >5px difference (HIGH severity) |
| Vertical rhythm (gap between sections) | Identical or ≤5px | >5px gap difference |
 
**NEVER use "CLOSE", "APPROXIMATE", "SIMILAR", or any other soft verdict.** Report it as NO with a Fix Hint.
 
**On comparison runs (where a recon report or --compare-prod was used): ANY mismatch of any type makes the overall verdict FAIL, not PARTIAL.** The whole point is accurate matching. "Close enough" is not passing.
 
---
 
## Step 1: Parse Arguments & Load Context
 
From `$ARGUMENTS`, determine:
 
**`target`** — Route, page, or component to verify (e.g., `/daily`, `/prayer-wall`, `"the auth modal"`, `/` for dashboard). If the route includes query parameters (e.g., `/daily?tab=pray`), preserve them — they affect which content is displayed and must be included when navigating.
 
**`plan_path`** (optional) — Path to a plan file. Enables plan-aware mode:
- Cross-reference UI against plan specifications
- Verify guardrails (DO NOT items) were respected
- Check edge case decisions are reflected in UI
 
**`--compare-prod {URL}`** (optional) — Production URL for side-by-side comparison.
 
### Plan Context (if provided)
 
Read the plan file and extract:
- **Architecture Context** — target components, routes, hooks
- **Recon Context (if present)** — CSS Mapping Table, Gradients, Vertical Rhythm, Image tables, Link inventory, States tables, Text Content Snapshot. This is your source of truth for all visual comparison values.
- **Responsive Structure (if present)** — breakpoints, custom breakpoint mappings. Use these for responsive verification in Step 8.
- **Design Context** — expected layout, colors, typography, spacing, UI states
- **Edge Cases & Decisions table** — UI edge cases with explicit handling decisions
- **Implementation Steps** — what components were created/modified
- **Execution Log** — what was actually built (including deviations)
- **[UNVERIFIED] values** — any values flagged as unverified that need extra scrutiny during comparison
- **Master Spec Plan reference** — if present, read for shared data models and localStorage keys (useful for seeding test data)
 
### Auto-detect plan (if no plan path provided)
 
```bash
# Search for a plan matching the current branch slug
BRANCH=$(git branch --show-current 2>/dev/null)
SLUG=$(echo "$BRANCH" | sed 's|claude/feature/||' | sed 's|/|-|g')
# Look for plan files containing this slug
grep -rl "$SLUG" _plans/*.md 2>/dev/null | head -3
# Fallback: most recently modified plan
ls -t _plans/*.md 2>/dev/null | head -3
```
 
If a plan matching the branch slug is found, load it automatically and note:
 
```text
**Plan auto-detected:** {path} (matched branch slug "{SLUG}")
```
 
If no slug match but a recent plan exists, show candidates and ask:
 
```text
No plan matching branch slug "{SLUG}" found. Recent plans:
- {path 1} (modified {date})
- {path 2} (modified {date})
 
Load one of these? (path / none)
```
 
If no plan is found at all, proceed without plan context.
 
### Auto-detect --compare-prod URL from recon report
 
If a plan file references a recon report with a Source URL, and `--compare-prod` was NOT explicitly passed, automatically enable comparison mode:
 
```text
Auto-detected prod URL from recon report: {source URL}
Running in --compare-prod mode automatically.
To skip, re-run with --no-compare-prod flag.
```
 
If the user explicitly passed `--compare-prod {URL}`, use their URL. If the user passed `--no-compare-prod`, skip the comparison entirely.
 
### No plan, no context
 
If `$ARGUMENTS` has no plan and no clear route, ask:
 
```text
Before I begin verification, please provide:
 
- What feature/change was implemented? (brief description)
- What user flow should I test? (e.g., "click Pray tab, type a prayer, click submit")
- What does success look like? (key UI elements, text, or states that should be visible)
- Any known edge cases to check? (empty states, error states, loading states)
```
 
**Wait for user input before proceeding.**
 
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
- Pending: {count} — {summary or "none"}
 
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
4. Auth state — check for simulated auth pattern (see Auth State section below)
 
**If plan-aware:** Pull flows from the plan's implementation steps, edge cases, and design context.
 
**Form-specific flows (if page has forms):**
- Fill each text input, verify it accepts values
- Cycle through EVERY dropdown option (not just the first)
- Trigger conditional fields (e.g., "Other" revealing a text input)
- Tab through all fields — verify focus order
- Submit with valid data — verify outcome
- Submit empty — verify validation errors
 
### Auth State for Verification
 
**If the project uses simulated auth via localStorage** (check for `wr_auth_simulated` key pattern in the codebase or plan):
 
- Use `page.addInitScript()` to set localStorage values BEFORE navigating:
  ```typescript
  // Logged-in state
  await page.addInitScript(() => {
    localStorage.setItem('wr_auth_simulated', 'true');
    localStorage.setItem('wr_user_name', 'Eric');
  });
  ```
- Verify BOTH logged-out (default, no injection) AND logged-in states
- Do NOT modify source code for auth testing — localStorage injection is sufficient
 
**If the project uses real JWT auth:**
- Note that logged-in verification requires auth token setup (manual or via API call)
- Verify logged-out experience only unless user provides auth mechanism
 
### Test Data Seeding (for localStorage-backed features)
 
If the feature uses localStorage for data persistence (dashboard widgets, mood entries, friends, badges, streaks, etc.), verification needs BOTH empty and populated states:
 
**Empty state verification:** Navigate without seeding — all widgets show empty states.
 
**Populated state verification:** Use `page.addInitScript()` to inject seed data BEFORE navigation:
 
```typescript
await page.addInitScript(() => {
  // Auth
  localStorage.setItem('wr_auth_simulated', 'true');
  localStorage.setItem('wr_user_name', 'Eric');
  
  // Seed data (use interfaces from master plan or plan's Shared Data Models)
  localStorage.setItem('wr_mood_entries', JSON.stringify([
    { id: '1', date: '2026-03-16', mood: 4, moodLabel: 'Good', timestamp: Date.now(), verseSeen: 'Psalm 107:1' },
    { id: '2', date: '2026-03-15', mood: 3, moodLabel: 'Okay', timestamp: Date.now() - 86400000, verseSeen: 'Psalm 46:10' },
    // ... 5-7 entries for a realistic 7-day chart
  ]));
  
  localStorage.setItem('wr_streak', JSON.stringify({
    currentStreak: 5, longestStreak: 14, lastActiveDate: '2026-03-16'
  }));
  
  // ... additional seed data as needed
});
```
 
**Document seed data in the verification report** so results are reproducible.
 
**If the plan includes a "Shared Data Models" section or references a master plan:** Use those exact TypeScript interfaces to construct valid seed data. Invalid seed data (wrong field names, wrong types) will cause runtime errors that mask real issues.
 
### Display the script before executing:
 
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
 
### Auth States to Verify
- Logged-out: {what should be visible/hidden}
- Logged-in (empty data): {what should be visible}
- Logged-in (seeded data): {what should be visible}
 
Proceed? (yes / modify)
```
 
**Wait for user confirmation before executing.**
 
---
 
## Step 5: Execute Verification Flows
 
### Cleanup First
 
**Before creating a new test file, delete any existing temporary test from a previous run:**
 
```bash
rm -f frontend/playwright-verify.spec.ts
```
 
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
 
// --- Helper Functions ---
 
/** Wait for page to be fully rendered (network idle + key element visible) */
async function waitForRender(page: Page, selector?: string) {
  await page.waitForLoadState('networkidle');
  if (selector) {
    await page.waitForSelector(selector, { state: 'visible', timeout: 10000 });
  }
  // Extra 500ms for animations/transitions to settle
  await page.waitForTimeout(500);
}
 
/** Extract computed style for a single element */
async function getComputedStyles(page: Page, selector: string, properties: string[]) {
  return page.evaluate(({ sel, props }) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const cs = getComputedStyle(el);
    const result: Record<string, string> = {};
    props.forEach(p => { result[p] = cs.getPropertyValue(p) || cs[p as any]; });
    return result;
  }, { sel: selector, props: properties });
}
 
/** Screenshot at a specific breakpoint */
async function screenshotAtBreakpoint(
  page: Page, name: string, width: number, height: number
) {
  await page.setViewportSize({ width, height });
  await page.waitForTimeout(300); // allow reflow
  await page.screenshot({
    path: `${SCREENSHOT_DIR}/${name}-${width}x${height}.png`,
    fullPage: true
  });
}
```
 
**For each step in the flow:**
 
1. Execute the action (click, fill, navigate, wait)
2. **Wait for render** using `waitForRender()` — do NOT screenshot loading spinners or partially-rendered pages
3. Capture state after action: new console errors, new network requests, DOM changes
4. Validate against expected outcome:
 
```text
### Step {N}: {action}
 
**Action:** {what was done}
**Expected:** {from script}
**Actual:** {what happened}
**Verdict:** PASS / FAIL / UNEXPECTED
 
**Console (new since last step):** {errors or "clean"}
**Network (new since last step):** {request — status — duration}
**DOM changes:** {elements appeared/disappeared/changed}
**Notes:** {anything surprising, even if passing}
```
 
5. If a step fails: document exactly what happened, capture console/network state, **continue** to next step unless page is unresponsive
6. Between flows: reset state (navigate back, clear forms, refresh)
 
### Run
 
```bash
cd frontend
rm -rf playwright-screenshots/*
mkdir -p playwright-screenshots
npx playwright test playwright-verify.spec.ts --reporter=list --headed=false
```
 
---
 
## Step 6: Design Compliance Check (if recon report or plan with design specs)
 
**All comparisons in this step use the Comparison Rules defined at the top of this skill.** Do not redefine tolerances — reference them.
 
### 6a: Recon Style Verification (if CSS Mapping Table exists)
 
Extract computed styles from every element in the mapping table and compare **at all standard breakpoints (minimum: 375px, 768px, 1440px)**, not just one viewport. Use `getComputedStyles()` helper at each breakpoint:
 
```text
## Recon Style Verification
 
**Recon report:** {path}
**Viewports compared:** {list — e.g., 375px, 768px, 1440px}
 
### Viewport: {width}px
| Element | Property | Recon Value | Built Value | Match? | Fix Hint |
|---------|----------|------------|-------------|--------|----------|
| {elem}  | {prop}   | {expected} | {actual}    | YES/NO | {Tailwind class or CSS value — only for mismatches} |
 
**Match rate:** {X}/{Y} ({percentage}%)
**Mismatches:** {count}
```
 
**If any [UNVERIFIED] values exist**, compare them FIRST and flag if the guess was wrong.
 
### 6b: Prod Comparison (if --compare-prod provided)
 
For each major component, extract computed styles from BOTH local and prod at the same viewport, and compare using the **exhaustive property list**:
 
- Dimensions: width, height, max-width, min-width, min-height
- Spacing: padding (all sides), margin (all sides), gap
- Borders: border-top, border-right, border-bottom, border-left, border-radius
- Background: background-color, background-image
- Typography: font-size, font-weight, line-height, color, text-align, text-transform, letter-spacing, font-style, text-decoration
- Layout: display, flex-direction, align-items, justify-content, flex-grow, overflow
- Effects: box-shadow, opacity
 
**Only omit a property row if BOTH prod and local have the browser default value.** If either side has a non-default value, include the row.
 
Compare at EVERY detected breakpoint PLUS standard breakpoints. At minimum: 375px, 768px, 1440px.
 
```text
## Side-by-Side Prod Comparison
 
**Prod URL:** {prod URL}
**Local URL:** {local URL}
**Viewports compared:** {list}
 
### Component: {name}
| Property | Prod Value | Local Value | Match? |
|----------|-----------|-------------|--------|
| {prop}   | {value}   | {value}     | YES/NO |
 
**Match rate:** {X}/{Y} ({percentage}%)
```
 
### 6c: Gradient Comparison
 
For every element with a gradient `background-image`, compare the full gradient string:
 
```text
### Gradient Comparison
| Element | Prod Gradient | Local Gradient | Match? |
|---------|-------------|---------------|--------|
| {selector} | {full gradient value} | {full gradient value} | YES/NO |
| {selector} gradient angle | {deg} | {deg} | YES/NO |
| {selector} cutoff position | {px} | {px} | YES/NO |
```
 
**Gradient cutoff >5px difference is HIGH severity** (per Comparison Rules).
 
### 6d: Image Comparison
 
For every `<img>` or `<picture>` element, compare rendered dimensions:
 
```text
### Image Comparison
| Image (alt/src) | Property | Expected | Actual | Match? |
|----------------|----------|----------|--------|--------|
| {alt text} | rendered width | {px} | {px} | YES/NO |
| {alt text} | rendered height | {px} | {px} | YES/NO |
| {alt text} | max-width | {value} | {value} | YES/NO |
```
 
### 6e: Vertical Rhythm Comparison
 
Measure the vertical gap between every pair of adjacent sections/components:
 
```text
### Vertical Rhythm Comparison
| From → To | Expected Gap | Actual Gap | Match? | Fix Hint |
|-----------|-------------|-----------|--------|----------|
| Hero → section 1 | {px} | {px} | YES/NO | {margin/padding to adjust} |
| Section 1 → section 2 | {px} | {px} | YES/NO | |
```
 
**Gap >5px difference is a mismatch** (per Comparison Rules). Vertical rhythm differences make the page feel "compressed" or "stretched" even when individual component styles are correct.
 
### 6f: Link Verification
 
For every `<a>` tag in body content (paragraphs, footers, disclaimers), compare styling:
 
```text
### Link Verification
| Link Text | Property | Expected | Actual | Match? |
|-----------|----------|----------|--------|--------|
| {text} | is `<a>` tag? | YES | YES/NO | YES/NO |
| {text} | href | {URL} | {URL or missing} | YES/NO |
| {text} | color | {value} | {value} | YES/NO |
| {text} | text-decoration | {underline/none} | {underline/none} | YES/NO |
| {text} | target | {_self/_blank} | {value} | YES/NO |
```
 
**CRITICAL: If expected `<a>` tag renders as plain text (no `<a>` tag), this is a HIGH severity mismatch.** Missing links are a functional defect.
 
### 6g: Hover/Focus State Comparison
 
For every button, link, and form input, trigger the hover/focus state and compare:
 
```text
### Hover/Focus State Comparison
| Element | State | Property | Expected | Actual | Match? |
|---------|-------|----------|----------|--------|--------|
| Submit button | :hover | background-color | {value} | {value} | YES/NO |
| Submit button | :hover | box-shadow | {value} | {value} | YES/NO |
| Form input | :focus | border-color | {value} | {value} | YES/NO |
| Form input | :focus | outline | {value} | {value} | YES/NO |
```
 
**Missing hover/focus styles are a functional and visual defect.** A button that doesn't change on hover feels broken to the user.
 
### 6h: Text Content Verification (if recon has Text Content Snapshot)
 
If the recon report contains a **Text Content Snapshot**, extract the rendered text of key elements and compare:
 
```text
### Text Content Verification
 
**Source:** Text Content Snapshot from recon
 
| Element | Expected Text (recon) | Actual Text (built) | Match? |
|---------|----------------------|---------------------|--------|
| {elem}  | "{expected}"         | "{actual}"          | YES/NO |
 
**Match rate:** {X}/{Y} ({percentage}%)
**Mismatches:** {count}
```
 
**For each mismatch, classify:**
- **Hardcoded difference:** The built page has different text than expected. Fix requires updating the component or constants file.
- **Missing element:** The expected element doesn't exist on the built page.
 
If the recon has no Text Content Snapshot, skip this step.
 
### 6i: Comparison Summary
 
```text
### Comparison Summary
 
**Components compared:** {count}
**Total properties checked:** {count}
**Matches:** {count} ({percentage}%)
**Mismatches:** {count}
 
| # | Component | Property | Expected | Actual | Impact | Fix Hint |
|---|-----------|----------|----------|--------|--------|----------|
| 1 | {comp} | {prop} | {val} | {val} | HIGH / LOW | {Tailwind class or CSS value} |
```
 
**Also check for behavioral differences:**
- Do animations/transitions differ?
- Do interactive elements respond the same way?
- Is text wrapping/flowing the same at the same viewport width?
 
**Also check for responsive structure differences:**
- Does the layout switch from column to row at the same breakpoint?
- Are components hidden/shown at the same breakpoints?
- Do flex-direction, align-items, justify-content match at each breakpoint?
 
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
 
### 8a: Determine Breakpoints
 
1. **If a recon report documents detected breakpoints:** Use those as the primary set, plus standard breakpoints below.
2. **If `--compare-prod` detected breakpoints in Step 6b:** Use those, plus standard breakpoints.
3. **Otherwise:** Use the standard breakpoints.
 
**Standard breakpoints (always included):**
 
| Breakpoint | Width | Height | Filename |
|-----------|-------|--------|----------|
| Mobile S | 375 | 812 | `{page}-375x812.png` |
| Mobile L | 428 | 926 | `{page}-428x926.png` |
| Tablet P | 768 | 1024 | `{page}-768x1024.png` |
| Tablet L | 1024 | 768 | `{page}-1024x768.png` |
| Desktop | 1440 | 900 | `{page}-1440x900.png` |
| Desktop XL | 1920 | 1080 | `{page}-1920x1080.png` |
 
**Additional breakpoints from recon/prod (if any):**
 
| Source | Breakpoint | Reason |
|--------|-----------|--------|
| {recon / prod} | {N}px | {e.g., "column→row layout shift"} |
 
Merge and deduplicate. Do not test the same width twice.
 
### 8b: Computed Style Inspection
 
At each viewport, use `getComputedStyles()` helper to inspect computed styles on key layout elements and flag:
 
- **Horizontal overflow** (element wider than viewport → horizontal scrollbar)
- **Text overflow** (cut off, overlapping, outside container)
- **Flex/grid wrapping** (layouts not wrapping on smaller screens)
- **Font size scaling** (identical on mobile and desktop)
- **Disproportionate spacing** (padding/margins too large/small for viewport)
- **Touch targets** (interactive elements < 44x44px on mobile)
- **Image/embed scaling** (not scaling down on small screens — including Spotify embeds)
- **Hidden elements** (should be visible but aren't, or vice versa)
- **Navigation** (mobile drawer works, desktop nav displays correctly)
 
### 8c: Report
 
```text
## Responsive Verification
 
### Breakpoint Results
| Viewport | Screenshot | Issues |
|----------|-----------|--------|
| 375x812 (Mobile S) | {file} | {count — summary or "clean"} |
| 428x926 (Mobile L) | {file} | {count — summary or "clean"} |
| {N}x{N} (Recon detected) | {file} | {count — summary or "clean"} |
| 768x1024 (Tablet P) | {file} | {count — summary or "clean"} |
| 1024x768 (Tablet L) | {file} | {count — summary or "clean"} |
| 1440x900 (Desktop) | {file} | {count — summary or "clean"} |
| 1920x1080 (Desktop XL) | {file} | {count — summary or "clean"} |
 
### Responsive Issues
| # | Viewport | Element | Issue | Severity |
|---|----------|---------|-------|----------|
| 1 | 375x812 | {selector} | {description} | BLOCKING/NON-BLOCKING |
 
### Key Observations
- {patterns across breakpoints}
- {elements that look correct at all sizes}
```
 
---
 
## Step 9: Worship Room-Specific Checks
 
**Always run these, regardless of flags. Mark checks as N/A if they don't apply to the target page.** Also read `.claude/rules/` for any additional project-specific checks not listed below — the rules files are the authoritative source and may include checks added after this skill was last updated.
 
### Global Checks (all pages)
 
| Check | Status | Evidence |
|-------|--------|----------|
| Crisis resources in footer | PRESENT / MISSING | {details} |
| Lucide icons render (not broken images) | YES / NO / N/A | {details} |
| Design system colors match (primary violet for accents) | YES / NO / N/A | {details} |
| No `dangerouslySetInnerHTML` on user content | SAFE / FLAGGED | {details} |
 
### Landing Page Checks (if target is `/` logged-out)
 
| Check | Status | Evidence |
|-------|--------|----------|
| Hero section renders with dark bg, gradient headline | YES / NO / N/A | {details} |
| Growth Teasers section renders 3 blurred preview cards | YES / NO / N/A | {details} |
| Squiggle backgrounds render correctly | CONSISTENT / MISMATCHED / N/A | {details} |
| White decorative dividers render under headings | YES / NO / N/A | {details} |
 
### Dashboard Checks (if target is `/` logged-in)
 
| Check | Status | Evidence |
|-------|--------|----------|
| Mood check-in appears for first daily visit (no mood entry for today) | YES / NO / N/A | {details} |
| Dashboard renders when mood already logged today | YES / NO / N/A | {details} |
| Hero shows personalized greeting + streak + level | YES / NO / N/A | {details} |
| Frosted glass cards render with backdrop-blur | YES / NO / N/A | {details} |
| Widget cards are collapsible | YES / NO / N/A | {details} |
| Activity checklist reflects current activity state | YES / NO / N/A | {details} |
| Mood chart renders with correct mood-colored dots | YES / NO / N/A | {details} |
 
### Navbar Checks (logged-in state)
 
| Check | Status | Evidence |
|-------|--------|----------|
| Notification bell shows in navbar | YES / NO / N/A | {details} |
| Bell badge count matches unread notifications | YES / NO / N/A | {details} |
| Avatar dropdown renders all menu items | YES / NO / N/A | {details} |
| Log In / Get Started buttons hidden when authenticated | YES / NO / N/A | {details} |
 
### Auth Modal Checks (if page has gated actions)
 
| Check | Status | Evidence |
|-------|--------|----------|
| Auth modal appears for gated actions (not redirect) | CORRECT / WRONG / N/A | {details} |
 
### Music Page Checks (if target is `/music`)
 
| Check | Status | Evidence |
|-------|--------|----------|
| Spotify embed loads | YES / NO / N/A | {details} |
| Squiggle backgrounds render correctly (Music tabs: slice) | CONSISTENT / MISMATCHED / N/A | {details} |
| Light background on all tabs | YES / NO / N/A | {details} |
 
---
 
## Step 10: Diagnose Issues (only if issues found)
 
For each FAIL or UNEXPECTED result:
 
### Console Errors
Identify originating component, classify (React error? Promise rejection? Type error?), determine if pre-existing or new.
 
### Network Failures
Capture URL, method, status, timing. Classify (API mismatch? Auth? CORS? Timeout?).
 
### DOM/UI Issues
Identify selector, classify (rendering? state management? timing?). Is element present but hidden, wrong content, or absent?
 
### Flakiness Detection
If any failure seems intermittent, re-run 2-3 times. Document whether consistent or flaky. If flaky, note what varies between runs.
 
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
- **Auth states tested:** {logged-out / logged-in (empty) / logged-in (seeded) / all}
- **Servers:** Frontend ✅ | Backend ✅ / ⚠️ not running
- **Flows executed:** {count}
- **Total steps:** {count}
- **Passed:** {count}
- **Failed:** {count}
- **Unexpected:** {count}
- **Style mismatches:** {count from Step 6a/6b}
- **Gradient mismatches:** {count from Step 6c}
- **Image sizing mismatches:** {count from Step 6d}
- **Vertical rhythm mismatches:** {count from Step 6e}
- **Link mismatches:** {count from Step 6f}
- **Hover/focus state mismatches:** {count from Step 6g}
- **Text content mismatches:** {count from Step 6h}
- **Overall verdict:** PASS / FAIL / PARTIAL
 
**Verdict rules (from Comparison Rules):**
- **PASS:** Zero flow failures AND zero mismatches of any type
- **FAIL:** Any flow failure OR any mismatch exceeding tolerances defined in Comparison Rules
- **PARTIAL:** All flows pass but minor sub-2px style differences exist (ONLY when no recon/prod comparison was used — comparison runs have no PARTIAL)
 
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
- **Viewports tested:** {count} ({list — standard + any recon-detected breakpoints})
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
 
## Test Data Used
- **Auth state:** {logged-out / simulated via localStorage}
- **Seed data:** {description of seeded data or "none — empty state only"}
 
## Confidence Assessment
- **Overall:** HIGH / MEDIUM / LOW
- **Reasoning:** {specific evidence}
 
## Recommended Next Steps
 
**Suggested tool based on findings:**
| If issue is... | Use this tool |
|---------------|--------------|
| CSS/styling mismatch | Fix in code, re-run `/verify-with-playwright` |
| JavaScript console error | Investigate component, check state management |
| API/network failure | Check backend endpoint, verify API contract |
| All checks pass | `/code-review` then commit |
 
- {specific investigation actions for issues found}
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
- Always capture at all 6+ breakpoints + before/after interactions
- Clear previous screenshots on each run: `rm -rf frontend/playwright-screenshots/*`
- Descriptive filenames: `desktop-1440-full.png`, `mobile-375-after-tab-switch.png`
 
### Assertions
- Be specific but not brittle — assert on text, visibility, layout, not pixel positions
- Use `data-testid` when available, fall back to ARIA labels, roles, text content
- Prefer `toBeVisible()` over `toBeInTheDocument()`
- Check element counts for lists
- Always use `waitForRender()` helper before asserting — never assert on a loading/partial state
 
### Console Error Handling
- **Fail** on `console.error` and uncaught exceptions
- **Report** but don't fail on `console.warn`
- **Ignore:** DevTools, HMR, `[vite]`, `favicon.ico`, `chrome-extension://`
 
### Auth State
- Always verify logged-out experience first
- Use localStorage injection (`page.addInitScript`) for logged-in verification when simulated auth is available
- Do NOT modify source code for auth testing
- Verify both empty and seeded data states when localStorage-backed features are involved
 
### Comparisons
- All comparison tolerances are defined in the **Comparison Rules** section at the top of this skill
- Reference those rules — do not redefine tolerances inline
 
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
 
### Git Operations — HANDS OFF
- **DO NOT** run `git commit` under any circumstances
- **DO NOT** run `git push` under any circumstances
- **DO NOT** run `git add` under any circumstances
- The user handles ALL git operations manually
 
## Philosophy
 
The browser is the ultimate test environment. Unit tests prove components work in isolation. Playwright proves the assembled UI works as a system — catching integration issues, timing bugs, responsive breakage, and invisible failures that no unit test can find. Trust what the browser shows you at EVERY viewport size, document everything, and let the developer decide what to fix.
 
---
 
## See Also
 
- `/playwright-recon` — Capture visual specs from live pages (`--internal` for design system, default for external recon)
- `/plan` — Create implementation plan from a spec (provides plan context)
- `/execute-plan` — Execute all steps from a generated plan (has its own visual verification checkpoints)
- `/code-review` — Pre-commit code review (run AFTER this verification passes)
- `/spec` — Write a feature specification (upstream of /plan)