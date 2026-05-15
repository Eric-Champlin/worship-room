# Forums Wave: Spec 6.6b-deferred-2 — Answered-Text Crisis-Scan Coverage

**Master Plan Reference:** None — this spec has no master-plan stub. It closes `6.6b-deferred-2`, a SAFETY-SURFACE GAP logged in `_forums_master_plan/spec-tracker.md` line 168 (brief-drift remediation block, 2026-05-14). The gap was discovered during 6.6b plan-recon (R3 finding); Eric signed off 2026-05-14 to defer to a dedicated atomic spec rather than absorb it into 6.6b.
**Brief Source:** `_plans/forums/spec 6.6b-deferred-2-brief.md` (preserved verbatim below as Sections 0–8)
**Branch:** `forums-wave-continued` (per the brief's Section 0 — CC never alters git state; Phase 6 specs accumulate on this branch — see commits `01b029b Spec 6-8 So Close`, `c78843b Spec 6-6b`, `55630ce Spec 6-7`, `f9f2652 Spec 6-6`)
**Date:** 2026-05-14
**Spec ID:** `round3-phase06-spec06b-deferred2-answered-text-crisis-scan`
**Phase:** 6 (Slow Sanctuary / Quiet Engagement Loop) — remediation follow-up
**Size:** S–M (narrow surface: one service, one detection-input path, no new feature, no UI, no migration)
**Risk:** **HIGH** — crisis-detection surface. Failure mode: a post containing crisis content in `answered_text` goes unflagged because the field it was written in was never scanned.
**Tier:** **xHigh** — small code surface, but it is a safety mechanism. The cost of getting it subtly wrong (scanning one path but not another, scanning at create but not edit) is real-world harm to a vulnerable user.

---

## Affected Frontend Routes

**N/A — backend-only spec.** No UI changes, no copy changes, no new affordances. The change is invisible to the user except in the rare case where an `answered_text` containing crisis keywords would now correctly trigger the in-app crisis-resources block (`CreatePostResponse.withCrisisResources`) and the AFTER_COMMIT `CrisisDetectedEvent` → `CrisisAlertService.alert(...)` audit-log + Sentry alert. `/verify-with-playwright` is therefore SKIPPED for this spec; verification is `./mvnw test` plus the new test cases enumerated in Section 5 of the brief.

---

## Spec-time Recon Summary (verified on disk 2026-05-14)

The brief's R3 plan-recon item is "the definitive list of every code path that writes `answered_text`." The brief explicitly lists three expected paths AND tells plan-recon to STOP and surface to Eric if the codebase doesn't match. Spec-time recon ran first; the findings below are the planner's starting set, not a substitute for plan-recon's deeper read.

| Item | Status | Evidence |
|---|---|---|
| Spec 6.6 (Answered Wall) shipped — `posts.answered_text` column exists | ✅ | `Post.java:56-57` — `@Column(name = "answered_text", columnDefinition = "TEXT")` |
| Spec 6.6b (Answered Wall Drift Remediation) shipped — adds the answered-text edit + un-mark UX path | ✅ | Commit `c78843b Spec 6-6b` on `forums-wave-continued`. The 6.6b "edit-existing-answered-text" affordance and "un-mark" affordance are wired through `UpdatePostRequest.answeredText` + `UpdatePostRequest.isAnswered` — see `PostService.updatePost` lines 540-559. **There is NO new method and NO new handler — 6.6b extended `updatePost`'s existing `wantsAnsweredEdit` / `wantsAnsweredTextEdit` branches in place.** This contradicts the brief's framing of the 6.6b edit path as possibly being a "new method on PostService or a dedicated handler" — it is neither. (See R-FINDING-A below.) |
| Crisis-detection contract for posts | ✅ identified | `com.worshiproom.safety.PostCrisisDetector.detectsCrisis(String text) -> boolean` (case-insensitive substring match against `SELF_HARM_KEYWORDS`). Sibling detectors: `CommentCrisisDetector`, `AskCrisisDetector`, `PrayerCrisisDetector`, `JournalReflectionCrisisDetector`. All four backend keyword lists are kept identical via `PostCrisisDetectorParityTest`. |
| Crisis-flag side-effect contract (CLAUDE.md addendum item 7) | ✅ confirmed | `com.worshiproom.safety.CrisisAlertService.alert(UUID contentId, UUID authorId, ContentType type)` is the canonical entry point. Invoked by `CrisisDetectedEventListener` AFTER_COMMIT in response to `new CrisisDetectedEvent(postId, authorId, ContentType.POST)`. **Spec MUST NOT introduce a sibling alert service.** |
| Crisis-detection rules / contract files | ✅ identified | `.claude/rules/01-ai-safety.md` § "Crisis Intervention Protocol" (the technical contract — primary AI classifier, fallback keywords, fail-closed-in-UI rule, escalation). `.claude/rules/CRITICAL_NO_AI_AUTO_REPLY.md` (HARD ENFORCEMENT GATE — adjacent to crisis content but governs LLM-on-user-content, NOT detection itself; preserved as relevant context). The community-facing voice lives at `content/community-guidelines.md`. |
| Frontend `crisisFlag` consumption (no work for this spec, but informs what the new test cases should assert) | ✅ pre-checked | `posts.crisis_flag` is set to `TRUE` on detection. `CreatePostResponse.withCrisisResources(dto, CrisisResources.buildBlock(), requestId)` surfaces the in-app block on create. On update, no crisis-resources block is returned in the body (the existing pattern in `updatePost` lines 568-570 fires the AFTER_COMMIT event but does NOT reshape the response — see R-FINDING-D below). Spec stays consistent with this established pattern. |
| Existing precedent for combining a secondary text field into `detectionInput` (informs D-FieldVsConcat) | ✅ identified | `PostService.createPost` lines 297-300 (Spec 4.6b) — `imageAltText` is concatenated into `detectionInput` with a single space: `sanitizedContent + " " + sanitizedAltText`. **This is a real precedent for the concat option in D-FieldVsConcat.** The brief defers the field-vs-concat decision to plan-recon; the planner should weigh the imageAltText precedent against the consideration that a crisis flag on `answered_text` may semantically point at "the answer" rather than "the post body." See R-FINDING-C below. |
| Likely test home for the new cases | ✅ identified | `backend/src/test/java/com/worshiproom/post/MarkAndUnmarkAnsweredTest.java` already exercises the answered-text mark/edit/un-mark flow and is the natural extension point for the three "IS flagged on answered_text crisis content" cases. `PostWriteIntegrationTest.java` (create path) and `PostServiceWriteTest.java` (unit) are alternate homes if the planner prefers separation by category. The choice is the planner's; both shapes are precedented. |
| Spec file `_specs/forums/spec-6-6b-deferred-2.md` | ⬜ before this run | safe to create |

---

### Spec-time recon findings surfaced for the planner

Four items merit explicit planner attention beyond the brief's R1-R7 list. None of them invalidate the brief; they refine its framing with on-disk facts.

**R-FINDING-A. The brief's "three write paths" do not match the codebase 1:1. There is one method (`updatePost`) with three internal branches that all write `answered_text`. `createPost` is NOT a current write path.**

The brief enumerates: (i) `PostService.createPost`, (ii) `PostService.updatePost`, (iii) "the 6.6b answered-text edit path." On-disk reality is finer-grained:

- `PostService.createPost` (lines 317-319) **always** sets `post.setAnsweredText(null)`. `CreatePostRequest` (the entire DTO) has no `answeredText` field at all. **Today, no value can flow into `answered_text` through this path.** A post is always created with `answered=false` / `answeredText=null` / `answeredAt=null`; the answered state is reachable only via a subsequent `PATCH`.
- `PostService.updatePost` is the single method that writes `answered_text`. It has three internal branches that produce a write:
  - **Branch 1** (lines 544-548): `wantsAnsweredEdit && willBeAnswered && !wasAnswered` (false→true with optional answered text supplied at the same time).
  - **Branch 2** (lines 552-555): `wantsAnsweredEdit && willBeAnswered && wasAnswered && wantsAnsweredTextEdit` (true→true with text update — the rare-but-valid case the inline comment names).
  - **Branch 3** (lines 556-559): `!wantsAnsweredEdit && wantsAnsweredTextEdit && post.isAnswered()` (the 6.6b edit-existing-answered-text affordance).
- The 6.6b "Share an update" affordance lands in Branch 3 above. **There is no separate method or handler.**

The brief explicitly anticipated this kind of deviation ("if plan-recon finds one of these doesn't exist as described, it STOPS and surfaces to Eric before planning"). The planner has two reasonable framings; **either is acceptable, both must be surfaced to Eric, and the brief's STOP instruction is preserved**:

1. **Narrow framing (recommended starting point).** The single method is `updatePost`. The fix is one new crisis-detection step that runs whenever the post-update operation will commit an `answered_text` value (i.e., any of Branches 1/2/3 above is taken with a non-null sanitized `answeredText`). This is one logical change in one method, with three logical sub-cases all funneling through the same detection invocation. **Test parity** with the brief's Section 5 ("Create / Update / 6.6b edit" three cases) is preserved by structuring the new tests around Branches 1/2/3 — the brief's "create path" maps to Branch 1 (false→true with text supplied), since that is the de-facto "first time `answered_text` is written" event for a given post.
2. **Future-proof framing.** Cover Branches 1/2/3 in `updatePost` AND add a defensive crisis-detection invocation in `createPost` that fires whenever `request.answeredText()` is non-null — even though `CreatePostRequest` does not have that field today. Pro: forward-compatible if a future spec adds `answeredText` to `CreatePostRequest`. Con: dead code today, harder to test (no production code path can reach it), and arguably **violates Gate-G-NO-SCOPE-CREEP** because today there IS no createPost write path to bring under scanning.

The narrow framing matches the brief's atomicity intent (D-Atomic + Gate-G-ATOMIC: "every place `answered_text` is written, scan it"). It also matches the brief's W29-consistency intent (Gate-G-NO-W29-INCONSISTENCY: "create/update/edit consistent — all scan"), because if create can never write, then "create scans" and "create doesn't scan" are operationally equivalent. The future-proof framing is a hedge against a hypothetical future spec, not a fix for today. **Default to narrow; surface both to Eric in the plan and let the deciding the in plan-time STOP-and-surface conversation.**

If Eric chooses narrow, the deferred-3 status of `createPost` should be documented in the spec body as "verified non-write today; future spec adding `answeredText` to `CreatePostRequest` MUST add scanning at the same time" — i.e., make it the next spec's responsibility, not this one's.

**R-FINDING-B. `updatePost`'s existing crisis-detection invocation (line 514-526) only fires on `wantsContentEdit`. It does NOT fire on any other field edit, including `imageAltText` if such a path existed (it doesn't — image is a create-only field per Spec 4.6b).**

The shape of the existing detection block is:

```java
boolean newCrisisFlag = post.isCrisisFlag();
boolean fireCrisisEvent = false;
if (wantsContentEdit) {
    boolean detected = PostCrisisDetector.detectsCrisis(sanitizedContent);
    if (detected) {
        if (!post.isCrisisFlag()) newCrisisFlag = true;
        fireCrisisEvent = true;
    }
}
```

The "crisisFlag NEVER cleared by author edit" rule (line 524-525 inline comment) is load-bearing — it ensures a once-flagged post stays flagged for moderator review even if the author redacts the trigger words. **The new `answered_text` detection MUST follow this same one-way ratchet:** detection true → set the flag if not already set, fire the AFTER_COMMIT event; detection false → no change, never clear an existing flag. This is a corollary of D-SameAsBody.

The planner should colocate the new `answered_text` detection with the existing `wantsContentEdit` branch so the post commit produces **at most one** `CrisisDetectedEvent` even if both `content` and `answered_text` carry crisis text in the same PATCH. The dedup safety net inside `CrisisDetectedEventListener` (per the inline comment at line 519: "listener dedups via the 1h cache so a second event is harmless") covers the edge case if two events do fire, but a single combined detection is cleaner and cheaper.

**R-FINDING-C. There is a real precedent for the D-FieldVsConcat decision: `imageAltText` is concatenated into `detectionInput` in `createPost` (Spec 4.6b, lines 297-300).**

The existing pattern is:

```java
String detectionInput = sanitizedAltText != null
        ? sanitizedContent + " " + sanitizedAltText
        : sanitizedContent;
boolean crisisFlag = PostCrisisDetector.detectsCrisis(detectionInput);
```

This is a single `detectionInput` string, single detector call, single returned boolean. The flag points at "the post" (post-level `crisis_flag = TRUE`); there is no per-field flag and no granularity that distinguishes "crisis in body" from "crisis in alt text."

The brief flags D-FieldVsConcat as deferred to plan-recon: "whether `answered_text` enters `detectionInput` as a discrete field or concatenated with body. Plan-recon decides with Eric; brief does not pre-commit." With the imageAltText precedent in hand, the planner has a real choice with a real precedent on one side:

- **Concat option** (matches imageAltText precedent): `detectionInput = sanitizedContent + " " + sanitizedAnsweredText`. Pros: established pattern, single detection call, single event, single flag, simpler tests, Gate-G-CONTRACT-CONFORM (D-SameAsBody) is satisfied because `answered_text` is treated identically to body. Cons: a moderator looking at `crisis_flag = TRUE` cannot tell from the flag which field tripped it.
- **Discrete option**: separate `PostCrisisDetector.detectsCrisis(answered_text_only)` call. Pros: a moderator could in principle see which field tripped (though no UI surfaces this today). Cons: introduces a new pattern, doubles the detection calls when both fields change in the same PATCH, breaks the "at most one event per commit" property unless carefully sequenced.

**Spec-time recommendation (planner can override): concat.** Matches imageAltText precedent exactly. Matches D-SameAsBody. Single event per commit. The moderator-attribution concern is theoretical — the existing UI doesn't expose it, and adding it would be a separate feature (out of scope per Gate-G-NO-SCOPE-CREEP). Plan-recon should still STOP and surface to Eric for sign-off because the brief explicitly defers this decision, but the planner should arrive at that conversation with the imageAltText precedent in hand and a default recommendation.

The `updatePost` case is slightly different from `createPost` because the inputs are conditional. The planner needs a small idiom — something along the lines of:

```java
// Build detection input from whatever content+answeredText is being committed.
// Use sanitizedContent if it's being edited; else fall back to the existing post.getContent().
// Same for answeredText.
String contentForDetection = wantsContentEdit ? sanitizedContent : post.getContent();
String answeredTextForDetection = (sanitizedAnsweredText != null) ? sanitizedAnsweredText
        : (wantsAnsweredEdit && willBeAnswered ? null : post.getAnsweredText());
String detectionInput = answeredTextForDetection != null
        ? contentForDetection + " " + answeredTextForDetection
        : contentForDetection;
```

This is illustrative, not prescriptive — the planner produces the actual idiom with full visibility into the surrounding control flow. The spirit is: detect on the post's *committed* content + answered_text, not on whatever happens to be in the request body. This is what makes Branch 3 (edit-only-answered-text) coherent: the post body is unchanged, but if the new answered_text contains crisis keywords, the post body shouldn't suddenly become irrelevant to the detection contract.

**R-FINDING-D. The shape of crisis-resources surfacing in the response.**

`createPost` returns `CreatePostResponse.withCrisisResources(dto, CrisisResources.buildBlock(), requestId)` when `crisisFlag` was set during create. `updatePost` does NOT have an analogous "with crisis resources" response variant — it returns a plain `PostDto` regardless of whether a crisis was newly detected. This is an existing pattern (lines 568-570: AFTER_COMMIT event fires, but no response reshape).

**The new spec MUST stay consistent with the existing pattern**: don't introduce a `withCrisisResources` variant on the update response. The detection's job is to set the DB flag and emit the AFTER_COMMIT event so the audit log + Sentry alert + (future) email alert fire. The frontend already polls or refetches the post on PATCH success and will re-render with the new `crisisFlag` field; there is no need for an in-band crisis-resources block on the update response. (If Eric prefers an in-band block on update, that is a separate UX spec.)

This finding is informational, not a direction-change. It's noted here so the planner doesn't accidentally introduce a `UpdatePostResponse.withCrisisResources(...)` variant that would be a scope-creep violation of Gate-G-NO-SCOPE-CREEP.

---

### Plan-recon items still required (brief Section 1, 2, 7, 8)

Spec-time recon resolved several items the brief listed. The following are STILL plan-recon-required because they need deeper reading or comparative analysis the planner is better positioned to do:

- **PR-1** — Read `MarkAndUnmarkAnsweredTest.java` in full and confirm the existing test fixtures cover the three branches enumerated in R-FINDING-A. The new "IS flagged on crisis content in answered_text" tests should mirror the existing structure.
- **PR-2** — Confirm the proposed concat idiom in R-FINDING-C interacts correctly with the existing `wantsContentEdit` detection block (R-FINDING-B). The planner produces the actual `updatePost` diff, runs it past the `MarkAndUnmarkAnsweredTest.java` + `PostWriteIntegrationTest.java` expectations, and adjusts.
- **PR-3** — Decide field-vs-concat with Eric (D-FieldVsConcat). Spec-time recommends concat per R-FINDING-C; plan-recon STOPS and surfaces.
- **PR-4** — Decide narrow-vs-future-proof framing with Eric (R-FINDING-A). Spec-time recommends narrow; plan-recon STOPS and surfaces.
- **PR-5** — Verify no fourth `answered_text` write path exists outside `PostService.updatePost`. Spec-time recon checked `PostService` exhaustively but a paranoia sweep with `grep -rn "setAnsweredText\|answeredText\s*=" backend/src/main/` is cheap insurance.
- **PR-6** — Confirm none of the answered-feed cache invalidation paths (`@CacheEvict` at `updatePost` line 395) need to expand to cover crisis-flag transitions. The existing `@CacheEvict(value = "answered-feed", allEntries = true)` already fires on every `updatePost`, so a newly-set `crisis_flag` will trigger cache invalidation at the next read — but the planner should verify there's no separate cache layer that would surface a stale `crisis_flag = false` for the affected post.

---

### Items the spec MUST NOT do (Gate-G-NO-SCOPE-CREEP enforcement)

Quick-reference for the planner — anything in this list that gets touched is a hard violation:

- Refactor or replace `PostCrisisDetector` (D-NoMechanismRefactor).
- Touch any other unscanned field. If plan-recon finds one (e.g., `scriptureText` on edit), document it as a separate gap and surface to Eric — do NOT absorb it.
- Change crisis-flag UX (the in-app crisis-resources block, the Sentry alert format, the audit-log shape).
- Introduce a `UpdatePostResponse.withCrisisResources(...)` variant (R-FINDING-D).
- Modify any 6.6b shipped test assertion (Gate-G-6.6b-REGRESSION-SAFE).
- Modify the `CreatePostRequest` DTO to add an `answeredText` field. If the future-proof framing is chosen in PR-4, the defensive scan goes inside `createPost` *without* exposing the field — the field-add is a separate spec.

---

## Brief (preserved verbatim)

The remainder of this file is the verbatim content of `_plans/forums/spec 6.6b-deferred-2-brief.md`. The header, route stance, and recon summary above are this skill's additions; everything below is Eric's authored brief.

---

# Brief: Spec 6.6b-deferred-2 — Answered-Text Crisis-Scan Coverage

**Spec ID:** `round3-phase06-spec06b-deferred2-answered-text-crisis-scan`

**Origin:** Not a master-plan stub. This spec closes 6.6b-deferred-2, a SAFETY-SURFACE GAP logged in the spec-tracker.md brief-drift remediation block (2026-05-14). The gap was discovered during 6.6b plan-recon (the R3 finding), not planned — so there is no master-plan stub, and this brief is authored from the tracker entry + the R3 finding. Plan-recon must verify all current-code claims against the live repo.

**Phase:** 6 (remediation follow-up)

**Size:** S–M (narrow surface: one service, one detection-input path, no new feature, no UI, no migration)

**Risk:** HIGH — crisis-detection surface. The failure mode is a post containing crisis content going unflagged because the field it's written in was never scanned. Tier accordingly.

**Tier:** xHigh — small code surface, but it is a safety mechanism. The cost of getting it subtly wrong (scanning one path but not another, or scanning at create but not edit) is a real-world harm to a vulnerable user. xHigh thinking for all phases.

**Prerequisites:**

- 6.6 (Answered Wall) — ✅ shipped (`answered_text` field exists)
- 6.6b (Answered Wall Drift Remediation) — must be merged before this executes. 6.6b adds the answered-text edit path, which is one of the three write paths this spec must cover. If 6.6b is not yet merged, this spec waits.

**Branch:** `forums-wave-continued`. Eric handles all git ops. CC never commits/pushes/branches.

---

## 0. Why This Spec Exists — Read First

During 6.6b plan-recon, the R3 finding established: `PostService.createPost` does NOT include `answeredText` in `detectionInput`. Crisis detection never sees answered-text content.

W29 of the 6.6b brief was a conditional: "if `answered_text` is scanned at creation, the edit path must scan too." Plan-recon found the condition unmet — neither path scans. That made W29 technically satisfied (create and edit are consistent: both unscanned), which is why 6.6b correctly did not add scanning: adding it to the edit path alone would have created the inconsistency W29 exists to prevent, and adding it to both paths was scope creep beyond 6.6b's four documented gap areas.

Eric signed off (2026-05-14) to defer to a dedicated spec where the work can be done atomically across ALL `answered_text` write paths. This is that spec.

The core principle of this spec: **atomicity.** `answered_text` must be added to crisis detection's `detectionInput` across every write path in the same spec, the same change. Never one path without the others. A partial fix is worse than no fix because it creates the false confidence that the surface is covered.

---

## 1. The Three Write Paths — [PLAN-RECON MUST VERIFY ALL THREE]

The tracker entry names three `answered_text` write paths that must all be brought under crisis scanning:

- `PostService.createPost` — when a post is created already marked answered with answer text. R3 confirmed this path does NOT currently include `answeredText` in `detectionInput`.
- `PostService.updatePost` — when a post is marked answered (or its content edited) through the update path. [PLAN-RECON: confirm whether this path touches `answered_text` and whether it currently scans].
- The 6.6b answered-text edit path — the "Share an update" / edit-answered-text affordance 6.6b shipped. [PLAN-RECON: confirm the exact service method 6.6b introduced for this — it may be a new method on PostService or a dedicated handler; confirm whether it currently scans].

Plan-recon's first job: read the live `PostService.java` (and any 6.6b-added handler) and produce the definitive list of every code path that writes `answered_text`. The "three paths" above is the expected set from the tracker — if plan-recon finds a fourth (or finds one of these doesn't exist as described), it STOPS and surfaces to Eric before planning. Do not assume the three are exhaustive or exactly as named.

---

## 2. What "Bring Under Crisis Scanning" Means — [PLAN-RECON MUST VERIFY THE DETECTION CONTRACT]

The fix is: `answered_text` content must flow into whatever `detectionInput` the crisis-detection mechanism consumes, on every write path, the same way post body content already does.

Plan-recon must establish, from live code:

- What `detectionInput` actually is — its type, its shape, how post body content currently populates it.
- What consumes it — the crisis classifier / detection service, and whether it's synchronous or deferred.
- Whether `answered_text` should be scanned as a separate field or concatenated into the existing input. [PLAN-RECON: determine which — the answer affects whether a crisis flag points at "the post" vs "the answer text specifically." Surface the tradeoff to Eric if non-obvious.]
- Whether there is a Universal Rule 13 / crisis-detection spec or rules file that defines the contract this must conform to. The 6.4 work added `.claude/rules/CRITICAL_NO_AI_AUTO_REPLY.md` — there may be a sibling crisis-detection rules file. Plan-recon reads it and the brief/plan conform to it.

This brief deliberately does not specify the detection mechanism's internals because it cannot be confirmed from here. Plan-recon grounds it.

---

## 3. Gates

- **Gate-G-ATOMIC (HARD).** `answered_text` is added to `detectionInput` on ALL write paths in this spec, or none. Code review hard-blocks a diff that scans one path but not another. There is no partial-credit version of this spec.
- **Gate-G-NO-W29-INCONSISTENCY (HARD).** After this spec, create / update / edit paths are consistent — all scan `answered_text`. The exact thing W29 guards against (one scans, another doesn't) must not exist in the merged result.
- **Gate-G-CONTRACT-CONFORM (HARD).** The scanning conforms to the crisis-detection contract as defined by its rules file / spec (plan-recon establishes this). `answered_text` is scanned the same way post body content is — not a weaker or different treatment.
- **Gate-G-NO-SCOPE-CREEP (HARD).** This spec adds `answered_text` to crisis scanning. It does NOT refactor the detection mechanism, does NOT touch other unscanned fields (if plan-recon finds any, it documents them as a separate future gap and surfaces — it does not absorb them), does NOT change crisis-flag UX.
- **Gate-4 (Tests mandatory).** See Section 5.
- **Gate-G-6.6b-REGRESSION-SAFE (HARD).** 6.6b's shipped tests pass unmodified.

---

## 4. Decisions Catalog

- **D-Atomic:** all `answered_text` write paths brought under scanning in one spec, one change. The defining decision.
- **D-SameAsBody:** `answered_text` is scanned the same way post body content is — same detection path, same severity treatment, same flag behavior. No bespoke weaker handling.
- **D-NoMechanismRefactor:** if the cleanest long-term fix would be a detection-mechanism refactor, this spec does NOT do it — it does the minimal correct thing (add the field to every path's input) and, if a refactor is genuinely warranted, plan-recon surfaces that to Eric as a separate recommendation. This spec stays small and safe.
- **D-FieldVsConcat:** [DEFERRED TO PLAN-RECON] — whether `answered_text` enters `detectionInput` as a discrete field or concatenated with body. Plan-recon decides with Eric; brief does not pre-commit.

---

## 5. Test Specifications

Minimum coverage — plan-recon may add:

- Create path: a post created with crisis content in `answered_text` IS flagged. (Today it is not — this is the regression-defining test.)
- Update path: a post updated such that `answered_text` gains crisis content IS flagged.
- 6.6b edit path: editing `answered_text` to add crisis content IS flagged.
- Consistency: the same crisis string in `answered_text` produces the same detection outcome regardless of which of the three paths wrote it.
- Non-regression — body: post body crisis detection still works exactly as before (unchanged).
- Non-regression — benign: benign `answered_text` does NOT produce a false positive.
- 6.6b regression: 6.6b's shipped test suite passes with zero assertion changes.

[PLAN-RECON: confirm whether these are unit tests against the service, integration tests against the detection mechanism, or both — depends on how detection is wired.]

---

## 6. Files — [ALL PLAN-RECON CONFIRMED]

**Modify (expected):**

- `PostService.java` — `createPost`, `updatePost`, and the 6.6b answered-text edit method: add `answered_text` to `detectionInput` construction in each.
- Possibly the detection-input builder / DTO, if `detectionInput` is assembled in a shared helper — [PLAN-RECON: if there's a shared builder, the fix may be cleaner there, but it must still demonstrably cover all three call sites].

**Create:**

- Test file(s) per Section 5.

**Do NOT modify:**

- The crisis-detection mechanism's internals (Gate-G-NO-MECHANISM-REFACTOR).
- 6.6b's shipped test assertions.
- Any other unscanned field (document + surface, don't absorb).

---

## 7. Recommended Planner Instruction

Plan `spec-6-6b-deferred-2` from this brief. This is a HIGH-risk safety-surface remediation spec closing 6.6b-deferred-2 from the tracker. There is no master-plan stub — author the plan from this brief + live-code recon.

Plan-recon FIRST, before planning: (1) read live `PostService.java` and enumerate every `answered_text` write path — confirm or correct the expected three; (2) establish what `detectionInput` is and how post-body content currently populates it; (3) find and read the crisis-detection contract (rules file / spec — check `.claude/rules/` for a sibling of `CRITICAL_NO_AI_AUTO_REPLY.md`); (4) determine field-vs-concat for `answered_text` in `detectionInput`.

If plan-recon finds a write path not in the expected three, or finds the detection contract forbids something this brief assumes, or finds another entirely-unscanned field — STOP and surface to Eric before planning.

Honor HARD gates: Gate-G-ATOMIC, Gate-G-NO-W29-INCONSISTENCY, Gate-G-CONTRACT-CONFORM, Gate-G-NO-SCOPE-CREEP, Gate-G-6.6b-REGRESSION-SAFE. Standard discipline: no git operations.

---

## 8. Prerequisites Confirmed

- 6.6 shipped — `answered_text` exists
- 6.6b merged — REQUIRED before execute (this spec covers 6.6b's edit path). Confirm before pipeline.
- Tracker entry 6.6b-deferred-2 is the authoritative scope source
- [PLAN-RECON] — live `PostService.java` wiring confirmed
- [PLAN-RECON] — crisis-detection contract / rules file located and read

---

End of Brief
