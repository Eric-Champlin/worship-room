# Worship Room Forums Wave — Handoff for New Conversation

## Who I am

Eric Champlin, solo frontend dev at Ramsey Solutions. Building Worship Room (Christian emotional healing web app).

**File paths:** Work laptop uses `/Users/eric.champlin/worship-room/`. Home computer uses `/Users/Eric/worship-room/`. All paths in this document reference the work laptop — adjust if I'm on the home machine.

## What's been completed (DO NOT redo any of this)

### Master Plan (COMPLETE — do not modify)

- **File:** `/Users/eric.champlin/worship-room/_forums_master_plan/round3-master-plan.md`
- **Version:** 2.6, 622,255 bytes, 138 specs across 19 phases (0, 0.5, 1–16)
- **17 Universal Rules**, 17 Architectural Decisions, 4 Appendices (A, B, C, D)
- **Audited across 15 dimensions** — ALL CLEAN. Do not re-audit.
- **The master plan is the source of truth for all 138 specs.**

### Pipeline files (ALL COMPLETE)

1. ✅ `.claude/skills/spec-forums/SKILL.md` — extracts specs from master plan
2. ✅ `.claude/skills/plan-forums/SKILL.md` — generates backend-aware implementation plans
3. ✅ `.claude/skills/execute-plan-forums/SKILL.md` — executes with backend/frontend verification
4. ✅ `.claude/skills/code-review/SKILL.md` — updated with 17 Forums Wave safety checks
5. ✅ `.claude/rules/03-backend-standards.md` — full Spring Boot conventions, Liquibase, API contract
6. ✅ `.claude/rules/05-database.md` — 22 canonical tables, correct Decision references
7. ✅ `.claude/rules/06-testing.md` — AbstractIntegrationTest, drift detection, test counts
8. ✅ `.claude/rules/02-security.md` — JWT, trust levels, Forums Wave rate limits
9. ✅ `.claude/rules/07-logging-monitoring.md` — Sentry + PII scrubber + UptimeRobot
10. ✅ `.claude/rules/08-deployment.md` — Liquibase deploy, Redis, full env vars
11. ✅ `CLAUDE.md` — Forums Wave section with pipeline commands + working guidelines

### Cross-check results (COMPLETE)

- Pipeline files were cross-checked line-by-line against the master plan
- 17 discrepancies found and fixed (wrong rule numbers, wrong Decision refs, missing conventions)
- All fixes verified with grep
- Infrastructure directories created: `_specs/forums/`, `_plans/forums/`
- Backend package name documented as `com.example.worshiproom` (Spec 1.1 decides final naming)

## What to do next: Execute specs

I'm ready to begin executing the 138 Forums Wave specs, starting with Phase 0.

**My workflow with you:**

1. I say "new spec please" or "Spec 0.1" (or whichever spec is next)
2. You read the master plan section for that spec
3. You give me the spec content formatted for my `/spec-forums` Claude Code command
4. I paste it into Claude Code, which creates the branch and spec file
5. Then I run `/plan-forums`, `/execute-plan-forums`, `/code-review` in Claude Code
6. I come back to you for the next spec

**Important:** Don't re-read all pipeline files on startup. The skills and rules are already on disk — Claude Code reads them automatically when I invoke `/spec-forums`, `/plan-forums`, etc. You just need to read the master plan section for the current spec.

**Current position:** Phase 0, Spec 0.1 — Backend Foundation Learning (reading document, zero code risk)

## Key references you'll need

- **Master plan:** `_forums_master_plan/round3-master-plan.md` (read the spec section when I ask for a spec)
- **Universal Rules:** 17 rules in the master plan (apply to every spec)
- **Decisions:** 17 architectural decisions in the master plan
- **Table names (Decision 4):** `users`, `posts`, `post_comments`, `post_reactions`, `post_bookmarks`, `post_reports`, `activity_log`, `faith_points`, `streak_state`, `user_badges`, `activity_counts`, `friend_relationships`, `friend_requests`, `social_interactions`, `milestone_events`, `notifications_inbox`, `admin_audit_log`, `qotd_questions`, `user_reports`, `verse_surfacing_log`, `email_sent_log`, `email_preferences`
- **Tech stack:** React 18 + TypeScript/Vite frontend, Spring Boot 3.x + Java 21 + PostgreSQL + Liquibase + Testcontainers backend, Redis for rate limiting

## My preferences

- I handle ALL git operations manually — CC never commits/pushes
- Slow and steady — verify before proceeding
- Anti-pressure design philosophy (no FOMO, no shame, no exclamation points near vulnerability)
- All scripture uses WEB (World English Bible) translation
- Dark theme base; light mode deferred to Phase 4

## Tracking

- **Spec tracker:** `_forums_master_plan/spec-tracker.md` — all 138 specs with phase, size, risk, and checkbox status
- **Transcript of previous work:** `/mnt/transcripts/` (if you need deep context on decisions made during master plan creation)

## Important: You have filesystem access

You have Filesystem and Desktop Commander MCP servers connected. You can read/write files directly on my computer. When I ask for a spec:

1. Read the master plan yourself: `Filesystem:read_text_file` at the path above
2. Extract the spec section verbatim — the `/spec-forums` skill handles formatting

Don't ask clarifying questions — everything you need is in the master plan on disk.

## Output rules

- **Skip tracker lines.** I already have a complete spec tracker with all 138 specs. I update it myself.
- **Use artifacts for specs and large documents.** Create them as artifacts (the clickable pill) — not inline text. Just the artifact plus a short confirmation (filename, length, any notes). Don't dump content into chat.

Now: new spec please. Spec 0.1.
