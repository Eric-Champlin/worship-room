# Forums Wave: Spec 3.8 — Reports Write Endpoint

**Master Plan Reference:** `_forums_master_plan/round3-master-plan.md` → Spec 3.8 (line 3935)
**Master Plan ID:** `round3-phase03-spec08-reports-write-endpoint`
**Branch:** `forums-wave-continued` (existing branch — staying per user instruction, no new branch created)
**Date:** 2026-04-30

---

## Affected Frontend Routes

- `/prayer-wall/:id` — PrayerDetail page; ReportDialog wiring + AuthModal gate + own-post Report button hide

> No comment-report UI in this spec — backend `POST /api/v1/comments/{commentId}/reports` ships unwired (D15, deferred to a future spec).

---

## Spec 3.8 — Reports Write Endpoint

- **ID:** `round3-phase03-spec08-reports-write-endpoint`
- **Size:** M (master plan body); brief argues xHigh planning depth — see "Tier" below
- **Risk:** Medium
- **Prerequisites:** 3.7 ✅
- **Goal:** Implement `POST /api/v1/posts/{id}/reports` and `POST /api/v1/comments/{id}/reports`. Stores in `post_reports` for the Phase 10 moderation queue. Idempotent per `(reporter, target, status='pending')` — see MPD-1 + D4 for refinement of the master plan body's "one per user per content" wording.

**Approach (master plan body):** Single endpoint accepts `reason` (enum) and optional `details`. Inserts into `post_reports`. Either `post_id` or `comment_id` set, never both. Duplicate report from same user returns 200 idempotently (do not leak the "already reported" state). Rate limited per user. Phase 10 builds the moderator queue and review UI; this spec just lands the write side.

**Master plan acceptance criteria (5 items):**

- [ ] Reporting a post creates a row in `post_reports`
- [ ] Reporting a comment creates a row with `comment_id` set, `post_id` null
- [ ] Duplicate report from same user is idempotent
- [ ] Rate limit: 10 reports per hour per user
- [ ] At least 10 integration tests

> Brief carries an expanded 23-item AC list — see "Acceptance Criteria" section near the bottom.

---

## Tier

**xHigh.** Master plan body says M/Medium. The pattern is well-trodden — mirrors bookmarks (Spec 3.7) almost exactly: rate-limited write endpoint, idempotent semantics, no activity events, no faith points, no `last_activity_at` bump. The brief carries the watch-fors and decisions explicitly. Default xHigh per the recalibrated tier policy; MAX would be over-spending.

## Master Plan Divergence

Three deliberate divergences from the master plan body's text (lines 3935-3956 of `_forums_master_plan/round3-master-plan.md`):

**MPD-1: No UNIQUE constraint exists in the schema; idempotency is service-layer.** The master plan body says "One report per user per content (UNIQUE constraint)." Recon confirms: changeset 018 has the XOR check (`post_id` XOR `comment_id`) but **no UNIQUE constraint** on `(reporter_id, post_id)` or `(reporter_id, comment_id)`. This brief enforces idempotency in `ReportService` via `find-or-no-op`, and refines the rule (see D4): only `pending` reports are deduped — closed reports (reviewed/dismissed/actioned) allow re-reporting because the moderator already processed the original and the user re-flagging is genuine new signal.

**MPD-2: Frontend `ReportDialog` ships a freeform textarea today, NOT an enum picker.** Master plan body says "`reason` (enum) and optional `details`." Recon: `frontend/src/components/prayer-wall/ReportDialog.tsx` has only a single textarea (max 500 chars). Reconciliation per D3 below: backend enforces enum; frontend gets minor surgery (reason picker added, textarea repurposed as `details`). Honors the master plan's design intent without throwing away the existing dialog.

**MPD-3: No comment-report UI exists today; backend endpoint ships unwired.** Master plan body says ship both `POST /api/v1/posts/{id}/reports` AND `POST /api/v1/comments/{id}/reports`. Recon: zero comment-reporting UI in `frontend/src/`. Backend endpoint ships per master plan; frontend comment-report wiring deferred to a future spec (likely Phase 4 polish or Phase 10 moderation queue UI). Document the gap in `_plans/post-1.10-followups.md` so it's not forgotten.

## Recon Ground Truth (2026-04-30)

All facts re-verified on the active machine (`/Users/eric.champlin/worship-room/`):

**R1 — `post_reports` table is fully shipped (Spec 3.1, changeset 018; relaxed in changeset 020).** Schema:
- `id UUID PK DEFAULT gen_random_uuid()`
- `post_id UUID NULL FK → posts(id) ON DELETE CASCADE`
- `comment_id UUID NULL FK → post_comments(id) ON DELETE CASCADE`
- `reporter_id UUID NOT NULL FK → users(id) ON DELETE CASCADE`
- `reason VARCHAR(50) NOT NULL`
- `details TEXT NULL`
- `status VARCHAR(20) NOT NULL DEFAULT 'pending'` (CHECK: `pending|reviewed|dismissed|actioned`)
- `reviewer_id UUID NULL FK → users(id) ON DELETE SET NULL`
- `reviewed_at TIMESTAMP WITH TIME ZONE NULL`
- `action_taken VARCHAR(50) NULL`
- `created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()`
- CHECK: XOR target (`post_id IS NOT NULL XOR comment_id IS NOT NULL`)
- CHECK: review consistency (relaxed in 020 to allow `reviewer_id IS NULL` on closed reports — for FK cascade SET NULL when moderator account deleted)
- Indexes: `idx_post_reports_reporter_id_created`, `idx_post_reports_status_created` (partial WHERE status='pending'), `idx_post_reports_post_id`, `idx_post_reports_comment_id`

**R2 — No `Report*` Java code exists yet.** Zero `Report*` files in `backend/src/main/java/com/worshiproom/post/`. No JPA entity, no repository, no service, no controller. This spec creates everything.

**R3 — Canonical sub-package pattern: `com.worshiproom.post.comment/`** holds `CommentController`, `CommentException`, `CommentExceptionHandler`, etc. Reports follows the identical structure: `com.worshiproom.post.report/`.

**R4 — `EngagementExceptionHandler` is `@RestControllerAdvice(basePackages = "com.worshiproom.post")`** (NOT scoped to `com.worshiproom.post.engagement`). The class Javadoc explicitly explains why: Spring's `basePackages` filter applies to the **controller's** package, not the exception's. A tighter scope would silently fail to catch exceptions from sibling controllers in `com.worshiproom.post`. **`ReportExceptionHandler` follows the same scoping** — `basePackages = "com.worshiproom.post"`. Dispatch ambiguity is prevented by TYPE: `ReportException` is a distinct base from `EngagementException`, `PostException`, `CommentException`.

**R5 — `BookmarksRateLimitService` is the canonical Caffeine-bucket pattern** for per-user write-rate limiting. `ReportsRateLimitService` mirrors it with different bucket size (10/hour per master plan body, vs 60/hour for bookmarks). Bucket cache: `Caffeine.newBuilder().maximumSize(10_000).expireAfterAccess(Duration.ofHours(2))` — eviction window 2x the refill window (no risk of evicting still-active bucket and giving a user free retries).

**R6 — `BookmarkWriteService.add` is the canonical service-layer pattern** for idempotent writes. Pattern:
- Rate-limit check first (throws `BookmarksRateLimitException` if exceeded)
- Load-and-validate target (`loadVisiblePost(postId, userId)` — exception if not visible)
- Existence check (`bookmarkRepository.existsByPostIdAndUserId`)
- Branch: insert if not exists, no-op if exists
- Return `(response, created: boolean)` so controller maps to 201 vs 200

`ReportService.report()` mirrors this shape. Difference: visibility rule (see D9 below) is intentionally permissive — reports are accepted for any post that exists, even crisis-flagged or soft-deleted, because reports against problematic content are signal the moderator queue wants.

**R7 — `SecurityConfig` method-specific rule ordering** (Phase 3 Addendum #4). Reports endpoints follow the same pattern as bookmarks/reactions: explicit `.authenticated()` rules placed BEFORE `OPTIONAL_AUTH_PATTERNS.permitAll()` so the method-specific rule wins via first-match-wins.

**R8 — `application.properties` rate-limit conventions.** New properties under `worshiproom.reports.rate-limit.*`:
```
worshiproom.reports.rate-limit.max-per-hour=10
worshiproom.reports.rate-limit.bucket-cache-size=10000
```
Mirrors the shape of `worshiproom.bookmarks.rate-limit.*`.

**R9 — Frontend `ReportDialog`** at `frontend/src/components/prayer-wall/ReportDialog.tsx` exists but is currently **unwired** — `PrayerDetail.tsx:197` renders `<ReportDialog prayerId={prayer.id} />` WITHOUT an `onReport` callback. The dialog simulates submission (sets `submitted=true` for 1.5s, then closes). No actual API call happens today. This spec wires it.

**R10 — `useAuthModal` is the AuthModal trigger.** Frontend code that calls authenticated endpoints checks `useAuth()` and falls through to `authModal.openAuthModal()` if anonymous. `ReportDialog` does NOT do this gate today — anonymous users see the dialog and can submit (it just no-ops). This spec adds the gate.

**R11 — Activity types and faith points.** Reports do NOT fire activity events; do NOT award faith points. Reports are pure safety infrastructure (mirrors bookmarks per Spec 3.7 D3). No changes to `ActivityType` enum, no changes to `PointValues`.

**R12 — `last_activity_at` bump.** Reports do NOT bump `posts.last_activity_at` (reports are safety signal, not engagement; mirrors bookmarks per Spec 3.7).

**R13 — OpenAPI yaml** at `backend/src/main/resources/openapi.yaml` is the source of truth for the API contract. Two new endpoints + 2 new DTO schemas (`CreateReportRequest`, `CreateReportResponse`) + the existing `ProxyError` for the rate-limit case.

## Phase 3 Execution Reality Addendum gates — applicability

| # | Convention | Applies to 3.8? |
|---|---|---|
| 1 | EditWindowExpired returns 409 | N/A — no edit-window endpoints |
| 2 | L1-cache trap | **APPLIES MILDLY** — service does an `existsBy...` check then potentially `save()`. JPA persistence-context state is fresh per request; no L1 cache trap risk because there's no read-after-write pattern that would surface stale data |
| 3 | `@Modifying` flags | N/A — no JPQL bulk updates |
| 4 | SecurityConfig method-specific rule ordering | **APPLIES** — both new endpoints require `.authenticated()` placed BEFORE `OPTIONAL_AUTH_PATTERNS` |
| 5 | Caffeine-bounded bucket pattern | **APPLIES** — `ReportsRateLimitService` follows `BookmarksRateLimitService` exactly |
| 6 | Domain-scoped `@RestControllerAdvice` | **APPLIES** — `ReportExceptionHandler` scoped to `basePackages = "com.worshiproom.post"` per R4 |
| 7 | `CrisisAlertService` unified entry | **DELIBERATELY DOES NOT APPLY** — see D9. Reports are a separate signal channel from CrisisAlertService; a user reporting a crisis-flagged post is meaningful information |
| 8 | Schema realities — do NOT recreate | **CRITICAL** — `post_reports` table EXISTS (changeset 018, relaxed 020). NEVER add a new `create-post-reports-table.xml` changeset. NO schema changes in this spec |
| 9 | INTERCESSION ActivityType | N/A — reports do not fire activity |
| 10 | `wr_prayer_reactions` shape | N/A |
| 11 | Liquibase filename convention | N/A — no schema changes |
| 12 | BB-45 cross-mount subscription test | N/A — no reactive store |

## Decisions and divergences (15 items)

**D1 — Sub-package layout.**
Mirrors the comment domain. Create `com.worshiproom.post.report/`:
```
ReportController.java                  # POST /posts/{id}/reports + POST /comments/{id}/reports
ReportService.java                     # @Transactional, idempotency + rate-limit + persist
Report.java                            # JPA entity
ReportRepository.java                  # extends JpaRepository<Report, UUID>
ReportReason.java                      # enum
ReportReasonConverter.java             # JPA AttributeConverter (enum ↔ String)
ReportStatus.java                      # enum (mirrors DB CHECK constraint values)
ReportStatusConverter.java
ReportException.java                   # base
ReportTargetNotFoundException.java     # 404 (post or comment doesn't exist)
ReportsRateLimitConfig.java            # @ConfigurationProperties
ReportsRateLimitService.java
ReportsRateLimitException.java         # 429 with Retry-After
ReportExceptionHandler.java            # @RestControllerAdvice scoped to com.worshiproom.post
dto/
  CreateReportRequest.java             # reason (required, enum) + details (optional, max 500)
  CreateReportResponse.java            # {data: {reportId}, meta: {requestId}}
```

Tests at `backend/src/test/java/com/worshiproom/post/report/`:
```
ReportControllerTest.java              # extends AbstractIntegrationTest
ReportServiceTest.java                 # extends AbstractIntegrationTest (uses real repo)
ReportsRateLimitServiceTest.java       # plain JUnit5
ReportReasonConverterTest.java         # plain JUnit5
```

**D2 — Single combined controller, two endpoint methods.**
`ReportController` exposes both endpoints because the logic is symmetric (only the target differs). Mirrors `CommentController`'s shape — separate from `PostController`, lives in its own sub-package.

```java
@PostMapping("/posts/{postId}/reports")
public ResponseEntity<CreateReportResponse> reportPost(
    @PathVariable UUID postId,
    @AuthenticationPrincipal AuthenticatedUser principal,
    @Valid @RequestBody CreateReportRequest request) { ... }

@PostMapping("/comments/{commentId}/reports")
public ResponseEntity<CreateReportResponse> reportComment(
    @PathVariable UUID commentId,
    @AuthenticationPrincipal AuthenticatedUser principal,
    @Valid @RequestBody CreateReportRequest request) { ... }
```

Both delegate to `ReportService.report(targetType, targetId, principal, request, requestId)` where `targetType` is an enum (`POST | COMMENT`).

**D3 — Reason enum with 6 values; details optional.**
```java
public enum ReportReason {
    SPAM,           // commercial spam, off-topic promotional content
    HARASSMENT,     // targeted attacks on a specific user
    HATE,           // hate speech against a protected class
    SELF_HARM,      // content promoting self-harm or suicide
    SEXUAL,         // sexual content inappropriate for the community
    OTHER;          // catchall for everything else (details strongly encouraged)
}
```

`reason` is required (NOT NULL in DB; `@NotNull @Pattern` validation in DTO mapping a string to the enum). `details` is optional, max 500 chars. JPA persists the enum's `name()` as VARCHAR(50) via `ReportReasonConverter`.

**Frontend ReportDialog gets minor surgery (D14):** add a small radio-button or select row above the textarea with the 5 named reasons + "Other" (default). Textarea label changes from "Reason for reporting..." to "Tell us more (optional)..." — repurposed as `details`. Existing tests keep most of their assertions (textarea is still there, max 500 chars, character count, focus trap, etc.); add new tests covering the reason picker.

**D4 — Idempotency: dedup `pending` reports only; closed reports allow re-report.**
Master plan body says "Duplicate report from same user is idempotent." This brief refines the rule:
- If existing report from same `(reporter_id, target_id)` has `status='pending'` → return 200 with the existing report's ID. Do NOT create a new row.
- If existing report has `status IN ('reviewed', 'dismissed', 'actioned')` → CREATE a new pending report. The original was processed; user re-flagging is new signal.
- If no existing report → CREATE.

Implementation: `ReportRepository.findByReporterIdAndPostIdAndStatus(reporterId, postId, "pending")` returns the existing pending report if any. Same for comment_id. Return 200 with `{reportId: existing.id, created: false}` on dedup; 201 with `{reportId: new.id, created: true}` on insert.

**D5 — Optimistic concurrency via row-level locking.**
Two simultaneous report attempts from the same user shouldn't create two pending rows (unique constraint isn't enforced at DB layer per MPD-1). Wrap the find-or-no-op in `@Transactional(isolation = SERIALIZABLE)` OR use SELECT FOR UPDATE on the existence check. Recommend SELECT FOR UPDATE — matches Phase 3 reaction-toggle pattern, lower overhead than SERIALIZABLE.

```java
@Repository
public interface ReportRepository extends JpaRepository<Report, UUID> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM Report r WHERE r.reporterId = :reporterId AND r.postId = :postId AND r.status = 'pending'")
    Optional<Report> findPendingByReporterAndPostForUpdate(@Param("reporterId") UUID reporterId, @Param("postId") UUID postId);
    // (mirror for commentId)
}
```

**D6 — Rate limit: 10 reports per hour per user (master plan body).**
`ReportsRateLimitConfig` mirrors `BookmarksRateLimitConfig`:
```java
@Configuration
@ConfigurationProperties(prefix = "worshiproom.reports")
public class ReportsRateLimitConfig {
    private RateLimit rateLimit = new RateLimit();
    public static class RateLimit {
        private int maxPerHour = 10;
        private int bucketCacheSize = 10_000;
        // getters/setters
    }
}
```

Properties default in `application.properties`:
```
# ─── Reports (Spec 3.8) ────────────────────────────────────────────────────
# Per-user reports-per-hour limit. Same bucket covers post-reports and
# comment-reports endpoints (a malicious actor doesn't get 2x the rate by
# alternating targets). Configurable via WORSHIPROOM_REPORTS_RATELIMIT_MAXPERHOUR.
worshiproom.reports.rate-limit.max-per-hour=10
worshiproom.reports.rate-limit.bucket-cache-size=10000
```

Note: ONE bucket per user shared across both endpoints. A user reporting 8 posts then 3 comments hits the limit on their 11th total. This prevents target-alternation evasion.

**D7 — Reports do NOT fire activity events.**
No new `ActivityType` enum value. No call to `ActivityService.recordActivity(...)`. No faith points. Mirrors bookmarks (Spec 3.7 D3). Reporting is moderation infrastructure, not engagement — gamifying it would create perverse incentives (vexatious reporting for points).

**D8 — Reports do NOT bump `posts.last_activity_at`.**
A reported post should NOT jump to the top of the feed. Mirrors bookmarks. Service layer does NOT call `postRepository.bumpLastActivity(postId)`.

**D9 — Visibility rule: report ANY post/comment that exists, including crisis-flagged and soft-deleted.**

This is a deliberate departure from Phase 3 Addendum #7 (CrisisAlertService unified entry).

Reasoning: `crisis_flag=true` posts are filtered from public feed reads (Phase 3 Addendum #7). But a user with the direct URL or a stale cached client may still see them. Reports against crisis-flagged content are exactly the kind of moderator-queue signal we want to capture — moderators may need to follow up with the user, escalate to crisis resources, or contact the original poster.

Implementation: `ReportService.findTarget()` calls `postRepository.findById(postId)` directly — NOT `findVisibleTo(viewerId, postId)`. If the post exists at all (even soft-deleted, even crisis-flagged), the report is accepted. The schema's CASCADE DELETE on `posts(id)` means hard-deleted posts get their reports cleaned up automatically.

**Same for comments:** `postCommentRepository.findById(commentId)` — no visibility check.

If the target doesn't exist (404 vs cascade-deleted): throws `ReportTargetNotFoundException` → 404. The exception handler logs at INFO; this is expected user behavior (clicking report on a stale UI), not an error.

**D10 — Authentication required.**
Both endpoints require `.authenticated()`. Anonymous users cannot report. SecurityConfig rules added BEFORE `OPTIONAL_AUTH_PATTERNS`:
```java
.requestMatchers(HttpMethod.POST, "/api/v1/posts/*/reports").authenticated()
.requestMatchers(HttpMethod.POST, "/api/v1/comments/*/reports").authenticated()
```

**D11 — Self-report prevention: yes, throw 400.**
A user reporting their own post is almost always a misclick or test attempt. Service layer compares `principal.userId() == post.getAuthorId()` (and same for comment) and throws `SelfReportException` (400) if equal. Frontend should hide the Report button on the user's own posts (small UI watch-for) but defense-in-depth at the service layer.

**D12 — Logging policy.**
On report creation log INFO with: `reporterId, targetType (post|comment), targetId, reason, status (created|idempotent), requestId`. **NEVER log `details` content** (PII risk — users may include personal info about the reported user, the original content quote, etc.). NEVER log the reported user's content.

Example log line:
```
Report submitted reporterId=abc-123 targetType=post targetId=def-456 reason=HARASSMENT status=created requestId=xyz-789
```

**D13 — Exception model.**
- `ReportTargetNotFoundException` (404) — post or comment doesn't exist
- `ReportsRateLimitException` (429) — rate limit exceeded; Retry-After header set
- `SelfReportException` (400) — user attempted to report own content
- `ReportException` (base, 400 default) — generic domain rejection (e.g., invalid reason enum after Jackson deserialization mismatch — though `@Valid` on the DTO catches this earlier)

`ReportExceptionHandler` (`@RestControllerAdvice(basePackages = "com.worshiproom.post") @Order(HIGHEST_PRECEDENCE)`) maps each. Pattern mirrors `EngagementExceptionHandler` exactly.

**D14 — Frontend wiring (3 files modified).**

1. **New file** `frontend/src/services/api/reports-api.ts`:
```typescript
   export type ReportReason = 'spam' | 'harassment' | 'hate' | 'self_harm' | 'sexual' | 'other'

   export async function reportPost(postId: string, reason: ReportReason, details?: string): Promise<{reportId: string}> {
     return apiFetch(`/posts/${postId}/reports`, { method: 'POST', body: JSON.stringify({reason, details}) })
   }

   export async function reportComment(commentId: string, reason: ReportReason, details?: string): Promise<{reportId: string}> {
     return apiFetch(`/comments/${commentId}/reports`, { method: 'POST', body: JSON.stringify({reason, details}) })
   }
```

2. **Modified** `frontend/src/components/prayer-wall/ReportDialog.tsx`:
   - Add reason picker (radio buttons or select) ABOVE the textarea — 6 options matching the enum, default "Other"
   - Textarea label changes: "Tell us more (optional):" — semantically the `details` field
   - `onReport` prop signature changes from `(prayerId: string, reason: string) => void` to `(prayerId: string, reason: ReportReason, details?: string) => Promise<void>`
   - Add `useAuthModal()` gate: clicking the Report button when anonymous opens AuthModal instead of the dialog
   - Loading state: disable Submit while the promise is pending (avoid duplicate submits during the 1.5s success-display window)
   - Error handling: catch ApiError, show toast with anti-pressure copy:
     - 401: AuthModal trigger (handled by apiFetch's wr:auth-invalidated)
     - 404: "This content is no longer available."
     - 429: "Please slow down a moment. You can report again in {Retry-After} seconds."
     - 400 SELF_REPORT: should never reach here if UI hides Report on own posts; defensively show "You can't report your own posts."
     - 500+: "Something went wrong. Try again in a moment."

3. **Modified** `frontend/src/pages/PrayerDetail.tsx:197`:
   - Pass `onReport` callback that calls `reportsApi.reportPost(prayerId, reason, details)`
   - On success: keep the dialog's existing 1.5s "Report submitted. Thank you for keeping this safe." UX
   - On failure: dialog stays open; toast shows the friendly message; user can retry or cancel
   - Hide the Report button if `prayer.userId === currentUser?.id` (Watch-For #18)

**D15 — Comment reports: backend ships, frontend defers.**
Per MPD-3, `POST /api/v1/comments/{commentId}/reports` ships fully (controller, service, tests, OpenAPI) but no frontend UI consumes it. Add a followup entry to `_plans/post-1.10-followups.md`:

```
## NN. Comment-report UI — backend endpoint shipped in 3.8, no UI surface

POST /api/v1/comments/{commentId}/reports is fully implemented and tested
in Spec 3.8. No frontend consumer exists today (CommentItem has no flag
icon, no ReportCommentDialog component). A future spec adds the UI.

Likely homes:
- Phase 4 polish spec adding overflow menu to CommentItem
- Phase 10 moderation queue spec (when the queue UI surfaces "report this
  comment from the queue context" flows)

Captured: 2026-04-30 during Spec 3.8 brief authoring.
Revisit: when comment-engagement polish is on the queue.
```

## Watch-fors (22 items)

1. **Self-report prevention is service-layer AND UI-layer.** Service rejects 400; UI hides the Report button on own posts. Both required (UI hides for UX; service rejects for defense-in-depth).

2. **`details` content NEVER logged.** Audit every log statement in `ReportService` and `ReportExceptionHandler` to confirm. Log only: `reporterId, targetType, targetId, reason, status, requestId`. Never the textarea content.

3. **Rate limit is shared across post-reports and comment-reports endpoints.** A malicious actor alternating targets must NOT get 2x the bucket. Single `Bucket bucket = userBuckets.get(userId, ...)` consumed by both code paths.

4. **Rate-limit retry-after units: SECONDS, not millis.** `ReportsRateLimitException.getRetryAfterSeconds()`. Header value: `String.valueOf(retryAfterSec)`. Mirror `BookmarksRateLimitException` exactly.

5. **Idempotent dedup: only `pending` status.** Closed reports (reviewed/dismissed/actioned) allow re-reporting. Test cases must cover: (a) pending → returns existing ID with `created: false`; (b) dismissed → creates new pending report with `created: true`; (c) reviewed → same as dismissed; (d) actioned → same.

6. **Pessimistic lock window.** `findPendingByReporterAndPostForUpdate` holds a row lock for the duration of the transaction. Service must complete in <100ms to avoid lock contention. Don't do anything slow inside the `@Transactional` method (no external API calls, no email sends).

7. **XOR target enforced by DB constraint.** Service must NOT set both `post_id` and `comment_id` on the same row. Branch on `targetType` parameter; set exactly one. CHECK constraint will reject if both are set, but service should never ship that bad request — fail at the service layer with a clear exception.

8. **Crisis-flagged posts ARE reportable.** Per D9. Test: create a post, set `crisis_flag=true`, verify report endpoint accepts the report (does NOT 404).

9. **Soft-deleted posts ARE reportable.** Per D9. Soft-delete = `deleted_at IS NOT NULL` or similar (recon at plan-time to confirm posts soft-delete column). Test: soft-delete a post, attempt to report it, verify accepted.

10. **Hard-deleted posts cascade-delete reports.** `post_reports.post_id` FK is `ON DELETE CASCADE`. If a post is hard-deleted (rare), its reports vanish. This is correct behavior — moderators won't action reports against content that no longer exists.

11. **Reporter account deletion cascades reports.** `post_reports.reporter_id` FK is `ON DELETE CASCADE`. If a user deletes their account, their reports vanish. Acceptable trade-off (deletion-honoring).

12. **Reviewer account deletion preserves the audit trail via SET NULL.** Already shipped in changeset 020. `reviewer_id IS NULL, reviewed_at IS NOT NULL` is a valid state for closed reports. No new code needs to handle this — the schema does.

13. **Anonymous users cannot reach the endpoint.** SecurityConfig rule blocks. Test: unauthenticated POST returns 401, NOT a different code, NOT silently dropped.

14. **`ReportReason` enum on Java side must match the TypeScript type EXACTLY (case-sensitive).** Backend uses `SPAM, HARASSMENT, HATE, SELF_HARM, SEXUAL, OTHER` (Java enum convention: SCREAMING_SNAKE_CASE). Frontend uses `'spam' | 'harassment' | 'hate' | 'self_harm' | 'sexual' | 'other'`. Jackson serializes Java enums as their name() by default — mismatch. Two options:

    **Option A (preferred):** Add `@JsonProperty("spam")` etc. to each enum value, OR configure the `ObjectMapper` with `JsonNamingStrategy.LOWER_CASE`. OpenAPI spec lists lowercase values.

    **Option B:** Change Java enum to lowercase strings via `@JsonValue`. Less idiomatic but works.

    Recommend Option A. Plan-time decision.

15. **Validation: `reason` is required, `details` is optional and max 500 chars.** `@NotNull` on reason field, `@Size(max = 500)` on details. Both via Jakarta Bean Validation. Validation errors surface via `PostValidationExceptionHandler` — already shipped (Spec 3.5).

16. **Report Idempotency-Key header is NOT used.** Unlike post creation (Spec 3.5) and comment creation (Spec 3.6), reports don't need an Idempotency-Key. The dedup-on-pending policy (D4) provides idempotent semantics naturally — same user reporting same content twice gets the same report ID back.

17. **OpenAPI yaml extension (Universal Rule 4).** Add to `backend/src/main/resources/openapi.yaml`:
    - `paths./posts/{postId}/reports.post`
    - `paths./comments/{commentId}/reports.post`
    - `components.schemas.CreateReportRequest`
    - `components.schemas.CreateReportResponse`
    - `components.schemas.ReportReason` (enum)
    - 401, 404, 429 response references for both endpoints

18. **Hide Report button on user's own posts/comments.** UI watch-for. `ReportDialog` is currently rendered unconditionally in `PrayerDetail`. Add `{prayer.userId !== currentUser?.id && <ReportDialog .../>}` (or equivalent). Comment-side does not exist yet (D15) but the rule should be documented for the future spec.

19. **AuthModal trigger when anonymous.** `ReportDialog`'s click handler checks `useAuth().isAuthenticated`. If false: `authModal.openAuthModal()` and return. If true: open the dialog. Mirror existing patterns in `InlineComposer` and `InteractionBar`.

20. **Toast copy passes the pastor's-wife test.** All 5 toast messages (rate limit, 401, 404, 500, generic). Sentence case + period, no exclamation, no urgency framing. Examples in D14.

21. **The successful-submission UX preserves the existing 1.5s "Thank you" message.** Don't replace with a toast. The existing inline confirmation feels more careful and intentional than a transient toast — important for a moderation action. Toast is reserved for FAILURE cases.

22. **`@Transactional(readOnly = true)` on the service class, override on `report()` method.** Mirror `BookmarkWriteService` shape. Read-only by default avoids accidental writes; the one method that actually inserts gets explicit `@Transactional` override.

## Test specifications (target ~28 tests, master plan AC says ≥10)

The master plan says ≥10. The brief argues 28+ for thorough coverage of the idempotency + rate-limit + visibility rule combinations.

**`ReportControllerTest` — extends AbstractIntegrationTest (~16 tests):**
- POST post-report: 201 created, response body has reportId
- POST post-report: idempotent on pending (same user, same post, same reason → 200, same reportId)
- POST post-report: idempotent on pending with different reason (still 200, returns existing reportId — first report's reason wins)
- POST post-report: re-report after dismissed → 201 new report
- POST post-report: re-report after actioned → 201 new report
- POST post-report: anonymous → 401
- POST post-report: target post doesn't exist → 404
- POST post-report: crisis-flagged post → 201 (accepted per D9)
- POST post-report: soft-deleted post → 201 (accepted per D9)
- POST post-report: own post → 400 SELF_REPORT
- POST post-report: rate limit exceeded → 429 with Retry-After header
- POST post-report: invalid reason enum → 400
- POST post-report: details too long (501 chars) → 400
- POST comment-report: 201 created, response body has reportId
- POST comment-report: target comment doesn't exist → 404
- POST comment-report: shared rate limit with post-reports (8 post-reports + 3 comment-reports → 11th is 429)

**`ReportServiceTest` — extends AbstractIntegrationTest (~6 tests):**
- service-level idempotency: pending report returned, no new row inserted
- service-level idempotency on closed: new row inserted
- pessimistic lock prevents concurrent duplicate inserts (parallel calls → exactly one row, not two)
- self-report rejection at service layer (defense-in-depth)
- XOR target: post_id set when targetType=POST, comment_id NULL
- XOR target: comment_id set when targetType=COMMENT, post_id NULL

**`ReportsRateLimitServiceTest` — plain JUnit5 (~4 tests):**
- bucket allows 10 consumes within an hour
- 11th consume throws ReportsRateLimitException
- different users have independent buckets
- bucket cache size respected (oldest-evicted-first)

**`ReportReasonConverterTest` — plain JUnit5 (~2 tests):**
- enum → DB value (lowercase string)
- DB value → enum (case-insensitive)

## Files to create

```
backend/src/main/java/com/worshiproom/post/report/
  ReportController.java
  ReportService.java
  Report.java
  ReportRepository.java
  ReportReason.java
  ReportReasonConverter.java
  ReportStatus.java                     # enum mirroring DB CHECK
  ReportStatusConverter.java
  ReportException.java
  ReportTargetNotFoundException.java
  ReportsRateLimitConfig.java
  ReportsRateLimitService.java
  ReportsRateLimitException.java
  SelfReportException.java
  ReportExceptionHandler.java
  dto/
    CreateReportRequest.java
    CreateReportResponse.java
    ReportData.java                     # inner data type returned in response

backend/src/test/java/com/worshiproom/post/report/
  ReportControllerTest.java
  ReportServiceTest.java
  ReportsRateLimitServiceTest.java
  ReportReasonConverterTest.java

frontend/src/services/api/
  reports-api.ts

frontend/src/services/api/__tests__/
  reports-api.test.ts                   # MSW-backed
```

## Files to modify

```
backend/src/main/resources/application.properties      # add worshiproom.reports.rate-limit.* defaults
backend/src/main/resources/openapi.yaml                # add 2 new endpoints + DTOs + ReportReason enum
backend/src/main/java/com/worshiproom/auth/SecurityConfig.java  # add 2 .authenticated() rules BEFORE OPTIONAL_AUTH_PATTERNS

frontend/src/components/prayer-wall/ReportDialog.tsx   # add reason picker, repurpose textarea as details, wire onReport, AuthModal gate, error toasts
frontend/src/components/prayer-wall/__tests__/ReportDialog.test.tsx  # extend with reason-picker tests, AuthModal-gate test, error-handling tests
frontend/src/pages/PrayerDetail.tsx                    # pass onReport callback; hide button on own posts
frontend/src/pages/__tests__/PrayerDetail.test.tsx     # extend with own-post-hides-report test (if applicable)

_plans/post-1.10-followups.md                          # add comment-report-UI followup entry per D15
```

## Files explicitly NOT modified

- `backend/src/main/resources/db/changelog/*.xml` — schema is fully shipped (changesets 018 + 020). NO new changeset.
- `backend/src/main/java/com/worshiproom/activity/constants/ActivityType.java` — reports do not fire activity events (D7)
- `backend/src/main/java/com/worshiproom/activity/constants/PointValues.java` — reports do not award faith points (D7)
- `frontend/src/components/prayer-wall/CommentItem.tsx` — no comment-report UI in this spec (D15, deferred)
- `frontend/src/components/prayer-wall/PrayerCard.tsx` — Report button stays in PrayerDetail only (existing convention)

## Acceptance criteria

Master plan body's 5 AC items + brief additions (23 total):

- [ ] `POST /api/v1/posts/{id}/reports` creates a row in `post_reports` with `post_id` set, `comment_id` null, `status='pending'`
- [ ] `POST /api/v1/comments/{id}/reports` creates a row with `comment_id` set, `post_id` null, `status='pending'`
- [ ] Idempotent on pending: duplicate report from same user for same target with status='pending' returns 200 with the existing reportId (not 201)
- [ ] Re-report after closed (reviewed/dismissed/actioned) creates a new pending row (201)
- [ ] Rate limit: 10 reports per hour per user, SHARED across both endpoints
- [ ] 429 response includes `Retry-After` header in seconds
- [ ] Anonymous request returns 401, not silently dropped
- [ ] Self-report (reporter_id == author_id) returns 400 SELF_REPORT
- [ ] Crisis-flagged posts ARE reportable (D9)
- [ ] Soft-deleted posts ARE reportable (D9)
- [ ] Non-existent target returns 404 ReportTargetNotFoundException
- [ ] `details` field max 500 chars; 501-char submission returns 400
- [ ] Reason enum validated; invalid value returns 400
- [ ] No activity events fired (verify activity_log table unchanged after report)
- [ ] No faith points awarded (verify faith_points table unchanged)
- [ ] No `last_activity_at` bump (verify post unchanged)
- [ ] Frontend `ReportDialog` adds reason picker; existing freeform textarea repurposed as `details`
- [ ] Frontend gates Report button when anonymous (AuthModal trigger)
- [ ] Frontend hides Report button on user's own posts
- [ ] OpenAPI spec extended with both endpoints + DTOs + ReportReason enum (Universal Rule 4)
- [ ] `ReportExceptionHandler` is `@RestControllerAdvice(basePackages = "com.worshiproom.post")` per Phase 3 Addendum #6 + R4 reasoning
- [ ] All toast copy passes the pastor's-wife test (no exclamation, sentence case + period, no urgency framing)
- [ ] At least 28 tests across backend and frontend (master plan says ≥10; brief argues for thorough coverage)

## Out of scope (deferred to other specs)

- Frontend comment-report UI (D15, deferred — followup entry in `_plans/post-1.10-followups.md`)
- Moderator queue UI for triaging reports (Phase 10 — Spec 10.7 Peer Moderator Queue)
- "Report this report" or "this report was vexatious" admin actions (Phase 10)
- Notifications to reporter when their report is actioned (Phase 15 SMTP-blocked)
- Notifications to reported user about moderation outcomes (Phase 15)
- ML-driven auto-triage of reports (out of MVP scope)
- "Block this user from reporting me" feature (Phase 10)
- Aggregate report counters on `posts` table (`report_count` column for moderator filtering) — could be a Phase 10 followup; not needed for the write-side
- Activity tracking of report submissions for analytics (out of scope; reports are safety, not engagement)

## Brand voice / Universal Rules quick reference (3.8-relevant)

- Rule 4: OpenAPI extended for 2 new endpoints
- Rule 6: All new code has tests
- Rule 11: Brand voice — pastor's-wife test on the 5 toast strings + the dialog header copy
- Rule 12: Anti-pressure design — no urgency in error messages even for the rate-limit case
- Rule 14: Plain text only in `details` field (no markdown rendering on moderator side either; Phase 10 plays plain text)
- Rule 15: Rate limiting on both endpoints (shared bucket per D6)
- Rule 16: Respect existing patterns — sub-package layout, domain-scoped advice, Caffeine bucket pattern, constructor injection, `@ConfigurationProperties`

## Tier rationale

xHigh, not MAX. The dimensions:
1. **No novel patterns** — bookmarks (Spec 3.7) and comments (Spec 3.6) are direct templates. Service shape, rate-limit, exception handler scoping, OpenAPI, frontend wiring all follow established conventions.
2. **No cross-author leakage surface** — reports are purely additive writes; there's no read endpoint shipping in this spec that could leak one user's reports to another.
3. **No privilege escalation** — `.authenticated()` is enforced; self-report is rejected; reporter_id always equals principal.userId(). Standard auth pattern.
4. **No data correctness over time** — idempotency is dedup-on-pending; closed reports allow re-reporting (deliberate per D4). Worst case of a bug: duplicate pending row (one extra moderator-queue entry, recoverable).
5. **Recoverable failure modes** — bug → moderator sees an extra row, or misses a row. Neither is unrecoverable; manual SQL fixes are trivial in pre-launch.

The brief's 22 watch-fors + 28-test target + explicit decisions provide the structured reasoning. xHigh thinking + comprehensive brief outperforms MAX thinking + thin brief for this kind of pattern-application spec.

## Recommended planner instruction

When invoking `/plan-forums spec-3-8`, run the Plan Tightening Audit with extra scrutiny on:
- Lens 5 (SecurityConfig rule ordering) — both new rules MUST be placed BEFORE `OPTIONAL_AUTH_PATTERNS.permitAll()` per Phase 3 Addendum #4
- Lens 6 (validation surface) — `@NotNull reason`, `@Size(max=500) details`, enum value validation
- Lens 7 (Pattern A clarification) — N/A, no reactive store
- Lens 9 (Caffeine bucket eviction window) — verify `expireAfterAccess(2h)` matches the BookmarksRateLimitService precedent (eviction window 2x refill window)
- Lens 14 (D9 visibility rule departure) — verify the report endpoint does NOT use `PostSpecifications.visibleTo()` for target lookup; uses `findById` directly. This is a deliberate Phase 3 Addendum #7 exception.
- Lens 15 (no activity / no faith-points / no last_activity_at bump) — verify three NEGATIVE assertions in tests
