# Forums Wave: Spec 3.1 — Prayer Wall Schema (Phase 3 Foundation)

**Master Plan Reference:** `_forums_master_plan/round3-master-plan.md` → Spec 3.1 (`round3-phase03-spec01-prayer-wall-schema`), Decision 4 (unified posts table), Decision 5 (Light a Candle reaction)
**Branch:** `forums-wave-continued` (Eric's long-lived branch — DO NOT create a new branch, DO NOT checkout, DO NOT commit/push)
**Date:** 2026-04-28

---

## Affected Frontend Routes

N/A — backend-only spec (schema-only Liquibase changesets + smoke test extension; no frontend changes, no API endpoints).

---

# Spec 3.1: Prayer Wall Schema (Phase 3 Foundation)

**Spec ID:** `round3-phase03-spec01-prayer-wall-schema`
**Branch:** `forums-wave-continued` (Eric's long-lived branch — DO NOT create a new branch, DO NOT checkout, DO NOT commit/push)
**Prereqs:** Phase 2.5 ✅ (8/8 specs complete; backend friends/social/mutes infrastructure live; cutover stable)
**Size:** L
**Risk:** Medium (foundational schema; six tables; multiple CHECK constraints; `parent_comment_id` self-reference; broad blast radius if shipped wrong, but reasoning depth is moderate — pattern-matches against Phase 2.5 schema specs)
**Master Plan Reference:** `_forums_master_plan/round3-master-plan.md` — Decision 4 (unified posts table), Spec 3.1 body (`round3-phase03-spec01-prayer-wall-schema`)

---

## STAY ON BRANCH

Same as the rest of the wave. Stay on `forums-wave-continued`. No `git checkout`, `git branch`, `git commit`, `git push`, `git stash`, `git reset`. Eric handles git manually.

---

## Goal

Ship the foundational schema for the entire Prayer Wall backend wave (Phase 3 = 12 specs, this is #1). Six tables created via Liquibase across six separate changesets:

1. **`posts`** — unified table per Decision 4. Replaces older Round 2 names (`prayer_requests`, `testimonies`, etc.). Polymorphic via `post_type` enum + type-specific nullable columns. Anonymous handling via `is_anonymous`. Soft-delete via `is_deleted` + `deleted_at`. Visibility tiers per Phase 7.7 (`public`, `friends`, `private`). Moderation status enum (`approved`, `flagged`, `hidden`, `removed`). Crisis flag boolean. Denormalized counters (praying_count, candle_count, comment_count, bookmark_count, report_count) for read performance.

2. **`post_comments`** — comment thread. Includes `parent_comment_id` self-reference for Phase 4 threaded replies (Decision: ship the column now to avoid future migration). Soft-delete. Moderation status. Crisis flag.

3. **`post_reactions`** — composite PK on `(post_id, user_id, reaction_type)`. CHECK constraint allows `'praying'` and `'candle'` (Decision 5 Light a Candle reaction). Two more reaction types (`'praising'`, `'celebrate'`) ship via separate changeset in Phase 6.6 Answered Wall — NOT in this spec.

4. **`post_bookmarks`** — composite PK on `(post_id, user_id)`. Used by Phase 6 bookmarks tab; created now alongside other engagement tables for cohesion.

5. **`post_reports`** — moderation reports against posts OR comments. CHECK constraint enforces exactly-one of `post_id` / `comment_id` is non-null. Status workflow (`pending`, `reviewed`, `dismissed`, `actioned`).

6. **`qotd_questions`** — Question of the Day. Backend-canonical store; seed migration of frontend's existing 60 questions happens in Spec 3.2 (next spec), NOT this one.

After this spec ships:
- All six tables exist in dev Postgres with full schemas, FKs, indexes, and CHECK constraints
- `LiquibaseSmokeTest` extended to verify the new tables
- Master.xml appended (never reordered)
- No backend code consumes the schema yet — read endpoints (3.3, 3.4) and write endpoints (3.5–3.8) come in subsequent specs
- No frontend code changes — frontend continues reading from mock data and `wr_prayer_wall` localStorage until Phase 3.10 Frontend Service API + Phase 3.12 cutover

---

## Master Plan Divergence

Three divergences worth flagging upfront.

### Divergence 1: Changeset dates use today's date sequence, not master plan's 2026-04-17

**What the master plan says:** Spec 3.1 body lists six changesets dated `2026-04-17-001` through `2026-04-17-006` (the date the master plan body was authored, not when the spec executes).

**What this brief says:** Six changesets dated `2026-04-27-014` through `2026-04-27-019` (continuing the date-sequence pattern from Phase 2.5's latest changeset `2026-04-27-013-create-user-mutes-table.xml`).

**Why:** Liquibase changeset filenames don't affect MD5 checksums (only the `id` attribute and content do), so the date prefix is purely organizational. The established convention in this repo is "execution date in filename, sequence-numbered within the day" — every Phase 1, Phase 2, and Phase 2.5 changeset followed this pattern. Honoring the master plan's literal `2026-04-17-*` dates would create out-of-order filenames (since 2026-04-17 is earlier than the most recent 2026-04-27-* files), confusing future archaeology.

**Resolution:** Use today's date sequence. Master plan body's date strings are illustrative, not contractual.

### Divergence 2: Acknowledge supersession of `prayer-wall-redesign.md` table names

**What the master plan says:** Decision 4 explicitly supersedes older Round 2 spec names like `prayer_requests`, `testimonies`, `questions`, `discussions`, `encouragements` — all collapsed into the unified `posts` table with a `post_type` discriminator.

**What this brief says:** The spec preamble explicitly notes this supersession. CC's recon may grep for `prayer-wall-redesign.md` and find Round 2 spec text proposing separate tables per post type; that's stale guidance. The master plan v2.9 is the source of truth, and Decision 4 is unambiguous.

**Why mention this:** Without this acknowledgment, recon may surface "prayer-wall-redesign.md says separate tables — should we reconsider?" That's wasted exchange. The decision is locked.

### Divergence 3: Two reaction types now (`praying`, `candle`); two more (`praising`, `celebrate`) deferred to Phase 6.6

**What the master plan says:** Decision 5 specifies four reaction types total: `praying`, `candle` (Light a Candle), `praising`, `celebrate`. The latter two activate in Phase 6.6 Answered Wall.

**What this brief says:** `post_reactions.reaction_type` CHECK constraint in this spec allows ONLY `'praying'` and `'candle'`. A separate Phase 6.6 changeset will ALTER the constraint to add `'praising'` and `'celebrate'` when those reaction types ship.

**Why:** Don't enable values the application doesn't yet support. If the constraint allowed all four from day one, a buggy frontend or API client could insert `'praising'` rows during Phase 3 work, creating data the Phase 3 read endpoints don't know how to render. Tightening the CHECK constraint to current-shipping reaction types is the safer move; the expansion is a tiny ALTER changeset in Phase 6.6.

---

## Schema Specifications (verbatim from Decision 4 + master plan body)

### Table 1: `posts`

```sql
CREATE TABLE posts (
  id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_type           VARCHAR(20)     NOT NULL,
  content             TEXT            NOT NULL,
  category            VARCHAR(20)     NULL,
  is_anonymous        BOOLEAN         NOT NULL DEFAULT FALSE,

  -- Type-specific nullable columns (per Decision 4)
  challenge_id        VARCHAR(50)     NULL,
  qotd_id             VARCHAR(50)     NULL,
  scripture_reference VARCHAR(100)    NULL,
  scripture_text      TEXT            NULL,

  -- Visibility (Phase 7.7)
  visibility          VARCHAR(20)     NOT NULL DEFAULT 'public',

  -- Lifecycle
  is_answered         BOOLEAN         NOT NULL DEFAULT FALSE,
  answered_text       TEXT            NULL,
  answered_at         TIMESTAMP WITH TIME ZONE NULL,

  -- Moderation
  moderation_status   VARCHAR(20)     NOT NULL DEFAULT 'approved',
  crisis_flag         BOOLEAN         NOT NULL DEFAULT FALSE,

  -- Soft delete
  is_deleted          BOOLEAN         NOT NULL DEFAULT FALSE,
  deleted_at          TIMESTAMP WITH TIME ZONE NULL,

  -- Denormalized counters (per Decision 4 — read performance)
  praying_count       INTEGER         NOT NULL DEFAULT 0,
  candle_count        INTEGER         NOT NULL DEFAULT 0,
  comment_count       INTEGER         NOT NULL DEFAULT 0,
  bookmark_count      INTEGER         NOT NULL DEFAULT 0,
  report_count        INTEGER         NOT NULL DEFAULT 0,

  created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  last_activity_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  CONSTRAINT posts_post_type_check CHECK (
    post_type IN ('prayer_request', 'testimony', 'question', 'discussion', 'encouragement')
  ),
  CONSTRAINT posts_category_check CHECK (
    category IS NULL OR category IN (
      'health', 'mental-health', 'family', 'work', 'grief',
      'gratitude', 'praise', 'relationships', 'other', 'discussion'
    )
  ),
  CONSTRAINT posts_visibility_check CHECK (
    visibility IN ('public', 'friends', 'private')
  ),
  CONSTRAINT posts_moderation_status_check CHECK (
    moderation_status IN ('approved', 'flagged', 'hidden', 'removed')
  ),
  CONSTRAINT posts_soft_delete_consistency CHECK (
    (is_deleted = FALSE AND deleted_at IS NULL) OR
    (is_deleted = TRUE  AND deleted_at IS NOT NULL)
  ),
  CONSTRAINT posts_answered_consistency CHECK (
    (is_answered = FALSE AND answered_at IS NULL) OR
    (is_answered = TRUE  AND answered_at IS NOT NULL)
  )
);

-- Indexes per Decision 4
CREATE INDEX idx_posts_user_id_created_at ON posts (user_id, created_at DESC);
CREATE INDEX idx_posts_visibility_moderation_created ON posts (visibility, moderation_status, created_at DESC) WHERE is_deleted = FALSE;
CREATE INDEX idx_posts_category_created ON posts (category, created_at DESC) WHERE is_deleted = FALSE AND moderation_status = 'approved';
CREATE INDEX idx_posts_post_type_created ON posts (post_type, created_at DESC) WHERE is_deleted = FALSE AND moderation_status = 'approved';
CREATE INDEX idx_posts_last_activity ON posts (last_activity_at DESC) WHERE is_deleted = FALSE AND moderation_status = 'approved';
CREATE INDEX idx_posts_qotd_id ON posts (qotd_id) WHERE qotd_id IS NOT NULL;
CREATE INDEX idx_posts_challenge_id ON posts (challenge_id) WHERE challenge_id IS NOT NULL;
CREATE INDEX idx_posts_crisis_flag ON posts (crisis_flag, created_at DESC) WHERE crisis_flag = TRUE AND is_deleted = FALSE;
CREATE INDEX idx_posts_is_answered_created ON posts (created_at DESC) WHERE is_answered = TRUE AND is_deleted = FALSE;
```

**Notes on the `posts` schema:**

- `post_type` enum: 5 values matching frontend's existing post-type taxonomy. `prayer_request` is the dominant type for MVP; the others light up in Phase 4.
- `category` enum: 10 values matching `frontend/src/constants/prayer-categories.ts` exactly (verified during recon: `health`, `mental-health`, `family`, `work`, `grief`, `gratitude`, `praise`, `relationships`, `other`, `discussion`). Recon must verify byte-for-byte parity; any drift between this CHECK constraint and the frontend constant becomes a Phase 3 bug.
- Two consistency CHECK constraints prevent illegal state combinations: soft-delete pairs (`is_deleted` + `deleted_at`) and answered pairs (`is_answered` + `answered_at`).
- Denormalized counters: read performance per Decision 4. Write paths (specs 3.5, 3.7) maintain these via DB triggers OR application-layer increment logic — that's a Spec 3.7 decision, not 3.1's. This spec just creates the columns with default `0`.
- Partial indexes on `WHERE is_deleted = FALSE AND moderation_status = 'approved'` — the dominant read filter. Massive query-plan improvement vs full-table indexes.

### Table 2: `post_comments`

```sql
CREATE TABLE post_comments (
  id                 UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id            UUID            NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id            UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_comment_id  UUID            NULL REFERENCES post_comments(id) ON DELETE CASCADE,
  content            TEXT            NOT NULL,
  is_helpful         BOOLEAN         NOT NULL DEFAULT FALSE,

  -- Soft delete
  is_deleted         BOOLEAN         NOT NULL DEFAULT FALSE,
  deleted_at         TIMESTAMP WITH TIME ZONE NULL,

  -- Moderation
  moderation_status  VARCHAR(20)     NOT NULL DEFAULT 'approved',
  crisis_flag        BOOLEAN         NOT NULL DEFAULT FALSE,

  created_at         TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  CONSTRAINT post_comments_moderation_status_check CHECK (
    moderation_status IN ('approved', 'flagged', 'hidden', 'removed')
  ),
  CONSTRAINT post_comments_soft_delete_consistency CHECK (
    (is_deleted = FALSE AND deleted_at IS NULL) OR
    (is_deleted = TRUE  AND deleted_at IS NOT NULL)
  )
);

CREATE INDEX idx_post_comments_post_id_created ON post_comments (post_id, created_at) WHERE is_deleted = FALSE;
CREATE INDEX idx_post_comments_user_id_created ON post_comments (user_id, created_at DESC);
CREATE INDEX idx_post_comments_parent ON post_comments (parent_comment_id) WHERE parent_comment_id IS NOT NULL;
```

**Notes:**

- `parent_comment_id` ships now even though Phase 3 only renders flat comments. Adding the column in a future migration would require touching production tables; including it here is a one-line change with zero behavioral impact for Phase 3 (NULL means "top-level comment"). Phase 4 threaded replies become a UI/API change, not a schema migration.
- `is_helpful` BOOLEAN is the "this comment was helpful" reaction (Phase 4-ish; column ships now for the same reason as `parent_comment_id`).
- FK CASCADE on `parent_comment_id` self-reference: deleting a parent comment deletes child replies. This matches the soft-delete UX (parent soft-deleted → children also become invisible, since they reference a soft-deleted parent through joins; hard-delete cascade applies only if a hard delete ever happens, which the application layer doesn't do).
- Index on `(post_id, created_at)` (ascending, NOT descending) for comment listing — comments display oldest-first per existing UX convention. Ascending order matters; recon should verify.

### Table 3: `post_reactions`

```sql
CREATE TABLE post_reactions (
  post_id        UUID            NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id        UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reaction_type  VARCHAR(30)     NOT NULL DEFAULT 'praying',
  created_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  PRIMARY KEY (post_id, user_id, reaction_type),

  CONSTRAINT post_reactions_reaction_type_check CHECK (
    reaction_type IN ('praying', 'candle')
  )
);

CREATE INDEX idx_post_reactions_post_type ON post_reactions (post_id, reaction_type);
CREATE INDEX idx_post_reactions_user_created ON post_reactions (user_id, created_at DESC);
```

**Notes:**

- Composite PK on all three columns means a single user can have BOTH a `praying` row AND a `candle` row on the same post (which is the intended UX — Light a Candle is additive to Praying, not exclusive). Toggling either reaction is an INSERT-or-DELETE on a specific (post_id, user_id, reaction_type) row.
- CHECK constraint per Divergence 3 — only two reaction types until Phase 6.6 expands.
- No soft-delete column. Reactions are toggled (DELETE on un-react) rather than soft-deleted. This is a deliberate departure from `posts` and `post_comments`.
- Index on `(post_id, reaction_type)` supports the dominant read query: "how many people reacted to this post with praying?" — answers via index-only scan (combined with the denormalized `praying_count` on `posts` for hot-path reads, the index is for verification + admin queries).

### Table 4: `post_bookmarks`

```sql
CREATE TABLE post_bookmarks (
  post_id     UUID            NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id     UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  PRIMARY KEY (post_id, user_id)
);

CREATE INDEX idx_post_bookmarks_user_created ON post_bookmarks (user_id, created_at DESC);
```

**Notes:**

- Simplest of the engagement tables. Composite PK on `(post_id, user_id)` enforces "one bookmark per user per post."
- Index on `(user_id, created_at DESC)` supports the "My Bookmarks" tab read (Phase 6 bookmarks tab).

### Table 5: `post_reports`

```sql
CREATE TABLE post_reports (
  id            UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id       UUID            NULL REFERENCES posts(id) ON DELETE CASCADE,
  comment_id    UUID            NULL REFERENCES post_comments(id) ON DELETE CASCADE,
  reporter_id   UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason        VARCHAR(50)     NOT NULL,
  details       TEXT            NULL,
  status        VARCHAR(20)     NOT NULL DEFAULT 'pending',
  reviewer_id   UUID            NULL REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at   TIMESTAMP WITH TIME ZONE NULL,
  action_taken  VARCHAR(50)     NULL,
  created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  CONSTRAINT post_reports_target_xor_check CHECK (
    (post_id IS NOT NULL AND comment_id IS NULL) OR
    (post_id IS NULL     AND comment_id IS NOT NULL)
  ),
  CONSTRAINT post_reports_status_check CHECK (
    status IN ('pending', 'reviewed', 'dismissed', 'actioned')
  ),
  CONSTRAINT post_reports_review_consistency CHECK (
    (status = 'pending' AND reviewer_id IS NULL AND reviewed_at IS NULL) OR
    (status IN ('reviewed', 'dismissed', 'actioned') AND reviewer_id IS NOT NULL AND reviewed_at IS NOT NULL)
  )
);

CREATE INDEX idx_post_reports_status_created ON post_reports (status, created_at) WHERE status = 'pending';
CREATE INDEX idx_post_reports_post_id ON post_reports (post_id) WHERE post_id IS NOT NULL;
CREATE INDEX idx_post_reports_comment_id ON post_reports (comment_id) WHERE comment_id IS NOT NULL;
CREATE INDEX idx_post_reports_reporter_id_created ON post_reports (reporter_id, created_at DESC);
```

**Notes:**

- `post_reports_target_xor_check` enforces exactly one of `post_id` / `comment_id` is non-null (XOR). Critical correctness invariant — a report must target either a post or a comment, never both, never neither.
- `reviewer_id ON DELETE SET NULL` — if a moderator account is deleted, their historical reviews stay in the audit trail with NULL reviewer.
- `post_reports_review_consistency` enforces that a "reviewed/dismissed/actioned" report MUST have a reviewer + timestamp, and a "pending" report MUST NOT.
- `reason` is VARCHAR(50) for short codes (`harassment`, `spam`, `crisis`, `inappropriate`, etc. — exact enum lives in Spec 3.8 Reports Write); `details` is free-text TEXT for elaboration.
- Partial index on `(status, created_at) WHERE status = 'pending'` supports the moderator queue read (Phase 10.7 peer moderator queue) — only pending reports need the index.

### Table 6: `qotd_questions`

```sql
CREATE TABLE qotd_questions (
  id              VARCHAR(50)     PRIMARY KEY,
  text            TEXT            NOT NULL,
  theme           VARCHAR(30)     NOT NULL,
  hint            TEXT            NULL,
  display_order   INTEGER         NOT NULL UNIQUE,
  is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  CONSTRAINT qotd_questions_theme_check CHECK (
    theme IN ('faith_journey', 'practical', 'reflective', 'encouraging', 'community', 'seasonal')
  )
);

CREATE INDEX idx_qotd_questions_active_order ON qotd_questions (display_order) WHERE is_active = TRUE;
```

**Notes:**

- VARCHAR(50) PK, NOT auto-generated UUID. Frontend's existing QOTD pool uses string IDs like `'qotd-1'`, `'qotd-42'`. Preserving these IDs across the seed migration (Spec 3.2) enables Phase 3+ to reference QOTD posts by stable string ID.
- `display_order INT UNIQUE` — backend selects today's QOTD by `(day-of-year MOD active_question_count)` indexing into `display_order`. UNIQUE enforces no two questions claim the same slot.
- `is_active` BOOLEAN supports archiving stale questions without deleting them (preserves referential integrity with `posts.qotd_id`).
- Partial index on active questions supports the daily-rotation query.

---

## Six Changesets

```
backend/src/main/resources/db/changelog/2026-04-27-014-create-posts-table.xml
backend/src/main/resources/db/changelog/2026-04-27-015-create-post-comments-table.xml
backend/src/main/resources/db/changelog/2026-04-27-016-create-post-reactions-table.xml
backend/src/main/resources/db/changelog/2026-04-27-017-create-post-bookmarks-table.xml
backend/src/main/resources/db/changelog/2026-04-27-018-create-post-reports-table.xml
backend/src/main/resources/db/changelog/2026-04-27-019-create-qotd-questions-table.xml
```

Each changeset:
- One `<changeSet>` element
- `id="{filename-without-extension}"` (Liquibase convention from Phase 1+ specs)
- `author="claude"`
- One `<createTable>` with all columns + comments per `05-database.md`
- Indexes via separate `<createIndex>` elements OR `<sql>` blocks for partial indexes (recon picks the cleaner path; Liquibase's `<createIndex>` doesn't support `WHERE` clauses, so partial indexes need raw `<sql>` per established pattern)
- CHECK constraints via `<sql>` blocks (Liquibase's structured `<addCheckConstraint>` is fine for simple cases; complex multi-condition checks use raw SQL for readability)
- Rollback via `<dropTable>` (no need to drop indexes individually — they vanish with the table)

**Master.xml is APPEND-ONLY:** add six new `<include file="..."/>` entries at the bottom of `master.xml`, in the order 014 → 015 → 016 → 017 → 018 → 019. Never reorder existing entries; never edit committed changesets.

---

## Files to Create

```
backend/src/main/resources/db/changelog/2026-04-27-014-create-posts-table.xml
backend/src/main/resources/db/changelog/2026-04-27-015-create-post-comments-table.xml
backend/src/main/resources/db/changelog/2026-04-27-016-create-post-reactions-table.xml
backend/src/main/resources/db/changelog/2026-04-27-017-create-post-bookmarks-table.xml
backend/src/main/resources/db/changelog/2026-04-27-018-create-post-reports-table.xml
backend/src/main/resources/db/changelog/2026-04-27-019-create-qotd-questions-table.xml
```

## Files to Modify

```
backend/src/main/resources/db/changelog/master.xml
  — APPEND six new <include> entries at the bottom (never reorder)

backend/src/test/java/com/worshiproom/db/LiquibaseSmokeTest.java
  — extend existing Phase 2.5 smoke test with assertions for the six new tables
  — verify columns exist with correct types
  — verify CHECK constraints reject invalid values (post_type, category, visibility, moderation_status, reaction_type, status, theme, target XOR for reports, soft-delete consistency, answered consistency, review consistency)
  — verify FKs cascade correctly
  — verify indexes exist (query pg_indexes)
```

## Files NOT to Modify

- Any backend Java code under `com.worshiproom.*` — no entities, no repositories, no services. Those land in Spec 3.3+ as endpoints come online.
- `openapi.yaml` — no API changes. This spec is schema-only.
- Any frontend file — Phase 3 frontend wiring lands in Spec 3.10. The schema's existence has zero observable impact on the frontend.
- `frontend/src/constants/prayer-categories.ts` or `question-of-the-day.ts` — frontend constants stay; they're the source of truth for category enums and QOTD content during the wave; Spec 3.2 (next) seeds them into the new backend tables.

## Files to Delete

None.

---

## Acceptance Criteria

### Tables created

- [ ] `posts` table exists with all columns from "Schema Specifications" section above (32 columns total)
- [ ] `post_comments` table exists with all 11 columns
- [ ] `post_reactions` table exists with composite PK on (post_id, user_id, reaction_type)
- [ ] `post_bookmarks` table exists with composite PK on (post_id, user_id)
- [ ] `post_reports` table exists with all 11 columns
- [ ] `qotd_questions` table exists with VARCHAR(50) PK and UNIQUE display_order

### CHECK constraints enforced

- [ ] `posts_post_type_check` rejects values outside the 5-value enum
- [ ] `posts_category_check` rejects values outside the 10-value enum (NULL allowed)
- [ ] `posts_visibility_check` rejects values outside `('public', 'friends', 'private')`
- [ ] `posts_moderation_status_check` rejects values outside the 4-value enum
- [ ] `posts_soft_delete_consistency` rejects illegal `is_deleted` / `deleted_at` combinations
- [ ] `posts_answered_consistency` rejects illegal `is_answered` / `answered_at` combinations
- [ ] `post_comments_moderation_status_check` enforced
- [ ] `post_comments_soft_delete_consistency` enforced
- [ ] `post_reactions_reaction_type_check` rejects values outside `('praying', 'candle')` — `'praising'` and `'celebrate'` rejected per Divergence 3
- [ ] `post_reports_target_xor_check` rejects rows with both `post_id` and `comment_id` set, AND rows with neither set
- [ ] `post_reports_status_check` enforced
- [ ] `post_reports_review_consistency` enforces pending → no reviewer; reviewed/dismissed/actioned → reviewer + timestamp present
- [ ] `qotd_questions_theme_check` rejects values outside the 6-value enum

### FKs cascade correctly

- [ ] Deleting a `users` row cascades to delete that user's `posts`, `post_comments`, `post_reactions`, `post_bookmarks`, and `post_reports` rows (where they're the actor — `reporter_id`, `user_id`)
- [ ] Deleting a `users` row sets `post_reports.reviewer_id` to NULL (NOT cascade-delete) for reports they reviewed
- [ ] Deleting a `posts` row cascades to delete that post's `post_comments`, `post_reactions`, `post_bookmarks`, and `post_reports` rows (where `post_id` matches)
- [ ] Deleting a `post_comments` row cascades to delete child replies (via `parent_comment_id` self-reference) AND delete `post_reports` rows targeting that comment

### Indexes exist

- [ ] All 9 indexes on `posts` (verifiable via `\d posts` or `pg_indexes`)
- [ ] All 3 indexes on `post_comments`
- [ ] Both 2 indexes on `post_reactions`
- [ ] 1 index on `post_bookmarks`
- [ ] All 4 indexes on `post_reports`
- [ ] 1 index on `qotd_questions`

### Liquibase smoke test extended

- [ ] `LiquibaseSmokeTest` includes assertions for all 6 new tables (existence)
- [ ] Each CHECK constraint has at least one positive and one negative test case (insert valid value succeeds; insert invalid value throws constraint violation)
- [ ] At least one FK CASCADE test per cascading relationship (delete user → posts deleted; delete post → comments deleted; etc.)
- [ ] One ON DELETE SET NULL test for `post_reports.reviewer_id`
- [ ] One self-reference cascade test for `post_comments.parent_comment_id`

### Master.xml integrity

- [ ] All 6 new `<include>` entries appended at the BOTTOM of `master.xml`
- [ ] No existing `<include>` entries reordered
- [ ] No existing changeset files modified (only new files added)

### Test count target

L-sized → 20–40 tests per `06-testing.md`. Master plan target ~12-15 schema/constraint tests. The smoke test extension will hit **~25-30 assertions** distributed across:
- 6 table existence checks
- ~14 CHECK constraint positive/negative pairs
- ~6 FK cascade verifications
- 6 index existence checks

If CC's plan proposes 50+ assertions for this schema-only spec, push back — over-testing.

---

## What to Watch For in CC's Spec Output

1. **Don't try to create JPA entities or repositories.** This is a schema-only spec. No `Post.java`, no `PostRepository.java`, no `PostController.java`. Those land in Specs 3.3+ as endpoints come online. If CC's plan proposes Java entities, push back hard — wrong scope.

2. **Master.xml is append-only.** Six new `<include>` entries at the bottom in numerical order (014 → 019). Never reorder existing entries. If CC's plan proposes alphabetizing or reorganizing, push back — Liquibase is order-sensitive and historical entries are sacred.

3. **Frozen changesets.** Once a changeset's MD5 is computed (first deploy), it's permanent. This spec adds NEW changesets only — never modifies existing 2026-04-23-* through 2026-04-27-013 files. If CC's recon proposes "fixing" an earlier changeset, push back.

4. **CHECK constraint shape.** Per `05-database.md`, complex CHECK constraints (like the XOR on `post_reports`) use raw `<sql>` blocks rather than Liquibase's structured `<addCheckConstraint>`. Recon should grep recent changesets (e.g., 2026-04-27-009 friend-relationships) for the established pattern; mirror that.

5. **Partial indexes.** Liquibase's `<createIndex>` element does NOT support `WHERE` clauses for partial indexes. The 9 partial indexes in this spec need to be created via raw `<sql>` blocks. Pattern reference: any prior changeset that uses partial indexes (recon should grep). If recon proposes wrapping partial-index creation in `<createIndex>` with extra attributes, that's the wrong path.

6. **Reaction type CHECK constraint.** Per Divergence 3, only `'praying'` and `'candle'`. NOT `'praising'` or `'celebrate'`. Phase 6.6 expands. If CC's recon proposes including all four "for forward compatibility," push back — that's the wrong direction.

7. **`category` allows NULL.** `posts.category` is nullable because non-prayer post types (e.g., `discussion`) may not have a category. The CHECK constraint allows NULL OR one of the 10 enum values. Don't make it NOT NULL.

8. **`parent_comment_id` ships now even though Phase 3 doesn't use it.** Per the spec body. If CC's plan proposes deferring this to a Phase 4 migration, push back — adding columns to a high-traffic table later is more disruptive than including them now with zero behavioral impact.

9. **`is_helpful` on `post_comments` ships now too.** Same reason — zero behavioral impact today, future migration avoided.

10. **Denormalized counters default to `0`.** Don't make them nullable; don't omit defaults. Application-layer logic in Specs 3.5–3.7 maintains them via increments/decrements; this spec just creates the columns.

11. **`gen_random_uuid()` for UUID PKs.** Postgres-specific function (requires `pgcrypto` or Postgres 13+). Recon should verify the existing changesets use the same function — if they use `uuid_generate_v4()` (uuid-ossp extension), match that pattern. Don't introduce two UUID generation strategies.

12. **`TIMESTAMP WITH TIME ZONE`, NOT `TIMESTAMP`.** Per `05-database.md`'s mandatory rule. All timestamp columns (created_at, updated_at, last_activity_at, deleted_at, answered_at, reviewed_at) use `TIMESTAMP WITH TIME ZONE`. Defaults use `NOW()` which returns a timezone-aware timestamp. If recon proposes plain `TIMESTAMP`, push back.

13. **`valueComputed` for default timestamps**, not `valueDate`. Per Phase 1 Execution Reality Addendum. The `<column>` `defaultValueComputed="NOW()"` is correct; `defaultValue="2026-04-27..."` or `defaultValueDate="..."` is wrong.

14. **No application-layer triggers in this spec.** Counter maintenance (incrementing `praying_count` when a `post_reactions` row is inserted, etc.) belongs in Spec 3.7's write endpoints. Don't propose DB-level triggers in this spec — application-layer maintenance is the established pattern (`activity_counts`, `post_count` on `users` if it existed, etc.).

15. **No data seeded.** This spec creates empty tables. Spec 3.2 (next) seeds the QOTD questions and (optionally) some mock posts. If CC's plan proposes inserting 60 QOTD rows in this spec, push back — out of scope.

16. **OpenAPI is untouched.** No API endpoints in this spec. Don't modify `openapi.yaml`. If CC's plan proposes adding placeholder endpoint stubs "for future specs," push back.

17. **Single quotes** in shell snippets, file paths, fixture strings.

---

## Out of Scope

- JPA entities, repositories, services, controllers (Specs 3.3+)
- API endpoints (Specs 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9)
- OpenAPI spec changes
- Frontend changes of any kind (Spec 3.10)
- QOTD question seeding (Spec 3.2)
- Mock post seeding (Spec 3.2)
- Reaction type expansion to `'praising'` and `'celebrate'` (Phase 6.6)
- Counter-maintenance triggers or application logic (Spec 3.7)
- Visibility predicate query helpers (Spec 3.3 — has canonical SQL per master plan)
- Crisis detection logic (Spec 3.5 — XL/High, MAX-worthy when it arrives)
- Soft-delete vs hard-delete policy (Spec 3.5)
- Account deletion impact on posts (Spec 10.11 — already designed; ON DELETE CASCADE handles it correctly per this schema)
- Phase 3 cutover and env flag flip (Spec 3.12)
- Backfill of existing localStorage `wr_prayer_wall` data (likely no analogue to Phase 2's Spec 2.10 — mock data won't migrate; future spec if needed)
- Indexes for full-text search (Phase 11.1 has its own search-schema spec)
- Drift detection between frontend mock-data shape and backend schema (Phase 3 may add equivalent to Spec 2.8 if reasoning depth warrants it; not this spec's concern)

---

## Out-of-Band Notes for Eric

- This is the foundational spec for the largest phase of the Forums Wave. Phase 3 is 12 specs spanning ~4-6 weeks of solo dev work per master plan estimate. Spec 3.1 is the easiest of those — pure schema, well-defined, pattern-matchable against Phase 2.5's schema work.
- Estimated execution: 1 session. ~6 changesets + ~25-30 smoke test assertions + master.xml append.
- Spec 3.2 (Mock Data Seed Migration) is the natural next spec — M-sized, Low risk. Seeds the 60 QOTD questions + optionally some mock posts for dev environment.
- The Phase 3 critical path bottleneck is Spec 3.5 (Posts Write Endpoints) — XL/High, crisis-detection territory. That's the one to consider MAX for. 3.1 is xHigh territory.
- Recon discovery item #1 (UUID generation function) is the load-bearing one — verify against existing changesets before drafting the new ones. Either `gen_random_uuid()` (Postgres 13+ built-in) or `uuid_generate_v4()` (uuid-ossp extension) is fine, but they MUST match what's already used.
- Recon discovery item #2: verify the pattern for partial indexes in existing changesets. The 9 partial indexes in this spec need raw `<sql>` blocks; if no prior changeset has used this pattern, this spec establishes it. Document the pattern in the first changeset's comments.
- Spec tracker after 3.1 ships: `3.1 ✅`, Phase 3 progress 1/12.
- Phase 2.5 wrap-up note: when 2.5.7 ships, Phase 2.5 closes (8/8). The "Phase 2.5 Execution Reality Addendum" hygiene update for the master plan is a separate small spec (or a one-shot commit you handle directly) that mirrors the Phase 1 / Phase 2 addendums. I can draft that if you want, or you can knock it out as a quick one-liner update to the master plan.
- xHigh thinking is appropriate for 3.1. Pattern-matching against Phase 2.5 schema specs (2.5.1 friends-schema is the closest precedent — 4 tables vs this spec's 6, but identical structural concerns). MAX would be over-spending.

---

## Post-Execution Addendum (2026-04-28)

This section was appended after Spec 3.1 shipped. The spec body above is preserved as the planning record. Where this addendum disagrees with the spec body, the addendum is authoritative — same convention as the master plan v2.9's "Phase 1 and Phase 2 Execution Reality Addendums."

### Plan Deviation #1 — `post_reports_review_consistency` relaxed on closed branches

**What the spec said** (Acceptance Criteria, line 427 of original body):

> `post_reports_review_consistency` enforces pending → no reviewer; reviewed/dismissed/actioned → reviewer + timestamp present

**What actually shipped.** Changeset `2026-04-27-018-create-post-reports-table.xml` implemented the strict form verbatim. End-to-end test execution surfaced that the strict CHECK blocked the FK cascade SET NULL update path on `reviewer_id`: when a moderator's `users` row is deleted, PostgreSQL emits an `UPDATE post_reports SET reviewer_id = NULL` to satisfy `fk_post_reports_reviewer ON DELETE SET NULL`, which produces a row state of `(status IN closed-set, reviewer_id IS NULL, reviewed_at IS NOT NULL)`. PostgreSQL **does** re-fire CHECK constraints on cascade UPDATE; the original plan's assumption that it does not was wrong. The strict CHECK rejected the cascade-produced row, blocking the moderator delete.

**Resolution.** Changeset `2026-04-27-020-relax-post-reports-review-consistency.xml` drops and re-adds the constraint without the `reviewer_id IS NOT NULL` clause on the closed branches. Editing the original 018 changeset was not an option (its MD5 was already in `databasechangelog` on the dev container; that's the textbook Liquibase footgun). The follow-on-changeset pattern is the canonical fix.

**Final invariants enforced by the DB:**

- `pending` → `reviewer_id IS NULL AND reviewed_at IS NULL` (unchanged)
- `reviewed` / `dismissed` / `actioned` → `reviewed_at IS NOT NULL` (relaxed; `reviewer_id` may be NULL)

### Application-layer responsibility (handoff to Spec 3.8)

The DB no longer enforces `reviewer_id IS NOT NULL` on closed reports. The service code in **Spec 3.8 — Reports Write Endpoint** (and any future write path that closes a report) MUST explicitly set both `reviewer_id` and `reviewed_at` when transitioning a report from `pending` to a closed status. The DB guarantees `reviewed_at` presence on closed branches; `reviewer_id` presence at action time is service-layer code.

In practice for Spec 3.8:

- The "moderator closes a report" service method takes the moderator's user ID as a parameter, not as an `Optional<UUID>`. It is non-nullable in the contract.
- The service writes `(status, reviewer_id, reviewed_at)` together in a single UPDATE. There is no path that leaves `reviewer_id` NULL while setting status to a closed value.
- The only path by which `reviewer_id` can become NULL on a closed row is the FK cascade triggered by user deletion. That is the documented audit-trail behavior — closed reports survive the reviewer's account deletion with `reviewed_at` and `action_taken` preserved.

### Cross-cutting lesson worth recording

Any CHECK constraint that references a column subject to `ON DELETE SET NULL` on a foreign key MUST remain satisfied with that column nulled out — otherwise the cascade fails at the moment the FK rule fires. Captured as a permanent rule in `.claude/rules/05-database.md` § "CHECK constraints over `ON DELETE SET NULL` columns" so future schema specs avoid the same mistake.

### Where the deviation is captured

For future archaeology, this deviation is recorded in three independent places:

1. This spec's Post-Execution Addendum (here)
2. `_plans/forums/2026-04-28-spec-3-1.md` Execution Log "Plan Deviation #1" (the diagnostic narrative)
3. `2026-04-27-020-relax-post-reports-review-consistency.xml` header comment (the in-code rationale at the point of change)

Plus a one-line note in `_forums_master_plan/spec-tracker.md` and the broader rule in `.claude/rules/05-database.md` (the cross-cutting lesson, not the deviation itself).
