---
description: Execute all steps from an implementation plan
argument-hint: Path to plan file (e.g. _plans/2026-03-03-daily-experience.md)
user-invokable: true
---

# execute-plan

Execute all steps from an implementation plan created by `/plan`.

User input: $ARGUMENTS

## High-Level Behavior

Read a plan file, verify assumptions, then work through each step sequentially — implementing code, creating tests, performing visual verification on UI steps, verifying expected state, and updating the Execution Log. After all steps are complete, the user reviews changes and handles git operations.

**CRITICAL:** This command does NOT commit, push, or perform any git operations. The user handles all git operations manually.

**CRITICAL:** If any step fails verification or encounters a conflict, STOP immediately. Do not continue to the next step.

---

## Step 1: Read the Plan

Read the plan file at the path provided in `$ARGUMENTS`.

**If the file does not exist:**

```
Error: Plan file not found at <path>

Run /plan <spec-path> first to generate a plan, or verify the path.
```

**Stop immediately.**

---

## Step 2: Internalize the Plan

Before doing anything, read and internalize:

1. **Architecture Context** — Re-ground yourself in the codebase patterns, conventions, and related files documented during reconnaissance. If a Design Context section is present (from Figma or recon), internalize the exact design specifications — these are your source of truth for UI implementation.

2. **Design System Reference** — Check if `_plans/recon/design-system.md` exists. If it does, read it and internalize the full design system: color tokens, typography scale, spacing values, component patterns (hero, card, button, section, decorative elements), and the CSS Mapping Table. **This is the single source of truth for all UI styling.** When the plan says "match the existing hero" or "use the same card style," look up the exact computed values from this file — do NOT inspect other components at build time or guess. If the design system file does not exist, proceed without it but flag to the user: "No design system reference found at `_plans/recon/design-system.md`. Consider running `/playwright-recon --internal` to generate one for more accurate UI implementation."

3. **Assumptions & Pre-Execution Checklist** — If this is the first run (no steps marked [COMPLETE] in the Execution Log), verify the checklist:
   - Display the checklist to the user
   - Ask: "Have you reviewed and confirmed these assumptions? (yes/no)"
   - **DO NOT proceed until the user confirms**
   - If the user says an assumption is wrong, **STOP** and inform them to update the plan

4. **Edge Cases & Decisions table** — Know the explicit decisions so you don't re-decide them during implementation.

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

### 4a: Pre-Execution Safety Check

**CRITICAL: Before executing ANY step that modifies or reverts files, check for uncommitted changes:**

```bash
git status --porcelain
```

**If there are uncommitted changes:**

```text
⚠️  UNCOMMITTED CHANGES DETECTED

The following files have uncommitted changes:
- {file list}

The plan may include operations that overwrite files.

Options:
1. Commit current changes first (recommended): git add -A && git commit -m "WIP: save progress"
2. Stash changes: git stash push -m "pre-plan-execution"
3. Proceed anyway (may lose uncommitted work)

Which option? (1/2/3)
```

**NEVER run file-reverting commands on files with uncommitted changes without explicit user approval.** Wait for the user to choose.

**If no uncommitted changes:** Proceed normally.

### 4b: Check Dependencies

Verify all dependencies (from the Step Dependency Map) are marked `[COMPLETE]`.

**If not met:** Stop and tell the user which steps need to be completed first.

### 4c: Preview the Step

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

### 4d: Design System Reminder (UI steps only)

**Before implementing any step that touches UI, check the plan for a "Design System Reminder" block.** If present, display it:

```text
⚠️  DESIGN SYSTEM REMINDER:
- {quirk 1, e.g., Worship Room uses Caveat for script headings, not Lora}
- {quirk 2, e.g., Squiggle backgrounds use SQUIGGLE_MASK_STYLE for fade mask}
- {quirk 3, e.g., All tabs share max-w-2xl container width}

All styling for this step must account for these patterns.
```

Also reference the Design System Reference (`_plans/recon/design-system.md`) if loaded in Step 2. Use exact values from it — do not approximate.

**If no Design System Reminder in the plan:** Skip this sub-step.

### 4e: Implement

Execute the step following the plan's exact specifications.

**Hierarchy of authority:**

1. **The plan's explicit instructions** — file paths, method signatures, patterns, guardrails
2. **Design System Reference** (`_plans/recon/design-system.md`) — exact computed CSS values, color tokens, typography, component patterns
3. **Architecture Context** — patterns from reconnaissance
4. **CLAUDE.md and `.claude/rules/`** — project standards
5. **General best practices** — only when the above are silent

**Requirements:**

- Use exact file paths from the plan
- Follow referenced patterns — when the plan says "follow the pattern in `ExistingComponent.tsx`", read that file and match it
- Respect DO NOT guardrails — check each action against them before proceeding
- Match design specs — use exact colors, spacing, typography from the Design System Reference or plan's Architecture Context. Do not approximate.
- Match test patterns — use the same naming, assertion style, and setup patterns from Architecture Context

**Logging best practices:**
- Don't fetch additional data just for logging
- Log only essential information already available
- Keep log statements concise and informative

**If you encounter ambiguity:**
- **STOP** and ask the user. Do not guess.

**If the plan is wrong** (file doesn't exist, interface doesn't match):
- **STOP** and flag the discrepancy. Show what the plan says vs. what exists.
- Ask whether to update the plan or adapt.
- Do not silently deviate.

### 4f: Create Tests

Implement test cases specified in the plan's test specifications for this step.

- Use the naming conventions and assertion patterns from the Architecture Context
- Use constants for test data (group by context, alphabetize within groups)
- Only create tests specified in the plan
- If you spot an obvious testing gap, implement the planned tests first, then flag the gap

**Repository tests (if specified):**
- Use SQL INSERT statements from the plan for test data setup
- Set up foreign key dependencies in the order specified

**Integration tests (if specified):**
- Use exact test data setup from the plan
- Use appropriate stubbing for external HTTP services
- Reuse test contexts to keep tests fast

### 4g: Visual Verification Checkpoint (UI steps only)

**CRITICAL: For any step that creates or modifies a UI component, perform visual verification BEFORE moving to the next step. Do NOT batch visual checks at the end.**

This applies when:
- The step creates a new React component
- The step modifies styling, layout, or spacing
- The step changes any visible UI element
- The plan references a recon report or design specs

**Verification process:**

1. Start the dev server if not already running
2. **Screenshot the built component at multiple breakpoints** using Playwright. Use breakpoints from the plan's Responsive Structure section, or defaults: 375px, 768px, 1440px.
3. **Compare against the recon report screenshots** for that component (if available)
4. **Extract computed styles** and compare against the CSS Mapping Table from the Design System Reference (if available):

```text
## Visual Verification: Step  — 

| Element | Property | Expected Value | Built Value | Match? |
|---------|----------|---------------|-------------|--------|
| {elem}  | {prop}   | {expected}    | {actual}    | YES/NO |
```

5. **If all values match:** Proceed to 4h
6. **If mismatches found:**
   - Fix using exact values from the CSS Mapping Table
   - Re-screenshot and re-compare
   - After **two failed fix attempts**, STOP entirely:

```text
[WARNING] Visual verification failed for Step  after 2 fix attempts.

Mismatches remaining:
| Element | Property | Expected | Actual |
|---------|----------|----------|--------|
| {elem}  | {prop}   | {val}    | {val}  |

Options:
1. I'll fix it manually and re-run /execute-plan
2. Show me the component code so I can guide you
3. Skip visual verification and continue (not recommended)
```

**If no recon report or Design System Reference exists:** Do a basic browser sanity check instead — navigate to the page, verify key elements are visible, layout is correct, no console errors, interactions work. Check at mobile and desktop. This catches obvious visual/behavioral issues that unit tests miss.

**Skip visual verification for purely backend steps with no UI impact.**

### 4h: Verify Expected State

**Do this BEFORE updating the Execution Log.**

Check every item in the step's "Expected state after completion" checklist:

- Run specified test commands
- Verify the app compiles cleanly (`pnpm build` for frontend, `./mvnw compile` for backend)
- Check any other verification items listed

**If verification fails:**

1. Analyze and attempt one fix
2. Re-verify all items
3. **If still failing**, stop entirely:

```text
Step  verification failed.

Failure: 

Rollback notes: 
Steps completed before failure: 

Options:
1. I'll fix it manually and re-run /execute-plan
2. Show me what you tried so I can guide you
3. Roll back this step
```

**Never update the log with failing verifications. Never continue to the next step.**

### 4i: Update the Plan

**Only after all verifications pass.**

Update the Execution Log entry for this step:

| Field | Value |
|-------|-------|
| Status | [COMPLETE] |
| Completion Date | YYYY-MM-DD |
| Notes / Actual Files | Files created/modified, key changes, any deviations from plan |

If the actual implementation deviated from the plan in any way, document the deviation in the Notes column so the plan remains an accurate record.

### 4j: Continue

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
- Run full test suite: pnpm test
- Run /code-review for final quality check
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

**Git Operations — HANDS OFF:**
- **DO NOT** run `git commit` under any circumstances
- **DO NOT** run `git push` under any circumstances
- **DO NOT** run `git add` under any circumstances
- **DO NOT** perform any git operations whatsoever
- The user handles ALL git operations manually after reviewing code changes

**Plan Authority:**
- The plan is the source of truth — follow it precisely
- If the plan conflicts with general best practices, follow the plan (it was written with codebase-specific knowledge)
- If the plan conflicts with reality (files don't exist, interfaces don't match), STOP and flag it
- If you need to deviate, get user approval first and document the deviation in the Execution Log

**Quality:**
- Always verify expected state before marking complete
- Only update the Execution Log after verifications pass
- Do not delete the plan file — it serves as a record
- For UI steps: visual verification is mandatory, not optional

**Error Handling:**
- Ambiguity → STOP, ask the user
- Plan contradicts codebase → STOP, flag with evidence
- Tests fail after one fix → STOP, show failure details
- Visual verification fails after two fixes → STOP, surface mismatches
- Dependency not met → STOP, inform user
- Uncommitted changes detected → STOP, offer commit/stash/proceed options

**Philosophy:** The plan was carefully crafted with full codebase reconnaissance. Trust it. Follow it precisely. Flag conflicts rather than improvising. Quality over speed — each step should be production-ready code.