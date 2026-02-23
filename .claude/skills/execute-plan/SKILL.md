---
description: Execute all steps from an implementation plan
argument-hint: Path to plan file (e.g. _plans/2026-02-21-mood-selector-page.md)
user-invokable: true
---

# execute-plan

Execute all steps from an implementation plan created by `/plan`.

User input: $ARGUMENTS

## High-Level Behavior

Read a plan file, verify assumptions, then work through each step sequentially — implementing code, creating tests, verifying expected state, and updating the Execution Log. After all steps are complete, the user reviews changes and handles git operations.

---

## Step 1: Read the Plan

Read the plan file at the path provided in `$ARGUMENTS`.

**If the file does not exist**, display:

```
Error: Plan file not found at <path>

Run /plan <spec-path> first to generate a plan, or verify the path.
```

**Stop immediately** if the file is not found.

---

## Step 2: Internalize the Plan

Before doing anything, read and internalize:

1. **Architecture Context** — Re-ground yourself in the codebase patterns, conventions, and related files documented during reconnaissance.
2. **Assumptions & Pre-Execution Checklist** — If this is the first run (no steps marked [COMPLETE] in the Execution Log), verify the checklist:
   - Display the checklist to the user
   - Ask: "Have you reviewed and confirmed these assumptions? (yes/no)"
   - **DO NOT proceed until the user confirms**
   - If the user says an assumption is wrong, **STOP** and inform them to update the plan
3. **Edge Cases & Decisions table** — Know the explicit decisions so you don't re-decide them during implementation.

---

## Step 3: Find the Starting Point

Check the **Execution Log** table. Find the first step with status `[NOT STARTED]` or `[IN PROGRESS]`.

**If all steps are `[COMPLETE]`:**

```
# Plan Complete

All steps have been executed successfully.

## Completed Steps
| Step | Title | Completion Date |
|------|-------|----------------|
(from Execution Log)

## Next Actions
1. Review all changes
2. Run full test suite
3. Commit and push when satisfied
4. Plan retained at: <plan-path>
```

**Stop.**

---

## Step 4: Execute Each Step (Loop)

For each incomplete step in order:

### 4a: Check Dependencies

Verify all dependencies (from the Step Dependency Map) are marked `[COMPLETE]`.

**If not met:** Stop and tell the user which steps need to be completed first.

### 4b: Preview the Step

Before implementing, show:

```
# Executing: Step <N> — <title>

Objective: <objective>

Files to create/modify:
- <file list>

Guardrails (DO NOT):
- <each DO NOT item>

Proceeding...
```

### 4c: Implement

Execute the step following the plan's exact specifications.

**Hierarchy of authority:**

1. **The plan's explicit instructions** — file paths, method signatures, patterns, guardrails
2. **Architecture Context** — patterns from reconnaissance
3. **CLAUDE.md and `.claude/rules/`** — project standards
4. **General best practices** — only when the above are silent

**Requirements:**

- Use exact file paths from the plan
- Follow referenced patterns — when the plan says "follow the pattern in `ExistingComponent.tsx`", read that file and match it
- Respect DO NOT guardrails — check each action against them before proceeding
- Match design specs — use exact colors, spacing, typography from the plan's Architecture Context

**If you encounter ambiguity:**
- **STOP** and ask the user. Do not guess.

**If the plan is wrong** (file doesn't exist, interface doesn't match):
- **STOP** and flag the discrepancy. Show what the plan says vs. what exists.
- Ask whether to update the plan or adapt.
- Do not silently deviate.

### 4d: Create Tests

Implement test cases specified in the plan's test specifications for this step.

- Use the naming conventions and assertion patterns from the Architecture Context
- Only create tests specified in the plan
- If you spot an obvious testing gap, implement the planned tests first, then flag the gap

### 4e: Verify Expected State

**Do this BEFORE updating the Execution Log.**

Check every item in the step's "Expected state after completion" checklist:

- Run specified test commands
- Verify the app compiles cleanly
- Check any other verification items listed

**Browser verification (for UI steps):**

If the step created or modified frontend components, pages, or routes, also verify in the browser using Playwright:

1. Start the dev server if not already running
2. Use Playwright to navigate to the relevant page/route
3. Verify the UI renders correctly — check that key elements are visible, layout is correct, and there are no console errors
4. If the step involves interactions (clicks, form inputs, navigation), test those flows
5. If the step involves responsive behavior, check at mobile and desktop breakpoints

Browser verification is a quick sanity check, not a full E2E suite. The goal is to catch obvious visual/behavioral issues that unit tests miss — broken layouts, missing elements, non-functional interactions. If something looks wrong, treat it as a verification failure.

Skip browser verification for steps that are purely backend (API, database, services) with no UI impact.

**If verification fails:**

1. Analyze and attempt one fix
2. Re-verify
3. **If still failing**, stop entirely:

```
Step <N> verification failed.

Failure: <what failed and why>

Steps completed before failure: <list>

Options:
1. I'll fix it manually and re-run /execute-plan
2. Show me what you tried so I can guide you
3. Roll back this step
```

**Never update the log with failing verifications. Never continue to the next step.**

### 4f: Update the Plan

**Only after all verifications pass.**

Update the Execution Log entry for this step:

| Field | Value |
|-------|-------|
| Status | [COMPLETE] |
| Completion Date | YYYY-MM-DD |
| Notes / Actual Files | Files created/modified, key changes, any deviations from plan |

### 4g: Continue

```
— Step <N> [COMPLETE] — moving to Step <N+1> —
```

Loop back to 4a.

---

## Step 5: Final Summary

After all steps are complete:

```
# Plan Execution Complete

All <N> steps executed successfully.

## Completed Steps
| Step | Title | Files Modified |
|------|-------|---------------|
(from Execution Log)

## Next Actions
- Review all changes
- Run full test suite
- Commit and push when satisfied
- Plan retained at: <plan-path>
```

**Stop.**

---

## Rules

**Execution Model:**
- Executes all incomplete steps in one invocation
- If re-run after partial execution, picks up from the first incomplete step
- **Stops immediately** on any failure, ambiguity, or plan conflict

**Plan Authority:**
- The plan is the source of truth — follow it precisely
- If the plan conflicts with general best practices, follow the plan
- If the plan conflicts with reality, STOP and flag it
- If you need to deviate, get user approval first and document the deviation in the Execution Log

**Quality:**
- Always verify expected state before marking complete
- Only update the Execution Log after verifications pass
- Do not delete the plan file — it serves as a record

**Error Handling:**
- Ambiguity → STOP, ask the user
- Plan contradicts codebase → STOP, flag with evidence
- Tests fail after one fix → STOP, show failure details
- Dependency not met → STOP, inform user
