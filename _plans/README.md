# Plans

Technical implementation plans generated from specs. Each plan describes **how** to build the feature.

## Workflow

1. Plans are generated from specs in `_specs/` via planning mode
2. Review the plan before telling Claude to implement
3. After implementation, run `/code-review` for quality + accessibility checks

## Naming Convention

```
YYYY-MM-DD-feature-name.md
```

Matches the spec file it was generated from.

**Examples:**
- `2026-02-17-landing-page.md`
- `2026-02-17-mood-selector.md`
- `2026-02-17-scripture-display.md`

## Plan Contents

Each plan typically includes:
- Files to create/modify
- Component/API structure
- Implementation steps
- Test plan
- Edge cases and considerations
