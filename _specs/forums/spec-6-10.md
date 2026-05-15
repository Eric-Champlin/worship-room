# Forums Wave: Spec 6.10 — Prayer Wall Search by Author

**Master Plan Reference:** `_forums_master_plan/round3-master-plan.md` → Spec 6.10 (`round3-phase06-spec10-search-by-author`, lines 6154–6169)
**Brief Source:** `_plans/forums/spec-6-10-brief.md` (preserved verbatim below)
**Branch:** `forums-wave-continued` (per Brief §1 — CC never alters git state at any phase; Phase 6 specs accumulate on this branch — see commits `2b189e0 Spec 6-9`, `0659821 Spec 6-9 MD`, `1c9a5bf _specs/forums/spec-6-6b-deferred-2.md`, `01b029b Spec 6-8 So Close`, `c78843b Spec 6-6b`)
**Date:** 2026-05-15
**Phase:** 6 (Engagement Features)
**Size:** S (per master plan stub) — the smallest spec in the wave per Brief §intro, on the assumption R1 + R3 both pass at plan-recon. As of spec-time recon (see below) BOTH gate, so the spec STOPS at /plan-forums step 0 unless Eric explicitly expands scope.
**Risk:** Low (per master plan stub) — conditional on R1 + R3 passing. If either fails, the implicit scope expansion changes the risk profile and the brief's discipline (Brief §10, "Plan STOPS and surfaces") applies.
**Tier:** Low/Standard (per Brief §intro) — a routing-target change on the PrayerCard author affordance. No backend, no DB, no API. **Conditional on R1 + R3.**

---

## Affected Frontend Routes

`/verify-with-playwright` should cover the Prayer Wall surfaces where `PrayerCard` renders. A focused Playwright pass confirming the author-name link points to the correct destination on a non-anonymous post with `username` (Pattern T1) AND the fallback on a non-anonymous post without `username` (Pattern T2) AND the non-link state on an anonymous post (Pattern T3) is reasonable but not required per the brief — the change is testable via Vitest + RTL alone. Plan decides.

- `/prayer-wall` (PrayerCard renders in the feed — primary surface)
- `/prayer-wall/:id` (PrayerCard renders on the prayer detail page — `<PrayerCard tier="detail">`)
- `/prayer-wall/dashboard` (PrayerCard renders in the private dashboard)
- `/prayer-wall/answered` (PrayerCard renders in the Answered Wall — Spec 6.6 surface)
- `/prayer-wall/user/:id` (PrayerCard renders on the existing legacy profile — fallback target, MUST remain functional per AC-D)

---

## Spec-time Recon Summary (verified on disk 2026-05-15)

Brief's R1–R6 are designated PLAN-RECON-REQUIRED — the planner runs them at `/plan-forums` time. This summary captures spec-time filesystem reality so the plan can build on confirmed facts rather than re-discover them. **TWO of the Brief's gating questions resolved as FAIL at spec-time.** The findings below are AUTHORITATIVE — the planner MUST surface them to Eric per Brief §10 before writing any implementation plan.

| Item | Status | Evidence |
|---|---|---|
| **R1 (GATING): `/u/:username` route exists** | ❌ **CONFIRMED FAIL** | `grep -n "path=" frontend/src/App.tsx` enumerates every route lines 261–323. The closest matches are `path="/profile/:userId"` (line 312, → `GrowthProfile`) and `path="/prayer-wall/user/:id"` (line 308, → `PrayerWallProfile`). **No `/u/...` route is declared anywhere in `App.tsx`.** A `<Link to="/u/somename">` rendered today would fall through to the `path="*"` catch-all at line 323 (`<NotFound />`), NOT to a "no-op until Phase 8" route. The master plan stub's "the link is a no-op until Phase 8 ships, then automatically lights up" framing is **inaccurate** — a non-existent route resolves to NotFound in React Router, which is a broken-link experience for the user. Brief §R1 explicitly says "STOP and surfaces to Eric" in this case. |
| **R3 (GATING): `username` field on the post DTO** | ❌ **CONFIRMED FAIL** | `grep -n "authorName\|username\|userId" frontend/src/types/prayer-wall.ts frontend/src/types/api/prayer-wall.ts` returns ONLY `userId: string \| null` and `authorName: string` on `PrayerRequest` (`types/prayer-wall.ts:43-44`) and the comment/related DTOs. **No `username` field exists on `PrayerRequest`, `PrayerComment`, or the API DTOs.** The brief's wording "Update PrayerCard.tsx author link to point to `/u/:username` when username is available" presupposes a `username` field that doesn't exist. Adding it would require: (a) extending the TypeScript types; (b) updating mock-data fixtures (`mocks/prayer-wall-mock-data.ts`); (c) — when the backend ships — updating the Phase 3 backend `PostResponse` DTO + the user table to carry / look up usernames. Brief §R3 explicitly says "plan STOPS and surfaces" in this case. |
| R2 — PrayerCard author affordance location | ✅ confirmed (with nuance) | The author-name link element lives at `frontend/src/components/prayer-wall/PrayerCard.tsx:216-227` inside the `<header>` block: `<Link to={authorLink} className="font-semibold text-white hover:underline">{prayer.authorName}</Link>` with the fallback `<span className="font-semibold text-white">{prayer.authorName}</span>`. **Nuance the brief did NOT call out:** the `authorLink` constant declared at lines 150-152 (`!prayer.isAnonymous && prayer.userId ? \`/prayer-wall/user/${prayer.userId}\` : null`) is **reused by both the Avatar wrap (lines 194-204) AND the author-name link (lines 216-227)**. A naive change to `authorLink` shifts BOTH surfaces (avatar click target AND name click target) simultaneously. The brief assumed a single name-link element; recon found a shared constant feeding two link elements. This is the natural shape — changing both in lockstep is the right behavior — but the plan must document the two consumers explicitly so neither is missed and the test matrix covers both. |
| R4 — anonymous-post non-link behavior | ✅ confirmed | The existing `authorLink` constant at lines 150-152 returns `null` when `prayer.isAnonymous === true` (regardless of `userId`). The author-name JSX at lines 216-227 falls through to `<span>` when `authorLink === null`. The Avatar wrap at lines 194-204 similarly renders a non-wrapped `<Avatar>` when `authorLink === null`. **Anonymous posts are already correctly non-clickable on both surfaces.** Brief §W1 (highest-priority watch-for) is structurally satisfied by reusing this same `null`-when-anonymous logic — any new routing must short-circuit on `prayer.isAnonymous` BEFORE checking for `username`. |
| R5 — does `/u/:username` pre-filter to author's posts? | ❌ unanswerable | The route doesn't exist (R1 FAIL), so the question of what its landing-page component does is moot. If R1 is resolved (the route is built), R5 becomes answerable. As of spec-time it is a downstream of R1. |
| R6 — "no broken links during the transition" | ✅ confirmed (preserved by fallback) | The existing `/prayer-wall/user/:id` route at `App.tsx:308` (→ `PrayerWallProfile`) is unmodified by this spec. The fallback rule in the Brief §2 Approach preserves links to that route for posts without `username`. Reading (a) of the brief — preserving in-flight URLs across deploy — is structurally satisfied. Reading (b) — no `/u/null` or `/u/undefined` at render time — must be enforced by the new conditional in PrayerCard.tsx. Both are covered. |
| R7 — `PrayerWallProfile` (`/prayer-wall/user/:id`) is the fallback target | ✅ confirmed | `App.tsx:308` mounts `PrayerWallProfile` at this path. The component is unmodified by 6.10. The fallback target works today and will continue to work. |
| Prereq 6.9 (Composer Drafts) | ✅ shipped | `_specs/forums/spec-6-9.md` exists; recent commits include `2b189e0 Spec 6-9`. The spec tracker line 189 still shows ⬜ for 6.9 (tracker stale relative to commit log — trust commits). Brief §intro notes 6.10 doesn't technically depend on 6.9's surface; sequencing only. |
| Existing PrayerCard test file | ✅ exists | `frontend/src/components/prayer-wall/__tests__/PrayerCard.test.tsx`. New 6.10 tests extend this file (Brief §7 "Modify"). |

### Recon override

**The brief's "Goal" presupposes a route + DTO field that the codebase does not yet provide.** Per Brief §10 ("Plan STOPS and surfaces"), the planner MUST surface this to Eric BEFORE writing any implementation plan. There are three honest paths forward — pick one BEFORE `/plan-forums` runs:

1. **Defer 6.10 until Phase 8** (`round3-phase08-spec01-unified-profile` and siblings) ships the `/u/:username` route + the `username` field on the post DTO. 6.10 becomes a trivial link rewrite at that point — the brief's framing is correct, just out of order. This matches the master plan stub's intent ("anticipating Phase 8 is fine") interpreted strictly: anticipate it by NOT shipping the link until the route exists. Likely the right move.

2. **Expand scope** to include (a) creating the `/u/:username` route + a minimal landing-page component, and (b) adding `username` to the `PrayerRequest` DTO + every mock fixture + the (future) backend `PostResponse`. This balloons Size S into something significantly larger and crosses into Phase 8 territory. **Brief §10 forbids silent scope expansion** — Eric must explicitly approve.

3. **Re-scope 6.10 to a pure no-op-link rewrite** that points at `/u/:username` knowing it routes to NotFound today. This silently degrades the UX (broken-link experience for every non-anonymous post with a hypothetical `username`) and contradicts AC-C and AC-D from the brief ("No broken links during the transition"). **Not recommended; included for completeness only.**

The planner does NOT pick. The planner surfaces these three options and lets Eric decide. Until Eric picks, /plan-forums MUST NOT proceed to write an implementation plan.

### Other recon notes (non-gating)

- **No new Liquibase / DB / API work** is implied by the brief, regardless of which path above is chosen. Even path 2 (scope expansion) is purely frontend — `username` would need to be added to the DTO + mocks, but no backend or schema changes ship in this spec. Phase 3 has already shipped the Prayer Wall backend; future username support would be a separate spec under a phase that owns the `users` table.
- **Animation tokens (BB-33):** if the planner ends up adding any transitions to the link (e.g., a focus-ring fade), import from `frontend/src/constants/animation.ts` per `.claude/rules/09-design-system.md` § "Animation Tokens". No hardcoded `200ms` / `cubic-bezier(...)`.
- **Accessibility (Gate-5):** the existing `<Link className="font-semibold text-white hover:underline">` already has a visible focus ring via the Visual Rollout standards (inherited from the root focus-visible rule). The accessible name comes from `{prayer.authorName}`. T4 in the test matrix asserts both. The Avatar wrap at lines 194-204 uses `tabIndex={-1} aria-hidden="true"` so the avatar Link does NOT compete for keyboard focus with the name Link — both surfaces clicking to the same target is intentional UX without double-tab-stop, and the test matrix must verify the new routing preserves this.
- **`6.6b-deferred-3` author-affordance row** (Brief §W5): that row uses `authUser.id === prayer.userId` (PrayerCard.tsx:109-110) for ownership and is structurally independent from the author-name-link element at lines 216-227. T6 in the test matrix asserts this isolation. The brief's W5 watch-for is sound; recon confirms separation.

---

{Brief content preserved verbatim below — Section numbers are the brief's own; Master Plan references unchanged.}

---

# Brief: Spec 6.10 — Prayer Wall Search by Author

**Master plan reference:** `_forums_master_plan/round3-master-plan.md` (Spec 6.10 stub, live version, lines 6154-6169) — ID `round3-phase06-spec10-search-by-author`

**Spec ID:** `round3-phase06-spec10-search-by-author`

**Phase:** 6 (Engagement Features)

**Size:** S (per stub) — the smallest spec in the wave. One link target change with a fallback path, ~4 tests.

**Risk:** Low (per stub).

**Tier:** **Low/Standard** — a routing-target change on the PrayerCard author affordance. No backend, no DB, no API (assuming the `/u/:username` route already exists — see Recon R1, which is the gating question). The brief is sized to match: short, focused, one chunk.

**Prerequisites:**
- 6.9 (per stub). 6.9 is currently executing as this brief is written. 6.10 doesn't technically depend on 6.9's surface (composer drafts vs. author-link routing — different surfaces entirely), but the stub sequences them. Plan-recon confirms 6.10 can ship when 6.9 has merged.

**Pipeline:** This brief → `/spec-forums spec-6-10-brief.md` → `/plan-forums` → execute → `/code-review`. Verify-with-playwright optional — the author link is visual but the change is a route target swap with a fallback; one playwright pass confirming the link points to the right place is reasonable but not required. Plan decides.

---

## 1. Branch Discipline

Branch: `forums-wave-continued`. Eric handles all git ops manually. CC never commits/pushes/branches at any phase. Standard discipline.

---

## 2. What 6.10 Builds (Verbatim from the Stub)

**Goal:** Tapping an author name on a card opens their profile with the author's posts pre-filtered.

**Approach:** Update `PrayerCard.tsx` author link to point to `/u/:username` when username is available; fall back to the existing `/prayer-wall/user/:userId` route otherwise.

**Acceptance criteria (verbatim from the stub):**
- Author link points to `/u/:username` when username available
- Falls back to existing `/prayer-wall/user/:userId` otherwise
- No broken links during the transition
- At least 4 tests

That is the entire stub. The brief below adds plan-time recon (with one gating question), a small set of watch-fors, light test expansion, files, and ACs. It deliberately does NOT add MPDs, new gates, or scope the stub doesn't mandate.

---

## 3. Recon Ground Truth (Plan-Time)

**R1 — GATING QUESTION: does the `/u/:username` route already exist?**
This is the single recon question that determines 6.10's actual size. The stub *treats* `/u/:username` as a destination to point at — implying it exists. The 6.5 master-plan amendment also referenced a `/u/:username/intercessor-timeline` route (deferred in the Path B decision). Plan reads the routing config (`App.tsx`, the React Router setup, or wherever routes are declared) and confirms:
- Is `/u/:username` an active route today? If yes → 6.10 is the trivial link-target change the stub describes. Proceed.
- Is it NOT an active route? If no → 6.10 implicitly requires building the route + the username-based profile page first, which balloons Size S into something significantly larger. **Plan STOPS and surfaces to Eric.** This is scope-changing news; the spec must not silently expand.
- Is there a partial implementation (e.g., the route file exists but is unmounted, or it mounts a placeholder)? Plan reports the state and surfaces.

**R2 — the PrayerCard author affordance.**
Plan reads `PrayerCard.tsx` to find the existing author-link element. From earlier wave findings: `PrayerCard.tsx:110` checks `authUser !== null && prayer.userId !== null && authUser.id === prayer.userId` for the author-affordance row (6.6b-deferred-3 territory). The author *display* (name link on the card itself) is a separate concern from that affordance row. Plan finds the exact JSX element rendering the author name link and the prop/data shape it uses today.

**R3 — the data shape: is `username` always available?**
The stub says "when username is available." Plan reads the post/feed DTOs (likely `frontend/src/types/api/prayer-wall.ts` and the backend `PostResponse`) to determine:
- Does every post carry a `username` field today, or is it nullable?
- For anonymous posts (`isAnonymous: true`), is `username` redacted to `null` (backend-side) the way `userId` is? This matters — anonymous posts must NOT route to a public profile page, ever. The fallback rule and the anonymous rule may overlap.
- If `username` is added by 6.10 (i.e., the field doesn't exist yet), the spec grows — plan STOPS and surfaces.

**R4 — anonymous-post behavior on the author affordance.**
For anonymous posts, the card displays "Anonymous" as the author label — it should NOT be a link to any profile, regardless of routing rules. Plan confirms the current PrayerCard behavior here (it almost certainly already non-links the Anonymous label, but recon verifies). The new `/u/:username` routing must not accidentally make anonymous-post author labels clickable.

**R5 — "pre-filtered to the author's posts" — is that already what `/u/:username` does?**
The goal says "opens their profile with the author's posts pre-filtered." If `/u/:username` already shows the author's posts by default, this is trivially satisfied. If the route exists but lands on a profile page that doesn't pre-filter to their posts, 6.10 needs to add the filter — or accept the goal as aspirational and surface to Eric. Plan reads the route's landing-page component (whatever `/u/:username` renders) and reports.

**R6 — "no broken links during the transition."**
The stub explicitly calls this out as an AC. What does "the transition" mean? Two readings:
- (a) During deployment — ensuring the old `/prayer-wall/user/:userId` route stays functional so any in-flight URLs (bookmarks, shared links, cached pages) still work after the change. The fallback handles this.
- (b) Within a single rendered feed — ensuring no card renders a `/u/:username` link when username is null/missing (which would route to a broken URL).
Both readings are reasonable; the spec covers both via the fallback rule + the anonymous-post rule. Plan honors both and the tests assert both.

---

## 4. Gates (Standard — Nothing Exotic)

6.10 is a low-risk routing-target change. The gates are the usual discipline.

| Gate | Applicability | Notes |
|------|---------------|-------|
| Gate-1 (Liquibase rules) | **N/A** | No DB changes. |
| Gate-2 (OpenAPI updates) | **N/A** | No API changes (assuming R3 confirms `username` is already in the DTO). |
| Gate-3 (Copy Deck) | **Applies (lightly).** | The author name itself is the link text; no new copy is introduced. Anonymous label stays as "Anonymous" (whatever the existing string is) — not changed. |
| Gate-4 (Tests mandatory) | **Applies.** | Stub mandates at least 4 tests. See Section 6. |
| Gate-5 (Accessibility) | **Applies.** | Author link is keyboard-reachable, has accessible name (the author's display name), focus-visible state. |
| Gate-6 (Performance) | **N/A** | Route target swap is not a perf concern. |
| Gate-7 (Rate limiting) | **N/A** | No backend. |
| Gate-8 (Respect existing patterns) | **Applies.** | Use whatever Link/`<Link>` component the existing author label uses today (probably React Router's `Link`). Don't invent a new routing primitive. |
| Gate-9 (Plain text only) | **N/A** | Already-plain author names. |
| Gate-10 (Crisis detection supersession) | **N/A** | No content surface touched. |
| Gate-G-NO-SCOPE-CREEP | **Applies.** | 6.10 is the link-target change with fallback. Nothing else. NO building of the `/u/:username` route or profile page if it doesn't already exist — R1 STOPS in that case. NO changes to the existing `/prayer-wall/user/:userId` route. NO author-card redesign. |

---

## 5. Watch-Fors

Real failure modes worth covering.

**W1.** **Anonymous-post author labels MUST NOT become clickable.** This is the highest-priority watch-for. An anonymous post's author label is "Anonymous" — if the new routing logic accidentally renders a `/u/:username` link with `username = null`, or renders any link at all for anonymous posts, that's a privacy regression. The check is: `isAnonymous: true` → plain `<span>` (or whatever the current non-link rendering is), never a `<Link>`.

**W2.** **Fallback to `/prayer-wall/user/:userId` only when `username` is null AND post is NOT anonymous.** The fallback exists for non-anonymous posts where `username` might still be missing (legacy data, edge case). Anonymous posts skip BOTH routes and render no link at all.

**W3.** **No broken `/u/null` or `/u/undefined` links.** The link element conditionally renders — if `username` is the string `"null"` or `"undefined"` (a stringification bug), the test should catch it. The safest shape: `username && !isAnonymous ? <Link to={\`/u/${username}\`}>...</Link> : <fallback>`.

**W4.** **Old route `/prayer-wall/user/:userId` MUST remain functional.** During the transition (AC: "No broken links during the transition"), existing bookmarks / shared URLs / cached pages routed via `/prayer-wall/user/:userId` continue to work. The old route is not removed in this spec — only the *new* author-link targets shift to `/u/:username`. Deprecation/removal of the old route is a future spec, NOT 6.10.

**W5.** **The author affordance row (6.6b-deferred-3 territory) is untouched.** 6.6b-deferred-3 is about the inline "Share an update" / "Un-mark as answered" affordances on the author's own answered card. That row uses `authUser.id === prayer.userId` for ownership. 6.10 changes the author-NAME-LINK rendering, which is a different element. Plan-recon R2 confirms they're separate; 6.10 must not touch the affordance row.

**W6.** **R1 gates the whole spec.** If the `/u/:username` route doesn't exist, 6.10 STOPS at recon. Building the route is not in scope. Plan surfaces and Eric decides whether to expand scope, defer 6.10, or write a separate route-creation spec first.

**W7.** **Stay in `PrayerCard.tsx`.** The stub says "Update PrayerCard.tsx author link." That's the surface. Don't propagate the change to other places that render author names (PrayerDetail header, profile page header, comment-author labels) without recon surfacing each one as a deliberate scope decision. If those other surfaces are inconsistent with `PrayerCard.tsx` after 6.10, that's a documented follow-up, not a 6.10 absorption.

---

## 6. Test Specifications

The stub mandates **at least 4 tests.** Target ~6 to cover the watch-fors. Frontend: Vitest + RTL.

**T1.** Non-anonymous post with `username` present → author link renders as `<Link to="/u/{username}">`.
**T2.** Non-anonymous post with `username` null/missing → author link falls back to `<Link to="/prayer-wall/user/{userId}">`.
**T3.** Anonymous post → author label is NOT a link at all (plain text/span), regardless of username/userId presence.
**T4.** Author link is keyboard-reachable and has accessible name matching the author's display name (a11y).
**T5.** (Edge case) Author link does NOT render as `/u/null` or `/u/undefined` if `username` is the string-cast of a nullish value.
**T6.** (Regression) The 6.6b-deferred-3 author-affordance row (`Share an update` / `Un-mark as answered` on the author's own answered card) is unchanged by 6.10's link-target change — ownership check still uses `userId`, affordances still render for the author.

---

## 7. Files

### Modify

- `frontend/src/components/prayer-wall/PrayerCard.tsx` — update the author-name-link element per Section 2's Approach.
- `frontend/src/components/prayer-wall/__tests__/PrayerCard.test.tsx` (or wherever PrayerCard tests live — plan-recon confirms) — add the 4-6 tests.

### Do NOT modify

- `/prayer-wall/user/:userId` route or its landing page — stays as-is for the fallback to work and existing URLs to continue resolving.
- `/u/:username` route or its landing page — 6.10 only points AT it; it does not build or modify it. If it doesn't exist, R1 STOPS.
- The author-affordance row in `PrayerCard.tsx` (6.6b-deferred-3 territory) — untouched.
- Any other author-name rendering surfaces (PrayerDetail header, comment authors, profile page header) — out of scope for 6.10; flag inconsistencies for follow-up.
- Anonymous-post rendering logic beyond ensuring the author label remains non-clickable.

### Create

- Nothing (no new files; only edits to PrayerCard.tsx and its test file).

### Delete

- Nothing.

---

## 8. Acceptance Criteria (from the stub + a few clarifications)

6.10 is done when:

- [ ] A. Author link on a non-anonymous post with `username` present routes to `/u/:username`.
- [ ] B. Author link on a non-anonymous post without `username` falls back to `/prayer-wall/user/:userId`.
- [ ] C. Anonymous-post author label is not a link — renders as plain text/span.
- [ ] D. The old `/prayer-wall/user/:userId` route still resolves correctly (no removal, no breaking).
- [ ] E. No `/u/null` or `/u/undefined` links generated.
- [ ] F. At least 4 tests passing (Section 6 targets ~6).
- [ ] G. 6.6b-deferred-3 author-affordance row is unchanged.
- [ ] H. Frontend lint + typecheck + tests pass.
- [ ] I. No backend, DB, or API changes (verify by diff).

---

## 9. Out of Scope

- Building the `/u/:username` route or its landing page (R1 gates this — if the route doesn't exist, 6.10 STOPS).
- Removing or deprecating the `/prayer-wall/user/:userId` route (future spec).
- Updating author-name renderings outside `PrayerCard.tsx` (PrayerDetail header, comment-author labels, profile page header) — documented as follow-up if inconsistencies surface.
- Pre-filtering / search UI within the destination profile page (the goal language implies this; R5 determines whether it's already satisfied by `/u/:username`'s default behavior).
- Anonymous-author-profile semantics (deferred-3 territory).
- Username-collision or username-change handling (route stability is a separate concern, future spec if needed).

---

## 10. Recommended Planner Instruction

> Plan Spec 6.10 from `spec-6-10-brief.md`. This is a Low-risk, Size S frontend-only spec — the smallest in the Phase 6 wave. Keep the plan proportionate.
>
> Plan-recon R1 is GATING: confirm `/u/:username` route exists today. If it does NOT, STOP and surface to Eric — do not silently expand scope to build the route. R3 is similarly gating on the `username` field's presence in the post DTO.
>
> Also confirm R2 (PrayerCard author-link location), R4 (anonymous-post non-link behavior), R5 (whether the profile page already pre-filters to the author's posts), and R6 (transition meaning).
>
> Honor Gate-G-NO-SCOPE-CREEP. 6.10 is a routing-target change in PrayerCard.tsx with a fallback. Nothing else. If during execute you find inconsistencies on other author-name surfaces (PrayerDetail, comments, profile header), document and surface — do not absorb.
>
> Standard discipline: no git operations.

---

## 11. Prerequisites Confirmed

- [x] The live 6.10 master plan stub read in full (lines 6154-6169) — authored against the LIVE stub, not the pristine-baseline backup.
- [~] 6.9 — listed as prereq in the stub. 6.9 is currently executing; 6.10 doesn't technically depend on 6.9's surface but should wait for 6.9 to merge before pipeline.
- [ ] **R1 (gating):** `/u/:username` route exists — confirmed at plan-recon, not now.
- [ ] **R3 (gating):** `username` field present on the post DTO — confirmed at plan-recon.

---

## End of Brief
