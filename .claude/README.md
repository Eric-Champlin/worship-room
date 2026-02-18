# Worship Room - Claude Code Configuration

This directory contains project-specific Claude Code customizations.

## Directory Structure

```
.claude/
├── rules/     - Modular topic-specific project instructions (STANDARD FEATURE)
├── skills/    - Project-specific skills (e.g., custom design workflows)
├── agents/    - Project-specific agents (e.g., specialized reviewers)
├── hooks/     - Project-specific hooks (e.g., auto-run tests on commit)
└── README.md  - This file
```

## Usage

### Rules (Modular Instructions)
**Standard Claude Code feature** for organizing project instructions into focused, topic-specific files.

Place `.md` files in `rules/` directory - all are automatically loaded as project memory.

**Example structure:**
```
rules/
├── ai-safety.md       - AI safety guardrails and crisis detection rules
├── security.md        - Security policies and authentication rules
├── frontend.md        - Frontend coding standards and patterns
├── backend.md         - Spring Boot conventions and API standards
├── database.md        - PostgreSQL schema and query guidelines
└── testing.md         - Testing requirements and patterns
```

**Path-specific rules** (optional):
```markdown
---
paths:
  - "frontend/**/*.tsx"
---
# React Component Rules
- Always use functional components
- Include accessibility attributes
```

**When to use:**
- Split large CLAUDE.md into focused files
- Organize rules by topic (security, testing, etc.)
- Apply rules to specific file types/paths

### Skills
Place custom skills in `skills/` directory. Each skill should have:
- `SKILL.md` - Skill definition and instructions
- Any supporting files

Example: `skills/worship-design/SKILL.md` - Custom design skill tailored for peaceful, contemplative aesthetics

### Agents
Place custom agents in `agents/` directory for specialized tasks like:
- Custom code reviewers for AI safety checks
- Scripture reference validators
- Accessibility checkers

### Hooks
Place custom hooks in `hooks/` directory for automation like:
- Pre-commit AI safety validation
- Auto-run tests before push
- Check for exposed API keys

## When to Use Project-Specific vs Global

**Use project-specific** (this folder) when:
- Customizations are specific to Worship Room (e.g., AI safety validation)
- You want to commit them to git for team use
- Different projects need different configurations

**Use global** (`~/.claude/`) when:
- Customizations apply to all your projects
- Personal preferences (not team-wide)

---

**Note**: Project-specific config takes precedence over global config.
