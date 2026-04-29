# Skill Reality Drift — Applied (Pass 2)

**Generated:** 2026-04-28
**Branch:** `forums-wave-continued`
**Scope:** 22 of 25 proposed edits applied across 4 Forums Wave skills (`spec-forums`, `plan-forums`, `execute-plan-forums`, `code-review`). The 3 two-laptop notes (SF-E5, PF-E9, EX-E6) deferred per Eric's Tier 3 skip. `verify-with-playwright` required no changes.

---

## Summary

| Result | Count |
|---|---|
| Drifts identified in Pass 1 | 25 |
| Approved-for-action by Eric in Pass 2 scope | 22 |
| Edits applied in Pass 2 | **22 / 22** |
| Edits deferred (Tier 3 skip) | 3 (SF-E5, PF-E9, EX-E6 — two-laptop path notes) |
| Chase-down findings during apply | 0 |

All edits surgical (`Edit` tool with explicit `old_string` → `new_string`); no whole-skill rewrites. Every target location verified by re-read or `grep` after edit.

Out of scope item #6 (spec-forums git branching default behavior) flagged separately for Eric's review per his note — not part of this audit.

---

## Files modified

| File | Edits applied |
|---|---|
| `.claude/skills/spec-forums/SKILL.md` | 4 (SF-E1 + SF-E2 + SF-E3 + SF-E4) |
| `.claude/skills/plan-forums/SKILL.md` | 8 (PF-E1 + PF-E2 + PF-E3 + PF-E4 + PF-E5 + PF-E6 + PF-E7 + PF-E8) |
| `.claude/skills/execute-plan-forums/SKILL.md` | 5 (EX-E1 + EX-E2 + EX-E3 + EX-E4 split into 2 + EX-E5) |
| `.claude/skills/code-review/SKILL.md` | 5 (CR-E1 + CR-E2 + CR-E3 + CR-E4 with grep-heuristics note + CR-E5) |
| **Total** | **4 files, 22 individual replacements** |

---

## Apply log (file-by-file)

### `.claude/skills/spec-forums/SKILL.md`

#### Edit SF-E1 — Step 4 codebase recon item 12 expanded with schema-realities recon

**Before:**
```markdown
12. **Existing code in `backend/` and `frontend/`** — understand what's already built so the spec references real files and patterns
```

**After:**
```markdown
12. **Existing code in `backend/` and `frontend/`** — understand what's already built so the spec references real files and patterns. **For every schema element, file, package, method, or column the spec mentions creating, verify it does NOT already exist on disk:**
    - Liquibase changesets: `ls backend/src/main/resources/db/changelog/` — search for any prior changeset that already creates the table/column the spec proposes
    - Java packages / classes: `ls backend/src/main/java/com/worshiproom/{package}/` — Phase 3 specs repeatedly proposed creating files that already shipped in Spec 3.1 (`candle_count`, `reaction_type`), Spec 1.1 (`com.worshiproom` package), Spec 3.6 (`INTERCESSION` ActivityType)
    - Frontend stores / hooks: `grep -rn "{StoreName}" frontend/src/` — verify the store doesn't already exist
    - **Recon override pattern:** if any element already exists, mark it explicitly in the spec body as "Files already exist (do NOT recreate)" with the source spec/changeset cited — see Spec 3.7 Recon R1/R2/R3 for the canonical pattern
```

**Verification:** `grep -n "Recon override pattern" .claude/skills/spec-forums/SKILL.md` returns line 101.

---

#### Edit SF-E2 — Step 4 conditional reads: insert Phase 3 Addendum at item 7

**Before:**
```markdown
**Conditionally mandatory (read if the spec touches the area):**

7. **`.claude/rules/06-testing.md`** — when the spec includes test specifications
```

**After:**
```markdown
**Conditionally mandatory (read if the spec touches the area):**

7. **Phase 3 Execution Reality Addendum** in `_forums_master_plan/round3-master-plan.md` — when the spec touches edit windows (return 409, not 400, with code `EDIT_WINDOW_EXPIRED` per addendum item 1), bulk JPQL UPDATE/DELETE (must use `@Modifying(clearAutomatically=true, flushAutomatically=true)` per item 3), SecurityConfig rules (method-specific rules ABOVE `OPTIONAL_AUTH_PATTERNS` per item 4), per-feature rate limits or idempotency caches (Caffeine-bounded pattern per item 5), domain advices (per item 6), user-generated content (must use `CrisisAlertService.alert(contentId, authorId, ContentType)` per item 7), or activity types (INTERCESSION makes total 13 per item 9). The addendum is AUTHORITATIVE over older spec body text where they disagree.
8. **`.claude/rules/06-testing.md`** — when the spec includes test specifications
```

**Verification:** `grep -n "Phase 3 Execution Reality Addendum" .claude/skills/spec-forums/SKILL.md` returns line 88.

---

#### Edit SF-E3 — Insert Step 4.5 Recon Failure Handling between item 13 and Step 5

**Before** (transition from Step 4 to Step 5):
```markdown
13. **Previous Forums Wave specs in `_specs/forums/`** — match depth, tone, and format of specs already written

---

## Step 5: Save the Spec
```

**After:**
```markdown
13. **Previous Forums Wave specs in `_specs/forums/`** — match depth, tone, and format of specs already written

---

## Step 4.5: Recon Failure Handling

**If recon tools (filesystem MCP, codebase grep, file reads) cannot run** — for example, the brief was authored from Claude Desktop without filesystem access, or MCP servers are down at brief-authoring time:

- **Do NOT inline unverified codebase claims as divergences.** Spec 3.7's brief proposed schema migrations for already-shipped columns because the brief author couldn't run `ls backend/src/main/resources/db/changelog/`. The result was 14 paragraphs of "actually this already exists" overrides at recon time.
- **Instead, prefix every codebase claim with `[VERIFY]`** so the planner (running `/plan-forums`) knows which claims to confirm during plan-time recon. Example: `[VERIFY] post_reactions has reaction_type column added by Spec 3.1 changeset 016`.
- **Trust calibration:** trust the codebase on what code DOES (facts); trust the brief author on what code SHOULD DO (design intent). When conflicts surface, the codebase wins for facts and Eric wins for direction.

---

## Step 5: Save the Spec
```

**Verification:** `grep -n "Step 4.5: Recon Failure Handling" .claude/skills/spec-forums/SKILL.md` returns line 106.

---

#### Edit SF-E4 — Step 6 self-review checklist replaced with Phase 3-aware version

**Before** (8 items):
```markdown
- [ ] Spec ID matches the master plan exactly
- [ ] All prerequisite specs are listed
- [ ] Universal Rules referenced where relevant
- [ ] Database changes include Liquibase changeset filenames
- [ ] API changes include endpoint paths and HTTP methods
- [ ] Acceptance criteria are present and testable
- [ ] Out of scope section exists
- [ ] **Affected Frontend Routes** section populated — either with the actual user-facing routes touched by this spec (one per line, backtick-wrapped, including query params), or with "N/A — backend-only spec" if no UI is involved. Required for `/verify-with-playwright` plan-only invocation downstream.
```

**After** (12 items, including 4 Phase 3 Addendum gates):
```markdown
- [ ] Spec ID matches the master plan exactly
- [ ] All prerequisite specs are listed
- [ ] Universal Rules referenced where relevant
- [ ] Database changes include Liquibase changeset filenames AND each table/column has been verified to NOT already exist (per Step 4 schema-realities recon)
- [ ] API changes include endpoint paths and HTTP methods
- [ ] Edit-window-bearing endpoints return 409 `EDIT_WINDOW_EXPIRED` (not 400) per Phase 3 Execution Reality Addendum item 1
- [ ] User-generated-content endpoints route crisis flags through `CrisisAlertService.alert(contentId, authorId, ContentType)` (do NOT introduce sibling alert services) per addendum item 7
- [ ] New ActivityType values update both backend enum AND frontend `ACTIVITY_POINTS` (current total: 13 incl. INTERCESSION per addendum item 9)
- [ ] Pattern A references qualified as "Pattern A (subscription via standalone hook with `useSyncExternalStore`)" — there is NO Pattern A migration pattern (Spec 3.7 ambiguity)
- [ ] Acceptance criteria are present and testable
- [ ] Out of scope section exists
- [ ] **Affected Frontend Routes** section populated — either with the actual user-facing routes touched by this spec (one per line, backtick-wrapped, including query params), or with "N/A — backend-only spec" if no UI is involved. Required for `/verify-with-playwright` plan-only invocation downstream.
```

**Verification:** `grep -n "Pattern A references qualified" .claude/skills/spec-forums/SKILL.md` returns line 194.

---

### `.claude/skills/plan-forums/SKILL.md`

#### Edit PF-E1 — Step 3 item 7 package path stripped of "before/after Spec 1.1" framing (Stale-Hard)

**Before:**
```markdown
7. **Existing backend code** — current package is `backend/src/main/java/com/example/worshiproom/` until Phase 1 Spec 1.1 renames it to `backend/src/main/java/com/worshiproom/`. Use the old path for specs that execute BEFORE Spec 1.1 (Phase 0, Phase 0.5, and Spec 1.1 itself); use the new path for specs that execute AFTER Spec 1.1 (every Phase 1.2+ spec through Phase 16). If unsure, grep the current repo: `ls backend/src/main/java/com/` will show which package actually exists on the current branch.
```

**After:**
```markdown
7. **Existing backend code** — package is `com.worshiproom`. Phase 1 Spec 1.1 ✅ renamed from `com.example.worshiproom` (covered ~60+ proxy files + tests + `pom.xml` `groupId` + Docker image tags). The new path is canonical everywhere — `com/example/worshiproom/` should NOT appear anywhere in the codebase post-Phase-1; if it does, that's a regression. The grep fallback (`ls backend/src/main/java/com/`) still applies if anything seems off.
```

**Verification:** Spec 1.1 ✅ shipped per CLAUDE.md and on-disk `ls backend/src/main/java/com/` returns only `worshiproom/`.

---

#### Edit PF-E2 — Step 3 item 11 OpenAPI provenance updated to v2.9 + addendums

**Before:**
```markdown
11. **Existing OpenAPI spec** — `backend/src/main/resources/openapi.yaml` ALREADY EXISTS (shipped by Key Protection Wave with shared schemas `ProxyResponse` + `ProxyError` and 10+ proxy endpoints). Forums Wave specs EXTEND this file — add new paths that `$ref` the shared components; do NOT create a new file at `backend/api/openapi.yaml` (that path was provisional in master plan v2.6, superseded by v2.7; current as of v2.8).
```

**After:**
```markdown
11. **Existing OpenAPI spec** — `backend/src/main/resources/openapi.yaml` ALREADY EXISTS (shipped by Key Protection Wave with shared schemas `ProxyResponse` + `ProxyError` and 10+ proxy endpoints; extended by Phase 3 Specs 3.3–3.7 with the unified `posts` family). Forums Wave specs EXTEND this file — add new paths that `$ref` the shared components; do NOT create a new file at `backend/api/openapi.yaml` (that path was provisional in master plan v2.6, superseded by v2.7; **current as of v2.9 + Phase 1, Phase 2, and Phase 3 Execution Reality Addendums** — addendums are AUTHORITATIVE over older spec body text where they disagree).
```

---

#### Edit PF-E3 — Universal Rules Checklist Rule 8 Pattern A disambiguation

**Before:**
```markdown
- [ ] Rule 8: BB-45 anti-pattern forbidden (reactive store consumers use the hook, not mirrored `useState`; tests mutate store after mount)
```

**After:**
```markdown
- [ ] Rule 8: BB-45 anti-pattern forbidden (reactive store consumers use the hook, not mirrored `useState`; tests mutate store after mount). New stores prefer **Pattern A (subscription via standalone hook with `useSyncExternalStore`)** per `11b-local-storage-keys-bible.md` § "Reactive Store Consumption". There is NO "Pattern A migration pattern" — that ambiguity bit Spec 3.7's brief authoring; "Pattern A" always means subscription via standalone hook.
```

---

#### Edit PF-E4 — Plan Quality Self-Review Checklist expanded with sub-heading grouping (per Eric's note)

**Before** (14 unstructured items in a single list).

**After** (split into "Core checklist" 1–14 + "Phase 3 Execution Reality Addendum gates" 15–22). The sub-heading grouping was Eric's specific request to make the addendum gates visually distinct as a coherent block. Items 6 and 12 in the core list also picked up small annotations (filename = today's date + sequence; test count = 30-50 reality). Items 15–22 each begin with `**Phase 3 Addendum item N — ...**` and are standalone sentences ready for direct verification.

**Snippet of new Phase 3 Addendum gates block:**
```markdown
### Phase 3 Execution Reality Addendum gates

These items propagate the 12 conventions established by Phase 3 Specs 3.1–3.7 (see `_forums_master_plan/round3-master-plan.md` § "Phase 3 Execution Reality Addendum"). For backend-touching plans, every applicable item must be verified BEFORE saving — these are the "blocks bad PRs at planning time" surface.

15. [ ] **Phase 3 Addendum item 1 — EditWindowExpired returns 409, not 400.** ...
16. [ ] **Phase 3 Addendum item 2 — L1-cache trap fixed.** ...
17. [ ] **Phase 3 Addendum item 3 — `@Modifying(clearAutomatically=true, flushAutomatically=true)`** ...
18. [ ] **Phase 3 Addendum item 4 — SecurityConfig method-specific rules ordered ABOVE `OPTIONAL_AUTH_PATTERNS.permitAll()`.** ...
19. [ ] **Phase 3 Addendum item 5 — Caffeine-bounded bucket pattern** ...
20. [ ] **Phase 3 Addendum item 6 — Domain-scoped `@RestControllerAdvice`** ...
21. [ ] **Phase 3 Addendum item 7 — `CrisisAlertService.alert(contentId, authorId, ContentType)` is the unified entry point** ...
22. [ ] **Phase 3 Addendum item 8 — schema realities verified.** ...
```

**Verification:** `grep -n "Phase 3 Execution Reality Addendum gates" .claude/skills/plan-forums/SKILL.md` returns line 399. Sub-heading is `### Phase 3 Execution Reality Addendum gates`, parallel to `### Core checklist` at line 380.

---

#### Edit PF-E5 — Step 3 item 9 Liquibase recon expanded with schema-realities cross-check

**Before:**
```markdown
9. **Existing Liquibase changesets** — `backend/src/main/resources/db/changelog/` for naming and ordering. Before assigning a new changeset filename, run `ls backend/src/main/resources/db/changelog/` and confirm no existing file has the same `YYYY-MM-DD-NNN` prefix as yours. A collision will cause Liquibase checksum failure on deploy.
```

**After:**
```markdown
9. **Existing Liquibase changesets** — `backend/src/main/resources/db/changelog/` for naming and ordering. Before assigning a new changeset filename, run `ls backend/src/main/resources/db/changelog/` and confirm no existing file has the same `YYYY-MM-DD-NNN` prefix as yours. A collision will cause Liquibase checksum failure on deploy. **Filename = today's actual date + next available sequence number** (master plan body uses `YYYY-MM-DD-NNN-` placeholders illustratively; per Spec 3.1 Plan Deviation #1).
   - **Before adding ANY new changeset, verify the schema element doesn't already exist.** Phase 3 has shipped many tables/columns that future specs may try to recreate. Authoritative reference: `_forums_master_plan/round3-master-plan.md` § "Phase 3 Execution Reality Addendum" item 8 lists all known "do NOT recreate" elements (`posts.candle_count`, `post_reactions.reaction_type`, the 5 denormalized counters, `qotd_questions`, `post_reports.review_consistency`, the friends/social/milestone tables, `user_mutes`). For any element the spec proposes creating, grep the existing changesets for the table/column name FIRST.
```

---

#### Edit PF-E6 — BACKEND-ONLY guidance expanded from 5 items to 11 items

**Before** (5 items, no Phase 3 conventions).

**After** (11 items — kept items 1–5 with small annotations, added items 6–11 directly mapping to Phase 3 Addendum items 4, 6, 3, 2, 1, 7).

**Snippet of new items 6–11:**
```markdown
6. **SecurityConfig method-specific rules ordered ABOVE `OPTIONAL_AUTH_PATTERNS.permitAll()`** per addendum item 4. Nested paths (`/api/v1/posts/*/reactions`) need their own explicit rules — `*` matches one segment only.
7. **Domain-scoped `@RestControllerAdvice`** for the new domain (`com.worshiproom.{domain}`); unscoped companion advice for any filter-raised exceptions per addendum item 6.
8. **Bulk JPQL UPDATE/DELETE methods MUST use `@Modifying(clearAutomatically=true, flushAutomatically=true)`** per addendum item 3.
9. **Create-endpoint integration tests assert non-null timestamps in response body** as regression guard for the L1-cache trap per addendum item 2. Service layer calls `entityManager.refresh(saved)` after `save()`.
10. **Edit-window endpoints return 409 `EDIT_WINDOW_EXPIRED`** (not 400) per addendum item 1.
11. **User-generated-content endpoints route crisis flags through `CrisisAlertService.alert(contentId, authorId, ContentType)`** per addendum item 7. Do NOT introduce sibling alert services.
```

---

#### Edit PF-E7 — Plan template gets new "Plan Tightening Audit" + "Plan-Time Divergences from Brief" sections

Inserted as two new sections between the per-step template and the "Step Dependency Map" section. Codifies the audit structure that ran in Phase 3 plans 3.5/3.6/3.7.

**Plan Tightening Audit:** 15-lens checklist (schema state explicit, existing entity reuse, SQL-side counter updates, activity-on-add-only, SecurityConfig rule ordering, validation surface, Pattern A clarification, BB-45 cross-mount test, step dependency map, test count vs brief, L1-cache trap, `@Modifying` flags complete, Caffeine-bounded caches, domain-scoped advice, crisis content via CrisisAlertService).

**Plan-Time Divergences from Brief:** structured table for capturing planner judgment calls not in the brief (with reason and reversibility columns).

**Verification:** `grep -n "## Plan Tightening Audit\|## Plan-Time Divergences from Brief" .claude/skills/plan-forums/SKILL.md` returns lines 323 and 347. Both sections appear before "## Step Dependency Map".

---

#### Edit PF-E8 — Step 3 prepended with `[VERIFY]` claim handling and trust calibration

**Before** (Step 3 transition):
```markdown
**For backend-heavy specs, discover:**
- Project structure and package conventions
```

**After:**
```markdown
**Before exhaustive recon — handle `[VERIFY]` claims from the spec.**

If the spec was authored without filesystem access (per spec-forums Step 4.5), it may contain claims tagged `[VERIFY]`. The plan MUST resolve every one with on-disk verification before drafting steps. Conversely, if the spec body claims "X exists" but recon shows X doesn't (or vice versa), trust the codebase for facts and surface the discrepancy in the plan's Edge Cases & Decisions table — do NOT silently align with the spec's wrong claim.

**Trust calibration:** trust CC on what code DOES (codebase facts); trust the spec author on what code SHOULD DO (design intent). When facts and intent collide, surface the conflict in the plan rather than guessing.

**For backend-heavy specs, discover:**
- Project structure and package conventions
```

Closes the loop with spec-forums Step 4.5 (SF-E3).

---

### `.claude/skills/execute-plan-forums/SKILL.md`

#### Edit EX-E1 — Step 4e package path bullet stripped of "before/after Spec 1.1" framing (Stale-Hard)

**Before:**
```markdown
- **Package path** — current package is `com.example.worshiproom` until Phase 1 Spec 1.1 merges. Specs executing before Spec 1.1 use the old path; specs after use `com.worshiproom`. When in doubt, check the actual current package with `ls backend/src/main/java/com/` before writing new Java files.
```

**After:**
```markdown
- **Package path** — package is `com.worshiproom`. Phase 1 Spec 1.1 ✅ shipped (the rename covered ~60+ proxy files + tests + `pom.xml` `groupId` + Docker image tags). The `com/example/worshiproom/` path should NOT appear anywhere in the codebase post-Phase-1; if it does, that's a regression. Sanity check with `ls backend/src/main/java/com/` if anything seems off.
```

---

#### Edit EX-E2 — Step 4e `@RestControllerAdvice` scoping bullet rewritten (Stale-Hard)

**Before:**
```markdown
- **`@RestControllerAdvice` scoping** — proxy advice is package-scoped (`basePackages = "com.example.worshiproom.proxy"`). Do NOT create a globally-scoped advice for proxy concerns; do NOT broaden the existing advice to catch non-proxy exceptions. Update the `basePackages` value as part of the Spec 1.1 rename (it becomes `com.worshiproom.proxy`).
```

**After:**
```markdown
- **`@RestControllerAdvice` scoping** — proxy advice is package-scoped at `@RestControllerAdvice(basePackages = "com.worshiproom.proxy")`. Phase 3 added domain advices following the same pattern: `com.worshiproom.post` (`PostExceptionHandler`), `com.worshiproom.post.engagement` (`EngagementExceptionHandler`), `com.worshiproom.post.comment` (`CommentExceptionHandler`). Future Phase 10/12/15 specs will add `com.worshiproom.moderation`/`com.worshiproom.notification`/`com.worshiproom.email`. **Do NOT** create globally-scoped advice for domain concerns; **do NOT** broaden an existing advice to catch sibling-package exceptions. **Filter-raised exceptions** (those thrown from servlet filters before any controller is matched) need an unscoped companion advice handling only the specific exception class — see `03-backend-standards.md` § "@RestControllerAdvice Scoping" for the canonical pattern.
```

---

#### Edit EX-E3 — Step 4e OpenAPI bullet updated to v2.9 + addendums

**Before:**
```markdown
- **OpenAPI spec location** — ... (stale provisional path from master plan v2.6; corrected in v2.7 and confirmed in v2.8).
```

**After:**
```markdown
- **OpenAPI spec location** — ... (stale provisional path from master plan v2.6; corrected in v2.7, confirmed in v2.8, **canonical as of v2.9 + Phase 1, Phase 2, and Phase 3 Execution Reality Addendums**).
```

(Also picked up the "extended by Phase 3 Specs 3.3–3.7 with the unified `posts` family (~2700+ lines)" annotation.)

---

#### Edit EX-E4 — Step 4e Critical Invariants extended with 5 Phase 3 conventions + filter ordering update

Applied as 2 sub-edits:

**Sub-edit 1 — filter ordering bullet updated** (mentions Spec 1.4 ✅, Spec 1.5 ✅, Spec 1.10g ✅):

**Before:**
```markdown
- **Filter ordering** — `RequestIdFilter` is at `@Order(Ordered.HIGHEST_PRECEDENCE)`, `RateLimitFilter` is at `@Order(Ordered.HIGHEST_PRECEDENCE + 10)` with `shouldNotFilter` scoping to `/api/v1/proxy/**`. Any new filter (JWT auth in Spec 1.4, future middleware) MUST be ordered AFTER both — suggested `HIGHEST_PRECEDENCE + 100` so request IDs and proxy rate limits run first. Verify ordering explicitly; don't rely on Spring's default filter-chain insertion.
```

**After:**
```markdown
- **Filter ordering** — `RequestIdFilter` is at `@Order(Ordered.HIGHEST_PRECEDENCE)`, `RateLimitFilter` is at `@Order(Ordered.HIGHEST_PRECEDENCE + 10)` with `shouldNotFilter` scoping to `/api/v1/proxy/**`. JWT auth (Spec 1.4 ✅) is at `HIGHEST_PRECEDENCE + 100`. `LoginRateLimitFilter` (Spec 1.5 ✅) and `SecurityHeadersConfig` filter (Spec 1.10g ✅, at `HIGHEST_PRECEDENCE + 6`) coexist. Any NEW filter MUST verify ordering explicitly; don't rely on Spring's default filter-chain insertion.
```

**Sub-edit 2 — 5 new bullets appended after the Testcontainers bullet:**

```markdown
- **L1-cache trap on `save → flush → findById`** — when an entity has `@Column(insertable=false, updatable=false)` columns ... canonical fix: call `entityManager.refresh(saved)` after `save()` ...
- **`@Modifying(clearAutomatically=true, flushAutomatically=true)`** on every bulk JPQL UPDATE/DELETE method ...
- **SecurityConfig method-specific rules ABOVE `OPTIONAL_AUTH_PATTERNS.permitAll()`** ...
- **Liquibase changeset filename = today's actual date + next available sequence number.** ...
- **Crisis-flag handling routes through `CrisisAlertService.alert(contentId, authorId, ContentType)`** ...
```

---

#### Edit EX-E5 — IDE classpath sync gotcha appended to Quality block

**Before** (Quality bullet list ends with):
```markdown
- Before each step: re-read relevant rules fresh, do not rely on earlier context
```

**After:**
```markdown
- Before each step: re-read relevant rules fresh, do not rely on earlier context
- **IDE classpath sync gotcha when modifying `pom.xml`.** If the IDE (IntelliJ, VS Code Java Extension Pack) prompts to sync Maven classpath mid-execution, decline ("No" / dismiss). Mid-execute syncs can corrupt the build (lock conflicts, partial dependency resolution, incomplete index). Sync MANUALLY via `./mvnw clean compile` after the step completes. Spec 3.5 tripped on this; documented as Spec 3.5 execution deviation.
```

---

### `.claude/skills/code-review/SKILL.md`

#### Edit CR-E1 — Proxy Additional Checks PACKAGE PATH NOTE rewritten (Stale-Hard)

**Before** (multi-paragraph dual-path framing):
```markdown
**PACKAGE PATH NOTE (critical at Forums Wave Phase 1):** The proxy package is currently `com.example.worshiproom.proxy` and becomes `com.worshiproom.proxy` after Phase 1 Spec 1.1 merges. The checks below reference the OLD path (`com.example.worshiproom.proxy`) — this is correct for the current state of `main`. **Post-Spec-1.1**, update every reference in this section: run condition, `@RestControllerAdvice` check, grep commands in this section, and the Run Condition header. Before running this review, check the actual current package with `ls backend/src/main/java/com/` and use that path in all checks below. If you see BOTH packages simultaneously during the Spec 1.1 review itself (the rename is in progress), the checks must pass for whichever package the advice lives in.

**Run Condition:** `backend/src/main/java/com/example/worshiproom/proxy/` (current) OR `backend/src/main/java/com/worshiproom/proxy/` (post-Spec-1.1).
```

**After:**
```markdown
**Package path:** Phase 1 Spec 1.1 ✅ renamed `com.example.worshiproom.proxy` → `com.worshiproom.proxy`. The `com/example/worshiproom/` path should NOT appear anywhere in the codebase post-Phase-1; if it does, that's a regression worth flagging.

**Run Condition:** `backend/src/main/java/com/worshiproom/proxy/`.
```

---

#### Edit CR-E2 — `@RestControllerAdvice` row dropped the "or post-Spec-1.1" parenthetical (Stale-Hard)

**Before:**
```markdown
| `@RestControllerAdvice` is scoped with `basePackages = "com.example.worshiproom.proxy"` (or `com.worshiproom.proxy` post-Spec-1.1) so it doesn't swallow exceptions from non-proxy controllers | OK / OVER-BROAD | {file}:{line} |
```

**After:**
```markdown
| `@RestControllerAdvice` is scoped with `basePackages = "com.worshiproom.proxy"` so it doesn't swallow exceptions from non-proxy controllers | OK / OVER-BROAD | {file}:{line} |
```

---

#### Edit CR-E3 — grep commands header dropped dual-path adjustment note (Stale-Hard)

**Before:**
```bash
# Adjust the package path below based on whether Phase 1 Spec 1.1 has merged:
#   BEFORE Spec 1.1: backend/src/main/java/com/example/worshiproom/
#   AFTER  Spec 1.1: backend/src/main/java/com/worshiproom/
# Run `ls backend/src/main/java/com/` on the current branch to see which applies.
```

**After:**
```bash
# Package path is com.worshiproom (Phase 1 Spec 1.1 ✅).
```

---

#### Edit CR-E4 — Backend Additional Checks: 8 new Phase 3 Addendum rows + grep commands with starter-heuristics annotation

8 new check rows appended after the existing "Drift detection test" row, each labeled `**Phase 3 Addendum #N — ...**` and mapping directly to addendum items 1, 2, 3, 4, 5, 6, 7, 8, 9 (10–12 are not flag-and-block-grade so didn't add).

Plus a new Recommended grep commands subsection with 3 starter heuristics. Per Eric's note, the heuristics are explicitly framed as a fast first pass, not exhaustive — the prose names the specific cases each grep misses (multi-line `@Modifying` annotations, `Map` subtypes other than `ConcurrentHashMap`, nested-class `Cache<K, V>` declarations, dynamically-instantiated maps).

**Snippet of grep-heuristics framing:**
```markdown
**Recommended grep commands for the Phase 3 Addendum gates** (these are starter heuristics — they catch the common violation shapes but are NOT exhaustive. Multi-line `@Modifying` annotations split across continuation lines, `Map` subtypes other than `ConcurrentHashMap`, nested-class `Cache<K, V>` declarations, and dynamically-instantiated maps will not be caught. Use them as a fast first pass; visually scan the diff for the patterns above when the grep is silent):
```

---

#### Edit CR-E5 — Worship Room Safety Checks: crisis check qualified with CrisisAlertService unified entry + new BB-45 multi-consumer row

**Before** (first row of Worship Room-Specific Safety Checks):
```markdown
| Crisis detection on user text inputs (Pray, Journal, Prayer Wall, Mood Check-In) | OK / MISSING / BYPASSED / N/A | {file}:{line} |
```

**After** (modified row + 1 new row inserted at position 2):
```markdown
| Crisis detection on user text inputs (Pray, Journal, Prayer Wall, Mood Check-In) routes through `CrisisAlertService.alert(contentId, authorId, ContentType)` (do NOT introduce sibling alert services per Phase 3 Addendum #7) | OK / MISSING / BYPASSED / SIBLING SERVICE / N/A | {file}:{line} |
| New multi-consumer reactive store has BB-45 cross-mount subscription test (mutate store after mount, assert re-render in separate consumer) per Phase 3 Addendum #12 | OK / MISSING / N/A | {file}:{line} |
```

---

## Verification spot-checks

After all edits applied:

| Check | Expected | Actual |
|---|---|---|
| `spec-forums` Step 4.5 section exists | Present | ✅ line 106 |
| `spec-forums` self-review checklist has 12 items | Present | ✅ line 194 confirms Pattern A item; total verified by reading |
| `plan-forums` Step 3 item 7 says "Phase 1 Spec 1.1 ✅" | Present | ✅ line 79 |
| `plan-forums` Step 3 item 11 says "v2.9 + ... Addendums" | Present | ✅ line 84 |
| `plan-forums` Universal Rules Rule 8 disambiguates Pattern A | Present | ✅ line 168 |
| `plan-forums` Self-Review has Phase 3 Addendum gates sub-heading | Present | ✅ line 399 |
| `plan-forums` Plan Tightening Audit + Divergences sections exist | Present | ✅ lines 323, 347 |
| `plan-forums` Step 3 has `[VERIFY]` handling | Present | ✅ line 86 |
| `execute-plan-forums` package path bullet says "Spec 1.1 ✅ shipped" | Present | ✅ line 129 |
| `execute-plan-forums` Critical Invariants has L1-cache trap | Present | ✅ line 132 |
| `execute-plan-forums` IDE classpath sync gotcha bullet | Present | ✅ line 276 |
| `code-review` Proxy section says "Spec 1.1 ✅ renamed" | Present | ✅ line 802 |
| `code-review` Backend Additional Checks has 8 new Phase 3 Addendum rows | Present | ✅ lines 766–774 |
| `code-review` Worship Room Safety has CrisisAlertService unified entry + BB-45 multi-consumer rows | Present | ✅ lines 502–503 |
| `code-review` grep heuristics framed as "starter heuristics" with named gaps | Present | ✅ line 780 |
| Pre-existing `com.example.worshiproom` references: only in "renamed FROM" historical context | Confirmed | ✅ remaining mentions are all `renamed from com.example.worshiproom` / `should NOT appear` defensive notes |

---

## Out of scope (per Eric's Tier 3 skip)

The following 3 edits were proposed in Pass 1 but skipped per Eric's instruction:

- **SF-E5** — spec-forums Rules section two-laptop note
- **PF-E9** — plan-forums Rules section two-laptop note + trust calibration framing
- **EX-E6** — execute-plan-forums Rules section two-laptop note

Two-laptop path variance is documented in user memory and surfaces rarely. Eric's call to skip these is the right minimal-scope move.

---

## Out of scope (flagged separately)

**Out-of-scope finding #6 from Pass 1** (spec-forums git branching default behavior): The `spec-forums` Step 3 currently switches to `main && pull` by default OR `--from-branch`. Eric's documented workflow is "Forums wave uses single `claude/forums/round3-forums-wave` branch, no per-spec sub-branches" (memory entry). The skill's `--from-branch` flag handles this case but the default behavior may be wrong for Forums Wave specs.

This is a workflow design choice, not drift correction. Per Eric's note, **flagged for separate discussion** — not part of this audit.

---

## Two-pass scoreboard

| Pass | File | Status |
|---|---|---|
| 1 (Discovery + Proposal) | `_audits/2026-04-28-skill-reality-drift.md` | ✅ produced 2026-04-28 |
| 2 (Apply) | This file + 4 modified skills | ✅ complete 2026-04-28 |

**Pass 2 result:** All 22 approved edits applied without regression. The 12 Phase 3 Execution Reality Addendum conventions are now propagated across the planning gate (`plan-forums` Self-Review + Plan Tightening Audit), the execution gate (`execute-plan-forums` Critical Invariants + IDE gotcha), and the review gate (`code-review` Backend Additional Checks + Worship Room Safety). Stale "Spec 1.1 hasn't merged yet" framing stripped from all three back-end-touching skills. Recon failure handling contract (`[VERIFY]` tags) coordinated between `spec-forums` and `plan-forums`. Plan template now carries Plan Tightening Audit + Plan-Time Divergences sections that ran ad-hoc in Phase 3 plans 3.5/3.6/3.7.

Phase 4+ specs running through the pipeline will inherit these conventions automatically.
