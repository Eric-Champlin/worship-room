---
description: Execute all steps from a Forums Wave implementation plan
argument-hint: Path to plan file (e.g. _plans/forums/2026-04-17-round3-phase01-spec01.md)
user-invokable: true
---

# execute-plan-forums

Execute all steps from a Forums Wave implementation plan created by `/plan-forums`. Handles backend (Spring Boot, JPA, Liquibase, Testcontainers), frontend (React, TypeScript, Tailwind), and mixed specs.

User input: $ARGUMENTS

## High-Level Behavior

Read a plan file, verify assumptions, then work through each step sequentially — implementing code, creating tests, verifying expected state (compile + test for backend, build + visual for frontend), and updating the Execution Log.

**CRITICAL:** This command does NOT commit, push, or perform any git operations. The user handles all git operations manually.

**CRITICAL:** If any step fails verification, STOP immediately. Do not continue to the next step.

---

## Step 1: Read the Plan

Read the plan file at `$ARGUMENTS`. If not found, display error and **stop.**

---

## Step 2: Internalize the Plan

Before doing anything, read and internalize:

1. **Architecture Context** — existing codebase patterns, package conventions, related files
2. **Master plan context** — read `_forums_master_plan/round3-master-plan.md` Universal Spec Rules section. These rules apply to every line of code you write.
3. **`.claude/rules/03-backend-standards.md`** — API contract, Spring Boot conventions
4. **`.claude/rules/05-database.md`** — schema conventions, naming
5. **`.claude/rules/02-security.md`** — auth patterns, input validation
6. **`.claude/rules/06-testing.md`** — test patterns
7. **Universal Rules Checklist** — verify every checked rule is understood
8. **Edge Cases & Decisions** — know explicit decisions so you don't re-decide during implementation
9. **Assumptions & Pre-Execution Checklist** — if first run (no steps [COMPLETE]), display to user and **wait for confirmation before proceeding**

**Record the starting file set:**
```bash
git diff --name-only HEAD 2>/dev/null
```
Store for the pre-execution safety check.

---

## Step 3: Find the Starting Point

Check the Execution Log. Find the first `[NOT STARTED]` or `[IN PROGRESS]` step.

**If all steps [COMPLETE]:** Display completion summary and **stop.**

**If first execution (no steps complete):** Create safety backup:
```bash
BACKUP_BRANCH="backup/pre-execute-$(date +%Y%m%d%H%M%S)"
git branch "$BACKUP_BRANCH" 2>/dev/null || true
```

---

## Step 4: Execute Each Step (Loop)

For each incomplete step in order:

### 4a: Pre-Execution Safety Check

```bash
git status --porcelain
```

Compare changed files against completed steps and the starting file set. If uncommitted changes exist from OUTSIDE this session:

```text
⚠️  UNCOMMITTED CHANGES DETECTED (not from this execution session)

Options:
1. Commit current changes first (recommended)
2. Stash changes: git stash push -m "pre-plan-execution"
3. Proceed anyway (WILL LOSE uncommitted work)
```

**NEVER run `git checkout`, `git restore`, or any file-reverting command without explicit user approval.**

### 4b: Check Dependencies

Verify all dependencies from the Step Dependency Map are `[COMPLETE]`. If not met, **stop** and inform user.

### 4c: Preview the Step

```text
# Executing: Step {N} — {title}

Objective: {objective}
Type: BACKEND / FRONTEND / MIXED
Files to create/modify: {list}
Guardrails (DO NOT): {list}

Proceeding...
```

### 4d: Re-Read Rules (every step)

Before implementing, re-read the relevant rules fresh — do NOT rely on memorized values from Step 2:

- **Backend steps:** `03-backend-standards.md` (API contract, patterns), `05-database.md` (schema conventions)
- **Frontend steps:** `09-design-system.md` (visual patterns), `04-frontend-standards.md`
- **All steps:** `02-security.md` (auth, validation), `06-testing.md` (test patterns)
- **Always:** The master plan's Universal Spec Rules section

### 4e: Implement

Execute the step following the plan's exact specifications.

**Hierarchy of authority:**
1. **The plan's explicit instructions** — file paths, method signatures, guardrails
2. **Master plan Universal Rules** — non-negotiable constraints
3. **`.claude/rules/` files** — project standards
4. **Architecture Context** — patterns from reconnaissance
5. **General best practices** — only when all above are silent

**Requirements:**
- Use exact file paths from the plan
- Follow referenced patterns — when the plan says "follow the pattern in `ExistingService.java`", read that file and match it
- Respect DO NOT guardrails
- Use constructor injection for Spring dependencies (never field injection)
- Use `@Valid` on controller request bodies
- Keep controllers thin — delegate to services
- Use DTOs for API requests/responses (never expose JPA entities directly)
- Follow the standard response shape from `03-backend-standards.md` for every endpoint

**If you encounter ambiguity:** STOP and ask the user. Do not guess.
**If the plan is wrong** (file doesn't exist, interface doesn't match): STOP and flag with evidence.

### 4f: Create Tests

Implement test cases specified in the plan's test specifications.

**Backend tests:**
- Use Testcontainers for integration tests (PostgreSQL + Redis as needed)
- Use `@SpringBootTest` for full-context integration tests
- Use `@DataJpaTest` for repository-only tests
- Use `MockMvc` for controller tests
- Follow existing test naming conventions from Architecture Context
- SQL INSERT for test data setup in repository tests

**Frontend tests:**
- Use Vitest + React Testing Library
- Follow existing test patterns from Architecture Context
- Use the reactive store consumer test pattern from `06-testing.md` when applicable

### 4g: Verification Checkpoint

**CRITICAL: Verify after EVERY step before moving on. The verification type depends on the step type.**

**Backend step verification:**
1. Code compiles: `./mvnw compile`
2. Tests pass: `./mvnw test` (or specific test class from plan)
3. Liquibase applies cleanly (if migration step): verify via Testcontainers integration test
4. Endpoint returns expected shape (if API step): use `curl` command from plan
5. Check each item in the step's "Expected state after completion" list

**Frontend step verification:**
1. Build passes: `pnpm build`
2. Tests pass: `pnpm test -- --run {test file}`
3. Visual verification at 375px, 768px, 1440px using Playwright (if UI step)
4. Check each item in the step's "Expected state after completion" list
5. For visual steps, use the same verification process as `/verify-with-playwright` (screenshots, computed styles, comparison)

**Mixed step verification:** Run both backend and frontend checks.

**If verification fails:**
1. Analyze and attempt one fix
2. Re-verify
3. **If still failing after one fix attempt**, stop entirely:

```text
[WARNING] Step {N} verification failed after fix attempt. Stopping execution.

Failure: {what failed and why}
Options:
1. I'll fix it manually and re-run /execute-plan-forums
2. Show me what you tried so I can guide you
3. Roll back this step
4. Restore from backup: git reset --hard {BACKUP_BRANCH}
```

**Never update the Execution Log with failing verifications. Never continue to the next step.**

### 4h: Update the Plan

**Only after all verifications pass.**

Update the Execution Log entry:
- Status: `[COMPLETE]`
- Completion Date: YYYY-MM-DD
- Notes: files created/modified, deviations from plan

### 4i: Continue

```text
— Step {N} [COMPLETE] — moving to Step {N+1} —
```

Loop back to 4a.

---

## Step 5: Final Summary

After all steps are complete:

```text
# Plan Execution Complete

All {N} steps executed successfully.

## Completed Steps
| Step | Title | Files Modified |
|------|-------|---------------|
(from Execution Log)

## Next Actions
1. Review all changes
2. Run full test suite: ./mvnw test && cd frontend && pnpm test
3. Run /code-review for final quality check
4. For UI work: /verify-with-playwright {route} for visual check
5. Commit and push when satisfied
6. Delete safety backup: git branch -D {BACKUP_BRANCH}
```

**Stop.**

---

## Rules

**Execution Model:**
- Executes all incomplete steps in one invocation
- If re-run after partial execution, picks up from first incomplete step
- **Stops immediately** on any failure, ambiguity, or plan conflict

**Git Operations — HANDS OFF:**
- **DO NOT** run `git commit`, `git push`, `git add` under any circumstances
- The user handles ALL git operations manually

**Plan Authority:**
- The plan is the source of truth — follow it precisely
- The master plan's Universal Rules are non-negotiable — check them before every step
- If the plan conflicts with reality (files don't exist, interfaces don't match), STOP and flag it
- If you need to deviate, get user approval first and document in the Execution Log

**Quality:**
- Always verify expected state before marking complete
- Backend verification (compile + test) is mandatory for every backend step
- Frontend verification (build + test + visual) is mandatory for every frontend step
- Do not delete the plan file — it serves as a record
- Before each step: re-read relevant rules fresh, do not rely on earlier context

**Error Handling:**
- Ambiguity → STOP, ask the user
- Plan contradicts codebase → STOP, flag with evidence
- Tests fail after one fix → STOP, show failure details
- Dependency not met → STOP, inform user
- Uncommitted changes from outside session → STOP, offer commit/stash/proceed

---

## See Also

- `/spec-forums` — Create spec from master plan (upstream)
- `/plan-forums` — Create implementation plan from spec (produces the plan this skill consumes)
- `/code-review` — Pre-commit quality check (run after execution completes)
- `/verify-with-playwright` — Visual verification for frontend UI steps
