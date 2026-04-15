# Prompt 1 — Build & Code Health

**Protocol:** Repository-Wide Deep Review v1.1
**Order:** First (foundation for all other prompts)
**Time budget:** 30 minutes (clean codebase) to 4 hours (debt-laden codebase)
**Prerequisites:** Working tree clean, dev server stopped, branch documented, `_reports/` directory exists

---

## Purpose

Produce a clean build, clean lint, and a categorized debt report. This prompt is the foundation for the rest of the protocol — Prompts 2 through 5 assume the build is clean. Run this first, finish it completely, then move to Prompt 2.

This prompt produces a report at `_reports/deep-review-YYYY-MM-DD.md` (creating it if it doesn't exist) with a section for Prompt 1's findings. Subsequent prompts will append to the same report file.

---

## Pre-flight checks

Before doing any work, verify and record:

1. Current branch name and commit hash
2. Working tree is clean (`git status` returns nothing modified or staged)
3. No dev server is running (`lsof -i :5173` or equivalent returns nothing)
4. Node version matches the project's documented requirement
5. Package manager matches the project's lockfile
6. The `_reports/` directory exists at the repo root
7. Today's report file path: `_reports/deep-review-YYYY-MM-DD.md`. Create it if it doesn't exist with a header containing the date, branch, commit hash, protocol version, and a placeholder for each prompt's section. If a file already exists for today's date, append a suffix: `deep-review-YYYY-MM-DD-2.md`, `-3.md`, etc.
8. **Read `00-protocol-overview.md`** for reporting standards and severity scale
9. **Read `99-project-specific-overrides.md`** for project-specific file paths, storage keys, theme tokens, animation tokens, accessibility patterns, known intentional drift, and wave audit artifact locations
10. **Read any wave audit artifacts referenced in the overrides file.** For Prompt 1 specifically, read the most recent debt audit document (e.g., `_plans/recon/bb37-debt-audit.md` if it exists). This tells you which lint/test/dead-code items were already resolved by prior wave cleanup work so you don't rediscover them as new findings.
11. **Read `frontend/docs/process-lessons.md`** if it exists. Process lessons from prior waves tell you which specific failure modes to watch for.

If any check fails, stop and resolve before proceeding. Do not skip pre-flight checks.

---

## Phase 1 — Build & Lint

### 1A. Capture baseline metrics

Before fixing anything, run the build and lint and record the starting state:

- Run `pnpm build` (or the project's equivalent). Capture: error count, warning count, total time, bundle size, output directory contents.
- Run `pnpm lint`. Capture: error count, warning count, total time, files affected.
- Save these as the "baseline" in the report. Without baselines, "fixed everything" is an unverifiable claim.
- **Compare the baseline against any wave audit artifacts.** If the most recent wave audit reported zero lint problems and zero failing builds, and the current baseline shows problems, those are new regressions since the wave shipped. Flag them as higher priority than pre-existing debt.

### 1B. Build cleanup

Run `pnpm build` and fix every error and every warning. Repeat until the output shows zero errors and zero warnings.

**Special handling for warnings from third-party dependencies:**

If a warning originates from a third-party dependency you cannot modify, document it in `KNOWN_WARNINGS.md` at the repo root with:

- The warning text verbatim
- The source dependency name and version
- The reason it can't be addressed (e.g., "deprecated API in vendor lib, no upgrade path available until v3 ships")
- A target date for re-evaluation

The build is considered clean if all warnings are either fixed or documented in `KNOWN_WARNINGS.md`. Documented warnings don't count against the clean state.

### 1C. Lint cleanup

Run `pnpm lint` and fix every error and every warning. Specific guidance for common rule violations:

**`react-refresh/only-export-components`:**
For files that intentionally co-export hooks alongside components (e.g., `AuthContext.tsx`, `AudioProvider.tsx`, `Toast.tsx`), add a targeted `eslint-disable` comment with explanation. The explanation comment must come BEFORE the disable directive:

    // This file intentionally co-exports a hook and a component because...
    // eslint-disable-next-line react-refresh/only-export-components
    export function useAuth() { ... }

**`react-hooks/exhaustive-deps`:**
Evaluate each warning. If the omission is intentional (e.g., event-handler-like callback that should not re-trigger), add an eslint-disable comment explaining why. If it's a genuine bug (unnecessary dep, missing dep that causes stale closure), fix the code.

**`@typescript-eslint/no-explicit-any`:**
Should never be suppressed without an explanation comment referencing a specific reason (e.g., "library type definition is wrong, see issue #123" or "polymorphic component prop, narrowed at usage site"). Suppressions without comments are violations.

**Any other rule:**
Default to fixing rather than suppressing. Suppress only with documented justification.

Repeat `pnpm lint` until output shows zero errors and zero warnings (or all warnings have inline explanation comments).

### 1D. Capture final metrics

After cleanup, rerun build and lint and record:

- Final error/warning counts (should be zero)
- Total time saved or added
- Files changed in cleanup (count and list)
- Bundle size delta from baseline

---

## Phase 2 — Static Analysis

Scan every file in the source directory and fix every issue found. Organize findings by category. For each category, produce a list with file paths and line numbers.

**Before scanning any category, read the overrides file's "known intentional drift" section.** Do not flag items documented as intentional drift as violations. They should appear in the report with a "documented intentional drift" flag.

### Category A — Dead code & unused exports

**Find:**

- Components, hooks, utilities, constants, or types that are exported but never imported anywhere else
- Import statements that import a symbol not used in the file
- Variables, functions, or parameters declared but never referenced
- Files that contain only re-exports of nothing useful

**Tools to use (prefer all of these in combination):**

- `ts-prune` or `knip` for unused export detection
- `unimported` for orphan file detection
- Manual grep for dynamic imports that might be missed

**Before flagging anything as dead, verify against:**

- All `export *` and `export { x } from` re-export chains (a symbol may be re-exported through a barrel file and look unused at first scan)
- Component registries or dynamic imports (a component referenced by string name in a registry is not dead)
- Test files and MDX documentation (test or doc usage counts as usage)
- Storybook stories
- Build configuration and tooling (a util used only by Vite config is not dead)
- Workspace packages if this is a monorepo
- Prior wave audit artifacts that may have documented a file as "intentionally kept for future use"

When in doubt, list as "suspected dead" rather than "dead." Let a human decide.

**Fix:**

- Clearly dead exports: remove
- Unused imports: remove
- Unreferenced variables: remove or prefix with underscore
- Suspected dead exports: log to report, do not delete

### Category B — TypeScript strictness

**Find:**

- Every `as any` cast outside of test files
- Every implicit `any` (function parameters without types, variables without types that TypeScript can't infer)
- Every `// @ts-ignore` and `// @ts-expect-error` comment
- Every `as unknown as X` chain
- Every non-null assertion (`!`) outside of trivially-safe patterns like `useRef().current!` after a documented null check
- Every `Record<string, any>` or similar permissive type — these should be specific types

**Fix or document:**

- For every TypeScript suppression, the file must contain a comment within 3 lines of the suppression explaining the reason. Suppressions without explanations are violations regardless of whether they're technically correct.
- For `as any`: replace with the correct type. If the correct type is genuinely complex, use `as unknown as SpecificType` with an explanation comment.
- For implicit any: add explicit types.
- For ts-ignore: evaluate whether the underlying issue can be fixed properly. If the suppression is necessary, ensure it has an explanation comment.
- For non-null assertions: verify each one is actually safe. Replace with proper null checks where the safety isn't obvious.

### Category C — Console & debugger statements

**Find:**

- Every `console.log`, `console.warn`, `console.error`, `console.debug` in production source code (not test files)
- Every `debugger` statement anywhere in production source
- Every `alert()`, `confirm()`, `prompt()` that isn't in a deliberate user-facing context

**Fix:**

- Remove unless inside an error boundary catch block or a genuine error handler that should log in production
- For legitimate production logs, route through a structured logger if the project has one, not raw console
- `debugger` statements should be zero
- `alert()` and similar should be replaced with proper UI (modals, toasts) unless they're in development-only code paths

### Category D — Theme consistency

**Find (do NOT auto-fix; report only):**

- Every raw hex color (`#[0-9a-fA-F]{3,8}`) in component files
- Every `rgb(`, `rgba(`, `hsl(`, `hsla(` in component files
- Light-theme tailwind classes in component files: `bg-white`, `bg-neutral-bg`, `bg-gray-`, `bg-slate-`, `text-gray-`, `text-slate-`
- Inline `style={{}}` props that contain color values
- Theme tokens defined in the central theme file but never used (orphan tokens)
- Theme tokens used in components but not defined in the central theme file (undefined tokens)

**Animation token violations (check the overrides file for the project's canonical animation tokens):**

- Hardcoded duration classes that don't match the project's token set (e.g., `duration-100`, `duration-200`, `duration-300`, `duration-500`, `duration-700` if the project uses `duration-fast/base/slow`)
- Hardcoded easing classes that don't match the project's token set (e.g., `ease-out`, `ease-in`, `ease-in-out` if the project uses named easings like `ease-standard/decelerate/accelerate/sharp`)
- Spring easing cubic-bezier strings hardcoded in className or style props
- Any cubic-bezier string outside of the project's central animation config file

For animation tokens, the overrides file lists the exempt animations (e.g., shimmer, breathing exercise, functional garden/SVG animations). Do not flag those as violations.

**Typography violations:**

- Scripture text rendered in sans-serif (check the overrides file for the project's scripture font — typically a serif like Lora or Georgia)
- Body text rendered in display/script fonts (check the overrides file for font role conventions)
- Headings using a font reserved for branding/logo only

For each finding, list the file path, line number, and the specific value or class. Do NOT auto-fix theme issues — these are intent-driven decisions and should be reviewed by a human. The exception is genuine bugs (undefined tokens used in components) which should be flagged at higher severity.

### Category E — Contrast & accessibility (text and semantic)

**Find:**

- Any text element using opacity or alpha below the project's documented minimum (commonly `text-white/30`, `text-white/40`, or `text-opacity-30`)
- Any placeholder using subscale opacity (commonly `placeholder:text-white/30`, `placeholder:text-white/40`)
- Any text where the foreground color and background color combination has been documented as failing contrast in a previous audit

**Accessibility pattern violations (check the overrides file for the project's canonical accessibility patterns):**

- `<button>` elements containing only an icon component (e.g., `<X />`, `<ChevronDown />`) without an `aria-label` attribute
- Icon components inside labeled buttons without `aria-hidden="true"` (causes double-announcement to screen readers)
- `<input>`, `<select>`, `<textarea>` elements without an associated `<label>`, `aria-label`, or `aria-labelledby`
- `role="dialog"` elements missing `aria-modal="true"`
- Pages with multiple `<h1>` elements
- Heading hierarchies that skip levels (e.g., `<h2>` followed by `<h4>`)
- Interactive elements explicitly sized below 44×44 CSS pixels (check class names for `h-8 w-8`, `p-1`, etc. on interactive elements)
- `outline: none` or `outline-none` without a visible `focus-visible` replacement
- `dangerouslySetInnerHTML` on any element (check Category H for the security angle too)

For each accessibility violation, list the file, line, element type, and the missing attribute. These are high-priority findings because BB-35 (or equivalent accessibility audit) specifically standardized these patterns and regressions indicate drift.

**Report each violation with file, line, and the specific class or missing attribute. Do not auto-fix contrast issues — they require visual judgment.** Accessibility attribute issues can be auto-fixed if the fix is unambiguous (e.g., adding `aria-hidden="true"` to a decorative icon inside a labeled button).

### Category F — Route & link integrity

**Find:**

- Every `<Link to="..."` and `navigate("..."` call. Verify each route target exists in the route definitions in the project's router configuration. Flag any link pointing to a route that doesn't exist.
- Every `<a href="..."` used for internal navigation (not external URLs). These should be `<Link>` instead. Flag them.
- Every anchor link `<a href="#section">`. Verify each target ID exists on the page it links from.
- Any `window.location.href = "..."` or similar imperative navigation. Flag for review.
- Verify every route in the project's router config appears in the overrides file's route list. If a route exists in code but not in the overrides, the overrides file is out of date and should be updated before Prompt 5 runs.

### Category G — Storage key consistency

**Find:**

- Every `localStorage.getItem`, `localStorage.setItem`, `localStorage.removeItem` call
- Every `sessionStorage.getItem`, `sessionStorage.setItem`, `sessionStorage.removeItem` call
- Every `IndexedDB` open, transaction, or object store operation
- Every `Cache` API operation (service worker caches)
- Every key referenced in any storage call

**Verify:**

- Every key matches a key defined in the overrides file's storage keys section. The overrides file should list every key the project uses. Any key in the code but not in the overrides is undocumented drift — flag it.
- Find any two writes to the same key from different files. If they're not coordinated through a shared store module, that's a bug — two parts of the app are competing for the same storage slot.
- Check for unbounded writes: arrays that grow without a cap. Flag with the file path and current cap (or lack thereof).
- Flag inconsistent key prefixes if the overrides file documents a canonical prefix convention. The overrides file may document multiple prefixes as intentional — respect that.
- Verify that write-through-to-localStorage stores do not have consumers that read the storage directly (bypassing the store). Consumers should use the store's API.

### Category H — Security scan

**Find (each must be zero or documented):**

- Any usage of `dangerouslySetInnerHTML`
- Any hardcoded API keys, tokens, secrets, or passwords in source code (not `.env` files)
- Any `eval()`, `new Function()`, or `innerHTML` assignment
- Every `fetch()`, `axios.`, or `XMLHttpRequest` call. Verify each URL is either to a known internal endpoint or a documented external API. Flag any hardcoded URLs to unfamiliar domains.
- Every `window.addEventListener('message', ...)`. Verify the handler validates the origin. postMessage without origin checks is a vulnerability.
- Any inline event handlers in JSX strings, `style="..."` strings (vs object), or anything that would be blocked by a strict Content Security Policy
- Service worker `push` event handlers. Verify they validate the payload structure before acting on it.
- Service worker `notificationclick` event handlers. Verify they validate the URL before navigating.
- Any user-controllable string that ends up in a URL parameter, HTML attribute, or script source — verify it's properly escaped.

### Category I — Import organization

**Find:**

- Imports using relative paths (`../../components/`) that cross more than one directory level. These should use the project's path alias (typically `@/`).
- Circular import dependencies (use `madge` or equivalent if available)
- Imports from test files into production code (the reverse direction is fine)
- Missing import sort order if the project has one configured
- Namespace imports from tree-shakeable libraries (e.g., `import * as Icons from 'lucide-react'` instead of `import { Camera } from 'lucide-react'`). Namespace imports defeat tree-shaking and bloat the bundle.
- Imports from deep internal paths of third-party libraries (e.g., `import thing from 'library/dist/internal/thing'`). These are fragile and break on library updates.

### Category J — Async & error handling

**Find:**

- Every `try/catch` block. Verify each one logs or surfaces the error somehow. Silent catches are bugs in disguise.
- Every Promise chain or async function. Verify each one handles rejection.
- Every `await` outside a try/catch. Flag for review.
- Every `.then()` without a corresponding `.catch()` or error handling. Flag.
- Race conditions: `await` calls inside loops where parallelization with `Promise.all` would be safer or faster.
- `useEffect` hooks that perform async work without a cleanup function or abort controller. If the component unmounts before the async work completes, the setState-after-unmount warning will fire. Flag.
- `useEffect` hooks that call setState during render (not inside an event handler or effect). These trigger React warnings and usually indicate a design flaw.

### Category K — React-specific patterns

**Find:**

- `useEffect` hooks with missing or incorrect dependency arrays (beyond what the exhaustive-deps lint rule catches)
- `useMemo` and `useCallback` with dependency arrays that don't match the actual dependencies
- `useState` initialized with a function call that runs on every render (should use lazy initializer: `useState(() => expensiveCompute())`)
- Event handlers created inline on every render where memoization would be appropriate
- Components that consume reactive stores via `useState(storeDotGetAll())` instead of the store's subscription hook — **this is the BB-45 anti-pattern and is a high-priority finding.** The overrides file describes the pattern. Any component consuming a reactive store should use the hook, not local state mirroring.
- Components with more than 5 `useState` calls that could be consolidated into a reducer or a single state object
- `key` props on list items using array index instead of stable IDs (causes incorrect re-renders)
- `React.Fragment` with a key but no children that need grouping
- `forwardRef` without `displayName` (bad DevTools experience)

---

## Phase 3 — Architecture preview (handed to Prompt 4)

Phase 3 of this prompt is intentionally minimal because the deep architecture audit lives in Prompt 4. But Prompt 1 should produce a quick inventory that Prompt 4 will consume:

- List every directory under `frontend/src/` (or equivalent) and the file count in each
- List every file matching `*store.ts`, `*Store.ts`, or `*-storage.ts`
- List every file matching `use*.ts` (custom hooks)
- List every file matching `*.test.ts` or `*.test.tsx`
- List the top 20 largest files by line count
- List the top 20 most-imported modules
- **List every component that consumes a reactive store** (grep for imports of `*Store` files, then for each consumer, note whether it uses the hook or calls `getAll*` directly). This list is critical input to Prompt 4's store consumer audit.

This inventory is appended to the report and Prompt 4 will use it as the starting point for pattern consistency analysis.

---

## Phase 4 — Report

Output the Prompt 1 section of the deep review report at `_reports/deep-review-YYYY-MM-DD.md`. The section must include:

### Header

- Prompt name and version (v1.1)
- Start time, end time, total duration
- Branch and commit hash
- Tools used (TypeScript version, ESLint version, etc.)

### Wave context

- Most recent wave referenced (from the overrides file)
- Wave audit artifacts read as input
- Any items from prior wave audits that the current scan confirms are still resolved
- Any items from prior wave audits that have regressed (high-signal findings)

### Build status

- Baseline: error count, warning count, time
- Final: error count, warning count, time
- Delta in bundle size
- Files changed during cleanup
- Documented warnings in `KNOWN_WARNINGS.md` (count and link)

### Lint status

- Baseline: error count, warning count
- Final: error count, warning count
- Files changed during cleanup
- Inline suppressions added (count and reason summary)

### Static analysis findings

For each category A through K:

- Items found (count)
- Items auto-fixed (count, with brief description)
- Items requiring human review (full list with file, line, description, recommended fix)
- Items with no clear fix (logged to follow-up)
- Items confirmed as documented intentional drift (with reference to overrides file)

### Architecture preview

The inventory data described in Phase 3.

### Risk rating

Pick one based on findings:

- **GREEN** — codebase is in good shape. Minor debt only.
- **YELLOW** — debt is accumulating. Several P1 items found. Schedule a focused cleanup session.
- **RED** — architectural problems detected, security vulnerabilities present, or build/lint cannot reach a clean state. Escalate immediately.

Justify the rating in one paragraph.

### Comparison to previous run

If a previous deep review report exists:

- Delta in dead code count
- Delta in `any` casts
- Delta in console statements
- Delta in theme violations
- Delta in animation token violations
- Delta in accessibility pattern violations
- New issues introduced since last run
- Issues resolved since last run

If no previous report exists, this section says "Initial run — no comparison available."

### Action items

Consolidated list of items requiring human follow-up, each with:

- Severity (P0/P1/P2/P3)
- Description
- File path and line number
- Recommended action
- Estimated effort
- Wave origin (if the issue traces to a specific past spec)

---

## Commit strategy

After Phase 4 produces the report, commit the fixes in logical groups. Do not commit everything as one giant change.

Suggested commit groups:

1. Build fixes (any code changes needed to clean the build)
2. Lint fixes (any code changes needed to clean lint warnings)
3. Dead code removal (one commit, one logical group of removed exports)
4. TypeScript strictness fixes (`any` to specific types, ts-ignore removals)
5. Console statement removal
6. Animation token violations (if any — reference the overrides file's canonical tokens)
7. Accessibility pattern fixes (icon-only button aria-labels, decorative icon aria-hidden, form labels)
8. Import organization fixes
9. Async/error handling fixes
10. React pattern fixes (anti-patterns, missing deps, store mirror bugs)
11. The report itself (`_reports/deep-review-YYYY-MM-DD.md`)
12. `KNOWN_WARNINGS.md` if updated

Each commit should have a clear message starting with `chore(deep-review):` so they're distinguishable in git history. Example:

    chore(deep-review): remove 23 dead code exports identified in 2026-04-13 audit
    chore(deep-review): replace 14 'any' casts with proper types
    chore(deep-review): migrate 8 remaining animation token violations to canonical tokens
    chore(deep-review): add aria-label to 12 icon-only buttons

Do not squash. The granularity matters for future bisects.

---

## Handoff to Prompt 2

After Prompt 1 is complete and committed, Prompt 2 (Test Suite Audit) is ready to run. Prompt 2 assumes the build is clean — do not start it until Prompt 1's final build and lint produce zero errors.

The handoff is implicit: Prompt 2 reads the same report file at `_reports/deep-review-YYYY-MM-DD.md` and appends its own section. The report file accumulates output from all prompts in a single run.

---

## Common pitfalls specific to this prompt

- **Don't fix tests in this prompt.** Test failures belong to Prompt 2. If `pnpm build` succeeds but tests fail, Prompt 1 is done.
- **Don't fix visual issues in this prompt.** Visual regressions belong to Prompt 5. If the build is clean but a page renders wrong, log it for Prompt 5.
- **Don't update dependencies in this prompt.** Dependency changes belong to Prompt 3. If a build error is caused by a dependency bug, document it as needing a dependency update in Prompt 3 — don't fix it here.
- **Don't refactor in this prompt.** This is a hygiene pass, not a redesign. If a file is messy but the build is clean and lint is clean, leave it alone. Prompt 4 will identify pattern issues.
- **Don't commit without the report.** The report is the deliverable. Commits without the corresponding report section are incomplete.
- **Don't flag documented intentional drift as violations.** Always check the overrides file's "known intentional drift" section before flagging any pattern inconsistency. The BibleReader layout exception, the reactive/CRUD store split, the storage key prefix mixing, and the BB-33 animation exemptions are all documented drift that should not be flagged as violations.
- **Don't rediscover what prior wave audits already addressed.** Read the overrides file's wave audit artifact list and reference the prior audit documents. If BB-37's debt audit already resolved an item, your job is to verify it stayed resolved — not to treat it as a new finding.
- **Don't auto-fix accessibility attributes without verification.** Adding `aria-hidden="true"` to a decorative icon is usually safe, but adding `aria-label="Close"` to a button that's actually a submit button is wrong. Auto-fix only when the fix is unambiguous.
- **Don't treat the store mirror anti-pattern as a minor finding.** Components that mirror reactive store data into local useState are correctness bugs even if they currently work. They will break silently when the store mutates from a different surface. Flag as P1 at minimum.
