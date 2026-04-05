---
description: Create a feature spec file and branch from a short idea
argument-hint: Short feature description (optionally --from-branch to branch from current instead of main)
user-invokable: true
---
 
You are helping to spin up a new feature spec for **Worship Room** — a Christian emotional healing and worship web application. Always adhere to the rules and requirements in `CLAUDE.md` and `.claude/rules/` when generating spec content.
 
User input: $ARGUMENTS
 
## High-Level Behavior
 
Your job is to turn the user input above into:
 
1. A human-friendly feature title in kebab-case (e.g. `mood-selector-page`)
2. A safe git branch name not already taken (e.g. `claude/feature/mood-selector-page`)
3. A detailed markdown spec file under the `_specs/` directory
 
Then save the spec file to disk and print a short summary of what you did.
 
---
 
## Step 1: Check the Current Branch
 
Check the current Git branch. **Abort this entire process** if there are any uncommitted, unstaged, or untracked files in the working directory. Tell the user to commit or stash their changes before proceeding, and **DO NOT GO ANY FURTHER**.
 
---
 
## Step 2: Parse the Arguments
 
From `$ARGUMENTS`, extract:
 
**`feature_title`**
- Short, human-readable title in Title Case
- Example: `"Landing Page Hero Section"`
 
**`feature_slug`**
- Git-safe slug
- Rules: lowercase, kebab-case, only `a-z 0-9 -`, replace spaces/punctuation with `-`, collapse multiple `-`, trim leading/trailing `-`, max 40 characters
- Example: `landing-page-hero`
 
**`branch_name`**
- Format: `claude/feature/<feature_slug>`
- Example: `claude/feature/landing-page-hero`
 
**`--from-branch` flag** (optional):
- If present: branch from the **current branch** instead of `main`. Used for sequential specs that build on each other (e.g., Specs 1-16 of a multi-spec feature where each spec depends on the previous).
- If absent: default behavior — checkout `main` and pull before branching.
 
If you cannot infer a sensible `feature_title` and `feature_slug` from `$ARGUMENTS`, ask the user to clarify instead of guessing.
 
---
 
## Step 3: Switch to a New Git Branch
 
**Default behavior (no `--from-branch`):**
 
Before writing any content, switch to the default branch and pull latest:
 
```bash
git checkout main && git pull
```
 
Then create and switch to a new Git branch using the `branch_name` derived from `$ARGUMENTS`. If the branch name is already taken, append a version number: e.g. `claude/feature/landing-page-hero-01`.
 
**With `--from-branch` flag:**
 
Stay on the current branch and create the new branch from it:
 
```bash
CURRENT_BRANCH=$(git branch --show-current)
git checkout -b <branch_name>
```
 
Display:
```text
Branching from: {current branch} (--from-branch mode)
New branch: {branch_name}
```
 
This is intended for sequential multi-spec features where each spec builds on the previous. The user is responsible for ensuring the current branch has all prerequisite code committed.
 
---
 
## Step 4: Read Existing Context
 
**Before drafting the spec, read the following to understand the current state of the project.** Items are listed in priority order. Items 1-3 are mandatory for every spec. Items 4-5 are conditionally mandatory — read them if the spec touches the relevant area. Items 6-9 are conditional — read them when applicable, skip gracefully when they don't exist.
 
**Mandatory context (always read):**
 
1. **CLAUDE.md** — project overview, feature list, navigation structure, routes, implementation phases. Understand what's already built and what's planned.
2. **`.claude/rules/02-security.md`** — auth gating requirements. Know which actions require login so the spec can explicitly define auth behavior for every interactive element.
3. **`.claude/rules/09-design-system.md`** — component inventory, color palette, typography, hooks. Know what shared components already exist so the spec can reference them (e.g., "use the existing PageHero component" or "use the same auth modal pattern as Prayer Wall").
 
**Conditionally mandatory context (read if the spec touches the relevant area):**
 
4. **`.claude/rules/10-ux-flows.md`** — read when the spec touches navigation, cross-feature integration, auth gating flows, or Daily Hub/Dashboard UX. This file documents every major user flow and the canonical navigation structure. Skipping it when relevant leads to specs that invent parallel flows or contradict existing navigation.
5. **`.claude/rules/11-local-storage-keys.md`** — read when the spec touches localStorage reads/writes, completion tracking, or any user data persistence. This file is the canonical list of active `wr_*` keys and their shapes. Skipping it when relevant leads to specs that invent new keys conflicting with existing ones.
 
**Conditional context (read when applicable, skip when absent):**
 
6. **`.claude/rules/01-ai-safety.md`** — crisis detection rules. Read this if the feature involves user text input. If the file doesn't exist, note it and continue.
7. **`_plans/recon/design-system.md`** (if it exists) — the computed design system reference generated by `/playwright-recon --internal`. This has exact CSS values, gradients, spacing, and component patterns from your live pages. Reference it when the spec says "match the existing hero" or "use the same card style." If this file doesn't exist, note it in the spec output so the user knows to run `/playwright-recon --internal` before planning.
8. **Existing specs in `_specs/`** — read them to match the depth, tone, and format of specs already written for this project. The Daily Experience spec is the gold standard for thoroughness.
9. **Master spec plan** (if referenced in `$ARGUMENTS` or discoverable) — check for master plan documents in `_plans/_archive/` or `_plans/` (e.g., `_plans/_archive/dashboard-growth-spec-plan-v2.md`). If the current spec is part of a multi-spec feature, the master plan contains shared data models, localStorage keys, integration points, and cross-spec dependencies. Reference these in the spec. If no master plan exists or is relevant, skip this step.
 
**This context reading is mandatory, not optional.** Specs written without understanding the existing codebase produce plans that conflict with reality.
 
---
 
## Step 5: Draft the Spec Content
 
Create a markdown spec document that `/plan` can use directly. Save it to `_specs/<feature_slug>.md`.
 
Use the exact structure from `_specs/template.md` if it exists. If `_specs/template.md` does not exist, use this concrete template:
 
````markdown
# {Feature Title}
 
**Master Plan Reference:** `{path}` _(or "N/A — standalone feature")_
 
---
 
## Overview
 
{Frame the feature in terms of emotional healing and spiritual support — the app's mission. 2-4 sentences.}
 
## User Story
 
As a {logged-out visitor / logged-in user / admin}, I want to {action} so that {benefit}.
 
## Requirements
 
### Functional Requirements
 
1. {Specific, testable requirement}
2. {Another requirement}
 
### Non-Functional Requirements
 
- Performance: {targets if applicable}
- Accessibility: {WCAG level, keyboard nav, screen reader requirements}
 
## Auth Gating
 
**Every interactive element must have its auth behavior explicitly defined.**
 
| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| {action} | {what happens — e.g., "can view but clicking shows auth modal"} | {what happens} | "{exact message}" |
 
## Responsive Behavior
 
| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | {description} |
| Tablet (640-1024px) | {description} |
| Desktop (> 1024px) | {description} |
 
{Additional responsive notes: which elements stack, hide, resize, or change between breakpoints. Mobile-specific interactions (swipeable elements, touch targets).}
 
## AI Safety Considerations
 
{If the feature involves AI-generated content or free-text user input: describe crisis keyword handling, content filtering, and safety guardrails.}
 
{If the feature does NOT involve AI content or free-text input: "N/A — This feature does not involve AI-generated content or free-text user input. No crisis detection required."}
 
## Auth & Persistence
 
- **Logged-out users:** {demo-mode zero-persistence behavior}
- **Logged-in users:** {what persists, where (database table name from `.claude/rules/05-database.md`)}
- **localStorage usage:** {keys used, if any — use `wr_` prefix}
 
## Completion & Navigation
 
{For Daily Hub features: how completion signals to tracking system, CTAs after completion, context passing.}
{For standalone features: "N/A — standalone feature."}
 
## Design Notes
 
- {Reference design system from `.claude/rules/09-design-system.md`}
- {Reference design system recon patterns by name if `_plans/recon/design-system.md` exists}
- {Reference existing components by name when the feature should reuse them}
- {Flag any NEW visual patterns not yet captured in the design system recon}
 
## Out of Scope
 
- {Explicitly excluded items}
- {Future enhancements intentionally deferred}
- {Backend/API work that is Phase 3+}
 
## Acceptance Criteria
 
- [ ] {Specific, testable criterion with exact values}
- [ ] {Another criterion}
- [ ] {Visual verification criterion referencing specific properties}
````
 
**Scale depth to feature complexity:**
- A simple UI addition (new card type, new tab content) needs 1-2 sentences per section. Don't pad with boilerplate.
- A major feature (new page, new data model, multi-state flow) needs full detail in every section.
- If a section genuinely does not apply (e.g., Completion & Navigation for a non-Daily-Hub feature), write "N/A — {one-line reason}" rather than fabricating filler.
 
When filling in the template:
 
- **Overview**: Frame the feature in terms of emotional healing and spiritual support (the app's mission)
- **User Story**: Use the correct user role — `logged-out visitor`, `logged-in user`, or `admin`
- **Requirements**: Reference relevant rules from `.claude/rules/` where applicable (e.g. AI safety, security, accessibility)
- **Auth & Persistence**: Apply the demo-mode zero-persistence rule for logged-out users. Refer to the database schema in `.claude/rules/05-database.md` for table names
 
### Master Plan Reference (if applicable)
 
If this spec is part of a multi-spec feature (e.g., Dashboard & Growth Specs 1-16), include a reference block at the top of the spec:
 
```markdown
**Master Plan Reference:** `dashboard-growth-spec-plan-v2.md`
- Shared data models: See "localStorage Key Summary" section
- Cross-spec dependencies: See "Cross-Spec Integration Points" table
- Shared constants: See mood colors, activity points, level thresholds in relevant spec sections
```
 
This ensures `/plan` has access to shared context during reconnaissance.
 
### Auth Gating (MANDATORY for every spec)
 
**Every interactive element in the feature must have its auth behavior explicitly defined.** The spec must include a section that clearly states:
 
- What logged-out users CAN do (view, browse, type, interact with UI)
- What logged-out users CANNOT do (actions that show the auth modal)
- What the auth modal message says for each gated action
- What logged-in users can do
 
**Do NOT leave auth behavior implicit or assumed.** If the spec says "user can generate a prayer," it must also say whether a logged-out user can do this or not, and what happens if they try. This prevents the #1 class of bugs in this project: features shipping without auth gates because the spec didn't mention them.
 
### Responsive Behavior (MANDATORY for UI features)
 
**Every UI feature must include responsive behavior notes:**
 
- How the layout adapts at mobile (< 640px), tablet (640-1024px), and desktop (> 1024px)
- Which elements stack, hide, resize, or change between breakpoints
- Any mobile-specific interactions (hamburger menu, swipeable elements, touch targets)
 
**Do NOT assume responsive behavior will be figured out during implementation.** If the spec doesn't define it, it won't be built correctly.
 
### Completion & Navigation
 
For features that are part of the Daily Hub tabbed experience:
 
- How does completing this feature signal to the completion tracking system?
- What CTAs appear after completion? (switch tabs, visit other pages)
- How does context pass to/from other tabs?
 
### Design Notes
 
- Reference the design system (colors, typography, breakpoints) from `.claude/rules/09-design-system.md`
- If `_plans/recon/design-system.md` exists, reference specific patterns from it by name (e.g., "use the Hero Section Pattern from the design system recon", "match the Card Pattern's exact box-shadow and border-radius")
- Reference existing components by name when the feature should reuse them (e.g., "use the existing PageHero component" or "use the same auth modal pattern as Prayer Wall"). Referencing what EXISTS is encouraged; specifying HOW to implement it (file paths, code, architecture decisions) is not — that's `/plan`'s job.
- If the feature introduces a new visual pattern, describe it in enough detail that the planner can specify exact CSS values
- When referencing existing patterns, call out which visual aspects must match: gradient, spacing, typography, hover states. This gives `/plan` and `/verify-with-playwright` clear targets.
- If the feature introduces patterns NOT yet captured in the design system recon, flag them as **new patterns** so `/plan` knows to mark derived values as `[UNVERIFIED]` until verified
 
### Acceptance Criteria (MANDATORY)
 
**Every spec must end with a checkbox list of acceptance criteria.** These are used by `/code-review --spec` to verify the implementation is complete. Each criterion should be specific and testable:
 
- ✅ Good: "Logged-out user clicking 'Generate Prayer' sees auth modal with message 'Sign in to generate a prayer'"
- ❌ Bad: "Auth works correctly"
- ✅ Good: "On mobile (375px), meditation cards display in a 2-column grid"
- ❌ Bad: "Responsive design works"
- ✅ Good: "Hero gradient matches the design system reference (same angle, colors, and cutoff position as existing heroes)"
- ❌ Bad: "Hero looks like the other pages"
- ✅ Good: "Vertical spacing between hero and first content section matches existing pages (within 5px)"
- ❌ Bad: "Spacing is correct"
 
**Include visual verification criteria when the feature has UI.** These are checked by `/verify-with-playwright` during the verification step. Good visual criteria reference specific properties (gradient, spacing, typography, hover states) rather than subjective assessments.
 
### Out of Scope
 
- Explicitly call out anything excluded, especially items in the Non-Goals for MVP list
- Call out future enhancements that are intentionally deferred
- Call out backend/API work that is Phase 3+
 
---
 
## Step 6: Self-Review Checklist
 
**Before saving the spec, verify it passes these checks:**
 
- [ ] Auth behavior is explicitly defined for every interactive element (not just "requires login" but the specific modal message and logged-out experience)
- [ ] Responsive behavior is defined for at least 3 breakpoints
- [ ] Crisis detection is addressed if the feature has user text input (write "N/A" with reason if it doesn't)
- [ ] Existing shared components are referenced by name where applicable
- [ ] Acceptance criteria are specific and testable (not vague)
- [ ] Out of scope section exists and is specific
- [ ] No implementation HOW (file paths, code examples, architecture decisions) — only WHAT exists and should be reused. Naming existing components is fine; specifying how to build them is `/plan`'s job.
- [ ] Design system recon referenced where applicable (or absence flagged)
- [ ] New visual patterns flagged as new (so /plan marks values [UNVERIFIED])
- [ ] Visual acceptance criteria reference specific properties, not subjective assessments
- [ ] The spec is detailed enough that someone unfamiliar with the project could understand the feature
- [ ] Master plan reference included if this is part of a multi-spec feature
- [ ] Depth is proportional to complexity — simple features have concise specs, complex features have thorough specs
 
If any check fails, fix the spec before saving.
 
---
 
## Step 7: Final Output to the User
 
After the file is saved, respond with a short summary in this exact format:
 
```
Branch:    <branch_name>
Spec file: _specs/<feature_slug>.md
Title:     <feature_title>
Auth gates: <N> actions explicitly gated
Responsive: defined for <N> breakpoints
Design system recon: {referenced / not found — run /playwright-recon --internal first}
New visual patterns: {N} (will be marked [UNVERIFIED] during planning)
Master plan: {referenced / not applicable}
Branched from: {main / <current branch> (--from-branch)}
 
Next step: Run /plan _specs/<feature_slug>.md to generate an implementation plan.
```
 
**If `_plans/recon/design-system.md` was not found during Step 4:** Add a note:
 
```
⚠️  No design system recon found. For more accurate UI implementation, run:
   /playwright-recon --internal http://localhost:5173/ http://localhost:5173/prayer-wall http://localhost:5173/daily
   This captures exact CSS values from your existing pages so /plan and /execute-plan
   can match them precisely instead of guessing.
```
 
Do not repeat the full spec in the chat output unless the user explicitly asks to see it. Do not enter Plan Mode. Do not generate a plan. The `/spec` command's only job is to capture requirements — planning is a separate step.
 
---
 
## Rules
 
- **Stay in Act mode.** Do not enter Plan Mode. You need file write access.
- **Do not implement anything.** This command produces a spec, not code.
- **Do not generate a plan.** That's `/plan`'s job.
- **Do not perform git operations beyond the branch switch in Step 3.**
- **The spec is a product/design document.** It describes WHAT the feature does and HOW it should behave from the user's perspective. Implementation details (file paths, component architecture, code examples) belong in `/plan`.
- **Auth gating is mandatory.** Every interactive element must have its auth behavior defined. Vague specs produce ungated features.
- **Responsive behavior is mandatory.** Every UI feature must define breakpoint behavior. Vague specs produce broken mobile layouts.
- **Read existing context first.** Specs written without understanding the codebase conflict with reality and waste planning/execution time.
- **Acceptance criteria are mandatory.** `/code-review --spec` uses them to verify the implementation. No criteria = no verification.
- **Scale depth to complexity.** A 2-sentence feature idea does not need a 200-line spec. Match the effort to the scope.
 
---
 
## See Also
 
- `/plan` — Create implementation plan from this spec (the next step after /spec)
- `/execute-plan` — Execute all steps from a generated plan
- `/playwright-recon` — Capture visual specs from live pages (`--internal` for design system, default for external recon)
- `/verify-with-playwright` — Runtime UI verification with screenshots and computed style comparison
- `/code-review` — Pre-commit code review; use `--spec` flag to cross-reference against this spec

**Rule files consumed by this skill** (see Step 4 for mandatory/conditional use):
- `.claude/rules/01-ai-safety.md` — crisis detection rules (conditional)
- `.claude/rules/02-security.md` — auth gating requirements (mandatory)
- `.claude/rules/09-design-system.md` — component inventory, tokens (mandatory)
- `.claude/rules/10-ux-flows.md` — navigation + user flows (conditionally mandatory)
- `.claude/rules/11-local-storage-keys.md` — canonical `wr_*` key inventory (conditionally mandatory)