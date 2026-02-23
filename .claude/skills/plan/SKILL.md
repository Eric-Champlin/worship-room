---
description: Generate an implementation plan from a spec file
argument-hint: Path to spec file (e.g. _specs/mood-selector-page.md)
user-invokable: true
---

You are generating a technical implementation plan for **Worship Room** — a Christian emotional healing and worship web application built with React 18 + TypeScript (Vite), Spring Boot (Java), TailwindCSS, and PostgreSQL.

User input: $ARGUMENTS

## High-Level Behavior

Your job is to:

1. Read and internalize a spec file
2. Explore the codebase to understand existing patterns, components, and architecture
3. Generate a detailed, step-by-step implementation plan
4. Save the plan to `_plans/` as a durable artifact

The plan is the source of truth for `/execute-plan`. It must be precise enough that execution requires no improvisation.

---

## Step 1: Read the Spec

Read the spec file at the path provided in `$ARGUMENTS`.

**If the file does not exist**, display:

```
Error: Spec file not found at <path>

Run /spec <feature idea> first to generate a spec, or verify the path.
```

**Stop immediately** if the file is not found.

---

## Step 2: Codebase Reconnaissance

Before writing any plan, explore the codebase to ground your plan in reality. Discover:

1. **Project structure** — directory layout, key directories, where components/services/routes live
2. **Existing patterns** — how existing features are built (component structure, API patterns, state management, styling approach)
3. **Related files** — any existing code that this feature will extend, modify, or interact with
4. **Database schema** — relevant tables from `.claude/rules/05-database.md` and any existing migrations
5. **Test patterns** — how existing tests are structured (naming, setup, assertion style)
6. **Design system** — colors, typography, breakpoints, and component patterns from `CLAUDE.md`

Document what you find — this becomes the **Architecture Context** section of the plan.

---

## Step 3: Generate the Plan

Create the plan file at `_plans/YYYY-MM-DD-<feature_slug>.md` using today's date and the feature slug from the spec filename.

Use this exact structure:

````markdown
# Implementation Plan: <Feature Title>

**Spec:** `<path to spec file>`
**Date:** YYYY-MM-DD
**Branch:** <current branch name>

---

## Architecture Context

<What you discovered during reconnaissance. Include:>
- Relevant existing files and patterns
- Directory conventions
- Component/service patterns to follow
- Database tables involved
- Test patterns to match

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] <assumption about current state of codebase>
- [ ] <assumption about dependencies or prerequisites>
- [ ] <assumption about design decisions>

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| <decision point> | <what we're doing> | <why> |

---

## Implementation Steps

### Step 1: <Title>

**Objective:** <what this step accomplishes>

**Files to create/modify:**
- `<file path>` — <what changes>

**Details:**
<Specific instructions: method signatures, component props, API endpoints, database queries, etc.>

**Guardrails (DO NOT):**
- <thing to avoid for this step>

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| <test name> | unit/integration | <what it verifies> |

**Expected state after completion:**
- [ ] <verification item — e.g. "tests pass", "page renders", "API returns 200">

---

### Step 2: <Title>

<Same structure as Step 1>

---

<Repeat for all steps>

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | <title> |
| 2 | 1 | <title> |
| 3 | 1, 2 | <title> |

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | <title> | [NOT STARTED] | | |
| 2 | <title> | [NOT STARTED] | | |
| 3 | <title> | [NOT STARTED] | | |
````

### Plan Quality Rules

- **Be specific.** Include exact file paths, method signatures, prop types, API routes, CSS classes. The executor should not need to make architectural decisions.
- **Reference existing patterns.** When a step should follow an existing pattern, cite the specific file and line range: "Follow the pattern in `src/components/MoodCard.tsx` lines 15-40."
- **Include guardrails.** Every step should have a "DO NOT" list to prevent common mistakes — especially around Worship Room–specific concerns (AI safety, demo mode, encryption, crisis detection).
- **Keep steps small.** Each step should be independently verifiable. If a step touches more than 3 files, consider splitting it.
- **Order for safety.** Put data model and API steps before UI steps. Put shared utilities before consumers.
- **AI Safety is never optional.** If the feature involves AI-generated content, every step that touches AI output must have safety guardrails.

---

## Step 4: Final Output

After the plan is saved, respond with:

```
Plan saved: _plans/YYYY-MM-DD-<feature_slug>.md
Steps:      <N> steps
Spec:       <path to spec>

Review the plan, then run: /execute-plan _plans/YYYY-MM-DD-<feature_slug>.md
```

Do not repeat the full plan in chat unless the user asks. The plan file is the artifact — point the user to it.

---

## Rules

- **Stay in Act mode.** Do not enter Plan Mode. You need file write access to save the plan.
- **Do not implement anything.** This command produces a plan, not code.
- **Do not modify any existing files.** Only create the new plan file.
- **Do not perform git operations.** The user already has a branch from `/spec`.
- **The spec is the product authority.** If something is ambiguous in the spec, note it in "Assumptions & Pre-Execution Checklist" rather than guessing. The user resolves ambiguities before execution.
