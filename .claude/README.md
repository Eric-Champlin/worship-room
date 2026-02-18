# Worship Room - Claude Code Configuration

This directory contains project-specific Claude Code customizations.

## Directory Structure

```
.claude/
├── rules/     - Modular topic-specific project instructions (auto-loaded)
├── skills/    - User-invokable commands (e.g., /spec, /code-review)
├── agents/    - Specialized subagents (e.g., a11y-reviewer, code-quality-reviewer)
└── README.md  - This file
```

## Usage

### Rules (Modular Instructions)
**Standard Claude Code feature.** All `.md` files in `rules/` are automatically loaded as project memory.

Files with a `paths:` frontmatter are scoped to specific file patterns:

```yaml
---
paths: ["frontend/**"]
---
```

**Current rules:**
```
rules/
├── 01-ai-safety.md          - Crisis detection, AI content boundaries, moderation (global)
├── 02-security.md           - Auth, rate limiting, encryption, input validation (global)
├── 03-backend-standards.md  - Spring Boot conventions, API contract (backend/** only)
├── 04-frontend-standards.md - React patterns, design system, accessibility (frontend/** only)
├── 05-database.md           - Schema, indexes, encryption policies (backend/**, *.sql only)
├── 06-testing.md            - Testing strategy, coverage requirements (global)
├── 07-logging-monitoring.md - Structured logging, PII handling (global)
└── 08-deployment.md         - Environment variables, deployment platforms (global)
```

### Skills (User-Invokable Commands)
Place custom skills in `skills/<name>/SKILL.md`. Skills with `user-invokable: true` appear in the `/` command palette.

**Current skills:**
- `/spec` — Spins up a new feature spec file and git branch from a short description
- `/code-review` — Runs accessibility + code quality review on uncommitted changes

### Agents (Specialized Subagents)
Place custom agents in `agents/<name>.md`. Agents are invoked by skills or by Claude when appropriate.

**Current agents:**
- `a11y-reviewer` — WCAG accessibility audit on diffs, Worship Room–specific priorities
- `code-quality-reviewer` — Code quality audit on diffs, enforces project safety/security rules

### Hooks (Optional)
Place project-specific hooks in `hooks/` if needed (not created yet). Use global `~/.claude/hooks/` for hooks that apply to all projects.

## When to Use Project-Specific vs Global

**Use project-specific** (this folder) when:
- Customizations are specific to Worship Room
- You want them committed to git

**Use global** (`~/.claude/`) when:
- Customizations apply to all your projects
- Personal preferences (not team-wide)
