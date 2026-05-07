# Forums Wave Drift Triage (Lightweight)

**Date:** 2026-05-07
**Branch:** `forums-wave-continued`
**Scope:** CLAUDE.md, `02-security.md`, `12-project-reference.md`, `spec-forums/SKILL.md`, `plan-forums/SKILL.md`
**Compared against:** Forums Wave Phase 0 → Phase 3 shipped state per `_forums_master_plan/spec-tracker.md` (62 specs, ~2026-03 → 2026-04-28)
**Format:** triage only — no diffs, no full enumeration.

---

## 1. Verdict per file

| File | Drift | Notes |
|---|---|---|
| `CLAUDE.md` | **Moderate** | Status counts and per-spec deferred/shipped labels are stale and contradict the tracker in 6+ places. |
| `.claude/rules/02-security.md` | **Moderate** | Auth Lifecycle § treats already-shipped specs as future stubs; 1.5d claimed "Implemented" but is deferred. |
| `.claude/rules/12-project-reference.md` | **Low–Moderate** | `/community-guidelines` listed as a live route; tracker's 2026-04-28 note says page+route not yet shipped. |
| `.claude/skills/spec-forums/SKILL.md` | **Low** | Largely current; references v2.9 master plan + Phase 1/2/3 addendums + Phase 3 recon overrides correctly. |
| `.claude/skills/plan-forums/SKILL.md` | **Low** | Largely current; minor staleness — OpenAPI scope says "extended by Specs 3.3–3.7" but 3.8/3.9 also shipped. |

**Aggregate:** **moderate.** Most drift is concentrated in two surfaces (CLAUDE.md status paragraph + 02-security.md auth lifecycle section). The skills are in good shape.

---

## 2. Highest-impact drift points per file

### `CLAUDE.md` (Implementation Phases paragraph, lines ~155)

1. Phase 1 says "21/30 shipped, 7 deferred (1.5b–g... 1.10c), 2 pending (1.10e, 1.10k)" — tracker shows **1.5c ✅, 1.5f ✅, 1.10e ✅, 1.10k ✅, 1.10m ✅**. Real count is closer to **27/30 shipped, 4 deferred (1.5b/1.5d/1.5e/1.5g/1.10c)**.
2. Phase 1: `1.10f` and `1.10m` described as "reverted to ⬜ pending the column-and-endpoint portions" — tracker shows both ✅ with partial-shipped notes, not reverted statuses. Internal contradiction is real (markdown shipped, columns/page not), but the wording diverges from where the tracker actually landed.
3. Phase 2.5 says "2.5.6 Block reverted to ⬜ after Pass 2 audit" — tracker still shows 2.5.6 ✅ (with a contradicting audit note below saying it should be ⬜). One of the two is wrong; CLAUDE.md and tracker disagree.
4. Phase 3 says "11/12 shipped... 3.8 Reports reverted to ⬜" — tracker shows **all 12 specs ✅, 3.8 ✅**. CLAUDE.md status here is the most stale of the bunch.
5. Build Health frontend baseline (9,830 / 1 fail) and backend baseline (~720) appear current. No drift there.

### `.claude/rules/02-security.md` (Auth Lifecycle § + Forums Wave Security Additions)

1. "Auth Lifecycle (Phase 1 — v2.8 Spec stubs 1.5b through 1.5g)" frames **all six specs as not-yet-shipped stubs** — but `1.5c Change Password` and `1.5f Account Lockout` shipped per tracker.
2. The Password Policy § says: "Email verification flow — Implemented in Forums Wave Spec 1.5d (`email_verified_at`...)". Tracker has 1.5d as ‼️ (deferred — SMTP-blocked). Asserting "implemented" is false.
3. Forums Wave Rate Limits table includes endpoints from 6.8, 10.7b, 10.11, etc. as if there's a backend enforcement — none of those phases have shipped. Phrasing is appropriate (it's a forward-looking table), but worth a header clarifying "target enforcement on shipping."
4. The bulk of the file (CORS, security headers, CSP, rate-limit, XFF trust, JWT, framework log suppression) is **accurate and shipped** — drift is localized to the auth lifecycle status framing.

### `.claude/rules/12-project-reference.md` (Routes table)

1. `/community-guidelines` is listed in the Public Routes table with `CommunityGuidelines` component. Tracker's 2026-04-28 note explicitly says: "The public `/community-guidelines` route + `CommunityGuidelines` page component referenced in `12-project-reference.md` does NOT yet exist in `frontend/src/`." The route claim is verifiably wrong.
2. `/login` row correctly reflects Spec 7 redirect to `/?auth=login`; query-param deep links § correctly documents `/?auth=login|register`.
3. "Forums Wave will add" paragraph correctly notes `/forgot-password`, `/reset-password`, `/admin/audit-log`, `/settings/sessions` as deferred. Already-shipped `/community-guidelines` is mentioned as such — but item 1 above contradicts that.
4. Content inventory table is unchanged from pre-Forums-Wave state and looks correct (no Forums Wave content was added — Prayer Wall is still on mock data behind a flag).

### `.claude/skills/spec-forums/SKILL.md`

1. Universal Rules count "all 17 rules" matches master plan v2.9. ✓
2. Recon override pattern (Step 4) correctly cites Spec 3.7 R1/R2/R3 and the Phase 3 already-shipped lists. Current.
3. Step 4.5 ("Recon Failure Handling") and `[VERIFY]` tagging convention are present and aligned with what the codebase actually checks for. Current.
4. Step 6 self-review checklist gates against Phase 3 Addendum items (1, 7, 9). All consistent with current addendum text.
5. **Minor:** Step 4 says addendums are "AUTHORITATIVE over older spec body text where they disagree" — this is repeated correctly. No drift to flag.

### `.claude/skills/plan-forums/SKILL.md`

1. Step 3 § "Existing OpenAPI spec" says it's been "extended by Phase 3 Specs 3.3–3.7 with the unified `posts` family." Specs **3.8 (Reports) and 3.9 (QOTD)** also shipped per tracker — both extend `openapi.yaml`. Should mention 3.3–3.9.
2. Step 3 says "Phase 3 canonical references: `PostsRateLimitConfig`, `PostsIdempotencyService`, `CommentsRateLimitConfig`, `BookmarksRateLimitConfig`, `ReactionsRateLimitConfig`." Reports + QOTD likely added their own bounded caches too (3.8, 3.9 shipped) — worth a sentence.
3. Step 4 Phase 3 Execution Reality Addendum gates (items 15–22) are all current and correctly map to addendum items 1–8. ✓
4. Filename rule (today's date + next sequence) is correct. ✓
5. The "11 times across `PostRepository`/`BookmarkRepository`/`ReactionRepository`" `@Modifying` count for Phase 3 likely missed 3.8/3.9 additions — minor staleness.

---

## 3. Recommendation

**Patch the high-impact items; full audit not warranted.**

The drift is concentrated and surgical:

- ~5 line-level fixes to CLAUDE.md's Implementation Phases paragraph (Phase 1/2.5/3 spec counts and per-spec status labels).
- 2–3 sentence-level fixes to `02-security.md`'s Auth Lifecycle § (status framing for 1.5c/1.5f shipped, 1.5d corrected from "Implemented" to "Spec drafted, deferred until SMTP").
- 1 row-level fix to `12-project-reference.md` (mark `/community-guidelines` as "deferred — markdown content shipped, page component pending").
- 2 small enrichments to `plan-forums/SKILL.md` (3.3–3.9 OpenAPI scope, expanded canonical Phase 3 references list).
- `spec-forums/SKILL.md` needs no changes.

**Estimated patch effort:** 30–45 min for all five files. A full audit (the kind that produced `2026-05-07-post-rollout-audit.md`) would be ~3–4 hrs and would not surface materially more than what's listed above — the drift is shallow, not structural.

**Suggested order:**
1. Fix CLAUDE.md spec-status paragraph against the tracker (the tracker is closer to truth than CLAUDE.md is).
2. Fix `02-security.md` Auth Lifecycle § (correct 1.5c/1.5d/1.5f wording).
3. Fix `12-project-reference.md` `/community-guidelines` row.
4. Touch up `plan-forums/SKILL.md` (3.3–3.9 mentions).
5. Re-verify against `spec-tracker.md` after edits — if the tracker itself has internal contradictions (2.5.6, 3.8 ✅ vs. note text saying ⬜), reconcile that as a separate action.

**Out of scope for this triage:** the audit-flagged tracker contradictions (2.5.6 status mismatch, 3.8 status mismatch). Those are tracker-internal and want Eric's call.
