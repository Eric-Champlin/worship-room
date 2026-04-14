# Prompt 2 — Test Suite Audit & Repair
 
**Protocol:** Repository-Wide Deep Review v1.1
**Order:** Second (after Prompt 1)
**Time budget:** 30 minutes (clean codebase) to 6 hours (debt-laden codebase)
**Prerequisites:** Prompt 1 complete and committed, build clean, lint clean
 
---
 
## Purpose
 
Bring the test suite to a fully passing state, identify abandoned tests, surface coverage gaps, audit test quality, and produce a structured report. This is not just "fix failing tests" — it's a full health check of the testing infrastructure.
 
This prompt assumes Prompt 1 has finished and the build is clean. Tests against a broken build are noise.
 
---
 
## Pre-flight checks
 
Before doing any work, verify and record:
 
1. Prompt 1 is complete and its commits are on the current branch
2. `pnpm build` produces zero errors (re-verify)
3. `pnpm lint` produces zero errors (re-verify)
4. Working tree is clean
5. Today's report file exists at `_reports/deep-review-YYYY-MM-DD.md`
6. The Prompt 1 section is already populated in the report
7. **Read `00-protocol-overview.md`** for reporting standards and severity scale
8. **Read `99-project-specific-overrides.md`** for project-specific test conventions, critical paths, and the BB-45 anti-pattern test requirement
9. **Read any wave audit artifacts referenced in the overrides file.** For Prompt 2 specifically, read the most recent test-related audit (e.g., `_plans/recon/bb37-final-state.md` for the post-wave test baseline). This tells you whether prior wave cleanup work resolved a test baseline that the current run should preserve.
10. **Read `frontend/docs/process-lessons.md`** if it exists. Prior wave lessons about test patterns (e.g., the BB-45 store mirror anti-pattern, the BB-41 deferred integration tests) are critical inputs.
 
If any check fails, return to Prompt 1 and complete it before proceeding.
 
---
 
## Phase 1 — Run all tests
 
Run `pnpm test` and capture the full output. Record:
 
- Total test files
- Total individual tests
- Passing count
- Failing count
- Skipped count
- Total duration
- Per-file timing (identify the slowest 10 test files)
- Test runner version
- Coverage metrics if available: line, branch, function, statement coverage
 
Save these as the "Phase 1 baseline" in the report.
 
If running with coverage produces meaningfully different numbers from running without, note the difference. Coverage runs are typically slower but produce richer data.
 
**Compare baseline against prior wave audit artifacts.** If the most recent wave audit (e.g., BB-37's final state document) reported zero failing tests, the current baseline should also show zero failing tests. Any failures present in the current baseline are regressions since the wave shipped — flag them as higher priority than would be the case for a "this baseline always had failures" situation.
 
**Specifically check for the post-wave test baseline:** if the overrides file documents that a prior wave (e.g., BB-37) resolved a frozen failing test baseline, the current run should NOT inherit that baseline. Any failures are new failures.
 
---
 
## Phase 2 — Fix every failure
 
For each failing test, follow this decision tree:
 
### Step 1 — Read the test code carefully
 
Understand what the test is asserting. Read the assertion text, the setup, the teardown, and any test fixtures or mocks. Do not guess at intent.
 
### Step 2 — Read the component, hook, or utility the test covers
 
Understand the current behavior. Read the production code that the test exercises. Compare the current behavior to what the test expects.
 
### Step 3 — Determine the root cause
 
Pick one of the following categories. Be honest — don't pick "test needs updating" if the truth is "code is broken."
 
**3a. Test is stale; production code is correct.**
The component behavior intentionally changed in a recent spec (dark theme conversion, layout width changes, content changes, new props, renamed elements). The test was not updated when the behavior changed.
 
**Action:** Update the test to match the new correct behavior. Add a comment noting which spec or commit caused the change. Do not weaken the test — preserve the intent of the original assertion, just update the specifics. Example: if a test was checking for `text-white` and the spec changed it to `text-foreground`, update the assertion. But if a test was checking that a button exists and the button was removed, don't delete the test silently — verify the button removal was intentional first.
 
**3b. Test is correct; production code has regressed.**
The test expectation matches what the spec said the code should do. The code has drifted from the spec.
 
**Action:** Fix the production code, not the test. Do not weaken the test to match broken code. If you cannot fix the code in this prompt's scope, surface it as a P0 or P1 issue and stop — this is a sign of an architectural problem.
 
**3c. Test is flaky.**
Passes sometimes, fails sometimes. Usually due to timing, async issues, animation, or shared state between tests.
 
**Action:** Fix the flakiness, do not skip the test or add retries. Common fixes:
- Replace `setTimeout` with `waitFor` from your testing library
- Wrap state updates in `act()`
- Use fake timers (`vi.useFakeTimers()` or `jest.useFakeTimers()`) instead of real ones
- Ensure cleanup runs between tests (clear localStorage, reset mocks)
- Mock the system clock if the test depends on timing
 
**3d. Test was written for incomplete or never-shipped functionality.**
The test asserts behavior that was specced but never built. The underlying feature is missing.
 
**Action:** Do not fix the test or the code. Document the gap as "incomplete feature" with the spec name (if known) or the commit that introduced the test. Surface in the report as a P1 follow-up. This catches the class of bug where a spec ships but its persistence layer or real implementation never lands.
 
**3e. Test is testing the wrong thing.**
The test technically passes or fails on the right assertion, but the assertion itself is meaningless ("renders without crashing" with no further checks, or asserts on implementation details rather than behavior).
 
**Action:** Strengthen the test or mark it for deletion. Do not "fix" a meaningless test by making its assertion pass — that perpetuates the rot.
 
**3f. Test is hitting the BB-45 store mirror anti-pattern.**
The test fails because a component reads reactive store data into local `useState` and the test mutates the store from outside the component, expecting a re-render that doesn't happen.
 
**Action:** This is a P1 finding. The test is correct — it's catching a real correctness bug in the component. Fix the component to use the store's hook (e.g., `useHighlightStore()`) instead of `useState(getAllHighlights())`. Do not fix the test. Add a comment in the component referencing this protocol's documentation of the anti-pattern. The overrides file describes this pattern in detail.
 
### Step 4 — Verify the fix
 
After fixing each test, run that specific test file in isolation:
 
    pnpm test -- {test-file-path}
 
Confirm it passes. Then run the full suite to confirm no regression elsewhere. Skipping isolation runs and only running the full suite makes failure attribution harder.
 
### Step 5 — Track every change
 
For each test you touch, record:
 
- Test file path
- Test name
- Category (3a/3b/3c/3d/3e/3f)
- Brief description of the change
- Spec or commit reference if applicable
 
This becomes the "tests fixed" section of the report.
 
---
 
## Phase 3 — Find abandoned tests
 
### 3A. Skip and only patterns
 
Search for any test marked with:
 
- `.skip` (e.g., `it.skip`, `describe.skip`, `test.skip`)
- `.only` (e.g., `it.only`, `describe.only`, `test.only`)
- `xit`, `xdescribe`, `xtest` (older syntax for skipping)
- `it.todo`, `test.todo` (planned but unwritten tests)
- Comments like `// TODO: write this test` or `// FIXME: re-enable this`
- **Comments referencing prior wave deferrals**: `// TODO: BB-37`, `// TODO: BB-37b`, `// DEFERRED: <wave-name>`, or any spec-name reference indicating the test was deferred to a cleanup spec
 
For each match, list the file, line, and test name.
 
**Action:**
 
- `.only` should never be committed. Remove every occurrence immediately.
- For `.skip`: evaluate whether the test should be re-enabled or deleted. If the test covers deleted functionality, delete it. If it was skipped due to a temporary issue that's now resolved, re-enable it. If the underlying issue still exists, leave it skipped but document the reason in a comment if missing.
- For `.todo`: leave them but list them as a separate category in the report. These represent intentional gaps and the report should track how many exist over time.
- **For prior-wave deferrals**: these should have been resolved by the cleanup spec they reference. If `// TODO: BB-37` comments still exist, BB-37 either missed them or they need to be re-evaluated. Surface as P1 — a deferred test that didn't get cleaned up is a process gap.
 
### 3B. Orphaned test files
 
Search for test files that import components, hooks, or utilities that no longer exist in the production source. These are orphaned tests for deleted code.
 
**Action:** Delete the orphaned test files. Their commit message should reference the original commit that deleted the production code.
 
### 3C. Tests with zero assertions
 
Search for test files where individual `it`/`test` blocks contain no `expect`, no `assert`, and no equivalent assertion call.
 
**Action:** Either add meaningful assertions or delete the test. A test that runs code without asserting anything is worse than no test at all because it gives a false sense of coverage.
 
### 3D. Tests with mismatched `expect.assertions`
 
Some tests use `expect.assertions(N)` to verify a specific number of assertions ran. Find tests where the declared count doesn't match the actual assertion count. This is subtle — a test that says `expect.assertions(3)` but only contains 2 expects will fail. A test that says `expect.assertions(2)` but contains 3 expects will pass even if one of the expects is wrong, because the count check satisfies first.
 
**Action:** Fix mismatches to reflect the actual assertion count or remove the `expect.assertions` call if it's not adding value.
 
### 3E. Snapshot test staleness
 
Search for snapshot test files (`.snap` files or inline snapshots). For each:
 
- Verify the snapshot file's last modified date isn't years old
- Check if any snapshots are excessively large (1000+ lines) — these usually mean the test is asserting on too much
- Check if snapshot updates have been committed without review (look for commit messages mentioning "update snapshots" with no other context)
 
**Action:** Flag stale or excessively large snapshots for review. Snapshot tests that drift without review become rubber stamps. If a snapshot test has been auto-updated repeatedly, the test is probably testing implementation details rather than behavior.
 
---
 
## Phase 4 — Coverage gap analysis
 
### 4A. Identify recently-modified production code
 
Use git to find production files (not test files) modified in the last 50 commits on the current branch (or more if a recent feature wave touched many files):
 
    git log --name-only --pretty=format: -50 | grep -E '\.(ts|tsx)$' | grep -v test | sort -u
 
Adjust the commit count if a recent wave is in scope — for a post-wave run, use enough commits to cover the entire wave's work.
 
For each file in this list, verify a corresponding test file exists. The convention may vary — adapt to the project:
 
- `src/components/Foo.tsx` → `src/components/Foo.test.tsx` (co-located)
- `src/components/Foo.tsx` → `src/components/__tests__/Foo.test.tsx` (parallel directory)
- `src/lib/foo.ts` → `src/lib/__tests__/foo.test.ts`
 
The overrides file documents which conventions the project uses.
 
### 4B. Categorize coverage state
 
For each recently-modified file:
 
- **Tested** — a corresponding test file exists and contains at least one assertion that exercises the production code
- **Thin coverage** — a test file exists but covers less than 50% of the production code's lines (use the coverage data from Phase 1)
- **Zero coverage** — no test file exists at all
 
Report the counts and the full list of zero-coverage and thin-coverage files.
 
**Do NOT write new tests in this prompt.** Coverage gaps are reported, not filled. Writing tests for previously-untested code is its own work that requires more context than this prompt can carry.
 
### 4C. Critical paths coverage
 
In addition to recently-modified files, verify that the critical paths documented in the overrides file always have tests, regardless of recent activity.
 
The overrides file's "critical paths" section is the authoritative list. Common categories include:
 
- Authentication flows
- Storage layer (every store and service)
- Routing logic
- Error boundaries
- Critical user flows
- Wave-specific paths added by recent work (the overrides file lists these)
 
Any of the above without test coverage is a P1 issue regardless of when the file was last modified.
 
### 4D. Reactive store consumer test coverage (BB-45 anti-pattern check)
 
For every component that consumes a reactive store, verify the test covers the reactive subscription pattern, not just the initial render.
 
**Required test pattern:**
 
A test that mutates the store from outside the component (calling the store's mutation method directly) and verifies the component re-renders with the new data.
 
**Insufficient test patterns:**
 
- A test that renders the component with seeded store data and only checks the initial render
- A test that mocks the store entirely and never tests real subscription behavior
 
**Action for each reactive store consumer without the proper test:**
 
Flag as P1. The component might be using the store correctly, or it might be silently broken via the BB-45 anti-pattern. Without the proper test, you can't tell the difference. The component needs both the proper test AND a manual code review to verify it uses the store's hook (not local useState mirror).
 
The list of reactive store consumers should come from Prompt 1's Phase 3 architecture preview. Cross-reference that list against the test files.
 
---
 
## Phase 5 — Final test run and counts
 
After all fixes from Phase 2 and all cleanup from Phase 3, run `pnpm test` one final time. Confirm zero failures. Record:
 
- Total test files (delta from baseline)
- Total individual tests (delta from baseline)
- Passing count (should equal total)
- Failing count (must be zero)
- Skipped count (with full list of skipped test names and reasons)
- Tests updated to match new behavior (count from category 3a)
- Component bugs fixed via test pressure (count from category 3b)
- Store mirror anti-pattern bugs fixed (count from category 3f)
- Orphaned tests removed (count from Phase 3B)
- Flaky tests stabilized (count from category 3c)
- Tests deleted for incomplete features or zero assertions (count, with reasons for each deletion)
- Coverage gaps found (count and list, no fixes)
- Reactive store consumers without proper subscription tests (count and list)
- Total duration (delta from baseline — slower or faster?)
 
A test suite trending slower over time is technical debt. Flag if duration grew by more than 20% with no corresponding test count increase.
 
---
 
## Phase 6 — Test quality audit
 
Beyond passing/failing, audit the quality of the tests themselves. Find and report:
 
### 6A. Brittle selectors
 
Tests that query by:
 
- Class name strings (`.text-white`, `.btn-primary`) — these break the moment styling changes
- Deeply-nested CSS paths — fragile
- Specific text strings that might change in future copy revisions
- Auto-generated IDs
 
**Action:** Flag for refactor toward semantic selectors (`getByRole`, `getByLabelText`, `getByText` with regex) or test-id attributes (`data-testid`). Semantic selectors are preferred; test-ids are acceptable for elements without good semantic anchors; class selectors should always be flagged.
 
### 6B. Real timers and sleeps
 
Tests with:
 
- `setTimeout` or `setInterval` calls
- `await sleep()` or equivalent
- `new Promise(r => setTimeout(r, ...))` patterns
 
These should use `waitFor` from the testing library or fake timers.
 
### 6C. Inappropriate mocking
 
Tests that mock things they shouldn't:
 
- Mocking your own components in unit tests of those same components
- Mocking React itself
- Mocking the testing library
- Mocking utility functions instead of testing the real behavior
- Mocking a reactive store entirely instead of testing real subscription behavior (this is the BB-45 anti-pattern from a different angle — the test passes because the mock returns whatever the test wants, but the real subscription pattern is never exercised)
 
**Action:** Flag for review. Mocking your own code means you're not testing it.
 
### 6D. Tests outside describe blocks
 
Orphan `it`/`test` calls not nested in a `describe`. Most testing libraries technically allow this but it produces ugly output and breaks grouping conventions.
 
**Action:** Wrap in appropriate `describe` blocks.
 
### 6E. Vague test descriptions
 
Tests with descriptions like:
 
- "works"
- "renders"
- "is correct"
- "passes"
- "test 1"
 
Real test descriptions should specify the input and expected outcome:
 
- "renders the user's display name when authenticated"
- "calls the submit handler with the form values when the form is valid"
- "returns null when the user has no active subscription"
 
**Action:** Flag for rewriting. The description is the test's documentation.
 
### 6F. Tests that test implementation, not behavior
 
Tests that assert on internal state, internal method calls, or specific re-render counts rather than user-visible behavior.
 
**Action:** Flag for refactor. Tests should verify what the user experiences, not how the code achieves it.
 
### 6G. Tests that don't clean up
 
Tests that mutate global state (localStorage, document, window) and don't reset it in `afterEach` or `beforeEach`. This causes test order dependencies and flakiness.
 
**Action:** Flag for refactor. Add cleanup or use isolated test contexts.
 
---
 
## Phase 7 — Mutation testing (advanced, optional)
 
This phase is optional but transformative. Mutation testing introduces small bugs into your code and verifies that tests catch them. A test suite that passes against mutated code is lying about coverage.
 
If Stryker (or equivalent) is available:
 
1. Run mutation testing on the most critical modules (auth, storage, routing, payment if applicable, plus any wave-specific critical paths from the overrides file)
2. Capture the mutation score for each module
3. Report:
   - Score below 60% — poor; test suite is largely cosmetic for that module
   - Score 60–80% — acceptable; coverage exists but has gaps
   - Score above 80% — excellent; tests genuinely catch bugs
 
Do not run mutation testing on the entire codebase in this prompt — it's too slow. Pick the 5 most important modules and test them. The full mutation pass is its own quarterly exercise.
 
If Stryker is not installed, document this as "mutation testing skipped — tooling not available" and recommend installation as a P3 follow-up.
 
---
 
## Phase 8 — Report
 
Append the Prompt 2 section to the deep review report at `_reports/deep-review-YYYY-MM-DD.md`. The section must include:
 
### Header
 
- Prompt name and version (v1.1)
- Start time, end time, total duration
- Tools used and versions
 
### Wave context
 
- Most recent wave referenced (from the overrides file)
- Test-related wave audit artifacts read as input
- Confirmation that the post-wave test baseline (if any) is preserved (e.g., zero failing tests if the wave resolved the baseline)
- Any prior wave deferrals (`TODO: BB-XX` comments) found and how they were resolved
 
### Test suite status
 
- Baseline (from Phase 1): total files, total tests, passing, failing, skipped, duration, coverage if available
- Final (after all fixes): same fields
- Delta in count and duration
 
### Failures fixed
 
For each failure resolved:
 
- File path
- Test name
- Category (3a/3b/3c/3d/3e/3f)
- Description of the change
- Spec or commit reference if applicable
 
### Component bugs fixed via test pressure
 
Tests in category 3b often surface real bugs in production code. List each one:
 
- File path of the production code that was fixed
- Description of the bug
- How the test caught it
 
These are the highest-value findings of this prompt and deserve their own subsection.
 
### Store mirror anti-pattern bugs fixed
 
If any tests were in category 3f (BB-45 anti-pattern), list them as a separate subsection:
 
- Component file path
- Test that caught it
- Fix applied (component switched from `useState(store.getAll())` to `useStoreHook()`)
 
This subsection exists because the anti-pattern is specific and worth tracking over time.
 
### Abandoned tests cleaned up
 
- `.only` removals (count)
- `.skip` re-enablements (count)
- `.skip` justifications added (count)
- `.todo` items found (count, with list)
- Prior-wave deferral comments resolved (count, with list of `TODO: BB-XX` references that were addressed)
- Orphaned test files deleted (count, with list and reasons)
- Zero-assertion tests fixed or deleted (count, with reasons)
- `expect.assertions` mismatches fixed (count)
- Stale snapshots flagged (count)
 
### Coverage analysis
 
- Recently-modified files inventoried (count)
- Files with full test coverage (count)
- Files with thin coverage (list)
- Files with zero coverage (list, prioritized)
- Critical paths missing coverage (list, P1)
- Reactive store consumers without proper subscription tests (list, P1)
 
### Test quality findings
 
For each category 6A through 6G:
 
- Items found (count)
- Files affected (list)
- Recommended action
 
### Mutation testing (if performed)
 
- Modules tested
- Scores
- Recommended improvements
 
### Comparison to previous run
 
If a previous deep review report exists:
 
- Test count delta
- Coverage delta
- Duration delta
- New failures introduced
- Resolved failures
- Store mirror anti-pattern bugs (delta — should ideally be zero with no new ones)
 
### Action items
 
Consolidated list of test-related items requiring follow-up, each with severity, file, description, recommended action, wave origin if applicable.
 
---
 
## Commit strategy
 
Commit fixes in logical groups:
 
1. Real bug fixes surfaced by failing tests (these are the most important — make them visible)
2. Store mirror anti-pattern fixes (separate commit even if just one — this pattern is worth tracking)
3. Test updates for intentional behavior changes (one commit per logical group)
4. Flaky test stabilizations
5. Orphaned test deletions
6. `.only` removals (separate commit, even if just one)
7. The report itself
 
Each commit message should start with `chore(test-audit):` for clarity. Example:
 
    fix(auth): correct token expiration check (caught by test audit)
    fix(highlights): use useHighlightStore hook instead of local useState (BB-45 anti-pattern)
    chore(test-audit): update Bible reader tests for dark theme conversion
    chore(test-audit): stabilize 3 flaky tests using fake timers
    chore(test-audit): delete 12 orphaned test files for removed components
 
---
 
## Handoff to Prompt 3
 
After Prompt 2 is complete and committed, Prompt 3 (Dependency & Supply Chain) is ready to run. Prompt 3 is independent of Prompts 1 and 2 in theory but benefits from running on a clean test suite — dependency updates may break tests, and you want to know whether a new failure is caused by the dependency or was pre-existing.
 
The handoff is implicit: Prompt 3 reads the same report file and appends its own section.
 
---
 
## Common pitfalls specific to this prompt
 
- **Don't weaken tests to make them pass.** A test that passes against broken code is worse than a failing test. Always fix the code first, the test second.
- **Don't skip tests as a "quick fix."** A skipped test is a lie. If a test is too hard to fix in this prompt, document why and surface as P1.
- **Don't write new tests in this prompt.** Coverage gaps are reported, not filled. Writing tests is its own work.
- **Don't mock things you didn't mock before.** New mocks in test fixes often hide the real bug.
- **Don't run only the full suite.** Run individual test files in isolation after each fix to attribute failures correctly.
- **Don't commit `.only`.** Verify before every commit.
- **Don't trust passing tests blindly.** Phase 6 (quality audit) is the part that catches tests that pass for the wrong reasons.
- **Don't fix production bugs you find without surfacing them.** A test in category 3b often surfaces a real bug. Fix the bug, but make sure it's visible in the report. These findings are the highest value of the entire protocol.
- **Don't treat BB-45 anti-pattern findings as theoretical.** A component that mirrors store data into local state is a real bug even if it currently passes its tests. The bug only manifests when the store mutates from a different surface, which is exactly the scenario the test is supposed to verify.
- **Don't inherit a prior failing baseline.** If a previous wave (like BB-37) resolved the failing test baseline to zero, the current run should preserve that. New failures are new failures, not "the legacy baseline."
- **Don't forget the prior-wave deferral comments.** Search for `TODO: BB-XX` patterns specifically. These are tests that were supposed to be fixed by a cleanup spec and might have been forgotten.