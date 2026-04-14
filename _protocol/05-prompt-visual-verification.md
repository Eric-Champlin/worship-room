# Prompt 5 — Full-Site Visual Verification
 
**Protocol:** Repository-Wide Deep Review v1.1
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
7. The dev server can start cleanly (`pnpm dev`) or preview server (`pnpm build && pnpm preview`)
8. Screenshots from the previous run exist for visual diffing (or this is documented as the first run)
9. **Read `00-protocol-overview.md`** for reporting standards and severity scale
10. **Read `99-project-specific-overrides.md`** for the project's route inventory, auth simulation keys, theme conventions, layout exceptions, and Lighthouse baselines
11. **Read any wave audit artifacts referenced in the overrides file.** For Prompt 5 specifically, read:
    - The most recent playwright full-audit (e.g., `_plans/recon/bb37-playwright-full-audit.md`) for the prior verification state
    - The most recent accessibility audit (e.g., `_plans/recon/bb35-accessibility-audit.md`) for the accessibility baseline
    - The most recent performance baseline (e.g., `_plans/recon/bb36-performance-baseline.md`) for the Lighthouse Performance baseline
12. **Verify the route inventory in the overrides file matches the current `App.tsx`.** If new routes have been added since the overrides was last updated, update the overrides file before running this prompt. The sweep can only test routes it knows about.
 
---
 
## Phase 1 — Setup and instrumentation
 
### 1A. Start the server
 
Start the server in production-like mode if possible:
 
    pnpm build && pnpm preview
 
If a preview command isn't available, fall back to `pnpm dev` and document the limitation. Production builds catch issues that dev mode hides.
 
**Capture the actual URL the server binds to.** The preview server typically runs on a different port than the dev server (4173 vs 5173 for Vite). Hardcoding a port in Playwright scripts will fail against the wrong server. Use the server's actual output to determine the URL.
 
Wait for the server to be fully ready before running any tests.
 
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
 
**Note for projects with documented animation exemptions:** the overrides file may list animations that are intentionally exempt from reduced-motion (e.g., shimmer, breathing exercises, functional animations). Those animations will still run if the CSS override above doesn't catch them. The screenshots will be deterministic for the rest of the page but those specific elements may vary. Document this expected variance.
 
**Wait for fonts to load** before each screenshot:
 
    await page.evaluate(() => document.fonts.ready);
 
Without this, the first screenshot may show fallback fonts instead of the real ones.
 
**Wait for network idle** before each screenshot:
 
    await page.waitForLoadState('networkidle');
 
**Set a fixed reference time** if any UI shows relative timestamps. Mock `Date.now()`:
 
    await page.addInitScript(() => {
      const FIXED_DATE = new Date('2026-04-13T12:00:00.000Z').getTime();
      Date.now = () => FIXED_DATE;
    });
 
**Set a fixed viewport** explicitly for each test, don't rely on defaults.
 
**Set a fixed user agent** so server-side logic that depends on UA is deterministic.
 
### 1C. Configure auth states
 
Define three reusable browser contexts (the third one is for first-run welcome testing if the project has one):
 
**Logged-out context (typical visitor):**
 
- Fresh browser context
- All cookies cleared
- All localStorage cleared EXCEPT the keys that suppress one-time UI elements (e.g., the project's `wr_first_run_completed` key set to `"true"` to suppress the first-run welcome on Dashboard/home if that's not what you're testing)
- All sessionStorage cleared
 
The exact key names are project-specific and live in the overrides file. The overrides file documents which keys to set for the "typical visitor" experience without first-run welcomes or one-time prompts.
 
**Logged-in context:**
 
- Set the project's auth simulation localStorage keys
- Set the project's user identity keys
- Mark onboarding as complete
- Mark first-run as complete (suppresses the first-run welcome)
- Clear any "dismissed banner" keys so all banners are visible
- Verify login by navigating to a protected route and confirming no redirect to login
 
**First-run context (optional, for testing welcome flows):**
 
- Fresh browser context
- All cookies cleared
- All localStorage cleared (do NOT set the first-run-completed key)
- This context tests how the app handles a brand-new visitor
 
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
 
**Cross-reference with the overrides file.** The overrides file documents the canonical route list for the project, including which routes are public vs logged-in-only and which deserve special test parameters. If the route list in `App.tsx` has more routes than the overrides file, update the overrides before continuing — the sweep can only test what it knows about.
 
### 2B. Dynamic route sampling
 
For dynamic routes (like `/bible/:book/:chapter`), pick representative parameters that exercise the route fully. The overrides file should list specific test parameters for each dynamic route. If it doesn't, use:
 
- A common case (`/bible/john/3`)
- An edge case (long book name like `/bible/songofsolomon/8`)
- A boundary case (first or last chapter, like `/bible/genesis/1` and `/bible/revelation/22`)
- A deep-linked variant (e.g., `/bible/john/3?verse=16` to test deep-linking contracts)
 
Test all variants for each dynamic route.
 
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
- First-run state (for surfaces that show first-run welcomes)
 
Each variant produces a different visual output and each one needs to be screenshotted.
 
The full test matrix is therefore:
 
    pages × tabs × dynamic-route-samples × auth-states × data-states
 
For a moderate-sized app this might be 200 to 500 individual screenshots. That's normal.
 
### 2E. Document layout exceptions
 
The overrides file documents pages that use non-standard layouts (e.g., a Bible reader that uses an immersive `ReaderChrome` instead of the standard `Navbar`/`SiteFooter`). For each documented layout exception:
 
- Note that the exception exists
- Note which standard checks should be skipped or modified for that page (e.g., "BibleReader does not have the standard Navbar — skip Phase 4B Navbar checks; verify the alternative chrome instead")
- Note any custom checks that apply only to the exception (e.g., "BibleReader has its own skip-to-main-content link at the reader root, not in the Navbar — verify it's present and works")
 
Layout exceptions are not violations. They're documented intentional design decisions.
 
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
 
**Important: respect documented layout exceptions.** If a page is documented in the overrides file as using a non-standard layout, skip the checks that don't apply to it. Don't flag a documented exception as a violation.
 
### 4A. Background and theme
 
- No white or light gray backgrounds on any page section unless intentionally light
- Every page maintains the documented theme aesthetic (dark sanctuary, light minimal, whatever the project specifies)
- No jarring color transitions between pages
- Frosted glass card pattern matches the documented canonical pattern (check the overrides file for the exact spec)
 
### 4B. Navbar
 
**Skip this check for pages documented in the overrides file as using an alternative layout (e.g., immersive reader chrome).**
 
For all other pages:
 
- Renders correctly with the expected logo, nav links, and CTAs
- All nav links are tappable and route correctly
- Skip-to-main-content link is present and visible on keyboard focus
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
- Typography matches the documented role conventions (e.g., scripture in serif, UI chrome in sans-serif)
 
### 4E. Layout
 
- No overlapping elements
- No horizontal scrollbar on any page (unless explicitly intentional, like a horizontal-scroll component)
- Content fills the page width appropriately at desktop (no thin centered columns unless intentional)
- Mobile layouts are single-column with no cramping
- Spacing is consistent across pages (don't have one page with 16px padding and another with 32px)
 
### 4F. Footer
 
**Skip this check for pages documented in the overrides file as not having a footer (e.g., immersive reader pages).**
 
For all other pages:
 
- Renders on every page with the expected sections
- All footer links work
- Footer doesn't have visual issues (broken layouts, missing content)
- Crisis resources (if the project specifies them) are visible
- Accessibility statement link is present (if the project added one)
 
### 4G. Interactive elements
 
- All navigation links are clickable (no dead links — verify by clicking each one)
- Tab switching works on tabbed pages
- Dropdowns open and close
- Buttons have visible hover states (test by hovering)
- Forms accept input
- Touch targets are at least 44×44 CSS pixels
 
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
 
**Compare against the prior accessibility baseline.** If the overrides file references an accessibility audit baseline (e.g., `_plans/recon/bb35-accessibility-audit.md`), the project's documented target Lighthouse Accessibility score (typically 95+) must be met on every major page. Any page that drops below the target is a regression — flag as P1.
 
Common violations to flag with high severity:
 
- Missing alt text on images
- Form inputs without labels
- Insufficient color contrast
- Missing or duplicate page landmarks
- Broken heading hierarchy
- Buttons without accessible names
- Icon-only buttons missing aria-label
- Decorative icons missing aria-hidden
- Dialogs missing aria-modal
 
### 4K. Tab focus order
 
For each page, programmatically tab through every interactive element and verify the order is logical (top-to-bottom, left-to-right within rows).
 
The first focusable element should typically be the skip-to-main-content link (or, for pages documented as using alternative layouts, whatever skip mechanism the layout exception provides).
 
### 4L. Heading hierarchy
 
Verify each page has exactly one `<h1>` and the heading tree is sequential (no `<h2>` followed by `<h4>` skipping `<h3>`).
 
If a page has a visually-hidden `<h1>` for accessibility, that counts as the page's h1 — don't flag it.
 
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
- Empty states use the canonical empty state primitive (the overrides file documents which component this is)
 
### 5C. Auth-only flows
 
- Settings page is accessible
- Profile page is accessible
- Any "my X" pages (my prayers, my notes, my whatever) are accessible
- Logout works and returns to the logged-out state correctly
 
---
 
## Phase 6 — Cross-cutting checks
 
These checks span the entire site and don't fit neatly into per-page testing.
 
### 6A. Responsive navigation
 
On mobile (375px), verify the hamburger menu (or equivalent mobile nav):
 
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
 
The overrides file should document the canonical layout container widths.
 
### 6E. Print stylesheet
 
If any page is meant to be printed, emulate print media:
 
    await page.emulateMedia({ media: 'print' });
 
And verify the print stylesheet renders correctly. Most pages don't need this; pages with printable content (recipes, articles, certificates) do.
 
### 6F. Reduced motion
 
Emulate `prefers-reduced-motion: reduce`:
 
    await page.emulateMedia({ reducedMotion: 'reduce' });
 
And verify the site respects it — no animations should run, transitions should be instant or absent.
 
**Exception:** the overrides file may document specific animations that are exempt from the reduced-motion override (e.g., functional animations like a breathing exercise, decorative-without-urgency animations like shimmer). Those animations are expected to continue running and should not be flagged as violations of the reduced-motion check.
 
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
 
### 6J. First-run welcome (if applicable)
 
If the project has a first-run welcome flow (e.g., BB-34's `FirstRunWelcome`):
 
- Use the first-run context (empty localStorage, no `wr_first_run_completed` key)
- Navigate to the home page or Dashboard
- Verify the welcome appears
- Verify the welcome can be dismissed
- Verify after dismissal, the localStorage key is set
- Navigate to a deep-linked route (e.g., `/bible/john/3?verse=16`) with empty localStorage and verify the welcome does NOT appear (deep-link bypass per the overrides file's documented behavior)
 
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
- The likely cause (use `git log` on the affected files for the last N commits to identify the most recent change)
- Whether the change is expected (based on recent specs)
 
### 7C. Update the baseline
 
If the new screenshots are correct (changes were intentional), update the baseline by replacing the previous screenshots with the new ones. If changes are regressions, do not update the baseline — the next run will show the same diff and the regression must be fixed.
 
---
 
## Phase 8 — Lighthouse audit
 
For each major page (not every variant — just one representative version of each page), run Lighthouse with realistic device profiles:
 
    npx lighthouse http://localhost:4173/page-url \
      --output=json \
      --output-path=/tmp/lighthouse-page.json \
      --preset=mobile \
      --throttling.cpuSlowdownMultiplier=4 \
      --throttling-method=simulate
 
Capture:
 
- Performance score
- Accessibility score
- Best practices score
- SEO score
 
**Compare each score to the prior baselines:**
 
- **Performance** — compare against the baseline from the most recent performance audit referenced in the overrides file. Any page that drops below the project's documented target (typically 90+) is a P1 finding.
- **Accessibility** — compare against the baseline from the most recent accessibility audit referenced in the overrides file. Any page that drops below the project's documented target (typically 95+) is a P1 finding.
- **Best practices and SEO** — flag any score that dropped by more than 5 points from the previous run.
 
For accessibility, any score below the project's target (typically 95) is a P1 finding and the report should include the specific failing audits. For performance, any score below the target (typically 90) is a P1 finding.
 
The list of pages to audit is documented in the overrides file's "key feature areas and routes" section.
 
---
 
## Phase 9 — Report
 
Append the Prompt 5 section to the deep review report at `_reports/deep-review-YYYY-MM-DD.md`. The section must include:
 
### Header
 
- Prompt name and version (v1.1)
- Start time, end time, total duration
- Total pages tested
- Total screenshots taken
- Tools used and versions
 
### Wave context
 
- Most recent wave referenced (from the overrides file)
- Wave audit artifacts read as input (playwright full audit, accessibility audit, performance baseline)
- Documented layout exceptions respected during the sweep
- Documented animation exemptions respected during reduced-motion check
 
### Page inventory
 
- Total pages discovered
- Total page-state-viewport combinations tested
- Pages skipped (with reason)
- Pages with documented layout exceptions (with the exception noted)
 
### Per-page findings
 
For each page that produced a finding, list:
 
- Page path
- Viewport(s) affected
- Auth state(s) affected
- Description of the issue
- Screenshot reference (path)
- Severity (P0/P1/P2)
- Likely cause (with reference to recent commits if applicable)
- Recommended fix
- Wave origin (if the issue traces to a specific past spec)
 
### Cross-cutting findings
 
Findings from Phase 6 (responsive nav, breadcrumbs, etc.) grouped by category.
 
### Accessibility findings
 
Aggregated axe-core violations across all pages, grouped by rule. Each rule with:
 
- Rule description
- Total occurrences
- Affected pages
- Recommended fix
- Comparison against prior accessibility baseline (any regressions?)
 
### Visual diff findings
 
If a baseline existed:
 
- Total comparisons performed
- Pixel-identical pages (count)
- Minor changes (count)
- Notable changes (list with cause)
- Major changes (list with screenshots and investigation)
 
### Lighthouse scores
 
- Per-page scores (performance, accessibility, best practices, SEO)
- Comparison against prior performance baseline (every page that dropped below target is a P1)
- Comparison against prior accessibility baseline (every page that dropped below target is a P1)
- Pages below threshold (with specific failing audits)
 
### Action items
 
Consolidated list of visual issues requiring follow-up, grouped by severity:
 
- **P0** — broken or unusable pages
- **P1** — visible regressions, accessibility failures, performance regressions below target
- **P2** — minor polish issues
- **P3** — notes for the future
 
Each item includes the page, viewport, description, recommended fix, effort estimate, and wave origin if applicable.
 
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
- **Don't flag documented layout exceptions as violations.** The BibleReader (or equivalent immersive reader) doesn't have a Navbar or footer for documented design reasons. Flagging it as "missing footer" creates noise that hides real findings. Always check the overrides file's "known intentional drift" section.
- **Don't flag animation exemptions as reduced-motion violations.** The shimmer animation, the breathing exercise, and any other documented exempt animations are intentional. The overrides file lists them.
- **Don't skip the Lighthouse comparison against prior baselines.** A score is meaningless without a reference point. The overrides file points to the prior baselines — use them.
- **Don't update the route inventory by guessing.** Read the overrides file's route list, then verify against `App.tsx`. If they don't match, update the overrides file before the sweep.
 