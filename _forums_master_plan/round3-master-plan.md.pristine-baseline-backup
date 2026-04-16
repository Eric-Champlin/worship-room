# Worship Room — Phase 3: Forums Wave Master Plan

**Version:** 2.0
**Date:** April 14, 2026
**Supersedes:** v1.0 (April 14, 2026)
**Scope:** Prayer Wall + User Profiles + Activity Engine backend integration. First wave of CLAUDE.md's official Phase 3 (Auth & Backend Wiring). Other features (Daily Hub, Bible, Music, Grow, Local Support) remain on localStorage and migrate in later waves.

**Author context:** Drafted by Claude in conversation with Eric Champlin, based on three Prayer Wall recons, a Profile/Dashboard recon, two rounds of competitor research, and a comprehensive codebase audit (CLAUDE.md, all 11 rule files in `.claude/rules/`, the actual `usePrayerReactions.ts` / `AuthContext.tsx` / `PrayerCard.tsx` / `InteractionBar.tsx` / `prayer-wall-mock-data.ts` / `types/prayer-wall.ts`, the existing `backend/` skeleton, and the existing `prayer-wall-redesign.md` / `prayer-wall-question-of-day.md` / `prayer-wall-category-filter.md` / `prayer-wall-category-layout.md` / `friends-system.md` / `notification-system.md` / `bb45-verse-memorization-deck.md` specs), and 16 architectural decisions made by Eric.

---

## How to Use This Document

**If you are Eric:** This is the single reference document for the entire Forums Wave effort. Skim the Quick Reference section first to lock in the shape — it is deliberately short. Then if you want to push back on whole-project decisions before specs land, read the Architectural Foundation section. The Phase sections are a menu, not required reading — consult them when you want to know what is coming or what is done. Treat this as a living document: when something changes mid-wave, update this file in your repo and the Change Log at the bottom.

**If you are Claude Code:** Before executing any Forums Wave spec, load this document and read at minimum the **Quick Reference** section at the top. It contains the architectural decisions, naming conventions, API contract conventions, and BB-45 anti-pattern enforcement that every spec assumes. Read the relevant **Phase** section only if your spec sits inside that phase and you need more context. Do NOT attempt to hold the entire document in working memory — use the Quick Reference as your primary anchor and consult phase-specific sections as needed. **Critical rules:** never commit, never push, never run `git checkout` — Eric handles all git operations manually.

**For both:** This is a living document. If any decision in here changes mid-wave, the plan gets updated and the file in the repo gets replaced with the new version. Major changes are recorded in the Change Log at the bottom.

---

## Quick Reference

> **This section is deliberately short so Claude Code can load it cheaply at the start of every spec execution. Everything in here is authoritative; everything in the rest of the document elaborates on what is already stated here.**

### What the Forums Wave Is

The Forums Wave is the first slice of CLAUDE.md's official Phase 3 (Auth & Backend Wiring). It revamps the Prayer Wall and unified user Profiles, ships the first real backend integration (Spring Boot + PostgreSQL + Liquibase + JWT auth), migrates the activity engine and friends system to the backend in dual-write mode, expands Prayer Wall to five post types, layers in twelve hero features, weaves Prayer Wall into Bible / Music / Daily Hub / Local Support, and adds moderation / community-warmth / search / notifications / personal analytics / onboarding / email-push / PWA / accessibility / performance from the start. Approximately 120 specs across 17 phases, executed in dependency order. Other features (Daily Hub data, Bible data, Music data) remain on localStorage during this wave and migrate in later waves of Phase 3.

### The Seventeen Phases

| #   | Phase                                     | Purpose                                                                                                                                                                                         | Approx. specs |
| --- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| 0   | Backend Foundation Learning               | Teaching document Eric reads before any backend work                                                                                                                                            | 1             |
| 0.5 | Reaction Persistence Quick Win            | Convert `usePrayerReactions` to a reactive store (no backend needed). Ships day 1.                                                                                                              | 1             |
| 1   | Backend Foundation                        | Audit existing skeleton, rename group ID, add Liquibase / Spring Security + JWT / OpenAPI / Testcontainers, end-to-end roundtrip                                                                | 11            |
| 2   | Activity Engine Migration (Dual-Write)    | Points / streaks / badges / grace / grief pause on backend with dual-write strategy                                                                                                             | 9             |
| 2.5 | Friends Backend Migration                 | `wr_friends` data and friend request flow to backend                                                                                                                                            | 5             |
| 3   | Prayer Wall Data Migration                | Posts / comments / reactions / bookmarks / reports / QOTD on backend, frontend service swap, **fixes the reaction bug for cross-device**                                                        | 12            |
| 4   | Post Type Expansion                       | Prayer Request polish, Testimony, Question, Devotional Discussion, Encouragement, Composer Chooser, Room Selector                                                                               | 8             |
| 5   | Visual Migration to Round 2 Brand         | FrostedCard, HorizonGlow, 2-line headings, animation tokens, ring colors                                                                                                                        | 5             |
| 6   | Hero Features                             | Prayer Receipt, Quick Lift, Night Mode, 3am Watch, Intercessor Timeline, Answered Wall, Shareable Testimony Cards, Verse-Finds-You                                                              | 12            |
| 7   | Cross-Feature Integration                 | Bible ↔ Wall, Music ↔ Wall, Daily Hub rituals, Privacy tiers, Local Support bridges                                                                                                             | 8             |
| 8   | Unified Profile System                    | Username, URL merge to `/u/:username`, Summary/Activity tabs, name canonicalization, customization                                                                                              | 9             |
| 9   | Ritual & Time Awareness                   | Liturgical theming, Sunday Service Sync, time-of-day copy, Candle Mode                                                                                                                          | 5             |
| 10  | Community Warmth & Moderation             | First Time badges, Welcomer role, presence cues, Discourse-style trust levels, 7 Cups three-tier escalation, automated flagging, moderation queue, appeal flow, rate limiting, admin foundation | 10            |
| 11  | Search & Discovery                        | Full-text post search, find by author, find by verse reference, find by date                                                                                                                    | 4             |
| 12  | Notification Taxonomy                     | Full notification type catalog (8 new types beyond Prayer Receipt), notification preferences                                                                                                    | 5             |
| 13  | Personal Analytics & Insights             | Year-in-review, prayer journey insights, intercession patterns                                                                                                                                  | 4             |
| 14  | Onboarding & Empty States                 | First-visit walkthrough, suggested first action, find-your-people friend suggestions, warm empty states                                                                                         | 4             |
| 15  | Email & Push Notifications                | SMTP for comment replies (digest-style), push notification wiring (extends BB-41)                                                                                                               | 4             |
| 16  | PWA, Offline, Performance & Accessibility | Cached recent feed, queued posts, offline indicator, Lighthouse 90+/95+ for Prayer Wall, BB-35-style accessibility audit                                                                        | 4             |

**Total:** approximately 120 specs.

### Architectural Decisions (the TL;DR)

These are the whole-project decisions that every spec assumes. Full rationale lives in the Architectural Foundation section below.

1. **Tech stack matches CLAUDE.md exactly.** Maven + Spring Boot 3.5.11 + Java 21 + Spring Data JPA + Spring Security + JWT + Liquibase + PostgreSQL + Testcontainers + JUnit 5. NOT Gradle, NOT Spring Data JDBC, NOT Firebase Auth, NOT `application.yml` (use `application.properties` to match what is already in the repo).

2. **The backend skeleton already exists.** Phase 1 audits and extends `backend/` rather than creating it from scratch. Existing files: `WorshipRoomApplication.java`, `CorsConfig.java`, `ApiController.java` (with `/api/health` and `/api/hello`), `Dockerfile`, `pom.xml` (Spring Boot 3.5.11). Group ID is currently `com.example.worshiproom` — Phase 1 renames it to `com.worshiproom` for production identity.

3. **Auth is JWT, not Firebase.** Spring Security + JWT + BCrypt + 1-hour tokens + 12-char password minimum + anti-enumeration on registration + rate-limited login. The existing `AuthContext.tsx` keeps its `useAuth()` interface unchanged for the 121 consumers — only the internal implementation swaps. The `login(name)` signature changes to `login(email, password)` and ~5-10 call sites (the AuthModal, dev login button, welcome wizard) need updates. The 121 consumers that only read `user.name` and `user.id` do NOT change.

4. **Canonical user model lives on the backend.** One `users` table is the source of truth, with `first_name`, `last_name`, `display_name_preference` (enum), `custom_display_name`, and the derived `display_name` computed server-side. The frontend's four-way naming inconsistency (auth context, PrayerWallUser, FriendProfile, leaderboard) is fixed by centralizing resolution. The existing `users` schema in `.claude/rules/05-database.md` is the starting point and gets extended in Phase 1.

5. **One `posts` table holds all five post types**, discriminated by a `post_type` enum column. Prayer Request, Testimony, Question, Devotional Discussion, Encouragement. Shared infrastructure for comments, reactions, bookmarks, reports, moderation. Type-specific behavior lives in nullable columns. **This deliberately diverges from the `prayer_requests` / `prayer_replies` / `prayer_bookmarks` / `prayer_reports` table names mentioned in `prayer-wall-redesign.md`** — that older spec was written before post type expansion was on the table. The unified `posts` table is the new contract; the old spec is superseded.

6. **The activity engine migrates in dual-write mode.** `recordActivity()` calls write to BOTH localStorage (existing `wr_daily_activities`, `wr_faith_points`, `wr_streak`, `wr_badges`) AND the backend (`POST /api/v1/activity`). localStorage is the source of truth for reads during this wave. The backend gets populated as a shadow copy that future waves can promote to the source of truth. Blast radius is minimized — if the backend hiccups, every feature still works from localStorage.

7. **Friends system migrates to the backend in Phase 2.5** (between activity engine and Prayer Wall). Same dual-write strategy. The `wr_friends` data structure is preserved on the frontend; the backend gets a copy. Friends backend is required so Phase 7's "friends pin to top of Prayer Wall feed" can work cross-device.

8. **The reaction bug is fixed in Phase 0.5 BEFORE backend work starts.** Convert `usePrayerReactions` from `useState(getMockReactions())` to a reactive store with `useSyncExternalStore` (Pattern A from `.claude/rules/11-local-storage-keys.md`), persisting to a new `wr_prayer_reactions` localStorage key. Cross-page consistency works immediately. When Phase 3 lands the backend, the localStorage adapter swaps under the same hook signature with zero changes to consumer components. **This is a one-day quick win that removes the worst current Prayer Wall bug while the bigger phases are in flight.**

9. **Profile pages merge at `/u/:username`** with 301 redirects from `/profile/:userId` and `/prayer-wall/user/:id`. Discourse-inspired Summary tab + Activity tabs (Prayer Wall, Growth, Bible, Friends). Three-tier privacy (private / friends / public) per section. Username system is new (Phase 8.1) and replaces UUID-based URLs.

10. **Moderation is built in from day one, not bolted on later.** Phase 10 lands automated phrase flagging (extending the existing `containsCrisisKeyword` system), Discourse-style trust levels, 7 Cups three-tier escalation (green / yellow / red), peer moderator queue, and admin foundation (`is_admin` column, `admin_audit_log` table, helper). The actual admin UI is deferred to a future wave — Phase 10 just builds the column and audit log so future admin specs are not blocked.

11. **Save-to-prayer-list is a separate feature from Prayer Wall bookmark.** The existing `Save` button on `InteractionBar` adds a Prayer Wall post to the user's personal `/my-prayers` page (a prayer reminder system). The `Bookmark` button adds it to the user's Prayer Wall bookmarks (visible in PrayerWallDashboard's Bookmarks tab). These are two different features and the Forums Wave preserves both. v1 conflated them — v2 documents them as distinct.

12. **The 10 existing categories are preserved.** Health, Mental Health, Family, Work, Grief, Gratitude, Praise, Relationships, Other, Discussion. Categories are NOT user-creatable. The `Discussion` category is reserved for QOTD responses. The `Mental Health` category was added in `prayer-wall-category-layout.md` and v1 missed it entirely.

13. **QOTD already exists and gets MIGRATED, not built.** The 60 existing questions across 6 themes (faith_journey, practical, reflective, encouraging, community, seasonal) move to a backend table in Phase 3. The day-of-year modulo rotation logic moves to the backend. Frontend reads "today's question" from the API.

14. **Reactive store pattern (BB-45) is mandatory for any new state in Prayer Wall.** New stores prefer Pattern A (standalone hook with `useSyncExternalStore`) per `.claude/rules/11-local-storage-keys.md`. Tests for reactive store consumers MUST verify subscription behavior (mutate the store after mount, assert re-render), not just initial render. The BB-45 anti-pattern (snapshot-without-subscribe) is forbidden in all new code.

15. **API contract follows project standards.** Success: `{ data, meta: { requestId } }`. Error: `{ code, message, requestId, timestamp }`. Headers: `X-Request-Id`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, `Retry-After` on 429s. Pagination: `?page=1&limit=20`. Versioned as `/api/v1/` from day one. Generated TypeScript types from OpenAPI spec, never hand-written. Full conventions in `.claude/rules/03-backend-standards.md`.

16. **Existing components are extended, not rebuilt.** `PrayerCard`, `InteractionBar`, `InlineComposer`, `CommentsSection`, `CommentInput`, `CommentItem`, `Avatar`, `CategoryBadge`, `CategoryFilterBar`, `AnsweredBadge`, `MarkAsAnsweredForm`, `ReportDialog`, `DeletePrayerDialog`, `ShareDropdown`, `AuthModal`, `AuthModalProvider`, `PageShell`, `PrayerWallHero`, `QotdBadge`, `QotdComposer`, `QuestionOfTheDay`, `SaveToPrayersForm` — all already exist in `frontend/src/components/prayer-wall/`. Specs that touch these components extend them rather than replacing them. New post types (Phase 4) extend the existing card and composer patterns rather than creating parallel components.

### Naming Conventions

**Spec files:** `round3-phase{N}-spec{NN}-{kebab-case-title}.md`. Phases 0-16 (single digit), specs 00-99 (two digits). Insert phases (0.5, 2.5) use `phase00-5` and `phase02-5`. Example: `round3-phase03-spec04-prayer-wall-read-endpoints.md`. Alphabetical filename sorting roughly equals execution order. Specs live in `_specs/` alongside the existing 200+ specs.

**Backend tables:** `snake_case`, plural. `users`, `posts`, `post_comments`, `post_reactions`, `post_bookmarks`, `post_reports`, `activity_log`, `user_badges`, `faith_points`, `streak_state`, `friend_relationships`, `friend_requests`, `notifications_inbox`. Boolean columns prefixed `is_` (`is_anonymous`, `is_answered`, `is_admin`, `is_deleted`). Timestamp columns suffixed `_at` (`created_at`, `last_activity_at`, `answered_at`). Foreign keys suffixed `_id`.

**Backend packages:** `com.worshiproom.{feature}`. Examples: `com.worshiproom.auth`, `com.worshiproom.user`, `com.worshiproom.post`, `com.worshiproom.activity`, `com.worshiproom.moderation`. Phase 1 includes a rename from existing `com.example.worshiproom` — done with the IntelliJ refactor tool to keep tests/imports correct.

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

> **Before executing this spec:** Load `/Users/Eric/worship-room/_forums_master_plan/round3-master-plan.md` and read the Quick Reference section at the top. If this spec touches phase-specific decisions, consult the Phase {N} section as well. Never commit, never push, never `git checkout` — Eric handles all git operations manually.

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

4. **Use TypeScript types generated from OpenAPI**, not hand-written API response types. The OpenAPI spec at `backend/api/openapi.yaml` is the contract. The TypeScript types are derivatives in `frontend/src/types/api/generated.ts`, regenerated via `npm run types:generate`. Hand-editing the generated file is forbidden.

5. **All user-facing strings go in a Copy Deck section of the spec**, then into a constants file (e.g., `frontend/src/constants/prayer-wall-copy.ts`). No inline hardcoded strings in components. Brand voice governs all copy. Every string in a spec's Copy Deck must pass the pastor's wife test.

6. **Tests are mandatory for new functionality.** Backend: JUnit 5 + Spring Boot Test + Testcontainers for integration tests, unit tests for pure logic. Frontend: Vitest + React Testing Library, plus reactive store subscription tests for any new store consumers (per BB-45 anti-pattern). Playwright for end-to-end verification. Eric can override the test requirement on a per-spec basis only when a spec is purely refactoring with no behavior change, and that override must be explicit in the spec's Out-of-Band Notes section.

7. **No localStorage keys created or modified without documenting them in `.claude/rules/11-local-storage-keys.md`.** New reactive stores must specify their store module path and subscription pattern (Pattern A or Pattern B) in the same file. A spec that adds a localStorage key without updating the inventory is incomplete and will fail code review.

8. **BB-45 anti-pattern is forbidden in all new code.** Components reading from a reactive store must use the store's hook (`useSyncExternalStore` Pattern A preferred for new code, Pattern B inline subscribe acceptable for legacy compatibility). Tests for reactive store consumers must mutate the store after mount and verify re-render. Mocking the store entirely bypasses the subscription mechanism — forbidden. The original BB-45 implementation surfaced this anti-pattern as a real correctness bug and it now has zero tolerance.

9. **Accessibility is not optional.** Keyboard navigation works for every interactive element. ARIA labels on icon-only buttons and any control whose accessible name is not visible. Focus management on modals, drawers, and inline expansions. `prefers-reduced-motion` honored on every animation. Color contrast meets WCAG AA (4.5:1 normal text, 3:1 large text). Touch targets minimum 44x44 px on mobile. Lighthouse Accessibility 95+ on every Prayer Wall page (BB-35 baseline).

10. **Performance is not optional.** Lighthouse Performance 90+, Best Practices 90+, SEO 90+ on every Prayer Wall page (BB-36 baseline). Animation durations and easings imported from `frontend/src/constants/animation.ts` (BB-33), never hardcoded. No `200ms` strings, no `cubic-bezier(...)` strings, no inline `transition: all`. Bundle size tracked via `frontend/scripts/measure-bundle.mjs` — Forums Wave additions must not regress the main bundle by more than 50 KB without justification in the spec.

11. **Brand voice mandatory for all copy.** Specs that introduce copy must show the copy in context (Copy Deck section) and it must pass the pastor's wife test. Specifically: no exclamation points near vulnerability content, no emoji except in joyful celebration moments, no therapy-app jargon, no hype-language, no urgency cues on the Prayer Wall, scripture as gift not decoration, copy near grief gets stillness and whitespace.

12. **Anti-pressure design.** Engagement features, gamification additions, and personal data displays must include an Anti-Pressure Design Decisions section in the spec with non-negotiables. The Prayer Wall is a vulnerability space — never punish absence, never gamify intercession in shame-inducing ways, never use comparison-based language ("you have prayed less than 80% of users"), never use false-urgency ("3 people need prayer right now — be one"), never display streaks-as-shame.

13. **Crisis detection runs on the backend.** The existing frontend `containsCrisisKeyword()` is a courtesy fast-path that surfaces the crisis banner immediately for fast feedback. The authoritative crisis check happens server-side on post and comment creation per `.claude/rules/01-ai-safety.md` — backend uses an LLM-based classifier (with keyword fallback) and fail-closed semantics in the UI. New post/comment write endpoints MUST run the backend crisis check and MUST set `posts.crisis_flag = true` when triggered. Admin notification follows fail-open semantics (do not auto-flag content unless classification parsing succeeds or a clear keyword match exists) per the rule file.

14. **Plain text only for user-generated content.** No HTML, no Markdown, no `dangerouslySetInnerHTML`. Backend defensively strips `<...>` tags on input (belt and suspenders). Frontend renders with `white-space: pre-wrap`. React's default escaping handles XSS prevention. This applies to prayer post content, comments, bios, custom display names, and any other user-supplied text. Per `.claude/rules/02-security.md`.

15. **Rate limiting on all write endpoints.** Defaults from `.claude/rules/02-security.md`: 5 prayer posts per day per user, 20 AI requests per hour per user. Configurable via env vars (`RATE_LIMIT_PRAYER_POSTS_PER_DAY`, `RATE_LIMIT_AI_REQUESTS_PER_HOUR`). Spring Security + in-memory cache for dev, Redis for production. Rate limit headers on every response (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`). `Retry-After` header on 429 responses. Anti-enumeration on registration (existing email returns same response as new email).

16. **Respect existing patterns.** Existing Prayer Wall components (PrayerCard, InteractionBar, InlineComposer, CommentsSection, etc.) are extended, not rebuilt. Existing localStorage keys (`wr_friends`, `wr_faith_points`, `wr_streak`, `wr_badges`, `wr_notifications`) are migrated, not reinvented. Existing UX flows from the prayer-wall-redesign / category-filter / category-layout / question-of-day specs are preserved unless this Master Plan explicitly supersedes them. When in doubt, ask Eric whether a deviation is intentional.

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
- 🆕 Spring Security dependency and a `SecurityConfig` class
- 🆕 JJWT (JSON Web Token) library for token signing/parsing
- 🆕 BCrypt password encoder bean
- 🆕 Springdoc OpenAPI dependency and `openapi.yaml` spec file
- 🆕 Testcontainers dependency and an `AbstractIntegrationTest` base class
- 🆕 First Liquibase changeset: `users` table (extending the schema in `.claude/rules/05-database.md`)
- 🆕 First real auth endpoints: `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `GET /api/v1/users/me`
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

### Decision 5: Activity Engine Migrates in Dual-Write Mode

**The problem.** Every Prayer Wall action calls `recordActivity('prayerWall')`, which writes to `wr_daily_activities`, `wr_faith_points`, `wr_streak`, and potentially `wr_badges`. These four localStorage keys are shared infrastructure that every feature in the app (Daily Hub, Bible, Meditate, etc.) writes to. If Prayer Wall data lives on the backend but the activity engine stays on localStorage, every Prayer Wall write triggers a half-backend / half-local state that is impossible to keep consistent.

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

Both the frontend (existing `services/`) and the backend ports of the calculation logic must produce identical results. A drift-detection test runs both implementations against shared test cases and asserts parity. When they disagree, the test fails loudly.

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
- The 121 consumers of `useAuth()` that only read `user.name` and `user.id` do NOT change. The ~5-10 callers of `login(name)` are updated to `login(email, password)` — exact list in Phase 1 Spec 1.9.

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

**The bug.** The Prayer Wall reaction state currently lives in `usePrayerReactions.ts` as `useState(getMockReactions())`. Each component that calls the hook gets its own copy. The four pages (PrayerWall, PrayerWallDashboard, PrayerDetail, PrayerWallProfile) each instantiate the hook independently. Tapping "praying" on the feed mutates only the feed page's state. Navigating to the detail page creates a new state. The reaction is lost. **This is exactly the BB-45 anti-pattern documented in `.claude/rules/06-testing.md` and `.claude/rules/11-local-storage-keys.md`.**

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
  to_user_id       UUID NOT NULL REFERENCES users(id)
  status           VARCHAR(20) NOT NULL  -- 'pending', 'accepted', 'declined', 'cancelled'
  message          TEXT NULL
  created_at       TIMESTAMP NOT NULL DEFAULT NOW()
  responded_at     TIMESTAMP NULL
  UNIQUE (from_user_id, to_user_id)
```

**The mutual friendship rule:** When a request is accepted, two rows are inserted into `friend_relationships` (A→B and B→A). Block is unidirectional (A blocks B inserts one row with `status='blocked'` from A to B). Querying "is X a friend of Y?" checks for an `active` row from Y to X.

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

**Delivery:** This document is delivered as a standalone markdown file (`spec-00-backend-foundation-learning.md` in `_specs/`) that Eric reads once. It is not a CC execution spec. Eric reads, digests, asks questions in chat if anything is unclear, and then we move into Phase 1. CC is told (in the spec header) that this is a reading document and not to attempt execution.

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

- Backend group ID renamed from `com.example.worshiproom` to `com.worshiproom`
- `docker compose up -d` starts a local PostgreSQL container alongside the existing backend/frontend services
- `./mvnw spring-boot:run` starts the backend on `localhost:8080`
- The frontend at `localhost:5173` can register a real user via the AuthModal
- The frontend can log in with that user via the AuthModal
- The frontend makes an authenticated `GET /api/v1/users/me` request and the response confirms both the backend is alive and the JWT validated correctly
- A Testcontainers integration test runs the full register → login → /me flow in CI
- OpenAPI spec is committed at `backend/api/openapi.yaml`, types are generated to `frontend/src/types/api/generated.ts`, and the frontend imports the generated types for the auth endpoints
- Liquibase has changesets for: users table creation, username column addition (placeholder for Phase 8)
- The `wr_auth_simulated` flag is gone; the AuthContext uses real JWT auth
- The 121 consumers of `useAuth()` are unchanged; the ~5-10 callers of `login(name)` are updated to `login(email, password)`
- A deployment-target decision spec (Spec 1.10b) is delivered but not yet acted on

### Spec 1.1 — Audit and Rename Backend Skeleton

- **ID:** `round3-phase01-spec01-backend-skeleton-audit`
- **Size:** S
- **Risk:** Low
- **Prerequisites:** Phase 0 read
- **Goal:** Audit the existing `backend/` folder, rename the group ID from `com.example.worshiproom` to `com.worshiproom`, move existing endpoints under `/api/v1/`, and document the current state in `backend/README.md`.

**Approach:** Open the project in IntelliJ. Use the Refactor → Rename Package operation to rename `com.example.worshiproom` to `com.worshiproom` (this updates all imports automatically). Update `pom.xml` `groupId`. Update `Dockerfile` if any path references include the old package. Move `/api/health` and `/api/hello` to `/api/v1/health` and `/api/v1/hello` by updating `ApiController.java`'s `@RequestMapping("/api")` to `@RequestMapping("/api/v1")`. Update `docker-compose.yml` healthcheck URL accordingly. Run `./mvnw clean test` to confirm everything still compiles and the existing trivial test passes. Update `backend/README.md` with a brief tour of the project structure as it currently stands.

**Files to modify:**

- `backend/pom.xml` (groupId)
- `backend/src/main/java/com/example/worshiproom/WorshipRoomApplication.java` → `backend/src/main/java/com/worshiproom/WorshipRoomApplication.java` (renamed via IntelliJ refactor)
- `backend/src/main/java/com/example/worshiproom/config/CorsConfig.java` → `backend/src/main/java/com/worshiproom/config/CorsConfig.java`
- `backend/src/main/java/com/example/worshiproom/controller/ApiController.java` → `backend/src/main/java/com/worshiproom/controller/ApiController.java` (also: change `@RequestMapping("/api")` to `@RequestMapping("/api/v1")`)
- `backend/Dockerfile` (no changes expected, but verify)
- `docker-compose.yml` (healthcheck URL: `/api/v1/health` instead of `/actuator/health`)
- `backend/README.md` (project tour)

**Acceptance criteria:**

- [ ] Group ID is `com.worshiproom`
- [ ] Package structure is `com.worshiproom.*` throughout
- [ ] `./mvnw clean test` passes
- [ ] `./mvnw spring-boot:run` starts the backend
- [ ] `curl http://localhost:8080/api/v1/health` returns `{"status":"ok"}`
- [ ] `curl http://localhost:8080/api/v1/hello` returns `{"message":"Hello"}`
- [ ] `docker compose up --build backend` builds and runs successfully
- [ ] Healthcheck in docker-compose passes (uses new URL)
- [ ] README documents the project structure

**Out-of-band notes for Eric:** Use IntelliJ's refactor tool for the rename — never sed-replace package names. The refactor tool updates imports and references automatically; a sed-replace will miss things in unexpected places.

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

### Spec 1.4 — Spring Security and JWT Setup

- **ID:** `round3-phase01-spec04-spring-security-jwt`
- **Size:** L
- **Risk:** Medium (new concept territory but well-documented patterns)
- **Prerequisites:** 1.3
- **Goal:** Add Spring Security and JJWT to the backend. Configure a `JwtAuthenticationFilter` that validates the bearer token and extracts the user ID. Configure `SecurityConfig` to require auth on all `/api/v1/**` routes except `/api/v1/health`, `/api/v1/auth/register`, `/api/v1/auth/login`. Add a BCrypt password encoder bean.

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

- [ ] All five tables created in dev database via `./mvnw spring-boot:run`
- [ ] Each table has correct columns, types, primary keys, foreign keys, indexes
- [ ] `psql \d activity_log` shows the schema correctly
- [ ] Each changeset has a valid rollback block
- [ ] LiquibaseSmokeTest extended to verify all five tables exist
- [ ] Testcontainers integration test confirms migrations apply in test environment

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

- [ ] Every `ActivityType` enum value matches a frontend activity type string-for-string
- [ ] Point values match the frontend constants file value-for-value
- [ ] Level thresholds match the frontend constants file
- [ ] Multiplier logic produces the same tier labels and multipliers as frontend
- [ ] Recording an activity returns `FaithPointsResult` with: points_earned, total_points, current_level, level_up boolean, multiplier_tier
- [ ] At least 20 unit tests cover happy paths, level-up cases, multiplier edge cases, and the activity types most commonly used by Prayer Wall
- [ ] No database calls in unit tests — pure logic only

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

- [ ] Same-day repeat activity does not increment streak
- [ ] Day-over-day activity increments streak
- [ ] One-day gap with grace days remaining consumes a grace day and continues the streak
- [ ] One-day gap with no grace days remaining and no grief pause breaks the streak
- [ ] Active grief pause prevents any streak break
- [ ] Multi-day gap (without grief pause) resets streak to 1
- [ ] Grace days reset on Monday midnight (server time)
- [ ] Longest streak updates whenever current streak exceeds it
- [ ] At least 25 unit tests cover all combinations
- [ ] Repair eligibility flag returned when a single broken day could be repaired

### Spec 2.4 — Badge Eligibility Service (Backend Port)

- **ID:** `round3-phase02-spec04-badge-service`
- **Size:** L
- **Risk:** Medium
- **Prerequisites:** 2.3
- **Goal:** Port badge eligibility logic to a backend `BadgeService`. Same badge IDs, same trigger conditions, same celebration tiers, same display counts.

**Approach:** Read the existing frontend badge catalog from `services/badge-storage.ts` and `constants/badges.ts` (or equivalent). Port the catalog and the eligibility logic. The `checkBadges(userId, context)` method takes a user and a context object (current activity, total points, current streak, intercession count, etc.) and returns the list of newly-earned badges plus any badge whose display count should increment. Idempotent — calling it twice in a row returns no new badges the second time.

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

**Approach:** Two changesets:

- `2026-04-16-001-create-friend-relationships-table.xml`
- `2026-04-16-002-create-friend-requests-table.xml`

Schema matches Decision 8 exactly. Foreign keys to `users.id`. Composite primary key on `friend_relationships`. Unique constraint on `(from_user_id, to_user_id)` in `friend_requests`. Indexes for the most common queries.

**Acceptance criteria:**

- [ ] Both tables created in dev database
- [ ] Foreign keys and unique constraints present
- [ ] `psql \d friend_relationships` and `psql \d friend_requests` show correct schemas
- [ ] LiquibaseSmokeTest extended to verify both tables
- [ ] Testcontainers integration test confirms migrations

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

### Spec 2.5.5 — Phase 2.5 Cutover

- **ID:** `round3-phase02-5-spec05-phase2-5-cutover`
- **Size:** S
- **Risk:** Medium
- **Prerequisites:** 2.5.4
- **Goal:** Flip `VITE_USE_BACKEND_FRIENDS` to `true`. Smoke test the friend flow end-to-end with two seed users.

**Approach:** Set the flag default. Local smoke test: log in as seed user A, send a friend request to seed user B, log out, log in as B, accept the request, verify both `wr_friends` and the backend `friend_relationships` table reflect the friendship. Cutover checklist.

**Acceptance criteria:**

- [ ] Flag default is `true`
- [ ] Manual smoke test passes
- [ ] Backend tables reflect the friendship after the smoke test
- [ ] Cutover checklist committed

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
- `backend/src/main/resources/db/changelog/2026-04-18-001-add-scripture-reference-to-posts.xml`

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

## Phase 6 — Hero Features

> **Phase purpose:** The features that make the Forums Wave feel like a sanctuary instead of a generic forum. Prayer Receipt, Quick Lift, Night Mode, 3am Watch, Intercessor Timeline, Answered Wall, Shareable Testimony Cards, Verse-Finds-You, plus four supporting features. These are the high-leverage emotional moments that competitor forums (CaringBridge, Hallow, YouVersion, Discourse) do not have. Each feature is its own spec.

**What this phase accomplishes:** After Phase 6, a user posting a prayer receives a beautiful confirmation moment with a scripture gift. A user can tap "Quick Lift" on any prayer to send a 30-second silent prayer gesture without typing. Night Mode dims the entire Prayer Wall and softens the language between 9pm and 6am local time. The 3am Watch surfaces Mental Health prayers with extra care during the loneliest hours. Each prayer card shows an intercessor timeline (who prayed and when, in soft type). Answered prayers get their own celebration wall. Testimonies get one-tap shareable cards (PNG via the existing image generation infrastructure). A scripture appears for the user every time they open the Prayer Wall, chosen by emotional context.

**Sequencing notes:** Spec 6.1 (Prayer Receipt) is the highest impact and most visible. Specs 6.2-6.12 can be sequenced flexibly based on emotional priority. Spec 6.12 is the cutover.

### Spec 6.1 — Prayer Receipt

- **ID:** `round3-phase06-spec01-prayer-receipt`
- **Size:** L
- **Risk:** Medium
- **Prerequisites:** Phase 5 complete
- **Goal:** When a user posts a prayer (any post type), instead of a flat success toast, they see a Prayer Receipt — a full-bleed, transient celebration moment with a confirmation message, a gift scripture chosen by emotional context, and a single CTA. Replaces the existing post-submit toast for Prayer Wall posts.

**Approach:** New component `PrayerReceipt.tsx` rendered as an animated overlay after a successful post. Layout: full-bleed dark background with HorizonGlow, large heading ("Your prayer has been heard"), supporting body ("We are holding it with you"), a gift scripture chosen by matching the post's category to a preset scripture set (Mental Health → Psalm 34:18, Health → Isaiah 41:10, Grief → Psalm 23:4, etc.), the scripture displayed in Lora serif with a quiet attribution, and a single "Return to the Wall" button. Auto-dismisses after 8 seconds OR on tap. Plays a soft single-chime sound effect (existing infrastructure). Skip the receipt if the user has disabled celebration moments in settings (anti-pressure default — celebration enabled, but skippable).

**Files to create:**

- `frontend/src/components/prayer-wall/PrayerReceipt.tsx`
- `frontend/src/constants/prayer-receipt-scripture.ts` (category → scripture mapping)
- `frontend/src/components/prayer-wall/__tests__/PrayerReceipt.test.tsx`

**Files to modify:**

- `frontend/src/pages/PrayerWall.tsx` (show receipt after successful post)
- `frontend/src/components/prayer-wall/InlineComposer.tsx` (trigger receipt on success)

**Acceptance criteria:**

- [ ] Posting a prayer of any type triggers the receipt
- [ ] Receipt displays category-appropriate scripture in Lora serif
- [ ] Auto-dismisses after 8 seconds
- [ ] Tap to dismiss earlier
- [ ] Single chime sound (respects sound settings)
- [ ] HorizonGlow ambient backdrop
- [ ] `prefers-reduced-motion` honored — fade only, no slide animations
- [ ] Settings toggle to disable celebration moments works
- [ ] Brand voice review of all copy passes
- [ ] At least 12 component tests
- [ ] Anti-pressure: never displayed twice in a row, never adds urgency, never displays metrics

### Spec 6.2 — Quick Lift

- **ID:** `round3-phase06-spec02-quick-lift`
- **Size:** M
- **Risk:** Low
- **Prerequisites:** 6.1
- **Goal:** A new button on every prayer card alongside the existing Pray button. Tapping Quick Lift starts a 30-second silent timer with a gentle visual (a slowly filling ring). After 30 seconds the user has logged a deep intercession (counts as 2 prayers in the activity engine, with a single special badge after 10 lifts). No typing required. Designed for the moment of "I do not have words but I am here."

**Approach:** New button on `InteractionBar.tsx` next to Pray. Lucide `Hourglass` icon. Tapping opens an inline overlay with a slowly filling ring (30-second animation). Cancellable at any time (tapping the X cancels with no points). Completing the 30 seconds fires `recordActivity('quick_lift')` which earns 2x the standard intercession points. The first 10 quick lifts unlock a "Faithful Watcher" badge. Visual is quiet, sacred — no countdown numbers, no progress bar, just the slowly filling circle.

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
- **Size:** M
- **Risk:** Medium
- **Prerequisites:** 6.3
- **Goal:** Between midnight and 4am local time, the Prayer Wall surfaces a small "3am Watch" section above the feed featuring Mental Health and Grief category posts that have not been prayed for yet today. The framing is "Someone is awake right now and needs to know they are not alone." Designed for the loneliest hours.

**Approach:** New section component `ThreeAmWatch.tsx` that renders only when local time is between midnight and 4am AND the user is logged in. Backend endpoint `GET /api/v1/posts/three-am-watch` returns up to 5 recent Mental Health or Grief posts that have low or zero `praying_count` from today. The component renders these as small mini-cards with a one-tap Quick Lift action. Brand voice: quiet, present, never urgent.

**Files to create:**

- `frontend/src/components/prayer-wall/ThreeAmWatch.tsx`
- `backend/src/main/java/com/worshiproom/post/ThreeAmWatchService.java`

**Files to modify:**

- `backend/src/main/java/com/worshiproom/post/PostController.java` (add three-am-watch endpoint)
- `frontend/src/pages/PrayerWall.tsx` (render three-am-watch when time matches)

**Acceptance criteria:**

- [ ] 3am Watch section only appears between midnight and 4am local time
- [ ] Section shows up to 5 mental health or grief posts with low praying_count
- [ ] Each mini-card has a one-tap Quick Lift action
- [ ] Section hidden if no eligible posts
- [ ] Brand voice review passes
- [ ] At least 8 tests

### Spec 6.5 — Intercessor Timeline

- **ID:** `round3-phase06-spec05-intercessor-timeline`
- **Size:** L
- **Risk:** Medium
- **Prerequisites:** 6.4
- **Goal:** On every prayer card, a small soft-type line below the content showing recent intercessors: "5 people prayed in the last 12 hours." Tapping expands a non-modal scrollable list of names (or "Anonymous") and timestamps. The list is gentle, not gamified — no leaderboards, no comparison, no trophy icons.

**Approach:** Backend endpoint `GET /api/v1/posts/{id}/intercessors` returns up to 50 recent reactions sorted by `created_at DESC` with the reactor's display name (or "Anonymous" if the reactor has set their privacy to anonymous). Frontend component `IntercessorTimeline.tsx` renders the summary line on every card. Tapping expands inline (not a modal) to show the list. Each row: avatar (or Anonymous icon), display name, relative timestamp ("3 hours ago"). Brand voice review of summary line copy is critical — no "X people are praying for this — be one of them" framing.

**Files to create:**

- `frontend/src/components/prayer-wall/IntercessorTimeline.tsx`
- `backend/src/main/java/com/worshiproom/post/IntercessorService.java`
- `backend/src/main/java/com/worshiproom/post/dto/IntercessorResponse.java`

**Files to modify:**

- `backend/src/main/java/com/worshiproom/post/PostController.java` (add endpoint)
- `frontend/src/components/prayer-wall/PrayerCard.tsx` (render the timeline)

**Acceptance criteria:**

- [ ] Summary line visible on every prayer card
- [ ] Tap expands the list inline
- [ ] List shows display names (or "Anonymous")
- [ ] Timestamps in relative format
- [ ] Anonymous reactors are not deanonymized
- [ ] No comparison or leaderboard framing
- [ ] Brand voice review passes
- [ ] At least 10 tests

### Spec 6.6 — Answered Wall

- **ID:** `round3-phase06-spec06-answered-wall`
- **Size:** L
- **Risk:** Medium
- **Prerequisites:** 6.5
- **Goal:** A new tab or section called "Answered" that shows every prayer marked answered, sorted by `answered_at DESC`. Becomes a celebration archive of God's faithfulness. Each card is rendered with the existing AnsweredBadge plus an extra warmth treatment.

**Approach:** New page or sub-tab at `/prayer-wall/answered`. Reuses the existing feed query with a filter `?sort=answered`. Each card shows the original prayer, the answer text, the date answered, and a small "Praising with you" reaction button (separate counter from the main praying count). Brand voice celebration copy at the top: "Stories of God's faithfulness from this community."

**Files to create:**

- `frontend/src/pages/AnsweredWall.tsx`
- `frontend/src/components/prayer-wall/AnsweredCard.tsx` (small extension of PrayerCard)

**Files to modify:**

- Router to add `/prayer-wall/answered` route
- Prayer Wall navigation to surface the Answered tab

**Acceptance criteria:**

- [ ] Answered Wall route works
- [ ] Sorted by `answered_at DESC`
- [ ] Each card shows the answer text
- [ ] "Praising with you" reaction works
- [ ] Brand voice review passes
- [ ] At least 8 tests

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
- [ ] At least 10 tests

### Spec 6.8 — Verse-Finds-You

- **ID:** `round3-phase06-spec08-verse-finds-you`
- **Size:** L
- **Risk:** Medium
- **Prerequisites:** 6.7
- **Goal:** Every time the user opens the Prayer Wall, a small "A scripture for you today" section near the top displays one verse chosen by emotional context (matching the user's recent activity, time of day, current liturgical season). Updates daily, never repeats within 30 days.

**Approach:** Backend endpoint `GET /api/v1/users/me/verse-of-the-day` returns one scripture chosen by a service that considers: user's recent post categories (more grief lately → more Psalm 23-style verses), time of day (morning → encouragement, evening → rest), current liturgical season (Advent, Lent, Easter, Pentecost, Ordinary Time). The verse comes from a curated set of ~200 verses tagged with emotional categories. Daily rotation is per-user (not global). The verse is cached for 24 hours per user. Frontend renders a small `<VerseFindsYou />` component near the top of Prayer Wall.

**Files to create:**

- `backend/src/main/java/com/worshiproom/scripture/VerseFindsYouService.java`
- `backend/src/main/java/com/worshiproom/scripture/VerseRepository.java`
- `backend/src/main/resources/db/changelog/2026-04-19-001-create-verses-table.xml`
- `backend/src/main/resources/db/changelog/contexts/2026-04-19-002-seed-verses.xml`
- `frontend/src/components/prayer-wall/VerseFindsYou.tsx`

**Acceptance criteria:**

- [ ] Endpoint returns one verse per user per day
- [ ] Verse changes day-over-day
- [ ] Never repeats within 30 days
- [ ] Verse selection considers recent activity, time of day, liturgical season
- [ ] Frontend renders the verse with Lora serif
- [ ] Cache is per-user with 24-hour TTL
- [ ] Brand voice review passes
- [ ] At least 12 tests

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

**Approach:** Username is added in three sequential Liquibase changesets to safely populate existing rows without violating constraints. Phase 1.3 deliberately did NOT create this column, so Phase 8.1 introduces it from scratch. Changeset 1 adds the column as `VARCHAR(30) NULL` (no default, no constraint yet). Changeset 2 is a backfill: for each existing user, generate `firstname-l` (e.g., "sarah-j"), with collision handling that appends a number (sarah-j-2, sarah-j-3). Changeset 3 alters the column to `NOT NULL` and adds the `UNIQUE` constraint. Validation rules: 3-30 chars, lowercase letters / numbers / hyphens only, must start with a letter, no consecutive hyphens. New endpoint `PATCH /api/v1/users/me/username` for changing username (rate limited: once per 30 days). Registration flow updated to ask for or auto-suggest a username.

**Files to create:**

- `backend/src/main/resources/db/changelog/2026-04-20-001-add-username-column-nullable.xml`
- `backend/src/main/resources/db/changelog/2026-04-20-002-backfill-usernames.xml`
- `backend/src/main/resources/db/changelog/2026-04-20-003-username-not-null-unique.xml`
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
- [ ] At least 10 tests

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

- **Master Plan (this file)** — `/Users/Eric/worship-room/_forums_master_plan/round3-master-plan.md`
- **Backend** — `/Users/Eric/worship-room/backend/`
- **Backend Liquibase changelogs** — `/Users/Eric/worship-room/backend/src/main/resources/db/changelog/`
- **OpenAPI spec** — `/Users/Eric/worship-room/backend/api/openapi.yaml`
- **Frontend Prayer Wall components** — `/Users/Eric/worship-room/frontend/src/components/prayer-wall/`
- **Frontend Prayer Wall pages** — `/Users/Eric/worship-room/frontend/src/pages/PrayerWall*.tsx`
- **Generated API types** — `/Users/Eric/worship-room/frontend/src/types/api/generated.ts`
- **Reactive store inventory** — `/Users/Eric/worship-room/.claude/rules/11-local-storage-keys.md`
- **Brand voice doctrine** — `/Users/Eric/worship-room/CLAUDE.md` (anti-pressure section)
- **Existing specs** — `/Users/Eric/worship-room/_specs/`
- **Cutover checklists** — `/Users/Eric/worship-room/_plans/forums-wave/`

## Appendix C — Spec Quick Index

A flat list of every spec ID in execution order. Use this when you need to find a spec without scanning the phase headers.

```
round3-phase00-spec01-backend-foundation-learning
round3-phase00-5-spec01-prayer-reactions-reactive-store
round3-phase01-spec01-backend-skeleton-audit
round3-phase01-spec02-postgres-docker
round3-phase01-spec03-liquibase-setup
round3-phase01-spec04-spring-security-jwt
round3-phase01-spec05-auth-endpoints
round3-phase01-spec06-user-me-endpoint
round3-phase01-spec07-testcontainers-setup
round3-phase01-spec08-dev-seed-data
round3-phase01-spec09-frontend-auth-jwt
round3-phase01-spec10-phase1-cutover
round3-phase01-spec10b-deployment-target-decision
round3-phase02-spec01-activity-schema
round3-phase02-spec02-faith-points-service
round3-phase02-spec03-streak-service
round3-phase02-spec04-badge-service
round3-phase02-spec05-activity-counts-service
round3-phase02-spec06-activity-endpoint
round3-phase02-spec07-frontend-activity-dual-write
round3-phase02-spec08-activity-drift-test
round3-phase02-spec09-phase2-cutover
round3-phase02-5-spec01-friends-schema
round3-phase02-5-spec02-friends-service
round3-phase02-5-spec03-friends-endpoints
round3-phase02-5-spec04-frontend-friends-dual-write
round3-phase02-5-spec05-phase2-5-cutover
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
round3-phase04-spec07-composer-chooser
round3-phase04-spec08-room-selector-cutover
round3-phase05-spec01-frosted-card-migration
round3-phase05-spec02-horizon-glow
round3-phase05-spec03-two-line-headings
round3-phase05-spec04-animation-tokens
round3-phase05-spec05-deprecated-pattern-purge
round3-phase06-spec01-prayer-receipt
round3-phase06-spec02-quick-lift
round3-phase06-spec03-night-mode
round3-phase06-spec04-three-am-watch
round3-phase06-spec05-intercessor-timeline
round3-phase06-spec06-answered-wall
round3-phase06-spec07-shareable-testimony-cards
round3-phase06-spec08-verse-finds-you
round3-phase06-spec09-composer-drafts
round3-phase06-spec10-search-by-author
round3-phase06-spec11-sound-effects-polish
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
round3-phase10-spec08-appeal-flow
round3-phase10-spec09-rate-limit-tightening
round3-phase10-spec10-admin-foundation
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
round3-phase15-spec02-comment-reply-digest
round3-phase15-spec03-weekly-summary
round3-phase15-spec04-push-notifications
round3-phase16-spec01-offline-cache
round3-phase16-spec02-queued-posts
round3-phase16-spec03-lighthouse-perf
round3-phase16-spec04-accessibility-audit
```

---

_End of Worship Room — Phase 3: Forums Wave Master Plan v2.0_
