---
description: Generate a Forums Wave implementation plan from a spec file
argument-hint: Path to spec file (e.g. _specs/forums/round3-phase01-spec01-backend-skeleton-audit.md)
user-invokable: true
---

# plan-forums

Generate a technical implementation plan for a **Forums Wave** spec — covering backend (Spring Boot, JPA, Liquibase, Testcontainers), frontend (React, TypeScript, Tailwind), or both. Plans are the source of truth for `/execute-plan-forums`.

User input: $ARGUMENTS

## High-Level Behavior

1. Read and internalize the spec file
2. Read the master plan's Universal Rules and relevant Decisions
3. Explore the codebase to understand existing patterns
4. Generate a detailed, step-by-step implementation plan
5. Save the plan to `_plans/forums/`

---

## Step 1: Read the Spec

Read the spec file at the path provided in `$ARGUMENTS`.

If not found, display an error and **stop immediately.**

---

## Step 2: Read the Master Plan Context

Read `_forums_master_plan/round3-master-plan.md` and extract:

1. **Universal Spec Rules** — all 17 rules. These are non-negotiable constraints on every plan.
2. **Architectural Decisions** referenced by this spec (check the spec's prereqs and body for "Decision N" references)
3. **Prerequisite specs** — read each prereq to understand what tables, services, and endpoints already exist
4. **Phase context** — read the phase header to understand the phase's overall goal and migration pattern
5. **Cross-spec dependencies** — check if other specs in the same phase reference this one

**Key master plan rules that affect every plan:**
- Rule 1: No git operations (CC never commits, pushes, or runs destructive git commands)
- Rule 3: All schema changes via Liquibase changesets (never raw SQL, never JPA ddl-auto)
- Rule 4: TypeScript types generated from OpenAPI spec (never hand-written API types)
- Rule 5: User-facing strings in Copy Deck with i18n-ready constants structure
- Rule 6: Tests mandatory for all new functionality
- Rule 7: All new `wr_*` localStorage keys documented in `11-local-storage-keys.md`
- Rule 12: Anti-pressure copy discipline (no streaks-as-shame, no FOMO, no exclamation points near vulnerability)
- Rule 13: Crisis detection on backend takes precedence over all feature behavior
- Rule 14: Plain text only for user-generated content (no HTML, no Markdown, no dangerouslySetInnerHTML)
- Rule 15: Rate limiting on ALL write AND read endpoints with standard headers
- Rule 17: Per-phase cutover specs require accessibility smoke test evidence

---

## Step 3: Codebase Reconnaissance

Explore the codebase to ground the plan in reality. **Prioritize in this order:**

1. **The spec itself** — what needs to be built
2. **Master plan context** — Universal Rules, Decisions, prereqs
3. **`.claude/rules/03-backend-standards.md`** — API contract, Spring Boot conventions, Liquibase standards
4. **`.claude/rules/05-database.md`** — schema, table definitions, naming conventions
5. **`.claude/rules/02-security.md`** — JWT, rate limiting, auth patterns
6. **`.claude/rules/06-testing.md`** — test patterns, Testcontainers setup
7. **Existing backend code** — `backend/src/main/java/com/worshiproom/` for established patterns
8. **Existing frontend code** — `frontend/src/` for dual-write patterns, hooks, components
9. **Existing Liquibase changesets** — `backend/src/main/resources/db/changelog/` for naming and ordering
10. **Existing tests** — `backend/src/test/` and `frontend/__tests__/` for test structure patterns

**For backend-heavy specs, discover:**
- Project structure and package conventions
- Existing JPA entity patterns (annotations, relationships, constructors)
- Existing service patterns (constructor injection, transaction management)
- Existing controller patterns (request/response DTOs, validation, error handling)
- Existing repository patterns (custom queries, Spring Data conventions)
- Existing Liquibase changeset naming and ordering
- Existing integration test patterns (Testcontainers setup, test data seeding)

**For frontend-heavy specs, discover:**
- Component patterns, hook patterns, dual-write patterns
- Design system tokens from `.claude/rules/09-design-system.md`
- If `_plans/recon/design-system.md` exists, load it for exact CSS values

Document what you find — this becomes the **Architecture Context** section.

---

## Step 4: Generate the Plan

Create the plan file at `_plans/forums/YYYY-MM-DD-<spec-id>.md`.

Use this structure:

````markdown
# Forums Wave Plan: Spec {number} — {title}

**Spec:** `{spec file path}`
**Master Plan:** `_forums_master_plan/round3-master-plan.md` → Spec {number}
**Date:** YYYY-MM-DD
**Branch:** {branch name}
**Phase:** {phase number}
**Size:** {S/M/L}
**Risk:** {level}

---

## Universal Rules Checklist

Before implementing, confirm this plan respects:
- [ ] Rule 1: No git operations by CC
- [ ] Rule 3: Liquibase filenames follow `YYYY-MM-DD-NNN-description.xml`
- [ ] Rule 4: OpenAPI spec updated and frontend types regenerated (if API changes)
- [ ] Rule 5: Constants use i18n-ready structure (if user-facing text)
- [ ] Rule 6: Tests written for all new functionality
- [ ] Rule 12: Anti-pressure copy discipline (if spec has user-facing text)
- [ ] Rule 13: Crisis detection supersession (if spec touches vulnerable content)
- [ ] Rule 14: Plain text only for user-generated content
- [ ] Rule 15: Rate limiting on all endpoints with standard headers
- [ ] Rule 17: Accessibility smoke test (if this is a cutover spec)
- [ ] {Other relevant rules for this specific spec}

---

## Architecture Context

{From reconnaissance:}
- Relevant existing files and patterns
- Package structure and naming conventions
- JPA entity patterns (if backend)
- Service/controller patterns (if backend)
- Component/hook patterns (if frontend)
- Dual-write patterns (if migration spec)
- Test patterns to match
- Database tables involved (existing and new)

---

## Database Changes (if applicable)

| Change | Table | Liquibase Changeset | Notes |
|--------|-------|-------------------|-------|
| CREATE TABLE | {table} | `{filename}.xml` | {schema summary} |
| ALTER TABLE | {table} | `{filename}.xml` | {what changes} |
| CREATE INDEX | {table} | included in above | {index columns and rationale} |

**Migration safety:** {zero-downtime compatible? rollback strategy?}

---

## API Changes (if applicable)

| Method | Endpoint | Auth | Rate Limit | Request Body | Response |
|--------|----------|------|-----------|-------------|----------|
| POST | `/api/v1/...` | Required | {N/period} | `{shape}` | `{shape}` |

---

## Assumptions & Pre-Execution Checklist

- [ ] Prerequisite specs are complete and committed: {list prereqs}
- [ ] Docker is running (PostgreSQL + Redis if needed)
- [ ] Backend compiles cleanly: `./mvnw compile`
- [ ] Frontend builds cleanly: `pnpm build` (if frontend changes)
- [ ] No Liquibase changeset filename collisions with existing changesets
- [ ] {Spec-specific assumptions}

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| {decision} | {choice} | {why} |

---

## Implementation Steps

### Step 1: {title}

**Objective:** {what this step accomplishes}

**Files to create/modify:**
- `{path}` — {what and why}

**Details:**
{Exact implementation details — method signatures, class structure, SQL schemas, component props. No ambiguity.}

**Guardrails (DO NOT):**
- {each guardrail from the spec or Universal Rules}

**Verification (backend steps):**
- [ ] Code compiles: `./mvnw compile`
- [ ] Tests pass: `./mvnw test` (or specific test class)
- [ ] Liquibase applies cleanly (if migration step)
- [ ] Endpoint returns expected shape (if API step): `curl` command provided
- [ ] {Step-specific verification items}

**Verification (frontend steps):**
- [ ] Build passes: `pnpm build`
- [ ] Tests pass: `pnpm test -- --run {test file}`
- [ ] Visual verification at 375px, 768px, 1440px (if UI step)
- [ ] {Step-specific verification items}

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| {name} | unit / integration | {what it verifies} |

**Expected state after completion:**
- [ ] {specific verifiable outcome}

---

### Step 2: {title}

{same structure}

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | {title} |
| 2 | 1 | {title} |

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | {title} | [NOT STARTED] | | |
| 2 | {title} | [NOT STARTED] | | |
````

---

## Plan Quality Self-Review Checklist

**Before saving, verify ALL of these:**

1. [ ] Every step has: exact file paths, method signatures, DO NOT guardrails, test specs, verification commands
2. [ ] **No tentative language** — no "should probably", "might want to", "consider doing"
3. [ ] Patterns match what was found in reconnaissance, not assumed from general knowledge
4. [ ] Universal Rules checklist populated with rules relevant to this spec
5. [ ] Every Liquibase changeset filename is unique (checked against existing changesets in `db/changelog/`)
6. [ ] Every API endpoint follows the standard response shape from `03-backend-standards.md`
7. [ ] Backend verification includes compile + test commands for every backend step
8. [ ] Frontend verification includes build + test + visual check for every frontend step
9. [ ] Steps are small — each touches ≤3 files and is independently verifiable
10. [ ] Steps are ordered for safety — database migrations before services, services before controllers, backend before frontend
11. [ ] Test count calibrated to complexity (simple utility: 2-4; complex service with edge cases: 10-15)
12. [ ] Edge Cases & Decisions table populated
13. [ ] No deprecated patterns introduced (check `09-design-system.md` § "Deprecated Patterns" for frontend steps)

---

## Step 5: Final Output

```text
Plan saved:   _plans/forums/YYYY-MM-DD-{spec-id}.md
Steps:        {N} steps
Spec:         {spec file path}
Phase:        {phase number}
Backend steps: {N}
Frontend steps: {N}
Database changes: {N} tables created/altered
API endpoints: {N} new/modified
Tests planned: {N}

Pipeline:
  1. Review the plan
  2. /execute-plan-forums _plans/forums/YYYY-MM-DD-{spec-id}.md
  3. /code-review (when all steps complete)
  4. /verify-with-playwright {route} (if spec has frontend UI)
  5. Commit when satisfied
```

---

## Rules

- **Stay in Act mode.** Do not enter Plan Mode.
- **Do not implement anything.** This produces a plan, not code.
- **Do not modify any existing files.** Only create the plan file.
- **Do not perform git operations.** User handles all git operations manually.
- **No tentative language.** Every decision must be explicit.
- **The master plan is the product authority.** Universal Rules and Decisions are non-negotiable.
- **The spec is the feature authority.** If ambiguous, note in Assumptions rather than guessing.
- **Both frontend and backend are expected.** Plans may include Liquibase migrations, Spring Boot services, React components, and Playwright tests all in one plan. Order steps for safety: DB first, backend second, frontend third, tests alongside each.
- **Backend verification is mandatory.** Every backend step must include `./mvnw compile` and `./mvnw test` verification. No silent skipping.
- **Liquibase uniqueness is critical.** Check existing changesets before assigning new filenames. Collisions crash the app on deploy.

---

## See Also

- `/spec-forums` — Create spec from master plan (produces the spec this skill consumes)
- `/execute-plan-forums` — Execute all steps from this plan
- `/code-review` — Pre-commit quality check
- `/verify-with-playwright` — Visual verification for frontend UI steps
