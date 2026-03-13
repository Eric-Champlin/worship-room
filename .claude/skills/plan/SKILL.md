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
3. Load the Design System Reference for exact styling values
4. Generate a detailed, step-by-step implementation plan
5. Save the plan to `_plans/` as a durable artifact
 
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
5. **Test patterns** — how existing tests are structured (naming, setup, assertion style, provider wrapping)
6. **Design system** — read `.claude/rules/09-design-system.md` for component inventory, hooks, and utilities
7. **Security rules** — read `.claude/rules/02-security.md` for auth gating requirements. Identify every action in the spec that requires login and ensure the plan includes auth checks for each one.
8. **Design System Reference** — check if `_plans/recon/design-system.md` exists. If it does, read it for exact computed CSS values, color tokens, typography, spacing, and component patterns (heroes, cards, buttons, decorative elements). These exact values must be referenced in any UI step's Details section — not "match the hero" but "use `background: linear-gradient(135deg, #6D28D9 0%, #4C1D95 100%)`, font: Lora 48px/1.2 bold, color: #FFFFFF`".
9. **External Recon Report** — check if the spec references a recon report (e.g., `_plans/recon/{slug}.md`). If it does, read it for per-screen CSS Mapping Tables, Gradient tables, Vertical Rhythm tables, Image tables, Link inventories, States tables, Text Content Snapshots, and Responsive CSS Mapping Tables. These feed directly into implementation steps and are verified by `/verify-with-playwright`.
 
If the Design System Reference does not exist, note it in the Assumptions section: "No design system reference found. UI styling values are based on codebase inspection and may not be pixel-perfect. Consider running `/playwright-recon --internal` before execution."
 
**[UNVERIFIED] value marking:** When the spec introduces visual patterns not covered by any recon report or design system reference, or when a value is derived from codebase inspection rather than computed extraction, mark it as `[UNVERIFIED]` in the plan. Include a verification method and correction method for each:
 
```
[UNVERIFIED] Hero min-height: Best guess is 400px
→ To verify: Run /verify-with-playwright and compare against existing heroes
→ If wrong: Update to the value from the design system reference
```
 
`/execute-plan` displays these prominently before implementation, `/verify-with-playwright` gives them priority during comparison, and `/code-review` audits whether they were subsequently verified.
 
Document what you find — this becomes the **Architecture Context** section of the plan.
 
---
 
## Step 3: Generate the Plan
 
Create the plan file at `_plans/YYYY-MM-DD-<feature_slug>.md` using today's date and the feature slug from the spec filename.
 
Use this exact structure:
 
````markdown
# Implementation Plan: 
 
**Spec:** ``
**Date:** YYYY-MM-DD
**Branch:** 
**Design System Reference:** `_plans/recon/design-system.md` (loaded / not found)
**Recon Report:** `_plans/recon/{slug}.md` (loaded / not applicable)
 
---
 
## Architecture Context
 
 
- Relevant existing files and patterns
- Directory conventions
- Component/service patterns to follow
- Database tables involved
- Test patterns to match (including provider wrapping: AuthModalProvider, ToastProvider, etc.)
- Auth gating patterns (useAuth + useAuthModal pattern, which actions are gated)
 
---
 
## Auth Gating Checklist
 
**Every action in the spec that requires login must have an auth check in the plan.**
 
| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
|  |  | Step  | useAuth + auth modal / redirect |
 
If any spec-defined auth gate is missing from the implementation steps, this plan is incomplete.
 
---
 
## Design System Values (for UI steps)
 
**If a Design System Reference was loaded, include the exact values needed for this feature:**
 
| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Hero section | background |  | design-system.md |
| Heading | font |  | design-system.md |
| Card | box-shadow |  | design-system.md |
| Button (primary) | background |  | design-system.md |
|  |  |  |  |
 
**If no Design System Reference:** Note "Values from codebase inspection" and cite the specific file/line where each value was found.
 
This table is the executor's copy-paste reference for all styling. No guessing.
 
---
 
## Design System Reminder
 
**Project-specific quirks that `/execute-plan` displays before every UI step:**
 
- {e.g., Worship Room uses Caveat for script/highlighted headings, not Lora}
- {e.g., Squiggle backgrounds use SQUIGGLE_MASK_STYLE for fade mask}
- {e.g., All tabs share max-w-2xl container width}
- {e.g., Hero gradients use 135deg angle consistently}
 
This block is displayed verbatim by `/execute-plan` Step 4d before each UI step to prevent mid-implementation drift back to default assumptions.
 
---
 
## Responsive Structure
 
**Breakpoints and layout behavior for `/execute-plan` and `/verify-with-playwright`:**
 
| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | {e.g., single column, full-width cards, stacked sections} |
| Tablet | 768px | {e.g., 2-column grid, side padding increases} |
| Desktop | 1440px | {e.g., max-width container, 3-column grid} |
 
**Custom breakpoints (if any):** {from recon or design system — e.g., "card grid switches at 640px, not 768px"}
 
---
 
## Vertical Rhythm
 
**Expected spacing between adjacent sections (from design system recon or codebase inspection):**
 
| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| Hero → first content section | {px} | design-system.md / codebase inspection |
| Content section → next section | {px} | {source} |
| Last section → footer | {px} | {source} |
 
`/execute-plan` checks these during visual verification (Step 4g). `/verify-with-playwright` compares these in Step 6e. Any gap difference >5px is flagged as a mismatch.
 
---
 
## Assumptions & Pre-Execution Checklist
 
Before executing this plan, confirm:
 
- [ ] 
- [ ] 
- [ ] 
- [ ] All auth-gated actions from the spec are accounted for in the plan
- [ ] Design system values are verified (from reference or codebase inspection)
- [ ] All [UNVERIFIED] values are flagged with verification methods
- [ ] Recon report loaded if available (for visual verification during execution)
 
---
 
## Edge Cases & Decisions
 
| Decision | Choice | Rationale |
|----------|--------|-----------|
|  |  |  |
 
---
 
## Implementation Steps
 
### Step 1: 
 
**Objective:** 
 
**Files to create/modify:**
- `` — 
 
**Details:**
 
 
**Auth gating (if applicable):**
- 
- 
- 
 
**Responsive behavior:**
- Desktop (1440px): 
- Tablet (768px): 
- Mobile (375px): 
 
**Guardrails (DO NOT):**
- 
 
**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
|  | unit/integration |  |
|  | unit |  |
 
**Expected state after completion:**
- [ ] 
- [ ] 
- [ ] 
 
---
 
### Step 2: 
 
 
 
---
 
 
 
---
 
## Step Dependency Map
 
| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — |  |
| 2 | 1 |  |
| 3 | 1, 2 |  |
 
---
 
## Execution Log
 
| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 |  | [NOT STARTED] | | |
| 2 |  | [NOT STARTED] | | |
| 3 |  | [NOT STARTED] | | |
````
 
### Plan Quality Rules
 
- **Be specific.** Include exact file paths, method signatures, prop types, API routes, CSS classes. The executor should not need to make architectural decisions.
- **Reference existing patterns.** When a step should follow an existing pattern, cite the specific file and line range: "Follow the pattern in `src/components/daily/PrayTabContent.tsx` lines 15-40."
- **Include guardrails.** Every step should have a "DO NOT" list to prevent common mistakes — especially around Worship Room–specific concerns (AI safety, demo mode, encryption, crisis detection).
- **Keep steps small.** Each step should be independently verifiable. If a step touches more than 3 files, consider splitting it.
- **Order for safety.** Put data model and API steps before UI steps. Put shared utilities before consumers.
- **AI Safety is never optional.** If the feature involves AI-generated content, every step that touches AI output must have safety guardrails.
- **Auth gating is never optional.** Every action the spec marks as requiring login MUST have an explicit auth check in the plan. If the plan misses an auth gate, `/code-review --spec` will catch it — but it's better to get it right in the plan.
- **Responsive is never optional.** Every UI step must include responsive behavior notes for at least 3 breakpoints (mobile, tablet, desktop). If the step creates a new layout, specify how it adapts.
- **Include auth gate tests.** Every step that implements an auth-gated action must include a test that verifies the auth modal appears for logged-out users.
- **Use exact design values.** When the Design System Reference is available, use its exact values in the Details section — not "use the primary color" but "use `#6D28D9`". When citing a component pattern, include the full CSS: not "match the hero" but "use `background: linear-gradient(...)`, `padding: 3rem 0`, `text-align: center`".
- **Mark uncertain values [UNVERIFIED].** Any value not confirmed by a recon report or design system reference must be marked `[UNVERIFIED]` with a verification method. `/execute-plan` displays these prominently, `/verify-with-playwright` gives them priority scrutiny, and `/code-review` audits whether they were resolved.
- **Include vertical rhythm.** When the design system recon documents spacing between sections, include those values in the Vertical Rhythm section. `/verify-with-playwright` compares these — any gap difference >5px is a mismatch.
- **Include the Design System Reminder.** If the project has UI quirks (custom fonts, spacing scales, decorative patterns), list them in the Design System Reminder block. `/execute-plan` displays this before every UI step to prevent drift.
 
---
 
## Step 4: Final Output
 
After the plan is saved, respond with:
 
```
Plan saved: _plans/YYYY-MM-DD-<feature_slug>.md
Steps:      <N> steps
Spec:       <path to spec>
Auth gates: <N> actions gated
Design ref: loaded / not found
Recon:      loaded / not applicable
[UNVERIFIED] values: <N> (will be flagged during execution and verification)
 
Pipeline:
  1. Review the plan
  2. /execute-plan _plans/YYYY-MM-DD-<feature_slug>.md
  3. /verify-with-playwright {route} _plans/YYYY-MM-DD-<feature_slug>.md
  4. /code-review _plans/YYYY-MM-DD-<feature_slug>.md
  5. Commit when satisfied
```
 
Do not repeat the full plan in chat unless the user asks. The plan file is the artifact — point the user to it.
 
---
 
## Rules
 
- **Stay in Act mode.** Do not enter Plan Mode. You need file write access to save the plan.
- **Do not implement anything.** This command produces a plan, not code.
- **Do not modify any existing files.** Only create the new plan file.
- **Do not perform git operations.** The user handles all git operations.
- **The spec is the product authority.** If something is ambiguous in the spec, note it in "Assumptions & Pre-Execution Checklist" rather than guessing. The user resolves ambiguities before execution.
- **Security rules are mandatory.** Read `.claude/rules/02-security.md` during reconnaissance. Every auth-gated action from the spec must appear in the Auth Gating Checklist and in the relevant implementation step.
- **Design values are mandatory for UI.** If a Design System Reference exists, use its exact values. If not, cite the specific codebase file/line where you found each value.
- **[UNVERIFIED] values must be explicit.** Never silently use a guessed value. Mark it `[UNVERIFIED]` with verification and correction methods. This is how the downstream pipeline catches visual mismatches early instead of after all steps are complete.
- **Recon data flows downstream.** If a recon report exists, its CSS Mapping Tables, Gradient tables, Vertical Rhythm tables, Link inventories, States tables, and Text Content Snapshots are consumed by `/execute-plan` (visual verification checkpoints) and `/verify-with-playwright` (design compliance checks). Reference the recon report path in the plan header so downstream skills can auto-load it.
 
---
 
## See Also
 
- `/spec` — Write a feature specification (produces the spec this skill consumes)
- `/execute-plan` — Execute all steps from this plan
- `/verify-with-playwright` — Runtime UI verification (consumes this plan for context + auto-detects recon)
- `/code-review` — Pre-commit code review (cross-references this plan for compliance)
- `/playwright-recon` — Capture visual specs from live pages (`--internal` for design system, default for external recon)