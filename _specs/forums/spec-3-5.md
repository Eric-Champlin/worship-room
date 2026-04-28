# Forums Wave: Spec 3.5 — Posts Write Endpoints (Create, Update, Delete)

**Master Plan Reference:** `_forums_master_plan/round3-master-plan.md` → Spec 3.5 (body at line 3738)
**ID:** `round3-phase03-spec05-posts-write-endpoints`
**Branch:** `forums-wave-continued` (long-lived; do NOT create a new branch, do NOT checkout, do NOT commit/push)
**Date:** 2026-04-28

---

## Affected Frontend Routes

N/A — backend-only spec. Frontend wiring is owned by Spec 3.10 (Frontend Service API Implementations); the dual-write flag flips in Spec 3.12 (Phase 3 Cutover). `/verify-with-playwright` should be SKIPPED for this spec per the Forums Wave Workflow.

---

# Spec 3.5: Posts Write Endpoints (Phase 3 Critical Path)

**Spec ID:** `round3-phase03-spec05-posts-write-endpoints`
**Branch:** `forums-wave-continued` (Eric's long-lived branch — DO NOT create a new branch, DO NOT checkout, DO NOT commit/push)
**Prereqs:** 3.1 ✅, 3.2 ✅, 3.3 ✅, 3.4 ✅
**Size:** XL
**Risk:** **High** (security-critical, user-generated content, crisis-detection-bearing surface; the highest-risk spec in Phase 3 and one of the highest-risk specs in the entire Forums Wave)
**Master Plan Reference:** `_forums_master_plan/round3-master-plan.md` — Spec 3.5 body (line 3738), Decision 4 (unified posts table), `01-ai-safety.md` Crisis Intervention Protocol, `02-security.md` Forums Wave Rate Limits

---

## STAY ON BRANCH

Same as the rest of the wave. Stay on `forums-wave-continued`. No `git checkout`, `git branch`, `git commit`, `git push`, `git stash`, `git reset`. Eric handles git manually.

---

## Goal

Ship the three write endpoints for the Prayer Wall posts surface — create, edit, soft-delete — together with crisis detection, rate limiting, content sanitization, and activity-engine integration. This is the spec where backend writes go live for the dominant content surface of the entire app, and the spec where the user-safety contract on prayer-wall content is established.

Concretely, this spec delivers:

1. **`POST /api/v1/posts`** — authenticated post creation, with the full inbound write pipeline:
   - Body validation (schema-shape, length, enum-membership, type-discriminator-aware optional fields)
   - HTML/script sanitization
   - Per-user rate limiting (5 posts per 24h)
   - Server-side crisis-keyword detection on `content`
   - Database insert (transactional with the next two steps)
   - Activity-engine recording (one `prayer_wall` activity per post)
   - Response that returns the full PostDto + optional crisis-resources block when the keyword detector fired
2. **`PATCH /api/v1/posts/{id}`** — author-ownership-gated edit with a 5-minute edit window (matching Phase 3.6's comment edit window per master plan acceptance criterion line 3778) and "mark answered" support
3. **`DELETE /api/v1/posts/{id}`** — author-ownership-gated soft-delete (per Spec 3.1's `is_deleted` + `deleted_at` columns), idempotent against double-delete, distinct from Spec 10.11's account-deletion content-replacement behavior

This spec also delivers:

4. **`com.worshiproom.safety.PostCrisisDetector`** — a fourth crisis detector following the existing `AskCrisisDetector` / `PrayerCrisisDetector` / `JournalReflectionCrisisDetector` keyword-list pattern, with parity tests against the existing three
5. **`com.worshiproom.safety.CrisisAlertService`** — new internal service that handles "what to do when a post trips the keyword detector" — log a structured Sentry message, set the `posts.crisis_flag` column to TRUE, do NOT block the post creation, do NOT notify the user (consistent with Universal Rule 13 supersession semantics — Phase 10.5/10.6 own the downstream supersession behaviors)
6. **`com.worshiproom.post.PostsRateLimitService`** — new service implementing per-user posts-per-24h enforcement using Caffeine + bucket4j (same primitives as the existing `RateLimitFilter`, but per-user-keyed and post-scoped instead of per-IP and proxy-scoped)
7. **OpenAPI updates** for all three new endpoints
8. **At least 35 integration tests** spanning happy paths, validation failures, ownership enforcement, crisis-detection branches, rate limiting, idempotency, edit-window boundary cases, anonymous handling, and visibility transitions

After this spec ships:

- The Prayer Wall has a working backend write surface for the first time. Frontend dual-write begins consuming it in Phase 3.10.
- The crisis detection contract is **live in production** the moment the dual-write flag flips in Phase 3.12 — keyword-based, deterministic, fail-fast.
- `posts.crisis_flag = TRUE` rows accumulate in the database for any matched post; Phase 10.5 (Crisis Detection Escalation Backend) and Phase 10.6 (Crisis Detection Triage UI) consume those rows for human review.
- The five-posts-per-day rate limit is real, enforced, and configurable.

This spec does NOT cover:

- LLM-classifier-based crisis detection (deferred to a future spec — see Divergence 1)
- Email alerts to admins on crisis flag (SMTP-blocked; deferred to Phase 15.x — see Divergence 2)
- Comment writes (Spec 3.6)
- Reactions / bookmarks writes (Spec 3.7)
- Reports writes (Spec 3.8)
- Image upload on posts (Phase 4.6b)
- Composer-side visibility selector UI (Phase 7.7)
- Composer-side crisis-resources frontend rendering (Phase 3.10 wires the backend response into the frontend; the response shape is established here)
- Crisis supersession behaviors (3am Watch suppression, Verse-Finds-You suppression, welcome email pause) — Phase 10.5/10.6 territory

---

## Master Plan Divergence

Eight divergences from the master plan body warrant explicit flagging, several of them load-bearing.

### Divergence 1: Crisis detection is keyword-only in this spec; LLM classifier deferred

**What the master plan says:** Spec 3.5 lists `CrisisDetectionService.java` AND `CrisisKeywordMatcher.java (fallback)`. The presence of both classes implies "primary classifier with keyword fallback" architecture, consistent with `01-ai-safety.md`'s Crisis Intervention Protocol which explicitly says "Primary: Send user input through the backend AI proxy ... Fallback Keywords: ..."

**What this brief says:** **Ship keyword-only crisis detection in this spec, matching the existing `PrayerCrisisDetector` / `JournalReflectionCrisisDetector` / `AskCrisisDetector` pattern shipped in earlier specs.** The class is named `PostCrisisDetector` and lives in `com.worshiproom.safety` (per master plan file path) but it ONLY runs the keyword check — no Gemini call, no async classifier, no JSON parsing. A followup entry tracks the LLM-classifier upgrade.

**Why:** Three reasons.

**(a) Codebase precedent.** The three existing crisis detectors are all keyword-only despite the doctrine-level `01-ai-safety.md` text. They were shipped that way deliberately during the Bible Wave because keyword-only is deterministic, fast, has zero upstream dependencies, never times out, and never fails in a way that emits half-states. The classifier integration is genuinely useful but adds operational complexity that the existing detectors deliberately avoided. Spec 3.5 should match the existing pattern, not bifurcate the architecture.

**(b) Failure-mode asymmetry favors keyword for now.** A classifier call introduces five new failure modes the keyword path doesn't have: timeout (Gemini latency P99 is ~3s on bad days), malformed JSON response, rate-limit rejection from upstream (we'd be calling Gemini on every post submission, which compounds against the 20-AI-requests-per-hour-per-user backend rate limit), provider outage, and prompt-injection attacks where the post content itself manipulates the classifier output. Each of these requires explicit handling code, each handler is a place a bug can hide, and the bug class on a safety-critical surface is precisely the kind of subtle failure where MAX-tier reasoning earns its keep — but the path of LEAST risk is to ship the deterministic version first and iterate.

**(c) Iteration over re-spec.** Shipping keyword-only now lets us collect production signal on false-positive and false-negative rates from real user posts (anonymized, aggregated). That signal directly informs how to tune the classifier prompt later. Building both at once means the classifier ships without grounded data and we fly blind on whether it's tighter or looser than the keyword baseline.

**Operational implication:** the master plan's `CrisisKeywordMatcher.java (fallback)` filename becomes the primary class — renamed to `PostCrisisDetector.java` to match the existing detector naming convention. The `CrisisDetectionService.java` filename from the master plan does NOT appear in this spec; the keyword-detector logic is small enough (~30 lines of class) that wrapping it in a "service" is over-engineering. A future LLM-classifier spec will introduce the service layer when the logic actually warrants it.

**Followup entry** to add to `_plans/post-1.10-followups.md`:

> "LLM-classifier-based crisis detection on post creation. Owner: future spec, likely Phase 4 once production keyword-detector signal is collected. Approach per `01-ai-safety.md`: route through `/api/v1/proxy/ai/*` Gemini, parse JSON `{ isCrisis, confidence, category }`, fail-closed on parse failure (UI shows resources), do NOT auto-flag on parse failure (no admin alert). Composes with this spec's `PostCrisisDetector` keyword path; both run, OR semantics. Consume signal from `posts.crisis_flag` accumulation to tune classifier threshold."

### Divergence 2: Admin alerting is via Sentry + database flag, not email

**What the master plan says:** `01-ai-safety.md` Content Moderation section: "Email admin immediately for flagged posts."

**What this brief says:** **No email alert in this spec.** SMTP is blocked at the platform level — Phase 1.5b–g specs are explicitly held until SMTP unblocks, and there is no `JavaMailSender` or `EmailService` infrastructure in the backend codebase. Replacing the "email admin" mechanism with two alternates:

**(a) Sentry alert with crisis tag.** When the keyword detector fires, `CrisisAlertService.alert(...)` calls Sentry's `captureMessage` with level=`SentryLevel.WARNING` and tags `{event_type: "crisis_keyword_match", post_id: <UUID>, user_id: <UUID>}`. **The post content itself is NEVER passed to Sentry** — only the IDs. This protects PII (the post content can contain sensitive personal information; Sentry breadcrumbs are visible to anyone with the Sentry project access; the content stays in Postgres where access is gated by `IsAdminFilter` in Phase 10.5).

**(b) Database flag for moderator queue.** The `posts.crisis_flag` column (already shipped in Spec 3.1) is set to TRUE on the keyword-matched row. Phase 10.5 builds the moderator queue endpoint that reads `WHERE crisis_flag = TRUE AND moderation_status NOT IN ('reviewed', 'dismissed', 'actioned') ORDER BY created_at ASC`. For now, an admin can run a psql query directly against the dev/prod database to inspect crisis-flagged posts.

**Why:** Real email alerting requires SMTP infrastructure that doesn't exist yet. Faking it via console.log or a dummy implementation creates two problems: (1) it falsely satisfies the "email admin" acceptance criterion without the actual safety property being delivered, and (2) it introduces dead code that has to be removed when real SMTP arrives. The Sentry path is genuinely useful (a real alert mechanism that exists today), and the database flag path is the natural evolution toward the Phase 10.5 moderator queue.

**Followup entry** to add to `_plans/post-1.10-followups.md`:

> "Email admin alert on crisis-flagged posts. Owner: Phase 15.1b (Welcome Email Sequence) or 15.x SMTP cutover. When SMTP unblocks, add `EmailService.sendCrisisAlert(post_id, user_id)` call to `CrisisAlertService.alert(...)`. The Sentry alert continues alongside (defense-in-depth: if SMTP queues fail or admin email filters bury the message, Sentry is the second channel)."

### Divergence 3: 5-minute edit window applies to PATCH per Phase 3.6 addendum

**What the master plan says:** Spec 3.5 acceptance criteria line 3778 says "Edit window" with no further detail. Spec 3.6 (Comments Write) line 3802 says "5-minute edit window," which Phase 3.6 Addendum (line 3806) implies is the canonical edit-window timing for the Forums Wave.

**What this brief says:** **Posts get the same 5-minute edit window as comments.** The window is measured from `posts.created_at` to the moment of the PATCH request, computed at the controller layer using `OffsetDateTime.now(ZoneOffset.UTC).isAfter(post.getCreatedAt().plusMinutes(EDIT_WINDOW_MINUTES))`. The constant lives in `application.properties` as `worshiproom.posts.edit-window-minutes=5` so Eric can tune it in production without a code change.

After the window expires, PATCH requests return **`409 EDIT_WINDOW_EXPIRED`** matching Phase 3.6 Addendum's error code naming. The `mark-answered` operation (setting `is_answered=true`) is **exempt from the window** — authors can mark their prayers answered any time after the original 5-minute window, because answer-marking is a different intent (telling the community what happened) than content-editing (fixing a typo or rewording).

**Why mention this:** The master plan body's "Edit window" line is loaded but unspecified. The implicit pattern from Phase 3.6 is the right reference. Without this divergence call-out, recon could pick a different timing (15 minutes? 1 hour?) without realizing there's an established convention. Five minutes is also right at the spectrum's tight end, which biases toward "fix typos quickly, don't rewrite history."

**Window-exempt operations** in PATCH:

- `is_answered` transition from false → true (marking answered)
- `answered_text` setting/clearing (paired with is_answered toggle)
- `answered_at` is server-set; not in the request body

**Window-gated operations** in PATCH:

- `content` modification
- `category` change
- `visibility` change (with sub-rules — see Divergence 4)
- `qotdId` clearing or setting
- `challenge_id` clearing or setting
- `is_anonymous` is **immutable post-create** — see Divergence 5

### Divergence 4: Visibility downgrade always allowed; visibility upgrade gated by edit window

**What the master plan says:** Master plan acceptance criteria mention visibility but don't specify whether PATCH can change it.

**What this brief says:** Authors can always **downgrade** visibility (public → friends → private) regardless of the edit window, because tightening privacy is a safety lever the author should always be able to pull ("I posted this publicly, I regret it, let me make it private right now even if it's been 2 hours"). Authors can **upgrade** visibility (private → friends → public) only inside the 5-minute edit window — broadening visibility re-publishes the content, and that's a content-modification-class operation under the same rule.

**Decision matrix:**

| From → To         | Inside window | Outside window                        |
| ----------------- | ------------- | ------------------------------------- |
| public → public   | n/a           | n/a                                   |
| public → friends  | allowed       | allowed (downgrade)                   |
| public → private  | allowed       | allowed (downgrade)                   |
| friends → public  | allowed       | **rejected with EDIT_WINDOW_EXPIRED** |
| friends → friends | n/a           | n/a                                   |
| friends → private | allowed       | allowed (downgrade)                   |
| private → public  | allowed       | **rejected with EDIT_WINDOW_EXPIRED** |
| private → friends | allowed       | **rejected with EDIT_WINDOW_EXPIRED** |
| private → private | n/a           | n/a                                   |

**Why:** Three concerns. (a) Privacy levers should be one-way easy — restricting access is always recoverable; broadening is a "I'm sure I want this public" decision that should respect the same time discipline as content edits. (b) People should never feel trapped by a post they regret making public; the downgrade-anytime rule is a user-trust commitment. (c) Bumping a friends-only post to public an hour after posting (when comments and reactions have accumulated under the friends-only assumption) silently changes the audience expectation of the people who already engaged — that's an audience-violation pattern this rule prevents.

### Divergence 5: `is_anonymous` is immutable after creation

**What the master plan says:** Master plan doesn't address whether `is_anonymous` can be toggled.

**What this brief says:** **`is_anonymous` is set at create time and cannot be changed via PATCH.** Attempting to set `is_anonymous` in a PATCH request body returns 400 INVALID_INPUT with message "is_anonymous cannot be changed after post creation."

**Why:** Two concerns.

**(a) Anonymity-promise integrity.** A post created with `is_anonymous=true` was published under the social contract that the author's identity stays hidden. If the author un-anonymizes it later, the readers who reacted, commented, or even just read the post under the anonymity assumption have their consent context retroactively changed. The reactions and comments on the post don't consent to being re-attached to a known author after the fact.

**(b) Reverse direction is just as broken.** A post created with `is_anonymous=false` revealed the author's identity to all readers. Re-anonymizing it later doesn't actually un-reveal it (anyone who saw it already knows). It only obscures the attribution for future readers, which is misleading rather than protective.

The correct path for authors who change their mind on anonymity: soft-delete the post and create a new one. The two-step is a deliberate friction that protects both directions of the anonymity contract.

### Divergence 6: Soft-delete preserves content; account-deletion content-replacement is Spec 10.11's concern

**What the master plan says:** `05-database.md` § Data Retention says "Posts: Soft-deleted (content replaced with '[deleted]', user_id set to NULL, timestamps retained)" — but this rule applies to **account-deletion-time** anonymization (Spec 10.11), not user-initiated single-post deletion.

**What this brief says:** **Single-post DELETE in this spec sets `is_deleted=TRUE` and `deleted_at=NOW()` only.** Content stays. `user_id` stays. The post becomes invisible to read endpoints (Spec 3.3 already filters `WHERE is_deleted = FALSE`), but the content is preserved for moderator context if the post becomes the subject of a future report or appeal.

Account-deletion semantics (content replacement with `'[deleted]'`, user_id NULL-ing) belong to Spec 10.11. This is a real schema-vs-policy mismatch worth surfacing: Spec 3.1's `posts.user_id NOT NULL` constraint conflicts with `05-database.md`'s "user_id set to NULL" rule, and that conflict gets resolved in Spec 10.11 (which will need to relax the constraint OR introduce a "deleted user" sentinel UUID). For Spec 3.5, this conflict is out of scope.

**Why:** Single-post delete is a routine operation; account delete is a privacy-rights operation governed by separate retention rules. Conflating the two means user-initiated post deletion silently destroys content that might be needed for moderation history (a user posts harassment, gets reported, deletes the post hoping to escape consequences — content-replacement at single-post-delete time would help them succeed). Soft-delete with content preserved is the safer default; account-deletion is an explicit privacy-rights flow with its own rules.

### Divergence 7: Anonymous posts still get `posts.user_id` set to the real author UUID

**What the master plan says:** Master plan doesn't explicitly address how `is_anonymous=true` and `posts.user_id NOT NULL` coexist.

**What this brief says:** Anonymous posts still set `posts.user_id` to the real author's UUID, in compliance with the NOT NULL constraint. The `is_anonymous` flag controls **read-side display** only — Spec 3.3's `PostMapper` returns `AuthorDto(null, "Anonymous", null)` for `is_anonymous=true` posts regardless of the underlying `user_id`. The real `user_id` is necessary for:

- Author-side editing/deletion of their own anonymous post (the PATCH/DELETE endpoints check ownership via `post.userId == principal.userId()`, which requires the real ID to be stored)
- Per-author rate limiting (the 5-posts-per-day cap counts both anonymous and non-anonymous posts toward the same author's quota — otherwise anonymous posting becomes an abuse-vector for circumventing rate limits)
- Activity engine integration (the author still earns prayer_wall activity points whether or not the post is anonymous)
- Moderation (Phase 10 admin UI can see who actually authored an anonymous post that's being moderated; this is a deliberate transparency for safety, documented in the privacy policy)

**Why mention this:** Without explicit treatment, recon may propose a "deleted user" or "anonymous sentinel" UUID pattern for anonymous posts. That would break the four use cases above. The simpler model — `user_id` is always the real author, `is_anonymous` controls display only — is the right design and matches the schema as Spec 3.1 shipped it.

### Divergence 8: `qotd_id` references are validated by service-layer existence check, NOT by FK constraint

**What the master plan says:** Spec 3.1 schema for `posts.qotd_id` is `VARCHAR(50) NULL` with no FK constraint to `qotd_questions(id)`.

**What this brief says:** When a CreatePostRequest includes a non-null `qotdId`, `PostService.createPost(...)` validates the QOTD exists before insert. Existence is checked via `qotdQuestionRepository.existsById(qotdId)`. If missing, return 400 INVALID_INPUT with message "qotdId references a question that does not exist."

**Why:** Spec 3.1's schema deliberately avoids the FK because `qotd_questions` is in a "soft-data" lifecycle (questions can be deactivated via `is_active=false`, and the master plan reserves the right to delete or replace them in a Phase 9 spec). Avoiding the FK gives the QOTD admin surface flexibility. But the WRITE endpoint should still validate referential integrity at the application layer to prevent orphaned `qotd_id` values that read endpoints can't render usefully.

This ALSO means: a post with a valid `qotd_id` at create time can have its referenced QOTD deactivated later. Spec 3.3's read endpoint should handle this gracefully (likely by NULL-ing the `qotdQuestion` field in the response if the referenced QOTD is `is_active=false`). That's not Spec 3.5's concern; just flagging the asymmetry.

---

## API Contract — `POST /api/v1/posts`

**Auth:** Required (Bearer JWT)

**Method:** POST

**Path:** `/api/v1/posts`

**Headers:**

- `Authorization: Bearer <jwt>` — required
- `Content-Type: application/json` — required
- `Idempotency-Key: <opaque string>` — **optional**, see Idempotency section below

### Request body schema (`CreatePostRequest`)

```json
{
  "postType": "prayer_request",
  "content": "Please pray for my mom's surgery tomorrow.",
  "category": "health",
  "isAnonymous": false,
  "visibility": "public",
  "challengeId": null,
  "qotdId": null,
  "scriptureReference": null,
  "scriptureText": null
}
```

**Required fields:**

- `postType` — string; must match one of `'prayer_request' | 'testimony' | 'question' | 'discussion' | 'encouragement'`. Validated by `@Pattern` regex AND service-layer enum check (belt-and-suspenders).
- `content` — string; non-empty after `trim()`; max length **2000 characters** per master plan acceptance criterion line 3769; **after** HTML-tag stripping (so `"<script>x</script>" + 1995 chars` would become `"x" + 1995 chars` and fit). Length is measured against the post-sanitization value.

**Required-conditional fields** (depend on `postType`):

- `category` — string; required when `postType IN ('prayer_request', 'discussion')`; nullable for `testimony`, `question`, `encouragement`. Must match one of the 10 PRAYER_CATEGORIES from Spec 3.1's CHECK constraint when present.

**Optional fields:**

- `isAnonymous` — boolean; defaults to `false` if absent
- `visibility` — string; one of `'public' | 'friends' | 'private'`; defaults to `'public'` if absent
- `challengeId` — VARCHAR(50) or null; nullable; no FK validation in this spec (Phase 4+ owns challenge schema)
- `qotdId` — VARCHAR(50) or null; nullable; service-layer existence check against `qotd_questions` (per Divergence 8)
- `scriptureReference` — VARCHAR(100) or null; for testimony/encouragement post types
- `scriptureText` — TEXT or null; for testimony/encouragement post types

**Forbidden fields** (returned 400 INVALID_INPUT if present in body):

- `id` — server-generated UUID
- `userId` — derived from `principal.userId()`
- `createdAt`, `updatedAt`, `lastActivityAt`, `answeredAt`, `deletedAt` — server-managed
- `isAnswered`, `answeredText` — must be set via PATCH after creation (a post is never "answered" at create time)
- `moderationStatus` — server-managed (defaults to `'approved'`)
- `crisisFlag` — server-managed (set by `PostCrisisDetector`)
- `prayingCount`, `candleCount`, `commentCount`, `bookmarkCount`, `reportCount` — server-managed counters
- `isDeleted` — soft-delete flag managed by DELETE endpoint

The whitelist-style validator should reject unknown fields rather than silently drop them. This matches the existing Phase 2.5 pattern; recon should verify Jackson's `FAIL_ON_UNKNOWN_PROPERTIES` is `true` in the project's `ObjectMapper` config (likely set in `JacksonConfig`).

### Service-layer flow (`PostService.createPost`)

The full flow, in order, in a single `@Transactional` method:

1. **Authentication check** — handled upstream by `JwtAuthenticationFilter`; principal is `AuthenticatedUser` with `userId` and `isAdmin`.
2. **Email-verification gate (interim)** — the `@RequireVerifiedEmail` annotation per `02-security.md` § Auth Lifecycle is shipped in Spec 1.5d. Apply it to this endpoint. Posts (writes) require verified email; reads have a 7-day grace per the spec. If `users.email_verified_at` is NULL and the user's account is older than 7 days, return 403 EMAIL_NOT_VERIFIED. **Recon must verify this annotation actually exists** — Phase 1.5d is in the SMTP-blocked cluster. If it doesn't exist yet, drop the gate from this spec and add a followup; do NOT block this spec on the SMTP cluster.
3. **Rate limit check** — `PostsRateLimitService.checkAndConsume(principal.userId())`. If the user has consumed 5 tokens in the last 24 hours, throw `PostsRateLimitException` (mapped to 429 RATE_LIMITED with `Retry-After` header). Tokens are restored 24 hours after consumption (rolling window, not calendar day). **Critical:** the rate-limit check happens BEFORE crisis detection and BEFORE the database insert — we don't want to spend Gemini-classifier cycles or write transient DB rows for rate-limited requests.
4. **Validation** — JSR-303 (`@Valid`) on the controller layer handles required-field, length, regex, and enum checks. Service-layer adds the cross-field rules:
   - `qotdId` exists in `qotd_questions` (per Divergence 8)
   - `category` is required for `postType IN ('prayer_request', 'discussion')`
   - `scriptureReference` and `scriptureText` are paired (both present or both absent — partial scripture data is rejected)
5. **HTML / script sanitization** — strip all HTML tags from `content`, `answeredText`, `scriptureText` (the three free-form text fields). Use the OWASP Java HTML Sanitizer library (`policy = Sanitizers.FORMATTING.and(Sanitizers.LINKS)` is the standard "no scripts, no styles, no event handlers" preset). After sanitization, re-check the post-strip content length — if `< 1` (the user submitted only HTML and nothing else), return 400 INVALID_INPUT "content cannot be empty."
6. **Crisis detection** — `PostCrisisDetector.detectsCrisis(sanitizedContent)`. Returns boolean. If true:
   - Set `post.crisisFlag = TRUE` on the entity before insert
   - Call `crisisAlertService.alert(post.getId(), principal.userId())` AFTER the transaction commits (use `@TransactionalEventListener(phase = AFTER_COMMIT)` or simpler: queue the Sentry call with `applicationEventPublisher.publishEvent(new CrisisDetectedEvent(post.getId(), principal.userId()))`, and let an `@EventListener(condition = "...")` listener fire it). The post-commit dispatch ensures we don't alert on a post that fails to persist due to constraint violation.
   - The post is **still created** — crisis flag does NOT block creation, per Universal Rule 13 supersession semantics (the user gets to express what they need to express; the system gets the visibility to handle the supersession behaviors downstream).
7. **Database insert** — `postRepository.save(newPost)` with all server-managed defaults populated:
   - `id = UUID.randomUUID()` (or `gen_random_uuid()` via JPA — recon picks per existing pattern)
   - `created_at = updated_at = last_activity_at = OffsetDateTime.now(ZoneOffset.UTC)`
   - `moderation_status = 'approved'`
   - `is_deleted = false`, `deleted_at = null`
   - `is_answered = false`, `answered_text = null`, `answered_at = null`
   - `praying_count = candle_count = comment_count = bookmark_count = report_count = 0`
   - `crisis_flag` per step 6
8. **Activity engine integration** — `activityService.recordActivity(principal.userId(), ActivityType.PRAYER_WALL, BadgeCheckContext.builder().build())`. Per existing `ActivityType.PRAYER_WALL` constant (wire value `"prayerWall"`). Same transactional boundary; if the activity record fails, the post insert rolls back. **Critical:** the activity-engine call SHOULD be inside the same transaction so the post and its corresponding `activity_log` row land atomically. The existing `ActivityService.recordActivity` honors transactional propagation correctly per Phase 2 review.
9. **Response assembly** — `PostMapper.toDto(newPost, viewerId=principal.userId())` returns the standard `PostDto` from Spec 3.3. **If crisis flag fired**, the response wraps the PostDto in a `CreatePostResponse` envelope that adds the optional `crisisResources` block. If crisis flag did NOT fire, the response returns the bare PostDto.
10. **HTTP response** — `201 Created` with `Location: /api/v1/posts/{id}` header.

### Response shape — happy path (no crisis)

```json
{
  "data": {
    "id": "...",
    "postType": "prayer_request",
    "content": "Please pray for my mom's surgery tomorrow.",
    "category": "health",
    "isAnonymous": false,
    "visibility": "public",
    "isAnswered": false,
    "moderationStatus": "approved",
    "crisisFlag": false,
    "prayingCount": 0,
    "candleCount": 0,
    "commentCount": 0,
    "bookmarkCount": 0,
    "createdAt": "...",
    "updatedAt": "...",
    "lastActivityAt": "...",
    "author": {
      "id": "...",
      "displayName": "Sarah",
      "avatarUrl": "..."
    }
  },
  "meta": {
    "requestId": "..."
  }
}
```

### Response shape — crisis flag fired

```json
{
  "data": {
    "id": "...",
    "postType": "prayer_request",
    "content": "...",
    "crisisFlag": true,
    "...": "all other PostDto fields"
  },
  "crisisResources": {
    "message": "It sounds like you're going through something heavy. You're not alone — please reach out tonight.",
    "resources": [
      {
        "name": "988 Suicide & Crisis Lifeline",
        "phone": "988",
        "link": "https://988lifeline.org"
      },
      {
        "name": "Crisis Text Line",
        "text": "Text HOME to 741741",
        "link": "https://www.crisistextline.org"
      },
      {
        "name": "SAMHSA National Helpline",
        "phone": "1-800-662-4357",
        "link": "https://www.samhsa.gov/find-help/national-helpline"
      }
    ]
  },
  "meta": {
    "requestId": "..."
  }
}
```

The `crisisResources` block sits at the response root, parallel to `data`, NOT inside `data`. This is so the frontend's render layer can detect the resources block via `response.crisisResources != null` without parsing the post itself, and so the resources block is NOT serialized into the `posts` table or any future cache layer that keys on `data`.

The resources content is hardcoded server-side (NOT fetched from a config table) per `01-ai-safety.md`'s "Crisis Resources (Hardcoded Constants)" section. The hardcoded list lives in `CrisisResources.java` constants file.

### Error responses

| Condition                                                                                           | HTTP | Code               | Notes                                                                   |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------ | ----------------------------------------------------------------------- |
| Missing JWT                                                                                         | 401  | UNAUTHORIZED       | Filter-layer (handled by `JwtAuthenticationFilter`)                     |
| Invalid JWT                                                                                         | 401  | UNAUTHORIZED       | Same as above                                                           |
| `email_verified_at IS NULL` AND account > 7 days old                                                | 403  | EMAIL_NOT_VERIFIED | Conditional on Phase 1.5d shipping — see step 2                         |
| Rate limit exceeded                                                                                 | 429  | RATE_LIMITED       | `Retry-After` header set to the seconds-until-token-restore (max 86400) |
| Missing required field                                                                              | 400  | INVALID_INPUT      | Field-level error in response body                                      |
| `postType` outside enum                                                                             | 400  | INVALID_INPUT      |                                                                         |
| `category` outside enum                                                                             | 400  | INVALID_INPUT      |                                                                         |
| `visibility` outside enum                                                                           | 400  | INVALID_INPUT      |                                                                         |
| `content` empty (after sanitization)                                                                | 400  | INVALID_INPUT      |                                                                         |
| `content` over 2000 chars (after sanitization)                                                      | 400  | INVALID_INPUT      |                                                                         |
| `category` missing for `postType IN ('prayer_request', 'discussion')`                               | 400  | INVALID_INPUT      |                                                                         |
| `qotdId` references non-existent question                                                           | 400  | INVALID_INPUT      |                                                                         |
| Unknown fields in request body                                                                      | 400  | INVALID_INPUT      | Jackson `FAIL_ON_UNKNOWN_PROPERTIES`                                    |
| `isAnswered`, `answeredText`, `moderationStatus`, `crisisFlag`, `prayingCount` etc. in request body | 400  | INVALID_INPUT      | Server-managed; reject                                                  |

### Idempotency

Optional `Idempotency-Key` header allows clients to safely retry create requests after a network failure without creating duplicate posts.

**Implementation:** `PostsIdempotencyService` maintains a Caffeine-backed bounded cache keyed by `(principal.userId(), idempotencyKey)`, value = the first response (status code + body) that completed for that key. TTL = 24 hours, max size = 10_000 entries (per BOUNDED EXTERNAL-INPUT CACHES rule from `02-security.md`).

**Behavior:**

- First request with key `K` for user `U` runs the full flow, caches the response under `(U, K)`, returns the response.
- Subsequent request with same `(U, K)` within 24 hours returns the cached response WITHOUT re-running the flow (no double rate-limit consumption, no double crisis alert, no double activity record).
- After 24 hours, the cached entry expires; a fresh request with the same key creates a new post.

**Edge cases:**

- If `Idempotency-Key` is absent, no caching; each request is independent. Frontend SHOULD send a key on create (UUID generated client-side per submission, retained until response) but this spec doesn't enforce it.
- If `Idempotency-Key` is present but the request body differs from the cached one (different content, different category, etc.), return **422 IDEMPOTENCY_KEY_MISMATCH** — the client is reusing a key with a different intent, which is a bug. Pattern: hash the request body, compare to the hash cached alongside the response.
- The idempotency cache is per-user-per-key, NOT global. User A and User B can both use key `"abc123"` with no collision.

**Why ship idempotency:** mobile network conditions and offline-first composer drafts mean the frontend sends create requests under conditions where success/failure is genuinely uncertain. Without idempotency, a flaky network can cause duplicate posts that the user has to manually clean up (and sometimes can't, if they're outside their edit window). Shipping it now is much cheaper than retrofitting.

---

## API Contract — `PATCH /api/v1/posts/{id}`

**Auth:** Required

**Method:** PATCH

**Path:** `/api/v1/posts/{id}` where `{id}` is the post UUID

### Request body schema (`UpdatePostRequest`)

All fields optional — PATCH semantics. Only fields present in the body are interpreted as edits.

```json
{
  "content": "...",
  "category": "...",
  "visibility": "...",
  "isAnswered": true,
  "answeredText": "...",
  "qotdId": null,
  "challengeId": null,
  "scriptureReference": null,
  "scriptureText": null
}
```

**Forbidden fields** (400 INVALID_INPUT):

- `id`, `userId`, `postType`, `isAnonymous`, `createdAt`, `updatedAt`, `lastActivityAt`, `answeredAt`, `deletedAt`, `isDeleted`, `moderationStatus`, `crisisFlag`, `prayingCount`, etc.

`postType` is immutable (a prayer can't become a question). `isAnonymous` is immutable (Divergence 5).

### Service-layer flow (`PostService.updatePost`)

1. **Authentication check** — upstream filter.
2. **Post existence check** — `postRepository.findById(id)`. If absent or `is_deleted=true`, return 404 POST_NOT_FOUND.
3. **Ownership check** — `post.userId == principal.userId()` OR `principal.isAdmin()`. If neither, return 403 FORBIDDEN. Per master plan acceptance criterion line 3777 ("PATCH ... requires author ownership"). Admin override is included for moderation-correction scenarios; without it, admins would have to drop to psql to fix a typo on a flagged post.
4. **Edit-window check** — only applies to NON-EXEMPT operations. Exempt: `isAnswered`, `answeredText`. Non-exempt: everything else (content, category, visibility upgrade, qotdId, challengeId, scripture fields). If a non-exempt field is in the request body AND `now > post.createdAt + 5min`, return 409 EDIT_WINDOW_EXPIRED with message "This post is no longer editable. Posts can be edited within 5 minutes of creation."
5. **Visibility-direction check** — only applies if `visibility` is in the request body. Per Divergence 4: downgrade always allowed; upgrade requires the edit window. If the edit window has expired AND the visibility change is an upgrade, return 409 EDIT_WINDOW_EXPIRED. If the change is a downgrade, allow regardless of window.
6. **Validation** — same JSR-303 + cross-field rules as create:
   - `qotdId` existence check
   - `category` enum validity
   - `visibility` enum validity
   - `content` sanitization + length re-check (the post-PATCH content must still be < 2000 chars after sanitization)
7. **Sanitization** — same OWASP Java HTML Sanitizer pass on `content`, `answeredText`, `scriptureText` if present.
8. **Crisis re-detection** — if `content` is in the request body, re-run `PostCrisisDetector.detectsCrisis(newContent)`. The semantic question: should an EDIT that introduces crisis content trigger the same alert as a CREATE that does? Yes — same alert mechanism (Sentry + crisis_flag = true). But: the alert MUST NOT fire if the post was ALREADY flagged (avoid double-alerting on the same post; recon should grep the existing `CrisisAlertService` to ensure there's a deduplication path, OR add one in this spec).

   **Edge case:** an edit that REMOVES crisis content. Should the crisis_flag be cleared? **No.** Once flagged, stays flagged for moderator review. Authors can't un-flag their own post by editing — that would be a trivial bypass. The flag is a moderator concern; only moderators clear it (Phase 10.5/10.6 territory).

9. **Apply changes** — set the modified fields on the entity, set `updated_at = OffsetDateTime.now(ZoneOffset.UTC)`. Do NOT set `last_activity_at` here (last_activity_at is for engagement, not author edits).

   **Special case for is_answered transition:**
   - `false → true`: set `answered_at = OffsetDateTime.now(ZoneOffset.UTC)`. `answered_text` is optional — if absent, set to NULL. The CHECK constraint `posts_answered_consistency` from Spec 3.1 enforces the answered/answered_at pairing.
   - `true → false`: set `answered_at = NULL` and `answered_text = NULL`. Allowed (author un-marks an answered post — maybe they marked it prematurely).

10. **Database save** — `postRepository.save(post)`.
11. **NO activity recording on edit** — editing a post is not a separate activity (the original post create already earned the prayer_wall activity).
12. **Response** — `PostMapper.toDto(updatedPost, viewerId=principal.userId())`. 200 OK. No `crisisResources` block on PATCH responses even if crisis_flag fires (the create-response is the canonical place to surface resources; PATCH responses keep the standard PostDto envelope).

### Error responses

| Condition                                 | HTTP | Code                |
| ----------------------------------------- | ---- | ------------------- |
| Missing JWT                               | 401  | UNAUTHORIZED        |
| Post not found OR soft-deleted            | 404  | POST_NOT_FOUND      |
| Not author AND not admin                  | 403  | FORBIDDEN           |
| Edit window expired (non-exempt edit)     | 409  | EDIT_WINDOW_EXPIRED |
| Visibility upgrade outside window         | 409  | EDIT_WINDOW_EXPIRED |
| Forbidden field in body                   | 400  | INVALID_INPUT       |
| Validation failure                        | 400  | INVALID_INPUT       |
| `qotdId` references non-existent question | 400  | INVALID_INPUT       |
| Empty body (no fields to update)          | 400  | INVALID_INPUT       |

---

## API Contract — `DELETE /api/v1/posts/{id}`

**Auth:** Required

**Method:** DELETE

**Path:** `/api/v1/posts/{id}`

### Service-layer flow (`PostService.deletePost`)

1. **Authentication check** — upstream filter.
2. **Post existence check** — `postRepository.findById(id)`. If absent, return 404 POST_NOT_FOUND.
3. **Already-soft-deleted check** — if `post.isDeleted == true`, return 204 No Content (idempotent — repeated DELETE on the same post is a no-op success, NOT an error). **This is deliberate** — clients retrying a DELETE after a network blip should not get 404, they should get 204 (the post IS deleted, mission accomplished).
4. **Ownership check** — `post.userId == principal.userId()` OR `principal.isAdmin()`. If neither, return 403 FORBIDDEN.
5. **No edit-window check on DELETE** — authors can delete their posts at any time. This is a privacy/regret lever and should never expire.
6. **Apply soft-delete:**
   - `is_deleted = TRUE`
   - `deleted_at = OffsetDateTime.now(ZoneOffset.UTC)`
   - `updated_at = OffsetDateTime.now(ZoneOffset.UTC)`
   - `content` STAYS (per Divergence 6)
   - `user_id` STAYS (per Divergence 6)
7. **NO activity engine reversal** — deleting a post does NOT take away the prayer_wall activity points the author earned at creation. This is consistent with Phase 2's design (activity is a record of intent at the time of the act; subsequent deletion of the artifact doesn't undo the intent). If a future spec wants to claw back points on deletion, that's a Phase 4+ decision.
8. **NO comment cascade in this spec** — Spec 3.1's schema has `post_comments.post_id` with `ON DELETE CASCADE`. But the cascade is for HARD delete; soft-delete doesn't fire it. Comments on a soft-deleted post stay in the database. They become unreachable via `GET /api/v1/posts/{id}/comments` because Spec 3.4's pre-check on post visibility filters out soft-deleted posts.
9. **Database save** — `postRepository.save(post)`.
10. **Response** — 204 No Content with no body.

### Error responses

| Condition                          | HTTP | Code                 |
| ---------------------------------- | ---- | -------------------- |
| Missing JWT                        | 401  | UNAUTHORIZED         |
| Post not found (and never existed) | 404  | POST_NOT_FOUND       |
| Post already soft-deleted          | 204  | (idempotent success) |
| Not author AND not admin           | 403  | FORBIDDEN            |

---

## DTO Definitions

### `CreatePostRequest` (record)

```java
public record CreatePostRequest(
    @NotBlank
    @Pattern(regexp = "^(prayer_request|testimony|question|discussion|encouragement)$")
    String postType,

    @NotBlank
    @Size(max = 2000)
    String content,

    @Pattern(regexp = "^(health|mental-health|family|work|grief|gratitude|praise|relationships|other|discussion)$",
             message = "category must be one of the 10 valid prayer categories or null")
    String category,                         // nullable; service-layer validates required-when

    Boolean isAnonymous,                     // null = false default; service-layer applies default

    @Pattern(regexp = "^(public|friends|private)$")
    String visibility,                       // null = 'public' default

    @Size(max = 50)
    String challengeId,                      // nullable

    @Size(max = 50)
    String qotdId,                           // nullable; service-layer existence check

    @Size(max = 100)
    String scriptureReference,               // nullable

    @Size(max = 2000)
    String scriptureText                     // nullable
) {}
```

The validation annotations cover ~80% of the rejection logic; the remaining 20% (cross-field, lookup-based) lives in `PostService`. Recon should NOT push back on the duplication — JSR-303 is the first line of defense (rejects malformed requests at the controller boundary), and service-layer validation handles the rest. Belt-and-suspenders is fine for write paths.

### `UpdatePostRequest` (record)

```java
public record UpdatePostRequest(
    @Size(max = 2000) String content,
    @Pattern(regexp = "^(...)") String category,
    @Pattern(regexp = "^(public|friends|private)$") String visibility,
    Boolean isAnswered,
    @Size(max = 2000) String answeredText,
    @Size(max = 50) String challengeId,
    @Size(max = 50) String qotdId,
    @Size(max = 100) String scriptureReference,
    @Size(max = 2000) String scriptureText
) {
    // No @NotBlank — PATCH allows null/absent fields.
    // The service-layer rejects "all-null" bodies as INVALID_INPUT.
}
```

### `CreatePostResponse` (record) — wraps `PostDto` with optional crisis resources

```java
public record CreatePostResponse(
    PostDto data,
    CrisisResourcesBlock crisisResources,    // null when crisisFlag=false
    Map<String, Object> meta                 // standard envelope shape
) {}

public record CrisisResourcesBlock(
    String message,                          // user-facing intro copy
    List<CrisisResource> resources           // 988, Crisis Text Line, SAMHSA
) {}

public record CrisisResource(
    String name,
    String phone,                            // null for text-only
    String text,                             // null for phone-only
    String link
) {}
```

The Jackson serialization config should `@JsonInclude(NON_NULL)` on `CreatePostResponse.crisisResources` so non-crisis responses don't emit `"crisisResources": null` (saves bytes; cleaner contract).

The standard 200 PATCH response and 204 DELETE response do NOT use `CreatePostResponse` — they return the standard `ProxyResponse<PostDto>` envelope from Spec 3.3. Only the create response carries the crisis block.

---

## Crisis Detection Architecture

This is the load-bearing safety surface of the spec. Detailed treatment.

### Class structure

```
backend/src/main/java/com/worshiproom/safety/
  PostCrisisDetector.java          (final class with static methods, mirroring PrayerCrisisDetector shape)
  CrisisAlertService.java          (Spring @Service; calls Sentry, owns alert dedup)
  CrisisDetectedEvent.java         (record; payload for Spring's ApplicationEventPublisher)
  CrisisDetectedEventListener.java (listens for the event AFTER_COMMIT, calls CrisisAlertService)
  CrisisResources.java             (final class with hardcoded constants matching frontend)
  CrisisResourcesBlock.java        (DTO record for response payloads)

backend/src/test/java/com/worshiproom/safety/
  PostCrisisDetectorTest.java
  PostCrisisDetectorParityTest.java   (asserts keyword list matches the existing 3 detectors)
  CrisisAlertServiceTest.java
  CrisisDetectedEventListenerTest.java
```

### `PostCrisisDetector` shape

Mirrors `PrayerCrisisDetector` exactly:

```java
package com.worshiproom.safety;

import java.util.List;
import java.util.Locale;

/**
 * Server-side crisis keyword detection for prayer wall posts. Defense-in-depth
 * against the client-side {@code containsCrisisKeyword} in
 * {@code frontend/src/constants/crisis-resources.ts}.
 *
 * The keyword list is INTENTIONALLY DUPLICATED from {@link com.worshiproom.proxy.ai.AskCrisisDetector},
 * {@link com.worshiproom.proxy.ai.PrayerCrisisDetector}, and
 * {@link com.worshiproom.proxy.ai.JournalReflectionCrisisDetector}.
 * {@code PostCrisisDetectorParityTest} asserts all four backend lists stay equal;
 * all four must be supersets of the frontend source of truth.
 *
 * If any keyword matches (case-insensitive substring), {@code detectsCrisis} returns true.
 * The caller (PostService) sets posts.crisis_flag = TRUE and emits a CrisisDetectedEvent
 * for AFTER_COMMIT processing.
 */
public final class PostCrisisDetector {

    private PostCrisisDetector() {}

    /** MUST match the other three detectors exactly. Verified by parity tests. */
    public static final List<String> SELF_HARM_KEYWORDS = List.of(
        // Parity with frontend
        "suicide",
        "kill myself",
        "end it all",
        "not worth living",
        "hurt myself",
        "end my life",
        "want to die",
        "better off dead",
        // Backend-only additions
        "take my own life",
        "don't want to be here",
        "nobody would miss me",
        "cease to exist"
    );

    public static boolean detectsCrisis(String text) {
        if (text == null || text.isBlank()) return false;
        String lower = text.toLowerCase(Locale.ROOT);
        for (String keyword : SELF_HARM_KEYWORDS) {
            if (lower.contains(keyword)) return true;
        }
        return false;
    }
}
```

**Why `public` (not package-private):** unlike the existing three detectors (which are package-private and internal to the proxy/ai package), `PostCrisisDetector` is accessed from `com.worshiproom.post.PostService` — different package. The other detectors ARE package-private because their callers are in the same package. Spec 3.5's detector lives in `com.worshiproom.safety` and is consumed from `com.worshiproom.post`, so it must be public.

### Parity test — load-bearing

`PostCrisisDetectorParityTest` verifies the four backend keyword lists are byte-for-byte identical:

```java
@Test
void keywordList_matchesAskDetector() {
    assertThat(PostCrisisDetector.SELF_HARM_KEYWORDS)
        .containsExactlyElementsOf(AskCrisisDetector.SELF_HARM_KEYWORDS);
}

@Test
void keywordList_matchesPrayerDetector() {
    assertThat(PostCrisisDetector.SELF_HARM_KEYWORDS)
        .containsExactlyElementsOf(PrayerCrisisDetector.SELF_HARM_KEYWORDS);
}

@Test
void keywordList_matchesJournalDetector() {
    assertThat(PostCrisisDetector.SELF_HARM_KEYWORDS)
        .containsExactlyElementsOf(JournalReflectionCrisisDetector.SELF_HARM_KEYWORDS);
}

@Test
void keywordList_isSupersetOfFrontend() {
    // Frontend's SELF_HARM_KEYWORDS lives in TypeScript; we encode it as a Java list constant
    // in the test, generated from the frontend file at test-author time. If the frontend list
    // changes, this test fails until the backend list is updated.
    List<String> frontendKeywords = List.of(
        "suicide", "kill myself", "end it all", "not worth living",
        "hurt myself", "end my life", "want to die", "better off dead"
    );
    assertThat(PostCrisisDetector.SELF_HARM_KEYWORDS).containsAll(frontendKeywords);
}
```

The cross-package access (the test depends on internal package-private classes from `com.worshiproom.proxy.ai`) requires either making those classes public OR placing the parity test in the same package (`com.worshiproom.proxy.ai.PostCrisisDetectorParityTest` — Java tests can sit in any package). Recon should pick: cleanest is to expose the existing detectors' keyword constants via a package-internal `static List<String> getSelfHarmKeywords()` method that the parity test reflects against, OR to relax the existing detector classes to public (which is fine — they have no behavior beyond what's already documented in 01-ai-safety.md). The brief leans toward making the existing classes' keyword lists public-static-final for test access; that's a minor schema-of-internal-API change but doesn't expose new behavior.

**If recon finds the existing detector classes can't be touched without scope creep**, the alternative is to package-locate the parity test in `com.worshiproom.proxy.ai`, which gives it package-private access to the existing detectors AND public access to the new `PostCrisisDetector` (which is public per the rationale above).

### `CrisisAlertService`

```java
package com.worshiproom.safety;

import io.sentry.Sentry;
import io.sentry.SentryLevel;
import io.sentry.protocol.Message;
import org.springframework.stereotype.Service;

import java.util.UUID;

/**
 * Handles the side-effects of a crisis detection match. Currently:
 *  1. Logs a structured Sentry warning (no PII content; only IDs)
 *  2. (Future) Sends an email to the admin when SMTP unblocks
 *
 * This service is invoked from the {@link CrisisDetectedEventListener} which fires
 * AFTER_COMMIT — alerting only happens for posts that successfully persisted.
 *
 * Idempotency: the listener tracks already-alerted post IDs in a bounded Caffeine
 * cache (1h TTL, max 10_000 entries) so an edit-that-re-detects-crisis doesn't
 * double-alert.
 */
@Service
public class CrisisAlertService {

    public void alert(UUID postId, UUID authorId) {
        // Sentry alert (PII-free; only IDs)
        Sentry.captureMessage(
            "Crisis keyword match on prayer wall post",
            scope -> {
                scope.setLevel(SentryLevel.WARNING);
                scope.setTag("event_type", "crisis_keyword_match");
                scope.setTag("post_id", postId.toString());
                scope.setTag("user_id", authorId.toString());
                // NO content tag — content stays in Postgres only
            }
        );

        // Future: emailService.sendCrisisAlert(postId, authorId)
        // Tracked in _plans/post-1.10-followups.md per Divergence 2
    }
}
```

### `CrisisDetectedEventListener` — the AFTER_COMMIT dispatch

```java
@Component
public class CrisisDetectedEventListener {

    private final CrisisAlertService crisisAlertService;
    private final Cache<UUID, Boolean> alertedPostsCache;

    public CrisisDetectedEventListener(CrisisAlertService crisisAlertService) {
        this.crisisAlertService = crisisAlertService;
        this.alertedPostsCache = Caffeine.newBuilder()
            .maximumSize(10_000)
            .expireAfterWrite(Duration.ofHours(1))
            .build();
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleCrisisDetected(CrisisDetectedEvent event) {
        // Dedup: don't alert on the same post within 1 hour (handles
        // edit-re-detects scenarios where the post was already flagged).
        if (alertedPostsCache.getIfPresent(event.postId()) != null) {
            return;
        }
        alertedPostsCache.put(event.postId(), Boolean.TRUE);
        crisisAlertService.alert(event.postId(), event.authorId());
    }
}
```

**Why AFTER_COMMIT dispatch:**

- If the post insert fails for any reason (constraint violation, transaction rollback), no Sentry alert fires — consistent contract: alerts only fire for posts that actually exist.
- The Sentry call doesn't run inside the database transaction, so a slow Sentry network call doesn't extend transaction time.
- If Sentry is down, the post still persists; the alert is best-effort.

**Why dedup at the listener:** the listener is the single point that observes ALL crisis-detect events (both create and edit paths). Dedup at the listener catches the cross-path scenario (post is created, flagged; author edits, content still flags; we don't want a second alert on the same post). The cache is bounded per `02-security.md` BOUNDED EXTERNAL-INPUT CACHES rule.

### `CrisisResources` constants

```java
package com.worshiproom.safety;

import java.util.List;

/**
 * Hardcoded crisis-resources content. Mirrors the frontend's
 * {@code frontend/src/constants/crisis-resources.ts} CRISIS_RESOURCES export
 * VERBATIM — any divergence is a content-management bug.
 *
 * Per 01-ai-safety.md Crisis Resources section, these are hardcoded constants,
 * NOT a config table. Changes go through a new spec that updates both this file
 * and the frontend constants file in the same commit.
 *
 * The user-facing intro message ("It sounds like you're going through...") is
 * also hardcoded here. Changes go through Community Guidelines spec review per
 * 01-ai-safety.md § Community Guidelines.
 */
public final class CrisisResources {

    private CrisisResources() {}

    public static final String INTRO_MESSAGE =
        "It sounds like you're going through something heavy. " +
        "You're not alone — please reach out tonight.";

    public static final List<CrisisResource> RESOURCES = List.of(
        new CrisisResource("988 Suicide & Crisis Lifeline", "988", null, "https://988lifeline.org"),
        new CrisisResource("Crisis Text Line", null, "Text HOME to 741741", "https://www.crisistextline.org"),
        new CrisisResource("SAMHSA National Helpline", "1-800-662-4357", null, "https://www.samhsa.gov/find-help/national-helpline")
    );

    public static CrisisResourcesBlock buildBlock() {
        return new CrisisResourcesBlock(INTRO_MESSAGE, RESOURCES);
    }
}
```

A test, `CrisisResourcesParityTest`, asserts the backend list matches the frontend list. The test reads both files at runtime (frontend file via `Path.of("../frontend/src/constants/crisis-resources.ts")` relative to the backend module root, parsed with regex), and compares. This is the same shape as Phase 2's drift detection between frontend and backend constants. If recon flags this as too brittle (relative path issues, regex parsing), an alternative is to manually maintain parity with a code comment + manual review at each change. The brief leans toward parity test for safety; recon picks.

### Why `crisis_flag` doesn't block creation

This is worth stating explicitly because it's the most counterintuitive part of the contract. **A keyword-flagged post is still created**, with `crisis_flag = TRUE`, and visibly to the author and community per their visibility setting.

**Reasons:**

1. **Block-on-flag is harmful.** A user in distress posts what they're feeling. The system says "no." The user has now been told their pain is unwelcome here. That outcome is worse than the post existing.
2. **False positives are real.** Keyword detection is brittle — "I want to die laughing at this" trips the detector. Blocking on FP harms the user with no upside.
3. **Community visibility is the safety net.** A flagged post visible to friends/community is more likely to attract a check-in comment from someone who knows the author than a blocked post is.
4. **Universal Rule 13 gives downstream features the supersession contract.** Once flagged, the supersession behaviors (3am Watch suppression for the user, Verse-Finds-You suppression, welcome-email pause) kick in via Phase 10.5/10.6. Block-on-flag would prevent those downstream signals from accumulating.
5. **The `crisis_flag = TRUE` row is the moderator's signal.** Phase 10.5 builds the moderator queue. Moderators reach out to flagged authors. If the post never existed, the moderator never knew about the user.

The spec test suite must cover this explicitly: a crisis-keyword post returns 201 with the post visible in subsequent reads, with `crisisFlag: true`. Recon should flag if the plan tries to add a "block" path.

---

## Rate Limiting Architecture

Per `02-security.md` Forums Wave Rate Limits: **5 posts per day per user**, backend-enforced.

### Class structure

```
backend/src/main/java/com/worshiproom/post/
  PostsRateLimitService.java       (Spring @Service; bucket4j + Caffeine)
  PostsRateLimitException.java     (thrown when rate limit exceeded; mapped to 429)
  PostsRateLimitConfig.java        (@ConfigurationProperties; tunable values)
```

### Implementation

Mirror the existing `RateLimitFilter` shape from Spec 1 (proxy rate limiting), but per-user-keyed instead of per-IP-keyed and at the service layer instead of filter layer:

```java
@Service
public class PostsRateLimitService {

    private final Cache<UUID, Bucket> userBuckets;
    private final PostsRateLimitConfig config;

    public PostsRateLimitService(PostsRateLimitConfig config) {
        this.config = config;
        this.userBuckets = Caffeine.newBuilder()
            .maximumSize(10_000)
            .expireAfterAccess(Duration.ofHours(25))  // slightly > 24h to allow window roll
            .build();
    }

    public void checkAndConsume(UUID userId) {
        Bucket bucket = userBuckets.get(userId, k -> newBucket());
        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);
        if (!probe.isConsumed()) {
            long retryAfterSec = TimeUnit.NANOSECONDS.toSeconds(probe.getNanosToWaitForRefill());
            throw new PostsRateLimitException(retryAfterSec);
        }
    }

    private Bucket newBucket() {
        Bandwidth limit = Bandwidth.classic(
            config.maxPerDay(),
            Refill.intervally(config.maxPerDay(), Duration.ofHours(24))
        );
        return Bucket.builder().addLimit(limit).build();
    }
}
```

**Key decisions:**

- **Per-user keying** by UUID, NOT by IP. Authenticated users share the same JWT principal regardless of network; rate-limiting by IP would (a) penalize office workers behind shared NAT, and (b) be trivially bypassed by changing networks.
- **Caffeine bucket map bounded** at 10_000 entries with 25-hour expiry. Per BOUNDED EXTERNAL-INPUT CACHES rule. With ~25h expiry vs ~24h refill, no risk of evicting an active bucket and giving a user free re-tries.
- **Refill strategy: `intervally`** (5 tokens at the 24-hour boundary, all-at-once), NOT `greedy` (continuous trickle). The `intervally` strategy maps cleanly to "5 posts per day, full reset at midnight UTC-ish" — the user-visible mental model is what the master plan specifies. Recon may want to evaluate `greedy` (1 token every 4h48m) for smoother UX, but the master plan says "5 per day," not "1 every 4h48m." Stick with intervally unless Eric overrides.
- **Per-instance, NOT distributed.** Same as the existing `RateLimitFilter` — single-instance Caffeine is acceptable until Phase 5.6 Redis cache foundation arrives. Documented as the same upgrade path.
- **Pre-flight, not post-hoc.** The rate-limit check fires BEFORE the database insert (per `PostService.createPost` step 3 in the flow above). Failing post-insert would still consume the token but reject the response, which is wasteful.

### `PostsRateLimitConfig`

```java
@Configuration
@ConfigurationProperties(prefix = "worshiproom.posts.rate-limit")
public class PostsRateLimitConfig {
    private int maxPerDay = 5;      // matches master plan
    private int bucketCacheSize = 10_000;
    // ... getters/setters or record-style accessors
}
```

`application.properties` entries:

```
worshiproom.posts.rate-limit.max-per-day=5
worshiproom.posts.rate-limit.bucket-cache-size=10000
worshiproom.posts.edit-window-minutes=5
```

Eric can tune `max-per-day` in production via Railway env var override (`WORSHIPROOM_POSTS_RATELIMIT_MAXPERDAY=10` for a temporary lift) without a code change. This is the rate-limit policy escape hatch the master plan implies via "configurable via env."

### Response shape on 429

```
HTTP/1.1 429 Too Many Requests
Retry-After: 12345
Content-Type: application/json
X-Request-Id: ...

{
  "code": "RATE_LIMITED",
  "message": "You've reached the daily limit of 5 prayer wall posts. Please try again in about 3 hours.",
  "requestId": "...",
  "timestamp": "..."
}
```

The `Retry-After` header value is integer seconds until the next token refill. The user-facing message converts this to a friendlier "in about N hours/minutes" string. The conversion lives in `PostsRateLimitException.formatMessage()` — straightforward arithmetic (`if seconds < 60: 'in less than a minute'; if seconds < 3600: 'in N minutes'; else: 'in about N hours'`).

---

## Activity Engine Integration

Per `ActivityType.PRAYER_WALL` (already shipped in Phase 2), creating a post earns the user one prayer-wall activity. Editing or deleting a post does NOT earn additional activities.

```java
// Inside PostService.createPost, after postRepository.save(post):
activityService.recordActivity(
    principal.userId(),
    ActivityType.PRAYER_WALL,
    BadgeCheckContext.builder().build()
);
```

The `BadgeCheckContext.builder().build()` is the standard "no extra context" call shape — same pattern other write surfaces in Phase 2 use. Recon should grep `ActivityService.recordActivity` callers and match the existing convention.

**Critical:** the activity-engine call is INSIDE the same `@Transactional` boundary as the post insert. If the activity-record write fails (DB constraint, infrastructure issue), the post insert rolls back — atomic write of the post and its activity log row.

Edge cases:

- **Anonymous post:** activity is still recorded against the real `user_id`. Per Divergence 7, anonymous is read-display-only.
- **Crisis-flagged post:** activity is still recorded. Crisis flag doesn't suppress activity points.
- **Rate-limited post (429):** no post created, no activity recorded. Step 3 (rate limit) fires before step 7 (insert) and step 8 (activity).

**No reversal on delete:** per the DELETE flow step 7, soft-deleting a post does NOT remove the previously-recorded activity. The activity engine's design from Phase 2 is "log of intent at the time of the act" — subsequent regret doesn't undo points.

**Future-spec considerations** (out of scope for 3.5):

- Spec 4.x may introduce per-post-type activity multipliers (e.g., testimony posts earn more than prayer requests). Adapter layer in `ActivityType` already supports this; out of scope here.
- Spec 6.6 Answered Wall introduces the "answered" milestone — when a post transitions to `is_answered = true`. The PATCH endpoint here will need to call a milestone-emit hook in Phase 6.6, but that hook doesn't exist yet. For 3.5: just transition the column. The hook gets added via PATCH-modification in 6.6.

---

## Files to Create

### Backend production code

```
backend/src/main/java/com/worshiproom/post/PostController.java                    [MODIFY]
backend/src/main/java/com/worshiproom/post/PostService.java                       [MODIFY]
backend/src/main/java/com/worshiproom/post/Post.java                              [MODIFY — add edit-window timestamp accessor if not present]
backend/src/main/java/com/worshiproom/post/PostRepository.java                    [MODIFY — add findByIdAndIsDeletedFalse if not present]
backend/src/main/java/com/worshiproom/post/PostMapper.java                        [MODIFY — likely no change]
backend/src/main/java/com/worshiproom/post/dto/CreatePostRequest.java             [CREATE]
backend/src/main/java/com/worshiproom/post/dto/UpdatePostRequest.java             [CREATE]
backend/src/main/java/com/worshiproom/post/dto/CreatePostResponse.java            [CREATE]
backend/src/main/java/com/worshiproom/post/PostsRateLimitService.java             [CREATE]
backend/src/main/java/com/worshiproom/post/PostsRateLimitException.java           [CREATE]
backend/src/main/java/com/worshiproom/post/PostsRateLimitConfig.java              [CREATE]
backend/src/main/java/com/worshiproom/post/PostsIdempotencyService.java           [CREATE]
backend/src/main/java/com/worshiproom/post/IdempotencyKeyMismatchException.java   [CREATE]
backend/src/main/java/com/worshiproom/post/EditWindowExpiredException.java        [CREATE]
backend/src/main/java/com/worshiproom/post/PostNotFoundException.java             [CREATE — if not shipped in 3.3]
backend/src/main/java/com/worshiproom/post/PostForbiddenException.java            [CREATE]

backend/src/main/java/com/worshiproom/safety/PostCrisisDetector.java              [CREATE]
backend/src/main/java/com/worshiproom/safety/CrisisAlertService.java              [CREATE]
backend/src/main/java/com/worshiproom/safety/CrisisDetectedEvent.java             [CREATE]
backend/src/main/java/com/worshiproom/safety/CrisisDetectedEventListener.java     [CREATE]
backend/src/main/java/com/worshiproom/safety/CrisisResources.java                 [CREATE]
backend/src/main/java/com/worshiproom/safety/CrisisResource.java                  [CREATE — DTO record]
backend/src/main/java/com/worshiproom/safety/CrisisResourcesBlock.java            [CREATE — DTO record]
```

### Backend tests

```
backend/src/test/java/com/worshiproom/post/PostWriteIntegrationTest.java          [CREATE]
backend/src/test/java/com/worshiproom/post/PostServiceWriteTest.java              [CREATE — service-layer unit tests]
backend/src/test/java/com/worshiproom/post/PostsRateLimitServiceTest.java         [CREATE]
backend/src/test/java/com/worshiproom/post/PostsIdempotencyServiceTest.java       [CREATE]
backend/src/test/java/com/worshiproom/post/PostEditWindowTest.java                [CREATE — focused on the 5-min window logic]
backend/src/test/java/com/worshiproom/post/PostVisibilityTransitionTest.java      [CREATE — focused on Divergence 4]

backend/src/test/java/com/worshiproom/safety/PostCrisisDetectorTest.java          [CREATE]
backend/src/test/java/com/worshiproom/safety/PostCrisisDetectorParityTest.java    [CREATE]
backend/src/test/java/com/worshiproom/safety/CrisisAlertServiceTest.java          [CREATE]
backend/src/test/java/com/worshiproom/safety/CrisisDetectedEventListenerTest.java [CREATE]
backend/src/test/java/com/worshiproom/safety/CrisisResourcesParityTest.java       [CREATE — frontend-backend parity check]
```

## Files to Modify

```
backend/src/main/resources/application.properties
  — add worshiproom.posts.rate-limit.* entries (3)
  — add worshiproom.posts.edit-window-minutes=5

backend/src/main/resources/openapi.yaml
  — add 3 new path entries: POST /api/v1/posts, PATCH /api/v1/posts/{id}, DELETE /api/v1/posts/{id}
  — add CreatePostRequest, UpdatePostRequest, CreatePostResponse, CrisisResourcesBlock, CrisisResource schemas
  — lint with npx @redocly/cli lint

backend/build.gradle (or pom.xml — check actual build tool)
  — add OWASP Java HTML Sanitizer dependency: 'com.googlecode.owasp-java-html-sanitizer:owasp-java-html-sanitizer:20240325.1'
  — add bucket4j-core if not already present (existing RateLimitFilter likely already pulls it in; verify)

backend/src/main/java/com/worshiproom/proxy/ai/AskCrisisDetector.java              [POSSIBLY MODIFY — make SELF_HARM_KEYWORDS public for parity test access; see Crisis Detection section]
backend/src/main/java/com/worshiproom/proxy/ai/PrayerCrisisDetector.java           [POSSIBLY MODIFY — same]
backend/src/main/java/com/worshiproom/proxy/ai/JournalReflectionCrisisDetector.java [POSSIBLY MODIFY — same]

_plans/post-1.10-followups.md
  — add LLM-classifier upgrade entry (per Divergence 1)
  — add SMTP email-alert entry (per Divergence 2)
```

## Files NOT to Modify

- `frontend/**` — Phase 3.10 owns frontend integration
- Any Liquibase changeset — schema is finalized in 3.1; no changesets in this spec
- `Post.java` (Spec 3.3 entity) — no schema-shape changes; PATCH writes new column values to existing fields
- `PostSpecifications.java` from Spec 3.3 — read-side; not touched by writes
- Any code in `com.worshiproom.activity` — `ActivityService.recordActivity` is consumed; not modified
- Any code in `com.worshiproom.friends`, `com.worshiproom.social`, `com.worshiproom.mute` — not touched
- `auth/PublicPaths.java` — all three endpoints require auth; no PublicPaths edits

## Files to Delete

None.

---

## Acceptance Criteria

Master plan target: at least 35 integration tests covering happy paths, validation, ownership, crisis detection, rate limiting, edit window, anonymous, visibility, and soft-delete semantics. The criteria below cover ~50 distinct test concerns; CC's plan should distribute them across the test files listed above.

### POST /api/v1/posts — happy path

- [ ] Authenticated user creates a `prayer_request` post → 201 Created with `Location` header
- [ ] Response body includes full PostDto with all server-managed fields populated
- [ ] `crisisFlag` is false on a normal-content post
- [ ] `crisisResources` field is absent (or null, with NON_NULL serialization) on a normal post
- [ ] `praying_count`, `candle_count`, `comment_count`, `bookmark_count`, `report_count` all 0
- [ ] `created_at`, `updated_at`, `last_activity_at` all set to the same timestamp at creation
- [ ] `is_anonymous=true` post returns `author.displayName="Anonymous"`, `author.id=null`, `author.avatarUrl=null` in the response
- [ ] `visibility=public` is the default when omitted
- [ ] `visibility=friends` post is created with that visibility
- [ ] `visibility=private` post is created with that visibility
- [ ] All 5 post types (`prayer_request`, `testimony`, `question`, `discussion`, `encouragement`) can be created
- [ ] All 10 categories accepted on prayer_request
- [ ] `qotdId` referencing a real seeded QOTD succeeds
- [ ] `challengeId` accepted as opaque VARCHAR(50)
- [ ] `scriptureReference` and `scriptureText` accepted on testimony post
- [ ] An activity_log row is created with `activity_type='prayerWall'` for the same user, in the same transaction

### POST /api/v1/posts — validation failures

- [ ] Missing `postType` → 400 INVALID_INPUT
- [ ] Invalid `postType` value → 400 INVALID_INPUT
- [ ] Missing `content` → 400 INVALID_INPUT
- [ ] Empty `content` (after trim) → 400 INVALID_INPUT
- [ ] `content` over 2000 chars after sanitization → 400 INVALID_INPUT
- [ ] `<script>` tag in content is stripped before storage; remaining content stored
- [ ] Content that is ONLY HTML tags (post-sanitization empty) → 400 INVALID_INPUT
- [ ] `category=invalid-category` → 400 INVALID_INPUT
- [ ] Missing `category` on `prayer_request` → 400 INVALID_INPUT
- [ ] Missing `category` on `testimony` → 201 (category nullable for testimony)
- [ ] `qotdId` referencing non-existent question → 400 INVALID_INPUT
- [ ] Unknown field in body (e.g., `random_field`) → 400 INVALID_INPUT (Jackson FAIL_ON_UNKNOWN_PROPERTIES)
- [ ] `id` field in request body → 400 INVALID_INPUT (server-managed)
- [ ] `userId` field in request body → 400 INVALID_INPUT
- [ ] `crisisFlag` field in request body → 400 INVALID_INPUT
- [ ] `praying_count` field in request body → 400 INVALID_INPUT

### POST /api/v1/posts — auth + email verification

- [ ] No JWT → 401 UNAUTHORIZED
- [ ] Invalid JWT → 401 UNAUTHORIZED
- [ ] Valid JWT, unverified email, account < 7 days old → 201 (grace period applies)
- [ ] Valid JWT, unverified email, account > 7 days old → 403 EMAIL_NOT_VERIFIED _(conditional on 1.5d shipping)_

### POST /api/v1/posts — rate limiting

- [ ] User's first 5 posts in 24h → all 201
- [ ] User's 6th post within 24h → 429 RATE_LIMITED
- [ ] 429 response includes `Retry-After` header with integer seconds
- [ ] 429 response body includes user-friendly time message ("in about N hours")
- [ ] Rate limit is per-user (different users don't share a bucket)
- [ ] Rate limit decay: tokens restore after 24h on intervally schedule
- [ ] Rate limit bucket cache is bounded (this is verified by inspecting Caffeine config in test)
- [ ] Rate limit fires BEFORE crisis detection AND BEFORE database insert (no DB write on 429)
- [ ] Anonymous posts count toward the same author's rate limit (no anonymous-as-bypass)
- [ ] Crisis-flagged posts count toward the rate limit normally

### POST /api/v1/posts — crisis detection

- [ ] Post containing keyword "suicide" → 201 with `crisisFlag: true` AND `crisisResources` block
- [ ] Post containing keyword "kill myself" (case-insensitive: "Kill Myself") → 201 with crisisFlag and resources
- [ ] Post containing keyword in middle of sentence ("...sometimes I think about suicide and...") → flagged
- [ ] Post WITHOUT any crisis keyword → 201 with `crisisFlag: false`, no resources block
- [ ] Crisis-flagged post is still saved to the database (not blocked)
- [ ] Crisis-flagged post is visible in subsequent `GET /api/v1/posts/{id}` reads (per visibility setting)
- [ ] `posts.crisis_flag = TRUE` row exists in DB after a flagged create
- [ ] Sentry receives a `WARNING` level message tagged `event_type=crisis_keyword_match` with post_id and user_id
- [ ] Sentry message does NOT contain post content (PII protection)
- [ ] Crisis alert fires AFTER_COMMIT (verifiable: failing the transaction prevents the alert)
- [ ] Crisis alert deduplicates: editing a flagged post that re-detects crisis does NOT fire a second Sentry alert within 1h
- [ ] Crisis resource block returned on create matches `frontend/src/constants/crisis-resources.ts` (parity test)

### POST /api/v1/posts — idempotency

- [ ] Two identical requests with same `Idempotency-Key` for same user → first 201, second returns the cached 201 (same body, same status)
- [ ] Second request does NOT consume a second rate-limit token
- [ ] Second request does NOT create a second post
- [ ] Second request does NOT fire a second activity_log row
- [ ] Second request does NOT fire a second crisis alert
- [ ] Two requests with same key but DIFFERENT body → 422 IDEMPOTENCY_KEY_MISMATCH
- [ ] Two requests with same key from DIFFERENT users → both succeed independently (key is scoped per-user)
- [ ] Idempotency cache TTL: after 24h, same key creates a fresh post

### PATCH /api/v1/posts/{id} — happy path

- [ ] Author edits content within 5min → 200 with updated PostDto
- [ ] `updated_at` reflects the edit timestamp
- [ ] `created_at` is unchanged
- [ ] `last_activity_at` is unchanged (edits don't bump activity)
- [ ] Author marks post answered (is_answered=true) any time → 200, `answered_at` set, `answered_text` set if provided
- [ ] Mark-answered with no `answeredText` → 200, `answered_text=null`
- [ ] Author un-marks answered (is_answered=false) → 200, `answered_at=null`, `answered_text=null`

### PATCH /api/v1/posts/{id} — edit window enforcement

- [ ] Edit content 4 minutes after create → 200 (within window)
- [ ] Edit content 6 minutes after create → 409 EDIT_WINDOW_EXPIRED
- [ ] Mark-answered 6 minutes after create → 200 (window-exempt)
- [ ] Mark-answered 6 hours after create → 200 (still exempt)
- [ ] Edit window value is read from config (`worshiproom.posts.edit-window-minutes`)
- [ ] Edit window applies to: content, category, qotdId, challengeId, scriptureReference, scriptureText
- [ ] Edit window does NOT apply to: isAnswered, answeredText
- [ ] Visibility downgrade outside window → 200 (per Divergence 4)
- [ ] Visibility upgrade outside window → 409 EDIT_WINDOW_EXPIRED

### PATCH /api/v1/posts/{id} — ownership and auth

- [ ] No JWT → 401
- [ ] Wrong user (not author, not admin) → 403 FORBIDDEN
- [ ] Admin user editing another user's post → 200 (admin override)
- [ ] Author editing their own post → 200
- [ ] Editing soft-deleted post → 404 POST_NOT_FOUND
- [ ] Editing non-existent post → 404 POST_NOT_FOUND

### PATCH /api/v1/posts/{id} — immutable fields

- [ ] `id` in body → 400 INVALID_INPUT
- [ ] `userId` in body → 400 INVALID_INPUT
- [ ] `postType` in body → 400 INVALID_INPUT (immutable; type can't change)
- [ ] `isAnonymous` in body → 400 INVALID_INPUT (per Divergence 5)
- [ ] `crisisFlag` in body → 400 INVALID_INPUT (server-managed)
- [ ] `moderationStatus` in body → 400 INVALID_INPUT
- [ ] Counter fields in body → 400 INVALID_INPUT
- [ ] Timestamp fields in body → 400 INVALID_INPUT
- [ ] Empty body (no fields) → 400 INVALID_INPUT

### PATCH /api/v1/posts/{id} — crisis re-detection

- [ ] Edit introduces crisis keyword → `crisis_flag` set to TRUE, Sentry alert fires (subject to 1h dedup)
- [ ] Edit removes crisis keyword from already-flagged post → `crisis_flag` STAYS true (authors can't un-flag themselves)
- [ ] Edit on already-flagged post that doesn't change crisis state → no second Sentry alert (within dedup window)

### DELETE /api/v1/posts/{id}

- [ ] Author deletes own post → 204 No Content
- [ ] `is_deleted=true`, `deleted_at` set
- [ ] `content` is NOT replaced (stays as original per Divergence 6)
- [ ] `user_id` is NOT nulled
- [ ] Subsequent `GET /api/v1/posts/{id}` returns 404
- [ ] Subsequent `GET /api/v1/posts` (feed) does NOT include the deleted post
- [ ] Comments on the deleted post stay in DB (no hard cascade)
- [ ] Activity log row from creation stays (no reversal)
- [ ] Wrong user → 403 FORBIDDEN
- [ ] Admin → 204 (admin override)
- [ ] Non-existent post → 404 POST_NOT_FOUND
- [ ] Already-deleted post → 204 (idempotent)
- [ ] DELETE outside any edit window → 204 (no edit-window check on delete)
- [ ] No JWT → 401

### Cross-cutting

- [ ] All 3 endpoints emit standard `{data, meta}` envelope
- [ ] All error responses emit standard `{code, message, requestId, timestamp}`
- [ ] `X-Request-Id` header on all responses
- [ ] OpenAPI spec includes all 3 endpoints with full schemas
- [ ] `npx @redocly/cli lint` passes
- [ ] All security headers present on responses (verified via existing SecurityHeadersFilter coverage)

### Test count rollup

L target is 20-40; XL target is 35+. The acceptance criteria above enumerate ~75 distinct concerns. Distributed across:

- `PostWriteIntegrationTest`: ~30 tests (HTTP-level, end-to-end)
- `PostServiceWriteTest`: ~12 tests (service-layer, mocked dependencies)
- `PostsRateLimitServiceTest`: ~6 tests (bucket math, decay, multi-user isolation)
- `PostsIdempotencyServiceTest`: ~5 tests
- `PostEditWindowTest`: ~6 tests (boundary cases, exempt operations)
- `PostVisibilityTransitionTest`: ~8 tests (Divergence 4 matrix)
- `PostCrisisDetectorTest`: ~8 tests (each keyword + edge cases)
- `PostCrisisDetectorParityTest`: ~4 tests (parity with the 3 existing detectors + frontend)
- `CrisisAlertServiceTest`: ~3 tests (Sentry integration mocked)
- `CrisisDetectedEventListenerTest`: ~4 tests (AFTER_COMMIT, dedup)
- `CrisisResourcesParityTest`: ~1-2 tests

Total **~85 tests**. The XL target is 35+; this overshoots significantly because the spec spans crisis detection, rate limiting, idempotency, and three endpoints with full validation surfaces. If CC's plan proposes 100+, push back; if 50, push back the other way (under-coverage on critical surfaces).

---

## What to Watch For in CC's Spec Output

This is the longest watch-for section in the wave so far. The spec's risk profile justifies the extra rigor.

1. **Don't propose LLM-classifier crisis detection in this spec.** Per Divergence 1, ship keyword-only. If CC's recon argues for the classifier path citing `01-ai-safety.md`, the case for keyword-only is the precedent of three existing detectors and the failure-mode analysis in the divergence body. Push back.

2. **Don't propose email alerts.** Per Divergence 2. SMTP infrastructure doesn't exist; the followup is tracked. Sentry + database flag ARE the alert mechanism for now.

3. **`crisis_flag = TRUE` does NOT block the post.** Per the explicit treatment in the Crisis Detection section. If CC's plan adds a 422 or 451 path for crisis-flagged posts, push back hard. Block-on-flag is harmful; the spec is explicit about why.

4. **Activity engine call goes inside the same transaction.** Per the Activity Engine Integration section. If CC's plan proposes async activity recording or a separate transaction for activity, push back. Atomic write of post + activity_log row is the contract.

5. **Edit window timing comes from config, not hardcoded.** Per the Rate Limiting Architecture and Divergence 3. `worshiproom.posts.edit-window-minutes=5` in `application.properties`. If CC proposes a hardcoded `5` in `PostService`, push back — Eric needs the env-var override path for production tuning.

6. **Crisis dedup at the listener, not the service.** Per the Crisis Detection Architecture section. If CC's plan adds dedup logic inside `PostService` or `CrisisAlertService` instead of the event listener, push back — the listener is the single point that observes both create and edit paths.

7. **Activity engine call NOT reversed on delete.** Per DELETE flow step 7. If CC proposes "remove activity_log row when post deleted," push back — Phase 2's design intentionally records intent at the time of the act; subsequent deletion doesn't undo intent.

8. **Visibility transition matrix is complete.** Per Divergence 4. If the plan covers only "downgrade allowed, upgrade rejected outside window" without the full matrix, push back — the test cases need to enumerate all 9 source-target pairs.

9. **`is_anonymous` in PATCH body returns 400.** Per Divergence 5. If CC's plan adds anonymity-toggle support, push back — both directions of the toggle break the anonymity contract.

10. **`Idempotency-Key` cache is bounded and per-user.** Per BOUNDED EXTERNAL-INPUT CACHES rule and the Idempotency section. Caffeine `maximumSize(10_000)`, `expireAfterWrite(24h)`. If CC's plan proposes unbounded `ConcurrentHashMap`, push back hard — this is a DoS vector.

11. **Soft-delete on DELETE preserves content.** Per Divergence 6. If CC's plan replaces content with `'[deleted]'`, push back — that's Spec 10.11's account-deletion concern, not Spec 3.5's single-post-delete concern. The two are distinct retention rules.

12. **Anonymous posts still set `posts.user_id` to the real author.** Per Divergence 7. If CC's plan tries to NULL `user_id` for anonymous posts, the schema's NOT NULL constraint will reject the insert; the 4 use cases in the divergence justify the design.

13. **`qotdId` validated by service-layer existence check.** Per Divergence 8. If CC adds an FK from `posts.qotd_id` to `qotd_questions.id`, push back — Spec 3.1's schema deliberately omits the FK.

14. **Email-verification gate is conditional.** Per the POST flow step 2. If `@RequireVerifiedEmail` annotation doesn't exist in the codebase yet (Phase 1.5d is SMTP-blocked), the gate is dropped from this spec and tracked as a followup. Don't block this spec on Phase 1.5d.

15. **`PostCrisisDetector` parity test against existing 3 detectors.** Per the Crisis Detection Architecture section. If CC's plan skips the parity test ("the keyword list is duplicated, parity is by manual review"), push back — drift between the four detectors is a real bug class. The parity test is cheap (~10 lines) and catches drift on first regression.

16. **`CrisisResources` constants parity with frontend.** Per the Crisis Detection Architecture section. If CC drops the parity test claiming brittleness, the alternative is a comment-block "if you change this, also update frontend/src/constants/crisis-resources.ts" — that's documentation, not enforcement. Recon picks; the brief leans toward the parity test.

17. **`OffsetDateTime` for all timestamps.** Per Spec 3.1's schema (`TIMESTAMP WITH TIME ZONE`). If CC mixes in `LocalDateTime` or `Instant`, push back. The codebase convention is `OffsetDateTime`.

18. **`gen_random_uuid()` for new IDs.** Match Spec 3.1's UUID generation pattern (whatever the existing changesets use — `gen_random_uuid()` per Phase 1 convention).

19. **`@Transactional(rollbackFor = Exception.class)` on write methods.** Per Spring's default behavior, `@Transactional` rolls back only on RuntimeException. Adding `rollbackFor = Exception.class` ensures checked exceptions also trigger rollback (defensive). Recon should grep existing `@Transactional` usage in `PostService` from Spec 3.3 and match the convention.

20. **Don't add a `PostsController` separate from `PostController`.** Per master plan, PostController gets the new write methods. If CC creates a `PostWriteController`, that splits the controller across files for no benefit.

21. **No DB triggers on `posts` table.** Per Spec 3.1's Watch-For #14. Counter maintenance for `comment_count`, `praying_count`, etc. happens in Specs 3.6 and 3.7's application code.

22. **`@Async` is NOT a substitute for AFTER_COMMIT events.** If CC proposes `@Async public void alertCrisis(...)`, push back — `@Async` doesn't wait for transaction commit, which means alerts could fire on rolled-back inserts. `@TransactionalEventListener(phase = AFTER_COMMIT)` is the correct pattern.

23. **`PostCrisisDetectorTest` covers each keyword individually + boundary cases.** Per the test plan. The boundary cases that matter:
    - Empty string → false
    - Null → false
    - Whitespace-only → false
    - Keyword case-variations: `"SUICIDE"`, `"Suicide"`, `"sUiCiDe"` all → true
    - Keyword embedded in larger text → true
    - Keyword as substring of unrelated word ("homicide" contains "icide" but NOT "suicide" — check that "suicide" inside "homicide" doesn't trip. Actually "suicide" is NOT a substring of "homicide" so this is fine. But "die" being a substring of "want to die" should match the full keyword "want to die" not just "die". The current `String.contains` with full multi-word keywords handles this correctly.)
    - All 12 backend keywords each get a positive test
    - One control test per keyword: a similar but non-trigger phrase ("I'm dying to see her" should NOT trigger via the "die" path, but might trigger via... nothing. The keyword list has "want to die", not "die" alone. Verify.)

24. **Logging on crisis detection fire is INFO level.** Not WARNING (that's Sentry's level). Application logs at INFO with structured fields: `crisis_keyword_match=true post_id=... user_id=...`. Don't log post content. The Sentry alert IS the warning channel; the log is the audit trail.

25. **`OWASP Java HTML Sanitizer` is the ONLY HTML sanitization library.** Don't introduce JSoup, Jericho, or hand-rolled regex. The OWASP library is the boring standard for this. The dependency add is in `build.gradle` (or `pom.xml`).

26. **The `EditWindowExpiredException` translates to 409, NOT 410.** 409 (Conflict) signals "the request conflicts with the current state of the resource" — accurate semantic for "the post is now too old to edit." 410 (Gone) implies the resource is permanently gone, which it isn't. Match Phase 3.6's Addendum convention.

27. **`PostsRateLimitException` extends `RuntimeException`** (not checked) so `@Transactional` rolls back automatically without needing `rollbackFor` adjustment. Same for `EditWindowExpiredException`, `PostForbiddenException`, etc.

28. **Single quotes** in shell snippets, file paths, fixture strings. SQL strings in test fixtures must escape SQL apostrophes correctly (backend tests rarely have inline SQL, but CrisisDetectorTest's negative-case strings might contain apostrophes — `"that's not a crisis"` in a test name needs care).

---

## Out of Scope

- LLM-classifier crisis detection (Divergence 1; future spec)
- Email alerts on crisis flag (Divergence 2; Phase 15.x)
- Comment writes (Spec 3.6)
- Reaction / bookmark writes (Spec 3.7)
- Report writes (Spec 3.8)
- QOTD admin endpoints (Spec 3.9)
- Frontend wiring (Spec 3.10)
- Phase 3 cutover (Spec 3.12)
- Image upload on posts (Phase 4.6b)
- Composer-side visibility selector UI (Phase 7.7)
- Frontend rendering of `crisisResources` block (Phase 3.10 wires the consumer; the response shape is established here)
- Crisis supersession behaviors — 3am Watch suppression, Verse-Finds-You suppression, welcome-email pause (Phase 10.5/10.6)
- Moderator queue / triage UI for crisis-flagged posts (Phase 10.5/10.6)
- Account-deletion content replacement (Spec 10.11; distinct from this spec's single-post soft-delete)
- "Mark answered" milestone emit hook (Phase 6.6 Answered Wall)
- Activity-points reversal on delete (intentionally NOT done; see Activity Engine Integration)
- Per-post-type activity multipliers (Phase 4+)
- Post-level reactions on testimony/encouragement post types (`'praising'` and `'celebrate'` reactions) — those reaction types ship in Phase 6.6 schema migration
- Edit history (no `post_edits` audit table; out of scope for MVP)
- Drafts (composer-side concern; Phase 6.9)
- Scheduled posts (out of scope for MVP)
- Edit-window override for admin moderation corrections (admins use full PATCH freedom for moderation; no separate "moderator edit" endpoint)
- Email when a post is mentioned (Phase 12+ notifications)
- Push notification on crisis flag (out of scope; Sentry is the alert channel)
- Cross-device idempotency (the `Idempotency-Key` cache is per-instance; multi-instance deploys don't dedupe across instances. Same Caffeine limitation as the rate-limit cache. Acceptable for MVP; documented as Phase 5.6 Redis upgrade path.)

---

## Out-of-Band Notes for Eric

- **This is the longest spec in Phase 3 by every metric** (file count, test count, divergence count, watch-for count) and is rivaled only by Phase 6 hero specs in the broader wave. Plan execution time accordingly: 4-6 sessions on CC for execute, 1-2 sessions for code review, plus your own personal review block (which I'd budget 1-2 hours of focused attention separate from CC).
- **The MAX-everywhere decision applies here.** This is the spec that justifies the asymmetric-cost reasoning we discussed. Run MAX through spec → plan → execute → review.
- **Pre-execution decisions for you to make explicitly before /spec-forums fires:**
  1. **Confirm `@RequireVerifiedEmail` annotation status.** Has Spec 1.5d shipped? If yes, the gate applies; if no, the gate drops from this spec with a followup. CC's recon will check, but you should also confirm independently.
  2. **Confirm Sentry SDK availability.** Spec 1.10d shipped Sentry. Verify `io.sentry.Sentry` is on the classpath. If not, the alert channel is only the database flag and console.log — followup for adding Sentry SDK to CrisisAlertService later.
  3. **Confirm OWASP Java HTML Sanitizer is the right library.** Alternatives: JSoup's safelist API, Spring's `HtmlUtils.htmlEscape()`. The brief recommends OWASP because it's the Spring-ecosystem-canonical safelist sanitizer; if you have a preference, override here.
  4. **Confirm `Idempotency-Key` is worth shipping in this spec.** The brief argues yes (mobile network conditions, frontend draft-resume flows). If you'd rather defer to a future spec, drop it here and add a followup; the wave still works without it, but mobile UX gets duplicate-post bugs.
  5. **Decide on the crisis-resource-block frontend handling.** This spec ships the backend response shape; Phase 3.10 wires the frontend to render it. If you want the frontend to ALSO render a CrisisBanner inline in the composer at typing time (matching the existing CrisisBanner pattern from journal/prayer composers), that's a frontend-only addition that doesn't need a backend spec — but worth flagging now so the design conversation happens early.
- **Watch-For #1 is the most likely recon pushback.** CC's recon may try to add the LLM classifier "for completeness." The case for keyword-only is the failure-mode analysis in Divergence 1. Be ready to defend it.
- **Watch-For #15 (parity test) is the highest-leverage safety check in the spec.** Without the parity test, the four detector keyword lists drift over time, and you ship a state where the journal detector catches a phrase the post detector misses. Ship the parity test.
- **Watch-For #22 (`@Async` ≠ `@TransactionalEventListener`) is the most subtle correctness concern.** This is the kind of bug MAX should catch — `@Async` looks correct, runs after the method returns, but doesn't wait for transaction commit. Insert fails → alert still fires. Deep failure mode that xHigh might miss. Demand the plan output show explicit AFTER_COMMIT semantics.
- **Test count of 85 is honestly earned.** Don't let CC propose 35 ("master plan minimum") — the surface area genuinely warrants the depth, and crisis-detection coverage at less than ~15 tests is irresponsible. If CC proposes 50, push back; if 100, push back the other way (excess on non-critical surfaces).
- Spec tracker after 3.5 ships: `3.5 ✅`, Phase 3 progress 5/12. The hardest Phase 3 spec is now behind us; 3.6 (Comments Write) follows similar patterns but with materially simpler scope: comments instead of posts, the 5-minute edit window is already canonical there (master plan acceptance criterion line 3802), same crisis-detection contract reused via the same `PostCrisisDetector` keyword pattern (or a sibling `CommentCrisisDetector` with parity test against this spec's detector — recon picks; the brief leans toward reusing the same detector since the keyword list is content-shape-agnostic), rate limit 20/hour per master plan, and no idempotency layer (comments are cheaper to dedupe by content+post_id+user_id+created_at proximity, OR can simply skip dedup for MVP — comments are lower-stakes than posts for duplicate-creation regret). 3.6 is High-risk per master plan but the risk is "yet another user-generated content surface," not novel architecture. xHigh after this spec, NOT MAX.
- **One last reminder on personal review.** The MAX-everywhere decision reduces probability of subtle bugs but doesn't replace your review. The highest-leverage thing you can do for this spec, separate from any model tier, is to walk through the post-execute code yourself with these specific questions in mind:
  1. Does the crisis detection actually fire on every code path that creates or modifies a post? (Walk the create flow AND the patch flow AND any future write paths the spec didn't anticipate.)
  2. Does the Sentry alert fire only on AFTER_COMMIT, never on rolled-back inserts? (Read the listener code; verify the `phase = AFTER_COMMIT` annotation; trace the event publication.)
  3. Does the rate-limit check fire BEFORE the database insert? (Trace step 3 → step 7 in `PostService.createPost`; verify no DB writes happen between them.)
  4. Are post content and Sentry alerts kept strictly separate? (Search the codebase for any place `post.content` is passed to `Sentry.captureMessage`, `Sentry.captureException`, or any structured-log sink. Should be zero hits.)
  5. Does the response shape correctly omit `crisisResources` when the flag didn't fire? (Inspect a non-flagged response; verify Jackson NON_NULL config drops the field.)

  These five checks take ~30 minutes of focused review and catch the bug class that any model tier could miss. Don't skip.

- After 3.5 finishes review and ships, ping me. I'll start drafting 3.6 with the simpler scope baked in.
