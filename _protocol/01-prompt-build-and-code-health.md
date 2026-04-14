# Prompt 1 — Build & Code Health

**Protocol:** Repository-Wide Deep Review v1.0
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
7. Today's report file path: `_reports/deep-review-YYYY-MM-DD.md`. Create it if it doesn't exist with a header containing the date, branch, commit hash, and a placeholder for each prompt's section.

If any check fails, stop and resolve before proceeding. Do not skip pre-flight checks.

---

## Phase 1 — Build & Lint

### 1A. Capture baseline metrics

Before fixing anything, run the build and lint and record the starting state:

- Run `pnpm build` (or the project's equivalent). Capture: error count, warning count, total time, bundle size, output directory contents.
- Run `pnpm lint`. Capture: error count, warning count, total time, files affected.
- Save these as the "baseline" in the report. Without baselines, "fixed everything" is an unverifiable claim.

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
For files that intentionally co-export hooks alongside components (e.g., `AuthContext.tsx`, `AudioProvider.tsx`, `Toast.tsx`), add a targeted `eslint-disable` comment with explanation rather than restructuring the file:

    // eslint-disable-next-line react-refresh/only-export-components
    // This file intentionally co-exports a hook and a component because...

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

### Category A — Dead code & unused exports

**Find:**

- Components, hooks, utilities, constants, or types that are exported but never imported anywhere else
- Import statements that import a symbol not used in the file
- Variables, functions, or parameters declared but never referenced
- Files that contain only re-exports of nothing useful

**Before flagging anything as dead, verify against:**

- All `export *` and `export { x } from` re-export chains (a symbol may be re-exported through a barrel file and look unused at first scan)
- Component registries or dynamic imports (a component referenced by string name in a registry is not dead)
- Test files and MDX documentation (test or doc usage counts as usage)
- Storybook stories
- Build configuration and tooling (a util used only by Vite config is not dead)
- Workspace packages if this is a monorepo

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

**Fix:**

- Remove unless inside an error boundary catch block or a genuine error handler that should log in production
- For legitimate production logs, route through a structured logger if the project has one, not raw console
- `debugger` statements should be zero

### Category D — Theme consistency

**Find (do NOT auto-fix; report only):**

- Every raw hex color (`#[0-9a-fA-F]{3,8}`) in component files
- Every `rgb(`, `rgba(`, `hsl(`, `hsla(` in component files
- Light-theme tailwind classes in component files: `bg-white`, `bg-neutral-bg`, `bg-gray-`, `bg-slate-`, `text-gray-`, `text-slate-`
- Inline `style={{}}` props that contain color values
- Theme tokens defined in the central theme file but never used (orphan tokens)
- Theme tokens used in components but not defined in the central theme file (undefined tokens)

For each finding, list the file path, line number, and the specific value or class. Do NOT auto-fix theme issues — these are intent-driven decisions and should be reviewed by a human. The exception is genuine bugs (undefined tokens used in components) which should be flagged at higher severity.

### Category E — Contrast & accessibility (text)

**Find:**

- Any text element using opacity or alpha below the project's documented minimum (commonly `text-white/30`, `text-white/40`, or `text-opacity-30`)
- Any placeholder using subscale opacity (commonly `placeholder:text-white/30`, `placeholder:text-white/40`)
- Any text where the foreground color and background color combination has been documented as failing contrast in a previous audit

**Report each violation with file, line, and the specific class. Do not auto-fix contrast issues — they require visual judgment.**

### Category F — Route & link integrity

**Find:**

- Every `<Link to="..."` and `navigate("..."` call. Verify each route target exists in the route definitions in the project's router configuration. Flag any link pointing to a route that doesn't exist.
- Every `<a href="..."` used for internal navigation (not external URLs). These should be `<Link>` instead. Flag them.
- Every anchor link `<a href="#section">`. Verify each target ID exists on the page it links from.
- Any `window.location.href = "..."` or similar imperative navigation. Flag for review.

### Category G — Storage key consistency

**Find:**

- Every `localStorage.getItem`, `localStorage.setItem`, `localStorage.removeItem` call
- Every `sessionStorage.getItem`, `sessionStorage.setItem`, `sessionStorage.removeItem` call
- Every key referenced in any storage call

**Verify:**

- Every key matches a key defined in the project's documented storage keys file (commonly `.claude/rules/11-localstorage-keys.md` or similar). Flag any undocumented keys.
- Find any two writes to the same key from different files. If they're not coordinated through a shared store module, that's a bug — two parts of the app are competing for the same storage slot.
- Check for unbounded writes: arrays that grow without a cap. Flag with the file path and current cap (or lack thereof).
- Flag inconsistent key prefixes (e.g., a codebase that mixes `app:`, `wr_`, and `feature:` prefixes). Don't auto-fix; document.

### Category H — Security scan

**Find (each must be zero or documented):**

- Any usage of `dangerouslySetInnerHTML`
- Any hardcoded API keys, tokens, secrets, or passwords in source code (not `.env` files)
- Any `eval()`, `new Function()`, or `innerHTML` assignment
- Every `fetch()`, `axios.`, or `XMLHttpRequest` call. Verify each URL is either to a known internal endpoint or a documented external API. Flag any hardcoded URLs to unfamiliar domains.
- Every `window.addEventListener('message', ...)`. Verify the handler validates the origin. postMessage without origin checks is a vulnerability.
- Any inline event handlers in JSX strings, `style="..."` strings (vs object), or anything that would be blocked by a strict Content Security Policy

### Category I — Import organization

**Find:**

- Imports using relative paths (`../../components/`) that cross more than one directory level. These should use the project's path alias (typically `@/`).
- Circular import dependencies (use `madge` or equivalent if available)
- Imports from test files into production code (the reverse direction is fine)
- Missing import sort order if the project has one configured

### Category J — Async & error handling

**Find:**

- Every `try/catch` block. Verify each one logs or surfaces the error somehow. Silent catches are bugs in disguise.
- Every Promise chain or async function. Verify each one handles rejection.
- Every `await` outside a try/catch. Flag for review.
- Every `.then()` without a corresponding `.catch()` or error handling. Flag.
- Race conditions: `await` calls inside loops where parallelization with `Promise.all` would be safer or faster.

---

## Phase 3 — Architecture preview (handed to Prompt 5)

Phase 3 of this prompt is intentionally minimal because the deep architecture audit lives in Prompt 5. But Prompt 1 should produce a quick inventory that Prompt 5 will consume:

- List every directory under `frontend/src/` (or equivalent) and the file count in each
- List every file matching `*store.ts`, `*Store.ts`, or `*-storage.ts`
- List every file matching `use*.ts` (custom hooks)
- List every file matching `*.test.ts` or `*.test.tsx`
- List the top 20 largest files by line count
- List the top 20 most-imported modules

This inventory is appended to the report and Prompt 5 will use it as the starting point for pattern consistency analysis.

---

## Phase 4 — Report

Output the Prompt 1 section of the deep review report at `_reports/deep-review-YYYY-MM-DD.md`. The section must include:

### Header

- Prompt name and version
- Start time, end time, total duration
- Branch and commit hash
- Tools used (TypeScript version, ESLint version, etc.)

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

For each category A through J:

- Items found (count)
- Items auto-fixed (count, with brief description)
- Items requiring human review (full list with file, line, description, recommended fix)
- Items with no clear fix (logged to follow-up)

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

---

## Commit strategy

After Phase 4 produces the report, commit the fixes in logical groups. Do not commit everything as one giant change.

Suggested commit groups:

1. Build fixes (any code changes needed to clean the build)
2. Lint fixes (any code changes needed to clean lint warnings)
3. Dead code removal (one commit, one logical group of removed exports)
4. TypeScript strictness fixes (`any` to specific types, ts-ignore removals)
5. Console statement removal
6. Import organization fixes
7. Async/error handling fixes
8. The report itself (`_reports/deep-review-YYYY-MM-DD.md`)
9. `KNOWN_WARNINGS.md` if updated

Each commit should have a clear message starting with `chore(deep-review):` so they're distinguishable in git history. Example:

    chore(deep-review): remove 23 dead code exports identified in 2026-04-09 audit
    chore(deep-review): replace 14 'any' casts with proper types
    chore(deep-review): remove 8 console.log statements from production source

Do not squash. The granularity matters for future bisects.

---

## Handoff to Prompt 2

After Prompt 1 is complete and committed, Prompt 2 (Test Suite Audit) is ready to run. Prompt 2 assumes the build is clean — do not start it until Prompt 1's final build and lint produce zero errors.

The handoff is implicit: Prompt 2 reads the same report file at `_reports/deep-review-YYYY-MM-DD.md` and appends its own section. The report file accumulates output from all prompts in a single run.

---

## Common pitfalls specific to this prompt

- **Don't fix tests in this prompt.** Test failures belong to Prompt 2. If `pnpm build` succeeds but tests fail, Prompt 1 is done.
- **Don't fix visual issues in this prompt.** Visual regressions belong to Prompt 3. If the build is clean but a page renders wrong, log it for Prompt 3.
- **Don't update dependencies in this prompt.** Dependency changes belong to Prompt 4. If a build error is caused by a dependency bug, document it as needing a dependency update in Prompt 4 — don't fix it here.
- **Don't refactor in this prompt.** This is a hygiene pass, not a redesign. If a file is messy but the build is clean and lint is clean, leave it alone. Prompt 5 will identify pattern issues.
- **Don't commit without the report.** The report is the deliverable. Commits without the corresponding report section are incomplete.
