---
description: Create a feature spec file and branch from a short idea
argument-hint: Short feature description
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

If you cannot infer a sensible `feature_title` and `feature_slug` from `$ARGUMENTS`, ask the user to clarify instead of guessing.

---

## Step 3: Switch to a New Git Branch

Before writing any content, switch to a new Git branch using the `branch_name` derived from `$ARGUMENTS`. If the branch name is already taken, append a version number: e.g. `claude/feature/landing-page-hero-01`.

---

## Step 4: Draft the Spec Content

Create a markdown spec document that Plan mode can use directly. Save it to `_specs/<feature_slug>.md`.

Use the exact structure from `_specs/template.md`. When filling it in:

- **Overview**: Frame the feature in terms of emotional healing and spiritual support (the app's mission)
- **User Story**: Use the correct user role — `logged-out visitor`, `logged-in user`, or `admin`
- **Requirements**: Reference relevant rules from `.claude/rules/` where applicable (e.g. AI safety, security, accessibility)
- **AI Safety Considerations**: Always fill this section — never leave it blank. This app deals with emotional well-being; safety is mandatory
- **Auth & Persistence**: Apply the demo-mode zero-persistence rule for logged-out users. Refer to the database schema in `.claude/rules/05-database.md` for table names
- **Design Notes**: Reference the design system (colors, typography, breakpoints) from `CLAUDE.md`
- **Out of Scope**: Explicitly call out anything excluded, especially items in the Non-Goals for MVP list

Do **not** include technical implementation details such as code examples, file paths, or component names. The spec is a product/design document, not a technical plan — that comes next in Plan mode.

---

## Step 5: Final Output to the User

After the file is saved, respond with a short summary in this exact format:

```
Branch:    <branch_name>
Spec file: _specs/<feature_slug>.md
Title:     <feature_title>
```

Do not repeat the full spec in the chat output unless the user explicitly asks to see it. The main goal is to save the spec file and report where it lives and what branch to use.

---

## Step 6: Enter Plan Mode

After saving the spec, **automatically enter Plan Mode** to generate a technical implementation plan.

In Plan Mode:
1. Read the spec at `_specs/<feature_slug>.md`
2. Explore the codebase to understand existing patterns, components, and architecture
3. Generate a detailed technical plan covering: files to create/modify, implementation order, component/API structure, test plan, accessibility considerations, and potential pitfalls
4. **Before exiting Plan Mode**, save the plan to `_plans/YYYY-MM-DD-<feature_slug>.md` (using today's date)
5. Exit Plan Mode — the user reviews and approves the plan before implementation begins

The plan file in `_plans/` is the durable artifact. It persists across sessions and serves as the implementation reference.
