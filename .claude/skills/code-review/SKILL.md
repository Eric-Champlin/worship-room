---
description: Comprehensive code review — accessibility, code quality, security, spec compliance, and Worship Room-specific safety checks
argument-hint: (optional) path to plan file, --spec path to spec file, or focus area
user-invokable: true
---
 
# code-review
 
Review all code changes on the current branch — verify accuracy, completeness, consistency, cleanliness, security, and Worship Room-specific safety before committing.
 
User input: $ARGUMENTS
 
## Usage
 
```bash
# Standard review (uncommitted changes)
/code-review
 
# Plan-aware review (cross-reference against plan)
/code-review _plans/2026-03-03-daily-experience.md
 
# Spec-aware review (cross-reference against spec for auth gating, feature completeness)
/code-review --spec _specs/daily-experience.md
 
# Both plan and spec
/code-review _plans/2026-03-03-daily-experience.md --spec _specs/daily-experience.md
 
# Focused review
/code-review "focus on the meditation components"
```
 
**CRITICAL: This command does NOT modify code. It does NOT commit, push, or perform any git operations. It is read-only review.**
 
**CRITICAL: Every finding must reference a specific file, line, and the actual code in the diff. No vague observations.**
 
---
 
## Step 1: Gather the Diff and Triage
 
Collect all current changes:
 
```bash
git diff              # unstaged changes
git diff --staged     # staged changes
git diff --stat       # file summary
```
 
Combine unstaged + staged into a single diff. If both are empty, check if the branch has commits ahead of main:
 
```bash
git diff main..HEAD
```
 
If that also produces no diff, tell the user there is nothing to review and **stop**.
 
Also get branch context:
 
```bash
git branch --show-current
git log --oneline -10
```
 
**Triage: identify high-risk files for deep review.**
 
Classify every changed file into one of these risk tiers:
 
- **High risk (deep review):** New components, security-sensitive changes (auth, encryption, data persistence), data model changes, files touching auth or crisis detection, database migrations, any file with >100 lines changed
- **Medium risk (standard review):** Existing component modifications, styling changes, test files, configuration changes
- **Low risk (light review):** Import reordering, formatting-only, comment updates, dependency bumps
 
```text
## Review Scope
 
**Branch:** {current branch name}
**Files changed:** {count}
**Lines added:** {count}
**Lines removed:** {count}
**Commits on branch:** {count}
 
**Triage:**
- High risk: {count} files (deep review)
- Medium risk: {count} files (standard review)
- Low risk: {count} files (light review)
 
**Changed files:**
- {file path} — {lines added / lines removed} — {HIGH / MEDIUM / LOW}
```
 
**If the user provided a focus area in `$ARGUMENTS`, prioritize that area but still report blockers found elsewhere.**
 
## Step 2: Load Context
 
### Plan Context (if provided)
 
If `$ARGUMENTS` contains a path to a plan file, read it and extract:
- **Implementation Steps** — what was supposed to be built, with exact file paths, method signatures, and specifications
- **Architecture Context** — patterns that should have been followed
- **DO NOT guardrails** — things that should NOT have been done
- **Edge Cases & Decisions** — explicit decisions that should be reflected in the code
- **Design Context** — UI specs that should be matched
- **Execution Log** — what was actually implemented (including deviations)
- **[UNVERIFIED] values** — any CSS or design values flagged as unverified during planning
- **Master Spec Plan reference** — if present, read the master plan for shared data models and localStorage keys to verify consistency
 
This is the contract the code should fulfill. Every planned change should appear in the diff, and nothing in the diff should contradict the plan.
 
### Spec Context (if --spec provided)
 
If `$ARGUMENTS` contains `--spec {path}`, read the spec file and extract:
- **Auth gating requirements** — what requires login, what works without login
- **UI state requirements** — loading states, error states, empty states, completion states
- **Feature acceptance criteria** — every checkbox/criterion that should be implemented
- **Cross-feature integration points** — context passing, shared completion tracking, shared components
 
### Design System Context
 
Read `.claude/rules/09-design-system.md` for the component inventory and design tokens. Reference this when reviewing UI changes.
 
### Worship Room Rules
 
Read `.claude/rules/02-security.md` for auth gating rules and `.claude/rules/01-ai-safety.md` for crisis detection requirements. These are always checked regardless of flags.
 
## Step 3: Accuracy Review (plan-based)
 
**Only perform this step if a plan file was provided. Skip to Step 4 if no plan.**
 
For each step in the plan, verify it is correctly reflected in the diff:
 
### 3a: Completeness Check
 
| Plan Step | Expected Files | Found in Diff? | Correct? |
|-----------|---------------|---------------|----------|
| Step 1: {title} | {file list from plan} | YES / NO / PARTIAL | YES / NO — {details} |
 
**Missing implementations:** {anything in the plan NOT in the diff}
**Unexpected additions:** {anything in the diff NOT in the plan}
 
### 3b: Specification Compliance
 
For each planned method/class/component, verify:
 
- **Method signatures** — do they match the plan exactly? (return types, parameter types, parameter names)
- **Error handling** — does each error scenario match the plan's explicit decisions?
- **Edge cases** — is every edge case from the Edge Cases & Decisions table handled in the code?
 
```text
## Specification Compliance
 
### Step 1: {title}
 
**Method signatures:**
- {method} — MATCHES PLAN / DEVIATES: {what's different}
 
**Error handling:**
- {scenario} — MATCHES PLAN / DEVIATES: {what's different}
 
**Edge cases:**
- {edge case} — HANDLED / MISSING / DIFFERENT: {details}
```
 
### 3c: DO NOT Guardrail Verification
 
Check that none of the plan's DO NOT guardrails were violated:
 
| Guardrail | Violated? | Evidence |
|-----------|-----------|----------|
| {DO NOT from plan} | NO / YES — {file}:{line} | {what the code does that violates it} |
 
### 3d: [UNVERIFIED] Value Audit
 
Search the plan for any values marked `[UNVERIFIED]`. For each one, check:
 
1. Was the unverified value used as-is in the implementation?
2. Was it subsequently verified during visual verification (check the Execution Log notes)?
3. If not verified, flag it as a "Should Fix" finding.
 
```text
## [UNVERIFIED] Value Audit
 
| Value | Plan's Best Guess | Used in Code? | Subsequently Verified? | Action |
|-------|------------------|---------------|----------------------|--------|
| {description} | {guess value} | YES — {file}:{line} | YES (visual checkpoint confirmed) / NO | {OK / Should Fix: verify before commit} |
```
 
If the plan has no [UNVERIFIED] values: `**[UNVERIFIED] values:** None in plan — all values from recon.`
 
### 3e: Data Model Consistency
 
**Check that shared data models are used consistently across the diff, regardless of whether a master plan exists.**
 
**If the plan references a master spec plan:** Verify interfaces and localStorage keys match the master plan exactly:
 
| Data Model / Key | Master Plan Definition | Code Implementation | Match? |
|-----------------|----------------------|--------------------| -------|
| {interface name} | {field names/types from master plan} | {file}:{line} | YES / DEVIATES: {details} |
| {localStorage key} | {expected key name} | {file}:{line} | YES / WRONG KEY |
 
**Regardless of master plan:** Check that any localStorage keys or data interfaces used in the diff are consistent with each other and with existing code. If two files in the diff use the same localStorage key with different schemas, or if a new file uses a key name that conflicts with existing code, flag it.
 
| Key / Interface | File A Usage | File B Usage | Consistent? |
|----------------|-------------|-------------|-------------|
| {key or interface} | {file}:{line} — {schema/type} | {file}:{line} — {schema/type} | YES / CONFLICT: {details} |
 
## Step 4: Spec Compliance (only if --spec provided)
 
**Only perform this step if --spec was provided. Skip to Step 5 if no spec.**
 
### 4a: Auth Gating Compliance
 
Extract all auth-gated actions from the spec. For each one, verify it's gated in the code:
 
| Spec Requirement | Action | File:Line | Gated? | Evidence |
|-----------------|--------|-----------|--------|----------|
| {requirement} | {action} | {file}:{line} | YES / NO | {what the code does} |
 
**Missing auth gates:** {list any spec-defined gates not in the code}
 
### 4b: UI State Compliance
 
| Spec Requirement | Expected State | File:Line | Implemented? | Evidence |
|-----------------|---------------|-----------|-------------|----------|
| {requirement} | {state} | {file}:{line} | YES / NO | {details} |
 
### 4c: Feature Completeness
 
| Acceptance Criterion | Implemented? | Evidence |
|---------------------|-------------|----------|
| {criterion from spec} | YES / NO / PARTIAL | {file}:{line} or "not found" |
 
**Missing features:** {count} — {list}
 
### 4d: Cross-Feature Integration
 
| Integration Point | Spec Requirement | Implemented? | Evidence |
|------------------|-----------------|-------------|----------|
| {e.g., "Pray → Journal context"} | {spec says} | YES / NO | {file}:{line} |
 
## Step 5: Pattern Consistency
 
Whether or not a plan was provided, review the diff for internal consistency.
 
### 5a: Naming Consistency
 
Check that naming follows consistent patterns across all changed files:
 
- **Component names** — do they follow the same convention?
- **Function/hook names** — consistent verb usage? (e.g., `use` prefix for hooks, `handle` for event handlers)
- **Variable names** — consistent style across files?
- **Test names** — do all test methods follow the same naming pattern?
 
```text
## Naming Consistency
 
**Issues found:**
- {file}:{line} — {what's inconsistent and what it should be to match the rest}
```
 
If no issues: `**Naming:** Consistent across all changed files.`
 
### 5b: Pattern Consistency
 
Check that architectural patterns are consistent:
 
- **Hooks** — same composition style everywhere? (custom hooks vs inline logic)
- **Error handling** — same strategy across all new code?
- **State management** — consistent approach? (useState vs useReducer, context usage)
- **Test setup** — same mocking/setup approach in all new test files?
- **Import style** — consistent across files? (path aliases, grouping)
- **Tailwind** — same utility ordering? (responsive, state, visual)
 
```text
## Pattern Consistency
 
**Issues found:**
- {file}:{line} — {what pattern is inconsistent and what the established pattern is}
```
 
If no issues: `**Patterns:** Consistent across all changed files.`
 
### 5c: Codebase Consistency
 
Read **one existing unchanged file per directory touched by the diff** and compare (prioritize the most-changed directory if many directories were touched):
 
- Does new code follow the same patterns as existing code?
- Are there style deviations from established codebase conventions?
- Does new code introduce patterns not used elsewhere?
 
```text
## Codebase Consistency
 
**Reference files examined:**
- {existing file} — {pattern observed}
- {existing file} — {pattern observed}
 
**Issues found:**
- {file}:{line} — {what deviates from established patterns}
```
 
If no issues: `**Codebase consistency:** New code matches existing patterns.`
 
## Step 6: Cleanliness
 
### 6a: Debug Artifacts
 
Search the diff for: `console.log`, `console.debug`, `console.warn` (in production code, not test code), `// TODO` / `// FIXME` / `// HACK` (newly added), `@Ignore` / `@Disabled` on tests, commented-out code blocks, hardcoded test values in production code, hardcoded external URLs in components that should be constants or env vars (e.g., CDN URLs, API endpoints).
 
```text
## Debug Artifacts
 
| File | Line | Artifact | Severity |
|------|------|----------|----------|
| {path} | {line} | {what was found} | {must-remove / review-needed / acceptable} |
```
 
If none found: `**Debug artifacts:** Clean — no debug leftovers found.`
 
### 6b: Accidental Changes
 
Files with only whitespace changes, import reordering, unrelated config changes, formatting-only changes in files not part of the feature
- Lock files that changed unexpectedly (`pnpm-lock.yaml`, `package-lock.json`).
 
```text
## Accidental Changes
 
| File | What Changed | Intentional? |
|------|-------------|-------------|
| {path} | {description of change} | LIKELY ACCIDENTAL — {why} |
```
 
If none found: `**Accidental changes:** Clean — all changed files appear intentional.`
 
### 6c: Sensitive Data
 
API keys, tokens, secrets, passwords (even in test code), internal URLs, personal data, credentials in config files.
 
```text
## Sensitive Data
 
| File | Line | What Was Found | Severity |
|------|------|---------------|----------|
| {path} | {line} | {description} | CRITICAL — must remove |
```
 
If none found: `**Sensitive data:** Clean — no secrets or credentials detected.`
 
## Step 7: Logic Review
 
### 7a: Null Safety
- Property access on potentially undefined objects without optional chaining?
- `.get()` on Optional without checks? (backend)
 
### 7b: Error Handling
- Swallowed exceptions? Generic catch blocks? External calls without error handling?
- `.catch(() => {})` that silently hides failures users should know about?
 
### 7c: Resource Management
- Unclosed resources? Missing cleanup in useEffect returns? Memory leaks (event listeners, intervals)?
- Missing `@Transactional`? N+1 query patterns? (backend)
 
### 7d: Test Quality
- Meaningful assertions? Testing behavior vs implementation details? Edge cases covered?
- Test names clearly describe what they test?
- Tests that would pass even if the feature were broken (false greens)?
- **Test isolation:** Do any tests depend on execution order or share mutable state? Tests that pass individually but fail when run together (or vice versa) indicate shared state leaks.
- **Test data leaks:** Are test data/mocks properly cleaned up? Will leftover state affect other tests?
- **Test speed:** Are integration tests doing work that should be unit tests? Are there tests making real network calls that should be mocked?
 
### 7e: Test Coverage for New Code
 
Check whether new production code in the diff has corresponding test files:
 
- `NewComponent.tsx` → `NewComponent.test.tsx` or `NewComponent.spec.tsx`
- `useNewHook.ts` → `useNewHook.test.ts`
- `newUtil.ts` → `newUtil.test.ts`
 
```text
## Test Coverage for New Code
 
| Production File | Test File? | Status |
|----------------|-----------|--------|
| `{path}` | {Yes — path / No} | {OK / MISSING} |
```
 
**Files that do NOT require dedicated tests** (skip these):
- Type definition files (`.d.ts`, pure interface files)
- Re-export barrel files (`index.ts` that only re-exports)
- CSS/style-only files
- Constants files with no logic
 
If any production file with non-trivial logic is missing tests, flag as **Should Fix**.
 
If all production files have tests: `**Test coverage:** All new production code has corresponding tests.`
 
### 7f: Frontend-Specific
- Missing key props on lists?
- useEffect with missing or incorrect dependencies?
- State updates that could cause infinite re-renders?
- Missing alt text, labels, ARIA attributes?
- Event handler references created inline causing unnecessary re-renders?
 
### 7g: Security
- XSS? `dangerouslySetInnerHTML` on user content?
- Missing auth/authz? Input validation gaps?
- SQL injection (backend)? Logging sensitive data?
- CORS/CSRF issues?
 
### 7h: Backward Compatibility
- Removed or renamed exported functions/components that other files import?
- Changed prop interfaces that existing consumers rely on?
- Changed route paths or query parameter names?
- Changed API response shapes? (backend)
 
### 7i: Database Migration Safety (if migration files in diff)
- Zero-downtime compatible? Destructive operations?
- NOT NULL on existing columns? Large table locks?
- Data migrations separated from schema changes? Rollback strategy?
 
```text
## Logic Review
 
### Null Safety
- {file}:{line} — {issue description, or "no issues found"}
 
### Error Handling
- {file}:{line} — {issue description, or "no issues found"}
 
### Resource Management
- {file}:{line} — {issue description, or "no issues found"}
 
### Test Quality
- {file}:{line} — {issue description, or "no issues found"}
 
### Frontend
- {file}:{line} — {issue description, or "no issues found"}
 
### Security
- {file}:{line} — {issue description, or "no issues found"}
 
### Backward Compatibility
- {file}:{line} — {issue description, or "no breaking changes detected"}
 
### Database Migration Safety
- {file}:{line} — {issue description, or "no migration files in diff" or "no issues found"}
```
 
## Step 8: Visual Verification Check (UI changes only)
 
If the diff touches UI components or the plan references a recon report or design specs, include a visual verification gate.
 
**Note:** Visual verification (`/verify-with-playwright`) may run before or after this code review, depending on your workflow. This section documents what needs to be confirmed before committing — not necessarily before this review runs.
 
```text
## Visual Verification Status
 
**This diff includes UI changes.** Before committing, confirm:
- [ ] `/verify-with-playwright` has been run against the built page
- [ ] The verify report shows ZERO style mismatches (not "CLOSE" — any >2px difference is a fail)
- [ ] Hover states on interactive elements match design system (background-color, shadow changes)
- [ ] Focus states on inputs match design system (border-color, outline)
- [ ] All [UNVERIFIED] values from the plan were compared against the design system or existing UI
- [ ] Vertical rhythm (spacing between sections) is correct
- [ ] Links are actual `<a>` tags with correct href, styling — not plain text
- [ ] Gradients match expected angle and color stops (if applicable)
- [ ] Text using `background-clip: text` has a color fallback for unsupported browsers
- [ ] `prefers-reduced-motion` respected for all animations and video
 
**If visual verification has NOT been run yet:** This code review can still proceed — it checks code accuracy, patterns, and cleanliness independently. But do NOT commit until `/verify-with-playwright` has been run and all items above are confirmed.
```
 
**If the diff has NO UI changes:** Skip this step entirely.
 
## Step 9: Diff Readability
 
Consider how you (or a future you) will experience this diff:
 
- **Large files:** Are any changed files excessively large?
- **Commit story:** Will the commit history tell a clear story?
- **Scope creep:** Are there changes unrelated to the feature that will cause confusion?
- **Self-documenting:** Is the code clear enough to understand without extensive explanation?
 
```text
## Diff Readability
 
**Assessment:**
- Diff size: {small / medium / large / needs splitting}
- Scope: {focused / some unrelated changes / significant scope creep}
- Self-documenting: {clear / needs comments / confusing areas}
 
**Suggestions:**
- {e.g., "Start review with {file} — it contains the core logic change"}
- {e.g., "The {file} changes are formatting only — can be skimmed"}
```
 
## Step 10: Worship Room-Specific Safety Checks
 
**These are ALWAYS checked, regardless of flags.** Read `.claude/rules/` for the latest project-specific safety requirements. The checks below reflect the current known requirements — if the rules files define additional checks, include those too.
 
| Check | Status | Evidence |
|-------|--------|----------|
| Crisis detection on user text inputs (Pray, Journal, Prayer Wall, Mood Check-In) | OK / MISSING / BYPASSED / N/A | {file}:{line} |
| No `dangerouslySetInnerHTML` on user content | OK / VIOLATION | {file}:{line} |
| Demo mode: no database writes for logged-out users | OK / VIOLATION / N/A | {file}:{line} |
| Auth modal triggers correctly for gated actions | OK / MISSING / N/A | {file}:{line} |
| Journal drafts use localStorage, not sessionStorage | OK / WRONG STORAGE / N/A | {file}:{line} |
| All scripture uses WEB translation | OK / WRONG TRANSLATION / N/A | {file}:{line} |
| No unencrypted sensitive data persistence | OK / VIOLATION / N/A | {file}:{line} |
| Mood data never exposed to friends (privacy) | OK / VIOLATION / N/A | {file}:{line} |
| `recordActivity()` is auth-guarded (no-ops for logged-out) | OK / MISSING / N/A | {file}:{line} |
| All `wr_*` localStorage keys use correct prefix | OK / WRONG PREFIX / N/A | {file}:{line} |
| Streak reset messaging is gentle (not punitive) | OK / PUNITIVE LANGUAGE / N/A | {file}:{line} |
| Faith points calculation uses correct multiplier tiers | OK / WRONG TIERS / N/A | {file}:{line} |
 
**Worship Room-specific violations are ALWAYS Blocker severity.**
 
## Step 11: Produce Report
 
**If total findings across ALL steps is 0 (clean review), use the compact report format:**
 
```text
# Code Review: {branch name}
 
**Verdict: CLEAN ✅**
 
**Branch:** {branch name} | **Files:** {count} | **Lines:** +{added} / -{removed}
**Plan:** {provided / not provided} | **Spec:** {provided / not provided}
 
**All checks passed:**
- Accuracy vs plan: ✅
- Spec compliance: ✅
- Pattern consistency: ✅
- Cleanliness: ✅
- Logic: ✅
- Security: ✅
- Worship Room safety: ✅
 
## Positive
{list things the code does well}
 
## Pre-Commit Checklist
- [ ] Tests pass locally: `pnpm test`
- [ ] Visual verification completed (if UI changes): `/verify-with-playwright`
- [ ] Diff is focused and tells a clear story
 
No blocking issues found. The diff is clean and ready to commit.
```
 
**If findings were found, use the full report format:**
 
```text
# Code Review: {branch name}
 
**Verdict: {NEEDS FIXES / NEEDS DISCUSSION}**
 
## Summary
- **Branch:** {branch name}
- **Files changed:** {count}
- **Lines changed:** +{added} / -{removed}
- **Plan provided:** {yes / no}
- **Spec provided:** {yes / no}
 
## Findings Summary
| Category | Issues | Blocking |
|----------|--------|----------|
| Accuracy (vs plan) | {count or "N/A"} | {count} |
| [UNVERIFIED] Values | {count or "N/A"} | {count} |
| Data Model Consistency | {count or "N/A"} | {count} |
| Spec Compliance | {count or "N/A"} | {count} |
| Pattern Consistency | {count} | {count} |
| Cleanliness | {count} | {count} |
| Logic | {count} | {count} |
| Security | {count} | {count} |
| Backward Compatibility | {count} | {count} |
| Database Migrations | {count or "N/A"} | {count} |
| Visual Verification | {count or "N/A"} | {count} |
| Diff Readability | {count} | {count} |
| Worship Room Safety | {count} | {count} |
| **Total** | **{count}** | **{count}** |
 
---
 
## Blocker (must fix)
| # | File | Line | Category | Issue | Fix |
|---|------|------|----------|-------|-----|
| 1 | {path} | {line} | {category} | {description} | {suggested fix} |
 
## Major (should fix)
| # | File | Line | Category | Issue | Fix |
|---|------|------|----------|-------|-----|
| 1 | {path} | {line} | {category} | {description} | {suggested fix} |
 
## Medium (recommended)
| # | File | Line | Category | Issue | Fix |
|---|------|------|----------|-------|-----|
| 1 | {path} | {line} | {category} | {description} | {suggested fix} |
 
## Minor / Nit
| # | File | Line | Category | Issue |
|---|------|------|----------|-------|
| 1 | {path} | {line} | {category} | {description} |
 
---
 
## Positive
{list things the code does well — patterns followed correctly, good accessibility, clean abstractions, etc.}
 
---
 
## Detail Sections
 
### Accuracy (vs Plan)
{from Step 3, or "No plan provided"}
 
### [UNVERIFIED] Values
{from Step 3d, or "No plan provided" or "None in plan"}
 
### Data Model Consistency
{from Step 3e, or "No issues found"}
 
### Spec Compliance
{from Step 4, or "No spec provided"}
 
### Pattern Consistency
{from Step 5}
 
### Cleanliness
{from Step 6}
 
### Logic Review
{from Step 7}
 
### Visual Verification
{from Step 8, or "No UI changes"}
 
### Diff Readability
{from Step 9}
 
### Worship Room Safety
{from Step 10}
 
---
 
## Pre-Commit Checklist
 
Based on this review, verify before committing:
 
- [ ] All blocking issues resolved
- [ ] No debug artifacts in production code
- [ ] No sensitive data in the diff
- [ ] No accidental/unrelated file changes
- [ ] Tests pass locally: `pnpm test`
- [ ] All [UNVERIFIED] values verified or accepted
- [ ] Visual verification with Playwright completed (if UI changes): `/verify-with-playwright`
- [ ] Diff is focused and tells a clear story
 
## Open Questions
{anything requiring human judgment — or "None"}
```
 
{If NEEDS FIXES: "X blocking issues must be resolved before committing. Want me to apply the fixes?"}
{If NEEDS DISCUSSION: "No code issues, but there are design/scope questions that should be considered before proceeding."}
 
**STOP. Do not modify code. Review is complete.**
 
## Step 12: Ask Before Acting
 
After presenting the report, ask:
 
> "Want me to apply the fixes?"
 
If in plan-aware mode with deviations:
 
> "Should I also update the plan's Execution Log to document intentional deviations?"
 
**Do NOT edit any files until the user explicitly confirms.**
 
---
 
## Examples
 
```bash
# Standard review (uncommitted changes)
/code-review
 
# Plan-aware review
/code-review _plans/2026-03-03-daily-experience.md
 
# Spec-aware review
/code-review --spec _specs/daily-experience.md
 
# Both plan and spec
/code-review _plans/2026-03-03-daily-experience.md --spec _specs/daily-experience.md
 
# Focused review
/code-review "focus on the meditation components"
```
 
## Rules
 
- Every finding must reference a specific file and line number — no vague observations
- Do not speculate about code not in the diff
- Do not run formatting-only changes unless they fix a cited issue
- Worship Room-specific issues (AI safety, crisis detection bypass, `dangerouslySetInnerHTML`, demo mode writes, unencrypted journal entries, mood data privacy violations) are always **Blocker** severity
- Plan deviations that violate a guardrail (DO NOT item) are always **Blocker** severity
- Missing auth gates for spec-defined gated actions are always **Blocker** severity
- Data model mismatches (wrong localStorage key names, wrong TypeScript interface fields vs master plan, conflicting schemas between files) are always **Major** severity
- If the user provides a focus area in `$ARGUMENTS`, prioritize that area but still report blockers found elsewhere
- Read `.claude/rules/` for project-specific standards before reviewing
- For clean reviews (zero findings), use the compact report — don't produce 12 sections of "no issues found"
- Prioritize high-risk files (from triage) for the deepest review
 
## Severity Definitions
 
- **Blocker:** Must fix. Includes: bugs, security vulnerabilities, Worship Room safety violations, missing auth gates, plan guardrail violations, sensitive data, debug artifacts in production code, unsafe database migrations, mood data privacy violations.
- **Major:** Should fix. Includes: accessibility issues (WCAG A/AA violations), missing error handling on external calls, unverified values not confirmed, data model mismatches (including cross-file localStorage schema conflicts), logic errors that could cause silent failures.
- **Medium:** Recommended. Includes: inconsistent patterns, test quality issues (isolation, shared state, false greens), missing edge cases, minor accessibility enhancements, performance concerns.
- **Minor / Nit:** Nice to have. Includes: naming preferences, import ordering, comment wording, whitespace.
 
## What This Does NOT Replace
 
- `/verify-with-playwright` — runtime visual verification (catches spacing, layout, color, font-size mismatches that code review cannot)
- Automated linting/formatting — run those separately
- Your own judgment — this is a pre-commit self-check, not a replacement for thinking
 
## Error Handling
 
- No changes found → inform user, nothing to review
- Plan file provided but doesn't match the changes → flag the mismatch
- Diff is extremely large (>2000 lines) → flag that it might need splitting, but still review (prioritize high-risk files from triage)
 
## Philosophy
 
The best commit is one you'd be proud to explain to anyone. This review catches everything you'd be embarrassed to discover later — before it's permanent. Safety first, then correctness, then consistency, then polish.
 
---
 
## See Also
 
- `/plan` — Create implementation plan from a spec (produces the plan this skill cross-references)
- `/spec` — Write a feature specification (upstream of /plan)
- `/execute-plan` — Execute all steps from a generated plan (run before this review)
- `/verify-with-playwright` — Runtime UI verification with screenshots and computed style comparison