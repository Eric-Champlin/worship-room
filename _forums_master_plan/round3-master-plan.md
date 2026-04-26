# Worship Room — Phase 3: Forums Wave Master Plan

**Version:** 2.9
**Date:** April 23, 2026
**Supersedes:** v2.8 (April 22, 2026)
**Scope:** Prayer Wall + User Profiles + Activity Engine backend integration. First wave of CLAUDE.md's official Phase 3 (Auth & Backend Wiring). Other features (Daily Hub, Bible, Music, Grow, Local Support) remain on localStorage and migrate in later waves.

**Author context:** Drafted by Claude in conversation with Eric Champlin, based on three Prayer Wall recons, a Profile/Dashboard recon, two rounds of competitor research, and a comprehensive codebase audit (CLAUDE.md, all 11 rule files in `.claude/rules/`, the actual `usePrayerReactions.ts` / `AuthContext.tsx` / `PrayerCard.tsx` / `InteractionBar.tsx` / `prayer-wall-mock-data.ts` / `types/prayer-wall.ts`, the existing `backend/` skeleton, and the existing `prayer-wall-redesign.md` / `prayer-wall-question-of-day.md` / `prayer-wall-category-filter.md` / `prayer-wall-category-layout.md` / `friends-system.md` / `notification-system.md` / `bb45-verse-memorization-deck.md` specs), and 16 architectural decisions made by Eric.

---

## How to Use This Document

**If you are Eric:** This is the single reference document for the entire Forums Wave effort. Skim the Quick Reference section first to lock in the shape — it is deliberately short. Then if you want to push back on whole-project decisions before specs land, read the Architectural Foundation section. The Phase sections are a menu, not required reading — consult them when you want to know what is coming or what is done. Treat this as a living document: when something changes mid-wave, update this file in your repo and the Change Log at the bottom.

**If you are Claude Code:** Before executing any Forums Wave spec, load this document and read at minimum the **Quick Reference** section at the top. It contains the architectural decisions, naming conventions, API contract conventions, and BB-45 anti-pattern enforcement that every spec assumes. Read the relevant **Phase** section only if your spec sits inside that phase and you need more context. Do NOT attempt to hold the entire document in working memory — use the Quick Reference as your primary anchor and consult phase-specific sections as needed. **Critical rules:** never commit, never push, never run `git checkout` — Eric handles all git operations manually.

**For both:** This is a living document. If any decision in here changes mid-wave, the plan gets updated and the file in the repo gets replaced with the new version. Major changes are recorded in the Change Log at the bottom.

---

## Phase 1 Execution Reality Addendum (v2.9, added 2026-04-23)

> **Why this section exists:** Specs 1.1 through 1.8 have shipped. Several of them surfaced real divergences from the original spec text in this document — not "mistakes" but discoveries that only the actual execution could reveal. This addendum consolidates those divergences so future spec authors and CC don't have to re-discover them. Individual spec bodies below may still show the pre-execution text; trust THIS section over the older spec text where they disagree.
>
> **Scope:** Phase 1 only (Specs 1.1–1.8). Phase 2+ specs are unaffected by these findings except where called out explicitly.

### 1. Testcontainers pattern — two base classes, not one (Spec 1.7 execution)

**Pre-execution assumption:** A single `AbstractIntegrationTest` base class annotated `@SpringBootTest` would serve all integration tests.

**Execution reality:** `@DataJpaTest` (slice test) and `@SpringBootTest` (full context) are mutually exclusive annotations. `UserRepositoryTest` required slice-test semantics, so a sibling `AbstractDataJpaTest` was added. Both base classes share a singleton PostgreSQL container via a `TestContainers` utility class (started once per JVM run).

**Canonical pattern (post-Spec-1.7):**
- `backend/src/test/java/com/worshiproom/support/TestContainers.java` — singleton `public static final PostgreSQLContainer<?> POSTGRES`, started in a `static {}` block
- `backend/src/test/java/com/worshiproom/support/AbstractIntegrationTest.java` — `@SpringBootTest`, registers JDBC properties via `@DynamicPropertySource`
- `backend/src/test/java/com/worshiproom/support/AbstractDataJpaTest.java` — `@DataJpaTest + @AutoConfigureTestDatabase(replace = Replace.NONE)`, same pattern

`.claude/rules/06-testing.md` was updated during Spec 1.7 execution to document the two-base-class pattern. Authoritative.

**Test suite runtime baseline:** ~97 seconds (not ≤40 seconds as Spec 1.7's body originally claimed). The ≤40s target was written before empirical measurement; container startup reduction from 5→1 only saves ~5s of the ~90s baseline. Remaining runtime is dominated by Spring context boot across ~19 distinct contexts. Hitting <40s would require Surefire parallelism, explicitly out of scope for Phase 1. **Future specs must anchor runtime targets off ~97s, not 40s.**

### 2. `application-test.properties` does NOT exist (Spec 1.8 execution)

**Pre-execution assumption** (Decision 10, Spec 1.8 brief): Tests run with `application-test.properties` active, which would carry `spring.liquibase.contexts=test`.

**Execution reality:** No `application-test.properties` file exists in the repo. Tests inherit the dev profile by default via `spring.profiles.default=dev` in `application.properties`. Without intervention, adding `spring.liquibase.contexts=dev` to `application-dev.properties` (as Spec 1.8 did) would leak the 5 dev-seed users into every test run — breaking `userRepository.deleteAll()` assumptions silently.

**Canonical mitigation (post-Spec-1.8):** Both `AbstractIntegrationTest` and `AbstractDataJpaTest` register a second `@DynamicPropertySource` method that pins `spring.liquibase.contexts=test` for test runs. Spring aggregates `@DynamicPropertySource` methods across the inheritance hierarchy, so subclass-specific property registrations (like `jwt.secret`) still layer on top without conflict.

**Decision 10 correction:** The "`application-test.properties`: `spring.liquibase.contexts=test`" line in Decision 10 below should be read as "enforced via `@DynamicPropertySource` in the Testcontainers base classes" — the file itself does not exist. If a future spec creates `application-test.properties`, the override in the base classes can be removed; until then, the base-class override is the canonical mechanism.

### 3. Liquibase timestamp gotcha — use `valueComputed`, not `valueDate` (Spec 1.8 execution)

**Pre-execution assumption:** `valueDate="2026-01-15T10:00:00Z"` would populate a `TIMESTAMP WITH TIME ZONE` column correctly.

**Execution reality:** Liquibase's `ISODateFormat` does NOT parse the `Z` suffix; it passes the value through as a raw SQL literal, producing `ERROR: trailing junk after numeric literal`. Dropping the `Z` "works" but makes the stored UTC timestamp depend on the developer's JVM default timezone (observed +6h drift on the execution machine).

**Canonical pattern (post-Spec-1.8):** Use `valueComputed="TIMESTAMP WITH TIME ZONE '2026-01-15 10:00:00+00'"` for any seed timestamp that must be reproducible across JVM timezones. **Never use `valueDate` with a `Z` suffix.** Future seed specs must apply this pattern.

### 4. BCrypt hash generation pattern for seed data (Spec 1.8 execution)

**Canonical pattern:** BCrypt salts are random, so no stable hash can be embedded at planning time. The working pattern:

1. During planning, generate the real hash via a throwaway test method (e.g., a `BCryptHashGenerator` class with `@Test` and `System.out.println(encoder.encode("password"))`)
2. Run the generator once, copy the hash into the Liquibase changeset wrapped in `<![CDATA[...]]>`
3. Delete the generator in the next planning step (it has served its purpose)
4. Post-execution, verify with `grep -c '$2a$10$<prefix>' <changeset>` — expected count matches the seed user count

**Never ship placeholder hashes in seed data.** Unlike the `DUMMY_HASH` pattern in Spec 1.5 (which equalizes login timing for non-existent emails), seed-data hashes must be real and verifiable against the plaintext.

### 5. AuthModal timezone capture re-homed (Spec 1.5, Spec 1.6, Spec 1.3b ripple)

**Pre-execution intent (Spec 1.3b):** AuthModal captures browser timezone via `Intl.DateTimeFormat().resolvedOptions().timeZone` and sends it on registration.

**Execution reality:** Spec 1.5 shipped as backend-only (no frontend AuthModal changes). The timezone-capture wiring was re-homed to Spec 1.9 (Frontend AuthContext JWT Migration) because that's the first spec that actually touches AuthModal. Spec 1.6 added the `PATCH /api/v1/users/me` timezone-update endpoint that Settings will eventually consume.

**Action required:** Spec 1.9's plan MUST include a step to add `Intl.DateTimeFormat().resolvedOptions().timeZone` to the register POST body. Spec 1.9b (Error & Loading Design System) explicitly excludes AuthModal integration from its scope — that belongs to 1.9.

### 6. Spec 1.9b scope is audit-first, not greenfield (Spec 1.9b brief)

**Pre-execution assumption (master plan Phase 1 body):** Spec 1.9b creates a new error/loading/empty-state design system from scratch in `components/common/`, and lands AFTER Spec 1.9.

**Post-recon reality:**
- Existing `frontend/src/components/ui/` already contains `Button`, `FormField`, `Toast`, `WhisperToast`, `FeatureEmptyState`, `ChartFallback`, `CharacterCount`
- Existing `frontend/src/components/skeletons/` contains 13 page-specific skeletons + 4 atomic primitives
- Existing `frontend/src/components/` contains `ErrorBoundary`, `ChunkErrorBoundary`, `RouteErrorBoundary`
- `components/common/` does NOT exist — the master plan guessed wrong about the directory

**Canonical scope for Spec 1.9b:**
1. **Audit** existing error/loading/empty components — produce a component-state matrix (feature area × state) that names which existing component serves which state OR marks GAP
2. **Fill** only the gaps the audit proves exist (may be zero new components — a valid outcome)
3. **Document** the entire system in `.claude/rules/09-design-system.md` as a new "Error, Loading, and Empty States" section
4. **Copy-audit** every user-facing string in existing and new components against the 6-point Anti-Pressure Copy Checklist
5. **Verify** via `/verify-with-playwright` at 3 viewports (375/768/1440) — first spec in the wave where this workflow is exercised

**Component location:** New components go in `frontend/src/components/ui/` (NOT `components/common/` which does not exist).

**Prereq order:** Spec 1.9b lands BEFORE Spec 1.9 so 1.9 can consume the documented patterns rather than inventing its own ad-hoc. The tracker shows 1.9 before 1.9b; the execution order is 1.9b → 1.9.

**AuthModal integration is NOT in 1.9b scope.** That's Spec 1.9's territory (see #5 above).

### 7. "Effort" terminology — `xhigh`, not "Max effort"

Eric's Claude Max subscription gives him access to Claude Opus 4.7. The effort slider for that model has values including `xhigh`. When specs or notes reference "high-stakes specs run at xhigh effort," that refers to the effort slider, NOT the subscription tier. Do not conflate.

### 8. CC execution discipline (observed across Phase 1)

- **CC never commits, pushes, or checks out.** Eric handles all git operations manually. Pre-existing per-rule, reinforced by every Phase 1 spec.
- **CC proactively flags argument mismatches.** Spec 1.8's `/code-review` invocation with the wrong spec argument was caught by CC before wasting a review pass. This is the desired behavior — don't suppress it.
- **Stale processes from pre-Spec-1.1 builds** (`com.example.worshiproom.WorshipRoomApplication`) occasionally occupy port 8080 from earlier dev sessions. Safe to kill by PID. Not a regression.

### 9. Spec tracker discipline

Eric updates `_forums_master_plan/spec-tracker.md` MANUALLY after each spec ships. CC does not edit the tracker. The tracker is the canonical source of "what's ✅ vs ⬜" — trust it over memory, trust it over this addendum, trust it over spec bodies.

### 10. "Master Plan Divergence" section required in all future briefs (Spec 1.9b authoring observation)

**Observation:** Spec 1.9b's brief deviated from this document's Phase 1 body text in four ways: scope framing (audit-first vs greenfield), component location (`components/ui/` vs this document's guessed `components/common/`), prereq order (1.9b BEFORE 1.9, not after), and scope exclusion (AuthModal integration deferred to Spec 1.9, not bundled into 1.9b). CC's `/spec-forums` skill correctly flagged the divergence during recon and asked how to reconcile. That's the desired behavior — but it could have been prevented upstream by the brief itself.

**Convention going forward:** Every brief that deviates from this document's current text for its spec MUST include a **"Master Plan Divergence"** section near the top (after Goals, before Scope) that enumerates each deviation as (a) what the master plan currently says, (b) what the brief says instead, (c) why. CC's `/spec-forums` skill then has authoritative reconciliation guidance baked into the brief; no mid-recon reconciliation conversation needed.

**Why drift is expected:** This document is a planning artifact, not a live source of truth. It was authored at versioned points in time (v2.0 → v2.9) based on the state of the codebase at those moments. Between then and when a spec executes, the codebase changes — Round 2 polish shipped skeletons / Toast / WhisperToast / FeatureEmptyState; earlier Phase 1 specs reshaped the backend package structure; and so on. Drift is not a bug — it's evidence the plan was reasonably optimistic about what would still be valid by execution time.

**Batch-update cadence:** This document gets a **v3.0 reconciliation pass post-Phase-1-cutover (after Spec 1.10 ships)** that absorbs all Phase 1 execution learnings into the spec bodies themselves. Until then, this v2.9 addendum + the individual committed spec files under `_specs/forums/` + the per-brief "Master Plan Divergence" section together cover the gap. Do not attempt per-spec inline updates to this document during Phase 1 — the addendum exists precisely to avoid that churn.

---



## Quick Reference

> **This section is deliberately short so Claude Code can load it cheaply at the start of every spec execution. Everything in here is authoritative; everything in the rest of the document elaborates on what is already stated here.**

### What the Forums Wave Is

The Forums Wave is the first slice of CLAUDE.md's official Phase 3 (Auth & Backend Wiring). It revamps the Prayer Wall and unified user Profiles, ships the first real backend integration (Spring Boot + PostgreSQL + Liquibase + JWT auth), migrates the activity engine and friends system to the backend in dual-write mode, expands Prayer Wall to five post types, layers in twelve hero features, weaves Prayer Wall into Bible / Music / Daily Hub / Local Support, and adds moderation / community-warmth / search / notifications / personal analytics / onboarding / email-push / PWA / accessibility / performance from the start. **156 specs across 19 phases**, executed in dependency order. Other features (Daily Hub data, Bible data, Music data) remain on localStorage during this wave and migrate in later waves of Phase 3.

### The Nineteen Phases

| #   | Phase                                     | Purpose                                                                                                                                                                                         | Approx. specs |
| --- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| 0   | Backend Foundation Learning               | Teaching document Eric reads before any backend work                                                                                                                                            | 1             |
| 0.5 | Reaction Persistence Quick Win            | Convert `usePrayerReactions` to a reactive store (no backend needed). Ships day 1.                                                                                                              | 1             |
| 1   | Backend Foundation                        | Audit existing skeleton, rename group ID, add Liquibase / Spring Security + JWT / OpenAPI / Testcontainers, full auth lifecycle (password reset, change password, email verification, change email, account lockout, session invalidation), production hardening (security headers, error code catalog, env var runbook, liveness/readiness, HikariCP tuning, Playwright E2E, community guidelines), end-to-end roundtrip                                                                | 30            |
| 2   | Activity Engine Migration (Dual-Write)    | Points / streaks / badges / grace / grief pause on backend with dual-write strategy                                                                                                             | 10            |
| 2.5 | Friends Backend Migration                 | `wr_friends` data and friend request flow to backend, block + mute user features                                                                                                                                                    | 8             |
| 3   | Prayer Wall Data Migration                | Posts / comments / reactions / bookmarks / reports / QOTD on backend, frontend service swap, **fixes the reaction bug for cross-device**                                                        | 12            |
| 4   | Post Type Expansion                       | Prayer Request polish, Testimony, Question, Devotional Discussion, Encouragement, Composer Chooser, Room Selector                                                                               | 10            |
| 5   | Visual Migration to Round 2 Brand         | FrostedCard, HorizonGlow, 2-line headings, animation tokens, ring colors                                                                                                                        | 6             |
| 6   | Hero Features                             | Prayer Receipt, Quick Lift, Night Mode, 3am Watch, Intercessor Timeline, Answered Wall, Shareable Testimony Cards, Verse-Finds-You                                                              | 14            |
| 7   | Cross-Feature Integration                 | Bible ↔ Wall, Music ↔ Wall, Daily Hub rituals, Privacy tiers, Local Support bridges                                                                                                             | 8             |
| 8   | Unified Profile System                    | Username, URL merge to `/u/:username`, Summary/Activity tabs, name canonicalization, customization                                                                                              | 9             |
| 9   | Ritual & Time Awareness                   | Liturgical theming, Sunday Service Sync, time-of-day copy, Candle Mode                                                                                                                          | 5             |
| 10  | Community Warmth & Moderation             | First Time badges, Welcomer role, presence cues, Discourse-style trust levels, 7 Cups three-tier escalation, automated flagging, moderation queue, appeal flow, rate limiting, admin foundation + audit log viewer | 13            |
| 11  | Search & Discovery                        | Full-text post search, find by author, find by verse reference, find by date                                                                                                                    | 4             |
| 12  | Notification Taxonomy                     | 14-type notification catalog (7 inherited + 7 prayer-specific/lifecycle types) + notification preferences + 30-day archive / 90-day delete policy                                               | 5             |
| 13  | Personal Analytics & Insights             | Year-in-review, prayer journey insights, intercession patterns                                                                                                                                  | 4             |
| 14  | Onboarding & Empty States                 | First-visit walkthrough, suggested first action, find-your-people friend suggestions, warm empty states                                                                                         | 4             |
| 15  | Email & Push Notifications                | SMTP for comment replies (digest-style), push notification wiring (extends BB-41)                                                                                                               | 5             |
| 16  | PWA, Offline, Performance & Accessibility | Cached recent feed + offline banner, queued posts, error boundaries, Lighthouse 90+/95+ for Prayer Wall, BB-35-style accessibility audit                                                                                                           | 7             |

**Total:** 156 specs.

### Architectural Decisions (the TL;DR)

These are the whole-project decisions that every spec assumes. Full rationale lives in the Architectural Foundation section below.

1. **Tech stack matches CLAUDE.md exactly.** Maven + Spring Boot 3.5.11 + Java 21 + Spring Data JPA + Spring Security + JWT + Liquibase + PostgreSQL + Testcontainers + JUnit 5. NOT Gradle, NOT Spring Data JDBC, NOT Firebase Auth, NOT `application.yml` (use `application.properties` to match what is already in the repo).

2. **The backend skeleton has EXPANDED significantly since v2.6.** Phase 1 audits and extends `backend/` rather than creating it from scratch — and the "existing" surface is now much larger than v2.6 described. **Current state (post-Key-Protection-Wave, April 22 2026):** the backend contains the proxy layer at `com.example.worshiproom.proxy.*` with ~60+ files across four subpackages (`proxy.common`, `proxy.ai`, `proxy.maps`, `proxy.bible`), ~280 backend tests green, `RateLimitFilter` + `RequestIdFilter` ordered at `HIGHEST_PRECEDENCE`, `ProxyExceptionHandler` + `RateLimitExceptionHandler`, `WebClient` bean with request timeouts, `application-dev.properties` (with rate-limit tuning and two narrow log suppressions per `07-logging-monitoring.md` § Framework Log Suppression), `application-prod.properties`, `openapi.yaml` with shared schemas and 10+ proxy endpoints, and the `/api/v1/health` endpoint already exists reporting `providers.gemini.configured`, `providers.googleMaps.configured`, `providers.fcbh.configured`. **What still holds from v2.6:** group ID is `com.example.worshiproom`; Phase 1 renames it to `com.worshiproom` for production identity. **What changed from v2.6:** Phase 1 Spec 1.1's rename scope went from ~3 files to ~60+ files; its Size is now L (not S) and Risk is Medium (not Low) because filter ordering + WebClient config + the three proxy services must survive the refactor without regression. See the v2.7 rewrite of Spec 1.1 below.

3. **Auth is JWT, not Firebase.** Spring Security + JWT + BCrypt + 1-hour tokens + 12-char password minimum + anti-enumeration on registration + rate-limited login. The existing `AuthContext.tsx` keeps its `useAuth()` interface unchanged for the 121 consumers — only the internal implementation swaps. The `login(name)` signature changes to `login(email, password)` and ~5-10 call sites (the AuthModal, dev login button, welcome wizard) need updates. The 121 consumers that only read `user.name` and `user.id` do NOT change.

4. **Canonical user model lives on the backend.** One `users` table is the source of truth, with `first_name`, `last_name`, `display_name_preference` (enum), `custom_display_name`, and the derived `display_name` computed server-side. The frontend's four-way naming inconsistency (auth context, PrayerWallUser, FriendProfile, leaderboard) is fixed by centralizing resolution. The existing `users` schema in `.claude/rules/05-database.md` is the starting point and gets extended in Phase 1.

5. **One `posts` table holds all five post types**, discriminated by a `post_type` enum column. Prayer Request, Testimony, Question, Devotional Discussion, Encouragement. Shared infrastructure for comments, reactions, bookmarks, reports, moderation. Type-specific behavior lives in nullable columns. **This deliberately diverges from the `prayer_requests` / `prayer_replies` / `prayer_bookmarks` / `prayer_reports` table names mentioned in `prayer-wall-redesign.md`** — that older spec was written before post type expansion was on the table. The unified `posts` table is the new contract; the old spec is superseded. **The `post_reactions` table includes a `reaction_type VARCHAR(20) NOT NULL` column with a CHECK constraint allowing values `'praying'` and `'candle'`** — Light a Candle is a distinct reaction type from Praying (warm amber color, ripple animation, separate count) inherited from the existing `prayer-wall-redesign.md` spec. Both reaction types are first-class in the schema. The post_reactions PRIMARY KEY is `(post_id, user_id, reaction_type)` so a single user can both pray AND light a candle for the same post (independent toggles, independent counts). Future reaction types (e.g., "amen") may be added by amending the CHECK constraint; folding into a generic emoji-reaction system is explicitly out of scope for the Forums Wave.

6. **The activity engine migrates in dual-write mode.** `recordActivity()` calls write to BOTH localStorage (existing `wr_daily_activities`, `wr_faith_points`, `wr_streak`, `wr_badges`, `wr_streak_repairs`) AND the backend (`POST /api/v1/activity`). localStorage is the source of truth for reads during this wave. The backend gets populated as a shadow copy that future waves can promote to the source of truth. Blast radius is minimized — if the backend hiccups, every feature still works from localStorage. The `wr_streak_repairs` key (introduced by the existing `streak-repair-grace.md` spec — 1 free repair/week, 50 points after) MUST be included in the dual-write set; backend `streak_state` schema accommodates `grace_days_used`, `grace_week_start`, and `grief_pause_until` per Decision 5's schema.

7. **Friends system migrates to the backend in Phase 2.5** (between activity engine and Prayer Wall). Same dual-write strategy. The `wr_friends` data structure is preserved on the frontend; the backend gets a copy. Friends backend is required so Phase 7's "friends pin to top of Prayer Wall feed" can work cross-device.

8. **The reaction bug is fixed in Phase 0.5 BEFORE backend work starts.** Convert `usePrayerReactions` from `useState(getMockReactions())` to a reactive store with `useSyncExternalStore` (Pattern A from `.claude/rules/11-local-storage-keys.md`), persisting to a new `wr_prayer_reactions` localStorage key. Cross-page consistency works immediately. When Phase 3 lands the backend, the localStorage adapter swaps under the same hook signature with zero changes to consumer components. **This is a one-day quick win that removes the worst current Prayer Wall bug while the bigger phases are in flight.**

9. **Profile pages merge at `/u/:username`** with 301 redirects from `/profile/:userId` and `/prayer-wall/user/:id`. Discourse-inspired Summary tab + Activity tabs (Prayer Wall, Growth, Bible, Friends). Three-tier privacy (private / friends / public) per section. Username system is new (Phase 8.1) and replaces UUID-based URLs.

10. **Moderation is built in from day one, not bolted on later.** Phase 10 lands automated phrase flagging (extending the existing `containsCrisisKeyword` system), Discourse-style trust levels, 7 Cups three-tier escalation (green / yellow / red), peer moderator queue, and admin foundation (`is_admin` column, `admin_audit_log` table, helper). The actual admin UI is deferred to a future wave — Phase 10 just builds the column and audit log so future admin specs are not blocked.

11. **Save-to-prayer-list is a separate feature from Prayer Wall bookmark.** The existing `Save` button on `InteractionBar` adds a Prayer Wall post to the user's personal `/my-prayers` page (a prayer reminder system). The `Bookmark` button adds it to the user's Prayer Wall bookmarks (visible in PrayerWallDashboard's Bookmarks tab). These are two different features and the Forums Wave preserves both. v1 conflated them — v2 documents them as distinct.

12. **The 10 existing categories are preserved.** Health, Mental Health, Family, Work, Grief, Gratitude, Praise, Relationships, Other, Discussion. Categories are NOT user-creatable. The `Discussion` category is reserved for QOTD responses. The `Mental Health` category was added in `prayer-wall-category-layout.md` and v1 missed it entirely. **Discussion category special semantics (preserved from existing `prayer-wall-question-of-day.md` spec):** when the user filters by Discussion, QOTD responses appear; when the user filters by ANY OTHER category (Health, Family, etc.), QOTD responses are EXCLUDED from the feed (they are discussion content, not prayer requests); when "All" filter is active, QOTD responses appear inline with prayer requests. Backend feed queries MUST honor these semantics — `GET /api/v1/posts?category=health` excludes posts with `qotd_id IS NOT NULL`; `GET /api/v1/posts?category=discussion` includes them; `GET /api/v1/posts` (no filter) returns both.

13. **QOTD already exists and gets MIGRATED, not built.** The 60 existing questions across 6 themes (faith_journey, practical, reflective, encouraging, community, seasonal) move to a backend table in Phase 3. The day-of-year modulo rotation logic moves to the backend. Frontend reads "today's question" from the API. **The following details from the existing `prayer-wall-question-of-day.md` spec MUST be preserved during migration:** (a) each question record includes an optional `hint` field — a 1-sentence conversation-starter prompt rendered in Lora italic below the question; (b) response count UX shows "X responses" / "1 response" / "Be the first to respond" — tapping the count scrolls to the first QOTD response in the feed (or opens the composer if zero); (c) QOTD response cards display a "Re: Question of the Day" badge above the author name (small pill, primary-tinted styling); (d) the QOTD composer is intentionally simpler than the Prayer Wall composer — no anonymous toggle, no category selector (responses are auto-tagged `category='discussion'` with `qotd_id` foreign key); (e) posting a QOTD response triggers `recordActivity('prayerWall')` for faith points (same 15 points as a regular Prayer Wall reaction). The backend `qotd_questions` table schema must include `id`, `text`, `theme`, and nullable `hint` columns.

14. **Reactive store pattern (BB-45) is mandatory for any new state in Prayer Wall.** New stores prefer Pattern A (standalone hook with `useSyncExternalStore`) per `.claude/rules/11-local-storage-keys.md`. Tests for reactive store consumers MUST verify subscription behavior (mutate the store after mount, assert re-render), not just initial render. The BB-45 anti-pattern (snapshot-without-subscribe) is forbidden in all new code.

15. **API contract follows project standards.** Success: `{ data, meta: { requestId } }`. Error: `{ code, message, requestId, timestamp }`. Headers: `X-Request-Id`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, `Retry-After` on 429s. Pagination: `?page=1&limit=20`. Versioned as `/api/v1/` from day one. Generated TypeScript types from OpenAPI spec, never hand-written. Full conventions in `.claude/rules/03-backend-standards.md`.

16. **Existing components are extended, not rebuilt.** `PrayerCard`, `InteractionBar`, `InlineComposer`, `CommentsSection`, `CommentInput`, `CommentItem`, `Avatar`, `CategoryBadge`, `CategoryFilterBar`, `AnsweredBadge`, `MarkAsAnsweredForm`, `ReportDialog`, `DeletePrayerDialog`, `ShareDropdown`, `AuthModal`, `AuthModalProvider`, `PageShell`, `PrayerWallHero`, `QotdBadge`, `QotdComposer`, `QuestionOfTheDay`, `SaveToPrayersForm` — all already exist in `frontend/src/components/prayer-wall/`. Specs that touch these components extend them rather than replacing them. New post types (Phase 4) extend the existing card and composer patterns rather than creating parallel components.

### Inheritance Acknowledgments

The Forums Wave inherits significant prior work from earlier waves. This section is the canonical map of what is inherited, what is superseded, and what is preserved. CC must consult this section before assuming any feature is greenfield.

**Existing specs SUPERSEDED by this Master Plan (the older spec is partially or fully invalidated):**

- `prayer-wall-redesign.md` storage section (table names `prayer_requests` / `prayer_replies` / `prayer_bookmarks` / `prayer_reports`) → SUPERSEDED by Decision 5's unified `posts` family. CC must use the new table names. The visual/UX requirements in the original spec are otherwise PRESERVED.
- `prayer-wall-redesign.md` AI Safety section ("crisis detection deferred") → SUPERSEDED by Universal Spec Rule #13 which makes crisis detection MANDATORY on all post and comment writes. The existing frontend `containsCrisisKeyword()` function is a courtesy fast-path; the authoritative check is server-side. This is a deliberate policy upgrade, not a contradiction.
- `prayer-wall-redesign.md` `/prayer-wall/dashboard` private dashboard route → DEPRECATED by Phase 8's unified `/u/:username` profile system. The dashboard route 301-redirects to `/u/:username` for the user's own profile (with edit-mode when viewer === owner). My Comments / Bookmarks / Reactions become subsections of the user's own profile with privacy gates. Settings move to `/settings`. See Phase 8 for the migration spec.

**Existing specs INHERITED and PRESERVED (the Forums Wave builds on them, does not replace them):**

- `prayer-wall-category-filter.md` — original 8 categories, sticky filter bar, URL-based filter state, category badges on cards. PRESERVED.
- `prayer-wall-category-layout.md` — `mental-health` category (10th), single-row layout, scroll fade gradient. PRESERVED.
- `prayer-wall-question-of-day.md` — 60 questions, 6 themes, optional `hint` field, response count UX, "Re: Question of the Day" badge, simpler composer, Discussion category integration. PRESERVED IN FULL during Phase 3.9 backend migration (see Patch 4 / Decision 13).
- `friends-system.md` — `/friends` page, mutual friend model, denormalized FriendProfile shape, search, invite-by-link, invite-by-email, pending requests, blocking, "People You May Know". PRESERVED. Phase 2.5 dual-writes the data to backend; UI is unchanged.
- `notification-system.md` — bell icon, notification panel, unread badge, 7 existing notification types (encouragement, friend_request, milestone, friend_milestone, nudge, weekly_recap, level_up), Mark all as read, dismiss, mock data seed, push notification stub. PRESERVED. Phase 12 EXTENDS the type catalog (see Decision 17 below).
- `personal-prayer-list.md` — `/my-prayers` page, `wr_prayer_list` localStorage key, max 200 items, "Pray for this" glow, answered prayer green left border. PRESERVED. NOT migrated to backend in this wave (deferred to a future wave; Save vs Bookmark distinction per Decision 11 is preserved).
- `liturgical-calendar-awareness.md` — 8 seasons, Computus algorithm, `useLiturgicalSeason` hook, dashboard greeting suffix, devotional/verse seasonal priority, landing page banner, navbar icon. PRESERVED IN FULL (client-side only, no backend involvement). Phase 9.1 EXTENDS this to Prayer Wall surfaces (seasonal QOTD prioritization, seasonal hero accents) — does NOT rebuild the underlying calendar logic.
- `dark-theme-prayer-wall-local.md` — `#0f0a1e` page background, `bg-white/[0.06]` content cards, `bg-white/[0.08]` structural elements, dark Local Support map tiles, frosted glass treatments across all Prayer Wall and Local Support routes. PRESERVED. Phase 5 EXTENDS this with Round 2 Brand patterns (FrostedCard component, HorizonGlow, 2-line headings, ring colors) — does NOT redo the dark theme conversion.
- `streak-faith-points-engine.md` — 6 activities (mood:5, pray:10, listen:10, prayerWall:15, meditate:20, journal:25), 4 multiplier tiers (1x/1.25x/1.5x/2x), 6 levels (Seedling/Sprout/Blooming/Flourishing/Oak/Lighthouse) at 0/100/500/1500/4000/10000, 30-second listen timer with reset-on-pause semantics. PRESERVED. Phase 2 ports this exact spec to backend; values must match exactly (see Decision 5 schema and Phase 2 spec descriptions).
- `streak-repair-grace.md` — 1 free repair/week, 50 points/repair after, `wr_streak_repairs` localStorage key, "Everyone misses a day. Grace is built into your journey." copy. PRESERVED. Phase 2 dual-writes `wr_streak_repairs` and mirrors repair logic on backend (see Patch 2).
- `social-interactions.md` — encouragements (3/friend/day, 4 presets), nudges (1/friend/week, ≥3 days inactive), milestone feed (10-15 mock events), weekly recap card. PRESERVED. Phase 2.5 dual-writes `wr_social_interactions` and `wr_milestone_feed` (see Patch 7). Phase 12 wires notifications generated by these interactions into the consolidated taxonomy.
- `leaderboard.md` — Friends board (with avatars, streaks, levels), Global board (display name + weekly points only — privacy-preserving, no avatars), `wr_leaderboard_global`, profile popup on Global board tap (level + badges only). PRESERVED. Phase 8's unified `/u/:username` profile MUST respect Global board privacy: tapping a name on Global board opens the minimal popup, not the full profile page (only Friends-board taps and explicit profile-link taps go to the full profile).
- `local-support.md` and `local-support-enhancements.md` — three routes (Churches, Counselors, Celebrate Recovery), Google Places integration, search controls available to logged-out users, cross-feature CTAs from listing cards (Pray, Journal, Prayer Wall), "I visited" check-in (logged-in only), counselor disclaimer. PRESERVED. Phase 7.5 (Local Support bridges) ADDS the reverse-direction bridges from Prayer Wall TO Local Support — does NOT rebuild the existing forward bridges.

**The non-existent reference:** Several inherited specs reference `dashboard-growth-spec-plan-v2.md` as their Master Plan reference. This file does NOT exist in the repository — it was a working document name from the Phase 2.75 planning era that was never formalized. This is a documentation hole, not a functional bug. If CC encounters this reference while reading an inherited spec, treat it as equivalent to "Phase 2.75 wave (now superseded by this Forums Wave Master Plan for cross-cutting concerns)."

### Decision 17: Notification Taxonomy is 14 Types (Consolidated)

The existing `notification-system.md` spec ships 7 notification types in production. Phase 12 of the Forums Wave was originally drafted with 8 "new" types, several of which collide with or duplicate the existing types. This decision consolidates to a single canonical 14-type catalog.

**The 14 final notification types:**

1. `encouragement` — INHERITED. "[Name] sent: [preset message]". Tap → `/friends`.
2. `friend_request_received` — NEW (replaces and renames the existing `friend_request`). "[Name] wants to be your friend". Inline Accept/Decline buttons (no navigation on tap).
3. `friend_request_accepted` — NEW. "[Name] accepted your friend request". Tap → friend's profile at `/u/:username`.
4. `friend_milestone` — INHERITED. "[Name] hit a [N]-day streak!" or "[Name] leveled up to [Level]!" or "[Name] earned [Badge]!". Tap → `/friends`.
5. `milestone` — INHERITED. "You earned [Badge]!" or "You leveled up to [Level]!". Tap → dashboard.
6. `level_up` — INHERITED. "You leveled up to [Level]!". Tap → dashboard. (Note: `level_up` is a distinct type from `milestone` because it triggers a different celebration tier.)
7. `nudge` — INHERITED. "[Name] is thinking of you". Tap → dashboard.
8. `weekly_recap` — INHERITED. "Your weekly recap is ready". Tap → dashboard. (Note: this REPLACES Phase 12 v1's `weekly_digest` — same feature, existing name kept.)
9. `prayer_received` — NEW. "[Name] is praying for your post". Tap → the post detail page.
10. `comment_received` — NEW. "[Name] commented on your post". Tap → the post detail page, scrolled to the comment.
11. `reply_received` — NEW. "[Name] replied to your comment". Tap → the post detail page, scrolled to the reply.
12. `mention_received` — NEW. "[Name] mentioned you in a post" or "...in a comment". Tap → the post detail page, scrolled to the mention.
13. `prayer_answered_witness` — NEW. "[Name]'s prayer was answered: [praise text excerpt]". Fires when a post YOU prayed for is marked as answered. Tap → the post detail page.
14. `friend_posted` — NEW. "[Name] posted a new prayer request" (only fires for users who have opted in to friend-posted notifications via Spec 12.4 preferences). Tap → the post detail page.

**Deprecated from Phase 12 v1 (do NOT implement):**

- `weekly_digest` → use existing `weekly_recap` instead.
- `intercession_milestone` → covered by existing `milestone` with a `metadata.subtype` field.
- Original `friend_request` → renamed to `friend_request_received` for clarity.

**Notification lifecycle policy** (new in Decision 17):

- Notifications older than 30 days auto-archive (hidden from default panel view, accessible via "View archived" link).
- Notifications older than 90 days auto-delete from the database (background job runs nightly).
- The existing 50-notification cap in `notification-system.md` is REPLACED by this time-based policy — no hard count cap on the backend, only the time-based archival/deletion.

**"Mark all as read" and "Mark category as read"** — Phase 12 spec adds bulk operations: mark all as read (existing), plus a per-category "mark all encouragements as read" action when the panel is filtered by type. Phase 12.4 (notification preferences) adds opt-in/opt-out toggles per type.

**Notification digest batching** (opt-in) — Phase 12 spec adds a user preference: "Batch my notifications — send me a summary every 2 hours" instead of real-time. When enabled, individual notifications are queued and emitted as a single digest notification at the configured interval. Default is real-time. Stored in `wr_settings.notifications.digestInterval` (one of `'realtime' | '2h' | '6h' | 'daily'`).

### Naming Conventions

**Spec files:** `round3-phase{N}-spec{NN}-{kebab-case-title}.md`. Phases 0-16 (single digit), specs 00-99 (two digits). Insert phases (0.5, 2.5) use `phase00-5` and `phase02-5`. Example: `round3-phase03-spec04-prayer-wall-read-endpoints.md`. Alphabetical filename sorting roughly equals execution order. Specs live in `_specs/` alongside the existing 200+ specs.

**Backend tables:** `snake_case`, plural. `users`, `posts`, `post_comments`, `post_reactions`, `post_bookmarks`, `post_reports`, `activity_log`, `user_badges`, `faith_points`, `streak_state`, `friend_relationships`, `friend_requests`, `notifications_inbox`. Boolean columns prefixed `is_` (`is_anonymous`, `is_answered`, `is_admin`, `is_deleted`). Timestamp columns suffixed `_at` (`created_at`, `last_activity_at`, `answered_at`). Foreign keys suffixed `_id`.

**Backend packages:** `com.worshiproom.{feature}`. Examples: `com.worshiproom.auth`, `com.worshiproom.user`, `com.worshiproom.post`, `com.worshiproom.activity`, `com.worshiproom.moderation`, plus the existing `com.worshiproom.proxy.{common,ai,maps,bible}` packages inherited from the Key Protection Wave. Phase 1 includes a rename from existing `com.example.worshiproom` — done with the IntelliJ refactor tool to keep tests/imports correct. **Note:** v2.6 suggested provisional names `proxy.places` for Maps and `proxy.audio` for FCBH; the shipped implementation uses domain names `proxy.maps` and `proxy.bible` (spec is feature authority). The on-disk structure is authoritative; rules/03-backend-standards.md reflects this.

**API endpoints:** REST-ish, resource-oriented. `/api/v1/posts`, `/api/v1/posts/{id}`, `/api/v1/posts/{id}/reactions`, `/api/v1/users/{username}`, `/api/v1/activity`, `/api/v1/notifications`. Versioned as `/api/v1/` from day one.

**Frontend types:** `PascalCase`. API-derived types generated from OpenAPI spec live in `frontend/src/types/api/` and are never edited by hand. Frontend-specific types (UI state, form state) live in `frontend/src/types/` as before.

**Liquibase changesets:** Named by date and number. `db/changelog/2026-04-14-001-create-users-table.xml`. One changeset per logical change; never edit committed changesets; forward-only by default.

**Copy/strings:** All user-facing strings go in the spec's Copy Deck section, then into a per-feature constants file (e.g., `constants/prayer-wall-copy.ts`). No inline hardcoded strings outside these files. Brand voice (next section) governs all copy.

**localStorage keys:** Default prefix `wr_*`. New keys must be documented in `.claude/rules/11-local-storage-keys.md` as part of the spec that introduces them. Reactive store keys must specify their store module and subscription pattern in the same file.

### Brand Voice (Pinned)

Worship Room speaks the way a trusted older friend speaks to you over coffee when you are going through something hard: warm but unhurried, honest without being preachy, reverent without being stiff. The formality sits one notch more casual than a Sunday sermon and one notch more serious than a wellness app. Scripture appears as gift, not decoration — in celebration moments, empty states, and optional invitations, never as headers or filler. The emotional register leans into the full human range: grief gets stillness and whitespace, joy gets warmth and gentle celebration, struggle gets presence without fixing. No therapy-app language. No hype-language. Humor exists only in joyful moments and is always gentle and self-aware. Copy near vulnerability is quiet (short sentences, no exclamation points, no emoji, no cleverness). Copy near celebration can breathe (warmer, longer, allowed to smile). Copy near community is inviting, not performative. When in doubt, cut the sentence in half. When still in doubt, ask whether a pastor's wife with thirty years of walking alongside grieving people would say it that way.

This aligns with CLAUDE.md's existing "anti-pressure voice" doctrine: personal data displays (heatmaps, memorization decks, echoes, AI explanations, AI reflections, and Forums Wave additions) treat sparse activity as valid and avoid quiz-or-shame tone. The Forums Wave applies the same anti-pressure discipline to the Prayer Wall: never punish absence, never shame slow engagement, never gamify intercession in ways that would distort genuine prayer.

---

## Spec File Template

Every Forums Wave spec uses this structure. The template matches the existing `_specs/bb45-verse-memorization-deck.md` and `_specs/friends-system.md` format so CC has a consistent shape across the wave.

```
# Feature: {Title}

**Master Plan Reference:** `_forums_master_plan/round3-master-plan.md` — Phase {N}, Spec {NN}.
**Branch:** `forums-wave` (or sub-branch as Eric directs)

> **Before executing this spec:** Load `/Users/eric.champlin/worship-room/_forums_master_plan/round3-master-plan.md` and read the Quick Reference section at the top. If this spec touches phase-specific decisions, consult the Phase {N} section as well. Never commit, never push, never `git checkout` — Eric handles all git operations manually.

---

## Affected Frontend Routes
{List the user-facing routes this spec touches, one per line as backtick-wrapped markdown bullets, including any query parameters that affect rendering. The `/verify-with-playwright` skill reads this section (via the plan that inherits it) when invoked plan-only and uses these routes to drive UI verification. If this is a backend-only spec with NO frontend changes, write "N/A — backend-only spec" and omit the bullets.}

- `/route-1`
- `/route-2?tab=variant`

---

## Overview
{One paragraph: where this spec sits in the Forums Wave, what came before, what depends on it, what the user-visible outcome is.}

## User Stories
As a **[role]**, I want to **[action]** so that **[benefit]**.

(One per audience: logged-out visitor, logged-in user, admin if relevant.)

## Requirements

### Functional Requirements
1. {Numbered, grouped by sub-section.}
2.
3.

### Non-Functional Requirements
- **Performance:** {Lighthouse target, render budget, query time budget}
- **Accessibility:** {keyboard nav, screen reader, contrast, touch targets, focus management}
- **Security:** {auth requirements, input validation, rate limiting, XSS prevention}
- **Storage:** {localStorage keys, database tables, cache layers}

## Auth Gating

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| | | | |

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | |
| Tablet (640-1024px) | |
| Desktop (> 1024px) | |

## AI Safety Considerations

- **Crisis detection needed?**: Yes / No
- **User input involved?**: Yes / No — describe what
- **AI-generated content?**: Yes / No — if yes, plain text only, no HTML/Markdown rendering
- **Moderation note**: {how this content flows through the moderation pipeline}

## Auth & Persistence

- **Logged-out (demo mode)**: {behavior, zero-persistence rule}
- **Logged-in**: {behavior, what gets saved, to which table or localStorage key}
- **Route type**: Public / Protected / Admin
- **localStorage keys introduced/modified**: {list, with reference to `.claude/rules/11-local-storage-keys.md`}
- **Database tables touched**: {list with rough schema sketch if new}

## Anti-Pressure Design Decisions

{If the spec touches engagement, gamification, or personal data display — list non-negotiables that protect the user. Skip if not applicable. Examples: "No streak shame on missed days", "No comparison-based language", "No urgency cues on the wall", "No 'X people are praying — be one of them' framing".}

## Files to Create

- {exact path with file extension}

## Files to Modify

- {exact path} ({nature of change in one phrase})

## Files to Delete

- {exact path} ({reason})

## Database Changes (if applicable)

- Liquibase changeset: `db/changelog/{date}-{seq}-{description}.xml`
- Tables: {created/modified}
- Columns: {added/dropped/altered with types}
- Indexes: {created/dropped}
- Constraints: {added/dropped}
- Seed data: {dev/test/prod context, what's seeded}

## API Changes (if applicable)

- New endpoints: {path, method, request shape, response shape, error codes}
- Modified endpoints: {what changed and why}
- OpenAPI spec updates: {file, sections}
- Generated type updates: `frontend/src/types/api/generated.ts` regenerated

## Copy Deck

{Every user-facing string this spec introduces, written in brand voice, grouped by UI location. Include button labels, placeholder text, error messages, success toasts, empty states, headings, microcopy. Each string should pass the "pastor's wife test" — would a thoughtful older friend say it this way?}

## Acceptance Criteria

- [ ] {Specific, testable, with file paths and exact CSS classes where relevant}
- [ ] {Each criterion stands alone — no compound criteria}
- [ ] {30+ items typical for non-trivial specs, mirroring BB-45 format}
- [ ] {Test coverage criteria included: "At least N unit tests cover X"}

## Testing Notes

- Unit tests: {what, where}
- Integration tests: {what, where}
- Component tests: {what, where, including reactive store subscription tests for any new store consumers per BB-45 pattern}
- Playwright tests: {what, where}
- Manual QA checklist: {what to spot-check}

## Notes for Plan Phase Recon

These items must be verified during `/plan` reconnaissance before execution begins:

1. {question}
2. {question}
3. {question}

## Out of Scope

- {what this spec does NOT do}
- {what's deferred to a follow-up spec}

## Out-of-Band Notes for Eric

{Gotchas, things CC might get wrong, places to double-check, suggested commit points, anything that might trip up execution.}
```

---

## Universal Spec Rules

These apply to every Forums Wave spec, always, without exception. CC must respect all of them on every spec execution.

1. **No git operations.** CC never commits, never pushes, never runs `git checkout`, never runs `git reset`, never runs `git stash`, never runs any destructive git operation. Eric handles all git manually. This rule supersedes any other instruction. The FPU turnaround calculator incident — where `git checkout HEAD --` wiped uncommitted work — is the precedent. If a spec seems to require a git operation to make progress, stop and ask Eric.

2. **Read the Master Plan's Quick Reference section before starting.** Every spec header says this. It is not optional. The Quick Reference contains the architectural decisions, naming conventions, API contract, and BB-45 anti-pattern enforcement that every spec assumes.

3. **Use Liquibase for all schema changes.** Never raw SQL against the database. Never JPA `ddl-auto: update` or `ddl-auto: create`. Liquibase changesets only, in `backend/src/main/resources/db/changelog/`. One changeset per logical change. Never edit committed changesets — Liquibase tracks checksums and will fail if a checksum changes. Add a new changeset instead.

4. **Use TypeScript types generated from OpenAPI**, not hand-written API response types. The OpenAPI spec at `backend/src/main/resources/openapi.yaml` is the contract. The TypeScript types are derivatives in `frontend/src/types/api/generated.ts`, regenerated via `npm run types:generate`. Hand-editing the generated file is forbidden.

5. **All user-facing strings go in a Copy Deck section of the spec**, then into a constants file (e.g., `frontend/src/constants/prayer-wall-copy.ts`). No inline hardcoded strings in components. Brand voice governs all copy. Every string in a spec's Copy Deck must pass the pastor's wife test. Constants files are structured as flat key-value mappings (e.g., `export const PRAYER_WALL_COPY = { composerPlaceholder: "...", submitButton: "...", ... }`) to enable future internationalization via a single key-substitution layer (no current i18n requirement; this is a structural choice that keeps future translation cheap). **Every Copy Deck section also includes an Anti-Pressure Copy Checklist** — a short list of yes/no questions the copy must pass before the spec is considered done: (a) Does any copy use comparison framing ("more than X% of users")? (b) Does any copy use urgency language ("now", "hurry", "X people need...")? (c) Does any copy use exclamation points near vulnerability content (grief, mental health, crisis)? (d) Does any copy use therapy-app jargon ("manage your anxiety", "cope with depression")? (e) Does any copy use streak-as-shame language ("you missed a day", "don't break your streak")? (f) Does any copy use false-scarcity framing ("only 3 spots left", "limited time")? Any "yes" answer requires copy revision before the spec ships.

6. **Tests are mandatory for new functionality.** Backend: JUnit 5 + Spring Boot Test + Testcontainers for integration tests, unit tests for pure logic. Frontend: Vitest + React Testing Library, plus reactive store subscription tests for any new store consumers (per BB-45 anti-pattern). Playwright for end-to-end verification. Eric can override the test requirement on a per-spec basis only when a spec is purely refactoring with no behavior change, and that override must be explicit in the spec's Out-of-Band Notes section.

7. **No localStorage keys created or modified without documenting them in `.claude/rules/11-local-storage-keys.md`.** New reactive stores must specify their store module path and subscription pattern (Pattern A or Pattern B) in the same file. A spec that adds a localStorage key without updating the inventory is incomplete and will fail code review.

8. **BB-45 anti-pattern is forbidden in all new code.** Components reading from a reactive store must use the store's hook (`useSyncExternalStore` Pattern A preferred for new code, Pattern B inline subscribe acceptable for legacy compatibility). Tests for reactive store consumers must mutate the store after mount and verify re-render. Mocking the store entirely bypasses the subscription mechanism — forbidden. The original BB-45 implementation surfaced this anti-pattern as a real correctness bug and it now has zero tolerance.

9. **Accessibility is not optional.** Keyboard navigation works for every interactive element. ARIA labels on icon-only buttons and any control whose accessible name is not visible. Focus management on modals, drawers, and inline expansions. `prefers-reduced-motion` honored on every animation. Color contrast meets WCAG AA (4.5:1 normal text, 3:1 large text). Touch targets minimum 44x44 px on mobile. Lighthouse Accessibility 95+ on every Prayer Wall page (BB-35 baseline).

10. **Performance is not optional.** Lighthouse Performance 90+, Best Practices 90+, SEO 90+ on every Prayer Wall page (BB-36 baseline). Animation durations and easings imported from `frontend/src/constants/animation.ts` (BB-33), never hardcoded. No `200ms` strings, no `cubic-bezier(...)` strings, no inline `transition: all`. Bundle size tracked via `frontend/scripts/measure-bundle.mjs` — Forums Wave additions must not regress the main bundle by more than 50 KB without justification in the spec.

11. **Brand voice mandatory for all copy.** Specs that introduce copy must show the copy in context (Copy Deck section) and it must pass the pastor's wife test. Specifically: no exclamation points near vulnerability content, no emoji except in joyful celebration moments, no therapy-app jargon, no hype-language, no urgency cues on the Prayer Wall, scripture as gift not decoration, copy near grief gets stillness and whitespace.

12. **Anti-pressure design.** Engagement features, gamification additions, and personal data displays must include an Anti-Pressure Design Decisions section in the spec with non-negotiables. The Prayer Wall is a vulnerability space — never punish absence, never gamify intercession in shame-inducing ways, never use comparison-based language ("you have prayed less than 80% of users"), never use false-urgency ("3 people need prayer right now — be one"), never display streaks-as-shame.

13. **Crisis detection runs on the backend.** The existing frontend `containsCrisisKeyword()` is a courtesy fast-path that surfaces the crisis banner immediately for fast feedback. The authoritative crisis check happens server-side on post and comment creation per `.claude/rules/01-ai-safety.md` — backend uses an LLM-based classifier (with keyword fallback) and fail-closed semantics in the UI. New post/comment write endpoints MUST run the backend crisis check and MUST set `posts.crisis_flag = true` when triggered. Admin notification follows fail-open semantics (do not auto-flag content unless classification parsing succeeds or a clear keyword match exists) per the rule file. **Acknowledged supersession:** the existing `prayer-wall-redesign.md` AI Safety section explicitly DEFERRED crisis detection ("Crisis detection needed?: No"). This Universal Rule #13 deliberately upgrades that policy to MANDATORY for the Forums Wave. The existing frontend `containsCrisisKeyword()` function (already shipped, used by `prayer-wall-question-of-day.md` and `personal-prayer-list.md`) is the partial implementation that this rule promotes to fully enforced. CC must NOT remove the frontend fast-path — it provides immediate UX feedback before the server round-trip completes. Both layers coexist.

14. **Plain text only for user-generated content.** No HTML, no Markdown, no `dangerouslySetInnerHTML`. Backend defensively strips `<...>` tags on input (belt and suspenders). Frontend renders with `white-space: pre-wrap`. React's default escaping handles XSS prevention. This applies to prayer post content, comments, bios, custom display names, and any other user-supplied text. Per `.claude/rules/02-security.md`.

15. **Rate limiting on all write AND read endpoints.** Write defaults from `.claude/rules/02-security.md`: 5 prayer posts per day per user, 20 AI requests per hour per user. Configurable via env vars (`RATE_LIMIT_PRAYER_POSTS_PER_DAY`, `RATE_LIMIT_AI_REQUESTS_PER_HOUR`). **Read endpoint defaults: 100 requests per minute per authenticated user, 30 requests per minute per IP for unauthenticated requests, with a 20-request burst allowance.** Read limits prevent feed-scraping attacks that could de-anonymize anonymous posts via correlation across paginated requests. Configurable via env vars (`RATE_LIMIT_READS_PER_MINUTE_AUTHED`, `RATE_LIMIT_READS_PER_MINUTE_ANON`). Spring Security + in-memory cache for dev, Redis for production. Rate limit headers on every response — both writes and reads (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`). `Retry-After` header on 429 responses. Anti-enumeration on registration (existing email returns same response as new email).

16. **Respect existing patterns.** Existing Prayer Wall components (PrayerCard, InteractionBar, InlineComposer, CommentsSection, etc.) are extended, not rebuilt. Existing localStorage keys (`wr_friends`, `wr_faith_points`, `wr_streak`, `wr_badges`, `wr_notifications`) are migrated, not reinvented. Existing UX flows from the prayer-wall-redesign / category-filter / category-layout / question-of-day specs are preserved unless this Master Plan explicitly supersedes them. When in doubt, ask Eric whether a deviation is intentional.

17. **Per-phase accessibility smoke test.** Every phase cutover spec requires a passing accessibility smoke test before cutover is declared complete. This is distinct from Phase 16.4's comprehensive accessibility audit at the end of the wave — the smoke test is a lightweight verification gate that runs per-phase so accessibility debt doesn't pile up across 15 phases and arrive as 50+ violations in the final audit. Minimum requirements for the smoke test: (a) axe-core automated scan passes with zero CRITICAL violations on all routes and components introduced or modified in the phase (run via `@axe-core/playwright` in CI); (b) keyboard-only navigation walkthrough completes for the phase's primary user flows (compose post, react, comment, navigate profile, toggle a setting — whichever apply to the phase in question); (c) VoiceOver (macOS) spot-check on the 2-3 most complex interactions introduced in the phase (e.g., Phase 6's receipt modal, Phase 11's search overlay, Phase 14's walkthrough, Phase 10.7b's report dialog). Medium and minor axe violations are tolerable at the smoke-test gate but MUST be documented in the cutover spec's Out-of-Band Notes with a remediation owner (Eric by default) and a target remediation date (typically the next phase's cutover or the Phase 16.4 audit, whichever is sooner). The smoke test target duration is under 30 minutes per phase; the automated axe-core portion runs in seconds in CI, leaving the manual portion to the keyboard walkthrough and VoiceOver spot-check. CC executing a cutover spec MUST produce evidence of the smoke test passing (axe-core report artifact committed to `_cutover-evidence/{phase}-a11y-smoke.json`, plus a brief markdown note recording the keyboard walkthrough outcome and VoiceOver spot-check observations) as part of the cutover deliverables. A cutover spec that ships without this evidence is incomplete regardless of functional correctness.

---

## Architectural Foundation

> **This section is the whole-project thinking that informs every phase below. If you find yourself confused about why a spec was structured a certain way, check here first — the answer is probably an up-front decision in this section rather than a spec-specific choice.**

### Decision 1: Tech Stack Matches CLAUDE.md and the Existing Backend

**The reality.** The `backend/` folder already exists with Maven (not Gradle), Spring Boot 3.5.11, Java 21, a basic skeleton (`WorshipRoomApplication.java` + `CorsConfig.java` + `ApiController.java`), and a Dockerfile. The `pom.xml` declares Spring Web, Actuator, and Validation as dependencies. There is no Liquibase yet, no Spring Security yet, no PostgreSQL driver yet, no JPA yet, no Testcontainers yet, no AI integrations yet.

**The decision.** v1 of this Master Plan assumed Gradle + Spring Data JDBC + Firebase Auth and proposed creating the project from scratch. v2 corrects all three: Maven, Spring Data JPA, Spring Security + JWT, and **audits and extends** the existing skeleton rather than creating it new. The exact tech stack:

- **Build tool**: Maven (`mvnw`, `pom.xml`)
- **Framework**: Spring Boot 3.5.11
- **Language**: Java 21
- **Web layer**: Spring Web (already in `pom.xml`)
- **Validation**: Spring Validation (already in `pom.xml`)
- **Actuator**: Spring Boot Actuator (already in `pom.xml`) — health endpoint at `/actuator/health`
- **Persistence**: Spring Data JPA (NOT JDBC — explicit in `.claude/rules/03-backend-standards.md`)
- **Database**: PostgreSQL 16 via Docker Compose (local dev) and Railway / Render / Supabase / Neon (production — decision deferred to end of Phase 1)
- **Migrations**: Liquibase (Eric's preference from work; CLAUDE.md says "Flyway or Liquibase TBD" — Liquibase wins)
- **Security**: Spring Security + JWT (`Authorization: Bearer <token>`)
- **Password hashing**: BCrypt (Spring Security default)
- **Email**: Spring Mail (SMTP) for admin notifications and Phase 15 comment-reply digests
- **Logging**: Logback with JSON structured logging per `.claude/rules/07-logging-monitoring.md`
- **Testing**: JUnit 5 + Spring Boot Test + Testcontainers (real PostgreSQL containers)
- **API documentation**: Springdoc OpenAPI → `/api/docs` Swagger UI in dev only
- **Type generation**: `openapi-typescript` on the frontend, generates `frontend/src/types/api/generated.ts`
- **Configuration**: `application.properties` (NOT `application.yml` — match what is already in the repo). Profiles: `application-dev.properties`, `application-test.properties`, `application-prod.properties`.
- **Package root**: Phase 1 renames `com.example.worshiproom` to `com.worshiproom` for production identity (use IntelliJ refactor to keep tests/imports correct — never sed-replace)

**What `.claude/rules/03-backend-standards.md` says we MUST do** (already standardized):

- API base path: `/api/v1/`
- Standard success response: `{ data, meta: { requestId } }`
- Standard error response: `{ code, message, requestId, timestamp }`
- `X-Request-Id` header on every response
- Rate limiting headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- `Retry-After` header on 429s
- Pagination: `?page=1&limit=20`
- HTTP status codes per the rule file
- Constructor injection for dependencies
- DTOs for request/response (never expose entities directly)
- `@Valid` on all request bodies
- Service layer for business logic, controllers thin
- Admin via `is_admin` boolean column (NOT hardcoded email)
- `admin_audit_log` table for all admin actions
- AI input/output safety checks per `.claude/rules/01-ai-safety.md`

### Decision 2: The Existing Backend Skeleton Is Extended, Not Replaced

**Phase 1 is an audit-and-extend operation, not a greenfield create.** The existing `backend/` folder gives us:

- ✅ Spring Boot project structure
- ✅ Maven wrapper and `pom.xml` with Spring Web / Actuator / Validation
- ✅ Java 21, Spring Boot 3.5.11
- ✅ A working `WorshipRoomApplication.java` entry point
- ✅ `CorsConfig.java` allowing `http://localhost:5173` (the Vite dev server)
- ✅ A trivial `ApiController.java` with `/api/health` and `/api/hello` endpoints
- ✅ A working `Dockerfile` (multi-stage Maven build)
- ✅ A root `docker-compose.yml` that builds backend + frontend containers (but no PostgreSQL service yet)

What Phase 1 adds:

- 🆕 Rename group ID from `com.example.worshiproom` to `com.worshiproom` (IntelliJ refactor)
- 🆕 PostgreSQL service in `docker-compose.yml`
- 🆕 PostgreSQL JDBC driver and Spring Data JPA dependencies in `pom.xml`
- 🆕 Liquibase dependency and master changelog
- 🆕 Spring Security dependency and a `SecurityConfig` class — MUST disable CSRF in the SecurityConfig (`http.csrf(csrf -> csrf.disable())`). JWT-based auth using `Authorization: Bearer` headers does not need CSRF protection (CSRF protects cookie-based auth flows). Spring Security enables CSRF by default; without explicit disable, every POST/PUT/DELETE from the frontend returns a confusing 403 with no helpful error message. This is a single line of config but a multi-hour debugging session if missed. Document this explicitly in the Phase 1.4 spec.
- 🆕 JJWT (JSON Web Token) library for token signing/parsing
- 🆕 BCrypt password encoder bean
- 🆕 Springdoc OpenAPI dependency and `openapi.yaml` spec file
- 🆕 Testcontainers dependency and an `AbstractIntegrationTest` base class
- 🆕 First Liquibase changeset: `users` table (extending the schema in `.claude/rules/05-database.md`)
- 🆕 First real auth endpoints: `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `GET /api/v1/users/me`

**BCrypt-in-Liquibase-XML gotcha (must be handled in Phase 1 seed spec):** BCrypt password hashes contain the `$` character, which Liquibase interprets as `${}` template reference delimiters in XML changeset files. Three options for handling this in the dev-seed changeset: (a) wrap the password values in `<![CDATA[...]]>` blocks within the column tag; (b) escape every `$` as `\${}` Liquibase escape sequence; (c) seed via SQL changeset (`<sqlFile path="..."/>`) instead of XML changeset. The Phase 1.8 dev-seed spec MUST pick one approach and document it. Recommended: option (a), CDATA blocks — least surprise, most readable.

- 🆕 `application-test.properties` profile for Testcontainers tests
- 🆕 Update root `docker-compose.yml` to depend on PostgreSQL service
- 🆕 Move existing `/api/health` and `/api/hello` endpoints to `/api/v1/health` and `/api/v1/hello` for versioning consistency

What Phase 1 deliberately does NOT do:

- Migrate any feature data (that is Phase 2 onward)
- Touch the frontend's `AuthContext` swap until the dedicated spec at the end of Phase 1
- Build admin functionality (that is Phase 10's bare-minimum spec set)
- Build email integration (that is Phase 15)
- Pick a deployment target (that is the final Phase 1 spec, written deployment-agnostic)

### Decision 3: The Canonical User Model

**The problem.** The Profile recon surfaced a critical inconsistency. The Worship Room frontend currently has four (really five) different user name representations:

- `AuthContext` exposes `user.name` as a single string ("Sarah Johnson")
- `PrayerWallUser` (from `frontend/src/types/prayer-wall.ts`) splits into `firstName` + `lastName` + `avatarUrl`
- `FriendProfile` (from `frontend/src/hooks/useFriends.ts` and `wr_friends`) exposes `displayName` + `avatar` + `level` + `levelName`
- `LeaderboardEntry` (from `wr_leaderboard_global`) also exposes `displayName`
- `PrayerRequest.authorName` is first-name-only ("Sarah") for non-anonymous posts

Five different representations. When a user updates their name in one place, the others drift. When the frontend tries to render a user consistently across features, it has to know which field to read based on where the data came from. This is the reason Prayer Wall profile links don't cross-link to the Growth profile — they live in different name worlds.

**The decision.** The backend `users` table is the source of truth for user identity. Schema (extending `.claude/rules/05-database.md` baseline):

```sql
users
  id                           UUID PRIMARY KEY                  -- generated server-side at registration
  email                        VARCHAR(255) UNIQUE NOT NULL
  password_hash                VARCHAR(255) NOT NULL              -- BCrypt
  first_name                   VARCHAR(100) NOT NULL
  last_name                    VARCHAR(100) NOT NULL
  username                     VARCHAR(30) UNIQUE NOT NULL        -- ADDED IN PHASE 8.1 (not in Phase 1.3 changeset; see Phase 8.1 for the 3-changeset add+backfill+constrain sequence)
  display_name_preference      VARCHAR(20) NOT NULL DEFAULT 'first_only'
                               -- 'first_only', 'first_last_initial', 'first_last', 'custom'
  custom_display_name          VARCHAR(100) NULL
  avatar_url                   VARCHAR(500) NULL
  bio                          TEXT NULL
  favorite_verse_reference     VARCHAR(50) NULL
  favorite_verse_text          TEXT NULL
  is_admin                     BOOLEAN NOT NULL DEFAULT FALSE
  is_banned                    BOOLEAN NOT NULL DEFAULT FALSE
  is_email_verified            BOOLEAN NOT NULL DEFAULT FALSE
  joined_at                    TIMESTAMP NOT NULL DEFAULT NOW()
  last_active_at               TIMESTAMP NULL
  created_at                   TIMESTAMP NOT NULL DEFAULT NOW()
  updated_at                   TIMESTAMP NOT NULL DEFAULT NOW()
  is_deleted                   BOOLEAN NOT NULL DEFAULT FALSE
  deleted_at                   TIMESTAMP NULL
```

The `display_name` field is **not stored** — it is computed server-side from `first_name`, `last_name`, `display_name_preference`, and `custom_display_name`, and included in every API response that returns a user. The frontend never computes display names; it reads the `displayName` field from the API and renders it.

**Display name resolution rules** (the `DisplayNameResolver` service, with unit tests for every case):

| Preference             | Computed `displayName` example       |
| ---------------------- | ------------------------------------ |
| `first_only` (default) | "Sarah"                              |
| `first_last_initial`   | "Sarah J."                           |
| `first_last`           | "Sarah Johnson"                      |
| `custom`               | whatever is in `custom_display_name` |

**Anonymous posts:** The `posts` table still stores `user_id` (for moderation, spam control, the user's own dashboard) but the API response for anonymous posts returns `displayName: "Anonymous"` and `avatarUrl: null`. The backend never sends the real author across the wire for anonymous posts — even to the post's own author when they view their own profile. Anonymous is opaque even to the poster.

**The migration story:** Phase 1 lands the users table and the registration / login / me endpoints. Phase 2 doesn't touch users. Phase 8 (Unified Profile System) is where the existing four-way name representation gets fully resolved across the frontend — Spec 8.8 (Name Canonicalization Migration) is the spec that grep-and-replaces every `user.name` / `firstName + lastName` / `authorName` reference to read `displayName` from the API.

**Why store `first_name` and `last_name` separately rather than a single `name` field:** Display name preferences require us to know which part is first and which is last. `first_only` and `first_last_initial` need that split. Storing a single `name` field forces every consumer to parse it, which is locale-fragile (some cultures put family name first) and a constant source of bugs. We collect first and last separately at registration and let the user pick a display preference.

---

### Decision 4: The Posts Table with a Discriminator

**The problem.** Phase 4 expands Prayer Wall from prayer-requests-only to five post types: Prayer Request, Testimony, Question, Devotional Discussion, Encouragement. Each type has type-specific behavior (Questions have "this helped" marking, Testimonies never expire, Encouragement has no replies, etc.) but all types share infrastructure: comments, reactions, bookmarks, reporting, moderation, author attribution, timestamps, categories.

**The decision: one `posts` table with a `post_type` enum discriminator.** Schema:

```sql
posts
  id                           UUID PRIMARY KEY
  user_id                      UUID NOT NULL REFERENCES users(id)
  post_type                    VARCHAR(20) NOT NULL
                               -- 'prayer_request', 'testimony', 'question', 'discussion', 'encouragement'
  content                      TEXT NOT NULL
  category                     VARCHAR(30) NOT NULL
                               -- 'health', 'mental-health', 'family', 'work', 'grief', 'gratitude',
                               --  'praise', 'relationships', 'other', 'discussion'
  is_anonymous                 BOOLEAN NOT NULL DEFAULT FALSE

  -- type-specific nullable columns
  is_answered                  BOOLEAN NOT NULL DEFAULT FALSE     -- prayer_request only
  answered_text                TEXT NULL                           -- prayer_request only
  answered_at                  TIMESTAMP NULL                      -- prayer_request only
  question_resolved_comment_id UUID NULL                           -- question only
  challenge_id                 VARCHAR(50) NULL                    -- any type, if posted during a challenge
  qotd_id                      VARCHAR(50) NULL                    -- discussion type only (QOTD response)

  -- visibility (Phase 7.7)
  visibility                   VARCHAR(20) NOT NULL DEFAULT 'public'
                               -- 'public', 'friends', 'private'

  -- shared lifecycle
  created_at                   TIMESTAMP NOT NULL DEFAULT NOW()
  last_activity_at             TIMESTAMP NOT NULL DEFAULT NOW()
  expires_at                   TIMESTAMP NULL

  -- moderation state
  moderation_status            VARCHAR(20) NOT NULL DEFAULT 'approved'
                               -- 'approved', 'flagged', 'hidden', 'removed'
  crisis_flag                  BOOLEAN NOT NULL DEFAULT FALSE

  -- soft delete
  is_deleted                   BOOLEAN NOT NULL DEFAULT FALSE
  deleted_at                   TIMESTAMP NULL

  -- denormalized counters (for fast feed rendering)
  praying_count                INTEGER NOT NULL DEFAULT 0
  comment_count                INTEGER NOT NULL DEFAULT 0
  bookmark_count               INTEGER NOT NULL DEFAULT 0
```

**Indexes:**

- `(user_id)` for author lookups
- `(post_type, created_at DESC)` for room-filtered feeds
- `(created_at DESC)` for the unified feed
- `(category, created_at DESC)` for category filter
- `(challenge_id)` for challenge-tagged feeds (existing pattern)
- `(qotd_id)` for QOTD-response queries
- `(last_activity_at DESC)` for the bump-on-activity sort
- `(moderation_status)` for moderation queue
- Partial index `(is_answered, answered_at DESC) WHERE post_type = 'prayer_request' AND is_answered = TRUE` for the Answered Wall

**Why we diverge from `prayer-wall-redesign.md`:** That older spec referenced tables called `prayer_requests`, `prayer_replies`, `prayer_bookmarks`, `prayer_reports`. It was written before post type expansion was on the table. The Forums Wave deliberately renames to the unified `posts` family (`posts`, `post_comments`, `post_reactions`, `post_bookmarks`, `post_reports`). Anyone reading `prayer-wall-redesign.md` should treat its table names as superseded by this Master Plan. Phase 3.1's spec explicitly calls out the rename so it does not look like a contradiction.

**Counter denormalization.** The `praying_count`, `comment_count`, `bookmark_count` columns are denormalized for fast feed queries. They are updated transactionally when the underlying reaction/comment/bookmark row is inserted/deleted. Counter drift of ±1 in public counts is acceptable; the post author's own dashboard does live counts to be exact.

**Expiration rules** (per post type):

- **Prayer Request**: 7 days after `last_activity_at`, extendable with one tap by the author. Marking answered makes it evergreen.
- **Question**: 7 days after `last_activity_at`, extendable. Marking a comment as "this helped" makes it evergreen.
- **Testimony**: never expires.
- **Devotional Discussion**: 3 days after `last_activity_at`.
- **Encouragement**: 24 hours from `created_at`, non-extendable.

Expired posts are not deleted — they are hidden from default feed views but remain accessible via direct link, on the author's own dashboard, and via the post's permalink. Expiration is a display filter, not a destructive operation.

**Type-specific validation lives in the application layer.** The backend rejects attempts to set `answered_text` on a non-prayer post. The frontend renders different composers and cards based on `post_type`. The database CHECK constraint validates the enum value but not cross-column rules — those live in `PostService`.

### Decision 5: Activity Engine Migrates in Dual-Write Mode**The problem.** Every Prayer Wall action calls `recordActivity('prayerWall')`, which writes to `wr_daily_activities`, `wr_faith_points`, `wr_streak`, and potentially `wr_badges`. These four localStorage keys are shared infrastructure that every feature in the app (Daily Hub, Bible, Meditate, etc.) writes to. If Prayer Wall data lives on the backend but the activity engine stays on localStorage, every Prayer Wall write triggers a half-backend / half-local state that is impossible to keep consistent.

**The decision (corrected from v1):** Dual-write strategy. The frontend `recordActivity()` function continues to write to localStorage as the source of truth for reads during the Forums Wave. It also fires-and-forgets a `POST /api/v1/activity` call to the backend, which writes to a shadow copy. If the backend is unavailable, localStorage still works and the user sees nothing wrong. Reads NEVER hit the backend during the wave — only writes.

**Why dual-write instead of full migration:**

- Blast radius is minimal. If the backend hiccups, every feature still works from localStorage.
- The wave can ship without forcing every feature (Daily Hub, Bible, Meditate, Music) to be backend-aware.
- Future waves promote the backend to source of truth one feature at a time, with the localStorage adapter as a fallback during each migration.
- Solo dev pace: dual-write lets Eric ship Prayer Wall + activity engine without coordinating a full app-wide cutover.
- The backend gets seeded with real data during the wave so future read-migration phases have something to work with.

**The schema** (Phase 2 lands all of these):

```sql
activity_log
  id               UUID PRIMARY KEY
  user_id          UUID NOT NULL REFERENCES users(id)
  activity_type    VARCHAR(50) NOT NULL
                   -- 'pray', 'meditate', 'journal', 'prayer_wall', 'bible', etc.
  source_feature   VARCHAR(50) NOT NULL
                   -- 'daily_hub', 'prayer_wall', 'bible', 'music', etc.
  occurred_at      TIMESTAMP NOT NULL DEFAULT NOW()
  points_earned    INTEGER NOT NULL DEFAULT 0
  metadata         JSONB NULL

faith_points
  user_id          UUID PRIMARY KEY REFERENCES users(id)
  total_points     INTEGER NOT NULL DEFAULT 0
  current_level    INTEGER NOT NULL DEFAULT 1
  last_updated     TIMESTAMP NOT NULL DEFAULT NOW()

streak_state
  user_id              UUID PRIMARY KEY REFERENCES users(id)
  current_streak       INTEGER NOT NULL DEFAULT 0
  longest_streak       INTEGER NOT NULL DEFAULT 0
  last_active_date     DATE NULL
  grace_days_used      INTEGER NOT NULL DEFAULT 0
  grace_week_start     DATE NULL
  grief_pause_until    DATE NULL
  grief_pause_used_at  TIMESTAMP NULL

user_badges
  user_id          UUID NOT NULL REFERENCES users(id)
  badge_id         VARCHAR(100) NOT NULL
  earned_at        TIMESTAMP NOT NULL DEFAULT NOW()
  display_count    INTEGER NOT NULL DEFAULT 1
  PRIMARY KEY (user_id, badge_id)

activity_counts
  user_id          UUID NOT NULL REFERENCES users(id)
  count_type       VARCHAR(50) NOT NULL
                   -- 'pray', 'journal', 'meditate', 'intercession', etc.
  count_value      INTEGER NOT NULL DEFAULT 0
  last_updated     TIMESTAMP NOT NULL DEFAULT NOW()
  PRIMARY KEY (user_id, count_type)
```

**The single API endpoint:**

```
POST /api/v1/activity
Headers: Authorization: Bearer <jwt>
Body: { activity_type, source_feature, metadata }

Response: {
  data: {
    points_earned: int,
    total_points: int,
    current_level: int,
    level_up: boolean,
    streak: { current, longest, new_today, grace_used, grace_remaining },
    new_badges: [ { id, name, celebration_tier, earned_at } ],
    multiplier_tier: { label, multiplier }
  },
  meta: { requestId }
}
```

**Frontend dual-write flow:**

1. User completes an activity (e.g., taps Pray on a prayer card)
2. Frontend updates localStorage (source of truth for reads)
3. Frontend renders celebrations from the localStorage-computed result (immediate UX, no waiting on network)
4. Frontend fires `POST /api/v1/activity` (shadow write, fire-and-forget)
5. If the backend response disagrees with localStorage (e.g., extra badge from a different device), log a warning to the console but do not surface to user during this wave

**Known consequence of dual-write:** A badge earned on Device A (which writes to localStorage A and shadow-writes to the backend) is NOT visible on Device B until backend reads become source-of-truth in a future wave. The user's profile view in Phase 8 may surface backend-derived badges as a partial workaround, but the celebration moment fires only on the device where the badge was earned. This is intentional — the dual-write strategy trades cross-device celebration for blast-radius safety.

Both the frontend (existing `services/`) and the backend ports of the calculation logic must produce identical results. A drift-detection test runs both implementations against shared test cases and asserts parity. When they disagree, the test fails loudly. **CI integration:** the drift test runs on every PR via GitHub Actions (or equivalent), in a job that boots the JVM (Java 21), executes the JS/TS implementation via Node 20, runs both against \~50 shared scenarios from `_test_fixtures/activity-engine-scenarios.json`, and fails the build if any scenario produces non-identical output. The shared scenarios file is the single source of truth and BOTH implementations are tested against it — neither implementation is the "reference"; they are peers that must agree. New scenarios are added when bugs are found (regression-test-first discipline). The test is FAST (target &lt;30 seconds total) so it never gets disabled for being slow.

**Grace periods and grief pause** are built in from Phase 2 day one:

- **Grace days**: 2 free per week, reset Monday midnight (server time during this wave; timezone-aware in a later wave).
- **Grief pause**: User triggers from settings; 7-day pause; once per 30 days; free.
- **Streak repair**: Existing mechanic (50 points to restore 1 broken streak day, free 1x/week) preserved.

**Why dual-write does not violate "anti-pressure":** The user-facing behavior is unchanged. They see the same celebrations from the same localStorage source. The backend is invisible to them. Pressure-free engagement is preserved because we are not introducing any new "must check device" behavior.

### Decision 6: Authentication is JWT (Spring Security), Not Firebase

**The reality.** v1 of this Master Plan introduced Firebase Auth as a load-bearing assumption. Firebase is not in `.claude/rules/02-security.md`, not in `.claude/rules/03-backend-standards.md`, and not in any existing spec. The actual auth strategy per the rules: Spring Security + JWT, BCrypt password hashing, in-memory JWT on the frontend (lost on refresh, acceptable for MVP), 12-character password minimum, anti-enumeration on registration, rate-limited login.

**The decision.** Phase 1 builds real JWT auth. The existing `AuthContext.tsx` keeps its `useAuth()` interface unchanged for the 121 consumers — only the internal implementation swaps. Specifically:

**Backend** (Phase 1 specs):

- `POST /api/v1/auth/register` — body `{ email, password, firstName, lastName }`. Validates email format, password length (≥12 chars), name non-empty. Anti-enumeration: existing email returns the same 200 response as a new email. BCrypt hash + insert into `users`. Response: `{ data: { token, user } }`.
- `POST /api/v1/auth/login` — body `{ email, password }`. BCrypt verify (with dummy hash for unknown emails to equalize timing). Returns `{ data: { token, user: { id, displayName, email, isAdmin } } }`. Rate limited: 5 attempts per 15 minutes per email, 20 per 15 minutes per IP (hashed).
- `POST /api/v1/auth/logout` — no-op for in-memory JWTs (the frontend just discards the token), but the endpoint exists for future cookie-based migration. Returns 204.
- `GET /api/v1/users/me` — requires `Authorization: Bearer <token>` header. Returns full `UserResponse` with computed `displayName`.
- `JwtAuthenticationFilter` (Spring Security) validates the bearer token on every `/api/v1/**` request except `/api/v1/health`, `/api/v1/auth/register`, `/api/v1/auth/login`. Extracts the user ID from the token's `sub` claim. Sets the Spring Security `Authentication` principal.

**Frontend** (Phase 1 specs):

- `AuthContext.tsx` rewritten internally. `useAuth()` keeps the same return shape: `{ isAuthenticated, user: { name, id }, login, logout }`.
- `login(name)` signature changes to `login(email, password)` — async, calls `POST /api/v1/auth/login`, stores the token in React state (in-memory only, lost on refresh), populates `user`.
- `logout()` clears React state and calls `POST /api/v1/auth/logout` (which is a no-op on the backend for in-memory tokens but the endpoint exists for future cookie-based migration).
- `wr_user_id` in localStorage is preserved for reactive store keys that depend on it (no logout-clear). `wr_auth_simulated` and `wr_user_name` are deprecated but tolerated until a follow-up cleanup spec.
- The 121 consumers of `useAuth()` that only read `user.name` and `user.id` do NOT change. The \~5-10 callers of `login(name)` are updated to `login(email, password)` — exact list in Phase 1 Spec 1.9.

**Token storage & lifecycle:**

- In-memory only (React state). User logs out on page refresh — acceptable per `.claude/rules/02-security.md`.
- Token expiry: 1 hour (`JWT_EXPIRATION` env var, default 3600 seconds).
- No refresh tokens for MVP. Future enhancement.
- Future migration to httpOnly cookie + CSRF protection is NOT in scope for the Forums Wave.
- JWT signing key from `JWT_SECRET` env var. Generated as a long random string and stored in `.env` for dev, platform secrets for production. Never committed.

**Why this is much simpler than Firebase:**

- No Firebase project to set up
- No Firebase SDK to add to the frontend
- No service account JSON to manage
- No Firebase token validation library on the backend
- Eric's existing Spring Security knowledge applies directly
- No vendor lock-in
- Self-hosted auth means no third-party can lock users out

### Decision 7: The Reaction Bug Quick Win (Phase 0.5)

**The bug.** The Prayer Wall reaction state currently lives in `usePrayerReactions.ts` as `useState(getMockReactions())`. Each component that calls the hook gets its own copy. The four pages (PrayerWall, PrayerWallDashboard, PrayerDetail, PrayerWallProfile) each instantiate the hook independently. Tapping "praying" on the feed mutates only the feed page's state. Navigating to the detail page creates a new state. The reaction is lost. **This is exactly the BB-45 anti-pattern documented in** `.claude/rules/06-testing.md` **and** `.claude/rules/11-local-storage-keys.md`**.**

**The decision.** Phase 0.5 ships a single spec that converts `usePrayerReactions` from snapshot-without-subscription to a reactive store using `useSyncExternalStore` (Pattern A). The store persists to a new `wr_prayer_reactions` localStorage key. Cross-page consistency works immediately. **This ships before any backend work starts** (after the Phase 0 learning doc is read).

**Why this is a quick win:**

- Removes the most visible Prayer Wall bug today
- Unblocks a feeling of progress while Phase 1 (multi-week effort) is in flight
- Establishes the reactive store pattern for Prayer Wall that Phase 3 will swap to backend
- Tests for the new store enforce the BB-45 subscription pattern from day one
- When Phase 3 lands the backend, the localStorage adapter under the hook gets replaced with an API adapter — zero changes to the 4 consumer pages
- Total estimated effort: under one day

**The migration path in Phase 3:** The `usePrayerReactions` hook keeps its return shape `{ reactions, togglePraying, toggleBookmark }`. The store module that backs it swaps from a localStorage-only implementation to a backend-backed implementation with optimistic updates. Components do not notice.

**localStorage key:** `wr_prayer_reactions` — `Record<string, PrayerReaction>`. New entry in `.claude/rules/11-local-storage-keys.md` documenting the store module path (`lib/prayer-wall/reactionsStore.ts`) and Pattern A subscription via `usePrayerReactions()`.

**Test pattern enforced from day one:**

```tsx
import { togglePraying } from "@/lib/prayer-wall/reactionsStore"; // direct store import, not via hook

// CORRECT — verifies subscription
test("renders updated reaction state when store is mutated externally", async () => {
  render(<PrayerCard prayer={mockPrayer} />);
  expect(screen.queryByLabelText(/stop praying/i)).not.toBeInTheDocument();

  act(() => {
    togglePraying(mockPrayer.id); // mutate the store from outside the component
  });

  expect(await screen.findByLabelText(/stop praying/i)).toBeInTheDocument();
});
```

The test mutates the store after mount and asserts the component re-renders. A test that only sets initial state and asserts initial render would pass even with the broken `useState(getMockReactions())` pattern — that is the BB-45 trap.

---

### Decision 8: Friends Migration (Phase 2.5)

**The decision.** Friends data migrates to the backend in Phase 2.5 (between activity engine and Prayer Wall data). Same dual-write strategy as the activity engine. The existing `wr_friends` data structure is preserved; the backend receives a shadow copy.

**Why migrate friends:** Phase 7.6 (friends pin to top of Prayer Wall feed) requires the backend to know which posts are by friends of the current user. Without a backend friends table, that feature can only work for friends-on-this-device. Migrating friends in Phase 2.5 unblocks Phase 7.6 cleanly. It also unblocks Phase 12's "friend posted" notification type and Phase 8's profile friends tab cross-device sync.

**The schema:**

```sql
friend_relationships
  user_id          UUID NOT NULL REFERENCES users(id)
  friend_user_id   UUID NOT NULL REFERENCES users(id)
  status           VARCHAR(20) NOT NULL  -- 'active', 'blocked'
  created_at       TIMESTAMP NOT NULL DEFAULT NOW()
  PRIMARY KEY (user_id, friend_user_id)

friend_requests
  id               UUID PRIMARY KEY
  from_user_id     UUID NOT NULL REFERENCES users(id)
```
```
  to_user_id       UUID NOT NULL REFERENCES users(id)
  status           VARCHAR(20) NOT NULL  -- 'pending', 'accepted', 'declined', 'cancelled'
  message          TEXT NULL
  created_at       TIMESTAMP NOT NULL DEFAULT NOW()
  responded_at     TIMESTAMP NULL
  UNIQUE (from_user_id, to_user_id)
```

**The mutual friendship rule:** When a request is accepted, two rows are inserted into `friend_relationships` (A→B and B→A). Block is unidirectional (A blocks B inserts one row with `status='blocked'` from A to B). Querying "is X a friend of Y?" checks for an `active` row from Y to X.

**Friends API responses denormalize per-friend profile data.** The existing frontend (per `friends-system.md`) reads `level`, `levelName`, `currentStreak`, `faithPoints`, `weeklyPoints`, `lastActive` directly from the `wr_friends` localStorage `FriendProfile` shape. The backend `friend_relationships` schema does NOT store these fields, but `GET /api/v1/users/me/friends` MUST return them by joining with `users`, `faith_points`, `streak_state`, and `activity_log` (for `weeklyPoints` computation). The response DTO shape:

```
FriendDto {
  id: string                  // friend's user ID
  displayName: string         // computed by DisplayNameResolver
  avatarUrl: string | null
  level: number               // 1-6, from faith_points.current_level
  levelName: string           // computed: Seedling/Sprout/Blooming/Flourishing/Oak/Lighthouse
  currentStreak: number       // from streak_state.current_streak
  faithPoints: number         // from faith_points.total_points
  weeklyPoints: number        // SUM(activity_log.points_earned) WHERE occurred_at >= getCurrentWeekStart()
  lastActive: string          // ISO timestamp from users.last_active_at
}
```

This denormalize-on-read approach matches existing UI assumptions, avoids N+1 fetch storms, and stays performant up to ~500 friends per user (the existing 250-friend cap in `friends-system.md` is preserved). Backend computes `weeklyPoints` with a single aggregating query joined into the friends list query, not per-friend lookups.

**API endpoints** (Phase 2.5):

- `GET /api/v1/users/me/friends` — returns the current user's friends with display names, levels, streaks, last active
- `GET /api/v1/users/me/friend-requests` — returns pending incoming and outgoing requests
- `POST /api/v1/users/me/friend-requests` — create a friend request
- `PATCH /api/v1/friend-requests/{id}` — accept / decline / cancel
- `DELETE /api/v1/users/me/friends/{friendId}` — remove a friend
- `POST /api/v1/users/me/blocks` — block a user
- `DELETE /api/v1/users/me/blocks/{userId}` — unblock a user
- `GET /api/v1/users/search?q=name` — search for users by name (for the friend-add UI)

The frontend dual-writes friend actions to both `wr_friends` and the backend. The existing `useFriends` hook gains a fire-and-forget API call alongside its existing localStorage write. Reads continue to come from `wr_friends` during this wave.

**Phase 2.5 also dual-writes `wr_social_interactions` and `wr_milestone_feed`** — these localStorage keys are owned by the existing `social-interactions.md` spec (encouragements, nudges, recap dismissals, milestone feed events). The backend gets shadow tables `social_interactions` and `milestone_events` with the same dual-write strategy. Encouragements (3-per-friend-per-day rate limit), nudges (1-per-friend-per-week rate limit), and milestone events are preserved during migration. Notifications generated by these interactions (encouragement, nudge, friend_milestone, weekly_recap) flow through Phase 12's notification taxonomy — see Patch 8 for the consolidated 14-type catalog.

**Privacy:** User search results respect the existing privacy: blocked users do not appear in search results for either party. The current user does not appear in their own search results. Phase 8's privacy tier system extends this further (private profiles are searchable only by friends, etc.).

### Decision 9: Service Layer Is the API Swap Point

**The key finding from the audit.** The existing `frontend/src/services/` directory is a pure storage layer. Every service file follows the same pattern: synchronous `get*` / `load*` reads from localStorage, synchronous `add*` / `update*` / `remove*` writes to localStorage, no React dependencies, no async operations, defensive try/catch around localStorage access.

**The decision.** Each feature-specific service file gets a corresponding API implementation in a new `frontend/src/services/api/` subdirectory during the Forums Wave. For example:

- `services/prayer-list-storage.ts` → `services/api/prayer-list-api.ts` (Phase 3, but only as a future migration target — Save-to-prayer-list stays on localStorage in this wave)
- `services/faith-points-storage.ts` → `services/api/faith-points-api.ts` (Phase 2, dual-write)
- `services/badge-storage.ts` → `services/api/badge-api.ts` (Phase 2, dual-write)
- `services/social-storage.ts` → `services/api/social-api.ts` (Phase 2.5, dual-write)
- `services/leaderboard-storage.ts` → `services/api/leaderboard-api.ts` (Phase 2.5)
- New: `services/api/prayer-wall-api.ts` (Phase 3, full backend swap with localStorage fallback)

The API implementations expose the **same function signatures** as the storage implementations. They just hit the backend instead of localStorage. A thin `services/index.ts` chooses which implementation to use based on environment flags:

```typescript
// services/index.ts (illustrative)
import * as localPrayerWall from "./prayer-wall-storage";
import * as apiPrayerWall from "./api/prayer-wall-api";

export const prayerWall =
  import.meta.env.VITE_USE_BACKEND_PRAYER_WALL === "true"
    ? apiPrayerWall
    : localPrayerWall;
```

This gives three benefits:

1. **Gradual migration.** Features flip to the backend one at a time via env flag.
2. **Easy rollback.** If the backend Prayer Wall explodes, flip the flag back to localStorage.
3. **Dual-write compatibility.** Some services (faith points, friends) keep localStorage as primary and add a fire-and-forget API write — same swap point pattern, different write strategy.

**Reactive stores** are the swap point for newer code. Phase 0.5's `wr_prayer_reactions` reactive store gets a backend adapter in Phase 3 that replaces the localStorage write/read while preserving the `useSyncExternalStore` subscription pattern. Tests continue to pass because the store's public API is unchanged.

**Feature flags introduced in this wave:**

- `VITE_USE_BACKEND_AUTH` — Phase 1, defaults to `false`, flipped to `true` at end of Phase 1
- `VITE_USE_BACKEND_ACTIVITY` — Phase 2, controls whether `recordActivity` dual-writes
- `VITE_USE_BACKEND_FRIENDS` — Phase 2.5, controls whether friend actions dual-write
- `VITE_USE_BACKEND_PRAYER_WALL` — Phase 3, controls whether Prayer Wall reads come from backend

Each flag defaults to `false` until its phase's cutover spec ships. The cutover specs at the end of each phase flip the default to `true`.

### Decision 10: Liquibase Structure and Migration Discipline

**Layout:**

```
backend/
  src/main/resources/
    db/
      changelog/
        master.xml                              (master changelog, includes all sub-changelogs in order)
        2026-04-14-001-create-users-table.xml
        2026-04-14-002-extend-users-username.xml
        2026-04-15-001-create-faith-points-table.xml
        2026-04-15-002-create-streak-state-table.xml
        ...
        contexts/
          dev-seed.xml                          (dev-only seed data, context='dev')
          test-seed.xml                         (test-only seed data, context='test')
```

**Rules:**

1. One changeset per logical change. No bundled mega-migrations. A changeset that creates a table is one file. A changeset that adds a column to that table is a different file.
2. Every changeset has a meaningful `id` and `author`. `id` follows `YYYY-MM-DD-NNN` for chronological sorting.
3. Forward-only by default. Rollback blocks only for non-destructive changes (creating a table can be rolled back; dropping a column with data cannot).
4. Seed data lives in context-specific changesets. `dev` context only runs against local dev DB. `test` context only runs in Testcontainers integration tests. Production runs with no context.
5. Never edit a committed changeset — Liquibase tracks checksums and will fail to apply changesets whose checksums have changed. Add a new changeset instead.
6. Every changeset must let Liquibase track its application via the `DATABASECHANGELOG` table (which Liquibase manages automatically).
7. Use Liquibase XML format (not YAML, not SQL) — XML has the broadest tooling support and matches Eric's work experience.
8. Foreign keys with `ON DELETE CASCADE` for any child table whose rows should disappear when the parent user is deleted (`activity_log`, `faith_points`, `streak_state`, `user_badges`, `friend_relationships`, etc.).

**Spring profile activation:**

- `application.properties` (default): `spring.liquibase.enabled=true`, no context (production-safe)
- `application-dev.properties`: `spring.liquibase.contexts=dev`
- `application-test.properties`: `spring.liquibase.contexts=test`
- `application-prod.properties`: explicit no context (defensive)

**Migration safety on production deploys:** Liquibase runs on application startup. A failing changeset prevents the application from starting, which prevents bad migrations from being silently applied. This is the desired behavior — fail loud, fail fast, fix forward.

### Decision 11: API Conventions Match the Project Standard

Every backend endpoint built in the Forums Wave conforms to `.claude/rules/03-backend-standards.md`. Restating the contract here so specs can reference it without re-reading the rule file:

**Success response shape:**

```json
{
  "data": { ... resource or list ... },
  "meta": {
    "requestId": "uuid",
    "page": 1,
    "limit": 20,
    "total": 100
  }
}
```

`meta.page` / `limit` / `total` only present on paginated endpoints.

**Error response shape:**

```json
{
  "code": "ERROR_CODE_SCREAMING_SNAKE",
  "message": "Human-readable message",
  "requestId": "uuid",
  "timestamp": "2026-04-14T10:30:00Z"
}
```

**Standard error codes** (Forums Wave additions):

- `INVALID_INPUT` — validation failure (400)
- `UNAUTHORIZED` — no token or invalid token (401)
- `FORBIDDEN` — token valid but insufficient permissions (403)
- `NOT_FOUND` — resource does not exist (404)
- `CONFLICT` — duplicate resource, race condition (409)
- `RATE_LIMITED` — too many requests (429)
- `CRISIS_DETECTED` — content flagged by crisis detection, post still created with `crisis_flag=true` and resources surfaced in UI (200 with special body field, NOT an error)
- `SERVER_ERROR` — internal error (500)

**Required headers on every response:**

- `X-Request-Id`: UUID, also embedded in `meta.requestId`
- `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`: rate limit state for the calling user
- `Retry-After` (only on 429): seconds until next allowed request

**Pagination:**

- Query params: `?page=1&limit=20` (default `page=1`, `limit=20`, max `limit=50`)
- Response `meta.page`, `meta.limit`, `meta.total`

**Versioning:**

- `/api/v1/` prefix from day one
- Future breaking changes go under `/api/v2/` while `/api/v1/` continues to work
- Phase 1 moves the existing `/api/health` and `/api/hello` endpoints to `/api/v1/health` and `/api/v1/hello` for consistency

**OpenAPI spec:**

- Single source of truth at `backend/api/openapi.yaml`
- Linted with Spectral (or similar) in CI
- Frontend types regenerated via `openapi-typescript` on every build
- Springdoc serves Swagger UI at `/api/docs` in dev profile only (never prod)

**CORS** (already configured in `CorsConfig.java` for `http://localhost:5173`):

- Allowed origins: `http://localhost:5173` (dev), `https://worshiproom.com` (prod, when deployed)
- Allowed methods: `GET, POST, PUT, PATCH, DELETE, OPTIONS`
- Allowed headers: `Content-Type, Authorization, X-Request-Id`
- Credentials: `false` for MVP (in-memory JWT, no cookies). Set to `true` only if migrating to cookie-based JWT in the future.

### Decision 12: Testing Strategy

**Backend tests are integration-heavy via Testcontainers.** Real PostgreSQL container per test run, full Liquibase migrations applied, test seed data loaded, tests run against the real database, container torn down. H2 lies about PostgreSQL behavior — never use it. The `AbstractIntegrationTest` base class introduced in Phase 1 spec 1.7 sets up the container and is extended by every integration test.

**Backend unit tests cover pure logic only.** Faith point calculation, level threshold checks, streak update logic, badge eligibility, display name resolution, crisis keyword matching — pure functions with no I/O. Anything that touches the database or the network is an integration test.

**Frontend tests follow existing conventions.** Vitest + React Testing Library for components and hooks. MSW (Mock Service Worker) for API mocking against generated OpenAPI types. Reactive store consumer tests MUST verify subscription per the BB-45 pattern documented in `.claude/rules/06-testing.md` — mutate the store after mount, assert the component re-renders. A test that only sets initial state and asserts initial render passes the broken `useState(getX())` pattern and is therefore a false-positive test.

**End-to-end tests use Playwright.** Each spec that touches user-facing behavior includes a Playwright verification step in its acceptance criteria. Eric's existing `/playwright-recon` and `/verify-with-playwright` skills run these. Specs explicitly document the y-coordinate alignment expectations for inline-row layouts so visual verification can compare `boundingBox().y` values per `.claude/rules/04-frontend-standards.md` § Inline Element Layout.

**Drift detection tests.** Where the same logic exists in both frontend and backend (faith point calculation, badge eligibility, level thresholds), a drift-detection test parses both implementations and asserts parity. Catches the "you updated one side and forgot the other" failure mode. The test file lives in the backend test suite and parses the frontend constants file via a small TypeScript-aware reader.

**Definition of done** (per `.claude/rules/06-testing.md`):

- UI implemented + responsive (mobile, tablet, desktop)
- Backend endpoint implemented (if needed)
- Tests added/updated (frontend + backend)
- Reactive store consumer tests added if reading from a reactive store
- Rate limiting + logging on AI endpoints
- Error states + loading states handled
- Accessibility basics (labels, keyboard nav, ARIA where needed)
- Lighthouse 90+/95+ on touched pages
- No secrets committed
- AI safety checks if user input involved
- New localStorage keys documented in `11-local-storage-keys.md`
- Animation tokens imported from `frontend/src/constants/animation.ts`, not hardcoded
- Documentation updated for public-facing features or API changes

**Test count expectations (rough, per spec):**

- Small spec (S): 5-10 tests
- Medium spec (M): 10-20 tests
- Large spec (L): 20-40 tests
- Extra-large spec (XL): 40+ tests
- Reactive store specs always include at least one cross-mount subscription test

---

### Decision 13: Migration Ordering Rules

There is a correct order to do this, and deviations create pain:

1. **Foundation before features.** Phase 0 → Phase 0.5 (quick win, parallel-OK after Phase 0) → Phase 1 → Phase 2 → Phase 2.5 → Phase 3. Cannot skip. Phases 4-16 can interleave more flexibly but Phase 3 must complete first.

2. **Schema before API before frontend.** Within a phase: Liquibase changeset → backend repository → backend service → backend controller → backend test → OpenAPI spec → frontend type regeneration → frontend service swap → frontend test update. Following this order catches mistakes as early as possible — a wrong column type fails the integration test before any frontend code is written.

3. **Read endpoints before write endpoints.** Verify the frontend can hydrate from the backend before trusting the backend to accept writes. A read endpoint that returns garbage is a fast feedback loop. A write endpoint that accepts garbage is a slow, painful one.

4. **Backward-compatible changes only mid-phase.** Breaking changes happen at phase boundaries. Mid-phase, every change must work with both the old and new state of the system. This lets Eric stop work mid-phase without breaking the app.

5. **Feature flags for risky migrations.** Service implementation swaps gated behind env vars (`VITE_USE_BACKEND_PRAYER_WALL`, etc.). The flag defaults to "old" and flips to "new" only when the spec is complete. This lets us land specs and still have a working app at every intermediate point.

6. **Visual work runs in parallel with data work.** Phase 5 (visual migration) touches JSX/Tailwind. Phase 3 (data migration) touches services. They rarely collide. Phase 5 can run alongside Phase 3 without coordination, provided the Phase 5 changes do not accidentally introduce bugs in the data flow.

7. **Profile work waits for user model.** Phase 8 (Unified Profile System) cannot start until Phase 1 is complete. But within Phase 8, the URL migration and the visual layout work can run in parallel.

8. **Dependent specs are explicit.** Every spec lists its prerequisites by spec ID in the Prerequisites field. CC must verify prerequisites are complete before starting work on a spec. If a prerequisite is missing, stop and ask Eric — do not try to work around it.

9. **The reaction quick win (Phase 0.5) is independent.** It can ship any time after Phase 0. It does not depend on Phase 1 because it touches only frontend code and a new localStorage key. It can ship in parallel with Phase 1 work for a fast user-visible win.

10. **Cutover specs at the end of each migration phase.** Each phase that swaps a feature (Phase 1 auth, Phase 2 activity engine, Phase 2.5 friends, Phase 3 prayer wall) ends with a cutover spec that flips the feature flag default and does end-to-end smoke testing. Cutover specs are small but mandatory — they prevent half-migrated state.

### Decision 14: Save vs Bookmark — Two Distinct Features

**The audit caught this:** v1 conflated two separate Prayer Wall features.

- **Bookmark** (`InteractionBar` "Bookmark" button): Saves a Prayer Wall post to the user's Prayer Wall bookmarks. Shows up in `PrayerWallDashboard`'s "Bookmarks" tab. Currently lives in the broken `usePrayerReactions` state under `isBookmarked`. After Phase 0.5 it lives in the `wr_prayer_reactions` reactive store. After Phase 3 it lives in the `post_bookmarks` table on the backend.

- **Save** (`InteractionBar` "Save" button → `SaveToPrayersForm`): Adds a Prayer Wall post to the user's personal `/my-prayers` page (a separate prayer reminder system with its own UI and its own data store). The user can set reminders, mark prayers answered in the personal list, etc. Lives at `wr_prayer_list` localStorage key. **NOT migrated to the backend in this wave.** Future waves of Phase 3 will migrate it.

These are two different features and the Forums Wave preserves both. Phase 3's API design includes:

- `POST /api/v1/posts/{id}/bookmark` and `DELETE /api/v1/posts/{id}/bookmark` for the Prayer Wall bookmark
- The personal prayer list (`/my-prayers`) stays on localStorage during this wave — it is NOT touched. The Save button on a Prayer Wall card still writes to `wr_prayer_list` locally.

**Why we are not migrating `/my-prayers` in this wave:** Scope. The personal prayer list is a separate feature with its own UX (reminders, mark-as-answered, custom titles, dates). Migrating it would require a full additional sub-phase. Out of scope for the Forums Wave; revisit in a future wave.

**What CC needs to know about this distinction:** When implementing Prayer Wall components, the Bookmark button writes to `post_bookmarks` (backend, after Phase 3) and the Save button writes to `wr_prayer_list` (localStorage, unchanged). They are visually adjacent in the InteractionBar but they are completely different code paths.

### Decision 15: The 10 Categories (Including Mental Health)

**The audit caught this too:** v1 said "8 categories" — wrong. The current count is 10:

1. **Health** (`health`)
2. **Mental Health** (`mental-health`) — added in `prayer-wall-category-layout.md`, missing from v1
3. **Family** (`family`)
4. **Work** (`work`)
5. **Grief** (`grief`)
6. **Gratitude** (`gratitude`)
7. **Praise** (`praise`)
8. **Relationships** (`relationships`)
9. **Other** (`other`)
10. **Discussion** (`discussion`) — reserved for QOTD responses, added in `prayer-wall-question-of-day.md`

Plus a conditional **Pray40** category that only appears during Lent's Pray40 challenge (existing pattern).

**Categories are not user-creatable.** Hardcoded list. Categories are referenced by slug in `posts.category`. A new category requires a Liquibase migration to update the CHECK constraint and a frontend constants update. The frontend constants live at `frontend/src/constants/prayer-categories.ts` (existing).

The Forums Wave preserves all 10 categories and the Pray40 conditional. New post types (Phase 4) all use this same category set — a Testimony in the Health category, a Question in the Mental Health category, etc. The category list does not change with post type expansion.

**Mental Health gets specific consideration:**

- Posts in Mental Health are eligible for crisis detection escalation in Phase 10
- The 3am Watch hero feature in Phase 6 surfaces Mental Health posts more prominently in night mode
- Local Support bridges in Phase 7 surface counselor listings when a Mental Health post is composed (gentle, non-modal)
- Trust level requirements for new accounts may be slightly stricter for Mental Health responses (Phase 10) to discourage drive-by advice on vulnerable posts

**The Discussion category is special:**

- Reserved for QOTD responses (`qotd_id` foreign key set on the post)
- Manual posts in the Discussion category are allowed but the QOTD flow is the primary use case
- Discussion posts have their own visual treatment (slightly different card chrome — see Phase 4)

**Note for backend developers:** The `discussion` category value is allowed in the `posts.category` CHECK constraint for both QOTD responses (where `qotd_id IS NOT NULL`) and manual discussion posts (where `qotd_id IS NULL`). The constraint does NOT enforce a `qotd_id` requirement on the discussion category. Application-layer validation may add a soft warning when a discussion post lacks a `qotd_id`, but the database accepts both shapes.

### Decision 16: Existing Components Are Extended, Not Rebuilt

**The audit catalogued every existing Prayer Wall component.** Phase 4 (post type expansion) and Phase 5 (visual migration) extend these components rather than replacing them.

**Existing components in `frontend/src/components/prayer-wall/`:**

| Component                | Current behavior                                                                                   | Forums Wave change                                                                                                    |
| ------------------------ | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `PrayerCard.tsx`         | Renders a prayer with avatar, name, date, content, expand/collapse, category badge, answered badge | Phase 4: gain `postType` prop, render type-specific chrome. Phase 5: migrate inline frosted styles to `<FrostedCard>` |
| `InteractionBar.tsx`     | Pray button, Comment button, Bookmark button, Share button, Save button                            | Phase 3: backend wiring. Phase 4: gain reaction label variation per post type ("Amen" for Testimony)                  |
| `InlineComposer.tsx`     | Single-textarea composer with category picker, anonymous toggle, char counter, crisis detection    | Phase 4: extracted into a shared base, with type-specific composers wrapping it                                       |
| `CommentsSection.tsx`    | Renders comment list with expand/collapse, comment input                                           | Phase 3: backend wiring. Phase 4: support threaded replies for Discussion type                                        |
| `CommentInput.tsx`       | Single-line input with @mention support                                                            | Phase 3: backend wiring                                                                                               |
| `CommentItem.tsx`        | Single comment row with avatar, name, content, @mention rendering                                  | Phase 4: support nested rendering for threaded replies                                                                |
| `Avatar.tsx`             | Circular avatar with initials fallback                                                             | No change — already correct                                                                                           |
| `CategoryBadge.tsx`      | Category pill, clickable to filter feed                                                            | No change — already correct                                                                                           |
| `CategoryFilterBar.tsx`  | Sticky filter bar with horizontal scroll, fade gradient                                            | Phase 4: reworked into `RoomSelector` for post-type rooms                                                             |
| `AnsweredBadge.tsx`      | Green badge on answered prayers, optional praise text                                              | No change — already correct                                                                                           |
| `MarkAsAnsweredForm.tsx` | Inline form to mark prayer answered                                                                | Phase 3: backend wiring                                                                                               |
| `ReportDialog.tsx`       | Report a prayer modal                                                                              | Phase 3: backend wiring. Phase 10: extended with reason picker                                                        |
| `DeletePrayerDialog.tsx` | Delete confirmation                                                                                | Phase 3: backend wiring (soft delete)                                                                                 |
| `ShareDropdown.tsx`      | Share via Web Share API or dropdown                                                                | No change — already correct                                                                                           |
| `AuthModal.tsx`          | Login/register modal shell                                                                         | Phase 1: wired to real JWT auth                                                                                       |
| `AuthModalProvider.tsx`  | Context provider for auth modal                                                                    | No change — already correct                                                                                           |
| `PageShell.tsx`          | Prayer Wall page wrapper                                                                           | Phase 5: HorizonGlow integration                                                                                      |
| `PrayerWallHero.tsx`     | Hero section with title and gradient                                                               | Phase 5: replaced with canonical `PageHero`                                                                           |
| `QotdBadge.tsx`          | "Re: Question of the Day" badge on responses                                                       | No change — already correct                                                                                           |
| `QotdComposer.tsx`       | QOTD response composer                                                                             | Phase 3: backend wiring. Phase 5: visual migration                                                                    |
| `QuestionOfTheDay.tsx`   | QOTD card displaying today's question                                                              | Phase 3: read from backend instead of frontend constant                                                               |
| `SaveToPrayersForm.tsx`  | Save to personal prayer list form                                                                  | No change — `/my-prayers` not migrated this wave                                                                      |

**The principle:** if a component already exists and works, extend it. Only create a new component when there is genuinely no existing component that can be extended. New post types in Phase 4 do not get `TestimonyCard.tsx`, `QuestionCard.tsx`, etc. — they get a `postType` prop on `PrayerCard.tsx` that switches type-specific chrome.

**Why this matters:** Eric has spent significant time polishing these components. Rebuilding them would lose that polish, introduce regressions, and waste effort. The audit confirmed that every component in the existing set is either correct as-is or needs modest extension. Phase 4 and Phase 5 specs explicitly call out which existing component each change touches.

**Reactive store consumers in the Forums Wave:**

- `PrayerCard.tsx` reads from `usePrayerReactions()` (Phase 0.5 reactive store)
- `InteractionBar.tsx` reads from `usePrayerReactions()` (Phase 0.5 reactive store)
- `PrayerWallDashboard.tsx` (page) reads from `usePrayerReactions()` (Phase 0.5 reactive store)
- `PrayerWallProfile.tsx` (page) reads from `usePrayerReactions()` (Phase 0.5 reactive store)
- New components added in later phases that read prayer state must also use `usePrayerReactions()` and must include the BB-45 subscription test

---

_End of Architectural Foundation. Phase breakdowns follow._

---

## Phase 0 — Backend Foundation Learning

> **Phase purpose:** Give Eric the mental model he needs before any backend code is written. This is a single spec, not a CC execution spec — it is a teaching document Eric reads end-to-end before Phase 1 begins.

**What this phase accomplishes:** After reading this phase's one document, Eric has a working understanding of Maven (his first time on this project — the Bible wave was all frontend), Spring Boot's core concepts as they apply to the existing skeleton, Spring Data JPA (and the JPA pitfalls to avoid), Liquibase changesets in this project's structure (builds on his work experience), Spring Security + JWT token flow, OpenAPI as a contract, Testcontainers for integration testing, and the rough shape of the daily development loop. He does not need to be an expert. He needs to not feel lost when CC starts generating Java files.

**Sequencing:** Runs before Phase 1. Everything else in the Forums Wave waits on this being read and understood. Phase 0.5 (reaction quick win) can ship in parallel with reading this doc since it touches only frontend code.

### Spec 0.1 — Backend Foundation Learning Document

- **ID:** `round3-phase00-spec01-backend-foundation-learning`
- **Type:** Teaching document (not a CC execution spec — Eric reads this himself)
- **Size:** L (15-25 pages of reading, one to two hours)
- **Risk:** Low (no code changes)
- **Prerequisites:** None
- **Goal:** Eric finishes this document with enough backend mental model to review backend specs confidently, push back on architectural choices he disagrees with, and debug backend issues when CC gets confused.

**What the document covers:**

1. **Why we are doing this.** Five-minute framing of why the Forums Wave needs a backend. The "services layer is already a clean swap point" finding from the audit. The reaction persistence bug as a concrete motivator. The dual-write strategy as the safety net.

2. **What is already in the backend folder.** Tour of the existing `backend/` skeleton: `pom.xml`, `WorshipRoomApplication.java`, `CorsConfig.java`, `ApiController.java`, `Dockerfile`. Explain what Maven is (compared to Gradle, since Eric has used Gradle before via the wrapper). Explain why we are using Maven (it is what is already in the repo and CLAUDE.md says so).

3. **Installing the toolchain.** Step-by-step instructions for installing Docker Desktop (already present from BB-26 work), JDK 21 (Temurin), and confirming the existing `./mvnw spring-boot:run` command works. Includes troubleshooting for the most common install problems on macOS.

4. **The daily development loop.** What Eric actually does each morning to start working. `docker compose up -d postgres` to start the database in the background. `cd backend && ./mvnw spring-boot:run` to start the backend. `cd frontend && pnpm dev` to start the frontend (he already knows this one). How frontend and backend hot-reload work in parallel. How to stop everything cleanly at the end of the day. How to wipe the database (`docker compose down -v`) when you want a clean slate.

5. **Spring Boot concepts, by example.** Walks through the existing `ApiController.java` line by line and explains every annotation: `@RestController`, `@RequestMapping`, `@GetMapping`, `@PostMapping`, `@RequestBody`, `@PathVariable`, `@Autowired`, `@Service`, `@Repository`, `@Component`, `@Configuration`, `@Bean`. No lecture; every concept is introduced by showing code Eric will see in the Forums Wave. Emphasis on: Spring Boot is opinionated, these annotations are how you signal your intent to the framework, and you do not need to understand the framework internals to use it correctly.

6. **JPA and Hibernate — what to use and what to avoid.** The teaching point Eric needs to internalize: Hibernate's lazy loading and bidirectional relationship mappings are a footgun. For the Forums Wave we use **Spring Data JPA repositories with explicit fetch joins** for anything non-trivial. We avoid bidirectional `@OneToMany` / `@ManyToOne` pairings unless they earn their place. The N+1 query problem is shown with a concrete example (loading 20 prayers and accidentally firing 21 queries because of lazy author loading). The fix (explicit `@Query` with `JOIN FETCH`) is shown alongside.

7. **Liquibase (leveraging Eric's existing knowledge).** Short section that assumes Eric knows Liquibase from work and just maps the concepts to our setup: where changesets live, how contexts work (dev vs test vs production), the directory structure decision from the Architectural Foundation, and the rule of "one changeset per logical change, never edit committed changesets."

8. **Spring Security + JWT token flow.** The concept map: user logs in via `POST /api/v1/auth/login` with email + password → backend BCrypt-verifies password → backend mints a JWT signed with `JWT_SECRET` → frontend stores token in React state → frontend sends `Authorization: Bearer <token>` on every API call → backend's `JwtAuthenticationFilter` validates the signature and expiry → backend extracts the user ID from the `sub` claim → controllers use `@AuthenticationPrincipal` to get the user. No magic; every step is shown with code.

9. **OpenAPI as a contract.** Short explanation of what OpenAPI is, why we are using it, how types get generated for the frontend, what the daily workflow looks like (edit spec → regenerate types → implement → test). Less teaching, more workflow. Shows the `npm run types:generate` command Eric will run.

10. **Testcontainers.** The one thing that surprises people: the integration tests spin up a real PostgreSQL inside a Docker container for each test run. The document explains why (H2 lies about PostgreSQL behavior) and shows a one-page example of a test using `AbstractIntegrationTest`.

11. **The Spring profiles system.** How `application.properties`, `application-dev.properties`, `application-test.properties`, `application-prod.properties` work together. How environment variables override properties values. Where secrets go (never in git; in environment variables or a local `.env` file that is gitignored).

12. **CORS, or: why your frontend cannot talk to your backend on the first try.** The existing `CorsConfig.java` already handles this for `localhost:5173`. The doc explains why CORS exists and what to change when adding the production frontend origin.

13. **What you are allowed to forget.** The document ends with a page listing every Spring Boot / JPA / Hibernate / Maven concept Eric is explicitly allowed to ignore for the Forums Wave: XML-based bean configuration, Spring MVC view templates (we are API-only, no Thymeleaf), JPA entity inheritance strategies, Maven multi-module projects, Spring AOP, Spring Cloud. The list exists so Eric knows what to skip when reading Spring Boot tutorials online.

**Delivery:** This document is delivered as a standalone markdown file (`_specs/forums/spec-0-1.md`) that Eric reads once. It is not a CC execution spec. Eric reads, digests, asks questions in chat if anything is unclear, and then we move into Phase 1. CC is told (in the spec header) that this is a reading document and not to attempt execution.

**Why this is a full spec instead of skipped:** The single biggest failure mode for the Forums Wave is Eric feeling lost when CC generates Java files and losing trust in the process. This document prevents that failure mode by giving Eric enough mental model to stay grounded. It is the highest-leverage artifact in the entire Forums Wave.

---

## Phase 0.5 — Reaction Persistence Quick Win

> **Phase purpose:** Fix the worst current Prayer Wall bug in one day, before any backend work starts. Convert `usePrayerReactions` from `useState(getMockReactions())` to a reactive store with `useSyncExternalStore`, persisting to `wr_prayer_reactions`. Cross-page consistency works immediately and the migration path to backend in Phase 3 is trivial.

**What this phase accomplishes:** After this phase, tapping Pray on a prayer card on the feed and navigating to the detail page shows the same praying state. Same for bookmarks. Same across all four pages (PrayerWall, PrayerWallDashboard, PrayerDetail, PrayerWallProfile). The reaction state survives navigation, page refresh, and tab switching. The user notices nothing else — the visual UI is unchanged.

**Sequencing:** Can ship any time after Phase 0 is read. Independent of all backend work. Recommended to ship in parallel with Phase 1 for a fast user-visible win while the bigger backend work is in flight.

### Spec — Convert usePrayerReactions to a Reactive Store

- **ID:** `round3-phase00-5-spec01-prayer-reactions-reactive-store`
- **Size:** M (one day of work)
- **Risk:** Medium (touches all four Prayer Wall pages, but the change is mechanical)
- **Prerequisites:** Phase 0 read
- **Goal:** Convert `usePrayerReactions` from snapshot-without-subscription to a reactive store using `useSyncExternalStore` (Pattern A). Persist to `wr_prayer_reactions` localStorage key. All four Prayer Wall pages now share state.

**Approach:**

1. Create a new module at `frontend/src/lib/prayer-wall/reactionsStore.ts` following the BB-45 reactive store pattern:
   - Internal `Map<string, PrayerReaction>` cache, seeded from localStorage on first read
   - `getReactions()` returns the current cache
   - `getReaction(prayerId)` returns the reaction for a single prayer
   - `togglePraying(prayerId)` mutates the cache, writes to localStorage, notifies listeners
   - `toggleBookmark(prayerId)` mutates the cache, writes to localStorage, notifies listeners
   - `subscribe(listener)` adds a listener and returns an unsubscribe function
   - `getSnapshot()` returns the current cache reference (for `useSyncExternalStore`)
   - Defensive try/catch around all localStorage access (graceful degradation if storage is unavailable)

2. Create a new hook at `frontend/src/hooks/usePrayerReactions.ts` (replacing the existing file):

```tsx
export function usePrayerReactions() {
  const reactions = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return {
    reactions,
    togglePraying,
    toggleBookmark,
  };
}
```

The hook returns the same shape as before (`{ reactions, togglePraying, toggleBookmark }`) so consumer components do not change.

3. Seed the store from `getMockReactions()` on first load if `wr_prayer_reactions` is empty. This preserves the existing mock data behavior for the demo experience.

4. Add a one-time migration: on first load, if the localStorage key is empty AND `getMockReactions()` returns data, write the mock reactions to localStorage. After this one-time seed, the store is the source of truth.

5. Document the new store in `.claude/rules/11-local-storage-keys.md`:
   - Key: `wr_prayer_reactions`
   - Type: `Record<string, PrayerReaction>`
   - Module: `lib/prayer-wall/reactionsStore.ts`
   - Subscription pattern: Pattern A via `usePrayerReactions()` hook

**Files to create:**

- `frontend/src/lib/prayer-wall/reactionsStore.ts`
- `frontend/src/lib/prayer-wall/__tests__/reactionsStore.test.ts`
- `frontend/src/hooks/__tests__/usePrayerReactions.subscription.test.tsx` (the BB-45 subscription test)

**Files to modify:**

- `frontend/src/hooks/usePrayerReactions.ts` (rewrite to use the new store)
- `.claude/rules/11-local-storage-keys.md` (add the new key entry)

**Acceptance criteria:**

- [ ] Store module created at `frontend/src/lib/prayer-wall/reactionsStore.ts`
- [ ] Store exposes `getReactions`, `getReaction`, `togglePraying`, `toggleBookmark`, `subscribe`, `getSnapshot`
- [ ] Store persists to `wr_prayer_reactions` localStorage key
- [ ] Store seeds from `getMockReactions()` on first load if storage is empty
- [ ] Hook `usePrayerReactions()` rewritten to use `useSyncExternalStore`
- [ ] Hook return shape unchanged (`{ reactions, togglePraying, toggleBookmark }`)
- [ ] Tapping Pray on PrayerWall feed and navigating to PrayerDetail shows the praying state still active
- [ ] Tapping Pray on PrayerDetail and navigating back to PrayerWall feed shows the praying state still active
- [ ] Reaction state persists across full page refresh
- [ ] Bookmark state persists across full page refresh
- [ ] PrayerWallDashboard shows the same reaction state as the feed
- [ ] PrayerWallProfile shows the same reaction state as the feed
- [ ] At least 8 unit tests cover the store (CRUD, persistence, mock seed, defensive storage, subscription notification)
- [ ] At least 1 subscription test verifies the BB-45 pattern: render component, mutate store from outside, assert re-render
- [ ] localStorage corruption (invalid JSON) gracefully falls back to mock seed without crashing
- [ ] Anonymous browsing (storage unavailable) does not crash — falls back to in-memory state for the session
- [ ] `.claude/rules/11-local-storage-keys.md` updated with the new key entry
- [ ] No TypeScript errors, no new lint warnings
- [ ] All existing Prayer Wall tests continue to pass

**Testing notes:**

- Unit tests for the store cover all CRUD operations and edge cases
- The subscription test is mandatory and must mutate the store from outside the rendered component
- Manual QA: open PrayerWall in two browser tabs, tap Pray in tab 1, switch to tab 2, refresh, verify the reaction is still active
- Playwright: feed → tap Pray → navigate to detail → assert button is in praying state → navigate back → assert button is still in praying state

**Notes for plan phase recon:**

1. Verify `getMockReactions()` is the only source of seeding and identify all call sites
2. Confirm the existing `PrayerReaction` type at `frontend/src/types/prayer-wall.ts` is suitable for the store cache shape
3. Identify any tests that mock `usePrayerReactions` directly and update them to use the real store
4. Check whether `useSyncExternalStore` requires React 18 (it does — confirm React version in `frontend/package.json`)

**Out of scope:**

- Backend integration (Phase 3)
- Multi-device sync (Phase 3)
- Optimistic update reconciliation (Phase 3)
- Migration of bookmarks to a separate store (kept on the same store for simplicity in Phase 0.5; Phase 3 may split)

**Out-of-band notes for Eric:**

- This is the smallest meaningful win in the Forums Wave. Total estimated effort: under one day for CC.
- The most likely failure mode: forgetting the BB-45 subscription test. The test must mutate the store _after_ the component mounts and assert the component re-renders. A test that only sets initial state and asserts initial render would pass even with the original broken pattern.
- The subscription test mutates the store via direct import: `import { togglePraying } from "@/lib/prayer-wall/reactionsStore"` then calls `togglePraying(prayerId)` inside an `act(() => {...})` after `render(...)`. Tests that mock the store entirely defeat the BB-45 protection — never mock the store module in subscription tests.
- After this ships, you can demo Prayer Wall to anyone and the reactions will feel correct. That is the whole point.

---

## Phase 1 — Backend Foundation

> **Phase purpose:** Audit the existing backend skeleton, rename the group ID, add Liquibase + Spring Security + JWT + OpenAPI + Testcontainers, ship the first real auth endpoints, and swap the frontend AuthContext to use real JWT auth. After this phase, Eric can register, log in, and the backend knows who he is. No features yet beyond auth.

**What this phase accomplishes:** At the end of Phase 1, Eric can start the backend locally with `./mvnw spring-boot:run`, the frontend can register a user via `POST /api/v1/auth/register`, log in via `POST /api/v1/auth/login`, store the JWT in React state, and make authenticated GET requests to `/api/v1/users/me` that round-trip correctly with full type safety from OpenAPI. Nothing user-facing has changed beyond auth, but the entire backend stack is ready for Phase 2 to start adding feature data.

**Sequencing notes:** Specs in this phase are mostly sequential. Spec 1.1 audits and renames; everything else depends on it. Spec 1.2 through 1.10 build up layer by layer. Spec 1.10 is the cutover.

**Phase-level definition of done:**

- Backend group ID renamed from `com.example.worshiproom` to `com.worshiproom` across all ~60+ files of the inherited proxy layer (main + tests)
- All ~280 backend tests from the Key Protection Wave still pass post-rename
- Three proxy endpoints (`/api/v1/proxy/ai/*`, `/api/v1/proxy/maps/*`, `/api/v1/proxy/bible/*`) still round-trip correctly and report `configured: true` at `/api/v1/health`
- The two `application-dev.properties` log suppressions (`...mvc.method.annotation=INFO` and `...ExchangeFunctions=INFO`) still work; `grep -iE 'aiza|key=|signature='` on dev-profile stdout returns 0 matches
- `RequestIdFilter` + `RateLimitFilter` still ordered at `HIGHEST_PRECEDENCE` / `HIGHEST_PRECEDENCE + 10`; `JwtAuthenticationFilter` (Spec 1.4) slots in cleanly after them without breaking proxy rate-limit enforcement
- `docker compose up -d` starts a local PostgreSQL container alongside the existing backend/frontend services
- `./mvnw spring-boot:run` starts the backend on `localhost:8080`
- The frontend at `localhost:5173` can register a real user via the AuthModal
- The frontend can log in with that user via the AuthModal
- The frontend makes an authenticated `GET /api/v1/users/me` request and the response confirms both the backend is alive and the JWT validated correctly
- A Testcontainers integration test runs the full register → login → /me flow in CI
- OpenAPI spec is committed at `backend/src/main/resources/openapi.yaml` (extended; do NOT recreate — the file already contains shared schemas and 10+ proxy endpoints), types are generated to `frontend/src/types/api/generated.ts`, and the frontend imports the generated types for the auth endpoints
- Liquibase has changesets for: users table creation, username column addition (placeholder for Phase 8)
- The `wr_auth_simulated` flag is gone; the AuthContext uses real JWT auth
- The 121 consumers of `useAuth()` are unchanged; the ~5-10 callers of `login(name)` are updated to `login(email, password)`
- A deployment-target decision spec (Spec 1.10b) is delivered but not yet acted on

### Spec 1.1 — Audit and Rename Backend Skeleton

- **ID:** `round3-phase01-spec01-backend-skeleton-audit`
- **Size:** **L** (v2.7: increased from S — the Key Protection Wave expanded the backend from ~3 files to ~60+ files across four proxy subpackages; the rename now touches all of them plus their test files)
- **Risk:** **Medium** (v2.7: increased from Low — filter ordering, WebClient config, and three shipped proxy services must survive the refactor without regression)
- **Prerequisites:** Phase 0 read; Key Protection Wave merged (Specs 1–4 of `ai-proxy-*`); `./mvnw test` green on `main` before starting
- **Goal:** Rename the group ID from `com.example.worshiproom` to `com.worshiproom`, preserving the entire shipped proxy layer (`proxy.common`, `proxy.ai`, `proxy.maps`, `proxy.bible`) and all its tests, filters, exception handlers, and configuration. Reconcile the existing `/api/v1/*` endpoints with the plan's original intent. Document the current state in `backend/README.md`.

**Approach (v2.7 rewrite):** Open the project in IntelliJ. Use **Refactor → Rename Package** on the root `com.example.worshiproom` → `com.worshiproom`. IntelliJ will recursively rename every subpackage (`proxy.common`, `proxy.ai`, `proxy.maps`, `proxy.bible`, `proxy.common.*`, `config`, `controller`) and update every `import` statement in both `src/main/java/` and `src/test/java/`. **Never sed-replace package names** — with 60+ files the refactor tool is the only safe path.

After the rename, update:
- `backend/pom.xml` — `groupId` from `com.example` to `com.worshiproom` (or keep `com.worshiproom` top-level; both are acceptable)
- `backend/.mvn/` and any `@PackageMapping` / `@ComponentScan(basePackages=...)` annotations — scan for string literals that reference the old package path
- `application.properties`, `application-dev.properties`, `application-prod.properties` — grep for `com.example.worshiproom` in any property keys (Liquibase contexts, Spring scanning, logging package paths, etc.). **Critical:** the two `logging.level.org.springframework.web.*.annotation=INFO` / `ExchangeFunctions=INFO` suppressions in `application-dev.properties` do NOT need changes (they're framework classes, not our packages) — but verify they still resolve correctly after the refactor.
- `backend/src/main/resources/openapi.yaml` — grep for `com.example.worshiproom` in any schema definitions or server URLs (unlikely but possible)
- `backend/Dockerfile` — grep for the old package path (unlikely but possible)
- `docker-compose.yml` — healthcheck URL: verify the existing `/api/v1/health` endpoint is used (it should be — that endpoint already exists via the Key Protection Wave and reports `providers.*.configured` booleans). **Important:** do NOT change `ApiController.java`'s `@RequestMapping` — the v2.6 spec instructed to move `/api/health` → `/api/v1/health`, but `/api/v1/health` ALREADY EXISTS and carries provider status. The pre-existing `/api/health` and `/api/hello` endpoints can either (a) be kept as legacy aliases, or (b) be retired via a dedicated follow-up spec. Preserve them for now to avoid breaking any external health probes.
- `backend/README.md` — replace the v2.6 project-tour template with a tour of the actual current structure: `proxy.common` filters / handlers / types, `proxy.ai` Gemini, `proxy.maps` Google Maps, `proxy.bible` FCBH, the three Caffeine cache layers, the `WebClient` bean, the `/api/v1/health` provider-configured reporting.

Run `./mvnw clean test` to confirm EVERYTHING still compiles and all ~280 existing tests still pass. Run `./mvnw spring-boot:run -Dspring-boot.run.profiles=dev` and smoke-test the three proxy endpoints (`curl /api/v1/proxy/ai/explain`, `curl /api/v1/proxy/maps/geocode?query=Nashville+TN`, `curl /api/v1/proxy/bible/filesets/EN1WEBN2DA/JHN/3`) — all three must return `ProxyResponse`-shaped bodies with valid `data` fields. Grep `/tmp/backend.log` for `com.example.worshiproom` — expect zero matches (anywhere other than in bytecode artifacts, which should have been regenerated).

**Files to modify (v2.7 — non-exhaustive; the IntelliJ refactor will discover more):**

- `backend/pom.xml` (groupId)
- Every file under `backend/src/main/java/com/example/worshiproom/` → moved to `com/worshiproom/` (expect 30+ files across: root `WorshipRoomApplication.java`, `config/`, `controller/`, `proxy/common/`, `proxy/ai/`, `proxy/maps/`, `proxy/bible/`)
- Every file under `backend/src/test/java/com/example/worshiproom/` → moved to `com/worshiproom/` (expect 30+ files mirroring the main structure)
- `backend/src/main/resources/application.properties`, `application-dev.properties`, `application-prod.properties` (grep for package-path strings)
- `backend/src/main/resources/openapi.yaml` (grep for package-path strings)
- `backend/Dockerfile` (grep for package-path strings)
- `docker-compose.yml` (healthcheck URL verification, not modification)
- `backend/README.md` (project tour, substantially rewritten)

**Acceptance criteria (v2.7):**

- [ ] Group ID is `com.worshiproom` in `pom.xml`
- [ ] Package structure is `com.worshiproom.*` throughout main + test trees
- [ ] `./mvnw clean compile` succeeds with zero warnings about unresolved imports
- [ ] `./mvnw test` passes — ALL ~280 pre-existing tests green; no new failures introduced by the rename
- [ ] `./mvnw spring-boot:run -Dspring-boot.run.profiles=dev` starts the backend cleanly; all three providers report `configured: true` at `/api/v1/health` (assuming env vars are populated)
- [ ] Three proxy endpoints round-trip correctly post-rename (curl smoke tests above)
- [ ] `grep -rn 'com.example.worshiproom' backend/src/` returns zero hits
- [ ] `grep -iE 'aiza|key=|signature=' /tmp/backend.log` returns zero matches (verifying the two log suppressions in `application-dev.properties` still work post-rename)
- [ ] `docker compose up --build backend` builds and runs successfully
- [ ] Healthcheck in docker-compose passes (existing `/api/v1/health` URL)
- [ ] README documents the current (post-Key-Protection-Wave) project structure including proxy subpackages

**Guardrails (v2.7 — DO NOT):**

- Do NOT change `ApiController.java`'s `@RequestMapping("/api")` annotation to `"/api/v1"` (the v2.6 instruction) — `/api/v1/health` and `/api/v1/hello` already exist as separate endpoints, and the legacy `/api/health` may be referenced by external probes. Preserve both; retire the legacy ones in a follow-up spec if desired.
- Do NOT modify any `application-*.properties` log-suppression lines (the two narrow `logging.level` entries for `org.springframework.web.*.annotation=INFO` and `ExchangeFunctions=INFO`) — they target framework classes and survive the rename unchanged.
- Do NOT alter filter ordering (`RequestIdFilter` at `HIGHEST_PRECEDENCE`, `RateLimitFilter` at `HIGHEST_PRECEDENCE + 10`, `RateLimitFilter.shouldNotFilter` scoping to `/api/v1/proxy/**`).
- Do NOT modify `ProxyExceptionHandler`'s `basePackages` attribute — update it to the new path (`com.worshiproom.proxy`) as part of the rename, but DO NOT broaden it to catch non-proxy exceptions.
- Do NOT delete `backend/.env.local` or any of its `GEMINI_API_KEY`/`GOOGLE_MAPS_API_KEY`/`FCBH_API_KEY` entries.

**Out-of-band notes for Eric:** Use IntelliJ's refactor tool. Sed-replacing 60+ files is how you break things silently. After the refactor, spot-check: `grep -rn '@RestControllerAdvice' backend/src/main/java/com/worshiproom/proxy/common/` should show `basePackages = "com.worshiproom.proxy"` (updated) — if IntelliJ missed it and it still reads `com.example.worshiproom.proxy`, advice scoping will silently stop working and filter-raised exceptions will fall through to default Spring error handlers.

### Spec 1.2 — PostgreSQL via Docker Compose

- **ID:** `round3-phase01-spec02-postgres-docker`
- **Size:** S
- **Risk:** Low
- **Prerequisites:** 1.1
- **Goal:** Add a PostgreSQL 16 service to the root `docker-compose.yml`. Add the JDBC driver to `pom.xml`. Add datasource configuration to `application-dev.properties`. Confirm the backend can connect to the database on startup (no schema yet — that comes in Spec 1.3).

**Approach:** Add a `postgres` service to `docker-compose.yml` with image `postgres:16-alpine`, port `5432:5432`, environment variables for database name (`worshiproom_dev`), user (`worshiproom`), password (local-only, documented in README), a named volume for persistence, and a healthcheck. Make the `backend` service depend on `postgres` being healthy. Add `org.postgresql:postgresql` to `pom.xml`. Create `application-dev.properties` with datasource URL `jdbc:postgresql://localhost:5432/worshiproom_dev` and matching credentials. Update `backend/README.md` with the commands to start/stop the database and reset the volume.

**Files to create:**

- `backend/src/main/resources/application-dev.properties`

**Files to modify:**

- `docker-compose.yml` (add postgres service, depends_on)
- `backend/pom.xml` (add postgresql dependency)
- `backend/README.md` (add database section)

**Acceptance criteria:**

- [ ] `docker compose up -d postgres` starts the database
- [ ] `psql -h localhost -U worshiproom -d worshiproom_dev` connects (prompted for password)
- [ ] `./mvnw spring-boot:run` starts without database connection errors
- [ ] `docker compose down` stops the database without data loss
- [ ] `docker compose down -v` stops and wipes the volume (documented in README)
- [ ] Backend service in docker-compose waits for postgres healthcheck before starting

### Spec 1.3 — Liquibase Integration and First Changeset

- **ID:** `round3-phase01-spec03-liquibase-setup`
- **Size:** M
- **Risk:** Low
- **Prerequisites:** 1.2
- **Goal:** Wire Liquibase into the backend so schema changes are managed via versioned changesets. Land the first changeset creating the `users` table per the canonical schema from Decision 3.

**Approach:** Add `org.liquibase:liquibase-core` to `pom.xml`. Configure `spring.liquibase.change-log=classpath:db/changelog/master.xml` in `application.properties`. Create the master changelog file that imports sub-changelogs chronologically. Create the first changeset: `2026-04-14-001-create-users-table.xml`. Column definitions match the Architectural Foundation Decision 3 exactly. Include constraints (primary key, not-null, unique email). Include a rollback block since this is a simple table creation. Add a smoke test that confirms the table exists after migration.

**Files to create:**

- `backend/src/main/resources/db/changelog/master.xml`
- `backend/src/main/resources/db/changelog/2026-04-14-001-create-users-table.xml`
- `backend/src/test/java/com/worshiproom/db/LiquibaseSmokeTest.java`

**Files to modify:**

- `backend/pom.xml` (add liquibase-core dependency)
- `backend/src/main/resources/application.properties` (liquibase config)

**Database changes:**

- Creates `users` table per Decision 3 (Architectural Foundation)

**Acceptance criteria:**

- [ ] `./mvnw spring-boot:run` applies the changeset automatically on startup
- [ ] `psql` confirms the `users` table exists with all expected columns and types
- [ ] `DATABASECHANGELOG` table records the applied changeset
- [ ] Restarting the server does not re-apply the changeset (Liquibase idempotency)
- [ ] Changeset has a valid rollback block
- [ ] Smoke test passes and confirms table exists
- [ ] `username` column is NOT in this changeset — that comes in a later changeset to demonstrate the additive migration pattern

**Out-of-band notes for Eric:** This is where your Liquibase work experience pays off. The structure should feel familiar. The only Forums-Wave-specific thing is the `contexts/` directory pattern, which we introduce in Spec 1.8 for seed data.

### Spec 1.3b — Users Table Timezone Column

> **Execution note added 2026-04-23 (post-Spec-1.3 completion):** The master plan text below conflates two concerns — the schema column addition (belongs here in Phase 1) and the full-stack wiring that consumes it (User entity, DTOs, AuthService, UserService, AuthModal, Settings page, Playwright). The wiring touches code that doesn't yet exist on the branch when 1.3b executes — those files are created by Specs 1.4 / 1.5 / 1.6 / a dedicated Settings spec. As executed, Spec 1.3b is SCHEMA-ONLY (the column + Liquibase changeset + LiquibaseSmokeTest updates). The consumption wiring is re-homed: Spec 1.4 or 1.5 adds `timezone` to the User JPA entity at creation time; Spec 1.5 adds the optional `timezone` field to RegisterRequest and the browser-detection logic to AuthModal; Spec 1.6 adds `timezone` to UserResponse and the `PATCH /api/v1/users/me` validation-strict update endpoint; a dedicated Settings spec (likely Phase 1.10+ or Phase 8) adds the autocomplete UI + Playwright E2E. **Each of those downstream specs must include a "timezone" bullet in its Files-to-modify list.** The anti-pressure streak-preservation rule ("timezone change alone never breaks a streak") must be honored by the Phase 2 streak service spec when it lands. This note exists so future plan writers don't re-accidentally the scope conflation.

- **ID:** `round3-phase01-spec03b-users-timezone-column`
- **Size:** S
- **Risk:** Low
- **Prerequisites:** 1.3
- **Goal:** Add a `timezone VARCHAR(50)` column to the `users` table via a second Liquibase changeset. Every feature that triggers on local time (grace day reset, streak midnight boundary, Night Mode, 3am Watch, Sunday Service Sync, liturgical day-of-year rotations, scheduled notifications) depends on knowing each user's timezone. Capturing it at registration is cheap; retrofitting it later across five features is not. This spec also demonstrates the additive-migration pattern that Spec 1.3 foreshadowed (username column deliberately deferred to a later changeset) — a working reference for every future schema change in the wave.

**Approach:** New Liquibase changeset `2026-04-14-003-add-users-timezone-column.xml` that adds `timezone VARCHAR(50) NOT NULL DEFAULT 'UTC'` to the `users` table. The default matters — existing rows from the dev-seed would fail the NOT NULL constraint without it, and Spring Boot would refuse to start the next time. The column accepts any IANA timezone string (`America/Chicago`, `Europe/London`, `Asia/Tokyo`, etc.); validation uses Java's `ZoneId.of()` at the service layer (throws `DateTimeException` on invalid strings, which the controller translates to `400 INVALID_INPUT`).

**Registration flow update:** `POST /api/v1/auth/register` accepts an optional `timezone` field in the request body. If provided and valid, it's stored. If omitted or invalid, the backend falls back to `UTC` (no error — invalid strings become UTC silently on register to avoid blocking registration over a client-side detection glitch). The frontend AuthModal auto-detects the browser's timezone via `Intl.DateTimeFormat().resolvedOptions().timeZone` and sends it on registration. `GET /api/v1/users/me` returns the timezone in the UserResponse.

**Settings update:** A "Timezone" control appears in `/settings` under account preferences. Implementation uses a searchable autocomplete (the IANA tz database is ~600 zones, a flat `<select>` is unusable). Changing timezone does NOT retroactively recompute streaks or past activity (those are recorded with server-UTC timestamps); it only affects future day-boundary computations — including the next Monday's grace-day reset.

**Anti-pressure consideration:** Timezone changes mid-streak could create an apparent gap (e.g., moving from UTC-8 to UTC+9 pushes "today" forward almost a full day). The streak service treats any same-calendar-date activity in the user's CURRENT timezone as continuing the streak, even if the stored `last_active_date` was recorded in a different timezone. No streak is ever broken by a timezone change alone.

**Files to create:**

- `backend/src/main/resources/db/changelog/2026-04-14-003-add-users-timezone-column.xml`

**Files to modify:**

- `backend/src/main/java/com/worshiproom/user/User.java` (add `timezone` field)
- `backend/src/main/java/com/worshiproom/auth/dto/RegisterRequest.java` (optional `timezone` field)
- `backend/src/main/java/com/worshiproom/user/dto/UserResponse.java` (expose `timezone`)
- `backend/src/main/java/com/worshiproom/auth/AuthService.java` (capture timezone on register with UTC fallback)
- `backend/src/main/java/com/worshiproom/user/UserService.java` (timezone update endpoint logic)
- `frontend/src/components/prayer-wall/AuthModal.tsx` (detect browser timezone, send on register)
- `frontend/src/pages/Settings.tsx` or equivalent (timezone autocomplete)
- `backend/src/main/resources/db/changelog/master.xml` (include the new changeset)

**Database changes:**

- Liquibase changeset: `db/changelog/2026-04-14-003-add-users-timezone-column.xml`
- Tables modified: `users`
- Columns added: `timezone VARCHAR(50) NOT NULL DEFAULT 'UTC'`
- Rollback block: `DROP COLUMN timezone` (safe because default means no data loss for new users; existing UTC values in a rolled-back world just disappear)

**API changes:**

- `POST /api/v1/auth/register` — adds optional `timezone` field to request body
- `PATCH /api/v1/users/me` — new endpoint (or extended existing) that accepts `{ timezone: string }` and validates via `ZoneId.of()`
- `GET /api/v1/users/me` — response now includes `timezone`

**Copy Deck:**

- Settings label: "Timezone"
- Settings helper text: "We use this to know when your day starts and ends."
- Invalid timezone error: "That timezone isn't one we recognize. Try picking from the list."
- Registration: no user-facing copy (silent auto-detection)

**Anti-Pressure Copy Checklist:** (a) no comparison framing ✓ (b) no urgency ✓ (c) no exclamation points near vulnerability ✓ (d) no therapy-app jargon ✓ (e) no streak-as-shame ✓ (f) no false scarcity ✓

**Acceptance criteria:**

- [ ] `timezone` column exists on users table with `NOT NULL DEFAULT 'UTC'`
- [ ] Existing users (from dev-seed) default to `'UTC'` after migration
- [ ] New registration via browser captures the browser's IANA timezone string automatically
- [ ] Registration with an omitted timezone succeeds and defaults to UTC (not an error)
- [ ] Registration with an invalid IANA string succeeds and defaults to UTC (silently; logged as a warning)
- [ ] `GET /api/v1/users/me` response includes `timezone` field
- [ ] `PATCH /api/v1/users/me` with invalid IANA string returns `400 INVALID_INPUT` (stricter than register — settings-driven changes should fail loudly)
- [ ] Settings UI renders a searchable timezone autocomplete
- [ ] Changing timezone in settings persists and is reflected on next `/me` fetch
- [ ] Streak is NOT broken by a timezone change alone (verified by an integration test that sets last_active_date in UTC, changes timezone to UTC-12, and asserts streak continues)
- [ ] At least 10 backend tests covering: changeset applies, registration with/without/invalid timezone, settings update valid/invalid, streak preservation across timezone change
- [ ] At least 1 Playwright test: register in a browser with a non-UTC timezone, verify `GET /me` returns that timezone

**Testing notes:**

- Unit tests: `ZoneId.of()` validation wrapper, timezone-aware streak continuation logic
- Integration tests (Testcontainers): registration flow, settings update, streak preservation
- Playwright: browser-detected timezone round-trips end-to-end

**Notes for plan phase recon:**

1. Confirm no existing code assumes UTC everywhere; flag any `LocalDate.now()` (without zone) that should become `LocalDate.now(userZone)` in future specs.
2. Verify the autocomplete library choice — `react-select` with `Intl.supportedValuesOf('timeZone')` (native in modern browsers) avoids pulling in `moment-timezone`'s 800 KB.
3. Confirm the dev-seed users should default to UTC or be given realistic timezones (recommend UTC — makes tests deterministic).

**Out of scope:**

- Retroactive streak recomputation when timezone changes (deferred; streak preservation rule above is the MVP)
- Timezone-aware grace-day reset (foundational column lands here; the actual grace-day timezone logic ships in a Phase 2 follow-up spec)
- DST transition handling (relies on Java's `ZoneId` which handles this correctly by default)

**Out-of-band notes for Eric:** This is the spec that unblocks five downstream features (Night Mode, 3am Watch, Sunday Service Sync, liturgical theming, timezone-aware grace reset). Worth landing early in Phase 1 even though the features that need it don't land until Phase 6+. The additive-migration pattern — a changeset just to add one column — is also the reference implementation for every column addition the wave will need later.

---

### Spec 1.4 — Spring Security and JWT Setup

- **ID:** `round3-phase01-spec04-spring-security-jwt`
- **Size:** L
- **Risk:** **Medium-High** (v2.7: increased from Medium — must coexist with the shipped proxy filter chain without breaking rate-limit enforcement or request-ID threading)
- **Prerequisites:** 1.3
- **Goal:** Add Spring Security and JJWT to the backend. Configure a `JwtAuthenticationFilter` that validates the bearer token and extracts the user ID. Configure `SecurityConfig` to require auth on all `/api/v1/**` routes except `/api/v1/health`, `/api/v1/auth/register`, `/api/v1/auth/login`, **and the `/api/v1/proxy/**` routes** (which continue to be publicly accessible with per-IP rate limiting until a dedicated follow-up spec decides whether proxy endpoints should require auth; that decision is out of scope for 1.4 and deferred to a post-Phase-1 operational spec). Add a BCrypt password encoder bean.

**Filter coexistence (v2.7 addition — critical):** The backend already has two filters ordered at `HIGHEST_PRECEDENCE` (`RequestIdFilter`) and `HIGHEST_PRECEDENCE + 10` (`RateLimitFilter`). `JwtAuthenticationFilter` must be ordered AFTER both — suggested `HIGHEST_PRECEDENCE + 100` — so that (1) every authenticated request still gets a request ID threaded through MDC, and (2) rate limiting on `/api/v1/proxy/**` still runs before auth (anonymous proxy traffic must still be rate-limited). `SecurityConfig` must use `addFilterAfter(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)` or equivalent explicit ordering. Do NOT register the filter inside the default filter chain without explicit ordering — Spring Security's default insertion may invert the order.

**Proxy endpoints and JWT (v2.7 addition):** `/api/v1/proxy/**` endpoints remain anonymous-accessible in Spec 1.4. The AI proxy specs (Specs 2–4 of Key Protection Wave) shipped with per-IP rate limiting and explicitly documented: "Per-IP until JWT auth lands. Once auth is wired, per-user takes precedence for authenticated endpoints." Spec 1.4 does NOT implement the per-user precedence — that's a post-Phase-1 enhancement (likely Phase 6 or a dedicated operational spec). Spec 1.4 only needs to ensure proxy endpoints continue working when an authenticated user hits them (the JWT should be ignored for proxy routes, not rejected).

**Approach:** Add `spring-boot-starter-security` and `io.jsonwebtoken:jjwt-api` (with runtime impl and jackson) to `pom.xml`. Create `JwtService` for signing and parsing tokens. Create `JwtAuthenticationFilter` that extends `OncePerRequestFilter`, reads the `Authorization: Bearer <token>` header, validates via `JwtService`, sets the Spring Security `Authentication` principal to the user ID. Create `SecurityConfig` with the filter chain configuration. Add BCrypt password encoder bean. Read JWT secret from `JWT_SECRET` env var with a development default (clearly marked as dev-only in code comments).

**Files to create:**

- `backend/src/main/java/com/worshiproom/auth/JwtService.java`
- `backend/src/main/java/com/worshiproom/auth/JwtAuthenticationFilter.java`
- `backend/src/main/java/com/worshiproom/auth/SecurityConfig.java`
- `backend/src/main/java/com/worshiproom/auth/AuthenticatedUser.java` (helper for controllers)
- `backend/src/test/java/com/worshiproom/auth/JwtServiceTest.java`

**Files to modify:**

- `backend/pom.xml` (add spring-boot-starter-security and jjwt)
- `backend/src/main/resources/application.properties` (jwt config keys)
- `backend/src/main/resources/application-dev.properties` (dev jwt secret)
- `backend/.gitignore` (verify .env is ignored)

**Acceptance criteria:**

- [ ] Unauthenticated request to `/api/v1/health` returns 200 (public route)
- [ ] Unauthenticated request to `/api/v1/users/me` returns 401 (will be implemented in 1.6)
- [ ] Request with malformed token returns 401
- [ ] Request with expired token returns 401 with `code: TOKEN_EXPIRED`
- [ ] JWT signing and parsing unit tests pass
- [ ] BCrypt password encoder bean is available for injection
- [ ] CORS still allows `Authorization` header from `localhost:5173`
- [ ] No secrets committed

### Spec 1.5 — Auth Endpoints (Register, Login, Logout)

- **ID:** `round3-phase01-spec05-auth-endpoints`
- **Size:** L
- **Risk:** High (security-critical, must follow `.claude/rules/02-security.md` exactly)
- **Prerequisites:** 1.4
- **Goal:** Implement `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `POST /api/v1/auth/logout`. Anti-enumeration on registration. Rate-limited login. BCrypt password storage.

**Approach:** Create `AuthController`, `AuthService`, `UserRepository` (Spring Data JPA), `User` entity (matching the Liquibase schema from 1.3). DTOs: `RegisterRequest`, `LoginRequest`, `AuthResponse` (containing the token and user fields). Anti-enumeration on register: existing email returns the same 200 response shape as a new email, and password verification is performed against a dummy hash for unknown emails on login to equalize timing. Rate limit login: 5 attempts per 15 minutes per email, 20 per 15 minutes per IP (use Bucket4j or simple in-memory cache for dev). Logout is a no-op on the backend (in-memory JWT) but the endpoint exists for future cookie migration. Validate password length (≥12 chars) and email format with `@Valid` and Bean Validation annotations.

**Files to create:**

- `backend/src/main/java/com/worshiproom/auth/AuthController.java`
- `backend/src/main/java/com/worshiproom/auth/AuthService.java`
- `backend/src/main/java/com/worshiproom/user/User.java` (JPA entity)
- `backend/src/main/java/com/worshiproom/user/UserRepository.java` (Spring Data JPA repository)
- `backend/src/main/java/com/worshiproom/user/DisplayNameResolver.java`
- `backend/src/main/java/com/worshiproom/auth/dto/RegisterRequest.java`
- `backend/src/main/java/com/worshiproom/auth/dto/LoginRequest.java`
- `backend/src/main/java/com/worshiproom/auth/dto/AuthResponse.java`
- `backend/src/main/java/com/worshiproom/auth/RateLimitFilter.java`
- `backend/src/test/java/com/worshiproom/auth/AuthControllerIntegrationTest.java`
- `backend/src/test/java/com/worshiproom/user/DisplayNameResolverTest.java`

**Acceptance criteria:**

- [ ] `POST /api/v1/auth/register` with valid body creates a user and returns 200 with `{ data: { token, user } }`
- [ ] Register with existing email returns the same 200 response (anti-enumeration)
- [ ] Register with password < 12 chars returns 400 with field-level error
- [ ] Register with invalid email format returns 400
- [ ] `POST /api/v1/auth/login` with correct credentials returns 200 with token and user
- [ ] Login with wrong password returns 401 with generic "Invalid email or password" message
- [ ] Login with unknown email returns 401 with the same generic message and same response time (timing leak prevention via dummy hash compare)
- [ ] 6th login attempt within 15 minutes for the same email returns 429 with `Retry-After` header
- [ ] `POST /api/v1/auth/logout` returns 204
- [ ] Display name resolver computes all 4 preference variants correctly (unit test covers each)
- [ ] BCrypt hashes use Spring Security defaults (cost factor 10+)
- [ ] Integration test covers all happy paths and security edge cases via Testcontainers
- [ ] No secrets in test fixtures

### Spec 1.6 — User Me Endpoint

- **ID:** `round3-phase01-spec06-user-me-endpoint`
- **Size:** S
- **Risk:** Low
- **Prerequisites:** 1.5
- **Goal:** Implement `GET /api/v1/users/me` returning the authenticated user's full profile (with computed `displayName`).

**Approach:** New `UserController` with one GET method. Reads the authenticated user ID from `@AuthenticationPrincipal`, looks up the user in `UserRepository`, computes `displayName` via `DisplayNameResolver`, returns `UserResponse` DTO. Returns 401 if unauthenticated, 404 if the user ID from the token does not match a user in the database (should never happen but defensive).

**Files to create:**

- `backend/src/main/java/com/worshiproom/user/UserController.java`
- `backend/src/main/java/com/worshiproom/user/dto/UserResponse.java`
- `backend/src/test/java/com/worshiproom/user/UserControllerIntegrationTest.java`

**Acceptance criteria:**

- [ ] Authenticated GET returns the user's full profile including computed `displayName`
- [ ] Unauthenticated GET returns 401
- [ ] Response shape matches OpenAPI spec
- [ ] Integration test covers the happy path and unauthenticated case via Testcontainers

### Spec 1.7 — Testcontainers Integration Test Infrastructure

> **Execution note added 2026-04-23 (post-Spec-1.7 completion):** Shipped with two deviations from the brief. (1) Two base classes instead of one — `AbstractIntegrationTest` (`@SpringBootTest`) + `AbstractDataJpaTest` (`@DataJpaTest`) sharing a singleton container via `TestContainers.POSTGRES` — because slice tests and full-context tests have mutually exclusive annotations. (2) Runtime target ≤40s was wrong; real baseline is ~97s dominated by Spring context boot across ~19 distinct contexts, not container startup. Future runtime targets anchor off ~97s. `.claude/rules/06-testing.md` was updated during execution and is authoritative. See "Phase 1 Execution Reality Addendum" #1 for full details.

- **ID:** `round3-phase01-spec07-testcontainers-setup`
- **Size:** M
- **Risk:** Low
- **Prerequisites:** 1.6
- **Goal:** Establish the Testcontainers pattern used by all subsequent backend integration tests: real PostgreSQL container per test run, Liquibase migrations applied, test seed data loaded, teardown handled automatically.

**Approach:** Add `org.testcontainers:postgresql` to `pom.xml`. Create an abstract `AbstractIntegrationTest` base class that uses Testcontainers' `@Container` annotation to spin up PostgreSQL 16 (matching dev). Spring Boot's `@DynamicPropertySource` injects the container's connection info into the test application context. `application-test.properties` sets Liquibase context to `test`. Test seed data is defined in `db/changelog/contexts/test-seed.xml` (initially empty — populated as needed). Refactor the integration tests from 1.5 and 1.6 to use `AbstractIntegrationTest`. Document the pattern in `backend/README.md`.

**Files to create:**

- `backend/src/test/java/com/worshiproom/AbstractIntegrationTest.java`
- `backend/src/main/resources/application-test.properties`
- `backend/src/main/resources/db/changelog/contexts/test-seed.xml`

**Files to modify:**

- `backend/pom.xml` (add testcontainers and testcontainers-postgresql)
- `backend/src/main/resources/db/changelog/master.xml` (include test context conditionally)
- `backend/src/test/java/com/worshiproom/auth/AuthControllerIntegrationTest.java` (extend AbstractIntegrationTest)
- `backend/src/test/java/com/worshiproom/user/UserControllerIntegrationTest.java` (extend AbstractIntegrationTest)
- `backend/README.md` (document the test pattern)

**Acceptance criteria:**

- [ ] `./mvnw test` runs all integration tests via Testcontainers
- [ ] Each test method runs against a clean database state (per-test transaction rollback or per-class container)
- [ ] Test run time is acceptable (< 60 seconds for the current test suite)
- [ ] Test seed data only loads in the test context
- [ ] Dev and production startup do not load test seed data
- [ ] README documents how to write a new integration test using the base class

### Spec 1.8 — Dev Seed Data

> **Execution note added 2026-04-23 (post-Spec-1.8 completion):** Shipped with three gotchas worth knowing. (1) `application-test.properties` does NOT exist — tests inherit the dev profile, so the test-context override was re-homed into `AbstractIntegrationTest`/`AbstractDataJpaTest` via `@DynamicPropertySource` (see Addendum #2). (2) Liquibase `valueDate="...Z"` does not parse the `Z` suffix and emits raw SQL that Postgres rejects — use `valueComputed="TIMESTAMP WITH TIME ZONE '...+00'"` instead for reproducible UTC seed timestamps (see Addendum #3). (3) BCrypt hashes have random salts, so seed hashes were generated via a throwaway test method, wrapped in `<![CDATA[...]]>`, embedded in the changeset, and the generator deleted (see Addendum #4). All 417 tests green post-execution.

- **ID:** `round3-phase01-spec08-dev-seed-data`
- **Size:** S
- **Risk:** Low
- **Prerequisites:** 1.7
- **Goal:** Create a dev-context Liquibase changeset that seeds the local database with 2-3 realistic users so the developer can work against non-empty data.

**Approach:** New changeset `db/changelog/contexts/dev-seed.xml` with context `dev`. Inserts 2-3 user rows with hardcoded UUIDs, realistic names ("Sarah Johnson", "David Chen"), matching emails, BCrypt-hashed passwords (use a known dev password like `worshiproom-dev-12345`), display preferences. `application-dev.properties` sets Liquibase context to `dev`. Document in README how to log in as a seed user during development and how to reset the local database.

**Files to create:**

- `backend/src/main/resources/db/changelog/contexts/dev-seed.xml`

**Files to modify:**

- `backend/src/main/resources/application-dev.properties` (set liquibase context)
- `backend/src/main/resources/db/changelog/master.xml` (include dev context conditionally)
- `backend/README.md` (document dev seed credentials and reset commands)

**Acceptance criteria:**

- [ ] Starting the backend in dev mode with an empty database applies the seed changeset
- [ ] Starting in test mode does NOT apply dev seed data
- [ ] Starting in prod mode does NOT apply dev seed data
- [ ] The seed users can be logged in via `POST /api/v1/auth/login` with documented credentials
- [ ] `docker compose down -v && docker compose up -d postgres && ./mvnw spring-boot:run` gives a clean dev database with seed data re-applied

### Spec 1.9 — Frontend AuthContext JWT Migration

> **Execution note added 2026-04-23 (pre-execution planning):** This spec inherits responsibility for AuthModal timezone capture (re-homed from Spec 1.3b — see Addendum #5). The plan MUST include adding `Intl.DateTimeFormat().resolvedOptions().timeZone` to the register POST body. Spec 1.9b lands BEFORE this spec (see Addendum #6), so the error/loading/empty-state primitives 1.9b documents are available for 1.9 to consume — do not re-invent ad-hoc patterns here.

- **ID:** `round3-phase01-spec09-frontend-auth-jwt`
- **Size:** L
- **Risk:** High (touches the auth surface that 121 files consume)
- **Prerequisites:** 1.8
- **Goal:** Rewrite `AuthContext.tsx` internally to use real JWT auth via `POST /api/v1/auth/login`, while keeping the exported `useAuth()` interface unchanged. Update the ~5-10 callers of `login(name)` to `login(email, password)`.

**Approach:** Rewrite `AuthContext.tsx` to store the JWT in React state (in-memory only). The new implementation is gated behind a `VITE_USE_BACKEND_AUTH` env var per Decision 9's feature flag list. When the flag is `false` (default during this spec), the existing simulated-auth code path runs. When the flag is `true` (flipped at Phase 1.10 cutover), the real JWT path runs. This gives a one-line rollback if the cutover surfaces problems. The `login` function changes to async `login(email, password)`, calls `POST /api/v1/auth/login`, stores the returned token, populates `user`. The `logout` function clears React state and calls `POST /api/v1/auth/logout`. Add a small `apiClient` helper at `frontend/src/lib/api/client.ts` that automatically attaches the `Authorization: Bearer <token>` header when the user is authenticated. Update the AuthModal component to call the new `login` signature. Update the dev login button (if it still exists) to either be removed or to call the real backend with a seed user. Update any other callers identified in the recon. The 121 files that only read `user.name` and `user.id` do NOT change.

**Files to create:**

- `frontend/src/lib/api/client.ts`
- `frontend/src/lib/api/__tests__/client.test.ts`

**Files to modify:**

- `frontend/src/contexts/AuthContext.tsx` (rewrite implementation, preserve interface)
- `frontend/src/components/prayer-wall/AuthModal.tsx` (call new login signature)
- `frontend/src/components/dev/SimulateLoginButton.tsx` (or wherever the dev login lives — verify in recon)
- `frontend/src/contexts/__tests__/AuthContext.test.tsx` (update tests)
- `frontend/.env.example` (document `VITE_API_BASE_URL`)
- `.claude/rules/11-local-storage-keys.md` (mark `wr_auth_simulated`, `wr_user_name` as deprecated; preserve `wr_user_id` as still used)

**Acceptance criteria:**

- [ ] `useAuth()` return shape unchanged (`{ isAuthenticated, user: { name, id } | null, login, logout }`)
- [ ] Calling `login(email, password)` with a valid user logs them in via the backend
- [ ] Calling `login(email, password)` with wrong credentials shows the error in the AuthModal
- [ ] `logout()` clears the React state and calls the backend logout endpoint
- [ ] Page refresh logs the user out (in-memory token is lost — acceptable per `.claude/rules/02-security.md`)
- [ ] All 121 useAuth consumers continue to work without modification
- [ ] The ~5-10 callers of the old `login(name)` are updated to `login(email, password)` — exact list documented in the spec
- [ ] AuthModal is wired to the new flow
- [ ] Dev login button either removed or wired to real backend
- [ ] All existing auth tests pass (or are updated to match the new contract)
- [ ] No new auth-related lint warnings

**Out-of-band notes for Eric:** This is the highest-risk spec in Phase 1. The rule of thumb: if a file imports `useAuth` and only reads `user.name` or `user.id` or `isAuthenticated`, it does not need to change. If a file calls `login(...)` it needs to be updated. The recon should list all `login(` call sites before execution starts.

### Spec 1.9b — Error & Loading State Design System

> **Execution note added 2026-04-23 (pre-execution; brief authored for /spec-forums):** The master plan text below was drafted before frontend Round 2 shipped `components/ui/` primitives (`Toast`, `WhisperToast`, `FeatureEmptyState`, `ChartFallback`, `FormField`, `Button`, `CharacterCount`) and the 13 skeletons in `components/skeletons/`. The authored brief for this spec is AUDIT-FIRST, not greenfield: inventory existing components → fill only proven gaps → document in `.claude/rules/09-design-system.md`. Components go in `components/ui/` (NOT `components/common/` which doesn't exist). This spec lands BEFORE Spec 1.9 so 1.9's AuthModal work can consume documented patterns. AuthModal integration itself is Spec 1.9's scope, not this one's. See "Phase 1 Execution Reality Addendum" #6 at the top of this document for the full scope reconciliation.

- **ID:** `round3-phase01-spec09b-error-loading-design-system`
- **Size:** M
- **Risk:** Low (additive; no behavioral change to existing code)
- **Prerequisites:** 1.9
- **Goal:** Establish canonical `<LoadingSkeleton>`, `<ErrorBoundary>`, `<EmptyState>`, and `<RetryBanner>` components before Phase 2+ start turning every page into a network-consumer. Without shared primitives, every async page reinvents its own loading spinner and error toast, and the UI drifts into inconsistency within a week. This spec lands the primitives early, wires them into the auth flow as the first consumer, and gives every downstream spec a three-line integration instead of an ad-hoc invention.

**Approach:** Four new components in `frontend/src/components/common/`, each tiny and opinionated:

1. **`<LoadingSkeleton variant="card" | "list" | "inline" | "page">`** — Renders a shimmering FrostedCard-shaped placeholder (for `card`), a list of three shimmering rows (for `list`), a single shimmering inline pill (for `inline`), or a full-page hero-and-content skeleton (for `page`). Uses CSS `@keyframes` for the shimmer, gated behind `prefers-reduced-motion` (static opacity-60 block when motion is reduced). Imports its animation timing from `frontend/src/constants/animation.ts` per BB-33. Never shows a spinner — spinners communicate "something is happening" but shimmer communicates "something is loading specifically here," which matches Worship Room's quiet aesthetic.

2. **`<ErrorBoundary fallback={...}>`** — React error boundary wrapping any subtree. Catches render-time errors, logs them to console (dev) and to the future Sentry integration (flagged as TODO in a comment), and renders a `<RetryBanner>` with a "Try again" button that re-mounts the children. Top-level `<App>` wraps Prayer Wall routes in this. Individual features wrap their own risky subtrees (e.g., the Prayer Wall feed) with feature-specific fallbacks. This is NOT for catching API errors (those are caught at the service layer and surfaced via `<RetryBanner>` directly); it's for catching _render_ crashes that would otherwise white-screen the page.

3. **`<EmptyState icon={LucideIcon} eyebrow="..." headline="..." body="..." action={...}>`** — Canonical empty-state treatment for feeds with zero items, profiles with no posts, search results with no matches, etc. Two-line headings per the Round 2 Brand standard. Brand-voice copy is SPEC-REQUIRED (not inline in the component) — every consumer passes their own copy from their Copy Deck section. Optional `action` prop renders a single primary-button CTA. Follows the anti-pressure pattern from Decision "Anti-Pressure Design" in the Universal Spec Rules: no shame, no comparison, no "you haven't posted yet — everyone else has!" framing.

4. **`<RetryBanner message="..." onRetry={fn} severity="info" | "warning" | "error">`** — A small frosted banner that renders at the top of any async-consuming area when a fetch fails. Shows the message, a retry button, and auto-dismisses after a successful retry. Severity controls the accent color (quiet blue for info, amber for warning, muted red for error — never red-on-red-emergency colors, which are jarring on Prayer Wall vulnerability content). Messages come from the consumer; this spec does not define any inline strings.

**Integration with Spec 1.9 (AuthContext JWT Migration):** The AuthModal becomes the first consumer. The existing "Signing in..." inline text gets replaced with `<LoadingSkeleton variant="inline" />` during the `login()` promise. Auth errors ("Invalid email or password") become a `<RetryBanner severity="error" />` above the form, dismissed on next field edit. If the AuthContext re-renders with an error boundary trip (e.g., malformed JWT from a compromised localStorage), the wrapping `<ErrorBoundary>` catches it and shows a "Something went wrong. Try signing out and back in." fallback with a logout-then-retry action.

**Files to create:**

- `frontend/src/components/common/LoadingSkeleton.tsx`
- `frontend/src/components/common/ErrorBoundary.tsx`
- `frontend/src/components/common/EmptyState.tsx`
- `frontend/src/components/common/RetryBanner.tsx`
- `frontend/src/components/common/__tests__/LoadingSkeleton.test.tsx`
- `frontend/src/components/common/__tests__/ErrorBoundary.test.tsx`
- `frontend/src/components/common/__tests__/EmptyState.test.tsx`
- `frontend/src/components/common/__tests__/RetryBanner.test.tsx`

**Files to modify:**

- `frontend/src/components/prayer-wall/AuthModal.tsx` (consume LoadingSkeleton + RetryBanner)
- `frontend/src/App.tsx` (or equivalent root) — wrap Prayer Wall routes in `<ErrorBoundary>`
- `frontend/src/constants/animation.ts` — export a `SKELETON_SHIMMER` duration/easing token if not already present

**Copy Deck:**

These are component-level fallback copies that Copy-Deck-less consumers inherit. Every spec that uses these components SHOULD override with its own Copy Deck strings.

- ErrorBoundary default fallback headline: "Something went sideways"
- ErrorBoundary default fallback body: "This page hit an error. Try reloading — we'll keep your other work."
- ErrorBoundary default retry button: "Reload this page"
- RetryBanner default generic message: "We couldn't finish that. Try again?"
- RetryBanner default retry button: "Try again"
- EmptyState default headline (overridable): "Nothing here yet"
- EmptyState default body (overridable): "That's all right. Come back when you're ready."

**Anti-Pressure Copy Checklist:** (a) no comparison ✓ (b) no urgency ✓ (c) no exclamation points near vulnerability ✓ (d) no therapy-app jargon ✓ (e) no streak-as-shame ✓ (f) no false scarcity ✓

**Acceptance criteria:**

- [ ] All four components created in `frontend/src/components/common/`
- [ ] `<LoadingSkeleton>` supports four variants, shimmer gated behind `prefers-reduced-motion`
- [ ] `<ErrorBoundary>` catches render errors and renders fallback without white-screening
- [ ] `<EmptyState>` requires eyebrow, headline, body props (TypeScript enforces); optional icon and action
- [ ] `<RetryBanner>` supports three severities with distinct accent colors (no emergency-red)
- [ ] All components use FrostedCard backing where backgrounded
- [ ] All animation timing imported from `constants/animation.ts` (no hardcoded `ms` strings)
- [ ] AuthModal integration: signing-in state uses LoadingSkeleton inline variant
- [ ] AuthModal integration: login error shows RetryBanner error severity
- [ ] Root App wraps Prayer Wall routes in ErrorBoundary
- [ ] Intentionally throwing an error inside a wrapped component is caught and the fallback renders
- [ ] Tab key navigates into the RetryBanner retry button (focus management)
- [ ] Screen reader announces EmptyState headline and body as `role="status"` (non-intrusive)
- [ ] Color contrast on all severity variants meets WCAG AA (4.5:1 for body text)
- [ ] At least 4 tests per component (16 total) covering happy path, variant props, reduced-motion, accessibility
- [ ] Storybook stories exist for each component and each variant (if Storybook is in the repo; otherwise skip)
- [ ] Bundle size impact < 10 KB gzipped across all four components combined

**Testing notes:**

- Unit tests verify variant rendering and prop validation
- Accessibility tests verify ARIA roles and focus management (React Testing Library + axe-core)
- Visual regression test via Playwright on each component in isolation (optional; if Storybook is set up)
- Integration test: AuthModal submits invalid credentials, RetryBanner appears, retry clears the banner

**Notes for plan phase recon:**

1. Confirm whether Storybook is set up in the repo (if not, skip the stories acceptance criterion)
2. Verify `constants/animation.ts` exists and has the BB-33 token structure; create if missing (note: should already exist from earlier work)
3. Identify any existing ad-hoc loading spinners in Prayer Wall components that should be migrated to `<LoadingSkeleton>` in a follow-up cleanup spec (not this spec's scope)
4. Confirm the FrostedCard component is available for use as backing

**Out of scope:**

- Retrofitting existing Prayer Wall components to use these primitives (that's a follow-up cleanup spec, probably in Phase 5)
- Toast notifications (that's a separate system, lands in Phase 12 or earlier if needed)
- Form validation error display (that's the consuming form's responsibility; these components only handle async/render errors)

**Out-of-band notes for Eric:** The BIG reason to land this in Phase 1 (before Phase 2's dual-write introduces the first "network might fail" surface) is that without shared primitives, Phase 2-16 will each build one-off loading/error treatments that you'll later pay to unify. One spec now saves a dozen cleanup specs later. The AuthModal integration is also a canary: if it feels right for login, it'll feel right everywhere.

---

### Spec 1.10 — Phase 1 Cutover and End-to-End Test

- **ID:** `round3-phase01-spec10-phase1-cutover`
- **Size:** M
- **Risk:** Medium
- **Prerequisites:** 1.9
- **Goal:** End-to-end Playwright test that walks through register → login → /me → logout. Cutover checklist for Eric. Documentation update.

**Approach:** Playwright test that opens the AuthModal, registers a new user, asserts the modal closes and the user is logged in (avatar visible), reloads the page, asserts the user is logged out (in-memory token cleared), opens the AuthModal again, logs in with the same credentials, asserts the user is logged in. Manual cutover checklist for Eric: spot-check on mobile, verify CORS works, verify the backend logs the auth events correctly. Update CLAUDE.md and `08-deployment.md` with the new dev commands if anything has shifted.

**Files to create:**

- `frontend/e2e/phase01-auth-roundtrip.spec.ts`
- `_plans/forums-wave/phase01-cutover-checklist.md`

**Acceptance criteria:**

- [ ] Playwright test passes end-to-end
- [ ] Manual checklist items all green
- [ ] `VITE_USE_BACKEND_AUTH` flipped to `true` in `.env.example` and verified in dev
- [ ] Rollback procedure documented in cutover checklist (set flag to `false`, restart frontend)
- [ ] CLAUDE.md updated if any commands changed
- [ ] Phase 1 officially done — backend foundation is ready for feature work
- [ ] Universal Rule 17 per-phase accessibility smoke test passes: axe-core automated scan on routes and components introduced or modified in this phase returns zero CRITICAL violations; keyboard-only navigation walkthrough of this phase's primary user flows completes without dead-ends; VoiceOver spot-check on the 2-3 most complex interactions introduced in this phase completes without blocking issues; evidence committed to `_cutover-evidence/phase1-a11y-smoke.json` (axe-core report) plus a brief markdown note recording keyboard and VoiceOver outcomes

**Out-of-band notes for Eric:** When this spec passes, take a break. You just shipped your first backend. The rest of the Forums Wave builds on this foundation but does not require the same level of concept-learning you just did — Phase 2 will feel easier because you already know how the pieces fit.

### Spec 1.10b — Deployment Target Decision Document

- **ID:** `round3-phase01-spec10b-deployment-target-decision`
- **Size:** S
- **Risk:** Low
- **Prerequisites:** 1.10
- **Goal:** Deliver a decision document comparing Railway, Render, Fly.io, Supabase, and Neon for backend + database hosting. Includes pros/cons, rough monthly costs, env var requirements, and Eric's recommendation. NOT a CC execution spec — Eric reads, picks, and a future spec wires up the chosen target.

**Approach:** Document at `_plans/forums-wave/deployment-target-options.md`. For each candidate: hosting model, database support, free tier limits, paid tier costs, migration complexity, estimated time-to-deploy, vendor lock-in risk. Recommendation section with Claude's pick and why. Eric reviews, picks, and tells Claude the choice. The actual deployment wiring is a future spec scheduled after Phase 16.

**Acceptance criteria:**

- [ ] Document delivered with at least 5 candidates compared
- [ ] Each candidate has the same evaluation criteria applied
- [ ] Recommendation section with reasoning
- [ ] Eric reviews and picks (not part of the spec — this is a follow-up action)

---

### Spec 1.10d — Production Monitoring Foundation

- **ID:** `round3-phase01-spec10d-production-monitoring-foundation`
- **Size:** M
- **Risk:** Low (additive operational tooling)
- **Prerequisites:** 1.10b
- **Goal:** Wire Sentry for unhandled exception tracking, uptime monitoring for the `/api/v1/health` endpoint, JSON structured logging activation (configured, not merely defined), and basic alert rules. Without this, a backend failure at 2 AM is a surprise Eric discovers days later when a user emails. This spec establishes the minimum ears-and-eyes layer so production outages are detected within minutes, not weeks. Budget: a few hours of setup in exchange for years of not-flying-blind.

**Approach:** Four thin substacks layered onto the existing Spring Boot + Logback foundation. Each substack is independently testable; each has an explicit off-switch for dev profile so local iteration doesn't pollute the production alert stream.

**Substack 1 — Sentry error tracking.** Spring Boot Sentry starter dependency wired to `SENTRY_DSN` env var. Free tier (5K events/month) is enough for MVP. Production profile enables the integration; dev profile disables entirely so local stack traces don't hit the shared Sentry project. Unhandled exceptions auto-capture. Additionally, specific events explicitly push to Sentry: `QUICK_LIFT_TOO_SHORT` violations (WARN — interesting but not actionable), rate-limit threshold breaches (WARN), crisis detection triggers (WARN, aggregated to weekly digest rather than real-time alerts), 5xx responses (ERROR). Every event is routed through a PII scrubber before leaving the process.

**Substack 2 — PII scrubber.** Before Sentry emits an event, strip: any value matching the email regex (in breadcrumbs, tags, or context), the raw `Authorization: Bearer ...` header from HTTP request breadcrumbs, the `password` field from any captured form submission, the client IP (Sentry's default is to capture this — we override to null), any `wr_*` localStorage keys if they appear in frontend-source events (reserved for a future frontend Sentry integration, not in this spec's scope). The scrubber is strict by default; it's preferable to lose useful debugging context than to leak user PII into a third-party service.

**Substack 3 — JSON structured logging activation.** `logback-spring.xml` has a `prod` profile that uses `logstash-logback-encoder` for JSON output; `dev` profile retains the human-readable pattern. Every log line in prod includes: `timestamp`, `level`, `logger`, `message`, `requestId` (from MDC, populated by a request filter), `userId` (from MDC when authenticated), `thread`. The MDC filter runs early in the filter chain and populates `requestId` from the `X-Request-Id` response header (or generates one if the incoming request didn't supply it). This alone — correlated log lines per request — makes post-incident forensics 10x easier.

**Substack 4 — Uptime monitoring + basic alert rules.** Configure UptimeRobot (free tier, 5-minute intervals, 50 monitors) OR Better Stack (free starter, richer dashboards) against `https://{prod-domain}/api/v1/health`. Alert on 2 consecutive failures (filters transient network blips). Alert on response time > 5s for 3 consecutive intervals (performance degradation signal). Alert email delivery MUST be verified on day one via a deliberate synthetic failure — an alerting system that never alerts is worse than no alerting (false security). Sentry alert rules: error rate > 5 events/hour → email; any explicitly-tagged `CRITICAL` event → email immediately. `Retry-After` and rate-limit events are INFO-level, not alertable.

**Anti-noise discipline:**

- Sentry ignorelist configured for expected 4xx: 404s on `/api/v1/*` (client probing), 401s on expected-auth endpoints (user token expired), 403s on trust-level-gated actions (expected when trust levels enforce). These are user behavior, not errors.
- Crisis detection events fire to Sentry as WARN, NOT alert-triggering. A prayer community generates genuine crisis signals regularly; alerting on each would train Eric to ignore the alert channel. Aggregate to a weekly digest (future spec).
- Monitor only `/api/v1/health` publicly. Authenticated endpoints require a bot-user JWT, which is operational complexity not worth the coverage gain at MVP scale.
- Health endpoint intentionally lightweight: returns 200 with `{ status: "ok", db: "reachable" }` after a `SELECT 1` against PostgreSQL. Does NOT check downstream dependencies (S3, Redis) — those get their own lightweight health sub-endpoints in later phases if needed.

**Files to create:**

- `backend/src/main/java/com/worshiproom/observability/SentryConfig.java`
- `backend/src/main/java/com/worshiproom/observability/PiiScrubber.java`
- `backend/src/main/java/com/worshiproom/observability/RequestIdMdcFilter.java`
- `backend/src/main/resources/logback-spring.xml`
- `backend/src/test/java/com/worshiproom/observability/PiiScrubberTest.java`
- `backend/src/test/java/com/worshiproom/observability/RequestIdMdcFilterIntegrationTest.java`
- `backend/docs/runbook-monitoring-alerts.md`

**Files to modify:**

- `backend/pom.xml` — add `io.sentry:sentry-spring-boot-starter-jakarta` + `net.logstash.logback:logstash-logback-encoder`
- `backend/src/main/resources/application-prod.properties` — Sentry DSN binding, JSON logging on, Sentry `send-default-pii=false`
- `backend/src/main/resources/application-dev.properties` — Sentry disabled, human-readable logs
- `.env.example` — document `SENTRY_DSN`, `UPTIMEROBOT_API_KEY` (optional, for programmatic monitor config)

**Database changes:** None

**API changes:** None (monitoring is external; `/api/v1/health` already exists from Phase 1)

**Copy Deck:** None (no user-facing copy)

**Acceptance criteria:**

- [ ] Sentry Spring Boot starter present in `pom.xml`
- [ ] `SENTRY_DSN` env var wired to Sentry config; empty DSN → Sentry auto-disabled (dev default)
- [ ] Deliberate `throw new RuntimeException("test")` in a scratch endpoint produces a Sentry event (verified manually OR via mock SentryClient in test)
- [ ] PII scrubber strips email addresses from breadcrumb strings (unit tested with 5+ email patterns)
- [ ] PII scrubber strips `Authorization: Bearer` header from captured request breadcrumbs
- [ ] PII scrubber nulls client IP in event context
- [ ] `send-default-pii=false` confirmed in production properties
- [ ] JSON logging active in `prod` profile — verified by log line pattern match (starts with `{`)
- [ ] Human-readable logging retained in `dev` profile
- [ ] `requestId` appears in MDC for every request; present in every log line emitted during that request
- [ ] MDC populated from incoming `X-Request-Id` header when present; generated UUID otherwise
- [ ] UptimeRobot (or Better Stack) monitor configured on `/api/v1/health` with 5-minute interval
- [ ] Alert fires on 2 consecutive failures (tested by deliberately stopping backend for 10+ minutes)
- [ ] Alert fires on sustained response time > 5s (tested by adding a `Thread.sleep(6000)` to health endpoint in dev)
- [ ] Sentry ignore list drops 404/401/403 responses (verified by triggering each and confirming no Sentry event)
- [ ] Crisis-detection events reach Sentry with WARN severity and are NOT included in alert rules
- [ ] Runbook exists at `backend/docs/runbook-monitoring-alerts.md`
- [ ] Runbook documents: what each alert means, first-response triage steps, how to acknowledge and silence false alarms
- [ ] Day-1 synthetic alert test completed and the date/outcome recorded in the runbook
- [ ] At least 10 tests covering PII scrubber (email, JWT, IP cases), MDC filter (present/absent header), Sentry config (enabled/disabled by DSN)

**Testing notes:**

- PII scrubber: unit test with fixture Sentry event payloads containing various PII shapes
- MDC filter: integration test fires a real HTTP request, asserts the log line emitted during request handling contains the expected `requestId`
- Sentry dispatch: use Sentry's test mode (`dsn=https://fake@localhost/0`) to assert events would fire without network calls
- Alert test: deliberately stopping the backend during the day-1 drill is the real acceptance test for the alerting pipeline

**Notes for plan phase recon:**

1. Confirm Sentry (cloud, paid) vs GlitchTip (self-hosted Sentry-compatible, free). Default Sentry for MVP simplicity.
2. Confirm UptimeRobot vs Better Stack. UptimeRobot has a longer track record; Better Stack has nicer dashboards. Default UptimeRobot.
3. Set up a dedicated alerts email address (e.g., `ops@worshiproom.com` once domain is active, or a Gmail `+alerts` alias in the interim) so alerts don't drown in personal inbox.
4. Verify the deployment platform exposes `/api/v1/health` publicly without auth.

**Out of scope:**

- Log aggregation (Loki, Datadog, LogDNA) — deferred; platform stdout capture suffices at MVP
- Distributed tracing (OpenTelemetry, Jaeger) — not needed at current scale
- Application performance monitoring (APM) dashboards — Sentry performance monitoring requires Pro tier
- Custom business metrics dashboards — deferred
- SMS alert delivery — email only for MVP; revisit when revenue justifies the Twilio line item
- Frontend Sentry integration — a follow-up spec; this one handles backend only
- PagerDuty or incident response automation — overkill for a solo-dev MVP

**Out-of-band notes for Eric:** The single most important output of this spec is not the tooling — it is the day-1 synthetic alert test. An alerting pipeline that has never fired a real alert is Schrödinger's alerting pipeline; you have no idea whether it works until you need it, at which point it probably doesn't. Kill the backend container in production for 15 minutes on a planned day, verify the alert email arrives, document the timing in the runbook, THEN consider this spec done. The 5K events/month free tier is plenty — a well-behaved app uses well under 100/month in steady state. If you're burning through 5K, something is firing repeatedly and that's the real signal, not a budget problem.

---

### Spec 1.10e — Object Storage Adapter Foundation

- **ID:** `round3-phase01-spec10e-object-storage-adapter-foundation`
- **Size:** M
- **Risk:** Medium (foundational abstraction used by 1.10c backups, 4.6b images, 6.7 testimony cards, 10.11 deletion cleanup)
- **Prerequisites:** 1.10b
- **Goal:** Establish a single `ObjectStorageAdapter` interface with three implementations (production S3, test-time MinIO via Testcontainers, dev-time local filesystem). Every downstream consumer (backups, image uploads, shareable testimony cards, async deletion cleanup) depends on this adapter rather than talking to S3 SDK directly. This prevents four ad-hoc S3 integrations from drifting apart and makes dev iteration cheap (no AWS credentials needed for local work). Land this in Phase 1 — before any consumer — so the abstraction is genuinely tested against multiple backends before any feature code depends on it.

**Approach:** Thin interface, three implementations, Spring profile selection.

**The interface** (Java, illustrative):

```java
public interface ObjectStorageAdapter {
    StoredObject put(String key, InputStream data, long contentLength, String contentType, Map<String, String> metadata);
    Optional<StoredObjectStream> get(String key);
    boolean exists(String key);
    boolean delete(String key);
    List<StoredObjectSummary> list(String prefix, int maxResults);
    String generatePresignedUrl(String key, Duration expiry);
}
```

`StoredObject` returns `{ key, sizeBytes, etag, contentType }`. `StoredObjectStream` returns an `InputStream` the caller is responsible for closing (use try-with-resources). `StoredObjectSummary` is `{ key, sizeBytes, lastModified }`.

**The three implementations:**

1. **`S3StorageAdapter`** — AWS SDK v2, for production. Reads `STORAGE_BUCKET`, `STORAGE_REGION`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY` env vars. Works against native AWS S3, Cloudflare R2 (S3-compatible), Backblaze B2 (S3-compatible endpoint), and any other S3-API-compatible provider by overriding `STORAGE_ENDPOINT_URL`. Retry with exponential backoff (3 attempts, 100ms / 300ms / 1000ms) on transient errors; non-retriable on 4xx. Active under `prod` profile.

2. **`MinIOStorageAdapter`** — Same code path as S3StorageAdapter (MinIO is S3-compatible), but initialized against a Testcontainers-managed MinIO container for integration tests. Active under `test` profile. Inside `AbstractIntegrationTest`, a `@Container` MinIO instance starts once per test class and is torn down cleanly.

3. **`LocalFilesystemStorageAdapter`** — Writes files to a configurable local directory (default `$HOME/.worshiproom-dev-storage`). Keys map to hierarchical filesystem paths (forward slashes become actual subdirectories). Metadata stored as sidecar `.meta.json` files alongside the data file. Presigned URLs generated as `http://localhost:8080/dev-storage/{key}?expires=...` served by a dev-only controller that verifies the expiry signature. Active under `dev` profile. Gives Eric a zero-setup local workflow — no AWS credentials, no Docker container, just `./mvnw spring-boot:run`.

**Key conventions:**

- All keys are lowercase, forward-slash-separated, hierarchical: `post-images/{user_id}/{post_id}/{rendition}.jpg` — not `PostImages\{UserId}\...`
- Top-level key prefixes (load-bearing across consumers): `post-images/`, `testimony-cards/`, `backups/pg_dump/`, `exports/user-data/`
- Keys never contain user input directly — always sanitize (strip `..`, enforce allowed charset) before composing a key. A consumer that builds `post-images/{filename}` where `filename` is user-supplied is a path traversal vulnerability
- Max key length: 256 characters (S3 allows 1024, but this buffer prevents surprises across providers)

**Content-Type and Content-Length** are required on every `put` — no inference. Callers MUST know what they're uploading. The adapter validates Content-Length matches the stream's actual byte count; a mismatch throws `ObjectStorageIntegrityException`.

**Retry and failure semantics:**

- Transient failures (timeouts, 5xx, connection resets) retry up to 3 times with exponential backoff
- Non-retriable failures (403 forbidden, 400 bad request, key-too-long) throw immediately — no retry
- Every retry logs at WARN; every final failure logs at ERROR and surfaces to Sentry per 1.10d
- Successful operations log at DEBUG with key + size + duration
- Adapter operations include `requestId` from MDC per 1.10d's logging foundation

**Security:**

- Never include `STORAGE_SECRET_KEY` in logs or exceptions (PII scrubber from 1.10d catches this as defense-in-depth, but don't rely on the scrubber; log only the error class + key)
- Presigned URL generation uses the adapter's signing key, NEVER a user-provided parameter
- Presigned URL expiry maximum: 24 hours (configurable via `STORAGE_MAX_PRESIGN_HOURS`, defaults to 1 hour; caller can request shorter)
- Bucket ACL defaults to private; individual objects never get public-read ACL from this adapter (consumers that need public objects, like testimony card shares, use presigned URLs instead)

**Files to create:**

- `backend/src/main/java/com/worshiproom/storage/ObjectStorageAdapter.java` (interface)
- `backend/src/main/java/com/worshiproom/storage/StoredObject.java` (record types)
- `backend/src/main/java/com/worshiproom/storage/S3StorageAdapter.java`
- `backend/src/main/java/com/worshiproom/storage/LocalFilesystemStorageAdapter.java`
- `backend/src/main/java/com/worshiproom/storage/StorageConfig.java` (Spring `@Configuration` that picks the adapter by profile)
- `backend/src/main/java/com/worshiproom/storage/controller/DevStorageController.java` (dev-profile-only presigned URL serving)
- `backend/src/main/java/com/worshiproom/storage/ObjectStorageIntegrityException.java`
- `backend/src/test/java/com/worshiproom/storage/S3StorageAdapterIntegrationTest.java`
- `backend/src/test/java/com/worshiproom/storage/LocalFilesystemStorageAdapterIntegrationTest.java`
- `backend/src/test/java/com/worshiproom/storage/AbstractObjectStorageContractTest.java` (contract test both impls must pass)

**Files to modify:**

- `backend/pom.xml` — add `software.amazon.awssdk:s3` and `software.amazon.awssdk:s3-transfer-manager`
- `backend/src/main/resources/application-dev.properties` — local filesystem storage path
- `backend/src/main/resources/application-test.properties` — MinIO Testcontainer config
- `backend/src/main/resources/application-prod.properties` — S3 binding
- `.env.example` — document all storage env vars
- `backend/docs/runbook-storage.md` — how to rotate access keys, how to switch providers (R2 vs S3 vs B2)

**Database changes:** None

**API changes:** None (this is infrastructure; consumers expose their own endpoints)

**Copy Deck:** None (no user-facing copy — infrastructure only)

**Acceptance criteria:**

- [ ] `ObjectStorageAdapter` interface defined with all 6 operations
- [ ] `S3StorageAdapter` passes the contract test against MinIO Testcontainer
- [ ] `LocalFilesystemStorageAdapter` passes the same contract test
- [ ] Both implementations implement all 6 operations with identical semantics (contract test enforces this)
- [ ] Spring profile `dev` selects LocalFilesystemStorageAdapter
- [ ] Spring profile `test` selects MinIOStorageAdapter (via same S3StorageAdapter code)
- [ ] Spring profile `prod` selects S3StorageAdapter
- [ ] Content-Length mismatch throws `ObjectStorageIntegrityException`
- [ ] Retry fires 3 attempts with exponential backoff on transient failures
- [ ] Non-retriable 4xx failures throw immediately (no retry loop)
- [ ] Presigned URL expiry capped at `STORAGE_MAX_PRESIGN_HOURS` (integration test verifies cap enforcement)
- [ ] Key sanitization rejects `..`, leading slashes, and non-allowed characters with `IllegalArgumentException`
- [ ] Max key length enforced at 256 characters
- [ ] Dev-profile controller serves presigned URLs with expiry signature verification
- [ ] Contract test covers: put+get roundtrip, put+exists+delete+exists-false, put+list-by-prefix, put+generatePresignedUrl, metadata preservation, Content-Type preservation, large-file handling (>5MB test fixture)
- [ ] Secret keys never appear in logs (unit test asserts no `STORAGE_SECRET_KEY` value in emitted log lines after a failure)
- [ ] Storage operations integrate with 1.10d's requestId MDC + Sentry error capture
- [ ] Runbook documents provider rotation and key rotation procedures
- [ ] At least 20 tests (contract + per-impl + config + security)

**Testing notes:**

- The `AbstractObjectStorageContractTest` is the load-bearing artifact: both S3 (against MinIO) and LocalFilesystem implementations extend it and MUST pass identical assertions. This is how we prevent drift between adapters.
- Use real byte streams in tests (fixture files at `src/test/resources/fixtures/`) — don't mock `InputStream` with string-based stubs that hide encoding/size issues.
- Contract test parameterized with small (1 KB), medium (500 KB), and large (6 MB, triggering multipart) file sizes.
- Local filesystem adapter test verifies actual disk writes/reads under a `@TempDir`.

**Notes for plan phase recon:**

1. Confirm Cloudflare R2 is acceptable as production storage (10x cheaper than AWS S3 egress; fully S3-API-compatible via custom endpoint URL). Recommendation: R2 for MVP.
2. Verify the MinIO Testcontainer image tag (`minio/minio:RELEASE.2024-...`) is current and stable.
3. Decide bucket naming convention (`worshiproom-prod`, `worshiproom-dev`, or `worshiproom-{env}-{region}`).
4. Confirm AWS SDK v2 (not v1 — v1 is in maintenance mode).

**Out of scope:**

- Client-side direct-to-S3 uploads (presigned POST). Deferred; all uploads go through the backend for PII/size/malware checks.
- Image transformation (resize, format conversion). That's Spec 4.6b's responsibility — the adapter only stores bytes.
- Server-side encryption with customer-managed keys (SSE-C, SSE-KMS). Defer until a real compliance need emerges.
- Cross-region replication. Deferred; MVP is single-region.
- Versioning (S3 object versions). Deferred; backup retention covers the accidental-overwrite case.
- Malware scanning (ClamAV integration). Deferred; PII stripping catches metadata-based risks, and user-uploaded images in a Prayer Wall context are lower-risk than, say, PDF uploads.

**Out-of-band notes for Eric:** The contract test is the single most important thing in this spec. It's what lets you swap providers in the future (R2 → S3 → B2) with confidence that your code still works. When you add new operations to the interface in later specs, add the assertion to the contract test FIRST — if the contract test doesn't cover it, future drift between S3 and Local implementations is guaranteed. Also: the `LocalFilesystemStorageAdapter` is intentionally not production-grade (no concurrency guarantees across processes, no atomic writes). That's fine — it's a dev convenience. If you ever find yourself tempted to use it in production, the answer is always "no, use real S3 or R2."

---

### Spec 1.10c — Database Backup Strategy

- **ID:** `round3-phase01-spec10c-database-backup-strategy`
- **Size:** S
- **Risk:** Low (non-functional, but critical operational practice)
- **Prerequisites:** 1.10b, 1.10e
- **Goal:** Establish automated database backups with documented restore procedures and scheduled restore drills. Users are about to pour their prayers, confessions, testimonies, and spiritual journeys into this database. Losing that data due to a disk failure or deployment mistake is not a "oh well, it happens" outcome — it is a trauma for users whose testimonies of God's work are gone. A working backup strategy is the minimum operational baseline before user data touches the system.

**Approach:** Rely on platform-native backup where available (Railway PostgreSQL, Supabase, Neon all offer point-in-time recovery out of the box) and layer a weekly `pg_dump` to object storage on top as defense-in-depth. Document the exact restore procedure in a runbook so that when disaster strikes at 2 AM, the recovery path is a checklist, not a research project. Schedule a quarterly restore drill — actually restoring to a scratch database and verifying a known row appears.

**Platform-native backups:**

- Railway PostgreSQL: daily snapshots retained 7 days by default. If Railway is chosen in Spec 1.10b, this is automatic and requires no additional code.
- Supabase: daily backups retained 7 days on Pro plan; point-in-time recovery on higher tiers.
- Neon: branch-based time-travel with 7-day history by default.
- Whichever platform 1.10b selects, verify its backup configuration during the onboarding step.

**Layered `pg_dump` to object storage (weekly):**

- Spring `@Scheduled` task runs every Sunday at 03:00 UTC
- Shells out to `pg_dump` (backend container image MUST include the postgres-client package matching the DB version)
- Output written to object storage (reuses the adapter from Spec 1.10e) at `backups/pg_dump/{YYYY}/{MM}/{YYYY-MM-DD}.sql.gz`
- 90-day retention; files older than 90 days cleaned up by a second scheduled task
- Notification on success (compressed size) and on failure (error details). Until Phase 15 SMTP lands, notifications are WARN/INFO logs only; after Phase 15, add email channel as a follow-up cleanup.

**Restore runbook:**

- Markdown document at `backend/docs/runbook-database-restore.md`
- Step-by-step procedure for: (a) restoring a platform-native snapshot, (b) restoring from a `pg_dump` file to a fresh DB, (c) smoke-testing the restore before flipping DNS
- Exact `psql` and `pg_restore` commands with placeholder substitutions
- Known-row verification query (e.g., "does user `eric@...` exist?") to confirm the restore took

**Quarterly restore drill:**

- Calendar reminder to Eric (intentionally human-in-the-loop, not automated)
- Actually spin up a scratch Postgres container, restore latest backup, run the verification query
- If the drill fails, that is the signal to fix the backup pipeline BEFORE you need it

**Files to create:**

- `backend/src/main/java/com/worshiproom/operations/BackupService.java`
- `backend/src/main/java/com/worshiproom/operations/BackupScheduledJob.java`
- `backend/src/main/java/com/worshiproom/operations/BackupRetentionJob.java`
- `backend/src/test/java/com/worshiproom/operations/BackupServiceIntegrationTest.java`
- `backend/docs/runbook-database-restore.md`

**Files to modify:**

- `backend/Dockerfile` (install `postgresql-client` matching DB version)
- `backend/src/main/resources/application.properties` (backup cron expression, retention days, storage path prefix)
- `.env.example` (document `BACKUP_STORAGE_BUCKET`, `BACKUP_NOTIFICATION_EMAIL`)

**Database changes:** None

**API changes:** None (backup is internal; no public endpoint)

**Copy Deck:** None (no user-facing copy)

**Acceptance criteria:**

- [ ] Platform-native backup is enabled and verified at the deployment target chosen in 1.10b
- [ ] Scheduled `pg_dump` job runs Sunday 03:00 UTC and writes to object storage
- [ ] Compressed dump size is reasonable (sanity: < 10× live DB size)
- [ ] Retention job deletes dumps older than 90 days (integration test seeds old-timestamped dumps and asserts deletion)
- [ ] Restore runbook exists at `backend/docs/runbook-database-restore.md`
- [ ] Runbook has been read end-to-end by Eric with any ambiguities resolved
- [ ] At least ONE restore drill has been performed and documented in the runbook (date, outcome, issues found)
- [ ] Quarterly drill reminder is on Eric's calendar
- [ ] Backup failure surfaces as a WARN log (email channel added as follow-up after Phase 15)
- [ ] At least 8 tests cover backup scheduling, retention, storage paths, and error handling

**Testing notes:**

- Integration tests use Testcontainers + MinIO (S3-compatible) and run a real `pg_dump` against the test DB
- Do NOT mock `pg_dump` — the whole point is catching command-line integration bugs
- Retention test manually writes old-timestamped objects to MinIO and asserts cleanup

**Notes for plan phase recon:**

1. Confirm the object storage adapter from 3.12b is available (if this spec executes before 3.12b, temporarily use platform-native cloud storage with a TODO to migrate)
2. Verify the deployment target chosen in 1.10b has automatic snapshots configured
3. Decide the notification recipient — personal email is fine for now; set up `ops@` when the app grows

**Out of scope:**

- Real-time replication (read replicas, streaming) — not needed at current scale
- Cross-region backup redundancy — nice-to-have, not MVP-essential
- Application-level per-user export (that is Spec 10.11)
- Automated restore (drills are intentionally manual — human judgment during disaster)

**Out-of-band notes for Eric:** The quarterly drill is the most-skipped step in any backup strategy in any organization, ever. Do it. Put it on your calendar right now. A drill that discovers "my pg_dump can't be restored because the version mismatches" is FAR preferable to discovering that at 2 AM after a deploy went sideways. Budget 2 hours for the first drill, 30 minutes for subsequent drills.

---

### Spec 1.10f — Terms of Service and Privacy Policy Surfaces

- **ID:** `round3-phase01-spec10f-terms-privacy-policy-surfaces`
- **Size:** M
- **Risk:** Medium-High (legal exposure if absent; drafting risk if wrong; every user who registers implicitly accepts these so the drafts must actually reflect what the app does)
- **Prerequisites:** 1.10b, 1.10c, 1.10d, 1.10e
- **Goal:** Ship a Terms of Service page, a Privacy Policy page, and the registration-time consent flow that binds new users to them. Without these, every user registering in the Phase 1 cutover is technically registering without agreeing to anything — which is both a legal exposure for Eric and an ethical gap given the vulnerability-adjacent nature of Prayer Wall content. This spec does NOT attempt to produce legally-perfect final copy (that requires a lawyer); it produces legitimate first-draft copy that accurately describes what the app does, with an explicit follow-up to have a lawyer review before scale-up.

**Approach:** Two static content pages at `/terms` and `/privacy`, linked from the site footer and from the registration form's consent checkbox. Pages are versioned (per-deployment git SHA captured in `terms_version` / `privacy_version` columns on `users` at registration). First-draft content written by Eric (with AI assistance is fine but NOT a replacement for human authorship of the core decisions) covering: what Worship Room is, what data is collected, how it's used, who has access, how users can export/delete it (hooks into Spec 10.11), third-party services (SMTP, storage, monitoring — enumerate each), cookie/tracking posture (minimal — no marketing analytics, basic auth session only), age minimum (13+ for COPPA safety), arbitration and dispute resolution, changes policy. Registration form adds a consent checkbox that cannot be pre-checked (per GDPR dark-pattern rules — users must actively opt in).

**Core content sections (Terms of Service):**

1. **What Worship Room is** — a community app for sharing prayer requests, testimonies, and reflections. Not a crisis service, not therapy, not medical care.
2. **Eligibility** — 13+ minimum age. Users under 18 should have parental awareness (we don't block signup based on age but the ToS names the expectation).
3. **Account rules** — one human per account, accurate registration info, no impersonation, no automated access without written permission.
4. **Content ownership** — users retain ownership of their posts and comments. Users grant Worship Room a non-exclusive license to display, store, and moderate that content within the service. License ends when content is deleted (respecting Spec 10.11's 30-day grace).
5. **Prohibited content** — harassment, explicit sexual content, content that promotes self-harm, illegal content, spam, impersonation of real people, content posted without consent of pictured persons. Anti-Christian content not prohibited (the app is for the Christian community but doesn't censor respectful disagreement).
6. **Moderation** — moderators may remove content, restrict accounts, or ban users per published community standards (links to separate Community Guidelines doc as future work). Moderation actions are appealable per Spec 10.8.
7. **Crisis content** — users in acute distress should contact 988 or Crisis Text Line; Worship Room is NOT a crisis intervention service and explicitly does NOT offer crisis counseling. Crisis-flagged posts may be surfaced to moderators but moderators are not crisis professionals.
8. **Termination** — Worship Room may terminate accounts for terms violations. Users may delete their own accounts anytime (Spec 10.11 flow).
9. **Disclaimers** — content is user-generated; Worship Room doesn't warrant accuracy of prayers, theological claims, or personal advice shared by users. Worship Room is provided "as is."
10. **Liability limits** — standard clause; Eric should have a lawyer draft the actual text.
11. **Arbitration** — placeholder (lawyer required).
12. **Changes** — ToS changes require 30-day advance notice via in-app banner and email to opted-in users. Continued use after the effective date = acceptance.
13. **Contact** — support email, legal inquiries email.

**Core content sections (Privacy Policy):**

1. **What we collect** — email, first name, last name, password (hashed), posts and comments you create, reactions and bookmarks, friendships you establish, timezone, timestamps of activity. Explicitly: we do NOT collect location beyond timezone, we do NOT fingerprint devices for advertising, we do NOT buy data from third parties.
2. **Why we collect it** — to run the service (authentication, displaying your content, delivering notifications), to moderate content, to debug errors. Explicitly: we do NOT sell data, we do NOT serve ads.
3. **Third-party services** — enumerate:
   - Cloudflare R2 (or chosen storage per 1.10e): stores user-uploaded images and database backups
   - Sentry (per 1.10d): receives error reports with PII scrubbed
   - UptimeRobot or Better Stack (per 1.10d): monitors the /api/v1/health endpoint; does not receive user data
   - Postmark / SendGrid / Resend (chosen per 15.1): sends transactional and welcome emails
   - Railway / Supabase / Upstash (chosen per 1.10b and 5.6): hosts database and Redis
4. **How long we keep it** — active users: indefinitely while account exists. Deleted users: 30-day grace then anonymized (per Spec 10.11). Logs: 90 days. Email send logs: retained for delivery troubleshooting, purged per the same schedule.
5. **Who has access** — Eric as the operator. Moderators access moderation-queued content (reported posts, crisis-flagged posts). Third-party services listed above per their limited roles. Law enforcement only with valid legal process.
6. **Your rights** — you can export your data (Spec 10.11), delete your account (Spec 10.11), correct inaccurate data (edit profile), unsubscribe from emails (Spec 15.1b), restrict certain processing (see below).
7. **Cookies** — Worship Room uses only functional cookies (auth session). No analytics cookies, no advertising cookies, no third-party trackers. Users can block cookies; auth won't work without the session cookie.
8. **Children's privacy** — Worship Room is not directed at children under 13. We do not knowingly collect data from users under 13. If we learn we have data from someone under 13, we delete it.
9. **International users** — app is hosted in the US. Users outside the US consent to data processing in the US. GDPR rights honored regardless of user location.
10. **Changes** — same 30-day notice as ToS changes.
11. **Contact** — privacy email for data requests and questions.

**Registration consent flow:**

- Registration form (AuthModal) adds two pieces of copy at the bottom, above the Submit button:
  - Checkbox (NOT pre-checked): "I'm 13 or older and I agree to the [Terms of Service] and [Privacy Policy]."
  - Links open in a new tab to `/terms` and `/privacy`
- Submit button is DISABLED until the checkbox is checked
- On successful registration, the server stores `users.terms_version` and `users.privacy_version` with the current deployment's document version hash (git SHA of the .md file at deploy time)
- If ToS or Privacy Policy is updated, a version-mismatch detection on next login shows an inline consent prompt (modal): "We've updated our Terms and Privacy Policy. Here's a summary of what changed: ... [Review terms] [Review privacy] [I agree and continue]" — user cannot use the app until they agree
- Users who refuse to agree to the update see: "That's OK. Your account will stay as-is for now, but you won't be able to post or interact until you agree or delete your account." — links to Spec 10.11 account deletion.
- Grace period on update: the 30-day announcement period MUST have elapsed before the forcing modal appears

**Footer links (site-wide):**

- Footer component renders "Terms", "Privacy", "Contact" links on every page including logged-out pages
- Each link opens to the respective page, not a new tab (users who follow the link in-app should be able to hit Back to return)

**Content authoring and review process:**

- First drafts written by Eric (AI assistance fine for phrasing, NOT for core legal decisions)
- Documents reviewed for accuracy against actual app behavior by someone technical BEFORE shipping (cross-check: does the privacy policy mention all third-party services actually in use? Does the ToS match Spec 10.11's deletion flow?)
- BEFORE user count exceeds 500, a real lawyer reviews both documents (schedule this; don't defer indefinitely). Budget $500-2000 for a single-sitting review with a lawyer familiar with SaaS ToS.
- Documents checked into the repo at `docs/legal/terms.md` and `docs/legal/privacy.md`; frontend renders them from those files at build time (Vite content plugin or equivalent)

**Versioning:**

- Each document has a `version` frontmatter field (YYYY-MM-DD format, plus optional `-rev-N` suffix)
- Version gets computed from the git SHA at build time for automated version tracking
- `users.terms_version VARCHAR(40)` and `users.privacy_version VARCHAR(40)` columns added via Liquibase
- On registration: populated with current version
- On update: version-mismatch detection triggers the consent prompt

**Anti-dark-pattern design:**

- Consent checkbox NEVER pre-checked
- Submit button disabled until checkbox is checked (clear cause-and-effect for the user)
- Consent checkbox label is concise and scannable; the actual agreement requires reading the linked pages (no "by using this site you agree" implicit consent pattern)
- Withdrawal of consent (deleting account) is as easy as granting it was (Spec 10.11)
- No "accept all / reject all" cookie banner (we don't use trackable cookies, so no banner is needed — but a note in the footer clarifies this)
- Policy update consent NEVER uses a pre-checked "I agree" — always requires active click
- Changes to ToS/privacy always include a plain-language summary ("what changed") AT THE TOP of the update prompt, not buried in legalese

**Files to create:**

- `docs/legal/terms.md`
- `docs/legal/privacy.md`
- `frontend/src/pages/Terms.tsx`
- `frontend/src/pages/Privacy.tsx`
- `frontend/src/components/Footer.tsx` (or extend existing footer)
- `frontend/src/components/TermsUpdateModal.tsx`
- `backend/src/main/java/com/worshiproom/legal/LegalVersionService.java`
- `backend/src/main/resources/db/changelog/2026-04-22-006-add-users-legal-version-columns.xml`
- `backend/src/test/java/com/worshiproom/legal/LegalVersionIntegrationTest.java`
- `__tests__/Terms.test.tsx`, `Privacy.test.tsx`, `TermsUpdateModal.test.tsx`

**Files to modify:**

- `frontend/src/components/prayer-wall/AuthModal.tsx` — add consent checkbox; disable Submit until checked
- `backend/src/main/java/com/worshiproom/auth/AuthService.java` — capture and store terms/privacy versions on register
- `backend/src/main/java/com/worshiproom/user/User.java` — add `termsVersion`, `privacyVersion` fields
- Router — add `/terms` and `/privacy` public routes
- OpenAPI spec — document the version-check endpoint
- Layout component — mount Footer on every page

**Database changes:**

- Alter `users`: add `terms_version VARCHAR(40) NOT NULL DEFAULT 'unversioned'`, `privacy_version VARCHAR(40) NOT NULL DEFAULT 'unversioned'` columns
- Liquibase changeset: `2026-04-22-006-add-users-legal-version-columns.xml`
- Existing users get `'unversioned'` default, which triggers the update-consent prompt on their next login

**API changes:**

- `GET /api/v1/legal/versions` — public; returns current deployed versions `{ terms_version, privacy_version, effective_date, summary_of_changes? }`
- `POST /api/v1/users/me/legal/accept` — auth required; accepts the current versions; body `{ terms_version, privacy_version }`; server validates versions match current deployed
- `POST /api/v1/auth/register` — now requires `{ ..., accepted_terms_version, accepted_privacy_version }` in body; server validates these match current deployed before creating account

**Copy Deck:**

_Registration consent checkbox:_

- Label (cannot be pre-checked): "I'm 13 or older and I agree to the Terms of Service and Privacy Policy."
- The phrase "Terms of Service" is a link to `/terms`
- The phrase "Privacy Policy" is a link to `/privacy`
- Validation error if unchecked: "Please agree to the Terms of Service and Privacy Policy to continue."

_Footer links:_

- "Terms" → `/terms`
- "Privacy" → `/privacy`
- "Contact" → mailto: or `/contact`
- Footer cookie note (small text): "Worship Room uses only the cookies needed to keep you signed in. We don't use tracking or advertising cookies."

_Terms update modal:_

- Heading: "Our Terms have been updated"
- Body intro: "Here's what changed:"
- Summary (populated from the update's "summary_of_changes" field)
- Links: "Read the full Terms" / "Read the full Privacy Policy"
- Primary button: "I agree and continue"
- Secondary button: "Not right now"
- Secondary button consequence text: "Your account will stay as-is, but you won't be able to post or interact until you agree or delete your account."

_Privacy policy opening paragraph:_

"Worship Room exists to help you share prayers, testimonies, and reflections with a trustworthy community. This policy explains what we collect, why, and your rights. We've tried to write it in plain language; if something isn't clear, email us at the address at the bottom."

_Terms of service opening paragraph:_

"These are the terms of using Worship Room. They're an agreement between you and us about what the app is, what we promise, what we expect from you, and what happens if things go wrong. We've tried to write them in plain language; the legal bits are only the ones that matter."

**Anti-Pressure Copy Checklist:** (a) no comparison ✓ (b) no urgency ✓ (c) no exclamation points near vulnerability ✓ (d) no therapy-app jargon ✓ (e) no streak-as-shame ✓ (f) no false scarcity ✓

**Anti-Pressure Design Decisions:**

- Consent checkbox cannot be pre-checked
- Submit button disabled until checkbox checked
- No "accept all" cookie dark pattern (none needed; no tracking cookies)
- Terms and Privacy accessible via footer on every page
- Policy-update consent prompt requires active click, never auto-accepts
- Summary-of-changes shown at top of update prompt, not buried in legalese
- Declining a policy update doesn't silently lock the account — user explicitly informed and given the deletion path
- 30-day advance notice for policy changes baked into the ToS itself (so users know the commitment)
- Plain-language openings in both documents (not "WHEREAS the User shall hereby...")

**Acceptance criteria:**

- [ ] `/terms` and `/privacy` routes render the respective markdown docs styled consistently with the rest of the site
- [ ] Footer renders on every page (logged-in and logged-out) with Terms, Privacy, Contact links
- [ ] Registration form shows the consent checkbox UNCHECKED by default
- [ ] Submit button is DISABLED when checkbox is unchecked
- [ ] Submit button ENABLES when checkbox is checked
- [ ] Attempting to submit without checking triggers the validation error message
- [ ] Server rejects registration POST without `accepted_terms_version` and `accepted_privacy_version` fields
- [ ] Server rejects registration with mismatched versions (returns 400)
- [ ] On successful registration, `users.terms_version` and `users.privacy_version` match the current deployed versions
- [ ] Existing users (before this spec shipped) have `'unversioned'` defaults
- [ ] `'unversioned'` users trigger the update-consent modal on their next login
- [ ] Update-consent modal shows summary-of-changes at top
- [ ] "I agree and continue" updates the user's stored versions and dismisses the modal
- [ ] "Not right now" dismisses the modal but flags the session as interaction-locked; user can still browse/read but cannot post/comment/react
- [ ] Interaction-lock message visible on attempted interactions: "You'll need to agree to the updated Terms to interact. Review them anytime from Settings."
- [ ] Version hash derived from git SHA at build time (verified via build-output inspection)
- [ ] Terms and Privacy pages linked from the registration consent label text open in a NEW tab
- [ ] Terms and Privacy pages linked from the footer open in the SAME tab (no new tab spam)
- [ ] Accessibility: both pages have proper semantic heading structure (H1 → H2 → H3)
- [ ] Accessibility: consent checkbox is keyboard-reachable and has accessible name including the document titles
- [ ] Accessibility: update-consent modal traps focus and can be Escape-dismissed (same behavior as "Not right now")
- [ ] Accessibility: page content meets WCAG AA contrast
- [ ] Mobile viewport renders both pages readably (text ≥14px body, good line-height)
- [ ] Dark mode rendering of both pages has good contrast
- [ ] Documents cross-reference accurate app behavior (verified manually: every third-party service in 1.10e/1.10d/5.6/15.1 is listed in Privacy; every moderation action type in Phase 10 matches the Terms description)
- [ ] Footer includes cookie posture note
- [ ] At least 18 tests across version tracking, registration validation, update consent flow, interaction-lock behavior, accessibility

**Testing notes:**

- Integration test: register with missing consent fields → 400; register with mismatched versions → 400; register with correct versions → 201 with stored version on user
- Integration test: update the terms markdown file, rebuild, verify version hash changes; log in as existing user, verify update-consent modal appears
- Integration test: click "Not right now" → flag set; attempt to post → 403 with interaction-lock message
- Integration test: click "I agree and continue" → version updated; subsequent post attempt succeeds
- Unit test: Footer renders all three links on every route
- Unit test: Consent checkbox disabled → Submit disabled; checked → Submit enabled
- Accessibility test: axe-core on both pages, VoiceOver walk of consent flow
- Manual QA: render both documents and visually confirm they actually describe the app
- Manual QA checklist for content accuracy: every third-party service listed, deletion flow matches 10.11, moderation flow matches Phase 10.7/10.7b/10.8

**Notes for plan phase recon:**

1. Decide content-authoring approach. Recommendation: Eric writes first drafts in a couple of focused sessions, Claude assists with phrasing clarity, a lawyer reviews before scale-up (budget $500-2000)
2. Confirm the 30-day advance notice for policy changes is workable operationally. Some changes (urgent security corrections) may need shorter notice; the ToS should allow for "emergency changes with shorter notice"
3. Decide whether to use a third-party legal-docs template as a starting point (Termly, Iubenda). Recommendation: write original drafts in Worship Room's voice; templates sound corporate and off-brand
4. Verify the Vite/frontend build can render markdown documents at build time with syntax highlighting if ever needed (probably not for legal docs)
5. Confirm git-SHA-derived version hash is deterministic and survives deploy process (if the build process rewrites files, version might change unexpectedly; use the markdown file's git log, not the built file's hash)
6. Decide if "Contact" in footer goes to a mailto: or to a `/contact` page. Recommendation: `/contact` page with a simple form (easier to add privacy-protective routing later)

**Out of scope:**

- Full Community Guidelines document (referenced but not built in this spec; follow-up spec)
- Per-jurisdiction privacy law variants (CCPA California supplements, UK Data Protection Act, etc.) — lawyer-review territory, deferred
- Cookie consent banner — not needed for Worship Room's cookie posture (functional-only)
- DPA (Data Processing Agreement) for enterprise/B2B use — out of scope (no B2B for MVP)
- Legal translation — English only
- Age verification beyond self-attestation — out of scope; we trust the 13+ self-attestation
- Automated ToS change announcement emails — possible follow-up; manual announcement via in-app banner + welcome-sequence-style email for MVP

**Out-of-band notes for Eric:** Resist the urge to use a SaaS template for these docs. Every "we value your privacy" cliché page looks the same and sounds corporate; Worship Room's voice is the whole differentiator. The opening paragraph of each document sets the tone — "we've tried to write this in plain language" is already a signal of care that 95% of privacy policies fail. Also: the lawyer review before 500 users is not optional. Even with good drafts, there are clauses (arbitration, liability limits, indemnification) that a lawyer writes differently than you will. Budget for it; it's cheaper than a dispute. Finally: when the time comes to update these docs (which will happen — every app evolves), resist the urge to do minor updates without a summary-of-changes. Users deserve to know what's different, even if it's small. The summary-of-changes pattern is what keeps this from being a dark-pattern update flow.

---

## Phase 2 — Activity Engine Migration (Dual-Write)

> **Phase purpose:** Migrate the activity engine (faith points, streaks, badges, grace periods, grief pause) to the backend in dual-write mode. localStorage remains the source of truth for reads during this wave; the backend gets a shadow copy via fire-and-forget writes. After this phase, every activity recorded on any feature populates both stores. Future waves can promote the backend to source-of-truth one feature at a time.

**What this phase accomplishes:** At the end of Phase 2, every call to `recordActivity()` from any feature (Daily Hub, Bible, Meditate, Music, Prayer Wall) writes to localStorage AND fires a background `POST /api/v1/activity` to the backend. The backend stores the activity, computes points/streaks/badges using the same logic as the frontend, and a drift-detection test asserts the two implementations stay in parity. The user notices nothing — celebrations still come from localStorage. But the backend now has real activity data ready for future read migrations.

**Sequencing notes:** Specs are mostly sequential. Spec 2.1 lays the schema. Specs 2.2-2.5 build the backend service layer. Spec 2.6 implements the single API endpoint. Spec 2.7 wires the frontend dual-write. Spec 2.8 adds the drift-detection test. Spec 2.9 is the cutover.

**Phase-level definition of done:**

- All five activity-related tables exist (`activity_log`, `faith_points`, `streak_state`, `user_badges`, `activity_counts`) via Liquibase
- `POST /api/v1/activity` endpoint accepts an activity write and returns the same shape the frontend computes locally
- Frontend `recordActivity()` dual-writes (localStorage primary, backend shadow)
- Drift-detection test passes — frontend and backend produce identical results for shared test cases
- Grace period logic on backend (2 free per week, Monday reset)
- Grief pause logic on backend (7-day pause, once per 30 days)
- Streak repair logic on backend (50 points per day, free 1x/week)
- `VITE_USE_BACKEND_ACTIVITY` flag controls whether dual-write is active (defaults `false` until cutover spec)
- Phase 2 cutover spec flips the flag to `true` and verifies dual-write in production-like local environment
### Spec 2.1 — Activity Engine Schema (Liquibase)

- **ID:** `round3-phase02-spec01-activity-schema`
- **Size:** M
- **Risk:** Low
- **Prerequisites:** Phase 1 complete
- **Goal:** Create all five activity-related tables via a single Liquibase changeset (or one changeset per table — preference for separate changesets per the discipline rule).

**Approach:** Five new changesets in `db/changelog/`:

- `2026-04-15-001-create-activity-log-table.xml`
- `2026-04-15-002-create-faith-points-table.xml`
- `2026-04-15-003-create-streak-state-table.xml`
- `2026-04-15-004-create-user-badges-table.xml`
- `2026-04-15-005-create-activity-counts-table.xml`

Schema definitions match Decision 5 in the Architectural Foundation exactly. Foreign keys to `users.id` with `ON DELETE CASCADE`. Indexes per the Decision 5 spec. Master changelog updated to include all five.

**Acceptance criteria:**

- \[ \] All five tables created in dev database via `./mvnw spring-boot:run`
- \[ \] Each table has correct columns, types, primary keys, foreign keys, indexes
- \[ \] `psql \d activity_log` shows the schema correctly
- \[ \] Each changeset has a valid rollback block
- \[ \] LiquibaseSmokeTest extended to verify all five tables exist
- \[ \] Testcontainers integration test confirms migrations apply in test environment

### Spec 2.2 — Faith Points Calculation Service (Backend Port)

- **ID:** `round3-phase02-spec02-faith-points-service`
- **Size:** L
- **Risk:** Medium (must match frontend logic exactly)
- **Prerequisites:** 2.1
- **Goal:** Port the existing frontend faith point calculation logic from `services/faith-points-storage.ts` to a backend `FaithPointsService`. Same point values, same multiplier logic, same level thresholds.
**Approach:** Read the existing frontend logic carefully during recon. Document every point value, every multiplier rule, every level threshold. Port to a backend `FaithPointsService` with the same shape. Unit tests compare backend output against a hardcoded set of (input, expected output) pairs that the frontend implementation also passes. The drift-detection test in Spec 2.8 will assert parity automatically; this spec just ensures the values are right at the moment of porting.
**Files to create:**

- `backend/src/main/java/com/worshiproom/activity/FaithPointsService.java`
- `backend/src/main/java/com/worshiproom/activity/FaithPointsRepository.java`
- `backend/src/main/java/com/worshiproom/activity/dto/FaithPointsResult.java`
- `backend/src/main/java/com/worshiproom/activity/constants/ActivityType.java` (enum mirroring frontend)
- `backend/src/main/java/com/worshiproom/activity/constants/PointValues.java` (constants mirroring frontend)
- `backend/src/main/java/com/worshiproom/activity/constants/LevelThresholds.java`
- `backend/src/test/java/com/worshiproom/activity/FaithPointsServiceTest.java` (unit tests)

**Acceptance criteria:**

- \[ \] Every `ActivityType` enum value matches a frontend activity type string-for-string
- \[ \] Point values match the frontend constants file value-for-value
- \[ \] Level thresholds match the frontend constants file
- \[ \] Multiplier logic produces the same tier labels and multipliers as frontend
- \[ \] Recording an activity returns `FaithPointsResult` with: points_earned, total_points, current_level, level_up boolean, multiplier_tier
- \[ \] At least 20 unit tests cover happy paths, level-up cases, multiplier edge cases, and the activity types most commonly used by Prayer Wall
- \[ \] No database calls in unit tests — pure logic only

### Spec 2.3 — Streak State Service (Backend Port)

- **ID:** `round3-phase02-spec03-streak-service`
- **Size:** L
- **Risk:** Medium
- **Prerequisites:** 2.2
- **Goal:** Port streak update logic to a backend `StreakService`. Includes same-day idempotency, day-over-day continuation, gap detection, grace period consumption, grief pause check, streak repair eligibility.

**Approach:** Read the existing frontend streak logic from `services/streak-storage.ts` (or wherever it lives — recon will confirm). Port to backend with same behavior. The `updateStreak(userId, activityDate)` method takes a user and a date and returns the updated streak state. Edge cases: same-day activity (no streak change), consecutive day (increment), one-day gap with grace available (consume grace, increment), one-day gap with grief pause active (no penalty), multi-day gap (reset to 1), repair-eligible gap (return repair option).

**Files to create:**

- `backend/src/main/java/com/worshiproom/activity/StreakService.java`
- `backend/src/main/java/com/worshiproom/activity/StreakRepository.java`
- `backend/src/main/java/com/worshiproom/activity/dto/StreakResult.java`
- `backend/src/test/java/com/worshiproom/activity/StreakServiceTest.java`

**Acceptance criteria:**

- \[ \] Same-day repeat activity does not increment streak
- \[ \] Day-over-day activity increments streak
- \[ \] One-day gap with grace days remaining consumes a grace day and continues the streak
- \[ \] One-day gap with no grace days remaining and no grief pause breaks the streak
- \[ \] Active grief pause prevents any streak break
- \[ \] Multi-day gap (without grief pause) resets streak to 1
- \[ \] Grace days reset on Monday midnight (server time)
- \[ \] Longest streak updates whenever current streak exceeds it
- \[ \] At least 25 unit tests cover all combinations
- \[ \] Repair eligibility flag returned when a single broken day could be repaired

### Spec 2.4 — Badge Eligibility Service (Backend Port)

- **ID:** `round3-phase02-spec04-badge-service`
- **Size:** L
- **Risk:** Medium
- **Prerequisites:** 2.3
- **Goal:** Port badge eligibility logic to a backend `BadgeService`. Same badge IDs, same trigger conditions, same celebration tiers, same display counts. **Approach:** Read the existing frontend badge catalog from `services/badge-storage.ts` and `constants/badges.ts` (or equivalent). Port the catalog and the eligibility logic. The `checkBadges(userId, context)` method takes a user and a context object (current activity, total points, current streak, intercession count, etc.) and returns the list of newly-earned badges plus any badge whose display count should increment. Idempotent — calling it twice in a row returns no new badges the second time.
**Files to create:**

- `backend/src/main/java/com/worshiproom/activity/BadgeService.java`
- `backend/src/main/java/com/worshiproom/activity/BadgeRepository.java`
- `backend/src/main/java/com/worshiproom/activity/constants/BadgeCatalog.java`
- `backend/src/main/java/com/worshiproom/activity/dto/BadgeResult.java`
- `backend/src/test/java/com/worshiproom/activity/BadgeServiceTest.java`

**Acceptance criteria:**

- [ ] Every badge in the frontend catalog exists in the backend catalog with matching ID, name, description, icon name, celebration tier
- [ ] Eligibility logic produces the same results as frontend for shared test cases
- [ ] Idempotent: calling `checkBadges` twice returns the new badge once and zero badges the second call
- [ ] Display count increments for milestone-style badges (e.g., "10 prayers", "25 prayers")
- [ ] At least 30 unit tests cover the badge catalog comprehensively

### Spec 2.5 — Activity Counts Service

- **ID:** `round3-phase02-spec05-activity-counts-service`
- **Size:** S
- **Risk:** Low
- **Prerequisites:** 2.4
- **Goal:** Backend service that maintains per-user counts for each activity type (e.g., total prayers prayed, total intercessions logged). Used by `BadgeService` for milestone badges.

**Approach:** `ActivityCountsService` with `incrementCount(userId, countType)` and `getCount(userId, countType)`. Backed by the `activity_counts` table. Atomic increment via JPA `@Modifying` query or pessimistic lock.

**Files to create:**

- `backend/src/main/java/com/worshiproom/activity/ActivityCountsService.java`
- `backend/src/main/java/com/worshiproom/activity/ActivityCountsRepository.java`
- `backend/src/test/java/com/worshiproom/activity/ActivityCountsServiceTest.java`

**Acceptance criteria:**

- [ ] Increment is atomic (no race condition under concurrent calls)
- [ ] Get returns 0 for unknown count types (no null)
- [ ] Integration test confirms counts persist correctly via Testcontainers
- [ ] At least 5 unit tests

### Spec 2.6 — Activity API Endpoint

- **ID:** `round3-phase02-spec06-activity-endpoint`
- **Size:** L
- **Risk:** Medium
- **Prerequisites:** 2.5
- **Goal:** Implement `POST /api/v1/activity` that ties together FaithPointsService, StreakService, BadgeService, and ActivityCountsService. Returns the unified result shape from Decision 5.

**Approach:** `ActivityController` with one POST method. Validates the request body (`activity_type`, `source_feature`, optional `metadata`). Calls each service in sequence within a transaction:

1. `FaithPointsService.recordActivity(...)` — returns points result
2. `StreakService.updateStreak(...)` — returns streak result
3. `ActivityCountsService.incrementCount(...)` — increments counts
4. `BadgeService.checkBadges(...)` — returns new badges

Combines all four results into a single `ActivityResponse` DTO matching the shape from Decision 5. Persists an `activity_log` row. Returns the response. Rate limited per `.claude/rules/02-security.md` (no specific limit on activity writes for now, but the rate limit filter is in place).

**Files to create:**

- `backend/src/main/java/com/worshiproom/activity/ActivityController.java`
- `backend/src/main/java/com/worshiproom/activity/ActivityService.java` (orchestrator)
- `backend/src/main/java/com/worshiproom/activity/dto/ActivityRequest.java`
- `backend/src/main/java/com/worshiproom/activity/dto/ActivityResponse.java`
- `backend/src/test/java/com/worshiproom/activity/ActivityControllerIntegrationTest.java`

**Acceptance criteria:**

- [ ] Authenticated `POST /api/v1/activity` with valid body returns 200 with the full ActivityResponse
- [ ] Unauthenticated POST returns 401
- [ ] Invalid `activity_type` returns 400 with field-level error
- [ ] All four service calls execute within a single transaction (rollback on any failure)
- [ ] An `activity_log` row is created on every successful call
- [ ] Response includes `points_earned`, `total_points`, `current_level`, `level_up`, `streak`, `new_badges`, `multiplier_tier`
- [ ] OpenAPI spec includes the endpoint with full request/response schemas
- [ ] Generated frontend types include `ActivityRequest` and `ActivityResponse`
- [ ] Integration test covers happy path, level-up case, badge-earned case, streak-continuation case via Testcontainers

### Spec 2.7 — Frontend Activity Dual-Write

- **ID:** `round3-phase02-spec07-frontend-activity-dual-write`
- **Size:** M
- **Risk:** Medium
- **Prerequisites:** 2.6
- **Goal:** Update the frontend `recordActivity()` to dual-write — write to localStorage as before, then fire-and-forget `POST /api/v1/activity`. localStorage remains source of truth for reads.

**Approach:** Locate the existing `recordActivity()` function (recon will confirm — likely `services/activity-recorder.ts` or similar). Wrap the existing logic. After the localStorage write completes, fire `POST /api/v1/activity` via the `apiClient` from Spec 1.9. Do NOT await the response — fire-and-forget. Catch and log errors to console; do not surface to the user. Gate the dual-write behind `VITE_USE_BACKEND_ACTIVITY` env flag (default `false` until cutover).

**Files to modify:**

- `frontend/src/services/activity-recorder.ts` (or equivalent — recon confirms)
- `frontend/.env.example` (add `VITE_USE_BACKEND_ACTIVITY`)

**Acceptance criteria:**

- [ ] With flag off: no backend call, behavior identical to before
- [ ] With flag on: localStorage write happens first, backend call fires after, no await
- [ ] Backend call errors are caught and logged but do not break the user flow
- [ ] Celebrations still trigger from localStorage-computed result (no waiting on backend)
- [ ] At least 5 tests cover both flag states

### Spec 2.8 — Drift Detection Test (Frontend ↔ Backend)

- **ID:** `round3-phase02-spec08-activity-drift-test`
- **Size:** M
- **Risk:** Low
- **Prerequisites:** 2.7
- **Goal:** A test that runs both frontend and backend activity engine implementations against the same set of test cases and asserts identical results. Catches the "you updated one side and forgot the other" failure mode.

**Approach:** A Java test in the backend test suite. Reads a shared JSON file `shared-test-cases/activity-drift.json` containing inputs (user state, activity type) and expected outputs (points, streak, badges). For each case, runs the backend `ActivityService` and asserts the result matches. The same JSON file is consumed by a frontend Vitest drift test that runs the frontend implementation against the same cases. If frontend and backend diverge, both tests fail.

**Files to create:**

- `shared-test-cases/activity-drift.json` (shared at repo root)
- `backend/src/test/java/com/worshiproom/activity/DriftDetectionTest.java`
- `frontend/src/services/__tests__/activity-drift.test.ts`

**Acceptance criteria:**

- [ ] At least 30 test cases in the JSON file covering: simple activity, level-up, badge-earn, streak continuation, grace consumption, grief pause, repair eligibility
- [ ] Backend test passes against all cases
- [ ] Frontend test passes against all cases
- [ ] Adding a new case to the JSON file requires no code changes — both tests pick it up automatically
- [ ] Both tests fail loudly if implementations diverge

### Spec 2.9 — Phase 2 Cutover

- **ID:** `round3-phase02-spec09-phase2-cutover`
- **Size:** S
- **Risk:** Medium
- **Prerequisites:** 2.8
- **Goal:** Flip `VITE_USE_BACKEND_ACTIVITY` default to `true`. Smoke-test in local dev. Verify dual-write works for real activities. Update CLAUDE.md if anything changed.

**Approach:** Update `.env.example` and `frontend/vite.config.ts` defaults. Run the app locally with the backend. Tap Pray on a Prayer Wall card. Verify the localStorage `wr_faith_points` updated AND the backend `activity_log` table received a new row AND `faith_points` table updated. Repeat for journal, meditate, bible, music. Update `_plans/forums-wave/phase02-cutover-checklist.md`.

**Acceptance criteria:**

- [ ] Flag default is `true` in `.env.example` and Vite config
- [ ] Manual smoke test: tap Pray, verify dual-write
- [ ] Backend `activity_log` table has rows after smoke test
- [ ] Backend `faith_points` table reflects accumulated points
- [ ] Backend `streak_state` table reflects current streak
- [ ] Cutover checklist completed and committed
- [ ] Universal Rule 17 per-phase accessibility smoke test passes: axe-core automated scan on routes and components introduced or modified in this phase returns zero CRITICAL violations; keyboard-only navigation walkthrough of this phase's primary user flows completes without dead-ends; VoiceOver spot-check on the 2-3 most complex interactions introduced in this phase completes without blocking issues; evidence committed to `_cutover-evidence/phase2-a11y-smoke.json` (axe-core report) plus a brief markdown note recording keyboard and VoiceOver outcomes

---

### Spec 2.10 — Historical Activity Backfill

- **ID:** `round3-phase02-spec10-historical-activity-backfill`
- **Size:** M
- **Risk:** Medium (touches users' existing localStorage history; read-only-from-localStorage is safe, but we must get the write side right on the backend)
- **Prerequisites:** 2.9 (Phase 2 cutover)
- **Goal:** On the first dual-write after a user's Phase 2 cutover, backfill their existing localStorage activity history (`wr_daily_activities`, `wr_faith_points`, `wr_streak`, `wr_badges`, `wr_streak_repairs`) into the backend shadow tables (`activity_log`, `faith_points`, `streak_state`, `user_badges`, `activity_counts`). Without this, every user who had points/streaks/badges before Phase 2 landed would appear "fresh" in the backend, and any future wave that promotes backend-as-source-of-truth would silently discard the pre-migration activity. A one-time backfill closes that door cleanly.

**Approach:** New idempotent endpoint `POST /api/v1/activity/backfill` that accepts the full localStorage activity payload from the frontend and writes it to the shadow tables. The frontend sends the backfill exactly once per user (tracked via `wr_activity_backfill_completed` localStorage boolean). If the backfill is interrupted mid-flight, re-running it is safe — the endpoint uses idempotent upserts keyed on (user_id, occurred_at, activity_type) for `activity_log`, (user_id) for the singleton tables, and (user_id, badge_id) for `user_badges`.

**Frontend flow (fires once, automatically):**

1. On first successful dual-write after `VITE_USE_BACKEND_ACTIVITY` cutover, check `localStorage['wr_activity_backfill_completed']`.
2. If absent or `false`: collect all activity-related localStorage (`wr_daily_activities`, `wr_faith_points`, `wr_streak`, `wr_badges`, `wr_streak_repairs`, `wr_activity_counts`), serialize into a single payload, POST to `/api/v1/activity/backfill`.
3. On 200 response, set `wr_activity_backfill_completed = 'true'`.
4. On 4xx/5xx: log to console, leave the flag unset so the next dual-write retries. No user-facing error — this is silent maintenance.
5. On subsequent dual-writes: flag is set, skip.

**Backend flow:**

1. Validate the payload shape (reject malformed JSON with 400).
2. In a single transaction, upsert each activity type:
   - `activity_log`: for each historical activity entry, INSERT ON CONFLICT DO NOTHING on `(user_id, occurred_at, activity_type, source_feature)` composite unique key (added in a small supplementary changeset as part of this spec).
   - `faith_points`: UPSERT on `user_id`, taking `MAX(existing.total_points, incoming.total_points)` — never decrease a user's total points, even if localStorage somehow has less than the backend already recorded.
   - `streak_state`: UPSERT on `user_id`, taking `MAX(existing.longest_streak, incoming.longest_streak)`; `current_streak` is taken from incoming (localStorage is source of truth for reads during this wave); `last_active_date` is taken as the MAX of the two.
   - `user_badges`: INSERT ON CONFLICT DO NOTHING on `(user_id, badge_id)`. Preserves the `earned_at` timestamp from localStorage.
   - `activity_counts`: UPSERT each count_type, taking `MAX(existing.count_value, incoming.count_value)`.
3. Return `{ data: { activities_backfilled: N, badges_backfilled: N, final_total_points: N, ...}, meta: { requestId } }`.

**Why MAX-based upserts everywhere:** During dual-write mode, the backend may have received some writes before the backfill runs (e.g., a user taps Pray, dual-write fires, then on the next page load the backfill runs). Taking the MAX ensures the backfill never erases progress. The one asymmetry is `current_streak`, which MUST take the incoming value (localStorage is the source of truth for reads during this wave per Decision 5); if the MAX rule applied to current_streak, a stale backend value could override correct local state.

**Data volume expectations:** A heavy user at Phase 2 cutover has approximately: ~365 activity_log entries (one per day for a year), ~20 user_badges, ~5 activity_counts, singleton faith_points and streak_state rows. Backfill payload: ~50 KB uncompressed JSON. Endpoint handles 10x that (500 KB) without issues; larger payloads return `413 PAYLOAD_TOO_LARGE` with guidance to contact support (expected to never happen in practice).

**Rate limiting:** `/api/v1/activity/backfill` is rate-limited to 3 calls per user per hour (the endpoint should only ever be called once successfully; retries after failure are the only legitimate repeat use).

**Files to create:**

- `backend/src/main/java/com/worshiproom/activity/BackfillController.java`
- `backend/src/main/java/com/worshiproom/activity/BackfillService.java`
- `backend/src/main/java/com/worshiproom/activity/dto/BackfillRequest.java`
- `backend/src/main/java/com/worshiproom/activity/dto/BackfillResponse.java`
- `backend/src/main/resources/db/changelog/2026-04-18-001-add-activity-log-unique-key.xml` (adds the composite unique key enabling idempotent backfill)
- `backend/src/test/java/com/worshiproom/activity/BackfillIntegrationTest.java`
- `frontend/src/services/api/activityBackfill.ts`
- `frontend/src/services/api/__tests__/activityBackfill.test.ts`

**Files to modify:**

- `frontend/src/services/activity-recorder.ts` (or equivalent) — on first successful dual-write, trigger the one-shot backfill
- `.claude/rules/11-local-storage-keys.md` — document new `wr_activity_backfill_completed` key

**Database changes:**

- Liquibase changeset: `db/changelog/2026-04-18-001-add-activity-log-unique-key.xml`
- Adds `UNIQUE (user_id, occurred_at, activity_type, source_feature)` to `activity_log` (supports `ON CONFLICT DO NOTHING`)
- Rollback: DROP CONSTRAINT (safe; no data loss)

**API changes:**

- New endpoint: `POST /api/v1/activity/backfill` (authenticated, rate-limited 3/hour)
- OpenAPI spec: add `BackfillRequest`, `BackfillResponse` schemas + endpoint

**Copy Deck:**

No user-facing copy — this is silent background maintenance. The UI MUST NOT surface backfill progress or completion to the user. If the backfill fails, the next dual-write retries; the user sees no "syncing" message at any point. Celebrations, points, and streaks continue to render from localStorage exactly as before.

**Anti-Pressure Copy Checklist:** N/A — no user-facing copy

**Anti-Pressure Design Decisions:**

- No "syncing your data" banner or spinner (silent)
- No "your account is now upgraded" notification (silent)
- No loss of celebrations or streaks during backfill (localStorage still the source of truth for reads)
- No forced logout/re-login to trigger backfill (fires automatically in the background)

**Acceptance criteria:**

- [ ] Backfill endpoint accepts full payload and upserts all five activity-related tables in one transaction
- [ ] MAX-based upsert on faith_points never decreases a user's total (integration test with backend having higher value than incoming)
- [ ] current_streak takes incoming value; longest_streak takes MAX
- [ ] activity_log composite unique key prevents duplicate entries on re-run (idempotency verified by running backfill twice and asserting row count unchanged)
- [ ] user_badges INSERT ON CONFLICT DO NOTHING preserves original earned_at timestamps
- [ ] Frontend triggers backfill on first post-cutover dual-write; sets `wr_activity_backfill_completed` on success
- [ ] Frontend skips backfill on subsequent dual-writes when flag is set
- [ ] Backfill failure does NOT set the flag (next dual-write retries)
- [ ] Backfill failure is silent to the user (console log only)
- [ ] Rate limit: 4th backfill call within 1 hour returns 429
- [ ] Payload > 512 KB returns 413 with structured error
- [ ] Anonymous / logged-out state: backfill is never called (no user ID)
- [ ] At least 14 integration tests covering all MAX-upsert edge cases, idempotency, rate limiting, failure modes
- [ ] At least 4 frontend tests covering the flag logic and retry-on-failure behavior

**Testing notes:**

- Integration tests use Testcontainers, pre-seed backend state, send a backfill payload, verify final state
- Edge case test: backend has 100 points, incoming has 50 points → final is 100 (MAX preserves progress)
- Edge case test: backend has badge X earned_at = 2025-01-01, incoming has badge X earned_at = 2024-06-01 → final earned_at is 2024-06-01 (preserve earlier timestamp)
- Idempotency test: run backfill twice in quick succession, assert activity_log rows = expected count (not 2x)

**Notes for plan phase recon:**

1. Confirm the exact localStorage shapes to serialize — run through each key and verify no schema drift from earlier specs
2. Identify whether any user has localStorage from before the `wr_daily_activities` format stabilized (if so, add a migration/normalization step in the frontend before sending)
3. Verify the rate limiter's default scope works for the `/backfill` endpoint or needs a dedicated bucket

**Out of scope:**

- Backfilling data for Prayer Wall, Friends, or other domains (those have their own backfill flows in later phases — Phase 2.5 for friends, Phase 3 for Prayer Wall)
- Retroactive badge computation (if a user's history would have earned an unearned badge under current rules, we do NOT grant it during backfill — badges are earned in the moment, not recomputed)
- Cross-device merge semantics (user has localStorage on two devices with different histories — this wave treats each device independently; the first backfill wins, subsequent dual-writes accumulate normally)

**Out-of-band notes for Eric:** The cross-device-merge limitation is worth understanding. If you use Worship Room on a laptop and a phone, and both have independent localStorage histories pre-cutover, only the first device's backfill will fully seed the backend. The second device's subsequent dual-writes will accumulate into the backend alongside the first device's history, but the second device's _pre-cutover_ localStorage activity stays local-only. This is acceptable for Phase 2 because reads remain from localStorage during this wave; when a future wave promotes backend-as-source-of-truth, we'll address multi-device merge then (likely via a "merge my history" prompt in settings). Document this as a known limitation in the cutover checklist.

---

## Phase 2.5 — Friends Backend Migration

> **Phase purpose:** Migrate the friends system to the backend in dual-write mode. After this phase, friend requests, accepts, declines, blocks, and removes all dual-write to the backend. Phase 7's "friends pin to top of Prayer Wall feed" feature now has the cross-device data it needs.

**What this phase accomplishes:** At the end of Phase 2.5, the existing `wr_friends` localStorage continues to be the source of truth for reads, but every friend action also fires a background backend call. The backend has the schema and endpoints to support friend queries from any device. User search across the whole user base works. Block enforcement works server-side.

**Sequencing notes:** Sequential. Spec 2.5.1 lays the schema. Specs 2.5.2-2.5.4 build the backend. Spec 2.5.5 wires the frontend dual-write and is the cutover.

### Spec 2.5.1 — Friends Schema (Liquibase)

- **ID:** `round3-phase02-5-spec01-friends-schema`
- **Size:** S
- **Risk:** Low
- **Prerequisites:** Phase 2 complete
- **Goal:** Create `friend_relationships` and `friend_requests` tables per Decision 8.

**Approach:** Four changesets, landing all four Phase 2.5 shadow tables together so the Phase 12 notification taxonomy and Phase 13 analytics don't hit missing-table errors later:

- `2026-04-16-001-create-friend-relationships-table.xml`
- `2026-04-16-002-create-friend-requests-table.xml`
- `2026-04-16-003-create-social-interactions-table.xml`
- `2026-04-16-004-create-milestone-events-table.xml`

Friends tables match Decision 8 exactly. Foreign keys to `users.id`. Composite primary key on `friend_relationships`. Unique constraint on `(from_user_id, to_user_id)` in `friend_requests`. Indexes for the most common queries.

**Social interactions shadow table schema (per Decision 8):**

```sql
social_interactions
  id                    UUID PRIMARY KEY
  from_user_id          UUID NOT NULL REFERENCES users(id)
  to_user_id            UUID NOT NULL REFERENCES users(id)
  interaction_type      VARCHAR(20) NOT NULL
                        -- 'encouragement', 'nudge', 'recap_dismissal'
  payload               JSONB NULL
                        -- encouragement: { preset_message_id, preset_text }
                        -- nudge: { } (empty; nudges carry no extra payload)
                        -- recap_dismissal: { week_start_date }
  created_at            TIMESTAMP NOT NULL DEFAULT NOW()
```

Indexes on `(from_user_id, created_at DESC)` for rate-limit lookups (3 encouragements/friend/day, 1 nudge/friend/week) and `(to_user_id, created_at DESC)` for the recipient's inbox query.

**Milestone events shadow table schema (per Decision 8):**

```sql
milestone_events
  id                    UUID PRIMARY KEY
  user_id               UUID NOT NULL REFERENCES users(id)
  event_type            VARCHAR(40) NOT NULL
                        -- 'streak_milestone', 'level_up', 'badge_earned',
                        -- 'prayer_count_milestone', 'friend_milestone'
  event_metadata        JSONB NULL
                        -- e.g., { streak: 30 } or { badge_id: 'first-prayer' }
  occurred_at           TIMESTAMP NOT NULL DEFAULT NOW()
```

Index on `(user_id, occurred_at DESC)` for the user's own feed lookup. Index on `(occurred_at DESC)` for the cross-user weekly-recap aggregator (Phase 13).

**Why these two tables land now (not later):** Decision 8 explicitly specifies them as part of Phase 2.5's dual-write scope. The existing `social-interactions.md` spec owns `wr_social_interactions` and `wr_milestone_feed` localStorage keys; both need backend mirrors. Phase 12's notification generators (Spec 12.3) and Phase 13's personal analytics (Spec 13.1) assume these tables exist. Creating them in 2.5.1 prevents "table does not exist" errors when those later specs query them.

**Acceptance criteria:**

- [ ] All four tables created in dev database (`friend_relationships`, `friend_requests`, `social_interactions`, `milestone_events`)
- [ ] Foreign keys and unique constraints present on all four
- [ ] `psql \d friend_relationships`, `\d friend_requests`, `\d social_interactions`, `\d milestone_events` all show correct schemas
- [ ] LiquibaseSmokeTest extended to verify all four tables
- [ ] Testcontainers integration test confirms all four migrations apply cleanly in order
- [ ] `social_interactions.interaction_type` CHECK constraint allows only `'encouragement'`, `'nudge'`, `'recap_dismissal'`
- [ ] `milestone_events.event_type` CHECK constraint allows only the five documented event types
- [ ] Indexes exist on all documented query paths (rate-limit lookups, recipient inbox, per-user feed, cross-user weekly aggregator)
- [ ] Rollback blocks defined for all four changesets (simple DROP TABLE, safe because no prod data yet)

### Spec 2.5.2 — Friends Service and Repository

- **ID:** `round3-phase02-5-spec02-friends-service`
- **Size:** L
- **Risk:** Medium
- **Prerequisites:** 2.5.1
- **Goal:** Backend `FriendsService` with the operations needed: list friends, list requests, send request, accept, decline, cancel, remove, block, unblock, search users.

**Approach:** Implement the service with all operations from Decision 8. The mutual-friendship rule: accept inserts two rows into `friend_relationships`. Block inserts one row with `status='blocked'` (unidirectional). Pending request enforcement: cannot send a duplicate request (UNIQUE constraint catches this). Cannot send a request to an already-friend. Cannot send a request to a blocker (silently fails to avoid information leak). Search returns users matching a name prefix, excluding blocked users and the current user.

**Files to create:**

- `backend/src/main/java/com/worshiproom/friends/FriendsService.java`
- `backend/src/main/java/com/worshiproom/friends/FriendRelationshipRepository.java`
- `backend/src/main/java/com/worshiproom/friends/FriendRequestRepository.java`
- `backend/src/main/java/com/worshiproom/friends/dto/FriendDTO.java`
- `backend/src/main/java/com/worshiproom/friends/dto/FriendRequestDTO.java`
- `backend/src/test/java/com/worshiproom/friends/FriendsServiceTest.java`

**Acceptance criteria:**

- [ ] Send request creates one row in `friend_requests` with status `pending`
- [ ] Accept moves the request to status `accepted` and inserts two rows in `friend_relationships`
- [ ] Decline moves the request to status `declined` and inserts no relationship rows
- [ ] Cancel (by sender) moves the request to status `cancelled`
- [ ] Remove deletes both relationship rows
- [ ] Block inserts a `blocked` relationship row from blocker to blocked
- [ ] Block also removes any pending requests between the two users
- [ ] Search excludes blocked users (in either direction) and the current user
- [ ] Cannot send duplicate request (catches UNIQUE violation, returns 409)
- [ ] At least 25 integration tests cover all operations and edge cases

### Spec 2.5.3 — Friends API Endpoints

- **ID:** `round3-phase02-5-spec03-friends-endpoints`
- **Size:** L
- **Risk:** Medium
- **Prerequisites:** 2.5.2
- **Goal:** Implement all friends API endpoints from Decision 8.

**Approach:** `FriendsController` exposing:

- `GET /api/v1/users/me/friends`
- `GET /api/v1/users/me/friend-requests`
- `POST /api/v1/users/me/friend-requests` (body: `{ toUserId, message? }`)
- `PATCH /api/v1/friend-requests/{id}` (body: `{ action: 'accept' | 'decline' | 'cancel' }`)
- `DELETE /api/v1/users/me/friends/{friendId}`
- `POST /api/v1/users/me/blocks` (body: `{ userId }`)
- `DELETE /api/v1/users/me/blocks/{userId}`
- `GET /api/v1/users/search?q=name`

Auth required on all. OpenAPI spec updated. Generated frontend types updated.

**Acceptance criteria:**

- [ ] All endpoints implemented and authenticated
- [ ] All endpoints return responses matching `.claude/rules/03-backend-standards.md` shape
- [ ] OpenAPI spec includes all endpoints
- [ ] Frontend types regenerated
- [ ] Rate limiting in place per project standards
- [ ] At least 20 integration tests cover happy paths and error cases

### Spec 2.5.4 — Frontend Friends Dual-Write

- **ID:** `round3-phase02-5-spec04-frontend-friends-dual-write`
- **Size:** L
- **Risk:** Medium
- **Prerequisites:** 2.5.3
- **Goal:** Update the existing `useFriends` hook (or wherever friend operations live) to dual-write. localStorage primary, backend shadow.

**Approach:** Recon identifies the current friends storage layer. Wrap each mutation (sendRequest, acceptRequest, declineRequest, removeFriend, blockUser, etc.) to fire-and-forget the backend call after the localStorage write. Reads continue to come from localStorage. New env flag `VITE_USE_BACKEND_FRIENDS` defaults `false` until the next spec flips it.

**Files to modify:**

- `frontend/src/hooks/useFriends.ts` (or equivalent)
- `frontend/src/services/social-storage.ts` (or equivalent)
- `frontend/.env.example`

**Acceptance criteria:**

- [ ] All friend mutations dual-write when flag is on
- [ ] All friend mutations behave as before when flag is off
- [ ] Backend errors are logged but do not break the UI
- [ ] At least 8 tests cover both flag states

### Spec 2.5.4b — Social Interactions and Milestone Events Dual-Write Pipeline

- **ID:** `round3-phase02-5-spec04b-social-milestone-dual-write`
- **Size:** M
- **Risk:** Medium (dual-write pipeline with blast-radius-minimization — any backend failure must not affect localStorage-backed UX)
- **Prerequisites:** 2.5.1, 2.5.4
- **Goal:** Extend the dual-write pattern established in Spec 2.5.4 (friends) to cover the two remaining Decision 8 shadow tables: `social_interactions` (encouragements, nudges, recap dismissals) and `milestone_events` (streak milestones, level-ups, badge earns, prayer-count milestones, friend milestones). Without this spec, the tables land via 2.5.1 but sit permanently empty because no spec writes to them — which defeats the entire purpose of dual-write as "backend gets populated as a shadow copy future waves can promote to source of truth." Phase 12 notification generators and Phase 13 personal analytics both assume these tables have data.

**Approach:** Thin write-only backend service (no read endpoints needed during this wave — localStorage remains source of truth for reads), POST endpoints for the two write paths, frontend dual-write extension added alongside 2.5.4's friends dual-write. New env flag `VITE_USE_BACKEND_SOCIAL` defaults `false` until 2.5.5 flips it. Same fire-and-forget pattern as friends: localStorage write first (user sees immediate UX), backend shadow-write fires asynchronously, failures log to console but do not propagate to user. Identical blast-radius discipline as Decision 5's activity engine dual-write.

**The two write paths:**

**Social interactions write path:**

Any frontend action that writes to `wr_social_interactions` fires a parallel `POST /api/v1/social-interactions` with the interaction payload. The existing `social-interactions.md` spec defines three interaction types: `encouragement` (sent via preset messages, 3/friend/day rate limit), `nudge` (sent when friend is ≥3 days inactive, 1/friend/week rate limit), `recap_dismissal` (user tapped "dismiss" on the weekly recap card). Each maps to a row in `social_interactions` with the matching `interaction_type`. Rate limits are enforced CLIENT-SIDE (existing behavior from social-interactions.md); backend validation is a belt-and-suspenders redundant check that logs a warning if client-side enforcement missed but does NOT reject the write (avoids dual-write failures on rate-limit edge cases).

**Milestone events write path:**

The existing activity engine (Phase 2) computes milestone events in its completion handlers — when a streak hits 7/30/100 days, when level threshold crosses, when a new badge is earned, when prayer count hits a round number, when a friend hits a milestone. Each existing milestone computation fires a parallel `POST /api/v1/milestone-events` with the event type and metadata. Events are write-once (no mutation, no delete from this wave; garbage collection is a future-wave concern). No rate limits — milestones are legitimately infrequent.

**Files to create:**

- `backend/src/main/java/com/worshiproom/social/SocialInteractionsController.java`
- `backend/src/main/java/com/worshiproom/social/SocialInteractionsService.java`
- `backend/src/main/java/com/worshiproom/social/SocialInteractionRepository.java`
- `backend/src/main/java/com/worshiproom/social/dto/SocialInteractionRequest.java`
- `backend/src/main/java/com/worshiproom/social/MilestoneEventsController.java`
- `backend/src/main/java/com/worshiproom/social/MilestoneEventsService.java`
- `backend/src/main/java/com/worshiproom/social/MilestoneEventRepository.java`
- `backend/src/main/java/com/worshiproom/social/dto/MilestoneEventRequest.java`
- `backend/src/test/java/com/worshiproom/social/SocialInteractionsIntegrationTest.java`
- `backend/src/test/java/com/worshiproom/social/MilestoneEventsIntegrationTest.java`

**Files to modify:**

- `frontend/src/hooks/useSocialInteractions.ts` (or wherever existing social-interactions.md logic lives — recon determines) — wrap existing localStorage write mutations with fire-and-forget backend POST
- `frontend/src/services/activity-engine.ts` (or wherever milestone computation lives) — after each milestone emission, fire parallel POST to backend
- `frontend/.env.example` — add `VITE_USE_BACKEND_SOCIAL=false` default
- OpenAPI spec — document both new endpoint pairs
- Frontend generated types regenerated

**Database changes:** None (tables were created in Spec 2.5.1; this spec only adds write paths)

**API changes:**

- `POST /api/v1/social-interactions` — body `{ to_user_id, interaction_type, payload? }`. Auth required. Rate-limited at the read-limit default (100/minute authed) to prevent abuse, not at the anti-spam limit (that's client-enforced per the inherited spec). Returns 201 with `{ id, created_at }`.
- `POST /api/v1/milestone-events` — body `{ event_type, event_metadata? }`. Auth required. `user_id` derived from JWT (user can only write their own milestones). Returns 201. Duplicate-prevention: server checks for identical `(user_id, event_type, event_metadata)` in last 60 seconds and returns 200 with existing row (idempotent for retry safety).

**Copy Deck:** None (infrastructure only; no user-facing strings)

**Anti-Pressure Copy Checklist:** N/A (no user-facing copy)

**Anti-Pressure Design Decisions:**

- Fire-and-forget pattern: backend failures NEVER affect user's localStorage-driven UX
- No server-side rate limit stricter than read defaults (client is the rate-limit authority for these interactions)
- Duplicate-prevention on milestones is 60-second idempotency window (handles retry-on-flaky-network without rejecting legitimate double milestones)
- No server-side enrichment of interaction payloads (server stores what client sends; no backend-derived "helpful" fields that could drift)

**Acceptance criteria:**

- [ ] `POST /api/v1/social-interactions` accepts all three interaction_types
- [ ] Invalid interaction_type returns 400 INVALID_INPUT
- [ ] Request attempting to write interaction on behalf of another user (from_user_id != JWT subject) returns 403
- [ ] `POST /api/v1/milestone-events` accepts all five documented event_types
- [ ] Milestone duplicate-prevention 60-second idempotency window verified (same event twice within 60s returns same row ID)
- [ ] `VITE_USE_BACKEND_SOCIAL=false` → no backend calls fired from frontend social/milestone paths (verified via MSW network intercept test)
- [ ] `VITE_USE_BACKEND_SOCIAL=true` → every localStorage write triggers a parallel backend POST
- [ ] Backend failure (simulated 500 response) is logged to console but does NOT affect localStorage write or user-visible state
- [ ] Backend timeout (simulated slow response) does NOT block the user's next action
- [ ] Rate-limit headers present on 200/201 responses (X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset)
- [ ] `social_interactions` row contains correct `from_user_id`, `to_user_id`, `interaction_type`, `payload`, `created_at`
- [ ] `milestone_events` row contains correct `user_id`, `event_type`, `event_metadata`, `occurred_at`
- [ ] Testcontainers integration tests verify round-trip for all three interaction types and all five event types
- [ ] Existing frontend behavior unchanged when flag is off (regression-tested against 2.5.4 behavior)
- [ ] No reads from these tables in this spec (reads remain on localStorage)
- [ ] At least 18 tests covering happy paths, auth gates, rate-limit headers, duplicate prevention, graceful-failure

**Testing notes:**

- Integration test: write an encouragement, verify row in `social_interactions` with correct `from_user_id`
- Integration test: write a milestone_event, write same again within 60s, verify idempotency (same ID returned)
- Integration test: write a milestone_event, write same again after 61s, verify new row created
- Unit test: fire-and-forget discipline — simulate backend 500, verify `console.error` logged but no user-facing error
- Playwright: with flag on, send an encouragement via UI, verify network tab shows POST to social-interactions endpoint
- Playwright: with flag off, send an encouragement via UI, verify network tab shows NO call to the new endpoints

**Notes for plan phase recon:**

1. Identify the exact existing function(s) in `social-interactions.md`-owned code that write to `wr_social_interactions` — this spec wraps each of them
2. Identify the exact existing function(s) that emit milestone events — the activity engine's badge/level/streak completion handlers
3. Confirm the 60-second idempotency window is reasonable for milestone events (can be tuned to 30s or 120s based on real-world retry patterns observed during Phase 2 activity migration)
4. Verify the `social_interactions.payload` JSONB shape matches what the frontend already stores in `wr_social_interactions` (if there's drift, this spec must normalize — NOT by changing the localStorage shape, but by adapting in the backend dto mapping)
5. Confirm milestone events from the existing `streak-faith-points-engine.md` and `streak-repair-grace.md` specs all fire through the same entry point that we're instrumenting (if there are multiple emission paths, all need dual-write)

**Out of scope:**

- Read endpoints for these tables (future-wave concern when migrating source-of-truth away from localStorage)
- Backfill from existing localStorage data (not needed for shadow-write; future promotion spec will handle)
- Notifications triggered by these writes (Phase 12.3 handles notification generation from these events)
- Analytics queries on these tables (Phase 13.1 insights endpoint consumes them)
- Per-interaction-type CREATE-TABLE audit log (admin audit log handles any future privileged action context)
- Retroactive milestone generation for pre-existing users (intentional — backend only records milestones earned from cutover forward)

**Out-of-band notes for Eric:** This spec is the plumbing that makes Decision 8's shadow-table promise real. It's small-scope (write-only, no UI changes, no user-facing behavior) but load-bearing for Phase 12 and 13. If anyone later asks "why do we dual-write these tables if we never read from them during the wave?", the answer is: because Phase 12 and 13 query them as source-of-truth from day one, and we're pre-populating during Phase 2.5 so those later queries don't return empty results for users who were active during Phase 2.5 → Phase 12 gap. Also: resist the urge to add read endpoints here. The whole point of dual-write is that reads stay on localStorage. A read endpoint on these tables would be consumed by someone and create a drift risk we explicitly avoided.

---

### Spec 2.5.5 — Phase 2.5 Cutover

- **ID:** `round3-phase02-5-spec05-phase2-5-cutover`
- **Size:** S
- **Risk:** Medium
- **Prerequisites:** 2.5.4, 2.5.4b
- **Goal:** Flip `VITE_USE_BACKEND_FRIENDS` and `VITE_USE_BACKEND_SOCIAL` to `true`. Smoke test all three dual-write pipelines (friends, social interactions, milestone events) end-to-end with seed users. Verify that each of the four Phase 2.5 shadow tables is receiving writes correctly.

**Approach:** Set both env-var flag defaults to `true`. Local smoke test covers three distinct pipelines:

1. **Friends pipeline (from original 2.5 scope):** Log in as seed user A, send a friend request to seed user B. Log out, log in as B, accept the request. Verify `wr_friends` localStorage AND `friend_relationships` / `friend_requests` backend tables both reflect the friendship.

2. **Social interactions pipeline:** As user A, send an encouragement preset message to user B. Verify `wr_social_interactions` AND `social_interactions` backend table both have the row with `interaction_type='encouragement'`. As user A, wait until user B has been inactive ≥3 days (or force-seed inactivity in the test user's metadata), then send a nudge. Verify similar dual-presence.

3. **Milestone events pipeline:** As user A, perform an activity that crosses a milestone threshold (e.g., complete a prayer action that takes streak to 7 days — pre-seed streak to 6 days). Verify the milestone event appears in BOTH `wr_milestone_feed` (or equivalent localStorage key) AND `milestone_events` backend table.

Cutover checklist at `_plans/forums-wave/phase02-5-cutover-checklist.md` covers all three pipelines plus the per-phase accessibility smoke test.

**Acceptance criteria:**

- [ ] `VITE_USE_BACKEND_FRIENDS` flag default is `true`
- [ ] `VITE_USE_BACKEND_SOCIAL` flag default is `true`
- [ ] Manual smoke test of friends pipeline passes
- [ ] Manual smoke test of social interactions pipeline passes (both encouragement and nudge)
- [ ] Manual smoke test of milestone events pipeline passes
- [ ] Backend `friend_relationships` reflects the friendship after friends smoke test
- [ ] Backend `friend_requests` reflects the request history after friends smoke test
- [ ] Backend `social_interactions` contains the encouragement and nudge rows after social smoke test
- [ ] Backend `milestone_events` contains the streak milestone row after milestone smoke test
- [ ] Cutover checklist committed at `_plans/forums-wave/phase02-5-cutover-checklist.md`
- [ ] No regressions in existing localStorage-driven UX (friends list, social feed, milestone celebrations all still work identically to before the cutover)
- [ ] Backend failure simulation (disable backend for 60 seconds during a user action) does NOT break the user-visible UX
- [ ] Universal Rule 17 per-phase accessibility smoke test passes: axe-core automated scan on friends pages, settings email preferences, and any new UI surfaces from Phase 2.5 returns zero CRITICAL violations; keyboard-only navigation walkthrough of friend request → accept → remove flow completes without dead-ends; VoiceOver spot-check on the friend request modal and the encouragement preset picker completes without blocking issues; evidence committed to `_cutover-evidence/phase2-5-a11y-smoke.json` (axe-core report) plus a brief markdown note recording keyboard and VoiceOver outcomes

---

## Phase 3 — Prayer Wall Data Migration

> **Phase purpose:** Migrate Prayer Wall data (posts, comments, reactions, bookmarks, reports, QOTD) to the backend. Frontend services swap from localStorage to API calls. The reaction bug (already partially fixed in Phase 0.5 for cross-page consistency) is now fixed for cross-device consistency. After this phase, Eric can post a prayer on his laptop and see it on his phone.

**What this phase accomplishes:** At the end of Phase 3, the entire Prayer Wall surface area reads from the backend. Posts persist across devices. Reactions sync. Comments sync. Bookmarks sync. Reports go to the backend moderation queue (which Phase 10 builds out further). The QOTD rotation logic moves to the backend. Mock data is preserved as a one-time seed so the demo still works for new local installs. The 4 Prayer Wall pages and 22 components from Decision 16 are wired through the new API. The `usePrayerReactions` reactive store from Phase 0.5 swaps its localStorage adapter for an API adapter without touching consumer components.

**Sequencing notes:** Specs 3.1-3.4 build the schema and read endpoints. Specs 3.5-3.8 build the write endpoints. Spec 3.9 migrates QOTD. Spec 3.10 wires the frontend services. Spec 3.11 swaps the reactive store. Spec 3.12 is the cutover. Read endpoints come before write endpoints per Decision 13.

**Phase-level definition of done:**

- All Prayer Wall tables exist (`posts`, `post_comments`, `post_reactions`, `post_bookmarks`, `post_reports`, `qotd_questions`)
- One-time seed migration ports the existing mock data into the database for local dev
- All Prayer Wall read endpoints exist with pagination, filtering, and the `{data, meta}` shape
- All Prayer Wall write endpoints exist with rate limiting and crisis detection
- QOTD rotation logic on backend; frontend reads "today's question" from the API
- Frontend services swap to API implementations behind `VITE_USE_BACKEND_PRAYER_WALL` flag
- `usePrayerReactions` reactive store backend adapter swapped in (transparent to consumer components)
- All 4 Prayer Wall pages work end-to-end against the backend
- Cross-device sync verified: post on laptop appears on phone after refresh
- Phase 3 cutover spec flips the flag default to `true`

### Spec 3.1 — Prayer Wall Schema (Liquibase)

- **ID:** `round3-phase03-spec01-prayer-wall-schema`
- **Size:** L
- **Risk:** Medium (foundational schema for the whole phase)
- **Prerequisites:** Phase 2.5 complete
- **Goal:** Create the unified `posts` table plus `post_comments`, `post_reactions`, `post_bookmarks`, `post_reports`, `qotd_questions` tables per Decision 4. Multiple changesets, one per table. Acknowledge the deliberate divergence from `prayer-wall-redesign.md`'s older table names in the spec preamble so reviewers do not flag it as a contradiction.

**Approach:** Six changesets:

- `2026-04-17-001-create-posts-table.xml`
- `2026-04-17-002-create-post-comments-table.xml`
- `2026-04-17-003-create-post-reactions-table.xml`
- `2026-04-17-004-create-post-bookmarks-table.xml`
- `2026-04-17-005-create-post-reports-table.xml`
- `2026-04-17-006-create-qotd-questions-table.xml`

The `posts` table matches Decision 4 exactly: `id`, `user_id`, `post_type`, `content`, `category`, `is_anonymous`, type-specific nullables, visibility, lifecycle, moderation, soft delete, denormalized counters. CHECK constraints enforce the `post_type` and `category` enums at the database level. The `post_comments` table includes a nullable `parent_comment_id` for Phase 4's threaded discussion reply support — adding it now avoids a future migration. The `post_reactions` table is keyed on `(post_id, user_id, reaction_type)` so future reaction types beyond praying do not require schema changes. `post_bookmarks` is keyed on `(post_id, user_id)`. `post_reports` includes `reason`, `details`, `status`, `reviewer_id`, `reviewed_at`. `qotd_questions` holds the 60 questions with `id`, `text`, `theme`, `hint`, `display_order` for deterministic rotation.

**Schema details for `post_comments`:**

```sql
post_comments
  id                  UUID PRIMARY KEY
  post_id             UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE
  user_id             UUID NOT NULL REFERENCES users(id)
  parent_comment_id   UUID NULL REFERENCES post_comments(id)
  content             TEXT NOT NULL
  is_helpful          BOOLEAN NOT NULL DEFAULT FALSE  -- "this helped" marker for Question post type
  is_deleted          BOOLEAN NOT NULL DEFAULT FALSE
  deleted_at          TIMESTAMP NULL
  moderation_status   VARCHAR(20) NOT NULL DEFAULT 'approved'
  crisis_flag         BOOLEAN NOT NULL DEFAULT FALSE
  created_at          TIMESTAMP NOT NULL DEFAULT NOW()
  updated_at          TIMESTAMP NOT NULL DEFAULT NOW()
```

**Schema details for `post_reactions`:**

```sql
post_reactions
  post_id        UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
  reaction_type  VARCHAR(30) NOT NULL DEFAULT 'praying'
                 -- 'praying', and future types reserved
  created_at     TIMESTAMP NOT NULL DEFAULT NOW()
  PRIMARY KEY (post_id, user_id, reaction_type)
```

**Schema details for `post_bookmarks`:**

```sql
post_bookmarks
  post_id     UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
  created_at  TIMESTAMP NOT NULL DEFAULT NOW()
  PRIMARY KEY (post_id, user_id)
```

**Schema details for `post_reports`:**

```sql
post_reports
  id              UUID PRIMARY KEY
  post_id         UUID NULL REFERENCES posts(id)
  comment_id      UUID NULL REFERENCES post_comments(id)
  reporter_id     UUID NOT NULL REFERENCES users(id)
  reason          VARCHAR(50) NOT NULL
                  -- 'spam', 'harmful', 'inappropriate', 'crisis', 'other'
  details         TEXT NULL
  status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                  -- 'pending', 'reviewed', 'actioned', 'dismissed'
  reviewer_id     UUID NULL REFERENCES users(id)
  reviewed_at     TIMESTAMP NULL
  action_taken    VARCHAR(50) NULL
                  -- 'no_action', 'hidden', 'removed', 'user_warned', 'user_banned'
  created_at      TIMESTAMP NOT NULL DEFAULT NOW()
  CHECK (post_id IS NOT NULL OR comment_id IS NOT NULL)
```

**Schema details for `qotd_questions`:**

```sql
qotd_questions
  id            VARCHAR(50) PRIMARY KEY
                -- e.g., 'qotd-faith-001'
  text          TEXT NOT NULL
  theme         VARCHAR(30) NOT NULL
                -- 'faith_journey', 'practical', 'reflective', 'encouraging', 'community', 'seasonal'
  hint          TEXT NULL
  display_order INTEGER NOT NULL UNIQUE
                -- 0-59, controls deterministic day-of-year rotation
  is_active     BOOLEAN NOT NULL DEFAULT TRUE
  created_at    TIMESTAMP NOT NULL DEFAULT NOW()
```

**Indexes:** All from Decision 4 plus `(post_comments.post_id, created_at)` for comment listing, `(post_reports.status)` for moderation queue, `(post_bookmarks.user_id)` for "my bookmarks" tab.

**Acceptance criteria:**

- [ ] All six tables created in dev database
- [ ] CHECK constraints reject invalid `post_type` and `category` values
- [ ] Foreign keys cascade correctly
- [ ] All indexes from Decision 4 are present
- [ ] LiquibaseSmokeTest extended to verify all six tables
- [ ] Testcontainers integration test confirms migrations
- [ ] Each changeset has a valid rollback block
- [ ] The spec preamble explicitly notes the divergence from `prayer-wall-redesign.md`'s older table names

### Spec 3.2 — Mock Data Seed Migration

- **ID:** `round3-phase03-spec02-mock-data-seed`
- **Size:** M
- **Risk:** Low
- **Prerequisites:** 3.1
- **Goal:** Port the existing `frontend/src/mocks/prayer-wall-mock-data.ts` data (10 users, 18 prayers, 35 comments, 6 reactions) into a Liquibase dev-context seed changeset. Local installs continue to have a populated Prayer Wall demo experience without manual setup.

**Approach:** Read `frontend/src/mocks/prayer-wall-mock-data.ts` carefully. Generate a Liquibase XML seed changeset that inserts the equivalent data into the `users`, `posts`, `post_comments`, `post_reactions`, `post_bookmarks`, and `qotd_questions` tables. Use the same UUIDs and timestamps from the mock data so the seed is deterministic. Hash the seed users' passwords with BCrypt (use a known dev password documented in README). Mark the changeset with `context="dev"` so it only runs in development. Update the existing dev-seed master include to import the new changeset.

**Files to create:**

- `backend/src/main/resources/db/changelog/contexts/2026-04-17-001-prayer-wall-mock-seed.xml`

**Files to modify:**

- `backend/src/main/resources/db/changelog/contexts/dev-seed.xml` (include the new mock seed)
- `backend/README.md` (document seed user credentials and prayer wall demo data)

**Acceptance criteria:**

- [ ] All 10 mock users exist in dev database after migration
- [ ] All 18 mock prayers exist with correct categories, types, content, timestamps
- [ ] All 35 mock comments exist linked to the right prayers
- [ ] All 6 mock reactions exist for the seed user
- [ ] All 60 QOTD questions seeded with deterministic display_order
- [ ] Test context does NOT load the mock seed (only `dev` context does)
- [ ] Production context does NOT load the mock seed
- [ ] Seed users are loginable via documented credentials
- [ ] Wiping the dev database (`docker compose down -v`) and restarting reapplies the seed

**Out-of-band notes for Eric:** This is the bridge between "demo mode works locally" and "real backend data." The mock data lives in two places now (frontend file + backend seed). They will drift over time — that is acceptable because the frontend file becomes irrelevant once the backend is the source of truth. After Phase 3 cutover, the frontend mock file is deprecated but not deleted (kept for offline demos and tests).

### Spec 3.3 — Posts Read Endpoints

- **ID:** `round3-phase03-spec03-posts-read-endpoints`
- **Size:** L
- **Risk:** Medium
- **Prerequisites:** 3.2
- **Goal:** Implement `GET /api/v1/posts` (paginated feed with filters), `GET /api/v1/posts/{id}` (single post detail), `GET /api/v1/users/{username}/posts` (author feed). All return `PostResponse` DTOs with computed display name, anonymous handling, and reaction/comment/bookmark counts.

**Approach:** `PostController` and `PostService`. The feed endpoint accepts query params: `?category=`, `?postType=`, `?room=`, `?challengeId=`, `?qotdId=`, `?page=`, `?limit=`, `?sort=` (`recent` | `bumped` | `answered`). Returns paginated results with the standard `{data, meta}` shape. The detail endpoint returns a single post with all comments inlined (or paginated comments via a sub-query — recon decides based on typical comment counts). The author feed scopes to a single user's posts and respects visibility rules (`public` / `friends` / `private`). Anonymous posts return `displayName: "Anonymous"` and `avatarUrl: null` regardless of viewer.

**Visibility enforcement at the query layer:** A post with `visibility = 'private'` is only returned to the author. A post with `visibility = 'friends'` is only returned to the author and users who have an `active` row in `friend_relationships` from author to viewer. A post with `visibility = 'public'` is returned to anyone (including unauthenticated viewers). The query uses a left join on `friend_relationships` to enforce this in a single SQL statement.

**Files to create:**

- `backend/src/main/java/com/worshiproom/post/PostController.java`
- `backend/src/main/java/com/worshiproom/post/PostService.java`
- `backend/src/main/java/com/worshiproom/post/PostRepository.java` (Spring Data JPA + custom @Query methods)
- `backend/src/main/java/com/worshiproom/post/Post.java` (JPA entity)
- `backend/src/main/java/com/worshiproom/post/dto/PostResponse.java`
- `backend/src/main/java/com/worshiproom/post/dto/PostListResponse.java`
- `backend/src/main/java/com/worshiproom/post/PostMapper.java` (entity → DTO with visibility/anonymous handling)
- `backend/src/test/java/com/worshiproom/post/PostControllerIntegrationTest.java`

**Acceptance criteria:**

- [ ] `GET /api/v1/posts` returns paginated feed with `{data, meta}` shape
- [ ] Pagination defaults: `page=1`, `limit=20`, `max limit=50`
- [ ] `?category=health` filters to health posts only
- [ ] `?postType=prayer_request` filters to prayer requests only
- [ ] `?qotdId=qotd-faith-001` returns only QOTD responses for that question
- [ ] `?sort=bumped` sorts by `last_activity_at DESC`
- [ ] `?sort=recent` sorts by `created_at DESC`
- [ ] `?sort=answered` returns only `is_answered=true` posts sorted by `answered_at DESC`
- [ ] `GET /api/v1/posts/{id}` returns single post with comments inlined
- [ ] `GET /api/v1/users/{username}/posts` returns posts authored by that user
- [ ] Anonymous posts return `displayName: "Anonymous"` and `avatarUrl: null` for all viewers
- [ ] `visibility=private` posts only visible to author
- [ ] `visibility=friends` posts only visible to author and friends
- [ ] `visibility=public` posts visible to everyone (including unauthenticated)
- [ ] Soft-deleted posts (`is_deleted=true`) excluded from all feeds
- [ ] Hidden/removed posts (`moderation_status` in `('hidden', 'removed')`) excluded from public feeds
- [ ] OpenAPI spec includes all endpoints with full request/response schemas
- [ ] At least 30 integration tests cover happy paths, filtering, pagination, visibility, anonymous handling, soft delete, moderation state

### Spec 3.4 — Comments, Reactions, Bookmarks Read Endpoints

- **ID:** `round3-phase03-spec04-engagement-read-endpoints`
- **Size:** M
- **Risk:** Low
- **Prerequisites:** 3.3
- **Goal:** Implement `GET /api/v1/posts/{id}/comments`, `GET /api/v1/users/me/reactions`, `GET /api/v1/users/me/bookmarks`.

**Approach:** Three new endpoints on `PostController` (or a new `EngagementController` if cleaner). Comments endpoint returns paginated comments for a post sorted by `created_at ASC` (oldest first, the convention). Reactions endpoint returns the current user's praying-state for posts they have reacted to (used to hydrate the `wr_prayer_reactions` reactive store from the backend on first load). Bookmarks endpoint returns the current user's bookmarked posts as a paginated list of `PostResponse` (matching the dashboard Bookmarks tab).

**Acceptance criteria:**

- [ ] `GET /api/v1/posts/{id}/comments?page=1&limit=20` returns paginated comments
- [ ] Comments sorted by `created_at ASC`
- [ ] Threaded comments (with `parent_comment_id`) returned with the parent context
- [ ] `GET /api/v1/users/me/reactions` returns `{ reactions: { [postId]: { isPraying, isBookmarked } } }`
- [ ] `GET /api/v1/users/me/bookmarks` returns paginated bookmarked posts
- [ ] Soft-deleted comments excluded
- [ ] At least 15 integration tests

### Spec 3.5 — Posts Write Endpoints (Create, Update, Delete)

- **ID:** `round3-phase03-spec05-posts-write-endpoints`
- **Size:** XL
- **Risk:** High (security-critical, user-generated content)
- **Prerequisites:** 3.4
- **Goal:** Implement `POST /api/v1/posts`, `PATCH /api/v1/posts/{id}`, `DELETE /api/v1/posts/{id}`. Crisis detection on create. Rate limiting (5 prayer posts per day per user). Plain text only, defensive HTML stripping. Anonymous flag handled. Author ownership check for update/delete. Soft delete only.

**Approach:** Create endpoint validates body (`postType`, `content`, `category`, `isAnonymous`, optional `challengeId`, optional `qotdId`), runs backend crisis detection (LLM classifier per `.claude/rules/01-ai-safety.md`, fallback to keyword match), strips any `<...>` tags defensively, persists the post, increments `activity_counts` for the author, fires the activity event (which records faith points + streak + badges via the activity engine), returns the created post. If crisis detected, the post is created with `crisis_flag=true` and the response includes a `crisis_resources` field with hotline numbers (matching the existing frontend pattern). Update endpoint allows the author to extend expiry, mark answered, mark question as resolved, edit content within 5 minutes of creation. Delete endpoint is soft delete only — `is_deleted=true`, `deleted_at=NOW()`. Owner-only enforcement on update and delete. Rate limit: 5 posts per day per user across all post types combined.

**Files to create:**

- `backend/src/main/java/com/worshiproom/post/dto/CreatePostRequest.java`
- `backend/src/main/java/com/worshiproom/post/dto/UpdatePostRequest.java`
- `backend/src/main/java/com/worshiproom/post/dto/CreatePostResponse.java` (includes optional crisis_resources)
- `backend/src/main/java/com/worshiproom/safety/CrisisDetectionService.java`
- `backend/src/main/java/com/worshiproom/safety/CrisisKeywordMatcher.java` (fallback)
- `backend/src/test/java/com/worshiproom/post/PostWriteIntegrationTest.java`
- `backend/src/test/java/com/worshiproom/safety/CrisisDetectionServiceTest.java`

**Files to modify:**

- `backend/src/main/java/com/worshiproom/post/PostController.java` (add write methods)
- `backend/src/main/java/com/worshiproom/post/PostService.java` (add write logic)
- `backend/src/main/resources/application.properties` (rate limit config)

**Acceptance criteria:**

- [ ] `POST /api/v1/posts` creates a post with valid body and returns 201 with full PostResponse
- [ ] Invalid `postType` returns 400
- [ ] Invalid `category` returns 400
- [ ] Content over max length (configurable, default 2000 chars) returns 400
- [ ] Empty content returns 400
- [ ] `<script>` and other HTML tags stripped from content before storage
- [ ] Crisis detection runs on every create and sets `crisis_flag=true` when triggered
- [ ] Crisis-flagged posts are still created (NOT blocked) and the response includes `crisis_resources` field
- [ ] Rate limit: 6th post in 24 hours returns 429 with `Retry-After`
- [ ] Anonymous posts have `is_anonymous=true` and the displayName is masked in subsequent reads
- [ ] Activity engine integration: creating a post records a `prayer_wall` activity which earns points and updates streak
- [ ] `PATCH /api/v1/posts/{id}` requires author ownership (returns 403 otherwise)
- [ ] Edit window is 5 minutes from creation (after that, content is immutable)
- [ ] Marking answered sets `is_answered`, `answered_text`, `answered_at`
- [ ] `DELETE /api/v1/posts/{id}` soft-deletes (does not hard-delete)
- [ ] Soft-deleted posts return 404 from the read endpoints
- [ ] OpenAPI spec includes all endpoints
- [ ] At least 35 integration tests cover happy paths, validation, ownership, crisis detection, rate limiting, anonymous handling

### Spec 3.6 — Comments Write Endpoints

- **ID:** `round3-phase03-spec06-comments-write-endpoints`
- **Size:** L
- **Risk:** High
- **Prerequisites:** 3.5
- **Goal:** Implement `POST /api/v1/posts/{id}/comments`, `PATCH /api/v1/comments/{id}`, `DELETE /api/v1/comments/{id}`. Crisis detection. Rate limiting. Author ownership. Bumps the parent post's `last_activity_at`. Optional parent comment for threaded replies (Phase 4 enables this UI; the schema and endpoint support it now).

**Approach:** Create endpoint validates content, runs crisis detection, strips HTML, persists comment, bumps parent post's `last_activity_at`, increments parent's `comment_count` denormalized counter, fires activity event for the commenter (intercession activity type, smaller point value than posting). Update endpoint: 5-minute edit window, ownership check, content only. Delete endpoint: soft delete, ownership OR moderator. Rate limit: 30 comments per hour per user.

**Acceptance criteria:**

- [ ] Create comment increments parent post's `comment_count`
- [ ] Create comment updates parent post's `last_activity_at`
- [ ] Crisis detection runs on every comment
- [ ] Rate limit enforced
- [ ] Threaded replies (parent_comment_id) accepted
- [ ] 5-minute edit window
- [ ] Soft delete
- [ ] At least 25 integration tests

### Phase 3.6 Addendum — Comment Edit Window and Error Code

Comments inherit the same 5-minute edit window as posts (consistent with the existing `prayer-wall-redesign.md` pattern). After 5 minutes from `created_at`, the comment becomes immutable. `PATCH /api/v1/posts/{post_id}/comments/{comment_id}` returns `400 EDIT_WINDOW_EXPIRED` with response body `{ "code": "EDIT_WINDOW_EXPIRED", "message": "Comments can be edited within 5 minutes of posting.", "edit_window_seconds": 300 }` for late edits. Frontend `CommentItem.tsx` hides the edit button after the window expires (computed client-side from `created_at` + 300 seconds, refreshed every second on a mounted comment). Deletion has no time window — authors can delete their own comments at any time. The 5-minute window is configurable via `COMMENT_EDIT_WINDOW_SECONDS` env var (default 300). After the edit window, the only changes possible are: deletion (by author), moderation actions (by trust level 2+), and admin actions (by admin).

### Spec 3.7 — Reactions and Bookmarks Write Endpoints

- **ID:** `round3-phase03-spec07-reactions-bookmarks-write`
- **Size:** L
- **Risk:** Medium
- **Prerequisites:** 3.6
- **Goal:** Implement `POST /api/v1/posts/{id}/reactions`, `DELETE /api/v1/posts/{id}/reactions`, `POST /api/v1/posts/{id}/bookmark`, `DELETE /api/v1/posts/{id}/bookmark`. All idempotent. All update denormalized counters. Reactions fire activity events for intercession. Bookmarks do not earn points.

**Approach:** Reaction create: insert into `post_reactions` (composite key catches duplicates → idempotent), increment `praying_count`, fire intercession activity. Reaction delete: delete from `post_reactions`, decrement `praying_count`, do NOT fire negative activity. Bookmark create/delete: identical idempotent pattern with `post_bookmarks` and `bookmark_count`. All counter updates happen in a single transaction with the row insert/delete to prevent drift.

**Acceptance criteria:**

- [ ] Reacting twice does not double-count (idempotent)
- [ ] Unreacting decrements counter
- [ ] Bookmarking twice does not double-count
- [ ] Counters update transactionally
- [ ] Reaction creates an intercession activity (faith points)
- [ ] Reaction deletion does not subtract points
- [ ] At least 15 integration tests

### Phase 3.7 Addendum — Reaction Endpoint Signature for Light a Candle

The `POST /api/v1/posts/{id}/reactions` endpoint MUST accept `{ reaction_type: 'praying' | 'candle' }` in the request body. The endpoint toggles the row in `post_reactions` matching `(post_id, user_id, reaction_type)`. Sending the same reaction_type a second time removes the row (toggle-off). Sending a different reaction_type adds an additional row (a single user can both pray AND light a candle). The denormalized `posts.praying_count` and a new `posts.candle_count` (added by the same Liquibase changeset that introduces `reaction_type`) update transactionally. Frontend `usePrayerReactions` hook is extended with `toggleCandle(postId)` mirroring the existing `togglePraying(postId)`. Reactive store key `wr_prayer_reactions` value shape changes from `Record<string, { praying: boolean }>` to `Record<string, { praying: boolean, candle: boolean }>` — this is a localStorage migration that needs a version bump (Pattern A migration logic per `.claude/rules/11-local-storage-keys.md`).

### Spec 3.8 — Reports Write Endpoint

- **ID:** `round3-phase03-spec08-reports-write-endpoint`
- **Size:** M
- **Risk:** Medium
- **Prerequisites:** 3.7
- **Goal:** Implement `POST /api/v1/posts/{id}/reports` and `POST /api/v1/comments/{id}/reports`. Stores in `post_reports` for the Phase 10 moderation queue. One report per user per content (UNIQUE constraint).

**Approach:** Single endpoint accepts `reason` (enum) and optional `details`. Inserts into `post_reports`. Either `post_id` or `comment_id` set, never both. Duplicate report from same user returns 200 idempotently (do not leak the "already reported" state). Rate limited per user. Phase 10 builds the moderator queue and review UI; this spec just lands the write side.

**Acceptance criteria:**

- [ ] Reporting a post creates a row in `post_reports`
- [ ] Reporting a comment creates a row with `comment_id` set, `post_id` null
- [ ] Duplicate report from same user is idempotent
- [ ] Rate limit: 10 reports per hour per user
- [ ] At least 10 integration tests

### Spec 3.9 — QOTD Backend Migration

- **ID:** `round3-phase03-spec09-qotd-backend`
- **Size:** M
- **Risk:** Low
- **Prerequisites:** 3.8
- **Goal:** Move the QOTD rotation logic from frontend constants to the backend. New endpoint `GET /api/v1/qotd/today` returns today's question. Existing 60 questions seeded in 3.2 are the initial dataset.

**Approach:** `QotdController` with `GET /api/v1/qotd/today`. Implementation: compute day-of-year, modulo 60, look up by `display_order`, return the question. Caching: return value cached in memory until midnight server time (or 24-hour TTL). Frontend `QuestionOfTheDay.tsx` component updated to fetch from this endpoint instead of reading frontend constants. The frontend constants file is preserved but marked deprecated for offline test fallback.

**Files to create:**

- `backend/src/main/java/com/worshiproom/qotd/QotdController.java`
- `backend/src/main/java/com/worshiproom/qotd/QotdService.java`
- `backend/src/main/java/com/worshiproom/qotd/QotdQuestionRepository.java`
- `backend/src/main/java/com/worshiproom/qotd/dto/QotdQuestionResponse.java`
- `backend/src/test/java/com/worshiproom/qotd/QotdServiceTest.java`

**Files to modify:**

- `frontend/src/components/prayer-wall/QuestionOfTheDay.tsx` (fetch from API instead of constants)
- `frontend/src/constants/question-of-the-day.ts` (mark deprecated, keep for tests)

**Acceptance criteria:**

- [ ] `GET /api/v1/qotd/today` returns the same question for the same day
- [ ] Returns a different question on the next day
- [ ] Day-of-year modulo 60 produces the same rotation as the existing frontend logic
- [ ] Caching works (no DB query on every request within a day)
- [ ] Frontend reads from API in production
- [ ] At least 8 unit/integration tests

### Spec 3.10 — Frontend Service API Implementations

- **ID:** `round3-phase03-spec10-frontend-prayer-wall-api`
- **Size:** XL
- **Risk:** High (touches the entire Prayer Wall data flow)
- **Prerequisites:** 3.9
- **Goal:** Create API implementations for every frontend Prayer Wall service. Wire the `services/index.ts` swap point so `VITE_USE_BACKEND_PRAYER_WALL=true` flips the entire Prayer Wall to backend reads and writes.

**Approach:** Create `frontend/src/services/api/prayer-wall-api.ts` exposing the same function signatures as the existing localStorage service. Each function calls the corresponding backend endpoint via `apiClient`. Pagination wrapped to match the existing localStorage interface. Error handling: network errors surface as user-facing toasts; auth errors trigger the AuthModal; rate limit errors show a friendly message. Optimistic updates for reactions and bookmarks (UI updates immediately, rollback on backend error). The flag `VITE_USE_BACKEND_PRAYER_WALL` toggles between localStorage and API in `services/index.ts`.

**Files to create:**

- `frontend/src/services/api/prayer-wall-api.ts`
- `frontend/src/services/api/__tests__/prayer-wall-api.test.ts` (with MSW)

**Files to modify:**

- `frontend/src/services/index.ts` (add prayer wall swap point)
- `frontend/.env.example` (add `VITE_USE_BACKEND_PRAYER_WALL`)
- All four Prayer Wall pages if needed to support async loading states (most should already handle this)

**Acceptance criteria:**

- [ ] All Prayer Wall service functions have an API implementation with matching signatures
- [ ] Flag off: existing localStorage behavior unchanged
- [ ] Flag on: all Prayer Wall reads come from backend, all writes go to backend
- [ ] Optimistic reaction updates rollback on backend error
- [ ] Pagination works correctly through the swap layer
- [ ] Network errors surface as toasts
- [ ] Auth errors trigger AuthModal
- [ ] Rate limit errors show friendly message
- [ ] At least 25 tests covering both flag states with MSW mocks

### Spec 3.11 — Reactive Store Backend Adapter

- **ID:** `round3-phase03-spec11-reactions-backend-adapter`
- **Size:** L
- **Risk:** Medium
- **Prerequisites:** 3.10
- **Goal:** Swap the `usePrayerReactions` reactive store from Phase 0.5 to read from the backend. The hook return shape stays identical. Consumer components do not change. Optimistic updates with rollback on error.

**Approach:** The store module gets a new `init(userId)` function that hydrates from `GET /api/v1/users/me/reactions` on login. Mutations now call the backend write endpoints AND update the local cache for instant UI feedback. Rollback on backend error reverts the cache and shows a toast. localStorage continues to serve as an offline cache fallback. The `useSyncExternalStore` subscription remains the source of UI updates. The BB-45 subscription tests continue to pass because the store's public surface is unchanged.

**Files to modify:**

- `frontend/src/lib/prayer-wall/reactionsStore.ts` (add backend hydration and write paths)
- `frontend/src/hooks/usePrayerReactions.ts` (likely no change — store does the work)
- `frontend/src/lib/prayer-wall/__tests__/reactionsStore.test.ts` (add backend tests)

**Acceptance criteria:**

- [ ] Hook return shape unchanged
- [ ] On login, store hydrates from backend
- [ ] Toggling praying calls backend AND updates cache
- [ ] Backend error rolls back the cache and shows a toast
- [ ] Offline (network error) falls back to localStorage cache
- [ ] BB-45 subscription tests still pass
- [ ] At least 12 new tests cover backend integration

### Spec 3.12 — Phase 3 Cutover

- **ID:** `round3-phase03-spec12-phase3-cutover`
- **Size:** M
- **Risk:** High
- **Prerequisites:** 3.11
- **Goal:** Flip `VITE_USE_BACKEND_PRAYER_WALL` to `true`. End-to-end Playwright test of Prayer Wall against the backend. Cross-device sync verification.

**Approach:** Default the flag on. Playwright test: register a user, post a prayer, react to it, comment on it, bookmark it, navigate to the dashboard, verify everything is present, log out, log back in, verify everything still present. Manual cross-device test: post on Eric's laptop, refresh on his phone, verify the post is there. Update CLAUDE.md and `_plans/forums-wave/phase03-cutover-checklist.md`.

**Acceptance criteria:**

- [ ] Flag default `true` in `.env.example` and Vite config
- [ ] Playwright test passes end-to-end
- [ ] Cross-device manual test passes (post on laptop → see on phone)
- [ ] Reactions persist across devices
- [ ] Comments persist across devices
- [ ] Bookmarks persist across devices
- [ ] CLAUDE.md updated
- [ ] Cutover checklist completed
- [ ] Universal Rule 17 per-phase accessibility smoke test passes: axe-core automated scan on routes and components introduced or modified in this phase returns zero CRITICAL violations; keyboard-only navigation walkthrough of this phase's primary user flows completes without dead-ends; VoiceOver spot-check on the 2-3 most complex interactions introduced in this phase completes without blocking issues; evidence committed to `_cutover-evidence/phase3-a11y-smoke.json` (axe-core report) plus a brief markdown note recording keyboard and VoiceOver outcomes

**Out-of-band notes for Eric:** This is the moment Prayer Wall becomes a real social product. Every action you take now lives on a server and syncs across devices. The next phases (post type expansion, hero features, integrations) build on this foundation but the foundation itself is now stable.

---

## Phase 4 — Post Type Expansion

> **Phase purpose:** Expand Prayer Wall from prayer-requests-only to five distinct post types: Prayer Request (existing, polished), Testimony, Question, Devotional Discussion, Encouragement. All five share the unified `posts` table from Phase 3 with a `post_type` discriminator. The existing `PrayerCard` and composer components are extended with `postType` props, not replaced. A new Composer Chooser lets users pick what they are about to post. A new Room Selector replaces the existing CategoryFilterBar for top-level navigation.

**What this phase accomplishes:** At the end of Phase 4, a user opening Prayer Wall sees a Room Selector at the top with five rooms (Prayers, Testimonies, Questions, Discussions, Encouragements) plus an "All" option. Tapping the compose FAB opens a Composer Chooser asking what they want to share. Each post type has its own composer flow (e.g., Testimonies skip the category picker; Questions get a "looking for advice on" framing; Encouragements have a 24-hour expiry warning). Each post type renders with type-specific chrome on `PrayerCard`. Reactions, comments, bookmarks, reports all work identically across types. The 10-category system remains within each room.

**Sequencing notes:** Spec 4.1 lays the type system in TypeScript and the backend enum. Specs 4.2-4.6 add the five post types one at a time with their composer + card chrome variations. Spec 4.7 adds the Composer Chooser. Spec 4.8 adds the Room Selector and is the cutover.

### Spec 4.1 — Post Type Foundation (Frontend Types + Backend Enum Sync)

- **ID:** `round3-phase04-spec01-post-type-foundation`
- **Size:** M
- **Risk:** Low
- **Prerequisites:** Phase 3 complete
- **Goal:** Establish the `PostType` enum on both sides. Frontend constants. Backend enum class (already exists from Phase 3 schema). Type-specific copy strings in the brand voice. Type-specific icons (Lucide). Type-specific accent colors. Type-specific expiry rules referenced from constants.

**Approach:** Create `frontend/src/constants/post-types.ts` with the five-type enum, display labels, plural labels, icons, accent colors, expiry rules, default category eligibility, and brand-voice intro copy for each. Backend `PostType` enum (already exists from Phase 3 schema) gets validation logic for each type. Generate TypeScript types from OpenAPI to keep everything in sync.

**Files to create:**

- `frontend/src/constants/post-types.ts`
- `frontend/src/constants/__tests__/post-types.test.ts`

**Files to modify:**

- `backend/src/main/java/com/worshiproom/post/PostType.java` (add validation helpers)
- `backend/api/openapi.yaml` (ensure PostType enum is in the spec)

**Acceptance criteria:**

- [ ] `POST_TYPES` constant has all 5 entries with: `id`, `label`, `pluralLabel`, `icon` (Lucide name), `accentColor` (Tailwind class), `expiryRule`, `composerCopy`, `cardCopy`
- [ ] Brand voice review of every copy string passes the pastor's wife test
- [ ] Backend enum matches frontend strings character-for-character
- [ ] Frontend tests verify constants match backend enum via OpenAPI types
- [ ] At least 8 unit tests

### Spec 4.2 — Prayer Request Polish

- **ID:** `round3-phase04-spec02-prayer-request-polish`
- **Size:** M
- **Risk:** Low
- **Prerequisites:** 4.1
- **Goal:** Treat the existing prayer request as the canonical first post type. Add the `postType` prop to `PrayerCard` and `InlineComposer` so subsequent specs can extend from this baseline. No behavioral changes — just the prop plumbing.

**Approach:** Add `postType` prop to `PrayerCard` (default `'prayer_request'` for backward compatibility). Add `postType` prop to `InlineComposer` (same default). Pass `postType` from parent feed components. Update tests to confirm default behavior unchanged. Add a small visual marker (icon next to the timestamp) showing the post type — for prayer requests this is a hands icon matching the existing brand. The icon shows on every card so users can scan a mixed feed and immediately see what each post is.

**Files to modify:**

- `frontend/src/components/prayer-wall/PrayerCard.tsx`
- `frontend/src/components/prayer-wall/InlineComposer.tsx`
- All call sites that render PrayerCard or InlineComposer (recon will list)

**Acceptance criteria:**

- [ ] `postType` prop added with default `'prayer_request'`
- [ ] Existing prayer request rendering unchanged
- [ ] Hands icon shows next to timestamp
- [ ] All existing tests still pass
- [ ] At least 4 new tests cover the prop plumbing

### Spec 4.3 — Testimony Post Type

- **ID:** `round3-phase04-spec03-testimony-post-type`
- **Size:** L
- **Risk:** Medium
- **Prerequisites:** 4.2
- **Goal:** Add Testimony as a post type. Composer accepts longer content (up to 5000 chars). Card chrome has a warmer accent (gold/amber from the celebration palette). No expiry. Reactions labeled "Amen" instead of "Praying." Anonymous still allowed but the brand voice nudges toward attribution ("Testimonies often land harder when people know who they came from").

**Approach:** Extend `PrayerCard` to render Testimony chrome when `postType === 'testimony'`: warmer accent border on the FrostedCard, hands icon swapped for Lucide `Sparkles`, "Amen" label on the reaction button instead of "Praying." Extend `InlineComposer` to render the Testimony variant: increased char limit, different placeholder text, gentle nudge toward attribution under the anonymous toggle. Backend allows the longer content for testimonies (per-type validation in `PostService`). New activity type `testimony_posted` with slightly higher faith point reward than a regular prayer (encourages sharing of celebration).

**Files to modify:**

- `frontend/src/components/prayer-wall/PrayerCard.tsx` (testimony chrome branch)
- `frontend/src/components/prayer-wall/InlineComposer.tsx` (testimony composer variant)
- `frontend/src/components/prayer-wall/InteractionBar.tsx` (Amen label for testimony)
- `frontend/src/constants/post-types.ts` (testimony copy)
- `backend/src/main/java/com/worshiproom/post/PostService.java` (testimony content length validation)
- `backend/src/main/java/com/worshiproom/activity/constants/ActivityType.java` (add `testimony_posted`)
- `backend/src/main/java/com/worshiproom/activity/constants/PointValues.java` (add testimony point value)

**Acceptance criteria:**

- [ ] Posting a testimony via the composer creates a post with `post_type='testimony'`
- [ ] Testimony cards render with warmer accent border
- [ ] Testimony cards show Sparkles icon next to timestamp
- [ ] Reaction button labeled "Amen" for testimonies
- [ ] Char limit on testimony composer is 5000
- [ ] Char limit on prayer request composer remains 2000
- [ ] Anonymous toggle still available with gentle attribution nudge
- [ ] Backend rejects testimony content over 5000 chars
- [ ] Posting a testimony earns more faith points than a regular prayer (configurable, default +50%)
- [ ] Testimony activity type fires correctly through the activity engine
- [ ] At least 12 component tests cover the testimony variant
- [ ] Brand voice review passes

### Spec 4.4 — Question Post Type

- **ID:** `round3-phase04-spec04-question-post-type`
- **Size:** L
- **Risk:** Medium
- **Prerequisites:** 4.3
- **Goal:** Add Question as a post type. Composer prompt is "What are you wondering about?" Card chrome has a curious accent (cyan from the existing accent palette). Comments support a "this helped" marker. Marking a comment helpful makes the question evergreen (no expiry). Author can mark exactly one comment as helpful.

**Approach:** Extend the post type system with question variant. Composer placeholder swaps to "What are you wondering about?" with an explanatory subline ("Other believers can share their experience or scripture they have leaned on"). Card shows Lucide `HelpCircle` icon. Comments on Question posts get a small "this helped" button visible only to the post author. Tapping it sets `is_helpful=true` on that comment, sets `posts.question_resolved_comment_id`, marks the question evergreen by clearing `expires_at`. Backend endpoint `PATCH /api/v1/posts/{id}/resolve` does this atomically. Threaded replies enabled on Question comments (the `parent_comment_id` column from Phase 3).

**Files to modify:**

- `frontend/src/components/prayer-wall/PrayerCard.tsx` (question chrome branch)
- `frontend/src/components/prayer-wall/InlineComposer.tsx` (question composer variant)
- `frontend/src/components/prayer-wall/CommentItem.tsx` (helpful marker UI)
- `frontend/src/components/prayer-wall/CommentsSection.tsx` (threaded reply support)
- `backend/src/main/java/com/worshiproom/post/PostController.java` (add resolve endpoint)
- `backend/src/main/java/com/worshiproom/post/PostService.java` (resolve logic)
- `backend/api/openapi.yaml` (resolve endpoint)

**Acceptance criteria:**

- [ ] Posting a question creates a post with `post_type='question'`
- [ ] Question cards render with cyan accent border
- [ ] Question cards show HelpCircle icon
- [ ] Author sees a "this helped" button on each comment of their own question
- [ ] Tapping "this helped" marks the comment, sets question resolved, clears expiry
- [ ] Marking a different comment helpful moves the marker (only one helpful at a time)
- [ ] Resolved questions show a small "Resolved" badge near the helpful comment
- [ ] Threaded replies render correctly with indentation
- [ ] Other users do not see the "this helped" button (only the author)
- [ ] Backend endpoint enforces author ownership for resolve action
- [ ] Resolved questions never expire
- [ ] At least 18 tests cover the question variant
- [ ] Brand voice review passes

### Spec 4.5 — Devotional Discussion Post Type

- **ID:** `round3-phase04-spec05-discussion-post-type`
- **Size:** M
- **Risk:** Medium
- **Prerequisites:** 4.4
- **Goal:** Add Devotional Discussion as a post type. This is the post type that backs QOTD responses (already wired in Phase 3) plus user-initiated discussions. Composer prompt: "What scripture or topic do you want to think through with others?" Card chrome has a quiet purple accent (existing primary tint). 3-day expiry. Threaded replies enabled (same as Question).

**Approach:** Add discussion variant to post type system. Composer offers an optional "scripture reference" field (validated via the existing scripture reference patterns from the Bible feature). When provided, the card displays a small scripture chip below the content that links to the Bible reader. Discussion expiry is 3 days from `last_activity_at` (per Decision 4). QOTD responses already use `post_type='discussion'` from Phase 3 — this spec just adds the manual Discussion compose path.

**Files to modify:**

- `frontend/src/components/prayer-wall/PrayerCard.tsx` (discussion chrome + scripture chip)
- `frontend/src/components/prayer-wall/InlineComposer.tsx` (discussion variant + scripture field)
- `frontend/src/types/prayer-wall.ts` (add `scriptureReference` optional field on Discussion posts)
- `backend/src/main/java/com/worshiproom/post/Post.java` (add nullable `scripture_reference` column)
- `backend/src/main/resources/db/changelog/2026-04-18-002-add-scripture-reference-to-posts.xml`

**Acceptance criteria:**

- [ ] Posting a discussion creates a post with `post_type='discussion'`
- [ ] Discussion cards render with quiet purple accent
- [ ] Optional scripture reference field on the composer
- [ ] Scripture chip on the card links to the Bible reader at that reference
- [ ] Threaded replies render correctly
- [ ] 3-day expiry from `last_activity_at`
- [ ] QOTD responses continue to render with the QotdBadge (no regression)
- [ ] Backend Liquibase changeset adds the column without breaking existing rows
- [ ] At least 12 tests cover the discussion variant

### Spec 4.6 — Encouragement Post Type

- **ID:** `round3-phase04-spec06-encouragement-post-type`
- **Size:** M
- **Risk:** Medium
- **Prerequisites:** 4.5
- **Goal:** Add Encouragement as a post type. Short messages (max 280 chars). 24-hour expiry, non-extendable. No comments enabled. Reactions enabled (single "Thanks" reaction). Composer warns about the 24-hour expiry to set expectations. Card chrome has a soft warm accent (rose). Designed for low-friction "I am thinking of all of you today" posts.

**Approach:** Add encouragement variant. Composer max length 280. Composer shows an inline warning: "Encouragements gently fade after 24 hours. Say what is on your heart and let it go." No category required (defaults to `other`). No anonymous option (the warmth requires attribution). Card chrome: soft rose accent border. Reaction button labeled "Thanks" with a Lucide `Heart` icon. Comments are not enabled — the comment count never displays, comment input never renders. Backend validates: 280 char max, no comments allowed (returns 400 if a comment is attempted), no anonymous flag accepted.

**Files to modify:**

- `frontend/src/components/prayer-wall/PrayerCard.tsx` (encouragement chrome, no comments section)
- `frontend/src/components/prayer-wall/InlineComposer.tsx` (encouragement variant with expiry warning)
- `frontend/src/components/prayer-wall/InteractionBar.tsx` (no comment button for encouragements)
- `backend/src/main/java/com/worshiproom/post/PostService.java` (validation: 280 max, no comments, no anonymous)

**Acceptance criteria:**

- [ ] Posting an encouragement creates a post with `post_type='encouragement'`
- [ ] Char limit 280 enforced on frontend and backend
- [ ] Composer shows expiry warning before submission
- [ ] Cards render with rose accent
- [ ] Comment button hidden on encouragement cards
- [ ] Comment input never renders on encouragement cards
- [ ] Reaction button labeled "Thanks" with Heart icon
- [ ] Anonymous toggle hidden (always attributed)
- [ ] Backend rejects comments on encouragement posts with 400
- [ ] 24-hour expiry from `created_at` (non-extendable)
- [ ] At least 14 tests cover the encouragement variant
- [ ] Brand voice review passes

### Spec 4.6b — Image Upload for Testimonies & Questions

- **ID:** `round3-phase04-spec06b-image-upload-testimonies-questions`
- **Size:** L
- **Risk:** Medium (introduces external storage dependency, image processing pipeline, PII concerns)
- **Prerequisites:** 4.2 (Testimony), 4.3 (Question) — note: the image PII-stripping infrastructure is introduced in this spec and subsequently reused by the Shareable Testimony Cards spec later in Phase 6
- **Goal:** Allow users to attach ONE image to Testimony or Question posts at compose time. Images render inline on the PrayerCard with a lightbox on tap. Deliberately NOT available on Prayer Request posts — most prayer content is text, and adding an image upload path increases the "before I can pray for you I need to take a picture" friction that undermines the spontaneity the Prayer Wall depends on. Also not on Encouragement (ephemeral; persistence cost > benefit) or Discussion/QOTD responses (conversational, no image need). Limiting image upload to Testimony and Question creates a cleaner mental model: "these two types may have visual content; others are text-only."

**Approach:** Three-layer change. (1) Backend adds `image_url VARCHAR(500) NULL` and `image_alt_text VARCHAR(500) NULL` columns to `posts`, both nullable, both only populated for Testimony and Question types. (2) New `POST /api/v1/uploads/post-image` endpoint accepts a multipart upload, validates (size, format, PII), strips EXIF and GPS metadata (reusing the stripping function from Spec 6.7), uploads to S3-or-equivalent, returns `{ url, dimensions }`. The frontend then includes the returned URL in the `POST /api/v1/posts` body. (3) Frontend composer gains drag-drop, paste, and click-to-upload affordances; PrayerCard renders the image below content with aspect-ratio preservation; tap opens a lightbox modal with keyboard navigation.

**Size and format constraints:**

- Max file size: 5 MB (configurable via `POST_IMAGE_MAX_SIZE_BYTES` env var, default 5242880)
- Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`
- HEIC/HEIF rejected with a copy-deck error guiding the user to export as JPEG from Photos (macOS/iOS share sheet offers this)
- Max dimensions: 4000 × 4000 px (hard reject); recommended 1920 × 1920 px
- Server-side resize generates three renditions: `full` (up to 1920 on long edge), `medium` (960 on long edge for feed), `thumb` (240 on long edge for share cards). All stored on S3 with URLs in a JSON column on the post row.

**PII stripping (reuses Spec 6.7 infrastructure):**

- EXIF metadata stripped (camera, lens, software)
- GPS/location metadata stripped — CRITICAL, a testimony photo taken at home should not leak home coordinates
- Creation timestamp truncated to date (no time-of-day fingerprinting)
- Re-encoded server-side as JPEG Q=85 as belt-and-suspenders against any metadata the library missed

**Accessibility:**

- Alt text REQUIRED before the post can submit — a single-line input labeled "Describe this image for people using screen readers" appears directly below the image preview. Empty submission rejected at both client and server with a gentle copy-deck error.
- Lightbox uses `role="dialog"`, traps focus, Escape to close, arrow keys to pan very large images
- Images display `loading="lazy"` on the feed; first five posts get `loading="eager"` to avoid layout shift on first paint

**Upload UX states:**

- Idle: "Add a photo" button next to the composer textarea
- Dragging: dotted outline around composer, "Drop image here"
- Uploading: shimmering skeleton with progress percentage (consumes `<LoadingSkeleton>` from Spec 1.9b)
- Uploaded: preview with "Remove" button and alt-text input
- Failed: `<RetryBanner severity="error">` with specific failure reason

**Rate limiting:** `POST /api/v1/uploads/post-image` limited to 10 uploads per user per hour (aligns with the 5-posts-per-day rate limit — allows retries without enabling abuse).

**Storage retention:** Images stored indefinitely alongside their posts. Soft-deleted post (`is_deleted = true`) → image stays on S3 but served 403 via short-lifetime presigned URLs. Future cleanup job (TODO in spec, not scope) deletes S3 objects after 90 days of post soft-delete.

**Files to create:**

- `backend/src/main/java/com/worshiproom/upload/UploadController.java`
- `backend/src/main/java/com/worshiproom/upload/UploadService.java`
- `backend/src/main/java/com/worshiproom/upload/S3StorageAdapter.java` (interface + impl; dev profile uses local filesystem adapter writing to `/tmp/worshiproom-uploads`)
- `backend/src/main/java/com/worshiproom/upload/ImageProcessingService.java` (resize + metadata strip)
- `backend/src/main/java/com/worshiproom/upload/dto/UploadResponse.java`
- `backend/src/main/resources/db/changelog/2026-04-20-001-add-posts-image-columns.xml`
- `frontend/src/components/prayer-wall/ImageUpload.tsx` (composer affordance)
- `frontend/src/components/prayer-wall/PostImage.tsx` (card display)
- `frontend/src/components/prayer-wall/ImageLightbox.tsx`
- `__tests__/*.test.tsx` files for each component
- `backend/src/test/java/com/worshiproom/upload/UploadIntegrationTest.java`

**Files to modify:**

- Testimony and Question composer components (integrate `ImageUpload`)
- `PrayerCard.tsx` (renders `PostImage` when `image_url` present)
- `posts` schema (adds `image_url`, `image_alt_text` columns)
- OpenAPI spec (adds upload endpoint + post image fields)

**API changes:**

- `POST /api/v1/uploads/post-image` — multipart upload; returns `{ data: { url, dimensions, alt_text_required: true }, meta }`
- `POST /api/v1/posts` — accepts optional `image_url` and `image_alt_text` in request body (validated: only for testimony/question types)

**Copy Deck:**

- "Add a photo" (button)
- "Drop image here" (drag state)
- "Uploading..." (inline with %)
- "Describe this image for people using screen readers" (alt text input label)
- "Remove photo" (remove button)
- "Photo too big. Max 5 MB. Try exporting at a smaller size." (size error)
- "That format isn't supported. Use JPEG, PNG, or WebP." (format error)
- "HEIC photos from iPhone need to be exported as JPEG first. In Photos, share → Save Image → JPEG." (HEIC error)
- "Please describe the image. This helps people who can't see it." (alt text empty error)
- "Uploads are temporarily unavailable. Try again in a moment." (server error)

**Anti-Pressure Copy Checklist:** (a) no comparison ✓ (b) no urgency ✓ (c) no exclamation points near vulnerability ✓ (d) no therapy-app jargon ✓ (e) no streak-as-shame ✓ (f) no false scarcity ✓

**Acceptance criteria:**

- [ ] Columns `image_url` and `image_alt_text` added to `posts` table
- [ ] Upload endpoint accepts JPEG, PNG, WebP; rejects other formats with 400
- [ ] Upload endpoint rejects files > 5 MB with 413
- [ ] Upload endpoint rejects files with dimensions > 4000 × 4000 with 400
- [ ] EXIF metadata stripped (verified by downloading and inspecting with `exiftool`)
- [ ] GPS metadata stripped (integration test uses fixture image with GPS data, asserts stripped result has none)
- [ ] Three renditions (full, medium, thumb) generated and uploaded
- [ ] Alt text required before submit (client-side AND server-side)
- [ ] Upload UI works via drag-drop, paste (Ctrl/Cmd+V), and file picker
- [ ] Upload failure surfaces a RetryBanner
- [ ] Post creation with `image_url` on a Prayer Request type returns 400 (only testimony/question allowed)
- [ ] Lightbox opens on tap, closes on Escape, traps focus, arrow keys pan large images
- [ ] Image lazy-loads on feed after first 5 posts
- [ ] Rate limit: 11th upload in 1 hour returns 429
- [ ] At least 20 tests across backend + frontend

**Testing notes:**

- Integration test uses Testcontainers + MinIO (S3-compatible) for end-to-end upload verification
- Unit tests for metadata stripping using fixture images with known-bad EXIF
- Playwright test covers full composer → upload → post → render flow
- Accessibility test with axe-core + manual VoiceOver spot-check

**Notes for plan phase recon:**

1. Decide S3 provider. Recommended: AWS S3 for prod, Cloudflare R2 as cheaper alternative, MinIO for local dev. All three are S3-API compatible.
2. Confirm image library. Recommended: Java ImageIO for resize + Apache Commons Imaging for metadata strip.
3. Verify existing CDN strategy (may need CDN in front of S3 for public image URLs)
4. Confirm Spec 6.7's PII-stripping utility is a reusable service, not inlined

**Out of scope:**

- Multiple images per post (one only)
- Image galleries
- Video uploads (explicit no-go for Forums Wave)
- Direct camera-capture flow on mobile (users upload from Photos; camera is a Phase-15+ enhancement)
- User-facing image editing (crop, rotate, filters)
- Animated GIFs (no animation handling, no GIF support)
- Prayer Request image support (intentional — see Goal)

**Out-of-band notes for Eric:** The S3 adapter abstraction is load-bearing. Build it as an interface from day one so dev uses a local-filesystem adapter (zero AWS cost during development) and production picks a real backend via Spring profile. Test by running dev profile with no S3 credentials and confirming uploads still work.

---

### Spec 4.7 — Composer Chooser

- **ID:** `round3-phase04-spec07-composer-chooser`
- **Size:** L
- **Risk:** Medium
- **Prerequisites:** 4.6
- **Goal:** A new modal/sheet that appears when the user taps the compose FAB, asking what they want to share. Five large tappable cards (Prayer Request, Testimony, Question, Discussion, Encouragement) each with the type icon, label, one-line description, and the type's accent color. Selecting a type opens that type's composer flow.

**Approach:** New component `ComposerChooser.tsx`. Renders as a bottom sheet on mobile, a centered modal on desktop. Five cards in a vertical stack on mobile, 2-column grid on tablet/desktop. Each card has the type icon, label, description copy from the constants file, accent border. Tapping a card closes the chooser and opens the InlineComposer with that `postType`. Accessible: `role=dialog`, focus trap, Escape closes, tappable elements meet 44px touch target. The compose FAB now opens this chooser instead of the InlineComposer directly.

**Files to create:**

- `frontend/src/components/prayer-wall/ComposerChooser.tsx`
- `frontend/src/components/prayer-wall/__tests__/ComposerChooser.test.tsx`

**Files to modify:**

- `frontend/src/pages/PrayerWall.tsx` (or wherever the FAB lives)
- `frontend/src/constants/post-types.ts` (add description copy if not already present)

**Acceptance criteria:**

- [ ] Tapping the compose FAB opens the chooser instead of the composer directly
- [ ] All 5 type cards render with icon, label, description, accent
- [ ] Tapping a card opens the InlineComposer with the correct `postType`
- [ ] Mobile: bottom sheet with drag handle
- [ ] Desktop: centered modal with backdrop
- [ ] Escape closes
- [ ] Backdrop tap closes
- [ ] Focus trap works
- [ ] All cards meet 44px touch target
- [ ] Brand voice review passes
- [ ] At least 12 component tests

### Spec 4.7b — Ways to Help MVP

- **ID:** `round3-phase04-spec07b-ways-to-help-mvp`
- **Size:** M
- **Risk:** Low (additive content feature; no novel coordination complexity — uses existing comment flow)
- **Prerequisites:** 4.1 (Prayer Request polish), 4.7 (Composer Chooser)
- **Goal:** Prayer request authors can OPTIONALLY tag what practical help would be welcome alongside prayer: Meals, Rides, Errands, Visits, or "Just prayer, please." Tags render as small pills on the PrayerCard. Offers of help flow through the existing comment system — no separate "I'm volunteering" modal, no signup list, no coordinator role. The feature exists to make the "practical help is welcome" signal explicit in a community where many members want to help but don't know how to offer without seeming pushy. The MVP deliberately avoids building a coordination system; authors and helpers figure it out in comments, like they would in any church lobby conversation.

**Approach:** New `help_tags VARCHAR(200)` column on `posts`, stored as a comma-separated enum list. Valid values: `meals`, `rides`, `errands`, `visits`, `just_prayer`. Application-layer validation rejects unknown values. The PrayerCard renders the tags as a horizontal row of frost-glass pills below the category badge, only when at least one non-`just_prayer` tag is present. The composer gains a "What would help?" section below the category picker with the five options as selectable chips; by default none are selected (equivalent to the baseline "just prayer is the gift").

**Why `just_prayer` is an explicit tag, not the absence of tags:** Users who want to communicate "ONLY prayer, please — I don't want offers" need a way to say that affirmatively. The `just_prayer` tag means "I've thought about it and prayer is specifically what I want." The absence of any tag means "I haven't thought about it" — which defaults to the same behavior but communicates something different. In practice, the card treats both states identically: no pills shown, just the prayer request as-is. This symmetry is intentional.

**Tag semantics on the card:**

- No tags OR only `just_prayer`: no pills rendered (baseline; doesn't clutter the card)
- One or more of `meals` / `rides` / `errands` / `visits`: renders those as pills (does NOT render `just_prayer` alongside even if author selected both; if the author picked "meals AND just prayer," they probably mean "meals would be welcome, but prayer is the main thing" — we trust the explicit practical tags)

**Anti-pressure design:**

- Tagging is OPTIONAL at compose time; authors can skip entirely (default)
- Offering help is via normal comments, NOT a special "I'll help" button — this keeps the barrier to offering low and doesn't create a visible "who stepped up" list that turns community into theater
- No notifications when a comment offers help (commenting fires the existing `comment_received` notification, same as any other comment)
- No tracking of fulfillment ("did someone bring the meal?") — that's the author's and helper's business, not the app's
- Tags can be edited or removed post-publication by the author (same 5-minute edit window as any post edit per Phase 3.6 Addendum)

**Files to create:**

- `frontend/src/components/prayer-wall/WaysToHelpPicker.tsx` (composer chip picker)
- `frontend/src/components/prayer-wall/WaysToHelpPills.tsx` (card display)
- `__tests__/*.test.tsx` for each
- `frontend/src/constants/ways-to-help.ts` (enum values + copy)
- `backend/src/main/resources/db/changelog/2026-04-20-002-add-posts-help-tags.xml`

**Files to modify:**

- `PrayerRequestComposer.tsx` or equivalent (integrates WaysToHelpPicker)
- `PrayerCard.tsx` (renders WaysToHelpPills when tags present)
- `posts` schema (adds `help_tags` column)
- OpenAPI spec (adds `help_tags` to post request/response)

**Database changes:**

- Liquibase changeset adds `help_tags VARCHAR(200) NOT NULL DEFAULT ''` to `posts`
- Application-layer validation on valid enum values (Java Set-based validation, not DB CHECK — easier to extend later)
- Rollback: DROP COLUMN (safe; no data loss beyond feature data)

**Copy Deck:**

- "What would help?" (composer section label)
- "Optional — leave blank if prayer is what you need right now." (composer helper text)
- Chips: "Meals", "Rides", "Errands", "Visits", "Just prayer, please"
- Card pills: same labels, minus "Just prayer, please" which renders nothing
- Aria label on pills: "Author would welcome: {tag}"

**Anti-Pressure Copy Checklist:** (a) no comparison ✓ (b) no urgency ✓ (c) no exclamation points near vulnerability ✓ (d) no therapy-app jargon ✓ (e) no streak-as-shame ✓ (f) no false scarcity ✓

**Acceptance criteria:**

- [ ] `help_tags` column exists on `posts` with default empty string
- [ ] Prayer Request composer shows WaysToHelpPicker below category
- [ ] Picker defaults to all-unselected
- [ ] Picker allows multiple concurrent selections
- [ ] Post creation stores tags as comma-separated string
- [ ] Post creation with an invalid tag value returns 400
- [ ] PrayerCard renders WaysToHelpPills only for non-`just_prayer` tags
- [ ] Post with only `just_prayer` tag shows no pills (card identical to a tagless post)
- [ ] Post with mixed `meals + just_prayer` tags renders only the Meals pill
- [ ] Author can edit a post to add/remove tags (same 5-minute edit window)
- [ ] Non-Prayer-Request post types do NOT show the picker and reject tag submissions with 400
- [ ] Pill order is consistent (CSS flex-order maps to picker order: Meals, Rides, Errands, Visits)
- [ ] Keyboard navigation works (Tab + Space to toggle)
- [ ] Screen reader announces each chip's state ("Meals, unselected" / "Meals, selected")
- [ ] At least 12 tests across backend + frontend

**Notes for plan phase recon:**

1. Confirm `help_tags` as VARCHAR vs PostgreSQL array type (recommendation: VARCHAR + Java Set parsing for portability; array types tie us to Postgres forever for a small convenience gain)
2. Verify PrayerCard has a reasonable place to render the pills row without bumping other UI elements

**Out of scope:**

- Volunteer matchmaking ("Here are 3 people near you who picked Meals")
- Fulfillment tracking
- Separate "Help wanted" room or feed filter (deferred; may add later based on usage)
- Time-bounded help offers ("available Tuesday-Thursday")
- Geographic scoping (comment-level coordination handles logistics)

**Out-of-band notes for Eric:** This is deliberately a 20%-of-the-feature-that-delivers-80%-of-the-value spec. Resist the urge to add a coordination UI in follow-up specs until you see actual user behavior. Church communities already coordinate help in DMs and text threads and phone calls; this spec just raises the signal that help would be welcome. If we later observe a pattern of "author posts with Meals tag, three people offer in comments, nothing ships because no one knows who's doing what," THEN add coordination. Until then, comments are enough.

---

### Spec 4.8 — Room Selector and Phase 4 Cutover

- **ID:** `round3-phase04-spec08-room-selector-cutover`
- **Size:** L
- **Risk:** Medium
- **Prerequisites:** 4.7
- **Goal:** Replace the existing CategoryFilterBar with a new Room Selector at the top of Prayer Wall. Five rooms (Prayers, Testimonies, Questions, Discussions, Encouragements) plus an "All" option. Selecting a room filters the feed to that post type. Categories remain as a sub-filter within each room.

**Approach:** New component `RoomSelector.tsx` extending the existing CategoryFilterBar pattern (sticky, horizontal scroll, fade gradient on mobile, single-row layout on desktop). Six pills: All + 5 rooms. Selecting a room filters via `?postType=` on the URL and triggers a feed refetch. The existing CategoryFilterBar moves to a sub-row that filters within the active room. Mental Health, Family, Health, etc., remain as category filters. URL persists both: `/prayer-wall?postType=question&category=mental-health`. The QOTD card continues to display above the room selector since it is global (not room-specific).

**Files to create:**

- `frontend/src/components/prayer-wall/RoomSelector.tsx`
- `frontend/src/components/prayer-wall/__tests__/RoomSelector.test.tsx`

**Files to modify:**

- `frontend/src/components/prayer-wall/CategoryFilterBar.tsx` (becomes sub-row)
- `frontend/src/pages/PrayerWall.tsx` (compose new layout)

**Acceptance criteria:**

- [ ] Room selector renders 6 pills (All + 5 types)
- [ ] Selecting a room filters the feed to that `postType`
- [ ] URL updates with `?postType=` query param
- [ ] CategoryFilterBar moves below the room selector
- [ ] Both filters can be active simultaneously
- [ ] QOTD card remains above the room selector
- [ ] Mobile: room selector is sticky on scroll
- [ ] Desktop: room selector pills fit on one row
- [ ] All pills meet 44px touch target
- [ ] Active pill has clear visual distinction
- [ ] At least 16 tests cover the room selector and the URL state
- [ ] End-to-end Playwright test: open Prayer Wall, switch to Testimonies room, select Mental Health category, post a testimony, verify it appears
- [ ] Phase 4 cutover checklist in `_plans/forums-wave/phase04-cutover-checklist.md`
- [ ] Universal Rule 17 per-phase accessibility smoke test passes: axe-core automated scan on routes and components introduced or modified in this phase returns zero CRITICAL violations; keyboard-only navigation walkthrough of this phase's primary user flows completes without dead-ends; VoiceOver spot-check on the 2-3 most complex interactions introduced in this phase completes without blocking issues; evidence committed to `_cutover-evidence/phase4-a11y-smoke.json` (axe-core report) plus a brief markdown note recording keyboard and VoiceOver outcomes

---

## Phase 5 — Visual Migration to Round 2 Brand

> **Phase purpose:** Bring Prayer Wall up to the Round 2 visual standard that already governs Daily Hub, Bible, Music, and Grow. FrostedCard tier system, HorizonGlow ambient background, 2-line heading treatments, animation tokens from BB-33, deprecated patterns purged. After this phase, Prayer Wall feels like the same product as the rest of the app.

**What this phase accomplishes:** All Prayer Wall components render with the canonical FrostedCard component (tier 1 for prayers, tier 2 for inline scripture callouts), HorizonGlow appears at the page root, page hero matches the canonical PageHero pattern, all animations import from `frontend/src/constants/animation.ts`, all deprecated patterns from `09-design-system.md` are purged from the prayer wall codebase, font sizes and line heights match the design system standards.

**Sequencing notes:** Specs in this phase are mostly independent and can run in parallel with each other. Specs 5.1 and 5.2 are the highest-impact visual changes. Spec 5.5 is the verification sweep.

### Spec 5.1 — FrostedCard Migration

- **ID:** `round3-phase05-spec01-frosted-card-migration`
- **Size:** L
- **Risk:** Medium
- **Prerequisites:** Phase 4 complete
- **Goal:** Replace the inline `rounded-xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur-sm` pattern in `PrayerCard` with the canonical `<FrostedCard>` component using the tier 1 default. Inline scripture callouts in QOTD and testimony scripture references use tier 2.

**Approach:** Identify every place in `frontend/src/components/prayer-wall/` that uses the inline frosted-card class string. Replace with `<FrostedCard tier={1}>`. The component already exists from BB-33 era and handles the dual box-shadow and border treatment correctly. Test visual parity via Playwright screenshots.

**Files to modify:**

- `frontend/src/components/prayer-wall/PrayerCard.tsx`
- `frontend/src/components/prayer-wall/QuestionOfTheDay.tsx`
- `frontend/src/components/prayer-wall/CommentsSection.tsx`
- `frontend/src/components/prayer-wall/InlineComposer.tsx`
- `frontend/src/components/prayer-wall/ComposerChooser.tsx`
- `frontend/src/components/prayer-wall/AuthModal.tsx`
- `frontend/src/components/prayer-wall/ReportDialog.tsx`
- `frontend/src/components/prayer-wall/DeletePrayerDialog.tsx`
- `frontend/src/components/prayer-wall/MarkAsAnsweredForm.tsx`
- `frontend/src/components/prayer-wall/SaveToPrayersForm.tsx`

**Acceptance criteria:**

- [ ] No inline frosted-card class strings remain in `frontend/src/components/prayer-wall/`
- [ ] All cards use `<FrostedCard>` with appropriate tier
- [ ] Visual regression tests pass (Playwright screenshots)
- [ ] All existing component tests pass

### Spec 5.2 — HorizonGlow at Prayer Wall Root

- **ID:** `round3-phase05-spec02-horizon-glow`
- **Size:** S
- **Risk:** Low
- **Prerequisites:** 5.1
- **Goal:** Add the canonical HorizonGlow ambient background at the Prayer Wall page root, matching the Daily Hub treatment.

**Approach:** Wrap `PrayerWall.tsx`, `PrayerWallDashboard.tsx`, `PrayerDetail.tsx`, `PrayerWallProfile.tsx` in `<HorizonGlow>` (the existing component from the Daily Hub era). Verify glow opacity is in the 0.25-0.50 range (per the corrected glow opacity standard). Remove any existing per-section `GlowBackground` instances on Prayer Wall (deprecated per `09-design-system.md`).

**Files to modify:**

- `frontend/src/pages/PrayerWall.tsx`
- `frontend/src/pages/PrayerWallDashboard.tsx`
- `frontend/src/pages/PrayerDetail.tsx`
- `frontend/src/pages/PrayerWallProfile.tsx`

**Acceptance criteria:**

- [ ] HorizonGlow wraps all 4 Prayer Wall pages
- [ ] No deprecated GlowBackground instances remain
- [ ] Glow opacity in correct range
- [ ] Visual regression tests pass

### Spec 5.3 — 2-Line Heading Treatment

- **ID:** `round3-phase05-spec03-two-line-headings`
- **Size:** M
- **Risk:** Low
- **Prerequisites:** 5.2
- **Goal:** Apply the canonical 2-line heading treatment (smaller eyebrow over a larger headline) to Prayer Wall hero and section headers, matching the Round 2 brand standard.

**Approach:** Replace the existing `PrayerWallHero` heading treatment with the canonical `<PageHero eyebrow="..." headline="..." />` component (or extract into a shared component if it does not yet exist). Section headers in PrayerWallDashboard ("Recent Prayers", "Bookmarks", etc.) get the same 2-line treatment.

**Files to modify:**

- `frontend/src/components/prayer-wall/PrayerWallHero.tsx`
- `frontend/src/pages/PrayerWallDashboard.tsx`

**Acceptance criteria:**

- [ ] Prayer Wall hero uses the 2-line treatment
- [ ] Dashboard section headers use the 2-line treatment
- [ ] Brand voice review of all eyebrow + headline pairs
- [ ] Visual regression tests pass

### Spec 5.4 — Animation Token Migration (BB-33 Compliance)

- **ID:** `round3-phase05-spec04-animation-tokens`
- **Size:** M
- **Risk:** Low
- **Prerequisites:** 5.3
- **Goal:** Replace any hardcoded animation durations and easings in Prayer Wall components with imports from `frontend/src/constants/animation.ts`. Per BB-33 standard.

**Approach:** Grep for `200ms`, `300ms`, `cubic-bezier(`, `transition-duration`, `animation-duration` in `frontend/src/components/prayer-wall/`. Replace with the appropriate tokens (`DURATION.fast`, `DURATION.medium`, `EASING.standard`, etc.). Tailwind class names that encode duration (e.g., `duration-300`) get a comment pointing to the equivalent token, and the Tailwind config is verified to use the same values as the constants file.

**Files to modify:**

- All files in `frontend/src/components/prayer-wall/` matching the grep

**Acceptance criteria:**

- [ ] No hardcoded `ms` durations in Prayer Wall component files
- [ ] No hardcoded `cubic-bezier(...)` strings
- [ ] All animations import from `constants/animation.ts`
- [ ] Lighthouse Performance score on Prayer Wall pages still 90+
- [ ] `prefers-reduced-motion` still respected throughout

### Spec 5.5 — Deprecated Pattern Purge and Visual Audit

- **ID:** `round3-phase05-spec05-deprecated-pattern-purge`
- **Size:** M
- **Risk:** Low
- **Prerequisites:** 5.4
- **Goal:** Final sweep removing every deprecated pattern listed in `09-design-system.md` § Deprecated Patterns from Prayer Wall files. Visual audit confirms parity with the Round 2 standard.

**Approach:** Open `09-design-system.md` § Deprecated Patterns and grep for each pattern name in `frontend/src/components/prayer-wall/`. Replace with the documented current pattern. Run Playwright visual regression tests against every Prayer Wall page on mobile, tablet, and desktop. Manual visual audit by Eric — open Daily Hub and Prayer Wall side by side and confirm they feel like the same app.

**Acceptance criteria:**

- [ ] No `Caveat` font on Prayer Wall headings
- [ ] No `BackgroundSquiggle` on Prayer Wall
- [ ] No per-section `GlowBackground` on Prayer Wall
- [ ] No `animate-glow-pulse` on Prayer Wall textareas
- [ ] No `font-serif italic` on Prayer Wall labels
- [ ] No cyan textarea glow border
- [ ] No soft-shadow 8px-radius cards on dark backgrounds
- [ ] No `line-clamp-3` on Prayer Wall card descriptions
- [ ] Visual regression tests pass on all 4 pages and all 3 breakpoints
- [ ] Manual visual audit by Eric: Prayer Wall feels like the same product as Daily Hub
- [ ] Phase 5 cutover checklist completed

---

### Spec 5.6 — Redis Cache Foundation

- **ID:** `round3-phase05-spec06-redis-cache-foundation`
- **Size:** M
- **Risk:** Medium (introduces a new infrastructure dependency; Phase 6's Live Presence and production rate limiting depend on this landing cleanly)
- **Prerequisites:** 5.5
- **Goal:** Stand up Redis as a shared cache and ephemeral data store before any feature consumer needs it. Spec 6.11b (Live Presence) requires Redis sorted sets for 60-minute presence windows. Production rate limiting (Universal Rule 15) currently falls back to in-memory per-instance counters — fine for single-instance dev but fundamentally broken the moment you run two backend replicas. This spec closes that gap and establishes the Redis patterns future specs can reuse. Lands at Phase 5's end specifically so Phase 6 features don't have to invent Redis wiring as a side quest.

**Approach:** Add Redis 7 to the deployment stack (docker-compose for dev, platform-native for prod via Railway/Render/Upstash), wire Spring Data Redis, configure Spring's `@Cacheable` abstraction for the handful of expensive read-path queries, migrate the rate limiter from in-memory to Redis-backed, and establish the sorted-set + key-namespacing conventions that Phase 6 will consume.

**Why not just defer until Phase 6 absolutely needs it:** Spec 6.11b's complexity spikes if Redis itself is unfamiliar. Introducing Redis concurrently with presence-tracking logic would mean debugging "is it my sorted-set query or my Redis config?" simultaneously. Separating the foundation (this spec) from the consumer (6.11b) keeps each problem small.

**Why not land Redis in Phase 1:** Rate limiting works in-memory through Phase 5 (single-instance dev + low-traffic early prod). Running a Redis container for 3-4 months unused burns fly.io/Railway credits without return. Phase 5 end is the just-in-time landing point.

**Four substacks:**

**Substack 1 — Redis service wiring.**

- `docker-compose.yml` gains a `redis:7-alpine` service with a named volume for AOF persistence (`appendonly yes`), port `6379:6379`, healthcheck via `redis-cli ping`.
- Production: decision deferred to same dimension as 1.10b deployment target. Options: Railway Redis (matches backend choice if Railway), Upstash (serverless, free tier 10K commands/day), Redis Cloud free tier (30 MB). Upstash is the recommended default for Worship Room scale — pay-per-command means months of unused Redis cost $0.
- Env vars: `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` (empty in dev, set in prod). Connection URL format `redis://[:password@]host:port/db` supported as `REDIS_URL` alternative (Upstash emits this format directly).
- Spring Data Redis dependency via `org.springframework.boot:spring-boot-starter-data-redis`.
- Lettuce as the default client (reactive-capable; thread-safe; Spring Boot's default).

**Substack 2 — Key namespacing and conventions.**

- All keys prefixed by domain: `cache:*` for Spring `@Cacheable`-managed entries, `rate:*` for rate limiter buckets, `presence:*` for Phase 6.11b presence tracking, `session:*` reserved for future features.
- TTLs are MANDATORY on every key. No un-TTL'd keys. A key without an expiry is a memory leak waiting to happen; the linter-equivalent is a code review rule documented in `backend/docs/redis-conventions.md`.
- Sorted sets (`ZADD`) are the pattern for time-windowed presence and rate limiting. Documented with working examples in the conventions doc.
- Binary-safe string values only; if a consumer wants to store structured data, it serializes to JSON first (no Java `Serializable`-based binary blobs — a deployment that upgrades a Java class breaks existing cached data).

**Substack 3 — Spring `@Cacheable` configuration.**

- `CacheConfig` class registers Redis as the `CacheManager` in `prod` profile; a `ConcurrentHashMap`-backed `CacheManager` in `dev` profile (so local iteration doesn't require Redis running).
- Per-cache TTLs configured in `application.properties` — one central place to tune cache lifetimes without code changes.
- Targeted caching only. Do NOT cache: user-specific read-your-writes paths (newly posted prayers wouldn't appear immediately), anonymous-post author lookups (correctness-critical), crisis flag status (must always be live). DO cache: QOTD question-of-the-day lookup (TTL = end of day), category list, trust level thresholds (TTL = 1 hour), liturgical season computation (TTL = 1 hour), global leaderboard snapshots (TTL = 5 minutes).
- Cache keys namespaced by method + args via Spring's default key generator; explicit keys for edge cases.

**Substack 4 — Rate limiter migration.**

- Existing in-memory rate limiter (from Universal Rule 15) migrates to Redis-backed implementation using `INCR` + `EXPIRE` per bucket.
- Bucket key pattern: `rate:{endpoint-category}:{authed|anon}:{user-id-or-ip-hash}:{window-start-epoch}`. Sliding window via TTL equal to the window length.
- Dev profile keeps the in-memory implementation by default (opt-in to Redis-backed via `RATE_LIMIT_BACKEND=redis` env var) so local development doesn't require Redis running.
- `X-RateLimit-Remaining` / `X-RateLimit-Reset` headers now accurately reflect cross-instance state (the pre-migration per-instance counters would have let a 2-instance deployment service double the intended rate limit).

**Observability integration (builds on 1.10d):**

- Redis operation duration logged at DEBUG for every call (key, op, duration_ms)
- Slow operations (>100ms) logged at WARN with key + op
- Redis connection failures log at ERROR and route to Sentry
- Circuit breaker on the cache read path: if Redis is unreachable for 3 consecutive ops, bypass cache and hit the database directly (with a `WARN` log). The app MUST NOT fail user requests because the cache is down.

**Files to create:**

- `backend/src/main/java/com/worshiproom/cache/RedisConfig.java`
- `backend/src/main/java/com/worshiproom/cache/CacheConfig.java`
- `backend/src/main/java/com/worshiproom/cache/RedisHealthIndicator.java`
- `backend/src/main/java/com/worshiproom/ratelimit/RedisRateLimiter.java`
- `backend/src/main/java/com/worshiproom/ratelimit/InMemoryRateLimiter.java` (extracted from the existing inline implementation)
- `backend/src/main/java/com/worshiproom/ratelimit/RateLimiter.java` (interface)
- `backend/src/main/java/com/worshiproom/ratelimit/RateLimiterConfig.java` (profile-aware selection)
- `backend/src/test/java/com/worshiproom/cache/RedisIntegrationTest.java`
- `backend/src/test/java/com/worshiproom/ratelimit/RateLimiterContractTest.java` (both impls must pass identical assertions)
- `backend/src/test/java/com/worshiproom/ratelimit/RedisRateLimiterIntegrationTest.java`
- `backend/docs/redis-conventions.md`

**Files to modify:**

- `docker-compose.yml` — add Redis service
- `backend/pom.xml` — add spring-boot-starter-data-redis
- `backend/src/main/resources/application.properties` — cache TTLs, rate limiter backend selector
- `backend/src/main/resources/application-dev.properties` — in-memory cache + rate limiter defaults
- `backend/src/main/resources/application-prod.properties` — Redis cache + rate limiter, connection details
- `backend/src/main/resources/application-test.properties` — Redis Testcontainer config
- `.env.example` — document REDIS_URL, REDIS_HOST/PORT/PASSWORD
- Existing rate limiter consumer classes refactored to inject `RateLimiter` interface instead of concrete impl

**Database changes:** None

**API changes:** None (infrastructure only; the rate limit headers already exist from Phase 1)

**Copy Deck:** None (no user-facing copy)

**Acceptance criteria:**

- [ ] Redis 7 service running in docker-compose dev stack with AOF persistence
- [ ] Spring Data Redis dependency present and Lettuce client active
- [ ] `REDIS_URL` (Upstash-style) parses correctly when set instead of HOST/PORT/PASSWORD triplet
- [ ] `RedisHealthIndicator` reports UP when Redis is reachable, DOWN otherwise; exposed via `/actuator/health`
- [ ] `CacheManager` bean is Redis-backed in `prod` profile, ConcurrentMap-backed in `dev` profile
- [ ] All configured `@Cacheable` methods have explicit TTL (verified by test that scans `@Cacheable` annotations and checks TTL is present)
- [ ] Rate limiter contract test passes against both InMemoryRateLimiter and RedisRateLimiter
- [ ] Rate limiter correctly tracks requests across simulated multiple-instance scenario (two `RedisRateLimiter` instances sharing one Redis → combined request counts)
- [ ] `X-RateLimit-Remaining` header reflects Redis-backed count in prod profile
- [ ] Cache bypass circuit breaker engages after 3 consecutive Redis failures (verified by integration test that shuts down Redis mid-test and asserts no user-facing errors)
- [ ] Cache bypass recovers automatically when Redis comes back (verified by restarting Redis mid-test)
- [ ] Redis connection failures are logged at ERROR and propagate to Sentry
- [ ] Every Redis key set in the app has an associated TTL (verified by a repo-wide grep test for `redisTemplate.opsForValue().set(` without a following `.expire(` or TTL-variant method)
- [ ] `backend/docs/redis-conventions.md` documents key namespaces, TTL policy, sorted-set examples, and JSON-serialization rule
- [ ] Rate limit headers mathematically accurate under 2-instance simulation (integration test spawns 2 rate limiter instances against shared Redis)
- [ ] At least 18 tests across cache config, rate limiter contract, Redis health, and circuit breaker

**Testing notes:**

- Integration tests use Testcontainers' `GenericContainer("redis:7-alpine")`. A single container per test class; flush between tests.
- Contract test is the load-bearing artifact: InMemoryRateLimiter must behave identically to RedisRateLimiter under the same input sequence. Any divergence is a bug in one of them.
- Cache circuit breaker tested by stopping the Testcontainer mid-test (`redisContainer.stop()`) and verifying subsequent service calls complete (from DB) without throwing.
- Do NOT mock Spring's `RedisTemplate` — the value is in exercising real Redis semantics.

**Notes for plan phase recon:**

1. Confirm Upstash Redis free tier (10K commands/day, 256 MB data) suffices for Phase 6 presence + rate limiting + targeted caching. Rough estimate: 100 active users × ~20 Redis ops/user/day = 2K/day. Plenty of headroom.
2. Verify Spring Data Redis version matches Spring Boot 3.5.11.
3. Decide if Redis should be optional in prod (fallback entirely to in-memory with a health-degraded signal) for resilience. Default: NO — Redis is a hard dependency once rate limiter migrates. Its absence means either no rate limiting (dangerous) or rejecting all writes (bad UX). Circuit breaker on the cache path is the only place graceful degradation makes sense.
4. Identify the specific `@Cacheable` targets. Audit PostService / QOTDService / LiturgicalService / LeaderboardService for read-heavy methods with stable input.

**Out of scope:**

- Redis Streams or Pub/Sub (not needed for Forums Wave; presence uses sorted sets, not pub/sub)
- Multi-region Redis replication
- Redis Cluster (single instance is fine at Worship Room scale)
- Session storage in Redis (JWT is stateless in-memory per Decision 6 — no sessions to store)
- Full-text search in Redis (PostgreSQL handles this per Phase 11)
- Distributed locks (no current use case)

**Out-of-band notes for Eric:** The contract test for rate limiters is the most important artifact here. If you later decide to swap Redis for Dragonfly, KeyDB, or a different cache, the contract test is what tells you the swap is safe. The circuit breaker on the cache read path is load-bearing in a different way: the day Redis has a hiccup (and it will), the app should get slightly slower, not start 500-ing. Budget an afternoon to manually verify this — stop your dev Redis, hit the app, confirm pages load, confirm the WARN logs fire, then restart Redis and confirm recovery. This is the kind of test that prevents a 2 AM outage from a Redis maintenance window.

---

## Phase 6 — Hero Features

> **Phase purpose:** The features that make the Forums Wave feel like a sanctuary instead of a generic forum. Prayer Receipt, Quick Lift, Night Mode, 3am Watch, Intercessor Timeline, Answered Wall, Shareable Testimony Cards, Verse-Finds-You, plus four supporting features. These are the high-leverage emotional moments that competitor forums (CaringBridge, Hallow, YouVersion, Discourse) do not have. Each feature is its own spec.

**What this phase accomplishes:** After Phase 6, a user posting a prayer receives a beautiful confirmation moment with a scripture gift. A user can tap "Quick Lift" on any prayer to send a 30-second silent prayer gesture without typing. Night Mode dims the entire Prayer Wall and softens the language between 9pm and 6am local time. The 3am Watch surfaces Mental Health prayers with extra care during the loneliest hours. Each prayer card shows an intercessor timeline (who prayed and when, in soft type). Answered prayers get their own celebration wall. Testimonies get one-tap shareable cards (PNG via the existing image generation infrastructure). A scripture appears for the user every time they open the Prayer Wall, chosen by emotional context.

**Sequencing notes:** Spec 6.1 (Prayer Receipt) is the highest impact and most visible. Specs 6.2-6.12 can be sequenced flexibly based on emotional priority. Spec 6.12 is the cutover.

### Spec 6.1 — Prayer Receipt

- **ID:** `round3-phase06-spec01-prayer-receipt`
- **Size:** L
- **Risk:** Medium (emotionally-loaded feature; getting the privacy model wrong causes real harm; the "empty receipt" anti-pressure case is easy to get wrong)
- **Prerequisites:** 5.6 (Redis cache foundation), Phase 5 complete
- **Goal:** When someone taps "Praying" on a post, the author sees a tangible receipt — "3 people are praying for you right now" — on that specific post in their own dashboard view. This is the single most emotionally resonant feature of Prayer Wall: it converts "I'll pray for you" (often an empty phrase in real life) into specific, dated, private proof that real intercession happened. A receipt is also the thing most likely to get screenshotted and saved by users during hard seasons. Treat it accordingly.

**Approach:** Prayer Receipts are a derived view over `post_reactions` (where `reaction_type = 'praying'`), rendered into a dedicated `<PrayerReceipt>` component that the post author sees at the top of their own post detail page. Not a new table; a thin API endpoint plus a warm UI component. Three display variants depending on who the intercessors are relative to the author, with privacy-preserving fallbacks.

**What the author sees on their own post:**

1. **When no one has prayed yet:** NO empty state that says "No one has prayed yet." That framing would be cruel. Instead, the receipt component simply renders nothing — the post looks like any other draft. Absence is absence; we don't amplify it.

2. **When 1 person has prayed:** "1 person is praying for you." If that person is a friend, their first name is shown with their avatar. If a non-friend, shown as "A friend" with a generic gradient avatar. Never shown: the non-friend's actual name, even to the author. Prayer Wall's trust model says that praying for a stranger's post is an anonymous gift — attributing the stranger's identity back to the author breaks that trust.

3. **When 2-10 people have prayed:** "{N} people are praying for you" with up to the first 3 avatar thumbnails (friends first, then non-friend gradients). Tap the count opens a modal listing the friends-who-prayed by display name; non-friends show as "A friend" with count ("...and 4 others").

4. **When 10+ people have prayed:** Same as above but the modal becomes paginated. Never shows exact timestamps (privacy); just relative windows ("today", "this week", "earlier").

**What OTHER users see (i.e., someone else's post, when they visit it):**

- They see the same aggregate count ("3 people are praying for you") so the post feels witnessed, but NEVER individual names or avatars of who prayed — even of people they mutually friends with. Prayer attribution is author-only.
- The UI is visually identical to a post with no receipt; only the count differs. This keeps privacy uniform — you can't tell from someone else's view whether their best friend prayed for them.

**Scripture accompaniment (the warm touch):**

Every prayer receipt includes a scripture line, rotated daily from a curated set of 60 verses about being upheld in prayer (e.g., "The LORD will fight for you; you need only to be still." — Exodus 14:14, WEB). The set lives in `frontend/src/constants/prayer-receipt-verses.ts`. One verse per calendar day (UTC for now, user-timezone after 1.3b) so all receipts on the same day share the same verse — creates a subtle "we're all receiving the same word today" community signal. Verse is rendered in Lora italic, muted color, sized one notch smaller than the count.

**Shareable receipt (PNG generation):**

Author can tap "Save as image" on their own receipt. Generates a PNG via `html2canvas` or server-side rendering (TBD; recommend frontend for MVP to avoid backend-image-rendering complexity). Card contents: prayer post excerpt (first 200 chars), intercessor count, the scripture line, Worship Room subtle wordmark at the bottom. Reuses the PII-stripping infrastructure from Spec 6.7. Sharing via native share sheet or download. Rate-limited to 5 shares per post per day (prevents accidental image-generation loop).

**Anti-pressure design (load-bearing):**

- Receipt HIDDEN at zero intercessors (not "0 people praying" — zero display, zero UI)
- No growth chart, no "your receipts over time" dashboard — Prayer Wall is not a leaderboard
- No ranking of posts by receipt count (would create "prayer-farming" pressure)
- Scripture is a gift, never a guilt-trip verse ("be still and know" not "faith the size of a mustard seed")
- No push notifications on individual prayer events (only summarized as the Phase 12 `prayer_received` type, which respects user prefs and batches)
- Author can DISMISS or hide receipts via settings if the attention feels wrong (setting: `wr_settings.prayerWall.prayerReceiptsVisible`, default true). Some users in crisis want privacy even from being prayed for.

**Accessibility:**

- `role="status"` on the receipt component, `aria-live="polite"` so screen readers announce changes (e.g., when a new prayer arrives while the page is open)
- Avatar stack has accessible names ("3 people praying: Sarah, A friend, A friend")
- Modal is standard dialog pattern (focus trap, Escape to close, arrow keys between list items)
- Scripture text has min WCAG AA contrast (4.5:1); italics don't reduce below AA
- Share button is keyboard-accessible and not solely gesture-triggered

**Performance:**

- Receipt count comes from `posts.praying_count` (denormalized, per Decision 4) — no extra query on feed load
- Avatar list comes from a small endpoint `GET /api/v1/posts/{id}/prayer-receipt` that returns max 10 attributed avatars + anonymized count — called lazily, only when author views their own post
- Response cached in Redis for 30 seconds (per Spec 5.6) — no point re-querying on every refresh
- PNG generation is client-side; bundle-size impact tracked (target < 30 KB gzipped additional)

**Files to create:**

- `frontend/src/components/prayer-wall/PrayerReceipt.tsx`
- `frontend/src/components/prayer-wall/PrayerReceiptModal.tsx`
- `frontend/src/components/prayer-wall/PrayerReceiptImage.tsx` (render-to-PNG)
- `frontend/src/hooks/usePrayerReceipt.ts`
- `frontend/src/constants/prayer-receipt-verses.ts` (60 WEB verses curated)
- `backend/src/main/java/com/worshiproom/post/PrayerReceiptController.java`
- `backend/src/main/java/com/worshiproom/post/PrayerReceiptService.java`
- `backend/src/main/java/com/worshiproom/post/dto/PrayerReceiptResponse.java`
- `backend/src/test/java/com/worshiproom/post/PrayerReceiptIntegrationTest.java`
- `__tests__/*.test.tsx` for each frontend component

**Files to modify:**

- `PrayerCard.tsx` — render `<PrayerReceipt>` above InteractionBar when viewer is author
- `PrayerWallDashboard.tsx` — receipt summary on the dashboard posts list
- Settings page — add `prayerReceiptsVisible` toggle with helper copy
- `.claude/rules/11-local-storage-keys.md` — document `wr_settings.prayerWall.prayerReceiptsVisible`

**API changes:**

- `GET /api/v1/posts/{id}/prayer-receipt` — returns `{ data: { total_count, attributed_intercessors: [{displayName, avatarUrl, is_friend}], verse_of_the_day: { text, reference } }, meta }`. AuthN required; 403 if requester is not the post author.
- OpenAPI spec updated with the new endpoint

**Copy Deck:**

- 1 intercessor: "1 person is praying for you"
- 2+: "{N} people are praying for you"
- Modal header: "Your prayer circle today"
- Non-friend attribution: "A friend"
- Large-number excess: "...and {N} others"
- Share button: "Save as image"
- Shareable card footer: "Worship Room"
- Settings toggle: "Show me my prayer receipts"
- Settings helper: "Turn this off if you'd rather not see who's praying for you right now. You can turn it back on anytime."
- Scripture verses: curated 60-entry list in `prayer-receipt-verses.ts`, each `{ reference: string, text: string }` in WEB translation

**Anti-Pressure Copy Checklist:** (a) no comparison ✓ (b) no urgency ✓ (c) no exclamation points near vulnerability ✓ (d) no therapy-app jargon ✓ (e) no streak-as-shame ✓ (f) no false scarcity ✓

**Anti-Pressure Design Decisions:**

- Hidden entirely at zero intercessors (not "be the first to pray" or "no prayers yet")
- No ranking, no comparison across posts, no "most-prayed-for of the week"
- No guilt-inducing scripture (verses about being upheld, not about shortage-of-faith)
- Non-friend intercessors never attributed by name to the author
- User-controllable dismissal via settings toggle
- No growth chart or historical receipt aggregation view
- Scripture is a gift, never a demand
- Receipt count is the SAME regardless of who is viewing (author vs others) — nobody can infer from the count alone "my friend didn't pray for me"

**Acceptance criteria:**

- [ ] Receipt component renders nothing when `praying_count = 0`
- [ ] Receipt shows correct count for 1 / 2-10 / 10+ intercessor cases
- [ ] Attributed avatars show only for friends of the author
- [ ] Non-friend intercessors appear as "A friend" with generic gradient avatar
- [ ] Modal opens on count tap, lists friends by display name and non-friends as "A friend + N others"
- [ ] Other users viewing the post see the aggregate count but NEVER individual intercessor identities
- [ ] Rapid-fire reactions (friend taps Pray, un-Pray, Pray again) resolve to the current state, not stale counts
- [ ] Redis cache TTL 30s (per 5.6) honored; cache invalidated on reaction toggle
- [ ] Daily-rotating scripture verse renders and is identical for all users on the same UTC day (or user-tz day after 1.3b)
- [ ] Scripture uses Lora italic at smaller size
- [ ] Share-as-image generates a PNG containing post excerpt + count + verse + wordmark
- [ ] PNG generation reuses PII-stripping path from Spec 6.7 (no EXIF, no GPS, no timestamp fingerprints)
- [ ] Share rate-limited to 5 per post per day (integration test verifies 6th returns 429)
- [ ] Settings toggle `prayerReceiptsVisible` controls visibility; default true
- [ ] When toggled off, author sees no receipts anywhere and no "you've hidden receipts" shaming copy
- [ ] Screen reader announces new prayer count changes via `aria-live="polite"` when page is open
- [ ] Avatar stack has accessible names listing the first 3 intercessors
- [ ] Modal traps focus, Escape closes, arrow keys navigate
- [ ] Color contrast meets WCAG AA on all text including italic scripture
- [ ] Receipt endpoint returns 403 when requester is not the post author
- [ ] PNG generation bundle-size impact ≤ 30 KB gzipped
- [ ] Receipt visible on the author's dashboard summary (non-expanded mini-version showing just total count, not avatars)
- [ ] Anonymous-posts author still sees receipts (they know they posted even if readers don't)
- [ ] Dismissed-setting state persists across devices via Phase 8 settings sync (or localStorage in this wave)
- [ ] At least 24 tests covering privacy boundaries, count accuracy, scripture rotation, modal behavior, PNG generation, rate limiting, a11y, cache invalidation

**Testing notes:**

- Integration tests: seed a post with mixed friend/non-friend intercessors, assert the author-view endpoint returns correct attribution while the non-author-view omits individuals
- Unit tests for scripture rotation (assert day-of-year modulo against 60 verses is deterministic)
- Visual regression test for PNG generation (snapshot comparison to ensure font/layout/wordmark don't drift)
- Playwright: author taps their own post, sees receipt; friend taps the post, causes receipt to update in author's view; author toggles setting off, receipts disappear; toggle on, they return
- Accessibility test: axe-core + VoiceOver walk through modal

**Notes for plan phase recon:**

1. Confirm `html2canvas` bundle cost. Alternative: `dom-to-image-more` is smaller but less accurate on gradients.
2. Decide between frontend PNG generation (zero backend cost, some device limitations) vs server-side (complex, but consistent). Recommendation: frontend for MVP, revisit if quality issues emerge.
3. Verify Redis cache invalidation on reaction toggle is correctly wired (otherwise stale receipts)
4. Confirm the 60 curated scripture verses — Eric should review the curated set before spec execution
5. Verify that dashboard summary view's mini-receipt doesn't leak individual identities accidentally

**Out of scope:**

- Prayer receipt "digest" email (could be a Phase 15 follow-up)
- Historical receipts timeline ("you received 500 prayers this year")
- Receipt analytics or "most-prayed-for" leaderboards (explicitly anti-anti-pressure)
- Gif/animation on receipt appearance (static only; animation breaks the quiet reverence)
- Custom avatars in receipt modal beyond existing avatar URLs
- Prayer receipt for comment-level prayers (only post-level)

**Out-of-band notes for Eric:** The "hidden at zero" rule is the most important thing here. Resist every future request to add "Be the first to pray!" copy — it sounds friendly but it's the same FOMO pattern that dating apps use, and it has no place on a feature for people in real pain. Also: the scripture rotation creates an unexpected emergent property where everyone receiving prayer receipts on the same day shares the same verse. This can create beautiful moments ("did you also get Isaiah 40:31 today?") that you didn't design for. Let this happen; don't try to personalize the verse per user — the shared verse IS the feature. Finally, the "dismissed receipts" setting is load-bearing for users in acute crisis who find the attention overwhelming. Never hide this setting behind a multi-click path; it should be a single toggle directly on the settings page.

---

### Spec 6.2 — Quick Lift

- **ID:** `round3-phase06-spec02-quick-lift`
- **Size:** M
- **Risk:** Low
- **Prerequisites:** 6.1
- **Goal:** A new button on every prayer card alongside the existing Pray button. Tapping Quick Lift starts a 30-second silent timer with a gentle visual (a slowly filling ring). After 30 seconds the user has logged a deep intercession (counts as 2 prayers in the activity engine, with a single special badge after 10 lifts). No typing required. Designed for the moment of "I do not have words but I am here."

**Approach:** New button on `InteractionBar.tsx` next to Pray. Lucide `Hourglass` icon. Tapping opens an inline overlay with a slowly filling ring (30-second animation). Cancellable at any time (tapping the X cancels with no points). Completing the 30 seconds fires `recordActivity('quick_lift')` which earns 2x the standard intercession points. The first 10 quick lifts unlock a "Faithful Watcher" badge. Visual is quiet, sacred — no countdown numbers, no progress bar, just the slowly filling circle.

**Server-authoritative timing (anti-cheat AND anti-iOS-throttling):** Frontend timers alone are unreliable — iOS Safari aggressively throttles JavaScript when the tab/app backgrounds, so a user who locks their phone mid-Quick-Lift could see the timer "complete" after only 5 seconds of real elapsed time (the rest spent paused). The Quick Lift flow uses a two-call pattern: (1) `POST /api/v1/posts/{id}/quick-lift/start` returns `{ session_id, started_at }` with the server's wall-clock timestamp; (2) `POST /api/v1/posts/{id}/quick-lift/complete` with `{ session_id }` is called when the frontend timer thinks 30 seconds has elapsed. The backend rejects the complete call with `400 QUICK_LIFT_TOO_SHORT` if `(server_now - started_at) < 28 seconds` (2-second tolerance for network jitter). Sessions expire server-side after 5 minutes. The frontend uses `Date.now()` deltas (not `setTimeout` or animation frames) to compute elapsed time, so the visible timer stays accurate even after backgrounding. If the user backgrounds the app and returns after 30+ wall-clock seconds, the ring snaps to complete and the API call fires immediately. Failed completions surface a quiet "Try again — let's hold this in stillness for a full thirty seconds" toast (brand voice; no shame).

**Files to create:**

- `frontend/src/components/prayer-wall/QuickLiftOverlay.tsx`
- `frontend/src/components/prayer-wall/__tests__/QuickLiftOverlay.test.tsx`

**Files to modify:**

- `frontend/src/components/prayer-wall/InteractionBar.tsx` (add Quick Lift button)
- `backend/src/main/java/com/worshiproom/activity/constants/ActivityType.java` (add `quick_lift`)
- `backend/src/main/java/com/worshiproom/activity/constants/PointValues.java`
- `backend/src/main/java/com/worshiproom/activity/constants/BadgeCatalog.java` (add Faithful Watcher badge)

**Acceptance criteria:**

- [ ] Quick Lift button visible on every prayer card
- [ ] Tap opens the 30-second overlay
- [ ] Ring fills slowly over 30 seconds
- [ ] No countdown numbers visible (no urgency)
- [ ] Cancellable at any time
- [ ] Completing the 30 seconds fires `quick_lift` activity
- [ ] Earns 2x intercession points
- [ ] First 10 unlocks Faithful Watcher badge
- [ ] `prefers-reduced-motion` shows a static circle that fills at 15 seconds (no continuous animation)
- [ ] Sound: quiet wind chime at completion (respects sound settings)
- [ ] At least 12 tests

### Spec 6.2b — Prayer Length Options

- **ID:** `round3-phase06-spec02b-prayer-length-options`
- **Size:** M
- **Risk:** Low (purely additive; uses existing activity points and timer infrastructure)
- **Prerequisites:** 6.2 (Quick Lift)
- **Goal:** Fill the gap between Quick Lift's 30-second "pray for someone on my feed" moment and the full Daily Hub meditation flow. Users pick a length — 1 minute, 5 minutes, or 10 minutes — and enter a guided prayer session with gentle prompts interleaved with deliberate silence. The guided prompts exist to remove the "what do I say" hesitation that stops some people from praying longer, while the silences exist because prayer is not a podcast. This is the spec for users who want to sit with prayer rather than react to it.

**Approach:** New "Pray" tab surface at `/daily?tab=pray&length={1|5|10}` with a length picker (three frosted-glass buttons) as the default view. Tapping a length transitions into a full-screen timer view with a centered countdown, a prompt that fades in and out every 30–90 seconds, and an always-visible "End early" button. Prompts come from a length-specific array; each session picks prompts in shuffled order so consecutive sessions feel fresh. Silence between prompts is intentional and intentionally longer than most apps are comfortable with. The session ends with a single word: "Amen." and fades to a summary card showing "You prayed for X minutes" (no streak pressure, no comparison, no share prompt).

**Prompt arrays (authored in the Copy Deck):**

- **1-minute session:** 1–2 prompts total. Example: "Breathe. What's heavy right now?" → 45 seconds of silence → "Amen."
- **5-minute session:** 4–5 prompts. Examples: "Who needs prayer?" / "Name what hurts." / "Thank God for something small." / "Ask for what's needed." → interleaved with ~45-second silences.
- **10-minute session:** 7–8 prompts. Longer silences (~75 seconds). Prompt arc moves from gathering ("Settle. Notice your breath.") through intercession ("Who comes to mind?") to gratitude ("What is good right now?") to closing ("Rest in this. Amen.").

**Activity integration:** Each completed session (defined as reaching the final "Amen." screen, NOT just starting) fires `recordActivity('pray', { source: 'guided_session', duration_seconds: 60|300|600 })`. The existing Pray activity awards its standard points (10 per Decision 5); session length does NOT multiply points (anti-pressure: longer sessions aren't "worth more" — every prayer counts). Early exit (tapping "End early") also records the activity with an `ended_early: true` flag and the elapsed seconds, so the backend has honest data about session completion rates — useful for product decisions, never shown to the user.

**Anti-pressure design:**

- "End early" button visible the entire session (never hidden, never requires confirmation)
- No streak impact for ending early — activity still counted
- No "you almost made it!" guilt copy on early exit
- No "session X of Y" progress bar (no quota feeling)
- Completion screen is quiet: "You prayed." Not "Great job!" or "You did it!"
- No sharing prompt after session ends
- No prompt shaming: if the user stares at the screen for all 10 minutes without doing anything, the session still completes as a valid prayer

**Audio:** Optional ambient sound selection (leverages Phase 6's Sound Effects settings) — user can pick from silence (default), light ambient (existing audio from Music feature), or a soft chime at session end only. Audio preference is sticky across sessions (stored in `wr_prayer_session_audio_preference`).

**Files to create:**

- `frontend/src/pages/daily/PraySession.tsx`
- `frontend/src/components/daily/PrayLengthPicker.tsx`
- `frontend/src/components/daily/PrayTimer.tsx`
- `frontend/src/components/daily/PrayCompletionScreen.tsx`
- `frontend/src/constants/pray-session-prompts.ts`
- `__tests__/*.test.tsx` for each

**Files to modify:**

- `frontend/src/pages/Daily.tsx` (or equivalent) — mount the Pray tab
- `.claude/rules/11-local-storage-keys.md` — document `wr_prayer_session_audio_preference`

**API changes:** None beyond the existing `POST /api/v1/activity` endpoint (dual-write handles session completion).

**Copy Deck:**

- Length picker labels: "1 minute", "5 minutes", "10 minutes"
- Length picker subtitles: "Quick pause", "Settled prayer", "Deep sit"
- Completion: "You prayed."
- Early exit: "End early"
- Amen screen: "Amen."
- (Prompts live in `pray-session-prompts.ts` — full arrays in Copy Deck constants file)

**Anti-Pressure Copy Checklist:** (a) no comparison ✓ (b) no urgency ✓ (c) no exclamation points near vulnerability ✓ (d) no therapy-app jargon ✓ (e) no streak-as-shame ✓ (f) no false scarcity ✓

**Acceptance criteria:**

- [ ] Three-button length picker on Daily Hub Pray tab
- [ ] Full-screen timer renders countdown, current prompt, and End-early button
- [ ] Prompts fade in/out with CSS transitions (respects prefers-reduced-motion — crossfade becomes instant swap)
- [ ] Prompt order shuffled per session (same prompt pool but different sequence)
- [ ] Session completes with "Amen." screen and fires `recordActivity('pray', {...})`
- [ ] Early exit still records activity with `ended_early: true` flag
- [ ] Audio preference persisted to localStorage and respected on subsequent sessions
- [ ] No streak penalty for early exit
- [ ] URL query param `?length=5` deep-links into a 5-minute session directly (for notification integration later)
- [ ] Screen reader announces each prompt as `role="status"` (non-intrusive)
- [ ] At least 12 tests covering prompt rotation, activity recording, early-exit flow, length deep-link

**Testing notes:**

- Unit tests verify prompt shuffling and duration math
- Integration tests use fake timers (Vitest) to advance time quickly and verify full session flow
- Playwright test covers a 1-minute session end-to-end (realistic timing)

**Notes for plan phase recon:**

1. Confirm the existing Music feature's audio component is reusable (or whether to build a tiny new audio wrapper)
2. Verify `recordActivity` accepts arbitrary metadata object (should per Decision 5's API shape)
3. Decide whether to support custom length (e.g., user-picked 3 minutes) — recommendation: NO, three options keep the decision cheap

**Out of scope:**

- Custom prayer prompts (user-authored)
- Sharing a prayer session with a friend ("pray together for 5 minutes")
- Voice-guided sessions (audio narration of prompts) — accessibility consideration, probably phase-15+
- Specific prayer lists loaded into session (e.g., "pray for everyone on my prayer list") — different feature, different spec

**Out-of-band notes for Eric:** The silences matter more than the prompts. Test with 60-second silences first; if they feel too long, shorten to 45. Do not shorten below 30 — there's research on meditation apps showing that anything under 30 seconds between prompts trains users out of actually settling. The "End early" button being always-visible is non-negotiable; every hidden-exit app feels hostile within two sessions.

---

### Spec 6.3 — Night Mode

- **ID:** `round3-phase06-spec03-night-mode`
- **Size:** L
- **Risk:** Medium
- **Prerequisites:** 6.2
- **Goal:** Between 9pm and 6am local time, Prayer Wall enters Night Mode automatically: dimmed accent colors, softened heading copy, a quiet header chip ("Night Watch"), and gentler microcopy throughout. User can override (always-night or never-night in settings).

**Approach:** New `useNightMode()` hook that reads local time and a settings preference. Returns `boolean`. Prayer Wall page wrapper applies a `night-mode` className when active. CSS adjusts accent opacity and replaces specific copy strings with night variants from a `night-mode-copy.ts` constants file. The "Night Watch" chip appears in the header with a Lucide `Moon` icon. Settings adds a Night Mode preference (auto, always on, always off).

**Files to create:**

- `frontend/src/hooks/useNightMode.ts`
- `frontend/src/constants/night-mode-copy.ts`
- `frontend/src/components/prayer-wall/NightWatchChip.tsx`

**Files to modify:**

- `frontend/src/pages/PrayerWall.tsx` (apply night mode className)
- All Prayer Wall pages
- `frontend/src/index.css` (night mode styles)
- Settings page (Night Mode toggle)

**Acceptance criteria:**

- [ ] Night Mode auto-enables between 9pm and 6am local time
- [ ] User can override in settings (auto / always on / always off)
- [ ] Active Night Mode applies dimmed accents
- [ ] Heading and CTA copy swaps to night variants
- [ ] Night Watch chip visible in header
- [ ] No flash of un-night-modded content on page load (SSR-safe via local storage hint)
- [ ] At least 10 tests

### Spec 6.4 — 3am Watch

- **ID:** `round3-phase06-spec04-three-am-watch`
- **Size:** L
- **Risk:** HIGH (crisis-adjacent feature; must handle mental-health content with extreme care; failure mode is a user in acute distress not being served appropriately)
- **Prerequisites:** 6.3 (Night Mode)
- **Runtime-gated dependencies:** 10.5 (three-tier escalation pipeline) and 10.6 (automated flagging) — the feature's code ships in Phase 6 but the Watch view remains user-invisible (showing the "Watch is temporarily unavailable" message) until the Phase 10 crisis classifier is live; the graceful-degradation path documented in this spec is the load-bearing mechanism that makes shipping-before-10.5/10.6 safe
- **Goal:** Between 11pm and 5am in the user's local timezone, the Prayer Wall enters a quieter, more reverent mode that gently surfaces mental-health-category and crisis-flagged posts for users who want to keep watch over others in the hardest hours. This is the feature that distinguishes Worship Room from every other prayer app — an explicit acknowledgement that the worst moments happen at 3am and that someone being awake and witnessing matters. Done wrong, this feature turns crisis content into spectacle. Done right, it's the single most Christ-like feature in the app.

**Approach:** 3am Watch is a NIGHT-MODE-GATED view variant, not a separate page. When Night Mode (6.3) is active AND the user has opted into 3am Watch (default OFF — explicit opt-in required), the Prayer Wall header shows a small "Watch is on" indicator, and the default feed sort prioritizes three slices: (1) crisis-flagged posts from the last 24 hours, (2) mental-health-category posts from the last 12 hours, (3) the user's friends' posts from the last 48 hours. Regular prayer content still appears; it's just not what the Watch view leads with. This is a re-sort, not a filter — nothing is hidden, only reorganized.

**The opt-in gate (load-bearing):**

Opting into 3am Watch is a deliberate choice the user makes in Settings, NOT something they discover accidentally at 2am. The setting copy explicitly names the tradeoff: "You'll see mental-health and crisis-flagged posts first during night hours. Some content may be hard to read." A confirmation modal on toggling ON lists what the user is agreeing to witness. Toggling OFF is one tap with no confirmation. The app NEVER prompts users to turn 3am Watch on — no first-visit walkthrough step, no "you might like this feature" card, no notification. Users discover it by reading Settings or by a friend telling them. This is deliberately gatekept because the feature is not for everyone, and auto-enrollment would cause real harm.

**Trust level gate:**

3am Watch is only available to users at Trust Level 2 (Member) or higher (per Phase 10.4 trust levels). New accounts (Trust Level 0 — Visitor) and recent accounts (Trust Level 1 — New) cannot opt in. Rationale: the feature grants earlier access to crisis-flagged content, which is a sensitivity privilege that should track the user's demonstrated commitment to the community. A throwaway account cannot opt into seeing the most vulnerable content in the system.

**What the user sees at 3am:**

- Header: "Watch is on" in Lora italic, muted color, non-interactive. Next to it, a small crescent-moon icon. Below: "It's quiet here. You're awake." (the exact copy matters — no emoji, no "thank you for watching," no performative welcome).
- Feed sort (top-down, within Night Mode visual treatment):
  1. Crisis-flagged posts from last 24h (ALWAYS shown first if any exist — never buried)
  2. Mental-health category posts from last 12h, sorted by `last_activity_at DESC`
  3. User's friends' posts from last 48h
  4. Regular feed (sorted by `last_activity_at DESC`)
- Each slice has a subtle section divider ("From the last day" / "Friends & family" / "Also here today") — NOT labels like "Crisis" or "Mental health" that would other-ize vulnerable posts.
- QOTD is suppressed during Watch hours (discussion prompts feel wrong at 3am).
- Compose-FAB is present but with altered copy: "Write something" (shorter, quieter than daytime's "Share a prayer request").

**What the author of a crisis-flagged post sees:**

- They don't see any special treatment — the post renders normally on their own view.
- They are NOT notified that their post is being shown in 3am Watch (would feel surveillant).
- Crisis-flagged content already routed through Phase 10.5's three-tier escalation (green/yellow/red). 3am Watch does NOT change that routing — it only changes who sees the post first in the feed. Red-tier content is already routed to moderators via 10.5 regardless of Watch.

**Interaction defaults (quiet-mode design):**

- Pray reactions work normally (including Light a Candle, which glows warmer amber in Night Mode)
- Comments are encouraged but pre-fill in the composer with a gentle reminder: "Simple presence matters. You don't need to fix it." (renders above the textarea, muted, dismissible per session)
- Share-as-image disabled on crisis-flagged posts during Watch (prevents well-intentioned screenshots of vulnerable content from spreading off-platform)
- Report and Block actions remain available as always

**Timezone semantics:**

- "3am" is user's local timezone (per Spec 1.3b timezone column)
- Window: 11pm to 5am local time (6-hour span)
- If the user changes timezone mid-window (e.g., traveling), Watch transitions cleanly on the next render; no forced logout or view reset
- Daylight saving boundaries: the 6-hour span is computed against the current timezone offset at render time; a short "spring forward" or "fall back" might cause a 5-hour or 7-hour window once a year — acceptable.

**Analytics / telemetry (what we explicitly do NOT track):**

- No per-post view tracking during Watch hours (would feel surveillant on content where users are at their most vulnerable)
- No "engagement time during Watch" metric — deliberately anti-metrics
- No aggregate "how many people were Watching last night" metric surfaced to users (would turn it into a community-theater badge)
- Aggregate anonymous daily-active count available to Eric for capacity planning only, never surfaced in-app

**Accessibility:**

- All Night Mode accessibility requirements inherited (contrast, reduced-motion)
- Section dividers have proper `<h2>` semantic heading structure so screen readers can navigate
- Crescent-moon icon is decorative; the "Watch is on" label is the accessible name
- `prefers-reduced-motion` disables the subtle breathing-glow animation on the header indicator

**Anti-pressure design (load-bearing):**

- NEVER surface "N people are watching tonight" counters
- NEVER prompt users to turn Watch on
- NEVER badge or gamify Watch usage (no "100-night Watcher" achievement)
- NEVER send push notifications when new crisis content appears during Watch (would train users into crisis-chasing behavior)
- NEVER auto-reply to crisis-flagged posts with AI-generated comfort (AI-generated responses to crisis are explicitly forbidden by Universal Rule 13)
- Feed re-sort is DETERMINISTIC, not algorithmic — same inputs produce same order for any user. No ML ranking, no "personalized" surfacing of crisis content.

**Hard safety requirements:**

- Crisis resources banner is ALWAYS visible during Watch hours at the top of the feed (not just on crisis-flagged posts). Standard "988 Suicide & Crisis Lifeline" + "Crisis Text Line: Text HOME to 741741" + link to Phase 7.5 Local Support counselors. This is permanent infrastructure during Watch, not conditional on content.
- If the backend crisis classifier is UNAVAILABLE (Redis down, classifier service down), 3am Watch DISABLES itself entirely and shows a quiet "Watch is temporarily unavailable" message. Users fall back to standard Night Mode. Rationale: the feature's safety model depends on crisis classification being live; without it, prioritizing "mental-health-looking" content without knowing which is crisis-flagged risks the wrong content surfacing.
- Red-tier (Phase 10.5) content is ALWAYS routed to moderators in real-time regardless of Watch. Watch does not replace the escalation pipeline.

**Files to create:**

- `frontend/src/components/prayer-wall/WatchIndicator.tsx` (header badge)
- `frontend/src/components/prayer-wall/WatchDivider.tsx` (section labels)
- `frontend/src/components/prayer-wall/CrisisResourcesBanner.tsx` (always-visible at Watch)
- `frontend/src/components/settings/WatchToggle.tsx` (opt-in toggle with confirmation modal)
- `frontend/src/hooks/useWatchMode.ts` (combines Night Mode + timezone + user opt-in)
- `frontend/src/constants/watch-copy.ts` (all Watch strings)
- `backend/src/main/java/com/worshiproom/feed/WatchFeedService.java` (feed re-sort logic)
- `backend/src/test/java/com/worshiproom/feed/WatchFeedServiceIntegrationTest.java`
- `__tests__/*.test.tsx` for each frontend component

**Files to modify:**

- `PrayerWallFeed.tsx` — consume `useWatchMode()`, pass sort preference to API
- `GET /api/v1/posts` — accept optional `?watch=true` param, re-sort accordingly
- Settings page — mount WatchToggle in a dedicated "Sensitive features" section
- OpenAPI spec — document the `?watch` param
- `.claude/rules/11-local-storage-keys.md` — document `wr_settings.prayerWall.watchEnabled`

**API changes:**

- `GET /api/v1/posts?watch=true` — returns feed in 3am-Watch sort order (crisis first, MH second, friends third, regular fourth). Server validates: user has `watchEnabled=true`, user is at Trust Level ≥ 2, it's currently within the user's 11pm-5am local window, crisis classifier service is UP. If any validation fails, falls back to regular sort and sets `meta.watch_declined_reason` so the client can show the "temporarily unavailable" message if relevant.

**Copy Deck:**

- Watch indicator: "Watch is on"
- Watch subhead: "It's quiet here. You're awake."
- Compose-FAB during Watch: "Write something"
- Section dividers: "From the last day" / "Friends & family" / "Also here today"
- Composer pre-fill reminder: "Simple presence matters. You don't need to fix it."
- Settings toggle label: "3am Watch"
- Settings description: "During night hours, the Prayer Wall leads with mental-health and crisis-flagged posts. Some content may be hard to read. Off by default — turn on only if you're ready to keep watch."
- Settings confirmation modal header: "Turn on 3am Watch?"
- Settings confirmation body: "You'll see mental-health and crisis-flagged posts prioritized in the feed between 11pm and 5am your time. Nothing is hidden from view. You can turn this off anytime."
- Settings confirmation primary: "Yes, turn on"
- Settings confirmation secondary: "Not right now"
- Unavailable fallback: "Watch is temporarily unavailable. Resuming regular Night Mode."
- Trust-level gate message: "3am Watch becomes available after you've been active on Worship Room for a while."
- Crisis resources banner: "If you're in crisis: call or text 988 (US) / Crisis Text Line 741741 / find nearby counselors"

**Anti-Pressure Copy Checklist:** (a) no comparison ✓ (b) no urgency ✓ (c) no exclamation points near vulnerability ✓ (d) no therapy-app jargon ✓ (e) no streak-as-shame ✓ (f) no false scarcity ✓

**Anti-Pressure Design Decisions:**

- Opt-in default OFF — users must explicitly choose Watch
- No app prompt to turn Watch on
- No gamification, badging, or engagement metrics
- No per-post view tracking during Watch hours
- No AI-generated comfort responses
- Deterministic sort, no algorithmic personalization
- Crisis resources banner is always visible during Watch
- Trust-level gated (minimum Level 2)
- Watch disables itself if crisis classifier is down
- No push notifications for new Watch content
- Share-as-image disabled on crisis-flagged posts during Watch

**Acceptance criteria:**

- [ ] Watch is available only when: Night Mode is active AND user has `watchEnabled=true` AND user is Trust Level ≥ 2 AND current time is within user's 11pm-5am local window AND crisis classifier service is reachable
- [ ] Default `watchEnabled` is `false` for all new and existing users
- [ ] Settings toggle shows a confirmation modal when turning ON; toggles OFF with one tap and no confirmation
- [ ] Settings shows the trust-level-gate message for users below Level 2 (toggle disabled but explained)
- [ ] API endpoint validates all five preconditions; any failure returns a normal sort with `meta.watch_declined_reason`
- [ ] Feed re-sort returns slices in the exact documented order (crisis 24h → MH 12h → friends 48h → regular)
- [ ] No slice is ever hidden from the feed — re-sort only, never a filter
- [ ] QOTD suppressed during Watch hours
- [ ] Compose-FAB copy changes to "Write something" during Watch
- [ ] Composer pre-fills the "Simple presence matters" reminder above textarea, dismissible per session
- [ ] Section dividers render between slices (NOT labeled by slice content, labeled by temporal framing)
- [ ] Crisis resources banner renders at top of feed during ALL Watch sessions (not conditional on content)
- [ ] Crisis resources banner is accessible via keyboard and screen reader as a `role="complementary"` landmark
- [ ] Share-as-image button disabled on crisis-flagged posts during Watch
- [ ] Light a Candle reaction renders with warmer amber hue during Night Mode (per 6.3)
- [ ] Red-tier escalation pipeline from 10.5 fires regardless of Watch being on or off
- [ ] Post authors see no indication their post is being surfaced in Watch
- [ ] No Watch-related telemetry sent per-post-view
- [ ] Watch automatically transitions off at user's 5am local time (verified by fake-clock integration test)
- [ ] Timezone changes mid-session transition cleanly (integration test: change user timezone, next render reflects new window)
- [ ] Daylight saving boundary handled correctly (integration test at DST transition dates)
- [ ] "Watch temporarily unavailable" message shows when crisis classifier is down (integration test shuts down classifier, asserts message and fallback to regular Night Mode)
- [ ] Accessibility: section dividers are semantic `<h2>` elements with accessible names
- [ ] Accessibility: reduced-motion disables breathing-glow animation on Watch indicator
- [ ] No push notifications fire from Watch-specific logic
- [ ] Trust level gate is server-enforced (modifying client localStorage to set Trust Level 2 doesn't grant Watch)
- [ ] Settings toggle copy passes brand voice review
- [ ] Watch indicator icon is decorative (`aria-hidden="true"`), label is accessible
- [ ] At least 30 tests covering validation gates, sort correctness, timezone transitions, classifier-down fallback, trust-level enforcement, crisis banner visibility, composer reminder behavior, accessibility

**Testing notes:**

- Integration tests MUST cover the "classifier down → graceful fallback" path. This is the highest-stakes safety requirement.
- Use fake timers to simulate the 11pm-5am window and DST transitions
- Integration test with seeded crisis-flagged, MH-category, friend, and regular posts to verify sort slicing
- Unit test that validates the copy constants don't contain banned phrases (comparative, urgent, exclamation-near-vulnerability)
- Playwright: opt into Watch, confirm modal content, check feed order, verify crisis banner is present, toggle off, verify clean exit
- Accessibility test (axe-core + VoiceOver walkthrough of Watch feed)
- Security test: attempt to force-enable Watch via localStorage manipulation, verify server rejects

**Notes for plan phase recon:**

1. Confirm the exact crisis classifier health-check endpoint and timeout budget (default: 2 seconds; beyond that, fall back)
2. Verify 988 / Crisis Text Line URLs are stable and correctly formatted for the user's region (currently US-focused; document the deferred-to-future-wave internationalization)
3. Confirm Trust Level 2 (Member) is reachable within a reasonable time for genuine users (per Phase 10.4 thresholds — should be a few days of active engagement, not weeks)
4. Decide: should "Watch is on" indicator persist visibly when user scrolls, or scroll-hide with the header? Recommendation: persist, because it's a mode indicator users need to see to remember which feed they're in.
5. Verify Phase 10.5 three-tier escalation pipeline fires synchronously on post creation (not just at moderator-review time) so red-tier routing isn't delayed by Watch sorting.

**Out of scope:**

- Watch equivalent during other hours (there are dawn/dusk modes we might imagine, but MVP is night-only)
- Auto-entry into Watch for known insomniacs (would require sensitive user profiling)
- Group Watch sessions ("5 of us are awake tonight")
- Voice-led Watch prayers
- Sleep-tracker integration (Apple Health, Fitbit)
- International localization of crisis resources (deferred; US-centric for MVP)
- Watch-specific analytics dashboard for Eric
- AI-generated comfort for crisis posts (explicitly forbidden; Universal Rule 13)

**Out-of-band notes for Eric:** This is the most carefully-scoped feature in the wave and it's the one I'd most strongly urge you to execute LAST among the hero features, after 10.5 and 10.6 have been battle-tested in production for at least 30 days. The safety model requires the crisis classifier to be reliable before this feature surfaces prioritized crisis content. Also: do NOT let this feature be your marketing hook for Worship Room. If users hear about it before they understand the app's voice and values, they'll enroll for the wrong reasons (curiosity, savior-complex, performative care). Users who discover it organically after using the app for weeks will have the right posture. If you ever feel pressure to promote it, re-read this paragraph. Finally: the "Watch is temporarily unavailable" fallback is a FEATURE, not a bug. An app that gracefully degrades under partial-outage conditions is trustworthy. Users will remember the one time they saw that message far less than they'd remember the one time Watch surfaced a crisis post to a user whose classifier had broken an hour earlier.

---

### Spec 6.5 — Intercessor Timeline

- **ID:** `round3-phase06-spec05-intercessor-timeline`
- **Size:** L
- **Risk:** Medium-High (privacy model extends Prayer Receipt's author-only attribution across time — errors compound; aggregation performance is non-trivial at scale)
- **Prerequisites:** 5.6 (Redis cache), 6.1 (Prayer Receipt — shares privacy model)
- **Goal:** Give the post author a private, date-organized view of every intercessor who has prayed for any of their posts over time. Not a counter, not a leaderboard — a _witness log_. For a user walking through a long season (a chronic illness, a complicated pregnancy, unemployment, grief), the Intercessor Timeline is the artifact that says "you were not alone between March and August; here are the days people were praying." This is distinct from Prayer Receipt (which is a single post's current state) — this is the author's long-form record of being upheld.

**Approach:** A new private page at `/u/:username/intercessor-timeline` accessible only to the profile owner (AuthZ: requester.id === profile.user_id). Server aggregates `post_reactions` rows where `reaction_type='praying'` across all of that user's posts, grouped by date, with per-day intercessor lists. Heavy Redis caching (5-minute TTL) because this is an expensive aggregation that changes slowly from the author's POV. Three view modes: "By day" (default, calendar-style heatmap), "By post" (collapsed per-post summary), and "By person" (which friends have prayed most, non-friends aggregated as "friends").

**The three views:**

**1. By day (default calendar heatmap):**

A month-grid calendar where each day cell shows: a color intensity based on count of intercessors that day (0 = empty, 1 = pale, 2-5 = medium, 6+ = deep — using the Light-a-Candle amber palette, not the Pray praying-purple palette, so it evokes "candles lit for you" rather than "engagement heatmap"). Tapping a day opens a drawer listing intercessors for that day (friends by name+avatar, non-friends as "A friend" — same attribution rules as Prayer Receipt). Month navigation back to the user's join date; forward-navigation disabled beyond today. Under the heatmap: a quiet subhead counts the total days-with-any-prayer (e.g., "87 days with prayer since you joined — you have been kept").

**2. By post:**

A scrollable list of the author's posts (including expired and answered ones) with each row showing: post excerpt (first 80 chars), post date, total intercessor count, sparkline of prayers-over-time (subtle, decorative). Tapping a row opens that post's full Prayer Receipt detail (reuses the Spec 6.1 modal component). Sort: most-recent-post-first by default, with a filter to show only answered prayers (joyful re-read) or only prayers with zero intercession (for introspection — DELIBERATELY NOT HIGHLIGHTED, accessible via a "show sparse posts" checkbox in the filter, so the default view doesn't expose "zero" as a problem).

**3. By person:**

Only shows FRIENDS (by design — non-friend intercessors are never individually attributed here). Each row: friend's avatar, display name, count of times they've prayed for the author across all posts, most recent date they prayed. Sort: most prayed first. Includes a quiet note at the bottom: "{N} more people have prayed for you who aren't shown here." That line aggregates all non-friend intercessions without exposing identity. If the author has zero friend-intercessors, the whole view shows a gentle empty state ("When friends pray for you, they'll show up here") without shaming.

**Privacy model (inherits from 6.1, extended across time):**

- ONLY the profile owner can access the timeline endpoint. All other requesters get 403.
- Within the timeline, the same attribution rules as Prayer Receipt: friends by display name + avatar, non-friends aggregated as "friends" with generic gradient avatars and no individual identity.
- The "By person" view ONLY lists friends. Non-friend intercessors are aggregated into the footer note; never individually named or counted.
- The timeline MUST NOT expose information the author couldn't already get from viewing each post's individual Prayer Receipt. This is a different presentation of data the author already owns, NOT an escalation of attribution power.
- Anonymous post intercessions: the post is still the author's; the intercessor identities still flow in per the author-only attribution rules. No special anonymous handling required.
- If the author has blocked a user, that user's past prayers DO NOT appear in the timeline. Post-block, they simply disappear from the attribution (counts adjust silently). Unblocking restores them. (Side effect: block-counts-as-privacy works both directions.)

**Shareable annual summary (year-in-review companion):**

Once per year (December), authors can generate a "Year of Prayer" image from the timeline — a stylized visualization of days-with-prayer across the year, total days upheld, a chosen scripture, and subtle branding. This companion to Phase 13's year-in-review feature is OPTIONAL — a button, not a nag. PII-stripping reused from 6.7. User can review and choose to save/share/skip; no auto-post to any feed. Rate-limited to 1 generation per day per user (the image is expensive to generate and should be deliberate).

**Anti-pressure design (load-bearing):**

- NO public version of this page. Ever. Even in an aggregated form. This is not a "leaderboard of the most-prayed-for."
- NO "your prayer coverage score" or percentage-of-days-with-prayer metric. The raw count is available, but no derived shame number.
- NO comparison language ("you have been prayed for more than 40% of users" — absolutely forbidden).
- Empty days in the heatmap render as EMPTY (no color, no border, no interaction), not as a conspicuous gray "zero day" that would draw the eye. Absence is absence.
- "Show sparse posts" filter in By-post view is opt-in, deliberately buried — users who want to reflect on zero-intercession posts can; the default view doesn't showcase them.
- Calendar heatmap colors are warm (amber candle palette) not clinical green-to-red. This is a record of being kept, not a commit graph.
- Zero-friends empty state in By-person view is gentle ("when friends pray for you, they'll show up here") — never shaming or urging friend-acquisition.
- Year-of-Prayer shareable is optional, rate-limited, and never auto-suggested via notification or banner. Authors discover it by scrolling the timeline, not by prompt.

**Performance & caching:**

- Aggregation query is expensive (joins `posts` and `post_reactions`, groups by date, collects intercessor IDs). Not a query you run on every page load.
- Cache the three view responses in Redis (per 5.6) with TTL 5 minutes per user. Cache key: `cache:intercessor-timeline:{userId}:{viewMode}:{month?}`.
- Cache invalidation on: new reaction toggle (any author post), friendship status change (could shift friend/non-friend attribution), profile block (could remove someone from the timeline).
- Server-side pagination: By-day view renders one month at a time; By-post uses `limit=20` default with pagination; By-person has a reasonable hard cap of 100 (anyone with more than 100 friend-intercessors can't need a full list — the footer aggregate covers tail).

**Accessibility:**

- Calendar heatmap is not just color-based — screen readers announce "April 14: 3 intercessors" for non-zero days, "April 14: no prayers recorded" for empty days (distinct from "March 32" which is outside the month).
- Heatmap colors meet WCAG AA contrast even at the palest shade against dark background (tested against 6.3 Night Mode's darkest background too).
- Tab order: month navigation → day cells (as a grid) → total summary → view-mode switcher.
- Day cells respond to Enter/Space to open the intercessor drawer; drawer traps focus.
- `prefers-reduced-motion` disables the subtle "new prayer arrived" pulse animation on the current day.

**Files to create:**

- `frontend/src/pages/IntercessorTimeline.tsx`
- `frontend/src/components/prayer-wall/TimelineHeatmap.tsx`
- `frontend/src/components/prayer-wall/TimelineByPostList.tsx`
- `frontend/src/components/prayer-wall/TimelineByPersonList.tsx`
- `frontend/src/components/prayer-wall/TimelineDayDrawer.tsx`
- `frontend/src/components/prayer-wall/YearOfPrayerImage.tsx`
- `frontend/src/hooks/useIntercessorTimeline.ts`
- `frontend/src/constants/timeline-copy.ts`
- `backend/src/main/java/com/worshiproom/post/IntercessorTimelineController.java`
- `backend/src/main/java/com/worshiproom/post/IntercessorTimelineService.java`
- `backend/src/main/java/com/worshiproom/post/dto/TimelineByDayResponse.java`
- `backend/src/main/java/com/worshiproom/post/dto/TimelineByPostResponse.java`
- `backend/src/main/java/com/worshiproom/post/dto/TimelineByPersonResponse.java`
- `backend/src/test/java/com/worshiproom/post/IntercessorTimelineIntegrationTest.java`
- `__tests__/*.test.tsx` for each frontend component

**Files to modify:**

- `UserProfilePage.tsx` (or equivalent) — add link to "Your intercessor timeline" in the owner-only actions section
- OpenAPI spec — document the three endpoints
- `.claude/rules/11-local-storage-keys.md` — no new keys (timeline is fully server-side)

**API changes:**

- `GET /api/v1/users/me/intercessor-timeline/by-day?month=YYYY-MM` — returns `{ data: { days: [{ date, count, intercessors: [...] }], month_summary: { total_days_with_prayer, total_prayers } }, meta }`. AuthN required; endpoint is always `/users/me` (no ability to request another user's timeline).
- `GET /api/v1/users/me/intercessor-timeline/by-post?limit=20&offset=0&include_sparse=false` — paginated post list with per-post prayer counts and sparklines.
- `GET /api/v1/users/me/intercessor-timeline/by-person` — friend-only intercessor leaderboard (ordered most-prayers-first) + aggregated non-friend count footer.
- `POST /api/v1/users/me/intercessor-timeline/year-of-prayer-image` — generates the annual summary PNG; rate-limited 1/day per user.

**Copy Deck:**

- Page heading: "Your intercessor timeline"
- Subhead: "A record of being kept."
- Tab labels: "By day", "By post", "By person"
- By-day total summary: "{N} days with prayer since you joined — you have been kept."
- By-post empty: "When people pray for your posts, this is where you'll see it unfold."
- By-post sparse filter label: "Show posts with no intercession"
- By-person empty: "When friends pray for you, they'll show up here."
- By-person footer: "{N} more people have prayed for you who aren't shown here."
- Day drawer header: "{Date}"
- Day drawer friend row: "{displayName} · prayed"
- Day drawer non-friend aggregated: "{N} others prayed"
- Year-of-Prayer button: "Save this year as an image"
- Year-of-Prayer modal header: "Your year of prayer"
- Empty heatmap year: "Your first year is still being written."
- Block-adjusted counts note (NOT shown to user; internal documentation): server silently excludes blocked-user prayers without informing the author

**Anti-Pressure Copy Checklist:** (a) no comparison ✓ (b) no urgency ✓ (c) no exclamation points near vulnerability ✓ (d) no therapy-app jargon ✓ (e) no streak-as-shame ✓ (f) no false scarcity ✓

**Anti-Pressure Design Decisions:**

- No public-facing version of the timeline
- No "coverage score" or percentage metric
- No comparative language or benchmarks
- Empty days render as empty (no conspicuous zero-markers)
- Sparse-post filter is opt-in and buried
- Calendar palette is warm amber (candle), not commit-graph red
- Zero-friends empty state is gentle, not urging
- Year-of-Prayer shareable is optional and not auto-prompted
- Rate-limited image generation
- Non-friend intercessors aggregated (footer line), never individually named or counted
- Blocked-user prayers silently disappear (no "X prayers were hidden due to blocks" exposure)

**Acceptance criteria:**

- [ ] Endpoint returns 403 when requester is not the profile owner (verified by seeding user A's timeline and fetching as user B)
- [ ] By-day view renders calendar heatmap with correct per-day intensity based on intercessor counts
- [ ] Heatmap color palette is amber/candle (not green commit-graph)
- [ ] Empty days render without color, border, or interaction; screen reader says "no prayers recorded"
- [ ] Heatmap intensity scale: 0=empty, 1=pale, 2-5=medium, 6+=deep; tested with boundary counts
- [ ] Day drawer opens on day click, lists friends by name, non-friends as "A friend"
- [ ] By-post view paginates correctly with `limit` / `offset`
- [ ] By-post view shows sparkline per post (count-over-time since post creation)
- [ ] "Show sparse posts" filter is unchecked by default
- [ ] When unchecked, posts with zero intercessions are HIDDEN from the By-post list
- [ ] When checked, all posts appear including zero-intercession ones
- [ ] By-person view lists ONLY friend intercessors (verified by seeding both friend and non-friend prayers)
- [ ] By-person footer aggregates non-friend count correctly
- [ ] By-person view hard cap of 100 friend-intercessors (beyond that, remainder rolls into footer aggregate)
- [ ] Year-of-Prayer button rate-limited to 1/day per user (4th attempt returns 429)
- [ ] Year-of-Prayer PNG generation reuses PII-stripping from Spec 6.7 and Spec 6.1
- [ ] Blocked-user prayers do NOT appear anywhere in the timeline (integration test: block user, verify past prayers disappear silently)
- [ ] Unblocking restores the previously-blocked user's past prayers (integration test)
- [ ] Redis cache with 5-minute TTL is honored for each view mode
- [ ] Cache invalidated on: new reaction toggle on author's post, friendship status change, block status change (three separate invalidation paths verified)
- [ ] Anonymous posts' intercessors appear correctly in the author's timeline (anonymity of the POST doesn't hide the intercessor from the AUTHOR)
- [ ] Private and friends-only posts' intercessors appear correctly in the author's timeline
- [ ] Heatmap navigates back to user's join date but NOT forward beyond today
- [ ] Tab order is logical and reaches all interactive elements
- [ ] Screen reader announces month navigation, day counts, and drawer content correctly
- [ ] `prefers-reduced-motion` disables the current-day pulse animation
- [ ] Heatmap colors pass WCAG AA contrast against dark Night Mode background
- [ ] Day drawer traps focus and closes on Escape
- [ ] Mobile viewport renders the heatmap with legible day cells (min 32px × 32px touch target)
- [ ] API response includes blocked-user-adjusted counts, NOT raw counts with notes about hidden prayers
- [ ] At least 28 tests covering authz, view modes, privacy attribution, cache invalidation, block semantics, accessibility, rate limits, PNG generation

**Testing notes:**

- Integration test: seed 12 months of post+reaction data across mixed friend/non-friend/blocked intercessors; fetch all three views; assert privacy attribution
- Integration test: block a user, assert timeline refetch shows adjusted counts and no trace of the blocked user; unblock, assert restoration
- Unit test: color intensity mapping for boundary counts (0, 1, 2, 5, 6, 100)
- Unit test: accessible name generation for each day cell state (empty, single prayer, multiple prayers)
- Playwright: navigate to own timeline, verify all three views render, open day drawer, close, toggle sparse-filter, generate year image
- Security test: user A attempts `GET /api/v1/users/me/intercessor-timeline/by-day` with user B's JWT manipulated — verify 403
- Performance test: user with 1000 posts and 10,000 total prayers across 2 years — verify By-day month load completes within 500ms with cache cold, 50ms with cache warm

**Notes for plan phase recon:**

1. Confirm the aggregation query performance at scale — worst-case user (10K+ prayers across 2 years) should load By-day view in <500ms uncached
2. Decide sparkline rendering approach: CSS-only (simple, small bundle) vs SVG (more flexible, slightly larger bundle). Recommendation: SVG via a tiny component.
3. Confirm timezone handling for day boundaries — uses author's timezone from Spec 1.3b so a 11:55pm prayer doesn't appear on the wrong day
4. Verify the block-cascading cache invalidation fires on `DELETE /api/v1/users/me/blocks/{userId}` (the unblock path must invalidate too)
5. Confirm the Year-of-Prayer companion relationship with Phase 13.3 Year-in-Review — are they separate features (my recommendation) or unified?

**Out of scope:**

- Public or aggregated community-level timelines ("most-prayed-for-users of the year")
- Timeline export in machine-readable format (the Spec 10.11 data export covers this; timeline is a viewing experience)
- Notifications about timeline milestones ("you've been prayed for 100 days!" — explicitly anti-anti-pressure)
- Comparing your timeline to a friend's (never)
- Shared timelines for couples or families (would require consent frameworks not in scope)
- Timeline-based AI insights or summaries

**Out-of-band notes for Eric:** The single subhead "A record of being kept" is doing a lot of work. It frames the feature as testimony rather than metric. If you ever feel tempted to change it to something like "Your prayer stats" or "Intercession metrics," stop and re-read this paragraph. The language is the feature as much as the data is. Also: I deliberately designed this to have three views because different users will relate to it differently — some will want the calendar (temporal), some will want the post list (contextual), some will want to see who has been faithful (relational). Don't cut any of the three views to reduce scope; each is the right view for someone. Finally: resist the urge to show "coverage %" or "prayer streak" anywhere in this feature. The whole point is that prayer is a gift, not a grind, and any metric that turns it into a grind is a design failure.

---

### Spec 6.6 — Answered Wall

- **ID:** `round3-phase06-spec06-answered-wall`
- **Size:** L
- **Risk:** Medium (celebration-space has subtle anti-pressure failure modes — comparative framing, prosperity-gospel adjacency, survivor bias)
- **Prerequisites:** 5.6 (Redis cache), Phase 3 complete (reads from `posts` with `is_answered=true`)
- **Goal:** A dedicated, always-on public surface at `/prayer-wall/answered` showing prayer requests that the author has marked as answered, with the praise/update text they chose to share. This exists for two reasons: (1) for users in the middle of a hard prayer to see that prayers DO get answered sometimes, as a quiet source of hope, and (2) for the community to celebrate with authors without the celebration being buried in the main feed. The hard design problem: celebration without comparison, gratitude without "you just need more faith" subtext, joy that doesn't accidentally shame people whose prayers haven't been answered yet.

**Approach:** `/prayer-wall/answered` renders a reverse-chronological feed of posts where `is_answered=true`, filtered to `visibility='public'` OR `visibility='friends' AND requester ∈ author's friends`. Same card component as the main feed (`PrayerCard.tsx` with `post.is_answered=true` triggering the answered-visual-variant), with the author's `answered_text` (the praise/update they chose to share) prominently rendered in a warmer color. A "Share your update" flow lets authors of answered prayers add or edit the `answered_text` after the fact. Reactions and comments work as normal, though reactions on answered posts use a distinct label ("Praising with you" instead of "Praying") and the Light a Candle reaction is replaced with a "Celebrate" reaction using a warm sunrise palette.

**The page structure:**

- Hero area (quieter than main feed): "Answered" heading in Fraunces, subhead in Lora italic: "Gratitude, not comparison."
- Short intro paragraph: "These are prayer requests whose authors chose to share an update. Many prayers are never 'finished' in the ways we expect. That doesn't mean they weren't heard. This page is for joy, not for keeping score."
- Optional filter chips: "All" (default), "Health", "Family", "Work", "Grief", "Gratitude" — no chip for "Mental Health" (reason: see below)
- Reverse-chrono feed of answered `PrayerCard`s

**Why no Mental Health filter:**

Mental-health prayers being "answered" is a genuinely complicated theological/clinical territory. A post like "prayed for relief from depression, it got better" can land well for one reader and terribly for another (who thinks "why hasn't mine gotten better?"). Rather than surface Mental-Health-category answered posts as a filtered collection, we just include them in "All" without their own filter chip. This prevents the subtle message that mental-health suffering is supposed to resolve on the same timeline as other suffering. Health and Grief are also sensitive, but their inclusion in filterable categories is a deliberate trade-off: Health because physical healing answers are often the most hopeful, Grief because "time healed" is a legitimate answer users celebrate. Mental Health is the only category we intentionally don't filter by.

**The "answered" lifecycle:**

- Author marks a prayer as answered via Spec 3.5's MarkAsAnsweredForm, which already lets them write `answered_text`
- On submit: post gets `is_answered=true`, `answered_at=NOW()`, appears on Answered Wall
- `answered_text` is optional. Posts can be answered without a praise/update text (author just wants to mark it done). The Answered Wall still shows them, but with a gentle fallback rendering ("A prayer was answered. No additional update was shared.")
- Author can later add or edit `answered_text` via "Share an update" action visible on their own answered posts (uses existing 5-minute edit window? NO — different semantics here: the answered_text is editable indefinitely, since hindsight shapes how we tell these stories. Edit history is NOT preserved — latest version wins)
- Author can UN-MARK as answered (sets `is_answered=false`, `answered_at=NULL`) in case they marked prematurely or changed their understanding of the situation. Removes from Answered Wall cleanly.

**Reactions on answered posts:**

- "Praying" reaction replaced by "Praising with you" (same mechanic, different label and icon — a soft sunrise / raised hands / "hallelujah" visual)
- "Light a Candle" reaction replaced by "Celebrate" (warm sunrise palette, different animation from the mourning-candle)
- Backend-wise, these are new `reaction_type` values: `'praising'` and `'celebrate'` alongside the existing `'praying'` and `'candle'`. CHECK constraint extended per Decision 5 pattern. Reaction endpoint from Phase 3.7 Addendum handles all four types transparently.
- Counts rendered separately: "12 praising with you · 3 celebrating"

**Comments on answered posts:**

- Comments work as usual. Brand voice guidance for commenters is softer: "Share in their joy. A few words is enough."
- Inline composer placeholder: "Say a word of celebration..."
- No auto-generated congratulations copy (AI-generated responses explicitly forbidden per Universal Rule 13, and even if allowed, would feel hollow here)

**Feed sort & pagination:**

- Default sort: `answered_at DESC` (most recently answered first)
- Secondary filter: `?category=health` narrows by post category
- Pagination: `?page=N&limit=20`, max `limit=50`
- Feed excludes answered posts whose author has since deleted the post or gone through account deletion (per Spec 10.11 — rendered as "Former member" per deleted-author rules would feel wrong on a celebration page; we just hide them)
- Feed INCLUDES answered posts that have expired (Testimonies never expire, but Prayer Requests do — expired-and-answered is a valid state and belongs on the Wall)

**Auth gating:**

- Logged-out: can view the Answered Wall (public content). Can read posts. CANNOT react or comment (tap triggers AuthModal).
- Logged-in: full interaction. Can mark own prayers as answered from this page via an "Add update" button visible on their own unanswered posts (shortcut link back to MarkAsAnsweredForm).
- Anonymous-posted prayers: author is still "Anonymous" on the Answered Wall, consistent with original post. The `answered_text` they write is their voice, but attribution stays as "Anonymous" per Decision 3.

**Anti-pressure design (load-bearing):**

- Page subhead explicitly states "Gratitude, not comparison" at the top of every view
- No "most-celebrated" or "most-reactions" sort option
- No streak or count of "how many answered prayers this week" community-wide
- No personalized "your answered prayers" mini-feed on this page (that's on the user's own profile Growth tab, where it belongs)
- No push notifications when a new post hits the Answered Wall (would create "celebration-chasing" patterns)
- No "Suggested prayers to pray" next to answered posts (the Answered Wall isn't an engagement funnel)
- Empty state (no answered posts in the viewer's visibility set): "When prayers are answered and shared here, you'll see them." — gentle, not urging
- NEVER surface aggregate metrics like "1,200 answered prayers shared so far" — would cheapen individual stories into counters
- Filter chips excluding Mental Health is a deliberate anti-pressure choice (see rationale above)

**Performance & caching:**

- Feed response cached in Redis (per 5.6) keyed by `(category?, page)`, TTL 2 minutes — answered feed changes slowly
- Cache invalidated on: any post `is_answered` transition (true→false or false→true), post content edit of an answered post
- Logged-in requests NOT cached per-user (auth gates on reactions already handled by frontend state; the feed response itself doesn't change per user for public/friend visibility because those filters are computed at query time)

**Accessibility:**

- Page has proper `<main>` landmark
- Hero subhead as `<h2>` within the main landmark
- Filter chips are keyboard-reachable, announce state ("Health, unselected" / "Health, selected")
- Answered variant of `PrayerCard` has accessible name including "answered" ("Sarah's prayer request, answered: Got the surgery approval")
- "Celebrate" reaction animation respects `prefers-reduced-motion` (falls back to a single static state)
- Color contrast of warmer answered-palette meets WCAG AA on all Night Mode and regular backgrounds

**Files to create:**

- `frontend/src/pages/AnsweredWall.tsx`
- `frontend/src/components/prayer-wall/AnsweredWallHero.tsx`
- `frontend/src/components/prayer-wall/AnsweredCategoryFilter.tsx`
- `frontend/src/components/prayer-wall/CelebrateReaction.tsx` (distinct from Light a Candle)
- `frontend/src/components/prayer-wall/AnsweredPostCard.tsx` (wrapper that composes PrayerCard with answered-variant props)
- `frontend/src/hooks/useAnsweredFeed.ts`
- `frontend/src/constants/answered-wall-copy.ts`
- `backend/src/main/java/com/worshiproom/post/AnsweredFeedController.java`
- `backend/src/main/java/com/worshiproom/post/AnsweredFeedService.java`
- `backend/src/main/resources/db/changelog/2026-04-22-002-extend-reaction-types-praising-celebrate.xml`
- `backend/src/test/java/com/worshiproom/post/AnsweredFeedIntegrationTest.java`
- `__tests__/*.test.tsx` for each frontend component

**Files to modify:**

- `PrayerCard.tsx` — accept `answeredVariant` prop, render warmer palette + `answered_text` prominently
- `InteractionBar.tsx` — swap "Praying" label to "Praising with you" and Light-a-Candle to Celebrate when rendering an answered post
- `MarkAsAnsweredForm.tsx` — no behavior change; already writes `answered_text` per Spec 3.5
- Feed sort logic — already supports `is_answered` filter; answered endpoint just parameterizes
- Router — add `/prayer-wall/answered` route
- Navbar — add "Answered" link in Prayer Wall section (visible to both logged-out and logged-in)
- OpenAPI spec — document the answered-feed endpoint and new reaction types

**Database changes:**

- Liquibase changeset: extend `post_reactions.reaction_type` CHECK constraint to allow `'praying'`, `'candle'`, `'praising'`, `'celebrate'`
- No schema shape change (still `(post_id, user_id, reaction_type)` composite PK per Decision 5)
- Rollback: revert CHECK constraint to previous list (data loss acceptable for forward-only migration discipline)

**API changes:**

- `GET /api/v1/posts/answered?category=&page=&limit=` — returns paginated answered posts, respects visibility rules, excludes deleted-author posts
- `POST /api/v1/posts/{id}/reactions` — already exists; now validates new `reaction_type` enum values
- OpenAPI spec updated

**Copy Deck:**

- Page title (browser tab): "Answered — Worship Room"
- Hero heading: "Answered"
- Hero subhead: "Gratitude, not comparison."
- Hero intro paragraph: "These are prayer requests whose authors chose to share an update. Many prayers are never 'finished' in the ways we expect. That doesn't mean they weren't heard. This page is for joy, not for keeping score."
- Filter chip "All": "All"
- Category chips: "Health", "Family", "Work", "Grief", "Gratitude" (no Mental Health chip)
- Empty state: "When prayers are answered and shared here, you'll see them."
- "Answered" badge on card: "Answered"
- Missing-answered-text fallback: "A prayer was answered. No additional update was shared."
- "Share an update" button (on author's own answered post without text): "Share an update"
- Un-mark-answered button (author's own post): "Un-mark as answered"
- Praising reaction label: "Praising with you"
- Celebrate reaction label: "Celebrate"
- Reaction count rendering: "{N} praising with you" / "{N} celebrating"
- Inline composer placeholder: "Say a word of celebration..."
- Navbar link: "Answered"
- Logged-out auth modal trigger (on reaction tap): "Sign in to celebrate with {author}"

**Anti-Pressure Copy Checklist:** (a) no comparison ✓ (b) no urgency ✓ (c) no exclamation points near vulnerability ✓ (d) no therapy-app jargon ✓ (e) no streak-as-shame ✓ (f) no false scarcity ✓

**Anti-Pressure Design Decisions:**

- Page subhead names the tension explicitly ("Gratitude, not comparison")
- No Mental Health filter chip (rationale in Approach section)
- No "most-celebrated" sort
- No community aggregate metrics
- No push notifications on new answered posts
- No engagement-funnel suggestions next to cards
- Empty state is gentle, not urging
- Celebrate reaction animation is optional (reduced-motion honored)
- Author can un-mark as answered without shame or friction
- Answered_text is optional and editable indefinitely (hindsight shapes how we tell these stories)
- Comment tone guidance ("A few words is enough") prevents over-performance

**Acceptance criteria:**

- [ ] `/prayer-wall/answered` renders for both logged-out and logged-in users
- [ ] Only posts with `is_answered=true` appear in the feed
- [ ] Private posts (`visibility='private'`) NEVER appear on the Answered Wall regardless of answer state
- [ ] Friends-only posts appear only for the author's friends
- [ ] Public posts appear for everyone
- [ ] Default sort is `answered_at DESC`
- [ ] Pagination works with `?page` and `?limit`
- [ ] Category filter chips filter feed (Health, Family, Work, Grief, Gratitude)
- [ ] No Mental Health filter chip (intentional omission verified)
- [ ] Filter "All" shows everything INCLUDING mental-health category answered posts
- [ ] Answered variant of PrayerCard uses warmer palette distinct from regular feed
- [ ] `answered_text` renders prominently when present
- [ ] Missing-answered-text fallback renders gracefully ("A prayer was answered. No additional update was shared.")
- [ ] "Praising with you" and "Celebrate" reactions render with distinct icons and counts from "Praying" and "Candle"
- [ ] Liquibase changeset extends CHECK constraint to include `'praising'` and `'celebrate'`
- [ ] Reaction endpoint accepts all 4 reaction types
- [ ] Reaction counts displayed separately per type
- [ ] Author can edit `answered_text` indefinitely via "Share an update" (no 5-minute window)
- [ ] Author can un-mark as answered, post disappears from Answered Wall
- [ ] Post re-marked as answered reappears with updated `answered_at`
- [ ] Expired Prayer Requests still appear on Answered Wall if `is_answered=true`
- [ ] Posts whose author is soft-deleted (within grace period) still appear with normal attribution
- [ ] Posts whose author is hard-deleted are excluded entirely from the Answered Wall (not rendered as "Former member")
- [ ] Anonymous-posted answered prayers retain "Anonymous" attribution
- [ ] Logged-out users see full feed but get AuthModal when trying to react or comment
- [ ] Logged-in users can react and comment normally
- [ ] Empty state renders when visibility rules leave no posts
- [ ] Navbar link routes to `/prayer-wall/answered`
- [ ] Page title and heading use Fraunces, subhead uses Lora italic
- [ ] Redis cache TTL 2 minutes verified
- [ ] Cache invalidated on any `is_answered` state change
- [ ] Cache invalidated on post content edit of an answered post
- [ ] Accessibility: hero is `<h1>`, subhead `<h2>`, filter chips keyboard-navigable
- [ ] Accessibility: answered card accessible name includes "answered"
- [ ] Accessibility: Celebrate reaction animation respects `prefers-reduced-motion`
- [ ] Color contrast of warmer palette passes WCAG AA on Night Mode + regular backgrounds
- [ ] Brand voice review of all copy strings passes
- [ ] At least 24 tests covering visibility rules, reaction types, cache invalidation, edit semantics, deleted-author handling, category filtering, a11y

**Testing notes:**

- Integration test: seed posts of each visibility × answered combination; verify correct subset appears for each requester type
- Integration test: soft-delete author, verify post still appears; hard-delete author, verify post disappears
- Integration test: un-mark-answered removes post from Answered Wall API response
- Unit test: Celebrate and Praising reactions save with correct `reaction_type` value
- Unit test: reaction count rendering when user has both Praising and Celebrate on the same post
- Playwright: navigate to Answered Wall, filter by category, try to react while logged-out (AuthModal appears), log in, react, un-react
- Accessibility test: axe-core on Answered Wall, VoiceOver spot-check

**Notes for plan phase recon:**

1. Confirm the reaction CHECK constraint update plays well with existing data (none should be affected since `'praising'` and `'celebrate'` don't yet exist)
2. Verify the Celebrate animation bundle cost stays under budget (target: under 5 KB gzipped for the animation component)
3. Confirm MarkAsAnsweredForm (Spec 3.5) already distinguishes the optional-answered_text path — if it REQUIRES answered_text today, this spec introduces the optional path, which is a behavior change to document
4. Decide color palette for Celebrate reaction specifically — recommend sunrise gradient (gold + coral) distinct from Light-a-Candle's amber
5. Confirm expired posts still flow through the answered-feed query (query should NOT filter `expires_at > NOW()` for this endpoint)

**Out of scope:**

- Answered-Wall-specific search (Phase 11 full-text covers this)
- Answered post analytics for the author (lives on the author's profile, Phase 8)
- "Pray for my next thing" CTA on answered posts (would turn celebration into engagement)
- Testimony-post equivalent on Answered Wall — Testimonies already function differently (they're NOT prayer requests); this page is for answered-prayer-requests
- Video / audio answered updates
- Answered update templates or AI-suggested praise text (explicitly forbidden)
- Public leaderboard of "most answered prayers this month"

**Out-of-band notes for Eric:** The hero subhead "Gratitude, not comparison" is the single most important piece of copy in this feature. It's there because users will inevitably compare — "my prayer hasn't been answered, why theirs?" — and naming the tension directly is kinder than pretending it doesn't exist. Also: the "Celebrate" reaction icon choice matters a lot. Resist emoji (🎉, 🙌); they read as throwaway. A custom sunrise SVG or a single warm-toned hand-raised mark will feel more like Worship Room. Finally: the Mental Health filter omission is the single design choice I'd most expect someone to second-guess during execution. It's deliberate. If a user feature-requests a Mental Health filter, the answer is "no, and here's why" (prosperity-gospel adjacency risk for the category that most needs protection from it). Document the rationale so future-you doesn't re-open the question without context.

---

### Spec 6.7 — Shareable Testimony Cards

- **ID:** `round3-phase06-spec07-shareable-testimony-cards`
- **Size:** L
- **Risk:** Medium
- **Prerequisites:** 6.6
- **Goal:** A one-tap "Share as image" action on testimony cards generates a beautiful PNG with the testimony content, attribution (or "Anonymous"), a soft gradient background, and Worship Room branding. User can save it or share it via the native share sheet.

**Approach:** Reuse the existing image generation infrastructure (canvas/svg-to-png). New `TestimonyCardImage.tsx` component renders the layout for image capture. Tap "Share as image" on a testimony's interaction bar opens a preview modal with the rendered card and a Share button. Sharing uses the Web Share API with a PNG blob fallback for browsers without native share. Branding: small Worship Room logo and tag at the bottom of the card. Anonymous testimonies show "Shared anonymously on Worship Room."

**Files to create:**

- `frontend/src/components/prayer-wall/TestimonyCardImage.tsx`
- `frontend/src/components/prayer-wall/ShareTestimonyModal.tsx`
- `frontend/src/lib/prayer-wall/imageGen.ts`

**Files to modify:**

- `frontend/src/components/prayer-wall/InteractionBar.tsx` (add Share as Image button on testimonies only)

**Acceptance criteria:**

- [ ] Share as Image button only on testimonies
- [ ] Generates a PNG that includes content, attribution, branding
- [ ] Web Share API works on mobile
- [ ] Fallback download works on desktop
- [ ] Anonymous testimonies show anonymous attribution
- [ ] Brand visual review passes
- [ ] Pre-share confirmation modal: before generating the PNG, show a one-time-per-user (sticky-dismissible) modal explaining "Once you share this image, it cannot be unshared. People who receive it can save it forever, even if you later delete the original testimony." User must explicitly confirm. Modal does NOT show for subsequent shares from the same user (preference stored in `wr_settings.dismissedShareWarning`).
- [ ] Image does NOT include the user's avatar URL when avatar is from an external/uploaded source (only renders initials in a stylized circle) — avatar URLs may contain identifying user IDs that leak in URL inspection of the PNG metadata
- [ ] PNG metadata stripped of EXIF, generation timestamp truncated to date (no time-of-day fingerprinting)
- [ ] At least 12 tests (includes 2 new tests for the share warning and metadata stripping)

### Spec 6.8 — Verse-Finds-You

- **ID:** `round3-phase06-spec08-verse-finds-you`
- **Size:** L
- **Risk:** HIGH (AI-adjacent feature surfacing scripture in response to user's emotional/spiritual state; misapplied scripture in vulnerability moments causes real harm; fallback behavior when AI is unavailable is safety-critical)
- **Prerequisites:** 5.6 (Redis cache), 6.1 (Prayer Receipt — shares curated verse set pattern)
- **Runtime-gated dependencies:** 10.5 (crisis detection routing) and 10.6 (automated flagging) — the curated-set selection engine ships in Phase 6 but the 48-hour crisis-flag suppression gate requires the Phase 10 classifier to be live; before 10.5/10.6 land, the surfacing pipeline falls through its safe-failure path (returns null) for all users since no crisis flag can be read — Verse-Finds-You is functionally dormant until then, which is the intended behavior
- **Goal:** After a user composes a prayer request, comments on a vulnerable post, or spends time reading the Prayer Wall, occasionally surface a single short scripture passage that speaks to the context. Not a daily-verse, not an AI chatbot — a quiet, rare, carefully-scoped offering where a passage seems to "find" the user at the right moment. The challenge: make scripture feel like a gift from a friend who heard you, not an algorithmic intrusion, not a prosperity-gospel cliché, not a guilt-verse surfaced to someone in grief. Done wrong, this feature turns the Prayer Wall into a "Christian BuzzFeed." Done right, it's the moment a user screenshots and sends to a friend.

**Approach:** A curated set of 180 scripture passages, each tagged with emotional/situational domains (grief, waiting, fear, gratitude, loneliness, doubt, uncertainty, hope, endurance, comfort — deliberately no prosperity/triumph/"just-believe" tags). When the user completes certain surfacing triggers, the backend selects from the candidate set using a deterministic-by-day rotation with context filtering (category tags from the user's recent activity). The selection is NEVER done by a generative LLM — no free-form verse generation, no "pick the verse that matches this post" prompting. The AI layer (if used at all) is only for classifying the user's recent activity into a domain tag; the verse selection itself is a curated-set lookup. The surfacing is OPT-IN, rate-limited, and respects an explicit off-switch in settings.

**The four surfacing triggers:**

1. **Post-compose moment (opt-in):** After a user submits a prayer request, if Verse-Finds-You is enabled, a single verse appears below the success toast for 8 seconds (or until dismissed). "The word found you today:" in Lora italic, then the verse in the card's primary font. Verse chosen based on the post's category (Grief → grief-tagged verses; Gratitude → gratitude-tagged). Appears at most ONCE per user per 24h across all trigger types.

2. **Comment-of-encouragement moment (opt-in):** When a user leaves a supportive comment on someone else's vulnerable post (category Mental Health, Grief, Health), occasionally a verse appears in the user's own view (NOT the post author's view — this is a gift to the commenter). Same 24h cooldown.

3. **Reading-time moment (very rare):** After a user has spent >5 minutes actively reading the Prayer Wall feed in one session, a single verse card may appear mid-scroll (visually distinguished from posts, not dismissible-as-post) saying "A word as you keep watch:" Same 24h cooldown. Requires foreground + scroll activity signal (not idle tab).

4. **Crisis-adjacency (NEVER surfaces; documented here as an explicit anti-pattern):** Users who have triggered crisis-flag detection on their own recent post get ZERO Verse-Finds-You surfacing for 48 hours. This is deliberate: a person in acute distress is the LEAST right moment to algorithmically serve scripture. Universal Rule 13's "crisis takes precedence" applies. Instead, the crisis resources banner (from Phase 10.5) is what they see.

**The curated verse set (180 passages):**

- Stored in `backend/src/main/resources/verses/verse-finds-you.json`
- Each entry: `{ reference, text, translation: 'WEB', tags: string[], excluded_contexts: string[], approximate_length: 'short'|'medium' }`
- Tags: `grief`, `waiting`, `fear`, `gratitude`, `loneliness`, `doubt`, `uncertainty`, `hope`, `endurance`, `comfort`, `presence`, `lament`, `rest`
- Excluded-contexts: allows tagging a verse as "do NOT surface for grief" even if it matches another tag (defensive: some "hope" verses are wrong at a funeral)
- Curation rules (documented at top of the JSON file):
  - Short passages only (max ~35 words; longer passages lose their weight in surfacing UI)
  - No "prosperity" passages (no "God will give you the desires of your heart" surfaced as a promise)
  - No guilt/shame verses (no "oh ye of little faith" or mustard-seed-as-lecture)
  - No judgment verses outside explicit lament context
  - Prefer Psalms, Lamentations, Isaiah, Gospels of John and Matthew, Romans 8, Philippians 4, 2 Corinthians — passages explicitly about God's presence in difficulty
  - Every entry reviewed against the "pastor's wife test" before inclusion: would this verse at this moment land as grace or as judgment?
- Translation locked to WEB (World English Bible — per existing project convention and public domain)
- The 180-passage file is version-controlled; changes go through a spec review, not hotfixed

**The selection algorithm (plain-prose; no LLM in MVP):**

Step 1: If user has triggered crisis-flag in the last 48 hours, return null (no surfacing). Step 2: If the user is within the 24-hour cooldown from the last surfacing, return null. Step 3: If the user has Verse-Finds-You disabled in settings, return null. Step 4: Determine context tags from the trigger — post-compose uses the post's category-mapped tags, comment uses the parent post's category-mapped tags, reading-time uses the last-viewed post's category tags. Step 5: Filter the curated set to entries matching ANY context tag AND NOT matching the excluded_contexts. Step 6: From the filtered set, select deterministically by (user_id hash + day-of-year) modulo the filtered set size. Step 7: Return the selected verse.

The selection is deterministic by day — two users with the same context on the same day get the same verse. This is intentional: shared verses create emergent community moments ("did you also get Psalm 34 today?"). Rotating daily (not per-visit) prevents refresh-gaming where users reload to get a "better" verse.

**Category-to-tag mapping** (documented in `verse-finds-you.json`):

- `health` → `comfort`, `endurance`, `presence`
- `mental-health` → `comfort`, `lament`, `presence`, `rest` (deliberately NOT `hope` — hope-verses can be cruel in acute depression)
- `family` → `endurance`, `comfort`, `presence`
- `work` → `waiting`, `uncertainty`, `endurance`
- `grief` → `lament`, `presence`, `comfort` (deliberately NOT `hope` — too soon for most grievers)
- `gratitude` → `gratitude`, `rest`
- `praise` → `gratitude`
- `relationships` → `endurance`, `comfort`, `presence`
- `other` → `presence`, `comfort`

**When NO LLM is used (the default and recommended path):**

The feature above works ENTIRELY with curated sets and deterministic selection. No AI service required. This is the MVP and the recommended production path. It's cheaper, predictable, auditable, and never hallucinated a verse.

**When an LLM classifier IS used (optional enhancement, NOT MVP):**

For users who write free-form bio text, Testimony content, or Question posts, an LLM CLASSIFIER could map the post content into the same tag set for more precise verse selection. This is OPT-IN at the Eric-configuration level (a future enhancement spec). The LLM NEVER generates or selects the verse — only maps content → tags. The curated set remains the verse source. If this enhancement ships in a future spec, the fallback-when-classifier-down behavior is: fall back to category-based tag mapping (which is what MVP uses).

**The explicit AI safety gates:**

- Per Universal Rule 13: backend crisis-classifier is authoritative. Crisis posts suppress Verse-Finds-You entirely for 48h.
- Plain text rendering only, no HTML, no Markdown. No `dangerouslySetInnerHTML`.
- If any LLM is ever used (future enhancement), classification output is strictly validated against the known tag enum — a bogus tag like "desperation" coming back from the LLM falls through to the safe default tag set.
- No user input ever flows into verse selection beyond category tag — user's actual post TEXT is not sent to any AI service unless the optional enhancement is active and the user has opted in.
- The feature degrades safely: if ANY part of the pipeline fails (Redis down, classifier timeout, JSON parse error, tag mismatch), the surfacing simply doesn't happen. No error message to the user. No fallback random verse. Silent degradation is the right choice here — a bad verse is worse than no verse.

**Opt-in and off-switch:**

- Settings toggle: "Verse Finds You" — default OFF
- Settings description: "Occasionally, after you share a prayer, comment, or spend time reading, a short scripture may appear. Off by default. You can turn it on anytime."
- No confirmation modal on enabling (unlike 3am Watch, this feature's risk is quieter — bad verses can sting but rarely cause acute harm). Simple toggle.
- No confirmation on disabling either — one tap.
- Per-session transient dismissal: tapping "X" on a verse hides it immediately and suppresses future surfacings for that session.
- Long-term suppression: after dismissing 3 verses in a row without engagement, a one-time inline prompt offers "Want to turn this off?" with a quick toggle.

**Shareable verse moment (optional):**

When a verse surfaces, a small "Save this" button lets users screenshot-save or save-to-phone. Reuses PII-stripping from Spec 6.7. Rate-limited to 1 save per verse per user. Saves are client-side PNG generation; no server-side image logs.

**Anti-pressure design (load-bearing):**

- Default OFF. User opts in deliberately.
- 24h cooldown across ALL triggers — a user is NEVER bombarded with verses
- Crisis-flag suppression for 48h — acute distress is not the moment for algorithmic scripture
- Curated set with explicit exclusions (no prosperity, no guilt, no judgment-without-lament-context)
- Deterministic daily rotation — no "slot machine" dopamine loop of refresh-for-new-verse
- No LLM-generated content in MVP; curated-set selection only
- Graceful silent failure — no verse is always better than wrong verse
- Plain text rendering — no HTML injection, no Markdown formatting that could hide injection
- No "verse of the day" notification (would train users into daily-dose pattern antithetical to the feature)
- No tracking of which verses "worked" for users (no engagement optimization loop)
- Mental Health and Grief categories explicitly mapped to `lament` and `comfort` tags, NOT to `hope`

**Accessibility:**

- Verse card has `role="note"` and accessible name including "scripture"
- Verse reference is a proper `<cite>` element for semantic clarity
- Dismiss button has clear accessible name ("Dismiss this verse")
- Reduced-motion: no fade-in animation; verse appears instantly
- Screen reader announces the verse politely (`aria-live="polite"`), not assertively
- Color contrast passes WCAG AA

**Files to create:**

- `frontend/src/components/prayer-wall/VerseFindsYou.tsx`
- `frontend/src/hooks/useVerseFindsYou.ts`
- `backend/src/main/java/com/worshiproom/verse/VerseFindsYouController.java`
- `backend/src/main/java/com/worshiproom/verse/VerseFindsYouService.java`
- `backend/src/main/java/com/worshiproom/verse/VerseSelectionEngine.java`
- `backend/src/main/java/com/worshiproom/verse/dto/VerseFindsYouResponse.java`
- `backend/src/main/resources/verses/verse-finds-you.json` (180 curated passages)
- `backend/src/test/java/com/worshiproom/verse/VerseSelectionEngineTest.java`
- `backend/src/test/java/com/worshiproom/verse/VerseFindsYouIntegrationTest.java`
- `__tests__/*.test.tsx` for each frontend component

**Files to modify:**

- `InlineComposer.tsx` / `PrayerWallFeed.tsx` / `CommentInput.tsx` — trigger points after submit/scroll
- Settings page — add VerseFindsYou toggle in a "Gentle extras" section
- `.claude/rules/11-local-storage-keys.md` — document `wr_settings.verseFindsYou.enabled`, `wr_verse_dismissals` (dismissal count + last dismissed timestamp for the 3-in-a-row prompt)
- OpenAPI spec — document the endpoint

**Database changes:**

- New table `verse_surfacing_log` (lightweight): `(user_id, verse_id, surfaced_at, trigger_type, dismissed_at)` — used ONLY for 24h cooldown enforcement and the 3-in-a-row dismissal detection. Retained 30 days; older rows purged by scheduled job.
- Liquibase changeset: `2026-04-22-003-create-verse-surfacing-log.xml`
- Index on `(user_id, surfaced_at DESC)` for fast cooldown lookup

**API changes:**

- `GET /api/v1/verse-finds-you?trigger=post_compose&context=health` — returns `{ data: { verse: { reference, text } | null, cooldown_until: timestamp | null, reason: 'cooldown' | 'crisis_suppression' | 'disabled' | 'no_match' | null } }`. Returns `verse: null` in all non-surfacing cases with a reason code. Auth required.
- Rate-limited to 10 requests per hour per user (prevents client-side polling abuse even though the surfacing logic prevents actual verse delivery).

**Copy Deck:**

- Post-compose surfacing prefix: "The word found you today:"
- Comment surfacing prefix: "A word as you gave comfort:"
- Reading-time surfacing prefix: "A word as you keep watch:"
- Dismiss button: "Dismiss"
- Save-this-verse button: "Save"
- Settings toggle label: "Verse Finds You"
- Settings description: "Occasionally, after you share a prayer, comment, or spend time reading, a short scripture may appear. Off by default. You can turn it on anytime."
- 3-in-a-row dismissal prompt: "Want to turn this off? You can turn it back on anytime in settings."
- 3-in-a-row dismiss primary: "Turn off"
- 3-in-a-row dismiss secondary: "Keep it on"

**Anti-Pressure Copy Checklist:** (a) no comparison ✓ (b) no urgency ✓ (c) no exclamation points near vulnerability ✓ (d) no therapy-app jargon ✓ (e) no streak-as-shame ✓ (f) no false scarcity ✓

**Anti-Pressure Design Decisions:**

- Default OFF at account creation
- 24h cooldown across all trigger types
- 48h crisis-flag suppression (Universal Rule 13 compliance)
- Curated verse set with explicit exclusion rules (no prosperity, no guilt)
- Deterministic daily rotation, not per-visit randomization
- Silent failure on any pipeline error (no verse > wrong verse)
- No LLM-generated content in MVP
- Mental Health and Grief categories mapped to `lament`/`comfort`, NOT `hope`
- No daily-verse notification
- No verse engagement tracking / optimization
- 3-in-a-row dismissal offers a gentle off-ramp
- Plain text only; no HTML, no Markdown

**Acceptance criteria:**

- [ ] Settings toggle defaults to OFF for all users (new and existing)
- [ ] Verse surfacing NEVER fires when toggle is off (integration test verifies zero API calls from UI when disabled)
- [ ] Post-compose trigger surfaces a verse when: enabled, not in cooldown, no crisis flag, matching verse exists
- [ ] Comment-encouragement trigger surfaces on supportive comments to Mental Health / Grief / Health posts
- [ ] Reading-time trigger requires >5min active engagement (foreground tab + scroll activity)
- [ ] 24h cooldown across all triggers verified (integration test: trigger once, attempt second trigger within 24h, assert no surfacing)
- [ ] 48h crisis-flag suppression verified (integration test: flag user's post with crisis, attempt all triggers, assert zero surfacing)
- [ ] Crisis-adjacency suppression is per-user, not per-post (user gets suppressed everywhere, not just on the flagged post)
- [ ] Curated JSON file exists with 180 passages, all WEB translation, all with at least one tag
- [ ] JSON schema validation in integration test: every entry has reference, text, translation, tags array
- [ ] Every entry's `text` is ≤35 words
- [ ] No entry tagged with forbidden context (no prosperity-adjacent tags)
- [ ] Category-to-tag mapping matches spec documentation exactly
- [ ] Mental Health maps to `comfort`, `lament`, `presence`, `rest` — NOT `hope`
- [ ] Grief maps to `lament`, `presence`, `comfort` — NOT `hope`
- [ ] Selection algorithm is deterministic: same (user_id_hash, day_of_year, context) returns same verse
- [ ] Two users with same context on same day get the same verse (integration test)
- [ ] Refreshing the page within the same day returns the same verse for the same trigger+context
- [ ] Rate limit: 10 endpoint requests per hour per user (11th returns 429)
- [ ] Silent failure: if JSON parse fails, verse selection fails, or tag lookup returns nothing, API returns `{ verse: null, reason: 'no_match' }` (no 500)
- [ ] Silent failure: Redis-down does not 500; cooldown defaults to DENY (safer; prevents cooldown-bypass)
- [ ] Silent failure on Redis-down tested via Testcontainer stop mid-test
- [ ] Dismiss button hides the verse card immediately
- [ ] Session-level suppression after dismissal (no new surfacing in same session)
- [ ] 3-in-a-row dismissal tracking in localStorage triggers off-ramp prompt
- [ ] 3-in-a-row prompt offers "Turn off" / "Keep it on" both clearly labeled
- [ ] Save-this-verse button generates PNG client-side with PII stripping
- [ ] Save rate-limited to 1 per verse per user
- [ ] Plain text rendering verified (attempted injection of HTML in a test entry does NOT render as HTML)
- [ ] Verse card has `role="note"` and correct accessible name
- [ ] Verse reference rendered in `<cite>` element
- [ ] Reduced-motion disables any fade-in; verse appears instantly
- [ ] Screen reader announces verse via `aria-live="polite"`
- [ ] Color contrast passes WCAG AA in light and Night Mode
- [ ] Surfacing log table retention job purges rows older than 30 days (integration test)
- [ ] Logged-out users receive no verses (endpoint requires auth; 401 if attempted)
- [ ] At least 35 tests across selection determinism, cooldowns, crisis suppression, category mapping, a11y, injection-safety, graceful degradation

**Testing notes:**

- Unit test: selection algorithm is deterministic across identical inputs
- Unit test: `excluded_contexts` properly filters out blocked verses
- Integration test: crisis-flag suppression across all trigger types (seed user with crisis-flagged post, attempt all 3 triggers, assert zero surfacing for 48h, assert resumption at 49h)
- Integration test: cooldown enforcement (seed recent surfacing in log, attempt trigger within 24h, assert suppression)
- Integration test: Redis-down test (stop Testcontainer, assert endpoint returns safe degradation — fail-closed)
- Integration test: JSON parse failure graceful degradation (temporarily corrupt the JSON file in test, verify no 500 response, verse null returned)
- Unit test for every entry in the curated JSON set: passes word-count limit, has valid tag(s), has required fields
- Security test: attempt to inject HTML in a test verse entry, verify frontend renders as escaped text not DOM
- Security test: verify user's post TEXT is not sent to any external service (MVP: no LLM; enhancement: opt-in only)
- Playwright: enable Verse-Finds-You in settings, compose a post, dismiss the verse, verify session-level suppression
- Playwright: disable Verse-Finds-You, compose a post, verify no verse appears

**Notes for plan phase recon:**

1. Curate the 180-passage set as a prerequisite deliverable. Eric should review every entry before spec execution. Recommend pulling from existing devotional collections that lean Psalmist/Pauline/Johannine.
2. Confirm the WEB translation being used matches existing Prayer Receipt verse set (same source for consistency).
3. Verify `excluded_contexts` enforcement — some verses may appear under multiple tags but must be suppressed in specific contexts (e.g., a hope verse that excluded-contexts grief).
4. Decide whether to include any Old Testament judgment/lament passages (Lamentations 3, Psalm 88) — recommend yes, under `lament` tag, but curated carefully. These are among the most comforting passages for acute grief because they don't deny the darkness.
5. Confirm the trigger cadence (24h) is not too short — monitor in production and adjust the rate up if surfacing feels intrusive.
6. Review the cooldown-fail-closed decision: if Redis is down, does the cooldown check default to "allow surfacing" (more verses, potentially bypass cooldown) or "deny surfacing" (no verses, safer)? Spec says DENY; re-confirm.

**Out of scope:**

- LLM-based verse selection or generation (explicitly deferred; MVP is curated-set only)
- LLM-based user-content classification (future enhancement, out of scope for this spec)
- Daily verse notification (explicitly anti-pattern per anti-pressure discipline)
- User-curated verse collections ("save verses I love")
- Sharing verses to social with Worship Room branding as a growth loop (would turn the feature into marketing)
- Audio/spoken verses
- Multiple translations (WEB only in MVP)
- Personalized verse preferences ("I prefer Psalms") — the deterministic daily rotation is the wrong substrate for personalization
- Verse scheduling ("send me a verse every morning") — daily-verse pattern is anti-pattern for this feature's design intent

**Out-of-band notes for Eric:** The 180-passage curation is the single highest-leverage piece of work in this spec, and the one most likely to be rushed. Block out 4-6 hours for the curation, ideally in consultation with someone whose pastoral discernment you trust. Every bad entry is a potential wound to a vulnerable user. Remove any verse you're unsure about — "fewer and safer" beats "more and dicey." Also: I deliberately separated the AI-free MVP from the optional LLM-classifier enhancement. The MVP works and is the recommended production path; adding LLM classification later is a known-shape enhancement with clear boundaries. If anyone later asks "why not just use an LLM to pick the perfect verse for each user?", the answer is: because the curated-set approach is predictable, auditable, and never hallucinated a verse that shamed someone. Finally: the "silent failure" discipline throughout this feature is load-bearing. The feature genuinely does not need to fire on every eligible moment. Better to miss surfacings than to land a wrong one. Tune everything toward caution.

---

### Spec 6.9 — Prayer Wall Composer Drafts

- **ID:** `round3-phase06-spec09-composer-drafts`
- **Size:** M
- **Risk:** Low
- **Prerequisites:** 6.8
- **Goal:** Auto-save composer content to localStorage every 5 seconds while the user is typing. On reopen, offer to restore the draft. Prevents the "I lost my words because I had to navigate away" loss.

**Approach:** Custom hook `useComposerDraft(postType)` that auto-saves to `wr_composer_drafts` (a new reactive store keyed by postType). On composer mount, check for an existing draft and offer "Restore your draft?" inline. Drafts older than 7 days auto-expire. Cleared on successful post.

**Acceptance criteria:**

- [ ] Drafts auto-save every 5 seconds
- [ ] Reopening composer offers to restore
- [ ] Drafts cleared on successful post
- [ ] Drafts expire after 7 days
- [ ] One draft per post type
- [ ] localStorage key documented in `11-local-storage-keys.md`
- [ ] At least 10 tests

### Spec 6.10 — Prayer Wall Search by Author

- **ID:** `round3-phase06-spec10-search-by-author`
- **Size:** S
- **Risk:** Low
- **Prerequisites:** 6.9
- **Goal:** Tapping an author name on a card opens their profile with the author's posts pre-filtered. Already partially supported via the `/u/:username` route from Phase 8 (sequenced after this in the Master Plan but anticipating it here is fine — the link is a no-op until Phase 8 ships, then automatically lights up).

**Approach:** Update `PrayerCard.tsx` author link to point to `/u/:username` when username is available, falling back to `/prayer-wall/user/:userId` until Phase 8 ships. The route handler in Phase 8 already plans to handle the redirect.

**Acceptance criteria:**

- [ ] Author link points to `/u/:username` when username available
- [ ] Falls back to existing `/prayer-wall/user/:userId` otherwise
- [ ] No broken links during the transition
- [ ] At least 4 tests

### Spec 6.11 — Sound Effects Settings Polish

- **ID:** `round3-phase06-spec11-sound-effects-polish`
- **Size:** S
- **Risk:** Low
- **Prerequisites:** 6.10
- **Goal:** The existing sound effects system (chimes, soft tones) gets exposed in settings as a single toggle. Quick Lift, Prayer Receipt, and other Forums Wave hero features all respect this single toggle.

**Acceptance criteria:**

- [ ] Single "Sound effects" toggle in settings
- [ ] All hero features respect the toggle
- [ ] Default: on for new users
- [ ] At least 4 tests

### Spec 6.11b — Live Presence Component

- **ID:** `round3-phase06-spec11b-live-presence-component`
- **Size:** M
- **Risk:** Medium (introduces polling traffic; requires carefully-bounded Redis presence tracking)
- **Prerequisites:** 3.11 (Prayer Wall feed live), 6.11 (Sound Effects polish)
- **Goal:** Surface the reality that other people are also reading the Prayer Wall — without creating FOMO, social comparison, or false urgency. A small inline indicator in the feed header shows "N people here now" when and only when N ≥ 1 in the last 60 minutes. Hidden completely when N = 0 so users don't feel alone in an empty room. The count refreshes every 30 seconds while the tab is active. This is the gentlest possible "you're not the only one" signal — warm, not performative.

**Approach:** Backend tracks presence via a Redis sorted set keyed `presence:prayer_wall` with user_id (or anonymous session id) as member and `unix_timestamp_seconds` as score. Every `GET /api/v1/posts` request (authenticated or anonymous) bumps the user's score. `GET /api/v1/prayer-wall/presence` returns `{ count: N }` where N = count of members with score ≥ (now - 3600). The endpoint is cached server-side for 30 seconds (Spring's `@Cacheable` with a short TTL) so a burst of clients polling doesn't hammer Redis. Frontend polls every 30 seconds while the Prayer Wall tab is visible; stops immediately on `visibilitychange` to hidden (no background polling tax).

**Display rules:**

- N = 0: component renders nothing (no placeholder, no "be the first", no gray "—")
- N = 1: "1 person here" — don't assume the single user is "just you"; the lurker might be on another device, or a friend who just opened the tab
- N ≥ 2: "N people here now"
- Count is static (not animated) — counters that tick up/down create urgency
- Placement: feed header top-right, small font, muted color, non-interactive (no tap target — just a status)

**Anti-pressure design (Decision 7 from Stage C sign-off):**

- Hidden when count is zero — no "be the first" CTA
- No "X of your friends are here" enrichment (avoids social comparison)
- No "someone just joined" flash or pulse animation
- No tooltip or expansion listing who is present (pure count, no identity)
- No historical chart ("more people here than usual") — we don't measure anything past "right now"
- Logged-out visitors see the count and contribute to it (public)
- User can opt out of being counted via `/settings` toggle ("Count me as present when I'm reading") — defaults to ON; users can hide themselves without hiding the count for others

**Privacy:**

- Authenticated users: counted as their user_id (one contribution per user across multiple tabs/devices via SELECT DISTINCT on the sorted set)
- Anonymous visitors: counted by a 90-day cookie session id (not the JWT; no identity exposure). Cookie is httpOnly and scoped to the presence endpoint path.
- No user sees any other user's identity via this endpoint — count only
- Deleted users' session entries age out of the sorted set naturally (60-min TTL via Redis `ZREMRANGEBYSCORE` cleanup job)

**Rate limiting:**

- `GET /api/v1/prayer-wall/presence`: 120 per minute per authenticated user (every 30 seconds, plus margin for re-polls after tab focus). Anonymous: 60 per minute per IP.
- Cleanup job: Redis `ZREMRANGEBYSCORE presence:prayer_wall 0 (now - 3600)` runs every 5 minutes via scheduled task

**Accessibility:**

- Component has `role="status"` and `aria-live="polite"` so screen readers announce changes (but only when the value actually changes — not on every 30-second poll)
- Icon is decorative (`aria-hidden="true"`); the numeric count is the accessible name
- Focus never lands on the count (it's a status, not a control)

**Files to create:**

- `backend/src/main/java/com/worshiproom/presence/PresenceController.java`
- `backend/src/main/java/com/worshiproom/presence/PresenceService.java`
- `backend/src/main/java/com/worshiproom/presence/PresenceTrackingInterceptor.java` (bumps presence on `/posts` requests)
- `backend/src/test/java/com/worshiproom/presence/PresenceIntegrationTest.java`
- `frontend/src/components/prayer-wall/PresenceIndicator.tsx`
- `frontend/src/hooks/usePresence.ts` (polling hook with visibility-aware pause)
- `__tests__/*.test.tsx` for each frontend module

**Files to modify:**

- Feed header component (embed PresenceIndicator)
- OpenAPI spec (adds `/prayer-wall/presence` endpoint)
- Settings page (adds "Count me as present" toggle → stored as `wr_settings.presence.optedOut` + mirrored to backend preference)

**API changes:**

- `GET /api/v1/prayer-wall/presence` — returns `{ data: { count: N }, meta }`, cache TTL 30 seconds
- Presence-tracking interceptor bumps scores on existing endpoints; no new write endpoints

**Copy Deck:**

- N = 1: "1 person here"
- N ≥ 2: "{N} people here now"
- Settings toggle label: "Count me as present when I'm reading"
- Settings toggle helper: "Others see how many people are on the Prayer Wall. Turn this off to hide yourself from the count."

**Anti-Pressure Copy Checklist:** (a) no comparison ✓ (b) no urgency ✓ (c) no exclamation points near vulnerability ✓ (d) no therapy-app jargon ✓ (e) no streak-as-shame ✓ (f) no false scarcity ✓

**Anti-Pressure Design Decisions:**

- Hidden at N=0 (the single most important rule — no "empty room" signal)
- No animated counter, no pulse on change
- No identity enrichment (count only, no names, no avatars)
- Opt-out always available and honored
- Not a social proof CTA ("N people — join them!")
- Disabled entirely on pages containing crisis-flagged posts (don't surface presence on the most vulnerable content)

**Acceptance criteria:**

- [ ] Component hidden when count is 0
- [ ] Component renders "1 person here" when count is 1
- [ ] Component renders "N people here now" when count ≥ 2
- [ ] Presence bumped on every `/posts` request (authenticated and anonymous)
- [ ] Anonymous visitors use cookie session id, not JWT or IP
- [ ] Count excludes users with `preferences.presence.opted_out = true`
- [ ] Frontend polls every 30 seconds while tab visible
- [ ] Polling stops on `visibilitychange` to hidden
- [ ] Polling resumes on `visibilitychange` to visible
- [ ] Server cache TTL 30 seconds verified
- [ ] Rate limit: 121st request in 1 minute returns 429
- [ ] Sorted set cleanup job runs every 5 minutes
- [ ] Settings toggle persists to both local and backend preference
- [ ] Component not rendered on pages with crisis-flagged post surfacing
- [ ] Screen reader announces changes but not every poll
- [ ] At least 14 tests across backend + frontend covering edge cases

**Testing notes:**

- Integration tests use Testcontainers + Redis container
- Frontend tests use MSW to mock presence endpoint; verify polling pause/resume via Vitest fake timers
- Playwright test loads Prayer Wall in two browser contexts, verifies count = 2

**Notes for plan phase recon:**

1. Confirm Redis is already in the deployment target choice (if not, consider whether to wait for Redis infra or use a simpler in-memory presence with obvious multi-instance caveats)
2. Verify Spring's `@Cacheable` setup is trivial for a 30-second TTL (should be with Spring Cache + Redis)
3. Confirm anonymous session cookie name doesn't collide with any existing cookie

**Out of scope:**

- Per-post presence ("N people looking at this post right now") — too creepy, too performance-expensive
- Friends-only presence ("2 friends are here") — adds comparison dynamic that contradicts the whole spec
- Historical presence graphs
- Push notifications when presence crosses thresholds
- Typing indicators anywhere

**Out-of-band notes for Eric:** This is the single most "user-psychology-loaded" spec in Phase 6. The difference between a presence indicator that feels warm and one that feels creepy is one or two copy decisions and the N=0 hiding rule. If you find yourself relaxing any of the Anti-Pressure Design Decisions in implementation, stop and talk to yourself out loud about why — there's usually a hidden pressure-tradeoff that the original rules exist to prevent. The "hidden at zero" rule in particular has been violated in every app I've seen try this feature, always with the justification of "social proof"; that justification is exactly what this spec rejects.

---

### Spec 6.12 — Phase 6 Cutover

- **ID:** `round3-phase06-spec12-phase6-cutover`
- **Size:** S
- **Risk:** Low
- **Prerequisites:** 6.11
- **Goal:** Cutover checklist. Manual QA pass on every hero feature. Video walkthrough recorded for future reference.

**Acceptance criteria:**

- [ ] Every hero feature manually verified
- [ ] Cutover checklist completed
- [ ] Phase 6 officially done
- [ ] Universal Rule 17 per-phase accessibility smoke test passes: axe-core automated scan on routes and components introduced or modified in this phase returns zero CRITICAL violations; keyboard-only navigation walkthrough of this phase's primary user flows completes without dead-ends; VoiceOver spot-check on the 2-3 most complex interactions introduced in this phase completes without blocking issues; evidence committed to `_cutover-evidence/phase6-a11y-smoke.json` (axe-core report) plus a brief markdown note recording keyboard and VoiceOver outcomes

---

## Phase 7 — Cross-Feature Integration

> **Phase purpose:** Weave Prayer Wall into the rest of the Worship Room app. Bible reader links to Prayer Wall (and vice versa), Music plays during Prayer Wall sessions, Daily Hub rituals nudge gentle Prayer Wall engagement, Local Support surfaces counselor listings on Mental Health posts, friend-prioritized feeds. After this phase, Prayer Wall stops feeling like a standalone forum and starts feeling like the social heart of a unified spiritual practice.

**What this phase accomplishes:** A user reading John 14 in the Bible can tap "Pray with this passage" and start a prayer composer prefilled with the scripture reference. A user composing a Mental Health prayer sees a quiet "Counselors near Columbia, TN" link below the composer (non-modal, non-pressuring). A user opening the Daily Hub Pray tab sees their three most recent unprayed Prayer Wall posts from friends. Music can play in the background while browsing Prayer Wall (existing AudioProvider already supports this — Phase 7 just verifies and polishes). Friends' posts pin to the top of the Prayer Wall feed. Privacy tiers (private / friends / public) work end-to-end.

**Sequencing notes:** Specs 7.1-7.7 are independent integrations and can interleave. Spec 7.8 is the cutover.

### Spec 7.1 — Bible to Prayer Wall Bridge

- **ID:** `round3-phase07-spec01-bible-to-prayer-wall`
- **Size:** L
- **Risk:** Medium
- **Prerequisites:** Phase 6 complete
- **Goal:** From any Bible passage, the user can tap "Pray with this passage" to open the Prayer Wall composer pre-filled with the scripture reference. The composer's optional scripture reference field (added in Phase 4.5 for Discussions) gets activated for all post types.

**Approach:** New menu item in the Bible reader's verse action menu (existing infrastructure from BB-26). Tapping it navigates to `/prayer-wall/compose?scripture=John+14:1-3&postType=discussion` (or whichever post type the user picks from a quick chooser). The composer reads the query params on mount and pre-fills. Update `InlineComposer` to accept and display a `prefilledScripture` prop.

**Files to modify:**

- `frontend/src/components/bible/VerseActionMenu.tsx` (or equivalent — add menu item)
- `frontend/src/components/prayer-wall/InlineComposer.tsx` (accept prefilled scripture)
- `frontend/src/pages/PrayerWall.tsx` (handle compose query params)

**Acceptance criteria:**

- [ ] Bible verse menu has "Pray with this passage" option
- [ ] Tapping navigates to Prayer Wall composer
- [ ] Composer pre-fills with scripture reference
- [ ] User picks post type via quick chooser
- [ ] Posted prayer includes scripture chip linking back to Bible
- [ ] Round-trip works for all post types
- [ ] Brand voice copy passes review
- [ ] At least 12 tests

### Spec 7.2 — Prayer Wall to Bible Bridge

- **ID:** `round3-phase07-spec02-prayer-wall-to-bible`
- **Size:** S
- **Risk:** Low
- **Prerequisites:** 7.1
- **Goal:** Scripture chips on prayer cards (from the Discussion type's scripture reference field) link to the Bible reader at that passage. Already partially wired — this spec verifies it works end-to-end across all 4 Prayer Wall pages.

**Acceptance criteria:**

- [ ] Scripture chip on a prayer card links to `/bible/{book}/{chapter}#verse-{n}`
- [ ] Bible reader scrolls to the linked verse
- [ ] Works on all 4 Prayer Wall pages
- [ ] At least 4 tests

### Spec 7.3 — Music During Prayer Wall

- **ID:** `round3-phase07-spec03-music-during-prayer-wall`
- **Size:** S
- **Risk:** Low
- **Prerequisites:** 7.2
- **Goal:** Verify that the existing AudioProvider context (BB-26 era) supports music continuing to play while the user navigates Prayer Wall pages. No new code expected — this is verification and polish.

**Approach:** Manual QA: start a worship playlist, navigate to Prayer Wall, verify playback continues. Verify the AudioDrawer is accessible from Prayer Wall pages (the FAB should be visible on all 4). Polish: ensure the FAB does not overlap any sticky elements on Prayer Wall (filter bar, room selector). If overlap exists, add a `data-prayer-wall` flag to adjust the FAB position.

**Acceptance criteria:**

- [ ] Music continues to play across Prayer Wall navigation
- [ ] AudioDrawer accessible from all 4 Prayer Wall pages
- [ ] No FAB overlap with sticky elements
- [ ] At least 4 manual QA cases verified

### Spec 7.4 — Daily Hub Pray Tab Friend Surfacing

- **ID:** `round3-phase07-spec04-daily-hub-friend-prayers`
- **Size:** M
- **Risk:** Medium
- **Prerequisites:** 7.3
- **Goal:** The Daily Hub Pray tab gets a small section: "From your friends today" showing up to 3 recent unprayed Prayer Wall posts from friends. One-tap Quick Lift on each. Encourages gentle daily intercession without leaving the Daily Hub.

**Approach:** Backend endpoint `GET /api/v1/users/me/friend-prayers-today` returns up to 3 recent posts from the user's friends in the last 24 hours that the current user has not yet prayed for. Frontend component `FriendPrayersToday.tsx` rendered in the existing Daily Hub Pray tab. Each card shows the friend's display name, post snippet (first 100 chars), and a one-tap Quick Lift button. Empty state: gentle copy ("Your friends are quiet today. That is fine.").

**Files to create:**

- `backend/src/main/java/com/worshiproom/post/FriendPrayersService.java`
- `frontend/src/components/daily-hub/FriendPrayersToday.tsx`

**Files to modify:**

- `backend/src/main/java/com/worshiproom/post/PostController.java` (add endpoint)
- `frontend/src/pages/DailyHubPray.tsx` (or wherever the Pray tab lives)

**Acceptance criteria:**

- [ ] Endpoint returns up to 3 friend posts from last 24h that current user has not prayed for
- [ ] Component renders in Daily Hub Pray tab
- [ ] Quick Lift action works inline
- [ ] Empty state shows gentle copy
- [ ] Brand voice review passes
- [ ] At least 10 tests

### Spec 7.5 — Local Support Bridges on Mental Health Posts

- **ID:** `round3-phase07-spec05-local-support-bridges`
- **Size:** M
- **Risk:** Medium
- **Prerequisites:** 7.4
- **Goal:** When composing a Mental Health prayer, a quiet section below the textarea offers "Counselors near you" with a link to the existing Local Support → Counselors page. Non-modal, non-pressuring, easily dismissible.

**Approach:** Detect when the composer's category is set to `mental-health` AND post type is `prayer_request`. Render a small `LocalSupportBridge.tsx` component below the textarea with a one-line copy, a tappable link to `/local-support/counselors`, and a small dismiss X. Once dismissed for a session, do not re-render in the same session. Brand voice review is critical here — the copy must not feel like a "you should get help" nudge.

**Acceptance criteria:**

- [ ] Bridge appears only on Mental Health prayer requests
- [ ] One-line copy with link to counselors page
- [ ] Dismissible (session-scoped)
- [ ] Does not re-render after dismiss in same session
- [ ] Brand voice review passes (non-pressuring)
- [ ] At least 8 tests

### Spec 7.6 — Friends Pin to Top of Feed

- **ID:** `round3-phase07-spec06-friends-pin-to-top`
- **Size:** L
- **Risk:** Medium
- **Prerequisites:** 7.5
- **Goal:** When the user has friends, recent posts from those friends pin to the top of the Prayer Wall feed (above the chronological feed). Subtle visual treatment — small "From a friend" chip in the corner. Quietly weights the feed toward people the user knows.

**Approach:** Backend feed query enhanced: when the requesting user is authenticated and has friends, the query returns up to 3 recent friend posts at the top of the feed, then the regular chronological feed below. Friend posts have a small `"isFromFriend": true` flag in the response. Frontend renders a small chip above friend posts. The chip is a quiet pill with a Lucide `Users` icon and "From a friend" label.

**Files to modify:**

- `backend/src/main/java/com/worshiproom/post/PostService.java` (feed query enhancement)
- `backend/src/main/java/com/worshiproom/post/dto/PostResponse.java` (add isFromFriend field)
- `frontend/src/components/prayer-wall/PrayerCard.tsx` (render friend chip)

**Acceptance criteria:**

- [ ] Authenticated users with friends see up to 3 friend posts at the top of the feed
- [ ] Friend posts have a "From a friend" chip
- [ ] Users with no friends see the regular chronological feed (no special treatment)
- [ ] Friend posts are not duplicated below in the chronological feed
- [ ] At least 12 tests

### Spec 7.7 — Privacy Tiers (Public / Friends / Private)

- **ID:** `round3-phase07-spec07-privacy-tiers`
- **Size:** L
- **Risk:** High
- **Prerequisites:** 7.6
- **Goal:** Composer adds a visibility selector with three options: Public (anyone can see), Friends (only friends can see), Private (only the author can see). Backend enforces visibility on every read endpoint. Already partially wired from Phase 3 (Decision 4 schema and visibility enforcement) — this spec adds the composer UI and the audit confirming end-to-end enforcement.

**Approach:** Add visibility selector to `InlineComposer.tsx` as a small chip row below the category picker. Default is `public`. Tooltip on each option explains the audience. Backend write endpoint accepts and stores the visibility. Backend read endpoints already enforce visibility per Phase 3 Spec 3.3. New Playwright test: post with each visibility setting, verify visibility enforcement from another user's account.

**Visibility predicate (the canonical SQL fragment Phase 3.3 must implement):** every read endpoint that returns posts (feed, search, profile-tab, intercessor-list, friend-prayers-today, three-am-watch, etc.) MUST apply the visibility predicate at query time, NOT in application code (avoids accidental leaks via a missed filter). The predicate, parameterized by `:viewer_id` (nullable for unauthenticated viewers):

```
-- Pseudo-SQL (translate to JPQL/Criteria for actual implementation)
WHERE posts.is_deleted = FALSE
  AND posts.moderation_status IN ('approved', 'flagged')  -- 'hidden' and 'removed' invisible to non-mods
  AND (
    posts.visibility = 'public'
    OR (posts.visibility = 'friends' AND :viewer_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM friend_relationships fr
        WHERE fr.user_id = posts.user_id
          AND fr.friend_user_id = :viewer_id
          AND fr.status = 'active'
    ))
    OR (posts.visibility = 'private' AND posts.user_id = :viewer_id)
    OR posts.user_id = :viewer_id  -- author always sees own posts regardless of visibility
  )
```

This predicate is centralized as a JPA Specification or a `@Query` fragment that every post-returning service composes into its query. A Phase 3.3 acceptance criterion is "predicate exists in exactly one place; every post-fetching query references it." Drift here means privacy bugs.

**Acceptance criteria:**

- [ ] Composer shows visibility selector with 3 options
- [ ] Default is Public
- [ ] Selected visibility persists with the post
- [ ] Backend reads enforce visibility (private only to author, friends only to friends + author, public to everyone)
- [ ] End-to-end Playwright test verifies enforcement
- [ ] Brand voice review of tooltip copy passes
- [ ] At least 18 tests

### Spec 7.8 — Phase 7 Cutover

- **ID:** `round3-phase07-spec08-phase7-cutover`
- **Size:** S
- **Risk:** Low
- **Prerequisites:** 7.7
- **Goal:** Cutover checklist. Manual QA pass on every cross-feature integration. Verify no regressions in Bible, Music, Daily Hub, Local Support.

**Acceptance criteria:**

- [ ] All 7 integrations manually verified
- [ ] No regressions in adjacent features
- [ ] Cutover checklist completed
- [ ] Universal Rule 17 per-phase accessibility smoke test passes: axe-core automated scan on routes and components introduced or modified in this phase returns zero CRITICAL violations; keyboard-only navigation walkthrough of this phase's primary user flows completes without dead-ends; VoiceOver spot-check on the 2-3 most complex interactions introduced in this phase completes without blocking issues; evidence committed to `_cutover-evidence/phase7-a11y-smoke.json` (axe-core report) plus a brief markdown note recording keyboard and VoiceOver outcomes

---

## Phase 8 — Unified Profile System

> **Phase purpose:** Replace the existing UUID-based `/profile/:userId` and `/prayer-wall/user/:id` routes with a single canonical `/u/:username` route. Discourse-inspired Summary tab + Activity tabs (Prayer Wall, Growth, Bible, Friends). Three-tier privacy per section. Username system replaces UUIDs in URLs. The four-way name representation problem from Decision 3 finally gets resolved.

**What this phase accomplishes:** After Phase 8, every user has a unique username. Profile URLs are `/u/sarah-j` instead of `/profile/abc-123-uuid`. Tapping any author name on Prayer Wall opens the unified profile. The profile has Summary, Prayer Wall, Growth, Bible, and Friends tabs. Each tab respects privacy settings. The name canonicalization migration sweeps across the frontend so every component reads `displayName` from the API consistently.

**Sequencing notes:** Spec 8.1 lays the username system. Spec 8.2 builds the route. Specs 8.3-8.7 build the tabs. Spec 8.8 is the name canonicalization sweep. Spec 8.9 is the cutover.

### Spec 8.1 — Username System

- **ID:** `round3-phase08-spec01-username-system`
- **Size:** L
- **Risk:** Medium
- **Prerequisites:** Phase 7 complete
- **Goal:** Add username generation, validation, and storage. Every existing user gets a username back-filled from their first name + last initial (with collision handling). New registrations require a username.

**Approach:** Username is added in three sequential Liquibase changesets to safely populate existing rows without violating constraints. Phase 1.3 deliberately did NOT create this column, so Phase 8.1 introduces it from scratch. Changeset 1 adds the column as `VARCHAR(30) NULL` (no default, no constraint yet). Changeset 2 is a backfill: for each existing user, generate `firstname-l` (e.g., "sarah-j"), with collision handling that appends a number (sarah-j-2, sarah-j-3). Changeset 3 alters the column to `NOT NULL` and adds the `UNIQUE` constraint. Validation rules: 3-30 chars, lowercase letters / numbers / hyphens only, must start with a letter, no consecutive hyphens. **Profanity and impersonation filter (mandatory):** the validator MUST reject usernames matching a curated profanity list AND reserved words (admin, mod, moderator, anthropic, worshiproom, support, official, jesus, god, christ, the-lord, holy-spirit, pastor, deacon, bishop, etc.). The reserved word list is shipped as a constants file and reviewed quarterly. Profanity check uses the existing `containsCrisisKeyword`-style backend service extended with a profanity dictionary. Existing-user backfill that produces a profane or reserved username falls through to the next collision number (sarah-j-2 etc.) until a clean candidate is found. New endpoint `PATCH /api/v1/users/me/username` for changing username (rate limited: once per 30 days). Registration flow updated to ask for or auto-suggest a username, with the validator running client-side (fast feedback) AND server-side (authoritative).

**Files to create:**

- `backend/src/main/resources/db/changelog/2026-04-21-001-add-username-column-nullable.xml`
- `backend/src/main/resources/db/changelog/2026-04-21-002-backfill-usernames.xml`
- `backend/src/main/resources/db/changelog/2026-04-21-003-username-not-null-unique.xml`
- `backend/src/main/java/com/worshiproom/user/UsernameGenerator.java`
- `backend/src/main/java/com/worshiproom/user/UsernameValidator.java`

**Files to modify:**

- `backend/src/main/java/com/worshiproom/user/UserController.java` (add username endpoint)
- `frontend/src/components/prayer-wall/AuthModal.tsx` (username field on registration)

**Acceptance criteria:**

- [ ] All existing users have a backfilled username
- [ ] No two users share a username
- [ ] Validation rejects invalid usernames
- [ ] Username change rate limited to once per 30 days
- [ ] New registration captures or auto-suggests a username
- [ ] At least 18 tests

### Spec 8.2 — `/u/:username` Route and Redirects

- **ID:** `round3-phase08-spec02-username-route`
- **Size:** M
- **Risk:** Medium
- **Prerequisites:** 8.1
- **Goal:** New canonical route at `/u/:username`. Redirects from `/profile/:userId` and `/prayer-wall/user/:id` to the canonical URL. Deep linking works. Sharing URLs from anywhere in the app uses the new format.

**Approach:** New `UserProfile.tsx` page mounted at `/u/:username`. Router-level redirects from old routes to new ones (lookup user by ID, redirect to `/u/:username`). Backend endpoint `GET /api/v1/users/{username}` returns full user profile data.

**Acceptance criteria:**

- [ ] `/u/:username` route works
- [ ] `/profile/:userId` redirects to `/u/:username`
- [ ] `/prayer-wall/user/:id` redirects to `/u/:username`
- [ ] Unknown username returns 404
- [ ] All Share buttons throughout the app generate `/u/:username` URLs
- [ ] At least 12 tests

### Spec 8.3 — Profile Summary Tab

- **ID:** `round3-phase08-spec03-profile-summary-tab`
- **Size:** L
- **Risk:** Medium
- **Prerequisites:** 8.2
- **Goal:** The default tab on the unified profile. Shows: avatar, display name, bio, favorite verse, joined date, current level, current streak (if visible per privacy), faith points (if visible), recent badges (if visible), quick "Add Friend" button if not already friends.

**Approach:** New `ProfileSummary.tsx` component. Reads from `GET /api/v1/users/{username}` which returns the public-facing profile data (respecting visibility settings per Phase 7.7). Quick action buttons: Add Friend, Block, Report. Privacy enforcement at the API layer — private fields are simply not returned for unauthorized viewers.

**Acceptance criteria:**

- [ ] Summary tab renders all visible profile fields
- [ ] Privacy enforced (private sections hidden from non-friends)
- [ ] Add Friend button works
- [ ] Block button works (with confirmation)
- [ ] Report button opens ReportDialog
- [ ] Brand voice review of all copy passes
- [ ] At least 14 tests

### Spec 8.4 — Profile Prayer Wall Tab

- **ID:** `round3-phase08-spec04-profile-prayer-wall-tab`
- **Size:** M
- **Risk:** Low
- **Prerequisites:** 8.3
- **Goal:** Shows the user's own Prayer Wall posts (all 5 types). Reuses the existing `PrayerCard` rendering. Filters by post type within the tab. Privacy-respecting.

**Acceptance criteria:**

- [ ] Tab shows the user's posts
- [ ] Filter by post type within the tab works
- [ ] Anonymous posts NOT shown (anonymous = opaque even to viewers of the user's profile)
- [ ] Private and friends posts respect viewer permissions
- [ ] Deleted-user handling: posts by users with `is_deleted=TRUE` render as "Former member" with `avatarUrl: null`; backend never returns the deleted user's first_name/last_name/email even via this endpoint; the post itself remains visible (community memory matters; CaringBridge-style)
- [ ] Banned-user handling: posts by users with `is_banned=TRUE` render as "Banned member"; same anonymization as deleted; visible only to admins via a future admin-flag query param
- [ ] At least 12 tests (includes 2 new tests for deleted-user and banned-user rendering)

### Spec 8.5 — Profile Growth Tab

- **ID:** `round3-phase08-spec05-profile-growth-tab`
- **Size:** M
- **Risk:** Low
- **Prerequisites:** 8.4
- **Goal:** Shows the user's gentle gamification data: level, faith points, current streak, longest streak, badges earned, faith point trajectory chart (if visible). Anti-pressure framing throughout.

**Acceptance criteria:**

- [ ] Tab shows level, points, streaks, badges
- [ ] Trajectory chart respects privacy
- [ ] Anti-pressure copy passes review (no comparison framing, no shame)
- [ ] At least 10 tests

### Spec 8.6 — Profile Bible Tab

- **ID:** `round3-phase08-spec06-profile-bible-tab`
- **Size:** M
- **Risk:** Low
- **Prerequisites:** 8.5
- **Goal:** Shows the user's Bible activity: favorite verse, recent highlights (if visible), reading plans completed (if visible), most-read books.

**Acceptance criteria:**

- [ ] Tab shows Bible activity
- [ ] Privacy enforced
- [ ] Empty state for users with no Bible activity
- [ ] At least 8 tests

### Spec 8.7 — Profile Friends Tab

- **ID:** `round3-phase08-spec07-profile-friends-tab`
- **Size:** M
- **Risk:** Low
- **Prerequisites:** 8.6
- **Goal:** Shows the user's friends list (if visible per privacy). Each friend row links to their `/u/:username`. Friend count visible in the tab label.

**Acceptance criteria:**

- [ ] Tab shows friends
- [ ] Friend rows link to friend's profile
- [ ] Friend count in tab label
- [ ] Privacy enforced (private friend list hidden from non-friends)
- [ ] At least 8 tests

### Spec 8.8 — Name Canonicalization Migration

- **ID:** `round3-phase08-spec08-name-canonicalization`
- **Size:** XL
- **Risk:** High
- **Prerequisites:** 8.7
- **Goal:** Sweep across the frontend codebase replacing every `user.name`, `firstName + lastName`, `authorName` reference with `displayName` from the API. The single source of truth from Decision 3 is now actually the source of truth everywhere.

**Approach:** Recon: grep for every name reference. Categorize: which references are reading from `useAuth`, which are reading from `PrayerWallUser`, which are reading from `FriendProfile`. Update each category to use the canonical `displayName`. Update TypeScript types to expose `displayName` consistently. Verify no regressions across the entire app.

**Acceptance criteria:**

- [ ] No `user.name` references remain in components
- [ ] No `firstName + ' ' + lastName` concatenations remain
- [ ] All name displays use the API-computed `displayName`
- [ ] All four pre-existing name representations now consistent
- [ ] No regressions in any feature
- [ ] At least 30 tests cover the migration touchpoints

### Spec 8.9 — Phase 8 Cutover

- **ID:** `round3-phase08-spec09-phase8-cutover`
- **Size:** S
- **Risk:** Low
- **Prerequisites:** 8.8
- **Goal:** Cutover checklist. Manual QA pass.

**Acceptance criteria:**

- [ ] All 4 profile pages tested manually
- [ ] All redirects verified
- [ ] Cutover checklist completed
- [ ] Universal Rule 17 per-phase accessibility smoke test passes: axe-core automated scan on routes and components introduced or modified in this phase returns zero CRITICAL violations; keyboard-only navigation walkthrough of this phase's primary user flows completes without dead-ends; VoiceOver spot-check on the 2-3 most complex interactions introduced in this phase completes without blocking issues; evidence committed to `_cutover-evidence/phase8-a11y-smoke.json` (axe-core report) plus a brief markdown note recording keyboard and VoiceOver outcomes

---

## Phase 9 — Ritual & Time Awareness

> **Phase purpose:** Make Prayer Wall feel aware of time and tradition. Liturgical theming (Advent quiet, Lent purple, Easter celebration, Pentecost fire). Sunday Service Sync (subtle markers around Sunday morning). Time-of-day copy variations beyond Night Mode. Candle Mode for moments of silence. Small touches that make the app feel like a sanctuary that breathes with the church year.

**What this phase accomplishes:** During Advent, Prayer Wall has a quiet candle-blue accent. During Lent, a quiet violet. Easter Sunday morning, the Prayer Wall greeting reads "He is risen." On any Sunday morning, a small chip says "Many believers are gathered today." Tapping Candle Mode dims the Prayer Wall to almost-black with a single candle flame icon for moments of silence.

### Spec 9.1 — Liturgical Calendar Service

- **ID:** `round3-phase09-spec01-liturgical-calendar`
- **Size:** M
- **Risk:** Low
- **Prerequisites:** Phase 8 complete
- **Goal:** Backend service that returns the current liturgical season and any active feast/fast day. Frontend hook `useLiturgicalSeason()` consumes it.

**Approach:** `LiturgicalCalendarService` on the backend implements the Western Christian calendar (Advent, Christmas, Epiphany, Lent, Easter, Pentecost, Ordinary Time). Endpoint `GET /api/v1/liturgical/today` returns `{ season, feastDay?, color, mood }`. Frontend hook caches the response for 24 hours.

**Acceptance criteria:**

- [ ] All 6 seasons computed correctly
- [ ] Easter date computed via Computus algorithm
- [ ] Feast days returned for major celebrations
- [ ] Frontend hook caches per day
- [ ] At least 14 tests covering the calendar across years

### Spec 9.2 — Liturgical Theming on Prayer Wall

- **ID:** `round3-phase09-spec02-liturgical-theming`
- **Size:** M
- **Risk:** Low
- **Prerequisites:** 9.1
- **Goal:** Prayer Wall accent color shifts subtly with the liturgical season. Advent: deep blue. Lent: violet. Easter: warm gold. Pentecost: warm red. Ordinary Time: existing primary tint.

**Acceptance criteria:**

- [ ] Accent color changes with season
- [ ] Transition is gentle, not jarring
- [ ] Brand visual review passes
- [ ] At least 6 tests

### Spec 9.3 — Sunday Service Sync

- **ID:** `round3-phase09-spec03-sunday-service-sync`
- **Size:** S
- **Risk:** Low
- **Prerequisites:** 9.2
- **Goal:** On Sunday mornings (8am-noon local time), a small chip in the Prayer Wall header reads "Many believers are gathered today." On Easter morning, the chip reads "He is risen." Quiet, present, never assumes the user is or is not at church.

**Acceptance criteria:**

- [ ] Sunday morning chip appears 8am-noon local time
- [ ] Easter chip overrides on Easter Sunday morning
- [ ] Brand voice review passes
- [ ] At least 6 tests

### Spec 9.4 — Time-of-Day Copy Variations

- **ID:** `round3-phase09-spec04-time-of-day-copy`
- **Size:** M
- **Risk:** Low
- **Prerequisites:** 9.3
- **Goal:** Several copy strings throughout Prayer Wall vary subtly by time of day. Morning greetings, evening greetings, late-night quiet copy. Beyond Night Mode (which is the visual treatment), this is the language treatment.

**Acceptance criteria:**

- [ ] Greeting copy varies by time of day
- [ ] All copy variants pass brand voice review
- [ ] At least 8 tests

### Spec 9.5 — Candle Mode

- **ID:** `round3-phase09-spec05-candle-mode`
- **Size:** L
- **Risk:** Medium
- **Prerequisites:** 9.4
- **Goal:** A new mode the user can enter from the Prayer Wall menu: dims everything to almost-black, displays a single candle flame icon centered, plays optional ambient candle-flicker sound, hides all UI chrome. Tap to exit. Designed for moments of silence, lament, or vigil.

**Acceptance criteria:**

- [ ] Candle Mode button accessible from Prayer Wall menu
- [ ] Entering dims the entire screen
- [ ] Candle flame visible and centered
- [ ] Optional ambient sound respects sound settings
- [ ] Tap to exit works
- [ ] Escape key exits on desktop
- [ ] `prefers-reduced-motion` shows static flame
- [ ] Brand voice copy passes review
- [ ] At least 12 tests

---

## Phase 10 — Community Warmth & Moderation

> **Phase purpose:** The community-protection layer. First Time badges so newcomers feel welcomed not interrogated. Welcomer role for trusted community members. Presence cues that show who is here. Discourse-style trust levels that earn moderation privileges. 7 Cups three-tier escalation for harmful content. Automated phrase flagging extending the existing crisis detection. Peer moderator queue. Appeal flow. Rate limiting tightened. Admin foundation (column, audit log, helper) without building the admin UI yet.

**What this phase accomplishes:** New users get a warm "First Time" badge that veteran users see and respond to with extra care. Trusted users (high trust level) can hide problematic posts pending moderator review. Crisis-flagged content goes through a three-tier escalation: yellow (peer moderator), orange (Welcomer + admin notification), red (immediate admin escalation + crisis resources surfaced to the original poster). The admin foundation (an `is_admin` column, an `admin_audit_log` table, and a helper service) exists so future admin specs are not blocked.

### Spec 10.1 — First Time Badges

- **ID:** `round3-phase10-spec01-first-time-badges`
- **Size:** S
- **Risk:** Low
- **Prerequisites:** Phase 9 complete
- **Goal:** Users with fewer than 3 posts see a small "New here" badge next to their name on Prayer Wall posts. Veteran users notice and respond with extra care.

**Acceptance criteria:**

- [ ] Badge shows for users with < 3 posts
- [ ] Badge disappears at 3rd post
- [ ] At least 6 tests

### Spec 10.2 — Welcomer Role

- **ID:** `round3-phase10-spec02-welcomer-role`
- **Size:** M
- **Risk:** Medium
- **Prerequisites:** 10.1
- **Goal:** A new role flag on `users.is_welcomer`. Welcomers are trusted community members who take on a gentle responsibility to greet new posts from First Time users. They get a small "Welcomer" badge.

**Acceptance criteria:**

- [ ] `is_welcomer` column added via Liquibase
- [ ] Welcomer badge visible on Welcomer profiles
- [ ] At least 6 tests

### Spec 10.3 — Presence Cues

- **ID:** `round3-phase10-spec03-presence-cues`
- **Size:** M
- **Risk:** Low
- **Prerequisites:** 10.2
- **Goal:** Small "X people here today" footer on Prayer Wall (server-computed, daily). No real-time presence (out of scope for the wave); just a daily count of active users. Anti-pressure: never shows a precise number that might feel competitive.

**Acceptance criteria:**

- [ ] Footer shows rough daily active count
- [ ] Number rounded to nearest 10 (anti-pressure)
- [ ] Brand voice review passes
- [ ] At least 6 tests

### Spec 10.4 — Trust Levels (Discourse-Inspired)

- **ID:** `round3-phase10-spec04-trust-levels`
- **Size:** L
- **Risk:** High
- **Prerequisites:** 10.3
- **Goal:** Five trust levels (0-4) per Discourse's model. Level 0: new user, can post and react. Level 1: basic, can flag content. Level 2: regular, can hide flagged content pending review. Level 3: trusted, can resolve their own flags. Level 4: admin/Welcomer. Promotion is automatic based on activity.

**Acceptance criteria:**

- [ ] `trust_level` column added
- [ ] Trust level promotion logic in service layer
- [ ] Trust level enforced at moderation endpoints
- [ ] At least 18 tests

### Spec 10.5 — Three-Tier Escalation (7 Cups Inspired)

- **ID:** `round3-phase10-spec05-three-tier-escalation`
- **Size:** L
- **Risk:** High
- **Prerequisites:** 10.4
- **Goal:** Crisis detection escalates through three tiers based on severity. Yellow: peer moderator queue. Orange: peer queue + Welcomer ping + admin notification. Red: immediate admin escalation + crisis resources surfaced to OP.

**Acceptance criteria:**

- [ ] Backend escalation service implements the three tiers
- [ ] Each tier triggers correct downstream actions
- [ ] At least 18 tests

### Spec 10.6 — Automated Phrase Flagging

- **ID:** `round3-phase10-spec06-automated-flagging`
- **Size:** M
- **Risk:** High
- **Prerequisites:** 10.5
- **Goal:** Extend the existing `containsCrisisKeyword()` system to a backend service that runs on every post and comment. Phrase library expands to cover more nuanced harm patterns. Detection feeds into the three-tier escalation.

**Acceptance criteria:**

- [ ] Backend service runs on every post and comment
- [ ] Detection feeds the escalation tiers
- [ ] False positive rate logged and reviewable
- [ ] At least 18 tests

### Spec 10.7 — Peer Moderator Queue

- **ID:** `round3-phase10-spec07-peer-moderator-queue`
- **Size:** L
- **Risk:** Medium
- **Prerequisites:** 10.6
- **Goal:** A queue page where trust-level-2+ users can review flagged content and take actions: dismiss, hide pending review, escalate.

**Acceptance criteria:**

- [ ] Queue page renders pending reports
- [ ] Trust level enforcement on actions
- [ ] At least 14 tests

### Spec 10.7b — Report a User

- **ID:** `round3-phase10-spec07b-report-a-user`
- **Size:** M
- **Risk:** Medium (moderation feature with abuse potential — both real abuse of users AND vexatious reports; both failure modes need handling)
- **Prerequisites:** 10.7 (Peer Moderator Queue — user reports flow through the same queue)
- **Goal:** Let users report another user for pattern-level harassment, creepy DMs from the future, systemic boundary-violating behavior that spans a user's whole activity, and similar concerns that a single post-level report cannot capture. The existing post-level report (Spec 3.8) handles "this specific post violated community standards." This spec handles "this user has a pattern of behavior that needs attention." Without this, users facing sustained harassment have to file 40 post-reports to describe a single pattern — exhausting and ineffective. Moderators need the user-level aggregate view to see the pattern.

**Approach:** A new `user_reports` table and a "Report this user" action accessible from any user profile page (under a "..." menu, never as a prominent button). Reports require a reason category and a short narrative text. Reports flow into the same Phase 10.7 moderator queue as post reports, tagged as `target_type='user'`. Moderators reviewing a user report see the reported user's recent activity (last 30 days of posts + comments) in a single panel for context. To prevent weaponization, users are rate-limited to 3 user-reports per week, and reports auto-close if the reporter and reported user have no shared content history (no mutual posts/comments) — a protection against users with no interaction history filing reports as harassment.

**The report dialog:**

- Entry point: user profile page "..." menu → "Report this user"
- NOT available on your own profile (the "..." menu hides the option for self)
- NOT available on deleted-user profiles (the "Former member" profile from Spec 10.11)
- Dialog shows the reported user's avatar and display name at the top so the reporter confirms who they're reporting
- Reason picker (radio): Harassment or bullying / Unwanted romantic or sexual attention / Impersonation / Spam or self-promotion / Crisis-adjacent concerning pattern / Other
- Narrative text (required, 50-1000 chars): "What pattern of behavior are you reporting? Please include examples if you can."
- Optional field: "Specific posts or comments to flag" (free-text post IDs or URLs the reporter can paste)
- Submit button: "Submit report" — once tapped, report is sealed (no edits after submission; can be followed up by a moderator contact)
- Cancel button: "Never mind"
- Confirmation after submit: "Thank you. A moderator will review within 48 hours. We'll let you know what we decide."

**Anti-weaponization guards:**

- Rate limit: 3 user-reports per reporter per rolling 7 days (server-enforced)
- Pattern-match abuse detection: if a single reporter files > 5 user-reports across any 30-day window that are all closed as "no action taken," their reporting is temporarily suspended for 30 days (with notification) — prevents drive-by mass-reporting
- Zero-interaction-history gate: if reporter and reported user have no mutual posts/comments within the last 90 days, the report is AUTO-FLAGGED for moderator skepticism (a banner in the moderator view says "These users have no interaction history — verify this report reflects genuine interaction, not external targeting")
- Reports about admins and moderators flow through a separate queue reviewed by Eric directly (prevents coordinated reporting of moderators to silence enforcement)
- Self-report attempt server-side rejected with a quiet 400

**What the reported user sees:**

- NOTHING until/unless an action is taken. No "someone has reported you" notification. This prevents two failure modes: (a) retaliation against the suspected reporter, and (b) chilling effect on legitimate reporters.
- If a moderator warns the reported user, they receive the warning per Phase 10.5's three-tier escalation. They do not see who reported them unless the moderator chooses to share that context (they usually will not).
- If a moderator takes no action, the reported user is never informed the report existed.
- If the moderator bans or restricts the reported user, the action notification goes through normal ban-notification channels; the report context stays internal.

**What moderators see in the queue:**

- User report row includes: reported user's display name + avatar, reporter's display name + avatar, reason category, full narrative text, submitted timestamp, zero-interaction flag (if applicable)
- "Expand context" button: loads the reported user's last 30 days of public activity (posts + comments that the reporter or a moderator could have seen), highlighting any referenced by the reporter's narrative
- "View past reports about this user" button: lists any prior user-reports AND prior post-reports naming this user as the subject/author (per Phase 10.7 queue cross-reference)
- Moderator actions: Close with no action, Send warning (Phase 10.5 yellow-tier), Restrict account (limit post frequency for 7 days), Suspend 7 days, Suspend 30 days, Ban permanently
- Every action writes to `admin_audit_log` per Spec 10.10 with: the action taken, the moderator who took it, the reported user, the reporter, the reason, and a mandatory moderator note (50+ chars)

**Moderator feedback to the reporter:**

- The reporter receives a Phase 12 notification when the report is resolved: "Thanks for your report. We reviewed it and {took action / determined no action was needed}."
- Action-taken notifications do NOT disclose which specific action (preserves the reported user's privacy)
- No-action notifications include the moderator's anonymized rationale category (e.g., "We found the content was within community standards" or "We weren't able to verify the pattern you described")
- Reporters can appeal a no-action decision via Phase 10.8 Appeal Flow, which escalates to Eric

**Anti-pressure design:**

- Reporting UI is deliberately friction-ful (confirmation dialog, required narrative, rate limit) to prevent impulsive or trivial reports — but NOT so friction-ful that users facing real harassment give up
- No public "report count" or "times-reported" badge on user profiles — would create stigma/scarlet-letter dynamics and be easily gamed by coordinated reporting
- Narrative text is required because "report without context" signals either genuine inability to articulate (maybe AI-generated spam report) or vexatious reporting (maybe personal vendetta). 50-char minimum forces the reporter to name the pattern.
- Reporter anonymity maintained against the reported user by default; moderators can disclose identity only with reporter consent (separate out-of-band channel)

**Files to create:**

- `frontend/src/components/prayer-wall/ReportUserDialog.tsx`
- `frontend/src/components/prayer-wall/ReportUserSuccessToast.tsx`
- `backend/src/main/java/com/worshiproom/moderation/UserReportController.java`
- `backend/src/main/java/com/worshiproom/moderation/UserReportService.java`
- `backend/src/main/java/com/worshiproom/moderation/dto/UserReportRequest.java`
- `backend/src/main/java/com/worshiproom/moderation/dto/UserReportResponse.java`
- `backend/src/main/resources/db/changelog/2026-04-22-004-create-user-reports-table.xml`
- `backend/src/test/java/com/worshiproom/moderation/UserReportIntegrationTest.java`
- `__tests__/ReportUserDialog.test.tsx`

**Files to modify:**

- `UserProfilePage.tsx` (or equivalent) — add "..." menu with "Report this user" option on others' profiles
- Phase 10.7 moderator queue component — render user-report rows with different styling and "Expand context" action
- `constants/moderation-copy.ts` — add all new report-reason labels and dialog strings
- OpenAPI spec — document new endpoints
- `.claude/rules/11-local-storage-keys.md` — no new keys (all server-side)

**Database changes:**

- New table `user_reports`: `(id UUID PK, reporter_user_id UUID NOT NULL FK → users, reported_user_id UUID NOT NULL FK → users, reason_category VARCHAR(50), narrative TEXT, referenced_post_ids TEXT[], zero_interaction_flag BOOLEAN, status VARCHAR(20) — 'pending', 'reviewing', 'closed_action', 'closed_no_action', moderator_id UUID FK → users, moderator_note TEXT, created_at TIMESTAMP, resolved_at TIMESTAMP)`
- Index on `(reported_user_id, created_at DESC)` for "view past reports about this user"
- Index on `(reporter_user_id, created_at DESC)` for rate-limit checks
- CHECK constraint: `reporter_user_id != reported_user_id`
- Liquibase changeset: `2026-04-22-004-create-user-reports-table.xml`

**API changes:**

- `POST /api/v1/users/{userId}/reports` — body `{ reason_category, narrative, referenced_post_ids?: string[] }`. Auth required. Returns 201 with receipt ID. Server enforces: not self-report, rate limit, zero-interaction-flag detection, mass-reporter suspension check.
- `GET /api/v1/moderation/user-reports?status=pending&limit=20` — moderator-only (Trust Level ≥ 4 or is_admin). Paginated queue.
- `PATCH /api/v1/moderation/user-reports/{id}` — moderator action: `{ action: 'warn'|'restrict'|'suspend_7d'|'suspend_30d'|'ban'|'no_action', moderator_note: string (min 50 chars) }`. Writes to audit log.
- `GET /api/v1/moderation/user-reports/{id}/context` — moderator-only. Returns reported user's last 30d of public activity.

**Copy Deck:**

- Profile menu label: "Report this user"
- Dialog heading: "Report {displayName}"
- Reason radio group label: "Why are you reporting this user?"
- Reason options: "Harassment or bullying", "Unwanted romantic or sexual attention", "Impersonation", "Spam or self-promotion", "Crisis-adjacent concerning pattern", "Other"
- Narrative label: "What pattern of behavior are you reporting?"
- Narrative placeholder: "Please include examples if you can. A moderator will read this carefully."
- Narrative helper: "At least 50 characters. This is the context a moderator needs to act on your report."
- Referenced-posts label (optional): "Link to specific posts or comments (optional)"
- Submit button: "Submit report"
- Cancel button: "Never mind"
- Confirmation toast: "Thank you. A moderator will review within 48 hours. We'll let you know what we decide."
- Rate-limit error: "You've filed 3 user reports this week. You can file again next week. For urgent concerns, contact support directly."
- Self-report error (should never reach UI, but fallback): "You can't report yourself."
- Moderator outcome — action taken: "Thanks for your report. We reviewed it and took action."
- Moderator outcome — no action: "Thanks for your report. We reviewed it and determined no action was needed this time. You can appeal this decision if you believe we missed something."
- Moderator queue zero-interaction banner: "These users have no interaction history in the last 90 days — verify this report reflects genuine interaction, not external targeting."
- Moderator mass-reporter suspension notification to reporter: "Your ability to report users has been temporarily paused for 30 days. This happens when many of a user's reports are not substantiated."

**Anti-Pressure Copy Checklist:** (a) no comparison ✓ (b) no urgency ✓ (c) no exclamation points near vulnerability ✓ (d) no therapy-app jargon ✓ (e) no streak-as-shame ✓ (f) no false scarcity ✓

**Anti-Pressure Design Decisions:**

- Friction-ful but not prohibitive entry (confirmation dialog, required narrative, rate limit)
- No public "times reported" counters on profiles
- Reporter anonymity preserved against reported user by default
- No "someone reported you" notification to reported user unless action is taken
- Zero-interaction flag prevents weaponized reporting from users who never met the target
- Mass-reporter suspension prevents coordinated harassment campaigns disguised as reports
- Narrative required to filter low-signal reports
- 48-hour moderator SLA stated in confirmation copy
- Appeal path available for no-action decisions

**Acceptance criteria:**

- [ ] "Report this user" appears in profile "..." menu for other users' profiles
- [ ] Option is hidden on own profile
- [ ] Option is hidden on soft-deleted and hard-deleted user profiles
- [ ] Dialog renders all 6 reason categories as radio options
- [ ] Narrative text field enforces 50-1000 char range
- [ ] Server validates reporter_user_id != reported_user_id (400 on self-report attempt)
- [ ] Rate limit: 4th report within 7 days returns 429 with correct retry-after
- [ ] Zero-interaction flag correctly set when no mutual posts/comments in last 90 days
- [ ] Zero-interaction flag correctly cleared when any mutual interaction exists
- [ ] Mass-reporter detection: 6th closed-no-action report in 30 days triggers 30-day reporting suspension
- [ ] Suspended reporters receive notification and subsequent report attempts return 403
- [ ] Suspension auto-lifts after 30 days
- [ ] Report row appears in moderator queue with correct rendering
- [ ] Moderator queue visible only to users with Trust Level ≥ 4 or is_admin (403 otherwise)
- [ ] "Expand context" action returns reported user's last 30 days of public activity
- [ ] "View past reports" shows both prior user-reports and prior post-reports naming this user
- [ ] Every moderator action writes to admin_audit_log with mandatory 50+ char note
- [ ] Reports about admins/moderators routed to separate queue (Eric-only)
- [ ] Reported user receives NO notification when a report is filed
- [ ] Reported user receives warning/restriction/suspension notifications only when those actions are taken (per Phase 10.5 escalation)
- [ ] Reporter receives anonymous resolution notification once report is closed
- [ ] No-action resolution includes appeal path information
- [ ] Reporter identity never disclosed to reported user via any automated channel
- [ ] Liquibase changeset creates table with all columns, constraints, and indexes
- [ ] At least 22 tests covering dialog, rate limit, zero-interaction, mass-reporter detection, moderator queue, notification flow

**Testing notes:**

- Integration test: file report, verify row in `user_reports`, verify rate-limit counter increments
- Integration test: 4th report in 7 days returns 429
- Integration test: zero mutual interaction → flag set; one shared post from 80 days ago → flag cleared
- Integration test: seed 6 closed-no-action reports from the same reporter across 30 days, attempt 7th, verify suspension triggers
- Integration test: moderator resolves with action → audit log row created, reporter notified, reported user notified per 10.5
- Integration test: moderator resolves with no action → audit log row, reporter notified with appeal path
- Security test: non-moderator attempts to access moderator queue endpoint, verify 403
- Security test: reporter attempts self-report via crafted API call, verify 400
- Playwright: profile "..." menu → Report dialog → fill out → submit → confirmation toast

**Notes for plan phase recon:**

1. Confirm the shared Phase 10.7 moderator queue UI can render both post-reports and user-reports with different styling (tabs or filter chip). Recommend adding a "Type: Post | User" filter.
2. Decide trust level threshold for moderator queue access. Default: ≥ 4 OR is_admin. Re-confirm Phase 10.4 trust level thresholds make this achievable by actual members.
3. Verify the "referenced post IDs" field accepts both full URLs and bare post IDs (helpful for reporters who copy-paste from the address bar).
4. Confirm moderator-note minimum 50 chars is reasonable — some actions have clear rationale expressible in fewer chars. Consider 30 chars.
5. Confirm mass-reporter detection window (30 days, 6 reports) — these are starting values; tune based on real signal.

**Out of scope:**

- In-thread reporting of users from within a post/comment (use the profile menu path)
- AI-assisted report triage (all triage is human moderator review for MVP)
- Public moderator action log (moderator actions are internal only)
- Reporter-to-moderator chat during review (one-shot report + one-shot resolution for MVP)
- Cross-reporting of users across platforms (Worship-Room-internal only)
- Automated permanent bans triggered by N reports (always requires moderator human action)

**Out-of-band notes for Eric:** The zero-interaction-flag + mass-reporter suspension are the two features that prevent this from becoming a tool of harassment itself. Without them, coordinated bad actors would use user-reporting as a silencing mechanism against legitimate users (especially anyone visibly LGBT+, anyone sharing mental-health content, anyone posting in certain theological traditions). With them, the feature stays trustworthy. Also: resist future pressure to show "users reported X times" counters publicly. That single design decision — report counts as private-to-moderators — is what separates this feature from becoming a Twitter-style pile-on vector. Finally: the 48-hour SLA in the confirmation copy is a promise. If your moderator capacity can't sustain 48 hours, change the copy to 72 or 96. Don't promise what you can't deliver on a vulnerability feature.

---

### Spec 10.8 — Appeal Flow

- **ID:** `round3-phase10-spec08-appeal-flow`
- **Size:** M
- **Risk:** Medium
- **Prerequisites:** 10.7
- **Goal:** Users whose content is hidden or removed can appeal. Appeals go to a separate queue for admin review.

**Acceptance criteria:**

- [ ] Appeal endpoint and UI in place
- [ ] Appeal queue separate from report queue
- [ ] At least 10 tests

### Spec 10.9 — Rate Limiting Tightening

- **ID:** `round3-phase10-spec09-rate-limit-tightening`
- **Size:** S
- **Risk:** Low
- **Prerequisites:** 10.8
- **Goal:** Audit and tighten rate limits across all Prayer Wall write endpoints. Add per-IP fallback for unauthenticated abuse.

**Acceptance criteria:**

- [ ] All limits documented and reviewed
- [ ] Per-IP fallback in place
- [ ] At least 8 tests

### Spec 10.10 — Admin Foundation

- **ID:** `round3-phase10-spec10-admin-foundation`
- **Size:** M
- **Risk:** Low
- **Prerequisites:** 10.9
- **Goal:** `is_admin` column (already in schema from Phase 1), `admin_audit_log` table, `AdminAuditService` helper. NO admin UI in this phase — that is deferred to a future wave. Just the foundation so future admin specs are not blocked.

**Acceptance criteria:**

- [ ] `admin_audit_log` table created
- [ ] AdminAuditService logs all admin actions
- [ ] No admin UI built (out of scope)
- [ ] At least 10 tests

---

### Spec 10.11 — Account Deletion and Data Export

- **ID:** `round3-phase10-spec11-account-deletion-data-export`
- **Size:** L
- **Risk:** High (destructive on hard delete; requires careful cascade; GDPR-adjacent, so "good enough" is not good enough)
- **Prerequisites:** 10.9 (admin foundation), 10.10 (moderation queue — so deletion interacts cleanly with flagged content)
- **Goal:** Give users a respectful, legally-grounded path to either take their data with them (JSON export) or leave entirely (account deletion with 30-day grace period). This is the GDPR baseline: access and erasure. No dark patterns on deletion — no "are you sure you want to leave?" guilt loop, no "tell us why" mandatory field, no artificial friction beyond a typed confirmation. Also not adversarial to mistakes: the 30-day grace period means a user who deletes impulsively and regrets it within a month can log back in and the deletion is paused.

**Approach (two features in one spec, closely coupled by the same Settings surface):**

### Feature 1: Data Export

`GET /api/v1/users/me/export` returns a JSON dump of all the user's data in a single response (streaming for large accounts). Response includes:

- Profile: id, email, first_name, last_name, username, bio, favorite_verse_reference, favorite_verse_text, joined_at, timezone, settings preferences
- Posts: id, post_type, content, category, is_anonymous, created_at, image_url (if any), help_tags, is_answered, answered_text, answered_at, moderation_status (omitted if 'removed' by admin — user shouldn't see admin moderation state), crisis_flag (for transparency)
- Comments: id, post_id (only if post is also in this export; other users' posts only include the user's comment, not the full post), content, created_at
- Reactions: post_id, reaction_type, created_at (only for posts in this export; a list of "you reacted to post IDs you can no longer see" is not useful)
- Bookmarks: post_id, bookmarked_at (for posts still visible)
- Activity log: all entries (activity_type, source_feature, occurred_at, points_earned, metadata)
- Faith points: total_points, current_level, last_updated
- Streak state: current_streak, longest_streak, last_active_date, grace_days_used, grief_pause_until
- Badges: all earned badges with earned_at and display_count
- Friends: friend user IDs + accepted_at timestamps (NOT full friend profiles — respects friends' privacy)
- Friend requests: outbound only (inbound requests are other users' data)
- Notifications: the user's inbox entries
- Settings: all preferences

Excluded from export (explicit):

- Other users' comments on the exporting user's posts (they're authored by someone else; they can export their own)
- Other users' reactions on the exporting user's posts (same reason — aggregate counts OK, individual user IDs not OK)
- Admin audit log entries about the user
- Moderation reports filed BY the user (these are the user's data, include them — but reports filed ABOUT the user are excluded)
- Any email or server logs

Rate limit: 3 exports per user per 24 hours (the export is expensive; a user-triggered export is rare — 3/day handles edge cases).

### Feature 2: Account Deletion

**Phase 1: Soft delete with 30-day grace period.**

User taps "Delete my account" in Settings → typed-confirmation modal ("Type DELETE to confirm"). On confirm:

- `users.is_deleted = true`, `users.deleted_at = NOW()`
- User immediately logged out
- All `/api/v1/users/me/*` endpoints return 404 for this user going forward
- Backend `authentication` flow recognizes a login attempt on a soft-deleted account and returns a special `202 DELETION_PAUSED` response rather than 401 — the frontend renders a "Welcome back. We paused your deletion. Keep your account?" confirmation screen. If the user confirms "keep", `is_deleted = false` and `deleted_at = NULL`. If they confirm "complete deletion", the hard-delete job fires immediately (skipping the 30-day wait).
- During the grace period, the user's posts, comments, reactions remain visible (but attributed to an "Account pending deletion" display name to signal the state). Their notifications stop. Friends see them disappear from the friends list.

**Phase 2: Hard delete after 30 days.**

Scheduled job runs nightly. For each user with `is_deleted = true AND deleted_at < (now - INTERVAL '30 days')`:

- Posts: `content = '[deleted]'`, `author_display_name = 'Former member'`, `image_url = NULL`, S3 image objects queued for async deletion. Post ID and timestamps preserved (comment threads and reaction histories from OTHER users remain coherent).
- Comments: `content = '[deleted]'`, `author_display_name = 'Former member'`. Same rationale.
- Reactions, bookmarks, reports: hard DELETE (no need to preserve).
- Activity log: hard DELETE (no cross-user impact).
- Faith points, streak state, user badges: hard DELETE.
- Friend relationships, friend requests: hard DELETE (both sides; the other user's friends list simply shrinks by one).
- Notifications: hard DELETE (both the user's inbox and any notifications about this user sitting in other users' inboxes).
- Moderation reports filed BY this user: preserved but anonymized (`reporter_id = NULL`, `reporter_note` preserved). Moderation history shouldn't be destroyed by the reporter's deletion.
- Moderation reports ABOUT this user: preserved as-is (about-subject stays attached for admin record-keeping).
- User row itself: content-fields nulled (`email = NULL`, `password_hash = NULL`, `first_name = 'Former'`, `last_name = 'member'`, `custom_display_name = NULL`, `bio = NULL`, `favorite_verse_reference = NULL`, `favorite_verse_text = NULL`). Row NOT deleted — foreign keys in other tables (e.g., post author_id) still reference this id. `is_deleted = true` stays for permanent record.
- S3 image objects: async cleanup job deletes objects 7 days after hard delete (grace window in case the hard delete itself was a mistake).

### Anti-pressure design

- No "we're sad to see you go" dark pattern
- No "tell us why" mandatory field (optional feedback field allowed, always skippable)
- No "90% of users who tried to delete found X helpful" suggested alternatives
- Typed confirmation ("DELETE") is friction, but it's honest friction — prevents accidental-tap deletion, not a guilt gate
- 30-day grace clearly explained before confirmation
- Data export offered ABOVE the delete option in Settings ("Before you go, you can download your data")
- After deletion confirmation, the logout page says "Your account is scheduled for deletion. You can reactivate by logging in before {date}." — factual, not begging

### Files to create

- `backend/src/main/java/com/worshiproom/user/DataExportController.java`
- `backend/src/main/java/com/worshiproom/user/DataExportService.java`
- `backend/src/main/java/com/worshiproom/user/AccountDeletionController.java`
- `backend/src/main/java/com/worshiproom/user/AccountDeletionService.java`
- `backend/src/main/java/com/worshiproom/user/HardDeleteScheduledJob.java`
- `backend/src/main/java/com/worshiproom/user/dto/DataExportResponse.java`
- `backend/src/test/java/com/worshiproom/user/DataExportIntegrationTest.java`
- `backend/src/test/java/com/worshiproom/user/AccountDeletionIntegrationTest.java`
- `backend/src/test/java/com/worshiproom/user/HardDeleteCascadeIntegrationTest.java`
- `backend/src/main/resources/db/changelog/2026-04-22-001-add-moderation-reports-reporter-nullable.xml` (allows reporter_id to become NULL on user delete)
- `frontend/src/components/settings/DangerZone.tsx`
- `frontend/src/components/settings/DeleteAccountModal.tsx`
- `frontend/src/pages/DeletionPaused.tsx` (shown on login during grace period)
- `__tests__/*.test.tsx` for each frontend module

### Files to modify

- `frontend/src/pages/Settings.tsx` (mount DangerZone at the bottom)
- `backend/src/main/java/com/worshiproom/auth/AuthService.java` (handle soft-deleted user login specially)
- OpenAPI spec (adds export + deletion endpoints)
- Post/comment DTO serialization (renders "Former member" for hard-deleted authors)

### API changes

- `GET /api/v1/users/me/export` — returns full JSON dump, rate limited 3/24h
- `POST /api/v1/users/me/delete` — body `{ typed_confirmation: "DELETE" }`, sets soft-delete
- `POST /api/v1/users/me/delete/cancel` — cancels pending deletion (only accessible during grace period, requires auth)
- `POST /api/v1/users/me/delete/confirm-hard` — skips 30-day wait, fires hard delete immediately (requires re-authentication)

### Copy Deck

- Settings section heading: "Your data"
- Export button: "Download my data"
- Export helper: "You'll get a JSON file with everything you've written, reacted to, and earned. It includes posts, comments, reactions, activity, and settings."
- Export limit hit: "You can download your data 3 times a day. Try again tomorrow."
- Danger Zone heading: "Delete my account"
- Delete intro: "Deleting your account removes your profile, posts, comments, and activity. It's permanent after 30 days."
- Delete confirmation instruction: "Type DELETE to confirm."
- Delete confirmation button: "Delete account"
- Optional feedback prompt: "Anything you want to share? (optional)"
- Post-delete logout message: "Your account is scheduled for deletion. You can reactivate by logging in before {date}."
- Grace period welcome-back screen: "Welcome back. We paused your deletion. Keep your account?" with "Keep my account" and "Complete deletion now" buttons
- Hard-deleted author display: "Former member"
- Hard-deleted post/comment content: "[deleted]"

**Anti-Pressure Copy Checklist:** (a) no comparison ✓ (b) no urgency ✓ (c) no exclamation points near vulnerability ✓ (d) no therapy-app jargon ✓ (e) no streak-as-shame ✓ (f) no false scarcity ✓

### Acceptance criteria

- [ ] Export endpoint returns complete JSON dump matching the export shape above
- [ ] Export excludes other users' comments, reactions, admin moderation
- [ ] Export rate-limited to 3/24h (4th attempt returns 429)
- [ ] Soft delete sets `is_deleted = true`, `deleted_at = NOW()` on users
- [ ] Soft-deleted user is immediately logged out
- [ ] Login during grace period returns `202 DELETION_PAUSED` and triggers welcome-back screen
- [ ] Welcome-back screen "Keep" button restores account; "Complete deletion" button fires immediate hard delete
- [ ] Scheduled hard-delete job correctly cascades: posts/comments anonymized, reactions/bookmarks/activity/points/streaks/badges/friends/notifications deleted
- [ ] Moderation reports filed BY deleted user become `reporter_id = NULL` but are preserved
- [ ] Moderation reports filed ABOUT deleted user are preserved unchanged
- [ ] S3 image objects queued for deletion 7 days after hard delete (verified via async job)
- [ ] Post/comment DTO renders "Former member" for hard-deleted authors
- [ ] Friend relationship deletion removes BOTH directional rows
- [ ] Notifications about deleted user are purged from all other users' inboxes
- [ ] Typed confirmation rejects any input other than exact "DELETE" (case-sensitive)
- [ ] Optional feedback field is truly optional (submit with empty string succeeds)
- [ ] No mandatory "tell us why" field
- [ ] Export endpoint streams response for accounts with >10 MB of data
- [ ] At least 30 tests covering all cascade paths, grace period flows, rate limits, and edge cases

### Testing notes

- Integration tests build a fully populated user (posts, comments, reactions, friends, badges, notifications, reports filed by and about) then soft-delete and verify state, then simulate the scheduled job and verify hard-delete cascade
- Edge case: user with moderation reports filed by them → verify reporter_id nulled but report preserved
- Edge case: user whose post has another user's answered-prayer reference → verify reference still resolves after anonymization
- Edge case: user deletes during active Phase 6 Quick Lift session → verify session ends gracefully, activity still recorded
- Playwright test: full delete flow from Settings → typed confirmation → logout → welcome-back on login → cancel

### Notes for plan phase recon

1. Confirm email sending infrastructure (Phase 15) is in place for the deletion confirmation email (optional but recommended — even a "your account has been scheduled for deletion on {date}" transactional email is helpful)
2. Verify scheduled job infrastructure (Spring `@Scheduled`) is set up
3. Confirm the 30-day grace period meets legal requirements in user geographies (GDPR says "without undue delay" which courts have generally interpreted as ≤30 days — we're at the boundary)
4. Check whether admin dashboard needs to surface "pending deletions" list (probably yes — for legal compliance audit)

### Out of scope

- Partial deletion ("delete my posts but keep my account") — different feature
- Account merging (two accounts merging into one) — rare, complex, out of scope
- Temporary deactivation (90-day pause) — distinct from deletion, consider for a later spec
- Export format options (CSV, XML) — JSON only for MVP
- Scheduled export (email me my data monthly) — out of scope

### Out-of-band notes for Eric

The 30-day grace period is the single most important choice in this spec. It turns "I impulsively deleted my account and lost everything" into "I impulsively deleted my account and got it back when I logged in." Almost every adverse outcome from account deletion is recoverable for 30 days, which means the typed-confirmation pattern doesn't need to be adversarial — the confirmation catches accidental-tap deletion, and the grace period catches impulsive-regret deletion. Together they handle the two distinct failure modes without adding guilt-trip copy. The "Former member" anonymization after hard delete is also important: post and comment threads remain coherent (conversations don't become incomprehensible after a participant leaves), but the identity is fully erased. Some apps delete posts entirely on user deletion, which orphans the conversations of every user who replied; we deliberately don't.

---

## Phase 11 — Search & Discovery

> **Phase purpose:** Make Prayer Wall content findable. Full-text post search, find by author, find by verse reference, find by date. Backed by PostgreSQL full-text search (no Elasticsearch dependency for the wave). The audit confirmed the existing PostgreSQL 16 install supports `tsvector` columns and GIN indexes, which is sufficient for tens of thousands of posts.

**What this phase accomplishes:** A search bar appears in the Prayer Wall header. Typing returns matches across post content, comments, authors, and scripture references. Filters narrow by post type, category, date range, and author. Results respect privacy (private posts only show up in the author's own searches; friends posts only show up if the searcher is a friend).

### Spec 11.1 — Full-Text Search Schema and Indexing

- **ID:** `round3-phase11-spec01-fulltext-search-schema`
- **Size:** M
- **Risk:** Medium
- **Prerequisites:** Phase 10 complete
- **Goal:** Add a `tsvector` column to `posts` and `post_comments`. GIN index for fast lookup. Trigger maintains the column on insert/update.

**Approach:** Liquibase changeset adds `content_tsv tsvector GENERATED ALWAYS AS (to_tsvector('english', content)) STORED` to `posts` and `post_comments`. GIN indexes on both. Backfill is automatic since the column is generated.

**Acceptance criteria:**

- [ ] `content_tsv` column added to both tables
- [ ] GIN indexes created
- [ ] Existing rows automatically get tsvector populated
- [ ] Search query plan uses the GIN index (verify with `EXPLAIN`)
- [ ] At least 6 tests

### Spec 11.2 — Search API Endpoint

- **ID:** `round3-phase11-spec02-search-endpoint`
- **Size:** L
- **Risk:** Medium
- **Prerequisites:** 11.1
- **Goal:** Implement `GET /api/v1/search?q=...&postType=...&category=...&author=...&from=...&to=...`. Returns paginated results matching all filters, respecting privacy.

**Approach:** `SearchController` and `SearchService`. Query uses `to_tsquery('english', :q)` against `content_tsv`. Filters joined as additional WHERE clauses. Visibility enforcement reuses the visibility predicate from Phase 3.3. Results returned as a paginated list of `PostResponse` (matching feed shape) plus a separate `commentMatches` list when comments matched.

**Acceptance criteria:**

- [ ] Search returns posts matching the query
- [ ] Comment matches return their parent post in the results
- [ ] All filters work in combination
- [ ] Privacy enforced
- [ ] Pagination works
- [ ] Empty query returns 400
- [ ] At least 18 tests

### Spec 11.3 — Search UI

- **ID:** `round3-phase11-spec03-search-ui`
- **Size:** L
- **Risk:** Medium
- **Prerequisites:** 11.2
- **Goal:** Search bar in the Prayer Wall header. Tapping opens a full-screen search overlay on mobile, an inline expanded search on desktop. Filters as collapsible chips. Results use the existing `PrayerCard` rendering. Recent searches saved to localStorage.

**Files to create:**

- `frontend/src/components/prayer-wall/SearchOverlay.tsx`
- `frontend/src/components/prayer-wall/SearchFilters.tsx`
- `frontend/src/lib/prayer-wall/recentSearchesStore.ts`

**Acceptance criteria:**

- [ ] Search bar renders in header
- [ ] Mobile: full-screen overlay
- [ ] Desktop: inline expanded
- [ ] Filters work
- [ ] Recent searches persist
- [ ] Brand voice copy passes review
- [ ] At least 18 tests

### Spec 11.4 — Search by Verse Reference

- **ID:** `round3-phase11-spec04-search-by-verse`
- **Size:** M
- **Risk:** Low
- **Prerequisites:** 11.3
- **Goal:** Searching for a verse reference (e.g., "John 3:16", "Psalm 23") matches posts with that scripture reference in the optional `scripture_reference` field.

**Acceptance criteria:**

- [ ] Verse reference parser detects scripture references in queries
- [ ] Matches across `posts.scripture_reference`
- [ ] Common reference formats supported
- [ ] At least 10 tests

---

## Phase 12 — Notification Taxonomy

> **Phase purpose:** Expand the notification system from the Prayer Receipt + existing Spec 9 notification system to a full catalog of Forums Wave notification types. Friend posts, comments on your posts, replies to your comments, mentions, intercession milestones, prayer-answered celebrations, weekly digests, moderation outcomes. Plus per-type preferences in settings.

### Spec 12.1 — Notification Types Catalog

- **ID:** `round3-phase12-spec01-notification-types`
- **Size:** M
- **Risk:** Low
- **Prerequisites:** Phase 11 complete
- **Goal:** Define and seed the full set of Forums Wave notification types. Extend the existing `wr_notifications` schema (and backend equivalent in this wave) with new type values.

**New notification types:**

- `prayer_received` — someone prayed for your post
- `comment_received` — someone commented on your post
- `reply_received` — someone replied to your comment
- `mention_received` — someone @mentioned you
- `intercession_milestone` — your post reached a praying-count milestone (10, 25, 50, 100)
- `prayer_answered_witness` — a post you prayed for was marked answered
- `friend_posted` — a friend posted a new prayer
- `weekly_digest` — Sunday evening summary

**Acceptance criteria:**

- [ ] All 8 new types defined in frontend constants
- [ ] All 8 types defined in backend enum
- [ ] Each type has display label, icon, default action route
- [ ] At least 8 tests

### Spec 12.2 — Notification Backend Schema and Endpoints

- **ID:** `round3-phase12-spec02-notification-backend`
- **Size:** L
- **Risk:** Medium
- **Prerequisites:** 12.1
- **Goal:** Add `notifications_inbox` table. CRUD endpoints for the inbox. Dual-write from frontend (existing `wr_notifications` stays as primary) for now. Backend-generated notifications (e.g., friend posts) flow through the same table.

**Acceptance criteria:**

- [ ] Schema created
- [ ] CRUD endpoints work
- [ ] At least 18 tests

### Spec 12.3 — Notification Generators

- **ID:** `round3-phase12-spec03-notification-generators`
- **Size:** L
- **Risk:** Medium
- **Prerequisites:** 12.2
- **Goal:** Backend services that generate notifications when relevant events occur. PostService notifies post author on new comment. CommentService notifies parent comment author on reply. ReactionService notifies post author on milestones. Etc.

**Acceptance criteria:**

- [ ] Each generator fires on the right event
- [ ] Notifications include correct action route
- [ ] No self-notifications (you don't notify yourself when you comment on your own post)
- [ ] At least 18 tests

### Spec 12.4 — Notification Preferences

- **ID:** `round3-phase12-spec04-notification-preferences`
- **Size:** M
- **Risk:** Low
- **Prerequisites:** 12.3
- **Goal:** Settings page section where users can toggle each notification type independently. Backend honors the preferences when generating notifications.

**Acceptance criteria:**

- [ ] Settings UI shows toggles for each type
- [ ] Preferences persist
- [ ] Backend skips generation for disabled types
- [ ] At least 14 tests

### Spec 12.5 — Mention System

- **ID:** `round3-phase12-spec05-mention-system`
- **Size:** L
- **Risk:** Medium
- **Prerequisites:** 12.4
- **Goal:** @mention parsing in post content and comment content. Mentions render as links to `/u/:username`. Mentioned user gets a notification.

**Acceptance criteria:**

- [ ] @username parsed in content
- [ ] Renders as link
- [ ] Mentioned user gets notification
- [ ] Backend resolves usernames at write time
- [ ] At least 14 tests

---

## Phase 13 — Personal Analytics & Insights

> **Phase purpose:** Personal data displays for the Prayer Wall journey. Year-in-review-style insights. Anti-pressure throughout.

### Spec 13.1 — Personal Insights Endpoint

- **ID:** `round3-phase13-spec01-insights-endpoint`
- **Size:** M
- **Risk:** Low
- **Prerequisites:** Phase 12 complete
- **Goal:** Backend computes per-user insights: total posts, total intercessions, most common category, longest engagement streak, prayers answered count.

**Acceptance criteria:**

- [ ] Endpoint returns insights
- [ ] All counts accurate
- [ ] Anti-pressure: no comparisons, no rankings
- [ ] At least 12 tests

### Spec 13.2 — Insights UI Card

- **ID:** `round3-phase13-spec02-insights-card`
- **Size:** M
- **Risk:** Low
- **Prerequisites:** 13.1
- **Goal:** A card on the user's profile Growth tab showing the insights in warm, anti-pressure language.

**Acceptance criteria:**

- [ ] Card renders insights
- [ ] Brand voice review passes
- [ ] At least 8 tests

### Spec 13.3 — Year-in-Review Story

- **ID:** `round3-phase13-spec03-year-in-review`
- **Size:** L
- **Risk:** Medium
- **Prerequisites:** 13.2
- **Goal:** Once per year (December), a special "Your year in prayer" story page summarizing the user's spiritual journey. Multi-screen scroll story, shareable.

**Acceptance criteria:**

- [ ] Story page renders
- [ ] Multi-screen scroll experience
- [ ] Shareable
- [ ] Brand voice review passes
- [ ] Anti-pressure for users with sparse activity (the story still feels meaningful)
- [ ] At least 12 tests

### Spec 13.4 — Intercession Patterns

- **ID:** `round3-phase13-spec04-intercession-patterns`
- **Size:** M
- **Risk:** Low
- **Prerequisites:** 13.3
- **Goal:** A small section showing the categories the user prays for most often. Quiet, reflective framing.

**Acceptance criteria:**

- [ ] Top 3 categories displayed
- [ ] Anti-pressure framing
- [ ] At least 8 tests

---

## Phase 14 — Onboarding & Empty States

> **Phase purpose:** The first-visit experience. Suggested first action. Find-your-people friend suggestions. Warm empty states throughout.

### Spec 14.1 — First-Visit Walkthrough

- **ID:** `round3-phase14-spec01-first-visit-walkthrough`
- **Size:** L
- **Risk:** Medium
- **Prerequisites:** Phase 13 complete
- **Goal:** A 3-step inline walkthrough on the user's first Prayer Wall visit: introduces rooms, the QOTD, the compose FAB. Skippable. Never re-shown.

**Acceptance criteria:**

- [ ] Walkthrough appears on first visit only
- [ ] Skippable
- [ ] Brand voice copy passes review
- [ ] At least 10 tests

### Spec 14.2 — Suggested First Action

- **ID:** `round3-phase14-spec02-suggested-first-action`
- **Size:** M
- **Risk:** Low
- **Prerequisites:** 14.1
- **Goal:** After the walkthrough, a single suggested first action: "Pray for someone today." Tappable, opens a curated post.

**Acceptance criteria:**

- [ ] Suggestion appears once
- [ ] Tap opens a curated post
- [ ] At least 6 tests

### Spec 14.3 — Find Your People Friend Suggestions

- **ID:** `round3-phase14-spec03-find-your-people`
- **Size:** L
- **Risk:** Medium
- **Prerequisites:** 14.2
- **Goal:** A "Find your people" section for users with zero friends. Suggests up to 5 users based on shared categories of interest.

**Acceptance criteria:**

- [ ] Suggestions based on category overlap
- [ ] One-tap friend request
- [ ] At least 12 tests

### Spec 14.4 — Warm Empty States

- **ID:** `round3-phase14-spec04-warm-empty-states`
- **Size:** M
- **Risk:** Low
- **Prerequisites:** 14.3
- **Goal:** Every empty state in Prayer Wall reviewed and rewritten in brand voice. No "No results" — instead, "It is quiet here today. That is fine."

**Acceptance criteria:**

- [ ] Every empty state reviewed
- [ ] All copy passes brand voice review
- [ ] At least 10 tests

---

## Phase 15 — Email & Push Notifications

> **Phase purpose:** Reach users when they are not in the app. Email digests for comment replies and weekly summaries. Push notification wiring (extends BB-41).

### Spec 15.1 — SMTP Setup

- **ID:** `round3-phase15-spec01-smtp-setup`
- **Size:** M
- **Risk:** Medium
- **Prerequisites:** Phase 14 complete
- **Goal:** Wire Spring Mail to an SMTP provider. Env-var-driven configuration. Test endpoint.

**Acceptance criteria:**

- [ ] SMTP send works in dev
- [ ] At least 6 tests

### Spec 15.1b — Welcome Email Sequence

- **ID:** `round3-phase15-spec01b-welcome-email-sequence`
- **Size:** M
- **Risk:** Medium (email content sent to users in potentially vulnerable states — tone matters; getting "welcome email" voice wrong is cringe at best, triggering at worst for users who signed up during a crisis moment)
- **Prerequisites:** 15.1 (SMTP Setup)
- **Goal:** Send a three-email sequence to new users across their first 7 days — day 0 welcome, day 3 gentle introduction to key features, day 7 quiet check-in. This is the single most effective lever available for 30-day retention, but only if the voice matches Worship Room's core posture: warm, unhurried, never hype. A welcome email that reads like a SaaS onboarding ("🎉 Welcome aboard! Here are 5 ways to get the most out of your account!") would actively damage the user's trust; we'd rather send no welcome email than that kind. This spec defines the exact copy, timing, and opt-out discipline for a sequence that feels like a letter from a thoughtful friend.

**Approach:** A scheduled job runs hourly, queries users whose `joined_at` crosses each sequence trigger (day 0 immediate, day 3 ±1 hour, day 7 ±1 hour in user's timezone), and sends the appropriate email via the SMTP layer from 15.1. Every email is sent as plain text AND HTML (multipart), unsubscribe link in both, one-click unsubscribe honored via a token-based endpoint (no login required to unsubscribe — that's cruel). Users can opt out of the sequence during registration OR at any point via a prominent unsubscribe link in every email OR via settings. The sequence is retention-motivated but NOT retention-desperate — no "we miss you!" language, no "don't lose your streak!" manipulation.

**The three emails:**

**Email 1 — Day 0, sent within 10 minutes of registration.**

- Subject: "Your Worship Room account is ready"
- Body: Brief, warm, non-hype. Confirms the account works, names one thing the user might want to do first (read the Prayer Wall), and signals that slow engagement is fine. Signed "— Eric" (the founder, by name).
- Single CTA button: "Open the Prayer Wall" → deep link to `/prayer-wall`
- Unsubscribe link at footer
- Target reading time: under 30 seconds

**Email 2 — Day 3 (72 hours after registration, ±1 hour).**

- Subject: "A few things about Worship Room that might help"
- Body: Introduces three features gently — (1) anonymous posting exists for when attribution feels wrong, (2) moderators are real people who read reports carefully, (3) crisis resources are always one tap away. NOT a feature tour; a values statement that happens to mention features.
- NO CTA to "post your first prayer!" — that's pressure. Instead: "If you haven't posted anything yet, that's completely fine. Some people spend weeks reading before writing."
- Unsubscribe link

**Email 3 — Day 7 (168 hours after registration, ±1 hour).**

- Subject: "How are you?"
- Body: Very short. Three sentences max. Not "we hope you're enjoying Worship Room" (transactional). Actually: "If you've been praying with us, thank you. If you've been reading, that counts too. If life has pulled you elsewhere, that's allowed."
- No CTA. No feature mention. Just presence.
- Unsubscribe link

**Anti-pressure discipline (load-bearing):**

- NO emoji in subject lines or body
- NO exclamation points anywhere in the sequence
- NO "don't miss out", "last chance", "limited time" framing
- NO gamification references ("you've earned your first badge!")
- NO comparison metrics ("you're in the top 20% of users")
- NO automated "your streak is in danger" emails (this sequence is strictly the 3-email welcome; streak notifications are separate and also follow anti-pressure rules)
- NO growth-loop CTAs ("invite your friends!")
- NO testimonial carousel ("Sarah said Worship Room helped her through...")
- NO feature-of-the-week promotions
- Sequence pauses automatically if the user has triggered a crisis-flag on their own post in the last 72h (per Phase 10.5 crisis classifier integration); a user in acute distress should NOT receive a day-3 marketing-adjacent email. Email resumes 72h after the crisis flag clears.
- Sequence pauses if the user has requested account deletion (per Spec 10.11)
- Sequence NEVER resumes for users who unsubscribed, even if they re-engage

**Opt-in / opt-out:**

- Default: opted IN at registration
- Registration form shows a single checkbox: "It's OK to send me an occasional welcome email over my first week." Default CHECKED. Below that: "You can unsubscribe anytime."
- Unsubscribe link in every email footer
- Unsubscribe endpoint: `POST /api/v1/email/unsubscribe?token={unsubscribe_token}&list=welcome_sequence` — token-signed, no login required
- Settings page exposes a "Email preferences" section with a toggle for each email category (Welcome sequence, Comment-reply digest, Weekly summary, Push notification emails)
- Unsubscribe honored within 5 minutes (scheduled job respects the flag on its next hourly run)

**Email infrastructure specifics:**

- Uses SMTP layer from Spec 15.1
- From: `eric@worshiproom.com` (or equivalent — the FROM name matters; "Eric from Worship Room" feels like a person, "Worship Room" feels like a brand)
- Reply-To: same (real human email; users sometimes reply with thanks or questions, and that's valuable signal for Eric)
- List-Unsubscribe header: mandatory per RFC 8058 / Gmail bulk-sender rules
- List-Unsubscribe-Post: One-click unsubscribe header
- DKIM + SPF + DMARC configured (deliverability requirement; may need a dedicated subdomain setup — document in runbook)
- Bounce handling: hard bounces set `email_bounce=true` on users; sequence paused for bounced users
- Sent-log table: records every email sent per user for debugging and to prevent double-sends on scheduler restart

**Localization / timezone:**

- Subject and body in English for MVP (no localization)
- Day-3 and Day-7 triggers respect user's timezone (per Spec 1.3b) — target 10am-11am user-local time window; if the hourly scheduler tick doesn't land in the window, defer to the next day rather than sending at an odd hour
- Day-0 email sends immediately regardless of timezone (account-creation confirmation is expected immediately)

**Template structure:**

- Templates live in `backend/src/main/resources/email-templates/welcome/`
- One `.txt` and one `.html` per email (so 6 files total)
- Template variables: `{{firstName}}`, `{{unsubscribeUrl}}`, `{{prayerWallUrl}}`, `{{settingsUrl}}`
- Rendered via Thymeleaf (already in Spring Boot ecosystem)
- HTML template is deliberately simple — single-column, system font stack, no images except optional small wordmark, max-width 600px, good in dark-mode email clients

**Files to create:**

- `backend/src/main/java/com/worshiproom/email/welcome/WelcomeSequenceScheduledJob.java`
- `backend/src/main/java/com/worshiproom/email/welcome/WelcomeSequenceService.java`
- `backend/src/main/java/com/worshiproom/email/UnsubscribeController.java`
- `backend/src/main/java/com/worshiproom/email/UnsubscribeService.java`
- `backend/src/main/java/com/worshiproom/email/EmailSentLog.java` (JPA entity)
- `backend/src/main/resources/email-templates/welcome/day0.txt`
- `backend/src/main/resources/email-templates/welcome/day0.html`
- `backend/src/main/resources/email-templates/welcome/day3.txt`
- `backend/src/main/resources/email-templates/welcome/day3.html`
- `backend/src/main/resources/email-templates/welcome/day7.txt`
- `backend/src/main/resources/email-templates/welcome/day7.html`
- `backend/src/main/resources/db/changelog/2026-04-22-005-create-email-sent-log-and-preferences.xml`
- `backend/src/test/java/com/worshiproom/email/welcome/WelcomeSequenceIntegrationTest.java`
- `backend/src/test/java/com/worshiproom/email/UnsubscribeIntegrationTest.java`
- `frontend/src/components/settings/EmailPreferences.tsx`
- `__tests__/EmailPreferences.test.tsx`

**Files to modify:**

- `backend/src/main/java/com/worshiproom/auth/AuthService.java` — capture opt-in checkbox on registration
- `frontend/src/components/prayer-wall/AuthModal.tsx` — add opt-in checkbox (default checked)
- `frontend/src/pages/Settings.tsx` — mount EmailPreferences component
- Users table — add `welcome_sequence_opted_in BOOLEAN DEFAULT TRUE`, `email_bounce BOOLEAN DEFAULT FALSE` columns via Liquibase

**Database changes:**

- Alter `users`: add `welcome_sequence_opted_in`, `email_bounce` columns
- Create `email_sent_log`: `(id UUID PK, user_id UUID FK, email_category VARCHAR(50), template_key VARCHAR(50), sent_at TIMESTAMP, smtp_message_id VARCHAR(255))`
- Create `email_preferences`: `(user_id UUID PK FK, welcome_sequence BOOLEAN DEFAULT TRUE, comment_digest BOOLEAN DEFAULT TRUE, weekly_summary BOOLEAN DEFAULT TRUE, push_notification_email BOOLEAN DEFAULT TRUE, updated_at TIMESTAMP)`
- Liquibase changeset: `2026-04-22-005-create-email-sent-log-and-preferences.xml`
- Index on `email_sent_log(user_id, email_category, sent_at DESC)` for dedupe and debugging

**API changes:**

- `POST /api/v1/email/unsubscribe?token={token}&list={list_key}` — public endpoint (no auth); token-signed; single-click unsubscribe; returns a simple confirmation HTML page
- `GET /api/v1/users/me/email-preferences` — returns current opt-in state for all email categories
- `PATCH /api/v1/users/me/email-preferences` — update preferences
- OpenAPI spec updated

**Copy Deck:**

_Day 0 email (plain text):_

"Hi {{firstName}},

Your Worship Room account is ready.

Most people start by reading the Prayer Wall — a feed of prayer requests, testimonies, and discussions from other members. You don't have to post anything yet. Reading counts.

{{prayerWallUrl}}

If you ever want to change how Worship Room contacts you, your settings are here: {{settingsUrl}}

— Eric
Founder, Worship Room

Unsubscribe from welcome emails: {{unsubscribeUrl}}"

_Day 3 email (plain text):_

"Hi {{firstName}},

Checking in — a few things about Worship Room that might help as you settle in.

First: anonymous posting is always available. When something feels too raw to share under your name, the anonymous option is there. Your identity stays hidden from everyone including the moderators.

Second: our moderators are real people who read every report carefully. If you see something that doesn't belong — harassment, spam, or content that feels unsafe — use the report button and we'll take it seriously.

Third: crisis resources are always one tap away, on every page. If you or someone you're praying for is in acute distress, 988 (Suicide & Crisis Lifeline) and Crisis Text Line (text HOME to 741741) are the fastest paths to immediate help.

If you haven't posted anything yet, that's completely fine. Some people spend weeks reading before writing. There's no right pace.

— Eric

Unsubscribe: {{unsubscribeUrl}}"

_Day 7 email (plain text):_

"Hi {{firstName}},

A short note.

If you've been praying with us, thank you. If you've been reading, that counts too. If life has pulled you elsewhere, that's allowed.

— Eric

Unsubscribe: {{unsubscribeUrl}}"

_HTML versions:_ structurally identical, wrapped in simple single-column 600px-max layout with system font stack, 1.6 line-height, muted footer for unsubscribe.

_Registration checkbox copy:_

- Label: "It's OK to send me an occasional welcome email over my first week."
- Helper: "You can unsubscribe anytime."

_Settings section header:_ "Email preferences"

_Settings toggle labels:_

- "Welcome emails (first week)"
- "Comment reply digest"
- "Weekly summary"
- "Notification emails"

_Settings description (per toggle):_ short factual sentences, e.g. "A daily summary of replies to your comments" — no hype, no feature-selling.

_Unsubscribe confirmation page:_ "You've been unsubscribed from {{list_name}}. You can update your email preferences anytime in Settings."

**Anti-Pressure Copy Checklist:** (a) no comparison ✓ (b) no urgency ✓ (c) no exclamation points near vulnerability ✓ (d) no therapy-app jargon ✓ (e) no streak-as-shame ✓ (f) no false scarcity ✓

**Anti-Pressure Design Decisions:**

- Three emails total, no more
- No emoji anywhere in the sequence
- No exclamation points in copy
- No "don't miss out" or "complete your profile" CTAs
- Day-3 copy explicitly validates not posting ("some people spend weeks reading before writing")
- Day-7 copy explicitly validates being away ("if life has pulled you elsewhere, that's allowed")
- Sequence pauses for users with active crisis flags
- Sequence pauses for users in account-deletion grace period
- One-click unsubscribe (no login required)
- Unsubscribed users never get re-added to the sequence
- From address is a real human ("Eric") not a brand
- No image tracking pixels
- No feature-of-the-week drip campaign
- No referral/invite CTAs

**Acceptance criteria:**

- [ ] Registration form shows welcome-email opt-in checkbox, default checked
- [ ] Unchecking the checkbox at registration sets `welcome_sequence_opted_in=false`
- [ ] Day 0 email sends within 10 minutes of registration
- [ ] Day 0 email has both plain-text and HTML parts (multipart/alternative)
- [ ] Day 3 email sends 72h ±1h after registration in the user's local 10-11am window
- [ ] Day 7 email sends 168h ±1h in the user's local 10-11am window
- [ ] User in crisis-flagged state in last 72h does NOT receive Day 3 or Day 7 emails
- [ ] User in account-deletion grace period does NOT receive any sequence emails
- [ ] Unsubscribed user does NOT receive subsequent emails in the sequence
- [ ] Unsubscribe endpoint works without authentication (token-signed)
- [ ] Unsubscribe takes effect within 5 minutes (next scheduler tick)
- [ ] One-click unsubscribe via List-Unsubscribe header supported
- [ ] DKIM + SPF + DMARC all pass on sent emails (verified via Mail-Tester or equivalent)
- [ ] Bounced emails mark user `email_bounce=true` and pause the sequence
- [ ] `email_sent_log` records every sent email, preventing double-sends on scheduler restart
- [ ] Settings page "Email preferences" section renders all 4 toggles with correct current state
- [ ] Toggling a preference off immediately persists and is respected on next scheduler tick
- [ ] All email copy strings pass the Anti-Pressure Copy Checklist
- [ ] No emoji or exclamation points in any email subject or body
- [ ] FROM displays as "Eric from Worship Room <eric@worshiproom.com>" (or configured equivalent)
- [ ] Day 3 email explicitly includes the "reading counts" validation
- [ ] Day 7 email is ≤3 sentences in the body
- [ ] Unsubscribe confirmation page renders cleanly without authentication
- [ ] HTML email renders correctly in Gmail (web + mobile), Apple Mail, Outlook web
- [ ] Dark-mode email clients render the HTML email without color contrast failures
- [ ] No tracking pixels in HTML emails
- [ ] Sequence does NOT resume if a previously-unsubscribed user re-engages (unsubscribe is permanent unless explicitly re-enabled in settings)
- [ ] Integration tests cover: crisis suppression, deletion suppression, unsubscribe suppression, bounce handling, timezone windows, re-subscription
- [ ] At least 20 tests across scheduling, templates, unsubscribe flow, preference persistence, suppression logic

**Testing notes:**

- Integration test with fake clock: advance time to 72h after registration, verify Day 3 email fires at the correct user-local 10-11am window
- Integration test: user in timezone America/Los_Angeles registered at 11pm UTC → Day 3 email should fire at next user-local 10am (NOT at 72h UTC sharp)
- Integration test: crisis-flag the user's post, advance time to Day 3 trigger, assert no email fires
- Integration test: user unsubscribes after Day 0, advance to Day 3 trigger, assert no email fires
- Integration test: bounce Day 0 delivery (simulated SMTP 550), verify Day 3/7 skipped
- Unit test: template rendering with all expected variables present
- Unit test: unsubscribe token signing and verification
- Playwright: register a user with opt-in unchecked, verify no welcome email is logged in sent_log
- Mail-Tester (or equivalent) check for DKIM/SPF/DMARC configuration
- Manual QA: send all 3 emails to real Gmail, Apple Mail, Outlook Web accounts and visually verify rendering

**Notes for plan phase recon:**

1. Confirm SMTP provider choice from 15.1 supports List-Unsubscribe and List-Unsubscribe-Post headers (Postmark, SendGrid, Resend all do)
2. Decide FROM email address structure. Recommendation: `eric@worshiproom.com` (personal, not `noreply@`). The Reply-To being a real inbox matters.
3. Verify DKIM/SPF/DMARC setup requirements for the chosen SMTP provider and DNS host; document in runbook
4. Confirm user timezone from Spec 1.3b is populated by the time Day 3 trigger would fire (should be — set at registration)
5. Budget for email sending volume: 3 emails per new user × expected signups. At 1000 users/month signing up, that's 3000 emails/month — well within free tier of most providers.
6. Consider adding a "hide from sequence if user has posted in first 24h" rule? Recommendation: NO — a new user who posts immediately is EXACTLY who benefits from the Day 3 values statement and Day 7 check-in.

**Out of scope:**

- Longer drip sequence beyond Day 7 (deliberately capped; anything longer becomes marketing)
- Segmented welcome sequences by post category interest
- A/B testing email copy (MVP is one version, well-written)
- Email localization into other languages
- SMS welcome sequence
- In-app welcome walkthrough (that's Phase 14.1 First-Visit Walkthrough — separate feature)
- Referral "invite a friend" CTAs in welcome emails
- Marketing campaign emails (newsletters, product updates) — out of scope entirely for this wave
- Re-engagement emails to inactive users ("we miss you!") — explicitly anti-pattern

**Out-of-band notes for Eric:** The Day 7 email is the most important one in the sequence and the hardest to get right. Resist every instinct to add a CTA, a feature mention, or a "here's what's new" section. The Day 7 email is LITERALLY three sentences. Its power is in its smallness. When a user on Day 7 opens an inbox full of demanding emails and sees yours — short, signed by a human, making no ask — that's the moment they remember Worship Room feels different. Also: sending from your real email address (`eric@...`) means you'll occasionally get real replies. Read them. Those replies are the single highest-signal data source about whether the voice is working. A user writing back "thanks, this meant a lot" is validation; a user writing back "please stop, this is triggering" is a signal to revise. Finally: the welcome sequence is the ONLY email sequence for Worship Room that should ever exist without an explicit user request. No "here's this month's featured prayers," no "we noticed you haven't been back." The moment we add a second automated sequence is the moment we become a SaaS.

---

### Spec 15.2 — Comment Reply Digest Email

- **ID:** `round3-phase15-spec02-comment-reply-digest`
- **Size:** L
- **Risk:** Medium
- **Prerequisites:** 15.1
- **Goal:** Once per day, send users a digest email of comment replies they received. Plain text and HTML versions. Unsubscribe link.

**Acceptance criteria:**

- [ ] Digest job runs daily
- [ ] Plain text and HTML versions
- [ ] Unsubscribe link works
- [ ] Brand voice review passes
- [ ] At least 14 tests

### Spec 15.3 — Weekly Summary Email

- **ID:** `round3-phase15-spec03-weekly-summary`
- **Size:** M
- **Risk:** Low
- **Prerequisites:** 15.2
- **Goal:** Sunday evening summary email of the user's week.

**Acceptance criteria:**

- [ ] Email sends Sunday evening
- [ ] Brand voice passes
- [ ] At least 10 tests

### Spec 15.4 — Push Notification Wiring

- **ID:** `round3-phase15-spec04-push-notifications`
- **Size:** L
- **Risk:** Medium
- **Prerequisites:** 15.3
- **Goal:** Extend the existing BB-41 push notification stub with real Web Push API wiring for browsers that support it. Server sends pushes for high-priority notification types (mention received, prayer answered witness).

**Acceptance criteria:**

- [ ] VAPID keys configured
- [ ] Push subscription endpoint works
- [ ] Server sends pushes
- [ ] At least 14 tests

---

## Phase 16 — PWA, Offline, Performance & Accessibility

> **Phase purpose:** Make Prayer Wall work offline (cached recent feed, queued posts), hit Lighthouse 90+/95+ targets, pass a BB-35-style accessibility audit.

### Spec 16.1 — Offline Cache for Recent Feed

- **ID:** `round3-phase16-spec01-offline-cache`
- **Size:** L
- **Risk:** Medium
- **Prerequisites:** Phase 15 complete
- **Goal:** Service worker caches the most recent feed page so users with flaky connectivity see content immediately.

**Acceptance criteria:**

- [ ] Service worker caches feed responses
- [ ] Stale-while-revalidate strategy
- [ ] Cache invalidation on logout
- [ ] At least 14 tests

### Spec 16.2 — Queued Posts (Offline-First Composer)

- **ID:** `round3-phase16-spec02-queued-posts`
- **Size:** L
- **Risk:** High
- **Prerequisites:** 16.1
- **Goal:** Composing a post while offline queues the post in localStorage and posts it when connectivity returns.

**Acceptance criteria:**

- [ ] Offline post queues
- [ ] Online connectivity triggers retry
- [ ] User sees clear "queued" indicator
- [ ] Failed posts after 3 retries surface as toasts
- [ ] At least 18 tests

### Spec 16.3 — Lighthouse Performance Audit

- **ID:** `round3-phase16-spec03-lighthouse-perf`
- **Size:** M
- **Risk:** Low
- **Prerequisites:** 16.2
- **Goal:** Audit and optimize Prayer Wall pages to hit Lighthouse Performance 90+, Accessibility 95+, Best Practices 90+, SEO 90+.

**Acceptance criteria:**

- [ ] All 4 Prayer Wall pages hit the targets on mobile and desktop
- [ ] Bundle size regression check passes (no more than 50 KB increase from Phase 0)
- [ ] At least 6 tests

### Spec 16.3b — Feature Flag Cleanup Pass

- **ID:** `round3-phase16-spec03b-feature-flag-cleanup-pass`
- **Size:** S
- **Risk:** Low (code simplification, not behavior change — every flag being removed is already at its "on" state by the time this runs)
- **Prerequisites:** 16.3 (all prior phases' cutovers must be in stable production state for ≥30 days before their flags can be retired)
- **Goal:** Audit every feature flag introduced during the Forums Wave, classify each as "retire" or "keep," remove the retired flags' code branches, and document the survivors in a runbook. Decision 9 introduced the feature-flag pattern as a migration-safety lever; without explicit cleanup, dead flags accumulate and become cargo-cult conditionals that confuse future work ("why is this branch behind a flag that's been true for 8 months?"). This spec is the discipline that prevents that accumulation. Run once near the end of the wave when every phase cutover has proven stable.

**Approach:** Produce an audit table listing every flag introduced during the wave (`VITE_USE_BACKEND_*`, `RATE_LIMIT_BACKEND`, feature-specific toggles, etc.). For each flag: classify as RETIRE (flag has served its migration purpose; remove flag check and the dead branch) or KEEP (flag is a legitimate kill switch or ongoing-use toggle). Remove retired flags by deleting the conditional and promoting the "on" branch inline; run the full test suite after each removal to confirm no regressions. Document the kept flags in `backend/docs/runbook-feature-flags.md` with: flag name, purpose, who can toggle, current default, rollback procedure.

**Known flags introduced during the wave (seed audit list — spec execution will verify and extend):**

- `VITE_USE_BACKEND_AUTH` (Phase 1 cutover) — RETIRE after 30 days of stable JWT auth
- `VITE_USE_BACKEND_ACTIVITY` (Phase 2 cutover) — RETIRE after 30 days; dual-write continues but the flag's read-side branching is dead after Phase 3 promotes backend reads
- `VITE_USE_BACKEND_FRIENDS` (Phase 2.5 cutover) — RETIRE after 30 days
- `VITE_USE_BACKEND_PRAYER_WALL` (Phase 3 cutover) — RETIRE after 30 days
- `RATE_LIMIT_BACKEND` (Spec 5.6) — KEEP as `'redis' | 'in-memory'` toggle; legitimate ongoing choice for dev-vs-prod, documented in runbook
- `SENTRY_DSN` (Spec 1.10d) — KEEP (env-var-based, not a toggle flag per se; setting empty disables Sentry)
- Night Mode opt-in (Spec 6.3 settings toggle) — NOT a feature flag; KEEP (user preference)
- 3am Watch opt-in (Spec 6.4 settings toggle) — NOT a feature flag; KEEP (user preference)
- Verse-Finds-You opt-in (Spec 6.8 settings toggle) — NOT a feature flag; KEEP (user preference)
- Welcome email opt-in (Spec 15.1b settings toggle) — NOT a feature flag; KEEP (user preference)

The distinction between **feature flag** (migration-phase conditional, intended to be temporary) and **user preference toggle** (ongoing user choice, intended to persist) is the load-bearing taxonomic line. User preferences NEVER retire; feature flags SHOULD retire once their phase is stable.

**Cleanup procedure (per retired flag):**

1. Grep the codebase for the flag name; enumerate every call site
2. Confirm the flag's current default is the "target" state (e.g., `VITE_USE_BACKEND_AUTH=true` in prod)
3. Open a branch named `retire-flag-{flag-name}`
4. At each call site: remove the conditional, keep only the "on" branch inline
5. Remove the flag declaration from `.env.example`, `application.properties`, any config classes
6. Run full test suite; commit only if green
7. Merge to main; deploy; monitor for 48h before retiring the next flag
8. Update `backend/docs/runbook-feature-flags.md` to mark the flag as "retired on {date}" in a historical-ledger subsection

**Files to create:**

- `backend/docs/runbook-feature-flags.md` (surviving flags + retired-flags ledger)
- `_cutover-evidence/phase16-feature-flag-audit.md` (audit artifact: one line per flag with classification, rationale, cleanup PR link)

**Files to modify (illustrative — actual set determined by audit):**

- `frontend/src/services/index.ts` and every `services/api/*` file behind a `VITE_USE_BACKEND_*` flag
- Every component or hook that checks a retired flag
- `.env.example` — remove retired flag entries
- `backend/src/main/resources/application.properties` — remove retired flag entries

**Database changes:** None

**API changes:** None

**Copy Deck:** None (no user-facing copy changes)

**Acceptance criteria:**

- [ ] Audit table `_cutover-evidence/phase16-feature-flag-audit.md` exists and lists every flag introduced during the wave with columns: flag name, phase introduced, classification (RETIRE/KEEP), cleanup PR reference or runbook section reference
- [ ] `backend/docs/runbook-feature-flags.md` documents every KEPT flag with: purpose, default value, toggle procedure, rollback procedure
- [ ] Retired flags are removed from `.env.example`
- [ ] Retired flags are removed from Spring `application*.properties` files
- [ ] Retired flag conditionals are removed from code (no `if (import.meta.env.VITE_USE_BACKEND_*)` branches remain for retired flags)
- [ ] Every retired flag's dead branch is also removed (not just the conditional — the code path that was the "off" branch is deleted entirely)
- [ ] Full test suite passes after each flag retirement (documented in audit PR descriptions)
- [ ] Runbook includes a "Retired flags" ledger subsection listing each retired flag with its retirement date for future archaeology
- [ ] No flag retired fewer than 30 days after its phase cutover (verified against cutover dates in Change Log)
- [ ] User-preference toggles (Night Mode, 3am Watch, Verse-Finds-You, Welcome email opt-in, etc.) are EXPLICITLY listed in the audit as "user preference — not retired" to prevent future confusion
- [ ] At least 8 tests — per-retired-flag smoke tests confirming the "on" path still works after conditional removal

**Testing notes:**

- Each flag retirement is its own PR with its own test-suite run
- Smoke test per retired flag: run the feature end-to-end in the "promoted" code path to confirm no behavioral regression
- Full E2E test run before final merge of the cleanup phase

**Notes for plan phase recon:**

1. Produce the audit table first, review with Eric, THEN execute retirements. Don't batch-retire without review.
2. Confirm the 30-day stability window per phase by checking deploy dates and incident/rollback history
3. Some flags may warrant a KEEP classification that wasn't obvious at introduction time — use this audit as an opportunity to reclassify
4. Watch for flags referenced in test fixtures; retiring a flag in production code but leaving it in tests is a common miss

**Out of scope:**

- Removing user-preference toggles (those are product features, not flags)
- Renaming kept flags (out of scope; rename is a separate refactor)
- Introducing new flags during this spec (cleanup only — no new flags)
- Flag-management tooling (LaunchDarkly, Unleash, etc.) — out of scope; env-var flags are sufficient at current scale
- Auto-detection of dead flags via static analysis — manual audit for MVP

**Out-of-band notes for Eric:** The audit table is the load-bearing deliverable here, not the code removal. Even if you never got around to the actual retirement PRs, having a written record of which flags exist and why is 80% of the value — because the alternative is 2 years from now asking "what does `VITE_USE_BACKEND_ACTIVITY` do and can I delete it?" and nobody remembering. Write the audit table thoroughly and the cleanup itself becomes mechanical. Also: the 30-day stability window per flag is a floor, not a ceiling — if a phase has been stable for 6 months, don't treat it as "too soon." Retire aggressively; dead code is the enemy of future velocity.

---

### Spec 16.4 — Accessibility Audit (BB-35 Style)

- **ID:** `round3-phase16-spec04-accessibility-audit`
- **Size:** L
- **Risk:** Medium
- **Prerequisites:** 16.3
- **Goal:** Comprehensive accessibility audit using axe-core, screen reader spot-checks (VoiceOver on macOS, TalkBack on Android), keyboard navigation walkthroughs.

**Acceptance criteria:**

- [ ] Zero axe-core violations on Prayer Wall pages
- [ ] Screen reader walkthrough completes successfully
- [ ] Full keyboard navigation works on every interactive element
- [ ] At least 18 tests
- [ ] Final cutover checklist for the entire Forums Wave

---

## Dependency Graph

The Forums Wave is mostly linear with three parallelizable side paths. The critical path is:

```
Phase 0 → Phase 1 → Phase 2 → Phase 2.5 → Phase 3 → Phase 4 → Phase 5 → Phase 6 → Phase 7 → Phase 8 → Phase 9 → Phase 10 → Phase 11 → Phase 12 → Phase 13 → Phase 14 → Phase 15 → Phase 16
```

Side paths that can run in parallel:

- **Phase 0.5** (reaction quick win) is independent after Phase 0 is read. Can ship in parallel with Phase 1 work.
- **Phase 5** (visual migration) is mostly independent of Phase 4 (post type expansion). Can run in parallel.
- **Phase 9** (ritual & time awareness) is mostly independent and can land in parallel with Phase 7 or Phase 8.
- **Phase 13** (personal analytics) is independent of Phase 12 and can run in parallel.

## Critical Path

The shortest path from "v1 of this Master Plan published" to "Forums Wave fully shipped" passes through:

1. Phase 0 (1 doc, ~2 hours of reading)
2. Phase 1 (~4-6 weeks for a solo dev)
3. Phase 2 (~3-4 weeks)
4. Phase 2.5 (~1-2 weeks)
5. Phase 3 (~4-6 weeks — the biggest single phase)
6. Phase 4 (~3-4 weeks)
7. Phase 5 (~1-2 weeks, partly parallel with Phase 4)
8. Phase 6 (~3-4 weeks)
9. Phase 7 (~2-3 weeks)
10. Phase 8 (~3-4 weeks)
11. Phase 9 (~1-2 weeks)
12. Phase 10 (~3-4 weeks)
13. Phase 11 (~1-2 weeks)
14. Phase 12 (~2-3 weeks)
15. Phase 13 (~1-2 weeks)
16. Phase 14 (~1-2 weeks)
17. Phase 15 (~2-3 weeks)
18. Phase 16 (~2-3 weeks)

**Total estimate:** approximately 6-9 months of solo dev work at the pace established during the Bible wave (52 specs in a week), assuming Eric's existing skill pipeline holds and most specs land cleanly on the first execution attempt. Real-world friction (debugging, recon failures, design changes mid-flight) typically adds 30-50% — call it 8-13 months with realistic buffer.

The Phase 0.5 quick win ships in week 1 alongside Phase 1 reading, which gives an early user-visible improvement while the bigger phases are in flight.

## Open Questions Log

These are decisions that have been made but should be revisited if circumstances change. None are blockers; all have a default that the wave will proceed with.

1. **Deployment target** — Decision deferred to Spec 1.10b. Default if Eric does not explicitly pick: Railway for backend + Railway PostgreSQL for database. Revisit when Phase 1 cutover is approaching.

2. **Scripture translation for hero feature copy** — The wave assumes WEB (World English Bible) per existing convention. If Eric ever wants to switch translations, the Verse-Finds-You and Prayer Receipt scripture sets need to be regenerated. No regeneration cost — just a config change and re-seed.

3. **Friends pin to top — exact ranking** — Phase 7.6 pins up to 3 friend posts at the top. The ranking within those 3 is "most recent first." Open question: should it be "most recent unprayed first"? Default: most recent. Revisit after a week of usage.

4. **Trust level promotion thresholds** — Phase 10.4 sets promotion thresholds (post count, days active, intercession count). Default values are conservative copies of Discourse's defaults. Revisit if community growth makes these feel too slow or too fast.

5. **Email sending volume cost** — Phase 15 introduces SMTP. If user count grows fast, the SMTP provider bill could become non-trivial. Default: Postmark or similar at the lowest tier. Revisit if the bill exceeds $20/month.

6. **Push notification opt-in flow** — Phase 15.4 adds web push. Open question: should opt-in be passive (user discovers it in settings) or active (modal prompt after first visit)? Default: passive. Revisit if push opt-in rate is below 5%.

7. **Search relevance tuning** — Phase 11.2 uses default PostgreSQL full-text search ranking. If results feel poor, tuning the `ts_rank` weights is the first lever. Revisit after the search ships.

8. **Anonymous post abuse ceiling** — Anonymous posts are a vulnerability vector. Phase 10's moderation pipeline catches obvious abuse but a determined bad actor could hide behind anonymity. Open question: should anonymous posts have a stricter rate limit? Default: same rate limit as attributed posts. Revisit if anonymous abuse becomes a real pattern.

9. **`/my-prayers` migration** — Decision 14 (Save vs Bookmark distinction) defers `/my-prayers` migration to a future wave. Open question: when does that happen? Default: not in the Forums Wave at all. Revisit at the end of the wave when scoping the next wave.

10. **Profile photo upload** — Avatars are currently URL-only (mock data uses pravatar). Real photo upload requires storage infrastructure (S3 or equivalent). Phase 8 does NOT introduce photo upload. Default: stay URL-only with initials fallback for users without a URL. Revisit when storage infrastructure is justified by other features.

## Change Log

- **2026-04-23 — v2.9** — Phase 1 Execution Reality Addendum. New section inserted after "How to Use This Document" consolidating 10 divergences surfaced during execution of Specs 1.1–1.8 and authoring of Spec 1.9b's brief: (1) Testcontainers two-base-class pattern (`AbstractIntegrationTest` + `AbstractDataJpaTest` sharing a singleton container via a `TestContainers` utility class, post-Spec-1.7 canonical — `@DataJpaTest` and `@SpringBootTest` are mutually exclusive so slice tests need a sibling base); test suite runtime baseline anchored at ~97s, not the ≤40s target the spec body originally claimed (container startup reduction only saves ~5s of ~90s; remaining runtime is dominated by Spring context boot across ~19 distinct contexts; Surefire parallelism is the only path to <40s and is explicitly Phase-1-out-of-scope). (2) `application-test.properties` does NOT exist in the repo — tests inherit the dev profile by default; the canonical test-profile override is `@DynamicPropertySource` in both base classes pinning `spring.liquibase.contexts=test`, post-Spec-1.8 canonical; without this, dev-seed users leak into every test run and break `deleteAll()` assumptions. (3) Liquibase timestamp gotcha: use `valueComputed="TIMESTAMP WITH TIME ZONE '...'"` NOT `valueDate` with a `Z` suffix — Liquibase's `ISODateFormat` does not parse `Z`, and dropping `Z` makes stored UTC depend on developer JVM timezone (observed +6h drift). (4) BCrypt hash generation pattern for seed data: throwaway test method, CDATA-wrapped real hash in changeset, generator deleted in next planning step — never ship placeholder hashes; distinct from the `DUMMY_HASH` timing-equalization constant in `AuthService`. (5) AuthModal timezone capture re-homed from Spec 1.5 (which shipped backend-only) to Spec 1.9 (first spec that actually touches AuthModal) — Spec 1.9's plan MUST include `Intl.DateTimeFormat().resolvedOptions().timeZone` on the register POST body; Spec 1.6 added the `PATCH /api/v1/users/me` timezone-update endpoint that Settings will eventually consume. (6) Spec 1.9b scope corrected from greenfield to audit-first (Round 2 polish already shipped 13 skeletons + Toast + WhisperToast + FeatureEmptyState + ChartFallback + 3 error boundaries), component location corrected from `components/common/` (which does not exist) to `components/ui/`, order reversed to 1.9b before 1.9 so 1.9 can consume 1.9b's documented patterns, AuthModal integration explicitly deferred to 1.9. (7) Effort terminology: `xhigh` refers to the Opus 4.7 effort slider, NOT the Claude Max subscription tier — do not conflate. (8) CC execution discipline: CC never commits/pushes/checks out (Eric handles git manually), CC proactively flags argument mismatches (Spec 1.8's `/code-review` invocation with wrong spec argument was caught before wasting a review pass — desired behavior, don't suppress), stale `com.example.worshiproom.*` processes from pre-Spec-1.1 builds occasionally occupy port 8080. (9) Spec tracker discipline: Eric updates `spec-tracker.md` MANUALLY after each spec ships; CC does not edit the tracker; the tracker beats memory, beats this addendum, beats spec bodies for what's ✅ vs ⬜. (10) "Master Plan Divergence" section required in all future briefs — brief authors enumerate deviations (what the master plan says / what the brief says / why) near the top so CC's `/spec-forums` skill has authoritative reconciliation guidance baked in, preventing mid-recon reconciliation conversations like the one Spec 1.9b surfaced. **Ancillary rule-file updates:** `.claude/rules/05-database.md` gained a new "Liquibase Seed Data & Value Patterns" section documenting #3 and #4 canonically with copy-paste-ready snippets. `.claude/rules/06-testing.md` had already absorbed #1 during Spec 1.7 execution (no v2.9 change). `.claude/rules/03-backend-standards.md` was not modified (its Liquibase section covers naming and template structure only, which remain correct). **Tracker metadata:** `spec-tracker.md` header gained a v2.9 execution-reality pointer to this addendum. **What v2.9 does NOT change:** no spec count changes (still 156), no Quick Reference changes, no Appendix C changes, no Universal Rule changes, no Architectural Decision changes, no existing spec bodies modified. This pass is deliberately narrow — consolidates post-execution learnings into one easy-to-find section so a new conversation can load Phase 1 reality in ~5 minutes of reading. A broader **v3.0 reconciliation pass** will absorb Phase 1 drift into the spec bodies themselves after Spec 1.10 (Phase 1 cutover) ships; until then the v2.9 addendum is the authoritative layer over any stale spec text for Specs 1.1–1.9b. End marker bumped from v2.8 to v2.9.
- **2026-04-22 — v2.8** — Pre-execution completeness pass. Added **18 new specs** (138 → 156) closing real functional gaps surfaced during a deliberate line-by-line master plan audit before Forums Wave begins. Gaps fell into four categories — (a) **auth lifecycle incompleteness**: no password reset, no email verification, no change-password, no change-email, no account lockout/brute-force protection, no session invalidation; (b) **production hardening gaps**: no security headers middleware, no consolidated error code catalog, no env-var runbook, no liveness/readiness split (Actuator health is sufficient for uptime but not for Kubernetes-style orchestration), no connection-pool tuning spec, no Playwright E2E infrastructure spec (referenced by the pipeline but never authored); (c) **referenced-but-never-built features**: `block user` and `mute user` are referenced across the master plan (Intercessor Timeline cache invalidation, Privacy Tiers acceptance criteria, 3am Watch filter cascading) but no spec created the schema or endpoints; admin audit log viewer referenced as part of admin foundation but the UI spec was never written; (d) **polish that was implicitly expected but never scoped**: offline banner UI (Phase 16 has offline cache but no user-visible indicator), React error boundaries (no spec owning the global error boundary + Sentry integration + fallback UI strategy). **Phase-by-phase additions:** Phase 1 (17 → 30): six auth lifecycle specs 1.5b through 1.5g, six production hardening specs 1.10g through 1.10l, one community-legal spec 1.10m (moved from Appendix D in-wave because it is referenced by Spec 1.10f Terms of Service); Phase 2.5 (6 → 8): Spec 2.5.6 Block User and 2.5.7 Mute User; Phase 10 (12 → 13): Spec 10.10b Admin Audit Log Viewer; Phase 16 (5 → 7): Spec 16.1b Offline Banner UI and 16.2b React Error Boundary Strategy. **Metadata synced:** QR intro updated from "120 specs across 17 phases" to "156 specs across 19 phases"; heading "The Seventeen Phases" → "The Nineteen Phases"; QR table phase totals updated (Phase 1: 17→30, Phase 2.5: 6→8, Phase 10: 12→13, Phase 16: 5→7); **Total: 138 → 156 specs**; Appendix C regenerated with all 156 spec IDs in correct execution position; **new Appendix E** added containing full specification stubs for all 18 new specs (ID, Size, Risk, Prerequisites, Goal, Approach sketch, and Files-to-Create/Modify — expanded by `/spec-forums` during execution to full spec format); footer bumped from v2.6 end-marker to v2.8. **No existing specs modified; no Universal Rules modified; no Architectural Decisions modified.** This is purely additive — gaps that should have been specs are now specs. Tracker file also rewritten to 156 rows with correct cascading numbering across all 19 phases.
- **2026-04-22 — v2.7** — Post-Key-Protection-Wave reality-drift reconciliation. The AI Integration Wave (AI-1/AI-2/AI-3) and Key Protection Wave (Specs 1–4 of `ai-proxy-*`) both shipped between v2.6 (April 16) and today, adding ~60+ files under `com.example.worshiproom.proxy.{common,ai,maps,bible}` and ~280 green backend tests that v2.6 assumed didn't exist. **Decision 2 rewritten** to describe the current backend state (proxy layer fully shipped with filters / exception handlers / WebClient / dev-profile log suppressions / `/api/v1/health` provider reporting). **Spec 1.1 rewritten** — Size bumped from S to L, Risk from Low to Medium; file list expanded from ~5 files to ~60+ files across four proxy subpackages plus tests; approach rewritten with explicit guidance on filter ordering, log-suppression preservation, `@RestControllerAdvice` basePackages update, and the guardrail that `ApiController.java`'s `@RequestMapping("/api")` should NOT be changed to `"/api/v1"` (that endpoint already exists as a separate route from the Key Protection Wave). **Spec 1.4 extended** with a "Filter coexistence" note (JwtAuthenticationFilter must order after existing `RequestIdFilter` + `RateLimitFilter`, suggested `HIGHEST_PRECEDENCE + 100`) and a "Proxy endpoints and JWT" note (proxy routes stay anonymous-accessible in Phase 1; per-user rate-limit precedence deferred to a post-Phase-1 operational spec). Risk bumped from Medium to Medium-High. **Phase 1 definition of done extended** with five new bullets verifying proxy-layer survival post-rename (all ~280 tests green, three proxy endpoints still round-trip, log suppressions still work, filter ordering preserved). **Backend packages section in Quick Reference updated** to include the inherited `proxy.{common,ai,maps,bible}` packages alongside the new Forums Wave packages, with a note that v2.6's provisional names (`proxy.places`, `proxy.audio`) were superseded by `proxy.maps` and `proxy.bible` during execution. **Path correction:** OpenAPI spec location corrected from `backend/api/openapi.yaml` (v2.6) to `backend/src/main/resources/openapi.yaml` (actual shipped location). No spec count changes; no Appendix C changes; no Universal Rule changes. This is a Phase-1-targeted correction; Phases 2–16 are not affected by the drift.
- **2026-04-16 — v2.6** — Hygiene pass + Phase 2.5 completeness fix + Rule 17 retrofit correction. **Pre-execution audit uncovered six prereq-graph issues** (1 real architectural: Spec 1.10c depended on 1.10e but preceded it in the file, fixed by physically moving the 1.10c block to after 1.10e and updating Appendix C ordering; 1 spurious forward ref: Spec 4.6b incorrectly listed 6.7 as a prerequisite when the direction was reversed, rephrased to name the feature rather than the spec number; 4 runtime-gated misclassifications: Specs 6.4 and 6.8 listed 10.5 and 10.6 as hard prereqs when both features ship with documented graceful-degradation paths for when the crisis classifier is unavailable — reclassified as "Runtime-gated dependencies" with explicit notes preserving the shipping-before-10-is-safe story). **Four Liquibase changeset filename collisions fixed** (same-date-same-sequence prefixes that would have caused Liquibase checksum conflicts on deploy — renames: scripture-reference-to-posts 2026-04-18-001→002, three username changesets 2026-04-20-001/002/003→2026-04-21-001/002/003, keeping the Phase 8 username trio grouped on one date). **Phase 2.5 completeness fix** (audit surfaced that Decision 8 promises `social_interactions` and `milestone_events` shadow tables in Phase 2.5 but the existing specs only created `friend_relationships` and `friend_requests` — would have caused runtime "table does not exist" errors when Phase 12 notification generators and Phase 13 personal analytics queries ran against the missing tables): Spec 2.5.1 extended to create all four tables with full schemas and CHECK constraints; new Spec 2.5.4b added for the social/milestone dual-write pipeline with fire-and-forget pattern and new `VITE_USE_BACKEND_SOCIAL` env flag; Spec 2.5.5 cutover extended to flip both flags and smoke-test all three pipelines (friends, social interactions, milestone events) plus Universal Rule 17 accessibility smoke test AC. **Two Rule 17 cutover retrofits** (Spec 2.9 Phase 2 Cutover and Spec 2.5.5 Phase 2.5 Cutover were missed in the initial Batch 8 retrofit because they weren't in the retrofit list at the time; added now so all 8 cutovers have explicit Rule 17 ACs with phase-specific evidence paths). **Meta-observation:** the initial audit regex `\d+\.\d+[a-z]?` silently excluded Phase 2.5's 3-part IDs (2.5.1–2.5.5) from prereq and cross-ref checks; re-audited with `\d+\.\d+(?:\.\d+)?[a-z]?` and confirmed Phase 2.5's graph is clean. Metadata synced: QR table (Phase 2.5: 5→6), total spec count (137→138), Appendix C regenerated with Spec 2.5.4b inserted in execution position, Spec 1.10c moved in Appendix C ordering to reflect new post-1.10e execution sequence.
- **2026-04-16 — v2.5** — Batch 8 polish-tier artifacts. Three new additions addressing the two polish-tier gaps from the v2.0 assessment plus a catalog deliverable that was always implicit but never consolidated: **Universal Rule 17 — Per-phase accessibility smoke test** (new cross-cutting rule requiring axe-core CI scan + keyboard walkthrough + VoiceOver spot-check at every phase cutover, with committed evidence at `_cutover-evidence/{phase}-a11y-smoke.json` — prevents accessibility debt from compounding across 15 phases into a 50+ violation final audit; rule is 17 of 17 total Universal Rules). **Spec 16.3b — Feature Flag Cleanup Pass** (new cleanup spec in Phase 16 that audits every feature flag introduced during the wave, classifies each as RETIRE or KEEP with the feature-flag-vs-user-preference taxonomic line as load-bearing distinction, documents surviving flags in `backend/docs/runbook-feature-flags.md`, removes retired flag code branches with per-flag smoke-test PRs, produces permanent historical ledger of retired flags for future archaeology; 30-day stability floor per flag before retirement). **Appendix D — Deferred to Future Waves** (new consolidated catalog of ~90 explicit deferrals scattered through the wave, grouped by theme: Core features, Profile & identity, Infrastructure, Notifications & engagement, Community & moderation, Search & discovery, Analytics & insights, Legal & compliance, Internationalization & accessibility, Integration, Monetization & sustainability, Process & tooling — plus a final "Explicitly NOT ever shipping" anti-pattern register that catalogs the ~10 ideas explicitly forbidden by the wave's anti-pressure discipline so future-self doesn't accidentally re-open them). Metadata synced: Phase 16 QR count (4→5), total spec count (136→137), Appendix C regenerated to add Spec 16.3b. With this batch, all 9 gaps from the original v2.0 assessment are now addressed. The plan is complete and execution-ready.
- **2026-04-16 — v2.4** — Batch 6 content specs. Three new specs filling the three most important non-infrastructure gaps from the v2.0 assessment: **Spec 10.7b — Report a User** (user-level pattern-harassment reporting distinct from post-level reports, rate-limited to 3/week, zero-interaction-flag anti-weaponization gate, mass-reporter suspension after 6 closed-no-action reports in 30 days, flows through existing Phase 10.7 moderator queue with separate routing for reports about moderators/admins to Eric-only queue, never notifies the reported user until a moderator takes action — prevents retaliation and chilling effects), **Spec 15.1b — Welcome Email Sequence** (three emails across first 7 days: Day 0 account-ready confirmation signed by Eric personally, Day 3 values-statement-masquerading-as-feature-tour explicitly validating not-posting-yet, Day 7 three-sentence check-in with no CTA, plain-text + HTML, one-click List-Unsubscribe, suppresses for users with active crisis flags and users in account-deletion grace, never resumes for unsubscribed users even if they re-engage — retention lever without retention desperation), **Spec 1.10f — Terms of Service and Privacy Policy Surfaces** (two versioned markdown documents at `/terms` and `/privacy` with first-draft Eric-authored content describing actual app behavior, consent checkbox on registration that cannot be pre-checked with Submit disabled until checked, registration-time version capture in `users.terms_version` and `users.privacy_version`, update-consent modal with summary-of-changes at top and 30-day advance notice, interaction-lock for users who decline an update without silent account suspension, lawyer review scheduled before 500 users). Metadata synced: QR table (Phase 1: 16→17, Phase 10: 11→12, Phase 15: 4→5), total spec count (133→136), Appendix C regenerated with all 136 IDs. These three specs close gaps 4, 5, and 6 from the original v2.0 assessment. Combined with Batch 5's infrastructure foundations and Batch 7's hero spec depth pass, all major structural gaps are now addressed; remaining open items (per-phase accessibility smoke tests, feature flag cleanup catalog, deferred wave 2 catalog) are polish-tier and can be deferred to a post-execution cleanup batch.
- **2026-04-16 — v2.3** — Batch 7 hero spec depth pass. Five Phase 6 specs replaced with production-depth versions: **Spec 6.1 Prayer Receipt** (grew from 2,267 to 13,646 chars; added three display-variant privacy model, daily-rotating scripture accompaniment, shareable receipt with PII stripping, dismissible via settings, 24 acceptance criteria), **Spec 6.4 3am Watch** (1,563 → 17,772 chars; added explicit opt-in gate with confirmation modal, Trust Level 2 gate, deterministic feed re-sort across crisis/MH/friends/regular slices, mandatory crisis resources banner, classifier-down graceful degradation, 30+ acceptance criteria), **Spec 6.5 Intercessor Timeline** (1,794 → 17,857 chars; added three view modes — By day/By post/By person — with warm amber calendar heatmap, friend-only attribution in person view, block-cascading cache invalidation, optional Year of Prayer image, 28+ acceptance criteria), **Spec 6.6 Answered Wall** (1,289 → 18,629 chars; added deliberate Mental-Health-filter omission with rationale, two new reaction types 'praising' and 'celebrate', indefinitely-editable answered_text, un-mark-as-answered without shame, hero subhead "Gratitude, not comparison", 24+ acceptance criteria), **Spec 6.8 Verse-Finds-You** (1,787 → 22,101 chars; added 180-passage curated set with tags and excluded_contexts, four surfacing triggers with 24h cooldown, 48h crisis-flag suppression per Universal Rule 13, category-to-tag mapping deliberately excluding `hope` from Mental Health and Grief, no LLM in MVP — curated-set lookup only, graceful silent failure on pipeline errors, 35+ acceptance criteria). Total depth added: approximately 90 KB. No specs added or removed; no QR table or Appendix C changes. Every depth-replaced spec now includes full Anti-Pressure Design Decisions block, complete Copy Deck with Anti-Pressure Copy Checklist, detailed Files-to-Create and API Changes sections, Testing Notes with integration and security test specifics, and Out-of-Band Notes for Eric capturing the design intent that would otherwise be lost to future-context drift.
- **2026-04-16 — v2.2** — Batch 5 infrastructure foundation specs. Four new specs added to close the gap between architectural decisions and the first consumer that needs each piece of infrastructure: **Spec 1.10c — Database Backup Strategy** (platform-native snapshots plus weekly pg_dump to object storage, with quarterly restore drill discipline; depends on 1.10e for storage), **Spec 1.10d — Production Monitoring Foundation** (Sentry error tracking with PII scrubber, JSON structured logging with request-ID MDC, uptime monitoring on /api/v1/health with day-1 synthetic alert test), **Spec 1.10e — Object Storage Adapter Foundation** (single `ObjectStorageAdapter` interface with three implementations — S3/R2/B2 for prod, MinIO for tests, local filesystem for dev — with contract test enforcing identical semantics across implementations), **Spec 5.6 — Redis Cache Foundation** (Redis 7 service wiring, key namespace conventions, Spring `@Cacheable` configuration, rate limiter migration from in-memory to Redis-backed, cache circuit breaker for graceful degradation). Metadata synced: QR table (Phase 1: 13→16, Phase 5: 5→6), total spec count (129→133), Appendix C regenerated with all 133 IDs. One cross-reference fix: Spec 1.10c's reference to the earlier-draft identifier "3.12b" (leftover from an earlier draft) corrected to "Spec 1.10e"; prereq list updated to reflect the adapter dependency. These four specs collectively move Redis + S3 + monitoring + backups from "CC will improvise mid-hero-feature" to "deliberately designed once with contract tests."
- **2026-04-16 — v2.1** — Post-v2.0 recovery and four-batch amendment pass (all surgery done via direct-to-file Python after multi-segment file corruption was recovered from the personal-laptop copy). **Round 1** (12 path/correction patches). **Batch 1** (12 critical patches): `wr_streak_repairs` dual-write mirror, Decision 5 Light a Candle reaction schema and composite PK, Decision 8 FriendDto denormalization, Phase 2.5 `social_interactions` and `milestone_feed` dual-write, Phase 12 14-type notification catalog consolidation, Inheritance Acknowledgments section, Decision 17, Universal Rule 13 crisis detection supersession, Universal Rule 15 read-endpoint rate limits, Universal Rule 5 i18n-ready constants structure + Anti-Pressure Copy Checklist. **Batch 2** (11 should-fix patches): Appendix B path bulk correction, Spec 6.2 Quick Lift server-authoritative timer, Phase 1 BCrypt-in-Liquibase-XML callout, Spec 8.1 username profanity filter, Spec 1.4 CSRF disable callout, Spec 2.8 drift detection CI integration, Phase 3.6 and 3.7 addenda content, Spec 7.7 visibility predicate canonical SQL, Spec 8.4 deleted/banned user display copy, Spec 6.7 PII stripping for testimony PNGs. **Batch 3** (8 new specs): 1.3b users timezone column, 1.9b error/loading design system, 2.10 historical activity backfill, 4.6b image upload for testimonies and questions, 4.7b Ways to Help MVP, 6.2b prayer length options (1/5/10 min guided sessions), 6.11b live presence component, 10.11 account deletion and data export. **Batch 4** (metadata cleanup): Phase 3.6 and 3.7 addenda relocated from Phase 4/11 into their correct Phase 3 homes (pure move, content unchanged), Quick Reference phase-count table synced to Batch 3 additions (Phase 1: 13, Phase 2: 10, Phase 4: 10, Phase 6: 14, Phase 10: 11), total spec count updated to ~129, Appendix C regenerated to include all 128 spec IDs, version and end-marker bumped to v2.1.
- **2026-04-14 — v2.0** — Comprehensive rewrite based on full codebase audit. Critical corrections: tech stack (Maven not Gradle, JPA not JDBC, JWT not Firebase, application.properties not yml), backend skeleton already exists (audit and extend, not create), 10 categories not 8 (Mental Health was missing), QOTD already exists (migrate not build), reaction bug fixed in new Phase 0.5 (before backend work), Save vs Bookmark are distinct features, `posts` table replaces `prayer_requests`/etc names from older spec. New phases: 0.5, 2.5, 11, 12, 13, 14, 15, 16. Spec count: 88 → ~120. Spec template rewritten to match BB-45 format. Universal spec rules expanded from 12 to 16 (BB-45 anti-pattern enforcement, plain text only, rate limiting).
- **2026-04-14 — v1.0** — Initial draft based on three Prayer Wall recons, Profile/Dashboard recon, competitor research, and strategic conversation. Now superseded by v2.0.

## Appendix A — Acronyms and Terms

- **BB-N** — "Big Build" specs from previous waves (Bible wave numbering). Referenced when current standards trace back to a specific BB spec.
- **CC** — Claude Code, the implementation agent.
- **FrostedCard** — The canonical card component with frosted-glass treatment, dual box-shadow, and tier system.
- **HorizonGlow** — The canonical ambient gradient background component.
- **JPA** — Java Persistence API (Spring Data JPA).
- **JWT** — JSON Web Token. The auth token format.
- **OP** — Original poster (the user who created a post).
- **OpenAPI** — The API description spec format. Single source of truth for backend endpoints.
- **QOTD** — Question of the Day. A daily rotating discussion prompt.
- **Quick Lift** — A 30-second silent prayer gesture for moments of "I do not have words."
- **Trust Level** — Discourse-style 0-4 user privilege ladder for moderation.
- **WEB** — World English Bible, the translation used throughout the app.

## Appendix B — Key File Locations

- **Master Plan (this file)** — `/Users/eric.champlin/worship-room/_forums_master_plan/round3-master-plan.md`
- **Backend** — `/Users/eric.champlin/worship-room/backend/`
- **Backend Liquibase changelogs** — `/Users/eric.champlin/worship-room/backend/src/main/resources/db/changelog/`
- **OpenAPI spec** — `/Users/eric.champlin/worship-room/backend/src/main/resources/openapi.yaml` (shipped location — Appendix corrected in v2.7 from v2.6's `backend/api/openapi.yaml` path)
- **Frontend Prayer Wall components** — `/Users/eric.champlin/worship-room/frontend/src/components/prayer-wall/`
- **Frontend Prayer Wall pages** — `/Users/eric.champlin/worship-room/frontend/src/pages/PrayerWall*.tsx`
- **Generated API types** — `/Users/eric.champlin/worship-room/frontend/src/types/api/generated.ts`
- **Reactive store inventory** — `/Users/eric.champlin/worship-room/.claude/rules/11-local-storage-keys.md`
- **Brand voice doctrine** — `/Users/eric.champlin/worship-room/CLAUDE.md` (anti-pressure section)
- **Existing specs** — `/Users/eric.champlin/worship-room/_specs/`
- **Cutover checklists** — `/Users/eric.champlin/worship-room/_plans/forums-wave/`

## Appendix C — Spec Quick Index

A flat list of every spec ID in execution order. Use this when you need to find a spec without scanning the phase headers.

```
round3-phase00-spec01-backend-foundation-learning
round3-phase00-5-spec01-prayer-reactions-reactive-store
round3-phase01-spec01-backend-skeleton-audit
round3-phase01-spec02-postgres-docker
round3-phase01-spec03-liquibase-setup
round3-phase01-spec03b-users-timezone-column
round3-phase01-spec04-spring-security-jwt
round3-phase01-spec05-auth-endpoints
round3-phase01-spec05b-password-reset-flow
round3-phase01-spec05c-change-password
round3-phase01-spec05d-email-verification
round3-phase01-spec05e-change-email
round3-phase01-spec05f-account-lockout
round3-phase01-spec05g-session-invalidation
round3-phase01-spec06-user-me-endpoint
round3-phase01-spec07-testcontainers-setup
round3-phase01-spec08-dev-seed-data
round3-phase01-spec09-frontend-auth-jwt
round3-phase01-spec09b-error-loading-design-system
round3-phase01-spec10-phase1-cutover
round3-phase01-spec10b-deployment-target-decision
round3-phase01-spec10d-production-monitoring-foundation
round3-phase01-spec10e-object-storage-adapter-foundation
round3-phase01-spec10c-database-backup-strategy
round3-phase01-spec10f-terms-privacy-policy-surfaces
round3-phase01-spec10g-security-headers
round3-phase01-spec10h-error-code-catalog
round3-phase01-spec10i-env-var-runbook
round3-phase01-spec10j-liveness-readiness
round3-phase01-spec10k-hikaricp-tuning
round3-phase01-spec10l-playwright-e2e
round3-phase01-spec10m-community-guidelines
round3-phase02-spec01-activity-schema
round3-phase02-spec02-faith-points-service
round3-phase02-spec03-streak-service
round3-phase02-spec04-badge-service
round3-phase02-spec05-activity-counts-service
round3-phase02-spec06-activity-endpoint
round3-phase02-spec07-frontend-activity-dual-write
round3-phase02-spec08-activity-drift-test
round3-phase02-spec09-phase2-cutover
round3-phase02-spec10-historical-activity-backfill
round3-phase02-5-spec01-friends-schema
round3-phase02-5-spec02-friends-service
round3-phase02-5-spec03-friends-endpoints
round3-phase02-5-spec04-frontend-friends-dual-write
round3-phase02-5-spec04b-social-milestone-dual-write
round3-phase02-5-spec05-phase2-5-cutover
round3-phase02-5-spec06-block-user
round3-phase02-5-spec07-mute-user
round3-phase03-spec01-prayer-wall-schema
round3-phase03-spec02-mock-data-seed
round3-phase03-spec03-posts-read-endpoints
round3-phase03-spec04-engagement-read-endpoints
round3-phase03-spec05-posts-write-endpoints
round3-phase03-spec06-comments-write-endpoints
round3-phase03-spec07-reactions-bookmarks-write
round3-phase03-spec08-reports-write-endpoint
round3-phase03-spec09-qotd-backend
round3-phase03-spec10-frontend-prayer-wall-api
round3-phase03-spec11-reactions-backend-adapter
round3-phase03-spec12-phase3-cutover
round3-phase04-spec01-post-type-foundation
round3-phase04-spec02-prayer-request-polish
round3-phase04-spec03-testimony-post-type
round3-phase04-spec04-question-post-type
round3-phase04-spec05-discussion-post-type
round3-phase04-spec06-encouragement-post-type
round3-phase04-spec06b-image-upload-testimonies-questions
round3-phase04-spec07-composer-chooser
round3-phase04-spec07b-ways-to-help-mvp
round3-phase04-spec08-room-selector-cutover
round3-phase05-spec01-frosted-card-migration
round3-phase05-spec02-horizon-glow
round3-phase05-spec03-two-line-headings
round3-phase05-spec04-animation-tokens
round3-phase05-spec05-deprecated-pattern-purge
round3-phase05-spec06-redis-cache-foundation
round3-phase06-spec01-prayer-receipt
round3-phase06-spec02-quick-lift
round3-phase06-spec02b-prayer-length-options
round3-phase06-spec03-night-mode
round3-phase06-spec04-three-am-watch
round3-phase06-spec05-intercessor-timeline
round3-phase06-spec06-answered-wall
round3-phase06-spec07-shareable-testimony-cards
round3-phase06-spec08-verse-finds-you
round3-phase06-spec09-composer-drafts
round3-phase06-spec10-search-by-author
round3-phase06-spec11-sound-effects-polish
round3-phase06-spec11b-live-presence-component
round3-phase06-spec12-phase6-cutover
round3-phase07-spec01-bible-to-prayer-wall
round3-phase07-spec02-prayer-wall-to-bible
round3-phase07-spec03-music-during-prayer-wall
round3-phase07-spec04-daily-hub-friend-prayers
round3-phase07-spec05-local-support-bridges
round3-phase07-spec06-friends-pin-to-top
round3-phase07-spec07-privacy-tiers
round3-phase07-spec08-phase7-cutover
round3-phase08-spec01-username-system
round3-phase08-spec02-username-route
round3-phase08-spec03-profile-summary-tab
round3-phase08-spec04-profile-prayer-wall-tab
round3-phase08-spec05-profile-growth-tab
round3-phase08-spec06-profile-bible-tab
round3-phase08-spec07-profile-friends-tab
round3-phase08-spec08-name-canonicalization
round3-phase08-spec09-phase8-cutover
round3-phase09-spec01-liturgical-calendar
round3-phase09-spec02-liturgical-theming
round3-phase09-spec03-sunday-service-sync
round3-phase09-spec04-time-of-day-copy
round3-phase09-spec05-candle-mode
round3-phase10-spec01-first-time-badges
round3-phase10-spec02-welcomer-role
round3-phase10-spec03-presence-cues
round3-phase10-spec04-trust-levels
round3-phase10-spec05-three-tier-escalation
round3-phase10-spec06-automated-flagging
round3-phase10-spec07-peer-moderator-queue
round3-phase10-spec07b-report-a-user
round3-phase10-spec08-appeal-flow
round3-phase10-spec09-rate-limit-tightening
round3-phase10-spec10-admin-foundation
round3-phase10-spec10b-admin-audit-log-viewer
round3-phase10-spec11-account-deletion-data-export
round3-phase11-spec01-fulltext-search-schema
round3-phase11-spec02-search-endpoint
round3-phase11-spec03-search-ui
round3-phase11-spec04-search-by-verse
round3-phase12-spec01-notification-types
round3-phase12-spec02-notification-backend
round3-phase12-spec03-notification-generators
round3-phase12-spec04-notification-preferences
round3-phase12-spec05-mention-system
round3-phase13-spec01-insights-endpoint
round3-phase13-spec02-insights-card
round3-phase13-spec03-year-in-review
round3-phase13-spec04-intercession-patterns
round3-phase14-spec01-first-visit-walkthrough
round3-phase14-spec02-suggested-first-action
round3-phase14-spec03-find-your-people
round3-phase14-spec04-warm-empty-states
round3-phase15-spec01-smtp-setup
round3-phase15-spec01b-welcome-email-sequence
round3-phase15-spec02-comment-reply-digest
round3-phase15-spec03-weekly-summary
round3-phase15-spec04-push-notifications
round3-phase16-spec01-offline-cache
round3-phase16-spec01b-offline-banner
round3-phase16-spec02-queued-posts
round3-phase16-spec02b-error-boundaries
round3-phase16-spec03-lighthouse-perf
round3-phase16-spec03b-feature-flag-cleanup-pass
round3-phase16-spec04-accessibility-audit
```

## Appendix D — Deferred to Future Waves

This appendix consolidates every deliberate deferral scattered through the Forums Wave into a single reference. Each entry was recorded as "out of scope" inside a specific spec's Out-of-Scope section; gathering them here gives next-wave planning a starting scope-of-work rather than requiring a re-grep of the entire Master Plan. Entries are grouped by theme. Each entry notes the spec(s) where the deferral was declared, so context is one ctrl-F away.

### Core features deferred to future waves

- **Personal prayer list (`/my-prayers`) backend migration.** The Save-to-prayer-list feature stays on localStorage during the Forums Wave (Decision 14, Spec 3.10). Future-wave scope: migrate `wr_prayer_list` to a backend table, preserve reminder scheduling and mark-as-answered UX, distinguish from Prayer Wall bookmarks semantically.
- **Direct messages (DMs).** Not in scope anywhere in this wave. Future-wave scope: 1:1 messaging with encryption-at-rest, report-message flow integrating with Phase 10.7 moderation, block-user cascading to DM permissions.
- **Voice-guided prayer sessions.** Referenced as out of scope in Spec 6.2 Quick Lift and 6.2b Prayer Length Options. Future-wave scope: audio content delivery, narrator voice curation, offline caching, accessibility (closed captions).
- **Video prayer requests.** Referenced as out of scope in Spec 4.6b Image Upload. Future-wave scope: video upload + moderation + storage cost model + trust-level gating for video.
- **Multiple images per post.** Spec 4.6b scopes to single-image MVP. Future-wave scope: gallery UI, ordering, caption-per-image.
- **Images on "mark as answered" updates.** Spec 6.6 Answered Wall flagged this as a future consideration — emotionally loaded testimonies often deserve images. Future-wave scope: image upload in MarkAsAnsweredForm, reused storage adapter.
- **Group prayer rooms / private circles.** Not scoped in this wave. Future-wave scope: invitation-only small-group feeds, shared prayer lists, small-group notifications.
- **Scheduled / recurring prayers.** Referenced as out of scope in Spec 10.11 Account Deletion. Future-wave scope: "pray every weekday at 7am for 30 days" recurring reminders.
- **Liturgy-of-the-day integrated readings.** Phase 9 touches liturgical seasons but not daily-lectionary integration. Future-wave scope: RCL (Revised Common Lectionary) and Catholic lectionary feeds.
- **Church community integration.** Phase 7.5 touches local support (counselors, Celebrate Recovery). Future-wave scope: church-specific prayer walls, pastor dashboard, sermon-referenced prayer prompts.
- **Family / household prayer mode.** Not scoped. Future-wave scope: shared prayer lists for families, child-friendly UI mode, parental controls.

### Profile & identity deferrals

- **Profile photo upload.** Open Question #10 in this plan. Avatars remain URL-only with initials fallback. Future-wave scope: S3-backed photo upload (adapter exists per 1.10e), image moderation, crop UI, removing photos on account deletion.
- **Account merging.** Referenced in Spec 10.11. Future-wave scope: two Worship Room accounts merging into one, with comment/post reattribution.
- **OAuth social login (Google, Apple).** Not in scope for JWT auth per Decision 6. Future-wave scope: SSO flows, account-linking UX, existing-email conflict handling.
- **Username change flow.** Spec 8.1 introduces usernames but doesn't specify mid-life-of-account changes. Future-wave scope: rate-limited username changes, URL redirect retention for old handles.
- **Custom profile themes / backgrounds.** Profile customization capped at bio, favorite verse, display-name preference. Future-wave scope: theme selection, background image upload.
- **Verified profiles (pastors, chaplains, counselors).** Not in scope. Future-wave scope: verification badge, in-app disclosure that the person is acting in a professional capacity, referral integration with Phase 7.5 Local Support.

### Infrastructure deferrals

- **Real-time WebSocket feed updates.** Prayer Wall refreshes on navigation; no live-updating feed. Future-wave scope: WebSocket or SSE for real-time feed updates, presence indicators across feature boundaries.
- **Read replicas / horizontal DB scaling.** Spec 1.10c notes deferral. Future-wave scope: platform-managed read replicas, connection routing, replication-lag monitoring.
- **Redis Cluster / multi-region Redis.** Spec 5.6 single-instance only. Future-wave scope: cluster mode, failover, multi-region.
- **Cross-region backup redundancy.** Spec 1.10c single-region. Future-wave scope: replicated backups across regions, restore-from-alt-region runbook.
- **Distributed tracing (OpenTelemetry).** Spec 1.10d defers. Future-wave scope: trace propagation from frontend through Spring Boot to Redis/Postgres, latency percentile tracking.
- **APM dashboards.** Spec 1.10d defers (Sentry free tier covers errors, not APM). Future-wave scope: Datadog APM or equivalent with p50/p95/p99 latency per endpoint.
- **Log aggregation service.** Spec 1.10d defers; stdout capture is MVP. Future-wave scope: Loki, Better Stack Logs, or LogDNA integration.
- **Malware scanning on uploads.** Spec 1.10e defers (ClamAV integration). Future-wave scope: async virus scan queue, quarantine-before-present flow for uploaded images.
- **Client-side direct-to-S3 uploads (presigned POST).** Spec 1.10e defers. Future-wave scope: presigned POST endpoints, browser-native progress UI, PII/size validation on the client before upload.
- **Server-side encryption with customer-managed keys.** Spec 1.10e defers. Future-wave scope: SSE-KMS or SSE-C implementation when a real compliance need emerges.

### Notifications & engagement deferrals

- **Notification digest batching implementation.** Decision 17 specifies the preference; the job itself is deferred. Future-wave scope: scheduled digest-batching job, email/push delivery, digest-formatting templates.
- **Re-engagement emails to inactive users.** Spec 15.1b explicitly names this anti-pattern. Future-wave scope: IF ever shipped, must pass pastor's-wife test first; current recommendation is never to ship this.
- **Per-feature newsletter / product-update emails.** Spec 15.1b out of scope. Future-wave scope: opt-in newsletter list, strict separation from transactional emails.
- **SMS notifications.** Not scoped. Future-wave scope: Twilio integration for critical-only notifications (moderation actions, account security), explicitly opt-in.
- **Web push rich notifications with images.** Spec 15.4 covers basic web push. Future-wave scope: Notification Actions, rich preview, badge counts.
- **iOS / Android native apps.** Worship Room is PWA-only for MVP. Future-wave scope: native wrappers (Capacitor / Expo), App Store submission, app-store-specific requirements (App Tracking Transparency, Play Store data-safety).

### Community & moderation deferrals

- **Community Guidelines document.** Spec 1.10f references but doesn't author. Future-wave scope: standalone `/community-guidelines` page, cross-referenced from ToS and from moderation actions.
- **Automated permanent bans from multiple reports.** Spec 10.7b keeps this manual. Future-wave scope: if/when scale demands automation, explicit human-review gate remains mandatory.
- **Moderator-to-reporter direct chat during review.** Spec 10.7b one-shot only. Future-wave scope: moderator-initiated clarification requests with PII-safe threading.
- **Cross-platform user report sharing.** Spec 10.7b internal-only. Future-wave scope: if Worship Room ever integrates with other Christian platforms, mutual-block and mutual-report protocols.
- **AI-assisted report triage.** Spec 10.7b human-only. Future-wave scope: classifier to prioritize the moderator queue, never to auto-act.
- **Public moderator action log / transparency report.** Not scoped. Future-wave scope: aggregated quarterly transparency reports (number of actions by category, no per-case detail).

### Search & discovery deferrals

- **Semantic / embedding-based search.** Phase 11 uses PostgreSQL full-text only. Future-wave scope: pgvector integration, semantic-proximity search, opt-in for specific features.
- **Saved searches.** Phase 11 scopes to recent searches only. Future-wave scope: named saved searches with notifications on new matches.
- **Cross-user search privacy preferences.** Phase 11 enforces existing privacy tiers. Future-wave scope: "hide me from search entirely" user preference beyond the existing privacy tiers.
- **Content-aware search autocomplete.** Phase 11 uses recent-searches only. Future-wave scope: trending-terms suggestions (with anti-pressure guardrails — never suggest crisis terms as "trending").

### Analytics & insights deferrals

- **Per-post view tracking.** Explicitly forbidden during 3am Watch (Spec 6.4); out of scope generally. Future-wave scope: if ever shipped, must be opt-in at the author level per-post, with deletion cascading.
- **Intercessor retention cohort analytics.** Phase 13 personal only. Future-wave scope: community-level cohort analytics (aggregated, anonymized), visible only to Eric.
- **A/B testing framework.** Not scoped. Future-wave scope: feature-flag-gated experimentation, consent-aware (no A/B on vulnerability content like 3am Watch or Verse-Finds-You).
- **Retention dashboards for Eric.** Not scoped. Future-wave scope: weekly operational digest showing active users, new signups, deletion rate — strictly aggregate, no individual user tracking.

### Legal & compliance deferrals

- **Lawyer review of Terms and Privacy Policy.** Spec 1.10f flags this as required before 500 users. Next-wave scope: single-sitting legal review ($500-2000 budget), revisions incorporated.
- **Per-jurisdiction privacy variants.** Spec 1.10f English-only MVP. Future-wave scope: CCPA (California), UK-DPA, Brazilian LGPD supplements as user geography expands.
- **Data Processing Agreement (DPA) for B2B use.** Spec 1.10f out of scope. Future-wave scope: if church/organization accounts ever ship, DPA template and signing flow.
- **SOC 2 Type I or Type II.** Not scoped; no current enterprise buyer requires this. Future-wave scope: gap assessment, 12-month audit prep if a qualifying buyer emerges.
- **HIPAA considerations.** Worship Room is not a medical service and should never attempt HIPAA compliance (would require clinical-grade safeguards incompatible with the current trust model). Future-wave scope: if referral-to-counselor ever grows into clinical integration, explicit separation of a HIPAA-covered product from the core community app.

### Internationalization & accessibility deferrals

- **Multi-language UI.** Universal Rule 5's constants structure is i18n-ready but no translation exists. Future-wave scope: Spanish first (largest Christian non-English community in likely user base), then Portuguese, then Korean.
- **Scripture translations beyond WEB.** Multiple specs lock to WEB. Future-wave scope: ESV, NIV, NKJV, KJV, CSB as licensed — each requires a rights deal.
- **International crisis resource localization.** Spec 6.4 3am Watch is US-centric. Future-wave scope: per-country crisis resource mapping (UK: Samaritans 116 123, Canada: 988, Australia: Lifeline 13 11 14, etc.).
- **Screen reader optimization beyond smoke-test level.** Rule 17 adds smoke tests; Spec 16.4 is the full audit. Future-wave scope: comprehensive NVDA / JAWS / VoiceOver / TalkBack walkthroughs with real users.
- **Cognitive accessibility features.** Not scoped. Future-wave scope: simplified-language mode, reading-time estimates, distraction-reduction mode.

### Integration deferrals

- **Church management software integration.** Not scoped. Future-wave scope: Planning Center, Pushpay, CCB, Rock RMS integrations for parish-scale deployment.
- **Calendar integration for prayer reminders.** Not scoped. Future-wave scope: Google Calendar / iCal subscription for prayer-for-someone reminders.
- **Audio Bible integration.** Not scoped. Future-wave scope: YouVersion or Bible Gateway API audio playback for Phase 7 Bible ↔ Prayer Wall bridge.
- **Music service integration beyond embeds.** Existing music feature is independent. Future-wave scope: Spotify/Apple Music/YouTube Music linked-account playback within Worship Room.

### Monetization & sustainability deferrals

- **Subscription / paid tier.** Not scoped. Future-wave scope: IF ever shipped, must preserve the "vulnerability content is never paywalled" principle; premium tier can only gate convenience features (e.g., advanced search, longer export retention).
- **Donations / tip-jar model.** Not scoped. Future-wave scope: one-time donation support for sustaining hosting costs, transparent financial reporting.
- **Church-sponsored / partner accounts.** Not scoped. Future-wave scope: verified church accounts with their own intra-church Prayer Wall, moderated by church-appointed moderators.

### Process & tooling deferrals

- **Feature-flag-management platform** (LaunchDarkly, Unleash, etc.). Spec 16.3b env-var-based for MVP. Future-wave scope: platform migration IF flag count grows beyond manageable.
- **Automated dead-flag static analysis.** Spec 16.3b manual audit. Future-wave scope: custom lint rule or AST-grep check for unused flag references.
- **Incident response automation (PagerDuty, Opsgenie).** Spec 1.10d email-only. Future-wave scope: on-call rotation, escalation policies, incident postmortems discipline.
- **Automated ToS change announcement emails.** Spec 1.10f manual-for-MVP. Future-wave scope: scheduled announcement + in-app banner flow on version change.
- **Internationalized timezones in registration UX.** Spec 1.3b captures from browser automatically; manual picker is a fallback. Future-wave scope: better autocomplete, country-pre-filtered timezone list.

### Explicitly NOT ever shipping (anti-pattern register)

These items appear in various "out of scope" sections with explicit guidance that they should NEVER ship. Consolidated here so future-self doesn't accidentally re-open them:

- "Be the first to pray!" FOMO copy — explicitly forbidden (Spec 6.1)
- AI-generated comfort responses to crisis posts — forbidden by Universal Rule 13 (Spec 6.4)
- "Most-celebrated prayer of the week" public leaderboard — explicitly anti-pattern (Spec 6.6)
- "N people are watching tonight" community counters during 3am Watch — explicitly anti-pattern (Spec 6.4)
- Streak-shame notifications ("your streak is in danger") — explicitly forbidden (Spec 15.1b, Universal Rule 12)
- Automated "we miss you" re-engagement emails — explicitly anti-pattern (Spec 15.1b)
- Referral / invite-a-friend CTAs in onboarding emails — explicitly out of scope (Spec 15.1b)
- Comparative metrics ("you pray more than X% of users") — forbidden across the wave by anti-pressure discipline
- Public "times reported" badge on user profiles — explicit harassment-vector anti-pattern (Spec 10.7b)
- Personalized LLM-generated verse selection — explicitly not-MVP; may never ship (Spec 6.8)

---

## Appendix E — v2.8 Spec Stubs (18 new specs added for completeness)

These 18 stubs were added in v2.8 to close gaps found during pre-execution review. Each stub contains enough detail for `/spec-forums` to expand into a full spec with copy decks, acceptance criteria, and test specs. Use these as the seed content when creating each spec file in `_specs/forums/`.

**Reading order:** Phase 1 stubs first (they're on the critical path), then Phase 2.5 (needed before Phase 6 references), then Phase 10 and Phase 16 (can slot in whenever).

### Spec 1.5b — Password Reset Flow

- **ID:** `round3-phase01-spec05b-password-reset-flow`
- **Size:** L
- **Risk:** High (auth lifecycle; correct token handling is security-critical)
- **Prerequisites:** 1.5 (Auth Endpoints), 15.1 (SMTP Setup — or provide a stub mailer for dev)
- **Goal:** Enable users to reset a forgotten password via email-triggered token. Single-use token, 1-hour expiry, rate-limited, anti-enumeration.
- **Approach:** New `POST /api/v1/auth/password-reset/request` accepts `{ email }`, always returns 200 regardless of email existence (anti-enumeration), silently queues an email if the account exists. Store token in `password_reset_tokens` table (`token_hash`, `user_id`, `expires_at`, `consumed_at`). Email contains `https://worshiproom.app/reset-password?token=<raw_token>`. New `POST /api/v1/auth/password-reset/confirm` accepts `{ token, new_password }`, validates token (not expired, not consumed), updates password hash, invalidates all existing sessions for that user (per Spec 1.5g). Rate limit: 5 reset requests per hour per email + 10 per hour per IP. 12-char minimum enforced on new_password.
- **Files to create:**
  - `backend/src/main/resources/db/changelog/2026-XX-XX-NNN-password-reset-tokens-table.xml`
  - `backend/src/main/java/com/worshiproom/auth/PasswordResetController.java`
  - `backend/src/main/java/com/worshiproom/auth/PasswordResetService.java`
  - `backend/src/main/java/com/worshiproom/auth/PasswordResetToken.java` (JPA entity)
  - `backend/src/main/java/com/worshiproom/auth/PasswordResetTokenRepository.java`
  - `backend/src/main/java/com/worshiproom/email/PasswordResetEmailTemplate.java`
  - `frontend/src/pages/ForgotPasswordPage.tsx`
  - `frontend/src/pages/ResetPasswordPage.tsx`
  - Integration tests + unit tests
- **Files to modify:**
  - `backend/src/main/resources/openapi.yaml` (add two endpoints)
  - `frontend/src/App.tsx` (add routes `/forgot-password`, `/reset-password`)
  - `frontend/src/components/auth/AuthModal.tsx` (add "Forgot password?" link)
- **Copy Deck:** Forgot password copy passes pastor's-wife test ("Enter your email and we'll send you a link to reset your password" — not "Forgot your password? No problem!"); success state is gentle ("If an account exists for this email, you'll receive a reset link shortly"); token-expired error is blameless ("This reset link has expired. Request a new one to continue."). **Anti-Pressure Copy Checklist** applies.

### Spec 1.5c — Change Password Endpoint

- **ID:** `round3-phase01-spec05c-change-password`
- **Size:** S
- **Risk:** Low
- **Prerequisites:** 1.5 (Auth Endpoints)
- **Goal:** Logged-in user can change their password by providing current + new.
- **Approach:** `POST /api/v1/auth/change-password` accepts `{ current_password, new_password }`. Validates current_password against stored hash. If match, updates to new hash. Invalidates all other sessions (keeps current session alive per Spec 1.5g semantics). Rate-limited 10/hour per user. 12-char minimum on new_password.
- **Files to create:**
  - `backend/src/main/java/com/worshiproom/auth/ChangePasswordController.java` (or extend existing AuthController)
  - `frontend/src/pages/settings/ChangePasswordSection.tsx`
  - Tests
- **Files to modify:**
  - `backend/src/main/resources/openapi.yaml`
  - `frontend/src/pages/settings/SettingsPage.tsx` (add section)

### Spec 1.5d — Email Verification Flow

- **ID:** `round3-phase01-spec05d-email-verification`
- **Size:** L
- **Risk:** Medium (affects registration UX — must be graceful)
- **Prerequisites:** 1.5 (Auth Endpoints), 1.5b (Password Reset — similar token infrastructure), 15.1 (SMTP)
- **Goal:** Verify email ownership at registration. Unverified users can log in and browse but cannot post, comment, or react on Prayer Wall until verified (seven-day grace period).
- **Approach:** Add `email_verified_at TIMESTAMP NULL` to `users`. On registration, create `email_verification_tokens` row, send email with verification link. `POST /api/v1/auth/email-verify/confirm` consumes token and sets `email_verified_at`. Gate write endpoints behind `@RequireVerifiedEmail` annotation; return 403 `EMAIL_NOT_VERIFIED` with helpful message. Resend endpoint: `POST /api/v1/auth/email-verify/resend` (rate-limited 5/hour). Frontend shows persistent banner on all pages while unverified, with "Resend verification email" button. Grace period: reads allowed for 7 days, writes blocked from day 1. Reads blocked after 7 days.
- **Files to create:** Similar shape to 1.5b — controller, service, entity, repo, email template, frontend components, integration tests.
- **Files to modify:**
  - `backend/src/main/resources/db/changelog/` (users table ALTER + new token table)
  - `backend/src/main/resources/openapi.yaml`
  - All Prayer Wall write controllers (apply `@RequireVerifiedEmail`)
  - `frontend/src/components/shell/AppShell.tsx` (banner)

### Spec 1.5e — Change Email with Re-Verification

- **ID:** `round3-phase01-spec05e-change-email`
- **Size:** M
- **Risk:** Medium (security-sensitive — email is auth factor)
- **Prerequisites:** 1.5d (Email Verification)
- **Goal:** Logged-in user can change their email. New email must be verified before the change takes effect.
- **Approach:** `POST /api/v1/auth/change-email` accepts `{ current_password, new_email }`. Validates password. Creates a `pending_email_change` row (`user_id`, `new_email`, `token_hash`, `expires_at`), sends verification to NEW email. Old email receives an alert notification ("A change to your email was requested; if this wasn't you, reset your password"). On confirm, moves the user's email and invalidates all sessions. Anti-enumeration: if new_email already belongs to another account, still return 200 to the user but send a "someone tried to use your email" notification to that account.
- **Files to create:** Similar shape to 1.5b + alert email template.
- **Files to modify:** openapi.yaml, settings page.

### Spec 1.5f — Account Lockout & Brute Force Protection

- **ID:** `round3-phase01-spec05f-account-lockout`
- **Size:** M
- **Risk:** Medium (UX impact if tuned wrong — users locked out of real accounts)
- **Prerequisites:** 1.5 (Auth Endpoints)
- **Goal:** Prevent credential stuffing and password brute force while minimizing real-user lockouts.
- **Approach:** Add `failed_login_count INT DEFAULT 0`, `locked_until TIMESTAMP NULL` to `users`. On failed login, increment count. After 5 failures within 15 minutes, set `locked_until = now() + 15 minutes`, return 423 `ACCOUNT_LOCKED` with message "Too many failed attempts. Try again in 15 minutes, or reset your password." On successful login, reset count to 0. Also maintain per-IP rate limit (20 login attempts/hour/IP) at the filter layer — catches distributed attacks against many accounts. Admin endpoint to manually unlock an account.
- **Files to create:**
  - Liquibase changeset (users ALTER)
  - `LoginAttemptService.java`
  - Integration tests
- **Files to modify:**
  - `backend/src/main/java/com/worshiproom/auth/AuthController.java` (or service)
  - `backend/src/main/java/com/worshiproom/proxy/common/RateLimitFilter.java` (add `/api/v1/auth/login` to filter scope if not already)
  - openapi.yaml (error response shape)

### Spec 1.5g — Session Invalidation & Logout-All-Devices

- **ID:** `round3-phase01-spec05g-session-invalidation`
- **Size:** M
- **Risk:** Medium (JWT stateless model requires careful invalidation design)
- **Prerequisites:** 1.5 (Auth Endpoints), 5.6 (Redis Cache Foundation — for blocklist)
- **Goal:** Support explicit logout, logout-all-devices, and automatic session invalidation on password change / email change / account compromise.
- **Approach:** Since JWTs are stateless, introduce a `jwt_blocklist` table (Redis-backed, falls back to Postgres) keyed by `jti` (JWT ID claim). `JwtAuthenticationFilter` checks the blocklist on every request; blocked tokens return 401. Logout adds current token's `jti` to blocklist. Logout-all-devices adds ALL active tokens for the user (tracked in a separate `active_sessions` table keyed by user_id + jti + issued_at). Password change / email change trigger logout-all-devices automatically. Tokens auto-expire from blocklist at their natural JWT expiry (1 hour) so the blocklist stays bounded. New endpoints: `POST /api/v1/auth/logout` (current session), `POST /api/v1/auth/logout-all` (all sessions), `GET /api/v1/auth/sessions` (list active sessions).
- **Files to create:**
  - Liquibase changesets for `active_sessions` + `jwt_blocklist`
  - `SessionService.java`, `JwtBlocklistService.java`
  - `SessionsController.java`
  - Frontend: `/settings/sessions` page showing active devices with "Revoke" buttons
- **Files to modify:**
  - `backend/src/main/java/com/worshiproom/auth/JwtService.java` (include `jti` claim)
  - `backend/src/main/java/com/worshiproom/auth/JwtAuthenticationFilter.java` (blocklist check)
  - openapi.yaml

### Spec 1.10g — Security Headers Middleware (CSP/HSTS/X-Frame-Options)

- **ID:** `round3-phase01-spec10g-security-headers`
- **Size:** S
- **Risk:** Low (but easy to misconfigure — CSP too strict breaks the app)
- **Prerequisites:** 1.4 (Spring Security)
- **Goal:** Add security response headers on all responses to meet baseline web security expectations.
- **Approach:** Spring Security's `HttpSecurity.headers()` configuration. Headers: `Strict-Transport-Security: max-age=31536000; includeSubDomains`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`, and a `Content-Security-Policy` that permits self + fonts.googleapis.com + the known image CDNs + `data:` for small inline images. Tune CSP on a staging deploy before rolling to prod. Profile-specific: dev profile uses `Content-Security-Policy-Report-Only` to avoid blocking HMR.
- **Files to modify:**
  - `backend/src/main/java/com/worshiproom/auth/SecurityConfig.java` (or extract to `SecurityHeadersConfig.java`)
  - `backend/docs/runbook-security-headers.md` (new doc explaining what to tune when a new CDN or font source is added)

### Spec 1.10h — API Error Code Catalog

- **ID:** `round3-phase01-spec10h-error-code-catalog`
- **Size:** S
- **Risk:** Low
- **Prerequisites:** 1.4 (Spring Security — so all error types exist)
- **Goal:** Single source of truth for every `code` string the API returns. Prevents drift between controllers and frontend error handlers.
- **Approach:** Create `backend/docs/error-codes.md` cataloging every error code: `RATE_LIMITED`, `UPSTREAM_ERROR`, `SAFETY_BLOCK`, `VALIDATION_ERROR`, `UNAUTHORIZED`, `EMAIL_NOT_VERIFIED`, `ACCOUNT_LOCKED`, `NOT_FOUND`, `CONFLICT`, etc. Each entry: code constant, HTTP status, user-facing message template, when it's thrown, which controller. Also add `ErrorCodes.java` Java constants class so controllers reference `ErrorCodes.ACCOUNT_LOCKED` not the raw string. Frontend mirror: `frontend/src/lib/error-codes.ts` with type definitions and user-facing copy.
- **Files to create:**
  - `backend/docs/error-codes.md`
  - `backend/src/main/java/com/worshiproom/proxy/common/ErrorCodes.java`
  - `frontend/src/lib/error-codes.ts`
- **Files to modify:** all exception handlers to use the constants.

### Spec 1.10i — Backend Environment Variables Runbook

- **ID:** `round3-phase01-spec10i-env-var-runbook`
- **Size:** S
- **Risk:** Low
- **Prerequisites:** None
- **Goal:** Consolidate every env var the backend reads into a single runbook. Prevents the "what does this env var do?" question during deploy.
- **Approach:** Audit every `@Value("${...}")` and `@ConfigurationProperties` class in `backend/src/main/java/`, every `application-*.properties` file, every `docker-compose.yml` env reference. Produce `backend/docs/runbook-environment-variables.md` with: variable name, purpose, default value, required-or-optional, which profile uses it, example value (not real secret). Group by concern: database, auth, rate limiting, proxy APIs, SMTP, monitoring, feature flags.
- **Files to create:** `backend/docs/runbook-environment-variables.md`
- **Files to modify:** `.env.example` at backend root (regenerate from the runbook).

### Spec 1.10j — Liveness/Readiness Health Checks

- **ID:** `round3-phase01-spec10j-liveness-readiness`
- **Size:** S
- **Risk:** Low
- **Prerequisites:** 1.10 (Phase 1 cutover — so the existing `/api/v1/health` is in place)
- **Goal:** Split health endpoints into liveness (is the process alive?) and readiness (can it serve traffic?). Existing `/api/v1/health` stays as a combined status endpoint for uptime monitoring.
- **Approach:** Add `/api/v1/health/live` (always returns 200 if JVM is responding — no DB check, no upstream check) and `/api/v1/health/ready` (returns 200 only if DB connection pool is healthy AND Redis connection is healthy AND migration is complete — returns 503 otherwise). Platforms like Kubernetes, Railway, and Render use these distinctly: liveness restarts the container on failure, readiness removes from load balancer. Spring Boot Actuator provides `/actuator/health/liveness` and `/actuator/health/readiness` out of the box — this spec exposes them at the `/api/v1/` path + adds custom readiness indicators for our specific concerns.
- **Files to modify:**
  - `backend/src/main/java/com/worshiproom/health/HealthController.java` (extend)
  - `application-prod.properties` (expose actuator liveness/readiness)
  - `backend/docs/runbook-deployment.md` (document which endpoint to use for which purpose)

### Spec 1.10k — HikariCP Connection Pool Tuning

- **ID:** `round3-phase01-spec10k-hikaricp-tuning`
- **Size:** S
- **Risk:** Low
- **Prerequisites:** 1.2 (PostgreSQL), 1.10 (Phase 1 cutover)
- **Goal:** Set sensible HikariCP defaults so the backend doesn't exhaust connections under load or starve queries by being too conservative.
- **Approach:** Configure in `application-prod.properties`: `spring.datasource.hikari.maximum-pool-size=10` (tunable via env var `DB_POOL_MAX`), `spring.datasource.hikari.minimum-idle=2`, `spring.datasource.hikari.connection-timeout=30000`, `spring.datasource.hikari.idle-timeout=600000`, `spring.datasource.hikari.max-lifetime=1800000`, `spring.datasource.hikari.leak-detection-threshold=60000`. Dev profile uses lower limits to catch pool leaks earlier. Add integration test that spawns 15 concurrent requests against a pool of 5 and verifies queueing works (no 500s, no leaks).
- **Files to modify:** `application-prod.properties`, `application-dev.properties`, add integration test.

### Spec 1.10l — Playwright E2E Test Infrastructure & CI Wiring

- **ID:** `round3-phase01-spec10l-playwright-e2e`
- **Size:** M
- **Risk:** Low (but referenced throughout — finally authoring it)
- **Prerequisites:** 1.10 (Phase 1 cutover)
- **Goal:** Stand up the Playwright E2E infrastructure the `/verify-with-playwright` skill and Rule 17 cutover specs already assume exists. Wire into CI.
- **Approach:** Install `@playwright/test` in frontend. Create `frontend/playwright.config.ts` with three projects: desktop (1440x900), tablet (768x1024), mobile (375x667). Test base URL pulls from env (`PLAYWRIGHT_BASE_URL`, defaults to `http://localhost:5173`). Global setup spins up backend + frontend + PostgreSQL via docker-compose before tests. Global teardown stops services. Add `@axe-core/playwright` for accessibility smoke tests used by Rule 17. First smoke test: `frontend/tests/e2e/smoke.spec.ts` verifies the homepage loads at each viewport without console errors. CI: add `.github/workflows/playwright.yml` running on every PR, uploading HTML report + axe JSON artifacts.
- **Files to create:**
  - `frontend/playwright.config.ts`
  - `frontend/tests/e2e/smoke.spec.ts`
  - `frontend/tests/e2e/fixtures/setup.ts` (dev auth cookies, seed data helpers)
  - `.github/workflows/playwright.yml`
  - `frontend/docs/playwright-cookbook.md`
- **Files to modify:**
  - `frontend/package.json` (scripts, deps)
  - `.env.example` (document PLAYWRIGHT_* env vars)

### Spec 1.10m — Community Guidelines Document

- **ID:** `round3-phase01-spec10m-community-guidelines`
- **Size:** S
- **Risk:** Low
- **Prerequisites:** 1.10f (Terms of Service)
- **Goal:** Author a user-facing Community Guidelines document at `/community-guidelines`, referenced from Terms of Service, moderation action copy, and onboarding.
- **Approach:** Eric-authored prose at `frontend/src/content/community-guidelines.md` describing the community's norms: (1) What belongs on the Prayer Wall (real requests, real testimonies, real questions — no spam, no proselytizing other users' faith journeys, no doctrinal arguments). (2) What doesn't (harassment, doxxing, impersonation, medical-advice-posing-as-support, content that endangers minors). (3) How moderation works (report flow, trust levels, appeal process). (4) Values: dignity before efficiency, vulnerability is protected, grief gets stillness. (5) Plain-English version-controlled (`community_guidelines_version`). Page renders via `CommunityGuidelinesPage.tsx` with a version banner. ToS links to it in the "Your responsibilities" section.
- **Files to create:**
  - `frontend/src/content/community-guidelines.md`
  - `frontend/src/pages/CommunityGuidelinesPage.tsx`
- **Files to modify:**
  - `frontend/src/App.tsx` (add route)
  - Terms of Service page (add link)
  - Registration flow (link near "agree to ToS")

### Spec 2.5.6 — Block User Feature

- **ID:** `round3-phase02-5-spec06-block-user`
- **Risk:** Medium (multiple features reference blocking; must cascade correctly)
- **Size:** M
- **Prerequisites:** 2.5.5 (Phase 2.5 Cutover — friends backend live)
- **Goal:** User can block another user. Blocked user's posts, comments, reactions, and presence disappear for the blocker. Blocker is invisible to the blocked user in lists and search. Blocking also removes any friend relationship.
- **Approach:** New `user_blocks` table (`blocker_id`, `blocked_id`, `created_at`, `reason_text` nullable). Blocking cascades: delete any `friend_relationships` rows between the two users; queue a cache-invalidation for Intercessor Timeline (Spec 6.5), Privacy Tiers (Spec 7.7), and the feed. Endpoints: `POST /api/v1/blocks`, `DELETE /api/v1/blocks/{blocked_user_id}`, `GET /api/v1/blocks` (list my blocks). Frontend adds Block/Unblock to PrayerCard overflow menu, to profile page header, to comment overflow menu. Blocks are never notified to the blocked user (zero-feedback design). Rate limit: 10 blocks/hour/user.
- **Files to create:**
  - Liquibase changeset for `user_blocks` table (indexes on both columns)
  - `BlockController.java`, `BlockService.java`, `Block.java` entity, `BlockRepository.java`
  - Frontend `useBlockUser` hook, Block menu items
  - Integration tests including cascade behavior
- **Files to modify:**
  - openapi.yaml
  - `FeedService.java` (filter blocked users from reads — both directions)
  - `FriendsService.java` (on block, remove friendship)
  - `IntercessorTimelineService.java` (Spec 6.5 — invalidate cache)
  - `PrayerCard.tsx` (overflow menu)
  - `ProfilePageHeader.tsx` (once Phase 8 lands, add Block button)

### Spec 2.5.7 — Mute User Feature

- **ID:** `round3-phase02-5-spec07-mute-user`
- **Size:** S
- **Risk:** Low
- **Prerequisites:** 2.5.5
- **Goal:** User can mute another user. Muted user's posts don't appear in the blocker's feed, but the blocker is still visible to the muted user (asymmetric — softer than block). Mute is reversible.
- **Approach:** Similar table `user_mutes` (`muter_id`, `muted_id`, `created_at`). Only filters feed reads; does NOT cascade to friendship, privacy, notifications about the muted user's activity on the muter's content. Endpoints: POST/DELETE/GET `/api/v1/mutes`.
- **Files to create:** similar to Block but simpler (no cascade).
- **Files to modify:** `FeedService.java` to apply mute filter on reads.

### Spec 10.10b — Admin Audit Log Viewer

- **ID:** `round3-phase10-spec10b-admin-audit-log-viewer`
- **Size:** M
- **Risk:** Low
- **Prerequisites:** 10.10 (Admin Foundation — `admin_audit_log` table already exists)
- **Goal:** Admin UI to view the audit log created by Spec 10.10. Backend endpoint + admin-only frontend page.
- **Approach:** `GET /api/v1/admin/audit-log` returns paginated entries with filters (admin_user_id, action, target_type, date range). Spring Security `@PreAuthorize("hasRole('ADMIN')")`. Frontend `/admin/audit-log` page (admin-only route) with a table, filter sidebar, date-range picker, CSV export. Every action displays the moderator_note (50+ char requirement from Spec 10.7b). Page itself is auditable — viewing the audit log creates a `viewed_audit_log` entry (meta-audit).
- **Files to create:**
  - `AdminAuditController.java`, `AdminAuditService.java`, DTOs
  - `frontend/src/pages/admin/AuditLogPage.tsx`
  - Admin route guard if not already in place
- **Files to modify:** openapi.yaml, App.tsx routes.

### Spec 16.1b — Offline Banner UI

- **ID:** `round3-phase16-spec01b-offline-banner`
- **Size:** S
- **Risk:** Low
- **Prerequisites:** 16.1 (Offline Cache for Recent Feed)
- **Goal:** User-visible indicator when the app is operating offline. Gentle, anti-pressure copy.
- **Approach:** Hook `useOnlineStatus` listening to `online`/`offline` events + periodic `/api/v1/health/live` ping (every 30s, only when `navigator.onLine` is true — catches captive-portal cases). Banner component slides in at top of viewport when offline, with message "You're offline. Viewing cached content." When back online, banner transitions to success state ("Reconnected") for 3 seconds then disappears. Queued posts from Spec 16.2 surface here as "3 posts waiting to send." Respects `prefers-reduced-motion`.
- **Files to create:**
  - `frontend/src/hooks/useOnlineStatus.ts`
  - `frontend/src/components/shell/OfflineBanner.tsx`
  - Tests (mock `navigator.onLine`)
- **Files to modify:** `frontend/src/components/shell/AppShell.tsx` (mount banner), `11-local-storage-keys.md` (if any keys are added).

### Spec 16.2b — React Error Boundary Strategy

- **ID:** `round3-phase16-spec02b-error-boundaries`
- **Size:** M
- **Risk:** Low
- **Prerequisites:** 1.10d (Sentry) — boundaries report to Sentry
- **Goal:** Structured approach to React error boundaries so a crashed component doesn't break the whole app. Every major feature has its own boundary with an appropriate fallback.
- **Approach:** Create `frontend/src/components/errors/FeatureErrorBoundary.tsx` as the canonical boundary. Takes `featureName` prop (for Sentry tagging) and optional `fallback` render prop. Wraps each feature mount point in `App.tsx` and each lazy-loaded page. Fallback copy is anti-pressure: "This part of the app hit a snag. We've logged it. Try refreshing, or head to the Daily Hub." — never "Something went wrong!" with an exclamation point. Integration with Sentry: `Sentry.ErrorBoundary` wrapper under the hood, tagged by featureName, with `beforeSend` PII scrubber active. For Prayer Wall specifically (highest-stakes feature), boundary fallback offers a "Refresh this section" button that re-mounts the subtree without reloading the whole page. Tests verify the boundary catches a deliberate throw and renders the fallback without crashing siblings.
- **Files to create:**
  - `frontend/src/components/errors/FeatureErrorBoundary.tsx`
  - `frontend/src/components/errors/__tests__/FeatureErrorBoundary.test.tsx`
- **Files to modify:**
  - `frontend/src/App.tsx` (wrap each route's element)
  - Any page with lazy-loaded subtrees (Bible reader, Prayer Wall, Music)
  - Tie-in with `09-design-system.md` (§ Error States)

---

---

_End of Worship Room — Phase 3: Forums Wave Master Plan v2.9_
