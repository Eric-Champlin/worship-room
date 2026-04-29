# Forums Wave: Spec 3.9 — QOTD Backend Migration

**Master Plan Reference:** `_forums_master_plan/round3-master-plan.md` → Spec 3.9 (body at lines 3953-3988)
**ID:** `round3-phase03-spec09-qotd-backend`
**Branch:** `forums-wave-continued` (long-lived; do NOT create a new branch, do NOT checkout, do NOT commit/push)
**Date:** 2026-04-29
**Tier:** xHigh (M/Low — read-only endpoint, low blast radius, recoverable)

---

## Affected Frontend Routes

This spec is **mostly** backend with a thin frontend hydration change in one component (`QuestionOfTheDay.tsx`). The component appears wherever the Prayer Wall surfaces QOTD — primarily on `/prayer-wall` and any prayer-wall sub-page that mounts the QOTD card. `/verify-with-playwright` should be SKIPPED for this spec per the Forums Wave Workflow (the read migration is a behavioural-equivalence change, verified by drift-detection tests rather than visual diff).

The pages where `QuestionOfTheDay.tsx` may render (for any downstream visual sanity check Eric runs manually):

- `/prayer-wall`

---

## STAY ON BRANCH

Same convention as the rest of the wave (established in Spec 3.7). Stay on `forums-wave-continued`. No `git checkout`, `git branch`, `git commit`, `git push`, `git stash`, `git reset`. Eric handles git manually.

---

## Master Plan Divergence

### D0. Ship 3.9 BEFORE 3.8 — Prerequisite ordering inversion

The master plan body lists Spec 3.8 (Reports Write Endpoint) as the prerequisite for Spec 3.9. The two specs are technically independent:

- **3.9** touches `qotd_questions` only (read-side rotation endpoint)
- **3.8** touches `post_reports` only (report-creation write endpoint)

Per the post-Pass-3 spec tracker (`_forums_master_plan/spec-tracker.md` lines 106-108), Spec 3.8 has been reverted from a false-✅ to ⬜ pending its own design pass for report-content moderation (M/Medium risk). Rather than block 3.9 on 3.8, ship 3.9 next: M/Low risk, read-only endpoint, low blast radius, recoverable.

**The planner and executor MUST NOT attempt to verify 3.8 prereq state for this spec.** 3.9's actual data dependencies are:
- The `qotd_questions` table (created by Spec 3.1 changeset 019 ✅)
- The 72 questions seeded for dev (Spec 3.2 changeset 021 ✅)

Both are shipped. 3.9 has no functional dependency on 3.8.

---

## Pre-Execution Recon Findings (Authoritative — verified on disk 2026-04-29)

All recon facts below were verified against `/Users/eric.champlin/worship-room/` immediately before authoring this spec. They are authoritative; the planner and executor must trust this section.

### R1. `QotdQuestion.java` already exists — DO NOT recreate

Located at `backend/src/main/java/com/worshiproom/post/QotdQuestion.java`. Read-only entity with getters only (no setters). 7 fields:

- `id` — `VARCHAR(50)`, NOT UUID (preserves existing `qotd-1` … `qotd-72` ids)
- `text` — `TEXT NOT NULL`
- `theme` — `VARCHAR(30) NOT NULL`
- `hint` — `TEXT` nullable
- `displayOrder` — `int NOT NULL UNIQUE`
- `isActive` — `boolean NOT NULL`
- `createdAt` — `TIMESTAMP WITH TIME ZONE`, `insertable=false, updatable=false`

The Javadoc explicitly anticipates this spec: "Future Spec 3.9 admin endpoints will extend this entity with setters and lifecycle methods." For the read-side endpoint we ship in 3.9, **no setters are needed** — the entity stays read-only.

### R2. `QotdQuestionRepository.java` already exists — extend, do NOT recreate

Located at `backend/src/main/java/com/worshiproom/post/QotdQuestionRepository.java`. Extends `JpaRepository<QotdQuestion, String>`. Currently no custom methods (Spec 3.5 only uses inherited `existsById` for referential integrity). 3.9 will add ONE method (see D8).

### R3. Schema (Spec 3.1 changeset 019) — already shipped, DO NOT recreate

`backend/src/main/resources/db/changelog/2026-04-27-019-create-qotd-questions-table.xml`:

- CHECK constraint: `theme IN ('faith_journey', 'practical', 'reflective', 'encouraging', 'community', 'seasonal')`
- Partial index `idx_qotd_questions_active_order ON qotd_questions (display_order) WHERE is_active = TRUE` — this is the rotation index that D8's repository method will leverage
- **No `liturgical_season` column** on the table — see D1 for why we are NOT adding one

### R4. Dev seed (Spec 3.2 changeset 021) — already shipped, dev-only

`backend/src/main/resources/db/changelog/contexts/2026-04-27-021-prayer-wall-mock-seed.xml` with `context="dev"`. Inserts 72 questions in 6 themes:

- `faith_journey`: `qotd-1`..`qotd-10` (display_order 0..9)
- `practical`: `qotd-11`..`qotd-20` (10..19)
- `reflective`: `qotd-21`..`qotd-30` (20..29)
- `encouraging`: `qotd-31`..`qotd-40` (30..39)
- `community`: `qotd-41`..`qotd-50` (40..49)
- `seasonal`: `qotd-51`..`qotd-72` (50..71) — 10 general + 12 liturgical (3 each: advent / lent / easter / christmas)

**Production has zero rows post-Liquibase** since the only existing seed is dev-context. D5 ships a context-less production seed.

### R5. Frontend rotation logic (`frontend/src/constants/question-of-the-day.ts:454-477`)

```typescript
export function getTodaysQuestion(date: Date = new Date()): QuestionOfTheDay {
  const { currentSeason, isNamedSeason } = getLiturgicalSeason(date)
  if (isNamedSeason) {
    const seasonalQuestions = QUESTION_OF_THE_DAY_POOL.filter(
      (q) => q.liturgicalSeason === currentSeason.id,
    )
    if (seasonalQuestions.length > 0) {
      const dayInSeason = getDayWithinSeason(currentSeason.id, date)
      if (dayInSeason < seasonalQuestions.length) {
        return seasonalQuestions[dayInSeason]
      }
    }
  }
  // Fallback: dayOfYear % POOL.length, where POOL.length = 72
  const year = date.getFullYear()
  const dayOfYear = Math.floor(
    (Date.UTC(year, date.getMonth(), date.getDate()) - Date.UTC(year, 0, 0)) /
      (1000 * 60 * 60 * 24),
  )
  return QUESTION_OF_THE_DAY_POOL[dayOfYear % QUESTION_OF_THE_DAY_POOL.length]
}
```

Note: `dayOfYear` is computed against UTC, 1-indexed (Jan 1 → 1). The backend service must match this UTC convention exactly — see D3.

### R6. `InvalidQotdIdException` already exists — pattern to follow for new QOTD exceptions

Located at `backend/src/main/java/com/worshiproom/post/InvalidQotdIdException.java`. Extends `PostException`. Wired into `PostExceptionHandler` automatically (the handler is a domain-scoped `@RestControllerAdvice` for `com.worshiproom.post`). New QOTD exceptions in 3.9 (specifically `QotdUnavailableException` from D7) follow the same pattern: extend `PostException`, no new `@RestControllerAdvice` needed.

### R7. No Java port of the liturgical calendar exists

`LiturgicalSeason`, `getLiturgicalSeason()`, `getDayWithinSeason()` are frontend-only (TypeScript). Phase 9.1 is dedicated to porting these. This is the load-bearing fact for D1 (defer liturgical-season-awareness).

### R8. Latest Liquibase changeset sequence

`ls backend/src/main/resources/db/changelog/` shows the highest sequence in the main directory is `2026-04-27-020-relax-post-reports-review-consistency.xml`. The dev-context seed `2026-04-27-021-prayer-wall-mock-seed.xml` lives under `contexts/`. Today is 2026-04-29, a new date — the new production seed in D5 takes the first sequence for that date: `2026-04-29-001-seed-qotd-questions-production.xml`.

---

## Goal

Move the QOTD rotation logic from frontend constants to the backend. New endpoint `GET /api/v1/qotd/today` returns today's question. The existing **72 questions** seeded in 3.2 (60 general + 12 liturgical-seasonal, ids `qotd-1` through `qotd-72`) are the initial dataset. The production seed (D5) adds a context-less version of the same 72 rows so production gets the data on first deploy without a manual data load.

Frontend `QuestionOfTheDay.tsx` migrates from local rotation to fetching the endpoint, with the constants file preserved (deprecated) for the offline / API-failure fallback path.

---

## Approach

`QotdController` exposes `GET /api/v1/qotd/today`. `QotdService` computes `today = LocalDate.now(ZoneOffset.UTC)`, looks up the question via `QotdQuestionRepository.findByDisplayOrderAndIsActiveTrue(date.getDayOfYear() % 72)`, and caches the result by `LocalDate` key. The endpoint is `permitAll` (added to `OPTIONAL_AUTH_PATTERNS` in `SecurityConfig`).

**Liturgical-season awareness is DEFERRED to Phase 9.2** (LiturgicalCalendarService Java port). 3.9 ships modulo-72 only and accepts the temporary loss of seasonal selection. See D1 for full reasoning.

A new context-less Liquibase changeset (D5) seeds the 72 production rows idempotently via `INSERT … ON CONFLICT (id) DO NOTHING`, so dev (already seeded by 021) gets a no-op and prod gets a clean seed.

---

## Edge Cases & Decisions

### D1. Liturgical-season-awareness — DEFER to Phase 9.2; ship modulo-72 only

The master plan body punts to recon: option (a) extend the schema with `liturgical_season VARCHAR` + reseed via 3.2-style migration to preserve frontend behavior, or (b) ship `dayOfYear % 72` only and accept losing seasonal awareness.

**Pick (b).** Phase 9.2 is dedicated to the LiturgicalCalendarService Java port — that is where seasonal selection lives. Doing it in 3.9 duplicates that work AND pushes 3.9 from M/Low to L/Medium (schema migration + production reseed). Leave a clean extension point: `QotdService.findTodaysQuestion(LocalDate today)` is the public method; Phase 9.2 can decorate or override it.

**Spec body annotation for the planner:** "Seasonal awareness is a known regression for 3.9 — restored by Phase 9.2 LiturgicalCalendarService."

### D2. Caching — Caffeine keyed by `LocalDate`, NOT 24-hour TTL

A 24-hour TTL set at 11:59pm on day N expires mid-day N+1 — wrong. `LocalDate`-keyed cache is correct: the next request on day N+1 uses a different key, so the cache lookup misses naturally and the new question loads.

**Implementation:** `Cache<LocalDate, QotdQuestion>` from Caffeine, `maximumSize(2)` (today + tomorrow buffer for clock-edge cases). Per **Phase 3 Addendum #5**: configuration via `@ConfigurationProperties(prefix = "worshiproom.qotd")` reading from `application-{profile}.properties`, never `ConcurrentHashMap`. Reference shape: `PostsRateLimitConfig` in `com.worshiproom.post`.

### D3. "Today" is UTC

Match the frontend's UTC-based `dayOfYear` computation (R5). Use `LocalDate.now(ZoneOffset.UTC)` in Java, NOT `LocalDate.now()` (which uses server default zone) or `LocalDate.now(ZoneId.systemDefault())`.

Document in `QotdService` Javadoc: "today" means UTC date. The drift-detection test (per master plan AC) becomes the regression guard.

### D4. Endpoint authorization — `permitAll`, added to `OPTIONAL_AUTH_PATTERNS`

QOTD is non-sensitive content. Add `/api/v1/qotd/today` to `OPTIONAL_AUTH_PATTERNS` in `SecurityConfig`. Per **Phase 3 Addendum #4**: the permissive entry must NOT be placed AFTER any method-specific `.authenticated()` rule (Spring Security is first-match-wins).

**Verification step for the planner / executor:** after the edit, run `grep -nE 'requestMatchers|OPTIONAL_AUTH_PATTERNS' backend/src/main/java/com/worshiproom/auth/SecurityConfig.java` and confirm the new pattern lands in the permissive block. Nested-paths note from Addendum #4 doesn't apply here — `/api/v1/qotd/today` has no children.

### D5. Production seed strategy — NEW context-less changeset with `INSERT … ON CONFLICT (id) DO NOTHING`

The current 72-question seed is gated to `context="dev"`. Production needs an independent seed. Add a NEW changeset at `backend/src/main/resources/db/changelog/2026-04-29-001-seed-qotd-questions-production.xml` (filename per **Phase 3 Addendum #11** — first sequence for new date 2026-04-29; latest non-context changeset is 2026-04-27-020 per R8).

The changeset uses raw `<sql>` with `INSERT … ON CONFLICT (id) DO NOTHING` for idempotency:

```xml
<changeSet id="2026-04-29-001-seed-qotd-questions-production" author="worship-room">
  <sql>
    INSERT INTO qotd_questions (id, text, theme, hint, display_order, is_active)
    VALUES ('qotd-1', 'What Bible verse...', 'faith_journey', 'Think about...', 0, TRUE)
    ON CONFLICT (id) DO NOTHING;
    -- Repeat for qotd-2 through qotd-72 (paste from existing 021 dev seed for content fidelity)
  </sql>
  <rollback>
    DELETE FROM qotd_questions WHERE id LIKE 'qotd-%';
  </rollback>
</changeSet>
```

Runs in all environments (no `context="dev"`). Dev gets a no-op (rows already inserted by 021); test/prod get a clean seed.

**Content source:** copy verbatim from existing 021 dev seed — Liquibase changesets are immutable once shipped, so duplicating content here is the right move (we are versioning the questions at this changeset). Future question additions ship as new changesets.

**Note for the planner:** the dev seed 021 lives at `backend/src/main/resources/db/changelog/contexts/2026-04-27-021-prayer-wall-mock-seed.xml`. Open it during plan-time recon and copy the 72 INSERT rows into the new changeset, swapping the syntax to `INSERT … VALUES (…) ON CONFLICT (id) DO NOTHING` for each row.

### D6. Frontend hydration pattern

`QuestionOfTheDay.tsx` migrates from local `getTodaysQuestion()` to a `useQotdToday()` hook that fetches `GET /api/v1/qotd/today`.

- **Pattern:** SWR-style with skeleton during initial fetch
- **Error fallback:** if API fails, fall back to `getTodaysQuestion()` from constants — preserves offline / degraded-mode behavior
- **Constants file:** mark deprecated (per master plan body) but keep it shipped for the fallback path
- **Loading state:** skeleton matches existing prayer-wall component patterns (see `frontend/src/components/prayer-wall/`). Brand voice: anti-pressure, no exclamation points, no urgency

**This is NOT a dual-write spec.** QOTD has never had write semantics from the frontend. It's a single-direction read migration — there is no `VITE_USE_BACKEND_QOTD` flag, no shadow writes, no cutover spec. The migration ships in this spec end-to-end.

### D7. Empty-pool handling — `404 NOT_FOUND` with code `QOTD_UNAVAILABLE`

If the active question pool is empty (production seed didn't run, or all questions toggled `is_active=false` via future admin tooling), the endpoint returns `404 NOT_FOUND` with code `QOTD_UNAVAILABLE`.

Add a new exception `QotdUnavailableException` extending `PostException` (404), wired into the existing `PostExceptionHandler` automatically since QOTD lives in `com.worshiproom.post`. **Do NOT create a new `@RestControllerAdvice` for QOTD** — Phase 3 Addendum #6 would call that out as over-scoped. R6 establishes the pattern (`InvalidQotdIdException` already does this).

### D8. Repository method

Extend `QotdQuestionRepository` (R2) with one method:

```java
Optional<QotdQuestion> findByDisplayOrderAndIsActiveTrue(int displayOrder);
```

This leverages the existing partial index `idx_qotd_questions_active_order` on `(display_order) WHERE is_active = TRUE` from R3. Service rotation logic:

```java
public QotdQuestion findTodaysQuestion() {
    LocalDate today = LocalDate.now(ZoneOffset.UTC);
    return cache.get(today, this::computeForDate);
}

private QotdQuestion computeForDate(LocalDate date) {
    int displayOrderIndex = date.getDayOfYear() % 72;
    return repo.findByDisplayOrderAndIsActiveTrue(displayOrderIndex)
        .orElseThrow(QotdUnavailableException::new);
}
```

Hardcoded `% 72` matches the master plan AC and the frontend `POOL.length`. Future admin endpoints to toggle `is_active` will need to revisit this (likely move to `% activeCount` with a cached active count), but that's out of scope for 3.9.

---

## Phase 3 Execution Reality Addendum — applicability

The Phase 3 Execution Reality Addendum (`_forums_master_plan/round3-master-plan.md` line 380) is authoritative over older spec body text where they disagree. Per-item applicability for 3.9:

| # | Convention | Applies to 3.9? |
|---|---|---|
| 1 | `EditWindowExpired` returns 409 (not 400) | N/A — read-only endpoint |
| 2 | L1-cache trap (`save → flush → findById`) — call `entityManager.refresh()` | N/A — no save flow |
| 3 | `@Modifying(clearAutomatically=true, flushAutomatically=true)` on bulk updates | N/A — no bulk updates |
| 4 | SecurityConfig method-specific rules ABOVE `OPTIONAL_AUTH_PATTERNS` | **APPLIES** — see D4 |
| 5 | Caffeine-bounded bucket / cache pattern with `@ConfigurationProperties` | **APPLIES** — see D2 |
| 6 | Domain-scoped `@RestControllerAdvice` (don't create new sibling advices) | **APPLIES** — extend existing `PostExceptionHandler`; do NOT create a new advice for QOTD |
| 7 | `CrisisAlertService.alert(contentId, authorId, ContentType)` for user-generated content | N/A — no user-generated content |
| 8 | Schema realities — do NOT recreate already-shipped tables/columns | **APPLIES STRONGLY** — `qotd_questions` table (R3), `QotdQuestion` entity (R1), `QotdQuestionRepository` (R2) all exist |
| 9 | INTERCESSION ActivityType total = 13 | N/A — no activity tracking |
| 10 | `wr_prayer_reactions` shape (Phase 0.5 reactive store) | N/A — no localStorage migration |
| 11 | Liquibase filename = today's date + next sequence | **APPLIES** — see D5 (new prod seed `2026-04-29-001-...`) |
| 12 | BB-45 cross-mount subscription test for reactive stores | N/A — no reactive store |

---

## Files to create

- `backend/src/main/java/com/worshiproom/post/QotdController.java`
- `backend/src/main/java/com/worshiproom/post/QotdService.java`
- `backend/src/main/java/com/worshiproom/post/QotdConfig.java` (or `QotdProperties.java` — `@ConfigurationProperties(prefix = "worshiproom.qotd")` per D2)
- `backend/src/main/java/com/worshiproom/post/QotdUnavailableException.java` (extends `PostException`, 404, code `QOTD_UNAVAILABLE`)
- `backend/src/main/java/com/worshiproom/post/dto/QotdQuestionResponse.java` (record)
- `backend/src/main/resources/db/changelog/2026-04-29-001-seed-qotd-questions-production.xml` (D5)
- `backend/src/test/java/com/worshiproom/post/QotdServiceTest.java`
- `backend/src/test/java/com/worshiproom/post/QotdControllerTest.java`
- `backend/src/test/java/com/worshiproom/post/QotdControllerIntegrationTest.java` (Testcontainers)
- `frontend/src/hooks/useQotdToday.ts` (new hook fetching `GET /api/v1/qotd/today` with constants fallback)
- `frontend/src/lib/api/qotd.ts` (or fold into existing prayer-wall service module — planner decides based on existing structure)

## Files already exist (do NOT recreate — verified on disk 2026-04-29)

- `backend/src/main/java/com/worshiproom/post/QotdQuestion.java` (Spec 3.5; R1)
- `backend/src/main/java/com/worshiproom/post/QotdQuestionRepository.java` (Spec 3.5; R2 — extend with the new method, do NOT recreate)
- `backend/src/main/resources/db/changelog/2026-04-27-019-create-qotd-questions-table.xml` (Spec 3.1; R3 — table itself, do NOT modify)
- `backend/src/main/resources/db/changelog/contexts/2026-04-27-021-prayer-wall-mock-seed.xml` (Spec 3.2; R4 — dev seed, do NOT modify; copy content into the new prod seed)
- `backend/src/main/java/com/worshiproom/post/InvalidQotdIdException.java` (R6 — pattern reference for `QotdUnavailableException`)
- `backend/src/main/java/com/worshiproom/post/PostExceptionHandler.java` (handles all `PostException` subclasses domain-wide; `QotdUnavailableException` will be picked up automatically — see D7)

## Files to modify

- `backend/src/main/java/com/worshiproom/post/QotdQuestionRepository.java` — add `Optional<QotdQuestion> findByDisplayOrderAndIsActiveTrue(int displayOrder)` (D8)
- `backend/src/main/java/com/worshiproom/auth/SecurityConfig.java` — add `/api/v1/qotd/today` to `OPTIONAL_AUTH_PATTERNS` (D4); also update `PublicPaths.OPTIONAL_AUTH_PATTERNS` if the patterns live in a separate constants file
- `backend/src/main/resources/db/changelog/master.xml` — register the new changeset
- `backend/src/main/resources/application-dev.properties` — `worshiproom.qotd.cache.max-size=2` (D2)
- `backend/src/main/resources/application-prod.properties` — same key as dev (D2)
- `backend/src/main/resources/openapi.yaml` — add `GET /api/v1/qotd/today` path with `QotdQuestionResponse` schema and `404 QOTD_UNAVAILABLE` response
- `frontend/src/components/prayer-wall/QuestionOfTheDay.tsx` — replace local `getTodaysQuestion()` call with `useQotdToday()` hook + skeleton + error fallback (D6)
- `frontend/src/constants/question-of-the-day.ts` — add deprecation comment at top of file noting it survives only as the API-failure fallback path (D6)

---

## API contract

### `GET /api/v1/qotd/today`

**Auth:** none (public — D4)
**Rate limit:** none (read-only, no per-feature limit needed; covered by global proxy pattern when one ships for `/api/v1/**`)

**Response 200:**

```json
{
  "data": {
    "id": "qotd-42",
    "text": "What Bible verse has comforted you most recently?",
    "theme": "encouraging",
    "hint": "Think about a moment in the last week when scripture met you where you were."
  },
  "meta": { "requestId": "..." }
}
```

The `displayOrder`, `isActive`, and `createdAt` fields are NOT exposed — they are server-internal rotation metadata.

**Response 404 (empty pool — D7):**

```json
{
  "code": "QOTD_UNAVAILABLE",
  "message": "No question is available right now.",
  "requestId": "...",
  "timestamp": "2026-04-29T10:30:00Z"
}
```

The user-facing message is brand-voiced (anti-pressure, no exclamation, no urgency). The frontend should fall through to the constants-fallback path on 404 just as it does on network errors (D6).

---

## Acceptance criteria

- [ ] `GET /api/v1/qotd/today` returns the same question for the same UTC day across multiple requests
- [ ] Returns a different question on the next UTC day (verified by injecting a different `LocalDate` into the cache)
- [ ] Backend rotation logic matches the frontend's `getTodaysQuestion()` modulo-72 fallback path — drift-detection test feeds the same `Date` to both implementations and asserts identical question id (with the liturgical-season carve-out documented in the test — see Test Specifications below)
- [ ] Caching works (no DB query on the second request within the same UTC day)
- [ ] Cache invalidates naturally on UTC date change (no DB query when the cached `LocalDate` matches the request `LocalDate`; one DB query when the cached date differs)
- [ ] Cache size cap respected (`maximumSize(2)`, evicts oldest entry beyond that)
- [ ] Frontend `QuestionOfTheDay.tsx` reads from API in production
- [ ] Frontend falls back to local `getTodaysQuestion()` constants when API call fails (network error, 404, or any non-200 response)
- [ ] Frontend renders a skeleton during the initial fetch
- [ ] Empty pool returns `404 QOTD_UNAVAILABLE` (verified by integration test that disables all 72 rows, then restores)
- [ ] `GET /api/v1/qotd/today` is publicly accessible (no JWT required) — verified by integration test issuing the request with no `Authorization` header
- [ ] `OPTIONAL_AUTH_PATTERNS` SecurityConfig change passes the verification grep from D4
- [ ] Production seed changeset (D5) inserts 72 rows on first run in a clean DB, no-ops on subsequent runs (idempotent via `ON CONFLICT (id) DO NOTHING`)
- [ ] At least 8 unit/integration tests (master plan AC); target 12-15 (see Test Specifications)
- [ ] `./mvnw test` passes (no regression in existing 720+ baseline; expect ~12-15 net new tests)
- [ ] `pnpm test` passes (no regression in existing 8,811 pass / 11 pre-existing fail baseline; expect 2-4 net new frontend tests for `useQotdToday` hook + `QuestionOfTheDay` component)
- [ ] OpenAPI spec validates (no `redocly lint` errors) and includes the new path

---

## Test Specifications

Master plan AC says "at least 8 unit/integration." Target 12-15 to cover the rotation determinism, drift-detection, date boundary, cache, security, seed, and repository surfaces.

### Backend tests (~10-12)

`QotdServiceTest` (unit, `@ExtendWith(MockitoExtension.class)`):

1. `findTodaysQuestion_returnsRowMatchingDayOfYearModulo72` — given `LocalDate(2026, 4, 29)` (`dayOfYear=119`, `119 % 72 = 47`), repo is called with `47` and the returned question is propagated
2. `findTodaysQuestion_usesUtcNotSystemDefaultZone` — verify the service queries `LocalDate.now(ZoneOffset.UTC)` (mock the clock — see D3 regression guard)
3. `findTodaysQuestion_cacheHitOnSecondCallForSameDay` — call twice with the same date; repo is invoked exactly once
4. `findTodaysQuestion_cacheMissOnNewDay` — call with date N, then date N+1; repo is invoked twice
5. `findTodaysQuestion_emptyPoolThrowsQotdUnavailableException` — repo returns `Optional.empty()` → service throws `QotdUnavailableException`
6. `findTodaysQuestion_cacheRespectsSizeCap` — populate cache with 3 distinct dates, verify the oldest entry was evicted

`QotdControllerTest` (`@WebMvcTest(QotdController.class)` + `@Import(PostExceptionHandler.class)`):

7. `getTodaysQuestion_returns200WithDtoShape` — service returns a question; response body matches the DTO schema (id, text, theme, hint only — no displayOrder, isActive, createdAt)
8. `getTodaysQuestion_emptyPoolReturns404QotdUnavailable` — service throws `QotdUnavailableException`; response is `404` with code `QOTD_UNAVAILABLE` and the brand-voiced message

`QotdControllerIntegrationTest` (`@SpringBootTest` + Testcontainers, extends `AbstractIntegrationTest`):

9. `getTodaysQuestion_anonymousAccessAllowed` — issue request with no `Authorization` header → `200` (verifies D4)
10. `getTodaysQuestion_returnsDifferentQuestionOnDifferentDay` — seed 72 rows via the new prod changeset, query for two different UTC dates (e.g., 2026-01-01 and 2026-04-29 — `dayOfYear=1, 119`, modulo-72 → indices 1, 47), assert different ids
11. `seedQotdQuestionsProductionChangeset_insertsAll72Rows` — Testcontainers DB run includes the new prod changeset; assert `SELECT count(*) FROM qotd_questions = 72` and that all 72 ids `qotd-1`..`qotd-72` are present

`QotdQuestionRepositoryTest` (`@DataJpaTest` + Testcontainers, extends `AbstractDataJpaTest`):

12. `findByDisplayOrderAndIsActiveTrue_returnsRowWhenActive` — seed one row with `is_active=true`, query → `Optional.of(...)`
13. `findByDisplayOrderAndIsActiveTrue_returnsEmptyWhenInactive` — seed one row with `is_active=false`, query → `Optional.empty()` (verifies the partial index correctness)

### Frontend tests (~2-4)

`useQotdToday.test.ts`:

- Returns the API response on success
- Falls back to `getTodaysQuestion()` constants on network error
- Falls back to constants on 404 `QOTD_UNAVAILABLE`

`QuestionOfTheDay.test.tsx`:

- Renders skeleton during initial fetch (anti-pressure, no exclamation)

### Drift-detection test (cross-language)

The drift-detection test feeds the same fixed list of `Date` values to both the frontend `getTodaysQuestion()` and the backend `QotdService.findTodaysQuestion()` and asserts identical question id.

**Date fixture set:**
- `2026-01-01` (Jan 1, `dayOfYear=1`)
- `2026-12-31` (Dec 31, `dayOfYear=365`)
- `2024-02-29` (leap day in a leap year, `dayOfYear=60`)
- `2026-07-15` (mid-year ordinary day)
- A handful of additional dates picked for coverage (early/mid/late year)

**CRITICAL scope note:** under D1 (defer liturgical), the drift test MUST use dates that fall OUTSIDE all named liturgical seasons (advent, lent, easter, christmas) OR mock `getLiturgicalSeason` to return `isNamedSeason=false`. Otherwise the frontend returns a seasonal question (taken from the `seasonal` theme bucket) and the backend returns the modulo-72 question, and the test fails by design — this is not a drift, it is the deferred-seasonal regression flagged in D1. Document this carve-out clearly in the test file.

The drift test can run as either a backend test (parsing the frontend constants module via a JS engine — heavy) or as a documented test pair: backend test executes the modulo-72 path against the seeded DB, frontend test executes `getTodaysQuestion()` with `getLiturgicalSeason` mocked to non-seasonal, both assert the same expected question id list. Recommend the test-pair approach — simpler, no JS engine in the JVM, and the assertion set is symmetric.

---

## Anti-Pressure Copy Checklist

- [ ] No exclamation points in the question or hint as displayed
- [ ] Skeleton loading state uses neutral language ("Loading…" or no text at all — no "Hold on!", "Please wait", "Almost there")
- [ ] 404 message ("No question is available right now.") is matter-of-fact, no apology, no urgency
- [ ] Constants-file deprecation comment is informational, not alarmist

---

## Out of scope

- Liturgical-season-aware rotation (deferred to Phase 9.2 — see D1)
- Admin endpoints to toggle `is_active`, edit text, add new questions (future spec)
- A `liturgical_season` column on `qotd_questions` (intentionally NOT added — D1)
- Per-user QOTD history / "questions you've already answered" (different feature, future spec)
- Rate limiting on `/api/v1/qotd/today` (read-only, no abuse vector beyond global limits)
- Migration of the 72 questions to a richer content model (future content spec if desired)
- Any change to Spec 3.5's import of `QotdQuestion` from `com.worshiproom.post` (same package — no change needed)

---

## Out-of-band notes for Eric

- 3.9 ships ahead of 3.8 (D0). The spec tracker should be updated to reflect 3.9 ✅ and 3.8 still ⬜ once 3.9 lands.
- The deferred liturgical-season-awareness is a deliberate, documented regression — when Phase 9.2 lands, the test fixture's "outside named liturgical seasons" carve-out can be removed and the drift test extended to seasonal dates.
- The constants file (`frontend/src/constants/question-of-the-day.ts`) stays in the frontend bundle as the offline fallback. The deprecation comment is a marker — actual removal would require Phase 4 (offline-first architecture work) to settle on a different fallback story.
- The production seed changeset (D5) duplicates content from the dev seed (021). This is intentional — Liquibase changesets are immutable, so the production seed locks in the "version of the questions at 2026-04-29." Future content edits ship as new changesets layered on top.
