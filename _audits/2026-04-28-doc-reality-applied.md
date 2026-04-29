# Documentation Reality — Applied (Pass 3)

**Generated:** 2026-04-28
**Branch:** `forums-wave-continued`
**Scope:** All 25 distinct edits from `_audits/2026-04-28-doc-reality-proposed-edits.md`, applied with Eric's revised A1 insertion anchor.

---

## Summary

| Result | Count |
|---|---|
| Drifts identified in Pass 1 | 139 |
| Approved-for-action by Eric in Pass 2 scope | 25 distinct edits (~32 individual replacements after sub-edits) |
| Edits applied in Pass 3 | **25 / 25** |
| Edits deferred | 0 |
| Chase-down findings during apply | 1 (recorded below) |

All edits surgical (`Edit` tool with explicit `old_string` → `new_string`); no whole-section rewrites. Every target location verified by re-read or `grep` after edit.

---

## Files modified

| File | Edits applied |
|---|---|
| `_forums_master_plan/round3-master-plan.md` | 6 (A1 NEW addendum + A2 ×3 + A3 + A4 + A5 + A6 ×4) = 11 actual replacements |
| `_forums_master_plan/spec-tracker.md` | 2 sections (E1 row restored + E2 ×4 status reverts + 2 new partial-shipped/verification footnotes) |
| `.claude/rules/02-security.md` | 2 (B1 + C4) |
| `.claude/rules/03-backend-standards.md` | 4 (C1 ×2 + C2 + C3) |
| `.claude/rules/05-database.md` | 2 (D1 + D2) |
| `.claude/rules/06-testing.md` | 1 (F1) |
| `.claude/rules/09-design-system.md` | 3 (G1 + G2 + G3) |
| `.claude/rules/10-ux-flows.md` | 3 (H1 + H2-a + H2-b) |
| `CLAUDE.md` | 4 (I1 + I2 + I3 + I4-a + I4-b) |
| **Total** | **9 files, ~32 individual replacements** |

---

## Apply log (file-by-file)

### `_forums_master_plan/round3-master-plan.md`

#### Edit A1 — Phase 3 Execution Reality Addendum (NEW SECTION)

**Anchor (per Eric's correction):** Inserted between the `---` divider that closes the Phase 2 Addendum (was line 378) and the `## Quick Reference` heading (was line 382). Verified post-apply: line 380 now opens `## Phase 3 Execution Reality Addendum (added 2026-04-28)`; line 483 is `## Quick Reference`.

**Verification:** `grep -n "^## Phase 1 Execution Reality\|^## Phase 2 Execution Reality\|^## Phase 3 Execution Reality\|^## Quick Reference"` returns:
```
22:## Phase 1 Execution Reality Addendum (v2.9, added 2026-04-23)
129:## Phase 2 Execution Reality Addendum (added 2026-04-27)
380:## Phase 3 Execution Reality Addendum (added 2026-04-28)
483:## Quick Reference
```

Ordering correct, no orphaned content.

**Content:** 12 sub-sections covering: (1) 409 EDIT_WINDOW_EXPIRED, (2) L1-cache trap fix, (3) `@Modifying(clearAutomatically=true, flushAutomatically=true)`, (4) SecurityConfig rule ordering, (5) Caffeine-bounded bucket pattern, (6) domain-scoped advice, (7) `CrisisAlertService` integration contract, (8) "do NOT recreate" schema table (7 rows), (9) INTERCESSION ActivityType count, (10) `wr_prayer_reactions` shape correction, (11) Liquibase changeset filename convention, (12) Reactive store BB-45 cross-mount test pattern.

#### Edit A2 — Spec 3.9 fixes (3 edits, all applied)

- **A2-a (Goal/Approach):** "Existing 60 questions seeded in 3.2" → "**72 questions** seeded in 3.2 (60 general + 12 liturgical-seasonal, ids `qotd-1` through `qotd-72`)". Approach paragraph rewritten to surface the schema-vs-frontend reconciliation choice (extend schema with `liturgical_season` column OR ship modulo-72 only).
- **A2-b (Files-to-create):** Path `com/worshiproom/qotd/` → `com/worshiproom/post/`. Added "Files already exist (do NOT recreate)" subsection naming `QotdQuestion.java`, `QotdQuestionRepository.java`, and changeset 019.
- **A2-c (Acceptance criteria):** "Day-of-year modulo 60 produces the same rotation as the existing frontend logic" → "Backend rotation logic matches the frontend's `getTodaysQuestion()` behavior — liturgical-season-aware (when `liturgical_season` column ships) or `dayOfYear % 72` fallback (when it doesn't). Drift-detection test feeds same `Date` to both implementations and asserts identical question id."

#### Edit A3 — Phase 3.7 Addendum rewrite

The entire Addendum paragraph at line 3832 (in the pre-edit numbering) was replaced. Key changes:
- "and a new `posts.candle_count` (added by the same Liquibase changeset that introduces `reaction_type`)" → "**`candle_count` and `reaction_type` already exist** — both shipped in Spec 3.1 (changesets 014 and 016 respectively); Spec 3.7 adds zero new schema."
- Field-name framing corrected from `Record<string, { praying, candle }>` to `Record<string, { isPraying, isBookmarked, isCandle }>`.
- "needs a version bump (Pattern A migration logic)" → "shipped as additive default-fill on hydrate (no version key required)".
- Anchor to consumption guidance now points at `11b-local-storage-keys-bible.md`.

#### Edit A4 — Phase 3.6 Addendum 400 → 409

`400 EDIT_WINDOW_EXPIRED` → `409 CONFLICT` with `EDIT_WINDOW_EXPIRED` code. Added cross-reference to Phase 3 Execution Reality Addendum item 1.

#### Edit A5 — Phase 6.6 CHECK constraint annotation

Added "**CHECK constraint must be ALTERed, not recreated**" with explicit instructions: "DROP the old constraint and ADD a new one allowing all four values. Do NOT issue a `CREATE TABLE` or attempt to re-add the column — both will fail Liquibase. See Phase 3 Execution Reality Addendum item 8."

#### Edit A6 — Pattern A "(subscription)" qualifier

Four anchor occurrences updated to add `— subscription via standalone hook`:
- Line 434 (Architectural Foundation Decisions, decision 8)
- Line 446 (decision 14)
- Line 704 (Universal Rule)
- Line 1094 (Phase 0.5 narrative)

The Phase 3.7 Addendum's misleading "Pattern A migration logic" reference was removed entirely as part of Edit A3's rewrite (no longer present in the doc).

---

### `_forums_master_plan/spec-tracker.md`

#### Edit E1 — Spec 3.3 row restored

```diff
| 52  | 3.2  | Mock Data Seed Migration                       | M    | Low    | ✅     |
-|     |
+| 53  | 3.3  | Posts Read Endpoints                           | L    | Medium | ✅     |
| 54  | 3.4  | Comments, Reactions, Bookmarks Read Endpoints  | M    | Low    | ✅     |
```

#### Edit E2 — Four false-✅ reversions

| Spec | Before | After |
|---|---|---|
| 1.10f | `✅` | `⬜ ⚠` |
| 1.10m | `✅` | `⬜ ⚠` |
| 2.5.6 Block | `✅` | `⬜` |
| 3.8 Reports | `✅` | `⬜` |

Plus two footnotes added immediately after the relevant phase tables:

**After Phase 1 table:**
```
> **1.10f partial-shipped (2026-04-28 audit):** Canonical legal markdown ... IS shipped. The `users.terms_version` / `users.privacy_version` columns ... endpoints are NOT yet shipped.
>
> **1.10m partial-shipped (2026-04-28 audit):** Markdown at `content/community-guidelines.md` IS shipped. The public `/community-guidelines` route + `CommunityGuidelines` page component ... does NOT yet exist.
```

**After Phase 2.5 table:**
```
> **2.5.6 verification (2026-04-28 audit):** Despite earlier ✅, no `com.worshiproom.block/` package exists, no `UserBlock*` Java code, and no `user_blocks` Liquibase changeset. Spec 2.5.7 Mute (the sibling spec) DID ship — `user_mutes` table at changeset 013, `MutesService`, `useMutes` hook all exist. Block remains unimplemented; reverted to ⬜.
```

---

### `.claude/rules/02-security.md`

- **Edit B1:** Annotated `terms_version`/`privacy_version` as "(Spec 1.10f future work — columns NOT yet on `users` table; only the canonical legal markdown ... has shipped)".
- **Edit C4 (lives in 02):** BOUNDED EXTERNAL-INPUT CACHES paragraph extended with **Phase 3 canonical references** list (`PostsRateLimitConfig`, `PostsIdempotencyService`, `CommentsRateLimitConfig`, `BookmarksRateLimitConfig`, `ReactionsRateLimitConfig`) and forward-target list (1.5b, 1.5e, 6.8, 8.1, 10.7b, 10.11, 16.1).

---

### `.claude/rules/03-backend-standards.md`

- **Edit C1-a:** Package tree refreshed — added 5 shipped packages (`friends/`, `social/`, `mute/`, `safety/`, `post/`) with one-line descriptions of what each contains. The `activity/` line annotated with the 13-ActivityType count incl. INTERCESSION.
- **Edit C1-b:** "Forums Wave package additions (Phases 2.5+ — still future)" paragraph rewritten to mark Phase 2.5 + Phase 3 as ✅ shipped, list still-future packages, and call out the 2.5.6 Block surprise finding.
- **Edit C2:** Two new bullets added to Repository Conventions: `@Modifying(clearAutomatically=true, flushAutomatically=true)` requirement and L1-cache trap on `save → flush → findById`.
- **Edit C3:** New section "SecurityConfig rule ordering (MANDATORY pattern)" inserted immediately after `@RestControllerAdvice` Scoping section (before `### Input Validation`). Includes the canonical Java-code example block.

---

### `.claude/rules/05-database.md`

- **Edit D1:** `users` row in registry split — Shipped columns vs Future columns (Spec 1.10f).
- **Edit D2:** `qotd_questions` row reattributed from "Spec 3.9" → "Spec 3.1 (table) + Spec 3.2 (seed)" with explanatory note.

---

### `.claude/rules/06-testing.md`

- **Edit F1:** "Reactive Store Consumer Pattern" section rewritten. Pattern A vs Pattern B structure now matches reality (3 real Pattern A hooks, 6 Pattern B inline-subscribe stores). Added "Note on echoes (BB-46)" explaining that `useEchoStore` was deferred. Anchor link points at `11b-local-storage-keys-bible.md`.

---

### `.claude/rules/09-design-system.md`

- **Edit G1:** Line 302 store list rewritten — replaced single-line "HighlightStore, ..., EchoStore — Reactive store modules at `lib/<feature>/store.ts`. Each exposes ... `useSyncExternalStore`" (3 false claims compressed into one bullet) with a multi-line Pattern A / Pattern B / Echo deferred breakdown that matches reality.
- **Edit G2:** Line 384 anchor `11-local-storage-keys.md` → `11b-local-storage-keys-bible.md`.
- **Edit G3:** Line 538 — same anchor swap, plus added "Pattern A" naming inline.

---

### `.claude/rules/10-ux-flows.md`

- **Edit H1:** MyBible "seven reactive stores" sentence rewritten. Lists `useMemorizationStore` (Pattern A) + 5 Pattern B stores (chapter visits, highlights, bookmarks, notes, journals); explicit note that `useEchoStore` does NOT exist; anchor → `11b`.
- **Edit H2-a:** Verse Echoes Flow Interaction section: "persists in `wr_echo_dismissals` via `useEchoStore()`" → "session-scoped `Set<string>` inside `hooks/useEcho.ts` — they reset on page reload" + clarifying note that persistent dismissal would ship as its own spec.
- **Edit H2-b:** Selection engine "Dismissal exclusion (anything in `wr_echo_dismissals` is filtered out)" → "Dismissal exclusion (anything in the session-scoped `Set` from `useEcho` is filtered out for the current session)".

---

### `CLAUDE.md` (root)

- **Edit I1:** "Authentication (mock/simulated, real JWT in Phase 3)" → "Authentication (real JWT — Spring Security + BCrypt — shipped in Forums Wave Phase 1 Specs 1.4 + 1.5 + 1.9; legacy `wr_auth_simulated` mock kept for transitional test seeding)".
- **Edit I2:** Implementation Phases line rewritten. New phase counts: Phase 1 21/30 + 7 deferred + 2 pending; 2 false-✅ reverted (1.10f, 1.10m); Phase 2 10/10; Phase 2.5 7/8 (2.5.6 Block reverted); Phase 3 7/12 (3.8 reverted, next is 3.9). Master plan version annotated with "Phase 1 / Phase 2 / Phase 3 Execution Reality Addendums".
- **Edit I3:** "(v2.8)" → "(v2.9 + Phase 1 / Phase 2 / Phase 3 Execution Reality Addendums)" with addendum-authoritative reminder.
- **Edit I4-a:** Reactive Store Pattern Key Decisions bullet rewritten — names the 3 real Pattern A hooks and 6 Pattern B inline-subscribe stores; anchor → `11b`.
- **Edit I4-b:** Bible Wave milestone reference: anchor `11-local-storage-keys.md` → `11b-local-storage-keys-bible.md`.

---

## Chase-down findings during apply

### 1. `useEchoStore` mentions in three rule files now appear in deprecation context only

The literal string `useEchoStore` still appears in the codebase after edits — but ONLY inside explicit "this hook does NOT exist; deferred" sentences in `06-testing.md`, `09-design-system.md`, and `10-ux-flows.md` (×2). These are intentional defensive deprecation notes; future readers grepping for `useEchoStore` will find the deprecation explanation rather than nothing.

```
$ grep -c "useEchoStore\|wr_echo_dismissals" 06-testing.md 09-design-system.md 10-ux-flows.md
06-testing.md:1     ← inside "Note on echoes (BB-46): useEchoStore ... were considered but deferred"
09-design-system.md:1 ← inside "useEchoStore does NOT exist"
10-ux-flows.md:2    ← inside the rewritten H2-a/b dismissal scope notes
```

This is the intended outcome — leaving zero references would create the opposite problem (specs that mention `useEchoStore` would have nothing to redirect to).

### 2. Master plan `11-local-storage-keys.md` anchor link kept once intentionally

`grep -n "11-local-storage-keys.md.*Reactive Store Consumption"` returns one remaining match in the master plan, at line 477:

```
**Established by:** Bible wave + `11-local-storage-keys.md` § Reactive Store Consumption (which lives in `11b-local-storage-keys-bible.md`).
```

This is **inside** the new Phase 3 Execution Reality Addendum item 12 (which I authored as part of Edit A1) and is **self-correcting** — it acknowledges the file split and points readers to the right file. Leaving it as-is preserves the historical note that the section was originally documented under the 11 anchor while making the actual location obvious. Acceptable.

### 3. "v2.8" no longer appears anywhere in CLAUDE.md

`grep -c "v2.8" CLAUDE.md` returns 0 after Edit I3. The previous internal inconsistency (line 155 said v2.9, line 264 said v2.8) is resolved.

### 4. Spec 3.3 row is at line 101, not line 53

The numeric column says `53` but the row's actual line number in the file is 101 — that's just because the file has more rows above the table than below the heading. The tracker reads correctly: `| 53 | 3.3 | Posts Read Endpoints | L | Medium | ✅ |`.

---

## Verification spot-checks

After all edits applied:

| Check | Expected | Actual |
|---|---|---|
| Master plan addendum ordering | Phase 1 → Phase 2 → Phase 3 → Quick Reference | ✅ lines 22 / 129 / 380 / 483 |
| `useEchoStore` ghost references gone from positive-claim contexts | 0 active claims | ✅ remaining mentions are all "does NOT exist" / deferred notes |
| `11-local-storage-keys.md` anchor refs converted | All non-self-correcting refs swapped to `11b` | ✅ (1 self-correcting reference intentionally retained per chase-down #2) |
| `v2.8` references in CLAUDE.md | 0 | ✅ |
| Spec 3.3 row in tracker | Restored at #53 | ✅ |
| Spec 3.8 status | ⬜ | ✅ |
| Spec 1.10f status | ⬜ ⚠ | ✅ |
| Spec 1.10m status | ⬜ ⚠ | ✅ |
| Spec 2.5.6 status | ⬜ | ✅ |
| Phase 3 Addendum 12 sub-sections | Present | ✅ |
| `@Modifying` flags + L1-cache trap in Repository Conventions | Both bullets added | ✅ |
| SecurityConfig rule ordering section | New section between @RestControllerAdvice scoping and Input Validation | ✅ |
| Phase 3.6 Addendum HTTP status | 409 (was 400) | ✅ |
| Phase 6.6 CHECK constraint note | Present + explicit "ALTER not recreate" instruction | ✅ |

---

## Out of scope (per Eric's Pass 2 instructions)

The following items remain unaddressed and remain documented in the inventory as historical record:

- All Low-severity master plan filename prefix drifts (Liquibase date prefixes, runbook file renames)
- Handoff prompt body (file remains SUPERSEDED)
- Forward-looking G.3 entries (will be fixed opportunistically when forward specs are authored)
- 1.10h/1.10i retro-spec-file creation (docs-only specs are now a documented pattern in the new package-tree note)
- Phase 1.5b–g "ship-ready framing" (deferred until SMTP unblocks)

---

## Three-pass scoreboard

| Pass | File | Status |
|---|---|---|
| 1 (Discovery) | `_audits/2026-04-28-doc-reality-drift-inventory.md` | ✅ produced 2026-04-28 |
| 2 (Proposal) | `_audits/2026-04-28-doc-reality-proposed-edits.md` | ✅ produced 2026-04-28, approved by Eric with corrected A1 anchor |
| 3 (Apply) | This file + 9 modified docs | ✅ complete 2026-04-28 |

**Pass 3 result:** All 25 approved edits applied without regression. Documentation now reflects current shipped state for Phases 0–3.7. New work (Spec 3.9 next) can read the master plan and the Phase 3 Execution Reality Addendum and have all the conventions it needs.
