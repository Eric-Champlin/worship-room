# Skill Reality Drift — Pass 1 (Discovery + Proposed Edits combined)

**Generated:** 2026-04-28
**Branch:** `forums-wave-continued`
**Scope:** Five Forums Wave skills — `spec-forums`, `plan-forums`, `execute-plan-forums`, `code-review`, `verify-with-playwright`. Documentation-only audit. No source code edits.

**Method.** Read each skill in full against four lenses:

1. **Convention propagation** — Phase 3 conventions that should now be enforced in skills automatically (12 conventions from `_audits/2026-04-28-doc-reality-applied.md`)
2. **Workflow gotchas** — execution lessons from Spec 3.5/3.6/3.7 history
3. **Stale references** — pointers that have drifted (master plan version, file paths, anchors, package paths, spec-status references)
4. **Coverage gaps** — repeated lenses from Phase 3 Plan Tightening Audits / spec recon overrides not yet baked into the skills

Trust calibration: this audit corrects DRIFT, not design. Eric's workflow choices are intentional — surface, don't redesign.

**Two-pass.** Pass 1 = this document (discovery + proposed edits). Stop here. Eric prunes. Pass 2 = apply approved edits, write `_audits/2026-04-28-skill-reality-applied.md`.

---

## Quick severity legend

- **High** — Phase 3 patterns will silently break / drift in any future spec without this fix
- **Medium** — gap that compounds across phases; flagging is cheap, fixing is cheaper
- **Low** — cosmetic, opportunistic
- **Stale-Hard** — explicitly references obsolete state (e.g., "before Spec 1.1 merges" when Spec 1.1 has shipped)

---

## Inventory file map

| Skill | File | Size | Last mtime |
|---|---|---|---|
| spec-forums | `.claude/skills/spec-forums/SKILL.md` | 10.1 KB | Apr 24 |
| plan-forums | `.claude/skills/plan-forums/SKILL.md` | 22.3 KB | Apr 24 |
| execute-plan-forums | `.claude/skills/execute-plan-forums/SKILL.md` | 12.5 KB | Apr 24 |
| code-review | `.claude/skills/code-review/SKILL.md` | 37.8 KB | Apr 22 |
| verify-with-playwright | `.claude/skills/verify-with-playwright/SKILL.md` | 55.7 KB | Apr 22 |

All skills in single `SKILL.md` per directory — no `2`-suffixed variants. The version Eric uses is whichever is listed in CLAUDE.md's pipeline workflow:

```
/spec-forums → /plan-forums → /execute-plan-forums → /code-review → /verify-with-playwright
```

All five exist; all five are in audit scope.

---

## 1. `spec-forums`

### Lens 1 findings (convention propagation)

| # | Convention | Currently in skill? | Where it should appear | Severity |
|---|---|---|---|---|
| SF-L1.1 | "Schema realities — do NOT recreate" recon question | NO | Step 4 codebase recon (item 12) — add explicit recon question: "For each schema element this spec touches, does it already exist on disk in `backend/src/main/resources/db/changelog/`?" | High |
| SF-L1.2 | EditWindowExpired returns 409, not 400 | NO | Step 4 mandatory-context reads, OR new "Spec body verification" sub-step. Any spec that mentions an edit window must have its 409 status confirmed against the master plan body OR Phase 3 Execution Reality Addendum. | High |
| SF-L1.3 | `CrisisAlertService.alert(contentId, authorId, ContentType)` is the unified entry point | NO | Step 4 codebase recon — add "if spec touches user-generated content, recon must confirm `CrisisAlertService` is the integration point (not a sibling alert service)" | High |
| SF-L1.4 | INTERCESSION = 13 ActivityType values | NO | Step 4 codebase recon when spec touches activity types — add note that backend `ActivityType` and frontend `ACTIVITY_POINTS` must agree (drift-detection test) | Medium |
| SF-L1.5 | "Pattern A" disambiguation (subscription via standalone hook with `useSyncExternalStore`) | Implicit only | Spec template / Step 4 — add note: "Specs citing Pattern A must qualify it as Pattern A (subscription via standalone hook). There is NO Pattern A migration pattern; that ambiguity bit Spec 3.7." | Medium |
| SF-L1.6 | `@Modifying(clearAutomatically=true, flushAutomatically=true)` | N/A — implementation concern | (belongs in plan-forums + code-review) | — |
| SF-L1.7 | L1-cache trap | N/A — implementation concern | (belongs in plan-forums + execute + code-review) | — |
| SF-L1.8 | SecurityConfig rule ordering | N/A — implementation concern | (belongs in plan-forums + code-review) | — |
| SF-L1.9 | Caffeine-bounded bucket pattern | N/A — implementation concern | (belongs in plan-forums + code-review) | — |
| SF-L1.10 | Domain-scoped `@RestControllerAdvice` + unscoped companion | N/A — implementation concern | (belongs in plan-forums + code-review) | — |
| SF-L1.11 | Liquibase changeset filename convention | N/A — implementation concern | (belongs in plan-forums + execute) | — |
| SF-L1.12 | BB-45 cross-mount subscription test | N/A — implementation concern | (belongs in plan-forums + verify) | — |

### Lens 2 findings (workflow gotchas)

| # | Gotcha | Currently in skill? | Where it should appear | Severity |
|---|---|---|---|---|
| SF-L2.1 | Recon failure handling — when MCP tools fail, every claim about the codebase should be tagged for verification, NOT inlined as a divergence | NO | New section between Step 4 and Step 5 — "Recon failure handling: if MCP recon tools cannot run, prefix every codebase claim with `[VERIFY]` so the planner knows to confirm during plan-time recon. Do NOT inline divergences based on memory of code state." | Medium |
| SF-L2.2 | Two-laptop path confusion (work `/Users/eric.champlin/`, home `/Users/Eric/`) | NO | "Rules" section — add: "Paths in this skill are illustrative — verify the actual project root on the active machine before using them." | Low |
| SF-L2.3 | Trust calibration — when conflicts surface between brief and recon, "trust CC on what code does (codebase facts); trust Eric on what code should do (design choices)" | Implicit ("flag rather than fix") | Step 4 / Rules section — make explicit | Low |

### Lens 3 findings (stale references)

| # | Reference | Currently | Should be | Severity |
|---|---|---|---|---|
| SF-L3.1 | Master plan version cited | Not cited | Could add "v2.9 + Phase 1, Phase 2, and Phase 3 Execution Reality Addendums (addendums are AUTHORITATIVE over older spec body text where they disagree)" to Step 4 mandatory reads. CLAUDE.md and rules now carry this language; spec-forums should mirror. | Medium |
| SF-L3.2 | "Read `.claude/rules/11-local-storage-keys.md`" (line 92) | OK as-is | Optional addition: "and `11b-local-storage-keys-bible.md` for Bible / cache key patterns" | Low |

### Lens 4 findings (coverage gaps)

| # | Gap | Severity |
|---|---|---|
| SF-L4.1 | Spec 3.7 had 16 recon overrides (R1–R16). Most stemmed from "schema already shipped" or "package already exists" — both addressed by SF-L1.1 above. The remaining R-class drivers ("brief proposed `ReactionType` enum but `String + @Pattern` is the convention", "field naming `is*` prefix") are spec-author judgment calls. Skill could add a "Common Brief Errors" cheat list mirroring R1–R16 categories. | Medium |
| SF-L4.2 | spec-forums Step 6 self-review checklist has 7 items but doesn't include any recon-driven gates (e.g., "schema realities verified against `db/changelog/`"). | Medium |

### Proposed edits for `spec-forums`

```
ID: SF-E1
File: .claude/skills/spec-forums/SKILL.md
Drift: Step 4 codebase recon doesn't ask "does the schema/file/method this spec touches already exist on disk?"
Severity: High
Current text (Step 4, item 12):
12. **Existing code in `backend/` and `frontend/`** — understand what's already built so the spec references real files and patterns
Proposed text (replacement):
12. **Existing code in `backend/` and `frontend/`** — understand what's already built so the spec references real files and patterns. **For every schema element, file, package, method, or column the spec mentions creating, verify it does NOT already exist on disk:**
    - Liquibase changesets: `ls backend/src/main/resources/db/changelog/` — search for any prior changeset that already creates the table/column the spec proposes
    - Java packages / classes: `ls backend/src/main/java/com/worshiproom/{package}/` — Phase 3 specs repeatedly proposed creating files that already shipped in Spec 3.1 (`candle_count`, `reaction_type`), Spec 1.1 (`com.worshiproom` package), Spec 3.6 (`INTERCESSION` ActivityType)
    - Frontend stores / hooks: `grep -rn "{StoreName}" frontend/src/` — verify the store doesn't already exist
    - **Recon override pattern:** if any element already exists, mark it explicitly in the spec body as "Files already exist (do NOT recreate)" with the source spec/changeset cited — see Spec 3.7 Recon R1/R2/R3 for the canonical pattern
Reason: Spec 3.7's brief proposed schema migrations for columns already shipped by Spec 3.1. Adding 14 paragraphs of "actually this already exists" recon overrides is preventable if every brief author runs this recon question first.

---

ID: SF-E2
File: .claude/skills/spec-forums/SKILL.md
Drift: No prompt to verify edit-window status code (409, not 400) when spec mentions an edit window
Severity: High
Current text (in Step 4, conditional reads list):
**Conditionally mandatory (read if the spec touches the area):**

7. **`.claude/rules/06-testing.md`** — when the spec includes test specifications
Proposed text (insert before item 7, renumbering subsequent items):
**Conditionally mandatory (read if the spec touches the area):**

7. **Phase 3 Execution Reality Addendum** in `_forums_master_plan/round3-master-plan.md` — when the spec touches edit windows (return 409, not 400, with code `EDIT_WINDOW_EXPIRED` per addendum item 1), bulk JPQL UPDATE/DELETE (must use `@Modifying(clearAutomatically=true, flushAutomatically=true)` per item 3), SecurityConfig rules (method-specific rules ABOVE `OPTIONAL_AUTH_PATTERNS` per item 4), per-feature rate limits or idempotency caches (Caffeine-bounded pattern per item 5), domain advices (per item 6), user-generated content (must use `CrisisAlertService.alert(contentId, authorId, ContentType)` per item 7), or activity types (INTERCESSION makes total 13 per item 9). The addendum is AUTHORITATIVE over older spec body text where they disagree.
8. **`.claude/rules/06-testing.md`** — when the spec includes test specifications
Reason: Specs 6.6 (Mark-Answered PATCH), 8.1 (username PATCH), 12.3 (Notification Generators) all touch one or more of these conventions. Without the addendum reference, brief authors may carry pre-execution assumptions through to plan-forums.

---

ID: SF-E3
File: .claude/skills/spec-forums/SKILL.md
Drift: No "recon failure handling" section
Severity: Medium
Current text (Step 4 ends, Step 5 begins):
13. **Previous Forums Wave specs in `_specs/forums/`** — match depth, tone, and format of specs already written

---

## Step 5: Save the Spec
Proposed text (insert new mini-section between):
13. **Previous Forums Wave specs in `_specs/forums/`** — match depth, tone, and format of specs already written

---

## Step 4.5: Recon Failure Handling

**If recon tools (filesystem MCP, codebase grep, file reads) cannot run** — for example, the brief was authored from Claude Desktop without filesystem access, or MCP servers are down at brief-authoring time:

- **Do NOT inline unverified codebase claims as divergences.** Spec 3.7's brief proposed schema migrations for already-shipped columns because the brief author couldn't run `ls backend/src/main/resources/db/changelog/`. The result was 14 paragraphs of "actually this already exists" overrides at recon time.
- **Instead, prefix every codebase claim with `[VERIFY]`** so the planner (running `/plan-forums`) knows which claims to confirm during plan-time recon. Example: `[VERIFY] post_reactions has reaction_type column added by Spec 3.1 changeset 016`.
- **Trust calibration:** trust the codebase on what code DOES (facts); trust the brief author on what code SHOULD DO (design intent). When conflicts surface, the codebase wins for facts and Eric wins for direction.

---

## Step 5: Save the Spec
Reason: Spec 3.7 brief authoring lesson. Cheap to add, expensive when it bites.

---

ID: SF-E4
File: .claude/skills/spec-forums/SKILL.md
Drift: Step 6 self-review checklist doesn't enforce recon-driven gates
Severity: Medium
Current text (Step 6):
- [ ] Spec ID matches the master plan exactly
- [ ] All prerequisite specs are listed
- [ ] Universal Rules referenced where relevant
- [ ] Database changes include Liquibase changeset filenames
- [ ] API changes include endpoint paths and HTTP methods
- [ ] Acceptance criteria are present and testable
- [ ] Out of scope section exists
- [ ] **Affected Frontend Routes** section populated — either with the actual user-facing routes touched by this spec (one per line, backtick-wrapped, including query params), or with "N/A — backend-only spec" if no UI is involved. Required for `/verify-with-playwright` plan-only invocation downstream.
Proposed text (replacement):
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
Reason: Phase 3 conventions that should fire as gates at brief authoring time, not as code-review findings.

---

ID: SF-E5
File: .claude/skills/spec-forums/SKILL.md
Drift: No mention of two-laptop path variance
Severity: Low
Current text (Rules section):
## Rules

- **Stay in Act mode.** Do not enter Plan Mode.
Proposed text (insert as first bullet):
## Rules

- **Paths in this skill are illustrative.** Eric works from two machines: work laptop (`/Users/eric.champlin/worship-room/`) and home (`/Users/Eric/worship-room/`). Verify the actual project root on the active machine before using paths from this skill verbatim. The `_specs/forums/` and `_plans/forums/` directory names are stable; the prefix is not.
- **Stay in Act mode.** Do not enter Plan Mode.
Reason: Two-laptop confusion has bitten past briefs (per audit operating context).
```

---

## 2. `plan-forums`

### Lens 1 findings (convention propagation)

| # | Convention | Currently in skill? | Where it should appear | Severity |
|---|---|---|---|---|
| PF-L1.1 | `@Modifying(clearAutomatically=true, flushAutomatically=true)` on bulk JPQL UPDATE/DELETE | NO | Plan Quality Self-Review Checklist (Step 4); Architecture Context bullet for backend specs | High |
| PF-L1.2 | L1-cache trap on `save → flush → findById` | NO | Plan Quality Self-Review Checklist; Architecture Context | High |
| PF-L1.3 | SecurityConfig rule ordering (method-specific BEFORE `OPTIONAL_AUTH_PATTERNS`; nested paths need own rules) | NO | Plan Quality Self-Review Checklist; Spec-Category-Specific Guidance for backend-only specs | High |
| PF-L1.4 | EditWindowExpired returns 409 not 400 | NO | Edge Cases & Decisions template; Spec-Category-Specific Guidance | High |
| PF-L1.5 | `CrisisAlertService.alert(contentId, authorId, ContentType)` unified entry | NO | Architecture Context bullet "if user-generated content"; Plan Quality Self-Review | High |
| PF-L1.6 | INTERCESSION = 13 ActivityType total; drift-detection between frontend & backend | Partial (Decision 12 ref) | Spec-Category-Specific Guidance — DUAL-WRITE section already mentions drift-detection; extend explicitly to ActivityType cases | Medium |
| PF-L1.7 | Schema realities — do NOT recreate | Partial (line 81 changeset uniqueness check via `ls`) | Architecture Context — extend bullet 9 to "verify shipped schema for any table/column the spec touches before assuming new work" | High |
| PF-L1.8 | Caffeine-bounded bucket pattern + `@ConfigurationProperties` shape | NO | Architecture Context bullet for backend specs that introduce per-feature rate limits / idempotency / counter caches | High |
| PF-L1.9 | Domain-scoped `@RestControllerAdvice` + unscoped companion advice for filter-raised exceptions | NO | Plan Quality Self-Review Checklist; Architecture Context | High |
| PF-L1.10 | "Pattern A" disambiguation | Used loosely (line 161 "BB-45 anti-pattern forbidden... reactive store consumers use the hook") | Universal Rules Checklist Rule 8 — qualify "Pattern A" → "Pattern A (subscription via standalone hook with `useSyncExternalStore`)" everywhere it appears | Medium |
| PF-L1.11 | Liquibase changeset filename convention (today's date, next sequence) | Partial — line 81 mentions uniqueness check | Architecture Context bullet 9 — clarify "filename = today's actual date + next available sequence number; master plan body uses `YYYY-MM-DD-NNN-` placeholders illustratively" | Medium |
| PF-L1.12 | BB-45 cross-mount subscription test for new multi-consumer features | Partial (Universal Rules Checklist Rule 8) | Spec-Category-Specific Guidance — add explicit test specification for any spec that introduces a localStorage-backed multi-consumer reactive store (Spec 6.9, 11.3, 16.1b are upcoming candidates) | Medium |

### Lens 2 findings (workflow gotchas)

| # | Gotcha | Currently in skill? | Where it should appear | Severity |
|---|---|---|---|---|
| PF-L2.1 | Recon failure handling at plan-time (when spec brief was authored without filesystem access, plan must verify every codebase claim) | Partial — Step 3 has codebase recon | Step 3 — add explicit handling: "If the spec contains `[VERIFY]`-tagged claims (per spec-forums Step 4.5), the plan MUST resolve every one with on-disk verification before proceeding to Step 4." Also handle the inverse case: spec body claims X exists but recon shows it doesn't. | Medium |
| PF-L2.2 | Two-laptop paths | NO | Rules section — same note as spec-forums | Low |
| PF-L2.3 | Trust calibration | Implicit ("If ambiguous, note in Assumptions rather than guessing") | Rules section — make the "trust CC on facts, Eric on design" framing explicit | Low |

### Lens 3 findings (stale references)

| # | Reference | Currently | Should be | Severity |
|---|---|---|---|---|
| PF-L3.1 | Step 3 item 7 — package path framing | "current package is `backend/src/main/java/com/example/worshiproom/` until Phase 1 Spec 1.1 renames it to `backend/src/main/java/com/worshiproom/`. Use the old path for specs that execute BEFORE Spec 1.1 (Phase 0, Phase 0.5, and Spec 1.1 itself); use the new path for specs that execute AFTER Spec 1.1 (every Phase 1.2+ spec through Phase 16). If unsure, grep the current repo: `ls backend/src/main/java/com/` will show which package actually exists on the current branch." | "Package is `com.worshiproom`. Phase 1 Spec 1.1 ✅ renamed from `com.example.worshiproom` (covered ~60+ proxy files + tests + `pom.xml` `groupId` + Docker image tags). The new path is canonical everywhere — `com/example/worshiproom/` should not appear anywhere in the codebase post-Phase-1; if it does, that's a regression. The grep fallback (`ls backend/src/main/java/com/`) still applies if anything seems off." | Stale-Hard |
| PF-L3.2 | Step 3 item 11 — OpenAPI provenance | "shipped by Key Protection Wave with shared schemas `ProxyResponse` + `ProxyError` and 10+ proxy endpoints... that path was provisional in master plan v2.6, superseded by v2.7; current as of v2.8" | Should be "**v2.9 + Phase 1, Phase 2, and Phase 3 Execution Reality Addendums** — addendums are AUTHORITATIVE over older spec body text where they disagree" | Stale-Hard |
| PF-L3.3 | Universal Rules Checklist Rule 8 wording | "Pattern A or Pattern B" — unqualified | "Pattern A (subscription via standalone hook with `useSyncExternalStore`) preferred for new code; Pattern B (inline `subscribe()`) acceptable for legacy compatibility. There is NO Pattern A migration pattern" | Medium |
| PF-L3.4 | Test count guidance | None encoded in skill | Phase 3 reality is 30-50 tests for medium-large specs (Spec 3.5: 85, Spec 3.6: 67, Spec 3.7: ~49). Master plan says "≥15 integration tests" minimum. If skill should encode a bound, document Phase 3 reality. (Optional — currently the skill defers to plan template's Test specifications field.) | Low |

### Lens 4 findings (coverage gaps)

| # | Gap | Severity |
|---|---|---|
| PF-L4.1 | Phase 3 plans (3.5/3.6/3.7) all carried a "Plan Tightening Audit" section with ~15 lenses (schema state explicit, existing entity reuse, SQL-side counter updates, activity-on-add-only, SecurityConfig rule ordering, validation surface, Pattern A clarification, BB-45 subscription test impact, step dependency map, test count vs brief, plan-time divergences, L1-cache trap). The plan-forums skill should include this audit structure as a template — either as a new "Plan Tightening Audit" subsection in the plan template, or as additional self-review-checklist items. | Medium-High |
| PF-L4.2 | "Plan-Time Divergences from Brief" section ran in all three Phase 3 plans (3.5/3.6/3.7) — useful for capturing planner judgment calls not in the brief. Not in plan template. | Medium |
| PF-L4.3 | Spec 3.7 plan needed to flag a test count overrun (~49 vs ~30 brief target) for Eric's review. Plan template doesn't structure that decision moment. | Low |

### Proposed edits for `plan-forums`

```
ID: PF-E1
File: .claude/skills/plan-forums/SKILL.md
Drift: Step 3 item 7 (package path) is stale post-Spec-1.1
Severity: Stale-Hard
Current text:
7. **Existing backend code** — current package is `backend/src/main/java/com/example/worshiproom/` until Phase 1 Spec 1.1 renames it to `backend/src/main/java/com/worshiproom/`. Use the old path for specs that execute BEFORE Spec 1.1 (Phase 0, Phase 0.5, and Spec 1.1 itself); use the new path for specs that execute AFTER Spec 1.1 (every Phase 1.2+ spec through Phase 16). If unsure, grep the current repo: `ls backend/src/main/java/com/` will show which package actually exists on the current branch.
Proposed text:
7. **Existing backend code** — package is `com.worshiproom`. Phase 1 Spec 1.1 ✅ renamed from `com.example.worshiproom` (covered ~60+ proxy files + tests + `pom.xml` `groupId` + Docker image tags). The new path is canonical everywhere — `com/example/worshiproom/` should NOT appear anywhere in the codebase post-Phase-1; if it does, that's a regression. The grep fallback (`ls backend/src/main/java/com/`) still applies if anything seems off.
Reason: Spec 1.1 has shipped (per CLAUDE.md, spec-tracker.md, and on-disk verification — `ls backend/src/main/java/com/worshiproom/` shows the canonical path). The "before/after" framing is now history.

---

ID: PF-E2
File: .claude/skills/plan-forums/SKILL.md
Drift: Step 3 item 11 (OpenAPI provenance) cites stale master plan version v2.8
Severity: Stale-Hard
Current text:
11. **Existing OpenAPI spec** — `backend/src/main/resources/openapi.yaml` ALREADY EXISTS (shipped by Key Protection Wave with shared schemas `ProxyResponse` + `ProxyError` and 10+ proxy endpoints). Forums Wave specs EXTEND this file — add new paths that `$ref` the shared components; do NOT create a new file at `backend/api/openapi.yaml` (that path was provisional in master plan v2.6, superseded by v2.7; current as of v2.8).
Proposed text:
11. **Existing OpenAPI spec** — `backend/src/main/resources/openapi.yaml` ALREADY EXISTS (shipped by Key Protection Wave with shared schemas `ProxyResponse` + `ProxyError` and 10+ proxy endpoints; extended by Phase 3 Specs 3.3–3.7 with the unified `posts` family). Forums Wave specs EXTEND this file — add new paths that `$ref` the shared components; do NOT create a new file at `backend/api/openapi.yaml` (that path was provisional in master plan v2.6, superseded by v2.7; **current as of v2.9 + Phase 1, Phase 2, and Phase 3 Execution Reality Addendums** — addendums are AUTHORITATIVE over older spec body text where they disagree).
Reason: CLAUDE.md and rules now consistently reference the addendum-authoritative framing. plan-forums should mirror.

---

ID: PF-E3
File: .claude/skills/plan-forums/SKILL.md
Drift: Universal Rules Checklist Rule 8 doesn't disambiguate "Pattern A"
Severity: Medium
Current text:
- [ ] Rule 8: BB-45 anti-pattern forbidden (reactive store consumers use the hook, not mirrored `useState`; tests mutate store after mount)
Proposed text:
- [ ] Rule 8: BB-45 anti-pattern forbidden (reactive store consumers use the hook, not mirrored `useState`; tests mutate store after mount). New stores prefer **Pattern A (subscription via standalone hook with `useSyncExternalStore`)** per `11b-local-storage-keys-bible.md` § "Reactive Store Consumption". There is NO "Pattern A migration pattern" — that ambiguity bit Spec 3.7's brief authoring; "Pattern A" always means subscription via standalone hook.
Reason: Spec 3.7 had to add a recon override (R5/R10) to clarify the ambiguity. Master plan A6 fix already added "(subscription via standalone hook)" qualifier in 4 anchor occurrences; plan-forums skill should mirror.

---

ID: PF-E4
File: .claude/skills/plan-forums/SKILL.md
Drift: Plan Quality Self-Review Checklist missing Phase 3 conventions (5 high-severity additions)
Severity: High
Current text (Plan Quality Self-Review Checklist, items 1–14):
**Before saving, verify ALL of these:**

1. [ ] Every step has: exact file paths, method signatures, DO NOT guardrails, test specs, verification commands
2. [ ] **No tentative language** — no "should probably", "might want to", "consider doing"
3. [ ] Patterns match what was found in reconnaissance, not assumed from general knowledge
4. [ ] Universal Rules checklist populated with rules relevant to this spec
5. [ ] **Affected Frontend Routes** section populated — either with the actual user-facing routes touched by this spec (one per line, backtick-wrapped, including query params), or with "N/A — backend-only spec" if no UI is involved. Required for `/verify-with-playwright` plan-only invocation.
6. [ ] Every Liquibase changeset filename is unique (checked against existing changesets in `db/changelog/`)
7. [ ] Every API endpoint follows the standard response shape from `03-backend-standards.md`
8. [ ] Backend verification includes compile + test commands for every backend step
9. [ ] Frontend verification includes build + test + visual check for every frontend step
10. [ ] Steps are small — each touches ≤3 files and is independently verifiable
11. [ ] Steps are ordered for safety — database migrations before services, services before controllers, backend before frontend
12. [ ] Test count calibrated to complexity (simple utility: 2-4; complex service with edge cases: 10-15)
13. [ ] Edge Cases & Decisions table populated
14. [ ] No deprecated patterns introduced (check `09-design-system.md` § "Deprecated Patterns" for frontend steps)
Proposed text (replacement, adding items 15–22):
**Before saving, verify ALL of these:**

1. [ ] Every step has: exact file paths, method signatures, DO NOT guardrails, test specs, verification commands
2. [ ] **No tentative language** — no "should probably", "might want to", "consider doing"
3. [ ] Patterns match what was found in reconnaissance, not assumed from general knowledge
4. [ ] Universal Rules checklist populated with rules relevant to this spec
5. [ ] **Affected Frontend Routes** section populated — either with the actual user-facing routes touched by this spec (one per line, backtick-wrapped, including query params), or with "N/A — backend-only spec" if no UI is involved. Required for `/verify-with-playwright` plan-only invocation.
6. [ ] Every Liquibase changeset filename is unique (checked against existing changesets in `db/changelog/`). **Filename uses today's date + next available sequence number** (master plan body uses `YYYY-MM-DD-NNN-` placeholders illustratively; real filenames use the execution date — Spec 3.1 Plan Deviation #1).
7. [ ] Every API endpoint follows the standard response shape from `03-backend-standards.md`
8. [ ] Backend verification includes compile + test commands for every backend step
9. [ ] Frontend verification includes build + test + visual check for every frontend step
10. [ ] Steps are small — each touches ≤3 files and is independently verifiable
11. [ ] Steps are ordered for safety — database migrations before services, services before controllers, backend before frontend
12. [ ] Test count calibrated to complexity (simple utility: 2-4; complex service with edge cases: 10-15). Phase 3 reality for medium-large specs is 30-50 tests; if your plan is far below or above, justify in the Edge Cases & Decisions table.
13. [ ] Edge Cases & Decisions table populated
14. [ ] No deprecated patterns introduced (check `09-design-system.md` § "Deprecated Patterns" for frontend steps)
15. [ ] **Phase 3 Addendum item 1 — EditWindowExpired returns 409, not 400.** Any edit-window-bearing endpoint (PATCH posts, PATCH comments, future username/profile/testimony PATCH) returns `409 CONFLICT` with code `EDIT_WINDOW_EXPIRED`. Exempt operations (mark-answered, status transitions, moderator actions) bypass the window per Spec 3.5's exempt-operations list.
16. [ ] **Phase 3 Addendum item 2 — L1-cache trap fixed.** For any create-endpoint that returns a DTO including DB-default-populated columns (`created_at`, `updated_at`), service layer calls `entityManager.refresh(saved)` after `save()` and before DTO mapping. Test specs include a "non-null timestamp in create response body" assertion as regression guard.
17. [ ] **Phase 3 Addendum item 3 — `@Modifying(clearAutomatically=true, flushAutomatically=true)`** on every new bulk JPQL UPDATE/DELETE method. Without these flags, subsequent reads in the same transaction return stale entities; pending in-memory changes don't reach the DB before the bulk update fires. Used 11 times across `PostRepository`/`BookmarkRepository`/`ReactionRepository`.
18. [ ] **Phase 3 Addendum item 4 — SecurityConfig method-specific rules ordered ABOVE `OPTIONAL_AUTH_PATTERNS.permitAll()`.** Spring Security is first-match-wins. Nested paths (`/api/v1/posts/*/reactions`) need their OWN explicit rules — `/api/v1/posts/*` does NOT match nested paths because Spring's `AntPathMatcher` treats `*` as one path segment. See `03-backend-standards.md` § "SecurityConfig rule ordering" for the canonical Java example.
19. [ ] **Phase 3 Addendum item 5 — Caffeine-bounded bucket pattern** for any per-feature rate limit / idempotency / counter cache. `@ConfigurationProperties(prefix = "worshiproom.{feature}")` reading from `application-{profile}.properties`. Never `ConcurrentHashMap` keyed on external input. Phase 3 canonical references: `PostsRateLimitConfig`, `PostsIdempotencyService`, `CommentsRateLimitConfig`, `BookmarksRateLimitConfig`, `ReactionsRateLimitConfig`.
20. [ ] **Phase 3 Addendum item 6 — Domain-scoped `@RestControllerAdvice`** for the new domain (`com.worshiproom.{domain}`) + unscoped companion advice (single-exception-class) for any filter-raised exceptions. Do NOT extend `PostExceptionHandler` for non-post domains.
21. [ ] **Phase 3 Addendum item 7 — `CrisisAlertService.alert(contentId, authorId, ContentType)` is the unified entry point** for crisis-flag handling. Phase 4 testimony/question/discussion/encouragement, Phase 12.5 mention parsing, Phase 13 personal insights aggregations all extend `ContentType` rather than introducing sibling alert services.
22. [ ] **Phase 3 Addendum item 8 — schema realities verified.** For every `CREATE TABLE` / `ALTER TABLE` proposed in the Database Changes table, recon confirmed it does NOT already exist on disk. Specs 3.7 / 3.9 / Phase 4 / Phase 6.6 are at risk; see addendum item 8 for the authoritative "do NOT recreate" list.
Reason: Direct propagation of the 12 conventions from `_audits/2026-04-28-doc-reality-applied.md` Phase 3 Execution Reality Addendum into the plan self-review surface. Without these checks, Phase 4+ plans will silently re-introduce the patterns Phase 3 just rooted out.

---

ID: PF-E5
File: .claude/skills/plan-forums/SKILL.md
Drift: Step 3 item 9 (Liquibase recon) doesn't mention "schema realities — do NOT recreate"
Severity: High
Current text:
9. **Existing Liquibase changesets** — `backend/src/main/resources/db/changelog/` for naming and ordering. Before assigning a new changeset filename, run `ls backend/src/main/resources/db/changelog/` and confirm no existing file has the same `YYYY-MM-DD-NNN` prefix as yours. A collision will cause Liquibase checksum failure on deploy.
Proposed text:
9. **Existing Liquibase changesets** — `backend/src/main/resources/db/changelog/` for naming and ordering. Before assigning a new changeset filename, run `ls backend/src/main/resources/db/changelog/` and confirm no existing file has the same `YYYY-MM-DD-NNN` prefix as yours. A collision will cause Liquibase checksum failure on deploy. **Filename = today's actual date + next available sequence number** (master plan body uses `YYYY-MM-DD-NNN-` placeholders illustratively; per Spec 3.1 Plan Deviation #1).
   - **Before adding ANY new changeset, verify the schema element doesn't already exist.** Phase 3 has shipped many tables/columns that future specs may try to recreate. Authoritative reference: `_forums_master_plan/round3-master-plan.md` § "Phase 3 Execution Reality Addendum" item 8 lists all known "do NOT recreate" elements (`posts.candle_count`, `post_reactions.reaction_type`, the 5 denormalized counters, `qotd_questions`, `post_reports.review_consistency`, the friends/social/milestone tables, `user_mutes`). For any element the spec proposes creating, grep the existing changesets for the table/column name FIRST.
Reason: Spec 3.7's brief proposed schema migrations for already-shipped columns; this is the recon question that would have caught it.

---

ID: PF-E6
File: .claude/skills/plan-forums/SKILL.md
Drift: Spec-Category-Specific Guidance for BACKEND-ONLY spec doesn't reference Phase 3 conventions
Severity: High
Current text (Spec-Category-Specific Guidance, BACKEND-ONLY section):
### If this is a BACKEND-ONLY spec (schema, service, endpoint, migration with no UI)

The "Affected Frontend Routes" section is `N/A — backend-only spec`. `/verify-with-playwright` will skip visual verification. Focus on:

1. Liquibase changeset with rollback block (Rule 3)
2. Testcontainers integration test (06-testing.md — never H2)
3. OpenAPI spec EXTENSION, not creation (Rule 4 — `backend/src/main/resources/openapi.yaml` already exists)
4. JPA entity + repository + service + controller with standard response shape
5. Rate limiting on all endpoints (Rule 15)
Proposed text (replacement):
### If this is a BACKEND-ONLY spec (schema, service, endpoint, migration with no UI)

The "Affected Frontend Routes" section is `N/A — backend-only spec`. `/verify-with-playwright` will skip visual verification. Focus on:

1. Liquibase changeset with rollback block (Rule 3) AND verified to NOT recreate already-shipped schema (see Phase 3 Execution Reality Addendum item 8)
2. Testcontainers integration test extending `AbstractIntegrationTest` (06-testing.md — never H2; never per-class containers; reuse the singleton from Spec 1.7)
3. OpenAPI spec EXTENSION, not creation (Rule 4 — `backend/src/main/resources/openapi.yaml` already exists at ~2700+ lines after Phase 3)
4. JPA entity + repository + service + controller with standard response shape from `03-backend-standards.md`
5. Rate limiting on all endpoints (Rule 15) — use the **Caffeine-bounded bucket pattern** + `@ConfigurationProperties(prefix = "worshiproom.{feature}")` per Phase 3 Addendum item 5. Never `ConcurrentHashMap` keyed on external input.
6. **SecurityConfig method-specific rules ordered ABOVE `OPTIONAL_AUTH_PATTERNS.permitAll()`** per addendum item 4. Nested paths (`/api/v1/posts/*/reactions`) need their own explicit rules — `*` matches one segment only.
7. **Domain-scoped `@RestControllerAdvice`** for the new domain (`com.worshiproom.{domain}`); unscoped companion advice for any filter-raised exceptions per addendum item 6.
8. **Bulk JPQL UPDATE/DELETE methods MUST use `@Modifying(clearAutomatically=true, flushAutomatically=true)`** per addendum item 3.
9. **Create-endpoint integration tests assert non-null timestamps in response body** as regression guard for the L1-cache trap per addendum item 2. Service layer calls `entityManager.refresh(saved)` after `save()`.
10. **Edit-window endpoints return 409 `EDIT_WINDOW_EXPIRED`** (not 400) per addendum item 1.
11. **User-generated-content endpoints route crisis flags through `CrisisAlertService.alert(contentId, authorId, ContentType)`** per addendum item 7. Do NOT introduce sibling alert services.
Reason: Backend-only specs are the dominant Phase 4–16 category. Each Phase 3 convention they should follow is currently invisible at planning time.

---

ID: PF-E7
File: .claude/skills/plan-forums/SKILL.md
Drift: Plan template has no "Plan Tightening Audit" or "Plan-Time Divergences from Brief" section, despite both running in all three Phase 3 plans
Severity: Medium-High
Current text (in plan template, between "Implementation Steps" structure and "Step Dependency Map"):
**Expected state after completion:**
- [ ] {specific verifiable outcome}

---

### Step 2: {title}

{same structure}

---

## Step Dependency Map
Proposed text (insert new sections between Steps and Step Dependency Map):
**Expected state after completion:**
- [ ] {specific verifiable outcome}

---

### Step 2: {title}

{same structure}

---

## Plan Tightening Audit

After drafting all steps, audit the plan against these lenses (Phase 3 plans 3.5/3.6/3.7 each ran ~15 lenses; below are the ones that catch real drift). Mark each as **OK**, **FIXED** (audit caught and corrected during planning), **N/A**, or **FLAGGED for Eric's review** (deviation from brief that needs explicit go-ahead).

1. **Schema state explicit.** For every schema element this spec touches, the plan states whether it's already shipped (cite changeset) OR is being newly created.
2. **Existing entity / class / file reuse.** No step says "create X" when X already exists in the codebase per recon.
3. **SQL-side counter updates everywhere.** All counter mutations route through `@Modifying @Query` JPQL UPDATE statements — never load-modify-save.
4. **Activity engine — fire on ADD / mutation only, not on REMOVE / undo.** No negative points.
5. **SecurityConfig rule ordering.** Method-specific `.authenticated()` rules placed BEFORE `OPTIONAL_AUTH_PATTERNS.permitAll()`. Nested paths get their own explicit rules.
6. **Validation surface at controller boundary.** `@Pattern` / `@Valid` annotations reject bad input at the boundary; never let DB CHECK constraints be the validation surface (produces 500 with leaky stack trace).
7. **Pattern A clarification.** Any reference to "Pattern A" qualifies it as "Pattern A (subscription via standalone hook with `useSyncExternalStore`)". There is NO Pattern A migration pattern.
8. **BB-45 cross-mount subscription test.** New multi-consumer reactive stores have a test that mutates the store after mount and asserts re-render in a separate consumer.
9. **Step dependency map.** Every step lists what it depends on; independent steps are flagged as parallelizable.
10. **Test count vs brief.** Plan total within ±5 of the brief target; explain overruns / underruns.
11. **L1-cache trap.** Create-endpoint flows that return DB-default-populated timestamps include `entityManager.refresh(saved)` and a non-null-timestamp test assertion.
12. **`@Modifying` flags complete.** Every `@Modifying @Query` carries both `clearAutomatically=true` and `flushAutomatically=true`.
13. **Caffeine-bounded caches.** Per-user / per-IP / per-key caches use the Caffeine bounded pattern + `@ConfigurationProperties`, never `ConcurrentHashMap` keyed on external input.
14. **Domain-scoped advice.** New domain has its own `@RestControllerAdvice(basePackages = "com.worshiproom.{domain}")`; filter-raised exceptions have unscoped companion advice or `HandlerExceptionResolver` delegation.
15. **Crisis content via `CrisisAlertService`.** User-generated-content endpoints extend `ContentType` rather than introducing sibling alert services.

If any lens finds drift, fix it in the plan body BEFORE saving. Document the fix in this audit section so Eric can see what was caught.

---

## Plan-Time Divergences from Brief

Decisions made during planning that are NOT in the brief or recon overrides — capture each with reasoning so Eric (and future-you) can audit the planner judgment calls.

| # | Decision | Reason | Reversible? |
|---|---|---|---|
| 1 | {e.g., "Field order in extended DTO is X, not Y"} | {e.g., "Keeps related fields adjacent; mirrored in generated TypeScript"} | {Yes/No} |

If empty, write "No plan-time divergences from brief — plan reflects brief + recon overrides exactly."

---

## Step Dependency Map
Reason: All three Phase 3 plans (3.5/3.6/3.7) ran a Plan Tightening Audit and a Plan-Time Divergences from Brief section. Both consistently caught real drift before execution. Encoding them in the template means Phase 4+ plans inherit the discipline automatically.

---

ID: PF-E8
File: .claude/skills/plan-forums/SKILL.md
Drift: No "recon failure handling" coordination with spec-forums
Severity: Medium
Current text (Step 3, after item 11):
**For backend-heavy specs, discover:**
Proposed text (insert new mini-section before):
**Before exhaustive recon — handle `[VERIFY]` claims from the spec.**

If the spec was authored without filesystem access (per spec-forums Step 4.5), it may contain claims tagged `[VERIFY]`. The plan MUST resolve every one with on-disk verification before drafting steps. Conversely, if the spec body claims "X exists" but recon shows X doesn't (or vice versa), trust the codebase for facts and surface the discrepancy in the plan's Edge Cases & Decisions table — do NOT silently align with the spec's wrong claim.

**Trust calibration:** trust CC on what code DOES (codebase facts); trust the spec author on what code SHOULD DO (design intent). When facts and intent collide, surface the conflict in the plan rather than guessing.

**For backend-heavy specs, discover:**
Reason: Closes the loop with spec-forums Step 4.5 (recon failure handling). Spec 3.7 plan needed 16 recon overrides in the SPEC because the spec had unverified claims; plan-forums needs to do the verification work either way.

---

ID: PF-E9
File: .claude/skills/plan-forums/SKILL.md
Drift: Rules section doesn't mention two-laptop paths or trust calibration
Severity: Low
Current text (Rules section):
- **Stay in Act mode.** Do not enter Plan Mode.
Proposed text (insert as first two bullets):
- **Paths in this skill are illustrative.** Eric works from two machines: work laptop (`/Users/eric.champlin/worship-room/`) and home (`/Users/Eric/worship-room/`). Verify the actual project root on the active machine before using paths from this skill verbatim. The `_specs/forums/` and `_plans/forums/` directory names are stable; the prefix is not.
- **Trust calibration.** Trust CC on what code DOES (codebase facts: file existence, method signatures, schema state). Trust Eric on what code SHOULD DO (design intent, conventions). When the spec's claim about the codebase contradicts what recon shows, the codebase wins and the plan surfaces the discrepancy.
- **Stay in Act mode.** Do not enter Plan Mode.
Reason: Both gotchas have surfaced in Phase 1 / Phase 3 work; small note keeps them top-of-mind.
```

---

## 3. `execute-plan-forums`

### Lens 1 findings (convention propagation)

| # | Convention | Currently in skill? | Where it should appear | Severity |
|---|---|---|---|---|
| EX-L1.1 | `@Modifying(...)` flags warning when entity has bulk JPQL methods | NO | Step 4e Critical Invariants — add bullet | Medium |
| EX-L1.2 | L1-cache trap warning when entity has DB-default-populated columns | NO | Step 4e Critical Invariants — add bullet | High |
| EX-L1.3 | SecurityConfig rule ordering verification when SecurityConfig is touched | NO | Step 4e Critical Invariants — add bullet | High |
| EX-L1.4 | EditWindowExpired 409 — verification on PATCH endpoints | NO | (caught at code-review; skip for execute) | — |
| EX-L1.5 | CrisisAlertService unified entry | NO | Step 4e Critical Invariants — add when user-generated content present | Medium |
| EX-L1.6 | INTERCESSION = 13 ActivityType | NO | Step 4e Critical Invariants — note when ActivityType touched | Medium |
| EX-L1.7 | Schema realities — verify column doesn't exist before writing migration | NO | Step 4e — for Liquibase steps, "before writing the changeset, grep db/changelog/ for the table/column" | High |
| EX-L1.8 | Caffeine bounded bucket pattern | NO | (caught at planning + code-review; skip for execute) | — |
| EX-L1.9 | Domain-scoped advice | Partial — Step 4e current bullet is STALE (mentions Spec 1.1 rename in present tense) | Replace with the post-Spec-1.1 reality | Stale-Hard |
| EX-L1.10 | Pattern A | N/A for execute | — |
| EX-L1.11 | Liquibase changeset filename = today's date + next sequence | NO | Step 4e — for Liquibase steps | Medium |
| EX-L1.12 | BB-45 cross-mount test | N/A for execute | — |

### Lens 2 findings (workflow gotchas)

| # | Gotcha | Currently in skill? | Where it should appear | Severity |
|---|---|---|---|---|
| EX-L2.1 | IDE classpath sync gotcha during pom.xml changes (Spec 3.5 lesson — pick "No" during execute, sync manually after) | NO | Step 4e Critical Invariants OR Rules section | High |
| EX-L2.2 | Pre-execution safety backup branch | YES — Step 3 lines 56-61 | (already present, no action) | OK |
| EX-L2.3 | Recon failure handling | N/A — handled in spec-forums + plan-forums | — |
| EX-L2.4 | Two-laptop paths | NO | Rules section | Low |
| EX-L2.5 | Trust calibration | YES — Step 4e "Hierarchy of authority" | (already present, optional explicit framing addition) | Low |

### Lens 3 findings (stale references)

| # | Reference | Currently | Should be | Severity |
|---|---|---|---|---|
| EX-L3.1 | Step 4e Critical Invariants — package path bullet | "current package is `com.example.worshiproom` until Phase 1 Spec 1.1 merges. Specs executing before Spec 1.1 use the old path; specs after use `com.worshiproom`. When in doubt, check the actual current package with `ls backend/src/main/java/com/` before writing new Java files." | "Package is `com.worshiproom`. Phase 1 Spec 1.1 ✅ shipped. The `com/example/worshiproom/` path should not appear anywhere in the codebase post-Phase-1; if it does, that's a regression. Sanity check with `ls backend/src/main/java/com/` if anything seems off." | Stale-Hard |
| EX-L3.2 | Step 4e Critical Invariants — `@RestControllerAdvice` scoping | "proxy advice is package-scoped (`basePackages = \"com.example.worshiproom.proxy\"`). Do NOT create a globally-scoped advice for proxy concerns; do NOT broaden the existing advice to catch non-proxy exceptions. Update the `basePackages` value as part of the Spec 1.1 rename (it becomes `com.worshiproom.proxy`)." | "Proxy advice is package-scoped (`@RestControllerAdvice(basePackages = \"com.worshiproom.proxy\")`). Domain advices follow the same pattern — `com.worshiproom.post` for Phase 3, future `com.worshiproom.moderation`/`com.worshiproom.notification`/`com.worshiproom.email` for Phase 10/12/15. Do NOT create globally-scoped advice for domain concerns; do NOT broaden an existing advice to catch sibling-package exceptions. Filter-raised exceptions need an unscoped companion advice (single exception type) per `03-backend-standards.md` § `@RestControllerAdvice` Scoping." | Stale-Hard |
| EX-L3.3 | Step 4e Critical Invariants — OpenAPI spec location wording | "EXTEND this file. Do NOT create a new file at `backend/api/openapi.yaml` (stale provisional path from master plan v2.6; corrected in v2.7 and confirmed in v2.8)." | "EXTEND this file. Do NOT create a new file at `backend/api/openapi.yaml` (stale provisional path from master plan v2.6; corrected in v2.7, confirmed in v2.8, **canonical as of v2.9 + Phase 1, Phase 2, and Phase 3 Execution Reality Addendums**)." | Medium |

### Lens 4 findings (coverage gaps)

| # | Gap | Severity |
|---|---|---|
| EX-L4.1 | No "deviation logging" structure for Execution Log entries when reality diverges from plan. Spec 3.5 Execution Log captured 2 deviations as inline notes; codified template would help future executors. | Low |
| EX-L4.2 | Step 4i continuation message doesn't include a "remaining backend tests pass / no regression" sanity check between steps. Phase 3 specs hit ~720 baseline; new spec failures should fail fast. | Medium |

### Proposed edits for `execute-plan-forums`

```
ID: EX-E1
File: .claude/skills/execute-plan-forums/SKILL.md
Drift: Step 4e Critical Invariants package path bullet is stale post-Spec-1.1
Severity: Stale-Hard
Current text:
- **Package path** — current package is `com.example.worshiproom` until Phase 1 Spec 1.1 merges. Specs executing before Spec 1.1 use the old path; specs after use `com.worshiproom`. When in doubt, check the actual current package with `ls backend/src/main/java/com/` before writing new Java files.
Proposed text:
- **Package path** — package is `com.worshiproom`. Phase 1 Spec 1.1 ✅ shipped (the rename covered ~60+ proxy files + tests + `pom.xml` `groupId` + Docker image tags). The `com/example/worshiproom/` path should NOT appear anywhere in the codebase post-Phase-1; if it does, that's a regression. Sanity check with `ls backend/src/main/java/com/` if anything seems off.
Reason: Spec 1.1 has shipped. Live status: `ls backend/src/main/java/com/` returns only `worshiproom/`. The "before/after" framing is now history.

---

ID: EX-E2
File: .claude/skills/execute-plan-forums/SKILL.md
Drift: Step 4e `@RestControllerAdvice` scoping bullet is stale (still references `com.example.worshiproom.proxy` and Spec 1.1 rename as future work)
Severity: Stale-Hard
Current text:
- **`@RestControllerAdvice` scoping** — proxy advice is package-scoped (`basePackages = "com.example.worshiproom.proxy"`). Do NOT create a globally-scoped advice for proxy concerns; do NOT broaden the existing advice to catch non-proxy exceptions. Update the `basePackages` value as part of the Spec 1.1 rename (it becomes `com.worshiproom.proxy`).
Proposed text:
- **`@RestControllerAdvice` scoping** — proxy advice is package-scoped at `@RestControllerAdvice(basePackages = "com.worshiproom.proxy")`. Phase 3 added domain advices following the same pattern: `com.worshiproom.post` (`PostExceptionHandler`), `com.worshiproom.post.engagement` (`EngagementExceptionHandler`), `com.worshiproom.post.comment` (`CommentExceptionHandler`). Future Phase 10/12/15 specs will add `com.worshiproom.moderation`/`com.worshiproom.notification`/`com.worshiproom.email`. **Do NOT** create globally-scoped advice for domain concerns; **do NOT** broaden an existing advice to catch sibling-package exceptions. **Filter-raised exceptions** (those thrown from servlet filters before any controller is matched) need an unscoped companion advice handling only the specific exception class — see `03-backend-standards.md` § "@RestControllerAdvice Scoping" for the canonical pattern.
Reason: Spec 1.1 rename has shipped, and Phase 3 introduced 3 new domain-scoped advices that this skill should reference for pattern matching.

---

ID: EX-E3
File: .claude/skills/execute-plan-forums/SKILL.md
Drift: Step 4e OpenAPI bullet cites stale master plan version (v2.8)
Severity: Medium
Current text:
- **OpenAPI spec location** — `backend/src/main/resources/openapi.yaml`. This file ALREADY EXISTS from the Key Protection Wave with shared schemas (`ProxyResponse`, `ProxyError`) and 10+ proxy endpoints. When the plan says to update the OpenAPI spec, EXTEND this file. Do NOT create a new file at `backend/api/openapi.yaml` (stale provisional path from master plan v2.6; corrected in v2.7 and confirmed in v2.8). If the plan's file path says `backend/api/openapi.yaml`, flag it as a plan error and STOP before creating the wrong file.
Proposed text:
- **OpenAPI spec location** — `backend/src/main/resources/openapi.yaml`. This file ALREADY EXISTS from the Key Protection Wave with shared schemas (`ProxyResponse`, `ProxyError`) and 10+ proxy endpoints; extended by Phase 3 Specs 3.3–3.7 with the unified `posts` family (~2700+ lines). When the plan says to update the OpenAPI spec, EXTEND this file. Do NOT create a new file at `backend/api/openapi.yaml` (stale provisional path from master plan v2.6; corrected in v2.7, confirmed in v2.8, **canonical as of v2.9 + Phase 1, Phase 2, and Phase 3 Execution Reality Addendums**). If the plan's file path says `backend/api/openapi.yaml`, flag it as a plan error and STOP before creating the wrong file.
Reason: Master plan version drift; addendums reference now consistent across CLAUDE.md and rules.

---

ID: EX-E4
File: .claude/skills/execute-plan-forums/SKILL.md
Drift: Step 4e Critical Invariants missing 5 Phase 3 conventions
Severity: High
Current text (Step 4e Critical Invariants block):
**Critical invariants for backend work (verify before committing each step):**

- **OpenAPI spec location** — ...
- **Filter ordering** — `RequestIdFilter` is at `@Order(Ordered.HIGHEST_PRECEDENCE)`, `RateLimitFilter` is at `@Order(Ordered.HIGHEST_PRECEDENCE + 10)` with `shouldNotFilter` scoping to `/api/v1/proxy/**`. Any new filter (JWT auth in Spec 1.4, future middleware) MUST be ordered AFTER both — suggested `HIGHEST_PRECEDENCE + 100` so request IDs and proxy rate limits run first. Verify ordering explicitly; don't rely on Spring's default filter-chain insertion.
- **Package path** — ...
- **`@RestControllerAdvice` scoping** — ...
- **Testcontainers mandatory for DB tests** — never H2. Extend `AbstractIntegrationTest` (or `AbstractDataJpaTest` for repository slice tests) from Spec 1.7; do not spin up per-test-class containers.
Proposed text (replacement, extending the block with 5 new invariants):
**Critical invariants for backend work (verify before committing each step):**

- **OpenAPI spec location** — ... [EX-E3 update]
- **Filter ordering** — `RequestIdFilter` is at `@Order(Ordered.HIGHEST_PRECEDENCE)`, `RateLimitFilter` is at `@Order(Ordered.HIGHEST_PRECEDENCE + 10)` with `shouldNotFilter` scoping to `/api/v1/proxy/**`. JWT auth (Spec 1.4 ✅) is at `HIGHEST_PRECEDENCE + 100`. `LoginRateLimitFilter` (Spec 1.5 ✅) and `SecurityHeadersConfig` filter (Spec 1.10g ✅, at `HIGHEST_PRECEDENCE + 6`) coexist. Any NEW filter MUST verify ordering explicitly; don't rely on Spring's default filter-chain insertion.
- **Package path** — ... [EX-E1 update]
- **`@RestControllerAdvice` scoping** — ... [EX-E2 update]
- **Testcontainers mandatory for DB tests** — never H2. Extend `AbstractIntegrationTest` (or `AbstractDataJpaTest` for repository slice tests) from Spec 1.7; do not spin up per-test-class containers.
- **L1-cache trap on `save → flush → findById`** — when an entity has `@Column(insertable=false, updatable=false)` columns (typical for DB-default audit timestamps `created_at`/`updated_at`), the in-memory entity returned from `save()` has `null` for those columns even after the SQL INSERT populates them. **Canonical fix:** call `entityManager.refresh(saved)` after `save()` and before DTO mapping. **Test guard:** every create-endpoint integration test asserts non-null timestamp in the response body. Surfaced by Specs 3.5 + 3.6 plan deviations.
- **`@Modifying(clearAutomatically=true, flushAutomatically=true)`** on every bulk JPQL UPDATE/DELETE method. Without `clearAutomatically`, subsequent reads in the same transaction return stale entities from Hibernate's persistence context. Without `flushAutomatically`, pending in-memory changes don't reach the DB before the bulk update fires. Convention established in Spec 3.7; used 11 times across `PostRepository`/`BookmarkRepository`/`ReactionRepository`. Both flags REQUIRED.
- **SecurityConfig method-specific rules ABOVE `OPTIONAL_AUTH_PATTERNS.permitAll()`** — Spring Security is first-match-wins. If a method-specific `.authenticated()` rule appears AFTER the permissive rule, anonymous writes silently succeed. Nested paths (`/api/v1/posts/*/reactions`) need their OWN explicit rules — `/api/v1/posts/*` does NOT match nested paths. Verify with `grep -nE 'requestMatchers|OPTIONAL_AUTH_PATTERNS' backend/src/main/java/com/worshiproom/auth/SecurityConfig.java` after every SecurityConfig edit.
- **Liquibase changeset filename = today's actual date + next available sequence number.** Master plan body uses `YYYY-MM-DD-NNN-` placeholders illustratively. Real filenames use the execution date and the next sequence within that day; must not collide with prior dates. Before writing a new changeset, run `ls backend/src/main/resources/db/changelog/ | tail -5` and continue from the latest (per Spec 3.1 Plan Deviation #1). **Before writing ANY new changeset, also verify the table/column doesn't already exist** — Phase 3 has shipped many elements that future specs may try to recreate (`posts.candle_count`, `post_reactions.reaction_type`, the 5 denormalized counters, `qotd_questions`, etc.). See Phase 3 Execution Reality Addendum item 8 for the authoritative "do NOT recreate" list.
- **Crisis-flag handling routes through `CrisisAlertService.alert(contentId, authorId, ContentType)`** — single integration point for Phase 4 testimony/question/discussion/encouragement, Phase 12.5 mention parsing, Phase 13 personal insights. Extend `ContentType` enum rather than introducing sibling alert services.
Reason: Direct propagation of Phase 3 Execution Reality Addendum items 2, 3, 4, 7, 8, and 11 into the execution-time invariant set. Without these, Phase 4+ specs will silently re-introduce the patterns Phase 3 just rooted out.

---

ID: EX-E5
File: .claude/skills/execute-plan-forums/SKILL.md
Drift: No mention of IDE classpath sync gotcha during pom.xml changes
Severity: High
Current text (Rules section, "Quality" subsection):
**Quality:**
- Always verify expected state before marking complete
- Backend verification (compile + test) is mandatory for every backend step
- Frontend verification (build + test + visual) is mandatory for every frontend step
- Do not delete the plan file — it serves as a record
- Before each step: re-read relevant rules fresh, do not rely on earlier context
Proposed text (insert as new bullet at end of Quality block):
**Quality:**
- Always verify expected state before marking complete
- Backend verification (compile + test) is mandatory for every backend step
- Frontend verification (build + test + visual) is mandatory for every frontend step
- Do not delete the plan file — it serves as a record
- Before each step: re-read relevant rules fresh, do not rely on earlier context
- **IDE classpath sync gotcha when modifying `pom.xml`.** If the IDE (IntelliJ, VS Code Java Extension Pack) prompts to sync Maven classpath mid-execution, decline ("No" / dismiss). Mid-execute syncs can corrupt the build (lock conflicts, partial dependency resolution, incomplete index). Sync MANUALLY via `./mvnw clean compile` after the step completes. Spec 3.5 tripped on this; documented as Spec 3.5 execution deviation.
Reason: Spec 3.5 Execution Log captured this; codifying prevents recurrence on Phase 4+ pom.xml changes (every new dependency add).

---

ID: EX-E6
File: .claude/skills/execute-plan-forums/SKILL.md
Drift: No two-laptop path note in Rules section
Severity: Low
Current text (Rules section, "Git Operations — HANDS OFF" subsection top):
**Git Operations — HANDS OFF:**
- **DO NOT** run `git commit`, `git push`, `git add` under any circumstances
- The user handles ALL git operations manually
Proposed text (insert above Git Operations section):
**Paths:**
- **Paths in this skill are illustrative.** Eric works from two machines: work laptop (`/Users/eric.champlin/worship-room/`) and home (`/Users/Eric/worship-room/`). Verify the actual project root on the active machine before using paths from this skill verbatim. The `_specs/forums/` and `_plans/forums/` directory names are stable; the prefix is not.

**Git Operations — HANDS OFF:**
- **DO NOT** run `git commit`, `git push`, `git add` under any circumstances
- The user handles ALL git operations manually
Reason: Two-laptop confusion is a documented memory entry; small note in skill keeps it top-of-mind.
```

---

## 4. `code-review`

### Lens 1 findings (convention propagation)

| # | Convention | Currently in skill? | Where it should appear | Severity |
|---|---|---|---|---|
| CR-L1.1 | `@Modifying(clearAutomatically=true, flushAutomatically=true)` flag-and-block check | NO | Backend Additional Checks table (line 743+) | High |
| CR-L1.2 | L1-cache trap flag-and-block check | NO | Backend Additional Checks table | High |
| CR-L1.3 | SecurityConfig rule ordering (line-number grep verification) | NO | Backend Additional Checks table + grep recommendation in Proxy Additional Checks subsection or sibling Forums Wave subsection | High |
| CR-L1.4 | EditWindowExpired status code = 409, not 400 | NO | Backend Additional Checks table | Medium |
| CR-L1.5 | CrisisAlertService unified entry — flag sibling alert services as violations | NO | Worship Room-Specific Safety Checks table (Step 10) | Medium |
| CR-L1.6 | INTERCESSION = 13 ActivityType — frontend / backend drift detection | NO | Backend Additional Checks table — flag any new ActivityType added without paired frontend constant update | Medium |
| CR-L1.7 | Schema realities — flag changesets that recreate existing schema | NO | Backend Additional Checks table | High |
| CR-L1.8 | Caffeine-bounded bucket pattern grep | Partial (general "no unbounded ConcurrentHashMap on external input" implied via 02-security.md reference) | Backend Additional Checks table — explicit grep + flag-and-block | High |
| CR-L1.9 | Domain-scoped advice + filter-raised companion check | NO | Backend Additional Checks table | High |
| CR-L1.10 | Pattern A | N/A — not a code-review concern | — |
| CR-L1.11 | Liquibase filename convention | YES — Backend Additional Checks line 744 has it | (no action) | OK |
| CR-L1.12 | BB-45 cross-mount test for new multi-consumer features | NO | Worship Room-Specific Safety Checks OR Backend Additional Checks (frontend) | Medium |

### Lens 2 findings (workflow gotchas)
- All N/A for code-review.

### Lens 3 findings (stale references)

| # | Reference | Currently | Should be | Severity |
|---|---|---|---|---|
| CR-L3.1 | Proxy Additional Checks "PACKAGE PATH NOTE" | "(critical at Forums Wave Phase 1): The proxy package is currently `com.example.worshiproom.proxy` and becomes `com.worshiproom.proxy` after Phase 1 Spec 1.1 merges. The checks below reference the OLD path (`com.example.worshiproom.proxy`) — this is correct for the current state of `main`. **Post-Spec-1.1**, update every reference in this section..." | Strip the entire dual-path framing. Rewrite as: "The proxy package is `com.worshiproom.proxy` (Phase 1 Spec 1.1 ✅ renamed from `com.example.worshiproom.proxy`)." Then update every grep command and Run Condition reference to use only `com.worshiproom.proxy`. | Stale-Hard |
| CR-L3.2 | Proxy Additional Checks Run Condition | "`backend/src/main/java/com/example/worshiproom/proxy/` (current) OR `backend/src/main/java/com/worshiproom/proxy/` (post-Spec-1.1)." | "`backend/src/main/java/com/worshiproom/proxy/`" | Stale-Hard |
| CR-L3.3 | Proxy Additional Checks `@RestControllerAdvice` row | "`@RestControllerAdvice` is scoped with `basePackages = \"com.example.worshiproom.proxy\"` (or `com.worshiproom.proxy` post-Spec-1.1)" | "`@RestControllerAdvice` is scoped with `basePackages = \"com.worshiproom.proxy\"`" | Stale-Hard |
| CR-L3.4 | Recommended grep commands header note | "Adjust the package path below based on whether Phase 1 Spec 1.1 has merged: BEFORE Spec 1.1: backend/src/main/java/com/example/worshiproom/ AFTER Spec 1.1: backend/src/main/java/com/worshiproom/. Run `ls backend/src/main/java/com/` on the current branch to see which applies." | Strip entirely; use only `backend/src/main/java/com/worshiproom/` in grep commands. | Stale-Hard |

### Lens 4 findings (coverage gaps)

| # | Gap | Severity |
|---|---|---|
| CR-L4.1 | The Backend Additional Checks table has 21 rows, but does NOT include the 5 Phase 3 patterns (L1-L7-L8-L9-L1.1 from above). Adding them as flag-and-block checks is the highest-leverage propagation point in this skill. | High |
| CR-L4.2 | Missing a "drift detection" check for ActivityType — frontend `ACTIVITY_POINTS` and backend `ActivityType` must agree (Decision 12). | Medium |

### Proposed edits for `code-review`

```
ID: CR-E1
File: .claude/skills/code-review/SKILL.md
Drift: Proxy Additional Checks PACKAGE PATH NOTE is stale post-Spec-1.1
Severity: Stale-Hard
Current text:
**PACKAGE PATH NOTE (critical at Forums Wave Phase 1):** The proxy package is currently `com.example.worshiproom.proxy` and becomes `com.worshiproom.proxy` after Phase 1 Spec 1.1 merges. The checks below reference the OLD path (`com.example.worshiproom.proxy`) — this is correct for the current state of `main`. **Post-Spec-1.1**, update every reference in this section: run condition, `@RestControllerAdvice` check, grep commands in this section, and the Run Condition header. Before running this review, check the actual current package with `ls backend/src/main/java/com/` and use that path in all checks below. If you see BOTH packages simultaneously during the Spec 1.1 review itself (the rename is in progress), the checks must pass for whichever package the advice lives in.

**Run Condition:** `backend/src/main/java/com/example/worshiproom/proxy/` (current) OR `backend/src/main/java/com/worshiproom/proxy/` (post-Spec-1.1).
Proposed text:
**Package path:** Phase 1 Spec 1.1 ✅ renamed `com.example.worshiproom.proxy` → `com.worshiproom.proxy`. The `com/example/worshiproom/` path should NOT appear anywhere in the codebase post-Phase-1; if it does, that's a regression worth flagging.

**Run Condition:** `backend/src/main/java/com/worshiproom/proxy/`.
Reason: Spec 1.1 has shipped (verified: `ls backend/src/main/java/com/` returns only `worshiproom/`). The dual-path framing is now stale and adds cognitive overhead with zero current value.

---

ID: CR-E2
File: .claude/skills/code-review/SKILL.md
Drift: Proxy Additional Checks `@RestControllerAdvice` row references both old and new package
Severity: Stale-Hard
Current text:
| `@RestControllerAdvice` is scoped with `basePackages = "com.example.worshiproom.proxy"` (or `com.worshiproom.proxy` post-Spec-1.1) so it doesn't swallow exceptions from non-proxy controllers | OK / OVER-BROAD | {file}:{line} |
Proposed text:
| `@RestControllerAdvice` is scoped with `basePackages = "com.worshiproom.proxy"` so it doesn't swallow exceptions from non-proxy controllers | OK / OVER-BROAD | {file}:{line} |
Reason: Spec 1.1 ✅. Drop the parenthetical.

---

ID: CR-E3
File: .claude/skills/code-review/SKILL.md
Drift: Recommended grep commands header still has dual-path adjustment note
Severity: Stale-Hard
Current text:
**Recommended grep commands during review:**

```bash
# Adjust the package path below based on whether Phase 1 Spec 1.1 has merged:
#   BEFORE Spec 1.1: backend/src/main/java/com/example/worshiproom/
#   AFTER  Spec 1.1: backend/src/main/java/com/worshiproom/
# Run `ls backend/src/main/java/com/` on the current branch to see which applies.

# Verify no API key in logs
grep -rn 'log\.\(info\|debug\|warn\|error\).*apiKey\|log\.\(info\|debug\|warn\|error\).*getApiKey' backend/src/main/java
Proposed text:
**Recommended grep commands during review:**

```bash
# Package path is com.worshiproom (Phase 1 Spec 1.1 ✅).

# Verify no API key in logs
grep -rn 'log\.\(info\|debug\|warn\|error\).*apiKey\|log\.\(info\|debug\|warn\|error\).*getApiKey' backend/src/main/java
Reason: Spec 1.1 ✅; the adjustment note is dead weight.

---

ID: CR-E4
File: .claude/skills/code-review/SKILL.md
Drift: Backend Additional Checks table missing 5 high-severity Phase 3 conventions
Severity: High
Current text (Backend Additional Checks table — last 5 rows):
| Crisis detection supersession respected (Universal Rule 13) | OK / VIOLATION / N/A | {file}:{line} |
| Dual-write pattern: localStorage primary, backend shadow, fire-and-forget | OK / VIOLATION / N/A | {file}:{line} |
| Feature flag env var documented in `.env.example` | OK / MISSING / N/A | {file} |
| Testcontainers used for DB integration tests (never H2) | OK / VIOLATION | {file}:{line} |
| OpenAPI spec EXTENDED at `backend/src/main/resources/openapi.yaml` (never created at `backend/api/openapi.yaml`) | OK / WRONG PATH | {file} |
| Cutover specs produce `_cutover-evidence/{phase}-a11y-smoke.json` axe-core evidence (Universal Rule 17) | OK / MISSING / N/A | {file} |
| Drift detection test present for Phase 2 dual-write specs (Decision 12) | OK / MISSING / N/A | {file}:{line} |
Proposed text (replacement adding 8 rows at the end):
| Crisis detection supersession respected (Universal Rule 13) | OK / VIOLATION / N/A | {file}:{line} |
| Dual-write pattern: localStorage primary, backend shadow, fire-and-forget | OK / VIOLATION / N/A | {file}:{line} |
| Feature flag env var documented in `.env.example` | OK / MISSING / N/A | {file} |
| Testcontainers used for DB integration tests (never H2) | OK / VIOLATION | {file}:{line} |
| OpenAPI spec EXTENDED at `backend/src/main/resources/openapi.yaml` (never created at `backend/api/openapi.yaml`) | OK / WRONG PATH | {file} |
| Cutover specs produce `_cutover-evidence/{phase}-a11y-smoke.json` axe-core evidence (Universal Rule 17) | OK / MISSING / N/A | {file} |
| Drift detection test present for Phase 2 dual-write specs (Decision 12) | OK / MISSING / N/A | {file}:{line} |
| **Phase 3 Addendum #2 — L1-cache trap fixed.** Service layer calls `entityManager.refresh(saved)` after `save()` for entities with `@Column(insertable=false, updatable=false)` columns; create-endpoint integration tests assert non-null timestamps in response body | OK / VIOLATION / N/A | {file}:{line} |
| **Phase 3 Addendum #3 — `@Modifying(clearAutomatically=true, flushAutomatically=true)`** on every new bulk JPQL UPDATE/DELETE method (both flags REQUIRED) | OK / VIOLATION / N/A | {file}:{line} |
| **Phase 3 Addendum #4 — SecurityConfig method-specific rules** placed BEFORE `OPTIONAL_AUTH_PATTERNS.permitAll()`; nested paths (`/api/v1/posts/*/reactions`) have their own explicit rules | OK / WRONG ORDER / MISSING NESTED RULE | {file}:{line} |
| **Phase 3 Addendum #5 — Caffeine-bounded bucket pattern** for any per-user/per-IP/per-key cache; `@ConfigurationProperties(prefix = "worshiproom.{feature}")`, never `ConcurrentHashMap` keyed on external input | OK / VIOLATION | {file}:{line} |
| **Phase 3 Addendum #6 — Domain-scoped `@RestControllerAdvice`** for new domains (`com.worshiproom.{domain}`); unscoped companion advice (single-exception-class) for any filter-raised exceptions | OK / VIOLATION / N/A | {file}:{line} |
| **Phase 3 Addendum #7 — `CrisisAlertService.alert(contentId, authorId, ContentType)`** is the unified entry for any user-generated-content surface; do NOT introduce sibling alert services | OK / VIOLATION / N/A | {file}:{line} |
| **Phase 3 Addendum #8 — schema realities verified.** Any new Liquibase changeset does NOT recreate already-shipped schema (cross-check against addendum item 8 list: `posts.candle_count`, `post_reactions.reaction_type`, the 5 denormalized counters, `qotd_questions`, `post_reports.review_consistency`, friends/social/milestone tables, `user_mutes`) | OK / VIOLATION / N/A | {file} |
| **Phase 3 Addendum #1 — EditWindowExpired returns 409 (not 400)** with code `EDIT_WINDOW_EXPIRED` for any edit-window-bearing PATCH endpoint | OK / VIOLATION / N/A | {file}:{line} |
| **Phase 3 Addendum #9 — INTERCESSION ActivityType drift.** New `ActivityType` enum value paired with `ACTIVITY_POINTS` frontend constant addition; current total is 13 (per Decision 12 drift-detection test) | OK / DRIFT / N/A | {file}:{line} |
Reason: Direct propagation of Phase 3 Execution Reality Addendum into the code-review block-and-flag surface. This is the highest-leverage propagation point — code-review is the last gate before commit.

**Recommended grep commands** (add to the existing grep block in Proxy Additional Checks OR add a new "Forums Wave grep commands" subsection):

```bash
# Phase 3 Addendum #3 — verify @Modifying flags complete
grep -rn '@Modifying' backend/src/main/java | grep -v 'clearAutomatically.*flushAutomatically\|flushAutomatically.*clearAutomatically'
# Should return zero matches; any match = missing flag

# Phase 3 Addendum #4 — SecurityConfig rule ordering line-number check
grep -n 'requestMatchers\|OPTIONAL_AUTH_PATTERNS' backend/src/main/java/com/worshiproom/auth/SecurityConfig.java
# Verify all method-specific .authenticated() lines appear at LOWER line numbers than the OPTIONAL_AUTH_PATTERNS reference

# Phase 3 Addendum #5 — Caffeine-bounded check (flag any unbounded ConcurrentHashMap keyed on external input)
grep -rn 'ConcurrentHashMap<.*\(String\|Long\|UUID\),' backend/src/main/java | grep -v 'test\|Test'
# Each match needs review: is the key external input? If yes, flag for Caffeine migration
```

---

ID: CR-E5
File: .claude/skills/code-review/SKILL.md
Drift: Worship Room Safety Checks doesn't reference CrisisAlertService or BB-45 cross-mount test
Severity: Medium
Current text (Worship Room-Specific Safety Checks table — first 5 rows):
| Check | Status | Evidence |
|-------|--------|----------|
| Crisis detection on user text inputs (Pray, Journal, Prayer Wall, Mood Check-In) | OK / MISSING / BYPASSED / N/A | {file}:{line} |
| No `dangerouslySetInnerHTML` on user content | OK / VIOLATION | {file}:{line} |
| Demo mode: no database writes for logged-out users | OK / VIOLATION / N/A | {file}:{line} |
| Auth modal triggers correctly for gated actions | OK / MISSING / N/A | {file}:{line} |
| Journal drafts use localStorage, not sessionStorage | OK / WRONG STORAGE / N/A | {file}:{line} |
Proposed text (replacement, modifying first row + adding 1 new row near top):
| Check | Status | Evidence |
|-------|--------|----------|
| Crisis detection on user text inputs (Pray, Journal, Prayer Wall, Mood Check-In) routes through `CrisisAlertService.alert(contentId, authorId, ContentType)` (do NOT introduce sibling alert services per Phase 3 Addendum #7) | OK / MISSING / BYPASSED / SIBLING SERVICE / N/A | {file}:{line} |
| New multi-consumer reactive store has BB-45 cross-mount subscription test (mutate store after mount, assert re-render in separate consumer) per Phase 3 Addendum #12 | OK / MISSING / N/A | {file}:{line} |
| No `dangerouslySetInnerHTML` on user content | OK / VIOLATION | {file}:{line} |
| Demo mode: no database writes for logged-out users | OK / VIOLATION / N/A | {file}:{line} |
| Auth modal triggers correctly for gated actions | OK / MISSING / N/A | {file}:{line} |
| Journal drafts use localStorage, not sessionStorage | OK / WRONG STORAGE / N/A | {file}:{line} |
Reason: Crisis detection check exists but doesn't enforce the unified entry point. BB-45 multi-consumer test gap wasn't a code-review check before; should be.
```

---

## 5. `verify-with-playwright`

### Lens 1 findings (convention propagation)

| # | Convention | Currently in skill? | Where it should appear | Severity |
|---|---|---|---|---|
| VP-L*  | All 12 conventions | Mostly N/A — verify-with-playwright is UI-focused; backend conventions don't apply | (no action) | — |
| VP-L1.12 | BB-45 cross-mount test | N/A — Playwright doesn't typically run unit tests; BB-45 is a Vitest concern | (no action) | — |

### Lens 2 findings (workflow gotchas)

| # | Gotcha | Currently in skill? | Where it should appear | Severity |
|---|---|---|---|---|
| VP-L2 | All gotchas | N/A — workflow gotchas are about backend-spec authoring/execution, not UI verification | (no action) | — |

### Lens 3 findings (stale references)

| # | Reference | Currently | Should be | Severity |
|---|---|---|---|---|
| VP-L3 | UI patterns and Daily Hub checks | All look current — Round 3 / BB-* / Daily Hub references are accurate | (no action) | OK |

### Lens 4 findings (coverage gaps)

| # | Gap | Severity |
|---|---|---|
| VP-L4.1 | Plan-only invocation already handles "N/A — backend-only spec" cleanly (Step 1, lines 142-148). Most Phase 3 specs (3.1–3.7) ARE backend-only and would skip this skill via the existing branch. No drift. | OK |

### Proposed edits for `verify-with-playwright`

**No edits proposed.** This skill is appropriately scoped to UI verification and the relevant Daily Hub / Round 3 / BB-* checks remain current. Phase 3 Forums Wave specs are mostly backend-only and skip this skill via the existing `Affected Frontend Routes: N/A — backend-only spec` branch in Step 1.

If Phase 3 surfaces new visual patterns (e.g., post type-specific cards in Phase 4, Hero Features in Phase 6), this skill's `Step 9: Worship Room-Specific Checks` may need new subsections. Defer that work to whichever Phase 4+ spec first introduces a new visual pattern and let the spec body request the update.

---

## Cross-skill observations

1. **The same stale "Phase 1 Spec 1.1 hasn't merged yet" framing appears across all three back-end-touching skills** (`plan-forums`, `execute-plan-forums`, `code-review`). Spec 1.1 ✅ has shipped; the framing was correct at skill-authoring time (April 24) but is now history. Strip the dual-path "before/after" framing in all three places. Prevents propagation of the same edit pattern to future "Phase X hasn't merged yet" mentions when those phases ship.

2. **Master plan version drift.** Skills cite v2.6 / v2.7 / v2.8 in various places. The current canonical reference is **v2.9 + Phase 1, Phase 2, and Phase 3 Execution Reality Addendums** (with addendums AUTHORITATIVE over older spec body text where they disagree). CLAUDE.md and rules now use this language consistently; skills should mirror.

3. **Phase 3 Execution Reality Addendum has 12 sub-sections** but skills don't reference it as a load-bearing source. The most leverage comes from:
   - `plan-forums` Self-Review Checklist additions (8 new items, PF-E4)
   - `execute-plan-forums` Critical Invariants additions (5 new bullets, EX-E4)
   - `code-review` Backend Additional Checks additions (8 new rows, CR-E4)
   These three edits propagate the addendum into the "blocks bad PRs at the 3 right gates" set: planning, execution, review.

4. **"Pattern A" disambiguation** is a small but specific drift. Master plan A6 fix added the "(subscription via standalone hook)" qualifier in 4 anchor occurrences. `plan-forums` Universal Rules Checklist Rule 8 still says "Pattern A or Pattern B" unqualified. Mirror the master plan fix in plan-forums (PF-E3) and add the disambiguation note in spec-forums (SF-E4 covers it via the self-review checklist).

5. **Recon failure handling** is a genuine workflow gap. Spec 3.7's brief was authored without filesystem access and produced 16 recon overrides. Both spec-forums (SF-E3) and plan-forums (PF-E8) need coordination — spec-forums must tag unverified claims `[VERIFY]`; plan-forums must resolve every `[VERIFY]` before drafting steps. Without this contract, briefs can pass through to plans with unverified claims that surface at execution time.

6. **Two-laptop paths** is a low-severity but documented memory entry (work `/Users/eric.champlin/`, home `/Users/Eric/`). All three Forums Wave skills (spec, plan, execute) reference paths; small "Paths in this skill are illustrative" note in each prevents past confusion. Edits SF-E5, PF-E9, EX-E6.

7. **Phase 3 plans 3.5/3.6/3.7 each ran a "Plan Tightening Audit" with ~15 lenses** plus a "Plan-Time Divergences from Brief" section. Both proved valuable for catching drift before execution. PF-E7 codifies this in the plan template.

---

## Summary of proposed edits

| ID | Skill | File | Severity |
|---|---|---|---|
| SF-E1 | spec-forums | Step 4 codebase recon | High |
| SF-E2 | spec-forums | Step 4 conditional reads (Phase 3 Addendum) | High |
| SF-E3 | spec-forums | Step 4.5 recon failure handling (NEW section) | Medium |
| SF-E4 | spec-forums | Step 6 self-review checklist | Medium |
| SF-E5 | spec-forums | Rules section (two-laptop note) | Low |
| PF-E1 | plan-forums | Step 3 item 7 — package path stale | Stale-Hard |
| PF-E2 | plan-forums | Step 3 item 11 — OpenAPI provenance v2.8 | Stale-Hard |
| PF-E3 | plan-forums | Universal Rules Checklist Rule 8 — Pattern A | Medium |
| PF-E4 | plan-forums | Plan Quality Self-Review Checklist (8 new items) | High |
| PF-E5 | plan-forums | Step 3 item 9 — Liquibase recon expansion | High |
| PF-E6 | plan-forums | Spec-Category-Specific Guidance — BACKEND-ONLY | High |
| PF-E7 | plan-forums | Plan template — Plan Tightening Audit + Divergences (NEW sections) | Medium-High |
| PF-E8 | plan-forums | Step 3 — recon failure handling coordination | Medium |
| PF-E9 | plan-forums | Rules section (two-laptop, trust calibration) | Low |
| EX-E1 | execute-plan-forums | Step 4e — package path stale | Stale-Hard |
| EX-E2 | execute-plan-forums | Step 4e — `@RestControllerAdvice` scoping stale | Stale-Hard |
| EX-E3 | execute-plan-forums | Step 4e — OpenAPI cite v2.8 | Medium |
| EX-E4 | execute-plan-forums | Step 4e Critical Invariants (5 new bullets) | High |
| EX-E5 | execute-plan-forums | Rules section — IDE classpath sync gotcha | High |
| EX-E6 | execute-plan-forums | Rules section — two-laptop note | Low |
| CR-E1 | code-review | Proxy Additional Checks PACKAGE PATH NOTE stale | Stale-Hard |
| CR-E2 | code-review | Proxy Additional Checks — `@RestControllerAdvice` row stale | Stale-Hard |
| CR-E3 | code-review | Proxy Additional Checks — grep header stale | Stale-Hard |
| CR-E4 | code-review | Backend Additional Checks (8 new rows + 3 grep commands) | High |
| CR-E5 | code-review | Worship Room Safety Checks (CrisisAlertService + BB-45 multi-consumer) | Medium |
| (none) | verify-with-playwright | — | OK |

**Total:** 25 proposed edits across 4 skills. `verify-with-playwright` requires no changes.

**Severity distribution:**
- High: 9
- Stale-Hard: 7
- Medium-High: 1
- Medium: 6
- Low: 2

---

## Out of scope

The following items surfaced during discovery but are not being proposed for action:

1. **Non-Forums-Wave skills** (`spec`, `plan`, `execute-plan`, `playwright-recon`) — out of audit scope per audit brief.
2. **Test count target encoding** — Phase 3 reality is 30-50 tests for medium-large specs, but the skills currently defer to plan template's per-step Test specifications field. Adding a hard upper bound would over-constrain; current deferral is fine. PF-L3.4 noted but not actioned.
3. **`useEchoStore` deferred-feature mentions** — these live in rules files (06-testing.md, 09-design-system.md, 10-ux-flows.md) and were addressed in the earlier doc-reality audit. Skills don't reference `useEchoStore` directly. No action needed.
4. **Frontend Sentry (1.10d-bis)** — not yet shipped per the rules; skills don't need to anticipate it.
5. **`/code-review` Severity Definitions section** — already includes "Worship Room safety violations" as Blocker. Phase 3 backend convention violations should also be Blocker; that's implicitly covered by "Backend violations are Blocker severity" line at 766. Acceptable as-is.
6. **`spec-forums` Step 3 git branching** — currently switches to `main && pull` by default OR `--from-branch`. Eric's documented workflow is "Forums wave uses single `claude/forums/round3-forums-wave` branch, no per-spec sub-branches" (memory entry). The skill's `--from-branch` flag handles this case but the default behavior may be wrong for Forums Wave specs. **Surface as observation, not edit** — this is a workflow design choice Eric should confirm separately if changing.
7. **Per-skill design choices** — spec-forums Step 5 filename rule is intentionally repetitive (#1 source of errors), Step 1 abort-on-uncommitted is a stated design choice. Not redesigning.
8. **`/ultrareview` integration** — mentioned in CLAUDE.md but not part of the Forums Wave pipeline; out of scope.

---

## What happens next

Eric reviews this inventory + proposed edits as one document, prunes (or approves all), and tells me which to apply. Pass 2 will:

1. Apply approved edits via surgical `Edit` tool calls (explicit `old_string` → `new_string`)
2. Verify each landed correctly via re-read
3. Document changes in `_audits/2026-04-28-skill-reality-applied.md` with before/after snippets

Stop here for review.
