---
description: Comprehensive code review — accessibility, code quality, security, spec compliance, and Worship Room-specific safety checks
argument-hint: (optional) path to plan file, --spec path to spec file, or focus area
user-invokable: true
---

# code-review

Comprehensive code review for **Worship Room** — a Christian emotional healing web app built with React 18 + TypeScript (Vite), Spring Boot (Java), TailwindCSS, and PostgreSQL.

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

---

## Step 1: Gather the Diff

Collect all current changes:

```bash
git diff              # unstaged changes
git diff --staged     # staged changes
git diff --stat       # file summary
```

Combine unstaged + staged into a single diff. If both are empty, tell the user there is nothing to review and **stop**.

```text
## Review Scope

**Files changed:** {count}
**Lines added:** {count}
**Lines removed:** {count}

**Changed files:**
- {file path} — {lines added / lines removed}
```

## Step 2: Load Context

### Plan Context (if provided)

If `$ARGUMENTS` contains a path to a plan file, read it and extract:
- **Implementation Steps** — what was supposed to be built
- **DO NOT guardrails** — things that should NOT have been done
- **Edge Cases & Decisions** — explicit decisions that should be reflected in the code
- **Design Context** — UI specs that should be matched
- **Execution Log** — what was actually implemented

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

## Step 3: Run Parallel Reviews

Invoke **both subagents simultaneously** on the combined diff:

- **`a11y-reviewer`** — accessibility audit
- **`code-quality-reviewer`** — code quality audit

Provide each agent:
- The full combined diff
- Tech stack context: React 18 + TypeScript (strict), Vite, TailwindCSS, Spring Boot (Java), PostgreSQL, Vitest + React Testing Library, path alias `@/`
- Instruction to be evidence-based: file paths, line references, no guessing
- Instruction to review **only** what is in the diff — nothing else

## Step 4: Plan Compliance (only if plan provided)

### 4a: Completeness Check

| Plan Step | Expected Files | Found in Diff? | Correct? |
|-----------|---------------|---------------|----------|
| Step 1: {title} | {file list} | YES / NO / PARTIAL | YES / NO — {details} |

**Missing implementations:** {anything in the plan NOT in the diff}
**Unexpected additions:** {anything in the diff NOT in the plan}

### 4b: Specification Compliance

For each planned method/class/component, verify:
- **Method signatures** — match the plan exactly?
- **Error handling** — each scenario matches plan's decisions?
- **Edge cases** — every edge case from the table handled?

### 4c: DO NOT Guardrail Verification

| Guardrail | Violated? | Evidence |
|-----------|-----------|----------|
| {DO NOT from plan} | NO / YES — {file}:{line} | {details} |

## Step 5: Spec Compliance (only if --spec provided)

### 5a: Auth Gating Compliance

Extract all auth-gated actions from the spec. For each one, verify it's gated in the code:

| Spec Requirement | Action | File:Line | Gated? | Evidence |
|-----------------|--------|-----------|--------|----------|
| {requirement} | {action} | {file}:{line} | YES / NO | {what the code does} |

**Missing auth gates:** {list any spec-defined gates not in the code}

### 5b: UI State Compliance

| Spec Requirement | Expected State | File:Line | Implemented? | Evidence |
|-----------------|---------------|-----------|-------------|----------|
| {requirement} | {state} | {file}:{line} | YES / NO | {details} |

### 5c: Feature Completeness

| Acceptance Criterion | Implemented? | Evidence |
|---------------------|-------------|----------|
| {criterion from spec} | YES / NO / PARTIAL | {file}:{line} or "not found" |

**Missing features:** {count} — {list}

### 5d: Cross-Feature Integration

| Integration Point | Spec Requirement | Implemented? | Evidence |
|------------------|-----------------|-------------|----------|
| {e.g., "Pray → Journal context"} | {spec says} | YES / NO | {file}:{line} |

## Step 6: Pattern Consistency

### 6a: Naming Consistency
- Class names, method names, variable names, test names — consistent across all changed files?

### 6b: Pattern Consistency
- Dependency injection, exception handling, logging, test setup, import style — same patterns everywhere?

### 6c: Codebase Consistency
Read 2-3 existing unchanged files in the same area and compare. Does new code follow established patterns?

Flag issues with specific file:line references. If no issues: "**Patterns:** Consistent across all changed files."

## Step 7: Cleanliness

### 7a: Debug Artifacts
Search the diff for: `console.log`, `console.debug`, `System.out.println`, new `// TODO` / `// FIXME` / `// HACK`, `@Ignore` / `@Disabled` on tests, commented-out code blocks, hardcoded test values in production code, `Thread.sleep` in production code.

### 7b: Accidental Changes
Files with only whitespace changes, import reordering, unrelated config changes, unexpected lock file changes.

### 7c: Sensitive Data
API keys, tokens, secrets, passwords (even in test code), internal URLs, personal data, credentials in config files.

Flag each with file:line and severity.

## Step 8: Logic Review

### 8a: Null Safety
- `.get()` on Optional without checks? Property access on potentially undefined objects without optional chaining?

### 8b: Error Handling
- Swallowed exceptions? Generic catch blocks? External calls without error handling?

### 8c: Resource Management
- Unclosed resources? Missing `@Transactional`? N+1 query patterns?

### 8d: Test Quality
- Meaningful assertions? Testing behavior vs implementation details? Edge cases covered?

### 8e: Frontend-Specific
- Missing key props on lists? useEffect with missing dependencies? State updates causing infinite re-renders? Missing alt text, labels, ARIA?

### 8f: Security
- SQL injection? XSS? Missing auth/authz? Input validation gaps? Logging sensitive data? CORS/CSRF issues?

### 8g: Backward Compatibility
- Removed API fields? Changed types? Changed endpoints? Changed status codes?

### 8h: Database Migration Safety (if migration files in diff)
- Zero-downtime compatible? Destructive operations? Column renames done safely? NOT NULL on existing columns?

## Step 9: Worship Room-Specific Safety Checks

**These are ALWAYS checked, regardless of flags:**

| Check | Status | Evidence |
|-------|--------|----------|
| Crisis detection on user text inputs (Pray, Journal, Prayer Wall) | OK / MISSING / BYPASSED | {file}:{line} |
| No `dangerouslySetInnerHTML` on user content | OK / VIOLATION | {file}:{line} |
| Demo mode: no database writes for logged-out users | OK / VIOLATION | {file}:{line} |
| Auth modal triggers correctly for gated actions | OK / MISSING | {file}:{line} |
| Journal drafts use localStorage, not sessionStorage | OK / WRONG STORAGE | {file}:{line} |
| All scripture uses WEB translation | OK / WRONG TRANSLATION | {file}:{line} |
| No unencrypted sensitive data persistence | OK / VIOLATION | {file}:{line} |

**Worship Room-specific violations are ALWAYS Blocker severity.**

## Step 10: Produce Report

```text
# Code Review Report

## Summary
- **Files changed:** {count}
- **Lines changed:** +{added} / -{removed}
- **Plan provided:** {yes / no}
- **Spec provided:** {yes / no}
- **Overall verdict:** CLEAN / NEEDS FIXES / NEEDS DISCUSSION

## Findings Summary
| Category | Issues | Blocking |
|----------|--------|----------|
| Accessibility | {count} | {count} |
| Code Quality | {count} | {count} |
| Plan Compliance | {count or "N/A"} | {count} |
| Spec Compliance | {count or "N/A"} | {count} |
| Pattern Consistency | {count} | {count} |
| Cleanliness | {count} | {count} |
| Logic | {count} | {count} |
| Security | {count} | {count} |
| Worship Room Safety | {count} | {count} |
| **Total** | **{count}** | **{count}** |

## Accessibility Findings
{from a11y-reviewer, grouped by severity}

## Code Quality Findings
{from code-quality-reviewer, grouped by severity}

## Plan Compliance
{from Step 4, or "No plan provided"}

## Spec Compliance
{from Step 5, or "No spec provided"}

## Pattern Consistency
{from Step 6}

## Cleanliness
{from Step 7}

## Logic Review
{from Step 8}

## Worship Room Safety
{from Step 9}

## All Issues

### Blocker (must fix)
| # | File | Line | Category | Issue |
|---|------|------|----------|-------|
| 1 | {path} | {line} | {category} | {description} |

### Major (should fix)
| # | File | Line | Category | Issue |
|---|------|------|----------|-------|
| 1 | {path} | {line} | {category} | {description} |

### Minor / Nit
| # | File | Line | Category | Issue |
|---|------|------|----------|-------|
| 1 | {path} | {line} | {category} | {description} |

## Action Plan
{ordered checklist of all fixes, blockers first}

## Open Questions
{anything requiring human judgment}
```

## Step 11: Ask Before Acting

After presenting the report, ask:

> "Do you want me to implement the action plan now?"

If in plan-aware mode with deviations:

> "Should I also update the plan's Execution Log to document intentional deviations?"

**Do NOT edit any files until the user explicitly confirms.**

---

## Rules

- Every finding must reference a specific file and line number — no vague observations
- Do not speculate about code not in the diff
- Do not run formatting-only changes unless they fix a cited issue
- Worship Room-specific issues (AI safety, crisis detection bypass, `dangerouslySetInnerHTML`, demo mode writes, unencrypted journal entries) are always **Blocker** severity
- Plan deviations that violate a guardrail (DO NOT item) are always **Blocker** severity
- Missing auth gates for spec-defined gated actions are always **Blocker** severity
- If the user provides a focus area in `$ARGUMENTS`, prioritize that area but still report blockers found elsewhere
- Read `.claude/rules/` for project-specific standards before reviewing

## Severity Definitions

- **Blocker:** Must fix. Includes: bugs, security vulnerabilities, Worship Room safety violations, missing auth gates, plan guardrail violations, sensitive data, debug artifacts in production code.
- **Major:** Should fix. Includes: inconsistent patterns, test quality issues, missing edge cases, accessibility issues (WCAG A/AA violations).
- **Minor:** Nice to fix. Includes: naming preferences, import ordering, comment wording, minor accessibility enhancements.
- **Nit:** Trivial. Includes: style preferences, whitespace.

## Philosophy

This review catches everything you'd be embarrassed to have flagged by a teammate or discovered in production — before anyone else sees it. Safety first, then correctness, then consistency, then polish.