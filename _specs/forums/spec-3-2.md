# Forums Wave: Spec 3.2 — Mock Data Seed Migration (Phase 3 Dev Seed)

**Master Plan Reference:** `_forums_master_plan/round3-master-plan.md` → Spec 3.2 (`round3-phase03-spec02-mock-data-seed`), Decision 4 (unified posts table); canonical content sources: `frontend/src/mocks/prayer-wall-mock-data.ts` and `frontend/src/constants/question-of-the-day.ts`
**Branch:** `forums-wave-continued` (Eric's long-lived branch — DO NOT create a new branch, DO NOT checkout, DO NOT commit/push)
**Date:** 2026-04-28

---

## Affected Frontend Routes

N/A — backend-only spec (Liquibase context-gated dev seed + integration test class; no frontend changes, no API endpoints, no UI).

---

# Spec 3.2: Mock Data Seed Migration (Phase 3 Dev Seed)

**Spec ID:** `round3-phase03-spec02-mock-data-seed`
**Branch:** `forums-wave-continued` (Eric's long-lived branch — DO NOT create a new branch, DO NOT checkout, DO NOT commit/push)
**Prereqs:** Phase 3.1 ✅ shipped (six tables exist; CHECK constraints + FKs + indexes all in place)
**Size:** M
**Risk:** Low (additive seed data; context-gated to `dev` only; Liquibase smoke tests verify the seed loaded; no production blast radius because the changeset is skipped under `production` and `test` contexts)
**Master Plan Reference:** `_forums_master_plan/round3-master-plan.md` — Spec 3.2 body (line 3641), Decision 4 (unified posts table), `frontend/src/mocks/prayer-wall-mock-data.ts` and `frontend/src/constants/question-of-the-day.ts` as canonical content sources

---

## STAY ON BRANCH

Same as the rest of the wave. Stay on `forums-wave-continued`. No `git checkout`, `git branch`, `git commit`, `git push`, `git stash`, `git reset`. Eric handles git manually.

---

## Goal

Port the existing `frontend/src/mocks/prayer-wall-mock-data.ts` and `frontend/src/constants/question-of-the-day.ts` content into the backend dev database via Liquibase context-gated changesets so backend Phase 3 read endpoints (3.3, 3.4) can return realistic data when frontend feeds switch from mock-data sources to API calls.

Five seed concerns:

1. **10 mock prayer-wall users** — separate from Phase 1's 5 dev-seed auth users. Non-loginable; exist purely as authors/commenters/reactors for prayer-wall content.
2. **18 mock prayers** — across the 10 prayer categories, with realistic timestamps, denormalized counters pre-set to match comment/reaction counts.
3. **35 mock comments** — linked to specific prayers, authored by various mock users.
4. **6 mock reactions** — `praying` and `candle` types, pre-existing reactions from a single seed user.
5. **72 QOTD questions** — 60 general-pool questions + 12 liturgical-season-specific questions. (Master plan body says 60; recon discovered 72.)

All seeds load via `context="dev"` Liquibase changesets so production deploys and test suites are NOT polluted with mock data.

After this spec ships:
- Local dev environment, on first boot or after `docker compose down -v`, has a fully populated dev database with realistic prayer-wall content.
- Phase 3.3 (Posts Read Endpoints) can be developed/tested against real database state instead of mocking everything.
- Phase 3.9 (QOTD Backend Migration) can read all 72 QOTD questions from the table; frontend's `getTodaysQuestion()` selection logic is a future Phase 9 spec to port.
- Test suites unaffected — all `AbstractIntegrationTest` and `AbstractDataJpaTest` runs explicitly set `spring.liquibase.contexts=test`, which excludes `dev` context.

---

## Master Plan Divergence

Five divergences worth flagging upfront.

### Divergence 1: 72 QOTD questions, not 60

**What the master plan says:** Spec 3.2 acceptance criterion line 3666: "All 60 QOTD questions seeded with deterministic display_order."

**What this brief says:** All **72** QOTD questions seeded. The frontend's `QUESTION_OF_THE_DAY_POOL` array (verified at recon) contains 60 general-pool questions (qotd-1 through qotd-60, organized as 6 themes × 10 questions each: faith_journey, practical, reflective, encouraging, community, seasonal) PLUS 12 liturgical-season-specific questions (qotd-61 through qotd-72: 3 each for Advent, Lent, Easter, Christmas).

**Why:** The 60-vs-72 count is a master-plan-vs-reality drift. The frontend pool has been 72 since the liturgical-season questions were added. Seeding only 60 would either (a) silently drop the seasonal-specific content, or (b) require Phase 3.9 to maintain a parallel mini-seed for the missing 12 — both worse than just seeding all 72 now.

**Schema implication:** `qotd_questions.liturgicalSeason` column does NOT exist (per Spec 3.1's schema). The 12 liturgical questions are seeded with their `theme='seasonal'` value, but their `liturgicalSeason` association from the frontend type is dropped. Backend QOTD selection in Phase 3.9 uses pure `display_order` rotation; liturgical-aware selection (Advent/Lent/Easter/Christmas-specific question prioritization) is deferred to a future Phase 9 spec when the liturgical calendar lands backend-side.

### Divergence 2: Changeset filename uses today's date sequence

**What the master plan says:** Line 3653: `2026-04-17-001-prayer-wall-mock-seed.xml`.

**What this brief says:** Single changeset named `2026-04-27-014-prayer-wall-mock-seed.xml` (continuing the date sequence; Spec 3.1 reserves 2026-04-27-014 through 2026-04-27-019 for its six core schema changesets, but the mock seed is context-gated and lives under `contexts/`, so it can use the same date-014 prefix without collision because it's in a different directory and Liquibase's `id` attribute is what matters for MD5 — not the filename).

**Wait, conflict.** Spec 3.1 reserves 014 for the posts table changeset. To avoid filename collision (the `master.xml` `<include>` references the filename), this spec uses `2026-04-27-020-prayer-wall-mock-seed.xml` — the next sequential number after 3.1's six changesets. Filename lives in `contexts/` subdirectory; the `<include>` for it goes in `dev-seed.xml` (NOT `master.xml`).

**Why:** Sequence integrity matters more than master plan's literal date string. Same reasoning as Spec 3.1's Divergence 1.

### Divergence 3: 10 mock prayer-wall users are SEPARATE from Phase 1's 5 dev-seed auth users

**What the master plan says:** Line 3662: "All 10 mock users exist in dev database after migration." Master plan doesn't address the relationship to Phase 1.8's dev-seed users.

**What this brief says:** The 10 mock prayer-wall users (Sarah Johnson, David Chen, Emily Rodriguez, James Mitchell, Rachel Kim, Michael Thompson, Grace Okafor, Daniel Park, Maria Santos, "Anonymous User") are inserted as 10 NEW rows in `users` table with deterministic UUIDs `00000000-0000-0000-0000-000000000101` through `00000000-0000-0000-0000-00000000010A` (using hex 'A' for user-10 to keep the sequence within UUID grammar — recon should resolve, see Watch-For #5).

These users are **non-loginable** — `is_email_verified=true` (so their content can be visible in feeds without verification gating), but their email addresses are clearly synthetic (`mock-sarah-johnson@worshiproom.local`, `mock-david-chen@worshiproom.local`, etc.) and the password hash is the same dev-seed BCrypt hash as Phase 1.8 (so they CAN technically be logged into during exploratory testing, but they're conceptually "content authors," not "test users"). Documentation in `backend/README.md` clarifies this distinction.

The existing 5 Phase 1.8 dev-seed users (admin, Sarah, Bob, Mikey M., Sakura — UUIDs `...00000000001` through `...00000000005`) stay UNMODIFIED. They remain the canonical loginable accounts. They do NOT appear as authors of any mock prayer-wall content; the prayer-wall content is authored exclusively by the 10 new mock users.

**Why:** Conflating the two would either (a) shrink prayer wall author variety from 10 to 5 — visually too sparse for testing list rendering, anonymous handling, avatar fallback variety — or (b) require renaming the 5 existing seed users to match prayer-wall mock data, which would break Phase 1's auth tests and documentation. Cleaner to keep concerns separate. Total dev `users` table after this spec: 5 auth seed + 10 prayer-wall mock = 15 rows.

**Anonymous handling:** the 10th mock user has `firstName: 'Anonymous'`, `lastName: 'User'`, no avatar — but `posts.is_anonymous=true` is set on their authored posts at the `posts` row level. The `is_anonymous` flag is the canonical anonymity signal; the user's display name is just a fallback rendering label.

### Divergence 4: `created_at` matches mock data's `createdAt` field; `joined_at` is bulk-set to seed-creation time

**What the master plan says:** "All 18 mock prayers exist with correct categories, types, content, timestamps."

**What this brief says:** For prayers and comments, the `created_at` column matches the frontend mock's `createdAt` field exactly (preserves the realistic relative timestamps that drive bump-sort/last-activity ordering tests). For users, `joined_at` is set to the SAME timestamp Phase 1.8's seed users use (`'2026-01-15 10:00:00+00'`) rather than parsing each mock user's `joinedDate` field — those frontend timestamps are mock data, not anchor data, and parsing them adds complexity for zero test value.

**Why:** The mock prayer/comment timestamps drive observable behavior (feed ordering, last-activity bump). The mock user `joinedDate` doesn't drive behavior anywhere — it's a profile-page UI element. Simpler to bulk-set and document in the changeset comment.

### Divergence 5: Denormalized counters on `posts` are pre-populated from mock data

**What the master plan says:** "All 18 mock prayers exist with correct categories, types, content, timestamps."

**What this brief says:** Each mock prayer's `posts.praying_count`, `posts.candle_count`, `posts.comment_count`, `posts.bookmark_count`, `posts.report_count` columns are set during seed insert based on the mock data:
- `praying_count` = mock prayer's `prayingCount` field
- `comment_count` = number of mock comments linked to this prayer (computed from `MOCK_COMMENTS.filter(c => c.prayerId === prayer.id).length`)
- `candle_count = 0` (mock data doesn't track candle reactions yet — Phase 0.5 added the candle reaction type but mock data only includes praying-style reactions)
- `bookmark_count = 0` (mock data doesn't track bookmarks at the prayer level — only at the per-user PrayerReaction.isBookmarked level, which is a different concern)
- `report_count = 0` (no mock reports)

Phase 3.7's write endpoints (when they ship) will maintain these counters via application logic. For now, the seed puts them in a consistent state matching the visible mock content.

**Why:** Phase 3.3 read endpoints will likely return these counters in the API response. If they're 0 across all seed posts but the seed has visible comments and reactions, frontend testing will see "Sarah's prayer (5 prayers, 1 comment)" in the UI from mock data but "Sarah's prayer (0 prayers, 0 comments)" when the same data comes from the backend — confusing test signal. Pre-populating fixes the disconnect.

---

## Schema Mappings — How Mock Data Becomes SQL Rows

### Mock User → `users` row

```
PrayerWallUser.id ('user-1')          → users.id (UUID '00000000-0000-0000-0000-000000000101')
PrayerWallUser.firstName              → users.first_name
PrayerWallUser.lastName               → users.last_name
PrayerWallUser.avatarUrl              → users.avatar_url (nullable)
PrayerWallUser.bio                    → users.bio (nullable; '' becomes NULL)
PrayerWallUser.joinedDate             → users.joined_at = '2026-01-15 10:00:00+00' (bulk-set per Divergence 4)
                                         (mock joinedDate dropped)
generated synthetic email             → users.email ('mock-sarah-johnson@worshiproom.local')
shared dev BCrypt hash                → users.password_hash (same as Phase 1.8 seed, CDATA-wrapped)
                                         derived from ASCII letters of firstName+lastName for uniqueness
'first_only'                          → users.display_name_preference (matches frontend rendering pattern)
true                                  → users.is_email_verified
'America/Chicago'                     → users.timezone (default; documented in changeset comment)
false                                 → users.is_admin
```

10 user rows, deterministic UUIDs sequential from `...000000000101` to `...0000000000A0` (or whatever sequence recon resolves per Watch-For #5).

### Mock Prayer → `posts` row

```
PrayerRequest.id ('prayer-1')         → posts.id (UUID '00000000-0000-0000-0000-000000000201')
PrayerRequest.userId ('user-1')       → posts.user_id (FK to users.id; mapped through user-id translation table)
                                         For anonymous prayers (userId=null), use mock user-10's UUID + is_anonymous=true
'prayer_request' or 'discussion'      → posts.post_type (per master plan post_type CHECK enum)
                                         Mock data only has 'prayer_request' implicitly + QOTD responses are 'discussion'
PrayerRequest.content                 → posts.content
PrayerRequest.category                → posts.category (one of the 10 PRAYER_CATEGORIES)
PrayerRequest.isAnonymous             → posts.is_anonymous
PrayerRequest.challengeId             → posts.challenge_id (nullable)
PrayerRequest.qotdId                  → posts.qotd_id (nullable; for QOTD-response posts)
'public'                              → posts.visibility (default; mock data is all public)
PrayerRequest.isAnswered              → posts.is_answered
PrayerRequest.answeredText            → posts.answered_text (nullable)
PrayerRequest.answeredAt              → posts.answered_at (nullable; timestamp)
'approved'                            → posts.moderation_status (mock data is all approved)
false                                 → posts.crisis_flag (mock data has no crisis flags)
false                                 → posts.is_deleted
NULL                                  → posts.deleted_at
PrayerRequest.prayingCount            → posts.praying_count (denormalized; per Divergence 5)
0                                     → posts.candle_count (per Divergence 5)
COUNT(comments)                       → posts.comment_count (computed during seed authoring per Divergence 5)
0                                     → posts.bookmark_count
0                                     → posts.report_count
PrayerRequest.createdAt               → posts.created_at (TIMESTAMP WITH TIME ZONE)
PrayerRequest.createdAt               → posts.updated_at (same as created_at for mock)
PrayerRequest.lastActivityAt          → posts.last_activity_at
```

18 post rows, deterministic UUIDs sequential from `...000000000201` to `...000000000212` (18 = hex 0x12).

### Mock Comment → `post_comments` row

```
PrayerComment.id ('comment-1')        → post_comments.id (UUID '00000000-0000-0000-0000-000000000301')
PrayerComment.prayerId                → post_comments.post_id (FK to posts.id)
PrayerComment.userId                  → post_comments.user_id (FK to users.id)
NULL                                  → post_comments.parent_comment_id (mock data is flat)
PrayerComment.content                 → post_comments.content
false                                 → post_comments.is_helpful
false                                 → post_comments.is_deleted
NULL                                  → post_comments.deleted_at
'approved'                            → post_comments.moderation_status
false                                 → post_comments.crisis_flag
PrayerComment.createdAt               → post_comments.created_at
PrayerComment.createdAt               → post_comments.updated_at
```

35 comment rows, deterministic UUIDs sequential.

### Mock Reaction → `post_reactions` row

```
PrayerReaction.prayerId               → post_reactions.post_id (FK to posts.id)
PrayerReaction.isPraying=true         → post_reactions.reaction_type='praying' (one row per true)
                                         (false = no row, since reactions are toggled)
[seed user-1 — see below]             → post_reactions.user_id
NOW()                                 → post_reactions.created_at (mock data has no per-reaction timestamp)
```

`PrayerReaction.isBookmarked` does NOT map to `post_reactions` — bookmarks are a separate `post_bookmarks` table, OR a separate concern entirely (mock data uses `isBookmarked` to drive the per-user bookmark UI; in the backend schema, bookmarks are a distinct table). Bookmarks are NOT seeded in this spec (mock data has no concrete bookmark rows; only the `isBookmarked: true` boolean on a reaction object).

Mock reactions are conceptually "user-1 (Sarah Johnson, the seed user) has prayed for these 6 prayers." Maps to 6 rows in `post_reactions` with `(post_id, user_id='00000000-0000-0000-0000-000000000101', reaction_type='praying')`.

If recon discovers any `isPraying=true` reactions in the mock that aren't reflected in the seed posts' `praying_count`, surface the discrepancy and resolve before shipping (the seed must be internally consistent: `praying_count` on a post >= number of `post_reactions` rows for that post).

### QOTD → `qotd_questions` row

```
QuestionOfTheDay.id ('qotd-1')        → qotd_questions.id (PK, VARCHAR(50))
QuestionOfTheDay.text                 → qotd_questions.text
QuestionOfTheDay.theme                → qotd_questions.theme (one of 6 enum values)
QuestionOfTheDay.hint                 → qotd_questions.hint (nullable)
[index in QUESTION_OF_THE_DAY_POOL]   → qotd_questions.display_order (0-71, sequential per pool order)
true                                  → qotd_questions.is_active
NOW()                                 → qotd_questions.created_at
QuestionOfTheDay.liturgicalSeason     → DROPPED (no schema column; per Divergence 1)
```

72 rows. `display_order` matches array index (0 for qotd-1, 71 for qotd-72) — preserves the frontend's existing rotation order so backend Phase 3.9's day-of-year selection stays in step with frontend's current behavior during the wave's transitional period.

---

## Files to Create

```
backend/src/main/resources/db/changelog/contexts/2026-04-27-020-prayer-wall-mock-seed.xml
```

Single changeset file containing all five seed groups (10 users → 18 prayers → 35 comments → 6 reactions → 72 QOTD), in dependency order. FK constraints require users to exist before posts; posts before comments; posts before reactions. QOTD has no FKs to other Phase 3 tables, so it can be inserted anywhere.

```
backend/src/test/java/com/worshiproom/db/MockSeedDevContextTest.java
```

New test class. Two integration tests:
- One that runs migrations under `dev` context (override the default `test` context locally) and asserts the seed loaded — counts match (15 users including 5 Phase 1 seed + 10 mock; 18 posts; 35 comments; 6 reactions; 72 QOTDs).
- One that runs migrations under `test` context (the default) and asserts the seed did NOT load — only the 5 Phase 1 dev seed users exist OR if the test profile excludes Phase 1 seed too, then 0 users from this spec.

This second test is the critical correctness check. Master plan acceptance criteria line 3667: "Test context does NOT load the mock seed."

## Files to Modify

```
backend/src/main/resources/db/changelog/contexts/dev-seed.xml
```

Append `<include file="2026-04-27-020-prayer-wall-mock-seed.xml"/>` at the end. The existing `2026-04-23-003-dev-seed-users` Phase 1 seed stays as-is.

If `dev-seed.xml` doesn't currently use `<include>` directive (recon should verify the file structure — the existing 5 dev-seed users are inserted directly inline), then this spec's changeset goes in a new `<changeSet>` block within the same file, OR the file is restructured to use `<include>` for both. Recon picks the cleaner path.

```
backend/README.md
```

Add a section on dev seed data. Document:
- 5 Phase 1.8 auth seed users (loginable, with credentials)
- 10 Phase 3.2 prayer-wall mock users (technically loginable with the same dev BCrypt hash, but conceptually "content authors")
- 18 mock prayers, 35 mock comments, 6 mock reactions
- 72 QOTD questions
- How to verify seed loaded: `psql ... 'SELECT COUNT(*) FROM users; SELECT COUNT(*) FROM posts; SELECT COUNT(*) FROM qotd_questions;'`
- How to reset: `docker compose down -v && docker compose up -d` (destroys volume; next backend boot reapplies migrations + dev seed)

## Files NOT to Modify

- `backend/src/main/resources/db/changelog/master.xml` — append-only file, but the dev-seed include is already there from Phase 1.8 (the `dev-seed.xml` file is already included with `context="dev"`); this spec adds to `dev-seed.xml`'s contents, not to `master.xml` directly.
- Any of Spec 3.1's six changesets — those are frozen.
- `frontend/src/mocks/prayer-wall-mock-data.ts` — frontend keeps using the mock data file during the wave; this spec mirrors it to the backend without altering either side.
- `frontend/src/constants/question-of-the-day.ts` — frontend stays as source of truth for QOTD until Phase 3.9 cutover.
- Phase 1.8's `2026-04-23-003-dev-seed-users` changeset — frozen.

## Files to Delete

None.

---

## Acceptance Criteria

### Seed loads in dev context

- [ ] `MockSeedDevContextTest.dev_context_loads_seed` passes: under `spring.liquibase.contexts=dev`, all 15 users (5 Phase 1 + 10 prayer-wall) exist with correct UUIDs and column values
- [ ] All 18 mock prayers exist in `posts` with correct `post_type`, `category`, `content`, `created_at`, `last_activity_at`, `praying_count`, `comment_count`
- [ ] All 35 mock comments exist in `post_comments` linked to the right `post_id` and `user_id`
- [ ] All 6 mock reactions exist in `post_reactions` with `reaction_type='praying'` and `user_id` matching the seed user (UUID `...000000000101` per Sarah Johnson's mock-user mapping)
- [ ] All 72 QOTD questions exist in `qotd_questions` with sequential `display_order` from 0 to 71
- [ ] Each post's `comment_count` matches `(SELECT COUNT(*) FROM post_comments WHERE post_id = posts.id)` — internal consistency
- [ ] Each post's `praying_count` >= `(SELECT COUNT(*) FROM post_reactions WHERE post_id = posts.id AND reaction_type='praying')` — internal consistency

### Seed does NOT load in non-dev contexts

- [ ] `MockSeedDevContextTest.test_context_does_not_load_seed` passes: under `spring.liquibase.contexts=test`, 0 mock prayer-wall users exist (only the 5 Phase 1 seed users — or fewer, depending on test isolation)
- [ ] Existing `AbstractIntegrationTest` and `AbstractDataJpaTest` test runs see ZERO new rows from this seed (verifiable: total tests pass at the same baseline as before this spec)
- [ ] Production deploy with `spring.liquibase.contexts=production` would load NO mock data (manual verification: changeset has `context="dev"` attribute)

### Internal consistency

- [ ] All FK references resolve (every comment's `user_id` exists in users; every comment's `post_id` exists in posts; every reaction's `post_id` and `user_id` exist)
- [ ] Anonymous prayers (those with `is_anonymous=true`) have a valid `user_id` (the mock anonymous-user UUID, NOT NULL)
- [ ] No CHECK constraint violations on any inserted row (post_type, category, visibility, moderation_status, reaction_type, theme all valid; soft-delete and answered consistency holds)
- [ ] All `posts.qotd_id` references for QOTD-response posts point to existing `qotd_questions.id` values (referential consistency, even though there's no FK constraint per Decision 4)

### Idempotency / reset

- [ ] After `docker compose down -v && docker compose up -d` and backend boot, the seed reapplies cleanly with no errors
- [ ] Running migrations a second time without `down -v` does NOT re-insert (Liquibase MD5 catches the changeset as already-run; same as Phase 1.8 dev seed pattern)
- [ ] No duplicate-key errors on re-application

### Documentation

- [ ] `backend/README.md` documents both seed-user groups (auth seed + mock seed), how to verify, how to reset
- [ ] Changeset XML has comment block at the top documenting: spec ID, context gating reason, mock-data-vs-auth-seed distinction, reset procedure

### Test count target

M-sized → 10–20 tests per `06-testing.md`. This spec ships 2 integration tests (the dev-context + test-context pair) plus relies on the seed's internal consistency being checked by the existing `LiquibaseSmokeTest` extended in 3.1. Target: **2 dedicated tests** + extending `LiquibaseSmokeTest` with ~5 assertions about seed shape if running under dev context. If CC's plan proposes 20+ tests, push back — over-testing a seed migration.

---

## What to Watch For in CC's Spec Output

1. **72 QOTD questions, not 60.** Per Divergence 1. If CC's recon proposes seeding only 60 (taking the master plan's literal word count), push back — the actual frontend pool is 72 and the missing 12 would either silently drop or require a parallel seed in Phase 3.9.

2. **Anonymous prayer handling.** `is_anonymous=true` posts still need a valid `user_id` because `posts.user_id NOT NULL` per Spec 3.1. The mock data's "user-10 (Anonymous User)" maps to a real users row with deterministic UUID. The `is_anonymous` flag at the post level is the canonical anonymity signal; the user row exists for FK purposes only and is NEVER displayed publicly. Recon should verify the schema does NOT allow `posts.user_id NULL`, then handle accordingly.

3. **`createdAt` timestamps from mock data preserve realistic ordering.** Don't bulk-set all post timestamps to `NOW()` during the seed. The frontend mock has carefully-chosen timestamps that drive bump-sort UX (most recent activity first). Use `valueComputed="TIMESTAMP WITH TIME ZONE '2026-03-22 09:00:00+00'"` per `05-database.md` (NOT `valueDate` with `Z` suffix per Phase 1 Execution Reality Addendum item 3). Each post insert has its own timestamp.

4. **`post_reactions` composite PK includes `reaction_type`.** A user can have BOTH a `praying` row AND a `candle` row on the same post (per Spec 3.1's note). Mock data only seeds `praying` reactions. Don't accidentally write `INSERT IGNORE`-style logic that suppresses what the mock actually wants.

5. **UUID sequence for 10 mock users.** I suggested `...000000000101` through `...00000000010A` (hex), but UUID format is strict — `...0000000000A0` would be invalid as `A` is fine in hex but the `0` placement might be confusing. Recon should pick a valid scheme:
   - Option A: `...000000000101` through `...000000000110` (decimal counts, hex-encoded) — clean and clearly sequential.
   - Option B: `...00000000010a` through `...00000000010j` (after-decimal letters) — also valid, harder to skim.
   - **Recommendation:** Option A, using `...0000000000F0` would be ambiguous; just use `...0000000010F` if needed. Resolve clearly in the plan; the goal is unambiguous ordering in psql output.

6. **Don't seed bookmarks.** `post_bookmarks` table exists per Spec 3.1, but the mock data doesn't have explicit per-user bookmark rows — only a `PrayerReaction.isBookmarked` boolean per user-prayer pair. Mapping that to backend rows requires choosing which user owns each bookmark, and the mock data is ambiguous on that. Skip bookmarks entirely in this seed; Phase 3.7 write endpoints will allow real users to bookmark in dev testing.

7. **No QOTD content edits during seed.** Copy the `text` and `hint` fields verbatim from the frontend constant. Don't normalize quotes (smart quotes vs straight quotes), don't fix typos (none expected, but if recon spots one, flag it as a separate followup, don't silently edit), don't reword anything.

8. **`qotd_questions.theme` CHECK constraint includes 'seasonal'.** All 12 liturgical-season questions have `theme='seasonal'` (per the frontend type's `theme: 'faith_journey' | 'practical' | 'reflective' | 'encouraging' | 'community' | 'seasonal'`). The CHECK constraint from Spec 3.1 allows `'seasonal'`; verify the constraint string includes it before seeding.

9. **`display_order` is UNIQUE.** Sequential 0-71 means 72 distinct integer values. Don't accidentally repeat a value or skip one — the UNIQUE constraint will reject it. Generate the sequence programmatically during seed authoring (or carefully by hand with a counter).

10. **Idempotency test before shipping.** The Liquibase changeset must be safe to run twice. Phase 1.8's seed pattern uses `<preConditions onFail="HALT"><not><sqlCheck>` — recon should mirror this pattern (verify the table exists before attempting inserts; let Liquibase MD5 prevent re-run). Don't add `INSERT ... ON CONFLICT DO NOTHING` PostgreSQL-specific syntax.

11. **The 5 existing Phase 1.8 dev-seed users stay UNTOUCHED.** Don't add any UPDATE statements modifying their rows. Don't rename them. Don't change their UUIDs. This spec is purely additive to the dev users table.

12. **Synthetic email format.** Use a consistent pattern that's clearly synthetic and won't collide with real emails. Recommended: `mock-{firstname-lowercase}-{lastname-lowercase}@worshiproom.local`. The `.local` TLD is reserved for non-internet use (RFC 6762) — guarantees these can't accidentally resolve to real email addresses.

13. **Contexts are case-sensitive.** The changeset attribute is `context="dev"` (lowercase). Verify against Phase 1.8's pattern. If Phase 1.8 used `context="dev"` (lowercase), match it. Drift here means the changeset silently doesn't run under the expected context.

14. **Don't seed Phase 4+ data.** No testimony posts, no question posts beyond what mock data has, no encouragement posts. Mock data's `post_type` distribution is whatever's in `prayer-wall-mock-data.ts` — don't extend it. Phase 4 has its own concerns.

15. **Single quotes** for all string values in shell snippets, file paths, fixture strings. SQL string values use SQL-standard single quotes (escaping `'` as `''` if any mock content contains apostrophes — and several QOTD questions do, e.g., qotd-21's "When was the last time you felt God's presence clearly?"). Liquibase column values via `value=`'...'` attribute use XML-escaped quotes. Recon should pick the escaping path that matches Phase 1.8's existing pattern.

---

## Out of Scope

- Bookmark seeds (per Watch-For #6)
- Reports seeds (no mock report data exists)
- Liturgical-season-aware QOTD selection logic (deferred to Phase 9 — liturgical calendar phase)
- Frontend changes (mock data file stays; nothing references the new backend rows yet — Phase 3.10 wires the frontend consumer)
- Backfilling production with mock data (NEVER; production stays clean of mock data forever)
- Wiping / resetting dev seed via API endpoint (out of scope; `docker compose down -v` is the documented reset path)
- Seeding Phase 4+ post types (testimony, question, discussion, encouragement) beyond what mock data already has
- Phase 3.9 QOTD service (consumes this seed; separate spec)
- User profile photos for the 10 mock users beyond what mock data provides (some have URLs, some are null per `avatarUrl`, no synthesis here)
- Cross-user friendship rows between mock users (Phase 2.5's `friend_relationships` table; not part of prayer-wall mock data)
- Activity log / faith points / streaks for mock users (Phase 2 territory; mock prayer-wall users get basic profile rows only)

---

## Out-of-Band Notes for Eric

- This is the lowest-risk spec of Phase 3. M-sized but mechanical. Should execute in 1 session.
- Estimated CC token burn: moderate. The seed has ~150 rows total (15 users + 18 posts + 35 comments + 6 reactions + 72 QOTDs) and each row needs explicit Liquibase XML with all column values. The XML file will be ~1500-2000 lines. CC's `/execute-plan` will batch this — don't be alarmed by the line count.
- Recon should verify the actual `dev-seed.xml` file structure (whether it uses `<include>` or inline `<changeSet>` blocks) before generating the new changeset. The brief assumes inline; if it's structured with includes, the new changeset goes as a sibling include.
- Watch-For #5 (UUID sequence for 10 mock users) is the most likely friction point during recon. Either scheme is fine; the goal is unambiguous in psql output. If CC proposes Option B and recon confirms it's defensible, accept. If CC proposes a third scheme not in the brief (random UUIDs, for example), push back — deterministic UUIDs are the convention from Phase 1.8.
- The 72-vs-60 QOTD count divergence is the most-likely-to-be-questioned divergence. If CC's recon doesn't catch the discrepancy on its own (recon should grep `QUESTION_OF_THE_DAY_POOL` and count entries), surface it in the plan review. The frontend pool is 72; that's the authoritative count. Master plan body's "60" is stale.
- After this spec ships, dev environment is fully set up for Phase 3.3+ work. Spec 3.3 (Posts Read Endpoints) is the next brief — L-sized, Medium risk, has a canonical visibility-predicate SQL block to follow. The seed from this spec gives 3.3 real database rows to test against.
- Spec tracker after 3.2 ships: `3.2 ✅`, Phase 3 progress 2/12.
- xHigh thinking is appropriate. Pattern-matching against Phase 1.8 dev-seed structure, mechanical row generation, no deep reasoning chains. MAX would be over-spending.
- The Phase 3 critical path bottleneck is still Spec 3.5 (Posts Write, XL/High, crisis-detection territory). 3.2 doesn't surface that complexity at all; just data porting.
