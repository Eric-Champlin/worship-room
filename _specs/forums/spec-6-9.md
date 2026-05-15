# Forums Wave: Spec 6.9 — Prayer Wall Composer Drafts

**Master Plan Reference:** `_forums_master_plan/round3-master-plan.md` → Spec 6.9 (`round3-phase06-spec09-composer-drafts`, lines 6134–6153)
**Brief Source:** `_plans/forums/spec-6-9-brief.md` (preserved verbatim below)
**Branch:** `forums-wave-continued` (per Brief §1 — CC never alters git state at any phase; Phase 6 specs accumulate on this branch — see commits `0659821 Spec 6-9 MD`, `1c9a5bf _specs/forums/spec-6-6b-deferred-2.md`, `01b029b Spec 6-8 So Close`, `c78843b Spec 6-6b`, `55630ce Spec 6-7`)
**Date:** 2026-05-15
**Phase:** 6 (Engagement Features)
**Size:** M (per master plan stub) — in practice small per Brief §intro: one custom hook, one localStorage key, ~10–12 tests, no backend, no migration, no UI primitive beyond a restore prompt
**Risk:** Low (per master plan stub)
**Tier:** Low/Standard (per Brief §intro) — a localStorage auto-save hook on existing composers; no safety surface, no AI adjacency, no DB, no API

---

## Affected Frontend Routes

`/verify-with-playwright` should cover the composer surfaces where `useComposerDraft` is wired (Plan-Recon R1 enumerates the full set) — primarily the Prayer Wall feed and a prayer detail (for the comment composer if it is in scope). The auto-save mechanics are unit-testable; only the **restore prompt UI on composer reopen** is genuinely visual and needs a Playwright pass.

- `/prayer-wall` (InlineComposer on the feed — confirmed primary surface; also QotdComposer if QOTD is treated as a drafted post type per Plan-Recon R1)
- `/prayer-wall/:id` (CommentInput on the detail page IF comments are a drafted post type per Plan-Recon R1; if comments are NOT drafted, this route is out of scope and `CommentInput.tsx` remains untouched per Brief §8 "Do NOT modify" — preserves 6.6b-deferred-1's `CommentInput.tsx` placeholder territory)

---

## Spec-time Recon Summary (verified on disk 2026-05-15)

Brief's R1–R6 are designated PLAN-RECON-REQUIRED — the planner runs them at `/plan-forums` time. This summary captures spec-time filesystem reality so the plan can build on confirmed facts rather than re-discover them.

| Item | Status | Evidence |
|---|---|---|
| `frontend/src/hooks/useComposerDraft.ts` | ❌ does not exist | `grep -rn "useComposerDraft" frontend/src/` returned zero matches. Safe to create. |
| `wr_composer_drafts` localStorage key | ❌ not in use anywhere | `grep -rn "wr_composer_drafts" frontend/src/` returned zero matches. Key namespace is free. |
| Composer surfaces (Plan-Recon R1) | ✅ enumerated | `frontend/src/components/prayer-wall/InlineComposer.tsx` ✅; `frontend/src/components/prayer-wall/QotdComposer.tsx` ✅; `frontend/src/components/prayer-wall/ComposerChooser.tsx` ✅; `frontend/src/components/prayer-wall/CommentInput.tsx` ✅; `frontend/src/components/prayer-wall/ScriptureReferenceInput.tsx` ✅ (sub-component, likely not a draft surface itself). Plan-Recon R1 picks which subset of {InlineComposer, QotdComposer, CommentInput} wires the hook. |
| Post-type enum (Brief §R1 / W7) | ✅ EXISTS — note: type name is `PostTypeApi`, not `PostType` | `frontend/src/types/api/prayer-wall.ts:19-24` defines `export type PostTypeApi = 'prayer_request' \| 'testimony' \| 'question' \| 'discussion' \| 'encouragement'`. The hook's `postType` parameter must key on these exact string values. Brief refers to "the post-type enum" generically — the canonical type is `PostTypeApi` and a separate legacy `PostType` type may live in `frontend/src/types/prayer-wall.ts` (the legacy mapping target — Plan-Recon confirms whether `useComposerDraft` keys on the API form, the legacy form, or both; "testimony/question" do appear in both, so practical alignment is straightforward). |
| `.claude/rules/11-local-storage-keys.md` conventions | ✅ confirmed | The rules file documents `wr_*` as the canonical prefix for almost all storage; `wr_settings.*` is a nested namespace for settings preferences; `bb*-v1:*` is reserved for AI/audio caches with TTL/versioning. `wr_composer_drafts` as a **top-level expiring-data namespace** (per the stub) is correct because drafts are transient (7-day expiry), not settings. The brief's R2 confirmation stands: a top-level `wr_composer_drafts` key fits the established shape better than nesting under `wr_settings.*`. |
| Phase 6 spec accumulation on `forums-wave-continued` | ✅ confirmed | `git log --oneline -5` shows `0659821 Spec 6-9 MD`, `1c9a5bf _specs/forums/spec-6-6b-deferred-2.md`, `01b029b Spec 6-8 So Close`, `c78843b Spec 6-6b`, `55630ce Spec 6-7` — confirming Phase 6 specs continue to land on this branch per Brief §1. |
| Prereq 6.8 (Verse-Finds-You) | ✅ shipped | Spec tracker line 188: "6.8 Verse-Finds-You L HIGH ✅". Brief §intro notes that 6.9's substance has no technical dependency on 6.8's surface — sequencing prereq, not technical. |
| 6.6b-deferred-1 (CommentInput placeholder territory) | ⚠️ noted | Brief §R5 + §8 flag that if `useComposerDraft` is wired into `CommentInput.tsx`, it must compose cleanly with the future deferred-1 work (`isAnsweredPost`-aware placeholder). The two changes share a file but operate on different concerns (draft persistence vs placeholder string). Plan-Recon R1 surfaces if the wiring conflicts. |
| Animation tokens (BB-33) | ✅ canonical | Restore prompt transitions (if any — appear/dismiss animations) must import from `frontend/src/constants/animation.ts` per `.claude/rules/09-design-system.md` § "Animation Tokens". Do not hardcode `200ms` / `cubic-bezier(...)`. |
| `useFocusTrap()` availability for restore prompt | ✅ EXISTS | Per `.claude/rules/09-design-system.md` § "Custom Hooks", `useFocusTrap()` is the canonical primitive for modal/dialog/drawer focus management. Whether the restore prompt is modal enough to need it is a Plan-Recon decision (Brief Gate-5 calls for keyboard-reachable + focus-managed; a non-modal inline prompt with a focus ring on the primary button may be sufficient). |

**Recon override:** none. The brief does not propose creating anything that already exists in conflict. `useComposerDraft`, `wr_composer_drafts`, and `RestoreDraftPrompt` are all green-field. The only nuance is the post-type enum naming (`PostTypeApi` vs Brief's generic "PostType" reference), which Plan-Recon R1 reconciles when wiring composers.

---

{Brief content preserved verbatim below — Section numbers are the brief's own; Master Plan references unchanged.}

---

# Brief: Spec 6.9 — Prayer Wall Composer Drafts

**Master plan reference:** `_forums_master_plan/round3-master-plan.md` (Spec 6.9 stub, live version, lines 6134-6153) — ID `round3-phase06-spec09-composer-drafts`

**Spec ID:** `round3-phase06-spec09-composer-drafts`

**Phase:** 6 (Engagement Features)

**Size:** M (per stub) — in practice small: one custom hook, one localStorage key, ~10 tests, no backend, no migration, no UI primitive beyond a restore prompt.

**Risk:** Low (per stub).

**Tier:** **Low/Standard** — a localStorage auto-save hook on existing composers. No safety surface, no AI adjacency, no DB, no API, no privacy stakes beyond standard localStorage hygiene. The brief is sized to match: short, focused, no manufactured ceremony.

**Prerequisites:**
- 6.8 (per stub). **Note:** the stub lists 6.8 as a prereq, but 6.9's actual substance — a localStorage auto-save hook — has no technical dependency on 6.8's surface (verses, selection engine, settings toggle). The prereq is sequencing, not technical. 6.9 can ship even with 6.8 functionally dormant (machinery-only, verses uncurated). Plan-recon confirms.

**Pipeline:** This brief → `/spec-forums spec-6-9-brief.md` → `/plan-forums` → execute → `/code-review`. **No `/verify-with-playwright` needed for the auto-save mechanics** — those are unit-testable; but the restore-prompt UI on composer reopen IS visual, so a small playwright pass on the restore flow is reasonable. Plan decides.

---

## 1. Branch Discipline

Branch: `forums-wave-continued`. Eric handles all git ops manually. CC never commits/pushes/branches at any phase. `git stash` for diagnostic baseline-compare is permitted only if it brackets within the same turn.

---

## 2. What 6.9 Builds (Verbatim from the Stub)

**Goal:** Auto-save composer content to `localStorage` every 5 seconds while the user is typing. On reopening the composer, offer to restore the draft.

**Approach:** A custom hook `useComposerDraft(postType)` that auto-saves to `wr_composer_drafts` (a new localStorage key namespace), restores on composer mount, clears on successful post, expires after 7 days, one draft per post type.

**Acceptance criteria (verbatim from the stub):**
- Drafts auto-save every 5 seconds
- Reopening composer offers to restore
- Drafts cleared on successful post
- Drafts expire after 7 days
- One draft per post type
- localStorage key documented in `11-local-storage-keys.md`
- At least 10 tests

That is the entire stub. The brief below adds plan-time recon, watch-fors for realistic failure modes, a slightly fleshed-out test list, and a small copy deck for the restore prompt. It deliberately does NOT add MPDs, gates beyond standard discipline, or scope the stub doesn't mandate.

---

## 3. Recon Ground Truth (Plan-Time)

**R1 — the composers that need the hook.** Plan reads the prayer-wall composer surfaces to enumerate exactly which composers wire `useComposerDraft`. From earlier wave work: `InlineComposer.tsx` is the post-compose surface. There may be additional composers (testimony, question, comment) — plan-recon enumerates the full set and confirms the `postType` enum the hook keys on. The stub's "one draft per post type" implies a finite, known set of post types; recon confirms it matches the existing post-type enum (`frontend/src/types/api/prayer-wall.ts` ~line 21 has the enum).

**R2 — the `11-local-storage-keys.md` rules file.** Plan reads `.claude/rules/11-local-storage-keys.md` for the existing key-naming convention (the 6.8 work added `wr_settings.verseFindsYou.enabled` and `wr_verse_dismissals` there; 6.6b nests as `wr_settings.prayerWall.dismissedShareWarning`). Determines whether `wr_composer_drafts` is the right shape (a top-level namespace per the stub, which differs from the nested `wr_settings.*` pattern — likely correct because drafts are transient/expiring, not settings).

**R3 — the successful-post hook for clearing.** Plan finds the existing success-toast / post-submit success handler in each composer and identifies the exact hook point where `useComposerDraft.clear()` is called. This must fire on success and ONLY on success — not on submit-attempt, not on validation error.

**R4 — the composer mount lifecycle.** Plan determines how the composer renders today: does it mount fresh each time, or is it a persistent component that opens/closes? The "reopening offers to restore" behavior shape depends on this. If it's a fresh mount each time, the hook checks for a draft on mount. If it persists, recon clarifies what "reopen" means in the codebase.

**R5 — 6.6b-deferred-1 awareness.** The tracker's 6.6b-deferred-1 entry concerns `CommentInput.tsx` and a future `isAnsweredPost`-aware placeholder. 6.9 may add `useComposerDraft` to `CommentInput.tsx` as well (if comments are a post type that gets drafts — plan decides). If so, 6.9 must NOT pre-empt or block the future deferred-1 work — they should compose cleanly. Plan-recon flags this and surfaces if the surfaces conflict.

**R6 — anonymous vs. authenticated drafts.** Plan determines: do logged-out users have composers that should support drafts (likely no — logged-out users can't post)? Does an anonymous post draft persist across logout/login (likely no for privacy)? Plan picks a clean rule and the brief honors whatever plan-recon finds is the existing pattern. The conservative default: drafts are keyed per-account in the localStorage value shape if multi-account is a concern, OR drafts are cleared on logout. Plan-recon decides; surfaces to Eric if ambiguous.

<!-- CHUNK_BOUNDARY -->

---

## 4. Gates (Standard — Nothing Exotic)

6.9 is a low-risk localStorage hook. The gates are the usual discipline; no spec-specific HARD gates are added.

| Gate | Applicability | Notes |
|------|---------------|-------|
| Gate-1 (Liquibase rules) | **N/A** | No DB changes. |
| Gate-2 (OpenAPI updates) | **N/A** | No API changes. |
| Gate-3 (Copy Deck) | **Applies.** | Restore prompt copy in Section 6. |
| Gate-4 (Tests mandatory) | **Applies.** | The stub mandates at least 10 tests. See Section 7. |
| Gate-5 (Accessibility) | **Applies.** | The restore prompt is interactive UI — keyboard-reachable, focus-managed, announces state. |
| Gate-6 (Performance) | **Applies (lightly).** | Auto-save every 5s on keystroke is a debounce, not a per-keystroke write. Confirm the implementation debounces, not throttles-per-keystroke. |
| Gate-7 (Rate limiting) | **N/A** | No backend. |
| Gate-8 (Respect existing patterns) | **Applies.** | Reuse the existing localStorage utilities the codebase already has (settings storage, etc.). Don't invent a new localStorage abstraction. |
| Gate-9 (Plain text only) | **Applies.** | Draft content stored as plain text; restored as plain text into the composer's existing input — inherits whatever sanitization the composer already does on submit. No new sanitization needed. |
| Gate-10 (Crisis detection supersession) | **N/A** | Drafts never leave the client; nothing to scan until submit (which goes through the existing post-create path that has its own scanning). |
| Gate-G-NO-SCOPE-CREEP | **Applies.** | 6.9 is the auto-save hook + restore prompt. Nothing else. No "helpful" composer cleanups, no rewrites of the composer UI, no draft preview gallery, no "my drafts" page. |

---

## 5. Watch-Fors

Real failure modes worth covering, not exhaustive. ~10 items.

**W1.** **Debounce, not throttle-per-keystroke.** The auto-save fires every 5 seconds *while typing*, not on every keystroke. A naive `setInterval(5000)` that doesn't track activity will save stale content forever on an idle tab; a per-keystroke throttle will hammer localStorage. The right shape is: track a "dirty" flag on input change, every 5 seconds if dirty → save + clear dirty.

**W2.** **One draft per post type.** Saving a new draft for the same `postType` overwrites the previous one. A user composing a prayer-request draft, then switching to compose a testimony, then back — they should have BOTH drafts, one per type, not one draft that got clobbered.

**W3.** **7-day expiry is enforced on READ, not just write.** On composer mount, the hook checks: is there a draft for this `postType`, and is its timestamp within 7 days? If older → silently discard, do not offer to restore. A stale 30-day-old draft must not surface, ever.

**W4.** **Clear-on-success fires only on successful post.** Not on submit-attempt, not on validation error, not on network error, not on "composer closed without submit." If a user submits, gets a 500, the draft must survive so they can retry. Plan-recon R3 finds the exact success hook.

**W5.** **Restore prompt is opt-in, not auto-restore.** "Reopening composer offers to restore" — the stub says *offers*. The composer should not silently re-populate with the draft and surprise the user; it shows a prompt ("You have a saved draft from {timeAgo}. Restore?") with a clear yes/no. If they say no, the draft is discarded.

**W6.** **Logout / account-switch handling.** Plan-recon R6 decides the rule; the watch-for is: whatever rule plan picks, it's actually enforced. A draft written by user A must not appear in user B's composer on the same machine. The simplest defensible rule: drafts are cleared on logout. Plan confirms whether this codebase has multi-account complications.

**W7.** **The post-type enum match.** The hook keys on `postType` — those keys must match the existing `PostType` enum (the testimony / prayer-request / question / etc. values). Mismatch = silent failure (draft saved under a key never read back).

**W8.** **No PII leak via localStorage exposure.** Drafts contain in-progress prayer text — potentially sensitive. They're stored in plain localStorage (the spec is fine with this; localStorage isn't shared cross-origin). But: any error logging, any debug output, any analytics MUST NOT serialize the draft contents. Confirm no `console.log(draft)` or analytics-event with draft payload.

**W9.** **`11-local-storage-keys.md` is updated.** The stub explicitly requires this. Easy to forget. Code review catches it if it's missing.

**W10.** **No backend, no API, no DB — stay there.** If during execute it starts to feel like a "draft sync to server" feature would be nice, that's a future spec, not 6.9. Stay strictly client-side.

**W11.** **Drafts don't survive a hard browser-storage clear.** Out of scope but worth a one-line note: localStorage cleared by the user / private mode / storage quota = drafts gone. That's correct behavior, not a bug. No "recovery" feature.

---

## 6. Copy Deck (D-Copy)

The only user-facing copy. Eric-approved before execute.

*Restore prompt (when opening composer with a saved draft):* **"You have a saved draft from {timeAgo}. Restore it?"**

*Restore prompt — primary button:* **"Restore draft"**

*Restore prompt — secondary button:* **"Start fresh"**

*Optional: post-success draft-cleared toast — NONE.* (Drafts clearing on success is silent. Surfacing it would be noise.)

No other user-facing copy. The auto-save itself is silent — no "draft saved" indicator. (Anti-pressure: don't gamify saving.)

---

## 7. Test Specifications

The stub mandates **at least 10 tests.** Target ~12 to cover the watch-fors. Frontend: Vitest + RTL.

**T1.** Auto-save fires after 5 seconds of typing activity (debounce verified).
**T2.** Auto-save does NOT fire when the composer is idle (no input changes).
**T3.** Auto-save overwrites the previous draft for the same `postType`.
**T4.** Two different `postType`s maintain two independent drafts simultaneously.
**T5.** On composer mount with a fresh draft (<7 days), the restore prompt renders.
**T6.** Selecting "Restore draft" populates the composer with the saved content.
**T7.** Selecting "Start fresh" discards the draft and starts with empty content.
**T8.** A draft older than 7 days is silently discarded on mount — no restore prompt shown.
**T9.** Successful post submission clears the draft for that `postType`.
**T10.** A failed submission (validation error, network error, 500) does NOT clear the draft.
**T11.** The localStorage key `wr_composer_drafts` is documented in `11-local-storage-keys.md` (a meta-test or a code-review check, depending on plan).
**T12.** Logout/account-switch handling per the rule plan-recon R6 picks (test asserts the chosen rule).

Plus accessibility: the restore prompt is keyboard-reachable, focus-managed, and announces state. Plan-recon decides whether axe-core gets a pass on this surface; the prompt is small but it IS interactive UI.

---

## 8. Files

All paths relative to repo root. Plan-recon confirms.

### Create

**Frontend:**
- `frontend/src/hooks/useComposerDraft.ts` — the custom hook (`save`, `restore`, `clear`, `getDraft`, internal 5s debounce, 7-day expiry check).
- `frontend/src/components/prayer-wall/RestoreDraftPrompt.tsx` (or wherever the composer ecosystem lives — plan-recon R1) — the restore prompt UI.
- `frontend/src/hooks/__tests__/useComposerDraft.test.ts`
- `frontend/src/components/.../RestoreDraftPrompt.test.tsx`

### Modify

- Each composer surface (plan-recon R1 enumerates) — wire `useComposerDraft(postType)`, mount the `RestoreDraftPrompt` on open, call `clear()` on successful post (R3).
- `.claude/rules/11-local-storage-keys.md` — document `wr_composer_drafts` (W9).
- Possibly a shared localStorage utility, if plan-recon R2 finds the existing pattern wants a shared helper.

### Do NOT modify

- The composer submit/validation/network logic — 6.9 hooks success and mount; it does not change how posts get created.
- 6.6b-deferred-1's `CommentInput.tsx` placeholder — if 6.9 adds drafts to `CommentInput.tsx`, it does so without touching the placeholder string. The deferred-1 future spec handles that.
- Anything backend.

### Delete

- Nothing.

---

## 9. Acceptance Criteria (from the stub + a few clarifications)

6.9 is done when:

- [ ] A. Drafts auto-save every 5 seconds while typing (debounced, not per-keystroke; not on idle).
- [ ] B. Reopening the composer with a saved draft shows the restore prompt with copy per D-Copy; "Restore draft" populates, "Start fresh" discards.
- [ ] C. Drafts clear on successful post (and ONLY on successful post — not on submit-attempt, validation error, or network error).
- [ ] D. Drafts older than 7 days are silently discarded on composer mount.
- [ ] E. Each `postType` maintains its own draft — saving one does not clobber another.
- [ ] F. `wr_composer_drafts` is documented in `.claude/rules/11-local-storage-keys.md`.
- [ ] G. At least 10 tests, all passing (Section 7 targets ~12).
- [ ] H. Logout/account-switch behavior is correct per plan-recon R6's chosen rule.
- [ ] I. The restore prompt is keyboard-reachable and focus-managed.
- [ ] J. Frontend lint + typecheck + tests pass.
- [ ] K. No backend changes, no API changes, no DB changes (verify by diff).
- [ ] L. 6.6b-deferred-1's `CommentInput.tsx` placeholder is unchanged (Gate-G-NO-SCOPE-CREEP).

---

## 10. Out of Scope

- Cross-device draft sync (a server-backed draft feature is a future spec, not 6.9).
- A "my drafts" page or draft management UI.
- Auto-save indicators / "draft saved" toasts.
- Draft versioning / undo / history.
- Drafts surviving localStorage clears or private-browsing.
- Pre-filling the answered-text edit flow (6.6b shipped that; 6.9 is composer drafts only).
- Any change to `CommentInput.tsx`'s placeholder copy (6.6b-deferred-1's territory).
- Drafts for non-composer text inputs (search boxes, profile bio, etc.).

---

## 11. Recommended Planner Instruction

> Plan Spec 6.9 from `spec-6-9-brief.md`. This is a Low-risk, Size M frontend-only spec — keep the plan proportionate. No backend, no DB, no API. The whole feature is one hook + one restore-prompt component + wiring to existing composers + a rules-file doc edit.
>
> Plan-recon R1-R6 before planning: enumerate the composers, read the localStorage rules file, find the success hook, determine the composer mount lifecycle, flag 6.6b-deferred-1 awareness, pick the logout/account-switch rule. The logout/account-switch rule (R6) is the one decision that may need to surface to Eric — the conservative default is clear-drafts-on-logout, but plan-recon may find the codebase already has a different pattern.
>
> Honor Gate-G-NO-SCOPE-CREEP — 6.9 is the auto-save + restore prompt. Nothing else. If during execute you find a tempting adjacent cleanup, document it and surface; do not absorb.
>
> Standard discipline: no git operations.

---

## 12. Prerequisites Confirmed

- [x] The live 6.9 master plan stub read in full (lines 6134-6153) — this brief is authored against the LIVE stub, not the pristine-baseline backup.
- [~] 6.8 — listed as prereq in the stub. 6.8's machinery is shipped; verses are dormant. 6.9 does not technically depend on 6.8's surface, so 6.9 may proceed.
- [x] The post-type enum exists (`frontend/src/types/api/prayer-wall.ts`); the localStorage keys rules file exists (`.claude/rules/11-local-storage-keys.md`).

---

## End of Brief
