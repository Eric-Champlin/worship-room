# Worship Room — Round 3 Master Plan

**Version:** 1.0 (initial draft)
**Date:** April 14, 2026
**Author context:** Drafted by Claude in conversation with Eric Champlin, based on three codebase recons (shared infrastructure, data layer, cross-feature touch points), a Prayer Wall recon, a Profile & Dashboard recon, competitor research across CaringBridge / Hallow / YouVersion / Discourse / 7 Cups / Discord / Duolingo / theWell / CrossTalk / Pray.com / Glorify, and extended strategic conversation about Round 3 scope.

---

## How to Use This Document

**If you are Eric:** This is the single reference document for the entire Round 3 Prayer Wall + Profile revamp effort. Skim the Quick Reference section to see the shape. Read the Architectural Foundation section if you want to push back on any whole-project decisions before specs are drafted. The phase sections are for later — you don't need to read them cover-to-cover; treat them as a menu you consult when deciding what to work on next.

**If you are Claude Code:** Before executing any Round 3 spec, load this document and read at minimum the **Quick Reference** section at the top. It contains the architectural decisions, naming conventions, and spec dependency information you need to execute any individual spec correctly. Read the relevant **Phase** section only if your spec sits inside that phase and you need more context. Do not attempt to hold the entire document in working memory — use the Quick Reference as your primary anchor and consult phase-specific sections as needed.

**For both:** This is a living document. If any decision in here changes mid-Round 3, the plan gets updated and the file in the repo gets replaced with the new version.

---

## Quick Reference

> **This section is deliberately short so Claude Code can load it cheaply at the start of every spec execution. Everything in here is authoritative; everything in the rest of the document elaborates on what's already stated here.**

### What Round 3 Is

Round 3 is a comprehensive revamp of Prayer Wall and user Profiles in the Worship Room frontend, including the first backend integration (Spring Boot + PostgreSQL + Liquibase + Firebase Auth) for the Prayer Wall feature and the unified activity engine. Round 3 is scoped to approximately 80 specs across 11 phases, executed in dependency order. Other features (Daily Hub, Bible, Music, Grow, Local Support) remain on localStorage for now and will be migrated in later rounds.

### The Eleven Phases

| # | Phase | Purpose | Approx. specs |
|---|---|---|---|
| 0 | Backend Foundation Learning | Teaching document for Eric to read before any backend work | 1 |
| 1 | Backend Foundation | Spring Boot, Docker, Liquibase, Firebase Auth, OpenAPI, Testcontainers, CI | 10 |
| 2 | Activity Engine Migration | Points, streaks, badges, grace periods on backend | 9 |
| 3 | Prayer Wall Data Migration | Schemas, APIs, reaction persistence fix, frontend service swap | 11 |
| 4 | Post Type Expansion | Prayer, Testimony, Question, Discussion, Encouragement | 8 |
| 5 | Visual Migration to Round 2 Brand | FrostedCard, HorizonGlow, 2-line headings, tokens | 5 |
| 6 | Hero Features | Prayer Receipt, Quick Lift, Night Mode, Intercessor Timeline, Answered Wall, Verse-Finds-You | 12 |
| 7 | Cross-Feature Integration | Bible ↔ Wall, Music ↔ Wall, Daily Hub rituals, Friends privacy, Local Support bridges | 8 |
| 8 | Unified Profile System | URL merge, Summary/Activity split, tab architecture, name canonicalization | 9 |
| 9 | Ritual & Time Awareness | Liturgical calendar, Sunday mode, time-of-day copy, candle mode | 5 |
| 10 | Community Warmth & Moderation | First Time badges, presence, trust levels, moderation queue, escalation tiers | 10 |

**Total:** approximately 88 specs.

### Architectural Decisions (the TL;DR)

These are the whole-project decisions that every spec assumes. Full rationale lives in the Architectural Foundation section below.

1. **Canonical user model lives on the backend.** One `users` table is the source of truth. `firstName`, `lastName`, `displayNamePreference` (enum), `customDisplayName`, and the derived `displayName` are all computed server-side. All four existing frontend systems (auth context, PrayerWallUser, FriendProfile, LeaderboardEntry) consume `displayName` from API responses. The frontend name-inconsistency problem is fixed by centralizing resolution, not by migrating four systems independently.

2. **One `posts` table holds all five post types**, discriminated by a `post_type` enum column. Prayer Request, Testimony, Question, Devotional Discussion, and Encouragement are type variants with type-specific behavior layered on top of shared infrastructure (comments, reactions, bookmarks, reporting, post lifecycle). No separate table per type.

3. **The activity engine migrates together with Prayer Wall**, not separately. Faith points, streaks, badges, and celebrations all move to the backend in Phase 2 because Prayer Wall writes to all of them and split-brain state (half-backend, half-local) would be worse than either extreme. Other features (Daily Hub, Bible, etc.) keep their feature-specific localStorage but route `recordActivity()` calls through the shared API.

4. **Firebase Auth replaces the simulated auth in Phase 1.** The 121 files currently calling `useAuth()` do not change — they keep the same hook interface. Only the `AuthContext` implementation swaps from localStorage-backed simulation to Firebase ID token management. The backend validates Firebase tokens on every request and extracts `userId` from JWT claims.

5. **Services are the API swap point.** The existing `services/` directory is already architected as a pure storage layer with no React dependencies. Phase 3 swaps service implementations (e.g., `prayer-list-storage.ts` → `prayer-list-api.ts`) without touching components, hooks, or contexts. This keeps blast radius tiny.

6. **Liquibase, not Flyway**, for database migrations. Eric uses Liquibase at work and has existing muscle memory. Every schema change is a versioned changeset. Seed data for dev lives in a `dev` context that only runs against local databases.

7. **Streak design follows Duolingo's leniency research.** Grace periods, grief pauses, and streak repair are built in from day one. There are no Prayer Wall-specific streaks — the existing Daily Hub streak encompasses Prayer Wall activity. Vulnerability audiences cannot be punished for missing days during hard seasons.

8. **Profile pages merge at `/u/:username`** with 301 redirects from `/profile/:userId` and `/prayer-wall/user/:id`. Profiles adopt Discourse's Summary vs Activity split: a Summary tab (snapshot view) and several Activity tabs (Prayer Wall, Growth, Bible, Friends). Three-tier privacy: private / friends / public, applied per-section.

9. **Post types render as "rooms," not filter pills.** Following Discord's "rooms of a house" metaphor, each post type has its own atmosphere, pacing, and surrounding copy. Walking from the Prayer Request room into the Testimony room should feel like walking from a chapel into a celebration hall. This is a framing decision, not just a visual one.

10. **Moderation is designed in from day one, not bolted on later.** Phase 10 adopts 7 Cups' three-tier escalation model (green/yellow/red) with automatic phrase-based flagging (extending existing crisis detection), community reporting (extending existing ReportDialog), peer moderator trust levels (following Discourse's pattern), and a human review queue. Eric is not the content police at 3am.

### Naming Conventions

**Spec files:** `round3-phase{N}-spec{NN}-{kebab-case-title}.md`. Phase and spec numbers are zero-padded (phase 0-10 single digit, spec 00-99 two digits). Example: `round3-phase03-spec04-prayer-wall-read-endpoints.md`. Alphabetical filename sorting equals execution order.

**Backend tables:** `snake_case`, plural. `users`, `posts`, `post_comments`, `post_reactions`, `post_bookmarks`, `activity_log`, `user_badges`, `faith_points`, `streak_state`, `notifications`.

**Backend columns:** `snake_case`, descriptive. Boolean columns prefixed `is_` (e.g., `is_anonymous`, `is_answered`). Timestamp columns suffixed `_at` (e.g., `created_at`, `last_activity_at`, `answered_at`). Foreign keys suffixed `_id` (e.g., `user_id`, `post_id`).

**API endpoints:** REST-ish, resource-oriented. `/api/v1/posts`, `/api/v1/posts/{id}`, `/api/v1/posts/{id}/reactions`, `/api/v1/users/{username}`, `/api/v1/activity`, `/api/v1/notifications`. Versioned as `/v1/` from day one so we can ship breaking changes without breaking existing clients.

**Frontend types:** `PascalCase` for types and interfaces, matching existing convention. API-derived types generated from OpenAPI spec live in `types/api/` and are never edited by hand. Frontend-specific types (UI state, form state) live in `types/` as before.

**Database migrations:** Liquibase changesets named by date and number. `db/changelog/2026-04-14-001-create-users-table.xml`. One changeset per logical change; no bundled mega-migrations.

**Copy/strings:** All user-facing strings go in the spec's `Copy Deck` section, written in the brand voice (see below), and imported from a single per-feature constants file (e.g., `constants/prayer-wall-copy.ts`). No inline hardcoded strings outside of these files.

### Brand Voice (pinned)

Worship Room speaks the way a trusted older friend speaks to you over coffee when you're going through something hard: warm but unhurried, honest without being preachy, reverent without being stiff. The formality sits one notch more casual than a Sunday sermon and one notch more serious than a wellness app. Scripture appears as gift, not decoration — in celebration moments, empty states, and optional invitations, never as headers or filler. The emotional register leans into the full human range: grief gets stillness and whitespace, joy gets warmth and gentle celebration, struggle gets presence without fixing. No therapy-app language. No hype-language. Humor exists only in joyful moments and is always gentle and self-aware. Copy near vulnerability is quiet (short sentences, no exclamation points, no emoji, no cleverness). Copy near celebration can breathe (warmer, longer, allowed to smile). Copy near community is inviting, not performative. When in doubt, cut the sentence in half. When still in doubt, ask whether a pastor's wife with thirty years of walking alongside grieving people would say it that way.

### Spec File Template

Every Round 3 spec file uses this structure. The template exists to keep CC predictable across 80+ executions.

```markdown
# Round 3 — Phase {N} — Spec {NN}: {Title}

> **Before executing this spec:** Load `round3-master-plan.md` and read the Quick Reference section. Consult Phase {N} section if you need more context than this spec provides. Do not commit, do not push, do not touch git — Eric handles all git operations manually.

## Context
{One paragraph: where this spec sits in Round 3, what came before, what depends on it.}

## Goal
{One or two sentences: what "done" looks like.}

## Non-Goals
{Bulleted list of what this spec does NOT do, to prevent scope creep.}

## Prerequisites
{List of other spec IDs that must be complete before this one runs.}

## Approach
{Technical plan with enough detail for CC to execute. Code examples where they clarify.}

## Files to Create
{Exact list of new files this spec creates.}

## Files to Modify
{Exact list of existing files this spec changes, with the nature of each change.}

## Files to Delete
{Exact list of files this spec removes.}

## Database Changes (if applicable)
{Liquibase changeset names and their purpose. For backend specs only.}

## Copy Deck
{Every user-facing string this spec introduces, written in brand voice, grouped by UI location.}

## Acceptance Criteria
{Testable checklist of behaviors that prove the spec shipped correctly.}

## Testing Notes
{What to test, what's out of scope, what requires manual verification.}

## Out-of-Band Notes for Eric
{Gotchas, things CC might get wrong, places to double-check, commit points.}
```

### Universal Spec Rules

These apply to every Round 3 spec, always, without exception:

1. **No git operations.** CC never commits, never pushes, never runs `git checkout`. Eric handles all git manually. This rule exists because of the FPU turnaround calculator incident where `git checkout HEAD --` wiped uncommitted work.

2. **Read the Master Plan's Quick Reference section before starting.** Every spec header says this. It's not optional.

3. **Use Liquibase for all schema changes.** Never raw SQL against the database. Never Flyway. Never JPA auto-schema-generation (`ddl-auto: update` is forbidden in all environments).

4. **Use TypeScript types generated from OpenAPI**, not hand-written API response types. The OpenAPI spec is the contract; the TypeScript types are derivatives.

5. **All user-facing strings go in a copy deck section of the spec**, then into a constants file. No inline strings in components.

6. **Tests are mandatory for new functionality.** Unit tests for pure logic, integration tests for API endpoints (via Testcontainers), component tests for new React components. Eric can override this on a per-spec basis if a spec is purely refactoring with no behavior change, but that override must be explicit.

7. **No localStorage keys created or modified without documenting them in `.claude/rules/11-local-storage-keys.md`.** This file is the source of truth for the current key inventory and must stay in sync.

8. **Accessibility is not optional.** Keyboard navigation, ARIA labels, focus management, prefers-reduced-motion support, sufficient color contrast. Every spec with visual changes has an accessibility checklist in its acceptance criteria.

9. **Follow the brand voice for all copy.** Not optional. Specs that introduce copy must show the copy in context and it must pass the brand voice test.

10. **Respect the Spec V draft-persistence pattern.** Any spec that introduces a form behind an auth wall must preserve user input across the auth modal using localStorage draft keys. Subtitle reads "Your draft is safe — we'll bring it back after."

---

## Architectural Foundation

> **This section is the whole-project thinking that informs every phase below. If you find yourself confused about why a spec was structured a certain way, check here first — the answer is probably an up-front decision in this section rather than a spec-specific choice.**

### Decision 1: The Canonical User Model

**The problem.** The Profile recon surfaced a critical inconsistency. The Worship Room frontend currently has four different user name fields across four different systems:

- `AuthContext` uses `user.name` as a full name string ("Sarah Johnson")
- `PrayerWallUser` splits into `firstName` + `lastName` ("Sarah" / "Johnson")
- `FriendProfile` uses pre-formatted `displayName` ("Sarah M.")
- `LeaderboardEntry` also uses `displayName` ("Sarah M.")
- `PrayerRequest.authorName` uses first-name-only ("Sarah")

There is no shared source of truth. When a user updates their name in one place, the other three drift. When the frontend tries to display a user consistently across features, it has to know which field to read based on where the data came from. This is the reason Prayer Wall profile links don't cross-link to Growth profile — they live in different name worlds.

**The decision.** The backend `users` table is the source of truth for user identity. It has these columns:

```
users
  id                           UUID (primary key, matches Firebase UID)
  first_name                   VARCHAR(100)
  last_name                    VARCHAR(100)
  display_name_preference      ENUM('first_only', 'first_last_initial', 'first_last', 'custom')
  custom_display_name          VARCHAR(100) NULL
  avatar_url                   VARCHAR(500) NULL
  bio                          TEXT NULL
  favorite_verse_reference     VARCHAR(50) NULL
  favorite_verse_text          TEXT NULL
  joined_at                    TIMESTAMP
  last_active_at               TIMESTAMP
  email                        VARCHAR(255) UNIQUE
  is_email_verified            BOOLEAN
  is_deleted                   BOOLEAN DEFAULT FALSE
  deleted_at                   TIMESTAMP NULL
```

The `display_name` field is **not stored** — it's computed server-side from `first_name`, `last_name`, `display_name_preference`, and `custom_display_name`, and included in every API response that returns a user. The frontend never computes display names; it reads the `displayName` field from the API and renders it.

This decision kills the name drift problem permanently. All four existing frontend systems become thin views over a single authoritative field. When a user changes their display preference in settings, every component in the app that renders them picks up the change on the next API call, with no migration required.

**Why display name preference instead of one format?** Because Prayer Wall is a vulnerability space and anonymity gradients matter. Some users will want full identity. Others will want "Sarah M." Others will want "Anonymous" per post (the existing anonymous toggle still works at the post level). The enum covers the common cases; `custom` is an escape hatch.

**What happens to anonymous posts?** Anonymous posts still reference `user_id` on the backend (for moderation, spam control, and the user's own dashboard) but the API response for anonymous posts returns `displayName: "Anonymous"` and `avatarUrl: null`. The frontend cannot see who posted an anonymous prayer — the backend never sends that information across the wire, even to the post author's own profile view. Anonymous is opaque even to the poster's own profile.

### Decision 2: Post Types as a Single Table with a Discriminator

**The problem.** Round 3 expands Prayer Wall from prayer-requests-only to five post types: Prayer Request, Testimony, Question, Devotional Discussion, and Encouragement. Each type has type-specific behavior (Questions have "this helped" marking, Testimonies never expire, Encouragement has no replies, etc.) but all types share infrastructure: comments, reactions, bookmarks, reporting, moderation, author attribution, timestamps, categories.

**Option A:** One table per type (`prayer_requests`, `testimonies`, `questions`, `discussions`, `encouragements`). Pro: each table's schema fits its type perfectly. Con: code duplication across 5x everything, hard to build a unified feed, comment table has to reference five different parent types.

**Option B:** One `posts` table with a `post_type` enum discriminator. Pro: one shared infrastructure for reactions/comments/bookmarks/reporting, easy unified feed, easy filtering, simple foreign keys. Con: the `posts` table has some nullable columns that are only used by certain types (e.g., `answered_text` is null for non-prayer types).

**The decision: Option B.** The shared infrastructure savings massively outweigh the cost of a few nullable columns. Here's the schema:

```
posts
  id                           UUID (primary key)
  user_id                      UUID (foreign key to users.id)
  post_type                    ENUM('prayer_request', 'testimony', 'question', 'discussion', 'encouragement')
  content                      TEXT NOT NULL
  category                     VARCHAR(50)
  is_anonymous                 BOOLEAN DEFAULT FALSE
  
  -- type-specific nullable columns
  is_answered                  BOOLEAN DEFAULT FALSE     -- prayer_request only
  answered_text                TEXT NULL                 -- prayer_request only
  answered_at                  TIMESTAMP NULL            -- prayer_request only
  question_resolved_comment_id UUID NULL                 -- question only (the "this helped" answer)
  challenge_id                 VARCHAR(50) NULL          -- any type, if posted during a challenge
  qotd_id                      VARCHAR(50) NULL          -- discussion type only
  
  -- shared lifecycle
  created_at                   TIMESTAMP NOT NULL
  last_activity_at             TIMESTAMP NOT NULL
  expires_at                   TIMESTAMP NULL            -- null for types that don't expire
  
  -- moderation state
  moderation_status            ENUM('approved', 'flagged', 'hidden', 'removed') DEFAULT 'approved'
  crisis_flag                  BOOLEAN DEFAULT FALSE
  
  -- soft delete
  is_deleted                   BOOLEAN DEFAULT FALSE
  deleted_at                   TIMESTAMP NULL
  
  -- denormalized counters (for fast feed rendering)
  praying_count                INTEGER DEFAULT 0
  comment_count                INTEGER DEFAULT 0
  bookmark_count               INTEGER DEFAULT 0
```

Type-specific behavior is enforced at the application layer, not the database layer. The backend rejects attempts to set `answered_text` on a non-prayer post. The frontend renders different composers and cards based on `post_type`.

**Counter denormalization.** The `praying_count`, `comment_count`, and `bookmark_count` columns are denormalized for fast feed queries. They are updated transactionally when the underlying reaction/comment/bookmark is inserted. Never trust the counters as authoritative when displaying to the post author's own dashboard — always do a live count there. Counters are a performance optimization for list views; they drift, and that's acceptable for drift of +/- 1 in public-facing counts.

**Expiration rules.**
- Prayer Request: 7 days after `last_activity_at`, extendable with one tap by the author, or indefinitely by marking answered.
- Question: 7 days after `last_activity_at`, extendable. Marking a comment as "this helped" makes the question evergreen.
- Testimony: never expires.
- Devotional Discussion: 3 days after `last_activity_at` (shorter because these are time-sensitive conversations).
- Encouragement: 24 hours from `created_at`, non-extendable. This is a "word for today" feature.

Expired posts are not deleted — they're hidden from feed views but remain accessible via direct link and on the author's own dashboard. Expiration is a display filter, not a destructive operation.

### Decision 3: The Activity Engine Migrates in Phase 2

**The problem.** Every Prayer Wall action calls `recordActivity('prayerWall')`, which writes to four localStorage keys: `wr_daily_activities`, `wr_faith_points`, `wr_streak`, and potentially `wr_badges`. These four keys are shared infrastructure that every feature in the app writes to. If Prayer Wall data lives on the backend but the activity engine stays on localStorage, every Prayer Wall write triggers a half-backend/half-local state that is impossible to keep consistent.

**The decision.** The activity engine migrates to the backend in Phase 2, immediately after the Foundation lands. Here's the schema:

```
activity_log
  id               UUID (primary key)
  user_id          UUID (foreign key)
  activity_type    VARCHAR(50) ('pray', 'meditate', 'journal', 'prayer_wall', etc.)
  source_feature   VARCHAR(50) ('daily_hub', 'prayer_wall', 'bible', etc.)
  occurred_at      TIMESTAMP
  points_earned    INTEGER
  metadata         JSONB (optional per-activity context)
```

```
faith_points
  user_id          UUID (primary key, foreign key)
  total_points     INTEGER DEFAULT 0
  current_level    INTEGER DEFAULT 1
  last_updated     TIMESTAMP
```

```
streak_state
  user_id          UUID (primary key, foreign key)
  current_streak   INTEGER DEFAULT 0
  longest_streak   INTEGER DEFAULT 0
  last_active_date DATE
  grace_days_used  INTEGER DEFAULT 0
  grief_pause_until DATE NULL
```

```
user_badges
  user_id          UUID (foreign key)
  badge_id         VARCHAR(100)
  earned_at        TIMESTAMP
  display_count    INTEGER (for repeatable badges)
  PRIMARY KEY (user_id, badge_id)
```

```
activity_counts
  user_id          UUID (foreign key)
  count_type       VARCHAR(50) ('pray', 'journal', 'meditate', 'intercession', etc.)
  count_value      INTEGER DEFAULT 0
  last_updated     TIMESTAMP
  PRIMARY KEY (user_id, count_type)
```

**The key API endpoint** that the entire app uses:

```
POST /api/v1/activity
Body: { activity_type, source_feature, metadata }

Response: {
  points_earned: int,
  total_points: int,
  current_level: int,
  level_up: boolean,
  streak: { current, longest, new_today },
  new_badges: [ { id, name, celebration_tier, earned_at } ],
  multiplier_tier: { label, multiplier }
}
```

This single endpoint replaces `recordActivity()` in the frontend. The frontend sends an activity event; the backend does all the calculation (points, multipliers, streak updates, badge checks) and returns the updated state. The frontend renders celebrations based on the response. No calculation logic lives on the frontend. This is a huge simplification.

**Grace periods and grief pauses are built in from day one.**
- **Grace days:** Users get 2 free grace days per week. If they miss a day, their streak doesn't break; instead, `grace_days_used` increments. At the start of each week (Monday midnight local time), `grace_days_used` resets to 0.
- **Grief pause:** A user can trigger a grief pause from their profile settings. Copy: "I'm walking through something hard. Pause my streak for 7 days." This sets `grief_pause_until` to 7 days from now. During a pause, no streak break occurs regardless of activity. This is free, no faith points cost, once per month.
- **Streak repair:** Existing mechanic (50 points to restore 1 broken streak day, free 1x/week). Keeps working.

**Non-streak activities still earn points.** Missing a day during grace or grief pause doesn't mean no points earned on other days — it means the streak doesn't break. Points accumulate normally.

### Decision 4: Authentication Flow and Migration

**The problem.** The current auth is 100% simulated via localStorage. 121 files call `useAuth()`. Migrating all 121 files would be a disaster.

**The decision.** The migration is invisible to the 121 callers. Here's how:

1. `AuthContext.tsx` gets rewritten internally to use Firebase Auth instead of localStorage. The exported `useAuth()` hook keeps the same return shape: `{ isAuthenticated, user: { name, id } | null, login, logout }`. Every caller continues to work.
2. The `login(name)` function signature changes internally — Firebase doesn't take a name, it takes an email + password (or OAuth provider). But the existing `AuthModal` component already collects email and password, so we rewire that modal to call Firebase Auth directly and then populate the context from the Firebase user object.
3. The `user.id` returned from the context becomes the Firebase UID, which is also the primary key of the backend `users` table. This is the bridge that makes everything else work.
4. Backend requests include the Firebase ID token in the `Authorization: Bearer <token>` header. A Spring Boot filter validates the token and extracts the UID, which is then available to every controller as the authenticated user.
5. New users: when someone registers via the AuthModal, Firebase creates the auth user AND the frontend calls `POST /api/v1/users` to create the corresponding row in the backend `users` table. The Firebase UID and the backend `user_id` are the same value.
6. Existing simulated users: on first login after the Firebase migration, the frontend detects that the old `wr_user_id` exists and offers to "claim" that account. Claiming creates a backend user with the same UID. If the user doesn't claim, the old data stays orphaned and they start fresh. This migration flow is its own spec in Phase 1.

**Token refresh, expiry, and offline.** Firebase ID tokens expire after 1 hour. The Firebase SDK handles automatic refresh transparently. For offline: the frontend caches the last-known token; if the token has expired and the user is offline, write operations fail gracefully with "You're offline, we'll sync when you're back" and read operations fall back to cached data where available. The frontend must handle the "token present but expired and offline" case explicitly.

### Decision 5: Service Layer Is the Swap Point

**The key finding from Recon B.** The existing `services/` directory is already architected as a pure storage layer. Every service file follows the same pattern: `readJSON(key, fallback)` / `writeJSON(key, value)` wrapped in try/catch, no React dependencies, no async operations. The recon noted: *"Ready for Phase 3 API swap via interface abstraction."*

**The decision.** Each feature-specific service file gets a corresponding API implementation in a new `services/api/` subdirectory. For example:

- `services/prayer-list-storage.ts` → `services/api/prayer-list-api.ts`
- `services/faith-points-storage.ts` → `services/api/faith-points-api.ts`
- `services/badge-storage.ts` → `services/api/badge-api.ts`

The API implementations expose the **same function signatures** as the storage implementations. They just hit the backend instead of localStorage. A thin `services/index.ts` chooses which implementation to use based on an environment flag:

```typescript
// services/index.ts
import * as localPrayerList from './prayer-list-storage'
import * as apiPrayerList from './api/prayer-list-api'

export const prayerList = import.meta.env.VITE_USE_BACKEND
  ? apiPrayerList
  : localPrayerList
```

This gives three huge benefits:

1. **Gradual migration.** We flip features to the backend one at a time by changing the feature-specific flag. Daily Hub stays on localStorage while Prayer Wall moves to backend. Other features migrate in later rounds.
2. **Easy rollback.** If the backend Prayer Wall explodes in production, we flip the flag back and it reverts to localStorage behavior. Temporary, but it's a safety net.
3. **Parallel development.** Backend spec work can happen while frontend spec work continues on other features without conflict.

Not every service migrates in Round 3. Only these services migrate:

- `prayer-list-storage.ts` (becomes `prayer-wall-api.ts` — note the rename; the backend version handles all post types, not just prayer requests)
- `faith-points-storage.ts`
- `badge-storage.ts`
- `social-storage.ts` (friends, interactions, milestones)
- `leaderboard-storage.ts`
- `notifications-storage.ts` (partial — in-app notifications move to backend; push notifications stay as they are)

Every other service stays on localStorage for Round 3 and migrates in future rounds.

### Decision 6: Database Migration Tooling (Liquibase, Not Flyway)

Eric uses Liquibase at work. We pick Liquibase.

**Structure.**

```
backend/
  db/
    changelog/
      master.xml                            (master changelog, imports all others)
      2026-04-14-001-create-users-table.xml
      2026-04-14-002-create-posts-table.xml
      2026-04-14-003-create-comments-table.xml
      ...
    contexts/
      dev-seed.xml                          (dev-only seed data, referenced with context='dev')
      test-seed.xml                         (test-only seed data, referenced with context='test')
```

**Rules:**

1. One changeset per logical change. Don't bundle schema changes into mega-migrations.
2. Every changeset has a meaningful `id` and `author` field. `id` is the date-number-name triple so changesets sort chronologically when listed.
3. Every changeset is **forward-only** by default. Rollback is written only for changesets that are genuinely rollback-able (non-destructive, non-data-loss). Destructive changes are never rolled back automatically; they're rolled forward with a new changeset.
4. Seed data for dev and test lives in context-specific changesets. The `dev` context runs only when `spring.liquibase.contexts=dev` is set (local development). The `test` context runs only in Testcontainers integration tests. Production runs with no context, so seed data never leaks into production.
5. Never edit a committed changeset. Always write a new one. Liquibase tracks checksums and will fail to apply changesets whose checksums have changed.
6. Every changeset must be idempotent in the sense that Liquibase won't run it twice. This is handled by Liquibase's change tracking table (`DATABASECHANGELOG`), but the changesets themselves should still be written defensively (e.g., use `createTable` with explicit failure on existing, not "create if not exists").

### Decision 7: OpenAPI as the Contract

**The decision.** The backend's API contract is defined in an OpenAPI 3.1 spec file committed to the repo. The spec is the source of truth for:

1. Which endpoints exist and their shapes.
2. What request/response bodies look like.
3. What error codes mean.
4. What authentication is required.

The frontend generates TypeScript types from this spec using `openapi-typescript`. Those generated types live in `frontend/src/types/api/` and are **never edited by hand**. Every API call in the frontend imports its request/response types from the generated files. If the backend changes an endpoint shape, the OpenAPI spec gets updated, the types regenerate, and the frontend fails to compile in exactly the places that need to be updated. This is the contract enforcement we want.

**Workflow.**

1. Backend spec change → edit `openapi.yaml` → regenerate types → backend implementation → backend tests pass → frontend consumes new types → frontend updates broken call sites → frontend tests pass → ship.
2. The OpenAPI spec file is the API documentation. It gets rendered to an HTML docs page served at `/api/docs` (or similar) in dev environments.
3. Linting: the OpenAPI spec itself is linted with `spectral` or similar to catch malformed schemas early.

### Decision 8: Testing Strategy

**Backend tests are integration-test-heavy, using Testcontainers.** The backend spins up a real PostgreSQL container for each test run, applies all Liquibase migrations, loads test seed data, runs the tests against the real database, and tears the container down afterward. This is the only reliable way to test database-adjacent code; H2 or in-memory databases lie about behavior and create bugs that only surface in production.

**Unit tests on the backend cover pure logic only.** Things like faith point calculation, level threshold checks, streak update logic, badge eligibility computation — these are pure functions with no I/O and get unit tests. Everything else gets integration tests.

**Frontend tests follow existing conventions.** The recon confirmed 643+ existing test files across the frontend. Round 3 adds to this corpus, not replaces it. New React components get Vitest + React Testing Library tests. New hooks get hook tests. New services get service tests. Integration tests using MSW for API mocking run against the OpenAPI-generated types so a schema change that breaks the contract also breaks the frontend tests.

**End-to-end tests use Playwright (matching Eric's existing CC skill pipeline).** The `/playwright-recon` skill that exists in Eric's CC setup will be extended to verify Round 3 changes. Each spec that touches user-facing behavior includes a Playwright verification step in its acceptance criteria.

**No test-on-the-way-down.** Tests that delete existing test coverage without replacement require explicit justification in the spec. The default assumption is that tests grow, not shrink.

### Decision 9: Migration Ordering Rules

There is a correct order to do this, and deviations create pain. The rules:

1. **Foundation before features.** Phase 1 (Backend Foundation) lands before Phase 2 (Activity Engine) lands before Phase 3 (Prayer Wall Data). You cannot skip ahead because each phase depends on the last being stable.

2. **Schema before API before frontend.** Within a phase, the order is always: Liquibase changeset → backend API endpoint → backend test → OpenAPI spec update → frontend types regenerate → frontend service swap → frontend test update. This order catches mistakes as early as possible.

3. **Read endpoints before write endpoints.** When migrating a feature, the read API comes before the write API. This lets us verify the frontend can hydrate from the backend before we trust the backend to accept writes.

4. **Backward-compatible changes only, in the middle of a phase.** Breaking changes (removing fields, changing semantics) happen at phase boundaries and are announced in the phase README. Mid-phase, everything is additive.

5. **Feature flags for risky migrations.** When swapping a service implementation from localStorage to API, a feature flag gates the swap. The flag defaults to "old" and flips to "new" only when the spec is complete. This lets us land specs and still have a working app at every intermediate point.

6. **Visual work can run in parallel with data work.** Phase 5 (visual migration) touches component JSX and Tailwind classes. Phase 3 (data migration) touches services and hooks. They rarely collide. Phase 5 can run alongside Phase 3 without coordination, provided the Phase 5 changes don't accidentally introduce bugs in the data flow.

7. **Profile work depends on user model work.** Phase 8 (Unified Profile System) cannot start until the canonical user model (Phase 1) is live. But within Phase 8, the URL migration and the visual layout work can run in parallel.

### Decision 10: Dependency Philosophy

Every spec declares its prerequisites explicitly. A prerequisite is a spec that **must** have been completed before the current spec can be executed. Prerequisites are transitive — if Spec C depends on Spec B and Spec B depends on Spec A, then Spec C transitively depends on Spec A, and the dependency graph shows the full chain.

**Specs without prerequisites can run in any order** within their phase. This is explicit in each spec's Prerequisites section.

**Parallelism is allowed but optional.** Some specs can run in parallel (different files, different concerns). The master plan notes these. Eric can choose to run them sequentially for simplicity or in parallel for speed. Either is fine.

**Missing prerequisites is a hard stop.** If CC detects that a prerequisite isn't complete (e.g., a table referenced by the current spec doesn't exist yet), it should stop and tell Eric, not try to work around it.

---

*Architectural Foundation complete. Phase breakdowns follow.*

---

## Phase 0 — Backend Foundation Learning

> **Phase purpose:** Give Eric the mental model he needs before any backend code is written. This is a single spec, not a CC execution spec — it's a teaching document Eric reads end-to-end before Phase 1 begins.

**What this phase accomplishes:** After reading this phase's one document, Eric has a working understanding of Docker, Spring Boot's core concepts, Liquibase changesets (builds on his work experience), Firebase Auth's token flow, OpenAPI as a contract, Testcontainers for integration testing, and the rough shape of the daily development loop. He does not need to be an expert. He needs to not feel lost when CC starts generating Java files.

**Sequencing:** Runs before Phase 1. Everything else in Round 3 waits on this being read and understood.

### Spec 0.1 — Backend Foundation Learning Document

- **ID:** `round3-phase00-spec01-backend-foundation-learning`
- **Type:** Teaching document (not a CC execution spec)
- **Size:** L (15-25 pages of reading)
- **Risk:** Low (no code changes)
- **Prerequisites:** None
- **Goal:** Eric finishes this document with enough backend mental model to review backend specs confidently, push back on architectural choices he disagrees with, and debug backend issues when CC gets confused.

**What the document covers:**

1. **Why we're doing this.** Five-minute framing of why Round 3 needs a backend. The "services layer is already a clean swap point" finding. The reaction persistence bug as a concrete motivator.

2. **Installing the toolchain.** Step-by-step instructions for installing Docker Desktop, JDK 21 (Temurin or equivalent), a JVM build tool (Gradle via the wrapper — no separate install), and confirming everything works with a hello-world Spring Boot project. Includes troubleshooting for the most common install problems on macOS.

3. **The daily development loop.** What Eric actually does each morning to start working. What `docker compose up -d` means and why it runs in the background. What `./gradlew bootRun` does. How frontend and backend hot-reload work in parallel. How to stop everything cleanly at the end of the day.

4. **Spring Boot concepts, by example.** Walks through a real (tiny) Spring Boot controller and explains every annotation: `@RestController`, `@RequestMapping`, `@GetMapping`, `@PostMapping`, `@RequestBody`, `@PathVariable`, `@Autowired`, `@Service`, `@Repository`, `@Entity`. No lecture; every concept is introduced by showing code and explaining what each line does. Emphasis on: Spring Boot is opinionated, these annotations are how you signal your intent to the framework, and you do not need to understand the framework internals to use it correctly.

5. **JPA and Hibernate — what to use and what to avoid.** The teaching point Eric needs to understand: Hibernate's lazy loading and relationship mappings are a trap. For Round 3, we use `Spring Data JDBC` or explicit SQL via `JdbcTemplate` for anything non-trivial, and `@Entity` only for simple CRUD. The document explains the N+1 query problem with a concrete example so Eric knows why we're avoiding it.

6. **Liquibase (leveraging Eric's existing knowledge).** Short section that assumes Eric knows Liquibase from work and just maps the concepts to our setup: where changesets live, how contexts work (dev vs. test vs. production), the directory structure decision from the Architectural Foundation, and the rule of "one changeset per logical change, never edit committed changesets."

7. **Firebase Auth token flow.** The concept map: user logs in on the frontend via Firebase SDK → Firebase returns an ID token (a JWT) → frontend sends the token in `Authorization: Bearer <token>` headers → backend validates the token using Firebase Admin SDK → backend extracts the Firebase UID → UID is used as the `user_id` in all database queries. Explains why this works: Firebase handles the hard parts (password hashing, OAuth providers, password reset), and we just consume the already-validated identity.

8. **OpenAPI as a contract.** Short explanation of what OpenAPI is, why we're using it, how types get generated for the frontend, what the daily workflow looks like (edit spec → regenerate types → implement → test). Less teaching, more workflow.

9. **Testcontainers.** The one thing that surprises people: the integration tests spin up a real PostgreSQL inside a Docker container for each test run. The document explains why (H2 lies about PostgreSQL behavior) and shows a one-page example of a test using Testcontainers.

10. **The Spring profiles system.** How `application.yml`, `application-dev.yml`, `application-prod.yml`, and `application-test.yml` work together. How environment variables override YAML values. Where secrets go (never in git; in environment variables or a local `.env` file that's gitignored).

11. **CORS, or: why your frontend can't talk to your backend on the first try.** Why the backend needs to explicitly allow requests from the frontend's origin during local development. One-paragraph explanation plus the exact configuration that goes in `application-dev.yml`.

12. **What you're allowed to forget.** The document ends with a page listing every Spring Boot / JPA / Hibernate / Maven / Gradle concept Eric is explicitly allowed to ignore for Round 3. Things like: XML-based bean configuration (we use Java config exclusively), Spring MVC view templates (we're API-only, no Thymeleaf), JPA entity inheritance strategies (we don't use them), Gradle Groovy DSL (we use Kotlin DSL), Maven (we use Gradle). The list exists so Eric knows what to skip when reading Spring Boot tutorials online.

**Delivery:** This document is delivered as a standalone markdown file (`spec-00-backend-foundation-learning.md`) that Eric reads once. It is not a CC execution spec. Eric reads, digests, asks questions in our chat if anything is unclear, and then we move into Phase 1.

**Why it's a full spec instead of skipped:** The single biggest failure mode for Round 3 is Eric feeling lost when CC generates Java files and losing trust in the process. This document prevents that failure mode by giving Eric enough mental model to stay grounded. It's the highest-leverage artifact in Round 3.

---

## Phase 1 — Backend Foundation

> **Phase purpose:** Stand up the backend infrastructure. Docker, Spring Boot, PostgreSQL via Liquibase, Firebase Auth integration, OpenAPI contract, Testcontainers, one end-to-end read endpoint. No features yet. No user data yet. Just the pipes.

**What this phase accomplishes:** At the end of Phase 1, Eric can start the backend locally, the frontend can authenticate with Firebase and make an authenticated GET request to the backend, and the response round-trips correctly with full type safety from OpenAPI. Nothing user-facing has changed, but the entire backend stack is ready for Phase 2 to start adding real functionality.

**Sequencing notes:** Specs in this phase are mostly sequential. Spec 1.1 creates the project skeleton; everything else depends on it. Spec 1.2 through 1.10 build up layer by layer. Spec 1.9 is the first full round-trip test — if it works, Phase 1 is done.

**Phase-level definition of done:**
- `docker compose up -d` starts a local PostgreSQL container.
- `./gradlew bootRun` starts the backend on `localhost:8080`.
- The frontend at `localhost:5173` can log in via Firebase Auth using a real test account.
- The frontend makes an authenticated `GET /api/v1/health` request and the response confirms both the backend is alive and the Firebase token validated correctly.
- A Testcontainers integration test runs the full stack in CI.
- OpenAPI spec is committed, types are generated, and the frontend imports the generated types for the health endpoint.
- Liquibase has at least one changeset (creating the `users` table) and runs successfully on startup.
- The simulated auth is still the default — the Firebase auth flow is behind a feature flag until Phase 2 migrates user data.

### Spec 1.1 — Spring Boot Project Skeleton

- **ID:** `round3-phase01-spec01-spring-boot-skeleton`
- **Size:** M
- **Risk:** Low
- **Prerequisites:** Phase 0 read
- **Goal:** Create a new `backend/` directory at the repo root containing a minimal Spring Boot 3.2+ project that compiles, runs, and responds to a health check on `localhost:8080/api/v1/health`.

**Approach:** Use Spring Initializr to generate the project skeleton with dependencies: Spring Web, Spring Data JDBC, PostgreSQL Driver, Liquibase, Validation, Spring Boot Actuator. Use Gradle Kotlin DSL. Java 21. Package structure: `com.worshiproom.backend`. Create one `HealthController` returning `{"status": "ok", "timestamp": "..."}`. Create `application.yml`, `application-dev.yml`, `application-test.yml`, `application-prod.yml` with appropriate placeholder values. Gradle wrapper committed. Gitignored: `build/`, `.gradle/`, `*.log`, `.env`, `application-local.yml`.

**Files to create:**
- `backend/build.gradle.kts`
- `backend/settings.gradle.kts`
- `backend/gradle/wrapper/gradle-wrapper.properties`
- `backend/gradlew`, `backend/gradlew.bat`
- `backend/src/main/java/com/worshiproom/backend/WorshipRoomBackendApplication.java`
- `backend/src/main/java/com/worshiproom/backend/health/HealthController.java`
- `backend/src/main/resources/application.yml`
- `backend/src/main/resources/application-dev.yml`
- `backend/src/main/resources/application-test.yml`
- `backend/src/main/resources/application-prod.yml`
- `backend/.gitignore`
- `backend/README.md` (how to run, how to test, how to add new endpoints)

**Acceptance criteria:**
- `cd backend && ./gradlew build` succeeds from a clean clone.
- `cd backend && ./gradlew bootRun` starts the server.
- `curl localhost:8080/api/v1/health` returns `{"status":"ok","timestamp":"..."}` with HTTP 200.
- No secrets in committed files.
- README documents the run command and a troubleshooting section for common errors.

**Out-of-band notes for Eric:** This spec is your first Java file. Read the `WorshipRoomBackendApplication.java` line by line to understand how Spring Boot starts up. The Phase 0 learning doc explains every annotation you'll see.

### Spec 1.2 — Docker Compose for PostgreSQL

- **ID:** `round3-phase01-spec02-docker-postgres`
- **Size:** S
- **Risk:** Low
- **Prerequisites:** 1.1
- **Goal:** Add a `docker-compose.yml` at the backend root that starts a local PostgreSQL 16 container with a persistent volume, and update the backend's `application-dev.yml` to connect to it.

**Approach:** Compose file defines one service (`postgres`) with PostgreSQL 16, environment variables for database name (`worshiproom_dev`), user (`worshiproom`), password (local-only, documented in README), port 5432 mapped to host, and a named volume for persistence. `application-dev.yml` connects via `jdbc:postgresql://localhost:5432/worshiproom_dev` with matching credentials. Update `backend/README.md` with the commands to start/stop the database.

**Files to create:**
- `backend/docker-compose.yml`

**Files to modify:**
- `backend/src/main/resources/application-dev.yml` (add datasource config)
- `backend/README.md` (add database section)

**Acceptance criteria:**
- `cd backend && docker compose up -d` starts the database.
- `psql -h localhost -U worshiproom -d worshiproom_dev` connects successfully (prompted for password).
- `./gradlew bootRun` starts without database connection errors.
- `docker compose down` stops the database without data loss (volume persists).
- `docker compose down -v` stops and wipes (documented in README).

### Spec 1.3 — Liquibase Integration and First Changeset

- **ID:** `round3-phase01-spec03-liquibase-setup`
- **Size:** M
- **Risk:** Low
- **Prerequisites:** 1.2
- **Goal:** Wire Liquibase into the backend so schema changes are managed via versioned changesets, and land the first changeset creating the `users` table per the canonical schema from the Architectural Foundation section.

**Approach:** Liquibase is already a Gradle dependency from Spec 1.1. Configure `spring.liquibase.change-log=classpath:db/changelog/master.xml` in `application.yml`. Create the master changelog file that imports sub-changelogs chronologically. Create the first changeset: `2026-04-14-001-create-users-table.xml`. Column definitions match the Architectural Foundation exactly. Include constraints (primary key, not-null, unique email). Include a rollback block for this changeset since it's a simple table creation.

**Files to create:**
- `backend/src/main/resources/db/changelog/master.xml`
- `backend/src/main/resources/db/changelog/2026-04-14-001-create-users-table.xml`

**Files to modify:**
- `backend/src/main/resources/application.yml` (add liquibase config)

**Database changes:**
- Creates `users` table per Architectural Foundation Decision 1.

**Acceptance criteria:**
- `./gradlew bootRun` applies the changeset automatically on startup.
- `psql` confirms the `users` table exists with all expected columns.
- `DATABASECHANGELOG` table records the applied changeset.
- Restarting the server does not re-apply the changeset (Liquibase idempotency).
- Changeset has a valid rollback block that, when invoked manually via `liquibase rollback-count 1`, drops the table cleanly.

**Out-of-band notes for Eric:** This is where your Liquibase work experience pays off. The structure should feel familiar. The only Round-3-specific thing is the `contexts/` directory, which we'll introduce in Spec 1.8 for seed data.

### Spec 1.4 — Firebase Auth Backend Integration

- **ID:** `round3-phase01-spec04-firebase-auth-backend`
- **Size:** L
- **Risk:** Medium (new concept territory)
- **Prerequisites:** 1.3
- **Goal:** Integrate Firebase Admin SDK into the backend to validate Firebase ID tokens on incoming requests, and add a Spring Security filter that extracts the authenticated user's UID and makes it available to controllers.

**Approach:** Add `firebase-admin` Gradle dependency. Initialize the Admin SDK at application startup using a service account JSON file (path configured via environment variable, never committed). Create a `FirebaseAuthenticationFilter` that extends Spring's `OncePerRequestFilter`, reads the `Authorization: Bearer <token>` header, validates via `FirebaseAuth.getInstance().verifyIdToken(token)`, and sets the Spring Security `Authentication` principal to the Firebase UID. Configure Spring Security to use this filter for all `/api/v1/**` routes except `/api/v1/health` (which remains public). Create an `AuthenticatedUser` helper that controllers use to get the current user's UID.

**Files to create:**
- `backend/src/main/java/com/worshiproom/backend/auth/FirebaseConfig.java`
- `backend/src/main/java/com/worshiproom/backend/auth/FirebaseAuthenticationFilter.java`
- `backend/src/main/java/com/worshiproom/backend/auth/SecurityConfig.java`
- `backend/src/main/java/com/worshiproom/backend/auth/AuthenticatedUser.java`

**Files to modify:**
- `backend/build.gradle.kts` (add firebase-admin dependency)
- `backend/src/main/resources/application.yml` (firebase config reference)
- `backend/src/main/resources/application-dev.yml` (firebase service account path)
- `backend/.gitignore` (ignore service account JSON files)

**Acceptance criteria:**
- Unauthenticated request to `/api/v1/health` returns 200 (public route).
- Unauthenticated request to any other `/api/v1/**` route returns 401.
- Request with a malformed token returns 401.
- Request with an expired token returns 401 with a specific error body indicating token expiry.
- Request with a valid token returns 200 (once we have an endpoint to test against in Spec 1.5).
- Integration test covers all four scenarios above.

**Out-of-band notes for Eric:** This spec requires you to set up a Firebase project in the Firebase Console first. The spec will include step-by-step instructions. The service account JSON file must be downloaded manually — it can't be committed. Store it at `backend/firebase-service-account.json` (already in gitignore) and reference it via the `FIREBASE_SERVICE_ACCOUNT_PATH` environment variable.

### Spec 1.5 — OpenAPI Spec Setup and Type Generation

- **ID:** `round3-phase01-spec05-openapi-setup`
- **Size:** M
- **Risk:** Low
- **Prerequisites:** 1.4
- **Goal:** Create the initial OpenAPI 3.1 specification file, wire it up for serving at `/api/docs` in dev, and configure the frontend to generate TypeScript types from the spec on every build.

**Approach:** Create `backend/api/openapi.yaml` with the health endpoint and a placeholder for the users endpoint (to be filled in Spec 1.6). Use Springdoc OpenAPI to serve a Swagger UI at `/api/docs` in dev and test profiles only (never prod). On the frontend, add `openapi-typescript` as a dev dependency, add an npm script `types:generate` that reads the backend's `openapi.yaml` and outputs TypeScript types to `frontend/src/types/api/generated.ts`. The generated file is gitignored (regenerated on demand) but the `types:generate` script is run as part of `npm run dev` and `npm run build`.

**Files to create:**
- `backend/api/openapi.yaml`
- `frontend/scripts/generate-api-types.sh` (wrapper around openapi-typescript)

**Files to modify:**
- `backend/build.gradle.kts` (add springdoc-openapi dependency)
- `backend/src/main/java/com/worshiproom/backend/health/HealthController.java` (add OpenAPI annotations)
- `frontend/package.json` (add openapi-typescript dev dependency, add types:generate script)
- `frontend/.gitignore` (ignore `src/types/api/generated.ts`)
- `frontend/vite.config.ts` (run types:generate before dev server starts)

**Acceptance criteria:**
- `./gradlew bootRun` serves Swagger UI at `http://localhost:8080/api/docs` in dev.
- Swagger UI does NOT serve in prod profile.
- `npm run types:generate` in the frontend produces `frontend/src/types/api/generated.ts`.
- The generated file contains a type for the health endpoint response.
- Frontend imports the generated type and uses it in a test call.
- `npm run dev` regenerates types on startup and does not fail if backend is offline (degrades gracefully to using the last-generated version).

### Spec 1.6 — User Registration Endpoint

- **ID:** `round3-phase01-spec06-user-registration`
- **Size:** M
- **Risk:** Medium
- **Prerequisites:** 1.5
- **Goal:** Implement `POST /api/v1/users` to create a new user row in the database after the frontend has registered the user with Firebase Auth. The endpoint requires a valid Firebase token; the backend extracts the UID from the token and uses it as the new user's `id`.

**Approach:** Controller at `UserController.java`. DTO for request body: `CreateUserRequest { firstName, lastName, displayNamePreference, email }`. DTO for response: `UserResponse { id, firstName, lastName, displayName, avatarUrl, bio, joinedAt, ... }`. Service layer (`UserService.java`) handles validation, insertion, and `displayName` computation. Repository layer (`UserRepository.java`) uses Spring Data JDBC. The UID comes from the Firebase token, not the request body — the frontend cannot claim to be a different user. Validation: email matches the token's email claim, first name and last name non-empty, display name preference is a valid enum value. OpenAPI spec updated to document the endpoint. Integration test with Testcontainers covers happy path, duplicate UID, email mismatch, validation failures.

**Files to create:**
- `backend/src/main/java/com/worshiproom/backend/user/UserController.java`
- `backend/src/main/java/com/worshiproom/backend/user/UserService.java`
- `backend/src/main/java/com/worshiproom/backend/user/UserRepository.java`
- `backend/src/main/java/com/worshiproom/backend/user/User.java` (record/entity)
- `backend/src/main/java/com/worshiproom/backend/user/dto/CreateUserRequest.java`
- `backend/src/main/java/com/worshiproom/backend/user/dto/UserResponse.java`
- `backend/src/main/java/com/worshiproom/backend/user/DisplayNameResolver.java` (pure function)
- `backend/src/test/java/com/worshiproom/backend/user/UserControllerIntegrationTest.java`
- `backend/src/test/java/com/worshiproom/backend/user/DisplayNameResolverTest.java`

**Files to modify:**
- `backend/api/openapi.yaml` (document the endpoint)

**Acceptance criteria:**
- `POST /api/v1/users` with a valid token and valid body creates a user row and returns 201 with the computed `displayName`.
- `POST /api/v1/users` without a token returns 401.
- `POST /api/v1/users` with a token UID that already exists returns 409 Conflict.
- `POST /api/v1/users` with an email that doesn't match the token's email claim returns 400.
- `POST /api/v1/users` with missing required fields returns 400 with field-level errors.
- Display name resolver correctly computes all 4 preference variants (unit test).
- Integration test covers all scenarios above and passes via Testcontainers.

### Spec 1.7 — Testcontainers Integration Test Infrastructure

- **ID:** `round3-phase01-spec07-testcontainers-setup`
- **Size:** M
- **Risk:** Low
- **Prerequisites:** 1.6 (uses the user endpoint as a test target)
- **Goal:** Establish the Testcontainers pattern used by all subsequent backend integration tests: real PostgreSQL container per test run, Liquibase migrations applied, test seed data loaded, teardown handled automatically.

**Approach:** Create an abstract `AbstractIntegrationTest` base class that uses Testcontainers' `@Container` annotation to spin up PostgreSQL 16 (matching dev). Spring Boot's `@DynamicPropertySource` injects the container's connection info into the test application context. `application-test.yml` sets Liquibase context to `test` so test-specific seed data loads. Test seed data is defined in `db/changelog/contexts/test-seed.xml`. Document the pattern in `backend/README.md` so every subsequent integration test follows it.

**Files to create:**
- `backend/src/test/java/com/worshiproom/backend/AbstractIntegrationTest.java`
- `backend/src/main/resources/db/changelog/contexts/test-seed.xml`

**Files to modify:**
- `backend/build.gradle.kts` (add testcontainers dependencies)
- `backend/src/main/resources/application-test.yml`
- `backend/src/main/resources/db/changelog/master.xml` (include contexts)
- `backend/src/test/java/com/worshiproom/backend/user/UserControllerIntegrationTest.java` (refactor to use AbstractIntegrationTest)
- `backend/README.md` (document the test pattern)

**Acceptance criteria:**
- `./gradlew test` runs the integration test from Spec 1.6 via Testcontainers.
- Test run time is acceptable (< 30 seconds for the current test suite, with the understanding it will grow).
- Each test method runs against a fresh database state (either via per-test containers or per-test transaction rollback — spec author picks).
- Test seed data loads only in the test context.
- Dev and production startup do not load test seed data.

### Spec 1.8 — Dev Seed Data Infrastructure

- **ID:** `round3-phase01-spec08-dev-seed-data`
- **Size:** S
- **Risk:** Low
- **Prerequisites:** 1.7
- **Goal:** Create a dev-context Liquibase changeset that seeds the local database with a small set of realistic users (2-5), so developers can work against non-empty data without having to register accounts manually every time.

**Approach:** New changeset `db/changelog/contexts/dev-seed.xml` with context `dev`. Inserts 2-5 user rows with hardcoded UUIDs, realistic names ("Sarah Johnson", "David Chen", etc.), matching emails, display preferences. The UIDs match test accounts that Eric can create in his local Firebase project, so logging in with those test accounts connects to pre-seeded user data. `application-dev.yml` sets Liquibase context to `dev`. Document in README how to reset the local database (docker compose down -v && up -d && bootRun).

**Files to create:**
- `backend/src/main/resources/db/changelog/contexts/dev-seed.xml`

**Files to modify:**
- `backend/src/main/resources/application-dev.yml` (set liquibase context)
- `backend/src/main/resources/db/changelog/master.xml` (include dev context)
- `backend/README.md` (document dev seed and reset commands)

**Acceptance criteria:**
- Starting the backend in dev mode with an empty database applies the seed changeset.
- Starting in test mode does NOT apply dev seed data.
- Starting in prod mode does NOT apply dev seed data.
- `docker compose down -v && docker compose up -d && ./gradlew bootRun` gives a clean dev database with seed data re-applied.

### Spec 1.9 — Frontend Firebase Auth Integration

- **ID:** `round3-phase01-spec09-frontend-firebase-auth`
- **Size:** L
- **Risk:** High (touches 121 files indirectly via AuthContext)
- **Prerequisites:** 1.8
- **Goal:** Rewrite `AuthContext.tsx` internally to use Firebase Auth instead of simulated localStorage auth, while keeping the exact same exported API so the 121 calling files continue to work unchanged. Gated behind a feature flag — the old simulated auth remains the default until we're confident.

**Approach:** Add Firebase SDK to frontend. Create a `FirebaseAuthProvider` component that wraps the app alongside (not replacing) the existing `AuthProvider`. A feature flag `VITE_USE_FIREBASE_AUTH` (default false) determines which provider is active. The `useAuth()` hook reads from whichever provider is active. Both providers expose the same `{ isAuthenticated, user: { name, id }, login, logout }` shape. The Firebase provider's `login(name)` is re-exported but internally it does nothing — real login happens through the AuthModal which calls Firebase SDK directly. Update AuthModal to use Firebase SDK for actual registration and login when the flag is on. When the flag is on and a user logs in for the first time, the frontend calls `POST /api/v1/users` to create the backend row.

**Files to create:**
- `frontend/src/lib/firebase.ts` (Firebase SDK initialization)
- `frontend/src/contexts/FirebaseAuthContext.tsx`

**Files to modify:**
- `frontend/package.json` (add firebase dependency)
- `frontend/.env.example` (document Firebase config env vars)
- `frontend/src/contexts/AuthContext.tsx` (dual provider switching via feature flag)
- `frontend/src/components/prayer-wall/AuthModal.tsx` (call Firebase SDK when flag is on)
- `frontend/src/App.tsx` (wrap app with FirebaseAuthProvider when flag is on)

**Acceptance criteria:**
- With `VITE_USE_FIREBASE_AUTH=false` (default), the app behaves exactly as before. All 121 useAuth() call sites work unchanged. All existing tests pass.
- With `VITE_USE_FIREBASE_AUTH=true`, clicking "Log In" opens the AuthModal, submitting a valid Firebase test account logs in successfully, and `useAuth().user.id` returns the Firebase UID.
- With the flag on, registering a new user via the AuthModal creates both a Firebase user and a backend user row, and the two are linked by UID.
- Existing tests continue to pass in both flag states.
- New tests cover the Firebase path.

**Out-of-band notes for Eric:** This is the highest-risk spec in Phase 1. The feature flag is non-negotiable — don't let CC "simplify" by removing it. We want the old simulated auth to keep working until Phase 2 is fully validated, so we have a rollback path if anything goes wrong.

### Spec 1.10 — End-to-End Round-Trip Test

- **ID:** `round3-phase01-spec10-end-to-end-roundtrip`
- **Size:** M
- **Risk:** Low (mostly verification)
- **Prerequisites:** 1.9
- **Goal:** Verify the entire Phase 1 stack works end-to-end by performing a full round-trip: frontend logs in via Firebase → frontend makes an authenticated GET request to a new `/api/v1/users/me` endpoint → backend validates token, looks up user, returns response → frontend renders the response using types from the OpenAPI generated file. This is the Phase 1 "done" proof.

**Approach:** Implement `GET /api/v1/users/me` on the backend (returns the authenticated user's full `UserResponse`). Add a temporary dev-only debug page at `/dev/backend-test` on the frontend that, when the Firebase flag is on, displays the result of calling `/api/v1/users/me`. Include a Playwright test that runs the full flow: seeds a dev user, logs in via Firebase, navigates to the debug page, asserts the displayed user matches the seed data. The debug page is temporary and will be removed in Phase 2.

**Files to create:**
- `backend/src/main/java/com/worshiproom/backend/user/UsersMeController.java` (or add to existing UserController)
- `frontend/src/pages/DevBackendTest.tsx`
- `frontend/e2e/phase01-roundtrip.spec.ts` (Playwright test)

**Files to modify:**
- `backend/api/openapi.yaml` (document `GET /api/v1/users/me`)
- `frontend/src/App.tsx` (add /dev/backend-test route in dev only)

**Acceptance criteria:**
- Logging in as a seeded dev user and navigating to `/dev/backend-test` shows that user's full profile.
- The displayed `displayName` matches the seed data's expected computed value.
- Unauthenticated access to `/api/v1/users/me` returns 401.
- Playwright test passes.
- Phase 1 is officially done.

**Out-of-band notes for Eric:** When this spec passes, take a break. You just shipped your first backend. This is a big deal. The rest of Round 3 builds on this foundation but doesn't require the same level of concept-learning you just did — Phase 2 will feel easier.

---

*Phase 0 and Phase 1 complete. Phases 2-10 follow in subsequent sections.*

## Phase 2 — Activity Engine Migration

> **Phase purpose:** Move the faith points, streaks, badges, and activity recording system from localStorage to the backend. Every feature in the app that calls `recordActivity()` will route through the new API after this phase, but individual features' own data (Daily Hub drafts, Bible highlights, etc.) stays on localStorage.

**What this phase accomplishes:** After Phase 2, a user's faith points, level, streak, grace days, and badge state all persist on the backend and sync across devices automatically. The reaction-persistence bug for Prayer Wall is NOT fixed yet (that's Phase 3). But the gamification layer that Prayer Wall writes to is now solid.

**Sequencing notes:** This phase has a strict order: schema → backend logic → API → frontend migration. The feature flag from Phase 1.9 extends here — when `VITE_USE_BACKEND_ACTIVITY` is off, the frontend continues to use localStorage for activity recording. When it's on, it hits the new API. Both paths work until the flag is flipped.

**Phase-level definition of done:**
- Backend has tables for `activity_log`, `faith_points`, `streak_state`, `user_badges`, `activity_counts`.
- `POST /api/v1/activity` is the single endpoint for recording any activity from any feature.
- `GET /api/v1/users/me/stats` returns the user's current points, level, streak, grace days, and earned badges.
- Badge engine runs server-side on activity recording and returns newly earned badges in the API response.
- Grace periods and grief pause are implemented at the database level and enforced by the streak engine.
- Frontend `useFaithPoints()` hook and badge-related hooks work identically whether the feature flag is on or off.
- Existing localStorage data is NOT automatically migrated — users who were active with the simulated auth start fresh. This is acceptable because simulated auth was never promoted as real.

### Spec 2.1 — Activity Log and Counters Schema

- **ID:** `round3-phase02-spec01-activity-schema`
- **Size:** M
- **Risk:** Low
- **Prerequisites:** Phase 1 complete
- **Goal:** Create Liquibase changesets for the `activity_log`, `faith_points`, `streak_state`, `user_badges`, and `activity_counts` tables per the Architectural Foundation, including appropriate indexes for the query patterns we'll use (user_id lookups, date-range queries, badge existence checks).

**Approach:** Five separate changesets, one per table, in order: `faith_points` → `streak_state` → `activity_counts` → `user_badges` → `activity_log`. Each table's schema exactly matches the Architectural Foundation specification. Indexes: `activity_log(user_id, occurred_at DESC)` for recent-activity queries, `activity_counts(user_id, count_type)` composite primary key, `user_badges(user_id, badge_id)` composite primary key, `faith_points` and `streak_state` use `user_id` as primary key (one row per user). All tables have foreign key to `users(id)` with `ON DELETE CASCADE` — deleting a user cleanly removes their activity data.

**Files to create:**
- `backend/src/main/resources/db/changelog/2026-04-14-004-create-faith-points-table.xml`
- `backend/src/main/resources/db/changelog/2026-04-14-005-create-streak-state-table.xml`
- `backend/src/main/resources/db/changelog/2026-04-14-006-create-activity-counts-table.xml`
- `backend/src/main/resources/db/changelog/2026-04-14-007-create-user-badges-table.xml`
- `backend/src/main/resources/db/changelog/2026-04-14-008-create-activity-log-table.xml`

**Files to modify:**
- `backend/src/main/resources/db/changelog/master.xml` (include new changesets)

**Acceptance criteria:**
- All five tables exist after running migrations.
- All foreign key constraints active and tested (deleting a user cascades correctly).
- All indexes present and queryable.
- Integration test creates a user, inserts rows in each activity table, verifies reads work.

### Spec 2.2 — Faith Points Calculation Service

- **ID:** `round3-phase02-spec02-faith-points-service`
- **Size:** M
- **Risk:** Medium
- **Prerequisites:** 2.1
- **Goal:** Implement the backend service that calculates faith points for an activity, applies the daily multiplier tier, updates the user's `faith_points` row, and detects level-ups. Port the logic from `frontend/src/constants/dashboard/activity-points.ts` and `frontend/src/constants/dashboard/levels.ts` to the backend as the authoritative source.

**Approach:** `FaithPointsService.java` with a `recordActivity(userId, activityType)` method. Reads today's activity count for the user from `activity_counts`, determines multiplier tier from the canonical tiers (Full Worship Day 2x, Devoted 1.5x, Growing 1.25x, base 1x), looks up base points from a constant map matching the frontend's `ACTIVITY_POINTS` exactly, calculates final points earned, updates `faith_points.total_points`, checks if the new total crosses a level threshold, updates `current_level` if so. Returns a `FaithPointsUpdateResult` record containing: points earned, new total, new level, level_up boolean, multiplier tier applied. Pure calculation logic (tier computation, level detection) has unit tests. Database-touching logic has integration tests.

**Files to create:**
- `backend/src/main/java/com/worshiproom/backend/activity/FaithPointsService.java`
- `backend/src/main/java/com/worshiproom/backend/activity/FaithPointsRepository.java`
- `backend/src/main/java/com/worshiproom/backend/activity/constants/ActivityPoints.java` (enum or map)
- `backend/src/main/java/com/worshiproom/backend/activity/constants/LevelThresholds.java`
- `backend/src/main/java/com/worshiproom/backend/activity/constants/MultiplierTiers.java`
- `backend/src/main/java/com/worshiproom/backend/activity/dto/FaithPointsUpdateResult.java`
- `backend/src/test/java/com/worshiproom/backend/activity/FaithPointsServiceTest.java` (unit tests)
- `backend/src/test/java/com/worshiproom/backend/activity/FaithPointsServiceIntegrationTest.java`

**Acceptance criteria:**
- Point values in the `ActivityPoints` constant exactly match the frontend's `ACTIVITY_POINTS` map. A failing test catches drift if either side changes without updating the other.
- Level thresholds exactly match the frontend's `LEVEL_THRESHOLDS` (Seedling 0, Sprout 100, Blooming 500, Flourishing 1500, Oak 4000, Lighthouse 10000).
- Multiplier tiers exactly match the frontend's `MULTIPLIER_TIERS`.
- Unit test covers: base calculation, each multiplier tier, level-up detection at each boundary, no-level-up within a level.
- Integration test covers: two consecutive activities, first puts user at 95 points, second adds enough to cross the 100 threshold (level up from 1 to 2), result reflects level_up=true.

### Spec 2.3 — Streak State Service with Grace Periods

- **ID:** `round3-phase02-spec03-streak-service`
- **Size:** L
- **Risk:** Medium
- **Prerequisites:** 2.2
- **Goal:** Implement the streak engine with grace periods and grief pause support per the Architectural Foundation. This is the most nuanced piece of activity logic in Round 3.

**Approach:** `StreakService.java` with `updateStreak(userId)` method called whenever an activity is recorded. Reads `streak_state` for the user. Computes the difference between today (user's local time — requires timezone handling; for Phase 2 use server time and accept a minor bug that will be fixed in a later spec) and `last_active_date`. Five cases: (a) same day, no change; (b) yesterday, increment `current_streak`, update `last_active_date`, check if new `current_streak > longest_streak`; (c) gap of 1-2 days AND available grace days, consume grace days, increment streak as if consecutive; (d) `grief_pause_until` is set and today is before it, no streak change regardless; (e) gap of 3+ days OR grace days exhausted AND no grief pause active, reset `current_streak` to 1. Grace days reset every Monday at midnight (server time for now). Returns a `StreakUpdateResult` with: new current streak, new longest streak, whether the streak broke, whether grace days were used, grace days remaining.

**Files to create:**
- `backend/src/main/java/com/worshiproom/backend/activity/StreakService.java`
- `backend/src/main/java/com/worshiproom/backend/activity/StreakRepository.java`
- `backend/src/main/java/com/worshiproom/backend/activity/dto/StreakUpdateResult.java`
- `backend/src/test/java/com/worshiproom/backend/activity/StreakServiceTest.java`
- `backend/src/test/java/com/worshiproom/backend/activity/StreakServiceIntegrationTest.java`

**Acceptance criteria:**
- Unit test covers every case above including edge cases (exactly at midnight, exactly at grace day boundary).
- Integration test: user with 5-day streak, logs activity same day (no change); next day (streak = 6); skips a day then logs (streak = 7 via grace day consumption); skips two days then logs (streak resets to 1 since grace days exhausted).
- Integration test: user activates grief pause, skips 5 days, then logs activity — streak unchanged.
- Grace day reset logic verified: Sunday's activity uses grace day, Monday's new week starts with 2 grace days again.
- Longest streak never decreases.

**Out-of-band notes for Eric:** The "user's local time" problem is real but we're explicitly deferring it to Phase 11 or later. Phase 2 uses UTC consistently, which means someone in California might lose a streak an hour earlier than they expect. Document this in the spec's known issues section.

### Spec 2.4 — Badge Engine Service

- **ID:** `round3-phase02-spec04-badge-engine-service`
- **Size:** L
- **Risk:** High
- **Prerequisites:** 2.3
- **Goal:** Port the badge engine logic from `frontend/src/services/badge-engine.ts` to the backend as the authoritative badge checker. On every activity, the backend determines which badges the user just earned and returns them in the API response.

**Approach:** `BadgeEngineService.java` with `checkForNewBadges(userId, activityType, activityContext)` method. Reads user's current `activity_counts`, `user_badges`, `faith_points`, and `streak_state` into a `BadgeCheckContext` record. Runs each of the 14 badge trigger categories from the frontend's existing engine (streak, level, activity milestones, full worship day, friends, encouragements, reading plans, local support, Bible books, meditation sessions, prayer wall posts, intercessions, Bible chapters, gratitude). Returns a list of newly earned badge IDs. Each newly earned badge is inserted into `user_badges` with the current timestamp. Badge definitions (name, description, icon, celebration tier) live in a constants file that mirrors `frontend/src/constants/dashboard/badges.ts` exactly. A drift-detection test ensures backend and frontend badge lists match.

**Files to create:**
- `backend/src/main/java/com/worshiproom/backend/activity/BadgeEngineService.java`
- `backend/src/main/java/com/worshiproom/backend/activity/BadgeRepository.java`
- `backend/src/main/java/com/worshiproom/backend/activity/constants/BadgeDefinitions.java`
- `backend/src/main/java/com/worshiproom/backend/activity/dto/BadgeCheckContext.java`
- `backend/src/main/java/com/worshiproom/backend/activity/dto/NewBadgeResult.java`
- `backend/src/test/java/com/worshiproom/backend/activity/BadgeEngineServiceTest.java`
- `backend/src/test/java/com/worshiproom/backend/activity/BadgeEngineServiceIntegrationTest.java`
- `backend/src/test/java/com/worshiproom/backend/activity/BadgeDefinitionsDriftTest.java` (parses the frontend TS file and asserts parity)

**Acceptance criteria:**
- All 45+ badges from the frontend exist in the backend constants file with identical IDs, names, and trigger conditions.
- The drift-detection test passes: any change to frontend badges must be mirrored to backend or the test fails loudly.
- Unit tests cover each of the 14 badge trigger categories with at least one positive and one negative case each.
- Integration test: user completes 1st prayer ever, response includes `first_prayer` badge. User completes 100th prayer, response includes `prayer_100` badge. User already had `first_prayer`, does not re-earn it.
- Repeatable badges (Full Worship Day) increment `display_count` correctly.

### Spec 2.5 — Unified Activity Recording Endpoint

- **ID:** `round3-phase02-spec05-activity-endpoint`
- **Size:** M
- **Risk:** Medium
- **Prerequisites:** 2.4
- **Goal:** Implement `POST /api/v1/activity` as the single entry point that every feature calls to record an activity. The endpoint orchestrates faith points calculation, streak update, badge check, and counter increments in one transactional unit.

**Approach:** `ActivityController.java` with one POST endpoint. Request body: `{ activityType, sourceFeature, metadata }`. Transactional service method calls `FaithPointsService` → `StreakService` → `ActivityCountsService` (increments the counter for this activity type) → `BadgeEngineService`. Also inserts a row in `activity_log` for audit/timeline purposes. Returns the composed result: `ActivityRecordedResponse { pointsEarned, totalPoints, currentLevel, levelUp, streak: { current, longest, newToday, graceUsed }, newBadges: [...], multiplierTier }`. All state changes happen in a single database transaction — if any step fails, everything rolls back.

**Files to create:**
- `backend/src/main/java/com/worshiproom/backend/activity/ActivityController.java`
- `backend/src/main/java/com/worshiproom/backend/activity/ActivityService.java`
- `backend/src/main/java/com/worshiproom/backend/activity/ActivityLogRepository.java`
- `backend/src/main/java/com/worshiproom/backend/activity/dto/RecordActivityRequest.java`
- `backend/src/main/java/com/worshiproom/backend/activity/dto/ActivityRecordedResponse.java`
- `backend/src/test/java/com/worshiproom/backend/activity/ActivityControllerIntegrationTest.java`

**Files to modify:**
- `backend/api/openapi.yaml` (document the endpoint and response schema)

**Acceptance criteria:**
- Valid request creates entries in all four tables (activity_log, faith_points, streak_state update, activity_counts increment, potentially user_badges) in one transaction.
- If badge engine throws an exception mid-transaction, nothing persists (transaction rollback verified).
- Response shape matches OpenAPI spec exactly.
- Integration test covers: first activity of the day (no streak update needed, faith points credited, activity logged), activity that triggers level-up (response reflects levelUp: true), activity that triggers badge (newBadges array populated).

### Spec 2.6 — User Stats Read Endpoint

- **ID:** `round3-phase02-spec06-user-stats-endpoint`
- **Size:** S
- **Risk:** Low
- **Prerequisites:** 2.5
- **Goal:** Implement `GET /api/v1/users/me/stats` which returns the authenticated user's full gamification state for dashboard rendering.

**Approach:** Controller reads from `faith_points`, `streak_state`, `user_badges`, and `activity_counts`, composes into a single `UserStatsResponse` with fields for total points, current level, level name, points to next level, current streak, longest streak, grace days remaining, grief pause status, all earned badges with their earn timestamps, and activity counts broken down by type. This is a read-heavy endpoint — used by the dashboard widget on every load.

**Files to create:**
- `backend/src/main/java/com/worshiproom/backend/user/UserStatsController.java`
- `backend/src/main/java/com/worshiproom/backend/user/dto/UserStatsResponse.java`
- `backend/src/test/java/com/worshiproom/backend/user/UserStatsControllerIntegrationTest.java`

**Files to modify:**
- `backend/api/openapi.yaml`

**Acceptance criteria:**
- Authenticated GET returns the user's full stats.
- Response shape matches the frontend's current `useFaithPoints()` return type so the service swap in Spec 2.8 is trivial.
- New users (just registered, no activity yet) get back sensible defaults: 0 points, level 1 (Seedling), 0 streak, 2 grace days, empty badges array.

### Spec 2.7 — Grief Pause Endpoint

- **ID:** `round3-phase02-spec07-grief-pause-endpoint`
- **Size:** S
- **Risk:** Low
- **Prerequisites:** 2.6
- **Goal:** Implement `POST /api/v1/users/me/grief-pause` to allow users to trigger a 7-day streak pause from their profile settings.

**Approach:** Controller method, service updates `streak_state.grief_pause_until` to 7 days from now. Rate-limited to once per 30 days (enforced in service layer — returns 429 if user tries to re-pause within 30 days of the last pause). Also implement `DELETE /api/v1/users/me/grief-pause` to cancel an active pause early if the user chooses. Document the 30-day limit in the error response body.

**Files to create:**
- `backend/src/main/java/com/worshiproom/backend/user/GriefPauseController.java`
- `backend/src/main/java/com/worshiproom/backend/user/GriefPauseService.java`
- `backend/src/test/java/com/worshiproom/backend/user/GriefPauseControllerIntegrationTest.java`

**Files to modify:**
- `backend/api/openapi.yaml`

**Acceptance criteria:**
- POST creates a 7-day pause window.
- Second POST within 30 days returns 429 with the date when next pause is available.
- DELETE clears the pause immediately.
- Integration test covers all three flows.

### Spec 2.8 — Frontend Activity Service Swap

- **ID:** `round3-phase02-spec08-frontend-activity-swap`
- **Size:** L
- **Risk:** High
- **Prerequisites:** 2.7
- **Goal:** Replace the localStorage-backed `recordActivity()` and `useFaithPoints()` hook implementations with API-backed equivalents, gated behind a feature flag. Existing call sites (Daily Hub, Prayer Wall, etc.) work identically in both flag states.

**Approach:** Create `frontend/src/services/api/activity-api.ts` that implements the same public API as `faith-points-storage.ts`. The `useFaithPoints()` hook is updated to read from whichever service is active based on `VITE_USE_BACKEND_ACTIVITY`. When the flag is on, `recordActivity()` becomes an async POST to `/api/v1/activity`. The hook manages loading state and cached state for instant UI feedback (optimistic updates with server reconciliation). Badge celebrations, level-up overlays, and streak animations continue to work — they're driven by the API response shape which matches the old shape. All existing tests keep passing in both flag states.

**Files to create:**
- `frontend/src/services/api/activity-api.ts`
- `frontend/src/services/api/user-stats-api.ts`
- `frontend/src/hooks/useFaithPoints.ts` (refactored — likely keeps the same name, gains internal branching)
- `frontend/src/hooks/__tests__/useFaithPoints.api.test.ts`

**Files to modify:**
- `frontend/src/services/faith-points-storage.ts` (no changes, kept for fallback path)
- `frontend/src/hooks/useFaithPoints.ts` (if it exists; if it's inside another file, refactor accordingly)
- `frontend/src/services/badge-storage.ts` (partial — the local badge cache may still be useful for offline; document in spec)
- `frontend/.env.example` (document new flag)

**Acceptance criteria:**
- With `VITE_USE_BACKEND_ACTIVITY=false`, behavior is identical to pre-Phase-2 state. All 121 useAuth call sites work. All existing tests pass.
- With the flag on, recording an activity on any feature (Daily Hub, Prayer Wall, Meditate, etc.) calls the backend and updates local state with the server response.
- Optimistic UI: clicking "Pray" on a meditation completion shows the points animation immediately, reconciles when the server responds.
- Celebration overlays and badge toasts still fire correctly.
- Offline behavior: with the flag on, recording an activity while offline queues it for later sync (or fails gracefully with a toast — spec picks). This is the key behavioral decision documented in the spec.

**Out-of-band notes for Eric:** This spec is where the backend starts doing real work. After this ships and you've tested it, you'll want to flip the flag for yourself and live with it for a few days before committing to keeping it on for everyone.

### Spec 2.9 — Phase 2 Smoke Test and Cutover

- **ID:** `round3-phase02-spec09-phase2-smoke-test`
- **Size:** S
- **Risk:** Low
- **Prerequisites:** 2.8
- **Goal:** End-to-end verification that every existing feature continues to work correctly with the backend activity engine enabled, and document the cutover process.

**Approach:** A Playwright test that logs in, performs at least one activity on each of the following features: Daily Hub Pray tab, Daily Hub Journal tab, Daily Hub Meditate tab, mood check-in, Prayer Wall (post + pray + comment), and verifies that points increment, streak tracks, and any triggered badges fire celebration overlays. Also a manual cutover checklist Eric walks through before flipping `VITE_USE_BACKEND_ACTIVITY` to true by default.

**Files to create:**
- `frontend/e2e/phase02-activity-smoke.spec.ts`
- `docs/round3/phase02-cutover-checklist.md`

**Acceptance criteria:**
- Playwright test passes with the feature flag on.
- Manual checklist items are all green.
- Phase 2 is officially done.

---

## Phase 3 — Prayer Wall Data Migration

> **Phase purpose:** Move the Prayer Wall data layer to the backend. This is the phase where the reactions-lost-on-navigation bug gets fixed, where posts actually persist across devices, and where the infrastructure for the five post types gets built (Phase 4 then adds the type-specific UI on top).

**What this phase accomplishes:** After Phase 3, every Prayer Wall action (posting, commenting, reacting, bookmarking, marking answered, reporting) persists on the backend. The reaction state is unified across all four views (feed, detail, profile, dashboard) — clicking "pray" on the feed and navigating to the detail page shows the same state. The infrastructure supports all five post types at the schema and API level, even though only Prayer Requests are exposed in the UI until Phase 4.

**Sequencing notes:** Schema comes first. Then read endpoints before write endpoints. Frontend service swap happens last and is the "moment of truth" for the whole phase. Visual changes are explicitly deferred to Phase 5 — this phase keeps the existing visual style, only changes the data layer.

**Phase-level definition of done:**
- Posts, comments, reactions, bookmarks, reports, and QOTD all have backend tables.
- Full read/write API coverage for Prayer Wall.
- Frontend uses the API when `VITE_USE_BACKEND_PRAYER_WALL` is on.
- Reaction state is unified: one action on any view is reflected on every view.
- Bookmarks persist across logout and navigation.
- The `usePrayerReactions` hook is gone (or is a trivial passthrough) — reactions come from the API.

### Spec 3.1 — Posts Table Schema

- **ID:** `round3-phase03-spec01-posts-schema`
- **Size:** M
- **Risk:** Low
- **Prerequisites:** Phase 2 complete
- **Goal:** Create the `posts` table per the Architectural Foundation Decision 2, including all type-specific nullable columns, moderation status, denormalized counters, and appropriate indexes.

**Approach:** Single Liquibase changeset creating the `posts` table. Indexes: `(user_id)` for author lookups, `(post_type, created_at DESC)` for feed queries filtered by type, `(created_at DESC)` for the unified feed, `(challenge_id)` for challenge-filtered views, `(last_activity_at DESC)` for freshness sort, `(moderation_status)` for moderation queue. Partial index on `(is_answered, answered_at DESC) WHERE post_type = 'prayer_request'` for the Answered Prayer Wall feature.

**Files to create:**
- `backend/src/main/resources/db/changelog/2026-04-14-009-create-posts-table.xml`

**Files to modify:**
- `backend/src/main/resources/db/changelog/master.xml`

**Acceptance criteria:**
- Table exists with exact column names and types from the Architectural Foundation.
- All indexes present.
- Foreign key to `users(id)` works with cascade delete.
- `post_type` enum is a database-level CHECK constraint or enum type.

### Spec 3.2 — Comments, Reactions, Bookmarks, Reports Schemas

- **ID:** `round3-phase03-spec02-interaction-schemas`
- **Size:** M
- **Risk:** Low
- **Prerequisites:** 3.1
- **Goal:** Create the four interaction tables: `post_comments`, `post_reactions`, `post_bookmarks`, `post_reports`. These support every post type uniformly.

**Approach:** Four separate changesets. `post_comments` has: id, post_id, user_id, content, created_at, moderation_status, is_deleted. `post_reactions` has: post_id, user_id, reaction_type (for now just 'praying', but the column allows future expansion), created_at, composite primary key on (post_id, user_id, reaction_type). `post_bookmarks` has: post_id, user_id, created_at, composite primary key on (post_id, user_id). `post_reports` has: id, post_id, reporter_user_id, reason, notes, created_at, reviewed_at, reviewed_by_user_id, resolution (enum). Indexes on all foreign keys and on common query patterns.

**Files to create:**
- `backend/src/main/resources/db/changelog/2026-04-14-010-create-post-comments-table.xml`
- `backend/src/main/resources/db/changelog/2026-04-14-011-create-post-reactions-table.xml`
- `backend/src/main/resources/db/changelog/2026-04-14-012-create-post-bookmarks-table.xml`
- `backend/src/main/resources/db/changelog/2026-04-14-013-create-post-reports-table.xml`

**Acceptance criteria:**
- All four tables exist with proper foreign keys and indexes.
- Composite primary keys enforce one-reaction-per-user-per-type and one-bookmark-per-user constraints.
- Cascade delete from posts works for all four interaction tables.

### Spec 3.3 — QOTD Schema and Seed

- **ID:** `round3-phase03-spec03-qotd-schema`
- **Size:** S
- **Risk:** Low
- **Prerequisites:** 3.2
- **Goal:** Create a `questions_of_the_day` table and seed it with the existing 72 QOTD entries from `frontend/src/constants/question-of-the-day.ts`.

**Approach:** Table columns: id (string matching existing IDs), question_text, category, is_liturgical, liturgical_season, active_date. A prod-context seed changeset inserts all 72 entries. Active date rotation: existing frontend logic will migrate to query the backend for "today's QOTD" rather than computing from a local constant. The backend computes which QOTD is active based on server date and returns it in the feed response.

**Files to create:**
- `backend/src/main/resources/db/changelog/2026-04-14-014-create-qotd-table.xml`
- `backend/src/main/resources/db/changelog/2026-04-14-015-seed-qotd-entries.xml`

**Acceptance criteria:**
- 72 rows exist after seed.
- Seed changeset runs in all contexts (prod, dev, test) because QOTDs are reference data, not dev-only.

### Spec 3.4 — Post Read API (Feed and Detail)

- **ID:** `round3-phase03-spec04-post-read-api`
- **Size:** L
- **Risk:** Medium
- **Prerequisites:** 3.3
- **Goal:** Implement `GET /api/v1/posts` (feed with filters and sorts) and `GET /api/v1/posts/{id}` (single post with full comment thread). Includes the current user's reaction and bookmark state in the response so the frontend can render toggled states without a separate call.

**Approach:** Feed endpoint supports query params: `postType` (filter), `category` (filter), `sort` (fresh, trending, answered, needs_prayer), `limit` (default 20, max 50), `cursor` (opaque pagination). Response includes posts, each with `authorDisplayName` or "Anonymous", `authorAvatarUrl`, `currentUserIsPraying` boolean, `currentUserHasBookmarked` boolean, `currentUserIsAuthor` boolean, and `prayingCount`/`commentCount`/`bookmarkCount` from the denormalized counters. Detail endpoint includes all comments sorted by created_at ASC. Both endpoints respect `moderation_status` — hidden/removed posts are not returned to non-moderators. Anonymous posts return `authorDisplayName: "Anonymous"` regardless of the viewer's relationship to the author. Authors can see their own anonymous posts in their dashboard but not in any public view.

**Files to create:**
- `backend/src/main/java/com/worshiproom/backend/post/PostController.java`
- `backend/src/main/java/com/worshiproom/backend/post/PostService.java`
- `backend/src/main/java/com/worshiproom/backend/post/PostRepository.java`
- `backend/src/main/java/com/worshiproom/backend/post/Post.java`
- `backend/src/main/java/com/worshiproom/backend/post/dto/PostResponse.java`
- `backend/src/main/java/com/worshiproom/backend/post/dto/PostListResponse.java`
- `backend/src/main/java/com/worshiproom/backend/post/dto/CommentResponse.java`
- `backend/src/main/java/com/worshiproom/backend/post/constants/PostType.java` (enum)
- `backend/src/main/java/com/worshiproom/backend/post/constants/PostSort.java` (enum)
- `backend/src/test/java/com/worshiproom/backend/post/PostControllerReadIntegrationTest.java`

**Files to modify:**
- `backend/api/openapi.yaml`

**Acceptance criteria:**
- Feed returns posts in requested sort order with pagination.
- Filtering by postType and category works correctly.
- Current user's reaction/bookmark state is accurate per post.
- Anonymous posts show "Anonymous" regardless of viewer.
- Hidden/removed posts are excluded for non-moderators.
- Sort mode `needs_prayer` surfaces posts with fewest interactions first (the anti-Reddit sort).
- Sort mode `answered` returns only `post_type = 'prayer_request' AND is_answered = true` in answered_at DESC order.

### Spec 3.5 — Post Write API (Create, Update, Delete)

- **ID:** `round3-phase03-spec05-post-write-api`
- **Size:** L
- **Risk:** Medium
- **Prerequisites:** 3.4
- **Goal:** Implement `POST /api/v1/posts`, `PATCH /api/v1/posts/{id}`, and `DELETE /api/v1/posts/{id}`. Includes integration with the activity engine (recording a post earns faith points and may trigger badges).

**Approach:** POST validates request body against post type (prayer request requires content, testimony requires content, encouragement has max length, etc.), inserts post row, calls `ActivityService.recordActivity(userId, 'prayer_wall')` which returns the activity result, and includes the activity result in the post creation response so the frontend can fire celebrations. Runs existing crisis detection on content server-side — if crisis keywords present, sets `crisis_flag = true` and returns a `crisisDetected: true` field in the response (frontend shows crisis resources). PATCH allows the author to edit `content`, `category`, `is_answered`, `answered_text` (prayer requests only). DELETE is a soft delete (sets `is_deleted = true`). Only the author can edit or delete their own posts (enforced via authenticated user ID check).

**Files to create:**
- `backend/src/main/java/com/worshiproom/backend/post/dto/CreatePostRequest.java`
- `backend/src/main/java/com/worshiproom/backend/post/dto/UpdatePostRequest.java`
- `backend/src/main/java/com/worshiproom/backend/post/dto/CreatePostResponse.java`
- `backend/src/main/java/com/worshiproom/backend/post/CrisisDetectionService.java`
- `backend/src/test/java/com/worshiproom/backend/post/PostControllerWriteIntegrationTest.java`

**Acceptance criteria:**
- POST creates a prayer request, records activity, returns the post with embedded activity result.
- POST with crisis keywords sets crisis_flag and returns crisisDetected: true.
- PATCH allows author to mark prayer answered with text.
- PATCH by non-author returns 403.
- DELETE soft-deletes and removes from feed queries.
- All five post types validate correctly — testimony without content fails, encouragement over 280 chars fails, etc.

### Spec 3.6 — Reactions and Bookmarks API

- **ID:** `round3-phase03-spec06-reactions-bookmarks-api`
- **Size:** M
- **Risk:** Medium
- **Prerequisites:** 3.5
- **Goal:** Implement `POST /api/v1/posts/{id}/react`, `DELETE /api/v1/posts/{id}/react`, `POST /api/v1/posts/{id}/bookmark`, `DELETE /api/v1/posts/{id}/bookmark`. **This is the spec that fixes the reactions-lost-on-navigation bug.** Every reaction and bookmark persists to the backend transactionally.

**Approach:** Reaction POST inserts a row in `post_reactions` with the current user's ID and increments `posts.praying_count` in the same transaction. Reaction DELETE removes the row and decrements the counter. Bookmark POST/DELETE is analogous with `posts.bookmark_count`. Reacting to one's own post does NOT record activity (you can't "intercess" for yourself), but reacting to someone else's post calls `ActivityService.recordActivity(userId, 'prayer_wall')` for the intercession counter. Also fires a notification to the post author (in-app only for Phase 3; push notification wiring comes in Phase 10). Returns the updated post state (new counts, user's reaction state).

**Files to create:**
- `backend/src/main/java/com/worshiproom/backend/post/ReactionController.java`
- `backend/src/main/java/com/worshiproom/backend/post/ReactionService.java`
- `backend/src/main/java/com/worshiproom/backend/post/BookmarkController.java`
- `backend/src/main/java/com/worshiproom/backend/post/BookmarkService.java`
- `backend/src/test/java/com/worshiproom/backend/post/ReactionControllerIntegrationTest.java`
- `backend/src/test/java/com/worshiproom/backend/post/BookmarkControllerIntegrationTest.java`

**Acceptance criteria:**
- Reacting to a post increments praying_count and creates a post_reactions row.
- Un-reacting reverses both.
- Reacting twice in a row (without DELETE in between) is idempotent — no duplicate rows, no double-count.
- Reacting to own post doesn't record activity.
- Reacting to another's post increments their intercession counter and potentially triggers the intercessor_25 badge.
- Bookmarks persist across logout and navigation.
- Integration test verifies end-to-end reaction toggle with count updates.

### Spec 3.7 — Comments API

- **ID:** `round3-phase03-spec07-comments-api`
- **Size:** M
- **Risk:** Low
- **Prerequisites:** 3.6
- **Goal:** Implement `POST /api/v1/posts/{id}/comments`, `PATCH /api/v1/comments/{id}`, `DELETE /api/v1/comments/{id}`, and cover the `GET` via the existing post detail endpoint.

**Approach:** POST validates content, inserts row in `post_comments`, increments `posts.comment_count`, records activity for the commenter (5 pts), fires notification to the post author if author isn't the commenter. PATCH allows the commenter to edit their own comment within 15 minutes of creation (after that, edits are locked to prevent rewriting history after others have read). DELETE is a soft delete. Running crisis detection on comment content just like on posts.

**Files to create:**
- `backend/src/main/java/com/worshiproom/backend/post/CommentController.java`
- `backend/src/main/java/com/worshiproom/backend/post/CommentService.java`
- `backend/src/main/java/com/worshiproom/backend/post/CommentRepository.java`
- `backend/src/main/java/com/worshiproom/backend/post/dto/CreateCommentRequest.java`
- `backend/src/test/java/com/worshiproom/backend/post/CommentControllerIntegrationTest.java`

**Acceptance criteria:**
- Creating a comment inserts the row, increments count, records activity, fires notification.
- Editing within 15 minutes works; editing after 15 minutes returns 403 with a specific error message.
- Deleting a comment soft-deletes and decrements count.
- Crisis detection on comment body works.

### Spec 3.8 — Reports API

- **ID:** `round3-phase03-spec08-reports-api`
- **Size:** M
- **Risk:** Low
- **Prerequisites:** 3.7
- **Goal:** Implement `POST /api/v1/posts/{id}/report` and `POST /api/v1/comments/{id}/report` to capture user reports. No moderation queue yet — that's Phase 10. This spec just captures the reports.

**Approach:** Reports land in `post_reports` with a `reason` enum (spam, inappropriate, harassment, self-harm-concern, other), optional `notes`, `created_at`, `reviewed_at = null`, `resolution = null`. A user can only report a given post once — composite unique constraint on `(post_id, reporter_user_id)`. Reporting a post sets its `moderation_status` to `flagged` if it wasn't already (Phase 10 adds the review workflow).

**Files to create:**
- `backend/src/main/java/com/worshiproom/backend/moderation/ReportController.java`
- `backend/src/main/java/com/worshiproom/backend/moderation/ReportService.java`
- `backend/src/main/java/com/worshiproom/backend/moderation/ReportRepository.java`
- `backend/src/main/java/com/worshiproom/backend/moderation/dto/CreateReportRequest.java`
- `backend/src/test/java/com/worshiproom/backend/moderation/ReportControllerIntegrationTest.java`

**Acceptance criteria:**
- Reporting a post creates a report row and flags the post.
- Reporting the same post twice returns 409.
- Integration test covers create and duplicate scenarios.

### Spec 3.9 — Frontend Prayer Wall Service Swap

- **ID:** `round3-phase03-spec09-frontend-prayer-wall-swap`
- **Size:** XL
- **Risk:** High
- **Prerequisites:** 3.8
- **Goal:** Replace all Prayer Wall data access in the frontend with API calls, gated behind `VITE_USE_BACKEND_PRAYER_WALL`. This is the spec where the reaction bug finally gets fixed.

**Approach:** Create `frontend/src/services/api/prayer-wall-api.ts` with functions matching the current access patterns: `fetchPrayers(filters)`, `fetchPrayerDetail(id)`, `createPrayer(data)`, `togglePraying(id)`, `toggleBookmark(id)`, `addComment(postId, content)`, etc. Rewrite `usePrayerReactions` to read from a shared context (not per-page state) that subscribes to the API. The four pages that currently instantiate separate `usePrayerReactions` hooks (PrayerWall, PrayerWallDashboard, PrayerDetail, PrayerWallProfile) all now read from the same source. Mock data imports are removed. Feature flag gates the whole swap — with the flag off, everything falls back to mock data as before.

**Files to create:**
- `frontend/src/services/api/prayer-wall-api.ts`
- `frontend/src/contexts/PrayerWallReactionsContext.tsx`
- `frontend/src/hooks/usePrayerWallFeed.ts`
- `frontend/src/hooks/usePrayerWallPost.ts`

**Files to modify:**
- `frontend/src/pages/PrayerWall.tsx`
- `frontend/src/pages/PrayerWallDashboard.tsx`
- `frontend/src/pages/PrayerDetail.tsx`
- `frontend/src/pages/PrayerWallProfile.tsx`
- `frontend/src/hooks/usePrayerReactions.ts` (becomes a passthrough to the context, or is deleted)
- `frontend/src/components/prayer-wall/InlineComposer.tsx`
- `frontend/src/components/prayer-wall/InteractionBar.tsx`
- `frontend/src/components/prayer-wall/CommentsSection.tsx`
- `frontend/src/components/prayer-wall/CommentInput.tsx`
- Many others — spec lists the full set

**Acceptance criteria:**
- With flag off, everything works as before (mock data).
- With flag on, the feed loads from the API, posting works, reactions persist, bookmarks persist, comments work.
- **Clicking "pray" on a card in the feed, navigating to the detail page, and returning to the feed shows the reaction still active.** This is the single most important test in the entire spec.
- Navigating between PrayerWall, PrayerWallDashboard, PrayerDetail, and PrayerWallProfile maintains reaction state coherently.
- Existing Prayer Wall tests updated to work with both flag states.
- New tests cover the unified-reaction-state behavior.

**Out-of-band notes for Eric:** This is the biggest spec in Round 3 and the most satisfying one to ship. When the test above passes, the single most visible "feels broken" bug in Prayer Wall is gone. Celebrate accordingly.

### Spec 3.10 — Phase 3 Visual Regression Check

- **ID:** `round3-phase03-spec10-phase3-regression-check`
- **Size:** S
- **Risk:** Low
- **Prerequisites:** 3.9
- **Goal:** Run a visual regression check to ensure the data migration didn't accidentally change any UI behavior. All visual migration work is deferred to Phase 5 — this spec is about "nothing regressed," not "looks better."

**Approach:** Playwright test that walks through the Prayer Wall, takes screenshots, and compares to pre-Phase-3 baseline screenshots. Any difference is either a bug or an intentional change; intentional changes must be documented in the spec's known changes section.

**Files to create:**
- `frontend/e2e/phase03-visual-regression.spec.ts`
- `frontend/e2e/baselines/phase02-prayer-wall.png` (pre-Phase-3 baseline)

**Acceptance criteria:**
- Visual regression test passes.
- Any intentional differences are documented.

### Spec 3.11 — Phase 3 Smoke Test and Cutover

- **ID:** `round3-phase03-spec11-phase3-smoke-test`
- **Size:** S
- **Risk:** Low
- **Prerequisites:** 3.10
- **Goal:** End-to-end verification of the full Prayer Wall experience with the backend enabled, and cutover checklist for Eric.

**Approach:** Playwright test covering the full user journey: register → post prayer → receive pray reaction from a second test user → comment → mark answered → share → bookmark a stranger's prayer → log out → log back in → verify bookmark still there. Manual cutover checklist for Eric covering visual spot-checks, mobile testing, and flag-flip procedure.

**Files to create:**
- `frontend/e2e/phase03-prayer-wall-smoke.spec.ts`
- `docs/round3/phase03-cutover-checklist.md`

**Acceptance criteria:**
- Playwright test passes end-to-end.
- Manual checklist items all green.
- Phase 3 officially done.

---

*Phases 0, 1, 2, and 3 complete. Phases 4-10 follow.*

## Phase 4 — Post Type Expansion

> **Phase purpose:** With the data infrastructure from Phase 3 supporting all five post types at the schema level, now expose the UI for Testimony, Question, Devotional Discussion, and Encouragement. Each gets its own composer, card treatment, and type-specific behavior. Prayer Request (the flagship) gets a polish pass.

**What this phase accomplishes:** After Phase 4, users can post in all five types. The filter bar becomes a "room selector" where each room feels like a distinct space rather than a filter pill. Questions have "this helped" marking. Testimonies never expire and have a warmer visual treatment. Encouragement shows for 24 hours then archives. Devotional Discussions support threaded replies.

**Sequencing notes:** Prayer Request polish (4.1) happens first as a reference. Then the four new types each get a spec. A final spec unifies the filter bar into the room-selector pattern. Can run in parallel with Phase 5 if desired.

**Phase-level definition of done:**
- All five post types have working composers and cards.
- The filter bar treats each type as a distinct "room" with its own surrounding UI atmosphere.
- Type-specific behavior works: Questions can be marked resolved, Testimonies never expire, Encouragement auto-archives after 24 hours, Devotional Discussion has threaded replies.
- Copy for each type follows brand voice guidance with type-specific tone (prayer is quiet, testimony can breathe, encouragement is brief).

### Spec 4.1 — Prayer Request Type Polish
- **ID:** `round3-phase04-spec01-prayer-request-polish`
- **Size:** M
- **Risk:** Low
- **Prerequisites:** Phase 3 complete
- **Goal:** Refine the Prayer Request composer and card as the canonical reference for the other four types. Lock in copy, spacing, interaction patterns, and the "room" atmosphere.
- **Approach:** Audit the existing Prayer Request flow end-to-end. Update copy per brand voice. Add the "one-line composer on arrival" behavior (composer opens pre-focused if the user arrived from a mood-check-in indicating struggle). Refine the empty state to always offer a next step (revisit a prayer, read a Psalm, share your own). Polish the category picker UX.
- **Key decisions:** Composer label changes from "Share your prayer request" to something warmer per brand voice (spec author picks, reviewed by Eric). Anonymous toggle moves from a checkbox inside the composer to a more prominent toggle above it so users consider it deliberately rather than as an afterthought.

### Spec 4.2 — Testimony Post Type
- **ID:** `round3-phase04-spec02-testimony-type`
- **Size:** L
- **Risk:** Medium
- **Prerequisites:** 4.1
- **Goal:** Introduce the Testimony post type with its own composer, card visual treatment, and behavior (never expires, default to real-identity with a gentle nudge against anonymous, reactions are "Amen" / "Praise God" instead of "Pray").
- **Approach:** New `TestimonyComposer` component with warmer visual treatment (gold accent border, scripture prompt suggesting a favorite verse to pair with the testimony). New `TestimonyCard` with the same warmer treatment. Backend: when creating a post with `postType = 'testimony'`, the default `is_anonymous` is false and the frontend shows a nudge if the user checks anonymous ("Testimonies are most encouraging when shared with your name. Post anonymously anyway?"). Reactions use the same `post_reactions` table but the frontend shows "Amen" for testimonies — backend stores it as the same `praying` reaction type, frontend just renders different label based on post type. This is intentional: we're not adding a new reaction type to the database, we're adding UI variation.

### Spec 4.3 — Question Post Type
- **ID:** `round3-phase04-spec03-question-type`
- **Size:** L
- **Risk:** Medium
- **Prerequisites:** 4.2
- **Goal:** Introduce the Question post type with "this helped" marking. A question's author can mark one comment as the helpful answer, which makes the question evergreen.
- **Approach:** New `QuestionComposer` with prompt "What are you wrestling with?" Backend adds `PATCH /api/v1/posts/{id}/resolve` endpoint that sets `posts.question_resolved_comment_id` to a specific comment ID. Frontend shows a "Mark as helpful" action on each comment, visible only to the question author. When marked, the comment gets a subtle "This helped" badge and the post becomes evergreen (no expiration). Sort mode "most helpful" for the Question room ranks by whether the question is resolved (resolved first) then by comment count.

### Spec 4.4 — Devotional Discussion Post Type
- **ID:** `round3-phase04-spec04-discussion-type`
- **Size:** L
- **Risk:** Medium
- **Prerequisites:** 4.3
- **Goal:** Introduce the Devotional Discussion post type with threaded replies and shorter expiration (3 days after last activity).
- **Approach:** New `DiscussionComposer` with an optional scripture reference field (the discussion can be anchored to a verse). Threaded replies: comments on discussions can themselves have replies (one level of nesting, not unlimited — keeps it sane). Backend: add `parent_comment_id` nullable column to `post_comments` (this is a schema change — requires a new Liquibase changeset within this spec). Frontend: comments section renders indented replies under their parent comment. Sort by most recent activity (bumps bubble up).

### Spec 4.5 — Encouragement Post Type
- **ID:** `round3-phase04-spec05-encouragement-type`
- **Size:** M
- **Risk:** Low
- **Prerequisites:** 4.4
- **Goal:** Introduce the Encouragement post type: short (max 280 chars), no replies, reactions only, 24-hour expiration.
- **Approach:** New `EncouragementComposer` with a strict 280-char limit and a character counter. Encouragement cards are smaller and shown in a more carousel-like layout (the "word for today" feel). Backend enforces the 280-char limit and sets `expires_at = created_at + 24 hours` on insert. Expired encouragements are filtered from all public views.

### Spec 4.6 — Post Type Composer Chooser
- **ID:** `round3-phase04-spec06-composer-chooser`
- **Size:** M
- **Risk:** Low
- **Prerequisites:** 4.5
- **Goal:** When a user taps "Post" on the Prayer Wall, show a composer chooser modal that lets them pick which post type they're creating before opening the type-specific composer.
- **Approach:** New `ComposerChooserModal` with five cards (Prayer Request, Testimony, Question, Devotional Discussion, Encouragement), each with a one-line description and an icon. Selecting a card opens that type's composer. The modal remembers the user's most recently used type and places it first. Can be dismissed to cancel.

### Spec 4.7 — Room Selector (Filter Bar Rework)
- **ID:** `round3-phase04-spec07-room-selector`
- **Size:** L
- **Risk:** Medium
- **Prerequisites:** 4.6
- **Goal:** Rework the existing CategoryFilterBar into a RoomSelector that treats each post type as a distinct "room" with its own visual atmosphere, per Decision 9 in the Architectural Foundation.
- **Approach:** New `RoomSelector` component replaces or subsumes CategoryFilterBar. At the top, five primary tabs (All, Prayers, Testimonies, Questions, Discussions, Encouragement) — note, "All" is the unified feed, the others are rooms. Below, secondary category pills that are room-specific (e.g., Prayer Requests have health/grief/family/work categories; Testimonies have answered-prayer/breakthrough/gratitude categories). The room tab itself carries subtle atmospheric treatment: the Prayer Request room has a cool blue glow accent, Testimonies have a warm gold accent, Questions have a teal accent, Discussions have a purple accent (matching the existing brand primary), Encouragement has a soft pink accent. The accents are subtle — it's atmosphere, not a rainbow.

### Spec 4.8 — Post Type Behavioral Tests
- **ID:** `round3-phase04-spec08-post-type-tests`
- **Size:** M
- **Risk:** Low
- **Prerequisites:** 4.7
- **Goal:** Comprehensive test pass covering each post type's unique behaviors and the cross-type interactions.
- **Approach:** Playwright tests covering: creating each type, type-specific constraints (encouragement char limit, testimony no-expire, question resolve flow, discussion threaded replies), room navigation, mixed feed vs single-room feed, type-specific empty states.

---

## Phase 5 — Visual Migration to Round 2 Brand

> **Phase purpose:** Bring Prayer Wall's visual treatment into alignment with the Round 2 homepage redesign. Replace inline frosted patterns with the canonical `FrostedCard`, add glow orbs via `HorizonGlow` on hero sections, migrate to 2-line heading pattern, fix ring colors, and apply animation token alignment.

**What this phase accomplishes:** After Phase 5, Prayer Wall looks like it belongs in the same app as the homepage and Daily Hub. The visual drift from Round 1 is gone.

**Sequencing notes:** Can run entirely in parallel with Phase 3 or Phase 4. No backend dependencies. Pure frontend visual work. Five small specs.

### Spec 5.1 — FrostedCard Migration
- **ID:** `round3-phase05-spec01-frostedcard-migration`
- **Size:** M
- **Risk:** Low
- **Prerequisites:** Phase 1 complete (any time after)
- **Goal:** Migrate `PrayerCard`, `InlineComposer`, and `QotdComposer` to use the canonical `FrostedCard` component instead of inline frosted recipes. Decide on the AuthModal treatment (keep bespoke or add FrostedCard dialog variant).
- **Approach:** Direct component swap in the three target files. The inline class `rounded-xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur-sm` becomes `<FrostedCard className="p-5">`. Note that FrostedCard's default padding is `p-6` — where specific components need `p-5`, override via className. Review that the rounded-2xl upgrade (FrostedCard uses `rounded-2xl`, inline used `rounded-xl`) doesn't break visual hierarchy. For AuthModal, add `variant="dialog"` prop to FrostedCard that produces the heavier dialog treatment (bg-hero-bg/95, rounded-3xl, stronger shadow) and migrate AuthModal to use it.
- **Key decision for Eric:** do you want the dialog variant added to FrostedCard, or keep AuthModal bespoke? Spec picks one based on your answer.

### Spec 5.2 — HorizonGlow and Hero Pattern Migration
- **ID:** `round3-phase05-spec02-hero-pattern-migration`
- **Size:** M
- **Risk:** Low
- **Prerequisites:** 5.1
- **Goal:** Replace `PrayerWallHero` with the canonical `PageHero` component (which already uses `ATMOSPHERIC_HERO_BG` and gradient text). Add `HorizonGlow` overlays where appropriate.
- **Approach:** Delete or rewrite PrayerWallHero as a thin wrapper around PageHero. Add HorizonGlow as a sibling to the main feed container so the purple glow orbs show through the Prayer Wall page. The hero transitions from hand-rolled 26-line bespoke markup to a 3-line PageHero call.

### Spec 5.3 — 2-Line Heading Pattern
- **ID:** `round3-phase05-spec03-two-line-headings`
- **Size:** S
- **Risk:** Low
- **Prerequisites:** 5.2
- **Goal:** Replace single-line heading markup across Prayer Wall with the 2-line pattern from the Round 2 homepage: a small upper line (label) and a larger lower line (title).
- **Approach:** Audit all `<h1>` and `<h2>` elements in Prayer Wall. Apply the 2-line treatment where it fits. Not everywhere — some places are fine with a single-line heading. Spec lists the specific elements that should migrate.

### Spec 5.4 — Animation Token and Focus Ring Alignment
- **ID:** `round3-phase05-spec04-animation-ring-tokens`
- **Size:** S
- **Risk:** Low
- **Prerequisites:** 5.3
- **Goal:** Replace hardcoded durations and easings in Prayer Wall components with canonical tokens (`duration-base`, `ease-decelerate`). Replace `ring-glow-cyan` with the Daily-Hub-standard white glow ring on textareas.
- **Approach:** Grep for `duration-` and `ease-` in Prayer Wall, confirm every instance uses a canonical token. Grep for `ring-glow-cyan`, replace with the white/purple ring pattern from Daily Hub textareas.

### Spec 5.5 — Phase 5 Visual QA
- **ID:** `round3-phase05-spec05-phase5-visual-qa`
- **Size:** S
- **Risk:** Low
- **Prerequisites:** 5.4
- **Goal:** End-to-end visual QA pass with Playwright comparing Prayer Wall to the homepage to ensure they look like siblings.
- **Approach:** Playwright screenshot tests of Prayer Wall pages side-by-side with Daily Hub reference pages. Manual spot-check by Eric on mobile.

---

## Phase 6 — Hero Features

> **Phase purpose:** The dozen features that make Round 3 feel like a genuine upgrade rather than a refactor. Prayer Receipt, Quick Lift, Night Mode, Intercessor Timeline, Answered Prayer Wall, Verse-Finds-You — the moments that make users say "whoa."

**What this phase accomplishes:** After Phase 6, Prayer Wall has the emotional and ritual moments that differentiate it from every other Christian prayer app. Users tell their friends about it.

**Sequencing notes:** Internally parallelizable. Prayer Receipt (6.1-6.2) is the highest-priority, highest-impact feature — ship it first. Quick Lift (6.3-6.4) is second. The others can run in any order afterward. Can also run in parallel with Phase 7 or Phase 8.

### Spec 6.1 — Prayer Receipt Notification Type
- **ID:** `round3-phase06-spec01-prayer-receipt-type`
- **Size:** M
- **Risk:** Medium
- **Prerequisites:** Phase 3 complete
- **Goal:** Add a new notification type `prayer_received` that fires when someone prays for a user's post. Delivered via the existing in-app notification system.
- **Approach:** Backend: when a reaction is created in Spec 3.6, already-planned notification firing now includes a `prayer_received` notification with metadata linking to the prayed-for post. Anonymous reactions don't include attribution — the notification just says "Someone is praying for you right now" with no name. Throttling: max one prayer_received notification per post per hour to prevent notification spam when a post gets many reactions in a short window. The notification batches: "3 people are praying for you right now." Frontend: notification renders in the NotificationPanel with a distinctive glow treatment.

### Spec 6.2 — Prayer Receipt Moment UX
- **ID:** `round3-phase06-spec02-prayer-receipt-moment`
- **Size:** M
- **Risk:** Low
- **Prerequisites:** 6.1
- **Goal:** The emotional moment itself — when a user opens the app and sees "Someone is praying for you right now," the UX should feel like gift, not like a push notification.
- **Approach:** On app open (or on navigating to Prayer Wall), if there are unread prayer_received notifications, show a subtle full-width banner above the feed: "Someone is walking with you." Tap to see details (which post was prayed for). The banner is not a modal — it's ambient and dismissible. Gentle animation (fade-in, no spring). Specific copy vetted against brand voice.

### Spec 6.3 — Quick Lift Backend
- **ID:** `round3-phase06-spec03-quick-lift-backend`
- **Size:** M
- **Risk:** Medium
- **Prerequisites:** 6.2
- **Goal:** Backend endpoint `GET /api/v1/posts/quick-lift` returning a curated stack of 5 prayers for the one-tap intercession flow. Prioritizes posts with fewest interactions and posts flagged `crisis_flag = true`.
- **Approach:** Algorithm: 1-2 crisis-flagged posts first (if any exist and haven't been prayed for by the current user), then 3-4 low-interaction posts that the current user hasn't already reacted to, excluding the user's own posts. Sort within each tier by `created_at DESC`. Returns 5 posts total. Each post in the response includes the standard post shape plus a `liftReason` field explaining why it was included ("Needs prayer" or "New post"). No anonymity changes — anonymous posts appear normally.

### Spec 6.4 — Quick Lift UX Flow
- **ID:** `round3-phase06-spec04-quick-lift-ux`
- **Size:** L
- **Risk:** Medium
- **Prerequisites:** 6.3
- **Goal:** The 90-second ceremony. Tap "Lift Prayers" from anywhere on Prayer Wall, enter a focused full-screen flow, pray through 5 posts with calm breath animations between each, finish with a warm summary.
- **Approach:** New `QuickLiftFlow` page-level component. Enters with a brief reading scripture prompt ("Bear one another's burdens" — Galatians 6:2). One post at a time fills the screen with minimal chrome. Tap "Pray" button, see brief breath animation, auto-advance to next. End screen: "You just carried [N] people before God." Optional "Pray again?" or "Back to the wall" CTAs. Records one intercession per prayer reacted to (triggers the normal activity engine + potentially the intercessor_25 badge).

### Spec 6.5 — Night Mode
- **ID:** `round3-phase06-spec05-night-mode`
- **Size:** L
- **Risk:** Medium
- **Prerequisites:** Phase 5 complete
- **Goal:** After 9pm local time, Prayer Wall shifts into a dimmer visual treatment with ambient sound suggestions and a "late night prayers" presence cue.
- **Approach:** Time-of-day check on Prayer Wall mount. If after 9pm, apply a darker theme variant (reduce glow opacity, darken backgrounds further, shrink animations). Suggest the Music feature's ambient rain or forest track via a small inline prompt. Show a gentle "You're not the only one awake" message if another user is active on Prayer Wall in the last 5 minutes (requires a presence tracking endpoint — piggybacks on a new `POST /api/v1/presence/heartbeat` lightweight endpoint).

### Spec 6.6 — 3am Watch
- **ID:** `round3-phase06-spec06-3am-watch`
- **Size:** M
- **Risk:** Medium
- **Prerequisites:** 6.5
- **Goal:** A specific "send me a prayer right now" button visible during crisis hours (10pm-4am local time) that instantly pulls the user into a short guided experience.
- **Approach:** Button appears in Night Mode only. Tap triggers: 3-minute guided prayer from the Music feature's guided prayer library → a single stranger's request from the Quick Lift queue to pray through → an encouraging verse from a curated "dark night of the soul" verse list. All three steps in one flow, no navigation required. Exit anywhere returns to Prayer Wall.

### Spec 6.7 — Intercessor Timeline Backend
- **ID:** `round3-phase06-spec07-intercessor-timeline-backend`
- **Size:** M
- **Risk:** Low
- **Prerequisites:** Phase 3 complete
- **Goal:** Backend endpoint `GET /api/v1/users/me/intercession-journey` returning a timeline of the current user's prayer activity: how many people they've prayed for, breakdown by category, answered-prayer callbacks.
- **Approach:** Aggregates from `post_reactions` joined with `posts` and `activity_log`. Returns: total intercessions this month / this year / all-time, category breakdown (health, grief, etc.), count of prayers the user reacted to that were later marked answered. Cached per-user with a 1-hour TTL since it's expensive to compute and doesn't need to be real-time.

### Spec 6.8 — Intercessor Timeline UX
- **ID:** `round3-phase06-spec08-intercessor-timeline-ux`
- **Size:** M
- **Risk:** Low
- **Prerequisites:** 6.7
- **Goal:** A personal page at `/prayer-wall/journey` rendering the Intercessor Timeline as a gentle growth narrative, not a leaderboard.
- **Approach:** Full-page surface. Hero stat: "You've walked with [N] people this month." Category breakdown as a soft bar chart. Answered prayer callbacks rendered as cards: "You prayed for Sarah's mother. God answered that prayer 3 weeks ago. Celebrate with her." (Links to the answered post.) No rankings, no comparisons, no "you're in the top 10%." Pure personal narrative.

### Spec 6.9 — Answered Prayer Wall
- **ID:** `round3-phase06-spec09-answered-wall`
- **Size:** M
- **Risk:** Low
- **Prerequisites:** Phase 4 complete (for Testimony visual treatment precedent)
- **Goal:** A separate sub-page at `/prayer-wall/answered` showing only answered prayers, rendered with warmer visual treatment (gold accent, larger text, more whitespace).
- **Approach:** Feed query filters to `post_type = 'prayer_request' AND is_answered = true`. Card treatment borrows from the Testimony visual language. Sort by `answered_at DESC` by default; option to sort by `praying_count DESC` ("most-prayed answered prayers"). Landing on this page on a hard day is intended to feel like medicine.

### Spec 6.10 — Shareable Testimony Cards
- **ID:** `round3-phase06-spec10-shareable-testimony-cards`
- **Size:** L
- **Risk:** Medium
- **Prerequisites:** 6.9
- **Goal:** When a user marks a prayer as answered with testimony text, offer to generate a beautiful shareable image (gradient background, prayer text, testimony, "Answered" mark, worshiproom.com/p/{id}) for sharing outside the app.
- **Approach:** Server-side or client-side image generation. For Phase 6, use a client-side canvas approach with the existing `VerseShareTemplate` infrastructure from the Bible feature as a reference. Three templates to pick from. Preview before sharing. Optional "Share without the URL" for users who want a cleaner image. This is a "tell a friend" moment — the image drives new users back to the platform.

### Spec 6.11 — Verse Finds You
- **ID:** `round3-phase06-spec11-verse-finds-you`
- **Size:** L
- **Risk:** Medium
- **Prerequisites:** 6.10
- **Goal:** When a user prays for someone else's post, there's a ~20% chance a contextually relevant Bible verse appears as a small card underneath: "While you were praying for Sarah's marriage — Ecclesiastes 4:12." The verse is tappable to read in Bible feature.
- **Approach:** Backend: a `verse_suggestion_map` that maps prayer categories (and eventually content topics via simple keyword matching) to verse references. Returns a verse ~20% of the time on reaction POST responses. Frontend: when the API response includes a suggested verse, render a small card under the prayer card with a gentle fade-in. Card links to the Bible feature at the exact verse. This is the Bible ↔ Prayer Wall bridge that's missing today.

### Spec 6.12 — Phase 6 Smoke Test
- **ID:** `round3-phase06-spec12-phase6-smoke-test`
- **Size:** S
- **Risk:** Low
- **Prerequisites:** 6.11
- **Goal:** Playwright test covering all Phase 6 features end-to-end.

---

*Phases 0-6 complete. Phases 7-10 follow.*

## Phase 7 — Cross-Feature Integration

> **Phase purpose:** Weave Prayer Wall into the rest of the app. Today it's a silo; after Phase 7 it's connective tissue. Bible, Music, Daily Hub, Friends, and Local Support all have meaningful bridges into and out of Prayer Wall.

**What this phase accomplishes:** Using Prayer Wall feels like using the same app as Daily Hub. Opening Bible surfaces prayer opportunities. Playing ambient music persists while praying. Friends' prayers pin to the top of the feed. The moat-building phase.

**Sequencing notes:** Mostly parallelizable. Each integration is its own spec. Can run alongside Phase 6 and Phase 8.

### Spec 7.1 — Bible to Prayer Wall: Pray This Verse
- **ID:** `round3-phase07-spec01-bible-pray-verse`
- **Size:** M
- **Risk:** Low
- **Prerequisites:** Phase 4 complete
- **Goal:** Add a "Pray this verse over someone" action to Bible verses that opens a Prayer Wall composer pre-filled with the verse and a gentle prompt.
- **Approach:** Extend the existing `VerseAction` registry in the Bible feature with a new action. Action opens the Prayer Wall composer (likely the Prayer Request type) with content pre-filled: "Praying [verse reference] over anyone who needs it today. [verse text]". User can edit before posting. Records activity for both Bible (verse interaction) and Prayer Wall (post created).

### Spec 7.2 — Bible to Prayer Wall: Verse Suggestions on Cards
- **ID:** `round3-phase07-spec02-bible-verse-suggestions`
- **Size:** M
- **Risk:** Low
- **Prerequisites:** 7.1
- **Goal:** When viewing a prayer request, an optional expansion offers a relevant Bible verse to pray alongside, pulled from the Bible feature's verse database.
- **Approach:** Reuses the verse suggestion map from Spec 6.11 but in a different surface. A small "Pray with scripture" link on PrayerCard expands to show a suggested verse. Tap opens the verse in the Bible feature.

### Spec 7.3 — Music Ambient Background Toggle
- **ID:** `round3-phase07-spec03-music-ambient-background`
- **Size:** M
- **Risk:** Low
- **Prerequisites:** Phase 5 complete
- **Goal:** Add an ambient sound toggle to Prayer Wall that plays one of the existing 24 ambient sounds quietly in the background while browsing. Persists across navigation within Prayer Wall.
- **Approach:** Hook into the existing `AudioProvider` context. Add a small toggle in the Prayer Wall header or floating FAB area. Tapping opens a mini-picker of 5-6 prayer-appropriate ambient options (rain, forest, church bells, ocean, soft wind). Selection plays via the existing audio engine at reduced volume. Volume preserved in user settings.

### Spec 7.4 — Daily Hub: Lift 3 Prayers Step
- **ID:** `round3-phase07-spec04-daily-hub-lift-3`
- **Size:** M
- **Risk:** Low
- **Prerequisites:** Phase 6 spec 6.4 (Quick Lift UX) complete
- **Goal:** Add a "Lift 3 Prayers" step to the Daily Hub Pray tab that opens a shortened Quick Lift flow (3 posts instead of 5) and counts toward Pray tab completion.
- **Approach:** New card or button on the Pray tab: "Lift prayers from the wall (3)". Tapping enters a shortened Quick Lift flow. Completion counts as Pray tab activity. This is the integration that makes Prayer Wall part of the daily ritual rather than a separate destination.

### Spec 7.5 — Daily Hub: Evening Ritual Integration
- **ID:** `round3-phase07-spec05-daily-hub-evening-ritual`
- **Size:** M
- **Risk:** Low
- **Prerequisites:** 7.4
- **Goal:** The existing Evening Reflection (6pm banner) gains an optional "Who are you still holding?" step that revisits prayers the user prayed for earlier in the day and offers to leave a word of encouragement.
- **Approach:** Extend Evening Reflection with a new step. Queries the backend for prayers the user reacted to within the last 12 hours. Presents them one by one with the option to leave an encouragement comment (short-form). No pressure — "Skip this" is always available.

### Spec 7.6 — Friends Pin to Top of Feed
- **ID:** `round3-phase07-spec06-friends-pin-to-top`
- **Size:** M
- **Risk:** Low
- **Prerequisites:** Phase 3 complete
- **Goal:** Friends' prayer posts appear pinned at the top of the feed (above non-friend posts), when the user has friends who have posted recently.
- **Approach:** Feed query logic gains a "friends first" sort option (default on when user has friends). Backend joins `posts` with `friends` (or equivalent table migrated in a separate smaller spec that brings the friends system to the backend — scoped in Open Questions). Up to 3 friend posts pin to the top; anything else from friends appears inline in the regular feed.

### Spec 7.7 — Privacy Tiers (Private / Friends / Public)
- **ID:** `round3-phase07-spec07-privacy-tiers`
- **Size:** L
- **Risk:** Medium
- **Prerequisites:** 7.6
- **Goal:** Add three-tier privacy to posts: private (only you), friends-only, and public. Users pick per-post at compose time.
- **Approach:** New column `visibility` on `posts` table. Backend filters feed queries by visibility and viewer relationship. Composer gains a privacy toggle. Default is public for most types; testimony defaults to public; prayer request defaults to public but encourages friends-only for sensitive content via a gentle inline hint.

### Spec 7.8 — Local Support Integration
- **ID:** `round3-phase07-spec08-local-support-bridges`
- **Size:** M
- **Risk:** Medium
- **Prerequisites:** 7.7
- **Goal:** Surface Local Support resources at appropriate moments in Prayer Wall: after marking a mental health prayer as answered, suggest celebrating with a church near you; when a user flags distress, quietly offer counselor contact info (not as a popup, as a gentle inline card).
- **Approach:** Three integration points: (1) answered prayer with mental health category → post-mark prompt "Celebrate with a church near you?" → Local Support churches. (2) Crisis detection flags a post → private-to-author card "You don't have to walk this alone" → Local Support counselors. (3) The 3am Watch flow (Spec 6.6) surfaces Celebrate Recovery meeting listings for specific category matches.

---

## Phase 8 — Unified Profile System

> **Phase purpose:** Merge the two existing profile systems (GrowthProfile at /profile/:userId and PrayerWallProfile at /prayer-wall/user/:id) into one unified profile at `/u/:username`. Adopt Discourse's Summary vs Activity split. Fix the name field inconsistency at its root.

**What this phase accomplishes:** One profile per user, with rich presentation of their growth journey, Prayer Wall activity, Bible engagement, and friends. Shareable URLs with readable usernames. Privacy tiers working across the profile. The "witness of faithfulness" framing made real.

**Sequencing notes:** Depends on Phase 1 (canonical user model). Depends on Phase 3 (Prayer Wall on backend) for the Prayer Wall profile tab to show real data. Can run in parallel with Phases 6 and 7.

### Spec 8.1 — Username System
- **ID:** `round3-phase08-spec01-username-system`
- **Size:** L
- **Risk:** Medium
- **Prerequisites:** Phase 2 complete
- **Goal:** Add a `username` column to the `users` table. Users pick a username at registration (auto-suggested based on first + last name). Username is the public URL identifier. Uniqueness enforced at the database level.
- **Approach:** Liquibase changeset adds `username VARCHAR(30) UNIQUE NOT NULL`. New registration flow prompts for a username with real-time availability check (backend endpoint). Username validation: 3-30 chars, alphanumeric and hyphens only, cannot start/end with hyphen, case-insensitive uniqueness, reserved words blocked (admin, settings, api, etc.). Existing simulated users get auto-generated usernames on migration.

### Spec 8.2 — Profile URL Migration
- **ID:** `round3-phase08-spec02-profile-url-migration`
- **Size:** M
- **Risk:** Medium
- **Prerequisites:** 8.1
- **Goal:** Introduce `/u/:username` as the canonical profile URL. Add 301 redirects from `/profile/:userId` and `/prayer-wall/user/:id` to the new URL.
- **Approach:** New route `/u/:username` resolves via a backend endpoint `GET /api/v1/users/by-username/:username`. React Router redirect rules on the old paths. Every link in the frontend that points to a profile URL gets updated to the new format — comprehensive grep-and-replace.

### Spec 8.3 — Profile Hero and Identity Section
- **ID:** `round3-phase08-spec03-profile-hero`
- **Size:** M
- **Risk:** Low
- **Prerequisites:** 8.2
- **Goal:** Build the new profile hero: avatar, display name, username handle, level badge, join date, bio, favorite verse display.
- **Approach:** New `ProfileHero` component. Pulls from the backend user endpoint. Renders identity, level, streak badge, friend action buttons (Add Friend / Send Encouragement / Block — context-aware based on relationship). Favorite verse is a new feature — users pick a verse in settings, it displays as a pull-quote under the bio.

### Spec 8.4 — Profile Tab Architecture
- **ID:** `round3-phase08-spec04-profile-tabs`
- **Size:** L
- **Risk:** Medium
- **Prerequisites:** 8.3
- **Goal:** Tab structure for the profile page: Summary (default), Prayer Wall, Growth, Bible, Friends.
- **Approach:** Five tabs. Summary is a scrollable snapshot view that surfaces highlights from each of the other tabs plus a few pinned moments (recent testimony, longest streak, current level). Prayer Wall tab shows the user's posts, replies, and intercession stats. Growth tab shows faith points, streak, badges, growth garden. Bible tab shows reading heatmap, current plan, favorite verses. Friends tab shows friends list and mutual friends if viewed by another user. Privacy tiers applied per-section (see 8.7).

### Spec 8.5 — Summary Tab
- **ID:** `round3-phase08-spec05-profile-summary-tab`
- **Size:** M
- **Risk:** Low
- **Prerequisites:** 8.4
- **Goal:** The Summary tab — the default view when visiting a profile. Renders a curated snapshot, not an exhaustive list.
- **Approach:** Composition of existing widgets: recent testimonies, badge showcase, streak card, growth garden miniature, activity checklist today (for self-view only), friend preview. Ordered by impact. Not everything the profile could show — just the highlights.

### Spec 8.6 — Growth Tab (Consolidating Existing Data)
- **ID:** `round3-phase08-spec06-profile-growth-tab`
- **Size:** M
- **Risk:** Low
- **Prerequisites:** 8.5
- **Goal:** Consolidate the existing growth-related data (faith points history, streak history, badges earned, growth garden, mood chart) into a single Growth tab.
- **Approach:** Reuses existing components (StreakCard, BadgeGrid, GrowthGarden, MoodChart). New layout that composes them into one coherent page rather than spreading them across multiple places. Longest streak finally gets rendered (currently stored but unused).

### Spec 8.7 — Privacy Tier Enforcement
- **ID:** `round3-phase08-spec07-profile-privacy-tiers`
- **Size:** L
- **Risk:** High
- **Prerequisites:** 8.6
- **Goal:** Three-tier privacy for profile sections: public / friends / private. User picks per-section. Backend enforces visibility based on viewer relationship.
- **Approach:** New `user_privacy_settings` table. For each viewer-viewee pair, the backend computes which sections are visible and returns only those. Settings UI lets users choose "Who can see my streak?", "Who can see my friends list?", etc. Blocked users see nothing. Friends see friends-only sections. Strangers see public sections. The self always sees everything about themselves.

### Spec 8.8 — Name Canonicalization Migration
- **ID:** `round3-phase08-spec08-name-canonicalization`
- **Size:** M
- **Risk:** Medium
- **Prerequisites:** 8.7
- **Goal:** Fix the four-way naming inconsistency identified in the Profile recon. Every frontend component that renders a user's name now reads `displayName` from the API response, never from local state.
- **Approach:** Grep for `firstName`, `lastName`, `authorName`, `displayName`, `user.name` across the frontend. For each, determine the source. If it's from an API response, leave it. If it's from localStorage (the simulated auth path), route through a `getUserDisplayName(user)` helper that falls back to the authoritative source. After this spec, there is one canonical way to render a user's name.

### Spec 8.9 — Profile Customization
- **ID:** `round3-phase08-spec09-profile-customization`
- **Size:** M
- **Risk:** Low
- **Prerequisites:** 8.8
- **Goal:** Users can customize their profile with a favorite verse, a bio, and an avatar.
- **Approach:** Settings page has a new Profile section. Favorite verse picker that searches the Bible feature's verse database. Bio textarea (500 char limit). Avatar upload with crop UI. Backend: all three fields live on the `users` table per the canonical schema.

---

## Phase 9 — Ritual & Time Awareness

> **Phase purpose:** Make Prayer Wall feel different at different times. Sunday mornings feel like church. Lent feels like Lent. 11pm feels intimate. The feature that makes the app feel alive rather than static.

**What this phase accomplishes:** After Phase 9, opening Prayer Wall on Good Friday looks different than opening it on a random Tuesday. The app participates in the rhythms of the liturgical year.

**Sequencing notes:** Can run in parallel with any other phase after Phase 5. Small phase, low risk, high delight.

### Spec 9.1 — Liturgical Calendar Backend
- **ID:** `round3-phase09-spec01-liturgical-calendar-backend`
- **Size:** M
- **Risk:** Low
- **Prerequisites:** None (can run as early as Phase 5)
- **Goal:** Backend endpoint `GET /api/v1/liturgical/today` returning the current liturgical season, feast days, and season-specific theming hints.
- **Approach:** Hardcoded liturgical calendar as a dataset (Advent, Christmas season, Epiphany, Lent, Holy Week, Easter season, Pentecost, Ordinary Time). Returns current season name, start/end dates, and theming metadata (color palette hints, verse references, feast day if applicable).

### Spec 9.2 — Seasonal Theming Application
- **ID:** `round3-phase09-spec02-seasonal-theming`
- **Size:** M
- **Risk:** Low
- **Prerequisites:** 9.1
- **Goal:** Apply subtle seasonal theming to Prayer Wall based on the current liturgical season.
- **Approach:** Lent dims the palette slightly and the hero subtitle changes. Easter brightens and adds gold accents. Advent uses deep blues and purples. Ordinary Time is the default. No jarring changes — subtle atmospheric shifts.

### Spec 9.3 — Sunday Service Sync Mode
- **ID:** `round3-phase09-spec03-sunday-mode`
- **Size:** M
- **Risk:** Low
- **Prerequisites:** 9.2
- **Goal:** On Sundays, Prayer Wall shows a "Together in worship" banner, highlights Praise & Gratitude category, and optionally auto-suggests church-specific worship music.
- **Approach:** Date check for Sunday. Banner appears at top. Praise category pinned to the top of the filter bar. Link to Music's worship playlist.

### Spec 9.4 — Time-of-Day Copy Variations
- **ID:** `round3-phase09-spec04-time-of-day-copy`
- **Size:** S
- **Risk:** Low
- **Prerequisites:** 9.3
- **Goal:** Certain Prayer Wall copy (empty states, composer prompts, hero subtitle) varies by time of day: morning, afternoon, evening, late night.
- **Approach:** Small copy variation system. Four variants per string, picked based on current hour. Documented in the spec's copy deck.

### Spec 9.5 — Candle Mode
- **ID:** `round3-phase09-spec05-candle-mode`
- **Size:** M
- **Risk:** Low
- **Prerequisites:** 9.4
- **Goal:** Optional ambient mode that dims the UI further, softens animations, and plays a faint candle-flicker audio layer. "Enter the sanctuary."
- **Approach:** Toggle in the Prayer Wall header. When active, CSS filter dims the viewport, reduces motion further, and plays ambient candle-flicker sound. Off by default. Users who love it will adore it.

---

## Phase 10 — Community Warmth & Moderation

> **Phase purpose:** Design-in the moderation and community-warmth layer that makes Prayer Wall safe at scale. Based on 7 Cups' three-tier escalation model, Discourse's trust levels, and community-reporting best practices. This phase is what lets Eric sleep at 3am.

**What this phase accomplishes:** After Phase 10, Prayer Wall has automated phrase flagging, a real moderation queue with three-tier escalation, peer moderator trust levels, first-time-poster welcoming, and presence cues. The community feels warm and the moderation feels invisible but solid.

**Sequencing notes:** Can run in parallel with Phase 6 or Phase 7 after the Prayer Wall data layer is on the backend (Phase 3). Moderation infrastructure is a prerequisite for scaling the app — it should not be skipped or deferred to Round 4.

### Spec 10.1 — First Time Posters Badge
- **ID:** `round3-phase10-spec01-first-time-badge`
- **Size:** S
- **Risk:** Low
- **Prerequisites:** Phase 3 complete
- **Goal:** First-time posters get a subtle "First time here" marker on their post, visible only to others (not to the poster themselves). Triggers instinctive welcoming.
- **Approach:** Backend check: if `prayerWallPosts = 1` for the author, return `isFirstPost: true` on the post response. Frontend renders a small marker. Marker disappears for subsequent posts.

### Spec 10.2 — Welcomer Role
- **ID:** `round3-phase10-spec02-welcomer-role`
- **Size:** M
- **Risk:** Low
- **Prerequisites:** 10.1
- **Goal:** Users who have been active for 14+ days can tap a "Welcome them" quick-action on first-time posts that sends a canned (or customized) welcome comment.
- **Approach:** Backend check: if current user's account is 14+ days old, show "Welcome them" button on first-time posts. Tapping opens a small picker of 3-4 canned welcome messages (voice-matched) or a custom option. Sends as a comment from the welcomer.

### Spec 10.3 — Presence Cues
- **ID:** `round3-phase10-spec03-presence-cues`
- **Size:** M
- **Risk:** Low
- **Prerequisites:** Phase 6 spec 6.5 (which introduced the presence heartbeat endpoint)
- **Goal:** A tiny strip at the top of Prayer Wall showing 5-10 faceless glowing dots representing other users currently viewing the wall. No identities, just presence.
- **Approach:** Presence heartbeat endpoint (from 6.5) tracks active users in a short-lived cache. Frontend polls once per minute for active user count. Renders N glowing dots (capped at 10 for visual sanity). Copy: "You're not alone — [N] people are here right now." Subtle, calming, not alarming.

### Spec 10.4 — Trust Level System
- **ID:** `round3-phase10-spec04-trust-levels`
- **Size:** L
- **Risk:** Medium
- **Prerequisites:** Phase 3 complete
- **Goal:** Discourse-inspired trust levels: New, Basic, Member, Regular, Leader. Progression is automatic based on activity and account age. Higher trust levels unlock moderation abilities (flagging precedence, soft-hide rights).
- **Approach:** New column `trust_level` on `users` table. Background job (or on-activity check) promotes users based on criteria: 7 days active + 5 posts = Basic, 30 days + 20 posts + 50 comments = Member, etc. Specific thresholds documented in the spec. Trust level affects rate limits (new users can't post more than X per day) and moderation abilities.

### Spec 10.5 — Automated Phrase-Based Flagging
- **ID:** `round3-phase10-spec05-automated-flagging`
- **Size:** M
- **Risk:** High
- **Prerequisites:** 10.4
- **Goal:** Extend the existing crisis detection to a broader auto-flagging system that catches spam, harassment, self-harm, and predatory language automatically.
- **Approach:** Expand the crisis keywords list into a tiered phrase library: green (safe), yellow (flag for review), red (block post until reviewed). Backend runs the check on post and comment creation. Yellow-tier content is posted but flagged; red-tier content is held for review. Existing crisis keywords remain their own category with their own response (supportive, not punitive).

### Spec 10.6 — Moderation Queue
- **ID:** `round3-phase10-spec06-moderation-queue`
- **Size:** L
- **Risk:** Medium
- **Prerequisites:** 10.5
- **Goal:** A review queue for flagged posts and comments, accessible to users with sufficient trust level. Three-tier escalation per 7 Cups model: green (approve), yellow (pending review), red (urgent).
- **Approach:** New `/moderation` page gated by trust level. Queue of flagged items with context and action buttons (approve, hide, remove, escalate). Actions are logged in `moderation_actions` table for audit trail. Escalation tier determines sort order and visual urgency.

### Spec 10.7 — Appeal Flow
- **ID:** `round3-phase10-spec07-appeal-flow`
- **Size:** M
- **Risk:** Medium
- **Prerequisites:** 10.6
- **Goal:** When a user's post is hidden or removed, they can appeal. Appeals go into a separate queue and are reviewed by higher trust levels or by Eric directly.
- **Approach:** Notification fires when a post is hidden. The post's author sees "Your post was hidden for review. [Appeal this decision]". Appeal creates a row in `moderation_appeals` with the user's reasoning. Appeals queue is separate from the main moderation queue.

### Spec 10.8 — Report Resolution Workflow
- **ID:** `round3-phase10-spec08-report-resolution`
- **Size:** M
- **Risk:** Low
- **Prerequisites:** 10.7
- **Goal:** Complete the report lifecycle from Phase 3 Spec 3.8. Reports now get reviewed, resolved, and reporters receive (optional) resolution notifications.
- **Approach:** Moderation queue surfaces reports alongside auto-flagged content. Resolving a report updates `post_reports.reviewed_at`, `reviewed_by_user_id`, and `resolution`. Optional notification to the reporter: "Your report was reviewed" (no details about the outcome to protect moderator privacy).

### Spec 10.9 — Rate Limiting and Bad Actor Detection
- **ID:** `round3-phase10-spec09-rate-limiting`
- **Size:** M
- **Risk:** Medium
- **Prerequisites:** 10.8
- **Goal:** Rate limiting on post creation, comment creation, and reactions based on trust level. Detection of rapid-fire suspicious behavior.
- **Approach:** Spring Security rate limit filter. New users: 5 posts per day max. Basic: 20. Member: 50. Etc. Suspicious behavior (many rapid reactions, many failed auth attempts) triggers a temporary cooldown and a review flag.

### Spec 10.10 — Phase 10 Moderation Documentation
- **ID:** `round3-phase10-spec10-moderation-docs`
- **Size:** S
- **Risk:** Low
- **Prerequisites:** 10.9
- **Goal:** Internal documentation for how moderation works in Worship Room, for Eric's reference and for any future moderator volunteers.
- **Approach:** Markdown doc at `docs/moderation-playbook.md` covering: the three-tier escalation model, the trust level system, how to handle specific scenarios (self-harm, spam, harassment, theological disagreement), escalation paths, and the values that guide moderation decisions.

---

## Dependency Graph

> **This section visualizes which specs depend on which, so you can see what blocks what at a glance.**

Top-level phase dependencies:

```
Phase 0 (Learning Doc)
   │
Phase 1 (Backend Foundation)
   │
Phase 2 (Activity Engine)
   │
Phase 3 (Prayer Wall Data)
   │
   ├─── Phase 4 (Post Types) ─────────────────┐
   ├─── Phase 5 (Visual Migration) ───────────┤  (parallel)
   ├─── Phase 6 (Hero Features) ──────────────┤
   ├─── Phase 7 (Cross-Feature Integration) ──┤
   ├─── Phase 8 (Unified Profiles) ───────────┤
   ├─── Phase 9 (Ritual & Time) ──────────────┤
   └─── Phase 10 (Community Warmth) ──────────┘
```

Critical path (the shortest sequence to "Prayer Wall feels dramatically better"):

```
1.1 → 1.2 → 1.3 → 1.4 → 1.5 → 1.6 → 1.7 → 1.8 → 1.9 → 1.10  (foundation)
  → 2.1 → 2.2 → 2.3 → 2.4 → 2.5 → 2.6 → 2.7 → 2.8 → 2.9     (activity engine)
  → 3.1 → 3.2 → 3.3 → 3.4 → 3.5 → 3.6 → 3.7 → 3.8 → 3.9 → 3.10 → 3.11  (data migration)
  → 6.1 → 6.2 (Prayer Receipt — the hero moment)
  → 6.3 → 6.4 (Quick Lift)
```

That's 36 specs on the critical path — after which Prayer Wall is on a real backend, reactions persist, and the two flagship hero features (Prayer Receipt and Quick Lift) are live. Everything else can be sequenced after these in whatever order Eric prefers.

Specs that can run in parallel once the foundation is in place:

- Phase 5 (visual) with Phase 3 (data) — they touch different layers.
- Phase 4 (post types) with Phase 6 (hero features) — different concerns.
- Phase 9 (ritual & time) with anything — low dependencies.
- Phase 10 (moderation) after Phase 3 — independent of other features.

---

## Open Questions Log

> **Things deferred or unresolved. Revisit when you hit them.**

1. **Timezone handling for streaks.** Phase 2 uses UTC. California users will lose streaks an hour early. A timezone-aware streak engine is its own spec, deferred to post-Round-3 unless it becomes urgent.

2. **Backend friends migration.** The friends system currently lives on localStorage. Phase 7 Spec 7.6 (friends pin to top) technically requires friends to be on the backend. Two options: (a) a small sub-spec within Phase 7 that migrates friends first, or (b) defer friends backend migration to Round 4 and use a degraded version of 7.6 that only works with localStorage friends. Needs decision before Phase 7 starts.

3. **Push notifications.** In-app notifications are in scope for Phase 3/10. Real push notifications via Firebase Cloud Messaging are deferred. Phase 6 Spec 6.1 (Prayer Receipt) works as in-app only for Round 3.

4. **Service worker and offline behavior with backend.** The current service worker assumes localStorage. Round 3 specs that touch the backend need to decide: cache API responses for offline, queue writes while offline, or fail gracefully. Default assumption in the Master Plan: NetworkFirst with cached fallback for reads, fail-with-toast for writes. Individual specs can override.

5. **Bulk data migration from simulated auth.** If a user has been using the simulated auth with real activity data (posts, bookmarks, mood entries), how does that migrate when they register with Firebase? Phase 1 Spec 1.9 punts on this — it offers to "claim" the old account but doesn't actually migrate the data. Depending on how many users are affected in practice, this may need its own spec.

6. **Test account creation for dev.** Firebase test accounts need to be created manually in the Firebase console. Documentation for this is in Spec 0. If we want automated test account creation (e.g., for CI), it needs its own spec.

7. **CC rate limits on long spec chains.** Running 80+ specs via CC will take significant elapsed time. If CC rate limits become a problem, we may need to batch specs differently or use a different execution approach. Flag if it becomes an issue.

8. **Firebase paid tier.** The free tier of Firebase Auth supports up to 50k monthly active users. If Worship Room exceeds that, there's a cost conversation. Not a Round 3 concern but worth bookmarking.

9. **Email verification enforcement.** Firebase supports email verification. Round 3 doesn't require it for access — users can use the app with unverified emails. If spam becomes a problem, we can flip the requirement.

10. **Trust level promotion job scheduling.** Phase 10 Spec 10.4 mentions a background job for trust level promotion. Spring's `@Scheduled` works, but for a solo-operator app it may be simpler to compute trust level on-demand during each user request. Spec will pick one.

11. **Localization.** Worship Room is English-only. Round 3 doesn't change that. Localization is a future-round concern.

12. **Accessibility audit.** Every spec has accessibility in its acceptance criteria, but a comprehensive Round-3-wide audit at the end would be valuable. Not scoped yet.

---

## Change Log

> **Record updates to this plan here. Format: date, section changed, summary.**

- **2026-04-14 — initial draft.** Plan created based on three recons, Prayer Wall recon, Profile/Dashboard recon, competitor research, and extended strategic conversation. Covers 11 phases, approximately 80 specs.

---

## Appendix A — Spec Count Summary

| Phase | Spec Count |
|---|---|
| 0. Backend Foundation Learning | 1 |
| 1. Backend Foundation | 10 |
| 2. Activity Engine Migration | 9 |
| 3. Prayer Wall Data Migration | 11 |
| 4. Post Type Expansion | 8 |
| 5. Visual Migration to Round 2 Brand | 5 |
| 6. Hero Features | 12 |
| 7. Cross-Feature Integration | 8 |
| 8. Unified Profile System | 9 |
| 9. Ritual & Time Awareness | 5 |
| 10. Community Warmth & Moderation | 10 |
| **Total** | **88** |

---

## Appendix B — How Claude Code Uses This Document

When Eric hands Claude Code an individual Round 3 spec, CC is expected to:

1. **Load this Master Plan file** (at the path Eric provides in the spec header) and read the Quick Reference section.
2. **Check the spec's Phase section** in this document for any additional context that the spec file assumes.
3. **Verify prerequisites are complete** before starting work. If a prerequisite spec is listed but not yet done, stop and ask Eric.
4. **Follow the naming conventions, architectural decisions, and brand voice** documented here. When the spec file and the Master Plan agree, trust both. When they disagree, trust the Master Plan and ask Eric.
5. **Never commit, never push, never touch git.** Eric handles all git operations manually. This rule supersedes any other instruction.
6. **Respect the universal spec rules** from the Quick Reference section: Liquibase for schema changes, OpenAPI types not hand-written, all copy in a copy deck, tests mandatory, Spec V draft persistence honored.
7. **Flag deviations.** If something in the spec contradicts the Master Plan or if the spec seems wrong based on context, stop and ask Eric rather than making a best-guess decision.

---

## Appendix C — How Eric Uses This Document

1. **Store it in the repo** at a path like `.claude/round3/round3-master-plan.md` or wherever fits Eric's existing structure.
2. **Every spec file delivered by Claude in chat includes a header instruction** telling CC to read this document first. Eric doesn't need to add that instruction manually — it's part of the spec template.
3. **When scope changes mid-Round-3**, update this document, save the new version to the repo (replacing the old one), and tell Claude in chat so the chat's working memory matches the file.
4. **Skim it before starting each phase.** Not cover-to-cover. Just the phase's section so you remember the shape.
5. **Review the Open Questions log periodically.** When one of the deferred questions becomes urgent, that's the signal to add a spec that addresses it.
6. **Push back.** Anything in here that feels wrong is worth calling out. The plan is opinionated on purpose; opinions are meant to be tested.

---

**End of Round 3 Master Plan, version 1.0.**
