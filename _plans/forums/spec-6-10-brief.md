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
