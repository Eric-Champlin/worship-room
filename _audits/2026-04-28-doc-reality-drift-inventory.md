# Documentation Reality Drift Inventory

**Generated:** 2026-04-28
**Branch:** `forums-wave-continued`
**Scope:** Discovery pass only — no edits proposed yet.
**Method:** 5 parallel read-only audits, synthesized below.

---

## How to read this file

This is the **Pass 1 (Discovery)** output. It is exhaustive by design — Eric will prune in Pass 2. Each finding is annotated with severity:

- **High** — doc actively misleads future spec authors (wrong package, wrong algorithm, wrong table, wrong file path, false-positive ✅, etc.). Most should be fixed.
- **Medium** — doc is stale/incomplete but not actively wrong. Fix when adjacent work touches the area.
- **Low** — cosmetic (wording, formatting, outdated cross-references).

Findings are organised by document, then by severity within each section.

---

## Executive summary

| Section | High | Medium | Low | Total |
|---|---|---|---|---|
| A — Master plan body, Phases 0/0.5/1 | 6 | 13 | 8 | 27 |
| A — Master plan body, Phases 2/2.5/3 (shipped) | 11 | 14 | 5 | 30 |
| B — Spec tracker | 3 | 2 | 1 | 6 |
| C — Rules directory (`.claude/rules/*`) | 8 | 11 | 9 | 28 |
| D — Handoff prompt | 1 | 1 | 0 | 2 |
| E — CLAUDE.md (root) | 4 | 5 | 3 | 12 |
| F — `_plans/post-1.10-followups.md` | 0 | 1 | 2 | 3 |
| G — Forward-looking implications | 9 | 16 | 6 | 31 |
| **Totals** | **42** | **63** | **34** | **139** |

**Standout themes** (described in Section H, "Cross-cutting patterns"):

1. **Tracker miscounts shipped state in three places.** Three specs marked ✅ that have NOT shipped (3.8 Reports, 1.10f Terms/Privacy *fully*, 1.10m Community Guidelines page). Spec 3.3 is missing a tracker row entirely.
2. **Phase 3 Execution Reality Addendum does not exist.** Phase 1 + Phase 2 each have an addendum at the top of the master plan (lines 22 and 129); Phase 3 has only inline addendums for 3.6 and 3.7. Many cross-spec conventions established during 3.5/3.6/3.7 (L1-cache trap, `@Modifying` flags, method-specific SecurityConfig ordering, `409 EDIT_WINDOW_EXPIRED`, `PostsRateLimitConfig` shape, `CrisisAlertService` integration point, `PostExceptionHandler` package scoping, `INTERCESSION` ActivityType) have not been propagated to the rule files or to forward-looking specs.
3. **`useEchoStore` ghost reference (4 files).** `06-testing.md`, `09-design-system.md`, and `10-ux-flows.md` (×2) all reference `useEchoStore` and `wr_echo_dismissals`. Per `11b-local-storage-keys-bible.md`, this feature was deferred and only a session-scoped `useEcho` hook exists. The four references are vapourware.
4. **Pattern A vs Pattern B framing inconsistency.** `06-testing.md` and `09-design-system.md` describe 5 stores (highlights, bookmarks, notes, journals, chapter visits) as if they were standalone hooks (Pattern A). They aren't — they use Pattern B inline subscribe. Only `useMemorizationStore`, `useStreakStore`, and `usePrayerReactions` are real Pattern A hooks.
5. **"Reactive Store Consumption" anchor link rot.** Five rule files plus the master plan link to `11-local-storage-keys.md § "Reactive Store Consumption"` — that section actually lives in `11b-local-storage-keys-bible.md`.
6. **Mass file-path drift across 1.10x runbooks.** Master plan body says `runbook-monitoring-alerts.md`, `error-codes.md`, `runbook-environment-variables.md` — actual files are `runbook-monitoring.md`, `api-error-codes.md`, `env-vars-runbook.md`. Same drift applies to `_plans/forums-wave/` (master plan) vs actual `_plans/forums/`.
7. **CLAUDE.md authentication claim is materially wrong.** Line 79 says "Authentication (mock/simulated, real JWT in Phase 3)" — real JWT auth shipped in Phase 1 (Spec 1.4 + 1.5 + 1.9).
8. **Liquibase changeset attributions are wrong.** `qotd_questions` table is attributed to Spec 3.9 in the registry but actually created by Spec 3.1 changeset 019. Filename date prefixes throughout the master plan body don't match actual changesets.

---

## A. Master plan body drift

### A.1 — Phases 0, 0.5, 1

#### High severity

| Spec | Drift | Doc claim | Reality | Evidence |
|------|-------|-----------|---------|----------|
| All Phase 1 (line 422) | Pre-rename package still in body | "the backend contains the proxy layer at `com.example.worshiproom.proxy.*`" — claimed as April 22 2026 current state | Rename shipped in Spec 1.1 ✅; package is now `com.worshiproom.proxy.*`. Zero hits in `backend/src/` | round3-master-plan.md:422 |
| 1.3b | Wrong file name for timezone changeset | "New Liquibase changeset `2026-04-14-003-add-users-timezone-column.xml`" | Actual: `2026-04-23-002-add-users-timezone-column.xml` (different date AND sequence) | round3-master-plan.md:1843, 1853 |
| 1.5 | Files-to-create list incomplete; filter-name collision | Lists `AuthResponse.java`. Filter referenced as `RateLimitFilter.java` | Reality also has `RegisterResponse.java`, `UserSummary.java`. Filter is `LoginRateLimitFilter.java` (NOT `RateLimitFilter.java` — collides with `proxy/common/RateLimitFilter.java`) | round3-master-plan.md:1985; `auth/LoginRateLimitFilter.java` |
| 1.5 | Password length contradiction | "Validate password length (≥12 chars)" + "Register with password &lt; 12 chars returns 400" | `02-security.md` says "Minimum Length: 8 characters" | round3-master-plan.md:1973, 1993 vs `02-security.md` |
| 1.10d | Wrong package + 4 fictional files | Files: `com/worshiproom/observability/SentryConfig.java`, `PiiScrubber.java`, `RequestIdMdcFilter.java` | Actual: `config/SentryConfig.java` (1 file). No `observability/` package. No `PiiScrubber.java` (Sentry's `send-default-pii=false` + `BeforeSendCallback` handle this in-config). No `RequestIdMdcFilter.java` — `proxy/common/RequestIdFilter.java` already handles MDC | round3-master-plan.md:2305–2310; `07-logging-monitoring.md`:56 |
| 1.10g | Wrong implementation mechanism | "Approach: Spring Security's `HttpSecurity.headers()` configuration" | Shipped as `OncePerRequestFilter` at `config/SecurityHeadersConfig.java` ordered `HIGHEST_PRECEDENCE + 6` (filter-raised 401s/429s wouldn't get headers via the declarative API) | round3-master-plan.md:8464 vs `SecurityHeadersConfig.java` |
| 1.10j | Wrong implementation surface | "Files to modify: `com/worshiproom/health/HealthController.java`" | No such file. Reality: Spring Boot Actuator's auto-exposed `/actuator/health/{liveness,readiness}` via `management.endpoint.health.probes.enabled=true` (config-only) | round3-master-plan.md:8503 |
| 1.10f | Master plan body fully describes work that did not ship | Body details `terms_version`/`privacy_version` columns, `TermsUpdateModal.tsx`, `LegalVersionService.java`, `users` ALTER, `GET /api/v1/legal/versions`, registration consent checkbox | Reality: only the canonical legal markdown files exist (`content/{terms-of-service,privacy-policy}.md`). NO columns, NO endpoints, NO modal, NO registration consent. Tracker says ✅ — partially shipped | round3-master-plan.md:2605 vs disk |
| 1.10m | 12-project-reference says route shipped; frontend has no route | "Already shipped: `/community-guidelines` (Spec 1.10m)" | No route, no page component. Only `content/community-guidelines.md` markdown | grep frontend/src/ |

#### Medium severity

| Spec | Drift | Doc claim | Reality | Evidence |
|------|-------|-----------|---------|----------|
| 1.3 | Wrong filename for first changeset | `2026-04-14-001-create-users-table.xml` | `2026-04-23-001-create-users-table.xml` | master plan:1804 |
| 1.3b | Files-to-modify lists scope-conflated code | Lists `User.java`, `RegisterRequest.java`, `UserResponse.java`, `AuthService.java`, `UserService.java`, `AuthModal.tsx`, `Settings.tsx` | 1.3b shipped SCHEMA-ONLY per spec body | master plan:1855–1864 |
| 1.5 | Timezone capture not in master plan body AC | AC silent on browser timezone capture on register | Reality: spec-1-5.md adds `timezone` field to `RegisterRequest`; backend captures + stores. Addendum #5 covers AuthModal/frontend re-home, not the backend capture | spec-1-5.md:121 |
| 1.7 | Wrong path for AbstractIntegrationTest | `backend/src/test/java/com/worshiproom/AbstractIntegrationTest.java` | Actual: `support/AbstractIntegrationTest.java` (subdir; siblings `AbstractDataJpaTest`, `TestContainers`) | master plan:2042 |
| 1.7 | `application-test.properties` listed as creation target | "Files to create: `backend/src/main/resources/application-test.properties` + `db/changelog/contexts/test-seed.xml`" | Neither file exists. Test-context override moved to `@DynamicPropertySource` in base classes | master plan:2043, 2044 |
| 1.7 | "Test run time &lt; 60s" target stale | AC: "Test run time &lt; 60 seconds" | Addendum #1 records ~97s baseline; suite has since grown | master plan:2058 |
| 1.10 | Wrong path for cutover checklist | `_plans/forums-wave/phase01-cutover-checklist.md` | Actual: `_plans/forums/phase01-cutover-checklist.md` (no `-wave`) | master plan:2245 |
| 1.10c | Doc claims spec is shipped but tracker says ‼️ | Master plan Spec 1.10c body reads as if executable now | Deferred (SMTP-blocked) per `_plans/post-1.10-followups.md` | master plan:2511 vs tracker:51 |
| 1.10d | Logback Sentry appender expectation | Master plan implies normal Sentry wiring with all log levels | Reality: "Logback ingestion DELIBERATELY DISABLED" per `07-logging-monitoring.md`:59. Only `@ExceptionHandler` capture path; no Logback appender registered | spec-1-10d.md:113 |
| 1.10e | Doc presents as ready; not shipped | Multi-page Spec body fully detailed; tracker line 50 ⬜ | Object storage deferred. No `storage/` package | master plan:2377 |
| 1.10g | Wrong CSP mode in dev | "dev profile uses `Content-Security-Policy-Report-Only`" | Reality: always emits enforcing CSP; `unsafe-inline` makes Tailwind/Vite work in both profiles | master plan:8464 vs `SecurityHeadersConfig.java`:46 |
| 1.10k | Doc presents as ready; tracker says ⬜ | Full Approach + AC reads executable | Not shipped per tracker:57 | master plan:8507 |
| 1.5b–g | Master plan body presents as ship-ready specs | Lines 8356–8456: full Approach / Files / AC for each | All ‼️ deferred (SMTP-blocked) per tracker:36–41 | master plan:8356–8456; tracker:36–41 |

#### Low severity

| Spec | Drift | Severity reason |
|------|-------|-----------------|
| 1.1 | Phase 1 DoD bullet still lists `com.example.worshiproom` rename as an unticked acceptance criterion | Cosmetic — done per tracker; addendum #8 covers stale processes only |
| 1.4 | "JWT secret with development default (clearly marked)" | No hardcoded dev default; loaded via `@Value` from `application-dev.properties`. Behavior equivalent |
| 1.6 | Wrong package path for UserController test file | Path correct; Spec 1.7 refactored to extend `support/` base classes |
| 1.9 | "121 useAuth consumers unchanged" claim | Stale count; no regression but numbers not load-bearing |
| 1.10b | Wrong path for deployment-target doc | `forums-wave/` → `forums/` |
| 1.10b | Wrong candidate set advertised | "5 candidates" (Railway/Render/Fly/Supabase/Neon); Railway selected, Fly.io not in shipped doc |
| 1.10d | Wrong runbook path | `runbook-monitoring-alerts.md` → `runbook-monitoring.md` |
| 1.10d | Wrong env var | `UPTIMEROBOT_API_KEY` listed; backend reads no such var (not configured) |
| 1.10h | Wrong runbook filename | `error-codes.md` → `api-error-codes.md` |
| 1.10i | Wrong runbook filename | `runbook-environment-variables.md` → `env-vars-runbook.md` |
| 1.10j | Missing `railway.toml` in deliverable list | Addendum 2.1 captured this in spec body |
| 1.5b/d/e | "or provide a stub mailer" prereq is paper-only | No stub-mailer pattern defined |

### A.2 — Phases 2, 2.5, 3 (shipped portion)

#### High severity

| Spec | Drift | Doc claim | Reality | Evidence |
|------|-------|-----------|---------|----------|
| 3.1 | QOTD changeset attribution | `05-database.md` § Phase 3 attributes `qotd_questions` to Spec 3.9 | Changeset `2026-04-27-019` header explicitly says it's from Spec 3.1 | `05-database.md`:90 vs `2026-04-27-019-create-qotd-questions-table.xml`:7–17 |
| 3.2 | Mock seed count | Master plan body says "60 QOTD questions seeded" | Reality is **72** (60 general + 12 liturgical, qotd-1 through qotd-72) | `frontend/src/constants/question-of-the-day.ts` (72 entries); `12-project-reference.md`; `QotdQuestion.java` JavaDoc |
| 3.3 | Tracker row missing | Phase 3 spec-tracker row #53 (Spec 3.3) has empty cells | Spec exists, shipped as "Posts Read Endpoints", L, ✅ | tracker:95 vs `_specs/forums/spec-3-3.md` |
| 3.4 | "reactions read-side covers all reaction types" | Master plan body line 3733 lists only `isPraying`, no candle | Spec 3.4 excluded candle (Divergence 3); 3.7 extended `EngagementService.reactionsFor()` to query both 'praying' and 'candle' | `EngagementService.java`:53–64 |
| 3.5 | EditWindowExpiredException HTTP status | Phase 3.6 Addendum line 3808 says `400 EDIT_WINDOW_EXPIRED` | Shipped as `409 CONFLICT` for both posts and comments | `EditWindowExpiredException.java`:15; `comment/CommentEditWindowExpiredException.java`:13 |
| 3.6 | Phase 3.6 Addendum HTTP status text | Addendum line 3808: "returns `400 EDIT_WINDOW_EXPIRED`" | Shipped 409 | (same as 3.5) |
| 3.7 | "Schema migration that introduces reaction_type" | Phase 3.7 Addendum line 3830–3832 implies a NEW Liquibase changeset for `reaction_type` and `candle_count` | Both shipped in **Spec 3.1** changesets 014 and 016. Spec 3.7 added zero new changesets | `_specs/forums/spec-3-7.md` § R1–R3 |
| 3.7 | localStorage shape migration framing | Addendum: shape changes from `{ praying: bool }` → `{ praying: bool, candle: bool }` and "needs version bump (Pattern A migration logic)" | Reality: shape was already `{ isPraying, isBookmarked }` since Phase 0.5; Spec 3.7 added `isCandle`. Field names are `is*` prefixed. Shipped without a version bump (additive default-fill on hydrate) | `reactionsStore.ts`:11–48; `_specs/forums/spec-3-7.md` § R5 |
| 3.8 | Spec status | Spec-tracker line 100 marks Spec 3.8 ✅ | No spec file (`_specs/forums/spec-3-8.md` absent), no plan, no Java code, no changeset for reports beyond the table from 3.1. False ✅ | `find ... -name "*Report*"` → none |
| 3.9 | "60 questions" + algorithm | Master plan body line 3858: "Existing 60 questions seeded in 3.2" + acceptance "day-of-year modulo 60" | Reality: 72 questions; frontend `getTodaysQuestion()` is liturgical-season-aware with override + general-pool fallback (modulo 72). Schema doesn't have a `liturgical_season` column today | master plan:3858, 3879; `question-of-the-day.ts`:455–478 |
| 3.9 | Backend package location | Master plan: `com/worshiproom/qotd/QotdController.java` (new package) | `QotdQuestion` and `QotdQuestionRepository` already at `com.worshiproom.post/` (Spec 3.1) | master plan:3864; `post/QotdQuestion.java` |
| 2.10 | Backfill UPSERT for faith_points | Master plan body: "INSERT … ON CONFLICT DO UPDATE taking MAX(existing.total_points, incoming.total_points)" | Phase 2 Addendum item 13: "INSERT … ON CONFLICT DO UPDATE (overwrite; localStorage is source of truth at cutover)" — overwrite, NOT MAX | master plan:3117 vs Phase 2 Addendum item 13 |

#### Medium severity

| Spec | Drift | Severity reason |
|------|-------|-----------------|
| 3.1 | Liquibase changeset filename prefixes | Master plan lists `2026-04-17-001` through `…-006`; actual `…-014` through `…-019` (date and sequence both off) |
| 3.1 | post_reports CHECK + ON DELETE SET NULL conflict | Master plan body doesn't surface the interaction; required follow-up changeset 020 |
| 3.3 | "comments inlined" AC | Master plan: "GET /api/v1/posts/{id} returns post with comments inlined" | Spec 3.3 explicitly diverged: comments via separate endpoint |
| 3.6 | INTERCESSION ActivityType count | Master plan / Phase 2 Addendum implies 12 types | Reality: 13 (INTERCESSION added in 3.6) |
| 3.10–3.12 | "Reactions persist across devices" | Phase 0.5 reactions store seeds from `getMockReactions()` first-load; cross-device sync requires Phase 3.11 backend adapter |
| 2.1 | `grace_days_used` etc. columns | Master plan describes them as functional; Phase 2 Addendum says they shipped dormant (no read/write code) |
| 2.3 | Streak repair full feature port | Master plan AC: "grace period consumption, grief pause check, streak repair eligibility" | Reality: only eligibility check ported; rest deferred (Phase 2 Addendum items 1, 2, 3) |
| 2.4 | "checkBadges runs against backend-populated context" | Master plan implies BadgeService queries DB | Reality: pure function; caller assembles context. Six data sources have no backend storage in Phase 2 |
| 2.4 | Welcome and challenge badges | Master plan AC implies all 58 badges in eligibility | Reality: 1 welcome + 7 challenge badges excluded from evaluation |
| 2.6 | `recordActivity()` method | Master plan: "FaithPointsService.recordActivity(...)" | That method does not exist; `FaithPointsService.calculate(...)` is the only public method |
| 2.7 | `recordActivity` signature | Master plan implies "no signature changes" | Changed from `(type) =&gt; void` to `(type, sourceFeature) =&gt; void` |
| 2.10 | `wr_activity_counts` localStorage key | Master plan names this key | Reality: doesn't exist; counts live inside `wr_badges.activityCounts` |
| 2.5.6 | Block User feature scope missing | Master plan body covers only 2.5.1–2.5.5; no spec section for 2.5.6 (Block) | Tracker shows ✅ shipped |
| 2.5.7 | Mute User feature scope missing | Master plan body has no Phase 2.5 section for 2.5.7 | `backend/.../mute/` exists; shipped |

#### Low severity

| Spec | Drift |
|------|-------|
| 2.1 | Liquibase filename prefixes wrong (cosmetic — date and sequence both off across ~20 changesets) |
| 2.6 | `grace_used` and `grace_remaining` response fields always return 0 (API stability stub) |
| 2.7 | `recordActivity` location wrong (`services/activity-recorder.ts` vs actual `hooks/useFaithPoints.ts`) |
| 2.10 | Liquibase changeset filename `2026-04-18-001-add-activity-log-unique-key.xml` | Actual: `2026-04-27-008-add-activity-log-backfill-idempotency-index.xml` |
| 2.5.1 | "All four shadow tables together" prefix `2026-04-16-001` through `…-004` | Actual: shipped as `2026-04-27-009` through `…-012` |

---

## B. Spec tracker drift

| Spec | Status claimed | Reality | Severity |
|------|----------------|---------|----------|
| 3.3 Posts Read Endpoints | Row missing entirely (line 95 is empty `\| \|`) | Spec exists at `_specs/forums/spec-3-3.md`, plan exists, code shipped | High |
| 3.8 Reports Write Endpoint | ✅ shipped | No spec file, no plan file, no Java code, no `Reports*Controller`. Latest commit on branch is `spec-3-7`, not 3.8. **False ✅** | High |
| 1.10f Terms of Service and Privacy Policy Surfaces | ✅ shipped | Liquibase changeset 001 explicitly excludes `terms_version`/`privacy_version`. No `/terms-of-service` or `/privacy-policy` route. Markdown content exists but unconsumed. Only the canonical-doc-content portion shipped. **Partial-shipped masquerading as ✅** | High |
| 1.10m Community Guidelines Document | ✅ shipped | Markdown exists at `content/community-guidelines.md`; no frontend page or `/community-guidelines` route. `12-project-reference.md` claims it's shipped | Medium |
| 1.10h API Error Code Catalog | ✅ shipped | Doc exists; no spec/plan file in `_specs/forums/` or `_plans/forums/`. Pattern: documentation-only specs apparently shipped without spec files. Verify intentional. | Low |
| 1.10i Backend Environment Variables Runbook | ✅ shipped | Doc exists; no spec/plan file. Same pattern as 1.10h. | Low |
| 1.10e Object Storage Adapter Foundation | ⬜ pending | Confirmed pending. No drift. | — |
| 1.10c Database Backup Strategy | ‼️ deferred | Confirmed; gap-analysis doc exists. No drift. | — |
| 1.5b–g | All ‼️ deferred | Correctly blocked on SMTP/domain. No drift. | — |

**Phase 1 totals:** 21 ✅ + 7 ‼️ + 2 ⬜ = 30 specs.
**Phase 3 row count:** Tracker has 11 visible rows where 12 specs exist (Spec 3.3 row elided).

---

## C. Rules directory drift

### Per-file findings

#### `01-ai-safety.md`

| Drift | Severity |
|-------|----------|
| Implies users see Community Guidelines on `/community-guidelines` route; route doesn't exist | Medium |

#### `02-security.md`

| Drift | Severity |
|-------|----------|
| `users.terms_version` and `users.privacy_version` described as if they exist; changeset 001 explicitly excludes them | High |
| Method-specific SecurityConfig rule ordering NOT documented; load-bearing pattern with 3+ shipped consumers | High |
| Forums Wave write-rate-limit values: doc says "Comments 20/hour per user"; `application.properties` says `comments.rate-limit.max-per-hour=30` | Medium |

#### `03-backend-standards.md`

| Drift | Severity |
|-------|----------|
| Package structure list claims `friends/`, `social/`, `post/`, `mute/`, `safety/` are "Forums Wave package additions (Phases 2.5+ — still future)"; all already exist on disk | High |
| `@Modifying(clearAutomatically = true, flushAutomatically = true)` convention NOT documented; used 11 times across 4 files | High |
| L1-cache trap (save → flush → findById returns stale) NOT documented; called out in spec but not promoted to rule | High |
| Forums Wave rate-limit "Comments 20/min per user" value drift (duplicate of 02 row) | Medium |

#### `04-frontend-standards.md`

| Drift | Severity |
|-------|----------|
| (No drift found) | — |

#### `05-database.md`

| Drift | Severity |
|-------|----------|
| Canonical Table Registry `users` row lists `terms_version, privacy_version` as if they exist on the table | High |
| L1-cache trap rule not present (same as 03-backend-standards) | High |
| Phase 2.5 friend tables: registry says all four "Created in Spec 2.5.1"; actually changesets 011, 012 ship in separate Spec 2.5.x | Low |

#### `06-testing.md`

| Drift | Severity |
|-------|----------|
| Lists `useEchoStore` as a "store requiring this pattern"; no such hook exists, BB-46 was deferred | High |
| Frames 5 inline-subscribe stores (`useHighlightStore` etc.) as standalone hooks; only `useMemorizationStore` and `useStreakStore` are real Pattern A hooks | High |

#### `07-logging-monitoring.md`

| Drift | Severity |
|-------|----------|
| Framework log suppression: doc lists 2 narrow suppressions; `application-dev.properties` has 4 (DispatcherServlet=INFO and HttpLogging=INFO added by Spec 3) | Medium |

#### `08-deployment.md`

| Drift | Severity |
|-------|----------|
| `DATABASE_URL` listed as required; backend actually reads `SPRING_DATASOURCE_URL` (file's intro paragraph self-flags this) | Medium |

#### `09-design-system.md`

| Drift | Severity |
|-------|----------|
| `EchoStore` listed alongside other reactive stores at `lib/&lt;feature&gt;/store.ts` paths; (a) no `EchoStore` exists, (b) most stores are at non-standard paths, (c) most do not use `useSyncExternalStore` | High |
| 5 mentions of "Reactive Store Consumption" point to `11-local-storage-keys.md`; section actually lives in `11b-local-storage-keys-bible.md` | Medium |

#### `10-ux-flows.md`

| Drift | Severity |
|-------|----------|
| MyBible page "reads from seven reactive stores via hooks" — names 6 hooks that don't exist as files (only `useMemorizationStore` is real) | High |
| "Verse Echoes Flow" describes `wr_echo_dismissals` via `useEchoStore()` — feature deferred; current echoes are session-scoped | High |

#### `11-local-storage-keys.md`

| Drift | Severity |
|-------|----------|
| `wr_user_id` row references "Spec 1.9 Decision 19"; Spec 1.9 has only 15 numbered design decisions | High |

#### `11b-local-storage-keys-bible.md`

| Drift | Severity |
|-------|----------|
| `bible:streak` storage key listed in Pattern A table line 195 but NOT in the per-feature Bible Reader key table (only legacy `wr_bible_streak` documented) | Medium |

#### `12-project-reference.md`

| Drift | Severity |
|-------|----------|
| `/community-guidelines` listed as "Already shipped: `/community-guidelines` (Spec 1.10m)"; route does not exist in `App.tsx` | High |
| Devotionals 50, QOTD 72, Reading Plans 10/119d — all verified accurate | — |

### Cross-file inconsistencies

1. **`useEchoStore` ghost reference** in `06-testing.md`, `09-design-system.md`, `10-ux-flows.md` (×2) — `11b` correctly says deferred. (4 files vs 1 file; the 4 are wrong.)
2. **"Reactive Store Consumption" section anchor drift** — the section lives in `11b`; 5 rule files plus the master plan link to `11`.
3. **Pattern A vs Pattern B framing** — `06` and `09` frame all 7 Bible-wave stores as standalone hooks; reality (per `11b`) is only 2 are.
4. **Comments rate limit value** — `02` says 20/hour; `application.properties` says 30/hour.
5. **`users.terms_version` and `users.privacy_version`** — `02` and `05` describe them as if shipped; they aren't.

### Undocumented conventions

1. `@Modifying(clearAutomatically=true, flushAutomatically=true)` on JPQL bulk DELETE/UPDATE — 11 occurrences across 4 repos; no rule file mentions
2. L1-cache trap (`save → flush → findById` returns stale) — Spec 3.5 surfaced it; only inline `ReactionWriteService` comment captures the lesson
3. SecurityConfig method-specific rule ordering — load-bearing for 3+ specs (3.5, 3.6, 3.7); no rule file
4. Auth lifecycle dev-profile log suppression for GET endpoints (DispatcherServlet=INFO, HttpLogging=INFO)
5. Bounded idempotency caches (`worshiproom.posts.idempotency.cache-size=10000`, etc.) — bounded by user-controlled headers; should be in `02-security.md` § BOUNDED EXTERNAL-INPUT CACHES
6. `PublicPaths.PATTERNS` as single source of truth for public endpoints; not promoted from JavaDoc to rule file

### Naming and structural recommendations

1. Mass-update all `11-local-storage-keys.md § "Reactive Store Consumption"` references → `11b-local-storage-keys-bible.md § "Reactive Store Consumption"`. (Or merge 11b back into 11; or move that section to a new `13-state-management.md` since the topic is state, not storage keys.)
2. Decide `useEchoStore`: delete all 4 references OR ship the feature. Currently it's vapourware named in 4 files.
3. Fix Pattern A standalone hook claims for stores that don't have them (06 + 09).
4. `05-database.md` Canonical Table Registry `users` row should split current vs future or mark `terms_version`/`privacy_version` as "(Spec 1.10f, future)".
5. `12-project-reference.md` `/community-guidelines` row should move from "Already shipped" back to "Forums Wave will add".
6. `11-local-storage-keys.md` "Spec 1.9 Decision 19" reference is invalid — fix or remove.
7. Add `@Modifying` convention + L1-cache-trap warning to `03-backend-standards.md` § Repository Conventions.

---

## D. Handoff prompt currency

The file is already self-marked SUPERSEDED at the top.

| Drift | Severity |
|-------|----------|
| The SUPERSEDED notice is itself ~5 days stale: says "Spec 1.9b is currently in execution" — actually 1.9b shipped, plus all reachable Phase 1, all Phase 2, all Phase 2.5, and 3.1–3.7 of Phase 3 | Medium |
| Body line 78 "Current position: Phase 0, Spec 0.1" is grossly stale; "138 specs" appears 7+ times in the body even though the SUPERSEDED notice says 156 | High |

**Recommendation:** Replace the body with a 5-line redirect to the spec-tracker, CLAUDE.md, and `_specs/forums/`. Even with the SUPERSEDED banner, the body content is misleading enough to warrant deletion.

---

## E. CLAUDE.md (root) currency

#### High severity

| Section | Drift | Reality |
|---------|-------|---------|
| Implementation Phases | "Phase 1 complete: 24/30 specs shipped, 6 deferred" | 21/30 shipped, 7 deferred (1.5b–g + 1.10c), 2 pending (1.10e + 1.10k) |
| Implementation Phases | "Phase 2.5 (Friends Migration) starting next, 8 specs" | All 8 of Phase 2.5 shipped |
| Implementation Phases | Implies Phase 2.5 is active | Phase 3 (Prayer Wall Backend) is active; latest commit is `spec-3-7` |
| Feature Summary / Foundation | "Authentication (mock/simulated, real JWT in Phase 3)" | Real JWT auth shipped in Phase 1 (Spec 1.4 + 1.5 + 1.9) |

#### Medium severity

| Section | Drift |
|---------|-------|
| Forums Wave Working Guidelines line 264 | Says master plan is v2.8; line 155 says v2.9. Inconsistent within the same file |
| Build Health | "8,811 pass / 11 pre-existing fail" — baseline is post-Key-Protection (pre-Phase-1); many specs have shipped since. Self-flagged "numbers drift" but anchored value is misleading |
| Build Health | "~720 pass / 0 fail" backend — surefire reports show ~1,240 testcase elements after Phase 3.7 |
| Production Deployment / Railway | "Frontend: https://worshiproom.com" — domain not yet purchased (per followup); production URL is `worship-room-frontend-production.up.railway.app` |
| Followup #2 | Cross-references to "Test 5 prod regression" (CORS exposed-headers fix) — verify if shipped via Spec 1.10g or still open |

#### Low severity

| Section | Drift |
|---------|-------|
| Production Deployment URL placeholders | `&lt;backend-service&gt;.up.railway.app` — real URL is `worship-room-production.up.railway.app` |
| Implementation Phases | Verbose "Spring Boot proxy at `com.example.worshiproom.proxy.*` (renamed to `com.worshiproom.proxy`...)" — no `com.example` packages exist; cosmetic |
| Build Approach | Branch model not stated; current Forums Wave branch is `forums-wave-continued` (user MEMORY.md says different); worth adding to CLAUDE.md |

---

## F. `_plans/post-1.10-followups.md` drift

| Item # | Drift | Severity |
|--------|-------|----------|
| Section numbering | Items skip from #7 to #9; two items between #9 and #10 are unnumbered; two items between #10 and #11 are unnumbered. Hard to reference in handoff conversation | Low |
| #15, #16, #17 (comment extension claim) | All correctly extended per Spec 3.6 ("Extended to comments per Spec 3.6, 2026-04-28"). #18 also extended. **No drift here** — Eric's claim is accurate | — |
| #2 (Test 5 prod regression / CORS for filter-raised 401s) | Status open in doc; per `02-security.md` `SecurityHeadersFilter` runs at `HIGHEST_PRECEDENCE + 6`. Verify if the diagnostic step (allowed-origins env var, backend redeploy) was completed | Medium |
| #4 (Prayer Wall primary-color contrast) | Still open; could be one of the 11 pre-existing baseline failures | Low |
| #11–#13 (per-user rate limiting on friends/mute) | Correctly deferred to Phase 10.9. No drift. | — |
| #14 (kebab-case username derivation) | Correctly noted "Wave-interim shim shipped in Spec 3.3" | — |
| #19 (Rename `PostsRateLimitConfig` → `PostsConfig`) | Class still exists at the path stated. Pending rename | — |

---

## G. Forward-looking implications

The master plan body for Phases 3.8–16 was authored at v2.0–v2.6 and absorbs only the v2.7 (Key Protection) and v2.8 (gap-fill stubs) reconciliations. Phases 3.5/3.6/3.7 shipped a slew of conventions that have NOT been propagated forward.

### G.1 — High-severity propagations

| # | Affected future spec(s) | Current claim | Reality | Proposed update |
|---|-------------------------|---------------|---------|-----------------|
| G1 | Spec 3.8 Reports, Phase 4 (all post-types), 6.4, 6.6, 6.9, 8.1, 10.7/10.7b/10.10b/10.11, 12.4 | Master plan body says nothing about HTTP code for "edit window expired" or partial-update errors | Spec 3.5 + Phase 3.6 Addendum locked **`409 EDIT_WINDOW_EXPIRED`** as canonical; explicitly rejected 410 | Add phase-spanning note: edit-window check on user content MUST return 409 + `EDIT_WINDOW_EXPIRED` |
| G2 | Spec 3.8, 3.9 write paths, Phase 4 (all 5 post types), 6.1, 6.2, 6.5, 6.6, 8.1, 12.3, 13.1 | None mention the L1-cache trap | save → flush → findById returns stale entity from persistence context | Add Universal Rule 18 OR extend `06-testing.md`: any spec creating+immediately-reading JPA entity with `insertable=false, updatable=false` columns MUST `entityManager.refresh()` before DTO mapping, plus regression-guard test |
| G3 | Spec 3.8, 3.9, Phase 4, 6.1/6.2/6.5/6.6/6.8, 8.1, 8.2, 10.7b, 10.11 | Master plan body doesn't discuss `OPTIONAL_AUTH_PATTERNS` ordering | Spec 3.5/3.6/3.7 established: method-specific `.authenticated()` rules MUST come **BEFORE** `OPTIONAL_AUTH_PATTERNS.permitAll()`; AntPathMatcher's `*` is one segment | Add to `03-backend-standards.md` § Security Config Ordering, OR Universal Rules |
| G4 | Phase 4.4, 4.6, 6.4, 6.6, 8.1, 10.4, 10.5, 10.6, 10.11, 12.3, 13.x | Master plan body says "use `@Query` with `@Modifying`" without specifying cache-clearing flags | Spec 3.7 established `@Modifying(clearAutomatically = true, flushAutomatically = true)` for bulk updates | Update `03-backend-standards.md` § Repository Conventions |
| G5 | Spec 1.5b, 1.5e, 1.5f, 6.8, 8.1, 10.7b, 10.9, 10.11, 12.4, 13.x, 16.1 | Stubs describe rate-limiting in prose without prescribing primitive | Spec 1 + Phase 1 specs established Caffeine-bounded bucket maps with `maximumSize(10_000)` + `expireAfterAccess(15m)` | Add to v3.0 reconciliation: future per-user/per-email/per-IP rate limits MUST use Caffeine-bounded bucket pattern; never `ConcurrentHashMap`. Profile-aware config required |
| G6 | Phase 4.x post types, 6.1, 6.2, 6.6, 8.1, 10.7b, 10.11 | Master plan body lists exception classes per spec without prescribing scoping | Spec 3.5 + 1: package-scoped advice (`basePackages = "com.worshiproom.{domain}"`) + unscoped companion advice for filter-raised exceptions | Add scoping rule to `03-backend-standards.md` |
| G7 | Spec 3.9 (most urgent) | Master plan body: "60 questions, day-of-year modulo 60" + files at `com/worshiproom/qotd/` | 72 questions; liturgical-season-aware rotation; entity already at `com.worshiproom.post.QotdQuestion` | Update Spec 3.9 body to reflect 72 questions, rotation algorithm divergence, existing schema, existing package |
| G8 | Spec 3.8, 3.9 (write), Phase 4, 6.1/6.2/6.6, 8.1, 10.5, 10.6, 10.7, 10.7b, 12.3, 13.1, 15.1b | Master plan body and stubs vary; some say "respect crisis flag," some don't | Spec 3.5 introduced `CrisisAlertService`; Spec 3.6 generalized to `(contentId, authorId, ContentType)`. Universal Rule 13 says crisis content supersedes feature behavior | Add explicit "Crisis-supersession contract" subsection: `CrisisAlertService.alert(...)` is single integration point; future content types extend ContentType enum |
| G9 | Spec 3.7 Addendum + future Phase 9.5 Candle Mode UI + Phase 6.6 (which adds 'praising', 'celebrate' reactions) | Phase 3.7 Addendum says posts gain a NEW `candle_count` and `reaction_type` column | Both shipped in Spec 3.1 (changesets 014 and 016). CHECK constraint enforces `IN ('praying','candle')` — Phase 6.6 adding 'praising'/'celebrate' must ALTER the CHECK | Update Phase 3.7 Addendum to mark schema as already-shipped; add note to Phase 6.6 |

### G.2 — Medium-severity propagations

| # | Affected | Drift |
|---|----------|-------|
| G10 | 1.5b/c/d/e/g, 8.1, 10.7b | Anti-enumeration: `DUMMY_HASH` timing-equalization pattern from Spec 1.5 not propagated |
| G11 | Phase 4 post-type composers, 6.1, 6.2, 6.6, 8.1, 10.7b, 10.11, 16.2 | `PostsRateLimitConfig` shape (`@ConfigurationProperties` bundling rate-limit + edit-window + idempotency cache) not propagated |
| G12 | Phase 4 composers, 6.1, 6.2, 6.6, 8.1, 10.7b, 10.11, 16.2 | `PostsIdempotencyService` Caffeine pattern (vs composite-key DB constraint pattern in Spec 3.7) — recon must pick correctly |
| G13 | Phase 6.4, 7.7, 8.4/8.5/8.7 | Mute (Spec 2.5.7) shipped; Block (Spec 2.5.6) pending. Specs that filter content based on relationships must consult both once block ships |
| G14 | Spec 2.4 → all Phase 4-12 specs that add ActivityType | Backend `ActivityType` is 13 (INTERCESSION added 3.6); master plan still says 12. Future ActivityType additions must update both backend enum + frontend `ACTIVITY_POINTS` |
| G15 | Spec 1.5b–g, 15.1, 15.1b, 15.2, 15.3, 15.4 | All SMTP-blocked per `_plans/post-1.10-followups.md`; stubs don't flag this clearly. Phase 4 `@RequireVerifiedEmail` gate doesn't exist (Followup #17) |
| G16 | Spec 6.10, Phase 8 | `UserResolverService.resolveByKebabCase` is a wave-interim shim from Spec 3.3 (Followup #14). Spec 8.1 must include "remove shim" |
| G17 | Spec 5.6 Redis Cache | Master plan implies single rate limiter. Reality: split across `proxy.common.RateLimitFilter` and `post.PostsRateLimitService`. 5.6 must extract shared interface AND retrofit all consumers |
| G18 | Spec 1.10g | Stub describes `HttpSecurity.headers()` approach; shipped as servlet filter at `HIGHEST_PRECEDENCE + 6` |
| G19 | Spec 1.10h | Stub says `error-codes.md`; shipped as `api-error-codes.md`. Catalog has ~15 codes now |
| G20 | Spec 1.10c (deferred) + Phase 4.6b image upload + 6.7 testimony PNGs | Object storage (1.10e) ships only when first consumer demands it; recon must inventory adapter status |
| G21 | Phase 6.9 Composer Drafts, 11.3 Search recent searches, 16.1b Offline | Future localStorage-backed multi-consumer features must implement as reactive store with BB-45 cross-mount subscription test |
| G22 | Spec 8.1 Username System | Files-to-modify must include "remove `UserResolverService.resolveByKebabCase` and switch all callers"; multi-word name behavior must be specified |
| G23 | Spec 12.3 Notification Generators, 13.1 Insights, 13.4 Intercession Patterns | Master plan implies direct method calls between services. No event-bus / outbox / `ApplicationEventPublisher` pattern established. Phase 12 must choose at design time |
| G24 | Spec 1.10b | Decision is RESOLVED (Railway); Open Questions Log entry still says deferred |
| G25 | Spec 1.10d | Backend Sentry shipped; frontend deferred to 1.10d-bis. Stub describes "JSON structured logging with request-ID MDC" without flagging Logback deliberately disabled |

### G.3 — Low-severity propagations

| # | Affected | Drift |
|---|----------|-------|
| G26 | Spec 1.10j | Paths in stub `/api/v1/health/live`; actual `/actuator/health/{liveness,readiness}` |
| G27 | Spec 1.10m | Path in stub `frontend/src/content/community-guidelines.md`; actual REPO ROOT |
| G28 | All v2.8 Appendix E stubs | Liquibase changeset filename placeholders `2026-XX-XX-NNN-` are illustrative; Spec 3.1 Divergence 1 established the today's-date convention. Latest is `2026-04-27-021` |
| G29 | All future cutover specs | Master plan path `_plans/forums-wave/` → actual `_plans/forums/` (no `-wave`) |
| G30 | Spec 10.10 | First spec creating `admin_audit_log`; Specs 10.7b and 10.11 hard-depend. Sequencing question |
| G31 | All proxy-pattern future specs | Master plan v2.6 used `proxy.places` and `proxy.audio` placeholders; reality `proxy.maps` and `proxy.bible` |

### G.4 — Schema invariants already shipped

Future specs should NOT recreate:

| # | Schema element | Created by | Future spec at risk |
|---|---|---|---|
| 1 | `posts.candle_count` | Spec 3.1 changeset 014 | Phase 3.7 Addendum, Phase 9.5 |
| 2 | `post_reactions.reaction_type` + CHECK `IN ('praying','candle')` | Spec 3.1 changeset 016 | Phase 6.6 Answered Wall (adds 'praising', 'celebrate' — must ALTER not recreate) |
| 3 | `posts.{praying,comment,bookmark,report}_count` denormalized counters | Spec 3.1 changeset 014 | Phase 6.6, 8.4 (assume existence) |
| 4 | `qotd_questions` | Spec 3.1 changeset 019 (NOT 3.9) | Spec 3.9 |
| 5 | `post_reports.review_consistency` CHECK relaxed | Spec 3.1 changeset 020 | Phase 10.x moderation specs |
| 6 | `friend_relationships`, `friend_requests`, `social_interactions`, `milestone_events` | Spec 2.5.1 changesets 009–012 | Phase 6.x/7.x/8.x/12.x/13.x |
| 7 | `user_mutes` | Spec 2.5.7 changeset 013 | Spec 2.5.6 must create separate `user_blocks` |
| 8 | `users.terms_version`, `users.privacy_version` | NOT YET SHIPPED (despite tracker ✅) | Phase 1.5b/c/d/e/g, Phase 4-16 |
| 9 | `users.email_verified_at` | NOT YET SHIPPED (1.5d deferred) | Phase 4 specs assume `@RequireVerifiedEmail` gate exists |
| 10 | `users.is_deleted, deleted_at, is_banned` | Spec 10.11 (planned) | Spec 8.4 mentions deleted-user rendering — sequencing |
| 11 | `admin_audit_log` | Spec 10.10 (planned) | Specs 10.7b, 10.11 hard-depend — must precede |

---

## H. Cross-cutting patterns

### H.1 — "Master plan body left as-was; Addendum carries the truth"

Phase 1 and Phase 2 each have an Execution Reality Addendum at the top of the master plan (lines 22 and 129). Both addendums explicitly mark themselves as authoritative over older spec body text. This is a **deliberate and documented pattern**. The trade-off: future spec authors who only read their phase's spec section land on stale text.

**Phase 3 has no equivalent addendum.** The inline Phase 3.6 and Phase 3.7 addendums cover specific spec edits but don't capture cross-spec conventions (L1-cache trap, `@Modifying` flags, method-specific SecurityConfig ordering, EditWindow 409, `PostsRateLimitConfig`/`PostsIdempotencyService`/`CrisisAlertService` shapes, INTERCESSION ActivityType).

**Phase 2.5 has no addendum at all** — Specs 2.5.6 (Block) and 2.5.7 (Mute) are absent from the master plan body entirely (only present in tracker).

### H.2 — Documentation-only spec footprint

Specs 1.10h and 1.10i shipped as documentation files (`backend/docs/api-error-codes.md`, `env-vars-runbook.md`) without spec/plan files in `_specs/forums/` or `_plans/forums/`. Spec 1.10m partially shipped (markdown only, no route). This is undocumented as a pattern — it's unclear whether docs-only specs intentionally skip the spec/plan pipeline or whether spec authoring was simply skipped.

### H.3 — Cleanup path for the false ✅s

Three specs marked ✅ in the tracker are not fully shipped:

- **Spec 3.8 (Reports Write Endpoint)** — revert to ⬜. No code or content shipped.
- **Spec 1.10f (Terms of Service and Privacy Policy Surfaces)** — partial-shipped. Either revert to ⬜ or add a "PARTIALLY SHIPPED" annotation: legal markdown is canonical; consent checkbox + `terms_version`/`privacy_version` columns + endpoints + modal deferred. **User-impactful** because new registrations are not capturing legal consent.
- **Spec 1.10m (Community Guidelines Document)** — markdown shipped; route + page component deferred. `12-project-reference.md` route table needs the entry moved from "Already shipped" to "Forums Wave will add."

### H.4 — Top 3 most-urgent fixes (about to bite)

1. **Spec 3.9 master plan body** — when authored, will trip on (a) 60 vs 72 question count, (b) `com.worshiproom.qotd` vs existing `com.worshiproom.post.QotdQuestion` package, (c) modulo-60 algorithm vs liturgical-season-aware rotation, (d) attempting to recreate the `qotd_questions` table that Spec 3.1 already shipped.
2. **Phase 6.6 Answered Wall** — adds 'praising', 'celebrate' reaction types. Will trip on the CHECK constraint introduced by Spec 3.1 changeset 016 unless the constraint is ALTERed (not recreated).
3. **Tracker** — fix Spec 3.3 row (line 95 empty), revert Spec 3.8 to ⬜, decide what to do with the partial-shipped 1.10f and 1.10m (probably revert to ⬜ until the full functionality lands).

### H.5 — Recommended new convention propagations

Phase 3 deserves an Execution Reality Addendum that hoists these conventions (used by 3+ shipped specs but documented only in spec bodies):

1. **Edit-window 409 convention** + exempt operations list
2. **L1-cache trap fix** (`entityManager.refresh()` after save+flush)
3. **`@Modifying(clearAutomatically=true, flushAutomatically=true)`** on bulk-update repos
4. **Method-specific SecurityConfig rule ordering** above `OPTIONAL_AUTH_PATTERNS.permitAll()`; AntPathMatcher single-segment caveat
5. **Caffeine-bounded bucket pattern** for any external-input-keyed cache
6. **`DUMMY_HASH` anti-enumeration timing-equalization**
7. **Domain-scoped `@RestControllerAdvice` + unscoped companion advice for filter-raised exceptions**
8. **`PostsRateLimitConfig` `@ConfigurationProperties` shape** for per-feature config
9. **Idempotency service vs composite-key DB constraint** pattern dichotomy
10. **`CrisisAlertService.alert(contentId, authorId, ContentType)` unified entry point**
11. **Liquibase changeset filename convention** (today's date, next sequence; never literal placeholders)
12. **Reactive store consumer Pattern A/B + BB-45 cross-mount subscription test** for new multi-consumer localStorage features

---

## I. New files / structural changes recommended (proposals only — Pass 2 will decide)

These are structural recommendations surfaced during discovery. None are applied yet.

1. **Phase 3 Execution Reality Addendum** — new section at top of master plan around line 250 (mirroring Phase 1 + 2), absorbing the conventions in H.5.
2. **Possible new rule file** `13-state-management.md` — moves "Reactive Store Consumption" out of localStorage-keys file (where it's misfiled). Or merge `11b` back into `11`.
3. **Updated handoff prompt** — replace body with 5-line redirect to spec-tracker, CLAUDE.md, `_specs/forums/`.
4. **`03-backend-standards.md` additions** — `@Modifying` convention, L1-cache-trap warning, SecurityConfig ordering, domain-scoped advice rule.
5. **`02-security.md` additions** — bounded idempotency caches, `DUMMY_HASH` pattern, `CrisisAlertService` integration contract.
6. **`05-database.md` updates** — Canonical Table Registry split for shipped vs future columns; Phase 2.5/Phase 3 attribution corrections.

---

## End of inventory

**Pass 2 (Proposed Edits)** will turn approved findings into surgical find-and-replace edits, output to `_audits/2026-04-28-doc-reality-proposed-edits.md`.

**Pass 3 (Apply)** will apply approved edits to the docs themselves, with before/after snippets logged in `_audits/2026-04-28-doc-reality-applied.md`.

**Awaiting Eric's review** of this inventory. Triage notes welcome — items that should be deferred or merged are easier to handle now than during the edit pass.
