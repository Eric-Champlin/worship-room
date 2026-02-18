---
description: Reviews uncommitted code changes on the current branch for accessibility and code quality.
argument-hint: (optional) specific area to focus on
user-invokable: true
---

You are coordinating a code review for **Worship Room** — a Christian emotional healing web app built with React 18 + TypeScript (Vite), Spring Boot (Java), TailwindCSS, and PostgreSQL.

## Step 1: Gather the Diff

Collect all current changes using:
- `git diff` — unstaged changes
- `git diff --staged` — staged changes

Combine both into a single diff. If both are empty, tell the user there is nothing to review and **stop**.

## Step 2: Run Both Reviewers in Parallel

Invoke **both subagents simultaneously** on the same combined diff:

- `a11y-reviewer` — accessibility audit
- `code-quality-reviewer` — code quality audit

Provide each agent:
- The full combined diff
- Tech stack context: React 18 + TypeScript (strict), Vite, TailwindCSS, Spring Boot (Java), PostgreSQL, Vitest + React Testing Library, path alias `@/`
- Instruction to be evidence-based: file paths, line references, no guessing
- Instruction to review **only** what is in the diff — nothing else

## Step 3: Merge and Report

Combine both agents' findings into one unified report. De-duplicate any overlapping issues. Structure the report as:

1. **Summary** — max 8 bullets total across both reviews
2. **Accessibility Findings** — grouped by: Blocker / Major / Minor / Nit
3. **Code Quality Findings** — grouped by: Blocker / Major / Minor / Nit
4. **Worship Room–Specific Flags** — any violations of project-specific rules (AI safety, demo mode, encryption, plain text rendering, crisis detection)
5. **Action Plan** — ordered checklist of all fixes to apply
6. **Open Questions** — anything that requires human intent or clarification

## Step 4: Ask Before Acting

After presenting the report, ask:

> "Do you want me to implement the action plan now?"

**Do NOT edit any files until the user explicitly confirms.**

## Rules

- Do not run formatting-only changes unless they fix a cited issue
- Do not speculate about code not in the diff
- Worship Room-specific issues (AI safety, crisis detection bypass, `dangerouslySetInnerHTML`, demo mode writes, unencrypted journal entries) are always **Blocker** severity
