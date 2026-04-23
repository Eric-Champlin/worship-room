---
description: Create a Forums Wave spec file and branch from a master plan spec reference
argument-hint: Spec content or identifier (e.g. "Spec 1.1 — Backend Skeleton Audit" or full spec text)
user-invokable: true
---

# spec-forums

Create a Forums Wave feature spec file and git branch. Forums Wave specs originate from the master plan at `_forums_master_plan/round3-master-plan.md` — this skill receives pre-written spec content (typically prepared by the user from Claude Desktop), validates it, enriches it with codebase context, and saves it as a standalone spec file ready for `/plan-forums`.

User input: $ARGUMENTS

## High-Level Behavior

1. Parse the input to identify the spec (full content or identifier)
2. Create a safe git branch
3. Read project context (CLAUDE.md, rules, master plan)
4. Save the spec to `_specs/forums/` as a standalone file
5. Print a summary pointing to `/plan-forums`

---

## Step 1: Check the Current Branch

Check the current Git branch. **Abort** if there are uncommitted, unstaged, or untracked files. Tell the user to commit or stash first. **DO NOT proceed.**

---

## Step 2: Parse the Arguments

From `$ARGUMENTS`, extract:

**If full spec content is provided** (contains `### Spec` or `**ID:**`):
- Extract the spec number and title from the heading
- Use the content as-is for the spec body

**If only a spec identifier is provided** (e.g., "Spec 1.1", "1.1", "Backend Skeleton Audit"):
- Read `_forums_master_plan/round3-master-plan.md`
- Find the matching spec section
- Extract the full spec content from the master plan

**Derive from the spec:**
- `spec_number` — e.g., `1.1`, `2.5.4b`, `10.7b`
- `spec_title` — e.g., "Backend Skeleton Audit"
- `spec_id` — from the `**ID:**` field (e.g., `round3-phase01-spec01-backend-skeleton-audit`). This is the CANONICAL identifier used inside the spec file for cross-referencing between specs and the master plan. Preserve it verbatim.
- `spec_filename` — short form derived from `spec_number` by replacing dots with hyphens and prefixing with `spec-` (e.g., `1.1` → `spec-1-1`, `2.5.4b` → `spec-2-5-4b`, `10.7b` → `spec-10-7b`). This is the FILENAME stem used for the on-disk file; it keeps paths short and greppable. The canonical `spec_id` is preserved inside the file body for traceability.
- `feature_slug` — derived from `spec_filename` (e.g., `forums-spec-1-1`)
- `branch_name` — `claude/forums/<feature_slug>`

**`--from-branch` flag** (optional): If present, branch from the current branch instead of `main`.

---

## Step 3: Switch to a New Git Branch

**Default behavior (no `--from-branch`):**
```bash
git checkout main && git pull
```
Then create the new branch. If the branch name is taken, append `-01`, `-02`, etc.

**With `--from-branch`:**
Stay on current branch and create from it. Display:
```text
Branching from: {current branch} (--from-branch mode)
New branch: {branch_name}
```

---

## Step 4: Read Existing Context

**Mandatory context (always read):**

1. **CLAUDE.md** — project overview, current state, Forums Wave section
2. **`_forums_master_plan/round3-master-plan.md`** — the master plan. Read the following sections:
   - **Universal Spec Rules** (all 17 rules) — these apply to EVERY spec
   - **Architectural Decisions** that are referenced in this spec's prerequisites or body
   - **The spec's own section** (if looking up by identifier)
   - **The spec's prerequisites** — read each prereq spec to understand what already exists
3. **`_forums_master_plan/spec-tracker.md`** — verify prerequisite specs are marked ✅ (complete) before creating this spec. If any listed prereq is still ⬜ (not started) or ⏳ (in progress), warn the user but don't block — Eric may be intentionally working out of order.
4. **`.claude/rules/03-backend-standards.md`** — Spring Boot conventions, API contract, Liquibase standards
5. **`.claude/rules/05-database.md`** — schema, table definitions, index patterns
6. **`.claude/rules/02-security.md`** — auth gating, JWT, rate limiting, input validation

**Conditionally mandatory (read if the spec touches the area):**

7. **`.claude/rules/06-testing.md`** — when the spec includes test specifications
8. **`.claude/rules/07-logging-monitoring.md`** — when the spec involves error tracking or structured logging
9. **`.claude/rules/08-deployment.md`** — when the spec involves env vars or deployment config
10. **`.claude/rules/09-design-system.md`** — when the spec touches frontend UI
11. **`.claude/rules/11-local-storage-keys.md`** — when the spec involves localStorage or dual-write

**Codebase reconnaissance (always do):**

12. **Existing code in `backend/` and `frontend/`** — understand what's already built so the spec references real files and patterns
13. **Previous Forums Wave specs in `_specs/forums/`** — match depth, tone, and format of specs already written

---

## Step 5: Save the Spec

Create the directory if needed: `_specs/forums/`

Save the spec to `_specs/forums/<spec_filename>.md` (e.g., `_specs/forums/spec-1-1.md`). The full canonical `spec_id` lives inside the file body in the `**ID:**` field — the filename is the short form for path brevity, the body retains the master plan's canonical ID for cross-referencing.

**Spec file structure** — the master plan already defines the template. The spec file should contain the full spec as extracted from the master plan, with these additions at the top:

```markdown
# Forums Wave: Spec {number} — {title}

**Master Plan Reference:** `_forums_master_plan/round3-master-plan.md` → Spec {number}
**Branch:** `{branch_name}`
**Date:** YYYY-MM-DD

---

## Affected Frontend Routes

{Derive this from the spec content. List the user-facing routes this spec touches — one per line as backtick-wrapped markdown bullets. The `/verify-with-playwright` skill reads this section when invoked plan-only (e.g., `/verify-with-playwright _plans/forums/...md`) and uses these routes to drive UI verification. If the spec is purely backend with no frontend changes, write "N/A — backend-only spec" and omit the bullets. The plan generated from this spec should inherit this section unchanged.}

- `/route-1`
- `/route-2?tab=variant`

---

{Full spec content from master plan}
```

**The master plan spec template includes these sections** (preserve all that exist):
- ID, Size, Risk, Prerequisites, Goal
- Approach
- Files to create / Files to modify
- Database changes (Liquibase changesets)
- API changes (endpoints)
- Copy Deck
- Anti-Pressure Copy Checklist
- Anti-Pressure Design Decisions
- Acceptance criteria
- Testing notes
- Notes for plan phase recon
- Out of scope
- Out-of-band notes for Eric

**Do NOT rewrite the spec content.** The master plan specs were carefully authored. Save them as-is with the header additions above. If the spec is thin (some early-phase specs are 1-2KB), note it but don't pad — `/plan-forums` will do the codebase reconnaissance needed to fill implementation gaps.

---

## Step 6: Self-Review Checklist

Before saving:

- [ ] Spec ID matches the master plan exactly
- [ ] All prerequisite specs are listed
- [ ] Universal Rules referenced where relevant
- [ ] Database changes include Liquibase changeset filenames
- [ ] API changes include endpoint paths and HTTP methods
- [ ] Acceptance criteria are present and testable
- [ ] Out of scope section exists
- [ ] **Affected Frontend Routes** section populated — either with the actual user-facing routes touched by this spec (one per line, backtick-wrapped, including query params), or with "N/A — backend-only spec" if no UI is involved. Required for `/verify-with-playwright` plan-only invocation downstream.

---

## Step 7: Final Output

```text
Branch:     {branch_name}
Spec file:  _specs/forums/{spec_filename}.md
Title:      Spec {number} — {title}
Phase:      {phase number}
Size:       {S/M/L from spec}
Risk:       {risk level from spec}
Prerequisites: {list}
Branched from: {main / current branch}

Next step: Run /plan-forums _specs/forums/{spec_filename}.md
```

---

## Rules

- **Stay in Act mode.** Do not enter Plan Mode.
- **Do not implement anything.** This command saves a spec, not code.
- **Do not generate a plan.** That's `/plan-forums`'s job.
- **Do not perform git operations beyond the branch switch in Step 3.**
- **Do not rewrite master plan content.** The specs are authored; save them faithfully.
- **The master plan is the authority.** If something seems wrong in the spec, flag it rather than "fixing" it.
- **Both frontend and backend content is expected.** Forums Wave specs may include React components, Spring Boot services, Liquibase migrations, or all three. Do not assume backend-only.

---

## See Also

- `/plan-forums` — Create implementation plan from this spec (next step)
- `/execute-plan-forums` — Execute all steps from a generated plan
- `/code-review` — Pre-commit quality check
- `/verify-with-playwright` — Visual verification (for specs with frontend UI)
- `/playwright-recon` — Capture visual specs (for specs with frontend UI)
