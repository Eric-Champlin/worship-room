# Prompt 5 — Full-Site Visual Verification

**Protocol:** Repository-Wide Deep Review v1.0
**Order:** Fifth (last, after all other prompts)
**Time budget:** 1 to 4 hours
**Prerequisites:** Prompts 1, 2, 3, and 4 complete and committed

---

## Purpose

Run a full-site Playwright sweep across every page in the application at multiple breakpoints, in multiple authentication states, with visual diff against a baseline. This is the prompt that catches visual regressions on pages outside the current work area, accessibility failures, layout breaks, and the kind of "this page just doesn't look right" issues that automated tests miss.

This prompt runs last because visual verification on top of broken code, broken tests, broken dependencies, or inconsistent architecture is wasted effort. By the time this prompt runs, the code should be in good enough shape that any visual issue is genuinely a visual issue and not a downstream effect of something else.

---

## Pre-flight checks

Before doing any work, verify and record:

1. Prompts 1, 2, 3, and 4 are complete and committed
2. Build is clean, lint is clean, tests pass, dependencies are clean, architecture audit is filed
3. Working tree is clean
4. Today's report file exists at `_reports/deep-review-YYYY-MM-DD.md`
5. Playwright is installed and browsers are available (`npx playwright install --with-deps` if needed)
6. `@axe-core/playwright` is available for accessibility checks
7. The dev server can start cleanly (`pnpm dev`)
8. Screenshots from the previous run exist for visual diffing (or this is documented as the first run)

---

## Phase 1 — Setup and instrumentation

### 1A. Start the dev server

Start the dev server in production-like mode if possible:

    pnpm build && pnpm preview

If a preview command isn't available, fall back to `pnpm dev` and document the limitation. Production builds catch issues that dev mode hides.

Wait for the server to be fully ready before running any tests. Capture the URL the server is bound to.

### 1B. Configure deterministic rendering

Before taking any screenshots, configure the Playwright environment for deterministic output:

**Disable animations and transitions** by injecting CSS into every page:

    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }
      `,
    });

Without this, animated content produces non-deterministic screenshots and breaks visual diffs.

**Wait for fonts to load** before each screenshot:

    await page.evaluate(() => document.fonts.ready);

Without this, the first screenshot may show fallback fonts instead of the real ones.

**Wait for network idle** before each screenshot:

    await page.waitForLoadState('networkidle');

**Set a fixed reference time** if any UI shows relative timestamps. Mock `Date.now()`:

    await page.addInitScript(() => {
      const FIXED_DATE = new Date('2026-04-09T12:00:00.000Z').getTime();
      Date.now = () => FIXED_DATE;
    });

**Set a fixed viewport** explicitly for each test, don't rely on defaults.

**Set a fixed user agent** so server-side logic that depends on UA is deterministic.

### 1C. Configure auth states

Define two reusable browser contexts:

**Logged-out context:**

- Fresh browser context
- All cookies cleared
- All localStorage cleared
- All sessionStorage cleared

**Logged-in context:**

- Set the project's auth simulation localStorage keys
- Set the project's user identity keys
- Mark onboarding as complete
- Clear any "dismissed banner" keys so all banners are visible
- Verify login by navigating to a protected route and confirming no redirect to login

The exact key names are project-specific and live in the project-specific overrides file (`99-project-specific-overrides.md`). This prompt references them by purpose, not by name.

---

## Phase 2 — Page inventory

Build a complete list of every page in the application. This is dynamic — it should be regenerated each run because new pages get added.

### 2A. Static route inventory

Read the application's route definitions (typically in a router config file like `App.tsx` or a routes file). Extract every defined route, including:

- Top-level routes
- Nested routes
- Dynamic routes (with sample parameters for testing)
- Catch-all routes (404 handler)

For each route, record the path pattern and the component that handles it.

### 2B. Dynamic route sampling

For dynamic routes (like `/bible/:book/:chapter`), pick representative parameters that exercise the route fully:

- A common case (`/bible/john/3`)
- An edge case (long book name like `/bible/songofsolomon/8`)
- A boundary case (first or last chapter, like `/bible/genesis/1` and `/bible/revelation/22`)

Test all three for each dynamic route.

### 2C. Tab and modal inventory

Pages with tabs (like a Daily Hub with Pray/Journal/Meditate tabs) need to be tested for each tab. Extract the tab parameter from the page's component code and test every value.

Pages with modals need to be tested for each modal in its open state. Identify modals by searching for modal-trigger components in the page code.

### 2D. State variant inventory

For each page, identify which states it can be in:

- Logged out vs logged in (already covered by the contexts)
- Empty state (no data yet)
- Populated state (typical data)
- Loading state (while data is fetching)
- Error state (when data fetch fails)

Each variant produces a different visual output and each one needs to be screenshotted.

The full test matrix is therefore:

    pages × tabs × dynamic-route-samples × auth-states × data-states

For a moderate-sized app this might be 200 to 500 individual screenshots. That's normal.

---

## Phase 3 — Screenshot sweep

For each cell in the test matrix, take screenshots at three breakpoints:

- **375×812** — mobile (iPhone-sized)
- **768×1024** — tablet (iPad portrait)
- **1440×900** — desktop

Save screenshots to `_reports/screenshots/YYYY-MM-DD/{page}/{state}-{viewport}.png`.

For each page, take both:

- **Above-the-fold screenshot** — what the user sees on first paint
- **Full-page screenshot** — the entire scrollable content

Don't skimp on full-page screenshots. Bugs hide below the fold.

---

## Phase 4 — Per-page checks (logged-out)

For each page in the logged-out matrix, verify all of the following. Each failure produces a finding in the report.

### 4A. Background and theme

- No white or light gray backgrounds on any page section unless intentionally light
- Every page maintains the documented theme aesthetic (dark sanctuary, light minimal, whatever the project specifies)
- No jarring color transitions between pages

### 4B. Navbar

- Renders correctly with the expected logo, nav links, and CTAs
- All nav links are tappable and route correctly
- No visual artifacts (broken icons, missing text, off-center elements)

### 4C. Banners (if applicable)

- Seasonal banners, announcement banners, and promotional banners render correctly
- Banner dismissal works (if applicable)
- Banner sizing matches the project's documented width (don't span full viewport if the project wants centered)

### 4D. Text rendering

- No text is cut off, clipped, or overflowing its container
- All headings render fully
- All body text is readable (no contrast violations)
- Text doesn't overlap other elements
- Long content wraps correctly
- Short content doesn't leave awkward whitespace

### 4E. Layout

- No overlapping elements
- No horizontal scrollbar on any page (unless explicitly intentional, like a horizontal-scroll component)
- Content fills the page width appropriately at desktop (no thin centered columns unless intentional)
- Mobile layouts are single-column with no cramping
- Spacing is consistent across pages (don't have one page with 16px padding and another with 32px)

### 4F. Footer

- Renders on every page with the expected sections
- All footer links work
- Footer doesn't have visual issues (broken layouts, missing content)

### 4G. Interactive elements

- All navigation links are clickable (no dead links — verify by clicking each one)
- Tab switching works on tabbed pages
- Dropdowns open and close
- Buttons have visible hover states (test by hovering)
- Forms accept input

### 4H. Console health

- No JavaScript errors in the console during page load
- Warnings are acceptable; errors are not
- No 404 errors for resources (CSS, JS, fonts, images)

### 4I. Auth gating

- Auth-gated actions correctly show the auth modal or redirect, not a broken page or silent failure
- The auth modal itself renders correctly

### 4J. Accessibility (run axe-core)

For each page, run an automated accessibility check using `@axe-core/playwright`:

    const { default: AxeBuilder } = require('@axe-core/playwright');
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

Report every violation with:

- Rule that failed
- Element selector
- Description
- Severity (axe assigns its own; map to the protocol's P0/P1/P2)

Common violations to flag with high severity:

- Missing alt text on images
- Form inputs without labels
- Insufficient color contrast
- Missing or duplicate page landmarks
- Broken heading hierarchy
- Buttons without accessible names

### 4K. Tab focus order

For each page, programmatically tab through every interactive element and verify the order is logical (top-to-bottom, left-to-right within rows).

### 4L. Heading hierarchy

Verify each page has exactly one `<h1>` and the heading tree is sequential (no `<h2>` followed by `<h4>` skipping `<h3>`).

### 4M. Image alt text

Verify every `<img>` element has an `alt` attribute. Empty alt is OK for decorative images; missing alt is a bug.

### 4N. Form labels

Verify every input element has an associated label, either via `<label for>` or `aria-label` or `aria-labelledby`.

---

## Phase 5 — Per-page checks (logged-in)

Repeat Phase 4 for the logged-in context. Most checks are the same. Add these logged-in-specific checks:

### 5A. User-specific UI

- The navbar shows the user's avatar / name / notification bell instead of login CTAs
- Personalized widgets render with the simulated user data
- No "you're not logged in" messages on pages that should be accessible

### 5B. Personal data

- Empty states render correctly (the user has no data yet for some features)
- Populated states render correctly (the user has data for other features)
- No "loading forever" widgets — every async fetch eventually shows content or an error

### 5C. Auth-only flows

- Settings page is accessible
- Profile page is accessible
- Any "my X" pages (my prayers, my notes, my whatever) are accessible
- Logout works and returns to the logged-out state correctly

---

## Phase 6 — Cross-cutting checks

These checks span the entire site and don't fit neatly into per-page testing.

### 6A. Responsive navigation

On mobile (375px), verify the hamburger menu:

- Opens the drawer correctly
- Drawer shows all nav sections
- Drawer closes on link click
- Drawer closes on backdrop click
- Drawer closes on Escape key
- Drawer is keyboard-navigable

### 6B. Breadcrumbs

Verify breadcrumbs appear on detail pages (the project's specific breadcrumb requirements vary). Each breadcrumb link should work and the structure should reflect the actual page hierarchy.

### 6C. Hero consistency

If the project has a documented "page hero" pattern, verify every page that's supposed to use it actually does. No mismatched font styles between pages.

### 6D. Content width consistency

At 1440px desktop, verify content widths follow the project's documented constraints. Some pages might have a max-width of 1280px, others 1440px, others 100% — but each page should match its intended constraint.

### 6E. Print stylesheet

If any page is meant to be printed, emulate print media:

    await page.emulateMedia({ media: 'print' });

And verify the print stylesheet renders correctly. Most pages don't need this; pages with printable content (recipes, articles, certificates) do.

### 6F. Reduced motion

Emulate `prefers-reduced-motion: reduce`:

    await page.emulateMedia({ reducedMotion: 'reduce' });

And verify the site respects it — no animations should run, transitions should be instant or absent.

### 6G. Dark mode preference

Emulate `prefers-color-scheme: dark`:

    await page.emulateMedia({ colorScheme: 'dark' });

And verify the site respects it. (Or, if the site is intentionally always dark, verify nothing breaks when the user has dark mode preference set.)

### 6H. High contrast mode

Emulate forced colors mode (Windows high contrast):

    await page.emulateMedia({ forcedColors: 'active' });

And verify the site is still usable. Custom colors should be replaced with system colors gracefully.

### 6I. RTL languages (if supported)

If the site supports RTL languages (Arabic, Hebrew, etc.), switch the document direction and screenshot every page in RTL. Verify layouts mirror correctly.

---

## Phase 7 — Visual diff against baseline

If a previous deep review run produced screenshots, compare the new screenshots against the baseline.

### 7A. Generate diffs

For each (page, state, viewport) combination:

- Compare the new screenshot to the baseline at the same path
- Generate a pixel-level diff
- Calculate a similarity score (0-100%)

### 7B. Categorize differences

- **No change** — pixel-identical (or within 0.1% noise threshold)
- **Minor change** — less than 5% pixel difference, likely due to font rendering or anti-aliasing
- **Notable change** — 5% to 30% pixel difference, likely intentional but worth confirming
- **Major change** — more than 30% pixel difference, requires investigation

For each notable or major change, the report includes:

- The page and viewport
- The before and after screenshots
- The diff image
- The likely cause (reference recent commits to that area)
- Whether the change is expected (based on recent specs)

### 7C. Update the baseline

If the new screenshots are correct (changes were intentional), update the baseline by replacing the previous screenshots with the new ones. If changes are regressions, do not update the baseline — the next run will show the same diff and the regression must be fixed.

---

## Phase 8 — Lighthouse audit (optional but recommended)

For each major page (not every variant — just one representative version of each page), run Lighthouse:

    npx lighthouse http://localhost:5173/page-url --output=json --output-path=/tmp/lighthouse-page.json

Capture:

- Performance score
- Accessibility score
- Best practices score
- SEO score

Compare each score to the previous run's baseline. Flag any score that dropped by more than 5 points.

For accessibility, any score below 95 is a P1 finding and the report should include the specific failing audits.

For performance, any score below 80 on desktop is a P1 finding. Mobile thresholds may be lower depending on the project.

---

## Phase 9 — Report

Append the Prompt 5 section to the deep review report at `_reports/deep-review-YYYY-MM-DD.md`. The section must include:

### Header

- Prompt name and version
- Start time, end time, total duration
- Total pages tested
- Total screenshots taken
- Tools used and versions

### Page inventory

- Total pages discovered
- Total page-state-viewport combinations tested
- Pages skipped (with reason)

### Per-page findings

For each page that produced a finding, list:

- Page path
- Viewport(s) affected
- Auth state(s) affected
- Description of the issue
- Screenshot reference (path)
- Severity (P0/P1/P2)
- Likely cause
- Recommended fix

### Cross-cutting findings

Findings from Phase 6 (responsive nav, breadcrumbs, etc.) grouped by category.

### Accessibility findings

Aggregated axe-core violations across all pages, grouped by rule. Each rule with:

- Rule description
- Total occurrences
- Affected pages
- Recommended fix

### Visual diff findings

If a baseline existed:

- Total comparisons performed
- Pixel-identical pages (count)
- Minor changes (count)
- Notable changes (list with cause)
- Major changes (list with screenshots and investigation)

### Lighthouse scores

If Lighthouse was run:

- Per-page scores (performance, accessibility, best practices, SEO)
- Delta from previous run
- Pages below threshold (with specific failing audits)

### Action items

Consolidated list of visual issues requiring follow-up, grouped by severity:

- **P0** — broken or unusable pages
- **P1** — visible regressions, accessibility failures
- **P2** — minor polish issues
- **P3** — notes for the future

Each item includes the page, viewport, description, recommended fix, and effort estimate.

---

## Commit strategy

This prompt produces screenshots and a report. The commits are:

1. The screenshots directory (`_reports/screenshots/YYYY-MM-DD/`)
2. The updated baseline if it was changed
3. The report itself

Visual fixes (CSS changes, layout fixes, accessibility fixes) are not part of this prompt. They become follow-up specs that reference this prompt's findings.

---

## Common pitfalls specific to this prompt

- **Don't run this prompt against `pnpm dev` if you can avoid it.** Production builds are different from dev builds. Visual issues that appear in production but not dev are exactly the ones this prompt should catch.
- **Don't skip the deterministic rendering setup.** Without it, every screenshot will diff against the baseline because of font rendering, animation timing, or relative time differences. False diffs waste hours.
- **Don't fix visual issues in this prompt.** This is verification, not repair. Document findings; fix them in follow-up specs.
- **Don't trust automated accessibility scores blindly.** Axe catches a lot but not everything. A page with a perfect score can still be inaccessible (e.g., a screen reader can't make sense of the structure even if every rule passes). Manual review of axe results matters.
- **Don't skip Lighthouse.** It catches performance regressions that automated tests don't.
- **Don't run this prompt without screenshots from a previous baseline.** First runs produce baselines for future runs but find no regressions. Plan to run this prompt at least twice in any major feature work — once to establish baseline, once after the work to compare.
- **Don't expect the first run to be clean.** Initial runs on debt-laden codebases often produce hundreds of findings. Triage by severity, fix the P0/P1 items, log the rest.
- **Don't run all viewports in serial.** Playwright supports parallel test execution. Use it. A full sweep should take minutes, not hours.
- **Don't compare screenshots from different machines without checking font rendering.** macOS, Linux, and Windows render fonts differently. Either run the prompt in a containerized environment or accept that small font diffs are expected when machines change.
- **Don't ignore P3 findings just because they're low priority.** They accumulate. Track them over time and budget periodic cleanup.
