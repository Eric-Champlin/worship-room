# Forums Wave Plan: Spec 6.6b-deferred-2 — Answered-Text Crisis-Scan Coverage

**Spec:** `_specs/forums/spec-6-6b-deferred-2.md`
**Master Plan:** None — remediation spec closing tracker entry `6.6b-deferred-2` (no master-plan stub). Spec body is authored from the tracker entry + the 6.6b R3 plan-recon finding.
**Date:** 2026-05-14
**Branch:** `forums-wave-continued` (existing, in-progress; CC does no git work)
**Phase:** 6 (Slow Sanctuary / Quiet Engagement Loop) — remediation follow-up
**Size:** S–M (one service method touched, no new endpoints, no migration, no UI)
**Risk:** **HIGH** — crisis-detection surface. The failure mode is a post containing crisis content going unflagged because the field it was written in was never scanned.
**Spec ID (canonical):** `round3-phase06-spec06b-deferred2-answered-text-crisis-scan`

---

## Affected Frontend Routes

**N/A — backend-only spec.** No UI, no routes, no copy. The behavioral change is invisible to users except in the rare case where an `answered_text` carrying crisis keywords now correctly trips the in-app crisis-resources block and the AFTER_COMMIT Sentry alert. `/verify-with-playwright` is skipped for this spec; verification is `./mvnw test` plus the new test cases enumerated in Step 3.

---

## Universal Rules Checklist (Forums Wave specs only)

This is a remediation spec without a master-plan stub, but the 17 Universal Rules still apply by inheritance. Rule-by-rule:

- [x] Rule 1: No git operations by CC — confirmed; user handles the branch.
- [x] Rule 2: Master Plan Quick Reference — N/A (no stub); tracker entry + 6.6b R3 finding + brief read in full.
- [N/A] Rule 3: Liquibase — no schema changes in this spec.
- [N/A] Rule 4: OpenAPI spec — no API contract change (the response shape on PATCH /posts/{id} is unchanged; only the post's `crisis_flag` boolean may flip true under new conditions, which is already documented).
- [N/A] Rule 5: Copy Deck — no user-facing copy in this spec.
- [x] Rule 6: Tests mandatory — Step 3 + Step 4 add 9 new integration tests covering the three branches, the consistency invariant, non-regression on body, non-regression benign, combined-fields, un-mark one-way-ratchet, and the AFTER_COMMIT event verification.
- [N/A] Rule 7: localStorage keys — no frontend storage changes.
- [N/A] Rule 8: BB-45 anti-pattern — no reactive stores.
- [N/A] Rule 9: Accessibility — no UI.
- [N/A] Rule 10: Performance — single in-process String concat + keyword scan, ~12 keywords against typically <2 KB text. No measurable cost.
- [N/A] Rule 11: Brand voice — no copy.
- [x] Rule 12: Anti-pressure design — N/A by inheritance (no comparison framing introduced).
- [x] Rule 13: Crisis detection supersession — **THIS spec IS a crisis-detection coverage fix.** Routes through the existing `CrisisAlertService.alert(contentId, authorId, ContentType.POST)` AFTER_COMMIT pattern. No new sibling alert service per Phase 3 Execution Reality Addendum item 7.
- [x] Rule 14: Plain text only — confirmed. `answered_text` is sanitized via `htmlSanitizerPolicy` (existing), no Markdown or HTML rendering changes.
- [N/A] Rule 15: Rate limiting — no new endpoints; `updatePost` already rate-limited by the existing posts-rate-limit pipeline.
- [x] Rule 16: Respect existing patterns — uses the existing `PostCrisisDetector.detectsCrisis(String)` static, the existing concat-into-`detectionInput` idiom from Spec 4.6b `createPost` lines 297-300, and the existing AFTER_COMMIT `CrisisDetectedEvent` → `CrisisAlertService` chain. No new patterns.
- [N/A] Rule 17: Per-phase cutover spec — N/A (this is a remediation spec, not a cutover spec).

---

## Architecture Context

Recon ran on disk at `forums-wave-continued` HEAD (2026-05-14). Confirmed and revised the brief's expected three-write-paths framing per Spec-time recon R-FINDING-A. **Both Plan-Recon STOP-and-surface items have been resolved with Eric (2026-05-14 in-conversation):**

- **PR-3 (D-FieldVsConcat):** Eric chose **CONCAT** — matches Spec 4.6b imageAltText precedent at `PostService.java:297-300`. Single detector call. Single AFTER_COMMIT event. Satisfies D-SameAsBody (answered_text treated identically to body).
- **PR-4 (Narrow vs Future-Proof):** Eric chose **NARROW** — covers `updatePost` only. `createPost` is documented as deferred-3 status: `CreatePostRequest` has no `answeredText` field today and `createPost` always sets `post.setAnsweredText(null)` (line 318). A future spec adding `answeredText` to `CreatePostRequest` MUST add scanning at the same time.

### Files this spec touches

| File | Touch | Reason |
|------|-------|--------|
| `backend/src/main/java/com/worshiproom/post/PostService.java` | MODIFY (one method: `updatePost`, lines 394-578) | Add `answered_text` to the existing crisis-detection block; reorder so detection runs over the post's about-to-be-committed state |
| `backend/src/test/java/com/worshiproom/post/MarkAndUnmarkAnsweredTest.java` | MODIFY (add 9 `@Test` methods) | The existing test file already exercises the answered-text mark/edit/un-mark flow on the same `PostService.updatePost` entry point; it's the natural extension point per spec-time recon line 34 |

### Files this spec MUST NOT touch (per Gate-G-NO-SCOPE-CREEP, Gate-G-6.6b-REGRESSION-SAFE)

- `PostCrisisDetector.java` — D-NoMechanismRefactor; the detector contract is the spec's input, not its target.
- `CrisisAlertService.java`, `CrisisDetectedEvent.java`, `CrisisDetectedEventListener.java` — the AFTER_COMMIT chain is reused unchanged.
- `CreatePostRequest.java` — adding an `answeredText` field is OUT of scope (PR-4 narrow framing).
- `UpdatePostRequest.java` — DTO surface unchanged.
- `Post.java` — entity unchanged.
- `PostMapper.java` — DTO mapping unchanged.
- Liquibase changelog directory — no schema changes.
- Any other unscanned field (e.g., `scriptureText` on edit) — if recon found one, the brief instructs the planner to document it separately and surface. Recon did NOT find any other free-text user-content field on `Post` that is currently unscanned: `content` (scanned at create + on edit), `imageAltText` (scanned at create), `answered_text` (THIS spec), `scriptureText` is curated/pasted scripture (not free-form user expression for spec purposes — brief Section 1 limits scope to "answered_text write paths" only). No fourth gap to surface.
- Existing 6.6b assertions in `MarkAndUnmarkAnsweredTest` (T16, T17, T18) — Gate-G-6.6b-REGRESSION-SAFE forbids changes to these. New tests are added alongside, existing tests are read-only.

### The three write paths (corrected per R-FINDING-A)

The brief lists three paths. Codebase reality: **one method, `PostService.updatePost`, with three internal branches that all write `answered_text`.** `createPost` is NOT a current write path (line 318 hardcodes `null`).

Branches inside `updatePost` (line numbers from current HEAD):

- **Branch 1 (lines 544-547):** `wantsAnsweredEdit && willBeAnswered && !wasAnswered` — false→true; sets `answered_at = now`, writes `sanitizedAnsweredText` (may be null if text omitted).
- **Branch 1b (lines 548-551):** `wantsAnsweredEdit && !willBeAnswered && wasAnswered` — un-mark; sets `answered_text = null`. (Not in the brief's "three paths" but is a write — a null write.)
- **Branch 2 (lines 552-555):** `wantsAnsweredEdit && willBeAnswered && wasAnswered && wantsAnsweredTextEdit` — true→true with text update; writes non-null `sanitizedAnsweredText`.
- **Branch 3 (lines 556-559):** `!wantsAnsweredEdit && wantsAnsweredTextEdit && post.isAnswered()` — 6.6b "Share an update" edit; writes non-null `sanitizedAnsweredText`.

The brief's "Create / Update / 6.6b edit" three test cases map to Branches 1 / 2 / 3 respectively (the de-facto "first answered_text write" is Branch 1, not createPost).

### Crisis-detection contract (re-confirmed from `.claude/rules/01-ai-safety.md`)

The brief's plan-recon item (3) was to find a crisis-detection rules file. Found two:
- `.claude/rules/01-ai-safety.md` § "Crisis Intervention Protocol" — the technical contract for keyword detection, fail-closed-in-UI rule, and escalation.
- `.claude/rules/CRITICAL_NO_AI_AUTO_REPLY.md` — adjacent but governs LLM-on-user-content. NOT detection itself. Preserved as relevant context for moderator-facing surfaces; does NOT constrain this spec.

The contract for posts has shipped: `PostCrisisDetector.detectsCrisis(String text)` is the entry point; the side-effect chain is `posts.crisis_flag = TRUE` + AFTER_COMMIT `CrisisDetectedEvent` → `CrisisAlertService.alert(contentId, authorId, ContentType.POST)`. This spec extends the input to that contract; it does not modify the contract itself.

### One-way ratchet rule (R-FINDING-B)

The existing detection block at `PostService.updatePost` lines 514-526 implements a one-way ratchet: detection true → set the flag if not already set + fire the AFTER_COMMIT event; detection false → no change, **never clear an existing flag**. The new `answered_text` detection MUST follow the same one-way ratchet. Inline comment from the existing code (line 524-525) is preserved verbatim and applies to the new combined detection.

---

## Database Changes

**None.** No schema changes. No Liquibase changesets.

---

## API Changes

**None.** No new endpoints. No request/response DTO shape changes. The existing `PATCH /api/v1/posts/{id}` response shape is unchanged — only the conditions under which `crisisFlag: true` appears in the response body broaden to include `answered_text` crisis content.

---

## Assumptions & Pre-Execution Checklist

- [x] Prerequisites complete: 6.6 (Answered Wall, `answered_text` column exists), 6.6b (Drift Remediation, edit/un-mark path) — both shipped on `forums-wave-continued`. Verified via `git log` showing commits `f9f2652 Spec 6-6` and `c78843b Spec 6-6b`.
- [ ] Docker is running (PostgreSQL via Testcontainers).
- [ ] Backend compiles cleanly before starting: `./mvnw -pl backend compile`
- [N/A] Frontend build — no frontend changes.
- [N/A] Liquibase changeset filename collision check — no new changesets.
- [x] PR-3 and PR-4 plan-recon STOP-and-surface decisions resolved with Eric (2026-05-14): concat + narrow.

---

## Spec-Category-Specific Guidance

**This is a BACKEND-ONLY remediation spec.** Affected Frontend Routes is `N/A`. `/verify-with-playwright` is skipped. Focus:

- No Liquibase changeset (no schema work).
- Testcontainers integration test via `MarkAndUnmarkAnsweredTest` extending `AbstractIntegrationTest` (existing parent — see `06-testing.md`).
- No OpenAPI extension (no contract change).
- No JPA entity / repository / DTO surface changes — only a service-method internal change.
- No rate-limiting changes (the existing posts rate-limit on `updatePost` already applies).
- No SecurityConfig changes (PATCH /posts/{id} is already authenticated).
- No new `@RestControllerAdvice` (no new exception types thrown).
- No new `@Modifying` JPQL methods.
- Crisis-flag handling routes through the existing `CrisisAlertService.alert(contentId, authorId, ContentType.POST)` chain per Phase 3 Addendum item 7.

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **D-Atomic** (brief) | Adopt — single spec covers all write paths | Per brief Gate-G-ATOMIC. Branches 1/2/3 (and the un-mark Branch 1b for completeness) all funnel through one detection invocation in `updatePost`. |
| **D-SameAsBody** (brief) | Adopt — concat treatment, same severity, same flag behavior | Per brief. The one-way ratchet from R-FINDING-B applies identically. |
| **D-NoMechanismRefactor** (brief) | Adopt | `PostCrisisDetector` untouched. New scanning consumes the existing static API. |
| **D-FieldVsConcat (PR-3)** | **CONCAT** — `detectionInput = content + " " + answeredText` | Eric confirmed 2026-05-14. Matches Spec 4.6b imageAltText precedent at lines 297-300. Single detector call. Single AFTER_COMMIT event. Simpler tests. Theoretical moderator-attribution loss accepted (no UI surfaces it today). |
| **PR-4 narrow vs future-proof** | **NARROW** — `updatePost` only | Eric confirmed 2026-05-14. `createPost` cannot today write `answered_text`; defensive scan would be dead code. Future spec adding `answeredText` to `CreatePostRequest` MUST add scanning at the same time (documented in this spec body as deferred-3 status). |
| **Detection block ordering** | **Reorder — apply mutations FIRST, then detect on the post's about-to-be-committed in-memory state** | Cleaner than the existing detect-then-mutate ordering once `answered_text` enters detection: the alternative requires re-deriving the three-branch write logic in the detection gate, which is error-prone for a HIGH-risk safety spec. Reorder localizes the change to `updatePost` and produces dead-simple detection logic (`post.getContent() + " " + post.getAnsweredText()` over the mutated in-memory entity). See Step 1 for the diff shape. |
| **Trigger gate** | **`wantsContentEdit \|\| answeredTextChanged`** where `answeredTextChanged` is computed by snapshotting `post.getAnsweredText()` before the mutation block and comparing | Avoids false-positive scans when `wantsAnsweredTextEdit` is supplied on a non-answered post (where the existing line 556 silently no-ops the write). Precise to "every write path of `answered_text`" per brief atomicity intent. |
| **Single combined event** | Yes — when BOTH `content` and `answered_text` change in the same PATCH AND both trip the detector, exactly one `CrisisDetectedEvent` fires | The 1-hour Caffeine dedup cache in `CrisisDetectedEventListener` keyed on `contentId` would dedup duplicates anyway, but a single combined detection is cleaner. |
| **Un-mark interaction with one-way ratchet** | Un-marking a post that was previously crisis-flagged does NOT clear the flag | Existing one-way ratchet from R-FINDING-B applies to the combined detection. Tested in Step 3 Test 8. |
| **Test home** | Extend `MarkAndUnmarkAnsweredTest.java` with 9 new `@Test` methods | Per spec-time recon line 34. The file already seeds answered posts with `seedAnsweredPost` and exercises the three branches; the new tests reuse the fixture. No new test file. |
| **Un-detection on content with no answered_text edit** | Unchanged from current behavior | If `wantsContentEdit` alone is true and the body trips the detector, the existing test coverage (`PostWriteIntegrationTest` or similar) continues to pass. New trigger gate preserves this case. |
| **`answeredTextChanged` snapshot for branch detection** | Use `java.util.Objects.equals(beforeText, afterText)` | Handles all three transitions (null→non-null, non-null→null, non-null→non-null with change, non-null→non-null with same value). Importing `java.util.Objects` adds one import. |
| **No `withCrisisResources` variant on update response (R-FINDING-D)** | Confirmed — `updatePost` continues to return plain `PostDto` even when crisis newly flagged | Avoids scope creep; matches existing pattern at line 568-570. Frontend re-renders on PATCH response which includes the updated `crisisFlag` boolean. |
| **PR-5 (paranoia sweep)** | Resolved — no fourth write path exists | `grep -rn 'setAnsweredText\\|answeredText\\s*=' backend/src/main/` returns only the five expected hits: `Post.java:161` (setter), `PostService.java:318` (createPost null), `PostService.java:547/551/554/558` (updatePost four branches). |
| **PR-6 (cache invalidation)** | Resolved — existing `@CacheEvict(value = "answered-feed", allEntries = true)` at `updatePost` line 395 already evicts on every PATCH | A newly-set `crisis_flag` will be visible on the next answered-feed read (2-min TTL repopulation). No additional cache work needed. |

---

## Implementation Steps

### Step 1: Modify `PostService.updatePost` to scan `answered_text` alongside `content`

**Objective:** Add `answered_text` to crisis-detection's `detectionInput` on every write path (Branches 1/1b/2/3). Reorder the detection block to run AFTER scalar mutations so the gate is the simple "did `answered_text` change in this PATCH?" rather than a re-derived four-branch predicate.

**Files to create/modify:**

- `backend/src/main/java/com/worshiproom/post/PostService.java` — modify the `updatePost` method (lines 394-578). Two code regions change; everything else in `updatePost` stays byte-identical.

**Diff shape (illustrative; final wording is the executor's, the spirit is fixed):**

```java
// Add to imports at the top of the file:
import java.util.Objects;
```

**Region A — at the top of the existing Step 8 (current lines 511-526):** REPLACE the existing detect-then-newCrisisFlag block with a **deferred-detection placeholder** that snapshots the pre-mutation `answered_text` value. The actual detection moves to Region B (below). The placeholder is just:

```java
// Step 8: snapshot pre-mutation state for crisis re-detection (Step 9b).
// Detection is deferred until AFTER mutations so the detection input is the
// post's about-to-be-committed state. See Plan-Time Divergence #1.
String preMutationAnsweredText = post.getAnsweredText();
```

(The two existing `boolean newCrisisFlag = ...; boolean fireCrisisEvent = false;` declarations move into Region B.)

**Region B — directly after the existing is_answered transitions block (current line 559) and BEFORE the existing `post.setUpdatedAt(now)` at line 562:** ADD the new detection block.

```java
// Step 9b: crisis re-detection on the post's about-to-be-committed state.
// Concat pattern matches Spec 4.6b createPost imageAltText precedent
// (lines 297-300). Triggers when content OR answered_text was actually
// written this PATCH. The one-way ratchet rule (Spec-time recon R-FINDING-B):
// detection true → set the flag if not already set + fire event;
// detection false → never clear an existing flag.
boolean newCrisisFlag = post.isCrisisFlag();
boolean fireCrisisEvent = false;
boolean answeredTextChanged = !Objects.equals(preMutationAnsweredText, post.getAnsweredText());
if (wantsContentEdit || answeredTextChanged) {
    String detectionInput = post.getAnsweredText() != null
            ? post.getContent() + " " + post.getAnsweredText()
            : post.getContent();
    boolean detected = PostCrisisDetector.detectsCrisis(detectionInput);
    if (detected) {
        if (!post.isCrisisFlag()) {
            newCrisisFlag = true;
        }
        fireCrisisEvent = true;
    }
    // NOTE: crisisFlag NEVER cleared by author edit — once flagged, stays flagged
    // for moderator review.
}
if (newCrisisFlag != post.isCrisisFlag()) {
    post.setCrisisFlag(newCrisisFlag);
}
```

**Region C — at the existing line 537 `if (newCrisisFlag != post.isCrisisFlag())`:** DELETE this line (and its enclosing `if`-body that calls `setCrisisFlag`). It has been relocated to the end of Region B.

**Region D — at the existing line 568-570 AFTER_COMMIT event publish block:** UNCHANGED. The `fireCrisisEvent` variable that drives it is now set inside Region B.

**Final method shape after the diff:**

```
public PostDto updatePost(...) {
    // (lines 401-510 UNCHANGED — empty body check, post lookup, ownership,
    //  exempt-vs-non-exempt edit detection, edit-window gate, visibility-direction
    //  gate, cross-field validation, help_tags normalization, sanitization)

    // Step 8 (NEW shape): snapshot for deferred crisis re-detection.
    String preMutationAnsweredText = post.getAnsweredText();

    // Step 9 (existing): apply scalar mutations (content, category, visibility,
    //  scripture, help_tags, qotd, challenge). DOES NOT apply crisis_flag here.
    if (wantsContentEdit) post.setContent(sanitizedContent);
    // ... etc unchanged ...

    // is_answered + answered_text transitions (existing lines 540-559 unchanged).
    if (wantsAnsweredEdit) {
        // Branches 1, 1b, 2 — unchanged
    } else if (wantsAnsweredTextEdit && post.isAnswered()) {
        // Branch 3 — unchanged
    }

    // Step 9b (NEW): crisis re-detection on post-mutation state, then apply flag.
    // (Region B above.)

    post.setUpdatedAt(now);
    Post saved = postRepository.save(post);

    // AFTER_COMMIT crisis event if needed (existing line 568-570 unchanged).
    if (fireCrisisEvent) {
        eventPublisher.publishEvent(new CrisisDetectedEvent(saved.getId(), saved.getUserId(), ContentType.POST));
    }

    log.info("postUpdated postId={} userId={} editorId={} crisisFlag={} requestId={}",
            saved.getId(), saved.getUserId(), principal.userId(), saved.isCrisisFlag(), requestId);

    return postMapper.toDto(saved);
}
```

**Details (call out for the executor):**

- The `Objects.equals` import is the only new import in `PostService.java`. Add it alphabetically: `import java.util.Objects;` between the existing `import java.util.List;` and `import java.util.Optional;`.
- The `fireCrisisEvent` variable's scope changes (it's declared in Region B now, used in the existing AFTER_COMMIT publish block at line 568). Verify the variable is in scope where it's used.
- Region C deletion is precise: the entire `if (newCrisisFlag != post.isCrisisFlag()) post.setCrisisFlag(newCrisisFlag);` line goes away. The same logic now lives at the end of Region B.
- The existing inline comment at line 524-525 ("NOTE: crisisFlag NEVER cleared by author edit — once flagged, stays flagged for moderator review") is preserved in Region B, identical wording.

**Guardrails (DO NOT):**

- DO NOT modify `PostCrisisDetector.java`, `CrisisAlertService.java`, `CrisisDetectedEvent.java`, `CrisisDetectedEventListener.java`, `ContentType.java`. (D-NoMechanismRefactor.)
- DO NOT add a `UpdatePostResponse.withCrisisResources(...)` variant. (R-FINDING-D — scope creep.)
- DO NOT modify `CreatePostRequest.java`, `UpdatePostRequest.java`, or `Post.java`. (Narrow framing per PR-4.)
- DO NOT scan `request.answeredText()` directly — scan `post.getAnsweredText()` after mutations apply, so the no-op case (`wantsAnsweredTextEdit && !post.isAnswered()`) does NOT trigger a false-positive flag. The `answeredTextChanged` gate handles this.
- DO NOT clear `crisis_flag` on detection-false (one-way ratchet from R-FINDING-B). The diff explicitly preserves this — `newCrisisFlag` is only ever set true, never reset false in this block.
- DO NOT modify the existing AFTER_COMMIT event publish (Region D). The event payload is `(saved.getId(), saved.getUserId(), ContentType.POST)` — unchanged.
- DO NOT add a second `eventPublisher.publishEvent(...)` call. Exactly one event per commit, even when both `content` and `answered_text` trip the detector.
- DO NOT touch the `@CacheEvict(value = "answered-feed", allEntries = true)` at line 395 — it already invalidates on every PATCH (PR-6 resolved).
- DO NOT touch any other unscanned field. If somehow recon missed a fourth gap, document it as a separate spec — do not absorb. (Gate-G-NO-SCOPE-CREEP.)

**Verification:**

- [ ] Code compiles: `./mvnw -pl backend compile`
- [ ] Spot-check the diff with `git diff backend/src/main/java/com/worshiproom/post/PostService.java` — expect ~25 net new lines (Region B addition minus Region C deletion), one new import, no changes outside the regions described.
- [ ] No other files modified: `git status` should show only `PostService.java` modified at this step.
- [ ] Full backend test suite still passes (no regression on existing tests): `./mvnw -pl backend test` — every test currently green stays green. **Specifically `MarkAndUnmarkAnsweredTest.T16/T17/T18` (Gate-G-6.6b-REGRESSION-SAFE).**

**Test specifications:** Step 1 adds the production code. Test cases land in Step 3.

**Expected state after completion:**

- [ ] `PostService.java` has a single import addition (`java.util.Objects`) and a relocated/extended crisis-detection block inside `updatePost`.
- [ ] All existing backend tests pass unchanged.
- [ ] The behavioral surface: a PATCH that newly writes `answered_text` with crisis keywords sets `crisis_flag=true` and fires the AFTER_COMMIT `CrisisDetectedEvent`. A PATCH with only benign `answered_text` or only `wantsContentEdit` continues to behave exactly as before.

---

### Step 2: (No work) — confirm no Liquibase, OpenAPI, or DTO surface changes

**Objective:** Sanity-check that the spec has not drifted into any of the forbidden surfaces.

**Files to create/modify:** None.

**Details:**

This is a verification-only step, executed by `git status` after Step 1.

**Verification:**

- [ ] `git status` shows ONLY `backend/src/main/java/com/worshiproom/post/PostService.java` modified.
- [ ] `ls backend/src/main/resources/db/changelog/` shows no new files vs `main`.
- [ ] `git diff backend/src/main/resources/openapi.yaml` shows no changes.
- [ ] `git diff backend/src/main/java/com/worshiproom/post/dto/` shows no changes.
- [ ] `git diff backend/src/main/java/com/worshiproom/safety/` shows no changes.

**Expected state after completion:**

- [ ] Diff scope is exactly one file (production code), with one production-code change.

---

### Step 3: Add the seven core test cases to `MarkAndUnmarkAnsweredTest`

**Objective:** Cover the brief's Section 5 test specifications via integration tests against the live PATCH endpoint. Per spec-time recon line 34, extend `MarkAndUnmarkAnsweredTest.java` rather than create a new test file — the existing fixture already seeds answered posts with the exact shape needed.

**Files to create/modify:**

- `backend/src/test/java/com/worshiproom/post/MarkAndUnmarkAnsweredTest.java` — add 7 `@Test` methods (Step 3) + 2 additional `@Test` methods (Step 4 = combined-fields + event-payload).

**Details:**

Tests use the existing `seedAnsweredPost` helper for the post fixture and the existing `aliceJwt` for the author. The crisis keyword used in tests is `"end it all"` (from `PostCrisisDetector.SELF_HARM_KEYWORDS`) — chosen because it's a clean phrase that doesn't appear naturally in test fixtures elsewhere.

For each test, the assertions cover both the response (HTTP 200 + the `crisisFlag: true` in JSON body) AND the DB state (`SELECT crisis_flag FROM posts WHERE id = ?`).

**Test 1: Branch 1 — false→true with crisis answered_text IS flagged.**

Maps to the brief's "Create path" test (per R-FINDING-A, Branch 1 is the de-facto "first answered_text write" event).

```
1. Seed a non-answered post by Alice (use existing seedAnsweredPost helper variant
   or a new seedUnansweredPost helper; pass benign body "pray for me").
2. PATCH /api/v1/posts/{id} with body {"isAnswered":true, "answeredText":"I want to end it all"}.
3. Assert HTTP 200.
4. Assert response JSON: crisisFlag == true.
5. Assert DB: SELECT crisis_flag FROM posts WHERE id = ? → true.
```

**Test 2: Branch 2 — true→true with crisis answered_text text update IS flagged.**

Per R-FINDING-A Branch 2: post was previously answered with benign text, user submits `{isAnswered: true, answeredText: <crisis>}` — text gets updated, post stays answered, scan fires.

```
1. Seed an answered post by Alice with benign answered_text="praise!".
2. PATCH with {"isAnswered":true, "answeredText":"end it all — done"}.
3. Assert HTTP 200, crisisFlag true (response + DB).
```

**Test 3: Branch 3 (6.6b "Share an update" path) — text-only edit on already-answered post with crisis IS flagged.**

```
1. Seed an answered post by Alice with benign answered_text="praise!".
2. PATCH with {"answeredText":"end it all"} (NO isAnswered field).
3. Assert HTTP 200, crisisFlag true (response + DB).
```

**Test 4: Consistency — same crisis string in all three branches all flag.**

Parametrized over Branches 1/2/3 with the same crisis text. Three sub-cases yielding identical `crisis_flag = true`.

```
For each branch in {Branch1, Branch2, Branch3}:
  1. Set up the appropriate pre-state.
  2. PATCH with the appropriate body containing "end it all" in answeredText.
  3. Assert crisisFlag = true.
```

(Implement as a single `@ParameterizedTest` or three plain `@Test` methods — executor's choice.)

**Test 5: Non-regression body — crisis in body still flags (no answered_text touched).**

Confirms that a content-only edit with crisis content STILL flags (existing behavior unchanged).

```
1. Seed a non-flagged post by Alice within the 5-minute edit window
   (createdAt within last 4 min so wantsContentEdit is permitted).
2. PATCH with {"content":"I want to end it all"} (NO answered fields).
3. Assert HTTP 200, crisisFlag true (response + DB).
```

**Test 6: Non-regression benign — benign answered_text does NOT false-positive.**

```
1. Seed a non-flagged answered post by Alice.
2. PATCH with {"answeredText":"God is so good, He has answered my prayer"}.
3. Assert HTTP 200, crisisFlag false (response + DB).
```

**Test 7: 6.6b regression guard.**

Spec gate Gate-G-6.6b-REGRESSION-SAFE requires that the existing T16/T17/T18 tests pass with zero assertion changes. This is enforced by NOT modifying T16/T17/T18 in this spec. No new test needed — the regression guard is the un-modified state of the existing tests.

(This is a documentation note in this spec, not a new test method.)

**Guardrails (DO NOT):**

- DO NOT modify the existing T16, T17, T18 test methods. They stay byte-identical.
- DO NOT add `@DirtiesContext` or other context-recreation hints — the existing `@BeforeEach seed()` already truncates the affected tables.
- DO NOT introduce a new `seedAnsweredPost`-style helper that overlaps with the existing one; either reuse `seedAnsweredPost` (which inserts an already-answered post) or add ONE new helper `seedUnansweredPost(authorId, createdAt)` for Test 1 + Test 5 fixtures. Keep helper count minimal.
- DO NOT assert on Sentry tags or the alerts side-channel directly. The AFTER_COMMIT event chain is verified by Test 9 (Step 4) — that's the only event-level assertion.

**Verification:**

- [ ] Tests compile: `./mvnw -pl backend test-compile`
- [ ] Tests pass: `./mvnw -pl backend test -Dtest=MarkAndUnmarkAnsweredTest`
- [ ] Full test suite passes: `./mvnw -pl backend test`
- [ ] Existing T16/T17/T18 pass unchanged (verifying Gate-G-6.6b-REGRESSION-SAFE).

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `updatePost_branch1_falseToTrueWithCrisisAnsweredText_flagsPost` | integration | Brief Section 5 "Create path" — mapped to Branch 1 per R-FINDING-A |
| `updatePost_branch2_stayAnsweredWithCrisisTextUpdate_flagsPost` | integration | Brief Section 5 "Update path" — true→true with text |
| `updatePost_branch3_textOnlyEditOnAnsweredPostWithCrisis_flagsPost` | integration | Brief Section 5 "6.6b edit path" |
| `updatePost_consistency_sameCrisisStringFlagsAcrossAllThreeBranches` | integration | Brief Section 5 "Consistency" |
| `updatePost_contentCrisisStillFlagsWithoutAnsweredTextChange` | integration | Brief Section 5 "Non-regression body" |
| `updatePost_benignAnsweredTextDoesNotFalsePositive` | integration | Brief Section 5 "Non-regression benign" |
| (existing T16/T17/T18 unchanged) | regression guard | Brief Section 5 "6.6b regression" — guard is no-modification |

**Expected state after completion:**

- [ ] `MarkAndUnmarkAnsweredTest.java` has 7 new `@Test` methods (or equivalent ParameterizedTest blocks) above and beyond T16/T17/T18.
- [ ] Total test method count in the file goes from 3 to 10.
- [ ] All 10 pass.

---

### Step 4: Add the combined-fields + AFTER_COMMIT event-payload tests

**Objective:** Cover the edge case where `content` AND `answered_text` are edited in the same PATCH, and verify the AFTER_COMMIT `CrisisDetectedEvent` payload is correct.

**Files to create/modify:**

- `backend/src/test/java/com/worshiproom/post/MarkAndUnmarkAnsweredTest.java` — add 2 more `@Test` methods (cumulative with Step 3 = 9 new methods total).

**Details:**

**Test 8 — Combined fields + one-way ratchet on un-mark.**

Two sub-assertions in one test:

(a) When BOTH content edits AND answered_text edits arrive in the same PATCH, and both contain crisis keywords, the post is flagged AND exactly one `CrisisDetectedEvent` is published (the existing AFTER_COMMIT dedup makes a second event harmless, but a single combined detection is the explicit intent of this spec).

(b) Un-marking a previously crisis-flagged post does NOT clear `crisis_flag` (one-way ratchet from R-FINDING-B).

```
Sub-test 8a (combined-fields):
  1. Seed a non-answered post by Alice within edit window, benign body.
  2. PATCH with {"content":"I want to end it all", "isAnswered":true,
                 "answeredText":"I really mean it, end it all"}.
  3. Assert HTTP 200, crisisFlag true.
  4. Assert DB: crisis_flag = true, content updated, answered_text updated.

Sub-test 8b (one-way ratchet on un-mark):
  1. Seed an answered post by Alice that is already crisis-flagged
     (crisis_flag = true in DB via the seed helper).
  2. PATCH with {"isAnswered":false}.
  3. Assert HTTP 200, crisisFlag still true.
  4. Assert DB: crisis_flag = true (NOT cleared), is_answered = false,
                answered_text = NULL.
```

(Either two separate test methods OR one method with two assertion blocks — executor's choice.)

**Test 9 — AFTER_COMMIT event-payload verification.**

Verify that when `answered_text` trips the detector, the `CrisisDetectedEvent` published via Spring's `ApplicationEventPublisher` carries the correct `contentId` (post UUID), `authorId` (post owner), and `type = ContentType.POST`. Verification approach: use Spring's `@RecordApplicationEvents` test slice annotation combined with `ApplicationEvents` injection (Spring Framework 5.3.3+ — confirm available in the test base). The event listener at `CrisisDetectedEventListener` fires AFTER_COMMIT and runs `CrisisAlertService.alert(...)` — but we DO NOT mock `CrisisAlertService` (it logs + sends to Sentry, and Sentry SDK is a graceful no-op in test with no DSN per `SentryConfig.java`).

```
1. Annotate the test class (or just this test method via @ExtendWith)
   with @RecordApplicationEvents.
2. Inject ApplicationEvents into the test method.
3. Seed an answered post by Alice.
4. PATCH with {"answeredText":"end it all"} (Branch 3).
5. Assert HTTP 200.
6. Assert: applicationEvents.stream(CrisisDetectedEvent.class).count() == 1.
7. Assert the single event's contentId == postId, authorId == alice.getId(),
   type == ContentType.POST.
```

**Fallback if `@RecordApplicationEvents` is unavailable on the test base:** Replace with a `@SpyBean` on `CrisisAlertService` and a `Mockito.verify(crisisAlertService).alert(postId, alice.getId(), ContentType.POST)` assertion. Less ideal (touches the alert service, not the event itself) but achieves the same coverage. Executor picks based on what compiles cleanly against the current test base; `@RecordApplicationEvents` is the preferred path.

**Guardrails (DO NOT):**

- DO NOT mock or stub `CrisisDetectedEventListener` or `CrisisAlertService` to make Test 8a's "exactly one event" assertion easier — the framework-native approach (`@RecordApplicationEvents`) is the only acceptable path. If unavailable, fall back to `@SpyBean` per above.
- DO NOT mock `PostCrisisDetector` — the spec is verifying real keyword behavior end-to-end.
- DO NOT add a new `seedFlaggedAnsweredPost` helper unless reuse warrants it; if used in only one test, inline the `crisis_flag = TRUE` setting into Test 8b.

**Verification:**

- [ ] Tests compile: `./mvnw -pl backend test-compile`
- [ ] Tests pass: `./mvnw -pl backend test -Dtest=MarkAndUnmarkAnsweredTest`
- [ ] Full test suite passes: `./mvnw -pl backend test`
- [ ] Test 8b explicitly proves the one-way ratchet — verify by inspection of the failing-state behavior (if the production code accidentally cleared `crisis_flag` on un-mark, this test would catch it).

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `updatePost_combinedContentAndAnsweredTextCrisis_flagsPostWithSingleEvent` | integration | Combined-fields edge case (Test 8a) |
| `updatePost_unmarkPreviouslyFlaggedPost_doesNotClearFlag` | integration | One-way ratchet on un-mark (Test 8b) |
| `updatePost_answeredTextCrisis_publishesEventWithCorrectPayload` | integration | AFTER_COMMIT event payload verification (Test 9) |

**Expected state after completion:**

- [ ] `MarkAndUnmarkAnsweredTest.java` has 9 new `@Test` methods total (Step 3 added 6, Step 4 adds 3 more — or 7 + 2 depending on how Test 8 is split). Cumulative methods: 12 (existing T16/T17/T18 + 9 new).
- [ ] Test 9 proves the AFTER_COMMIT contract end-to-end without mocking the safety chain.
- [ ] All tests pass.

---

### Step 5: Full-suite smoke + diff inspection

**Objective:** Final pre-commit sanity check.

**Files to create/modify:** None.

**Details:**

Run the full backend test suite and inspect the final diff to confirm scope discipline.

**Verification:**

- [ ] `./mvnw -pl backend test` — passes end-to-end, total ~720+ tests, no new failures, no flakes.
- [ ] `git diff --stat backend/` shows exactly two files changed: `PostService.java` (+~25 lines, –~4 lines net) and `MarkAndUnmarkAnsweredTest.java` (+~200 lines net for 9 new tests + 1 helper).
- [ ] `grep -rn "answeredText\\|answered_text" backend/src/main/java/com/worshiproom/post/PostService.java` — confirms the new `Objects.equals` snapshot and the `post.getAnsweredText()` detection input are in place; no other unexpected references.
- [ ] `grep -rn "PostCrisisDetector\\.detectsCrisis" backend/src/main/` — confirms exactly two call sites: the existing `createPost` line ~300 (content + alt text concat — unchanged) and the new `updatePost` line ~5XX (content + answered_text concat). No other detector invocations introduced.

**Expected state after completion:**

- [ ] Backend tests green. Diff scope is two files.
- [ ] Spec is ready for `/code-review`.

---

## Plan Tightening Audit

| # | Lens | Status |
|---|------|--------|
| 1 | Schema state explicit | **N/A** — no schema changes in this spec. |
| 2 | Existing entity / class / file reuse | **OK** — reuses `PostCrisisDetector`, `CrisisDetectedEvent`, `CrisisAlertService`, `ContentType.POST`. No new classes. |
| 3 | SQL-side counter updates everywhere | **N/A** — no counter mutations in this spec. |
| 4 | Activity engine — fire on ADD only, not REMOVE | **N/A** — no activity engine touches. The one-way ratchet for `crisis_flag` (set-true-only, never clear) is a sibling concept and is explicitly preserved in Step 1 Region B. |
| 5 | SecurityConfig rule ordering | **N/A** — no SecurityConfig changes. PATCH /posts/{id} already auth-gated. |
| 6 | Validation surface at controller boundary | **OK** — sanitization happens at the existing `htmlSanitizerPolicy.sanitize(...)` boundary in `updatePost`. The new code consumes already-sanitized values. |
| 7 | Pattern A clarification | **N/A** — no reactive stores. |
| 8 | BB-45 cross-mount subscription test | **N/A** — no reactive stores. |
| 9 | Step dependency map | **OK** — Step 1 (production code) is independent of Step 3/4 (tests, exercise the production code). Step 2 + Step 5 are verification-only. See map below. |
| 10 | Test count vs brief | **OK** — brief Section 5 lists 5 substantive cases + 1 regression guard (= 6 items). Plan delivers 9 new test methods (the +3 cover the consistency invariant explicit, the combined-fields edge, and the AFTER_COMMIT event payload). Justification in this row: the 3 extras are HIGH-risk-spec safety nets — explicit event-payload verification, combined-fields coverage, and one-way ratchet behavior. Each is small (single PATCH + 2-3 assertions). |
| 11 | L1-cache trap | **N/A** — no create endpoint, no DB-default-populated audit columns are read back as part of this spec's contract. `updatePost` already runs `save()` on a managed entity, returns the saved reference, and `postMapper.toDto(saved)` reads in-memory fields that were all set in Java. |
| 12 | `@Modifying` flags complete | **N/A** — no new `@Modifying` JPQL methods. |
| 13 | Caffeine-bounded caches | **N/A** — no new caches. The existing `CrisisDetectedEventListener.alertedContentCache` (Caffeine, 10K max, 1h TTL) is reused unchanged. |
| 14 | Domain-scoped advice | **N/A** — no new exception types. The existing `PostExceptionHandler` continues to scope `com.worshiproom.post` errors. |
| 15 | Crisis content via `CrisisAlertService` | **OK** — Step 1's Region B publishes `CrisisDetectedEvent`, the existing `CrisisDetectedEventListener` consumes AFTER_COMMIT, and the existing `CrisisAlertService.alert(postId, authorId, ContentType.POST)` handles the alert chain. No sibling alert service. Per Phase 3 Execution Reality Addendum item 7. |

No drift found that required in-plan fix-up. The Plan-Time Divergence section (below) captures the one design decision (reorder vs preserve order) that is NOT in the brief.

---

## Plan-Time Divergences from Brief

| # | Decision | Reason | Reversible? |
|---|---|---|---|
| 1 | Reorder `updatePost` so the crisis-detection block runs AFTER scalar mutations (Step 1 Region B), instead of preserving the existing detect-then-mutate ordering | Detecting on the post's about-to-be-committed in-memory state means the trigger gate is the dead-simple `wantsContentEdit \|\| answeredTextChanged` (where `answeredTextChanged` is computed by snapshotting `post.getAnsweredText()` before mutations and comparing). The preserve-order alternative requires re-deriving the four-branch write logic (Branch 1, Branch 1b un-mark, Branch 2, Branch 3) in the detection gate, which is error-prone for a HIGH-risk safety spec. The brief does not specify ordering — only that the field must be scanned on every write path. Reorder is fully local to `updatePost` and does not affect any other code or contract. | Yes — purely internal refactor of one method body. Reversible by re-deriving the predicate. |
| 2 | Test home is **extend** `MarkAndUnmarkAnsweredTest` rather than create a new `AnsweredTextCrisisDetectionTest` | Per spec-time recon line 34 — the existing file already has the answered-post fixtures (`seedAnsweredPost`), the existing Alice/Bob JWT setup, and the existing JdbcTemplate access. Keeping the new tests adjacent to T16/T17/T18 makes the Gate-G-6.6b-REGRESSION-SAFE invariant locally inspectable. | Yes — splitting to a new file is a mechanical refactor if Eric prefers separation later. |
| 3 | The brief's "create path" test maps to **Branch 1** (false→true with crisis answered_text), not to `createPost`. Per R-FINDING-A's correction: `createPost` cannot write `answered_text` today. The de-facto "first answered_text write" event for a given post is Branch 1 of `updatePost`. | R-FINDING-A documented this on disk; Eric agreed via PR-4 narrow framing. | Yes — if a future spec adds `answeredText` to `CreatePostRequest`, a true `createPost` scan test is added at the same time. |
| 4 | Test 9 (AFTER_COMMIT event-payload verification) uses Spring's `@RecordApplicationEvents` with a `@SpyBean` fallback if unavailable | The brief Section 5 does not enumerate an event-payload test, but for a HIGH-risk safety spec, end-to-end verification of the event chain is cheap insurance. The fallback path (`@SpyBean` on `CrisisAlertService`) is documented in Step 4 for flexibility. | Yes — Test 9 can be dropped if Eric prefers strict adherence to brief Section 5's six items; the production code still works without it. |
| 5 | The crisis keyword used in tests is **`"end it all"`** (chosen from `PostCrisisDetector.SELF_HARM_KEYWORDS` line 36) | Clean phrase that doesn't appear naturally in existing test fixture strings (`"pray for me"`, `"praise!"`, `"original"`, etc.), reducing false-positive risk on other tests. | Yes — keyword choice is incidental to coverage. |

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Modify `PostService.updatePost` (production code) |
| 2 | 1 | Verify no Liquibase/OpenAPI/DTO surface changes — pure inspection |
| 3 | 1 | Add 7 core integration tests |
| 4 | 1 | Add 2 additional integration tests (combined-fields + event-payload) |
| 5 | 1, 3, 4 | Full-suite smoke + diff inspection |

Steps 3 and 4 are independent of each other and can be executed in either order; both depend on Step 1's production code compiling.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Modify `PostService.updatePost` to scan `answered_text` | [COMPLETE] | 2026-05-15 | `backend/src/main/java/com/worshiproom/post/PostService.java` — added `import java.util.Objects;` (alphabetical between `List` and `Optional`); replaced Step 8 detect-before-mutate block with `String preMutationAnsweredText = post.getAnsweredText();` snapshot; relocated detection to new Step 9b after the is_answered transitions and before `setUpdatedAt(now)`; trigger gate is `wantsContentEdit \|\| answeredTextChanged` where `answeredTextChanged = !Objects.equals(preMutationAnsweredText, post.getAnsweredText())`; detection input is the concat `post.getContent() + " " + post.getAnsweredText()` (null-guarded); `newCrisisFlag` pattern preserved for one-way ratchet; `setCrisisFlag` relocated out of the Step 9 scalar-mutations block to the end of Step 9b. **Initial executor pass used a detect-before-mutate + 4-branch predicate approach; reworked during `/code-review` (2026-05-15) to match Plan-Time Divergence #1 verbatim.** |
| 2 | Verify no Liquibase / OpenAPI / DTO surface changes | [COMPLETE] | 2026-05-15 | `git status` confirms only `PostService.java`, `MarkAndUnmarkAnsweredTest.java`, and `discoveries.md` (orthogonal Spec 6.8 log entry) are touched. No changeset, OpenAPI, DTO, or SecurityConfig changes. |
| 3 | Add the 7 core test cases | [COMPLETE] | 2026-05-15 | `backend/src/test/java/com/worshiproom/post/MarkAndUnmarkAnsweredTest.java` — added `@SpyBean CrisisAlertService`, `Mockito.reset(crisisAlertService)` in `@BeforeEach`, helper `seedUnansweredPostInWindow`, helper `crisisFlagOf`, and Tests 1–6 (Branch 1 / Branch 2 / Branch 3 / consistency / body non-regression / benign non-regression). Crisis keyword chosen: `"end it all"`. |
| 4 | Add combined-fields + event-payload tests | [COMPLETE] | 2026-05-15 | Same file — added Tests 8a (combined fields, single `verify(crisisAlertService, times(1)).alert(...)`), 8b (one-way ratchet on un-mark), 9 (AFTER_COMMIT event payload via `@SpyBean` fallback per Plan-Time Divergence #4 — `@RecordApplicationEvents` not used). |
| 5 | Full-suite smoke + diff inspection | [COMPLETE] | 2026-05-15 | `./mvnw test` → 1851 pass / 0 fail / 0 error / BUILD SUCCESS. `MarkAndUnmarkAnsweredTest` class: 12 tests pass (3 existing T16/T17/T18 + 9 new), 28.35 s. T16/T17/T18 untouched per Gate-G-6.6b-REGRESSION-SAFE. |
