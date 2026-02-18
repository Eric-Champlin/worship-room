# Specs

High-level feature specifications. Each spec describes **what** you want to build.

## Workflow

1. Create a new spec file here describing the feature
2. Switch to a new Git branch for the feature
3. Run `/spec` command (or ask Claude to plan the feature)
4. A Technical Plan will be generated and saved to `_plans/`

## Naming Convention

```
YYYY-MM-DD-feature-name.md
```

**Examples:**
- `2026-02-17-landing-page.md`
- `2026-02-17-mood-selector.md`
- `2026-02-17-scripture-display.md`

## Spec Template

```markdown
# Feature: [Name]

## Overview
What is this feature and why does it exist?

## User Story
As a [user], I want to [action] so that [benefit].

## Requirements
- Requirement 1
- Requirement 2

## Acceptance Criteria
- [ ] Criteria 1
- [ ] Criteria 2

## Design Notes
Any visual/UX direction, references, constraints.

## Out of Scope
What this feature does NOT include.
```
