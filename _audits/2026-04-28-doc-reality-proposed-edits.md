# Documentation Reality — Proposed Edits (Pass 2)

**Generated:** 2026-04-28
**Branch:** `forums-wave-continued`
**Scope:** Eric's approved Tier 1 + Tier 2 + Tier 3 grouped scope from the Pass 1 review.
**Status:** Proposals only — nothing applied yet. Pass 3 will apply.

---

## Surprise verification finding

While verifying Eric's two prerequisites (G14 INTERCESSION + G13 Block):

- **INTERCESSION ✅** — `frontend/src/constants/dashboard/activity-points.ts` has it. 13 types confirmed.
- **Spec 2.5.6 Block User — NOT shipped despite tracker ✅.** Backend has no `/block/` directory, no `UserBlock*` Java code, no `user_blocks` Liquibase changeset. Pass 1's rules-drift agent only checked `user_mutes` (which DID ship). This is a **4th false-✅** in addition to 3.8/1.10f/1.10m. **Edit E2-d below adds the tracker correction; flag for Eric's review at the top of Pass 3.**

---

## How to read this file

Each edit is a self-contained block:

```
ID: <stable identifier>
File: <absolute path>
Drift: <one-sentence summary>
Severity: High | Medium | Low
Current text: <exact quote from current file>
Proposed text: <exact replacement>
Reason: <one-sentence justification>
```

Edits are grouped by target file. Within each group, ordering follows file line order so Eric can scan top-to-bottom while reviewing.

---

## Group A — Master plan body (`_forums_master_plan/round3-master-plan.md`)

### A1: Add Phase 3 Execution Reality Addendum (NEW SECTION)

**File:** `_forums_master_plan/round3-master-plan.md`
**Drift:** Phase 3 has no execution reality addendum despite Specs 3.1–3.7 establishing 12 cross-spec conventions that Phase 3.8+ and Phase 4–16 spec authors will silently re-discover.
**Severity:** High
**Insertion point:** After the Phase 2 Execution Reality Addendum (which ends at the `---` divider currently around line 250) and before the existing `## How to Use This Document` content. Specifically, after the existing Phase 2 Addendum's closing `---` separator.

**Current text (anchor — find this `---` separator immediately before the next `##` heading after the Phase 2 Addendum content):**

The exact insertion location is the line immediately AFTER the `---` that closes the Phase 2 Addendum and BEFORE the next `## ` heading in the doc. (Verify the line by reading lines 245–260; the addendum's content ends, a `---` appears, then content resumes.)

**Proposed text (insert as NEW section between the Phase 2 Addendum's closing `---` and the next `##` heading):**

```markdown
## Phase 3 Execution Reality Addendum (added 2026-04-28)

> **Why this section exists:** Phase 3 (Prayer Wall Backend) is in progress — Specs 3.1–3.7 have shipped. Several of them surfaced cross-spec conventions and schema realities that diverge from older spec body text in this document. This addendum consolidates those for future spec authors so they don't have to re-discover them. Individual spec bodies below may still show pre-execution text; trust THIS section over the older spec text where they disagree.
>
> **Scope:** Phase 3 only (Specs 3.1–3.7 shipped; 3.8–3.12 pending). Phase 1 + Phase 2 findings live in their own addendums above. Phase 4+ specs are unaffected except where called out explicitly.

### 1. EditWindowExpiredException returns 409, not 400

**Pre-execution assumption (Phase 3.6 Addendum body):** `PATCH /api/v1/posts/{id}` and the comment edit endpoint return `400 EDIT_WINDOW_EXPIRED` when content is edited past the 5-minute window.

**Execution reality:** Both `EditWindowExpiredException` (Spec 3.5) and `CommentEditWindowExpiredException` (Spec 3.6) shipped with `HttpStatus.CONFLICT` (409). Reasoning: 409 means "current state of the resource conflicts with the request," which fits an immutable past-window edit better than 400's generic "bad request" framing. Spec 3.5 explicitly rejected 410 (Gone) — the resource still exists, it just isn't mutable.

**Canonical rule for future specs:** Any future spec implementing an edit-window check on user content (posts, comments, reports, profile fields, usernames, testimony updates, etc.) MUST return **`409 CONFLICT`** with code `EDIT_WINDOW_EXPIRED`. Exempt operations (mark-answered, status transitions, moderator actions) bypass the window per Spec 3.5's exempt-operations list.

### 2. L1-cache trap on save → flush → findById

**Symptom:** A repository save followed immediately by `findById` returns the entity from Hibernate's persistence context, NOT a fresh DB read. For columns marked `@Column(insertable=false, updatable=false)` (typical for DB-default audit timestamps), the in-memory entity has `null` for those columns even after the SQL INSERT populates them. DTO mapping then ships the null to the client.

**Bit Spec 3.5 and Spec 3.6:** Both surfaced this on `created_at` / `updated_at` in create-response payloads.

**Canonical fix:** Call `entityManager.refresh(saved)` after `save()` and before DTO mapping when the entity has any DB-default-populated columns the response needs. Add a regression-guard integration test asserting `createdAt`/`updatedAt` are non-null in the create response body.

**Future specs at risk:** Phase 3.8 (Reports Write), Phase 4 (all 5 post-type create endpoints), 6.1 (Prayer Receipt POST), 6.2 (Quick Lift POST), 6.6 (Mark-Answered PATCH), 8.1 (username PATCH), 12.3 (Notification Generators), 13.1 (Insights aggregations).

### 3. `@Modifying(clearAutomatically=true, flushAutomatically=true)` for bulk updates

**Pre-execution assumption:** `@Modifying` alone is sufficient on JPQL bulk UPDATE/DELETE methods.

**Execution reality (Spec 3.7):** Without `clearAutomatically=true`, subsequent reads in the same transaction return stale entities from the persistence context. Without `flushAutomatically=true`, pending in-memory changes don't reach the DB before the bulk update fires. Both flags are required.

**Canonical pattern:** Used 11 times across `PostRepository`, `BookmarkRepository`, `ReactionRepository`. New bulk-update repository methods in Phase 4 (resolve, mark-answered counter resets), 6.4/6.6 (counter resets), 8.1 (username change), 10.4 (trust-level promotions), 10.5/10.6 (escalation status), 10.11 (cascade soft-delete), 12.3 (notification mark-read) MUST use both flags.

### 4. Method-specific SecurityConfig rule ordering

**Pre-execution assumption:** Spring Security rules can appear in any order — `OPTIONAL_AUTH_PATTERNS.permitAll()` covers most paths, method-specific `.authenticated()` rules can be added afterwards.

**Execution reality (Specs 3.5/3.6/3.7):** Spring Security uses first-match-wins. Method-specific rules MUST appear BEFORE `OPTIONAL_AUTH_PATTERNS.permitAll()` or the permissive rule wins and unauthenticated writes silently succeed. Additionally, Spring's `AntPathMatcher` treats `*` as one path segment — `/api/v1/posts/*` does NOT match `/api/v1/posts/*/reactions`. Nested paths require their own explicit rules.

**Future specs at risk:** Phase 3.8 (Reports POST under `/posts/*/reports`), Phase 4 (post-type-specific writes), 6.1/6.2/6.6, 8.1, 8.2 (`GET /users/{username}` — optional auth), 10.7b (POST user reports, GET moderator queue), 10.11 (DELETE account, GET export). Recon for any new write method on a read-public resource MUST verify rule ordering.

### 5. Caffeine-bounded bucket pattern is canonical for any external-input-keyed cache

**Pre-execution context:** Spec 1 Round 2 established `Caffeine.newBuilder().maximumSize(10_000).expireAfterAccess(Duration.ofMinutes(15)).build()` for the rate-limit bucket map and codified the rule in `02-security.md` § BOUNDED EXTERNAL-INPUT CACHES.

**Phase 3 reality (Spec 3.5):** `PostsRateLimitConfig`, `PostsIdempotencyService`, and the per-domain rate-limit configs followed this pattern exactly. Profile-aware via `@ConfigurationProperties(prefix = "worshiproom.{feature}")` reading from `application-{profile}.properties`.

**Canonical rule for future specs:** Future specs introducing per-user / per-email / per-IP / per-content-key rate limits or idempotency caches MUST use the Caffeine-bounded pattern. Configuration loaded via `@ConfigurationProperties`, never hardcoded. Future targets: 1.5b (password reset), 1.5e (change-email), 1.5f (account lockout), 6.8 (Verse-Finds-You per-user cooldown), 8.1 (username-change rate limit), 10.7b (user-report rate limit), 10.9 (rate-limit tightening), 10.11 (export rate limit), 16.1 (offline cache), 16.2 (queued posts retries).

### 6. Domain-scoped `@RestControllerAdvice` + unscoped companion advice for filter-raised exceptions

**Established by:** Spec 1 (`RateLimitExceptionHandler` — global, single-exception) + Spec 3.5 (`PostExceptionHandler` — `@RestControllerAdvice(basePackages = "com.worshiproom.post")`).

**Rule:** Each new domain (`com.worshiproom.moderation/`, `com.worshiproom.notification/`, `com.worshiproom.email/`, `com.worshiproom.search/`, etc.) creates its own domain-scoped advice for domain exceptions. Filter-raised exceptions need an unscoped companion advice (single exception type) OR resolver delegation per Spec 1's pattern. Future specs do NOT extend `PostExceptionHandler` for non-post domains.

### 7. `CrisisAlertService` is the single integration point for crisis-flag handling

**Established by:** Spec 3.5 introduced `CrisisAlertService` + `crisis_flag` boolean on `posts`. Spec 3.6 generalized the alert service to `(contentId, authorId, ContentType.POST | ContentType.COMMENT)`.

**Canonical rule:** Any future spec that surfaces, ranks, hides, suppresses, or notifies on user-generated content MUST consult `posts.crisis_flag` and `post_comments.crisis_flag`. The `CrisisAlertService.alert(contentId, authorId, ContentType)` API is the single integration point — Phase 4 testimony/question/discussion/encouragement, Phase 12.5 mention parsing, Phase 13 personal insights aggregations, Phase 15.1b welcome email sequence (suspend on crisis) all extend `ContentType` rather than introducing sibling alert services.

**Deferred upgrades** (do NOT bundle these into per-spec work):
- LLM crisis classifier (Followup #15) — keyword-only today
- SMTP crisis-alert email (Followup #16) — Sentry alert + DB column flag only today
- `@RequireVerifiedEmail` gate (Followup #17) — Phase 4 specs MUST NOT assume this gate exists

### 8. Schema realities: do NOT recreate

These columns / tables ALREADY EXIST from earlier specs. Future specs that describe creating them are stale.

| Schema element | Created by | Future spec that may try to recreate |
|---|---|---|
| `posts.candle_count` | Spec 3.1 changeset 014 | Phase 3.7 Addendum body, Phase 9.5 Candle Mode UI |
| `post_reactions.reaction_type` + CHECK `IN ('praying','candle')` | Spec 3.1 changeset 016 | Phase 6.6 Answered Wall — must ALTER CHECK to add `'praising'`, `'celebrate'`, NOT recreate |
| `posts.{praying,comment,bookmark,report}_count` denormalized counters | Spec 3.1 changeset 014 | Phase 6.6, 8.4 |
| `qotd_questions` table | Spec 3.1 changeset 019 (NOT 3.9) | Spec 3.9 |
| `post_reports.review_consistency` CHECK relaxed | Spec 3.1 changeset 020 | Phase 10.x moderation specs |
| `friend_relationships`, `friend_requests`, `social_interactions`, `milestone_events` | Phase 2.5 changesets 009–012 | Any Phase 6.x/7.x/8.x/12.x/13.x spec |
| `user_mutes` | Spec 2.5.7 changeset 013 | Spec 2.5.6 (Block) — must create separate `user_blocks`, do NOT extend `user_mutes` |

### 9. `INTERCESSION` ActivityType — total is now 13, not 12

Spec 3.6 added `INTERCESSION` (10 points) for users who comment on Prayer Wall posts. Frontend `ACTIVITY_POINTS` and backend `ActivityType` both have 13 entries now. Future specs that add new ActivityType values MUST update both the backend enum AND the frontend constant (Decision 12 drift detection), include `PointValues` entries, drift fixture additions, and `ActivityCount` table consideration.

### 10. `wr_prayer_reactions` shape and migration

**Pre-execution claim (Phase 3.7 Addendum body):** Shape changes from `Record<string, { praying: boolean }>` to `Record<string, { praying: boolean, candle: boolean }>`; needs version bump (Pattern A migration logic).

**Execution reality:** Shape was already `Record<string, { isPraying, isBookmarked }>` since Phase 0.5 — fields are `is*` prefixed. Spec 3.7 added `isCandle`. Migration shipped as additive default-fill on hydrate (no version key required). The `Record<string, { praying, candle }>` framing in the addendum is the abbreviated illustration, NOT the actual field names. See `11-local-storage-keys.md` Prayer Wall row for the canonical shape.

### 11. Liquibase changeset filename convention (today's date, next sequence)

**Established by:** Spec 3.1 Plan Deviation #1.

**Rule:** Master plan body uses `YYYY-MM-DD-NNN-` placeholders illustratively. Real changeset filenames use the execution date and the next available sequence number within that day (must not collide with prior dates). As of 2026-04-28 the latest changeset is `2026-04-27-021`. Recon for future schema specs MUST `ls backend/src/main/resources/db/changelog/` and continue from the latest.

### 12. Reactive store consumer Pattern A/B + BB-45 cross-mount subscription test for new multi-consumer features

**Established by:** Bible wave + `11-local-storage-keys.md` § Reactive Store Consumption (which lives in `11b-local-storage-keys-bible.md`).

**Rule:** Future specs introducing a localStorage-backed feature with multi-component consumers MUST implement as a reactive store (Pattern A standalone hook with `useSyncExternalStore`, OR Pattern B inline `subscribe()`). Acceptance criteria MUST include the BB-45 cross-mount subscription test (consumer renders correctly when store mutates from a different surface). Specs 6.9 (Composer Drafts), 11.3 (Search recent searches), 16.1b (Offline-queued posts) qualify.

---
```

**Reason:** Mirrors Phase 1 + Phase 2 Addendum pattern. Hoists 12 cross-spec conventions established during 3.5/3.6/3.7 so future spec authors get the conventions on first read instead of via cascading code review failures.

---

### A2: Spec 3.9 master plan body — fix QOTD count, package, algorithm

**File:** `_forums_master_plan/round3-master-plan.md`
**Drift:** Spec 3.9 references "60 questions", `com.worshiproom.qotd` package (the entity already lives in `com.worshiproom.post`), and "day-of-year modulo 60" rotation when the frontend is liturgical-season-aware with 72 questions.
**Severity:** High (G7 — about to bite when Spec 3.9 is authored)

**Edit A2-a — fix question count + algorithm in Goal/Approach:**

Current text (line 3858):
```
**Goal:** Move the QOTD rotation logic from frontend constants to the backend. New endpoint `GET /api/v1/qotd/today` returns today's question. Existing 60 questions seeded in 3.2 are the initial dataset.
```

Proposed text:
```
**Goal:** Move the QOTD rotation logic from frontend constants to the backend. New endpoint `GET /api/v1/qotd/today` returns today's question. The existing **72 questions** seeded in 3.2 (60 general + 12 liturgical-seasonal, ids `qotd-1` through `qotd-72`) are the initial dataset.
```

Current text (line 3860):
```
**Approach:** `QotdController` with `GET /api/v1/qotd/today`. Implementation: compute day-of-year, modulo 60, look up by `display_order`, return the question. Caching: return value cached in memory until midnight server time (or 24-hour TTL). Frontend `QuestionOfTheDay.tsx` component updated to fetch from this endpoint instead of reading frontend constants. The frontend constants file is preserved but marked deprecated for offline test fallback.
```

Proposed text:
```
**Approach:** `QotdController` with `GET /api/v1/qotd/today`. Recon must reconcile two constraints: (1) the frontend's `getTodaysQuestion()` (`frontend/src/constants/question-of-the-day.ts:455`) is **liturgical-season-aware** — it filters by `liturgicalSeason === currentSeason.id` and picks via `getDayWithinSeason()`, falling back to general-pool `dayOfYear % 72` when no named season applies; (2) the shipped `qotd_questions` table (Spec 3.1 changeset 019) does NOT have a `liturgical_season` column today. Recon must choose: (a) extend the schema with a `liturgical_season VARCHAR` column + reseed via 3.2-style migration to preserve frontend behavior, or (b) ship modulo-72 only and accept losing seasonal awareness. Caching: return value cached in memory until midnight server time (or 24-hour TTL). Frontend `QuestionOfTheDay.tsx` component updated to fetch from this endpoint. The frontend constants file is preserved but marked deprecated for offline test fallback.
```

**Edit A2-b — fix package location in Files-to-create:**

Current text (lines 3862–3868):
```
**Files to create:**

- `backend/src/main/java/com/worshiproom/qotd/QotdController.java`
- `backend/src/main/java/com/worshiproom/qotd/QotdService.java`
- `backend/src/main/java/com/worshiproom/qotd/QotdQuestionRepository.java`
- `backend/src/main/java/com/worshiproom/qotd/dto/QotdQuestionResponse.java`
- `backend/src/test/java/com/worshiproom/qotd/QotdServiceTest.java`
```

Proposed text:
```
**Files to create:**

- `backend/src/main/java/com/worshiproom/post/QotdController.java`
- `backend/src/main/java/com/worshiproom/post/QotdService.java`
- `backend/src/main/java/com/worshiproom/post/dto/QotdQuestionResponse.java`
- `backend/src/test/java/com/worshiproom/post/QotdServiceTest.java`

**Files already exist (do NOT recreate — created by Spec 3.1 / Spec 3.5):**

- `backend/src/main/java/com/worshiproom/post/QotdQuestion.java` (JPA entity, Spec 3.5)
- `backend/src/main/java/com/worshiproom/post/QotdQuestionRepository.java` (Spec 3.5)
- `backend/src/main/resources/db/changelog/2026-04-27-019-create-qotd-questions-table.xml` (table itself, Spec 3.1)
```

**Edit A2-c — fix Acceptance Criteria modulo:**

Current text (line 3879):
```
- \[ \] Day-of-year modulo 60 produces the same rotation as the existing frontend logic
```

Proposed text:
```
- \[ \] Backend rotation logic matches the frontend's `getTodaysQuestion()` behavior — liturgical-season-aware (when `liturgical_season` column ships) or `dayOfYear % 72` fallback (when it doesn't). Drift-detection test feeds same `Date` to both implementations and asserts identical question id.
```

**Reason:** Three drifts that would all bite at once when Spec 3.9 is authored. Fixing the master plan body now spares the recon step a week from re-discovering each.

---

### A3: Phase 3.7 Addendum — clarify schema is already shipped, fix shape framing

**File:** `_forums_master_plan/round3-master-plan.md`
**Drift:** Phase 3.7 Addendum body implies a NEW Liquibase changeset for `reaction_type` and `candle_count` (both already shipped in Spec 3.1), and uses `{ praying, candle }` field names that don't match the actual `{ isPraying, isBookmarked, isCandle }` shape.
**Severity:** High

Current text (line 3832, the entire Addendum paragraph):
```
The `POST /api/v1/posts/{id}/reactions` endpoint MUST accept `{ reaction_type: 'praying' | 'candle' }` in the request body. The endpoint toggles the row in `post_reactions` matching `(post_id, user_id, reaction_type)`. Sending the same reaction_type a second time removes the row (toggle-off). Sending a different reaction_type adds an additional row (a single user can both pray AND light a candle). The denormalized `posts.praying_count` and a new `posts.candle_count` (added by the same Liquibase changeset that introduces `reaction_type`) update transactionally. Frontend `usePrayerReactions` hook is extended with `toggleCandle(postId)` mirroring the existing `togglePraying(postId)`. Reactive store key `wr_prayer_reactions` value shape changes from `Record<string, { praying: boolean }>` to `Record<string, { praying: boolean, candle: boolean }>` — this is a localStorage migration that needs a version bump (Pattern A migration logic per `.claude/rules/11-local-storage-keys.md`).
```

Proposed text:
```
The `POST /api/v1/posts/{id}/reactions` endpoint MUST accept `{ reaction_type: 'praying' | 'candle' }` in the request body. The endpoint toggles the row in `post_reactions` matching `(post_id, user_id, reaction_type)`. Sending the same reaction_type a second time removes the row (toggle-off). Sending a different reaction_type adds an additional row (a single user can both pray AND light a candle). The denormalized `posts.praying_count` and `posts.candle_count` update transactionally. **`candle_count` and `reaction_type` already exist** — both shipped in Spec 3.1 (changesets 014 and 016 respectively); Spec 3.7 adds zero new schema. Frontend `usePrayerReactions` hook is extended with `toggleCandle(postId)` mirroring the existing `togglePraying(postId)`. Reactive store key `wr_prayer_reactions` is a `Record<string, { isPraying: boolean, isBookmarked: boolean, isCandle: boolean }>`; Spec 3.7 added `isCandle`. The migration shipped as additive default-fill on hydrate (no version key required) — see `11b-local-storage-keys-bible.md` § "Reactive stores across the codebase" for the canonical shape and Pattern A (subscription) consumption via `usePrayerReactions()`.
```

**Reason:** Stops Phase 3.7 + Phase 6.6 spec authors from writing no-op duplicate-table changesets, and fixes the field-name framing so the documented migration matches the actual code.

---

### A4: Phase 3.6 Addendum — fix HTTP status code

**File:** `_forums_master_plan/round3-master-plan.md`
**Drift:** Phase 3.6 Addendum says `400 EDIT_WINDOW_EXPIRED` but the shipped `EditWindowExpiredException` and `CommentEditWindowExpiredException` both use `HttpStatus.CONFLICT` (409).
**Severity:** High

Current text (line 3808, key sentence):
```
After 5 minutes from `created_at`, the comment becomes immutable. `PATCH /api/v1/posts/{post_id}/comments/{comment_id}` returns `400 EDIT_WINDOW_EXPIRED` with response body `{ "code": "EDIT_WINDOW_EXPIRED", "message": "Comments can be edited within 5 minutes of posting.", "edit_window_seconds": 300 }` for late edits.
```

Proposed text:
```
After 5 minutes from `created_at`, the comment becomes immutable. `PATCH /api/v1/posts/{post_id}/comments/{comment_id}` returns `409 CONFLICT` with code `EDIT_WINDOW_EXPIRED` and response body `{ "code": "EDIT_WINDOW_EXPIRED", "message": "Comments can be edited within 5 minutes of posting.", "edit_window_seconds": 300 }` for late edits. (The shipped reality: both `EditWindowExpiredException` and `CommentEditWindowExpiredException` use `HttpStatus.CONFLICT`. See Phase 3 Execution Reality Addendum item 1.)
```

**Reason:** Frontend toast handlers and any future spec that copies the framing get the right status code.

---

### A5: Phase 6.6 Answered Wall — annotate CHECK constraint extension

**File:** `_forums_master_plan/round3-master-plan.md`
**Drift:** Spec 6.6 adds `'praising'` and `'celebrate'` reaction types but doesn't note that the CHECK constraint introduced by Spec 3.1 changeset 016 must be ALTERed (not recreated) — recon could trip on Liquibase.
**Severity:** High

Current text (line 5483):
```
- Backend-wise, these are new `reaction_type` values: `'praising'` and `'celebrate'` alongside the existing `'praying'` and `'candle'`. CHECK constraint extended per Decision 5 pattern. Reaction endpoint from Phase 3.7 Addendum handles all four types transparently.
```

Proposed text:
```
- Backend-wise, these are new `reaction_type` values: `'praising'` and `'celebrate'` alongside the existing `'praying'` and `'candle'`. **CHECK constraint must be ALTERed, not recreated** — Spec 3.1 changeset 016 already created `post_reactions.reaction_type` with `CHECK (reaction_type IN ('praying','candle'))`. The Spec 6.6 Liquibase changeset DROPs the old constraint and ADDs a new one allowing all four values. Do NOT issue a `CREATE TABLE` or attempt to re-add the column — both will fail Liquibase. See Phase 3 Execution Reality Addendum item 8 for the full schema-already-shipped list. Reaction endpoint from Phase 3.7 Addendum handles all four types transparently.
```

**Reason:** Saves Spec 6.6 recon from a Liquibase failure that would only surface at execute time.

---

### A6: Master plan "Pattern A" reference — add (subscription) qualifier

**File:** `_forums_master_plan/round3-master-plan.md`
**Drift:** "Pattern A" appears 8+ times in the master plan referring to the standalone-hook subscription pattern. Without a qualifier, future authors might confuse it with a migration pattern (the Phase 3.7 Addendum text "Pattern A migration logic" already does conflate them).
**Severity:** Medium

Strategy: **Add `(subscription)` qualifier inline at first occurrence in each major section, leaving subsequent occurrences in the same paragraph alone.** Five anchor occurrences need updating:

**Edit A6-a** — line 434 (Architectural Foundation Decisions):

Current text:
```
Convert `usePrayerReactions` from `useState(getMockReactions())` to a reactive store with `useSyncExternalStore` (Pattern A from `.claude/rules/11-local-storage-keys.md`)
```

Proposed text:
```
Convert `usePrayerReactions` from `useState(getMockReactions())` to a reactive store with `useSyncExternalStore` (Pattern A — subscription via standalone hook, per `11b-local-storage-keys-bible.md` § "Reactive Store Consumption")
```

**Edit A6-b** — line 446:

Current text:
```
New stores prefer Pattern A (standalone hook with `useSyncExternalStore`) per `.claude/rules/11-local-storage-keys.md`.
```

Proposed text:
```
New stores prefer Pattern A (subscription — standalone hook with `useSyncExternalStore`) per `11b-local-storage-keys-bible.md` § "Reactive Store Consumption".
```

**Edit A6-c** — line 704:

Current text:
```
Components reading from a reactive store must use the store's hook (`useSyncExternalStore` Pattern A preferred for new code, Pattern B inline subscribe acceptable for legacy compatibility).
```

Proposed text:
```
Components reading from a reactive store must use the store's hook (`useSyncExternalStore` Pattern A — subscription via standalone hook — preferred for new code, Pattern B — inline `subscribe()` — acceptable for legacy compatibility).
```

**Edit A6-d** — line 1094:

Current text:
```
Phase 0.5 ships a single spec that converts `usePrayerReactions` from snapshot-without-subscription to a reactive store using `useSyncExternalStore` (Pattern A).
```

Proposed text:
```
Phase 0.5 ships a single spec that converts `usePrayerReactions` from snapshot-without-subscription to a reactive store using `useSyncExternalStore` (Pattern A — subscription via standalone hook).
```

**Edit A6-e** — line 3832 (Phase 3.7 Addendum) — already covered by Edit A3 above; the rewrite removes the misleading "Pattern A migration logic" framing entirely.

**Reason:** Makes "Pattern A" unambiguous wherever it's introduced. Keeps subsequent within-paragraph references unchanged.

---

## Group B — `.claude/rules/02-security.md`

### B1: Annotate `users.terms_version` / `users.privacy_version` as future

**File:** `/Users/Eric/worship-room/.claude/rules/02-security.md`
**Drift:** Says server stores these columns at registration; Liquibase changeset 001 explicitly excludes them; Spec 1.10f's column-and-endpoint work has not shipped.
**Severity:** High

Current text (line 248):
```
- Server stores `users.terms_version` and `users.privacy_version` at registration
```

Proposed text:
```
- Server stores `users.terms_version` and `users.privacy_version` at registration **(Spec 1.10f future work — columns NOT yet on `users` table; only the canonical legal markdown at `content/{terms-of-service,privacy-policy}.md` has shipped to date)**
```

**Reason:** Tells security-focused readers what's actually enforced today vs. what the spec describes.

---

## Group C — `.claude/rules/03-backend-standards.md`

### C1: Update package structure list (move shipped packages out of "still future")

**File:** `/Users/Eric/worship-room/.claude/rules/03-backend-standards.md`
**Drift:** Says `friends/`, `social/`, `post/`, `mute/`, `safety/` are "Phases 2.5+ — still future"; all already exist on disk.
**Severity:** High

**Edit C1-a — update package tree (lines 168–197):** Add the shipped Phase 2.5 / Phase 3 packages.

Current text (lines 175–179):
```
├── controller/
│   └── ApiController.java               (/api/v1/health, /api/v1/hello — health endpoint reports providers.* status)
├── auth/                                (Phase 1 — Spring Security + JWT: login/register/me endpoints, JwtAuthenticationFilter, LoginRateLimitFilter, BCrypt, anti-enumeration)
├── user/                                (Phase 1 — User entity, UserController, UserService, UserRepository, DisplayNameResolver, PATCH /users/me)
├── activity/                            (Phase 2 — ActivityLog, FaithPoints, Streak, Badge, ActivityCounts; pure-function services + dual-write POST /api/v1/activity + POST /api/v1/activity/backfill)
└── proxy/                               (Key Protection Wave; package renamed in Phase 1 Spec 1.1)
```

Proposed text:
```
├── controller/
│   └── ApiController.java               (/api/v1/health, /api/v1/hello — health endpoint reports providers.* status)
├── auth/                                (Phase 1 — Spring Security + JWT: login/register/me endpoints, JwtAuthenticationFilter, LoginRateLimitFilter, BCrypt, anti-enumeration)
├── user/                                (Phase 1 — User entity, UserController, UserService, UserRepository, DisplayNameResolver, PATCH /users/me)
├── activity/                            (Phase 2 — ActivityLog, FaithPoints, Streak, Badge, ActivityCounts; pure-function services + dual-write POST /api/v1/activity + POST /api/v1/activity/backfill; 13 ActivityType values incl. INTERCESSION added in Spec 3.6)
├── friends/                             (Phase 2.5 — friend_relationships, friend_requests; mutual-model service)
├── social/                              (Phase 2.5 — social_interactions, milestone_events write paths)
├── mute/                                (Spec 2.5.7 — user_mutes, MutesService; asymmetric per-user mute filtering)
├── safety/                              (Phase 3 — CrisisAlertService canonical entry point; ContentType.POST | ContentType.COMMENT)
├── post/                                (Phase 3 — unified posts family: Post + PostComment + PostReaction + PostBookmark, PostController + PostService + write services, PostExceptionHandler package-scoped advice, PostsRateLimitConfig, PostsIdempotencyService, QotdQuestion entity + repository, UserResolverService kebab-case shim)
└── proxy/                               (Key Protection Wave; package renamed in Phase 1 Spec 1.1)
```

**Edit C1-b — replace "still future" forward-looking note (line 205):**

Current text:
```
**Forums Wave package additions (Phases 2.5+ — still future):** Phase 2.5 will add `com.worshiproom.friends/` and `com.worshiproom.social/` (the latter for `social_interactions` and `milestone_events` write paths). Phase 3 will add `com.worshiproom.post/` (unified `posts` family). Phase 10 will add `com.worshiproom.moderation/`. Phase 12 will add `com.worshiproom.notification/`. Phase 15 will add `com.worshiproom.email/`. Do not create those packages preemptively — each phase's specs own them.
```

Proposed text:
```
**Forums Wave package additions:** Phase 2.5 ✅ shipped `com.worshiproom.friends/`, `com.worshiproom.social/`, and `com.worshiproom.mute/` (Spec 2.5.7). Phase 3 ✅ shipped `com.worshiproom.post/` (unified `posts` family) and `com.worshiproom.safety/` (CrisisAlertService — the canonical entry point for crisis-flag handling per Spec 3.5/3.6). **Still future:** Phase 10 will add `com.worshiproom.moderation/` (Spec 10.10 admin foundation, 10.7 peer moderator queue). Phase 12 will add `com.worshiproom.notification/`. Phase 15 will add `com.worshiproom.email/` (SMTP-blocked until domain purchase per `_plans/post-1.10-followups.md`). **Spec 2.5.6 (Block User) is NOT yet shipped despite older tracker text** — `com.worshiproom.block/` does not exist; Block reuses the Mute pattern when it ships. Do not create future packages preemptively — each phase's specs own them.
```

**Reason:** A reader scanning the package list now sees what exists and what doesn't — and where to find shipped Phase 3 infrastructure like `safety/` and `post/`.

---

### C2: Add `@Modifying` flags + L1-cache trap as Repository Conventions sub-bullets

**File:** `/Users/Eric/worship-room/.claude/rules/03-backend-standards.md`
**Drift:** Two load-bearing JPA conventions (used 11 times across 4 repos in Phase 3) are documented only in spec bodies and an inline code comment.
**Severity:** High

Current text (lines 231–235):
```
### Repository Conventions
- Extend `JpaRepository<Entity, UUID>`
- Custom queries via `@Query` with JPQL (prefer JPQL over native SQL unless performance-critical)
- Method naming: `findAllByUserIdOrderByCreatedAtDesc(UUID userId)`
- Pageable support: `Page<Entity> findAllByUserId(UUID userId, Pageable pageable)`
```

Proposed text:
```
### Repository Conventions
- Extend `JpaRepository<Entity, UUID>`
- Custom queries via `@Query` with JPQL (prefer JPQL over native SQL unless performance-critical)
- Method naming: `findAllByUserIdOrderByCreatedAtDesc(UUID userId)`
- Pageable support: `Page<Entity> findAllByUserId(UUID userId, Pageable pageable)`
- **Bulk UPDATE/DELETE methods MUST use `@Modifying(clearAutomatically = true, flushAutomatically = true)`.** Without `clearAutomatically`, subsequent reads in the same transaction return stale entities from Hibernate's persistence context. Without `flushAutomatically`, pending in-memory changes don't reach the DB before the bulk update fires. Convention established in Spec 3.7; used 11 times across `PostRepository`, `BookmarkRepository`, `ReactionRepository`. `/code-review` MUST flag any new `@Modifying` annotation missing either flag.
- **L1-cache trap on save → flush → findById.** A repository `save()` followed immediately by `findById()` returns the entity from the persistence context, NOT a fresh DB read. For columns marked `@Column(insertable=false, updatable=false)` (typical for DB-default audit timestamps like `created_at`/`updated_at`), the in-memory entity has `null` for those columns even after the SQL INSERT populates them. **Canonical fix:** call `entityManager.refresh(saved)` after `save()` and before DTO mapping. **Test guard:** any create-endpoint integration test that asserts a non-null timestamp in the response body catches this regression. Surfaced by Spec 3.5 + Spec 3.6 plan deviations; `ReactionWriteService.java:102` carries an explanatory comment.
```

**Reason:** Two real correctness traps now have first-class documentation instead of being tribal knowledge from Phase 3.

---

### C3: Add SecurityConfig method-specific rule ordering convention

**File:** `/Users/Eric/worship-room/.claude/rules/03-backend-standards.md`
**Drift:** Load-bearing convention (used by Specs 3.5/3.6/3.7 and required for any future write endpoint on a read-public resource) not documented anywhere.
**Severity:** High

**Insertion point:** New section IMMEDIATELY AFTER the existing "`@RestControllerAdvice` Scoping (MANDATORY pattern)" block ends. Find the line where that section ends (it concludes with "DO NOT add `basePackages` to an advice that must catch filter-raised exceptions — it will silently fail in production.") and insert the new section between it and the next `### ` heading.

**Proposed text (NEW SECTION):**

```markdown
### SecurityConfig rule ordering (MANDATORY pattern)

Spring Security uses **first-match-wins** when evaluating `requestMatchers` rules. Method-specific `.authenticated()` rules MUST appear BEFORE permissive rules like `OPTIONAL_AUTH_PATTERNS.permitAll()` — otherwise the permissive rule wins and unauthenticated writes silently succeed.

Additionally, Spring's `AntPathMatcher` treats `*` as a single path segment. `/api/v1/posts/*` does NOT match `/api/v1/posts/*/reactions`. Nested paths require their own explicit rules.

**Pattern (canonical from Specs 3.5/3.6/3.7 `SecurityConfig.java`):**

```java
http.authorizeHttpRequests(auth -> auth
    // Method-specific rules FIRST — first-match-wins
    .requestMatchers(POST, "/api/v1/posts").authenticated()
    .requestMatchers(PATCH, "/api/v1/posts/*").authenticated()
    .requestMatchers(DELETE, "/api/v1/posts/*").authenticated()
    .requestMatchers(POST, "/api/v1/posts/*/reactions").authenticated()  // Nested path needs its own rule
    .requestMatchers(DELETE, "/api/v1/posts/*/reactions").authenticated()
    // Permissive rules LAST
    .requestMatchers(OPTIONAL_AUTH_PATTERNS).permitAll()
    .anyRequest().authenticated()
);
```

**`/code-review` MUST flag** any new `.authenticated()` rule that appears AFTER `permitAll()`, OR any nested path that depends on a parent rule's `*` to match. Phase 4 post-type writes, 6.1/6.2/6.6 hero-feature writes, 8.1 username PATCH, 10.7b user reports, 10.11 account deletion all need explicit method-specific rules ordered above the permissive set.

```

**Reason:** Without this rule documented, future spec authors silently introduce auth regressions.

---

### C4: Annotate BOUNDED EXTERNAL-INPUT CACHES with Phase 3 examples

**File:** `/Users/Eric/worship-room/.claude/rules/02-security.md`
**Drift:** The rule lists "session stores, idempotency keys, request-ID dedupe caches, per-IP circuit breakers" as future cache examples. Phase 3 actually shipped two of them (`PostsRateLimitConfig`, `PostsIdempotencyService`); the rule should cite them as canonical references.
**Severity:** Medium

Current text (line 94):
```
Spec 1 Round 2 caught this on the rate-limit bucket map (`maximumSize(10_000)` + `expireAfterAccess(15m)`, ~1 MB worst case). The same rule applies to every future cache of this shape — session stores, idempotency keys, request-ID dedupe caches, per-IP circuit breakers, and so on. `/code-review` MUST flag any new unbounded map keyed on external input.
```

Proposed text:
```
Spec 1 Round 2 caught this on the rate-limit bucket map (`maximumSize(10_000)` + `expireAfterAccess(15m)`, ~1 MB worst case). The same rule applies to every future cache of this shape — session stores, idempotency keys, request-ID dedupe caches, per-IP circuit breakers, and so on. **Phase 3 canonical references:** `PostsRateLimitConfig` + `PostsRateLimitService` (per-user post-creation buckets), `PostsIdempotencyService` (per-(userId, idempotencyKey) cache, 24h TTL, max 10K entries), `CommentsRateLimitConfig`, `BookmarksRateLimitConfig`, `ReactionsRateLimitConfig`. Future per-feature limits (1.5b password reset, 1.5e change-email, 6.8 Verse-Finds-You, 8.1 username-change, 10.7b user-report, 10.11 export, 16.1 offline cache) MUST follow this pattern, never `ConcurrentHashMap`. Configuration via `@ConfigurationProperties(prefix = "worshiproom.{feature}")` reading `application-{profile}.properties`. `/code-review` MUST flag any new unbounded map keyed on external input.
```

**Reason:** Forward specs need to know which existing classes to model their pattern after instead of reinventing.

---

## Group D — `.claude/rules/05-database.md`

### D1: Annotate `users` row in Canonical Table Registry as future for terms/privacy

**File:** `/Users/Eric/worship-room/.claude/rules/05-database.md`
**Drift:** Lists `terms_version` and `privacy_version` as columns on `users`; Spec 1.10f hasn't shipped them.
**Severity:** High

Current text (line 34):
```
| `users` | Spec 1.3 | Core user accounts (email, password_hash, name, is_admin, timezone, terms_version, privacy_version) |
```

Proposed text:
```
| `users` | Spec 1.3 (+ 1.10f future) | Core user accounts. **Shipped columns** (Spec 1.3 + 1.3b): email, password_hash, name, is_admin, timezone. **Future columns (Spec 1.10f, NOT yet on table):** terms_version, privacy_version. |
```

**Reason:** Quick-reference registry now matches what Liquibase actually shipped.

---

### D2: Fix `qotd_questions` attribution

**File:** `/Users/Eric/worship-room/.claude/rules/05-database.md`
**Drift:** Registry attributes `qotd_questions` to Spec 3.9; actual changeset 019 header says it's from Spec 3.1.
**Severity:** High

Find the row in the Phase 3 — Prayer Wall registry table that reads:

Current text:
```
| `qotd_questions` | Spec 3.9 | Question of the Day (72 rotating questions) |
```

Proposed text:
```
| `qotd_questions` | Spec 3.1 (table) + Spec 3.2 (seed) | Question of the Day (72 rotating questions: 60 general + 12 liturgical). Table created by Spec 3.1 changeset 019; 72 rows seeded by Spec 3.2 changeset 021. Spec 3.9 owns the rotation endpoint, not the schema. |
```

**Reason:** Fixes the most heavily-cited attribution drift in the inventory.

---

## Group E — `_forums_master_plan/spec-tracker.md`

### E1: Fix Spec 3.3 empty row

**File:** `/Users/Eric/worship-room/_forums_master_plan/spec-tracker.md`
**Drift:** Line 95 is `|     |` — an empty row where Spec 3.3 should appear.
**Severity:** High

Current text (lines 93–96):
```
| 51  | 3.1  | Prayer Wall Schema (Liquibase)                 | L    | Medium | ✅     |
| 52  | 3.2  | Mock Data Seed Migration                       | M    | Low    | ✅     |
|     |
| 54  | 3.4  | Comments, Reactions, Bookmarks Read Endpoints  | M    | Low    | ✅     |
```

Proposed text:
```
| 51  | 3.1  | Prayer Wall Schema (Liquibase)                 | L    | Medium | ✅     |
| 52  | 3.2  | Mock Data Seed Migration                       | M    | Low    | ✅     |
| 53  | 3.3  | Posts Read Endpoints                           | L    | Medium | ✅     |
| 54  | 3.4  | Comments, Reactions, Bookmarks Read Endpoints  | M    | Low    | ✅     |
```

**Reason:** Restores the missing tracker entry.

---

### E2: Revert false-✅ entries

**File:** `/Users/Eric/worship-room/_forums_master_plan/spec-tracker.md`
**Drift:** Four specs marked ✅ that have NOT fully shipped (Spec 3.8, 1.10f, 1.10m, AND newly discovered 2.5.6 Block).
**Severity:** High

**Edit E2-a — Spec 1.10f (line 52):**

Current text:
```
| 25  | 1.10f | Terms of Service and Privacy Policy Surfaces   | M    | Med-High | ✅     |
```

Proposed text:
```
| 25  | 1.10f | Terms of Service and Privacy Policy Surfaces   | M    | Med-High | ⬜ ⚠     |
```

Add a note immediately under the Phase 1 table (or in the existing footer, depending on the tracker's note convention) stating:
```
> **1.10f partial-shipped:** Canonical legal markdown at `content/{terms-of-service,privacy-policy,community-guidelines}.md` IS shipped. The `users.terms_version` / `users.privacy_version` columns, registration consent checkbox, `LegalVersionService.java`, `TermsUpdateModal.tsx`, `GET /api/v1/legal/versions`, and `POST /api/v1/users/me/legal/accept` endpoints are NOT yet shipped. Tracker reverted to ⬜ pending the column-and-endpoint work; the legal-content portion remains in `content/`.
```

**Edit E2-b — Spec 1.10m (line 59):**

Current text:
```
| 32  | 1.10m | Community Guidelines Document                  | S    | Low      | ✅     |
```

Proposed text:
```
| 32  | 1.10m | Community Guidelines Document                  | S    | Low      | ⬜ ⚠     |
```

Add a note:
```
> **1.10m partial-shipped:** Markdown at `content/community-guidelines.md` IS shipped. The public `/community-guidelines` route + `CommunityGuidelines` page component referenced in `12-project-reference.md` does NOT yet exist in `frontend/src/`. Tracker reverted to ⬜ pending the page+route work.
```

**Edit E2-c — Spec 3.8 (line 100):**

Current text:
```
| 58  | 3.8  | Reports Write Endpoint                         | M    | Medium | ✅     |
```

Proposed text:
```
| 58  | 3.8  | Reports Write Endpoint                         | M    | Medium | ⬜     |
```

(No partial-shipped annotation needed — nothing has shipped.)

**Edit E2-d — Spec 2.5.6 Block User (line 86) — NEW EDIT BASED ON VERIFICATION:**

Current text:
```
| 49  | 2.5.6  | Block User Feature                                | M    | Medium | ✅     |
```

Proposed text:
```
| 49  | 2.5.6  | Block User Feature                                | M    | Medium | ⬜     |
```

Add a footnote / inline note:
```
> **2.5.6 verification (2026-04-28 Pass 2 audit):** Despite earlier ✅, no `com.worshiproom.block/` package exists, no `UserBlock*` Java code, and no `user_blocks` Liquibase changeset. Spec 2.5.7 Mute (the sibling spec) DID ship — `user_mutes` table at changeset 013, `MutesService`, `useMutes` hook all exist. Block remains unimplemented; revert to ⬜.
```

**Reason:** All four false-✅s. Block is the surprise one — flag explicitly so Eric can confirm before applying.

---

## Group F — `.claude/rules/06-testing.md`

### F1: Reframe Pattern A/B and remove `useEchoStore` ghost reference

**File:** `/Users/Eric/worship-room/.claude/rules/06-testing.md`
**Drift:** "Stores requiring this pattern" lists 7 hooks; only 3 are real Pattern A standalone hooks. `useEchoStore` doesn't exist.
**Severity:** High

Current text (lines 134–150):
```
### Reactive Store Consumer Pattern (BB-45 anti-pattern)

Bible wave reactive stores (`useHighlightStore()`, `useBookmarkStore()`, etc.) require subscription tests — not just initial-render tests. The BB-45 anti-pattern: a component that mirrors the store into local `useState` looks correct initially but breaks when the store mutates from elsewhere.

**Required pattern:** Mutate the store AFTER the component mounts, then assert re-render:
```tsx
test('renders new cards added after mount', async () => {
  render(<MemorizationDeck />);
  expect(screen.queryByText(mockCard.text)).not.toBeInTheDocument();
  act(() => { addCard(mockCard); });
  expect(await screen.findByText(mockCard.text)).toBeInTheDocument();
});
```

**Forbidden:** Mocking the entire store (`vi.mock(...)`) bypasses the subscription mechanism.

**Stores requiring this pattern:** `useHighlightStore`, `useBookmarkStore`, `useNoteStore`, `useJournalStore`, `useChapterVisitStore`, `useMemorizationStore`, `useEchoStore`
```

Proposed text:
```
### Reactive Store Consumer Pattern (BB-45 anti-pattern)

Bible-wave and Phase 0.5 reactive stores require subscription tests — not just initial-render tests. The BB-45 anti-pattern: a component that mirrors the store into local `useState` looks correct initially but breaks when the store mutates from elsewhere.

Two subscription patterns coexist (see `11b-local-storage-keys-bible.md` § "Reactive Store Consumption"):

- **Pattern A (subscription via standalone hook):** `useSyncExternalStore`-based hook file. Real Pattern A hooks: `useMemorizationStore`, `useStreakStore`, `usePrayerReactions`. Consumer simply calls the hook.
- **Pattern B (inline subscription):** No standalone hook file. Consumer wires `useState` + `useEffect` + `subscribe()` itself. Stores: `highlightStore`, `bookmarkStore`, `noteStore`, `journalStore`, `chapterVisitStore`, `plansStore`. Consumer MUST call the store's `subscribe()` function inside a `useEffect`; without that call, the component snapshots on mount and never updates.

**Required pattern (test):** Mutate the store AFTER the component mounts, then assert re-render:
```tsx
test('renders new cards added after mount', async () => {
  render(<MemorizationDeck />);
  expect(screen.queryByText(mockCard.text)).not.toBeInTheDocument();
  act(() => { addCard(mockCard); });
  expect(await screen.findByText(mockCard.text)).toBeInTheDocument();
});
```

**Forbidden:** Mocking the entire store (`vi.mock(...)`) bypasses the subscription mechanism.

**Stores requiring this test pattern:** Pattern A — `useMemorizationStore`, `useStreakStore`, `usePrayerReactions`. Pattern B — `highlightStore`, `bookmarkStore`, `noteStore`, `journalStore`, `chapterVisitStore`, `plansStore` (consumed inline; consumer + store + test all share the responsibility).

**Note on echoes (BB-46):** `useEchoStore` and `wr_echo_dismissals` were considered but deferred — see `11b-local-storage-keys-bible.md` § "Note on BB-46 echoes". The current echo system uses session-scoped state inside `hooks/useEcho.ts` and does not require this test pattern.
```

**Reason:** Stops misleading test authors into looking for hook files that don't exist; clarifies the Pattern A vs B distinction so test patterns line up with subscription patterns.

---

### F2: Update "Reactive Store Consumption" anchor link

**File:** `/Users/Eric/worship-room/.claude/rules/06-testing.md`
**Drift:** Section header in 06 implicitly assumes the canonical Reactive Store Consumption guidance lives in `11`; it actually lives in `11b`. The new F1 text already cites 11b, so no further edit needed in 06 unless other sentences cite 11.

(No additional edit needed beyond F1 — F1 already references `11b-local-storage-keys-bible.md`.)

---

## Group G — `.claude/rules/09-design-system.md`

### G1: Fix store list at line 302 (remove `EchoStore`, fix paths/subscription claims)

**File:** `/Users/Eric/worship-room/.claude/rules/09-design-system.md`
**Drift:** Line 302 lists 7 stores at `lib/<feature>/store.ts` paths "each exposes a custom hook that internally subscribes via `useSyncExternalStore`". (a) No `EchoStore` exists, (b) most stores aren't at `lib/<feature>/store.ts`, (c) most don't use `useSyncExternalStore`.
**Severity:** High

Current text (line 302):
```
- **HighlightStore, BookmarkStore, NoteStore, JournalStore, ChapterVisitStore, MemorizationStore, EchoStore** — Reactive store modules at `frontend/src/lib/<feature>/store.ts`. Each exposes a custom hook that internally subscribes via `useSyncExternalStore`. Components consuming these stores **must use the hook**, never `useState(getAll*())`. See `11-local-storage-keys.md` § "Reactive Store Consumption" for the BB-45 anti-pattern.
```

Proposed text:
```
- **Reactive stores (Bible wave + Phase 0.5):**
  - **Pattern A (subscription via standalone hook, `useSyncExternalStore`):** `useMemorizationStore` (`hooks/bible/useMemorizationStore.ts` over `lib/memorize/store.ts`), `useStreakStore` (`hooks/bible/useStreakStore.ts` over `lib/bible/streakStore.ts`), `usePrayerReactions` (`hooks/usePrayerReactions.ts` over `lib/prayer-wall/reactionsStore.ts`).
  - **Pattern B (inline subscription via `subscribe()` in a `useEffect`):** `highlightStore` (`lib/bible/highlightStore.ts`), `bookmarkStore` (`lib/bible/bookmarkStore.ts`), `noteStore` (`lib/bible/notes/store.ts`), `journalStore` (`lib/bible/journalStore.ts`), `chapterVisitStore` (`lib/heatmap/chapterVisitStore.ts`), `plansStore` (`lib/bible/plansStore.ts`). No standalone hook — consumers wire `useState` + `useEffect` + `subscribe()` themselves.
  - Echo dismissal persistence was deferred — `useEcho` (session-scoped) is the only echo-related hook; `useEchoStore` does NOT exist. See `11b-local-storage-keys-bible.md` § "Note on BB-46 echoes".
  - Components consuming any of these **MUST subscribe** (Pattern A automatic via the hook; Pattern B requires the explicit `subscribe()` call). See `11b-local-storage-keys-bible.md` § "Reactive Store Consumption" for the BB-45 anti-pattern.
```

**Reason:** Replaces a 1-line list of phantom paths and incorrect framing with a Pattern-organised list that matches reality.

---

### G2: Update line 384 anchor reference (11 → 11b)

**File:** `/Users/Eric/worship-room/.claude/rules/09-design-system.md`
**Severity:** Medium

Current text (line 384):
```
Bible-wave stores use two subscription patterns. **Components consuming these stores MUST subscribe** — never call `getAllX()` and store the result in local `useState` without a `subscribe()` call. See `11-local-storage-keys.md` § "Reactive Store Consumption" for the full pattern documentation and the BB-45 anti-pattern.
```

Proposed text:
```
Bible-wave stores use two subscription patterns. **Components consuming these stores MUST subscribe** — never call `getAllX()` and store the result in local `useState` without a `subscribe()` call. See `11b-local-storage-keys-bible.md` § "Reactive Store Consumption" for the full pattern documentation and the BB-45 anti-pattern.
```

---

### G3: Update line 538 anchor reference (11 → 11b)

**File:** `/Users/Eric/worship-room/.claude/rules/09-design-system.md`
**Severity:** Medium

Current text (line 538):
```
Bible-wave personal-layer features use reactive stores instead of plain CRUD services. Two subscription patterns coexist: standalone hooks via `useSyncExternalStore` (memorization, streak) and inline `useState` + `subscribe()` (highlights, bookmarks, notes, journals, chapter visits, plans). Both patterns are correct. **Storing a snapshot in `useState` without calling the store's `subscribe()` function is the BB-45 anti-pattern and ships as a silent correctness bug.** See `11-local-storage-keys.md` § "Reactive Store Consumption" for the full pattern documentation.
```

Proposed text:
```
Bible-wave personal-layer features use reactive stores instead of plain CRUD services. Two subscription patterns coexist: Pattern A (subscription via standalone hook with `useSyncExternalStore` — `useMemorizationStore`, `useStreakStore`, `usePrayerReactions`) and Pattern B (inline `useState` + `useEffect` + `subscribe()` — highlights, bookmarks, notes, journals, chapter visits, plans). Both patterns are correct. **Storing a snapshot in `useState` without calling the store's `subscribe()` function is the BB-45 anti-pattern and ships as a silent correctness bug.** See `11b-local-storage-keys-bible.md` § "Reactive Store Consumption" for the full pattern documentation.
```

---

## Group H — `.claude/rules/10-ux-flows.md`

### H1: Fix MyBible "seven reactive stores" list — remove ghosts, correct hook claims

**File:** `/Users/Eric/worship-room/.claude/rules/10-ux-flows.md`
**Drift:** Names 7 hooks; only `useMemorizationStore` exists as a real hook file. Others are inline-subscription stores. `useEchoStore` doesn't exist at all.
**Severity:** High

Current text (line 616):
```
The page reads from seven reactive stores via hooks: `useChapterVisitStore()`, `useHighlightStore()`, `useBookmarkStore()`, `useNoteStore()`, `useJournalStore()`, `useMemorizationStore()`, and `useEchoStore()`. **Components on this page must use the hooks, never local `useState` mirrors.** See `11-local-storage-keys.md` § "Reactive Store Consumption" for the BB-45 anti-pattern.
```

Proposed text:
```
The page reads from six reactive stores. **Pattern A (subscription via standalone hook):** `useMemorizationStore()`. **Pattern B (inline `subscribe()` in a `useEffect`):** `chapterVisitStore` (heatmap), `highlightStore`, `bookmarkStore`, `noteStore`, `journalStore`. Echo dismissals are session-scoped via `useEcho` — `useEchoStore` does NOT exist (BB-46 dismissal persistence deferred). **Components on this page must subscribe — Pattern A via the hook, Pattern B via an explicit `subscribe()` call inside `useEffect`. Local `useState` mirrors without subscription are the BB-45 anti-pattern.** See `11b-local-storage-keys-bible.md` § "Reactive Store Consumption".
```

---

### H2: Fix Verse Echoes Flow — remove `useEchoStore` and clarify dismissal scope

**File:** `/Users/Eric/worship-room/.claude/rules/10-ux-flows.md`
**Severity:** High

**Edit H2-a — line 748:**

Current text:
```
- **Tap the X (if shown)** → dismisses this specific echo. Dismissed echo IDs persist in `wr_echo_dismissals` via `useEchoStore()`. The selection engine excludes dismissed echoes from future picks.
```

Proposed text:
```
- **Tap the X (if shown)** → dismisses this specific echo for the current session. Dismissed echo IDs are held in a session-scoped `Set<string>` inside `hooks/useEcho.ts` — they reset on page reload. Persistent dismissal across sessions (`wr_echo_dismissals`) was considered but deferred; if needed in the future, it ships as its own spec with a proper reactive store. The selection engine excludes session-dismissed echoes from future picks during the same session.
```

**Edit H2-b — line 763:**

Current text:
```
- Dismissal exclusion (anything in `wr_echo_dismissals` is filtered out)
```

Proposed text:
```
- Dismissal exclusion (anything in the session-scoped `Set` from `useEcho` is filtered out for the current session)
```

**Reason:** Aligns this rule file with reality (matches `11b` "Note on BB-46 echoes").

---

## Group I — `CLAUDE.md` (root)

### I1: Fix Foundation auth claim

**File:** `/Users/Eric/worship-room/CLAUDE.md`
**Drift:** "Authentication (mock/simulated, real JWT in Phase 3)" — real JWT shipped in Phase 1.
**Severity:** High

Current text (line 79):
```
Authentication (mock/simulated, real JWT in Phase 3), React Router, Landing Page, Dashboard with visual garden, Design System (dark theme, frosted glass cards, HorizonGlow on Daily Hub, BB-33 canonical animation tokens), First-Run Welcome (BB-34, never on deep-linked routes).
```

Proposed text:
```
Authentication (real JWT — Spring Security + BCrypt — shipped in Forums Wave Phase 1 Specs 1.4 + 1.5 + 1.9; legacy `wr_auth_simulated` mock kept for transitional test seeding), React Router, Landing Page, Dashboard with visual garden, Design System (dark theme, frosted glass cards, HorizonGlow on Daily Hub, BB-33 canonical animation tokens), First-Run Welcome (BB-34, never on deep-linked routes).
```

**Reason:** Stops the most visibly wrong claim in CLAUDE.md.

---

### I2: Fix Implementation Phases counts and active phase

**File:** `/Users/Eric/worship-room/CLAUDE.md`
**Drift:** "Phase 1 complete: 24/30 specs shipped, 6 deferred"; "Phase 2.5 starting next, 8 specs"; both wrong.
**Severity:** High

Current text (line 155):
```
**Phase 3 — Forums Wave** IN PROGRESS. 156 specs across 19 phases. **Phase 1 (Backend Foundation)** complete: 24/30 specs shipped, 6 deferred (1.5b–g auth lifecycle SMTP-blocked until domain purchase; 1.10c/e/k pending consumer code). **Phase 2 (Activity Engine Migration)** complete: 10/10 specs shipped, dual-write live in dev. **Phase 2.5 (Friends Migration)** starting next, 8 specs. Master plan: `_forums_master_plan/round3-master-plan.md` (v2.9 with **Phase 1 and Phase 2 Execution Reality Addendums** — those addendums are AUTHORITATIVE over older spec body text where they disagree). Pipeline: `/spec-forums` → `/plan-forums` → `/execute-plan-forums` → `/code-review` → `/verify-with-playwright` (skipped for backend-only specs).
```

Proposed text:
```
**Phase 3 — Forums Wave** IN PROGRESS. 156 specs across 19 phases. **Phase 1 (Backend Foundation):** 21/30 shipped, 7 deferred (1.5b–g auth lifecycle SMTP-blocked until domain purchase; 1.10c backup deferred), 2 pending (1.10e Object Storage, 1.10k HikariCP). 2 entries previously marked ✅ have been reverted to ⬜ pending the column-and-endpoint portions of their work (1.10f Terms/Privacy: legal markdown shipped, columns + modal + endpoints pending; 1.10m Community Guidelines: markdown shipped, page + route pending). **Phase 2 (Activity Engine Migration)** complete: 10/10 specs shipped, dual-write live in dev. **Phase 2.5 (Friends Migration)** complete: 7/8 specs shipped (2.5.6 Block reverted to ⬜ after Pass 2 audit found no production code; 2.5.7 Mute IS live). **Phase 3 (Prayer Wall Backend)** IN PROGRESS: 7/12 shipped (3.1–3.7); next is Spec 3.9 (3.8 Reports reverted to ⬜). Master plan: `_forums_master_plan/round3-master-plan.md` (v2.9 with **Phase 1, Phase 2, and Phase 3 Execution Reality Addendums** — addendums are AUTHORITATIVE over older spec body text where they disagree). Pipeline: `/spec-forums` → `/plan-forums` → `/execute-plan-forums` → `/code-review` → `/verify-with-playwright` (skipped for backend-only specs).
```

**Reason:** Single source-of-truth line for new conversations now reflects current state including the four false-✅ corrections.

---

### I3: Fix master plan version inconsistency

**File:** `/Users/Eric/worship-room/CLAUDE.md`
**Drift:** Line 264 says master plan is v2.8; line 155 (and the master plan itself) say v2.9.
**Severity:** Medium

Current text (line 264):
```
- **Master plan is authoritative** — `_forums_master_plan/round3-master-plan.md` (v2.8) contains all 156 specs, 17 Universal Rules, and 17 Decisions. Read the relevant spec section before executing any work.
```

Proposed text:
```
- **Master plan is authoritative** — `_forums_master_plan/round3-master-plan.md` (v2.9 + Phase 1 / Phase 2 / Phase 3 Execution Reality Addendums) contains all 156 specs, 17 Universal Rules, and 17 Decisions. Read the relevant spec section AND the relevant addendum before executing any work — addendums are authoritative over older spec body text where they disagree.
```

---

### I4: Update CLAUDE.md "Reactive Store Consumption" anchor

**File:** `/Users/Eric/worship-room/CLAUDE.md`
**Severity:** Medium

**Edit I4-a — line 68:**

Current text:
```
- **Reactive Store Pattern**: Bible-wave personal-layer features use reactive stores with custom hooks. Components must consume the hook (`useHighlightStore()`, etc.), never local `useState`. See `11-local-storage-keys.md` § "Reactive Store Consumption" for the BB-45 anti-pattern documentation.
```

Proposed text:
```
- **Reactive Store Pattern**: Bible-wave and Phase 0.5 personal-layer features use reactive stores. Real Pattern A (subscription via standalone hook, `useSyncExternalStore`) hooks: `useMemorizationStore`, `useStreakStore`, `usePrayerReactions`. Pattern B (inline `subscribe()` in `useEffect`) stores: `highlightStore`, `bookmarkStore`, `noteStore`, `journalStore`, `chapterVisitStore`, `plansStore` — consumers wire subscription themselves. See `11b-local-storage-keys-bible.md` § "Reactive Store Consumption" for the BB-45 anti-pattern documentation.
```

**Edit I4-b — line 149:**

Current text:
```
**Bible Redesign + Polish Wave (BB-0 through BB-46)** ✅ Merged 2026-04-13. The largest single wave. Rebuilt Bible reader, AI features (BB-30/31/32), PWA (BB-39), SEO (BB-40), web push (BB-41), full-text search (BB-42), heatmap + progress map (BB-43), memorization deck (BB-45), verse echoes (BB-46), audio Bible (BB-26/27/28/29/44). Introduced BB-45 store-consumer anti-pattern (see `11-local-storage-keys.md` § "Reactive Store Consumption"). Final certification at `_plans/recon/bb37b-final-audit.md`.
```

Proposed text:
```
**Bible Redesign + Polish Wave (BB-0 through BB-46)** ✅ Merged 2026-04-13. The largest single wave. Rebuilt Bible reader, AI features (BB-30/31/32), PWA (BB-39), SEO (BB-40), web push (BB-41), full-text search (BB-42), heatmap + progress map (BB-43), memorization deck (BB-45), verse echoes (BB-46), audio Bible (BB-26/27/28/29/44). Introduced BB-45 store-consumer anti-pattern (see `11b-local-storage-keys-bible.md` § "Reactive Store Consumption"). Final certification at `_plans/recon/bb37b-final-audit.md`.
```

---

## Summary table

| Group | Edits | Severity mix | File |
|-------|-------|--------------|------|
| A — Master plan body | 6 | 4 High + 1 Medium + multi-edit composite | `_forums_master_plan/round3-master-plan.md` |
| B — `02-security.md` | 1 | High | `.claude/rules/02-security.md` |
| C — `03-backend-standards.md` | 4 | 3 High + 1 Medium | `.claude/rules/03-backend-standards.md` |
| D — `05-database.md` | 2 | 2 High | `.claude/rules/05-database.md` |
| E — `spec-tracker.md` | 2 | 2 High (4 row corrections within E2) | `_forums_master_plan/spec-tracker.md` |
| F — `06-testing.md` | 1 | High | `.claude/rules/06-testing.md` |
| G — `09-design-system.md` | 3 | 1 High + 2 Medium | `.claude/rules/09-design-system.md` |
| H — `10-ux-flows.md` | 2 | 2 High (E1+H2 with sub-edits) | `.claude/rules/10-ux-flows.md` |
| I — `CLAUDE.md` (root) | 4 | 2 High + 2 Medium | `CLAUDE.md` |

**Total proposed: 25 distinct edits across 9 files (with sub-edits, ~32 individual replacements).**

---

## Out of scope (for the record)

Per Eric's Pass 2 instructions, the following are deliberately NOT in this proposal:

- All Low-severity master plan filename prefix drifts (Liquibase date prefixes, runbook file renames)
- Handoff prompt body (file remains SUPERSEDED)
- Forward-looking G.3 entries (will be fixed opportunistically when forward specs are authored)
- 1.10h/1.10i retro-spec-file creation
- Phase 1.5b–g "ship-ready framing" (deferred until SMTP unblocks)

These items remain documented in the inventory as historical record but are not part of this edit pass.

---

## Awaiting Eric's approval

**Flag for review:** **Edit E2-d (Spec 2.5.6 Block ⬜)** is a verification-time discovery — Eric did not include 2.5.6 in the original false-✅ list. Confirm before applying.

**Once approved**, Pass 3 applies the edits and writes `_audits/2026-04-28-doc-reality-applied.md` with before/after snippets and any chase-down findings discovered while applying.
